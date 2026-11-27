# Platform localization

English and French share the same React components. The locale prefix in the URL selects both the platform language and available document variants: `/en/`, `/fr/`, `/en/doc/...`, or `/fr/doc/...`. `VITE_BASE_PATH` remains supported, for example `/chinois/fr/`. Unprefixed legacy links default to English and are normalized to prefixed URLs. Reload and browser Back/Forward restore the locale from the URL, independently of the old saved explanation-language preference.

The two EN/FR header buttons are always available. When the current document has a counterpart with the same `variantGroup`, switching keeps the route's physical page and annotation. Practice loads the counterpart's question bank in setup; a writing route starts the counterpart's writing exercise. When no counterpart exists, switching opens the destination library. Libraries and direct document loads require an exact `translationLanguage` match. This is availability filtering, not an access-control or security boundary; the local catalog and underlying assets still contain both languages.

## Editing interface messages

- `src/client/i18n/en.ts` contains the English source catalog. English messages are the typed translation keys, following a source-message/gettext convention. Keep complete messages together rather than assembling translated sentence fragments.
- `src/client/i18n/fr.ts` contains the French equivalents. `satisfies Record<MessageKey, string>` catches missing or extra keys during type checking.
- Components call `const { t, language } = useI18n()` and render `t("Your library")`. `language` is only necessary for language-aware data selection or formatting.
- Use named placeholders for dynamic values: `t("{count} documents", { count })`. Values are substituted literally and rendered as React text; they are never HTML or recursively interpreted. Use separate singular/plural messages where necessary, keeping word order inside each catalog entry.
- Helpers outside React use `translator(language)`. Locale detection lives in `i18n/locale.ts`; React state and the stable translator live in `I18n.tsx`. Both catalogs are bundled locally with no runtime network translation or additional dependency.
- Include tooltip, accessibility, loading, empty, error, speech, and writing-status text when adding a control. Language autonyms (English/Français), proper names, and pinyin notation retain their normal spelling.

Library text, reviewed meanings, prompts, answer options, explanations, transcription, coverage notes, and character-history records retain their authored content. Their translation is a separate content-preparation task. `documentTitle.ts` only localizes the existing presentation-name overrides; unknown titles fall back to the manifest's authored title. Never edit published revisions to translate platform labels.

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. The localization tests check catalog parity and placeholders, literal interpolation, all localized route types with a deployment prefix, and strict document filtering. Review both languages in the agent browser, including a paired variant, an unavailable counterpart, direct links, browser history/reload, and narrow navigation.
