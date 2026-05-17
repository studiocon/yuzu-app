#!/usr/bin/env node
// Pushes DESIGN.md frontmatter into public/design-preview.html.
// - rewrites the :root { ... } block to match `cssVars:` in DESIGN.md frontmatter
// - rewrites text between <!-- SYNC:TAGLINE --> ... <!-- /SYNC:TAGLINE --> markers
//   with `{tagline} / {tagline_ja}` from frontmatter
//
// Run: `npm run design:sync`. Re-run after editing DESIGN.md.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN_PATH = resolve(ROOT, "DESIGN.md");
const PREVIEW_PATH = resolve(ROOT, "public/design-preview.html");

function fail(msg) {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
  process.exit(1);
}

function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/m);
  if (!match) fail("DESIGN.md: YAML frontmatter not found");
  return match[1];
}

function parseCssVars(fm) {
  const block = fm.match(/cssVars:[ \t]*\n((?:[ \t]+[^\n]*\n?|[ \t]*\n)*)/);
  if (!block) fail("DESIGN.md frontmatter: `cssVars:` block not found");
  const tokens = new Map();
  const lineRe = /^\s+(--[a-z0-9-]+)\s*:\s*(?:"([^"]*)"|'([^']*)'|([^\s#][^\n#]*?))\s*(?:#.*)?$/gm;
  let m;
  while ((m = lineRe.exec(block[1])) !== null) {
    tokens.set(m[1], (m[2] ?? m[3] ?? m[4] ?? "").trim());
  }
  if (tokens.size === 0) fail("cssVars: parsed but empty");
  return tokens;
}

function parseScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n]+?))\\s*$`, "m"));
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

const md = readFileSync(DESIGN_PATH, "utf8");
const fm = parseFrontmatter(md);
const cssVars = parseCssVars(fm);
const tagline = parseScalar(fm, "tagline") ?? "";
const taglineJa = parseScalar(fm, "tagline_ja") ?? "";

let html = readFileSync(PREVIEW_PATH, "utf8");
const before = html;

// 1) Rewrite individual --token values inside the preview's :root.
//    We only touch lines that already exist in the preview — new tokens are
//    flagged so a human can decide where to place them visually.
const rootMatch = html.match(/:root\s*\{([\s\S]*?)\}/);
if (!rootMatch) fail("design-preview.html: :root block not found");

const existingPreviewTokens = new Set();
let newRootBody = rootMatch[1];
const existingTokenRe = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
let tm;
while ((tm = existingTokenRe.exec(rootMatch[1])) !== null) {
  existingPreviewTokens.add(tm[1]);
}

for (const [name, value] of cssVars) {
  if (!existingPreviewTokens.has(name)) continue;
  const re = new RegExp(`(${name.replace(/-/g, "\\-")}\\s*:\\s*)([^;]+)(;)`);
  newRootBody = newRootBody.replace(re, `$1${value}$3`);
}

html = html.replace(rootMatch[0], `:root {${newRootBody}}`);

const missingInPreview = [...cssVars.keys()].filter((k) => !existingPreviewTokens.has(k));
const undocumentedInPreview = [...existingPreviewTokens].filter((k) => !cssVars.has(k));

// 2) Rewrite tagline markers.
const taglineText = [tagline, taglineJa].filter(Boolean).join(" / ");
const taglineRe = /<!--\s*SYNC:TAGLINE\s*-->([\s\S]*?)<!--\s*\/SYNC:TAGLINE\s*-->/g;
let taglineHits = 0;
html = html.replace(taglineRe, () => {
  taglineHits++;
  return `<!-- SYNC:TAGLINE -->${taglineText}<!-- /SYNC:TAGLINE -->`;
});

if (html === before) {
  console.log(`\x1b[32m✓ design-preview.html already in sync\x1b[0m`);
} else {
  writeFileSync(PREVIEW_PATH, html);
  console.log(`\x1b[32m✓ design-preview.html updated\x1b[0m`);
}
console.log(`  tokens synced: ${cssVars.size - missingInPreview.length}/${cssVars.size}`);
console.log(`  tagline replacements: ${taglineHits}  →  "${taglineText}"`);

if (missingInPreview.length) {
  console.warn(`\x1b[33m⚠ in DESIGN.md but not present in preview :root (add by hand):\x1b[0m`);
  for (const n of missingInPreview) console.warn(`    ${n}`);
}
if (undocumentedInPreview.length) {
  console.warn(`\x1b[33m⚠ in preview :root but not in DESIGN.md frontmatter:\x1b[0m`);
  for (const n of undocumentedInPreview) console.warn(`    ${n}`);
}
