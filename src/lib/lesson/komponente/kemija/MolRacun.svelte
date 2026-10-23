<script>
  // mol_racun: kartice veličina (m, n, N, V, c, M) povezane strelicama s operacijom. Sve vrijednosti, točne i
  // krive, računa katalog/kemija/mol_racun.js iz Ar s lista; ovdje se samo prikazuje. U istraživanju klizač mijenja
  // prvu zadanu veličinu i lanac se računa uživo; u „Tvoj red“ učenik upisuje svaki korak, a widget ne pokazuje
  // nijedan izračunat broj dok ne provjeri. Na uskom zaslonu lanac ide okomito.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";
  import { KONSTANTE } from "$lib/lesson/katalog/kemija/_tablice.js";
  import {
    mol_racun,
    lanac,
    zadaniOf,
    traziOf,
    plinOf,
    formulaZapis,
    arElemenata,
    uvjetiZapis,
    otopinaZapis,
    zadanaM,
    zapisM,
    zapisVrijednosti,
    IME,
  } from "$lib/lesson/katalog/kemija/mol_racun.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = $derived(spec.nacin);
  const istrazi = $derived(nacin === "istrazi");
  const masa = $derived(nacin === "molarna_masa");
  const operacije = $derived(spec.operacije ?? istrazi);
  const zadani = $derived(masa ? [] : zadaniOf(spec));
  const trazeni = $derived(masa ? [] : traziOf(spec));
  const mKorak = $derived(trazeni.some((t) => t.velicina === "M"));
  const M = $derived(zadanaM(spec));
  const pokaziM = $derived((spec.pokazi_M ?? istrazi) && !mKorak && !masa && M != null);
  const pokaziAr = $derived(spec.pokazi_ar ?? masa);
  const formula = $derived(spec.tvar ? formulaZapis(spec.tvar) : "");
  const elementi = $derived(spec.tvar ? arElemenata(spec.tvar) : []);
  const uvjeti = $derived(uvjetiZapis(spec));
  const otopina = $derived(otopinaZapis(spec));
  const uid = Math.random().toString(36).slice(2, 8);

  // pravila koraka (formula za strelicu) ne ovise o brojevima, pa se smiju pokazati i u „Tvoj red“
  const koraci = $derived(masa ? [] : lanac(spec).koraci);

  // konstante s lista koje lanac koristi (uz strelice s operacijama)
  const konstante = $derived.by(() => {
    if (!operacije || masa) return [];
    const sve = [...zadani, ...trazeni].map((x) => x.velicina);
    const out = [];
    if (sve.includes("N")) out.push(`N_A = ${KONSTANTE.NA.zapis}`);
    const g = plinOf(spec);
    if (sve.includes("V") && g?.normirani) out.push(`V_m = ${KONSTANTE.Vm.zapis}`);
    if (sve.includes("V") && g && !g.normirani) out.push(`R = ${KONSTANTE.R.zapis}`, `T = t + ${KONSTANTE.T0.zapis}`);
    return out;
  });

  // ── istraživanje: klizač za prvu zadanu veličinu ──
  const z0 = untrack(() => (spec.nacin === "molarna_masa" ? null : zadaniOf(spec)[0]));
  let klizac = $state(z0?.vrijednost ?? 1);
  const raspon = $derived(spec.raspon ?? [(z0?.vrijednost ?? 1) / 10, (z0?.vrijednost ?? 1) * 3]);
  const korakKlizaca = $derived.by(() => {
    const k = (raspon[1] - raspon[0]) / 200;
    const p = 10 ** Math.floor(Math.log10(k));
    return [1, 2, 5, 10].map((f) => f * p).find((x) => x >= k) ?? k;
  });
  const uzivo = $derived(istrazi ? lanac(spec, Number(klizac)).koraci : []);

  // ── odgovor ──
  let unosi = $state(untrack(() => traziOf(spec).map(() => "")));
  let unosM = $state("");
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  function predaj(e) {
    e.preventDefault();
    if (!locked && potpun) onodgovor($state.snapshot(unosi));
  }
  function potencija(i) {
    const v = String(unosi[i]).trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
    document.getElementById(`mr-${uid}-${i}`)?.focus();
  }
  const ok = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina > i);
  const bad = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;

  // „N_A“, „V_m“ iz kataloga → indeks (tekst dolazi iz koda, ne od autora; ipak se escapea)
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const sub = (t) => esc(t).replace(/([A-Za-z])_([A-Za-z]+)/g, "$1<sub>$2</sub>");

  const tocno = $derived(pokazi ? mol_racun.tocanOdgovor(spec) : "");
  const zapisZadano = (z, i) => (istrazi && i === 0 ? formatSci(Number(klizac)) : formatNumber(z.vrijednost));
  const oznakaM = (k) => (k.velicina === "M" && formula && k.pravilo?.iz.length === 0 ? `M(${formula})` : k.velicina);
  // vodoravno samo kad svaka kartica dobije barem ~150 px (s formulom na strelici); inače okomito
  let sirina = $state(0);
  const vodoravno = $derived(sirina >= 200 * (zadani.length + trazeni.length));
