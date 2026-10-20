<script>
  // Jezgra od kuglica (protoni crveni, neutroni sivi) oko (x, y). Položaji dolaze iz katalog/fizika/_jezgra.js
  // (kuglice), pa web i iOS crtaju isti raspored. prijelaz: {i, u, u_vrsta} = kuglica i postupno mijenja boju (β).
  let {
    k = [],
    x = 0,
    y = 0,
    skala = 1,
    prijelaz = null,
    opacity = 1,
  } = $props();
  const r1 = (n) => Math.round(n * 10) / 10;
</script>

<g
  class="jzk"
  transform="translate({r1(x)} {r1(y)}) scale({skala})"
  {opacity}
  aria-hidden="true"
>
  {#each k as b (b.i)}
    <circle
      class="jzk-b"
      class:p={b.vrsta === "p"}
      class:n={b.vrsta === "n"}
      class:nk={b.vrsta === "nukleon"}
      cx={b.x}
      cy={b.y}
      r={b.r}
    />
    {#if prijelaz && prijelaz.i === b.i}
      <circle
        class="jzk-b"
        class:p={prijelaz.u_vrsta === "p"}
        class:n={prijelaz.u_vrsta === "n"}
        cx={b.x}
        cy={b.y}
        r={b.r}
        opacity={prijelaz.u}
      />
      <circle
        class="jzk-sjaj"
        cx={b.x}
        cy={b.y}
        r={b.r * (1.6 + prijelaz.u)}
        opacity={0.6 * (1 - prijelaz.u)}
      />
    {/if}
    {#if b.r >= 3.5}
      <circle
        class="jzk-odsjaj"
        cx={r1(b.x - b.r * 0.35)}
        cy={r1(b.y - b.r * 0.35)}
        r={r1(b.r * 0.32)}
      />
    {/if}
  {/each}
</g>

<style>
  .jzk-b {
    stroke-width: 0.6;
  }
  .jzk-b.p {
    fill: #e5484d;
    stroke: color-mix(in srgb, #e5484d 60%, #000);
  }
  .jzk-b.n {
    fill: color-mix(in srgb, var(--text-dim) 70%, var(--bg-elev));
    stroke: color-mix(in srgb, var(--text-dim) 60%, #000);
  }
  /* nukleon bez oznake (skriveni Z): ni crven ni siv */
  .jzk-b.nk {
    fill: color-mix(in srgb, #c98a3a 75%, var(--bg-elev));
    stroke: color-mix(in srgb, #c98a3a 60%, #000);
  }
  .jzk-odsjaj {
    fill: #fff;
    opacity: 0.35;
    pointer-events: none;
  }
  .jzk-sjaj {
    fill: none;
    stroke: var(--warn);
    stroke-width: 1.5;
  }
</style>
