import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const cliPath = path.resolve("dist/src/cli/index.js");

test("CLI inspect emits JSON envelope", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-cli-inspect-"));
  try {
    const file = path.join(dir, "article.md");
    await writeFile(file, "# Title\nBody");
    const result = await runCli(["inspect", file, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.equal(json.success, true);
    assert.equal(json.code, "INSPECT_COMPLETED");
    assert.equal(json.data.metadata.title, "Title");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI convert uses local OpenAI renderer and writes output", async () => {
  const server = createServer((req, res) => {
    req.resume();
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ output_text: "<section><h1>Rendered</h1></section>" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address && typeof address === "object" ? address.port : 0}`;
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-cli-convert-"));
  try {
    const input = path.join(dir, "article.md");
    const output = path.join(dir, "article.html");
    await writeFile(input, "# Title\nBody");
    const result = await runCli(["convert", input, "--output", output, "--json"], {
      env: { ...process.env, OPENAI_API_KEY: "test", OPENAI_BASE_URL: baseUrl }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await readFile(output, "utf8")).includes("Rendered"), true);
    assert.equal(JSON.parse(result.stdout).code, "CONVERT_COMPLETED");
  } finally {
    await rm(dir, { recursive: true, force: true });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("CLI does not accept API mode", async () => {
  const result = await runCli(["convert", "article.md", "--mode", "api"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /Unknown option|not supported|mode/);
});

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], options: { env?: NodeJS.ProcessEnv } = {}): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}
