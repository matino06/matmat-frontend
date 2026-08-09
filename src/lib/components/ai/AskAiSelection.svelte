<script>
  import { onMount } from "svelte";
  import { openAI } from "$lib/store/panels.svelte.js";
  import { setAiQuote } from "$lib/store/aiQuote.svelte.js";
  import { serializeRange, collectImagesInRange } from "$lib/utils/selectionToLatex.js";

  // Only task/solution content is quotable.
  const CONTAINER = ".task-card";
  const GAP = 10; // px between the anchor and the button
  const EDGE = 8; // keep the button this far from the viewport edges
  const INSET = 8; // px inside an image's corner when overlaying it
  const HIDE_DELAY = 220; // ms of grace before a hovered-away button disappears

  let visible = $state(false);
  let x = $state(0);
  let y = $state(0);
  let below = $state(false); // flip under the anchor when there's no room above
  let overlay = $state(false); // sit inside the anchor instead of above it
  let btnEl = $state(null);

  // What the button would quote if clicked. Deliberately not $state — it holds a
  // live Range and DOM nodes, and nothing renders from it.
  let pending = null;
  let selectionTimer = 0;
  let hideTimer = 0;
  let frame = 0;

  function elementOf(node) {
    return node?.nodeType === Node.ELEMENT_NODE ? node : (node?.parentElement ?? null);
  }

  function sourceFor(node) {
    return elementOf(node)?.closest(".solution") ? "solution" : "task";
  }

  // mode "above": centred over the anchor, for text selections — the pointer already
  // ends there, so there is no gap to cross.
  // mode "overlay": tucked inside the anchor's top-right corner, for images — an
  // above-anchored button would leave a dead strip between image and button, and
  // moving across it would count as leaving the image and dismiss the button.
  function showAt(rect, mode = "above") {
    if (!rect || (!rect.width && !rect.height)) {
      hide();
      return;
    }
    overlay = mode === "overlay";
    if (overlay) {
      below = false;
      x = Math.min(rect.right - INSET, window.innerWidth - EDGE);
      y = Math.max(rect.top + INSET, EDGE);
    } else {
      below = rect.top < 56;
      x = Math.min(
        Math.max(rect.left + rect.width / 2, EDGE + 60),
        window.innerWidth - EDGE - 60,
      );
      y = below ? rect.bottom + GAP : rect.top - GAP;
    }
    visible = true;
  }

  function hide() {
    clearTimeout(hideTimer);
    hideTimer = 0;
    visible = false;
    pending = null;
  }

  function cancelHide() {
    clearTimeout(hideTimer);
    hideTimer = 0;
  }

  // Grace period so a pointer that briefly strays off the anchor — around a narrow
  // image, or cutting a corner — doesn't lose the button mid-reach.
  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_DELAY);
  }

  function anchorRect() {
    if (!pending) return null;
    return pending.kind === "selection"
      ? pending.range.getBoundingClientRect()
      : pending.img.getBoundingClientRect();
  }

  function reposition() {
    if (!pending) return;
    // fitMath rescales formulas asynchronously, so the anchor can move or vanish
    // under us — a zero rect means the nodes are gone and the quote is stale.
    showAt(anchorRect(), pending.kind === "image" ? "overlay" : "above");
  }

  function readSelection() {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      if (pending?.kind === "selection") hide();
      return;
    }
    const range = sel.getRangeAt(0);
    const container = elementOf(range.commonAncestorContainer)?.closest(CONTAINER);
    if (!container) {
      if (pending?.kind === "selection") hide();
      return;
    }
    // A pending image-hide must not fire and wipe the selection we just took over.
    cancelHide();
    pending = { kind: "selection", range: range.cloneRange(), container };
    showAt(range.getBoundingClientRect());
  }

  function onSelectionChange() {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(readSelection, 120);
  }

  function showForImage(img) {
    cancelHide();
    // Already pinned to this image — re-showing would just churn the anchor.
    if (pending?.kind === "image" && pending.img === img) return;
    pending = { kind: "image", img };
    showAt(img.getBoundingClientRect(), "overlay");
  }

  function onMouseOver(e) {
    const target = e.target;
    // Staying on the button must not dismiss it.
    if (btnEl && target instanceof Node && btnEl.contains(target)) {
      cancelHide();
      return;
    }

    const img = target?.closest?.(`${CONTAINER} img`);
    if (img) {
      // An active text selection wins — don't steal its button.
      const sel = document.getSelection();
      if (sel && !sel.isCollapsed) return;
      showForImage(img);
      return;
    }
    if (pending?.kind === "image") scheduleHide();
  }

  // Tapping an image does nothing otherwise, so on touch this is how you pick one.
  function onClick(e) {
    const img = e.target?.closest?.(`${CONTAINER} img`);
    if (img) {
      showForImage(img);
      return;
    }
    if (btnEl && e.target instanceof Node && btnEl.contains(e.target)) {
      cancelHide();
      return;
    }
    if (pending?.kind === "image") hide();
  }

  function onViewportChange() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(reposition);
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && visible) hide();
  }

  function ask() {
    cancelHide();
    if (!pending) return;

    let quote;
    if (pending.kind === "selection") {
      const { range, container } = pending;
      quote = {
        text: serializeRange(range),
        images: collectImagesInRange(range, container),
        source: sourceFor(range.commonAncestorContainer),
      };
    } else {
      const { img } = pending;
      quote = {
        text: "",
        images: [{ src: img.currentSrc || img.src, alt: img.alt || "" }],
        source: sourceFor(img),
      };
    }

    if (!quote.text && !quote.images.length) {
      hide();
      return;
    }

    setAiQuote(quote);
    openAI();
    document.getSelection()?.removeAllRanges();
    hide();
  }

  onMount(() => {
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mouseup", readSelection);
    document.addEventListener("touchend", onSelectionChange);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    // Capture so we also catch scrolling inside the task card, not just the page.
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);

    return () => {
      clearTimeout(selectionTimer);
      clearTimeout(hideTimer);
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mouseup", readSelection);
      document.removeEventListener("touchend", onSelectionChange);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  });
