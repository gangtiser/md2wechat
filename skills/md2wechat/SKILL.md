---
name: md2wechat
description: Convert Markdown to WeChat Official Account HTML, generate images, manage themes, and use the md2wechat MCP server.
---

# md2wechat Skill

Use this skill when the user wants to turn Markdown into WeChat Official Account content, preview an article, generate a cover or infographic, manage themes, or expose the workflow through MCP.

## Defaults

- Text rendering model: `gpt-5.5`
- Image generation model: `gpt-image-2`
- Conversion is local through the CLI or MCP server.

## Workflow

1. Run `md2wechat inspect <file> --json`.
2. Run `md2wechat themes list --json` before choosing a theme.
3. Run `md2wechat convert <file> --theme <theme> --output <file>.html --json`.
4. Run `md2wechat preview <file> --theme <theme> --output preview.html --json` when the user wants a local confirmation page.
5. Run `md2wechat generate-image --article <file> --output cover.png --json` for covers or visual assets.

## Theme Management

- Register a theme: `md2wechat themes register <name> <path> --json`
- Remove a custom theme: `md2wechat themes remove <name> --json`
- List themes: `md2wechat themes list --json`

## MCP

Start the MCP server with:

```bash
md2wechat mcp
```

Available tools:

- `convert_article`
- `preview_article`
- `generate_image`
- `list_themes`
- `register_theme`
- `remove_theme`

## Rules

- Prefer file paths over large inline article content.
- Do not assume a theme exists; list themes first.
- Keep generated HTML and preview files on disk unless the user asks for stdout.
- Treat `OPENAI_API_KEY` as required for conversion and image generation.
