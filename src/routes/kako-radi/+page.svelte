<script>
  import MarketingShell from "$lib/components/marketing/MarketingShell.svelte";
  import GoogleButton from "$lib/components/marketing/GoogleButton.svelte";
  import ClosingCta from "$lib/components/marketing/ClosingCta.svelte";
  import ForgettingCurve from "$lib/components/marketing/ForgettingCurve.svelte";
  import RatingPicker, { RATINGS } from "$lib/components/ratingPicker/RatingPicker.svelte";
  import DemoView from "$lib/components/landing/DemoView.svelte";
  import DemoChat from "$lib/components/landing/DemoChat.svelte";
  import { DEMO_TASKS } from "$lib/components/landing/demoData";
  import { renderTaskHtml } from "$lib/utils/markdownRenderer";
  import { fitMath } from "$lib/utils/fitMath";
  import { mathjaxTypeset } from "$lib/utils/mathjax";

  // The logarithm task: short enough to show whole next to its step.
  const task = DEMO_TASKS.find((t) => t.id === 72);

  // The rating picker here only shows what each rating schedules.
  let picked = $state(null);
</script>

<svelte:head>
  <title>MatMat — Kako radi</title>
  <meta name="description" content="Svaki zadatak ocijeniš od 0 do 5, a MatMat iz toga računa kad ti se koji ishod vraća i koliko si spreman za maturu." />
</svelte:head>

