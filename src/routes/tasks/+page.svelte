<script>
  import { userData } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import Sketch from "$lib/sketch/Sketch.svelte";
  import CourseLabel from "$lib/components/layout/CourseLabel.svelte";
  import { onMount, onDestroy, tick, untrack } from "svelte";
  import { fetchReadiness } from "$lib/api/progress";
  import { renderTaskHtml } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { mathjaxTypeset } from "$lib/utils/mathjax";
  import { panelState } from "$lib/store/panels.svelte";
  import { setCurrentTask, setSolutionRevealed, clearCurrentTask } from "$lib/store/currentTask.svelte.js";
  import { showErrorAlert } from "$lib/store/errorAlert.svelte.js";
  import RatingPicker, { RATINGS } from "$lib/components/ratingPicker/RatingPicker.svelte";
  import LessonRunner from "$lib/lesson/LessonRunner.svelte";
  import { interaktivnaLekcija } from "$lib/lesson/zadatak.js";
  import { objasnjenjeOcjene } from "$lib/lesson/ocjena.js";
  import { fetchIsReview } from "$lib/api/reviewState";
  import GoalCelebration from "$lib/components/celebration/GoalCelebration.svelte";
  import LessonMasteredToast from "$lib/components/lessonMastered/LessonMasteredToast.svelte";
  import { createMasteryTracker } from "$lib/api/studyMap";
  import PomoWidget from "$lib/components/pomodoro/PomoWidget.svelte";
  import AskAiSelection from "$lib/components/ai/AskAiSelection.svelte";
  import { uvod, uvodDogadaj, ocijeniUvod } from "$lib/store/uvod.svelte";
  import { ponudiSavjet } from "$lib/store/savjeti.svelte";
  import { DANA_DO_ISPITA, ZADACI, lekcijeNakon, kada } from "$lib/uvod/scenarij";

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
  // "Lekcija svladana" card after a rating that newly mastered the task's lesson
  let masteredLesson = $state(null);
  const mastery = createMasteryTracker();
  let readinessPct = $state(0);
  let dailyGoal = $state(8);
  let streak = $state(0);
  let startTime = $state(null);
  let pendingRating = $state(null);
  let ratingKey = $state(0);
  let switchingTempo = $state(false);
  // Vlastiti predmet: učenik je dobio zadatak koji je već riješio, a nova varijacija se upravo izrađuje.
  let waitingVariation = $state(false);
  let variationTimer;
  const VARIATION_WAIT_MS = 60000;
  // Interaktivna verzija zadatka (vlastiti predmet s oblikom lekcija „interaktivno“). Bez nje, s nepoznatom
  // verzijom formata ili kad učenik odabere „Prikaži kao tekst“, zadatak se prikazuje kao i dosad.
  let tekstualno = $state(false);
  let interaktivna = $derived(interaktivnaLekcija(task));
  let lekcija = $derived(tekstualno ? null : interaktivna);
  // Kako je prošla interaktivna lekcija: prijedlog ocjene i najviše do čega se smije podići.
  let lekcijaSazetak = $state(null);
  $effect(() => {
    task?.id;
    tekstualno = !!task?.uvodLekcija?.kaoTekst;
    lekcijaSazetak = null;
  });
  // Lekcija na ponavljanju (već ocijenjena) predlaže strožu ocjenu kad su učeniku trebali koraci.
  let ponavljanje = $state(false);
  $effect(() => {
    const id = task?.id;
    ponavljanje = false;
    if (id == null) return;
    let otkazano = false;
    if (uvod.active) return;
    fetchIsReview(id).then((r) => { if (!otkazano) ponavljanje = r; });
    return () => (otkazano = true);
  });

  // Kraj interaktivne lekcije: ocjena se predlaže iz izvedbe (LessonRunner broji dijelove riješene odmah),
  // a učenik je potvrđuje, spušta ili podiže najviše do granice iz lekcije. AI od tada smije davati cijela rješenja.
  function lekcijaGotova(sazetak) {
    revealed = true;
    lekcijaSazetak = sazetak;
    pendingRating = RATINGS.find((r) => r.k === sazetak.q) ?? null;
  }

  async function fetchUserGoal() {
    try {
      const r = await apiClient("/user-goal", { method: "GET" });
      if (r.ok) {
        const data = await r.json();
        if (typeof data?.dailyGoal === "number" && data.dailyGoal > 0) {
          dailyGoal = data.dailyGoal;
        }
        if (typeof data?.todayCompleted === "number") {
          completedToday = data.todayCompleted;
        }
        if (typeof data?.currentStreak === "number") {
          streak = data.currentStreak;
        }
      }
    } catch {}
  }

  let initialProgress = $state(null);

  async function checkProgressBump() {
    const progress = await fetchReadiness();
    if (initialProgress !== null && progress > initialProgress) {
      progressBump = { from: initialProgress, to: progress, key: Date.now() };
    }
    initialProgress = progress;
    readinessPct = progress ?? 0;
  }

  // The session-expiry path already shows its own message and redirects, so
  // only report a load failure while the user is still signed in.
  function reportTaskLoadError(err) {
    console.error("Task load error:", err);
    if (userData.user) {
      showErrorAlert("Dohvaćanje zadatka nije uspjelo. Pokušaj ponovo.");
    }
  }

  async function fetchNewTask() {
    isLoading = true;
    try {
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
        return;
      }

      if (!response.ok) throw new Error("Task fetch failed: " + response.status);

      task = JSON.parse(text);
      setCurrentTask(task);
      ponudiSavjet("formule");
      startTime = Date.now();
      checkVariation(task);
    } finally {
      // Always drop the spinner — an expired session used to leave the page
      // stuck on "Učitavanje zadatka…" forever.
      isLoading = false;
    }
  }

  async function variationState(t) {
    const r = await apiClient(`/task/${t.id}/next-variation`, { method: "GET" });
    return r.ok ? (await r.json()).state : "none";
  }

  // Nova varijacija postoji: trenutni zadatak se bira ponovno.
  async function swapToNewVariation() {
    const r = await apiClient("/task/refresh-current", { method: "POST" });
    if (r.ok && r.status !== 204) {
      task = await r.json();
      setCurrentTask(task);
    }
  }

  // Kratko čekanje uz ispriku; ako izrada padne ili traje predugo, ostaje prethodna varijacija,
  // a izrada se nastavlja u pozadini.
  async function checkVariation(t) {
    clearTimeout(variationTimer);
    try {
      const state = await variationState(t);
      if (state === "ready") return await swapToNewVariation();
      if (state !== "pending") return;
      waitingVariation = true;
      const started = Date.now();
      const poll = async () => {
        let next = "none";
        try {
          next = await variationState(t);
        } catch {}
        if (next === "ready") await swapToNewVariation();
        else if (next === "pending" && Date.now() - started < VARIATION_WAIT_MS) {
          variationTimer = setTimeout(poll, 3000);
          return;
        }
        waitingVariation = false;
        startTime = Date.now();
      };
      variationTimer = setTimeout(poll, 3000);
    } catch {
      waitingVariation = false;
    }
  }

  // The walkthrough: its two made-up tasks, rated without the backend.
  function uvodSpremnost() {
    const lekcije = lekcijeNakon(uvod.ocjene);
    return Math.round((lekcije.filter((l) => l.za > DANA_DO_ISPITA).length / lekcije.length) * 100);
  }

  function uvodZadatak() {
    const lekcija = ZADACI.find((z) => !(z.id in uvod.ocjene));
    revealed = false;
    answered = false;
    pendingRating = null;
    ratingKey++;
    noMoreTasks = !lekcija;
    task = lekcija
      ? {
          id: `uvod-${lekcija.id}`,
          objective: lekcija.naziv,
          taskText: lekcija.zadatak,
          explanation: lekcija.rjesenje,
          lessonUi: JSON.stringify(lekcija.lekcija),
          uvodLekcija: lekcija,
        }
      : null;
  }

  async function rateUvod(rating) {
    answered = true;
    const from = readinessPct;
    ocijeniUvod(task.uvodLekcija.id, rating.k);
    uvodDogadaj("ocijenjeno");
    completedToday += 1;
    readinessPct = uvodSpremnost();
    if (readinessPct > from) progressBump = { from, to: readinessPct, key: Date.now() };
    showToast = false;
    await tick();
    showToast = true;
    setTimeout(() => showToast = false, 2200);
    setTimeout(uvodZadatak, 600);
  }

  async function handleRate(rating) {
    if (!task) return;
    if (uvod.active) return rateUvod(rating);
    answered = true;
    const objective = task.objective;

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

    const newlyMastered = mastery.rated(objective, rating.k);
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

    setTimeout(() => fetchNewTask().catch(reportTaskLoadError), 600);

    // the goal celebration takes priority over the lesson card
    const m = await newlyMastered;
    if (m && !justReachedGoal && !showCelebration) masteredLesson = { ...m, key: Date.now() };
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

  function renderTask(text) {
    return renderTaskHtml(text, task?.id);
  }

  function renderSolution(text) {
    return renderTaskHtml(text, task?.id);
  }

  onMount(async () => {
    if (uvod.active) return;
    const response = await apiClient("/account/tempo", { method: "GET" });
    if (response.ok) {
      selectedTempo = await response.json();
    }
  });

  // Load user-specific data once the user is authenticated (Auth0 has no
  // onAuthStateChanged listener, so we react to the store instead).
  let loaded = false;
  $effect(() => {
    if (uvod.active) {
      untrack(() => {
        loaded = false;
        dailyGoal = ZADACI.length;
        completedToday = Object.keys(uvod.ocjene).length;
        readinessPct = uvodSpremnost();
        uvodZadatak();
      });
      return;
    }
    if (userData.user && !loaded) {
      loaded = true;
      noMoreTasks = false;
      (async () => {
        try {
          await Promise.all([fetchUserGoal(), mastery.load()]);
          await fetchNewTask();
        } catch (err) {
          loaded = false;
          reportTaskLoadError(err);
        }
      })();
    }
  });

  // The AI panel answers with hints until the solution is open.
  $effect(() => {
    setSolutionRevealed(revealed);
  });

  $effect(() => {
    if (revealed) untrack(() => (uvod.active ? uvodDogadaj("otkriveno") : ponudiSavjet("ai")));
  });

  onDestroy(() => {
    clearTimeout(variationTimer);
    clearCurrentTask();
  });

  let remaining = $derived(Math.max(0, dailyGoal - completedToday));
  let toastPct = $derived(Math.min(completedToday / dailyGoal * 100, 100));

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
      <div class="rating-row" data-tour="ocjena">
        <!-- after a lesson the suggestion only asks to be confirmed; "Promijeni" shows why and the ratings -->
        <div class="rating-label">{lekcijaSazetak && pendingRating ? "Predložena ocjena. Slažeš li se?" : "Kako ti je išlo?"}</div>
        {#if pendingRating}
          <div class="rating-confirm">
            <span class="rating-confirm-chosen" style="color:{pendingRating.color}">
              {pendingRating.t}
            </span>
            {#if task.uvodLekcija}
              <span class="rating-confirm-kada">vraća se {kada(task.uvodLekcija.dani[pendingRating.k - 1])}</span>
            {/if}
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
            <RatingPicker taskId={task.uvodLekcija ? null : task.id} days={task.uvodLekcija?.dani ?? null} najvise={lekcijaSazetak?.najvise ?? 4} onSelect={(r) => pendingRating = r} />
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

{#if showCelebration}
  <GoalCelebration
    onDone={() => showCelebration = false}
    tasksCompleted={completedToday}
    {streak}
    readinessPct={readinessPct}
  />
{/if}

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
        <CourseLabel /> · {dailyGoal} zadataka planirano · {completedToday} riješeno ·
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

  {:else if waitingVariation}
    <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-dim)">
      <div class="spinner"></div>
      <div>
        <b>Pripremamo novu verziju ovog zadatka.</b><br />
        Oprosti na čekanju, ovo traje najviše minutu. Ako ne stigne, dobit ćeš zadatak koji si već rješavao.
      </div>
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
    <article class="card task-card" data-tour="zadatak">
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
            text-[10px]         /* još manji font za najmanje ekrane */
            sm:text-s     /* male ekrane */
            md:text-s    /* srednji ekrani */
            lg:text-lg      /* veliki ekrani */
            prose-xs sm:prose-sm md:prose lg:prose-lg
            !prose-p:my-1   /* smanjuje marginu između paragrafa na malim ekranima */
            !prose-li:my-0  /* smanjuje marginu između listi na malim ekranima */
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
  .rating-confirm-kada {
    font-size: 14px;
    color: var(--text-dim);
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
