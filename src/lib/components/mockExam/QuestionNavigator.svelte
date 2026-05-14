<script>
  let { items = [], answers = {}, activeId = null } = $props();

  function jump(questionId) {
    const el = document.getElementById(`q-${questionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function isAnswered(id) {
    const a = answers[id]?.value;
    return a !== null && a !== undefined && a !== "";
  }

  const answeredCount = $derived(items.filter((i) => isAnswered(i.questionId)).length);
</script>

<aside class="qn">
  <div class="qn-head">
    <span class="qn-title">Pitanja</span>
    <span class="qn-count mono">{answeredCount}/{items.length}</span>
  </div>
  <div class="qn-grid">
    {#each items as item (item.questionId)}
      <button
        type="button"
        class="qn-item {isAnswered(item.questionId) ? 'done' : ''} {activeId === item.questionId ? 'active' : ''}"
        onclick={() => jump(item.questionId)}
        title={item.label}
      >
        {item.label}
      </button>
    {/each}
  </div>
</aside>

<style>
  .qn {
    position: sticky;
    top: 16px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .qn-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
  }
  .qn-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-faint);
    font-weight: 500;
  }
  .qn-count {
    font-size: 12px;
    color: var(--text-dim);
  }
  .qn-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  }
  .qn-item {
    padding: 6px 4px;
    border-radius: var(--r-sm);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
    transition: background .1s, border-color .1s, color .1s;
  }
  .qn-item:hover {
    background: var(--bg-hover);
    color: var(--text);
  }
  .qn-item.done {
    background: var(--primary-dim);
    border-color: var(--primary-border);
    color: var(--primary);
  }
  .qn-item.active {
    border-color: var(--primary);
    color: var(--text);
  }
</style>
