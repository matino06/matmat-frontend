<script>
  // Homogeno magnetsko polje kao pozadina crteža: mreža ⊙ / ⊗ (polje okomito na papir) ili usporedne silnice sa
  // strelicama (polje u ravnini papira). Natpis „B“ u kutu.
  let {
    smjer,
    x0 = 0,
    y0 = 0,
    x1 = 360,
    y1 = 240,
    razmak = 40,
    boja = "c-b",
    oznaka = "B",
    crtkano = false,
    jako = 0.55,
  } = $props();

  const DIR = { gore: [0, -1], dolje: [0, 1], lijevo: [-1, 0], desno: [1, 0] };
  let okomito = $derived(smjer === "iz_papira" || smjer === "u_papir");
  let mreza = $derived.by(() => {
    const out = [];
    const nx = Math.max(1, Math.floor((x1 - x0) / razmak));
    const ny = Math.max(1, Math.floor((y1 - y0) / razmak));
    const ox = x0 + (x1 - x0 - (nx - 1) * razmak) / 2;
    const oy = y0 + (y1 - y0 - (ny - 1) * razmak) / 2;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) out.push([ox + i * razmak, oy + j * razmak]);
    return out;
  });
  // silnice u ravnini: crte po cijeloj širini (ili visini) s jednom strelicom na sredini svake
  let silnice = $derived.by(() => {
    const d = DIR[smjer];
    if (!d) return [];
    const vod = d[1] === 0;
    const n = Math.max(
      2,
      Math.floor(((vod ? y1 - y0 : x1 - x0) - 10) / razmak),
    );
    const korak = (vod ? y1 - y0 : x1 - x0) / n;
    return Array.from({ length: n }, (_, k) => {
      const c = (vod ? y0 : x0) + korak * (k + 0.5);
      const pomak = (k % 2 ? 0.18 : -0.18) * (vod ? x1 - x0 : y1 - y0);
      if (vod)
        return {
          a: [x0 + 4, c],
          b: [x1 - 4, c],
          m: [(x0 + x1) / 2 + pomak, c],
        };
      return { a: [c, y0 + 4], b: [c, y1 - 4], m: [c, (y0 + y1) / 2 + pomak] };
    });
  });
  const glava = (m, d, s = 7) =>
    `${m[0] + d[0] * s},${m[1] + d[1] * s} ${m[0] - d[0] * s - d[1] * s * 0.7},${m[1] - d[1] * s + d[0] * s * 0.7} ${m[0] - d[0] * s + d[1] * s * 0.7},${m[1] - d[1] * s - d[0] * s * 0.7}`;
</script>

<g class={boja} opacity={jako}>
  {#if okomito}
    {#each mreza as [x, y], i (i)}
      {#if smjer === "u_papir"}
        <path
          class="mg-stroke"
          d="M{x - 5},{y - 5} L{x + 5},{y + 5} M{x + 5},{y - 5} L{x - 5},{y +
            5}"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      {:else}
        <circle class="mg-stroke" cx={x} cy={y} r="5.5" stroke-width="1.5" />
        <circle class="mg-fill" cx={x} cy={y} r="1.8" />
      {/if}
    {/each}
  {:else}
    {#each silnice as s, i (i)}
      <line
        class="mg-stroke"
        class:mg-dash={crtkano}
        x1={s.a[0]}
        y1={s.a[1]}
        x2={s.b[0]}
        y2={s.b[1]}
        stroke-width="1.6"
      />
      <polygon class="mg-fill" points={glava(s.m, DIR[smjer])} />
    {/each}
  {/if}
</g>
{#if oznaka}
  <g class={boja}>
    <text class="mg-txt it" x={x0 + 8} y={y0 + 20}>{oznaka}</text>
  </g>
{/if}
