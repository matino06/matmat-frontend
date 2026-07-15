<script>
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { userData } from '$lib/store/user.svelte';
  import { panelState, openAI, openFormule, showPomoWidget } from '$lib/store/panels.svelte';
  import { closeSidebar } from '$lib/store/ui.svelte';
  import { apiClient } from '$lib/api/apiClient';
  import { onMount } from 'svelte';

  let { open = false } = $props();

  let currentCourse = $state(null);
  let psOpen = $state(false);
  let avatarFailed = $state(false);

  function nav(path) {
    goto(path);
    closeSidebar();
  }

  function openAIAndClose() { openAI(); closeSidebar(); }
  function openFormuleAndClose() { openFormule(); closeSidebar(); }

  const PROGRAMS = [
    { id: 1, label: 'Matematika A razina', badge: 'MA', color: '239', sub: 'Državna matura' },
    { id: 2, label: 'Matematika B razina', badge: 'MB', color: '215', sub: 'Državna matura' },
    { id: 3, label: 'Ekonomska Matematika EFZG', badge: 'EF', color: '160', sub: 'Ekonomska Matematika na fakultetu EFZG' },
  ];

  async function loadCourse() {
    if (!userData.user) return;
    try {
      const res = await apiClient('/account/current-course', { method: 'GET' });
      if (res.ok) currentCourse = await res.json();
    } catch {}
  }

  async function switchCourse(prog) {
    if (prog.id === currentCourse?.courseId) {
      psOpen = false;
      return;
    }
    try {
      await apiClient('/account/current-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: prog.id }),
      });
      currentCourse = { courseId: prog.id };
      psOpen = false;
      // The current page's content (next task, mock exams, units, progress) is
      // course-specific and fetched in each page's onMount, so reload to refetch
      // everything for the newly selected course.
      window.location.reload();
    } catch {}
    psOpen = false;
  }

  onMount(loadCourse);

  let activeProg = $derived(
    PROGRAMS.find(p => p.id === currentCourse?.courseId) ?? PROGRAMS[0]
  );

  let path = $derived(page.url.pathname);

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function handlePomodoro() {
    showPomoWidget();
    if (path !== '/tasks') goto('/tasks');
    closeSidebar();
  }
</script>

<nav class="sidebar" class:sidebar-open={open}>
  <div class="brand">
    <div class="brand-mark">M</div>
    <div class="brand-name">MatMat</div>
  </div>

  <!-- Program switcher -->
  <div style="margin-bottom: 10px; position: relative;">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="prog-switcher" onclick={() => psOpen = !psOpen}>
      <div class="badge-sq" style="background: hsl({activeProg.color} 75% 55%)">{activeProg.badge}</div>
      <div class="ps-meta">
        <div class="ps-name">{activeProg.label}</div>
        <div class="ps-sub">{activeProg.sub}</div>
      </div>
      <svg class="ps-chevron {psOpen ? 'ps-chevron-open' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>

    {#if psOpen}
      <div class="ps-dropdown">
        {#each PROGRAMS as prog (prog.id)}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            class="ps-option {currentCourse?.courseId === prog.id ? 'ps-option-active' : ''}"
            onclick={() => switchCourse(prog)}
          >
            <div class="badge-sq badge-sq-sm" style="background: hsl({prog.color} 75% 55%)">{prog.badge}</div>
            {prog.label}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="nav-group-label">Učenje</div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item {path === '/progress/units' ? 'active' : ''}" onclick={() => nav('/progress/units')}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
    Cjeline <span class="kbd">1</span>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item {path === '/mapa' ? 'active' : ''}" onclick={() => nav('/mapa')}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
    Mapa
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item {path === '/tasks' ? 'active' : ''}" onclick={() => nav('/tasks')}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
    Zadaci <span class="kbd">2</span>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item {path === '/progress' ? 'active' : ''}" onclick={() => nav('/progress')}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
    Napredak <span class="kbd">3</span>
  </div>
  
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item {path === '/goals' ? 'active' : ''}" onclick={() => nav('/goals')}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
    Ciljevi <span class="kbd">4</span>
  </div>
  
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item nav-item-featured {path === '/mock-exam' || path.startsWith('/mock-exam/') ? 'active' : ''}" onclick={() => nav('/mock-exam')}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="15" y2="17"/>
    </svg>
    Probna matura
    <span class="nav-novo">novo</span>
  </div>

  <div class="nav-group-label">Alati</div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item" onclick={openFormuleAndClose}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
    Formule <span class="kbd">F</span>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item" onclick={openAIAndClose}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M20 19.5v-.5a7 7 0 0 0-14 0v.5"/>
    </svg>
    AI asistent <span class="kbd">A</span>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="nav-item" onclick={handlePomodoro}>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/><path d="M12 3v1M12 20v1M3 12H2M22 12h-1M5.6 5.6l-.7-.7M19.1 19.1l-.7-.7M5.6 18.4l-.7.7M19.1 4.9l-.7.7"/>
    </svg>
    Pomodoro <span class="kbd">P</span>
  </div>

  {#if userData.isAdmin}
    <div class="nav-group-label">Admin</div>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="nav-item {path === '/admin' ? 'active' : ''}" onclick={() => nav('/admin')}>
      <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
      Nadzorna ploča
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="nav-item {path === '/all-tasks' ? 'active' : ''}" onclick={() => nav('/all-tasks')}>
      <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
      Svi zadaci
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="nav-item {path === '/create-tasks' ? 'active' : ''}" onclick={() => nav('/create-tasks')}>
      <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Kreiraj zadatke
    </div>
  {/if}

  <!-- Sidebar footer -->
  <div class="sidebar-foot">
    {#if userData.user?.photoURL && !avatarFailed}
      <div class="avatar">
        <img
          src={userData.user.photoURL}
          alt="avatar"
          referrerpolicy="no-referrer"
          onerror={() => avatarFailed = true}
        />
      </div>
    {:else}
      <div class="avatar">{initials(userData.user?.displayName ?? '')}</div>
    {/if}
    <div class="avatar-meta">
      <div class="name">{userData.user?.displayName ?? 'Korisnik'}</div>
      <div class="sub">Matura · {activeProg.badge} razina</div>
    </div>
    <button
      class="btn btn-quiet"
      style="padding: 5px 7px; margin-left: auto; flex-shrink: 0;"
      onclick={() => nav('/settings')}
      title="Postavke"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </div>
</nav>

<style>
  .badge-sq {
    width: 28px;
    height: 28px;
    border-radius: var(--r-sm);
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    font-family: var(--font-mono);
    letter-spacing: -0.02em;
  }
  .badge-sq-sm {
    width: 22px;
    height: 22px;
    font-size: 9px;
  }

  .prog-switcher {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    cursor: pointer;
    transition: background .12s;
  }
  .prog-switcher:hover { background: var(--bg-hover); }
  .ps-meta { flex: 1; min-width: 0; }
  .ps-name { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ps-kind { font-size: 10px; color: var(--text-faint); }
  .ps-chevron { color: var(--text-faint); transition: transform .15s; flex-shrink: 0; }
  .ps-chevron-open { transform: rotate(180deg); }

  .ps-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
    z-index: 50;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  .ps-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: background .1s;
  }
  .ps-option:hover { background: var(--bg-hover); }
  .ps-option-active { color: var(--primary); }
</style>
