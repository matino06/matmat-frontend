// Turn a DOM Range inside rendered task content into text the AI can actually read.
//
// `range.toString()` is useless here: KaTeX renders every formula twice (a hidden
// <span class="katex-mathml"> holding MathML plus the visible .katex-html), so a
// selection over math comes out duplicated and garbled. MathJax renders into
// <mjx-container> custom elements whose text is glyph runs, not the source TeX.
//
// So we walk the range ourselves and swap each math container for its original
// LaTeX, emitted with the \(…\) / \[…\] delimiters the AI prompt already asks for.

const BLOCK_TAGS = new Set([
  "P", "DIV", "LI", "UL", "OL", "TABLE", "TR", "BLOCKQUOTE", "PRE",
  "H1", "H2", "H3", "H4", "H5", "H6",
]);

// Subtrees that would duplicate content we already emit from the math container.
const SKIP_SELECTOR = "mjx-assistive-mml, .katex-mathml, script, style";

const MATH_SELECTOR = ".katex, mjx-container";

const MAX_LENGTH = 4000;

// MathJax v3 keeps every typeset formula in its document's math list, where each
// item pairs the source TeX (.math) with the DOM node it produced (.typesetRoot).
// That is the only reliable way back from an <mjx-container> to its LaTeX.
function buildMathJaxMap() {
  const map = new Map();
  try {
    const list = window.MathJax?.startup?.document?.math;
    if (!list) return map;
    for (const item of list) {
      if (item?.typesetRoot && typeof item.math === "string") {
        map.set(item.typesetRoot, item.math);
      }
    }
  } catch {
    // MathJax not loaded, or an internals change — fall back to textContent.
  }
  return map;
}

function elementOf(node) {
  return node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement ?? null;
}

function mathAncestor(node) {
  return elementOf(node)?.closest?.(MATH_SELECTOR) ?? null;
}

// A selection that starts or ends in the middle of a formula would leave us with a
// partial math container we can't recover the source from. Grow the range so every
// formula it touches is fully inside it.
function expandToWholeMath(range) {
  const r = range.cloneRange();
  const start = mathAncestor(r.startContainer);
  if (start) r.setStartBefore(start);
  const end = mathAncestor(r.endContainer);
  if (end) r.setEndAfter(end);
  return r;
}

// Strict overlap — unlike range.intersectsNode(), a node that merely touches a
// range boundary does not count, so we don't pick up the image right after the
// selection ends.
function overlaps(range, node) {
  const r = document.createRange();
  try {
    r.selectNode(node);
  } catch {
    return false;
  }
  return (
    range.compareBoundaryPoints(Range.START_TO_END, r) > 0 &&
    range.compareBoundaryPoints(Range.END_TO_START, r) < 0
  );
}

// Text nodes at the edges are only partially selected.
function clippedText(node, range) {
  const text = node.nodeValue ?? "";
  const start = node === range.startContainer ? range.startOffset : 0;
  const end = node === range.endContainer ? range.endOffset : text.length;
  return text.slice(start, end);
}

function texFor(el, mathMap) {
  if (el.matches(".katex")) {
    const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
    const tex = annotation?.textContent?.trim();
    const display = el.parentElement?.classList.contains("katex-display");
    return { tex: tex || el.textContent.trim(), display };
  }
  if (el.tagName === "MJX-CONTAINER") {
    const tex = mathMap.get(el)?.trim();
    return {
      tex: tex || el.getAttribute("aria-label") || el.textContent.trim(),
      display: el.getAttribute("display") === "true",
    };
  }
  return null;
}

/**
 * Serialize a Range to LaTeX-bearing plain text.
 * @param {Range} range
 * @returns {string}
 */
export function serializeRange(range) {
  if (!range || range.collapsed) return "";

  const expanded = expandToWholeMath(range);
  const root = elementOf(expanded.commonAncestorContainer);
  if (!root) return "";

  const mathMap = buildMathJaxMap();
  const out = [];

  function walk(node) {
    if (!overlaps(expanded, node)) return;

    if (node.nodeType === Node.TEXT_NODE) {
      // Collapse layout whitespace, but only in prose — LaTeX chunks are pushed
      // verbatim below so we never touch what's inside \(…\).
      const text = clippedText(node, expanded).replace(/[ \t\r\n]+/g, " ");
      if (text) out.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches(SKIP_SELECTOR)) return;

    const math = texFor(node, mathMap);
    if (math) {
      out.push(math.display ? `\n\\[${math.tex}\\]\n` : `\\(${math.tex}\\)`);
      return;
    }

    if (node.tagName === "IMG") {
      out.push(node.alt ? `[slika: ${node.alt}]` : "[slika]");
      return;
    }
    if (node.tagName === "BR") {
      out.push("\n");
      return;
    }

    for (const child of node.childNodes) walk(child);
    if (BLOCK_TAGS.has(node.tagName)) out.push("\n");
  }

  walk(root);

  const text = out
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) + "…" : text;
}

/**
 * Images the selection covers, in document order.
 * @param {Range} range
 * @param {Element} [container] element to search within; defaults to the range's ancestor
 * @param {number} [max]
 * @returns {{ src: string, alt: string }[]}
 */
export function collectImagesInRange(range, container = null, max = 2) {
  if (!range || range.collapsed) return [];

  const root =
    container ??
    elementOf(range.commonAncestorContainer)?.closest(".task-card") ??
    elementOf(range.commonAncestorContainer);
  if (!root) return [];

  const found = [];
  const seen = new Set();
  const candidates = root.tagName === "IMG" ? [root] : root.querySelectorAll("img");

  for (const img of candidates) {
    if (!overlaps(range, img)) continue;
    const src = img.currentSrc || img.src;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    found.push({ src, alt: img.alt || "" });
    if (found.length >= max) break;
  }
  return found;
}
