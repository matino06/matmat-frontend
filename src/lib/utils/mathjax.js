import { usesMathJax } from "./markdownCore.js";

// Stamp each typeset formula's TeX on its <mjx-container>, so the selection
// serializer (selectionToLatex.js) can recover it even if MathJax's own math list
// no longer has the item.
function keepTex(MJ, node) {
  const items = MJ.startup?.document?.getMathItemsWithin?.([node]) ?? [];
  for (const item of items) {
    if (item?.typesetRoot?.dataset && typeof item.math === "string") {
      item.typesetRoot.dataset.tex = item.math;
    }
  }
}

// Svelte action: typeset the browser MathJax fallback inside `node`, but ONLY for old tasks
// (id ≤ MATHJAX_MAX_ID) whose content is rendered with raw MathJax delimiters. Newer tasks are
// rendered by KaTeX and must never be handed to MathJax, so this is a no-op for them.
//
// Task content is fetched after MathJax's script loads (and MathJax auto-typeset is disabled in
// app.html), so we typeset the container ourselves — retrying until the async CDN script is ready.
//
// Usage:  <div use:mathjaxTypeset={task?.id}>{@html renderTaskHtml(task?.text, task?.id)}</div>
export function mathjaxTypeset(node, id) {
  let frame = 0;
  let cancelled = false;

  const attempt = () => {
    if (cancelled || !usesMathJax(id)) return;
    const MJ = typeof window !== "undefined" && window.MathJax;
    if (MJ && MJ.typesetPromise) {
      MJ.typesetClear && MJ.typesetClear([node]);
      MJ.typesetPromise([node])
        .then(() => keepTex(MJ, node))
        .catch(() => {});
    } else {
      setTimeout(attempt, 200); // MathJax CDN not loaded yet — try again shortly
    }
  };

  const run = () => {
    cancelAnimationFrame(frame);
    // rAF so we typeset after Svelte has patched the {@html …} into the DOM.
    frame = requestAnimationFrame(attempt);
  };

  run();

  return {
    update(newId) {
      id = newId;
      run();
    },
    destroy() {
      cancelled = true;
      cancelAnimationFrame(frame);
    },
  };
}
