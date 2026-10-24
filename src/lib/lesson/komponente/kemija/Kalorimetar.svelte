<script>
  // kalorimetar: SVG čaša od stiropora s poklopcem, termometrom kroz poklopac i epruvetom s uzorkom, ispod termogram
  // ϑ–t (točka svakih pola minute, kao u pokusu 16). Sav račun (termogram, C, Q, n, Δ_solH, obrnuti račun, poruke) je u
  // katalog/kemija/kalorimetar.js; ovdje je samo prikaz.
  // Istraživanje: izbor soli, klizači za množinu uzorka i masu vode, pokus teče (mjerenje 3 min, „Ubaci uzorak“, pa do
  // kraja), a termometar i termogram mijenjaju se uživo; uz prefers-reduced-motion svaki korak skoči na kraj.
  // „Tvoj red“ ne odaje odgovor: kod očitavanja na termogramu nema napisanih temperatura (samo mreža), voda nema boju
  // po temperaturi, gumb ± je uz svaku veličinu s predznakom, a formule na strelicama lanca vide se samo uz
  // `operacije: true` ili nakon provjere.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import { molarnaMasa } from "$lib/lesson/katalog/kemija/_tablice.js";
  import { formulaZapis } from "$lib/lesson/katalog/kemija/mol_racun.js";
  import {
    kalorimetar,
    modelOf,
    mjerenja,
    temperaturaU,
    osT,
    lanacOf,
    poznatoOf,
    ocitajOf,
    procesOf,
    zapisT,
    zapisKoraka,
    sPredznakom,
    formulaKoraka,
    literaturaZa,
    KORACI,
    LITERATURA,
    ISTRAZI_ZADANO,
    C_VODE_ZAPIS,
    OCITAJ_JED,
  } from "$lib/lesson/katalog/kemija/kalorimetar.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const istrazi = nacin === "istrazi";
  const ocitaj = nacin === "ocitaj";
  const racun = nacin === "izracunaj";
  const uid = Math.random().toString(36).slice(2, 8);
  const aktivno = $derived(!locked && !pokazi);
  const rijeseno = $derived(!!ishod?.tocno || pokazi);

  // ── istraživanje: soli, klizači ──
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const ascii = (f) => [...String(f ?? "")].map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : c)).join("");
  const soli = istrazi
    ? (s.tvari ?? (s.tvar ? [s.tvar] : ISTRAZI_ZADANO)).map((x) => {
        const f = typeof x === "string" ? x : x.tvar;
        const lit = literaturaZa(f);
        const vlastita = typeof x === "object" && x.dsolH != null ? (typeof x.dsolH === "number" ? x.dsolH : x.dsolH.vrijednost) : null;
        return { tvar: formulaZapis(f), naziv: (typeof x === "object" && x.naziv) || lit?.naziv || "", dsolH: vlastita ?? null, lit: vlastita == null };
      })
    : [];
  const pocetna = istrazi ? Math.max(0, soli.findIndex((x) => s.tvar && ascii(x.tvar) === ascii(s.tvar))) : 0;
  let odabrana = $state(pocetna);
  const sol = $derived(soli[odabrana]);
  const nPocetno = untrack(() => {
    if (s.uzorak?.n) return s.uzorak.n;
    const M0 = soli[pocetna] ? molarnaMasa(soli[pocetna].tvar) : null;
    return s.uzorak?.m && M0 ? Math.round((s.uzorak.m / M0) * 1000) / 1000 : 0.02;
  });
  let nKl = $state(nPocetno);
  let mKl = $state(untrack(() => s.voda?.m ?? 50));
  // vlastita vrijednost iz speca (T_konacna / dsolH) vrijedi za početnu tvar
  const dsolHSoli = $derived.by(() => {
    if (!istrazi || !sol) return null;
    if (sol.dsolH != null) return sol.dsolH;
    if (s.tvar && ascii(sol.tvar) === ascii(formulaZapis(s.tvar)) && (s.dsolH != null || s.T_konacna != null)) return modelOf({ ...s, nacin: "izracunaj", trazi: ["dH"] }).dsolH;
    return LITERATURA[ascii(sol.tvar)]?.dsolH ?? null;
  });

  const m = $derived(istrazi ? modelOf(s, { tvar: sol.tvar, dsolH: dsolHSoli, n: Number(nKl), mV: Number(mKl) }) : modelOf(s));

  // ── tok pokusa (istraživanje) ──
  let t = $state(istrazi ? 0 : untrack(() => m.tk));
  let faza = $state(istrazi ? "spremno" : "kraj"); // spremno | mjeri | ceka | otapa | kraj
  let ubaceno = $state(!istrazi);
  let kapi = $state(0);
  const smanjeno = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let raf = 0;
  function vrti(doT, poslije) {
    cancelAnimationFrame(raf);
    if (smanjeno) {
      t = doT;
      poslije();
      return;
    }
    let zadnje = performance.now();
    const korak = (sad) => {
      const dt = (sad - zadnje) / 1000;
      zadnje = sad;
      t = Math.min(doT, t + dt / 0.5); // pola sekunde po minuti
      if (t >= doT) poslije();
      else raf = requestAnimationFrame(korak);
    };
    raf = requestAnimationFrame(korak);
  }
  function pokreni() {
    faza = "mjeri";
    vrti(m.td, () => (faza = "ceka"));
  }
  function ubaci() {
    ubaceno = true;
    kapi++;
    faza = "otapa";
    vrti(m.tk, () => (faza = "kraj"));
  }
  function ispocetka() {
    cancelAnimationFrame(raf);
    t = 0;
    faza = "spremno";
    ubaceno = false;
  }
  $effect(() => () => cancelAnimationFrame(raf));
  function promijeni(fn) {
    fn();
    ispocetka();
  }
  const otopljeno = $derived(istrazi ? ubaceno && t >= m.td + 1 - 1e-9 : true);

  // ── temperatura sad ──
  // obrnuti račun: konačna temperatura je odgovor, pa termometar do provjere pokazuje početnu, a ljestvica je oko nje
  const natrag = racun && untrack(() => m.natrag);
  const skriveno = $derived(natrag && !rijeseno);
  const Tsad = $derived(skriveno ? m.T0 : temperaturaU(m, t));
  const tocke = $derived(mjerenja(m, istrazi ? t : m.tk));
  const os = $derived(skriveno ? osT(m.T0 - 4, m.T0 + 4) : osT(m.T0, m.T1));

  // ── crtež: čaša, termometar, epruveta (viewBox 0 0 170 240) ──
  const TY0 = 22; // vrh ljestvice termometra
  const TY1 = 100; // dno ljestvice (iznad poklopca)
  const ty = (T) => TY1 - ((Math.max(os.lo, Math.min(os.hi, T)) - os.lo) / (os.hi - os.lo)) * (TY1 - TY0);
  const crticeT = $derived.by(() => {
    const out = [];
    const k = os.sporedni;
    for (let x = os.lo; x <= os.hi + 1e-9; x += k) {
      const v = Math.round(x * 100) / 100;
      out.push({ v, glavna: Math.abs(v / os.glavni - Math.round(v / os.glavni)) < 1e-6 });
    }
    return out;
  });
  // razina vode: 50 g ≈ trećina čaše, 200 g gotovo puna
  const yVode = $derived(226 - Math.min(92, 18 + (m.mV / 200) * 74));
  const pjena = Array.from({ length: 34 }, (_, i) => ({ x: 22 + ((i * 37) % 102), y: 132 + ((i * 53) % 92), r: 1.2 + ((i * 7) % 3) * 0.35 }));
  const kristali = Array.from({ length: 9 }, (_, i) => ({ x: 70 + ((i * 23) % 40) - 10, d: (i % 3) * 0.06 }));
  const uzorakVidi = $derived(istrazi && !ubaceno);

  // ── termogram (viewBox 0 0 320 196) ──
  const GW = 320;
  const GH = 196;
  const GL = 34;
  const GR = 12;
  const GT = 12;
  const GB = 26;
  const gx = (x) => GL + (x / m.tk) * (GW - GL - GR);
  const gy = (T) => GT + ((os.hi - T) / (os.hi - os.lo)) * (GH - GT - GB);
  const minute = $derived(Array.from({ length: Math.floor(m.tk) + 1 }, (_, i) => i));
  const crta = (pts) => pts.map(([x, T]) => `${gx(x).toFixed(1)},${gy(T).toFixed(1)}`).join(" ");
  const krivulja = $derived(istrazi ? [...tocke, ...(t > (tocke.at(-1)?.[0] ?? 0) ? [[t, Tsad]] : [])] : tocke);
  // napisane temperature na termogramu: istraživanje (nakon otapanja), račun naprijed (zadano), očitavanje tek nakon provjere
  const oznake = $derived(istrazi ? otopljeno : racun ? !natrag && s.termogram !== false : rijeseno);
  const termogramVidi = $derived(istrazi || ocitaj || (racun && (natrag ? rijeseno : s.termogram !== false)));

  // ── očitavanje ──
  const trO = ocitaj ? ocitajOf(s) : [];
  let unosiO = $state(trO.map(() => ""));
  let proces = $state(null);
  const OZ = { T_pocetna: "ϑ₁", T_konacna: "ϑ₂", dT: "ΔT" };
  const OPIS_O = { T_pocetna: "prije dodatka uzorka", T_konacna: "nakon otapanja", dT: "promjena temperature" };
  $effect(() => {
    if (!ocitaj || !pokazi) return;
    untrack(() => {
      unosiO = trO.map((id) => (id === "T_pocetna" ? zapisT(m.T0) : id === "T_konacna" ? zapisT(m.T1) : zapisKoraka("dT", Math.round((m.T1 - m.T0) * 10) / 10)));
      if (s.proces) proces = procesOf(m);
    });
  });
  const potpunO = $derived(unosiO.every((v) => String(v).trim()) && (!s.proces || proces));
  function predajO(e) {
    e.preventDefault();
    if (aktivno && potpunO) onodgovor({ unosi: $state.snapshot(unosiO), ...(s.proces ? { proces } : {}) });
  }

  // ── račun ──
  const koraci = racun ? untrack(() => lanacOf(s, m)) : [];
  const poznato = racun ? untrack(() => poznatoOf(s, m)) : {};
  let unosi = $state(koraci.map(() => ""));
  $effect(() => {
    if (!racun || !pokazi) return;
    untrack(() => {
      unosi = koraci.map((k) => zapisKoraka(k.id, k.vrijednost));
    });
  });
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  function predaj(e) {
    e.preventDefault();
    if (aktivno && potpun) onodgovor($state.snapshot(unosi));
  }
  const operacije = $derived(s.operacije === true || rijeseno);

  const okK = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina != null && ishod.praznina > i);
  const badK = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  // ± ispred broja (tipkovnica za brojeve na mobitelu nema minus)
  const predznak = (v) => {
    const x = String(v ?? "").trim();
    return /^[−-]/.test(x) ? x.replace(/^[−-]\s*/, "") : `−${x.replace(/^\+\s*/, "")}`;
  };

  // formula koraka (tekst iz kataloga) → HTML: Δ_solH, indeksi i potencije
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SUP = { "⁻": "−", "¹": "1", "²": "2", "³": "3" };
  const html = (x) =>
    esc(x)
      .replace(/ΔsolH/g, "Δ<sub>sol</sub>H")
      .replace(/[₀-₉]+/g, (d) => `<sub>${[...d].map((c) => SUB.indexOf(c)).join("")}</sub>`)
      .replace(/[⁻¹²³]+/g, (d) => `<sup>${[...d].map((c) => SUP[c]).join("")}</sup>`);

  const F = $derived(formulaZapis(m.tvar ?? ""));
  const zapisN = (n) => formatNumber(Number(n.toPrecision(3)));
  const uz = s.uzorak ?? {};
  const tocno = $derived(pokazi ? kalorimetar.tocanOdgovor(s) : "");

  // vrijednosti u istraživanju
  const r = $derived.by(() => {
    if (!istrazi || !otopljeno) return null;
    return { dT: m.T1 - m.T0, C: m.C, Q: m.Q, dH: m.dHexp };
  });
