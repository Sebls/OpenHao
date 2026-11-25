import test from "node:test";
import assert from "node:assert/strict";
import { formatRoute, parseRoute } from "../src/client/app/router.ts";

test("parseRoute and formatRoute handle library, reader, practice, and writing routes", () => {
  assert.deepEqual(parseRoute("/"), { view: "library" });
  assert.equal(formatRoute({ view: "library" }), "/");

  assert.deepEqual(parseRoute("/doc/lecon-01"), {
    view: "reader",
    documentId: "lecon-01",
    annotationId: undefined,
  });
  assert.equal(
    formatRoute({ view: "reader", documentId: "lecon-01" }),
    "/doc/lecon-01",
  );

  assert.deepEqual(parseRoute("/doc/lecon-01/page/3?annotation=a-42"), {
    view: "reader",
    documentId: "lecon-01",
    pageNumber: 3,
    annotationId: "a-42",
  });
  assert.equal(
    formatRoute({
      view: "reader",
      documentId: "lecon-01",
      pageNumber: 3,
      annotationId: "a-42",
    }),
    "/doc/lecon-01/page/3?annotation=a-42",
  );

  assert.deepEqual(parseRoute("/doc/lecon-01/practice"), {
    view: "practice",
    documentId: "lecon-01",
  });
  assert.equal(
    formatRoute({ view: "practice", documentId: "lecon-01" }),
    "/doc/lecon-01/practice",
  );

  assert.deepEqual(parseRoute("/doc/lecon-01/practice?page=2"), {
    view: "practice",
    documentId: "lecon-01",
    pageNumber: 2,
  });
  assert.equal(
    formatRoute({ view: "practice", documentId: "lecon-01", pageNumber: 2 }),
    "/doc/lecon-01/practice?page=2",
  );

  assert.deepEqual(parseRoute("/doc/lecon-01/writing/4/ann-9"), {
    view: "writing",
    documentId: "lecon-01",
    pageNumber: 4,
    annotationId: "ann-9",
  });
  assert.equal(
    formatRoute({
      view: "writing",
      documentId: "lecon-01",
      pageNumber: 4,
      annotationId: "ann-9",
    }),
    "/doc/lecon-01/writing/4/ann-9",
  );
});

test("parseRoute and formatRoute respect custom BASE_URL and reject invalid routes", () => {
  const base = "/chinois/";
  assert.deepEqual(parseRoute("/chinois/", base), { view: "library" });
  assert.deepEqual(parseRoute("/chinois", base), { view: "library" });
  assert.deepEqual(parseRoute("/chinois/doc/lecon-01/page/2/", base), {
    view: "reader",
    documentId: "lecon-01",
    pageNumber: 2,
    annotationId: undefined,
  });
  assert.equal(
    formatRoute({ view: "reader", documentId: "lecon-01", pageNumber: 2 }, base),
    "/chinois/doc/lecon-01/page/2",
  );

  assert.equal(parseRoute("/unknown/path"), null);
  assert.equal(parseRoute("/doc/lecon-01/page/0"), null);
  assert.equal(parseRoute("/doc/lecon-01/page/abc"), null);
  assert.equal(parseRoute("/doc/lecon-01/writing/0/a1"), null);
  assert.equal(parseRoute("/doc/lecon-01/writing/1"), null);
});
