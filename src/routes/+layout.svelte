<script>
  import "../app.css";
  import { page } from '$app/state';
  import { dev } from "$app/environment";
  import { afterNavigate, goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { userData, turnstileData, initAuth, validateSession } from "$lib/store/user.svelte";
  import { panelState, openAI, closeAI, closeFormule, closePomo } from "$lib/store/panels.svelte";
  import { uiState, toggleSidebar, closeSidebar, initSidebarCollapsed } from "$lib/store/ui.svelte";
  import { courseState, loadCurrentCourse, courseLabel as labelFor } from "$lib/store/course.svelte";
  import { ownCourses, loadOwnCourses, findOwnCourse, loadExamMaterials } from "$lib/store/ownCourses.svelte";
  import { getProgram } from "$lib/config/programs";
  import ErrorAlert from "$lib/components/alert/ErrorAlert.svelte";
  import LoadingOverlay from "$lib/components/loadingOverlay/LoadingOverlay.svelte";
  import Sidebar from "$lib/components/layout/Sidebar.svelte";
  import CourseLabel from "$lib/components/layout/CourseLabel.svelte";
  import Panel from "$lib/components/panel/Panel.svelte";
  import ChatWindow from "$lib/components/chatWindow/ChatWindow.svelte";
  import Onboarding from "$lib/components/onboarding/Onboarding.svelte";
  import SubjectsDialog from "$lib/components/subjects/SubjectsDialog.svelte";
  import AiConsentPrompt from "$lib/components/ai/AiConsentPrompt.svelte";
  import { aiConsent, loadAiConsent, resetAiConsent } from "$lib/store/aiConsent.svelte";
  import { uvod } from "$lib/store/uvod.svelte";
  import UvodVodic from "$lib/components/uvod/UvodVodic.svelte";
  import Savjet from "$lib/components/uvod/Savjet.svelte";
  import { savjeti, ponudiSavjet } from "$lib/store/savjeti.svelte";
  import MobileAppGate from "$lib/components/marketing/MobileAppGate.svelte";
  import { APP_STORE_ID } from "$lib/config/apps";

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
    initAuth();
    initSidebarCollapsed();

    function onKey(e) {
      if (e.key === "Escape") {
        closeSidebar();
        closeAI();
        closeFormule();
      }
    }

    function onTheme() {
      const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem("mm-theme", t); } catch {}
    }

    // The Auth0 session can expire while the tab sits open in the background,
    // so re-check it whenever the user comes back to it.
    function onVisibility() {
      if (document.visibilityState === "visible") validateSession();
    }

    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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

  let { children, data } = $props();

  let path = $derived(page.url.pathname);
  // Public pages: no sign-in needed (the privacy policy and support are linked from the App Store and the app).
  // /uvod starts the walkthrough, which runs on made-up data, so it works signed out too.
  const MARKETING_PATHS = ["/", "/kako-radi", "/privatnost", "/podrska", "/uvod"];
  // /lab (interaktivne lekcije) postoji samo u dev načinu i radi bez prijave, kao marketinške stranice
  let isLanding = $derived(MARKETING_PATHS.includes(path) || (dev && (path === "/lab" || path.startsWith("/lab/"))));
  let showSidebar = $derived(!isLanding && (!!userData.user || uvod.active));
  // A phone that can install our app uses the app: only the pages anyone can read stay open on it.
  const PUBLIC_PATHS = ["/", "/kako-radi", "/privatnost", "/podrska"];
  let appOnly = $derived(!!data.platform?.appUrl && !PUBLIC_PATHS.includes(path));

  $effect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("app-shell", showSidebar && !appOnly);
  });

  $effect(() => {
    if (!userData.loading && !userData.user && !isLanding && !uvod.active && !appOnly) {
      goto("/");
    }
  });

  // The course drives the formula sheet PDF and every subject label in the
  // shell, so load it as soon as there is a user to load it for.
  $effect(() => {
    if (userData.user && !courseState.loaded) loadCurrentCourse();
  });

  $effect(() => {
    if (userData.user && !ownCourses.loaded) loadOwnCourses();
  });

  // AI consent is asked once the account exists and the level is chosen (a new account), or on the next visit of an
  // account that hasn't decided yet.
  $effect(() => {
    if (!userData.user) resetAiConsent();
    else if (userData.accountReady && !userData.needsOnboarding && !aiConsent.loaded) loadAiConsent();
  });
  let askAiConsent = $derived(!isLanding && !!userData.user && !userData.needsOnboarding && aiConsent.loaded && aiConsent.granted === null);

  // A creator who hasn't made a course yet hears once where to start one.
  $effect(() => {
    if (showSidebar && !uvod.active && ownCourses.loaded && ownCourses.isCreator && ownCourses.courses.length === 0) ponudiSavjet("kreator");
  });

  let program = $derived(getProgram(courseState.courseId));
  // Vlastiti predmet: panel Formule prikazuje materijal označen „dostupan na ispitu“ (ako ga nema, panela nema).
  let ownCourse = $derived(findOwnCourse(courseState.courseId));
  let examMaterials = $derived(ownCourse && ownCourses.examMaterials.courseId === ownCourse.courseId ? ownCourses.examMaterials.list : []);
  let examIndex = $state(0);
  $effect(() => {
    if (ownCourse && ownCourses.examMaterials.courseId !== ownCourse.courseId) {
      examIndex = 0;
      loadExamMaterials(ownCourse.courseId);
    }
  });
  let courseLabel = $derived(labelFor(courseState.courseId) ?? "");
  let formulasPdfUrl = $derived(ownCourse ? examMaterials[examIndex]?.url : (program?.pdf ?? "/pdfs/MAT-FORMULE.pdf"));
  let formulasTitle = $derived(ownCourse ? "Materijal dostupan na ispitu" : "Maturalne tablice i formule");

  function toggleTheme() {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("mm-theme", t); } catch {}
  }
