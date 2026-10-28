<script>
  import { userData } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import Sketch from "$lib/sketch/Sketch.svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { renderTaskHtml } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { mathjaxTypeset } from "$lib/utils/mathjax";
  import { setCurrentTask, setSolutionRevealed, clearCurrentTask } from "$lib/store/currentTask.svelte.js";
  import { showErrorAlert } from "$lib/store/errorAlert.svelte.js";
  import RatingPicker, { RATINGS } from "$lib/components/ratingPicker/RatingPicker.svelte";
  import LessonRunner from "$lib/lesson/LessonRunner.svelte";
  import { interaktivnaLekcija } from "$lib/lesson/zadatak.js";
  import { objasnjenjeOcjene } from "$lib/lesson/ocjena.js";
  import { fetchIsReview } from "$lib/api/reviewState";
  import AskAiSelection from "$lib/components/ai/AskAiSelection.svelte";
  import LessonMasteredToast from "$lib/components/lessonMastered/LessonMasteredToast.svelte";
  import { createMasteryTracker } from "$lib/api/studyMap";
  import { playSound } from "$lib/sound.svelte.js";

  let task = $state(null);
  let isLoading = $state(false);
  let revealed = $state(false);
  let answered = $state(false);
  let pendingRating = $state(null);
  let ratingKey = $state(0);
  let startTime = $state(null);
  let noTask = $state(false);
  // "Lekcija svladana" card after a rating that newly mastered the task's lesson, while the review goes on
  let masteredLesson = $state(null);
  const mastery = createMasteryTracker();
  // Interaktivna verzija zadatka, kao na /tasks: tko zna, gotov je s tri odgovora, što je za ponavljanje idealno.
  let tekstualno = $state(false);
  let interaktivna = $derived(interaktivnaLekcija(task));
  let lekcija = $derived(tekstualno ? null : interaktivna);
  // Kako je prošla interaktivna lekcija: prijedlog ocjene i najviše do čega se smije podići.
  let lekcijaSazetak = $state(null);
  $effect(() => {
    task?.id;
    tekstualno = false;
    lekcijaSazetak = null;
  });
  // Lekcija na ponavljanju (već ocijenjena) predlaže strožu ocjenu kad su učeniku trebali koraci.
  let ponavljanje = $state(false);
  $effect(() => {
    const id = task?.id;
    ponavljanje = false;
    if (id == null) return;
    let otkazano = false;
    fetchIsReview(id).then((r) => { if (!otkazano) ponavljanje = r; });
    return () => (otkazano = true);
  });

  function lekcijaGotova(sazetak) {
    revealed = true;
    lekcijaSazetak = sazetak;
    pendingRating = RATINGS.find((r) => r.k === sazetak.q) ?? null;
  }

  // Objective-practice mode: /ponavljanje?objectiveId=123&name=...
  let objectiveId = $derived($page.url.searchParams.get("objectiveId"));
  let objectiveName = $derived($page.url.searchParams.get("name"));
  // Field-practice mode: /ponavljanje?fieldId=5&fieldName=...
  let fieldId = $derived($page.url.searchParams.get("fieldId"));
  let fieldName = $derived($page.url.searchParams.get("fieldName"));
  let fieldMode = $derived(!!fieldId);

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
    const objective = task.objective ?? { objectiveId: Number(objectiveId), objectiveName };

    const endTime = Date.now();
    const device = getDeviceType();

    let response;
    try {
      response = await apiClient("/solved-task/set-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          grade: rating.k,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          device,
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

    // Dobro or Lako on a single lesson ends the review and goes back to the map: that moment gets only the sound.
    const endsReview = !fieldMode && rating.k >= 3;
    if (endsReview) playSound("milestone");

    if (fieldMode) {
      // Field način: uvijek sljedeći zadatak područja dok backend ne vrati 204
      setTimeout(fetchTask, 600);
    } else if (endsReview) {
      // Objective: dobro ili lako → natrag na mapu (na isti node gdje je korisnik bio)
      setTimeout(() => goto("/mapa"), 600);
    } else {
      // Objective: nije riješio ili s mukom → novi zadatak istog objectiva
      setTimeout(fetchTask, 600);
    }

    if (!endsReview) {
      const m = await mastery.rated(objective, rating.k);
      if (m) masteredLesson = { ...m, key: Date.now() };
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
        await mastery.load();
        await fetchTask();
      })();
    }
  });

  // The AI panel answers with hints until the solution is open.
  $effect(() => {
    setSolutionRevealed(revealed);
  });

  onDestroy(() => {
    clearCurrentTask();
  });

  function handleSpaceReveal(e) {
    // Space activates a focused button — don't hijack it (preventDefault would
    // swallow the activation and toggle the solution instead).
    const tag = e.target.tagName;
    if (lekcija) return; // interaktivna lekcija nema skriveno rješenje koje bi razmaknica otkrila
    if (e.code === "Space" && tag !== "TEXTAREA" && tag !== "INPUT" && tag !== "BUTTON") {
      e.preventDefault();
      revealed = !revealed;
    }
  }
