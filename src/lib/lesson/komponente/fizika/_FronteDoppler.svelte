<script>
  // valne_fronte, scena „pokretni_izvor“: cesta odozgo, vozilo sa sirenom prolazi kraj promatrača. Fronte, položaj
  // vozila, frekvencija koju promatrač čuje, graf i ono što je prije odgovora skriveno dolaze iz
  // katalog/fizika/valne_fronte.js; ovdje se samo crta, pušta zvuk i prosljeđuje unos.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import Ocitanja from "./_SileOcitanja.svelte";
  import Polja from "./_FrontePolja.svelte";
  import {
    valne_fronte,
    fizikaDopplera,
    rasporedDopplera,
    usporenjeDopplera,
    trajanjeVoznje,
    polozajIzvora,
    primljenaFrekvencija,
    fronteDopplera,
    grafDopplera,
    vidljivoDopplera,
    ocitanjaDopplera,
    tocnaProcjena,
    tocanPolozajKlizaca,
    PROCJENE,
    TON,
  } from "$lib/lesson/katalog/fizika/valne_fronte.js";
  import {
    pocetneVrijednosti,
    klizaciOd,
  } from "$lib/lesson/katalog/fizika/_sile.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const rs = untrack(() => rasporedDopplera(spec));
  const S = 3.6; // px po metru
  const W = rs.sirina * S;
  const H = rs.visina * S;
  const r1 = (n) => Math.round(n * 10) / 10;
  const X = (x) => r1(x * S);
  const uid = Math.random().toString(36).slice(2, 8);
  const zvucnik = untrack(() => spec.ikona === "zvucnik");

  let p = $state(untrack(() => pocetneVrijednosti(spec)));
  let fz = $derived(fizikaDopplera(spec, p));

  let otkriveno = $derived(istrazi || pokazi || !!ishod?.tocno);
  let vid = $derived(vidljivoDopplera(spec, otkriveno));

  // ── vrijeme (stvarne sekunde; prikaz usporen) ──
  const kappa = untrack(() => usporenjeDopplera(spec, rs));
  let traje = $derived(trajanjeVoznje(spec, p, rs));
  let t = $state(0);
  const mirnoT = () =>
    vid.voznja ? (Number.isFinite(traje) ? 0.42 * traje : 1) : 1;
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      if (prefersReducedMotion.current) {
        t = mirnoT();
        zadnji = 0;
      } else {
        const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
        zadnji = now;
        t += dt / kappa;
        if (vid.voznja && t > traje) t = 0;
      }
      zvukKorak();
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => {
      cancelAnimationFrame(id);
      zaustaviZvuk();
    };
  });
  // nova brzina ili otkriveno: vožnja kreće iznova slijeva
  $effect(() => {
    void p;
    void vid.voznja;
    untrack(() => (t = 0));
  });

  let xIzvora = $derived(
    vid.voznja ? polozajIzvora(spec, p, t, rs) : rs.xParkirano,
  );
  let fronte = $derived(
    vid.fronte === "voznja"
      ? fronteDopplera(spec, p, t, rs)
      : vid.fronte === "mirno"
        ? fronteDopplera(spec, p, t, rs, { mirno: true })
        : [],
  );
  let fSad = $derived(
    vid.voznja ? primljenaFrekvencija(spec, p, t, rs).f_p : fz.f,
  );
  let stavke = $derived(ocitanjaDopplera(spec, p, vid.ocitanja, t, rs));
  let bljesak = $derived(Math.floor(t * kappa * 3) % 2 === 0);
  let strelica = $derived(
    vid.voznja && fz.vi > 0 ? 18 + (50 * fz.vi) / fz.v : 0,
  );

  // ── graf f_p(t) ──
  const GX0 = 50;
  const GX1 = 350;
  const GY0 = 18;
  const GY1 = 100;
  let g = $derived(vid.graf ? grafDopplera(spec, p, rs) : null);
  const gx = (tt) => r1(GX0 + ((GX1 - GX0) * tt) / g.trajanje);
  const gy = (f) => r1(GY1 - ((GY1 - GY0) * (f - g.fMin)) / (g.fMax - g.fMin));
  let cijela = $derived(
    g ? g.tocke.map((q) => `${gx(q.t)},${gy(q.f)}`).join(" ") : "",
  );
  let prijedeno = $derived(
    g
      ? [
          ...g.tocke.filter((q) => q.t <= t),
          { t: Math.min(t, g.trajanje), f: fSad },
        ]
          .map((q) => `${gx(q.t)},${gy(q.f)}`)
          .join(" ")
      : "",
  );
  // oznake crta s razmakom da se ne preklapaju
  let crte = $derived.by(() => {
    if (!g) return [];
    const c = (fz.vi > 0 ? g.crte : g.crte.filter((x) => x.kljuc === "f")).map(
      (x) => ({ ...x, y: gy(x.f), ty: gy(x.f) + 4 }),
    );
    c.sort((a, b) => a.y - b.y);
    for (let i = 1; i < c.length; i++)
      if (c[i].ty - c[i - 1].ty < 11) c[i].ty = c[i - 1].ty + 11;
    return c;
  });

  // ── zvuk (Web Audio): ton f_p koji promatrač upravo čuje, glasniji kad je vozilo blizu ──
  let zvuk = $state(false);
  let ctx = null;
  let osc = null;
  let gain = null;
  function pokreniZvuk() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = fSad;
    gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    zvuk = true;
  }
  function zaustaviZvuk() {
    const c = ctx;
    try {
      gain?.gain.setTargetAtTime(0, c.currentTime, 0.03);
    } catch {
      /* zvuk je već ugašen */
    }
    if (c) setTimeout(() => c.close().catch(() => {}), 250);
    ctx = osc = gain = null;
    zvuk = false;
  }
  function zvukKorak() {
    if (!osc || !ctx) return;
    if (!vid.zvuk) return zaustaviZvuk();
    const d = Math.hypot(xIzvora - rs.xPromatraca, rs.yPromatraca - rs.yCeste);
    osc.frequency.setTargetAtTime(fSad, ctx.currentTime, 0.015);
    gain.gain.setTargetAtTime(
      0.02 + 0.07 * Math.min(1, 10 / d),
      ctx.currentTime,
      0.05,
    );
  }
  const prebaciZvuk = () => (zvuk ? zaustaviZvuk() : pokreniZvuk());

  // ── odgovori ──
  // svelte-ignore state_referenced_locally
  let procjene = $state((spec.pitanja ?? []).map(() => null));
  let poslano = $state(null);
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "predvidi")
        procjene = spec.pitanja.map((q) => tocnaProcjena(q.faza));
      if (nacin === "postavi") {
        const k = klizaciOd(spec)[0];
        p = { ...p, [k.id]: tocanPolozajKlizaca(spec) };
      }
    });
  });
  let neprom = $derived(
    poslano != null && poslano.every((x, i) => x === procjene[i]),
  );
  const stanjeProcjene = (i, id) => {
    if (procjene[i] !== id) return "";
    if (pokazi) return "ok";
    // nakon krivog odgovora ne označavamo pojedina pitanja (to bi suzilo izbor): samo poruka da nije točno
    if (neprom && ishod?.tocno) return "ok";
    return "sel";
  };
  function provjeriProcjene() {
    if (locked || procjene.some((x) => !x)) return;
    poslano = [...procjene];
    onodgovor([...procjene]);
  }
  function provjeriBrzinu() {
    if (locked) return;
    onodgovor({ ...p });
  }
  const PITANJE = {
    priblizava: "Dok ti se vozilo **približava**, čuješ ton koji je",
    udaljava: "Kad vozilo **prođe** i udaljava se, čuješ ton koji je",
    miruje: "Dok vozilo **stoji** sa sirenom, čuješ ton koji je",
  };
  const polja = untrack(() =>
    nacin === "izracunaj"
      ? spec.pitaj.map((q) => ({
          oznaka:
            q.oznaka ??
            (q.faza === "priblizava"
              ? "$f_{\\text{prije}} =$"
              : "$f_{\\text{poslije}} =$"),
          jedinica: "Hz",
        }))
      : [],
  );

  let opis = $derived(
    `Cesta odozgo: ${zvucnik ? "zvučnik" : "vozilo sa sirenom"} ${vid.voznja ? `vozi slijeva nadesno brzinom ${fz.vi} m/s` : "stoji"} i prolazi kraj tebe. ${vid.fronte === "voznja" && fz.vi > 0 ? "Ispred njega su fronte zgusnute, iza razrijeđene." : ""}`,
  );
