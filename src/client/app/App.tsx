import type { MouseEvent } from "react";
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  Annotation,
  Catalog,
  Manifest,
  Question,
  Rect,
  StudyDocument,
} from "../../contracts/content.ts";
import { getCatalog, getDocument } from "../api/library.ts";
import { LearningDetails } from "../features/learning-details/LearningDetails.tsx";
import { Library } from "../features/library/Library.tsx";
import { Practice } from "../features/practice/Practice.tsx";
import { eligibleQuestions } from "../features/practice/model.ts";
import { practiceReducer } from "../features/practice/session.ts";
import { LearningUnits } from "../features/reader/LearningUnits.tsx";
import { PdfViewport } from "../features/reader/PdfViewport.tsx";
import { ReadingLayout } from "../features/reader/ReadingLayout.tsx";
import { Source } from "../features/reader/Source.tsx";
import { anchorRects } from "../features/reader/geometry.ts";
import { useSpeech } from "../features/speech/useSpeech.ts";
import { WritingPractice } from "../features/writing/WritingPractice.tsx";
import {
  createWritingSession,
  writingReducer,
} from "../features/writing/model.ts";
export function App() {
  const [catalog, setCatalog] = useState<Catalog>({
      documents: [],
      issues: [],
    }),
    [error, setError] = useState(""),
    [doc, setDoc] = useState<StudyDocument | null>(null),
    [view, setView] = useState<"library" | "reader" | "practice" | "writing">(
      "library",
    ),
    [pageNo, setPageNo] = useState(1),
    [active, setActive] = useState<Annotation | null>(null),
    [selection, setSelection] = useState(new Set<string>()),
    [notice, setNotice] = useState(""),
    [zoom, setZoom] = useState(100),
    [showRegions, setShowRegions] = useState(false),
    [unitKind, setUnitKind] = useState("word");
  const [session, dispatchPractice] = useReducer(practiceReducer, null);
  const [writingSession, dispatchWriting] = useReducer(writingReducer, null);
  const speech = useSpeech(),
    scroll = useRef({ library: 0, reader: 0, practice: 0, writing: 0 }),
    pageScroll = useRef<HTMLDivElement | null>(null),
    narrowReaderScroll = useRef<number | null>(null),
    trigger = useRef<HTMLElement | null>(null),
    details = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const update = () =>
      getCatalog()
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
  useLayoutEffect(() => {
    window.scrollTo({
      top: scroll.current[view],
      left: 0,
      behavior: "instant",
    });
  }, [view]);
  useLayoutEffect(() => {
    pageScroll.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    narrowReaderScroll.current = null;
    trigger.current = null;
  }, [doc?.manifest.documentId, doc?.manifest.contentRevision, pageNo]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && active) {
        closeDetails();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active]);
  const m = doc?.manifest,
    page = m?.pages[pageNo - 1],
    content = page && doc?.pages[page.id],
    entry =
      active && content?.entries.entries.find((e) => e.id === active.entryId),
    newer =
      m &&
      catalog.documents.find(
        (d) =>
          d.documentId === m.documentId &&
          d.contentRevision > m.contentRevision,
      );
  async function open(manifest: Manifest, keep = false) {
    try {
      setError("");
      const data = await getDocument(manifest);
      scroll.current[view] = window.scrollY;
      scroll.current.reader = keep ? window.scrollY : 0;
      narrowReaderScroll.current = null;
      setDoc(data);
      if (!keep) {
        setPageNo(
          data.manifest.pages.find((p) => p.state === "ready")?.pageNumber || 1,
        );
        setSelection(new Set());
        dispatchPractice({ type: "clear" });
        dispatchWriting({ type: "clear" });
      }
      setActive(null);
      if (keep) dispatchWriting({ type: "clear" });
      setView("reader");
      requestAnimationFrame(() =>
        window.scrollTo({ top: scroll.current.reader, behavior: "instant" }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  function closeDetails() {
    setActive(null);
    requestAnimationFrame(() => {
      if (narrowReaderScroll.current !== null) {
        window.scrollTo({
          top: narrowReaderScroll.current,
          behavior: "instant",
        });
        narrowReaderScroll.current = null;
      }
      trigger.current?.focus({ preventScroll: true });
    });
  }
  function choose(a: Annotation, event?: MouseEvent<HTMLElement>) {
    if (event?.currentTarget instanceof HTMLElement)
      trigger.current = event.currentTarget;
    else if (!active) trigger.current = null;
    if (!active && window.innerWidth <= 850)
      narrowReaderScroll.current = window.scrollY;
    setActive(a);
    if (window.innerWidth <= 850)
      requestAnimationFrame(() => {
        details.current?.focus({ preventScroll: true });
        if (details.current)
          window.scrollTo({
            top:
              window.scrollY + details.current.getBoundingClientRect().top - 24,
            behavior: "instant",
          });
      });
  }
  function switchView(next: "library" | "reader" | "practice" | "writing") {
    if (next === view) return;
    scroll.current[view] = window.scrollY;
    setView(next);
  }
  function begin(selected: Set<string> | null) {
    if (!doc) return;
    const bank = eligibleQuestions(doc.pages, selected, speech.working);
    if (!bank.length) {
      setNotice(
        "No reviewed questions cover this selection. Add a word or sentence, or practise the prepared document.",
      );
      return;
    }
    dispatchPractice({ type: "start", questions: bank });
    setNotice("");
    scroll.current.practice = 0;
    switchView("practice");
  }
  function beginWriting() {
    if (!entry || !active || !page || !content) return;
    speech.stop();
    dispatchWriting({
      type: "start",
      session: createWritingSession(
        entry,
        active,
        page.id,
        content.entries.entries,
      ),
    });
    scroll.current.writing = 0;
    switchView("writing");
  }
  function back() {
    speech.stop();
    switchView("reader");
  }
  function toggle() {
    if (!active) return;
    setSelection((old) => {
      const n = new Set(old);
      if (n.has(active.id)) n.delete(active.id);
      else n.add(active.id);
      return n;
    });
  }
  function returnSource(q: Question) {
    if (!doc || !m) return;
    const id = q.sourceAnnotationIds[0];
    let target: Rect | undefined;
    for (const [p, data] of Object.entries(doc.pages)) {
      const a = data.annotations.annotations.find((a) => a.id === id);
      if (a) {
        const targetPage = m.pages.find((p2) => p2.id === p);
        if (targetPage) setPageNo(targetPage.pageNumber);
        setActive(a);
        target = anchorRects(a, data.layout)[0];
        break;
      }
    }
    back();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const container = pageScroll.current;
        const source = container?.querySelector<HTMLElement>(".source");
        if (container && source && target && source.clientHeight) {
          window.scrollTo({
            top: window.scrollY + container.getBoundingClientRect().top - 24,
            behavior: "instant",
          });
          container.scrollTo({
            top:
              source.getBoundingClientRect().top -
              container.getBoundingClientRect().top +
              container.scrollTop +
              target[1] * source.clientHeight -
              40,
            left:
              source.getBoundingClientRect().left -
              container.getBoundingClientRect().left +
              container.scrollLeft +
              target[0] * source.clientWidth -
              40,
            behavior: "instant",
          });
        }
      }),
    );
  }
  const reference =
    active &&
    m &&
    page &&
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
      {view === "library" && <Library catalog={catalog} open={open} />}
      {doc && (
        <main className="study" hidden={view === "library"}>
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
              <div>
                <button
                  type="button"
                  className="region-toggle"
                  aria-label="Show clickable regions"
                  title={
                    showRegions
                      ? "Hide clickable regions"
                      : "Show clickable regions"
                  }
                  aria-pressed={showRegions}
                  onClick={() => setShowRegions((shown) => !shown)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
                    <rect x="7" y="8" width="10" height="8" rx="1" />
                  </svg>
                </button>
              </div>
            </div>
            <ReadingLayout
              details={
                entry ? (
                  <LearningDetails
                    key={active!.id}
                    entry={entry}
                    active={active!}
                    content={content!}
                    speech={speech}
                    selection={selection}
                    reference={reference!}
                    visible={view === "reader"}
                    detailsRef={details}
                    onClose={closeDetails}
                    onToggle={toggle}
                    onPractise={beginWriting}
                    choose={choose}
                  />
                ) : null
              }
            >
              <section className="page-column" aria-label="PDF reader">
                <PdfViewport
                  viewportRef={pageScroll}
                  zoom={zoom}
                  onZoom={setZoom}
                  pageRatio={page ? page.width / page.height : 1}
                  originalHref={`${import.meta.env.BASE_URL}pdf/${m!.documentId}/${m!.contentRevision}.pdf`}
                >
                  {m && page && (
                    <Source
                      manifest={m!}
                      page={page}
                      content={content}
                      selected={active}
                      showRegions={showRegions}
                      onSelect={choose}
                    />
                  )}
                </PdfViewport>
                {content ? (
                  <LearningUnits
                    unitKind={unitKind}
                    onUnitKindChange={setUnitKind}
                    content={content}
                    active={active}
                    choose={choose}
                  />
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
            </ReadingLayout>
          </div>
          {view === "practice" && session && (
            <Practice
              session={session}
              dispatch={dispatchPractice}
              speech={speech}
              source={returnSource}
              restart={begin}
              back={back}
              manifest={m!}
              pages={doc.pages}
            />
          )}
          {writingSession && (
            <WritingPractice
              key={writingSession.id}
              session={writingSession}
              dispatch={dispatchWriting}
              visible={view === "writing"}
              back={back}
            />
          )}
        </main>
      )}
    </>
  );
}
