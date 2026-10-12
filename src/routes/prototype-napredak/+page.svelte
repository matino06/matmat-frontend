<script>
  // PROTOTIP (ticket „Prikaz napretka izrade kreatoru“): tri načina prikaza izrade vlastitog predmeta
  // (/moji-predmeti/[id]), ?variant=A|B|C. Žuti panel gore desno upravlja simulacijom. Baci nakon odluke.
  import { page } from "$app/state";
  import { onDestroy } from "svelte";
  import PrototypeSwitcher from "$lib/components/prototype/PrototypeSwitcher.svelte";
  import { sim, SCENARIJI, korak, reset, opisStatusa, postotak } from "./sim.svelte.js";
  import VariantA from "./VariantA.svelte";
  import VariantB from "./VariantB.svelte";
  import VariantC from "./VariantC.svelte";

  const NAMES = { A: "Vremenska crta", B: "Kartica „sada“ + popis predmeta", C: "Zapisnik događaja" };
  let variant = $derived(page.url.searchParams.get("variant") ?? "A");
  let auto = $state(false);
  let timer = setInterval(() => auto && korak(), 900);
  onDestroy(() => clearInterval(timer));
  let status = $derived(`${sim.scenarij} · ${sim.faza} · ${opisStatusa()} · ${postotak()} % · kvota ${sim.kvota} %`);
</script>

<svelte:head><title>PROTOTIP · Napredak izrade</title></svelte:head>

<div class="sim-panel">
  <b>Simulacija</b>
  <select value={sim.scenarij} onchange={(e) => { auto = false; reset(e.currentTarget.value); }}>
    {#each Object.entries(SCENARIJI) as [k, s]}<option value={k}>{s.naziv}</option>{/each}
  </select>
  <button onclick={korak}>Korak ⏭</button>
  <button onclick={() => (auto = !auto)}>{auto ? "Stop ⏸" : "Auto ▶"}</button>
  <button onclick={() => { auto = false; reset(); }}>Ispočetka</button>
</div>

{#if variant === "A"}<VariantA />{/if}
{#if variant === "B"}<VariantB />{/if}
{#if variant === "C"}<VariantC />{/if}

<PrototypeSwitcher variants={["A", "B", "C"]} names={NAMES} {status} />

<style>
  .sim-panel {
    position: fixed; top: 12px; right: 12px; z-index: 9999; display: flex; gap: 6px; align-items: center;
    background: #fde047; color: #111; padding: 6px 10px; border-radius: 10px; font: 12px ui-sans-serif, system-ui;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }
  .sim-panel select, .sim-panel button { font: inherit; border-radius: 6px; border: 1px solid #111; background: #fff8c5; color: #111; padding: 3px 6px; cursor: pointer; }
</style>
