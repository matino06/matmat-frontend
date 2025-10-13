<script>
  import Task from "$lib/components/task/Task.svelte";
  import ChatWindow from "$lib/components/chatWindow/ChatWindow.svelte";
  import { auth } from "$lib/config/firebase-config";
  import { apiClient } from "$lib/api/apiClient";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  let task = $state(null);

  async function fetchNewTask() {
    task = null;
    const response = await apiClient("/task/get-new", { method: "GET" });
    task = await response.json();
    task.explanationSteps.sort((a, b) => a.stepNumber - b.stepNumber);
  }

  $effect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        fetchNewTask();
      }
    });

    return () => unsubscribe();
  });
</script>

{#if task}
  <div
    transition:fade
    class="m-2 flex min-h-[calc(100vh-92px)] items-center justify-center"
  >
    {#key task.id}
      <Task {task} {fetchNewTask} />
      <ChatWindow {task} />
    {/key}
  </div>
{/if}
