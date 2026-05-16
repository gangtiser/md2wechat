# md2wechat TypeScript Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript/Node.js md2wechat remake with shared core logic, CLI, MCP server, Skill instructions, local theme registry, OpenAI `gpt-5.5` text rendering, OpenAI `gpt-image-2` image generation, and no hosted md2wechat API conversion mode.

**Architecture:** The project is an ESM TypeScript package. `src/core`, `src/themes`, `src/config`, `src/openai`, `src/renderer`, `src/images`, `src/inspect`, and `src/preview` provide shared logic; `src/cli` and `src/mcp` are thin entry points over those modules. Tests use Node's built-in test runner against compiled JavaScript to avoid a heavy test framework.

**Tech Stack:** Node.js 20+, TypeScript, Node `node:test`, `@modelcontextprotocol/sdk`, built-in `fetch`, built-in `fs/path/http`, JSON files for theme registry.

---

## File Structure

Create these files:

- `package.json`: npm scripts, binary mapping, dependencies, package metadata.
- `tsconfig.json`: ESM TypeScript build config.
- `README.md`: concise usage and architecture notes.
- `src/core/envelope.ts`: stable JSON envelope helpers.
- `src/core/errors.ts`: typed application errors and retry classification.
- `src/core/article.ts`: Markdown/frontmatter/metadata/image parsing.
- `src/core/html.ts`: WeChat HTML sanitizer and preview escaping helpers.
- `src/core/io.ts`: safe file and URL input loading.
- `src/config/config.ts`: environment/config loading and defaults.
- `src/themes/builtin.ts`: bundled theme definitions.
- `src/themes/registry.ts`: theme list/register/remove/load behavior.
- `src/openai/client.ts`: injectable OpenAI Responses and Image API client.
- `src/renderer/render.ts`: prompt construction and HTML rendering.
- `src/images/generate.ts`: image prompt resolution and output file writing.
- `src/inspect/inspect.ts`: read-only article readiness analysis.
- `src/preview/preview.ts`: preview HTML document generation.
- `src/cli/index.ts`: CLI parser and command handlers.
- `src/mcp/tools.ts`: MCP tool schemas and pure tool handlers.
- `src/mcp/server.ts`: stdio MCP server startup.
- `skills/md2wechat/SKILL.md`: Codex-compatible Skill.
- `test/core.test.ts`: core parser, envelope, sanitizer tests.
- `test/themes.test.ts`: theme registry tests.
- `test/openai.test.ts`: OpenAI client, renderer, image generator tests with local HTTP server.
- `test/cli.test.ts`: CLI contract tests with child processes and mocked local OpenAI server.
- `test/mcp.test.ts`: MCP tool schema and pure handler tests.
- `test/api-removal.test.ts`: hosted API mode removal regression test.

Keep generated files in `dist/`; keep worktrees in `.worktrees/`.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `README.md`

- [ ] **Step 1: Write package metadata and scripts**

Create `package.json` with this shape:

```json
{
  "name": "md2wechat",
  "version": "0.1.0",
  "description": "TypeScript md2wechat CLI, Skill, and MCP server without hosted API conversion mode.",
  "license": "SEE LICENSE IN LICENSE",
  "type": "module",
  "bin": {
    "md2wechat": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "skills",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "npm run build && node --test \"dist/test/**/*.test.js\"",
    "verify:api-removal": "npm run build && node --test dist/test/api-removal.test.js",
    "verify": "npm run typecheck && npm test && npm run verify:api-removal"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "0.6.0"
  },
  "devDependencies": {
    "@types/node": "^24.3.0",
    "typescript": "^5.9.2"
  }
}
```

- [ ] **Step 2: Write TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "types": ["node"],
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 3: Write README baseline**

Create `README.md` with sections:

```markdown
# md2wechat

TypeScript rebuild of md2wechat for local CLI, Codex Skill, and MCP use.

## Defaults

- Text rendering model: `gpt-5.5`
- Image generation model: `gpt-image-2`
- Hosted md2wechat conversion API mode: not supported

## Commands

- `md2wechat inspect <file>`
- `md2wechat convert <file> --theme default --output article.html`
- `md2wechat preview <file> --output preview.html`
- `md2wechat generate-image "prompt" --output cover.png`
- `md2wechat themes list`
- `md2wechat themes register <name> <path>`
- `md2wechat themes remove <name>`
- `md2wechat mcp`
```

- [ ] **Step 4: Run scaffold checks**

