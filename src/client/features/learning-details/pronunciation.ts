import type { Entry } from "../../../contracts/content.ts";
export const pinyin = (entry: Entry | undefined) =>
  entry?.pronunciations?.find((p) => p.system === "pinyin")?.value;
