<script>
  // Periodni sustav kao na ispitnom listu mature: ćelija Z, simbol, Ar; skupine 1–18, lantanoidi i aktinoidi u
  // izdvojenim redcima. Sve brojeve i točne odgovore računa katalog/kemija/periodni_sustav.js; ovdje se samo crta.
  // Mobitel: tablica se pomiče vodoravno unutar svog okvira (stranica ostaje mirna), a stupac s oznakama perioda je
  // zalijepljen lijevo, pa učenik uvijek vidi u kojem je retku. Prikaz „glavne“ (8 stupaca) stane bez pomicanja.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import { seededShuffle } from "$lib/lesson/core/shuffle.js";
  import { ELEMENTI, PO_SIMBOLU } from "$lib/lesson/katalog/kemija/_tablice.js";
  import {
    celija,
    prikazOd,
    vidljiv,
    glavna,
    blok,
    skupina,
    valentni,
    ljuske,
    konfiguracija,
    fBlok,
    pitajOd,
    IME_PITAJ,
    IME_VRSTE,
    tocniElementi,
    tocneVrijednosti,
    tocanRedoslijed,
    vrijednostSvojstva,
    cesticaOd,
    zapisCestice,
  } from "$lib/lesson/katalog/kemija/periodni_sustav.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = $derived(spec.nacin);
  const pitanje = $derived(nacin !== "istrazi");
  const glavne = $derived(prikazOd(spec) === "glavne");
  const gotovo = $derived(pokazi || !!ishod?.tocno);

  // ── raspored ćelija: stupac 1 su oznake perioda, red 1 brojevi skupina, red 9 razmak, redci 10–11 f-blok ──
  const stupac = (s) => (!glavne ? s + 1 : s <= 2 ? s + 1 : s - 8);
  const redOd = (r) => (r <= 7 ? r + 1 : r + 2);
  const elementi = $derived(ELEMENTI.filter((e) => vidljiv(spec, e)));
  const skupine = $derived(glavne ? [1, 2, 13, 14, 15, 16, 17, 18] : Array.from({ length: 18 }, (_, i) => i + 1));
  const stupci = $derived(glavne ? "18px repeat(2, minmax(31px, 1fr)) 4px repeat(6, minmax(31px, 1fr))" : "18px repeat(18, minmax(34px, 1fr))");
  const periode = $derived(
    spec.periode ??
      !((nacin === "procitaj" && pitajOd(spec).includes("perioda")) || (nacin === "pronadji" && (spec.uvjet?.perioda != null || spec.uvjet?.ljuske != null))),
  );
  const istaknuti = $derived(new Set(spec.istakni ?? (nacin === "poredaj" ? spec.elementi : [])));

  // ── sloj trenda (samo istraživanje: u koraku „Tvoj red“ boja bi odala odgovor) ──
  const slojevi = $derived(nacin === "istrazi" ? [].concat(spec.prikazi ?? []) : []);
  let sloj = $state(untrack(() => [].concat(spec.prikazi ?? [])[0] ?? null));
  const aktivni = $derived(nacin === "istrazi" ? sloj : null);
  const polumjerOcjena = (e) => (glavna(e) && e.vrsta !== "plemeniti plin" ? e.perioda - ((e.skupina <= 2 ? e.skupina - 1 : e.skupina - 11) / 8) * 0.9 : null);
  const vrijednost = (e, sl) => (sl === "en" ? e.en : sl === "ie1" ? e.ie1 : sl === "polumjer" ? polumjerOcjena(e) : null);
  const raspon = $derived.by(() => {
    if (!aktivni || aktivni === "vrsta") return null;
    const v = elementi.map((e) => vrijednost(e, aktivni)).filter((x) => x != null);
    return [Math.min(...v), Math.max(...v)];
  });
  function bojaCelije(e) {
    if (!aktivni) return null;
    if (aktivni === "vrsta") return null;
    const v = vrijednost(e, aktivni);
    if (v == null) return null;
    const t = (v - raspon[0]) / (raspon[1] - raspon[0] || 1);
    return `color-mix(in srgb, var(--primary) ${Math.round(6 + 52 * t)}%, var(--bg-elev))`;
  }
  const VRSTA_KLASA = { metal: "metal", nemetal: "nemetal", polumetal: "polumetal", "plemeniti plin": "plemeniti" };
  const IME_SLOJA = { vrsta: "Vrsta", en: "Elektronegativnost", ie1: "Energija ionizacije", polumjer: "Polumjer" };

  // ── odabir ──
  let odabran = $state(untrack(() => (spec.nacin === "istrazi" ? (spec.odabran ?? null) : null)));
  let izabrani = $state([]); // pronađi
  let poslano = $state(null);
  let lupa = $state(null); // pročitaj / poredaj: povećana ćelija (samo ono što piše na listu)
  const tocni = $derived(nacin === "pronadji" ? tocniElementi(spec) : []);

  function dodir(e) {
    if (nacin === "istrazi") odabran = odabran === e.simbol ? null : e.simbol;
    else if (nacin === "pronadji") {
      if (locked) return;
      if (spec.viseTocnih) izabrani = izabrani.includes(e.simbol) ? izabrani.filter((x) => x !== e.simbol) : [...izabrani, e.simbol];
      else izabrani = [e.simbol];
    } else lupa = e.simbol;
  }
  const isto = (a, b) => a != null && b != null && a.length === b.length && a.every((x) => b.includes(x));
  function stanjeCelije(e) {
    const S = e.simbol;
    if (nacin === "istrazi") return { sel: odabran === S };
    if (nacin === "pronadji") {
      if (pokazi) return { ok: tocni.includes(S) };
      const sel = izabrani.includes(S);
      const neprom = isto(poslano, izabrani);
      return { sel, ok: sel && ishod?.tocno, bad: sel && neprom && ishod && !ishod.tocno && !ishod.prazno && !spec.viseTocnih };
    }
    return { sel: lupa === S };
  }
  function provjeriPronadji() {
    if (locked || !izabrani.length) return;
    poslano = [...izabrani];
    onodgovor([...izabrani]);
  }

  // ── pročitaj ──
  const pitaj = $derived(nacin === "procitaj" ? pitajOd(spec) : []);
  const cestica = $derived(nacin === "procitaj" ? cesticaOd(spec.element) : null);
  let unos = $state(untrack(() => Object.fromEntries(pitajOd(spec).map((q) => [q, ""]))));
  const spremno = $derived(pitaj.every((q) => String(unos[q] ?? "").trim()));
  const OZNAKA_POLJA = {
    z: "Protonski broj Z",
    ar: "Relativna atomska masa Ar",
    perioda: "Perioda",
    skupina: "Skupina",
    valentni: "Valentni elektroni",
    protoni: "Protoni",
    neutroni: "Neutroni",
    elektroni: "Elektroni",
  };
  function provjeriProcitaj(ev) {
    ev?.preventDefault();
    if (locked || !spremno) return;
    onodgovor($state.snapshot(unos));
  }

  // ── poredaj ──
  let redoslijed = $state(
    untrack(() => {
      if (spec.nacin !== "poredaj") return [];
      const t = tocanRedoslijed(spec);
      let o = seededShuffle(spec.elementi, JSON.stringify(spec.elementi) + spec.svojstvo);
      if (o.every((x, i) => x === t[i])) o = [...o.slice(1), o[0]];
      return o;
    }),
  );
  function pomakni(i, d) {
    const j = i + d;
    if (locked || j < 0 || j >= redoslijed.length) return;
    [redoslijed[i], redoslijed[j]] = [redoslijed[j], redoslijed[i]];
  }

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "pronadji") izabrani = [...tocni];
      if (nacin === "procitaj") {
        const v = tocneVrijednosti(spec);
        unos = Object.fromEntries(pitaj.map((q) => [q, q === "ar" ? cestica.e.arZapis : String(v[q])]));
      }
      if (nacin === "poredaj") redoslijed = tocanRedoslijed(spec);
    });
  });

  // ── kartica elementa: istraživanje, ili nakon točnog odgovora (pronađi s jednim elementom, pročitaj) ──
  const kartica = $derived.by(() => {
    if (nacin === "istrazi") return odabran ? PO_SIMBOLU[odabran] : null;
    if (!gotovo) return null;
    if (nacin === "pronadji" && tocni.length === 1) return PO_SIMBOLU[tocni[0]];
    if (nacin === "procitaj") return cestica?.e ?? null;
    return null;
  });
  // Unicode eksponenti (²⁺) u nekim fontovima stoje razmaknuto: za prikaz pravi <sup> (tekst je iz tablica, ne od korisnika)
  const GORNJI = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻";
  const OBICNI = "0123456789+−";
  const sup = (t) => String(t).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (m) => `<sup>${[...m].map((c) => OBICNI[GORNJI.indexOf(c)]).join("")}</sup>`);

  // ── vodoravno pomicanje ──
  let okvir = $state();
  let siroko = $state(false);
  $effect(() => {
    if (!okvir) return;
    const ro = new ResizeObserver(() => (siroko = okvir.scrollWidth > okvir.clientWidth + 2));
    ro.observe(okvir);
    // istraživanje s unaprijed odabranim elementom: pokaži ga (pomakom okvira, ne stranice)
    const S = untrack(() => odabran);
    if (S) {
      const b = okvir.querySelector(`[data-simbol="${S}"]`);
      if (b) okvir.scrollLeft = b.offsetLeft - okvir.clientWidth / 2 + b.offsetWidth / 2;
    }
    return () => ro.disconnect();
  });
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="ps-tekst"><Md text={spec.tekst} /></div>
{/if}

