import assert from "node:assert/strict";
import test from "node:test";
import { handleToolCall, listToolSchemas } from "../src/mcp/tools.js";

test("MCP tool list exposes required tools and no API mode tool", () => {
  const tools = listToolSchemas();
  const names = tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, [
    "convert_article",
    "generate_image",
    "list_themes",
    "preview_article",
    "register_theme",
    "remove_theme"
  ]);
  assert.equal(names.some((name) => name.includes("api")), false);
});

test("MCP list_themes handler returns text content", async () => {
  const result = await handleToolCall("list_themes", {});
  assert.equal(Array.isArray(result.content), true);
  assert.equal(result.content[0].type, "text");
  assert.match(result.content[0].text, /default/);
});
