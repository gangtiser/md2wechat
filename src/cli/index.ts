#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArticle } from "../core/article.js";
import { successEnvelope, failureEnvelope } from "../core/envelope.js";
import { AppError, toAppError } from "../core/errors.js";
import { loadInput } from "../core/io.js";
import { loadConfig } from "../config/config.js";
import { generateImage } from "../images/generate.js";
import { createOpenAIClient } from "../openai/client.js";
import { buildPreviewDocument } from "../preview/preview.js";
import { renderArticle } from "../renderer/render.js";
import { inspectArticle } from "../inspect/inspect.js";
import { listThemes, registerTheme, removeTheme, resolveTheme } from "../themes/registry.js";

interface ParsedArgs {
  command: string[];
  values: string[];
  flags: Map<string, string | true>;
}

async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  try {
    rejectModeFlag(args);
    await route(args);
  } catch (error) {
    const appError = toAppError(error);
    if (args.flags.has("json")) {
      printJson(failureEnvelope(appError.code, appError.message, appError.retryable, appError.message));
    } else {
      console.error(appError.message);
    }
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const command: string[] = [];
  const values: string[] = [];
  const flags = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item.startsWith("--")) {
      const name = item.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        flags.set(name, next);
        index += 1;
      } else {
        flags.set(name, true);
      }
      continue;
    }

    if (command.length === 0 || (command[0] === "themes" && command.length === 1)) {
      command.push(item);
    } else {
      values.push(item);
    }
  }

  return { command, values, flags };
}

function rejectModeFlag(args: ParsedArgs): void {
  if (args.flags.has("mode")) {
    throw new AppError("MODE_NOT_SUPPORTED", "mode option is not supported");
  }
}

async function route(args: ParsedArgs): Promise<void> {
  const [primary, secondary] = args.command;

  if (primary === "inspect") {
    await inspectCommand(args);
    return;
  }
  if (primary === "convert") {
    await convertCommand(args);
    return;
  }
  if (primary === "preview") {
    await previewCommand(args);
    return;
  }
  if (primary === "generate-image") {
    await generateImageCommand(args);
    return;
  }
  if (primary === "themes" && secondary === "list") {
    await themesListCommand(args);
    return;
  }
  if (primary === "themes" && secondary === "register") {
    await themesRegisterCommand(args);
    return;
  }
  if (primary === "themes" && secondary === "remove") {
    await themesRemoveCommand(args);
    return;
  }
  if (primary === "mcp") {
    const { startMcpServer } = await import("../mcp/server.js");
    await startMcpServer();
    return;
  }

  throw new AppError("COMMAND_INVALID", `unknown command: ${args.command.join(" ") || "(empty)"}`);
}

async function inspectCommand(args: ParsedArgs): Promise<void> {
  const file = requiredValue(args, 0, "markdown file is required");
  const input = await loadInput({ file });
  const result = inspectArticle(input.content, { baseDir: input.baseDir });
  output(args, "INSPECT_COMPLETED", "Inspection completed", result, formatInspect(result));
}

async function convertCommand(args: ParsedArgs): Promise<void> {
  const file = requiredValue(args, 0, "markdown file is required");
  const outputPath = stringFlag(args, "output") || stringFlag(args, "o");
  const themeId = stringFlag(args, "theme") || "default";
  const config = loadConfig();
  const apiKey = requireOpenAIKey(config.openaiApiKey);
  const input = await loadInput({ file });
  const article = parseArticle(input.content);
  const theme = await resolveTheme(themeId, themeOptions(config));
  const client = createOpenAIClient({
    apiKey,
    baseUrl: config.openaiBaseUrl,
    textModel: config.openaiTextModel,
    imageModel: config.openaiImageModel
  });
  const rendered = await renderArticle({
    markdown: article.body,
    metadata: article.metadata,
    theme,
    client
  });

  if (outputPath) {
    await writeOutputFile(outputPath, rendered.html);
  }

  output(args, "CONVERT_COMPLETED", "Conversion completed", {
    ...rendered,
    metadata: article.metadata,
    output_file: outputPath ? path.resolve(outputPath) : undefined
  }, outputPath ? `HTML written to ${outputPath}` : rendered.html);
}

