<script>
  import { tick } from "svelte";
  import { userData, verifyIsAdmin } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import { md } from "$lib/utils/markdownRenderer";

  let fileInput = $state(null);
  let isDragging = $state(false);
  let objectiveId = $state(0);
  let parsedTasks = $state([]);
  let parseError = $state("");
  let isSubmitting = $state(false);
  let submitResults = $state([]);
  let submitted = $state(false);

  // Verify admin via backend once auth resolves (also covers page reload).
  $effect(() => {
    if (userData.user && !userData.adminChecked) verifyIsAdmin();
  });

  // ── Parser ──────────────────────────────────────────────────────────────

  function splitTasks(content) {
    return content
      .split(/\n={3,}\n/)
      .map(b => b.trim())
      .filter(b => b.includes("--- TASK") && b.includes("--- EXPLANATION"));
  }

  function extractTaskText(block) {
    const m = block.match(/---\s*TASK\s*\n([\s\S]*?)(?=\n---\s*EXPLANATION)/);
    if (!m) throw new Error("Could not find TASK section");
    return m[1].trim();
  }

  function extractExplanation(block) {
    const m = block.match(/---\s*EXPLANATION\s*\n([\s\S]*)/);
    if (!m) throw new Error("Could not find EXPLANATION section");
    return m[1].trim();
  }

  function parseFile(content) {
    return splitTasks(content).map((block, i) => ({
      id: `preview-${i}`,
      taskText: extractTaskText(block),
      explanation: extractExplanation(block),
    }));
  }

  function normalizeMath(t) {
    if (!t) return "";
    return t.replace(/\\/g, "\\\\");
  }

  // ── File handling ───────────────────────────────────────────────────────

  function handleFile(file) {
    parseError = "";
    parsedTasks = [];
    submitResults = [];
    submitted = false;

    if (!file || !file.name.endsWith(".txt")) {
      parseError = "Molim te odaberi .txt datoteku.";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        parsedTasks = parseFile(e.target.result);
        if (parsedTasks.length === 0) {
          parseError = "Nisu pronađeni zadaci u datoteci. Provjeri format.";
        }
      } catch (err) {
        parseError = `Greška pri parsiranju: ${err.message}`;
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function onFileInputChange(e) { handleFile(e.target.files?.[0]); }
  function onDrop(e) { e.preventDefault(); isDragging = false; handleFile(e.dataTransfer.files?.[0]); }
  function onDragOver(e) { e.preventDefault(); isDragging = true; }
  function onDragLeave() { isDragging = false; }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function submitAllTasks() {
    if (isSubmitting || parsedTasks.length === 0) return;

    isSubmitting = true;
    submitted = false;
    submitResults = parsedTasks.map(() => ({ status: "pending" }));

    for (let i = 0; i < parsedTasks.length; i++) {
      const task = parsedTasks[i];
      try {
        const r = await apiClient("/task/create-new", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            taskText: task.taskText,
            learningObjectiveId: String(objectiveId),
            explanation: task.explanation,
          }).toString(),
        });
        if (r.ok) {
          submitResults[i] = { status: "success" };
        } else {
          const text = await r.text();
          submitResults[i] = { status: "error", message: `${r.status}: ${text}` };
        }
      } catch (err) {
        submitResults[i] = { status: "error", message: err.message };
      }
    }

    isSubmitting = false;
    submitted = true;
  }

  let successCount = $derived(submitResults.filter(r => r.status === "success").length);
  let errorCount = $derived(submitResults.filter(r => r.status === "error").length);

  // Re-typeset MathJax when parsed tasks change
  $effect(() => {
    if (parsedTasks.length > 0) {
      tick().then(() => {
        if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
      });
    }
  });
</script>

