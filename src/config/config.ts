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
