import React from "react";
import {
  SequenceLayoutControls,
  useSequenceLayout,
} from "./SequenceLayout.jsx";

const entries = import.meta.glob("../public/hanzi-history/*/entry.json", {
  eager: true,
  import: "default",
});
const historyByCharacter = new Map(
  Object.entries(entries).flatMap(([path, entry]) => {
    const directory = path.split("/").at(-2);
    return entry.characters.map((character) => [
      character,
      {
        ...entry,
        assetPath: `${import.meta.env.BASE_URL}hanzi-history/${directory}/`,
      },
    ]);
  }),
);

export function CharacterHistory({ entry }) {
  const character = entry.form;
  const history =
    entry.kind === "character" && historyByCharacter.get(character);
  const [layout, changeLayout] = useSequenceLayout(
    "reader.character-history-layout",
  );
  if (!history) return null;

  const { assetPath, forms, meaning, origin } = history;
  return (
    <details className="character-history">
      <summary>Character history</summary>
      {meaning && (
        <figure className="history-meaning">
          <img
            src={`${assetPath}meaning.svg`}
            alt=""
            width="52"
            height="52"
            loading="lazy"
          />
          <figcaption>{meaning}</figcaption>
        </figure>
      )}
      <SequenceLayoutControls
        label="Character history layout"
        layout={layout}
        onChange={changeLayout}
        rowLabel="Roll"
        gridLabel="Matrix"
        showLabels
      />
      <div
        key={character}
        className={`stroke-sequence history-sequence${layout === "grid" ? " is-grid" : ""}`}
        role="region"
        aria-label={
          layout === "row"
            ? "Character forms, scroll horizontally for more"
            : "Character forms in a grid"
        }
        tabIndex={layout === "row" ? 0 : undefined}
      >
        <ol>
          {forms.map((form) => (
            <li key={form.unified_id}>
              <figure>
                <div className="history-glyph">
                  <img src={`${assetPath}${form.file}`} alt="" loading="lazy" />
                </div>
                <figcaption>
                  {form.label}
                  {form.period && (
                    <span className="history-period">{form.period}</span>
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
              <figcaption>Modern</figcaption>
            </figure>
          </li>
        </ol>
      </div>
      {origin && (
        <div className="history-origin">
          <p>{origin.text}</p>
          <p className="history-sources">
            {origin.sources.map((source, index) => (
              <React.Fragment key={source.url}>
                {index > 0 && " · "}
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label} ↗
                </a>
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </details>
  );
}
