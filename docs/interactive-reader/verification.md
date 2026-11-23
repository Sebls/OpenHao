# Implementation and verification — 2026-11-22

## Hanzi Writer update — 2026-11-23

Help refinement: the writing-instructions paragraph is hidden by default behind a discreet question-mark button alongside the completion count. The button exposes its expanded state and controlled content to assistive technology. Browser review confirmed instructions initially hidden, revealed by click and hidden again with Enter; the production build passed.

Compact exercise refinement: 160px boards with 16px horizontal gaps, discreet play/restart icons, reviewed linked-character pinyin under each board and reviewed whole-target pinyin above. The writing-specific See original context action is removed. Browser review of 同学们 showed all three boards in one row with tóng / xué / men. A mouse-drawn first stroke of 同 was accepted; play demonstrated the remaining strokes and automatically returned to stroke two with only the original accepted stroke visible, no completion credit and unchanged retries. The restart icon reset only 同. Production build and all 13 tests passed, including remaining-stroke animation/restoration, interruption cleanup, and reviewed/ambiguous pinyin cases. This supersedes earlier Watch example / Return to drawing controls and 260px exercise-board sizing in the historical notes below. Reader board size/playback remains unchanged.

Exercise layout refinement: all characters now have simultaneous boards in source order, with independent stroke position, retries, completion and restart state per occurrence. The layout wraps to additional rows instead of paginating; completion is summarized automatically while boards remain visible. The updated automated session check covers independent progress/restart state for repeated characters. Browser review of 谢谢 showed both boards side by side; an accepted first stroke advanced only the first 谢, and switching Read → Writing retained its second-stroke position while the second board remained at stroke one. This supersedes the earlier single-board Next character / Finish writing interaction described in historical review evidence below.

Reader presentation refinement: replaced the Show/Hide stroke-order button block with a native **Stroke order** disclosure matching **Phonetic transcription** and **In the original**. Single-character playback and its writing-practice action live inside the section. Browser review confirmed collapsed/expanded states, local data loading, playback and collapse during playback; the production build passed. Word/sentence exercise actions remain independent of this character-only disclosure.

- `npm run build` passed; Vite retains its existing large-chunk advisory. Formatting and `git diff --check` passed.
- `npm test`: 11 tests passed. Added checks cover Unicode Han targets (including repeats and supplementary-plane characters), exact source occurrence references, independent session state, installed stroke-data coverage for every published reviewed learning target, local character-data HTTP delivery and rejection of non-character/path-traversal targets. The HTTP checks require local listening permission in restricted environments.
- Reviewed the production build in the Codex in-app browser at `http://localhost:4174/`, using an additional local server to leave the existing reader server/session intact. Restart the original server to enable its new character-data route.
- Observed on-demand animation, pause/resume, correct-stroke recognition, rejected-stroke feedback, an actual completed mouse-drawn 一 exercise, results and return to the exact source. A correctly accepted stroke of 你 and its retry count survived watching an example and switching Read → Writing. The sentence A：谢谢！ starts a two-character sequence preserving both occurrences of 谢 while excluding punctuation and the Latin speaker label.
- After the user's scope refinement, verified reader playback controls absent for the word 你好 and sentence A：谢谢！ while their writing-exercise buttons remain; inspecting the individual character 你 offers playback. Final browser error log contained no errors.
- Reviewed a narrow viewport: navigation wraps, the writing board remains 260px, and DOM bounds show the practice content within the viewport. Restored the browser viewport afterward. Physical touch/pen devices, a screen reader and a fully disconnected browser restart were not tested. Runtime character data uses local HTTP only and the existing production CSP continues to restrict connections to the local origin.
- Published content/revisions and correction IDs were not changed; writing results remain in memory only. Missing data offers retry and explicit skip rather than credit for completion.

The React reader, disk library, selected-page preparation tools and repository skill are implemented. Lesson 1 is locally published and usable. This report distinguishes observed results from remaining acceptance checks; it is not a claim of complete device/accessibility certification.

## Environment and delivered scope

