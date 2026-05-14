<script>
  import { goto } from "$app/navigation";

  let { attempt } = $props();

  const formattedDate = $derived(formatDate(attempt.submittedAt));

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

  function open() {
    goto(`/mock-exam/attempts/${attempt.attemptId}`);
  }

  const statusClass = $derived(
    attempt.gradingStatus === "DONE"
      ? "status-done"
      : attempt.gradingStatus === "FAILED"
        ? "status-failed"
        : "status-pending",
  );
  const statusLabel = $derived(
    attempt.gradingStatus === "DONE"
      ? "Ispravljeno"
      : attempt.gradingStatus === "FAILED"
        ? "Greška"
        : "Ocjenjuje se",
  );
</script>

<article
  class="card attempt-card"
  onclick={open}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && open()}
>
  <div class="att-top">
    <div class="att-title">{attempt.examTitle}</div>
    <div class="att-sub">
      {#if attempt.examYear}{attempt.examYear}{/if}{#if attempt.examTerm} · {attempt.examTerm}{/if} · {formattedDate}
    </div>
  </div>

  <div class="att-bottom">
    <div class="att-score mono">
      {attempt.totalScore ?? "—"}
      <span class="att-max">/ {attempt.maxScore ?? "—"}</span>
    </div>
    <span class="att-status {statusClass}">{statusLabel}</span>
  </div>
</article>

<style>
  .attempt-card {
    padding: 16px 18px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: background .12s, border-color .12s;
  }
  .attempt-card:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .att-title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .att-sub {
    color: var(--text-faint);
    font-size: 12px;
    margin-top: 2px;
  }
  .att-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .att-score {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .att-max {
    font-size: 14px;
    color: var(--text-faint);
    font-weight: 500;
  }
  .att-status {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--r-pill);
    font-size: 11px;
    font-weight: 500;
    border: 1px solid var(--border);
  }
  .status-done {
    background: color-mix(in oklab, var(--success) 15%, transparent);
    color: var(--success);
    border-color: color-mix(in oklab, var(--success) 35%, transparent);
  }
  .status-failed {
    background: color-mix(in oklab, var(--danger) 15%, transparent);
    color: var(--danger);
    border-color: color-mix(in oklab, var(--danger) 35%, transparent);
  }
  .status-pending {
    background: color-mix(in oklab, var(--warn) 15%, transparent);
    color: var(--warn);
    border-color: color-mix(in oklab, var(--warn) 35%, transparent);
  }
</style>
