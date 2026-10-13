<script>
  // Skica uz zadatak iz JSON opisa (task.sketch). Neispravan opis ne prikazuje ništa: zadatak ide bez skice.
  // Boje dolaze iz teme, pa ista skica radi u svijetloj i tamnoj temi.
  import { renderSketch } from "./taskSketch.js";
  import "./sketch.css";

  let { sketch, text = "" } = $props();

  let spec = $derived.by(() => {
    if (!sketch) return null;
    if (typeof sketch === "object") return sketch;
    try {
      return JSON.parse(sketch);
    } catch {
      return null;
    }
  });
  let rendered = $derived(spec ? renderSketch(spec, text).svg : null);
</script>

{#if rendered}
  <figure class="task-sketch">{@html rendered}</figure>
{/if}
