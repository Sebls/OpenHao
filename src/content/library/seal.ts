import path from "node:path";
import type { Manifest } from "../../contracts/content.ts";
import { hash, read, walk, write } from "./files.ts";
export function seal(dir: string) {
  const m = read<Manifest>(path.join(dir, "manifest.json"));
  m.files = {};
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join("/");
    if (rel !== "manifest.json" && !rel.startsWith("."))
      m.files[rel] = hash(file);
  }
  write(path.join(dir, "manifest.json"), m);
  return m;
}
