import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./style.css";
const api = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error("The material could not be loaded. Try reopening it.");
  return r.json();
};
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
                      <a
                        className="original-link"
                        href={`/pdf/${m.documentId}/${m.contentRevision}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open original PDF ↗
                      </a>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
