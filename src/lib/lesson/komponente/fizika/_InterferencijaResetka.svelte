<script>
  // Optička rešetka: laser, rešetka i kutomjer s maksimumima redova k pod kutovima sin α = kλ/d, polarna krivulja
  // intenziteta za N osvijetljenih pukotina i tablica kutova. Geometrija dolazi iz kataloga (_interferencija.js).
  import {
    RG,
    lukResetke,
    krivuljaResetke,
    redoviResetke,
    lukKuta,
    kutReda,
    fmt,
  } from "$lib/lesson/katalog/fizika/_interferencija.js";

  let {
    f,
    vid,
    boja,
    t = 0,
    animacija = true,
    oznake = null,
    cilj = null,
    opis = "",
  } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const luk = lukResetke();
  let rgb = $derived(`rgb(${boja.join(" ")})`);
  let krivulja = $derived(
    vid.intenzitet
      ? krivuljaResetke(f)
          .map((p) => p.join(","))
          .join(" ")
      : "",
  );
  let redovi = $derived(redoviResetke(f, vid.redoviVidljivi));
  let redKuta = $derived(vid.redKuta ?? 1);
  let kutR = $derived(kutReda(f, redKuta));
  let lukA = $derived(kutR != null ? lukKuta(kutR) : null);
  let faza = $derived(animacija ? (t * 0.6) % 1 : 0.3);
  const SNOP_L = 9;
  let fronte = $derived.by(() => {
    const out = [];
    for (let x = 38 + faza * SNOP_L; x < RG.cx - 4; x += SNOP_L)
      out.push(Math.round(x * 10) / 10);
    return out;
  });
  const zarezi = Array.from({ length: 23 }, (_, i) => RG.cy - 55 + i * 5);
  let tablica = $derived.by(() => {
    const out = [];
    for (let k = 1; k <= Math.min(f.kmax, 7); k++)
      out.push({ k, a: fmt(kutReda(f, k)) });
    return out;
  });
  const REDOSLIJED = ["lambda", "zareza_po_mm", "d", "alpha"];
  let linije = $derived.by(() => {
    if (!oznake) return [];
    const kljucevi = Object.keys(oznake);
    return [
      ...REDOSLIJED.filter((k) => k in oznake),
      ...kljucevi.filter((k) => !REDOSLIJED.includes(k)),
    ].map((k) => oznake[k]);
  });
</script>

