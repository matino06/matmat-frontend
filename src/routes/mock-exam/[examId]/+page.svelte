<script>
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    fetchMockExam,
    submitMockExam,
    buildAnswersPayload,
  } from "$lib/api/mockExam";
  import {
    loadMockExamAnswers,
    saveMockExamAnswers,
    clearMockExamAnswers,
  } from "$lib/utils/mockExamStorage";
  import Question from "$lib/components/mockExam/Question.svelte";
  import QuestionNavigator from "$lib/components/mockExam/QuestionNavigator.svelte";

  const examId = $derived(page.params.examId);

  let exam = $state(null);
  let loading = $state(true);
  let error = $state(null);
  let answers = $state({});
  let activeId = $state(null);

  let submitting = $state(false);
  let submitError = $state(null);

  let observer = null;

  onMount(async () => {
    try {
      exam = await fetchMockExam(examId);
      answers = loadMockExamAnswers(examId);
    } catch (e) {
      error = e?.message ?? String(e);
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    observer?.disconnect();
  });

  function setupObserver() {
    observer?.disconnect();
    if (typeof window === "undefined" || !exam) return;
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) {
          const id = Number(visible[0].target.id.replace("q-", ""));
          if (!Number.isNaN(id)) activeId = id;
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    for (const item of navItems) {
      const el = document.getElementById(`q-${item.questionId}`);
      if (el) observer.observe(el);
    }
  }

  $effect(() => {
    if (exam) {
      requestAnimationFrame(setupObserver);
    }
  });

  function onAnswer(questionId, payload) {
    answers = { ...answers, [questionId]: payload };
    saveMockExamAnswers(examId, answers);
  }

  function resetAll() {
    if (!confirm("Obrisati sve odgovore za ovu maturu?")) return;
    answers = {};
    clearMockExamAnswers(examId);
  }

  const answeredCount = $derived(
    exam ? buildAnswersPayload(exam, answers).length : 0,
  );
  const totalAnswerable = $derived(navItems.length);

  async function handleSubmit() {
    if (!exam || submitting) return;
    if (answeredCount === 0) {
      submitError = "Nema nijednog odgovora za predaju.";
      return;
    }
    const msg =
      `Predati maturu? ${answeredCount} od ${totalAnswerable} pitanja je odgovoreno.\n\n` +
      "Nakon predaje ne možeš mijenjati odgovore. Ocjenjivanje traje 5–30 sekundi.";
    if (!confirm(msg)) return;

    submitError = null;
    submitting = true;
    try {
      const { attemptId } = await submitMockExam(examId, exam, answers);
      clearMockExamAnswers(examId);
      goto(`/mock-exam/attempts/${attemptId}`);
    } catch (e) {
      submitError = e?.message ?? String(e);
      submitting = false;
    }
  }

  const navItems = $derived(buildNavItems(exam?.questions ?? []));

  function buildNavItems(questions) {
    const items = [];
    for (const q of questions) {
      if (q.questionType) {
        items.push({ questionId: q.questionId, label: q.questionNumber });
      }
      if (q.subQuestions?.length) {
        for (const sub of q.subQuestions) {
          if (sub.questionType) {
            items.push({ questionId: sub.questionId, label: sub.questionNumber });
          }
        }
      }
    }
    return items;
  }
</script>

<div class="exam-page">
  {#if loading}
    <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-faint)">
      <div class="spinner"></div>
      Učitavanje mature…
    </div>
  {:else if error}
    <div class="card card-pad" style="color:var(--danger)">
      Greška: {error}
      <div style="margin-top:12px"><button class="btn btn-ghost" onclick={() => goto('/mock-exam')}>Natrag na popis</button></div>
    </div>
  {:else if exam}
    <header class="exam-top">
      <div>
        <button class="btn btn-quiet" onclick={() => goto('/mock-exam')} style="padding:4px 8px;margin-bottom:8px">
          ← Sve mature
        </button>
        <h1>{exam.title}</h1>
        <div class="sub">
          {exam.subtitle} · <span class="mono">{exam.durationMinutes} min</span> · <span class="mono">{exam.totalPoints} bodova</span>
        </div>
      </div>
      <button class="btn btn-ghost" onclick={resetAll}>Obriši odgovore</button>
    </header>

    <div class="exam-layout">
      <div class="exam-questions">
        {#each exam.questions as q (q.questionId)}
          <Question question={q} {answers} {onAnswer} />
        {/each}
      </div>

      <div class="exam-nav">
        <QuestionNavigator items={navItems} {answers} {activeId} />
      </div>
    </div>

    <div class="submit-bar">
      <div class="submit-meta">
        <span class="mono">{answeredCount} / {totalAnswerable}</span> odgovoreno
        {#if submitError}
          <span class="submit-err">· {submitError}</span>
        {/if}
      </div>
      <button
        class="btn btn-primary btn-lg"
        onclick={handleSubmit}
        disabled={submitting || answeredCount === 0}
      >
        {#if submitting}
          <span class="spinner submit-spinner"></span>
          Predaje se…
        {:else}
          Predaj maturu
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .exam-page {
    padding: var(--pad-5) var(--pad-5) var(--pad-6);
    max-width: 1280px;
    margin: 0 auto;
  }
  .exam-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: var(--pad-4);
    flex-wrap: wrap;
  }
  .exam-top h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.015em;
  }
  .exam-top .sub {
    color: var(--text-faint);
    font-size: 13px;
    margin-top: 4px;
  }
  .exam-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 980px) {
    .exam-layout { grid-template-columns: minmax(0, 1fr) 240px; }
  }
  .exam-questions {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .exam-nav { min-width: 0; }
  .submit-bar {
    position: sticky;
    bottom: 12px;
    margin-top: 24px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    flex-wrap: wrap;
  }
  .submit-meta { color: var(--text-dim); font-size: 13px; }
  .submit-err { color: var(--danger); }
  .submit-spinner {
    width: 14px !important;
    height: 14px !important;
    border-top-color: #fff !important;
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
