<script>
  import { goto } from "$app/navigation";
  import Task from "$lib/components/task/Task.svelte";
  import { auth } from "$lib/config/firebase-config";
  import { authFetch } from "$lib/api/authFetch";
  import { onMount } from "svelte";
  let task = null;

  onMount(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const response = await authFetch(
          "http://localhost:8080/api/task/get-new",
        );
        task = await response.json();
        console.log(task);
      }
    });

    return () => unsubscribe();
  });
</script>

{#if task}
  <div class="flex min-h-[calc(100vh-92px)] items-center justify-center">
    <Task {task} />
  </div>
{/if}
