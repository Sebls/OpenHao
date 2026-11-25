import test from "node:test";
import assert from "node:assert/strict";
import {
  computeQuestionWeight,
  selectNextQuestion,
} from "../src/client/features/practice/engine.ts";
import {
  createEmptyHistory,
  extractQuestionHanzi,
  loadPracticeHistory,
  PRACTICE_HISTORY_STORAGE_KEY,
  recordAnswer,
  savePracticeHistory,
  topicStatsSummary,
} from "../src/client/features/practice/history.ts";
import { practiceReducer } from "../src/client/features/practice/session.ts";
import { questionTopic } from "../src/client/features/practice/topics.ts";

function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

function makeQuestion(overrides = {}) {
  return {
    id: overrides.id ?? "q-1",
    type: "single-choice",
    category: overrides.category ?? "zh-to-en",
    ...(overrides.topic !== undefined ? { topic: overrides.topic } : {}),
    prompt: overrides.prompt ?? "What does 你好 mean?",
    promptLanguage: "en",
    options: overrides.options ?? [
      { id: "a", text: "Hello" },
      { id: "b", text: "Goodbye" },
    ],
    correctOptionId: overrides.correctOptionId ?? "a",
    explanation: "你好 means hello.",
    explanationLanguage: "en",
    sourceAnnotationIds: overrides.sourceAnnotationIds ?? ["ann-1"],
    ...(overrides.entryIds ? { entryIds: overrides.entryIds } : {}),
    requiresAudio: false,
    ...(overrides.speechTarget ? { speechTarget: overrides.speechTarget } : {}),
    origin: "agent-authored",
    reviewStatus: "reviewed",
    pageId: overrides.pageId ?? "p0001",
  };
}

const samplePages = {
  p0001: {
    entries: {
      entries: [
        { id: "e-nihao", form: "你好" },
        { id: "e-xiexie", form: "谢谢" },
        { id: "e-shu", form: "书" },
      ],
    },
    annotations: {
      annotations: [
        { id: "ann-1", entryId: "e-nihao" },
        { id: "ann-2", entryId: "e-xiexie" },
        { id: "ann-3", entryId: "e-shu" },
      ],
    },
  },
};

test("browser storage read/write and Hanzi extraction across prompt, speechTarget, entries, and options", () => {
  const storage = makeMemoryStorage();
  assert.deepEqual(loadPracticeHistory(storage), createEmptyHistory());

  const q = makeQuestion({
    id: "q-hanzi",
    topic: "Greetings ",
    prompt: "Listen and match 好",
    speechTarget: "你们",
    entryIds: ["e-xiexie"],
    sourceAnnotationIds: ["ann-1"],
    options: [
      { id: "a", text: "再见" },
      { id: "b", text: "English option" },
    ],
  });

  const hanzi = extractQuestionHanzi(q, samplePages);
  assert.deepEqual(
    new Set(hanzi),
    new Set(["好", "你", "们", "谢", "再", "见"]),
  );

  const now = 1_700_000_000_000;
  let history = loadPracticeHistory(storage);
  history = recordAnswer(history, q, false, samplePages, now);
  savePracticeHistory(history, storage);

  const reloaded = loadPracticeHistory(storage);
  assert.equal(reloaded.questions["q-hanzi"].attempts, 1);
  assert.equal(reloaded.questions["q-hanzi"].incorrect, 1);
  assert.equal(reloaded.questions["q-hanzi"].lastAnsweredAt, now);
  assert.equal(reloaded.topics["greetings"].incorrect, 1);
  assert.equal(reloaded.characters["好"].incorrect, 1);
  assert.equal(reloaded.characters["谢"].incorrect, 1);

  // Corrupt storage falls back cleanly to empty history
  storage.setItem(PRACTICE_HISTORY_STORAGE_KEY, "{bad-json");
  assert.deepEqual(loadPracticeHistory(storage), createEmptyHistory());
});

test("topic normalization falls back to category and summarizes mastery", () => {
  const q1 = makeQuestion({ id: "q1", topic: "Daily Routines" });
  const q2 = makeQuestion({ id: "q2", category: "grammar-comprehension" });
  assert.equal(questionTopic(q1), "daily-routines");
  assert.equal(questionTopic(q2), "grammar-comprehension");

  let history = createEmptyHistory();
  history = recordAnswer(history, q1, true, samplePages, 1000);
  history = recordAnswer(history, q1, false, samplePages, 2000);
  const summary = topicStatsSummary([q1, q2], history);
  assert.equal(summary.length, 2);
  assert.equal(summary[0].topic, "daily-routines");
  assert.equal(summary[0].mastery, 0.5);
  assert.equal(summary[1].topic, "grammar-comprehension");
  assert.equal(summary[1].attempts, 0);
  assert.notEqual(summary[0].color, summary[1].color);
});

