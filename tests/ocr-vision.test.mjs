import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chinois-ocr-test-"));
process.env.CHINOIS_DATA_ROOT = path.join(temp, "data");

const { ROOT, read, write, seal, validate } = await import(
  "../src/content/library/index.ts"
);

const runCli = (args, extraEnv = {}) =>
  spawnSync(process.execPath, ["--import", "tsx", "src/content/cli.ts", ...args], {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });

const hasSwift =
  process.platform === "darwin" && fs.existsSync("/usr/bin/swift");

const hasTesseract = (() => {
  const probe = spawnSync(
    ".venv/bin/python",
    [
      "-c",
      "import pymupdf as fitz; d=fitz.open(); p=d.new_page(); p.get_textpage_ocr(language='chi_sim+eng', dpi=72)",
    ],
    { encoding: "utf8" },
  );
  return probe.status === 0;
})();

const makeImageOnlyPdf = (destPath, specPy) => {
  const res = spawnSync(".venv/bin/python", ["-c", specPy], {
    encoding: "utf8",
  });
  assert.equal(res.status, 0, res.stderr + res.stdout);
  assert.ok(fs.existsSync(destPath));
};

const syntheticPdf = path.join(temp, "synthetic-ocr.pdf");
makeImageOnlyPdf(
  syntheticPdf,
  `import pymupdf as fitz
src = fitz.open()
p1 = src.new_page(width=516, height=729)
p1.insert_htmlbox((50, 80, 466, 360), '<div style="font-size:28px;line-height:1.5;font-family:sans-serif">你好 世界<br>Leçon de français<br>Clé et règle</div>')
pix = p1.get_pixmap(dpi=200)
out = fitz.open()
op1 = out.new_page(width=516, height=729)
op1.insert_image(op1.rect, pixmap=pix)
out.new_page(width=516, height=729)
out.save(${JSON.stringify(syntheticPdf)})`,
);

const spreadPdf = path.join(temp, "synthetic-spread.pdf");
makeImageOnlyPdf(
  spreadPdf,
  `import pymupdf as fitz
src = fitz.open()
p = src.new_page(width=1032, height=729)
p.insert_htmlbox((60, 120, 460, 300), '<div style="font-size:26px;font-family:sans-serif">左页 内容</div>')
p.insert_htmlbox((576, 80, 976, 260), '<div style="font-size:26px;font-family:sans-serif">右页 测试</div>')
pix = p.get_pixmap(dpi=200)
out = fitz.open()
op = out.new_page(width=1032, height=729)
op.insert_image(op.rect, pixmap=pix)
out.save(${JSON.stringify(spreadPdf)})`,
);

test("invalid CHINOIS_OCR_ENGINE fails cleanly on ocr while inspect and embedded remain unaffected", () => {
  const inspectRes = runCli(["inspect", "--input", syntheticPdf], {
    CHINOIS_OCR_ENGINE: "invalid-engine",
  });
  assert.equal(inspectRes.status, 0, inspectRes.stderr);

  const embeddedRes = runCli(
    ["extract", "--input", syntheticPdf, "--id", "emb-check", "--pages", "1"],
    { CHINOIS_OCR_ENGINE: "invalid-engine" },
  );
  assert.equal(embeddedRes.status, 0, embeddedRes.stderr);
  const embLayout = read(
    path.join(ROOT, "staging/emb-check/pages/p0001/layout.json"),
  );
  assert.equal(embLayout.extractionMethod, "embedded");
  assert.equal(embLayout.extractor.name, "PyMuPDF");

  const badOcr = runCli(
    [
      "extract",
      "--input",
      syntheticPdf,
      "--id",
      "bad-engine",
      "--pages",
      "1",
      "--ocr",
    ],
    { CHINOIS_OCR_ENGINE: "bogus" },
  );
  assert.notEqual(badOcr.status, 0);
  assert.match(badOcr.stderr, /Unsupported CHINOIS_OCR_ENGINE/i);
});

