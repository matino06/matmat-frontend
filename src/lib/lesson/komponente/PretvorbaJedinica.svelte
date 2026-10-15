<script>
  // Pretvorba jedinica: „3600 mm² = [ ] cm²“, po želji sa stubama jedinica kao pomoći.
  // Rezultat i tipične greške računa katalog; stube samo pokazuju faktor svakog koraka.
  import Md from "./Md.svelte";
  import BrojUnos from "./BrojUnos.svelte";
  import { formatNumber } from "../core/number.js";
  import { normUnit } from "../core/units.js";
  import { pretvorba_jedinica } from "../katalog/istrazivanje.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const od = $derived(normUnit(spec.od));
  const doJ = $derived(normUnit(spec.do));

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
  const prema_dolje = $derived(stube[0]?.jedinice.includes(od) ?? true);
  const uvlaka = $derived(stube.length > 1 ? Math.min(32, 150 / (stube.length - 1)) : 0);
  const faktor = (i) => formatNumber(stube[i].faktor / stube[i + 1].faktor);

  const tocno = $derived(pokazi ? pretvorba_jedinica.tocanOdgovor(spec) : "");
  let unos = $state("");
</script>

<div class="lx-question"><Md text={spec.tekst || "Pretvori."} /></div>

{#if stube.length > 1}
  <ol class="pj-stube" aria-label="Stube jedinica od veće prema manjoj">
    {#each stube as s, i (s.jedinice.join("="))}
      <li class="pj-stuba" style="margin-left: {i * uvlaka}px">
        <span class="pj-jed" class:kraj={s.jedinice.includes(od) || s.jedinice.includes(doJ)}>
          {#each s.jedinice as j, k (j)}{k ? " = " : ""}<span class:istaknuto={j === od || j === doJ}>{j}</span>{/each}
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

<div class="pj-red">
  <span class="pj-zadano">{formatNumber(spec.vrijednost)} {od} =</span>
  <BrojUnos jedinica={doJ} {locked} {ishod} bind:vrijednost={unos} {onodgovor} oznaka="Vrijednost u {doJ}" />
</div>

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
