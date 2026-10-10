<script>
  import { onMount, onDestroy, tick } from "svelte";
  import { renderTaskHtml } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { mathjaxTypeset } from "$lib/utils/mathjax";
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
  // The explanation's "## N." sections, kept apart so a highlighted passage can be
  // traced back to its step for the AI reply (data-step).
  let sections = $derived(task.explanation.split(/^(?=## \d+\.)/m).filter((p) => p.trim()));
  // Same typography as /tasks; the landing page is dark, so invert unless the
  // preview itself was switched to light.
  let prose = $derived(light ? "prose" : "prose prose-invert");
  let remaining = $derived(Math.max(0, GOAL - solved));
  let toastPct = $derived(Math.min((solved / GOAL) * 100, 100));

  const TITLES = { tasks: "Zadaci", progress: "Napredak", goals: "Ciljevi", exams: "Probna matura" };

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Phones have no inner scroll (the preview grows with its content), so when a
  // new page or task starts above the screen, bring the preview's top back.
  function scrollTop() {
    scrollEl?.scrollTo({ top: 0 });
    if (rootEl && rootEl.getBoundingClientRect().top < 0) {
      rootEl.scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
    }
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
  <svg class="pv-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html paths}</svg>
{/snippet}

<div
  class="pv"
  class:with-panel={panel}
  class:collapsed
  class:light
  bind:this={rootEl}
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
  role="region"
  aria-label="Probna verzija aplikacije MatMat"
>
  <button class="pv-backdrop" class:open={sideOpen} onclick={() => (sideOpen = false)} tabindex="-1" aria-label="Zatvori navigaciju"></button>

  <aside class="pv-side" class:open={sideOpen} aria-label="Navigacija aplikacije">
    <div class="pv-brand">
      <div class="brand-mark">M</div>
      <span class="pv-label">MatMat</span>
      <button class="pv-rail-btn" onclick={() => (collapsed = !collapsed)} aria-label={collapsed ? "Proširi navigaciju" : "Sklopi navigaciju"} title={collapsed ? "Proširi navigaciju" : "Sklopi navigaciju"}>
        {@render ico(ICON_RAIL)}
      </button>
    </div>

    <div class="pv-prog-wrap">
      <button class="pv-prog" onclick={onSwitcher} aria-expanded={switcherOpen} title={level.label}>
        <span class="badge-sq pv-badge" style="background: hsl({level.color} 75% 55%)">{level.badge}</span>
        <span class="pv-prog-meta pv-label">
          <span class="pv-prog-name">{level.label}</span>
          <span class="pv-prog-sub">Državna matura</span>
        </span>
        <svg class="pv-chev pv-label" class:open={switcherOpen} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {#if switcherOpen}
        <div class="pv-drop">
          {#each LEVELS as l (l.id)}
            <button class="pv-drop-opt" class:active={l.id === level.id} onclick={() => pickLevel(l)}>
              <span class="badge-sq pv-badge-sm" style="background: hsl({l.color} 75% 55%)">{l.badge}</span>
              {l.label}
              {#if l.id === level.id}<span class="pv-check" aria-hidden="true">✓</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="pv-group"><span class="pv-label">Učenje</span></div>
    <button class="pv-item" onclick={() => showNotice("Mapa gradiva otvara se nakon prijave.")} title="Mapa">{@render ico(ICON_MAP)} <span class="pv-label">Mapa</span></button>
    {#each NAV as n (n.id)}
      <button class="pv-item" class:active={view === n.id} aria-current={view === n.id ? "page" : undefined} onclick={() => go(n.id)} title={n.label}>
        {@render ico(n.icon)} <span class="pv-label">{n.label}</span>
      </button>
    {/each}
    <button class="pv-item pv-item-featured" class:active={view === "exams"} aria-current={view === "exams" ? "page" : undefined} onclick={() => go("exams")} title="Probna matura">
      {@render ico(ICON_EXAM)} <span class="pv-label">Probna matura</span> <span class="nav-novo pv-label">novo</span>
    </button>

    <div class="pv-group"><span class="pv-label">Alati</span></div>
    <button class="pv-item" class:active={panel === "formule"} onclick={() => togglePanel("formule")} title="Formule">{@render ico(ICON_BOOK)} <span class="pv-label">Formule</span></button>
    <button class="pv-item" class:active={panel === "ai"} onclick={() => togglePanel("ai")} title="AI asistent">{@render ico(ICON_AI)} <span class="pv-label">AI asistent</span></button>
    <button class="pv-item" class:active={pomo} onclick={openPomo} title="Pomodoro">{@render ico(ICON_POMO)} <span class="pv-label">Pomodoro</span></button>

    <div class="pv-foot">
      <div class="avatar">L</div>
      <div class="pv-label">
        <div>Lana</div>
        <div class="pv-foot-sub">4. razred</div>
      </div>
    </div>
  </aside>

  <div class="pv-main">
    <div class="pv-top">
      <div class="pv-crumb">
        <button class="btn btn-quiet pv-burger" onclick={() => (sideOpen = true)} aria-label="Otvori navigaciju">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
        </button>
        <span class="pv-crumb-course">Matematika</span><span class="pv-sep">/</span><b>{TITLES[view]}</b>
      </div>
      <div class="pv-top-actions">
        <button class="btn btn-quiet" onclick={() => (light = !light)} title="Promijeni temu" aria-label="Promijeni temu">{@render ico(ICON_SUN)}</button>
        <button class="btn btn-ghost" class:pv-top-on={panel === "ai"} onclick={() => togglePanel("ai")}>
          {@render ico(ICON_AI)} <span class="pv-ai-label">AI asistent</span>
        </button>
      </div>
    </div>

    <div class="pv-scroll" bind:this={scrollEl}>
      <div class="pv-page">
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
            <div class="card card-pad pv-done">
              <div class="pv-done-emoji">🎉</div>
              <h2>Nema više zadataka za danas!</h2>
              <p>Algoritam je planirao sve zadatke. Sutra te čekaju novi, složeni prema tome kako si ih danas ocijenio.</p>
              <div class="pv-done-btns">
                <button class="btn btn-primary btn-lg" onclick={handleLogIn}>Prijavi se i nastavi sutra</button>
                <button class="btn btn-ghost btn-lg" onclick={restart}>Kreni ispočetka</button>
              </div>
            </div>
          {:else if loading}
            <div class="card card-pad pv-loading">
              <div class="pv-spinner"></div>
              Učitavanje zadatka…
            </div>
          {:else}
            {#key taskIdx}
              <article class="card task-card pv-task" bind:this={taskEl}>
                <div class="task-meta">
                  <span class="badge mono">#{task.id}</span>
                  <span class="badge">{level.id} razina</span>
                  <span class="badge badge-dim">Matematika</span>
                </div>

                <div class="{prose} prose-sm lg:prose-lg !max-w-none pv-math" use:fitMath use:mathjaxTypeset={task.id}>
                  {@html renderTaskHtml(task.text, task.id)}
                </div>

                {#if !revealed}
                  <div class="pv-reveal">
                    <button class="btn btn-primary btn-lg" onclick={() => reveal()}>Pokaži rješenje</button>
                    <span>Pokušaj sam · <span class="kbd-chip">Space</span> za rješenje</span>
                  </div>
                {:else}
                  <div class="solution">
                    <div class="solution-header">
                      <h3>Rješenje</h3>
                      {#if !rated}
                        <button class="btn btn-ghost pv-hide" onclick={() => reveal(false)} title="Sakrij rješenje">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          Sakrij
                        </button>
                      {/if}
                    </div>
                    <div class="{prose} prose-sm lg:prose-base !max-w-none pv-math pv-explanation" use:fitMath use:mathjaxTypeset={task.id}>
                      {#each sections as sec, i (i)}
                        <section data-step={i}>{@html renderTaskHtml(sec, task.id)}</section>
                      {/each}
                    </div>

                    {#if !rated}
                      <div class="rating-row">
                        <div class="rating-label">Kako ti je išlo?</div>
                        {#if pending}
                          <div class="pv-confirm">
                            <span class="pv-confirm-chosen" style="color:{pending.color}">{pending.k} — {pending.t}</span>
                            <span class="pv-confirm-when">Vraća se {pending.sub}</span>
                            <div class="pv-confirm-btns">
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
                      <div class="pv-rated">
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
    <div class="pv-panel">
      {#if panel === "ai"}
        {#key task.id}
          <DemoChat {task} {quote} onClearQuote={() => (quote = null)} onClose={() => (panel = null)} />
        {/key}
      {:else}
        <div class="pv-pdf-head">
          <div>
            <div class="pv-pdf-title">Maturalne tablice i formule</div>
            <div class="pv-pdf-meta">Matematika</div>
          </div>
          <button class="pv-pdf-close" onclick={() => (panel = null)} aria-label="Zatvori formule">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <iframe src="/pdfs/MAT-FORMULE.pdf" title="Maturalne tablice i formule"></iframe>
      {/if}
    </div>
  {/if}

  {#if ask}
    <button
      class="pv-ask"
      class:below={ask.below}
      style="left:{ask.x}px; top:{ask.y}px"
      onmousedown={(e) => e.preventDefault()}
      onclick={askAi}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICON_AI}</svg>
      Pitaj AI
    </button>
  {/if}

  <!-- The real page's feedback, held inside the preview window (see .pv
       .task-toast and .celebration-overlay in the style). -->
  {#if bump}
    {#key bump.key}
      <div class="pv-bump" aria-hidden="true">
        <div class="pv-bump-val">+{bump.to - bump.from}%</div>
        <div class="pv-bump-sub">{bump.from}% → {bump.to}% spreman</div>
      </div>
    {/key}
  {/if}

  {#if toast}
    <div class="task-toast" role="status">
      <div class="pv-toast-top">
        <span style="font-size:13px; font-weight:600;">{solved} / {GOAL} zadataka danas</span>
        <span style="font-size:12px; color:var(--text-faint)">{remaining > 0 ? `još ${remaining}` : "cilj ispunjen!"}</span>
      </div>
      <div class="pv-toast-bar"><div style="width:{toastPct}%; background:{solved >= GOAL ? 'var(--success)' : 'var(--primary)'}"></div></div>
    </div>
  {/if}

  {#if notice}
    <div class="task-toast pv-notice" role="status">{notice}</div>
  {/if}

  {#if celebrate}
    <GoalCelebration onDone={() => (celebrate = false)} tasksCompleted={solved} streak={1} readinessPct={readiness} />
  {/if}
</div>

<style>
  .pv {
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
    scroll-margin-top: 80px;
    transition: grid-template-columns 0.2s ease;
  }
  .pv.with-panel { grid-template-columns: 240px minmax(0, 1fr) 360px; }
  .pv.collapsed { grid-template-columns: 64px minmax(0, 1fr); }
  .pv.collapsed.with-panel { grid-template-columns: 64px minmax(0, 1fr) 360px; }

  /* Light theme tokens from app.css, scoped to the preview. */
  .pv.light {
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
  .pv-side {
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
  .pv-brand { display: flex; align-items: center; gap: 10px; padding: 6px 4px 14px 8px; font-weight: 600; font-size: 15px; }
  .pv-rail-btn {
    margin-left: auto;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: var(--r-md);
    color: var(--text-faint);
  }
  .pv-rail-btn:hover { background: var(--bg-hover); color: var(--text); }

  .pv-prog-wrap { position: relative; margin-bottom: 6px; }
  .pv-prog {
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
  .pv-prog:hover { border-color: var(--border-strong); }
  .pv-badge { width: 28px; height: 28px; }
  .pv-badge-sm { width: 22px; height: 22px; }
  .pv-prog-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
  .pv-prog-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pv-prog-sub { font-size: 11px; color: var(--text-faint); }
  .pv-chev { color: var(--text-faint); transition: transform 0.15s; flex-shrink: 0; }
  .pv-chev.open { transform: rotate(180deg); }
  .pv-drop {
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
    animation: pv-fade 0.12s ease-out;
  }
  .pv-drop-opt {
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
  .pv-drop-opt:hover { background: var(--bg-hover); color: var(--text); }
  .pv-drop-opt.active { color: var(--text); }
  .pv-check { margin-left: auto; color: var(--primary); }

  .pv-group {
    padding: 14px 10px 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-faint);
    font-weight: 500;
    white-space: nowrap;
  }
  .pv-item {
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
  .pv-item:hover { background: var(--bg-hover); color: var(--text); }
  .pv-item.active { background: var(--bg-elev); color: var(--text); box-shadow: 0 0 0 1px var(--border) inset; }
  .pv-item-featured { color: var(--text); background: color-mix(in oklab, hsl(38 90% 55%) 8%, transparent); }
  .pv-item-featured:hover { background: color-mix(in oklab, hsl(38 90% 55%) 14%, transparent); }
  .pv-item-featured .pv-ico { color: hsl(38 90% 60%); }
  .pv-item .nav-novo { margin-left: auto; }
  .pv-ico { width: 16px; height: 16px; flex: 0 0 16px; }
  .pv-foot {
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
  .pv-foot-sub { font-size: 11px; color: var(--text-faint); }

  /* Collapsed icon rail, as html[data-sidebar="collapsed"] in app.css. */
  .collapsed .pv-side { padding-inline: 10px; }
  .collapsed .pv-label { display: none; }
  .collapsed .pv-brand { flex-direction: column; gap: 8px; padding: 6px 0 12px; }
  .collapsed .pv-rail-btn { margin-left: 0; }
  .collapsed .pv-prog { justify-content: center; padding: 6px 0; border-color: transparent; background: none; }
  .collapsed .pv-group { height: 1px; margin: 10px 6px; padding: 0; background: var(--border); }
  .collapsed .pv-item { justify-content: center; padding: 9px 0; }
  .collapsed .pv-foot { justify-content: center; }

  .pv-main { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .pv-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 20px 11px 24px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .pv-crumb { display: flex; align-items: center; min-width: 0; font-size: 14px; color: var(--text-faint); white-space: nowrap; }
  .pv-crumb b { color: var(--text); font-weight: 500; }
  .pv-sep { margin: 0 6px; }
  .pv-burger { display: none; padding: 6px 8px; margin-right: 6px; }
  .pv-top-actions { display: flex; gap: 6px; align-items: center; }
  .pv-top-actions .btn { padding: 7px 10px; }
  .pv-top-on { color: var(--text); border-color: var(--primary-border); }
  .pv-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .pv-page { max-width: 760px; margin: 0 auto; padding: 26px 28px 40px; }

  .pv-task { padding: 32px; animation: pv-fade 0.25s ease-out; }
  .pv-math { color: var(--text); }
  .pv-reveal { margin-top: 24px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .pv-reveal > span { color: var(--text-faint); font-size: 12px; }
  /* No keyboard on touch screens, so no Space hint. */
  @media (hover: none) {
    .pv-reveal > span { display: none; }
  }
  .solution-header { justify-content: space-between; }
  .pv-hide { padding: 6px 10px; font-size: 12px; }
  .pv-explanation :global(h2) { margin-top: 1.4em; }
  .pv-explanation :global(section:first-child h2) { margin-top: 0; }
  /* \textcolor{green|red|blue} in the explanations are made for white paper;
     on the dark preview they get the app's lighter shades (see app.css, which
     only does this when the whole app is in the dark theme). */
  .pv:not(.light) :global(:is(.katex, mjx-container) :is([style^="color:green"], [style^="color: green"], [style*=";color:green"])) { color: var(--success) !important; }
  .pv:not(.light) :global(:is(.katex, mjx-container) :is([style^="color:red"], [style^="color: red"], [style*=";color:red"])) { color: var(--danger) !important; }
  .pv:not(.light) :global(:is(.katex, mjx-container) :is([style^="color:blue"], [style^="color: blue"], [style*=";color:blue"])) { color: #60a5fa !important; }
  .pv-confirm { display: flex; align-items: center; gap: 8px 14px; flex-wrap: wrap; }
  .pv-confirm-chosen { font-size: 15px; font-weight: 600; }
  .pv-confirm-when { font-size: 12px; color: var(--text-faint); font-family: var(--font-mono); }
  .pv-confirm-btns { display: flex; gap: 8px; margin-left: auto; }
  .pv-rated {
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--success);
    font-size: 14px;
  }
  .pv-rated span { color: var(--text-dim); }

  .pv-loading { display: flex; align-items: center; gap: 12px; color: var(--text-faint); }
  .pv-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: pv-spin 0.8s linear infinite;
  }
  @keyframes pv-spin { to { transform: rotate(360deg); } }
  .pv-done { text-align: center; padding: 40px 28px; }
  .pv-done-emoji { font-size: 44px; margin-bottom: 10px; }
  .pv-done h2 { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
  .pv-done p { margin: 0 auto; max-width: 30em; color: var(--text-dim); font-size: 14px; }
  .pv-done-btns { margin-top: 22px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .pv-ask {
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
    animation: pv-fade 0.12s ease-out;
  }
  .pv-ask.below { transform: translate(-50%, 0); }
  .pv-ask:hover { background: var(--primary); color: var(--on-primary); border-color: transparent; }

  /* The real page's progress bump and toast, scaled to the window. */
  .pv-bump {
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
  .pv-bump-val {
    font-size: 44px;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--success);
    font-family: var(--font-mono);
    text-shadow: 0 0 40px oklch(0.65 0.2 160 / 0.6);
    animation: pv-bump-float 2s ease forwards;
  }
  .pv-bump-sub { font-size: 13px; color: var(--text-dim); animation: pv-bump-float 2s ease forwards; }
  @keyframes pv-bump-float {
    0% { opacity: 0; transform: translateY(10px) scale(0.8); }
    15% { opacity: 1; transform: translateY(0) scale(1.05); }
    60% { opacity: 1; transform: translateY(-8px) scale(1); }
    100% { opacity: 0; transform: translateY(-32px) scale(0.9); }
  }
  /* The real toast and goal celebration are position: fixed (page-wide); here
     they belong to the window. */
  .pv .task-toast { position: absolute; bottom: 24px; }
  .pv :global(.celebration-overlay) { position: absolute; z-index: 20; }
  .pv-toast-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .pv-toast-bar { height: 6px; border-radius: 99px; background: var(--border); overflow: hidden; }
  .pv-toast-bar > div { height: 100%; border-radius: 99px; transition: width 0.4s cubic-bezier(0.34, 1.2, 0.64, 1); }
  .pv .pv-notice { min-width: 0; font-size: 13px; color: var(--text-dim); white-space: nowrap; }

  .pv-panel {
    border-left: 1px solid var(--border);
    background: var(--bg-elev);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    animation: pv-panel-in 0.18s ease-out;
  }
  @keyframes pv-panel-in { from { opacity: 0; transform: translateX(16px); } }
  @keyframes pv-fade { from { opacity: 0; } }
  .pv-pdf-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 12px 11px 16px;
    border-bottom: 1px solid var(--border);
  }
  .pv-pdf-title { font-size: 14px; font-weight: 500; }
  .pv-pdf-meta { font-size: 12px; color: var(--text-faint); }
  .pv-pdf-close { width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-md); color: var(--text-dim); }
  .pv-pdf-close:hover { background: var(--bg-hover); color: var(--text); }
  .pv-panel iframe { flex: 1; width: 100%; border: 0; background: #fff; }

  .pv-backdrop { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .pv, .pv-panel, .pv-task, .pv-drop, .pv-ask { animation: none; transition: none; }
  }

  /* Narrower than the desktop split view: the panel covers the page like it does in the app. */
  @media (max-width: 1080px) {
    .pv.with-panel { grid-template-columns: 240px minmax(0, 1fr); }
    .pv.collapsed.with-panel { grid-template-columns: 64px minmax(0, 1fr); }
    .pv-panel { position: absolute; inset: 0 0 0 auto; width: min(360px, 100%); z-index: 8; box-shadow: -20px 0 40px rgba(0, 0, 0, 0.4); }
  }
  /* Phones get the app's mobile layout: the sidebar becomes a slide-over behind
     the hamburger. */
  @media (max-width: 760px) {
    /* Shrinks to short content instead of leaving an empty frame, but a long
       solution scrolls inside the window rather than stretching the page. */
    .pv, .pv.with-panel, .pv.collapsed, .pv.collapsed.with-panel { grid-template-columns: minmax(0, 1fr); height: auto; min-height: 440px; }
    .pv-scroll { max-height: min(640px, 75vh); }
    .pv-side {
      position: absolute;
      inset: 0 auto 0 0;
      width: min(260px, 82%);
      z-index: 9;
      transform: translateX(-100%);
      transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .pv-side.open { transform: none; box-shadow: 16px 0 48px rgba(0, 0, 0, 0.35); }
    .pv-backdrop {
      display: block;
      position: absolute;
      inset: 0;
      z-index: 9;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .pv-backdrop.open { opacity: 1; pointer-events: auto; }
    .pv-rail-btn { display: none; }
    .collapsed .pv-label { display: revert; }
    .pv-burger { display: inline-flex; }
    .pv-crumb-course, .pv-crumb .pv-sep, .pv-ai-label { display: none; }
    .pv-top { padding: 8px 12px; }
    .pv-page { padding: 18px 14px 32px; }
    .pv-task { padding: 18px; }
    .pv-panel { width: 100%; }
    .pv-confirm-btns { margin-left: 0; }
  }
</style>
