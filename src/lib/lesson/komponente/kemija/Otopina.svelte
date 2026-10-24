<script>
  // otopina: SVG priprema otopine (vaga s posudicom ili menzura s polaznom otopinom, odmjerna tikvica s oznakom; kod
  // miješanja dvije čaše i velika čaša) i lanac kartica s veličinama sastava. Sav račun i sve poruke su u
  // katalog/kemija/otopina.js (m ↔ n ↔ c kroz mol_racun); ovdje je samo prikaz.
  // Boja otopine je kemijski podatak (CuSO₄ plava, KMnO₄ ljubičasta …) i blijedi s koncentracijom; bezbojna otopina
  // ima točkice čestica. Postupak teče po fazama (izvaži → prenesi → otopi u malo vode → dopuni do oznake → promiješaj);
  // uz prefers-reduced-motion skoči na kraj.
  // „Tvoj red“ ne odaje odgovor: crtež do provjere pokazuje samo zadane podatke (prazna tikvica, „?“ na vagi ili
  // menzuri, bez boje nepoznate otopine), a formule na strelicama vide se samo uz `operacije: true` ili nakon provjere.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { seededShuffle } from "$lib/lesson/core/shuffle.js";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    otopina,
    lanac,
    sveOf,
    pocetno,
    zadaniOf,
    traziOf,
    jediniceOf,
    oznaka,
    imeOf,
    vrstaOf,
    klizaciOf,
    koraciPostupka,
    bojaOf,
    zapisBroja,
    sJedinicom,
    zapisZadanog,
    faktor,
    Mof,
  } from "$lib/lesson/katalog/kemija/otopina.js";
  import { formulaZapis } from "$lib/lesson/katalog/kemija/mol_racun.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const istrazi = nacin === "istrazi";
  const postupak = nacin === "postupak";
  const vrsta = vrstaOf(s);
  const operacije = s.operacije ?? istrazi;
  const rijeseno = $derived(!!ishod?.tocno || pokazi);
  const pokaziFormule = $derived(operacije || rijeseno);
  const F = s.tvar ? formulaZapis(s.tvar) : "";
  const boja = bojaOf(s);
  const uid = Math.random().toString(36).slice(2, 8);

  // ── podaci ──
  const zadani = postupak ? [] : zadaniOf(s);
  const trazeni = postupak ? [] : traziOf(s);
  const jed = postupak ? {} : jediniceOf(s);
  const zadanoPo = Object.fromEntries(zadani.map((z) => [z.velicina, z]));

  // ── istraživanje: klizači ──
  const klizaci = istrazi ? klizaciOf(s) : [];
  let vr = $state(Object.fromEntries(klizaci.map((kl) => [kl.velicina, kl.z?.vrijednost ?? 1])));
  // diskretni klizač (tikvice): indeks u popisu vrijednosti
  let idx = $state(Object.fromEntries(klizaci.filter((kl) => kl.vrijednosti).map((kl) => [kl.velicina, Math.max(0, kl.vrijednosti.indexOf(kl.z?.vrijednost))])));
  $effect(() => {
    for (const kl of klizaci) if (kl.vrijednosti) vr[kl.velicina] = kl.vrijednosti[idx[kl.velicina]];
  });
  const promjene = $derived(istrazi ? Object.fromEntries(Object.entries(vr).map(([k, v]) => [k, Number(v)])) : undefined);
  const koraci = $derived(postupak ? [] : lanac(s, promjene).koraci);

  // ── crtež: što se smije vidjeti ──
  // istraživanje: sve uživo; „Tvoj red“: do provjere samo zadano, nakon provjere sve
  const K = $derived(postupak ? {} : istrazi ? sveOf(s, promjene) : rijeseno ? sveOf(s) : pocetno(s));
  const ulijevo = (k) => (K[k] != null && Number.isFinite(K[k]) ? K[k] : null);
  // iznos za oznaku na crtežu: zadani kako piše u tekstu, izračunati s tri znamenke, nepoznati „?“
  function iznos(k, u = jed[k]) {
    const z = zadanoPo[k];
    if (z && !(istrazi && k in vr)) return zapisZadanog(z);
    const v = ulijevo(k);
    const j = u ?? { V: "mL", c: "mol/dm³", m: "g" }[k.replace(/[12]$/, "")] ?? "";
    if (v == null) return `? ${j}`.trim();
    return sJedinicom(v / (faktor(k, j) ?? 1), j);
  }
  // otopina u tikvici / čaši: konačna koncentracija i volumen
  const cKraj = $derived(vrsta === "razrjedivanje" ? ulijevo("c2") : ulijevo("c"));
  const VKraj = $derived(vrsta === "razrjedivanje" ? ulijevo("V2") : vrsta === "mijesanje" ? (ulijevo("V") ?? (ulijevo("V1") != null && ulijevo("V2") != null ? ulijevo("V1") + ulijevo("V2") : null)) : ulijevo("V"));
  const masa = $derived(vrsta === "otapanje" ? ulijevo("m") : null);
  const tikvicaML = $derived.by(() => {
    const k = vrsta === "razrjedivanje" ? "V2" : "V";
    const z = zadanoPo[k];
    if (z && !(istrazi && k in vr)) return z.vrijednost * faktor(k, z.jedinica) * 1000;
    return VKraj != null ? VKraj * 1000 : null;
  });

  // ── faze pripreme ──
  const FAZE = {
    otapanje: [
      "Prazna odmjerna tikvica i vaga s posudicom za vaganje.",
      "Tvar je izvagana u posudici.",
      "Tvar je preko lijevka prenesena u tikvicu, a lijevak ispran vodom u tikvicu.",
      "Dolivena je voda do polovine tikvice: mućkanjem se otapa sva tvar.",
      "Tikvica je dopunjena destiliranom vodom do oznake.",
      "Začepljeno i promiješano: otopina je jednaka u cijeloj tikvici.",
    ],
    razrjedivanje: [
      "Polazna otopina, prazna menzura i prazna odmjerna tikvica.",
      "Menzurom je odmjeren volumen polazne otopine.",
      "Polazna otopina ulivena je preko lijevka u tikvicu.",
      "Tikvica je dopunjena destiliranom vodom do oznake (još nije promiješano).",
      boja ? "Promiješano: boja je svuda jednaka i bljeđa nego u polaznoj otopini." : "Promiješano: čestice su raspoređene po cijeloj tikvici, rjeđe nego u polaznoj otopini.",
    ],
    mijesanje: ["Dvije otopine iste tvari i prazna čaša.", "Ulivena je prva otopina.", "Ulivena je i druga otopina.", "Promiješano: koncentracija je između koncentracija dviju otopina."],
  };
  const faze = FAZE[vrsta];
  const ZADNJA = faze.length - 1;
  let faza = $state(istrazi ? ZADNJA : 0);
  const smanjeno = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let tajmer = 0;
  function pripremi() {
    clearTimeout(tajmer);
    if (smanjeno) {
      faza = ZADNJA;
      return;
    }
    faza = 0;
    const dalje = () => {
      if (faza < ZADNJA) {
        faza++;
        tajmer = setTimeout(dalje, 1100);
      }
    };
    tajmer = setTimeout(dalje, 500);
  }
  $effect(() => () => clearTimeout(tajmer));
  // nakon provjere (ili „Pokaži odgovor“) priprema se odigra sama
  let odigrano = false;
  $effect(() => {
    if (!istrazi && rijeseno && !odigrano) {
      odigrano = true;
      untrack(pripremi);
    }
  });

  // ── boja i razina ──
  const VODA = "var(--lx-water)";
  const alfa = (c) => {
    if (!boja) return 0.2;
    if (c == null) return 0.12;
    return Math.min(0.92, Math.max(0.06, 1 - Math.exp((-1.6 * c) / boja.cRef)));
  };
  const bojaTekucine = boja ? boja.css : VODA;
  // tikvica: udio volumena do oznake → y razine (trbuh do y = 96 ima 93 % volumena, vrat do oznake 7 %)
  const T_DNO = 178;
  const T_OZNAKA = 40;
  const razina = (f) => {
    const x = Math.max(0, Math.min(1, f));
    return x <= 0.93 ? T_DNO - (x / 0.93) * (T_DNO - 98) : 98 - ((x - 0.93) / 0.07) * (98 - T_OZNAKA);
  };
  const visina = (y) => (T_DNO + 2 - y) / (T_DNO + 2 - T_OZNAKA + 4);

  // stanje tekućine u tikvici / velikoj čaši: {f gornji sloj, a gornji, fd donji sloj, ad donji, prah, tocke}
  const tekucina = $derived.by(() => {
    const cK = cKraj;
    if (vrsta === "otapanje") {
      const st = [
        { f: 0, a: 0, fd: 0, ad: 0 },
        { f: 0, a: 0, fd: 0, ad: 0 },
        { f: 0, a: 0, fd: 0, ad: 0, prah: true },
        { f: 0.5, a: alfa(cK != null ? 2 * cK : null), fd: 0.5, ad: alfa(cK != null ? 2 * cK : null), c: cK != null ? 2 * cK : null },
        { f: 1, a: alfa(cK != null ? cK * 0.5 : null), fd: 0.5, ad: alfa(cK != null ? 1.6 * cK : null), c: cK, slojevi: true },
        { f: 1, a: alfa(cK), fd: 1, ad: alfa(cK), c: cK },
      ];
      return st[faza];
    }
    if (vrsta === "razrjedivanje") {
      const c1 = ulijevo("c1");
      const V1 = ulijevo("V1");
      const fV = V1 != null && VKraj ? V1 / VKraj : 0.25;
      const st = [
        { f: 0, a: 0, fd: 0, ad: 0 },
        { f: 0, a: 0, fd: 0, ad: 0 },
        { f: fV, a: alfa(c1), fd: fV, ad: alfa(c1), c: c1 },
        { f: 1, a: alfa(cK != null ? cK * 0.4 : null), fd: fV, ad: alfa(c1), c: c1, slojevi: true },
        { f: 1, a: alfa(cK), fd: 1, ad: alfa(cK), c: cK },
      ];
      return st[faza];
    }
    // miješanje
    const [c1, c2, V1, V2] = ["c1", "c2", "V1", "V2"].map(ulijevo);
    const f1 = V1 != null && V2 != null ? V1 / (V1 + V2) : 0.4;
    const st = [
      { f: 0, a: 0, fd: 0, ad: 0 },
      { f: f1, a: alfa(c1), fd: f1, ad: alfa(c1), c: c1 },
      { f: 1, a: alfa(c2), fd: f1, ad: alfa(c1), c: c1, slojevi: true },
      { f: 1, a: alfa(cK), fd: 1, ad: alfa(cK), c: cK },
    ];
    return st[faza];
  });

  // točkice čestica (bezbojna otopina): stalni položaji u trbuhu tikvice, broj ovisi o koncentraciji
  const TOCKE = (() => {
    let x = 7;
    const r = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 48 }, () => {
      const y = 104 + r() * 70;
      const pol = y < 120 ? 10 + ((y - 104) / 16) * 22 : 32;
      return { dx: (r() * 2 - 1) * pol, y };
    });
  })();
  const brojTocaka = (c) => (c == null || c <= 0 ? 0 : Math.round(Math.min(44, 4 + 40 * (1 - Math.exp(-c / 0.6)))));
  const vidljiveTocke = $derived.by(() => {
    if (boja || !tekucina || tekucina.f <= 0) return [];
    const n = brojTocaka(tekucina.c);
    const yGore = razina(tekucina.slojevi ? tekucina.fd : tekucina.f);
    return TOCKE.slice(0, n).filter((t) => t.y > yGore + 3);
  });

  // polazna otopina (boca) i menzura
  const menzuraML = $derived.by(() => {
    const v = ulijevo("V1");
    const ml = v != null ? v * 1000 : null;
    return [10, 25, 50, 100, 250, 500, 1000].find((x) => ml == null || x >= ml * 1.15) ?? 1000;
  });
  const fMenzura = $derived(ulijevo("V1") != null ? (ulijevo("V1") * 1000) / menzuraML : 0);

  // ── odgovor ──
  let unosi = $state(trazeni.map(() => ""));
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  function predaj(e) {
    e.preventDefault();
    if (!locked && potpun) onodgovor($state.snapshot(unosi));
  }
  const ok = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina > i);
  const bad = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;

  // ── postupak ──
  const koraciP = postupak ? koraciPostupka(s) : [];
  let red = $state(seededShuffle(koraciP.map((_, i) => i), JSON.stringify(koraciP.map((k) => k.id)) + (s.tekst ?? "")));
  const prikazRed = $derived(pokazi ? koraciP.map((_, i) => i) : red);
  function pomakni(pos, d) {
    const to = pos + d;
    if (locked || to < 0 || to >= red.length) return;
    [red[pos], red[to]] = [red[to], red[pos]];
  }

  const tocno = $derived(pokazi && !postupak ? otopina.tocanOdgovor(s) : "");
  const M = Mof(s);
  const pokaziM = istrazi && M != null && (zadani.some((z) => /^[mn]/.test(z.velicina)) || trazeni.some((t) => /^(m|n)[12]?$/.test(t.velicina)));
  const ime = (k) => imeOf(k, s);
  const ozn = (t) => t.oznaka ?? oznaka(t.velicina, s);

  // tikvica (cx) i položaji posuda: dva stupca (otapanje) ili tri
  const CX = vrsta === "otapanje" ? 225 : 250;
  const tikvicaPut = (cx) => `M${cx - 7} 16 V96 C${cx - 7} 104 ${cx - 38} 110 ${cx - 38} 140 C${cx - 38} 162 ${cx - 31} 178 ${cx - 24} 178 H${cx + 24} C${cx + 31} 178 ${cx + 38} 162 ${cx + 38} 140 C${cx + 38} 110 ${cx + 7} 104 ${cx + 7} 96 V16`;
  const casaPut = (cx, w, y0) => `M${cx - w} ${y0} V176 Q${cx - w} 178 ${cx - w + 2} 178 H${cx + w - 2} Q${cx + w} 178 ${cx + w} 176 V${y0}`;
  const vagaDisplej = $derived(faza === 1 ? (masa != null ? `${formatNumber(Math.round(masa * 100) / 100, 2)} g` : postupak ? "izvagano" : "? g") : "0,00 g");
