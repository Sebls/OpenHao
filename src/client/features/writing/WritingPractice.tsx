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
  const [unavailable, setUnavailable] = useState(false);
  return (
    <section
      className="character-practice"
      aria-label={`Character ${index + 1}: ${character}`}
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
          ? "✓ Written"
          : progress.skipped
            ? "Skipped"
            : `${progress.mistakes} retries`}
      </p>
      {unavailable && !progress.skipped && (
        <button onClick={() => dispatch({ type: "skip", index })}>
          Skip unavailable character
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
  const [helpOpen, setHelpOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (visible) heading.current?.focus();
  }, [visible]);
  const written = s.progress.filter((p) => p.completed).length;
  const skipped = s.progress.filter((p) => p.skipped).length;
  const done = written + skipped === s.characters.length;
  return (
    <section
      className="practice writing-practice"
      hidden={!visible}
      aria-label="Writing practice"
    >
      <p className="eyebrow">
        {done ? "WRITING SESSION COMPLETE" : "WRITING PRACTICE · STROKE ORDER"}
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
        aria-label="Characters completed"
        max={s.characters.length}
        value={written + skipped}
      />
      <div className="writing-progress-row">
        <p className="writing-total" role="status">
          {written} of {s.characters.length} characters written
          {skipped ? ` · ${skipped} skipped` : ""}.
        </p>
        <button
          className="writing-help-toggle"
          aria-label="Writing help"
          title="Writing help"
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
        Draw with your mouse, finger, or pen. Follow each character’s stroke
        order and direction. Watch an example whenever you need it; your
        accepted strokes are kept.
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
          <h3>Writing session complete</h3>
          <p>
            {s.progress.reduce((sum, p) => sum + p.mistakes, 0)} stroke retries.{" "}
            {skipped} skipped.
          </p>
        </div>
      )}
      <div className="actions">
        {done && (
          <button
            className="primary"
            onClick={() => dispatch({ type: "restart" })}
          >
            Practise again
          </button>
        )}
        <button onClick={back}>Return to reading</button>
      </div>
      <p className="footnote">
        Writing progress stays in this session and resets when you reload.
        Drawing requires a pointer; you can watch stroke order using the
        keyboard.
      </p>
      <p className="footnote">
        Stroke animations and checking by{" "}
        <a href="https://hanziwriter.org/" target="_blank" rel="noreferrer">
          Hanzi Writer
        </a>
        . Character data: Make Me a Hanzi / Arphic Public License.
      </p>
    </section>
  );
}
