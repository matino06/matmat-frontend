<script>
  // valne_fronte: valovi odozgo. Scena „dva_izvora“ (interferencija) i „pokretni_izvor“ (Doppler) imaju svaka svoju
  // komponentu; logika, geometrija i što je skriveno su u katalog/fizika/valne_fronte.js.
  import DvaIzvora from "./_FronteDvaIzvora.svelte";
  import Doppler from "./_FronteDoppler.svelte";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();
</script>

{#if spec.scena === "pokretni_izvor"}
  <Doppler {spec} {locked} {pokazi} {ishod} {onodgovor} />
{:else}
  <DvaIzvora {spec} {locked} {pokazi} {ishod} {onodgovor} />
{/if}
