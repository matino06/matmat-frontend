<script>
  import { page } from "$app/state";
  import AppStoreBadge from "$lib/components/marketing/AppStoreBadge.svelte";

  // The iPhone app on the landing page: real screens from the App Store set in a
  // phone you can flip through, what the app adds, and how to get it from here.
  // A desktop visitor scans the QR code with their phone; a phone gets the badge.
  const SCREENS = [
    { id: "zadaci", label: "Zadaci", src: "/images/app/01-zadaci.jpg", alt: "Zadaci za danas: zadatak iz kompleksnih brojeva rastavljen na korake a, b i c" },
    { id: "lekcija", label: "Lekcija", src: "/images/app/03-lekcija.jpg", alt: "Lekcija u kojoj klizačem mijenjaš amplitudu dok se tvoj graf ne poklopi s grafom iz zadatka" },
    { id: "mapa", label: "Mapa", src: "/images/app/04-mapa.jpg", alt: "Mapa gradiva: riješene cjeline označene kvačicom, a iduća čeka na gumbu Kreni" },
    { id: "matura", label: "Matura", src: "/images/app/07-matura.jpg", alt: "Probna matura s tipkovnicom za razlomke, korijene i potencije" },
  ];

  const PERKS = [
    { title: "Podsjetnik u vrijeme koje odabereš", text: "Javi se samo ako današnji zadaci još čekaju, pa ne izgubiš niz." },
    { title: "Pomodoro na zaključanom zaslonu", text: "Koliko je ostalo do pauze, vidiš i kad zaključaš mobitel." },
    { title: "Isti račun na mobitelu i računalu", text: "Prijaviš se istim Google računom i nastavljaš gdje si stao." },
  ];

  let shown = $state("zadaci");
  let platform = $derived(page.data.platform ?? { os: "other", phone: false, appUrl: null });
  let androidPhone = $derived(platform.os === "android" && platform.phone && !platform.appUrl);
  // Read on an iPhone, the page is already selling the app; elsewhere it first
  // has to say that on a phone MatMat is an app.
  let onIphone = $derived(platform.os === "ios" && platform.phone);

  function onTabKey(e, i) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = SCREENS[(i + d + SCREENS.length) % SCREENS.length];
    shown = next.id;
    document.getElementById(`app-tab-${next.id}`)?.focus();
  }
</script>

