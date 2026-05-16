# md2wechat

`md2wechat` is a TypeScript CLI, Codex Skill, and MCP server for turning Markdown into WeChat Official Account HTML. It runs locally, uses OpenAI for rendering and image generation, and includes a local theme registry.

## Install

```bash
npm install -g @gangtiser/md2wechat
```

Node.js 20 or newer is required. Set your OpenAI key before conversion or image generation:

```bash
export OPENAI_API_KEY="your_openai_key"
```

## Defaults

- Text rendering model: `gpt-5.5`
- Image generation model: `gpt-image-2`
- Runtime: Node.js 20+
- No hosted md2wechat conversion service is used.

## CLI Usage

```bash
md2wechat inspect article.md --json
md2wechat themes list --json
md2wechat convert article.md --theme default --output article.html --json
md2wechat preview article.md --theme default --output preview.html --json
md2wechat generate-image "Editorial cover for an AI article" --output cover.png --json
```

Theme management:

```bash
md2wechat themes register custom ./themes/custom.json --json
md2wechat themes remove custom --json
```

## MCP Usage

Start the stdio MCP server:

```bash
md2wechat mcp
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "md2wechat": {
      "command": "md2wechat",
      "args": ["mcp"],
      "env": {
        "OPENAI_API_KEY": "your_openai_key"
      }
    }
  }
}
```

Available tools:

- `convert_article`
- `preview_article`
- `generate_image`
- `list_themes`
- `register_theme`
- `remove_theme`

## Configuration

- `OPENAI_API_KEY`: required for conversion and image generation
- `OPENAI_BASE_URL`: optional OpenAI-compatible base URL
- `OPENAI_TEXT_MODEL`: optional override, defaults to `gpt-5.5`
- `OPENAI_IMAGE_MODEL`: optional override, defaults to `gpt-image-2`
- `MD2WECHAT_THEME_REGISTRY`: optional custom theme registry file
- `MD2WECHAT_THEMES_DIR`: optional custom theme directory

## Theme File Format

Custom themes are JSON files:

```json
{
  "id": "custom",
  "name": "Custom",
  "description": "Optional description",
  "prompt": "Style guidance for the renderer."
}
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run verify
```

Generated build output lives in `dist/` and is packaged for npm, but not committed to git.
