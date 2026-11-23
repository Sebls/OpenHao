import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
test("local HTTP delivery, automatic discovery, pinned revisions, invalid package isolation and restart", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chinois-http-")),
    data = path.join(temp, "data"),
    env = { ...process.env, CHINOIS_DATA_ROOT: data, PORT: "0" };
  // Source-independent HTTP fixture uses a tiny, known PDF and the production package shape.
  const { read, write, seal } = await import("../tools/library.mjs");
  const pdf = path.join(temp, "source.pdf");
  const p = spawnSync(
    ".venv/bin/python",
    [
      "-c",
      `import pymupdf as f
p=f.open();q=p.new_page();q.insert_text((80,100),'你好',fontname='china-s',fontsize=30);p.save(${JSON.stringify(pdf)})`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(p.status, 0, p.stderr);
  const cli = (c, a = []) => {
    const r = spawnSync(process.execPath, ["tools/content.mjs", c, ...a], {
      env,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    return r;
  };
  cli("extract", ["--input", pdf, "--id", "http-fixture", "--pages", "1"]);
  const stage = path.join(data, "staging/http-fixture"),
    m = read(path.join(stage, "manifest.json")),
    b = path.join(stage, "pages/p0001"),
    l = read(path.join(b, "layout.json"));
  const identity = {
    documentId: m.documentId,
    pageId: "p0001",
    extractionRevision: 1,
  };
  const text = fs.readFileSync(path.join(b, "text.txt"), "utf8");
  write(path.join(b, "entries.json"), {
    ...identity,
    entries: [
      {
        id: "e1",
        kind: "word",
        form: text,
        meaning: "Hello",
        pronunciations: [
          { system: "pinyin", value: "nǐ hǎo", reviewStatus: "reviewed" },
        ],
        reviewStatus: "reviewed",
      },
    ],
  });
  write(path.join(b, "annotations.json"), {
    ...identity,
    annotations: [
      {
        id: "a1",
        entryId: "e1",
        kind: "word",
        reviewStatus: "reviewed",
        anchors: [
          {
            pageId: "p0001",
            extractionRevision: 1,
            start: 0,
            end: Array.from(text).length,
            exactText: text,
            characterIds: l.characters.map((c) => c.id),
          },
        ],
      },
    ],
  });
  m.pages[0].state = "ready";
  write(path.join(stage, "manifest.json"), m);
  write(path.join(b, "review.json"), {
    documentId: m.documentId,
    pageId: "p0001",
    extractionRevision: 1,
    textSha256: l.textSha256,
    sourceVisualReview: true,
    linguisticReview: true,
    reviewer: "Synthetic HTTP fixture",
    issues: [],
  });
  cli("publish", ["--id", "http-fixture"]);
  let child;
  async function start() {
    child = spawn(process.execPath, ["tools/server.mjs"], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    const address = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Server startup timed out: " + stderr)),
        10000,
      );
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(Error("Server exited " + code + ": " + stderr));
      });
      child.stdout.on("data", (d) => {
        chunks.push(String(d));
        const match = chunks.join("").match(/http:\/\/localhost:(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve("http://127.0.0.1:" + match[1]);
        }
      });
    });
    return address;
  }
  const get = (base, p, opts) => fetch(base + p, opts);
  try {
    let base = await start();
    let response = await get(base, "/");
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-security-policy"),
      /connect-src 'self'/,
    );
    assert.match(await response.text(), /\/assets\//);
    let cat = await (await get(base, "/api/catalog")).json();
    assert.equal(cat.documents.length, 1);
    assert.equal(cat.documents[0].contentRevision, 1);
    response = await get(base, "/pdf/http-fixture/1", {
      headers: { Range: "bytes=0-7" },
    });
    assert.equal(response.status, 206);
    assert.equal((await response.arrayBuffer()).byteLength, 8);
    assert.equal(
      (await get(base, "/content/http-fixture/1/../../../../package.json"))
        .status,
      404,
    );
    const hostStatus = await new Promise((resolve, reject) => {
      const req = http.get(
        base + "/api/catalog",
        { headers: { Host: "evil.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", reject);
    });
    assert.equal(hostStatus, 403);
    assert.equal(
      (await get(base, "/pdfjs/cmaps/UniGB-UCS2-H.bcmap")).status,
      200,
    );
    const revision = path.join(data, "library/http-fixture/revisions/1");
    fs.cpSync(revision, stage, { recursive: true });
    const next = read(path.join(stage, "manifest.json"));
    next.baseRevision = 1;
    next.contentRevision = 2;
    next.title = "New revision";
    write(path.join(stage, "manifest.json"), next);
    cli("publish", ["--id", "http-fixture"]);
    cat = await (await get(base, "/api/catalog")).json();
    assert.equal(cat.documents[0].contentRevision, 2);
    assert.equal(
      (await (await get(base, "/api/document/http-fixture/1")).json()).manifest
        .contentRevision,
      1,
    );
    assert.equal(
      (await (await get(base, "/api/document/http-fixture/2")).json()).manifest
        .title,
      "New revision",
    );
    write(path.join(data, "library/invalid/current.json"), { revision: 1 });
    write(path.join(data, "library/invalid/revisions/1/manifest.json"), {
      schemaVersion: "99",
    });
    cat = await (await get(base, "/api/catalog")).json();
    assert.equal(cat.documents.length, 1);
    assert.equal(cat.issues.length, 1);
    child.kill();
    await once(child, "exit");
    base = await start();
    cat = await (await get(base, "/api/catalog")).json();
    assert.equal(cat.documents[0].contentRevision, 2);
    assert.equal((await get(base, "/pdf/http-fixture/2")).status, 200);
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
