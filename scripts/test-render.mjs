#!/usr/bin/env node
// Render test harness.
//
// Paste ANY task explanation / AI content (raw, with backslashes intact) into
//   scripts/render-input.txt
// then run:
//   node scripts/test-render.mjs           # summary (errors + unrendered markers)
//   node scripts/test-render.mjs --debug   # also print the normalized string + full HTML
//   node scripts/test-render.mjs somefile  # read a different input file
//
// It runs the text through the SAME renderer the app uses (src/lib/utils/markdownCore.js),
// so what it reports is exactly what the app produces. Exit code is non-zero when a KaTeX
// error or unrendered math marker is found.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { renderMd, normalizeMathDelims } from "../src/lib/utils/markdownCore.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const debug = args.includes("--debug");
const fileArg = args.find((a) => !a.startsWith("--"));
const inputPath = fileArg ? resolve(process.cwd(), fileArg) : resolve(here, "render-input.txt");

let text;
try {
  text = readFileSync(inputPath, "utf8");
} catch {
  console.error(`Cannot read input file: ${inputPath}`);
  process.exit(2);
}

const normalized = normalizeMathDelims(text);
const html = renderMd(text);

// KaTeX errors surface as <span class="katex-error" ... title="...">
const errors = [...html.matchAll(/<span class="katex-error"[^>]*title="([^"]*)"/g)].map(
  (m) => m[1],
);

// Real unrendered math = raw TeX markers left OUTSIDE the KaTeX MathML annotation
// (the annotation legitimately contains the source TeX, so strip it before scanning).
const withoutAnnotations = html.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, "");
const rawMarkers = [
  ...withoutAnnotations.matchAll(/\\begin\{|\\lim|\\frac|\\cancel|\\sqrt|\\text|\$\$/g),
].map((m) => m[0]);

const katexOk = (html.match(/class="katex(?!-error)/g) || []).length;

console.log(`input:            ${inputPath}`);
console.log(`katex rendered:   ${katexOk}`);
console.log(`katex errors:     ${errors.length}`);
console.log(`unrendered marks: ${rawMarkers.length}`);

if (errors.length) {
  console.log("\n--- KaTeX errors ---");
  for (const e of errors) console.log("  •", e.replace(/&#x27;/g, "'").split("\n")[0].slice(0, 200));
}

if (rawMarkers.length) {
  console.log("\n--- context around unrendered markers ---");
  const seen = new Set();
  for (const m of withoutAnnotations.matchAll(
    /<(p|li|h\d)>([\s\S]*?)<\/\1>/g,
  )) {
    const inner = m[2];
    if (/\\begin\{|\\lim|\\frac|\\cancel|\\sqrt|\\text|\$\$/.test(inner)) {
      const snippet = inner.replace(/\s+/g, " ").trim().slice(0, 160);
      if (!seen.has(snippet)) {
        seen.add(snippet);
        console.log(`  <${m[1]}>`, snippet);
      }
    }
  }
}

if (debug) {
  console.log("\n--- normalized input ---\n" + normalized);
  console.log("\n--- html ---\n" + html);
}

const clean = errors.length === 0 && rawMarkers.length === 0;
console.log(`\n${clean ? "✓ renders clean" : "✗ problems found"}`);
process.exit(clean ? 0 : 1);
