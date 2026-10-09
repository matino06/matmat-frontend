<script>
  import { renderMath, renderMathInline } from "$lib/utils/mockExamRenderer";

  // Admin editor for one markdown + KaTeX field, with a live preview rendered by
  // the same renderer the exam uses, so it shows exactly what the student sees.
  let {
    id,
    label,
    value = $bindable(""),
    inline = false,
    rows = 3,
    placeholder = "",
    disabled = false,
  } = $props();

  const preview = $derived(inline ? renderMathInline(value ?? "") : renderMath(value ?? ""));

  // Grows the textarea with its content so long explanations need no inner scroll.
  function autosize(node) {
    const fit = () => {
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight + 2}px`;
    };
    $effect(() => {
      value;
      fit();
    });
    node.addEventListener("input", fit);
    return { destroy: () => node.removeEventListener("input", fit) };
  }
</script>

<div class="mf">
  <label for={id}>{label}</label>
  <textarea
    {id}
    {rows}
    {placeholder}
    {disabled}
    spellcheck="false"
    bind:value
    use:autosize
  ></textarea>
  <div class="mf-preview" class:empty={!value?.trim()}>
    <span class="mf-preview-label">Pregled</span>
    {#if value?.trim()}
      <div class="mf-render">{@html preview}</div>
    {:else}
      <div class="mf-render mf-placeholder">—</div>
    {/if}
  </div>
</div>

<style>
  .mf {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  label {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  textarea {
    width: 100%;
    resize: vertical;
    padding: 9px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.55;
    outline: none;
    transition: border-color 0.12s;
  }
  textarea:hover:not(:disabled) {
    border-color: var(--border-strong);
  }
  textarea:focus {
    border-color: var(--primary);
  }
  textarea:disabled {
    opacity: 0.6;
  }
  .mf-preview {
    position: relative;
    padding: 10px 12px;
    border-radius: var(--r-md);
    border: 1px dashed var(--border);
    background: var(--bg-elev-2);
  }
  .mf-preview-label {
    display: block;
    margin-bottom: 4px;
    font-size: 10px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .mf-render {
    color: var(--text);
    font-size: 15px;
    line-height: 1.6;
    overflow-x: auto;
  }
  .mf-render :global(p) { margin: 0 0 8px; }
  .mf-render :global(p:last-child) { margin-bottom: 0; }
  .mf-placeholder {
    color: var(--text-faint);
  }
</style>
