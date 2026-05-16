import { parseArticle, type ArticleMetadata, type ImageReference } from "../core/article.js";

export type InspectCheckStatus = "pass" | "warn";

export interface InspectCheck {
  code: string;
  status: InspectCheckStatus;
  message: string;
  count?: number;
}

export interface InspectResult {
  metadata: ArticleMetadata;
  images: ImageReference[];
  checks: InspectCheck[];
  baseDir?: string;
}

export interface InspectOptions {
  baseDir?: string;
}

export function inspectArticle(markdown: string, options: InspectOptions = {}): InspectResult {
  const article = parseArticle(markdown);
  const checks: InspectCheck[] = [
    article.metadata.title
      ? { code: "TITLE_PRESENT", status: "pass", message: "title resolved" }
      : { code: "TITLE_PRESENT", status: "warn", message: "title is missing" },
    {
      code: "IMAGE_REFERENCES",
      status: "pass",
      message: `${article.images.length} image references found`,
      count: article.images.length
    }
  ];

  for (const image of article.images) {
    if (image.type === "local") {
      checks.push({
        code: "LOCAL_IMAGE",
        status: "warn",
        message: `local image reference: ${image.src}`
      });
    }
  }

  return {
    metadata: article.metadata,
    images: article.images,
    checks,
    baseDir: options.baseDir
  };
}
