import test from "node:test";
import assert from "node:assert/strict";
import { toneIpa } from "../src/client/features/learning-details/toneIpa.ts";
import { toneSyllables } from "../src/client/features/learning-details/tones.ts";
const reading = (id, form, pinyin, ipa, constituentIds = []) => ({
  id,
  form,
  constituentIds,
  pronunciations: [
    { system: "pinyin", value: pinyin, reviewStatus: "reviewed" },
    ...(ipa ? [{ system: "ipa", value: ipa, reviewStatus: "reviewed" }] : []),
  ],
});
const ipa = (entry, entries = []) =>
  toneIpa(entry, entries, toneSyllables(entry));

test("sentence IPA comes from linked contextual words, preserving neutral tones", () => {
  const word = reading("word", "不客气", "bú kèqi", "[pu³⁵ kʰɤ⁵¹ tɕʰi]");
  const sentence = reading("sentence", "B：不客气！", "Bú kèqi!", null, [
    word.id,
  ]);
  assert.deepEqual(ipa(sentence, [word]), ["[pu³⁵]", "[kʰɤ⁵¹]", "[tɕʰi]"]);
  const isolated = reading("isolated", "不", "bù", "[pu⁵¹]");
  assert.deepEqual(
    ipa({ ...sentence, constituentIds: [isolated.id] }, [isolated]),
    [null, null, null],
  );
  assert.deepEqual(ipa({ ...sentence, constituentIds: [] }, [word]), [
    null,
    null,
    null,
  ]);
});

test("IPA requires reviewed, aligned syllables and leaves missing transcriptions empty", () => {
  const word = reading("word", "谢谢", "xièxie", "[ɕjɛ⁵¹ ɕjɛ]");
  assert.deepEqual(ipa(word), ["[ɕjɛ⁵¹]", "[ɕjɛ]"]);
  assert.deepEqual(ipa(reading("bad", "谢谢", "xièxie", "[ɕjɛ]")), [
    null,
    null,
  ]);
  word.pronunciations[1].reviewStatus = "draft";
  assert.deepEqual(ipa(word), [null, null]);
});

test("conflicting linked IPA is omitted, while the selected entry takes precedence", () => {
  const one = reading("one", "好", "hǎo", "[xau²¹⁴]");
  const two = reading("two", "好", "hǎo", "[xɑʊ²¹⁴]");
  const selected = reading("selected", "好", "hǎo", null, ["one", "two"]);
  assert.deepEqual(ipa(selected, [one, two]), [null]);
  selected.pronunciations.push({
    system: "ipa",
    value: "[xau²¹⁴]",
    reviewStatus: "reviewed",
  });
  assert.deepEqual(ipa(selected, [one, two]), ["[xau²¹⁴]"]);
});