{#if nacin === "procitaj" && cestica}
  <div class="ps-cestica" aria-label="Čestica: {zapisCestice(spec)}">{@html sup(zapisCestice(spec))}</div>
{/if}

{#if slojevi.length > 1}
  <div class="seg ps-slojevi" role="group" aria-label="Sloj na tablici">
    {#each slojevi as sl (sl)}
      <button type="button" class="seg-item" class:active={sloj === sl} aria-pressed={sloj === sl} onclick={() => (sloj = sl)}>{IME_SLOJA[sl]}</button>
    {/each}
    <button type="button" class="seg-item" class:active={sloj == null} aria-pressed={sloj == null} onclick={() => (sloj = null)}>Bez boje</button>
  </div>
{/if}

<div class="ps-okvir" class:glavne bind:this={okvir}>
  <div class="ps-mreza" style:grid-template-columns={stupci} role="group" aria-label="Periodni sustav elemenata">
    <span class="ps-kut ps-per" style:grid-row="1" style:grid-column="1"></span>
    {#each skupine as g (g)}
      <span class="ps-skupina" style:grid-row="1" style:grid-column={stupac(g)}>{g}</span>
    {/each}
    {#each [1, 2, 3, 4, 5, 6, 7] as p (p)}
      <span class="ps-per" style:grid-row={redOd(p)} style:grid-column="1" aria-hidden={!periode}>{periode ? p : ""}</span>
    {/each}
    {#if !glavne}
      <span class="ps-mjesto" style:grid-row={redOd(6)} style:grid-column={stupac(3)}><b>57–71</b>lantanoidi</span>
      <span class="ps-mjesto" style:grid-row={redOd(7)} style:grid-column={stupac(3)}><b>89–103</b>aktinoidi</span>
      <span class="ps-razmak" style:grid-row="9" style:grid-column="1"></span>
      <span class="ps-fnaziv" style:grid-row="10" style:grid-column="2 / 4">lantanoidi</span>
      <span class="ps-fnaziv" style:grid-row="11" style:grid-column="2 / 4">aktinoidi</span>
    {/if}
    {#each elementi as e (e.z)}
      {@const c = celija(e)}
      {@const st = stanjeCelije(e)}
      {@const boja = bojaCelije(e)}
      <button
        type="button"
        class="ps-el"
        class:f={fBlok(e)}
        class:sel={st.sel}
        class:ok={st.ok}
        class:bad={st.bad}
        class:ist={istaknuti.has(e.simbol)}
        class:nema={aktivni && aktivni !== "vrsta" && vrijednost(e, aktivni) == null}
        data-vrsta={aktivni === "vrsta" ? VRSTA_KLASA[e.vrsta] : null}
        data-simbol={e.simbol}
        style:grid-row={redOd(c.red)}
        style:grid-column={stupac(c.stupac)}
        style:background={boja}
        aria-label="{e.z} {e.simbol} {e.arZapis}{nacin === 'istrazi' ? `, ${e.naziv}` : ''}"
        aria-pressed={nacin === "pronadji" ? izabrani.includes(e.simbol) : nacin === "istrazi" ? odabran === e.simbol : undefined}
        disabled={nacin === "pronadji" && locked && !pokazi}
        onclick={() => dodir(e)}
      >
        <span class="ps-z">{e.z}</span>
        <span class="ps-sim">{e.simbol}</span>
        <span class="ps-ar">{e.arZapis}</span>
      </button>
    {/each}
  </div>
</div>
{#if siroko}<p class="ps-mala ps-pomak">← Tablicu možeš pomicati vodoravno →</p>{/if}

{#if aktivni}
  <div class="ps-legenda">
    {#if aktivni === "vrsta"}
      <span class="ps-chip"><i data-vrsta="metal"></i>metal</span>
      <span class="ps-chip"><i data-vrsta="nemetal"></i>nemetal</span>
      <span class="ps-chip"><i data-vrsta="polumetal"></i>polumetal</span>
      <span class="ps-chip"><i data-vrsta="plemeniti"></i>plemeniti plin</span>
    {:else}
      <div class="ps-skala">
        <span>{aktivni === "polumjer" ? "manji" : "manja"}</span>
        <i class="ps-gradijent"></i>
        <span>{aktivni === "polumjer" ? "veći" : "veća"}</span>
      </div>
      <div class="ps-strelice">
        {#if aktivni === "polumjer"}
          <span><b aria-hidden="true">←</b> raste ulijevo u periodi</span>
          <span><b aria-hidden="true">↓</b> raste niz skupinu</span>
        {:else}
          <span><b aria-hidden="true">→</b> raste udesno u periodi</span>
          <span><b aria-hidden="true">↑</b> raste prema gore u skupini</span>
        {/if}
      </div>
      <p class="ps-mala">
        {#if aktivni === "en"}Elektronegativnost (po Paulingu) nije na ispitnom listu; kad zatreba, zadaje se u zadatku. Ovdje je samo za trend. Sivo: nema podatka (plemeniti plinovi).
        {:else if aktivni === "ie1"}Energija ionizacije nije na ispitnom listu; ovdje je samo za trend. Sivo: nema podatka.
        {:else}Samo kvalitativno, po pravilu periode i skupine (bez brojeva), za glavne skupine bez plemenitih plinova.{/if}
      </p>
    {/if}
  </div>
{/if}

{#if kartica}
  {@const e = kartica}
  {@const val = valentni(e)}
  {@const lj = ljuske(e)}
  {@const konf = konfiguracija(e)}
  <div class="ps-kartica" class:ok={pitanje} aria-live="polite">
    <div class="ps-kartica-glava">
      <div class="ps-velika" aria-hidden="true"><span class="ps-z">{e.z}</span><span class="ps-sim">{e.simbol}</span><span class="ps-ar">{e.arZapis}</span></div>
      <div>
        <div class="ps-naziv">{e.naziv}</div>
        <div class="ps-mala">{IME_VRSTE[e.vrsta]} · {blok(e)}-blok</div>
      </div>
    </div>
    <dl class="ps-podaci">
      <dt>Protonski broj Z</dt>
      <dd>{e.z}</dd>
      <dt>Ar (s lista)</dt>
      <dd>{e.arZapis}{#if e.nestabilan}<span class="ps-mala ps-dod">nestabilan: broj u zagradi je nukleonski broj najstabilnijeg izotopa</span>{/if}</dd>
      <dt>Perioda</dt>
      <dd>{e.perioda}</dd>
      <dt>Skupina</dt>
      <dd>{skupina(e) ?? `3 (${e.z <= 71 ? "lantanoidi" : "aktinoidi"})`}</dd>
      {#if val != null}
        <dt>Valentni elektroni</dt>
        <dd>{val}{#if e.vrsta === "plemeniti plin"}<span class="ps-mala ps-dod">popunjena vanjska ljuska</span>{/if}</dd>
      {/if}
      {#if lj}
        <dt>Po ljuskama</dt>
        <dd>{lj.join(", ")}</dd>
      {/if}
      {#if konf}
        <dt>Konfiguracija</dt>
        <dd>{@html sup(konf)}</dd>
      {/if}
      {#if slojevi.includes("en") && e.en != null}
        <dt>Elektronegativnost</dt>
        <dd>{e.en.toFixed(2).replace(".", ",")}<span class="ps-mala ps-dod">nije na listu</span></dd>
      {/if}
      {#if slojevi.includes("ie1") && e.ie1 != null}
        <dt>Energija ionizacije</dt>
        <dd>{e.ie1} kJ/mol<span class="ps-mala ps-dod">nije na listu</span></dd>
      {/if}
    </dl>
    {#if !glavna(e) && !fBlok(e)}
      <p class="ps-mala">Prijelazni metal: valentni elektroni su u vanjskoj s-orbitali i u d-orbitali ispod nje{#if konf}&nbsp;({@html sup(konf)}){/if}, pa se njihov broj ne čita iz broja skupine kao kod glavnih skupina.</p>
    {:else if fBlok(e)}
      <p class="ps-mala">{e.z <= 71 ? "Lantanoid" : "Aktinoid"}: na listu je u izdvojenom retku ispod tablice, a pripada {e.perioda}. periodi.</p>
    {/if}
  </div>
{:else if nacin === "istrazi"}
  <p class="ps-mala ps-uputa">Dodirni element da vidiš njegovu karticu.</p>
{/if}

{#if (nacin === "procitaj" || nacin === "poredaj") && lupa && !kartica}
  {@const e = PO_SIMBOLU[lupa]}
  <div class="ps-lupa" aria-live="polite">
    <div class="ps-velika"><span class="ps-z">{e.z}</span><span class="ps-sim">{e.simbol}</span><span class="ps-ar">{e.arZapis}</span></div>
    <span class="ps-mala">povećana ćelija, kao na listu</span>
  </div>
{/if}

{#if nacin === "pronadji"}
  <div class="lx-actions">
    <button type="button" class="btn btn-primary" onclick={provjeriPronadji} disabled={locked || !izabrani.length}>Provjeri</button>
    {#if spec.viseTocnih && izabrani.length && !locked}<button type="button" class="btn btn-ghost" onclick={() => (izabrani = [])}>Poništi</button>{/if}
    <span class="ps-mala">
      {#if izabrani.length}Odabrano: <b>{izabrani.join(", ")}</b>{:else if spec.viseTocnih}Dodirni sve tražene elemente, pa Provjeri.{:else}Dodirni element, pa Provjeri.{/if}
    </span>
  </div>
{/if}

{#if nacin === "procitaj"}
  <form class="ps-polja" onsubmit={provjeriProcitaj}>
    {#each pitaj as q (q)}
      <label class="ps-polje">
        <span>{OZNAKA_POLJA[q]}</span>
        <input
          class="inp ps-inp"
          class:ok={ishod?.tocno || pokazi}
          class:bad={ishod && !ishod.tocno && !ishod.prazno && ishod.polje === q}
          inputmode="decimal"
          autocomplete="off"
          placeholder="?"
          aria-label={IME_PITAJ[q]}
          disabled={locked}
          bind:value={unos[q]}
        />
      </label>
    {/each}
    <div class="lx-actions">
      <button class="btn btn-primary" type="submit" disabled={locked || !spremno}>Provjeri</button>
      {#if !locked}<span class="ps-mala">Dodirni ćeliju u tablici da je povećaš.</span>{/if}
    </div>
  </form>
{/if}

{#if nacin === "poredaj"}
  {@const muski = ["polumjer", "metalnost"].includes(spec.svojstvo)}
  {@const [mal, vel] = muski ? ["najmanjeg", "najvećeg"] : ["najmanje", "najveće"]}
  {@const GEN = { en: "elektronegativnosti", ie1: "prve energije ionizacije", polumjer: "polumjera atoma", metalnost: "metalnog karaktera" }}
  <p class="ps-mala ps-redoslijed-naslov">Od {spec.smjer === "padajuci" ? `${vel} do ${mal}` : `${mal} do ${vel}`} {GEN[spec.svojstvo]}</p>
  <ol class="ps-redoslijed">
    {#each redoslijed as S, i (S)}
      {@const e = PO_SIMBOLU[S]}
      {@const v = gotovo ? vrijednostSvojstva(e, spec.svojstvo) : null}
      <li class="lx-option" class:ok={gotovo}>
        <span class="lx-mark">{i + 1}</span>
        <span class="ps-red-tekst"><b>{e.simbol}</b> {e.naziv}{#if v}<span class="ps-mala ps-dod">{v}</span>{/if}</span>
        {#if !locked}
          <span class="ps-red-gumbi">
            <button type="button" class="icon-btn" aria-label="Pomakni {e.simbol} gore" disabled={i === 0} onclick={() => pomakni(i, -1)}>↑</button>
            <button type="button" class="icon-btn" aria-label="Pomakni {e.simbol} dolje" disabled={i === redoslijed.length - 1} onclick={() => pomakni(i, 1)}>↓</button>
          </span>
        {/if}
      </li>
    {/each}
  </ol>
  <div class="lx-actions">
    <button type="button" class="btn btn-primary" disabled={locked} onclick={() => onodgovor($state.snapshot(redoslijed))}>Provjeri</button>
    <span class="ps-mala">{spec.smjer === "padajuci" ? "Prvi je najveći." : "Prvi je najmanji."}</span>
  </div>
{/if}

<style>
  .ps-tekst {
    margin-bottom: 10px;
  }
  .ps-mala {
    font-size: 12.5px;
    color: var(--text-faint);
    line-height: 1.45;
  }
  .ps-dod {
    margin-left: 6px;
  }
  .ps-mala b {
    color: var(--text);
    font-weight: 600;
  }
  .ps-cestica {
    display: inline-block;
    margin: -4px 0 12px;
    padding: 4px 14px;
    font-size: 24px;
    font-weight: 600;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
  }
  .ps-slojevi {
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  /* tablica */
  .ps-okvir {
    /* bez vlastite širine sadržaja: okvir ne smije raširiti korak (stavku grida) na uskom ekranu, nego se pomiče */
    width: 0;
    min-width: 100%;
    box-sizing: border-box;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    padding: 6px 4px 8px 0;
    -webkit-overflow-scrolling: touch;
  }
  .ps-mreza {
    position: relative;
    display: grid;
    gap: 2px;
    min-width: max-content;
  }
  .ps-okvir.glavne .ps-mreza {
    max-width: 440px;
    margin: 0 auto;
  }
  .ps-skupina {
    font-size: 10px;
    color: var(--text-faint);
    text-align: center;
    padding-bottom: 1px;
    font-variant-numeric: tabular-nums;
  }
  .ps-per {
    position: sticky;
    left: 0;
    z-index: 1;
    display: grid;
    place-items: center;
    background: var(--bg-elev);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .ps-razmak {
    height: 6px;
  }
  .ps-mjesto,
  .ps-fnaziv {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-size: 8px;
    line-height: 1.2;
    color: var(--text-faint);
    text-align: center;
  }
  .ps-mjesto {
    border: 1px dashed var(--border-strong);
    border-radius: 4px;
    background: color-mix(in srgb, var(--text) 4%, transparent);
  }
  .ps-mjesto b {
    font-size: 8.5px;
    font-weight: 600;
    color: var(--text-dim);
  }
  .ps-fnaziv {
    align-items: flex-end;
    padding-right: 4px;
    font-size: 10px;
  }
  .ps-el {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    padding: 2px 1px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    line-height: 1.05;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    transition:
      border-color 0.12s,
      box-shadow 0.12s;
  }
  .ps-el:hover:not(:disabled) {
    border-color: var(--border-strong);
  }
  .ps-el:disabled {
    cursor: default;
  }
  .ps-el.f {
    background: color-mix(in srgb, var(--text) 3%, var(--bg));
  }
  .ps-z {
    font-size: 9px;
    color: var(--text-dim);
  }
  .ps-sim {
    font-size: 15px;
    font-weight: 700;
    margin: 1px 0;
  }
  .ps-ar {
    font-size: 8.5px;
    color: var(--text-dim);
  }
  .ps-el.ist {
    border-color: var(--primary);
    box-shadow: inset 0 0 0 1px var(--primary);
  }
  .ps-el.sel {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary);
    z-index: 2;
  }
  .ps-el.ok {
    border-color: var(--lx-ok);
    box-shadow: 0 0 0 2px var(--lx-ok);
    background: color-mix(in srgb, var(--lx-ok) 16%, var(--bg));
    z-index: 2;
  }
  .ps-el.bad {
    border-color: var(--lx-bad);
    box-shadow: 0 0 0 2px var(--lx-bad);
    background: color-mix(in srgb, var(--lx-bad) 12%, var(--bg));
    z-index: 2;
  }
  .ps-el.nema {
    background: repeating-linear-gradient(135deg, var(--bg), var(--bg) 4px, var(--bg-elev-2) 4px, var(--bg-elev-2) 8px);
  }
  .ps-el.nema .ps-sim {
    color: var(--text-dim);
  }
  [data-vrsta="metal"] {
    --ps-v: var(--primary);
  }
  [data-vrsta="nemetal"] {
    --ps-v: var(--success);
  }
  [data-vrsta="polumetal"] {
    --ps-v: var(--warn);
  }
  [data-vrsta="plemeniti"] {
    --ps-v: var(--lx-water, #38bdf8);
  }
  .ps-el[data-vrsta] {
    background: color-mix(in srgb, var(--ps-v) 24%, var(--bg-elev));
  }
  .ps-pomak {
    margin: 4px 0 0;
    text-align: center;
  }

  /* legenda */
  .ps-legenda {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    align-items: center;
  }
  .ps-legenda .ps-mala {
    flex-basis: 100%;
    margin: 0;
  }
  .ps-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .ps-chip i {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid var(--border-strong);
    background: color-mix(in srgb, var(--ps-v) 24%, var(--bg-elev));
  }
  .ps-skala {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .ps-gradijent {
    width: 120px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid var(--border);
    background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 6%, var(--bg-elev)), color-mix(in srgb, var(--primary) 58%, var(--bg-elev)));
  }
  .ps-strelice {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .ps-strelice b {
    color: var(--primary);
    font-size: 16px;
    margin-right: 2px;
  }

  /* kartica i povećana ćelija */
  .ps-kartica {
    margin-top: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .ps-kartica.ok {
    border-color: var(--lx-ok);
  }
  .ps-kartica > .ps-mala {
    margin: 8px 0 0;
  }
  .ps-kartica-glava {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .ps-velika {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 64px;
    border: 1.5px solid var(--text-dim);
    border-radius: 6px;
    background: var(--bg);
    line-height: 1.1;
    flex-shrink: 0;
  }
  .ps-velika .ps-z,
  .ps-velika .ps-ar {
    font-size: 12px;
  }
  .ps-velika .ps-sim {
    font-size: 24px;
  }
  .ps-naziv {
    font-size: 17px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .ps-podaci {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 14px;
    margin: 0;
    font-size: 14px;
  }
  .ps-podaci dt {
    color: var(--text-dim);
  }
  .ps-podaci dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .ps-uputa {
    margin: 10px 0 0;
  }
  .ps-lupa {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  /* pročitaj */
  .ps-polja {
    margin-top: 14px;
    display: grid;
    gap: 8px;
  }
  .ps-polje {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    max-width: 360px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .ps-inp {
    width: 110px;
    height: var(--lx-control, 40px);
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }

  /* poredaj */
  .ps-redoslijed-naslov {
    margin: 14px 0 6px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .ps-redoslijed {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .ps-redoslijed li {
    align-items: center;
    padding: 6px 6px 6px 12px;
  }
  .ps-red-tekst {
    flex: 1;
  }
  .ps-red-gumbi {
    display: flex;
    gap: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ps-el {
      transition: none;
    }
  }
</style>
