import test from "node:test";
import assert from "node:assert/strict";
import { practiceReducer } from "../src/client/features/practice/session.ts";
import { parseOptions } from "../src/content/options.ts";
const question = (id) => ({
  id,
  correctOptionId: "right",
  options: [
    { id: "wrong", text: "No" },
    { id: "right", text: "Yes" },
  ],
});
test("practice transitions retain answer IDs, block changes after checking, and retry only mistakes", () => {
  const bank = [question("one"), question("two")];
  const snapshot = JSON.stringify(bank);
  let session = practiceReducer(null, { type: "start", questions: bank });
  assert.equal(practiceReducer(session, { type: "next" }), session);
  assert.equal(practiceReducer(session, { type: "check" }), session);
  assert.equal(
    practiceReducer(session, { type: "choose", optionId: "unknown" }),
    session,
  );
  session = practiceReducer(session, { type: "choose", optionId: "wrong" });
  session = practiceReducer(session, { type: "check" });
  assert.equal(
    practiceReducer(session, { type: "choose", optionId: "right" }),
    session,
  );
  session = practiceReducer(session, { type: "next" });
  session = practiceReducer(session, { type: "choose", optionId: "right" });
  session = practiceReducer(session, { type: "check" });
  session = practiceReducer(session, { type: "next" });
  assert.deepEqual(session.answers, { one: "wrong", two: "right" });
  const retry = practiceReducer(session, { type: "retry" });
  assert.deepEqual(
    retry.questions.map((q) => q.id),
    ["one"],
  );
  assert.equal(retry.questions[0].correctOptionId, "right");
  assert.deepEqual(retry.answers, {});
  assert.equal(
    JSON.stringify(bank),
    snapshot,
    "prepared questions must never be mutated",
  );
  assert.equal(practiceReducer(retry, { type: "clear" }), null);
});
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
