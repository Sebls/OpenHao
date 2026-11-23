# Interactive Language Learning Reader

Status: React implementation and repository preparation skill added on 2026-11-22. Start with [installation and usage](implementation.md), [verification and limitations](verification.md), and the [executable preparation skill](../../skills/prepare-material/SKILL.md). The documents below retain the original handoff/design requirements; historical statements about work not having started refer to that earlier snapshot.

The new system connects **Reading → Understanding → Pronunciation → Practice** around the original learning document.

The initial learner starts Chinese from zero and studies with concise English explanations. The local library preserves original PDF pages and adds clickable learning units, Mandarin tone-mark pinyin, separate phonetic transcription, available offline speech, and multiple-choice practice. The agent prepares only requested physical pages and adds later pages without regenerating earlier work. Lesson 1 is the agreed first reference. Prefer reviewing content and interface changes in the agent browser, such as the Codex browser.

## Read in this order

1. [Original requirements](requirements.md): the original functional specification, preserved verbatim as the historical baseline.
2. [Current requirements](current-requirements.md): later user decisions, first-PDF inspection, scope overrides, offline/private behavior, and remaining decisions. Takes precedence over conflicting original requirements.
3. [Local library workflow](local-library-workflow.md): npm setup/start, agent administration commands, durable local material, and automatic discovery. Read this for the intended everyday experience.
4. [Content contract](content-contract.md): proposed package files, plain-text/coordinate mapping, source anchors, linguistic entries, agent question format, and validation rules.
5. [Agent workflow](agent-workflow.md): specification for a future reusable ingestion/enrichment skill, stages, inputs, review, and safe reruns. This is not an executable skill yet.
6. [Delivery plan](delivery-plan.md): proposed developer increments, acceptance matrix, and handoff evidence.
7. [Agent guidelines](agent-guidelines.md): implementation discipline, subject to current scope decisions.
8. [Design guidelines](design-guidelines.md): source-linked Apple HIG synthesis and project design checklist. Reviewed on 2026-11-19; apply current scope overrides.
9. [System design](system-design.md): architecture, reader layouts, and component behavior. The [current visual design and reference roles](design-references/README.md) define the implemented typography, palette, spacing, and screen treatments.

## Starting point

The previous project's code, data, generated files, assets, source PDFs, and earlier platform plans were removed on 2026-11-19. Only the new system's documentation and agent instructions remain; Git history is preserved.

The first PDF is selected and was inspected read-only at its external Downloads path; its identity and findings are recorded in the current requirements. It has not been copied into the repository. Faithful source pages with interactive overlays are required. The PDF-rendering implementation and framework remain to be selected. Delivery is a local npm-launched application serving a durable disk library to the computer's browser.

Content is prepared by an AI agent running a future reusable skill, then consumed by the browser without LLM calls or internet access. Browser-generated speech must use a working local voice. Personal progress persistence is deferred; in-memory continuity is required.

Prepared study materials and agent explanations persist across restarts. The app discovers newly published content automatically; adding a PDF does not require application code changes or a rebuild. The user studies in the browser while the agent manages content through repository tools.

Store original PDFs in one directory and generated material by document/page. Agent-readable defaults avoid repeated setup questions; stable item references support targeted corrections. The current requirements are the consolidated product description and the authority for superseded whole-document coverage and open-profile statements.

The user's 2026-11-22 implementation request authorizes the React reader, local library, preparation tools and Lesson 1. Preserve the original requirements and unrelated workspace changes. Runtime publication refines the proposed package path using immutable revision directories and an atomic current pointer, as documented in the implementation guide.
