<script>
  import { auth } from "$lib/config/firebase-config";
  import { apiClient } from "$lib/api/apiClient";
  import { onMount, onDestroy, tick } from "svelte";
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";
  import { calculateExamProgress } from "$lib/utils/progress";
  import { md } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { panelState } from "$lib/store/panels.svelte";
  import { setCurrentTask, clearCurrentTask } from "$lib/store/currentTask.svelte.js";
  import { showErrorAlert } from "$lib/store/errorAlert.svelte.js";
  import RatingPicker from "$lib/components/ratingPicker/RatingPicker.svelte";
  import GoalCelebration from "$lib/components/celebration/GoalCelebration.svelte";
  import PomoWidget from "$lib/components/pomodoro/PomoWidget.svelte";

  let currentCourse = $state(null);
  let task = $state(null);
  let selectedTempo = $state(null);
  let noMoreTasks = $state(false);
  let isLoading = $state(false);
  let revealed = $state(false);
  let answered = $state(false);
  let completedToday = $state(0);
  let showToast = $state(false);
  let showCelebration = $state(false);
  let progressBump = $state(null);
  let readinessPct = $state(0);
  let dailyGoal = $state(8);
  let startTime = $state(null);
  let pendingRating = $state(null);
  let ratingKey = $state(0);
  let switchingTempo = $state(false);

  async function fetchUserGoal() {
    try {
      const r = await apiClient("/user-goal", { method: "GET" });
      if (r.ok) {
        const data = await r.json();
        if (typeof data?.dailyGoal === "number" && data.dailyGoal > 0) {
          dailyGoal = data.dailyGoal;
        }
        if (typeof data?.todayGoal === "number") {
          completedToday = data.todayGoal;
        }
      }
    } catch {}
  }

  async function fetchCurrentProgress() {
    const objectives = await fetchObjectivesWithStatus();
    return calculateExamProgress(objectives, currentCourse?.courseId);
  }

  let initialProgress = $state(null);

  async function checkProgressBump() {
    const progress = await fetchCurrentProgress();
    if (initialProgress !== null && progress > initialProgress) {
      progressBump = { from: initialProgress, to: progress, key: Date.now() };
    }
    initialProgress = progress;
    readinessPct = progress ?? 0;
  }

  async function fetchCurrentCourse() {
    const response = await apiClient("/account/current-course", { method: "GET" });
    if (response.ok) currentCourse = await response.json();
  }

  async function fetchNewTask() {
    isLoading = true;
    await checkProgressBump();
    task = null;
    revealed = false;
    answered = false;
    pendingRating = null;

    const response = await apiClient("/task/get-new", { method: "GET" });
    const text = await response.text();

    if (text === "No more tasks for today!") {
      noMoreTasks = true;
      task = null;
      isLoading = false;
      return;
    }

    task = JSON.parse(text);
    setCurrentTask(task);
    startTime = Date.now();
    isLoading = false;
  }

  async function handleRate(rating) {
    if (!task) return;
    answered = true;

    const endTime = Date.now();
    const device = getDeviceType();

    let response;
    try {
      response = await apiClient("/solved-task/set-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          q: rating.k,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          device,
          tempo: selectedTempo,
        }),
      });
    } catch {
      showErrorAlert("Nema veze sa serverom. Pokušaj ponovo.");
      answered = false;
      return;
    }

    if (!response.ok) {
      showErrorAlert("Spremanje zadatka nije uspjelo. Pokušaj ponovo.");
      answered = false;
      return;
    }

    const oldCount = completedToday;
    await fetchUserGoal();
    const justReachedGoal = oldCount < dailyGoal && completedToday >= dailyGoal;

    if (justReachedGoal) {
      setTimeout(() => setShowCelebration(), 400);
    } else if (completedToday < dailyGoal) {
      showToast = false;
      await tick();
      showToast = true;
      setTimeout(() => showToast = false, 2200);
    }

    setTimeout(fetchNewTask, 600);
  }

  function setShowCelebration() {
    showCelebration = true;
  }

  async function switchToUbrzaniAndRetry() {
    if (switchingTempo) return;
    switchingTempo = true;
    try {
      const r = await apiClient("/account/tempo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(1),
      });
      if (!r.ok) {
        showErrorAlert("Promjena tempa nije uspjela. Pokušaj ponovo.");
        return;
      }
      selectedTempo = 1;
      noMoreTasks = false;
      await fetchNewTask();
    } catch {
      showErrorAlert("Nema veze sa serverom. Pokušaj ponovo.");
    } finally {
      switchingTempo = false;
    }
  }

  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPad/.test(ua)) return "ipad";
    if (/iPhone/.test(ua)) return "iphone";
    if (/Android/.test(ua)) return "android";
    return "desktop";
  }

  function normalizeMath(text) {
    if (!text) return "";
    return text.replace(/\\/g, "\\\\");
  }

  function renderSolution(text) {
    if (!text) return "";
    return md.render(normalizeMath(text));
  }

  function typesetMath() {
    tick().then(() => {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
    });
  }

  $effect(() => {
    if (task) typesetMath();
  });

  $effect(() => {
    if (revealed) typesetMath();
  });

  onMount(async () => {
    const response = await apiClient("/account/tempo", { method: "GET" });
    if (response.ok) {
      selectedTempo = await response.json();
    }

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await Promise.all([fetchCurrentCourse(), fetchUserGoal()]);
        await fetchNewTask();
      }
    });
    return () => unsub();
  });

  onDestroy(() => {
    clearCurrentTask();
  });

  let remaining = $derived(Math.max(0, dailyGoal - completedToday));
  let toastPct = $derived(Math.min(completedToday / dailyGoal * 100, 100));

  function handleSpaceReveal(e) {
    if (e.code === "Space" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
      e.preventDefault();
      revealed = !revealed;
    }
  }
