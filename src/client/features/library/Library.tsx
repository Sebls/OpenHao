import { useI18n } from "../../i18n/I18n.tsx";
import type { Catalog, Manifest } from "../../../contracts/content.ts";
import { useSequenceLayout } from "../../ui/SequenceLayout.tsx";
import { documentTitle } from "./documentTitle.ts";
import {
  localizedDocumentGroups,
  type TranslationLanguage,
} from "./variants.ts";

function PreparationProgress({ manifest }: { manifest: Manifest }) {
  const { t, language } = useI18n();
  const ready = manifest.pages.filter((page) => page.state === "ready");
  const pending = manifest.pages.filter(
    (page) => page.state === "extracted" || page.state === "needs-review",
  );
  return (
    <div className="preparation-progress">
      <div className="preparation-summary">
        <span>
          {t("{ready} of {total} pages prepared", {
            ready: ready.length,
            total: manifest.source.pageCount,
          })}
        </span>
        <details className="prepared-pages">
          <summary
            aria-label={t("View prepared pages for {value0}", {
              value0: documentTitle(manifest, language),
            })}
            title={t("View prepared pages")}
          >
            <span aria-hidden="true">ⓘ</span>
          </summary>
          <div className="prepared-page-info">
            <p>
              <strong>{t("Ready to study")}</strong>
              <br />
              {ready.length
                ? t("Pages {value0}", {
                    value0: ready.map((page) => page.pageNumber).join(", "),
                  })
                : t("No pages prepared yet.")}
            </p>
            {pending.length > 0 && (
              <p>
                <strong>{t("Awaiting review")}</strong>
                <br />
                {t("Pages")} {pending.map((page) => page.pageNumber).join(", ")}
              </p>
            )}
          </div>
        </details>
      </div>
      <progress
        value={ready.length}
        max={manifest.source.pageCount}
        aria-label={t("Prepared pages for {value0}", {
          value0: documentTitle(manifest, language),
        })}
      />
    </div>
  );
}

export function Library({
  catalog,
  open,
  language,
}: {
  catalog: Catalog;
  language: TranslationLanguage;
  open: (manifest: Manifest) => void;
}) {
  const { t } = useI18n();
  const [layout, changeLayout] = useSequenceLayout(
    "reader.library-layout",
    "grid",
  );
  const groups = localizedDocumentGroups(catalog.documents, language);
  return (
    <main className="library">
      <p className="eyebrow">{t("YOUR LEARNING SPACE")}</p>
      <h1>
        {t("A little Chinese,")}
        <br />
        {t("one page at a time.")}
      </h1>
      <p className="intro">
        {t("Read the original. Explore its words. Make them yours.")}
      </p>
      <div className="library-label">
        <h2>{t("Your library")}</h2>
        <div className="library-actions">
          <span>
            {t(groups.length === 1 ? "{count} document" : "{count} documents", {
              count: groups.length,
            })}
          </span>
          <div
            className="library-view-controls"
            role="group"
            aria-label={t("Library view")}
          >
            <button
              type="button"
              className="icon-control"
              aria-label={t("List view")}
              title={t("List view")}
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
              aria-label={t("Grid view")}
              title={t("Grid view")}
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
        {groups.map((variants) => {
          const manifest = variants[0];
          return (
            <article
              className="document"
              key={
                manifest.variantGroup
                  ? `group:${manifest.variantGroup}`
                  : `document:${manifest.documentId}`
              }
              aria-label={documentTitle(manifest, language)}
            >
              <div className="book-mark" aria-hidden="true">
                <span lang="zh-CN">你好</span>
                <small>{t("MANDARIN · BEGINNER")}</small>
              </div>
              <div className="document-content">
                <div className="document-metadata">
                  <p className="eyebrow">
                    {t("ORIGINAL PDF · {count} PAGES", {
                      count: manifest.source.pageCount,
                    })}
                  </p>
                </div>
                <h2>{documentTitle(manifest, language)}</h2>
                <p>{t("Concise explanations, pronunciation, and practice.")}</p>
                <PreparationProgress manifest={manifest} />
                <button className="primary" onClick={() => open(manifest)}>
                  {t("Open document")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!groups.length && (
        <p>{t("No documents are available in this language yet.")}</p>
      )}
      {catalog.issues.map((i) => (
        <p key={i.documentId} role="status">
          {t("A document needs attention:")} {i.documentId}. {i.message}
        </p>
      ))}
      <p className="footnote">
        {t("Session progress resets when you reload.")}
      </p>
    </main>
  );
}
