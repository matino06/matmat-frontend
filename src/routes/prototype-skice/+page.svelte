<script>
  // PROTOTIP (ticket „SVG skice u zadacima“): tri načina smještanja skice uz zadatak, na istim
  // ručno napisanim primjerima, prebacivanje preko ?variant=A|B|C. Skice crta sketch.js iz JSON opisa.
  // Teme: prebaci svijetlu/tamnu u aplikaciji i usporedi. Ne ide u main.
  import { page } from "$app/state";
  import { renderTaskHtml } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { mathjaxTypeset } from "$lib/utils/mathjax";
  import PrototypeSwitcher from "$lib/components/prototype/PrototypeSwitcher.svelte";
  import { EXAMPLES } from "./examples.js";
  import { renderSketch } from "./sketch.js";

  const NAMES = { A: "Uz tekst", B: "Iznad zadatka", C: "Na zahtjev" };
  let variant = $derived(page.url.searchParams.get("variant") ?? "A");
  let items = EXAMPLES.map((e, i) => ({ ...e, id: 900000 + i, ...renderSketch(e.spec, e.task) }));
  let shown = $state({});
</script>

<div class="page" style="max-width:900px">
  <div class="zadaci-head" style="margin-bottom:16px">
    <div>
      <h1>Prototip: SVG skice u zadacima</h1>
      <div class="sub">
        Varijanta {variant} · {NAMES[variant]}. Skice su nacrtane kodom iz JSON opisa, bez poziva AI-ja. Prebaci temu i usporedi.
      </div>
    </div>
  </div>

  {#each items as it (it.id)}
    <article class="card task-card proto" class:b={variant === "B"}>
      <div class="task-meta">
        <span class="badge">{it.title}</span>
        {#if !it.svg}<span class="badge bad">bez skice</span>{/if}
      </div>

      {#if variant === "B" && it.svg}
        <div class="sketch big">{@html it.svg}</div>
      {/if}

      <div class="body" class:float={variant === "A" && it.svg}>
        {#if variant === "A" && it.svg}
          <div class="sketch side">{@html it.svg}</div>
        {/if}
        <div class="prose prose-sm !max-w-none dark:prose-invert" use:fitMath use:mathjaxTypeset={it.id}>
          {@html renderTaskHtml(it.task, it.id)}
        </div>
      </div>

      {#if variant === "C" && it.svg}
        {#if shown[it.id]}
          <div class="sketch big">{@html it.svg}</div>
          <button class="btn btn-quiet" onclick={() => (shown[it.id] = false)}>Sakrij skicu</button>
        {:else}
          <button class="btn btn-ghost" onclick={() => (shown[it.id] = true)}>📐 Prikaži skicu</button>
        {/if}
      {/if}

      {#if it.note}<div class="note">{it.note}{it.svg ? "" : " Provjera ga je odbila, pa učenik dobiva zadatak bez skice."}</div>{/if}

      <details class="state">
        <summary>JSON opis i provjere kodom</summary>
        <ul>
          {#each it.checks as c}<li class:fail={!c.ok}>{c.ok ? "✓" : "✗"} {c.text}</li>{/each}
        </ul>
        <pre>{JSON.stringify(it.spec, null, 2)}</pre>
      </details>
    </article>
  {/each}
</div>

<PrototypeSwitcher variants={["A", "B", "C"]} names={NAMES} />

<style>
  .proto { margin-bottom: 18px; display: grid; gap: 12px; }
  .body.float::after { content: ""; display: block; clear: both; }
  .sketch { color: var(--text); }
  .sketch.side { float: right; width: 46%; margin: 0 0 8px 18px; }
  @media (max-width: 700px) { .sketch.side { float: none; width: 100%; margin: 0 0 8px; } }
  .sketch.big { width: 100%; max-width: 560px; margin: 0 auto; }
  .sketch :global(svg) { width: 100%; height: auto; display: block; }
  .bad { color: var(--danger); border-color: var(--danger); }
  .note { font-size: 13px; color: var(--warn); }
  .state summary { cursor: pointer; font-size: 12px; color: var(--text-faint); }
  .state ul { list-style: none; padding: 0; margin: 8px 0; font-size: 12.5px; display: grid; gap: 3px; color: var(--success); }
  .state li.fail { color: var(--danger); }
  .state pre { font-size: 11.5px; background: var(--bg-elev-2); padding: 10px; border-radius: var(--r-md); overflow: auto; color: var(--text-dim); }

  /* Boje skice iz teme: ista skica radi u svijetloj i tamnoj temi. */
  .sketch :global(.shape) { fill: color-mix(in srgb, var(--primary) 7%, transparent); stroke: var(--text); stroke-width: 2; stroke-linejoin: round; }
  .sketch :global(.shape.fill) { fill: color-mix(in srgb, var(--text) 8%, transparent); }
  .sketch :global(.ln) { stroke: var(--text); stroke-width: 2; fill: none; stroke-linecap: round; }
  .sketch :global(.ln.thin) { stroke-width: 1.3; }
  .sketch :global(.ln.thick) { stroke-width: 3; }
  .sketch :global(.ln.dash), .sketch :global(.arr.dash) { stroke-dasharray: 5 4; }
  .sketch :global(.ln.acc) { stroke: var(--primary); }
  .sketch :global(.grid) { stroke: var(--border); stroke-width: 1; }
  .sketch :global(.axis) { stroke: var(--text-dim); stroke-width: 1.4; }
  .sketch :global(.tick) { fill: var(--text-faint); font: 11px var(--font-sans); }
  .sketch :global(.lbl) { fill: var(--text); font: 600 14px var(--font-sans); }
  .sketch :global(.lbl.small) { font-size: 12.5px; }
  .sketch :global(.dim-t) { fill: var(--text-dim); font-weight: 500; }
  .sketch :global(.acc-t) { fill: var(--primary); }
  .sketch :global(.pt) { fill: var(--text); }
  .sketch :global(.pt.acc-f) { fill: var(--primary); }
  .sketch :global(.curve) { fill: none; stroke-width: 2.4; }
  .sketch :global(.box) { fill: var(--bg-elev); stroke: var(--text); stroke-width: 2; }
  .sketch :global(.meter) { fill: var(--bg-elev); stroke: var(--text); stroke-width: 2; }
  .sketch :global(.arr) { stroke-width: 2.4; }
  .sketch :global(.c1), .sketch :global(.curve.c1) { stroke: var(--primary); fill: var(--primary); }
  .sketch :global(.c2), .sketch :global(.curve.c2) { stroke: var(--warn); fill: var(--warn); }
  .sketch :global(.c3) { stroke: var(--success); fill: var(--success); }
  .sketch :global(.c4) { stroke: var(--danger); fill: var(--danger); }
  .sketch :global(.acc) { stroke: var(--primary); fill: var(--primary); }
  .sketch :global(.curve.c1), .sketch :global(.curve.c2) { fill: none; }
  .sketch :global(.arr.c1), .sketch :global(.arr.c2), .sketch :global(.arr.c3), .sketch :global(.arr.acc) { fill: none; }
  .sketch :global(.c1-t) { fill: var(--primary); }
  .sketch :global(.c2-t) { fill: var(--warn); }
  .sketch :global(.c3-t) { fill: var(--success); }
</style>
