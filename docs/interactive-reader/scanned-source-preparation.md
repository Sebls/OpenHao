# Preparing scanned and handwritten source pages

Read this reference when the preparation skill encounters scanned pages, two-page spreads, mixed French/Chinese text, missing handwritten glyphs, or local OCR failures. Run commands from the repository root. These procedures apply to requested pages only; they do not authorize changes to accepted extraction snapshots or application code.

## Identify the source and page geometry

Inspect the source hash and page count before choosing an existing document ID. Similar lesson titles can refer to different PDFs. The content extractor matches published sources by hash when `--input` is supplied; a guessed existing ID without that input can select the wrong source and produce “Pages outside source range.”

A physical PDF page may contain two printed book pages. For the scanned Leçon 00 source, physical page 10 contains printed pages 18–19; physical page 27 is a cropped single book page. Scope, correction references and anchors always use physical PDF pages. Use each page's actual visible CropBox, rotation and render dimensions; do not assume all pages have the same width or split a cropped single page again.

## Choose and check local OCR

Empty embedded text on a visibly printed page is an extraction gap. Inspect the scan before authoring. OCR engines may recover different parts of the same page; a nonempty transcript or successful exit code does not establish coverage.

Tesseract is the default engine. Verify the installed binary and language data rather than relying on historical environment notes:

```sh
tesseract --version
tesseract --list-langs
CHINOIS_OCR_LANG=chi_sim+fra+eng node --import tsx src/content/cli.ts extract --input "/absolute/source.pdf" --id ID --pages "10,12" --ocr
```

Use languages appropriate to the actual source. If language data cannot be located, set `TESSDATA_PREFIX` to a verified local directory containing those traineddata files. Do not assume `/usr/local` and `/opt/homebrew` installations use the same data or architecture.

The current `tools/extract.py` also supports local macOS Vision OCR:

```sh
CHINOIS_OCR_ENGINE=vision node --import tsx src/content/cli.ts extract --input "/absolute/source.pdf" --id ID --pages "10,12" --ocr
```

Vision requires macOS and `/usr/bin/swift`. By default it compares Chinese-first and French-first recognition, and splits sufficiently wide spreads internally. `CHINOIS_VISION_LANGS` supplies a comma-separated BCP-47 override and switches to a single recognition pass; use it only when the default languages are inappropriate. Check the current extractor before relying on these optional engine features.

Vision can fail with `Foundation._GenericObjCError error 0` in restricted execution. If execution permissions plausibly caused the failure, make one ordinary permission escalation for the same local OCR action through the execution tool. Never disable sandbox protections or infer that every Vision error is a permission error. If an approved retry still fails, try available Tesseract or isolate the affected page for manual review. If Swift cannot write its module cache, a task-specific writable `CLANG_MODULE_CACHE_PATH` can address that cache error; it is not a general fix for recognition failures.

Do not upload source material to an external OCR service. Preserve the actual engine, language configuration and manual corrections in extraction/review provenance.

## Recover an already staged empty extraction

The content CLI currently skips every staged page whose state is not `not-prepared`, including `extracted` pages. Adding `--ocr` after an embedded extraction therefore does **not** replace its empty transcript. Read the command's added/skipped result and the page files.

For a requested page that has never been published, run the low-level extractor into a fresh temporary directory, inspect it, then deliberately adopt the result into that page's staging directory. For example:

```sh
ocr_work_dir=$(mktemp -d /private/tmp/chinois-ocr.XXXXXX)
CHINOIS_OCR_ENGINE=vision .venv/bin/python tools/extract.py extract "data/pdfs/ID.pdf" 10 "$ocr_work_dir" ID 1 ocr
```

The arguments after `extract` are source, physical page, destination, document ID, extraction revision and mode. Use the actual manifest source path and page extraction revision. The extractor writes empty enrichment templates as well as extraction files: do not blindly copy those templates over authored entries, annotations, questions or review evidence. Back up any unpublished work that needs reconciliation. After adopting a changed transcript/geometry, regenerate its dependent anchors and hashes before validation. Do not reset unrelated page states or delete the whole staging package to force a retry.

