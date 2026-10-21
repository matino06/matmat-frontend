<script>
  // Polje za broj s jedinicom i gumbom Provjeri; dijele ga svi widgeti s brojčanim odgovorom.
  // Decimalna tipkovnica na iPhoneu nema minus ni potenciju, pa uz odgovor koji ih treba (negativan, ili tako velik ili
  // malen da se piše znanstvenim zapisom) polje dobiva gumbe „±“ i „·10ⁿ“. `odgovor` služi samo da se to odluči.
  // Widgeti fizike umjesto toga zadaju `gumbPredznak` / `gumbPotencija` prema traženoj veličini, da gumbi ne odaju
  // predznak ni red veličine odgovora.
  let { jedinica = "", locked = false, ishod = null, vrijednost = $bindable(""), onodgovor, oznaka = "Odgovor", odgovor = null, gumbPredznak = null, gumbPotencija = null } = $props();

  let polje;
  let predznak = $derived(gumbPredznak ?? (typeof odgovor === "number" && odgovor < 0));
  let znanstveni = $derived(gumbPotencija ?? (typeof odgovor === "number" && odgovor !== 0 && (Math.abs(odgovor) >= 1e6 || Math.abs(odgovor) < 1e-3)));

  function submit(e) {
    e.preventDefault();
    if (!locked && vrijednost.trim()) onodgovor(vrijednost);
  }

  function promijeniPredznak() {
    const v = vrijednost.trim();
    vrijednost = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : `−${v}`;
    polje?.focus();
  }

  function potencija() {
    const v = vrijednost.trim();
    if (!/10\^/.test(v)) vrijednost = `${v || "1"}·10^`;
    polje?.focus();
  }
</script>

<form class="lx-broj" onsubmit={submit}>
  <input
    bind:this={polje}
    class="inp lx-broj-inp"
    class:ok={ishod?.tocno}
    class:bad={ishod && !ishod.tocno && !ishod.prazno}
    inputmode="decimal"
    autocomplete="off"
    aria-label={oznaka}
    placeholder="?"
    disabled={locked}
    bind:value={vrijednost}
  />
  {#if jedinica}<span class="lx-unit">{jedinica}</span>{/if}
  <button class="btn btn-primary" type="submit" disabled={locked || !vrijednost.trim()}>Provjeri</button>
</form>
{#if (predznak || znanstveni) && !locked}
  <div class="lx-broj-pomoc">
    {#if predznak}<button type="button" class="btn btn-quiet" onclick={promijeniPredznak} aria-label="Promijeni predznak">±</button>{/if}
    {#if znanstveni}<button type="button" class="btn btn-quiet" onclick={potencija} aria-label="Dodaj potenciju broja 10">·10ⁿ</button>{/if}
    {#if znanstveni}<span class="lx-broj-primjer">npr. 1,6·10^-19</span>{/if}
  </div>
{/if}

<style>
  .lx-broj-pomoc {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
  }
  .lx-broj-pomoc .btn {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .lx-broj-primjer {
    font-size: 12px;
    color: var(--text-faint);
  }
</style>
