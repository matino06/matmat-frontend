<script>
  import { userData } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import { readRememberedLevel, clearRememberedLevel } from "$lib/utils/levelChoice";
  import { getProgram, PROGRAMS, isSelectableProgram, shortName } from "$lib/config/programs";
  import { saveChosenCourses, saveCurrentCourse } from "$lib/store/course.svelte";
  import { showErrorAlert } from "$lib/store/errorAlert.svelte";
  import SubjectPicker from "$lib/components/subjects/SubjectPicker.svelte";

  // A level picked on the landing page preselects that maths level. If maths is
  // all there is to pick, the subject step has nothing left to ask and is
  // skipped; "Nazad" still lets the student change it.
  const remembered = readRememberedLevel();
  const onlyMaths = PROGRAMS.filter((p) => isSelectableProgram(p, userData.isAdmin)).every((p) => p.subject === "matematika");
  let picked = $state([remembered === "B" ? 2 : 1]);
  let step = $state(remembered && onlyMaths ? 1 : 0);
  let startId = $state(null);
  let saving = $state(false);

  let programs = $derived(picked.map(getProgram));
  let start = $derived(programs.find((p) => p.id === startId) ?? programs[0]);

  async function finish() {
    saving = true;
    try {
      // The list only shapes the switcher, so a backend without it doesn't
      // block the start; the course to study is what has to be saved.
      await saveChosenCourses(picked).catch(() => {});
      await saveCurrentCourse(start.id);
      clearRememberedLevel();
      userData.needsOnboarding = false;
      // The walkthrough shows how repetition is planned; it ends on /tasks.
      goto("/uvod");
    } catch {
      showErrorAlert("Odabir nije spremljen. Provjeri vezu i pokušaj ponovno.");
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
        <div class="intro">
          <h2>Što polažeš na maturi?</h2>
          <p class="lead">Odaberi sve predmete koje želiš vježbati. Kasnije ih možeš dodati ili maknuti.</p>
        </div>
        <div class="picker">
          <SubjectPicker bind:value={picked} isAdmin={userData.isAdmin} />
          <p class="own-note">Ne vidiš svoj predmet? Uskoro ćeš moći složiti vlastiti iz svojih materijala.</p>
        </div>
      {:else if programs.length > 1}
        <div class="intro">
          <h2>Čime počinješ?</h2>
          <p class="lead">Između predmeta se prebacuješ u izborniku na vrhu bočne trake.</p>
        </div>
        <div class="start-list" role="radiogroup" aria-label="Predmet s kojim počinješ">
          {#each programs as p (p.id)}
            <button
              type="button"
              role="radio"
              aria-checked={start === p}
              class="start-card {start === p ? 'active' : ''}"
              onclick={() => startId = p.id}
            >
              <span class="badge-sq" style:background="hsl({p.color} 75% 55%)">{p.badge}</span>
              <span>
                <span class="confirm-name">{p.label}</span>
                <span class="confirm-kind">{p.sub}</span>
              </span>
              <span class="radio" aria-hidden="true"></span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="intro">
          <div class="emoji">🎯</div>
          <h2>Sve je postavljeno!</h2>
          <p class="lead">Svaki dan ćeš dobiti prilagođene zadatke. Počni s prvim danas.</p>
        </div>
        <div class="confirm-card">
          <div class="confirm-top">
            <div class="badge-sq" style:background="hsl({start.color} 75% 55%)">{start.badge}</div>
            <div>
              <div class="confirm-name">{start.label}</div>
              <div class="confirm-kind">{start.sub}</div>
            </div>
          </div>
          <div class="confirm-desc">Algoritam pamti što si naučio i planira ponavljanje. Svaki dan točno onoliko zadataka koliko trebaš.</div>
        </div>
      {/if}
    </div>

    <div class="onboard-foot">
      <button class="btn btn-quiet" onclick={() => step = 0} disabled={saving} style:visibility={step === 1 ? 'visible' : 'hidden'}>← Nazad</button>
      <div class="foot-meta">
        {#if programs.length}
          {#each programs as p, i (p.id)}{i ? ", " : ""}<b>{shortName(p)}</b>{/each}
        {:else}
          Odaberi barem jedan predmet
        {/if}
      </div>
      {#if step === 0}
        <button class="btn btn-primary btn-lg" onclick={() => step = 1} disabled={!programs.length}>Dalje →</button>
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

  .intro { text-align: center; }
  .picker { width: 100%; max-width: 480px; margin: 0 auto; }
  .own-note {
    margin: 14px 0 0; text-align: center;
    font-size: 12px; color: var(--text-faint); line-height: 1.5;
  }

  .start-list {
    width: 100%; max-width: 420px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 10px;
  }
  .start-card {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text); cursor: pointer;
    text-align: left; font: inherit;
    transition: border-color .15s, background .15s;
  }
  .start-card > span:nth-child(2) { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .start-card:hover { border-color: var(--border-strong); }
  .start-card.active {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }
  .start-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .radio {
    width: 18px; height: 18px; border-radius: 50%;
    border: 1.5px solid var(--border-strong);
    flex-shrink: 0;
    transition: border-color .15s, border-width .15s;
  }
  .start-card.active .radio { border: 5px solid var(--primary); }

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
    display: grid; place-items: center; flex-shrink: 0;
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
  .foot-meta { text-align: center; }
  .foot-meta b { color: var(--text); font-weight: 600; }

  @media (max-width: 600px) {
    .foot-meta { display: none; }
    h2 { font-size: 22px; }
  }
</style>
