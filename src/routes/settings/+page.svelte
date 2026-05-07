<script>
  import { apiClient } from "$lib/api/apiClient";
  import { userData, logout } from "$lib/store/user.svelte";

  let learningReminders = $state(false);
  let featureAnnouncements = $state(false);
  let selectedTempo = $state(null);

  let notifLoading = $state(true);
  let tempoLoading = $state(true);
  let savingNotifs = $state(false);
  let savingTempo = $state(false);
  let notifSavedTimer = $state(null);
  let notifJustSaved = $state(false);

  const TEMPO_OPTIONS = [
    { value: 1, name: "Ubrzani", desc: "Brže otključavanje novih lekcija — više izazova" },
    { value: 2, name: "Temeljiti", desc: "Sporije otključavanje — više vježbe na svakoj cjelini" },
  ];

  async function fetchNotifs() {
    notifLoading = true;
    try {
      const r = await apiClient("/account/notification-settings", { method: "GET" });
      if (r.ok) {
        const d = await r.json();
        learningReminders = !!d.learningRemindersEnabled;
        featureAnnouncements = !!d.featureAnnouncementsEnabled;
      }
    } finally {
      notifLoading = false;
    }
  }

  async function fetchTempo() {
    tempoLoading = true;
    try {
      const r = await apiClient("/account/tempo", { method: "GET" });
      if (r.ok) selectedTempo = await r.json();
    } finally {
      tempoLoading = false;
    }
  }

  async function saveNotifs() {
    savingNotifs = true;
    try {
      const r = await apiClient("/account/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learningRemindersEnabled: learningReminders,
          featureAnnouncementsEnabled: featureAnnouncements,
        }),
      });
      if (r.ok) {
        notifJustSaved = true;
        if (notifSavedTimer) clearTimeout(notifSavedTimer);
        notifSavedTimer = setTimeout(() => notifJustSaved = false, 2000);
      }
    } finally {
      savingNotifs = false;
    }
  }

  async function setTempo(value) {
    if (selectedTempo === value || savingTempo) return;
    savingTempo = true;
    try {
      const r = await apiClient("/account/tempo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      if (r.ok) selectedTempo = value;
    } finally {
      savingTempo = false;
    }
  }

  $effect(() => {
    if (userData.user) {
      fetchNotifs();
      fetchTempo();
    }
  });
</script>

<div class="page">
  <div class="zadaci-head" style="margin-bottom: 20px">
    <div>
      <h1>Postavke</h1>
      <div class="sub">Tempo učenja i obavijesti</div>
    </div>
  </div>

  <!-- Tempo card -->
  <div class="card card-pad">
    <div class="settings-head">
      <div>
        <h2 class="settings-title">Tempo učenja</h2>
        <p class="settings-desc">Određuje brzinu otključavanja novih lekcija.</p>
      </div>
      {#if savingTempo}
        <span class="settings-saving">Spremanje…</span>
      {/if}
    </div>

    {#if tempoLoading}
      <div class="settings-loading"><div class="spinner"></div> Učitavanje…</div>
    {:else}
      <div class="tempo-grid">
        {#each TEMPO_OPTIONS as opt (opt.value)}
          <button
            class="tempo-card {selectedTempo === opt.value ? 'active' : ''}"
            onclick={() => setTempo(opt.value)}
            disabled={savingTempo}
          >
            <div class="tempo-card-top">
              <div class="tempo-name">{opt.name}</div>
              {#if selectedTempo === opt.value}
                <div class="tempo-check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              {/if}
            </div>
            <div class="tempo-desc">{opt.desc}</div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Notifications card -->
  <div class="card card-pad" style="margin-top: 16px">
    <div class="settings-head">
      <div>
        <h2 class="settings-title">Obavijesti</h2>
        <p class="settings-desc">Možete ih isključiti u bilo kojem trenutku.</p>
      </div>
      {#if notifJustSaved}
        <span class="settings-saved">Spremljeno ✓</span>
      {/if}
    </div>

    {#if notifLoading}
      <div class="settings-loading"><div class="spinner"></div> Učitavanje…</div>
    {:else}
      <div class="notif-list">
        <label class="notif-row">
          <input type="checkbox" bind:checked={learningReminders}/>
          <div>
            <div class="notif-title">Podsjetnici za učenje</div>
            <div class="notif-desc">Svakodnevni podsjetnici ako niste aktivni.</div>
          </div>
        </label>
        <label class="notif-row">
          <input type="checkbox" bind:checked={featureAnnouncements}/>
          <div>
            <div class="notif-title">Obavijesti o novim značajkama i predmetima</div>
            <div class="notif-desc">Saznaj prvi za novitete.</div>
          </div>
        </label>
      </div>

      <button class="btn btn-primary" onclick={saveNotifs} disabled={savingNotifs} style="margin-top: 18px">
        {savingNotifs ? "Spremanje…" : "Spremi"}
      </button>
    {/if}
  </div>

  <!-- Account card -->
  <div class="card card-pad" style="margin-top: 16px">
    <div class="settings-head">
      <div>
        <h2 class="settings-title">Račun</h2>
        <p class="settings-desc">Prijavljen{userData.user?.displayName ? `/a kao ${userData.user.displayName}` : ''}{userData.user?.email ? ` · ${userData.user.email}` : ''}.</p>
      </div>
    </div>

    <button class="btn btn-quiet logout-btn" onclick={logout}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Odjavi se
    </button>
  </div>
</div>

<style>
  .settings-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }
  .settings-title { font-size: 16px; font-weight: 500; margin: 0 0 4px; }
  .settings-desc { font-size: 13px; color: var(--text-dim); margin: 0; line-height: 1.5; }
  .settings-saving { font-size: 11px; color: var(--text-faint); }
  .settings-saved { font-size: 11px; color: var(--success); font-weight: 500; }

  .settings-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-faint);
    font-size: 13px;
    padding: 12px 0;
  }

  .tempo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .tempo-card {
    text-align: left;
    padding: 14px 16px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    cursor: pointer;
    transition: border-color .12s, background .12s;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tempo-card:hover { border-color: var(--border-strong); background: var(--bg-hover); }
  .tempo-card.active { border-color: var(--primary); background: var(--primary-dim); }
  .tempo-card:disabled { cursor: not-allowed; opacity: 0.7; }
  .tempo-card-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .tempo-name { font-size: 14px; font-weight: 500; color: var(--text); }
  .tempo-card.active .tempo-name { color: var(--primary); }
  .tempo-desc { font-size: 12px; color: var(--text-dim); line-height: 1.5; }
  .tempo-check {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    display: grid; place-items: center;
    flex-shrink: 0;
  }

  .notif-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .notif-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    cursor: pointer;
    transition: background .1s;
  }
  .notif-row:hover { background: var(--bg-hover); }
  .notif-row input[type="checkbox"] {
    width: 16px; height: 16px;
    margin-top: 2px;
    accent-color: var(--primary);
    flex-shrink: 0;
    cursor: pointer;
  }
  .notif-title { font-size: 13px; font-weight: 500; color: var(--text); }
  .notif-desc { font-size: 12px; color: var(--text-dim); margin-top: 2px; line-height: 1.4; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .logout-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text);
  }
  .logout-btn:hover { color: var(--danger, #ef4444); }

  @media (max-width: 600px) {
    .tempo-grid { grid-template-columns: 1fr; }
  }
</style>
