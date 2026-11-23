# Current implementation requirements

Status: developer handoff specification, updated 2026-11-20 with the user's learning preferences and incremental page preparation decisions. Application and skill implementation have not started.

## 1. Authority

The [original requirements](requirements.md) remain an unchanged historical baseline. This document records the user's subsequent decisions and overrides that baseline wherever they differ. The [content contract](content-contract.md), [agent workflow](agent-workflow.md), and [delivery plan](delivery-plan.md) define the proposed implementation contract for these decisions. Technical details in those documents are design proposals, not claims that the user selected a library or framework.

Order of precedence: later explicit user instructions, this document, the original requirements, implementation/design guidance. Record future scope changes here or in a linked dated decision; do not silently merge contradictory requirements.

### Product description

A personal, offline study library for someone starting Chinese from zero. The user runs a local npm application and studies original PDF pages in the local browser. Selecting a character, word, or phrase reveals concise English explanations, Mandarin pronunciation aids, and available speech. Multiple-choice practice develops character recognition, basic meanings, pronunciation awareness, and comprehension using prepared source material.

An agent administers the library through repository tools and a reusable skill. The user specifies which PDF pages to prepare; the agent extracts those pages, writes and reviews learning content, validates it, and publishes the additions. Previously prepared pages and corrections remain intact. The application discovers the new content, and the user can study it later without the agent or internet.

### Confirmed learning profile and working defaults

| Area                      | Decision                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learner                   | Complete beginner, Chinese level zero; prioritize recognizing characters, basic meanings, and pronunciation                                                                        |
| Explanations/translations | English                                                                                                                                                                            |
| Interface                 | English as the implementation default; the user explicitly selected English for learning explanations, without requesting a separate interface language                            |
| Pronunciation             | Mandarin pinyin with tone marks, separate phonetic transcription, and browser speech when available offline                                                                        |
| Secondary transcription   | IPA is the proposed implementation default for the separately requested phonetic transcription; label its system and explain it briefly rather than assuming the learner knows IPA |
| Explanation depth         | Short meaning first, expandable character/word breakdown and relevant grammar; few examples                                                                                        |
| Additional examples       | Allowed, but original document content takes priority; default to no supplemental example unless useful, at most one per item unless requested                                     |
| Preparation scope         | User-selected physical PDF pages, added incrementally; no automatic whole-document preparation                                                                                     |
| Review                    | Agent review plus validation and automatic local publication of usable results; concise exception report, minimal back-and-forth                                                   |
| Corrections               | Stable, copyable item IDs resolvable by repository tools and the agent                                                                                                             |
| Review browser            | Always prefer the agent browser, such as the Codex browser, for content and interface review; record the review environment and any unavailable capabilities                       |
| Storage                   | One directory for original PDFs; structured generated content per document and page                                                                                                |
| Reference lesson          | Lesson 1 of the selected PDF is the agreed first reference for teaching quality and interface behavior                                                                             |

Defaults above guide implementation without another setup questionnaire. Do not treat the proposed IPA notation or English interface default as a verbatim user selection. Store these defaults in repository configuration that the agent can read; changing configuration must not silently regenerate previously reviewed material.

### Visual design and review update · 2026-11-22

Use the [current visual design and reference roles](design-references/README.md). Reference 2 guides minimal structure and spacing; reference 1 supplies fonts, colors and finishing details. These decisions override conflicting older visual defaults. Always prefer the agent browser, such as the Codex browser, for content and interface review. Record capability limits honestly.

## 2. Product and deployment

