<script>
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import TaskDifficultySelector from "./TaskDifficultySelector.svelte";
  import { slide } from "svelte/transition";
  import { apiClient } from "$lib/api/apiClient";
  import { md } from "$lib/utils/markdownRenderer";
  import { onMount } from "svelte";

  let { task, onTaskSolved } = $props();
  let open = $state("item-1");
  let currTempo = $state(null);

  function normalizeMath(text) {
    if (!text) return "";

    // Change every '\' for '\\'
    text = text.replace(/\\/g, "\\\\");

    return text;
  }

  task.explanationSteps.forEach(step => {
    console.log(md.render(normalizeMath(step.explanation)))
  });

  const combinedExplanation = $derived(
    task.explanationSteps
      .map((step) => {
        let markdown = `## ${step.stepNumber}.\n\n${step.explanation}\n\n`;
        if (step.imageName) {
          markdown += `<img src="https://api.matmat.online/api/image/${step.imageName}" alt="Slika objašnjenja" class="m-auto my-2 mb-4 max-w-full rounded" />\n\n`;
        }
        return markdown;
      })
      .join("")
  );

  onMount(async () => {
    const response = await apiClient("/account/tempo", { method: "GET" });
    if (response.ok) {
      currTempo = await response.json();
    }
  });

  const newSolvedTask = {
    taskId: task.id,
    q: null,
    startTime: new Date().toISOString(),
    endTime: null,
  };

  let isSubmitting = $state(false);

  async function handleTaskSubmit(value) {
    if (isSubmitting || value === null) return;

    isSubmitting = true;

    const solvedTask = {
      ...newSolvedTask,
      q: value,
      endTime: new Date().toISOString(),
      device: getDeviceType(),
      tempo: currTempo,
    };

    try {
      const response = await apiClient("/solved-task/set-new", {
        method: "POST",
        body: JSON.stringify(solvedTask),
      });

      if (response.ok) {
        onTaskSolved();
      }
    } catch (error) {
      console.error("Greška pri slanju zadatka:", error);
    } finally {
      isSubmitting = false;
    }
  }

  function getDeviceType() {
  const ua = navigator.userAgent;

  if (/iPad/i.test(ua) || ((/Mac/i.test(ua)) && navigator.maxTouchPoints > 1)) {
    return "ipad";
  }

  if (/iPhone/i.test(ua)) return "iphone";

  if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) return "android-phone";
    return "android-tablet";
  }

  if (/Mac/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(ua)) return "linux";

  return "desktop";
}

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

<Card.Root class="mb-8 w-full max-w-[700px]">
  <Card.Content>
    <div
      id="mathjax-output"
      class="prose prose-sm sm:prose lg:prose-lg text-[0.4rem] sm:text-[0.5rem] md:text-[0.8rem] lg:text-[0.9rem]"
    >
      {@html md.render(normalizeMath(task.taskText1))}
    </div>

    {#if task.imageName}
      <img
        src={`https://api.matmat.online/api/image/${task.imageName}`}
        alt="Slika objašnjenja"
        class="m-auto my-2 mb-4 h-auto max-w-full rounded"
      />
    {/if}
    {#if task.taskText2}
      <div class="prose">
        {@html md.render(normalizeMath(task.taskText2))}
      </div>
    {/if}
  </Card.Content>
  <Card.Footer>
    <Accordion.Root bind:value={open} type="single" class="w-full">
      <Accordion.Item value="item-1">
        <Accordion.Trigger class="flex w-full justify-center" />
        <Accordion.Content>
          <!-- SVI KORACI OBJAŠNJENJA U JEDNOM BLOKU -->
          <div class="prose prose-sm sm:prose lg:prose-lg !max-w-none">
            {@html md.render(normalizeMath(combinedExplanation))}
          </div>

          {#if task.solution}
            <div class="prose prose-sm sm:prose lg:prose-lg !max-w-none mt-4">
              {@html md.render(normalizeMath(task.solution))}
            </div>
          {/if}

          <h4
            class="text-m mt-2 font-semibold tracking-tight sm:text-base md:text-lg lg:text-xl"
          >
            Odredi težinu zadatka
          </h4>
          <TaskDifficultySelector {task} {handleTaskSubmit} />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  </Card.Footer>
</Card.Root>

<style>
  .prose {
    max-width: none;
  }
</style>