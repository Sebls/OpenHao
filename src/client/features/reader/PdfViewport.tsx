import type { ReactNode, RefObject } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export function PdfViewport({
  children,
  viewportRef,
  zoom,
  onZoom,
  pageRatio,
  originalHref,
}: {
  children: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  onZoom: (zoom: number) => void;
  pageRatio: number;
  originalHref: string;
}) {
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [panning, setPanning] = useState(false);
  const [fit, setFit] = useState<"width" | "height" | null>("width");
  const changeZoom = (value: number) => {
    setFit(null);
    onZoom(value);
  };
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element || !fit) return;
    const update = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      const value =
        fit === "width"
          ? 100
          : (((element.clientHeight - 2) * pageRatio) /
              (element.clientWidth - 2)) *
            100;
      onZoom(value);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit, pageRatio, viewportRef, onZoom]);
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (element)
      element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
  }, [zoom, viewportRef]);

  return (
    <>
      <div className="pdf-toolbar">
        <p className="pdf-hint" id="pdf-mouse-help">
          Drag to pan · Scroll to move
        </p>
        <div className="pdf-zoom-controls" role="group" aria-label="PDF zoom">
          <button
            type="button"
            className="icon-control"
            aria-label="Fit PDF width"
            title="Fit width"
            aria-pressed={fit === "width"}
            onClick={() => {
              setFit("width");
              onZoom(100);
              viewportRef.current?.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant",
              });
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3v14M17 3v14M4 10h12M7 7l-3 3 3 3M13 7l3 3-3 3" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-control"
            aria-label="Fit PDF height"
            title="Fit height"
            aria-pressed={fit === "height"}
            onClick={() => {
              setFit("height");
              viewportRef.current?.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant",
              });
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3h14M3 17h14M10 4v12M7 7l3-3 3 3M7 13l3 3 3-3" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-control"
            aria-label="Zoom out"
            disabled={zoom <= 25}
            onClick={() => changeZoom(Math.max(25, Math.round(zoom) - 25))}
          >
            −
          </button>
          <label>
            <span className="sr-only">Page size</span>
            <select
              value={zoom}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value === 100) {
                  setFit("width");
                  onZoom(100);
                } else changeZoom(value);
              }}
            >
              <option value={25}>25%</option>
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>Fit width</option>
              {![25, 50, 75, 100, 125, 150, 200, 300].includes(zoom) && (
                <option value={zoom}>{Math.round(zoom)}%</option>
              )}
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
              <option value={300}>300%</option>
            </select>
          </label>
          <button
            type="button"
            className="icon-control"
            aria-label="Zoom in"
            disabled={zoom >= 300}
            onClick={() => changeZoom(Math.min(300, Math.round(zoom) + 25))}
          >
            +
          </button>
        </div>
      </div>
      <div
        className={`page-scroll${panning ? " is-panning" : ""}`}
        ref={viewportRef}
        tabIndex={0}
        role="region"
        aria-label="Scrollable original page"
        aria-describedby="pdf-mouse-help"
        onPointerDown={(event) => {
          if (
            event.pointerType !== "mouse" ||
            event.button !== 0 ||
            !(event.target instanceof Element) ||
            !event.target.closest(".source")
          )
            return;
          suppressClick.current = false;
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          if (event.buttons !== 1) {
            drag.current = null;
            setPanning(false);
            return;
          }
          const dx = event.clientX - start.x,
            dy = event.clientY - start.y;
          if (!start.moved && Math.hypot(dx, dy) < 5) return;
          start.moved = true;
          suppressClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanning(true);
          event.currentTarget.scrollLeft = start.left - dx;
          event.currentTarget.scrollTop = start.top - dy;
        }}
        onPointerUp={(event) => {
          drag.current = null;
          setPanning(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerLeave={() => {
          if (!drag.current?.moved) drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPanning(false);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
          setPanning(false);
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <div className="pdf-stage" style={{ width: `${Math.max(100, zoom)}%` }}>
          <div
            className="pdf-page"
            style={{ width: `${Math.min(100, zoom)}%` }}
          >
            {children}
          </div>
        </div>
      </div>
      <a
        className="original-link"
        href={originalHref}
        target="_blank"
        rel="noreferrer"
      >
        Open original PDF ↗
      </a>
    </>
  );
}
