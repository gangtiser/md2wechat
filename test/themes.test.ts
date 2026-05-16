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
