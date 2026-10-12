<script>
  // PROTOTIP: plutajuća traka za prebacivanje varijanti (?variant=). Ne prikazuje se u produkciji.
  import { dev } from "$app/environment";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  let { variants, names = {}, status = "" } = $props();

  let current = $derived(page.url.searchParams.get("variant") ?? variants[0]);

  function go(step) {
    const i = (variants.indexOf(current) + step + variants.length) % variants.length;
    const url = new URL(page.url);
    url.searchParams.set("variant", variants[i]);
    goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }

  function onKey(e) {
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  }
</script>

<svelte:window onkeydown={onKey} />

{#if dev}
  <div class="proto-bar">
    <button onclick={() => go(-1)} aria-label="Prethodna varijanta">←</button>
    <span class="label"><b>{current}</b> {names[current] ? `(${names[current]})` : ""}</span>
    <button onclick={() => go(1)} aria-label="Sljedeća varijanta">→</button>
    {#if status}<span class="status">{status}</span>{/if}
  </div>
{/if}

<style>
  .proto-bar {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 999px;
    background: #fde047;
    color: #111;
    font: 500 13px/1 ui-sans-serif, system-ui, sans-serif;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  }
  button {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: none;
    background: #111;
    color: #fde047;
    cursor: pointer;
    font-size: 15px;
  }
  .status {
    padding-left: 10px;
    border-left: 1px solid rgba(0, 0, 0, 0.25);
    font-size: 12px;
    max-width: 520px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
