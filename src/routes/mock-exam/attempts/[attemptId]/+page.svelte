<script>
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { fetchMockExamAttempt, retryGrading } from "$lib/api/mockExam";
  import AttemptAnswer from "$lib/components/mockExam/AttemptAnswer.svelte";
  import { renderMath } from "$lib/utils/mockExamRenderer";
  import { imageUrl } from "$lib/utils/imageUrl";

  const attemptId = $derived(page.params.attemptId);

  const POLL_INITIAL_DELAY_MS = 60 * 1000;
  const POLL_INTERVAL_MS = 15 * 1000;
  const POLL_HARD_CAP_MS = 5 * 60 * 1000;

  let attempt = $state(null);
  let loading = $state(true);
  let error = $state(null);
  let pollTimedOut = $state(false);
  let retrying = $state(false);
  let retryError = $state(null);

  let initialDelayId = null;
  let intervalId = null;
  let timeoutId = null;

  onMount(async () => {
    await load();
    console.log("Initial attempt data:", attempt);
    if (attempt?.gradingStatus === "PENDING") startPolling();
  });

  onDestroy(stopPolling);

  async function load() {
    try {
      attempt = await fetchMockExamAttempt(attemptId);
      error = null;
    } catch (e) {
      error = e?.message ?? String(e);
    } finally {
      loading = false;
    }
  }

  function startPolling() {
    stopPolling();
    pollTimedOut = false;
    initialDelayId = setTimeout(() => {
      initialDelayId = null;
      intervalId = setInterval(async () => {
        await load();
        if (attempt?.gradingStatus !== "PENDING") stopPolling();
      }, POLL_INTERVAL_MS);
    }, POLL_INITIAL_DELAY_MS);
    timeoutId = setTimeout(() => {
      stopPolling();
      pollTimedOut = true;
    }, POLL_HARD_CAP_MS);
  }

  function stopPolling() {
    if (initialDelayId) clearTimeout(initialDelayId);
    if (intervalId) clearInterval(intervalId);
    if (timeoutId) clearTimeout(timeoutId);
    initialDelayId = null;
    intervalId = null;
    timeoutId = null;
  }

  async function handleRetry() {
    retrying = true;
    retryError = null;
    try {
      await retryGrading(attemptId);
      await load();
      if (attempt?.gradingStatus === "PENDING") startPolling();
    } catch (e) {
      retryError = e?.message ?? String(e);
    } finally {
      retrying = false;
    }
  }

  async function refreshNow() {
    pollTimedOut = false;
    loading = true;
    await load();
    if (attempt?.gradingStatus === "PENDING") startPolling();
  }

  // Group flat answers into a tree using question number prefix (no parentQuestionId in API response).
  // Containers have questionType=null; their children have numbers like "35.1", "35.2".
  const groupedAnswers = $derived(() => {
    const answers = attempt?.answers;
    if (!answers?.length) return [];

    const containers = answers.filter((a) => !a.questionType);
    if (!containers.length) return answers;

    const childToParent = new Map();
    for (const container of containers) {
      for (const ans of answers) {
        if (ans.questionType && ans.questionNumber.startsWith(container.questionNumber + ".")) {
          childToParent.set(ans.questionId, container.questionId);
        }
      }
    }

    const result = [];
    for (const ans of answers) {
      if (childToParent.has(ans.questionId)) continue;
      if (!ans.questionType) {
        const children = answers.filter((a) => childToParent.get(a.questionId) === ans.questionId);
        result.push({ ...ans, subAnswers: children });
      } else {
        result.push(ans);
      }
    }
    return result;
  });

  const examMeta = $derived(
    attempt
      ? { title: attempt.examTitle, year: attempt.examYear, term: attempt.examTerm }
      : null,
  );

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("hr-HR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }
</script>

<div class="result-page">
  {#if loading && !attempt}
    <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-faint)">
      <div class="spinner"></div>
      Učitavanje rezultata…
    </div>
  {:else if error && !attempt}
    <div class="card card-pad" style="color:var(--danger)">
      Greška: {error}
      <div style="margin-top:12px"><button class="btn btn-ghost" onclick={() => goto('/mock-exam')}>Natrag na popis</button></div>
    </div>
  {:else if attempt}
    <header class="result-top">
      <div>
        <button class="btn btn-quiet" onclick={() => goto('/mock-exam')} style="padding:4px 8px;margin-bottom:8px">
          ← Sve mature
        </button>
        <h1>{attempt.examTitle}</h1>
        <div class="sub">
          {attempt.examSubtitle ?? ""}{#if attempt.examYear} · {attempt.examYear}{/if}{#if attempt.examTerm} · {attempt.examTerm}{/if}
          · predano {formatDate(attempt.submittedAt)}
        </div>
      </div>
      {#if attempt.gradingStatus !== "PENDING"}
        <div class="score-box">
          <div class="score-num mono">
            {attempt.totalScore ?? "—"}
            <span class="score-max">/ {attempt.maxScore ?? "—"}</span>
          </div>
          <div class="score-label">bodova</div>
        </div>
      {/if}
    </header>

    {#if attempt.gradingStatus === "PENDING"}
      <div class="grading-screen">
        <div class="grading-ring">
          <svg class="grading-svg" viewBox="0 0 100 100">
            <circle class="grading-track" cx="50" cy="50" r="42" />
            <circle class="grading-arc" cx="50" cy="50" r="42" />
          </svg>
          <div class="grading-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 0 1 10 10"/>
              <path d="M12 6v6l4 2"/>
              <circle cx="12" cy="12" r="10" stroke-dasharray="4 2"/>
            </svg>
          </div>
        </div>
        <div class="grading-title">AI ocjenjuje tvoje odgovore</div>
        {#if pollTimedOut}
          <div class="grading-sub warn">Ocjenjivanje traje duže nego inače.</div>
          <button class="btn btn-ghost" onclick={refreshNow} style="margin-top:4px">Osvježi</button>
        {:else}
          <div class="grading-sub">Obično traje nekoliko minuta</div>
          <div class="grading-dots">
            <span></span><span></span><span></span>
          </div>
        {/if}
      </div>
    {:else if attempt.gradingStatus === "FAILED"}
      <div class="grading-screen">
        <div class="failed-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="grading-title">Ocjenjivanje nije uspjelo</div>
        <div class="grading-sub">AI nije uspio ocijeniti tvoje odgovore. Možeš pokušati ponovo.</div>
        {#if retryError}
          <div class="retry-err">{retryError}</div>
        {/if}
        <button class="btn btn-primary" onclick={handleRetry} disabled={retrying}>
          {#if retrying}
            <span class="spinner btn-spinner"></span>
            Pokretanje…
          {:else}
            Pokušaj ponovo
          {/if}
        </button>
      </div>
    {:else}
      <div class="answers">
        {#each groupedAnswers() as ans (ans.questionId)}
          {#if ans.subAnswers?.length}
            <div class="container-group">
              <div class="container-label">
                <span class="container-num mono">{ans.questionNumber}.</span>
                {#if ans.maxPoints > 0}
                  <span class="container-pts mono">{ans.maxPoints} {ans.maxPoints === 1 ? "bod" : "boda"}</span>
                {/if}
              </div>
              <div class="container-text">{@html renderMath(ans.questionText ?? "")}</div>
              {#if ans.questionImages?.length}
                <div class="container-images">
                  {#each ans.questionImages as img (img.imageUrl)}
                    <img src={imageUrl(img.imageUrl)} alt={img.altText ?? ""} />
                  {/each}
                </div>
              {/if}
              <div class="container-subs">
                {#each ans.subAnswers as sub (sub.questionId)}
                  <AttemptAnswer answer={sub} parent={ans} {examMeta} onRefresh={refreshNow} />
                {/each}
              </div>
            </div>
          {:else}
            <AttemptAnswer answer={ans} {examMeta} onRefresh={refreshNow} />
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .result-page {
    padding: var(--pad-5) var(--pad-5) var(--pad-6);
    max-width: 980px;
    margin: 0 auto;
  }
  @media (max-width: 767px) {
    .result-page { padding: var(--pad-3) var(--pad-3) var(--pad-4); }
    .container-group { padding: 14px 16px; }
  }
  .result-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: var(--pad-4);
    flex-wrap: wrap;
  }
  .result-top h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.015em;
  }
  .result-top .sub {
    color: var(--text-faint);
    font-size: 13px;
    margin-top: 4px;
  }
  .score-box { text-align: right; }
  .score-num {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .score-max {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-faint);
  }
  .score-label {
    color: var(--text-faint);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 4px;
  }

  /* Grading screen */
  .grading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 64px 24px;
    text-align: center;
  }
  .grading-ring {
    position: relative;
    width: 120px;
    height: 120px;
  }
  .grading-svg {
    width: 120px;
    height: 120px;
    transform: rotate(-90deg);
  }
  .grading-track {
    fill: none;
    stroke: var(--border);
    stroke-width: 5;
  }
  .grading-arc {
    fill: none;
    stroke: var(--primary);
    stroke-width: 5;
    stroke-linecap: round;
    stroke-dasharray: 264;
    stroke-dashoffset: 66;
    animation: arc-spin 1.4s cubic-bezier(.4,0,.2,1) infinite;
    filter: drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 60%, transparent));
  }
  @keyframes arc-spin {
    0%   { stroke-dashoffset: 240; transform: rotate(0deg);   transform-origin: 50% 50%; }
    50%  { stroke-dashoffset: 66; }
    100% { stroke-dashoffset: 240; transform: rotate(360deg); transform-origin: 50% 50%; }
  }
  .grading-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .5; }
  }
  .grading-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .grading-sub {
    font-size: 13px;
    color: var(--text-faint);
  }
  .grading-sub.warn { color: var(--warn); }

  .grading-dots {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .grading-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--primary);
    opacity: 0.3;
    animation: dot-pulse 1.4s ease-in-out infinite;
  }
  .grading-dots span:nth-child(2) { animation-delay: .2s; }
  .grading-dots span:nth-child(3) { animation-delay: .4s; }
  @keyframes dot-pulse {
    0%, 80%, 100% { opacity: .3; transform: scale(1); }
    40%            { opacity: 1;  transform: scale(1.3); }
  }

  .failed-icon {
    color: var(--danger);
    opacity: 0.85;
  }
  .retry-err {
    color: var(--danger);
    font-size: 13px;
    max-width: 360px;
  }
  .btn-spinner {
    width: 14px !important;
    height: 14px !important;
    border-top-color: #fff !important;
    display: inline-block;
    vertical-align: middle;
    margin-right: 4px;
  }
  .answers {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .container-group {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .container-label {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .container-num {
    color: var(--text-faint);
    font-weight: 600;
    font-size: 13px;
  }
  .container-pts {
    font-size: 12px;
    color: var(--text-faint);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    padding: 2px 8px;
  }
  .container-text {
    color: var(--text);
    font-size: 15px;
    line-height: 1.6;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }
  .container-text :global(p) { margin: 0 0 6px; }
  .container-text :global(p:last-child) { margin-bottom: 0; }
  .container-images {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .container-images img {
    max-width: 100%;
    height: auto;
    border-radius: var(--r-md);
    background: #fff;
  }
  .container-subs {
    display: flex;
    flex-direction: column;
    gap: 10px;
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
</style>
