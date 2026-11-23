import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as pdfjs from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { eligibleQuestions, shuffle, isCorrect, anchorRects } from "./model.js";
import { StrokeOrder, WritingPractice } from "./Writing.jsx";
import { CharacterHistory } from "./CharacterHistory.jsx";
import { createWritingSession } from "./writing-model.js";
import "./style.css";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
const api = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error("The material could not be loaded. Try reopening it.");
  return r.json();
};
const pinyin = (e) =>
  e?.pronunciations?.find((p) => p.system === "pinyin")?.value;
function useSpeech() {
  const [voices, setVoices] = useState([]),
    [status, setStatus] = useState(""),
    [working, setWorking] = useState(false),
    [activeText, setActiveText] = useState(null);
  const timer = useRef(),
    utteranceId = useRef(0);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () =>
      setVoices(
        speechSynthesis
          .getVoices()
          .filter((v) => v.localService && /^zh(-|_)(CN|Hans)/i.test(v.lang)),
      );
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", update);
      speechSynthesis.cancel();
      clearTimeout(timer.current);
    };
  }, []);
  function stop() {
    utteranceId.current++;
    clearTimeout(timer.current);
    window.speechSynthesis?.cancel();
    setActiveText(null);
    setStatus("Stopped");
  }
  function speak(text) {
    if (!voices.length) return;
    stop();
    const id = utteranceId.current,
      utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[0];
    utterance.lang = voices[0].lang;
    utterance.rate = 0.8;
    setActiveText(text);
    setStatus("Starting pronunciation…");
    utterance.onstart = () => {
      if (id !== utteranceId.current) return;
      setStatus("Playing");
      clearTimeout(timer.current);
    };
    utterance.onend = () => {
      if (id !== utteranceId.current) return;
      setActiveText(null);
      setStatus("Finished");
      setWorking(true);
      clearTimeout(timer.current);
    };
    utterance.onerror = () => {
      if (id !== utteranceId.current) return;
      setActiveText(null);
      setStatus("Audio could not play. Try again.");
      setWorking(false);
      clearTimeout(timer.current);
    };
    timer.current = setTimeout(() => {
      speechSynthesis.cancel();
      setActiveText(null);
      setStatus("Audio could not play. Try again.");
      setWorking(false);
    }, 12000);
    speechSynthesis.speak(utterance);
  }
  return {
    available: voices.length > 0,
    voiceName: voices[0]?.name,
    working,
    activeText,
    status,
    speak,
    stop,
  };
}
function PronunciationButton({ speech, text }) {
  const playing = speech.activeText === text;
  const label = playing ? "Stop pronunciation" : "Play pronunciation";
  return (
    <button
      type="button"
      className="icon-control"
      aria-label={label}
      title={label}
      disabled={!speech.available}
      onClick={() => (playing ? speech.stop() : speech.speak(text))}
    >
      <span aria-hidden="true">{playing ? "□" : "▷"}</span>
    </button>
  );
}
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
    [selection, setSelection] = useState(new Set()),
    [session, setSession] = useState(null),
    [writingSession, setWritingSession] = useState(null),
    [copy, setCopy] = useState(""),
    [notice, setNotice] = useState(""),
    [zoom, setZoom] = useState(100),
    [unitKind, setUnitKind] = useState("word");
  const speech = useSpeech(),
    scroll = useRef(0),
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
      for (const [pageId, p] of Object.entries(data.pages))
        p.questions.questions = p.questions.questions.map((q) => ({
          ...q,
          pageId,
        }));
      setDoc(data);
      if (!keep) {
        setPageNo(
          data.manifest.pages.find((p) => p.state === "ready")?.pageNumber || 1,
        );
        setSelection(new Set());
        setSession(null);
        setWritingSession(null);
      }
      setActive(null);
      if (keep) setWritingSession(null);
      setView("reader");
    } catch (e) {
      setError(e.message);
    }
  }
  function choose(a, event) {
    trigger.current =
      event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    setActive(a);
    setCopy("");
    if (window.innerWidth < 850)
      requestAnimationFrame(() => details.current?.focus());
  }
  function switchView(next) {
    if (view === "reader") scroll.current = window.scrollY;
    setView(next);
    if (next === "reader")
      requestAnimationFrame(() => window.scrollTo(0, scroll.current));
  }
  function begin(selected) {
    const bank = eligibleQuestions(doc.pages, selected, speech.working);
    if (!bank.length) {
      setNotice(
        "No reviewed questions cover this selection. Add a word or sentence, or practise the prepared document.",
      );
      return;
    }
    setSession({
      questions: bank.map((q) => ({ ...q, options: shuffle(q.options) })),
      index: 0,
      answers: {},
      choice: null,
      checked: false,
    });
    setNotice("");
    switchView("practice");
  }
  function beginWriting() {
    speech.stop();
    setWritingSession(
      createWritingSession(entry, active, page.id, content.entries.entries),
    );
    switchView("writing");
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }
  function back() {
    speech.stop();
    switchView("reader");
  }
  function toggle() {
    setSelection((old) => {
      const n = new Set(old);
      n.has(active.id) ? n.delete(active.id) : n.add(active.id);
      return n;
    });
  }
  function returnSource(q) {
    const id = q.sourceAnnotationIds[0];
    let target;
    for (const [p, data] of Object.entries(doc.pages)) {
      const a = data.annotations.annotations.find((a) => a.id === id);
      if (a) {
        setPageNo(m.pages.find((p2) => p2.id === p).pageNumber);
        setActive(a);
        target = anchorRects(a, data.layout)[0];
        break;
      }
    }
    back();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const source = document.querySelector(".source");
        if (source && target && source.clientHeight)
          window.scrollTo(
            0,
            window.scrollY +
              source.getBoundingClientRect().top +
              target[1] * source.clientHeight -
              80,
          );
      }),
    );
  }
  const reference =
    active &&
    `${m.documentId}:${page.id}:annotation:${active.id}@r${m.contentRevision}`;
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
              <button
                aria-current={view === "practice" ? "page" : undefined}
                onClick={() => {
                  if (session) switchView("practice");
                  else begin(null);
                }}
              >
                Practice
              </button>
              {writingSession && (
                <button
                  aria-current={view === "writing" ? "page" : undefined}
                  onClick={() => switchView("writing")}
                >
                  Writing
                </button>
              )}
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
                {view === "reader"
                  ? `Page ${pageNo}`
                  : view === "writing"
                    ? "Writing practice"
                    : "Practice"}{" "}
                <span>
                  {view === "reader"
                    ? page?.state === "ready"
                      ? "Ready to study"
                      : "Not prepared"
                    : "From your prepared material"}
                </span>
              </h1>
            </div>
            <div className="actions">
              {view === "reader" ? (
                <>
                  <button
                    onClick={() => begin(selection)}
                    disabled={!selection.size}
                  >
                    Practise selection ({selection.size})
                  </button>
                  <button
                    onClick={() =>
                      begin(
                        new Set(
                          content?.annotations.annotations.map((a) => a.id) ||
                            [],
                        ),
                      )
                    }
                    disabled={!content}
                  >
                    Practise page
                  </button>
                  <button
                    className="primary"
                    onClick={() =>
                      session ? switchView("practice") : begin(null)
                    }
                  >
                    {session ? "Resume practice" : "Practise document"}
                  </button>
                </>
              ) : (
                <button onClick={back}>← Return to reading</button>
              )}
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
          {notice && (
            <p className="banner" role="status">
              {notice}
            </p>
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
            <div className={`reading-layout ${entry ? "with-details" : ""}`}>
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
                      <summary>Learning units</summary>
                      <p>
                        Select a word on the page or explore the same material
                        below.
                      </p>
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
                      <summary>Transcription</summary>
                      {content.review.issues?.length > 0 && (
                        <p className="coverage">
                          Some small decorative text is not transcribed; see
                          coverage notes below.
                        </p>
                      )}
                      <pre lang="zh-CN">{content.text}</pre>
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
              {entry && (
                <aside
                  className="details"
                  tabIndex={-1}
                  ref={details}
                  aria-label="Learning details"
                >
                  <div className="detail-top">
                    <span className="eyebrow">{entry.kind}</span>
                    <button
                      onClick={() => {
                        setActive(null);
                        trigger.current?.focus();
                      }}
                      aria-label="Close learning details"
                    >
                      <span className="wide-close">×</span>
                      <span className="narrow-close">← Return to page</span>
                    </button>
                  </div>
                  <h2 lang="zh-CN">{entry.form}</h2>
                  <p className="meaning">{entry.meaning}</p>
                  <div className="pronunciation">
                    <span className="field-label">Pinyin</span>
                    <div className="pronunciation-transcription">
                      <span lang="zh-Latn">{pinyin(entry)}</span>
                      {entry.pronunciations.find((p) => p.system === "ipa")
                        ?.value && (
                        <span
                          className="ipa-transcription"
                          aria-label="Phonetic transcription in IPA"
                          title="Phonetic transcription · IPA"
                        >
                          {
                            entry.pronunciations.find((p) => p.system === "ipa")
                              .value
                          }
                        </span>
                      )}
                      <div className="speech-controls">
                        <PronunciationButton
                          speech={speech}
                          text={entry.speechTarget || entry.form}
                        />
                        <span className="speech-info">
                          <button
                            type="button"
                            className="icon-control"
                            aria-label="Pronunciation information"
                            aria-describedby="voice-information"
                          >
                            <span aria-hidden="true">ⓘ</span>
                          </button>
                          <span
                            id="voice-information"
                            role="tooltip"
                            className="speech-tooltip"
                          >
                            {speech.available
                              ? `Local Mandarin voice: ${speech.voiceName}. Test playback before listening practice.`
                              : "Offline pronunciation is unavailable. A local Mandarin voice is needed."}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="speech">
                      <p
                        role="status"
                        className={
                          speech.available &&
                          !speech.status.startsWith("Audio could not")
                            ? "sr-only"
                            : undefined
                        }
                      >
                        {speech.available
                          ? speech.status
                          : "Offline pronunciation is unavailable. A local Mandarin voice is needed."}
                      </p>
                    </div>
                    {entry.pronunciationNote && (
                      <p className="pronunciation-note">
                        {entry.pronunciationNote}
                      </p>
                    )}
                  </div>
                  {entry.explanation && <p>{entry.explanation}</p>}
                  <StrokeOrder
                    key={entry.id}
                    entry={entry}
                    visible={view === "reader"}
                    onPractise={beginWriting}
                  />
                  <CharacterHistory entry={entry} />
                  {entry.constituentIds?.length > 0 && (
                    <details open>
                      <summary>Explore the parts</summary>
                      <div className="parts">
                        {entry.constituentIds.map((id) => {
                          const e = content.entries.entries.find(
                              (e) => e.id === id,
                            ),
                            a = content.annotations.annotations.find(
                              (a) =>
                                a.entryId === id &&
                                a.anchors[0].start >= active.anchors[0].start &&
                                a.anchors[0].end <= active.anchors.at(-1).end,
                            );
                          return (
                            e && (
                              <button
                                key={id}
                                disabled={!a}
                                onClick={() => a && choose(a)}
                              >
                                <span lang="zh-CN">{e.form}</span> · {e.meaning}
                              </button>
                            )
                          );
                        })}
                      </div>
                    </details>
                  )}
                  {entry.grammar && (
                    <details>
                      <summary>How it works</summary>
                      <p>{entry.grammar}</p>
                    </details>
                  )}
                  <details>
                    <summary>In the original</summary>
                    <p lang="zh-CN">
                      {
                        content.layout.lines.find(
                          (l) =>
                            l.start <= active.anchors[0].start &&
                            l.end >= active.anchors[0].end,
                        )?.exactText
                      }
                    </p>
                    <div className="parts">
                      {content.annotations.annotations
                        .filter(
                          (a) =>
                            a.kind === "sentence" &&
                            a.anchors.some(
                              (x) =>
                                x.start <= active.anchors[0].start &&
                                x.end >= active.anchors[0].end,
                            ),
                        )
                        .map((a) => (
                          <button key={a.id} onClick={() => choose(a)}>
                            Explore sentence
                          </button>
                        ))}
                    </div>
                  </details>
                  <button
                    className="primary full"
                    onClick={toggle}
                    aria-pressed={selection.has(active.id)}
                  >
                    {selection.has(active.id)
                      ? "✓ Remove from practice"
                      : "+ Add to practice"}
                  </button>
                  <button
                    className="quiet"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(reference);
                        setCopy("Reference copied");
                      } catch {
                        setCopy("Copy the reference below");
                      }
                    }}
                  >
                    Copy reference
                  </button>
                  {copy && (
                    <div role="status">
                      <small>{copy}</small>
                      <input
                        readOnly
                        aria-label="Correction reference"
                        value={reference}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  )}
                </aside>
              )}
            </div>
          </div>
          {view === "practice" && session && (
            <Practice
              session={session}
              setSession={setSession}
              speech={speech}
              source={returnSource}
              restart={begin}
              back={back}
              manifest={m}
            />
          )}
          {writingSession && (
            <WritingPractice
              key={writingSession.id}
              session={writingSession}
              setSession={setWritingSession}
              visible={view === "writing"}
              back={back}
            />
          )}
        </main>
      )}
    </>
  );
}
function Practice({
  session: s,
  setSession: set,
  speech,
  source,
  restart,
  back,
  manifest,
}) {
  const q = s.questions[s.index],
    done = s.index >= s.questions.length;
  function retry() {
    const wrong = s.questions.filter((q) => !isCorrect(q, s.answers[q.id]));
    set({
      questions: wrong.map((q) => ({ ...q, options: shuffle(q.options) })),
      index: 0,
      answers: {},
      choice: null,
      checked: false,
    });
  }
  if (done) {
    const mistakes = s.questions.filter((q) => !isCorrect(q, s.answers[q.id]));
    return (
      <section className="practice">
        <p className="eyebrow">SESSION COMPLETE</p>
        <h2>
          {s.questions.length - mistakes.length} of {s.questions.length} correct
        </h2>
        <p>
          This is your session result. Take your time with the words that need
          another look.
        </p>
        {mistakes.map((q) => (
          <article key={q.id}>
            <h3>{q.prompt}</h3>
            <p className="answer-incorrect">
              ✕ Your answer:{" "}
              {q.options.find((o) => o.id === s.answers[q.id])?.text}
            </p>
            <p className="answer-correct">
              ✓ Correct answer:{" "}
              {q.options.find((o) => o.id === q.correctOptionId).text}
            </p>
            <p>{q.explanation}</p>
            <button onClick={() => source(q)}>See original context</button>
          </article>
        ))}
        {mistakes.length > 0 && (
          <button className="primary" onClick={retry}>
            Retry mistakes
          </button>
        )}{" "}
        <button onClick={back}>Return to reading</button>{" "}
        <button onClick={() => restart(null)}>New document session</button>
      </section>
    );
  }
  const correct = isCorrect(q, s.choice);
  return (
    <section className="practice">
      <p className="eyebrow">
        QUESTION {s.index + 1} OF {s.questions.length} ·{" "}
        {q.category.replaceAll("-", " ")}
      </p>
      <progress max={s.questions.length} value={s.index} />
      <fieldset disabled={s.checked}>
        <legend>{q.prompt}</legend>
        {q.requiresAudio && (
          <PronunciationButton speech={speech} text={q.speechTarget} />
        )}
        <div className="options">
          {q.options.map((o) => (
            <label
              key={o.id}
              className={
                s.checked && o.id === q.correctOptionId
                  ? "answer-correct"
                  : s.checked && s.choice === o.id
                    ? "answer-incorrect"
                    : s.choice === o.id
                      ? "chosen"
                      : ""
              }
            >
              <input
                type="radio"
                name={q.id}
                checked={s.choice === o.id}
                onChange={() => set({ ...s, choice: o.id })}
              />
              <span lang={/[\u3400-\u9fff]/.test(o.text) ? "zh-CN" : "en"}>
                {o.text}
              </span>
              {s.checked && o.id === q.correctOptionId && (
                <span className="answer-label">✓ Correct answer</span>
              )}
              {s.checked && s.choice === o.id && o.id !== q.correctOptionId && (
                <span className="answer-label">✕ Your answer</span>
              )}
            </label>
          ))}
        </div>
      </fieldset>
      {!s.checked ? (
        <button
          className="primary"
          disabled={!s.choice}
          onClick={() =>
            set({
              ...s,
              checked: true,
              answers: { ...s.answers, [q.id]: s.choice },
            })
          }
        >
          Check answer
        </button>
      ) : (
        <div
          className={`feedback ${correct ? "answer-correct" : "answer-incorrect"}`}
          role="status"
        >
          <h3>
            {correct ? "✓ Correct" : "✕ Incorrect — let’s take another look"}
          </h3>
          {!correct && (
            <p>
              Correct answer:{" "}
              {q.options.find((o) => o.id === q.correctOptionId).text}
            </p>
          )}
          <h4>Why this answer</h4>
          <p>{q.explanation}</p>
          <button onClick={() => source(q)}>See original context</button>{" "}
          <button
            className="primary"
            onClick={() =>
              set({ ...s, index: s.index + 1, choice: null, checked: false })
            }
          >
            {s.index + 1 === s.questions.length ? "See results" : "Continue →"}
          </button>
          <details>
            <summary>Correction reference</summary>
            <input
              readOnly
              value={`${manifest.documentId}:${q.pageId}:question:${q.id}@r${manifest.contentRevision}`}
              onFocus={(e) => e.target.select()}
            />
          </details>
        </div>
      )}
    </section>
  );
}
createRoot(document.getElementById("root")).render(<App />);
