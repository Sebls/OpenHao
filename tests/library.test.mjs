import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  eligibleQuestions,
  shuffle,
  isCorrect,
  anchorRects,
} from "../app/model.js";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chinois-test-"));
process.env.CHINOIS_DATA_ROOT = path.join(temp, "data");
const { ROOT, read, write, hash, seal, validate, current, safe, catalog } =
  await import("../src/content/library/index.ts");
const command = (cmd, args = [], ok = true) => {
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/content/cli.ts", cmd, ...args],
    {
      encoding: "utf8",
      env: process.env,
    },
  );
  if (ok) assert.equal(r.status, 0, r.stderr + r.stdout);
  else assert.notEqual(r.status, 0);
  return r;
};
const pdf = path.join(temp, "fixture.pdf");
const fixture = spawnSync(
  ".venv/bin/python",
  [
    "-c",
    `import pymupdf as f
p=f.open()
for i in range(3):
 q=p.new_page(width=400,height=500)
 q.insert_text((80,100),'你好' if i<2 else '谢谢',fontname='china-s',fontsize=30)
 if i==1:q.set_rotation(90)
 if i==2:q.set_cropbox(f.Rect(20,20,380,480))
p.save(${JSON.stringify(pdf)})`,
  ],
  { encoding: "utf8" },
);
assert.equal(fixture.status, 0, fixture.stderr);
function author(id, num) {
  const dir = path.join(ROOT, "staging", id),
    m = read(path.join(dir, "manifest.json")),
    p = m.pages[num - 1],
    base = path.join(dir, "pages", p.id),
    layout = read(path.join(base, "layout.json")),
    text = fs.readFileSync(path.join(base, "text.txt"), "utf8"),
    identity = {
      documentId: id,
      pageId: p.id,
      extractionRevision: p.extractionRevision,
    };
  const e = {
    id: `${p.id}-e`,
    kind: "word",
    form: text,
    meaning: "Fixture greeting",
    pronunciations: [
      { system: "pinyin", value: "nǐ hǎo", reviewStatus: "reviewed" },
    ],
    reviewStatus: "reviewed",
  };
  const a = {
    id: `${p.id}-a`,
    entryId: e.id,
    kind: "word",
    reviewStatus: "reviewed",
    anchors: [
      {
        pageId: p.id,
        extractionRevision: p.extractionRevision,
        start: 0,
        end: Array.from(text).length,
        exactText: text,
        characterIds: layout.characters.map((c) => c.id),
      },
    ],
  };
  const q = {
    id: `${p.id}-q`,
    type: "single-choice",
    category: "zh-to-en",
    prompt: "Fixture question",
    promptLanguage: "en",
    options: [
      { id: "yes", text: "Hello" },
      { id: "no", text: "Bye" },
    ],
    correctOptionId: "yes",
    explanation: "Fixture explanation",
    explanationLanguage: "en",
    sourceAnnotationIds: [a.id],
    requiresAudio: false,
    origin: "agent-authored",
    reviewStatus: "reviewed",
  };
  write(path.join(base, "entries.json"), { ...identity, entries: [e] });
  write(path.join(base, "annotations.json"), { ...identity, annotations: [a] });
  write(path.join(base, "questions.json"), { ...identity, questions: [q] });
  write(path.join(base, "review.json"), {
    ...identity,
    textSha256: layout.textSha256,
    sourceVisualReview: true,
    linguisticReview: true,
    reviewer: "Synthetic test fixture",
    issues: [],
  });
  p.state = "ready";
  write(path.join(dir, "manifest.json"), m);
  seal(dir);
  return dir;
}
function fileHashes(dir) {
  const m = read(path.join(dir, "manifest.json"));
  return Object.fromEntries(
    Object.entries(m.files).filter(([f]) => f.startsWith("pages/p0001/")),
  );
}
test("page-selected extraction, immutable additions, source identity and stable correction workflow", () => {
  command("extract", ["--input", pdf, "--id", "fixture"], false);
  assert.equal(fs.existsSync(path.join(ROOT, "pdfs/fixture.pdf")), false);
  command("extract", ["--input", pdf, "--id", "fixture", "--pages", "1"]);
  let dir = author("fixture", 1);
  assert.ok(validate(dir).ok);
  command("publish", ["--id", "fixture"]);
  let original = current("fixture"),
    before = fileHashes(original);
  assert.equal(hash(path.join(ROOT, "pdfs/fixture.pdf")), hash(pdf));
  command("extract", ["--id", "fixture", "--pages", "1"]);
  assert.equal(fs.existsSync(path.join(ROOT, "staging/fixture")), false);
  command("extract", ["--id", "fixture", "--pages", "3"]);
  dir = author("fixture", 3);
  command("publish", ["--id", "fixture"]);
  let latest = current("fixture");
  assert.equal(read(path.join(latest, "manifest.json")).pages[2].width, 360);
  assert.equal(read(path.join(latest, "manifest.json")).pages[2].height, 460);
  assert.deepEqual(fileHashes(latest), before);
  assert.equal(
    read(path.join(latest, "manifest.json")).pages[1].state,
    "not-prepared",
  );
  assert.equal(fs.existsSync(path.join(latest, "pages/p0002")), false);
  const ref = "fixture:p0001:annotation:p0001-a@r1",
    lookup = JSON.parse(command("lookup", ["--ref", ref]).stdout);
  assert.equal(lookup.record.id, "p0001-a");
  assert.equal(lookup.currentRevision, 2);
  assert.equal(lookup.dependentQuestions.length, 1);
  command("repair", ["--ref", "fixture:p0001:entry:p0001-e@r1"]);
  dir = path.join(ROOT, "staging/fixture");
  const ef = path.join(dir, "pages/p0001/entries.json"),
    e = read(ef);
  e.entries[0].meaning = "Repaired fixture meaning";
  write(ef, e);
  command("publish", ["--id", "fixture"]);
  latest = current("fixture");
  assert.equal(
    read(path.join(latest, "pages/p0001/entries.json")).entries[0].id,
    "p0001-e",
  );
  assert.equal(
    read(path.join(latest, "pages/p0001/entries.json")).entries[0].meaning,
    "Repaired fixture meaning",
  );
  assert.equal(
    hash(path.join(latest, "pages/p0001/text.txt")),
    before["pages/p0001/text.txt"],
  );
  assert.ok(fs.existsSync(original));
  // Stale staging base is refused and the last valid pointer survives.
  command("repair", ["--ref", ref]);
  dir = path.join(ROOT, "staging/fixture");
  const m = read(path.join(dir, "manifest.json"));
  m.baseRevision = 1;
  write(path.join(dir, "manifest.json"), m);
  command("publish", ["--id", "fixture"], false);
  assert.equal(current("fixture"), latest);
  fs.rmSync(dir, { recursive: true });
  // A different PDF cannot attach old anchors.
  const changed = path.join(temp, "changed.pdf");
  fs.writeFileSync(changed, "different bytes");
  command(
    "extract",
    ["--input", changed, "--id", "fixture", "--pages", "2"],
    false,
  );
});
test("rotated geometry and a second document use the same generic pipeline", () => {
  command("extract", ["--input", pdf, "--id", "fixture", "--pages", "2"]);
  const l = read(path.join(ROOT, "staging/fixture/pages/p0002/layout.json"));
  assert.equal(l.rotation, 90);
  assert.equal(l.width, 500);
  assert.equal(l.height, 400);
  for (const c of l.characters) {
    assert.ok(c.rect[0] >= 0 && c.rect[1] >= 0);
    assert.ok(c.rect[0] + c.rect[2] <= 1);
    assert.ok(c.rect[1] + c.rect[3] <= 1);
  }
  const second = path.join(temp, "second.pdf");
  const r = spawnSync(".venv/bin/python", [
    "-c",
    `import pymupdf as f
p=f.open();q=p.new_page();q.insert_text((80,100),'你好',fontname='china-s',fontsize=30);p.save(${JSON.stringify(second)})`,
  ]);
  assert.equal(r.status, 0);
  command("extract", ["--input", second, "--id", "second", "--pages", "1"]);
  author("second", 1);
  command("publish", ["--id", "second"]);
  assert.equal(catalog().documents.length, 2);
});
test("invalid checksums, choices, schema, anchors, cycles and geometry are rejected", () => {
  const source = current("fixture");
  let n = 0;
  const invalid = (mutate) => {
    const dir = path.join(temp, "invalid-" + ++n);
    fs.cpSync(source, dir, { recursive: true });
    mutate(dir);
    seal(dir);
    const v = validate(dir);
    assert.equal(v.ok, false, JSON.stringify(v));
  };
  invalid((dir) => {
    const f = path.join(dir, "pages/p0001/annotations.json"),
      d = read(f);
    d.annotations[0].anchors[0].exactText = "wrong";
    write(f, d);
  });
  invalid((dir) => {
    const f = path.join(dir, "pages/p0001/layout.json"),
      d = read(f);
    d.characters[0].rect[0] = -1;
    write(f, d);
  });
  invalid((dir) => {
    const f = path.join(dir, "pages/p0001/questions.json"),
      d = read(f);
    d.questions[0].correctOptionId = "missing";
    write(f, d);
  });
  invalid((dir) => {
    const f = path.join(dir, "pages/p0001/questions.json"),
      d = read(f);
    d.questions[0].options[1].text = "Hello";
    write(f, d);
  });
  invalid((dir) => {
    const f = path.join(dir, "manifest.json"),
      d = read(f);
    d.schemaVersion = "2.0";
    write(f, d);
  });
  invalid((dir) => {
    const f = path.join(dir, "pages/p0001/entries.json"),
      d = read(f);
    d.entries[0].constituentIds = [d.entries[0].id];
    write(f, d);
  });
  const dir = path.join(temp, "checksum");
  fs.cpSync(source, dir, { recursive: true });
  fs.appendFileSync(path.join(dir, "pages/p0001/text.txt"), "corrupted");
  assert.equal(validate(dir).ok, false);
  assert.throws(() => safe(ROOT, "../private"));
  assert.throws(() => safe(ROOT, "https://remote"));
  assert.throws(() => safe(ROOT, "/etc/passwd"));
});
test("code-point slicing, multiline geometry, selected scope and shuffled IDs", () => {
  const text = "你𠀀好\n再见";
  assert.equal(Array.from(text).slice(1, 2).join(""), "𠀀");
  const ann = { anchors: [{ characterIds: ["a", "b", "c"] }] },
    layout = {
      characters: [
        { id: "a", lineId: "1", rect: [0.1, 0.1, 0.1, 0.1] },
        { id: "b", lineId: "1", rect: [0.2, 0.1, 0.1, 0.1] },
        { id: "c", lineId: "2", rect: [0.1, 0.3, 0.1, 0.1] },
      ],
    };
  const rects = anchorRects(ann, layout);
  assert.equal(rects.length, 2);
  assert.ok(Math.abs(rects[0][2] - 0.2) < 1e-10);
  const q = {
      id: "q",
      reviewStatus: "reviewed",
      requiresAudio: false,
      sourceAnnotationIds: ["a", "b"],
      options: [{ id: "right" }, { id: "wrong" }],
      correctOptionId: "right",
    },
    audio = { ...q, id: "audio", requiresAudio: true },
    draft = { ...q, id: "draft", reviewStatus: "draft" },
    pages = { p: { questions: { questions: [q, audio, draft] } } };
  assert.equal(eligibleQuestions(pages, new Set(["a"]), true).length, 0);
  assert.deepEqual(
    eligibleQuestions(pages, new Set(["a", "b"]), false).map((q) => q.id),
    ["q"],
  );
  assert.equal(eligibleQuestions(pages, null, true).length, 2);
  for (let i = 0; i < 10; i++) {
    assert.ok(shuffle(q.options).some((o) => isCorrect(q, o.id)));
  }
});
test.after(() => fs.rmSync(temp, { recursive: true, force: true }));

