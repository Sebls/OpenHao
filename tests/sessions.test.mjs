import test from "node:test";
import assert from "node:assert/strict";
import { parseOptions } from "../src/content/options.ts";
test("CLI option parsing distinguishes flags and values and reports incomplete commands", () => {
  assert.deepEqual(
    parseOptions(["--id", "lesson", "--pages", "1,3", "--ocr"]),
    { id: "lesson", pages: "1,3", ocr: true },
  );
  assert.deepEqual(parseOptions(["--all-pages", "--help"]), {
    "all-pages": true,
    help: true,
  });
  assert.throws(() => parseOptions(["--pages", "--ocr"]), /Provide a value/);
  assert.throws(() => parseOptions(["--unknown"]), /Unknown option/);
  assert.throws(() => parseOptions(["lesson"]), /Expected --option/);
});
