// SVG sketches in AI answers. The model draws them as an <svg> block (usually
// inside a ```svg fence); the chat shows that as an image instead of code, a
// "drawing" card while it streams, and a fallback card when it never finishes.
//
// Pure string functions (no DOM needed) so they can be exercised from Node.

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

// A sketch starts on a line beginning with <svg — optionally after an <?xml?>
// prolog and/or a ``` / ```svg / ```xml / ```html fence line. Only line starts
// count, so "<svg>" mentioned mid-sentence stays text.
const SKETCH_OPEN =
  /(^|\n)([ \t]*```[ \t]*(?:svg|xml|html)?[ \t]*\r?\n)?([ \t]*<\?xml[^>]*>\s*)?[ \t]*(<svg[\s>])/gi;
const SKETCH_CLOSE = /<\/svg\s*>/i;
// What's left of a closing fence after </svg> — partial while streaming.
const FENCE_CLOSE = /^[ \t]*(?:\r?\n[ \t]*)?`{0,3}/;
// A finished line that may still turn out to open a sketch: a bare fence or an
// <?xml?> prolog, with the <svg line yet to come.
const OPENER_LINE = /^[ \t]*(?:```[ \t]*(?:svg|xml|html)?|<\?xml[^>]*>)\s*$/i;

/**
 * Splits an answer into markdown and sketch segments, in order. A sketch without
 * its </svg> yet (still streaming, or cut off) runs to the end of the text.
 * @param {string} text
 * @returns {({ type: "md", start: number, end: number, text: string }
 *   | { type: "sketch", start: number, end: number, svg: string, complete: boolean })[]}
 */
export function splitSketches(text) {
  const segments = [];
  const md = (start, end) => ({
    type: "md",
    start,
    end,
    text: text.slice(start, end),
  });
  const re = new RegExp(SKETCH_OPEN.source, SKETCH_OPEN.flags);
  let pos = 0;
  let m;

  while ((m = re.exec(text))) {
    const start = m.index + m[1].length;
    const svgStart = m.index + m[0].length - m[4].length;
    const close = text.slice(svgStart).match(SKETCH_CLOSE);

    let end = text.length;
    let svg = text.slice(svgStart);
    if (close) {
      end = svgStart + close.index + close[0].length;
      svg = text.slice(svgStart, end);
      // The fence belongs to the sketch, so its closing ``` must not leak into markdown.
      if (m[2]) end += text.slice(end).match(FENCE_CLOSE)[0].length;
    }

    if (start > pos) segments.push(md(pos, start));
    segments.push({ type: "sketch", start, end, svg, complete: !!close });
    pos = end;
    if (!close) break;
    re.lastIndex = end;
  }

  if (pos < text.length) segments.push(md(pos, text.length));
  return segments;
}

/**
 * The sketch as a data URL for an <img>, or null if it's broken. Shown only as an
 * image: an SVG in <img> can't run scripts or load anything, so the model's markup
 * never reaches the DOM.
 * @param {string} svg
 */
export function sketchSrc(svg) {
  let s = svg.trim();
  const open = s.match(/^<svg\b[^>]*>/i);
  if (!open) return null;

  // <img> refuses to draw an SVG without its namespace.
  let tag = open[0];
  if (!/\sxmlns\s*=/.test(tag))
    tag = tag.replace(/^<svg\b/i, `<svg xmlns="${SVG_NS}"`);
  if (/\bxlink:/.test(s) && !/\sxmlns:xlink\s*=/.test(tag)) {
    tag = tag.replace(/^<svg\b/i, `<svg xmlns:xlink="${XLINK_NS}"`);
  }
  s = tag + s.slice(open[0].length);

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(s, "image/svg+xml");
    if (
      doc.getElementsByTagName("parsererror").length ||
      doc.documentElement.localName !== "svg"
    ) {
      return null;
    }
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
}

/**
 * How far typing may go while the answer is still streaming. A last line that
 * starts with ` or < — and any bare fence / <?xml?> lines right above it — may
 * still become a sketch opener, so typing waits there until it's clear; otherwise
 * "```" would flash up as an empty code block before the "drawing" card.
 * @param {string} text
 */
export function typeLimit(text) {
  let cut = text.lastIndexOf("\n") + 1;
  const last = text.slice(cut).trimStart();
  if (last && last[0] !== "`" && last[0] !== "<") return text.length;
  while (cut > 0) {
    const prevStart = text.lastIndexOf("\n", cut - 2) + 1;
    if (!OPENER_LINE.test(text.slice(prevStart, cut - 1))) break;
    cut = prevStart;
  }
  return cut;
}

/**
 * One typing step: the next length of `text` to show. Markdown is typed `step`
 * characters at a time; a sketch is never typed out — the step jumps to its end,
 * or to everything received so far if it's still streaming in.
 * @param {string} text everything received so far
 * @param {number} shown how much of it is already shown
 * @param {boolean} streaming whether more text may still arrive
 */
export function nextShown(text, shown, streaming, step = 2) {
  const limit = streaming ? typeLimit(text) : text.length;
  for (const seg of splitSketches(text)) {
    if (seg.end <= shown) continue;
    if (seg.type === "sketch") return seg.complete ? seg.end : text.length;
    return Math.max(shown, Math.min(shown + step, seg.end, limit));
  }
  return shown;
}

/**
 * Where the part that no longer changes ends: after the last paragraph break or
 * finished sketch, never inside a sketch. Lets the chat render that part once
 * instead of on every typing tick.
 * @param {string} text what's shown so far
 */
export function stableEnd(text) {
  let end = 0;
  for (const seg of splitSketches(text)) {
    if (seg.type === "sketch") {
      if (seg.complete) end = seg.end;
    } else {
      const i = seg.text.lastIndexOf("\n\n");
      if (i !== -1) end = seg.start + i + 2;
    }
  }
  return end;
}
