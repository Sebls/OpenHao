import { useI18n } from "../../i18n/I18n.tsx";
import { translateContent } from "../../i18n/content.ts";
import React from "react";
import type { Entry } from "../../../contracts/content.ts";
import {
  SequenceLayoutControls,
  useSequenceLayout,
  useSequenceOverflow,
} from "../../ui/SequenceLayout.tsx";
interface CharacterHistoryRecord {
  characters: string[];
  meaning?: string;
  forms: { unified_id: string; file: string; label: string; period?: string }[];
  origin?: { text: string; sources: { url: string; label: string }[] };
}

const entries = import.meta.glob<CharacterHistoryRecord>(
  "./history/*/entry.json",
  {
    eager: true,
    import: "default",
  },
);
const historyByCharacter = new Map(
  Object.entries(entries).flatMap(([path, entry]) => {
    const directory = path.split("/").at(-2);
    return entry.characters.map(
      (character) =>
        [
          character,
          {
            ...entry,
            assetPath: `${import.meta.env.BASE_URL}hanzi-history/${directory}/`,
          },
        ] as const,
    );
  }),
);

export function CharacterHistory({ entry }: { entry: Entry }) {
  const { t, language } = useI18n();
  const character = entry.form;
  const history = historyByCharacter.get(character);
  const { ref, overflows } = useSequenceOverflow(
    (history?.forms.length ?? 0) + 1,
    88,
  );
  const [preferredLayout, changeLayout] = useSequenceLayout(
    "reader.character-history-layout",
  );
  const layout = overflows ? preferredLayout : "row";
  if (!history) return null;

  const { assetPath, forms, meaning, origin } = history;
  return (
    <details className="character-history" open>
      <summary>{t("Character history")}</summary>
      {meaning && (
        <figure className="history-meaning">
          <img
            src={`${assetPath}meaning.svg`}
            alt=""
            width="52"
            height="52"
            loading="lazy"
          />
          <figcaption>{translateContent(meaning, language)}</figcaption>
        </figure>
      )}
      <div className="stroke-progression-header">
        <p className="field-label">{t("Character evolution")}</p>
        {overflows && (
          <SequenceLayoutControls
            label={t("Character history layout")}
            layout={layout}
            onChange={changeLayout}
            rowLabel={t("Scrolling row")}
            gridLabel={t("Grid")}
          />
        )}
      </div>
      <div
        ref={ref}
        className={`stroke-sequence history-sequence${layout === "grid" ? " is-grid" : ""}`}
        role="region"
        aria-label={
          !overflows
            ? t("Character forms")
            : layout === "row"
              ? t("Character forms, scroll horizontally for more")
              : t("Character forms in a grid")
        }
        tabIndex={overflows && layout === "row" ? 0 : undefined}
      >
        <ol>
          {forms.map((form) => (
            <li key={form.unified_id}>
              <figure>
                <div className="history-glyph">
                  <img src={`${assetPath}${form.file}`} alt="" loading="lazy" />
                </div>
                <figcaption>
                  {translateContent(form.label, language)}
                  {form.period && (
                    <span className="history-period">
                      {translateContent(form.period, language)}
                    </span>
                  )}
                </figcaption>
              </figure>
            </li>
          ))}
          <li>
            <figure>
              <div
                className="history-glyph history-modern"
                lang={
                  history.characters.indexOf(character) > 0
                    ? "zh-Hant"
                    : "zh-Hans"
                }
              >
                {character}
              </div>
              <figcaption>{t("Modern")}</figcaption>
            </figure>
          </li>
        </ol>
      </div>
      {origin && (
        <div className="history-origin">
          <p>{translateContent(origin.text, language)}</p>
          <p className="history-sources">
            {origin.sources.map((source, index) => (
              <React.Fragment key={source.url}>
                {index > 0 && " · "}
                <a href={source.url} target="_blank" rel="noreferrer">
                  {translateContent(source.label, language)} ↗
                </a>
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </details>
  );
}
