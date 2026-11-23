import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
export const ROOT = path.resolve(process.env.CHINOIS_DATA_ROOT || "data");
export const read = <T = unknown>(p: string): T =>
  JSON.parse(fs.readFileSync(p, "utf8")) as T;
export const write = (p: string, v: unknown) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
};
export const hash = (p: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
export function safe(base: string, rel: unknown) {
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
export function walk(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
    );
}
