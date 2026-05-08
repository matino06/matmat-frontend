<script>
  import { tick } from "svelte";
  import { userData } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import { md } from "$lib/utils/markdownRenderer";

  let fields = $state([]);
  let subfields = $state([]);
  let objectives = $state([]);
  let tasks = $state([]);

  let selectedFieldId = $state("");
  let selectedSubfieldId = $state("");
  let selectedObjectiveId = $state("");
  let selectedTaskId = $state("");

  let selectedField = $derived(fields.find(f => f.id == selectedFieldId) ?? null);
  let selectedSubfield = $derived(subfields.find(s => s.id == selectedSubfieldId) ?? null);
  let selectedObjective = $derived(objectives.find(o => o.objectiveId == selectedObjectiveId) ?? null);
  let selectedTask = $derived(tasks.find(t => t.id == selectedTaskId) ?? null);

  let revealed = $state(false);
  let loadingFields = $state(false);
  let loadingSubfields = $state(false);
  let loadingObjectives = $state(false);
  let loadingTasks = $state(false);

  let isAdmin = $derived(userData.isAdmin);

  async function fetchFields() {
    loadingFields = true;
    try {
      const r = await apiClient("/field-of-study", { method: "GET" });
      if (r.ok) fields = await r.json();
    } finally {
      loadingFields = false;
    }
  }

  async function fetchSubfields(fieldId) {
    loadingSubfields = true;
    subfields = [];
    objectives = [];
    tasks = [];
    selectedSubfieldId = "";
    selectedObjectiveId = "";
    selectedTaskId = "";
    try {
      const r = await apiClient(`/subfield-of-study/${fieldId}`, { method: "GET" });
      if (r.ok) subfields = await r.json();
    } finally {
      loadingSubfields = false;
    }
  }

  async function fetchObjectives(subfieldId) {
    loadingObjectives = true;
    objectives = [];
    tasks = [];
    selectedObjectiveId = "";
    selectedTaskId = "";
    try {
      const r = await apiClient(
        `/learning-objective/get-objectives-with-task?subfieldId=${subfieldId}`,
        { method: "GET" }
      );
      if (r.ok) objectives = await r.json();
    } finally {
      loadingObjectives = false;
    }
  }

  async function fetchTasks(objectiveId) {
    loadingTasks = true;
    tasks = [];
    selectedTaskId = "";
    try {
      const r = await apiClient(
        `/task/get-all-tasks?objectiveId=${objectiveId}`,
        { method: "GET" }
      );
      if (r.ok) tasks = await r.json();
      console.log("Fetched tasks:", tasks);
    } finally {
      loadingTasks = false;
    }
  }

  $effect(() => {
    if (isAdmin && fields.length === 0) fetchFields();
  });

  $effect(() => {
    if (selectedFieldId) fetchSubfields(selectedFieldId);
  });

  $effect(() => {
    if (selectedSubfieldId) fetchObjectives(selectedSubfieldId);
  });

  $effect(() => {
    if (selectedObjectiveId) fetchTasks(selectedObjectiveId);
  });

  $effect(() => {
    if (selectedTask) {
      revealed = false;
      tick().then(() => {
        if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
      });
    }
  });

  $effect(() => {
    if (revealed) {
      tick().then(() => {
        if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
      });
    }
  });

  function normalizeMath(t) {
    if (!t) return "";
    return t.replace(/\\/g, "\\\\");
  }

  function renderSolution(t) {
    if (!t) return "";
    return md.render(normalizeMath(t));
  }
</script>

