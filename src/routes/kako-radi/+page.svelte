<script>
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import MarketingNav from "$lib/components/marketingNav/MarketingNav.svelte";

  function start() {
    if (userData.user) goto("/tasks");
    else handleLogIn();
  }
</script>

<svelte:head>
  <title>MatMat — Kako radi</title>
  <meta name="description" content="Saznaj kako MatMat-ov algoritam spaced repetition uči brzinu tvog zaboravljanja i prilagođava zadatke točno tebi." />
</svelte:head>

<div class="kr-root">

  <MarketingNav />

  <!-- HERO -->
  <section class="kr-hero">
    <div class="kr-hero-bg"></div>
    <div class="kr-hero-grid"></div>
    <div class="kr-kicker">Kako MatMat radi</div>
    <h1 class="kr-h1">Algoritam koji uči<br/><span class="accent">brzinu zaboravljanja.</span></h1>
    <p class="kr-lead">MatMat ti svaki dan servira točno onaj broj zadataka koji te vodi prema 100%. Ne previše, ne premalo. Evo kako.</p>
  </section>

  <!-- 4 STEPS -->
  <section class="kr-steps">
    <div class="kr-steps-inner">

      <!-- STEP 1 -->
      <div class="step-row">
        <div class="step-num">01</div>
        <div>
          <h2 class="step-title">Odabereš program i razinu</h2>
          <p class="step-desc">Matura A ili B razina, gimnazija, strukovna, EFZG matematika ili fizika. MatMat odmah zna koji kurikulum primijeniti i koja gradiva pratiti.</p>
          <div class="step-meta">
            <div class="step-meta-item"><div class="step-meta-dot"></div>5 programa</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>2 minute</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>Bez kreditne kartice</div>
          </div>
        </div>
        <div class="step-visual">
          <div class="v-onboard">
            <div class="v-onboard-q">Što pripremaš?</div>
            <div class="v-onboard-opts">
              <div class="v-opt sel">Matura — Matematika <span class="v-opt-tag">A</span></div>
              <div class="v-opt">Matura — Fizika <span class="v-opt-tag">FI</span></div>
              <div class="v-opt">EFZG Matematika <span class="v-opt-tag">EF</span></div>
              <div class="v-opt">Gimnazija <span class="v-opt-tag">GI</span></div>
              <div class="v-opt">Strukovna <span class="v-opt-tag">ST</span></div>
              <div class="v-opt" style="opacity:.45">Više uskoro</div>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 2 -->
      <div class="step-row">
        <div class="step-num">02</div>
        <div>
          <h2 class="step-title">Rješavaš zadatke i sam ocjenjuješ koliko ti je išlo</h2>
          <p class="step-desc">Svaki zadatak ima korak-po-korak rješenje. Nakon što vidiš rješenje, ocijeniš koliko ti je išlo na skali od 0 do 5. Ta ocjena je gorivo algoritma — pomoću nje znamo kad ti opet pokazati taj zadatak.</p>
          <div class="step-meta">
            <div class="step-meta-item"><div class="step-meta-dot"></div>212 nastavnih ishoda</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>LaTeX rješenja</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>SM-2 algoritam</div>
          </div>
        </div>
        <div class="step-visual">
          <div class="v-task">
            <div class="v-task-q">Odredi derivaciju <b>f(x) = sin(x)/(x²+1)</b> u točki x = 0.</div>
            <div style="font-size:10px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; font-family:var(--font-mono)">Kako ti je išlo?</div>
            <div class="v-rating-bar"></div>
            <div class="v-rating-row">
              <div class="v-rating-btn" style="--c:#ef4444">0</div>
              <div class="v-rating-btn" style="--c:#f97316">1</div>
              <div class="v-rating-btn" style="--c:#eab308">2</div>
              <div class="v-rating-btn" style="--c:#84cc16">3</div>
              <div class="v-rating-btn" style="--c:#22c55e">4</div>
              <div class="v-rating-btn" style="--c:#16a34a">5</div>
            </div>
            <div class="v-rating-ends"><span>Nisam uspio</span><span>Uspio sam</span></div>
          </div>
        </div>
      </div>

      <!-- STEP 3 -->
      <div class="step-row">
        <div class="step-num">03</div>
        <div>
          <h2 class="step-title">Algoritam pamti i raspoređuje</h2>
          <p class="step-desc">MatMat pamti svaku tvoju ocjenu i koristi spaced repetition. Slabosti dolaze sutra, ono što ti je lako čekat će tjednima. Tako ne gubiš vrijeme na ono što već znaš.</p>
          <div class="step-meta">
            <div class="step-meta-item"><div class="step-meta-dot"></div>Adaptivni interval</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>Po cjelini i ishodu</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>Dugoročno pamćenje</div>
          </div>
        </div>
        <div class="step-visual">
          <div class="v-algo">
            <div class="v-algo-card"><span class="v-algo-pill weak">slabo</span><div class="v-algo-name">Integrali — supstitucija</div><div class="v-algo-when-now">danas</div></div>
            <div class="v-algo-card"><span class="v-algo-pill mid">srednje</span><div class="v-algo-name">Derivacije složenih funkcija</div><div class="v-algo-when-next">za 2 dana</div></div>
            <div class="v-algo-card"><span class="v-algo-pill strong">jako</span><div class="v-algo-name">Trigonometrija</div><div class="v-algo-when-later">za 14 dana</div></div>
            <div class="v-algo-card"><span class="v-algo-pill weak">slabo</span><div class="v-algo-name">Limesi</div><div class="v-algo-when-now">danas</div></div>
          </div>
        </div>
      </div>

      <!-- STEP 4 -->
      <div class="step-row">
        <div class="step-num">04</div>
        <div>
          <h2 class="step-title">Pratiš napredak prema 100%</h2>
          <p class="step-desc">Svaki dan vidiš koliko si spreman za maturu, koje cjeline su jaka strana, a koje treba povećati. Streak te drži na pravom putu — 10 minuta dnevno, bez izgovora.</p>
          <div class="step-meta">
            <div class="step-meta-item"><div class="step-meta-dot"></div>Spreman za maturu %</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>Po cjelinama</div>
            <div class="step-meta-item"><div class="step-meta-dot"></div>Streak i ciljevi</div>
          </div>
        </div>
        <div class="step-visual">
          <div class="v-progress">
            <div class="v-prog-big">74%</div>
            <div class="v-prog-l">Spreman za maturu</div>
            <div class="v-bar-row"><div class="v-bar-name">Derivacije</div><div class="v-bar-track"><div class="v-bar-fill" style="width:82%; background:oklch(0.65 0.2 270)"></div></div><div class="v-bar-pct">82%</div></div>
            <div class="v-bar-row"><div class="v-bar-name">Integrali</div><div class="v-bar-track"><div class="v-bar-fill" style="width:54%; background:oklch(0.65 0.2 250)"></div></div><div class="v-bar-pct">54%</div></div>
            <div class="v-bar-row"><div class="v-bar-name">Trigonometrija</div><div class="v-bar-track"><div class="v-bar-fill" style="width:91%; background:oklch(0.72 0.18 160)"></div></div><div class="v-bar-pct">91%</div></div>
            <div class="v-bar-row"><div class="v-bar-name">Matrice</div><div class="v-bar-track"><div class="v-bar-fill" style="width:38%; background:oklch(0.72 0.18 30)"></div></div><div class="v-bar-pct">38%</div></div>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- SR EXPLAINER -->
  <section class="kr-sr">
    <div class="kr-sr-inner">
      <div class="section-header">
        <div class="section-kicker">Spaced repetition</div>
        <h2 class="section-h2">Krivulja zaboravljanja</h2>
        <p class="section-lead">Mozak zaboravlja eksponencijalno. MatMat te vraća na zadatak točno prije nego ga zaboraviš — i tako pretvara kratkoročno u dugoročno znanje.</p>
      </div>

      <div class="sr-chart">
        <svg class="sr-chart-svg" viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="goodFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="oklch(0.72 0.22 270)" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="oklch(0.72 0.22 270)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <line x1="40" y1="40"  x2="780" y2="40"  stroke="rgba(255,255,255,0.05)"/>
          <line x1="40" y1="100" x2="780" y2="100" stroke="rgba(255,255,255,0.05)"/>
          <line x1="40" y1="160" x2="780" y2="160" stroke="rgba(255,255,255,0.05)"/>
          <line x1="40" y1="220" x2="780" y2="220" stroke="rgba(255,255,255,0.08)"/>
          <text x="14" y="44"  fill="rgba(255,255,255,0.3)" font-size="11" font-family="Geist Mono">100%</text>
          <text x="20" y="164" fill="rgba(255,255,255,0.3)" font-size="11" font-family="Geist Mono">50%</text>
          <text x="26" y="224" fill="rgba(255,255,255,0.3)" font-size="11" font-family="Geist Mono">0%</text>
          <path d="M 40 40 Q 120 165 230 200 T 780 218" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-dasharray="4 4" opacity="0.7"/>
          <text x="540" y="208" fill="#ef4444" font-size="12" font-family="Geist" opacity="0.85">Bez ponavljanja</text>
          <path d="M 40 40 Q 100 80 140 95 L 145 50 Q 220 90 280 110 L 285 45 Q 400 80 470 95 L 475 42 Q 620 70 720 78 L 725 40 L 780 50"
                stroke="oklch(0.72 0.22 270)" stroke-width="3" fill="none"/>
          <path d="M 40 40 Q 100 80 140 95 L 145 50 Q 220 90 280 110 L 285 45 Q 400 80 470 95 L 475 42 Q 620 70 720 78 L 725 40 L 780 50 L 780 220 L 40 220 Z"
                fill="url(#goodFill)" opacity="0.5"/>
          <circle cx="145" cy="50" r="5" fill="oklch(0.72 0.22 270)"/>
          <circle cx="285" cy="45" r="5" fill="oklch(0.72 0.22 270)"/>
          <circle cx="475" cy="42" r="5" fill="oklch(0.72 0.22 270)"/>
          <circle cx="725" cy="40" r="5" fill="oklch(0.72 0.22 270)"/>
          <text x="138" y="32"  fill="oklch(0.82 0.12 270)" font-size="10" font-family="Geist Mono">+1d</text>
          <text x="278" y="28"  fill="oklch(0.82 0.12 270)" font-size="10" font-family="Geist Mono">+3d</text>
          <text x="468" y="25"  fill="oklch(0.82 0.12 270)" font-size="10" font-family="Geist Mono">+8d</text>
          <text x="708" y="23"  fill="oklch(0.82 0.12 270)" font-size="10" font-family="Geist Mono">+21d</text>
          <text x="510" y="78" fill="oklch(0.82 0.12 270)" font-size="12" font-family="Geist">S MatMat-om</text>
          <text x="40"  y="248" fill="rgba(255,255,255,0.3)" font-size="11" font-family="Geist Mono">Dan 0</text>
          <text x="380" y="248" fill="rgba(255,255,255,0.3)" font-size="11" font-family="Geist Mono">Dan 14</text>
          <text x="730" y="248" fill="rgba(255,255,255,0.3)" font-size="11" font-family="Geist Mono">Dan 30</text>
        </svg>
      </div>

      <div class="sr-grid">
        <div class="sr-card">
          <div class="sr-card-icon" style="background:oklch(0.55 0.22 270 / 0.18); color:oklch(0.82 0.12 270)">SR</div>
          <div class="sr-card-title">SuperMemo SM-2</div>
          <div class="sr-card-desc">Provjereni algoritam koji prilagođava interval ponavljanja prema tvojoj ocjeni od 0 do 5.</div>
        </div>
        <div class="sr-card">
          <div class="sr-card-icon" style="background:rgba(251,191,36,0.18); color:#fbbf24">EF</div>
          <div class="sr-card-title">E-faktor po ishodu</div>
          <div class="sr-card-desc">Svaki nastavni ishod ima svoju "lakoću". Slabija točka = češće ponavljanje.</div>
        </div>
        <div class="sr-card">
          <div class="sr-card-icon" style="background:rgba(52,211,153,0.18); color:#34d399">10</div>
          <div class="sr-card-title">10 minuta dnevno</div>
          <div class="sr-card-desc">Kratko i konzistentno bije dugo i sporadično. Dnevni cilj te drži u ritmu.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- RATING DEEP DIVE -->
  <section class="kr-rating">
    <div class="kr-rating-inner">
      <div class="section-header">
        <div class="section-kicker">Ocjenjivanje</div>
        <h2 class="section-h2">Skala 0–5: pogonsko gorivo algoritma</h2>
        <p class="section-lead">Tvoja iskrena ocjena određuje za koliko dana ćeš opet vidjeti zadatak. Iskreno = brže napredovanje.</p>
      </div>

      <div class="rd-bar"></div>
      <div class="rd-grid">
        <div class="rd-btn" style="--c:#ef4444">0</div>
        <div class="rd-btn" style="--c:#f97316">1</div>
        <div class="rd-btn" style="--c:#eab308">2</div>
        <div class="rd-btn" style="--c:#84cc16">3</div>
        <div class="rd-btn" style="--c:#22c55e">4</div>
        <div class="rd-btn" style="--c:#16a34a">5</div>
      </div>

      <div class="rd-table">
        <div class="rd-row" style="--c:#ef4444">
          <div class="rd-row-num">0</div>
          <div class="rd-row-name">Zaborav</div>
          <div class="rd-row-desc">Ni rješenje mi nije jasno — gradivo treba iznova.</div>
          <div class="rd-row-when">↻ za 1 dan</div>
        </div>
        <div class="rd-row" style="--c:#f97316">
          <div class="rd-row-num">1</div>
          <div class="rd-row-name">Netočno</div>
          <div class="rd-row-desc">Krivo riješeno, ali rješenje sad razumijem.</div>
          <div class="rd-row-when">↻ za 1 dan</div>
        </div>
        <div class="rd-row" style="--c:#eab308">
          <div class="rd-row-num">2</div>
          <div class="rd-row-name">Lako netočno</div>
          <div class="rd-row-desc">Krivo, ali rješenje sad izgleda jednostavno — sitna greška.</div>
          <div class="rd-row-when">↻ za 2 dana</div>
        </div>
        <div class="rd-row" style="--c:#84cc16">
          <div class="rd-row-num">3</div>
          <div class="rd-row-name">Napor</div>
          <div class="rd-row-desc">Točno, ali s velikim trudom i razmišljanjem.</div>
          <div class="rd-row-when">↻ za 4 dana</div>
        </div>
        <div class="rd-row" style="--c:#22c55e">
          <div class="rd-row-num">4</div>
          <div class="rd-row-name">Lako točno</div>
          <div class="rd-row-desc">Riješio nakon malo razmišljanja — solidno znam.</div>
          <div class="rd-row-when">↻ za 8 dana</div>
        </div>
        <div class="rd-row" style="--c:#16a34a">
          <div class="rd-row-num">5</div>
          <div class="rd-row-name">Savršeno</div>
          <div class="rd-row-desc">Bez problema, odmah znao rješenje.</div>
          <div class="rd-row-when">↻ za 14 dana</div>
        </div>
      </div>
    </div>
  </section>

  <!-- AI + STREAK -->
  <section class="kr-extras">
    <div class="kr-extras-inner">
      <div class="ex-card">
        <div class="ex-icon" style="background:oklch(0.55 0.22 270 / 0.18); color:oklch(0.82 0.12 270)">AI</div>
        <h3 class="ex-h3">Asistent koji zna kontekst</h3>
        <p class="ex-p">Gemini zna koji zadatak rješavaš. Pitaš za hint — dobiješ hint, ne cijelo rješenje. Pitaš za objašnjenje — dobiješ ga na hrvatskom.</p>
        <div class="ex-points">
          <div class="ex-point">Objašnjenja na hrvatskom</div>
          <div class="ex-point">Hint bez spoilera rješenja</div>
          <div class="ex-point">Razumije specifičan zadatak</div>
        </div>
      </div>
      <div class="ex-card">
        <div class="ex-icon" style="background:rgba(251,191,36,0.18); color:#fbbf24">ST</div>
        <h3 class="ex-h3">Streak i dnevni cilj</h3>
        <p class="ex-p">10 zadataka dnevno = 33 dana niza = matura. Vizualni napredak i streak te drže motiviranim kad nije baš dan.</p>
        <div class="ex-points">
          <div class="ex-point">Dnevni cilj 10 zadataka</div>
          <div class="ex-point">Streak — ne prekidaj niz</div>
          <div class="ex-point">Tjedna i mjesečna statistika</div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="kr-cta">
    <div class="kr-cta-bg"></div>
    <h2 class="kr-cta-h2">Probaj danas. 10 minuta.</h2>
    <p class="kr-cta-p">Bez kartice, bez instalacije. Samo se uloguj s Googleom i počinješ.</p>
    <button class="kr-btn-google" onclick={start}>
      <svg class="g-svg" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Počni s Googleom — besplatno
    </button>
  </section>

  <!-- FOOTER -->
  <footer class="kr-footer">
    <div class="kr-footer-brand">
      <div class="kr-footer-mark">M</div>
      <span>MatMat · matmat.online</span>
    </div>
    <div class="kr-footer-links">
      <a href="/">Početna</a>
      <a href="/kako-radi">Kako radi</a>
      <a href="mailto:info@matmat.online">info@matmat.online</a>
    </div>
    <span>© {new Date().getFullYear()} MatMat</span>
  </footer>

