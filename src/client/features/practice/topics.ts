import { translator } from "../../i18n/messages.ts";
import type { MessageKey } from "../../i18n/en.ts";
import type { Manifest, Question } from "../../../contracts/content.ts";

const CATEGORY_LABELS: Record<string, MessageKey> = {
  "zh-to-en": "Chinese → English",
  "en-to-zh": "English → Chinese",
  "character-identification": "Characters",
  "sentence-comprehension": "Sentences",
  "missing-word": "Missing word",
  "grammar-comprehension": "Grammar",
  "listening-comprehension": "Listening",
};

const TOPIC_PALETTE = [
  "#0562ef", // blue
  "#0e8a6d", // teal
  "#c2590a", // amber-orange
  "#7c3aed", // violet
  "#be185d", // rose
  "#0284c7", // sky
  "#4f46e5", // indigo
  "#15803d", // green
  "#b45309", // ochre
  "#9333ea", // purple
];

/** Normalizes a semantic topic string into a lowercase hyphenated slug. */
export function normalizeTopic(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Returns the question's semantic topic, falling back to its category. */
export function questionTopic(
  question: Pick<Question, "topic" | "category">,
): string {
  const normalized = question.topic ? normalizeTopic(question.topic) : "";
  return normalized || question.category;
}

/** Formats a normalized topic or category slug for display. */
export function formatTopicLabel(
  topic: string,
  language: Manifest["translationLanguage"] = "en",
): string {
  const normalized = normalizeTopic(topic);
  const t = translator(language);
  if (language === "fr") {
    if (normalized === "zh-to-en") return t("Chinese → French");
    if (normalized === "en-to-zh") return t("French → Chinese");
  }
  if (CATEGORY_LABELS[normalized]) {
    return t(CATEGORY_LABELS[normalized]);
  }
  const spaced = normalized.replace(/-/g, " ");
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : topic;
}

/** Returns a distinct, deterministic color for a topic. */
export function topicColor(topic: string, index?: number): string {
  if (index !== undefined && index >= 0) {
    return TOPIC_PALETTE[index % TOPIC_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
  }
  return TOPIC_PALETTE[hash % TOPIC_PALETTE.length];
}
