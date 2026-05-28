<script>
  import { onMount } from "svelte";
  import {
    fetchAvailableMockExams,
    fetchMockExamAttempts,
  } from "$lib/api/mockExam";
  import ExamCard from "$lib/components/mockExam/ExamCard.svelte";
  import AttemptCard from "$lib/components/mockExam/AttemptCard.svelte";

  let activeTab = $state("available");

  let exams = $state([]);
  let examsLoading = $state(true);
  let examsError = $state(null);

  let attempts = $state([]);
  let attemptsLoading = $state(false);
  let attemptsLoaded = $state(false);
  let attemptsError = $state(null);

  onMount(async () => {
    try {
      exams = await fetchAvailableMockExams();
    } catch (e) {
      examsError = e?.message ?? String(e);
    } finally {
      examsLoading = false;
    }
  });

  async function loadAttempts() {
    if (attemptsLoaded || attemptsLoading) return;
    attemptsLoading = true;
    try {
      attempts = await fetchMockExamAttempts();
      attemptsLoaded = true;
    } catch (e) {
      attemptsError = e?.message ?? String(e);
    } finally {
      attemptsLoading = false;
    }
  }

  function selectTab(tab) {
    activeTab = tab;
    if (tab === "attempts") loadAttempts();
  }
</script>

<div class="page">
  <div class="zadaci-head">
    <div>
      <h1>Probna matura <span class="beta-pill">Beta</span></h1>
      <div class="sub">Odaberi probnu maturu i riješi je u stilu prave državne mature.</div>
    </div>
  </div>

  <div class="seg" style="margin-bottom: 18px">
    <button
      type="button"
      class="seg-item {activeTab === 'available' ? 'active' : ''}"
      onclick={() => selectTab("available")}
    >Dostupne mature</button>
    <button
      type="button"
      class="seg-item {activeTab === 'attempts' ? 'active' : ''}"
      onclick={() => selectTab("attempts")}
    >Moji rezultati</button>
  </div>

  {#if activeTab === "available"}
    {#if examsLoading}
      <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-faint)">
        <div class="spinner"></div>
        Učitavanje matura…
      </div>
    {:else if examsError}
      <div class="card card-pad" style="color:var(--danger)">Greška: {examsError}</div>
    {:else if exams.length === 0}
      <div class="card card-pad" style="color:var(--text-faint)">
        Trenutno nema dostupnih probnih matura.
      </div>
    {:else}
      <div class="exam-grid">
        {#each exams as exam (exam.examId)}
          <ExamCard {exam} />
        {/each}
      </div>
    {/if}
  {:else}
    {#if attemptsLoading}
      <div class="card card-pad" style="display:flex;align-items:center;gap:12px;color:var(--text-faint)">
        <div class="spinner"></div>
        Učitavanje rezultata…
      </div>
    {:else if attemptsError}
      <div class="card card-pad" style="color:var(--danger)">Greška: {attemptsError}</div>
    {:else if attempts.length === 0}
      <div class="card card-pad" style="color:var(--text-faint)">
        Još nemaš nijednu predaju. Otvori neku maturu iz druge kartice i predaj odgovore.
      </div>
    {:else}
      <div class="exam-grid">
        {#each attempts as attempt (attempt.attemptId)}
          <AttemptCard {attempt} />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .beta-pill {
    display: inline-block;
    vertical-align: middle;
    margin-left: 8px;
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--bg-elev);
    color: var(--text-faint);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .exam-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  @media (min-width: 720px) {
    .exam-grid { grid-template-columns: 1fr 1fr; }
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