</div>

<style>
  .kr-root {
    background: #0d0d10;
    color: #ededef;
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.55;
    min-height: 100vh;
  }

  /* HERO */
  .kr-hero {
    padding: 90px 5% 70px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .kr-hero-bg {
    position: absolute; inset: 0; z-index: 0;
    background: radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.55 0.22 270 / 0.28), transparent 65%);
  }
  .kr-hero-grid {
    position: absolute; inset: 0; z-index: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, black, transparent);
  }
  .kr-hero > * { position: relative; z-index: 1; }
  .kr-kicker {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-radius: 999px;
    background: oklch(0.55 0.22 270 / 0.12);
    border: 1px solid oklch(0.55 0.22 270 / 0.3);
    font-size: 12px; font-weight: 500; letter-spacing: .04em;
    text-transform: uppercase; color: oklch(0.82 0.12 270);
    margin-bottom: 28px;
  }
  .kr-h1 {
    font-size: clamp(44px, 7vw, 76px);
    font-weight: 900;
    letter-spacing: -0.045em;
    line-height: 1;
    color: #fff;
    margin-bottom: 22px;
    text-wrap: balance;
  }
  .kr-h1 .accent {
    background: linear-gradient(135deg, oklch(0.72 0.22 270) 0%, oklch(0.7 0.2 240) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .kr-lead {
    font-size: clamp(16px, 1.7vw, 19px);
    color: rgba(255,255,255,0.5);
    max-width: 580px;
    margin: 0 auto;
    line-height: 1.65;
    text-wrap: pretty;
  }

  /* STEPS */
  .kr-steps { padding: 30px 5% 90px; }
  .kr-steps-inner { max-width: 1100px; margin: 0 auto; }
  .step-row {
    display: grid; grid-template-columns: 100px 1fr 1fr;
    gap: 56px; align-items: center;
    padding: 70px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .step-row:last-child { border-bottom: none; }
  .step-num {
    font-size: 88px; font-weight: 900; letter-spacing: -0.05em;
    font-family: var(--font-mono);
    background: linear-gradient(135deg, oklch(0.72 0.22 270) 0%, oklch(0.5 0.18 280) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    line-height: 1;
  }
  .step-title { font-size: clamp(24px, 2.6vw, 34px); font-weight: 800; letter-spacing: -0.025em; color: #fff; margin-bottom: 14px; line-height: 1.2; text-wrap: balance; }
  .step-desc { font-size: 16px; line-height: 1.7; color: rgba(255,255,255,0.5); margin-bottom: 18px; }
  .step-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,0.32); font-family: var(--font-mono); }
  .step-meta-item { display: flex; align-items: center; gap: 6px; }
  .step-meta-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; }

  .step-visual {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.09);
    background: #111113;
    padding: 22px;
    box-shadow: 0 14px 40px rgba(0,0,0,0.4);
  }

  /* visual: onboard */
  .v-onboard { display: flex; flex-direction: column; gap: 10px; }
  .v-onboard-q { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,0.3); font-family: var(--font-mono); margin-bottom: 4px; }
  .v-onboard-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .v-opt { padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(255,255,255,0.02); font-size: 13px; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 10px; }
  .v-opt.sel { border-color: oklch(0.55 0.22 270 / 0.5); background: oklch(0.55 0.22 270 / 0.12); color: #fff; }
  .v-opt-tag { font-size: 10px; padding: 2px 7px; border-radius: 5px; font-family: var(--font-mono); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); margin-left: auto; }
  .v-opt.sel .v-opt-tag { background: oklch(0.55 0.22 270 / 0.3); color: oklch(0.82 0.12 270); }

  /* visual: task */
  .v-task { font-family: var(--font-mono); font-size: 13px; }
  .v-task-q { color: rgba(255,255,255,0.7); padding: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; margin-bottom: 12px; line-height: 1.5; }
  .v-task-q b { color: oklch(0.78 0.15 270); }
  .v-rating-bar { height: 5px; border-radius: 99px; background: linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e, #16a34a); margin-bottom: 8px; }
  .v-rating-row { display: flex; gap: 4px; margin-bottom: 10px; }
  .v-rating-btn { flex: 1; aspect-ratio: 1; border-radius: 8px; display: grid; place-items: center; font-family: var(--font-mono); font-size: 14px; font-weight: 800; border: 1px solid var(--c, rgba(255,255,255,0.1)); background: color-mix(in srgb, var(--c, white) 10%, transparent); color: var(--c, #fff); }
  .v-rating-ends { display: flex; justify-content: space-between; font-size: 10px; color: rgba(255,255,255,0.35); font-family: var(--font-mono); }

  /* visual: algo */
  .v-algo { font-family: var(--font-mono); font-size: 12px; }
  .v-algo-card { padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
  .v-algo-name { flex: 1; color: rgba(255,255,255,0.65); font-family: var(--font-sans); font-size: 13px; }
  .v-algo-when-now { font-size: 11px; color: #fbbf24; }
  .v-algo-when-next { font-size: 11px; color: oklch(0.7 0.18 270); }
  .v-algo-when-later { font-size: 11px; color: #34d399; }
  .v-algo-pill { padding: 3px 8px; border-radius: 999px; font-size: 10px; }
  .v-algo-pill.weak { background: rgba(239,68,68,0.15); color: #ef4444; }
  .v-algo-pill.mid  { background: rgba(251,191,36,0.15); color: #fbbf24; }
  .v-algo-pill.strong { background: rgba(52,211,153,0.15); color: #34d399; }

  /* visual: progress */
  .v-prog-big { font-size: 56px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; color: oklch(0.72 0.22 270); margin-bottom: 4px; }
  .v-prog-l { font-size: 12px; color: rgba(255,255,255,0.32); margin-bottom: 18px; }
  .v-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .v-bar-name { font-size: 12px; color: rgba(255,255,255,0.42); width: 100px; }
  .v-bar-track { flex: 1; height: 6px; border-radius: 99px; background: rgba(255,255,255,0.06); }
  .v-bar-fill { height: 100%; border-radius: 99px; }
  .v-bar-pct { font-size: 11px; color: rgba(255,255,255,0.3); width: 30px; text-align: right; font-family: var(--font-mono); }

  /* SR EXPLAINER */
  .kr-sr {
    background: rgba(255,255,255,0.015);
    border-top: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 100px 5%;
  }
  .kr-sr-inner { max-width: 1000px; margin: 0 auto; }
  .section-header { text-align: center; margin-bottom: 56px; }
  .section-kicker { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: oklch(0.6 0.22 270); margin-bottom: 14px; }
  .section-h2 { font-size: clamp(30px, 4vw, 48px); font-weight: 900; letter-spacing: -0.04em; color: #fff; margin-bottom: 14px; text-wrap: balance; }
  .section-lead { font-size: 17px; color: rgba(255,255,255,0.4); max-width: 540px; margin: 0 auto; line-height: 1.65; }

  .sr-chart {
    background: #111113; border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px; padding: 36px;
    margin-top: 12px;
  }
  .sr-chart-svg { width: 100%; height: auto; display: block; }

  .sr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 28px; }
  .sr-card { padding: 22px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.025); }
  .sr-card-icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-size: 16px; margin-bottom: 14px; font-family: var(--font-mono); font-weight: 800; }
  .sr-card-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px; }
  .sr-card-desc { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.55; }

  /* RATING DEEP DIVE */
  .kr-rating { padding: 100px 5%; }
  .kr-rating-inner { max-width: 980px; margin: 0 auto; }
  .rd-bar { height: 8px; border-radius: 99px; background: linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e, #16a34a); margin-bottom: 16px; }
  .rd-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 32px; }
  .rd-btn {
    aspect-ratio: 1.1;
    display: grid; place-items: center;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
    background: color-mix(in srgb, var(--c) 10%, transparent);
    font-family: var(--font-mono); font-size: 30px; font-weight: 800;
    color: var(--c);
  }
  .rd-table { display: flex; flex-direction: column; gap: 8px; }
  .rd-row { display: grid; grid-template-columns: 38px 160px 1fr 110px; gap: 16px; padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.025); align-items: center; }
  .rd-row-num { font-family: var(--font-mono); font-size: 18px; font-weight: 800; color: var(--c); }
  .rd-row-name { font-size: 14px; font-weight: 600; color: #fff; }
  .rd-row-desc { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.55; }
  .rd-row-when { font-size: 12px; color: rgba(255,255,255,0.4); font-family: var(--font-mono); text-align: right; white-space: nowrap; }

  /* AI + STREAK */
  .kr-extras {
    background: rgba(255,255,255,0.015);
    border-top: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 100px 5%;
  }
  .kr-extras-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .ex-card { padding: 36px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.025); }
  .ex-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; margin-bottom: 18px; font-family: var(--font-mono); font-weight: 800; font-size: 14px; }
  .ex-h3 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #fff; margin-bottom: 10px; }
  .ex-p { font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.65; margin-bottom: 14px; }
  .ex-points { display: flex; flex-direction: column; gap: 8px; }
  .ex-point { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.6); }
  .ex-point::before { content: '✓'; color: #34d399; font-size: 12px; font-weight: 700; }

  /* CTA */
  .kr-cta {
    margin: 0 5% 80px; border-radius: 24px; padding: 96px 5%; text-align: center;
    position: relative; overflow: hidden;
    background: oklch(0.26 0.08 270); border: 1px solid oklch(0.42 0.14 270 / 0.5);
  }
  .kr-cta-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 70% at 50% 0%, oklch(0.55 0.22 270 / 0.22), transparent); }
  .kr-cta > * { position: relative; z-index: 1; }
  .kr-cta-h2 { font-size: clamp(36px, 5vw, 58px); font-weight: 900; letter-spacing: -0.045em; color: #fff; margin-bottom: 16px; text-wrap: balance; }
  .kr-cta-p { font-size: 17px; color: rgba(255,255,255,0.55); margin-bottom: 36px; max-width: 460px; margin-left: auto; margin-right: auto; }
  .kr-btn-google {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 16px 28px; background: #fff;
    border-radius: 14px; font-size: 15px; font-weight: 700;
    color: #18181b; cursor: pointer; border: none;
    transition: transform .15s, box-shadow .15s;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    font-family: var(--font-sans);
    margin: 0 auto;
  }
  .kr-btn-google:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  .g-svg { width: 18px; height: 18px; flex-shrink: 0; }

  /* FOOTER */
  .kr-footer {
    border-top: 1px solid rgba(255,255,255,0.07);
    padding: 32px 5%;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; color: rgba(255,255,255,0.25);
    flex-wrap: wrap; gap: 16px;
  }
  .kr-footer-brand { display: flex; align-items: center; gap: 8px; }
  .kr-footer-mark {
    width: 22px; height: 22px; border-radius: 7px;
    background: oklch(0.6 0.22 270);
    display: grid; place-items: center;
    color: #fff; font-weight: 800; font-size: 11px;
    font-family: var(--font-mono);
  }
  .kr-footer-links { display: flex; gap: 22px; }
  .kr-footer a { color: rgba(255,255,255,0.25); transition: color .15s; text-decoration: none; }
  .kr-footer a:hover { color: rgba(255,255,255,0.6); }

  @media (max-width: 800px) {
    .step-row { grid-template-columns: 1fr; gap: 24px; padding: 50px 0; }
    .step-num { font-size: 64px; }
    .sr-grid { grid-template-columns: 1fr; }
    .kr-extras-inner { grid-template-columns: 1fr; }
    .rd-row { grid-template-columns: 30px 110px 1fr; }
    .rd-row-when { grid-column: 1 / -1; text-align: left; padding-left: 46px; }
    .rd-grid { gap: 6px; }
  }
</style>
