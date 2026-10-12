<script>
  // A slice of the map of the syllabus (/mapa) for /kako-radi: one unit's
  // learning outcomes on a winding path, mastered ones done, the current one
  // open, the rest locked until what they build on is mastered. Drawn like the
  // real map; the outcome names are an example, not read from the backend.

  const UNIT = "Eksponencijalne i logaritamske funkcije";
  const NODES = [
    { name: "Potencije i korijeni", state: "mastered" },
    { name: "Eksponencijalna funkcija", state: "mastered" },
    { name: "Logaritam i pravila logaritmiranja", state: "current" },
    { name: "Logaritamske jednadžbe", state: "locked" },
    { name: "Eksponencijalne i logaritamske nejednadžbe", state: "locked" },
  ];
  // Colour of the Algebra i funkcije field on the map.
  const FACE = "oklch(0.60 0.19 150)";
  const BEVEL = "oklch(0.45 0.19 150)";

  // Fits the column: on a phone the path swings less so the names stay on screen.
  let cw = $state(360);
  let W = $derived(Math.min(360, Math.round(cw)));
  let amp = $derived(W < 360 ? 34 : 56);
  const STEP = 128;
  const TOP = 64;
  const SWING = [0, 1, 1.4, 0.4, -0.8];
  const x = (i) => W / 2 + SWING[i] * amp;
  const y = (i) => TOP + i * STEP;
  const H = y(NODES.length - 1) + 64;

  function seg(i) {
    const my = (y(i) + y(i + 1)) / 2;
    return `M ${x(i)} ${y(i)} C ${x(i)} ${my}, ${x(i + 1)} ${my}, ${x(i + 1)} ${y(i + 1)}`;
  }

  // The node whose note is shown under the path; the current one to begin with.
  let picked = $state(2);
  const note = (i) => {
    const n = NODES[i];
    if (n.state === "mastered") return `${n.name}: svladano. Vraća se samo kad ga je vrijeme ponoviti.`;
    if (n.state === "current") return `${n.name}: ovdje si. Otključano je jer si svladao ishode prije njega.`;
    return `${n.name}: otključava se kad svladaš „${NODES[i - 1].name}”.`;
  };
</script>

<figure class="pp">
  <div class="pp-map" style="height:{H}px" bind:clientWidth={cw}>
    <svg width={W} height={H} viewBox="0 0 {W} {H}" aria-hidden="true">
      {#each NODES.slice(0, -1) as n, i (n.name)}
        <path
          d={seg(i)}
          fill="none"
          stroke={n.state === "mastered" ? FACE : "var(--border-strong)"}
          stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray={NODES[i + 1].state === "locked" ? "3 13" : "0"}
        />
      {/each}
    </svg>

    <div class="pp-chip">{UNIT}</div>

    {#each NODES as n, i (n.name)}
      <div class="pp-node-wrap" style="left:{x(i)}px; top:{y(i)}px">
        <button
          class="pp-node pp-{n.state}"
          class:picked={picked === i}
          style="--face:{FACE}; --bevel:{BEVEL}"
          aria-pressed={picked === i}
          aria-label="{n.name}: {n.state === 'mastered' ? 'svladano' : n.state === 'current' ? 'trenutno' : 'zaključano'}"
          onclick={() => (picked = i)}
          onmouseenter={() => (picked = i)}
        >
          {#if n.state === "mastered"}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          {:else if n.state === "current"}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" stroke="none"><polygon points="8 5 19 12 8 19" /></svg>
          {:else}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          {/if}
        </button>
        <span class="pp-label" class:right={SWING[i] <= 0.4} class:locked={n.state === "locked"} aria-hidden="true">{n.name}</span>
      </div>
    {/each}
  </div>

  <p class="pp-note" aria-live="polite">{note(picked)}</p>
  <figcaption>Primjer dijela mape gradiva. Prijeđi preko ishoda ili ga dodirni.</figcaption>
</figure>

<style>
  .pp { margin: 0; }
  .pp-map { position: relative; width: 360px; max-width: 100%; margin: 0 auto; }
  .pp-map > svg { position: absolute; inset: 0; overflow: visible; }
  .pp-chip {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    padding: 5px 14px;
    border-radius: var(--r-pill);
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-faint);
    white-space: nowrap;
  }
  .pp-node-wrap { position: absolute; transform: translate(-50%, -50%); line-height: 0; }
  .pp-node {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 32%, rgba(255, 255, 255, 0.28), transparent 60%), var(--face);
    box-shadow: 0 6px 0 var(--bevel);
    transition: transform 0.12s;
  }
  .pp-node:hover { transform: translateY(-2px); }
  .pp-current { width: 70px; height: 70px; outline: 3px dashed color-mix(in oklab, var(--face) 70%, transparent); outline-offset: 7px; }
  .pp-locked {
    background: var(--bg-elev-2);
    border: 1px solid var(--border-strong);
    box-shadow: 0 6px 0 var(--border-strong);
  }
  .pp-node.picked:not(.pp-current) { outline: 2px solid var(--text-faint); outline-offset: 5px; }
  .pp-label {
    position: absolute;
    top: calc(50% + 3px);
    right: calc(100% + 14px);
    transform: translateY(-50%);
    width: max-content;
    max-width: 150px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    text-align: right;
    color: var(--text);
    pointer-events: none;
  }
  .pp-label.right { right: auto; left: calc(100% + 14px); text-align: left; }
  .pp-label.locked { font-weight: 500; color: var(--text-faint); }
  .pp-note {
    margin: 28px auto 0;
    max-width: 30em;
    min-height: 3.2em;
    padding: 12px 16px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-dim);
    text-align: center;
  }
  figcaption { margin-top: 10px; text-align: center; font-size: 13px; color: var(--text-faint); }

  @media (max-width: 420px) {
    .pp-label { max-width: 112px; font-size: 12.5px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pp-node { transition: none; }
  }
</style>
