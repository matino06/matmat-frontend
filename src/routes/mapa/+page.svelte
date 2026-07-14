<script>
  import { apiClient } from "$lib/api/apiClient";
  import { userData } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";

  let loading = $state(true);
  let error = $state(false);
  let blocks = $state([]);
  let colWidth = $state(0);

  async function load() {
    loading = true;
    error = false;
    try {
      const r = await apiClient("/field-of-study/map", { method: "GET" });
      if (r.ok) blocks = await r.json();
      else error = true;
    } catch {
      error = true;
    }
    loading = false;
  }

  $effect(() => {
    if (userData.user) load();
  });

  // ── Path layout ──

  const NODE_R = 26;
  const SPACING = 96;
  const CHIP_H = 52;
  const PAD_TOP = 20;
  const PATTERN = [0, 1, 1.8, 1, 0, -1, -1.8, -1];

  function nodeState(block, o) {
    if (!block.unlocked || !o.unlocked) return "locked";
    if (o.isMastered) return "mastered";
    return "active";
  }

  function layoutBlock(block, width, phaseStart) {
    const step = Math.min(56, Math.max(34, (width - 190) / 3.6));
    const cx = width / 2;
    let y = PAD_TOP;
    let phase = phaseStart;
    const items = [];
    const nodes = [];
    let prevSub = null;
    for (const o of block.objectives ?? []) {
      if (o.subfieldId !== prevSub) {
        items.push({ type: "chip", name: o.subfieldName, y: y + CHIP_H / 2 });
        y += CHIP_H;
        prevSub = o.subfieldId;
      }
      const node = {
        type: "node",
        o,
        state: nodeState(block, o),
        x: cx + PATTERN[phase % PATTERN.length] * step,
        y: y + NODE_R + 6,
      };
      items.push(node);
      nodes.push(node);
      y += SPACING;
      phase++;
    }
    return { items, nodes, height: y + 14, endPhase: phase };
  }

  function segD(a, b) {
    const my = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }

  function segClass(a, b) {
    if (b.state === "locked") return "seg-locked";
    if (a.state === "mastered") return "seg-done";
    return "seg-open";
  }

  let laidOut = $derived.by(() => {
    if (!colWidth || blocks.length === 0) return [];
    let phase = 0;
    return blocks.map(block => {
      const r = layoutBlock(block, colWidth, phase);
      phase = r.endPhase;
      const total = block.objectives?.length ?? 0;
      const mastered = block.objectives?.filter(o => o.isMastered).length ?? 0;
      return { block, total, mastered, ...r };
    });
  });

  // First unlocked-but-unmastered objective across the whole map = "you are here"
  let currentId = $derived.by(() => {
    for (const lb of laidOut) {
      for (const n of lb.nodes) {
        if (n.state === "active") return n.o.objectiveId;
      }
    }
    return null;
  });

  let totalObjectives = $derived(blocks.reduce((s, b) => s + (b.objectives?.length ?? 0), 0));
  let totalMastered = $derived(
    blocks.reduce((s, b) => s + (b.objectives?.filter(o => o.isMastered).length ?? 0), 0)
  );

  let didAutoScroll = false;
  $effect(() => {
    if (!loading && laidOut.length > 0 && currentId != null && !didAutoScroll) {
      didAutoScroll = true;
      requestAnimationFrame(() => {
        document.getElementById("mapa-current")?.scrollIntoView({ block: "center" });
      });
    }
  });

  function openObjective(node) {
    if (node.state === "locked") return;
    goto("/tasks");
  }
</script>

