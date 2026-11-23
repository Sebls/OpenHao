# Installation and everyday use

Implemented on 2026-11-22 in React. The earlier specification documents describe the requirements; this guide describes the delivered commands and storage layout. Later explicit user instructions still take precedence.

## Start studying

Requires Node.js 22.13+ or 24+ (verified with Node 24.11.0 and npm 11.6.1).

```sh
cd /Users/usuario/Documents/github/chinois
npm install
npm start
```

Open **http://localhost:4173** in the agent browser, preferably the Codex browser, for content and interface review. Keep the terminal running; stop it with Ctrl+C. After installation, future launches need only `npm start`. If another app uses that port, run `PORT=4174 npm start` and open the printed address. `npm install` builds the app automatically; `npm run build` rebuilds it after application source changes. Adding content requires neither rebuilding nor restarting.

Open the document, select a word on its original page, or use **Text companion & learning units**. Explore characters or sentences with the unit selector. Details show concise English meanings, tone-mark pinyin, optional character breakdown, grammar, and separately labeled IPA. The source PDF remains unchanged, including illustrations and decoration. Page size controls and normal browser zoom work together.

**Add to practice** selects an occurrence. **Practise selection** uses reviewed questions tied to those exact occurrences; some selections have no questions yet and explain this honestly. **Practise page** uses the current physical page; **Practise document** uses the available document bank. Selecting a sentence also includes its explicitly contained learning units, while repeated text elsewhere stays outside that selected scope. Select an answer, then **Check answer**, read the explanation, and continue to results. Mistakes can be retried. **See original context** and **Return to reading** preserve the session. In-app library navigation retains the open document; reloading resets personal session progress.

Lesson 1 is physical page 1 of `new-hsk-1`. It contains 47 entries, 77 occurrences and 12 reviewed questions across all seven categories; listening questions are hidden until local playback has completed successfully. Pages 2–5 remain readable originals marked **Not prepared**. Decorative seals and a tiny illustration label are visible but not confidently transcribed. Sentence-level/mixed-name IPA is omitted where unreviewed; word and character IPA remains available. The page's coverage notes disclose these exceptions.

## Offline use and pronunciation

After initial npm installation, all app assets, PDF data, translations and questions are served from this computer. No account, API key, AI session, dictionary service or CDN is used while studying. Keep the installed `node_modules`, `dist`, and `data` directories. Starting the local server and reopening the localhost URL do not need internet. Application/content files persist on disk; browser cache is not their only copy.

Playback uses only local Mandarin voices reported by the browser (`localService` and Mandarin locale); it never falls back to a remote voice. Select **Play pronunciation** to test it. A completed playback enables listening practice for this session. Stop/replay controls prevent overlapping speech; failures keep text study usable. Browser completion is a useful availability signal, not proof of audible, disconnected operation. Install a Mandarin voice through macOS speech/accessibility settings if needed, then reopen the browser. Actual disconnected speech remains a device/browser acceptance check; see the verification report.

## Add another page or PDF

Tell the agent, for example: “Prepare physical page 3 of new-hsk-1” or “Prepare physical pages 1–2 of /path/to/another.pdf.” The repository instructions lead it to [the preparation skill](../../skills/prepare-material/SKILL.md). Default learning preferences are saved in `config/learning-profile.json`.

Preparation additionally requires Python 3 and PyMuPDF. Install once:

```sh
npm run setup:extractor
```

Studying already prepared content does not require Python. A working local Tesseract plus appropriate language packs is needed only for OCR. Add `--ocr` to extraction to use local OCR; `CHINOIS_OCR_LANG` defaults to `chi_sim+eng`. This computer's current Tesseract binary has the wrong CPU architecture; the skill reports affected extraction gaps rather than inventing text/coordinates.

Agent command examples:

```sh
npm run content:inspect -- --input "/absolute/path/material.pdf"
npm run content:extract -- --input "/absolute/path/material.pdf" --id "my-document" --pages "1"
npm run content:extract -- --id "my-document" --pages "3-4"
# Agent authors and reviews staged entries, occurrences and questions.
npm run content:diagnose -- --id "my-document" --page 3
npm run content:validate -- --id "my-document"
npm run content:publish -- --id "my-document"
npm run content:list
```

Every command supports `--help`. Missing page scope is an error; full processing requires `--all-pages`. Ready pages skip without changing the revision. Extracted unfinished pages remain staged for authoring/resumption. An agent marks a page ready only after visual extraction review and a separate linguistic/question review. Unknown schema versions, unsafe paths, source/asset hash changes, bad anchors, ambiguous duplicate choices and broken references block publication. Uncertain records stay outside reviewed details and practice.