- Personal use with private access in a browser.
- The intended product is an agent-administered local study library: install repository dependencies with an npm setup command, launch with `npm start`, and open the computer's localhost browser URL. The local process serves all prepared materials from disk. See the [local library workflow](local-library-workflow.md) for the proposed command and discovery contract.
- The agent adds and updates learning material through repository-local tools and a documented skill. After validation/publication, the running application detects new or revised material without code edits, rebuilds, or a server restart. The browser lists the resulting library; no manual content administration UI is required.
- The installed/prepared reader must work without an internet connection: opening the content, navigating pages, consulting annotations, and completing exercises.
- Internet is permitted during agent-led content preparation. The reader must not require an agent session, LLM endpoint, API key, remote dictionary, remote translation, analytics, CDN, or remotely hosted asset at runtime.
- No application-integrated LLM API calls in this version. The AI agent runs a reusable skill outside the reader when the user adds a PDF or enriches existing material.
- No accounts, cloud synchronization, public sharing, or multi-user backend are required. Use a local server bound to loopback by default. PWA installation and browser-cache-based content delivery are not required.
- PDFs, coordinates, agent-prepared explanations, exercises, and reports persist in the local library across application restarts. This content persistence is required and distinct from optional learner progress.
- No personal progress persistence in this version. Session scores, current page, practice selection, and answers may exist in memory. Preserve them during ordinary in-app navigation; persistence after reload or closing is not required. Offline storage of application/content assets is separate from learner progress.

## 3. First source document

User-selected input:

`/Users/usuario/Downloads/📙1.1 Leçons 1–5 _ textes en grands caractères_New HSK 1.pdf`

Read-only inspection on 2026-11-19 established:

| Property              | Observation                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF title             | New HSK 1                                                                                                                                                 |
| Size                  | 45,710,226 bytes                                                                                                                                          |
| SHA-256               | `f87ec075d921793e9943559d9e5129e6bc2c4ea9b453283c6ca6f97d8ce7d75b`                                                                                        |
| Physical pages        | 5; these are the reader's page numbers                                                                                                                    |
| Page geometry         | Approximately 595.5 × 842.25 PDF points on all five pages; reported rotation 0                                                                            |
| Embedded text         | Text extraction returned Chinese/Latin text from all five pages                                                                                           |
| Structure             | Five lesson headings, with subsections 1.1–1.3 through 5.1–5.3 visible in extracted text                                                                  |
| Layout                | Page 1 was visually inspected: large Chinese dialogue text, illustrations, decorative background, small captions/header/footer, and printed audio symbols |
| Extraction limitation | Poppler's word boxes sometimes contain a complete Chinese dialogue line; these are not linguistic word boundaries or character boxes                      |
| Review limitation     | Embedded-text extraction is not proof that all visible text was recovered; illustration text and decorative lettering need visual/OCR review              |

The printed references such as “New HSK 1, pp 1–4” refer to the learning material, not extra pages in this five-page file. Printed audio symbols do not establish that recordings are present or available. No source PDF or generated dataset was added to the repository during this documentation update.

## 4. Source fidelity and reader

R1. Preserve the original PDF bytes as the authoritative source. Never replace its wording, punctuation, spacing, illustrations, or page layout with an AI reconstruction.

R2. Display faithful original pages with an aligned interactive overlay. A PDF renderer or verified page images are both candidates; select the implementation after a fidelity/size prototype. Extracted text is a linked data representation, not a replacement for the visible pages.

R3. Support click/tap and keyboard access to characters, words, expressions, and sentences. Hover provides a compact preview on suitable devices. Explicit selection opens persistent details until dismissed or replaced.

R4. Multiple linguistic units can share or overlap source regions. Default to the word at the selected position where available, then offer character/phrase/sentence exploration within the same detail view. Do not stack competing popovers. Document any adjustment made after prototype testing.

R5. Keep the active source location and current in-memory practice work when switching views. Preserve alignment under responsive resizing and zoom. Narrow screens may require page zoom/panning; never reflow or crop away the authoritative page to imitate a mobile text layout.

R6. Provide an accessible text companion linked to the page and equivalent annotation controls. It supplements the original layout, supports copy/assistive reading, and must identify any unresolved transcription uncertainty. Original-page fidelity alone does not provide accessibility.

## 5. Extraction and content preparation

R7. Prepare a reusable, agent-executable ingestion skill for subsequent PDFs and page additions. For each requested physical page, extract all discoverable text, retain exact source anchors and coordinates, produce a simple UTF-8 plain-text export, and produce structured coordinate data. The skill must use deterministic local extraction/validation tools and permit agent-authored enrichment; it must not depend on reader-side LLM calls. Full-document preparation is an explicit option, not the default.

