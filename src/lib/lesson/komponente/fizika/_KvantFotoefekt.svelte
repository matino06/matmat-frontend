<script>
  // kvant/fotoefekt: svjetiljka, vakuumska cijev s katodom (metal) i kolektorom, izvor zaustavnog napona,
  // ampermetar i stupci bilance E_f = W_i + E_k. Fotoni, elektroni, kazaljka i stupci dolaze iz kataloga.
  import { FE } from "$lib/lesson/katalog/fizika/_kvant.js";

  let {
    kadar,
    stupci,
    f,
    vid,
    boja,
    oznakaZracenja = null,
    napon = "",
    opis = "",
  } = $props();
  let rgb = $derived(`rgb(${boja.join(" ")})`);
  const Lm = FE.lampa;
  const T = FE.cijev;
  const Kt = FE.katoda;
  const Ko = FE.kolektor;
  const yK = FE.krug.y;
  const A = FE.ampermetar;
  const S = FE.stupci;
  const pts = (t) => t.map((p) => p.join(",")).join(" ");
  const zrake = [0, 45, 90, 135, 180, 225, 270, 315];
</script>

<svg viewBox="0 0 360 240" role="img" aria-label={opis}>
  <!-- svjetiljka -->
  {#each zrake as z (z)}
    <line
      x1={Lm.x + Math.cos((z * Math.PI) / 180) * (Lm.r + 3)}
      y1={Lm.y + Math.sin((z * Math.PI) / 180) * (Lm.r + 3)}
      x2={Lm.x + Math.cos((z * Math.PI) / 180) * (Lm.r + 8)}
      y2={Lm.y + Math.sin((z * Math.PI) / 180) * (Lm.r + 8)}
      stroke={rgb}
      stroke-width="2"
      stroke-linecap="round"
      opacity={0.35 + 0.65 * Math.min(1, f.jakost / 100)}
    />
  {/each}
  <circle
    cx={Lm.x}
    cy={Lm.y}
    r={Lm.r}
    fill={rgb}
    stroke="var(--border-strong)"
    opacity={0.45 + 0.55 * Math.min(1, f.jakost / 100)}
  />
  {#if oznakaZracenja}
    <text x={Lm.x} y={Lm.y + 4} class="kvp-uv">{oznakaZracenja}</text>
  {/if}

  <!-- cijev -->
  <rect x={T.x} y={T.y} width={T.w} height={T.h} rx="16" class="kvp-cijev" />
  <rect x={Kt.x} y={Kt.y} width={Kt.w} height={Kt.h} rx="2" class="kvp-metal" />
  <rect
    x={Ko.x}
    y={Ko.y}
    width={Ko.w}
    height={Ko.h}
    rx="2"
    class="kvp-kolektor"
  />
  <text x={Kt.x + Kt.w / 2} y={T.y - 6} class="lx-label kvp-mali kvp-sred"
    >{f.metal}</text
  >
  <text x={Ko.x + Ko.w / 2} y={T.y - 6} class="lx-label kvp-mali kvp-sred"
    >kolektor</text
  >

  <!-- krug: katoda → izvor (+ prema katodi) → ampermetar → kolektor -->
  <polyline
    points="{Kt.x + Kt.w / 2},{Kt.y + Kt.h} {Kt.x + Kt.w / 2},{yK} {FE.izvor.x -
      6},{yK}"
    class="lx-stroke"
    stroke-width="1.5"
  />
  <polyline
    points="{FE.izvor.x + 6},{yK} {A.x - A.r},{yK}"
    class="lx-stroke"
    stroke-width="1.5"
  />
  <polyline
    points="{A.x + A.r},{yK} {Ko.x + Ko.w / 2},{yK} {Ko.x + Ko.w / 2},{Ko.y +
      Ko.h}"
    class="lx-stroke"
    stroke-width="1.5"
  />
  <line
    x1={FE.izvor.x - 6}
    y1={yK - 12}
    x2={FE.izvor.x - 6}
    y2={yK + 12}
    class="lx-stroke"
    stroke-width="2"
  />
  <line
    x1={FE.izvor.x + 6}
    y1={yK - 7}
    x2={FE.izvor.x + 6}
    y2={yK + 7}
    class="lx-stroke"
    stroke-width="4"
  />
  <text x={FE.izvor.x - 14} y={yK - 8} class="lx-label kvp-mali kvp-sred"
    >+</text
  >
  <text x={FE.izvor.x + 14} y={yK - 8} class="lx-label kvp-mali kvp-sred"
    >−</text
  >
  <text x={FE.izvor.x} y={yK + 24} class="lx-label kvp-mali kvp-sred"
    >{napon}</text
  >
  <circle cx={A.x} cy={yK} r={A.r} class="kvp-amp" />
  {#if vid.struja}
    <line
      x1={A.x}
      y1={yK + 6}
      x2={A.x + Math.sin((kadar.kazaljka * Math.PI) / 180) * 12}
      y2={yK + 6 - Math.cos((kadar.kazaljka * Math.PI) / 180) * 12}
      class="kvp-kazaljka"
    />
    <circle cx={A.x} cy={yK + 6} r="1.8" fill="var(--danger)" />
  {:else}
    <text x={A.x} y={yK + 4} class="kvp-upitnik">?</text>
  {/if}
  <text x={A.x} y={yK + 26} class="lx-label kvp-mali kvp-sred">A</text>

  <!-- fotoni -->
  {#each kadar.fotoni as p (p.k)}
    <polyline
      points={pts(p.tocke)}
      fill="none"
      stroke={rgb}
      stroke-width="2"
      stroke-linecap="round"
    />
  {/each}

  <!-- elektroni -->
  {#if vid.elektroni}
    {#each kadar.elektroni as e (e.k)}
      <circle
        cx={e.x}
        cy={e.y}
        r="3.6"
        class="kvp-e"
        opacity={(e.vraca ? 0.55 : 1) * e.blijedi}
      />
    {/each}
  {:else}
    <text x={(Kt.x + Ko.x) / 2 + 4} y={T.y + T.h / 2 + 5} class="kvp-upitnik"
      >?</text
    >
  {/if}

  <!-- stupci bilance -->
  {#if vid.bilanca && stupci}
    <line
      x1={S.x - 4}
      y1={S.y0}
      x2={S.x + 2 * S.w + 8}
      y2={S.y0}
      class="lx-faint"
    />
    <rect
      x={S.x}
      y={stupci.foton.y}
      width={S.w}
      height={Math.max(0.5, stupci.foton.visina)}
      rx="2"
      fill={rgb}
      stroke="var(--border-strong)"
    />
    <rect
      x={S.x + S.w + 4}
      y={stupci.W.y}
      width={S.w}
      height={Math.max(0.5, stupci.W.visina)}
      rx="2"
      class="kvp-w"
    />
    {#if stupci.Ek}
      <rect
        x={S.x + S.w + 4}
        y={stupci.Ek.y}
        width={S.w}
        height={Math.max(0.5, stupci.Ek.visina)}
        rx="2"
        class="kvp-ek"
      />
    {/if}
    <text x={S.x + S.w / 2} y={S.y0 + 12} class="lx-label kvp-mali kvp-sred"
      >E<tspan baseline-shift="sub" font-size="8">f</tspan></text
    >
    <text
      x={S.x + S.w * 1.5 + 4}
      y={S.y0 + 12}
      class="lx-label kvp-mali kvp-sred"
      >W<tspan baseline-shift="sub" font-size="8">i</tspan></text
    >
    {#if stupci.Ek && stupci.Ek.visina > 11}
      <text
        x={S.x + S.w * 1.5 + 4}
        y={stupci.Ek.y + stupci.Ek.visina / 2 + 4}
        class="kvp-unutra"
        >E<tspan baseline-shift="sub" font-size="7">k</tspan></text
      >
    {/if}
    {#if !stupci.izlazi}
      <text x={S.x + S.w / 2} y={stupci.foton.y - 5} class="kvp-malo"
        >premalo</text
      >
    {/if}
    <text x={S.x + S.w + 2} y={S.y0 + 25} class="lx-label kvp-mali kvp-sred"
      >u eV</text
    >
  {:else}
    <rect
      x={S.x}
      y={S.y1 + 30}
      width={2 * S.w + 4}
      height={S.y0 - S.y1 - 30}
      rx="4"
      class="kvp-prazno"
    />
    <text x={S.x + S.w + 2} y={(S.y0 + S.y1) / 2 + 20} class="kvp-upitnik"
      >?</text
    >
    <text x={S.x + S.w + 2} y={S.y0 + 12} class="lx-label kvp-mali kvp-sred"
      >bilanca</text
    >
  {/if}
  {#if vid.bilanca && stupci && !stupci.izlazi && vid.elektroni}
    <text
      x={(Kt.x + Ko.x) / 2 + 4}
      y={T.y + 18}
      class="lx-label kvp-mali kvp-sred">nijedan elektron ne izlazi</text
    >
  {/if}
</svg>

<style>
  .kvp-mali {
    font-size: 10.5px;
  }
  .kvp-sred {
    text-anchor: middle;
  }
  .kvp-uv {
    font-size: 9px;
    font-weight: 700;
    fill: #fff;
    text-anchor: middle;
  }
  .kvp-cijev {
    fill: color-mix(in srgb, var(--lx-water) 5%, transparent);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .kvp-metal {
    fill: var(--text-faint);
    stroke: var(--text-dim);
  }
  .kvp-kolektor {
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
  }
  .kvp-amp {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .kvp-kazaljka {
    stroke: var(--danger);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .kvp-upitnik {
    font-size: 15px;
    font-weight: 700;
    fill: var(--text-faint);
    text-anchor: middle;
  }
  .kvp-e {
    fill: var(--lx-water);
  }
  .kvp-w {
    fill: var(--text-faint);
    stroke: var(--border-strong);
  }
  .kvp-ek {
    fill: var(--primary);
  }
  .kvp-unutra {
    font-size: 9px;
    font-weight: 700;
    fill: #fff;
    text-anchor: middle;
  }
  .kvp-malo {
    font-size: 9.5px;
    fill: var(--danger);
    text-anchor: middle;
  }
  .kvp-prazno {
    fill: none;
    stroke: var(--border-strong);
    stroke-dasharray: 4 4;
  }
</style>
