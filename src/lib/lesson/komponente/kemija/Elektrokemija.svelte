<script>
  // elektrokemija: SVG galvanskog članka (dvije čaše, elektrolitni most, voltmetar), metala uronjenog u otopinu i
  // elektroliznog članka (jedan ili dva serijski spojena, izvor struje). Sva kemija (anoda, katoda, polureakcije,
  // ΔE°, produkti, Faradayev lanac, poruke) je u katalog/kemija/elektrokemija.js; ovdje je samo prikaz.
  // U „Tvoj red“ crtež ne pokazuje polove, smjer elektrona, napon ni produkte dok učenik ne odgovori točno (ili ne
  // otvori točan odgovor). Elektroni i ioni se gibaju SMIL-om, mjehurići CSS-om; uz prefers-reduced-motion sve stoji.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import Formula from "./Formula.svelte";
  import { tocanOdgovor } from "../../katalog/index.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";
  import { seededShuffle } from "$lib/lesson/core/shuffle.js";
  import { KONSTANTE } from "$lib/lesson/katalog/kemija/_tablice.js";
  import { BOJE } from "$lib/lesson/katalog/kemija/_reakcije.js";
  import {
    clanak,
    par,
    IZBOR_CLANKA,
    istiskivanje,
    ioniOd,
    elektroliza,
    celije,
    opcijeProdukata,
    traziOf,
    izlucenoOf,
    sekunde,
    zapisVremena,
    uzivoElektroliza,
    uvjetiZapis,
    oznaka,
    zapisE,
    zapisEV,
    IME,
    formulaKoraka,
    NAZIV_ELEKTRODE,
  } from "$lib/lesson/katalog/kemija/elektrokemija.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const vrsta = untrack(() => spec.vrsta);
  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const jeClanak = vrsta === "clanak" && nacin !== "istiskivanje";
  const jeIstiskivanje = nacin === "istiskivanje";
  const jeElektroliza = vrsta === "elektroliza";
  const uid = Math.random().toString(36).slice(2, 8);
  let aktivno = $derived(!locked && !pokazi);
  let otkriveno = $derived(!!ishod?.tocno || pokazi);

  // bez animacije kad sustav traži smanjeno gibanje
  let mirno = $state(false);
  $effect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    mirno = m.matches;
    const f = (e) => (mirno = e.matches);
    m.addEventListener?.("change", f);
    return () => m.removeEventListener?.("change", f);
  });

  // ── boje (kemijski podatak) ──
  const METAL = {
    Cu: "#b87333", Ag: "#d3d7db", Au: "#d4af37", Pt: "#c4c8cd", grafit: "#3d4148", Zn: "#a2a8af", Fe: "#7c8187", Ni: "#9aa0a6",
    Mg: "#c2c6cb", Al: "#c9cdd1", Pb: "#69727c", Sn: "#b9bdc1", Co: "#8f969d", Cd: "#a9afb5", Cr: "#a7adb3", Mn: "#9a9aa0",
    Ti: "#8a8f96", Hg: "#c3c7cb", Na: "#dfe2e5", K: "#dfe2e5", Ca: "#d8dbde", Ba: "#d8dbde", Cs: "#e6d9a8",
  };
  const bojaMetala = (m) => METAL[m] ?? "#a2a8af";
  const ION_BOJA = { "Cu²⁺": "plava", "Ni²⁺": "zelena", "Fe²⁺": "blijedozelena", "Fe³⁺": "zutosmeda", "Co²⁺": "ruzicasta", "Cr³⁺": "zelena", "Cr²⁺": "plava" };
  const bojaIona = (ion) => (ION_BOJA[ion] ? BOJE[ION_BOJA[ion]].hex : null);
  const PLIN_BOJA = { "Cl₂": BOJE.zutozelena.hex, "Br₂": BOJE.narancastosmeda.hex, "I₂": BOJE.smeda.hex, "F₂": BOJE.blijedozuta.hex };

  // ── formula u SVG-u: indeksi i naboji kao tspan ──
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "−" };
  function svgDijelovi(f) {
    const out = [];
    for (const ch of String(f)) {
      const v = SUB.includes(ch) ? "sub" : ch in SUP ? "sup" : "t";
      const z = v === "sub" ? String(SUB.indexOf(ch)) : v === "sup" ? SUP[ch] : ch;
      const zadnji = out[out.length - 1];
      if (zadnji?.v === v) zadnji.z += z;
      else out.push({ v, z });
    }
    let cur = 0;
    return out.map((d, i) => {
      const cilj = d.v === "sub" ? 3 : d.v === "sup" ? -5 : 0;
      const dy = cilj - cur;
      cur = cilj;
      return { ...d, i, dy, fs: d.v === "t" ? null : "70%" };
    });
  }

  // ── jednadžba iz kataloga (clanovi) ──
  const lijevo = (j) => j.clanovi.filter((c) => c.strana === "L");
  const desno = (j) => j.clanovi.filter((c) => c.strana === "D");

  // ════════ GALVANSKI ČLANAK ════════
  const izborParova = untrack(() => (spec.izbor ?? IZBOR_CLANKA).map(par).filter(Boolean).sort((a, b) => b.E - a.E));
  let odabrano = $state(untrack(() => (jeClanak ? [...spec.elektrode] : [])));
  let c = $derived(jeClanak ? clanak(odabrano) : null);
  const otopine = untrack(() => spec.otopine ?? null);
  const most = untrack(() => ioniOd(spec.most ?? "KNO₃"));
  const pokaziE = untrack(() => spec.pokazi_E ?? true);
  const pitaj = untrack(() => spec.pitaj ?? ["uloge", "polovi", "elektroni"]);
  let vidiUloge = $derived(istrazi || otkriveno);
  let vidiNapon = $derived(istrazi || otkriveno);

  // otopina ispod čaše: zadana sol, ili samo ion
  function otopinaCase(i) {
    if (istrazi && odabrano[i] !== spec.elektrode[i]) return null;
    return otopine?.[i] ?? null;
  }
  // polovi: izbor učenika
  let ulogaAnode = $state(null); // 0 | 1
  let polLijevo = $state(null); // "+" | "−"
  let smjerE = $state(null); // "lijevo" | "desno"
  let smjerMost = $state(null);
  const potpunPolovi = $derived(
    (!pitaj.includes("uloge") || ulogaAnode != null) && (!pitaj.includes("polovi") || polLijevo != null) && (!pitaj.includes("elektroni") || smjerE != null) && (!pitaj.includes("most") || smjerMost != null),
  );
  function predajPolove() {
    if (!aktivno || !potpunPolovi) return;
    onodgovor({ anoda: ulogaAnode, polovi: polLijevo ? [polLijevo, polLijevo === "+" ? "−" : "+"] : null, elektroni: smjerE, most: smjerMost });
  }
  $effect(() => {
    if (!pokazi || !c || nacin !== "polovi") return;
    untrack(() => {
      ulogaAnode = c.anoda;
      polLijevo = c.anoda === 0 ? "−" : "+";
      smjerE = c.anoda === 0 ? "desno" : "lijevo";
      smjerMost = smjerE;
    });
  });
  const losa = (k) => !!ishod && !ishod.tocno && !ishod.prazno && (ishod.krivo ?? []).includes(k);

  // napon
  let unosNapona = $state("");

  // geometrija dviju čaša
  const XL = 88;
  const XR = 272;
  const caseX = [XL, XR];
  const putElektrona = (ia) => {
    const a = caseX[ia];
    const k = caseX[1 - ia];
    return `M${a},54 V24 H${k} V54`;
  };
  const putMosta = (odLijevo) => (odLijevo ? `M${XL + 30},192 V88 Q${XL + 30},76 ${XL + 42},76 H${XR - 42} Q${XR - 30},76 ${XR - 30},88 V192` : `M${XR - 30},192 V88 Q${XR - 30},76 ${XR - 42},76 H${XL + 42} Q${XL + 30},76 ${XL + 30},88 V192`);
  const nazivElektrode = (p) => (p.metal ? p.red : "Pt");

  // ════════ ISTISKIVANJE ════════
  const ist = untrack(() => (jeIstiskivanje ? istiskivanje(spec.metal, spec.otopina) : null));
  let izborReagira = $state(null);
  let koefIst = $state(untrack(() => (ist?.jednadzba ? ist.jednadzba.clanovi.map(() => "") : [])));
  const trebaJednadzbu = untrack(() => !!spec.jednadzba);
  function odaberiReagira(v) {
    if (!aktivno) return;
    izborReagira = v;
    if (!v || !trebaJednadzbu) onodgovor({ reagira: v });
  }
  function predajIst(e) {
    e?.preventDefault();
    if (!aktivno || izborReagira == null) return;
    onodgovor({ reagira: izborReagira, koeficijenti: [...koefIst] });
  }
  $effect(() => {
    if (!pokazi || !ist) return;
    untrack(() => {
      izborReagira = ist.reagira;
      if (ist.jednadzba) koefIst = ist.jednadzba.clanovi.map((x) => (x.k === 1 ? "" : String(x.k)));
    });
  });
  const istBojaPrije = untrack(() => (ist ? bojaIona(ist.pk.oks) : null));
  const istBojaPoslije = untrack(() => (ist ? (bojaIona(ist.pm.oks) ?? istBojaPrije) : null));
  const istPrijeBlijedi = untrack(() => !!ist && ist.reagira && !bojaIona(ist.pm.oks) && !!istBojaPrije);

  // ════════ ELEKTROLIZA ════════
  const izborEl = untrack(() => spec.izbor ?? null);
  let elIndeks = $state(untrack(() => Math.max(0, (spec.izbor ?? []).findIndex((x) => x.elektrolit === spec.elektrolit && x.stanje === spec.stanje))));
  let specEl = $derived(jeElektroliza && istrazi && izborEl ? { ...spec, ...{ anoda: undefined, katoda: undefined }, ...izborEl[elIndeks] } : spec);
  let cel = $derived(jeElektroliza ? celije(specEl).map((x) => ({ c: x, e: elektroliza(x) })) : []);
  let vidiProdukte = $derived(istrazi || nacin === "faraday" || otkriveno);

  // istraživanje: klizači
  const rasponI = untrack(() => spec.raspon_I ?? [0.1, 5]);
  const rasponT = untrack(() => spec.raspon_t ?? [1, 60]);
  let jakost = $state(untrack(() => Math.min(rasponI[1], Math.max(rasponI[0], spec.struja?.I ?? 1))));
  let minute = $state(untrack(() => Math.min(rasponT[1], Math.max(rasponT[0], spec.vrijeme ? Math.round(sekunde(spec.vrijeme) / 60) : 10))));
  let uzivo = $derived(jeElektroliza && istrazi ? uzivoElektroliza(specEl, Number(jakost), Number(minute)) : null);
  let najvise = $derived(jeElektroliza && istrazi ? uzivoElektroliza(specEl, rasponI[1], rasponT[1]) : null);
  const korakI = untrack(() => (rasponI[1] - rasponI[0] > 2 ? 0.1 : 0.05));
  const plinZapis = untrack(() => (spec.plin ? uvjetiZapis(spec) : "normirani uvjeti (0 °C, 101 kPa)"));

  // debljina izlučenog metala i broj mjehurića
  function intenzitet(f) {
    if (!istrazi || !uzivo || !najvise) return 0.6;
    const x = uzivo.tvari.find((t) => t.f === f);
    const y = najvise.tvari.find((t) => t.f === f);
    return x && y && y.n > 0 ? Math.max(0.12, x.n / y.n) : 0.6;
  }
  let mjehurBroj = $derived(istrazi ? 5 + Math.round(((Number(jakost) - rasponI[0]) / (rasponI[1] - rasponI[0])) * 7) : 8);

  // produkti: izbor učenika
  const pitajProdukte = untrack(() => spec.pitaj ?? ["katoda", "anoda"]);
  const opcije = untrack(() => {
    if (nacin !== "produkti") return null;
    const o = opcijeProdukata(celije(spec)[0]);
    if (!o) return null;
    return { katoda: seededShuffle(o.katoda, `${spec.elektrolit}k`), anoda: seededShuffle(o.anoda, `${spec.elektrolit}a`) };
  });
  let produkt = $state({ katoda: null, anoda: null });
  const potpunProdukti = $derived(pitajProdukte.every((s) => produkt[s]));
  function predajProdukte() {
    if (aktivno && potpunProdukti) onodgovor({ ...produkt });
  }
  $effect(() => {
    if (!pokazi || nacin !== "produkti" || !cel[0]?.e || cel[0].e.greska) return;
    untrack(() => (produkt = { katoda: cel[0].e.katoda.produkt, anoda: cel[0].e.anoda.produkt }));
  });
  const vidiStranu = (strana) => vidiProdukte || (nacin === "produkti" && !pitajProdukte.includes(strana));

  // geometrija elektrolize: jedan članak ili dva serijski
  function geometrija(n) {
    if (n === 1) return [{ cx: 180, hw: 110, xa: 128, xk: 232 }];
    return [
      { cx: 92, hw: 72, xa: 60, xk: 124 },
      { cx: 268, hw: 72, xa: 236, xk: 300 },
    ];
  }
  let geo = $derived(geometrija(cel.length));
  function zice(g) {
    if (g.length === 1) return `M${g[0].xa},54 V24 H172 M188,24 H${g[0].xk} V54`;
    return `M${g[0].xa},54 V18 H172 M188,18 H${g[1].xk} V54 M${g[0].xk},54 V40 H${g[1].xa} V54`;
  }
  const izvorY = (n) => (n === 1 ? 24 : 18);

  // faraday: lanac kartica
  const trazeni = untrack(() => (nacin === "faraday" ? traziOf(spec) : []));
  const iz = untrack(() => izlucenoOf(spec));
  let unosi = $state(untrack(() => trazeni.map(() => "")));
  const potpunLanac = $derived(unosi.every((v) => String(v).trim()));
  function predajLanac(e) {
    e.preventDefault();
    if (!locked && potpunLanac) onodgovor($state.snapshot(unosi));
  }
  const okK = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina > i);
  const badK = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  function potencija(i) {
    const v = String(unosi[i]).trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
    document.getElementById(`ek-${uid}-${i}`)?.focus();
  }
  const konstante = untrack(() => {
    if (!jeElektroliza || istrazi || nacin === "produkti") return [];
    const out = [`F = ${KONSTANTE.F.zapis}`];
    const v = trazeni.some((t) => t.velicina === "V") || iz?.q === "V";
    if (v && spec.plin?.uvjeti === "normirani") out.push(`V_m = ${KONSTANTE.Vm.zapis}`);
    if (v && spec.plin && spec.plin.uvjeti !== "normirani") out.push(`R = ${KONSTANTE.R.zapis}`, `T = t + ${KONSTANTE.T0.zapis}`);
    return out;
  });
  const jedinicaPrikaz = (q, v) => {
    if (q === "V") return v < 1 ? `${formatSci(v * 1000)} mL` : `${formatSci(v)} L`;
    return v < 0.1 ? `${formatSci(v * 1000)} mg` : `${formatSci(v)} g`;
  };
  const naslovCelije = (x) => `${x.c.elektrolit}(${x.c.stanje})`;
