<script>
  import { renderMathInline } from "$lib/utils/mockExamRenderer";
  import { imageUrl } from "$lib/utils/imageUrl";

  let { value = null, onChange, options = [], optionImages = {} } = $props();

  const LETTERS = ["A", "B", "C", "D"];

  function pick(letter) {
    onChange?.(letter);
  }
</script>

<div class="mc">
  {#each LETTERS as letter, i (letter)}
    {@const text = options[i]}
    {@const img = optionImages[`option_${letter.toLowerCase()}`]}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="mc-opt {value === letter ? 'selected' : ''}"
      onclick={() => pick(letter)}
    >
      <div class="mc-letter">{letter}</div>
      <div class="mc-body">
        {#if img}
          <img src={imageUrl(img.imageUrl)} alt={img.altText ?? `Opcija ${letter}`} />
          {#if text}
            <div class="mc-caption">{@html renderMathInline(text)}</div>
          {/if}
        {:else}
          <div class="mc-text">{@html renderMathInline(text ?? "")}</div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .mc {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  @media (min-width: 640px) {
    .mc { grid-template-columns: 1fr 1fr; }
  }
  .mc-opt {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .mc-opt:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .mc-opt.selected {
    background: var(--primary-dim);
    border-color: var(--primary-border);
  }
  .mc-letter {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: var(--r-sm);
    display: grid;
    place-items: center;
    background: var(--bg-elev-2);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 13px;
  }
  .mc-opt.selected .mc-letter {
    background: var(--primary);
    color: var(--on-primary);
  }
  .mc-body {
    min-width: 0;
    flex: 1;
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
  }
  .mc-body :global(p) { margin: 0; }
  .mc-body img {
    max-width: 100%;
    height: auto;
    border-radius: var(--r-sm);
    background: #fff;
  }
  .mc-caption {
    margin-top: 6px;
    color: var(--text-dim);
    font-size: 12px;
  }
</style>
