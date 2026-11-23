import fs from "node:fs";
import path from "node:path";
import type { Catalog, Manifest } from "../../contracts/content.ts";
import { validate } from "../validation/validate.ts";
import { ROOT, read } from "./files.ts";
export function current(id: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id || ""))
    throw Error(
      "Use a lowercase document ID with letters, numbers and hyphens",
    );
  const pointer = path.join(ROOT, "library", id, "current.json");
  if (!fs.existsSync(pointer)) return null;
  const { revision } = read<{ revision: number }>(pointer);
  return path.join(ROOT, "library", id, "revisions", String(revision));
}
export function catalog(): Catalog {
  const base = path.join(ROOT, "library");
  if (!fs.existsSync(base)) return { documents: [], issues: [] };
  const documents: Manifest[] = [],
    issues: Catalog["issues"] = [];
  for (const id of fs.readdirSync(base)) {
    try {
      const dir = current(id);
      if (!dir) continue;
      const result = validate(dir);
      if (!result.ok)
        throw Error(result.issues.map((x) => x.message).join("; "));
      documents.push(read<Manifest>(path.join(dir, "manifest.json")));
    } catch (e) {
      issues.push({
        documentId: id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { documents, issues };
}
