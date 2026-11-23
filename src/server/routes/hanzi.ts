import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const dataRoot = path.dirname(
  require.resolve("hanzi-writer-data/package.json"),
);

// A single Han character is the only accepted filename; never expose node_modules.
export function serveHanziData(req: IncomingMessage, res: ServerResponse) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (!pathname.startsWith("/hanzi-data/")) return false;
  let character;
  try {
    character = decodeURIComponent(pathname.slice(12).replace(/\.json$/, ""));
  } catch {}
  if (!/^\p{Script=Han}$/u.test(character || "")) {
    res.writeHead(404);
    res.end("Character data unavailable");
    return true;
  }
  const file = path.join(dataRoot, `${character}.json`);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end("Character data unavailable");
    return true;
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(file).pipe(res);
  return true;
}