async function previewCommand(args: ParsedArgs): Promise<void> {
  const file = requiredValue(args, 0, "markdown file is required");
  const outputPath = stringFlag(args, "output") || stringFlag(args, "o") || "preview.html";
  const themeId = stringFlag(args, "theme") || "default";
  const config = loadConfig();
  const apiKey = requireOpenAIKey(config.openaiApiKey);
  const input = await loadInput({ file });
  const article = parseArticle(input.content);
  const theme = await resolveTheme(themeId, themeOptions(config));
  const client = createOpenAIClient({
    apiKey,
    baseUrl: config.openaiBaseUrl,
    textModel: config.openaiTextModel,
    imageModel: config.openaiImageModel
  });
  const rendered = await renderArticle({
    markdown: article.body,
    metadata: article.metadata,
    theme,
    client
  });
  const preview = buildPreviewDocument(rendered.html, article.metadata);
  await writeOutputFile(outputPath, preview);
  output(args, "PREVIEW_READY", "Preview ready", {
    output_file: path.resolve(outputPath),
    metadata: article.metadata,
    theme_id: theme.id
  }, `Preview written to ${outputPath}`);
}

async function generateImageCommand(args: ParsedArgs): Promise<void> {
  const config = loadConfig();
  const apiKey = requireOpenAIKey(config.openaiApiKey);
  const prompt = args.values[0] || "WeChat article cover image";
  const articleFile = stringFlag(args, "article");
  const articleContext = articleFile ? (await loadInput({ file: articleFile })).content : undefined;
  const outputPath = stringFlag(args, "output") || stringFlag(args, "o") || "image.png";
  const client = createOpenAIClient({
    apiKey,
    baseUrl: config.openaiBaseUrl,
    textModel: config.openaiTextModel,
    imageModel: config.openaiImageModel
  });
  const image = await generateImage({
    prompt,
    articleContext,
    output: outputPath,
    size: stringFlag(args, "size"),
    quality: stringFlag(args, "quality"),
    client
  });
  output(args, "IMAGE_GENERATED", "Image generated", image, `Image written to ${image.outputPath}`);
}

async function themesListCommand(args: ParsedArgs): Promise<void> {
  const themes = await listThemes(themeOptions(loadConfig()));
  output(args, "THEMES_LISTED", "Themes listed", { themes }, themes.map((theme) => `${theme.id}\t${theme.name}`).join("\n"));
}

async function themesRegisterCommand(args: ParsedArgs): Promise<void> {
  const name = requiredValue(args, 0, "theme name is required");
  const themePath = requiredValue(args, 1, "theme path is required");
  const theme = await registerTheme(name, themePath, themeOptions(loadConfig()));
  output(args, "THEME_REGISTERED", "Theme registered", { theme }, `Registered theme ${theme.id}`);
}

async function themesRemoveCommand(args: ParsedArgs): Promise<void> {
  const name = requiredValue(args, 0, "theme name is required");
  await removeTheme(name, themeOptions(loadConfig()));
  output(args, "THEME_REMOVED", "Theme removed", { id: name }, `Removed theme ${name}`);
}

function output(args: ParsedArgs, code: string, message: string, data: unknown, text: string): void {
  if (args.flags.has("json")) {
    printJson(successEnvelope(code, message, data));
  } else {
    console.log(text);
  }
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function requiredValue(args: ParsedArgs, index: number, message: string): string {
  const value = args.values[index];
  if (!value) {
    throw new AppError("INPUT_INVALID", message);
  }
  return value;
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function requireOpenAIKey(value: string | undefined): string {
  if (!value) {
    throw new AppError("OPENAI_KEY_MISSING", "OPENAI_API_KEY is required");
  }
  return value;
}

function themeOptions(config: ReturnType<typeof loadConfig>): { registryPath?: string; projectThemesDir?: string } {
  return {
    registryPath: config.themeRegistryPath,
    projectThemesDir: config.themesDir
  };
}

async function writeOutputFile(outputPath: string, content: string): Promise<void> {
  const absolute = path.resolve(outputPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

function formatInspect(result: ReturnType<typeof inspectArticle>): string {
  return [
    `Title: ${result.metadata.title || "(missing)"}`,
    `Images: ${result.images.length}`,
    ...result.checks.map((check) => `${check.status.toUpperCase()} ${check.code}: ${check.message}`)
  ].join("\n");
}

void main();
