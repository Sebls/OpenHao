import React, { useState } from "react";

export function useSequenceLayout(preference) {
  const [layout, setLayout] = useState(() => {
    try {
      return localStorage.getItem(preference) === "grid" ? "grid" : "row";
    } catch {
      return "row";
    }
  });

  function changeLayout(next) {
    setLayout(next);
    try {
      localStorage.setItem(preference, next);
    } catch {
      // The current view still updates when browser storage is unavailable.
    }
  }

  return [layout, changeLayout];
}

export function SequenceLayoutControls({
  label,
  layout,
  onChange,
  rowLabel,
  gridLabel,
  showLabels = false,
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
