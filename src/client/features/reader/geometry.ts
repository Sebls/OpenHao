import type { Annotation, Layout, Rect } from "../../../contracts/content.ts";
export function anchorRects(annotation: Annotation, layout: Layout): Rect[] {
  const chars = new Map(layout.characters.map((c) => [c.id, c]));
  return annotation.anchors.flatMap((anchor) => {
    const lines = new Map<string, Rect>();
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
    return [...lines.values()].map(([x, y, r, b]): Rect => [
      x,
      y,
      r - x,
      b - y,
    ]);
  });
}
