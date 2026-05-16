import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArticle } from "../src/core/article.js";
import { failureEnvelope, successEnvelope } from "../src/core/envelope.js";
import { sanitizeWechatHtml } from "../src/core/html.js";
import { loadInput } from "../src/core/io.js";
import { inspectArticle } from "../src/inspect/inspect.js";
import { buildPreviewDocument } from "../src/preview/preview.js";

test("parseArticle resolves frontmatter, heading title, body, and image references", () => {
  const article = parseArticle("---\ntitle: Front Title\nauthor: Martin\ndigest: Short\n---\n# Body Title\nText\n![Alt](./a.png)\n![Remote](https://example.com/x.jpg)");
  assert.equal(article.metadata.title, "Front Title");
  assert.equal(article.metadata.author, "Martin");
  assert.equal(article.metadata.digest, "Short");
  assert.equal(article.headingTitle, "Body Title");
  assert.equal(article.images.length, 2);
  assert.deepEqual(article.images.map((img) => img.type), ["local", "remote"]);
});

test("parseArticle falls back to first markdown heading when frontmatter has no title", () => {
  const article = parseArticle("# Heading\nBody");
  assert.equal(article.metadata.title, "Heading");
});

test("envelopes keep a stable schema", () => {
  assert.deepEqual(successEnvelope("OK", "done", { value: 1 }), {
    success: true,
    code: "OK",
    message: "done",
    schema_version: "1.0",
    status: "completed",
    retryable: false,
    data: { value: 1 }
  });
  assert.equal(failureEnvelope("ERR", "bad", false, "details").status, "failed");
});

test("sanitizeWechatHtml removes unsafe tags and style blocks", () => {
  const html = sanitizeWechatHtml("<style>p{}</style><script>alert(1)</script><p onclick=\"x()\">Hi</p>");
  assert.equal(html.includes("<style>"), false);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("onclick="), false);
  assert.equal(html.includes("<p"), true);
});

test("loadInput reads file content and reports base directory", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-core-"));
  try {
    const file = path.join(dir, "article.md");
    await writeFile(file, "# Title\n");
    const input = await loadInput({ file });
    assert.equal(input.content, "# Title\n");
    assert.equal(input.baseDir, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("inspectArticle reports metadata and readiness without network calls", () => {
  const result = inspectArticle("# Title\nBody\n![A](./missing.png)", { baseDir: "/tmp" });
  assert.equal(result.metadata.title, "Title");
  assert.equal(result.checks.some((check) => check.code === "LOCAL_IMAGE"), true);
});

test("buildPreviewDocument wraps sanitized article HTML", () => {
  const preview = buildPreviewDocument("<section><h1>Hi</h1></section>", { title: "Hi" });
  assert.equal(preview.includes("<!doctype html>"), true);
  assert.equal(preview.includes("<section><h1>Hi</h1></section>"), true);
});
