import test from "node:test";
import assert from "node:assert/strict";
import { toneSyllables } from "../src/client/features/learning-details/tones.ts";

const entry = (form, value, reviewStatus = "reviewed") => ({
  form,
  pronunciations: [{ system: "pinyin", value, reviewStatus }],
});
const tones = (form, value) =>
  toneSyllables(entry(form, value)).map((s) => s.tone);

test("reads marked pinyin, joined words, neutral syllables and decomposed Unicode", () => {
  assert.deepEqual(tones("妈麻马骂吗", "mā má mǎ mà ma"), [1, 2, 3, 4, 0]);
  assert.deepEqual(tones("同学们", "tóngxuémen"), [2, 2, 0]);
  assert.deepEqual(tones("女绿", "nǚ lǜ".normalize("NFD")), [3, 4]);
  assert.deepEqual(tones("西安", "Xī’ān"), [1, 1]);
  assert.deepEqual(tones("你好", "nǐ hǎo"), [3, 3]);
});

test("keeps phrase boundaries and repeated character occurrences in order", () => {
  const result = toneSyllables(entry("你好，你好吗？", "Nǐ hǎo, nǐ hǎo ma?"));
  assert.deepEqual(
    result.map((s) => s.character),
    ["你", "好", "你", "好", "吗"],
  );
  assert.deepEqual(
    result.map((s) => s.segmentStart),
    [false, false, true, false, false],
  );
  assert.deepEqual(
    toneSyllables(entry("你好，你好吗？", "nǐ hǎo nǐ hǎo ma")).map(
      (s) => s.segmentStart,
    ),
    [false, false, true, false, false],
  );
});

test("omits unreviewed, missing, unsupported or ambiguous readings instead of guessing", () => {
  assert.deepEqual(toneSyllables(entry("你", "nǐ", "draft")), []);
  assert.deepEqual(toneSyllables({ form: "你", pronunciations: [] }), []);
  assert.deepEqual(tones("你好", "nǐ"), []);
  assert.deepEqual(tones("你", "ni3"), []);
  assert.deepEqual(tones("你好", "hello"), []);
  assert.deepEqual(tones("你A", "nǐ ai"), []);
  // Two possible two-syllable readings: fang + an / fan + gan.
  assert.deepEqual(tones("方案", "fangan"), []);
  assert.deepEqual(tones("方案", "fāng'àn"), [1, 4]);
});

test("sentence guides exclude speaker labels and literal Latin names without changing Han alignment", () => {
  const sentence = {
    ...entry("B：王老师,你好!", "Wáng lǎoshī, nǐ hǎo!"),
    speechTarget: "王老师,你好!",
  };
  assert.deepEqual(
    toneSyllables(sentence).map((s) => s.character),
    ["王", "老", "师", "你", "好"],
  );
  assert.deepEqual(tones("A：谢谢！", "Xièxie!"), [4, 0]);
  assert.deepEqual(
    tones("A：AI小语,你好!", "AI Xiǎoyǔ, nǐ hǎo!"),
    [3, 3, 3, 3],
  );
  assert.deepEqual(tones("我叫Marie。", "Wǒ jiào Marie."), [3, 4]);
  assert.deepEqual(tones("我叫Marie。", "Wǒ jiào Mǎlì."), []);
});
