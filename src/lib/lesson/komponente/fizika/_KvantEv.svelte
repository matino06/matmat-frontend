<script>
  // kvant/elektronvolt: elektron kreće uz − ploču i ubrzava prema + ploči; traka pokazuje dobivenu energiju.
  // Položaj elektrona i dobivena energija dolaze iz kataloga (kadarEV).
  import { EV } from "$lib/lesson/katalog/fizika/_kvant.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let { kadar, U, opis = "" } = $props();
  const B = { x: 92, y: 22, w: 176 };
  let tekst = $derived(
    kadar.stigao
      ? `+${formatNumber(U)} eV`
      : `${formatNumber(Math.round(kadar.dobiveno * 100) / 100)} eV`,
  );
</script>

<svg viewBox="0 0 360 240" role="img" aria-label={opis}>
  <!-- traka dobivene energije -->
  <text x={B.x} y={B.y - 6} class="lx-label kve-mali">dobivena energija</text>
  <rect x={B.x} y={B.y} width={B.w} height="10" rx="5" class="kve-traka" />
  <rect
    x={B.x}
    y={B.y}
    width={Math.max(0.1, B.w * kadar.udio)}
    height="10"
    rx="5"
    class="kve-puna"
  />
  <text
    x={B.x + B.w + 8}
    y={B.y + 9}
    class="kve-broj"
    class:kve-ok={kadar.stigao}>{tekst}</text
  >

  <!-- ploče -->
  <rect
    x={EV.xm - 5}
    y={EV.y0}
    width="10"
    height={EV.y1 - EV.y0}
    rx="2"
    class="kve-ploca"
  />
  <rect
    x={EV.xp - 5}
    y={EV.y0}
    width="10"
    height={EV.y1 - EV.y0}
    rx="2"
    class="kve-ploca"
  />
  <text x={EV.xm - 18} y={EV.y + 5} class="kve-znak">−</text>
  <text x={EV.xp + 18} y={EV.y + 5} class="kve-znak">+</text>

  <!-- krug s izvorom -->
  <polyline
    points="{EV.xm},{EV.y1} {EV.xm},205 172,205"
    class="lx-stroke"
    stroke-width="1.5"
  />
  <polyline
    points="{EV.xp},{EV.y1} {EV.xp},205 188,205"
    class="lx-stroke"
    stroke-width="1.5"
  />
  <line
    x1="174"
    y1="193"
    x2="174"
    y2="217"
    class="lx-stroke"
    stroke-width="2"
  />
  <line
    x1="186"
    y1="198"
    x2="186"
    y2="212"
    class="lx-stroke"
    stroke-width="4"
  />
  <text x="180" y="234" class="lx-label kve-sred">U = {formatNumber(U)} V</text>

  <!-- trag i elektron -->
  <line x1={EV.xm + 9} y1={EV.y} x2={kadar.x} y2={EV.y} class="kve-trag" />
  <circle
    cx={kadar.x}
    cy={kadar.y}
    r={kadar.stigao ? 10 : 8}
    class="kve-e"
    class:kve-sjaj={kadar.stigao}
  />
  <text x={kadar.x} y={kadar.y + 4} class="kve-e-t">e⁻</text>
</svg>

<style>
  .kve-mali {
    font-size: 11px;
  }
  .kve-sred {
    text-anchor: middle;
  }
  .kve-traka {
    fill: var(--bg-elev-2);
    stroke: var(--border-strong);
  }
  .kve-puna {
    fill: var(--primary);
  }
  .kve-broj {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    fill: var(--text);
  }
  .kve-ok {
    fill: var(--lx-ok);
  }
  .kve-ploca {
    fill: var(--text-faint);
    stroke: var(--border-strong);
  }
  .kve-znak {
    font-size: 20px;
    font-weight: 700;
    fill: var(--text-dim);
    text-anchor: middle;
  }
  .kve-trag {
    stroke: var(--lx-water);
    stroke-width: 2;
    stroke-dasharray: 3 4;
    opacity: 0.5;
  }
  .kve-e {
    fill: var(--lx-water);
  }
  .kve-sjaj {
    filter: drop-shadow(0 0 5px var(--lx-water));
  }
  .kve-e-t {
    font-size: 9px;
    font-weight: 700;
    fill: #fff;
    text-anchor: middle;
    pointer-events: none;
  }
</style>
