// Svelte action that fixes KaTeX display-math overflow on narrow screens.
//
// Problem: KaTeX's internal structure (.katex-display → .katex → .katex-html → .base)
// makes shrink-to-fit propagation unreliable. Even forcing .katex to inline-block
// leaves it constrained to parent width — so .katex-display.scrollWidth equals
// .clientWidth and overflow-x: auto has nothing to scroll.
//
// Solution: .base is inline-block with width: min-content (per KaTeX CSS), so it
// always reports the true natural width of the math via offsetWidth, regardless
// of parent constraints. We measure that and force an explicit pixel width up
// the chain so the browser can't argue.
export function fitMath(node) {
  const apply = () => {
    node.querySelectorAll(".katex-display").forEach((d) => {
      if (d.dataset.fitted) return;
      const bases = d.querySelectorAll(".base");
      if (!bases.length) return;
      let mathWidth = 0;
      bases.forEach((b) => {
        if (b.offsetWidth > mathWidth) mathWidth = b.offsetWidth;
      });
      if (mathWidth <= 0) return;
      d.dataset.fitted = "1";
      Object.assign(d.style, {
        overflowX: "auto",
        overflowY: "hidden",
        maxWidth: "100%",
        textAlign: "initial",
        paddingBottom: "4px",
      });
      const katex = d.querySelector(":scope > .katex");
      if (katex) {
        Object.assign(katex.style, {
          display: "inline-block",
          width: mathWidth + "px",
          maxWidth: "none",
        });
      }
      const katexHtml = d.querySelector(".katex-html");
      if (katexHtml) {
        Object.assign(katexHtml.style, {
          width: mathWidth + "px",
        });
      }
    });
  };
  const reapply = () => {
    node.querySelectorAll(".katex-display").forEach((d) => {
      delete d.dataset.fitted;
      const katex = d.querySelector(":scope > .katex");
      const katexHtml = d.querySelector(".katex-html");
      if (katex) katex.style.width = "";
      if (katexHtml) katexHtml.style.width = "";
    });
    apply();
  };
  apply();
  if (document.fonts?.ready) document.fonts.ready.then(reapply);
  const obs = new MutationObserver(apply);
  obs.observe(node, { childList: true, subtree: true });
  return { destroy: () => obs.disconnect() };
}
