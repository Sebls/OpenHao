# Guidelines for the implementation agent

## 1. Authority and scope

Read [the original requirements](requirements.md) and [current requirements](current-requirements.md) before proposing implementation. Preserve the original baseline; the current requirements record later user decisions and take precedence where they conflict. Also read the [content contract](content-contract.md), [agent skill workflow](agent-workflow.md), and [delivery plan](delivery-plan.md). These guidelines interpret how to work toward the specification and do not add product requirements.

For interface decisions, also read [the design guidelines](design-guidelines.md). They distinguish Apple's published guidance from project interpretations for the web reader and include the design review checklist.

Read the [local library workflow](local-library-workflow.md) for the intended npm setup/start, repository tools, agent-managed publication, and automatic material discovery. Build for a local disk library served to the user's computer browser; do not introduce hosting/PWA decisions as prerequisites.

Start with the complete reading and practice loop for one document. Original sections 14–15 apply subject to current overrides. Agent-led extraction, annotation, and question preparation through a reusable skill are now planned initial scope. In-app LLM calls, automatic in-app ingestion, advanced image learning, additional exercise engines, personalized revision, detailed statistics, multilingual expansion, and device synchronization remain outside initial delivery.

The first reference is Lesson 1, not automatic completion of the PDF. Prepare only requested physical pages, preserve accepted old pages, and keep per-page source anchors stable. Use English teaching for Chinese level zero, Mandarin pinyin with tone marks and separately labeled phonetic transcription, short expandable explanations, and few additional examples. Support all chosen multiple-choice categories within one question engine. Always prefer reviewing content and interface changes in the agent browser, such as the Codex browser.

Store learning defaults in agent-readable project configuration. A request to prepare named pages authorizes routine extraction, generation, review, validation, and local publication; do not ask the learner to approve each stage or item. Isolate uncertain records, report them briefly, and continue independent usable work. Corrections use copyable stable IDs and targeted lookup, not regeneration of a document.

Do not silently promote optional reading preferences or examples of available linguistic fields into mandatory populated fields. Grammar is shown when available; missing linguistic information is an expected content state.

Start from the new documentation. The previous project's files and plans were removed at the user's request; do not restore or reuse them from Git history without an explicit request. Preserve the original requirements as the baseline.

## 2. Establish the first document before building

The first source PDF has been selected and inspected at the external path recorded in the current requirements; no PDF or dataset is bundled yet. Preserve exact original pages with overlays. Select the renderer and offline delivery mechanism after inspecting source/target needs. Record unresolved choices rather than presenting assumptions as approved requirements.

Resolve these choices when they become necessary:

- English teaching and level-zero Mandarin are confirmed; English UI and IPA secondary transcription are working defaults. Do not reopen these choices as prerequisites.
- PDF rendering versus verified page images; structured text is an accessible companion, not a replacement for the original page.
- Actual skill implementation, local extraction/OCR tools, page-local formats, scoped review evidence, and requested-page annotation coverage.
- Suitable local browser voices and tested offline playback; no remote speech fallback.
- In-memory state continuity only; saved personal progress/history is deferred.
- Exact npm setup/dependency requirements and the agent-browser review environment and any capability limits; local launch and agent-managed content publication are already selected.

Select a framework and content storage approach only after inspecting these needs. Authentication, a remote backend, and paid services are not required. Reader-side external AI calls are out of scope. Offline asset storage must not silently introduce personal progress persistence.

## 3. Keep content, locations, and learner state separate

Recommended modeling approach, subject to validation against the first document:

- Give documents, sections/pages, linguistic entries, and annotation occurrences stable identifiers.
- Store reusable linguistic information independently from rendering components.
- Link each annotation occurrence to its source document and exact location. Repeated text alone is not a reliable location identifier.
- Represent text ranges and image regions explicitly. Document the coordinate system and behavior under resizing or zoom before using image overlays.
- Allow words, characters, expressions, sentences, and grammar references to link to each other without copying their definitions into every screen.
- Preserve contextual pronunciation and meaning when the same written form has different uses.
- Keep learner state separate from source material. Practice must not rewrite educational content.
- Implement the versioned content format from the start: material persists on disk even though personal progress is deferred. Define how existing documents remain readable after changes.