Run: `npm run typecheck`

Expected: fails before dependencies are installed with a TypeScript command or package dependency error. After `npm install`, expected output is a clean typecheck.

- [ ] **Step 5: Commit scaffold**

```bash
git add package.json tsconfig.json README.md
git commit -m "chore: scaffold TypeScript package"
```

## Task 2: Core Parsing, Envelopes, Errors, I/O, and HTML Safety

**Files:**
- Create: `src/core/envelope.ts`
- Create: `src/core/errors.ts`
- Create: `src/core/article.ts`
- Create: `src/core/html.ts`
- Create: `src/core/io.ts`
- Create: `test/core.test.ts`

- [ ] **Step 1: Write failing core tests**

Create `test/core.test.ts` with tests for:

```ts
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArticle } from "../src/core/article.js";
import { failureEnvelope, successEnvelope } from "../src/core/envelope.js";
import { sanitizeWechatHtml } from "../src/core/html.js";
import { loadInput } from "../src/core/io.js";

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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: fails because `src/core/*` modules do not exist.

- [ ] **Step 3: Implement `src/core/envelope.ts`**

Implement:

```ts
export type EnvelopeStatus = "completed" | "action_required" | "failed";

export interface JsonEnvelope<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  schema_version: "1.0";
  status: EnvelopeStatus;
  retryable: boolean;
  data?: T;
  error?: string;
}

export function successEnvelope<T>(code: string, message: string, data: T): JsonEnvelope<T> {
  return { success: true, code, message, schema_version: "1.0", status: "completed", retryable: false, data };
}

export function actionEnvelope<T>(code: string, message: string, data: T): JsonEnvelope<T> {
  return { success: true, code, message, schema_version: "1.0", status: "action_required", retryable: false, data };
}

export function failureEnvelope(code: string, message: string, retryable: boolean, error?: string): JsonEnvelope {
  return { success: false, code, message, schema_version: "1.0", status: "failed", retryable, error };
}
```

- [ ] **Step 4: Implement `src/core/errors.ts`**

Implement `AppError` and helpers:

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toAppError(error: unknown, fallbackCode = "ERROR"): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(fallbackCode, error.message, false, error);
  return new AppError(fallbackCode, String(error), false, error);
}
```

- [ ] **Step 5: Implement `src/core/article.ts`**

Implement `parseArticle(markdown: string)` with:

- frontmatter between first `---` and next `---`
- simple `key: value` metadata fields: `title`, `author`, `digest`, `summary`, `description`
- first Markdown `# ` heading fallback
- image extraction for `![alt](src)`
- image type `local`, `remote`, or `ai` when src starts with `ai:`

- [ ] **Step 6: Implement `src/core/html.ts`**

Implement `sanitizeWechatHtml(html: string)` using deterministic regex removal for:

- `<script>...</script>`
- `<style>...</style>`
- event handler attributes like `onclick="..."`
- `javascript:` URLs

Also export `escapeHtml(value: string)`.

- [ ] **Step 7: Implement `src/core/io.ts`**

Implement `loadInput({ content, file, contentUrl })`:

- If `content` is non-empty, return it with `baseDir` undefined.
- If `file` is set, read UTF-8 file and return dirname.
- If `contentUrl` is set, fetch URL with a 30s abort timeout and require HTTP 2xx.
- Throw `AppError("INPUT_MISSING", ...)` if none are present.

- [ ] **Step 8: Run core tests**

Run: `npm test`

Expected: core tests pass once dependencies are installed and TypeScript compiles.

- [ ] **Step 9: Commit core**

```bash
git add src/core test/core.test.ts
git commit -m "feat: add core article parsing and envelopes"
```

## Task 3: Config and Theme Registry

**Files:**
- Create: `src/config/config.ts`
- Create: `src/themes/builtin.ts`
- Create: `src/themes/registry.ts`
- Create: `test/themes.test.ts`

- [ ] **Step 1: Write failing theme tests**

Create `test/themes.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadConfig } from "../src/config/config.js";
import { listThemes, registerTheme, removeTheme } from "../src/themes/registry.js";

test("loadConfig uses approved OpenAI defaults", () => {
  const cfg = loadConfig({});
  assert.equal(cfg.openaiTextModel, "gpt-5.5");
  assert.equal(cfg.openaiImageModel, "gpt-image-2");
  assert.equal(cfg.openaiBaseUrl, "https://api.openai.com/v1");
});

test("theme registry lists built-ins and registered custom themes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-themes-"));
  try {
    const registryPath = path.join(dir, "registry.json");
    const themePath = path.join(dir, "custom.json");
    await writeFile(themePath, JSON.stringify({ id: "custom", name: "Custom", prompt: "Use custom style." }));
    await registerTheme("custom", themePath, { registryPath, projectThemesDir: path.join(dir, "project") });
    const themes = await listThemes({ registryPath, projectThemesDir: path.join(dir, "project") });
    assert.equal(themes.some((theme) => theme.id === "default" && theme.builtin), true);
    assert.equal(themes.some((theme) => theme.id === "custom" && !theme.builtin), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("removeTheme refuses built-in themes and removes custom registry entries", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-remove-theme-"));
  try {
    const registryPath = path.join(dir, "registry.json");
    const themePath = path.join(dir, "custom.json");
    await writeFile(themePath, JSON.stringify({ id: "custom", name: "Custom", prompt: "Use custom style." }));
    await registerTheme("custom", themePath, { registryPath, projectThemesDir: path.join(dir, "project") });
    await assert.rejects(() => removeTheme("default", { registryPath, projectThemesDir: path.join(dir, "project") }), /built-in/);
    await removeTheme("custom", { registryPath, projectThemesDir: path.join(dir, "project") });
    const raw = await readFile(registryPath, "utf8");
    assert.equal(raw.includes("custom"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: fails because config and theme modules do not exist.

- [ ] **Step 3: Implement config defaults**

Create `src/config/config.ts` with:

```ts
export interface RuntimeConfig {
  openaiApiKey?: string;
  openaiBaseUrl: string;
  openaiTextModel: string;
  openaiImageModel: string;
  themeRegistryPath?: string;
  themesDir?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    openaiApiKey: env.OPENAI_API_KEY,
    openaiBaseUrl: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    openaiTextModel: env.OPENAI_TEXT_MODEL || "gpt-5.5",
    openaiImageModel: env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    themeRegistryPath: env.MD2WECHAT_THEME_REGISTRY,
    themesDir: env.MD2WECHAT_THEMES_DIR
  };
}
```

- [ ] **Step 4: Implement built-in themes**

Create `src/themes/builtin.ts` with at least:

```ts
import type { ThemeDefinition } from "./registry.js";

export const builtinThemes: ThemeDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean WeChat article typography with balanced spacing.",
    prompt: "Use clean, readable WeChat Official Account typography with inline styles, moderate spacing, and restrained accent color."
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-like headings and strong pull quotes.",
    prompt: "Use editorial magazine pacing, strong headings, pull quotes, and inline styles compatible with WeChat."
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet typography for concise technical writing.",
    prompt: "Use minimal inline styles, high readability, compact headings, and no decorative clutter."
  }
];
```

- [ ] **Step 5: Implement theme registry**

Create `src/themes/registry.ts` with exported:

- `ThemeDefinition`
- `LoadedTheme`
- `ThemeRegistryOptions`
- `listThemes(options?)`
- `resolveTheme(id, options?)`
- `registerTheme(name, themePath, options?)`
- `removeTheme(name, options?)`

Use JSON theme files. Validate `id` or supplied name, `name`, and `prompt` are non-empty. Persist registry as:

```json
{
  "themes": [
    {
      "id": "custom",
      "path": "/absolute/path/to/custom.json"
    }
  ]
}
```

- [ ] **Step 6: Run theme tests**

Run: `npm test`

Expected: theme tests pass.

- [ ] **Step 7: Commit config and themes**

```bash
git add src/config src/themes test/themes.test.ts
git commit -m "feat: add config and theme registry"
```

## Task 4: OpenAI Renderer and Image Generator

**Files:**
- Create: `src/openai/client.ts`
- Create: `src/renderer/render.ts`
- Create: `src/images/generate.ts`
- Create: `test/openai.test.ts`

- [ ] **Step 1: Write failing OpenAI tests**

Create `test/openai.test.ts` with a local HTTP server that asserts:

- Responses API requests include model `gpt-5.5`.
- Image API requests include model `gpt-image-2`.
- Renderer sanitizes returned HTML.
- Image generator writes decoded PNG bytes.

Use this test pattern:

```ts
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createOpenAIClient } from "../src/openai/client.js";
import { renderArticle } from "../src/renderer/render.js";
import { generateImage } from "../src/images/generate.js";

test("renderer and image generator use approved OpenAI models", async () => {
  const seen: unknown[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      seen.push({ url: req.url, body });
      res.setHeader("content-type", "application/json");
      if (req.url === "/responses") {
        res.end(JSON.stringify({ output_text: "<style>x</style><section><h1>Hi</h1></section>" }));
      } else if (req.url === "/images/generations") {
        res.end(JSON.stringify({ data: [{ b64_json: Buffer.from("png-bytes").toString("base64"), revised_prompt: "revised" }] }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: { message: "not found" } }));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address && typeof address === "object" ? address.port : 0}`;
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-openai-"));
  try {
    const client = createOpenAIClient({ apiKey: "test", baseUrl, textModel: "gpt-5.5", imageModel: "gpt-image-2" });
    const rendered = await renderArticle({ markdown: "# Hi", theme: { id: "default", name: "Default", prompt: "Clean" }, client });
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: fails because OpenAI modules do not exist.

- [ ] **Step 3: Implement OpenAI client**

Create `src/openai/client.ts` with:

- `OpenAIClientOptions`
- `OpenAIClient`
- `createOpenAIClient(options)`
- `responsesCreate(input)`
- `imagesGenerate(input)`

Use `fetch`, JSON, `Authorization: Bearer ${apiKey}`, and `AbortSignal.timeout(120000)`.

Responses API path: `${baseUrl}/responses`.

Image API path: `${baseUrl}/images/generations`.

Accept these response forms:

- `{ output_text: "<html>" }`
- `{ output: [{ content: [{ text: "<html>" }] }] }`
- `{ data: [{ b64_json: "..." }] }`

- [ ] **Step 4: Implement renderer**

Create `src/renderer/render.ts`:

- Input: `{ markdown, metadata?, theme, client }`
- Build prompt that requires inline styles, safe tags, no `<style>`, no script, no markdown fences.
- Call `client.responsesCreate({ model, input })`.
- Sanitize returned HTML.
- Return `{ html, model, themeId }`.

- [ ] **Step 5: Implement image generator**

Create `src/images/generate.ts`:

- Input: `{ prompt, articleContext?, output, size?, quality?, client }`
- Build final prompt by appending article context when present.
- Call `client.imagesGenerate`.
- Decode `b64_json` and write the output file.
- Return `{ outputPath, model, size, quality, revisedPrompt }`.

- [ ] **Step 6: Run OpenAI tests**

Run: `npm test`

Expected: OpenAI tests pass.

- [ ] **Step 7: Commit OpenAI modules**

```bash
git add src/openai src/renderer src/images test/openai.test.ts
git commit -m "feat: add OpenAI rendering and image generation"
```

## Task 5: Inspect and Preview Services

**Files:**
- Create: `src/inspect/inspect.ts`
- Create: `src/preview/preview.ts`
- Modify: `test/core.test.ts`

- [ ] **Step 1: Extend failing tests**

Add to `test/core.test.ts`:

```ts
import { inspectArticle } from "../src/inspect/inspect.js";
import { buildPreviewDocument } from "../src/preview/preview.js";

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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: fails because inspect and preview modules do not exist.

- [ ] **Step 3: Implement inspect**

Create `src/inspect/inspect.ts`:

- Export `InspectCheck`, `InspectResult`, `inspectArticle(markdown, { baseDir? })`.
- Use `parseArticle`.
- Checks:
  - `TITLE_PRESENT` with status `pass` or `warn`.
  - `IMAGE_REFERENCES` with count.
  - `LOCAL_IMAGE` for local image references.
- No OpenAI calls.

- [ ] **Step 4: Implement preview**

Create `src/preview/preview.ts`:

- Export `buildPreviewDocument(html, metadata)`.
- Use `sanitizeWechatHtml` for article body.
- Use `escapeHtml` for `<title>`.
- Return complete HTML document with a centered article container.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: inspect and preview tests pass.

- [ ] **Step 6: Commit inspect and preview**

```bash
git add src/inspect src/preview test/core.test.ts
git commit -m "feat: add inspect and preview services"
```

## Task 6: CLI Entry Point

**Files:**
- Create: `src/cli/index.ts`
- Create: `test/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Create `test/cli.test.ts`:

```ts
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cliPath = path.resolve("dist/src/cli/index.js");

test("CLI inspect emits JSON envelope", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-cli-inspect-"));
  try {
    const file = path.join(dir, "article.md");
    await writeFile(file, "# Title\nBody");
    const result = spawnSync(process.execPath, [cliPath, "inspect", file, "--json"], { encoding: "utf8" });
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
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address && typeof address === "object" ? address.port : 0}`;
  const dir = await mkdtemp(path.join(tmpdir(), "md2wechat-cli-convert-"));
  try {
    const input = path.join(dir, "article.md");
    const output = path.join(dir, "article.html");
    await writeFile(input, "# Title\nBody");
    const result = spawnSync(process.execPath, [cliPath, "convert", input, "--output", output, "--json"], {
      encoding: "utf8",
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

test("CLI does not accept API mode", () => {
  const result = spawnSync(process.execPath, [cliPath, "convert", "article.md", "--mode", "api"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /Unknown option|not supported|mode/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: fails because CLI entry does not exist.

- [ ] **Step 3: Implement CLI parser**

Create `src/cli/index.ts` with:

- shebang `#!/usr/bin/env node`
- manual command parser using `process.argv`
- commands from the design spec
- `--json` envelope output
- non-JSON human output
- `--mode` rejection for every command
- no `api` command or option

Keep command handlers small and use shared modules.

- [ ] **Step 4: Run CLI tests**

Run: `npm test`

Expected: CLI tests pass.

- [ ] **Step 5: Commit CLI**

```bash
git add src/cli test/cli.test.ts
git commit -m "feat: add CLI commands"
```

## Task 7: MCP Tools and Server

**Files:**
- Create: `src/mcp/tools.ts`
- Create: `src/mcp/server.ts`
- Create: `test/mcp.test.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Write failing MCP tests**

Create `test/mcp.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { listToolSchemas, handleToolCall } from "../src/mcp/tools.js";

test("MCP tool list exposes required tools and no API mode tool", () => {
  const tools = listToolSchemas();
  const names = tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, [
    "convert_article",
    "generate_image",
    "list_themes",
    "preview_article",
    "register_theme",
    "remove_theme"
  ]);
  assert.equal(names.some((name) => name.includes("api")), false);
});

test("MCP list_themes handler returns text content", async () => {
  const result = await handleToolCall("list_themes", {});
  assert.equal(Array.isArray(result.content), true);
  assert.equal(result.content[0].type, "text");
  assert.match(result.content[0].text, /default/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: fails because MCP modules do not exist.

- [ ] **Step 3: Implement pure MCP tools**

Create `src/mcp/tools.ts`:

- Export `listToolSchemas()`.
- Export `handleToolCall(name, args)`.
- Return MCP content arrays shaped as `{ content: [{ type: "text", text: "..." }] }`.
- Use shared modules for themes, preview, convert, and image generation.
- Do not duplicate parsing or rendering logic from CLI.

- [ ] **Step 4: Implement stdio server**

Create `src/mcp/server.ts` using `@modelcontextprotocol/sdk/server/index.js`, `StdioServerTransport`, `ListToolsRequestSchema`, and `CallToolRequestSchema`.

Diagnostics go to `console.error`.

- [ ] **Step 5: Add CLI `mcp` command**

Modify `src/cli/index.ts` so `md2wechat mcp` imports and starts `startMcpServer()`.

- [ ] **Step 6: Run MCP tests**

Run: `npm test`

Expected: MCP tests pass.

- [ ] **Step 7: Commit MCP**

```bash
git add src/mcp src/cli/index.ts test/mcp.test.ts
git commit -m "feat: add MCP server"
```

## Task 8: Skill, API Removal Regression, and Final Verification

**Files:**
- Create: `skills/md2wechat/SKILL.md`
- Create: `test/api-removal.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing API removal test**

Create `test/api-removal.test.ts`:

```ts
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function files(root: string): Promise<string[]> {
  const entries = await readdir(root);
  const result: string[] = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", ".worktrees"].includes(entry)) continue;
    const full = path.join(root, entry);
    const info = await stat(full);
    if (info.isDirectory()) result.push(...await files(full));
    else result.push(full);
  }
  return result;
}

test("hosted md2wechat API mode strings are absent from product files", async () => {
  const banned = ["md2wechat.cn/api/convert", "MD2WECHAT_API_KEY", "MD2WECHAT_BASE_URL", "--mode api"];
  const productFiles = (await files(".")).filter((file) => !file.endsWith("docs/superpowers/plans/2026-05-16-md2wechat-typescript-implementation.md"));
  const offenders: string[] = [];
  for (const file of productFiles) {
    const text = await readFile(file, "utf8");
    for (const phrase of banned) {
      if (text.includes(phrase)) offenders.push(`${file}: ${phrase}`);
    }
  }
  assert.deepEqual(offenders, []);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run verify:api-removal`

Expected: may fail until Skill and README avoid banned API-mode phrases.

- [ ] **Step 3: Write Skill**

Create `skills/md2wechat/SKILL.md`:

```markdown
---
name: md2wechat
description: Convert Markdown to WeChat Official Account HTML, generate images, manage themes, and use the md2wechat MCP server.
---

# md2wechat Skill

Use this skill when the user wants to turn Markdown into WeChat Official Account content, preview an article, generate a cover or infographic, manage themes, or expose the workflow through MCP.

## Defaults

- Text rendering model: `gpt-5.5`
- Image generation model: `gpt-image-2`
- Conversion is local through the CLI or MCP server.

## Workflow

1. Run `md2wechat inspect <file> --json`.
2. Run `md2wechat themes list --json` before choosing a theme.
3. Run `md2wechat convert <file> --theme <theme> --output <file>.html --json`.
4. Run `md2wechat preview <file> --theme <theme> --output preview.html --json` when the user wants a local confirmation page.
5. Run `md2wechat generate-image --article <file> --output cover.png --json` for covers or visual assets.

## Theme Management

- Register a theme: `md2wechat themes register <name> <path> --json`
- Remove a custom theme: `md2wechat themes remove <name> --json`
- List themes: `md2wechat themes list --json`

## MCP

Start the MCP server with:

```bash
md2wechat mcp
```

Available tools:

- `convert_article`
- `preview_article`
- `generate_image`
- `list_themes`
- `register_theme`
- `remove_theme`

## Rules

- Prefer file paths over large inline article content.
- Do not assume a theme exists; list themes first.
- Keep generated HTML and preview files on disk unless the user asks for stdout.
- Treat `OPENAI_API_KEY` as required for conversion and image generation.
```

- [ ] **Step 4: Update README with final usage**

Keep README aligned with implemented commands and defaults. Do not mention the removed hosted conversion mode strings from the API removal test.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run typecheck
npm test
npm run verify:api-removal
npm run build
git status --short --branch
```

Expected:

- Typecheck passes.
- Test suite passes.
- API removal test passes.
- Build passes.
- Git status only contains intentional final documentation changes before the final commit.

- [ ] **Step 6: Commit final docs and regression**

```bash
git add skills README.md test/api-removal.test.ts
git commit -m "docs: add md2wechat skill and API removal guard"
```

## Completion Audit Checklist

Before claiming completion, inspect real evidence for every item:

- Source project re-analysis evidence: design spec and this plan reference `md2wechat-skill` structure and `wenyan-mcp` theme tools.
- Optimization/refactor evidence: shared `src/core`, injectable OpenAI client, sanitizer, deterministic theme registry, CLI/MCP sharing.
- `gpt-5.5` evidence: `src/config/config.ts`, `src/renderer/render.ts`, `test/openai.test.ts`, README, Skill.
- `gpt-image-2` evidence: `src/config/config.ts`, `src/images/generate.ts`, `test/openai.test.ts`, README, Skill.
- No API mode evidence: `test/api-removal.test.ts`, CLI `--mode` rejection test, grep output or `npm run verify:api-removal`.
- Git evidence: `git log --oneline`.
- Multi-agent and worktree evidence: active worktree paths and agent task records from implementation.
- Theme registry evidence: `src/themes/registry.ts` and `test/themes.test.ts`.
- CLI evidence: `src/cli/index.ts`, `test/cli.test.ts`, command smoke output.
- Skill evidence: `skills/md2wechat/SKILL.md`.
- MCP evidence: `src/mcp/tools.ts`, `src/mcp/server.ts`, `test/mcp.test.ts`.
- Superpowers process evidence: design spec, implementation plan, subagent-driven-development notes.

## Plan Self-Review

- Spec coverage: each approved design deliverable maps to a task above.
- Placeholder scan: no unresolved placeholders are present.
- Type consistency: names used across tasks are stable: `RuntimeConfig`, `ThemeDefinition`, `LoadedTheme`, `createOpenAIClient`, `renderArticle`, `generateImage`, `inspectArticle`, `buildPreviewDocument`, `listToolSchemas`, and `handleToolCall`.
- Scope check: tasks are independent enough for parallel work after scaffold/core contracts land.
