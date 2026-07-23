import MarkdownIt from "markdown-it";
import katex from "@traptitech/markdown-it-katex";

// Node-safe rendering core (no CSS side-effect) so it can be imported by the
// CLI test harness (scripts/test-render.mjs). markdownRenderer.js re-exports
// this and additionally imports the KaTeX stylesheet for the app.

export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(katex, { throwOnError: false, strict: false });

// KaTeX renderer for newer tasks (id > 335), pinned to the behaviour at commit 27271fc — the
// version those tasks were authored against. Task/explanation/AI content is authored with MathJax
// delimiters (\(…\), \[…\]); KaTeX only understands $…$ / $$…$$, so normalize first. Deliberately
// just these three conversions (no bare-env wrapping or hardening added later, which changed the
// rendering and broke the newer tasks).
export function normalizeMathDelims(text) {
  if (!text) return "";
  return text
    .replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, (_, m) => `$$${m}$$`) // \[…\] -> $$…$$
    .replace(/\\\(\s*([\s\S]+?)\s*\\\)/g, (_, m) => `$${m}$`) // \(…\) -> $…$
    .replace(/\$\$\s*([\s\S]+?)\s*\$\$/g, (_, m) => `\n\n$$${m}$$\n\n`); // force every $$…$$ to block
}

export function renderMd(text) {
  return text ? md.render(normalizeMathDelims(text)) : "";
}

export function renderMdInline(text) {
  return text ? md.renderInline(normalizeMathDelims(text)) : "";
}

// ── Per-task renderer split ────────────────────────────────────────────────
// Tasks up to this id were hand-written in MathJax syntax and rendered by browser MathJax before
// the KaTeX migration. They keep that exact path; newer tasks use the KaTeX renderer above.
export const MATHJAX_MAX_ID = 335;

export function usesMathJax(id) {
  return typeof id === "number" && id <= MATHJAX_MAX_ID;
}

// Pre-migration renderer: plain markdown-it (no KaTeX). Every backslash is doubled first so that
// markdown-it's own backslash-escaping collapses "\\(" back to "\(" — otherwise it would strip the
// backslash from "\(x\)" → "(x)" and MathJax wouldn't recognize the delimiter. This leaves \(…\),
// \[…\], \\[6pt] and $$…$$ intact for browser MathJax (whose defaults typeset exactly those). This
// is byte-for-byte the renderer that shipped before the KaTeX migration.
const mdMathJax = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export function renderMdMathJax(text) {
  return text ? mdMathJax.render(text.replace(/\\/g, "\\\\")) : "";
}

// Render a task's text/explanation with the engine chosen by its id.
export function renderTaskHtml(text, id) {
  return usesMathJax(id) ? renderMdMathJax(text) : renderMd(text ?? "");
}