test(
  "default unset and case-insensitive tesseract CHINOIS_OCR_ENGINE preserve PyMuPDF+Tesseract behavior",
  { skip: !hasTesseract },
  () => {
    const unsetEnv = { ...process.env };
    delete unsetEnv.CHINOIS_OCR_ENGINE;
    const rUnset = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/content/cli.ts",
        "extract",
        "--input",
        syntheticPdf,
        "--id",
        "ocr-default",
        "--pages",
        "1",
        "--ocr",
      ],
      { encoding: "utf8", env: unsetEnv },
    );
    assert.equal(rUnset.status, 0, rUnset.stderr + rUnset.stdout);
    const lUnset = read(
      path.join(ROOT, "staging/ocr-default/pages/p0001/layout.json"),
    );
    assert.equal(lUnset.extractionMethod, "ocr");
    assert.equal(lUnset.extractor.name, "PyMuPDF");
    assert.ok(lUnset.characters.length > 0);
    assert.equal(validate(path.join(ROOT, "staging/ocr-default")).ok, true);

    const rTess = runCli(
      [
        "extract",
        "--input",
        syntheticPdf,
        "--id",
        "ocr-tess",
        "--pages",
        "1",
        "--ocr",
      ],
      { CHINOIS_OCR_ENGINE: "TeSsErAcT" },
    );
    assert.equal(rTess.status, 0, rTess.stderr + rTess.stdout);
    const lTess = read(
      path.join(ROOT, "staging/ocr-tess/pages/p0001/layout.json"),
    );
    assert.equal(lTess.extractionMethod, "ocr");
    assert.equal(lTess.extractor.name, "PyMuPDF");
    assert.equal(lTess.textSha256, lUnset.textSha256);
  },
);