</script>

<!-- autorovo objašnjenje tekstualnog zadatka, kao „Cijelo rješenje“ na kraju lekcije koja počinje cijelim zadatkom -->
{#snippet rjesenje()}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown iz vlastitog renderera, kao kod tekstualnog rješenja -->
  <div class="lx-md" use:fitMath use:mathjaxTypeset={task.id}>{@html renderSolution(task.explanation ?? "")}</div>
{/snippet}

{#snippet ocjena()}
    {#if !answered}
      <div class="rating-row">
        <!-- after a lesson the suggestion only asks to be confirmed; "Promijeni" shows why and the ratings -->
        <div class="rating-label">{lekcijaSazetak && pendingRating ? "Predložena ocjena. Slažeš li se?" : "Kako ti je išlo?"}</div>
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
          {#if lekcijaSazetak}
            <p class="rating-note">{objasnjenjeOcjene(lekcijaSazetak)}</p>
          {/if}
          {#key ratingKey}
            <RatingPicker taskId={task.id} najvise={lekcijaSazetak?.najvise ?? 4} onSelect={(r) => pendingRating = r} />
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
{/snippet}

<svelte:window onkeydown={handleSpaceReveal}/>

<AskAiSelection/>

{#if masteredLesson}
  {#key masteredLesson.key}
    <LessonMasteredToast
      lessonName={masteredLesson.lessonName}
      fieldName={masteredLesson.fieldName}
      mastered={masteredLesson.mastered}
      total={masteredLesson.total}
      onclose={() => (masteredLesson = null)} />
  {/key}
{/if}

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
          Rješavaj dok zadatak ne ocijeniš s „Dobro” ili „Lako” — tada se vraćaš na mapu.
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
      {#if fieldMode && task.objective?.objectiveName}
        <div class="task-meta">
          <span class="badge badge-dim">{task.objective.objectiveName}</span>
        </div>
      {/if}

      {#if lekcija}
        {#key task.id}<LessonRunner {lekcija} onzavrsi={lekcijaGotova} {rjesenje} {ponavljanje} />{/key}
        <div class="lesson-alt">
          <button class="btn btn-quiet" onclick={() => (tekstualno = true)}>Prikaži kao tekst</button>
        </div>
        {#if revealed}<div class="solution">{@render ocjena()}</div>{/if}
      {:else}
      <div class="task-body">
        {#if task.sketch}
          <!-- skica iz opisa: desno uz tekst, na mobitelu ispod; neispravan opis ne prikazuje ništa -->
          <div class="task-sketch-side"><Sketch sketch={task.sketch} text={`${task.taskText ?? ""}\n${task.explanation ?? ""}`} /></div>
        {/if}
        <div
          id="mathjax-output"
          class="prose prose-sm prose lg:prose-lg !max-w-none dark:prose-invert"
          use:fitMath
          use:mathjaxTypeset={task.id}
        >
          {@html renderTask(task.taskText ?? '')}
        </div>
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

          {@render ocjena()}
        </div>
      {/if}
      {#if interaktivna}
        <div class="lesson-alt">
          <button class="btn btn-quiet" onclick={() => (tekstualno = false)}>Prikaži interaktivno</button>
        </div>
      {/if}
      {/if}
    </article>
  {/if}
</div>

<style>
  .lesson-alt {
    display: flex;
    justify-content: center;
    margin-top: 10px;
  }
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
  .task-body::after { content: ""; display: block; clear: both; }
  .task-sketch-side { float: right; width: 44%; max-width: 420px; margin: 0 0 12px 20px; }
  @media (max-width: 700px) { .task-sketch-side { float: none; width: 100%; max-width: none; margin: 0 0 12px; } }
  .rating-note {
    margin: 4px 0 10px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--text-dim);
  }
</style>
