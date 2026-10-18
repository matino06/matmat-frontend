<script>
  import { apiClient } from "$lib/api/apiClient";
  import { userData, logout } from "$lib/store/user.svelte";
  import { aiConsent, decideAiConsent } from "$lib/store/aiConsent.svelte";
  import AiConsentDetails from "$lib/components/ai/AiConsentDetails.svelte";
  import { ownCourses } from "$lib/store/ownCourses.svelte";
  import { feedbackSound, setFeedbackSound } from "$lib/sound.svelte.js";

  let learningReminders = $state(false);
  let featureAnnouncements = $state(false);
  let selectedTempo = $state(null);

  let notifLoading = $state(true);
  let tempoLoading = $state(true);
  let savingNotifs = $state(false);
  let savingTempo = $state(false);
  let notifSavedTimer = $state(null);
  let notifJustSaved = $state(false);

  // Brisanje računa (DELETE /account): sve se briše odmah i zauvijek, pa se korisnik odjavljuje.
  let deletingAccount = $state(false);
  let accountDeleteBusy = $state(false);
  let accountDeleted = $state(false);
  let accountDeleteError = $state("");

  function openAccountDelete() {
    accountDeleteError = "";
    deletingAccount = true;
  }

  function closeAccountDelete() {
    if (!accountDeleteBusy && !accountDeleted) deletingAccount = false;
  }

  async function confirmAccountDelete() {
    if (accountDeleteBusy) return;
    accountDeleteBusy = true;
    accountDeleteError = "";
    try {
      const r = await apiClient("/account", { method: "DELETE" });
      // 404: an earlier try already deleted it, but its answer was lost.
      if (!r.ok && r.status !== 404) throw new Error(String(r.status));
      accountDeleted = true;
    } catch {
      accountDeleteError = "Račun nije obrisan. Provjeri vezu i pokušaj ponovno.";
    } finally {
      accountDeleteBusy = false;
    }
  }

  // AI consent: the switch saves at once; a failure puts it back.
  let savingAiConsent = $state(false);
  let aiConsentError = $state("");

  async function setAiConsent(granted, checkbox) {
    savingAiConsent = true;
    aiConsentError = "";
    try {
      await decideAiConsent(granted);
    } catch {
      checkbox.checked = !granted;
      aiConsentError = "Promjena nije spremljena. Pokušaj ponovno.";
    } finally {
      savingAiConsent = false;
    }
  }

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

  <!-- Sound card: device-only, kept in localStorage -->
  <div class="card card-pad" style="margin-top: 16px">
    <label class="notif-row">
      <input type="checkbox" checked={feedbackSound.on} onchange={(e) => setFeedbackSound(e.currentTarget.checked)} />
      <div>
        <div class="notif-title">Zvuk točnog odgovora</div>
        <div class="notif-desc">Tih zvuk za točan odgovor i svladanu lekciju.</div>
      </div>
    </label>
  </div>

  <!-- AI consent card -->
  <div class="card card-pad" style="margin-top: 16px">
    <div class="settings-head">
      <div>
        <h2 class="settings-title">AI</h2>
        <p class="settings-desc">AI asistent i AI ocjenjivanje probne mature.</p>
      </div>
      {#if savingAiConsent}<span class="settings-saving">Spremanje…</span>{/if}
    </div>

    {#if !aiConsent.loaded}
      <div class="settings-loading"><div class="spinner"></div> Učitavanje…</div>
    {:else}
      <label class="notif-row">
        <input
          type="checkbox"
          checked={aiConsent.granted === true}
          disabled={savingAiConsent}
          onchange={(e) => setAiConsent(e.currentTarget.checked, e.currentTarget)}
        />
        <div>
          <div class="notif-title">Dozvola za AI</div>
          <div class="notif-desc">Bez nje AI asistent i AI ocjenjivanje su isključeni; sve ostalo radi.</div>
        </div>
      </label>
      {#if aiConsentError}<p class="ai-consent-error" role="alert">{aiConsentError}</p>{/if}
    {/if}

    <details class="ai-consent-more">
      <summary>Što se šalje AI-ju</summary>
      <AiConsentDetails />
    </details>
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

    <div class="danger-zone">
      <div>
        <div class="notif-title">Obriši račun</div>
        <div class="notif-desc">Račun i svi podaci brišu se odmah i zauvijek.</div>
      </div>
      <button class="btn btn-quiet delete-account-btn" onclick={openAccountDelete}>Obriši račun</button>
    </div>
  </div>
</div>

{#if deletingAccount}
  <div class="modal-bg" role="presentation" onclick={closeAccountDelete}>
    <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="del-account-h" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === "Escape" && closeAccountDelete()}>
      {#if accountDeleted}
        <h2 id="del-account-h">Račun je obrisan</h2>
        <p>Potvrda ti stiže e-mailom. Hvala što si učio/la s MatMatom.</p>
        <div class="actions">
          <button class="btn btn-primary" onclick={logout}>U redu</button>
        </div>
      {:else}
        <h2 id="del-account-h">Obrisati račun zauvijek?</h2>
        <p>Odmah i zauvijek se briše:</p>
        <ul class="delete-list">
          <li>napredak, riješeni zadaci i niz dana</li>
          <li>razgovori s AI asistentom</li>
          <li>probni ispiti i fotografije odgovora</li>
          {#if ownCourses.isCreator}<li>vlastiti predmeti i učitani materijali</li>{/if}
          <li>postavke i e-mail obavijesti</li>
          <li>prijava preko Googlea ili Applea</li>
        </ul>
        <p>To se ne može poništiti. Potvrda stiže na {userData.user?.email ?? "adresu tvog računa"}.</p>
        {#if accountDeleteError}<p class="delete-error" role="alert">{accountDeleteError}</p>{/if}
        <div class="actions">
          <button class="btn btn-ghost" disabled={accountDeleteBusy} onclick={closeAccountDelete}>Odustani</button>
          <button class="btn btn-danger" disabled={accountDeleteBusy} onclick={confirmAccountDelete}>
            {accountDeleteBusy ? "Brišem…" : "Obriši račun zauvijek"}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

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

  .ai-consent-error { margin: 10px 0 0; font-size: 12.5px; color: var(--danger, #ef4444); }
  .ai-consent-more { margin-top: 14px; }
  .ai-consent-more summary { cursor: pointer; font-size: 13px; color: var(--text-dim); margin-bottom: 12px; }

  .danger-zone {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
  .delete-account-btn { color: var(--danger, #ef4444); flex-shrink: 0; }

  .modal-bg { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: grid; place-items: center; z-index: 1000; padding: 16px; }
  .modal { padding: var(--pad-5); max-width: 440px; width: 100%; display: grid; gap: 14px; }
  .modal h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .modal p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-dim); }
  .delete-list { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 1.7; color: var(--text); }
  .delete-error { color: var(--danger, #ef4444) !important; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }

  @media (max-width: 600px) {
    .tempo-grid { grid-template-columns: 1fr; }
    .danger-zone { flex-direction: column; align-items: flex-start; }
  }
</style>