</script>

{#if istrazi}
  <div class="vd-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure vd">
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
    <defs>
      <clipPath id="vd-okvir-{uid}">
        <rect x="0" y="0" width={W} height={H} rx="12" />
      </clipPath>
      <marker
        id="vd-vrh-{uid}"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M0,0 L10,5 L0,10 z" class="vd-vrh" />
      </marker>
    </defs>
    <g clip-path="url(#vd-okvir-{uid})">
      <rect class="vd-trava" x="0" y="0" width={W} height={H} />
      <rect
        class="vd-cesta"
        x="0"
        y={X(rs.yCeste - rs.poluCeste)}
        width={W}
        height={X(2 * rs.poluCeste)}
      />
      <line class="vd-crta" x1="0" y1={X(rs.yCeste)} x2={W} y2={X(rs.yCeste)} />
      {#each fronte as f, i (i)}
        <circle
          class="vd-fronta"
          cx={X(f.x)}
          cy={X(f.y)}
          r={X(f.r)}
          opacity={r1((1 - 0.8 * f.udio) * 10) / 10}
        />
      {/each}
    </g>

    {#if vid.brojke && vid.voznja && fz.vi > 0}
      {@const xa = xIzvora + 22}
      {@const xb = xIzvora - 22}
      {#if xa < rs.sirina - 8}
        <text
          class="vd-natpis"
          x={X(xa)}
          y={X(rs.yCeste - 7)}
          text-anchor="middle">ispred: gušće</text
        >
      {/if}
      {#if xb > 8}
        <text
          class="vd-natpis"
          x={X(xb)}
          y={X(rs.yCeste - 7)}
          text-anchor="middle">iza: rjeđe</text
        >
      {/if}
    {/if}

    <!-- promatrač -->
    <g transform="translate({X(rs.xPromatraca)} {X(rs.yPromatraca)})">
      <ellipse class="vd-ramena" cx="0" cy="2" rx="10" ry="5.5" />
      <circle class="vd-glava" cx="0" cy="0" r="5.5" />
      <text class="vd-ti" x="0" y="20" text-anchor="middle">ti</text>
    </g>

    <!-- izvor -->
    {#if xIzvora < rs.sirina + 6}
      <g transform="translate({X(xIzvora)} {X(rs.yCeste)})">
        {#if strelica}
          <line
            class="vd-strelica"
            x1="-8"
            y1="-17"
            x2={r1(strelica - 8)}
            y2="-17"
            marker-end="url(#vd-vrh-{uid})"
          />
          <text class="vd-vi" x={r1(strelica)} y="-13" text-anchor="start"
            >v<tspan baseline-shift="sub" font-size="8">i</tspan></text
          >
        {/if}
        <g transform="scale(1.2)">
          {#if zvucnik}
            <rect
              class="vd-kolica"
              x="-11"
              y="-8"
              width="22"
              height="16"
              rx="3"
            />
            <path class="vd-membrana" d="M2,-6 L9,-9 L9,9 L2,6 Z" />
            <circle
              class="vd-sirena"
              class:vd-svijetli={bljesak}
              cx="-4"
              cy="0"
              r="3"
            />
          {:else}
            <rect
              class="vd-auto"
              x="-15"
              y="-7.5"
              width="30"
              height="15"
              rx="4"
            />
            <rect
              class="vd-staklo"
              x="5"
              y="-6"
              width="5"
              height="12"
              rx="1.5"
            />
            <rect class="vd-pruga" x="-13" y="-1.2" width="16" height="2.4" />
            <rect
              class="vd-sirena"
              class:vd-svijetli={bljesak}
              x="-4"
              y="-6"
              width="5"
              height="5"
              rx="1"
            />
            <rect
              class="vd-sirena vd-sirena2"
              class:vd-svijetli={!bljesak}
              x="-4"
              y="1"
              width="5"
              height="5"
              rx="1"
            />
          {/if}
        </g>
      </g>
    {/if}
  </svg>
  <figcaption class="vd-napomena">
    {#if vid.fronte === "mirno"}
      Vozilo još stoji: fronte su jednako razmaknute na sve strane. Odgovori, pa
      ga pusti.
    {:else if vid.fronte === "nista"}
      Vozilo još stoji. Odgovori, pa ga pusti.
    {:else}
      Prikaz je usporen, a razmak fronti nije u mjerilu; omjer brzine vozila i
      brzine zvuka jest.
    {/if}
  </figcaption>
</figure>

{#if g}
  <figure class="lx-figure vd-graf">
    <svg
      viewBox="0 0 360 128"
      role="img"
      aria-label="Graf frekvencije koju čuješ u vremenu: {crte
        .map((c) => c.oznaka)
        .join(', ')}"
    >
      <text class="vd-g-os" x="4" y="10">f (Hz)</text>
      <line class="vd-g-osi" x1={GX0} y1={GY1} x2={GX1} y2={GY1} />
      <line class="vd-g-osi" x1={GX0} y1={GY0 - 6} x2={GX0} y2={GY1} />
      <text class="vd-g-os" x={GX1} y={GY1 + 12} text-anchor="end">t</text>
      {#if g.tProlaz != null && g.tProlaz < g.trajanje}
        <line
          class="vd-g-prolaz"
          x1={gx(g.tProlaz)}
          y1={GY0 - 6}
          x2={gx(g.tProlaz)}
          y2={GY1}
        />
        <text
          class="vd-g-faza"
          x={r1((GX0 + gx(g.tProlaz)) / 2)}
          y={GY1 + 22}
          text-anchor="middle">približava se</text
        >
        <text
          class="vd-g-faza"
          x={r1((GX1 + gx(g.tProlaz)) / 2)}
          y={GY1 + 22}
          text-anchor="middle">udaljava se</text
        >
      {/if}
      {#each crte as c (c.kljuc)}
        <line
          class="vd-g-crta"
          class:vd-g-sirena={c.kljuc === "f"}
          x1={GX0}
          y1={c.y}
          x2={GX1}
          y2={c.y}
        />
        <text
          class="vd-g-br"
          class:vd-g-br-sirena={c.kljuc === "f"}
          x={GX0 - 4}
          y={r1(c.ty)}
          text-anchor="end">{Math.round(c.f)}</text
        >
      {/each}
      <polyline class="vd-g-cijela" points={cijela} />
      <polyline class="vd-g-trag" points={prijedeno} />
      <circle
        class="vd-g-tocka"
        cx={gx(Math.min(t, g.trajanje))}
        cy={gy(fSad)}
        r="4"
      />
    </svg>
  </figure>
{/if}

<Ocitanja {stavke} />
{#if istrazi || nacin === "postavi"}
  <Klizaci
    klizaci={spec.klizaci ?? []}
    bind:vrijednosti={p}
    disabled={nacin === "postavi" && (locked || pokazi)}
  />
{/if}

<div class="lx-actions vd-akcije">
  {#if vid.zvuk && !prefersReducedMotion.current}
    <button
      type="button"
      class="btn btn-ghost"
      onclick={prebaciZvuk}
      aria-pressed={zvuk}>{zvuk ? "🔇 Ugasi zvuk" : "🔊 Uključi zvuk"}</button
    >
  {/if}
  {#if vid.voznja && !prefersReducedMotion.current && !istrazi}
    <button type="button" class="btn btn-ghost" onclick={() => (t = 0)}
      >↺ Iznova</button
    >
  {/if}
</div>

{#if nacin === "predvidi"}
  <div class="vd-pitanja">
    {#each spec.pitanja as q, i (i)}
      <div class="vd-pit">
        <p class="vd-pit-t">
          <Md text={q.tekst ?? PITANJE[q.faza]} inline />
        </p>
        <div class="vd-izbor" role="radiogroup" aria-label="Ton {i + 1}">
          {#each PROCJENE as id (id)}
            {@const st = stanjeProcjene(i, id)}
            <button
              type="button"
              role="radio"
              aria-checked={procjene[i] === id}
              class="vd-gumb"
              class:sel={st === "sel"}
              class:ok={st === "ok"}
              class:bad={st === "bad"}
              disabled={locked || pokazi}
              onclick={() => (procjene[i] = id)}>{TON[id]}</button
            >
          {/each}
          <span class="vd-od">od sirene</span>
        </div>
      </div>
    {/each}
  </div>
  <div class="lx-actions vd-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriProcjene}
      disabled={locked || procjene.some((x) => !x)}>Provjeri</button
    >
  </div>
{:else if nacin === "izracunaj"}
  <Polja {polja} {locked} {ishod} {onodgovor} />
{:else if nacin === "postavi"}
  <div class="lx-actions vd-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriBrzinu}
      disabled={locked}>Provjeri</button
    >
  </div>
{/if}

{#if pokazi && !istrazi}
  <p class="lx-solution">
    Točan odgovor: <Md text={valne_fronte.tocanOdgovor(spec)} inline />
  </p>
{/if}

<style>
  .vd-tekst {
    margin-bottom: 10px;
  }
  .vd {
    max-width: 460px;
    margin-bottom: 6px;
  }
  .vd-trava {
    fill: color-mix(in srgb, var(--success) 9%, var(--bg-elev));
  }
  .vd-cesta {
    fill: color-mix(in srgb, var(--text-dim) 32%, var(--bg-elev));
  }
  .vd-crta {
    stroke: var(--bg-elev);
    stroke-width: 1.2;
    stroke-dasharray: 8 7;
  }
  .vd-fronta {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .vd-natpis {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .vd-ramena {
    fill: var(--text-dim);
  }
  .vd-glava {
    fill: var(--text);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .vd-ti {
    fill: var(--text);
    font: 700 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .vd-auto {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.3;
  }
  .vd-staklo {
    fill: color-mix(in srgb, var(--lx-water) 55%, var(--bg-elev));
  }
  .vd-pruga {
    fill: var(--danger);
  }
  .vd-kolica {
    fill: var(--text-dim);
    stroke: var(--text);
  }
  .vd-membrana {
    fill: var(--bg-elev);
    stroke: var(--text);
  }
  .vd-sirena {
    fill: color-mix(in srgb, var(--primary) 35%, var(--bg-elev));
  }
  .vd-sirena2 {
    fill: color-mix(in srgb, var(--danger) 35%, var(--bg-elev));
  }
  .vd-sirena.vd-svijetli {
    fill: var(--primary);
  }
  .vd-sirena2.vd-svijetli {
    fill: var(--danger);
  }
  .vd-strelica {
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .vd-vrh {
    fill: var(--text);
  }
  .vd-vi {
    fill: var(--text);
    font: italic 700 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .vd-napomena {
    text-align: center;
    font-size: 11.5px;
    color: var(--text-faint);
    margin-top: 5px;
    line-height: 1.4;
  }
  .vd-graf {
    max-width: 460px;
    margin-top: 0;
  }
  .vd-g-os {
    fill: var(--text-dim);
    font: italic 600 11px var(--font-sans);
  }
  .vd-g-osi {
    stroke: var(--border-strong);
  }
  .vd-g-prolaz {
    stroke: var(--text-faint);
    stroke-dasharray: 3 4;
  }
  .vd-g-faza {
    fill: var(--text-faint);
    font: 600 10.5px var(--font-sans);
  }
  .vd-g-crta {
    stroke: var(--text-faint);
    stroke-dasharray: 5 4;
    opacity: 0.8;
  }
  .vd-g-sirena {
    stroke-dasharray: 1 4;
  }
  .vd-g-br {
    fill: var(--text);
    font: 600 11px var(--font-mono);
  }
  .vd-g-br-sirena {
    fill: var(--text-faint);
  }
  .vd-g-cijela {
    fill: none;
    stroke: color-mix(in srgb, var(--primary) 30%, transparent);
    stroke-width: 1.5;
  }
  .vd-g-trag {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2.6;
    stroke-linejoin: round;
  }
  .vd-g-tocka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .vd-akcije {
    justify-content: center;
  }
  .vd-pitanja {
    display: grid;
    gap: 12px;
    max-width: 460px;
    margin: 6px auto 0;
  }
  .vd-pit-t {
    margin: 0 0 6px;
    line-height: 1.45;
  }
  .vd-izbor {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .vd-gumb {
    min-width: 64px;
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 15px;
  }
  .vd-gumb:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .vd-gumb.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .vd-gumb.ok {
    border-color: var(--lx-ok);
    background: color-mix(in srgb, var(--lx-ok) 12%, transparent);
  }
  .vd-gumb.bad {
    border-color: var(--lx-bad);
    background: color-mix(in srgb, var(--lx-bad) 12%, transparent);
  }
  .vd-gumb:disabled {
    cursor: default;
  }
  .vd-od {
    color: var(--text-dim);
    font-size: 14px;
  }
</style>
