import type { Manifest } from "../../../contracts/content.ts";

export type TranslationLanguage = Manifest["translationLanguage"];
const PREFERENCE_KEY = "reader.translation-language";

/** Ungrouped v1 documents retain their own library card. */
export function documentGroups(documents: Manifest[]): Manifest[][] {
  const groups = new Map<string, Manifest[]>();
  for (const manifest of documents) {
    const key = manifest.variantGroup
      ? `group:${manifest.variantGroup}`
      : `document:${manifest.documentId}`;
    const group = groups.get(key) ?? [];
    group.push(manifest);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function preferredVariant(
  variants: Manifest[],
  language: TranslationLanguage,
): Manifest {
  return (
    variants.find((m) => m.translationLanguage === language) ??
    variants.find((m) => m.translationLanguage === "en") ??
    variants[0]
  );
}

export function loadLanguage(): TranslationLanguage {
  try {
    return localStorage.getItem(PREFERENCE_KEY) === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

export function saveLanguage(language: TranslationLanguage) {
  try {
    localStorage.setItem(PREFERENCE_KEY, language);
  } catch {
    // The in-memory preference still works when browser storage is unavailable.
  }
}

/** A site language never falls back to documents in another language. */
export function localizedDocumentGroups(
  documents: Manifest[],
  language: TranslationLanguage,
): Manifest[][] {
  return documentGroups(
    documents.filter((manifest) => manifest.translationLanguage === language),
  );
}
