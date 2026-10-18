<script>
  // Krivulja zagrijavanja T–Q (ili T–t uz grijač): dijelovi su široki koliko je topline na njima (taljenje i
  // isparavanje vidljivo su dugi). Točka na krivulji pokreće kutiju s česticama i zbroj topline po dijelovima.
  // Dijelove računa katalog (dijelovi), pa crtež i provjera uvijek kažu isto. Vrste "mijesanje" i "grijac"
  // (kalorimetrija) crta zasebna komponenta.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import FluidiCestice from "./_FluidiCestice.svelte";
  import FluidiKalorimetar from "./_FluidiKalorimetar.svelte";
  import {
    dijelovi,
    tocniDijelovi,
    NAZIV_DIJELA,
    vrstaOf,
  } from "$lib/lesson/katalog/fizika/krivulja_zagrijavanja.js";
  import {
    fmtBroj,
    fmtJ,
    fmtMasa,
  } from "$lib/lesson/katalog/fizika/_fluidi.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const W = 360;
  const H = 236;
  const L = 46;
  const D = 14;
  const T = 22;
  const B = 34;
  const PW = W - L - D;

  let kalorimetar = $derived(vrstaOf(spec) !== "krivulja");
  let nacin = $derived(spec.nacin);
  let segs = $derived(kalorimetar ? [] : dijelovi(spec));
  let n = $derived(segs.length);
  let shem = $derived(!!spec.shematski);
  let snaga = $derived(spec.snaga ?? null);
  let pokaziRjesenje = $derived(pokazi || !!ishod?.tocno);
  let skrijQ = $derived(nacin === "ocitaj" && !pokaziRjesenje);
  let kursorVidljiv = $derived(nacin === "istrazi" || pokaziRjesenje);
  let tvar = $derived(spec.tvar ?? {});

  // ── os x: dijelovi u omjeru topline (shematski: jednako široki); najkraći dio barem 9 px da se vidi i dodirne ──
  let sirine = $derived.by(() => {
    if (!n) return [];
    const w = segs.map((d) => (shem ? 1 : d.Q));
    const uk = w.reduce((a, b) => a + b, 0);
    const MIN = 9;
    let s = w.map((x) => (x / uk) * PW);
    const mali = s.map((x) => x < MIN);
    const ostatak = PW - MIN * mali.filter(Boolean).length;
    const veliki = s.reduce((a, x, i) => a + (mali[i] ? 0 : x), 0);
    s = s.map((x, i) => (mali[i] ? MIN : (x / veliki) * ostatak));
    return s;
  });
  let pocetci = $derived(
    sirine.reduce((a, w, i) => [...a, i ? a[i - 1] + sirine[i - 1] : L], []),
  );
  let Quk = $derived(shem || !n ? null : segs.at(-1).Q0 + segs.at(-1).Q);

  // ── os y ──
  function lijepiKorak(raspon, koliko = 5) {
    const raw = raspon / koliko;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= raw) return k * p;
    return 10 * p;
  }
  let Tmin = $derived(n ? Math.min(...segs.map((d) => d.T0)) : 0);
  let Tmax = $derived(n ? Math.max(...segs.map((d) => d.T1)) : 1);
  let yRaspon = $derived.by(() => {
    const span = Math.max(1, Tmax - Tmin);
    return [Tmin - span * 0.1, Tmax + span * 0.1];
  });
  const Y = (t) =>
    H - B - ((t - yRaspon[0]) / (yRaspon[1] - yRaspon[0])) * (H - T - B);
  let yKorak = $derived(lijepiKorak(yRaspon[1] - yRaspon[0]));
  let yTicks = $derived.by(() => {
    const out = [];
    for (
      let v = Math.ceil(yRaspon[0] / yKorak) * yKorak;
      v <= yRaspon[1] + 1e-9;
      v += yKorak
    )
      out.push(Math.round(v / yKorak) * yKorak);
    return out;
  });

  // os x u J/kJ/MJ ili s/min
  let xOs = $derived.by(() => {
    if (shem || !Quk) return null;
    const uk = snaga ? Quk / snaga : Quk;
    const [jed, f] = snaga
      ? uk < 600
        ? ["s", 1]
        : ["min", 60]
      : uk < 1e4
        ? ["J", 1]
        : uk < 1e7
          ? ["kJ", 1e3]
          : ["MJ", 1e6];
    const korak = lijepiKorak(uk / f, 4);
    const ticks = [];
    for (let v = 0; v <= uk / f + 1e-9; v += korak)
      ticks.push(Math.round(v / korak) * korak);
    return { jed, f, ticks, faktor: snaga ? 1 / snaga : 1 };
  });
  // Q (J) → x na crtežu (dio po dio, jer najkraći dijelovi mogu biti malo prošireni)
  function xOfQ(q) {
    for (let i = 0; i < n; i++) {
      const d = segs[i];
      if (q <= d.Q0 + d.Q + 1e-9 || i === n - 1)
        return (
          pocetci[i] + Math.min(1, Math.max(0, (q - d.Q0) / d.Q)) * sirine[i]
        );
    }
    return L;
  }
  const xOfU = (u) => {
    const i = Math.min(n - 1, Math.floor(u));
    return pocetci[i] + (u - i) * sirine[i];
  };
  function uOfX(x) {
    for (let i = 0; i < n; i++)
      if (x <= pocetci[i] + sirine[i] || i === n - 1)
        return Math.min(n, Math.max(0, i + (x - pocetci[i]) / sirine[i]));
    return 0;
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  // broj dijela: iznad vodoravnog dijela, lijevo-gore od kosog; kratki kosi dio dobiva broj desno-dolje, da se ne
  // preklopi sa susjednim
  function brojXY(d, i) {
    const xm = pocetci[i] + sirine[i] / 2;
    const ym = (Y(d.T0) + Y(d.T1)) / 2;
    if (d.ravno) return [xm, ym - 14];
    if (sirine[i] < 20)
      return xm + 14 > W - D - 10 ? [xm - 12, ym - 16] : [xm + 14, ym + 10];
    return [xm - 9, ym - 9];
  }
  let tockeKrivulje = $derived(
    segs
      .map(
        (d, i) =>
          `${r1(pocetci[i])},${r1(Y(d.T0))} ${r1(pocetci[i] + sirine[i])},${r1(Y(d.T1))}`,
      )
      .join(" "),
  );

  // ── kursor: u = indeks dijela + udio ──
  let u = $state(untrack(() => (spec.nacin === "istrazi" ? 0.35 : 0)));
  let vuce = $state(false);
  let svgEl = $state();
  let tren = $derived.by(() => {
    if (!n) return null;
    const i = Math.min(n - 1, Math.floor(u));
    const d = segs[i];
    const f = Math.min(1, u - i);
    const Tt = d.T0 + f * (d.T1 - d.T0);
    const Qt = shem ? null : d.Q0 + f * d.Q;
    return { i, d, f, T: Tt, Q: Qt };
  });
  // udjeli stanja za kutiju s česticama
  let udjeli = $derived.by(() => {
    if (!tren) return { tekuce: 0, plin: 0 };
    const { d, f } = tren;
    if (d.vrsta === "grije_kruto") return { tekuce: 0, plin: 0 };
    if (d.vrsta === "taljenje") return { tekuce: f, plin: 0 };
    if (d.vrsta === "grije_tekuce") return { tekuce: 1, plin: 0 };
    if (d.vrsta === "isparavanje") return { tekuce: 1 - f, plin: f };
    return { tekuce: 0, plin: 1 };
  });
  let toplina = $derived(
    tren
      ? Math.min(1, Math.max(0, (tren.T - Tmin) / Math.max(1, Tmax - Tmin)))
      : 0,
  );

  function izDodira(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    u = uOfX(p.x);
  }
  function dolje(e) {
    if (!kursorVidljiv || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    zaustavi();
    vuce = true;
    izDodira(e);
  }
  function pomak(e) {
    if (vuce) izDodira(e);
  }
  const gore = () => (vuce = false);
  function tipka(e) {
    if (!kursorVidljiv) return;
    const k = {
      ArrowRight: 0.05,
      ArrowUp: 0.05,
      ArrowLeft: -0.05,
      ArrowDown: -0.05,
    }[e.key];
    if (e.key === "Home") u = 0;
    else if (e.key === "End") u = n;
    else if (k) u = Math.min(n, Math.max(0, Math.round((u + k) * 100) / 100));
    else return;
    zaustavi();
    e.preventDefault();
  }

  // grijač: kursor ide stalnom brzinom dovođenja topline (svi dijelovi zajedno ~8 s)
  let grije = $state(false);
  let rafId = null;
  function zaustavi() {
    grije = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }
  function pusti() {
    if (grije) return zaustavi();
    if (u >= n - 1e-6) u = 0;
    if (prefersReducedMotion.current) {
      u = n;
      return;
    }
    grije = true;
    let prije = null;
    const petlja = (ms) => {
      const dt = prije == null ? 0 : Math.min(0.05, (ms - prije) / 1000);
      prije = ms;
      // brzina u px/s je stalna, pa je i toplina po sekundi stalna (grijač stalne snage)
      const x = Math.min(L + PW, xOfU(u) + (PW / 8) * dt);
      u = uOfX(x);
      if (x >= L + PW - 1e-6) {
        u = n;
        zaustavi();
        return;
      }
      rafId = requestAnimationFrame(petlja);
    };
    rafId = requestAnimationFrame(petlja);
  }
  $effect(() => () => zaustavi());

  // ── odaberi ──
  let oznaceni = $state([]);
  let poslano = $state(null);
  function prebaci(br) {
    if (locked || nacin !== "odaberi") return;
    oznaceni = oznaceni.includes(br)
      ? oznaceni.filter((b) => b !== br)
      : [...oznaceni, br].sort((a, b) => a - b);
  }
  let tocni = $derived(nacin === "odaberi" ? tocniDijelovi(spec) : []);
  let neprom = $derived(
    poslano != null &&
      poslano.length === oznaceni.length &&
      poslano.every((b, i) => b === oznaceni[i]),
  );
  function stanjeDijela(br) {
    if (nacin !== "odaberi") return "";
    if (pokazi) return tocni.includes(br) ? "ok" : "";
    if (ishod && !ishod.prazno && neprom && oznaceni.includes(br))
      return ishod.tocno || tocni.includes(br) ? "ok" : "bad";
    return oznaceni.includes(br) ? "sel" : "";
  }
  function provjeri() {
    if (locked) return;
    poslano = [...oznaceni];
    onodgovor([...oznaceni]);
  }

  // ── ocitaj ──
  let istaknuti = $derived.by(() => {
    if (nacin !== "ocitaj") return [];
    const q = spec.ocitaj;
    if (q.velicina.endsWith("_dio")) return [q.dio];
    return segs
      .map((d) => d.br)
      .filter((b) => b >= (q.od_dijela ?? 1) && b <= (q.do_dijela ?? n));
  });
  let jedinica = $derived(
    spec.jedinica ?? (spec.ocitaj?.velicina?.startsWith("t_") ? "s" : "J"),
  );
  let unos = $state("");

  // ── zapis ──
  const fT = (t) => `${formatNumber(Math.round(t * 10) / 10)} °C`;
  const fQ = (q) => fmtJ(q, "J");
  const STANJE = { kruto: "kruto", tekuce: "tekuće", plin: "plinovito" };
  let opisStanja = $derived.by(() => {
    if (!tren) return "";
    const { d, f } = tren;
    if (d.vrsta === "taljenje")
      return `taljenje: ${Math.round(f * 100)} % rastaljeno`;
    if (d.vrsta === "isparavanje")
      return `isparavanje: ${Math.round(f * 100)} % isparilo`;
    return `${STANJE[d.stanje]} stanje, temperatura raste`;
  });
  function formula(d) {
    if (shem || !Number.isFinite(d.Q))
      return d.ravno
        ? d.vrsta === "taljenje"
          ? "Q = m·λ"
          : "Q = m·r"
        : "Q = m·c·Δt";
    if (d.ravno)
      return `Q = m·${d.simbol} = ${formatNumber(spec.m)}·${fmtBroj(d.L)} = ${fQ(d.Q)}`;
    return `Q = m·c·Δt = ${formatNumber(spec.m)}·${fmtBroj(d.c)}·${formatNumber(d.T1 - d.T0)} = ${fQ(d.Q)}`;
  }
  let opis = $derived(
    kalorimetar
      ? ""
      : `Graf temperature u ovisnosti o ${snaga ? "vremenu grijanja" : "dovedenoj toplini"} za tvar ${tvar.naziv}, od ${fT(spec.od)} do ${fT(spec.do)}: ` +
          segs
            .map(
              (d) =>
                `dio ${d.br} ${d.ravno ? `vodoravan na ${fT(d.T0)}` : `kos od ${fT(d.T0)} do ${fT(d.T1)}`}`,
            )
            .join(", ") +
          ".",
  );
</script>

{#if kalorimetar}
  <FluidiKalorimetar {spec} {locked} {pokazi} {ishod} {onodgovor} />
{:else}
  {#if nacin === "istrazi"}
    <div class="kz-tekst"><Md text={spec.tekst} /></div>
  {:else}
    <div class="lx-question"><Md text={spec.tekst} /></div>
  {/if}

  <div
    class="lx-figure kz"
    role={kursorVidljiv ? "slider" : undefined}
    tabindex={kursorVidljiv ? 0 : undefined}
    aria-label={kursorVidljiv
      ? "Točka na krivulji: povuci ili koristi strelice"
      : undefined}
    aria-valuemin={kursorVidljiv ? 0 : undefined}
    aria-valuemax={kursorVidljiv ? n : undefined}
    aria-valuenow={kursorVidljiv ? u : undefined}
    aria-valuetext={kursorVidljiv && tren
      ? `${fT(tren.T)}, ${opisStanja}`
      : undefined}
    onkeydown={tipka}
  >
    <svg bind:this={svgEl} viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
      <!-- mreža i osi -->
      {#each yTicks as t (t)}
        <line class="kz-mreza" x1={L} y1={r1(Y(t))} x2={W - D} y2={r1(Y(t))} />
        <text class="kz-tick" x={L - 6} y={r1(Y(t)) + 4} text-anchor="end"
          >{formatNumber(t)}</text
        >
      {/each}
      <line class="kz-os" x1={L} y1={T - 6} x2={L} y2={H - B} />
      <line class="kz-os" x1={L} y1={H - B} x2={W - D + 4} y2={H - B} />
      <text class="kz-osT" x={L - 6} y={T - 10} text-anchor="end">t (°C)</text>
      {#if xOs && !skrijQ}
        {#each xOs.ticks as v (v)}
          {@const x = r1(xOfQ((v * xOs.f) / xOs.faktor))}
          <line class="kz-os" x1={x} y1={H - B} x2={x} y2={H - B + 4} />
          <text class="kz-tick" {x} y={H - B + 16} text-anchor="middle"
            >{formatNumber(v)}</text
          >
        {/each}
        <text class="kz-osT" x={W - D} y={H - 4} text-anchor="end"
          >{snaga ? "t" : "Q"} ({xOs.jed})</text
        >
      {:else}
        <text class="kz-osT" x={W - D} y={H - B + 18} text-anchor="end"
          >{snaga ? "vrijeme t →" : "dovedena toplina Q →"}</text
        >
      {/if}

      <!-- talište i vrelište -->
      {#each segs.filter((d) => d.ravno) as d (d.br)}
        <line
          class="kz-fazna"
          x1={L}
          y1={r1(Y(d.T0))}
          x2={pocetci[d.br - 1]}
          y2={r1(Y(d.T0))}
        />
        {#if nacin !== "odaberi" || pokaziRjesenje}
          <text
            class="kz-fazna-t"
            x={W - D - 2}
            y={r1(Y(d.T0)) + 14}
            text-anchor="end"
            >{d.vrsta === "taljenje" ? "talište" : "vrelište"} {fT(d.T0)}</text
          >
        {/if}
      {/each}

      <!-- označeni dijelovi (odaberi, ocitaj) -->
      {#each segs as d, i (d.br)}
        {@const st = stanjeDijela(d.br)}
        {#if st || istaknuti.includes(d.br)}
          <rect
            class="kz-pojas {st || 'ist'}"
            x={pocetci[i]}
            y={T - 6}
            width={sirine[i]}
            height={H - B - T + 6}
          />
        {/if}
      {/each}

      <polyline class="kz-krivulja" points={tockeKrivulje} />
      {#each segs as d, i (d.br)}
        {@const st = stanjeDijela(d.br)}
        <line
          class="kz-dio {st}"
          class:kz-ist={istaknuti.includes(d.br)}
          x1={r1(pocetci[i])}
          y1={r1(Y(d.T0))}
          x2={r1(pocetci[i] + sirine[i])}
          y2={r1(Y(d.T1))}
        />
        <g
          class="kz-broj {st}"
          class:kz-ist={istaknuti.includes(d.br)}
          transform="translate({r1(brojXY(d, i)[0])} {r1(brojXY(d, i)[1])})"
        >
          <circle r="9" />
          <text y="4" text-anchor="middle">{d.br}</text>
        </g>
        {#if i > 0}<circle
            class="kz-cvor"
            cx={r1(pocetci[i])}
            cy={r1(Y(d.T0))}
            r="2.5"
          />{/if}
      {/each}

      {#if nacin === "odaberi"}
        {#each segs as d, i (d.br)}
          <rect
            class="kz-hit"
            role="button"
            tabindex={locked ? -1 : 0}
            aria-label="Dio {d.br}"
            aria-pressed={oznaceni.includes(d.br)}
            x={pocetci[i]}
            y={T - 6}
            width={sirine[i]}
            height={H - B - T + 6}
            onclick={() => prebaci(d.br)}
            onkeydown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              (e.preventDefault(), prebaci(d.br))}
          />
        {/each}
      {/if}

      {#if kursorVidljiv && tren}
        {@const x = r1(xOfU(u))}
        {@const y = r1(Y(tren.T))}
        <line class="kz-vodilica" x1={x} y1={y} x2={x} y2={H - B} />
        <line class="kz-vodilica" x1={L} y1={y} x2={x} y2={y} />
        <circle class="kz-kursor" class:kz-vuce={vuce} cx={x} cy={y} r="7" />
        <rect
          class="kz-hit lx-handle"
          role="presentation"
          x={L - 8}
          y={T - 10}
          width={PW + 16}
          height={H - B - T + 22}
          onpointerdown={dolje}
          onpointermove={pomak}
          onpointerup={gore}
          onpointercancel={gore}
        />
      {/if}
    </svg>
  </div>

  {#if kursorVidljiv && tren}
    <div class="kz-panel">
      <div class="kz-kutija">
        <FluidiCestice
          tekuce={udjeli.tekuce}
          plin={udjeli.plin}
          {toplina}
          oznaka={`Čestice: ${opisStanja}`}
        />
      </div>
      <div class="kz-podaci" aria-live="polite">
        <div class="kz-T">{fT(tren.T)}</div>
        <div class="kz-stanje">dio {tren.d.br}: {opisStanja}</div>
        {#if !shem && tren.Q != null && !skrijQ}
          <div class="kz-q mono">
            Q = {fQ(tren.Q)}{snaga
              ? ` · t = ${fmtJ(tren.Q / snaga, "s", 3)}`
              : ""}
          </div>
        {/if}
        <div class="kz-formula mono">{formula(tren.d)}</div>
      </div>
    </div>
    {#if nacin === "istrazi"}
      <div class="lx-actions kz-akcije">
        <button type="button" class="btn btn-ghost" onclick={pusti}
          >{grije
            ? "Zaustavi grijač"
            : u >= n - 1e-6
              ? "Ispočetka"
              : "Uključi grijač"}</button
        >
        <span class="kz-hint">ili povuci točku po krivulji</span>
      </div>
    {/if}
  {/if}

  {#if !shem && (nacin !== "odaberi" || pokaziRjesenje)}
    <p class="kz-podatci-tvari">
      {tvar.naziv}, m = {fmtMasa(spec.m)}{segs.some((d) => d.stanje === "kruto")
        ? ` · c(kruto) = ${fmtBroj(tvar.c_kruto)}`
        : ""}{segs.some((d) => d.stanje === "tekuce")
        ? ` · c(tekuće) = ${fmtBroj(tvar.c_tekuce)}`
        : ""}{segs.some((d) => d.stanje === "plin")
        ? ` · c(plin) = ${fmtBroj(tvar.c_plin)}`
        : ""} J/(kg·K){segs.some((d) => d.vrsta === "taljenje")
        ? ` · λ = ${fmtBroj(tvar.lambda)} J/kg`
        : ""}{segs.some((d) => d.vrsta === "isparavanje")
        ? ` · r = ${fmtBroj(tvar.r)} J/kg`
        : ""}{snaga ? ` · P = ${fmtBroj(snaga)} W` : ""}
    </p>
  {/if}

  {#if nacin === "odaberi"}
    <p class="kz-hint kz-sredina">
      Dodirni dijelove grafa (možeš ih označiti više), pa provjeri.
    </p>
    {#if pokaziRjesenje}
      <ul class="kz-legenda">
        {#each segs as d (d.br)}<li class:ok={tocni.includes(d.br)}>
            <b>{d.br}</b>
            {NAZIV_DIJELA[d.vrsta]}
          </li>{/each}
      </ul>
    {/if}
    <div class="lx-actions">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeri}
        disabled={locked || !oznaceni.length}>Provjeri</button
      >
      {#if oznaceni.length}<span class="kz-hint"
          >označeno: {oznaceni.join(", ")}</span
        >{/if}
    </div>
  {:else if nacin === "ocitaj"}
    <BrojUnos
      {jedinica}
      {locked}
      {ishod}
      bind:vrijednost={unos}
      {onodgovor}
      oznaka="Odgovor"
    />
  {/if}
{/if}

<style>
  .kz-tekst {
    margin-bottom: 12px;
  }
  .kz {
    max-width: 480px;
    border-radius: var(--r-lg);
    outline: none;
  }
  .kz:focus-visible {
    box-shadow: 0 0 0 2px var(--primary-border);
  }
  .kz-mreza {
    stroke: var(--border);
    stroke-width: 1;
  }
  .kz-os {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .kz-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .kz-osT {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .kz-fazna {
    stroke: var(--text-dim);
    stroke-dasharray: 3 4;
    stroke-width: 1;
  }
  .kz-fazna-t {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .kz-pojas {
    fill: transparent;
  }
  .kz-pojas.ist {
    fill: color-mix(in srgb, var(--primary) 9%, transparent);
  }
  .kz-pojas.sel {
    fill: color-mix(in srgb, var(--primary) 14%, transparent);
  }
  .kz-pojas.ok {
    fill: color-mix(in srgb, var(--success) 16%, transparent);
  }
  .kz-pojas.bad {
    fill: color-mix(in srgb, var(--danger) 14%, transparent);
  }
  .kz-krivulja {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .kz-dio {
    stroke: transparent;
    stroke-width: 4;
    stroke-linecap: round;
  }
  .kz-dio.kz-ist,
  .kz-dio.sel {
    stroke: var(--primary);
  }
  .kz-dio.ok {
    stroke: var(--success);
  }
  .kz-dio.bad {
    stroke: var(--danger);
  }
  .kz-broj circle {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .kz-broj text {
    fill: var(--text);
    font: 700 11px var(--font-sans);
  }
  .kz-broj.sel circle,
  .kz-broj.kz-ist circle {
    stroke: var(--primary);
    fill: var(--primary);
  }
  .kz-broj.sel text,
  .kz-broj.kz-ist text,
  .kz-broj.ok text,
  .kz-broj.bad text {
    fill: var(--on-primary, #fff);
  }
  .kz-broj.ok circle {
    stroke: var(--success);
    fill: var(--success);
  }
  .kz-broj.bad circle {
    stroke: var(--danger);
    fill: var(--danger);
  }
  .kz-cvor {
    fill: var(--text);
  }
  .kz-hit {
    fill: transparent;
    pointer-events: all;
    cursor: pointer;
    outline: none;
  }
  .kz-hit:focus-visible {
    stroke: var(--primary);
    stroke-dasharray: 4 3;
  }
  .kz-vodilica {
    stroke: var(--primary);
    stroke-dasharray: 3 3;
    stroke-width: 1;
  }
  .kz-kursor {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2.5;
  }
  .kz-panel {
    display: flex;
    gap: 14px;
    align-items: center;
    max-width: 440px;
    margin: 0 auto 6px;
  }
  .kz-kutija {
    flex: 0 0 104px;
  }
  .kz-podaci {
    display: grid;
    gap: 3px;
    min-width: 0;
    font-size: 13px;
  }
  .kz-T {
    font: 700 20px var(--font-mono);
    color: var(--text);
  }
  .kz-stanje {
    color: var(--text);
  }
  .kz-q {
    color: var(--text);
  }
  .kz-formula {
    color: var(--text-dim);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .kz-akcije {
    justify-content: center;
    margin-top: 6px;
  }
  .kz-hint {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .kz-sredina {
    text-align: center;
    margin: 0;
  }
  .kz-podatci-tvari {
    text-align: center;
    font: 12px var(--font-mono);
    color: var(--text-dim);
    margin: 6px 0 10px;
  }
  .kz-legenda {
    list-style: none;
    padding: 0;
    margin: 8px auto 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    justify-content: center;
    font-size: 13px;
    color: var(--text-dim);
  }
  .kz-legenda li.ok {
    color: var(--success);
    font-weight: 600;
  }
</style>
