<script>
  import { Separator } from "$lib/components/ui/separator/index.js";
  import ProgressList from "$lib/components/progressList/ProgressList.svelte";
  import { userData } from "$lib/store/user.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { fade } from "svelte/transition";
  import ExamReadinessRing from "$lib/components/examReadinessRing/ExamReadinessRing.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { onMount } from "svelte";
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";

  let objectives = $state([]);
  let loading = $state(true);

  let width = $state(0);
  let size = $state("");

  const updateWidth = () => {
    width = window.innerWidth;

    if (width >= 1024) size = "size-110";
    else if (width >= 768) size = "size-90";
    else if (width >= 640) size = "size-60";
    else size = "size-70";
  };

  async function loadObjectives() {
    if (!userData.user) return;

    loading = true;
    objectives = await fetchObjectivesWithStatus();
    loading = false;
  }

  onMount(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    loadObjectives();

    return () => window.removeEventListener("resize", updateWidth);
  });

  $effect(() => {
    if (userData.user) {
      loadObjectives();
    }
  });
</script>

<div class="m-4">
  {#if userData.user}
    {#if width >= 640}
      <div class="flex w-full">
        <div
          class="mr-1 w-full text-[0.7rem] sm:w-7/9 sm:text-[0.8rem] md:w-6/9 md:text-[0.9rem] lg:w-5/9 lg:text-[1rem] xl:w-4/9"
        >
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
            <ScrollArea class="h-[calc(100vh-108px)] w-full pr-4">
              <div transition:fade={{ duration: 1000 }}>
                <ProgressList {objectives} />
              </div></ScrollArea
            >
          {/if}
        </div>

        <Separator orientation="vertical" class="min-h-[calc(100vh-108px)]" />

        <div class="flex w-full items-center justify-center">
          {#if objectives.length === 0}
            <div class=" inset-0 z-50 flex items-center justify-center">
              <div
                class="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"
              ></div>
            </div>
          {:else}
            <div transition:fade={{ duration: 500 }}>
              <ExamReadinessRing {objectives} {size} />
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="flex w-full items-center justify-center">
        {#if objectives.length === 0}
          <div class=" inset-0 z-50 flex items-center justify-center">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"
            ></div>
          </div>
        {:else}
          <div transition:fade={{ duration: 500 }}>
            <ExamReadinessRing {objectives} {size} />
          </div>
        {/if}
      </div>

      <div class="w-full">
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
          <div transition:fade={{ duration: 1000 }}>
            <ProgressList {objectives} />
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
