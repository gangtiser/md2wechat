# md2wechat

TypeScript rebuild of md2wechat for local CLI, Codex Skill, and MCP use.

## Defaults

- Text rendering model: `gpt-5.5`
- Image generation model: `gpt-image-2`
- Hosted md2wechat conversion service: not supported

## Commands

- `md2wechat inspect <file>`
- `md2wechat convert <file> --theme default --output article.html`
- `md2wechat preview <file> --output preview.html`
- `md2wechat generate-image "prompt" --output cover.png`
- `md2wechat themes list`
- `md2wechat themes register <name> <path>`
- `md2wechat themes remove <name>`
- `md2wechat mcp`
