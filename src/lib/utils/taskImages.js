// Task images aren't a field on the task object — the backend embeds them as raw
// <img> tags inside taskText/explanation, which markdown-it renders through
// (html: true). So the only way to hand them to the AI is to pull the srcs back
// out of that markup.

const IMG_TAG = /<img\b[^>]*>/gi;
const SRC = /\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))/i;
const ALT = /\salt\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))/i;

// Attribute order is arbitrary, so match against the whole tag rather than
// assuming src comes last.
function attr(tag, re) {
  const m = tag.match(re);
  return (m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
}

/**
 * Every image referenced by a task's statement and solution, in document order.
 * @param {{ taskText?: string, explanation?: string } | null} task
 * @returns {{ src: string, alt: string }[]}
 */
export function taskImages(task) {
  if (!task) return [];

  const found = [];
  const seen = new Set();

  for (const field of [task.taskText, task.explanation]) {
    if (typeof field !== "string") continue;
    for (const [tag] of field.matchAll(IMG_TAG)) {
      const src = attr(tag, SRC);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      found.push({ src, alt: attr(tag, ALT) });
    }
  }
  return found;
}

/**
 * Quoted images first — those are what the student is actually pointing at —
 * then the rest of the task's images, deduplicated, capped.
 * @param {{ src: string, alt: string }[]} quoted
 * @param {{ src: string, alt: string }[]} rest
 * @param {number} max
 */
export function mergeImages(quoted, rest, max) {
  const out = [];
  const seen = new Set();
  for (const img of [...quoted, ...rest]) {
    if (!img?.src || seen.has(img.src)) continue;
    seen.add(img.src);
    out.push(img);
    if (out.length >= max) break;
  }
  return out;
}
