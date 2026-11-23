# Character history assets

The starter collection contains 28 histories, with seven simplified/traditional pairs sharing their historical forms. It covers 21 of the 22 distinct characters in the currently prepared Lesson 1. There is no entry for 们 (們) in this collection.

Each directory is named for the first character's Unicode code point in lowercase hexadecimal. Its `entry.json` lists the supported modern characters and the historical forms in display order. An optional `meaning.svg` is an original illustration with an English caption in the entry.

Each entry also has an `origin` object: a concise English `text`, a list of `sources` with a display `label` and `url`, and a `reviewedAt` date. The notes were authored and checked against the linked CUHK character database, Han Dian, and other cited references on 2026-11-23. They distinguish pictures, sound components, later characters, and disputed interpretations. They explain representative forms rather than asserting that every example is a direct ancestor of the next one. Traditional and simplified forms share the same note. Notes are bundled locally for offline study; opening an optional source link requires internet access.

The reader presents “Character evolution” followed by icon-only row/grid controls matching the stroke progression header. The explanation and source links appear beneath the forms in either layout. To extend this collection, review the origin note and its sources as well as the glyph provenance; do not invent an ancient picture for a later phonetic compound.

The historical SVGs are byte-for-byte copies from [hanzi-glyphs-svg at revision 46d80fd](https://github.com/zhouyongh/hanzi-glyphs-svg/tree/46d80fdc33f596a8c010965852ce28256a761f0a). Each form records the upstream path, unified glyph ID, revision, SHA-256 checksum, CC0 license, and source citation. Verify the exact glyph against the upstream provenance JSONL and active glyph ID ledger before adding it. Oracle bone files can carry different licenses within the same directory.

The English period label translates the upstream index's period field when present. The Chinese field is retained as `sourcePeriod`. The collection uses representative examples from each script and leaves undocumented periods blank. The modern form is rendered as the selected character in the reader.

See the [CC0 1.0 text](CC0-1.0.txt) and [upstream licensing scope](https://github.com/zhouyongh/hanzi-glyphs-svg/blob/46d80fdc33f596a8c010965852ce28256a761f0a/LICENSE).
