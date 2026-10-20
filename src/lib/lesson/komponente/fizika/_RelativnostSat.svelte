<script>
  // Svjetlosni sat: foton između dva zrcala. Sa Zemlje se brod giba, pa foton u njemu ide cik-cak (dulji put, ista
  // brzina c) i tik traje dulje; uz njega je jednaki sat koji miruje na Zemlji. Geometrija: satStanje (katalog).
  import { onMount, untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import {
    satStanje,
    SAT,
    gama,
  } from "$lib/lesson/katalog/fizika/relativnost.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let { spec, beta, pogled = "zemlja", pokreni = 0 } = $props();

  let t = $state(0);
  // uz smanjeno gibanje: kadar nakon 4 tika sata na Zemlji, bez animacije
  let st = $derived(
    satStanje(
      spec,
      prefersReducedMotion.current ? 4 * 1 + 0.25 : t,
      beta,
      pogled,
    ),
  );
  $effect(() => {
    void pokreni;
    untrack(() => (t = 0));
  });
  // bljesak brojača kad tik upravo prođe
  let bljB = $derived(st.tik.brod > 0 && t > 0 && t % st.tik.brod < 0.18);
  let bljZ = $derived(t > 0 && t % st.tik.zemlja < 0.18);
  onMount(() => {
    let id;
    let zadnji = 0;
    const korak = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (!prefersReducedMotion.current) t += dt;
      id = requestAnimationFrame(korak);
    };
    id = requestAnimationFrame(korak);
    return () => cancelAnimationFrame(id);
  });
  const { H, sirina } = SAT;
  const trag = (pts) => pts.map((p) => p.join(",")).join(" ");
  let opis = $derived(
    pogled === "brod"
      ? `Svjetlosni sat gledan iz broda: foton ide okomito gore-dolje. Tikova: ${st.tikovi.brod}.`
      : `Svjetlosni sat u brodu koji leti brzinom ${formatNumber(beta)}c, gledan sa Zemlje: foton ide cik-cak po duljem putu. Sat u brodu: ${st.tikovi.brod} tikova, sat na Zemlji: ${st.tikovi.zemlja} tikova.`,
  );
</script>

