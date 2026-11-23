# Agent skill implementation specification

Status: requirements for a future reusable skill, updated 2026-11-20. This file is not an installed or executable skill. No extraction scripts, enrichment agent, validator, or reader have been implemented by this documentation task.

## 1. Purpose and boundary

Given a PDF/document ID and requested physical pages, prepare validated offline learning content following the [content contract](content-contract.md). The same skill must support the initial document, later PDFs, page additions, and targeted corrections without per-document application changes or regenerating old pages.

The user invokes an AI agent to run the skill. The agent can use its existing reasoning capabilities for linguistic enrichment and question authoring; the skill must not require writing an LLM API integration into the application or ingestion scripts. Network use belongs to this preparation environment, not to the finished reader. Prefer local extraction/OCR; do not silently upload the source PDF to an external OCR service.

The skill and its deterministic tools live in the same repository as the reader. Follow the [local library workflow](local-library-workflow.md) for npm command names, staging/publication, and automatic discovery. The agent administers the library; the user runs the local app to study the prepared results.

## 2. Invocation inputs

Required for extraction:

- Source PDF path for a new document, or existing document ID for later additions.
- Requested physical one-based page numbers/ranges, or explicit whole-document scope. Never treat omitted scope as permission to prepare every page.
- Operation: inspect/extract, enrich, author questions, validate/publish, prepare requested pages end to end, or repair a stable item reference.
- Existing package path for updates, if applicable.

Read from saved project defaults before enrichment/question authoring:

- English explanations, level zero, Mandarin tone-mark pinyin, labeled secondary phonetic transcription (default IPA), sparse examples, and original-text priority.
- Requested page/item scope and any user-specified terminology.
- Agent review/validation and automatic local publication policy; coverage exceptions are reported rather than submitted as a routine approval questionnaire.

Do not ask the user to repeat these choices. English is the UI implementation default. Optional missing content does not block independent work. Ask only when the PDF/pages cannot be identified or another unresolved issue prevents correct work. On completion, return a short summary of prepared, skipped, and unresolved items.

## 3. Workflow

### A. Inspect

1. Verify the input exists, compute SHA-256, inspect page count/boxes/rotation, and detect embedded text/image content.
2. Identify a matching existing document by source hash and manifest. Do not duplicate a package because its title or input filename changed.
3. Validate requested physical pages, inspect existing page states, and render only pages needing preparation or explicit repair. Document-wide metadata inspection does not authorize full-document extraction/enrichment. Record tools, versions, and source facts.
4. Check local dependencies and stop the affected stage with an actionable explanation if a necessary extractor/OCR tool is unavailable. Do not manufacture coordinates as a fallback.

### B. Extract and align

1. Extract embedded characters, text clusters, lines, blocks, and raw geometry with a suitable local tool. Establish visible page transforms and reading order.
2. Inspect every newly prepared page against its extracted text. Detect broken font mappings, duplicate/invisible layers, unextracted image text, and scrambled order. Reuse valid evidence for untouched pages.
3. Use OCR on scanned pages or missing image regions when needed; reconcile overlap with embedded text to avoid duplicates. Retain method, confidence when real, and corrections separately from raw output.
4. Produce the UTF-8 transcript and layout mapping. Account for headers, footers, labels, and decorative/illustration text, even when they will not become learning annotations. Record unreadable text as an issue rather than an invented transcription.
5. Verify geometry and word/phrase anchorability using visual overlays. Freeze each page's extraction revision only after review. Use page-local offsets; adding another page must not invalidate old anchors.

### C. Segment and enrich

1. Identify lesson/section/dialogue context and classify source roles without changing the transcript.
2. Create character, word, expression, and sentence units with stable occurrence references. Extractor “words” are geometric runs, not Chinese vocabulary segmentation.
3. Author concise English meanings/translations for a complete beginner, Mandarin tone-mark pinyin, and separate labeled phonetic transcription (default IPA). Link constituent characters/words and relevant grammar. Prioritize character recognition, basic meaning, and pronunciation; explain terminology. Store generated explanations separately from source quotations. Default to source examples; add at most one supplemental example per item only if useful and label it.
4. Review polyphonic characters, proper names, particles, equivalent translations, unusual spacing, and punctuation. If source wording appears mistaken, preserve it and provide a clearly separate suggested correction.
5. Run structural/reference validation and a distinct linguistic review pass. Flag uncertainty; do not claim independent human review merely because an agent checked its own output.

