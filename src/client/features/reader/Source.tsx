import * as pdfjs from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type {
  Annotation,
  Entry,
  Manifest,
  Page,
  PageContent,
} from "../../../contracts/content.ts";
import { pinyin } from "../learning-details/pronunciation.ts";
import { anchorRects } from "./geometry.ts";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
export function Source({
  manifest,
  page,
  content,
  selected,
  showRegions,
  onSelect,
}: {
  manifest: Manifest;
  page: Page;
  content?: PageContent;
  selected: Annotation | null;
  showRegions: boolean;
  onSelect: (annotation: Annotation) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null),
    [error, setError] = useState(""),
    [rendered, setRendered] = useState(false),
    [preview, setPreview] = useState<{
      entry?: Entry;
      x: number;
      y: number;
    } | null>(null);
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const task = pdfjs.getDocument({
      url: `${base}pdf/${manifest.documentId}/${manifest.contentRevision}.pdf`,
      cMapUrl: `${base}pdfjs/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${base}pdfjs/standard_fonts/`,
      wasmUrl: `${base}pdfjs/wasm/`,
    });
    task.promise
      .then(setPdf)
      .catch(() =>
        setError(
          "The original page could not be opened. Use the original PDF link.",
        ),
      );
    return () => {
      task.destroy();
      setPdf(null);
    };
  }, [manifest.documentId, manifest.contentRevision]);
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false,
      renderTask: pdfjs.RenderTask | undefined;
    let chain = Promise.resolve();
    const draw = () => {
      chain = chain
        .catch(() => {})
        .then(async () => {
          if (cancelled) return;
          if (!host.current?.clientWidth) return;
          setRendered(false);
          try {
            const p = await pdf.getPage(page.pageNumber);
            if (cancelled) return;
            const width = host.current!.clientWidth,
              scale = width / p.getViewport({ scale: 1 }).width,
              dpr = Math.min(devicePixelRatio || 1, 2),
              viewport = p.getViewport({ scale: scale * dpr });
            canvas.current!.width = viewport.width;
            canvas.current!.height = viewport.height;
            renderTask = p.render({
              canvas: canvas.current!,
              canvasContext: canvas.current!.getContext("2d")!,
              viewport,
            });
            await renderTask.promise;
            if (!cancelled) {
              setRendered(true);
              setError("");
            }
          } catch (e) {
            if (
              !cancelled &&
              (!(e instanceof Error) ||
                e.name !== "RenderingCancelledException")
            )
              setError(
                "Page display failed. Try another page or open the original PDF.",
              );
          }
        });
    };
    draw();
    const observer = new ResizeObserver(() => {
      renderTask?.cancel();
      draw();
    });
    observer.observe(host.current!);
    return () => {
      cancelled = true;
      observer.disconnect();
      renderTask?.cancel();
    };
  }, [pdf, page.pageNumber]);
  const anns =
      content?.annotations.annotations.filter(
        (a) => a.reviewStatus === "reviewed",
      ) || [],
    entries = new Map(content?.entries.entries.map((e) => [e.id, e]) || []);
  const selectAt = (event: MouseEvent<HTMLDivElement>) => {
    if (!host.current || !content) return undefined;
    const r = host.current!.getBoundingClientRect(),
      x = (event.clientX - r.left) / r.width,
      y = (event.clientY - r.top) / r.height;
    const hits = anns.filter((a) =>
      anchorRects(a, content!.layout).some(
        ([l, t, w, h]) => x >= l && x <= l + w && y >= t && y <= t + h,
      ),
    );
    return hits.sort(
      (a, b) =>
        (({ word: 0, expression: 1, character: 2, sentence: 3, grammar: 4 })[
          a.kind
        ] ?? 4) -
        ({ word: 0, expression: 1, character: 2, sentence: 3, grammar: 4 }[
          b.kind
        ] ?? 4),
    )[0];
  };
  return (
    <>
      <div
        className="source"
        ref={host}
        style={{ aspectRatio: `${page.width}/${page.height}` }}
        onClick={(e) => {
          const a = selectAt(e);
          if (a) onSelect(a);
        }}
        onMouseMove={(e) => {
          const a = selectAt(e);
          setPreview(
            a
              ? {
                  entry: entries.get(a.entryId),
                  x: Math.min(
                    e.clientX - host.current!.getBoundingClientRect().left,
                    host.current!.clientWidth - 220,
                  ),
                  y: e.clientY - host.current!.getBoundingClientRect().top,
                }
              : null,
          );
        }}
        onMouseLeave={() => setPreview(null)}
      >
        <canvas
          ref={canvas}
          aria-label={`Original PDF, physical page ${page.pageNumber}. Learning text and controls follow below.`}
          role="img"
        />
        {rendered &&
          anns
            .filter((a) => showRegions || a.id === selected?.id)
            .flatMap((a) =>
              anchorRects(a, content!.layout).map(([x, y, w, h], i) => (
                <span
                  key={a.id + i}
                  aria-hidden="true"
                  className={`hotspot ${selected?.id === a.id ? "active" : ""}`}
                  style={{
                    left: x * 100 + "%",
                    top: y * 100 + "%",
                    width: w * 100 + "%",
                    height: h * 100 + "%",
                  }}
                />
              )),
            )}
        {!rendered && !error && (
          <div className="loading">Opening original page…</div>
        )}
        {error && <p role="alert">{error}</p>}
        {preview?.entry && (
          <div
            className="preview"
            style={{ left: Math.max(0, preview.x), top: preview.y + 30 }}
          >
            <strong lang="zh-CN">{preview.entry.form}</strong> ·{" "}
            {pinyin(preview.entry)}
            <br />
            {preview.entry.meaning}
          </div>
        )}
      </div>
      <a
        className="original-link"
        href={`${import.meta.env.BASE_URL}pdf/${manifest.documentId}/${manifest.contentRevision}.pdf`}
        target="_blank"
        rel="noreferrer"
      >
        Open original PDF ↗
      </a>
    </>
  );
}
