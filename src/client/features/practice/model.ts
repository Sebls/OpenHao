import type { PageContent, Question } from "../../../contracts/content.ts";
export function selectionScope(
  pages: Record<string, PageContent>,
  selected: Set<string> | null,
) {
  if (!selected) return null;
  const scope = new Set(selected),
    annotations = Object.values(pages).flatMap(
      (p) => p.annotations?.annotations || [],
    ),
    containers = annotations.filter((a) => selected.has(a.id));
  for (const a of annotations) {
    if (
      a.anchors?.every((anchor) =>
        containers.some((container) =>
          container.anchors?.some(
            (c) =>
              c.pageId === anchor.pageId &&
              c.extractionRevision === anchor.extractionRevision &&
              c.start <= anchor.start &&
              c.end >= anchor.end,
          ),
        ),
      )
    )
      scope.add(a.id);
  }
  return scope;
}
export function eligibleQuestions(
  pages: Record<string, PageContent>,
  selected: Set<string> | null,
  localAudio: boolean,
) {
  selected = selectionScope(pages, selected);
  return Object.values(pages)
    .flatMap((p) => p.questions.questions)
    .filter(
      (q) =>
        q.reviewStatus === "reviewed" &&
        (!q.requiresAudio || localAudio) &&
        (!selected || q.sourceAnnotationIds.every((id) => selected.has(id))),
    );
}
export function shuffle<T>(options: readonly T[], random = Math.random): T[] {
  const result = [...options];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const isCorrect = (q: Question, id: string | null | undefined) =>
  q.correctOptionId === id;
