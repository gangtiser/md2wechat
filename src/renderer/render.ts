import type { ArticleMetadata } from "../core/article.js";
import { sanitizeWechatHtml } from "../core/html.js";
import type { OpenAIClient } from "../openai/client.js";

export interface RenderTheme {
  id: string;
  name: string;
  prompt: string;
}

export interface RenderArticleInput {
  markdown: string;
  metadata?: ArticleMetadata;
  theme: RenderTheme;
  client: OpenAIClient;
}

export interface RenderedArticle {
  html: string;
  model: string;
  themeId: string;
}

export async function renderArticle(input: RenderArticleInput): Promise<RenderedArticle> {
  const model = input.client.textModel;
  const response = await input.client.responsesCreate({
    model,
    input: buildRenderPrompt(input)
  });

  return {
    html: sanitizeWechatHtml(response.outputText),
    model: response.model,
    themeId: input.theme.id
  };
}

function buildRenderPrompt(input: RenderArticleInput): string {
  const metadata = [
    input.metadata?.title ? `Title: ${input.metadata.title}` : undefined,
    input.metadata?.author ? `Author: ${input.metadata.author}` : undefined,
    input.metadata?.digest ? `Digest: ${input.metadata.digest}` : undefined
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "Convert the Markdown article to WeChat Official Account HTML.",
    "Requirements:",
    "- Return HTML only, with no markdown fences or explanatory text.",
    "- Use inline styles compatible with WeChat.",
    "- Do not include <style>, <script>, event handler attributes, or javascript: URLs.",
    "- Use safe structural tags such as section, p, h1, h2, h3, blockquote, ul, ol, li, strong, em, span, a, and img.",
    `Theme (${input.theme.name}): ${input.theme.prompt}`,
    metadata ? `Metadata:\n${metadata}` : undefined,
    `Markdown:\n${input.markdown}`
  ]
    .filter(Boolean)
    .join("\n\n");
}