</script>

<svelte:head>
  <title>MatMat — Priprema za maturu iz matematike i fizike</title>
  <meta name="description" content="Svaki dan zadaci s rješenjima korak po korak, a MatMat pamti kad ti što treba ponoviti. Matematika A i B i fizika za državnu maturu, besplatno na webu i iPhoneu." />
  <meta property="og:title" content="MatMat — Priprema za maturu iz matematike i fizike" />
  <meta property="og:description" content="Svaki dan zadaci s rješenjima korak po korak, a MatMat pamti kad ti što treba ponoviti. Matematika A i B i fizika za državnu maturu, besplatno na webu i iPhoneu." />
  <meta property="og:image" content="https://matmat.online/images/landing_page_dark.png" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://matmat.online/" />
  <!-- Safari on iPhone and iPad shows its own small banner with "Otvori" or "Preuzmi" for the app. -->
  <meta name="apple-itunes-app" content="app-id={APP_STORE_ID}" />
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
{#if userData.loading && !appOnly}
  <LoadingOverlay title="Učitavanje MatMat-a" message="Pripremamo tvoje personalizirano iskustvo učenja"/>
{/if}

<ErrorAlert/>

{#if uiState.subjectsOpen && showSidebar && !appOnly}
  <SubjectsDialog/>
{/if}

{#if appOnly}
  <MobileAppGate/>
{:else if userData.needsOnboarding && userData.user}
  <Onboarding/>
{:else if askAiConsent}
  <AiConsentPrompt/>
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
          <button class="btn btn-quiet topbar-hamburger" data-tour="izbornik" onclick={toggleSidebar} aria-label="Otvori navigaciju" style="padding:6px 8px;margin-right:6px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="4" y1="6"  x2="20" y2="6"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          {#if path === '/mapa'}
            <span style="color:var(--text-faint)"><CourseLabel /></span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Mapa gradiva</b>
          {:else if path === '/tasks'}
            <span style="color:var(--text-faint)"><CourseLabel /></span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Zadaci</b>
          {:else if path === '/ponavljanje'}
            <span style="color:var(--text-faint)"><CourseLabel /></span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Ponavljanje</b>
          {:else if path === '/progress'}
            <span style="color:var(--text-faint)"><CourseLabel /></span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>Napredak</b>
          {:else if path.startsWith('/moji-predmeti')}
            <span style="color:var(--text-faint)">Moji predmeti</span>
            {#if path === '/moji-predmeti/novi'}
              <span style="color:var(--text-faint); margin: 0 6px">/</span>
              <b>Novi predmet</b>
            {/if}
          {:else if path === '/goals'}
            <span style="color:var(--text-faint)"><CourseLabel /></span>
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
          {:else if path === '/ai-settings'}
            <span style="color:var(--text-faint)">Admin</span>
            <span style="color:var(--text-faint); margin: 0 6px">/</span>
            <b>AI postavke</b>
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
          <button class="btn btn-ghost" data-tour="ai" onclick={openAI}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M20 19.5v-.5a7 7 0 0 0-14 0v.5"/>
            </svg>
            <span class="ai-label">AI asistent</span>
          </button>
        </div>
      </div>

      {@render children?.()}
    </main>

    {#if uvod.active}<UvodVodic/>{:else if savjeti.aktivan}<Savjet/>{/if}

    <!-- Panels live inside .app so that on wide screens the open one becomes a
         grid column next to the page (see the split view in app.css); below that
         they're fixed overlays and their place here doesn't matter. -->

    <!-- AI Panel -->
    <Panel
      id="ai"
      open={panelState.aiOpen}
      onClose={closeAI}
      bare={true}
    >
      <ChatWindow/>
    </Panel>

    <!-- Formule Panel -->
    <Panel
      id="formule"
      open={panelState.formuleOpen}
      onClose={closeFormule}
      title={formulasTitle}
      meta={courseLabel}
      wide={true}
    >
      {#if examMaterials.length > 1}
        <div class="exam-tabs">
          {#each examMaterials as m, i (m.materialId)}
            <button class="chip" class:active={i === examIndex} onclick={() => (examIndex = i)}>{m.name}</button>
          {/each}
        </div>
      {/if}
      <div class="pdf-viewer-wrap">
        <iframe
          src={formulasPdfUrl}
          title={formulasTitle}
          style="width:100%; height:100%; border:none; border-radius: var(--r-md);"
        ></iframe>
      </div>
    </Panel>
  </div>

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
  .exam-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .exam-tabs .chip.active { border-color: var(--primary-border); color: var(--primary); }
  .pdf-viewer-wrap {
    height: calc(100vh - 120px);
    min-height: 400px;
  }
</style>
