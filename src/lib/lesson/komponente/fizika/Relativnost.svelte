<script>
  // Specijalna relativnost: postulat, svjetlosni sat, mion, brod, energija. Glavna komponenta drži kontrole
  // (klizač brzine, prekidače) i odgovor (predvidi / postavi / izracunaj); scene samo crtaju stanje iz
  // katalog/fizika/relativnost.js. Ishod i izvedene veličine vide se tek nakon točnog odgovora ili „pokazi“.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Postulat from "./_RelativnostPostulat.svelte";
  import Sat from "./_RelativnostSat.svelte";
  import Mion from "./_RelativnostMion.svelte";
  import Brod from "./_RelativnostBrod.svelte";
  import Energija from "./_RelativnostEnergija.svelte";
  import {
    opcijePostulata,
    ocitanja,
    vidljivo,
    pitanja,
    izracun,
    VELICINE,
    fmtBeta,
    korijen,
    betaBroda,
    gama,
    tocnaBeta,
    korakPostavi,
    ishodPostavi,
    ostvarujeCilj,
    brojF,
  } from "$lib/lesson/katalog/fizika/relativnost.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const scena = untrack(() => spec.scena);
  const istrazi = nacin === "istrazi";
  const gledanje = istrazi || nacin === "prikaz";
  const uid = Math.random().toString(36).slice(2, 8);

  // ── stanje scene ──
  const POC_BETA = untrack(() =>
    scena === "svjetlosni_sat"
      ? (spec.beta ?? 0.6)
      : scena === "energija"
        ? (spec.beta ?? 0)
        : scena === "brod"
          ? (betaBroda(spec) ?? 0.3)
          : (spec.beta ?? 0.6),
  );
  let beta = $state(POC_BETA);
  let smjer = $state(untrack(() => spec.smjer ?? "prema"));
  let pogled = $state(
    untrack(() => spec.pogled ?? (scena === "mion" ? "zemlja" : "zemlja")),
  );
  let pokreni = $state(0); // svako povećanje ponovo pokrene animaciju
  const restart = () => pokreni++;

  // ── energija (istrazi): obroci energije ──
  const obrok = untrack(() => spec.obrok ?? 0.5);
  const gPoc = untrack(() => (isFinite(gama(POC_BETA)) ? gama(POC_BETA) : 1));
  let dodano = $state(0); // u E₀
  let g = $derived(
    scena === "energija" && istrazi ? gPoc + dodano : gama(beta),
  );

  // ── predvidi ──
  const opcije = untrack(() =>
    nacin === "predvidi" ? opcijePostulata(spec) : [],
  );
  let izbor = $state(null);

  // ── postavi ──
  const postavi = nacin === "postavi";
  const korak = untrack(() => (postavi ? korakPostavi(spec) : 0.01));
  let poslanaBeta = $state(null);
  $effect(() => {
    if (!pokazi || !postavi) return;
    untrack(() => (beta = tocnaBeta(spec)));
  });
  const zaokruzi = (b) =>
    Math.min(0.999, Math.max(0, Math.round(b / korak) * korak));
  function pomakni(d) {
    if (locked || pokazi) return;
    beta = Math.round(zaokruzi(beta + d) * 1e6) / 1e6;
  }

  // ── izracunaj ──
  const pit = untrack(() => pitanja(spec));
  let unosi = $state(pit.map(() => ""));
  const odgovori = untrack(() =>
    nacin === "izracunaj" ? pit.map((q) => izracun(spec, q)) : [],
  );
  const zapis = (x) =>
    Math.abs(x) < 1e-3 || Math.abs(x) >= 1e6
      ? formatSci(x, 3)
      : formatNumber(Number(x.toPrecision(4)));
  $effect(() => {
    if (!pokazi || nacin !== "izracunaj") return;
    untrack(() => (unosi = odgovori.map((r) => zapis(r.vrijednost))));
  });
  function provjeriIzracun(e) {
    e?.preventDefault();
    if (locked) return;
    onodgovor([...unosi]);
  }
  function potencija(i) {
    const v = unosi[i].trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
  }

  // ── što se vidi ──
  let otkriveno = $derived.by(() => {
    if (gledanje) return true;
    if (pokazi || ishod?.tocno) return true;
    // postavi: ishod vlastitog (provjerenog) položaja, dok ga učenik ne pomakne; zaključana kopija ga ne pokazuje
    if (postavi)
      return (
        !locked &&
        poslanaBeta != null &&
        poslanaBeta === beta &&
        !!ishod &&
        !ishod.prazno
      );
    return false;
  });
  // u postavi se brod skrati i ravnalo očita tek nakon provjere; drugo (satovi) se vidi samo za točan odgovor
  let otkrivenoSve = $derived(gledanje || pokazi || !!ishod?.tocno);
  let vidi = $derived(new Set(vidljivo(spec, otkrivenoSve)));
  let stavke = $derived(
    ocitanja(spec, { beta, gama: g, otkriveno: otkrivenoSve }).filter(
      (o) => !o.skriveno,
    ),
  );
  let statusPostavi = $derived(
    postavi && otkriveno
      ? pokazi || ishod?.tocno || ostvarujeCilj(spec, beta)
        ? "ok"
        : "bad"
      : null,
  );
  let ishodTekst = $derived(
    postavi && otkriveno ? ishodPostavi(spec, beta).tekst : null,
  );

  function provjeri() {
    if (locked) return;
    if (nacin === "predvidi") onodgovor(izbor);
    if (postavi) {
      poslanaBeta = beta;
      onodgovor({ beta });
    }
  }
  // istrazi: promjena kontrola ponovo pokreće scenu
  $effect(() => {
    void beta;
    void smjer;
    void pogled;
    if (gledanje) untrack(restart);
  });
  // predvidi: utrka krene kad se odgovor otkrije
  $effect(() => {
    if (otkrivenoSve && !gledanje) untrack(restart);
  });

  const SMJEROVI = [
    { id: "prema", tekst: "prema Zemlji" },
    { id: "od", tekst: "od Zemlje" },
  ];
  const POGLEDI = {
    svjetlosni_sat: [
      { id: "zemlja", tekst: "sa Zemlje" },
      { id: "brod", tekst: "iz broda" },
    ],
    mion: [
      { id: "zemlja", tekst: "sa Zemlje" },
      { id: "mion", tekst: "iz miona" },
    ],
  };
  const raspon = {
    postulat: [0.1, 0.99, 0.01],
    svjetlosni_sat: [0, 0.99, 0.01],
    mion: [0.5, 0.999, 0.001],
    brod: [0, 0.999, 0.001],
  }[scena];
  const fmtV = (b) =>
    scena === "mion" || scena === "brod" ? fmtBeta(b, 3) : fmtBeta(b, 2);
  let faktor = $derived(korijen(beta));
