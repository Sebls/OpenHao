import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { ROOT, read, safe, catalog } from "./library.mjs";
import { serveHanziData } from "./hanzi-data.mjs";
const port = Number(process.env.PORT || 4173);
let cached = { documents: [], issues: [] },
  fingerprint = "";
const valid = new Map();
function scan() {
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
scan();
setInterval(scan, 2000).unref();
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".bcmap": "application/octet-stream",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};
function sendFile(req, res, file) {
  const size = fs.statSync(file).size;
  res.setHeader(
    "Content-Type",
    mime[path.extname(file)] || "application/octet-stream",
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-cache");
  let start = 0,
    end = size - 1;
  if (req.headers.range) {
    const match = req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
    if (!match) {
      res.writeHead(416);
      return res.end();
    }
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), end) : end;
    if (start > end || start >= size) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      return res.end();
    }
    res.statusCode = 206;
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  res.setHeader("Content-Length", end - start + 1);
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file, { start, end }).pipe(res);
}
const server = http.createServer((req, res) => {
  try {
    if (
      req.headers.host &&
      !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host)
    ) {
      res.writeHead(403);
      return res.end("Local access only");
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    );
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (serveHanziData(req, res)) return;
    if (pathname === "/api/catalog") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      return res.end(JSON.stringify(scan()));
    }
    const match = pathname.match(/^\/api\/document\/([a-z0-9-]+)\/(\d+)$/);
    if (match) {
      const m = valid.get(`${match[1]}/${match[2]}`);
      if (!m) throw Error("Unknown validated revision");
      const dir = path.join(
        ROOT,
        "library",
        m.documentId,
        "revisions",
        String(m.contentRevision),
      );
      const pages = {};
      for (const p of m.pages) {
        if (p.state !== "ready") continue;
        const b = path.join(dir, "pages", p.id);
        pages[p.id] = {
          text: fs.readFileSync(path.join(b, "text.txt"), "utf8"),
          ...Object.fromEntries(
            ["layout", "entries", "annotations", "questions", "review"].map(
              (n) => [n, read(path.join(b, n + ".json"))],
            ),
          ),
        };
      }
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ manifest: m, pages }));
    }
    const asset = pathname.match(/^\/content\/([a-z0-9-]+)\/(\d+)\/(.+)$/);
    if (asset) {
      const m = valid.get(`${asset[1]}/${asset[2]}`);
      if (!m || !(asset[3] in m.files)) throw Error("Unknown validated asset");
      return sendFile(
        req,
        res,
        safe(
          path.join(ROOT, "library", m.documentId, "revisions", asset[2]),
          asset[3],
        ),
      );
    }
    const pdf = pathname.match(/^\/pdf\/([a-z0-9-]+)\/(\d+)$/);
    if (pdf) {
      const m = valid.get(`${pdf[1]}/${pdf[2]}`);
      if (!m) throw Error("Unknown source");
      return sendFile(req, res, safe(ROOT, m.source.path));
    }
    if (pathname.startsWith("/pdfjs/")) {
      return sendFile(
        req,
        res,
        safe(path.resolve("node_modules/pdfjs-dist"), pathname.slice(7)),
      );
    }
    const local =
      pathname === "/"
        ? path.resolve("dist/index.html")
        : safe(path.resolve("dist"), pathname.slice(1));
    if (!fs.existsSync(local) || !fs.statSync(local).isFile()) {
      res.writeHead(404);
      return res.end("Not found");
    }
    sendFile(req, res, local);
  } catch (e) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Unavailable: " + e.message);
  }
});
server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE"
      ? "That port is already in use. Open the existing library, or choose another PORT."
      : `The library could not start: ${e.message}`,
  );
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Study library: http://localhost:${server.address().port}\nKeep this window open. Press Ctrl+C to stop.`,
  ),
);