<svg viewBox="0 0 {RG.W} {RG.H}" role="img" aria-label={opis} class="ifr">
  <defs>
    <filter id="ifr-sjaj-{uid}" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="2.5" />
    </filter>
  </defs>
  <rect x="0" y="0" width={RG.W} height={RG.H} rx="12" class="ifr-bg" />

  <!-- laser i snop -->
  <rect
    x={RG.laserX}
    y={RG.cy - 9}
    width="30"
    height="18"
    rx="3"
    class="ifr-laser"
  />
  <text x={RG.laserX + 3} y={RG.cy + 3.5} class="ifr-mali">laser</text>
  <line
    x1="36"
    x2={RG.cx - 3}
    y1={RG.cy}
    y2={RG.cy}
    stroke={rgb}
    stroke-width="3"
    opacity="0.6"
  />
  {#each fronte as x (x)}
    <line
      x1={x}
      x2={x}
      y1={RG.cy - 6}
      y2={RG.cy + 6}
      stroke={rgb}
      stroke-width="1.3"
    />
  {/each}

  <!-- kutomjer -->
  <path d={luk.luk} class="ifr-luk" />
  <line x1={RG.cx} x2={RG.cx + RG.R} y1={RG.cy} y2={RG.cy} class="ifr-nula" />
  {#if vid.stupnjevi}
    {#each luk.crtice as c (c.kut)}
      <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} class="ifr-crtica" />
      {#if c.oznaka}
        <text x={c.tx} y={c.ty + 3} text-anchor="middle" class="ifr-stupanj"
          >{c.oznaka}</text
        >
      {/if}
    {/each}
  {/if}

  <!-- rešetka -->
  <rect
    x={RG.cx - 3}
    y={RG.cy - 57}
    width="6"
    height="114"
    rx="1.5"
    class="ifr-resetka"
  />
  {#each zarezi as y (y)}
    <line x1={RG.cx - 3} x2={RG.cx + 3} y1={y} y2={y} class="ifr-zarez" />
  {/each}
  <text x={RG.cx} y={RG.cy + 72} text-anchor="middle" class="ifr-mali"
    >rešetka</text
  >

  <!-- maksimumi -->
  {#each redovi as r (r.k)}
    <line
      x1={RG.cx}
      y1={RG.cy}
      x2={r.x}
      y2={r.y}
      stroke={rgb}
      stroke-width="1.3"
      opacity={r.k === 0 ? 0.75 : 0.55}
    />
  {/each}
  {#if krivulja}
    <polyline
      points={krivulja}
      fill="none"
      stroke={rgb}
      stroke-width="1.4"
      opacity="0.95"
    />
  {/if}
  {#each redovi as r (r.k)}
    <circle
      cx={r.x}
      cy={r.y}
      r="7"
      fill={rgb}
      opacity="0.75"
      filter="url(#ifr-sjaj-{uid})"
    />
    <circle cx={r.x} cy={r.y} r="3.2" fill={rgb} class="ifr-tocka" />
    {#if vid.oznakeRedova && r.oznaka}
      <text x={r.ox} y={r.oy} text-anchor="middle" class="ifr-red"
        >{r.k < 0 ? `−${-r.k}` : r.k}</text
      >
    {/if}
  {/each}

  <!-- kut zadanog / prvog reda -->
  {#if lukA && (vid.kutovi || vid.zadaniKut) && (!vid.redoviVidljivi || vid.redoviVidljivi.includes(redKuta))}
    <path d={lukA.d} class="ifr-kut" />
    <text x={lukA.tx} y={lukA.ty} class="ifr-kut-t"
      >α{"₀₁₂₃₄₅₆₇₈₉"[redKuta] ?? ""}</text
    >
  {/if}

  <!-- desno: zadano ili tablica kutova -->
  {#if oznake}
    {#each linije as l, i (i)}
      <text x="240" y={36 + i * 21} class="ifr-ozn">{l}</text>
    {/each}
  {:else}
    {#if cilj}
      <text x="240" y="36" class="ifr-ozn">{cilj}</text>
    {/if}
    {#if vid.kutovi}
      <text x="240" y={cilj ? 62 : 36} class="ifr-mali">red k · kut α</text>
      {#each tablica as r, i (r.k)}
        <text x="240" y={(cilj ? 80 : 54) + i * 17} class="ifr-tab"
          >{r.k} · {r.a}°</text
        >
      {/each}
      {#if f.kmax > 7}
        <text x="240" y={(cilj ? 80 : 54) + 7 * 17} class="ifr-tab">…</text>
      {/if}
      <text
        x="240"
        y={(cilj ? 80 : 54) + Math.min(f.kmax, 7) * 17 + (f.kmax > 7 ? 34 : 14)}
        class="ifr-ozn">kₘₐₓ = {f.kmax}</text
      >
    {/if}
  {/if}
  <text x="8" y={RG.H - 8} class="ifr-sitno"
    >kutovi su u mjerilu, rešetka je povećana</text
  >
</svg>

<style>
  .ifr {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-select: none;
  }
  .ifr-bg {
    fill: #0e1117;
    stroke: var(--border);
  }
  .ifr-laser {
    fill: #2a3140;
    stroke: #64748b;
  }
  .ifr-mali {
    fill: #94a3b8;
    font: 500 9.5px var(--font-sans);
  }
  .ifr-sitno {
    fill: #64748b;
    font: 400 8.5px var(--font-sans);
  }
  .ifr-luk {
    fill: none;
    stroke: #334155;
    stroke-width: 1.5;
  }
  .ifr-nula {
    stroke: #334155;
    stroke-dasharray: 3 4;
  }
  .ifr-crtica {
    stroke: #64748b;
  }
  .ifr-stupanj {
    fill: #64748b;
    font: 500 8.5px var(--font-mono);
  }
  .ifr-resetka {
    fill: #64748b;
  }
  .ifr-zarez {
    stroke: #0e1117;
    stroke-width: 1.4;
  }
  .ifr-tocka {
    stroke: #f8fafc;
    stroke-width: 0.8;
  }
  .ifr-red {
    fill: #e2e8f0;
    font: 600 10px var(--font-mono);
  }
  .ifr-kut {
    fill: none;
    stroke: #fbbf24;
    stroke-width: 1.4;
  }
  .ifr-kut-t {
    fill: #fbbf24;
    font: 700 11px var(--font-sans);
  }
  .ifr-ozn {
    fill: #e2e8f0;
    font: 600 11.5px var(--font-sans);
  }
  .ifr-tab {
    fill: #cbd5e1;
    font: 500 11px var(--font-mono);
  }
</style>
