import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function files(root: string): Promise<string[]> {
  const entries = await readdir(root);
  const result: string[] = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", ".worktrees", "AGENTS.md"].includes(entry)) {
      continue;
    }
    const full = path.join(root, entry);
    if (full.startsWith(`docs${path.sep}superpowers`)) {
      continue;
    }
    const info = await stat(full);
    if (info.isDirectory()) {
      result.push(...await files(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

test("Skill file exists for Codex usage", async () => {
  const skill = await readFile("skills/md2wechat/SKILL.md", "utf8");
  assert.match(skill, /Codex|Claude/);
  assert.match(skill, /WECHAT_APP_ID/);
});

test("hosted conversion service and direct model configuration strings are absent from product files", async () => {
  const banned = [
    "md2wechat.cn" + "/api/convert",
    "MD2WECHAT_" + "API_KEY",
    "MD2WECHAT_" + "BASE_URL",
    "--mode " + "api",
    "OPENAI_" + "API_KEY",
    "OPENAI_" + "BASE_URL",
    "OPENAI_" + "TEXT_MODEL",
    "OPENAI_" + "IMAGE_MODEL",
    "gpt-" + "5.5",
    "gpt-image" + "-2"
  ];
  const offenders: string[] = [];
  for (const file of await files(".")) {
    const text = await readFile(file, "utf8");
    for (const phrase of banned) {
      if (text.includes(phrase)) {
        offenders.push(`${file}: ${phrase}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