</script>

{#if spec.tekst}<div class="lx-question"><Md text={spec.tekst} /></div>{/if}
{#if istrazi}<p class="mr-hint">Pomiči klizač – ovo nije zadatak, samo istražuješ.</p>{/if}

<div class="mr" bind:clientWidth={sirina}>
  {#if formula || spec.naziv || pokaziM || uvjeti || otopina}
    <div class="mr-tvar">
      {#if formula}<span class="mr-formula">{formula}</span>{/if}
      {#if spec.naziv}<span class="mr-naziv">{spec.naziv}</span>{/if}
      {#if pokaziM}<span class="mr-chip">M = {zapisM(M)}</span>{/if}
      {#if uvjeti}<span class="mr-chip">plin: {uvjeti}</span>{/if}
      {#if otopina}<span class="mr-chip">{otopina}</span>{/if}
    </div>
  {/if}

  {#if pokaziAr && elementi.length}
    <div class="mr-ar" aria-label="Relativne atomske mase s lista">
      <span class="mr-ar-nasl">Ar s lista:</span>
      {#each elementi as e (e.simbol)}<span class="mr-chip mono">{e.simbol} {e.arZapis}</span>{/each}
    </div>
  {/if}

  {#if masa}
    <div class="mr-masa">
      <span class="mr-masa-oznaka">M({formula}) =</span>
      <BrojUnos jedinica="g/mol" {locked} {ishod} bind:vrijednost={unosM} {onodgovor} oznaka="Molarna masa {formula} u g/mol" />
    </div>
  {:else}
    <form onsubmit={predaj}>
     <div class="mr-lanac" class:vodoravno>
      {#each zadani as z, i (z.velicina)}
        {#if i > 0}<div class="mr-i" aria-hidden="true">i</div>{/if}
        <div class="mr-kartica zadano">
          <div class="mr-glava"><span class="mr-sym">{z.velicina}</span><span class="mr-ime">{IME[z.velicina]}</span></div>
          <div class="mr-vrijednost">{zapisZadano(z, i)}{z.jedinica ? ` ${z.jedinica}` : ""}</div>
          {#if istrazi && i === 0}
            <input
              class="mr-klizac"
              type="range"
              min={raspon[0]}
              max={raspon[1]}
              step={korakKlizaca}
              bind:value={klizac}
              aria-label="{IME[z.velicina]} ({z.jedinica || 'broj'})"
            />
          {/if}
        </div>
      {/each}

      {#each trazeni as t, i (t.velicina)}
        <div class="mr-strelica" aria-label={operacije && koraci[i]?.pravilo ? koraci[i].pravilo.formula : "sljedeći korak"}>
          <span class="mr-str-r" aria-hidden="true">→</span><span class="mr-str-d" aria-hidden="true">↓</span>
          {#if operacije && koraci[i]?.pravilo}<span class="mr-op mono">{@html sub(koraci[i].pravilo.formula)}</span>{/if}
        </div>
        <div class="mr-kartica" class:ok={!istrazi && ok(i)} class:bad={!istrazi && bad(i)}>
          <div class="mr-glava"><span class="mr-sym">{oznakaM(koraci[i] ?? t)}</span><span class="mr-ime">{IME[t.velicina]}</span></div>
          {#if istrazi}
            <div class="mr-vrijednost uzivo" aria-live="polite">{uzivo[i] ? zapisVrijednosti(uzivo[i].vrijednost, t.jedinica) : "—"}</div>
          {:else}
            <div class="mr-unos">
              <input
                id="mr-{uid}-{i}"
                class="inp mr-inp"
                class:ok={ok(i)}
                class:bad={bad(i)}
                inputmode="decimal"
                autocomplete="off"
                aria-label="{IME[t.velicina]}{t.jedinica ? ` u ${t.jedinica}` : ''}"
                placeholder="?"
                disabled={locked}
                bind:value={unosi[i]}
              />
              {#if t.jedinica}<span class="lx-unit">{t.jedinica}</span>{/if}
            </div>
            {#if t.velicina === "N" && !locked}
              <div class="mr-pot">
                <button type="button" class="btn btn-quiet" onclick={() => potencija(i)} aria-label="Dodaj potenciju broja 10">·10ⁿ</button>
                <span>npr. 6,02·10^23</span>
              </div>
            {/if}
          {/if}
        </div>
      {/each}
     </div>
      {#if !istrazi}
        <div class="mr-akcija"><button class="btn btn-primary" type="submit" disabled={locked || !potpun}>Provjeri</button></div>
      {/if}
    </form>
  {/if}

  {#if konstante.length}
    <p class="mr-konst">Iz tablica: {#each konstante as k, i (k)}{i ? "; " : ""}<span class="mono">{@html sub(k)}</span>{/each}</p>
  {/if}
</div>

{#if tocno}
  <p class="mr-tocno">Točan odgovor: <b>{tocno}</b></p>
{/if}

<style>
  .mr {
    display: grid;
    gap: 12px;
  }
  .mr-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .mr-tvar {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .mr-formula {
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }
  .mr-naziv {
    color: var(--text-dim);
    font-size: 14px;
  }
  .mr-chip {
    display: inline-block;
    padding: 2px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .mr-ar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .mr-ar-nasl {
    font-size: 13px;
    color: var(--text-faint);
  }
  .mr-masa {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mr-masa-oznaka {
    font-family: var(--font-mono);
    font-size: 16px;
    white-space: nowrap;
  }

  /* lanac: okomito na uskom zaslonu, vodoravno kad stane */
  .mr-lanac {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    max-width: 380px;
  }
  .mr-kartica {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .mr-kartica.zadano {
    background: var(--bg-elev-2);
  }
  .mr-kartica.ok {
    border-color: var(--lx-ok);
  }
  .mr-kartica.bad {
    border-color: var(--lx-bad);
  }
  .mr-glava {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .mr-sym {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
    font-style: italic;
  }
  .mr-ime {
    font-size: 12px;
    color: var(--text-faint);
  }
  .mr-vrijednost {
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }
  .mr-vrijednost.uzivo {
    color: var(--primary);
  }
  .mr-klizac {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .mr-unos {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .mr-inp {
    width: 100%;
    max-width: 150px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .mr-pot {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-faint);
  }
  .mr-pot .btn {
    min-width: 44px;
    min-height: 32px;
    font-family: var(--font-mono);
  }
  .mr-strelica {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
  }
  .mr-str-r {
    display: none;
  }
  .mr-str-d,
  .mr-str-r {
    font-size: 18px;
    line-height: 1;
  }
  .mr-op {
    font-size: 13px;
    color: var(--primary);
    font-weight: 600;
    white-space: nowrap;
  }
  .mr-i {
    padding: 0 0 0 20px;
    font-size: 13px;
    color: var(--text-faint);
  }
  .mr-akcija {
    margin-top: 10px;
  }
  .mr-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .mr-konst {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .mr-tocno {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }
  .mr-tocno b {
    color: var(--success);
    font-family: var(--font-mono);
  }

  /* vodoravno, kad sve kartice stanu u red */
  .mr-lanac.vodoravno {
    flex-direction: row;
    max-width: none;
  }
  .vodoravno .mr-kartica {
    flex: 1 1 0;
  }
  .vodoravno :is(.mr-strelica, .mr-i) {
    flex-direction: column;
    justify-content: center;
    align-self: center;
    gap: 2px;
    padding: 0 2px;
  }
  .vodoravno .mr-str-r {
    display: inline;
  }
  .vodoravno .mr-str-d {
    display: none;
  }
</style>
