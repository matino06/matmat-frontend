<script>
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  let {title, description, destination, cta} = $props();

  let show = $state(false);

  onMount(() => {
    const hidden = localStorage.getItem(title);
    if (hidden !== "true") {
      show = true;
    }
  });

  function handleClose() {
    localStorage.setItem(title, "true");
    show = false;
  }

  function goToProgress() {
    window.location.href = destination;
  }
</script>

{#if show}
  <div
    transition:fly={{ y: 20, duration: 400 }}
    class="rounded-lg bg-gradient-to-r from-primary to-purple-600 p-1 shadow-2xl"
  >
    <div class="relative flex flex-col rounded-lg bg-white p-4 dark:bg-gray-900">
      <button
        onclick={handleClose}
        class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Zatvori"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="mb-3 flex items-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h3 class="font-bold text-gray-900 dark:text-white">{title}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      </div>

      <button
        onclick={goToProgress}
        class="mt-2 w-full rounded-lg bg-gradient-to-r from-primary to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:shadow-md"
      >
        {cta}
      </button>
    </div>
  </div>
{/if}