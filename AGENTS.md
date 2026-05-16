# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript/Node.js project for a local md2wechat CLI, MCP server, and Codex Skill. Source lives in `src/`:

- `src/core/`: shared parsing, envelopes, errors, I/O, and HTML safety helpers.
- `src/config/`, `src/themes/`: runtime config and theme registry.
- `src/openai/`, `src/renderer/`, `src/images/`: OpenAI client, article rendering, and image generation.
- `src/cli/`: `md2wechat` command entrypoint.
- `src/mcp/`: MCP tool schemas, handlers, and stdio server.
- `skills/md2wechat/`: agent-facing Skill instructions.
- `test/`: Node test runner suites. `dist/` is generated build output.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run build`: compile TypeScript into `dist/`.
- `npm test`: build, then run all compiled tests under `dist/test/**/*.test.js`.
- `npm run verify:api-removal`: guard against reintroducing the removed hosted conversion service strings.
- `npm run verify`: run typecheck, full tests, and API-removal guard.

For local smoke checks, use `node dist/src/cli/index.js themes list --json` or `node dist/src/cli/index.js inspect README.md --json`.

## Coding Style & Naming Conventions

Use strict TypeScript ESM with explicit `.js` import suffixes in source imports. Keep modules focused and shared logic outside CLI/MCP boundaries. Prefer named exports and descriptive names such as `parseArticle`, `renderArticle`, `listThemes`, and `successEnvelope`. Use two-space indentation and avoid unrelated refactors.

## Testing Guidelines

Tests use Node’s built-in `node:test` with `node:assert/strict`. Name files `test/*.test.ts`. Add tests before implementation for behavior changes. Mock OpenAI through local HTTP servers; these tests may require permission to bind localhost in sandboxed environments.

## Commit & Pull Request Guidelines

Follow the existing concise conventional style: `feat: ...`, `docs: ...`, `chore: ...`. Keep commits scoped to one subsystem when possible. Pull requests should include a short summary, verification commands run, and notes for any environment limitation. Link issues when available.

## Security & Configuration Tips

Do not commit secrets. `OPENAI_API_KEY` is required for conversion and image generation. Defaults are `gpt-5.5` for text and `gpt-image-2` for images. Do not reintroduce hosted conversion service mode or old hosted-service environment variables.
