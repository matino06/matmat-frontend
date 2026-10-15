<script>
  // Interaktivna lekcija „zadatak prvo“: podzadaci jedan po jedan. Točan odgovor u prvom pokušaju → kratko „zašto“
  // i dalje; krivi odgovor ili „Ne znam“ → pomoć samo za taj podzadatak, pa blizanac. Duljina lekcije tako ovisi
  // o učeniku: tko zna, gotov je s tri odgovora (expertise reversal: puno objašnjenje smeta onome tko već zna).
  import "./lesson.css";
  import Korak from "./komponente/Korak.svelte";
  import Md from "./komponente/Md.svelte";
  import Sketch from "$lib/sketch/Sketch.svelte";
  import { provjeri, tocanOdgovor, uloga, ODGOVOR } from "./katalog/index.js";

  let { lekcija, onzavrsi = () => {} } = $props();

  const MAX_PONOVNO = 2; // nakon toliko krivih ponovnih pokušaja prikazuje se točan odgovor
  // ishod podzadatka; o njemu ovisi prijedlog ocjene za ponavljanje
  const ODMAH = "odmah";
  const UZ_POMOC = "uz_pomoc";
  const POKAZANO = "pokazan_odgovor";

  const novo = () =>
    lekcija.podzadaci.map((p) => ({
      faza: "pokusaj", // pokusaj → (pomoc → ponovno) → gotovo
      prvi: null, // ishod prvog pokušaja
      neZnam: false,
      korak: 0, // zadnji prikazani korak pomoći
      pomoc: p.pomoc.map(() => ({ ishod: null, gotov: false, pokazi: false })),
      ponovno: { ishod: null, pokusaji: 0, pokazi: false },
      rezultat: null, // ODMAH | UZ_POMOC | POKAZANO
    }));

  let stanja = $state(novo());
  let ekran = $state(0); // 0..n-1 podzadaci, n = sažetak
  let zadatakOtvoren = $state(true);

  let n = $derived(lekcija.podzadaci.length);
  let p = $derived(lekcija.podzadaci[ekran]);
  let st = $derived(stanja[ekran]);
  let zadatakTekst = $derived([lekcija.zadatak.tekst, ...lekcija.podzadaci.flatMap((x) => [x.zasto, x.objasnjenje])].join("\n"));

  function pitanje(odgovor) {
    const r = provjeri(p.pitanje, odgovor);
    st.prvi = r;
    if (r.prazno) return;
    if (r.tocno) zavrsi(ODMAH);
    else st.faza = "pomoc";
  }

  function neZnam() {
    st.neZnam = true;
    st.prvi = null;
    st.faza = "pomoc";
  }

  function pomocOdgovor(k, odgovor) {
    const r = provjeri(p.pomoc[k], odgovor);
    st.pomoc[k].ishod = r;
    if (r.tocno) st.pomoc[k].gotov = true;
  }

  function pomocPokazi(k) {
    st.pomoc[k].pokazi = true;
    st.pomoc[k].gotov = true;
  }

  function pomocDalje() {
    if (st.korak < p.pomoc.length - 1) st.korak++;
    else st.faza = "ponovno";
  }

  let cilj = $derived(p ? (p.blizanac ?? p.pitanje) : null);

  function ponovnoOdgovor(odgovor) {
    const r = provjeri(cilj, odgovor);
    st.ponovno.ishod = r;
    if (r.prazno) return;
    if (r.tocno) return zavrsi(UZ_POMOC);
    st.ponovno.pokusaji++;
    if (st.ponovno.pokusaji >= MAX_PONOVNO) pokaziOdgovor();
  }

  function pokaziOdgovor() {
    st.ponovno.pokazi = true;
    zavrsi(POKAZANO);
  }

  function zavrsi(rezultat) {
    st.rezultat = rezultat;
    st.faza = "gotovo";
  }

  function dalje() {
    ekran++;
    zadatakOtvoren = false;
    if (ekran === n) onzavrsi(sazetak());
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function ispocetka() {
    stanja = novo();
    ekran = 0;
    zadatakOtvoren = true;
  }

  // Prijedlog ocjene za ponavljanje (q 0–5) iz izvedbe: sve odmah → 5, uz pomoć → 3, pokazan odgovor → 1.
  function sazetak() {
    const r = stanja.map((s) => s.rezultat);
    const q = r.includes(POKAZANO) ? 1 : r.includes(UZ_POMOC) ? 3 : 5;
    return { rezultati: r, q };
  }

  // novi dio (pomoć, ponovni pokušaj, rezultat) pomakne se u vidno polje
  function uvid(node) {
    requestAnimationFrame(() => node.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  const korakGotov = (k) => uloga(p.pomoc[k]) !== ODGOVOR || st.pomoc[k].gotov;
</script>

<div class="lx lx-runner">
  <div class="lx-progress" aria-label={`Dio ${Math.min(ekran + 1, n + 1)} od ${n + 1}`}>
    {#each lekcija.podzadaci as x, i (x.id)}
      <span class="seg-bar" class:done={stanja[i].faza === "gotovo"} class:now={i === ekran}></span>
    {/each}
    <span class="seg-bar" class:now={ekran === n}></span>
  </div>

  <div class="lx-task card">
    <button class="lx-task-head" onclick={() => (zadatakOtvoren = !zadatakOtvoren)} aria-expanded={zadatakOtvoren}>
      <span class="lx-task-title">Zadatak</span>
      <span class="lx-task-toggle">{zadatakOtvoren ? "Sakrij" : "Prikaži"}</span>
    </button>
    {#if zadatakOtvoren}
      <div class="lx-task-body">
        <Md text={lekcija.zadatak.tekst} />
        {#if lekcija.zadatak.skica}<div class="lx-figure"><Sketch sketch={lekcija.zadatak.skica} text={zadatakTekst} /></div>{/if}
      </div>
    {/if}
  </div>

  {#if ekran < n}
    {#key ekran}
      <div class="lx-sub">
        <h2 class="lx-sub-title"><span class="lx-sub-id">{p.id})</span> {p.naslov}</h2>

        <Korak spec={p.pitanje} locked={st.faza !== "pokusaj"} ishod={st.prvi} onodgovor={pitanje} pokazi={st.rezultat === POKAZANO && !p.blizanac}>
          {#if st.faza === "pokusaj"}
            <div class="lx-actions"><button class="btn btn-quiet" onclick={neZnam}>Ne znam</button></div>
          {/if}
        </Korak>

        {#if st.faza !== "pokusaj" && st.rezultat !== ODMAH}
          <div class="lx-help" use:uvid>
            <div class="lx-help-title">{st.neZnam ? "Pogledajmo zajedno, korak po korak" : "Pomoć, korak po korak"}</div>
            {#each p.pomoc.slice(0, st.korak + 1) as k, i (i)}
              <div use:uvid>
                <Korak spec={k} locked={st.pomoc[i].gotov} pokazi={st.pomoc[i].pokazi} ishod={st.pomoc[i].ishod} onodgovor={(o) => pomocOdgovor(i, o)}>
                  {#if i === st.korak && st.faza === "pomoc"}
                    <div class="lx-actions">
                      {#if korakGotov(i)}
                        <button class="btn btn-primary" onclick={pomocDalje}>{i < p.pomoc.length - 1 ? "Dalje" : "Sad probaj sam"}</button>
                      {:else}
                        <button class="btn btn-quiet" onclick={() => pomocPokazi(i)}>Ne znam, pokaži</button>
                      {/if}
                    </div>
                  {/if}
                </Korak>
              </div>
            {/each}
          </div>
        {/if}

        {#if st.faza === "ponovno" || (st.faza === "gotovo" && st.rezultat !== ODMAH)}
          <div use:uvid>
            {#key cilj}
              <Korak spec={cilj} oznaka={p.blizanac ? "Sad ti: sličan zadatak" : "Sad ti: probaj ponovno"} locked={st.faza === "gotovo"} pokazi={st.ponovno.pokazi} ishod={st.ponovno.ishod} onodgovor={ponovnoOdgovor}>
                {#if st.faza === "ponovno" && st.ponovno.pokusaji > 0}
                  <div class="lx-actions"><button class="btn btn-quiet" onclick={pokaziOdgovor}>Pokaži točan odgovor</button></div>
                {/if}
              </Korak>
            {/key}
          </div>
        {/if}

        {#if st.faza === "gotovo"}
          <div class="lx-done" class:solved={st.rezultat === POKAZANO} use:uvid>
            {#if st.rezultat === ODMAH}
              <div class="lx-done-head">✓ Točno!</div>
              <Md text={p.zasto} />
            {:else if st.rezultat === UZ_POMOC}
              <div class="lx-done-head">✓ Bravo, sad znaš!</div>
              <Md text={p.zasto} />
            {:else}
              <div class="lx-done-head">Točan odgovor: <Md text={tocanOdgovor(cilj)} inline /></div>
              <p class="lx-solution">Ovo ćemo ti uskoro ponoviti, pa ćeš ga ponovno vježbati.</p>
            {/if}
            <details class="lx-more" open={st.rezultat === POKAZANO}>
              <summary>{st.rezultat === POKAZANO ? "Objašnjenje" : "Pokaži cijelo objašnjenje"}</summary>
              <Md text={p.objasnjenje} />
            </details>
          </div>
          <div class="lx-next">
            <button class="btn btn-primary btn-lg" onclick={dalje}>{ekran < n - 1 ? "Dalje" : "Završi"}</button>
          </div>
        {/if}
      </div>
    {/key}
  {:else}
    <div class="lx-summary">
      <h2 class="lx-sub-title">Gotovo!</h2>
      <section class="lx-step look">
        <div class="lx-zapamti-title">📌 Zapamti</div>
        <ul class="lx-zapamti">
          {#each lekcija.zapamti as t, i (i)}<li><Md text={t} inline /></li>{/each}
        </ul>
      </section>
      <div class="lx-results">
        {#each lekcija.podzadaci as x, i (x.id)}
          <div class="lx-result" data-r={stanja[i].rezultat}>
            <span>{x.id}) {x.naslov}</span>
            <span class="lx-result-tag">{{ [ODMAH]: "znao/la odmah", [UZ_POMOC]: "naučeno uz pomoć", [POKAZANO]: "treba vježbe" }[stanja[i].rezultat]}</span>
          </div>
        {/each}
      </div>
      <p class="lx-solution">
        {#if stanja.every((s) => s.rezultat === ODMAH)}Sve si znao/la odmah. Ovo ćemo ti ponoviti tek za dulje vrijeme.{:else}Ono što si naučio/la uz pomoć vratit će se ranije u ponavljanju.{/if}
      </p>
      <div class="lx-actions"><button class="btn btn-ghost" onclick={ispocetka}>Ispočetka</button></div>
    </div>
  {/if}
</div>

<style>
  .lx-runner {
    display: grid;
    gap: 14px;
    max-width: 720px;
    margin: 0 auto;
  }
  .lx-progress {
    display: flex;
    gap: 4px;
  }
  .seg-bar {
    flex: 1;
    height: 4px;
    border-radius: 999px;
    background: var(--border);
  }
  .seg-bar.done {
    background: var(--success);
  }
  .seg-bar.now {
    background: var(--primary);
  }
  .lx-task {
    border-color: var(--primary-border);
    background: color-mix(in srgb, var(--primary) 6%, var(--bg-elev));
  }
  .lx-task-head {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px var(--pad-4);
  }
  .lx-task-title {
    font-weight: 600;
  }
  .lx-task-toggle {
    font-size: 12px;
    color: var(--text-faint);
  }
  .lx-task-body {
    padding: 0 var(--pad-4) var(--pad-4);
  }
  .lx-sub {
    display: grid;
    gap: 12px;
  }
  .lx-sub-title {
    margin: 6px 0 0;
    font-size: 18px;
    font-weight: 600;
  }
  .lx-sub-id {
    color: var(--primary);
  }
  .lx-help {
    display: grid;
    gap: 10px;
    padding-left: 12px;
    border-left: 2px dashed var(--border-strong);
  }
  .lx-help-title {
    font-size: 13px;
    color: var(--text-dim);
    font-weight: 500;
  }
  .lx-done {
    padding: var(--pad-4);
    border-radius: var(--r-xl);
    border: 1px solid color-mix(in srgb, var(--success) 45%, transparent);
    background: color-mix(in srgb, var(--success) 7%, var(--bg-elev));
  }
  .lx-done.solved {
    border-color: var(--border-strong);
    background: var(--bg-elev);
  }
  .lx-done-head {
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--success);
  }
  .solved .lx-done-head {
    color: var(--text);
  }
  .lx-more {
    margin-top: 10px;
  }
  .lx-more summary {
    cursor: pointer;
    font-size: 13px;
    color: var(--text-dim);
  }
  .lx-more :global(.lx-md) {
    margin-top: 8px;
  }
  .lx-next {
    display: flex;
    justify-content: flex-end;
  }
  .lx-summary {
    display: grid;
    gap: 12px;
  }
  .lx-zapamti-title {
    font-weight: 600;
    margin-bottom: 6px;
  }
  .lx-zapamti {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 4px;
  }
  .lx-summary .lx-step {
    padding: var(--pad-4);
    border: 1px solid var(--lx-look-border);
    border-radius: var(--r-xl);
    background: color-mix(in srgb, var(--lx-look) 5%, var(--bg-elev));
  }
  .lx-results {
    display: grid;
    gap: 6px;
  }
  .lx-result {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .lx-result-tag {
    font-size: 12px;
    color: var(--text-dim);
  }
  .lx-result[data-r="odmah"] .lx-result-tag {
    color: var(--success);
  }
  .lx-result[data-r="pokazan_odgovor"] .lx-result-tag {
    color: var(--warn);
  }
</style>
