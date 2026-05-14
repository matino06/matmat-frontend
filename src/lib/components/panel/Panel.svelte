<script>
  let { open = false, onClose, title = '', meta = '', wide = false, children, footer } = $props();

  // Initial widths — wider than the old 460/560
  const INITIAL = wide ? 760 : 640;
  let width = $state(INITIAL);
  let resizing = $state(false);

  function startResize(e) {
    e.preventDefault();
    resizing = true;

    function onMove(ev) {
      const w = window.innerWidth - ev.clientX;
      width = Math.max(360, Math.min(w, window.innerWidth - 80));
    }
    function onUp() {
      resizing = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="panel-backdrop" class:open={open} onclick={onClose}></div>

<div class="panel" class:open={open} class:resizing style:width="{width}px">
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
  <div class="panel-resize" onmousedown={startResize} aria-label="Resize panel"></div>

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
