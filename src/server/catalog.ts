import fs from "node:fs";
import path from "node:path";
import { catalog } from "../content/library/catalog.ts";
import { ROOT } from "../content/library/files.ts";
import type { Catalog, Manifest } from "../contracts/content.ts";
let cached: Catalog = { documents: [], issues: [] },
  fingerprint = "";
export const valid = new Map<string, Manifest>();
export function scan() {
  const root = path.join(ROOT, "library");
  const key = fs.existsSync(root)
    ? fs
        .readdirSync(root)
        .sort()
        .map((id) => {
          try {
            return (
              id + fs.readFileSync(path.join(root, id, "current.json"), "utf8")
            );
          } catch {
            return id;
          }
        })
        .join("|")
    : "";
  if (key !== fingerprint || !fingerprint) {
    cached = catalog();
    fingerprint = key;
    for (const m of cached.documents)
      valid.set(`${m.documentId}/${m.contentRevision}`, m);
  }
  return cached;
}
