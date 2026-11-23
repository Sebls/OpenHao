import fs from "node:fs";
import path from "node:path";
import type { Manifest } from "../../contracts/content.ts";
import {
  ROOT,
  catalog,
  current,
  hash,
  read,
  safe,
  write,
} from "../library/index.ts";
import type { Options } from "../options.ts";
import {
  idCheck,
  log,
  parsePages,
  python,
  refresh,
  stageExisting,
  staging,
} from "./context.ts";
export function extract(opts: Options) {
  let id = opts.id && idCheck(opts.id),
    existing = id && current(id);
  const source = opts.input && path.resolve(opts.input);
  if (source) {
    const sha = hash(source);
    const match = catalog().documents.find((m) => m.source.sha256 === sha);
    if (match) {
      id = match.documentId;
      existing = current(id);
    }
  }
  if (!id) throw Error("Provide --id for a new source");
  const dir = staging(id);
  let m: Manifest;
  if (fs.existsSync(dir)) m = read<Manifest>(path.join(dir, "manifest.json"));
  else if (existing) {
    const published = read<Manifest>(path.join(existing, "manifest.json"));
    const requested = parsePages(
      opts.pages,
      published.source.pageCount,
      opts["all-pages"],
    );
    if (source && hash(source) !== published.source.sha256)
      throw Error("Changed source bytes; use a new document ID");
    if (requested.every((n) => published.pages[n - 1].state === "ready")) {
      log({
        id,
        added: [],
        skipped: requested,
        unchangedRevision: published.contentRevision,
      });
      process.exit(0);
    }
    stageExisting(id);
    m = read<Manifest>(path.join(dir, "manifest.json"));
  } else {
    if (!source) throw Error("Provide --input for a new document");
    const info = python(["inspect", source]);
    parsePages(opts.pages, info.pageCount, opts["all-pages"]);
    const pdf = path.join(ROOT, "pdfs", id + ".pdf");
    fs.mkdirSync(path.dirname(pdf), { recursive: true });
    if (fs.existsSync(pdf) && hash(pdf) !== hash(source))
      throw Error("Original PDF identity conflict");
    if (!fs.existsSync(pdf))
      fs.copyFileSync(source, pdf, fs.constants.COPYFILE_EXCL);
    m = {
      schemaVersion: "1.0",
      documentId: id,
      contentRevision: 1,
      baseRevision: 0,
      title: opts.title || info.title || path.basename(source, ".pdf"),
      sourceLanguage: "zh-CN",
      translationLanguage: "en",
      source: {
        pathBase: "data-root",
        path: `pdfs/${id}.pdf`,
        sha256: hash(pdf),
        bytes: fs.statSync(pdf).size,
        pageCount: info.pageCount,
      },
      pages: info.pages.map((p) => ({
        ...p,
        id: `p${String(p.pageNumber).padStart(4, "0")}`,
        state: "not-prepared",
        questionAvailability: [],
      })),
      files: {},
      learningProfile: read<Record<string, unknown>>(
        "config/learning-profile.json",
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: { extractor: "PyMuPDF", version: info.tool },
    };
  }
  if (source && hash(source) !== m.source.sha256)
    throw Error("Changed source bytes; use a new document ID");
  const requested = parsePages(
      opts.pages,
      m.source.pageCount,
      opts["all-pages"],
    ),
    added = [],
    skipped = [];
  write(path.join(dir, "manifest.json"), m);
  for (const n of requested) {
    const p = m.pages[n - 1];
    if (p.state !== "not-prepared") {
      skipped.push(n);
      continue;
    }
    const tmp = fs.mkdtempSync(path.join(dir, `.extract-${p.id}-`));
    try {
      python([
        "extract",
        safe(ROOT, m.source.path),
        String(n),
        tmp,
        id,
        "1",
        opts.ocr ? "ocr" : "embedded",
      ]);
      const target = path.join(dir, "pages", p.id);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.renameSync(tmp, target);
    } finally {
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
    }
    p.state = "extracted";
    p.extractionRevision = 1;
    added.push(n);
    write(path.join(dir, "manifest.json"), m);
  }
  if (
    !added.length &&
    existing &&
    !fs.existsSync(path.join(dir, "manifest.json"))
  ) {
    log({ id, added, skipped });
  } else {
    write(path.join(dir, "manifest.json"), m);
    refresh(dir);
    log({
      id,
      added,
      skipped,
      staging: dir,
      next: "Inspect source.png and text.txt; author entries/annotations/questions, review.json, and set reviewed page state ready. Validate then publish.",
    });
  }
}
