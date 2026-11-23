import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

test("bundled character-history metadata resolves unchanged local glyphs for each supported character", () => {
  const base = "src/client/features/learning-details/history";
  const characters = new Set();
  for (const directory of fs.readdirSync(base)) {
    const entry = JSON.parse(
      fs.readFileSync(path.join(base, directory, "entry.json"), "utf8"),
    );
    assert.ok(entry.characters.length > 0);
    for (const character of entry.characters) {
      assert.equal(
        characters.has(character),
        false,
        `Duplicate history for ${character}`,
      );
      characters.add(character);
    }
    for (const form of entry.forms) {
      const glyph = fs.readFileSync(
        path.join("public/hanzi-history", directory, form.file),
      );
      assert.equal(
        createHash("sha256").update(glyph).digest("hex"),
        form.sha256,
        form.file,
      );
    }
    if (entry.meaning)
      assert.ok(
        fs.existsSync(
          path.join("public/hanzi-history", directory, "meaning.svg"),
        ),
      );
  }
  assert.ok(characters.has("你"));
});
