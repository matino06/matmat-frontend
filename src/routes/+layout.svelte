<script>
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";

  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { userData, login, logout } from "$lib/store/user.svelte";

  let { children } = $props();
</script>

<ModeWatcher />
<div class="px-4">
  <Navbar />
  {#if userData.loading}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-4">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"
        ></div>
        <p class="text-sm text-white">Učitavanje...</p>
      </div>
    </div>
  {/if}
  {@render children?.()}
</div>