| Item              | Evidence                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Computer          | macOS 27.0, build 26A428, Apple Silicon                                                                                                                                   |
| Node / npm        | 24.11.0 / 11.6.1                                                                                                                                                          |
| Chrome            | 157.0.8103.79                                                                                                                                                             |
| Safari            | 27.0                                                                                                                                                                      |
| Extraction        | PyMuPDF 1.26.7, raw character dictionaries; page 1 source render visually inspected                                                                                       |
| Source            | 45,710,226 bytes; SHA-256 `f87ec075d921793e9943559d9e5129e6bc2c4ea9b453283c6ca6f97d8ce7d75b`, identical to the documented original                                        |
| Published content | `new-hsk-1`, revision 1; only `pages/p0001` exists; physical pages 2–5 remain not prepared                                                                                |
| Lesson 1          | 47 entries, 77 anchored occurrences, 10 dialogue sentences, 12 reviewed single-choice questions across seven categories                                                   |
| Footprint         | Original approximately 44 MiB; generated package approximately 1.8 MiB; built frontend approximately 1.8 MiB; local PDF.js fonts/maps/WASM also installed in node_modules |
| Preparation skill | Bundled skill validator passed                                                                                                                                            |
| Installation      | `npm install --offline` with the populated install cache passed, including its automatic production build                                                                 |

## Automated checks

`npm test`: **8 tests passed**, covering multiple independent scenarios and assertions. Synthetic source files and staged revisions are isolated in temporary directories; actual lesson data is untouched.

- Page selection is mandatory; registration does not silently process all pages.
- Preparing pages 1 then 3 preserves every page-1 runtime file hash, source identity, extraction revision and stable ID. Page 2 stays unprepared. Repeating page 1 creates no revision or staging changes.
- A second synthetic PDF passes the same generic extraction, packaging and discovery pipeline.
- Rotated and cropped pages retain normalized, in-bounds genuine character boxes and expected visible dimensions. Multiline overlays use separate per-line regions.
- Code-point slicing handles a supplementary-plane Hanzi. Text quotes, checksums, answer IDs, distinct options, safe paths, schema versions, constituent cycles and geometry are checked, with invalid variants rejected.
- Selected sentence scopes include their own contained occurrences while leaving identical text elsewhere unselected. Unselected question sources are excluded; audio questions require a working local playback signal; shuffled option positions do not affect grading.
- Copied stable references resolve old observed revisions to the exact current record and dependent questions. Repairs preserve identity, reject unrelated record edits and frozen-extraction changes, and retain the previous package when validation/publication fails.
- Stale publication bases are rejected. Previous immutable revisions remain recoverable.
- Temporary local HTTP server delivers built assets, bundled PDF resources and PDF byte ranges. Non-local Host headers and unknown file paths are refused.
- Newly published revisions appear through the existing server; the open revision remains retrievable separately. An invalid document is isolated from the valid catalog. Restart rediscovers durable content without regeneration.
- Versioned valid/invalid JSON authoring examples exercise the published schema.

`npm run build` passes. Vite emits an expected bundle-size advisory for the bundled PDF renderer; no remote renderer is substituted to avoid that size. JavaScript syntax and extractor compilation checks pass. Published Lesson 1 revalidates against the final validator.

## Historical browser observations · before the visual redesign

These are historical observations of the earlier design, not instructions for future review or verification of the current visual style. Always prefer the agent browser, such as the Codex browser, for future content and interface review.

Chrome and Safari both loaded the local library and prepared reference lesson. Safari was checked in the installed browser, rather than using a WebKit substitute.

