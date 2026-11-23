# Developer delivery and acceptance plan

Status: proposed implementation sequence, updated 2026-11-20 for the [current requirements](current-requirements.md). This is a handoff plan, not authorization to begin application implementation.

The [local library workflow](local-library-workflow.md) specifies the intended installation, launch, agent tooling, and discovery experience. The target is `npm install` then `npm start` for a localhost library; hosting and PWA selection are not prerequisites.

## 1. Decisions and preparation

Use the confirmed profile: English explanations, level zero, Mandarin tone-mark pinyin and separate phonetic transcription, short expandable details, sparse examples, and page-selected preparation. English UI and IPA secondary transcription are working implementation defaults. Always prefer reviewing the core loop and prepared content in the agent browser, such as the Codex browser, and record local voice results or capability limits. Do not repeat an onboarding questionnaire before beginning implementation.

Inspect the first source at its supplied location. Store a byte-identical original once in `data/pdfs` and generated content under document/page directories. Do not depend on the Downloads path at runtime. Do not publish the PDF externally or restore old project files from Git history. Lesson 1 is the agreed first teaching/interface reference; map it to physical page 1 during preparation. Do not automatically prepare the remaining four pages.

## 2. Increments

| Increment                              | Deliverable                                                                                                                | Exit evidence                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Contract and extraction             | Executable schemas/validator and local tools; page-local transcript and geometry for Lesson 1                              | Source/visual comparison, validated offsets, diagnosed illustration text, source hash match; unprepared page states recorded                   |
| 2. Reusable agent skill                | Saved profile, page-selective workflow, concise enrichment/questions, stable lookup/repair, revision-safe publication      | One page prepared end to end; later page addition and repeated request leave previous pages unchanged                                          |
| 3. Faithful reader prototype           | Candidate renderer and aligned overlays; accessible text companion                                                         | Original pages compared visually; word/character/multiline geometry correct at different sizes; renderer decision recorded                     |
| 4. Consultation and speech             | Hover/selection details, contextual hierarchy, local browser speech and error states                                       | Mouse, keyboard, touch checks; actual disconnected playback or clear unavailable state on named target                                         |
| 5. Practice loop                       | One single-choice engine covering recognition, translation, sentence, missing-word, grammar, and available listening tasks | Category fixtures and eligible source questions verified; answer IDs survive shuffle; no answer leakage; feedback/retry/source return work     |
| 6. Local library delivery              | npm setup/start, local disk library, manifest discovery and update notification, agent publication tools                   | Network-disabled restart and study; second published PDF appears without code edits, rebuild, or server restart                                |
| 7. Requested-page coverage and handoff | Reviewed Lesson 1 reference, per-page coverage, second-document fixture, setup/add-pages/correction guide                  | Requested scope has usable reviewed content, uncertainties isolated, other pages remain unprepared; new documents work without reader rewrites |

Lesson 1 is the first reference for explanation quality and interface behavior. Include word/character identification, natural English sentence meanings, pronunciation aids, sparse examples, and eligible exercises. It is not a commitment to prepare all five pages. Once the reference works, later page requests reuse the same pipeline. No hand-coded hotspots or mandatory separate human sign-off is required.

## 3. Acceptance matrix

