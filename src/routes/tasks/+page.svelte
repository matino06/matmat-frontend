<script>
  import Task from "$lib/components/task/Task.svelte";
  import ChatWindow from "$lib/components/chatWindow/ChatWindow.svelte";
  import { auth } from "$lib/config/firebase-config";
  import { apiClient } from "$lib/api/apiClient";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import LoadingOverlay from "$lib/components/loadingOverlay/LoadingOverlay.svelte";
  import ProgressIncreaseAnimation from "$lib/components/progressIncreaseAnimation/ProgressIncreaseAnimation.svelte";
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";
  import { calculateExamProgress } from "$lib/utils/progress";
  import { tick } from "svelte";
  import CourseSelector from "$lib/components/courseSelector/CourseSelector.svelte";
  import Announcement from "$lib/components/announcement/Announcement.svelte";
  import NoMoreTasks from "$lib/components/noMoreTasks/NoMoreTasks.svelte";
  import TaskTip from "$lib/components/tips/TaskTip.svelte";
  import { Dumbbell } from "@lucide/svelte/icons";
  import TempoSelector from "$lib/components/tempoSelector/TempoSelector.svelte";

  let currentCourse = $state(null);
  let task = $state(null);
  let noMoreTasks = $state(false);
  let isLoading = $state(false);
  let showTooltip = $state(false);
  let selectedTempo = $state(null);

  let showProgressAnimation = $state(false);

  async function fetchCurrentProgress() {
    const objectives = await fetchObjectivesWithStatus();

    return calculateExamProgress(objectives, currentCourse.courseId);
  }

  let animationInitialProgress = $state(0);
  let animationNewProgress = $state(0);
  let initialProgress = $state(null);

  async function shouldAnimateProgress() {
    const progress = await fetchCurrentProgress();

    if (initialProgress !== null && progress > initialProgress) {
      animationInitialProgress = initialProgress;
      animationNewProgress = progress;

      showProgressAnimation = false;
      await tick();
      showProgressAnimation = true;
    }

    initialProgress = progress;
  }

  async function fetchCurrentCourse() {
    const response = await apiClient("/account/current-course", {
      method: "GET",
    });
    if (response.ok) {
      currentCourse = await response.json();
    }
  }

  async function handleCourseChange(event) {
    currentCourse = event.detail.course;
    initialProgress = null;
    await fetchNewTask();
  }

  async function fetchNewTask() {
    isLoading = true;

    await shouldAnimateProgress();

    task = null;
    const response = await apiClient("/task/get-new", { method: "GET" });

    const textResponse = await response.text();
    if (textResponse == "No more tasks for today!") {
      noMoreTasks = true;
      task = null;
      isLoading = false;
      return;
    }

    task = JSON.parse(textResponse);
    task.explanationSteps.sort((a, b) => a.stepNumber - b.stepNumber);

    isLoading = false;
  }

  $effect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchCurrentCourse();
        await fetchNewTask();
      }
    });
    return () => unsubscribe();
  });

  onMount(async () => {
    const response = await apiClient("/account/tempo", { method: "GET" });
    if (response.ok) {
      selectedTempo = await response.json();
    }
  });
</script>

<div class="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 sm:left-4 sm:right-auto sm:w-96">
  <Announcement 
    title="Novi Progress Page! 🎉"
    description="Prati svoj napredak na novoj, preglednijoj stranici."
    destination="/progress"
    cta="Pogledaj progress →"
  />

  <Announcement 
    title="Novi Goals Page! 🎉"
    description="Prati svoj dnevne ciljeve i aktivnost na novoj stranici."
    destination="/goals"
    cta="Pogledaj ciljeve →"
  />
</div>

<ProgressIncreaseAnimation
  show={showProgressAnimation}
  initialProgress={animationInitialProgress}
  newProgress={animationNewProgress}
  onClose={() => (showProgressAnimation = false)}
/>

<TaskTip/>

<div
    class="m-2 flex min-h-[calc(100vh-102px)] flex-col items-center justify-center"
  >
    <!-- Naslov -->
    <div class="flex w-full max-w-[700px] mx-auto items-center gap-3 mb-3">
      <div class="bg-primary/10 rounded-full p-3 shrink-0">
        <Dumbbell class="text-primary h-7 w-7" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">Vježbaj i napreduj</h1>
        <p class="text-muted-foreground text-sm">Riješi zadatke i postepeno osvajaj gradivo za maturu</p>
      </div>
    </div>
    <div class="w-full max-w-[700px] mx-auto mb-3 flex items-center gap-2">
      <CourseSelector
        {currentCourse}
        on:courseChange={handleCourseChange}
        disabled={isLoading}
      />
      <div class="flex items-center gap-2">
        <TempoSelector {fetchNewTask} />
        <div class="relative">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            class="text-muted-foreground text-sm cursor-pointer select-none"
            onclick={() => showTooltip = !showTooltip}
            onmouseenter={() => showTooltip = true}
            onmouseleave={() => showTooltip = false}
          >ⓘ</span>
          {#if showTooltip}
            <div class="absolute bottom-full right-0 mb-2 w-56 rounded-lg bg-popover border border-border px-3 py-2 text-xs text-muted-foreground shadow-md z-10">
              Tempo određuje brzinu otključavanja novih lekcija.
            </div>
          {/if}
        </div>
      </div>
    </div>

{#if task}
    {#key task.id}
      <div transition:fade class="w-full max-w-[700px] mx-auto">
        <Task {task} {fetchNewTask} />
        <ChatWindow {task} />
      </div>
    {/key}
{:else if noMoreTasks}
    <NoMoreTasks/>
{:else}
  <div class="m-2 flex min-h-[calc(100vh-102px)] flex-col items-center justify-center"></div>
{/if}
</div>

{#if isLoading}
  <LoadingOverlay
    title="Učitavanje zadatka"
    message="Pripremamo tvoj sljedeći matematički izazov"
  />
{/if}
