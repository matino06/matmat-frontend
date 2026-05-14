<script>
  import { onMount } from "svelte";

  let { value = "", onChange } = $props();

  let mfRef = $state(null);
  let ready = $state(false);

  onMount(async () => {
    await import("mathlive");
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

  function clear() {
    if (mfRef) {
      mfRef.value = "";
      onChange?.("");
    }
  }
</script>

<div class="sa">
  {#if ready}
    <math-field
      bind:this={mfRef}
      oninput={handleInput}
      class="sa-field"
    ></math-field>
  {:else}
    <div class="sa-placeholder">Učitavanje editora…</div>
  {/if}
  <div class="sa-actions">
    <button class="btn btn-quiet" type="button" onclick={clear}>Obriši</button>
    <span class="sa-hint">Tipkaj kao u Photomathu — dijeli, korijen, eksponent…</span>
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
  .sa-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sa-hint {
    color: var(--text-faint);
    font-size: 12px;
  }
</style>
