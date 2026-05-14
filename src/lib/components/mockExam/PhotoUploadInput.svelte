<script>
  import { compressImage, approxDataUrlBytes, formatBytes } from "$lib/utils/imageCompress";

  let { value = "", onChange } = $props();

  let isDragging = $state(false);
  const isHeic = $derived(/\.(heic|heif)$/i.test(fileName));
  let fileName = $state("");
  let inputRef = $state(null);
  let processing = $state(false);
  let originalSize = $state(0);
  let compressedSize = $state(0);
  let warning = $state("");

  async function readFile(file) {
    if (!file) return;
    fileName = file.name;
    originalSize = file.size;
    warning = "";
    processing = true;
    try {
      const dataUrl = await compressImage(file);
      compressedSize = approxDataUrlBytes(dataUrl);
      if (compressedSize > 5 * 1024 * 1024) {
        warning = "Slika je velika i može usporiti predaju.";
      }
      onChange?.(dataUrl);
    } catch (err) {
      warning = `Neuspješna obrada slike: ${err?.message ?? err}`;
    } finally {
      processing = false;
    }
  }

  function onPick(e) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) readFile(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave() {
    isDragging = false;
  }

  function clearImage() {
    fileName = "";
    originalSize = 0;
    compressedSize = 0;
    warning = "";
    if (inputRef) inputRef.value = "";
    onChange?.("");
  }
</script>

{#if value}
  <div class="pu-preview">
    <img src={value} alt="Tvoje rješenje" />
    <div class="pu-meta">
      <span class="mono">
        {fileName || "učitana slika"}
        {#if originalSize}
          · {formatBytes(originalSize)} → {formatBytes(compressedSize)}
        {/if}
      </span>
      <button class="btn btn-quiet" type="button" onclick={clearImage}>Promijeni</button>
    </div>
    {#if warning}
      <div class="pu-warn">{warning}</div>
    {/if}
  </div>
{:else if processing}
  <div class="pu-drop" style="cursor:default">
    <div class="spinner"></div>
    <div class="pu-title">Obrada slike{isHeic ? " (HEIC → JPEG)" : ""}…</div>
  </div>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="pu-drop {isDragging ? 'dragging' : ''}"
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    onclick={() => inputRef?.click()}
  >
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
    <div class="pu-title">Fotografiraj ili učitaj rješenje</div>
    <div class="pu-sub">Povuci sliku ovdje, ili klikni za odabir / kameru</div>
    <input
      bind:this={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onchange={onPick}
      hidden
    />
  </div>
{/if}

<style>
  .pu-drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 28px 16px;
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text-dim);
    cursor: pointer;
    transition: background .12s, border-color .12s, color .12s;
  }
  .pu-drop:hover {
    background: var(--bg-hover);
    color: var(--text);
    border-color: var(--primary-border);
  }
  .pu-drop.dragging {
    background: var(--primary-dim);
    border-color: var(--primary-border);
    color: var(--text);
  }
  .pu-title { font-size: 14px; font-weight: 500; }
  .pu-sub { font-size: 12px; color: var(--text-faint); }

  .pu-preview {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
    background: var(--bg-elev);
  }
  .pu-preview img {
    display: block;
    width: 100%;
    max-height: 480px;
    object-fit: contain;
    background: #000;
  }
  .pu-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    color: var(--text-faint);
    font-size: 12px;
    border-top: 1px solid var(--border);
  }
  .pu-warn {
    padding: 8px 12px;
    color: var(--warn);
    font-size: 12px;
    border-top: 1px solid var(--border);
  }
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
