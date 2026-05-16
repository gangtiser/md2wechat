import { parseArticle } from "../core/article.js";
import { AppError, toAppError } from "../core/errors.js";
import { loadInput } from "../core/io.js";
import { loadConfig } from "../config/config.js";
import { generateImage } from "../images/generate.js";
import { createOpenAIClient } from "../openai/client.js";
import { buildPreviewDocument } from "../preview/preview.js";
import { renderArticle } from "../renderer/render.js";
import { listThemes, registerTheme, removeTheme, resolveTheme } from "../themes/registry.js";

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
}

type ToolArgs = Record<string, unknown>;

export function listToolSchemas(): McpToolSchema[] {
  return [
    {
      name: "convert_article",
      description: "Convert Markdown to WeChat Official Account inline-style HTML.",
      inputSchema: articleInputSchema({ includeOutput: true })
    },
    {
      name: "preview_article",
      description: "Render Markdown and write a local preview HTML document.",
      inputSchema: articleInputSchema({ includeOutput: true })
    },
    {
      name: "generate_image",
      description: "Generate an image with OpenAI image generation and write it to disk.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          article: { type: "string" },
          output: { type: "string" },
          size: { type: "string" },
          quality: { type: "string" }
        }
      }
    },
    {
      name: "list_themes",
      description: "List built-in and custom themes.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "register_theme",
      description: "Register a custom theme from a local JSON theme file.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          path: { type: "string" }
        },
        required: ["name", "path"]
      }
    },
    {
      name: "remove_theme",
      description: "Remove a custom theme by name.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      }
    }
  ];
}

export async function handleToolCall(name: string, args: ToolArgs = {}): Promise<McpToolResult> {
  try {
    switch (name) {
      case "convert_article":
        return textResult(JSON.stringify(await convertArticle(args), null, 2));
      case "preview_article":
        return textResult(JSON.stringify(await previewArticle(args), null, 2));
      case "generate_image":
        return textResult(JSON.stringify(await generateImageTool(args), null, 2));
      case "list_themes":
        return textResult(JSON.stringify({ themes: await listThemes(themeOptions()) }, null, 2));
      case "register_theme":
        return textResult(JSON.stringify({ theme: await registerTheme(requiredString(args, "name"), requiredString(args, "path"), themeOptions()) }, null, 2));
      case "remove_theme": {
        const id = requiredString(args, "name");
        await removeTheme(id, themeOptions());
        return textResult(JSON.stringify({ id }, null, 2));
      }
      default:
        throw new AppError("MCP_TOOL_UNKNOWN", `Unknown tool: ${name}`);
    }
  } catch (error) {
    const appError = toAppError(error);
    return textResult(`执行工具失败: ${appError.message}`);
  }
}

async function convertArticle(args: ToolArgs): Promise<unknown> {
  const config = loadConfig();
  const input = await loadInput({
    content: optionalString(args, "content"),
    file: optionalString(args, "file"),
    contentUrl: optionalString(args, "content_url")
  });
  const article = parseArticle(input.content);
  const theme = await resolveTheme(optionalString(args, "theme_id") || "default", themeOptions());
  const client = createOpenAIClient({
    apiKey: requireOpenAIKey(config.openaiApiKey),
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
  return {
    html: rendered.html,
    model: rendered.model,
    theme_id: rendered.themeId,
    metadata: article.metadata
  };
}

async function previewArticle(args: ToolArgs): Promise<unknown> {
  const converted = await convertArticle(args);
  if (!isRecord(converted) || typeof converted.html !== "string") {
    throw new AppError("MCP_PREVIEW_FAILED", "Unable to render article preview");
  }
  return {
    ...converted,
    preview_html: buildPreviewDocument(converted.html, isRecord(converted.metadata) ? converted.metadata : {})
  };
}

async function generateImageTool(args: ToolArgs): Promise<unknown> {
  const config = loadConfig();
  const client = createOpenAIClient({
    apiKey: requireOpenAIKey(config.openaiApiKey),
    baseUrl: config.openaiBaseUrl,
    textModel: config.openaiTextModel,
    imageModel: config.openaiImageModel
  });
  return generateImage({
    prompt: optionalString(args, "prompt") || "WeChat article cover image",
    articleContext: optionalString(args, "article"),
    output: optionalString(args, "output") || "image.png",
    size: optionalString(args, "size"),
    quality: optionalString(args, "quality"),
    client
  });
}

function articleInputSchema(options: { includeOutput: boolean }): McpToolSchema["inputSchema"] {
  return {
    type: "object",
    properties: {
      content: { type: "string" },
      content_url: { type: "string" },
      file: { type: "string" },
      theme_id: { type: "string" },
      ...(options.includeOutput ? { output: { type: "string" } } : {})
    }
  };
}

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function optionalString(args: ToolArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function requiredString(args: ToolArgs, key: string): string {
  const value = optionalString(args, key);
  if (!value) {
    throw new AppError("MCP_INPUT_INVALID", `${key} is required`);
  }
  return value;
}

function requireOpenAIKey(value: string | undefined): string {
  if (!value) {
    throw new AppError("OPENAI_KEY_MISSING", "OPENAI_API_KEY is required");
  }
  return value;
}

function themeOptions(): { registryPath?: string; projectThemesDir?: string } {
  const config = loadConfig();
  return {
    registryPath: config.themeRegistryPath,
    projectThemesDir: config.themesDir
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
