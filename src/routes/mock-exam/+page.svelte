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
      <div class="sub">Simuliraj pravi ispit i vidi gdje stojiš prije prave mature.</div>
    </div>
  </div>

  <div class="how-it-works">
    <div class="hiw-step card">
      <div class="hiw-num">01</div>
      <div class="hiw-title">Odaberi ispit</div>
      <div class="hiw-desc">Pravi zadaci iz prethodnih godina državne mature</div>
    </div>
    <div class="hiw-arrow" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </div>
    <div class="hiw-step card">
      <div class="hiw-num">02</div>
      <div class="hiw-title">Rješavaj pitanja</div>
      <div class="hiw-desc">Jedno po jedno — preskači i vraćaj se slobodno</div>
    </div>
    <div class="hiw-arrow" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </div>
    <div class="hiw-step card">
      <div class="hiw-num">03</div>
      <div class="hiw-title">Vidi rezultat</div>
      <div class="hiw-desc">Bodovi, točni odgovori i pregled svake greške</div>
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
    background: var(--danger);
    color: var(--bg);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .how-it-works {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
  }
  .hiw-step {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .hiw-num {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }
  .hiw-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .hiw-desc {
    font-size: 12px;
    color: var(--text-faint);
    line-height: 1.5;
  }
  .hiw-arrow {
    color: var(--text-faint);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  @media (max-width: 600px) {
    .how-it-works {
      grid-template-columns: 1fr;
    }
    .hiw-arrow { display: none; }
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
