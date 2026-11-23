import fs from "node:fs";
import path from "node:path";
import type { Layout } from "../../contracts/content.ts";
import { current, read } from "../library/index.ts";
import type { Options } from "../options.ts";
import { idCheck, log, staging } from "./context.ts";
export function diagnose(opts: Options) {
  const id = idCheck(opts.id);
  const dir = fs.existsSync(staging(id)) ? staging(id) : current(id);
  if (!dir) throw Error("Document not found");
  const p = `p${String(Number(opts.page || 1)).padStart(4, "0")}`,
    base = path.join(dir, "pages", p),
    layout = read<Layout>(path.join(base, "layout.json"));
  const rects = layout.characters
    .filter((c) => c.exactText.trim())
    .map(
      (c) =>
        `<rect x="${c.rect[0] * 100}%" y="${c.rect[1] * 100}%" width="${c.rect[2] * 100}%" height="${c.rect[3] * 100}%"/>`,
    )
    .join("");
  fs.writeFileSync(
    path.join(base, "diagnostic.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}"><image href="source.png" width="100%" height="100%"/><g fill="none" stroke="#b00020" stroke-width="0.4">${rects}</g></svg>`,
  );
  log({ diagnostic: path.join(base, "diagnostic.svg") });
}