</script>

<svelte:window onkeydown={handleSpaceReveal}/>

{#if showCelebration}
  <GoalCelebration
    onDone={() => showCelebration = false}
    tasksCompleted={completedToday}
    streak={0}
    readinessPct={readinessPct}
  />
{/if}

{#if progressBump}
  {#key progressBump.key}
    <div class="progress-bump">
      <div class="progress-bump-val">+{progressBump.to - progressBump.from}%</div>
      <div class="progress-bump-sub">{progressBump.from}% → {progressBump.to}% spreman</div>
    </div>
  {/key}
{/if}

{#if showToast}
  <div class="task-toast">
    <div class="task-toast-top">
      <span style="font-size:13px; font-weight:600;">{completedToday} / {dailyGoal} zadataka danas</span>
      <span style="font-size:12px; color:var(--text-faint)">{remaining > 0 ? `još ${remaining}` : 'cilj ispunjen!'}</span>
    </div>
    <div class="task-toast-bar">
      <div class="task-toast-fill" style="width:{toastPct}%; background: {completedToday >= dailyGoal ? 'var(--success)' : 'var(--primary)'}"></div>
    </div>
  </div>
{/if}

<div class="page">
  <div class="zadaci-head">
    <div>
      <h1>Zadaci za danas</h1>
      <div class="sub">
        Matematika · {dailyGoal} zadataka planirano · {completedToday} riješeno ·
        <span class="mono">{remaining}</span> preostalo ·
        <span class="mono" style="color:var(--success)">{readinessPct}% spreman</span>
      </div>
    </div>
  </div>

  {#if panelState.pomoVisible}
    <PomoWidget onClose={() => panelState.pomoVisible = false}/>
  {/if}

  {#if isLoading}
    <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-faint)">
      <div class="spinner"></div>
      Učitavanje zadatka…
    </div>

  {:else if noMoreTasks}
    <div class="card card-pad" style="text-align:center;padding:48px;">
      <div style="font-size:48px;margin-bottom:12px">🎉</div>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Nema više zadataka za danas!</h2>
      <p style="color:var(--text-dim)">Algoritam je planirao sve zadatke. Vrati se sutra.</p>
      {#if selectedTempo === 2}
        <div class="no-tasks-offer">
          <p>Trenutno koristiš <strong>Temeljiti</strong> tempo. Prelaskom na <strong>Ubrzani</strong> tempo možda ima još zadataka za danas.</p>
          <button class="btn btn-primary" onclick={switchToUbrzaniAndRetry} disabled={switchingTempo}>
            {switchingTempo ? "Mijenjam tempo…" : "Prijeđi na Ubrzani tempo"}
          </button>
        </div>
      {/if}
    </div>

  {:else if task}
    <article class="card task-card">
      <div class="task-meta">
        <span class="badge mono">#{task.id ?? '—'}</span>
        <span class="badge">{currentCourse.courseId == 1 ? "A" : "B"} razina</span>
        <span class="badge badge-dim">Matematika</span>
      </div>

      <div
        id="mathjax-output"
        class="prose prose-sm prose lg:prose-lg !max-w-none dark:prose-invert"
        use:fitMath
      >
        {@html task.taskText ?? ''}
      </div>

      {#if !revealed}
        <div style="margin-top:24px;display:flex;gap:10px;align-items:center">
          <button class="btn btn-primary btn-lg" onclick={() => revealed = true}>
            Pokaži rješenje
          </button>
          <span style="color:var(--text-faint);font-size:12px">
            Pokušaj sam · <span class="kbd-chip">Space</span> za rješenje
          </span>
        </div>
      {:else}
        <div class="solution">
          <div class="solution-header">
            <h3>Rješenje</h3>
            <button class="btn btn-ghost solution-close" onclick={() => revealed = false} title="Sakrij rješenje">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Sakrij
            </button>
          </div>
          <div class="prose !max-w-none dark:prose-invert
            text-[10px]         /* još manji font za najmanje ekrane */
            sm:text-s     /* male ekrane */
            md:text-s    /* srednji ekrani */
            lg:text-lg      /* veliki ekrani */
            prose-xs sm:prose-sm md:prose lg:prose-lg
            !prose-p:my-1   /* smanjuje marginu između paragrafa na malim ekranima */
            !prose-li:my-0  /* smanjuje marginu između listi na malim ekranima */
            "
            use:fitMath
          >
            {@html renderSolution(task.explanation ?? '')}
          </div>

          {#if !answered}
            <div class="rating-row">
              <div class="rating-label">Kako ti je išlo?</div>
              {#if pendingRating}
                <div class="rating-confirm">
                  <span class="rating-confirm-chosen" style="color:{pendingRating.color}">
                    {pendingRating.k} — {pendingRating.t}
                  </span>
                  <div class="rating-confirm-btns">
                    <button class="btn btn-primary" onclick={() => { handleRate(pendingRating); pendingRating = null; }}>
                      Potvrdi i nastavi
                    </button>
                    <button class="btn btn-ghost" onclick={() => { pendingRating = null; ratingKey++; }}>
                      Promijeni
                    </button>
                  </div>
                </div>
              {:else}
                {#key ratingKey}
                  <RatingPicker onSelect={(r) => pendingRating = r} />
                {/key}
              {/if}
            </div>
          {:else}
            <div style="margin-top:18px;display:flex;gap:10px;align-items:center;color:var(--success)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Zabilježeno.
            </div>
          {/if}
        </div>
      {/if}
    </article>

    <div class="task-bottom">
      <div style="color:var(--text-faint);font-size:12px">Kategorija je skrivena dok ne procijeniš zadatak.</div>
    </div>
  {/if}
</div>

<style>
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .progress-bump {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 199;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    animation: bumpIn .4s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  .progress-bump-val {
    font-size: 48px;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--success);
    animation: bumpFloat 2s ease forwards;
    text-shadow: 0 0 40px oklch(0.65 0.2 160 / 0.6);
    font-family: var(--font-mono);
  }
  .progress-bump-sub {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    animation: bumpFloat 2s ease forwards;
  }
  @keyframes bumpFloat {
    0%   { opacity:0; transform: translateY(10px) scale(0.8); }
    15%  { opacity:1; transform: translateY(0) scale(1.05); }
    60%  { opacity:1; transform: translateY(-8px) scale(1); }
    100% { opacity:0; transform: translateY(-32px) scale(0.9); }
  }

  .task-toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    min-width: 280px;
    max-width: 380px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 14px 18px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
    animation: toastIn .3s cubic-bezier(0.34,1.4,0.64,1);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .task-toast-top { display: flex; align-items: center; justify-content: space-between; }
  .task-toast-bar { height: 6px; border-radius: 99px; background: var(--border); overflow: hidden; }
  .task-toast-fill { height: 100%; border-radius: 99px; transition: width .4s cubic-bezier(0.34,1.2,0.64,1); }
  @keyframes toastIn {
    from { opacity:0; transform: translateX(-50%) translateY(16px) scale(0.96); }
    to   { opacity:1; transform: translateX(-50%) translateY(0) scale(1); }
  }

  .kbd-chip {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .rating-confirm {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .rating-confirm-chosen {
    font-size: 15px;
    font-weight: 600;
  }
  .rating-confirm-btns {
    display: flex;
    gap: 8px;
  }

  .solution-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .solution-close {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--text-faint);
    padding: 4px 10px;
  }
  .solution-close:hover { color: var(--text); }

  .no-tasks-offer {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  .no-tasks-offer p {
    color: var(--text-dim);
    font-size: 13px;
    margin-bottom: 14px;
    line-height: 1.55;
  }
</style>