<div class="page">
  {#if !userData.user}
    <div style="padding:80px 20px;text-align:center;color:var(--text-faint)">Učitavanje…</div>
  {:else if !isAdmin}
    <div class="card card-pad" style="text-align:center;padding:60px 24px">
      <div style="font-size:42px;margin-bottom:10px">🔒</div>
      <h2 style="margin:0 0 6px;font-size:18px;font-weight:600">Pristup ograničen</h2>
      <p style="color:var(--text-dim);margin:0">Ova stranica dostupna je samo administratorima.</p>
    </div>
  {:else}
    <div class="zadaci-head" style="margin-bottom:18px">
      <div>
        <h1>Pregled svih zadataka</h1>
        <div class="sub">Admin · Prelistaj zadatke po cjelinama i ishodima</div>
      </div>
    </div>

    <div class="card card-pad">
      <div class="filters">
        <!-- Field -->
        <div class="filter">
          <label>Područje</label>
          <select bind:value={selectedFieldId} disabled={loadingFields}>
            <option value="" disabled>{loadingFields ? "Učitavanje…" : "Odaberi područje"}</option>
            {#each fields as f (f.id)}
              <option value={f.id}>{f.fieldName}</option>
            {/each}
          </select>
        </div>

        <!-- Subfield -->
        {#if selectedField}
          <div class="filter">
            <label>Cjelina</label>
            <select bind:value={selectedSubfieldId} disabled={loadingSubfields || subfields.length === 0}>
              <option value="" disabled>{loadingSubfields ? "Učitavanje…" : "Odaberi cjelinu"}</option>
              {#each subfields as s (s.id)}
                <option value={s.id}>{s.subfieldName}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Objective -->
        {#if selectedSubfield}
          <div class="filter">
            <label>Ishod</label>
            <select bind:value={selectedObjectiveId} disabled={loadingObjectives || objectives.length === 0}>
              <option value="" disabled>{loadingObjectives ? "Učitavanje…" : "Odaberi ishod"}</option>
              {#each objectives as o (o.objectiveId)}
                <option value={o.objectiveId}>{o.objectiveName}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Task -->
        {#if selectedObjective}
          <div class="filter">
            <label>Zadatak {tasks.length > 0 ? `(${tasks.length})` : ''}</label>
            <select bind:value={selectedTaskId} disabled={loadingTasks || tasks.length === 0}>
              <option value="" disabled>{loadingTasks ? "Učitavanje…" : "Odaberi zadatak"}</option>
              {#each tasks as t, i (t.id)}
                <option value={t.id}>#{t.id} — Zadatak {i + 1}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    </div>

    {#if selectedTask}
      <article class="card task-card" style="margin-top:16px">
        <div class="task-meta">
          <span class="badge mono">#{selectedTask.id ?? '—'}</span>
          {#if selectedField}<span class="badge badge-dim">{selectedField.fieldName}</span>{/if}
          {#if selectedSubfield}<span class="badge badge-dim">{selectedSubfield.subfieldName}</span>{/if}
        </div>

        <div
          id="mathjax-output"
          class="prose prose-sm lg:prose-lg !max-w-none dark:prose-invert"
        >
          {@html selectedTask.taskText ?? ''}
        </div>

        {#if !revealed}
          <div style="margin-top:24px;display:flex;gap:10px;align-items:center">
            <button class="btn btn-primary btn-lg" onclick={() => revealed = true}>
              Pokaži rješenje
            </button>
          </div>
        {:else}
          <div class="solution">
            <div class="solution-header"><h3>Rješenje</h3></div>
            <div class="prose !max-w-none dark:prose-invert">
              {#if selectedTask.explanation}
                {@html renderSolution(selectedTask.explanation)}
              {:else if selectedTask.explanationSteps?.length}
                {#each [...selectedTask.explanationSteps].sort((a, b) => a.stepNumber - b.stepNumber) as step (step.stepNumber)}
                  <div style="margin-bottom: 12px">
                    <div style="font-weight:600;font-size:13px;color:var(--text-dim);margin-bottom:4px">
                      Korak {step.stepNumber}
                    </div>
                    {@html renderSolution(step.stepText ?? step.text ?? '')}
                  </div>
                {/each}
              {:else}
                <div style="color:var(--text-faint)">Nema rješenja.</div>
              {/if}
            </div>
          </div>
        {/if}
      </article>
    {:else if selectedObjective && tasks.length === 0 && !loadingTasks}
      <div class="card card-pad" style="margin-top:16px;text-align:center;color:var(--text-faint)">
        Nema zadataka za ovaj ishod.
      </div>
    {/if}
  {/if}
</div>

<style>
  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
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
  .filter select {
    padding: 9px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition: border-color 0.12s;
  }
  .filter select:hover:not(:disabled) {
    border-color: var(--border-strong);
  }
  .filter select:focus {
    border-color: var(--primary);
  }
  .filter select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
