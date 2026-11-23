import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ROOT,
  read,
  write,
  hash,
  seal,
  validate,
  current,
  catalog,
  walk,
  safe,
} from "./library.mjs";
const [command, ...args] = process.argv.slice(2),
  opts = {};
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith("--")) throw Error("Expected --option");
  opts[args[i].slice(2)] =
    args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
}
const log = (x) => console.log(JSON.stringify(x, null, 2));
function python(args) {
  const exe = process.env.CHINOIS_PYTHON || ".venv/bin/python";
  const r = spawnSync(exe, ["tools/extract.py", ...args], { encoding: "utf8" });
  if (r.error || r.status)
    throw Error(
      r.stderr || "Install extraction tools: npm run setup:extractor",
    );
  return JSON.parse(r.stdout);
}
function idCheck(id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id || ""))
    throw Error("Provide --id with lowercase letters, numbers and hyphens");
  return id;
}
function staging(id) {
  return path.join(ROOT, "staging", idCheck(id));
}
function parsePages(spec, count) {
  if (opts["all-pages"]) return Array.from({ length: count }, (_, i) => i + 1);
  if (typeof spec !== "string")
    throw Error('Select physical pages with --pages "1,3-4" or --all-pages');
  const out = new Set();
  for (const part of spec.split(",")) {
    if (!/^\d+(-\d+)?$/.test(part)) throw Error("Invalid page selection");
    const [a, b = a] = part.split("-").map(Number);
    if (a < 1 || b < a || b > count) throw Error("Pages outside source range");
    for (let n = a; n <= b; n++) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}
function stageExisting(id) {
  const dest = staging(id);
  if (!fs.existsSync(dest)) {
    const prev = current(id);
    if (!prev) throw Error("No published document: " + id);
    fs.cpSync(prev, dest, { recursive: true });
    const m = read(path.join(dest, "manifest.json"));
    m.baseRevision = m.contentRevision;
    m.contentRevision++;
    delete m.repairScope;
    delete m.repairTargets;
    write(path.join(dest, "manifest.json"), m);
  }
  return dest;
}
function refresh(dir) {
  const m = read(path.join(dir, "manifest.json"));
  for (const p of m.pages) {
    if (p.state === "not-prepared") continue;
    const q = read(path.join(dir, "pages", p.id, "questions.json"));
    p.questionAvailability = [
      ...new Set(
        q.questions
          .filter((q) => q.reviewStatus === "reviewed")
          .map((q) => q.category),
      ),
    ];
  }
  m.updatedAt = new Date().toISOString();
  write(path.join(dir, "review/report.json"), {
    documentId: m.documentId,
    pages: m.pages.map((p) => ({
      pageId: p.id,
      state: p.state,
      categories: p.questionAvailability,
    })),
    note: "Machine checks are separate from agent linguistic and source visual review.",
  });
  write(path.join(dir, "manifest.json"), m);
  return seal(dir);
}
try {
  if (opts.help || !command) {
    console.log(
      'Commands: inspect --input PDF; extract --input PDF --id ID --pages "1,3-4" [--all-pages] [--ocr]; validate/publish --id ID; list; lookup --ref ID:p0001:annotation:ITEM@r1; repair --ref REF; diagnose --id ID --page 1. Extraction requires npm run setup:extractor. Author/review staged JSON before publication.',
    );
    process.exit(0);
  }
  if (command === "inspect") {
    const input = path.resolve(opts.input || "");
    log({
      ...python(["inspect", input]),
      sha256: hash(input),
      bytes: fs.statSync(input).size,
    });
  } else if (command === "list") log(catalog());
  else if (command === "extract") {
    let id = opts.id && idCheck(opts.id),
      existing = id && current(id),
      source = opts.input && path.resolve(opts.input);
    if (source) {
      const sha = hash(source);
      const match = catalog().documents.find((m) => m.source.sha256 === sha);
      if (match) {
        id = match.documentId;
        existing = current(id);
      }
    }
    if (!id) throw Error("Provide --id for a new source");
    let dir = staging(id),
      m;
    if (fs.existsSync(dir)) m = read(path.join(dir, "manifest.json"));
    else if (existing) {
      const published = read(path.join(existing, "manifest.json"));
      const requested = parsePages(opts.pages, published.source.pageCount);
      if (source && hash(source) !== published.source.sha256)
        throw Error("Changed source bytes; use a new document ID");
      if (requested.every((n) => published.pages[n - 1].state === "ready")) {
        log({
          id,
          added: [],
          skipped: requested,
          unchangedRevision: published.contentRevision,
        });
        process.exit(0);
      }
      stageExisting(id);
      m = read(path.join(dir, "manifest.json"));
    } else {
      if (!source) throw Error("Provide --input for a new document");
      const info = python(["inspect", source]);
      parsePages(opts.pages, info.pageCount);
      const pdf = path.join(ROOT, "pdfs", id + ".pdf");
      fs.mkdirSync(path.dirname(pdf), { recursive: true });
      if (fs.existsSync(pdf) && hash(pdf) !== hash(source))
        throw Error("Original PDF identity conflict");
      if (!fs.existsSync(pdf))
        fs.copyFileSync(source, pdf, fs.constants.COPYFILE_EXCL);
      m = {
        schemaVersion: "1.0",
        documentId: id,
        contentRevision: 1,
        baseRevision: 0,
        title: opts.title || info.title || path.basename(source, ".pdf"),
        sourceLanguage: "zh-CN",
        translationLanguage: "en",
        source: {
          pathBase: "data-root",
          path: `pdfs/${id}.pdf`,
          sha256: hash(pdf),
          bytes: fs.statSync(pdf).size,
          pageCount: info.pageCount,
        },
        pages: info.pages.map((p) => ({
          ...p,
          id: `p${String(p.pageNumber).padStart(4, "0")}`,
          state: "not-prepared",
          questionAvailability: [],
        })),
        files: {},
        learningProfile: read("config/learning-profile.json"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        provenance: { extractor: "PyMuPDF", version: info.tool },
      };
    }
    if (source && hash(source) !== m.source.sha256)
      throw Error("Changed source bytes; use a new document ID");
    const requested = parsePages(opts.pages, m.source.pageCount),
      added = [],
      skipped = [];
    write(path.join(dir, "manifest.json"), m);
    for (const n of requested) {
      const p = m.pages[n - 1];
      if (p.state !== "not-prepared") {
        skipped.push(n);
        continue;
      }
      const tmp = fs.mkdtempSync(path.join(dir, `.extract-${p.id}-`));
      try {
        python([
          "extract",
          safe(ROOT, m.source.path),
          String(n),
          tmp,
          id,
          "1",
          opts.ocr ? "ocr" : "embedded",
        ]);
        const target = path.join(dir, "pages", p.id);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.renameSync(tmp, target);
      } finally {
        if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
      }
      p.state = "extracted";
      p.extractionRevision = 1;
      added.push(n);
      write(path.join(dir, "manifest.json"), m);
    }
    if (
      !added.length &&
      existing &&
      !fs.existsSync(path.join(dir, "manifest.json"))
    ) {
      log({ id, added, skipped });
    } else {
      write(path.join(dir, "manifest.json"), m);
      refresh(dir);
      log({
        id,
        added,
        skipped,
        staging: dir,
        next: "Inspect source.png and text.txt; author entries/annotations/questions, review.json, and set reviewed page state ready. Validate then publish.",
      });
    }
  } else if (command === "validate") {
    const dir = staging(opts.id);
    refresh(dir);
    const result = validate(dir);
    log(result);
    if (!result.ok) process.exitCode = 1;
  } else if (command === "publish") {
    const id = idCheck(opts.id),
      dir = staging(id);
    refresh(dir);
    const result = validate(dir);
    if (!result.ok) {
      log(result);
      process.exit(1);
    }
    const m = read(path.join(dir, "manifest.json"));
    if (!m.pages.some((p) => p.state === "ready"))
      throw Error("No reviewed ready pages");
    const root = path.join(ROOT, "library", id);
    fs.mkdirSync(root, { recursive: true });
    const lock = path.join(root, ".publish-lock");
    const fd = fs.openSync(lock, "wx");
    try {
      const old = current(id),
        rev = old ? read(path.join(old, "manifest.json")).contentRevision : 0;
      if (m.baseRevision !== rev)
        throw Error(
          "Stale staging base; another revision was published. Rebase and validate before retry.",
        );
      // Only explicitly authorized repair scopes may change existing accepted pages.
      if (old) {
        const before = read(path.join(old, "manifest.json"));
        for (const p of before.pages.filter((p) => p.state === "ready")) {
          const next = m.pages.find((n) => n.id === p.id);
          for (const key of [
            "id",
            "pageNumber",
            "width",
            "height",
            "rotation",
            "extractionRevision",
            "state",
          ])
            if (JSON.stringify(next?.[key]) !== JSON.stringify(p[key]))
              throw Error(
                "Accepted page identity/geometry/state changed: " + p.id,
              );
          for (const f of Object.keys(before.files).filter((f) =>
            f.startsWith(`pages/${p.id}/`),
          )) {
            if (m.files[f] !== before.files[f]) {
              if (!m.repairScope?.includes(p.id))
                throw Error(
                  "Existing accepted page modified without scoped repair: " +
                    p.id,
                );
              const filename = path.basename(f);
              if (
                ![
                  "entries.json",
                  "annotations.json",
                  "questions.json",
                  "review.json",
                ].includes(filename)
              )
                throw Error(
                  "Item repair cannot change frozen extraction/assets: " + f,
                );
              if (filename !== "review.json") {
                const namespace = {
                    "entries.json": "entry",
                    "annotations.json": "annotation",
                    "questions.json": "question",
                  }[filename],
                  collection = {
                    entry: "entries",
                    annotation: "annotations",
                    question: "questions",
                  }[namespace];
                const oldRecords = read(path.join(old, f))[collection],
                  newRecords = read(path.join(dir, f))[collection];
                if (
                  oldRecords.length !== newRecords.length ||
                  oldRecords.some((r) => !newRecords.some((n) => n.id === r.id))
                )
                  throw Error("Item repair must preserve stable IDs");
                const targets =
                  m.repairTargets?.filter((t) => t.pageId === p.id) || [];
                const dependentAnnotations = read(
                  path.join(old, "pages", p.id, "annotations.json"),
                )
                  .annotations.filter((a) =>
                    targets.some(
                      (t) => t.kind === "entry" && t.itemId === a.entryId,
                    ),
                  )
                  .map((a) => a.id);
                for (const record of oldRecords) {
                  const replacement = newRecords.find(
                    (n) => n.id === record.id,
                  );
                  if (JSON.stringify(record) === JSON.stringify(replacement))
                    continue;
                  const direct = targets.some(
                    (t) => t.kind === namespace && t.itemId === record.id,
                  );
                  const dependent =
                    namespace === "question" &&
                    record.sourceAnnotationIds.some(
                      (id) =>
                        dependentAnnotations.includes(id) ||
                        targets.some(
                          (t) => t.kind === "annotation" && t.itemId === id,
                        ),
                    );
                  if (!direct && !dependent)
                    throw Error(
                      "Unrelated record modified during item repair: " +
                        record.id,
                    );
                }
              }
            }
          }
        }
      }
      const target = path.join(root, "revisions", String(m.contentRevision));
      if (fs.existsSync(target))
        throw Error(
          "Revision directory exists; inspect previous interrupted publication before retry",
        );
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.cpSync(dir, target, { recursive: true });
      const check = validate(target);
      if (!check.ok) throw Error("Published copy failed validation");
      const pointer = path.join(root, `.current-${process.pid}.json`);
      write(pointer, { revision: m.contentRevision });
      fs.renameSync(pointer, path.join(root, "current.json"));
      fs.rmSync(dir, { recursive: true });
      log({
        published: id,
        revision: m.contentRevision,
        readyPages: m.pages
          .filter((p) => p.state === "ready")
          .map((p) => p.pageNumber),
      });
    } finally {
      fs.closeSync(fd);
      fs.unlinkSync(lock);
    }
  } else if (command === "lookup" || command === "repair") {
    const match = String(opts.ref || "").match(
      /^([a-z0-9-]+):(p\d{4}):(annotation|entry|question):([^:@]+)@r(\d+)$/,
    );
    if (!match) throw Error("Invalid correction reference");
    const [, id, pageId, kind, itemId, observed] = match;
    const dir = command === "repair" ? stageExisting(id) : current(id);
    if (!dir) throw Error("Document not found");
    const file = path.join(
        dir,
        "pages",
        pageId,
        kind === "entry" ? "entries.json" : kind + "s.json",
      ),
      collection = kind === "entry" ? "entries" : kind + "s",
      data = read(file),
      record = data[collection].find((r) => r.id === itemId);
    if (!record) throw Error("Stable item ID not found");
    const m = read(path.join(dir, "manifest.json"));
    if (command === "repair") {
      m.repairScope = [...new Set([...(m.repairScope || []), pageId])];
      m.repairTargets = [...(m.repairTargets || []), { pageId, kind, itemId }];
      write(path.join(dir, "manifest.json"), m);
    }
    log({
      file,
      record,
      observedRevision: Number(observed),
      currentRevision: m.contentRevision,
      source: read(path.join(dir, "pages", pageId, "layout.json")).lines,
      dependentQuestions: read(
        path.join(dir, "pages", pageId, "questions.json"),
      ).questions.filter(
        (q) =>
          q.sourceAnnotationIds?.includes(itemId) ||
          q.entryIds?.includes(itemId),
      ),
    });
  } else if (command === "diagnose") {
    const dir = fs.existsSync(staging(opts.id))
        ? staging(opts.id)
        : current(opts.id),
      p = `p${String(Number(opts.page || 1)).padStart(4, "0")}`,
      base = path.join(dir, "pages", p),
      layout = read(path.join(base, "layout.json"));
    const rects = layout.characters
      .filter((c) => c.exactText.trim())
      .map(
        (c) =>
          `<rect x="${c.rect[0] * 100}%" y="${c.rect[1] * 100}%" width="${c.rect[2] * 100}%" height="${c.rect[3] * 100}%"/>`,
      )
      .join("");
    fs.writeFileSync(
      path.join(base, "diagnostic.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}"><image href="source.png" width="100%" height="100%"/><g fill="none" stroke="#b00020" stroke-width="0.4">${rects}</g></svg>`,
    );
    log({ diagnostic: path.join(base, "diagnostic.svg") });
  } else throw Error("Unknown command: " + command);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
