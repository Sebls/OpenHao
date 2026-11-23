# Local library and agent administration

Status: developer handoff specification, updated 2026-11-20. These commands and repository paths are the intended interface to implement; they do not exist yet.

## 1. Intended everyday experience

The product is a local study library administered by an AI agent. The user installs repository dependencies once, starts the application, and opens their computer's browser. The library lists all prepared study materials, with previously generated explanations and exercises ready to use. Studying does not require a running agent or internet access.

When the user has another PDF or wants additional pages of an existing PDF, they tell the agent which physical pages to prepare. The agent follows repository instructions, reuses the stored learning profile, extracts only needed pages, writes English explanations and questions, reviews and validates them, and publishes the usable additions. The application discovers the new material without source-code edits, rebuilding, or maintaining a document list. Previously prepared pages are not regenerated.

## 2. Installation and launch contract

Target initial setup from the checked-out repository:

```sh
npm install
npm start
```

`npm install` must install dependencies and perform any necessary application preparation through the documented setup flow. `npm start` must launch the usable reader and its local content-serving process, print the localhost URL, and remain running until stopped. It must not rely on a separately started development server, a manual frontend build, a remote backend, a global CLI installation, or an agent session. A later launch requires only `npm start`.

Serve on loopback only by default. Read source packages from local disk. After initial dependency installation/setup, starting, reopening, and studying must work with internet disconnected. A service worker, PWA installation, cloud hosting, user accounts, and npm registry publication are not prerequisites. The local process must be running to serve the browser; closing the browser does not delete the library.

Node.js/npm availability is a documented prerequisite. Prefer extraction dependencies installable through this same repository setup. If a selected native extractor/OCR dependency cannot be installed that way, provide a detection/setup command with actionable instructions. Do not conceal extra prerequisites behind a claim of one-command installation. Extra content-preparation dependencies must not prevent studying material that is already prepared.

## 3. Repository organization

Proposed layout, to be refined without changing the workflow:

```text
AGENTS.md                       # entry point for an agent in this repository
package.json                    # setup, launch, extraction and validation scripts
skills/prepare-material/SKILL.md # complete agent preparation instructions
tools/                          # local deterministic tools
schemas/                        # content schemas, examples, validation fixtures
config/learning-profile.json    # agent-readable language, level and teaching defaults
data/
  pdfs/<document-id>.pdf         # single directory of immutable original PDFs
  staging/<document-id>/         # work in progress, never listed as ready material
  library/<document-id>/         # validated published content packages
docs/                           # user and developer documentation
```

Treat `data` as the allowed data root: `pdfs` holds originals and `library` holds published generated packages. Each document package follows the [content contract](content-contract.md), with page-scoped text/coordinates, explanations, questions, and review. A backup must include both directories. Avoid duplicating the original PDF in every package revision. Keep user source PDFs, generated material, and staging out of Git by default; track schemas and small permitted test fixtures separately. Repository updates must not overwrite local material. Do not keep the only copy in build output, dependencies, browser cache, or temporary storage.

Content persists on disk across restarts. This includes PDFs, extracted text/coordinates, explanations, questions, and validation reports. Deferring personal progress persistence does not mean discarding these learning materials.

## 4. Agent command contract

Implement stable repository-local npm scripts. Proposed public interface:

```sh
npm run content:inspect -- --input "/absolute/path/material.pdf"
npm run content:extract -- --input "/absolute/path/material.pdf" --id "lesson-set" --pages "1"
npm run content:extract -- --id "lesson-set" --pages "2-3"
npm run content:validate -- --id "lesson-set"
npm run content:publish -- --id "lesson-set"
npm run content:list
npm run content:lookup -- --ref "lesson-set:p0001:annotation:a001@r2"
```

- `inspect` reports source identity, geometry, extraction availability, and dependencies without publishing.
- `extract` registers/copies an original into `data/pdfs` on first use, or resolves the existing source by ID. It stages only missing requested pages and reports page-scoped text, geometry, and authoring template paths. Require `--pages` or explicit `--all-pages`; skip ready pages. Do not re-extract/re-enrich old pages during additions. No LLM calls: the agent reads outputs and authors the specified files.
- `validate` checks the staged package and reports machine-readable issues plus a concise human summary. A nonzero exit code indicates blocking failures.
- `publish` revalidates, promotes a ready package into the library, and preserves the last validated version on failure. It must not publish a partial write or silently overwrite a different source with the same ID.
- `list` reports available published documents and revisions without starting the browser.
- `lookup` resolves a copyable reference to the exact file/record, source context, dependencies, and current revision. The agent makes a targeted staged repair, revalidates dependent questions, and publishes it while preserving stable IDs and unrelated content. An explicit scoped `--reprepare` option may be implemented for requested replacement; normal extraction must never overwrite ready pages.

