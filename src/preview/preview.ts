import type { ArticleMetadata } from "../core/article.js";
import { escapeHtml, sanitizeWechatHtml } from "../core/html.js";

export function buildPreviewDocument(html: string, metadata: ArticleMetadata = {}): string {
  const title = escapeHtml(metadata.title || "md2wechat preview");
  const body = sanitizeWechatHtml(html);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;background:#f6f7f9;color:#1f2933;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <main style="max-width:780px;margin:0 auto;padding:32px 18px;">
    <article style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;">
${body}
    </article>
  </main>
</body>
</html>`;
}
