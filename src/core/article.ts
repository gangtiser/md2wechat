export type ImageReferenceType = "local" | "remote" | "ai";

export interface ArticleMetadata {
  title?: string;
  author?: string;
  digest?: string;
}

export interface ImageReference {
  index: number;
  alt: string;
  src: string;
  type: ImageReferenceType;
}

export interface ParsedArticle {
  originalMarkdown: string;
  body: string;
  metadata: ArticleMetadata;
  headingTitle?: string;
  images: ImageReference[];
}

export function parseArticle(markdown: string): ParsedArticle {
  const { metadata, body } = parseFrontmatter(markdown);
  const headingTitle = firstHeading(body);
  const resolvedMetadata = {
    ...metadata,
    title: metadata.title || headingTitle
  };

  return {
    originalMarkdown: markdown,
    body,
    metadata: resolvedMetadata,
    headingTitle,
    images: extractImages(body)
  };
}

function parseFrontmatter(markdown: string): { metadata: ArticleMetadata; body: string } {
  if (!markdown.startsWith("---\n")) {
    return { metadata: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    return { metadata: {}, body: markdown };
  }

  const frontmatter = markdown.slice(4, end);
  const body = markdown.slice(end + 4).replace(/^\r?\n/, "");
  const fields: Record<string, string> = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    fields[match[1].toLowerCase()] = stripQuotes(match[2].trim());
  }

  return {
    metadata: {
      title: emptyToUndefined(fields.title),
      author: emptyToUndefined(fields.author),
      digest: emptyToUndefined(fields.digest || fields.summary || fields.description)
    },
    body
  };
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function firstHeading(markdown: string): string | undefined {
  const match = /^#\s+(.+?)\s*$/m.exec(markdown);
  return match?.[1]?.trim();
}

function extractImages(markdown: string): ImageReference[] {
  const images: ImageReference[] = [];
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const src = match[2];
    images.push({
      index: images.length,
      alt: match[1],
      src,
      type: imageType(src)
    });
  }
  return images;
}

function imageType(src: string): ImageReferenceType {
  if (src.startsWith("ai:")) {
    return "ai";
  }
  if (/^https?:\/\//i.test(src)) {
    return "remote";
  }
  return "local";
}
