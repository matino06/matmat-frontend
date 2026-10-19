<script>
  // indukcija: zakretanje petlje (Φ = BS cos α), magnet i petlja (Lenz, galvanometar), petlja kroz područje
  // polja (Φ(t), U(t)) i graf toka s naponom kao nagibom. Fizika (tok, napon, smjer struje, točni odgovori) je u
  // katalogu (indukcija.js, _magnetizam.js); ovdje se samo crta i animira.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import Strelica from "./_MagnetizamStrelica.svelte";
  import Polje from "./_MagnetizamPolje.svelte";
  import Smjerovi from "./_MagnetizamSmjerovi.svelte";
  import { Sat, svgTocka, smanjenoGibanje } from "./_magnetizam.svelte.js";
  import "./_magnetizam.css";
  import {
    indukcija,
    dionice,
    tocneDionice,
    tokZakretanje,
    tokMagnetaKrozPetlju,
    naponPetlje,
    strujaPetlje,
    udioUPolju,
    fazaPetlje,
    SIRINA_POLJA,
    fazeOf,
    strujaFaze,
    oznakaFaze,
  } from "$lib/lesson/katalog/fizika/indukcija.js";
  import {
    lenzMagnet,
    lenzPetlja,
    ZNAK,
    RIJEC,
  } from "$lib/lesson/katalog/fizika/_magnetizam.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const r1 = (n) => Math.round(n * 10) / 10;
  const W = 360;
  let nacin = $derived(spec.nacin);
  let istrazi = $derived(nacin === "istrazi");
  let scena = $derived(spec.scena);

  // ── odgovor ──
  let unos = $state("");
  let odabir = $state(untrack(() => (spec.faze ?? []).map(() => null)));
  let dionica = $state(null);
  let poslano = $state(null);
  const kljuc = () =>
    JSON.stringify(
      nacin === "smjer" ? odabir : nacin === "oznaci" ? dionica : unos,
    );
  let neprom = $derived(poslano != null && poslano === kljuc());
  let tocno = $derived(pokazi || (!!ishod?.tocno && neprom));
  let kriv = $derived(
    ishod && !ishod.tocno && !ishod.prazno && neprom
      ? (ishod.kriv ?? (nacin === "oznaci" ? dionica : -1))
      : -1,
  );
  function posalji(o) {
    if (locked) return;
    poslano = kljuc();
    onodgovor(o);
  }
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "smjer")
        odabir = fazeOf(spec).map((f) => strujaFaze(spec, f));
      if (nacin === "oznaci") dionica = tocneDionice(spec)[0];
    });
  });

  // ── sat ──
  const sat = new Sat();
  let treba = $derived(istrazi || nacin === "smjer");
  $effect(() => {
    if (!treba) return;
    return sat.pokreni();
  });

  // ── grafovi: pomoćno ──
  function niceStep(range, n = 5) {
    const raw = range / n;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 5, 10]) if (k * p >= raw) return k * p;
    return 10 * p;
  }
  const BOJE = ["#ef4444", "#22c55e", "#f97316", "#a855f7", "#0ea5e9"];

  // ═════════ graf toka ═════════
  let G = $derived.by(() => {
    if (scena !== "graf_toka") return null;
    const d = dionice(spec);
    const tMax = spec.tocke.at(-1)[0];
    const fMax = Math.max(...spec.tocke.map((p) => p[1]));
    const uMax = Math.max(...d.map((x) => Math.abs(x.U)), 1e-30);
    const L = 62;
    const R = 340;
    const X = (t) => L + (t / (tMax * 1.06)) * (R - L);
    const fT = 34;
    const fB = 160;
    const Yf = (f) => fB - (f / (fMax * 1.12)) * (fB - fT);
    const uT = 200;
    const uB = 296;
    const uMid = (uT + uB) / 2;
    const Yu = (u) => uMid - (u / uMax) * ((uB - uT) / 2 - 6);
    return {
      d,
      tMax,
      fMax,
      uMax,
      L,
      R,
      X,
      fT,
      fB,
      Yf,
      uT,
      uB,
      uMid,
      Yu,
      kor: niceStep(tMax),
    };
  });
  let jedToka = $derived(spec.jedinica_toka ?? "mWb");
  let pokaziU = $derived(
    scena === "graf_toka" && (istrazi || (nacin === "oznaci" && tocno)),
  );
  let kursor = $state(
    untrack(() => (spec.tocke ? spec.tocke.at(-1)[0] * 0.3 : 0)),
  );
  let svgG = $state();
  let vuceG = false;
  function gDolje(e) {
    if (!istrazi) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vuceG = true;
    gPomak(e);
  }
  function gPomak(e) {
    if (!vuceG && e.type !== "pointerdown") return;
    const p = svgTocka(svgG, e);
    if (!p) return;
    kursor = Math.max(
      0,
      Math.min(G.tMax, ((p[0] - G.L) / (G.R - G.L)) * G.tMax * 1.06),
    );
  }
  function gTipka(e) {
    const k = { ArrowRight: 0.1, ArrowLeft: -0.1 }[e.key];
    if (!k) return;
    e.preventDefault();
    kursor = Math.max(0, Math.min(G.tMax, kursor + k * G.kor));
  }
  let kursorInfo = $derived.by(() => {
    if (!G) return null;
    const i = Math.max(
      0,
      G.d.findIndex((x) => kursor >= x.od && kursor <= x.do),
    );
    const x = G.d[i];
    const f = x.f0 + ((x.f1 - x.f0) * (kursor - x.od)) / x.dt;
    return { i, f, U: x.U };
  });

  // ═════════ zakretanje ═════════
  let kut = $state(untrack(() => spec.kut ?? 0));
  let vrti = $state(false);
  let kutOd = 0;
  let satOd = 0;
  function prebaciVrtnju() {
    vrti = !vrti;
    kutOd = kut;
    satOd = sat.t;
  }
  $effect(() => {
    if (!vrti) return;
    const t = sat.t;
    untrack(() => (kut = (kutOd + (t - satOd) * 60) % 360));
  });
  let kutPrikaz = $derived(Math.round(kut));
  let phi = $derived(scena === "zakretanje" ? tokZakretanje(spec, kut) : 0);

  // ═════════ magnet i petlja ═════════
  // z: udaljenost pola od petlje u polumjerima petlje (0,35 … 3)
  const ZMIN = 0.35;
  const ZMAX = 3;
  let z = $state(1.8);
  let zPrije = 1.8;
  let U = $state(0); // −dΦ/dt (relativno), izglađeno
  let zCilj = $state(null);
  let tPrije = 0;
  $effect(() => {
    if (scena !== "magnet_petlja" || !istrazi) return;
    const t = sat.t;
    untrack(() => {
      const dt = Math.max(1e-3, t - tPrije);
      if (zCilj != null) {
        const korak =
          Math.sign(zCilj - z) * Math.min(Math.abs(zCilj - z), dt * 1.4);
        z += korak;
        if (Math.abs(zCilj - z) < 1e-3) zCilj = null;
      }
      const dPhi = tokMagnetaKrozPetlju(z) - tokMagnetaKrozPetlju(zPrije);
      const trenutni = -dPhi / dt;
      U = U * 0.8 + trenutni * 0.2;
      zPrije = z;
      tPrije = t;
    });
  });
  let mgStruja = $derived.by(() => {
    if (Math.abs(U) < 0.02) return "nema";
    // tok raste (U < 0 u našem zapisu −dΦ/dt) ↔ magnet se približava
    return lenzMagnet({
      pol: spec.pol,
      polozaj: spec.polozaj,
      gibanje: U < 0 ? "priblizava" : "udaljava",
    }).struja;
  });
  let aktivna = $state(0);
  // smjer: magnet se ponavljajuće giba u aktivnoj fazi
  let fazaZ = $derived.by(() => {
    if (scena !== "magnet_petlja" || nacin !== "smjer") return z;
    const g = fazeOf(spec)[aktivna]?.gibanje;
    const p = smanjenoGibanje() ? 0.5 : (sat.t * 0.55) % 1;
    if (g === "priblizava") return ZMAX - 0.4 - p * (ZMAX - 0.4 - ZMIN - 0.3);
    if (g === "udaljava") return ZMIN + 0.3 + p * (ZMAX - 0.4 - ZMIN - 0.3);
    return 1.4;
  });
  let svgM = $state();
  let vuceM = $state(false);
  // geometrija: petlja na sredini visine, magnet iznad ili ispod
  const MG = { cx: 150, rx: 84, ry: 22, pol: 30, vis: 60, sir: 34 };
  const zPx = (zz) => MG.ry + 6 + zz * MG.pol;
  let mgCy = $derived(spec.polozaj === "ispod" ? 100 : 200);
  function mDolje(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vuceM = true;
    zCilj = null;
  }
  function mPomak(e) {
    if (!vuceM) return;
    const p = svgTocka(svgM, e);
    if (!p) return;
    const d = spec.polozaj === "iznad" ? mgCy - p[1] : p[1] - mgCy;
    z = Math.max(ZMIN, Math.min(ZMAX, (d - MG.ry - 6) / MG.pol));
  }
  function mTipka(e) {
    const k = { ArrowUp: 0.15, ArrowDown: -0.15 }[e.key];
    if (k == null) return;
    e.preventDefault();
    zCilj = Math.max(
      ZMIN,
      Math.min(ZMAX, z + (spec.polozaj === "iznad" ? k : -k)),
    );
  }

  // ═════════ petlja kroz polje ═════════
  const PP = { x0: 130, a: 64, h: 64, cy: 92 };
  const XMIN = -1.7;
  const XMAX = SIRINA_POLJA + 2.5;
  const POLOZAJ_FAZE = { izvan: -0.9, ulazi: 0.5, unutra: 1.5, izlazi: 2.5 };
  let xp = $state(-0.9);
  let ide = $state(false);
  let xpOd = 0;
  let tOd = 0;
  function pokreni() {
    if (ide) {
      ide = false;
      return;
    }
    if (xp >= XMAX - 0.05) xp = XMIN;
    xpOd = xp;
    tOd = sat.t;
    ide = true;
  }
  $effect(() => {
    if (!ide) return;
    const t = sat.t;
    untrack(() => {
      xp = Math.min(XMAX, xpOd + (t - tOd) * 0.75);
      if (xp >= XMAX) ide = false;
    });
  });
  let ppFaza = $derived(
    scena === "petlja_u_polje"
      ? nacin === "smjer"
        ? typeof fazeOf(spec)[aktivna] === "string"
          ? fazeOf(spec)[aktivna]
          : fazeOf(spec)[aktivna]?.faza
        : nacin === "izracunaj"
          ? "ulazi"
          : fazaPetlje(xp)
      : null,
  );
  let ppX = $derived(
    scena === "petlja_u_polje" ? (istrazi ? xp : POLOZAJ_FAZE[ppFaza]) : 0,
  );
  let ppStruja = $derived(
    scena === "petlja_u_polje"
      ? lenzPetlja({ B: spec.smjer_B, faza: ppFaza }).struja
      : null,
  );
  let svgP = $state();
  let vuceP = $state(false);
  function pDolje(e) {
    if (!istrazi) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vuceP = true;
    ide = false;
  }
  function pPomak(e) {
    if (!vuceP) return;
    const p = svgTocka(svgP, e);
    if (!p) return;
    xp = Math.max(XMIN, Math.min(XMAX, (p[0] - PP.x0 + PP.a / 2) / PP.a));
  }

  // točkice struje po pravokutniku / elipsi
  function tockiceKvadrat(cx, cy, a, h, smjer, n = 10) {
    const out = [];
    const o = 2 * (a + h);
    for (let k = 0; k < n; k++) {
      let s = ((((k / n) * o + smjer * sat.t * 40) % o) + o) % o;
      if (s < a) out.push([cx - a / 2 + s, cy - h / 2]);
      else if ((s -= a) < h) out.push([cx + a / 2, cy - h / 2 + s]);
      else if ((s -= h) < a) out.push([cx + a / 2 - s, cy + h / 2]);
      else out.push([cx - a / 2, cy + h / 2 - (s - a)]);
    }
    return out;
  }
  function tockiceElipsa(cx, cy, rx, ry, smjer, brzina = 1.6, n = 10) {
    return Array.from({ length: n }, (_, k) => {
      const a = (k / n) * 2 * Math.PI + smjer * sat.t * brzina;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
  }
  function kruznaStrelica(cx, cy, r, smjer) {
    const s = smjer === "kazaljka" ? 1 : -1;
    const a0 = -Math.PI / 2 - s * 0.5;
    const a1 = a0 + s * Math.PI * 1.55;
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const t = [-Math.sin(a1) * s, Math.cos(a1) * s];
    const n = [Math.cos(a1), Math.sin(a1)];
    const v = 8;
    return {
      d: `M${r1(p0[0])},${r1(p0[1])} A${r},${r} 0 1 ${s > 0 ? 1 : 0} ${r1(p1[0])},${r1(p1[1])}`,
      glava: `${r1(p1[0] + t[0] * v)},${r1(p1[1] + t[1] * v)} ${r1(p1[0] - t[0] * 2 + n[0] * v * 0.75)},${r1(p1[1] - t[1] * 2 + n[1] * v * 0.75)} ${r1(p1[0] - t[0] * 2 - n[0] * v * 0.75)},${r1(p1[1] - t[1] * 2 - n[1] * v * 0.75)}`,
    };
  }
  const fmtU = (u) => `${formatSci(u)} V`;
</script>

{#snippet kruzenje(cx, cy, r, struja, boja)}
  {#if struja === "kazaljka" || struja === "suprotno"}
    {@const ks = kruznaStrelica(cx, cy, r, struja)}
    <g class={boja}
      ><path d={ks.d} class="mg-stroke" stroke-width="3" /><polygon
        points={ks.glava}
        class="mg-fill"
      /></g
    >
  {:else if struja === "nema"}
    <g class={boja}
      ><text x={cx} y={cy + 5} text-anchor="middle" class="mg-txt">I = 0</text
      ></g
    >
  {:else}
    <text x={cx} y={cy + 7} text-anchor="middle" class="mg-txt c-sel mg-upitnik"
      >?</text
    >
  {/if}
{/snippet}

<!-- redovi faza s izborom ↻ ↺ 0 (magnet_petlja, petlja_u_polje) -->
{#snippet faze()}
  <p class="mg-legenda">
    <span>↻ u smjeru kazaljke</span><span>↺ suprotno</span><span
      >0 struja ne teče</span
    >
  </p>
  <div class="mg-faze">
    {#each fazeOf(spec) as f, i (i)}
      <div
        class="mg-faza"
        class:aktivna={aktivna === i}
        class:ok={tocno}
        class:bad={kriv === i}
      >
        <button
          type="button"
          class="mg-faza-ime"
          aria-pressed={aktivna === i}
          onclick={() => (aktivna = i)}
        >
          <svg viewBox="0 0 16 16" class="mg-oko" aria-hidden="true"
            ><path
              d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z"
            /><circle cx="8" cy="8" r="2" /></svg
          >
          {oznakaFaze(spec, f, i)}
        </button>
        <Smjerovi
          vrsta="kruzenje"
          kompaktno
          nema
          bind:vrijednost={odabir[i]}
          disabled={locked}
          status={tocno ? "ok" : kriv === i ? "bad" : ""}
          oznaka={oznakaFaze(spec, f, i)}
          onodabir={() => (aktivna = i)}
        />
      </div>
    {/each}
  </div>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={() => posalji([...odabir])}
      disabled={locked || odabir.some((o) => o == null)}>Provjeri</button
    >
  </div>
{/snippet}

<div class="mg">
  {#if istrazi}
    <div class="mg-tekst"><Md text={spec.tekst} /></div>
  {:else}
    <div class="lx-question"><Md text={spec.tekst} /></div>
  {/if}

  {#if scena === "graf_toka" && G}
    {@const dioUk = G.d.length}
    <figure class="lx-figure">
      <svg
        bind:this={svgG}
        viewBox="0 0 {W} {pokaziU ? 312 : 196}"
        role="img"
        aria-label="Graf magnetskog toka po dionicama{pokaziU
          ? ' i graf napona ispod njega'
          : ''}"
      >
        <!-- dionice: obojene trake i područja za dodir -->
        {#each G.d as x, i (i)}
          {@const sel = nacin === "oznaci" && dionica === i}
          {@const boja = BOJE[i % BOJE.length]}
          {#if nacin === "oznaci"}
            <rect
              x={G.X(x.od)}
              y={G.fT - 8}
              width={G.X(x.do) - G.X(x.od)}
              height={G.fB - G.fT + 8}
              class="mg-dionica"
              class:sel
              class:ok={sel && tocno}
              class:bad={sel && kriv === i}
            />
          {/if}
          {#if nacin === "izracunaj" && spec.dionica === i + 1}
            <rect
              x={G.X(x.od)}
              y={G.fT - 8}
              width={G.X(x.do) - G.X(x.od)}
              height={G.fB - G.fT + 8}
              class="mg-dionica sel"
            />
          {/if}
          <line
            x1={G.X(x.od) + 2}
            y1={G.fT - 14}
            x2={G.X(x.do) - 2}
            y2={G.fT - 14}
            stroke={boja}
            stroke-width="4"
            stroke-linecap="round"
          />
          <text
            x={(G.X(x.od) + G.X(x.do)) / 2}
            y={G.fT - 20}
            text-anchor="middle"
            class="mg-dion-txt"
            fill={boja}>{i + 1}.</text
          >
        {/each}
        <!-- osi -->
        <line
          x1={G.L}
          y1={G.fB}
          x2={G.R + 8}
          y2={G.fB}
          class="lx-stroke"
          stroke-width="1.5"
        />
        <line
          x1={G.L}
          y1={G.fB}
          x2={G.L}
          y2={G.fT - 4}
          class="lx-stroke"
          stroke-width="1.5"
        />
        <text x={G.L - 8} y={G.fT - 2} text-anchor="end" class="mg-mali"
          >Φ / {jedToka}</text
        >
        <text
          x={G.R + 8}
          y={G.fB + 18}
          text-anchor="start"
          class="mg-mali"
          dx="-14"
          dy="14">t / s</text
        >
        {#each spec.tocke as p, i (i)}
          <line
            x1={G.X(p[0])}
            y1={G.fB}
            x2={G.X(p[0])}
            y2={G.fB + 5}
            class="lx-stroke"
          />
          <text x={G.X(p[0])} y={G.fB + 18} text-anchor="middle" class="mg-mali"
            >{formatNumber(p[0])}</text
          >
          {#if p[1] > 0}
            <line
              x1={G.L}
              y1={G.Yf(p[1])}
              x2={G.X(p[0])}
              y2={G.Yf(p[1])}
              class="mg-crtkano"
            />
            <text
              x={G.L - 6}
              y={G.Yf(p[1]) + 4}
              text-anchor="end"
              class="mg-mali">{formatNumber(p[1])}</text
            >
          {/if}
        {/each}
        <polyline
          points={spec.tocke
            .map((p) => `${r1(G.X(p[0]))},${r1(G.Yf(p[1]))}`)
            .join(" ")}
          class="mg-graf"
        />
        {#each spec.tocke as p, i (i)}<circle
            cx={G.X(p[0])}
            cy={G.Yf(p[1])}
            r="4"
            class="mg-graf-tocka"
          />{/each}
        {#if nacin === "oznaci"}
          {#each G.d as x, i (i)}
            <rect
              x={G.X(x.od)}
              y={G.fT - 30}
              width={G.X(x.do) - G.X(x.od)}
              height={G.fB - G.fT + 30}
              fill="transparent"
              role="button"
              tabindex={locked ? -1 : 0}
              aria-label="{i + 1}. dionica"
              aria-pressed={dionica === i}
              class="mg-dodir"
              onclick={() => !locked && (dionica = i)}
              onkeydown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                !locked &&
                (e.preventDefault(), (dionica = i))}
            />
          {/each}
        {/if}
        {#if pokaziU}
          <!-- napon: stepenice, U = −N ΔΦ/Δt -->
          <line
            x1={G.L}
            y1={G.uMid}
            x2={G.R + 8}
            y2={G.uMid}
            class="lx-stroke"
            stroke-width="1.2"
          />
          <line
            x1={G.L}
            y1={G.uT - 4}
            x2={G.L}
            y2={G.uB}
            class="lx-stroke"
            stroke-width="1.5"
          />
          <text x={G.L - 8} y={G.uT + 6} text-anchor="end" class="mg-mali"
            >U / V</text
          >
          {#each G.d as x, i (i)}
            <rect
              x={G.X(x.od)}
              y={Math.min(G.uMid, G.Yu(x.U))}
              width={G.X(x.do) - G.X(x.od)}
              height={Math.max(1.5, Math.abs(G.Yu(x.U) - G.uMid))}
              fill={BOJE[i % BOJE.length]}
              opacity="0.55"
            />
            <text
              x={(G.X(x.od) + G.X(x.do)) / 2}
              y={x.U >= 0 ? G.Yu(x.U) - 5 : G.Yu(x.U) + 14}
              text-anchor="middle"
              class="mg-mali mg-jak">{formatSci(x.U)}</text
            >
          {/each}
          {#if !istrazi}<text
              x={G.R}
              y={G.uB + 12}
              text-anchor="end"
              class="mg-mali">napon U = −N·ΔΦ/Δt (N = {spec.N ?? 1})</text
            >{/if}
        {/if}
        {#if istrazi && kursorInfo}
          <line
            x1={G.X(kursor)}
            y1={G.fT - 6}
            x2={G.X(kursor)}
            y2={G.uB}
            class="mg-kursor"
          />
          <circle
            cx={G.X(kursor)}
            cy={G.Yf(kursorInfo.f)}
            r="5"
            class="mg-kursor-tocka"
          />
          <rect
            x={G.L}
            y={G.fT - 30}
            width={G.R - G.L + 10}
            height={G.uB - G.fT + 30}
            fill="transparent"
            class="lx-handle"
            role="slider"
            tabindex="0"
            aria-label="Vrijeme na grafu"
            aria-valuemin={0}
            aria-valuemax={G.tMax}
            aria-valuenow={Math.round(kursor * 100) / 100}
            onpointerdown={gDolje}
            onpointermove={gPomak}
            onpointerup={() => (vuceG = false)}
            onpointercancel={() => (vuceG = false)}
            onkeydown={gTipka}
          />
        {/if}
      </svg>
    </figure>
    {#if istrazi && kursorInfo}
      <p class="mg-ocitanje" aria-live="polite">
        t = <b>{formatNumber(kursor, 1)} s</b> · {kursorInfo.i + 1}. dionica · Φ
        = <b>{formatNumber(kursorInfo.f, 2)} {jedToka}</b> · U =
        <b>{fmtU(kursorInfo.U)}</b>{kursorInfo.U === 0
          ? " (graf je vodoravan)"
          : ""}
      </p>
    {/if}
    {#if nacin === "oznaci"}
      <p class="mg-hint">
        Dodirni dionicu na grafu ({dioUk} dionice{dioUk > 4 ? "" : ""}), pa
        Provjeri.
      </p>
      <div class="lx-actions">
        <button
          type="button"
          class="btn btn-primary"
          onclick={() => posalji(dionica)}
          disabled={locked || dionica == null}>Provjeri</button
        >
      </div>
    {:else if nacin === "izracunaj"}
      <BrojUnos
        jedinica="V"
        {locked}
        {ishod}
        bind:vrijednost={unos}
        oznaka="Napon u V"
        onodgovor={(v) => posalji(v)}
      />
    {/if}
  {:else if scena === "zakretanje"}
    {@const a = (kut * Math.PI) / 180}
    {@const cx = 170}
    {@const cy = 112}
    {@const hl = 78}
    {@const nx = Math.cos(a)}
    {@const ny = -Math.sin(a)}
    {@const visina = Math.abs(hl * Math.cos(a))}
    <figure class="lx-figure">
      <svg
        viewBox="0 0 {W} 230"
        role="img"
        aria-label="Petlja u homogenom polju, kut između silnica i okomice na petlju {kutPrikaz}°, tok {formatSci(
          phi,
        )} Wb"
      >
        <rect
          x="14"
          y={cy - visina}
          width="332"
          height={2 * visina}
          class="mg-sjena"
        />
        {#each Array.from({ length: 11 }, (_, k) => 22 + k * 19) as y (y)}
          {@const kroz = Math.abs(y - cy) < visina}
          <line
            x1="14"
            y1={y}
            x2="340"
            y2={y}
            class="mg-stroke c-b"
            stroke-width={kroz ? 2.4 : 1.3}
            opacity={kroz ? 0.95 : 0.35}
          />
          <polygon
            points="346,{y} 336,{y - 4.5} 336,{y + 4.5}"
            class="mg-fill c-b"
            opacity={kroz ? 0.95 : 0.35}
          />
        {/each}
        <g class="c-b"><text class="mg-txt it" x="18" y="16">B</text></g>
        <!-- petlja sa strane: dužina okomita na n -->
        <line
          x1={cx - ny * hl}
          y1={cy + nx * hl}
          x2={cx + ny * hl}
          y2={cy - nx * hl}
          class="mg-zica"
          stroke-width="7"
          stroke-linecap="round"
        />
        <Strelica
          x1={cx}
          y1={cy}
          x2={cx + nx * 66}
          y2={cy + ny * 66}
          boja="c-f"
          oznaka="n"
          sirina={3}
        />
        {#if kutPrikaz % 360 !== 0}
          {@const ra = 30}
          <path
            d="M{cx + ra},{cy} A{ra},{ra} 0 {kut % 360 > 180 ? 1 : 0} 0 {r1(
              cx + nx * ra,
            )},{r1(cy + ny * ra)}"
            class="mg-stroke c-v"
            stroke-width="2"
          />
        {/if}
        <g class="c-v"
          ><text class="mg-txt" x="346" y="16" text-anchor="end"
            >α = {kutPrikaz}°</text
          ></g
        >
      </svg>
    </figure>
    {#if istrazi}
      <p class="mg-ocitanje" aria-live="polite">
        Φ = B·S·cos α = <b>{formatSci(phi)} Wb</b> ({Math.round(
          Math.cos(a) * 100,
        )} % najvećeg toka)<br />jače crte: silnice koje prolaze kroz petlju
      </p>
      <!-- mali grafovi: tok ~ cos α, napon ~ sin α (pri vrtnji) -->
      <figure class="lx-figure mg-mali-graf">
        <svg
          viewBox="0 0 {W} 104"
          role="img"
          aria-label="Tok i napon u ovisnosti o kutu"
        >
          {#each [["Φ", "c-f", Math.cos], ["U", "c-ind", Math.sin]] as [ime, boja, fn], k (ime)}
            {@const y0 = 24 + k * 44}
            <line x1="34" y1={y0} x2="346" y2={y0} class="lx-faint" />
            <text x="26" y={y0 + 5} text-anchor="end" class="mg-mali"
              >{ime}</text
            >
            <polyline
              points={Array.from(
                { length: 73 },
                (_, i) =>
                  `${34 + i * (312 / 72)},${r1(y0 - 17 * fn((i * 5 * Math.PI) / 180))}`,
              ).join(" ")}
              class="mg-stroke {boja}"
              stroke-width="2"
            />
            <circle
              cx={34 + ((kut % 360) / 360) * 312}
              cy={y0 - 17 * fn(a)}
              r="4.5"
              class="mg-fill {boja}"
            />
          {/each}
          <text x="346" y="101" text-anchor="end" class="mg-mali"
            >α od 0° do 360°</text
          >
        </svg>
      </figure>
      <div class="mg-kontrole">
        <label class="mg-klizac">
          <span class="mg-red-ime">kut α</span>
          <output>{kutPrikaz}°</output>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            bind:value={kut}
            disabled={vrti}
            aria-label="kut α"
          />
        </label>
        <div class="lx-actions">
          <button
            type="button"
            class="btn btn-ghost"
            onclick={prebaciVrtnju}
            disabled={smanjenoGibanje()}
            >{vrti ? "Zaustavi" : "Vrti petlju"}</button
          >
        </div>
      </div>
    {:else}
      <p class="mg-ocitanje">
        B = {formatNumber(spec.B)} T · S = {formatNumber(spec.S)}
        {spec.jedinica_S ?? "m²"} · α = {spec.kut}°
      </p>
      <BrojUnos
        jedinica={spec.pitaj?.jedinica ?? "Wb"}
        {locked}
        {ishod}
        bind:vrijednost={unos}
        oznaka="Tok"
        onodgovor={(v) => posalji(v)}
      />
    {/if}
  {:else if scena === "magnet_petlja"}
    {@const iznad = spec.polozaj === "iznad"}
    {@const zz = nacin === "smjer" ? fazaZ : z}
    {@const pol = spec.pol}
    {@const cy = mgCy}
    {@const blizi = iznad ? cy - zPx(zz) : cy + zPx(zz)}
    {@const top = iznad ? blizi - MG.vis : blizi}
    {@const L = lenzMagnet({
      pol,
      polozaj: spec.polozaj,
      gibanje: "priblizava",
    })}
    {@const phiRel = tokMagnetaKrozPetlju(zz)}
    {@const nLin = Math.max(1, Math.round(1 + phiRel * 6))}
    {@const smjerF = nacin === "smjer" ? fazeOf(spec)[aktivna] : null}
    {@const struja = istrazi
      ? mgStruja
      : tocno && smjerF
        ? strujaFaze(spec, smjerF)
        : null}
    {@const gornjiN = (pol === "N") !== iznad}
    <figure class="lx-figure">
      <svg
        bind:this={svgM}
        viewBox="0 0 {W} 290"
        role="img"
        aria-label="Magnet {iznad
          ? 'iznad'
          : 'ispod'} petlje, pol {pol} prema petlji"
      >
        <!-- silnice magneta kroz petlju: gušće što je magnet bliže -->
        {#each Array.from({ length: nLin }, (_, k) => MG.cx + (nLin === 1 ? 0 : -60 + (120 * k) / (nLin - 1))) as x, k (k)}
          {@const y0 = iznad ? blizi : cy - 50}
          {@const y1 = iznad ? cy + 50 : blizi}
          <line
            x1={x}
            y1={y0}
            x2={x}
            y2={y1}
            class="mg-stroke c-b"
            stroke-width="1.6"
            opacity="0.65"
          />
          {@const ys = L.Bkroz === "dolje" ? cy + 36 : cy - 34}
          <polygon
            points="{x},{ys + (L.Bkroz === 'dolje' ? 6 : -6)} {x - 4.5},{ys -
              (L.Bkroz === 'dolje' ? 3 : -3)} {x + 4.5},{ys -
              (L.Bkroz === 'dolje' ? 3 : -3)}"
            class="mg-fill c-b"
            opacity="0.85"
          />
        {/each}
        <path
          d="M{MG.cx - MG.rx},{cy} A{MG.rx},{MG.ry} 0 0 1 {MG.cx + MG.rx},{cy}"
          class="mg-zica"
          stroke-width="5"
        />
        <g>
          <rect
            x={MG.cx - MG.sir / 2}
            y={top}
            width={MG.sir}
            height={MG.vis / 2}
            class={gornjiN ? "mg-pol-n" : "mg-pol-s"}
            rx="3"
          />
          <rect
            x={MG.cx - MG.sir / 2}
            y={top + MG.vis / 2}
            width={MG.sir}
            height={MG.vis / 2}
            class={gornjiN ? "mg-pol-s" : "mg-pol-n"}
            rx="3"
          />
          <text
            x={MG.cx}
            y={top + MG.vis / 4 + 6}
            text-anchor="middle"
            class="mg-pol-txt">{gornjiN ? "N" : "S"}</text
          >
          <text
            x={MG.cx}
            y={top + (3 * MG.vis) / 4 + 6}
            text-anchor="middle"
            class="mg-pol-txt">{gornjiN ? "S" : "N"}</text
          >
          {#if istrazi}<rect
              x={MG.cx - MG.sir / 2 - 3}
              y={top - 3}
              width={MG.sir + 6}
              height={MG.vis + 6}
              rx="5"
              class="mg-rucka"
              class:vuce={vuceM}
            />{/if}
        </g>
        {#if istrazi}
          <rect
            x={MG.cx - MG.sir / 2 - 14}
            y={top - 10}
            width={MG.sir + 28}
            height={MG.vis + 20}
            fill="transparent"
            class="lx-handle mg-fokus"
            role="slider"
            tabindex="0"
            aria-label="Magnet (povuci ga ili strelicama gore/dolje)"
            aria-valuemin={ZMIN}
            aria-valuemax={ZMAX}
            aria-valuenow={Math.round(zz * 100) / 100}
            onpointerdown={mDolje}
            onpointermove={mPomak}
            onpointerup={() => (vuceM = false)}
            onpointercancel={() => (vuceM = false)}
            onkeydown={mTipka}
          />
        {/if}
        <path
          d="M{MG.cx - MG.rx},{cy} A{MG.rx},{MG.ry} 0 0 0 {MG.cx + MG.rx},{cy}"
          class="mg-zica"
          stroke-width="5"
        />
        {#if smjerF && smjerF.gibanje !== "miruje"}
          {@const dolje = iznad === (smjerF.gibanje === "priblizava")}
          <Strelica
            x1={MG.cx - 50}
            y1={top + MG.vis / 2 - (dolje ? 17 : -17)}
            x2={MG.cx - 50}
            y2={top + MG.vis / 2 + (dolje ? 17 : -17)}
            boja="c-dim"
            sirina={2.6}
          />
          <g class="c-dim"
            ><text class="mg-txt it" x={MG.cx - 72} y={top + MG.vis / 2 + 5}
              >v</text
            ></g
          >
        {/if}
        {#if struja === "kazaljka" || struja === "suprotno"}
          {#each tockiceElipsa(MG.cx, cy, MG.rx, MG.ry, struja === "kazaljka" ? 1 : -1, istrazi ? Math.min(4, 0.6 + Math.abs(U) * 6) : 1.6) as p, k (k)}<circle
              cx={p[0]}
              cy={p[1]}
              r="3.4"
              class="mg-tockica"
            />{/each}
          {@const ind = lenzMagnet({
            pol,
            polozaj: spec.polozaj,
            gibanje: istrazi
              ? U < 0
                ? "priblizava"
                : "udaljava"
              : smjerF.gibanje,
          }).inducirano}
          <Strelica
            x1={MG.cx + 40}
            y1={cy}
            x2={MG.cx + 40}
            y2={cy + (ind === "gore" ? -42 : 42)}
            boja="c-ind"
            oznaka="B ind"
            kurziv={false}
            sirina={2.6}
          />
        {/if}
        <!-- pogled odozgo -->
        <g transform="translate(300 {cy})">
          <circle r="36" class="mg-odozgo" />
          <text y="-44" text-anchor="middle" class="mg-mali">odozgo</text>
          <circle r="21" class="mg-zica" stroke-width="3" />
          {#if istrazi || tocno || pokazi}
            {@render kruzenje(0, 0, 29, struja ?? "nema", "c-i")}
          {:else}
            {@render kruzenje(
              0,
              0,
              29,
              odabir[aktivna],
              kriv === aktivna ? "c-bad" : "c-sel",
            )}
          {/if}
        </g>
        {#if istrazi}
          <!-- galvanometar -->
          {@const kutI = Math.max(-60, Math.min(60, -U * 160))}
          <g transform="translate(300 {iznad ? 66 : 250})">
            <path d="M-34,0 A34,34 0 0 1 34,0" class="mg-galv" />
            {#each [-60, -30, 0, 30, 60] as t (t)}<line
                x1={Math.sin((t * Math.PI) / 180) * 28}
                y1={-Math.cos((t * Math.PI) / 180) * 28}
                x2={Math.sin((t * Math.PI) / 180) * 34}
                y2={-Math.cos((t * Math.PI) / 180) * 34}
                class="lx-stroke"
              />{/each}
            <line
              x1="0"
              y1="0"
              x2={Math.sin((kutI * Math.PI) / 180) * 30}
              y2={-Math.cos((kutI * Math.PI) / 180) * 30}
              class="mg-igla"
            />
            <circle r="3" class="mg-tocka" />
            <text y="16" text-anchor="middle" class="mg-mali">galvanometar</text
            >
          </g>
        {/if}
      </svg>
    </figure>
    {#if istrazi}
      <p class="mg-ocitanje" aria-live="polite">
        tok kroz petlju: <b>{Math.round(phiRel * 100)} %</b> ·
        {#if mgStruja === "nema"}tok se ne mijenja → <b>nema struje</b
          >{:else}tok <b>{U < 0 ? "raste" : "pada"}</b> → struja
          <b>{ZNAK[mgStruja]} {RIJEC[mgStruja]}</b> (odozgo){/if}
      </p>
      <div class="lx-actions mg-centar">
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => (zCilj = ZMIN)}>Približi magnet</button
        >
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => (zCilj = ZMAX)}>Udalji magnet</button
        >
      </div>
      <p class="mg-hint mg-centar-txt">
        Ili povuci magnet. Što brže ga pomičeš, to se igla galvanometra više
        otklanja.
      </p>
    {:else}
      {@render faze()}
    {/if}
  {:else if scena === "petlja_u_polje"}
    {@const front = PP.x0 + ppX * PP.a}
    {@const lx = front - PP.a / 2}
    {@const rx0 = PP.x0}
    {@const rx1 = PP.x0 + SIRINA_POLJA * PP.a}
    {@const sijece = ppFaza === "ulazi" || ppFaza === "izlazi"}
    {@const rez = naponPetlje(spec)}
    <figure class="lx-figure">
      <svg
        bind:this={svgP}
        viewBox="0 0 {W} {istrazi ? 300 : 180}"
        role="img"
        aria-label="Petlja {ppFaza} u polju; struja {RIJEC[ppStruja]}"
      >
        <rect
          x={rx0}
          y="20"
          width={rx1 - rx0}
          height="148"
          class="mg-podrucje"
          rx="6"
        />
        <Polje
          smjer={spec.smjer_B}
          x0={rx0}
          y0={20}
          x1={rx1}
          y1={168}
          razmak={30}
          oznaka=""
          jako={0.55}
        />
        <g class="c-b"
          ><text class="mg-txt it" x={rx0 + 4} y="14"
            >B {ZNAK[spec.smjer_B]} = {formatNumber(spec.B)} T</text
          ></g
        >
        <g>
          <rect
            x={lx - PP.a / 2}
            y={PP.cy - PP.h / 2}
            width={PP.a}
            height={PP.h}
            class="mg-zica"
            stroke-width="5"
            fill="none"
          />
          {#if sijece}<line
              x1={ppFaza === "ulazi" ? front : lx - PP.a / 2}
              y1={PP.cy - PP.h / 2}
              x2={ppFaza === "ulazi" ? front : lx - PP.a / 2}
              y2={PP.cy + PP.h / 2}
              class="mg-stroke c-v"
              stroke-width="5"
            />{/if}
          {#if istrazi}<rect
              x={lx - PP.a / 2 - 3}
              y={PP.cy - PP.h / 2 - 3}
              width={PP.a + 6}
              height={PP.h + 6}
              rx="4"
              class="mg-rucka"
              class:vuce={vuceP}
            />{/if}
        </g>
        {#if istrazi}
          <rect
            x={lx - PP.a / 2 - 8}
            y={PP.cy - PP.h / 2 - 8}
            width={PP.a + 16}
            height={PP.h + 16}
            fill="transparent"
            class="lx-handle mg-fokus"
            role="slider"
            tabindex="0"
            aria-label="Petlja (povuci je ili strelicama lijevo/desno)"
            aria-valuemin={XMIN}
            aria-valuemax={XMAX}
            aria-valuenow={Math.round(ppX * 100) / 100}
            onpointerdown={pDolje}
            onpointermove={pPomak}
            onpointerup={() => (vuceP = false)}
            onpointercancel={() => (vuceP = false)}
            onkeydown={(e) => {
              const d = { ArrowRight: 0.1, ArrowLeft: -0.1 }[e.key];
              if (d) {
                e.preventDefault();
                ide = false;
                xp = Math.max(XMIN, Math.min(XMAX, xp + d));
              }
            }}
          />
        {/if}
        <text x={front + 6} y={PP.cy + 4} class="mg-mali">ℓ</text>
        <Strelica
          x1={front + 12}
          y1={PP.cy - PP.h / 2 - 12}
          x2={front + 46}
          y2={PP.cy - PP.h / 2 - 12}
          boja="c-dim"
          oznaka="v"
          sirina={2.4}
        />
        {#if nacin === "smjer" && !(tocno || pokazi)}
          {@render kruzenje(
            lx,
            PP.cy,
            18,
            odabir[aktivna],
            kriv === aktivna ? "c-bad" : "c-sel",
          )}
        {:else if nacin !== "izracunaj"}
          {@render kruzenje(lx, PP.cy, 18, ppStruja, "c-i")}
          {#if ppStruja === "kazaljka" || ppStruja === "suprotno"}
            {#each tockiceKvadrat(lx, PP.cy, PP.a, PP.h, ppStruja === "kazaljka" ? 1 : -1) as p, k (k)}<circle
                cx={p[0]}
                cy={p[1]}
                r="3.4"
                class="mg-tockica"
              />{/each}
          {/if}
        {/if}
        {#if nacin === "izracunaj"}
          <text x="12" y="176" class="mg-mali"
            >ℓ = {formatNumber(spec.l)}
            {spec.jedinica_l ?? "m"} · v = {formatNumber(spec.v)} m/s{spec.R !=
            null
              ? ` · R = ${formatNumber(spec.R)} Ω`
              : ""}</text
          >
        {/if}
        {#if istrazi}
          <!-- grafovi Φ(x) i U(x) -->
          {@const gx = (x) => 34 + ((x - XMIN) / (XMAX - XMIN)) * 310}
          {@const xs = Array.from(
            { length: 121 },
            (_, i) => XMIN + (i * (XMAX - XMIN)) / 120,
          )}
          <line x1="34" y1="236" x2="346" y2="236" class="lx-faint" />
          <text x="28" y="222" text-anchor="end" class="mg-mali">Φ</text>
          <polyline
            points={xs
              .map((x) => `${r1(gx(x))},${r1(236 - 34 * udioUPolju(x))}`)
              .join(" ")}
            class="mg-stroke c-f"
            stroke-width="2"
          />
          <line x1="34" y1="274" x2="346" y2="274" class="lx-faint" />
          <text x="28" y="268" text-anchor="end" class="mg-mali">U</text>
          <polyline
            points={xs
              .map((x) => {
                const f = fazaPetlje(x);
                return `${r1(gx(x))},${r1(274 - (f === "ulazi" ? 16 : f === "izlazi" ? -16 : 0))}`;
              })
              .join(" ")}
            class="mg-stroke c-ind"
            stroke-width="2"
          />
          <line x1={gx(ppX)} y1="196" x2={gx(ppX)} y2="294" class="mg-kursor" />
        {/if}
      </svg>
    </figure>
    {#if istrazi}
      <p class="mg-ocitanje" aria-live="polite">
        petlja <b
          >{{
            izvan: "je izvan polja",
            ulazi: "ulazi",
            unutra: "je cijela u polju",
            izlazi: "izlazi",
          }[ppFaza]}</b
        >
        ·
        {#if sijece}U = B·ℓ·v = <b>{fmtU(rez)}</b>{#if spec.R != null}, I = U/R
            = <b>{formatSci(strujaPetlje(spec))} A</b>{/if} · struja {ZNAK[
            ppStruja
          ]}{:else}tok se ne mijenja → <b>U = 0, I = 0</b>{/if}
      </p>
      <div class="mg-kontrole">
        <label class="mg-klizac">
          <span class="mg-red-ime">položaj petlje</span>
          <output
            >{{
              izvan: "izvan",
              ulazi: "ulazi",
              unutra: "unutra",
              izlazi: "izlazi",
            }[ppFaza]}</output
          >
          <input
            type="range"
            min={XMIN}
            max={XMAX}
            step="0.02"
            bind:value={xp}
            oninput={() => (ide = false)}
            aria-label="položaj petlje"
          />
        </label>
        <div class="lx-actions">
          <button
            type="button"
            class="btn btn-ghost"
            onclick={pokreni}
            disabled={smanjenoGibanje()}
            >{ide ? "Zaustavi" : "Pokreni petlju"}</button
          >
        </div>
      </div>
    {:else if nacin === "smjer"}
      {@render faze()}
    {:else}
      <BrojUnos
        jedinica={spec.pitaj?.velicina === "I" ? "A" : "V"}
        {locked}
        {ishod}
        bind:vrijednost={unos}
        oznaka={spec.pitaj?.velicina === "I" ? "Struja u A" : "Napon u V"}
        onodgovor={(v) => posalji(v)}
      />
    {/if}
  {/if}

  {#if pokazi && !istrazi}<p class="lx-solution">
      Točan odgovor: {indukcija.tocanOdgovor(spec)}
    </p>{/if}
</div>

<style>
  .mg-tekst {
    margin-bottom: 10px;
  }
  .mg-centar {
    justify-content: center;
  }
  .mg-centar-txt {
    text-align: center;
    margin-top: 8px;
  }
  .mg-mali-graf {
    margin-top: -6px;
  }
  .mg :global(.mg-dionica) {
    fill: transparent;
  }
  .mg :global(.mg-dionica.sel) {
    fill: var(--primary-dim);
  }
  .mg :global(.mg-dionica.ok) {
    fill: color-mix(in srgb, var(--success) 18%, transparent);
  }
  .mg :global(.mg-dionica.bad) {
    fill: color-mix(in srgb, var(--danger) 16%, transparent);
  }
  .mg :global(.mg-fokus) {
    outline: none;
  }
  .mg :global(.mg-fokus:focus-visible) {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .mg :global(.mg-dodir) {
    cursor: pointer;
    outline: none;
  }
  .mg :global(.mg-dodir:focus-visible) {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .mg :global(.mg-dion-txt) {
    font: 700 14px var(--font-sans);
  }
  .mg :global(.mg-graf) {
    fill: none;
    stroke: var(--mg-f);
    stroke-width: 3.2;
    stroke-linejoin: round;
  }
  .mg :global(.mg-graf-tocka) {
    fill: var(--mg-f);
  }
  .mg :global(.mg-crtkano) {
    stroke: var(--text-faint);
    stroke-dasharray: 3 3;
  }
  .mg :global(.mg-jak) {
    fill: var(--text);
    font-family: var(--font-mono);
  }
  .mg :global(.mg-kursor) {
    stroke: var(--primary);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }
  .mg :global(.mg-kursor-tocka) {
    fill: var(--primary);
  }
  .mg :global(.mg-sjena) {
    fill: color-mix(in srgb, var(--mg-b) 9%, transparent);
  }
  .mg :global(.mg-tockica) {
    fill: var(--mg-i);
  }
  .mg :global(.mg-tocka) {
    fill: var(--text);
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
    pointer-events: none;
  }
  .mg :global(.mg-odozgo) {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
  }
  .mg :global(.mg-podrucje) {
    fill: color-mix(in srgb, var(--mg-b) 8%, transparent);
    stroke: var(--mg-b);
    stroke-width: 1.5;
  }
  .mg :global(.mg-rucka) {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
    pointer-events: none;
  }
  .mg :global(.mg-rucka.vuce) {
    stroke-dasharray: none;
  }
  .mg :global(.mg-galv) {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .mg :global(.mg-igla) {
    stroke: var(--mg-i);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .mg :global(.mg-upitnik) {
    font-size: 20px;
  }
  .mg-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 14px;
    margin: 0 0 8px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .mg-faze {
    display: grid;
    gap: 8px;
  }
  .mg-faza {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px 10px;
    padding: 7px 8px 7px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .mg-faza.aktivna {
    border-color: var(--border-strong);
    box-shadow: inset 3px 0 0 var(--primary);
  }
  .mg-faza.ok {
    border-color: var(--success);
  }
  .mg-faza.bad {
    border-color: var(--danger);
  }
  .mg-faza-ime {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: none;
    border: 0;
    padding: 6px 2px;
    color: var(--text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .mg-oko {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.5;
    flex-shrink: 0;
  }
  .aktivna .mg-oko {
    stroke: var(--primary);
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
