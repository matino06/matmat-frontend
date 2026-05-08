<script>
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import MarketingNav from "$lib/components/marketingNav/MarketingNav.svelte";

  function start() {
    if (userData.user) goto("/tasks");
    else handleLogIn();
  }

  $effect(() => {
    if (!userData.loading && userData.user) goto("/tasks");
  });

  let activeProgIdx = $state(0);

  const PROGRAMS = [
    {
      id: "matura-mat-a",
      badge: "MA",
      color: "239",
      name: "Matematika A razina",
      kind: "Državna matura",
      title: "Matura iz matematike — A razina",
      desc: "Algoritam pamti što si naučio i što si zaboravljao. Svaki dan dobiješ točno onaj broj zadataka koji te vodi prema 100% — ni previše, ni premalo.",
      chips: ["A razina — svo gradivo", "212 nastavnih ishoda", "Korak-po-korak rješenja", "AI asistent", "Maturalne formule"],
    },
    {
      id: "matura-mat-b",
      badge: "MB",
      color: "215",
      name: "Matematika B razina",
      kind: "Državna matura",
      title: "Matura iz matematike — B razina",
      desc: "Prilagođen sadržaj za B razinu mature — fokus na osnovne koncepte i praktičnu primjenu bez kompleksnih dokaza. Isti algoritam, lakši put.",
      chips: ["B razina — prilagođeno", "Sve cjeline B razine", "Korak-po-korak rješenja", "AI asistent", "Maturalne formule"],
    },
  ];

  const SR_BARS = [
    { label: "Derivacije", pct: 82, color: "oklch(0.65 0.2 270)" },
    { label: "Integrali", pct: 54, color: "oklch(0.65 0.2 250)" },
    { label: "Trigon.", pct: 91, color: "oklch(0.72 0.18 160)" },
    { label: "Matrice", pct: 38, color: "oklch(0.72 0.18 30)" },
    { label: "Limesi", pct: 67, color: "oklch(0.65 0.2 270)" },
  ];

  const STREAK_DAYS = [1,1,1,1,1,1,0, 1,1,1,0,1,1,1, 1,1,1,1,1,0,0, 1,1,1,1,1,1,1, 0,1,1,1,1];

  let activeProg = $derived(PROGRAMS[activeProgIdx]);
</script>