| Area                      | Required observable behavior                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source integrity          | Packaged original hash equals inspected input; original text, layout, images, and decorative content remain visible                                                                                           |
| Requested-page extraction | All requested new pages inspected against transcript, including image text; missing/unreadable content reported; unrequested pages not processed or claimed complete                                          |
| Stable anchors            | Repeated text maps to its own occurrence; Unicode offsets, source quotes, and character references validate                                                                                                   |
| Geometry                  | Character, word, phrase, and multiline hotspots align after resizing and zoom; cropped/rotated/scanned fixtures exercise transforms                                                                           |
| Consultation              | Hover preview and persistent details remain distinct; touch/keyboard routes work; overlapping units can be explored predictably                                                                               |
| Content quality           | Contextual meanings/pronunciation and character relationships reviewed; unavailable optional content does not produce empty or invented sections                                                              |
| Beginner teaching         | English meaning first, concise expandable breakdown/grammar, source-first examples, no assumed IPA/grammar knowledge, and no bulk supplemental examples                                                       |
| Written pronunciation     | Tone-mark Mandarin pinyin and separately labeled phonetic transcription; reviewed values, readable tone/IPA glyphs, honest missing-data state                                                                 |
| Audio                     | Explicit start/replay/stop behavior, no overlap, visible failure/unavailable states, no remote-voice fallback; test local voice offline                                                                       |
| Practice                  | Reviewed prepared questions and eligible templates reuse entries; one correct option, meaningful explanation, mistake retry, source return                                                                    |
| Insufficient material     | No fabricated questions or choices; explain why selection cannot support practice and allow adjustment                                                                                                        |
| In-memory continuity      | Returning to reading retains location; switching views retains active session/selection; closing/reloading may reset personal state                                                                           |
| Offline                   | After documented setup, disconnect internet and restart/reopen using the supported launch method; pages, annotations, questions, and required assets still work                                               |
| Private delivery          | Material remains on the user's device under the chosen local/private delivery approach; no public deployment, telemetry, accounts, or hidden uploads                                                          |
| Simple launch             | Documented npm setup followed by `npm start` serves the complete application on loopback and prints its URL; later launches require no manual build or additional server                                      |
| Agent administration      | A new agent can follow repository instructions to extract, enrich, validate, and publish another PDF without prior chat history or manual learner-side JSON editing                                           |
| Library discovery         | All ready published documents appear on startup; new/revised published packages are detected while running; staging/invalid packages stay out of the ready catalog                                            |
| Durable learning content  | Original materials and generated explanations/questions survive process/browser restarts and application rebuilds; no agent rerun is needed                                                                   |
| Safe live updates         | New material does not interrupt the current session; active document revisions never mix old anchors and new data                                                                                             |
| Incremental pages         | Prepare page 1 then page 3: old page hashes/IDs/revisions unchanged, page 2 visibly unprepared, new page discovered automatically; repeating page 1 is a no-op                                                |
| Targeted corrections      | Copy a reference for a repeated word/question, resolve its exact occurrence, repair it, preserve its ID and unrelated content, and revalidate dependent questions                                             |
| Low-friction review       | Saved defaults reused; one PDF/page request completes routine preparation/publication; uncertain items are isolated and summarized without forcing per-item approval                                          |
| Agent browser review      | Prefer the agent browser, such as the Codex browser, for source overlays, details, practice, copy-reference fallback, offline reopening, and local speech/unavailable states; record unavailable capabilities |
| Accessibility             | Complete core loop through keyboard and assistive reading; visible focus, equivalent source text, readable Chinese/tone marks, feedback independent of color/audio                                            |
| Responsive fidelity       | Wide/narrow layouts retain original-page aspect ratio and usable consultation controls; enlarging UI text does not hide controls                                                                              |
| Invalid content           | Broken paths, malformed records, mismatched revisions, invalid answer IDs, and unsupported schema versions yield useful errors; last validated package survives failed updates                                |
| Extensibility             | A second small PDF fixture uses the same extraction/package pipeline and reader components without hard-coded document changes                                                                                |

Use focused automated checks for contract validation, page-local Unicode ranges, coordinate transforms, answer correctness after shuffle, incremental page integrity, source-hash mismatch, and stable correction lookup. Use visual/manual checks for source fidelity, linguistic quality, keyboard/touch flow, agent-browser behavior, and actual offline speech. Do not equate schema validity with linguistic correctness.

## 4. Performance and delivery evidence

The first input is approximately 45.7 MB despite having only five pages. Measure offline package size, first-page display time, page navigation, overlay hit-testing, and memory on the selected target before choosing budgets. Compare PDF rendering with verified page assets if needed; any optimization must preserve the original source and visible content. Do not impose arbitrary numerical performance claims without measurements.

Keep the final handoff small: setup/launch instructions, target devices/browsers, installed local voice prerequisites, adding/updating PDFs through the skill, content-format version, acceptance results, and known limitations. Distinguish implemented/tested behavior from proposed future capabilities.
