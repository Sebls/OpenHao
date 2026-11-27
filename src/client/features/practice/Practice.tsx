import { useI18n } from "../../i18n/I18n.tsx";
import type {
  Manifest,
  PageContent,
  Question,
} from "../../../contracts/content.ts";
import { PronunciationButton } from "../speech/PronunciationButton.tsx";
import type { Speech } from "../speech/useSpeech.ts";
import { isCorrect, questionPhrase } from "./model.ts";
import type { PracticeAction, PracticeSession } from "./session.ts";
import { formatTopicLabel, questionTopic } from "./topics.ts";

export function Practice({
  session: s,
  dispatch,
  onAnswer,
  onNext,
  speech,
  source,
  newSession,
  back,
  manifest,
  pages,
}: {
  session: PracticeSession;
  dispatch: (action: PracticeAction) => void;
  onAnswer: (question: Question, correct: boolean) => void;
  onNext: () => void;
  speech: Speech;
  source: (question: Question) => void;
  newSession: () => void;
  back: () => void;
  manifest: Manifest;
  pages: Record<string, PageContent>;
}) {
  const { t } = useI18n();
  const q = s.questions[s.index];
  const done = s.finished || !q || s.index >= s.questions.length;

  if (done) {
    const records =
      s.records.length > 0
        ? s.records
        : s.questions
            .filter((item) => s.answers[item.id] !== undefined)
            .map((item) => ({
              question: item,
              choice: s.answers[item.id],
              correct: isCorrect(item, s.answers[item.id]),
            }));
    const mistakes = records.filter((r) => !r.correct);
    const total = records.length;
    return (
      <section className="practice">
        <p className="eyebrow">{t("SESSION COMPLETE")}</p>
        <h2>
          {t("{correct} of {total} correct", {
            correct: total - mistakes.length,
            total,
          })}
        </h2>
        <p>
          {t(
            "This is your session result. Take your time with the words that need another look.",
          )}
        </p>
        {mistakes.map((rec, idx) => {
          const item = rec.question;
          const mistakePhrase = questionPhrase(item, pages);
          return (
            <article key={`${item.id}-${idx}`}>
              <h3>{item.prompt}</h3>
              {mistakePhrase && (
                <p className="practice-phrase" lang="zh-CN">
                  {mistakePhrase}
                </p>
              )}
              <p className="answer-incorrect">
                {t("✕ Your answer:")}{" "}
                {item.options.find((o) => o.id === rec.choice)?.text}
              </p>
              <p className="answer-correct">
                {t("✓ Correct answer:")}{" "}
                {item.options.find((o) => o.id === item.correctOptionId)?.text}
              </p>
              <p>{item.explanation}</p>
              <button onClick={() => source(item)}>
                {t("See original context")}
              </button>
            </article>
          );
        })}
        {mistakes.length > 0 && (
          <button
            className="primary"
            onClick={() => dispatch({ type: "retry" })}
          >
            {t("Retry mistakes")}
          </button>
        )}{" "}
        <button onClick={back}>{t("Return to reading")}</button>{" "}
        <button onClick={newSession}>{t("New session")}</button>
      </section>
    );
  }

  const isInfinite = s.mode === "infinite";
  const totalCount = s.targetCount ?? s.questions.length;
  const correct = isCorrect(q, s.choice);
  const phrase = questionPhrase(q, pages);
  const topicLabel = formatTopicLabel(
    questionTopic(q),
    manifest.translationLanguage,
  );

  return (
    <section className="practice">
      <div className="practice-header-row">
        <p className="eyebrow">
          {isInfinite
            ? t("QUESTION {value0} · INFINITE · {value1}", {
                value0: s.index + 1,
                value1: topicLabel.toUpperCase(),
              })
            : t("QUESTION {value0} OF {value1} · {value2}", {
                value0: s.index + 1,
                value1: totalCount,
                value2: topicLabel.toUpperCase(),
              })}
        </p>
        {isInfinite && (
          <button
            type="button"
            className="quiet"
            onClick={() => dispatch({ type: "finish" })}
          >
            {t("Finish session")}
          </button>
        )}
      </div>
      {!isInfinite && <progress max={totalCount} value={s.index} />}
      <fieldset disabled={s.checked}>
        <legend lang={q.promptLanguage}>{q.prompt}</legend>
        {phrase && (
          <p className="practice-phrase" lang="zh-CN">
            {phrase}
          </p>
        )}
        {q.requiresAudio && (
          <PronunciationButton speech={speech} text={q.speechTarget || ""} />
        )}
        <div className="options">
          {q.options.map((o) => (
            <label
              key={o.id}
              className={
                s.checked && o.id === q.correctOptionId
                  ? "answer-correct"
                  : s.checked && s.choice === o.id
                    ? "answer-incorrect"
                    : s.choice === o.id
                      ? "chosen"
                      : ""
              }
            >
              <input
                type="radio"
                name={q.id}
                checked={s.choice === o.id}
                onChange={() => dispatch({ type: "choose", optionId: o.id })}
              />
              <span
                lang={
                  /[\u3400-\u9fff]/.test(o.text)
                    ? "zh-CN"
                    : manifest.translationLanguage
                }
              >
                {o.text}
              </span>
              {s.checked && o.id === q.correctOptionId && (
                <span className="answer-label">{t("✓ Correct answer")}</span>
              )}
              {s.checked && s.choice === o.id && o.id !== q.correctOptionId && (
                <span className="answer-label">{t("✕ Your answer")}</span>
              )}
            </label>
          ))}
        </div>
      </fieldset>
      {!s.checked ? (
        <div className="practice-actions-inline">
          <button
            className="primary"
            disabled={!s.choice}
            onClick={() => {
              dispatch({ type: "check" });
              onAnswer(q, correct);
            }}
          >
            {t("Check answer")}
          </button>
        </div>
      ) : (
        <div
          className={`feedback ${correct ? "answer-correct" : "answer-incorrect"}`}
          role="status"
        >
          <h3>
            {correct
              ? t("✓ Correct")
              : t("✕ Incorrect — let’s take another look")}
          </h3>
          {!correct && (
            <p>
              {t("Correct answer:")}{" "}
              {q.options.find((o) => o.id === q.correctOptionId)?.text}
            </p>
          )}
          <h4>{t("Why this answer")}</h4>
          <p lang={q.explanationLanguage}>{q.explanation}</p>
          <div className="practice-actions-inline">
            <button onClick={() => source(q)}>
              {t("See original context")}
            </button>
            <button className="primary" onClick={onNext}>
              {!isInfinite && s.index + 1 >= totalCount
                ? t("See results")
                : t("Continue →")}
            </button>
          </div>
          <details>
            <summary>{t("Correction reference")}</summary>
            <input
              readOnly
              value={`${manifest.documentId}:${q.pageId}:question:${q.id}@r${manifest.contentRevision}`}
              onFocus={(e) => e.target.select()}
            />
          </details>
        </div>
      )}
    </section>
  );
}
