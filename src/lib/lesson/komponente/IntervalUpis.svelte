<script>
  // Zapis skupa u matematičkom polju (interval „upisi“): učenik sam piše ⟨−∞, 1⟩ ∪ [3, +∞⟩ kao na maturi. Tipkovnica
  // se otvara na kartici sa zagradama ⟨ ⟩ [ ], ∪, ∞ i ℝ. Krivi zapis (npr. prazno mjesto) javlja se odmah.
  import { onMount } from "svelte";
  import Md from "./Md.svelte";
  import { ucitajSkupLatex } from "../core/skup.js";
  import { tocanOdgovor } from "../katalog/index.js";
  import { ucitajMatematickiUnos, postaviKartice } from "$lib/utils/maturaTipkovnica.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  let vrijednost = $state("");
  let polje = $state();
  let spremno = $state(false);

  const greska = $derived(vrijednost.trim() ? ucitajSkupLatex(vrijednost).greska : null);

  onMount(async () => {
    await ucitajMatematickiUnos();
    spremno = true;
  });

  $effect(() => {
    if (polje) polje.readOnly = locked;
  });

  function predaj() {
    if (!locked && vrijednost.trim()) onodgovor(vrijednost);
  }

  function tipka(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      predaj();
    }
  }
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
<p class="lx-hint">Zapiši skup: ⟨ ⟩ za kraj koji nije u skupu, [ ] za kraj koji jest, ∪ između dijelova.</p>

<div class="iu">
  <span class="iu-oznaka"><Md text={spec.oznaka ?? "$x \\in$"} inline /></span>
  <div class="iu-polje">
    {#if spremno}
      <math-field
        class="iu-mf"
        class:ok={ishod?.tocno}
        class:bad={ishod && !ishod.tocno && !ishod.prazno}
        aria-label="Zapis skupa"
        bind:this={polje}
        onfocus={() => postaviKartice("skupovi")}
        onblur={() => postaviKartice("brojevi")}
        oninput={(e) => (vrijednost = e.target.value)}
        onkeydown={tipka}
      ></math-field>
    {:else}
      <div class="iu-mf iu-ucitavanje">…</div>
    {/if}
    {#if greska}<p class="iu-greska">{greska}</p>{/if}
  </div>
</div>
<div class="lx-actions">
  <button class="btn btn-primary" type="button" disabled={locked || !vrijednost.trim()} onclick={predaj}>Provjeri</button>
</div>
{#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}

<style>
  .iu {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .iu-oznaka {
    min-width: 44px;
    padding-top: 11px;
    text-align: right;
    white-space: nowrap;
  }
  .iu-polje {
    flex: 1;
    max-width: 420px;
  }
  .iu-mf {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 19px;
    --keyboard-zindex: 1500;
    --caret-color: var(--primary);
    --selection-background-color: color-mix(in srgb, var(--primary) 25%, transparent);
    --contains-highlight-background-color: transparent;
  }
  .iu-mf:focus-within {
    outline: none;
    border-color: var(--primary-border);
  }
  .iu-mf.ok {
    border-color: var(--lx-ok);
  }
  .iu-mf.bad {
    border-color: var(--lx-bad);
  }
  .iu-ucitavanje {
    color: var(--text-faint);
  }
  .iu-greska {
    margin: 4px 2px 0;
    font-size: 12.5px;
    color: var(--text-faint);
  }
</style>
