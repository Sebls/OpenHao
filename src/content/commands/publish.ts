import fs from "node:fs";
import path from "node:path";
import type { AnnotationsFile, Manifest } from "../../contracts/content.ts";
import { ROOT, current, read, validate, write } from "../library/index.ts";
import type { Options } from "../options.ts";
import { idCheck, log, refresh, staging } from "./context.ts";
interface RepairRecord {
  id: string;
  sourceAnnotationIds?: string[];
}
export function publish(opts: Options) {
  const id = idCheck(opts.id),
    dir = staging(id);
  refresh(dir);
  const result = validate(dir);
  if (!result.ok) {
    log(result);
    process.exit(1);
  }
  const m = read<Manifest>(path.join(dir, "manifest.json"));
  if (!m.pages.some((p) => p.state === "ready"))
    throw Error("No reviewed ready pages");
  const root = path.join(ROOT, "library", id);
  fs.mkdirSync(root, { recursive: true });
  const lock = path.join(root, ".publish-lock");
  const fd = fs.openSync(lock, "wx");
  try {
    const old = current(id),
      rev = old
        ? read<Manifest>(path.join(old, "manifest.json")).contentRevision
        : 0;
    if (m.baseRevision !== rev)
      throw Error(
        "Stale staging base; another revision was published. Rebase and validate before retry.",
      );
    // Only explicitly authorized repair scopes may change existing accepted pages.
    if (old) {
      const before = read<Manifest>(path.join(old, "manifest.json"));
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
        ] as const)
          if (JSON.stringify(next?.[key]) !== JSON.stringify(p[key]))
            throw Error(
              "Accepted page identity/geometry/state changed: " + p.id,
            );
        for (const f of Object.keys(before.files).filter((f) =>
          f.startsWith(`pages/${p.id}/`),
        )) {
          if (m.files[f] !== before.files[f]) {
            const filename = path.basename(f);
            const isRepair = Boolean(m.repairScope?.includes(p.id));
            const isQuestionAddition =
              Boolean(m.questionAdditionScope?.includes(p.id)) &&
              (filename === "questions.json" || filename === "review.json");
            if (!isRepair && !isQuestionAddition)
              throw Error(
                "Existing accepted page modified without scoped repair: " +
                  p.id,
              );
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
                  "entries.json": "entry" as const,
                  "annotations.json": "annotation" as const,
                  "questions.json": "question" as const,
                }[
                  filename as
                    "entries.json" | "annotations.json" | "questions.json"
                ],
                collection = {
                  entry: "entries",
                  annotation: "annotations",
                  question: "questions",
                }[namespace];
              const oldRecords = read<Record<string, RepairRecord[]>>(
                  path.join(old, f),
                )[collection],
                newRecords = read<Record<string, RepairRecord[]>>(
                  path.join(dir, f),
                )[collection];
              if (isQuestionAddition && !isRepair && filename === "questions.json") {
                if (
                  newRecords.length < oldRecords.length ||
                  oldRecords.some((r) => !newRecords.some((n) => n.id === r.id))
                )
                  throw Error("Question addition must preserve all existing question IDs");
                for (const record of oldRecords) {
                  const replacement = newRecords.find((n) => n.id === record.id);
                  if (JSON.stringify(record) !== JSON.stringify(replacement))
                    throw Error(
                      "Existing question modified during question addition: " +
                        record.id,
                    );
                }
              } else {
                if (
                  oldRecords.length !== newRecords.length ||
                  oldRecords.some((r) => !newRecords.some((n) => n.id === r.id))
                )
                  throw Error("Item repair must preserve stable IDs");
                const targets =
                  m.repairTargets?.filter((t) => t.pageId === p.id) || [];
                const dependentAnnotations = read<AnnotationsFile>(
                  path.join(old, "pages", p.id, "annotations.json"),
                )
                  .annotations.filter((a) =>
                    targets.some(
                      (t) => t.kind === "entry" && t.itemId === a.entryId,
                    ),
                  )
                  .map((a) => a.id);
                for (const record of oldRecords) {
                  const replacement = newRecords.find((n) => n.id === record.id);
                  if (JSON.stringify(record) === JSON.stringify(replacement))
                    continue;
                  const direct = targets.some(
                    (t) => t.kind === namespace && t.itemId === record.id,
                  );
                  const dependent =
                    namespace === "question" &&
                    (record.sourceAnnotationIds || []).some(
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
}
