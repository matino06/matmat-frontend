<script>
  // Asked once: after the level choice for a new account, and on the next visit for an account that hasn't decided.
  import { AI_CONSENT_TITLE, decideAiConsent } from "$lib/store/aiConsent.svelte";
  import AiConsentDetails from "./AiConsentDetails.svelte";

  let saving = $state(null);
  let error = $state("");

  async function decide(granted) {
    saving = granted;
    error = "";
    try {
      await decideAiConsent(granted);
    } catch {
      error = "Odluka nije spremljena. Provjeri vezu i pokušaj ponovno.";
    } finally {
      saving = null;
    }
  }
</script>

<div class="consent" role="dialog" aria-modal="true" aria-labelledby="consent-h">
  <div class="consent-inner">
    <div class="consent-ico" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
      </svg>
    </div>
    <h2 id="consent-h">{AI_CONSENT_TITLE}</h2>
    <AiConsentDetails />
    <p class="consent-note">Odluku možeš promijeniti u Postavkama.</p>
    {#if error}<p class="consent-error" role="alert">{error}</p>{/if}
    <div class="consent-actions">
      <button class="btn btn-quiet" disabled={saving !== null} onclick={() => decide(false)}>
        {saving === false ? "Spremam…" : "Ne sada"}
      </button>
      <button class="btn btn-primary btn-lg" disabled={saving !== null} onclick={() => decide(true)}>
        {saving === true ? "Spremam…" : "Slažem se"}
      </button>
    </div>
  </div>
</div>

<style>
  .consent {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: var(--bg);
    overflow-y: auto;
    display: flex;
  }
  .consent-inner {
    width: 100%;
    max-width: 560px;
    margin: auto;
    padding: 40px 24px;
    display: grid;
    gap: 18px;
  }
  .consent-ico {
    width: 48px;
    height: 48px;
    border-radius: var(--r-md);
    display: grid;
    place-items: center;
    color: var(--primary);
    background: var(--primary-dim);
  }
  h2 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
  .consent-note { margin: 0; font-size: 12.5px; color: var(--text-faint); }
  .consent-error { margin: 0; font-size: 13px; color: var(--danger, #ef4444); }
  .consent-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding-top: 6px; }
</style>
