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
    <section className="practice practice-setup" aria-label="Practice setup">
      <p className="eyebrow">
        {scopeLabel.toUpperCase()} · {questionCount}{" "}
        {questionCount === 1 ? "QUESTION" : "QUESTIONS"} AVAILABLE
      </p>
      <h2>Choose your session</h2>
      <p className="practice-setup-note">
        Questions are chosen adaptively based on your topic mastery, missed
        Hanzi characters, and recency.
      </p>

      <div className="setup-section">
        <h3>Session length</h3>
        <div
          className="setup-modes"
          role="radiogroup"
          aria-label="Session length"
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
              {count} questions
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={choice === "custom"}
            className={choice === "custom" ? "mode-pill active" : "mode-pill"}
            onClick={() => setChoice("custom")}
          >
            Custom
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isInfinite}
            className={isInfinite ? "mode-pill active" : "mode-pill"}
            onClick={() => setChoice("infinite")}
          >
            Infinite
          </button>
        </div>

        {choice === "custom" && (
          <label className="setup-custom">
            <span>Number of questions</span>
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
              ? "Start infinite session"
              : `Start ${targetCount} ${targetCount === 1 ? "question" : "questions"}`}
          </button>
          <button type="button" onClick={onBack}>
            Return to reading
          </button>
        </div>
      </div>

      {topicStats.length > 0 && (
        <div className="setup-section">
          <div className="setup-section-head">
            <h3>Topic mastery</h3>
            <span className="setup-hint">Saved in this browser</span>
          </div>
          <ul className="topic-bars" aria-label="Topic mastery bar plot">
            {topicStats.map((t) => {
              const pct = Math.round(t.mastery * 100);
              return (
                <li key={t.topic} className="topic-bar-row">
                  <div className="topic-bar-meta">
                    <span className="topic-bar-name">
                      <span
                        className="topic-dot"
                        style={{ backgroundColor: t.color }}
                        aria-hidden="true"
                      />
                      {t.label}
                    </span>
                    <span className="topic-bar-value">
                      {t.attempts > 0
                        ? `${pct}% (${t.correct}/${t.attempts})`
                        : "Not practised"}
                    </span>
                  </div>
                  <div
                    className="topic-bar-track"
                    role="progressbar"
                    aria-label={`${t.label} mastery`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="topic-bar-fill"
                      style={{
                        width: `${t.attempts > 0 ? Math.max(4, pct) : 0}%`,
                        backgroundColor: t.color,
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
