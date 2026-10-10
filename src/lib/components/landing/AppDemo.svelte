<script>
  import { onMount, onDestroy, tick } from "svelte";
  import { renderMd } from "$lib/utils/markdownRenderer";
  import { serializeRange } from "$lib/utils/selectionToLatex.js";
  import { handleLogIn } from "$lib/store/user.svelte";
  import RatingPicker from "$lib/components/ratingPicker/RatingPicker.svelte";
  import GoalCelebration from "$lib/components/celebration/GoalCelebration.svelte";
  import PomoWidget from "$lib/components/pomodoro/PomoWidget.svelte";
  import DemoChat from "./DemoChat.svelte";
  import DemoView from "./DemoView.svelte";
  import DemoExam from "./DemoExam.svelte";
  import { DEMO_TASKS } from "./demoData";

  // The logged-in app as it looks after sign-in, playable on the landing page. It
  // follows the real pages step by step — rate, confirm, toast, next task, the
  // goal celebration, Space for the solution, "Pitaj AI" on highlighted text —
  // using the real components where they don't talk to the backend. Nothing is
  // sent anywhere.

  const GOAL = 10;
  const START_SOLVED = GOAL - DEMO_TASKS.length;
  const LEVELS = [
    { id: "A", label: "Matematika A razina", badge: "MA", color: "239" },
    { id: "B", label: "Matematika B razina", badge: "MB", color: "215" },
  ];

  let view = $state("tasks");
  let panel = $state(null); // null | "ai" | "formule"
  let level = $state(LEVELS[0]);
  let switcherOpen = $state(false);
  let collapsed = $state(false);
  let light = $state(false);
  let sideOpen = $state(false); // phones: the sidebar as a slide-over
  let pomo = $state(false);

  let taskIdx = $state(0);
  let loading = $state(false);
  let revealed = $state(false);
  let pending = $state(null); // picked rating waiting for "Potvrdi i nastavi"
  let rated = $state(null);
  let ratingKey = $state(0);
  let solved = $state(START_SOLVED);
  let readiness = $state(60);
  let doneForToday = $state(false);

  let toast = $state(false);
  let bump = $state(null);
  let celebrate = $state(false);
  let notice = $state("");

  let quote = $state(null);
  let ask = $state(null); // { x, y, below, quote } — the floating "Pitaj AI" button

  let rootEl = $state();
  let scrollEl = $state();
  let taskEl = $state();
  let hovered = false;
  let timers = [];

  let task = $derived(DEMO_TASKS[taskIdx]);
  let remaining = $derived(Math.max(0, GOAL - solved));
  let toastPct = $derived(Math.min((solved / GOAL) * 100, 100));

  const TITLES = { tasks: "Zadaci", progress: "Napredak", goals: "Ciljevi", exams: "Probna matura" };

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function scrollTop() {
    scrollEl?.scrollTo({ top: 0 });
  }

  // ── Task flow, as on /tasks ──
  async function reveal(on = true) {
    revealed = on;
    if (!on) return;
    await tick();
    const sol = taskEl?.querySelector(".solution");
    if (sol && scrollEl) {
      const top = sol.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop - 24;
      scrollEl.scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
    }
  }

  function confirmRating() {
    const r = pending;
    pending = null;
    rated = r;
    const before = solved;
    solved += 1;
    if (r.k >= 3) {
      bump = { from: readiness, to: readiness + 1, key: Date.now() };
      readiness += 1;
      later(() => (bump = null), 2000);
    }
    if (before < GOAL && solved >= GOAL) {
      later(() => (celebrate = true), 400);
    } else {
      toast = true;
      later(() => (toast = false), 2200);
    }
    later(nextTask, 1500);
  }

  function nextTask() {
    if (taskIdx === DEMO_TASKS.length - 1) {
      doneForToday = true;
      scrollTop();
      return;
    }
    loading = true;
    later(() => {
      loading = false;
      taskIdx += 1;
      revealed = false;
      rated = null;
      quote = null;
      scrollTop();
    }, 450);
  }

  function restart() {
    taskIdx = 0;
    solved = START_SOLVED;
    readiness = 60;
    revealed = false;
    rated = null;
    doneForToday = false;
    quote = null;
    scrollTop();
  }

  // Space opens and closes the solution, like on /tasks — but only while the
  // visitor is in the preview, so it never steals the page's own scrolling.
  function onKey(e) {
    if (e.code !== "Space" || view !== "tasks" || loading || rated || doneForToday) return;
    if (!hovered && !rootEl?.contains(document.activeElement)) return;
    const tag = e.target.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "BUTTON") return;
    e.preventDefault();
    reveal(!revealed);
  }

  // ── "Pitaj AI" on highlighted task or solution text, like AskAiSelection ──
  let selTimer;
  function onSelectionChange() {
    clearTimeout(selTimer);
    selTimer = setTimeout(readSelection, 120);
  }
  function readSelection() {
    const sel = document.getSelection();
    const range = sel && !sel.isCollapsed && sel.rangeCount ? sel.getRangeAt(0) : null;
    const node = range?.commonAncestorContainer;
    const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (!range || !taskEl || !el || !taskEl.contains(el)) {
      ask = null;
      return;
    }
    const text = serializeRange(range).trim();
    if (!text) {
      ask = null;
      return;
    }
    const r = range.getBoundingClientRect();
    const box = rootEl.getBoundingClientRect();
    const below = r.top - box.top < 56;
    const stepEl = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest("[data-step]");
    ask = {
      x: Math.min(Math.max(r.left + r.width / 2 - box.left, 70), box.width - 70),
      y: below ? r.bottom - box.top + 10 : r.top - box.top - 10,
      below,
      quote: {
        text,
        source: el.closest(".solution") ? "solution" : "task",
        step: stepEl ? Number(stepEl.dataset.step) : null,
      },
    };
  }
  function askAi() {
    if (!ask) return;
    quote = ask.quote;
    ask = null;
    panel = "ai";
    document.getSelection()?.removeAllRanges();
  }

  // ── Shell ──
  function go(v) {
    view = v;
    sideOpen = false;
    scrollTop();
  }
  function togglePanel(p) {
    panel = panel === p ? null : p;
    sideOpen = false;
  }
  function openPomo() {
    pomo = true;
    go("tasks");
  }
  function showNotice(text) {
    notice = text;
    later(() => (notice = ""), 2400);
  }
  // The dropdown needs the full width, so from the rail it expands the sidebar first.
  function onSwitcher() {
    if (collapsed) {
      collapsed = false;
      switcherOpen = true;
    } else {
      switcherOpen = !switcherOpen;
    }
  }
  function pickLevel(l) {
    level = l;
    switcherOpen = false;
  }

  // Wide enough for the split view: start with the assistant open next to the
  // task, the way the app looks mid-session. Narrower, it would cover the task.
  onMount(() => {
    if (window.matchMedia("(min-width: 1081px)").matches) panel = "ai";
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  });

  onDestroy(() => {
    timers.forEach(clearTimeout);
    clearTimeout(selTimer);
  });

  const NAV = [
    { id: "tasks", label: "Zadaci", icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
    { id: "progress", label: "Napredak", icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
    { id: "goals", label: "Ciljevi", icon: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  ];
  const ICON_MAP = '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>';
  const ICON_EXAM = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>';
  const ICON_BOOK = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>';
  const ICON_AI = '<path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M20 19.5v-.5a7 7 0 0 0-14 0v.5"/>';
  const ICON_POMO = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/><path d="M12 3v1M12 20v1M3 12H2M22 12h-1M5.6 5.6l-.7-.7M19.1 19.1l-.7-.7M5.6 18.4l-.7.7M19.1 4.9l-.7.7"/>';
  const ICON_RAIL = '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>';
  const ICON_SUN = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
</script>

<svelte:window onkeydown={onKey} />

{#snippet ico(paths)}
  <svg class="ad-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html paths}</svg>
{/snippet}

<div
  class="ad"
  class:with-panel={panel}
  class:collapsed
  class:light
  bind:this={rootEl}
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
  role="region"
  aria-label="Probna verzija aplikacije MatMat"
>
  <button class="ad-backdrop" class:open={sideOpen} onclick={() => (sideOpen = false)} tabindex="-1" aria-label="Zatvori navigaciju"></button>

  <aside class="ad-side" class:open={sideOpen} aria-label="Navigacija aplikacije">
    <div class="ad-brand">
      <div class="brand-mark">M</div>
      <span class="ad-label">MatMat</span>
      <button class="ad-rail-btn" onclick={() => (collapsed = !collapsed)} aria-label={collapsed ? "Proširi navigaciju" : "Sklopi navigaciju"} title={collapsed ? "Proširi navigaciju" : "Sklopi navigaciju"}>
        {@render ico(ICON_RAIL)}
      </button>
    </div>

    <div class="ad-prog-wrap">
      <button class="ad-prog" onclick={onSwitcher} aria-expanded={switcherOpen} title={level.label}>
        <span class="badge-sq ad-badge" style="background: hsl({level.color} 75% 55%)">{level.badge}</span>
        <span class="ad-prog-meta ad-label">
          <span class="ad-prog-name">{level.label}</span>
          <span class="ad-prog-sub">Državna matura</span>
        </span>
        <svg class="ad-chev ad-label" class:open={switcherOpen} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {#if switcherOpen}
        <div class="ad-drop">
          {#each LEVELS as l (l.id)}
            <button class="ad-drop-opt" class:active={l.id === level.id} onclick={() => pickLevel(l)}>
              <span class="badge-sq ad-badge-sm" style="background: hsl({l.color} 75% 55%)">{l.badge}</span>
              {l.label}
              {#if l.id === level.id}<span class="ad-check" aria-hidden="true">✓</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="ad-group"><span class="ad-label">Učenje</span></div>
    <button class="ad-item" onclick={() => showNotice("Mapa gradiva otvara se nakon prijave.")} title="Mapa">{@render ico(ICON_MAP)} <span class="ad-label">Mapa</span></button>
    {#each NAV as n (n.id)}
      <button class="ad-item" class:active={view === n.id} aria-current={view === n.id ? "page" : undefined} onclick={() => go(n.id)} title={n.label}>
        {@render ico(n.icon)} <span class="ad-label">{n.label}</span>
      </button>
    {/each}
    <button class="ad-item ad-item-featured" class:active={view === "exams"} aria-current={view === "exams" ? "page" : undefined} onclick={() => go("exams")} title="Probna matura">
      {@render ico(ICON_EXAM)} <span class="ad-label">Probna matura</span> <span class="nav-novo ad-label">novo</span>
    </button>

    <div class="ad-group"><span class="ad-label">Alati</span></div>
    <button class="ad-item" class:active={panel === "formule"} onclick={() => togglePanel("formule")} title="Formule">{@render ico(ICON_BOOK)} <span class="ad-label">Formule</span></button>
    <button class="ad-item" class:active={panel === "ai"} onclick={() => togglePanel("ai")} title="AI asistent">{@render ico(ICON_AI)} <span class="ad-label">AI asistent</span></button>
    <button class="ad-item" class:active={pomo} onclick={openPomo} title="Pomodoro">{@render ico(ICON_POMO)} <span class="ad-label">Pomodoro</span></button>

    <div class="ad-foot">
      <div class="avatar">L</div>
      <div class="ad-label">
        <div>Lana</div>
        <div class="ad-foot-sub">4. razred</div>
      </div>
    </div>
  </aside>

  <div class="ad-main">
    <div class="ad-top">
      <div class="ad-crumb">
        <button class="btn btn-quiet ad-burger" onclick={() => (sideOpen = true)} aria-label="Otvori navigaciju">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
        </button>
        <span class="ad-crumb-course">Matematika</span><span class="ad-sep">/</span><b>{TITLES[view]}</b>
      </div>
      <div class="ad-top-actions">
        <button class="btn btn-quiet" onclick={() => (light = !light)} title="Promijeni temu" aria-label="Promijeni temu">{@render ico(ICON_SUN)}</button>
        <button class="btn btn-ghost" class:ad-top-on={panel === "ai"} onclick={() => togglePanel("ai")}>
          {@render ico(ICON_AI)} <span class="ad-ai-label">AI asistent</span>
        </button>
      </div>
    </div>

    <div class="ad-scroll" bind:this={scrollEl}>
      <div class="ad-page">
        {#if view === "tasks"}
          <div class="zadaci-head">
            <div>
              <h1>Zadaci za danas</h1>
              <div class="sub">
                Matematika · {GOAL} zadataka planirano · {solved} riješeno ·
                <span class="mono">{remaining}</span> preostalo ·
                <span class="mono" style="color:var(--success)">{readiness}% spreman</span>
              </div>
            </div>
          </div>

          {#if pomo}
            <PomoWidget onClose={() => (pomo = false)} />
          {/if}

          {#if doneForToday}
            <div class="card card-pad ad-done">
              <div class="ad-done-emoji">🎉</div>
              <h2>Nema više zadataka za danas!</h2>
              <p>Algoritam je planirao sve zadatke. Sutra te čekaju novi, složeni prema tome kako si ih danas ocijenio.</p>
              <div class="ad-done-btns">
                <button class="btn btn-primary btn-lg" onclick={handleLogIn}>Prijavi se i nastavi sutra</button>
                <button class="btn btn-ghost btn-lg" onclick={restart}>Kreni ispočetka</button>
              </div>
            </div>
          {:else if loading}
            <div class="card card-pad ad-loading">
              <div class="ad-spinner"></div>
              Učitavanje zadatka…
            </div>
          {:else}
            {#key taskIdx}
              <article class="card task-card ad-task" bind:this={taskEl}>
                <div class="task-meta">
                  <span class="badge mono">#{task.id}</span>
                  <span class="badge">{level.id} razina</span>
                  <span class="badge badge-dim">Matematika</span>
                </div>

                <div class="task-text ad-math">{@html renderMd(task.text)}</div>

                {#if !revealed}
                  <div class="ad-reveal">
                    <button class="btn btn-primary btn-lg" onclick={() => reveal()}>Pokaži rješenje</button>
                    <span>Pokušaj sam · <span class="kbd-chip">Space</span> za rješenje</span>
                  </div>
                {:else}
                  <div class="solution">
                    <div class="solution-header">
                      <h3>Rješenje</h3>
                      {#if !rated}
                        <button class="btn btn-ghost ad-hide" onclick={() => reveal(false)} title="Sakrij rješenje">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          Sakrij
                        </button>
                      {/if}
                    </div>
                    <ol class="ad-steps ad-math">
                      {#each task.steps as s, i (i)}
                        <li data-step={i}>{@html renderMd(s)}</li>
                      {/each}
                    </ol>

                    {#if !rated}
                      <div class="rating-row">
                        <div class="rating-label">Kako ti je išlo?</div>
                        {#if pending}
                          <div class="ad-confirm">
                            <span class="ad-confirm-chosen" style="color:{pending.color}">{pending.k} — {pending.t}</span>
                            <span class="ad-confirm-when">Vraća se {pending.sub}</span>
                            <div class="ad-confirm-btns">
                              <button class="btn btn-primary" onclick={confirmRating}>Potvrdi i nastavi</button>
                              <button class="btn btn-ghost" onclick={() => { pending = null; ratingKey++; }}>Promijeni</button>
                            </div>
                          </div>
                        {:else}
                          {#key ratingKey}
                            <RatingPicker onSelect={(r) => (pending = r)} />
                          {/key}
                        {/if}
                      </div>
                    {:else}
                      <div class="ad-rated">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                        Zabilježeno. <span>{task.objective} se vraća {rated.sub}.</span>
                      </div>
                    {/if}
                  </div>
                {/if}
              </article>
            {/key}

            <div class="task-bottom">
              {#if rated}
                <span>Ishod: {task.objective}</span>
              {:else}
                <span>Kategorija je skrivena dok ne procijeniš zadatak. Označi dio zadatka da pitaš AI baš za njega.</span>
              {/if}
            </div>
          {/if}
        {:else if view === "exams"}
          <DemoExam level={level.id} onScrollTop={scrollTop} />
        {:else}
          <DemoView part={view} {readiness} solvedToday={solved} goal={GOAL} withHead />
        {/if}
      </div>
    </div>
  </div>

  {#if panel}
    <div class="ad-panel">
      {#if panel === "ai"}
        {#key task.id}
          <DemoChat {task} {quote} onClearQuote={() => (quote = null)} onClose={() => (panel = null)} />
        {/key}
      {:else}
        <div class="ad-pdf-head">
          <div>
            <div class="ad-pdf-title">Maturalne tablice i formule</div>
            <div class="ad-pdf-meta">Matematika</div>
          </div>
          <button class="ad-pdf-close" onclick={() => (panel = null)} aria-label="Zatvori formule">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <iframe src="/pdfs/MAT-FORMULE.pdf" title="Maturalne tablice i formule"></iframe>
      {/if}
    </div>
  {/if}

  {#if ask}
    <button
      class="ad-ask"
      class:below={ask.below}
      style="left:{ask.x}px; top:{ask.y}px"
      onmousedown={(e) => e.preventDefault()}
      onclick={askAi}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICON_AI}</svg>
      Pitaj AI
    </button>
  {/if}

  <!-- The real page's feedback, held inside the preview window (.ad contains
       position: fixed, see the style). -->
  {#if bump}
    {#key bump.key}
      <div class="ad-bump" aria-hidden="true">
        <div class="ad-bump-val">+{bump.to - bump.from}%</div>
        <div class="ad-bump-sub">{bump.from}% → {bump.to}% spreman</div>
      </div>
    {/key}
  {/if}

  {#if toast}
    <div class="task-toast" role="status">
      <div class="ad-toast-top">
        <span style="font-size:13px; font-weight:600;">{solved} / {GOAL} zadataka danas</span>
        <span style="font-size:12px; color:var(--text-faint)">{remaining > 0 ? `još ${remaining}` : "cilj ispunjen!"}</span>
      </div>
      <div class="ad-toast-bar"><div style="width:{toastPct}%; background:{solved >= GOAL ? 'var(--success)' : 'var(--primary)'}"></div></div>
    </div>
  {/if}

  {#if notice}
    <div class="task-toast ad-notice" role="status">{notice}</div>
  {/if}

  {#if celebrate}
    <GoalCelebration onDone={() => (celebrate = false)} tasksCompleted={solved} streak={1} readinessPct={readiness} />
  {/if}
</div>

<style>
  .ad {
    position: relative;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    height: 640px;
    background: var(--bg);
    color: var(--text);
    font-size: 15px;
    line-height: 1.55;
    text-align: left;
    overflow: hidden;
    /* Makes this box the containing block for position: fixed, so the real
       toast and the goal celebration stay inside the window. */
    contain: layout paint;
    transition: grid-template-columns 0.2s ease;
  }
  .ad.with-panel { grid-template-columns: 240px minmax(0, 1fr) 360px; }
  .ad.collapsed { grid-template-columns: 64px minmax(0, 1fr); }
  .ad.collapsed.with-panel { grid-template-columns: 64px minmax(0, 1fr) 360px; }

  /* Light theme tokens from app.css, scoped to the preview. */
  .ad.light {
    --bg: #fafafa;
    --bg-elev: #ffffff;
    --bg-elev-2: #f4f4f5;
    --bg-hover: #f0f0f2;
    --border: #e5e5ea;
    --border-strong: #d4d4d9;
    --text: #18181b;
    --text-dim: #52525b;
    --text-faint: #a1a1a8;
    --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04);
    --success: #059669;
    --warn: #d97706;
    --danger: #dc2626;
  }

  /* Sidebar — mirrors Sidebar.svelte, not reusing .sidebar: on phones that class
     turns into a page-wide slide-over. */
  .ad-side {
    border-right: 1px solid var(--border);
    background: var(--bg);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }
  .ad-brand { display: flex; align-items: center; gap: 10px; padding: 6px 4px 14px 8px; font-weight: 600; font-size: 15px; }
  .ad-rail-btn {
    margin-left: auto;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: var(--r-md);
    color: var(--text-faint);
  }
  .ad-rail-btn:hover { background: var(--bg-hover); color: var(--text); }

  .ad-prog-wrap { position: relative; margin-bottom: 6px; }
  .ad-prog {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    text-align: left;
  }
  .ad-prog:hover { border-color: var(--border-strong); }
  .ad-badge { width: 28px; height: 28px; }
  .ad-badge-sm { width: 22px; height: 22px; }
  .ad-prog-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
  .ad-prog-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ad-prog-sub { font-size: 11px; color: var(--text-faint); }
  .ad-chev { color: var(--text-faint); transition: transform 0.15s; flex-shrink: 0; }
  .ad-chev.open { transform: rotate(180deg); }
  .ad-drop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 5;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    animation: ad-fade 0.12s ease-out;
  }
  .ad-drop-opt {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border-radius: var(--r-sm);
    font-size: 13px;
    color: var(--text-dim);
    text-align: left;
  }
  .ad-drop-opt:hover { background: var(--bg-hover); color: var(--text); }
  .ad-drop-opt.active { color: var(--text); }
  .ad-check { margin-left: auto; color: var(--primary); }

  .ad-group {
    padding: 14px 10px 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-faint);
    font-weight: 500;
    white-space: nowrap;
  }
  .ad-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 10px;
    border-radius: var(--r-md);
    color: var(--text-dim);
    font-size: 14px;
    text-align: left;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s;
  }
  .ad-item:hover { background: var(--bg-hover); color: var(--text); }
  .ad-item.active { background: var(--bg-elev); color: var(--text); box-shadow: 0 0 0 1px var(--border) inset; }
  .ad-item-featured { color: var(--text); background: color-mix(in oklab, hsl(38 90% 55%) 8%, transparent); }
  .ad-item-featured:hover { background: color-mix(in oklab, hsl(38 90% 55%) 14%, transparent); }
  .ad-item-featured .ad-ico { color: hsl(38 90% 60%); }
  .ad-item .nav-novo { margin-left: auto; }
  .ad-ico { width: 16px; height: 16px; flex: 0 0 16px; }
  .ad-foot {
    margin-top: auto;
    border-top: 1px solid var(--border);
    padding-top: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    line-height: 1.2;
    white-space: nowrap;
  }
  .ad-foot-sub { font-size: 11px; color: var(--text-faint); }

  /* Collapsed icon rail, as html[data-sidebar="collapsed"] in app.css. */
  .collapsed .ad-side { padding-inline: 10px; }
  .collapsed .ad-label { display: none; }
  .collapsed .ad-brand { flex-direction: column; gap: 8px; padding: 6px 0 12px; }
  .collapsed .ad-rail-btn { margin-left: 0; }
  .collapsed .ad-prog { justify-content: center; padding: 6px 0; border-color: transparent; background: none; }
  .collapsed .ad-group { height: 1px; margin: 10px 6px; padding: 0; background: var(--border); }
  .collapsed .ad-item { justify-content: center; padding: 9px 0; }
  .collapsed .ad-foot { justify-content: center; }

  .ad-main { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .ad-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 20px 11px 24px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .ad-crumb { display: flex; align-items: center; min-width: 0; font-size: 14px; color: var(--text-faint); white-space: nowrap; }
  .ad-crumb b { color: var(--text); font-weight: 500; }
  .ad-sep { margin: 0 6px; }
  .ad-burger { display: none; padding: 6px 8px; margin-right: 6px; }
  .ad-top-actions { display: flex; gap: 6px; align-items: center; }
  .ad-top-actions .btn { padding: 7px 10px; }
  .ad-top-on { color: var(--text); border-color: var(--primary-border); }
  .ad-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .ad-page { max-width: 760px; margin: 0 auto; padding: 26px 28px 40px; }

  .ad-task { padding: 32px; animation: ad-fade 0.25s ease-out; }
  .ad-math :global(p) { margin: 0; }
  .ad-math :global(.katex) { font-size: 1.08em; }
  .ad-reveal { margin-top: 24px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .ad-reveal > span { color: var(--text-faint); font-size: 12px; }
  .solution-header { justify-content: space-between; }
  .ad-hide { padding: 6px 10px; font-size: 12px; }
  .ad-steps {
    margin: 0;
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 15px;
    color: var(--text);
  }
  .ad-steps li::marker { color: var(--text-faint); font-family: var(--font-mono); font-size: 12px; }
  .ad-confirm { display: flex; align-items: center; gap: 8px 14px; flex-wrap: wrap; }
  .ad-confirm-chosen { font-size: 15px; font-weight: 600; }
  .ad-confirm-when { font-size: 12px; color: var(--text-faint); font-family: var(--font-mono); }
  .ad-confirm-btns { display: flex; gap: 8px; margin-left: auto; }
  .ad-rated {
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--success);
    font-size: 14px;
  }
  .ad-rated span { color: var(--text-dim); }

  .ad-loading { display: flex; align-items: center; gap: 12px; color: var(--text-faint); }
  .ad-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: ad-spin 0.8s linear infinite;
  }
  @keyframes ad-spin { to { transform: rotate(360deg); } }
  .ad-done { text-align: center; padding: 40px 28px; }
  .ad-done-emoji { font-size: 44px; margin-bottom: 10px; }
  .ad-done h2 { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
  .ad-done p { margin: 0 auto; max-width: 30em; color: var(--text-dim); font-size: 14px; }
  .ad-done-btns { margin-top: 22px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .ad-ask {
    position: absolute;
    z-index: 6;
    transform: translate(-50%, -100%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border-strong);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    animation: ad-fade 0.12s ease-out;
  }
  .ad-ask.below { transform: translate(-50%, 0); }
  .ad-ask:hover { background: var(--primary); color: var(--on-primary); border-color: transparent; }

  /* The real page's progress bump and toast, scaled to the window. */
  .ad-bump {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 7;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .ad-bump-val {
    font-size: 44px;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--success);
    font-family: var(--font-mono);
    text-shadow: 0 0 40px oklch(0.65 0.2 160 / 0.6);
    animation: ad-bump-float 2s ease forwards;
  }
  .ad-bump-sub { font-size: 13px; color: var(--text-dim); animation: ad-bump-float 2s ease forwards; }
  @keyframes ad-bump-float {
    0% { opacity: 0; transform: translateY(10px) scale(0.8); }
    15% { opacity: 1; transform: translateY(0) scale(1.05); }
    60% { opacity: 1; transform: translateY(-8px) scale(1); }
    100% { opacity: 0; transform: translateY(-32px) scale(0.9); }
  }
  .ad .task-toast { bottom: 24px; }
  .ad-toast-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .ad-toast-bar { height: 6px; border-radius: 99px; background: var(--border); overflow: hidden; }
  .ad-toast-bar > div { height: 100%; border-radius: 99px; transition: width 0.4s cubic-bezier(0.34, 1.2, 0.64, 1); }
  .ad .ad-notice { min-width: 0; font-size: 13px; color: var(--text-dim); white-space: nowrap; }

  .ad-panel {
    border-left: 1px solid var(--border);
    background: var(--bg-elev);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    animation: ad-panel-in 0.18s ease-out;
  }
  @keyframes ad-panel-in { from { opacity: 0; transform: translateX(16px); } }
  @keyframes ad-fade { from { opacity: 0; } }
  .ad-pdf-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 12px 11px 16px;
    border-bottom: 1px solid var(--border);
  }
  .ad-pdf-title { font-size: 14px; font-weight: 500; }
  .ad-pdf-meta { font-size: 12px; color: var(--text-faint); }
  .ad-pdf-close { width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-md); color: var(--text-dim); }
  .ad-pdf-close:hover { background: var(--bg-hover); color: var(--text); }
  .ad-panel iframe { flex: 1; width: 100%; border: 0; background: #fff; }

  .ad-backdrop { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .ad, .ad-panel, .ad-task, .ad-drop, .ad-ask { animation: none; transition: none; }
  }

  /* Narrower than the desktop split view: the panel covers the page like it does in the app. */
  @media (max-width: 1080px) {
    .ad.with-panel { grid-template-columns: 240px minmax(0, 1fr); }
    .ad.collapsed.with-panel { grid-template-columns: 64px minmax(0, 1fr); }
    .ad-panel { position: absolute; inset: 0 0 0 auto; width: min(360px, 100%); z-index: 8; box-shadow: -20px 0 40px rgba(0, 0, 0, 0.4); }
  }
  /* Phones get the app's mobile layout: the sidebar becomes a slide-over behind
     the hamburger. */
  @media (max-width: 760px) {
    .ad, .ad.with-panel, .ad.collapsed, .ad.collapsed.with-panel { grid-template-columns: minmax(0, 1fr); height: 600px; }
    .ad-side {
      position: absolute;
      inset: 0 auto 0 0;
      width: min(260px, 82%);
      z-index: 9;
      transform: translateX(-100%);
      transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .ad-side.open { transform: none; box-shadow: 16px 0 48px rgba(0, 0, 0, 0.35); }
    .ad-backdrop {
      display: block;
      position: absolute;
      inset: 0;
      z-index: 9;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .ad-backdrop.open { opacity: 1; pointer-events: auto; }
    .ad-rail-btn { display: none; }
    .collapsed .ad-label { display: revert; }
    .ad-burger { display: inline-flex; }
    .ad-crumb-course, .ad-crumb .ad-sep, .ad-ai-label { display: none; }
    .ad-top { padding: 8px 12px; }
    .ad-page { padding: 18px 14px 32px; }
    .ad-task { padding: 18px; }
    .ad-panel { width: 100%; }
    .ad-confirm-btns { margin-left: 0; }
  }
</style>
