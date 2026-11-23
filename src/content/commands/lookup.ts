import path from "node:path";
import type {
  Annotation,
  Entry,
  ItemKind,
  Layout,
  Manifest,
  Question,
  QuestionsFile,
} from "../../contracts/content.ts";
import { current, read, write } from "../library/index.ts";
import type { Options } from "../options.ts";
import { log, stageExisting } from "./context.ts";
export function lookup(opts: Options, command: "lookup" | "repair") {
  const match = String(opts.ref || "").match(
    /^([a-z0-9-]+):(p\d{4}):(annotation|entry|question):([^:@]+)@r(\d+)$/,
  );
  if (!match) throw Error("Invalid correction reference");
  const [, id, pageId, matchedKind, itemId, observed] = match;
  const kind = matchedKind as ItemKind;
  const dir = command === "repair" ? stageExisting(id) : current(id);
  if (!dir) throw Error("Document not found");
  const file = path.join(
      dir,
      "pages",
      pageId,
      kind === "entry" ? "entries.json" : kind + "s.json",
    ),
    collection = kind === "entry" ? "entries" : kind + "s",
    data = read<Record<string, (Entry | Annotation | Question)[]>>(file),
    record = data[collection].find((r) => r.id === itemId);
  if (!record) throw Error("Stable item ID not found");
  const m = read<Manifest>(path.join(dir, "manifest.json"));
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
    source: read<Layout>(path.join(dir, "pages", pageId, "layout.json")).lines,
    dependentQuestions: read<QuestionsFile>(
      path.join(dir, "pages", pageId, "questions.json"),
    ).questions.filter(
      (q) =>
        q.sourceAnnotationIds?.includes(itemId) || q.entryIds?.includes(itemId),
    ),
  });
}
