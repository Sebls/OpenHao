import type { Annotation, Entry } from "../../../contracts/content.ts";
export interface CharacterProgress {
  stroke: number;
  mistakes: number;
  completed: boolean;
  skipped: boolean;
  attempt: number;
}
export type ProgressUpdate = (
  previous: CharacterProgress,
) => Partial<CharacterProgress>;
export interface WritingSession {
  id: number;
  form: string;
  meaning: string;
  pinyin?: string;
  characterPinyin: (string | null)[];
  characters: string[];
  sourceAnnotationIds: string[];
  pageId: string;
  progress: CharacterProgress[];
  attempt: number;
}
export const writingCharacters = (text: string) =>
  Array.from(text || "").filter((character) =>
    /\p{Script=Han}/u.test(character),
  );

let sessionId = 0;

export function createWritingSession(
  entry: Entry,
  annotation: Annotation,
  pageId: string,
  entries: Entry[] = [],
): WritingSession {
  const characters = writingCharacters(entry.form);
  const byId = new Map(entries.map((item) => [item.id, item]));
  const parts: Entry[] = [],
    visited = new Set<Entry>();
  function collect(item: Entry | undefined) {
    if (!item || visited.has(item)) return;
    visited.add(item);
    if (item.kind === "character") parts.push(item);
    for (const id of item.constituentIds || []) collect(byId.get(id));
  }
  collect(entry);
  const pinyin = (item: Entry | undefined) =>
    item?.pronunciations?.find(
      (p) => p.system === "pinyin" && p.reviewStatus === "reviewed",
    )?.value;
  return {
    id: ++sessionId,
    form: entry.form,
    meaning: entry.meaning,
    pinyin: pinyin(entry),
    characterPinyin: characters.map((character) => {
      const readings = new Set(
        parts
          .filter((part) => part.form === character)
          .map(pinyin)
          .filter((value): value is string => Boolean(value)),
      );
      return readings.size === 1 ? [...readings][0] : null;
    }),
    characters,
    sourceAnnotationIds: [annotation.id],
    pageId,
    progress: characters.map(() => ({
      stroke: 0,
      mistakes: 0,
      completed: false,
      skipped: false,
      attempt: 0,
    })),
    attempt: 0,
  };
}

export function updateWritingCharacter(
  session: WritingSession,
  index: number,
  update: ProgressUpdate,
) {
  return {
    ...session,
    progress: session.progress.map((item, i) =>
      i === index ? { ...item, ...update(item) } : item,
    ),
  };
}
export type WritingAction =
  | { type: "start"; session: WritingSession }
  | { type: "clear" }
  | { type: "stroke"; index: number; stroke: number }
  | {
      type: "mistake" | "complete" | "skip" | "restart-character";
      index: number;
    }
  | { type: "restart" };
export function writingReducer(
  state: WritingSession | null,
  action: WritingAction,
): WritingSession | null {
  if (action.type === "clear") return null;
  if (action.type === "start") return action.session;
  if (!state) return state;
  if (action.type === "restart")
    return {
      ...state,
      attempt: state.attempt + 1,
      progress: state.characters.map(() => ({
        stroke: 0,
        mistakes: 0,
        completed: false,
        skipped: false,
        attempt: 0,
      })),
    };
  return updateWritingCharacter(state, action.index, (progress) => {
    switch (action.type) {
      case "stroke":
        return { stroke: action.stroke };
      case "mistake":
        return { mistakes: progress.mistakes + 1 };
      case "complete":
        return { completed: true };
      case "skip":
        return { skipped: true };
      case "restart-character":
        return {
          stroke: 0,
          completed: false,
          skipped: false,
          attempt: progress.attempt + 1,
        };
    }
  });
}
