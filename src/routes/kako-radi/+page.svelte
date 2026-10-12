<script>
  import MarketingShell from "$lib/components/marketing/MarketingShell.svelte";
  import GoogleButton from "$lib/components/marketing/GoogleButton.svelte";
  import ClosingCta from "$lib/components/marketing/ClosingCta.svelte";
  import ForgettingCurve from "$lib/components/marketing/ForgettingCurve.svelte";
  import PrereqPath from "$lib/components/marketing/PrereqPath.svelte";
  import SpacingSim from "$lib/components/marketing/SpacingSim.svelte";

  // The landing page already shows the app (tasks, AI, progress); this page
  // explains the method behind it and why it works, then answers the usual
  // doubts before sign-in.

  const RESEARCH = [
    {
      figure: "2 od 10",
      title: "Vježbanje kroz zadatke i razmaknuto ponavljanje najkorisnije su tehnike učenja",
      text: "Pregled deset tehnika učenja samo je ove dvije ocijenio vrlo korisnima, za učenike svih dobi i u stvarnoj nastavi. Ponovno čitanje i podcrtavanje, koje učenici najčešće koriste, dobili su najnižu ocjenu.",
      source: "Dunlosky i sur., 2013, Psychological Science in the Public Interest",
      href: "https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html",
    },
    {
      figure: "317",
      title: "Razmak između ponavljanja treba rasti",
      text: "Analiza 317 eksperimenata pokazala je da razmaknuto učenje pamti bolje od nagomilanog, i da je najbolji razmak to dulji što dulje gradivo trebaš pamtiti. Zato se razmaci u MatMatu produljuju kako ishod svladavaš.",
      source: "Cepeda i sur., 2006, Psychological Bulletin",
      href: "https://pubmed.ncbi.nlm.nih.gov/16719566/",
    },
    {
      figure: "61 % : 38 %",
      title: "Miješani zadaci iz matematike pamte se bolje",
      text: "U 54 razreda matematike učenici koji su vježbali izmiješane vrste zadataka mjesec dana kasnije riješili su 61 % testa, a oni koji su vježbali vrstu po vrstu 38 %. Ponavljanja u MatMatu dolaze iz različitih ishoda, pa se vrste zadataka miješaju.",
      source: "Rohrer i sur., 2020, Journal of Educational Psychology",
      href: "https://ies.ed.gov/ncee/wwc/Study/88770",
    },
  ];

  const FAQ = [
    {
      q: "Koliko vremena trebam dnevno?",
      a: "Koliko sam odlučiš. Dnevni cilj postaviš sam, a MatMat svaki dan složi toliko zadataka. Za pamćenje je važnije raditi redovito nego puno odjednom.",
    },
    {
      q: "Što ako propustim dan?",
      a: "Ništa se ne gubi: zadaci koje je trebalo ponoviti pričekaju te. Kad vježbaš više dana zaredom, zaradiš i zaštitu niza, koja ga sačuva kad jedan dan preskočiš.",
    },
    {
      q: "Moram li već znati gradivo?",
      a: "Ne. Kreneš od osnova svakog područja, a teži ishodi se otključavaju kako svladavaš one prije njih. Ono što već znaš ocijeni visoko i vraćat će se rjeđe.",
    },
    {
      q: "Polažem B razinu. Je li MatMat za mene?",
      a: "Jest. Pri prijavi odabereš A ili B razinu, a zadaci i spremnost prate bodovanje te razine. Razinu možeš promijeniti bilo kad.",
    },
    {
      q: "Je li stvarno besplatan?",
      a: "Da. Prijaviš se Googleom i odmah rješavaš, bez kartice i bez instalacije.",
    },
  ];
</script>

<svelte:head>
  <title>MatMat — Kako radi</title>
  <meta name="description" content="MatMat te vraća na gradivo baš kad ga počneš zaboravljati i vodi te redom, od osnova prema složenijem. Evo kako radi razmaknuto ponavljanje i zašto je bolje od bubanja." />
</svelte:head>

