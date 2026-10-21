<script>
  // poluraspad: zakon radioaktivnog raspada. Scena „uzorci“ (kockice jezgara, sat, graf N/N₀) ili „aktivnost“
  // (bočica, Geigerov brojač, A = λN). Sva fizika i što je skriveno je u katalog/fizika/poluraspad.js.
  import Uzorci from "./_PoluraspadUzorci.svelte";
  import Aktivnost from "./_PoluraspadAktivnost.svelte";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();
</script>

{#if spec.scena === "aktivnost"}
  <Aktivnost {spec} {locked} {pokazi} {ishod} {onodgovor} />
{:else}
  <Uzorci {spec} {locked} {pokazi} {ishod} {onodgovor} />
{/if}
