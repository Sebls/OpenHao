import { useI18n } from "../../i18n/I18n.tsx";
import { translateContent } from "../../i18n/content.ts";
import type { MouseEvent } from "react";
import type { Annotation, PageContent } from "../../../contracts/content.ts";
import { pinyin } from "../learning-details/pronunciation.ts";
export function LearningUnits({
  content,
  unitKind,
  onUnitKindChange,
  active,
  choose,
}: {
  content: PageContent;
  unitKind: string;
  onUnitKindChange: (kind: string) => void;
  active: Annotation | null;
  choose: (annotation: Annotation, event?: MouseEvent<HTMLElement>) => void;
}) {
  const { t, language } = useI18n();
  return (
    <section className="companion">
      <details open>
        <summary>{t("Learning units")}</summary>
        <p>
          {t("Select a word on the page or explore the same material below.")}
        </p>
        <label>
          {t("Explore")}{" "}
          <select
            id="unit-kind"
            value={unitKind}
            onChange={(e) => onUnitKindChange(e.target.value)}
          >
            <option value="word">{t("Words")}</option>
            <option value="character">{t("Characters")}</option>
            <option value="sentence">{t("Sentences")}</option>
            <option value="all">{t("All units")}</option>
          </select>
        </label>
        <div
          className="units"
          tabIndex={0}
          role="region"
          aria-label={t("Scrollable learning units")}
        >
          {content.annotations.annotations
            .filter((a) => a.reviewStatus === "reviewed")
            .map((a) => {
              const e = content.entries.entries.find((e) => e.id === a.entryId);
              return (
                <button
                  key={a.id}
                  data-unit-kind={a.kind}
                  hidden={unitKind !== "all" && a.kind !== unitKind}
                  aria-pressed={active?.id === a.id}
                  onClick={(event) => choose(a, event)}
                >
                  <span lang="zh-CN">{e?.form}</span>
                  <small>{pinyin(e)}</small>
                </button>
              );
            })}
        </div>
      </details>
      <details>
        <summary>{t("Transcription")}</summary>
        {content.review.issues.length > 0 && (
          <p className="coverage">
            {t(
              "Some small decorative text is not transcribed; see coverage notes below.",
            )}
          </p>
        )}
        <pre
          lang="zh-CN"
          tabIndex={0}
          role="region"
          aria-label={t("Scrollable transcription")}
        >
          {content.text}
        </pre>
      </details>
      <details>
        <summary>{t("Page coverage notes")}</summary>
        {content.review.issues.map((i, n) => (
          <p key={n}>
            {translateContent(i.reason || i.message || "", language)}
          </p>
        ))}
      </details>
    </section>
  );
}