test(
  "CHINOIS_OCR_ENGINE=vision extracts bilingual text, space rects, blank page warnings, and passes validate()",
  { skip: !hasSwift },
  () => {
    const res = runCli(
      [
        "extract",
        "--input",
        syntheticPdf,
        "--id",
        "ocr-vision",
        "--pages",
        "1,2",
        "--ocr",
      ],
      { CHINOIS_OCR_ENGINE: "vision" },
    );
    assert.equal(res.status, 0, res.stderr + res.stdout);

    const dir = path.join(ROOT, "staging/ocr-vision");
    const p1Dir = path.join(dir, "pages/p0001");
    const p2Dir = path.join(dir, "pages/p0002");
    const l1 = read(path.join(p1Dir, "layout.json"));
    const t1 = fs.readFileSync(path.join(p1Dir, "text.txt"), "utf8");
    const cp1 = Array.from(t1);

    assert.equal(l1.extractionMethod, "ocr");
    assert.equal(l1.extractor.name, "PyMuPDF+Vision");
    assert.equal(l1.extractor.engine, "vision");
    assert.deepEqual(l1.extractor.languages, ["zh-Hans", "fr-FR", "en-US"]);
    assert.equal(l1.offsetUnit, "unicode-code-point");
    assert.deepEqual(l1.transcriptRange, [0, cp1.length]);
    assert.ok(l1.characters.length > 0);

    // Confirm bilingual recognition: CJK + French accents + internal spaces
    assert.match(t1, /你好/);
    assert.match(t1, /世界/);
    assert.match(t1, /Leçon/);
    assert.match(t1, /Clé/);

    for (const c of l1.characters) {
      assert.equal(cp1.slice(c.start, c.end).join(""), c.exactText);
      assert.equal(c.rect.length, 4);
      assert.ok(c.rect.every(Number.isFinite));
      assert.ok(c.rect[0] >= 0 && c.rect[1] >= 0);
      assert.ok(c.rect[2] > 0 && c.rect[3] > 0);
      assert.ok(c.rect[0] + c.rect[2] <= 1 && c.rect[1] + c.rect[3] <= 1);
      assert.equal(c.rawBox.length, 4);
    }

    // Verify space-containing multi-word anchor validates cleanly
    const targetLine = l1.lines.find((line) => line.exactText.includes(" "));
    assert.ok(targetLine, "Expected at least one line with an internal space");
    const lineChars = l1.characters.filter(
      (c) => c.start >= targetLine.start && c.end <= targetLine.end,
    );
    assert.ok(lineChars.some((c) => c.exactText === " "));

    const m = read(path.join(dir, "manifest.json"));
    const p1 = m.pages[0];
    const identity = {
      documentId: "ocr-vision",
      pageId: p1.id,
      extractionRevision: p1.extractionRevision,
    };
    const entry = {
      id: "p0001-e1",
      kind: "expression",
      form: targetLine.exactText,
      meaning: "Synthetic bilingual OCR phrase",
      pronunciations: [
        { system: "pinyin", value: "nǐ hǎo shì jiè", reviewStatus: "reviewed" },
      ],
      reviewStatus: "reviewed",
    };
    const annotation = {
      id: "p0001-a1",
      entryId: entry.id,
      kind: "expression",
      reviewStatus: "reviewed",
      anchors: [
        {
          pageId: p1.id,
          extractionRevision: p1.extractionRevision,
          start: targetLine.start,
          end: targetLine.end,
          exactText: targetLine.exactText,
          characterIds: lineChars.map((c) => c.id),
        },
      ],
    };
    write(path.join(p1Dir, "entries.json"), { ...identity, entries: [entry] });
    write(path.join(p1Dir, "annotations.json"), {
      ...identity,
      annotations: [annotation],
    });
    write(path.join(p1Dir, "questions.json"), { ...identity, questions: [] });
    write(path.join(p1Dir, "review.json"), {
      ...identity,
      textSha256: l1.textSha256,
      sourceVisualReview: true,
      linguisticReview: true,
      reviewer: "Automated OCR Vision test",
      issues: [],
    });
    p1.state = "ready";
    write(path.join(dir, "manifest.json"), m);
    seal(dir);

    // Check blank page 2 layout & warning
    const l2 = read(path.join(p2Dir, "layout.json"));
    assert.equal(l2.extractionMethod, "ocr");
    assert.equal(l2.characters.length, 0);
    assert.equal(l2.lines.length, 0);
    assert.equal(l2.blocks.length, 0);
    assert.deepEqual(l2.transcriptRange, [0, 0]);
    assert.ok(l2.issues.some((i) => i.severity === "warning"));

    const validation = validate(dir);
    assert.equal(validation.ok, true, JSON.stringify(validation.issues));
  },
);

test(
  "CHINOIS_OCR_ENGINE=vision splits 2-up spreads Left then Right and honors CHINOIS_VISION_LANGS",
  { skip: !hasSwift },
  () => {
    const res = runCli(
      [
        "extract",
        "--input",
        spreadPdf,
        "--id",
        "ocr-spread",
        "--pages",
        "1",
        "--ocr",
      ],
      { CHINOIS_OCR_ENGINE: "vision" },
    );
    assert.equal(res.status, 0, res.stderr + res.stdout);

    const p1Dir = path.join(ROOT, "staging/ocr-spread/pages/p0001");
    const l1 = read(path.join(p1Dir, "layout.json"));
    const t1 = fs.readFileSync(path.join(p1Dir, "text.txt"), "utf8");
    const leftIdx = t1.indexOf("左页");
    const rightIdx = t1.indexOf("右页");
    assert.ok(leftIdx >= 0 && rightIdx > leftIdx, `Expected Left before Right in:\n${t1}`);

    const leftLine = l1.lines.find((line) => line.exactText.includes("左页"));
    const rightLine = l1.lines.find((line) => line.exactText.includes("右页"));
    assert.ok(leftLine && rightLine);
    assert.ok(leftLine.rect[0] + leftLine.rect[2] <= 0.52);
    assert.ok(rightLine.rect[0] >= 0.48);

    const overrideRes = runCli(
      [
        "extract",
        "--input",
        syntheticPdf,
        "--id",
        "ocr-lang-override",
        "--pages",
        "1",
        "--ocr",
      ],
      { CHINOIS_OCR_ENGINE: "vision", CHINOIS_VISION_LANGS: "fr-FR,en-US" },
    );
    assert.equal(overrideRes.status, 0, overrideRes.stderr + overrideRes.stdout);
    const lOverride = read(
      path.join(ROOT, "staging/ocr-lang-override/pages/p0001/layout.json"),
    );
    assert.deepEqual(lOverride.extractor.languages, ["fr-FR", "en-US"]);
    assert.equal(validate(path.join(ROOT, "staging/ocr-lang-override")).ok, true);
  },
);

