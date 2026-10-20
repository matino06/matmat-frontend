<script>
  // poluraspad: polja za upis odgovora (izracunaj). Oznake i jedinice dolaze iz kataloga (poljaIzracunaj).
  // Nakon krivog odgovora polja se ne boje: poruka ispod widgeta kaže što ne valja.
  import Md from "../Md.svelte";

  let {
    polja = [],
    unosi = $bindable([]),
    locked = false,
    tocno = false,
    onposalji = () => {},
  } = $props();
  const uid = Math.random().toString(36).slice(2, 8);
  let el = $state([]);

  function potencija(i) {
    const v = unosi[i].trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
    el[i]?.focus();
  }
  function posalji(e) {
    e.preventDefault();
    if (!locked) onposalji(unosi.map((x) => x.trim()));
  }
</script>

<form class="pr-unos" onsubmit={posalji}>
  {#each polja as p, i (i)}
    <div class="pr-polje">
      <label for="pr-{uid}-{i}">
        <Md text={`$${p.oznaka}$`} inline /> =
        <span class="pr-opis">{p.opis}</span>
      </label>
      <div class="pr-red">
        <input
          id="pr-{uid}-{i}"
          bind:this={el[i]}
          class="inp lx-broj-inp"
          class:ok={tocno}
          inputmode={p.razlomak ? "text" : "decimal"}
          autocomplete="off"
          placeholder={p.razlomak ? "npr. 1/8" : "?"}
          disabled={locked}
          bind:value={unosi[i]}
        />
        {#if p.jedinica}<span class="lx-unit">{p.jedinica}</span>{/if}
        {#if !locked && p.znanstveni}
          <button
            type="button"
            class="btn btn-quiet pr-pomoc"
            onclick={() => potencija(i)}
            aria-label="Dodaj potenciju broja 10">·10ⁿ</button
          >
        {/if}
      </div>
    </div>
  {/each}
  {#if !locked && polja.some((p) => p.razlomak)}
    <p class="pr-napomena">
      Udio i omjer upiši kao razlomak (1/8), omjer (1 : 8) ili decimalni broj.
    </p>
  {/if}
  {#if !locked && polja.some((p) => p.znanstveni)}
    <p class="pr-napomena">Velike i male brojeve piši ovako: 3,01·10^-6.</p>
  {/if}
  <div class="lx-actions">
    <button
      class="btn btn-primary"
      type="submit"
      disabled={locked || unosi.every((x) => !x.trim())}>Provjeri</button
    >
  </div>
</form>

<style>
  .pr-unos {
    display: grid;
    gap: 10px;
  }
  .pr-polje label {
    display: block;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .pr-opis {
    color: var(--text-dim);
  }
  .pr-red {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pr-red .lx-broj-inp {
    width: 170px;
    max-width: 100%;
  }
  .pr-pomoc {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .pr-napomena {
    margin: 0;
    font-size: 12px;
    color: var(--text-faint);
  }
</style>
