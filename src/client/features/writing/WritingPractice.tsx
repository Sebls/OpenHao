import { useI18n } from "../../i18n/I18n.tsx";
import { useEffect, useRef, useState } from "react";
import { WritingBoard } from "./WritingBoard.tsx";
import type {
  CharacterProgress,
  WritingAction,
  WritingSession,
} from "./model.ts";
function CharacterPractice({
  character,
  pinyin,
  index,
  progress,
  visible,
  dispatch,
}: {
  character: string;
  pinyin: string | null;
  index: number;
  progress: CharacterProgress;
  visible: boolean;
  dispatch: (action: WritingAction) => void;
}) {
  const { t } = useI18n();
  const [unavailable, setUnavailable] = useState(false);
  return (
    <section
      className="character-practice"
      aria-label={t("Character {value0}: {value1}", {
        value0: index + 1,
        value1: character,
      })}
    >
      <span className="character-number">{index + 1}</span>
      <WritingBoard
        character={character}
        mode="quiz"
        compact
        pinyin={pinyin}
        visible={visible && !progress.skipped}
        attempt={progress.attempt}
        stroke={progress.stroke}
        completed={progress.completed}
        onRestart={() => dispatch({ type: "restart-character", index })}
        onStroke={(stroke) => dispatch({ type: "stroke", index, stroke })}
        onMistake={() => dispatch({ type: "mistake", index })}
        onComplete={() => dispatch({ type: "complete", index })}
        onUnavailable={() => setUnavailable(true)}
        onReady={() => setUnavailable(false)}
      />
      <p
        className={`character-result ${progress.completed ? "answer-correct" : ""}`}
      >
        {progress.completed
          ? t("✓ Written")
          : progress.skipped
            ? t("Skipped")
            : t("{count} retries", { count: progress.mistakes })}
      </p>
      {unavailable && !progress.skipped && (
        <button onClick={() => dispatch({ type: "skip", index })}>
          {t("Skip unavailable character")}
        </button>
      )}
    </section>
  );
}

export function WritingPractice({
  session: s,
  dispatch,
  visible,
  back,
}: {
  session: WritingSession;
  dispatch: (action: WritingAction) => void;
  visible: boolean;
  back: () => void;
}) {
  const { t } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (visible) heading.current?.focus({ preventScroll: true });
  }, [visible]);
  const written = s.progress.filter((p) => p.completed).length;
  const skipped = s.progress.filter((p) => p.skipped).length;
  const done = written + skipped === s.characters.length;
  return (
    <section
      className="practice writing-practice"
      hidden={!visible}
      aria-label={t("Writing practice")}
    >
      <p className="eyebrow">
        {done
          ? t("WRITING SESSION COMPLETE")
          : t("WRITING PRACTICE · STROKE ORDER")}
      </p>
      <h2 ref={heading} tabIndex={-1} lang="zh-CN">
        {s.form}
      </h2>
      <p>{s.meaning}</p>
      {s.pinyin && (
        <p className="phrase-pinyin" lang="zh-Latn">
          <span className="field-label">Pinyin</span>
          {s.pinyin}
        </p>
      )}
      <progress
        aria-label={t("Characters completed")}
        max={s.characters.length}
        value={written + skipped}
      />
      <div className="writing-progress-row">
        <p className="writing-total" role="status">
          {t("{written} of {total} characters written", {
            written,
            total: s.characters.length,
          })}
          {skipped ? t(" · {count} skipped", { count: skipped }) : ""}.
        </p>
        <button
          className="writing-help-toggle"
          aria-label={t("Writing help")}
          title={t("Writing help")}
          aria-expanded={helpOpen}
          aria-controls={`writing-help-${s.id}`}
          onClick={() => setHelpOpen((open) => !open)}
        >
          <span aria-hidden="true">?</span>
        </button>
      </div>
      <p
        id={`writing-help-${s.id}`}
        className="writing-help"
        hidden={!helpOpen}
      >
        {t(
          "Draw with your mouse, finger, or pen. Follow each character’s stroke order and direction. Watch an example whenever you need it; your accepted strokes are kept.",
        )}
      </p>
      <div className="writing-boards">
        {s.characters.map((character, index) => (
          <CharacterPractice
            key={`${s.attempt}-${index}`}
            character={character}
            pinyin={s.characterPinyin[index]}
            index={index}
            progress={s.progress[index]}
            visible={visible}
            dispatch={dispatch}
          />
        ))}
      </div>
      {done && (
        <div className="writing-summary" role="status">
          <h3>{t("Writing session complete")}</h3>
          <p>
            {t("{retries} stroke retries. {skipped} skipped.", {
              retries: s.progress.reduce((sum, p) => sum + p.mistakes, 0),
              skipped,
            })}
          </p>
        </div>
      )}
      <div className="actions">
        {done && (
          <button
            className="primary"
            onClick={() => dispatch({ type: "restart" })}
          >
            {t("Practise again")}
          </button>
        )}
        <button onClick={back}>{t("Return to reading")}</button>
      </div>
      <p className="footnote">
        {t(
          "Writing progress stays in this session and resets when you reload. Drawing requires a pointer; you can watch stroke order using the keyboard.",
        )}
      </p>
      <p className="footnote">
        {t("Stroke animations and checking by")}{" "}
        <a href="https://hanziwriter.org/" target="_blank" rel="noreferrer">
          Hanzi Writer
        </a>
        {t(". Character data: Make Me a Hanzi / Arphic Public License.")}
      </p>
    </section>
  );
}
