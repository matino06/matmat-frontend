<script>
  // Klizači scene (skupina „sile“): vrijednosti se vežu na roditelja, a scena se iz njih računa uživo.
  import Md from "../Md.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    klizaci = [],
    vrijednosti = $bindable({}),
    disabled = false,
  } = $props();
  const uid = Math.random().toString(36).slice(2, 8);
  const fmt = (k) =>
    `${formatNumber(vrijednosti[k.id])}${k.jedinica ? `\u00a0${k.jedinica}` : ""}`;
</script>

{#if klizaci.length}
  <div class="sk">
    {#each klizaci as k (k.id)}
      <div class="sk-row">
        <div class="sk-head">
          <label for="sk-{uid}-{k.id}"><Md text={k.oznaka} inline /></label>
          <output for="sk-{uid}-{k.id}" class="sk-val">{fmt(k)}</output>
        </div>
        <input
          id="sk-{uid}-{k.id}"
          type="range"
          min={k.min}
          max={k.max}
          step={k.korak}
          {disabled}
          value={vrijednosti[k.id]}
          aria-valuetext={fmt(k)}
          oninput={(e) =>
            (vrijednosti = {
              ...vrijednosti,
              [k.id]: Math.round(Number(e.currentTarget.value) * 1e9) / 1e9,
            })}
        />
      </div>
    {/each}
  </div>
{/if}

<style>
  .sk {
    display: grid;
    gap: 10px;
    max-width: 440px;
    margin: 0 auto 12px;
  }
  .sk-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 2px;
    font-size: 14px;
  }
  .sk-head label {
    color: var(--text-dim);
  }
  .sk-val {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }
  input[type="range"] {
    width: 100%;
    margin: 0;
    height: 30px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  input[type="range"]:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>
