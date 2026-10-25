<script>
  // Elektronska konfiguracija: kućice orbitala sa strelicama, zapis (puni i skraćeni) i model ljuski. Sve brojeve,
  // točne odgovore i poruke računa katalog/kemija/elektronska_konfiguracija.js; ovdje se samo crta.
  // Raspored kućica: „energija“ (svaka podljuska svoj redak, najniža dolje, uvučeno po s/p/d) za istraživanje i
  // „ljuske“ (redak = ljuska) za popunjavanje, jer poredak po energiji odao bi redoslijed popunjavanja. U koraku
  // „Tvoj red“ ništa ne odaje odgovor prije provjere: nema boja ni brojača po podljuskama, a točne kućice, zapis i
  // napomene pojavljuju se tek nakon provjere ili „Pokaži odgovor“.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import "$lib/sketch/sketch.css";
  import { renderSketch } from "$lib/sketch/taskSketch.js";
  import { ELEMENTI, PO_SIMBOLU } from "$lib/lesson/katalog/kemija/_tablice.js";
  import {
    cesticaIz,
    zapisCestice,
    elektroniCestice,
    naboji,
    podljuskeCestice,
    puniZapis,
    skraceniZapis,
    procitajZapis,
    tokeniZapisa,
    kuciceOd,
    nespareniOd,
    rasporedPoLjuskama,
    valentniCestice,
    podljuskePrikaza,
    rasporedOd,
    retci,
    STRELICE,
    ORBITALA,
    MAX_Z_ISTRAZI,
    iznimkaTekst,
    ionTekst,
    pitajOd,
    IME_PITAJ,
    tocneVrijednosti,
    dopusten,
  } from "$lib/lesson/katalog/kemija/elektronska_konfiguracija.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = $derived(spec.nacin);
  const pitanje = $derived(nacin !== "istrazi");
  const gotovo = $derived(pokazi || !!ishod?.tocno);
  const tokeni = (zapis) => zapis.split(" ");
  const lOd = (k) => "spd".indexOf(k[1]);

  // ── istraži: klizač Z i ioni ──
  const doZ = $derived(spec.doZ ?? MAX_Z_ISTRAZI);
  const pocetna = untrack(() => (spec.nacin === "istrazi" && spec.element ? cesticaIz(spec.element) : null));
  let z = $state(pocetna?.e.z ?? 8);
  let naboj = $state(pocetna?.naboj ?? 0);
  let rasporedIstrazi = $state(untrack(() => rasporedOd(spec)));
  const elementZ = $derived(ELEMENTI.find((e) => e.z === z));
  const nabojiZ = $derived(nacin === "istrazi" ? naboji(elementZ) : []);
  function postaviZ(n) {
    const v = Math.max(1, Math.min(doZ, n));
    if (v !== z) naboj = 0;
    z = v;
  }

  // ── čestica i točna konfiguracija ──
  const cestica = $derived(nacin === "istrazi" ? { e: elementZ, naboj } : cesticaIz(spec.element));
  const tocna = $derived(cestica ? podljuskeCestice(cestica) : {});
  const prikaz = $derived(cestica ? (nacin === "istrazi" ? podljuskePrikaza({}, cestica, 1) : podljuskePrikaza(spec, cestica)) : { jezgra: null, podljuske: [] });
  const raspored = $derived(nacin === "istrazi" ? rasporedIstrazi : rasporedOd(spec));
  const redovi = $derived(retci(prikaz.podljuske, raspored));
  const jezgraE = $derived(prikaz.jezgra ? PO_SIMBOLU[prikaz.jezgra].z : 0);

  // ── popuni: stanja kućica (0 prazno, 1 ↑, 2 ↑↓, 3 ↓) ──
  const prazne = (pod) => Object.fromEntries(pod.map((k) => [k, Array(ORBITALA[k[1]]).fill(0)]));
  let stanja = $state(untrack(() => (spec.nacin === "popuni" ? prazne(prikaz.podljuske) : {})));
  const tocneKucice = $derived(Object.fromEntries(prikaz.podljuske.map((k) => [k, kuciceOd(k, tocna[k] ?? 0)])));
  const kucice = $derived(nacin === "popuni" ? stanja : tocneKucice);
  const NA_KUCICI = [0, 1, 2, 1];
  const ucrtano = $derived(nacin === "popuni" ? Object.values(stanja).reduce((a, x) => a + x.reduce((b, v) => b + NA_KUCICI[v], 0), 0) : 0);
  function dodir(k, i) {
    if (nacin !== "popuni" || locked) return;
    stanja[k][i] = (stanja[k][i] + 1) % 4;
  }
  const ocistiSve = () => !locked && (stanja = prazne(prikaz.podljuske));
  // obrub krive podljuske samo dok učenik ne promijeni kućice nakon provjere
  let poslano = $state(null);
  const losaPodljuska = $derived(ishod && !ishod.tocno && poslano === JSON.stringify(stanja) ? (ishod.podljuska ?? null) : null);
  function provjeriKucice() {
    if (locked || !ucrtano) return;
    poslano = JSON.stringify(stanja);
    onodgovor($state.snapshot(stanja));
  }

  // ── zapiši ──
  let unos = $state("");
  const procitano = $derived(nacin === "zapisi" ? procitajZapis(unos) : null);
  const pregled = $derived(procitano ? tokeniZapisa(procitano) : []);
  const oblik = $derived(spec.oblik ?? "bilo");
  const JEZGRE = ["He", "Ne", "Ar", "Kr", "Xe"];
  function jezgraUnos(j) {
    if (locked) return;
    unos = `[${j}] ${unos.replace(/^\s*\[[^\]]*\]\s*/, "")}`;
  }
  function provjeriZapis(ev) {
    ev?.preventDefault();
    if (locked || !unos.trim()) return;
    onodgovor(unos);
  }

  // ── nespareni ──
  const pitaj = $derived(nacin === "nespareni" ? pitajOd(spec) : []);
  let polja = $state(untrack(() => Object.fromEntries(pitajOd(spec).map((q) => [q, ""]))));
  const spremno = $derived(pitaj.every((q) => String(polja[q] ?? "").trim()));
  const OZNAKA = { nespareni: "Nespareni elektroni", valentni: "Valentni elektroni", brojLjusaka: "Broj ljusaka", raspored: "Raspored po ljuskama" };
  function provjeriBrojeve(ev) {
    ev?.preventDefault();
    if (locked || !spremno) return;
    onodgovor(pitaj.length === 1 ? polja[pitaj[0]] : $state.snapshot(polja));
  }

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "popuni") stanja = $state.snapshot(tocneKucice);
      if (nacin === "zapisi") unos = oblik === "skraceni" ? skraceniZapis(cestica, tocna) : puniZapis(tocna);
      if (nacin === "nespareni") {
        const v = tocneVrijednosti(spec);
        polja = Object.fromEntries(pitaj.map((q) => [q, q === "raspored" ? v.raspored.join(", ") : String(v[q])]));
      }
    });
  });

  // ── što se vidi ──
  const puni = $derived(cestica ? puniZapis(tocna) : "");
  const skraceni = $derived(cestica ? skraceniZapis(cestica, tocna) : "");
  const ljuske = $derived(rasporedPoLjuskama(tocna));
  const val = $derived(cestica ? valentniCestice(cestica) : null);
  // kućice: istraživanje i popunjavanje uvijek; zapiši i nespareni tek nakon provjere (kao objašnjenje)
  const vidiKucice = $derived(nacin === "istrazi" || nacin === "popuni" || gotovo);
  const napomena = $derived.by(() => {
    if (!cestica || (pitanje && !gotovo)) return null;
    if (!dopusten(cestica.e)) return `${cestica.e.simbol} je iznimka koju školska pravila ne predviđaju: konfiguracija je izmjerena, ne izvodi se iz redoslijeda popunjavanja.`;
    return cestica.naboj ? ionTekst(cestica) : iznimkaTekst(cestica.e);
  });
  const skica = $derived.by(() => {
    if (nacin !== "istrazi" || spec.ljuske === false || !cestica || !ljuske.length) return null;
    const s = { tip: "ljuske", cestice: [{ simbol: zapisCestice(cestica), protoni: cestica.e.z, elektroni: ljuske, prijelazni: true }], raspored: true };
    return renderSketch(s, String(cestica.e.z)).svg;
  });
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="ek-tekst"><Md text={spec.tekst} /></div>
{/if}

