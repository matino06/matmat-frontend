<script>
  // Voda u vodoravnoj cijevi koja se sužava. Čestice se gibaju brzinom v(x) = Q/S(x), pa u užem dijelu jure; manometri
  // pokazuju statički tlak, a crveni dio stupca dinamički (zbroj je isti). Sve vrijednosti računa katalog (stanje),
  // komponenta ih samo crta. Položaji čestica mijenjaju se izravno na <circle> elementima, bez stanja po sličici.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import { stanje, povrsina } from "$lib/lesson/katalog/fizika/cijev.js";
  import { fmtBroj, fmtJ } from "$lib/lesson/katalog/fizika/_fluidi.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const W = 360;
  const RMAX = 34;

  let nacin = $derived(spec.nacin);
  let pitaj = $derived(spec.pitaj?.velicina ?? null);
  let otkriveno = $derived(nacin === "istrazi" || pokazi || !!ishod?.tocno);
  let saD = $derived(spec.presjeci[1].d != null);
  let imaP = $derived(spec.p1 != null);
  let kanta = $derived(spec.kanta ?? null);

  // ── klizači (istrazi) ──
  function klizaci() {
    const [a, b] = spec.presjeci;
    const sD = b.d != null;
    const zadani = spec.klizaci ?? [{ id: sD ? "d2" : "S2" }, { id: "v1" }];
    return zadani.map((k) => {
      const zad = k.id === "v1" ? spec.v1 : sD ? b.d : b.S;
      const prvi = sD ? a.d : a.S;
      const def =
        k.id === "v1"
          ? { min: 0.2, max: Math.max(3, Math.ceil(spec.v1 * 2)), korak: 0.1 }
          : sD
            ? {
                min: Math.max(0.5, Math.round((prvi / 4) * 2) / 2),
                max: prvi,
                korak: prvi >= 10 ? 0.5 : 0.1,
              }
            : {
                min: Math.max(0.5, Math.round(prvi / 16)),
                max: prvi,
                korak: prvi >= 20 ? 1 : 0.5,
              };
      const min = k.min ?? Math.min(def.min, zad);
      const max = k.max ?? Math.max(def.max, zad);
      return {
        id: k.id,
        min,
        max,
        korak: k.korak ?? def.korak,
        oznaka:
          k.id === "v1"
            ? "brzina u širem dijelu v₁"
            : k.id === "d2"
              ? "promjer užeg dijela d₂"
              : "presjek užeg dijela S₂",
        jedinica: k.id === "v1" ? "m/s" : k.id === "d2" ? "cm" : "cm²",
      };
    });
  }
  const sliders = untrack(() => (spec.nacin === "istrazi" ? klizaci() : []));
  let vrijednosti = $state(
    untrack(() =>
      Object.fromEntries(
        sliders.map((k) => [
          k.id,
          k.id === "v1" ? spec.v1 : (spec.presjeci[1].d ?? spec.presjeci[1].S),
        ]),
      ),
    ),
  );

  let st = $derived(stanje(spec, nacin === "istrazi" ? vrijednosti : {}));
  let st0 = $derived(stanje(spec));

  // ── geometrija ──
  // polumjer na crtežu ∝ √S; mjerilo je za najveći presjek koji klizač dopušta, da se crtež ne skalira pod rukom
  let Sref = $derived.by(() => {
    const s2 = sliders.find((k) => k.id !== "v1");
    const najveci = s2 ? povrsina(saD ? { d: s2.max } : { S: s2.max }) : 0;
    return Math.max(st0.S1, najveci);
  });
  const rOf = (S) => Math.max(3.5, RMAX * Math.sqrt(S / Sref));
  let r1 = $derived(rOf(st.S1));
  let r2 = $derived(rOf(st.S2));
  const X0 = 8;
  let X1 = $derived(kanta ? 278 : W - 8);
  let XA = $derived(X0 + (X1 - X0) * 0.36);
  let XB = $derived(XA + 44);
  let CY = $derived(imaP ? 168 : 74);
  let H = $derived(CY + RMAX + (kanta ? 34 : 22));
  function rx(x) {
    if (x <= XA) return r1;
    if (x >= XB) return r2;
    const t = (x - XA) / (XB - XA);
    const s = t * t * (3 - 2 * t);
    return r1 + (r2 - r1) * s;
  }
  const f1 = (n) => Math.round(n * 10) / 10;
  let profil = $derived.by(() => {
    const xs = [X0, XA];
    for (let k = 1; k < 12; k++) xs.push(XA + ((XB - XA) * k) / 12);
    xs.push(XB, X1);
    const gore = xs.map((x) => `${f1(x)},${f1(CY - rx(x))}`);
    const dolje = xs.map((x) => `${f1(x)},${f1(CY + rx(x))}`).reverse();
    return {
      gore: `M${gore.join(" L")}`,
      dolje: `M${dolje.join(" L")}`,
      voda: `M${gore.join(" L")} L${dolje.join(" L")} Z`,
    };
  });

  // ── čestice ──
  const N = 46;
  // mjerilo brzine na crtežu (px/s po m/s), stalno za zadani spec: v₁ ≈ 50 px/s, najbrže ≤ ~320 px/s
  let kV = $derived(Math.min(50 / st0.v1, 320 / st0.v2));
  const cestice = Array.from({ length: N }, (_, i) => ({
    x: 0,
    f: ((i * 0.618) % 1) * 1.64 - 0.82,
    i,
  }));
  const krugovi = [];
  function registriraj(node, i) {
    krugovi[i] = node;
    return { destroy: () => (krugovi[i] = null) };
  }
  // početni raspored s gustoćom ∝ r(x)²: u stalnom toku je tako (sporije čestice su gušće)
  function rasporedi() {
    let k = 0;
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    while (k < N) {
      const x = X0 + rnd() * (X1 - X0);
      if (rnd() <= (rx(x) / Math.max(r1, r2)) ** 2) cestice[k++].x = x;
    }
  }
  function nacrtaj() {
    for (const c of cestice) {
      const el = krugovi[c.i];
      if (!el) continue;
      el.setAttribute("cx", c.x.toFixed(1));
      el.setAttribute("cy", (CY + c.f * (rx(c.x) - 3)).toFixed(1));
    }
  }
  let tece = $derived(otkriveno && !prefersReducedMotion.current);

  // kanta: protekli fizikalni čas punjenja (s)
  let tKanta = $state(0);
  let ubrzanje = $derived(
    st.t_kanta ? Math.max(1, Math.ceil(st.t_kanta / 12)) : 1,
  );

  let rasporedjeno = false;
  // crtež prati promjenu geometrije (klizač) i kad animacija stoji
  $effect(() => {
    void [r1, r2, CY, X1];
    untrack(() => {
      if (!rasporedjeno) rasporedi();
      rasporedjeno = true;
      nacrtaj();
    });
  });

  $effect(() => {
    if (!tece) return;
    let id;
    let prije = null;
    let pauza = 0;
    const petlja = (ms) => {
      const dt = prije == null ? 0 : Math.min(0.05, (ms - prije) / 1000);
      prije = ms;
      const v1 = st.v1;
      const L = X1 - X0;
      for (const c of cestice) {
        const r = rx(c.x);
        c.x += v1 * (r1 / r) ** 2 * kV * dt;
        if (c.x > X1) c.x -= L;
      }
      nacrtaj();
      if (kanta && st.t_kanta) {
        if (tKanta >= st.t_kanta) {
          pauza += dt;
          if (pauza > 1.6) {
            pauza = 0;
            tKanta = 0;
          }
        } else tKanta = Math.min(st.t_kanta, tKanta + dt * ubrzanje);
      }
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  // bez animacije (prefers-reduced-motion) kanta se pokaže puna s izračunatim vremenom
  $effect(() => {
    if (otkriveno && prefersReducedMotion.current && st.t_kanta)
      tKanta = st.t_kanta;
  });

  // ── manometri ──
  // Stupci pokazuju tlak iznad osnovice pB (prekinuta os): razlika statičkih tlakova od nekoliko kPa uz 150 kPa
  // inače se ne bi vidjela. Osnovica i mjerilo su stalni za spec, pa klizač mijenja samo visine stupaca.
  let man = $derived.by(() => {
    if (!imaP) return null;
    const v1max = Math.max(
      st0.v1,
      ...sliders.filter((k) => k.id === "v1").map((k) => k.max),
    );
    const s2 = sliders.find((k) => k.id !== "v1");
    const S2min = s2 ? povrsina(saD ? { d: s2.min } : { S: s2.min }) : st0.S2;
    const v2max = (v1max * st0.S1) / Math.min(S2min, st0.S2);
    const pdMax = (st0.rho * v2max * v2max) / 2;
    const ukupno = st0.p1 + st0.pd1;
    const raspon = Math.max(pdMax * 1.15, ukupno * 0.02);
    const pB = Math.max(0, ukupno - raspon);
    return {
      pB,
      k: 108 / (ukupno + (st0.rho * v1max * v1max) / 2 - st0.pd1 - pB),
    };
  });
  let xm1 = $derived((X0 + XA) / 2 + 4);
  let xm2 = $derived((XB + X1) / 2);
  const visina = (p) => Math.max(0, (p - man.pB) * man.k);
  // prije odgovora tlak i dinamički tlakovi u užem dijelu bi otkrili odgovor (Bernoulli), pa se vidi samo p₁
  let skrijUze = $derived(!!pitaj && !otkriveno);

  // ── odgovor ──
  const JED = {
    v2: "m/s",
    p2: "Pa",
    Q: "L/s",
    t_kanta: "s",
    p_d1: "Pa",
    p_d2: "Pa",
  };
  let jedinica = $derived(spec.jedinica ?? JED[pitaj] ?? "");
  let unos = $state("");

  // ── zapis ──
  const fm = (n, j, sig = 4) => fmtJ(n, j, sig);
  const cm2 = (S) => fm(S * 1e4, "cm²", 4);
  let Ls = $derived(st.Q * 1000);
  const skriveno = (k) => !otkriveno && pitaj === k;

  let opis = $derived(
    `Vodoravna cijev se sužava: ${saD ? `promjer ${formatNumber(st.d1)} cm pa ${formatNumber(st.d2)} cm` : `presjek ${cm2(st.S1)} pa ${cm2(st.S2)}`}. ` +
      `Brzina u širem dijelu ${fm(st.v1, "m/s")}${skriveno("v2") ? "" : `, u užem ${fm(st.v2, "m/s")}`}.` +
      (imaP && !skrijUze
        ? ` Statički tlak ${fm(st.p1, "Pa")} i ${fm(st.p2, "Pa")}.`
        : ""),
  );
</script>

{#if nacin === "istrazi"}
  <div class="cj-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure cj">
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
    <defs>
      <clipPath id="cj-clip-{uid}"><path d={profil.voda} /></clipPath>
    </defs>

    {#if man}
      {@const yP1 = CY - r1}
      {@const yP2 = CY - r2}
      {@const yUk = yP1 - 6 - visina(st.p1 + st.pd1)}
      <!-- linija ukupnog tlaka p + ρv²/2, ista nad oba presjeka -->
      {#if !skrijUze}
        <line
          class="cj-ukupno"
          x1={xm1 + 6}
          y1={f1(yUk)}
          x2={xm2 + 30}
          y2={f1(yUk)}
        />
        <text
          class="cj-mala"
          x={(xm1 + xm2) / 2}
          y={f1(yUk) - 5}
          text-anchor="middle">p + ρv²/2 = konst.</text
        >
      {/if}
      {#each [{ x: xm1, yP: yP1, p: st.p1, pd: st.pd1, i: 1 }, { x: xm2, yP: yP2, p: st.p2, pd: st.pd2, i: 2 }] as m (m.i)}
        {@const vrhCijevi = yUk - 8}
        {@const yS = m.yP - 6 - visina(m.p)}
        {@const sakrij = m.i === 2 && skrijUze}
        <rect
          class="cj-cijevcica"
          x={m.x - 6}
          y={vrhCijevi}
          width="12"
          height={m.yP - vrhCijevi + 1}
        />
        {#if !sakrij}
          <rect
            class="cj-stupac"
            x={m.x - 5}
            y={f1(yS)}
            width="10"
            height={f1(m.yP - yS + 1)}
          />
          {#if !skrijUze}
            <rect
              class="cj-dinamicki"
              x={m.x + 9}
              y={f1(yS - m.pd * man.k)}
              width="7"
              height={f1(m.pd * man.k)}
            />
            <text class="cj-p" x={m.x - 11} y={f1(yS) + 4} text-anchor="end"
              >{fmtBroj(m.p / 1000)} kPa</text
            >
            <text class="cj-pd" x={m.x + 20} y={f1(yS - (m.pd * man.k) / 2) + 4}
              >{fmtBroj(m.pd)} Pa</text
            >
          {/if}
        {:else}
          <text
            class="cj-upitnik"
            x={m.x}
            y={f1((vrhCijevi + m.yP) / 2) + 6}
            text-anchor="middle">?</text
          >
        {/if}
        <path
          class="lx-stroke cj-zid"
          d="M{m.x - 6},{f1(vrhCijevi)} V{f1(m.yP)} M{m.x + 6},{f1(
            vrhCijevi,
          )} V{f1(m.yP)}"
        />
        <!-- prekid osi: stupac počinje od osnovice, a ne od nule -->
        <path
          class="cj-prekid"
          d="M{m.x - 9},{f1(m.yP - 3)} l4,-3 l4,3 l4,-3 l4,3"
        />
      {/each}
    {/if}

    <path class="lx-water cj-voda" d={profil.voda} />
    <g clip-path="url(#cj-clip-{uid})">
      {#each cestice as c (c.i)}
        <circle
          use:registriraj={c.i}
          class="cj-cestica"
          r="2.6"
          cx="-10"
          cy={CY}
        />
      {/each}
    </g>
    <path class="lx-stroke cj-zid" d={profil.gore} />
    <path class="lx-stroke cj-zid" d={profil.dolje} />

    {#if kanta}
      {@const kx0 = 296}
      {@const kx1 = 350}
      {@const ky0 = CY - 4}
      {@const ky1 = CY + RMAX + 14}
      {@const udio = st.t_kanta ? tKanta / st.t_kanta : 0}
      {@const yv = ky1 - udio * (ky1 - ky0 - 4)}
      {#if tece && udio < 1}
        <path
          class="cj-mlaz"
          d="M{X1},{CY} Q{X1 + 22},{CY} {kx0 + 18},{f1(yv)}"
          style:stroke-width={Math.max(2.5, Math.min(9, r2 * 0.5))}
        />
      {/if}
      <path
        class="lx-water cj-kanta-voda"
        d="M{kx0 + 2},{f1(yv)} H{kx1 - 2} L{kx1 - 4},{ky1} H{kx0 + 4} Z"
      />
      <path
        class="lx-stroke cj-zid"
        d="M{kx0 - 2},{ky0} L{kx0 + 4},{ky1} H{kx1 - 4} L{kx1 + 2},{ky0}"
      />
      <text
        class="cj-mala"
        x={(kx0 + kx1) / 2}
        y={ky1 + 14}
        text-anchor="middle">{formatNumber(kanta.V)} L</text
      >
      {#if otkriveno && pitaj !== "t_kanta"}
        <text
          class="cj-sat"
          x={(kx0 + kx1) / 2}
          y={ky0 - 8}
          text-anchor="middle"
          >{formatNumber(Math.round(tKanta * 10) / 10)} s</text
        >
      {:else if otkriveno}
        <text
          class="cj-sat ok"
          x={(kx0 + kx1) / 2}
          y={ky0 - 8}
          text-anchor="middle"
          >{formatNumber(Math.round(tKanta * 10) / 10)} s</text
        >
      {/if}
    {/if}

    <text class="cj-v" x={(X0 + XA) / 2} y={CY + RMAX + 16} text-anchor="middle"
      >v₁ = {fm(st.v1, "m/s", 3)}</text
    >
    <text
      class="cj-v"
      class:ok={otkriveno && pitaj === "v2"}
      x={(XB + X1) / 2}
      y={CY + RMAX + 16}
      text-anchor="middle"
      >v₂ = {skriveno("v2") ? "?" : fm(st.v2, "m/s", 3)}</text
    >
  </svg>
</figure>

<div class="cj-tablica" aria-live="polite">
  <div class="cj-red cj-zaglavlje">
    <span></span><span>{spec.presjeci[0].oznaka ?? "šire"} (1)</span><span
      >{spec.presjeci[1].oznaka ?? "uže"} (2)</span
    >
  </div>
  {#if saD}
    <div class="cj-red">
      <span>promjer d</span><span>{fm(st.d1, "cm", 3)}</span><span
        >{fm(st.d2, "cm", 3)}</span
      >
    </div>
  {/if}
  <div class="cj-red">
    <span>presjek S</span><span>{cm2(st.S1)}</span><span>{cm2(st.S2)}</span>
  </div>
  <div class="cj-red">
    <span>brzina v</span><span>{fm(st.v1, "m/s", 3)}</span><span
      class:ok={otkriveno && pitaj === "v2"}
      >{skriveno("v2") ? "?" : fm(st.v2, "m/s", 3)}</span
    >
  </div>
  {#if imaP}
    <div class="cj-red">
      <span>statički p</span><span>{fm(st.p1, "Pa")}</span><span
        class:ok={otkriveno && pitaj === "p2"}
        >{skrijUze ? "?" : fm(st.p2, "Pa")}</span
      >
    </div>
    <div class="cj-red">
      <span>dinamički ρv²/2</span><span class:ok={otkriveno && pitaj === "p_d1"}
        >{skrijUze ? "?" : fm(st.pd1, "Pa")}</span
      ><span class:ok={otkriveno && pitaj === "p_d2"}
        >{skrijUze ? "?" : fm(st.pd2, "Pa")}</span
      >
    </div>
  {/if}
  <div class="cj-red cj-q">
    <span>protok Q = S·v</span><span class:ok={otkriveno && pitaj === "Q"}
      >{skriveno("Q") ? "?" : `${fm(Ls, "L/s", 4)} (isti)`}</span
    >
  </div>
  {#if kanta && otkriveno && st.t_kanta}
    <div class="cj-red cj-q">
      <span>kanta {formatNumber(kanta.V)} L</span><span
        class:ok={pitaj === "t_kanta"}
        >t = V/Q = {fm(st.t_kanta, "s", 3)}{ubrzanje > 1
          ? ` (animacija ${ubrzanje}× brža)`
          : ""}</span
      >
    </div>
  {/if}
</div>

{#if nacin === "istrazi"}
  <div class="cj-klizaci">
    {#each sliders as k (k.id)}
      <div class="cj-klizac">
        <div class="cj-kl-head">
          <label for="cj-{uid}-{k.id}">{k.oznaka}</label>
          <output for="cj-{uid}-{k.id}" class="mono"
            >{formatNumber(vrijednosti[k.id])} {k.jedinica}</output
          >
        </div>
        <input
          id="cj-{uid}-{k.id}"
          type="range"
          min={k.min}
          max={k.max}
          step={k.korak}
          bind:value={vrijednosti[k.id]}
        />
      </div>
    {/each}
  </div>
{:else}
  {#if !otkriveno}<p class="cj-hint">
      Izračunaj, upiši i provjeri – nakon toga voda poteče.
    </p>{/if}
  <BrojUnos
    {jedinica}
    {locked}
    {ishod}
    bind:vrijednost={unos}
    {onodgovor}
    oznaka="Odgovor"
  />
{/if}

<style>
  .cj-tekst {
    margin-bottom: 12px;
  }
  .cj {
    max-width: 480px;
    margin-bottom: 6px;
  }
  .cj .cj-voda {
    stroke: none;
  }
  .cj .cj-zid {
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .cj-cestica {
    fill: var(--lx-water);
    opacity: 0.95;
  }
  .cj-cijevcica {
    fill: var(--bg-elev);
  }
  .cj-stupac {
    fill: color-mix(in srgb, var(--lx-water) 55%, transparent);
  }
  .cj-dinamicki {
    fill: color-mix(in srgb, var(--danger) 70%, transparent);
  }
  .cj-ukupno {
    stroke: var(--text-dim);
    stroke-dasharray: 5 4;
    stroke-width: 1.2;
  }
  .cj-prekid {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .cj-p {
    fill: var(--lx-water);
    font: 600 11px var(--font-mono);
  }
  .cj-pd {
    fill: var(--danger);
    font: 600 10.5px var(--font-mono);
  }
  .cj-mala {
    fill: var(--text-dim);
    font: 11px var(--font-sans);
  }
  .cj-upitnik {
    fill: var(--primary);
    font: 700 17px var(--font-sans);
  }
  .cj-v {
    fill: var(--text);
    font: 600 12.5px var(--font-mono);
  }
  .cj-v.ok,
  .cj-sat.ok {
    fill: var(--success);
  }
  .cj-sat {
    fill: var(--text);
    font: 600 12px var(--font-mono);
  }
  .cj-mlaz {
    fill: none;
    stroke: color-mix(in srgb, var(--lx-water) 70%, transparent);
    stroke-linecap: round;
  }
  .cj .cj-kanta-voda {
    stroke: none;
  }
  .cj-tablica {
    display: grid;
    gap: 2px;
    max-width: 440px;
    margin: 0 auto 10px;
    font-size: 13px;
  }
  .cj-red {
    display: grid;
    grid-template-columns: 1.15fr 1fr 1fr;
    gap: 8px;
    padding: 4px 8px;
    border-radius: var(--r-sm);
  }
  .cj-red:nth-child(even) {
    background: var(--bg-elev);
  }
  .cj-red > span:first-child {
    color: var(--text-dim);
  }
  .cj-red > span:not(:first-child) {
    font-family: var(--font-mono);
    text-align: right;
  }
  .cj-zaglavlje > span {
    font-family: var(--font-sans) !important;
    font-weight: 600;
    color: var(--text-dim);
  }
  .cj-q {
    grid-template-columns: 1.15fr 2fr;
  }
  .cj-red .ok {
    color: var(--success);
    font-weight: 600;
  }
  .cj-klizaci {
    display: grid;
    gap: 10px;
    max-width: 440px;
    margin: 0 auto;
  }
  .cj-kl-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 13.5px;
  }
  .cj-kl-head label {
    color: var(--text-dim);
  }
  .cj-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .cj-hint {
    font-size: 13px;
    color: var(--text-dim);
    margin: 0 0 8px;
  }
</style>
