import { useId, useState } from "react";
import type { Entry } from "../../../contracts/content.ts";
import {
  SequenceLayoutControls,
  useSequenceLayout,
} from "../../ui/SequenceLayout.tsx";
import { toneGuides, toneSyllables } from "./tones.ts";
import { toneIpa } from "./toneIpa.ts";

const expandedPreference = "reader.tone-guide-expanded";
function readExpandedPreference() {
  try {
    return localStorage.getItem(expandedPreference) !== "false";
  } catch {
    return true;
  }
}

export function ToneContours({
  entry,
  entries,
}: {
  entry: Entry;
  entries: Entry[];
}) {
  const [expanded, setExpanded] = useState(readExpandedPreference);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  const [preferredLayout, changeLayout] = useSequenceLayout(
    "reader.tone-contour-layout",
  );
  const syllables = toneSyllables(entry);
  const transcriptions = toneIpa(entry, entries, syllables);
  const canChangeLayout = syllables.length >= 4;
  const layout = canChangeLayout ? preferredLayout : "row";
  if (!syllables.length) return null;
  return (
    <details
      className="tone-guide"
      open={expanded}
      onToggle={(event) => {
        const open = event.currentTarget.open;
        if (open === expanded) return;
        setExpanded(open);
        setHelpOpen(false);
        try {
          localStorage.setItem(expandedPreference, String(open));
        } catch {
          /* Keep the current view usable without storage. */
        }
      }}
    >
      <summary>Pitch guide</summary>
      <div className="tone-guide-tools">
        <button
          type="button"
          className="icon-control tone-help-button"
          aria-label="Pitch guide information"
          aria-expanded={helpOpen}
          aria-controls={helpId}
          onClick={() => setHelpOpen(!helpOpen)}
        >
          <span aria-hidden="true">ⓘ</span>
        </button>
        {canChangeLayout && (
          <SequenceLayoutControls
            label="Pitch guide layout"
            layout={layout}
            onChange={changeLayout}
            rowLabel="Tone curves in a scrolling row"
            gridLabel="Tone curves in a grid"
          />
        )}
      </div>
      {helpOpen && (
        <div id={helpId} className="tone-help" role="note">
          Follow left to right: the dot is your starting pitch; higher curves
          mean a higher voice. Curves cover Chinese syllables in the written
          pinyin. Connected speech can change tones (nǐ hǎo is usually spoken ní
          hǎo). Tone 3 often stays low; the dashed rise is used in isolation or
          at some phrase endings. Neutral syllables are short and light; ∼ means
          their pitch varies with context.
        </div>
      )}
      <div
        className={`tone-sequence ${layout === "grid" ? "is-grid" : ""}`}
        tabIndex={layout === "row" && syllables.length > 1 ? 0 : undefined}
        role="region"
        aria-label={
          layout === "row"
            ? "Tone curves, scroll horizontally for more"
            : "Tone curves in reading order"
        }
      >
        <ol>
          {syllables.map((syllable, i) => {
            const guide = toneGuides[syllable.tone];
            return (
              <li
                key={i}
                className={`tone-${syllable.tone}${syllable.segmentStart ? " tone-segment-start" : ""}`}
              >
                <figure
                  aria-label={`${syllable.character}, ${syllable.pinyin}: ${syllable.tone ? `tone ${syllable.tone}` : "neutral tone"}, ${guide.label.toLowerCase()}${transcriptions[i] ? `, IPA ${transcriptions[i]}` : ""}`}
                >
                  <span
                    className="tone-character"
                    lang="zh-CN"
                    aria-hidden="true"
                  >
                    {syllable.character}
                  </span>
                  <svg
                    viewBox="0 0 100 80"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      className="tone-reference"
                      d="M 8 12 H 92 M 8 40 H 92 M 8 68 H 92"
                    />
                    {syllable.tone ? (
                      <>
                        <path className="tone-curve" d={guide.path} />
                        <circle
                          cx="12"
                          cy={
                            syllable.tone === 2
                              ? 40
                              : syllable.tone === 3
                                ? 54
                                : 12
                          }
                          r="3"
                          fill="currentColor"
                        />
                        {syllable.tone === 3 && (
                          <path
                            className="tone-curve tone-optional"
                            d="M 48 68 Q 68 68 88 26"
                          />
                        )}
                      </>
                    ) : (
                      <text
                        x="50"
                        y="48"
                        textAnchor="middle"
                        className="tone-neutral"
                      >
                        ∼
                      </text>
                    )}
                  </svg>
                  <figcaption aria-hidden="true">
                    <span className="tone-pinyin" lang="zh-Latn">
                      {syllable.pinyin}
                    </span>
                    {transcriptions[i] && (
                      <span
                        className="tone-ipa"
                        title="Phonetic transcription · IPA"
                      >
                        {transcriptions[i]}
                      </span>
                    )}
                    <span>
                      {syllable.tone ? `Tone ${syllable.tone}` : "Neutral"}
                    </span>
                    <span className="tone-direction">{guide.label}</span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}