test("Python Vision geometry helpers clamp bounds, synthesize space rects, preserve code-point offsets, and omit+warn unboxed non-space glyphs", () => {
  const pyCheck = spawnSync(
    ".venv/bin/python",
    [
      "-c",
      `import pathlib
src = pathlib.Path("tools/extract.py").read_text(encoding="utf-8").split("op, source = sys.argv[1:3]")[0]
ns = {}
exec(src, ns)

# 1. Clamp bottom-left -> top-left
r = ns["_clamp_top_left_rect"]([-0.02, 0.95, 0.12, 0.08])
assert r is not None and abs(r[0] - 0.0) < 1e-9 and abs(r[1] - 0.0) < 1e-9 and abs(r[2] - 0.10) < 1e-9 and abs(r[3] - 0.05) < 1e-9, r
assert ns["_clamp_top_left_rect"]([0.1, 0.2, 0.0, 0.1]) is None

# 2. Space synthesis between neighboring glyphs
clusters = [
  {"text": "a", "rect": [0.1, 0.2, 0.05, 0.04]},
  {"text": " ", "rect": None},
  {"text": "b", "rect": [0.2, 0.2, 0.05, 0.04]},
]
sr = ns["_synthesize_space_rect"](clusters, 1, [0.1, 0.2, 0.15, 0.04])
assert abs(sr[0] - 0.15) < 1e-9 and abs(sr[2] - 0.05) < 1e-9 and sr[3] > 0, sr

# 3. Assemble layout: unboxed non-space glyph omitted + warned, non-BMP surrogate offset parity, smart_sort order
vision_data = {
  "lines": [
    {
      "half": 0,
      "rect": [0.50, 0.70, 0.10, 0.04],
      "clusters": [
        {"text": "𠀀", "rect": [0.50, 0.70, 0.05, 0.04]},
        {"text": " ", "rect": None},
        {"text": "X", "rect": None},
      ],
    },
    {
      "half": 0,
      "rect": [0.10, 0.70, 0.10, 0.04],
      "clusters": [
        {"text": "左", "rect": [0.10, 0.70, 0.05, 0.04]},
      ],
    },
  ]
}
text, chars, lines, blocks, issues, transform, extractor = ns["_assemble_vision_layout"](
  vision_data, 516.0, 729.0, [1.0, 0.0, 0.0, 1.0, 0.0, 0.0], ["zh-Hans", "fr-FR", "en-US"]
)
assert text == "左\\n\\n𠀀 X", repr(text)
assert [c["exactText"] for c in chars] == ["左", "𠀀", " "], chars
assert chars[1]["start"] == 3 and chars[1]["end"] == 4, chars[1]
assert chars[2]["rect"][2] > 0 and chars[2]["rect"][3] > 0, chars[2]
assert len(issues) == 1 and issues[0]["severity"] == "warning", issues
assert "omitted" in issues[0]["reason"]
print("OK")`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(pyCheck.status, 0, pyCheck.stderr + pyCheck.stdout);
  assert.match(pyCheck.stdout, /OK/);
});

test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
