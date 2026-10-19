<script>
  // Strelica u SVG-u magnetskih widgeta: dužina s vrhom i natpisom kod vrha. boja je klasa iz _magnetizam.css
  // (c-b polje, c-v brzina, c-f sila, c-i struja, c-ind inducirano, c-sel odabrano, c-ok, c-bad).
  let {
    x1,
    y1,
    x2,
    y2,
    boja = "c-txt",
    sirina = 3,
    vrh = 11,
    oznaka = "",
    crtkano = false,
    kurziv = true,
    stranaOznake = 1,
  } = $props();

  let d = $derived(Math.hypot(x2 - x1, y2 - y1) || 1);
  let ux = $derived((x2 - x1) / d);
  let uy = $derived((y2 - y1) / d);
  // vrh strelice i natpis: natpis je malo iza vrha i odmaknut okomito od strelice
  let bx = $derived(x2 - ux * vrh);
  let by = $derived(y2 - uy * vrh);
  let glava = $derived(
    `${x2},${y2} ${bx - uy * vrh * 0.55},${by + ux * vrh * 0.55} ${bx + uy * vrh * 0.55},${by - ux * vrh * 0.55}`,
  );
  let lx = $derived(x2 - ux * 6 - uy * 16 * stranaOznake);
  // „B_1“ → B s indeksom 1 (unicode indeksi u kurzivnom serifnom fontu izgledaju loše)
  let dijelovi = $derived(String(oznaka).split("_"));
  let ly = $derived(y2 - uy * 6 + ux * 16 * stranaOznake + 5);
</script>

<g class={boja}>
  <line
    class="mg-stroke"
    class:mg-dash={crtkano}
    {x1}
    {y1}
    x2={bx + ux * 1.5}
    y2={by + uy * 1.5}
    stroke-width={sirina}
    stroke-linecap="round"
  />
  <polygon class="mg-fill" points={glava} />
  {#if oznaka}<text
      class="mg-txt"
      class:it={kurziv}
      x={lx}
      y={ly}
      text-anchor="middle"
      >{dijelovi[0]}{#if dijelovi[1]}<tspan class="mg-ind" dy="4"
          >{dijelovi[1]}</tspan
        >{/if}</text
    >{/if}
</g>
