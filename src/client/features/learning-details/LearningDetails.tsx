import type { RefObject } from "react";
import { useState } from "react";
import type {
  Annotation,
  Entry,
  PageContent,
} from "../../../contracts/content.ts";
import { PronunciationButton } from "../speech/PronunciationButton.tsx";
import type { Speech } from "../speech/useSpeech.ts";
import { StrokeOrder } from "../writing/StrokeOrder.tsx";
import { CharacterHistory } from "./CharacterHistory.tsx";
import { pinyin } from "./pronunciation.ts";
interface Props {
  entry: Entry;
  active: Annotation;
  content: PageContent;
  speech: Speech;
  selection: Set<string>;
  reference: string;
  visible: boolean;
  detailsRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onToggle: () => void;
  onPractise: () => void;
  choose: (annotation: Annotation) => void;
}
export function LearningDetails({
  entry,
  active,
  content,
  speech,
  selection,
  reference,
  visible,
  detailsRef,
  onClose,
  onToggle,
  onPractise,
  choose,
}: Props) {
  const [copy, setCopy] = useState("");
  return (
    <aside
      className="details"
      tabIndex={-1}
      ref={detailsRef}
      aria-label="Learning details"
    >
      <div className="detail-top">
        <span className="eyebrow">{entry.kind}</span>
        <button
          onClick={() => {
            onClose();
          }}
          aria-label="Close learning details"
        >
          <span className="wide-close">×</span>
          <span className="narrow-close">← Return to page</span>
        </button>
      </div>
      <h2 lang="zh-CN">{entry.form}</h2>
      <p className="meaning">{entry.meaning}</p>
      <div className="pronunciation">
        <span className="field-label">Pinyin</span>
        <div className="pronunciation-transcription">
          <span lang="zh-Latn">{pinyin(entry)}</span>
          {entry.pronunciations.find((p) => p.system === "ipa")?.value && (
            <span
              className="ipa-transcription"
              aria-label="Phonetic transcription in IPA"
              title="Phonetic transcription · IPA"
            >
              {entry.pronunciations.find((p) => p.system === "ipa")?.value}
            </span>
          )}
          <div className="speech-controls">
            <PronunciationButton
              speech={speech}
              text={entry.speechTarget || entry.form}
            />
            <span className="speech-info">
              <button
                type="button"
                className="icon-control"
                aria-label="Pronunciation information"
                aria-describedby="voice-information"
              >
                <span aria-hidden="true">ⓘ</span>
              </button>
              <span
                id="voice-information"
                role="tooltip"
                className="speech-tooltip"
              >
                {speech.available
                  ? `Local Mandarin voice: ${speech.voiceName}. Test playback before listening practice.`
                  : "Pronunciation is unavailable. A Mandarin voice on your device is needed."}
              </span>
            </span>
          </div>
        </div>
        <div className="speech">
          <p
            role="status"
            className={
              speech.available && !speech.status.startsWith("Audio could not")
                ? "sr-only"
                : undefined
            }
          >
            {speech.available
              ? speech.status
              : "Pronunciation is unavailable. A Mandarin voice on your device is needed."}
          </p>
        </div>
        {entry.pronunciationNote && (
          <p className="pronunciation-note">{entry.pronunciationNote}</p>
        )}
      </div>
      {entry.explanation && <p>{entry.explanation}</p>}
      <StrokeOrder
        key={entry.id}
        entry={entry}
        visible={visible}
        onPractise={onPractise}
      />
      <CharacterHistory entry={entry} />
      {!!entry.constituentIds?.length && (
        <details open>
          <summary>Explore the parts</summary>
          <div className="parts">
            {entry.constituentIds?.map((id) => {
              const e = content.entries.entries.find((e) => e.id === id),
                a = content.annotations.annotations.find(
                  (a) =>
                    a.entryId === id &&
                    a.anchors[0].start >= active.anchors[0].start &&
                    a.anchors[0].end <= active.anchors.at(-1)!.end,
                );
              return (
                e && (
                  <button key={id} disabled={!a} onClick={() => a && choose(a)}>
                    <span lang="zh-CN">{e.form}</span> · {e.meaning}
                  </button>
                )
              );
            })}
          </div>
        </details>
      )}
      {entry.grammar && (
        <details>
          <summary>How it works</summary>
          <p>{entry.grammar}</p>
        </details>
      )}
      <details>
        <summary>In the original</summary>
        <p lang="zh-CN">
          {
            content.layout.lines.find(
              (l) =>
                l.start <= active.anchors[0].start &&
                l.end >= active.anchors[0].end,
            )?.exactText
          }
        </p>
        <div className="parts">
          {content.annotations.annotations
            .filter(
              (a) =>
                a.kind === "sentence" &&
                a.anchors.some(
                  (x) =>
                    x.start <= active.anchors[0].start &&
                    x.end >= active.anchors[0].end,
                ),
            )
            .map((a) => (
              <button key={a.id} onClick={() => choose(a)}>
                Explore sentence
              </button>
            ))}
        </div>
      </details>
      <button
        className="primary full"
        onClick={onToggle}
        aria-pressed={selection.has(active.id)}
      >
        {selection.has(active.id)
          ? "✓ Remove from practice"
          : "+ Add to practice"}
      </button>
      <button
        className="quiet"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(reference);
            setCopy("Reference copied");
          } catch {
            setCopy("Copy the reference below");
          }
        }}
      >
        Copy reference
      </button>
      {copy && (
        <div role="status">
          <small>{copy}</small>
          <input
            readOnly
            aria-label="Correction reference"
            value={reference}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </aside>
  );
}
