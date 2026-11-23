# Content package contract, proposed v1

Status: implementation specification, revised 2026-11-20 for incremental page preparation; not an implemented schema or validator. Applies alongside [current requirements](current-requirements.md). A developer must implement machine-readable schemas, examples, and validators before relying on this contract in the reader or skill.

## 1. Package layout and ownership

```text
<document-id>/
  manifest.json
  pages/p0001/
    text.txt
    layout.json
    entries.json
    annotations.json
    questions.json
    review.json
  pages/p0002/                   # exists only after this page is prepared/extracted
    ...
  exports/text.txt               # optional combined export of extracted pages
  exports/page-map.json          # page IDs/ranges for that export, never runtime anchors
  review/report.json
  assets/                       # optional local page renders or other derived assets
```

All JSON is UTF-8 strict JSON. Generated runtime asset paths are relative to the package. The original PDF is the explicit exception: the manifest's `source.path` is relative to the configured data root and resolves inside its allowed `pdfs/` directory. Never depend on the author's absolute Downloads path or allow path traversal/remote assets. Content is plain data; disallow script execution and unsanitized HTML.

Packages are prepared in `data/staging/<document-id>/` and published into `data/library/<document-id>/` under the [local library workflow](local-library-workflow.md). The app discovers published manifests automatically. Keep published learning content durable on disk and separate from application builds and deferred personal progress. Catalogs may be derived/rebuilt; a manually edited application document list is not part of this contract.

The original PDF is immutable and stored once at `data/pdfs/<document-id>.pdf`. A library backup/export must include the referenced PDFs as well as generated packages; a single generated package directory alone is not a complete backup. Page extraction is a versioned snapshot. Enrichment and practice reference it; they do not modify it. Runtime study does not require the generating agent. Optional authoring/debug files are not mandatory runtime dependencies.

## 2. Manifest

Required fields:

- `schemaVersion`: initially `"1.0"`; unknown major versions must be rejected with a useful message.
- `documentId`: persistent opaque identifier, not derived from the display title.
- `contentRevision`: monotonically increasing integer for each published package revision.
- `title`, `sourceLanguage` (BCP 47), `translationLanguage` (`en` for current learning content).
- `source`: `pathBase: "data-root"`, `path` (for example `pdfs/<document-id>.pdf`), `sha256`, `bytes`, and `pageCount` describing the original file.
- `files`: paths and SHA-256 checksums for every other runtime file; omit manifest's own checksum.
- `pages`: metadata for every physical page, with ordered one-based `pageNumber`, stable ID, geometry, and optional local display-asset paths. Each page records preparation state (`not-prepared`, `extracted`, `needs-review`, `ready`), separate question availability, and an immutable `extractionRevision` plus file paths/hashes when extracted. Unprepared pages have no invented extraction revision or enrichment files.
- `learningProfile`: English translation language, complete-beginner level, Mandarin, tone-mark pinyin, labeled secondary transcription system, and sparse supplementary examples. Record the configuration version used, not a hidden dependency on an agent chat.
- `createdAt`, `updatedAt` (UTC timestamps), and `provenance`: extractor/OCR tool names, versions, relevant options, and agent preparation/review metadata. Do not record credentials or hidden reasoning.

Within a page's files, relative cross-file references resolve against that page directory unless the field explicitly names a different prepared page. Manifest file paths resolve against the document package. Checksums cover all referenced runtime files; the source hash is stored separately in `source`. A ready page can have no eligible questions for a particular category: report availability rather than inventing exercises or withholding its usable reader explanations.

Readiness is page-scoped; a document with some ready pages is a valid partially prepared learning document. Do not represent extraction alone as ready learning content or demand that unrequested pages be prepared. Each page JSON file repeats `documentId`, `pageId`, and `extractionRevision`; mismatches are errors. An annotation spanning pages explicitly references each target page's revision. Unknown optional fields may be ignored within a compatible major version; migrations preserve the existing package until validated.

## 3. Plain text and offset rules

