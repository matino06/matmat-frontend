<script>
  // PROTOTIP (ticket „UX uređivanja plana“): tri različita načina na koje kreator pregledava i uređuje plan
  // vlastitog predmeta prije potvrde, na ruti /prototype-plan, prebacivanje preko ?variant=A|B|C.
  // Stanje je samo u memoriji (planStore), ništa ne ide na backend. Baci nakon odluke.
  import { page } from "$app/state";
  import PrototypeSwitcher from "$lib/components/prototype/PrototypeSwitcher.svelte";
  import { plan, upozorenja, reset } from "./planStore.svelte.js";
  import VariantA from "./VariantA.svelte";
  import VariantB from "./VariantB.svelte";
  import VariantC from "./VariantC.svelte";

  const NAMES = { A: "Popis po cjelinama", B: "Mapa ovisnosti", C: "Vodič s AI-jem" };
  let variant = $derived(page.url.searchParams.get("variant") ?? "A");
  let status = $derived(
    `${plan.lekcije.length} lekcija · ${upozorenja().length} upozorenja · predznanje ${plan.predznanje.length} · ` +
      `${plan.nacin === "brza" ? "brza priprema" : "učenje gradiva"} · ${plan.status} · zadnje: ${plan.zadnjaIzmjena}`
  );
</script>

<svelte:head><title>PROTOTIP · Uređivanje plana</title></svelte:head>

{#if variant === "A"}<VariantA />{/if}
{#if variant === "B"}<VariantB />{/if}
{#if variant === "C"}<VariantC />{/if}

<button class="proto-reset" onclick={reset}>Vrati izvorni plan</button>
<PrototypeSwitcher variants={["A", "B", "C"]} names={NAMES} {status} />

<style>
  .proto-reset {
    position: fixed;
    bottom: 22px;
    right: 18px;
    z-index: 9999;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #fde047;
    color: #111;
    border: none;
    cursor: pointer;
  }
</style>
