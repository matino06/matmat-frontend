<script>
  import { onMount } from "svelte";
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import MarketingShell from "$lib/components/marketing/MarketingShell.svelte";
  import GoogleButton from "$lib/components/marketing/GoogleButton.svelte";
  import ClosingCta from "$lib/components/marketing/ClosingCta.svelte";
  import AppDemo from "$lib/components/landing/AppDemo.svelte";
  import DemoView from "$lib/components/landing/DemoView.svelte";
  import DemoChat from "$lib/components/landing/DemoChat.svelte";
  import HeroTiles from "$lib/components/landing/HeroTiles.svelte";
  import { rememberLevel } from "$lib/utils/levelChoice";
  import { DEMO_TASKS } from "$lib/components/landing/demoData";

  function start() {
    if (userData.user) goto("/tasks");
    else handleLogIn();
  }

  $effect(() => {
    if (!userData.loading && userData.user) goto("/tasks");
  });

  function toDemo(e) {
    e.preventDefault();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("demo")?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
  }

  // Picking a level signs in like the other buttons; a new account's onboarding
  // then opens on that level. Existing accounts keep the course they have.
  function chooseLevel(level) {
    rememberLevel(level);
    start();
  }

  const LEVELS = [
    {
      id: "A",
      name: "Viša razina",
      badge: "MA",
      color: "239",
      text: "Za učenike koji polažu A razinu. Sve gradivo, a algebra i funkcije nose pola bodova, pa ih dobivaš najčešće.",
    },
    {
      id: "B",
      name: "Osnovna razina",
      badge: "MB",
      color: "215",
      text: "Za učenike koji polažu B razinu. Zadaci prate bodovanje B ispita, s više brojeva i statistike.",
    },
  ];

  // `lead` is the one-line benefit, readable without opening the item; `text`
  // is the detail shown for the open one.
  const FEATURES = [
    {
      id: "objectives",
      title: "Ponavljanje u pravo vrijeme",
      lead: "MatMat pamti koje zadatke znaš, a koje trebaš ponoviti.",
      text: "Ocjena od 0 do 5 odlučuje kad se ishod vraća: loše riješen već sutra, a svako iduće dobro rješenje razmak produljuje, od 6 dana do nekoliko tjedana. Ono što već znaš ne vrti se u krug.",
    },
    {
      id: "readiness",
      title: "Spremnost za maturu",
      lead: "U svakom trenutku vidiš koliko si spreman za ispit.",
      text: "Napredak se računa po ishodima i boduje kao na ispitu. Algebra i funkcije nose pola bodova A razine, pa i pola tvoje spremnosti.",
    },
    {
      id: "ai",
      title: "AI asistent uz svaki zadatak",
      lead: "Pomoć baš za zadatak koji upravo rješavaš.",
      text: "Prvo ti da hint, a cijelo rješenje tek kad ga zatražiš. Označi dio rješenja i pitaj ga baš za taj korak. Piše na hrvatskom.",
    },
    {
      id: "exams",
      title: "Probna matura",
      lead: "Prošli ispiti državne mature, riješeni kao na pravom ispitu.",
      text: "Rješavaš pitanje po pitanje, a na kraju vidiš bodove, točne odgovore i pregled svake greške.",
    },
  ];

  let feature = $state("objectives");

  // On narrow screens the list becomes an accordion: the part of the app opens
  // right under the item that was tapped instead of below the whole list.
  let narrow = $state(false);
  onMount(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => (narrow = mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  });

  function onTabKey(e, i) {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = FEATURES[(i + d + FEATURES.length) % FEATURES.length];
    feature = next.id;
    document.getElementById(`feat-tab-${next.id}`)?.focus();
  }
</script>

