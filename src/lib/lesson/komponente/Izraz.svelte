<script>
  // Matematički odgovor u matematičkom polju (MathLive) s istom tipkovnicom kao na probnoj maturi: razlomak,
  // korijen, π i potencija iscrtavaju se odmah u polju, kao na papiru. Polje daje LaTeX, a provjera ga čita
  // (core/izraz.js: izLatexa) i uspoređuje vrijednosti.
  import { onMount } from "svelte";
  import Md from "./Md.svelte";
  import GrafFunkcije from "./GrafFunkcije.svelte";
  import { ucitajLatex } from "../core/izraz.js";
  import { tocanOdgovor } from "../katalog/index.js";
  import { ucitajMatematickiUnos, postaviKartice } from "$lib/utils/maturaTipkovnica.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let vrijednosti = $state(spec.polja.map(() => ""));
  let polja = $state([]);
  let spremno = $state(false);

  const vars = $derived(spec.varijable ?? []);
  // greška čitanja (npr. prazno mjesto u razlomku) vidi se odmah, prije provjere
  const greske = $derived(vrijednosti.map((v) => (String(v).trim() ? ucitajLatex(v, vars).greska : null)));
  const potpuno = $derived(vrijednosti.every((v) => String(v).trim()));

  onMount(async () => {
    await ucitajMatematickiUnos();
    spremno = true;
  });

  $effect(() => {
    for (const mf of polja) if (mf) mf.readOnly = locked;
  });

  function predaj() {
    if (!locked && potpuno) onodgovor($state.snapshot(vrijednosti));
  }

  function tipka(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      predaj();
    }
  }

  const losePolje = (i) => ishod && !ishod.tocno && !ishod.prazno && ishod.polje === i;
  const dobroPolje = (i) => !!ishod?.tocno || (ishod && !ishod.prazno && ishod.polje > i && !spec.bilo_kojim_redom);
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
{#if spec.graf}<div class="iz-graf"><GrafFunkcije spec={{ ...spec.graf, nacin: "prikaz", tekst: "" }} bezTeksta /></div>{/if}

<div class="iz">
  {#each spec.polja as p, i (i)}
    <div class="iz-red">
      {#if p.oznaka}<span class="iz-oznaka"><Md text={p.oznaka} inline /></span>{/if}
      <div class="iz-polje">
        {#if spremno}
          <math-field
            class="iz-mf"
            class:ok={dobroPolje(i)}
            class:bad={losePolje(i)}
            aria-label={p.oznaka ? p.oznaka.replace(/\$/g, "") : "Odgovor"}
            bind:this={polja[i]}
            onfocus={() => postaviKartice("brojevi")}
            oninput={(e) => (vrijednosti[i] = e.target.value)}
            onkeydown={tipka}
          ></math-field>
        {:else}
          <div class="iz-mf iz-ucitavanje">…</div>
        {/if}
        {#if p.iza}<span class="iz-iza"><Md text={p.iza} inline /></span>{/if}
        {#if greske[i]}<p class="iz-greska">{greske[i]}</p>{/if}
      </div>
    </div>
  {/each}
  <div class="lx-actions">
    <button class="btn btn-primary" type="button" disabled={locked || !potpuno} onclick={predaj}>Provjeri</button>
  </div>
</div>
{#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}

<style>
  .iz-graf {
    margin: 4px 0 10px;
  }
  .iz {
    display: grid;
    gap: 10px;
  }
  .iz-red {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .iz-oznaka {
    min-width: 44px;
    padding-top: 11px;
    text-align: right;
    white-space: nowrap;
  }
  .iz-polje {
    flex: 1;
    max-width: 340px;
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 8px;
    align-items: center;
  }
  .iz-mf {
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
  .iz-mf:focus-within {
    outline: none;
    border-color: var(--primary-border);
  }
  .iz-mf.ok {
    border-color: var(--lx-ok);
  }
  .iz-mf.bad {
    border-color: var(--lx-bad);
  }
  .iz-ucitavanje {
    color: var(--text-faint);
  }
  .iz-iza {
    white-space: nowrap;
  }
  .iz-greska {
    grid-column: 1 / -1;
    margin: 4px 2px 0;
    font-size: 12.5px;
    color: var(--text-faint);
  }
</style>
