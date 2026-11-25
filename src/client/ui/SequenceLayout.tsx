export type SequenceLayout = "row" | "grid";
import { useLayoutEffect, useRef, useState } from "react";

export function useSequenceLayout(
  preference: string,
  defaultLayout: SequenceLayout = "row",
) {
  const [layout, setLayout] = useState<SequenceLayout>(() => {
    try {
      const saved = localStorage.getItem(preference);
      return saved === "grid" || saved === "row" ? saved : defaultLayout;
    } catch {
      return defaultLayout;
    }
  });

  function changeLayout(next: SequenceLayout) {
    setLayout(next);
    try {
      localStorage.setItem(preference, next);
    } catch {
      // The current view still updates when browser storage is unavailable.
    }
  }

  return [layout, changeLayout] as const;
}

export function SequenceLayoutControls({
  label,
  layout,
  onChange,
  rowLabel,
  gridLabel,
  showLabels = false,
}: {
  label: string;
  layout: SequenceLayout;
  onChange: (layout: SequenceLayout) => void;
  rowLabel: string;
  gridLabel: string;
  showLabels?: boolean;
}) {
  return (
    <div
      className={`sequence-layout-controls${showLabels ? " with-labels" : ""}`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="icon-control"
        aria-label={rowLabel}
        title={rowLabel}
        aria-pressed={layout === "row"}
        onClick={() => onChange("row")}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="1.5" y="6" width="4" height="8" rx="0.5" />
          <rect x="8" y="6" width="4" height="8" rx="0.5" />
          <rect x="14.5" y="6" width="4" height="8" rx="0.5" />
        </svg>
        {showLabels && rowLabel}
      </button>
      <button
        type="button"
        className="icon-control"
        aria-label={gridLabel}
        title={gridLabel}
        aria-pressed={layout === "grid"}
        onClick={() => onChange("grid")}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="3" width="5" height="5" rx="0.5" />
          <rect x="12" y="3" width="5" height="5" rx="0.5" />
          <rect x="3" y="12" width="5" height="5" rx="0.5" />
          <rect x="12" y="12" width="5" height="5" rx="0.5" />
        </svg>
        {showLabels && gridLabel}
      </button>
    </div>
  );
}

// Show layout choices only when a single row would overflow the available width.
export function useSequenceOverflow(count: number, itemWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [count]);
  return {
    ref,
    overflows:
      width > 0 && count * itemWidth + Math.max(0, count - 1) * 8 > width,
  };
}
