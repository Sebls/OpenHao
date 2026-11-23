import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { demonstrateRemainingStrokes } from "../src/client/features/writing/hanzi.ts";
import {
  writingCharacters,
  createWritingSession,
  updateWritingCharacter,
} from "../src/client/features/writing/model.ts";

test("writing targets preserve repeated Han characters and exclude punctuation, Latin and spaces", () => {
  assert.deepEqual(writingCharacters("你好！谢谢你。 AI 123"), [
    "你",
    "好",
    "谢",
    "谢",
    "你",
  ]);
  assert.deepEqual(writingCharacters("一𠀀，A"), ["一", "𠀀"]);
  assert.deepEqual(writingCharacters("!? abc"), []);
  assert.deepEqual(writingCharacters(undefined), []);
});

test("writing sessions keep the exact source occurrence and independent in-memory state", () => {
  const entry = { form: "谢谢！", meaning: "Thank you" },
    annotation = { id: "repeat-2" };
  const first = createWritingSession(entry, annotation, "p0001");
  const second = createWritingSession(entry, annotation, "p0001");
  assert.deepEqual(first.sourceAnnotationIds, ["repeat-2"]);
  assert.equal(first.pageId, "p0001");
  assert.equal(first.form, "谢谢！");
  assert.deepEqual(first.characters, ["谢", "谢"]);
  assert.notEqual(first.id, second.id);
  const updated = updateWritingCharacter(first, 1, () => ({
    stroke: 2,
    mistakes: 1,
    completed: true,
  }));
  assert.equal(updated.progress[0].stroke, 0);
  assert.equal(updated.progress[0].completed, false);
  assert.equal(updated.progress[1].stroke, 2);
  assert.equal(updated.progress[1].completed, true);
  assert.equal(first.progress[1].stroke, 0);
  assert.equal(second.progress[1].stroke, 0);
  const restarted = updateWritingCharacter(updated, 0, (old) => ({
    stroke: 0,
    attempt: old.attempt + 1,
  }));
  assert.equal(restarted.progress[1].completed, true);
  assert.equal(restarted.progress[1].mistakes, 1);
});

test("locally installed stroke data covers all reviewed published learning targets", () => {
  const require = createRequire(import.meta.url);
  const root = path.dirname(require.resolve("hanzi-writer-data/package.json"));
  const library = path.resolve("data/library");
  if (!fs.existsSync(library)) return;
  const characters = new Set();
  for (const id of fs.readdirSync(library)) {
    const current = path.join(library, id, "current.json");
    if (!fs.existsSync(current)) continue;
    const pointer = JSON.parse(fs.readFileSync(current, "utf8"));
    const revision = path.join(
      library,
      id,
      "revisions",
      String(pointer.revision),
    );
    const manifest = JSON.parse(
      fs.readFileSync(path.join(revision, "manifest.json"), "utf8"),
    );
    for (const page of manifest.pages.filter((p) => p.state === "ready")) {
      const { entries } = JSON.parse(
        fs.readFileSync(
          path.join(revision, "pages", page.id, "entries.json"),
          "utf8",
        ),
      );
      for (const entry of entries.filter((e) => e.reviewStatus === "reviewed"))
        for (const character of writingCharacters(entry.form))
          characters.add(character);
    }
  }
  for (const character of characters) {
    const data = JSON.parse(
      fs.readFileSync(path.join(root, `${character}.json`), "utf8"),
    );
    assert.ok(data.strokes.length > 0, character);
    assert.equal(data.strokes.length, data.medians.length, character);
  }
});

test("examples animate only remaining strokes and restore the original quiz without awarding strokes", async () => {
  const calls = [];
  const writer = {
    cancelQuiz: () => calls.push("cancel"),
    animateStroke: async (index) => {
      calls.push(index);
      return { canceled: false };
    },
  };
  await demonstrateRemainingStrokes(
    writer,
    2,
    5,
    async () => calls.push("restore at 2"),
    () => true,
  );
  assert.deepEqual(calls, ["cancel", 2, 3, 4, "restore at 2"]);
  calls.length = 0;
  writer.animateStroke = async () => {
    throw Error("interrupted");
  };
  await assert.rejects(
    demonstrateRemainingStrokes(
      writer,
      2,
      5,
      async () => calls.push("restore at 2"),
      () => true,
    ),
  );
  assert.deepEqual(calls, ["cancel", "restore at 2"]);
  calls.length = 0;
  await demonstrateRemainingStrokes(
    writer,
    2,
    5,
    async () => calls.push("restore"),
    () => false,
  );
  assert.deepEqual(calls, ["cancel"]);
});

test("practice pinyin comes from reviewed linked entries without splitting words or guessing ambiguous readings", () => {
  const reading = (value) => [
    { system: "pinyin", value, reviewStatus: "reviewed" },
  ];
  const entries = [
    {
      id: "same",
      kind: "character",
      form: "同",
      pronunciations: reading("tóng"),
    },
    {
      id: "study",
      kind: "character",
      form: "学",
      pronunciations: reading("xué"),
    },
    {
      id: "draft",
      kind: "character",
      form: "们",
      pronunciations: [
        { system: "pinyin", value: "men", reviewStatus: "draft" },
      ],
    },
  ];
  const entry = {
    kind: "word",
    form: "同学们",
    pronunciations: reading("tóngxuémen"),
    constituentIds: ["same", "study", "draft"],
  };
  const session = createWritingSession(entry, { id: "a" }, "p0001", entries);
  assert.equal(session.pinyin, "tóngxuémen");
  assert.deepEqual(session.characterPinyin, ["tóng", "xué", null]);
  const ambiguous = {
    ...entries[0],
    id: "other",
    pronunciations: reading("tòng"),
  };
  assert.equal(
    createWritingSession(
      { ...entry, constituentIds: [...entry.constituentIds, "other"] },
      { id: "a" },
      "p0001",
      [...entries, ambiguous],
    ).characterPinyin[0],
    null,
  );
});
