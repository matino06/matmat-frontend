<script>
  // Scena „filtri“: izvor → polarizacijski filtri koje učenik okreće → zastor. Svjetlina, valovi i krugovi „gledano
  // uzduž zrake“ dolaze iz katalog/fizika/polarizacija.js; ovdje se samo crta i vuče ručka.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Krug from "./_PolarizacijaKrug.svelte";
  import {
    scenaFiltri,
    valoviFiltri,
    rjesenjaFiltri,
    tockaRuba,
    kutIzTocke,
    zakljucaj,
    normOs,
    razlikaOsi,
    opisOsi,
    postotak,
    KORAK_FILTRA,
  } from "$lib/lesson/katalog/fizika/polarizacija.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const postavi = nacin === "postavi";
  const N = untrack(() => spec.filtri.length);
  const pomicni = untrack(() =>
    nacin === "prikaz"
      ? []
      : postavi
        ? [spec.mijenja]
        : spec.mijenja == null
          ? spec.filtri.map((_, i) => i)
          : [spec.mijenja].flat(),
  );
  const r1 = (n) => Math.round(n * 10) / 10;

  // kut ručke 0–360° (os filtra je pravac, ali ručka ostaje na strani na kojoj je prst)
  let ruke = $state(untrack(() => spec.filtri.map((f) => f.kut)));
  let kutovi = $derived(ruke.map(normOs));
  let poslano = $state(null);
  let aktivno = $derived(!postavi || (!locked && !pokazi));
  let otkriveno = $derived(
    !postavi ||
      locked ||
      pokazi ||
      (poslano != null &&
        poslano === ruke[spec.mijenja] &&
        ishod &&
        !ishod.prazno),
  );
  let scena = $derived(
    scenaFiltri(spec, kutovi, otkriveno ? null : spec.mijenja),
  );

  // pokaži: pomični filtar na najbliže rješenje
  $effect(() => {
    if (!pokazi || !postavi) return;
    untrack(() => {
      const m = spec.mijenja;
      const rj = rjesenjaFiltri(spec);
      const best = rj.reduce((a, b) =>
        razlikaOsi(b, ruke[m]) < razlikaOsi(a, ruke[m]) ? b : a,
      );
      ruke[m] = Math.round(best);
    });
  });

  // ── animacija ──
  let faza = $state(0);
  onMount(() => {
    let id;
    let prije = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        const dt = Math.min(0.05, (now - (prije || now)) / 1000);
        faza = (faza + dt * 0.9) % 1;
      }
      prije = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let valovi = $derived(valoviFiltri(scena, faza));

  // ── vučenje ručke ──
  let svgEl = $state();
  let vuce = -1;
  function down(e, i) {
    if (!aktivno) return;
    e.preventDefault();
    vuce = i;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (vuce < 0) return;
    const m = svgEl?.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const f = scena.filtri[vuce];
    if (Math.hypot(q.x - f.x, q.y - f.y) < 6) return;
    ruke[vuce] = zakljucaj(kutIzTocke([f.x, f.y], [q.x, q.y]));
  }
  const up = () => (vuce = -1);
  function key(e, i) {
    if (!aktivno) return;
    const d = {
      ArrowLeft: KORAK_FILTRA,
      ArrowUp: KORAK_FILTRA,
      ArrowRight: -KORAK_FILTRA,
      ArrowDown: -KORAK_FILTRA,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    ruke[i] = zakljucaj(ruke[i] + d);
  }
  function provjeri() {
    if (locked) return;
    poslano = ruke[spec.mijenja];
    onodgovor(normOs(ruke[spec.mijenja]));
  }

  const jakost = (I) => (I <= 0 ? 0 : 0.14 + 0.62 * Math.min(1, I));
  let zadnji = $derived(scena.segmenti.at(-1));
  let iz = $derived(scena.izvor);
  let z = $derived(scena.zastor);
  let opis = $derived.by(() => {
    const dijelovi = scena.filtri.map(
      (f) => `${f.indeks + 1}. filtar: os ${opisOsi(f.kut)}`,
    );
    const iza =
      scena.zastor.svjetlina == null
        ? "svjetlina iza filtra vidi se nakon provjere"
        : scena.zastor.svjetlina === 0
          ? "iza zadnjeg filtra je mrak"
          : "iza zadnjeg filtra ima svjetlosti";
    return `Svjetlost (${scena.izvor.naziv}) prolazi kroz ${N === 1 ? "polarizacijski filtar" : `${N} polarizacijska filtra`}. ${dijelovi.join("; ")}; ${iza}.`;
  });
  let razlika = $derived(
    N === 2 ? Math.round(razlikaOsi(kutovi[0], kutovi[1])) : null,
  );
  const uid = Math.random().toString(36).slice(2, 8);
</script>

<figure class="lx-figure pf">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {scena.sirina} {scena.visina}"
    role="img"
    aria-label={opis}
  >
    <defs>
      <radialGradient id="pf-sjaj-{uid}">
        <stop offset="0" stop-color="var(--warn)" stop-opacity="0.85" />
        <stop offset="1" stop-color="var(--warn)" stop-opacity="0" />
      </radialGradient>
    </defs>
    <text class="pf-mali" x="6" y="12">gledano uzduž zrake:</text>

    <!-- zraka po dijelovima -->
    {#each scena.segmenti as g, i (i)}
      {#if g.skriven}
        <line class="pf-skrivena" x1={g.od} y1={g.y} x2={g.do} y2={g.y} />
      {:else if g.intenzitet > 0}
        <line
          class="pf-zraka"
          x1={g.od}
          y1={g.y}
          x2={g.do}
          y2={g.y}
          opacity={jakost(g.intenzitet)}
        />
      {:else}
        <line class="pf-mrak" x1={g.od} y1={g.y} x2={g.do} y2={g.y} />
      {/if}
      <line
        class="pf-veza"
        x1={g.krug.x}
        y1={g.krug.y + g.krug.r}
        x2={g.krug.x}
        y2={g.y - 24}
      />
      <Krug
        x={g.krug.x}
        y={g.krug.y}
        r={g.krug.r}
        strelice={g.krug.strelice}
        upitnik={g.skriven}
        mrak={!g.skriven && g.intenzitet === 0}
      />
      {#if spec.prikazi_postotak && !g.skriven}
        <text
          class="pf-posto"
          x={g.krug.x}
          y={g.krug.y + g.krug.r + 12}
          text-anchor="middle">{postotak(g.intenzitet)}</text
        >
      {/if}
    {/each}
    {#each valovi as v, i (i)}
      <polyline
        class="pf-val"
        points={v.tocke.map((p) => p.join(",")).join(" ")}
        opacity={v.jakost}
      />
    {/each}

    <!-- izvor -->
    <circle cx={iz.x} cy={iz.y} r="24" fill="url(#pf-sjaj-{uid})" />
    {#if iz.vrsta === "sunce"}
      {#each Array.from({ length: 8 }, (_, k) => k * 45) as k (k)}
        <line
          class="pf-zraka-sunca"
          x1={r1(iz.x + 13 * Math.cos((k * Math.PI) / 180))}
          y1={r1(iz.y + 13 * Math.sin((k * Math.PI) / 180))}
          x2={r1(iz.x + 19 * Math.cos((k * Math.PI) / 180))}
          y2={r1(iz.y + 19 * Math.sin((k * Math.PI) / 180))}
        />
      {/each}
      <circle class="pf-izvor" cx={iz.x} cy={iz.y} r="10" />
    {:else if iz.vrsta === "svijeca"}
      <rect
        class="pf-svijeca"
        x={iz.x - 5}
        y={iz.y + 2}
        width="10"
        height="22"
        rx="2"
      />
      <path class="pf-izvor" d="M{iz.x},{iz.y - 14} q7,9 0,15 q-7,-6 0,-15 z" />
    {:else}
      <circle class="pf-izvor" cx={iz.x} cy={iz.y - 2} r="10" />
      <rect
        class="pf-grlo"
        x={iz.x - 5}
        y={iz.y + 7}
        width="10"
        height="8"
        rx="1.5"
      />
    {/if}
    <text class="pf-oznaka" x={iz.x} y={iz.y + 42} text-anchor="middle"
      >{iz.naziv}</text
    >

    <!-- zastor -->
    {#if z.svjetlina != null && z.svjetlina > 0}
      <ellipse
        cx={z.x + 3}
        cy={z.y}
        rx="10"
        ry="30"
        fill="url(#pf-sjaj-{uid})"
        opacity={Math.min(1, 0.25 + 1.5 * z.svjetlina)}
      />
    {/if}
    <rect
      class="pf-zastor"
      class:pf-skriven={z.svjetlina == null}
      x={z.x}
      y={z.y - 44}
      width="9"
      height="88"
      rx="2"
    />
    {#if z.svjetlina != null && z.svjetlina > 0}
      <rect
        class="pf-mrlja"
        x={z.x}
        y={z.y - 9}
        width="9"
        height="18"
        rx="2"
        opacity={Math.min(1, 0.2 + 1.6 * z.svjetlina)}
      />
    {/if}
    {#if z.svjetlina == null}
      <text class="pf-upitnik" x={z.x + 4.5} y={z.y + 5} text-anchor="middle"
        >?</text
      >
    {/if}
    <text class="pf-oznaka" x={z.x + 4} y={z.y + 62} text-anchor="middle"
      >zastor</text
    >
    {#if z.svjetlina === 0}
      <text class="pf-mrak-t" x={z.x + 4} y={z.y - 52} text-anchor="middle"
        >mrak</text
      >
    {/if}

    <!-- filtri -->
    {#each scena.filtri as f (f.indeks)}
      {@const mice = pomicni.includes(f.indeks) && aktivno}
      {@const vrh = tockaRuba([f.x, f.y], f.r, ruke[f.indeks])}
      {@const dno = tockaRuba([f.x, f.y], f.r, ruke[f.indeks] + 180)}
      <polygon
        class="pf-disk"
        points={f.obrub.map((p) => p.join(",")).join(" ")}
      />
      {#each f.crte as c, j (j)}
        <line
          class="pf-crta"
          x1={c[0][0]}
          y1={c[0][1]}
          x2={c[1][0]}
          y2={c[1][1]}
        />
      {/each}
      <line
        class="pf-os"
        class:pf-os-mice={pomicni.includes(f.indeks)}
        x1={dno[0]}
        y1={dno[1]}
        x2={vrh[0]}
        y2={vrh[1]}
      />
      <text class="pf-oznaka" x={f.x} y={f.y + f.r + 30} text-anchor="middle"
        >{f.indeks + 1}. filtar</text
      >
      <text class="pf-kut" x={f.x} y={f.y + f.r + 44} text-anchor="middle"
        >os {Math.round(f.kut)}°</text
      >
      {#if mice}
        <g
          class="lx-handle pf-ruc"
          role="slider"
          tabindex="0"
          aria-label="Os {f.indeks +
            1}. filtra: povuci ručku ili okreći strelicama"
          aria-valuemin="0"
          aria-valuemax="180"
          aria-valuenow={Math.round(f.kut)}
          aria-valuetext={opisOsi(f.kut)}
          onpointerdown={(e) => down(e, f.indeks)}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
          onkeydown={(e) => key(e, f.indeks)}
        >
          <circle class="pf-hit" cx={vrh[0]} cy={vrh[1]} r="22" />
          <circle
            class="pf-rucka"
            class:pf-ceka={postavi && poslano == null}
            cx={vrh[0]}
            cy={vrh[1]}
            r="9"
          />
        </g>
      {/if}
    {/each}
  </svg>
</figure>

{#if N === 2 || postavi}
  <p class="lx-readout">
    {#if N === 2}kut između osi filtara: <b>{razlika}°</b>{/if}
    {#if postavi && otkriveno && zadnji && !zadnji.skriven}
      · iza filtra: <b>{zadnji.intenzitet === 0 ? "mrak" : "svjetlo"}</b>
    {/if}
    {#if postavi && !otkriveno}<span class="pf-napomena"
        >svjetlinu iza filtra vidjet ćeš nakon provjere</span
      >{/if}
  </p>
{/if}

{#if postavi}
  <p class="pf-uputa">
    Povuci ručku na rubu {spec.mijenja + 1}. filtra (ili ga okreći strelicama na
    tipkovnici), pa klikni Provjeri.
  </p>
  <div class="lx-actions pf-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
  </div>
{/if}

<style>
  .pf {
    max-width: 460px;
  }
  .pf svg {
    touch-action: manipulation;
    overflow: visible;
  }
  .pf-mali {
    fill: var(--text-faint);
    font: 500 10px var(--font-sans);
  }
  .pf-zraka {
    stroke: var(--warn);
    stroke-width: 10;
    stroke-linecap: round;
  }
  .pf-mrak {
    stroke: var(--border-strong);
    stroke-width: 1.5;
    stroke-dasharray: 2 5;
  }
  .pf-skrivena {
    stroke: var(--text-faint);
    stroke-width: 8;
    stroke-dasharray: 3 6;
    opacity: 0.35;
  }
  .pf-veza {
    stroke: var(--border-strong);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .pf-val {
    fill: none;
    stroke: color-mix(in srgb, var(--warn) 55%, var(--text));
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .pf-posto {
    fill: var(--text-dim);
    font: 600 10.5px var(--font-mono);
  }
  .pf-izvor {
    fill: var(--warn);
    stroke: color-mix(in srgb, var(--warn) 60%, var(--text));
    stroke-width: 1.2;
  }
  .pf-zraka-sunca {
    stroke: var(--warn);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .pf-svijeca {
    fill: color-mix(in srgb, var(--text-dim) 25%, var(--bg-elev));
    stroke: var(--text-dim);
  }
  .pf-grlo {
    fill: var(--text-dim);
  }
  .pf-oznaka {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .pf-kut {
    fill: var(--text);
    font: 600 11px var(--font-mono);
  }
  .pf-zastor {
    fill: color-mix(in srgb, var(--text) 14%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .pf-zastor.pf-skriven {
    fill: var(--bg-elev-2);
    stroke-dasharray: 3 3;
  }
  .pf-mrlja {
    fill: var(--warn);
  }
  .pf-upitnik {
    fill: var(--text-faint);
    font: 700 12px var(--font-sans);
  }
  .pf-mrak-t {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
  }
  .pf-disk {
    fill: color-mix(in srgb, var(--text-dim) 16%, transparent);
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .pf-crta {
    stroke: var(--text-dim);
    stroke-width: 1.1;
    opacity: 0.55;
  }
  .pf-os {
    stroke: var(--text);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .pf-os.pf-os-mice {
    stroke: var(--primary);
  }
  .pf-ruc {
    outline: none;
  }
  .pf-hit {
    fill: transparent;
  }
  .pf-rucka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .pf-ruc:focus-visible .pf-rucka {
    stroke: var(--text);
    stroke-width: 3;
  }
  .pf-rucka.pf-ceka {
    animation: pf-puls 1.4s ease-in-out infinite;
  }
  @keyframes pf-puls {
    50% {
      r: 12px;
    }
  }
  .pf-napomena {
    display: block;
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text-faint);
  }
  .pf-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 4px;
  }
  .pf-akcije {
    justify-content: center;
  }
</style>
