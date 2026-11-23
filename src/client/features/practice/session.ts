import type { Question } from "../../../contracts/content.ts";
import { shuffle } from "./model.ts";
export interface PracticeSession {
  questions: Question[];
  index: number;
  answers: Record<string, string>;
  choice: string | null;
  checked: boolean;
}
export function createPracticeSession(questions: Question[]): PracticeSession {
  return {
    questions: questions.map((q) => ({ ...q, options: shuffle(q.options) })),
    index: 0,
    answers: {},
    choice: null,
    checked: false,
  };
}
export type PracticeAction =
  | { type: "start"; questions: Question[] }
  | { type: "clear" }
  | { type: "choose"; optionId: string }
  | { type: "check" }
  | { type: "next" }
  | { type: "retry" };
export function practiceReducer(
  state: PracticeSession | null,
  action: PracticeAction,
): PracticeSession | null {
  if (action.type === "clear") return null;
  if (action.type === "start") return createPracticeSession(action.questions);
  if (!state) return state;
  const question = state.questions[state.index];
  switch (action.type) {
    case "choose":
      return !state.checked &&
        question?.options.some((o) => o.id === action.optionId)
        ? { ...state, choice: action.optionId }
        : state;
    case "check":
      return question && state.choice && !state.checked
        ? {
            ...state,
            checked: true,
            answers: { ...state.answers, [question.id]: state.choice },
          }
        : state;
    case "next":
      return question && state.checked
        ? { ...state, index: state.index + 1, choice: null, checked: false }
        : state;
    case "retry":
      return createPracticeSession(
        state.questions.filter(
          (q) => q.correctOptionId !== state.answers[q.id],
        ),
      );
  }
}
