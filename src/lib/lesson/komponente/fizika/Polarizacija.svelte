<script>
  // Polarizacija svjetlosti: tri scene (filtri, prorez, odsjaj). Fizika, geometrija i provjera su u
  // katalog/fizika/polarizacija.js; ovdje je samo tekst zadatka i izbor scene.
  import Md from "../Md.svelte";
  import Filtri from "./_PolarizacijaFiltri.svelte";
  import Prorez from "./_PolarizacijaProrez.svelte";
  import Odsjaj from "./_PolarizacijaOdsjaj.svelte";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();
  let gleda = $derived(spec.nacin === "istrazi" || spec.nacin === "prikaz");
</script>

{#if gleda}
  <div class="pz-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

{#if spec.scena === "filtri"}
  <Filtri {spec} {locked} {pokazi} {ishod} {onodgovor} />
{:else if spec.scena === "prorez"}
  <Prorez {spec} {locked} {pokazi} {ishod} {onodgovor} />
{:else if spec.scena === "odsjaj"}
  <Odsjaj {spec} {locked} {pokazi} {ishod} {onodgovor} />
{/if}

<style>
  .pz-tekst {
    margin-bottom: 10px;
  }
</style>
