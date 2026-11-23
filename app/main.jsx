import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as pdfjs from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { anchorRects } from "./model.js";
import "./style.css";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
const api = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error("The material could not be loaded. Try reopening it.");
  return r.json();
};
const pinyin = (e) =>
  e?.pronunciations?.find((p) => p.system === "pinyin")?.value;
function Source({ manifest, page, content, selected, onSelect }) {
  const canvas = useRef(),
    host = useRef(),
    [pdf, setPdf] = useState(null),
    [error, setError] = useState(""),
    [rendered, setRendered] = useState(false),
    [preview, setPreview] = useState(null);
  useEffect(() => {
    const task = pdfjs.getDocument({
      url: `/pdf/${manifest.documentId}/${manifest.contentRevision}`,
      cMapUrl: "/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/pdfjs/standard_fonts/",
      wasmUrl: "/pdfjs/wasm/",
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
      renderTask;
    let chain = Promise.resolve();
    const draw = () => {
      chain = chain
        .catch(() => {})
        .then(async () => {
          if (cancelled) return;
          setRendered(false);
          try {
            const p = await pdf.getPage(page.pageNumber);
            if (cancelled) return;
            const width = host.current.clientWidth,
              scale = width / p.getViewport({ scale: 1 }).width,
              dpr = Math.min(devicePixelRatio || 1, 2),
              viewport = p.getViewport({ scale: scale * dpr });
            canvas.current.width = viewport.width;
            canvas.current.height = viewport.height;
            renderTask = p.render({
              canvasContext: canvas.current.getContext("2d"),
              viewport,
            });
            await renderTask.promise;
            if (!cancelled) {
              setRendered(true);
              setError("");
            }
          } catch (e) {
            if (!cancelled && e.name !== "RenderingCancelledException")
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
    observer.observe(host.current);
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
  const selectAt = (event) => {
    const r = host.current.getBoundingClientRect(),
      x = (event.clientX - r.left) / r.width,
      y = (event.clientY - r.top) / r.height;
    const hits = anns.filter((a) =>
      anchorRects(a, content.layout).some(
        ([l, t, w, h]) => x >= l && x <= l + w && y >= t && y <= t + h,
      ),
    );
    return hits.sort(
      (a, b) =>
        (({ word: 0, expression: 1, character: 2, sentence: 3 })[a.kind] ?? 4) -
        ({ word: 0, expression: 1, character: 2, sentence: 3 }[b.kind] ?? 4),
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
                    e.clientX - host.current.getBoundingClientRect().left,
                    host.current.clientWidth - 220,
                  ),
                  y: e.clientY - host.current.getBoundingClientRect().top,
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
            .filter(
              (a) =>
                a.kind === "word" ||
                a.kind === "expression" ||
                a.id === selected?.id,
            )
            .flatMap((a) =>
              anchorRects(a, content.layout).map(([x, y, w, h], i) => (
                <span
                  key={a.id + i}
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
        href={`/pdf/${manifest.documentId}/${manifest.contentRevision}`}
        target="_blank"
        rel="noreferrer"
      >
        Open original PDF ↗
      </a>
    </>
  );
}
function App() {
  const [catalog, setCatalog] = useState({ documents: [], issues: [] }),
    [error, setError] = useState(""),
    [doc, setDoc] = useState(null),
    [view, setView] = useState("library"),
    [pageNo, setPageNo] = useState(1),
    [active, setActive] = useState(null),
    [zoom, setZoom] = useState(100),
    [unitKind, setUnitKind] = useState("word");
  const scroll = useRef(0),
    trigger = useRef(null),
    details = useRef(null);
  useEffect(() => {
    const update = () =>
      api("/api/catalog")
        .then(setCatalog)
        .catch(() =>
          setError(
            "The local library is unavailable. Check that npm start is running.",
          ),
        );
    update();
    const t = setInterval(update, 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    function key(e) {
      if (e.key === "Escape" && active) {
        setActive(null);
        trigger.current?.focus();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active]);
  const m = doc?.manifest,
    page = m?.pages[pageNo - 1],
    content = page && doc.pages[page.id],
    entry =
      active && content?.entries.entries.find((e) => e.id === active.entryId),
    newer =
      m &&
      catalog.documents.find(
        (d) =>
          d.documentId === m.documentId &&
          d.contentRevision > m.contentRevision,
      );
  async function open(manifest, keep = false) {
    try {
      setError("");
      const data = await api(
        `/api/document/${manifest.documentId}/${manifest.contentRevision}`,
      );
      setDoc(data);
      if (!keep) {
        setPageNo(
          data.manifest.pages.find((p) => p.state === "ready")?.pageNumber || 1,
        );
      }
      setActive(null);
      setView("reader");
    } catch (e) {
      setError(e.message);
    }
  }
  function choose(a, event) {
    trigger.current =
      event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    setActive(a);
  }
  function switchView(next) {
    if (view === "reader") scroll.current = window.scrollY;
    setView(next);
    if (next === "reader")
      requestAnimationFrame(() => window.scrollTo(0, scroll.current));
  }
  return (
    <>
      <header className="top">
        <button
          className="brand"
          onClick={() => switchView("library")}
          aria-label="Study library"
        >
          <span lang="zh-CN">学</span> Chinese <small>STUDY LIBRARY</small>
        </button>
        <nav aria-label="Main navigation">
          <button
            aria-current={view === "library" ? "page" : undefined}
            onClick={() => switchView("library")}
          >
            Library
          </button>
          {doc && (
            <>
              <button
                aria-current={view === "reader" ? "page" : undefined}
                onClick={() => switchView("reader")}
              >
                Read
              </button>
            </>
          )}
        </nav>
        <span className="local">On your computer</span>
      </header>
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}
      {view === "library" ? (
        <main className="library">
          <p className="eyebrow">YOUR LEARNING SPACE</p>
          <h1>
            A little Chinese,
            <br />
            one page at a time.
          </h1>
          <p className="intro">
            Read the original. Explore its words. Make them yours.
          </p>
          <div className="library-label">
            <h2>Your library</h2>
            <span>
              {catalog.documents.length} document
              {catalog.documents.length !== 1 ? "s" : ""} · available offline
            </span>
          </div>
          {catalog.documents.map((manifest) => (
            <article className="document" key={manifest.documentId}>
              <div className="book-mark" aria-hidden="true">
                <span lang="zh-CN">你好</span>
                <small>MANDARIN · BEGINNER</small>
              </div>
              <div>
                <p className="eyebrow">
                  ORIGINAL PDF · {manifest.source.pageCount} PAGES
                </p>
                <h2>{manifest.title}</h2>
                <p>
                  Concise English explanations, pronunciation, and practice.
                </p>
                <div className="page-states">
                  {manifest.pages.map((p) => (
                    <span
                      key={p.id}
                      className={p.state === "ready" ? "ready" : undefined}
                    >
                      Page {p.pageNumber} ·{" "}
                      {p.state === "ready" ? "Ready to study" : "Not prepared"}
                    </span>
                  ))}
                </div>
                <button className="primary" onClick={() => open(manifest)}>
                  Open document
                </button>
              </div>
            </article>
          ))}
          {!catalog.documents.length && (
            <p>
              No prepared documents yet. Ask the agent to prepare a PDF and
              physical pages.
            </p>
          )}
          {catalog.issues.map((i) => (
            <p key={i.documentId} role="status">
              A document needs attention: {i.documentId}. {i.message}
            </p>
          ))}
          <p className="footnote">
            Your PDFs and prepared lessons stay on this computer. Session
            progress resets when you reload.
          </p>
        </main>
      ) : (
        <main className="study">
          <div className="document-heading">
            <div>
              <p className="eyebrow">{m?.title}</p>
              <h1>
                {view === "reader" ? `Page ${pageNo}` : "Practice"}{" "}
                <span>
                  {view === "reader"
                    ? page?.state === "ready"
                      ? "Ready to study"
                      : "Not prepared"
                    : "From your prepared material"}
                </span>
              </h1>
            </div>
          </div>
          {newer && (
            <div className="banner">
              New learning material is available. Your current session is
              unchanged.{" "}
              <button onClick={() => open(newer, true)}>
                Load updated material
              </button>
            </div>
          )}
          <div style={{ display: view === "reader" ? "block" : "none" }}>
            <div className="reader-tools">
              <div>
                <button
                  disabled={pageNo === 1}
                  onClick={() => {
                    setPageNo((n) => n - 1);
                    setActive(null);
                  }}
                  aria-label="Previous page"
                >
                  ←
                </button>
                <label>
                  Physical page{" "}
                  <select
                    value={pageNo}
                    onChange={(e) => {
                      setPageNo(Number(e.target.value));
                      setActive(null);
                    }}
                  >
                    {m?.pages.map((p) => (
                      <option key={p.id} value={p.pageNumber}>
                        {p.pageNumber} / {m.source.pageCount}
                        {p.state === "ready" ? " · Ready" : " · Not prepared"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={pageNo === m?.source.pageCount}
                  onClick={() => {
                    setPageNo((n) => n + 1);
                    setActive(null);
                  }}
                  aria-label="Next page"
                >
                  →
                </button>
              </div>
              <label>
                Page size{" "}
                <select
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                >
                  <option value={100}>Fit width</option>
                  <option value={125}>125%</option>
                  <option value={150}>150%</option>
                </select>
              </label>
            </div>
            <div className="reading-layout">
              <section className="page-column" aria-label="PDF reader">
                <div className="page-scroll">
                  <div style={{ width: zoom + "%" }}>
                    {m && (
                      <Source
                        manifest={m}
                        page={page}
                        content={content}
                        selected={active}
                        onSelect={choose}
                      />
                    )}
                  </div>
                </div>
                {content ? (
                  <section className="companion">
                    <details open>
                      <summary>Text companion & learning units</summary>
                      <p>
                        Select a word on the page or explore the same material
                        below.
                      </p>
                      {content.review.issues?.length > 0 && (
                        <p className="coverage">
                          Some small decorative text is not transcribed; see
                          coverage notes below.
                        </p>
                      )}
                      <pre lang="zh-CN">{content.text}</pre>
                      <label>
                        Explore{" "}
                        <select
                          id="unit-kind"
                          value={unitKind}
                          onChange={(e) => setUnitKind(e.target.value)}
                        >
                          <option value="word">Words</option>
                          <option value="character">Characters</option>
                          <option value="sentence">Sentences</option>
                          <option value="all">All units</option>
                        </select>
                      </label>
                      <div className="units">
                        {content.annotations.annotations
                          .filter((a) => a.reviewStatus === "reviewed")
                          .map((a) => {
                            const e = content.entries.entries.find(
                              (e) => e.id === a.entryId,
                            );
                            return (
                              <button
                                key={a.id}
                                data-unit-kind={a.kind}
                                hidden={
                                  unitKind !== "all" && a.kind !== unitKind
                                }
                                aria-pressed={active?.id === a.id}
                                onClick={(event) => choose(a, event)}
                              >
                                <span lang="zh-CN">{e.form}</span>
                                <small>{pinyin(e)}</small>
                              </button>
                            );
                          })}
                      </div>
                    </details>
                    <details>
                      <summary>Page coverage notes</summary>
                      {content.review.issues.map((i, n) => (
                        <p key={n}>{i.reason || i.message}</p>
                      ))}
                    </details>
                  </section>
                ) : (
                  <div className="companion">
                    <h2>This page is not prepared yet</h2>
                    <p>
                      You can read the original page. Ask the agent to prepare
                      physical page {pageNo} for explanations and practice.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