</script>

{#snippet par(lbl, k)}<span class="ot-par"><span class="ot-nr"><Formula f={`${lbl} =`} /></span> <span class="ot-nr"><Formula f={iznos(k)} /></span></span>{/snippet}
{#snippet jedinica(u)}{#if u}<span class="ot-j"><Formula f={u} /></span>{/if}{/snippet}

{#snippet tikvica(cx)}
  {@const t = tekucina}
  {@const yG = razina(t.f)}
  {@const yD = razina(t.fd)}
  <defs><clipPath id="ot-{uid}-t"><path d="{tikvicaPut(cx)} Z" /></clipPath></defs>
  <path class="ot-staklo-in" d="{tikvicaPut(cx)} Z" />
  <g clip-path="url(#ot-{uid}-t)">
    {#if boja}<rect class="ot-tek ot-podloga" x={cx - 40} y={T_OZNAKA - 4} width="80" height={T_DNO + 6 - T_OZNAKA} style=" transform: scaleY({t.f > 0 ? visina(yG) : 0})" />{/if}
    <rect class="ot-tek" x={cx - 40} y={T_OZNAKA - 4} width="80" height={T_DNO + 6 - T_OZNAKA} style="fill: {bojaTekucine}; fill-opacity: {t.f > 0 ? t.a : 0}; transform: scaleY({t.f > 0 ? visina(yG) : 0})" />
    <rect class="ot-tek" x={cx - 40} y={T_OZNAKA - 4} width="80" height={T_DNO + 6 - T_OZNAKA} style="fill: {bojaTekucine}; fill-opacity: {t.fd > 0 ? Math.max(0, t.ad - t.a) / (1 - t.a || 1) : 0}; transform: scaleY({t.fd > 0 ? visina(yD) : 0})" />
    {#each vidljiveTocke as d, i (i)}<circle class="ot-cestica" cx={cx + d.dx} cy={d.y} r="1.4" />{/each}
    {#if t.prah}<path class="ot-prah" d="M{cx - 14} 178 Q{cx} 166 {cx + 14} 178 Z" style={boja ? `fill: ${boja.css}` : ""} />{/if}
  </g>
  <path class="ot-staklo" d={tikvicaPut(cx)} />
  <line class="ot-oznaka" x1={cx - 11} y1={T_OZNAKA} x2={cx + 11} y2={T_OZNAKA} />
  {#if tikvicaML != null}<text class="ot-natpis" x={cx} y="150" text-anchor="middle">{formatNumber(Math.round(tikvicaML))} mL</text>{/if}
  {#if (vrsta === "otapanje" && faza === 2) || (vrsta === "razrjedivanje" && faza === 2)}
    <path class="ot-lijevak" d="M{cx - 16} 2 L{cx + 16} 2 L{cx + 3} 18 V30 H{cx - 3} V18 Z" />
  {/if}
  {#if (vrsta === "otapanje" && (faza === 3 || faza === ZADNJA)) || faza === ZADNJA}
    <rect class="ot-cep" x={cx - 9} y="8" width="18" height="11" rx="3" />
  {/if}
{/snippet}

{#snippet scena()}
  <figure class="ot-scena">
    <svg viewBox="0 0 300 186" role="img" aria-label="{vrsta === 'razrjedivanje' ? 'Razrjeđivanje' : vrsta === 'mijesanje' ? 'Miješanje dviju otopina' : 'Priprema otopine otapanjem'}{F ? ` (${s.tvar})` : ''}: {faze[faza]}">
      {#if vrsta === "otapanje"}
        <!-- vaga s posudicom za vaganje -->
        <rect class="ot-vaga" x="30" y="148" width="90" height="30" rx="4" />
        <rect class="ot-displej" x="44" y="155" width="62" height="16" rx="2" />
        <text class="ot-znam" x="102" y="167" text-anchor="end">{vagaDisplej}</text>
        <rect class="ot-plitica" x="38" y="142" width="74" height="6" rx="2" />
        <path class="ot-posudica" d="M54 126 L58 142 H92 L96 126" />
        {#if faza === 1}<path class="ot-prah" d="M60 141 Q75 128 90 141 Z" style={boja ? `fill: ${boja.css}` : ""} />{/if}
        {@render tikvica(CX)}
      {:else if vrsta === "razrjedivanje"}
        {@const c1 = ulijevo("c1")}
        <!-- boca s polaznom otopinom -->
        <path class="ot-staklo-in" d="M30 96 Q30 90 36 90 H44 V78 H56 V90 H64 Q70 90 70 96 V176 Q70 178 68 178 H32 Q30 178 30 176 Z" />
        {#if boja}<rect class="ot-tek ot-podloga" x="31" y="100" width="38" height="77" style=" transform: scaleY({faza >= 1 ? 0.78 : 0.9})" />{/if}
        <rect class="ot-tek" x="31" y="100" width="38" height="77" style="fill: {bojaTekucine}; fill-opacity: {alfa(c1)}; transform: scaleY({faza >= 1 ? 0.78 : 0.9})" />
        <path class="ot-staklo" d="M30 96 Q30 90 36 90 H44 V78 H56 V90 H64 Q70 90 70 96 V176 Q70 178 68 178 H32 Q30 178 30 176 Z" />
        <rect class="ot-cep" x="42" y="70" width="16" height="9" rx="2" />
        <!-- menzura -->
        <path class="ot-staklo-in" d="M140 34 V172 H160 V34" />
        {#if boja}<rect class="ot-tek ot-podloga" x="141" y="40" width="18" height="132" style=" transform: scaleY({faza === 1 ? fMenzura * (128 / 132) : 0})" />{/if}
        <rect class="ot-tek" x="141" y="40" width="18" height="132" style="fill: {bojaTekucine}; fill-opacity: {alfa(c1)}; transform: scaleY({faza === 1 ? fMenzura * (128 / 132) : 0})" />
        <path class="ot-staklo" d="M140 34 V172 H160 V34 M136 34 H140" />
        <path class="ot-staklo" d="M130 178 H170 M136 178 L140 172 M164 178 L160 172" />
        {#each Array.from({ length: 11 }, (_, i) => i) as i (i)}
          <line class="ot-crtica" x1="160" y1={172 - (i * 128) / 10} x2={i % 5 === 0 ? 152 : 155} y2={172 - (i * 128) / 10} />
        {/each}
        <text class="ot-natpis" x="164" y="47">{menzuraML} mL</text>
        {@render tikvica(CX)}
      {:else}
        {@const [c1, c2, V1, V2] = ["c1", "c2", "V1", "V2"].map(ulijevo)}
        {@const Vmax = Math.max(V1 ?? 1, V2 ?? 1)}
        {#each [[50, c1, V1, 1], [150, c2, V2, 2]] as [cx, c, V, n] (n)}
          {@const pun = faza < n}
          <path class="ot-staklo-in" d="{casaPut(cx, 26, 96)} Z" />
          {#if boja}<rect class="ot-tek ot-podloga" x={cx - 25} y="100" width="50" height="77" style=" transform: scaleY({pun ? 0.25 + (0.7 * (V ?? Vmax)) / Vmax : 0})" />{/if}
          <rect class="ot-tek" x={cx - 25} y="100" width="50" height="77" style="fill: {bojaTekucine}; fill-opacity: {alfa(c)}; transform: scaleY({pun ? 0.25 + (0.7 * (V ?? Vmax)) / Vmax : 0})" />
          <path class="ot-staklo" d={casaPut(cx, 26, 96)} />
          <text class="ot-natpis" x={cx} y="92" text-anchor="middle">{n}.</text>
        {/each}
        <!-- velika čaša za smjesu -->
        {@const t = tekucina}
        <path class="ot-staklo-in" d="{casaPut(250, 40, 48)} Z" />
        {#if boja}<rect class="ot-tek ot-podloga" x="211" y="52" width="78" height="125" style=" transform: scaleY({t.f * 0.95})" />{/if}
        <rect class="ot-tek" x="211" y="52" width="78" height="125" style="fill: {bojaTekucine}; fill-opacity: {t.f > 0 ? t.a : 0}; transform: scaleY({t.f * 0.95})" />
        <rect class="ot-tek" x="211" y="52" width="78" height="125" style="fill: {bojaTekucine}; fill-opacity: {t.fd > 0 ? Math.max(0, t.ad - t.a) / (1 - t.a || 1) : 0}; transform: scaleY({t.fd * 0.95})" />
        {#if !boja && t.f > 0}
          {#each TOCKE.slice(0, brojTocaka(t.c)) as d, i (i)}
            {@const y = 178 - ((d.y - 104) / 70) * 120 * (t.slojevi ? t.fd : t.f)}
            <circle class="ot-cestica" cx={250 + d.dx * 1.1} cy={y} r="1.4" />
          {/each}
        {/if}
        <path class="ot-staklo" d={casaPut(250, 40, 48)} />
      {/if}
    </svg>
    {#if !postupak}
    <figcaption class="ot-podpis" class:tri={vrsta !== "otapanje"}>
      {#if vrsta === "otapanje"}
        <span>{#if F}<Formula f={F} />{/if}{#if masa != null || zadanoPo.m || trazeni.some((t) => t.velicina === "m")}{@render par("m", "m")}{/if}</span>
        <span>{@render par("V", "V")}{#if cKraj != null}{@render par("c", "c")}{/if}</span>
      {:else if vrsta === "razrjedivanje"}
        <span><span class="ot-nr">polazna</span>{#if ulijevo("c1") != null}{@render par("c₁", "c1")}{/if}{#if ulijevo("w1") != null}{@render par("w₁", "w1")}{/if}</span>
        <span>{@render par("V₁", "V1")}</span>
        <span>{@render par("V₂", "V2")}{#if cKraj != null}{@render par("c₂", "c2")}{/if}</span>
      {:else}
        <span>{@render par("c₁", "c1")}{@render par("V₁", "V1")}</span>
        <span>{@render par("c₂", "c2")}{@render par("V₂", "V2")}</span>
        <span>{#if cKraj != null}{@render par("c", "c")}{/if}</span>
      {/if}
    </figcaption>
    {/if}
    <p class="ot-faza" aria-live="polite">{faze[faza]}{#if boja && faza === ZADNJA && (istrazi || rijeseno) && boja.naziv}&#32;Otopina je {boja.naziv}.{/if}</p>
  </figure>
{/snippet}

{#if s.tekst}<div class="lx-question"><Md text={s.tekst} /></div>{/if}
{#if istrazi}<p class="ot-hint">Pomiči klizač – ovo nije zadatak, samo istražuješ.</p>{/if}

<div class="ot">
  {@render scena()}
  {#if istrazi || rijeseno}
    <div class="ot-gumbi"><button type="button" class="btn btn-quiet ot-g" onclick={pripremi}>{istrazi ? "Pripremi otopinu" : "Pokaži pripremu još jednom"}</button></div>
  {/if}

  {#if postupak}
    <ol class="lx-order ot-red">
      {#each prikazRed as i, pos (i)}
        <li class="lx-option" class:ok={ishod?.tocno || pokazi} class:bad={!pokazi && ishod && !ishod.tocno && ishod.pozicija === pos}>
          <span class="lx-mark">{pos + 1}</span>
          <span class="ot-red-tekst">{koraciP[i].tekst}</span>
          {#if !locked}
            <span class="ot-red-btns">
              <button type="button" class="icon-btn ot-strelica" aria-label="Pomakni gore: {koraciP[i].kratko}" disabled={pos === 0} onclick={() => pomakni(pos, -1)}>↑</button>
              <button type="button" class="icon-btn ot-strelica" aria-label="Pomakni dolje: {koraciP[i].kratko}" disabled={pos === prikazRed.length - 1} onclick={() => pomakni(pos, 1)}>↓</button>
            </span>
          {/if}
        </li>
      {/each}
    </ol>
    <div class="ot-akcija"><button class="btn btn-primary" type="button" disabled={locked} onclick={() => onodgovor($state.snapshot(red))}>Provjeri</button></div>
  {:else}
    <ul class="ot-zadano" aria-label="Zadano">
      {#each zadani as z (z.velicina)}
        <li>
          {#if z.pretpostavka}<span class="ot-dim">zamisli</span>{/if}
          <span class="ot-nr"><Formula f={`${oznaka(z.velicina, s)} = `} /></span>
          {#if istrazi && z.velicina in vr}
            <b class="ot-nr ot-uzivo"><Formula f={`${zapisBroja(Number(vr[z.velicina]))}${z.jedinica ? ` ${z.jedinica}` : ""}`} /></b>
          {:else}
            <span class="ot-nr"><Formula f={zapisZadanog(z)} /></span>
          {/if}
          {#if z.pretpostavka}<span class="ot-dim">otopine</span>{/if}
        </li>
      {/each}
      {#if pokaziM}<li><span class="ot-nr"><Formula f={`M(${F}) = ${formatNumber(Math.round(M * 100) / 100)} g/mol`} /></span></li>{/if}
      {#if s.ioni}<li class="ot-dim">ioni: {#each s.ioni as x, j (j)}{j ? " + " : ""}<span class="ot-nr">{(x.broj ?? 1) > 1 ? `${x.broj} ` : ""}<Formula f={x.ion} /></span>{/each}</li>{/if}
    </ul>

    {#if klizaci.length}
      <div class="ot-klizaci">
        {#each klizaci as kl (kl.velicina)}
          <label class="ot-klizac">
            <span class="ot-kl-nasl"><Formula f={oznaka(kl.velicina, s)} /> <span class="ot-dim">{ime(kl.velicina)}</span></span>
            {#if kl.vrijednosti}
              <input type="range" min="0" max={kl.vrijednosti.length - 1} step="1" bind:value={idx[kl.velicina]} aria-label="{ime(kl.velicina)} ({kl.z?.jedinica})" aria-valuetext="{formatNumber(kl.vrijednosti[idx[kl.velicina]])} {kl.z?.jedinica}" />
            {:else}
              <input type="range" min={kl.od} max={kl.do} step={kl.korak} bind:value={vr[kl.velicina]} aria-label="{ime(kl.velicina)} ({kl.z?.jedinica || 'udio'})" />
            {/if}
          </label>
        {/each}
      </div>
    {/if}

    <form onsubmit={predaj}>
      <div class="ot-lanac">
        {#each trazeni as t, i (t.velicina)}
          <div class="ot-str" aria-label={pokaziFormule && koraci[i]?.pravilo ? koraci[i].pravilo.formula : "sljedeći korak"}>
            <span aria-hidden="true">↓</span>
            {#if pokaziFormule && koraci[i]?.pravilo}<span class="ot-op"><Formula f={koraci[i].pravilo.formula} /></span>{/if}
          </div>
          <div class="ot-kartica" class:ok={!istrazi && ok(i)} class:bad={!istrazi && bad(i)}>
            <div class="ot-glava"><span class="ot-sym"><Formula f={ozn(t)} /></span><span class="ot-ime">{ime(t.velicina)}</span></div>
            {#if istrazi}
              <div class="ot-vrijednost" aria-live="polite"><Formula f={Number.isFinite(koraci[i]?.vrijednost) ? sJedinicom(koraci[i].vrijednost, t.jedinica) : "—"} /></div>
            {:else}
              <div class="ot-unos">
                <input
                  class="inp ot-inp"
                  class:ok={ok(i)}
                  class:bad={bad(i)}
                  inputmode="decimal"
                  autocomplete="off"
                  aria-label="{ozn(t)}{t.jedinica ? ` u ${t.jedinica}` : ''}"
                  placeholder="?"
                  disabled={locked}
                  bind:value={unosi[i]}
                />
                {@render jedinica(t.jedinica)}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      {#if !istrazi}
        <div class="ot-akcija"><button class="btn btn-primary" type="submit" disabled={locked || !potpun}>Provjeri</button></div>
      {/if}
    </form>
  {/if}
</div>

{#if tocno}<p class="ot-tocno">Točan odgovor: {#each tocno.split(" → ") as d, j (j)}{j ? " → " : ""}<b><Formula f={d} /></b>{/each}</p>{/if}

<style>
  .ot {
    display: grid;
    gap: 12px;
  }
  .ot-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .ot-scena {
    margin: 0;
    display: grid;
    gap: 4px;
    max-width: 420px;
  }
  .ot-scena svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .ot-podpis {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    font-size: 12.5px;
    color: var(--text-dim);
    font-family: var(--font-sans);
  }
  .ot-podpis.tri {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .ot-podpis > span {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1px;
    min-width: 0;
  }
  .ot-nr {
    white-space: nowrap;
  }
  .ot-par {
    max-width: 100%;
  }
  .ot-podpis.tri {
    font-size: 11.5px;
  }
  .ot-faza {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--text-dim);
    min-height: 2.6em;
  }
  .ot-gumbi {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ot-g {
    min-height: var(--lx-control);
    padding: 0 14px;
    font-size: 14px;
    border-radius: var(--r-md);
  }

  /* crtež */
  .ot-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.3;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .ot-staklo-in {
    fill: var(--bg-elev);
  }
  .ot-tek {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    transition:
      transform 0.8s ease,
      fill-opacity 0.8s ease;
  }
  /* svijetla podloga ispod obojene otopine: i u tamnoj temi bljeđa otopina izgleda svjetlije, kao u staklu */
  .ot-podloga {
    fill: #f3f7fa;
    fill-opacity: 0.92;
  }
  .ot-oznaka {
    stroke: var(--text);
    stroke-width: 1.4;
  }
  .ot-natpis {
    fill: var(--text-faint);
    font: 9px var(--font-sans);
  }
  .ot-cestica {
    fill: var(--text-dim);
    opacity: 0.75;
  }
  .ot-prah {
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
    stroke-width: 0.8;
  }
  .ot-lijevak {
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .ot-cep {
    fill: var(--border-strong);
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .ot-vaga {
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .ot-displej {
    fill: var(--bg);
    stroke: var(--border-strong);
    stroke-width: 0.8;
  }
  .ot-znam {
    fill: var(--text);
    font: 600 10.5px var(--font-sans);
    font-variant-numeric: tabular-nums;
  }
  .ot-plitica {
    fill: var(--border-strong);
  }
  .ot-posudica {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .ot-crtica {
    stroke: var(--text-dim);
    stroke-width: 0.7;
  }

  /* zadano i klizači */
  .ot-zadano {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 14px;
    color: var(--text);
    font-family: var(--font-sans);
  }
  .ot-zadano li {
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0 4px;
  }
  .ot-dim {
    color: var(--text-faint);
    font-size: 12.5px;
  }
  .ot-uzivo {
    color: var(--primary);
  }
  .ot-klizaci {
    display: grid;
    gap: 8px;
    max-width: 420px;
  }
  .ot-klizac {
    display: grid;
    gap: 2px;
  }
  .ot-kl-nasl {
    font-size: 14px;
    font-family: var(--font-sans);
  }
  .ot-klizac input {
    width: 100%;
    margin: 0;
    height: 36px;
    accent-color: var(--primary);
    cursor: pointer;
  }

  /* lanac */
  .ot-lanac {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 420px;
  }
  .ot-str {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
    font-size: 18px;
    line-height: 1;
  }
  .ot-op {
    font-size: 13px;
    color: var(--primary);
    font-weight: 600;
    font-family: var(--font-sans);
  }
  .ot-kartica {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .ot-kartica.ok {
    border-color: var(--lx-ok);
  }
  .ot-kartica.bad {
    border-color: var(--lx-bad);
  }
  .ot-glava {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
  }
  .ot-sym {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
  }
  .ot-ime {
    font-size: 12px;
    color: var(--text-faint);
  }
  .ot-vrijednost {
    font-family: var(--font-sans);
    font-size: 17px;
    font-weight: 600;
    color: var(--primary);
    white-space: nowrap;
  }
  .ot-unos {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ot-inp {
    width: 100%;
    max-width: 150px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .ot-j {
    font-size: 14px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .ot-akcija {
    margin-top: 10px;
  }
  .ot-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .ot-tocno {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }
  .ot-tocno b {
    color: var(--success);
    font-family: var(--font-sans);
  }

  /* postupak */
  .ot-red {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .ot-red li {
    align-items: center;
    padding: 6px 6px 6px 12px;
  }
  .ot-red-tekst {
    flex: 1;
    font-size: 14px;
  }
  .ot-red-btns {
    display: flex;
    gap: 2px;
  }
  .ot-strelica {
    min-width: 36px;
    min-height: 36px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ot-tek {
      transition: none;
    }
  }
</style>
