import test from "node:test";
import assert from "node:assert/strict";
import { localizedDocumentGroups } from "../src/client/features/library/variants.ts";

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
