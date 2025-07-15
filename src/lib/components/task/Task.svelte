<script>
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import TaskDifficultySelector from "./TaskDifficultySelector.svelte";
  import { onMount } from "svelte";

  let { task } = $props();

  onMount(() => {
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
      {@html task.taskText1}
    </div>
  </Card.Content>
  <Card.Footer>
    <Accordion.Root type="single">
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
              {@html step.explanation}
            </div>
            {#if step.imageName}
              <img
                src={`http://localhost:8080/api/image/${step.imageName}`}
                alt="Slika objašnjenja"
                class="my-2 mb-4 max-w-full rounded"
              />
            {/if}
          {/each}
          <h3 class="my-2 scroll-m-20 text-2xl tracking-tight">
            Odaberi težinu zadatka
          </h3>
          <TaskDifficultySelector />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  </Card.Footer>
</Card.Root>
