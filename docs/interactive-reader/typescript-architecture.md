# TypeScript architecture

The reader is one npm package with separate browser, local-server, and content-preparation modules. It uses React and Vite, a loopback Node HTTP server, and the existing Python PDF extractor. No npm workspaces or independently deployed packages are required.

## Source layout

```text
src/
  client/
    main.tsx                  Browser bootstrap, fonts, global styles
    app/App.tsx               Navigation and coordination of document/session state
    api/library.ts            Typed HTTP client and question page-ID enrichment
    features/
      library/                Library list and readiness states
      reader/                 PDF canvas, overlays, geometry, accessible learning units
      learning-details/       Entry explanations, pronunciation text, character history and bundled history metadata
      practice/               Question eligibility, session reducer, practice/results UI
      writing/                Session reducer, boards, diagrams, local Hanzi Writer adapter
      speech/                 Local Mandarin voice lifecycle and playback controls
    ui/                       Shared sequence layout controls
    styles/                   Global layout and visual styles
  contracts/content.ts        Version 1 content and HTTP payload types
  server/
    main.ts                   Production process startup and catalog polling
    handler.ts                HTTP routing and local-access policy
    catalog.ts                Validated revision cache and discovery
    http/sendFile.ts          File delivery and PDF byte ranges
    routes/hanzi.ts           Local character-data delivery
  content/
    cli.ts                    Command dispatch and error reporting
    options.ts                Typed command-line option parsing
    commands/                 Extraction, publication, lookup/repair, diagnostics
    library/                  Filesystem access, checksums, revision lookup, catalog
    validation/               AJV schema checks and semantic content validation
schemas/                      Existing version 1 JSON schemas
config/                       Durable preparation defaults
tools/extract.py              PyMuPDF extraction subprocess
public/                       Bundled character-history assets
```

## Boundaries

- Contracts have no browser, React, Node, or preparation dependencies.
- Client modules consume contracts and browser integrations; they cannot import server, preparation, or Node modules.
- The application shell composes features. Features and shared UI cannot import the shell.
- Server code serves validated disk content. Preparation commands own staging and atomic publication.
- Import restrictions and circular-dependency checks run through ESLint. Keep changes within the owning feature where possible; promote code to shared UI only when it has multiple consumers.

The browser and Node configurations both inherit strict TypeScript checking from `tsconfig.base.json`. The root `tsconfig.json` references both projects so editors discover the appropriate configuration. Browser types use DOM/Vite declarations; server and preparation code use Node declarations. Imports use explicit `.ts`/`.tsx` extensions. Vite builds the browser; `tsx` executes server and CLI source without a second emitted build directory. Vite uses the automatic JSX runtime, matching the TypeScript configuration.

## Content and state

`contracts/content.ts` describes manifests, page files, Unicode source ranges, normalized rectangles, linguistic entries, occurrences, questions, review records, catalog responses, and document responses. Runtime validation remains essential: TypeScript types do not make JSON trustworthy. The existing JSON schemas and semantic validator check disk input, checksums, source identity, anchors, geometry, review readiness, references, and publication invariants. Typed JSON reads declare an expected shape; they do not replace these checks. Changes to the content format require coordinated contract, schema, validator, fixture, and compatibility updates.

Prepared data stays in `data/`, independent of source and builds. Published revisions and stable correction references are unchanged. This refactor does not prepare or republish lessons.

The app owns the loaded document/revision, page, annotation selection, navigation, and session lifetime. Practice and writing use pure typed reducers. Their components dispatch actions instead of rewriting whole session objects. Board callbacks identify the character occurrence by index, so repeated characters keep independent progress. UI preferences retain their existing local-storage keys; learner progress remains in memory.

PDF.js and Hanzi Writer remain behind feature-specific adapters. The custom Hanzi SVG target implements its public rendering surface; one documented type assertion bridges upstream declarations that also include unused private base-class helpers. Pointer capture, cleanup, remaining-stroke playback, and local character loading are preserved.

## Development and verification

```sh
npm install
npm run dev          # Vite, hot reload, and local library routes on one origin
npm run typecheck    # Strict browser and Node checking
npm run lint         # Unused code, platform/layer boundaries, import cycles
npm test             # Content/server integration and session behavior
npm run build        # Type checks followed by the production browser build
npm start            # Production reader at http://localhost:4173
```

`npm run dev` mounts the same HTTP handler used in production for `/api`, `/pdf`, `/content`, `/pdfjs`, and `/hanzi-data`. Other requests go to Vite. Production serves `dist/`; rebuild after changing application code. Publishing prepared material still needs no application rebuild or restart. The production process binds to loopback. `PORT` changes its listening port; `CHINOIS_DATA_ROOT` selects an isolated library for tests.

Content commands retain their `npm run content:* -- ...` interface. Python/PyMuPDF setup remains `npm run setup:extractor`. Automated tests use temporary PDFs and isolated data roots and do not modify accepted lessons. HTTP integration tests need permission to listen on localhost in restricted execution environments.

Existing integration coverage verifies incremental immutable pages, source identity, stable correction references, scoped repair, schema and geometry rejection, Unicode offsets, question eligibility, HTTP ranges, automatic discovery, pinned revisions, and restart. Session tests additionally cover answer locking, mistake retries, unchanged prepared questions, repeated writing occurrences, and restart behavior. Browser review is required for rendering, navigation, focus, animation, and responsive behavior; automated model checks alone do not establish visual or offline-audio correctness.

## Refactor acceptance record · 2026-11-23

- Strict browser/Node type checking, import-boundary/cycle linting, and production build passed.
- All 17 automated tests passed on Node 24, including the existing content/server suite and new reducer, CLI-option, and character-history asset checks. Server integration required localhost listening outside the filesystem sandbox.
- The Codex in-app browser reviewed the production build on localhost:4174 and development mode on localhost:5174. The existing Lesson 1 rendered in both modes. The final CSS build retained the same stylesheet hash after splitting source styles.
- Browser checks covered word details, reviewed pinyin/IPA, adding a practice selection, two writing boards with local stroke data, remaining-stroke playback, returning to the selected source, incorrect-answer feedback, session continuity, results, and mistake retry. Character details, stroke diagrams, dismissal, and an unprepared page were checked at a 390×844 viewport; the temporary viewport was reset afterward.
- Browser review caught a JSX-runtime mismatch; setting Vite's automatic JSX transform fixed it and the rebuilt reader was reviewed successfully.
- This pass did not independently repeat disconnected speech, screen-reader, or successful pointer-drawing verification. Prior limitations in the main verification report still apply. Node 22 remains the declared minimum but was not separately executed during this pass.
- Published PDFs, page files, revision pointers, correction IDs, schemas, and preparation defaults were not changed. The pre-existing untracked `docs/architecture.md` was left untouched; this guide documents the new source structure.

Character-history JSON metadata lives beside the details feature in `history/<codepoint>/entry.json` and is bundled by Vite. SVGs and license files retain their public URLs in `public/hanzi-history/`. Importing metadata directly from `public/` is unsupported by Vite in development; keeping it in source avoids failed metadata requests.
