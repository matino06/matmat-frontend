// Svelte action that fixes display-math overflow on narrow screens for both
// KaTeX and MathJax renderers.
//
// Approach: unconditionally measure the true math width and force an explicit
// pixel width on the inner element so the container's overflow-x: auto actually
// scrolls. The container is turned into a flex box with `justify-content:
// safe center` — that centers the math when it fits and falls back to start
// (left) when it overflows, so scrollLeft=0 reveals the LHS. CSS does the
// conditional centering; JS doesn't need to compare widths.
//
// KaTeX: `.katex .base` is `width: min-content` + `white-space: nowrap`, so
// its offsetWidth reports the true math width regardless of parent constraints.
// MathJax v3 CHTML: `mjx-math` is inline-block and reports its content width
// directly via offsetWidth.
const SCROLL_STYLE = {
  display: "flex",
  justifyContent: "safe center",
  overflowX: "auto",
  overflowY: "hidden",
  maxWidth: "100%",
  minWidth: "0",
  paddingBottom: "4px",
};

const INNER_STYLE_BASE = {
  flexShrink: "0",
  maxWidth: "none",
};

export function fitMath(node) {
  const processKatex = (d) => {
    if (d.dataset.fitted) return;
    // A tagged equation (\tag{…}) renders its tag `position:absolute; right:0` inside
    // .katex-html. The tag takes no layout width, so we must reserve room for it —
    // otherwise right:0 lands on top of the formula. Measure equation + tag:
    //  • fits → leave KaTeX's native full-width layout (equation centered, tag flush right);
    //  • too wide → widen the box to equation+tag+gap, left-align the equation, and scroll
    //    (the tag then sits after the formula and is reachable by scrolling).
    const tag = d.querySelector(".tag");
    if (tag) {
      d.dataset.fitted = "1";
      const tagged = d.querySelectorAll(".base");
      let we = 0;
      tagged.forEach((b) => {
        const bw = b.getBoundingClientRect().width;
        if (bw > we) we = bw;
      });
      const containerW = d.getBoundingClientRect().width;
      const contentW = Math.ceil(we + tag.getBoundingClientRect().width + 24);
      const katex = d.querySelector(":scope > .katex");
      const katexHtml = d.querySelector(".katex-html");
      if (contentW > containerW) {
        Object.assign(d.style, SCROLL_STYLE);
        if (katex)
          Object.assign(katex.style, {
            ...INNER_STYLE_BASE,
            display: "inline-block",
            width: contentW + "px",
          });
        if (katexHtml) katexHtml.style.textAlign = "left";
      } else {
        // Reset to native (in case a resize took it from wide back to fitting).
        Object.assign(d.style, {
          display: "",
          justifyContent: "",
          overflowX: "",
          overflowY: "",
          maxWidth: "",
          minWidth: "",
          paddingBottom: "",
        });
        if (katex)
          Object.assign(katex.style, {
            flexShrink: "",
            maxWidth: "",
            display: "",
            width: "",
          });
        if (katexHtml) {
          katexHtml.style.width = "";
          katexHtml.style.textAlign = "";
        }
      }
      return;
    }
    const bases = d.querySelectorAll(".base");
    if (!bases.length) return;
    // Measure the fractional width (getBoundingClientRect) and round UP. KaTeX
    // lays glyphs out at sub-pixel widths, so the integer offsetWidth is often
    // ~0.5px too small — the real content then spills past the right edge of the
    // pinned box, pushing centered display math slightly off-center to the right.
    let w = 0;
    bases.forEach((b) => {
      const bw = b.getBoundingClientRect().width;
      if (bw > w) w = bw;
    });
    if (w <= 0) return;
    w = Math.ceil(w);
    d.dataset.fitted = "1";
    Object.assign(d.style, SCROLL_STYLE);
    const katex = d.querySelector(":scope > .katex");
    if (katex) {
      Object.assign(katex.style, {
        ...INNER_STYLE_BASE,
        display: "inline-block",
        width: w + "px",
      });
    }
    const katexHtml = d.querySelector(".katex-html");
    if (katexHtml) katexHtml.style.width = w + "px";
  };

  const processMathJax = (c) => {
    if (c.dataset.fitted) return;
    const math = c.querySelector("mjx-math");
    if (!math) return;
    const w = math.offsetWidth;
    if (w <= 0) return;
    c.dataset.fitted = "1";
    Object.assign(c.style, SCROLL_STYLE);
    Object.assign(math.style, {
      ...INNER_STYLE_BASE,
      display: "inline-block",
      width: w + "px",
    });
  };

  const apply = () => {
    node.querySelectorAll(".katex-display").forEach(processKatex);
    node
      .querySelectorAll('mjx-container[display="true"]')
      .forEach(processMathJax);
  };

  const reapply = () => {
    node
      .querySelectorAll(
        '.katex-display[data-fitted], mjx-container[display="true"][data-fitted]',
      )
      .forEach((el) => {
        delete el.dataset.fitted;
        el.querySelectorAll(":scope > .katex, .katex-html, mjx-math").forEach(
          (inner) => {
            inner.style.width = "";
            inner.style.textAlign = "";
          },
        );
      });
    apply();
  };

  apply();
  if (document.fonts?.ready) document.fonts.ready.then(reapply);
  const obs = new MutationObserver(apply);
  obs.observe(node, { childList: true, subtree: true });
  return { destroy: () => obs.disconnect() };
}
