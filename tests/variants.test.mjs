import test from "node:test";
import assert from "node:assert/strict";
import Ajv from "ajv";
import fs from "node:fs";
import {
  documentGroups,
  preferredVariant,
  loadLanguage,
  saveLanguage,
} from "../src/client/features/library/variants.ts";

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const base = read("schemas/package.schema.json");
const en = {
  schemaVersion: "1.0",
  documentId: "pilot",
  contentRevision: 1,
  variantGroup: "pilot",
  title: "Pilot",
  sourceLanguage: "zh-CN",
  translationLanguage: "en",
  source: {
    pathBase: "data-root",
    path: "pdfs/pilot.pdf",
    sha256: "a".repeat(64),
    bytes: 1,
    pageCount: 27,
  },
  pages: [
    {
      id: "p0012",
      pageNumber: 12,
      width: 100,
      height: 100,
      state: "ready",
      questionAvailability: [],
    },
  ],
  files: {},
  learningProfile: {},
  provenance: {},
  createdAt: "2026-11-27",
  updatedAt: "2026-11-27",
};
const fr = { ...en, documentId: "pilot-fr", translationLanguage: "fr" };
const legacy = { ...en, documentId: "legacy", variantGroup: undefined };

test("variant groups leave legacy documents separate and fall back to English", () => {
  const groups = documentGroups([fr, legacy, en]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], [fr, en]);
  assert.equal(preferredVariant(groups[0], "en"), en);
  assert.equal(preferredVariant(groups[0], "fr"), fr);
  assert.equal(preferredVariant(groups[1], "fr"), legacy);
  const legacy2 = { ...legacy, documentId: "pilot" };
  assert.equal(documentGroups([en, legacy2]).length, 2);
});

test("v1 schema accepts both languages and optional groups, rejecting unsupported values", () => {
  const validate = new Ajv({ strict: false }).compile(base);
  for (const m of [en, fr, legacy])
    assert.equal(validate(m), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...en, translationLanguage: "es" }), false);
  assert.equal(validate({ ...en, variantGroup: "" }), false);
});

test("language preference survives reads and gracefully handles blocked storage", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map();
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k) => storage.get(k),
        setItem: (k, v) => storage.set(k, v),
      },
    });
    assert.equal(loadLanguage(), "en");
    saveLanguage("fr");
    assert.equal(loadLanguage(), "fr");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw Error("Blocked");
      },
    });
    assert.equal(loadLanguage(), "en");
    assert.doesNotThrow(() => saveLanguage("fr"));
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});
