<script>
  import { userData } from "$lib/store/user.svelte";
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";
  import { calculateExamProgress } from "$lib/utils/progress";
  import { apiClient } from "$lib/api/apiClient";

  let objectives = $state([]);
  let todayTasks = $state([]);
  let upcomingTasks = $state([]);
  let examProgress = $state(0);
  let currentCourse = $state(null);
  let loading = $state(true);
  let activeArea = $state("Sve");

  async function loadAll() {
    if (!userData.user) return;
    loading = true;
    try {
      const [courseRes, objs] = await Promise.all([
        apiClient("/account/current-course", { method: "GET" }),
        fetchObjectivesWithStatus(),
      ]);
      if (courseRes.ok) currentCourse = await courseRes.json();
      objectives = objs;
      if (currentCourse?.courseId) {
        examProgress = calculateExamProgress(objs, currentCourse.courseId);
      }
      const progressRes = await apiClient("/progress", { method: "GET" });
      if (progressRes.ok) {
        const res = await progressRes.json();
        todayTasks = res.todayObjectives ?? [];
        upcomingTasks = res.futureObjectives ?? [];
      }
    } finally {
      loading = false;
    }
  }

  $effect(() => { if (userData.user) loadAll(); });

  // Locked objectives (not yet unlocked) are hidden from the list,
  // since they have no due date / nothing to display per row.
  let visibleObjectives = $derived(objectives.filter(o => o.unlocked));

  let areas = $derived(["Sve", ...new Set(visibleObjectives.map(o => o.fieldName).filter(Boolean))]);

  // Per-field mastery % next to the ring — same mastered/total ratio as the
  // Mapa banners, so the numbers match. Keyed object (not groupByKey) so fields
  // don't have to arrive in consecutive order.
  function fieldStats(objs) {
    const byField = {};
    for (const o of objs) {
      if (!o.fieldName) continue;
      const f = (byField[o.fieldName] ??= { name: o.fieldName, total: 0, mastered: 0 });
      f.total += 1;
      if (o.isMastered) f.mastered += 1;
    }
    return Object.values(byField).map(f => ({ ...f, pct: Math.round((f.mastered / f.total) * 100) }));
  }

  let fieldProgress = $derived(fieldStats(objectives));

  // Build a map objectiveName → dueDate from today/upcoming lists.
  // /progress returns tasks keyed by title (= objectiveName), not by ID.
  let dueDateMap = $derived(
    new Map(
      [...todayTasks, ...upcomingTasks]
        .filter(t => t.dueDate && t.title)
        .map(t => [t.title, t.dueDate])
    )
  );

  // Build a map objectiveName → lastQ (last solved question index, 0-4) from today/upcoming lists.
  let lastQMap = $derived(
    new Map(
      [...todayTasks, ...upcomingTasks]
        .filter(t => t.title)
        .map(t => [t.title, t.lastQ])
    )
  );

  const today = new Date();
  const refDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  function parseDate(s) {
    if (!s) return null;
    // YYYY-MM-DD (API format)
    if (s.includes("-")) {
      const [y, m, d] = s.split("-");
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    // DD.MM.YYYY fallback
    const p = s.split(".");
    return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  }

  function diffLabel(s) {
    const d = parseDate(s);
    if (!d) return "";
    const diff = Math.floor((d - refDate) / 86400000);
    if (diff <= 0) return "danas";
    if (diff === 1) return "sutra";
    if (diff === 2) return "prekosutra";
    return `za ${diff} dana`;
  }

  function getStatus(o) {
    if (o.isMastered) return "mastered";
    if (o.unlocked) return "learning";
    return "new";
  }

  // 5-dot mastery scale
  function getProgress(o) {
    if (o.isMastered) return 5;
    if (o.unlocked && !o.isWeak) return 3;
    if (o.unlocked && o.isWeak) return 1;
    return 0;
  }

  // Ring SVG
  const SIZE = 220;
  const STROKE = 12;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  let ringDash = $derived(CIRC * (examProgress / 100));

  let shownObjectives = $derived(
    activeArea === "Sve"
      ? visibleObjectives
      : visibleObjectives.filter(o => o.fieldName === activeArea)
  );

  let areaCount = $derived((a) =>
    a === "Sve" ? visibleObjectives.length : visibleObjectives.filter(o => o.fieldName === a).length
  );
</script>

<div class="page">
  <div class="zadaci-head" style="margin-bottom: 18px">
    <div>
      <h1>Napredak</h1>
      <div class="sub">Tvoja priprema za maturu · Matematika</div>
    </div>
  </div>

  {#if loading}
    <div style="color:var(--text-faint);display:flex;align-items:center;gap:10px;padding:24px 0">
      <div class="spinner"></div> Učitavanje…
    </div>
  {:else}
    <!-- Ring card -->
    <div class="card ring-card">
      <div class="ring-wrap">
        <svg width={SIZE} height={SIZE} style="transform:rotate(-90deg)">
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="var(--bg-elev-2)" stroke-width={STROKE}/>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
            stroke="var(--primary)" stroke-width={STROKE} stroke-linecap="round"
            stroke-dasharray="{ringDash} {CIRC - ringDash}"
            style="transition: stroke-dasharray 1s ease"/>
        </svg>
        <div class="ring-inner">
          <div>
            <div class="pct">{examProgress}<span class="pct-unit">%</span></div>
            <div class="pct-sub">Spremnost</div>
          </div>
        </div>
      </div>
      <div class="ring-meta">
        <h2>Spremnost za maturu</h2>
        <div class="field-list">
          {#each fieldProgress as f (f.name)}
            <div class="field-row">
              <div class="field-top">
                <span class="field-name">{f.name}</span>
                <span class="field-pct">{f.pct}%</span>
              </div>
              <div class="field-bar"><div class="fill" style="width:{f.pct}%"></div></div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Section header -->
    <div class="section-head">
      <h2>Nastavna područja i ishodi</h2>
      <div class="side">{visibleObjectives.length} ishoda</div>
    </div>

    <!-- Area tabs -->
    <div class="area-tabs">
      {#each areas as a (a)}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="area-tab {activeArea === a ? 'active' : ''}" onclick={() => activeArea = a}>
          {a} <span class="c">{areaCount(a)}</span>
        </div>
      {/each}
    </div>

    <!-- Ishod list -->
    <div class="ishod-list">
      {#each shownObjectives as obj (obj.objectiveId)}
        {@const status = getStatus(obj)}
        {@const prog = lastQMap.has(obj.objectiveName) ? (lastQMap.get(obj.objectiveName) ?? 0) : getProgress(obj)}
        {@const when = dueDateMap.get(obj.objectiveName)}
        <div class="ishod-row">
          <div class="ishod-status {status}"></div>
          <div class="ishod-title">
            {obj.objectiveName}
          </div>
          <div class="ishod-mini">
            {#each [0,1,2,3,4] as j (j)}
              <div class="dot {j < prog ? 'filled' : ''}"></div>
            {/each}
          </div>
          <div class="ishod-when">{diffLabel(when)}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .spinner {
    width: 18px; height: 18px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Ring card */
  .ring-card {
    padding: 32px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 48px;
    align-items: center;
    margin-bottom: 16px;
  }
  .ring-wrap {
    position: relative;
    width: 220px; height: 220px;
    flex-shrink: 0;
  }
  .ring-inner {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
  }
  .pct {
    font-size: 44px; font-weight: 600; letter-spacing: -0.02em;
    font-family: var(--font-mono);
    line-height: 1;
  }
  .pct-unit { font-size: 22px; color: var(--text-faint); margin-left: 2px; }
  .pct-sub {
    font-size: 11px; color: var(--text-faint);
    text-transform: uppercase; letter-spacing: .08em;
    margin-top: 8px;
  }
  .ring-meta { min-width: 0; }
  .ring-meta h2 { margin: 0 0 20px; font-size: 17px; font-weight: 500; }
  .field-list { display: flex; flex-direction: column; gap: 16px; }
  .field-top {
    display: flex; justify-content: space-between; align-items: baseline;
    gap: 12px; font-size: 14px;
  }
  .field-name { color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .field-pct { font-family: var(--font-mono); font-size: 13px; color: var(--text); flex-shrink: 0; }
  .field-bar {
    height: 8px; border-radius: 999px;
    background: var(--bg-elev-2); margin-top: 7px;
    overflow: hidden; border: 1px solid var(--border);
  }
  .field-bar .fill {
    height: 100%; background: var(--primary); border-radius: 999px;
    transition: width .6s cubic-bezier(.2,.8,.2,1);
  }

  /* Section head */
  .section-head {
    display: flex; align-items: baseline; justify-content: space-between;
    margin: 28px 0 12px;
  }
  .section-head h2 { margin: 0; font-size: 15px; font-weight: 500; }
  .section-head .side { font-size: 12px; color: var(--text-faint); }

  /* Area tabs */
  .area-tabs {
    display: flex; gap: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
    overflow-x: auto;
  }
  .area-tab {
    padding: 10px 14px; font-size: 13px;
    color: var(--text-dim); cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    white-space: nowrap; display: flex; gap: 8px; align-items: center;
    transition: color .12s;
  }
  .area-tab:hover { color: var(--text); }
  .area-tab.active { color: var(--text); border-bottom-color: var(--primary); }
  .area-tab .c { color: var(--text-faint); font-family: var(--font-mono); font-size: 11px; }

  /* Ishod list */
  .ishod-list { display: flex; flex-direction: column; }
  .ishod-row {
    display: grid;
    grid-template-columns: 20px 1fr auto auto;
    gap: 14px; align-items: center;
    padding: 14px 20px;
    border: 1px solid var(--border); border-top-width: 0;
    background: var(--bg-elev);
    transition: background .1s;
  }
  .ishod-row:first-child { border-top-width: 1px; border-top-left-radius: var(--r-lg); border-top-right-radius: var(--r-lg); }
  .ishod-row:last-child { border-bottom-left-radius: var(--r-lg); border-bottom-right-radius: var(--r-lg); }
  .ishod-row:hover { background: var(--bg-hover); }

  .ishod-status {
    width: 10px; height: 10px;
    border-radius: 999px;
    background: var(--border-strong);
  }
  .ishod-status.learning { background: var(--warn); }
  .ishod-status.mastered { background: var(--success); }
  .ishod-status.scheduled { background: var(--primary); }

  .ishod-title { font-size: 14px; }
  .ishod-title .code { font-family: var(--font-mono); font-size: 12px; color: var(--text-faint); margin-right: 10px; }

  .ishod-mini { display: flex; gap: 3px; }
  .ishod-mini .dot {
    width: 16px; height: 6px; border-radius: 2px;
    background: var(--bg-elev-2); border: 1px solid var(--border);
  }
  .ishod-mini .dot.filled { background: var(--primary); border-color: transparent; }

  .ishod-when {
    color: var(--text-dim); font-size: 12px;
    font-family: var(--font-mono);
    min-width: 72px; text-align: right;
  }

  @media (max-width: 700px) {
    .ring-card { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 28px; padding: 24px; }
    .ring-meta { width: 100%; }
    .field-list { text-align: left; }
    .ishod-row { grid-template-columns: 20px 1fr auto; }
    .ishod-when { display: none; }
  }
</style>
