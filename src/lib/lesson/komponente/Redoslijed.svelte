<script>
  // Poredaj stavke strelicama gore/dolje (pouzdanije na mobitelu od povlačenja).
  import Md from "./Md.svelte";
  import { seededShuffle } from "../core/shuffle.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let order = $state(seededShuffle(spec.stavke.map((_, i) => i), JSON.stringify(spec.stavke)));
  let shown = $derived(pokazi ? spec.stavke.map((_, i) => i) : order);

  function move(pos, d) {
    const to = pos + d;
    if (locked || to < 0 || to >= order.length) return;
    [order[pos], order[to]] = [order[to], order[pos]];
  }
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
<ol class="lx-order">
  {#each shown as i, pos (i)}
    <li class="lx-option" class:ok={ishod?.tocno || pokazi}>
      <span class="lx-mark">{pos + 1}</span>
      <span class="lx-order-text"><Md text={spec.stavke[i]} inline /></span>
      {#if !locked}
        <span class="lx-order-btns">
          <button class="icon-btn" aria-label="Pomakni gore" disabled={pos === 0} onclick={() => move(pos, -1)}>↑</button>
          <button class="icon-btn" aria-label="Pomakni dolje" disabled={pos === shown.length - 1} onclick={() => move(pos, 1)}>↓</button>
        </span>
      {/if}
    </li>
  {/each}
</ol>
<div class="lx-actions">
  <button class="btn btn-primary" disabled={locked} onclick={() => onodgovor($state.snapshot(order))}>Provjeri</button>
</div>

<style>
  .lx-order {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .lx-order li {
    align-items: center;
    padding: 6px 6px 6px 12px;
  }
  .lx-order-text {
    flex: 1;
  }
  .lx-order-btns {
    display: flex;
    gap: 2px;
  }
</style>
