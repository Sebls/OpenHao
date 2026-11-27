import { useI18n } from "../../i18n/I18n.tsx";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export function ReadingLayout({
  children,
  details,
}: {
  children: ReactNode;
  details: ReactNode;
}) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; width: number } | null>(null);
  const [width, setWidth] = useState(440);
  const [available, setAvailable] = useState(1200);
  useLayoutEffect(() => {
    const element = host.current!;
    const observer = new ResizeObserver(() =>
      setAvailable(element.clientWidth),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const maximum = Math.max(300, Math.min(800, available - 380));
  const actual = Math.min(width, maximum);
  const resize = (next: number) =>
    setWidth(Math.max(300, Math.min(maximum, next)));
  return (
    <div
      ref={host}
      className={`reading-layout ${details ? "with-details" : ""}`}
      style={
        details
          ? { gridTemplateColumns: `minmax(0, 1fr) 20px ${actual}px` }
          : undefined
      }
    >
      {children}
      {details && (
        <>
          <div
            className="details-resizer"
            role="separator"
            tabIndex={0}
            aria-label={t("Resize learning details")}
            aria-orientation="vertical"
            aria-valuemin={300}
            aria-valuemax={maximum}
            aria-valuenow={actual}
            aria-valuetext={`${Math.round(actual)} pixels`}
            title={t("Drag to resize details. Use arrow keys to adjust.")}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = {
                id: event.pointerId,
                x: event.clientX,
                width: actual,
              };
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (start?.id === event.pointerId)
                resize(start.width + start.x - event.clientX);
            }}
            onPointerUp={(event) => {
              drag.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onDoubleClick={() => resize(440)}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 50 : 20;
              if (event.key === "ArrowLeft") resize(actual + step);
              else if (event.key === "ArrowRight") resize(actual - step);
              else if (event.key === "Home") resize(300);
              else if (event.key === "End") resize(maximum);
              else return;
              event.preventDefault();
            }}
          />
          {details}
        </>
      )}
    </div>
  );
}
