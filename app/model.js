export function selectionScope(pages, selected) {
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
export function eligibleQuestions(pages, selected, localAudio) {
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
export function shuffle(options, random = Math.random) {
  const result = [...options];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const isCorrect = (q, id) => q.correctOptionId === id;
export function anchorRects(annotation, layout) {
  const chars = new Map(layout.characters.map((c) => [c.id, c]));
  return annotation.anchors.flatMap((anchor) => {
    const lines = new Map();
    for (const id of anchor.characterIds) {
      const c = chars.get(id);
      if (!c) continue;
      const r = c.rect;
      const old = lines.get(c.lineId);
      lines.set(
        c.lineId,
        old
          ? [
              Math.min(old[0], r[0]),
              Math.min(old[1], r[1]),
              Math.max(old[2], r[0] + r[2]),
              Math.max(old[3], r[1] + r[3]),
            ]
          : [r[0], r[1], r[0] + r[2], r[1] + r[3]],
      );
    }
    return [...lines.values()].map(([x, y, r, b]) => [x, y, r - x, b - y]);
  });
}