## Corrections and backups

Use **Copy reference** in item details. If copying fails, select the displayed reference. Question feedback also has a selectable correction reference. Give that exact reference and the desired correction to the agent:

```sh
npm run content:lookup -- --ref "new-hsk-1:p0001:annotation:a-0001@r1"
npm run content:repair -- --ref "new-hsk-1:p0001:entry:e-character-001@r1"
# Edit only that record, review affected questions, then validate and publish.
```

Lookup reports the current revision even for an older copied reference. Repair keeps stable IDs and restricts modifications to the target record and dependent questions. Ordinary item repair cannot alter source text, coordinates or original assets. An extraction correction needs an explicitly scoped migration and remapping of affected references. Never edit a published revision directly.

Back up the complete **data/** directory. `data/pdfs/` contains the immutable original once; `data/library/<id>/revisions/<n>/` contains durable generated content. `current.json` points to the accepted revision. Staging is under `data/staging/` and never appears as usable learning material. Old revisions are retained for recovery and active sessions. These private files are excluded from Git. A new checkout alone does not contain the user's PDFs/lessons; restore `data` from backup or ask the agent to prepare requested pages again.

If publication is interrupted after a revision directory was copied but before the pointer changed, the previous revision remains usable. Inspect the abandoned revision against `current.json` and staging, move the unused revision to a backup location, then rerun publication. A stale-base or lock error needs an agent to inspect concurrent work before retrying. Never force-overwrite a newer accepted revision.

## Implementation choices

React 19 with Vite builds locally installed PDF.js and its worker. PDF.js renders the authoritative PDF at device pixel resolution; normalized genuine character boxes form word/line overlays. The complete original remains available without rendering unrequested pages during preparation. MuPDF emits page-scoped transcript, character geometry, provenance and a diagnostic image. This uses its [documented raw character extraction](https://pymupdf.readthedocs.io/en/latest/app1.html), rather than splitting whole-line boxes.

PDF.js was chosen over pre-rendering every page because all five original pages must remain readable while only requested pages are prepared. The first source is 45,710,226 bytes; a page image would still require retaining the original and would add generated assets for unrequested pages. The first ready package is approximately 1.8 MB plus the 44 MiB original; the frontend build is approximately 1.8 MB. Source fidelity and browser checks are recorded in [verification.md](verification.md).

The server binds to IPv4 loopback and rejects non-local Host headers. Content Security Policy restricts fetches to the local origin. It validates discovered packages and isolates malformed documents. A small atomic current-pointer switch publishes immutable revision directories, retaining previous data. Catalog polling happens every four seconds in the browser; active study stays pinned until **Load updated material** is chosen. No saved personal learning history is written.

Machine-readable v1 schemas are in `schemas/`; additional integrity/reference checks are in the local validator. Original proposal layout is refined by the immutable `revisions/<n>` directory and pointer; manifest-relative runtime paths and page-local anchors keep their specified meanings.

## Development verification

```sh
npm run setup:extractor
npm test
npm run build
```

Tests create isolated synthetic PDFs and packages in temporary storage, including a second document and a rotated page. The HTTP test starts a temporary loopback server; it requires permission to listen locally in restricted execution environments. Tests do not modify real accepted lesson data. Use the acceptance report for the boundary between automated checks, historical browser observations and outstanding capability limits.

## Visual style references · 2026-11-22

The user's two repository JSON references supersede the earlier Navy/Teal/Beige palette and system-font default for the application interface:

- [Reference 2](design-references/website-style-reference-2.json): spacious editorial sections, restrained hierarchy, fine dividers, minimal containers and no decorative shadows, adapted to the library, PDF reader and practice workflow. Its fonts and colors are excluded.
- [Reference 1](design-references/website-style-reference-1.json): locally bundled Geist and Geist Mono, white canvas, near-black `#0b1015` text, blue `#0562ef` actions, muted text, small 4px control corners, and the `#1a2838` / `#fffbf5` book-cover pairing. The interface uses this reference's light appearance regardless of system theme.

Fonts are supplied through the Fontsource variable-font packages and included in the build; no runtime font service is required. Source PDF artwork and text retain their original appearance. Always prefer the agent browser, such as the Codex browser, for content and interface review. The styling change was verified with a production build and local HTTP availability; the preview was opened in Codex, without an interaction review.

See [current visual design and reference roles](design-references/README.md) for the complete implemented style details.