`pages/<page-id>/text.txt` is that physical page's canonical agent-friendly source transcript, with no injected headings, IDs, Markdown, translations, or coordinate labels. Offsets are local to this page, so adding or correcting another page cannot shift them.

- Encoding UTF-8 without BOM; line breaks LF (`\n`).
- Within a page, preserve observed characters and punctuation; maintain reviewed reading order. Use LF for line breaks and two LFs between blocks. Any whitespace synthesized from geometry must be identified in layout metadata.
- A page file contains no page separators. A final LF is allowed only if included in all recorded offsets. An optional combined export concatenates extracted pages in physical order with one form feed (`\f`) between them and provides `page-map.json` identifying included/omitted pages and export ranges. It is an agent convenience, never a source of persistent annotation offsets.
- Do not apply Unicode normalization, simplify/traditionalize characters, standardize punctuation, insert word spaces, or silently correct source mistakes. Store a suggested correction/normalized learning form separately.
- PDF extraction is a transcription of visible text, not an assertion that the PDF contains a unique logical string. Record uncertain ordering, OCR replacements, invisible/duplicate text, ligatures, and inferred whitespace explicitly.
- All text offsets are zero-based Unicode code-point indices into the referenced page's exact file; ranges are `[start, end)`. They are not UTF-8 byte offsets or JavaScript UTF-16 offsets. The browser must convert explicitly (for example, use code-point arrays). No implementation may silently mix conventions.
- Each range-bearing record includes `exactText`; validation requires `text[start:end] == exactText` using code-point slicing. Synthesized separators have no clickable source geometry.
- After a reviewed page extraction is frozen, enrichment must not edit its text file. A corrected extraction creates a new revision for that page and requires migration/revalidation of affected references. Other pages retain their revisions and files. Adding a previously unprepared page never forces old pages to be reprocessed.

## 4. Layout and geometry

Each page's `layout.json` contains `documentId`, `pageId`, `extractionRevision`, `textSha256`, `offsetUnit: "unicode-code-point"`, that page's layout, and its extraction issues.

Each page records:

- Stable page ID and one-based physical page number.
- Original MediaBox, CropBox, rotation, and effective page width/height.
- `transcriptRange` covering the page file in page-local code-point offsets.
- Reading-order blocks and lines, each with IDs, text ranges and geometry where available; classify roles such as heading, dialogue, label, footer, image text, or decorative text.
- Character/text-cluster records containing ID, exact text and range, line/block references, geometry, method (`embedded`, `ocr`, `manual`), review status, and optional confidence. Never invent a numerical confidence when the tool does not supply one.

Canonical overlay coordinates are normalized to `[0,1]` on the visible CropBox AFTER applying page rotation: origin top left, x rightward, y downward. A rectangle is `[x, y, width, height]`. Use polygons where non-axis-aligned text requires them. Record the transform from original extraction coordinates to this space; PDF points have 1/72-inch units before normalization. Preserve raw geometry/provenance for diagnostics. Do not confuse raster pixels, PDF points, CSS pixels, and normalized units.

For every display size, derive overlay positions from the same page viewport transform as the renderer. When using page images, record image pixel dimensions and any crop/rotation mapping. CSS offsets guessed from one screenshot are not acceptable.

Individual Hanzi require genuine character geometry from a character-capable extractor or verified OCR/manual alignment. Some glyph clusters may represent multiple code points or share a box; preserve that fact. Do not split ligatures/combining marks or Chinese line boxes by equal-width arithmetic. Log missing geometry and fix it or report a coverage exception before publication.

## 5. Linguistic entries and occurrences

`entries.json` contains reusable linguistic records with:

