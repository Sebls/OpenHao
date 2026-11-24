import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { PageContent } from "../contracts/content.ts";
import { catalog } from "./library/catalog.ts";
import { ROOT, read, safe } from "./library/files.ts";

const require = createRequire(import.meta.url);
const outDir = path.resolve("dist");

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

export function exportStatic(targetDir = outDir) {
  const cat = catalog();
  writeJson(path.join(targetDir, "api", "catalog.json"), cat);

  for (const m of cat.documents) {
    const revDir = path.join(
      ROOT,
      "library",
      m.documentId,
      "revisions",
      String(m.contentRevision),
    );
    const pages: Record<string, PageContent> = {};
    for (const p of m.pages) {
      if (p.state !== "ready") continue;
      const b = path.join(revDir, "pages", p.id);
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
    writeJson(
      path.join(
        targetDir,
        "api",
        "document",
        m.documentId,
        `${m.contentRevision}.json`,
      ),
      { manifest: m, pages },
    );

    const pdfSrc = safe(ROOT, m.source.path);
    const pdfDest = path.join(
      targetDir,
      "pdf",
      m.documentId,
      `${m.contentRevision}.pdf`,
    );
    fs.mkdirSync(path.dirname(pdfDest), { recursive: true });
    fs.copyFileSync(pdfSrc, pdfDest);
  }

  const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
  for (const sub of ["cmaps", "standard_fonts", "wasm"]) {
    copyDir(path.join(pdfjsRoot, sub), path.join(targetDir, "pdfjs", sub));
  }

  const hanziRoot = path.dirname(
    require.resolve("hanzi-writer-data/package.json"),
  );
  const hanziDest = path.join(targetDir, "hanzi-data");
  fs.mkdirSync(hanziDest, { recursive: true });
  for (const file of fs.readdirSync(hanziRoot)) {
    if (/^\p{Script=Han}\.json$/u.test(file)) {
      fs.copyFileSync(path.join(hanziRoot, file), path.join(hanziDest, file));
    }
  }

  fs.writeFileSync(path.join(targetDir, ".nojekyll"), "");
  const indexHtml = path.join(targetDir, "index.html");
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, path.join(targetDir, "404.html"));
  }

  console.log(
    `Exported ${cat.documents.length} documents and static assets to ${targetDir}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportStatic();
}
