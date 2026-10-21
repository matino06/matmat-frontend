<script>
  import { goto } from "$app/navigation";
  import { userData } from "$lib/store/user.svelte";
  import { courseState, courseLabel } from "$lib/store/course.svelte";
  import RatingPicker, { RATINGS } from "$lib/components/ratingPicker/RatingPicker.svelte";
  import { LEKCIJE, ZADACI, DANA_DO_ISPITA } from "./scenarij";

  // Napredak → the two tasks → Napredak again, on a made-up course (scenarij.js).
  let faza = $state("prije");
  let ocjene = $state({});
  let indeks = $state(0);
  let otkriveno = $state(false);
  let odabrana = $state(null);
  let pickerKey = $state(0);

  let zadatak = $derived(ZADACI[indeks]);
  let ocjenaZadatka = $derived(ocjene[zadatak.id]);
  let rijeseno = $derived(Object.keys(ocjene).length);

  const datumIspita = new Date(Date.now() + DANA_DO_ISPITA * 86400000)
    .toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "numeric" });

  // Days until each lesson returns, once its task is rated.
  const za = (l) => (l.dani && ocjene[l.id] != null ? l.dani[ocjene[l.id]] : l.za);
  const prijeIspita = (l) => za(l) < DANA_DO_ISPITA;
  const tocno = (l) => l.tocno + (ocjene[l.id] >= 3 ? 1 : ocjene[l.id] != null ? -l.tocno : 0);

  let lekcije = $derived(LEKCIJE.map((l) => ({ ...l, dana: za(l), opet: prijeIspita(l), tocno: tocno(l) })));
  let sutra = $derived(lekcije.filter((l) => l.opet));

  let cilj = $derived(userData.user ? (courseLabel(courseState.courseId) ?? "svoj predmet") : null);

  const bold = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const kada = (d) => (d === 0 ? "danas" : d === 1 ? "sutra" : `za ${d} dana`);

  function track(event, params = {}) {
    window.gtag?.("event", event, params);
  }

  function kreni() {
    faza = "zadaci";
    track("uvod_zadaci");
  }

  function potvrdi() {
    ocjene[zadatak.id] = odabrana.k;
    odabrana = null;
  }

  function dalje() {
    if (indeks < ZADACI.length - 1) {
      indeks += 1;
      otkriveno = false;
      pickerKey += 1;
    } else {
      faza = "poslije";
      track("uvod_zavrsen", { ocjene: ZADACI.map((z) => ocjene[z.id]).join(",") });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function ispocetka() {
    ocjene = {};
    indeks = 0;
    otkriveno = false;
    odabrana = null;
    pickerKey += 1;
    faza = "prije";
    window.scrollTo({ top: 0 });
  }

  function izadi(preskoceno) {
    if (preskoceno) track("uvod_preskocen", { faza });
    goto(userData.user ? "/tasks" : "/");
  }

  function onKey(e) {
    if (faza !== "zadaci" || otkriveno || e.code !== "Space") return;
    if (e.target.closest?.("button, input, textarea")) return;
    e.preventDefault();
    otkriveno = true;
  }
</script>

<svelte:window onkeydown={onKey} />
<svelte:head><title>Uvod · MatMat</title></svelte:head>

<div class="uvod">
  <header class="uvod-top">
    <div class="mark">M</div>
    <div class="koraci" aria-label="Koraci uvoda">
      <span class:on={faza === "prije"} class:gotovo={faza !== "prije"}>Napredak</span>
      <span class="sep">→</span>
      <span class:on={faza === "zadaci"} class:gotovo={faza === "poslije"}>Zadaci</span>
      <span class="sep">→</span>
      <span class:on={faza === "poslije"}>Napredak</span>
    </div>
    {#if faza !== "poslije"}
      <button class="btn btn-quiet" onclick={() => izadi(true)}>Preskoči uvod</button>
    {:else}
      <span></span>
    {/if}
  </header>

  {#if faza === "prije" || faza === "poslije"}
    <div class="zadaci-head">
      <div>
        <h1>Napredak</h1>
        <div class="sub">Probni predmet · lagani zadaci, da gledaš kako MatMat planira</div>
      </div>
    </div>

    <div class="card ispit">
      <span class="ispit-ico" aria-hidden="true">📅</span>
      <div>
        <div class="ispit-naziv">Probni ispit</div>
        <div class="ispit-datum">{datumIspita}</div>
      </div>
      <span class="ispit-za">za {DANA_DO_ISPITA} dana</span>
    </div>

    {#if faza === "prije"}
      <div class="coach">
        <p>
          <b>Ispit je prekosutra.</b> Četiri lekcije pamtiš i nakon ispita, pa ih do tada ne moraš ponavljati.
          Dvije bi zaboravio prije ispita, zato su danas na rasporedu.
        </p>
      </div>
    {:else if !sutra.length}
      <div class="ishod ok">
        <span class="ishod-ico" aria-hidden="true">🎯</span>
        <div>
          <b>Spreman si za ispit.</b>
          Svih {LEKCIJE.length} lekcija pamtiš do ispita, pa do tada nemaš što ponavljati.
        </div>
      </div>
    {:else}
      <div class="ishod">
        <span class="ishod-ico" aria-hidden="true">🔁</span>
        <div>
          <b>{LEKCIJE.length - sutra.length} od {LEKCIJE.length} lekcija pamtiš do ispita.</b>
          {sutra.map((l) => l.naziv).join(" i ")} ponavljaš sutra, dan prije ispita, i
          onda si spreman. Dobro je što si ocijenio iskreno: tako ponoviš prije nego što zatreba.
        </div>
      </div>
    {/if}

    <div class="ishod-list lista">
      {#each lekcije as l (l.id)}
        {@const promijenjena = faza === "poslije" && l.dani}
        <div class="ishod-row red" class:danas={faza === "prije" && l.dani} class:promijenjena>
          <div class="ishod-status {l.dana === 0 || l.opet ? 'learning' : 'mastered'}"></div>
          <div class="ishod-title">{l.naziv}</div>
          <div class="ishod-mini" aria-label="{l.tocno} od 5">
            {#each [0, 1, 2, 3, 4] as j (j)}<div class="dot {j < l.tocno ? 'filled' : ''}"></div>{/each}
          </div>
          <div class="kada">
            <span class="kada-dan" class:danas-txt={l.dana === 0 || l.opet}>{kada(l.dana)}</span>
            {#if l.dana >= DANA_DO_ISPITA}<span class="tag ok">nakon ispita</span>
            {:else if l.dana === 1}<span class="tag">prije ispita</span>{/if}
          </div>
        </div>
      {/each}
    </div>

    {#if faza === "prije"}
      <div class="akcije">
        <button class="btn btn-primary btn-lg" onclick={kreni}>Ponovi ih · 2 zadatka →</button>
      </div>
    {:else}
      <div class="coach">
        <p>
          <b>Isto ti MatMat radi za maturu.</b> Svaki dan dobiješ samo lekcije koje bi inače zaboravio prije
          ispita. Ono što pamtiš ne vraća se dok ne zatreba, pa te ne zatrpava ponavljanjem.
        </p>
      </div>
      <div class="akcije">
        <button class="btn btn-ghost" onclick={ispocetka}>Ponovi uvod</button>
        <button class="btn btn-primary btn-lg" onclick={() => izadi(false)}>
          {cilj ? `Kreni na ${cilj} →` : "Prijavi se i kreni →"}
        </button>
      </div>
    {/if}
  {:else}
    <div class="zadaci-head">
      <div>
        <h1>Zadaci za danas</h1>
        <div class="sub">Probni predmet · 2 zadatka planirano · <span class="mono">{rijeseno}</span> riješeno</div>
      </div>
    </div>

    <div class="lekcija-chip">
      <span class="ishod-status learning"></span>
      <span>Lekcija <b>{zadatak.naziv}</b></span>
      <span class="chip-povijest">{zadatak.povijest}</span>
    </div>

    <article class="card task-card">
      <div class="zadatak">{@html bold(zadatak.zadatak)}</div>

      {#if !otkriveno}
        <div class="coach coach-in">
          <p>Riješi ga u glavi, pa otvori rješenje. U pravim zadacima ovdje rješavaš na papiru ili korak po korak.</p>
        </div>
        <div class="otkrij">
          <button class="btn btn-primary btn-lg" onclick={() => (otkriveno = true)}>Pokaži rješenje</button>
          <span class="hint">Pokušaj sam · <span class="kbd-chip">Space</span> za rješenje</span>
        </div>
      {:else}
        <div class="rjesenje">
          <h3>Rješenje</h3>
          <div class="zadatak mali">{@html bold(zadatak.rjesenje)}</div>

          {#if ocjenaZadatka == null}
            <div class="coach coach-in">
              {#if indeks === 0}
                <p>
                  <b>Ocjena određuje kad se lekcija vraća.</b> Prijeđi preko ocjena (na mobitelu dodirni) i pogledaj.
                  S <b>4 ili 5</b> lekciju znaš i na dan ispita, pa se vraća tek nakon njega.
                  S <b>3 ili manje</b> vraća se sutra, dan prije ispita.
                </p>
              {:else}
                <p>Ova je riješena već dvaput, pa je s dobrom ocjenom razmak još duži. Što bolje znaš, to rjeđe ponavljaš.</p>
              {/if}
            </div>
            <div class="rating-row">
              <div class="rating-label">Kako ti je išlo?</div>
              {#if odabrana}
                <div class="rating-confirm">
                  <span class="rating-confirm-chosen" style="color:{odabrana.color}">{odabrana.k} — {odabrana.t}</span>
                  <span class="rating-confirm-kada">vraća se {kada(zadatak.dani[odabrana.k])}</span>
                  <div class="rating-confirm-btns">
                    <button class="btn btn-primary" onclick={potvrdi}>Potvrdi i nastavi</button>
                    <button class="btn btn-ghost" onclick={() => { odabrana = null; pickerKey += 1; }}>Promijeni</button>
                  </div>
                </div>
              {:else}
                {#key pickerKey}
                  <RatingPicker days={zadatak.dani} onSelect={(r) => (odabrana = r)} />
                {/key}
              {/if}
            </div>
          {:else}
            {@const dana = zadatak.dani[ocjenaZadatka]}
            <div class="zabiljezeno" class:opet={dana < DANA_DO_ISPITA}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <b>Zabilježeno: {RATINGS[ocjenaZadatka].t.toLowerCase()}.</b>
                {#if dana >= DANA_DO_ISPITA}
                  {zadatak.naziv} se vraća {kada(dana)}, nakon ispita.
                {:else}
                  {zadatak.naziv} se vraća sutra, dan prije ispita, da je ponoviš dok još stigneš.
                {/if}
              </div>
            </div>
            <div class="akcije">
              <button class="btn btn-primary btn-lg" onclick={dalje}>
                {indeks < ZADACI.length - 1 ? "Sljedeći zadatak →" : "Pogledaj Napredak →"}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </article>
  {/if}
</div>

<style>
  .uvod {
    max-width: 760px;
    margin: 0 auto;
    padding: 24px 24px 64px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .uvod-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 18px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .mark {
    width: 36px; height: 36px; border-radius: var(--r-md);
    background: var(--primary);
    display: grid; place-items: center;
    color: #fff; font-weight: 800; font-size: 15px;
    font-family: var(--font-mono);
  }
  .koraci { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-faint); }
  .koraci .on { color: var(--text); font-weight: 600; }
  .koraci .gotovo { color: var(--primary); }
  .koraci .sep { opacity: .5; }

  .zadaci-head { margin-bottom: 0; }

  .ispit {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
  }
  .ispit-ico { font-size: 22px; }
  .ispit > div { flex: 1; }
  .ispit-naziv { font-size: 14px; font-weight: 600; }
  .ispit-datum { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
  .ispit-za {
    font-family: var(--font-mono); font-size: 12px; font-weight: 600;
    color: var(--warn);
    padding: 4px 10px; border-radius: var(--r-pill);
    background: color-mix(in srgb, var(--warn) 12%, transparent);
  }

  .coach {
    border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent);
    background: color-mix(in srgb, var(--primary) 9%, transparent);
    border-radius: var(--r-lg);
    padding: 14px 16px;
  }
  .coach p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--text-dim); }
  .coach b { color: var(--text); font-weight: 600; }
  .coach-in { margin-top: 18px; }

  .ishod {
    display: flex; gap: 14px; align-items: flex-start;
    padding: 16px 18px;
    border-radius: var(--r-lg);
    border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent);
    background: color-mix(in srgb, var(--warn) 9%, transparent);
    font-size: 14px; line-height: 1.6; color: var(--text-dim);
    animation: pojava .5s ease both;
  }
  .ishod.ok {
    border-color: color-mix(in srgb, var(--success) 40%, transparent);
    background: color-mix(in srgb, var(--success) 9%, transparent);
  }
  .ishod b { color: var(--text); font-weight: 600; }
  .ishod-ico { font-size: 22px; line-height: 1.3; }

  .lista .red { grid-template-columns: 20px 1fr auto auto; }
  .red.danas { box-shadow: inset 3px 0 0 var(--warn); }
  .red.promijenjena { animation: istakni 1.6s ease .2s both; }
  /* Fixed width, so the dots line up across rows (each row is its own grid). */
  .kada { display: flex; align-items: center; gap: 8px; justify-content: flex-end; width: 186px; }
  .kada-dan { font-family: var(--font-mono); font-size: 12px; color: var(--text-dim); }
  .kada-dan.danas-txt { color: var(--warn); font-weight: 600; }
  .tag {
    font-size: 11px; padding: 2px 8px; border-radius: var(--r-pill);
    color: var(--warn); background: color-mix(in srgb, var(--warn) 12%, transparent);
    white-space: nowrap;
  }
  .tag.ok { color: var(--success); background: color-mix(in srgb, var(--success) 12%, transparent); }

  .akcije { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 4px; }

  .lekcija-chip {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    font-size: 13px; color: var(--text-dim);
  }
  .lekcija-chip b { color: var(--text); font-weight: 600; }
  .chip-povijest { color: var(--text-faint); }

  .zadatak { font-size: 22px; line-height: 1.5; }
  .zadatak.mali { font-size: 18px; }
  .zadatak :global(b) { font-weight: 700; }
  .otkrij { margin-top: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .hint { color: var(--text-faint); font-size: 12px; }

  .rjesenje { margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--border); }
  .rjesenje h3 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: .06em; }

  /* As on /tasks. */
  .rating-confirm { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .rating-confirm-chosen { font-size: 15px; font-weight: 600; }
  .rating-confirm-btns { display: flex; gap: 8px; }
  .rating-confirm-kada { font-family: var(--font-mono); font-size: 12px; color: var(--text-dim); }

  .zabiljezeno {
    margin-top: 20px;
    display: flex; gap: 10px; align-items: flex-start;
    color: var(--success);
    font-size: 14px; line-height: 1.6;
  }
  .zabiljezeno div { color: var(--text-dim); }
  .zabiljezeno b { color: var(--text); }
  .zabiljezeno.opet { color: var(--warn); }
  .zabiljezeno svg { margin-top: 3px; flex-shrink: 0; }

  @keyframes istakni {
    0% { background: var(--bg-elev); }
    30% { background: color-mix(in srgb, var(--success) 16%, var(--bg-elev)); }
    100% { background: var(--bg-elev); }
  }
  @keyframes pojava {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
  }

  @media (max-width: 700px) {
    .uvod { padding: 16px 16px 48px; }
    .koraci .sep, .koraci span:not(.on) { display: none; }
    .lista .red { grid-template-columns: 14px 1fr auto; gap: 10px; padding: 12px 14px; }
    .lista .ishod-mini { display: none; }
    .kada { width: auto; flex-direction: column; align-items: flex-end; gap: 3px; }
    .zadatak { font-size: 19px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .red.promijenjena, .ishod { animation: none; }
  }
</style>
