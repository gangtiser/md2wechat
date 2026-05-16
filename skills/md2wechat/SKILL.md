---
name: md2wechat
description: Convert Markdown to WeChat Official Account HTML, manage themes, and use the md2wechat MCP server.
---

# md2wechat Skill

Use this skill when the user wants to turn Markdown into WeChat Official Account content, preview an article, manage themes, or expose the workflow through MCP.

## Defaults & Agent Usage

- Conversion is local through the CLI or MCP server.
- Use Codex or Claude to write or revise Markdown before calling md2wechat.
- Customers configure WeChat credentials with `md2wechat config init` or environment variables.

## Workflow

1. Run `md2wechat inspect <file> --json`.
2. Run `md2wechat config status --json` if the workflow needs WeChat account credentials.
3. Run `md2wechat themes list --json` before choosing a theme.
4. Run `md2wechat convert <file> --theme <theme> --output <file>.html --json`.
5. Run `md2wechat preview <file> --theme <theme> --output preview.html --json` when the user wants a local confirmation page.

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
- `list_themes`
- `register_theme`
- `remove_theme`

## Rules

- Prefer file paths over large inline article content.
- Do not assume a theme exists; list themes first.
- Keep generated HTML and preview files on disk unless the user asks for stdout.
- Do not ask customers for model names or model API keys; the host agent handles AI authoring.
- Use `WECHAT_APP_ID` and `WECHAT_APP_SECRET` when WeChat account credentials are needed.
