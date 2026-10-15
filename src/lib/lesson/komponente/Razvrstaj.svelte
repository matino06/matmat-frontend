<script>
  // Razvrstavanje: uz svaku stavku gumbi skupina (jedan dodir po stavci, bez povlačenja).
  import Md from "./Md.svelte";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let picks = $state(spec.stavke.map(() => null));
  let shown = $derived(pokazi ? spec.stavke.map((s) => s.kategorija) : picks);
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
<div class="lx-sort">
  {#each spec.stavke as st, i (i)}
    <div class="lx-sort-row" class:ok={pokazi || ishod?.tocno}>
      <span class="lx-sort-item"><Md text={st.tekst} inline /></span>
      <span class="seg">
        {#each spec.kategorije as k, ki (ki)}
          <button class="seg-item" class:active={shown[i] === ki} disabled={locked} onclick={() => (picks[i] = ki)}><Md text={k} inline /></button>
        {/each}
      </span>
    </div>
  {/each}
</div>
<div class="lx-actions">
  <button class="btn btn-primary" disabled={locked || picks.some((p) => p == null)} onclick={() => onodgovor($state.snapshot(picks))}>Provjeri</button>
</div>

<style>
  .lx-sort {
    display: grid;
    gap: 8px;
  }
  .lx-sort-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .lx-sort-row.ok {
    border-color: var(--lx-ok);
  }
  .lx-sort-item {
    flex: 1 1 160px;
  }
</style>
