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

// Task/explanation/AI content is authored with MathJax delimiters (\(…\), \[…\]).
// KaTeX only understands $…$ (inline) and $$…$$ (block on its own line), so normalize first.
export function normalizeMathDelims(text) {
  if (!text) return "";
  return (
    text
      // Superscript/subscript applied directly to \textcolor{…}{…} without braces
      // (e.g. "b^\textcolor{blue}{x}") is valid in MathJax but KaTeX rejects it
      // ("function … as superscript"). Wrap it: ^\textcolor{c}{v} -> ^{\textcolor{c}{v}}.
      .replace(
        /([_^])\\textcolor(\{(?:[^{}]|\{[^{}]*\})*\})(\{(?:[^{}]|\{[^{}]*\})*\})/g,
        (_, op, color, val) => `${op}{\\textcolor${color}${val}}`,
      )
      // \[…\] -> $$…$$. Guard (^|[^\\]) so the opener only fires when the backslash isn't itself
      // escaped — otherwise a LaTeX row-spacing line break "\\[6pt]" (which contains "\[") is
      // misread as a display opener, hijacking pairing and corrupting the rest of the content.
      .replace(
        /(^|[^\\])\\\[\s*([\s\S]+?)\s*\\\]/g,
        (_, pre, m) => `${pre}$$${m}$$`,
      )
      // Drop empty display blocks (e.g. authored "$$$$" spacers) anywhere — they desync $$ pairing
      // and cascade the rest into raw text. Only inline spaces/tabs may sit between the two $$ (no
      // newline), so genuine adjacent blocks on separate lines ($$a$$\n$$b$$) are left intact.
      .replace(/\$\$[ \t]*\$\$/g, "\n\n")
      // Trim inside $$…$$ and force every block onto its own line. Runs BEFORE the bare-environment
      // wrap below so a block authored with the delimiters on their own line ($$\n\begin{array}…)
      // gets its $$ pulled tight against \begin — otherwise the newline between them defeats that
      // step's [^$] guard and the already-delimited environment is wrapped a second time ($$$$…).
      // Also stays BEFORE the inline conversion so an adjacent \(…\) can't merge into "$$$".
      .replace(/\$\$\s*([\s\S]+?)\s*\$\$/g, (_, m) => `\n\n$$${m}$$\n\n`)
      // Bare LaTeX environments (authored without $$…$$) -> wrap in $$…$$ so KaTeX renders them.
      // Guard (^|[^$]) skips environments already immediately after $ / $$ (no double-wrap).
      .replace(
        /(^|[^$])(\\begin\{(aligned|align\*?|alignat\*?|gathered|gather\*?|cases|split|array|[bBpvV]?matrix|smallmatrix)\}[\s\S]*?\\end\{\3\})/g,
        (_, pre, env) => `${pre}\n\n$$${env}$$\n\n`,
      )
      .replace(/\\\(\s*([\s\S]+?)\s*\\\)/g, (_, m) => `$${m}$`) // \(…\) -> $…$ (inline, last)
  );
}

export function renderMd(text) {
  return text ? md.render(normalizeMathDelims(text)) : "";
}

export function renderMdInline(text) {
  return text ? md.renderInline(normalizeMathDelims(text)) : "";
}