<div class="page">
  <div class="map-col" bind:clientWidth={colWidth}>
    <div class="map-head">
      <h1>Mapa gradiva</h1>
      {#if !loading && !error && totalObjectives > 0}
        <div class="sub">{totalMastered} / {totalObjectives} ishoda savladano</div>
      {/if}
    </div>

    {#if loading}
      <div class="map-loading"><div class="spinner"></div> Učitavanje mape…</div>
    {:else if error}
      <div class="card card-pad map-error">
        <p>Mapu trenutno nije moguće učitati.</p>
        <button class="btn btn-primary" onclick={load}>Pokušaj ponovno</button>
      </div>
    {:else if laidOut.length === 0}
      <div class="card card-pad map-error">
        <p style="color:var(--text-faint)">Nema gradiva za prikaz.</p>
      </div>
    {:else}
      {#each laidOut as lb (lb.block.fieldId)}
        <!-- Field header -->
        <div class="field-card" class:field-locked={!lb.block.unlocked}>
          <div class="fc-row">
            <div class="fc-name">{lb.block.fieldName}</div>
            {#if lb.block.unlocked}
              <span class="fc-count">{lb.mastered}/{lb.total}</span>
            {:else}
              <svg class="fc-lock" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            {/if}
          </div>
          {#if lb.block.unlocked}
            <div class="fc-bar">
              <div class="fill" style="width:{lb.total ? Math.round((lb.mastered / lb.total) * 100) : 0}%"></div>
            </div>
          {/if}
        </div>

        <!-- Winding path -->
        <div class="path-block" style="height:{lb.height}px">
          <svg class="path-svg" width={colWidth} height={lb.height} aria-hidden="true">
            {#each lb.nodes.slice(0, -1) as a, i (a.o.objectiveId)}
              <path class="seg {segClass(a, lb.nodes[i + 1])}" d={segD(a, lb.nodes[i + 1])} />
            {/each}
          </svg>

          {#each lb.items as item, i (item.type === "node" ? "n" + item.o.objectiveId : "c" + lb.block.fieldId + "-" + i)}
            {#if item.type === "chip"}
              <div class="sub-chip" style="top:{item.y}px">{item.name}</div>
            {:else}
              {#if item.o.objectiveId === currentId}
                <div class="you-chip" style="left:{item.x}px; top:{item.y - 40}px">Ti si tu</div>
              {/if}
              <button
                id={item.o.objectiveId === currentId ? "mapa-current" : undefined}
                class="node node-{item.state}"
                style="left:{item.x}px; top:{item.y}px"
                disabled={item.state === "locked"}
                aria-label="{item.o.objectiveName} — {item.state === 'mastered' ? 'savladano' : item.state === 'active' ? 'otključano' : 'zaključano'}"
                onclick={() => openObjective(item)}
              >
                {#if item.state === "mastered"}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                {:else if item.state === "active"}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                {:else}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                {/if}
              </button>
              <div class="node-label" class:label-locked={item.state === "locked"} style="left:{item.x}px; top:{item.y + NODE_R + 8}px">
                {item.o.objectiveName}
              </div>
            {/if}
          {/each}
        </div>
      {/each}

      <!-- Destination -->
      <div class="dest">
        <div class="dest-connector"></div>
        <div class="dest-node">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </div>
        <div class="dest-card">
          <div class="dest-title">Državna matura</div>
          <div class="dest-sub">Odredište tvog puta</div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .map-col {
    max-width: 440px;
    margin: 0 auto;
  }

  .map-head {
    margin-bottom: 20px;
  }
  .map-head h1 {
    font-size: 22px;
    margin: 0 0 4px;
    letter-spacing: -0.015em;
    font-weight: 600;
  }
  .map-head .sub {
    color: var(--text-faint);
    font-size: 13px;
    font-family: var(--font-mono);
  }

  .map-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-faint);
    padding: 24px 0;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .map-error {
    text-align: center;
    padding: 40px 24px;
  }
  .map-error p {
    margin: 0 0 14px;
  }

  /* ── Field header card ── */

  .field-card {
    padding: 16px 20px;
    border-radius: var(--r-xl);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    margin: 8px 0;
  }
  .field-locked {
    opacity: 0.55;
  }
  .fc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .fc-name {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .fc-count {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-faint);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }
  .fc-lock {
    color: var(--text-faint);
    flex-shrink: 0;
  }
  .fc-bar {
    height: 5px;
    border-radius: 999px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    overflow: hidden;
    margin-top: 12px;
  }
  .fc-bar .fill {
    height: 100%;
    background: var(--success);
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* ── Path ── */

  .path-block {
    position: relative;
  }
  .path-svg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
  .seg {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
  }
  .seg-done {
    stroke: var(--success);
    opacity: 0.75;
  }
  .seg-open {
    stroke: var(--border-strong);
  }
  .seg-locked {
    stroke: var(--border-strong);
    stroke-dasharray: 0.5 12;
  }

  .sub-chip {
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 4px 12px;
    border-radius: var(--r-pill);
    background: var(--bg-elev);
    border: 1px solid var(--border);
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-faint);
    white-space: nowrap;
    max-width: 92%;
    overflow: hidden;
    text-overflow: ellipsis;
    z-index: 3;
  }

  /* ── Nodes ── */

  .node {
    position: absolute;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 1px solid transparent;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%);
    padding: 0;
    cursor: pointer;
    z-index: 2;
    transition: transform 0.12s, box-shadow 0.12s;
    font-family: inherit;
  }
  .node-mastered {
    background: var(--success);
    color: #fff;
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--success) 18%, transparent);
  }
  .node-active {
    background: var(--primary);
    color: var(--on-primary);
    box-shadow: 0 0 0 5px var(--primary-dim);
  }
  .node-active:hover {
    transform: translate(-50%, -50%) scale(1.07);
  }
  .node-mastered:hover {
    transform: translate(-50%, -50%) scale(1.05);
  }
  .node:active:not(:disabled) {
    transform: translate(-50%, -50%) scale(0.97);
  }
  .node-locked {
    background: var(--bg-elev-2);
    border-color: var(--border);
    color: var(--text-faint);
    opacity: 0.55;
    cursor: default;
  }

  .node-label {
    position: absolute;
    transform: translateX(-50%);
    width: 140px;
    text-align: center;
    font-size: 11.5px;
    line-height: 1.35;
    color: var(--text-dim);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    z-index: 1;
  }
  .label-locked {
    color: var(--text-faint);
    opacity: 0.7;
  }

  .you-chip {
    position: absolute;
    transform: translate(-50%, -100%);
    background: var(--bg-elev);
    border: 1px solid var(--primary);
    color: var(--primary);
    border-radius: var(--r-pill);
    padding: 3px 10px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    z-index: 4;
    animation: bob 1.6s ease-in-out infinite;
  }
  @keyframes bob {
    0%, 100% { transform: translate(-50%, -100%) translateY(0); }
    50% { transform: translate(-50%, -100%) translateY(-5px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .you-chip { animation: none; }
  }

  /* ── Destination ── */

  .dest {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 32px;
  }
  .dest-connector {
    width: 0;
    height: 36px;
    border-left: 4px dotted var(--border-strong);
    margin-bottom: 14px;
  }
  .dest-node {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--primary-dim);
    border: 1px solid var(--primary-border);
    color: var(--primary);
    margin-bottom: 14px;
  }
  .dest-card {
    text-align: center;
  }
  .dest-title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .dest-sub {
    font-size: 12px;
    color: var(--text-faint);
    margin-top: 2px;
  }
</style>
