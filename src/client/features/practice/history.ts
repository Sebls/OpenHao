import type { PageContent, Question } from "../../../contracts/content.ts";
import { formatTopicLabel, questionTopic, topicColor } from "./topics.ts";

export const PRACTICE_HISTORY_STORAGE_KEY = "openhao.practice.history.v1";

const HANZI_RE = /[\u3400-\u9fff]/g;

export interface StatRecord {
  attempts: number;
  correct: number;
  incorrect: number;
  lastAnsweredAt: number;
}

export interface PracticeHistory {
  version: 1;
  questions: Record<string, StatRecord>;
  topics: Record<string, StatRecord>;
  characters: Record<string, StatRecord>;
}

export interface TopicSummary {
  topic: string;
  label: string;
  color: string;
  attempts: number;
  correct: number;
  incorrect: number;
  mastery: number;
  lastAnsweredAt: number | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createEmptyHistory(): PracticeHistory {
  return {
    version: 1,
    questions: {},
    topics: {},
    characters: {},
  };
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : null;
  } catch {
    return null;
  }
}

function sanitizeRecords(raw: unknown): Record<string, StatRecord> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, StatRecord> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val !== "object") continue;
    const rec = val as Partial<StatRecord>;
    if (
      typeof rec.attempts === "number" &&
      typeof rec.correct === "number" &&
      typeof rec.incorrect === "number" &&
      typeof rec.lastAnsweredAt === "number"
    ) {
      result[key] = {
        attempts: Math.max(0, rec.attempts),
        correct: Math.max(0, rec.correct),
        incorrect: Math.max(0, rec.incorrect),
        lastAnsweredAt: rec.lastAnsweredAt,
      };
    }
  }
  return result;
}

export function loadPracticeHistory(
  storage: StorageLike | null = defaultStorage(),
): PracticeHistory {
  if (!storage) return createEmptyHistory();
  try {
    const raw = storage.getItem(PRACTICE_HISTORY_STORAGE_KEY);
    if (!raw) return createEmptyHistory();
    const parsed = JSON.parse(raw) as Partial<PracticeHistory>;
    if (!parsed || parsed.version !== 1) return createEmptyHistory();
    return {
      version: 1,
      questions: sanitizeRecords(parsed.questions),
      topics: sanitizeRecords(parsed.topics),
      characters: sanitizeRecords(parsed.characters),
    };
  } catch {
    return createEmptyHistory();
  }
}

export function savePracticeHistory(
  history: PracticeHistory,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(PRACTICE_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage quota or private-browsing write errors.
  }
}

function addHanziFromText(text: string | undefined, out: Set<string>): void {
  if (!text) return;
  const matches = text.match(HANZI_RE);
  if (!matches) return;
  for (const ch of matches) {
    out.add(ch);
  }
}

/**
 * Extracts all unique Hanzi characters (U+3400..U+9FFF) present in a question's
 * prompt, speechTarget, linked entry forms, and option texts.
 */
export function extractQuestionHanzi(
  question: Pick<
    Question,
    | "prompt"
    | "speechTarget"
    | "options"
    | "entryIds"
    | "sourceAnnotationIds"
    | "pageId"
  >,
  pages: Record<string, PageContent>,
): string[] {
  const chars = new Set<string>();
  addHanziFromText(question.prompt, chars);
  addHanziFromText(question.speechTarget, chars);
  for (const option of question.options || []) {
    addHanziFromText(option.text, chars);
  }

  const pageList =
    question.pageId && pages[question.pageId]
      ? [pages[question.pageId], ...Object.values(pages)]
      : Object.values(pages);

  const entryIds = new Set(question.entryIds || []);
  const annIds = new Set(question.sourceAnnotationIds || []);

  if (entryIds.size > 0 || annIds.size > 0) {
    for (const page of pageList) {
      const entries = page.entries?.entries || [];
      const annotations = page.annotations?.annotations || [];
      for (const ann of annotations) {
        if (annIds.has(ann.id) && ann.entryId) {
          entryIds.add(ann.entryId);
        }
      }
      for (const entry of entries) {
        if (entryIds.has(entry.id)) {
          addHanziFromText(entry.form, chars);
        }
      }
    }
  }

  return [...chars];
}

function incrementStat(
  existing: StatRecord | undefined,
  correct: boolean,
  now: number,
): StatRecord {
  return {
    attempts: (existing?.attempts ?? 0) + 1,
    correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
    incorrect: (existing?.incorrect ?? 0) + (correct ? 0 : 1),
    lastAnsweredAt: now,
  };
}

/** Returns a new PracticeHistory updated with the outcome of answering `question`. */
export function recordAnswer(
  history: PracticeHistory,
  question: Question,
  correct: boolean,
  pages: Record<string, PageContent>,
  now = Date.now(),
): PracticeHistory {
  const topic = questionTopic(question);
  const hanzi = extractQuestionHanzi(question, pages);

  const nextCharacters = { ...history.characters };
  for (const ch of hanzi) {
    nextCharacters[ch] = incrementStat(nextCharacters[ch], correct, now);
  }

  return {
    version: 1,
    questions: {
      ...history.questions,
      [question.id]: incrementStat(
        history.questions[question.id],
        correct,
        now,
      ),
    },
    topics: {
      ...history.topics,
      [topic]: incrementStat(history.topics[topic], correct, now),
    },
    characters: nextCharacters,
  };
}

/** Computes per-topic mastery summaries for all topics present in `questions`. */
export function topicStatsSummary(
  questions: readonly Question[],
  history: PracticeHistory,
  language: "en" | "fr" = "en",
): TopicSummary[] {
  const seenTopics: string[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    const t = questionTopic(q);
    if (!seen.has(t)) {
      seen.add(t);
      seenTopics.push(t);
    }
  }

  return seenTopics.map((topic, index) => {
    const stats = history.topics[topic];
    const attempts = stats?.attempts ?? 0;
    const correct = stats?.correct ?? 0;
    const incorrect = stats?.incorrect ?? 0;
    const mastery = attempts > 0 ? correct / attempts : 0;
    return {
      topic,
      label: formatTopicLabel(topic, language),
      color: topicColor(topic, index),
      attempts,
      correct,
      incorrect,
      mastery,
      lastAnsweredAt: stats?.lastAnsweredAt ?? null,
    };
  });
}
