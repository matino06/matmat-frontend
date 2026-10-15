<script>
  // Statična skica (isti crtež kao skica uz zadatak) s kratkim tekstom.
  import Md from "./Md.svelte";
  import Sketch from "$lib/sketch/Sketch.svelte";

  let { spec } = $props();
</script>

{#if spec.tekst}<Md text={spec.tekst} />{/if}
<div class="lx-figure"><Sketch sketch={spec.skica} text={JSON.stringify(spec)} /></div>
