import { useI18n } from "../i18n/I18n.tsx";
import type { MouseEvent } from "react";
import {
  useCallback,
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
import { documentTitle } from "../features/library/documentTitle.ts";
import { Library } from "../features/library/Library.tsx";
import { Practice } from "../features/practice/Practice.tsx";
import { PracticeSetup } from "../features/practice/PracticeSetup.tsx";
import { selectNextQuestion } from "../features/practice/engine.ts";
import {
  loadPracticeHistory,
  recordAnswer,
  savePracticeHistory,
  topicStatsSummary,
} from "../features/practice/history.ts";
import { eligibleQuestions } from "../features/practice/model.ts";
import {
  type PracticeMode,
  practiceReducer,
} from "../features/practice/session.ts";
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

import {
  type AppRoute,
  formatRoute,
  parseRoute,
  localeFromPath,
} from "./router.ts";

const BASE_URL = import.meta.env.BASE_URL;

export function App() {
  const { t, language, setLanguage } = useI18n();
  const [catalog, setCatalog] = useState<Catalog>({
      documents: [],
      issues: [],
    }),
    [catalogLoaded, setCatalogLoaded] = useState(false),
    [error, setError] = useState(""),
    [doc, setDoc] = useState<StudyDocument | null>(null),
    [route, setRoute] = useState<AppRoute | null>(() =>
      parseRoute(window.location.pathname + window.location.search, BASE_URL),
    ),
    [practiceHistory, setPracticeHistory] = useState(() =>
      loadPracticeHistory(),
    ),
    [notice, setNotice] = useState(""),
    [zoom, setZoom] = useState(100),
    [showRegions, setShowRegions] = useState(false),
    [unitKind, setUnitKind] = useState("word"),
    [lastPracticeRoute, setLastPracticeRoute] = useState<Extract<
      AppRoute,
      { view: "practice" }
    > | null>(null),
    [lastWritingRoute, setLastWritingRoute] = useState<Extract<
      AppRoute,
      { view: "writing" }
    > | null>(null);
  const [session, dispatchPractice] = useReducer(practiceReducer, null);
  const [writingSession, dispatchWriting] = useReducer(writingReducer, null);
  const speech = useSpeech(),
    speechRef = useRef(speech),
    scroll = useRef({ library: 0, reader: 0, practice: 0, writing: 0 }),
    lastReaderPage = useRef(1),
    activePracticeKey = useRef(""),
    activeWritingKey = useRef(""),
    pageScroll = useRef<HTMLDivElement | null>(null),
    narrowReaderScroll = useRef<number | null>(null),
    trigger = useRef<HTMLElement | null>(null),
    details = useRef<HTMLElement | null>(null);

  useEffect(() => {
    speechRef.current = speech;
  }, [speech]);

  const view = route?.view ?? "library";
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const navigate = useCallback(
    (
      next: AppRoute,
      options?: { replace?: boolean; language?: typeof language },
    ) => {
      const url = formatRoute(next, BASE_URL, options?.language ?? language);
      const current = window.location.pathname + window.location.search;
      if (url !== current) {
        if (options?.replace) {
          window.history.replaceState(null, "", url);
        } else {
          window.history.pushState(null, "", url);
        }
      }
      if (next.view !== viewRef.current) {
        scroll.current[viewRef.current] = window.scrollY;
      }
      if (options?.language) setLanguage(options.language);
      setRoute(next);
    },
    [language, setLanguage],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    if (route) {
      const url = formatRoute(route, BASE_URL, language);
      if (window.location.pathname + window.location.search !== url)
        window.history.replaceState(null, "", url);
    }
  }, [language, route]);

  useEffect(() => {
    const onPopState = () => {
      speechRef.current.stop();
      setLanguage(localeFromPath(window.location.pathname, BASE_URL));
      setNotice("");
      setRoute(
        parseRoute(window.location.pathname + window.location.search, BASE_URL),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setLanguage]);

  useEffect(() => {
    const update = () =>
      getCatalog()
        .then((data) => {
          setCatalog(data);
          setCatalogLoaded(true);
        })
        .catch(() =>
          setError(t("The library is unavailable. Try refreshing the page.")),
        );
    update();
    const interval = setInterval(update, 4000);
    return () => clearInterval(interval);
  }, [t]);

  // Load document whenever the route targets a document that is not yet loaded.
  const routeDocId =
    route && route.view !== "library" ? route.documentId : null;
  useEffect(() => {
    if (!routeDocId || !catalogLoaded) return;
    const manifest = catalog.documents.find((d) => d.documentId === routeDocId);
    if (!manifest || manifest.translationLanguage !== language) {
      setError(
        t(
          manifest
            ? 'The document "{value0}" is unavailable in this language.'
            : 'The document "{value0}" could not be found.',
          {
            value0: routeDocId,
          },
        ),
      );
      return;
    }
    if (doc && doc.manifest.documentId === manifest.documentId) return;

    let cancelled = false;
    setError("");
    getDocument(manifest)
      .then((data) => {
        if (cancelled) return;
        const firstReady =
          data.manifest.pages.find((p) => p.state === "ready")?.pageNumber || 1;
        const isVariant =
          doc?.manifest.variantGroup &&
          doc.manifest.variantGroup === data.manifest.variantGroup;
        if (!isVariant) lastReaderPage.current = firstReady;
        else if (route?.view !== "library" && route?.pageNumber)
          lastReaderPage.current = route.pageNumber;
        scroll.current.reader = 0;
        narrowReaderScroll.current = null;
        activePracticeKey.current = "";
        activeWritingKey.current = "";
        setDoc(data);
        setLastPracticeRoute(null);
        setLastWritingRoute(null);
        dispatchPractice({ type: "clear" });
        dispatchWriting({ type: "clear" });
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("The material could not be loaded. Try reopening it."));
      });
    return () => {
      cancelled = true;
    };
  }, [routeDocId, catalogLoaded, catalog.documents, doc, route, language, t]);

  const m = doc?.manifest;
  const variants = m?.variantGroup
    ? catalog.documents.filter(
        (candidate) => candidate.variantGroup === m.variantGroup,
      )
    : [];
  const activeDocMatchesRoute = Boolean(
    m &&
    route &&
    route.view !== "library" &&
    m.documentId === route.documentId &&
    m.translationLanguage === language,
  );

  // Normalize /doc/:id -> /doc/:id/page/:pageNumber and clamp out-of-range page numbers.
  useEffect(() => {
    if (!route || route.view !== "reader" || !m || !activeDocMatchesRoute) {
      return;
    }
    const totalPages = m.source.pageCount || 1;
    const defaultPage =
      m.pages.find((p) => p.state === "ready")?.pageNumber || 1;
    if (route.pageNumber === undefined) {
      navigate({ ...route, pageNumber: defaultPage }, { replace: true });
    } else if (route.pageNumber > totalPages) {
      navigate({ ...route, pageNumber: totalPages }, { replace: true });
    }
  }, [route, m, activeDocMatchesRoute, navigate]);

  const pageNo =
    route?.view === "reader" && route.pageNumber
      ? Math.min(route.pageNumber, m?.source.pageCount || route.pageNumber)
      : lastReaderPage.current;

  useEffect(() => {
    if (route?.view === "reader" && route.pageNumber && activeDocMatchesRoute) {
      lastReaderPage.current = pageNo;
    }
  }, [route, pageNo, activeDocMatchesRoute]);

  const page = m?.pages[pageNo - 1],
    content = page && doc?.pages[page.id],
    active =
      route?.view === "reader" && route.annotationId && content
        ? content.annotations.annotations.find(
            (a) => a.id === route.annotationId,
          ) || null
        : null,
    entry =
      active && content?.entries.entries.find((e) => e.id === active.entryId),
    newer =
      m &&
      catalog.documents.find(
        (d) =>
          d.documentId === m.documentId &&
          d.contentRevision > m.contentRevision,
      );

  // Sync Practice scope when on a practice route; clear stale session on scope change.
  useEffect(() => {
    if (!route || route.view !== "practice" || !doc || !activeDocMatchesRoute) {
      return;
    }
    setLastPracticeRoute(route);
    const key = `${doc.manifest.documentId}:${doc.manifest.contentRevision}:${route.pageNumber ?? ""}:${speech.working}`;
    if (activePracticeKey.current === key) return;
    activePracticeKey.current = key;

    let selected: Set<string> | null = null;
    if (route.pageNumber !== undefined) {
      const targetPage = doc.manifest.pages.find(
        (p) => p.pageNumber === route.pageNumber,
      );
      const pageContent = targetPage && doc.pages[targetPage.id];
      selected = new Set(
        pageContent?.annotations.annotations.map((a) => a.id) || [],
      );
    }

    const bank = eligibleQuestions(doc.pages, selected, speech.working);
    dispatchPractice({ type: "clear" });
    if (!bank.length) {
      setNotice(
        t(
          "No reviewed questions cover this selection. Practise the prepared document or another page.",
        ),
      );
      return;
    }
    setNotice("");
  }, [route, doc, activeDocMatchesRoute, speech.working]);

  // Start/sync Writing session when on a writing route.
  useEffect(() => {
    if (!route || route.view !== "writing" || !doc || !activeDocMatchesRoute) {
      return;
    }
    const key = `${doc.manifest.documentId}:${doc.manifest.contentRevision}:${route.pageNumber}:${route.annotationId}`;
    if (activeWritingKey.current === key) return;
    activeWritingKey.current = key;

    const targetPage = doc.manifest.pages.find(
      (p) => p.pageNumber === route.pageNumber,
    );
    const targetContent = targetPage && doc.pages[targetPage.id];
    const targetAnn = targetContent?.annotations.annotations.find(
      (a) => a.id === route.annotationId,
    );
    const targetEntry =
      targetAnn &&
      targetContent?.entries.entries.find((e) => e.id === targetAnn.entryId);

    if (!targetPage || !targetContent || !targetAnn || !targetEntry) {
      dispatchWriting({ type: "clear" });
      setError(
        t('The writing item "{value0}" on page {value1} could not be found.', {
          value0: route.annotationId,
          value1: route.pageNumber,
        }),
      );
      return;
    }
    setError("");
    setLastWritingRoute(route);
    dispatchWriting({
      type: "start",
      session: createWritingSession(
        targetEntry,
        targetAnn,
        targetPage.id,
        targetContent.entries.entries,
      ),
    });
  }, [route, doc, activeDocMatchesRoute]);

  useEffect(() => {
    if (route === null) {
      document.title = t("Not found · OpenHao");
    } else if (route.view === "library") {
      document.title = t("OpenHao · Study library");
    } else if (!activeDocMatchesRoute) {
      document.title = t("OpenHao · Study library");
    } else if (route.view === "reader" && m) {
      document.title = t("Page {value0} · {value1} · OpenHao", {
        value0: pageNo,
        value1: documentTitle(m, language),
      });
    } else if (route.view === "practice" && m) {
      document.title = t("Practice · {value0} · OpenHao", {
        value0: documentTitle(m, language),
      });
    } else if (route.view === "writing" && writingSession) {
      document.title = t("Writing {value0} · OpenHao", {
        value0: writingSession.form,
      });
    }
  }, [route, m, pageNo, writingSession, t, language, activeDocMatchesRoute]);

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

  const closeDetails = useCallback(() => {
    if (!m) return;
    navigate(
      { view: "reader", documentId: m.documentId, pageNumber: pageNo },
      { replace: true },
    );
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
  }, [m, pageNo, navigate]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && active) {
        closeDetails();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, closeDetails]);

  async function open(manifest: Manifest, keep = false) {
    if (!keep) {
      setError("");
      setNotice("");
      navigate({ view: "reader", documentId: manifest.documentId });
      return;
    }
    try {
      setError("");
      const data = await getDocument(manifest);
      scroll.current.reader = window.scrollY;
      narrowReaderScroll.current = null;
      activePracticeKey.current = "";
      activeWritingKey.current = "";
      setDoc(data);
      dispatchWriting({ type: "clear" });
      navigate(
        {
          view: "reader",
          documentId: manifest.documentId,
          pageNumber: pageNo,
        },
        { replace: true },
      );
      requestAnimationFrame(() =>
        window.scrollTo({ top: scroll.current.reader, behavior: "instant" }),
      );
    } catch {
      setError(t("The material could not be loaded. Try reopening it."));
    }
  }

  function choose(a: Annotation, event?: MouseEvent<HTMLElement>) {
    if (!m) return;
    if (event?.currentTarget instanceof HTMLElement)
      trigger.current = event.currentTarget;
    else if (!active) trigger.current = null;
    if (!active && window.innerWidth <= 850)
      narrowReaderScroll.current = window.scrollY;
    navigate(
      {
        view: "reader",
        documentId: m.documentId,
        pageNumber: pageNo,
        annotationId: a.id,
      },
      { replace: true },
    );
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

  function openPracticeSetup(pageFilter?: number) {
    if (!doc || !m) return;
    let selected: Set<string> | null = null;
    if (pageFilter !== undefined) {
      const targetPage = m.pages.find((p) => p.pageNumber === pageFilter);
      const pageContent = targetPage && doc.pages[targetPage.id];
      selected = new Set(
        pageContent?.annotations.annotations.map((a) => a.id) || [],
      );
    }
    const bank = eligibleQuestions(doc.pages, selected, speech.working);
    if (!bank.length) {
      setNotice(
        t(
          "No reviewed questions cover this selection. Practise the prepared document or another page.",
        ),
      );
      return;
    }
    setNotice("");
    scroll.current.practice = 0;
    activePracticeKey.current = "";
    dispatchPractice({ type: "clear" });
    if (pageFilter !== undefined) {
      navigate({
        view: "practice",
        documentId: m.documentId,
        pageNumber: pageFilter,
      });
    } else {
      navigate({ view: "practice", documentId: m.documentId });
    }
  }

  function beginWriting() {
    if (!entry || !active || !page || !content || !m) return;
    speech.stop();
    scroll.current.writing = 0;
    navigate({
      view: "writing",
      documentId: m.documentId,
      pageNumber: pageNo,
      annotationId: active.id,
    });
  }

  function back() {
    if (!m) {
      navigate({ view: "library" });
      return;
    }
    speech.stop();
    setNotice("");
    navigate({
      view: "reader",
      documentId: m.documentId,
      pageNumber: lastReaderPage.current,
    });
  }

  function returnSource(q: Question) {
    if (!doc || !m) return;
    const id = q.sourceAnnotationIds[0];
    let target: Rect | undefined;
    let targetPageNo = lastReaderPage.current;
    let targetAnnotationId: string | undefined;
    for (const [p, data] of Object.entries(doc.pages)) {
      const a = data.annotations.annotations.find((a) => a.id === id);
      if (a) {
        const targetPage = m.pages.find((p2) => p2.id === p);
        if (targetPage) targetPageNo = targetPage.pageNumber;
        targetAnnotationId = a.id;
        target = anchorRects(a, data.layout)[0];
        break;
      }
    }
    speech.stop();
    setNotice("");
    navigate({
      view: "reader",
      documentId: m.documentId,
      pageNumber: targetPageNo,
      annotationId: targetAnnotationId,
    });
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
          onClick={() => {
            setError("");
            setNotice("");
            navigate({ view: "library" });
          }}
          aria-label={t("OpenHao library")}
        >
          <span lang="zh-CN">好</span> OpenHao{" "}
          <small>{t("STUDY LIBRARY")}</small>
        </button>
        <nav aria-label={t("Main navigation")}>
          <button
            aria-current={route?.view === "library" ? "page" : undefined}
            onClick={() => {
              setError("");
              setNotice("");
              navigate({ view: "library" });
            }}
          >
            {t("Library")}
          </button>
          {doc && m && m.translationLanguage === language && (
            <>
              <button
                aria-current={route?.view === "reader" ? "page" : undefined}
                onClick={() =>
                  navigate({
                    view: "reader",
                    documentId: m.documentId,
                    pageNumber: lastReaderPage.current,
                  })
                }
              >
                {t("Read")}
              </button>
              <button
                aria-current={route?.view === "practice" ? "page" : undefined}
                onClick={() => {
                  if (
                    session &&
                    !session.finished &&
                    lastPracticeRoute &&
                    lastPracticeRoute.documentId === m.documentId
                  ) {
                    navigate(lastPracticeRoute);
                  } else {
                    openPracticeSetup();
                  }
                }}
              >
                {t("Practice")}
              </button>
              {writingSession &&
                lastWritingRoute &&
                lastWritingRoute.documentId === m.documentId && (
                  <button
                    aria-current={
                      route?.view === "writing" ? "page" : undefined
                    }
                    onClick={() => navigate(lastWritingRoute)}
                  >
                    {t("Writing")}
                  </button>
                )}
            </>
          )}
        </nav>
        <div
          className="site-languages"
          role="group"
          aria-label={t("Site language")}
        >
          {(["en", "fr"] as const).map((next) => (
            <button
              key={next}
              type="button"
              aria-label={next === "en" ? "English" : "Français"}
              lang={next}
              aria-pressed={language === next}
              onClick={() => {
                if (next === language) return;
                speech.stop();
                setError("");
                setNotice("");
                const counterpart = variants.find(
                  (candidate) => candidate.translationLanguage === next,
                );
                if (route && route.view !== "library" && counterpart) {
                  navigate(
                    { ...route, documentId: counterpart.documentId },
                    { language: next },
                  );
                } else {
                  setDoc(null);
                  dispatchPractice({ type: "clear" });
                  dispatchWriting({ type: "clear" });
                  navigate({ view: "library" }, { language: next });
                }
              }}
            >
              {next.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      {route === null && (
        <p className="banner" role="alert">
          {t("This page could not be found.")}
        </p>
      )}
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}
      {(route === null || route.view === "library") && (
        <Library catalog={catalog} open={open} language={language} />
      )}
      {doc && activeDocMatchesRoute && route && route.view !== "library" && (
        <main className="study">
          <div className="document-heading">
            <div>
              <p className="eyebrow">{m ? documentTitle(m, language) : ""}</p>
              <h1>
                {view === "reader"
                  ? t("Page {value0}", { value0: pageNo })
                  : view === "writing"
                    ? t("Writing practice")
                    : t("Practice")}{" "}
                <span>
                  {view === "reader"
                    ? page?.state === "ready"
                      ? t("Ready to study")
                      : t("Not prepared")
                    : t("From your prepared material")}
                </span>
              </h1>
            </div>
            <div className="actions">
              {view === "reader" ? (
                <>
                  <button
                    onClick={() => openPracticeSetup(pageNo)}
                    disabled={!content}
                  >
                    {t("Practise page")}
                  </button>
                  <button
                    className="primary"
                    onClick={() => openPracticeSetup()}
                  >
                    {t("Practise document")}
                  </button>
                </>
              ) : (
                <button onClick={back}>{t("← Return to reading")}</button>
              )}
            </div>
          </div>
          {newer && (
            <div className="banner">
              {t(
                "New learning material is available. Your current session is unchanged.",
              )}{" "}
              <button onClick={() => open(newer, true)}>
                {t("Load updated material")}
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
                  onClick={() =>
                    m &&
                    navigate({
                      view: "reader",
                      documentId: m.documentId,
                      pageNumber: pageNo - 1,
                    })
                  }
                  aria-label={t("Previous page")}
                >
                  ←
                </button>
                <label>
                  {t("Physical page")}{" "}
                  <select
                    value={pageNo}
                    onChange={(e) =>
                      m &&
                      navigate({
                        view: "reader",
                        documentId: m.documentId,
                        pageNumber: Number(e.target.value),
                      })
                    }
                  >
                    {m?.pages.map((p) => (
                      <option key={p.id} value={p.pageNumber}>
                        {p.pageNumber} / {m.source.pageCount}
                        {p.state === "ready"
                          ? t(" · Ready")
                          : t(" · Not prepared")}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={pageNo === m?.source.pageCount}
                  onClick={() =>
                    m &&
                    navigate({
                      view: "reader",
                      documentId: m.documentId,
                      pageNumber: pageNo + 1,
                    })
                  }
                  aria-label={t("Next page")}
                >
                  →
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="region-toggle"
                  aria-label={t("Show clickable regions")}
                  title={
                    showRegions
                      ? t("Hide clickable regions")
                      : t("Show clickable regions")
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
                    reference={reference!}
                    visible={view === "reader"}
                    detailsRef={details}
                    onClose={closeDetails}
                    onPractise={beginWriting}
                    choose={choose}
                  />
                ) : null
              }
            >
              <section className="page-column" aria-label={t("PDF reader")}>
                <PdfViewport
                  viewportRef={pageScroll}
                  zoom={zoom}
                  onZoom={setZoom}
                  pageRatio={page ? page.width / page.height : 1}
                  originalHref={`${BASE_URL}pdf/${m!.documentId}/${m!.contentRevision}.pdf`}
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
                    <h2>{t("This page is not prepared yet")}</h2>
                    <p>
                      {t(
                        "You can read the original page. Ask the agent to prepare physical page {page} for explanations and practice.",
                        { page: pageNo },
                      )}
                    </p>
                  </div>
                )}
              </section>
            </ReadingLayout>
          </div>
          {view === "practice" &&
            (() => {
              const practicePageNo =
                route?.view === "practice" ? route.pageNumber : undefined;
              let selected: Set<string> | null = null;
              if (practicePageNo !== undefined) {
                const targetPage = m!.pages.find(
                  (p) => p.pageNumber === practicePageNo,
                );
                const pageContent = targetPage && doc.pages[targetPage.id];
                selected = new Set(
                  pageContent?.annotations.annotations.map((a) => a.id) || [],
                );
              }
              const practiceBank = eligibleQuestions(
                doc.pages,
                selected,
                speech.working,
              );
              const scopeLabel =
                practicePageNo !== undefined
                  ? t("Page {value0}", { value0: practicePageNo })
                  : t("Whole document");

              const startAdaptiveSession = (
                mode: PracticeMode,
                targetCount: number | null,
              ) => {
                const first = selectNextQuestion(
                  practiceBank,
                  practiceHistory,
                  doc.pages,
                );
                if (!first) return;
                dispatchPractice({
                  type: "start",
                  questions: [first],
                  mode,
                  targetCount,
                });
              };

              const handleAnswer = (question: Question, correct: boolean) => {
                const nextHistory = recordAnswer(
                  practiceHistory,
                  question,
                  correct,
                  doc.pages,
                );
                setPracticeHistory(nextHistory);
                savePracticeHistory(nextHistory);
              };

              const handleNext = () => {
                if (!session) return;
                if (
                  session.mode === "fixed" &&
                  session.targetCount !== null &&
                  session.index + 1 >= session.targetCount
                ) {
                  dispatchPractice({ type: "next" });
                  return;
                }
                if (session.index + 1 < session.questions.length) {
                  dispatchPractice({ type: "next" });
                  return;
                }
                const currentQ = session.questions[session.index];
                const nextQ = selectNextQuestion(
                  practiceBank,
                  practiceHistory,
                  doc.pages,
                  { lastQuestionId: currentQ?.id },
                );
                dispatchPractice({
                  type: "next",
                  nextQuestion: nextQ ?? undefined,
                });
              };

              return session ? (
                <Practice
                  session={session}
                  dispatch={dispatchPractice}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  speech={speech}
                  source={returnSource}
                  newSession={() => dispatchPractice({ type: "clear" })}
                  back={back}
                  manifest={m!}
                  pages={doc.pages}
                />
              ) : (
                <PracticeSetup
                  scopeLabel={scopeLabel}
                  questionCount={practiceBank.length}
                  topicStats={topicStatsSummary(practiceBank, practiceHistory)}
                  onStart={startAdaptiveSession}
                  onBack={back}
                />
              );
            })()}
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
