import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { AppError } from "../core/errors.js";

export interface RuntimeConfig {
  configPath: string;
  wechatAppId?: string;
  wechatAppSecret?: string;
  themeRegistryPath?: string;
  themesDir?: string;
}

export interface LoadConfigOptions {
  configPath?: string;
}

export interface ConfigStatus {
  config_path: string;
  wechat_app_id_configured: boolean;
  wechat_app_secret_configured: boolean;
}

interface ConfigFile {
  WECHAT_APP_ID?: string;
  WECHAT_APP_SECRET?: string;
}

const DEFAULT_CONFIG = {
  WECHAT_APP_ID: "your_app_id",
  WECHAT_APP_SECRET: "your_app_secret"
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env, options: LoadConfigOptions = {}): RuntimeConfig {
  const configPath = resolveConfigPath(env, options.configPath);
  const fileConfig = readConfigFile(configPath);
  return {
    configPath,
    wechatAppId: stringValue(env.WECHAT_APP_ID) || fileConfig.WECHAT_APP_ID,
    wechatAppSecret: stringValue(env.WECHAT_APP_SECRET) || fileConfig.WECHAT_APP_SECRET,
    themeRegistryPath: env.MD2WECHAT_THEME_REGISTRY,
    themesDir: env.MD2WECHAT_THEMES_DIR
  };
}

export function resolveConfigPath(env: NodeJS.ProcessEnv = process.env, explicitPath?: string): string {
  return resolve(explicitPath || env.MD2WECHAT_CONFIG || join(homedir(), ".md2wechat", "config.json"));
}

export async function writeDefaultConfig(configPath: string, options: { force?: boolean } = {}): Promise<ConfigStatus> {
  const resolvedPath = resolve(configPath);
  if (existsSync(resolvedPath) && !options.force) {
    throw new AppError("CONFIG_EXISTS", `Config already exists: ${resolvedPath}`);
  }
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  return configStatus(loadConfig(process.env, { configPath: resolvedPath }));
}

export function configStatus(config: RuntimeConfig): ConfigStatus {
  return {
    config_path: config.configPath,
    wechat_app_id_configured: isConfiguredCredential(config.wechatAppId),
    wechat_app_secret_configured: isConfiguredCredential(config.wechatAppSecret)
  };
}

function readConfigFile(configPath: string): ConfigFile {
  if (!existsSync(configPath)) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new AppError("CONFIG_INVALID", `Unable to read config file: ${configPath}`, false, error);
  }
  if (!isRecord(parsed)) {
    throw new AppError("CONFIG_INVALID", "Config file must contain a JSON object");
  }
  return {
    WECHAT_APP_ID: stringValue(parsed.WECHAT_APP_ID),
    WECHAT_APP_SECRET: stringValue(parsed.WECHAT_APP_SECRET)
  };
}

function isConfiguredCredential(value: string | undefined): boolean {
  return Boolean(value && !value.startsWith("your_"));
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
