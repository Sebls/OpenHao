import test from "node:test";
import assert from "node:assert/strict";
import { practiceReducer } from "../src/client/features/practice/session.ts";
import {
  createWritingSession,
  writingReducer,
} from "../src/client/features/writing/model.ts";
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
test("writing actions keep repeated occurrences independent and reset attempts without losing source identity", () => {
  const source = { id: "a-repeat" };
  const entry = { form: "人人", meaning: "people", kind: "word" };
  let session = createWritingSession(entry, source, "p0001");
  const original = structuredClone(session);
  session = writingReducer(session, { type: "stroke", index: 0, stroke: 1 });
  session = writingReducer(session, { type: "mistake", index: 1 });
  session = writingReducer(session, { type: "complete", index: 0 });
  assert.equal(session.progress[0].completed, true);
  assert.equal(session.progress[1].stroke, 0);
  assert.equal(session.progress[1].mistakes, 1);
  assert.equal(original.progress[0].stroke, 0);
  session = writingReducer(session, { type: "restart-character", index: 0 });
  assert.equal(session.progress[0].attempt, 1);
  assert.equal(session.progress[1].mistakes, 1);
  session = writingReducer(session, { type: "restart" });
  assert.deepEqual(session.sourceAnnotationIds, ["a-repeat"]);
  assert.equal(session.pageId, "p0001");
  assert.equal(session.attempt, 1);
  assert.ok(
    session.progress.every(
      (p) => !p.completed && p.stroke === 0 && p.mistakes === 0,
    ),
  );
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
