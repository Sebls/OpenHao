import {
  SequenceLayoutControls,
  useSequenceLayout,
  useSequenceOverflow,
} from "../../ui/SequenceLayout.tsx";
import { strokeDiagramTransform } from "./hanzi.ts";
export function StrokeProgression({
  character,
  strokes,
}: {
  character: string;
  strokes: string[];
}) {
  const { ref, overflows } = useSequenceOverflow(strokes.length, 72);
  const [preferredLayout, changeLayout] = useSequenceLayout(
    "reader.stroke-progression-layout",
  );
  const layout = overflows ? preferredLayout : "row";
  return (
    <section
      className="stroke-progression"
      aria-label={`Stroke progression for ${character}`}
    >
      <div className="stroke-progression-header">
        <p className="field-label">Stroke by stroke</p>
        {overflows && (
          <SequenceLayoutControls
            label="Stroke diagram layout"
            layout={layout}
            onChange={changeLayout}
            rowLabel="Scrolling row"
            gridLabel="Grid"
          />
        )}
      </div>
      <div
        ref={ref}
        className={`stroke-sequence ${layout === "grid" ? "is-grid" : ""}`}
        role="region"
        aria-label={
          !overflows
            ? "Stroke diagrams"
            : layout === "row"
              ? "Stroke diagrams, scroll horizontally for more"
              : "Stroke diagrams in a grid"
        }
        tabIndex={overflows && layout === "row" ? 0 : undefined}
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