<MarketingShell>
  <section class="kr-hero hm-wrap">
    <h1>Ono što naučiš danas, znat ćeš i na maturi</h1>
    <p class="kr-lead">
      MatMat ne slaže zadatke nasumično. Vraća te na gradivo baš kad ga počneš zaboravljati i vodi te redom, od osnova prema složenijem. Evo kako to radi i zašto.
    </p>
    <div class="kr-actions">
      <GoogleButton />
      <a class="kr-ghost" href="/#demo">Isprobaj aplikaciju</a>
    </div>
  </section>

  <section class="kr-split hm-wrap" aria-labelledby="kr-forget-h">
    <div class="kr-split-text">
      <h2 id="kr-forget-h">Zaboravljanje je normalno. Bubanje ga samo odgodi.</h2>
      <p class="kr-p">Nakon učenja gradivo brzo blijedi, a učenje noć prije ispita drži ga taman do ispita. Svako ponavljanje u pravom trenutku vraća znanje i usporava sljedeći pad.</p>
      <p class="kr-p">Zato razmak između ponavljanja smije rasti: prvo sutra, pa za nekoliko dana, pa za nekoliko tjedana.</p>
    </div>
    <div class="kr-split-part">
      <ForgettingCurve />
    </div>
  </section>

  <section class="kr-split hm-wrap" aria-labelledby="kr-scale-h">
    <div class="kr-split-text">
      <h2 id="kr-scale-h">Tvoja ocjena određuje razmak</h2>
      <p class="kr-p">Nakon svakog zadatka kažeš kako ti je išlo, od 0 do 5. Ocjena 0, 1 ili 2 vraća ishod već sutra i kreće ispočetka. Dobra ocjena razmak produljuje: prvo sutra, onda za 6 dana, pa sve dulje, ovisno o tome koliko ti ide.</p>
      <p class="kr-p">Probaj: ocijeni isti ishod četiri puta i vidi kad ti se vraća.</p>
    </div>
    <div class="kr-split-part">
      <SpacingSim />
    </div>
  </section>

  <section class="kr-split kr-split-rev hm-wrap" aria-labelledby="kr-order-h">
    <div class="kr-split-text">
      <h2 id="kr-order-h">Gradivo ide redom</h2>
      <p class="kr-p">Matematika se gradi sloj po sloj: logaritamsku jednadžbu ne možeš riješiti ako ne znaš pravila logaritama. Zato je gradivo složeno u područja, cjeline i ishode, a svaki ishod se otključa tek kad svladaš one na kojima se gradi.</p>
      <p class="kr-p">Na mapi gradiva uvijek vidiš što si svladao i što slijedi. Možeš i preskočiti naprijed, ali MatMat te prvo upozori da ti možda fali predznanje.</p>
    </div>
    <div class="kr-split-part">
      <PrereqPath />
    </div>
  </section>

  <section class="kr-research hm-wrap" aria-labelledby="kr-research-h">
    <h2 id="kr-research-h">Na čemu se to temelji</h2>
    <p class="kr-p kr-narrow">Ove tehnike nismo izmislili. Istražuju se desetljećima, a ovo su tri rezultata iz kojih je MatMat nastao.</p>
    <div class="kr-research-grid">
      {#each RESEARCH as r (r.source)}
        <article class="kr-study">
          <div class="kr-figure">{r.figure}</div>
          <h3>{r.title}</h3>
          <p>{r.text}</p>
          <a class="kr-source" href={r.href} target="_blank" rel="noopener noreferrer">{r.source}</a>
        </article>
      {/each}
    </div>
  </section>

  <section class="kr-faq hm-wrap" aria-labelledby="kr-faq-h">
    <h2 id="kr-faq-h">Česta pitanja</h2>
    <div class="kr-faq-list">
      {#each FAQ as f (f.q)}
        <details>
          <summary>
            {f.q}
            <svg class="kr-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
          </summary>
          <p>{f.a}</p>
        </details>
      {/each}
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

  section:not(.kr-hero) { padding-top: 80px; padding-bottom: 88px; border-top: 1px solid var(--border); }
  section h2 {
    font-size: clamp(28px, 3.4vw, 40px);
    line-height: 1.1;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  .kr-p { margin: 16px 0 0; font-size: 16px; line-height: 1.65; color: var(--text-dim); text-wrap: pretty; }
  .kr-narrow { max-width: 38em; }

  /* Text beside an illustration. */
  .kr-split {
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: 56px;
    align-items: center;
  }
  .kr-split-rev { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); }

  /* Research: one finding per column, its number first. */
  .kr-research-grid { margin-top: 40px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; }
  .kr-study { padding-top: 20px; border-top: 1px solid var(--border-strong); display: flex; flex-direction: column; }
  .kr-figure { font-size: 34px; font-weight: 600; letter-spacing: -0.03em; color: var(--text); line-height: 1.1; }
  .kr-study h3 { margin-top: 14px; font-size: 17px; line-height: 1.35; letter-spacing: -0.01em; }
  .kr-study p { margin: 10px 0 16px; font-size: 15px; line-height: 1.6; color: var(--text-dim); }
  .kr-source { margin-top: auto; font-size: 13px; color: var(--text-faint); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--border-strong); }
  .kr-source:hover { color: var(--text); }

  /* FAQ */
  .kr-faq-list { margin-top: 32px; max-width: 760px; border-top: 1px solid var(--border); }
  details { border-bottom: 1px solid var(--border); }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 0;
    font-size: 17px;
    font-weight: 500;
    color: var(--text);
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  .kr-chev { flex-shrink: 0; color: var(--text-faint); transition: transform 0.15s; }
  details[open] .kr-chev { transform: rotate(180deg); }
  details p { margin: -4px 0 20px; max-width: 40em; font-size: 15.5px; line-height: 1.65; color: var(--text-dim); }

  @media (max-width: 900px) {
    .kr-split, .kr-split-rev { grid-template-columns: 1fr; gap: 32px; }
    .kr-research-grid { grid-template-columns: 1fr; gap: 32px; }
  }
  @media (max-width: 640px) {
    .kr-hero { padding-top: 64px; padding-bottom: 64px; }
    .kr-lead { font-size: 16px; }
    .kr-actions { flex-direction: column; align-items: stretch; width: 100%; max-width: 320px; }
    .kr-actions > :global(*) { justify-content: center; }
    section:not(.kr-hero) { padding-top: 56px; padding-bottom: 64px; }
    summary { font-size: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .kr-chev { transition: none; }
  }
</style>