<MarketingShell>
  <section class="hm-hero hm-wrap">
    <HeroTiles />
    <h1>Priprema za maturu koja pamti umjesto tebe</h1>
    <p class="hm-lead">
      Svaki dan dobiješ zadatke iz matematike s rješenjima korak po korak. Ocijeniš kako ti je išlo, a MatMat odredi kad ti isti ishod treba ponovno. Za A i B razinu državne mature.
    </p>
    <div class="hm-cta">
      <GoogleButton />
      <span class="hm-cta-note">Besplatno, bez kartice i instalacije.</span>
    </div>
  </section>

  <p class="hm-try hm-wrap">Ispod je aplikacija kakvu vidiš nakon prijave. Riješi zadatak i ocijeni ga, ili označi dio zadatka i pitaj AI.</p>

  <div class="hm-stage" id="demo">
    <div class="hm-window hm-wrap-wide">
      <AppDemo />
    </div>
  </div>

  <section class="hm-features hm-wrap" aria-labelledby="hm-features-h">
    <h2 id="hm-features-h">Ti rješavaš zadatke. MatMat vodi računa o svemu ostalom.</h2>

    {#snippet featPart()}
      {#if feature === "ai"}
        <div class="hm-feat-chat">
          <DemoChat task={DEMO_TASKS[0]} scripted />
        </div>
      {:else}
        <DemoView part={feature} />
      {/if}
    {/snippet}

    <div class="hm-feat">
      {#if narrow}
        <div class="hm-feat-list">
          {#each FEATURES as f (f.id)}
            <button
              class="hm-feat-tab"
              class:active={feature === f.id}
              aria-expanded={feature === f.id}
              onclick={() => (feature = f.id)}
            >
              <span class="hm-feat-title">{f.title}</span>
              <span class="hm-feat-lead">{f.lead}</span>
              <span class="hm-feat-text">{f.text}</span>
            </button>
            {#if feature === f.id}
              <div class="hm-feat-inline">{@render featPart()}</div>
            {/if}
          {/each}
        </div>
      {:else}
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
              <span class="hm-feat-lead">{f.lead}</span>
              <span class="hm-feat-text">{f.text}</span>
            </button>
          {/each}
        </div>

        <div class="hm-feat-panel" id="feat-panel" role="tabpanel" aria-labelledby="feat-tab-{feature}">
          {@render featPart()}
        </div>
      {/if}
    </div>
  </section>

  <section class="hm-levels hm-wrap" aria-labelledby="hm-levels-h">
    <h2 id="hm-levels-h">Koju razinu polažeš?</h2>
    <div class="hm-levels-grid">
      {#each LEVELS as l (l.id)}
        <button class="hm-level" onclick={() => chooseLevel(l.id)}>
          <span class="hm-level-head">
            <span class="badge-sq" style="background: hsl({l.color} 75% 55%)">{l.badge}</span>
            <span class="hm-level-title">
              <span class="hm-level-name">{l.id} razina</span>
              <span class="hm-level-kind">{l.name}</span>
            </span>
          </span>
          <span class="hm-level-text">{l.text}</span>
          <span class="hm-level-cta">
            Odaberi {l.id} razinu
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </span>
        </button>
      {/each}
    </div>
  </section>

  <ClosingCta
    title="Prvi zadatak te čeka."
    text="MatMat je besplatan i radi u pregledniku. Prijavi se Googleom i odmah dobiješ današnje zadatke."
    secondary={{ label: "Isprobaj aplikaciju", href: "#demo", onclick: toDemo }}
  />
</MarketingShell>

<style>
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
    top: 0;
    bottom: -160px;
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

  /* The app preview sits on a lit floor, like a product on a table. */
  .hm-stage {
    position: relative;
    scroll-margin-top: 88px;
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
  .hm-feat-title { font-size: 13px; font-weight: 500; color: var(--text-faint); }
  .hm-feat-tab.active .hm-feat-title { color: var(--primary); }
  .hm-feat-lead { font-size: 17px; font-weight: 500; line-height: 1.4; color: var(--text-dim); text-wrap: pretty; }
  .hm-feat-tab.active .hm-feat-lead, .hm-feat-tab:hover .hm-feat-lead { color: var(--text); }
  .hm-feat-text { margin-top: 2px; font-size: 15.5px; line-height: 1.6; color: var(--text-dim); }
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
  .hm-levels-grid { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .hm-levels .badge-sq { width: 32px; height: 32px; font-size: 11px; }
  /* The whole column is the button: no card fill until hover, so the section
     stays as light as the rest of the page. */
  .hm-level {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 22px 24px;
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }
  .hm-level:hover { background: var(--bg-elev); border-color: var(--primary-border); }
  .hm-level-head { display: flex; align-items: center; gap: 12px; }
  .hm-level-title { display: flex; flex-direction: column; line-height: 1.25; }
  .hm-level-name { font-size: 17px; font-weight: 500; color: var(--text); }
  .hm-level-kind { font-size: 13px; color: var(--text-faint); }
  .hm-level-text { font-size: 15px; line-height: 1.6; color: var(--text-dim); max-width: 34em; }
  .hm-level-cta {
    margin-top: auto;
    padding-top: 6px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 500;
    color: var(--primary);
  }
  .hm-level-cta svg { transition: transform 0.15s; }
  .hm-level:hover .hm-level-cta svg { transform: translateX(3px); }
  .hm-levels .hm-levels-note { margin-top: 28px; font-size: 14px; color: var(--text-faint); }

  .hm-feat-inline { padding: 4px 0 20px 20px; border-left: 2px solid var(--primary); animation: hm-fade 0.2s ease-out; }
  @keyframes hm-fade { from { opacity: 0; } }

  @media (max-width: 900px) {
    .hm-feat { grid-template-columns: 1fr; margin-top: 32px; }
    .hm-feat-tab { padding: 16px 0 12px 18px; }
    .hm-feat-tab.active { padding-bottom: 14px; }
    .hm-feat-inline { padding-left: 18px; }
    .hm-feat-chat { max-width: none; }
  }
  @media (max-width: 640px) {
    .hm-hero { padding-top: 64px; }
    .hm-lead { font-size: 16px; }
    .hm-stage { padding: 0 16px 64px; }
    .hm-try { margin-top: 40px; }
    .hm-features, .hm-levels { padding-top: 48px; padding-bottom: 72px; }
    .hm-feat-lead { font-size: 16px; }
    .hm-feat-text { font-size: 15px; }
    .hm-levels-grid { grid-template-columns: 1fr; gap: 12px; }
    .hm-level { padding: 18px 20px; }

  }
</style>
