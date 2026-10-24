<script>
  // plin_posuda: dva crteža istog widgeta. Spec bez „smjesa“ (fizika, svi postojeći specovi): čestice plina u
  // cilindru s klipom (_PlinCilindar.svelte, nepromijenjen). Spec s „smjesa“ (kemija, Daltonov zakon): smjesa plinova
  // u čvrstoj boci s parcijalnim tlakovima (_PlinSmjesa.svelte).
  import Cilindar from "./_PlinCilindar.svelte";
  import Smjesa from "./_PlinSmjesa.svelte";
  import { jeSmjesa } from "$lib/lesson/katalog/fizika/_smjesa.js";

  let props = $props();
</script>

{#if jeSmjesa(props.spec)}
  <Smjesa {...props} />
{:else}
  <Cilindar {...props} />
{/if}
