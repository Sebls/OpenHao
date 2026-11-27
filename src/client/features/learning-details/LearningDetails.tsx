import { useI18n } from "../../i18n/I18n.tsx";
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
import { ToneContours } from "./ToneContours.tsx";
interface Props {
  entry: Entry;
  active: Annotation;
  content: PageContent;
  speech: Speech;
  reference: string;
  visible: boolean;
  detailsRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onPractise: () => void;
  choose: (annotation: Annotation) => void;
}
export function LearningDetails({
  entry,
  active,
  content,
  speech,
  reference,
  visible,
  detailsRef,
  onClose,
  onPractise,
  choose,
}: Props) {
  const { t } = useI18n();
  const [copy, setCopy] = useState("");
  return (
    <aside
      className="details"
      tabIndex={-1}
      ref={detailsRef}
      aria-label={t("Learning details")}
    >
      <div className="detail-top">
        <span className="eyebrow">{t(entry.kind)}</span>
        <button
          onClick={() => {
            onClose();
          }}
          aria-label={t("Close learning details")}
        >
          <span className="wide-close">×</span>
          <span className="narrow-close">{t("← Return to page")}</span>
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
              aria-label={t("Phonetic transcription in IPA")}
              title={t("Phonetic transcription · IPA")}
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
                aria-label={t("Pronunciation information")}
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
                  ? t(
                      "Local Mandarin voice: {value0}. Test playback before listening practice.",
                      { value0: speech.voiceName },
                    )
                  : t(
                      "Pronunciation is unavailable. A Mandarin voice on your device is needed.",
                    )}
              </span>
            </span>
          </div>
        </div>
        <div className="speech">
          <p
            role="status"
            className={
              speech.available && !speech.failed ? "sr-only" : undefined
            }
          >
            {speech.available
              ? speech.status
              : t(
                  "Pronunciation is unavailable. A Mandarin voice on your device is needed.",
                )}
          </p>
        </div>
        {entry.pronunciationNote && (
          <p className="pronunciation-note">{entry.pronunciationNote}</p>
        )}
      </div>
      {entry.explanation && <p>{entry.explanation}</p>}
      <ToneContours entry={entry} entries={content.entries.entries} />
      <StrokeOrder
        key={`stroke-order:${entry.id}`}
        entry={entry}
        visible={visible}
        onPractise={onPractise}
      />
      <CharacterHistory key={`character-history:${entry.id}`} entry={entry} />
      {!!entry.constituentIds?.length && (
        <details open>
          <summary>{t("Explore the parts")}</summary>
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
          <summary>{t("How it works")}</summary>
          <p>{entry.grammar}</p>
        </details>
      )}
      <details>
        <summary>{t("In the original")}</summary>
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
                {t("Explore sentence")}
              </button>
            ))}
        </div>
      </details>
      <button
        className="quiet"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(reference);
            setCopy(t("Reference copied"));
          } catch {
            setCopy(t("Copy the reference below"));
          }
        }}
      >
        {t("Copy reference")}
      </button>
      {copy && (
        <div role="status">
          <small>{copy}</small>
          <input
            readOnly
            aria-label={t("Correction reference")}
            value={reference}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </aside>
  );
}
