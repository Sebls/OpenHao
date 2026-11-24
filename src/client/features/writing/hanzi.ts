type WriterOptions = Parameters<
  typeof HanziWriter.create
>[2] extends infer Options
  ? NonNullable<Options>
  : never;
export type CharacterData = {
  strokes: string[];
  medians: number[][][];
  radStrokes?: number[];
};
type WriterTarget = ReturnType<
  NonNullable<
    NonNullable<WriterOptions["rendererOverride"]>["createRenderTarget"]
  >
>;
type BoundEvent = {
  getPoint: () => { x: number; y: number };
  preventDefault: () => void;
};
interface ScopedTarget {
  node: SVGElement;
  svg: SVGElement;
  defs: SVGDefsElement;
  updateDimensions: (width: number, height: number) => void;
  createSubRenderTarget: () => ScopedTarget;
  addPointerStartListener: (callback: (event: BoundEvent) => void) => void;
  addPointerMoveListener: (callback: (event: BoundEvent) => void) => void;
  addPointerEndListener: (callback: () => void) => void;
}
import HanziWriter from "hanzi-writer";

export const strokeDiagramTransform = HanziWriter.getScalingTransform(
  260,
  260,
  20,
).transform;

export async function demonstrateRemainingStrokes(
  writer: Pick<HanziWriter, "cancelQuiz" | "animateStroke">,
  start: number,
  total: number,
  restore: () => void | Promise<void>,
  isCurrent: () => boolean,
) {
  writer.cancelQuiz();
  try {
    for (let i = start; i < total && isCurrent(); i++) {
      const result = await writer.animateStroke(i);
      if (result?.canceled) break;
    }
  } finally {
    if (isCurrent()) await restore();
  }
}

export async function loadCharacter(
  character: string,
  signal?: AbortSignal,
): Promise<CharacterData> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}hanzi-data/${encodeURIComponent(character)}.json`,
    { signal },
  );
  if (!response.ok)
    throw Error("Stroke data is unavailable for this character.");
  return response.json();
}

// Use the public renderer override to scope pointer listeners to this SVG.
// Pointer capture supports pen/touch/mouse and AbortController removes all listeners.
export function createWriter(
  host: HTMLElement,
  character: string,
  data: CharacterData,
  options: Partial<WriterOptions> = {},
) {
  const controller = new AbortController();
  const element = <K extends keyof SVGElementTagNameMap>(name: K) =>
    document.createElementNS("http://www.w3.org/2000/svg", name);
  const svg = element("svg"),
    defs = element("defs");
  svg.append(defs);
  host.replaceChildren(svg);
  const target = (node: SVGElement): ScopedTarget => ({
    node,
    svg: node,
    defs,
    updateDimensions(width: number, height: number) {
      node.setAttribute("width", String(width));
      node.setAttribute("height", String(height));
      node.setAttribute("viewBox", `0 0 ${width} ${height}`);
    },
    createSubRenderTarget() {
      const group = element("g");
      node.append(group);
      return target(group);
    },
    addPointerStartListener(callback: (event: BoundEvent) => void) {
      node.addEventListener(
        "pointerdown",
        (rawEvent) => {
          const event = rawEvent as PointerEvent;
          handle(event);
        },
        { signal: controller.signal },
      );
      function handle(event: PointerEvent) {
        if (!event.isPrimary || event.button !== 0) return;
        node.setPointerCapture(event.pointerId);
        callback(eventData(event));
      }
    },
    addPointerMoveListener(callback: (event: BoundEvent) => void) {
      node.addEventListener(
        "pointermove",
        (rawEvent) => {
          const event = rawEvent as PointerEvent;
          if (event.isPrimary) callback(eventData(event));
        },
        { signal: controller.signal },
      );
    },
    addPointerEndListener(callback: () => void) {
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        node.addEventListener(type, callback, { signal: controller.signal });
    },
  });
  function eventData(event: PointerEvent) {
    return {
      preventDefault: () => event.preventDefault(),
      getPoint: () => {
        const point = new DOMPoint(
          event.clientX,
          event.clientY,
        ).matrixTransform(svg.getScreenCTM()!.inverse());
        return { x: point.x, y: point.y };
      },
    };
  }
  const writer = HanziWriter.create(host, character, {
    width: 260,
    height: 260,
    padding: 20,
    strokeColor: "#0b1015",
    outlineColor: "#e2e6eb",
    highlightColor: "#0562ef",
    drawingColor: "#0562ef",
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 350,
    strokeFadeDuration: 0,
    drawingFadeDuration: 100,
    charDataLoader: () => data,
    rendererOverride: {
      createRenderTarget: () => {
        const result = target(svg);
        result.updateDimensions(260, 260);
        // Hanzi Writer types also declare unused private base-class methods.
        // This adapter implements the public SVG target consumed by its renderer.
        return result as unknown as WriterTarget;
      },
    },
    ...options,
  });
  return {
    writer,
    dispose() {
      controller.abort();
      writer.cancelQuiz();
      // A zero-duration hide cancels any pending stroke animation.
      void writer.hideCharacter({ duration: 0 });
      host.replaceChildren();
    },
  };
}