</script>

{#if visible}
  <button
    bind:this={btnEl}
    class="ask-ai-float"
    class:below
    class:overlay
    style="left:{x}px; top:{y}px"
    onmousedown={(e) => e.preventDefault()}
    onclick={ask}
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M20 19.5v-.5a7 7 0 0 0-14 0v.5"/>
    </svg>
    Pitaj AI
  </button>
{/if}

<style>
  .ask-ai-float {
    position: fixed;
    /* Above page content, below the AI panel (40/41) so it tucks away when the
       panel slides open. */
    z-index: 39;
    transform: translate(-50%, -100%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border-strong);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    animation: ask-ai-in 0.12s ease-out;
  }
  .ask-ai-float.below {
    transform: translate(-50%, 0);
  }
  /* Anchored inside the image's top-right corner. */
  .ask-ai-float.overlay {
    transform: translate(-100%, 0);
  }

  /* Invisible margin around the button so a slightly-off pointer still counts as
     being on it — the hover handler keys off btnEl.contains(e.target), and events
     over a pseudo-element target the button itself. */
  .ask-ai-float::before {
    content: "";
    position: absolute;
    inset: -10px;
  }

  .ask-ai-float:hover {
    background: var(--primary);
    color: var(--on-primary);
    border-color: transparent;
  }
  .ask-ai-float:active {
    transform: translate(-50%, -100%) scale(0.97);
  }
  .ask-ai-float.below:active {
    transform: translate(-50%, 0) scale(0.97);
  }
  .ask-ai-float.overlay:active {
    transform: translate(-100%, 0) scale(0.97);
  }

  @keyframes ask-ai-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
