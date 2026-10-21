<script>
  // kvant/de_broglie: elektronski top, čestica kao valni paket i kristal s atomima na 0,1 nm. Val iznad atoma
  // nacrtan je u istom mjerilu kao razmak atoma. Koordinate dolaze iz kataloga (kadarDeBroglie).
  import { DB } from "$lib/lesson/katalog/fizika/_kvant.js";

  let { kadar, f, vid, opis = "" } = $props();
  const T = DB.top;
  const pts = (t) => t.map((p) => p.join(",")).join(" ");
  let lopta = $derived(
    f.id === "loptica" || (f.id === "vlastita" && f.m > 1e-6),
  );
</script>

<svg viewBox="0 46 360 194" role="img" aria-label={opis}>
  <!-- top -->
  <rect x={T.x} y={T.y} width={T.w} height={T.h} rx="6" class="kvb-tijelo" />
  <rect
    x={T.x + T.w - 2}
    y={DB.y - 5}
    width="8"
    height="10"
    rx="2"
    class="kvb-tijelo"
  />
  <text x={T.x + T.w / 2} y={T.y + T.h + 14} class="lx-label kvb-mali kvb-sred"
    >top</text
  >
  <line x1={DB.x0} y1={DB.y} x2={DB.x1} y2={DB.y} class="kvb-os" />

  <!-- čestica -->
  {#if kadar.crta}
    <polyline points={pts(kadar.paket)} class="kvb-val" />
  {:else if lopta}
    <circle cx={kadar.cestica.x} cy={DB.y} r="9" class="kvb-lopta" />
  {:else}
    <circle
      cx={kadar.cestica.x}
      cy={DB.y}
      r={f.id === "proton" ? 8 : 6.5}
      class={f.id === "proton" ? "kvb-p" : "kvb-e"}
    />
    <text x={kadar.cestica.x} y={DB.y + 3.5} class="kvb-e-t"
      >{f.id === "proton" ? "p⁺" : "e⁻"}</text
    >
  {/if}
  {#if !vid.val}
    <text x={kadar.cestica.x} y={DB.y - 16} class="kvb-upitnik">λ = ?</text>
  {/if}

  <!-- val u mjerilu iznad kristala -->
  {#if kadar.crta && kadar.ravnalo}
    <polyline points={pts(kadar.ravnalo)} class="kvb-ravnalo" />
    <line
      x1={kadar.mjeraLambda.x0}
      y1={kadar.mjeraLambda.y}
      x2={kadar.mjeraLambda.x1}
      y2={kadar.mjeraLambda.y}
      class="kvb-mjera"
    />
    <line
      x1={kadar.mjeraLambda.x0}
      y1={kadar.mjeraLambda.y - 4}
      x2={kadar.mjeraLambda.x0}
      y2={kadar.mjeraLambda.y + 4}
      class="kvb-mjera"
    />
    <line
      x1={kadar.mjeraLambda.x1}
      y1={kadar.mjeraLambda.y - 4}
      x2={kadar.mjeraLambda.x1}
      y2={kadar.mjeraLambda.y + 4}
      class="kvb-mjera"
    />
    <text
      x={(kadar.mjeraLambda.x0 + kadar.mjeraLambda.x1) / 2}
      y={kadar.mjeraLambda.y - 5}
      class="kvb-lam">λ</text
    >
  {:else if vid.val}
    <text x="190" y={DB.val.y} class="lx-label kvb-sred kvb-mali"
      >valna duljina je premala za crtež u ovom mjerilu</text
    >
  {/if}

  <!-- kristal -->
  {#each kadar.atomi as a (`${a.x}-${a.y}`)}
    <circle cx={a.x} cy={a.y} r="7" class="kvb-atom" />
  {/each}
  <line
    x1={kadar.razmak.x0}
    y1={kadar.razmak.y}
    x2={kadar.razmak.x1}
    y2={kadar.razmak.y}
    class="kvb-mjera kvb-siva"
  />
  <line
    x1={kadar.razmak.x0}
    y1={kadar.razmak.y - 4}
    x2={kadar.razmak.x0}
    y2={kadar.razmak.y + 4}
    class="kvb-mjera kvb-siva"
  />
  <line
    x1={kadar.razmak.x1}
    y1={kadar.razmak.y - 4}
    x2={kadar.razmak.x1}
    y2={kadar.razmak.y + 4}
    class="kvb-mjera kvb-siva"
  />
  <text
    x={(kadar.razmak.x0 + kadar.razmak.x1) / 2}
    y={kadar.razmak.y + 15}
    class="lx-label kvb-mali kvb-sred">0,1 nm</text
  >
  <text x="344" y={kadar.razmak.y + 15} class="lx-label kvb-mali kvb-desno"
    >kristal: atomi</text
  >
</svg>

<style>
  .kvb-mali {
    font-size: 10.5px;
  }
  .kvb-sred {
    text-anchor: middle;
  }
  .kvb-desno {
    text-anchor: end;
  }
  .kvb-tijelo {
    fill: var(--bg-elev-2);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .kvb-os {
    stroke: var(--border-strong);
    stroke-dasharray: 3 5;
  }
  .kvb-val {
    fill: none;
    stroke: var(--lx-water);
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .kvb-ravnalo {
    fill: none;
    stroke: var(--lx-water);
    stroke-width: 1.6;
    opacity: 0.75;
  }
  .kvb-e {
    fill: var(--lx-water);
  }
  .kvb-p {
    fill: var(--danger);
  }
  .kvb-lopta {
    fill: #c6e03a;
    stroke: #8aa21a;
  }
  .kvb-e-t {
    font-size: 8px;
    font-weight: 700;
    fill: #fff;
    text-anchor: middle;
  }
  .kvb-upitnik {
    font-size: 12px;
    font-weight: 700;
    fill: var(--text-dim);
    text-anchor: middle;
    font-family: var(--font-mono);
  }
  .kvb-mjera {
    stroke: var(--text);
    stroke-width: 1.2;
  }
  .kvb-siva {
    stroke: var(--text-dim);
  }
  .kvb-lam {
    font-size: 13px;
    font-style: italic;
    fill: var(--text);
    text-anchor: middle;
  }
  .kvb-atom {
    fill: color-mix(in srgb, var(--text-faint) 55%, transparent);
    stroke: var(--text-faint);
  }
</style>
