<script>
  // Kratko objašnjenje, po želji uz skicu.
  import Md from "./Md.svelte";
  import Sketch from "$lib/sketch/Sketch.svelte";

  let { spec } = $props();
</script>

<Md text={spec.tekst} />
{#if spec.skica}
  <div class="lx-figure"><Sketch sketch={spec.skica} text={spec.tekst} /></div>
{/if}
