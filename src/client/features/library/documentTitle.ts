import { translator, type Locale } from "../../i18n/messages.ts";
import type { MessageKey } from "../../i18n/en.ts";
import type { Manifest } from "../../../contracts/content.ts";

// Presentation names keep source filenames, published revisions and references stable.
const titles: Record<string, MessageKey> = {
  "lecon-00-histoire-caracteres":
    "Lesson 00 · Chinese character history and structure",
  "lecon-01": "Lesson 01",
  "lecon-02": "Lesson 02 · Friends, languages and work",
  "lecon-03": "Lesson 03 · Vocabulary, dialogues and exercises",
  "lecon-04": "Lesson 04 · Writing, drawing and daily conversation",
  "lecon-05": "Lesson 05 · Revision",
  "new-hsk-1": "New HSK 1 · Lessons 01–05",
  "slides-lecon-00-01": "Slides · Lessons 00–01",
  "slides-lecon-02": "Slides · Lesson 02",
};

export function documentTitle(
  manifest: Manifest,
  language: Locale = "en",
): string {
  const title = titles[manifest.variantGroup ?? manifest.documentId];
  return title ? translator(language)(title) : manifest.title;
}
