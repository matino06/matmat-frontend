<script>
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import MarketingNav from "$lib/components/marketingNav/MarketingNav.svelte";
  import AppDemo from "$lib/components/landing/AppDemo.svelte";
  import DemoView from "$lib/components/landing/DemoView.svelte";
  import DemoChat from "$lib/components/landing/DemoChat.svelte";
  import HeroTiles from "$lib/components/landing/HeroTiles.svelte";
  import { DEMO_TASKS } from "$lib/components/landing/demoData";

  function start() {
    if (userData.user) goto("/tasks");
    else handleLogIn();
  }

  $effect(() => {
    if (!userData.loading && userData.user) goto("/tasks");
  });

  const FEATURES = [
    {
      id: "objectives",
      title: "Ponavljanje u pravo vrijeme",
      text: "Ocjena od 0 do 5 odlučuje kad se ishod vraća: loše riješen već sutra, savršeno riješen za 14 dana. Ono što već znaš ne vrti se u krug.",
    },
    {
      id: "readiness",
      title: "Spremnost za maturu",
      text: "Napredak se računa po ishodima i boduje kao na ispitu. Algebra i funkcije nose pola bodova A razine, pa i pola tvoje spremnosti.",
    },
    {
      id: "ai",
      title: "AI asistent uz svaki zadatak",
      text: "Zna koji zadatak rješavaš. Prvo ti da hint, a cijelo rješenje tek kad ga zatražiš. Piše na hrvatskom.",
    },
    {
      id: "exams",
      title: "Probna matura",
      text: "Prošli ispiti državne mature, pitanje po pitanje. Na kraju vidiš bodove, točne odgovore i pregled svake greške.",
    },
  ];

  let feature = $state("objectives");

  function onTabKey(e, i) {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = FEATURES[(i + d + FEATURES.length) % FEATURES.length];
    feature = next.id;
    document.getElementById(`feat-tab-${next.id}`)?.focus();
  }
</script>

