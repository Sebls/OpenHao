import HanziWriter from "hanzi-writer";

export const strokeDiagramTransform = HanziWriter.getScalingTransform(
  260,
  260,
  20,
).transform;

export async function demonstrateRemainingStrokes(
  writer,
  start,
  total,
  restore,
  isCurrent,
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

export async function loadCharacter(character, signal) {
  const response = await fetch(
    `/hanzi-data/${encodeURIComponent(character)}.json`,
    { signal },
  );
  if (!response.ok)
    throw Error("Stroke data is unavailable for this character.");
  return response.json();
}

// Use the public renderer override to scope pointer listeners to this SVG.
// Pointer capture supports pen/touch/mouse and AbortController removes all listeners.
export function createWriter(host, character, data, options = {}) {
  const controller = new AbortController();
  const element = (name) =>
    document.createElementNS("http://www.w3.org/2000/svg", name);
  const svg = element("svg"),
    defs = element("defs");
  svg.append(defs);
  host.replaceChildren(svg);
  const target = (node) => ({
    node,
    svg: node,
    defs,
    updateDimensions(width, height) {
      node.setAttribute("width", width);
      node.setAttribute("height", height);
      node.setAttribute("viewBox", `0 0 ${width} ${height}`);
    },
    createSubRenderTarget() {
      const group = element("g");
      node.append(group);
      return target(group);
    },
    addPointerStartListener(callback) {
      node.addEventListener(
        "pointerdown",
        (event) => {
          if (!event.isPrimary || event.button !== 0) return;
          node.setPointerCapture(event.pointerId);
          callback(eventData(event));
        },
        { signal: controller.signal },
      );
    },
    addPointerMoveListener(callback) {
      node.addEventListener(
        "pointermove",
        (event) => {
          if (event.isPrimary) callback(eventData(event));
        },
        { signal: controller.signal },
      );
    },
    addPointerEndListener(callback) {
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        node.addEventListener(type, callback, { signal: controller.signal });
    },
  });
  function eventData(event) {
    return {
      preventDefault: () => event.preventDefault(),
      getPoint: () => {
        const point = new DOMPoint(
          event.clientX,
          event.clientY,
        ).matrixTransform(svg.getScreenCTM().inverse());
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
        return result;
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