test("documented valid and invalid authoring fixtures match the versioned schema", async () => {
  const { default: Ajv } = await import("ajv");
  const validator = new Ajv({ strict: false }).compile(
    read("schemas/page.schema.json"),
  );
  assert.equal(validator(read("schemas/examples/valid-question.json")), true);
  assert.equal(
    validator(read("schemas/examples/invalid-question.json")),
    false,
  );
});

test("selected containers include their own child occurrences without selecting repeats elsewhere", async () => {
  const { selectionScope } = await import("../app/model.js");
  const anchor = (start, end) => ({
    pageId: "p0001",
    extractionRevision: 1,
    start,
    end,
  });
  const pages = {
    p: {
      annotations: {
        annotations: [
          { id: "sentence", anchors: [anchor(0, 8)] },
          { id: "word", anchors: [anchor(2, 4)] },
          { id: "repeat", anchors: [anchor(12, 14)] },
        ],
      },
    },
  };
  assert.deepEqual([...selectionScope(pages, new Set(["sentence"]))].sort(), [
    "sentence",
    "word",
  ]);
  assert.deepEqual([...selectionScope(pages, new Set(["word"]))], ["word"]);
});

test("item repairs cannot change unrelated records or frozen extraction", () => {
  const latest = current("fixture");
  command("repair", ["--ref", "fixture:p0001:question:p0001-q@r1"]);
  const stage = path.join(ROOT, "staging/fixture"),
    file = path.join(stage, "pages/p0001/entries.json"),
    entry = read(file);
  entry.entries[0].meaning = "Unrelated modification";
  write(file, entry);
  command("publish", ["--id", "fixture"], false);
  assert.equal(current("fixture"), latest);
  fs.rmSync(stage, { recursive: true });
  command("repair", ["--ref", "fixture:p0001:annotation:p0001-a@r1"]);
  const layoutPath = path.join(stage, "pages/p0001/layout.json"),
    layout = read(layoutPath);
  layout.diagnosticNote = "This modifies frozen geometry metadata";
  write(layoutPath, layout);
  command("publish", ["--id", "fixture"], false);
  assert.equal(current("fixture"), latest);
  fs.rmSync(stage, { recursive: true });
});
