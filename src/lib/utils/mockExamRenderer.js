import MarkdownIt from "markdown-it";
import katex from "@traptitech/markdown-it-katex";
import "katex/dist/katex.min.css";

const md = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: true,
}).use(katex, { throwOnError: false, strict: false });

export function renderMath(text) {
  return text ? md.render(text) : "";
}

export function renderMathInline(text) {
  return text ? md.renderInline(text) : "";
}
