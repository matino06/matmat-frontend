<script>
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";
  import { apiClient } from "$lib/api/apiClient";
  import { userData } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";

  let loading = $state(true);
  let objectives = $state([]);
  let currentCourse = $state(null);
  let searchQuery = $state("");
  let selectedUnit = $state(null);

  const GLYPHS = {
    // Subfield-specific (checked against subfieldName first)
    derivaci: "∂", diferenc: "∂", integral: "∫",
    limes: "→", limit: "→",
    trigon: "∿",
    analitičk: "◎",
    geom: "△", trokut: "△", krug: "△",
    funkcij: "f(x)", niz: "∞",
    potencij: "xⁿ", korijen: "√",
    eksponencij: "eˣ", logaritam: "ln",
    algebr: "Σ", jednadžb: "Σ",
    skup: "∈", relacij: "∈",
    kompleksn: "ℂ",
    matric: "⊞", determinant: "⊞",
    statist: "▥", vjerojat: "▥", podatc: "▥",
    mjerenj: "m²",
    vektor: "⃗v", redov: "∞",
  };

  function getGlyph(fieldName, subfieldName) {
    // Check subfieldName first so field name doesn't override a more specific match
    const sub = subfieldName.toLowerCase();
    for (const [key, glyph] of Object.entries(GLYPHS)) {
      if (sub.includes(key)) return glyph;
    }
    const full = (subfieldName + " " + fieldName).toLowerCase();
    for (const [key, glyph] of Object.entries(GLYPHS)) {
      if (full.includes(key)) return glyph;
    }
    return "◉";
  }

  function getStatus(o) {
    if (!o.unlocked) return "locked";
    if (o.isMastered) return "mastered";
    if (o.isWeak) return "review";
    return "active";
  }

  const STATUS_INFO = {
    mastered: { label: "Savladano",      color: "var(--success)",    bg: "oklch(0.55 0.18 160 / 0.12)", border: "oklch(0.55 0.18 160 / 0.3)",  icon: "✓" },
    review:   { label: "Za ponavljanje", color: "var(--warn)",       bg: "oklch(0.7 0.18 60 / 0.12)",   border: "oklch(0.7 0.18 60 / 0.35)",   icon: "↻" },
    active:   { label: "U tijeku",       color: "var(--primary)",    bg: "oklch(0.55 0.22 270 / 0.12)", border: "oklch(0.55 0.22 270 / 0.35)", icon: "→" },
    locked:   { label: "Zaključano",     color: "var(--text-faint)", bg: "transparent",                 border: "var(--border)",               icon: "🔒" },
  };

  function buildUnits(objs = []) {
    const map = new Map();
    for (const o of objs) {
      const fn = o.fieldName ?? "Ostalo";
      const sn = o.subfieldName ?? "Opće";
      const key = fn + "||" + sn;
      if (!map.has(key)) {
        map.set(key, {
          fieldName: fn,
          subfieldName: sn,
          glyph: getGlyph(fn, sn),
          objectives: [],
        });
      }
      map.get(key).objectives.push(o);
    }
    return Array.from(map.values()).map(u => {
      const total = u.objectives.length;
      const mastered = u.objectives.filter(o => o.isMastered).length;
      const due = u.objectives.filter(o => o.unlocked && !o.isMastered).length;
      const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
      return { ...u, total, mastered, due, pct };
    });
  }

  let units = $state([]);

  async function load() {
    if (!userData.user) return;
    loading = true;
    const [objs, courseRes] = await Promise.all([
      fetchObjectivesWithStatus(),
      apiClient("/account/current-course", { method: "GET" }),
    ]);
    objectives = objs;
    if (courseRes.ok) currentCourse = await courseRes.json();
    units = buildUnits(objs);
    loading = false;
  }

  $effect(() => { if (userData.user) load(); });

  const PROGRAMS = {
    "matura-mat-a": { badge: "MA", color: "239", name: "Matematika A razina", desc: "Državna matura — A razina" },
    "matura-mat-b": { badge: "MB", color: "215", name: "Matematika B razina", desc: "Državna matura — B razina" },
  };

  let activeProg = $derived(
    currentCourse ? (PROGRAMS[currentCourse.courseId] ?? PROGRAMS["matura-mat-a"]) : PROGRAMS["matura-mat-a"]
  );

  let filtered = $derived(
    units.filter(u =>
      u.subfieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  let totalPct = $derived(
    units.length ? Math.round(units.reduce((s, u) => s + u.pct, 0) / units.length) : 0
  );
  let totalIshodi = $derived(units.reduce((s, u) => s + u.total, 0));
  let totalDue = $derived(units.reduce((s, u) => s + u.due, 0));
</script>

<div class="page">

  {#if selectedUnit}
    <!-- ── Lekcije drill-down ── -->
    {@const lessons = selectedUnit.objectives.map((o, i) => ({ ...o, status: getStatus(o), idx: i }))}
    {@const masteredCount = lessons.filter(l => l.status === "mastered").length}
    {@const reviewCount = lessons.filter(l => l.status === "review").length}
    {@const activeCount = lessons.filter(l => l.status === "active").length}
    {@const lockedCount = lessons.filter(l => l.status === "locked").length}
    {@const unitPct = lessons.length ? Math.round(masteredCount / lessons.length * 100) : 0}

    <!-- Back + unit header -->
    <div class="lekcije-head">
      <button class="btn btn-quiet back-btn" onclick={() => selectedUnit = null}>← Nazad</button>
      <div class="lekcije-unit-info">
        <div class="unit-badge" style="background: hsl({activeProg.color} 75% 55%)">{selectedUnit.glyph}</div>
        <div>
          <div class="lekcije-title">{selectedUnit.subfieldName}</div>
          <div class="lekcije-sub">{lessons.length} ishoda · {unitPct}% savladano</div>
        </div>
      </div>
    </div>

    <!-- Progress bar + legend -->
    <div class="lekcije-progress">
      <div class="lekcije-bar">
        <div class="lekcije-bar-fill" style="width:{unitPct}%"></div>
      </div>
      <div class="lekcije-legend">
        {#if masteredCount > 0}
          <div class="legend-item"><div class="legend-dot" style="background:var(--success)"></div><span style="color:var(--success);font-weight:600">{masteredCount}</span> Savladano</div>
        {/if}
        {#if reviewCount > 0}
          <div class="legend-item"><div class="legend-dot" style="background:var(--warn)"></div><span style="color:var(--warn);font-weight:600">{reviewCount}</span> Za ponavljanje</div>
        {/if}
        {#if activeCount > 0}
          <div class="legend-item"><div class="legend-dot" style="background:var(--primary)"></div><span style="color:var(--primary);font-weight:600">{activeCount}</span> U tijeku</div>
        {/if}
        {#if lockedCount > 0}
          <div class="legend-item"><div class="legend-dot" style="background:var(--text-faint)"></div><span style="color:var(--text-faint);font-weight:600">{lockedCount}</span> Zaključano</div>
        {/if}
      </div>
    </div>

    <!-- Lesson rows -->
    <div class="lesson-list">
      {#each lessons as l (l.idx)}
        {@const s = STATUS_INFO[l.status]}
        <div
          class="lesson-row"
          style="border-color:{s.border};background:{s.bg};opacity:{l.status === 'locked' ? 0.45 : 1}"
        >
          <div class="lesson-num">{String(l.idx + 1).padStart(2, '0')}</div>
          <div class="lesson-body">
            <div class="lesson-name" style="color:{l.status === 'locked' ? 'var(--text-faint)' : 'var(--text)'}">{l.objectiveName ?? l.name ?? '—'}</div>
          </div>
          <div class="status-badge" style="color:{s.color}">
            <span>{s.icon}</span>
            {s.label}
          </div>
        </div>
      {/each}
    </div>

    <!-- CTA if there are due objectives -->
    {#if selectedUnit.due > 0}
      <div class="lekcije-cta">
        <button class="btn btn-primary" onclick={() => goto('/tasks')}>
          Vježbaj ovu cjelinu ({selectedUnit.due} ishoda)
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    {/if}

  {:else}
    <!-- ── Units grid ── -->

    <!-- Header -->
    <div class="units-head">
      <div class="units-title">
        <h1>Cjeline</h1>
        <div class="sub">{activeProg.name}</div>
      </div>
    </div>

    {#if loading}
      <div style="display:flex;align-items:center;gap:10px;color:var(--text-faint);padding:24px 0">
        <div class="spinner"></div> Učitavanje cjelina…
      </div>
    {:else}

      <!-- Program overview strip -->
      <div class="prog-overview">
        <div class="badge-sq" style="background: hsl({activeProg.color} 75% 55%)">{activeProg.badge}</div>
        <div class="po-meta">
          <div class="name">{activeProg.name}</div>
          <div class="sub">{activeProg.desc}</div>
        </div>
        <div class="po-stats">
          <div class="s">
            <div class="v">{totalPct}%</div>
            <div class="l">Savladano</div>
          </div>
          <div class="s">
            <div class="v">{totalIshodi}</div>
            <div class="l">Ishoda</div>
          </div>
          <div class="s" style="color: {totalDue > 0 ? 'var(--primary)' : 'var(--text-faint)'}">
            <div class="v">{totalDue}</div>
            <div class="l">Za danas</div>
          </div>
        </div>
      </div>

      <!-- Search + filter row -->
      <div class="units-filter">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>
          </svg>
          <input placeholder="Pretraži cjeline…" bind:value={searchQuery}/>
        </div>
      </div>

      <!-- Units grid -->
      {#if filtered.length > 0}
        <div class="units-grid">
          {#each filtered as u (u.fieldName + u.subfieldName)}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div class="unit-card" onclick={() => selectedUnit = u}>
              <div class="unit-card-top">
                <div style="display:flex;gap:14px;align-items:flex-start">
                  <div class="unit-glyph">{u.glyph}</div>
                  <div>
                    <h3>{u.subfieldName}</h3>
                    <div class="meta">{u.total} ishoda · {u.fieldName}</div>
                  </div>
                </div>
                <div class="due-chip {u.due === 0 ? 'none' : ''}">
                  {u.due > 0 ? `${u.due} danas` : "—"}
                </div>
              </div>
              <div class="unit-bar">
                <div class="fill" style="width:{u.pct}%"></div>
              </div>
              <div class="unit-foot">
                <span class="pct">{u.pct}% savladano</span>
                <span class="cta">
                  Pregled
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div style="text-align:center;padding:80px 20px;color:var(--text-faint)">
          <p>Nema cjelina za "{searchQuery}"</p>
          <button class="btn btn-quiet" onclick={() => searchQuery = ""}>Očisti pretragu</button>
        </div>
      {/if}

    {/if}
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

  /* ── Units grid view ── */

  .units-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .units-title h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.015em; font-weight: 600; }
  .units-title .sub { color: var(--text-faint); font-size: 13px; }

  .prog-overview {
    padding: 20px 24px;
    border-radius: var(--r-xl);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    margin-bottom: 22px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: center;
  }
  .prog-overview .badge-sq {
    width: 44px; height: 44px;
    border-radius: var(--r-lg);
    display: grid; place-items: center;
    color: #fff;
    font-size: 12px; font-weight: 600; font-family: var(--font-mono);
    flex-shrink: 0;
  }
  .prog-overview .po-meta .name { font-size: 16px; font-weight: 500; }
  .prog-overview .po-meta .sub { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
  .prog-overview .po-stats { display: flex; gap: 24px; flex-shrink: 0; }
  .prog-overview .po-stats .s { white-space: nowrap; text-align: right; }
  .prog-overview .po-stats .s .v { font-size: 18px; font-weight: 600; font-family: var(--font-mono); }
  .prog-overview .po-stats .s .l { font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: .06em; }

  .units-filter {
    display: flex; gap: 8px; align-items: center;
    margin-bottom: 16px;
  }
  .search-box {
    flex: 1;
    display: flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    color: var(--text-dim);
    font-size: 13px;
  }
  .search-box input {
    background: none; border: 0; outline: none;
    flex: 1; font-size: 13px; color: var(--text);
  }
  .search-box input::placeholder { color: var(--text-faint); }

  .units-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .unit-card {
    padding: 20px 22px;
    border-radius: var(--r-xl);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    cursor: pointer;
    transition: border-color .12s, background .12s, transform .06s;
    display: flex; flex-direction: column; gap: 14px;
    min-height: 160px;
    text-align: left;
  }
  .unit-card:hover { border-color: var(--border-strong); background: var(--bg-hover); }
  .unit-card:active { transform: translateY(1px); }

  .unit-card-top {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 12px;
  }
  .unit-glyph {
    width: 36px; height: 36px;
    border-radius: var(--r-md);
    background: var(--bg-elev-2);
    color: var(--primary);
    display: grid; place-items: center;
    font-family: var(--font-mono);
    font-size: 15px; font-weight: 500;
    border: 1px solid var(--border);
    flex-shrink: 0;
  }
  .unit-card h3 { margin: 0 0 4px; font-size: 15px; font-weight: 500; letter-spacing: -.01em; line-height: 1.3; }
  .unit-card .meta { font-size: 12px; color: var(--text-faint); }

  .due-chip {
    display: inline-flex; align-items: center;
    padding: 3px 8px;
    border-radius: var(--r-pill);
    background: var(--primary-dim);
    color: var(--primary);
    font-size: 11px; font-weight: 500;
    border: 1px solid var(--primary-border);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .due-chip.none { background: transparent; color: var(--text-faint); border-color: var(--border); }

  .unit-bar {
    height: 5px; border-radius: 999px;
    background: var(--bg-elev-2); overflow: hidden;
    border: 1px solid var(--border);
  }
  .unit-bar .fill {
    height: 100%; background: var(--primary); border-radius: 999px;
    transition: width .6s cubic-bezier(.2,.8,.2,1);
  }

  .unit-foot {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px;
    margin-top: auto;
  }
  .unit-foot .pct { font-family: var(--font-mono); color: var(--text); font-weight: 500; }
  .unit-foot .cta { color: var(--primary); font-weight: 500; display: flex; align-items: center; gap: 4px; }

  /* ── Lekcije drill-down ── */

  .lekcije-head {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
  }
  .back-btn { padding: 6px 12px; font-size: 13px; }

  .lekcije-unit-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .unit-badge {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: grid; place-items: center;
    color: #fff;
    font-weight: 700; font-size: 13px;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }
  .lekcije-title { font-weight: 600; font-size: 16px; }
  .lekcije-sub { font-size: 12px; color: var(--text-faint); margin-top: 1px; }

  .lekcije-progress { margin-bottom: 28px; }
  .lekcije-bar {
    height: 6px; border-radius: 99px;
    background: var(--border); overflow: hidden;
  }
  .lekcije-bar-fill {
    height: 100%; border-radius: 99px;
    background: var(--success);
    transition: width .4s;
  }
  .lekcije-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 12px;
  }
  .legend-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-faint);
  }
  .legend-dot {
    width: 8px; height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .lesson-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .lesson-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 18px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    transition: background .12s, border-color .12s;
  }

  .lesson-num {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: var(--bg-elev-2);
    display: grid; place-items: center;
    font-size: 12px; font-weight: 600;
    color: var(--text-faint);
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  .lesson-body { flex: 1; min-width: 0; }
  .lesson-name { font-size: 14px; font-weight: 500; }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: var(--r-pill);
    background: var(--bg-elev);
    border: 1px solid var(--border);
    font-size: 11px; font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .lekcije-cta {
    margin-top: 28px;
    display: flex;
    justify-content: center;
  }
  .lekcije-cta .btn { display: flex; align-items: center; gap: 8px; }

  @media (max-width: 640px) {
    .units-grid { grid-template-columns: 1fr; }
    .prog-overview { grid-template-columns: auto 1fr; }
    .prog-overview .po-stats { display: none; }
    .lekcije-head { flex-wrap: wrap; }
    .lesson-row { padding: 12px 14px; gap: 12px; }
    .status-badge { display: none; }
  }
</style>
