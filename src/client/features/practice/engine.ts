import type { PageContent, Question } from "../../../contracts/content.ts";
import { extractQuestionHanzi, type PracticeHistory } from "./history.ts";
import { questionTopic } from "./topics.ts";

const COOLDOWN_MS = 10 * 60 * 1000;
const MIN_WEIGHT = 0.1;

/**
 * Computes the adaptive sampling weight for a question by combining:
 * 1. Topic mastery (lower mastery -> higher weight)
 * 2. Hanzi character weakness (missed characters boost any question containing them)
 * 3. Question recency (unseen or older questions -> higher weight; recent -> cooled down)
 * 4. Coverage floor (non-zero minimum weight so known items still appear occasionally)
 */
export function computeQuestionWeight(
  question: Question,
  history: PracticeHistory,
  pages: Record<string, PageContent>,
  now = Date.now(),
): number {
  const topic = questionTopic(question);
  const tStats = history.topics[topic];
  const topicMastery =
    tStats && tStats.attempts > 0 ? tStats.correct / tStats.attempts : 0;
  const topicFactor = 0.25 + (1 - topicMastery) * 1.75;

  const hanzi = extractQuestionHanzi(question, pages);
  let maxCharWeakness = 0;
  for (const ch of hanzi) {
    const cStats = history.characters[ch];
    if (cStats && cStats.attempts > 0 && cStats.incorrect > 0) {
      const weakness = cStats.incorrect / cStats.attempts;
      if (weakness > maxCharWeakness) {
        maxCharWeakness = weakness;
      }
    }
  }
  const hanziFactor = 1 + maxCharWeakness * 2.5;

  const qStats = history.questions[question.id];
  let recencyFactor: number;
  if (!qStats || qStats.attempts === 0) {
    recencyFactor = 1.6;
  } else {
    const elapsed = Math.max(0, now - qStats.lastAnsweredAt);
    recencyFactor = 0.2 + 1.3 * (1 - Math.exp(-elapsed / COOLDOWN_MS));
  }

  return Math.max(MIN_WEIGHT, topicFactor * hanziFactor * recencyFactor);
}

/**
 * Selects the next question from `bank` using weighted-random sampling,
 * avoiding back-to-back repeats of `lastQuestionId` when other questions exist.
 */
export function selectNextQuestion(
  bank: readonly Question[],
  history: PracticeHistory,
  pages: Record<string, PageContent>,
  options?: {
    lastQuestionId?: string | null;
    now?: number;
    random?: () => number;
  },
): Question | null {
  if (bank.length === 0) return null;
  if (bank.length === 1) return bank[0];

  const lastId = options?.lastQuestionId;
  const filtered = lastId ? bank.filter((q) => q.id !== lastId) : [...bank];
  const candidates = filtered.length > 0 ? filtered : [...bank];
  const now = options?.now ?? Date.now();
  const random = options?.random ?? Math.random;

  const weights = candidates.map((q) =>
    computeQuestionWeight(q, history, pages, now),
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    return candidates[Math.floor(random() * candidates.length)];
  }

  let target = random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    target -= weights[i];
    if (target <= 0) {
      return candidates[i];
    }
  }
  return candidates[candidates.length - 1];
}
