import { readFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "./errors.js";

export interface LoadInputOptions {
  content?: string;
  file?: string;
  contentUrl?: string;
}

export interface LoadedInput {
  content: string;
  baseDir?: string;
  source: "content" | "file" | "url";
}

export async function loadInput(options: LoadInputOptions): Promise<LoadedInput> {
  if (options.content && options.content.trim() !== "") {
    return { content: options.content, source: "content" };
  }

  if (options.file) {
    const absolute = path.resolve(options.file);
    return {
      content: await readFile(absolute, "utf8"),
      baseDir: path.dirname(absolute),
      source: "file"
    };
  }

  if (options.contentUrl) {
    const response = await fetch(options.contentUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new AppError("INPUT_URL_FAILED", `failed to fetch input URL: HTTP ${response.status}`, true);
    }
    return {
      content: await response.text(),
      source: "url"
    };
  }

  throw new AppError("INPUT_MISSING", "missing input content, file, or content URL");
}
