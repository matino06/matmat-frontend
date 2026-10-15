<script>
  // Označi sve točne: odabir se mijenja dodirom, a provjerava tek na gumb.
  import Md from "./Md.svelte";
  import { seededShuffle } from "../core/shuffle.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  let order = $derived(seededShuffle(spec.opcije.map((_, i) => i), JSON.stringify(spec.opcije)));
  let chosen = $state([]);

  function toggle(i) {
    if (locked) return;
    chosen = chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i];
  }
</script>

<div class="lx-question"><Md text={spec.tekst} /><span class="lx-hint">Označi sve točne.</span></div>
<div class="lx-options">
  {#each order as i (i)}
    {@const o = spec.opcije[i]}
    <button
      class="lx-option"
      class:sel={chosen.includes(i) && !pokazi}
      class:ok={pokazi && o.tocno}
      class:bad={pokazi && chosen.includes(i) && !o.tocno}
      disabled={locked}
      onclick={() => toggle(i)}
      aria-pressed={chosen.includes(i)}
    >
      <span class="lx-mark box">{chosen.includes(i) || (pokazi && o.tocno) ? "✓" : ""}</span>
      <Md text={o.tekst} inline />
    </button>
  {/each}
</div>
<div class="lx-actions">
  <button class="btn btn-primary" disabled={locked || !chosen.length} onclick={() => onodgovor(chosen)}>Provjeri</button>
</div>
{#if ishod && !ishod.tocno}<span class="sr-only">{ishod.poruka}</span>{/if}
