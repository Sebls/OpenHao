import path from "node:path";
import { log, python, refresh, staging } from "./commands/context.ts";
import { diagnose } from "./commands/diagnose.ts";
import { extract } from "./commands/extract.ts";
import { lookup } from "./commands/lookup.ts";
import { publish } from "./commands/publish.ts";
import { catalog, hash, validate } from "./library/index.ts";
import { parseOptions } from "./options.ts";
const [command, ...args] = process.argv.slice(2);
try {
  const opts = parseOptions(args);
  if (opts.help || !command) {
    console.log(
      'Commands: inspect --input PDF; extract --input PDF --id ID --pages "1,3-4" [--all-pages] [--ocr]; validate/publish --id ID; list; lookup --ref ID:p0001:annotation:ITEM@r1; repair --ref REF; diagnose --id ID --page 1. Extraction requires npm run setup:extractor. Author/review staged JSON before publication.',
    );
  } else if (command === "inspect") {
    const input = path.resolve(opts.input || "");
    log({
      ...python(["inspect", input]),
      sha256: hash(input),
      bytes: (await import("node:fs")).statSync(input).size,
    });
  } else if (command === "list") log(catalog());
  else if (command === "extract") extract(opts);
  else if (command === "publish") publish(opts);
  else if (command === "lookup" || command === "repair") lookup(opts, command);
  else if (command === "diagnose") diagnose(opts);
  else if (command === "validate") {
    const dir = staging(opts.id);
    refresh(dir);
    const result = validate(dir);
    log(result);
    if (!result.ok) process.exitCode = 1;
  } else throw Error("Unknown command: " + command);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
