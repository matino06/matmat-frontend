<script>
  // PROTOTIP: plutajuća traka za prebacivanje varijanti (?variant=), samo u dev buildu.
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let { variants, names = {} } = $props();

  let current = $derived(page.url.searchParams.get("variant") ?? variants[0]);

  function go(step) {
    const i = (variants.indexOf(current) + step + variants.length) % variants.length;
    const url = new URL(page.url);
    url.searchParams.set("variant", variants[i]);
    goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  onMount(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t.closest?.("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
</script>

{#if import.meta.env.DEV}
  <div class="switcher">
    <button onclick={() => go(-1)} aria-label="Prethodna varijanta">←</button>
    <span>{current}{names[current] ? ` (${names[current]})` : ""}</span>
    <button onclick={() => go(1)} aria-label="Sljedeća varijanta">→</button>
  </div>
{/if}

<style>
  .switcher {
    position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 9999;
    display: flex; align-items: center; gap: 12px; padding: 8px 14px; border-radius: 999px;
    background: #111; color: #fff; font: 600 13px var(--font-sans); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  }
  button { all: unset; cursor: pointer; padding: 2px 8px; border-radius: 999px; background: #333; }
  button:hover { background: #555; }
</style>
