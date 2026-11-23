export const writingCharacters = (text) =>
  Array.from(text || "").filter((character) =>
    /\p{Script=Han}/u.test(character),
  );

let sessionId = 0;

export function createWritingSession(entry, annotation, pageId, entries = []) {
  const characters = writingCharacters(entry.form);
  const byId = new Map(entries.map((item) => [item.id, item]));
  const parts = [],
    visited = new Set();
  function collect(item) {
    if (!item || visited.has(item)) return;
    visited.add(item);
    if (item.kind === "character") parts.push(item);
    for (const id of item.constituentIds || []) collect(byId.get(id));
  }
  collect(entry);
  const pinyin = (item) =>
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
          .filter(Boolean),
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

export function updateWritingCharacter(session, index, update) {
  return {
    ...session,
    progress: session.progress.map((item, i) =>
      i === index ? { ...item, ...update(item) } : item,
    ),
  };
}
