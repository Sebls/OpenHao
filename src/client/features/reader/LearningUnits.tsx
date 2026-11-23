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
  return (
    <section className="companion">
      <details open>
        <summary>Learning units</summary>
        <p>Select a word on the page or explore the same material below.</p>
        <label>
          Explore{" "}
          <select
            id="unit-kind"
            value={unitKind}
            onChange={(e) => onUnitKindChange(e.target.value)}
          >
            <option value="word">Words</option>
            <option value="character">Characters</option>
            <option value="sentence">Sentences</option>
            <option value="all">All units</option>
          </select>
        </label>
        <div
          className="units"
          tabIndex={0}
          role="region"
          aria-label="Scrollable learning units"
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
        <summary>Transcription</summary>
        {content.review.issues.length > 0 && (
          <p className="coverage">
            Some small decorative text is not transcribed; see coverage notes
            below.
          </p>
        )}
        <pre
          lang="zh-CN"
          tabIndex={0}
          role="region"
          aria-label="Scrollable transcription"
        >
          {content.text}
        </pre>
      </details>
      <details>
        <summary>Page coverage notes</summary>
        {content.review.issues.map((i, n) => (
          <p key={n}>{i.reason || i.message}</p>
        ))}
      </details>
    </section>
  );
}
