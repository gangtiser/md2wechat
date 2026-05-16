export interface OpenAIClientOptions {
  apiKey: string;
  baseUrl?: string;
  textModel?: string;
  imageModel?: string;
}

export interface ResponsesCreateInput {
  model?: string;
  input: string;
}

export interface ResponsesCreateResult {
  model: string;
  outputText: string;
  raw: unknown;
}

export interface ImagesGenerateInput {
  model?: string;
  prompt: string;
  size?: string;
  quality?: string;
}

export interface ImagesGenerateResult {
  model: string;
  b64Json: string;
  revisedPrompt?: string;
  raw: unknown;
}

export interface OpenAIClient {
  textModel: string;
  imageModel: string;
  responsesCreate(input: ResponsesCreateInput): Promise<ResponsesCreateResult>;
  imagesGenerate(input: ImagesGenerateInput): Promise<ImagesGenerateResult>;
}

const defaultBaseUrl = "https://api.openai.com/v1";
const defaultTextModel = "gpt-5.5";
const defaultImageModel = "gpt-image-2";

export function createOpenAIClient(options: OpenAIClientOptions): OpenAIClient {
  const baseUrl = (options.baseUrl || defaultBaseUrl).replace(/\/+$/, "");
  const textModel = options.textModel || defaultTextModel;
  const imageModel = options.imageModel || defaultImageModel;

  return {
    textModel,
    imageModel,
    async responsesCreate(input) {
      const model = input.model || textModel;
      const json = await postJson(`${baseUrl}/responses`, options.apiKey, {
        model,
        input: input.input
      });
      return {
        model,
        outputText: extractOutputText(json),
        raw: json
      };
    },
    async imagesGenerate(input) {
      const model = input.model || imageModel;
      const json = await postJson(`${baseUrl}/images/generations`, options.apiKey, {
        model,
        prompt: input.prompt,
        ...(input.size ? { size: input.size } : {}),
        ...(input.quality ? { quality: input.quality } : {})
      });
      const firstImage = extractFirstImage(json);
      return {
        model,
        b64Json: firstImage.b64Json,
        revisedPrompt: firstImage.revisedPrompt,
        raw: json
      };
    }
  };
}

async function postJson(url: string, apiKey: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });
  const json = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(openAIErrorMessage(json, response.status));
  }

  return json;
}

function extractOutputText(json: unknown): string {
  if (isRecord(json) && typeof json.output_text === "string") {
    return json.output_text;
  }

  if (isRecord(json) && Array.isArray(json.output)) {
    const parts: string[] = [];
    for (const item of json.output) {
      if (!isRecord(item) || !Array.isArray(item.content)) {
        continue;
      }
      for (const content of item.content) {
        if (isRecord(content) && typeof content.text === "string") {
          parts.push(content.text);
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("");
    }
  }

  throw new Error("OpenAI response did not include output text");
}

function extractFirstImage(json: unknown): { b64Json: string; revisedPrompt?: string } {
  if (!isRecord(json) || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error("OpenAI image response did not include image data");
  }

  const first = json.data[0];
  if (!isRecord(first) || typeof first.b64_json !== "string") {
    throw new Error("OpenAI image response did not include b64_json");
  }

  return {
    b64Json: first.b64_json,
    revisedPrompt: typeof first.revised_prompt === "string" ? first.revised_prompt : undefined
  };
}

function openAIErrorMessage(json: unknown, status: number): string {
  if (isRecord(json) && isRecord(json.error) && typeof json.error.message === "string") {
    return `OpenAI request failed (${status}): ${json.error.message}`;
  }
  return `OpenAI request failed (${status})`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
