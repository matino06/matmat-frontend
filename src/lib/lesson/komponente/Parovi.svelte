<script>
  // Spajanje parova dodirom: lijevo pa desno. Spojeni par dobiva isti broj; ponovni dodir ga razdvaja.
  import Md from "./Md.svelte";
  import { seededShuffle } from "../core/shuffle.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  let right = $derived(seededShuffle(spec.parovi.map((_, i) => i), JSON.stringify(spec.parovi)));
  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let map = $state(spec.parovi.map(() => null)); // lijevi indeks → desni indeks
  let active = $state(null);

  let shown = $derived(pokazi ? spec.parovi.map((_, i) => i) : map);
  const pairOf = (j) => shown.indexOf(j);

  function tapLeft(i) {
    if (locked) return;
    if (map[i] != null) map[i] = null;
    active = active === i ? null : i;
  }
  function tapRight(j) {
    if (locked || active == null) return;
    const prev = map.indexOf(j);
    if (prev >= 0) map[prev] = null;
    map[active] = j;
    active = map.findIndex((x) => x == null);
    if (active < 0) active = null;
  }
</script>

<div class="lx-question"><Md text={spec.tekst} /><span class="lx-hint">Dodirni pojam lijevo, pa njegov par desno.</span></div>
<div class="lx-pairs">
  <div class="lx-col">
    {#each spec.parovi as p, i (i)}
      <button class="lx-option" class:sel={active === i} class:ok={ishod?.tocno || pokazi} disabled={locked} onclick={() => tapLeft(i)}>
        <span class="lx-mark">{shown[i] != null ? i + 1 : ""}</span>
        <Md text={p.lijevo} inline />
      </button>
    {/each}
  </div>
  <div class="lx-col">
    {#each right as j (j)}
      <button class="lx-option" class:ok={ishod?.tocno || pokazi} disabled={locked || active == null} onclick={() => tapRight(j)}>
        <span class="lx-mark">{pairOf(j) >= 0 ? pairOf(j) + 1 : ""}</span>
        <Md text={spec.parovi[j].desno} inline />
      </button>
    {/each}
  </div>
</div>
<div class="lx-actions">
  <button class="btn btn-primary" disabled={locked || map.some((x) => x == null)} onclick={() => onodgovor($state.snapshot(map))}>Provjeri</button>
  {#if !locked && map.some((x) => x != null)}<button class="btn btn-quiet" onclick={() => ((map = spec.parovi.map(() => null)), (active = 0))}>Ispočetka</button>{/if}
</div>

<style>
  .lx-pairs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .lx-col {
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .lx-col .lx-option:disabled:not(.ok) {
    opacity: 1;
  }
</style>
