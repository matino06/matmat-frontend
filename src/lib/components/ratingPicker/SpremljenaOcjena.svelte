<script>
  import RatingPicker, { ocjena } from "./RatingPicker.svelte";
  import { objasnjenjeOcjene } from "$lib/lesson/ocjena.js";
  import { kada } from "$lib/uvod/scenarij";

  // Ocjena interaktivne lekcije, spremljena čim je lekcija gotova: učenici često misle da je riješen zadatak dovoljan
  // i ne potvrde ocjenu. Dok ne krene dalje, smije je promijeniti.
  // spremljena: { grade, days } (days: dani do ponavljanja za svaku ocjenu, indeks ocjena - 1, ili null);
  // sazetak: kako je prošla lekcija (LessonRunner), za objašnjenje i najvišu ocjenu;
  // onpromijeni(rating): sprema novu ocjenu, baca grešku ako nije uspjelo; bez njega se ocjena ne može promijeniti.
  let { spremljena, sazetak = null, onpromijeni = null, ondalje, dalje = "Sljedeći zadatak" } = $props();

  let mijenja = $state(false);
  let sprema = $state(false);
  let r = $derived(ocjena(spremljena.grade));
  let za = $derived(spremljena.days?.[spremljena.grade - 1]);

  async function odaberi(nova) {
    sprema = true;
    try {
      await onpromijeni(nova);
      mijenja = false;
    } catch {
      // poruku prikazuje stranica; ostaje na odabiru
    } finally {
      sprema = false;
    }
  }
</script>

<div class="rating-row" data-tour="ocjena">
  {#if !mijenja}
    <div class="rating-label">Ocjena je spremljena prema tome kako ti je išlo</div>
    <div class="so-row">
      <span class="so-chosen" style="color:{r.color}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {r.t}
      </span>
      {#if za != null}<span class="so-kada">vraća se {kada(za)}</span>{/if}
      <div class="so-btns">
        <button class="btn btn-primary" onclick={ondalje}>{dalje}</button>
        {#if onpromijeni}
          <button class="btn btn-ghost" onclick={() => (mijenja = true)}>Promijeni ocjenu</button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="rating-label">Kako ti je išlo?</div>
    {#if sazetak}<p class="so-note">{objasnjenjeOcjene(sazetak)}</p>{/if}
    <!-- dani od stanja prije ove ocjene: backend ih je vratio pri spremanju -->
    <RatingPicker days={spremljena.days ?? [null, null, null, null]} najvise={sazetak?.najvise ?? 4} onSelect={odaberi} />
    <div class="so-btns">
      <button class="btn btn-ghost" onclick={() => (mijenja = false)} disabled={sprema}>Odustani</button>
    </div>
  {/if}
</div>

<style>
  .so-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .so-chosen {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 600;
  }
  .so-kada {
    font-size: 14px;
    color: var(--text-dim);
  }
  .so-btns {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .so-note {
    margin: 4px 0 10px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--text-dim);
  }
</style>