- `id`, `kind` (`character`, `word`, `expression`, `sentence`, `grammar`).
- `form`, source language, and optional normalized learning form distinct from source text.
- Separate pronunciation records for tone-mark pinyin (`system: "pinyin"`) and phonetic transcription (default `system: "ipa"`), each with written form, Mandarin language/variety, review status, and concise guidance where useful. A missing reviewed transcription is reported rather than invented. Keep the Chinese speech target and contextual pronunciation notes distinct from these written fields.
- English meanings with contextual sense identifiers; concise beginner explanations; optional part of speech, notes, grammar, and sparse examples. Label examples as `source` with source references or `supplemental` with agent provenance. Prefer source examples; default to zero or one supplemental example per item.
- Explicit relationships to character/component entries, constituent words, related entries, or grammar entries. Do not infer components by dividing a rendered text box.
- Authorship/provenance and review status (`draft`, `reviewed`, `needs-review`).

`annotations.json` contains occurrence-specific records with:

- `id`, `entryId`, `kind`, optional `sectionId`, and context/source sentence references.
- Ordered `anchors`, each with `pageId`, that page's `extractionRevision`, page-local `start`, `end`, `exactText`, and `characterIds`. Each anchor must be on one page; multiline or cross-page units use multiple anchors. Do not link an unprepared page as if its anchors existed; defer cross-page enrichment or prepare those pages only when requested.
- Optional reviewed region geometry for image/OCR text, using the same coordinate system and mapped transcript text. References to visible text must not exist only as an untranscribed image region.
- Optional contextual sense/pronunciation selection, parent/child occurrence links, and coverage/review status.

Repeated text must have separate occurrences even if it reuses one entry. A source reference is not a global string search. Resolve hotspot geometry as a list/union of source character regions per line, not one large rectangle spanning unrelated text, illustrations, or line gaps.

Source and entry forms can differ only through an explicit mapping (for example, a source containing visual spaces). Validation checks the source quote against the transcript, and separately checks that the mapped learning form is explained; it must not rewrite the source to force a match.

Entries/occurrences/questions are owned by a page and have document-unique stable IDs. Reuse another prepared page's entry by explicit ID/reference where appropriate, but do not rewrite that entry when adding a new page. Preserve contextual senses and track dependencies. Do not add a complex global dictionary as an initial prerequisite.

Correction references combine `documentId`, `pageId`, item kind/ID, and the observed `contentRevision`, for example `hsk1:p0001:annotation:a001@r2`. Repository lookup returns the exact record, its current revision, owning file, and source context. If the record was repaired since the copied revision, resolve its stable identity and report the newer revision; never redirect to a different identical-looking word. Preserve IDs during repairs. Any unavoidable retired ID has an explicit alias/tombstone rather than silent reassignment.

## 6. Agent-authored questions

Each page's `questions.json` contains `documentId`, `pageId`, `extractionRevision`, and `questions`. Initial supported type: `single-choice`.

Each question requires:

- Stable `id`, `type`, `category`, `prompt`, `promptLanguage`. Categories: `character-identification`, `zh-to-en`, `en-to-zh`, `sentence-comprehension`, `missing-word`, `grammar-comprehension`, `listening-comprehension`.
- Two or more `options`, each with unique stable `id` and nonempty plain-text `text`.
- `correctOptionId` referencing exactly one option; never store correctness as a shuffled index.
- Nonempty `explanation` and its language.
- Nonempty `sourceAnnotationIds`; optional `entryIds` and section references for selection/filtering.
- `requiresAudio` boolean, and a local-speech target when true.
- `origin` (`agent-authored` or `template-generated`), template ID where applicable, provenance, and review status.

Illustrative record shape (IDs are placeholders, not extracted source data):

```json
{
  "id": "q-001",
  "type": "single-choice",
  "category": "zh-to-en",
  "prompt": "Choose the meaning of 你好 in this dialogue.",
  "promptLanguage": "en",
  "options": [
    { "id": "greeting", "text": "Hello" },
    { "id": "thanks", "text": "Thank you" },
    { "id": "farewell", "text": "Goodbye" }
  ],
  "correctOptionId": "greeting",
  "explanation": "Here, 你好 is used as a greeting.",
  "explanationLanguage": "en",
  "sourceAnnotationIds": ["occurrence-greeting-001"],
  "entryIds": ["entry-greeting"],
  "requiresAudio": false,
  "origin": "agent-authored",
  "reviewStatus": "draft"
}
```

