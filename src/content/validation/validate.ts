import Ajv from "ajv";
import fs from "node:fs";
import path from "node:path";
import type {
  AnnotationsFile,
  Character,
  EntriesFile,
  Issue,
  Layout,
  Manifest,
  QuestionsFile,
  Review,
  SourceRange,
  ValidationResult,
} from "../../contracts/content.ts";
import { ROOT, hash, read, safe } from "../library/files.ts";
const ajv = new Ajv({ allErrors: true, strict: false });
const manifestSchema = ajv.compile(read("schemas/package.schema.json")),
  pageSchema = ajv.compile(read("schemas/page.schema.json"));
export function validate(
  dir: string,
  { checksums = true } = {},
): ValidationResult {
  const issues: Issue[] = [];
  const fail = (message: string, pageId?: string) =>
    issues.push({ severity: "error", pageId, message });
  let m: Manifest | undefined;
  try {
    m = read<Manifest>(path.join(dir, "manifest.json"));
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
      entry: new Set<string>(),
      annotation: new Set<string>(),
      question: new Set<string>(),
    };
    const unique = (
      records: { id: string }[],
      namespace: "entry" | "annotation" | "question",
      pageId: string,
    ) => {
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
      const manifest = m;
      const load = <T>(n: string): T => {
        const rel = prefix + n;
        if (!(rel in manifest.files))
          fail("Unhashed runtime file: " + rel, p.id);
        return read<T>(safe(dir, rel));
      };
      const textPath = safe(dir, prefix + "text.txt");
      if (!(prefix + "text.txt" in m.files)) fail("Unhashed transcript", p.id);
      const text = Array.from(fs.readFileSync(textPath, "utf8"));
      const layout = load<Layout>("layout.json"),
        E = load<EntriesFile>("entries.json"),
        A = load<AnnotationsFile>("annotations.json"),
        Q = load<QuestionsFile>("questions.json"),
        review = load<Review>("review.json");
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
      const range = (r: SourceRange) => {
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
      const chars = new Map<string, Character>();
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
      const visiting = new Set<string>(),
        done = new Set<string>();
      function visit(id: string) {
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
              .filter((c): c is Character => Boolean(c))
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
        if (q.topic !== undefined && !q.topic.trim())
          fail("Empty question topic: " + q.id, p.id);
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
    fail(e instanceof Error ? e.message : String(e));
  }
  return {
    ok: issues.length === 0,
    issues,
    documentId: m?.documentId,
    revision: m?.contentRevision,
  };
}