test("weighted-random engine favors weak topics, weak Hanzi, and older questions while keeping known items reachable", () => {
  const now = 1_700_000_000_000;
  const qKnown = makeQuestion({
    id: "q-known",
    topic: "numbers",
    prompt: "What is 一?",
    options: [
      { id: "a", text: "One" },
      { id: "b", text: "Two" },
    ],
    sourceAnnotationIds: [],
  });
  const qWeakTopic = makeQuestion({
    id: "q-weak-topic",
    topic: "tones",
    prompt: "Which tone is mā?",
    options: [
      { id: "a", text: "First" },
      { id: "b", text: "Second" },
    ],
    sourceAnnotationIds: [],
  });
  const qSharedHanzi = makeQuestion({
    id: "q-shared-hanzi",
    topic: "numbers",
    category: "character-identification",
    prompt: "Identify 书 in this sentence.",
    options: [
      { id: "a", text: "Book" },
      { id: "b", text: "Pen" },
    ],
    sourceAnnotationIds: ["ann-3"],
  });

  let history = createEmptyHistory();
  // Master "numbers" and answer qKnown very recently
  history = recordAnswer(history, qKnown, true, samplePages, now - 5_000);
  history = recordAnswer(history, qKnown, true, samplePages, now - 1_000);
  // Miss "tones"
  history = recordAnswer(
    history,
    qWeakTopic,
    false,
    samplePages,
    now - 600_000,
  );
  // Miss a different question containing 书
  const qMissedShu = makeQuestion({
    id: "q-missed-shu",
    topic: "reading",
    prompt: "Translate 书",
    sourceAnnotationIds: ["ann-3"],
    options: [
      { id: "a", text: "Book" },
      { id: "b", text: "Tree" },
    ],
  });
  history = recordAnswer(
    history,
    qMissedShu,
    false,
    samplePages,
    now - 300_000,
  );

  const wKnown = computeQuestionWeight(qKnown, history, samplePages, now);
  const wWeakTopic = computeQuestionWeight(
    qWeakTopic,
    history,
    samplePages,
    now,
  );
  const wSharedHanzi = computeQuestionWeight(
    qSharedHanzi,
    history,
    samplePages,
    now,
  );

  assert.ok(wKnown >= 0.1, "known questions retain non-zero floor weight");
  assert.ok(wWeakTopic > wKnown, "weak topic outweighs mastered recent item");
  assert.ok(
    wSharedHanzi > wKnown,
    "weak Hanzi character boosts another question containing that character",
  );

  // Older question outweighs just-answered question in the same topic
  const qOlder = makeQuestion({
    id: "q-older",
    topic: "numbers",
    prompt: "What is 二?",
    options: [
      { id: "a", text: "Two" },
      { id: "b", text: "Three" },
    ],
    sourceAnnotationIds: [],
  });
  history = recordAnswer(history, qOlder, true, samplePages, now - 3_600_000);
  const wOlder = computeQuestionWeight(qOlder, history, samplePages, now);
  assert.ok(wOlder > wKnown, "older question outweighs recently answered one");

  // Never picks lastQuestionId back-to-back when other questions exist
  const bank = [qKnown, qWeakTopic, qSharedHanzi];
  for (let r = 0; r < 1; r += 0.1) {
    const picked = selectNextQuestion(bank, history, samplePages, {
      lastQuestionId: "q-weak-topic",
      now,
      random: () => r,
    });
    assert.notEqual(picked?.id, "q-weak-topic");
  }

  // Known question is still reachable at low random roll
  const pickedKnown = selectNextQuestion(
    [qKnown, qWeakTopic],
    history,
    samplePages,
    { now, random: () => 0.001 },
  );
  assert.equal(pickedKnown?.id, "q-known");
});

test("fixed-length and infinite session reducer transitions", () => {
  const q1 = makeQuestion({ id: "q1" });
  const q2 = makeQuestion({ id: "q2" });
  const q3 = makeQuestion({ id: "q3" });

  // Fixed-length mode for 2 questions
  let fixed = practiceReducer(null, {
    type: "start",
    questions: [q1],
    mode: "fixed",
    targetCount: 2,
  });
  assert.equal(fixed.mode, "fixed");
  assert.equal(fixed.targetCount, 2);
  assert.equal(fixed.finished, false);

  fixed = practiceReducer(fixed, { type: "choose", optionId: "b" });
  fixed = practiceReducer(fixed, { type: "check" });
  fixed = practiceReducer(fixed, { type: "next", nextQuestion: q2 });
  assert.equal(fixed.index, 1);
  assert.equal(fixed.finished, false);

  fixed = practiceReducer(fixed, { type: "choose", optionId: "a" });
  fixed = practiceReducer(fixed, { type: "check" });
  fixed = practiceReducer(fixed, { type: "next", nextQuestion: q3 });
  assert.equal(fixed.finished, true);
  assert.equal(fixed.records.length, 2);

  // Infinite mode appends dynamically and finishes on explicit finish action
  let inf = practiceReducer(null, {
    type: "start",
    questions: [q1],
    mode: "infinite",
    targetCount: null,
  });
  assert.equal(inf.mode, "infinite");
  assert.equal(inf.targetCount, null);

  inf = practiceReducer(inf, { type: "choose", optionId: "a" });
  inf = practiceReducer(inf, { type: "check" });
  inf = practiceReducer(inf, { type: "next", nextQuestion: q2 });
  assert.equal(inf.index, 1);
  assert.equal(inf.finished, false);

  inf = practiceReducer(inf, { type: "choose", optionId: "b" });
  inf = practiceReducer(inf, { type: "check" });
  inf = practiceReducer(inf, { type: "finish" });
  assert.equal(inf.finished, true);
  assert.equal(inf.records.length, 2);

  const retry = practiceReducer(inf, { type: "retry" });
  assert.equal(retry.mode, "fixed");
  assert.equal(retry.targetCount, 1);
  assert.deepEqual(
    retry.questions.map((q) => q.id),
    ["q2"],
  );
});