Each command needs `--help`, documented arguments, stable output locations, usable errors, and meaningful exit codes. A single validation/publish operation should be reproducible without remembering agent chat history. The skill may compose these tools; the tools themselves must not implement AI calls. No user-operated administration panel is required.

The proposed `config/learning-profile.json` records English learning explanations, level zero, Mandarin, tone-mark pinyin, the labeled phonetic-transcription system (default IPA), source-first teaching, and sparse supplemental examples. English UI is the working default. This durable configuration is not learner progress or an LLM credential store. The agent reads it automatically and asks only for a missing page selection/source or another genuinely blocking ambiguity.

## 5. Content discovery and updates

1. On startup, scan published manifests under `data/library` and derive the catalog. Do not hard-code documents in the application or require the agent to edit routes, imports, or a separate hand-maintained index.
2. Exclude staging, incomplete packages, and failed validation output. Report a malformed published package locally without hiding other usable documents or crashing the whole library.
3. While running, detect newly published documents and changed `contentRevision` values through a local watcher or bounded polling. The implementation may choose the mechanism, but the browser must receive the update without server restart or application rebuild. Browser refresh also rescans/retrieves the latest catalog as a recovery route.
4. Display a new document in the library and indicate updated material unobtrusively. Do not unexpectedly navigate away from the user's current page or discard an active practice session.
5. Load a coherent package revision. If the active document changes, offer to load its new revision or defer until reopening; do not mix old anchors with new explanations. Prefer revision-isolated files or another atomic publication strategy that also prevents partially served updates.
6. Discover existing documents again after process/browser restart. A generated catalog is disposable; published packages are the source of truth.

Adding a raw PDF alone must not pretend that translations/questions already exist. The agent must finish preparation and publish. Automatic discovery means discovering prepared material, not silently running an AI agent when a file appears.

## 6. Library interface

The opening view is a simple list of published PDFs, with titles, physical page preparation states, and an action to open. Courses, tags, and elaborate folder hierarchies are not initial requirements. Display the unchanged original PDF and make prepared pages/items interactive; mark other pages “Not prepared” rather than showing empty explanations. Available learning units show concise English meanings, expandable details, pronunciation aids, local speech, and practice. Preserve in-memory continuity and provide a clear return to the library.

Include a quiet “Copy reference” action for explanations and questions. It returns a stable item reference plus useful source context that the user can give the agent with a short correction request. Provide selectable reference text if clipboard access fails. No feedback API or issue tracker is required.

Avoid making importing, configuring services, editing JSON, or running content tools part of the learner's reading flow. Administration belongs to the agent and repository tools; the browser presents the resulting study material.

## 7. Acceptance examples

- Fresh setup: install with the documented npm flow, start once, and open the printed local URL; the first prepared document is listed.
- Offline use: disconnect internet, stop/restart the local application, and open existing material with all prepared explanations and exercises available.
- Add material: with the app running, the agent prepares a second PDF and publishes it; it appears without code changes, rebuild, or process restart.
- Safe failure: invalid staged annotations prevent publication; existing library documents remain usable.
- Update material: publish revised explanations while reading/practicing; the application announces availability without resetting the active session or mixing revisions.
- Restart: previously published documents remain listed; no agent rerun is needed to recover their explanations.
- Incremental pages: publish page 1, then prepare/publish page 3; page 1's files and IDs are unchanged, page 2 remains visibly unprepared, and page 3 becomes usable automatically.
- Minimal conversation: one request identifying the PDF and pages is enough when saved defaults suffice; the agent reviews and publishes usable results, then returns a brief summary of additions/skips/issues.
- Correction: copy an explanation/question reference, give it to the agent, and locate/repair that exact record without rebuilding the whole PDF's learning content.

See the [agent workflow](agent-workflow.md) for extraction/enrichment review and the [delivery plan](delivery-plan.md) for the complete acceptance matrix.
