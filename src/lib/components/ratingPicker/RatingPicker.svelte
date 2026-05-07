<script>
  let { onSelect } = $props();

  const RATINGS = [
    { k: 0, t: "Zaborav",      desc: "Ni rješenje mi nije jasno",                 sub: "za 1 dan",   color: "#ef4444", gain: 0 },
    { k: 1, t: "Netočno",      desc: "Netočno riješeno, rješenje shvaćeno",        sub: "za 1 dan",   color: "#f97316", gain: 0 },
    { k: 2, t: "Lako netočno", desc: "Netočno, ali rješenje izgleda jednostavno",  sub: "za 2 dana",  color: "#eab308", gain: 0 },
    { k: 3, t: "Napor",        desc: "Točno, ali s velikim naporom",               sub: "za 4 dana",  color: "#84cc16", gain: 2 },
    { k: 4, t: "Lako točno",   desc: "Točno nakon malo razmišljanja",              sub: "za 8 dana",  color: "#22c55e", gain: 4 },
    { k: 5, t: "Savršeno",     desc: "Riješio samostalno bez problema",            sub: "za 14 dana", color: "#16a34a", gain: 6 },
  ];

  let hovered = $state(null);
  let selected = $state(null);
  $derived: void 0;
  let active = $derived(hovered !== null ? hovered : selected);
  let activeR = $derived(active !== null ? RATINGS[active] : null);

  function handleClick(r) {
    selected = r.k;
    setTimeout(() => onSelect?.(r), 300);
  }
</script>

<div class="rp-wrap">
  <div class="rp-bar-wrap">
    <div class="rp-gradient"></div>
    <div class="rp-btns">
      {#each RATINGS as r (r.k)}
        <button
          class="rp-btn {selected === r.k ? 'rp-selected' : ''}"
          style="--rc: {r.color}"
          onmouseenter={() => hovered = r.k}
          onmouseleave={() => hovered = null}
          onclick={() => handleClick(r)}
        >
          <span class="rp-num">{r.k}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="rp-ends">
    <span class="rp-end-fail">✗ Nisam uspio</span>
    <span class="rp-end-pass">✓ Uspio sam</span>
  </div>

  <div class="rp-desc rp-desc-visible">
    {#if activeR}
      <span class="rp-desc-name" style="color: {activeR.color}">{activeR.k} — {activeR.t}</span>
      <span class="rp-desc-text">{activeR.desc}</span>
      <span class="rp-desc-sub">Ponovi {activeR.sub}</span>
    {:else}
      <span class="rp-desc-name" style="color: var(--text-faint)">0–2</span>
      <span class="rp-desc-text">Nisam riješio · zadatak se vraća uskoro</span>
      <span class="rp-desc-divider">·</span>
      <span class="rp-desc-name" style="color: var(--success)">3–5</span>
      <span class="rp-desc-text">Riješio · razmak između ponavljanja se povećava</span>
    {/if}
  </div>
</div>