This is an unpublished extraction recovery procedure. If the page already exists in a published revision, preserve its frozen text/geometry; source changes require the explicit extraction migration described by the main skill. Ordinary item repair changes explanations and dependent questions only.

## Review handwriting, grids and stroke diagrams

Use the source image as authority. Both tested engines missed handwritten character lists; Tesseract also interleaved the two halves of a spread, and Vision sometimes read partial stroke stages as full characters. Check reading order within each half, each grid row, illustration labels and faint tracing copies separately.

- Distinguish complete learning characters, components that are not standalone characters, intermediate stroke stages, and repeated grey tracing models. A recognized stroke fragment is not automatically a new vocabulary item. Do not assign invented standalone pinyin to a radical or archaic component.
- Where OCR misses a clearly legible complete glyph, manually transcribe it and locate its individual bounds on the actual source render. Mark the record `method: "manual"` and record how it was reviewed. Each character needs its own measured box: no equal-width division of line boxes or reuse of a guessed row height. Book curvature and skew can move later glyphs vertically within one row.
- Normalize measured image coordinates using that render's real width and height, then check them against the PDF viewport. Remove superseded OCR records in the same region to avoid duplicate or contradictory transcripts. Recompute code-point offsets, line/block containment, raw geometry provenance and text hashes together before freezing the extraction.
- Retain genuine OCR geometry only where it corresponds to the visible glyph. Missing non-space character boxes must remain explicit exceptions until manually resolved. Synthesized spaces are not evidence of recovered glyph geometry. Check combining marks and any OCR normalization against the source; do not apply further silent normalization.
- Classify lines by role. Keep uncertain records outside reviewed details and questions. Record concrete omitted regions and next actions; do not describe an incomplete transcript as complete because the selected learning examples are usable.

Coverage counts should distinguish source transcription, reviewed learning entries, occurrences and questions. Do not infer a coverage percentage from the number of authored records. Partial pages can be usable when the remaining uncertainty is isolated and disclosed.

## Linguistic and readiness checks

Review displayed pinyin, IPA and explanation together. A note claiming a neutral syllable must agree with its transcription. Distinguish a character's standalone reading from its word reading, such as 妈 mā versus 妈妈 māma. Match reused IPA to the same form, reading and context; omit it if the review does not support it. Check polyphonic readings such as 种 zhòng in 种田, 看 kàn in 看书, and 长 cháng when meaning long. Preserve city and personal names as names rather than literal translations.

French-only cover or instruction pages can be visually reviewed reference material without Chinese learning units. The current validator requires a reviewed learning occurrence on a `ready` page; retain such a page as `extracted`, keep entries/questions empty, and explain the reference-only status in its review. The current UI will still show “Not prepared.” Do not claim that page has interactive Chinese content or fabricate an entry to satisfy the validator.

## Final diagnostics and publication

Finish extraction corrections, linguistic review and question review before publication. Run `content:diagnose` **after** the final geometry edits; an earlier SVG becomes stale when boxes move. Inspect the diagnostic at more than one size and check app highlights for a manually placed character and a multi-character unit. Check multiline anchors only where such a source unit exists. A screenshot of the diagnostic is not a substitute for exercising reader details and source-bound practice.

Use the localhost URL printed by the running server; it may differ from the documented default port. Review in the agent browser when available. Record a concrete browser limitation if review is unavailable; do not silently claim success. If initial publication is necessary to expose the new package in the app, finish all prepublication review first, then use scoped item repair for any explanation/question corrections discovered in the browser. Never edit the published revision directly.

Record observed speech states precisely: a local voice and a `Finished` event establish completed browser playback, not independently verified disconnected audibility. Listening questions remain gated by successful local playback. Validate and publish the final staged revision, then confirm catalog discovery. Report ready physical pages separately from reference-only or blocked pages, plus remaining OCR/IPA exceptions.