{#snippet googleButton(label)}
  <button class="hm-google" onclick={start}>
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    {label}
  </button>
{/snippet}

<div class="hm">
  <MarketingNav />

  <main>
    <section class="hm-hero hm-wrap">
      <HeroTiles />
      <h1>Priprema za maturu koja pamti umjesto tebe</h1>
      <p class="hm-lead">
        Svaki dan dobiješ zadatke iz matematike s rješenjima korak po korak. Ocijeniš kako ti je išlo, a MatMat odredi kad ti isti ishod treba ponovno. Za A i B razinu državne mature.
      </p>
      <div class="hm-cta">
        {@render googleButton("Nastavi s Googleom")}
        <span class="hm-cta-note">Besplatno, bez kartice i instalacije.</span>
      </div>
    </section>

    <p class="hm-try hm-wrap">Ispod je aplikacija kakvu vidiš nakon prijave. Riješi zadatak i ocijeni ga, ili označi dio zadatka i pitaj AI.</p>

    <div class="hm-stage">
      <div class="hm-window hm-wrap-wide">
        <AppDemo />
      </div>
    </div>

    <section class="hm-features hm-wrap" aria-labelledby="hm-features-h">
      <h2 id="hm-features-h">Ti rješavaš zadatke. MatMat vodi računa o svemu ostalom.</h2>

      <div class="hm-feat">
        <div class="hm-feat-list" role="tablist" aria-orientation="vertical" aria-label="Mogućnosti">
          {#each FEATURES as f, i (f.id)}
            <button
              id="feat-tab-{f.id}"
              role="tab"
              class="hm-feat-tab"
              class:active={feature === f.id}
              aria-selected={feature === f.id}
              aria-controls="feat-panel"
              tabindex={feature === f.id ? 0 : -1}
              onclick={() => (feature = f.id)}
              onkeydown={(e) => onTabKey(e, i)}
            >
              <span class="hm-feat-title">{f.title}</span>
              <span class="hm-feat-text">{f.text}</span>
            </button>
          {/each}
        </div>

        <div class="hm-feat-panel" id="feat-panel" role="tabpanel" aria-labelledby="feat-tab-{feature}">
          {#if feature === "ai"}
            <div class="hm-feat-chat">
              <DemoChat task={DEMO_TASKS[0]} scripted />
            </div>
          {:else}
            <DemoView part={feature} />
          {/if}
        </div>
      </div>
    </section>

    <section class="hm-levels hm-wrap" aria-labelledby="hm-levels-h">
      <h2 id="hm-levels-h">A ili B razina</h2>
      <div class="hm-levels-grid">
        <div>
          <h3><span class="badge-sq" style="background: hsl(239 75% 55%)">MA</span> Matematika A razina</h3>
          <p>Sve gradivo više razine. Algebra i funkcije nose pola bodova, pa ih dobivaš najčešće.</p>
        </div>
        <div>
          <h3><span class="badge-sq" style="background: hsl(215 75% 55%)">MB</span> Matematika B razina</h3>
          <p>Zadaci prilagođeni osnovnoj razini, s više brojeva i statistike, kako se i boduje na B ispitu.</p>
        </div>
      </div>
      <p class="hm-levels-note">Razinu možeš promijeniti bilo kad, napredak za svaku se vodi posebno.</p>
    </section>

    <section class="hm-final hm-wrap">
      <h2>Prvi zadatak te čeka.</h2>
      <p>Prijava traje pola minute, a odmah nakon nje dobiješ današnje zadatke.</p>
      {@render googleButton("Nastavi s Googleom")}
    </section>
  </main>

  <footer class="hm-footer hm-wrap">
    <div class="hm-footer-brand">
      <div class="brand-mark">M</div>
      MatMat
    </div>
    <a href="/kako-radi">Kako radi</a>
    <a href="mailto:info@matmat.online">info@matmat.online</a>
    <span>© {new Date().getFullYear()} MatMat</span>
  </footer>
</div>

<style>
  /* The landing page is always dark, whatever theme the app is set to, so the
     dark tokens from app.css are pinned here for the app preview inside it. */
  .hm {
    --bg: #0a0a0b;
    --bg-elev: #111113;
    --bg-elev-2: #17171a;
    --bg-hover: #1c1c20;
    --border: #232328;
    --border-strong: #2e2e34;
    --text: #ededef;
    --text-dim: #a1a1a8;
    --text-faint: #6b6b73;
    --shadow-card: 0 1px 0 rgba(255, 255, 255, 0.03) inset;
    --success: #34d399;
    --warn: #fbbf24;
    --danger: #f87171;

    position: fixed;
    inset: 0;
    z-index: 100;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
  }
  .hm :global(:focus-visible) {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .hm-wrap { max-width: 1120px; margin: 0 auto; padding: 0 40px; }
  .hm-wrap-wide { max-width: 1240px; margin: 0 auto; }

  h1, h2 { margin: 0; font-weight: 600; color: var(--text); }

  /* Hero — centred between the syllabus tiles (HeroTiles), on a faint grid
     that fades out towards the app preview. */
  .hm-hero {
    position: relative;
    padding-top: 112px;
    padding-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .hm-hero::before {
    content: "";
    position: absolute;
    inset: 0 -200px -160px;
    z-index: -1;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 56px 56px;
    background-position: center top;
    mask-image: radial-gradient(ellipse 60% 70% at 50% 35%, #000 30%, transparent 75%);
    pointer-events: none;
  }
  .hm-hero h1 {
    position: relative;
    font-size: clamp(40px, 6.2vw, 76px);
    line-height: 1.02;
    letter-spacing: -0.04em;
    max-width: 11.5em;
    text-wrap: balance;
  }
  .hm-lead {
    position: relative;
    margin: 26px 0 0;
    max-width: 36em;
    font-size: 18px;
    line-height: 1.6;
    color: var(--text-dim);
    text-wrap: pretty;
  }
  .hm-cta {
    position: relative;
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .hm-cta-note { font-size: 13px; color: var(--text-faint); }
  .hm-try {
    margin: 36px auto 0;
    text-align: center;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-faint);
  }

  .hm-google {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 13px 22px;
    border-radius: var(--r-lg);
    background: #fff;
    color: #18181b;
    font-size: 15px;
    font-weight: 600;
    transition: background 0.12s, transform 0.06s;
  }
  .hm-google:hover { background: #e9e9ec; }
  .hm-google:active { transform: translateY(1px); }

  /* The app preview sits on a lit floor, like a product on a table. */
  .hm-stage {
    position: relative;
    margin-top: 20px;
    padding: 0 24px 96px;
  }
  .hm-stage::before {
    content: "";
    position: absolute;
    inset: 22% 0 0;
    background: radial-gradient(ellipse 60% 70% at 50% 30%, hsl(var(--primary-h) 30% 40% / 0.22), transparent 70%);
    pointer-events: none;
  }
  .hm-window {
    position: relative;
    border: 1px solid var(--border-strong);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 40px 120px rgba(0, 0, 0, 0.6);
    animation: hm-rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
  }
  @keyframes hm-rise { from { opacity: 0; transform: translateY(24px); } }
  @media (prefers-reduced-motion: reduce) { .hm-window { animation: none; } }

  /* Features */
  .hm-features { padding-top: 64px; padding-bottom: 120px; border-top: 1px solid var(--border); }
  .hm-features h2, .hm-levels h2 {
    font-size: clamp(28px, 3.4vw, 40px);
    line-height: 1.1;
    letter-spacing: -0.03em;
    max-width: 16em;
    text-wrap: balance;
  }
  .hm-feat {
    margin-top: 48px;
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
    gap: 48px;
    align-items: start;
  }
  .hm-feat-list { display: flex; flex-direction: column; }
  .hm-feat-tab {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px 0 18px 20px;
    text-align: left;
    border-left: 2px solid var(--border);
    transition: border-color 0.15s;
  }
  .hm-feat-tab:hover { border-left-color: var(--border-strong); }
  .hm-feat-tab.active { border-left-color: var(--primary); }
  .hm-feat-title { font-size: 17px; font-weight: 500; color: var(--text-dim); }
  .hm-feat-tab.active .hm-feat-title, .hm-feat-tab:hover .hm-feat-title { color: var(--text); }
  .hm-feat-text { font-size: 14px; line-height: 1.6; color: var(--text-faint); }
  .hm-feat-tab:not(.active) .hm-feat-text { display: none; }
  .hm-feat-panel {
    min-height: 400px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 28px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg);
    background-image: radial-gradient(ellipse 80% 60% at 70% 0%, rgba(255, 255, 255, 0.03), transparent);
  }
  .hm-feat-chat {
    height: 280px;
    max-width: 420px;
    margin: 0 auto;
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    overflow: hidden;
  }

  /* Levels */
  .hm-levels { padding-top: 64px; padding-bottom: 120px; border-top: 1px solid var(--border); }
  .hm-levels-grid { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .hm-levels h3 { display: flex; align-items: center; gap: 12px; margin: 0 0 10px; font-size: 17px; font-weight: 500; }
  .hm-levels p { margin: 0; font-size: 15px; line-height: 1.6; color: var(--text-dim); max-width: 34em; }
  .hm-levels .hm-levels-note { margin-top: 28px; font-size: 14px; color: var(--text-faint); }

  /* Closing */
  .hm-final { padding-top: 96px; padding-bottom: 120px; border-top: 1px solid var(--border); }
  .hm-final h2 { font-size: clamp(32px, 4.4vw, 52px); letter-spacing: -0.035em; line-height: 1.05; }
  .hm-final p { margin: 16px 0 32px; font-size: 18px; color: var(--text-dim); max-width: 30em; }

  .hm-footer {
    display: flex;
    align-items: center;
    gap: 28px;
    padding-top: 28px;
    padding-bottom: 28px;
    border-top: 1px solid var(--border);
    font-size: 13px;
    color: var(--text-faint);
  }
  .hm-footer-brand { display: flex; align-items: center; gap: 10px; color: var(--text-dim); font-weight: 500; margin-right: auto; }
  .hm-footer-brand .brand-mark { width: 22px; height: 22px; font-size: 11px; border-radius: 6px; }
  .hm-footer a:hover { color: var(--text); }

  @media (max-width: 900px) {
    .hm-feat { grid-template-columns: 1fr; gap: 24px; }
    .hm-feat-panel { min-height: 0; }
  }
  @media (max-width: 640px) {
    .hm-wrap { padding: 0 20px; }
    .hm-hero { padding-top: 64px; }
    .hm-lead { font-size: 16px; }
    .hm-stage { padding: 0 12px 64px; }
    .hm-try { margin-top: 40px; }
    .hm-feat-panel { padding: 16px; }
    .hm-levels-grid { grid-template-columns: 1fr; gap: 28px; }
    .hm-footer { flex-wrap: wrap; gap: 14px 20px; }
  }
</style>
