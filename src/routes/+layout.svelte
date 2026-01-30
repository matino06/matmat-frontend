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

  afterNavigate(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("config", "G-E6F6X4X2XG", {
        page_path: window.location.pathname,
      });
    }
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

<div class="m-4">
  <Navbar />
</div>
{#if page.url.pathname != "/" && page.url.pathname != "/about"}
  <div class="mx-4">
    <AuthRequiredMessage />
  </div>
{/if}
{@render children?.()}

<footer class="mt border-t py-6">
  <div class="text-muted-foreground container mx-auto px-4 text-center text-sm">
    <p>
      MatMat © {new Date().getFullYear()} — Besplatna priprema za državnu maturu
      iz matematike
    </p>
    <p class="mt-2">
      Pitanja?{" "}
      <a
        href="mailto:info.matmat.online@gmail.com"
        class="text-primary underline hover:no-underline"
      >
        info.matmat.online@gmail.com
      </a>
    </p>
  </div>
</footer>
