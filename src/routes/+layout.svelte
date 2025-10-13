<script>
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { userData } from "$lib/store/user.svelte";
  import ErrorAlert from "$lib/components/alert/ErrorAlert.svelte";
  import { turnstileData } from "$lib/store/user.svelte";
  import { fade } from "svelte/transition";
  import { page } from "$app/state";
  import AuthRequiredMessage from "$lib/components/authRequiredMessage/AuthRequiredMessage.svelte";

  let { children } = $props();
</script>

<ModeWatcher />

<!-- Turnstile -->
<div
  transition:fade
  class="fixed {turnstileData.isLoaded
    ? ''
    : 'hidden'} inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
>
  <div class="flex flex-col items-center gap-4">
    <div id="turnstile-container"></div>
  </div>
</div>

<!-- Loading Overlay -->
{#if userData.loading}
  <div
    transition:fade
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

<ErrorAlert />

<div class="m-4">
  <Navbar />
</div>
{#if page.url.pathname != "/"}
  <div class="mx-4">
    <AuthRequiredMessage />
  </div>
{/if}
{@render children?.()}
