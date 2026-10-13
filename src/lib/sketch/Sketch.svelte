<script>
  // Skica uz zadatak iz JSON opisa (task.sketch). Neispravan opis ne prikazuje ništa: zadatak ide bez skice.
  // Boje dolaze iz teme, pa ista skica radi u svijetloj i tamnoj temi.
  import { renderSketch } from "./taskSketch.js";

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

<style>
  .task-sketch { margin: 0; color: var(--text); }
  .task-sketch :global(svg) { width: 100%; height: auto; display: block; }
  .task-sketch :global(.shape) { fill: color-mix(in srgb, var(--primary) 7%, transparent); stroke: var(--text); stroke-width: 2; stroke-linejoin: round; }
  .task-sketch :global(.shape.fill) { fill: color-mix(in srgb, var(--text) 8%, transparent); }
  .task-sketch :global(.outline) { fill: none; stroke: var(--text); stroke-width: 2; }
  .task-sketch :global(.ln) { stroke: var(--text); stroke-width: 2; fill: none; stroke-linecap: round; }
  .task-sketch :global(.ln.thin) { stroke-width: 1.3; }
  .task-sketch :global(.ln.thick) { stroke-width: 3; }
  .task-sketch :global(.ln.dash), .task-sketch :global(.arr.dash) { stroke-dasharray: 5 4; }
  .task-sketch :global(.ln.acc) { stroke: var(--primary); }
  .task-sketch :global(.ln.needle) { stroke: var(--danger); stroke-width: 2.4; }
  .task-sketch :global(.grid) { stroke: var(--border); stroke-width: 1; }
  .task-sketch :global(.grid.strong) { stroke: var(--text-faint); }
  .task-sketch :global(.axis) { stroke: var(--text-dim); stroke-width: 1.4; }
  .task-sketch :global(.tick) { fill: var(--text-faint); font: 11px var(--font-sans); }
  .task-sketch :global(.lbl) { fill: var(--text); font: 600 14px var(--font-sans); }
  .task-sketch :global(.lbl.small) { font-size: 12.5px; }
  .task-sketch :global(.dim-t) { fill: var(--text-dim); font-weight: 500; }
  .task-sketch :global(.acc-t) { fill: var(--primary); }
  .task-sketch :global(.pt) { fill: var(--text); }
  .task-sketch :global(.pt.acc-f) { fill: var(--primary); }
  .task-sketch :global(.curve) { fill: none; stroke-width: 2.4; }
  .task-sketch :global(.box), .task-sketch :global(.meter) { fill: var(--bg-elev); stroke: var(--text); stroke-width: 2; }
  .task-sketch :global(.liquid) { fill: color-mix(in srgb, var(--primary) 22%, transparent); stroke: none; }
  .task-sketch :global(.liquid.top) { fill: color-mix(in srgb, var(--primary) 32%, transparent); }
  .task-sketch :global(.ruler) { fill: color-mix(in srgb, var(--warn) 14%, transparent); stroke: var(--text); stroke-width: 1.5; }
  .task-sketch :global(.object) { fill: color-mix(in srgb, var(--text) 14%, transparent); stroke: var(--text); stroke-width: 1.5; }
  .task-sketch :global(.arr) { stroke-width: 2.4; fill: none; }
  .task-sketch :global(.head) { stroke: none; }
  .task-sketch :global(.c1) { stroke: var(--primary); }
  .task-sketch :global(.c2) { stroke: var(--warn); }
  .task-sketch :global(.c3) { stroke: var(--success); }
  .task-sketch :global(.c4) { stroke: var(--danger); }
  .task-sketch :global(.acc) { stroke: var(--primary); }
  .task-sketch :global(.head.c1), .task-sketch :global(.head.acc) { fill: var(--primary); }
  .task-sketch :global(.head.c2) { fill: var(--warn); }
  .task-sketch :global(.head.c3) { fill: var(--success); }
  .task-sketch :global(.head.c4) { fill: var(--danger); }
  .task-sketch :global(.c1-t) { fill: var(--primary); }
  .task-sketch :global(.c2-t) { fill: var(--warn); }
  .task-sketch :global(.c3-t) { fill: var(--success); }
  .task-sketch :global(.c4-t) { fill: var(--danger); }
</style>
