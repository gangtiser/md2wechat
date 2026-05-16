import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OpenAIClient } from "../openai/client.js";

export interface GenerateImageInput {
  prompt: string;
  articleContext?: string;
  output: string;
  size?: string;
  quality?: string;
  client: OpenAIClient;
}

export interface GeneratedImage {
  outputPath: string;
  model: string;
  size?: string;
  quality?: string;
  revisedPrompt?: string;
}

export async function generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
  const model = input.client.imageModel;
  const image = await input.client.imagesGenerate({
    model,
    prompt: finalPrompt(input.prompt, input.articleContext),
    size: input.size,
    quality: input.quality
  });
  const outputPath = path.resolve(input.output);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(image.b64Json, "base64"));

  return {
    outputPath,
    model: image.model,
    size: input.size,
    quality: input.quality,
    revisedPrompt: image.revisedPrompt
  };
}

function finalPrompt(prompt: string, articleContext: string | undefined): string {
  if (!articleContext?.trim()) {
    return prompt;
  }

  return `${prompt}\n\nArticle context:\n${articleContext}`;
}
