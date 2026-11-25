import type { Catalog, Manifest } from "../../../contracts/content.ts";
import { useSequenceLayout } from "../../ui/SequenceLayout.tsx";
import { documentTitle } from "./documentTitle.ts";

function PreparationProgress({ manifest }: { manifest: Manifest }) {
  const ready = manifest.pages.filter((page) => page.state === "ready");
  const pending = manifest.pages.filter(
    (page) => page.state === "extracted" || page.state === "needs-review",
  );
  return (
    <div className="preparation-progress">
      <div className="preparation-summary">
        <span>
          {ready.length} of {manifest.source.pageCount} pages prepared
        </span>
        <details className="prepared-pages">
          <summary
            aria-label={`View prepared pages for ${documentTitle(manifest)}`}
            title="View prepared pages"
          >
            <span aria-hidden="true">ⓘ</span>
          </summary>
          <div className="prepared-page-info">
            <p>
              <strong>Ready to study</strong>
              <br />
              {ready.length
                ? `Pages ${ready.map((page) => page.pageNumber).join(", ")}`
                : "No pages prepared yet."}
            </p>
            {pending.length > 0 && (
              <p>
                <strong>Awaiting review</strong>
                <br />
                Pages {pending.map((page) => page.pageNumber).join(", ")}
              </p>
            )}
          </div>
        </details>
      </div>
      <progress
        value={ready.length}
        max={manifest.source.pageCount}
        aria-label={`Prepared pages for ${documentTitle(manifest)}`}
      />
    </div>
  );
}

export function Library({
  catalog,
  open,
}: {
  catalog: Catalog;
  open: (manifest: Manifest) => void;
}) {
  const [layout, changeLayout] = useSequenceLayout(
    "reader.library-layout",
    "grid",
  );
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
        <div className="library-actions">
          <span>
            {catalog.documents.length} document
            {catalog.documents.length !== 1 ? "s" : ""}
          </span>
          <div
            className="library-view-controls"
            role="group"
            aria-label="Library view"
          >
            <button
              type="button"
              className="icon-control"
              aria-label="List view"
              title="List view"
              aria-pressed={layout === "row"}
              onClick={() => changeLayout("row")}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M7 5h10M7 10h10M7 15h10M3 5h.5M3 10h.5M3 15h.5" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-control"
              aria-label="Grid view"
              title="Grid view"
              aria-pressed={layout === "grid"}
              onClick={() => changeLayout("grid")}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="3" y="3" width="5" height="5" rx=".5" />
                <rect x="12" y="3" width="5" height="5" rx=".5" />
                <rect x="3" y="12" width="5" height="5" rx=".5" />
                <rect x="12" y="12" width="5" height="5" rx=".5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className={`documents${layout === "grid" ? " is-grid" : ""}`}>
        {catalog.documents.map((manifest) => (
          <article
            className="document"
            key={manifest.documentId}
            aria-label={documentTitle(manifest)}
          >
            <div className="book-mark" aria-hidden="true">
              <span lang="zh-CN">你好</span>
              <small>MANDARIN · BEGINNER</small>
            </div>
            <div className="document-content">
              <p className="eyebrow">
                ORIGINAL PDF · {manifest.source.pageCount} PAGES
              </p>
              <h2>{documentTitle(manifest)}</h2>
              <p>Concise English explanations, pronunciation, and practice.</p>
              <PreparationProgress manifest={manifest} />
              <button className="primary" onClick={() => open(manifest)}>
                Open document
              </button>
            </div>
          </article>
        ))}
      </div>
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
      <p className="footnote">Session progress resets when you reload.</p>
    </main>
  );
}
