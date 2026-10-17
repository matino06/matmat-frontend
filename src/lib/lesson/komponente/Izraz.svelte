<script>
  // Matematički odgovor kao na papiru: polje za izraz s gumbima za π, √ i potenciju, a ispod svakog polja
  // pregled kako je aplikacija pročitala unos (KaTeX), da učenik vidi je li „2pi/3“ ono što je mislio.
  import Md from "./Md.svelte";
  import GrafFunkcije from "./GrafFunkcije.svelte";
  import { ucitaj } from "../core/izraz.js";
  import { tocanOdgovor } from "../katalog/index.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let vrijednosti = $state(spec.polja.map(() => ""));
  let polja = $state([]);
  let aktivno = $state(0);

  const vars = $derived(spec.varijable ?? []);
  const pregled = $derived(vrijednosti.map((v) => (String(v).trim() ? ucitaj(v, vars) : null)));
  const potpuno = $derived(vrijednosti.every((v) => String(v).trim()));

  function predaj(e) {
    e?.preventDefault();
    if (!locked && potpuno) onodgovor($state.snapshot(vrijednosti));
  }

  // umetni znak na mjesto kursora u zadnjem aktivnom polju
  function umetni(t) {
    const el = polja[aktivno];
    if (!el || locked) return;
    const [a, b] = [el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length];
    vrijednosti[aktivno] = el.value.slice(0, a) + t + el.value.slice(b);
    const kursor = a + t.length - (t.endsWith("()") ? 1 : 0);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(kursor, kursor);
    });
  }

  const losePolje = (i) => ishod && !ishod.tocno && !ishod.prazno && ishod.polje === i;
  const dobroPolje = (i) => !!ishod?.tocno || (ishod && !ishod.prazno && ishod.polje > i && !spec.bilo_kojim_redom);
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
{#if spec.graf}<div class="iz-graf"><GrafFunkcije spec={{ ...spec.graf, nacin: "prikaz", tekst: "" }} bezTeksta /></div>{/if}

<form class="iz" onsubmit={predaj}>
  {#each spec.polja as p, i (i)}
    <div class="iz-red">
      {#if p.oznaka}<label class="iz-oznaka" for="iz-{i}-{spec.tekst.length}"><Md text={p.oznaka} inline /></label>{/if}
      <div class="iz-polje">
        <input
          id="iz-{i}-{spec.tekst.length}"
          class="inp iz-inp"
          class:ok={dobroPolje(i)}
          class:bad={losePolje(i)}
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="?"
          disabled={locked}
          bind:this={polja[i]}
          bind:value={vrijednosti[i]}
          onfocus={() => (aktivno = i)}
        />
        {#if p.iza}<span class="iz-iza"><Md text={p.iza} inline /></span>{/if}
        <div class="iz-pregled" aria-live="polite">
          {#if pregled[i]?.greska}
            <span class="iz-greska">{pregled[i].greska}</span>
          {:else if pregled[i]}
            <Md text={`$= ${pregled[i].tex}$`} inline />
          {/if}
        </div>
      </div>
    </div>
  {/each}
  {#if !locked}
    <div class="iz-tipke" aria-label="Posebni znakovi">
      {#each [["π", "π"], ["√", "√()"], ["x²", "^2"], ["xⁿ", "^"], ["/", "/"]] as [oznaka, t] (oznaka)}
        {#if oznaka !== "x²" || vars.length}
          <button type="button" class="iz-tipka" onmousedown={(e) => e.preventDefault()} onclick={() => umetni(t)}>{oznaka}</button>
        {/if}
      {/each}
    </div>
  {/if}
  <div class="lx-actions">
    <button class="btn btn-primary" type="submit" disabled={locked || !potpuno}>Provjeri</button>
  </div>
</form>
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
    padding-top: 9px;
    text-align: right;
    white-space: nowrap;
  }
  .iz-polje {
    flex: 1;
    max-width: 320px;
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 8px;
  }
  .iz-iza {
    padding-top: 9px;
    white-space: nowrap;
  }
  .iz-inp {
    width: 100%;
    height: var(--lx-control);
    padding: 4px 10px;
    font-family: var(--font-mono);
    font-size: 16px;
  }
  .iz-pregled {
    grid-column: 1 / -1;
    min-height: 22px;
    padding: 3px 2px 0;
    font-size: 15px;
    color: var(--text-dim);
  }
  .iz-greska {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .iz-tipke {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .iz-tipka {
    min-width: 40px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 15px;
    cursor: pointer;
  }
  .iz-tipka:hover {
    border-color: var(--primary-border);
  }
</style>
