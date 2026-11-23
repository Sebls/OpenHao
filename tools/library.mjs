import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Ajv from "ajv";
export const ROOT = path.resolve(process.env.CHINOIS_DATA_ROOT || "data");
export const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const write = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
};
export const hash = (p) =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
export function safe(base, rel) {
  if (
    typeof rel !== "string" ||
    rel.includes("\\") ||
    rel.includes(":") ||
    path.isAbsolute(rel) ||
    rel.split("/").some((x) => x === ".." || x === ".")
  )
    throw Error("Unsafe local path: " + rel);
  const p = path.resolve(base, rel);
  if (!p.startsWith(path.resolve(base) + path.sep))
    throw Error("Path escapes allowed root");
  if (
    fs.existsSync(p) &&
    !fs.realpathSync(p).startsWith(fs.realpathSync(base) + path.sep)
  )
    throw Error("Symlink escapes allowed root");
  return p;
}
export function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
    );
}
const ajv = new Ajv({ allErrors: true, strict: false });
const manifestSchema = ajv.compile(read("schemas/package.schema.json")),
  pageSchema = ajv.compile(read("schemas/page.schema.json"));
export function seal(dir) {
  const m = read(path.join(dir, "manifest.json"));
  m.files = {};
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join("/");
    if (rel !== "manifest.json" && !rel.startsWith("."))
      m.files[rel] = hash(file);
  }
  write(path.join(dir, "manifest.json"), m);
  return m;
}
export function validate(dir, { checksums = true } = {}) {
  const issues = [];
  const fail = (message, pageId) =>
    issues.push({ severity: "error", pageId, message });
  let m;
  try {
    m = read(path.join(dir, "manifest.json"));
    if (!manifestSchema(m)) fail(ajv.errorsText(manifestSchema.errors));
    if (issues.length) return { ok: false, issues };
    const source = safe(ROOT, m.source.path);
    if (
      hash(source) !== m.source.sha256 ||
      fs.statSync(source).size !== m.source.bytes
    )
      fail("Source identity mismatch");
    for (const [file, sum] of Object.entries(m.files)) {
      const p = safe(dir, file);
      if (!fs.existsSync(p) || (checksums && hash(p) !== sum))
        fail("Missing file or checksum mismatch: " + file);
    }
    const seen = {
      entry: new Set(),
      annotation: new Set(),
      question: new Set(),
    };
    const unique = (records, namespace, pageId) => {
      for (const r of records) {
        if (!r.id || seen[namespace].has(r.id))
          fail("Duplicate/missing " + namespace + " ID " + r.id, pageId);
        seen[namespace].add(r.id);
      }
    };
    if (m.pages.length !== m.source.pageCount) fail("Page count mismatch");
    for (const [idx, p] of m.pages.entries()) {
      if (
        p.pageNumber !== idx + 1 ||
        p.id !== `p${String(idx + 1).padStart(4, "0")}`
      )
        fail("Invalid page order/ID", p.id);
      if (p.state === "not-prepared") {
        if (p.extractionRevision)
          fail("Unprepared page has extraction revision", p.id);
        continue;
      }
      const prefix = `pages/${p.id}/`;
      const load = (n) => {
        const rel = prefix + n;
        if (!(rel in m.files)) fail("Unhashed runtime file: " + rel, p.id);
        return read(safe(dir, rel));
      };
      const textPath = safe(dir, prefix + "text.txt");
      if (!(prefix + "text.txt" in m.files)) fail("Unhashed transcript", p.id);
      const text = Array.from(fs.readFileSync(textPath, "utf8"));
      const layout = load("layout.json"),
        E = load("entries.json"),
        A = load("annotations.json"),
        Q = load("questions.json"),
        review = load("review.json");
      for (const o of [layout, E, A, Q, review]) {
        if (!pageSchema(o)) fail(ajv.errorsText(pageSchema.errors), p.id);
        if (
          o.documentId !== m.documentId ||
          o.pageId !== p.id ||
          o.extractionRevision !== p.extractionRevision
        )
          fail("Page identity/revision mismatch", p.id);
      }
      if (
        layout.textSha256 !== hash(textPath) ||
        layout.offsetUnit !== "unicode-code-point" ||
        layout.transcriptRange?.[1] !== text.length
      )
        fail("Transcript hash/offset mismatch", p.id);
      const range = (r) => {
        if (
          !Number.isInteger(r.start) ||
          !Number.isInteger(r.end) ||
          r.start < 0 ||
          r.end <= r.start ||
          r.end > text.length ||
          text.slice(r.start, r.end).join("") !== r.exactText
        )
          fail("Exact source range mismatch: " + r.id, p.id);
      };
      const chars = new Map();
      for (const c of layout.characters) {
        range(c);
        if (chars.has(c.id)) fail("Duplicate character ID", p.id);
        chars.set(c.id, c);
        if (
          !Array.isArray(c.rect) ||
          c.rect.length !== 4 ||
          !c.rect.every(Number.isFinite) ||
          c.rect[0] < -0.001 ||
          c.rect[1] < -0.001 ||
          c.rect[2] <= 0 ||
          c.rect[3] <= 0 ||
          c.rect[0] + c.rect[2] > 1.001 ||
          c.rect[1] + c.rect[3] > 1.001
        )
          fail("Invalid character geometry: " + c.id, p.id);
      }
      for (const r of [...layout.lines, ...layout.blocks]) range(r);
      if (
        layout.width !== p.width ||
        layout.height !== p.height ||
        layout.rotation !== p.rotation
      )
        fail("Layout/display geometry mismatch", p.id);
      const lineMap = new Map(layout.lines.map((l) => [l.id, l])),
        blockMap = new Map(layout.blocks.map((b) => [b.id, b]));
      for (const c of layout.characters) {
        const line = lineMap.get(c.lineId),
          block = blockMap.get(c.blockId);
        if (
          !line ||
          !block ||
          line.blockId !== c.blockId ||
          c.start < line.start ||
          c.end > line.end ||
          c.start < block.start ||
          c.end > block.end
        )
          fail("Character/line/block containment mismatch: " + c.id, p.id);
      }

      const entries = E.entries,
        anns = A.annotations,
        questions = Q.questions;
      if (
        p.state === "ready" &&
        !anns.some((a) => a.reviewStatus === "reviewed")
      )
        fail("Ready page has no reviewed learning occurrences", p.id);
      unique(entries, "entry", p.id);
      unique(anns, "annotation", p.id);
      unique(questions, "question", p.id);
      const em = new Map(entries.map((e) => [e.id, e])),
        am = new Map(anns.map((a) => [a.id, a]));
      for (const e of entries) {
        if (
          e.reviewStatus === "reviewed" &&
          (!e.meaning ||
            !e.pronunciations?.some(
              (v) =>
                v.system === "pinyin" &&
                v.value &&
                v.reviewStatus === "reviewed",
            ))
        )
          fail("Reviewed entry missing meaning/pinyin: " + e.id, p.id);
        for (const id of e.constituentIds || [])
          if (!em.has(id)) fail("Missing constituent: " + id, p.id);
      }
      const visiting = new Set(),
        done = new Set();
      function visit(id) {
        if (visiting.has(id)) {
          fail("Cyclic constituent relationship", p.id);
          return;
        }
        if (done.has(id)) return;
        visiting.add(id);
        for (const child of em.get(id)?.constituentIds || []) visit(child);
        visiting.delete(id);
        done.add(id);
      }
      for (const id of em.keys()) visit(id);
      for (const a of anns) {
        const e = em.get(a.entryId);
        if (!e) fail("Unresolved entry: " + a.id, p.id);
        if (a.reviewStatus === "reviewed" && e?.reviewStatus !== "reviewed")
          fail("Reviewed annotation links uncertain entry", p.id);
        for (const anchor of a.anchors) {
          range(anchor);
          if (
            anchor.pageId !== p.id ||
            anchor.extractionRevision !== p.extractionRevision
          )
            fail("Anchor revision mismatch", p.id);
          const cs = anchor.characterIds.map((id) => chars.get(id));
          if (
            cs.some((c) => !c || c.start < anchor.start || c.end > anchor.end)
          )
            fail("Anchor character containment mismatch", p.id);
          if (
            cs
              .filter(Boolean)
              .map((c) => c.exactText)
              .join("") !== anchor.exactText.replaceAll("\n", "")
          )
            fail("Anchor missing source characters", p.id);
        }
        if (
          e &&
          a.anchors.map((x) => x.exactText).join("") !== e.form &&
          !a.formMapping
        )
          fail("Unexplained source/form mismatch", p.id);
      }
      for (const q of questions) {
        const ids = q.options.map((o) => o.id),
          labels = q.options.map((o) =>
            o.text.trim().normalize("NFKC").toLowerCase(),
          );
        if (
          new Set(ids).size !== ids.length ||
          new Set(labels).size !== labels.length ||
          !ids.includes(q.correctOptionId)
        )
          fail("Invalid question options: " + q.id, p.id);
        if (q.requiresAudio && !q.speechTarget)
          fail("Missing speech target", p.id);
        for (const id of q.sourceAnnotationIds) {
          const a = am.get(id);
          if (
            !a ||
            (q.reviewStatus === "reviewed" && a.reviewStatus !== "reviewed")
          )
            fail(
              "Question references missing/uncertain annotation: " + q.id,
              p.id,
            );
        }
      }
      if (
        p.state === "ready" &&
        (!review.sourceVisualReview ||
          !review.linguisticReview ||
          review.textSha256 !== layout.textSha256 ||
          !review.reviewer)
      )
        fail("Ready page lacks matching visual/linguistic review", p.id);
      if (review.issues?.some((i) => i.severity === "error"))
        fail("Page review contains unresolved errors", p.id);
    }
  } catch (e) {
    fail(e.message);
  }
  return {
    ok: issues.length === 0,
    issues,
    documentId: m?.documentId,
    revision: m?.contentRevision,
  };
}
export function current(id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id || ""))
    throw Error(
      "Use a lowercase document ID with letters, numbers and hyphens",
    );
  const pointer = path.join(ROOT, "library", id, "current.json");
  if (!fs.existsSync(pointer)) return null;
  const { revision } = read(pointer);
  return path.join(ROOT, "library", id, "revisions", String(revision));
}
export function catalog() {
  const base = path.join(ROOT, "library");
  if (!fs.existsSync(base)) return { documents: [], issues: [] };
  const documents = [],
    issues = [];
  for (const id of fs.readdirSync(base)) {
    try {
      const dir = current(id);
      if (!dir) continue;
      const result = validate(dir);
      if (!result.ok)
        throw Error(result.issues.map((x) => x.message).join("; "));
      documents.push(read(path.join(dir, "manifest.json")));
    } catch (e) {
      issues.push({ documentId: id, message: e.message });
    }
  }
  return { documents, issues };
}
