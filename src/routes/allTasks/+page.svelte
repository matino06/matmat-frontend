<script>
  import { userData } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";
  import * as Select from "$lib/components/ui/select/index.js";
  import Task from "$lib/components/task/Task.svelte";

  let fields = $state([]);
  let selectedField = $state(null);
  let subfields = $state([]);
  let selectedSubfield = $state(null);
  let objectives = $state([]);
  let selectedObjective = $state(null);
  let tasks = $state([]);
  let selectedTask = $state(null);

  async function fetchFields() {
    const response = await apiClient("/field-of-study", { method: "GET" });
    fields = await response.json();
  }

  async function fetchSubfields() {
    const response = await apiClient(`/subfield-of-study/${selectedField.id}`, {
      method: "GET",
    });
    subfields = await response.json();
  }

  async function fetchObjectives() {
    const response = await apiClient(
      `/learning-objective/get-objectives-with-task?subfieldId=${selectedSubfield.id}`,
      {
        method: "GET",
      },
    );
    objectives = await response.json();
  }

  async function fetchAllTasks() {
    const response = await apiClient(
      `/task/get-all-tasks?objectiveId=${selectedObjective.objectiveId}`,
      {
        method: "GET",
      },
    );
    tasks = await response.json();
  }

  function handleFieldChange(value) {
    selectedField = fields.find((f) => f.id === value);
  }

  function handleSubfieldChange(value) {
    selectedSubfield = subfields.find((s) => s.id === value);
  }

  function handleObjectiveChange(value) {
    selectedObjective = objectives.find((o) => o.objectiveId === value);
  }

  function handleTaskChange(value) {
    selectedTask = tasks.find((t) => t.id === value);
    selectedTask.explanationSteps.sort((a, b) => a.stepNumber - b.stepNumber);
  }

  $effect(() => {
    if (userData.user && userData.user.email === "matino0546@gmail.com") {
      fetchFields();
    }
  });

  $effect(() => {
    if (!selectedField) return;
    fetchSubfields();
  });

  $effect(() => {
    if (!selectedSubfield) return;
    fetchObjectives();
  });

  $effect(() => {
    if (!selectedObjective) return;
    fetchAllTasks();
  });
</script>

{#if userData.user && userData.user.email !== "matino0546@gmail.com"}
  <h1>Nemaš pristup ovoj stranici :(</h1>
{:else}
  <div class="mt-10 flex w-full flex-col items-center justify-center">
    <Select.Root
      class="flex items-center justify-center"
      type="single"
      onValueChange={handleFieldChange}
    >
      <Select.Label class="w-xl pr-2 text-left">Field</Select.Label>
      <Select.Trigger class="w-xl">
        {selectedField ? selectedField.fieldName : "Odaberi field"}
      </Select.Trigger>
      <Select.Content>
        {#each fields as field}
          <Select.Item value={field.id}>{field.fieldName}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>

    {#if selectedField}
      <Select.Root
        class="flex items-center justify-center"
        type="single"
        onValueChange={handleSubfieldChange}
      >
        <Select.Label class="w-xl pr-2 text-left">Subfield</Select.Label>
        <Select.Trigger class="w-xl">
          {selectedSubfield ? selectedSubfield.subfieldName : "Odaberi field"}
        </Select.Trigger>
        <Select.Content>
          {#each subfields as subfield}
            <Select.Item value={subfield.id}
              >{subfield.subfieldName}</Select.Item
            >
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}

    {#if selectedSubfield}
      <Select.Root
        class="flex items-center justify-center"
        type="single"
        onValueChange={handleObjectiveChange}
      >
        <Select.Label class="w-xl pr-2 text-left">Objective</Select.Label>
        <Select.Trigger class="w-xl">
          {selectedObjective
            ? selectedObjective.objectiveName
            : "Odaberi field"}
        </Select.Trigger>
        <Select.Content>
          {#each objectives as objective}
            <Select.Item value={objective.objectiveId}
              >{objective.objectiveName}</Select.Item
            >
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}

    {#if selectedObjective}
      <Select.Root
        class="flex items-center justify-center"
        type="single"
        onValueChange={handleTaskChange}
      >
        <Select.Label class="w-xl pr-2 text-left">Task</Select.Label>
        <Select.Trigger class="w-xl">
          {selectedTask ? selectedTask.id : "Odaberi task"}
        </Select.Trigger>
        <Select.Content>
          {#each tasks as task}
            <Select.Item value={task.id}>{task.id}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}

    {#if selectedTask}
      <div class="mt-10">
        <Task task={selectedTask} />
      </div>
    {/if}
  </div>
{/if}
