<script>
  import { userData } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import Task from "$lib/components/task/Task.svelte";
  import { Upload, CircleCheck, CircleX, Loader } from "@lucide/svelte/icons";

  const ALLOWED_EMAIL = "matino0546@gmail.com";
  const DEFAULT_OBJECTIVE_ID = 0;

  let fileInput = $state(null);
  let isDragging = $state(false);
  let objectiveId = $state(DEFAULT_OBJECTIVE_ID);
  let parsedTasks = $state([]);
  let parseError = $state("");
  let isSubmitting = $state(false);
  let submitResults = $state([]);
  let submitted = $state(false);

  // ── Parser ─────────────────────────────────────────────────────────────────

  function splitTasks(content) {
    const blocks = content.split(/\n={3,}\n/);
    return blocks
      .map((b) => b.trim())
      .filter((b) => b.includes("--- TASK") && b.includes("--- EXPLANATION"));
  }

  function extractTaskText(block) {
    const match = block.match(/---\s*TASK\s*\n([\s\S]*?)(?=\n---\s*EXPLANATION)/);
    if (!match) throw new Error("Could not find TASK section");
    return match[1].trim();
  }

  function extractExplanation(block) {
    const match = block.match(/---\s*EXPLANATION\s*\n([\s\S]*)/);
    if (!match) throw new Error("Could not find EXPLANATION section");
    return match[1].trim();
  }

  function parseFile(content) {
    const blocks = splitTasks(content);
    if (blocks.length === 0) return [];

    return blocks.map((block, i) => ({
      id: `preview-${i}`,
      taskText: extractTaskText(block),
      explanation: extractExplanation(block),
    }));
  }

  // ── File handling ──────────────────────────────────────────────────────────

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

  function onFileInputChange(e) {
    handleFile(e.target.files?.[0]);
  }

  function onDrop(e) {
    isDragging = false;
    handleFile(e.dataTransfer.files?.[0]);
  }

  function onDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave() {
    isDragging = false;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function submitAllTasks() {
    if (isSubmitting || parsedTasks.length === 0) return;

    isSubmitting = true;
    submitted = false;
    submitResults = parsedTasks.map(() => ({ status: "pending" }));

    for (let i = 0; i < parsedTasks.length; i++) {
      const task = parsedTasks[i];

      try {
        const response = await apiClient("/task/create-new", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            taskText: task.taskText,
            learningObjectiveId: String(objectiveId),
            explanation: task.explanation,
          }).toString(),
        });

        if (response.ok) {
          submitResults[i] = { status: "success" };
        } else {
          const text = await response.text();
          submitResults[i] = { status: "error", message: `${response.status}: ${text}` };
        }
      } catch (err) {
        submitResults[i] = { status: "error", message: err.message };
      }
    }

    isSubmitting = false;
    submitted = true;
  }

  const successCount = $derived(submitResults.filter((r) => r.status === "success").length);
  const errorCount = $derived(submitResults.filter((r) => r.status === "error").length);
</script>

{#if userData.user && userData.user.email !== ALLOWED_EMAIL}
  <div class="flex min-h-[60vh] items-center justify-center">
    <p class="text-muted-foreground text-lg">Nemaš pristup ovoj stranici.</p>
  </div>
{:else if userData.user && userData.user.email === ALLOWED_EMAIL}
  <div class="mx-auto max-w-[700px] px-4 py-8 flex flex-col gap-6">

    <div>
      <h1 class="text-2xl font-bold">Kreiraj zadatke</h1>
      <p class="text-muted-foreground text-sm mt-1">
        Upload .txt datoteku, pregledaj parsirane zadatke i pošalji ih na API.
      </p>
    </div>

    <!-- Objective ID -->
    <div class="flex items-center gap-3">
      <label class="text-sm font-medium whitespace-nowrap" for="objective-id">
        Learning Objective ID
      </label>
      <input
        id="objective-id"
        type="number"
        bind:value={objectiveId}
        class="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <!-- File drop zone -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer
        {isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}"
      ondragover={onDragOver}
      ondragleave={onDragLeave}
      ondrop={onDrop}
      onclick={() => fileInput?.click()}
      onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
      role="button"
      tabindex="0"
    >
      <Upload class="text-muted-foreground h-8 w-8" />
      <p class="text-sm text-muted-foreground text-center">
        Povuci .txt datoteku ovdje ili <span class="text-primary font-medium">klikni za odabir</span>
      </p>
      <input
        bind:this={fileInput}
        type="file"
        accept=".txt"
        class="hidden"
        onchange={onFileInputChange}
      />
    </div>

    {#if parseError}
      <p class="text-destructive text-sm">{parseError}</p>
    {/if}

    <!-- Results summary after submit -->
    {#if submitted}
      <div class="rounded-lg border p-4 flex flex-col gap-1">
        <p class="font-semibold text-sm">Rezultati slanja:</p>
        <p class="text-sm text-green-600 dark:text-green-400">
          ✓ {successCount} / {parsedTasks.length} uspješno kreirano
        </p>
        {#if errorCount > 0}
          <p class="text-sm text-destructive">✗ {errorCount} greška</p>
        {/if}
      </div>
    {/if}

    <!-- Task list -->
    {#if parsedTasks.length > 0}
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">
          Pronađeno <span class="text-primary font-bold">{parsedTasks.length}</span> zadataka
        </p>
        <button
          onclick={submitAllTasks}
          disabled={isSubmitting}
          class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isSubmitting}
            <Loader class="h-4 w-4 animate-spin" />
            Šaljem...
          {:else}
            Pošalji sve zadatke
          {/if}
        </button>
      </div>

      <div class="flex flex-col gap-6">
        {#each parsedTasks as task, i (task.id)}
          <div class="relative">
            <!-- Status badge -->
            {#if submitResults[i]}
              <div class="absolute -top-2 -right-2 z-10">
                {#if submitResults[i].status === "success"}
                  <CircleCheck class="h-5 w-5 text-green-500" />
                {:else if submitResults[i].status === "error"}
                  <div class="relative group">
                    <CircleX class="h-5 w-5 text-destructive" />
                    <div class="absolute right-0 top-6 hidden group-hover:block w-64 rounded-md bg-popover border border-border px-3 py-2 text-xs text-muted-foreground shadow-md z-20">
                      {submitResults[i].message}
                    </div>
                  </div>
                {:else if submitResults[i].status === "pending"}
                  <Loader class="h-5 w-5 animate-spin text-muted-foreground" />
                {/if}
              </div>
            {/if}

            <div class="text-xs text-muted-foreground mb-1 font-mono">
              Zadatak {i + 1}
            </div>
            <Task {task} onTaskSolved={() => {}} />
          </div>
        {/each}
      </div>

      <!-- Submit button at bottom too -->
      <div class="flex justify-end">
        <button
          onclick={submitAllTasks}
          disabled={isSubmitting}
          class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isSubmitting}
            <Loader class="h-4 w-4 animate-spin" />
            Šaljem...
          {:else}
            Pošalji sve zadatke
          {/if}
        </button>
      </div>
    {/if}
  </div>
{/if}