Use English instructions/feedback and Chinese where it is the learning target. Runtime practice uses reviewed questions only. Shuffle options by ID without changing correctness. Structural validation cannot prove linguistic correctness: review must check ambiguity, synonyms, factual grounding, distractor plausibility, and explanations. Character-identification tasks must genuinely distinguish written forms; do not accidentally reveal the answer through attached translations/pinyin. Listening questions require working local speech. Missing-word tasks remain multiple-choice, with one contextually defensible completion. Category availability depends on prepared content; do not invent a grammar question merely to fill a quota.

Question eligibility for selected material: all its `sourceAnnotationIds` must be in the selected occurrence set or its explicitly selected container scope. A question must not silently introduce an unselected passage. If an occurrence has no eligible question/template, explain the insufficient coverage. Never send the selection to an external service to fill the gap.

## 7. Validation and review report

Each page's `review.json` records source/page extraction hashes, tool versions, checks, issues, coverage, and agent review results. `review/report.json` summarizes prepared/unprepared pages and question categories without forcing old content to be regenerated. Keep machine validation and linguistic review distinct; routine user sign-off is not required.

Required checks:

- Valid schema/version; safe local paths; assets present; checksums match; document and extraction revisions agree.
- Unique IDs in each namespace, valid cross-file references, valid page order and geometry, and acyclic containment/constituent relationships.
- Every transcript range in bounds, exact quote matches, page/line/character containment consistent, no unexplained dropped/duplicated text or source text changes.
- Finite in-bounds nonzero geometry where a hotspot is required; explicitly identify unlocated/uncertain text.
- Every page prepared in this run visually reviewed against rendered source, including illustration text; extraction gaps and OCR uncertainty listed with page/region. Reuse valid evidence for unchanged previously prepared pages.
- Annotation coverage separated from extraction coverage: counts and unresolved items by page, role, and linguistic unit. No invented percentage without a defined denominator.
- Questions have distinct nonempty choices, one valid answer ID, available source references, usable explanations, and reviewed content. Duplicate normalized choices and obvious equivalent-answer collisions are flagged.

Use issue severities `error`, `warning`, and `info` with record IDs, page/region, reason, and next action. Structural errors block the affected staged publication. Uncertain transcriptions/meanings/questions are retained as `needs-review` records and excluded from ready details/practice; usable reviewed items/pages may be published with explicit partial coverage. If uncertainty cannot be isolated safely, keep that page out of ready state. Optional missing grammar/examples are permissible. Report exceptions concisely without a routine approval questionnaire. Retain the last validated package if a new build fails.

## 8. Incremental preparation and correction invariants

- Default page selection is explicit: `--pages "1,3-4"` means physical pages 1, 3, and 4. Full processing requires an explicit `--all-pages`. A missing selection is an actionable error, not a silent whole-PDF run.
- Resolve the existing document using source hash and stable ID. Validate requested page numbers against `source.pageCount` before work.
- Seed a staged revision from the current published package and add only missing requested pages. Unselected prepared page files, extraction revisions, annotations, questions, and IDs remain byte-identical. Package manifest, aggregate reports/exports, and content revision may change.
- Repeated preparation of ready pages is a no-op with a skipped-page summary. A repair/reprepare instruction supplies an explicit target, preserves accepted edits elsewhere, and records affected dependencies. Staged work may resume without repeating completed extraction.
- Failures on new pages must not erase ready pages. Per-page states distinguish unrequested/not-prepared content from preparation failures and reviewed partial coverage. The library can publish a coherent revision containing old ready pages plus new usable pages.
- A source hash change is a changed PDF, not a missing-page addition. Create a new source version/document or perform an explicit migration; never silently attach old coordinates to different PDF bytes.
- Concurrent publication must detect a stale base revision and merge/revalidate safely or stop with a clear conflict; never overwrite another accepted addition/correction.
