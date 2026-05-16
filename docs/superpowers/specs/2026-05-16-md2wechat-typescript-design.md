# md2wechat TypeScript Rebuild Design

Date: 2026-05-16
Status: Approved direction, ready for implementation planning after review

## Objective

Build a TypeScript/Node.js remake of `~/Documents/git/md2wechat-skill` in `/Users/martin/Documents/codex_workspace/md2wechat`.

The remake must keep the useful product shape of the original project while removing the hosted md2wechat API mode. The new implementation will support CLI, Skill, and MCP entry points over one shared local core. It will use OpenAI `gpt-5.5` for article rendering and OpenAI `gpt-image-2` for image generation.

## Source Analysis Summary

The original `md2wechat-skill` project is a Go CLI and agent skill package. Its strongest parts are the command surface, JSON envelope discipline, inspect/preview confirmation layer, prompt catalogs, image generation commands, and WeChat draft publishing flow. Its biggest mismatch with this rebuild is that conversion defaults to API mode and many docs, tests, config fields, and theme definitions assume `md2wechat.cn/api/convert`.

The reference `~/Documents/git/wenyan-mcp` project is a TypeScript MCP server. Its theme management pattern is intentionally small: expose `list_themes`, `register_theme`, and `remove_theme` tools, and delegate actual theme registry behavior to a wrapper layer. This rebuild will adopt that shape but implement the registry locally.

Official OpenAI developer docs were checked on 2026-05-16:

- `gpt-5.5` is the current model target for complex coding and tool-heavy workflows.
- `gpt-image-2` is the GPT Image 2 model ID for the Image API.
- The Image API generation endpoint is appropriate for single-prompt image generation.

## Deliverables

1. A TypeScript package with Node.js CLI binary.
2. A shared core library used by all entry points.
3. CLI commands for conversion, preview, inspection, image generation, and theme management.
4. MCP stdio server exposing equivalent article, image, and theme tools.
5. A Codex-compatible Skill under `skills/md2wechat/SKILL.md`.
6. Built-in themes and a persistent custom theme registry.
7. Tests proving API mode has been removed and core CLI/MCP/theme behavior works.
8. Git history using design, plan, and implementation commits.
9. Worktree and multi-agent implementation workflow after the implementation plan is accepted.

## Non-Goals

The rebuild will not include:

- `--mode api`
- `MD2WECHAT_API_KEY`
- `MD2WECHAT_BASE_URL`
- Calls to `https://www.md2wechat.cn/api/convert`
- A standalone HTTP API server mode
- API-only theme categories
- API-only advanced layout marketing claims
- Go source code as the primary implementation

The project may still call OpenAI and WeChat APIs where those are part of the requested local workflow. The removed API mode refers specifically to the original md2wechat hosted conversion service.

## Architecture

The project will use TypeScript with ESM modules.

Proposed module layout:

- `src/core`: article parsing, frontmatter, metadata resolution, image reference extraction, result envelopes, error classes, and HTML helpers.
- `src/renderer`: Markdown-to-WeChat rendering through OpenAI Responses API with `gpt-5.5`.
- `src/images`: OpenAI Image API generation with `gpt-image-2`, base64 decoding, output file writing, and image result metadata.
- `src/themes`: built-in theme definitions, custom theme registry, deterministic loading, validation, list/register/remove operations.
- `src/cli`: command definitions and CLI-specific I/O.
- `src/mcp`: MCP stdio server and tool schemas.
- `src/config`: environment and config-file loading for OpenAI, WeChat, output, and theme paths.
- `src/preview`: preview HTML wrapper around rendered article HTML.
- `src/inspect`: read-only article readiness inspection.
- `skills/md2wechat`: Skill package and agent instructions.
- `test`: deterministic unit and contract tests with mocked OpenAI clients.

Shared core modules must not import CLI or MCP code. CLI and MCP can import core, renderer, images, themes, inspect, and preview modules.

## Data Flow

### Convert

1. CLI or MCP accepts Markdown content or a Markdown file path.
2. `core` parses frontmatter, title, author, digest, and image references.
3. `themes` resolves the requested theme from built-in and custom registries.
4. `renderer` builds a stable prompt for `gpt-5.5`.
5. OpenAI returns WeChat-compatible inline-style HTML.
6. `core` validates that the output does not contain scripts, style tags, or external CSS.
7. The caller receives a stable result envelope with HTML, metadata, theme, image references, and output path if saved.

### Preview

1. The preview command reuses the conversion path when HTML is not already available.
2. `preview` wraps the article HTML in a local browser-safe HTML document.
3. Preview writes a file by default rather than dumping large HTML to stdout.

### Image Generation

1. CLI or MCP accepts prompt, optional article context, size, quality, and output path.
2. `images` calls OpenAI Image API with model `gpt-image-2`.
3. The returned `b64_json` is decoded and written to disk.
4. The result envelope includes file path, model, size, quality, and revised prompt when available.

### Theme Registry

Loading order:

1. Built-in themes bundled with the package.
2. User registry under `~/.config/md2wechat/themes/registry.json`.
3. User theme directory under `~/.config/md2wechat/themes`.
4. Project theme directory under `./themes`.
5. Explicitly registered theme paths.

Later entries override earlier entries by theme ID. `list` must show whether a theme is built-in or custom and where it came from. `register` must validate the theme before persistence. `remove` must refuse to remove built-in themes.

## CLI Contract