</script>

{#snippet dsol()}Δ<sub>sol</sub>H{/snippet}
{#snippet jed(u)}<span class="kl-j"><Formula f={u} /></span>{/snippet}
{#snippet oznakaK(id)}{#if id === "dH"}{@render dsol()}{:else if id === "dH_kr"}ΔH(kristalizacije){:else if id === "pogreska"}P<sub>r</sub>{:else if id === "dT"}ΔT{:else if id === "T_konacna"}<Formula f="ϑ₂" />{:else if id === "n"}n(<Formula f={F} />){:else}{id}{/if}{/snippet}

{#snippet aparat()}
  <svg class="kl-svg" viewBox="0 0 170 240" role="img" aria-label="Kalorimetar od stiropora s {formatNumber(m.mV)} g vode i termometrom{istrazi ? `; ϑ = ${zapisT(Math.round(Tsad * 10) / 10)} °C` : ''}">
    <defs>
      <clipPath id="kl-{uid}-c"><path d="M23 122 L35 226 H107 L119 122 Z" /></clipPath>
    </defs>
    <!-- čaša od stiropora -->
    <path class="kl-stiropor" d="M16 118 L30 230 H112 L126 118 Z" />
    {#each pjena as p, i (i)}<circle class="kl-zrno" cx={p.x} cy={p.y} r={p.r} />{/each}
    <path class="kl-unutra" d="M23 122 L35 226 H107 L119 122 Z" />
    <g clip-path="url(#kl-{uid}-c)">
      <rect class="kl-voda" x="20" y={yVode} width="102" height={240 - yVode} />
      <line class="kl-povrsina" x1="20" y1={yVode} x2="122" y2={yVode} />
      {#if ubaceno && istrazi && !otopljeno}
        {#key kapi}
          {#each kristali as k, i (i)}<rect class="kl-kristal pad" x={k.x} y={yVode - 4} width="3.2" height="3.2" style="animation-delay: {k.d}s; --pad: {Math.max(8, 224 - yVode - 6)}px" />{/each}
        {/key}
      {/if}
    </g>
    <!-- poklopac s rupicom za termometar -->
    <rect class="kl-poklopac" x="10" y="110" width="122" height="9" rx="2" />
    <!-- termometar -->
    <rect class="kl-staklo-in" x="76.5" y="8" width="7" height="206" rx="3.5" />
    <rect class="kl-stupac" x="78.6" y={ty(Tsad)} width="2.8" height={212 - ty(Tsad)} />
    <circle class="kl-bulb" cx="80" cy="214" r="6" />
    <rect class="kl-staklo" x="76.5" y="8" width="7" height="206" rx="3.5" />
    {#each crticeT as c (c.v)}
      <line class="kl-crtica" x1="84" y1={ty(c.v)} x2={c.glavna ? 91 : 88} y2={ty(c.v)} />
      {#if c.glavna}<text class="kl-broj" x="93" y={ty(c.v) + 3}>{formatNumber(c.v)}</text>{/if}
    {/each}
    <text class="kl-broj" x="93" y="10">°C</text>
    <!-- epruveta s uzorkom (istraživanje, prije dodatka) -->
    {#if istrazi}
      <g class="kl-epruveta" class:prazna={!uzorakVidi}>
        <rect class="kl-cep" x="139" y="34" width="14" height="8" rx="2" />
        <path class="kl-staklo" d="M140 42 V96 a6 6 0 0 0 12 0 V42" />
        {#if uzorakVidi}<path class="kl-uzorak" d="M141 78 H151 V96 a5 5 0 0 1 -10 0 Z" />{/if}
      </g>
    {/if}
  </svg>
{/snippet}

{#snippet termogram()}
  <figure class="kl-graf">
    <svg viewBox="0 0 {GW} {GH}" role="img" aria-label="Termogram: temperatura u kalorimetru ovisno o vremenu{oznake ? `, od ${zapisT(m.T0)} °C do ${zapisT(m.T1)} °C` : ''}">
      {#each crticeT as c (c.v)}
        <line class="kl-mreza" class:glavna={c.glavna} x1={GL} y1={gy(c.v)} x2={GW - GR} y2={gy(c.v)} />
        {#if c.glavna}<text class="kl-tick" x={GL - 5} y={gy(c.v) + 3.5} text-anchor="end">{formatNumber(c.v)}</text>{/if}
      {/each}
      {#each Array.from({ length: Math.round(m.tk * 2) + 1 }, (_, i) => i / 2) as x (x)}
        <line class="kl-mreza" class:glavna={Number.isInteger(x)} x1={gx(x)} y1={GT} x2={gx(x)} y2={GH - GB} />
      {/each}
      {#each minute as x (x)}
        <text class="kl-tick" x={gx(x)} y={GH - GB + 14} text-anchor="middle">{x}</text>
      {/each}
      <line class="kl-os" x1={GL} y1={GT - 4} x2={GL} y2={GH - GB} />
      <line class="kl-os" x1={GL} y1={GH - GB} x2={GW - GR} y2={GH - GB} />
      <text class="kl-osT" x={GL + 4} y={GT + 6}>ϑ / °C</text>
      <text class="kl-osT" x={GW - GR} y={GH - 2} text-anchor="end">t / min</text>
      <!-- dodatak uzorka -->
      {#if !istrazi || ubaceno}
        <line class="kl-dodatak" x1={gx(m.td)} y1={GT} x2={gx(m.td)} y2={GH - GB} />
        <text class="kl-lbl" x={gx(m.td) + 3} y={GH - GB - 5}>dodatak</text>
      {/if}
      {#if oznake}
        {@const gore = m.T1 > m.T0}
        <line class="kl-ref" x1={GL} y1={gy(m.T0)} x2={gx(m.td)} y2={gy(m.T0)} />
        <line class="kl-ref" x1={GL} y1={gy(m.T1)} x2={GW - GR} y2={gy(m.T1)} />
        <text class="kl-lbl jak" x={GL + 4} y={gy(m.T0) + (gore ? 13 : -5)}>ϑ₁ = {zapisT(m.T0)} °C</text>
        <text class="kl-lbl jak" x={GW - GR - 4} y={gy(m.T1) + (gore ? -5 : 13)} text-anchor="end">ϑ₂ = {zapisT(Math.round(m.T1 * 10) / 10)} °C</text>
      {/if}
      <polyline class="kl-krivulja" points={crta(krivulja)} />
      {#each tocke as [x, T] (x)}<circle class="kl-tocka" cx={gx(x)} cy={gy(T)} r="2.4" />{/each}
      {#if istrazi && faza !== "spremno"}<circle class="kl-sad" cx={gx(t)} cy={gy(Tsad)} r="4" />{/if}
    </svg>
  </figure>
{/snippet}

{#snippet podaci()}
  <ul class="kl-podaci">
    <li><span class="kl-pz">m(<Formula f="H₂O" />) =</span> {@render jed(`${s.voda?.zapis ?? formatNumber(m.mV)} g`)}</li>
    {#if uz.n != null}
      <li><span class="kl-pz">n(<Formula f={F} />) =</span> {@render jed(`${uz.zapis ?? zapisN(uz.n)} mol`)}</li>
    {:else if uz.m != null}
      <li><span class="kl-pz">m(<Formula f={F} />) =</span> {@render jed(`${uz.zapis ?? formatNumber(uz.m)} g`)}</li>
    {/if}
    {#if racun}<li><span class="kl-pz">c(<Formula f="H₂O" />) =</span> {@render jed(typeof s.c === "number" ? `${formatNumber(s.c)} J K⁻¹ g⁻¹` : C_VODE_ZAPIS)}</li>{/if}
    {#if natrag}
      <li><span class="kl-pz">{@render dsol()} =</span> {@render jed(`${typeof s.dsolH === "object" && s.dsolH?.zapis ? s.dsolH.zapis.replace(/-/g, "−") : sPredznakom(m.dsolH, formatNumber(m.dsolH))} kJ mol⁻¹`)}</li>
      <li><span class="kl-pz"><Formula f="ϑ₁" /> =</span> {@render jed(`${zapisT(m.T0)} °C`)}</li>
    {/if}
    {#each s.poznato ?? [] as p (p)}
      <li><span class="kl-pz">{@render oznakaK(p)} =</span> {@render jed(zapisKoraka(p, poznato[p] / (KORACI[p].jedinice[Object.keys(KORACI[p].jedinice)[0]] ?? 1), Object.keys(KORACI[p].jedinice)[0]))}</li>
    {/each}
  </ul>
{/snippet}

{#if istrazi}
  <div class="kl-tekst"><Md text={s.tekst} /></div>
  <p class="kl-hint">Ovo nije zadatak: odaberi sol, pokreni pokus i gledaj termometar.</p>
{:else}
  <div class="lx-question"><Md text={s.tekst} /></div>
{/if}

<div class="kl">
  {#if istrazi}
    {#if soli.length > 1}
      <div class="kl-chips" role="radiogroup" aria-label="Sol">
        {#each soli as x, i (x.tvar)}
          <button type="button" role="radio" aria-checked={odabrana === i} class="kl-chip" class:sel={odabrana === i} onclick={() => promijeni(() => (odabrana = i))}><Formula f={x.tvar} /></button>
        {/each}
      </div>
    {/if}
    <div class="kl-klizaci">
      <label class="kl-kl">
        <span class="kl-kl-t">n(<Formula f={sol.tvar} />) = {@render jed(`${Number(nKl).toFixed(3).replace(".", ",")} mol`)} <span class="kl-sitno">({@render jed(`${formatNumber(Number((Number(nKl) * (m.M ?? 0)).toFixed(2)))} g`)})</span></span>
        <input type="range" min="0.005" max="0.05" step="0.005" value={nKl} oninput={(e) => promijeni(() => (nKl = Number(e.currentTarget.value)))} aria-label="Množina uzorka u mol" />
      </label>
      <label class="kl-kl">
        <span class="kl-kl-t">m(<Formula f="H₂O" />) = {@render jed(`${formatNumber(Number(mKl))} g`)}</span>
        <input type="range" min="25" max="150" step="5" value={mKl} oninput={(e) => promijeni(() => (mKl = Number(e.currentTarget.value)))} aria-label="Masa vode u g" />
      </label>
    </div>
  {/if}

  <div class="kl-stol">
    <div class="kl-aparat">{@render aparat()}</div>
    <div class="kl-desno">
      {#if istrazi}
        <div class="kl-ocit">
          <span class="kl-ocit-n">termometar</span>
          <b aria-live="polite">{@render jed(`${zapisT(Math.round(Tsad * 10) / 10)} °C`)}</b>
          <span class="kl-ocit-n">zaporni sat: {@render jed(`${formatNumber(Math.floor(t * 2) / 2)} min`)}</span>
        </div>
        <div class="kl-gumbi">
          {#if faza === "spremno"}<button type="button" class="btn btn-primary kl-g" onclick={pokreni}>Pokreni mjerenje</button>{/if}
          {#if faza === "ceka"}<button type="button" class="btn btn-primary kl-g" onclick={ubaci}>Ubaci uzorak</button>{/if}
          {#if faza === "mjeri" || faza === "otapa"}<span class="kl-stanje">{faza === "mjeri" ? "Mjeri se temperatura vode…" : "Uzorak se otapa, miješa se termometrom…"}</span>{/if}
          {#if faza !== "spremno"}<button type="button" class="btn btn-quiet kl-ispocetka" onclick={ispocetka}>Ispočetka</button>{/if}
        </div>
        {#if faza === "ceka"}<p class="kl-stanje">Tri minute temperatura je ista: voda i okolina imaju istu temperaturu.</p>{/if}
      {:else}
        {@render podaci()}
      {/if}
    </div>
  </div>

  {#if termogramVidi}{@render termogram()}{/if}

  {#if istrazi && r}
    <div class="kl-racun" aria-live="polite">
      <p>ΔT = <Formula f="ϑ₂" /> − <Formula f="ϑ₁" /> = {@render jed(`${sPredznakom(r.dT, formatNumber(Number(r.dT.toFixed(2))))} K`)}</p>
      <p>C = m(<Formula f="H₂O" />) · c(<Formula f="H₂O" />) = {@render jed(`${formatNumber(m.mV)} g`)} · {@render jed(C_VODE_ZAPIS)} = {@render jed(zapisKoraka("C", r.C, "J/K"))}</p>
      <p>Q = C · ΔT = {@render jed(zapisKoraka("Q", r.Q, "J"))}</p>
      <p>{@render dsol()} = −Q : n = {@render jed(zapisKoraka("dH", r.dH, "kJ/mol"))}</p>
      <p class="kl-zakljucak">
        {#if r.dT < 0}Voda se ohladila: otapanje je uzelo toplinu iz vode, pa je <b>endotermno</b> ({@render dsol()} &gt; 0).{:else}Voda se zagrijala: otapanje je predalo toplinu vodi, pa je <b>egzotermno</b> ({@render dsol()} &lt; 0).{/if}
      </p>
      {#if sol.lit && LITERATURA[ascii(sol.tvar)] && dsolHSoli === LITERATURA[ascii(sol.tvar)].dsolH}
        <p class="kl-sitno">{@render dsol()} za <Formula f={sol.tvar} /> je literaturna vrijednost (pri <span class="kl-j">25 °C</span>, CRC Handbook); u školskom pokusu izmjeri se nešto drugačija.</p>
      {/if}
    </div>
  {/if}

  {#if ocitaj}
    <form class="kl-unosi" onsubmit={predajO}>
      {#each trO as id, i (id)}
        <div class="kl-korak" class:ok={okK(i)} class:bad={badK(i)}>
          <label class="kl-korak-oz" for="kl-{uid}-o{i}"><span class="kl-sym"><Formula f={OZ[id]} /></span> <span class="kl-ime">{OPIS_O[id]}</span></label>
          <span class="kl-polje">
            <input id="kl-{uid}-o{i}" class="inp kl-inp" class:ok={okK(i)} class:bad={badK(i)} inputmode="decimal" autocomplete="off" placeholder="?" disabled={!aktivno} bind:value={unosiO[i]} />
            <span class="lx-unit">{OCITAJ_JED[id]}</span>
            {#if id === "dT" && aktivno}<button type="button" class="btn btn-quiet kl-pm" onclick={() => (unosiO[i] = predznak(unosiO[i]))} aria-label="Promijeni predznak">±</button>{/if}
          </span>
        </div>
      {/each}
      {#if s.proces}
        <div class="kl-proces" class:bad={badK(trO.length)}>
          <span class="kl-ime">Otapanje je</span>
          <div class="kl-seg" role="radiogroup" aria-label="Je li otapanje endotermno ili egzotermno">
            {#each ["endotermno", "egzotermno"] as p (p)}
              <button type="button" role="radio" aria-checked={proces === p} class:sel={proces === p} disabled={!aktivno} onclick={() => (proces = p)}>{p}</button>
            {/each}
          </div>
        </div>
      {/if}
      <div class="kl-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpunO}>Provjeri</button></div>
    </form>
  {/if}

  {#if racun}
    <form class="kl-lanac" onsubmit={predaj}>
      {#each koraci as k, i (k.id)}
        {#if i > 0 || s.poznato?.length}
          <div class="kl-strelica" aria-label={operacije ? formulaKoraka(k.id, m.natrag) : "sljedeći korak"}>
            <span aria-hidden="true">↓</span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- formula iz kataloga, escapeana u html() -->
            {#if operacije}<span class="kl-op">{@html html(formulaKoraka(k.id, m.natrag))}</span>{/if}
          </div>
        {/if}
        <div class="kl-kartica" class:ok={okK(i)} class:bad={badK(i)}>
          <label class="kl-glava" for="kl-{uid}-{i}"><span class="kl-sym">{@render oznakaK(k.id)}</span><span class="kl-ime">{k.ime}</span></label>
          <span class="kl-polje">
            <input id="kl-{uid}-{i}" class="inp kl-inp" class:ok={okK(i)} class:bad={badK(i)} inputmode="decimal" autocomplete="off" placeholder="?" disabled={!aktivno} bind:value={unosi[i]} />
            <span class="lx-unit"><Formula f={KORACI[k.id].prikaz[k.jedinica]} /></span>
            {#if KORACI[k.id].predznak && aktivno}<button type="button" class="btn btn-quiet kl-pm" onclick={() => (unosi[i] = predznak(unosi[i]))} aria-label="Promijeni predznak">±</button>{/if}
          </span>
        </div>
      {/each}
      <div class="kl-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
    </form>
  {/if}
</div>

{#if tocno}
  <p class="kl-tocno">Točan odgovor: <Md text={tocno} inline /></p>
{/if}

<style>
  .kl {
    display: grid;
    gap: 12px;
  }
  .kl-tekst :global(p) {
    margin: 0 0 6px;
  }
  .kl-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .kl-j {
    white-space: nowrap;
    font-family: var(--font-sans);
  }
  .kl-sitno {
    font-size: 12.5px;
    color: var(--text-faint);
  }

  /* izbor soli */
  .kl-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .kl-chip {
    min-height: 36px;
    min-width: 56px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font: 600 15px var(--font-sans);
    cursor: pointer;
  }
  .kl-chip.sel {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, var(--bg-elev));
  }
  .kl-klizaci {
    display: grid;
    gap: 6px;
    max-width: 460px;
  }
  .kl-kl {
    display: grid;
    gap: 2px;
  }
  .kl-kl-t {
    font-size: 14px;
    color: var(--text);
  }
  .kl-kl input {
    width: 100%;
    margin: 0;
    height: 36px;
    accent-color: var(--primary);
    cursor: pointer;
  }

  /* čaša uz ploču s očitanjem / podacima */
  .kl-stol {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .kl-aparat {
    flex: 0 0 116px;
  }
  .kl-svg {
    display: block;
    width: 116px;
    height: auto;
  }
  .kl-desno {
    flex: 1 1 auto;
    min-width: 0;
    display: grid;
    gap: 10px;
    align-content: start;
  }
  .kl-ocit {
    display: grid;
    gap: 2px;
  }
  .kl-ocit-n {
    font-size: 12px;
    color: var(--text-faint);
  }
  .kl-ocit b {
    font-size: 24px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .kl-gumbi {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .kl-g {
    min-height: var(--lx-control);
    padding: 0 14px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .kl-ispocetka {
    min-height: 36px;
    font-size: 13px;
  }
  .kl-stanje {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }
  .kl-podaci {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
    font-size: 14px;
    color: var(--text);
  }
  .kl-pz {
    white-space: nowrap;
    color: var(--text-dim);
  }

  /* crtež */
  .kl-stiropor {
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
    stroke-width: 1.3;
    stroke-linejoin: round;
  }
  .kl-zrno {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 0.6;
  }
  .kl-unutra {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 0.8;
  }
  .kl-voda {
    fill: color-mix(in srgb, var(--lx-water) 18%, transparent);
  }
  .kl-povrsina {
    stroke: color-mix(in srgb, var(--lx-water) 60%, transparent);
    stroke-width: 1.2;
  }
  .kl-poklopac {
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .kl-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .kl-staklo-in {
    fill: var(--bg-elev);
  }
  .kl-stupac,
  .kl-bulb {
    fill: var(--danger);
  }
  .kl-bulb {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .kl-crtica {
    stroke: var(--text-dim);
    stroke-width: 0.7;
  }
  .kl-broj {
    fill: var(--text-dim);
    font: 8.5px var(--font-sans);
  }
  .kl-cep {
    fill: var(--border-strong);
  }
  .kl-uzorak {
    fill: var(--text-faint);
    stroke: var(--text-dim);
    stroke-width: 0.6;
    stroke-dasharray: 1.5 1;
  }
  .kl-epruveta.prazna {
    opacity: 0.55;
  }
  .kl-kristal {
    fill: var(--text-faint);
    opacity: 0;
  }
  .kl-kristal.pad {
    animation: kl-pad 1.1s ease-in forwards;
  }
  @keyframes kl-pad {
    from {
      transform: translateY(-30px);
      opacity: 1;
    }
    70% {
      opacity: 0.9;
    }
    to {
      transform: translateY(var(--pad));
      opacity: 0;
    }
  }

  /* termogram */
  .kl-graf {
    margin: 0;
    max-width: 480px;
    width: 100%;
  }
  .kl-graf svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .kl-mreza {
    stroke: var(--border);
    stroke-width: 0.4;
  }
  .kl-mreza.glavna {
    stroke-width: 0.9;
  }
  .kl-os {
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .kl-tick {
    fill: var(--text-faint);
    font: 10px var(--font-sans);
  }
  .kl-osT {
    fill: var(--text-dim);
    font: 600 10.5px var(--font-sans);
  }
  .kl-dodatak {
    stroke: var(--text-faint);
    stroke-width: 0.9;
    stroke-dasharray: 3 3;
  }
  .kl-ref {
    stroke: var(--primary);
    stroke-width: 0.9;
    stroke-dasharray: 4 3;
  }
  .kl-lbl {
    fill: var(--text-dim);
    font: 9.5px var(--font-sans);
  }
  .kl-lbl.jak {
    fill: var(--text);
    font-weight: 600;
    font-size: 10.5px;
  }
  .kl-krivulja {
    fill: none;
    stroke: var(--text);
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .kl-tocka {
    fill: var(--text);
  }
  .kl-sad {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }

  /* račun u istraživanju */
  .kl-racun {
    display: grid;
    gap: 4px;
    font-size: 14.5px;
    color: var(--text);
  }
  .kl-racun p {
    margin: 0;
  }
  .kl-zakljucak {
    color: var(--text-dim);
  }

  /* unosi */
  .kl-unosi,
  .kl-lanac {
    display: grid;
    gap: 8px;
    max-width: 400px;
  }
  .kl-lanac {
    gap: 4px;
  }
  .kl-korak,
  .kl-kartica {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  :is(.kl-korak, .kl-kartica).ok {
    border-color: var(--lx-ok);
  }
  :is(.kl-korak, .kl-kartica, .kl-proces).bad {
    border-color: var(--lx-bad);
  }
  .kl-korak-oz,
  .kl-glava {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .kl-sym {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
    white-space: nowrap;
  }
  .kl-ime {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .kl-polje {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .kl-inp {
    width: 100%;
    max-width: 140px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .kl-polje .lx-unit {
    white-space: nowrap;
  }
  .kl-pm {
    min-width: 40px;
    min-height: 36px;
    font-size: 16px;
  }
  .kl-strelica {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
    font-size: 18px;
    line-height: 1;
  }
  .kl-op {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--primary);
  }
  .kl-proces {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .kl-seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .kl-seg button {
    min-height: var(--lx-control);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font: 500 14px var(--font-sans);
    cursor: pointer;
  }
  .kl-seg button.sel {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, var(--bg-elev));
    font-weight: 600;
  }
  .kl-seg button:disabled {
    cursor: default;
  }
  .kl-akcija {
    margin-top: 6px;
  }
  .kl-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .kl-tocno {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }

  @media (prefers-reduced-motion: reduce) {
    .kl-kristal.pad {
      animation: none;
    }
  }
</style>
