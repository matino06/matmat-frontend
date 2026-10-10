<script>
  import { onMount } from "svelte";
  import { renderMdInline } from "$lib/utils/markdownRenderer";

  // Tiles around the landing page headline, one per part of the Matura syllabus,
  // drawn like app icons. They come in once on load and drift a little with the
  // pointer; with reduced motion they just sit still. Purely decorative.
  // x/y: tile centre as % of the hero, depth: how far it drifts (px).
  const TILES = [
    { tex: "$\\displaystyle\\int$", label: "Integrali", color: "239 84% 72%", x: 9, y: 36, size: 88, rot: -8, depth: 14 },
    { tex: "$\\pi$", label: "Trigonometrija", color: "38 92% 62%", x: 26, y: 14, size: 62, rot: 5, depth: 8, scale: 1.5 },
    { tex: "$\\sqrt{x}$", label: "Korijeni", color: "158 64% 56%", x: 75, y: 13, size: 64, rot: -5, depth: 9, scale: 0.9 },
    { svg: "wave", label: "Funkcije", color: "213 94% 68%", x: 91, y: 35, size: 88, rot: 7, depth: 16 },
    { tex: "$\\log$", label: "Logaritmi", color: "0 90% 72%", x: 15, y: 80, size: 72, rot: 6, depth: 11 },
    { svg: "triangle", label: "Geometrija", color: "263 85% 76%", x: 85, y: 82, size: 72, rot: -6, depth: 12 },
  ];

  let px = $state(0);
  let py = $state(0);

  onMount(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (still || !fine) return;
    let frame = 0;
    function onMove(e) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        px = e.clientX / window.innerWidth - 0.5;
        py = e.clientY / window.innerHeight - 0.5;
      });
    }
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  });
</script>

{#snippet glyph(t)}
  {#if t.svg === "wave"}
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round">
      <path d="M5 24c4.5-11 9-11 13.5 0s9 11 13.5 0 9-11 11-5" />
    </svg>
  {:else if t.svg === "triangle"}
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">
      <path d="M9 38h30L9 12z" />
      <path d="M9 31h7v7" stroke-width="2.2" />
    </svg>
  {:else}
    <span class="ht-tex">{@html renderMdInline(t.tex)}</span>
  {/if}
{/snippet}

<!-- Phones: no room around the headline, so the tiles line up above it. -->
<div class="ht-row" aria-hidden="true">
  {#each TILES as t, i (t.label)}
    <div class="ht-tile" style="--c: {t.color}; --s: 46px; --r: {i % 2 ? 6 : -6}deg; --k: {t.scale ?? 1}; animation-delay: {0.15 + i * 0.06}s;">
      {@render glyph(t)}
    </div>
  {/each}
</div>

<div class="ht" aria-hidden="true">
  {#each TILES as t, i (t.label)}
    <div
      class="ht-pos"
      style="left:{t.x}%; top:{t.y}%; transform: translate(calc(-50% + {px * t.depth * 2}px), calc(-50% + {py * t.depth * 2}px));"
    >
      <div
        class="ht-tile"
        title={t.label}
        style="--c: {t.color}; --s: {t.size}px; --r: {t.rot}deg; --k: {t.scale ?? 1}; animation-delay: {0.25 + i * 0.07}s;"
      >
        {@render glyph(t)}
      </div>
    </div>
  {/each}
</div>

<style>
  .ht { position: absolute; inset: 0; pointer-events: none; }
  .ht-pos {
    position: absolute;
    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
  }
  .ht-tile {
    width: var(--s);
    height: var(--s);
    display: grid;
    place-items: center;
    border-radius: calc(var(--s) * 0.26);
    color: hsl(var(--c));
    background:
      radial-gradient(120% 90% at 30% 0%, hsl(var(--c) / 0.3), transparent 65%),
      linear-gradient(180deg, #26262c, #16161a);
    border: 1px solid hsl(var(--c) / 0.28);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.14) inset,
      0 -1px 0 rgba(0, 0, 0, 0.4) inset,
      0 18px 40px rgba(0, 0, 0, 0.55),
      0 0 32px hsl(var(--c) / 0.14),
      0 0 0 6px rgba(255, 255, 255, 0.02);
    transform: rotate(var(--r));
    animation: ht-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  .ht-tile svg { width: 48%; height: 48%; }
  .ht-tex { font-size: calc(var(--s) * 0.36 * var(--k)); line-height: 1; }
  .ht-tex :global(.katex) { font-size: 1em; }

  @keyframes ht-in {
    from { opacity: 0; transform: rotate(var(--r)) translateY(14px) scale(0.85); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ht-tile { animation: none; }
    .ht-pos { transition: none; }
  }
  .ht-row { display: none; }
  /* Below this the headline fills the width and the tiles would sit on it. */
  @media (max-width: 960px) {
    .ht { display: none; }
    .ht-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px; }
    .ht-row .ht-tile { box-shadow: 0 1px 0 rgba(255, 255, 255, 0.14) inset, 0 8px 20px rgba(0, 0, 0, 0.5), 0 0 20px hsl(var(--c) / 0.12); }
  }
  @media (max-width: 380px) {
    .ht-row { gap: 9px; }
    .ht-row .ht-tile { --s: 40px !important; }
  }
</style>
