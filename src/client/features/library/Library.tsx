import type { Catalog, Manifest } from "../../../contracts/content.ts";
export function Library({
  catalog,
  open,
}: {
  catalog: Catalog;
  open: (manifest: Manifest) => void;
}) {
  return (
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
            <p>Concise English explanations, pronunciation, and practice.</p>
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
          No prepared documents yet. Ask the agent to prepare a PDF and physical
          pages.
        </p>
      )}
      {catalog.issues.map((i) => (
        <p key={i.documentId} role="status">
          A document needs attention: {i.documentId}. {i.message}
        </p>
      ))}
      <p className="footnote">
        Your PDFs and prepared lessons stay on this computer. Session progress
        resets when you reload.
      </p>
    </main>
  );
}