<section class="as hm-wrap" id="aplikacija" aria-labelledby="as-h">
  <div class="as-text">
    {#if onIphone}
      <h2 id="as-h">Ovako MatMat izgleda na tvom iPhoneu</h2>
      <p class="as-lead">Današnji zadaci, lekcije, mapa gradiva i probna matura, sve u jednoj aplikaciji.</p>
    {:else}
      <h2 id="as-h">Na mobitelu, MatMat je aplikacija</h2>
      <p class="as-lead">
        Na iPhoneu i iPadu sve radi u aplikaciji, od današnjih zadataka do probne mature. Android aplikacija stiže uskoro.
      </p>
    {/if}

    <ul class="as-perks">
      {#each PERKS as p (p.title)}
        <li>
          <span class="as-perk-title">{p.title}</span>
          <span class="as-perk-text">{p.text}</span>
        </li>
      {/each}
    </ul>

    <div class="as-get">
      {#if androidPhone}
        <p class="as-android">
          <b>Android aplikacija stiže uskoro.</b> Do tada MatMat radi ovdje u pregledniku, s istim računom koji ćeš poslije koristiti u aplikaciji.
        </p>
      {:else if platform.phone || platform.os === "ios"}
        <AppStoreBadge height={52} placement="showcase" />
      {:else}
        <div class="as-qr">
          <img src="/badges/app-qr.svg" alt="QR kod koji vodi na MatMat u App Storeu" width="112" height="112" />
        </div>
        <div class="as-qr-text">
          <span class="as-qr-title">Skeniraj kamerom iPhonea</span>
          <span class="as-qr-sub">ili otvori aplikaciju u App Storeu:</span>
          <AppStoreBadge height={44} placement="showcase" />
        </div>
      {/if}
    </div>
  </div>

  <div class="as-device">
    <div class="as-phone">
      <div class="as-screen" id="app-screen" role="tabpanel" aria-labelledby="app-tab-{shown}">
        {#each SCREENS as s, i (s.id)}
          <img
            src={s.src}
            alt={s.alt}
            class:on={shown === s.id}
            aria-hidden={shown !== s.id}
            loading={i === 0 ? "eager" : "lazy"}
            width="660"
            height="1434"
          />
        {/each}
      </div>
    </div>
    <div class="as-tabs" role="tablist" aria-label="Zasloni aplikacije">
      {#each SCREENS as s, i (s.id)}
        <button
          id="app-tab-{s.id}"
          role="tab"
          class:active={shown === s.id}
          aria-selected={shown === s.id}
          aria-controls="app-screen"
          tabindex={shown === s.id ? 0 : -1}
          onclick={() => (shown = s.id)}
          onkeydown={(e) => onTabKey(e, i)}>{s.label}</button
        >
      {/each}
    </div>
  </div>
</section>

<style>
  .as {
    position: relative;
    scroll-margin-top: 64px;
    padding-top: 64px;
    padding-bottom: 120px;
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
    gap: 64px;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: clamp(28px, 3.4vw, 40px);
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: var(--text);
    max-width: 14em;
    text-wrap: balance;
  }
  .as-lead {
    margin: 20px 0 0;
    max-width: 30em;
    font-size: 17px;
    line-height: 1.6;
    color: var(--text-dim);
    text-wrap: pretty;
  }

  /* The perks hang off one rule, like the feature list above them. */
  .as-perks {
    margin: 36px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 20px;
    border-left: 2px solid var(--border);
  }
  .as-perks li { display: flex; flex-direction: column; gap: 4px; padding-left: 20px; }
  .as-perk-title { font-size: 16px; font-weight: 500; color: var(--text); }
  .as-perk-text { font-size: 15px; line-height: 1.55; color: var(--text-dim); max-width: 34em; }

  .as-get { margin-top: 40px; display: flex; align-items: center; gap: 24px; }
  .as-qr {
    flex: none;
    padding: 12px;
    border-radius: 16px;
    background: #fff;
    line-height: 0;
  }
  .as-qr-text { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
  .as-qr-title { font-size: 16px; font-weight: 500; color: var(--text); }
  .as-qr-sub { margin-bottom: 11px; font-size: 14px; color: var(--text-faint); }
  .as-android {
    margin: 0;
    padding: 16px 18px;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-xl);
    font-size: 15px;
    line-height: 1.55;
    color: var(--text-dim);
    max-width: 30em;
  }
  .as-android b { font-weight: 500; color: var(--text); }

  /* The phone stands on the same lit floor as the app preview at the top. */
  .as-device { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; }
  .as-device::before {
    content: "";
    position: absolute;
    inset: 30% -30% -10%;
    background: radial-gradient(ellipse 50% 50% at 50% 50%, hsl(var(--primary-h) 30% 40% / 0.28), transparent 70%);
    pointer-events: none;
  }
  .as-phone {
    position: relative;
    width: min(300px, 72vw);
    padding: 9px;
    border-radius: 50px;
    background: #1b1b1f;
    box-shadow:
      0 0 0 1px var(--border-strong),
      0 1px 0 rgba(255, 255, 255, 0.08) inset,
      0 40px 100px rgba(0, 0, 0, 0.6);
  }
  .as-screen {
    position: relative;
    aspect-ratio: 1320 / 2868;
    border-radius: 41px;
    overflow: hidden;
    background: #000;
  }
  .as-screen img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .as-screen img.on { opacity: 1; }

  .as-tabs {
    position: relative;
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
  }
  .as-tabs button {
    padding: 7px 14px;
    border-radius: 999px;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-faint);
    white-space: nowrap;
    transition: color 0.12s, background 0.12s;
  }
  .as-tabs button:hover { color: var(--text); }
  .as-tabs button.active { background: var(--bg-hover); color: var(--text); }

  @media (prefers-reduced-motion: reduce) {
    .as-screen img { transition: none; }
  }

  /* One column: heading, then the phone, then what the app adds and the badge. */
  @media (max-width: 900px) {
    .as { grid-template-columns: 1fr; gap: 0; }
    .as-text { display: contents; }
    h2, .as-lead { order: 0; }
    .as-device { order: 1; margin-top: 40px; }
    .as-perks { order: 2; margin-top: 48px; }
    .as-get { order: 3; }
  }
  @media (max-width: 640px) {
    .as { padding-top: 48px; padding-bottom: 72px; }
    .as-lead { font-size: 16px; }
    .as-tabs button { padding: 7px 11px; font-size: 13px; }
    .as-get { margin-top: 32px; justify-content: center; }
  }
</style>
