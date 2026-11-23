import React, { useEffect, useRef, useState } from "react";
import {
  createWriter,
  loadCharacter,
  demonstrateRemainingStrokes,
} from "./hanzi.js";
import { writingCharacters, updateWritingCharacter } from "./writing-model.js";

function WritingBoard({
  character,
  mode,
  visible = true,
  attempt = 0,
  stroke = 0,
  completed = false,
  onStroke,
  onMistake,
  onComplete,
  onDemoComplete,
  onUnavailable,
  onReady,
  compact = false,
  pinyin,
  onRestart,
}) {
  const host = useRef(null),
    callbacks = useRef({});
  const [status, setStatus] = useState("Loading stroke order…"),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const [playing, setPlaying] = useState(false),
    [paused, setPaused] = useState(false);
  const instance = useRef(null);
  const resumeQuiz = useRef(null),
    strokeCount = useRef(0);
  callbacks.current = {
    onStroke,
    onMistake,
    onComplete,
    onDemoComplete,
    onUnavailable,
    onReady,
    stroke,
    completed,
  };
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let disposed = false,
      resource;
    setStatus("Loading stroke order…");
    setError(false);
    setPlaying(false);
    setPaused(false);
    async function setup() {
      try {
        const data = await loadCharacter(character, controller.signal);
        if (disposed) return;
        resource = createWriter(host.current, character, data, {
          showCharacter: mode === "watch",
          showOutline: true,
        });
        instance.current = resource.writer;
        strokeCount.current = data.strokes.length;
        await resource.writer.showCharacter({ duration: 0 });
        if (disposed) return;
        callbacks.current.onReady?.();
        async function startQuiz() {
          if (disposed) return;
          setStatus(
            `Draw stroke ${callbacks.current.stroke + 1} of ${data.strokes.length}.`,
          );
          await resource.writer.quiz({
            quizStartStrokeNum: callbacks.current.stroke,
            acceptBackwardsStrokes: false,
            showHintAfterMisses: 2,
            highlightOnComplete: false,
            onCorrectStroke: (result) => {
              if (disposed) return;
              callbacks.current.onStroke?.(result.strokeNum + 1);
              setStatus(
                result.strokesRemaining
                  ? `Correct. Draw stroke ${result.strokeNum + 2} of ${data.strokes.length}.`
                  : "Character complete. Well done.",
              );
            },
            onMistake: () => {
              if (disposed) return;
              callbacks.current.onMistake?.();
              setStatus(
                "Try again. Follow the stroke order and direction. A hint appears after two misses.",
              );
            },
            onComplete: () => {
              if (!disposed) callbacks.current.onComplete?.();
            },
          });
        }
        resumeQuiz.current = startQuiz;
        if (mode === "quiz" && !callbacks.current.completed) await startQuiz();
        else
          setStatus(
            mode === "quiz"
              ? "Character complete. Well done."
              : `${data.strokes.length} strokes. Play when you’re ready.`,
          );
      } catch (e) {
        if (disposed || e.name === "AbortError") return;
        setError(true);
        setStatus(
          "Stroke data could not be loaded for this character. Try again or choose another character.",
        );
        callbacks.current.onUnavailable?.();
      }
    }
    void setup();
    return () => {
      disposed = true;
      controller.abort();
      resource?.dispose();
      instance.current = null;
      resumeQuiz.current = null;
    };
  }, [character, mode, visible, attempt, retry]);

  async function play() {
    const writer = instance.current;
    if (!writer) return;
    setPlaying(true);
    setPaused(false);
    setStatus("Watch the stroke order and direction.");
    if (mode === "quiz") {
      try {
        await demonstrateRemainingStrokes(
          writer,
          callbacks.current.stroke,
          strokeCount.current,
          () => resumeQuiz.current?.(),
          () => instance.current === writer,
        );
      } catch {
        if (instance.current === writer)
          setStatus("Example could not finish. Your drawing progress is kept.");
      } finally {
        if (instance.current === writer) setPlaying(false);
      }
      return;
    }
    const result = await writer.animateCharacter();
    if (instance.current !== writer || result?.canceled) return;
    setPlaying(false);
    setStatus("Animation finished. Replay whenever you like.");
    callbacks.current.onDemoComplete?.();
  }
  return (
    <div className="writing-board">
      <div
        ref={host}
        className={`hanzi-grid ${mode === "quiz" ? "is-writing" : ""}`}
        role="img"
        aria-label={`${mode === "quiz" ? "Drawing area" : "Stroke order"} for ${character}`}
      />
      {compact && (
        <p className="character-pinyin" lang="zh-Latn" aria-label="Pinyin">
          {pinyin || "Pinyin unavailable"}
        </p>
      )}
      {compact && (
        <div className="character-controls">
          <button
            className="icon-control"
            aria-label={`Play remaining strokes for ${character}`}
            title="Play remaining strokes"
            disabled={!instance.current || playing || completed || error}
            onClick={play}
          >
            <span aria-hidden="true">▷</span>
          </button>
          <button
            className="icon-control"
            aria-label={`Restart ${character}`}
            title="Restart character"
            onClick={onRestart}
          >
            <span aria-hidden="true">↺</span>
          </button>
        </div>
      )}
      <p role="status">{status}</p>
      {error ? (
        <button onClick={() => setRetry((n) => n + 1)}>Retry loading</button>
      ) : (
        mode === "watch" && (
          <div className="actions">
            <button disabled={!instance.current || playing} onClick={play}>
              ▷ Play stroke order
            </button>
            {playing && (
              <button
                onClick={() => {
                  if (paused) instance.current.resumeAnimation();
                  else instance.current.pauseAnimation();
                  setPaused(!paused);
                  setStatus(
                    paused
                      ? "Watch the stroke order and direction."
                      : "Animation paused.",
                  );
                }}
              >
                {paused ? "Resume animation" : "Pause animation"}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}

export function StrokeOrder({ entry, visible, onPractise }) {
  const characters = writingCharacters(entry.form);
  const [expanded, setExpanded] = useState(false);
  const singleCharacter = entry.kind === "character" && characters.length === 1;
  if (!characters.length) return null;
  const practiceButton = (
    <button className="full" onClick={onPractise}>
      Practise writing{" "}
      {characters.length === 1
        ? "character"
        : entry.kind === "sentence"
          ? "sentence"
          : "word"}
    </button>
  );
  if (!singleCharacter) return practiceButton;
  return (
    <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>Stroke order</summary>
      {expanded && (
        <WritingBoard
          character={characters[0]}
          mode="watch"
          visible={visible}
        />
      )}
      {practiceButton}
    </details>
  );
}

function CharacterPractice({
  character,
  pinyin,
  index,
  progress,
  visible,
  update,
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
        onRestart={() =>
          update((old) => ({
            stroke: 0,
            completed: false,
            skipped: false,
            attempt: old.attempt + 1,
          }))
        }
        onStroke={(stroke) => update(() => ({ stroke }))}
        onMistake={() => update((old) => ({ mistakes: old.mistakes + 1 }))}
        onComplete={() => update(() => ({ completed: true }))}
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
        <button onClick={() => update(() => ({ skipped: true }))}>
          Skip unavailable character
        </button>
      )}
    </section>
  );
}

export function WritingPractice({
  session: s,
  setSession: set,
  visible,
  back,
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const heading = useRef(null);
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
            update={(update) =>
              set((old) => updateWritingCharacter(old, index, update))
            }
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
            onClick={() =>
              set((old) => ({
                ...old,
                progress: old.characters.map(() => ({
                  stroke: 0,
                  mistakes: 0,
                  completed: false,
                  skipped: false,
                  attempt: 0,
                })),
                attempt: old.attempt + 1,
              }))
            }
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
