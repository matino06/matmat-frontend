<script>
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import TaskDifficultySelector from "./TaskDifficultySelector.svelte";
  import { slide } from "svelte/transition";
  import { apiClient } from "$lib/api/apiClient";
  import { parseExplanation } from "$lib/utils/parseExplanationSteps";

  let { task, fetchNewTask } = $props();
  let open = $state("item-1");

  const newSolvedTask = {
    taskId: task.id,
    q: null,
    startTime: new Date().toISOString(),
    endTime: null,
  };

  async function handleTaskSubmit(value) {
    const solvedTask = {
      ...newSolvedTask,
      q: value,
      endTime: new Date().toISOString(),
    };

    const response = await apiClient("/solved-task/set-new", {
      method: "POST",
      body: JSON.stringify(solvedTask),
    });

    if (response.ok) {
      fetchNewTask();
    }
  }

  // Load MathJax
  $effect(() => {
    if (!task) return;

    open = null;
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
    script.async = true;
    script.onload = () => {
      if (window.MathJax) {
        window.MathJax.typesetPromise();
      }
    };
    document.head.appendChild(script);
  });
</script>

<Card.Root class="mb-8 w-xl">
  <Card.Content>
    <div id="mathjax-output">
      {#each parseExplanation(task.taskText1) as paragraph}
        {#if paragraph === ""}
          <p class="my-7"></p>
        {/if}
        <p>{paragraph}</p>
      {/each}
    </div>

    {#if task.imageName}
      <img
        src={`http://localhost:8080/api/image/${step.imageName}`}
        alt="Slika objašnjenja"
        class="m-auto my-2 mb-4 max-w-full rounded"
      />
    {/if}

    {#if task.taskText2 !== ""}
      <div id="mathjax-output">
        {#each parseExplanation(task.taskText2) as paragraph}
          {#if paragraph === ""}
            <p class="my-7"></p>
          {/if}
          <p>{paragraph}</p>
        {/each}
      </div>
    {/if}
  </Card.Content>
  <Card.Footer>
    <Accordion.Root bind:value={open} type="single">
      <Accordion.Item value="item-1">
        <Accordion.Trigger class="flex w-lg items-center justify-center"
        ></Accordion.Trigger>
        <Accordion.Content>
          {#each task.explanationSteps as step}
            {#if task.explanationSteps.length > 1}
              <h4 class="scroll-m-20 text-xl font-semibold tracking-tight">
                {step.stepNumber}.
              </h4>
            {/if}
            <div class="py-4">
              {#each parseExplanation(step.explanation) as paragraph}
                {#if paragraph === ""}
                  <p class="my-7"></p>
                {/if}
                <p>{paragraph}</p>
              {/each}
            </div>
            {#if step.imageName}
              <img
                src={`http://localhost:8080/api/image/${step.imageName}`}
                alt="Slika objašnjenja"
                class="m-auto my-2 mb-4 max-w-full rounded"
              />
            {/if}
          {/each}
          <h3 class="my-2 scroll-m-20 text-2xl tracking-tight">
            Odaberi težinu zadatka
          </h3>
          <TaskDifficultySelector {task} {handleTaskSubmit} />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  </Card.Footer>
</Card.Root>