### D. Author practice

1. Produce reviewed single-choice questions in the specified format, tied to actual occurrences and the selected learner level.
2. Include Chinese-to-English, English-to-Chinese, character identification, sentence comprehension, missing-word, grammar, and listening categories where supported. Keep all within one single-choice engine; no typed Chinese, handwriting, microphone, or speech scoring is required. Use only prepared source scope; audio questions require local speech. Do not reveal recognition answers through supplementary pinyin/translation labels.
3. Check every answer and distractor in context. Avoid two synonymous correct choices, ambiguity from pronouns or omitted context, and information not present in the prepared package.
4. Record where the bank supports selection-based practice and where it does not. Specify any deterministic templates the runtime may use and their validation prerequisites.

### E. Validate and deliver

1. Validate all files and cross-file references against the schemas and content contract.
2. Render source/overlay diagnostics for new/changed pages and inspect character, word, and multiline anchors at more than one display size. These are authoring diagnostics, not a substituted page design.
3. Produce per-page coverage/issue evidence and aggregate preparation states. Isolate uncertain records/questions from ready details/practice and publish usable reviewed content where safe. Unrequested pages do not block publication. Do not call partial preparation whole-document completion.
4. Build into a staging location. Replace the target package only after validation succeeds; retain a recoverable prior validated revision.
5. Complete validated local library publication when the request is to add material; report input source identity, output location, extraction/annotation/question coverage, unresolved issues, and catalog availability. Do not publish externally or upload material without authorization.

Here, external/public publication and uploads are separate from local library publication. When the user asks to add material to their system, completing validated local publication is part of that request; do not stop at a draft package or ask for routine extra approval. Confirm that the local catalog exposes the new document/revision. Never claim a library addition is complete after extraction alone.

## 4. Repeated runs and revisions

- Preserve IDs for an unchanged extraction. Reuse existing accepted enrichment rather than regenerating it gratuitously.
- Skip previously ready requested pages by default. Preparing new pages must preserve old page files and IDs byte-for-byte; only package metadata/reports/exports may change. Use explicit user-requested repair/reprepare scope to replace accepted page content.
- Check source/extraction hashes before linking new entries or questions. On mismatch, require a new extraction revision and explicit remapping/revalidation.
- Support running enrichment or question authoring after extraction without rereading coordinates from the UI or modifying `text.txt`.
- Preserve manually reviewed changes; stage conflicting generated updates for review instead of overwriting them.
- Keep authoring provenance reproducible without promising identical AI wording across runs.
- Keep schema migrations separate from content generation; a failed run must not damage the last usable package.

## 5. Future skill deliverables

The implementation should include:

1. An actual `SKILL.md` with invocation instructions, stages, required inputs, dependencies, failure handling, and output locations.
2. Local inspection/extraction/alignment helpers; OCR integration where required; deterministic packaging and validation commands.
3. Versioned machine-readable JSON schemas and small valid/invalid fixtures covering character ranges, multiline anchors, image text, and questions.
4. Agent-facing enrichment/question instructions with the exact content contract, uncertainty handling, and linguistic review checklist.
5. A review/coverage report template and overlay diagnostic generator.
6. A developer/user guide explaining how to add another PDF and load the resulting package privately/offline.

The skill must not be coupled to a particular PDF's page dimensions, lesson titles, filesystem filename, or runtime framework.

## 6. Targeted correction workflow

1. Resolve the user's reference with `content:lookup`; confirm the owning page, current revision, source quote, and affected entries/questions. Do not locate repeated text by string matching alone.
2. Stage a targeted explanation/pronunciation/answer correction without changing source PDF/text/coordinates. Preserve the stable item ID and unrelated accepted edits.
3. If geometry/transcription itself is wrong, explicitly create a corrected extraction revision for the affected page and migrate/revalidate its dependencies; other pages retain their revisions.
4. Review the corrected content and dependent questions, validate, publish locally, and verify discovery. Report what changed in a short response. A conflicting or ambiguous identity requires clarification; routine repair does not need repeated approvals.
