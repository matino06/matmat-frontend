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
  import { afterNavigate } from "$app/navigation";
  import LoadingOverlay from "$lib/components/loadingOverlay/LoadingOverlay.svelte";
  import NotificationPreferencesPopup from "$lib/components/notificationPreferencesPopup/NotificationPreferencesPopup.svelte";
  import { onMount } from "svelte";

  const GA_ID = "G-E6F6X4X2XG";

  function trackPageView() {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_path: window.location.pathname,
        page_location: window.location.href,
        page_title: document.title
      });
    }
  }

  onMount(() => {
    // first load
    trackPageView();
  });

  afterNavigate(() => {
    // every SPA navigation
    trackPageView();
  });

  let { children } = $props();
</script>

<svelte:head>
  <title>MatMat — Priprema za maturu iz matematike</title>
  <meta
    name="description"
    content="Vježbaj matematiku za maturu BESPLATNO uz personalizirane zadatke, objašnjenja, AI asistenta i praćenje napretka."
  />

  <meta
    property="og:title"
    content="MatMat — Priprema za maturu iz matematike"
  />
  <meta
    property="og:description"
    content="Vježbaj matematiku za maturu BESPLATNO uz personalizirane zadatke, objašnjenja, AI asistenta i praćenje napretka."
  />
  <meta
    property="og:image"
    content="https://matmat.online/images/landing_page_dark.png"
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://matmat.online/" />
</svelte:head>

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
  <LoadingOverlay
    title="Učitavanje MatMat-a"
    message="Pripremamo tvoje personalizirano iskustvo učenja"
  />
{/if}

<ErrorAlert />

<div class="min-h-screen flex flex-col">
  <!-- Header / Navbar / Main content -->
  <div class="flex-1">
    <div class="m-4">
      <Navbar />
    </div>

    <NotificationPreferencesPopup user={userData.user} />

    {#if page.url.pathname != "/" && page.url.pathname != "/about"}
      <div class="mx-4">
        <AuthRequiredMessage />
      </div>
    {/if}

    {#if userData.user || page.url.pathname == "/" || page.url.pathname == "/about"}
      {@render children?.()}
    {/if}
  </div>

  <!-- Footer -->
  <footer class="mt border-t py-6">
    <div class="text-muted-foreground container mx-auto px-4 text-center text-sm">
      <p>
        MatMat © {new Date().getFullYear()} — Priprema za državnu maturu
        iz matematike
      </p>
      <p class="mt-2">
        Pitanja?{" "}
        <a
          href="mailto:info@matmat.online"
          class="text-primary underline hover:no-underline"
        >
          info@matmat.online
        </a>
      </p>
    </div>
  </footer>
</div>

