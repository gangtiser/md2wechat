import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { generateImage } from "../src/images/generate.js";
import { createOpenAIClient } from "../src/openai/client.js";
import { renderArticle } from "../src/renderer/render.js";

test("renderer and image generator use approved OpenAI models", async () => {
  const seen: unknown[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      seen.push({ url: req.url, body });
      res.setHeader("content-type", "application/json");
      if (req.url === "/responses") {
        res.end(JSON.stringify({ output_text: "<style>x</style><section><h1>Hi</h1></section>" }));
      } else if (req.url === "/images/generations") {
        res.end(
          JSON.stringify({
            data: [{ b64_json: Buffer.from("png-bytes").toString("base64"), revised_prompt: "revised" }]
          })
        );
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: { message: "not found" } }));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address && typeof address === "object" ? address.port : 0}`;
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-openai-"));

  try {
    const client = createOpenAIClient({
      apiKey: "test",
      baseUrl,
      textModel: "gpt-5.5",
      imageModel: "gpt-image-2"
    });
    const rendered = await renderArticle({
      markdown: "# Hi",
      theme: { id: "default", name: "Default", prompt: "Clean" },
      client
    });
    assert.equal(rendered.html.includes("<style>"), false);
    const image = await generateImage({ prompt: "Cover", output: path.join(dir, "cover.png"), client });
    assert.equal(await readFile(image.outputPath, "utf8"), "png-bytes");
    assert.equal((seen[0] as any).body.model, "gpt-5.5");
    assert.equal((seen[1] as any).body.model, "gpt-image-2");
  } finally {
    await rm(dir, { recursive: true, force: true });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
