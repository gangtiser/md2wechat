import type { ThemeDefinition } from "./registry.js";

export const builtinThemes: ThemeDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean WeChat article typography with balanced spacing.",
    prompt: "Use clean, readable WeChat Official Account typography with inline styles, moderate spacing, and restrained accent color."
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-like headings and strong pull quotes.",
    prompt: "Use editorial magazine pacing, strong headings, pull quotes, and inline styles compatible with WeChat."
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet typography for concise technical writing.",
    prompt: "Use minimal inline styles, high readability, compact headings, and no decorative clutter."
  }
];
