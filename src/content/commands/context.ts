import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type {
  Manifest,
  QuestionsFile,
  SourceInspection,
} from "../../contracts/content.ts";
import { ROOT, current, read, seal, write } from "../library/index.ts";
export const log = (x: unknown) => console.log(JSON.stringify(x, null, 2));
export function python(args: ["inspect", string]): SourceInspection;
export function python(args: string[]): unknown;
export function python(args: string[]): unknown {
  const exe = process.env.CHINOIS_PYTHON || ".venv/bin/python";
  const r = spawnSync(exe, ["tools/extract.py", ...args], { encoding: "utf8" });
  if (r.error || r.status)
    throw Error(
      r.stderr || "Install extraction tools: npm run setup:extractor",
    );
  return JSON.parse(r.stdout) as unknown;
}
export function idCheck(id: string | undefined) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(id))
    throw Error("Provide --id with lowercase letters, numbers and hyphens");
  return id;
}
export function staging(id: string | undefined) {
  return path.join(ROOT, "staging", idCheck(id));
}
export function parsePages(
  spec: string | undefined,
  count: number,
  allPages = false,
) {
  if (allPages) return Array.from({ length: count }, (_, i) => i + 1);
  if (typeof spec !== "string")
    throw Error('Select physical pages with --pages "1,3-4" or --all-pages');
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    if (!/^\d+(-\d+)?$/.test(part)) throw Error("Invalid page selection");
    const [a, b = a] = part.split("-").map(Number);
    if (a < 1 || b < a || b > count) throw Error("Pages outside source range");
    for (let n = a; n <= b; n++) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}
export function stageExisting(id: string) {
  const dest = staging(id);
  if (!fs.existsSync(dest)) {
    const prev = current(id);
    if (!prev) throw Error("No published document: " + id);
    fs.cpSync(prev, dest, { recursive: true });
    const m = read<Manifest>(path.join(dest, "manifest.json"));
    m.baseRevision = m.contentRevision;
    m.contentRevision++;
    delete m.repairScope;
    delete m.repairTargets;
    write(path.join(dest, "manifest.json"), m);
  }
  return dest;
}
export function refresh(dir: string) {
  const m = read<Manifest>(path.join(dir, "manifest.json"));
  for (const p of m.pages) {
    if (p.state === "not-prepared") continue;
    const q = read<QuestionsFile>(
      path.join(dir, "pages", p.id, "questions.json"),
    );
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
