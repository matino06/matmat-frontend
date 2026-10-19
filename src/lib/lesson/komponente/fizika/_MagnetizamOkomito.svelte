<script>
  // Veličina okomita na papir: ⊙ (iz papira, vidiš vrh strelice) ili ⊗ (u papir, vidiš perje na repu).
  let {
    x,
    y,
    r = 12,
    smjer,
    boja = "c-txt",
    oznaka = "",
    crtkano = false,
    sirina = 2.4,
    ispuna = false,
  } = $props();
  let k = $derived(r * 0.62);
  let dijelovi = $derived(String(oznaka).split("_"));
</script>

<g class={boja}>
  {#if ispuna}<circle cx={x} cy={y} {r} class="mg-ispuna" />{/if}
  <circle
    cx={x}
    cy={y}
    {r}
    class="mg-stroke"
    class:mg-dash={crtkano}
    stroke-width={sirina}
  />
  {#if smjer === "iz_papira"}
    <circle cx={x} cy={y} r={Math.max(2.2, r * 0.24)} class="mg-fill" />
  {:else if smjer === "u_papir"}
    <path
      d="M{x - k},{y - k} L{x + k},{y + k} M{x + k},{y - k} L{x - k},{y + k}"
      class="mg-stroke"
      stroke-width={sirina}
      stroke-linecap="round"
    />
  {/if}
  {#if oznaka}<text class="mg-txt it" x={x + r + 5} y={y - r + 2}
      >{dijelovi[0]}{#if dijelovi[1]}<tspan class="mg-ind" dy="4"
          >{dijelovi[1]}</tspan
        >{/if}</text
    >{/if}
</g>

<style>
  .mg-ispuna {
    fill: var(--bg-elev);
  }
</style>