</script>

{#if gledanje}
  <div class="rl-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure rl-fig">
  {#if scena === "postulat"}
    <Postulat
      {spec}
      {beta}
      {smjer}
      {pokreni}
      kreni={gledanje || otkrivenoSve}
      petlja={nacin === "prikaz"}
    />
  {:else if scena === "svjetlosni_sat"}
    <Sat {spec} {beta} {pogled} {pokreni} />
  {:else if scena === "mion"}
    <Mion {spec} {beta} {pogled} {pokreni} kreni={otkrivenoSve} />
  {:else if scena === "brod"}
    <Brod
      {spec}
      {beta}
      skratiti={otkriveno}
      {vidi}
      animiraj={otkrivenoSve}
      status={statusPostavi}
      {ishodTekst}
    />
  {:else if scena === "energija"}
    <Energija {spec} {g} kreni={otkrivenoSve} />
  {/if}
</figure>

<!-- očitanja -->
{#if stavke.length}
  <div class="rl-ocitanja" aria-live="polite">
    {#each stavke as o (o.kljuc)}
      <span class="rl-chip"
        ><Md text={o.oznaka} inline /> = <b>{o.tekst}</b></span
      >
    {/each}
  </div>
{/if}

<!-- faktor √(1 − v²/c²): isti broj u svim scenama -->
{#if (scena === "brod" || scena === "mion" || scena === "svjetlosni_sat") && vidi.has("faktor")}
  <div
    class="rl-faktor"
    aria-label="faktor korijen iz 1 minus v na kvadrat kroz c na kvadrat: {formatNumber(
      faktor,
    )}"
  >
    <div class="rl-faktor-t">
      {#if scena === "brod"}
        <span>L/L₀ = T₀/T = √(1 − v²/c²)</span>
      {:else if scena === "mion"}
        <span>T₀/T = √(1 − v²/c²)</span>
      {:else}
        <span>tik na Zemlji / tik u brodu = √(1 − v²/c²)</span>
      {/if}
      <b>{formatNumber(faktor)}</b>
    </div>
    <div class="rl-traka">
      <div class="rl-traka-p" style:width="{faktor * 100}%"></div>
    </div>
    <div class="rl-faktor-g">γ = 1/√(1 − v²/c²) = {brojF(gama(beta))}</div>
  </div>
{/if}

<!-- kontrole istraživanja -->
{#if istrazi && scena !== "energija"}
  <div class="rl-kontrole">
    <div class="rl-klizac">
      <label for="rl-b-{uid}"
        >brzina {scena === "mion" ? "miona" : "broda"}</label
      >
      <output for="rl-b-{uid}">v = {fmtV(beta)}c</output>
      <input
        id="rl-b-{uid}"
        type="range"
        min={raspon[0]}
        max={raspon[1]}
        step={raspon[2]}
        bind:value={beta}
        aria-valuetext="{fmtV(beta)} c"
      />
    </div>
    {#if scena === "postulat"}
      <div class="rl-seg" role="group" aria-label="smjer broda">
        {#each SMJEROVI as o (o.id)}
          <button
            type="button"
            class="rl-seg-b"
            class:sel={smjer === o.id}
            aria-pressed={smjer === o.id}
            onclick={() => (smjer = o.id)}>{o.tekst}</button
          >
        {/each}
      </div>
    {/if}
    {#if POGLEDI[scena]}
      <div class="rl-seg" role="group" aria-label="pogled">
        {#each POGLEDI[scena] as o (o.id)}
          <button
            type="button"
            class="rl-seg-b"
            class:sel={pogled === o.id}
            aria-pressed={pogled === o.id}
            onclick={() => (pogled = o.id)}>{o.tekst}</button
          >
        {/each}
      </div>
    {/if}
    <div class="lx-actions rl-akcije">
      <button type="button" class="btn btn-ghost" onclick={restart}>
        {scena === "postulat" ? "Pošalji ponovo" : "Ispočetka"}
      </button>
    </div>
  </div>
{:else if istrazi && scena === "energija"}
  <div class="rl-dodano">
    dodano: <b>{formatNumber(dodano)} E₀</b
    >{#if dodano > 0}&nbsp;({formatNumber(dodano / obrok)} × {formatNumber(
        obrok,
      )} E₀){/if}
  </div>
  <div class="lx-actions rl-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={() => (dodano += obrok)}
      >Dodaj energiju (+{formatNumber(obrok)} E₀)</button
    >
    <button
      type="button"
      class="btn btn-ghost"
      onclick={() => (dodano += 10 * obrok)}
      >+{formatNumber(10 * obrok)} E₀</button
    >
    <button
      type="button"
      class="btn btn-quiet"
      onclick={() => (dodano = 0)}
      disabled={dodano === 0}>Ispočetka</button
    >
  </div>
{:else if nacin === "prikaz"}
  <div class="lx-actions rl-akcije">
    {#if scena !== "energija" && scena !== "brod"}
      <button type="button" class="btn btn-ghost" onclick={restart}
        >Pogledaj ponovo</button
      >
    {/if}
  </div>
{/if}

<!-- odgovor -->
{#if nacin === "predvidi"}
  <div
    class="lx-options rl-opcije"
    role="radiogroup"
    aria-label="brzina koju izmjeri promatrač na Zemlji"
  >
    {#each opcije as o (o.id)}
      {@const sel = izbor === o.id}
      {@const ok = otkrivenoSve && o.id === "c"}
      <button
        type="button"
        role="radio"
        aria-checked={sel}
        class="lx-option"
        class:sel={sel && !ok}
        class:ok
        disabled={locked || pokazi}
        onclick={() => (izbor = o.id)}
      >
        <span class="lx-mark">{sel || ok ? "●" : ""}</span>
        <span
          ><b class="rl-op-v">{o.tekst}</b>
          <span class="rl-op-o">{o.opis}</span></span
        >
      </button>
    {/each}
  </div>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || pokazi || !izbor}>Provjeri</button
    >
    {#if otkrivenoSve}
      <button type="button" class="btn btn-ghost" onclick={restart}
        >Pogledaj utrku ponovo</button
      >
    {/if}
  </div>
{:else if postavi}
  <div class="rl-kontrole">
    <div class="rl-klizac">
      <label for="rl-b-{uid}">brzina broda</label>
      <output
        for="rl-b-{uid}"
        class:ok={statusPostavi === "ok"}
        class:bad={statusPostavi === "bad"}>v = {fmtBeta(beta, 3)}c</output
      >
      <input
        id="rl-b-{uid}"
        type="range"
        min="0"
        max="0.999"
        step={korak}
        bind:value={beta}
        disabled={locked || pokazi}
        aria-valuetext="{fmtBeta(beta, 3)} c"
      />
    </div>
    <div class="rl-fino" role="group" aria-label="fino namještanje brzine">
      {#each [-0.01, -0.001, 0.001, 0.01] as d (d)}
        {#if Math.abs(d) >= korak - 1e-12}
          <button
            type="button"
            class="btn btn-quiet"
            onclick={() => pomakni(d)}
            disabled={locked || pokazi}
            aria-label="{d > 0 ? 'povećaj' : 'smanji'} za {formatNumber(
              Math.abs(d),
            )} c">{d > 0 ? "+" : "−"}{formatNumber(Math.abs(d))}</button
          >
        {/if}
      {/each}
    </div>
  </div>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || pokazi}>Provjeri</button
    >
  </div>
{:else if nacin === "izracunaj"}
  <form class="rl-izr" onsubmit={provjeriIzracun}>
    {#each pit as q, i (i)}
      {@const m = VELICINE[scena][q.velicina]}
      {@const r = odgovori[i]}
      <div class="rl-red">
        <label for="rl-{uid}-{i}" class="rl-naziv">{q.naziv ?? m.naziv}</label>
        <div class="lx-broj">
          <span class="rl-oznaka"><Md text={m.oznaka} inline /> =</span>
          <input
            id="rl-{uid}-{i}"
            class="inp lx-broj-inp"
            class:ok={otkrivenoSve}
            inputmode="decimal"
            autocomplete="off"
            placeholder="?"
            disabled={locked}
            aria-label="{q.naziv ?? m.naziv}{r.jedinica
              ? ` u ${r.jedinica}`
              : ''}"
            bind:value={unosi[i]}
          />
          {#if r.jedinica}<span class="lx-unit">{r.jedinica}</span>{/if}
          {#if !locked && (Math.abs(r.vrijednost) < 1e-3 || Math.abs(r.vrijednost) >= 1e6)}
            <button
              type="button"
              class="btn btn-quiet rl-pot"
              onclick={() => potencija(i)}
              aria-label="Dodaj potenciju broja 10">·10ⁿ</button
            >
          {/if}
        </div>
      </div>
    {/each}
    <div class="lx-actions">
      <button
        class="btn btn-primary"
        type="submit"
        disabled={locked || unosi.some((u) => !u.trim())}>Provjeri</button
      >
    </div>
  </form>
{/if}

<style>
  .rl-tekst {
    margin-bottom: 10px;
  }
  .rl-fig {
    max-width: 440px;
    margin-bottom: 8px;
  }
  .rl-ocitanja {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 auto 10px;
    max-width: 440px;
  }
  .rl-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    font-size: 13px;
    color: var(--text-dim);
  }
  .rl-chip b {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text);
  }
  .rl-faktor {
    max-width: 440px;
    margin: 0 auto 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .rl-faktor-t {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }
  .rl-faktor-t b {
    font-family: var(--font-mono);
    color: var(--text);
  }
  .rl-traka {
    height: 10px;
    border-radius: 999px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .rl-traka-p {
    height: 100%;
    background: var(--primary);
    border-radius: 999px;
    transition: width 0.15s;
  }
  .rl-faktor-g {
    margin-top: 3px;
    font-size: 12px;
    color: var(--text-faint);
    text-align: right;
  }
  .rl-kontrole {
    display: grid;
    gap: 10px;
    max-width: 440px;
    margin: 0 auto;
  }
  .rl-klizac {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 2px 10px;
    font-size: 14px;
  }
  .rl-klizac label {
    color: var(--text-dim);
  }
  .rl-klizac output {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text);
    padding: 0 6px;
    border-radius: 6px;
  }
  .rl-klizac output.ok {
    background: color-mix(in srgb, var(--lx-ok) 14%, transparent);
  }
  .rl-klizac output.bad {
    background: color-mix(in srgb, var(--lx-bad) 12%, transparent);
  }
  .rl-klizac input {
    grid-column: 1 / -1;
    width: 100%;
    margin: 0;
    height: 32px;
    accent-color: var(--primary);
    cursor: pointer;
    touch-action: pan-y;
  }
  .rl-klizac input:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .rl-seg {
    display: flex;
    gap: 4px;
    padding: 3px;
    border-radius: var(--r-lg);
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
  }
  .rl-seg-b {
    flex: 1;
    min-height: 36px;
    border-radius: var(--r-md);
    font-size: 14px;
    color: var(--text-dim);
    background: transparent;
    border: 0;
  }
  .rl-seg-b.sel {
    background: var(--bg-elev);
    color: var(--text);
    font-weight: 600;
    box-shadow: 0 0 0 1px var(--primary-border);
  }
  .rl-akcije {
    justify-content: center;
    margin-top: 4px;
  }
  .rl-dodano {
    text-align: center;
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .rl-dodano b {
    font-family: var(--font-mono);
    color: var(--text);
  }
  .rl-fino {
    display: flex;
    justify-content: center;
    gap: 6px;
  }
  .rl-fino .btn {
    min-width: 58px;
    min-height: 38px;
    font-family: var(--font-mono);
  }
  .rl-opcije {
    margin-top: 6px;
  }
  .rl-op-v {
    font-family: var(--font-mono);
    margin-right: 6px;
  }
  .rl-op-o {
    font-size: 13px;
    color: var(--text-faint);
  }
  .rl-izr {
    display: grid;
    gap: 10px;
  }
  .rl-red {
    display: grid;
    gap: 4px;
  }
  .rl-naziv {
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .rl-oznaka {
    font-size: 15px;
    font-style: italic;
  }
  .rl-pot {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
</style>
