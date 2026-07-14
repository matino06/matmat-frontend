<script>
  import "../app.css";
  import { page } from '$app/state';
  import { afterNavigate, goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { userData, turnstileData } from "$lib/store/user.svelte";
  import { panelState, closeAI, closeFormule, closePomo } from "$lib/store/panels.svelte";
  import { uiState, toggleSidebar, closeSidebar } from "$lib/store/ui.svelte";
  import ErrorAlert from "$lib/components/alert/ErrorAlert.svelte";
  import LoadingOverlay from "$lib/components/loadingOverlay/LoadingOverlay.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import Panel from "$lib/components/panel/Panel.svelte";
  import ChatWindow from "$lib/components/chatWindow/ChatWindow.svelte";
  import Onboarding from "$lib/components/onboarding/Onboarding.svelte";

  const GA_ID = "G-E6F6X4X2XG";

  function trackPageView() {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_path: window.location.pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }

  onMount(() => {
    trackPageView();

    function onKey(e) {
      if (e.key === "Escape") {
        closeSidebar();
        closeAI();
        closeFormule();
        return;
      }
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.key === "f" || e.key === "F") panelState.formuleOpen = !panelState.formuleOpen;
      if (e.key === "a" || e.key === "A") panelState.aiOpen = !panelState.aiOpen;
    }

    function onTheme() {
      const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem("mm-theme", t); } catch {}
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  afterNavigate(() => {
    trackPageView();
    closeSidebar();
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    const shouldLock =
      typeof window !== "undefined" &&
      window.innerWidth < 768 &&
      (uiState.sidebarOpen || panelState.aiOpen || panelState.formuleOpen);
    document.body.classList.toggle("body-lock", shouldLock);
  });

  onMount(() => {
    function onResize() {
      if (window.innerWidth >= 768) {
        document.body.classList.remove("body-lock");
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });

  let { children } = $props();

  let path = $derived(page.url.pathname);
  const MARKETING_PATHS = ["/", "/kako-radi"];
  let isLanding = $derived(MARKETING_PATHS.includes(path));
  let showSidebar = $derived(!isLanding && !!userData.user);

  $effect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("app-shell", showSidebar);
  });

  $effect(() => {
    if (!userData.loading && !userData.user && !isLanding) {
      goto("/");
    }
  });

  let formulasPdfUrl = "/pdfs/MAT-FORMULE.pdf";

  function toggleTheme() {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("mm-theme", t); } catch {}
  }
</script>

<svelte:head>
  <title>MatMat — Priprema za maturu iz matematike</title>
  <meta name="description" content="Vježbaj matematiku za maturu BESPLATNO uz personalizirane zadatke, objašnjenja, AI asistenta i praćenje napretka." />
  <meta property="og:title" content="MatMat — Priprema za maturu iz matematike" />
  <meta property="og:description" content="Vježbaj matematiku za maturu BESPLATNO uz personalizirane zadatke, objašnjenja, AI asistenta i praćenje napretka." />
  <meta property="og:image" content="https://matmat.online/images/landing_page_dark.png" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://matmat.online/" />
</svelte:head>

<!-- Turnstile overlay — always in DOM; hidden via opacity/pointer-events so Cloudflare can render into it before the overlay is shown -->
<div
  class="turnstile-overlay"
  style:opacity={turnstileData.isLoaded ? '1' : '0'}
  style:pointer-events={turnstileData.isLoaded ? 'all' : 'none'}
>
  <div id="turnstile-container"></div>
</div>

<!-- Loading -->
{#if userData.loading}
  <LoadingOverlay title="Učitavanje MatMat-a" message="Pripremamo tvoje personalizirano iskustvo učenja"/>
{/if}

<ErrorAlert/>

{#if userData.needsOnboarding && userData.user}
  <Onboarding/>
{:else if isLanding}
  {@render children?.()}
{:else if showSidebar}
  <div class="app">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="sidebar-backdrop" class:open={uiState.sidebarOpen} onclick={closeSidebar}></div>
    <Sidebar open={uiState.sidebarOpen}/>
    <main class="main">
      <!-- Topbar -->
      <div class="topbar">
        <div class="topbar-title">
          <button class="btn btn-quiet topbar-hamburger" onclick={toggleSidebar} aria-label="Otvori navigaciju" style="padding:6px 8px;margin-right:6px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="4" y1="6"  x2="20" y2="6"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          {#if path === '/progress/units'}
            <span style="color:var(--text-faint)">Matematika</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Cjeline</b>
          {:else if path === '/mapa'}
            <span style="color:var(--text-faint)">Matematika</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Mapa gradiva</b>
          {:else if path === '/tasks'}
            <span style="color:var(--text-faint)">Matematika</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Zadaci</b>
          {:else if path === '/progress'}
            <span style="color:var(--text-faint)">Matematika</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Napredak</b>
          {:else if path === '/goals'}
            <span style="color:var(--text-faint)">Matematika</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Ciljevi</b>
          {:else if path === '/settings'}
            <b>Postavke</b>
          {:else if path === '/admin'}
            <span style="color:var(--text-faint)">Admin</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Nadzorna ploča</b>
          {:else if path === '/all-tasks'}
            <span style="color:var(--text-faint)">Admin</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Svi zadaci</b>
          {:else if path === '/create-tasks'}
            <span style="color:var(--text-faint)">Admin</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Kreiraj zadatke</b>
          {:else}
            <b>MatMat</b>
          {/if}
        </div>
        <div class="topbar-actions">
          <button class="btn btn-quiet" onclick={toggleTheme} title="Promijeni temu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
            </svg>
          </button>
          <button class="btn btn-ghost" onclick={() => panelState.aiOpen = true}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M20 19.5v-.5a7 7 0 0 0-14 0v.5"/>
            </svg>
            <span class="ai-label">AI asistent</span>
          </button>
        </div>
      </div>

      {@render children?.()}
    </main>
  </div>

  <!-- AI Panel -->
  <Panel
    open={panelState.aiOpen}
    onClose={closeAI}
    title="AI asistent"
    meta="zna što rješavaš"
  >
    <ChatWindow/>
  </Panel>

  <!-- Formule Panel -->
  <Panel
    open={panelState.formuleOpen}
    onClose={closeFormule}
    title="Maturalne tablice i formule"
    meta="Matematika"
    wide={true}
  >
    <div class="pdf-viewer-wrap">
      <iframe
        src={formulasPdfUrl}
        title="Maturalne tablice i formule"
        style="width:100%; height:100%; border:none; border-radius: var(--r-md);"
      ></iframe>
    </div>
  </Panel>

{/if}

<style>
  .turnstile-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    transition: opacity 0.2s;
  }
  .pdf-viewer-wrap {
    height: calc(100vh - 120px);
    min-height: 400px;
  }
</style>