{#if nacin === "istrazi"}
  <div class="ek-birac">
    <div class="ek-z">
      <button type="button" class="icon-btn ek-pm" aria-label="Manji Z" disabled={z <= 1} onclick={() => postaviZ(z - 1)}>−</button>
      <input class="ek-klizac" type="range" min="1" max={doZ} step="1" value={z} aria-label="Protonski broj Z" oninput={(e) => postaviZ(Number(e.currentTarget.value))} />
      <button type="button" class="icon-btn ek-pm" aria-label="Veći Z" disabled={z >= doZ} onclick={() => postaviZ(z + 1)}>+</button>
    </div>
    <div class="ek-el" aria-live="polite">
      <span class="ek-sim"><Formula f={zapisCestice(cestica)} /></span>
      <span class="ek-naziv">{elementZ.naziv}</span>
      <span class="ek-mala">Z = {z} · {elektroniCestice(cestica)} {elektroniCestice(cestica) % 10 === 1 && elektroniCestice(cestica) !== 11 ? "elektron" : "elektrona"}</span>
    </div>
    {#if nabojiZ.length}
      <div class="seg ek-ioni" role="group" aria-label="Atom ili ion">
        <button type="button" class="seg-item" class:active={naboj === 0} aria-pressed={naboj === 0} onclick={() => (naboj = 0)}>atom</button>
        {#each nabojiZ as q (q)}
          <button type="button" class="seg-item" class:active={naboj === q} aria-pressed={naboj === q} onclick={() => (naboj = q)}><Formula f={zapisCestice({ e: elementZ, naboj: q })} /></button>
        {/each}
      </div>
    {/if}
    <div class="seg ek-raspored" role="group" aria-label="Raspored kućica">
      <button type="button" class="seg-item" class:active={rasporedIstrazi === "energija"} aria-pressed={rasporedIstrazi === "energija"} onclick={() => (rasporedIstrazi = "energija")}>Po energiji</button>
      <button type="button" class="seg-item" class:active={rasporedIstrazi === "ljuske"} aria-pressed={rasporedIstrazi === "ljuske"} onclick={() => (rasporedIstrazi = "ljuske")}>Po ljuskama</button>
    </div>
  </div>
{:else if cestica}
  <div class="ek-cestica" aria-label="Čestica {zapisCestice(cestica)}"><Formula f={zapisCestice(cestica)} /></div>
{/if}

{#if nacin === "nespareni" && spec.konfiguracija}
  <p class="ek-zadano">Konfiguracija: <span class="ek-zapis">{#each tokeni(puni) as t, i (i)}<Formula f={t} />{" "}{/each}</span></p>
{/if}

{#if vidiKucice && cestica}
  {#if pitanje && nacin !== "popuni"}<p class="ek-mala ek-pod">Orbitale (kućice):</p>{/if}
  <div class="ek-kucice" class:energija={raspored === "energija"} class:gotovo={pitanje && gotovo} role="group" aria-label="Orbitale">
    {#if raspored === "energija"}<span class="ek-os" aria-hidden="true"><i>E</i></span>{/if}
    {#if prikaz.jezgra}
      <div class="ek-red ek-jezgra-red">
        <span class="ek-jezgra"><Formula f="[{prikaz.jezgra}]" /></span>
        <span class="ek-mala">{jezgraE} unutrašnjih elektrona, kao u atomu {prikaz.jezgra}{nacin === "popuni" ? " (već ucrtani)" : ""}</span>
      </div>
    {/if}
    {#each redovi as red (red.join())}
      <div class="ek-red">
        {#each red as k (k)}
          <div class="ek-podljuska" class:bad={losaPodljuska === k} style:--ek-l={raspored === "energija" ? lOd(k) : 0}>
            <span class="ek-oznaka">{k}</span>
            <span class="ek-orb">
              {#each kucice[k] ?? [] as st, i (i)}
                <button
                  type="button"
                  class="ek-kucica"
                  class:moze={nacin === "popuni" && !locked}
                  tabindex={nacin === "popuni" ? 0 : -1}
                  disabled={nacin !== "popuni" || locked}
                  aria-label="{k}, orbitala {i + 1}: {st === 0 ? 'prazna' : st === 2 ? 'dva elektrona' : st === 1 ? 'jedan elektron, spin gore' : 'jedan elektron, spin dolje'}"
                  onclick={() => dodir(k, i)}
                >
                  {#key st}<span class="ek-str" class:par={st === 2}>{STRELICE[st]}</span>{/key}
                </button>
              {/each}
            </span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

{#if nacin === "popuni"}
  <p class="ek-mala ek-uputa">Dodir: ↑, pa ↑↓, pa ↓, pa prazno. U jednu kućicu (orbitalu) stanu najviše dva elektrona suprotnih spinova.</p>
  <div class="lx-actions">
    <button type="button" class="btn btn-primary" disabled={locked || !ucrtano} onclick={provjeriKucice}>Provjeri</button>
    {#if !locked && ucrtano}<button type="button" class="btn btn-ghost" onclick={ocistiSve}>Očisti</button>{/if}
    <span class="ek-mala">Ucrtano: <b>{ucrtano + jezgraE}</b> {ucrtano + jezgraE === 1 ? "elektron" : "elektrona"}</span>
  </div>
{/if}

{#if nacin === "zapisi"}
  <form class="ek-forma" onsubmit={provjeriZapis}>
    <label class="ek-polje-zapis">
      <span class="ek-mala">{oblik === "puni" ? "Puni zapis (sve podljuske)" : oblik === "skraceni" ? "Skraćeni zapis (plemeniti plin u uglatoj zagradi, pa ostale podljuske)" : "Zapis konfiguracije"}</span>
      <input
        class="inp ek-inp"
        class:ok={ishod?.tocno || pokazi}
        class:bad={ishod && !ishod.tocno && !ishod.prazno}
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="npr. 1s2 …"
        aria-label="Elektronska konfiguracija"
        disabled={locked}
        bind:value={unos}
      />
    </label>
    {#if oblik !== "puni" && !locked}
      <div class="ek-jezgre" role="group" aria-label="Plemeniti plin na početak">
        {#each JEZGRE as j (j)}<button type="button" class="btn btn-ghost ek-jgumb" onclick={() => jezgraUnos(j)}>[{j}]</button>{/each}
      </div>
    {/if}
    <p class="ek-pregled" aria-live="polite">
      {#if pregled.length}<span class="ek-zapis">{#each pregled as t, i (i)}<Formula f={t} />{" "}{/each}</span>
      {:else}<span class="ek-mala">Piši podljusku pa broj elektrona u njoj: 2p6 postaje 2p<sup>6</sup>.</span>{/if}
    </p>
    <div class="lx-actions">
      <button class="btn btn-primary" type="submit" disabled={locked || !unos.trim()}>Provjeri</button>
    </div>
  </form>
{/if}

{#if nacin === "nespareni"}
  <form class="ek-polja" onsubmit={provjeriBrojeve}>
    {#each pitaj as q (q)}
      <label class="ek-polje">
        <span>{OZNAKA[q]}{#if q === "raspored"}<span class="ek-mala ek-blok">brojevi odvojeni zarezom</span>{/if}</span>
        <input
          class="inp ek-broj"
          class:sirok={q === "raspored"}
          class:ok={ishod?.tocno || pokazi}
          class:bad={ishod && !ishod.tocno && !ishod.prazno && ishod.polje === q}
          inputmode={q === "raspored" ? "text" : "numeric"}
          autocomplete="off"
          placeholder="?"
          aria-label={IME_PITAJ[q]}
          disabled={locked}
          bind:value={polja[q]}
        />
      </label>
    {/each}
    <div class="lx-actions">
      <button class="btn btn-primary" type="submit" disabled={locked || !spremno}>Provjeri</button>
    </div>
  </form>
{/if}

{#if cestica && (nacin === "istrazi" || gotovo)}
  <dl class="ek-podaci" class:ok={pitanje} aria-live="polite">
    <dt>Puni zapis</dt>
    <dd class="ek-zapis">{#each tokeni(puni) as t, i (i)}<Formula f={t} />{" "}{/each}</dd>
    {#if skraceni !== puni}
      <dt>Skraćeni</dt>
      <dd class="ek-zapis">{#each tokeni(skraceni) as t, i (i)}<Formula f={t} />{" "}{/each}</dd>
    {/if}
    <dt>Po ljuskama</dt>
    <dd>{ljuske.join(", ")}</dd>
    <dt>Nespareni</dt>
    <dd>{nespareniOd(tocna)}</dd>
    {#if val != null}
      <dt>Valentni</dt>
      <dd>{val}</dd>
    {/if}
  </dl>
  {#if napomena}<p class="ek-mala ek-napomena">{napomena}</p>{/if}
{/if}

{#if skica}<figure class="task-sketch ek-skica">{@html skica}</figure>{/if}

<style>
  .ek-tekst {
    margin-bottom: 10px;
  }
  .ek-mala {
    font-size: 12.5px;
    color: var(--text-faint);
    line-height: 1.45;
  }
  .ek-mala b {
    color: var(--text);
    font-weight: 600;
  }
  .ek-cestica {
    display: inline-block;
    margin: -4px 0 12px;
    padding: 4px 14px;
    font-size: 24px;
    font-weight: 600;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
  }
  .ek-zapis {
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.9;
  }

  /* istraži */
  .ek-birac {
    display: grid;
    gap: 10px;
    margin-bottom: 12px;
  }
  .ek-z {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ek-pm {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    font-size: 20px;
  }
  .ek-klizac {
    flex: 1;
    min-width: 0;
    height: 36px;
    accent-color: var(--primary);
  }
  .ek-el {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 10px;
  }
  .ek-sim {
    font-size: 26px;
    font-weight: 700;
  }
  .ek-naziv {
    font-size: 16px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .ek-ioni,
  .ek-raspored {
    flex-wrap: wrap;
    justify-self: start;
  }
  .ek-ioni .seg-item,
  .ek-raspored .seg-item {
    min-height: 36px;
  }

  /* kućice */
  .ek-pod {
    margin: 4px 0 6px;
  }
  .ek-kucice {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .ek-kucice.gotovo {
    border-color: var(--lx-ok);
  }
  .ek-kucice.energija {
    padding-left: 28px;
  }
  /* po energiji: najviša podljuska gore, jezgra (najniže) dolje */
  .ek-kucice.energija .ek-jezgra-red {
    order: 1;
  }
  .ek-os {
    position: absolute;
    left: 10px;
    top: 12px;
    bottom: 12px;
    width: 0;
    border-left: 1.5px solid var(--text-faint);
  }
  .ek-os::before {
    content: "";
    position: absolute;
    top: -2px;
    left: -5.5px;
    border: 5px solid transparent;
    border-bottom: 7px solid var(--text-faint);
    border-top: 0;
  }
  .ek-os i {
    position: absolute;
    top: 6px;
    left: 4px;
    font-size: 11px;
    font-style: italic;
    color: var(--text-faint);
  }
  .ek-red {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
  }
  .ek-podljuska {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: calc(var(--ek-l, 0) * 22px);
    padding: 2px;
    border-radius: var(--r-md);
  }
  .ek-podljuska.bad {
    box-shadow: 0 0 0 2px var(--lx-bad);
  }
  .ek-oznaka {
    min-width: 22px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .ek-orb {
    display: inline-flex;
  }
  .ek-kucica {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    margin-left: -1.5px;
    border: 1.5px solid var(--text-dim);
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 19px;
    line-height: 1;
  }
  .ek-kucica:first-child {
    margin-left: 0;
  }
  .ek-kucica:disabled {
    cursor: default;
    opacity: 1;
  }
  .ek-kucica.moze {
    cursor: pointer;
  }
  .ek-kucica.moze:hover {
    background: var(--bg-hover);
  }
  .ek-kucica:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
    z-index: 1;
  }
  .ek-str {
    display: inline-block;
    animation: ek-pojavi 0.18s ease-out;
  }
  .ek-str.par {
    letter-spacing: -1px;
  }
  @keyframes ek-pojavi {
    from {
      transform: translateY(-4px);
      opacity: 0;
    }
  }
  .ek-jezgra-red {
    gap: 10px;
  }
  .ek-jezgra {
    display: inline-grid;
    place-items: center;
    min-width: 52px;
    height: 36px;
    padding: 0 8px;
    border: 1.5px dashed var(--text-dim);
    border-radius: var(--r-md);
    font-weight: 600;
  }
  .ek-uputa {
    margin: 8px 0 0;
  }

  /* zapiši */
  .ek-forma {
    display: grid;
    gap: 8px;
  }
  .ek-polje-zapis {
    display: grid;
    gap: 4px;
  }
  .ek-inp {
    width: 100%;
    max-width: 420px;
    height: var(--lx-control, 40px);
    font-family: var(--font-sans);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .ek-jezgre {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ek-jgumb {
    min-height: 36px;
    min-width: 48px;
    padding: 0 8px;
    font-size: 14px;
  }
  .ek-pregled {
    margin: 0;
    min-height: 30px;
  }

  /* nespareni */
  .ek-zadano {
    margin: -4px 0 12px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .ek-polja {
    margin-top: 14px;
    display: grid;
    gap: 8px;
  }
  .ek-polje {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    max-width: 360px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .ek-broj {
    width: 90px;
    height: var(--lx-control, 40px);
    text-align: right;
    font-family: var(--font-sans);
    font-size: 16px;
  }
  .ek-blok {
    display: block;
  }
  .ek-broj.sirok {
    width: 140px;
  }

  /* podaci */
  .ek-podaci {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 14px;
    align-items: baseline;
    margin: 12px 0 0;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 14px;
  }
  .ek-podaci.ok {
    border-color: var(--lx-ok);
  }
  .ek-podaci dt {
    color: var(--text-dim);
  }
  .ek-podaci dd {
    margin: 0;
    min-width: 0;
    font-variant-numeric: tabular-nums;
  }
  .ek-podaci .ek-zapis {
    font-size: 15px;
    line-height: 1.7;
  }
  .ek-napomena {
    margin: 8px 0 0;
  }
  .ek-skica {
    margin: 10px auto 0;
    max-width: 360px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ek-str {
      animation: none;
    }
  }
</style>
