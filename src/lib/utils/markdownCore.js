import MarkdownIt from "markdown-it";
import katex from "@traptitech/markdown-it-katex";
import { renderSketch } from "../sketch/taskSketch.js";

// Node-safe rendering core (no CSS side-effect) so it can be imported by the
// CLI test harness (scripts/test-render.mjs). markdownRenderer.js re-exports
// this and additionally imports the KaTeX stylesheet for the app.

export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(katex, { throwOnError: false, strict: false });

// Skica u objašnjenju: blok ```skica s JSON opisom crta se na tom mjestu, istim kodom kao skica uz zadatak
// (backend ga je provjerio istim kodom pri spremanju; neispravan opis ne prikazuje ništa). Brojevi s oznaka
// provjeravaju se prema tekstu bez blokova skica (env.sketchText), kao na backendu.
const SKETCH_BLOCK = /```skica[ \t]*\r?\n[\s\S]*?```/g;
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.info.trim() !== "skica")
    return defaultFence(tokens, idx, options, env, self);
  try {
    const { svg } = renderSketch(
      JSON.parse(token.content),
      env?.sketchText ?? "",
    );
    return svg
      ? `<figure class="task-sketch in-explanation">${svg}</figure>\n`
      : "";
  } catch {
    return "";
  }
};

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
  return text
    ? md.render(normalizeMathDelims(text), {
        sketchText: text.replace(SKETCH_BLOCK, ""),
      })
    : "";
}

// AI chat: same rendering, but raw HTML is shown as text. Task content needs its
// HTML; chat text doesn't, and there "x<3 i y>2" was read as a <3 i y> tag and
// vanished — as would anything a model could be talked into writing.
const chatMd = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
}).use(katex, { throwOnError: false, strict: false });

export function renderChatMd(text) {
  return text ? chatMd.render(normalizeMathDelims(text)) : "";
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
