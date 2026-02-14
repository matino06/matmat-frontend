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

  let currentCourse = $state(null);
  let task = $state(null);
  let noMoreTasks = $state(false);
  let isLoading = $state(false);

  let showProgressAnimation = $state(false);

  async function fetchCurrentProgress() {
    const objectives = await fetchObjectivesWithStatus();

    return calculateExamProgress(objectives);
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
</script>

<ProgressIncreaseAnimation
  show={showProgressAnimation}
  initialProgress={animationInitialProgress}
  newProgress={animationNewProgress}
  onClose={() => (showProgressAnimation = false)}
/>

{#if task}
  <div
    class="m-2 flex min-h-[calc(100vh-120px)] flex-col items-center justify-center"
  >
    <div class="mb-2 w-full sm:w-4/5 lg:w-[700px]">
      <CourseSelector
        {currentCourse}
        on:courseChange={handleCourseChange}
        disabled={isLoading}
      />
    </div>

    {#key task.id}
      <div transition:fade>
        <Task {task} {fetchNewTask} />
        <ChatWindow {task} />
      </div>
    {/key}
  </div>
{/if}

{#if isLoading}
  <LoadingOverlay
    title="Učitavanje zadatka"
    message="Pripremamo tvoj sljedeći matematički izazov"
  />
{/if}

{#if noMoreTasks}
  <div
    transition:fade
    class="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center p-6 text-center"
  >
    <div class="mx-auto max-w-md">
      <div class="mb-8">
        <svg
          class="mx-auto h-32 w-32 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      </div>

      <h1 class="mb-4 text-3xl font-bold text-gray-800 md:text-4xl">
        <span class="block text-green-600">Čestitam!</span>
        Danas si završio/la sve zadatke
      </h1>

      <p class="mb-8 text-lg leading-relaxed text-gray-600">
        Odličan posao! Sada je vrijeme za odmor -
        <span class="font-semibold text-green-700">potpuno zasluženo</span>.
        <br />
        <span class="mt-2 block text-sm text-gray-500">
          Svaki korak te vodi bliže savršenom znanju
        </span>
      </p>

      <div
        class="mb-8 rounded-xl border border-green-100 bg-gradient-to-r from-green-50 to-blue-50 p-6 shadow-sm"
      >
        <div class="flex items-center justify-around">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-700">100%</div>
            <div class="text-sm text-gray-500">Današnji napredak</div>
          </div>
          <div class="h-12 w-px bg-green-200"></div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-700">🎯</div>
            <div class="text-sm text-gray-500">Cilj postignut</div>
          </div>
        </div>
      </div>

      <div class="mb-8 rounded-r-lg border-l-4 border-blue-400 bg-blue-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-blue-700">
              <span class="font-medium">Važno:</span> Ako se ulogiraš i sutra (ili
              nekoliko dana za redom) ne vidiš nove zadatke, ne brini - to je normalno!
              Sustav pravilno raspoređuje ponavljanja kako bi ti znanje ostalo dugotrajno.
            </p>
          </div>
        </div>
      </div>

      <button
        onclick={() => location.reload()}
        class="transform rounded-full bg-gradient-to-r from-green-500 to-green-600 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-green-600 hover:to-green-700 hover:shadow-xl"
      >
        <div class="flex items-center justify-center">
          <svg
            class="mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            ></path>
          </svg>
          Ponovno učitaj (možda ima novih zadataka)
        </div>
      </button>

      <div class="mt-8 flex items-center justify-center text-sm text-gray-500">
        <svg
          class="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>Ulogiraj se sutra da provjeriš ima li novih zadataka!</span>
      </div>
    </div>
  </div>
{/if}