<div class="lp">

  <MarketingNav />

  <!-- Hero -->
  <section class="lp-hero">
    <div class="lp-hero-badge">
      <div class="lp-hero-badge-dot"></div>
      Priprema za maturu
    </div>

    <h1 class="lp-h1">
      Matematiku se<br/>
      <span class="accent">ne čita.</span><br/>
      Rješava.
    </h1>

    <p class="lp-lead">
      MatMat ti svaki dan složi točno onoliko zadataka koliko trebaš. Algoritam pamti što si naučio i planira dalje — ti se fokusiraš samo na sljedeći zadatak.
    </p>

    <div class="lp-hero-ctas">
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button class="google-btn" onclick={start}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Počni s Googleom — besplatno
      </button>
      <a href="/kako-radi" class="btn-ghost-lp">Pogledaj kako radi →</a>
    </div>

    <div class="lp-hero-note">Bez kreditne kartice · Radi u pregledniku · Hrvatski kurikulum</div>

    <!-- App preview -->
    <div class="lp-hero-visual">
      <div class="lp-screen-outer">
        <div class="lp-screen-topbar">
          <div class="lp-screen-dot" style="background:#ff5f57"></div>
          <div class="lp-screen-dot" style="background:#febc2e"></div>
          <div class="lp-screen-dot" style="background:#28c840"></div>
        </div>
        <div class="lp-screen-frame">
          <div class="lp-screen-sidebar">
            <div class="sb-brand">
              <div class="sb-logo"></div>
              <div class="sb-name">MatMat</div>
            </div>
            {#each ["Cjeline","Zadaci","Napredak","Ciljevi"] as nav, i (nav)}
              <div class="lp-sb-item {i === 1 ? 'active' : ''}">
                <div class="lp-sb-dot {i === 1 ? 'accent' : ''}"></div>
                {nav}
              </div>
            {/each}
            <div class="lp-sb-section-label">Alati</div>
            {#each ["Formule","AI","Pomodoro"] as tool (tool)}
              <div class="lp-sb-item">
                <div class="lp-sb-dot"></div>
                {tool}
              </div>
            {/each}
          </div>
          <div class="lp-screen-main">
            <div class="lp-screen-main-label">Zadaci za danas · 4 od 8</div>
            <div class="lp-task-preview">
              <div class="label">Derivacije — pravila deriviranja</div>
              <div class="task-text">Odredi derivaciju f(x) = sin(x) / (x² + 1) u točki x = 0.</div>
              {#each [
                {n:"01", t:"Koristimo pravilo kvocijenta: (u/v)' = (u'v − uv') / v²"},
                {n:"02", t:"u = sin x → u' = cos x;  v = x²+1 → v' = 2x"},
                {n:"03", t:"Za x = 0: f'(0) = (1·1 − 0·0) / 1 = 1"},
              ] as step (step.n)}
                <div class="lp-step-row">
                  <div class="lp-step-num">{step.n}</div>
                  <div class="lp-step-body">{step.t}</div>
                </div>
              {/each}
            </div>
            <div class="lp-screen-rating-label">Kako ti je išlo?</div>
            <div class="lp-rating-row">
              {#each ["Nisam znao","Trebao pomoć","Uz trud","Lako"] as r (r)}
                <div class="lp-rate">{r}</div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Proof strip -->
  <div class="lp-proof">
    <div class="lp-proof-stat"><div class="v">4.700+</div><div class="l">aktivnih učenika</div></div>
    <div class="lp-proof-div"></div>
    <div class="lp-proof-stat"><div class="v">212</div><div class="l">nastavnih ishoda</div></div>
    <div class="lp-proof-div"></div>
    <div class="lp-proof-stat"><div class="v">A + B</div><div class="l">razine mature</div></div>
    <div class="lp-proof-div"></div>
    <div class="lp-proof-stat"><div class="v">Besplatno</div><div class="l">uvijek</div></div>
    <div class="lp-proof-div"></div>
    <div class="lp-proof-stat"><div class="v">Hrvatski</div><div class="l">kurikulum</div></div>
  </div>

  <!-- Feature rows -->
  <div class="lp-features-wrap" id="kako">

    <!-- Row 1 — Zadaci (korak-po-korak) -->
    <div class="lp-feature-row">
      <div class="lp-feature-text">
        <div class="lp-feature-kicker">Koncepti koji kliknu</div>
        <h2 class="lp-feature-title">Korak-po-korak do svakog rješenja</h2>
        <p class="lp-feature-desc">Svaki zadatak ima strukturirano rješenje s LaTeX formulama — cjelovito objašnjenje logike, ne samo gotov odgovor. Učiš dok rješavaš.</p>
        <div class="lp-feature-points">
          {#each ["212 nastavnih ishoda po kurikulumu","Korak-po-korak rješenja s objašnjenjima","A i B razina, sve cjeline"] as p (p)}
            <div class="lp-feature-point">
              <div class="lp-feature-check">✓</div>
              {p}
            </div>
          {/each}
        </div>
      </div>
      <div class="lp-feature-visual">
        <!-- MockupTask -->
        <div class="lp-mockup-box">
          <div class="lp-mockup-bar">
            <div class="lp-dot" style="background:#ff5f57"></div>
            <div class="lp-dot" style="background:#febc2e"></div>
            <div class="lp-dot" style="background:#28c840"></div>
            <div class="lp-mockup-title">MatMat — Zadaci</div>
          </div>
          <div class="lp-mockup-body">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
              <div>
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.25);font-family:var(--font-mono);margin-bottom:4px">Derivacije · A razina</div>
                <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,.85)">Pravilo kvocijenta</div>
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,.3);font-family:var(--font-mono)">4 / 8</div>
            </div>
            <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px 18px;margin-bottom:14px">
              <div style="font-size:13px;color:rgba(255,255,255,.7);line-height:1.6;margin-bottom:14px">
                Odredi derivaciju funkcije <span style="font-family:var(--font-mono);color:oklch(0.78 0.15 270)">f(x) = sin(x) / (x² + 1)</span> u točki x = 0.
              </div>
              {#each [
                {n:"01", t:"Koristimo pravilo kvocijenta: (u/v)' = (u'v − uv') / v²"},
                {n:"02", t:"u = sin x → u' = cos x;  v = x²+1 → v' = 2x"},
                {n:"03", t:"Za x = 0: f'(0) = (1·1 − 0·0) / 1 = 1"},
              ] as s (s.n)}
                <div style="display:flex;gap:12px;padding:7px 0;border-top:1px solid rgba(255,255,255,.05)">
                  <div style="color:rgba(255,255,255,.2);font-family:var(--font-mono);font-size:10px;width:20px;flex-shrink:0;padding-top:1px">{s.n}</div>
                  <div style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.55">{s.t}</div>
                </div>
              {/each}
            </div>
            <div style="font-size:10px;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Kako ti je išlo?</div>
            <div style="display:flex;gap:8px">
              {#each ["Nisam znao","Trebao pomoć","Uz trud","Lako"] as r, i (r)}
                <div style="flex:1;padding:8px 4px;text-align:center;border:1px solid {i===3?'oklch(0.55 0.22 160 / 0.5)':'rgba(255,255,255,.07)'};border-radius:8px;font-size:11px;color:{i===3?'rgba(255,255,255,.9)':'rgba(255,255,255,.3)'};background:{i===3?'oklch(0.55 0.22 160 / 0.25)':'rgba(255,255,255,.02)'}">{r}</div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2 — Personalizirano (reversed) -->
    <div class="lp-feature-row lp-feature-row-rev">
      <div class="lp-feature-text">
        <div class="lp-feature-kicker">Personalizirano učenje</div>
        <h2 class="lp-feature-title">Algoritam koji pamti što treba ponoviti</h2>
        <p class="lp-feature-desc">Spaced repetition — gradivo se ponavlja točno kad si na rubu zaboravljanja. MatMat prati svaku cjelinu i automatski prilagođava plan.</p>
        <div class="lp-feature-points">
          {#each ["Slabosti dolaze češće, poznato rjeđe","Svaki dan drugačiji, prilagođeni plan","Dugoročno pamćenje, ne kratkoročno bubanje"] as p (p)}
            <div class="lp-feature-point">
              <div class="lp-feature-check">✓</div>
              {p}
            </div>
          {/each}
        </div>
      </div>
      <div class="lp-feature-visual">
        <!-- MockupProgress -->
        <div class="lp-mockup-box">
          <div class="lp-mockup-bar">
            <div class="lp-dot" style="background:#ff5f57"></div>
            <div class="lp-dot" style="background:#febc2e"></div>
            <div class="lp-dot" style="background:#28c840"></div>
            <div class="lp-mockup-title">MatMat — Napredak</div>
          </div>
          <div class="lp-mockup-body">
            <div style="display:flex;gap:16px;margin-bottom:24px">
              <div style="flex:1;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px;text-align:center">
                <div style="font-size:36px;font-weight:800;letter-spacing:-.04em;color:oklch(0.72 0.22 270);line-height:1">74%</div>
                <div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:4px">Spreman za maturu</div>
              </div>
              <div style="flex:1;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px;text-align:center">
                <div style="font-size:36px;font-weight:800;letter-spacing:-.04em;color:oklch(0.72 0.18 160);line-height:1">33</div>
                <div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:4px">Dana streak</div>
              </div>
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;font-family:var(--font-mono)">Napredak po cjelinama</div>
            {#each SR_BARS as b (b.label)}
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                <div style="font-size:12px;color:rgba(255,255,255,.4);width:90px;flex-shrink:0">{b.label}</div>
                <div style="flex:1;height:7px;border-radius:99px;background:rgba(255,255,255,.06)">
                  <div style="height:100%;border-radius:99px;width:{b.pct}%;background:{b.color}"></div>
                </div>
                <div style="font-size:11px;color:rgba(255,255,255,.25);width:32px;text-align:right;font-family:var(--font-mono)">{b.pct}%</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3 — AI asistent -->
    <div class="lp-feature-row">
      <div class="lp-feature-text">
        <div class="lp-feature-kicker">AI asistent</div>
        <h2 class="lp-feature-title">AI koji zna koji zadatak rješavaš</h2>
        <p class="lp-feature-desc">Gemini zna kontekst. Pitaš za hint — dobiješ hint, ne cijelo rješenje. Pitaš za objašnjenje — dobiješ ga na hrvatskom, za taj specifični zadatak.</p>
        <div class="lp-feature-points">
          {#each ["Objašnjenja na hrvatskom","Hint bez spoilera rješenja","Razumije kontekst zadatka"] as p (p)}
            <div class="lp-feature-point">
              <div class="lp-feature-check">✓</div>
              {p}
            </div>
          {/each}
        </div>
      </div>
      <div class="lp-feature-visual">
        <!-- MockupAI -->
        <div class="lp-mockup-box">
          <div class="lp-mockup-bar">
            <div class="lp-dot" style="background:#ff5f57"></div>
            <div class="lp-dot" style="background:#febc2e"></div>
            <div class="lp-dot" style="background:#28c840"></div>
            <div class="lp-mockup-title">MatMat — AI Asistent</div>
          </div>
          <div class="lp-mockup-body">
            <div style="font-size:10px;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;font-family:var(--font-mono)">Trenutni zadatak: Integrali · supstitucija</div>
            {#each [
              {role:"user", text:"Mogu li dobiti hint? Nisam siguran od kud početi s ovim integralom."},
              {role:"bot", text:"Primijeti da je podintegralna funkcija oblika f(g(x))·g'(x). Pokušaj supstituciju u = x² + 1. Što dobiješ za du?"},
              {role:"user", text:"du = 2x dx, dakle x dx = du/2 — sada se sve poništi!"},
              {role:"bot", text:"Točno! Sada integral postaje ∫ (1/2) · (1/u) du = (1/2) ln|u| + C."},
            ] as m (m.text)}
              <div style="display:flex;gap:10px;margin-bottom:12px;flex-direction:{m.role==='user'?'row-reverse':'row'};align-items:flex-start">
                <div style="width:28px;height:28px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;font-size:11px;font-weight:700;background:{m.role==='user'?'oklch(0.5 0.2 270 / 0.3)':'rgba(255,255,255,.06)'};color:{m.role==='user'?'oklch(0.8 0.15 270)':'rgba(255,255,255,.4)'}">
                  {m.role==='user'?'T':'AI'}
                </div>
                <div style="max-width:260px;padding:10px 13px;border-radius:11px;font-size:12px;line-height:1.55;background:{m.role==='user'?'oklch(0.55 0.22 270 / 0.18)':'rgba(255,255,255,.04)'};border:1px solid {m.role==='user'?'oklch(0.55 0.22 270 / 0.3)':'rgba(255,255,255,.07)'};color:{m.role==='user'?'rgba(255,255,255,.8)':'rgba(255,255,255,.55)'}">
                  {m.text}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Row 4 — Ciljevi (reversed) -->
    <div class="lp-feature-row lp-feature-row-rev">
      <div class="lp-feature-text">
        <div class="lp-feature-kicker">Ostani motiviran</div>
        <h2 class="lp-feature-title">10 minuta dnevno<br/>jače od vikend maratona</h2>
        <p class="lp-feature-desc">Kratki dnevni cilj je lakši za ostvariti nego masivne vikend sesije. Streak, ciljevi i vizualni napredak te drže na pravom putu do mature.</p>
        <div class="lp-feature-points">
          {#each ["Dnevni cilj: samo 10 zadataka","Streak briješ svaki propušteni dan","Vidiš gdje si i koliko ti ostalo"] as p (p)}
            <div class="lp-feature-point">
              <div class="lp-feature-check">✓</div>
              {p}
            </div>
          {/each}
        </div>
      </div>
      <div class="lp-feature-visual">
        <!-- MockupGoals -->
        <div class="lp-mockup-box">
          <div class="lp-mockup-bar">
            <div class="lp-dot" style="background:#ff5f57"></div>
            <div class="lp-dot" style="background:#febc2e"></div>
            <div class="lp-dot" style="background:#28c840"></div>
            <div class="lp-mockup-title">MatMat — Ciljevi</div>
          </div>
          <div class="lp-mockup-body">
            <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:14px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:20px">
              <div style="font-size:52px;font-weight:800;letter-spacing:-.04em;color:#fbbf24;line-height:1">33</div>
              <div>
                <div style="font-size:15px;font-weight:600;color:rgba(255,255,255,.8)">dana u nizu</div>
                <div style="font-size:12px;color:rgba(255,255,255,.35);margin-top:2px">Nastavi danas da ne izgubiš streak!</div>
              </div>
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;font-family:var(--font-mono)">Travanj 2026</div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">
              {#each ["Po","Ut","Sr","Če","Pe","Su","Ne"] as d (d)}
                <div style="text-align:center;font-size:10px;color:rgba(255,255,255,.2);padding-bottom:4px">{d}</div>
              {/each}
              {#each STREAK_DAYS as d, i (i)}
                <div style="aspect-ratio:1;border-radius:6px;background:{i===STREAK_DAYS.length-1?'#fbbf24':d?'rgba(251,191,36,.35)':'rgba(255,255,255,.04)'};box-shadow:{i===STREAK_DAYS.length-1?'0 0 10px rgba(251,191,36,.5)':'none'}"></div>
              {/each}
            </div>
            <div style="margin-top:20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-size:13px;font-weight:500;color:rgba(255,255,255,.7)">Dnevni cilj</div>
                <div style="font-size:12px;color:oklch(0.72 0.18 160);font-family:var(--font-mono);font-weight:600">7 / 10</div>
              </div>
              <div style="height:6px;border-radius:99px;background:rgba(255,255,255,.06)">
                <div style="height:100%;border-radius:99px;width:70%;background:oklch(0.65 0.2 160)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Programs section -->
  <div class="lp-programs-section" id="programi">
    <div class="lp-programs-inner">
      <div class="lp-programs-header">
        <div class="lp-section-kicker">Programi</div>
        <h2 class="lp-section-h2">Priprema za državnu maturu</h2>
        <p class="lp-section-lead">Odaberi razinu i odmah kreni — algoritam se prilagođava tebi.</p>
      </div>

      <div class="lp-prog-cards">
        {#each PROGRAMS as prog, i (prog.id)}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            class="lp-prog-card {activeProgIdx === i ? 'active' : ''}"
            onclick={() => activeProgIdx = i}
          >
            <div class="lp-prog-badge" style="background: hsl({prog.color} 75% 55%)">{prog.badge}</div>
            <div class="lp-prog-name">{prog.name}</div>
            <div class="lp-prog-kind">{prog.kind}</div>
          </div>
        {/each}
      </div>

      <div class="lp-prog-detail-box">
        <h3>{activeProg.title}</h3>
        <p>{activeProg.desc}</p>
        <div class="lp-prog-chips">
          {#each activeProg.chips as chip (chip)}
            <div class="lp-prog-chip"><span class="chk">✓</span> {chip}</div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Final CTA -->
  <section class="lp-cta-section">
    <h2>Koliko dana do mature?</h2>
    <p>Svaki dan koji prođe bez ponavljanja je dan koji ćeš plaćati tjedan prije ispita. Počni danas, 10 minuta.</p>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button class="google-btn" onclick={start} style="margin:0 auto;display:inline-flex">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Počni besplatno s Googleom
    </button>
    <div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,.3)">Bez kreditne kartice. Radi odmah u pregledniku.</div>
  </section>

  <!-- Footer -->
  <footer class="lp-footer">
    <div style="display:flex;align-items:center;gap:8px">
      <div class="brand-mark" style="width:20px;height:20px;font-size:10px;border-radius:6px">M</div>
      <span>MatMat · matmat.online</span>
    </div>
    <div class="lp-footer-links">
      <a href="mailto:info@matmat.online">info@matmat.online</a>
    </div>
    <span>© {new Date().getFullYear()} MatMat</span>
  </footer>
</div>

<style>
  .lp {
    position: fixed;
    inset: 0;
    background: #0d0d10;
    overflow-y: auto;
    z-index: 100;
    scroll-behavior: smooth;
    font-family: var(--font-sans);
  }

  /* Hero */
  .lp-hero {
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: 120px 40px 80px;
    position: relative;
    overflow: hidden;
  }
  .lp-hero::before {
    content: '';
    position: absolute; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 70% 60% at 50% -10%, oklch(0.55 0.22 270 / 0.35), transparent 70%),
      radial-gradient(ellipse 50% 40% at 80% 80%, oklch(0.55 0.22 230 / 0.12), transparent 60%),
      #0d0d10;
  }
  .lp-hero::after {
    content: '';
    position: absolute; inset: 0; z-index: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent);
  }
  .lp-hero > * { position: relative; z-index: 1; }

  .lp-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 16px;
    border-radius: 999px;
    background: oklch(0.55 0.22 270 / 0.15);
    border: 1px solid oklch(0.55 0.22 270 / 0.35);
    font-size: 12px; font-weight: 500;
    color: oklch(0.82 0.12 270);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 32px;
  }
  .lp-hero-badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 8px var(--success);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .lp-h1 {
    font-size: clamp(48px, 7vw, 88px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.0;
    margin: 0 0 28px;
    color: #fff;
    max-width: 14ch;
  }
  .lp-h1 .accent {
    background: linear-gradient(135deg, oklch(0.72 0.22 270), oklch(0.72 0.22 230));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lp-lead {
    font-size: clamp(17px, 2vw, 20px);
    color: rgba(255,255,255,0.55);
    max-width: 480px;
    margin: 0 auto 48px;
    line-height: 1.6;
  }

  .lp-hero-ctas {
    display: flex; gap: 14px; justify-content: center; align-items: center;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .google-btn {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 16px 28px;
    background: #fff;
    border: none;
    border-radius: 14px;
    font-size: 15px; font-weight: 600;
    color: #18181b;
    cursor: pointer;
    transition: transform .15s, box-shadow .15s, background .15s;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  }
  .google-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    background: #f4f4f5;
  }

  .btn-ghost-lp {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 16px 24px;
    border-radius: 14px;
    font-size: 15px; font-weight: 500;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: color .15s;
    background: none; border: none;
    text-decoration: none;
  }
  .btn-ghost-lp:hover { color: #fff; }

  .lp-hero-note {
    font-size: 12px;
    color: rgba(255,255,255,0.25);
    letter-spacing: 0.02em;
  }

  /* Hero visual — app preview */
  .lp-hero-visual {
    width: 100%;
    max-width: 860px;
    margin: 56px auto 0;
    position: relative;
  }
  .lp-screen-outer {
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04) inset,
      0 40px 100px rgba(0,0,0,0.7),
      0 0 80px oklch(0.55 0.22 270 / 0.12);
  }
  .lp-screen-topbar {
    background: #18181b;
    padding: 12px 16px;
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lp-screen-dot { width: 10px; height: 10px; border-radius: 50%; }
  .lp-screen-frame { display: flex; height: 340px; background: #111113; }
  .lp-screen-sidebar {
    width: 180px; flex-shrink: 0;
    border-right: 1px solid rgba(255,255,255,0.06);
    background: #0d0d10;
    padding: 16px 10px;
    display: flex; flex-direction: column; gap: 3px;
  }
  .sb-brand {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 8px 16px;
  }
  .sb-logo { width: 22px; height: 22px; border-radius: 6px; background: var(--primary); }
  .sb-name { font-size: 13px; font-weight: 700; }
  .lp-sb-item {
    padding: 7px 10px; border-radius: 8px;
    font-size: 12px; color: rgba(255,255,255,0.35);
    display: flex; align-items: center; gap: 8px;
  }
  .lp-sb-item.active { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
  .lp-sb-dot { width: 14px; height: 14px; border-radius: 4px; background: rgba(255,255,255,0.08); flex-shrink: 0; }
  .lp-sb-dot.accent { background: var(--primary); }
  .lp-sb-section-label {
    margin-top: 12px;
    padding: 0 8px;
    font-size: 10px;
    color: rgba(255,255,255,0.2);
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .lp-screen-main { flex: 1; padding: 20px 24px; overflow: hidden; }
  .lp-screen-main-label { font-size: 11px; color: rgba(255,255,255,0.25); margin-bottom: 12px; font-family: var(--font-mono); }
  .lp-task-preview {
    padding: 18px 20px;
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 12px;
  }
  .lp-task-preview .label {
    font-size: 10px; text-transform: uppercase;
    letter-spacing: .1em; color: rgba(255,255,255,0.3);
    font-family: var(--font-mono); margin-bottom: 10px;
  }
  .lp-task-preview .task-text { font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 14px; line-height: 1.5; }
  .lp-step-row { display: flex; gap: 12px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; }
  .lp-step-row:last-child { border: none; }
  .lp-step-num { color: rgba(255,255,255,0.2); font-family: var(--font-mono); font-size: 11px; width: 20px; flex-shrink: 0; padding-top: 1px; }
  .lp-step-body { color: rgba(255,255,255,0.5); }
  .lp-screen-rating-label { font-size: 11px; color: rgba(255,255,255,0.2); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .06em; }
  .lp-rating-row { display: flex; gap: 8px; }
  .lp-rate {
    flex: 1; padding: 8px 4px; text-align: center;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px; font-size: 11px;
    color: rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.02);
  }

  /* Proof strip */
  .lp-proof {
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 28px 60px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.02);
    flex-wrap: wrap;
    gap: 0;
  }
  .lp-proof-stat { text-align: center; padding: 0 48px; flex-shrink: 0; }
  .lp-proof-stat .v { font-size: 32px; font-weight: 800; letter-spacing: -0.04em; color: #fff; }
  .lp-proof-stat .l { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 3px; }
  .lp-proof-div { width: 1px; height: 44px; background: rgba(255,255,255,0.08); flex-shrink: 0; }

  /* Feature rows */
  .lp-features-wrap { padding: 120px 0; }
  .lp-feature-row {
    max-width: 1100px; margin: 0 auto 120px;
    padding: 0 60px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }
  .lp-feature-row:last-child { margin-bottom: 0; }
  .lp-feature-row-rev { direction: rtl; }
  .lp-feature-row-rev > * { direction: ltr; }

  .lp-feature-kicker {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .1em;
    color: var(--primary);
    margin-bottom: 16px;
  }
  .lp-feature-title {
    font-size: clamp(30px, 3.5vw, 42px);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.1;
    color: #fff;
    margin: 0 0 18px;
  }
  .lp-feature-desc {
    font-size: 17px; line-height: 1.7;
    color: rgba(255,255,255,0.5);
    margin: 0 0 28px;
  }
  .lp-feature-points { display: flex; flex-direction: column; gap: 12px; }
  .lp-feature-point {
    display: flex; align-items: flex-start; gap: 12px;
    font-size: 15px; color: rgba(255,255,255,0.6);
  }
  .lp-feature-check {
    width: 20px; height: 20px; border-radius: 6px;
    background: oklch(0.55 0.22 270 / 0.2);
    border: 1px solid oklch(0.55 0.22 270 / 0.4);
    display: grid; place-items: center;
    flex-shrink: 0; margin-top: 1px;
    color: oklch(0.75 0.18 270);
    font-size: 11px; font-weight: 700;
  }
  .lp-feature-visual { border-radius: 16px; overflow: hidden; }

  /* Mockup window (feature rows) */
  .lp-mockup-box {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .lp-mockup-bar {
    background: #18181b;
    padding: 10px 14px;
    display: flex; align-items: center; gap: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lp-mockup-title { flex: 1; text-align: center; font-size: 11px; color: rgba(255,255,255,0.2); font-family: var(--font-mono); }
  .lp-dot { width: 9px; height: 9px; border-radius: 50%; }
  .lp-mockup-body { background: #111113; padding: 24px; }

  /* Programs */
  .lp-programs-section {
    background: rgba(255,255,255,0.02);
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 120px 60px;
  }
  .lp-programs-inner { max-width: 1100px; margin: 0 auto; }
  .lp-programs-header { text-align: center; margin-bottom: 64px; }
  .lp-section-kicker {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .1em;
    color: var(--primary); margin-bottom: 16px;
  }
  .lp-section-h2 {
    font-size: clamp(32px, 4vw, 52px);
    font-weight: 800; letter-spacing: -0.04em;
    color: #fff; margin: 0 0 16px;
  }
  .lp-section-lead {
    font-size: 18px; color: rgba(255,255,255,0.45);
    max-width: 500px; margin: 0 auto; line-height: 1.65;
  }
  .lp-prog-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 48px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
  .lp-prog-card {
    padding: 20px 16px 18px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    cursor: pointer;
    transition: border-color .15s, background .15s, transform .15s;
    display: flex; flex-direction: column; gap: 12px;
    text-align: center;
  }
  .lp-prog-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
  .lp-prog-card.active { border-color: var(--primary); background: oklch(0.55 0.22 270 / 0.1); }
  .lp-prog-badge {
    width: 44px; height: 44px; border-radius: 12px;
    display: grid; place-items: center;
    color: #fff; font-size: 11px; font-weight: 700;
    font-family: var(--font-mono);
    margin: 0 auto;
  }
  .lp-prog-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); line-height: 1.3; }
  .lp-prog-kind { font-size: 11px; color: rgba(255,255,255,0.3); }
  .lp-prog-detail-box {
    max-width: 700px; margin: 0 auto;
    padding: 36px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    text-align: left;
  }
  .lp-prog-detail-box h3 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 12px; letter-spacing: -0.02em; }
  .lp-prog-detail-box p { font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.7; margin: 0 0 20px; }
  .lp-prog-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .lp-prog-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 999px;
    font-size: 12px; font-weight: 500;
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.04);
  }
  .lp-prog-chip .chk { color: var(--success); }

  /* Final CTA */
  .lp-cta-section {
    margin: 0 60px 80px;
    border-radius: 24px;
    padding: 100px 60px;
    text-align: center;
    position: relative;
    overflow: hidden;
    background: oklch(0.28 0.08 270);
    border: 1px solid oklch(0.45 0.15 270 / 0.5);
  }
  .lp-cta-section::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 70% 70% at 50% 0%, oklch(0.55 0.22 270 / 0.25), transparent);
  }
  .lp-cta-section > * { position: relative; z-index: 1; }
  .lp-cta-section h2 {
    font-size: clamp(36px, 5vw, 60px);
    font-weight: 800; letter-spacing: -0.04em;
    color: #fff; margin: 0 0 16px;
  }
  .lp-cta-section p { font-size: 18px; color: rgba(255,255,255,0.6); margin: 0 0 40px; max-width: 480px; margin-left: auto; margin-right: auto; }

  /* Footer */
  .lp-footer {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 32px 60px;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; color: rgba(255,255,255,0.25);
  }
  .lp-footer-links { display: flex; gap: 24px; }
  .lp-footer a { color: rgba(255,255,255,0.25); transition: color .15s; }
  .lp-footer a:hover { color: rgba(255,255,255,0.6); }

  @media (max-width: 900px) {
    .lp-feature-row { grid-template-columns: 1fr; gap: 40px; padding: 0 24px; }
    .lp-feature-row-rev { direction: ltr; }
    .lp-prog-cards { grid-template-columns: 1fr; }
    .lp-screen-frame { height: auto; flex-direction: column; }
    .lp-screen-sidebar { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); flex-direction: row; height: auto; padding: 10px; flex-wrap: wrap; }
  }
  @media (max-width: 700px) {
    .lp-proof { padding: 20px; gap: 12px; }
    .lp-proof-div { display: none; }
    .lp-proof-stat { padding: 0 16px; }
    .lp-programs-section { padding: 60px 20px; }
    .lp-cta-section { margin: 0 16px 48px; padding: 60px 24px; }
    .lp-footer { padding: 24px 20px; flex-direction: column; gap: 12px; text-align: center; }
  }
</style>
