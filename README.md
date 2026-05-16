# md2wechat

TypeScript rebuild of md2wechat for local CLI, Codex Skill, and MCP use.

## Defaults

- Text rendering model: `gpt-5.5`
- Image generation model: `gpt-image-2`
- Hosted md2wechat conversion service: not supported
- Runtime: Node.js 20+

## Commands

- `md2wechat inspect <file>`
- `md2wechat convert <file> --theme default --output article.html`
- `md2wechat preview <file> --output preview.html`
- `md2wechat generate-image "prompt" --output cover.png`
- `md2wechat themes list`
- `md2wechat themes register <name> <path>`
- `md2wechat themes remove <name>`
- `md2wechat mcp`

## Configuration

- `OPENAI_API_KEY`: required for conversion and image generation
- `OPENAI_BASE_URL`: optional OpenAI-compatible base URL
- `OPENAI_TEXT_MODEL`: optional override, defaults to `gpt-5.5`
- `OPENAI_IMAGE_MODEL`: optional override, defaults to `gpt-image-2`
- `MD2WECHAT_THEME_REGISTRY`: optional custom theme registry file
- `MD2WECHAT_THEMES_DIR`: optional custom theme directory

## MCP Tools

- `convert_article`
- `preview_article`
- `generate_image`
- `list_themes`
- `register_theme`
- `remove_theme`

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