The CLI binary will be `md2wechat`.

Required commands:

- `md2wechat inspect <file> [--json]`
- `md2wechat convert <file> [--theme <id>] [--output <file>] [--json]`
- `md2wechat preview <file> [--theme <id>] [--output <file>] [--json]`
- `md2wechat generate-image [prompt] [--article <file>] [--output <file>] [--size <size>] [--quality <quality>] [--json]`
- `md2wechat themes list [--json]`
- `md2wechat themes register <name> <path> [--json]`
- `md2wechat themes remove <name> [--json]`
- `md2wechat mcp`

Every `--json` command must return one JSON object with:

- `success`
- `code`
- `message`
- `schema_version`
- `status`
- `retryable`
- `data`
- `error`

No command may expose or accept an API conversion mode.

## MCP Contract

The MCP server will run over stdio via `md2wechat mcp`.

Required tools:

- `convert_article`: input from `content`, `file`, or `content_url`; returns HTML or saved output path.
- `preview_article`: input from `content`, `file`, or `content_url`; returns preview file path and metadata.
- `generate_image`: prompt or article-derived prompt; returns generated file path.
- `list_themes`: returns built-in and custom themes.
- `register_theme`: registers a custom theme from a file path.
- `remove_theme`: removes a custom theme.

The MCP server must log diagnostics to stderr only. stdout is reserved for JSON-RPC.

## Skill Contract

The Skill will instruct Codex and compatible agents to:

- Prefer `md2wechat inspect` before conversion.
- Use `md2wechat convert` for final HTML.
- Use `md2wechat preview` for local confirmation.
- Use `md2wechat generate-image` for cover and infographic generation.
- Use `themes list/register/remove` before assuming a theme exists.
- Treat `gpt-5.5` and `gpt-image-2` as product defaults.
- Avoid any API mode instructions.

## Configuration

Environment variables:

- `OPENAI_API_KEY`: required for rendering and image generation.
- `OPENAI_BASE_URL`: optional OpenAI-compatible endpoint base.
- `OPENAI_TEXT_MODEL`: optional override, default `gpt-5.5`.
- `OPENAI_IMAGE_MODEL`: optional override, default `gpt-image-2`.
- `MD2WECHAT_CONFIG`: optional config file path.
- `MD2WECHAT_THEME_REGISTRY`: optional custom registry path.
- `MD2WECHAT_THEMES_DIR`: optional extra theme directory.
- `WECHAT_APPID`: optional, only needed for future draft publishing work.
- `WECHAT_SECRET`: optional, only needed for future draft publishing work.

The initial implementation will not require WeChat credentials for convert, preview, inspect, image generation, or theme management.

## Stability And Performance

The implementation will improve stability and performance over the original project by:

- Sharing parsing, metadata, theme, and envelope code across CLI and MCP.
- Keeping network clients injectable for deterministic tests.
- Using timeouts and explicit retryable error classification for OpenAI calls.
- Avoiding large stdout payloads unless `--json` is explicitly requested.
- Preferring file paths over inline MCP content for large Markdown inputs.
- Validating theme files at registration time.
- Sanitizing rendered HTML before saving or returning it.
- Keeping API conversion mode out of code, docs, tests, and config.

## Testing Strategy

Required local tests:

- Theme registry list/register/remove behavior.
- Built-in themes cannot be removed.
- Invalid theme files are rejected.
- CLI JSON envelope contract.
- CLI rejects unknown `--mode` and has no `api` mode.
- Renderer prompt uses `gpt-5.5` by default.
- Image generator uses `gpt-image-2` by default.
- MCP tool list includes required tools and excludes API-mode tools.
- MCP handlers call shared core modules rather than duplicate conversion logic.
- HTML sanitizer removes unsafe tags and style blocks.

Required verification gates:

- `npm run typecheck`
- `npm test`
- `npm run build`
- API-removal grep checks for `md2wechat.cn`, `MD2WECHAT_API_KEY`, `MD2WECHAT_BASE_URL`, and `--mode api`.

## Implementation Workflow

After this design spec is reviewed:

1. Write an implementation plan with bite-sized tasks.
2. Set up an isolated git worktree, with `.worktrees/` ignored.
3. Use multi-agent parallel implementation with disjoint ownership:
   - core/config/themes
   - OpenAI renderer/images
   - CLI
   - MCP
   - Skill/docs/tests
4. Integrate branches carefully and run full verification.
5. Perform a completion audit against the original objective before marking the goal complete.

## Acceptance Criteria

The project is complete only when:

- A TypeScript package exists and builds.
- CLI commands run locally.
- MCP server starts and lists the required tools.
- Skill instructions exist and reference the implemented commands.
- Theme registration follows the approved local registry design.
- Text rendering defaults to `gpt-5.5`.
- Image generation defaults to `gpt-image-2`.
- No md2wechat hosted API conversion mode remains.
- Tests and verification gates pass, or any unavoidable environment limitation is documented with concrete evidence.
- The final audit maps every user requirement to actual files, command output, and test evidence.

## Spec Self-Review

- Placeholder scan: no unresolved placeholders remain.
- Consistency check: CLI, MCP, Skill, theme registry, and OpenAI model choices all use the same shared-core design.
- Scope check: the project is large but decomposes into independent worktree/agent tasks after planning.
- Ambiguity check: "API mode" is explicitly defined as the removed hosted md2wechat conversion service, not OpenAI or WeChat API usage.