Optional information must remain optional. Validate source references and required structural fields, report actionable content errors, and let valid content remain usable when optional information is absent.

## 4. Put the reader first

Preserve source content and meaningful structure, including images and tables. Keep the document visually dominant and maintain its position when details, audio, or practice are opened.

Use hover for a compact preview and selection for persistent details. Provide equivalent access through keyboard and touch; essential information cannot require hover. Define predictable handling of overlapping annotations and a way to move between a word and its constituent characters without accidental navigation.

Show only available information. Distinguish unavailable audio from loading and playback failure. Use explicit playback controls and avoid unexpected audio. Ensure detail views can be dismissed and keyboard focus returns sensibly to the reader.

Keep selected, focused, playing, correct, incorrect, loading, and failed states understandable. Do not rely on color alone. Check readable Chinese typography, text enlargement, narrow screens, and touch interactions.

## 5. Generate practice from supported content

Reuse the same linguistic records used by the reader. Retain a source reference on every exercise so the learner can inspect the original context and return to reading.

Start with multiple-choice practice from selected material. Enable a question only when its required content exists. Check that it has one defensible correct answer and distinct, plausible alternatives; account for equivalent translations and alternate valid meanings. Do not invent definitions, pronunciation, grammar, or distractors just to fill a session.

If a selection cannot support valid exercises, explain why and let the learner adjust it. Keep feedback meaningful, track session results, support retrying mistakes, and preserve the reading position on return. Additional exercise types remain later work unless explicitly brought into scope.

## 6. Deliver in reviewable increments

Suggested implementation sequence, not an approved technology plan:

1. Inspect the first document and prepare Lesson 1 as the agreed teaching/interface reference, using the stored profile and page-scoped pipeline.
2. Implement source rendering, navigation, location anchors, and reading-position preservation.
3. Add accessible previews and persistent details, including word/character exploration and available grammar.
4. Add pronunciation display, available audio, and unavailable/error states.
5. Add practice selection, reviewed agent-authored questions and valid template questions, feedback, results, and mistake retry.
6. Complete in-memory continuity, offline/private packaging, responsive behavior, accessibility, and content validation. Do not add saved personal progress.

Use the delivery plan for the broader sequence including skill implementation and full content preparation.

Keep each increment usable and linked to the specification. Record coverage for the requested pages explicitly; unrequested pages are not a completion gate. Verify that later page additions do not modify accepted earlier pages.

## 7. Verify observable behavior

Maintain a compact acceptance checklist mapping requirements and success criteria to implemented behavior and verification evidence. Before calling the initial version complete, verify:

- The first document remains readable with its relevant structure and assets intact.
- Preview and detail interactions work with mouse, keyboard, and touch, including overlapping annotations and dismissal.
- Word/character exploration and available grammar retain their original context.
- Audio playback, repetition, unavailable content, and playback failures behave clearly.
- Selected material produces valid questions; insufficient content is handled without misleading questions.
- Feedback, results, mistake retry, and navigation back to the source work.
- Reading position and practice work survive switching features within the running session; reopening may reset personal state.
- Offline assets remain available after the supported reopen/restart procedure; asset persistence is distinct from deferred personal progress.
- Missing optional fields, broken asset references, and malformed content do not crash otherwise usable reading or practice.
- Representative small screens and a document with many annotations remain usable.
- A second small document fixture can use the same model and components without document-specific rewrites.
- Preparing another page of the same PDF preserves earlier files, anchors, explanations, and IDs; repeated requests skip prepared pages.
- Stable correction references resolve exact occurrences/questions; targeted repair preserves unrelated material and updates dependent checks.

Use focused automated checks for source anchoring, Unicode offsets, coordinate transforms, exercise correctness, and package integrity, plus manual checks for layout, reading flow, focus, and actual offline audio. Agree on measurable performance targets using representative content before claiming performance compliance; the specification does not supply numerical budgets.

Report what changed, how it was verified, and any remaining limitations. Do not claim the system is complete based only on a working demonstration.
