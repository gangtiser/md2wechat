# md2wechat

`md2wechat` is a TypeScript CLI, Codex Skill, and MCP server for turning Markdown into WeChat Official Account HTML. It runs locally, uses deterministic conversion, and lets Codex or Claude handle any AI writing before calling the tool.

## Install

```bash
npm install -g @gangtiser/md2wechat
```

Node.js 20 or newer is required. Initialize customer configuration before using WeChat account features:

```bash
md2wechat config init
```

Open the generated config file and fill in:

```json
{
  "WECHAT_APP_ID": "your_app_id",
  "WECHAT_APP_SECRET": "your_app_secret"
}
```

Environment variables can override the file:

```bash
export WECHAT_APP_ID="your_app_id"
export WECHAT_APP_SECRET="your_app_secret"
```

## Defaults & Agent Usage

- Runtime: Node.js 20+
- Markdown conversion: local deterministic renderer
- AI authoring/editing: use the host agent, such as Codex or Claude CLI
- No hosted md2wechat conversion service is used.

## CLI Usage

```bash
md2wechat inspect article.md --json
md2wechat config init --json
md2wechat config status --json
md2wechat themes list --json
md2wechat convert article.md --theme default --output article.html --json
md2wechat preview article.md --theme default --output preview.html --json
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
        "WECHAT_APP_ID": "your_app_id",
        "WECHAT_APP_SECRET": "your_app_secret"
      }
    }
  }
}
```

Available tools:

- `convert_article`
- `preview_article`
- `list_themes`
- `register_theme`
- `remove_theme`

## Configuration

- `WECHAT_APP_ID`: optional environment override for the configured WeChat AppID
- `WECHAT_APP_SECRET`: optional environment override for the configured WeChat AppSecret
- `MD2WECHAT_CONFIG`: optional path to the JSON config file
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
