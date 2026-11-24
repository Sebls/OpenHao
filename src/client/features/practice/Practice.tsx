import type {
  Manifest,
  PageContent,
  Question,
} from "../../../contracts/content.ts";
import { PronunciationButton } from "../speech/PronunciationButton.tsx";
import type { Speech } from "../speech/useSpeech.ts";
import { isCorrect, questionPhrase } from "./model.ts";
import type { PracticeAction, PracticeSession } from "./session.ts";
export function Practice({
  session: s,
  dispatch,
  speech,
  source,
  restart,
  back,
  manifest,
  pages,
}: {
  session: PracticeSession;
  dispatch: (action: PracticeAction) => void;
  speech: Speech;
  source: (question: Question) => void;
  restart: (selection: Set<string> | null) => void;
  back: () => void;
  manifest: Manifest;
  pages: Record<string, PageContent>;
}) {
  const q = s.questions[s.index],
    done = s.index >= s.questions.length;
  if (done) {
    const mistakes = s.questions.filter((q) => !isCorrect(q, s.answers[q.id]));
    return (
      <section className="practice">
        <p className="eyebrow">SESSION COMPLETE</p>
        <h2>
          {s.questions.length - mistakes.length} of {s.questions.length} correct
        </h2>
        <p>
          This is your session result. Take your time with the words that need
          another look.
        </p>
        {mistakes.map((q) => {
          const mistakePhrase = questionPhrase(q, pages);
          return (
            <article key={q.id}>
              <h3>{q.prompt}</h3>
              {mistakePhrase && (
                <p className="practice-phrase" lang="zh-CN">
                  {mistakePhrase}
                </p>
              )}
              <p className="answer-incorrect">
              ✕ Your answer:{" "}
              {q.options.find((o) => o.id === s.answers[q.id])?.text}
            </p>
            <p className="answer-correct">
              ✓ Correct answer:{" "}
              {q.options.find((o) => o.id === q.correctOptionId)?.text}
            </p>
            <p>{q.explanation}</p>
            <button onClick={() => source(q)}>See original context</button>
          </article>
          );
        })}
        {mistakes.length > 0 && (
          <button
            className="primary"
            onClick={() => dispatch({ type: "retry" })}
          >
            Retry mistakes
          </button>
        )}{" "}
        <button onClick={back}>Return to reading</button>{" "}
        <button onClick={() => restart(null)}>New document session</button>
      </section>
    );
  }
  const correct = isCorrect(q, s.choice),
    phrase = questionPhrase(q, pages);
  return (
    <section className="practice">
      <p className="eyebrow">
        QUESTION {s.index + 1} OF {s.questions.length} ·{" "}
        {q.category.replaceAll("-", " ")}
      </p>
      <progress max={s.questions.length} value={s.index} />
      <fieldset disabled={s.checked}>
        <legend>{q.prompt}</legend>
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
              <span lang={/[\u3400-\u9fff]/.test(o.text) ? "zh-CN" : "en"}>
                {o.text}
              </span>
              {s.checked && o.id === q.correctOptionId && (
                <span className="answer-label">✓ Correct answer</span>
              )}
              {s.checked && s.choice === o.id && o.id !== q.correctOptionId && (
                <span className="answer-label">✕ Your answer</span>
              )}
            </label>
          ))}
        </div>
      </fieldset>
      {!s.checked ? (
        <button
          className="primary"
          disabled={!s.choice}
          onClick={() => dispatch({ type: "check" })}
        >
          Check answer
        </button>
      ) : (
        <div
          className={`feedback ${correct ? "answer-correct" : "answer-incorrect"}`}
          role="status"
        >
          <h3>
            {correct ? "✓ Correct" : "✕ Incorrect — let’s take another look"}
          </h3>
          {!correct && (
            <p>
              Correct answer:{" "}
              {q.options.find((o) => o.id === q.correctOptionId)?.text}
            </p>
          )}
          <h4>Why this answer</h4>
          <p>{q.explanation}</p>
          <button onClick={() => source(q)}>See original context</button>{" "}
          <button
            className="primary"
            onClick={() => dispatch({ type: "next" })}
          >
            {s.index + 1 === s.questions.length ? "See results" : "Continue →"}
          </button>
          <details>
            <summary>Correction reference</summary>
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
