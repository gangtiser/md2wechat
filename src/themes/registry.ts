import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { AppError } from "../core/errors.js";
import { builtinThemes } from "./builtin.js";

export interface ThemeDefinition {
  id: string;
  name: string;
  description?: string;
  prompt: string;
}

export interface LoadedTheme extends ThemeDefinition {
  builtin: boolean;
  path?: string;
}

export interface ThemeRegistryOptions {
  registryPath?: string;
  projectThemesDir?: string;
}

interface ThemeRegistryEntry {
  id: string;
  path: string;
}

interface ThemeRegistryFile {
  themes: ThemeRegistryEntry[];
}

const DEFAULT_REGISTRY_PATH = ".md2wechat/themes/registry.json";

export async function listThemes(options: ThemeRegistryOptions = {}): Promise<LoadedTheme[]> {
  const registry = await readRegistry(options);
  const customThemes = await Promise.all(
    registry.themes.map(async (entry) => {
      const theme = await loadThemeFile(entry.path, entry.id);
      return { ...theme, builtin: false, path: entry.path };
    })
  );

  return [
    ...builtinThemes.map((theme) => ({ ...theme, builtin: true })),
    ...customThemes
  ];
}

export async function resolveTheme(id: string, options: ThemeRegistryOptions = {}): Promise<LoadedTheme> {
  const theme = (await listThemes(options)).find((candidate) => candidate.id === id);
  if (!theme) {
    throw new AppError("THEME_NOT_FOUND", `Theme not found: ${id}`);
  }
  return theme;
}

export async function registerTheme(name: string, themePath: string, options: ThemeRegistryOptions = {}): Promise<LoadedTheme> {
  const theme = await loadThemeFile(themePath, name);
  if (isBuiltinTheme(theme.id)) {
    throw new AppError("THEME_BUILTIN", `Cannot register built-in theme: ${theme.id}`);
  }

  const registry = await readRegistry(options);
  const absolutePath = resolve(themePath);
  const existingIndex = registry.themes.findIndex((entry) => entry.id === theme.id);
  const entry = { id: theme.id, path: absolutePath };

  if (existingIndex >= 0) {
    registry.themes[existingIndex] = entry;
  } else {
    registry.themes.push(entry);
  }

  await writeRegistry(registry, options);
  return { ...theme, builtin: false, path: absolutePath };
}

export async function removeTheme(name: string, options: ThemeRegistryOptions = {}): Promise<void> {
  if (isBuiltinTheme(name)) {
    throw new AppError("THEME_BUILTIN", `Cannot remove built-in theme: ${name}`);
  }

  const registry = await readRegistry(options);
  const nextThemes = registry.themes.filter((entry) => entry.id !== name);
  await writeRegistry({ themes: nextThemes }, options);
}

async function loadThemeFile(themePath: string, suppliedId?: string): Promise<ThemeDefinition> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(themePath, "utf8"));
  } catch (error) {
    throw new AppError("THEME_INVALID", `Unable to read theme file: ${themePath}`, false, error);
  }

  if (!isRecord(parsed)) {
    throw new AppError("THEME_INVALID", "Theme file must contain a JSON object");
  }

  const id = stringValue(parsed.id) || suppliedId;
  const name = stringValue(parsed.name);
  const prompt = stringValue(parsed.prompt);
  if (!id || !name || !prompt) {
    throw new AppError("THEME_INVALID", "Theme id, name, and prompt must be non-empty strings");
  }

  return {
    id,
    name,
    description: stringValue(parsed.description),
    prompt
  };
}

async function readRegistry(options: ThemeRegistryOptions): Promise<ThemeRegistryFile> {
  const registryPath = getRegistryPath(options);
  try {
    const parsed: unknown = JSON.parse(await readFile(registryPath, "utf8"));
    if (!isRecord(parsed) || !Array.isArray(parsed.themes)) {
      throw new AppError("THEME_REGISTRY_INVALID", "Theme registry must contain a themes array");
    }

    return {
      themes: parsed.themes.map(parseRegistryEntry)
    };
  } catch (error) {
    if (isMissingFile(error)) {
      return { themes: [] };
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("THEME_REGISTRY_INVALID", `Unable to read theme registry: ${registryPath}`, false, error);
  }
}

async function writeRegistry(registry: ThemeRegistryFile, options: ThemeRegistryOptions): Promise<void> {
  const registryPath = getRegistryPath(options);
  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

function getRegistryPath(options: ThemeRegistryOptions): string {
  return resolve(options.registryPath || options.projectThemesDir || DEFAULT_REGISTRY_PATH);
}

function parseRegistryEntry(value: unknown): ThemeRegistryEntry {
  if (!isRecord(value)) {
    throw new AppError("THEME_REGISTRY_INVALID", "Theme registry entries must be JSON objects");
  }
  const id = stringValue(value.id);
  const entryPath = stringValue(value.path);
  if (!id || !entryPath) {
    throw new AppError("THEME_REGISTRY_INVALID", "Theme registry entries require id and path");
  }
  return { id, path: entryPath };
}

function isBuiltinTheme(id: string): boolean {
  return builtinThemes.some((theme) => theme.id === id);
}

function isMissingFile(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
