<script>
  import Sketch from "$lib/sketch/Sketch.svelte";
  import { tick, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { userData, verifyIsAdmin } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import { renderTaskHtml } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { mathjaxTypeset } from "$lib/utils/mathjax";

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
  const DRAWER_KEY = "mm-admin-drawer-w";
  let drawerWidth = $state(savedDrawerWidth());
  let drawerResizing = $state(false);

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

  // ── Vlastiti predmeti i kreatori ──────────────────────────────────────────
  const OWN_STATUS = { nov: "Novi", izrada: "Izrada", nacrt: "Plan čeka pregled", potvrden: "Izrada zadataka", spreman: "Spreman", prevelik: "Preopsežan" };
  let ownList = $state(null);
  let creators = $state([]);
  let ownError = $state("");
  let events = $state([]);
  let eventsLoading = $state(false);
  let newCreator = $state({ email: "", quota: "10" });
  const usd = (v) => `${Number(v ?? 0).toFixed(2)} $`;
  const when = (t) => (t ? new Date(t).toLocaleString("hr-HR", { dateStyle: "short", timeStyle: "medium" }) : "—");

  $effect(() => {
    if (userData.isAdmin && ownList === null) loadOwn();
  });

  async function loadOwn() {
    ownList = [];
    try {
      const [a, b] = await Promise.all([
        apiClient("/admin/own-courses", { method: "GET" }),
        apiClient("/admin/creators", { method: "GET" }),
      ]);
      if (a.ok) ownList = await a.json();
      if (b.ok) creators = await b.json();
      if (!a.ok || !b.ok) ownError = `${a.status}/${b.status}`;
    } catch (err) {
      ownError = err.message;
    }
  }

  async function updateCreator(email, changes) {
    ownError = "";
    const res = await apiClient("/admin/creators", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...changes }),
    });
    if (!res.ok) {
      try { ownError = (await res.json()).message || `${res.status}`; } catch { ownError = `${res.status}`; }
      return false;
    }
    await loadOwn();
    return true;
  }

  async function addCreator() {
    if (await updateCreator(newCreator.email, { isCreator: true, monthlyQuotaUsd: Number(newCreator.quota) })) {
      newCreator = { email: "", quota: "10" };
    }
  }

  async function openOwnCourse(c) {
    events = [];
    eventsLoading = true;
    openCourse({ courseId: c.courseId, courseName: `${c.courseName} · ${c.email}`, own: true });
    try {
      const res = await apiClient(`/admin/own-courses/${c.courseId}/events`, { method: "GET" });
      if (res.ok) events = await res.json();
    } catch {}
    eventsLoading = false;
  }

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

  // Datum ispita službenog predmeta: do njega se ponavljanje sažima (najkasnije dan prije ispita).
  let examSaved = $state(null);
  async function saveExamDate(course, value) {
    const res = await apiClient(`/admin/courses/${course.courseId}/exam-date`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate: value || null }),
    });
    if (res.ok) {
      course.examDate = value || null;
      examSaved = course.courseId;
      setTimeout(() => examSaved === course.courseId && (examSaved = null), 1500);
    } else {
      coursesError = `${res.status}: ${await res.text()}`;
    }
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
    // Comma-separated hsl with an integer hue — Cytoscape's color parser
    // requires this form (the modern space-separated syntax renders no color).
    const colorFor = (fieldId) =>
      `hsl(${Math.round((fieldIds.indexOf(fieldId) * 137.5) % 360)}, 65%, 55%)`;

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

  // Draggable left edge, same as the app's slide-out panels; the width is remembered.
  function savedDrawerWidth() {
    try {
      const saved = Number(localStorage.getItem(DRAWER_KEY));
      if (saved > 0) return saved;
    } catch {
      // no storage (SSR, private mode) — use the default
    }
    return 460;
  }

  function startDrawerResize(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    drawerResizing = true;

    function onMove(ev) {
      drawerWidth = Math.max(360, Math.min(window.innerWidth - ev.clientX, window.innerWidth - 80));
    }
    function onEnd() {
      drawerResizing = false;
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
      try {
        localStorage.setItem(DRAWER_KEY, String(Math.round(drawerWidth)));
      } catch {
        // not remembered — fine
      }
    }
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
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

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="card card-pad nav-card" onclick={() => goto("/ai-settings")}>
        <div class="nav-card-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/>
            <line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/>
            <line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="22"/>
          </svg>
        </div>
        <div>
          <div class="nav-card-title">AI postavke</div>
          <div class="nav-card-sub">Modeli, limiti i razmišljanje za AI chat i ocjenjivanje</div>
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
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <label class="exam-date" onclick={(e) => e.stopPropagation()}>
              <span>Datum ispita</span>
              <input type="date" value={course.examDate ?? ""} onchange={(e) => saveExamDate(course, e.currentTarget.value)} />
              {#if examSaved === course.courseId}<span class="saved">spremljeno</span>{/if}
            </label>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ── Vlastiti predmeti ─────────────────────────────────────── -->
    <h2 class="own-h">Vlastiti predmeti</h2>
    {#if ownError}<p style="color:var(--danger)">Greška: {ownError}</p>{/if}
    {#if ownList === null || (ownList.length === 0 && !ownError)}
      <div class="card card-pad" style="color:var(--text-dim)">Nema vlastitih predmeta.</div>
    {:else}
      <div class="course-grid">
        {#each ownList as c (c.courseId)}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="card card-pad course-card" onclick={() => openOwnCourse(c)}>
            <div class="course-name">{c.courseName}</div>
            <div class="course-desc">{c.name} · {c.email}</div>
            <div class="course-badges">
              <span class="badge">{OWN_STATUS[c.status] ?? c.status}</span>
              <span class="badge badge-dim">{usd(c.costUsd)}</span>
              <span class="badge badge-dim">{c.lessonCount} lekcija · {c.taskCount} zadataka</span>
              {#if c.failedJobs > 0}<span class="badge" style="color:var(--danger);border-color:var(--danger)">{c.failedJobs} neuspjelih</span>{/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ── Kreatori ───────────────────────────────────────────────── -->
    <h2 class="own-h">Kreatori</h2>
    <div class="card card-pad creators">
      <table>
        <thead>
          <tr><th>Račun</th><th>Kreator</th><th>Kvota / mj.</th><th>Ovaj mjesec (kvota)</th><th>Ovaj mjesec (sve)</th><th>Ukupno</th><th>Predmeti</th></tr>
        </thead>
        <tbody>
          {#each creators as k (k.accountId)}
            <tr>
              <td>{k.name}<div class="dim">{k.email}</div></td>
              <td><input type="checkbox" checked={k.isCreator} onchange={(e) => updateCreator(k.email, { isCreator: e.currentTarget.checked })} /></td>
              <td>
                <input class="num" type="number" min="0" step="1" value={k.monthlyQuotaUsd}
                  onchange={(e) => updateCreator(k.email, { monthlyQuotaUsd: Number(e.currentTarget.value) })} /> $
              </td>
              <td>{usd(k.quotaCostMonth)}</td>
              <td>{usd(k.costMonth)}</td>
              <td>{usd(k.costTotal)}</td>
              <td>{k.courseCount}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="add-creator">
        <input placeholder="E-mail računa" bind:value={newCreator.email} />
        <input class="num" type="number" min="0" step="1" bind:value={newCreator.quota} /> $
        <button class="btn btn-primary" disabled={!newCreator.email.trim()} onclick={addCreator}>Dodaj kreatora</button>
      </div>
    </div>

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

    {#if selectedCourse?.own}
      <!-- Zapisnik izrade vlastitog predmeta (samo za čitanje), najnoviji korak prvi -->
      <h2 class="own-h">Zapisnik izrade</h2>
      <div class="card card-pad creators">
        {#if eventsLoading}
          <div style="color:var(--text-faint)">Učitavanje…</div>
        {:else if events.length === 0}
          <div style="color:var(--text-dim)">Nema koraka izrade.</div>
        {:else}
          <table>
            <thead><tr><th>Nastao</th><th>Završen</th><th>Korak</th><th>Status</th><th>Pokušaji</th><th>Trošak</th><th>Greška</th></tr></thead>
            <tbody>
              {#each events as e (e.jobId)}
                <tr class:failed={e.status === "failed"}>
                  <td class="dim">{when(e.createdAt)}</td>
                  <td class="dim">{when(e.finishedAt)}</td>
                  <td>{e.kind}<div class="dim">{e.ref ?? ""}</div></td>
                  <td>{e.status}</td>
                  <td>{e.attempts}</td>
                  <td>{usd(e.costUsd)}{e.countsQuota ? "" : " ·"}</td>
                  <td class="err" title={e.error ?? ""}>{(e.error ?? "").slice(0, 120)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          <div class="dim" style="margin-top:8px">„·“ uz trošak: ne broji se u kvotu (zadaci). Prikazano je najviše 1000 zadnjih koraka.</div>
        {/if}
      </div>
    {/if}
  {/if}

  <!-- ── Objective detail drawer ───────────────────────────────── -->
  {#if selectedObjective}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="drawer-backdrop" onclick={closeDrawer}></div>
    <aside class="detail-drawer" class:resizing={drawerResizing} style:width="min({drawerWidth}px, 92vw)">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="drawer-resize" onpointerdown={startDrawerResize}></div>
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
                <div class="prose prose-sm lg:prose-lg !max-w-none dark:prose-invert" use:fitMath use:mathjaxTypeset={task.id}>
                  {@html renderTaskHtml(task.taskText, task.id)}
                </div>
                {#if task.sketch}
                  <div class="admin-sketch"><Sketch sketch={task.sketch} text={`${task.taskText ?? ""}\n${task.explanation ?? ""}`} /></div>
                {/if}
                {#if task.explanation}
                  <div class="solution">
                    <div class="solution-header"><h3>Rješenje</h3></div>
                    <div class="prose !max-w-none dark:prose-invert" use:fitMath use:mathjaxTypeset={task.id}>
                      {@html renderTaskHtml(task.explanation, task.id)}
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
  .own-h { font-size: 15px; font-weight: 600; margin: 28px 0 10px; }
  .creators { overflow-x: auto; }
  .creators table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .creators th { text-align: left; font-weight: 500; color: var(--text-faint); padding: 6px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .creators td { padding: 7px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .creators tr.failed td { background: color-mix(in srgb, var(--danger) 8%, transparent); }
  .creators .dim { color: var(--text-faint); font-size: 11.5px; }
  .creators .err { color: var(--danger); max-width: 320px; }
  .creators input, .add-creator input { background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); color: var(--text); padding: 4px 8px; font: inherit; }
  .creators input.num { width: 70px; }
  .add-creator { display: flex; gap: 8px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
  .exam-date { display: flex; gap: 8px; align-items: center; margin-top: 10px; font-size: 12px; color: var(--text-dim); }
  .exam-date input { background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); color: var(--text); padding: 4px 8px; font: inherit; }
  .exam-date .saved { color: var(--success); }
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
  .drawer-resize {
    position: absolute;
    left: -3px;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: ew-resize;
    touch-action: none;
    z-index: 2;
    transition: background 0.15s;
  }
  .drawer-resize:hover,
  .detail-drawer.resizing .drawer-resize {
    background: var(--primary);
    opacity: 0.6;
  }
  .detail-drawer.resizing {
    user-select: none;
  }
  @media (max-width: 767px) {
    .drawer-resize { display: none; }
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
  .admin-sketch { max-width: 420px; margin: 12px 0; }
</style>
