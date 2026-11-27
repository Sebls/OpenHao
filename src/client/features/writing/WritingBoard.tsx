import { useI18n } from "../../i18n/I18n.tsx";
type Writer = ReturnType<typeof createWriter>["writer"];
interface BoardCallbacks {
  stroke: number;
  completed: boolean;
  onStroke?: (stroke: number) => void;
  onMistake?: () => void;
  onComplete?: () => void;
  onDemoComplete?: () => void;
  onUnavailable?: () => void;
  onReady?: () => void;
}
interface BoardProps extends Partial<BoardCallbacks> {
  character: string;
  mode: "quiz" | "watch";
  visible?: boolean;
  attempt?: number;
  compact?: boolean;
  pinyin?: string | null;
  onRestart?: () => void;
}
import { useEffect, useRef, useState } from "react";
import {
  createWriter,
  demonstrateRemainingStrokes,
  loadCharacter,
} from "./hanzi.ts";
import { StrokeProgression } from "./StrokeProgression.tsx";
export function WritingBoard({
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
}: BoardProps) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null),
    callbacks = useRef<BoardCallbacks>({ stroke, completed });
  const [status, setStatus] = useState(t("Loading stroke order…")),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const [playing, setPlaying] = useState(false),
    [paused, setPaused] = useState(false);
  const instance = useRef<Writer | null>(null);
  const [strokeData, setStrokeData] = useState<{
    character: string;
    strokes: string[];
  } | null>(null);
  const resumeQuiz = useRef<(() => Promise<void>) | null>(null),
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
      resource: ReturnType<typeof createWriter> | undefined;
    setStatus(t("Loading stroke order…"));
    setError(false);
    setStrokeData(null);
    setPlaying(false);
    setPaused(false);
    async function setup() {
      try {
        const data = await loadCharacter(character, controller.signal);
        if (disposed) return;
        setStrokeData({ character, strokes: data.strokes });
        resource = createWriter(host.current!, character, data, {
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
            t("Draw stroke {value0} of {value1}.", {
              value0: callbacks.current.stroke + 1,
              value1: data.strokes.length,
            }),
          );
          await resource!.writer.quiz({
            quizStartStrokeNum: callbacks.current.stroke,
            acceptBackwardsStrokes: false,
            showHintAfterMisses: 2,
            highlightOnComplete: false,
            onCorrectStroke: (result) => {
              if (disposed) return;
              callbacks.current.onStroke?.(result.strokeNum + 1);
              setStatus(
                result.strokesRemaining
                  ? t("Correct. Draw stroke {value0} of {value1}.", {
                      value0: result.strokeNum + 2,
                      value1: data.strokes.length,
                    })
                  : t("Character complete. Well done."),
              );
            },
            onMistake: () => {
              if (disposed) return;
              callbacks.current.onMistake?.();
              setStatus(
                t(
                  "Try again. Follow the stroke order and direction. A hint appears after two misses.",
                ),
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
              ? t("Character complete. Well done.")
              : t("{value0} strokes. Play when you’re ready.", {
                  value0: data.strokes.length,
                }),
          );
      } catch (e) {
        if (disposed || (e instanceof Error && e.name === "AbortError")) return;
        setError(true);
        setStatus(
          t(
            "Stroke data could not be loaded for this character. Try again or choose another character.",
          ),
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
    setStatus(t("Watch the stroke order and direction."));
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
          setStatus(
            t("Example could not finish. Your drawing progress is kept."),
          );
      } finally {
        if (instance.current === writer) setPlaying(false);
      }
      return;
    }
    const result = await writer.animateCharacter();
    if (instance.current !== writer || result?.canceled) return;
    setPlaying(false);
    setStatus(t("Animation finished. Replay whenever you like."));
    callbacks.current.onDemoComplete?.();
  }
  return (
    <div className="writing-board">
      <div
        ref={host}
        className={`hanzi-grid ${mode === "quiz" ? "is-writing" : ""}`}
        role="img"
        aria-label={t("{value0} for {value1}", {
          value0: mode === "quiz" ? t("Drawing area") : t("Stroke order"),
          value1: character,
        })}
      />
      {compact && (
        <p className="character-pinyin" lang="zh-Latn" aria-label="Pinyin">
          {pinyin || t("Pinyin unavailable")}
        </p>
      )}
      {compact && (
        <div className="character-controls">
          <button
            className="icon-control"
            aria-label={t("Play remaining strokes for {value0}", {
              value0: character,
            })}
            title={t("Play remaining strokes")}
            disabled={!instance.current || playing || completed || error}
            onClick={play}
          >
            <span aria-hidden="true">▷</span>
          </button>
          <button
            className="icon-control"
            aria-label={t("Restart {value0}", { value0: character })}
            title={t("Restart character")}
            onClick={onRestart}
          >
            <span aria-hidden="true">↺</span>
          </button>
        </div>
      )}
      {mode === "watch" && !error && (
        <div className="character-controls">
          <button
            className="icon-control"
            aria-label={
              playing && !paused
                ? t("Pause stroke order for {value0}", { value0: character })
                : paused
                  ? t("Resume stroke order for {value0}", { value0: character })
                  : t("Play stroke order for {value0}", { value0: character })
            }
            title={
              playing && !paused
                ? t("Pause stroke order")
                : paused
                  ? t("Resume stroke order")
                  : t("Play stroke order")
            }
            disabled={!instance.current}
            onClick={() => {
              if (!instance.current) return;
              if (!playing) return void play();
              if (paused) instance.current.resumeAnimation();
              else instance.current.pauseAnimation();
              setPaused(!paused);
              setStatus(
                paused
                  ? t("Watch the stroke order and direction.")
                  : t("Animation paused."),
              );
            }}
          >
            <span aria-hidden="true">{playing && !paused ? "Ⅱ" : "▷"}</span>
          </button>
        </div>
      )}
      <p role="status">{status}</p>
      {error && (
        <button onClick={() => setRetry((n) => n + 1)}>
          {t("Retry loading")}
        </button>
      )}
      {mode === "watch" && !error && strokeData?.character === character && (
        <StrokeProgression character={character} strokes={strokeData.strokes} />
      )}
    </div>
  );
}
