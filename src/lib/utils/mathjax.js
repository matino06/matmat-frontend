import { usesMathJax } from "./markdownCore.js";

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
      MJ.typesetPromise([node]).catch(() => {});
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
