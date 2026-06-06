<script>
  import { onMount } from "svelte";

  let { value = "", onChange } = $props();

  let mfRef = $state(null);
  let ready = $state(false);
  let mode = $state("math"); // "math" | "text"

  const maturaLayout = {
    label: "Matura",
    tooltip: "Matura simboli",
    rows: [
      [
        { latex: "[" },
        { latex: "]" },
        { latex: "(" },
        { latex: ")" },
        { latex: "\\{" },
        { latex: "\\}" },
        { latex: "\\langle" },
        { latex: "\\rangle" },
        { latex: "," },
        { latex: "|#0|" },
      ],
      [
        { latex: "\\in" },
        { latex: "\\notin" },
        { latex: "\\cup" },
        { latex: "\\cap" },
        { latex: "\\subset" },
        { latex: "\\subseteq" },
        { latex: "\\setminus" },
        { latex: "\\emptyset" },
        { latex: "\\{#0\\}" },
        { latex: "\\infty" },
      ],
      [
        { latex: "\\mathbb{R}" },
        { latex: "\\mathbb{N}" },
        { latex: "\\mathbb{Z}" },
        { latex: "\\mathbb{Q}" },
        { latex: "\\mathbb{C}" },
        { latex: "\\pm" },
        { latex: "\\neq" },
        { latex: "\\leq" },
        { latex: "\\geq" },
        { latex: "\\approx" },
      ],
      [
        { latex: "\\sin" },
        { latex: "\\cos" },
        { latex: "\\tan" },
        { latex: "\\log" },
        { latex: "\\ln" },
        { latex: "e" },
        { latex: "\\pi" },
        { latex: "\\sqrt{#0}" },
        { latex: "\\sqrt[#?]{#?}" },
        { latex: "\\frac{#?}{#?}" },
      ],
    ],
  };

  onMount(async () => {
    await import("mathlive");
    if (typeof window !== "undefined" && window.mathVirtualKeyboard) {
      window.mathVirtualKeyboard.layouts = [
        maturaLayout,
        "numeric",
        "symbols",
        "alphabetic",
        "greek",
      ];
    }
    ready = true;
  });

  $effect(() => {
    if (ready && mfRef && mfRef.value !== value) {
      mfRef.value = value ?? "";
    }
  });

  function handleInput(e) {
    onChange?.(e.target.value);
  }

  // Strip \text{...} wrapper to get the raw text for display in textarea.
  function textValue() {
    const m = value?.match(/^\\text\{([\s\S]*)\}$/);
    return m ? m[1] : (value ?? "");
  }

  function handleTextInput(e) {
    // Wrap in \text{} so KaTeX renders it as roman text inside math context.
    onChange?.(`\\text{${e.target.value}}`);
  }

  function toggleMode() {
    mode = mode === "math" ? "text" : "math";
  }

  function clear() {
    if (mode === "math" && mfRef) mfRef.value = "";
    onChange?.("");
  }
</script>

<div class="sa">
  {#if mode === "math"}
    {#if ready}
      <math-field bind:this={mfRef} oninput={handleInput} class="sa-field"></math-field>
    {:else}
      <div class="sa-placeholder">Učitavanje editora…</div>
    {/if}
  {:else}
    <textarea
      class="sa-textarea"
      value={textValue()}
      oninput={handleTextInput}
      placeholder="Upiši odgovor kao tekst…"
      rows="3"
    ></textarea>
  {/if}
  <div class="sa-actions">
    <button class="btn btn-quiet" type="button" onclick={clear}>Obriši</button>
    <button class="btn btn-quiet" class:btn-active={mode === "text"} type="button" onclick={toggleMode}>
      {mode === "math" ? "✎ Tekst" : "∑ Matematika"}
    </button>
    <span class="sa-hint">
      {mode === "math" ? "Tipkaj kao u Photomathu — dijeli, korijen, eksponent…" : "Slobodni tekst"}
    </span>
  </div>
</div>

<style>
  .sa {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sa-field {
    display: block;
    width: 100%;
    min-height: 48px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 18px;
    --keyboard-zindex: 1500;
  }
  .sa-field:focus { outline: none; border-color: var(--primary-border); }
  .sa-placeholder {
    min-height: 48px;
    padding: 14px 12px;
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text-faint);
    font-size: 13px;
  }
  .sa-textarea {
    display: block;
    width: 100%;
    min-height: 80px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 15px;
    font-family: inherit;
    line-height: 1.5;
    resize: vertical;
    box-sizing: border-box;
  }
  .sa-textarea:focus { outline: none; border-color: var(--primary-border); }
  .sa-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .btn-active {
    color: var(--primary);
    border-color: var(--primary-border);
  }
  .sa-hint {
    color: var(--text-faint);
    font-size: 12px;
    flex: 1;
  }
</style>
