import type { Entry } from "../../../contracts/content.ts";
import { toneSyllables, type ToneSyllable } from "./tones.ts";

/** Reuse reviewed transcriptions only when both characters and contextual
 * pinyin match. In particular, do not give bú the isolated bù transcription. */
export function toneIpa(
  entry: Entry,
  entries: Entry[],
  target: ToneSyllable[],
): (string | null)[] {
  const linked: Entry[] = [entry];
  const visited = new Set<string>([entry.id]);
  for (let i = 0; i < linked.length; i++) {
    for (const id of linked[i].constituentIds || []) {
      if (visited.has(id)) continue;
      visited.add(id);
      const part = entries.find((e) => e.id === id);
      if (part) linked.push(part);
    }
  }
  const candidates = target.map(
    () => [] as { length: number; value: string; own: boolean }[],
  );
  for (const source of linked) {
    const ipa = source.pronunciations
      .find((p) => p.system === "ipa" && p.reviewStatus === "reviewed")
      ?.value.trim();
    if (!ipa || !/^\[.+\]$/u.test(ipa)) continue;
    const parts = ipa.slice(1, -1).trim().split(/\s+/u);
    const syllables = source === entry ? target : toneSyllables(source);
    if (!syllables.length || parts.length !== syllables.length) continue;
    for (let start = 0; start <= target.length - syllables.length; start++) {
      if (
        !syllables.every(
          (s, i) =>
            s.character === target[start + i].character &&
            s.pinyin === target[start + i].pinyin &&
            (i === 0 || s.segmentStart === target[start + i].segmentStart),
        )
      )
        continue;
      for (let i = 0; i < parts.length; i++)
        candidates[start + i].push({
          length: parts.length,
          value: `[${parts[i]}]`,
          own: source === entry,
        });
    }
  }
  return candidates.map((options) => {
    const own = options.filter((o) => o.own);
    const available = own.length ? own : options;
    const longest = Math.max(0, ...available.map((o) => o.length));
    const values = new Set(
      available.filter((o) => o.length === longest).map((o) => o.value),
    );
    return values.size === 1 ? [...values][0] : null;
  });
}
