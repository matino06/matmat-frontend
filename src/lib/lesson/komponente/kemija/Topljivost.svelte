<script>
  // topljivost: krivulja topljivosti (lekcija 007, pokus 4) s epruvetom. Sav račun je u katalog/kemija/topljivost.js;
  // ovdje je samo prikaz. U „Tvoj red“ graf nema točaka, pomoćnih crta ni vrijednosti s krivulje: točka otopine, put
  // hlađenja i očitanja ucrtaju se tek nakon provjere (ili „Pokaži odgovor“). Formule na strelicama lanca vide se samo
  // uz operacije: true ili nakon provjere. Istraživanje: klizači temperature i mase soli, povlačenje točke po grafu,
  // epruveta s kristalima na dnu i „mirno hlađenje“ za prezasićenu otopinu.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    topljivost,
    krivuljaOf,
    ugradjena,
    naKrivulji,
    uS,
    masaZa,
    izSastava,
    vrstaZa,
    VRSTA_IME,
    VRSTE,
    PROCESI,
    zapisVrijednosti,
    zapisT,
    zapisMase,
    jedinicaVrijednosti,
    modelOf,
    vrstaModel,
    ocitanjaOf,
    mjerenjaOf,
    trazeniOf,
    oznakaKoraka,
    imeKoraka,
    jedinicaKoraka,
    formulaKoraka,
    rasponT,
    jednaTocka,
    procesOf,
    otopinaOf,
    zapisZadanog,
  } from "$lib/lesson/katalog/kemija/topljivost.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const istrazi = nacin === "istrazi";
  const postotak = !!s.postotak;
  const uid = Math.random().toString(36).slice(2, 8);
  const aktivno = $derived(!locked && !pokazi);
  const rijeseno = $derived(!!ishod?.tocno || pokazi);
  const tocanTekst = $derived(pokazi ? topljivost.tocanOdgovor(s) : "");
  const okK = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina != null && ishod.praznina > i);
  const badK = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;

  // ── krivulje ──
  const tvari = istrazi && Array.isArray(s.tvari) ? s.tvari : null;
  const izbor = tvari ? tvari.map((x) => ugradjena(x)) : null;
  const pocetna = tvari ? Math.max(0, izbor.findIndex((k) => s.tvar && k.tvar === krivuljaOf(s).tvar)) : 0;
  let odabrana = $state(pocetna);
  const K = $derived(izbor ? krivuljaOf({ tvar: izbor[odabrana].tvar }) : krivuljaOf(s));
  const jedV = $derived(jedinicaVrijednosti(K, postotak));
  const naOsi = (v) => (K.iskaz === "w" && postotak ? v * 100 : v); // vrijednost krivulje → broj na osi
  const zapisV = (v) => zapisVrijednosti(K, v, postotak);
  const sJ = (z, u) => (u ? `${z} ${u}` : z);

  // ── graf ──
  const GW = 340;
  const GH = 232;
  const GL = 44;
  const GR = 46;
  const GT = 12;
  const GB = 28;
  const sx = (t) => GL + ((t - K.os.x[0]) / (K.os.x[1] - K.os.x[0])) * (GW - GL - GR);
  const sy = (v) => GT + ((K.os.y[1] - v) / (K.os.y[1] - K.os.y[0])) * (GH - GT - GB);
  const yUnutra = (v) => Math.max(K.os.y[0], Math.min(K.os.y[1], v));
  function crtice(od, doo, korak) {
    const n = Math.floor((doo - od) / korak + 1e-6);
    const out = [];
    for (let i = 0; i <= n && i <= 40; i++) out.push(Number((od + i * korak).toPrecision(8)));
    return out;
  }
  const xs = $derived(crtice(K.os.x[0], K.os.x[1], K.os.mreza[0]));
  const ys = $derived(crtice(K.os.y[0], K.os.y[1], K.os.mreza[1]));
  const tickY = (v) => formatNumber(Number(naOsi(v).toPrecision(6)));
  const tockeKrivulje = $derived(K.tocke.map(([t, v]) => `${sx(t).toFixed(1)},${sy(v).toFixed(1)}`).join(" "));
  // točke tablice samo u istraživanju i nakon provjere: u „Tvoj red“ pokazale bi gdje treba čitati
  const markeri = $derived(K.tocke.length >= 3 && (istrazi || rijeseno));
  // formula u SVG-u: indeksi kao tspan s pomakom
  const SUBS = "₀₁₂₃₄₅₆₇₈₉";
  function svgDijelovi(f) {
    const out = [];
    let pom = 0;
    for (const ch of String(f)) {
      const v = SUBS.includes(ch) ? 1 : 0;
      const z = v ? String(SUBS.indexOf(ch)) : ch;
      const zad = out[out.length - 1];
      if (zad && zad.v === v) {
        zad.z += z;
        continue;
      }
      const cilj = v ? 3 : 0;
      out.push({ v, z, dy: cilj - pom });
      pom = cilj;
    }
    return out;
  }
  // formula s operatorima: operator ostaje uz pojam iza sebe, prelama se samo između pojmova
  function pojmovi(t) {
    const r = String(t).split(" ");
    const out = [];
    for (let i = 0; i < r.length; i++) {
      if (/^[=·:−+]$/.test(r[i]) && i + 1 < r.length) {
        out.push(`${r[i]} ${r[i + 1]}`);
        i++;
      } else out.push(r[i]);
    }
    return out;
  }

  // ── istraživanje ──
  const mVode = untrack(() => {
    const o = otopinaOf(s);
    return o.m_vode ?? 100;
  });
  const masaZaV = (v) => (K.iskaz === "w" ? (v * mVode) / (1 - v) : (v * mVode) / 100);
  const korakMase = $derived.by(() => {
    const r = masaZaV(K.os.y[1]) - masaZaV(Math.max(0, K.os.y[0]));
    return r > 200 ? 5 : r > 60 ? 1 : r > 20 ? 0.5 : 0.1;
  });
  const zaokruzi = (v, k) => Math.round(v / k) * k;
  const mMin = $derived(zaokruzi(masaZaV(Math.max(0, K.os.y[0])), korakMase) + (K.os.y[0] > 0 ? korakMase : 0));
  const mGornja = $derived(Math.floor(masaZaV(Math.min(K.iskaz === "w" ? 0.95 : Infinity, K.os.y[1])) / korakMase) * korakMase);
  function pocetnoStanje(k, prvi) {
    const [ta, tb] = rasponT(k);
    const t0 = prvi && Number.isFinite(s.t) ? s.t : Math.round((ta + tb) / 2 / 5) * 5;
    const vT = naKrivulji(k, t0);
    const m0 = prvi && Number.isFinite(otopinaOf(s).m_sol) ? otopinaOf(s).m_sol : zaokruzi(masaZa(k, vT, mVode) * 0.7, 1);
    return { t: t0, m: m0 };
  }
  const p0 = istrazi ? untrack(() => pocetnoStanje(K, true)) : { t: 0, m: 0 };
  let tI = $state(p0.t);
  let mI = $state(p0.m);
  let mirno = $state(false);
  function odaberi(i) {
    odabrana = i;
    const p = pocetnoStanje(krivuljaOf({ tvar: izbor[i].tvar }), false);
    tI = p.t;
    mI = p.m;
    mirno = false;
  }
  const istr = $derived.by(() => {
    if (!istrazi) return null;
    const top = naKrivulji(K, tI);
    const mMax = masaZa(K, top, mVode);
    const sastav = izSastava(K, mI, mVode);
    const vr = vrstaZa((100 * mI) / mVode, uS(K, top));
    const visak = vr === "prezasicena";
    const otopljeno = visak && !mirno ? mMax : mI;
    const kristali = Math.max(0, mI - otopljeno);
    return { top, mMax, sastav, vr, visak, otopljeno, kristali, jos: Math.max(0, mMax - mI) };
  });
  // povlačenje točke po grafu
  let vuce = false;
  function izPokazivaca(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * GW;
    const y = ((e.clientY - r.top) / r.height) * GH;
    const [ta, tb] = rasponT(K);
    const t = K.os.x[0] + ((x - GL) / (GW - GL - GR)) * (K.os.x[1] - K.os.x[0]);
    const v = K.os.y[1] - ((y - GT) / (GH - GT - GB)) * (K.os.y[1] - K.os.y[0]);
    tI = Math.max(ta, Math.min(tb, Math.round(t)));
    mI = Math.max(mMin, Math.min(mGornja, zaokruzi(masaZaV(yUnutra(v)), korakMase)));
  }
  function dolje(e) {
    if (!istrazi) return;
    vuce = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    izPokazivaca(e);
  }
  const pomak = (e) => vuce && izPokazivaca(e);
  const gore = () => (vuce = false);

  // ── očitavanje ──
  const ocitanja = nacin === "ocitaj" ? untrack(() => ocitanjaOf(s, K)) : [];
  let unosiO = $state(ocitanja.map(() => ""));

  // ── vrsta ──
  const V = nacin === "vrsta" ? untrack(() => vrstaModel(s)) : null;
  let vrsta = $state(null);
  let jos = $state("");

  // ── istaloži ──
  const M = nacin === "istalozi" || nacin === "vrsta" ? untrack(() => modelOf(s)) : null;
  const koraci = nacin === "istalozi" ? trazeniOf(s) : [];
  let unosi = $state(koraci.map(() => ""));
  const operacije = $derived(s.operacije === true || rijeseno);
  const bezGrafa = untrack(() => jednaTocka(K));

  // ── pokus ──
  const redovi = nacin === "pokus" ? untrack(() => mjerenjaOf(s, K)) : [];
  let unosiP = $state(redovi.map(() => ""));

  let proces = $state(null);

  // „Pokaži odgovor“: točne vrijednosti u polja
  const zapisKoraka = (id, v) => (["top1", "top2", "sastav"].includes(id) ? zapisV(v) : id === "t_kristali" ? zapisT(v) : zapisMase(v));
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "ocitaj") unosiO = ocitanja.map((r) => (r.pita === "vrijednost" ? zapisV(r.tocno) : zapisT(r.tocno)));
      if (nacin === "vrsta") {
        vrsta = V.vrsta;
        if (s.jos) jos = zapisMase(V.k.jos);
      }
      if (nacin === "istalozi") unosi = koraci.map((id) => zapisKoraka(id, M.k[id]));
      if (nacin === "pokus") unosiP = redovi.map((r) => (Math.round(r.w * 1000) / 1000).toFixed(3).replace(".", ","));
      if (s.proces) proces = procesOf(K);
    });
  });

  const procesGotov = $derived(!s.proces || !!proces);
  const potpun = $derived.by(() => {
    if (nacin === "ocitaj") return unosiO.every((v) => String(v).trim()) && procesGotov;
    if (nacin === "vrsta") return !!vrsta && (!s.jos || String(jos).trim()) && procesGotov;
    if (nacin === "istalozi") return unosi.every((v) => String(v).trim()) && procesGotov;
    if (nacin === "pokus") return unosiP.every((v) => String(v).trim());
    return false;
  });
  function predaj(e) {
    e.preventDefault();
    if (!aktivno || !potpun) return;
    const pr = s.proces ? { proces } : {};
    if (nacin === "ocitaj") onodgovor({ unosi: $state.snapshot(unosiO), ...pr });
    if (nacin === "vrsta") onodgovor({ vrsta, ...(s.jos ? { jos } : {}), ...pr });
    if (nacin === "istalozi") onodgovor({ unosi: $state.snapshot(unosi), ...pr });
    if (nacin === "pokus") onodgovor({ unosi: $state.snapshot(unosiP) });
  }
  const pracesPraznina = nacin === "ocitaj" ? ocitanja.length : nacin === "vrsta" ? (s.jos ? 2 : 1) : koraci.length;

  // ── što se ucrta na graf ──
  // točke {t, v, klasa, oznaka?}, vodiči do osi {t, v}, crte {t1, v1, t2, v2, klasa}
  const crtez = $derived.by(() => {
    const tocke = [];
    const vodici = [];
    const crte = [];
    if (istrazi && istr) {
      const vOs = yUnutra(istr.sastav);
      if (istr.kristali > 1e-9) {
        crte.push({ t1: tI, v1: vOs, t2: tI, v2: istr.top, klasa: "visak" });
        tocke.push({ t: tI, v: istr.top, klasa: "otopina" });
        tocke.push({ t: tI, v: vOs, klasa: "ukupno" });
      } else tocke.push({ t: tI, v: vOs, klasa: istr.vr === "prezasicena" ? "prez" : "otopina", vuci: true });
      if (istr.kristali > 1e-9) tocke[tocke.length - 1].vuci = true;
      vodici.push({ t: tI, v: istr.top });
    }
    if (nacin === "ocitaj" && rijeseno)
      for (const r of ocitanja) {
        const t = r.pita === "vrijednost" ? r.t : r.tocno;
        const v = r.pita === "vrijednost" ? r.tocno : r.v;
        tocke.push({ t, v, klasa: "ok" });
        vodici.push({ t, v });
      }
    if (nacin === "vrsta" && rijeseno && V) {
      const v = yUnutra(V.k.sastav);
      tocke.push({ t: V.t1, v, klasa: "otopina" });
      vodici.push({ t: V.t1, v: V.k.top1 });
      if (Math.abs(v - V.k.top1) > 1e-9) crte.push({ t1: V.t1, v1: v, t2: V.t1, v2: V.k.top1, klasa: "razlika" });
    }
    if (nacin === "istalozi" && rijeseno && M && !bezGrafa) {
      const { k, t1, t2 } = M;
      const sast = k.sastav;
      const tk = Number.isFinite(k.t_kristali) ? k.t_kristali : t1;
      tocke.push({ t: t1, v: yUnutra(sast), klasa: "otopina" });
      if (Number.isFinite(t2)) {
        crte.push({ t1, v1: sast, t2: tk, v2: sast, klasa: "put" });
        const pts = K.tocke.filter(([t]) => t < tk && t > t2);
        let pret = [tk, sast];
        for (const [t, v] of [...pts.reverse(), [t2, k.top2]]) {
          crte.push({ t1: pret[0], v1: pret[1], t2: t, v2: v, klasa: "put" });
          pret = [t, v];
        }
        tocke.push({ t: t2, v: k.top2, klasa: "ok" });
        vodici.push({ t: t2, v: k.top2 });
      } else if (koraci.includes("t_kristali")) {
        crte.push({ t1, v1: sast, t2: tk, v2: sast, klasa: "put" });
        tocke.push({ t: tk, v: sast, klasa: "ok" });
        vodici.push({ t: tk, v: sast });
      } else vodici.push({ t: t1, v: k.top1 });
    }
    if (nacin === "pokus" && rijeseno) for (const r of redovi) tocke.push({ t: r.t, v: r.w, klasa: "mjerenje" });
    return { tocke, vodici, crte };
  });
  const grafVidi = $derived(!bezGrafa && (nacin !== "pokus" || rijeseno));

  // ── epruveta ──
  const EP = { x: 30, y: 16, w: 40, h: 150 };
  const razinaVode = $derived(istrazi ? 70 : 60);
  // visina kristala: do trećine tekućine
  const kristaliVis = (m, ref) => (m > 1e-9 ? Math.max(5, Math.min(1, m / Math.max(ref, 1e-9)) * 46) : 0);
  const ep = $derived.by(() => {
    if (istrazi && istr) return { kristali: istr.kristali, ref: Math.max(1, mGornja - masaZa(K, naKrivulji(K, rasponT(K)[0]), mVode)), prez: istr.vr === "prezasicena" && mirno };
    if (nacin === "istalozi" && rijeseno && M && Number.isFinite(M.t2)) return { kristali: M.k.m_istalozeno, ref: M.k.m_sol, prez: false };
    return null;
  });
  // zrnca kristala (stalan raspored)
  const zrnca = Array.from({ length: 16 }, (_, i) => ({ x: 4 + ((i * 7) % 30), y: (i * 11) % 9, r: 1.6 + ((i * 5) % 3) * 0.5 }));

  // ── zadani podaci ──
  const o = untrack(() => otopinaOf(s));
  const zadano = $derived.by(() => {
    if (!M || M.greska) return [];
    const X = K.tvar;
    const out = [];
    if (nacin === "vrsta") out.push(`t = ${zapisT(M.t1)} °C`);
    if (nacin === "istalozi") {
      out.push(`t₁ = ${zapisT(M.t1)} °C`);
      if (Number.isFinite(M.t2)) out.push(`t₂ = ${zapisT(M.t2)} °C`);
    }
    if (Number.isFinite(o.m_sol)) out.push(`m(${X}) = ${zapisZadanog(o, "m_sol")} g`);
    if (Number.isFinite(o.m_vode)) out.push(`m(H₂O) = ${zapisZadanog(o, "m_vode")} g`);
    if (Number.isFinite(o.m_otopine)) out.push(`m(otopine) = ${zapisZadanog(o, "m_otopine")} g`);
    if (Number.isFinite(o.w)) out.push(`w(${X}) = ${o.zapis.w ?? zapisVrijednosti(K, o.w, postotak) + (postotak ? " %" : "")}`);
    if (Number.isFinite(o.S)) out.push(`${zapisZadanog(o, "S")} g ${X} u 100 g vode`);
    if (o.zasicena) out.push(`zasićena pri ${zapisT(M.t1)} °C`);
    return out;
  });
  const podatak = $derived(bezGrafa ? `pri ${zapisT(K.tocke[0][0])} °C` : "");
