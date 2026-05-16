import type { ArticleMetadata } from "../core/article.js";
import { escapeHtml, sanitizeWechatHtml } from "../core/html.js";

export interface RenderTheme {
  id: string;
  name: string;
  prompt: string;
}

export interface RenderArticleInput {
  markdown: string;
  metadata?: ArticleMetadata;
  theme: RenderTheme;
}

export interface RenderedArticle {
  html: string;
  renderer: "local";
  themeId: string;
}

export async function renderArticle(input: RenderArticleInput): Promise<RenderedArticle> {
  return {
    html: sanitizeWechatHtml(renderMarkdown(input.markdown, stylesFor(input.theme.id))),
    renderer: "local",
    themeId: input.theme.id
  };
}

interface ThemeStyles {
  container: string;
  heading1: string;
  heading2: string;
  heading3: string;
  paragraph: string;
  list: string;
  listItem: string;
  quote: string;
  codeBlock: string;
  inlineCode: string;
  image: string;
  link: string;
}

function renderMarkdown(markdown: string, styles: ThemeStyles): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [`<section style="${styles.container}">`];
  const paragraph: string[] = [];
  let listType: "ul" | "ol" | undefined;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length === 0) {
      return;
    }
    html.push(`<p style="${styles.paragraph}">${renderInline(paragraph.join(" "), styles)}</p>`);
    paragraph.length = 0;
  };

  const closeList = (): void => {
    if (!listType) {
      return;
    }
    html.push(`</${listType}>`);
    listType = undefined;
  };

  const openList = (type: "ul" | "ol"): void => {
    if (listType === type) {
      return;
    }
    closeList();
    html.push(`<${type} style="${styles.list}">`);
    listType = type;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeList();
      if (inCodeBlock) {
        html.push(`<pre style="${styles.codeBlock}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(heading[1].length, 3);
      const style = level === 1 ? styles.heading1 : level === 2 ? styles.heading2 : styles.heading3;
      html.push(`<h${level} style="${style}">${renderInline(heading[2], styles)}</h${level}>`);
      continue;
    }

    if (/^([-*_])\s*(\1\s*){2,}$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push(`<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" />`);
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote style="${styles.quote}">${renderInline(quote[1], styles)}</blockquote>`);
      continue;
    }

    const unordered = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (unordered) {
      flushParagraph();
      openList("ul");
      html.push(`<li style="${styles.listItem}">${renderInline(unordered[1], styles)}</li>`);
      continue;
    }

    const ordered = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      openList("ol");
      html.push(`<li style="${styles.listItem}">${renderInline(ordered[1], styles)}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  if (inCodeBlock) {
    html.push(`<pre style="${styles.codeBlock}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  closeList();
  html.push("</section>");

  return html.join("\n");
}

function renderInline(value: string, styles: ThemeStyles): string {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_match, alt: string, src: string) => {
    return `<img src="${src}" alt="${alt}" style="${styles.image}" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_match, label: string, href: string) => {
    return `<a href="${href}" style="${styles.link}">${label}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, `<code style="${styles.inlineCode}">$1</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
  return html;
}

function stylesFor(themeId: string): ThemeStyles {
  if (themeId === "minimal") {
    return {
      ...baseStyles(),
      container: "font-size:15px;line-height:1.75;color:#2f3437;",
      heading1: "font-size:22px;line-height:1.35;font-weight:700;margin:0 0 18px;color:#111827;",
      heading2: "font-size:18px;line-height:1.45;font-weight:700;margin:26px 0 12px;color:#111827;",
      quote: "margin:18px 0;padding:10px 14px;border-left:3px solid #9ca3af;color:#4b5563;background:#f9fafb;"
    };
  }
  if (themeId === "editorial") {
    return {
      ...baseStyles(),
      heading1: "font-size:26px;line-height:1.3;font-weight:700;margin:0 0 20px;color:#111827;",
      heading2: "font-size:20px;line-height:1.45;font-weight:700;margin:30px 0 14px;color:#7c2d12;",
      quote: "margin:22px 0;padding:14px 18px;border-left:4px solid #c2410c;color:#431407;background:#fff7ed;font-weight:600;"
    };
  }
  return baseStyles();
}

function baseStyles(): ThemeStyles {
  return {
    container: "font-size:16px;line-height:1.8;color:#1f2937;",
    heading1: "font-size:24px;line-height:1.35;font-weight:700;margin:0 0 20px;color:#111827;",
    heading2: "font-size:20px;line-height:1.45;font-weight:700;margin:28px 0 14px;color:#111827;",
    heading3: "font-size:17px;line-height:1.5;font-weight:700;margin:22px 0 10px;color:#111827;",
    paragraph: "margin:0 0 16px;",
    list: "margin:0 0 16px;padding-left:22px;",
    listItem: "margin:0 0 8px;",
    quote: "margin:20px 0;padding:12px 16px;border-left:4px solid #2563eb;color:#374151;background:#f8fafc;",
    codeBlock: "margin:18px 0;padding:12px;overflow:auto;background:#f3f4f6;border-radius:4px;font-size:13px;line-height:1.6;",
    inlineCode: "font-family:monospace;background:#f3f4f6;border-radius:3px;padding:1px 4px;",
    image: "max-width:100%;height:auto;display:block;margin:16px auto;",
    link: "color:#2563eb;text-decoration:none;"
  };
}
