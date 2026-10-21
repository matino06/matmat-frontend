<script>
  // The open one-time tip (store/savjeti): a ring around its element and a bubble beside it.
  // Unlike the walkthrough it doesn't dim or block the page.
  import { savjeti, SAVJETI, zatvoriSavjet, odgodiSavjet } from "$lib/store/savjeti.svelte";

  const GAP = 10;
  let savjet = $derived(SAVJETI[savjeti.aktivan]);
  let vw = $state(1024);
  let vh = $state(768);
  let rect = $state(null);

  $effect(() => {
    const sel = `[data-tour="${savjet.meta}"]`;
    let raf;
    let prvi = true;
    const prati = () => {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      const vidljiv = r && r.width && r.height && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
      if (!vidljiv) {
        if (prvi) return odgodiSavjet();
        rect = null;
      } else if (!rect || ["top", "left", "bottom", "right"].some((k) => Math.abs(rect[k] - r[k]) > 0.5)) {
        rect = { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
      }
      prvi = false;
      raf = requestAnimationFrame(prati);
    };
    raf = requestAnimationFrame(prati);
    return () => cancelAnimationFrame(raf);
  });

  let visina = $state(0);
  let poz = $derived.by(() => {
    if (!rect) return null;
    const w = Math.min(300, vw - 24);
    const h = visina || 120;
    // beside a nav item, under anything else
    if (rect.right + GAP + w <= vw - 12 && rect.right < vw / 3) {
      return { top: Math.min(Math.max(12, (rect.top + rect.bottom) / 2 - h / 2), vh - h - 12), left: rect.right + GAP, w };
    }
    const left = Math.min(Math.max(12, (rect.left + rect.right) / 2 - w / 2), vw - w - 12);
    const top = rect.bottom + GAP + h <= vh - 12 ? rect.bottom + GAP : Math.max(12, rect.top - GAP - h);
    return { top, left, w };
  });
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} />

{#if rect && poz}
  <div
    class="sv-prsten"
    style="top:{rect.top - 4}px;left:{rect.left - 4}px;width:{rect.right - rect.left + 8}px;height:{rect.bottom - rect.top + 8}px"
  ></div>
  <div class="sv-oblak" role="status" style="top:{poz.top}px;left:{poz.left}px;width:{poz.w}px" bind:offsetHeight={visina}>
    <h3>{savjet.naslov}</h3>
    <p>{savjet.tekst}</p>
    <div class="sv-gumbi"><button class="btn btn-primary" onclick={zatvoriSavjet}>U redu</button></div>
  </div>
{/if}

<style>
  .sv-prsten {
    position: fixed;
    z-index: 1050;
    border-radius: 10px;
    box-shadow: 0 0 0 2px var(--primary);
    pointer-events: none;
    animation: sv-puls 1.6s ease-in-out 2;
  }
  @keyframes sv-puls {
    50% { box-shadow: 0 0 0 5px color-mix(in oklch, var(--primary) 35%, transparent); }
  }
  .sv-oblak {
    position: fixed;
    z-index: 1051;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
    animation: sv-in 0.2s ease;
  }
  @keyframes sv-in {
    from { opacity: 0; transform: translateY(4px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sv-prsten, .sv-oblak { animation: none; }
  }
  h3 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-dim);
  }
  .sv-gumbi {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  }
</style>
