<script>
  import { tick, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { userData, verifyIsAdmin } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import { md } from "$lib/utils/markdownRenderer";

  // ── View state ─────────────────────────────────────────────────────────
  let view = $state("dashboard"); // 'dashboard' | 'graph'

  // Courses
  let courses = $state([]);
  let coursesLoading = $state(false);
  let coursesError = $state("");

  // Graph
  let selectedCourse = $state(null);
  let graphData = $state(null);
  let graphLoading = $state(false);
  let graphError = $state("");
  let legend = $state([]);
  let graphEl = $state(null);

  // Objective detail drawer
  let selectedObjective = $state(null);
  let tasks = $state([]);
  let tasksLoading = $state(false);
  let tasksError = $state("");

  // Cytoscape (lazy-loaded, browser-only)
  let cytoscape = null;
  let cy = null;

  // ── Admin gate ──────────────────────────────────────────────────────────
  // Verify admin via backend once auth resolves (also covers page reload).
  $effect(() => {
    if (userData.user && !userData.adminChecked) verifyIsAdmin();
  });

  // Load courses once we know the user is an admin.
  $effect(() => {
    if (userData.isAdmin && courses.length === 0 && !coursesLoading && !coursesError) {
      loadCourses();
    }
  });

  // ── Data loading ──────────────────────────────────────────────────────────
  async function loadCourses() {
    coursesLoading = true;
    coursesError = "";
    try {
      const res = await apiClient("/admin/courses", { method: "GET" });
      if (res.ok) {
        courses = await res.json();
      } else {
        coursesError = `${res.status}: ${await res.text()}`;
      }
    } catch (err) {
      coursesError = err.message;
    }
    coursesLoading = false;
  }

  async function openCourse(course) {
    selectedCourse = course;
    view = "graph";
    graphData = null;
    graphError = "";
    legend = [];
    graphLoading = true;
    await tick(); // ensure the graph view (graphEl) is mounted

    try {
      const res = await apiClient(`/admin/courses/${course.courseId}/graph`, {
        method: "GET",
      });
      if (res.ok) {
        graphData = await res.json();
      } else {
        graphError = `${res.status}: ${await res.text()}`;
      }
    } catch (err) {
      graphError = err.message;
    }
    graphLoading = false;

    if (graphData && graphData.nodes?.length > 0) {
      await tick();
      renderGraph();
    }
  }

  function backToDashboard() {
    if (cy) {
      cy.destroy();
      cy = null;
    }
    selectedObjective = null;
    graphData = null;
    view = "dashboard";
  }

  // ── Graph rendering ───────────────────────────────────────────────────────
  async function ensureCytoscape() {
    if (!cytoscape) {
      const cyMod = await import("cytoscape");
      const dagreMod = await import("cytoscape-dagre");
      cytoscape = cyMod.default;
      cytoscape.use(dagreMod.default);
    }
  }

  async function renderGraph() {
    if (!graphEl || !graphData) return;
    await ensureCytoscape();
    if (cy) {
      cy.destroy();
      cy = null;
    }

    // Assign a distinct hue to each field, using golden-angle rotation.
    const fieldIds = [...new Set(graphData.nodes.map((n) => n.fieldId))];
    const colorFor = (fieldId) =>
      `hsl(${(fieldIds.indexOf(fieldId) * 137.5) % 360} 65% 55%)`;

    // Legend: unique field → color (fieldIds is already de-duplicated).
    legend = fieldIds.map((fieldId) => ({
      fieldId,
      fieldName: graphData.nodes.find((n) => n.fieldId === fieldId).fieldName,
      color: colorFor(fieldId),
    }));

    const nodeIds = new Set(graphData.nodes.map((n) => String(n.objectiveId)));
    const elements = [
      ...graphData.nodes.map((n) => ({
        data: {
          id: String(n.objectiveId),
          label: `${n.objectiveName}\n[${n.taskCount}]`,
          color: colorFor(n.fieldId),
          empty: n.taskCount === 0,
          node: n,
        },
      })),
      ...graphData.edges
        .filter(
          (e) =>
            nodeIds.has(String(e.prerequisiteId)) &&
            nodeIds.has(String(e.objectiveId)),
        )
        .map((e) => ({
          data: {
            id: `${e.prerequisiteId}->${e.objectiveId}`,
            source: String(e.prerequisiteId),
            target: String(e.objectiveId),
          },
        })),
    ];

    cy = cytoscape({
      container: graphEl,
      elements,
      minZoom: 0.2,
      maxZoom: 2.5,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            color: "#fff",
            "text-wrap": "wrap",
            "text-max-width": "130px",
            "font-size": "10px",
            "font-weight": 600,
            "text-valign": "center",
            "text-halign": "center",
            "text-outline-color": "#00000055",
            "text-outline-width": 1,
            shape: "round-rectangle",
            width: "label",
            height: "label",
            padding: "12px",
          },
        },
        {
          selector: "node[?empty]",
          style: {
            "border-width": 2,
            "border-color": "#f87171",
            "border-style": "dashed",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#fff",
            "border-style": "solid",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#8a8a92",
            "target-arrow-color": "#8a8a92",
            "target-arrow-shape": "triangle",
            "arrow-scale": 1,
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "dagre",
        rankDir: "TB",
        nodeSep: 40,
        rankSep: 80,
        padding: 24,
      },
    });

    cy.on("tap", "node", (evt) => openObjective(evt.target.data("node")));
  }

  // ── Objective detail drawer ───────────────────────────────────────────────
  async function openObjective(node) {
    selectedObjective = node;
    await loadTasks(node.objectiveId);
  }

  function closeDrawer() {
    selectedObjective = null;
  }

  function normalizeMath(t) {
    if (!t) return "";
    return t.replace(/\\/g, "\\\\");
  }

  async function loadTasks(objectiveId) {
    tasks = [];
    tasksError = "";
    tasksLoading = true;
    try {
      const res = await apiClient(`/task/get-all-tasks?objectiveId=${objectiveId}`, {
        method: "GET",
      });
      if (res.ok) {
        tasks = await res.json();
      } else {
        tasksError = `${res.status}: ${await res.text()}`;
      }
    } catch (err) {
      tasksError = err.message;
    }
    tasksLoading = false;

    // Re-typeset math for the freshly rendered tasks.
    await tick();
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
  }

  onDestroy(() => {
    if (cy) cy.destroy();
  });
