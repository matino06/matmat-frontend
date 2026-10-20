<script>
  // Jedan član nuklearne reakcije na crtežu: mala jezgra od kuglica ili čestica (p, n, e⁻, e⁺, α, γ) oko (x, y).
  import Kuglice from "./_JezgraKuglice.svelte";
  import {
    tipoviJezgre,
    kuglice,
    zIzSimbola,
  } from "$lib/lesson/katalog/fizika/jezgra.js";

  // clan: {simbol, A} | {cestica} | {A, Z} (odabrana jezgra iz palete)
  let { clan, x = 0, y = 0, skala = 1, opacity = 1, R1 = 4 } = $props();
  const r1 = (n) => Math.round(n * 10) / 10;
  let jezgra = $derived.by(() => {
    if (!clan || clan.cestica) return null;
    const Z = clan.simbol ? zIzSimbola(clan.simbol) : clan.Z;
    const A = clan.A;
    if (!(Z >= 0) || !(A >= Z)) return null;
    return kuglice(tipoviJezgre(Z, A - Z, 11), R1);
  });
  const ALFA = kuglice(["p", "n", "n", "p"], 4);
</script>

<g transform="translate({r1(x)} {r1(y)}) scale({skala})" {opacity}>
  {#if jezgra}
    <Kuglice k={jezgra} />
  {:else if clan?.cestica === "p"}
    <Kuglice k={[{ i: 0, x: 0, y: 0, r: 5.5, vrsta: "p" }]} />
  {:else if clan?.cestica === "n"}
    <Kuglice k={[{ i: 0, x: 0, y: 0, r: 5.5, vrsta: "n" }]} />
  {:else if clan?.cestica === "alfa"}
    <Kuglice k={ALFA} />
  {:else if clan?.cestica === "e-" || clan?.cestica === "e+"}
    <circle
      class="jzc-e"
      class:plus={clan.cestica === "e+"}
      cx="0"
      cy="0"
      r="4"
    />
    <text class="jzc-ez" x="0" y="3" text-anchor="middle"
      >{clan.cestica === "e-" ? "−" : "+"}</text
    >
  {:else if clan?.cestica === "gama"}
    <path
      class="jzc-g"
      d="M-14,0 q3.5,-7 7,0 t7,0 t7,0 t7,0"
      fill="none"
    />
  {/if}
</g>

<style>
  .jzc-e {
    fill: var(--lx-water);
  }
  .jzc-e.plus {
    fill: var(--warn);
  }
  .jzc-ez {
    fill: #fff;
    font: 700 8px var(--font-sans);
    pointer-events: none;
  }
  .jzc-g {
    stroke: var(--warn);
    stroke-width: 2;
    stroke-linecap: round;
  }
</style>
