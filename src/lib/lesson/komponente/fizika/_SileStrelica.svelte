<script>
  // Strelica sile, brzine ili vektora u SVG-u (skupina „sile“: SileTijelo, Vektori, Kruzenje). Oznaka „F_g“ ili
  // „F_{tr}“ crta se s indeksom bez KaTeX-a, s obrubom u boji pozadine da se čita i preko crteža.
  import { rastaviOznaku } from "$lib/lesson/katalog/fizika/_sile.js";

  let {
    x1,
    y1,
    x2,
    y2,
    boja = "var(--text)",
    sirina = 2.6,
    isprekidano = false,
    oznaka = "",
    glava = 10,
    prozirnost = 1,
    oznakaOdmak = 14,
    oznakaStrana = 0,
  } = $props();

  const r1 = (n) => Math.round(n * 10) / 10;
  let L = $derived(Math.hypot(x2 - x1, y2 - y1));
  let ux = $derived(L ? (x2 - x1) / L : 0);
  let uy = $derived(L ? (y2 - y1) / L : 0);
  let h = $derived(Math.min(glava, L * 0.6));
  let bx = $derived(x2 - ux * h);
  let by = $derived(y2 - uy * h);
  let vrh = $derived(
    `M${r1(x2)},${r1(y2)} L${r1(bx - uy * h * 0.55)},${r1(by + ux * h * 0.55)} L${r1(bx + uy * h * 0.55)},${r1(by - ux * h * 0.55)} Z`,
  );
  let ozn = $derived(rastaviOznaku(oznaka));
  // oznaka iza vrha; oznakaStrana pomiče je okomito na strelicu (da se dvije oznake ne preklope)
  let lx = $derived(x2 + ux * oznakaOdmak - uy * oznakaStrana);
  let ly = $derived(y2 + uy * oznakaOdmak + ux * oznakaStrana);
</script>

{#if L > 0.5}
  <g class="ss" style:--ss-b={boja} opacity={prozirnost}>
    <line
      x1={r1(x1)}
      y1={r1(y1)}
      x2={r1(bx)}
      y2={r1(by)}
      stroke-width={sirina}
      stroke-dasharray={isprekidano ? "6 4" : null}
    />
    <path d={vrh} />
    {#if oznaka}
      <text
        x={r1(lx)}
        y={r1(ly)}
        text-anchor="middle"
        dominant-baseline="central"
        >{ozn.osnova}{#if ozn.indeks}<tspan class="ss-ind" dy="4"
            >{ozn.indeks}</tspan
          >{/if}</text
      >
    {/if}
  </g>
{/if}

<style>
  .ss line {
    stroke: var(--ss-b);
    stroke-linecap: round;
  }
  .ss path {
    fill: var(--ss-b);
  }
  .ss text {
    fill: var(--ss-b);
    font: italic 600 14px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3.5px;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .ss .ss-ind {
    font-size: 10.5px;
    font-style: normal;
  }
</style>
