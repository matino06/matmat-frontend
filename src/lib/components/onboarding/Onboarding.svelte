<script>
  import { apiClient } from "$lib/api/apiClient";
  import { userData } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";

  let step = $state(0);
  let level = $state("A");
  let saving = $state(false);

  async function finish() {
    saving = true;
    const courseId = level === "A" ? 1 : 2;
    try {
      await apiClient("/account/current-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      userData.needsOnboarding = false;
      goto("/tasks");
    } finally {
      saving = false;
    }
  }
</script>

<div class="onboard">
  <div class="onboard-inner">
    <div class="onboard-head">
      <div class="ob-mark">M</div>
      <div class="onboard-steps">
        <div class="dot {step === 0 ? 'active' : 'done'}"></div>
        <div class="dot {step === 1 ? 'active' : ''}"></div>
        <span class="step-label">Korak {step + 1} od 2</span>
      </div>
    </div>

    <div class="onboard-body">
      {#if step === 0}
        <div style="text-align:center">
          <h2>Koju razinu polažeš?</h2>
          <p class="lead">A razina je zahtjevnija i potrebna za studije gdje matematika igra veću ulogu. Možeš promijeniti kasnije.</p>
        </div>
        <div class="grade-row">
          {#each ["A", "B"] as lv (lv)}
            <button class="grade-card {level === lv ? 'active' : ''}" onclick={() => level = lv}>
              <div class="n">{lv}</div>
              <div class="l">razina</div>
              <div class="hint">
                {lv === "A" ? "Zahtjevnija, STEM studiji" : "Osnovna, ostali studiji"}
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <div style="text-align:center">
          <div class="emoji">🎯</div>
          <h2>Sve je postavljeno!</h2>
          <p class="lead">
            Matura iz matematike · {level} razina<br/>
            Svaki dan ćeš dobiti prilagođene zadatke. Počni s prvim danas.
          </p>
        </div>
        <div class="confirm-card">
          <div class="confirm-top">
            <div class="badge-sq">M{level}</div>
            <div>
              <div class="confirm-name">Matura iz matematike</div>
              <div class="confirm-kind">Državna matura · {level} razina</div>
            </div>
          </div>
          <div class="confirm-desc">Algoritam pamti što si naučio i planira ponavljanje. Svaki dan točno onoliko zadataka koliko trebaš.</div>
        </div>
      {/if}
    </div>

    <div class="onboard-foot">
      <button class="btn btn-quiet" onclick={() => step = 0} style:visibility={step === 1 ? 'visible' : 'hidden'}>← Nazad</button>
      <div class="foot-meta">
        Matura iz matematike · <b>{level} razina</b>
      </div>
      {#if step === 0}
        <button class="btn btn-primary btn-lg" onclick={() => step = 1}>Dalje →</button>
      {:else}
        <button class="btn btn-primary btn-lg" onclick={finish} disabled={saving}>
          {saving ? "Spremam…" : "Započni učenje →"}
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .onboard {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh;
    z-index: 9000;
    background: var(--bg);
    overflow-y: auto;
    display: flex; flex-direction: column;
  }
  .onboard-inner {
    flex: 1;
    width: 100%; max-width: 720px;
    margin: 0 auto;
    padding: 40px 24px;
    display: flex; flex-direction: column;
    gap: 40px;
  }
  .onboard-head {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--border);
  }
  .onboard-body {
    flex: 1;
    display: flex; flex-direction: column; justify-content: center;
    gap: 40px;
  }
  .ob-mark {
    width: 40px; height: 40px; border-radius: var(--r-md);
    background: var(--primary);
    display: grid; place-items: center;
    color: #fff; font-weight: 800; font-size: 16px;
    font-family: var(--font-mono);
  }
  .onboard-steps {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: var(--text-faint);
  }
  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--border-strong);
    transition: background .15s;
  }
  .dot.active { background: var(--primary); }
  .dot.done { background: var(--primary); opacity: 0.55; }
  .step-label { margin-left: 8px; }

  h2 {
    font-size: 28px; font-weight: 800; letter-spacing: -0.025em;
    color: var(--text); margin: 0 0 10px;
  }
  .lead {
    font-size: 14px; color: var(--text-dim);
    line-height: 1.6; max-width: 460px; margin: 0 auto;
  }

  .grade-row {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 14px; max-width: 420px; margin: 0 auto;
  }
  .grade-card {
    padding: 26px 18px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text); cursor: pointer;
    text-align: center;
    font-family: inherit;
    transition: border-color .15s, background .15s;
  }
  .grade-card:hover { border-color: var(--border-strong); }
  .grade-card.active {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }
  .grade-card .n {
    font-size: 38px; font-weight: 900; letter-spacing: -0.04em;
    color: var(--text); line-height: 1;
    font-family: var(--font-mono);
  }
  .grade-card.active .n { color: var(--primary); }
  .grade-card .l {
    font-size: 12px; color: var(--text-dim);
    margin-top: 4px;
  }
  .grade-card .hint {
    font-size: 11px; color: var(--text-faint);
    margin-top: 8px;
  }

  .emoji { font-size: 48px; margin-bottom: 14px; }

  .confirm-card {
    max-width: 420px; margin: 0 auto;
    padding: 22px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--bg-elev);
  }
  .confirm-top {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 12px;
  }
  .badge-sq {
    width: 36px; height: 36px; border-radius: var(--r-sm);
    background: hsl(239 75% 55%);
    display: grid; place-items: center;
    color: #fff; font-weight: 800; font-size: 12px;
    font-family: var(--font-mono); letter-spacing: -0.02em;
  }
  .confirm-name { font-size: 15px; font-weight: 600; color: var(--text); }
  .confirm-kind { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
  .confirm-desc { font-size: 13px; color: var(--text-dim); line-height: 1.6; }

  .onboard-foot {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    gap: 12px;
  }
  .foot-meta { font-size: 12px; color: var(--text-faint); }
  .foot-meta b { color: var(--text); font-weight: 600; }

  @media (max-width: 600px) {
    .foot-meta { display: none; }
    h2 { font-size: 22px; }
  }
</style>
