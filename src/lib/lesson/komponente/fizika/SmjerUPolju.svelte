<script>
  // smjer_u_polju: scena (naboj, vodič, polje vodiča, dva vodiča, petlja, zavojnica, magnet, Lenz) i ploča smjerova.
  // Točan smjer i sve što se crta računa katalog (smjer_u_polju.js / _magnetizam.js), pa crtež i provjera uvijek
  // kažu isto. U istraživanju učenik mijenja zadane veličine i gleda rezultat uživo.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Strelica from "./_MagnetizamStrelica.svelte";
  import Okomito from "./_MagnetizamOkomito.svelte";
  import Polje from "./_MagnetizamPolje.svelte";
  import Smjerovi from "./_MagnetizamSmjerovi.svelte";
  import { Sat, svgTocka, smanjenoGibanje } from "./_magnetizam.svelte.js";
  import "./_magnetizam.css";
  import {
    smjer_u_polju,
    pitanjaOf,
    traziOf,
    vrstaOdgovora,
    nudiNulu,
    nudiNema,
    natpis,
    rjesenje,
    MIJENJA,
    vodiciDva,
  } from "$lib/lesson/katalog/fizika/smjer_u_polju.js";
  import {
    RIJEC,
    ZNAK,
    suprotan,
    poljeVodica,
    poljeVodica_zbroj,
    potencijalVodica,
    poljeMagneta,
    tokMagneta,
    izolinije,
    lenzMagnet,
    lenzPetlja,
    len,
    smjerIz,
    iznosB,
    MU0,
  } from "$lib/lesson/katalog/fizika/_magnetizam.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const W = 360;
  const H = 240;
  const C = [180, 120];
  const D = { gore: [0, -1], dolje: [0, 1], lijevo: [-1, 0], desno: [1, 0] };
  const uRavnini = (s) => s in D;
  const okomit = (s) => s === "iz_papira" || s === "u_papir";
  const r1 = (n) => Math.round(n * 10) / 10;

  let istrazi = $derived(spec.nacin === "istrazi");
  let pitanja = $derived(pitanjaOf(spec));

  // ── odaberi ──
  let odabir = $state(untrack(() => pitanjaOf(spec).map(() => null)));
  let poslano = $state(null);
  let rjesenja = $derived(istrazi ? [] : smjer_u_polju.rjesenje(spec));
  let neprom = $derived(
    poslano != null && poslano.every((p, i) => p === odabir[i]),
  );
  let tocno = $derived(pokazi || (!!ishod?.tocno && neprom));
  let kriv = $derived(
    ishod && !ishod.tocno && !ishod.prazno && neprom ? (ishod.kriv ?? -1) : -1,
  );

  $effect(() => {
    if (pokazi) untrack(() => (odabir = [...rjesenja]));
  });

  function provjeri() {
    if (locked) return;
    poslano = [...odabir];
    onodgovor(pitanja.length === 1 ? odabir[0] : [...odabir]);
  }
  // boja nepoznate veličine: odabrano (još neprovjereno), točno, krivo
  const bojaOdg = (i) => (tocno ? "c-ok" : kriv === i ? "c-bad" : "c-sel");
  const statusOdg = (i) => (tocno ? "ok" : kriv === i ? "bad" : "");

  // ── istrazi: zadane veličine koje učenik mijenja ──
  let st = $state(untrack(() => ({ ...(pitanjaOf(spec)[0] ?? {}) })));
  let stVodici = $state(
    untrack(() => (pitanjaOf(spec)[0]?.vodici ?? []).map((w) => ({ ...w }))),
  );
  let sonda = $state(
    untrack(
      () =>
        pitanjaOf(spec)[0]?.sonda ??
        (pitanjaOf(spec)[0]?.scena === "magnet"
          ? [1.8, 0.6]
          : pitanjaOf(spec)[0]?.scena === "zavojnica"
            ? [1.6, 0.8]
            : null),
    ),
  );
  let zv = $state(
    untrack(() => {
      const q = pitanjaOf(spec)[0] ?? {};
      return {
        N: q.N ?? 500,
        I: q.jakost ?? 2,
        l: q.duljina ?? 20,
        r: q.polumjer ?? 3,
      };
    }),
  );
  let mijenja = $derived(
    istrazi ? (pitanja[0]?.mijenja ?? MIJENJA[pitanja[0]?.scena] ?? []) : [],
  );
  let iq = $derived(
    istrazi ? { ...st, vodici: stVodici, trazi: undefined } : null,
  );
  let iRj = $derived(istrazi && iq ? rjesenje(iq) : null);

  // ── animacije: čestica skreće (naboj), struja kruži (Lenz, petlja) ──
  const sat = new Sat();
  let start = $state(0);
  let vrti = $derived(
    tocno || istrazi || pitanjaOf(spec).some((q) => q.scena === "lenz_magnet"),
  );
  $effect(() => {
    if (!vrti) return;
    return sat.pokreni();
  });
  $effect(() => {
    if (tocno) untrack(() => (start = sat.t));
  });
  let pustiOd = $state(-10);
  const napredak = (od, trajanje = 1.6) =>
    smanjenoGibanje() ? 1 : Math.max(0, Math.min(1, (sat.t - od) / trajanje));

  // ── crtanje pomoćno ──
  // putanja čestice: kružni luk iz C u smjeru v, zakreće prema F
  function luk(v, F, p) {
    if (!uRavnini(v)) return null;
    const dv = D[v];
    if (!F || F === "nula")
      return {
        pts: [C, [C[0] + dv[0] * 150 * p, C[1] + dv[1] * 150 * p]],
        kraj: [C[0] + dv[0] * 150 * p, C[1] + dv[1] * 150 * p],
      };
    if (!uRavnini(F)) return null;
    const R = 62;
    const df = D[F];
    const cc = [C[0] + df[0] * R, C[1] + df[1] * R];
    const r0 = [-df[0], -df[1]];
    const s = Math.sign(r0[0] * dv[1] - r0[1] * dv[0]) || 1;
    const pts = [];
    const n = 40;
    for (let k = 0; k <= n; k++) {
      const a = s * (k / n) * p * Math.PI * 1.6;
      pts.push([
        cc[0] + R * (r0[0] * Math.cos(a) - r0[1] * Math.sin(a)),
        cc[1] + R * (r0[0] * Math.sin(a) + r0[1] * Math.cos(a)),
      ]);
    }
    return { pts, kraj: pts.at(-1) };
  }
  const put = (pts) =>
    pts.map((p, k) => `${k ? "L" : "M"}${r1(p[0])},${r1(p[1])}`).join(" ");

  // točkice struje po elipsi (gledano sa strane) ili kružnici; smjer: +1 kazaljka (na ekranu), −1 suprotno
  function tockiceElipsa(cx, cy, rx, ry, smjer, n = 8) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * Math.PI + smjer * sat.t * 1.6;
      out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return out;
  }
  // točkice po kvadratu (stranica a, središte cx, cy), kazaljka na ekranu za smjer = 1
  function tockiceKvadrat(cx, cy, a, smjer, n = 10) {
    const out = [];
    for (let k = 0; k < n; k++) {
      let s = ((((k / n) * 4 + smjer * sat.t * 0.45) % 4) + 4) % 4;
      const h = a / 2;
      if (s < 1) out.push([cx - h + s * a, cy - h]);
      else if (s < 2) out.push([cx + h, cy - h + (s - 1) * a]);
      else if (s < 3) out.push([cx + h - (s - 2) * a, cy + h]);
      else out.push([cx - h, cy + h - (s - 3) * a]);
    }
    return out;
  }
  // zakrivljena strelica kruženja oko (cx, cy): kazaljka ili suprotno (na ekranu)
  function kruznaStrelica(cx, cy, r, smjer) {
    const s = smjer === "kazaljka" ? 1 : -1;
    const a0 = -Math.PI / 2 - s * 0.5;
    const a1 = a0 + s * Math.PI * 1.55;
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const t = [-Math.sin(a1) * s, Math.cos(a1) * s];
    const n = [Math.cos(a1), Math.sin(a1)];
    const v = 8;
    const glava = `${r1(p1[0] + t[0] * v)},${r1(p1[1] + t[1] * v)} ${r1(p1[0] - t[0] * 2 + n[0] * v * 0.75)},${r1(p1[1] - t[1] * 2 + n[1] * v * 0.75)} ${r1(p1[0] - t[0] * 2 - n[0] * v * 0.75)},${r1(p1[1] - t[1] * 2 - n[1] * v * 0.75)}`;
    return {
      d: `M${r1(p0[0])},${r1(p0[1])} A${r},${r} 0 1 ${s > 0 ? 1 : 0} ${r1(p1[0])},${r1(p1[1])}`,
      glava,
    };
  }

  // ── polje vodiča: mjerilo scene ──
  function mjeriloVodica(vodici, tocke) {
    const pts = [...vodici.map((w) => w.polozaj), ...tocke.filter(Boolean)];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const dx = Math.max(...xs) - Math.min(...xs);
    const dy = Math.max(...ys) - Math.min(...ys);
    const s = Math.min(
      dx > 0 ? 220 / dx : Infinity,
      dy > 0 ? 130 / dy : Infinity,
      dx === 0 && dy === 0 ? 6 : Infinity,
    );
    const k = Number.isFinite(s) ? s : 6;
    return {
      k,
      X: (x) => C[0] + (x - cx) * k,
      Y: (y) => C[1] - (y - cy) * k,
      iz: (px, py) => [cx + (px - C[0]) / k, cy - (py - C[1]) / k],
    };
  }
  const metara = (q) =>
    ({ cm: 0.01, mm: 0.001, m: 1 })[q.jedinica_duljine ?? "cm"];

  // silnice vodiča okomitih na papir (izolinije potencijala) sa strelicama
  function silniceVodica(vodici, M) {
    const perp = vodici.filter((w) => okomit(w.I));
    if (!perp.length) return [];
    const f = potencijalVodica(perp);
    const [ax, ay] = M.iz(0, 0);
    const [bx, by] = M.iz(W, H);
    const razine = [];
    for (const w of perp)
      for (const px of [22, 46, 76, 112])
        razine.push(f(w.polozaj[0] + px / M.k, w.polozaj[1] + 0.0001));
    const sve = izolinije(f, [ax, bx], [by, ay], razine, 90, 60);
    return sve.map((seg) =>
      seg.map(([x1, y1, x2, y2], k) => {
        const s = {
          x1: M.X(x1),
          y1: M.Y(y1),
          x2: M.X(x2),
          y2: M.Y(y2),
          strelica: null,
        };
        if (k % 23 === 7) {
          const B = poljeVodica_zbroj(perp, [(x1 + x2) / 2, (y1 + y2) / 2], 1);
          if (B && len(B) > 0) s.strelica = [B[0] / len(B), -B[1] / len(B)];
        }
        return s;
      }),
    );
  }

  // magnet i zavojnica: silnice kao izolinije funkcije toka, izvan tijela
  const RAZINE_MAG = [-0.12, -0.35, -0.62, -0.9, -1.18, -1.45, -1.7, -1.9];
  function silniceMagneta(N, M, unutra) {
    const f = (x, y) => tokMagneta([x, y], N);
    const [ax, ay] = M.iz(0, 0);
    const [bx, by] = M.iz(W, H);
    return izolinije(f, [ax, bx], [by, ay], RAZINE_MAG, 96, 64).map((seg) =>
      seg
        .filter(([x1, y1, x2, y2]) => !unutra([(x1 + x2) / 2, (y1 + y2) / 2]))
        .map(([x1, y1, x2, y2], k) => {
          const s = {
            x1: M.X(x1),
            y1: M.Y(y1),
            x2: M.X(x2),
            y2: M.Y(y2),
            strelica: null,
          };
          if (k % 19 === 9) {
            const B = poljeMagneta([(x1 + x2) / 2, (y1 + y2) / 2], N);
            if (B && len(B) > 0) s.strelica = [B[0] / len(B), -B[1] / len(B)];
          }
          return s;
        }),
    );
  }
  const glavica = (s, v = 5) => {
    const mx = (s.x1 + s.x2) / 2;
    const my = (s.y1 + s.y2) / 2;
    const [ux, uy] = s.strelica;
    return `${r1(mx + ux * v)},${r1(my + uy * v)} ${r1(mx - ux * v - uy * v * 0.8)},${r1(my - uy * v + ux * v * 0.8)} ${r1(mx - ux * v + uy * v * 0.8)},${r1(my - uy * v - ux * v * 0.8)}`;
  };

  const MAG = {
    k: 60,
    X: (x) => C[0] + x * 60,
    Y: (y) => C[1] - y * 60,
    iz: (px, py) => [(px - C[0]) / 60, -(py - C[1]) / 60],
  };
  // zavojnica u istraživanju: duljina i polumjer na crtežu prate klizače
  let zavPx = $derived({ pol: 60 + (zv.l - 5) * 2.4, r: 22 + (zv.r - 1) * 9 });
  let ZAV = $derived({
    k: zavPx.pol,
    X: (x) => C[0] + x * zavPx.pol,
    Y: (y) => C[1] - y * zavPx.pol,
    iz: (px, py) => [(px - C[0]) / zavPx.pol, -(py - C[1]) / zavPx.pol],
  });
  const ZAV_ODG = { pol: 105, r: 48 };
  const unutarZav = (geo) => (p) =>
    Math.abs(p[0]) < 1 && Math.abs(p[1]) < geo.r / geo.pol;
  const NPolZav = (struja) => (struja === "gore" ? "lijevo" : "desno");
  function poljeZav(p, struja, geo) {
    const N = NPolZav(struja);
    if (unutarZav(geo)(p)) return N === "lijevo" ? [-1, 0, 0] : [1, 0, 0];
    return poljeMagneta(p, N);
  }

  // ── povlačenje sonde (kompasa) ──
  let svgEl = $state();
  let vucem = $state(false);
  function mjeriloSonde() {
    const q = pitanja[0];
    if (q.scena === "polje_vodica")
      return mjeriloVodica(stVodici, [q.sonda ?? null]);
    if (q.scena === "zavojnica") return ZAV;
    return MAG;
  }
  function pomakniSondu(e) {
    const p = svgTocka(svgEl, e);
    if (!p) return;
    const x = Math.max(14, Math.min(W - 14, p[0]));
    const y = Math.max(14, Math.min(H - 14, p[1]));
    sonda = mjeriloSonde().iz(x, y);
  }
  function dolje(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vucem = true;
    pomakniSondu(e);
  }
  const mice = (e) => vucem && pomakniSondu(e);
  const gore = () => (vucem = false);
  function tipka(e) {
    const M = mjeriloSonde();
    const k = 8 / M.k;
    const d = {
      ArrowUp: [0, k],
      ArrowDown: [0, -k],
      ArrowLeft: [-k, 0],
      ArrowRight: [k, 0],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    sonda = [sonda[0] + d[0], sonda[1] + d[1]];
  }
  function tapPozadina(e) {
    pomakniSondu(e);
  }

  // ── istraživanje: tekst rezultata ──
  const OPIS_POLOZAJ = { iznad: "iznad", ispod: "ispod" };
  const LAB = {
    priblizava: "približava",
    udaljava: "udaljava",
    miruje: "miruje",
    iznad: "iznad",
    ispod: "ispod",
    izvan: "izvan",
    ulazi: "ulazi",
    unutra: "unutra",
    izlazi: "izlazi",
  };
  let iOpis = $derived.by(() => {
    if (!istrazi || !iq) return "";
    const q = iq;
    const r = iRj;
    switch (q.scena) {
      case "naboj":
        return r === "nula"
          ? "v ∥ B → sila je nula"
          : `F = q · v × B → sila gleda ${RIJEC[r]} ${ZNAK[r]}${q.naboj === "-" ? " (negativan naboj: obrnuto od desne ruke)" : ""}`;
      case "vodic_u_polju":
        return r === "nula"
          ? "struja ∥ polje → sila je nula"
          : `F = I · L × B → sila gleda ${RIJEC[r]} ${ZNAK[r]}`;
      case "petlja_struja":
        return `struja ${ZNAK[q.struja]} → polje u sredini ${RIJEC[r]} ${ZNAK[r]}`;
      case "dva_vodica":
        return q.I1 === q.I2
          ? "iste struje → vodiči se privlače"
          : "suprotne struje → vodiči se odbijaju";
      case "lenz_magnet": {
        const L = lenzMagnet(q);
        if (q.gibanje === "miruje")
          return `polje kroz petlju ${ZNAK[L.Bkroz]}, ali se ne mijenja → nema struje`;
        return `1. polje magneta kroz petlju ${ZNAK[L.Bkroz]} · 2. tok ${L.tok} · 3. inducirano polje ${ZNAK[L.inducirano]} → struja ${ZNAK[L.struja]} (odozgo)`;
      }
      case "lenz_petlja": {
        const L = lenzPetlja(q);
        if (!L.inducirano)
          return q.faza === "unutra"
            ? "cijela u polju: tok se ne mijenja → nema struje"
            : "izvan polja: nema toka → nema struje";
        return `tok ${ZNAK[q.B]} ${L.tok} → inducirano polje ${ZNAK[L.inducirano]} → struja ${ZNAK[L.struja]}`;
      }
    }
    return "";
  });

  // polje u sondi (polje_vodica, magnet, zavojnica)
  let sondaPolje = $derived.by(() => {
    if (!istrazi || !sonda) return null;
    const q = pitanja[0];
    if (q.scena === "polje_vodica") {
      const m = metara(q);
      const dop = stVodici.map((w) => poljeVodica(w, sonda, m));
      if (dop.some((b) => !b)) return null;
      return { B: poljeVodica_zbroj(stVodici, sonda, m), dop };
    }
    if (q.scena === "magnet") return { B: poljeMagneta(sonda, st.N) };
    if (q.scena === "zavojnica")
      return { B: poljeZav(sonda, st.struja, zavPx) };
    return null;
  });
  let imaJakost = $derived(
    stVodici.length > 0 && stVodici.every((w) => w.jakost != null),
  );

  function okreniVodic(i) {
    stVodici[i].I = suprotan(stVodici[i].I);
  }

  // ── tekst za čitač zaslona ──
  const opisScene = (q) => {
    const dio = [];
    for (const k of ["v", "I", "B", "F", "I1", "I2", "struja"])
      if (typeof q[k] === "string" && q[k] in RIJEC)
        dio.push(`${k} ${RIJEC[q[k]]}`);
    if (q.scena === "lenz_magnet")
      dio.push(
        `magnet ${OPIS_POLOZAJ[q.polozaj]} petlje, pol ${q.pol} prema petlji, ${q.gibanje === "priblizava" ? "približava se" : q.gibanje === "udaljava" ? "udaljava se" : "miruje"}`,
      );
    if (q.scena === "lenz_petlja") dio.push(`petlja ${q.faza}`);
    return `Scena ${q.scena.replace("_", " ")}: ${dio.join(", ")}`;
  };
</script>

<!-- ───────── strelica ili ⊙/⊗ za veličinu (u ravnini: iz točke p prema van) ───────── -->
{#snippet vektor(
  smjer,
  p,
  boja,
  oznaka,
  duljina = 66,
  okoX = 40,
  okoY = -38,
  pocetak = 18,
)}
  {#if uRavnini(smjer)}
    <Strelica
      x1={p[0] + D[smjer][0] * pocetak}
      y1={p[1] + D[smjer][1] * pocetak}
      x2={p[0] + D[smjer][0] * (pocetak + duljina)}
      y2={p[1] + D[smjer][1] * (pocetak + duljina)}
      {boja}
      {oznaka}
    />
  {:else if okomit(smjer)}
    <Okomito
      x={p[0] + okoX}
      y={p[1] + okoY}
      r={12}
      {smjer}
      {boja}
      {oznaka}
      ispuna
    />
  {:else if smjer === "nula"}
    <g class={boja}
      ><text
        class="mg-txt it"
        x={p[0] + okoX}
        y={p[1] + okoY + 5}
        text-anchor="middle"
        >{oznaka.split("_")[0]}{#if oznaka.includes("_")}<tspan
            class="mg-ind"
            dy="4">{oznaka.split("_")[1]}</tspan
          ><tspan dy="-4"> </tspan>{/if} = 0</text
      ></g
    >
  {:else}
    <g class="c-sel"
      ><text
        class="mg-txt it"
        x={p[0] + okoX}
        y={p[1] + okoY + 5}
        text-anchor="middle"
        >{oznaka.split("_")[0]}{#if oznaka.includes("_")}<tspan
            class="mg-ind"
            dy="4">{oznaka.split("_")[1]}</tspan
          ><tspan dy="-4"> </tspan>{/if} = ?</text
      ></g
    >
  {/if}
{/snippet}

<!-- legenda polja u kutu -->
{#snippet legendaB(smjer, boja = "c-b", x = 12, y = 22)}
  <g class={boja}>
    <rect
      x={x - 6}
      y={y - 16}
      width={okomit(smjer) ? 112 : 92}
      height="24"
      rx="6"
      class="mg-leg"
    />
    <text class="mg-txt it" {x} y={y + 1}>B</text>
    {#if smjer}
      <text class="mg-mali" x={x + 16} {y}
        >{smjer === "nula" ? "= 0" : `${ZNAK[smjer]} ${RIJEC[smjer]}`}</text
      >
    {:else}
      <text class="mg-mali" x={x + 16} {y}>= ?</text>
    {/if}
  </g>
{/snippet}

<!-- ───────── scene ───────── -->
{#snippet naboj(q, odg, kb)}
  {@const t = traziOf(q)}
  {@const B = t === "B" ? odg : q.B}
  {@const v = t === "v" ? odg : q.v}
  {@const F = t === "F" ? odg : q.F}
  {#if B && B !== "nula"}<Polje
      smjer={B}
      boja={t === "B" && !istrazi ? kb : "c-b"}
      oznaka=""
      jako={0.45}
    />{/if}
  {@render legendaB(B, t === "B" && !istrazi ? kb : "c-b")}
  {@const anim = istrazi ? napredak(pustiOd) : tocno ? napredak(start) : 0}
  {@const tr =
    anim > 0 &&
    (istrazi
      ? pustiOd >= 0 && (sat.t - pustiOd < 2.6 || smanjenoGibanje())
      : true)
      ? luk(v, F, anim)
      : null}
  {#if tr}
    <path d={put(tr.pts)} class="mg-stroke c-dim mg-dash" stroke-width="2" />
    <circle cx={tr.kraj[0]} cy={tr.kraj[1]} r="8" class="mg-cestica-duh" />
  {/if}
  {@render vektor(v, C, t === "v" && !istrazi ? kb : "c-v", "v", 66, -42, -40)}
  {@render vektor(F, C, t === "F" && !istrazi ? kb : "c-f", "F", 66, 42, -40)}
  <circle
    cx={C[0]}
    cy={C[1]}
    r="15"
    class="mg-cestica"
    class:neg={q.naboj === "-"}
  />
  <text x={C[0]} y={C[1] + 6} text-anchor="middle" class="mg-predznak"
    >{q.naboj === "-" ? "−" : "+"}</text
  >
  {#if q.ime}<text x={C[0] - 20} y={C[1] + 30} text-anchor="end" class="mg-mali"
      >{q.ime}</text
    >{/if}
{/snippet}

{#snippet vodic(q, odg, kb)}
  {@const t = traziOf(q)}
  {@const B = t === "B" ? odg : q.B}
  {@const I = t === "I" ? odg : q.I}
  {@const F = t === "F" ? odg : q.F}
  {@const bI = t === "I" && !istrazi ? kb : "c-i"}
  {#if B && B !== "nula"}<Polje
      smjer={B}
      boja={t === "B" && !istrazi ? kb : "c-b"}
      oznaka=""
      jako={0.45}
    />{/if}
  {@render legendaB(B, t === "B" && !istrazi ? kb : "c-b")}
  {@const pomak =
    tocno && uRavnini(F)
      ? Math.sin(Math.min(1, napredak(start, 0.9)) * Math.PI) * 10
      : 0}
  <g
    transform="translate({uRavnini(F) ? D[F][0] * pomak : 0} {uRavnini(F)
      ? D[F][1] * pomak
      : 0})"
  >
    {#if uRavnini(I)}
      <line
        x1={C[0] - D[I][0] * 110}
        y1={C[1] - D[I][1] * 110}
        x2={C[0] + D[I][0] * 110}
        y2={C[1] + D[I][1] * 110}
        class="mg-zica"
        stroke-width="7"
        stroke-linecap="round"
      />
      <Strelica
        x1={C[0] - D[I][0] * 100 + D[I][1] * 0}
        y1={C[1] - D[I][1] * 100}
        x2={C[0] - D[I][0] * 40}
        y2={C[1] - D[I][1] * 40}
        boja={bI}
        oznaka="I"
        sirina={3}
        stranaOznake={-1}
      />
    {:else if okomit(I)}
      <circle cx={C[0]} cy={C[1]} r="17" class="mg-zica" stroke-width="5" />
      <Okomito x={C[0]} y={C[1]} r={12} smjer={I} boja={bI} />
      <g class={bI}
        ><text class="mg-txt it" x={C[0] - 34} y={C[1] - 18}>I</text></g
      >
    {:else}
      <circle
        cx={C[0]}
        cy={C[1]}
        r="17"
        class="mg-zica mg-dash"
        stroke-width="3"
      />
      <g class="c-sel"
        ><text class="mg-txt it" x={C[0] - 52} y={C[1] - 22}>I = ?</text></g
      >
    {/if}
  </g>
  {@render vektor(
    F,
    C,
    t === "F" && !istrazi ? kb : "c-f",
    "F",
    62,
    44,
    -40,
    22,
  )}
{/snippet}

{#snippet poljeVodicaScena(q, odg, kb)}
  {@const vod = istrazi ? stVodici : q.vodici}
  {@const T = istrazi ? sonda : q.tocka}
  {@const M = mjeriloVodica(vod, [istrazi ? (q.sonda ?? null) : T])}
  {#if istrazi}
    {#each silniceVodica(vod, M) as razina, k (k)}
      {#each razina as s, j (j)}
        <line
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          class="mg-stroke c-b"
          stroke-width="1.3"
          opacity="0.55"
        />
        {#if s.strelica}<polygon
            points={glavica(s)}
            class="mg-fill c-b"
            opacity="0.75"
          />{/if}
      {/each}
    {/each}
  {:else}
    {#each vod as w, k (k)}
      {#if okomit(w.I) && T}
        <circle
          cx={M.X(w.polozaj[0])}
          cy={M.Y(w.polozaj[1])}
          r={Math.hypot(T[0] - w.polozaj[0], T[1] - w.polozaj[1]) * M.k}
          class="mg-stroke c-b mg-dash"
          stroke-width="1.3"
          opacity="0.45"
        />
      {/if}
    {/each}
  {/if}
  {#each vod as w, k (k)}
    {@const x = M.X(w.polozaj[0])}
    {@const y = M.Y(w.polozaj[1])}
    {#if uRavnini(w.I)}
      <line
        x1={x - D[w.I][0] * 400}
        y1={y - D[w.I][1] * 400}
        x2={x + D[w.I][0] * 400}
        y2={y + D[w.I][1] * 400}
        class="mg-zica"
        stroke-width="6"
      />
      <Strelica
        x1={x - D[w.I][0] * 20 + D[w.I][1] * 12}
        y1={y - D[w.I][1] * 20 - D[w.I][0] * 12}
        x2={x + D[w.I][0] * 20 + D[w.I][1] * 12}
        y2={y + D[w.I][1] * 20 - D[w.I][0] * 12}
        boja="c-i"
        oznaka={vod.length > 1 ? `I_${k + 1}` : "I"}
        sirina={2.5}
      />
    {:else}
      <circle cx={x} cy={y} r="16" class="mg-zica" stroke-width="4" />
      <Okomito {x} {y} r={11} smjer={w.I} boja="c-i" ispuna />
      <g class="c-i"
        ><text class="mg-txt it" x={x - 8} y={y - 24}
          >I{#if vod.length > 1}<tspan class="mg-ind" dy="4">{k + 1}</tspan
            >{/if}</text
        ></g
      >
    {/if}
  {/each}
  {#if istrazi && T && sondaPolje}
    {@const px = M.X(T[0])}
    {@const py = M.Y(T[1])}
    {#if q.prikazi_doprinose && sondaPolje.dop.length > 1}
      {#each sondaPolje.dop as b, k (k)}
        {@const n = len(b)}
        {#if n > 0}
          {@const sk = Math.min(1, n / Math.max(...sondaPolje.dop.map(len)))}
          {@const o = (k ? 1 : -1) * 13}
          <Strelica
            x1={px - (b[1] / n) * o}
            y1={py - (b[0] / n) * o}
            x2={px - (b[1] / n) * o + (b[0] / n) * 50 * sk}
            y2={py - (b[0] / n) * o - (b[1] / n) * 50 * sk}
            boja={k === 0 ? "c-v" : "c-f"}
            oznaka={`B_${k + 1}`}
            sirina={2.2}
            vrh={8}
            stranaOznake={k ? -1 : 1}
          />
        {/if}
      {/each}
    {/if}
    {@const Bn = len(sondaPolje.B)}
    {#if Bn > 1e-12 * Math.max(...sondaPolje.dop.map(len))}
      <Strelica
        x1={px}
        y1={py}
        x2={px + (sondaPolje.B[0] / Bn) * 62}
        y2={py - (sondaPolje.B[1] / Bn) * 62}
        boja="c-b"
        oznaka="B"
        sirina={3.2}
      />
    {/if}
    <circle cx={px} cy={py} r="5" class="mg-tocka" />
    <circle
      cx={px}
      cy={py}
      r="22"
      class="mg-sonda lx-handle"
      class:vuce={vucem}
      role="button"
      tabindex="0"
      aria-label="Sonda za polje: povuci je ili pomiči strelicama"
      onpointerdown={dolje}
      onpointermove={mice}
      onpointerup={gore}
      onpointercancel={gore}
      onkeydown={tipka}
    />
  {:else if T}
    {@const px = M.X(T[0])}
    {@const py = M.Y(T[1])}
    {@render vektor(odg, [px, py], kb, "B", 56, 26, -26, 8)}
    <circle cx={px} cy={py} r="5" class="mg-tocka" />
    <text x={px - 14} y={py + 20} class="mg-txt">T</text>
  {/if}
{/snippet}

{#snippet dvaVodica(q, odg, kb)}
  {@const t = istrazi ? null : traziOf(q)}
  {@const x1 = 110}
  {@const x2 = 250}
  {@const w = vodiciDva(q)}
  {#each [q.I1, q.I2] as I, k (k)}
    {@const x = k ? x2 : x1}
    {#if uRavnini(I)}
      <line x1={x} y1="18" x2={x} y2="222" class="mg-zica" stroke-width="6" />
      <Strelica
        x1={x - 16}
        y1={C[1] - D[I][1] * 40}
        x2={x - 16}
        y2={C[1] + D[I][1] * 40}
        boja="c-i"
        oznaka={`I_${k + 1}`}
        sirina={2.5}
        stranaOznake={D[I][1] < 0 ? -1 : 1}
      />
    {:else}
      <circle cx={x} cy={C[1]} r="16" class="mg-zica" stroke-width="4" />
      <Okomito {x} y={C[1]} r={11} smjer={I} boja="c-i" ispuna />
      <g class="c-i"
        ><text class="mg-txt it" x={x - 10} y={C[1] - 26}
          >I<tspan class="mg-ind" dy="4">{k + 1}</tspan></text
        ></g
      >
    {/if}
    <text {x} y={232} text-anchor="middle" class="mg-mali">vodič {k + 1}</text>
  {/each}
  {#if istrazi}
    {@const B2 = poljeVodica(w[0], w[1].polozaj, 1)}
    {@const B1 = poljeVodica(w[1], w[0].polozaj, 1)}
    {@const B2s = smjerIz(B2, len(B2))}
    {@const B1s = smjerIz(B1, len(B1))}
    {@render vektor(
      B2s,
      [x2, C[1] + (uRavnini(q.I1) ? 50 : 0)],
      "c-b",
      "B_1",
      40,
      28,
      52,
      20,
    )}
    {@render vektor(
      B1s,
      [x1, C[1] + (uRavnini(q.I1) ? 50 : 0)],
      "c-b",
      "B_2",
      40,
      -28,
      52,
      20,
    )}
    {@const F2 = rjesenje({ ...q, trazi: "F2" })}
    {@const F1 = rjesenje({ ...q, trazi: "F1" })}
    {@render vektor(F2, [x2, C[1] - 50], "c-f", "F_2", 50, 0, 0, 10)}
    {@render vektor(F1, [x1, C[1] - 50], "c-f", "F_1", 50, 0, 0, 10)}
  {:else if t === "B2" || t === "B1"}
    {@render vektor(
      odg,
      [t === "B2" ? x2 : x1, C[1] + (uRavnini(q.I1) ? 0 : 0)],
      kb,
      "B",
      50,
      t === "B2" ? 34 : -34,
      uRavnini(q.I1) ? 0 : -40,
      20,
    )}
  {:else}
    {@render vektor(
      odg,
      [t === "F2" ? x2 : x1, uRavnini(q.I1) ? C[1] + 40 : C[1] + 40],
      kb,
      "F",
      50,
      t === "F2" ? 40 : -40,
      44,
      12,
    )}
  {/if}
{/snippet}

{#snippet petlja(q, odg, kb)}
  {@const t = istrazi ? "B" : traziOf(q)}
  {@const struja = t === "struja" ? odg : q.struja}
  {@const B = t === "B" ? (istrazi ? iRj : odg) : q.B}
  <circle cx={C[0]} cy={C[1]} r="74" class="mg-zica" stroke-width="6" />
  {#if struja === "kazaljka" || struja === "suprotno"}
    {@const ks = kruznaStrelica(C[0], C[1], 92, struja)}
    {@const b = t === "struja" && !istrazi ? kb : "c-i"}
    <g class={b}
      ><path d={ks.d} class="mg-stroke" stroke-width="2.6" /><polygon
        points={ks.glava}
        class="mg-fill"
      /><text class="mg-txt it" x={C[0] + 82} y={C[1] - 78}>I</text></g
    >
    {#if tocno || istrazi}
      {#each tockiceElipsa(C[0], C[1], 74, 74, struja === "kazaljka" ? 1 : -1, 10) as p, k (k)}<circle
          cx={p[0]}
          cy={p[1]}
          r="3.2"
          class="mg-tockica"
        />{/each}
    {/if}
  {:else}
    <g class="c-sel"
      ><text class="mg-txt it" x={C[0] + 70} y={C[1] - 80}>I = ?</text></g
    >
  {/if}
  {#if okomit(B)}
    <Okomito
      x={C[0]}
      y={C[1]}
      r={16}
      smjer={B}
      boja={t === "B" && !istrazi ? kb : "c-b"}
      oznaka="B"
      ispuna
    />
  {:else}
    <g class="c-sel"
      ><text class="mg-txt it" x={C[0]} y={C[1] + 6} text-anchor="middle"
        >B = ?</text
      ></g
    >
  {/if}
{/snippet}

{#snippet zavojnica(q, odg, kb)}
  {@const t = istrazi ? "B" : traziOf(q)}
  {@const struja = istrazi ? st.struja : t === "struja" ? odg : q.struja}
  {@const B = istrazi
    ? struja === "gore"
      ? "lijevo"
      : "desno"
    : t === "B"
      ? odg
      : q.B}
  {@const geo = istrazi ? zavPx : ZAV_ODG}
  {@const M = istrazi
    ? ZAV
    : {
        k: geo.pol,
        X: (x) => C[0] + x * geo.pol,
        Y: (y) => C[1] - y * geo.pol,
        iz: (px, py) => [(px - C[0]) / geo.pol, -(py - C[1]) / geo.pol],
      }}
  {@const n = istrazi ? Math.max(5, Math.min(16, Math.round(zv.N / 60))) : 9}
  {@const L = M.X(-1)}
  {@const R = M.X(1)}
  {#if istrazi}
    {#each silniceMagneta(NPolZav(struja), M, unutarZav(geo)) as razina, k (k)}
      {#each razina as s, j (j)}
        <line
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          class="mg-stroke c-b"
          stroke-width="1.2"
          opacity="0.5"
        />
        {#if s.strelica}<polygon
            points={glavica(s)}
            class="mg-fill c-b"
            opacity="0.7"
          />{/if}
      {/each}
    {/each}
    {#each [-0.6, -0.2, 0.2, 0.6] as f (f)}
      <line
        x1={L + 6}
        y1={C[1] + f * geo.r}
        x2={R - 6}
        y2={C[1] + f * geo.r}
        class="mg-stroke c-b"
        stroke-width="1.3"
        opacity="0.6"
      />
    {/each}
  {/if}
  <!-- stražnje polovice zavoja (blijede), pa prednje (u boji struje) -->
  {#each Array.from({ length: n }, (_, k) => L + ((k + 0.5) * (R - L)) / n) as x, k (k)}
    <path
      d="M{r1(x)},{C[1] - geo.r} A7,{geo.r} 0 0 0 {r1(x)},{C[1] + geo.r}"
      class="mg-zica"
      stroke-width="2"
      opacity="0.35"
    />
  {/each}
  {#if uRavnini(B)}
    <Strelica
      x1={C[0] - D[B][0] * 50}
      y1={C[1]}
      x2={C[0] + D[B][0] * 50}
      y2={C[1]}
      boja={t === "B" && !istrazi ? kb : "c-b"}
      oznaka="B"
      sirina={3.4}
      stranaOznake={D[B][0]}
    />
  {:else if okomit(B) || B === "nula"}
    {@render vektor(B, C, kb, "B", 50, 0, 0)}
  {:else}
    <g class="c-sel"
      ><text class="mg-txt it" x={C[0]} y={C[1] + 6} text-anchor="middle"
        >B = ?</text
      ></g
    >
  {/if}
  {#each Array.from({ length: n }, (_, k) => L + ((k + 0.5) * (R - L)) / n) as x, k (k)}
    <path
      d="M{r1(x)},{C[1] - geo.r} A7,{geo.r} 0 0 1 {r1(x)},{C[1] + geo.r}"
      class="mg-zica"
      stroke-width="3.2"
    />
  {/each}
  {@const bS = t === "struja" && !istrazi ? kb : "c-i"}
  {#if uRavnini(struja)}
    {#each [1, Math.floor(n / 2), n - 2] as k (k)}
      {@const x = L + ((k + 0.5) * (R - L)) / n + 7}
      <Strelica
        x1={x}
        y1={C[1] - D[struja][1] * 14}
        x2={x}
        y2={C[1] + D[struja][1] * 14}
        boja={bS}
        sirina={2.4}
        vrh={8}
      />
    {/each}
    <g class={bS}
      ><text class="mg-txt it" x={R + 8} y={C[1] - geo.r + 4}>I</text></g
    >
  {:else if t === "struja"}
    <g class="c-sel"
      ><text class="mg-txt it" x={R + 8} y={C[1] - geo.r + 4}>I = ?</text></g
    >
  {/if}
  <!-- priključci -->
  <path d="M{L},{C[1] + geo.r} v{20}" class="mg-zica" stroke-width="2.5" />
  <path d="M{R},{C[1] + geo.r} v{20}" class="mg-zica" stroke-width="2.5" />
  {#if !istrazi}<text
      x={C[0]}
      y={C[1] + geo.r + 30}
      text-anchor="middle"
      class="mg-mali">strelice na prednjim zavojima: smjer struje</text
    >{/if}
{/snippet}

{#snippet magnetTijelo(N, M, deb = 0.32)}
  {@const os = N === "desno" || N === "lijevo" ? "x" : "y"}
  {@const sN = N === "desno" || N === "gore" ? 1 : -1}
  {#if os === "x"}
    {@const xN = sN > 0 ? M.X(0) : M.X(-1)}
    {@const xS = sN > 0 ? M.X(-1) : M.X(0)}
    <rect
      x={xS}
      y={M.Y(deb)}
      width={M.k}
      height={2 * deb * M.k}
      class="mg-pol-s"
      rx="3"
    />
    <rect
      x={xN}
      y={M.Y(deb)}
      width={M.k}
      height={2 * deb * M.k}
      class="mg-pol-n"
      rx="3"
    />
    <text
      x={sN > 0 ? M.X(0.5) : M.X(-0.5)}
      y={C[1] + 6}
      text-anchor="middle"
      class="mg-pol-txt">N</text
    >
    <text
      x={sN > 0 ? M.X(-0.5) : M.X(0.5)}
      y={C[1] + 6}
      text-anchor="middle"
      class="mg-pol-txt">S</text
    >
  {:else}
    {@const yN = sN > 0 ? M.Y(1) : M.Y(0)}
    {@const yS = sN > 0 ? M.Y(0) : M.Y(1)}
    <rect
      x={M.X(-deb)}
      y={yS}
      width={2 * deb * M.k}
      height={M.k}
      class="mg-pol-s"
      rx="3"
    />
    <rect
      x={M.X(-deb)}
      y={yN}
      width={2 * deb * M.k}
      height={M.k}
      class="mg-pol-n"
      rx="3"
    />
    <text
      x={C[0]}
      y={(sN > 0 ? M.Y(0.5) : M.Y(-0.5)) + 6}
      text-anchor="middle"
      class="mg-pol-txt">N</text
    >
    <text
      x={C[0]}
      y={(sN > 0 ? M.Y(-0.5) : M.Y(0.5)) + 6}
      text-anchor="middle"
      class="mg-pol-txt">S</text
    >
  {/if}
{/snippet}

{#snippet kompas(px, py, smjerVek, boja)}
  <circle cx={px} cy={py} r="20" class="mg-kompas" />
  {#if smjerVek}
    {@const [ux, uy] = smjerVek}
    <g class={boja}>
      <polygon
        points="{px + ux * 16},{py + uy * 16} {px - uy * 5},{py + ux * 5} {px +
          uy * 5},{py - ux * 5}"
        class="mg-fill"
      />
    </g>
    <polygon
      points="{px - ux * 16},{py - uy * 16} {px - uy * 5},{py + ux * 5} {px +
        uy * 5},{py - ux * 5}"
      class="mg-igla-s"
    />
    <circle cx={px} cy={py} r="2.2" class="mg-tocka" />
  {:else}
    <text x={px} y={py + 6} text-anchor="middle" class="mg-txt c-sel mg-upitnik"
      >?</text
    >
  {/if}
{/snippet}

{#snippet magnet(q, odg, kb)}
  {@const N = istrazi ? st.N : q.N}
  {#each silniceMagneta(N, MAG, (p) => Math.abs(p[0]) < 1.02 && Math.abs(p[1]) < 0.34) as razina, k (k)}
    {#each razina as s, j (j)}
      <line
        x1={s.x1}
        y1={s.y1}
        x2={s.x2}
        y2={s.y2}
        class="mg-stroke c-b"
        stroke-width="1.2"
        opacity={istrazi ? 0.5 : 0.28}
      />
      {#if istrazi && s.strelica}<polygon
          points={glavica(s)}
          class="mg-fill c-b"
          opacity="0.7"
        />{/if}
    {/each}
  {/each}
  {@render magnetTijelo(N, MAG)}
  {#if istrazi && sonda}
    {@const B = poljeMagneta(sonda, N)}
    {@const n = B ? len(B) : 0}
    {@const px = MAG.X(sonda[0])}
    {@const py = MAG.Y(sonda[1])}
    {@render kompas(px, py, n ? [B[0] / n, -B[1] / n] : null, "c-n")}
    <circle
      cx={px}
      cy={py}
      r="24"
      class="mg-sonda lx-handle"
      class:vuce={vucem}
      role="button"
      tabindex="0"
      aria-label="Kompas: povuci ga ili pomiči strelicama"
      onpointerdown={dolje}
      onpointermove={mice}
      onpointerup={gore}
      onpointercancel={gore}
      onkeydown={tipka}
    />
  {:else if q.tocka}
    {@const px = MAG.X(q.tocka[0])}
    {@const py = MAG.Y(q.tocka[1])}
    {@render kompas(px, py, uRavnini(odg) ? D[odg] : null, kb)}
    {#if okomit(odg) || odg === "nula"}{@render vektor(
        odg,
        [px, py],
        kb,
        "B",
        40,
        30,
        -26,
      )}{/if}
    <text x={px + 24} y={py + 22} class="mg-txt">T</text>
  {/if}
{/snippet}

{#snippet lenzMagnetScena(q, odg, kb)}
  {@const L = lenzMagnet(q)}
  {@const iznad = q.polozaj === "iznad"}
  {@const cx = 140}
  {@const cy = iznad ? 150 : 90}
  {@const struja = istrazi ? L.struja : odg}
  {@const faza = smanjenoGibanje() ? 0.5 : (sat.t * 0.6) % 1}
  {@const pomak =
    q.gibanje === "miruje"
      ? 15
      : (q.gibanje === "priblizava" ? faza : 1 - faza) * 30}
  {@const myTop = iznad ? 8 + pomak : 158 - pomak}
  <!-- polje magneta kroz petlju -->
  {#each [-44, 0, 44] as dx (dx)}
    {@const y0 = iznad ? myTop + 74 : cy - 54}
    {@const y1 = iznad ? cy + 54 : myTop - 2}
    <line
      x1={cx + dx}
      y1={y0}
      x2={cx + dx}
      y2={y1}
      class="mg-stroke c-b"
      stroke-width="1.6"
      opacity="0.6"
    />
    {@const ys = L.Bkroz === "dolje" ? cy + 38 : cy - 36}
    <polygon
      points="{cx + dx},{ys + (L.Bkroz === 'dolje' ? 7 : -7)} {cx +
        dx -
        5},{ys - (L.Bkroz === 'dolje' ? 3 : -3)} {cx + dx + 5},{ys -
        (L.Bkroz === 'dolje' ? 3 : -3)}"
      class="mg-fill c-b"
      opacity="0.8"
    />
  {/each}
  <g class="c-b"
    ><text
      class="mg-txt it"
      x={cx + 56}
      y={cy + (L.Bkroz === "dolje" ? 46 : -30)}>B</text
    ></g
  >
  <!-- stražnji luk petlje, magnet, prednji luk -->
  <path
    d="M{cx - 82},{cy} A82,22 0 0 1 {cx + 82},{cy}"
    class="mg-zica"
    stroke-width="5"
  />
  {@const sN = (q.pol === "N") === iznad}
  <g>
    <rect
      x={cx - 18}
      y={myTop}
      width="36"
      height="36"
      class={sN ? "mg-pol-s" : "mg-pol-n"}
      rx="3"
    />
    <rect
      x={cx - 18}
      y={myTop + 36}
      width="36"
      height="36"
      class={sN ? "mg-pol-n" : "mg-pol-s"}
      rx="3"
    />
    <text x={cx} y={myTop + 24} text-anchor="middle" class="mg-pol-txt"
      >{sN ? "S" : "N"}</text
    >
    <text x={cx} y={myTop + 60} text-anchor="middle" class="mg-pol-txt"
      >{sN ? "N" : "S"}</text
    >
  </g>
  <path
    d="M{cx - 82},{cy} A82,22 0 0 0 {cx + 82},{cy}"
    class="mg-zica"
    stroke-width="5"
  />
  {#if q.gibanje !== "miruje"}
    {@const dolje = iznad === (q.gibanje === "priblizava")}
    {@const y0 = myTop + 20}
    <Strelica
      x1={cx - 44}
      y1={y0}
      x2={cx - 44}
      y2={y0 + (dolje ? 34 : -34) * (iznad ? 1 : 1)}
      boja="c-dim"
      sirina={2.6}
    />
    <g class="c-dim"
      ><text class="mg-txt it" x={cx - 64} y={y0 + (dolje ? 22 : -12)}>v</text
      ></g
    >
  {/if}
  <!-- inducirana struja: točkice po petlji i pogled odozgo -->
  {#if (struja === "kazaljka" || struja === "suprotno") && (tocno || istrazi)}
    {#each tockiceElipsa(cx, cy, 82, 22, struja === "kazaljka" ? 1 : -1, 10) as p, k (k)}<circle
        cx={p[0]}
        cy={p[1]}
        r="3.4"
        class="mg-tockica"
      />{/each}
    {#if istrazi}<Strelica
        x1={cx + 30}
        y1={cy}
        x2={cx + 30}
        y2={cy + (L.inducirano === "gore" ? -40 : 40)}
        boja="c-ind"
        oznaka="B ind"
        sirina={2.6}
        kurziv={false}
      />{/if}
  {/if}
  <g transform="translate(298 {cy})">
    <circle r="38" class="mg-odozgo" />
    <text y="-46" text-anchor="middle" class="mg-mali">gledano odozgo</text>
    <circle r="22" class="mg-zica" stroke-width="3" />
    {#if struja === "kazaljka" || struja === "suprotno"}
      {@const ks = kruznaStrelica(0, 0, 30, struja)}
      <g class={istrazi ? "c-i" : kb}
        ><path d={ks.d} class="mg-stroke" stroke-width="3" /><polygon
          points={ks.glava}
          class="mg-fill"
        /></g
      >
    {:else if struja === "nema"}
      <g class={istrazi ? "c-i" : kb}
        ><text y="6" text-anchor="middle" class="mg-txt">I = 0</text></g
      >
    {:else}
      <text y="6" text-anchor="middle" class="mg-txt c-sel mg-upitnik">?</text>
    {/if}
  </g>
{/snippet}

{#snippet lenzPetljaScena(q, odg, kb)}
  {@const lijevo = q.v === "lijevo"}
  {@const fx = (x) => (lijevo ? W - x : x)}
  {@const struja = istrazi ? lenzPetlja(q).struja : odg}
  {@const POL = { izvan: 60, ulazi: 130, unutra: 215, izlazi: 300 }}
  {@const lx = fx(POL[q.faza] ?? 60)}
  <rect
    x={lijevo ? W - 300 : 130}
    y="22"
    width="170"
    height="196"
    class="mg-podrucje"
    rx="6"
  />
  <Polje
    smjer={q.B}
    x0={lijevo ? W - 300 : 130}
    y0={22}
    x1={lijevo ? W - 130 : 300}
    y1={218}
    razmak={34}
    oznaka=""
    jako={0.55}
  />
  <g class="c-b"
    ><text class="mg-txt it" x={lijevo ? W - 296 : 136} y="16"
      >B {ZNAK[q.B]}</text
    ></g
  >
  <rect
    x={lx - 40}
    y={C[1] - 40}
    width="80"
    height="80"
    class="mg-zica"
    stroke-width="5"
    fill="none"
    rx="2"
  />
  <Strelica
    x1={lx + (lijevo ? 18 : -18)}
    y1={C[1] - 54}
    x2={lx + (lijevo ? -22 : 22)}
    y2={C[1] - 54}
    boja="c-dim"
    sirina={2.6}
  />
  <g class="c-dim"
    ><text class="mg-txt it" x={lx + (lijevo ? 26 : -32)} y={C[1] - 49}>v</text
    ></g
  >
  {#if struja === "kazaljka" || struja === "suprotno"}
    {@const ks = kruznaStrelica(lx, C[1], 22, struja)}
    <g class={istrazi ? "c-i" : kb}
      ><path d={ks.d} class="mg-stroke" stroke-width="3" /><polygon
        points={ks.glava}
        class="mg-fill"
      /></g
    >
    {#if tocno || istrazi}
      {#each tockiceKvadrat(lx, C[1], 80, struja === "kazaljka" ? 1 : -1) as p, k (k)}<circle
          cx={p[0]}
          cy={p[1]}
          r="3.4"
          class="mg-tockica"
        />{/each}
    {/if}
  {:else if struja === "nema"}
    <g class={istrazi ? "c-i" : kb}
      ><text x={lx} y={C[1] + 6} text-anchor="middle" class="mg-txt">I = 0</text
      ></g
    >
  {:else}
    <text
      x={lx}
      y={C[1] + 7}
      text-anchor="middle"
      class="mg-txt c-sel mg-upitnik">?</text
    >
  {/if}
{/snippet}

{#snippet scena(q, odg, kb)}
  {#if q.scena === "naboj"}{@render naboj(q, odg, kb)}
  {:else if q.scena === "vodic_u_polju"}{@render vodic(q, odg, kb)}
  {:else if q.scena === "polje_vodica"}{@render poljeVodicaScena(q, odg, kb)}
  {:else if q.scena === "dva_vodica"}{@render dvaVodica(q, odg, kb)}
  {:else if q.scena === "petlja_struja"}{@render petlja(q, odg, kb)}
  {:else if q.scena === "zavojnica"}{@render zavojnica(q, odg, kb)}
  {:else if q.scena === "magnet"}{@render magnet(q, odg, kb)}
  {:else if q.scena === "lenz_magnet"}{@render lenzMagnetScena(q, odg, kb)}
  {:else if q.scena === "lenz_petlja"}{@render lenzPetljaScena(q, odg, kb)}
  {/if}
{/snippet}

<!-- izbor smjera za istraživanje -->
{#snippet izborSmjera(ime, kljuc, popis)}
  <div class="mg-red">
    <span class="mg-red-ime">{ime}</span>
    <div class="seg" role="group" aria-label={kljuc}>
      {#each popis as o (o)}
        <button
          type="button"
          class="seg-item"
          class:active={st[kljuc] === o}
          aria-pressed={st[kljuc] === o}
          aria-label={RIJEC[o] ?? LAB[o] ?? o}
          onclick={() => (st[kljuc] = o)}>{ZNAK[o] ?? LAB[o] ?? o}</button
        >
      {/each}
    </div>
  </div>
{/snippet}

<div class="mg">
  {#if istrazi}
    <div class="mg-tekst"><Md text={spec.tekst} /></div>
  {:else}
    <div class="lx-question"><Md text={spec.tekst} /></div>
  {/if}

  {#if istrazi}
    {@const q = iq}
    <figure class="lx-figure">
      <svg
        bind:this={svgEl}
        viewBox="0 0 {W} {H}"
        role="img"
        aria-label={opisScene(q)}
      >
        {#if ["polje_vodica", "magnet", "zavojnica"].includes(q.scena)}
          <rect
            x="0"
            y="0"
            width={W}
            height={H}
            fill="transparent"
            onpointerdown={tapPozadina}
            role="presentation"
          />
        {/if}
        {@render scena(q, iRj, "c-f")}
      </svg>
    </figure>
    {#if iOpis}<p class="mg-ocitanje" aria-live="polite">{iOpis}</p>{/if}
    {#if sondaPolje && q.scena === "polje_vodica" && imaJakost}
      <p class="mg-ocitanje" aria-live="polite">
        B = <b>{iznosB(len(sondaPolje.B))}</b>
        {#if q.prikazi_doprinose && sondaPolje.dop.length > 1}
          ({sondaPolje.dop
            .map((b, k) => `B${"₁₂₃"[k]} = ${iznosB(len(b))}`)
            .join(", ")})
        {/if}
        · udaljenost od vodiča 1: {formatNumber(
          Math.hypot(
            sonda[0] - stVodici[0].polozaj[0],
            sonda[1] - stVodici[0].polozaj[1],
          ),
          1,
        )}
        {q.jedinica_duljine ?? "cm"}
      </p>
    {/if}
    {#if q.scena === "zavojnica" && q.N != null}
      <p class="mg-ocitanje" aria-live="polite">
        B = μ₀·N·I / ℓ = <b>{iznosB((MU0 * zv.N * zv.I) / (zv.l / 100))}</b> ·
        polumjer {formatNumber(zv.r)} cm ne ulazi u formulu
      </p>
    {/if}

    <div class="mg-kontrole">
      {#if q.scena === "naboj"}
        {#if mijenja.includes("naboj")}
          <div class="mg-red">
            <span class="mg-red-ime">naboj</span>
            <div class="seg" role="group" aria-label="predznak naboja">
              {#each ["+", "-"] as z (z)}<button
                  type="button"
                  class="seg-item"
                  class:active={st.naboj === z}
                  aria-pressed={st.naboj === z}
                  onclick={() => (st.naboj = z)}
                  >{z === "+" ? "+ pozitivan" : "− negativan"}</button
                >{/each}
            </div>
          </div>
        {/if}
        {#if mijenja.includes("v")}{@render izborSmjera("brzina v", "v", [
            "gore",
            "dolje",
            "lijevo",
            "desno",
            "iz_papira",
            "u_papir",
          ])}{/if}
        {#if mijenja.includes("B")}{@render izborSmjera("polje B", "B", [
            "gore",
            "dolje",
            "lijevo",
            "desno",
            "iz_papira",
            "u_papir",
          ])}{/if}
        <div class="lx-actions">
          <button
            type="button"
            class="btn btn-ghost"
            onclick={() => (pustiOd = sat.t)}
            disabled={!uRavnini(st.v) || !(uRavnini(iRj) || iRj === "nula")}
            >Pusti česticu</button
          >
        </div>
      {:else if q.scena === "vodic_u_polju"}
        {#if mijenja.includes("I")}{@render izborSmjera("struja I", "I", [
            "gore",
            "dolje",
            "lijevo",
            "desno",
            "iz_papira",
            "u_papir",
          ])}{/if}
        {#if mijenja.includes("B")}{@render izborSmjera("polje B", "B", [
            "gore",
            "dolje",
            "lijevo",
            "desno",
            "iz_papira",
            "u_papir",
          ])}{/if}
      {:else if q.scena === "polje_vodica"}
        {#if mijenja.includes("I")}
          <div class="lx-actions">
            {#each stVodici as w, k (k)}<button
                type="button"
                class="btn btn-ghost"
                onclick={() => okreniVodic(k)}
                >Obrni struju{stVodici.length > 1 ? ` u vodiču ${k + 1}` : ""} ({ZNAK[
                  w.I
                ]})</button
              >{/each}
          </div>
        {/if}
        <p class="mg-hint">
          Povuci kompas (ili dodirni crtež) i gledaj smjer polja.
        </p>
      {:else if q.scena === "dva_vodica"}
        {#if mijenja.includes("I1")}{@render izborSmjera(
            "struja I₁",
            "I1",
            uRavnini(st.I1) ? ["gore", "dolje"] : ["iz_papira", "u_papir"],
          )}{/if}
        {#if mijenja.includes("I2")}{@render izborSmjera(
            "struja I₂",
            "I2",
            uRavnini(st.I2) ? ["gore", "dolje"] : ["iz_papira", "u_papir"],
          )}{/if}
      {:else if q.scena === "petlja_struja"}
        {#if mijenja.includes("struja")}{@render izborSmjera(
            "struja",
            "struja",
            ["kazaljka", "suprotno"],
          )}{/if}
      {:else if q.scena === "zavojnica"}
        {#if mijenja.includes("struja")}{@render izborSmjera(
            "struja u prednjim zavojima",
            "struja",
            ["gore", "dolje"],
          )}{/if}
        {#if q.N != null}
          {#each [["N", "broj zavoja N", 100, 1000, 50, ""], ["I", "struja I", 0.5, 5, 0.5, "A"], ["l", "duljina ℓ", 5, 50, 5, "cm"], ["r", "polumjer r", 1, 6, 0.5, "cm"]] as [k, ime, lo, hi, korak, jed] (k)}
            <label class="mg-klizac">
              <span class="mg-red-ime">{ime}</span>
              <output>{formatNumber(zv[k])}{jed ? ` ${jed}` : ""}</output>
              <input
                type="range"
                min={Math.min(lo, zv[k])}
                max={Math.max(hi, zv[k])}
                step={korak}
                bind:value={zv[k]}
              />
            </label>
          {/each}
        {/if}
        <p class="mg-hint">Povuci kompas oko zavojnice.</p>
      {:else if q.scena === "magnet"}
        {#if mijenja.includes("N")}<div class="lx-actions">
            <button
              type="button"
              class="btn btn-ghost"
              onclick={() => (st.N = suprotan(st.N))}>Okreni magnet</button
            >
          </div>{/if}
        <p class="mg-hint">
          Povuci kompas (ili dodirni crtež): sjeverni kraj igle (crveni)
          pokazuje smjer polja.
        </p>
      {:else if q.scena === "lenz_magnet"}
        {#if mijenja.includes("pol")}{@render izborSmjera(
            "pol prema petlji",
            "pol",
            ["N", "S"],
          )}{/if}
        {#if mijenja.includes("polozaj")}{@render izborSmjera(
            "magnet je",
            "polozaj",
            ["iznad", "ispod"],
          )}{/if}
        {#if mijenja.includes("gibanje")}{@render izborSmjera(
            "magnet se",
            "gibanje",
            ["priblizava", "udaljava", "miruje"],
          )}{/if}
      {:else if q.scena === "lenz_petlja"}
        {#if mijenja.includes("B")}{@render izborSmjera("polje B", "B", [
            "u_papir",
            "iz_papira",
          ])}{/if}
        {#if mijenja.includes("faza")}{@render izborSmjera("petlja", "faza", [
            "izvan",
            "ulazi",
            "unutra",
            "izlazi",
          ])}{/if}
      {/if}
    </div>
  {:else}
    {#each pitanja as q, i (i)}
      <div class="mg-pitanje" class:vise={pitanja.length > 1}>
        {#if q.oznaka}<div class="mg-oznaka">{q.oznaka}</div>{/if}
        <figure class="lx-figure">
          <svg viewBox="0 0 {W} {H}" role="img" aria-label={opisScene(q)}>
            {#key tocno}
              <g class:mg-pop={tocno}
                >{@render scena(q, odabir[i], bojaOdg(i))}</g
              >
            {/key}
          </svg>
        </figure>
        <Smjerovi
          vrsta={vrstaOdgovora(q)}
          bind:vrijednost={odabir[i]}
          nula={nudiNulu(q)
            ? natpis(q, "nula").replace(/^0 \(|\)$/g, "")
            : null}
          nema={nudiNema(q)}
          disabled={locked}
          status={statusOdg(i)}
          oznaka={q.oznaka ?? "Odaberi smjer"}
        />
      </div>
    {/each}
    <div class="lx-actions">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeri}
        disabled={locked || odabir.some((o) => o == null)}>Provjeri</button
      >
      {#if !locked && pitanja.length > 1 && odabir.some((o) => o == null)}<span
          class="mg-hint">Odaberi odgovor za svaku sliku.</span
        >{/if}
    </div>
    {#if pokazi}<p class="lx-solution">
        Točan odgovor: {smjer_u_polju.tocanOdgovor(spec)}
      </p>{/if}
  {/if}
</div>

<style>
  .mg-tekst {
    margin-bottom: 10px;
  }
  .mg-pitanje {
    margin-bottom: 14px;
  }
  .mg-pitanje.vise {
    padding-bottom: 14px;
    border-bottom: 1px dashed var(--border);
  }
  .mg-pitanje.vise:last-of-type {
    border-bottom: 0;
  }
  .mg-oznaka {
    font-weight: 600;
    font-size: 14.5px;
    margin-bottom: 2px;
  }
  .mg :global(.mg-leg) {
    fill: var(--bg-elev);
    opacity: 0.85;
  }
  .mg :global(.mg-cestica) {
    fill: color-mix(in srgb, var(--mg-i) 22%, var(--bg-elev));
    stroke: var(--mg-i);
    stroke-width: 2.5;
  }
  .mg :global(.mg-cestica.neg) {
    fill: color-mix(in srgb, var(--mg-s) 22%, var(--bg-elev));
    stroke: var(--mg-s);
  }
  .mg :global(.mg-cestica-duh) {
    fill: color-mix(in srgb, var(--text) 25%, transparent);
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .mg :global(.mg-predznak) {
    fill: var(--text);
    font: 700 17px var(--font-mono);
  }
  .mg :global(.mg-tocka) {
    fill: var(--text);
  }
  .mg :global(.mg-tockica) {
    fill: var(--mg-i);
  }
  .mg :global(.mg-sonda) {
    fill: transparent;
    stroke: var(--primary);
    stroke-width: 2;
    stroke-dasharray: 4 4;
    outline: none;
  }
  .mg :global(.mg-sonda:focus-visible),
  .mg :global(.mg-sonda.vuce) {
    stroke-dasharray: none;
    stroke-width: 2.5;
  }
  .mg :global(.mg-kompas) {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .mg :global(.mg-igla-s) {
    fill: var(--text-faint);
  }
  .mg :global(.c-n) {
    --c: var(--mg-n);
  }
  .mg :global(.mg-pol-n) {
    fill: var(--mg-n);
  }
  .mg :global(.mg-pol-s) {
    fill: var(--mg-s);
  }
  .mg :global(.mg-pol-txt) {
    fill: #fff;
    font: 700 16px var(--font-sans);
  }
  .mg :global(.mg-odozgo) {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .mg :global(.mg-podrucje) {
    fill: color-mix(in srgb, var(--mg-b) 8%, transparent);
    stroke: var(--mg-b);
    stroke-width: 1.5;
  }
  .mg :global(.mg-upitnik) {
    font-size: 20px;
  }
  .mg-klizac {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    align-items: baseline;
  }
  .mg-klizac output {
    font-family: var(--font-mono);
    font-size: 14px;
  }
  .mg-klizac input {
    grid-column: 1 / -1;
    width: 100%;
    height: 28px;
    margin: 0;
    accent-color: var(--primary);
  }
</style>