</script>

{#snippet oz(t)}{#each String(t).split(/(w_sat|m_max)/) as d, i (i)}{#if d === "w_sat"}w<sub>sat</sub>{:else if d === "m_max"}m<sub>max</sub>{:else if d}<Formula f={d} />{/if}{/each}{/snippet}

{#snippet formula(t)}{#each pojmovi(t) as p, i (i)}{i ? " " : ""}<span class="tp-poj">{@render oz(p)}</span>{/each}{/snippet}

{#snippet osY()}
  {#if K.iskaz === "w"}w<sub>sat</sub>(<Formula f={K.tvar} />){#if postotak}&nbsp;/&nbsp;%{/if}{:else}m(<Formula f={K.tvar} /> u 100 g <Formula f="H₂O" />) / g{/if}
{/snippet}

{#snippet graf()}
  {@const svakiX = xs.length > 9 ? 2 : 1}
  {@const svakiY = ys.length > 11 ? 2 : 1}
  {@const kraj = K.tocke[K.tocke.length - 1]}
  <figure class="tp-graf">
    <div class="tp-osy">{@render osY()}</div>
    <svg
      viewBox="0 0 {GW} {GH}"
      role="img"
      aria-label="Krivulja topljivosti {K.tvar}{istrazi && istr ? `; t = ${zapisT(tI)} °C, ${zapisMase(mI)} g soli u ${zapisMase(mVode)} g vode` : ''}"
      class:vuci={istrazi}
      onpointerdown={dolje}
      onpointermove={pomak}
      onpointerup={gore}
      onpointercancel={gore}
    >
      <defs><clipPath id="tp-{uid}-k"><rect x={GL} y={GT - 2} width={GW - GL - GR + 2} height={GH - GT - GB + 2} /></clipPath></defs>
      {#each xs as x, i (i)}
        <line class="tp-mreza" x1={sx(x)} y1={GT} x2={sx(x)} y2={GH - GB} />
        {#if i % svakiX === 0}<text class="tp-tick" x={sx(x)} y={GH - GB + 14} text-anchor="middle">{formatNumber(x)}</text>{/if}
      {/each}
      {#each ys as y, i (i)}
        <line class="tp-mreza" x1={GL} y1={sy(y)} x2={GW - GR} y2={sy(y)} />
        {#if i % svakiY === 0}<text class="tp-tick" x={GL - 5} y={sy(y) + 3.5} text-anchor="end">{tickY(y)}</text>{/if}
      {/each}
      <line class="tp-os" x1={GL} y1={GT - 4} x2={GL} y2={GH - GB} />
      <line class="tp-os" x1={GL} y1={GH - GB} x2={GW - GR + 4} y2={GH - GB} />
      {#each crtez.vodici as d, i (i)}
        <polyline class="tp-vodic" points="{sx(d.t)},{GH - GB} {sx(d.t)},{sy(yUnutra(d.v))} {GL},{sy(yUnutra(d.v))}" />
      {/each}
      <g clip-path="url(#tp-{uid}-k)">
        <polyline class="tp-krivulja" points={tockeKrivulje} />
        {#if markeri}{#each K.tocke as [t, v], i (i)}<circle class="tp-marker" cx={sx(t)} cy={sy(v)} r="3" />{/each}{/if}
        {#each crtez.crte as c, i (i)}
          <line class="tp-crta {c.klasa}" x1={sx(c.t1)} y1={sy(yUnutra(c.v1))} x2={sx(c.t2)} y2={sy(yUnutra(c.v2))} />
        {/each}
      </g>
      {#each crtez.tocke as p, i (i)}
        <circle class="tp-tocka {p.klasa}" class:vuci={p.vuci} cx={sx(p.t)} cy={sy(yUnutra(p.v))} r={p.vuci ? 6 : 4.5} />
      {/each}
      <text class="tp-ime" x={sx(kraj[0]) + 5} y={sy(kraj[1]) + 4}>{#each svgDijelovi(K.tvar) as d, k (k)}<tspan dy={d.dy || null} font-size={d.v ? "0.72em" : null}>{d.z}</tspan>{/each}</text>
    </svg>
    <figcaption class="tp-osx">t / °C</figcaption>
  </figure>
{/snippet}

{#snippet epruveta()}
  {#if ep}
    {@const dno = EP.y + EP.h}
    {@const vrh = EP.y + EP.h - razinaVode * 1.4}
    {@const hk = kristaliVis(ep.kristali, ep.ref)}
    <figure class="tp-ep">
      <svg viewBox="0 0 100 {EP.y + EP.h + 22}" role="img" aria-label={ep.kristali > 1e-9 ? `Epruveta: na dnu je ${zapisMase(ep.kristali)} g kristala` : ep.prez ? "Epruveta: bistra prezasićena otopina" : "Epruveta: bistra otopina, sve je otopljeno"}>
        <defs><clipPath id="tp-{uid}-ep"><path d="M{EP.x} {EP.y} V{dno - 20} a20 20 0 0 0 {EP.w} 0 V{EP.y} Z" /></clipPath></defs>
        <g clip-path="url(#tp-{uid}-ep)">
          <rect class="tp-tekucina" class:prez={ep.prez} x={EP.x - 2} y={vrh} width={EP.w + 4} height={dno - vrh + 4} />
          {#if hk > 0}
            <g class="tp-kristali" style="transform: translateY({46 - hk}px)">
              <path class="tp-hrpa" d="M{EP.x - 2} {dno - 46 + 2} Q{EP.x + EP.w / 2} {dno - 46 - 8} {EP.x + EP.w + 2} {dno - 46 + 2} V{dno + 50} H{EP.x - 2} Z" />
              {#each zrnca as z, i (i)}<rect class="tp-zrno" x={EP.x + z.x} y={dno - 44 + z.y} width={z.r * 2} height={z.r * 2} transform="rotate(45 {EP.x + z.x + z.r} {dno - 44 + z.y + z.r})" />{/each}
            </g>
          {/if}
        </g>
        <line class="tp-povrsina" x1={EP.x} y1={vrh} x2={EP.x + EP.w} y2={vrh} />
        <path class="tp-staklo" d="M{EP.x - 4} {EP.y - 4} H{EP.x} V{dno - 20} a20 20 0 0 0 {EP.w} 0 V{EP.y - 4} H{EP.x + EP.w + 4}" />
      </svg>
    </figure>
  {/if}
{/snippet}

{#snippet procesBlok()}
  {#if s.proces}
    <div class="tp-proces" class:bad={badK(pracesPraznina)}>
      <span class="tp-ime">Otapanje soli je</span>
      <div class="tp-seg tp-seg2" role="radiogroup" aria-label="Je li otapanje endotermno ili egzotermno">
        {#each PROCESI as p (p)}
          <button type="button" role="radio" aria-checked={proces === p} class:sel={proces === p} disabled={!aktivno} onclick={() => (proces = p)}>{p}</button>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}

{#if istrazi}
  <div class="tp-tekst"><Md text={s.tekst} /></div>
  <p class="tp-hint">Ovo nije zadatak, samo istražuješ.</p>
{:else}
  <div class="lx-question"><Md text={s.tekst} /></div>
{/if}

<div class="tp">
  {#if istrazi && istr}
    {#if izbor && izbor.length > 1}
      <div class="tp-chips" role="radiogroup" aria-label="Sol">
        {#each izbor as k, i (k.tvar)}
          <button type="button" role="radio" aria-checked={odabrana === i} class="tp-chip" class:sel={odabrana === i} onclick={() => odaberi(i)}><Formula f={k.tvar} /></button>
        {/each}
      </div>
    {/if}
    <div class="tp-stol">
      {@render graf()}
      <div class="tp-panel">
        <label class="tp-kl">
          <span class="tp-kl-n">t = <b>{zapisT(tI)} °C</b></span>
          <input type="range" min={rasponT(K)[0]} max={rasponT(K)[1]} step="1" value={tI} oninput={(e) => (tI = Number(e.currentTarget.value))} aria-label="Temperatura u °C" />
        </label>
        <label class="tp-kl">
          <span class="tp-kl-n">m(<Formula f={K.tvar} />) = <b>{zapisMase(mI)} g</b> u <span class="tp-nw">{zapisMase(mVode)} g</span> vode</span>
          <input type="range" min={mMin} max={mGornja} step={korakMase} value={mI} oninput={(e) => (mI = Number(e.currentTarget.value))} aria-label="Masa soli u g" />
        </label>
        <div class="tp-ep-red">
          {@render epruveta()}
          <div class="tp-ocit" aria-live="polite">
            <div>Pri {zapisT(tI)} °C: {#if K.iskaz === "w"}w<sub>sat</sub> = <span class="tp-nw">{sJ(zapisV(istr.top), jedV)}</span>{:else}<span class="tp-nw">{zapisV(istr.top)} g</span> u 100 g vode{/if}</div>
            <div>u <span class="tp-nw">{zapisMase(mVode)} g</span> vode stane najviše <b class="tp-nw">{zapisMase(istr.mMax)} g</b></div>
            {#if K.iskaz === "w"}<div>{istr.kristali > 1e-9 ? "otopina iznad kristala" : "otopina"}: w = <span class="tp-nw">{sJ(zapisV(istr.kristali > 1e-9 ? istr.top : istr.sastav), jedV)}</span></div>{/if}
            <div class="tp-vrsta" class:prez={istr.visak && mirno}>
              {#if istr.vr === "nezasicena"}<b>nezasićena</b>: može se otopiti još <span class="tp-nw">{zapisMase(istr.jos)} g</span>
              {:else if istr.vr === "zasicena"}<b>zasićena</b>
              {:else if mirno}<b>prezasićena</b>: <span class="tp-nw">{zapisMase(mI - istr.mMax)} g</span> viška ostaje otopljeno (nestabilno)
              {:else}<b>zasićena</b>, na dnu <span class="tp-nw">{zapisMase(istr.kristali)} g</span> kristala{/if}
            </div>
          </div>
        </div>
        <div class="tp-gumbi">
          <button type="button" class="btn btn-quiet tp-g" class:sel={mirno} aria-pressed={mirno} onclick={() => (mirno = !mirno)}>Mirno hlađenje (bez kristalića)</button>
          {#if mirno && istr.visak}<button type="button" class="btn btn-primary tp-g" onclick={() => (mirno = false)}>Ubaci kristalić</button>{/if}
        </div>
      </div>
    </div>
  {/if}

  {#if !istrazi}
    {#if zadano.length}
      <div class="tp-zadano" aria-label="Zadano">{#each zadano as z, i (i)}<span class="tp-chip-z">{@render oz(z)}</span>{/each}</div>
    {/if}
    {#if bezGrafa}
      <div class="tp-podatak">{podatak}: {#if K.iskaz === "w"}w<sub>sat</sub>(<Formula f={K.tvar} />) = <span class="tp-nw">{sJ(zapisV(K.tocke[0][1]), jedV)}</span>{:else}<span class="tp-nw">{zapisV(K.tocke[0][1])} g</span> <Formula f={K.tvar} /> u 100 g vode{/if}</div>
    {/if}
    <div class="tp-stol" class:sam={!ep}>
      {#if grafVidi}{@render graf()}{/if}
      {#if ep}<div class="tp-panel">{@render epruveta()}<p class="tp-napomena">Na dnu: <span class="tp-nw">{zapisMase(ep.kristali)} g</span> kristala pri {zapisT(M.t2)} °C</p></div>{/if}
    </div>
  {/if}

  {#if nacin === "ocitaj"}
    <form class="tp-unosi" onsubmit={predaj}>
      {#each ocitanja as r, i (i)}
        <div class="tp-kartica" class:ok={okK(i)} class:bad={badK(i)}>
          <label class="tp-glava" for="tp-{uid}-o{i}">
            {#if r.pita === "vrijednost"}
              <span class="tp-sym">{#if K.iskaz === "w"}w<sub>sat</sub>{:else}m soli u 100 g vode{/if}</span><span class="tp-ime">pri {zapisT(r.t)} °C</span>
            {:else}
              <span class="tp-sym">t</span><span class="tp-ime">pri kojoj je {#if K.iskaz === "w"}w<sub>sat</sub> = <span class="tp-nw">{sJ(zapisV(r.v), jedV)}</span>{:else}<span class="tp-nw">{zapisV(r.v)} g</span> u 100 g vode{/if}</span>
            {/if}
          </label>
          <span class="tp-polje">
            <input id="tp-{uid}-o{i}" class="inp tp-inp" class:ok={okK(i)} class:bad={badK(i)} inputmode="decimal" autocomplete="off" placeholder="?" disabled={!aktivno} bind:value={unosiO[i]} />
            <span class="lx-unit">{r.pita === "vrijednost" ? jedV : "°C"}</span>
          </span>
        </div>
      {/each}
      {@render procesBlok()}
      <div class="tp-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
    </form>
  {/if}

  {#if nacin === "vrsta"}
    <form class="tp-unosi" onsubmit={predaj}>
      <div class="tp-kartica" class:ok={okK(0)} class:bad={badK(0)}>
        <span class="tp-ime">Otopina je</span>
        <div class="tp-seg" role="radiogroup" aria-label="Vrsta otopine">
          {#each VRSTE as v (v)}
            <button type="button" role="radio" aria-checked={vrsta === v} class:sel={vrsta === v} disabled={!aktivno} onclick={() => (vrsta = v)}>{VRSTA_IME[v]}</button>
          {/each}
        </div>
      </div>
      {#if s.jos}
        <div class="tp-kartica" class:ok={okK(1)} class:bad={badK(1)}>
          <label class="tp-glava" for="tp-{uid}-jos"><span class="tp-sym">Δm</span><span class="tp-ime">koliko se <Formula f={K.tvar} /> još može otopiti pri {zapisT(V.t1)} °C</span></label>
          <span class="tp-polje">
            <input id="tp-{uid}-jos" class="inp tp-inp" class:ok={okK(1)} class:bad={badK(1)} inputmode="decimal" autocomplete="off" placeholder="?" disabled={!aktivno} bind:value={jos} />
            <span class="lx-unit">g</span>
          </span>
        </div>
      {/if}
      {@render procesBlok()}
      <div class="tp-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
    </form>
  {/if}

  {#if nacin === "istalozi"}
    <form class="tp-lanac" onsubmit={predaj}>
      {#each koraci as id, i (id)}
        {#if i > 0}
          <div class="tp-strelica" aria-label={operacije && formulaKoraka(id, M) ? formulaKoraka(id, M) : "sljedeći korak"}>
            <span aria-hidden="true">↓</span>
            {#if operacije && formulaKoraka(id, M)}<span class="tp-op">{@render formula(formulaKoraka(id, M))}</span>{/if}
          </div>
        {:else if operacije && formulaKoraka(id, M)}
          <div class="tp-strelica"><span class="tp-op">{@render formula(formulaKoraka(id, M))}</span></div>
        {/if}
        <div class="tp-kartica" class:ok={okK(i)} class:bad={badK(i)}>
          <label class="tp-glava" for="tp-{uid}-{i}"><span class="tp-sym">{@render oz(oznakaKoraka(id, M))}</span><span class="tp-ime">{imeKoraka(id, M)}</span></label>
          <span class="tp-polje">
            <input id="tp-{uid}-{i}" class="inp tp-inp" class:ok={okK(i)} class:bad={badK(i)} inputmode="decimal" autocomplete="off" placeholder="?" disabled={!aktivno} bind:value={unosi[i]} />
            <span class="lx-unit">{jedinicaKoraka(id, M, postotak)}</span>
          </span>
        </div>
      {/each}
      {@render procesBlok()}
      <div class="tp-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
    </form>
  {/if}

  {#if nacin === "pokus"}
    <form class="tp-unosi" onsubmit={predaj}>
      <div class="tp-tablica" role="table" aria-label="Tablica 6. Topljivost soli u vodi pri različitim temperaturama">
        <div class="tp-tr tp-th" role="row">
          <span role="columnheader">m(sol) / g</span><span role="columnheader">m(<Formula f="H₂O" />) / g</span><span role="columnheader">t / °C</span><span role="columnheader">w<sub>sat</sub>(sol)</span>
        </div>
        {#each redovi as r, i (i)}
          <div class="tp-tr" class:ok={okK(i)} class:bad={badK(i)} role="row">
            <span role="cell">{r.zapis.m_sol}</span><span role="cell">{r.zapis.m_vode}</span><span role="cell">{r.zapis.t ?? zapisT(r.t)}</span>
            <span role="cell"><input class="inp tp-inp tp-inp-s" class:ok={okK(i)} class:bad={badK(i)} inputmode="decimal" autocomplete="off" placeholder="?" aria-label="w_sat za {i + 1}. mjerenje" disabled={!aktivno} bind:value={unosiP[i]} /></span>
          </div>
        {/each}
      </div>
      <div class="tp-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
    </form>
  {/if}
</div>

{#if tocanTekst}
  <p class="tp-tocno">Točan odgovor: <Md text={tocanTekst} inline /></p>
{/if}

<style>
  .tp {
    display: grid;
    gap: 12px;
    min-width: 0;
    font-family: var(--font-sans);
  }
  .tp-tekst {
    margin-bottom: 6px;
  }
  .tp-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .tp :global(sub) {
    font-size: 0.68em;
    vertical-align: -0.3em;
    line-height: 0;
  }
  .tp-nw,
  .tp-poj {
    white-space: nowrap;
  }

  /* čipovi */
  .tp-chips,
  .tp-zadano {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tp-chip {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
  }
  .tp-chip:hover {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .tp-chip.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .tp-chip-z {
    display: inline-block;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    font-size: 13.5px;
    color: var(--text);
    white-space: nowrap;
  }
  .tp-podatak {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 14.5px;
    color: var(--text);
    justify-self: start;
  }

  /* graf + ploča */
  .tp-stol {
    display: grid;
    gap: 12px;
  }
  @media (min-width: 720px) {
    .tp-stol:not(.sam) {
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      align-items: start;
    }
  }
  .tp-graf {
    margin: 0;
    max-width: 480px;
    width: 100%;
  }
  .tp-graf svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .tp-graf svg.vuci {
    touch-action: none;
    cursor: crosshair;
  }
  .tp-osy {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0 0 -2px 4px;
  }
  .tp-osx {
    margin-top: -2px;
    padding-right: 42px;
    text-align: right;
    font-size: 12px;
    color: var(--text-dim);
  }
  .tp-mreza {
    stroke: var(--border);
    stroke-width: 0.7;
  }
  .tp-os {
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .tp-tick {
    fill: var(--text-faint);
    font: 10px var(--font-sans);
  }
  .tp-vodic {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .tp-krivulja {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2.4;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .tp-marker {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .tp-ime {
    fill: var(--primary);
    font: 600 11.5px var(--font-sans);
  }
  .tp-crta {
    stroke-width: 1.8;
  }
  .tp-crta.visak,
  .tp-crta.razlika {
    stroke: var(--warn);
    stroke-dasharray: 4 3;
  }
  .tp-crta.put {
    stroke: var(--lx-water);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .tp-tocka {
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .tp-tocka.otopina {
    fill: var(--lx-water);
  }
  .tp-tocka.prez {
    fill: var(--warn);
  }
  .tp-tocka.ukupno {
    fill: var(--bg-elev);
    stroke: var(--warn);
    stroke-width: 2.2;
  }
  .tp-tocka.ok {
    fill: var(--lx-ok);
  }
  .tp-tocka.mjerenje {
    fill: var(--text);
  }
  .tp-tocka.vuci {
    cursor: grab;
  }
  .tp-panel {
    display: grid;
    gap: 10px;
    align-content: start;
    min-width: 0;
  }
  .tp-kl {
    display: grid;
    gap: 2px;
  }
  .tp-kl input[type="range"] {
    width: 100%;
    height: 36px;
    margin: 0;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .tp-kl-n {
    font-size: 13px;
    color: var(--text-dim);
  }
  .tp-kl-n b {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .tp-ep-red {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }
  .tp-ocit {
    display: grid;
    gap: 4px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 13.5px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    min-width: 0;
  }
  .tp-vrsta {
    margin-top: 2px;
    color: var(--text-dim);
  }
  .tp-vrsta b {
    color: var(--text);
  }
  .tp-vrsta.prez b {
    color: var(--warn);
  }
  .tp-gumbi {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .tp-g {
    min-height: 40px;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    font-size: 13.5px;
  }
  .tp-g.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .tp-g.btn-primary {
    border-color: transparent;
    background: var(--primary);
  }

  /* epruveta */
  .tp-ep {
    margin: 0;
    width: 76px;
  }
  .tp-ep svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .tp-panel > .tp-ep {
    justify-self: center;
    width: 90px;
  }
  .tp-tekucina {
    fill: color-mix(in srgb, var(--lx-water) 22%, transparent);
  }
  .tp-tekucina.prez {
    fill: color-mix(in srgb, var(--warn) 16%, color-mix(in srgb, var(--lx-water) 18%, transparent));
  }
  .tp-povrsina {
    stroke: color-mix(in srgb, var(--lx-water) 70%, transparent);
    stroke-width: 1.2;
  }
  .tp-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  /* kristali soli su bijeli (kemijski podatak), s obrubom da se vide i na svijetloj temi */
  .tp-kristali {
    transition: transform 0.35s ease-out;
  }
  .tp-hrpa {
    fill: #f1f5f9;
    stroke: var(--text-faint);
    stroke-width: 0.8;
  }
  .tp-zrno {
    fill: #ffffff;
    stroke: var(--text-faint);
    stroke-width: 0.6;
  }
  .tp-napomena {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-dim);
    text-align: center;
  }

  /* unosi */
  .tp-unosi,
  .tp-lanac {
    display: grid;
    gap: 8px;
    max-width: 420px;
  }
  .tp-lanac {
    gap: 4px;
  }
  .tp-kartica,
  .tp-proces {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .tp-kartica.ok {
    border-color: var(--lx-ok);
  }
  :is(.tp-kartica, .tp-proces).bad {
    border-color: var(--lx-bad);
  }
  .tp-glava {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .tp-sym {
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
  }
  .tp-ime {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .tp-polje {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .tp-inp {
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
  .tp-polje .lx-unit {
    white-space: nowrap;
  }
  .tp-strelica {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px 8px;
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
    font-size: 18px;
    line-height: 1.2;
  }
  .tp-op {
    font-size: 13px;
    font-weight: 600;
    color: var(--primary);
  }
  .tp-seg {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .tp-seg2 {
    grid-template-columns: 1fr 1fr;
  }
  .tp-seg button {
    min-height: var(--lx-control);
    padding: 0 4px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font: 500 13.5px var(--font-sans);
    cursor: pointer;
  }
  .tp-seg button.sel {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, var(--bg-elev));
    font-weight: 600;
  }
  .tp-seg button:disabled {
    cursor: default;
  }

  /* tablica pokusa */
  .tp-tablica {
    display: grid;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    overflow: hidden;
    background: var(--bg-elev);
  }
  .tp-tr {
    display: grid;
    grid-template-columns: 1fr 1fr 0.9fr 1.3fr;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-top: 1px solid var(--border);
    font-size: 14.5px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .tp-tr.tp-th {
    border-top: 0;
    font-size: 12px;
    color: var(--text-dim);
  }
  .tp-tr.ok {
    background: color-mix(in srgb, var(--lx-ok) 8%, transparent);
  }
  .tp-tr.bad {
    background: color-mix(in srgb, var(--lx-bad) 8%, transparent);
  }
  .tp-inp-s {
    max-width: 100px;
  }

  .tp-akcija {
    margin-top: 6px;
  }
  .tp-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .tp-tocno {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }

  @media (prefers-reduced-motion: reduce) {
    .tp-kristali {
      transition: none;
    }
  }
</style>