<svg viewBox="0 0 360 262" role="img" aria-label={opis}>
  {#each st.zvijezde as z, i (i)}
    <circle class="rs-zv" cx={z.x} cy={z.y} r={z.r} />
  {/each}

  <!-- trag fotona (sa Zemlje: cik-cak) -->
  {#if st.trag.length > 1}
    <polyline class="rs-trag" points={trag(st.trag)} />
  {/if}

  <!-- brod sa satom -->
  <g transform="translate({st.brod.x} 0)">
    <rect
      class="rs-trup"
      x={-sirina / 2 - 14}
      y={st.brod.y - 12}
      width={sirina + 28}
      height={H + 24}
      rx="14"
    />
    <path
      class="rs-plamen"
      d="M{-sirina / 2 - 14},{st.brod.y + H / 2 - 8} l-12,8 l12,8 z"
    />
    <line
      class="rs-zrcalo"
      x1={-sirina / 2}
      y1={st.brod.y}
      x2={sirina / 2}
      y2={st.brod.y}
    />
    <line
      class="rs-zrcalo"
      x1={-sirina / 2}
      y1={st.brod.y + H}
      x2={sirina / 2}
      y2={st.brod.y + H}
    />
    <text class="rs-t" x="0" y={st.brod.y + H + 26} text-anchor="middle"
      >sat u brodu</text
    >
  </g>
  <circle class="rs-foton-sjaj" cx={st.foton.x} cy={st.foton.y} r="9" />
  <circle class="rs-foton" cx={st.foton.x} cy={st.foton.y} r="4.5" />

  <!-- sat na Zemlji -->
  {#if st.zemlja}
    {@const z = st.zemlja}
    <rect class="rs-tlo" x="0" y={z.y + H + 10} width="360" height="40" />
    <text class="rs-t rs-tlo-t" x="352" y={z.y + H + 23} text-anchor="end"
      >Zemlja</text
    >
    <rect
      class="rs-kuc"
      x={z.x - z.w / 2 - 6}
      y={z.y - 6}
      width={z.w + 12}
      height={H + 16}
      rx="6"
    />
    <line
      class="rs-zrcalo"
      x1={z.x - z.w / 2}
      y1={z.y}
      x2={z.x + z.w / 2}
      y2={z.y}
    />
    <line
      class="rs-zrcalo"
      x1={z.x - z.w / 2}
      y1={z.y + H}
      x2={z.x + z.w / 2}
      y2={z.y + H}
    />
    <circle class="rs-foton-sjaj" cx={z.foton.x} cy={z.foton.y} r="9" />
    <circle class="rs-foton" cx={z.foton.x} cy={z.foton.y} r="4.5" />
    <text class="rs-t" x={z.x} y={z.y - 12} text-anchor="middle"
      >sat na Zemlji</text
    >
    <!-- brojači -->
    <g class="rs-brojaci">
      <text class="rs-t" x="120" y={z.y + 14}>tikovi sata na Zemlji</text>
      <text class="rs-broj" class:rs-blj={bljZ} x="120" y={z.y + 36}
        >{st.tikovi.zemlja}</text
      >
      <text class="rs-t" x="236" y={z.y + 14}>tikovi sata u brodu</text>
      <text class="rs-broj" class:rs-blj={bljB} x="236" y={z.y + 36}
        >{st.tikovi.brod}</text
      >
      <text class="rs-t rs-mali" x="120" y={z.y + 58}
        >jedan tik: {formatNumber(st.tik.zemlja)} s</text
      >
      <text class="rs-t rs-mali" x="236" y={z.y + 58}
        >jedan tik: {formatNumber(st.tik.brod, 2)} s</text
      >
    </g>
  {:else}
    <g class="rs-brojaci">
      <text class="rs-t" x="180" y="186" text-anchor="middle"
        >tikovi sata u brodu</text
      >
      <text
        class="rs-broj"
        class:rs-blj={bljB}
        x="180"
        y="210"
        text-anchor="middle">{st.tikovi.brod}</text
      >
      <text class="rs-t rs-mali" x="180" y="236" text-anchor="middle"
        >Astronautu sat radi normalno: foton ide okomito,</text
      >
      <text class="rs-t rs-mali" x="180" y="250" text-anchor="middle"
        >a Zemlja (i zvijezde) jure unatrag brzinom {formatNumber(beta)}c.</text
      >
    </g>
  {/if}
  {#if pogled === "zemlja" && beta > 0.05}
    <text class="rs-t rs-mali" x="180" y="14" text-anchor="middle"
      >isti foton, ista brzina c, ali dulji (kosi) put: tik u brodu traje γ = {formatNumber(
        gama(beta),
        2,
      )} puta dulje</text
    >
  {/if}
</svg>
{#if !prefersReducedMotion.current}
  <figcaption class="rs-usp">prikaz je jako usporen</figcaption>
{/if}

<style>
  svg {
    background: color-mix(in srgb, #0b1020 85%, var(--bg-elev));
    border-radius: var(--r-lg);
  }
  .rs-zv {
    fill: #cbd5e1;
    opacity: 0.5;
  }
  .rs-trag {
    fill: none;
    stroke: #fde047;
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    opacity: 0.75;
  }
  .rs-trup {
    fill: color-mix(in srgb, #e2e8f0 16%, transparent);
    stroke: #94a3b8;
    stroke-width: 1.4;
  }
  .rs-plamen {
    fill: #f59e0b;
  }
  .rs-zrcalo {
    stroke: #e2e8f0;
    stroke-width: 4;
    stroke-linecap: round;
  }
  .rs-foton {
    fill: #fef08a;
  }
  .rs-foton-sjaj {
    fill: #fde047;
    opacity: 0.25;
  }
  .rs-tlo {
    fill: color-mix(in srgb, #22c55e 30%, #0b1020);
  }
  .rs-tlo-t {
    fill: #bbf7d0;
  }
  .rs-kuc {
    fill: color-mix(in srgb, #e2e8f0 10%, transparent);
    stroke: #64748b;
  }
  .rs-t {
    fill: #cbd5e1;
    font: 500 11px var(--font-sans);
  }
  .rs-mali {
    font-size: 10px;
    fill: #94a3b8;
  }
  .rs-broj {
    fill: #f8fafc;
    font: 700 20px var(--font-mono);
    transition: fill 0.2s;
  }
  .rs-broj.rs-blj {
    fill: #fde047;
  }
  .rs-usp {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 2px;
  }
</style>