</script>

<!-- ═════ snippeti ═════ -->
{#snippet sf(f, x, y, cls = "", anchor = "middle")}
  <text {x} {y} class="ek-st {cls}" text-anchor={anchor}>{#each svgDijelovi(f) as d (d.i)}<tspan dy={d.dy} font-size={d.fs}>{d.z}</tspan>{/each}</text>
{/snippet}

{#snippet tvar(x)}<span class="ek-nw"><Formula f={x.f} />{#if x.st}<span class="ek-stanje">({x.st})</span>{/if}</span>{/snippet}

{#snippet jedn(j)}
  {#if j}
    {@const L = lijevo(j)}
    {@const D = desno(j)}
    <span class="ek-eq">
      {#each L as x, k (k)}
        <span class="ek-par">{#if k}<span class="ek-plus">+</span>{/if}{#if x.k > 1}<span>{x.k}</span>{/if}{@render tvar(x)}</span>
      {/each}
      <span class="ek-par"><span class="ek-str">→</span>{#if D[0]}{#if D[0].k > 1}<span>{D[0].k}</span>{/if}{@render tvar(D[0])}{/if}</span>
      {#each D.slice(1) as x, k (k)}
        <span class="ek-par"><span class="ek-plus">+</span>{#if x.k > 1}<span>{x.k}</span>{/if}{@render tvar(x)}</span>
      {/each}
    </span>
  {/if}
{/snippet}

<!-- tekst iz kataloga: riječi s indeksima ili nabojem (Cu²⁺, H₂O, E°(Na⁺/Na)) idu kroz Formula -->
{#snippet tekst(t)}{#each String(t).split(/(\s+)/) as r, k (k)}{#if /^[A-Za-z]_[A-Za-z]+$/.test(r)}{r[0]}<sub>{r.slice(2)}</sub>{:else if /[₀-₉⁰-⁹⁺⁻]/.test(r)}<Formula f={r} />{:else}{r}{/if}{/each}{/snippet}

<!-- shema članka: dijelovi odvojeni crtama ostaju u jednom komadu -->
{#snippet shema(t)}
  <span class="ek-shema">{#each t.split(" ‖ ") as pola, i (i)}{#if i}<span class="ek-par"><span class="ek-crta">‖</span></span>{/if}{#each pola.split(" | ") as d, k (k)}<span class="ek-par">{#if k}<span class="ek-crta">|</span>{/if}<Formula f={d} /></span>{/each}{/each}</span>
{/snippet}

{#snippet mjehurici(x, y0, y1, broj, boja, seed)}
  {#each Array.from({ length: broj }, (_, k) => k) as k (k)}
    {@const dx = ((k * 37 + seed * 11) % 15) - 7}
    {@const r = 2.2 + ((k * 13 + seed) % 3) * 0.7}
    {@const d = ((k * 0.41 + seed * 0.13) % 1.6).toFixed(2)}
    <circle
      class="ek-mjehur"
      class:anim={!mirno}
      style="--dy:{y0 - y1}px;--sy:{(((k + 1) / (broj + 1)) * (y0 - y1)).toFixed(1)}px;--d:{d}s;--t:{(1.3 + (k % 3) * 0.3).toFixed(1)}s"
      cx={x + dx}
      cy={y0}
      {r}
      fill={boja ?? "none"}
    />
  {/each}
{/snippet}

<!-- ═════ tekst ═════ -->
{#if istrazi}
  <div class="ek-tekst"><Md text={spec.tekst} /></div>
  <p class="ek-hint">{jeClanak ? "Odaberi elektrode – ovo nije zadatak, samo istražuješ." : "Mijenjaj elektrolit, struju i vrijeme – ovo nije zadatak, samo istražuješ."}</p>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<!-- ═════ GALVANSKI ČLANAK ═════ -->
{#if jeClanak && c}
  {#if istrazi}
    <div class="ek-izbor">
      {#each [0, 1] as i (i)}
        <label class="ek-sel">
          <span>{i === 0 ? "Lijeva čaša" : "Desna čaša"}</span>
          <select class="inp" bind:value={odabrano[i]} aria-label={i === 0 ? "Elektroda u lijevoj čaši" : "Elektroda u desnoj čaši"}>
            {#each izborParova as p (p.kljuc)}
              <option value={p.kljuc} disabled={p.kljuc === odabrano[1 - i]}>{p.kljuc} ({zapisE(p.E)} V)</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>
  {/if}

  <div class="ek-crtez">
    <svg viewBox="0 0 360 236" class="ek-svg" role="img" aria-label="Galvanski članak: {c.parovi.map((p) => nazivElektrode(p)).join(' i ')}, elektrolitni most i voltmetar{vidiNapon ? `, napon ${zapisEV(c.dE)}` : ''}">
      <defs>
        {#each [0, 1] as i (i)}<clipPath id="ek-c{uid}-{i}"><path d="M{caseX[i] - 57},100 V218 Q{caseX[i] - 57},225 {caseX[i] - 50},225 H{caseX[i] + 50} Q{caseX[i] + 57},225 {caseX[i] + 57},218 V100 Z" /></clipPath>{/each}
      </defs>
      <!-- žice -->
      <path class="ek-zica" d="M{XL},54 V24 H{XR} V54" />
      <!-- čaše s otopinama -->
      {#each c.parovi as p, i (i)}
        {@const x = caseX[i]}
        {@const b = p.metal ? bojaIona(p.oks) : p.nemetal !== "H₂" ? PLIN_BOJA[p.nemetal] : null}
        <path class="ek-staklo-poz" d="M{x - 58},100 V218 Q{x - 58},226 {x - 50},226 H{x + 50} Q{x + 58},226 {x + 58},218 V100 Z" />
        <g clip-path="url(#ek-c{uid}-{i})">
          <rect x={x - 60} y="128" width="120" height="100" class={b ? "" : "ek-voda"} fill={b ?? undefined} fill-opacity={b ? 0.5 : undefined} />
          <line x1={x - 58} x2={x + 58} y1="128" y2="128" class="ek-povrsina" />
        </g>
        <path class="ek-staklo" d="M{x - 58},100 V218 Q{x - 58},226 {x - 50},226 H{x + 50} Q{x + 58},226 {x + 58},218 V100" />
        <!-- elektroda -->
        <rect x={x - (p.metal ? 8 : 5)} y="54" width={p.metal ? 16 : 10} height="148" rx="2" class="ek-elektroda" fill={bojaMetala(nazivElektrode(p))} />
        <text x={x} y="72" class="ek-st ek-simbol" text-anchor="middle">{nazivElektrode(p)}</text>
        {#if !p.metal && p.nemetal === "H₂"}
          {@render mjehurici(x, 196, 132, 5, null, i + 1)}
        {/if}
        <!-- ioni izlaze iz anode, ulaze u katodu -->
        {#if vidiUloge && !mirno && p.metal}
          {#each [-1, 1] as sm (sm)}
            {#each [0, 1] as k (k)}
              <circle class="ek-ion" class:izlazi={i === c.anoda} class:ulazi={i !== c.anoda} style="--dx:{sm * 18}px;--d:{(k * 0.9 + (sm > 0 ? 0.45 : 0)).toFixed(2)}s" cx={x + sm * (i === c.anoda ? 10 : 28)} cy={150 + k * 26 + (sm > 0 ? 10 : 0)} r="2.6" fill={bojaIona(p.oks) ?? "var(--text-dim)"} />
            {/each}
          {/each}
        {/if}
      {/each}
      <!-- elektrolitni most -->
      <path class="ek-most-rub" d={putMosta(true)} />
      <path class="ek-most" d={putMosta(true)} />
      {#if most}
        <text x="180" y="96" class="ek-st ek-mala" text-anchor="middle">most</text>
        {@render sf(spec.most ?? "KNO₃", 180, 110, "ek-mala")}
      {/if}
      {#if vidiUloge}
        {#key `${c.anoda}-${mirno}`}
          {#if !mirno}
            {#each [0, 1] as k (k)}
              <g class="ek-most-ion"><circle r="5.5" class="ek-kation" /><text class="ek-st ek-znak" text-anchor="middle" y="3">+</text><animateMotion dur="5s" begin="{-k * 2.5}s" repeatCount="indefinite" path={putMosta(c.anoda === 0)} /></g>
              <g class="ek-most-ion"><circle r="5.5" class="ek-anion" /><text class="ek-st ek-znak" text-anchor="middle" y="3">−</text><animateMotion dur="5s" begin="{-k * 2.5 - 1.25}s" repeatCount="indefinite" path={putMosta(c.anoda !== 0)} /></g>
            {/each}
          {/if}
          <!-- elektroni u žici -->
          {#if !mirno}
            {#each [0, 1, 2, 3, 4] as k (k)}
              <circle r="3.4" class="ek-e"><animateMotion dur="4s" begin="{-k * 0.8}s" repeatCount="indefinite" path={putElektrona(c.anoda)} /></circle>
            {/each}
          {/if}
        {/key}
        {#each [c.anoda === 0 ? [XL + 20, 140] : [XR - 20, 220], c.anoda === 0 ? [220, XR - 20] : [140, XL + 20]] as [a, b], k (k)}
          <line class="ek-strelica" x1={a} y1="12" x2={b} y2="12" marker-end="url(#ek-vrh{uid})" />
          <text x={(a + b) / 2} y="8" class="ek-st ek-e-oznaka" text-anchor="middle">e<tspan dy="-4" font-size="70%">−</tspan></text>
        {/each}
        {#each [0, 1] as i (i)}
          <text x={caseX[i] + (i === 0 ? -26 : 26)} y="48" class="ek-st ek-pol" text-anchor="middle">{i === c.anoda ? "−" : "+"}</text>
        {/each}
      {/if}
      <defs><marker id="ek-vrh{uid}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 Z" class="ek-vrh" /></marker></defs>
      <!-- voltmetar -->
      <circle cx="180" cy="24" r="16" class="ek-metar" />
      <text x="180" y="29" class="ek-st ek-v" text-anchor="middle">V</text>
      <text x="180" y="58" class="ek-st ek-ocitanje" text-anchor="middle">{vidiNapon ? zapisEV(c.dE) : "? V"}</text>
    </svg>
  </div>

  <!-- opis čaša -->
  <div class="ek-case">
    {#each c.parovi as p, i (i)}
      <div class="ek-casa-opis" class:anoda={vidiUloge && i === c.anoda} class:katoda={vidiUloge && i !== c.anoda}>
        <div class="ek-casa-naslov"><b><Formula f={nazivElektrode(p)} /></b> u {#if otopinaCase(i)}<Formula f={`${otopinaCase(i)}(aq)`} />{:else}<Formula f={`${p.ion}(aq)`} />{/if}</div>
        {#if pokaziE}<div class="ek-e0">E°(<Formula f={p.kljuc} />) = {zapisEV(p.E)}</div>{/if}
        {#if vidiUloge}
          <div class="ek-uloga">{i === c.anoda ? "anoda (−) · oksidacija" : "katoda (+) · redukcija"}</div>
        {:else if nacin === "polovi"}
          {#if pitaj.includes("uloge")}
            <div class="ek-seg" class:bad={losa("uloge")} role="group" aria-label="Uloga elektrode {nazivElektrode(p)}">
              <button type="button" class="ek-gumb" class:on={ulogaAnode === i} aria-pressed={ulogaAnode === i} disabled={!aktivno} onclick={() => (ulogaAnode = i)}>anoda</button>
              <button type="button" class="ek-gumb" class:on={ulogaAnode === 1 - i} aria-pressed={ulogaAnode === 1 - i} disabled={!aktivno} onclick={() => (ulogaAnode = 1 - i)}>katoda</button>
            </div>
          {/if}
          {#if pitaj.includes("polovi")}
            {@const moj = polLijevo == null ? null : i === 0 ? polLijevo : polLijevo === "+" ? "−" : "+"}
            <div class="ek-seg" class:bad={losa("polovi")} role="group" aria-label="Pol elektrode {nazivElektrode(p)}">
              {#each ["−", "+"] as z (z)}
                <button type="button" class="ek-gumb ek-gumb-pol" class:on={moj === z} aria-pressed={moj === z} aria-label="pol {z === '+' ? 'plus' : 'minus'}" disabled={!aktivno} onclick={() => (polLijevo = i === 0 ? z : z === "+" ? "−" : "+")}>{z}</button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  {#if nacin === "polovi" && !vidiUloge}
    {#if pitaj.includes("elektroni")}
      <div class="ek-red" class:bad={losa("elektroni")} role="group" aria-label="Smjer elektrona u žici">
        <span class="ek-red-nasl">Elektroni u žici idu:</span>
        {#each ["desno", "lijevo"] as sm (sm)}
          {@const [a, b] = sm === "desno" ? [c.parovi[0], c.parovi[1]] : [c.parovi[1], c.parovi[0]]}
          <button type="button" class="ek-gumb" class:on={smjerE === sm} aria-pressed={smjerE === sm} disabled={!aktivno} onclick={() => (smjerE = sm)}><Formula f={nazivElektrode(a)} /> → <Formula f={nazivElektrode(b)} /></button>
        {/each}
      </div>
    {/if}
    {#if pitaj.includes("most")}
      <div class="ek-red" class:bad={losa("most")} role="group" aria-label="Smjer kationa iz mosta">
        <span class="ek-red-nasl">Kationi iz mosta (<Formula f={most?.kation ?? "K⁺"} />) idu prema:</span>
        {#each ["lijevo", "desno"] as sm (sm)}
          <button type="button" class="ek-gumb" class:on={smjerMost === sm} aria-pressed={smjerMost === sm} disabled={!aktivno} onclick={() => (smjerMost = sm)}>{sm === "lijevo" ? "lijevoj" : "desnoj"} čaši (<Formula f={nazivElektrode(c.parovi[sm === "lijevo" ? 0 : 1])} />)</button>
        {/each}
      </div>
    {/if}
    <div class="ek-akcija"><button class="btn btn-primary" type="button" disabled={!aktivno || !potpunPolovi} onclick={predajPolove}>Provjeri</button></div>
  {/if}

  {#if nacin === "napon"}
    <div class="ek-napon">
      <span class="ek-napon-oznaka">ΔE° =</span>
      <BrojUnos jedinica="V" {locked} {ishod} bind:vrijednost={unosNapona} {onodgovor} oznaka="Razlika standardnih elektrodnih potencijala u voltima" gumbPredznak={true} />
    </div>
  {/if}

  {#if istrazi || otkriveno}
    <div class="ek-info" aria-live="polite">
      <div><span class="ek-info-nasl">anoda (−), oksidacija:</span> {@render jedn(c.oks)}</div>
      <div><span class="ek-info-nasl">katoda (+), redukcija:</span> {@render jedn(c.red)}</div>
      {#if c.mnoziK !== 1 || c.mnoziA !== 1}<div class="ek-napomena">Za ukupnu jednadžbu {c.mnoziA !== 1 ? `oksidaciju množimo s ${c.mnoziA}` : ""}{c.mnoziA !== 1 && c.mnoziK !== 1 ? ", a " : ""}{c.mnoziK !== 1 ? `redukciju s ${c.mnoziK}` : ""}, da broj elektrona bude jednak. Potencijal se ne množi.</div>{/if}
      <div><span class="ek-info-nasl">ukupno:</span> {@render jedn(c.ukupno)}</div>
      <div><span class="ek-info-nasl">shema:</span> {@render shema(c.shema)}</div>
      <div><span class="ek-info-nasl">napon:</span> <span class="ek-par">ΔE° = E°(katoda) − E°(anoda)</span> <span class="ek-par">= {zapisEV(c.ka.E)} − {c.an.E < 0 ? `(${zapisEV(c.an.E)})` : zapisEV(c.an.E)}</span> <span class="ek-par">= <b>{zapisEV(c.dE)}</b></span></div>
      {#if istrazi}
        {@const a = c.an}
        {@const k = c.ka}
        <div class="ek-ist">
          <span class="ek-info-nasl">istiskivanje:</span>
          {#if a.metal && k.metal}
            <span><Formula f={a.red} /> u otopini iona <Formula f={k.oks} /> reagira (izlučuje se {k.naziv}); <Formula f={k.red} /> u otopini iona <Formula f={a.oks} /> ne reagira.</span>
          {:else if a.metal && k.kljuc === "H⁺/H₂"}
            <span><Formula f={a.red} /> s kiselinom razvija vodik (E° je negativan).</span>
          {:else if k.metal && a.kljuc === "H⁺/H₂"}
            <span><Formula f={k.red} /> ne reagira s kiselinom (E° je pozitivan).</span>
          {:else}
            <span>Jače oksidacijsko sredstvo je <Formula f={k.oks} /> (veći E°).</span>
          {/if}
        </div>
        <details class="ek-niz">
          <summary>Voltin niz (E° s lista)</summary>
          <ol>
            {#each izborParova as p (p.kljuc)}
              <li class:anoda={p.kljuc === c.an.kljuc} class:katoda={p.kljuc === c.ka.kljuc}>
                <span><Formula f={p.kljuc} /></span><span class="ek-niz-e">{zapisEV(p.E)}</span>{#if p.kljuc === c.an.kljuc}<span class="ek-niz-oz">anoda</span>{:else if p.kljuc === c.ka.kljuc}<span class="ek-niz-oz">katoda</span>{/if}
              </li>
            {/each}
          </ol>
          <p class="ek-napomena">Gore su jača oksidacijska sredstva (ioni lakše primaju elektrone), dolje jača redukcijska sredstva (metali lakše otpuštaju elektrone).</p>
        </details>
      {/if}
    </div>
  {/if}
{/if}

<!-- ═════ ISTISKIVANJE ═════ -->
{#if jeIstiskivanje && ist}
  {@const vidi = otkriveno && ist.reagira}
  {@const prev = ist.kiselina ? null : ist.pk.red}
  <div class="ek-crtez ek-uzak">
    <svg viewBox="0 0 360 236" class="ek-svg" role="img" aria-label="{ist.pm.naziv} uronjen u otopinu {spec.otopina}">
      <defs><clipPath id="ek-i{uid}"><path d="M111,70 V218 Q111,225 118,225 H242 Q249,225 249,218 V70 Z" /></clipPath></defs>
      <path class="ek-staklo-poz" d="M110,70 V218 Q110,226 118,226 H242 Q250,226 250,218 V70 Z" />
      <g clip-path="url(#ek-i{uid})">
        <rect x="108" y="104" width="144" height="124" class={istBojaPrije ? "" : "ek-voda"} fill={istBojaPrije ?? undefined} fill-opacity={istBojaPrije ? (vidi && istPrijeBlijedi ? 0.16 : 0.5) : undefined} style="transition: fill-opacity 2s ease" />
        {#if vidi && istBojaPoslije && istBojaPoslije !== istBojaPrije}
          <rect x="108" y="104" width="144" height="124" fill={istBojaPoslije} class="ek-pojava" style="--o:0.42" />
        {/if}
        <line x1="110" x2="250" y1="104" y2="104" class="ek-povrsina" />
      </g>
      <path class="ek-staklo" d="M110,70 V218 Q110,226 118,226 H242 Q250,226 250,218 V70" />
      <rect x="168" y="36" width="24" height="168" rx="3" class="ek-elektroda" fill={bojaMetala(spec.metal)} />
      <text x="180" y="56" class="ek-st ek-simbol" text-anchor="middle">{spec.metal}</text>
      {#if vidi && prev}
        <g class="ek-pojava" style="--o:1">
          <rect x="165" y="106" width="30" height="100" rx="4" fill={bojaMetala(prev)} fill-opacity="0.92" class="ek-prevlaka" />
          {#if prev === "Ag"}
            <path d="M165,120 l-6,-4 M165,140 l-7,1 M165,165 l-6,4 M195,128 l6,-3 M195,150 l7,0 M195,178 l6,4" stroke={bojaMetala("Ag")} stroke-width="2" stroke-linecap="round" />
          {/if}
        </g>
      {/if}
      {#if vidi && ist.kiselina}
        {@render mjehurici(162, 200, 110, 6, null, 3)}
        {@render mjehurici(198, 196, 110, 6, null, 7)}
      {/if}
    </svg>
  </div>
  <p class="ek-dodaje"><Formula f={spec.metal} /> ({ist.pm.naziv}) uronjen u otopinu <Formula f={`${spec.otopina}(aq)`} />{#if pokaziE}<span class="ek-e0"> · E°(<Formula f={ist.pm.kljuc} />) = {zapisEV(ist.pm.E)}, E°(<Formula f={ist.pk.kljuc} />) = {zapisEV(ist.pk.E)}</span>{/if}</p>

  <div class="lx-options ek-opcije">
    {#each [true, false] as v (v)}
      {@const ok = (izborReagira === v && ishod?.tocno) || (pokazi && ist.reagira === v)}
      {@const bad = izborReagira === v && ishod && !ishod.tocno && ishod.krivoReagira}
      <button class="lx-option" class:sel={izborReagira === v && !ok && !bad} class:ok class:bad disabled={!aktivno} onclick={() => odaberiReagira(v)}>
        <span class="lx-mark">{ok ? "✓" : bad ? "✕" : ""}</span><span>{v ? "Da, reagira" : "Ne, ne reagira"}</span>
      </button>
    {/each}
  </div>
  {#if trebaJednadzbu && izborReagira === true && ist.jednadzba}
    {@const j = ist.jednadzba}
    <form class="ek-jkoef" onsubmit={predajIst}>
      <p class="ek-napomena">Upiši koeficijente ionske jednadžbe (prazno polje znači 1):</p>
      <div class="ek-eq ek-eq-unos">
        {#each j.clanovi as x, i (i)}
          <span class="ek-par">
            {#if i === j.reaktanti.length}<span class="ek-str">→</span>{:else if i > 0}<span class="ek-plus">+</span>{/if}
            <input class="inp ek-kinp" class:ok={ishod?.tocno} class:bad={ishod && !ishod.tocno && ishod.koefKrivo} inputmode="numeric" autocomplete="off" placeholder="1" aria-label="Koeficijent ispred {x.f}" disabled={!aktivno} bind:value={koefIst[i]} />
            <Formula f={x.f} /><span class="ek-stanje">({x.st})</span>
          </span>
        {/each}
      </div>
      <div class="ek-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno}>Provjeri</button></div>
    </form>
  {/if}
  {#if otkriveno && ist.reagira}
    <div class="ek-info">{@render jedn(ist.jednadzba)}</div>
  {/if}
{/if}

<!-- ═════ ELEKTROLIZA ═════ -->
{#if jeElektroliza && cel.length && cel.every((x) => !x.e.greska)}
  {#if istrazi && izborEl}
    <div class="ek-chips" role="group" aria-label="Elektrolit">
      {#each izborEl as x, i (i)}
        <button type="button" class="ek-chip" class:on={elIndeks === i} aria-pressed={elIndeks === i} onclick={() => (elIndeks = i)}><Formula f={`${x.elektrolit}(${x.stanje})`} /> <span class="ek-chip-n">{x.stanje === "l" ? "talina" : "otopina"}</span></button>
      {/each}
    </div>
  {/if}

  <div class="ek-crtez" class:ek-uzak={cel.length === 1}>
    <svg viewBox="0 0 360 {cel.length === 1 ? 248 : 236}" class="ek-svg" role="img" aria-label="Elektrolizni članak{cel.length > 1 ? 'i spojeni serijski' : ''}: {cel.map((x) => naslovCelije(x)).join(', ')}">
      <defs>
        {#each geo as g, i (i)}<clipPath id="ek-e{uid}-{i}"><path d="M{g.cx - g.hw + 1},96 V218 Q{g.cx - g.hw + 1},225 {g.cx - g.hw + 8},225 H{g.cx + g.hw - 8} Q{g.cx + g.hw - 1},225 {g.cx + g.hw - 1},218 V96 Z" /></clipPath>{/each}
      </defs>
      <path class="ek-zica" d={zice(geo)} />
      <!-- izvor struje: dulja tanka crta +, kraća debela − -->
      <line x1="172" x2="172" y1={izvorY(cel.length) - 13} y2={izvorY(cel.length) + 13} class="ek-izvor" />
      <line x1="188" x2="188" y1={izvorY(cel.length) - 7} y2={izvorY(cel.length) + 7} class="ek-izvor debeo" />
      <text x="164" y={izvorY(cel.length) - 6} class="ek-st ek-pol" text-anchor="end">+</text>
      <text x="196" y={izvorY(cel.length) - 6} class="ek-st ek-pol" text-anchor="start">−</text>
      {#each cel as x, i (i)}
        {@const g = geo[i]}
        {@const e = x.e}
        {@const talina = e.talina}
        {@const bojaOt = talina ? null : bojaIona(e.ioni.kation)}
        {@const katodaMetal = vidiStranu("katoda") && !["H₂"].includes(e.katoda.produkt)}
        {@const katodaPlin = vidiStranu("katoda") && e.katoda.produkt === "H₂"}
        {@const anodaProd = vidiStranu("anoda") ? e.anoda.produkt : null}
        {@const debljina = katodaMetal ? 1 + 4 * intenzitet(e.katoda.produkt) : 0}
        {@const otapanje = vidiStranu("anoda") && e.anoda.otapa ? 1 + 3 * intenzitet(e.anoda.otapa) : 0}
        <path class="ek-staklo-poz" d="M{g.cx - g.hw},96 V218 Q{g.cx - g.hw},226 {g.cx - g.hw + 8},226 H{g.cx + g.hw - 8} Q{g.cx + g.hw},226 {g.cx + g.hw},218 V96 Z" />
        <g clip-path="url(#ek-e{uid}-{i})">
          <rect x={g.cx - g.hw} y="122" width={2 * g.hw} height="106" class={bojaOt ? "" : talina ? "ek-talina" : "ek-voda"} fill={bojaOt ?? undefined} fill-opacity={bojaOt ? 0.5 : undefined} />
          <line x1={g.cx - g.hw} x2={g.cx + g.hw} y1="122" y2="122" class="ek-povrsina" />
          {#if anodaProd && ["Br₂", "I₂"].includes(anodaProd)}
            <ellipse cx={g.xa} cy="196" rx="20" ry="26" fill={PLIN_BOJA[anodaProd]} class="ek-oblak" class:anim={!mirno} />
          {/if}
        </g>
        <path class="ek-staklo" d="M{g.cx - g.hw},96 V218 Q{g.cx - g.hw},226 {g.cx - g.hw + 8},226 H{g.cx + g.hw - 8} Q{g.cx + g.hw},226 {g.cx + g.hw},218 V96" />
        <!-- anoda (lijevo, +) i katoda (desno, −) -->
        {#each [["anoda", g.xa, e.anodaMat], ["katoda", g.xk, e.katodaMat]] as [strana, ex, mat] (strana)}
          {@const sir = strana === "anoda" ? 14 - otapanje : 14}
          <rect x={ex - sir / 2} y="54" width={sir} height="148" rx="2" class="ek-elektroda" fill={bojaMetala(mat)} />
          <text x={ex} y="70" class="ek-st ek-simbol" class:svijetao={mat === "grafit"} text-anchor="middle">{mat === "grafit" ? "C" : mat}</text>
          <text x={ex + (strana === "anoda" ? -14 : 14)} y="48" class="ek-st ek-pol" text-anchor="middle">{strana === "anoda" ? "+" : "−"}</text>
        {/each}
        {#if katodaMetal}
          <rect x={g.xk - 7 - debljina} y="124" width={14 + 2 * debljina} height="80" rx="3" fill={bojaMetala(e.katoda.produkt)} class="ek-prevlaka" style="transition: all 0.4s ease" />
        {/if}
        {#if katodaPlin}
          {#key mjehurBroj}{@render mjehurici(g.xk, 198, 126, mjehurBroj, null, i * 2 + 1)}{/key}
        {/if}
        {#if anodaProd && ["O₂", "Cl₂", "F₂"].includes(anodaProd)}
          {#key mjehurBroj}{@render mjehurici(g.xa, 198, 126, anodaProd === "O₂" ? Math.max(3, Math.round(mjehurBroj / 2)) : mjehurBroj, PLIN_BOJA[anodaProd] ?? null, i * 2 + 2)}{/key}
        {/if}
        {#if talina}
          {#each [-30, 0, 30] as dx (dx)}
            <path class="ek-toplina" d="M{g.cx + dx},244 c-3,-3 3,-5 0,-8 c-3,-3 3,-5 0,-8" />
          {/each}
        {/if}
      {/each}
    </svg>
  </div>

  <!-- natpisi ispod crteža -->
  <div class="ek-celije" class:dvije={cel.length > 1}>
    {#each cel as x, i (i)}
      {@const e = x.e}
      <div class="ek-celija">
        <div class="ek-casa-naslov">{#if cel.length > 1}<b>{i + 1}.</b> {/if}<Formula f={naslovCelije(x)} /> <span class="ek-chip-n">{e.talina ? "talina" : "vodena otopina"}{e.anodaMat !== "grafit" || e.katodaMat !== "grafit" ? ` · anoda ${NAZIV_ELEKTRODE[e.anodaMat] ?? e.anodaMat}, katoda ${NAZIV_ELEKTRODE[e.katodaMat] ?? e.katodaMat}` : " · grafitne elektrode"}</span></div>
        {#each [["anoda", e.anoda], ["katoda", e.katoda]] as [strana, st] (strana)}
          <div class="ek-strana">
            <span class="ek-info-nasl">{strana} ({strana === "anoda" ? "+" : "−"}):</span>
            {#if nacin === "produkti" && pitajProdukte.includes(strana) && !otkriveno}
              <span class="ek-chips ek-chips-mali" class:bad={!!ishod && !ishod.tocno && !ishod.prazno && (ishod.krivo ?? []).includes(strana)} role="group" aria-label="Što nastaje na {strana === 'anoda' ? 'anodi' : 'katodi'}">
                {#each opcije[strana] as o (o.kljuc)}
                  <button type="button" class="ek-chip" class:on={produkt[strana] === o.kljuc} aria-pressed={produkt[strana] === o.kljuc} disabled={!aktivno} onclick={() => (produkt[strana] = o.kljuc)}><Formula f={o.f} /> <span class="ek-chip-n">{o.tekst}</span></button>
                {/each}
              </span>
            {:else if vidiStranu(strana)}
              {@render jedn(st.j)}
            {:else}
              <span class="ek-upit">?</span>
            {/if}
          </div>
          {#if (istrazi || otkriveno) && st.razlog}<div class="ek-napomena">{@render tekst(st.razlog)}</div>{/if}
        {/each}
        {#if istrazi && e.ukupno}<div class="ek-strana"><span class="ek-info-nasl">ukupno:</span> {@render jedn(e.ukupno)}</div>{/if}
        {#if istrazi && !e.ukupno}<div class="ek-napomena">Ukupno se ništa ne mijenja u otopini: metal samo prelazi s anode na katodu (pročišćavanje).</div>{/if}
      </div>
    {/each}
  </div>

  {#if nacin === "produkti" && !otkriveno}
    <div class="ek-akcija"><button class="btn btn-primary" type="button" disabled={!aktivno || !potpunProdukti} onclick={predajProdukte}>Provjeri</button></div>
  {/if}

  <!-- istraživanje: klizači i količine uživo -->
  {#if istrazi && uzivo}
    <div class="ek-klizaci">
      <label class="ek-kl"><span>I = <b>{formatNumber(Number(jakost), 2)} A</b></span><input type="range" min={rasponI[0]} max={rasponI[1]} step={korakI} bind:value={jakost} aria-label="Jakost struje u amperima" /></label>
      <label class="ek-kl"><span>t = <b>{formatNumber(Number(minute), 0)} min</b> = {formatNumber(Number(minute) * 60, 0)} s</span><input type="range" min={rasponT[0]} max={rasponT[1]} step="1" bind:value={minute} aria-label="Vrijeme u minutama" /></label>
    </div>
    <div class="ek-uzivo" aria-live="polite">
      <div class="ek-kartica"><span class="ek-nw"><i>Q</i> = I · t = <b>{formatSci(uzivo.Q)} C</b></span></div>
      <div class="ek-kartica"><span class="ek-nw"><i>n</i>(e<sup>−</sup>) = Q : F = <b>{formatSci(uzivo.ne)} mol</b></span></div>
      {#each uzivo.tvari as t (t.f + t.celija)}
        <div class="ek-kartica">
          <span class="ek-chip-n">{cel.length > 1 ? `${t.celija + 1}. ` : ""}{t.strana}{t.otapa ? " (otapa se)" : ""}:</span>
          <span class="ek-nw">n(<Formula f={t.f} />) = n(e<sup>−</sup>) : {t.z} = {formatSci(t.n)} mol</span>
          {#if t.plin}<span class="ek-nw">→ V = <b>{jedinicaPrikaz("V", t.V)}</b></span>{:else if t.m != null}<span class="ek-nw">→ m = <b>{jedinicaPrikaz("m", t.m)}</b></span>{/if}
        </div>
      {/each}
      <p class="ek-napomena">Volumen plina: {plinZapis}. Iz tablica: {@render tekst(`F = ${KONSTANTE.F.zapis}`)}.</p>
    </div>
  {/if}

  <!-- Faradayev lanac -->
  {#if nacin === "faraday"}
    <form onsubmit={predajLanac}>
      <div class="ek-lanac">
        {#if spec.struja}<div class="ek-kartica zadano"><span class="ek-sym">I</span><span class="ek-ime">jakost struje</span><b>{spec.struja.zapis ?? formatNumber(spec.struja.I)} A</b></div>{/if}
        {#if spec.vrijeme}<div class="ek-kartica zadano"><span class="ek-sym">t</span><span class="ek-ime">vrijeme</span><b>{zapisVremena(spec.vrijeme)}</b></div>{/if}
        {#if iz}<div class="ek-kartica zadano"><span class="ek-sym">{iz.q}(<Formula f={iz.f} />)</span><span class="ek-ime">{iz.q === "m" ? "masa" : "volumen"} izlučene tvari</span><b>{iz.zapis ?? formatNumber(iz.zadano)} {iz.jedinica}</b></div>{/if}
        {#if spec.plin}<div class="ek-chip-n ek-uvjeti">plin: {uvjetiZapis(spec)}</div>{/if}
        {#each trazeni as t, i (i)}
          <div class="ek-strelica-l" aria-hidden="true">↓ <span class="ek-op">{@render tekst(formulaKoraka(spec, i))}</span></div>
          <div class="ek-kartica" class:ok={okK(i)} class:bad={badK(i)}>
            <div><span class="ek-sym">{#if t.velicina === "ne"}n(e<sup>−</sup>){:else if t.tvar}{t.velicina}(<Formula f={t.tvar} />){:else}{t.velicina}{/if}</span><span class="ek-ime">{IME[t.velicina]}{t.velicina === "ne" ? "" : ""}</span></div>
            <div class="ek-unos">
              <input id="ek-{uid}-{i}" class="inp ek-inp" class:ok={okK(i)} class:bad={badK(i)} inputmode="decimal" autocomplete="off" placeholder="?" aria-label="{oznaka(t.velicina, t.tvar)} u {t.jedinica}" disabled={locked} bind:value={unosi[i]} />
              <span class="lx-unit">{t.jedinica}</span>
              {#if !locked}<button type="button" class="btn btn-quiet ek-pot" onclick={() => potencija(i)} aria-label="Dodaj potenciju broja 10">·10ⁿ</button>{/if}
            </div>
          </div>
        {/each}
      </div>
      <div class="ek-akcija"><button class="btn btn-primary" type="submit" disabled={locked || !potpunLanac}>Provjeri</button></div>
    </form>
    {#if konstante.length}<p class="ek-napomena">Iz tablica: {#each konstante as k, i (k)}{i ? "; " : ""}{@render tekst(k)}{/each}</p>{/if}
  {/if}
{/if}

{#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}

<style>
  .ek-tekst {
    margin-bottom: 8px;
  }
  .ek-hint {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .ek-izbor {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }
  .ek-sel {
    display: grid;
    gap: 3px;
    font-size: 12px;
    color: var(--text-faint);
    min-width: 0;
  }
  .ek-sel select {
    min-height: 40px;
    font-size: 16px;
    padding: 6px 8px;
  }

  /* crtež */
  .ek-crtez {
    max-width: 460px;
    margin: 0 auto;
  }
  .ek-crtez.ek-uzak {
    max-width: 400px;
  }
  .ek-svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
  .ek-st {
    font-family: var(--font-sans);
    fill: var(--text);
    font-size: 13px;
  }
  .ek-mala {
    font-size: 11px;
    fill: var(--text-dim);
  }
  .ek-simbol {
    font-size: 12px;
    font-weight: 700;
    fill: #1f2328;
  }
  .ek-simbol.svijetao {
    fill: #f0f2f4;
  }
  .ek-pol {
    font-size: 17px;
    font-weight: 700;
    fill: var(--primary);
  }
  .ek-v {
    font-size: 14px;
    font-weight: 700;
  }
  .ek-ocitanje {
    font-size: 14px;
    font-weight: 700;
    fill: var(--primary);
  }
  .ek-e-oznaka {
    font-size: 12px;
    fill: var(--primary);
    font-weight: 600;
  }
  .ek-znak {
    font-size: 10px;
    font-weight: 700;
    fill: #fff;
  }
  .ek-zica {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .ek-izvor {
    stroke: var(--text);
    stroke-width: 2;
  }
  .ek-izvor.debeo {
    stroke-width: 5;
  }
  .ek-metar {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .ek-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.8;
  }
  .ek-staklo-poz {
    fill: color-mix(in srgb, var(--bg-elev) 70%, transparent);
  }
  .ek-voda {
    fill: color-mix(in srgb, var(--lx-water) 16%, transparent);
  }
  .ek-talina {
    fill: color-mix(in srgb, #f2a330 18%, transparent);
  }
  .ek-povrsina {
    stroke: var(--text-faint);
    stroke-width: 0.8;
    opacity: 0.7;
  }
  .ek-elektroda {
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .ek-prevlaka {
    stroke: var(--border-strong);
    stroke-width: 0.8;
  }
  .ek-most-rub {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 17;
    stroke-linejoin: round;
  }
  .ek-most {
    fill: none;
    stroke: color-mix(in srgb, var(--bg-elev-2) 80%, var(--lx-water));
    stroke-width: 13;
    stroke-linejoin: round;
  }
  .ek-kation {
    fill: #d7263d;
  }
  .ek-anion {
    fill: #2f6fd0;
  }
  .ek-e {
    fill: var(--primary);
  }
  .ek-strelica {
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .ek-vrh {
    fill: var(--primary);
  }
  .ek-mjehur {
    stroke: var(--text);
    stroke-width: 1;
    fill-opacity: 0.85;
    transform: translateY(calc(-1 * var(--sy, 0px)));
  }
  .ek-mjehur[fill="none"] {
    fill: color-mix(in srgb, var(--bg) 40%, transparent);
  }
  .ek-mjehur.anim {
    transform: none;
    animation: ek-dizi var(--t, 1.5s) ease-in var(--d, 0s) infinite backwards;
  }
  .ek-ion {
    opacity: 0;
    animation: ek-pomak 1.8s ease-in-out var(--d, 0s) infinite;
  }
  .ek-ion.ulazi {
    animation-name: ek-pomak-k;
  }
  .ek-oblak {
    opacity: 0.45;
  }
  .ek-oblak.anim {
    animation: ek-pojava 2s ease-out both;
  }
  .ek-pojava {
    opacity: var(--o, 1);
    animation: ek-pojava 2s ease-out both;
  }
  .ek-toplina {
    fill: none;
    stroke: #ef8526;
    stroke-width: 1.4;
    stroke-linecap: round;
    opacity: 0.8;
  }
  @keyframes ek-dizi {
    0% {
      opacity: 0;
      transform: translateY(0);
    }
    15% {
      opacity: 0.9;
    }
    100% {
      opacity: 0;
      transform: translateY(calc(-1 * var(--dy)));
    }
  }
  @keyframes ek-pomak {
    0% {
      opacity: 0.9;
      transform: translateX(0);
    }
    100% {
      opacity: 0;
      transform: translateX(var(--dx));
    }
  }
  @keyframes ek-pomak-k {
    0% {
      opacity: 0;
      transform: translateX(0);
    }
    20% {
      opacity: 0.9;
    }
    100% {
      opacity: 0.2;
      transform: translateX(calc(-1 * var(--dx)));
    }
  }
  @keyframes ek-pojava {
    from {
      opacity: 0;
    }
    to {
      opacity: var(--o, 1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ek-mjehur.anim,
    .ek-ion,
    .ek-pojava,
    .ek-oblak.anim {
      animation: none !important;
    }
    .ek-mjehur.anim {
      transform: translateY(calc(-1 * var(--sy, 0px)));
    }
  }

  /* opis čaša i članaka */
  .ek-case {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    max-width: 460px;
    margin: 6px auto 0;
  }
  .ek-casa-opis {
    display: grid;
    gap: 5px;
    align-content: start;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
    font-size: 13px;
  }
  .ek-casa-opis.anoda,
  .ek-casa-opis.katoda {
    border-color: var(--primary);
  }
  .ek-casa-naslov {
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.35;
  }
  .ek-e0 {
    color: var(--text-dim);
    font-size: 12.5px;
  }
  .ek-uloga {
    font-weight: 600;
    color: var(--primary);
    font-size: 13px;
  }
  .ek-seg {
    display: flex;
    gap: 4px;
    border-radius: var(--r-md);
  }
  .ek-seg.bad,
  .ek-red.bad,
  .ek-chips.bad {
    outline: 2px solid var(--lx-bad);
    outline-offset: 2px;
  }
  .ek-gumb {
    flex: 1 1 0;
    min-height: 38px;
    min-width: 38px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    cursor: pointer;
    touch-action: manipulation;
    white-space: nowrap;
  }
  .ek-gumb-pol {
    font-size: 18px;
    font-weight: 700;
  }
  .ek-gumb:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .ek-gumb.on {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .ek-gumb:disabled {
    cursor: default;
  }
  .ek-red {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    max-width: 460px;
    margin: 10px auto 0;
    border-radius: var(--r-md);
  }
  .ek-red .ek-gumb {
    flex: 0 1 auto;
  }
  .ek-red-nasl {
    width: 100%;
    font-size: 13px;
    color: var(--text-dim);
  }
  .ek-akcija {
    margin-top: 12px;
  }
  .ek-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .ek-napon {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .ek-napon-oznaka {
    font-family: var(--font-sans);
    font-size: 16px;
    white-space: nowrap;
  }

  /* jednadžbe: „+“ i strelica ostaju uz pojam iza sebe */
  .ek-info {
    display: grid;
    gap: 6px;
    margin-top: 12px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 14px;
  }
  .ek-info-nasl {
    color: var(--text-faint);
    font-size: 12.5px;
    margin-right: 4px;
  }
  .ek-eq {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 6px;
    font-family: var(--font-sans);
    font-size: 15px;
    color: var(--text);
  }
  .ek-nw {
    white-space: nowrap;
  }
  .ek-par {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    white-space: nowrap;
  }
  .ek-plus,
  .ek-str,
  .ek-crta {
    color: var(--text-faint);
  }
  .ek-str {
    padding: 0 2px;
  }
  .ek-stanje {
    font-size: 0.78em;
    color: var(--text-dim);
  }
  .ek-shema {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px 6px;
    font-family: var(--font-sans);
    font-size: 15px;
  }
  .ek-napomena {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--text-dim);
  }
  .ek-ist {
    font-size: 13.5px;
    line-height: 1.45;
  }
  .ek-niz summary {
    cursor: pointer;
    font-size: 13px;
    color: var(--text-dim);
    min-height: 36px;
    display: flex;
    align-items: center;
  }
  .ek-niz ol {
    list-style: none;
    margin: 4px 0 6px;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .ek-niz li {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 2px 6px;
    border-radius: var(--r-md);
    font-size: 13.5px;
  }
  .ek-niz li.anoda,
  .ek-niz li.katoda {
    background: var(--primary-dim);
  }
  .ek-niz-e {
    margin-left: auto;
    color: var(--text-dim);
  }
  .ek-niz-oz {
    font-size: 12px;
    color: var(--primary);
    font-weight: 600;
    min-width: 48px;
  }

  /* istiskivanje */
  .ek-dodaje {
    margin: 4px 0 10px;
    font-size: 14px;
    color: var(--text-dim);
    text-align: center;
  }
  .ek-opcije {
    margin-top: 4px;
  }
  .ek-jkoef {
    margin-top: 10px;
  }
  .ek-eq-unos {
    gap: 8px;
    margin-top: 6px;
    align-items: center;
  }
  .ek-eq-unos .ek-par {
    align-items: center;
  }
  .ek-kinp {
    width: 42px;
    height: 38px;
    padding: 4px;
    text-align: center;
    font-size: 16px;
  }

  /* elektroliza */
  .ek-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
    border-radius: var(--r-md);
  }
  .ek-chips-mali {
    display: inline-flex;
    margin: 4px 0 0;
  }
  .ek-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    min-height: 36px;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.2;
    cursor: pointer;
    touch-action: manipulation;
  }
  .ek-chip:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .ek-chip.on {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .ek-chip-n {
    color: var(--text-dim);
    font-size: 0.88em;
  }
  .ek-celije {
    display: grid;
    gap: 8px;
    max-width: 460px;
    margin: 6px auto 0;
  }
  .ek-celija {
    display: grid;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .ek-strana {
    font-size: 14px;
    line-height: 1.5;
  }
  .ek-upit {
    font-weight: 700;
    color: var(--text-faint);
  }
  .ek-klizaci {
    display: grid;
    gap: 6px;
    max-width: 460px;
    margin: 10px auto 0;
  }
  .ek-kl {
    display: grid;
    gap: 2px;
    font-size: 14px;
  }
  .ek-kl input {
    width: 100%;
    height: 36px;
    margin: 0;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .ek-uzivo {
    display: grid;
    gap: 6px;
    max-width: 460px;
    margin: 8px auto 0;
  }
  .ek-kartica {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-family: var(--font-sans);
    font-size: 14px;
    min-width: 0;
  }
  .ek-kartica b {
    color: var(--primary);
  }
  .ek-kartica.zadano {
    background: var(--bg-elev-2);
  }
  .ek-kartica.zadano b {
    color: var(--text);
  }
  .ek-kartica.ok {
    border-color: var(--lx-ok);
  }
  .ek-kartica.bad {
    border-color: var(--lx-bad);
  }
  .ek-sym {
    font-weight: 700;
    font-style: italic;
    margin-right: 6px;
  }
  .ek-ime {
    font-size: 12px;
    color: var(--text-faint);
    margin-right: auto;
  }
  .ek-lanac {
    display: grid;
    gap: 4px;
    max-width: 380px;
    margin-top: 10px;
  }
  .ek-lanac .ek-kartica:not(.zadano) {
    display: grid;
    gap: 6px;
  }
  .ek-uvjeti {
    padding: 0 4px;
  }
  .ek-strelica-l {
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
    font-size: 16px;
  }
  .ek-op {
    font-size: 13px;
    color: var(--primary);
    font-weight: 600;
    white-space: nowrap;
  }
  .ek-unos {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ek-inp {
    width: 100%;
    max-width: 150px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .ek-pot {
    min-width: 44px;
    min-height: 36px;
  }
</style>
