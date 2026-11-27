import { en, type MessageKey } from "./en.ts";
import { fr } from "./fr.ts";

export type Locale = "en" | "fr";
export const locales = ["en", "fr"] as const;
export type MessageValues = Record<string, string | number | null | undefined>;

/** Literal replacement keeps document text and interpolation values out of the catalog. */
export function translator(locale: Locale) {
  const messages = locale === "fr" ? fr : en;
  return (key: MessageKey, values: MessageValues = {}): string =>
    messages[key].replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.hasOwn(values, name) ? String(values[name] ?? "") : match,
    );
}
