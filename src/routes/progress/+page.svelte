<script>
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { apiClient } from "$lib/api/apiClient";
  import ProgressList from "$lib/components/progressList/ProgressList.svelte";
  import { userData } from "$lib/store/user.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { fade } from "svelte/transition";
  import ExamReadinessRing from "$lib/components/examReadinessRing/ExamReadinessRing.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

  let objectives = $state([]);

  $effect(() => {
    if (!userData.user) return;

    const fetchObjectives = async () => {
      const response = await apiClient(
        "/learning-objective/get-objectives-with-status",
        { method: "GET" },
      );

      objectives = await response.json();
      console.log(objectives);
    };

    setTimeout(() => {
      fetchObjectives();
    }, 500);
  });
</script>

{#if userData.user}
  <div class="flex w-full">
    <div class="mr-1 w-4/9">
      {#if objectives.length === 0}
        <div>
          {#each { length: 4 }}
            <Skeleton class="w-[full - 4] my-4 mr-4 h-4" />
            {#each { length: 4 }}
              <Skeleton class="w-[full - 10] my-4 mr-4 ml-8 h-4" />
            {/each}
          {/each}
        </div>
      {:else}
        <ScrollArea class="h-[calc(100vh-92px)] w-full pr-4">
          <div transition:fade={{ duration: 1000 }}>
            <ProgressList {objectives} />
          </div></ScrollArea
        >
      {/if}
    </div>

    <Separator orientation="vertical" class="min-h-[calc(100vh-92px)]" />

    <div class="flex w-full items-center justify-center">
      {#if objectives.length === 0}
        <div class=" inset-0 z-50 flex items-center justify-center">
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"
          ></div>
        </div>
      {:else}
        <div transition:fade={{ duration: 500 }}>
          <ExamReadinessRing {objectives} />
        </div>
      {/if}
    </div>
  </div>
{/if}
