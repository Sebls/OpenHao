import { formatTopicLabel } from "./topics.ts";
import { useI18n } from "../../i18n/I18n.tsx";
import { useState } from "react";
import type { TopicSummary } from "./history.ts";
import type { PracticeMode } from "./session.ts";

const PRESET_COUNTS = [5, 10, 20] as const;

type LengthChoice = (typeof PRESET_COUNTS)[number] | "custom" | "infinite";

export function PracticeSetup({
  scopeLabel,
  questionCount,
  topicStats,
  onStart,
  onBack,
}: {
  scopeLabel: string;
  questionCount: number;
  topicStats: TopicSummary[];
  onStart: (mode: PracticeMode, targetCount: number | null) => void;
  onBack: () => void;
}) {
  const { t, language } = useI18n();
  const [choice, setChoice] = useState<LengthChoice>(
    questionCount > 0 && questionCount < 10 ? 5 : 10,
  );
  const [customCount, setCustomCount] = useState("15");

  const parsedCustom = Math.max(
    1,
    Math.min(200, Number.parseInt(customCount, 10) || 1),
  );
  const isInfinite = choice === "infinite";
  const targetCount = isInfinite
    ? null
    : choice === "custom"
      ? parsedCustom
      : choice;

  return (
    <section
      className="practice practice-setup"
      aria-label={t("Practice setup")}
    >
      <p className="eyebrow">
        {scopeLabel.toUpperCase()} · {questionCount}{" "}
        {t(questionCount === 1 ? "QUESTION AVAILABLE" : "QUESTIONS AVAILABLE")}
      </p>
      <h2>{t("Choose your session")}</h2>
      <p className="practice-setup-note">
        {t(
          "Questions are chosen adaptively based on your topic mastery, missed Hanzi characters, and recency.",
        )}
      </p>

      <div className="setup-section">
        <h3>{t("Session length")}</h3>
        <div
          className="setup-modes"
          role="radiogroup"
          aria-label={t("Session length")}
        >
          {PRESET_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={choice === count}
              className={choice === count ? "mode-pill active" : "mode-pill"}
              onClick={() => setChoice(count)}
            >
              {t("{count} questions", { count })}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={choice === "custom"}
            className={choice === "custom" ? "mode-pill active" : "mode-pill"}
            onClick={() => setChoice("custom")}
          >
            {t("Custom")}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isInfinite}
            className={isInfinite ? "mode-pill active" : "mode-pill"}
            onClick={() => setChoice("infinite")}
          >
            {t("Infinite")}
          </button>
        </div>

        {choice === "custom" && (
          <label className="setup-custom">
            <span>{t("Number of questions")}</span>
            <input
              type="number"
              min={1}
              max={200}
              value={customCount}
              onChange={(e) => setCustomCount(e.target.value)}
            />
          </label>
        )}

        <div className="setup-actions">
          <button
            type="button"
            className="primary"
            disabled={questionCount === 0}
            onClick={() =>
              onStart(isInfinite ? "infinite" : "fixed", targetCount)
            }
          >
            {isInfinite
              ? t("Start infinite session")
              : t(
                  targetCount === 1
                    ? "Start {count} question"
                    : "Start {count} questions",
                  { count: targetCount },
                )}
          </button>
          <button type="button" onClick={onBack}>
            {t("Return to reading")}
          </button>
        </div>
      </div>

      {topicStats.length > 0 && (
        <div className="setup-section">
          <div className="setup-section-head">
            <h3>{t("Topic mastery")}</h3>
            <span className="setup-hint">{t("Saved in this browser")}</span>
          </div>
          <ul className="topic-bars" aria-label={t("Topic mastery bar plot")}>
            {topicStats.map((topic) => {
              const pct = Math.round(topic.mastery * 100);
              return (
                <li key={topic.topic} className="topic-bar-row">
                  <div className="topic-bar-meta">
                    <span className="topic-bar-name">
                      <span
                        className="topic-dot"
                        style={{ backgroundColor: topic.color }}
                        aria-hidden="true"
                      />
                      {formatTopicLabel(topic.topic, language)}
                    </span>
                    <span className="topic-bar-value">
                      {topic.attempts > 0
                        ? `${pct}% (${topic.correct}/${topic.attempts})`
                        : t("Not practised")}
                    </span>
                  </div>
                  <div
                    className="topic-bar-track"
                    role="progressbar"
                    aria-label={t("{topic} mastery", {
                      topic: formatTopicLabel(topic.topic, language),
                    })}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="topic-bar-fill"
                      style={{
                        width: `${topic.attempts > 0 ? Math.max(4, pct) : 0}%`,
                        backgroundColor: topic.color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
