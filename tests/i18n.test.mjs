import test from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/client/i18n/en.ts";
import { fr } from "../src/client/i18n/fr.ts";
import { translator } from "../src/client/i18n/messages.ts";
import { localizedDocumentGroups } from "../src/client/features/library/variants.ts";

const placeholders = (value) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("French catalog covers every English message and preserves interpolation placeholders", () => {
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    assert.ok(fr[key].trim(), key);
    assert.deepEqual(placeholders(fr[key]), placeholders(en[key]), key);
  }
  assert.equal(translator("fr")("Your library"), "Votre bibliothèque");
  assert.equal(translator("en")("Your library"), "Your library");
  assert.equal(
    translator("fr")("{ready} of {total} pages prepared", {
      ready: 1,
      total: 3,
    }),
    "Pages préparées : 1 sur 3",
  );
  const value = "<em>$& {count}</em>";
  assert.equal(
    translator("fr")("Pages {value0}", { value0: value }),
    `Pages ${value}`,
  );
});

test("localized libraries include only exact-language variants, with no English fallback", () => {
  const englishOnly = { documentId: "english-only", translationLanguage: "en" };
  const frenchOnly = { documentId: "french-only", translationLanguage: "fr" };
  const pairEn = {
    documentId: "paired",
    variantGroup: "pair",
    translationLanguage: "en",
  };
  const pairFr = {
    documentId: "paired-fr",
    variantGroup: "pair",
    translationLanguage: "fr",
  };
  const documents = [englishOnly, pairEn, pairFr, frenchOnly];
  assert.deepEqual(localizedDocumentGroups(documents, "en"), [
    [englishOnly],
    [pairEn],
  ]);
  assert.deepEqual(localizedDocumentGroups(documents, "fr"), [
    [pairFr],
    [frenchOnly],
  ]);
  assert.deepEqual(localizedDocumentGroups([englishOnly], "fr"), []);
  assert.deepEqual(documents, [englishOnly, pairEn, pairFr, frenchOnly]);
});
