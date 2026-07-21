import MarkdownIt from "markdown-it";
import katex from "@traptitech/markdown-it-katex";
import "katex/dist/katex.min.css";

export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(katex, { throwOnError: false, strict: false });

// Task/explanation/AI content is authored with MathJax delimiters (\(…\), \[…\]).
// KaTeX only understands $…$ (inline) and $$…$$ (block on its own line), so normalize first.
export function normalizeMathDelims(text) {
  if (!text) return "";
  return text
    .replace(/\\\[\s*([\s\S]+?)\s*\\\]/g, (_, m) => `$$${m}$$`) // \[…\] -> $$…$$
    .replace(/\\\(\s*([\s\S]+?)\s*\\\)/g, (_, m) => `$${m}$`) // \(…\) -> $…$
    // Bare LaTeX environments (authored without $$…$$) -> wrap in $$…$$ so KaTeX renders them.
    // Guard (^|[^$]) skips environments already immediately after $ / $$ (no double-wrap).
    .replace(
      /(^|[^$])(\\begin\{(aligned|align\*?|alignat\*?|gathered|gather\*?|cases|split|array|[bBpvV]?matrix|smallmatrix)\}[\s\S]*?\\end\{\3\})/g,
      (_, pre, env) => `${pre}\n\n$$${env}$$\n\n`,
    )
    .replace(/\$\$\s*([\s\S]+?)\s*\$\$/g, (_, m) => `\n\n$$${m}$$\n\n`); // force every $$…$$ to block
}

export function renderMd(text) {
  return text ? md.render(normalizeMathDelims(text)) : "";
}

export function renderMdInline(text) {
  return text ? md.renderInline(normalizeMathDelims(text)) : "";
}
