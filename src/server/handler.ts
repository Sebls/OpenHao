import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { ROOT, read, safe } from "../content/library/files.ts";
import type { PageContent } from "../contracts/content.ts";
import { scan, valid } from "./catalog.ts";
import { sendFile } from "./http/sendFile.ts";
import { serveHanziData } from "./routes/hanzi.ts";
export function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    if (
      req.headers.host &&
      !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host)
    ) {
      res.writeHead(403);
      return res.end("Local access only");
    }
    if (!["GET", "HEAD"].includes(req.method || "")) {
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
      new URL(req.url || "/", "http://localhost").pathname,
    );
    if (serveHanziData(req, res)) return;
    if (pathname === "/api/catalog" || pathname === "/api/catalog.json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      return res.end(JSON.stringify(scan()));
    }
    const match = pathname.match(
      /^\/api\/document\/([a-z0-9-]+)\/(\d+)(?:\.json)?$/,
    );
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
      const pages: Record<string, PageContent> = {};
      for (const p of m.pages) {
        if (p.state !== "ready") continue;
        const b = path.join(dir, "pages", p.id);
        pages[p.id] = {
          text: fs.readFileSync(path.join(b, "text.txt"), "utf8"),
          layout: read<PageContent["layout"]>(path.join(b, "layout.json")),
          entries: read<PageContent["entries"]>(path.join(b, "entries.json")),
          annotations: read<PageContent["annotations"]>(
            path.join(b, "annotations.json"),
          ),
          questions: read<PageContent["questions"]>(
            path.join(b, "questions.json"),
          ),
          review: read<PageContent["review"]>(path.join(b, "review.json")),
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
    const pdf = pathname.match(/^\/pdf\/([a-z0-9-]+)\/(\d+)(?:\.pdf)?$/);
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
    res.end("Unavailable: " + (e instanceof Error ? e.message : String(e)));
  }
}
