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
    [unitKind, setUnitKind] = useState("word");
  const [session, dispatchPractice] = useReducer(practiceReducer, null);
  const [writingSession, dispatchWriting] = useReducer(writingReducer, null);
  const speech = useSpeech(),
    scroll = useRef(0),
    pageScroll = useRef<HTMLDivElement | null>(null),
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
    pageScroll.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [doc?.manifest.documentId, doc?.manifest.contentRevision, pageNo]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  function choose(a: Annotation, event?: MouseEvent<HTMLElement>) {
    trigger.current =
      event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    setActive(a);
    if (window.innerWidth < 850)
      requestAnimationFrame(() => details.current?.focus());
  }
  function switchView(next: "library" | "reader" | "practice" | "writing") {
    if (view === "reader") scroll.current = window.scrollY;
    setView(next);
    if (next === "reader")
      requestAnimationFrame(() => window.scrollTo(0, scroll.current));
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
    switchView("writing");
    requestAnimationFrame(() => window.scrollTo(0, 0));
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
            top: target[1] * source.clientHeight - 40,
            left: target[0] * source.clientWidth - 40,
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
      {view === "library" ? (
        <Library catalog={catalog} open={open} />
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
                <div
                  className="page-scroll"
                  ref={pageScroll}
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable original page"
                >
                  <div style={{ width: zoom + "%" }}>
                    {m && page && (
                      <Source
                        manifest={m!}
                        page={page}
                        content={content}
                        selected={active}
                        onSelect={choose}
                      />
                    )}
                  </div>
                </div>
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
              {entry && (
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
                  onClose={() => {
                    setActive(null);
                    trigger.current?.focus();
                  }}
                  onToggle={toggle}
                  onPractise={beginWriting}
                  choose={choose}
                />
              )}
            </div>
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
