<script>
  import { fade } from "svelte/transition";

  let {
    message = "Pripremamo tvoje personalizirano iskustvo učenja",
    title = "Učitavanje MatMata",
  } = $props();
</script>

<div
  transition:fade
  class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
>
  <div class="mb-8 text-center">
    <div class="bg-primary/20 mb-4 inline-flex rounded-full p-4">
      <div
        class="h-10 w-10 animate-spin rounded-full border-[3px] border-white border-t-transparent"
      ></div>
    </div>
    <h3 class="mb-2 text-2xl font-bold text-white">{title}</h3>
    <p class="text-gray-300">
      {message}
    </p>
  </div>

  <div class="h-1 w-64 overflow-hidden rounded-full bg-gray-700">
    <div
      class="from-primary to-primary/50 h-full animate-[progress_2s_ease-in-out_infinite] bg-gradient-to-r"
    ></div>
  </div>
</div>