| Flow                     | Observed result                                                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Original PDF and details | Chrome displayed the original illustrations, Chinese lettering, punctuation and decorative source. A click directly on 您好 selected the respectful greeting. Safari opened the same PDF, removed its loading indicator, and opened matching beginner details through the companion. |
| Detail hierarchy         | Meaning, pinyin, character buttons, optional IPA and source context are available. Word selection persists independently of hover.                                                                                                                                                   |
| Speech                   | Chrome selected local **Eddy (Chinese (China mainland))**; Safari selected local **Tingting**. Explicit playback reached playing/completion states and enabled listening questions. Selecting a word did not autoplay. Audible/disconnected playback was not independently verified. |
| Practice                 | Both browsers showed reviewed questions, distinct choices, separate submission and explicit correct feedback. Chrome additionally completed an intentionally incorrect selected-material session, showed the correction/explanation/results, and reopened mistake retry.             |
| Return and copy          | Both browsers returned to source/details with selection/session retained. Both copied the exact occurrence reference; the selectable reference remained visible.                                                                                                                     |
| Keyboard                 | Chrome activated a learning unit with Enter, dismissed details with Escape, and restored focus to that same unit.                                                                                                                                                                    |
| Narrow layout            | Chrome at 390 × 844 showed a focused details view, readable Chinese/English, and a visible return-to-page action. Returning restored the original page. Temporary viewport override was reset.                                                                                       |
| Preparation states       | Chrome opened physical page 2 as an original page with “Not prepared,” no learning controls and no newly extracted files.                                                                                                                                                            |
| Dark appearance          | Observed in both installed browsers; fixed body-text and selected-navigation contrast during review. Source PDF colors remain unchanged.                                                                                                                                             |

## Known limits and remaining acceptance checks

1. **Physical disconnection:** local HTTP restart, durable assets and self-only fetch restrictions are tested; Wi-Fi/networking was not disabled on the user's computer. Actual audible Mandarin playback with the internet disconnected remains unverified in the recorded environment. Browser local-voice flags and completion callbacks are not proof of audibility. Text study remains usable without speech.
2. **Small image/decorative text:** page 1's red decorative seals and tiny illustration label are not confidently transcribed. They remain visible in the authoritative PDF and are excluded from teaching/practice. The available Tesseract binary cannot execute on this CPU. The extraction command supports `--ocr` with a working local Tesseract and language packs, but that OCR path was not exercised here.
3. **IPA:** reviewed character/word IPA is supplied; sentence-level and mixed-Latin-name IPA is explicitly unavailable. No transcription was invented to fill a field.
4. **Question coverage:** selection practice requires questions within the selected source scope. Some otherwise usable occurrences have no eligible questions; the app explains this and offers page/document practice. No filler is generated.
5. **Accessibility matrix:** semantic controls, language labels, visible focus, text companion, keyboard activation/dismissal, and narrow layout are implemented. A complete screen-reader pass, 200% text enlargement, light appearance and reduced-motion/contrast preference matrix have not been manually certified. There are no decorative motion effects. The current reference-based design uses a light appearance; the earlier appearance observations above do not verify that redesign.
6. **Performance:** package/build sizes are measured above. Reliable first-page latency, browser memory and hit-testing budgets have not been established on this source. No unsupported performance guarantees are claimed.
7. **Extraction migrations:** ordinary targeted repairs deliberately refuse frozen text/geometry changes. A requested extraction correction requires explicit page revision migration/remapping; there is no destructive force-reprepare shortcut.

The default private local library and its backups remain outside Git. Prior unrelated deletions/cleanup in the workspace were preserved; no old project files were restored from history.

## Visual redesign verification · 2026-11-22

The [reference-based visual design](design-references/README.md) supersedes the earlier appearance. The production build passed and the local server returned HTTP 200. The localhost preview was opened in Codex. No interaction or visual review of that redesign was performed; historical observations above must not be presented as current-design verification.

## PDF.js security update · 2026-11-23

Updated `pdfjs-dist` from 5.7.284 to 6.5.438 to address [GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j). Updated the declared Node requirement and setup documentation to match the dependency: Node 22.13+ or 24+. No published lesson revision was edited.

Verification: production build passed; all eight automated tests passed (the local HTTP test required permission to listen on loopback); npm audit reported zero vulnerabilities. Opened the library and Lesson 1 in the Codex in-app browser and visually confirmed the original PDF page rendered with its learning overlays. This focused compatibility check does not repeat the full interaction, accessibility, or offline speech acceptance matrix.
