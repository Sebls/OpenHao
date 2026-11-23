# Chinese study library

A local React reader for learning Chinese from original PDF pages. Select words for concise English explanations, Mandarin pinyin, separately labeled IPA and available local pronunciation; practise reviewed multiple-choice questions.

## Start

Requires Node.js 22.13+ or 24+.

```sh
npm install
npm start
```

Open **http://localhost:4173**. Future launches only need `npm start`. Studying works from local files without an AI session or runtime internet services.

Lesson 1 of New HSK 1 is prepared on this computer. The unchanged five-page original remains readable; pages 2–5 are marked unprepared. Prepared material is private, stored in ignored `data/`, and should be included in backups.

## Add material or correct an item

Ask the agent to prepare a PDF and specific physical pages, or give it a copied item reference. It follows [the preparation skill](skills/prepare-material/SKILL.md), preserves accepted pages, validates content and publishes locally. The library discovers changes automatically.

- [Installation, study, preparation and backup guide](docs/interactive-reader/implementation.md)
- [Verification and known limitations](docs/interactive-reader/verification.md)
- [Current visual design and reference roles](docs/interactive-reader/design-references/README.md)
- [Requirements and design documents](docs/interactive-reader/README.md)
- [Agent instructions](AGENTS.md)

Preparation tools additionally need Python 3: `npm run setup:extractor`. Run `npm test` for content/publication/server checks and `npm run build` after app changes.

Prefer the agent browser, such as the Codex browser, when reviewing content or interface changes.

## Code formatting

Run `npm run format` to format supported project files, including JSON, or `npm run format:json` for JSON only. Run `npm run format:check` to check formatting without changing files. Generated files and the private `data/` library are excluded; published lesson revisions must remain unchanged.
