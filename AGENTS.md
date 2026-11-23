# Agent instructions

## Interactive Language Learning Reader

For work on the new interactive reader, read these documents before planning or implementation:

1. [Documentation index](docs/interactive-reader/README.md).
2. [Functional specification and requirements](docs/interactive-reader/requirements.md).
3. [Current requirements and scope overrides](docs/interactive-reader/current-requirements.md).
4. [Local library and agent administration](docs/interactive-reader/local-library-workflow.md).
5. [Content package contract](docs/interactive-reader/content-contract.md).
6. [Agent skill workflow specification](docs/interactive-reader/agent-workflow.md).
7. [Developer delivery and acceptance plan](docs/interactive-reader/delivery-plan.md).
8. [Implementation guidelines](docs/interactive-reader/agent-guidelines.md).
9. [Design guidelines based on Apple HIG](docs/interactive-reader/design-guidelines.md).

The original reader requirements are preserved as a historical baseline. The current requirements record later user decisions and override conflicting baseline requirements, including saved personal progress. Explicit instructions from the user take precedence. Surface unresolved conflicts rather than silently combining incompatible plans.

Confirmed defaults: English explanations for Chinese level zero; Mandarin tone-mark pinyin plus separately labeled phonetic transcription; concise source-first teaching with few supplemental examples; review content and interface changes in the agent browser, preferably the Codex browser. Prepare only requested physical PDF pages, preserving earlier prepared content and stable correction IDs. Lesson 1 is the first reference. Reuse saved defaults, complete routine agent review/validation/local publication without repeated questions, and report unresolved exceptions briefly. See current requirements for the English UI and IPA implementation defaults and scope details.

This repository is a fresh, documentation-only starting point. The previous project's files and plans were removed at the user's request. Do not restore or depend on them from Git history unless explicitly requested.

Documentation and cleanup requests do not authorize application implementation. Begin building only when the user requests it.

## Implemented reader and preparation tools

The React implementation is now authorized and present. Start the library with `npm install` and `npm start`. For preparation or copied-reference corrections, follow [the executable preparation skill](skills/prepare-material/SKILL.md) and [implementation/usage guide](docs/interactive-reader/implementation.md). Published content lives in `data/library/<id>/revisions/<revision>` with an atomic `current.json` pointer. Do not edit published revisions directly.

## Visual design and browser review

Follow the [current visual design and reference roles](docs/interactive-reader/design-references/README.md): reference 2 supplies minimal structure and spacing; reference 1 supplies fonts, colors and finishing details. The original JSON files live alongside that guide. Always prefer reviewing content and interface changes in the agent browser, such as the Codex browser. Record review limitations without requiring a separate installed-browser review.

## TypeScript architecture

See [module ownership and development](docs/interactive-reader/typescript-architecture.md). Application source lives in `src/client`, `src/server`, and `src/content`; shared contracts live in `src/contracts`. Keep platform dependencies within their runtime, use typed session actions, and preserve version 1 library compatibility. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` after a code refactor, plus agent-browser review of affected flows. Use `npm run dev` for the complete local development app with hot reload.
