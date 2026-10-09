<script>
  import { onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { userData, verifyIsAdmin } from "$lib/store/user.svelte";
  import { fetchAdminMockExam } from "$lib/api/mockExam";
  import EditableQuestion from "$lib/components/mockExam/EditableQuestion.svelte";
  import QuestionNavigator from "$lib/components/mockExam/QuestionNavigator.svelte";

  const examId = $derived(page.params.examId);

  let exam = $state(null);
  let loading = $state(false);
  let error = $state(null);
  let activeId = $state(null);

  let observer = null;

  // ── Admin gate ──────────────────────────────────────────────────────────
  $effect(() => {
    if (userData.user && !userData.adminChecked) verifyIsAdmin();
  });

  $effect(() => {
    if (userData.isAdmin && !exam && !loading && !error) load();
  });

  async function load() {
    loading = true;
    error = null;
    try {
      exam = await fetchAdminMockExam(examId);
    } catch (e) {
      error = e?.message ?? String(e);
    }
    loading = false;
  }

  onDestroy(() => {
    observer?.disconnect();
  });

  // Same scroll-spy as the exam page, so the navigator highlights the question in view.
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

  // Writes the saved fields back into the tree; sub-questions and images stay as loaded.
  function onSaved(updated) {
    const visit = (questions) => {
      for (const q of questions) {
        if (q.questionId === updated.questionId) {
          for (const [key, value] of Object.entries(updated)) {
            if (key !== "subQuestions" && key !== "images") q[key] = value;
          }
          return true;
        }
        if (q.subQuestions?.length && visit(q.subQuestions)) return true;
      }
      return false;
    };
    visit(exam.questions);
  }

  const navItems = $derived(buildNavItems(exam?.questions ?? []));

  // Unlike the exam page, container questions (no type) get a nav entry too —
  // their text is editable as well.
  function buildNavItems(questions) {
    const items = [];
    for (const q of questions) {
      items.push({ questionId: q.questionId, label: q.questionNumber });
      for (const sub of q.subQuestions ?? []) {
        items.push({ questionId: sub.questionId, label: sub.questionNumber });
      }
    }
    return items;
  }
</script>

<div class="exam-page">
  {#if userData.loading || (userData.user && !userData.adminChecked)}
    <div style="padding:80px 20px;text-align:center;color:var(--text-faint)">Učitavanje…</div>
  {:else if !userData.isAdmin}
    <div class="card card-pad" style="text-align:center;padding:60px 24px">
      <div style="font-size:42px;margin-bottom:10px">🔒</div>
      <h2 style="margin:0 0 6px;font-size:18px;font-weight:600">Pristup ograničen</h2>
      <p style="color:var(--text-dim);margin:0">Ova stranica dostupna je samo administratorima.</p>
    </div>
  {:else if error}
    <div class="card card-pad" style="color:var(--danger)">
      Greška: {error}
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-ghost" onclick={load}>Pokušaj ponovno</button>
        <button class="btn btn-ghost" onclick={() => goto('/mock-exam')}>Natrag na popis</button>
      </div>
    </div>
  {:else if !exam}
    <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-faint)">
      <div class="spinner"></div>
      Učitavanje mature…
    </div>
  {:else}
    <header class="exam-top">
      <div>
        <button class="btn btn-quiet" onclick={() => goto('/mock-exam')} style="padding:4px 8px;margin-bottom:8px">
          ← Sve mature
        </button>
        <h1>
          {exam.title}
          <span class="edit-pill">Uređivanje</span>
          {#if !exam.isPublished}<span class="badge">Neobjavljeno</span>{/if}
        </h1>
        <div class="sub">
          {exam.subtitle} · <span class="mono">{exam.durationMinutes} min</span> · <span class="mono">{exam.totalPoints} bodova</span>
        </div>
      </div>
      {#if exam.isPublished}
        <button class="btn btn-ghost" onclick={() => goto(`/mock-exam/${exam.examId}`)}>Otvori kao učenik</button>
      {/if}
    </header>

    <div class="exam-layout">
      <div class="exam-questions">
        {#each exam.questions as q (q.questionId)}
          <EditableQuestion question={q} {onSaved} />
        {/each}
      </div>

      <div class="exam-nav">
        <QuestionNavigator items={navItems} {activeId} showCount={false} />
      </div>
    </div>
  {/if}
</div>

<style>
  .exam-page {
    padding: var(--pad-5) var(--pad-5) 40px;
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
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  .edit-pill {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: var(--r-pill);
    background: var(--primary-dim);
    color: var(--primary);
    border: 1px solid var(--primary-border);
    letter-spacing: 0;
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
  @media (max-width: 767px) {
    .exam-page { padding: var(--pad-3) var(--pad-3) 40px; }
  }
  .exam-questions {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .exam-nav { min-width: 0; }
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
