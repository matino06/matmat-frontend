<script>
  // Pretvorba jedinica: „3600 mm² = [ ] cm²“, lanac „8 m = [ ] dm = [ ] cm“ ili mješoviti zapis „2 m 7 dm = [ ] cm“,
  // po želji sa stubama jedinica kao pomoći. Rezultate i tipične greške računa katalog; stube samo pokazuju faktor
  // svakog koraka.
  import Md from "./Md.svelte";
  import BrojUnos from "./BrojUnos.svelte";
  import { formatNumber } from "../core/number.js";
  import { normUnit } from "../core/units.js";
  import { pretvorba_jedinica } from "../katalog/istrazivanje.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const odJ = $derived([].concat(spec.od).map(normUnit));
  const doJ = $derived([].concat(spec.do).map(normUnit));
  const zadano = $derived([].concat(spec.vrijednost).map((v, i) => `${formatNumber(v)} ${odJ[i]}`).join(" "));
  const istaknute = $derived([...odJ, ...doJ]);

  // Jednake jedinice (dm³ i L, cm³ i mL) stoje na istoj stubi.
  const stube = $derived.by(() => {
    if (!spec.stube) return [];
    const out = [];
    for (const s of pretvorba_jedinica.stube(spec)) {
      const zadnja = out.at(-1);
      if (zadnja && Math.abs(zadnja.faktor - s.faktor) <= 1e-12 * zadnja.faktor) zadnja.jedinice.push(s.jedinica);
      else out.push({ faktor: s.faktor, jedinice: [s.jedinica] });
    }
    return out;
  });
  // stube idu od veće prema manjoj; ako je „od“ na vrhu, put ide prema dolje (množenje)
  const prema_dolje = $derived(stube[0]?.jedinice.includes(odJ[0]) ?? true);
  const uvlaka = $derived(stube.length > 1 ? Math.min(32, 150 / (stube.length - 1)) : 0);
  const faktor = (i) => formatNumber(stube[i].faktor / stube[i + 1].faktor);

  const tocno = $derived(pokazi ? pretvorba_jedinica.tocanOdgovor(spec) : "");
  let unos = $state("");
  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let unosi = $state(doJ.map(() => ""));
  const lanac = $derived(doJ.length > 1);
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  function predaj(e) {
    e.preventDefault();
    if (!locked && potpun) onodgovor($state.snapshot(unosi));
  }
</script>

<div class="lx-question"><Md text={spec.tekst || "Pretvori."} /></div>

{#if stube.length > 1}
  <ol class="pj-stube" aria-label="Stube jedinica od veće prema manjoj">
    {#each stube as s, i (s.jedinice.join("="))}
      <li class="pj-stuba" style="margin-left: {i * uvlaka}px">
        <span class="pj-jed" class:kraj={s.jedinice.some((j) => istaknute.includes(j))}>
          {#each s.jedinice as j, k (j)}{k ? " = " : ""}<span class:istaknuto={istaknute.includes(j)}>{j}</span>{/each}
        </span>
      </li>
      {#if i < stube.length - 1}
        <li class="pj-korak" style="margin-left: {i * uvlaka + 14}px" aria-label="između {s.jedinice[0]} i {stube[i + 1].jedinice[0]}: prema dolje puta {faktor(i)}, prema gore podijeljeno s {faktor(i)}">
          <span class="pj-dolje" class:put={prema_dolje} aria-hidden="true">↓ × {faktor(i)}</span>
          <span class="pj-gore" class:put={!prema_dolje} aria-hidden="true">↑ : {faktor(i)}</span>
        </li>
      {/if}
    {/each}
  </ol>
{/if}

{#if lanac}
  <form class="pj-red" onsubmit={predaj}>
    <span class="pj-zadano">{zadano} =</span>
    {#each doJ as j, i (j)}
      <span class="pj-karika">
        <input
          class="inp pj-inp"
          class:ok={ishod?.tocno || (ishod && ishod.praznina > i)}
          class:bad={ishod && !ishod.tocno && ishod.praznina === i && !ishod.prazno}
          inputmode="decimal"
          autocomplete="off"
          aria-label="Vrijednost u {j}"
          placeholder="?"
          disabled={locked}
          bind:value={unosi[i]}
        />
        <span class="lx-unit">{j}</span>{#if i < doJ.length - 1}<span class="pj-jednako">=</span>{/if}
      </span>
    {/each}
    <button class="btn btn-primary" type="submit" disabled={locked || !potpun}>Provjeri</button>
  </form>
{:else}
  <div class="pj-red">
    <span class="pj-zadano">{zadano} =</span>
    <BrojUnos jedinica={doJ[0]} {locked} {ishod} bind:vrijednost={unos} {onodgovor} oznaka="Vrijednost u {doJ[0]}" />
  </div>
{/if}

{#if tocno}
  <p class="pj-tocno">Točan odgovor: <b>{tocno}</b></p>
{/if}

<style>
  .pj-stube {
    list-style: none;
    margin: 0 0 16px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    max-width: 360px;
  }
  .pj-stuba {
    display: flex;
  }
  /* svaka stuba je gazište s rubom ispod i lijevo, pa se niz čita kao stepenice prema dolje */
  .pj-jed {
    display: inline-block;
    min-width: 64px;
    padding: 4px 10px;
    border-bottom: 2px solid var(--border-strong);
    border-left: 2px solid var(--border-strong);
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text-dim);
  }
  .pj-jed.kraj {
    border-color: var(--primary);
    background: var(--primary-dim);
    color: var(--text-dim);
  }
  .pj-jed .istaknuto {
    color: var(--text);
    font-weight: 700;
  }
  .pj-korak {
    display: flex;
    gap: 12px;
    padding: 3px 0;
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-faint);
    white-space: nowrap;
  }
  .pj-korak .put {
    color: var(--primary);
    font-weight: 600;
  }
  .pj-red {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pj-zadano {
    font-family: var(--font-mono);
    font-size: 16px;
    white-space: nowrap;
  }
  .pj-karika {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .pj-inp {
    width: 96px;
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px;
  }
  .pj-jednako {
    margin-left: 2px;
    font-family: var(--font-mono);
    font-size: 16px;
  }
  .pj-tocno {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }
  .pj-tocno b {
    color: var(--success);
    font-family: var(--font-mono);
  }
</style>
