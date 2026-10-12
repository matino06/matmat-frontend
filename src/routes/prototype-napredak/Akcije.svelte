<script>
  // PROTOTIP: gumbi koje kreator ima u svakom stanju izrade (isti u svim varijantama, raspored je njihov)
  import { sim, potvrdiPlan, pokusajPonovno, nastavi, odustani } from "./sim.svelte.js";
  let { compact = false } = $props();
  let pitaj = $state(false);
</script>

<div class="akc" class:compact>
  {#if sim.status === "ceka-kreatora"}
    <button class="btn btn-primary" onclick={potvrdiPlan}>Pregledaj i potvrdi plan</button>
  {:else if sim.status === "neuspjelo"}
    <button class="btn btn-primary" onclick={pokusajPonovno}>Pokušaj ponovno</button>
  {:else if sim.status === "gotovo" || (sim.faza === "zadaci" && sim.batch)}
    <button class="btn btn-primary">Počni učiti</button>
  {:else if sim.status === "odustao"}
    <button class="btn btn-ghost">Napravi novi predmet</button>
  {/if}
  {#if sim.status === "ceka-kvotu"}
    <button class="btn btn-ghost proto" onclick={nastavi} title="Samo u prototipu">Simuliraj 1. u mjesecu</button>
  {/if}
  {#if sim.status === "pauzirano"}
    <button class="btn btn-ghost proto" onclick={nastavi} title="Samo u prototipu">Simuliraj nastavak (admin)</button>
  {/if}
  {#if ["radi", "ceka-kvotu", "neuspjelo", "pauzirano"].includes(sim.status) && sim.faza !== "zadaci"}
    {#if pitaj}
      <span class="q">Obrisati nedovršeni predmet? Potrošena kvota se ne vraća.</span>
      <button class="btn btn-ghost danger" onclick={() => { odustani(); pitaj = false; }}>Da, odustani</button>
      <button class="btn btn-quiet" onclick={() => (pitaj = false)}>Ne</button>
    {:else}
      <button class="btn btn-quiet" onclick={() => (pitaj = true)}>Odustani od izrade</button>
    {/if}
  {/if}
</div>

<style>
  .akc { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .q { font-size: 12.5px; color: var(--danger); }
  .danger { color: var(--danger); border-color: var(--danger); }
  .proto { border-style: dashed; }
</style>