<MarketingShell>
  <section class="kr-hero hm-wrap">
    <h1>Kako MatMat zna što trebaš ponoviti</h1>
    <p class="kr-lead">
      Svaki zadatak ocijeniš od 0 do 5. Iz tih ocjena MatMat računa kad ti se koji ishod vraća i koliko si spreman za maturu.
    </p>
    <div class="kr-actions">
      <GoogleButton />
      <a class="kr-ghost" href="/#demo">Isprobaj aplikaciju</a>
    </div>
  </section>

  <section class="kr-day hm-wrap" aria-labelledby="kr-day-h">
    <h2 id="kr-day-h">Jedan dan s MatMatom</h2>

    <ol class="kr-steps">
      <li class="kr-step">
        <div class="kr-step-text">
          <span class="kr-n">1</span>
          <h3>Dobiješ današnje zadatke</h3>
          <p>Kad otvoriš Zadatke, čeka te današnji popis: novi ishodi i oni koje je vrijeme ponoviti. Koliko ih je, ovisi o dnevnom cilju koji sam postaviš.</p>
        </div>
        <div class="kr-step-part">
          <article class="card kr-task">
            <div class="task-meta">
              <span class="badge mono">#{task.id}</span>
              <span class="badge">A razina</span>
              <span class="badge badge-dim">Matematika</span>
            </div>
            <div class="prose prose-invert prose-sm lg:prose-base !max-w-none kr-math" use:fitMath use:mathjaxTypeset={task.id}>
              {@html renderTaskHtml(task.text, task.id)}
            </div>
            <div class="kr-task-foot">
              <span class="btn btn-primary">Pokaži rješenje</span>
              <span>Pokušaj sam · <span class="kbd-chip">Space</span> za rješenje</span>
            </div>
          </article>
        </div>
      </li>

      <li class="kr-step">
        <div class="kr-step-text">
          <span class="kr-n">2</span>
          <h3>Rješavaš sam, a pomoć je uz zadatak</h3>
          <p>Rješenje je razloženo na korake, često s uputama za kalkulator i stranicom iz knjižice formula. Ako zapneš, AI asistent zna koji zadatak rješavaš i prvo ti da hint, a ne cijelo rješenje.</p>
        </div>
        <div class="kr-step-part">
          <div class="kr-chat">
            <DemoChat {task} scripted />
          </div>
        </div>
      </li>

      <li class="kr-step">
        <div class="kr-step-text">
          <span class="kr-n">3</span>
          <h3>Ocijeniš kako ti je išlo</h3>
          <p>Ocjena je jedino što MatMat od tebe traži. Budi iskren: o njoj ovisi kad ćeš isti ishod opet vidjeti. Prijeđi mišem preko ocjena i vidi što koja znači.</p>
        </div>
        <div class="kr-step-part">
          <div class="rating-row kr-rating">
            <div class="rating-label">Kako ti je išlo?</div>
            <RatingPicker onSelect={(r) => (picked = r)} />
            {#if picked}
              <p class="kr-picked">
                Uz ocjenu <b style="color:{picked.color}">{picked.k} — {picked.t}</b> logaritmi ti se vraćaju {picked.sub}.
              </p>
            {/if}
          </div>
        </div>
      </li>

      <li class="kr-step">
        <div class="kr-step-text">
          <span class="kr-n">4</span>
          <h3>MatMat rasporedi ponavljanje</h3>
          <p>Ono što ne znaš vraća se već sutra, a ono što znaš tek za nekoliko tjedana. Tako vrijeme ide na gradivo koje ti stvarno treba, a ne na zadatke koje već rješavaš napamet.</p>
        </div>
        <div class="kr-step-part">
          <DemoView part="objectives" />
        </div>
      </li>

      <li class="kr-step">
        <div class="kr-step-text">
          <span class="kr-n">5</span>
          <h3>Vidiš koliko si spreman</h3>
          <p>Spremnost se računa po ishodima, a područja se važu kao bodovi na ispitu. Na A razini algebra i funkcije nose pola bodova, pa i pola tvoje spremnosti.</p>
        </div>
        <div class="kr-step-part">
          <DemoView part="readiness" />
        </div>
      </li>
    </ol>
  </section>

  <section class="kr-scale hm-wrap" aria-labelledby="kr-scale-h">
    <h2 id="kr-scale-h">Što znači koja ocjena</h2>
    <p class="kr-section-lead">Ovo je razmak nakon jedne ocjene. Kad isti ishod opet dobro riješiš, razmak do idućeg ponavljanja raste.</p>
    <div class="kr-table">
      {#each RATINGS as r (r.k)}
        <div class="kr-row">
          <span class="kr-row-k" style="--rc:{r.color}">{r.k}</span>
          <span class="kr-row-name">{r.t}</span>
          <span class="kr-row-desc">{r.desc}</span>
          <span class="kr-row-when">vraća se {r.sub}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="kr-curve hm-wrap" aria-labelledby="kr-curve-h">
    <div class="kr-curve-text">
      <h2 id="kr-curve-h">Zašto ponavljanje, a ne bubanje</h2>
      <p class="kr-section-lead">Gradivo se najbrže zaboravlja odmah nakon učenja, a nakon svakog ponavljanja sve sporije. Zato MatMat vraća zadatak baš kad ga počneš zaboravljati: dovoljno rano da ga se još sjetiš, dovoljno kasno da ne gubiš vrijeme.</p>
    </div>
    <div class="kr-curve-chart">
      <ForgettingCurve />
    </div>
  </section>

  <ClosingCta
    title="Kreni s prvim zadatkom."
    text="Prijava traje pola minute. Razinu biraš odmah nakon nje, a MatMat prati tvoje ocjene od prvog zadatka."
    secondary={{ label: "Isprobaj aplikaciju", href: "/#demo" }}
  />
</MarketingShell>

<style>
  h1, h2, h3 { margin: 0; font-weight: 600; color: var(--text); }

  /* Hero — the landing page's, without the app preview under it. */
  .kr-hero {
    position: relative;
    padding-top: 112px;
    padding-bottom: 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .kr-hero::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: min(100vw, 1600px);
    transform: translateX(-50%);
    z-index: -1;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
    background-size: 56px 56px;
    background-position: center top;
    mask-image: radial-gradient(ellipse 60% 70% at 50% 35%, #000 30%, transparent 75%);
    pointer-events: none;
  }
  .kr-hero h1 {
    font-size: clamp(38px, 5.6vw, 68px);
    line-height: 1.04;
    letter-spacing: -0.04em;
    max-width: 12em;
    text-wrap: balance;
  }
  .kr-lead {
    margin: 24px 0 0;
    max-width: 34em;
    font-size: 18px;
    line-height: 1.6;
    color: var(--text-dim);
    text-wrap: pretty;
  }
  .kr-actions { margin-top: 32px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .kr-ghost {
    display: inline-flex;
    align-items: center;
    padding: 13px 22px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border-strong);
    color: var(--text-dim);
    font-size: 15px;
    font-weight: 500;
    transition: color 0.12s, background 0.12s, border-color 0.12s;
  }
  .kr-ghost:hover { color: var(--text); background: var(--bg-elev); border-color: var(--text-faint); }

  section h2 {
    font-size: clamp(28px, 3.4vw, 40px);
    line-height: 1.1;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  .kr-section-lead { margin: 14px 0 0; max-width: 36em; font-size: 16px; line-height: 1.65; color: var(--text-dim); }

  /* One day, step by step: text left, the real piece of the app right. */
  .kr-day { padding-top: 64px; padding-bottom: 40px; border-top: 1px solid var(--border); }
  .kr-steps { list-style: none; margin: 24px 0 0; padding: 0; }
  .kr-step {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: 56px;
    align-items: center;
    padding: 48px 0;
    border-bottom: 1px solid var(--border);
  }
  .kr-step:last-child { border-bottom: 0; }
  .kr-n {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-bottom: 16px;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-dim);
  }
  .kr-step h3 { font-size: 22px; letter-spacing: -0.02em; line-height: 1.25; }
  .kr-step-text p { margin: 12px 0 0; font-size: 16px; line-height: 1.65; color: var(--text-dim); }

  .kr-task { padding: 28px; }
  .kr-math { color: var(--text); }
  .kr-task-foot { margin-top: 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--text-faint); }
  .kr-task-foot .btn { cursor: default; }
  .kr-chat {
    height: 300px;
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    overflow: hidden;
  }
  .kr-rating { margin-top: 0; }
  .kr-picked { margin: 14px 0 0; font-size: 14px; color: var(--text-dim); }
  .kr-picked b { font-weight: 600; }

  /* The rating scale, as a list in the app's row style. */
  .kr-scale { padding-top: 72px; padding-bottom: 88px; border-top: 1px solid var(--border); }
  .kr-table { margin-top: 32px; display: flex; flex-direction: column; }
  .kr-row {
    display: grid;
    grid-template-columns: 36px 140px minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    padding: 14px 18px;
    border: 1px solid var(--border);
    border-top-width: 0;
    background: var(--bg-elev);
    font-size: 15px;
  }
  .kr-row:first-child { border-top-width: 1px; border-radius: var(--r-lg) var(--r-lg) 0 0; }
  .kr-row:last-child { border-radius: 0 0 var(--r-lg) var(--r-lg); }
  .kr-row-k {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: var(--r-md);
    border: 1px solid color-mix(in srgb, var(--rc) 35%, var(--border));
    background: color-mix(in srgb, var(--rc) 12%, var(--bg-elev));
    color: var(--rc);
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .kr-row-name { font-weight: 500; color: var(--text); }
  .kr-row-desc { color: var(--text-dim); }
  .kr-row-when { font-family: var(--font-mono); font-size: 13px; color: var(--text-dim); white-space: nowrap; }

  .kr-curve {
    padding-top: 72px;
    padding-bottom: 104px;
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: 56px;
    align-items: center;
  }

  @media (max-width: 900px) {
    .kr-step, .kr-curve { grid-template-columns: 1fr; gap: 24px; }
    .kr-step { padding: 36px 0; }
  }
  @media (max-width: 640px) {
    .kr-hero { padding-top: 64px; padding-bottom: 64px; }
    .kr-lead { font-size: 16px; }
    .kr-actions { flex-direction: column; align-items: stretch; width: 100%; max-width: 320px; }
    .kr-actions > :global(*) { justify-content: center; }
    .kr-day { padding-top: 48px; }
    .kr-task { padding: 18px; }
    .kr-row { grid-template-columns: 32px minmax(0, 1fr); gap: 4px 12px; padding: 12px 14px; }
    .kr-row-k { grid-row: span 3; align-self: start; }
    .kr-row-when { font-size: 12px; }
    .kr-scale, .kr-curve { padding-top: 48px; padding-bottom: 64px; }
  }
</style>
