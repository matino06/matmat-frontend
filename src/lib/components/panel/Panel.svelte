<script>
  // bare: the content brings its own header and padding (the AI chat).
  let { id = '', open = false, onClose, title = '', meta = '', wide = false, bare = false, children, footer } = $props();

  // On wide screens the open panel is a column next to the page (split view)
  // instead of an overlay. Kept in step with the split-view media query in app.css.
  const SPLIT_QUERY = '(min-width: 1200px)';
  const SIDEBAR_W = 240;
  const MIN_PAGE_W = 480; // the task never gets narrower than this in split view
  const MIN_W = 360;

  let width = $state(savedWidth());
  let resizing = $state(false);

  function storageKey() {
    return id ? `mm-panel-w-${id}` : null;
  }

  // Where the divider was left last time — a per-viewer convenience, so without
  // storage it's just the default width (wider than the old 460/560).
  function savedWidth() {
    try {
      const saved = Number(storageKey() && localStorage.getItem(storageKey()));
      if (saved > 0) return saved;
    } catch {
      // no storage (SSR, private mode) — use the default
    }
    return wide ? 760 : 640;
  }

  function clampWidth(w) {
    const max = window.matchMedia(SPLIT_QUERY).matches
      ? window.innerWidth - SIDEBAR_W - MIN_PAGE_W
      : window.innerWidth - 80;
    return Math.max(MIN_W, Math.min(w, max));
  }

  function startResize(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    // Capture keeps the drag going over the formula PDF <iframe>, which would
    // otherwise swallow the events as soon as the pointer crosses it.
    handle.setPointerCapture(e.pointerId);
    resizing = true;

    function onMove(ev) {
      // The panel is flush right in both modes, so its width is the distance
      // from the pointer to the window's right edge.
      width = clampWidth(window.innerWidth - ev.clientX);
    }
    function onEnd() {
      resizing = false;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      try {
        if (storageKey()) localStorage.setItem(storageKey(), String(Math.round(width)));
      } catch {
        // not remembered — fine
      }
    }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="panel-backdrop" class:open={open} onclick={onClose}></div>

<div class="panel" class:open={open} class:resizing style:width="{width}px">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="panel-resize" onpointerdown={startResize} aria-label="Resize panel"></div>

  {#if bare}
    {@render children?.()}
  {:else}
    <div class="panel-head">
      <div>
        <h3>{title}</h3>
        {#if meta}<div class="meta">{meta}</div>{/if}
      </div>
      <button class="btn btn-quiet" onclick={onClose} style="padding: 6px 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="panel-body">
      {@render children?.()}
    </div>
  {/if}
  {#if footer}
    <div class="panel-foot">
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  .panel-resize {
    position: absolute;
    left: -3px;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: ew-resize;
    touch-action: none;
    z-index: 2;
    background: transparent;
    transition: background 0.15s;
  }
  .panel-resize:hover,
  .panel.resizing .panel-resize {
    background: var(--primary);
    opacity: 0.6;
  }
  .panel.resizing {
    transition: none !important;
    user-select: none;
  }

  @media (max-width: 767px) {
    .panel-resize { display: none; }
  }
</style>
