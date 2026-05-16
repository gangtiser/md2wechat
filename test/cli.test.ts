import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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

test("CLI convert renders locally without model provider configuration", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-cli-convert-"));
  try {
    const input = path.join(dir, "article.md");
    const output = path.join(dir, "article.html");
    await writeFile(input, "# Title\n\nBody with **bold** text.");
    const env = { ...process.env };
    const modelProviderPrefix = "OPEN" + "AI";
    delete env[`${modelProviderPrefix}_API_KEY`];
    delete env[`${modelProviderPrefix}_BASE_URL`];
    delete env[`${modelProviderPrefix}_TEXT_MODEL`];
    delete env[`${modelProviderPrefix}_IMAGE_MODEL`];
    const result = await runCli(["convert", input, "--output", output, "--json"], { env });
    assert.equal(result.status, 0, result.stderr);
    const html = await readFile(output, "utf8");
    assert.match(html, /<h1\b[^>]*>Title<\/h1>/);
    assert.match(html, /<strong>bold<\/strong>/);
    const json = JSON.parse(result.stdout);
    assert.equal(json.code, "CONVERT_COMPLETED");
    assert.equal(json.data.renderer, "local");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI config init writes WeChat placeholder config", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-config-init-"));
  try {
    const configPath = path.join(dir, "config.json");
    const result = await runCli(["config", "init", "--path", configPath, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(await readFile(configPath, "utf8"));
    assert.deepEqual(config, {
      WECHAT_APP_ID: "your_app_id",
      WECHAT_APP_SECRET: "your_app_secret"
    });
    assert.equal(JSON.parse(result.stdout).code, "CONFIG_INITIALIZED");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI config status reports configured WeChat credentials without printing secrets", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-config-status-"));
  try {
    const configPath = path.join(dir, "config.json");
    await writeFile(configPath, JSON.stringify({
      WECHAT_APP_ID: "wx123",
      WECHAT_APP_SECRET: "secret-value"
    }));
    const result = await runCli(["config", "status", "--path", configPath, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes("secret-value"), false);
    const json = JSON.parse(result.stdout);
    assert.equal(json.code, "CONFIG_STATUS");
    assert.equal(json.data.wechat_app_id_configured, true);
    assert.equal(json.data.wechat_app_secret_configured, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
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
