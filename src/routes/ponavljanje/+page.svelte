<script>
  import { userData } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { renderTaskHtml } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { mathjaxTypeset } from "$lib/utils/mathjax";
  import { setCurrentTask, clearCurrentTask } from "$lib/store/currentTask.svelte.js";
  import { showErrorAlert } from "$lib/store/errorAlert.svelte.js";
  import RatingPicker from "$lib/components/ratingPicker/RatingPicker.svelte";

  let currentCourse = $state(null);
  let task = $state(null);
  let selectedTempo = $state(null);
  let isLoading = $state(false);
  let revealed = $state(false);
  let answered = $state(false);
  let pendingRating = $state(null);
  let ratingKey = $state(0);
  let startTime = $state(null);
  let noTask = $state(false);

  // Objective-practice mode: /ponavljanje?objectiveId=123&name=...
  let objectiveId = $derived($page.url.searchParams.get("objectiveId"));
  let objectiveName = $derived($page.url.searchParams.get("name"));
  // Field-practice mode: /ponavljanje?fieldId=5&fieldName=...
  let fieldId = $derived($page.url.searchParams.get("fieldId"));
  let fieldName = $derived($page.url.searchParams.get("fieldName"));
  let fieldMode = $derived(!!fieldId);

  async function fetchCurrentCourse() {
    const response = await apiClient("/account/current-course", { method: "GET" });
    if (response.ok) currentCourse = await response.json();
  }

  async function fetchTask() {
    if (!fieldId && !objectiveId) {
      noTask = true;
      return;
    }

    isLoading = true;
    task = null;
    revealed = false;
    answered = false;
    pendingRating = null;
    noTask = false;

    let response;
    if (fieldMode) {
      response = await apiClient(`/task/get-new-from-field/${fieldId}`, { method: "GET" });
      if (response.status === 204) {
        // nema više zadataka iz ovog područja
        noTask = true;
        task = null;
        isLoading = false;
        return;
      }
    } else {
      response = await apiClient(`/task/get-from-objective/${objectiveId}`, { method: "GET" });
      if (response.status === 404) {
        noTask = true;
        task = null;
        isLoading = false;
        return;
      }
    }

    if (!response.ok) {
      showErrorAlert("Dohvaćanje zadatka nije uspjelo. Pokušaj ponovo.");
      isLoading = false;
      return;
    }

    task = await response.json();
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

    if (fieldMode) {
      // Field način: uvijek sljedeći zadatak područja dok backend ne vrati 204
      setTimeout(fetchTask, 600);
    } else if (rating.k === 5) {
      // Objective: savršeno → natrag na mapu (na isti node gdje je korisnik bio)
      setTimeout(() => goto("/mapa"), 600);
    } else {
      // Objective: < 5 → novi zadatak istog objectiva
      setTimeout(fetchTask, 600);
    }
  }

  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPad/.test(ua)) return "ipad";
    if (/iPhone/.test(ua)) return "iphone";
    if (/Android/.test(ua)) return "android";
    return "desktop";
  }

  function renderTask(text) {
    return renderTaskHtml(text, task?.id);
  }

  function renderSolution(text) {
    return renderTaskHtml(text, task?.id);
  }

  // Load user-specific data once the user is authenticated (Auth0 has no
  // onAuthStateChanged listener, so we react to the store instead).
  let loaded = false;
  $effect(() => {
    if (userData.user && !loaded) {
      loaded = true;
      (async () => {
        const tempoRes = await apiClient("/account/tempo", { method: "GET" });
        if (tempoRes.ok) selectedTempo = await tempoRes.json();
        await fetchCurrentCourse();
        await fetchTask();
      })();
    }
  });

  onDestroy(() => {
    clearCurrentTask();
  });

  function handleSpaceReveal(e) {
    if (e.code === "Space" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
      e.preventDefault();
      revealed = !revealed;
    }
  }
</script>

<svelte:window onkeydown={handleSpaceReveal}/>

<div class="page">
  <div class="zadaci-head">
    <button class="btn btn-ghost back-to-map" onclick={() => goto("/mapa")} aria-label="Natrag na mapu">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
    </button>
    <div>
      {#if fieldMode}
        <h1>Ponavljanje{fieldName ? `: ${fieldName}` : " područja"}</h1>
        <div class="sub">
          Vježbaš cijelo područje — zadaci se nižu redom prema tvom napretku.{#if task?.objective?.objectiveName} Trenutni cilj: <span class="mono">{task.objective.objectiveName}</span>.{/if}
        </div>
      {:else}
        <h1>Ponavljanje{objectiveName ? `: ${objectiveName}` : ""}</h1>
        <div class="sub">
          Rješavaj dok ne ocijeniš zadatak sa <span class="mono">5</span> (Savršeno) — tada se vraćaš na mapu.
        </div>
      {/if}
    </div>
  </div>

  {#if isLoading}
    <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-faint)">
      <div class="spinner"></div>
      Učitavanje zadatka…
    </div>

  {:else if noTask}
    <div class="card card-pad" style="text-align:center;padding:48px;">
      {#if fieldMode}
        <div style="font-size:48px;margin-bottom:12px">🎉</div>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Nema više zadataka iz ovog područja</h2>
        <p style="color:var(--text-dim);margin-bottom:20px">Za sada si prošao sve dostupne zadatke iz ovog područja.</p>
      {:else}
        <div style="font-size:48px;margin-bottom:12px">📭</div>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Nema dostupnih zadataka za ovaj cilj</h2>
        <p style="color:var(--text-dim);margin-bottom:20px">Trenutno nema zadatka za vježbanje ovog cilja.</p>
      {/if}
      <button class="btn btn-primary" onclick={() => goto("/mapa")}>Natrag na mapu</button>
    </div>

  {:else if task}
    <article class="card task-card">
      <div class="task-meta">
        <span class="badge mono">#{task.id ?? '—'}</span>
        <span class="badge">{currentCourse?.courseId == 1 ? "A" : "B"} razina</span>
        <span class="badge badge-dim">Matematika</span>
        {#if fieldMode && task.objective?.objectiveName}
          <span class="badge badge-dim">{task.objective.objectiveName}</span>
        {/if}
      </div>

      <div
        id="mathjax-output"
        class="prose prose-sm prose lg:prose-lg !max-w-none dark:prose-invert"
        use:fitMath
        use:mathjaxTypeset={task.id}
      >
        {@html renderTask(task.taskText ?? '')}
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
            text-[10px]
            sm:text-s
            md:text-s
            lg:text-lg
            prose-xs sm:prose-sm md:prose lg:prose-lg
            !prose-p:my-1
            !prose-li:my-0
            "
            use:fitMath
            use:mathjaxTypeset={task.id}
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

  /* Back arrow sits immediately left of the title */
  .zadaci-head:has(.back-to-map) {
    justify-content: flex-start;
  }
  .back-to-map {
    padding: 8px;
    line-height: 0;
    flex-shrink: 0;
  }
</style>
