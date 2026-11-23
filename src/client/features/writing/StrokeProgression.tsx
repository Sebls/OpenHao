import {
  SequenceLayoutControls,
  useSequenceLayout,
} from "../../ui/SequenceLayout.tsx";
import { strokeDiagramTransform } from "./hanzi.ts";
export function StrokeProgression({
  character,
  strokes,
}: {
  character: string;
  strokes: string[];
}) {
  const [layout, changeLayout] = useSequenceLayout(
    "reader.stroke-progression-layout",
  );
  return (
    <section
      className="stroke-progression"
      aria-label={`Stroke progression for ${character}`}
    >
      <div className="stroke-progression-header">
        <p className="field-label">Stroke by stroke</p>
        <SequenceLayoutControls
          label="Stroke diagram layout"
          layout={layout}
          onChange={changeLayout}
          rowLabel="Scrolling row"
          gridLabel="Four-column grid"
        />
      </div>
      <div
        className={`stroke-sequence ${layout === "grid" ? "is-grid" : ""}`}
        role="region"
        aria-label={
          layout === "row"
            ? "Stroke diagrams, scroll horizontally for more"
            : "Stroke diagrams in four columns"
        }
        tabIndex={layout === "row" ? 0 : undefined}
      >
        <ol>
          {strokes.map((_, index) => (
            <li key={index}>
              <div
                className="hanzi-grid stroke-step"
                role="img"
                aria-label={`${character}: strokes 1–${index + 1} of ${strokes.length}`}
              >
                <svg viewBox="0 0 260 260" aria-hidden="true">
                  <g transform={strokeDiagramTransform}>
                    {strokes.slice(0, index + 1).map((path, strokeIndex) => (
                      <path
                        key={strokeIndex}
                        d={path}
                        className={
                          strokeIndex === index ? "new-stroke" : undefined
                        }
                      />
                    ))}
                  </g>
                </svg>
                <span className="stroke-step-number" aria-hidden="true">
                  {index + 1}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
