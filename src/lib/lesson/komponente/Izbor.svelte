<script>
  // Jedan točan odgovor: dodir na opciju odmah je odgovor (nema dodatnog gumba).
  import Md from "./Md.svelte";
  import { seededShuffle } from "../core/shuffle.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  let order = $derived(seededShuffle(spec.opcije.map((_, i) => i), JSON.stringify(spec.opcije)));
  let picked = $state(null);

  function pick(i) {
    if (locked) return;
    picked = i;
    onodgovor(i);
  }
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
<div class="lx-options">
  {#each order as i (i)}
    {@const o = spec.opcije[i]}
    <button
      class="lx-option"
      class:ok={(picked === i && ishod?.tocno) || (pokazi && o.tocno)}
      class:bad={picked === i && ishod && !ishod.tocno}
      disabled={locked}
      onclick={() => pick(i)}
    >
      <span class="lx-mark">{(picked === i && ishod?.tocno) || (pokazi && o.tocno) ? "✓" : picked === i && ishod ? "✕" : ""}</span>
      <Md text={o.tekst} inline />
    </button>
  {/each}
</div>
