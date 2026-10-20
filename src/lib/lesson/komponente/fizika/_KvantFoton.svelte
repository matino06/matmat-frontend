<script>
  // kvant/foton: laser, fotoni kao valni paketi s „kovanicom“ energije, detektor i os energije fotona.
  // Sve koordinate dolaze iz katalog/fizika/_kvant.js (kadarFoton); ovdje se samo crta.
  import { FOTON } from "$lib/lesson/katalog/fizika/_kvant.js";

  let {
    kadar,
    vid,
    boja,
    oznakaZracenja = null,
    izvor = "",
    opis = "",
  } = $props();
  const uid = Math.random().toString(36).slice(2, 8);
  const L = FOTON.laser;
  const D = FOTON.detektor;
  let rgb = $derived(`rgb(${boja.join(" ")})`);
  let m = $derived(kadar.mjerilo);
  const pts = (t) => t.map((p) => p.join(",")).join(" ");
</script>

<svg viewBox="0 62 360 180" role="img" aria-label={opis}>
  <defs>
    <linearGradient
      id="kvf-spektar-{uid}"
      gradientUnits="userSpaceOnUse"
      x1={m.vidljivo.x0}
      x2={m.vidljivo.x1}
      y1="0"
      y2="0"
    >
      {#each m.vidljivo.boje as b, i (i)}
        <stop
          offset={(b.x - m.vidljivo.x0) / (m.vidljivo.x1 - m.vidljivo.x0)}
          stop-color="rgb({b.rgb.join(' ')})"
        />
      {/each}
    </linearGradient>
  </defs>

  <!-- snop -->
  <line
    x1={FOTON.x0}
    y1={FOTON.y}
    x2={FOTON.x1}
    y2={FOTON.y}
    stroke={rgb}
    stroke-width="22"
    stroke-linecap="round"
    opacity="0.1"
  />

  <!-- laser -->
  <rect x={L.x} y={L.y} width={L.w} height={L.h} rx="7" class="kvf-tijelo" />
  <rect
    x={L.x + L.w - 4}
    y={L.y + 9}
    width="8"
    height="12"
    rx="2"
    class="kvf-tijelo"
  />
  <circle cx={L.x + 14} cy={L.y + 15} r="4" fill={rgb} />
  {#if izvor}
    <text
      x={L.x + L.w / 2}
      y={L.y + L.h + 16}
      class="lx-label kvf-mali kvf-sred">{izvor}</text
    >
  {/if}
  {#if oznakaZracenja}
    <text x={L.x + L.w / 2} y={L.y - 8} class="lx-label kvf-mali kvf-sred"
      >{oznakaZracenja} (nevidljivo)</text
    >
  {/if}

  <!-- fotoni -->
  {#each kadar.fotoni as p (p.k)}
    <polyline
      points={pts(p.tocke)}
      fill="none"
      stroke={rgb}
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx={p.novcic.x} cy={p.novcic.y} r={p.novcic.r} class="kvf-novcic" />
  {/each}

  <!-- detektor -->
  <rect x={D.x} y={D.y} width={D.w} height={D.h} rx="4" class="kvf-tijelo" />
  <text x={D.x + D.w / 2} y={D.y - 14} class="lx-label kvf-mali kvf-sred"
    >detektor</text
  >
  <text x={D.x + D.w / 2} y={D.y + D.h + 14} class="kvf-broj"
    >{kadar.stiglo}</text
  >
  <text x={D.x + D.w / 2} y={D.y + D.h + 26} class="lx-label kvf-mali kvf-sred"
    >fotona</text
  >

  <!-- os energije fotona -->
  <g aria-hidden="true">
    <rect
      x={m.vidljivo.x0}
      y={m.y - 5}
      width={m.vidljivo.x1 - m.vidljivo.x0}
      height="10"
      rx="2"
      fill="url(#kvf-spektar-{uid})"
      opacity="0.85"
    />
    <line x1={m.x0} y1={m.y} x2={m.x1} y2={m.y} class="lx-faint" />
    {#each m.crtice as c (c.x)}
      <line x1={c.x} y1={m.y - 4} x2={c.x} y2={m.y + 8} class="lx-faint" />
      <text x={c.x} y={m.y + 20} class="lx-label kvf-mali kvf-sred"
        >{c.tekst}</text
      >
    {/each}
    <text x={m.vidljivo.x0 - 6} y={m.y - 10} class="lx-label kvf-mali kvf-desno"
      >← IC</text
    >
    <text x={m.vidljivo.x1 + 6} y={m.y - 10} class="lx-label kvf-mali"
      >UV →</text
    >
    <text x={m.x0} y={m.y + 36} class="lx-label kvf-mali"
      >energija jednog fotona (eV)</text
    >
    {#if vid.mjerilo}
      <path
        d="M {m.oznaka} {m.y - 7} l -6 -10 h 12 z"
        fill={rgb}
        stroke="var(--text)"
        stroke-width="1"
      />
      <circle cx={m.oznaka} cy={m.y - 24} r="5" class="kvf-novcic" />
    {/if}
  </g>
</svg>

<style>
  .kvf-tijelo {
    fill: var(--bg-elev-2);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .kvf-novcic {
    fill: #eab308;
    stroke: #a16207;
    stroke-width: 1;
  }
  .kvf-mali {
    font-size: 10.5px;
  }
  .kvf-sred {
    text-anchor: middle;
  }
  .kvf-desno {
    text-anchor: end;
  }
  .kvf-broj {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    fill: var(--text);
    text-anchor: middle;
  }
</style>