<div class="page">
  {#if userData.loading || (userData.user && !userData.adminChecked)}
    <div style="padding:80px 20px;text-align:center;color:var(--text-faint)">Učitavanje…</div>
  {:else if !userData.isAdmin}
    <div class="card card-pad" style="text-align:center;padding:60px 24px">
      <div style="font-size:42px;margin-bottom:10px">🔒</div>
      <h2 style="margin:0 0 6px;font-size:18px;font-weight:600">Pristup ograničen</h2>
      <p style="color:var(--text-dim);margin:0">Ova stranica dostupna je samo administratorima.</p>
    </div>
  {:else}
    <div class="zadaci-head" style="margin-bottom:18px">
      <div>
        <h1>Kreiraj zadatke</h1>
        <div class="sub">Admin · Upload .txt datoteke, parsiraj i pošalji zadatke na backend</div>
      </div>
    </div>

    <!-- Config + drop zone -->
    <div class="card card-pad">
      <div class="config-row">
        <div class="filter">
          <label for="objective-id">Learning Objective ID</label>
          <input
            id="objective-id"
            type="number"
            bind:value={objectiveId}
          />
        </div>
        <div class="filter format-hint">
          <label>Format datoteke</label>
          <code>--- TASK<br/>… tekst …<br/>--- EXPLANATION<br/>… rješenje …<br/>===<br/>(idući zadatak)</code>
        </div>
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="dropzone {isDragging ? 'dragging' : ''}"
        ondragover={onDragOver}
        ondragleave={onDragLeave}
        ondrop={onDrop}
        onclick={() => fileInput?.click()}
        onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
        role="button"
        tabindex="0"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <div class="dz-text">
          Povuci <b>.txt</b> datoteku ovdje ili
          <span class="dz-link">klikni za odabir</span>
        </div>
        <input
          bind:this={fileInput}
          type="file"
          accept=".txt"
          style="display:none"
          onchange={onFileInputChange}
        />
      </div>

      {#if parseError}
        <div class="error-msg">{parseError}</div>
      {/if}
    </div>

    <!-- Results summary -->
    {#if submitted}
      <div class="card card-pad" style="margin-top:14px">
        <div style="font-weight:600;margin-bottom:6px">Rezultati slanja</div>
        <div style="font-size:13px;color:var(--success)">
          ✓ {successCount} / {parsedTasks.length} uspješno kreirano
        </div>
        {#if errorCount > 0}
          <div style="font-size:13px;color:var(--danger, #ef4444);margin-top:2px">
            ✗ {errorCount} {errorCount === 1 ? 'greška' : 'grešaka'}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Task list -->
    {#if parsedTasks.length > 0}
      <div class="list-head">
        <div class="list-head-text">
          Pronađeno <b class="mono" style="color:var(--primary)">{parsedTasks.length}</b>
          {parsedTasks.length === 1 ? 'zadatak' : 'zadataka'}
        </div>
        <button
          class="btn btn-primary"
          onclick={submitAllTasks}
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            <span class="mini-spinner"></span> Šaljem…
          {:else}
            Pošalji sve zadatke
          {/if}
        </button>
      </div>

      <div class="task-stack">
        {#each parsedTasks as task, i (task.id)}
          {@const result = submitResults[i]}
          <article class="card task-card preview-card">
            <div class="task-meta">
              <span class="badge mono">Zadatak {i + 1}</span>
              {#if result?.status === "success"}
                <span class="status-pill success">✓ Kreirano</span>
              {:else if result?.status === "error"}
                <span class="status-pill error" title={result.message}>✗ Greška</span>
              {:else if result?.status === "pending"}
                <span class="status-pill pending"><span class="mini-spinner"></span> Šaljem…</span>
              {/if}
            </div>

            <div class="prose prose-sm lg:prose-lg !max-w-none dark:prose-invert">
              {@html md.render(normalizeMath(task.taskText))}
            </div>

            <div class="solution">
              <div class="solution-header"><h3>Rješenje</h3></div>
              <div class="prose !max-w-none dark:prose-invert">
                {@html md.render(normalizeMath(task.explanation))}
              </div>
            </div>

            {#if result?.status === "error"}
              <div class="error-msg" style="margin-top:10px">{result.message}</div>
            {/if}
          </article>
        {/each}
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:14px">
        <button
          class="btn btn-primary"
          onclick={submitAllTasks}
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            <span class="mini-spinner"></span> Šaljem…
          {:else}
            Pošalji sve zadatke
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .config-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 18px;
    margin-bottom: 14px;
    align-items: flex-start;
  }
  .filter {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .filter label {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .filter input[type="number"] {
    width: 130px;
    padding: 9px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-mono);
    outline: none;
  }
  .filter input[type="number"]:focus { border-color: var(--primary); }

  .format-hint code {
    display: block;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 8px 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.55;
  }

  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 40px 20px;
    border: 2px dashed var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    color: var(--text-faint);
    cursor: pointer;
    transition: border-color .15s, background .15s, color .15s;
  }
  .dropzone:hover { border-color: var(--primary); color: var(--text-dim); }
  .dropzone.dragging {
    border-color: var(--primary);
    background: var(--primary-dim);
    color: var(--primary);
  }
  .dz-text { font-size: 13px; text-align: center; }
  .dz-link { color: var(--primary); font-weight: 500; }

  .error-msg {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: oklch(0.55 0.2 25 / 0.1);
    border: 1px solid oklch(0.55 0.2 25 / 0.3);
    color: oklch(0.7 0.2 25);
    font-size: 12px;
    font-family: var(--font-mono);
    word-break: break-word;
  }

  .list-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 22px 0 12px;
  }
  .list-head-text { font-size: 14px; }

  .task-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .preview-card .task-meta { gap: 8px; align-items: center; }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: var(--r-pill);
    font-size: 11px;
    font-weight: 500;
    margin-left: auto;
  }
  .status-pill.success {
    background: oklch(0.55 0.18 160 / 0.15);
    color: var(--success);
    border: 1px solid oklch(0.55 0.18 160 / 0.35);
  }
  .status-pill.error {
    background: oklch(0.55 0.2 25 / 0.15);
    color: oklch(0.7 0.2 25);
    border: 1px solid oklch(0.55 0.2 25 / 0.35);
    cursor: help;
  }
  .status-pill.pending {
    background: var(--bg-elev-2);
    color: var(--text-faint);
    border: 1px solid var(--border);
  }

  .mini-spinner {
    display: inline-block;
    width: 11px; height: 11px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .config-row { grid-template-columns: 1fr; }
  }
</style>
