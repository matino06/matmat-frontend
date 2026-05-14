<script>
  import { goto } from "$app/navigation";

  let { exam } = $props();

  function open() {
    goto(`/mock-exam/${exam.examId}`);
  }
</script>

<article class="card exam-card" onclick={open} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && open()}>
  <div class="exam-head">
    <h3 class="exam-title">{exam.title}</h3>
    <div class="exam-sub">{exam.subtitle}</div>
  </div>

  <div class="exam-meta">
    {#if exam.year}<span class="badge mono">{exam.year}</span>{/if}
    {#if exam.term}<span class="badge">{exam.term}</span>{/if}
    {#if exam.durationMinutes}<span class="badge badge-dim mono">{exam.durationMinutes} min</span>{/if}
    {#if exam.totalPoints}<span class="badge badge-dim mono">{exam.totalPoints} bodova</span>{/if}
  </div>

  <div class="exam-cta">
    Otvori
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  </div>
</article>

<style>
  .exam-card {
    padding: 18px 20px;
    cursor: pointer;
    transition: background .12s, border-color .12s, transform .06s;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .exam-card:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .exam-card:active { transform: translateY(1px); }
  .exam-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .exam-sub {
    color: var(--text-faint);
    font-size: 12px;
    margin-top: 2px;
  }
  .exam-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .exam-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--primary);
    font-size: 13px;
    font-weight: 500;
    margin-top: auto;
  }
</style>