R8. Prefer embedded text when reliable. Inspect every newly prepared page for missing or defective text, including text inside images. Use local OCR when needed and available; record OCR/transcription provenance and uncertainty. Reuse valid review evidence for unchanged prepared pages. Never claim complete extraction from the embedded text layer alone.

R9. Character-level geometry is required to support character and word overlays. Do not fabricate it by dividing a line's width evenly. Preserve original geometry, reading order, Unicode text, and explicit mappings to the plain-text export as defined in the content contract.

R10. Keep extraction, semantic segmentation, linguistic enrichment, exercises, validation reports, and original assets separate. An agent may add translations, contextual pronunciation, meanings, character breakdowns, grammar, and examples without rewriting the source or moving its anchors.

R11. New PDFs must enter through the same package format and workflow. Runtime components must not contain document-specific text matching or coordinates.

## 6. Annotation and content quality

R12. An AI agent authors annotations through the skill. Agent generation is a separate preparation step; it is not evidence of linguistic correctness. The workflow must validate structure and references, require an agent review pass, and expose unresolved linguistic or extraction issues for review.

R13. Meanings and pronunciation are contextual. Distinguish repeated occurrences and polyphonic characters. Character meanings do not automatically equal a word's meaning. Missing optional grammar/examples should be omitted rather than invented.

R14. Define coverage for the requested pages: extract all discoverable text there, distinguishing learning passages from headers, footers, labels, and decorations. Target annotations for learning characters, vocabulary, expressions, and sentences on those pages. Each learning unit needs usable meaning/pronunciation or a recorded exception. Track unprepared pages explicitly; they do not block publishing prepared pages. Completing all five lessons is not required for the first usable release.

R15. Use English explanations/translations for a complete beginner learning Mandarin. Preserve the source script exactly. Give contextual word meanings and natural sentence translations, short constituent breakdowns, and only relevant grammar in plain English. Explain necessary terminology. Prioritize the original dialogue; label any generated supplemental example and keep it sparse. Do not invent character etymologies or present a rough English sound analogy as an accurate transcription.

## 7. Pronunciation

R16. Recorded audio is not available. Browser-generated speech is acceptable. Use explicit playback, replay, visible playback/error states, and one active utterance at a time; selection alone must not speak.

R16a. Provide Mandarin pinyin with tone marks as the primary written aid. Model phonetic transcription separately, with an explicitly named system; use reviewed IPA as the implementation default for that secondary aid. Keep pronunciation guidance concise and expandable. Do not duplicate pinyin into an unlabeled “phonetic” field, fabricate missing transcriptions, or make IPA knowledge necessary to study. Contextual tone/pronunciation notes must remain distinct from source text.

R17. Offline speech requires a suitable local voice on the target device/browser. Check local voice availability and test with networking disabled. Never silently choose a remote voice. If none works, explain that offline pronunciation is unavailable and retain readable phonetic information. If spoken audio on that device is mandatory, resolve local voice installation or another local audio option before acceptance.

The browser API distinguishes local and remote speech voices through `SpeechSynthesisVoice.localService`; this flag does not replace testing actual offline playback. Reference: [MDN localService documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), checked 2026-11-19.

## 8. Practice

R18. Support single-answer multiple-choice exercises in the first version, including questions prepared by the agent in the specified content format. Include Chinese-to-English meaning, English-to-Chinese recognition, character identification, sentence comprehension, choosing a missing word, grammar comprehension, and listening comprehension when local speech works. These are categories within one multiple-choice engine, not separate grading engines. Question text is data, never executable instructions or application code. No microphone, handwriting input, or automatic assessment of the learner's spoken pronunciation is required.

R19. Also support creating a session from reader selections using eligible prepared questions and/or validated deterministic templates over enriched entries. Document-wide/section-wide practice can draw from the same bank. No live AI generation is needed.

R20. Each question must have exactly one defensible correct option, distinct plausible alternatives, an explanation, and source references. Do not generate filler choices when material is insufficient. Account for synonymous answers and multiple valid contextual meanings during review.

R21. Show feedback, session results, explanations, mistake review and retry, and a return to the original passage. These are in-memory session behaviors, not saved learning history. Audio-dependent questions are unavailable when local speech is unavailable; text questions remain usable.

