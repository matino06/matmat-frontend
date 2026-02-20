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
  
  let currentCourse = $state(null);
  let task = $state(null);
  let noMoreTasks = $state(false);
  let isLoading = $state(false);

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
</script>

<Announcement 
  title={"Novi Progress Page! 🎉"}  
  description={"Prati svoj napredak na novoj, preglednijoj stranici."} 
  destination={"/progress"} 
  cta={"Pogledaj progress →"}
/>

<Announcement 
  title={"Novi Goals Page! 🎉"}  
  description={"Prati svoj dnevne ciljeve i aktvinost na novoj stranici."} 
  destination={"/goals"} 
  cta={"Pogledaj ciljeve →"}
/>

<ProgressIncreaseAnimation
  show={showProgressAnimation}
  initialProgress={animationInitialProgress}
  newProgress={animationNewProgress}
  onClose={() => (showProgressAnimation = false)}
/>

<TaskTip/>

{#if task}
  <div
    class="m-2 flex min-h-[calc(100vh-102px)] flex-col items-center justify-center"
  >
    <div class="mb-2 w-full max-w-[700px] mx-auto">
      <CourseSelector
        {currentCourse}
        on:courseChange={handleCourseChange}
        disabled={isLoading}
      />
    </div>

    {#key task.id}
      <div transition:fade class="w-full max-w-[700px] mx-auto">
        <Task {task} {fetchNewTask} />
        <ChatWindow {task} />
      </div>
    {/key}
  </div>
{:else if noMoreTasks}
    <NoMoreTasks/>
{:else}
  <div class="m-2 flex min-h-[calc(100vh-102px)] flex-col items-center justify-center"></div>
{/if}

{#if isLoading}
  <LoadingOverlay
    title="Učitavanje zadatka"
    message="Pripremamo tvoj sljedeći matematički izazov"
  />
{/if}
