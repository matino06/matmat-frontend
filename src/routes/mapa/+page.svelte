<script>
  import { apiClient } from "$lib/api/apiClient";
  import { userData } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";
  import { calculateExamProgress } from "$lib/utils/progress";

  let loading = $state(true);
  let error = $state(false);
  let blocks = $state([]);
  let colWidth = $state(0);
  let topbarH = $state(60);
  let hoveredId = $state(null);

  // Right-rail widgets (readiness ring + streak + today's goal progress)
  let dailyGoal = $state(0);
  let completedToday = $state(0);
  let streak = $state(0);
  let readiness = $state(0);

  // Readiness ring geometry
  const RING = 104;
  const RING_STROKE = 9;
  const RING_R = (RING - RING_STROKE) / 2;
  const RING_CIRC = 2 * Math.PI * RING_R;
  let ringDash = $derived(RING_CIRC * (readiness / 100));

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

  // Consecutive days (up to today) where the daily goal was met. Mirrors the
  // logic in GoalProgressToast: today counts if met, but an unmet *today* is
  // skipped rather than breaking the streak; any earlier unmet day ends it.
  function computeStreak(calendarDays) {
    if (!calendarDays?.length) return 0;
    const met = new Map(calendarDays.map(d => [String(d.date).slice(0, 10), !!d.goalMet]));
    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 3660; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (met.get(key)) count++;
      else if (i > 0) break;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  // Tasks actually solved today = the `completed` count on today's calendar entry
  // (there is no entry until the first solve → 0). `todayGoal` is the day's target,
  // not a completed count, so it must not be used here.
  function todayCompleted(calendarDays) {
    if (!calendarDays?.length) return 0;
    const key = new Date().toISOString().slice(0, 10);
    const entry = calendarDays.find(d => String(d.date).slice(0, 10) === key);
    return entry?.completed ?? 0;
  }

  async function loadGoal() {
    try {
      const r = await apiClient("/user-goal", { method: "GET" });
      if (!r.ok) return;
      const data = await r.json();
      if (typeof data?.dailyGoal === "number" && data.dailyGoal > 0) dailyGoal = data.dailyGoal;
      completedToday = todayCompleted(data?.calendarDays);
      streak = computeStreak(data?.calendarDays);
    } catch {}
  }

  // Exam readiness — same computation as the Napredak page, so the % matches.
  async function loadReadiness() {
    try {
      const [courseRes, objs] = await Promise.all([
        apiClient("/account/current-course", { method: "GET" }),
        fetchObjectivesWithStatus(),
      ]);
      const course = courseRes.ok ? await courseRes.json() : null;
      if (course?.courseId) readiness = calculateExamProgress(objs, course.courseId);
    } catch {}
  }

  $effect(() => {
    if (userData.user) {
      load();
      loadGoal();
      loadReadiness();
    }
  });

  let goalPct = $derived(dailyGoal ? Math.min(100, Math.round((completedToday / dailyGoal) * 100)) : 0);
  let goalRemaining = $derived(Math.max(0, dailyGoal - completedToday));

  // Keep the sticky section banners offset exactly below the (also-sticky) topbar.
  $effect(() => {
    const measure = () => {
      const h = document.querySelector(".topbar")?.getBoundingClientRect().height;
      if (h) topbarH = Math.round(h);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });

  // ── Path layout ──

  const NODE_R = 40;
  const SPACING = 168;
  const CHIP_H = 46;
  const PAD_TOP = 16;
  const PATTERN = [0, 1, 1.7, 1, 0, -1, -1.7, -1];

  // Per-field decorative colours (theme-independent). c = node/banner face, d = 3D bevel.
  const PALETTE = [
    { c: "oklch(0.60 0.19 150)", d: "oklch(0.45 0.19 150)" },
    { c: "oklch(0.58 0.19 235)", d: "oklch(0.43 0.19 235)" },
    { c: "oklch(0.58 0.18 300)", d: "oklch(0.43 0.18 300)" },
  ];

  function nodeState(block, o) {
    if (!block.unlocked || !o.unlocked) return "locked";
    if (o.isMastered) return "mastered";
    return "active";
  }

  function layoutBlock(block, width, phaseStart, pal) {
    const step = Math.min(58, Math.max(30, (width - 200) / 3.4));
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
      const state = nodeState(block, o);
      const locked = state === "locked";
      const node = {
        type: "node",
        o,
        state,
        x: cx + PATTERN[phase % PATTERN.length] * step,
        y: y + NODE_R + 6,
        bg: locked ? "var(--bg-elev-2)" : pal.c,
        bevel: locked ? "var(--border-strong)" : pal.d,
      };
      items.push(node);
      nodes.push(node);
      y += SPACING;
      phase++;
    }
    return { items, nodes, height: y + 18, endPhase: phase };
  }

  function segD(a, b) {
    const my = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }

  let laidOut = $derived.by(() => {
    if (!colWidth || blocks.length === 0) return [];
    let phase = 0;
    return blocks.map((block, i) => {
      const pal = PALETTE[i % PALETTE.length];
      const r = layoutBlock(block, colWidth, phase, pal);
      phase = r.endPhase;
      const total = block.objectives?.length ?? 0;
      const mastered = block.objectives?.filter(o => o.isMastered).length ?? 0;
      const pct = total ? Math.round((mastered / total) * 100) : 0;
      return { block, total, mastered, pct, pal, allDone: total > 0 && mastered === total, ...r };
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
    if (!loading && laidOut.length > 0 && !didAutoScroll) {
      didAutoScroll = true;
      const returnId = sessionStorage.getItem("mapaReturnObjectiveId");
      const targetId = returnId ?? currentId;
      if (returnId != null) sessionStorage.removeItem("mapaReturnObjectiveId");
      if (targetId == null) return;
      requestAnimationFrame(() => {
        document.getElementById("mapa-node-" + targetId)?.scrollIntoView({ block: "center" });
      });
    }
  });

  // Pending "svejedno nastavi" confirmation.
  // { kind: "objective", node } | { kind: "field", block, firstNode }
  let confirmPrompt = $state(null);

  function goToObjective(node) {
    sessionStorage.setItem("mapaReturnObjectiveId", node.o.objectiveId);
    const q = new URLSearchParams({
      objectiveId: node.o.objectiveId,
      name: node.o.objectiveName ?? "",
    });
    goto(`/ponavljanje?${q}`);
  }

  function openObjective(node) {
    if (node.state === "locked") return; // klik na krug zaključanog nodea = bez efekta
    goToObjective(node);
  }

  function studyField(block, firstNode) {
    confirmPrompt = { kind: "field", block, firstNode };
  }

  function goToField(block, firstNode) {
    if (firstNode) sessionStorage.setItem("mapaReturnObjectiveId", firstNode.o.objectiveId); // scroll natrag na polje
    const q = new URLSearchParams({
      fieldId: block.fieldId,
      fieldName: block.fieldName ?? "",
    });
    goto(`/ponavljanje?${q}`);
  }

  function proceedConfirm() {
    const p = confirmPrompt;
    confirmPrompt = null;
    if (!p) return;
    if (p.kind === "objective") goToObjective(p.node);
    else goToField(p.block, p.firstNode);
  }
</script>

<div class="page">
  <div class="map-layout" style="--topbar-h:{topbarH}px">
  <div class="map-col" bind:clientWidth={colWidth}>

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
        <div class="map-section">
        <!-- Colored section banner -->
        <div
          class="banner"
          class:banner-locked={!lb.block.unlocked}
          style={lb.block.unlocked ? `background:${lb.pal.c}` : ""}
        >
          <div class="bn-meta">
            <div class="bn-eyebrow">
              Područje{#if lb.block.unlocked} · {lb.pct}% svladano{/if}
            </div>
            <div class="bn-name">{lb.block.fieldName}</div>
          </div>
          <div class="bn-right">
            {#if lb.block.unlocked}
              <div class="bn-pill">{lb.mastered}/{lb.total}</div>
            {:else}
              <svg class="bn-lock" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            {/if}
            <button class="bn-study" onclick={() => studyField(lb.block, lb.nodes[0])} title="Vježbaj cijelo područje">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                <polygon points="8 5 19 12 8 19"/>
              </svg>
              Uči
            </button>
          </div>
        </div>

        <!-- Winding path -->
        <div class="path-block" style="height:{lb.height}px">
          <svg class="path-svg" width={colWidth} height={lb.height} aria-hidden="true">
            {#each lb.nodes.slice(0, -1) as a, i (a.o.objectiveId)}
              {@const b = lb.nodes[i + 1]}
              <path
                class="seg"
                d={segD(a, b)}
                stroke={a.state === "mastered" ? lb.pal.c : "var(--border)"}
                stroke-dasharray={b.state === "locked" ? "3 13" : "0"}
              />
            {/each}
          </svg>

          {#each lb.items as item, i (item.type === "node" ? "n" + item.o.objectiveId : "c" + lb.block.fieldId + "-" + i)}
            {#if item.type === "chip"}
              <div class="sub-chip" style="top:{item.y}px">{item.name}</div>
            {:else}
              {@const isCurrent = item.o.objectiveId === currentId}
              {#if isCurrent}
                <div class="glow" style="left:{item.x}px; top:{item.y}px; background:radial-gradient(circle, {lb.pal.c} 0%, transparent 68%)"></div>
                <svg class="ring" style="left:{item.x}px; top:{item.y}px" viewBox="0 0 110 110" fill="none" aria-hidden="true">
                  <circle cx="55" cy="55" r="52" stroke={lb.pal.c} stroke-width="3" stroke-dasharray="10 12" stroke-linecap="round" opacity="0.7"/>
                </svg>
                <div class="kreni" style="left:{item.x}px; top:{item.y - 72}px">KRENI →</div>
              {/if}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="node-wrap"
                class:node-wrap-hovered={hoveredId === item.o.objectiveId}
                style="left:{item.x}px; top:{item.y}px"
                onmouseenter={() => (hoveredId = item.o.objectiveId)}
                onmouseleave={() => { if (hoveredId === item.o.objectiveId) hoveredId = null; }}
                onfocusin={() => (hoveredId = item.o.objectiveId)}
                onfocusout={() => { if (hoveredId === item.o.objectiveId) hoveredId = null; }}
              >
                <button
                  id={"mapa-node-" + item.o.objectiveId}
                  class="node node-{item.state}"
                  class:node-current={isCurrent}
                  style="--face:{item.bg}; --bevel:{item.bevel}"
                  disabled={item.state === "locked"}
                  aria-label="{item.o.objectiveName} — {item.state === 'mastered' ? 'savladano' : item.state === 'active' ? 'otključano' : 'zaključano'}"
                  onclick={() => openObjective(item)}
                >
                  {#if item.state === "mastered"}
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span class="crown">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#3a2a00" stroke="none"><path d="M3 7l4 5 5-7 5 7 4-5-2 13H5z"/></svg>
                    </span>
                  {:else if isCurrent}
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" stroke="none">
                      <polygon points="8 5 19 12 8 19"/>
                    </svg>
                  {:else if item.state === "active"}
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  {:else}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  {/if}
                </button>

                {#if hoveredId === item.o.objectiveId}
                  <div class="node-hovercard">
                    <div class="hc-name">{item.o.objectiveName}</div>
                    {#if item.o.lastQ == null}
                      <div class="hc-empty">Još nije rješavano</div>
                    {:else}
                      <div class="hc-stars" aria-label="Zadnja ocjena {item.o.lastQ} od 5">
                        {#each [1, 2, 3, 4, 5] as s (s)}
                          <svg class="hc-star" class:hc-star-on={s <= item.o.lastQ} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                            <polygon points="12 2 15 9 22 9.3 16.5 13.9 18.3 21 12 17 5.7 21 7.5 13.9 2 9.3 9 9"/>
                          </svg>
                        {/each}
                      </div>
                    {/if}
                    <button
                      class="hc-play"
                      onclick={() => (item.state === "locked" ? (confirmPrompt = { kind: "objective", node: item }) : openObjective(item))}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                        <polygon points="8 5 19 12 8 19"/>
                      </svg>
                      Ponovi
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>

        <!-- Checkpoint between areas -->
        <div class="checkpoint">
          <div class="cp-tile" class:cp-done={lb.allDone}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
            </svg>
          </div>
          <div class="cp-label" class:cp-label-done={lb.allDone}>
            {lb.allDone ? "Područje svladano!" : "Kontrolna točka"}
          </div>
        </div>
        </div>
      {/each}

      <!-- Destination -->
      <div class="dest">
        <div class="dest-node">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </div>
        <div class="dest-title">Državna matura</div>
        <div class="dest-sub">Cilj tvog puta — sve započinje jednim korakom</div>
      </div>
    {/if}
  </div>

  <aside class="map-rail">
    <!-- Readiness ring -->
    <div class="rail-card rail-ring">
      <div class="ring-wrap-sm">
        <svg width={RING} height={RING} style="transform:rotate(-90deg)">
          <circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke="var(--bg-elev-2)" stroke-width={RING_STROKE}/>
          <circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none"
            stroke="var(--primary)" stroke-width={RING_STROKE} stroke-linecap="round"
            stroke-dasharray="{ringDash} {RING_CIRC - ringDash}"
            style="transition: stroke-dasharray 1s ease"/>
        </svg>
        <div class="ring-inner-sm">
          <span class="ring-pct">{readiness}<span class="ring-pct-u">%</span></span>
        </div>
      </div>
      <div class="ring-meta-sm">
        <div class="ring-title">Spremnost</div>
        <div class="ring-desc">za državnu maturu</div>
      </div>
    </div>

    <!-- Streak -->
    <div class="rail-card rail-streak">
      <div class="rail-ico rail-ico-flame">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 2c1 3-1 4-1 7a4 4 0 0 0 8 0c0-1 0-2-1-3 2 2 3 4 3 7a7 7 0 0 1-14 0c0-4 4-6 5-11z"/>
        </svg>
      </div>
      <div class="rail-stat">
        <div class="rail-stat-n">{streak}</div>
        <div class="rail-stat-l">{streak === 1 ? "dan u nizu" : "dana u nizu"}</div>
      </div>
    </div>

    <!-- Today's goal -->
    <div class="rail-card">
      <div class="rail-card-head">
        <span class="rail-card-title">Danas riješeno</span>
        <span class="rail-mono">{completedToday}/{dailyGoal}</span>
      </div>
      <div class="rail-bar">
        <div class="rail-bar-fill" class:rail-bar-done={dailyGoal > 0 && completedToday >= dailyGoal} style="width:{goalPct}%"></div>
      </div>
      <div class="rail-sub">
        {#if dailyGoal > 0 && completedToday >= dailyGoal}
          Dnevni cilj postignut!
        {:else}
          Još {goalRemaining} {goalRemaining === 1 ? "zadatak" : "zadataka"} do cilja
        {/if}
      </div>
    </div>

    <!-- Mock exam CTA -->
    <button class="rail-cta" onclick={() => goto("/mock-exam")}>
      <span class="rail-cta-ico">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
      </span>
      <span class="rail-cta-text">
        <span class="rail-cta-title">Probne mature</span>
        <span class="rail-cta-sub">Riješi cijeli ispit</span>
      </span>
      <svg class="rail-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  </aside>
  </div>
</div>

<svelte:window onkeydown={(e) => { if (e.key === "Escape" && confirmPrompt) confirmPrompt = null; }} />

{#if confirmPrompt}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="lock-backdrop" onclick={() => (confirmPrompt = null)}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="lock-modal" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="lock-title" onclick={(e) => e.stopPropagation()}>
      <div class="lock-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      {#if confirmPrompt.kind === "field"}
        <h2 id="lock-title" class="lock-title">Područje možda ovisi o drugom gradivu</h2>
        <p class="lock-text">
          Za vježbanje područja <strong>{confirmPrompt.block.fieldName}</strong> mogu se pojaviti zadaci koji ovise o gradivu iz drugih područja koje još nisi svladao. Želiš li svejedno nastaviti?
        </p>
      {:else}
        <h2 id="lock-title" class="lock-title">Gradivo još nije otključano</h2>
        <p class="lock-text">
          Za rješavanje cilja <strong>{confirmPrompt.node.o.objectiveName}</strong> s razumijevanjem potrebno je znanje iz prethodnih zadataka koje još nisi svladao. Želiš li svejedno nastaviti?
        </p>
      {/if}
      <div class="lock-actions">
        <button class="btn btn-quiet" onclick={() => (confirmPrompt = null)}>Odustani</button>
        <button class="btn btn-primary" onclick={proceedConfirm}>Svejedno nastavi</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .map-layout {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 28px;
  }
  .map-col {
    flex: 1 1 600px;
    max-width: 600px;
    background: radial-gradient(1000px 520px at 50% -8%, color-mix(in oklab, var(--primary) 7%, var(--bg)) 0%, var(--bg) 60%);
  }

  /* ── Right rail ── */
  .map-rail {
    flex: 0 0 280px;
    position: sticky;
    top: calc(var(--topbar-h, 60px) + 8px);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .rail-card {
    padding: 16px;
    border-radius: var(--r-xl);
    border: 1px solid var(--border);
    background: var(--bg-elev);
  }
  .rail-ring {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ring-wrap-sm {
    position: relative;
    width: 104px;
    height: 104px;
    flex-shrink: 0;
  }
  .ring-inner-sm {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .ring-pct {
    font-size: 24px;
    font-weight: 700;
    font-family: var(--font-mono);
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .ring-pct-u {
    font-size: 13px;
    color: var(--text-faint);
    margin-left: 1px;
  }
  .ring-title {
    font-size: 14px;
    font-weight: 600;
  }
  .ring-desc {
    font-size: 12px;
    color: var(--text-faint);
    margin-top: 2px;
  }
  .rail-streak {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .rail-ico {
    width: 40px;
    height: 40px;
    border-radius: var(--r-md);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .rail-ico-flame {
    background: oklch(0.62 0.19 45 / 0.16);
    color: oklch(0.68 0.2 45);
  }
  .rail-stat-n {
    font-size: 22px;
    font-weight: 800;
    font-family: var(--font-mono);
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .rail-stat-l {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .rail-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }
  .rail-card-title {
    font-size: 13px;
    font-weight: 600;
  }
  .rail-mono {
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-mono);
  }
  .rail-bar {
    height: 8px;
    border-radius: var(--r-pill);
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .rail-bar-fill {
    height: 100%;
    border-radius: var(--r-pill);
    background: var(--primary);
    transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .rail-bar-done {
    background: var(--success);
  }
  .rail-sub {
    font-size: 11.5px;
    color: var(--text-faint);
    margin-top: 8px;
  }
  .rail-cta {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border-radius: var(--r-xl);
    border: 1px solid var(--primary-border);
    background: var(--primary-dim);
    color: var(--text);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: border-color 0.15s, background 0.15s, transform 0.12s;
  }
  .rail-cta:hover {
    background: color-mix(in oklab, var(--primary) 20%, transparent);
    transform: translateY(-1px);
  }
  .rail-cta-ico {
    width: 34px;
    height: 34px;
    border-radius: var(--r-md);
    display: grid;
    place-items: center;
    background: var(--primary);
    color: var(--on-primary);
    flex-shrink: 0;
  }
  .rail-cta-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .rail-cta-title {
    font-size: 13.5px;
    font-weight: 600;
  }
  .rail-cta-sub {
    font-size: 11.5px;
    color: var(--text-faint);
  }
  .rail-cta-arrow {
    color: var(--primary);
    flex-shrink: 0;
  }

  @media (max-width: 900px) {
    .map-layout {
      flex-direction: column;
      align-items: stretch;
    }
    .map-col {
      order: 2;
      flex-basis: auto;
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
    }
    .map-rail {
      order: 1;
      position: static;
      flex-basis: auto;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      flex-direction: row;
      flex-wrap: wrap;
    }
    .map-rail > * {
      flex: 1 1 160px;
    }
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

  /* ── Colored section banner ── */

  /* Each field is its own sticky-scope so its banner pins while the section is
     in view, then is pushed out by the next section's banner. */
  .map-section {
    position: relative;
  }

  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 16px 20px;
    border-radius: var(--r-2xl);
    margin-bottom: 12px;
    box-shadow: 0 8px 24px -12px rgba(0, 0, 0, 0.6);
    position: sticky;
    top: calc(var(--topbar-h, 60px) + 8px);
    z-index: 10;
  }
  .banner-locked {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    box-shadow: none;
    opacity: 0.7;
  }
  .bn-meta {
    min-width: 0;
  }
  .bn-eyebrow {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.78);
  }
  .banner-locked .bn-eyebrow {
    color: var(--text-faint);
  }
  .bn-name {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.015em;
    color: #fff;
  }
  .banner-locked .bn-name {
    color: var(--text-faint);
  }
  .bn-pill {
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 13px;
    padding: 6px 14px;
    border-radius: var(--r-pill);
    white-space: nowrap;
  }
  .bn-lock {
    color: var(--text-faint);
    flex-shrink: 0;
  }
  .bn-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .bn-study {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: none;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, transform 0.12s;
  }
  .bn-study:hover {
    background: rgba(255, 255, 255, 0.34);
    transform: translateY(-1px);
  }
  .banner-locked .bn-study {
    background: var(--bg-elev-2);
    color: var(--text-dim);
    border: 1px solid var(--border);
  }
  .banner-locked .bn-study:hover {
    color: var(--text);
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
    stroke-width: 8;
    stroke-linecap: round;
  }

  .sub-chip {
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
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
    max-width: 92%;
    overflow: hidden;
    text-overflow: ellipsis;
    z-index: 3;
  }

  /* ── Nodes ── */

  .node-wrap {
    position: absolute;
    transform: translate(-50%, -50%);
    line-height: 0;
    z-index: 2;
  }
  .node-wrap-hovered {
    z-index: 15;
  }

  .node {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: none;
    display: grid;
    place-items: center;
    position: relative;
    padding: 0;
    cursor: pointer;
    background: radial-gradient(circle at 50% 32%, rgba(255, 255, 255, 0.28), transparent 60%), var(--face);
    box-shadow: 0 7px 0 var(--bevel);
    transition: transform 0.12s;
    font-family: inherit;
  }
  .node:hover:not(:disabled) {
    transform: translateY(-3px);
  }
  .node:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: 0 3px 0 var(--bevel);
  }
  .node-locked {
    border: 1px solid var(--border-strong);
    cursor: default;
  }
  .node-current {
    width: 92px;
    height: 92px;
    animation: dgPulse 1.8s ease-in-out infinite;
  }

  .crown {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: oklch(0.75 0.15 85);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
  }

  .glow {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 118px;
    height: 118px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 1;
    animation: dgGlow 2s ease-in-out infinite;
  }
  .ring {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 110px;
    height: 110px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 1;
    animation: dgSpin 9s linear infinite;
  }
  .kreni {
    position: absolute;
    transform: translate(-50%, -100%);
    background: #fff;
    color: #0a0a0b;
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 0.02em;
    padding: 8px 18px;
    border-radius: var(--r-md);
    white-space: nowrap;
    box-shadow: 0 4px 0 #d0d0d4;
    z-index: 4;
    animation: dgBob 1.5s ease-in-out infinite;
  }

  /* ── Hover card ── */

  .node-hovercard {
    position: absolute;
    top: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    width: 200px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.5);
    line-height: 1.3;
  }
  /* pointer triangle */
  .node-hovercard::before {
    content: "";
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 11px;
    height: 11px;
    background: var(--bg-elev);
    border-left: 1px solid var(--border);
    border-top: 1px solid var(--border);
  }
  .hc-name {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
    text-align: center;
  }
  .hc-empty {
    font-size: 11px;
    color: var(--text-faint);
  }
  .hc-stars {
    display: flex;
    gap: 3px;
  }
  .hc-star {
    color: var(--border-strong);
  }
  .hc-star-on {
    color: oklch(0.75 0.15 85);
  }
  .hc-play {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    padding: 6px 14px;
    border: none;
    border-radius: var(--r-pill);
    background: var(--primary);
    color: var(--on-primary);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.12s, background 0.12s;
  }
  .hc-play:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }

  @keyframes dgPulse {
    0%, 100% { box-shadow: 0 7px 0 var(--bevel), 0 0 0 0 rgba(255, 255, 255, 0.35); }
    50% { box-shadow: 0 7px 0 var(--bevel), 0 0 0 8px rgba(255, 255, 255, 0); }
  }
  @keyframes dgBob {
    0%, 100% { transform: translate(-50%, -100%) translateY(0); }
    50% { transform: translate(-50%, -100%) translateY(-6px); }
  }
  @keyframes dgGlow {
    0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.12); }
  }
  @keyframes dgSpin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .node-current, .kreni, .glow, .ring { animation: none; }
  }

  /* ── Checkpoint ── */

  .checkpoint {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;
  }
  .cp-tile {
    width: 60px;
    height: 60px;
    border-radius: var(--r-xl);
    display: grid;
    place-items: center;
    background: var(--bg-elev-2);
    box-shadow: 0 5px 0 var(--border-strong);
    color: var(--text-faint);
  }
  .cp-done {
    background: oklch(0.75 0.15 85);
    box-shadow: 0 5px 0 oklch(0.47 0.15 85);
    color: #3a2a00;
  }
  .cp-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-faint);
    margin-top: 8px;
  }
  .cp-label-done {
    color: oklch(0.75 0.15 85);
  }

  /* ── Destination ── */

  .dest {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0 32px;
  }
  .dest-node {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.3), transparent 60%), var(--primary);
    box-shadow: 0 7px 0 hsl(239 60% 45%);
    margin-bottom: 16px;
  }
  .dest-title {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .dest-sub {
    font-size: 12px;
    color: var(--text-faint);
    margin-top: 3px;
    text-align: center;
  }

  /* Locked-objective confirmation popup */
  .lock-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: lockFade 0.15s ease;
  }
  .lock-modal {
    width: 100%;
    max-width: 420px;
    text-align: center;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.6);
    padding: 28px 26px;
    animation: lockPop 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  .lock-icon {
    width: 52px;
    height: 52px;
    margin: 0 auto;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elev-2);
    color: var(--text-faint);
  }
  .lock-title {
    font-size: 19px;
    font-weight: 700;
    margin: 14px 0 8px;
  }
  .lock-text {
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1.55;
    margin: 0 0 22px;
  }
  .lock-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
  @keyframes lockFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes lockPop {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to { opacity: 1; transform: none; }
  }
</style>