R22. Additional question formats may be representable in future format versions; implementing open-ended AI grading, speech recognition, or other exercise engines is outside this version.

R23. Opening the app shows a library of all validated published documents and their prepared learning content. The agent performs ingestion/enrichment/publication; the reader does not require a manual import, an active agent, or regenerated explanations to study existing material.

R24. Derive the document catalog from local package manifests on startup and refresh it when published material changes. Exclude incomplete/staged content. Preserve active reading/practice when a new document or revision appears; never combine mismatched package revisions.

R25. Repository instructions must tell a new agent exactly which commands to run, which extracted files to read, which annotation/question files to generate, and how to validate/publish. Stable tools and file formats must make administration independent of earlier chat history.

R26. Page preparation is incremental and idempotent. Physical PDF page numbers are one-based and distinct from printed textbook references. Preparing pages 2–3 after page 1 must not re-extract, re-enrich, renumber, or overwrite page 1. Repeating an already prepared page request skips it and reports the result; an explicit repair/reprepare instruction is required to change it. Coordinate anchors use page-local offsets and page extraction revisions.

R27. Keep original PDFs in one local directory, with generated output organized by document and physical page. Record per-page states for not prepared, extracted, needs review, and ready, with question availability separate. The browser may show the complete unchanged PDF while clearly marking which pages have learning content. Practice includes only reviewed prepared content.

R28. Give source occurrences, explanations, and questions stable IDs. Provide a quiet “Copy reference” action including document ID, physical page, item ID, and content revision; show a selectable text fallback if copying fails. Repository lookup tools must locate the exact record from this reference. Repairs preserve its ID and unrelated reviewed content, and revalidate dependent questions.

R29. Use stored preferences and routine agent judgment to minimize questions. On a request to prepare pages, complete extraction, enrichment, agent review, validation, and local publication of usable pages without asking for separate approvals at each stage. Quarantine uncertain items/questions and report them briefly; do not require the learner to approve every record. Only unresolved choices that prevent correct work need a question. Partial coverage must be honest and uncertain content must not enter exercises.

## 9. Scope reconciliation

| Original baseline                                        | Current decision                                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Preserve reading/learning progress across reopening      | Deferred; preserve continuity only within the running session                                                              |
| Automatic content extraction/annotation listed as future | Agent-led preparation skill is now part of the planned system; automatic in-app ingestion remains out of scope             |
| Rendering strategy undecided                             | Faithful original pages plus overlay required; renderer implementation remains undecided                                   |
| Different audio sources possible                         | Browser speech using local voices is the initial option; recordings unavailable                                            |
| Framework/storage unspecified                            | Still unspecified; offline/private requirements constrain selection                                                        |
| Delivery mechanism previously open                       | npm-based setup/start and local disk library served on localhost; exact framework remains open                             |
| Additional documents described mainly as extensibility   | Multi-document library discovery is initial scope; use the first PDF as initial content                                    |
| Additional exercise formats later                        | Still later; initial agent question bank uses multiple-choice format                                                       |
| Whole-document coverage previously expected              | User-selected pages prepared incrementally; Lesson 1 is the initial reference, not an obligation to prepare all five pages |
| Learning profile previously open                         | English explanations, level zero, Mandarin tone-mark pinyin and secondary phonetic transcription                           |
| Browser review                                           | Prefer the agent browser, such as the Codex browser                                                                        |

## 10. Decisions remaining before relevant implementation

1. Prefer reviewing content and interface changes in the agent browser, such as the Codex browser. Record available local Mandarin voices and review limitations without requiring a separate installed-browser review. Mobile remains responsive design work, not a separate offline installation requirement for initial acceptance.
2. Select the supported Node.js version and dependency setup, including extraction/OCR prerequisites. Local npm launch and agent publication are already selected.
3. Select faithful PDF rendering versus verified page assets based on the prototype's fidelity, clarity, size, accessibility, and offline cost.
4. Confirm actual review/coverage evidence for Lesson 1 and subsequently requested pages. No whole-document completion gate or routine human sign-off is required.

These choices do not require starting application implementation during this documentation task.
