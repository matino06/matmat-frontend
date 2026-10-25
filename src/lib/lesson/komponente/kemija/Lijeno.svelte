<script>
  // Kemijski widget koji se učitava tek kad je potreban: komponentu bira spec.tip, a svi ostali propsi (locked,
  // pokazi, ishod, onodgovor) prosljeđuju se nepromijenjeni.
  import { UCITAJ_KEMIJA } from "./ucitaj.js";

  let props = $props();
  let ucitano = $derived(UCITAJ_KEMIJA[props.spec.tip]());
</script>

{#await ucitano}
  <div class="lx-ucitavanje" aria-busy="true">Učitavanje…</div>
{:then modul}
  <modul.default {...props} />
{:catch}
  <p class="lx-solution">Ovaj dio se nije učitao. Osvježi stranicu.</p>
{/await}

<style>
  .lx-ucitavanje {
    min-height: 120px;
    display: grid;
    place-items: center;
    color: var(--text-faint);
    font-size: 13px;
  }
</style>