</script>

<div class="page">
  {#if userData.loading || (userData.user && !userData.adminChecked)}
    <div style="padding:80px 20px;text-align:center;color:var(--text-faint)">Učitavanje…</div>
  {:else if !userData.isAdmin}
    <div class="card card-pad" style="text-align:center;padding:60px 24px">
      <div style="font-size:42px;margin-bottom:10px">🔒</div>
      <h2 style="margin:0 0 6px;font-size:18px;font-weight:600">Pristup ograničen</h2>
      <p style="color:var(--text-dim);margin:0">Ova stranica dostupna je samo administratorima.</p>
    </div>

  {:else if view === "dashboard"}
    <!-- ── Dashboard ─────────────────────────────────────────────── -->
    <div class="zadaci-head" style="margin-bottom:18px">
      <div>
        <h1>Admin</h1>
        <div class="sub">Nadzorna ploča · pregled courseva, objectiva i ovisnosti</div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="nav-cards">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="card card-pad nav-card" onclick={() => goto("/create-tasks")}>
        <div class="nav-card-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <div class="nav-card-title">Kreiraj zadatke</div>
          <div class="nav-card-sub">Upload i parsiranje .txt datoteka sa zadacima</div>
        </div>
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="card card-pad nav-card" onclick={() => goto("/all-tasks")}>
        <div class="nav-card-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <div>
          <div class="nav-card-title">Svi zadaci</div>
          <div class="nav-card-sub">Pregled i uređivanje postojećih zadataka</div>
        </div>
      </div>
    </div>

    <!-- Courses -->
    <div class="section-label">Tečajevi</div>

    {#if coursesLoading}
      <div style="padding:60px 20px;text-align:center;color:var(--text-faint)">Učitavanje…</div>
    {:else if coursesError}
      <div class="card card-pad" style="text-align:center">
        <p style="color:var(--danger);margin:0 0 12px">Greška pri učitavanju: {coursesError}</p>
        <button class="btn btn-ghost" onclick={loadCourses}>Pokušaj ponovno</button>
      </div>
    {:else if courses.length === 0}
      <div class="card card-pad" style="text-align:center;color:var(--text-dim)">Nema dostupnih tečajeva.</div>
    {:else}
      <div class="course-grid">
        {#each courses as course (course.courseId)}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="card card-pad course-card" onclick={() => openCourse(course)}>
            <div class="course-name">{course.courseName}</div>
            {#if course.courseDescription}
              <div class="course-desc">{course.courseDescription}</div>
            {/if}
            <div class="course-badges">
              <span class="badge badge-dim">{course.objectiveCount} objectiva</span>
              <span class="badge badge-dim">{course.taskCount} zadataka</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  {:else if view === "graph"}
    <!-- ── Graph ─────────────────────────────────────────────────── -->
    <div class="graph-head">
      <button class="btn btn-ghost" onclick={backToDashboard}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Natrag
      </button>
      <div>
        <h1 style="margin:0;font-size:18px;font-weight:600">{selectedCourse?.courseName}</h1>
        <div class="sub" style="color:var(--text-dim);font-size:12px">Graf ovisnosti · strelica ide od preduvjeta prema objectivu</div>
      </div>
    </div>

    {#if legend.length > 0}
      <div class="legend">
        {#each legend as f (f.fieldId)}
          <span class="legend-item"><span class="legend-dot" style="background:{f.color}"></span>{f.fieldName}</span>
        {/each}
        <span class="legend-item"><span class="legend-dot legend-dot-empty"></span>Bez zadataka</span>
      </div>
    {/if}

    <div class="graph-wrap card">
      <div class="graph-canvas" bind:this={graphEl}></div>

      {#if graphLoading}
        <div class="graph-overlay">Učitavanje grafa…</div>
      {:else if graphError}
        <div class="graph-overlay">
          <p style="color:var(--danger);margin:0 0 12px">Greška: {graphError}</p>
          <button class="btn btn-ghost" onclick={() => openCourse(selectedCourse)}>Pokušaj ponovno</button>
        </div>
      {:else if graphData && graphData.nodes.length === 0}
        <div class="graph-overlay" style="color:var(--text-dim)">Ovaj tečaj nema learning objectiva.</div>
      {/if}
    </div>
  {/if}

  <!-- ── Objective detail drawer ───────────────────────────────── -->
  {#if selectedObjective}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="drawer-backdrop" onclick={closeDrawer}></div>
    <aside class="detail-drawer">
      <div class="drawer-head">
        <div style="min-width:0">
          <div class="drawer-title">{selectedObjective.objectiveName}</div>
          <div class="drawer-meta">{selectedObjective.fieldName} · {selectedObjective.subfieldName}</div>
        </div>
        <button class="icon-btn" onclick={closeDrawer} title="Zatvori">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="drawer-badges">
        <span class="badge badge-dim">{selectedObjective.taskCount} zadataka</span>
        {#if selectedObjective.taskCount === 0}
          <span class="badge" style="color:var(--danger);border-color:var(--danger)">Nedostaje sadržaj</span>
        {/if}
      </div>

      <div class="drawer-body">
        {#if tasksLoading}
          <div style="padding:40px 0;text-align:center;color:var(--text-faint)">Učitavanje zadataka…</div>
        {:else if tasksError}
          <div class="card card-pad" style="text-align:center">
            <p style="color:var(--danger);margin:0 0 12px">Greška: {tasksError}</p>
            <button class="btn btn-ghost" onclick={() => loadTasks(selectedObjective.objectiveId)}>Pokušaj ponovno</button>
          </div>
        {:else if tasks.length === 0}
          <div style="padding:40px 0;text-align:center;color:var(--text-dim)">Ovaj objective nema zadataka.</div>
        {:else}
          <div class="task-stack">
            {#each tasks as task, i (task.id ?? i)}
              <article class="card task-card">
                <div class="task-meta">
                  <span class="badge mono">Zadatak {i + 1}</span>
                </div>
                <div class="prose prose-sm lg:prose-lg !max-w-none dark:prose-invert">
                  {@html task.taskText}
                </div>
                {#if task.explanation}
                  <div class="solution">
                    <div class="solution-header"><h3>Rješenje</h3></div>
                    <div class="prose !max-w-none dark:prose-invert">
                      {@html md.render(normalizeMath(task.explanation))}
                    </div>
                  </div>
                {/if}
              </article>
            {/each}
          </div>
        {/if}
      </div>
    </aside>
  {/if}
</div>

<style>
  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 22px 0 12px;
  }

  /* Navigation cards */
  .nav-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }
  .nav-card {
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    transition: border-color 0.12s, transform 0.12s;
  }
  .nav-card:hover {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }
  .nav-card-ico {
    width: 40px;
    height: 40px;
    border-radius: var(--r-md);
    display: grid;
    place-items: center;
    background: var(--primary-dim);
    color: var(--primary);
    flex-shrink: 0;
  }
  .nav-card-ico svg {
    width: 20px;
    height: 20px;
  }
  .nav-card-title {
    font-size: 14px;
    font-weight: 600;
  }
  .nav-card-sub {
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 2px;
  }

  /* Course grid */
  .course-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }
  .course-card {
    cursor: pointer;
    transition: border-color 0.12s, transform 0.12s;
  }
  .course-card:hover {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }
  .course-name {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .course-desc {
    font-size: 12px;
    color: var(--text-dim);
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .course-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Graph */
  .graph-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 12px;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .legend-dot-empty {
    background: transparent;
    border: 2px dashed #f87171;
  }
  .graph-wrap {
    position: relative;
    overflow: hidden;
    padding: 0;
  }
  .graph-canvas {
    width: 100%;
    height: calc(100vh - 240px);
    min-height: 420px;
  }
  .graph-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--bg-elev);
    color: var(--text-faint);
    padding: 20px;
  }

  /* Detail drawer */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 60;
    animation: fade-in 0.15s ease;
  }
  .detail-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(460px, 92vw);
    background: var(--bg-elev);
    border-left: 1px solid var(--border);
    z-index: 61;
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.25);
    animation: slide-in 0.18s ease;
  }
  .drawer-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 18px 12px;
    border-bottom: 1px solid var(--border);
  }
  .drawer-title {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
  }
  .drawer-meta {
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 3px;
  }
  .drawer-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 18px 0;
  }
  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px 24px;
  }
  .task-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
</style>
