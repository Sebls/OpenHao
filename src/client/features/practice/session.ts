import type { Question } from "../../../contracts/content.ts";
import { isCorrect, shuffle } from "./model.ts";

export type PracticeMode = "fixed" | "infinite";

export interface PracticeRecord {
  question: Question;
  choice: string;
  correct: boolean;
}

export interface PracticeSession {
  mode: PracticeMode;
  targetCount: number | null;
  questions: Question[];
  index: number;
  answers: Record<string, string>;
  records: PracticeRecord[];
  choice: string | null;
  checked: boolean;
  finished: boolean;
}

export interface StartSessionOptions {
  mode?: PracticeMode;
  targetCount?: number | null;
}

export function createPracticeSession(
  questions: Question[],
  options: StartSessionOptions = {},
): PracticeSession {
  const mode = options.mode ?? "fixed";
  const targetCount =
    mode === "infinite" ? null : (options.targetCount ?? questions.length);
  return {
    mode,
    targetCount,
    questions: questions.map((q) => ({ ...q, options: shuffle(q.options) })),
    index: 0,
    answers: {},
    records: [],
    choice: null,
    checked: false,
    finished: false,
  };
}

export type PracticeAction =
  | {
      type: "start";
      questions: Question[];
      mode?: PracticeMode;
      targetCount?: number | null;
    }
  | { type: "clear" }
  | { type: "choose"; optionId: string }
  | { type: "check" }
  | { type: "next"; nextQuestion?: Question }
  | { type: "finish" }
  | { type: "retry" };

export function practiceReducer(
  state: PracticeSession | null,
  action: PracticeAction,
): PracticeSession | null {
  if (action.type === "clear") return null;
  if (action.type === "start") {
    return createPracticeSession(action.questions, {
      mode: action.mode,
      targetCount: action.targetCount,
    });
  }
  if (!state) return state;
  const question = state.questions[state.index];
  switch (action.type) {
    case "choose":
      return !state.finished &&
        !state.checked &&
        question?.options.some((o) => o.id === action.optionId)
        ? { ...state, choice: action.optionId }
        : state;
    case "check": {
      if (!question || !state.choice || state.checked || state.finished) {
        return state;
      }
      const correct = isCorrect(question, state.choice);
      return {
        ...state,
        checked: true,
        answers: { ...state.answers, [question.id]: state.choice },
        records: [
          ...state.records,
          { question, choice: state.choice, correct },
        ],
      };
    }
    case "next": {
      if (!question || !state.checked || state.finished) {
        return state;
      }
      const nextIndex = state.index + 1;
      if (
        state.mode === "fixed" &&
        state.targetCount !== null &&
        nextIndex >= state.targetCount
      ) {
        return {
          ...state,
          index: nextIndex,
          choice: null,
          checked: false,
          finished: true,
        };
      }
      if (action.nextQuestion) {
        const prepared: Question = {
          ...action.nextQuestion,
          options: shuffle(action.nextQuestion.options),
        };
        return {
          ...state,
          questions: [...state.questions, prepared],
          index: nextIndex,
          choice: null,
          checked: false,
        };
      }
      return {
        ...state,
        index: nextIndex,
        choice: null,
        checked: false,
        finished: nextIndex >= state.questions.length,
      };
    }
    case "finish":
      return {
        ...state,
        choice: null,
        checked: false,
        finished: true,
      };
    case "retry": {
      const seen = new Set<string>();
      const mistakes: Question[] = [];
      for (const rec of state.records) {
        if (!rec.correct && !seen.has(rec.question.id)) {
          seen.add(rec.question.id);
          mistakes.push(rec.question);
        }
      }
      if (mistakes.length === 0) {
        for (const q of state.questions) {
          if (
            state.answers[q.id] !== undefined &&
            q.correctOptionId !== state.answers[q.id] &&
            !seen.has(q.id)
          ) {
            seen.add(q.id);
            mistakes.push(q);
          }
        }
      }
      return createPracticeSession(mistakes, {
        mode: "fixed",
        targetCount: mistakes.length,
      });
    }
  }
}
