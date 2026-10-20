<script>
  // Interaktivna lekcija „zadatak prvo“: podzadaci jedan po jedan. Točan odgovor u prvom pokušaju → kratko „zašto“
  // i dalje; krivi odgovor ili „Ne znam“ → pomoć samo za taj podzadatak, pa blizanac. Duljina lekcije tako ovisi
  // o učeniku: tko zna, gotov je s tri odgovora (expertise reversal: puno objašnjenje smeta onome tko već zna).
  // Lekcija s `cijeli` (jedan zadatak bez a, b, c) počinje cijelim zadatkom: tko ga riješi sam, gotov je; tko ne
  // zna, dobiva podzadatke kao vođeni put, a na kraju sličan cijeli zadatak bez koraka (cijeli.blizanac).
  // `rjesenje` (snippet stranice) je autorovo objašnjenje tekstualnog zadatka; uz `cijeli` ono je „Cijelo rješenje“.
  import "./lesson.css";
  import Korak from "./komponente/Korak.svelte";
  import Md from "./komponente/Md.svelte";
  import Vjezba from "./komponente/Vjezba.svelte";
  import Sketch from "$lib/sketch/Sketch.svelte";
  import GrafFunkcije from "./komponente/GrafFunkcije.svelte";
  import { provjeri, tocanOdgovor, uloga, ODGOVOR } from "./katalog/index.js";

  // `navrh` zamjenjuje dovođenje lekcije na vrh: demo na landing stranici ima vlastiti stupac sa scrollom, a
  // scrollIntoView bi pomaknuo cijelu stranicu.
  let { lekcija, onzavrsi = () => {}, rjesenje = null, navrh = null } = $props();

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

  const novoCijeli = () => ({ ishod: null, pokusaji: 0, rezultat: null, zavrsni: { ishod: null, pokusaji: 0, pokazi: false, rezultat: null } });

  let stanja = $state(novo());
  let ekran = $state(0); // 0..n-1 podzadaci, n = sažetak
  // ekran prije podzadataka (cijeli zadatak) i poslije njih (sličan cijeli zadatak), samo uz lekcija.cijeli
  let uvod = $state(!!lekcija.cijeli);
  let zavrsni = $state(false);
  let cijeli = $state(novoCijeli());
  let zadatakOtvoren = $state(true);
  let root;

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

  // parts known at once in a row, ending with this one ("2 zaredom iz prve")
  let zaredom = $derived.by(() => {
    let k = 0;
    for (let i = ekran; i >= 0 && stanja[i]?.rezultat === ODMAH; i--) k++;
    return k;
  });

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

  function cijeliOdgovor(odgovor) {
    const r = provjeri(lekcija.cijeli.pitanje, odgovor);
    cijeli.ishod = r;
    if (r.prazno) return;
    if (r.tocno) cijeli.rezultat = cijeli.pokusaji ? UZ_POMOC : ODMAH;
    else cijeli.pokusaji++;
  }

  // riješen sam: podzadaci se preskaču, ravno na sažetak
  function cijeliGotov() {
    uvod = false;
    ekran = n;
    onzavrsi(sazetak());
    naVrh();
  }

  function naVrh() {
    if (navrh) navrh();
    else root?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function vodiMe() {
    uvod = false;
    zadatakOtvoren = true;
    naVrh();
  }

  function zavrsniOdgovor(odgovor) {
    const z = cijeli.zavrsni;
    const r = provjeri(lekcija.cijeli.blizanac, odgovor);
    z.ishod = r;
    if (r.prazno) return;
    if (r.tocno) z.rezultat = z.pokusaji ? UZ_POMOC : ODMAH;
    else if (++z.pokusaji >= MAX_PONOVNO) zavrsniPokazi();
  }

  function zavrsniPokazi() {
    cijeli.zavrsni.pokazi = true;
    cijeli.zavrsni.rezultat = POKAZANO;
  }

  function zavrsniDalje() {
    zavrsni = false;
    onzavrsi(sazetak());
    naVrh();
  }

  function dalje() {
    ekran++;
    // zadatak ostaje kako ga je učenik ostavio: zatvara se samo na njegov klik
    if (ekran === n && lekcija.cijeli?.blizanac) {
      zavrsni = true;
      zadatakOtvoren = false;
    } else if (ekran === n) onzavrsi(sazetak());
    // u aplikaciji se ne pomiče prozor nego glavni stupac, pa se na vrh dovodi sama lekcija
    naVrh();
  }

  function ispocetka() {
    stanja = novo();
    cijeli = novoCijeli();
    uvod = !!lekcija.cijeli;
    zavrsni = false;
    ekran = 0;
    zadatakOtvoren = true;
  }

  // Prijedlog ocjene za ponavljanje (SM-2, q 0–5). Pamćenje pokazuje samo prvi odgovor (pomoć i blizanac su
  // učenje), pa se broje dijelovi riješeni odmah: svi → 5; jedan promašaj u lekciji od 4+ dijela → 4;
  // barem pola → 3, zadnja ocjena koja prolazi; manje → 2 (vraća se sutra). Pokazan odgovor: najviše 2, ispod
  // pola 1.
  function ocjenaIz(r) {
    const odmah = r.filter((x) => x === ODMAH).length;
    const promaseno = r.length - odmah;
    const pola = odmah * 2 >= r.length;
    if (promaseno === 0) return 5;
    if (r.includes(POKAZANO)) return pola ? 2 : 1;
    if (promaseno === 1 && r.length >= 4) return 4;
    return pola ? 3 : 2;
  }

  function sazetak() {
    const r = stanja.map((s) => s.rezultat);
    if (lekcija.cijeli) return sazetakCijelog(r);
    const q = ocjenaIz(r);
    // Najviše što učenik smije podići: ocjena da je još jedan dio riješio odmah (tipfeler "80" umjesto "800"),
    // ali ne pala lekcija u savršenu. Spuštati smije uvijek.
    const najvise = Math.max(q, ...r.map((x, i) => (x === ODMAH ? q : ocjenaIz(r.map((y, j) => (j === i ? ODMAH : y))))));
    return { rezultati: r, q, najvise, odmah: r.filter((x) => x === ODMAH).length, dijelova: r.length };
  }

  // Lekcija s `cijeli`: na maturi se traži cijeli zadatak, pa ocjena ovisi o njemu. Sam iz prve → 5, sam iz više
  // pokušaja → 4. Uz korake nije „znao“ zadatak ni kad je svaki korak riješio odmah: najviše 4 ako je na kraju sam
  // riješio sličan zadatak iz prve, inače 3 (a manje ako su i koraci išli teško).
  // Podizanje do `najvise` vrijedi kao i inače za jedan tipfeler: krivo upisan cijeli zadatak (ako ga je pokušao,
  // a ne odmah tražio korake) bio bi 5, krivo upisan sličan zadatak granica 4, krivo upisan korak ocjena korak više.
  function sazetakCijelog(r) {
    const sam = cijeli.rezultat;
    const slican = cijeli.zavrsni.rezultat;
    if (sam) return { nacin: "cijeli", q: sam === ODMAH ? 5 : 4, najvise: 5, rezultati: [sam], odmah: sam === ODMAH ? 1 : 0, dijelova: 1 };
    const granica = slican === ODMAH ? 4 : 3;
    const q = Math.min(ocjenaIz(r), granica);
    const najvise = Math.max(
      q,
      cijeli.pokusaji ? 5 : 0,
      slican === ODMAH ? 0 : Math.min(ocjenaIz(r), 4),
      ...r.map((x, i) => (x === ODMAH ? 0 : Math.min(ocjenaIz(r.map((y, j) => (j === i ? ODMAH : y))), granica))),
    );
    return { nacin: "koraci", slican, q, najvise, rezultati: r, odmah: r.filter((x) => x === ODMAH).length, dijelova: r.length };
  }

  // novi dio (pomoć, ponovni pokušaj, rezultat) pomakne se u vidno polje
  function uvid(node) {
    requestAnimationFrame(() => node.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  const korakGotov = (k) => uloga(p.pomoc[k]) !== ODGOVOR || st.pomoc[k].gotov;
</script>

{#snippet kvacica()}
  <svg class="lx-done-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M5.25 8.25l1.9 1.9 3.6-4" /></svg>
{/snippet}

<div class="lx lx-runner" bind:this={root}>
  <!-- put kroz lekciju: ista slova kao u naslovima podzadataka, pa kvačica za kraj -->
  <ol class="lx-path" aria-label={`Dio ${Math.min(ekran + 1, n + 1)} od ${n + 1}`}>
    {#if lekcija.cijeli}
      <li class="lx-path-step" class:done={!!cijeli.rezultat} class:now={uvod} aria-current={uvod ? "step" : undefined}>
        <span class="lx-path-dot" title="Cijeli zadatak sam">{#if cijeli.rezultat}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>{:else}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5Z" /></svg>{/if}<span class="sr-only">cijeli zadatak</span></span>
      </li>
    {/if}
    {#each lekcija.podzadaci as x, i (x.id)}
      <li class="lx-path-step" class:done={stanja[i].faza === "gotovo"} class:preskoceno={!!cijeli.rezultat} class:now={i === ekran && !uvod && !zavrsni} aria-current={i === ekran ? "step" : undefined}>
        <span class="lx-path-dot">{#if stanja[i].faza === "gotovo"}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg><span class="sr-only">{x.id}) gotovo</span>{:else}{x.id}{/if}</span>
      </li>
    {/each}
    {#if lekcija.cijeli?.blizanac && !cijeli.rezultat}
      <li class="lx-path-step" class:done={!!cijeli.zavrsni.rezultat} class:now={zavrsni} aria-current={zavrsni ? "step" : undefined}>
        <span class="lx-path-dot" title="Sličan zadatak sam">{#if cijeli.zavrsni.rezultat}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>{:else}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5Z" /></svg>{/if}<span class="sr-only">sličan zadatak</span></span>
      </li>
    {/if}
    <li class="lx-path-step end" class:now={ekran === n && !zavrsni} aria-current={ekran === n && !zavrsni ? "step" : undefined}>
      <span class="lx-path-dot"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11M4 3h7.5l-1.8 2.75L11.5 8.5H4" /></svg><span class="sr-only">kraj</span></span>
    </li>
  </ol>

  <section class="lx-task" class:zatvoren={!zadatakOtvoren}>
    <button class="lx-task-head" onclick={() => (zadatakOtvoren = !zadatakOtvoren)} aria-expanded={zadatakOtvoren}>
      <span class="lx-task-title">Zadatak</span>
      <span class="lx-task-toggle">{zadatakOtvoren ? "Sakrij" : "Prikaži"}</span>
    </button>
    {#if zadatakOtvoren}
      <div class="lx-task-body">
        <Md text={lekcija.zadatak.tekst} />
        {#if lekcija.zadatak.skica}<div class="lx-figure"><Sketch sketch={lekcija.zadatak.skica} text={zadatakTekst} /></div>{/if}
        {#if lekcija.zadatak.graf}<GrafFunkcije spec={lekcija.zadatak.graf} bezTeksta />{/if}
      </div>
    {/if}
  </section>

  {#if uvod}
    <div class="lx-sub">
      <h2 class="lx-sub-title">Riješi sam</h2>
      <Korak spec={lekcija.cijeli.pitanje} oznaka="Tvoj red: cijeli zadatak" locked={!!cijeli.rezultat} ishod={cijeli.ishod} onodgovor={cijeliOdgovor}>
        {#if !cijeli.rezultat}
          <div class="lx-actions">
            {#if cijeli.pokusaji}
              <button class="btn btn-primary" onclick={vodiMe}>Vodi me korak po korak</button>
            {:else}
              <button class="btn btn-quiet" onclick={vodiMe}>Ne znam, vodi me korak po korak</button>
            {/if}
          </div>
        {/if}
      </Korak>
      {#if cijeli.pokusaji && !cijeli.rezultat}
        <p class="lx-summary-note" use:uvid>Možeš ispraviti i probati ponovno, ili proći zadatak korak po korak.</p>
      {/if}
      {#if cijeli.rezultat}
        <div class="lx-done" use:uvid>
          <div class="lx-done-head ok">{@render kvacica()}Točno! Riješio si cijeli zadatak sam.</div>
          <p class="lx-solution">Upravo tako izgleda zadatak na maturi: bez koraka i bez pomoći.</p>
        </div>
        <div class="lx-next">
          <button class="btn btn-primary btn-lg" onclick={cijeliGotov}>Dalje</button>
        </div>
      {/if}
    </div>
  {:else if zavrsni}
    {@const z = cijeli.zavrsni}
    <div class="lx-sub">
      <h2 class="lx-sub-title">Sad sam, bez koraka</h2>
      <p class="lx-summary-note">Isti postupak, drugi brojevi. Pokušaj ga riješiti od početka do kraja.</p>
      <Korak spec={lekcija.cijeli.blizanac} oznaka="Tvoj red: sličan zadatak" locked={!!z.rezultat} pokazi={z.pokazi} ishod={z.ishod} onodgovor={zavrsniOdgovor}>
        {#if !z.rezultat && z.pokusaji > 0}
          <div class="lx-actions"><button class="btn btn-quiet" onclick={zavrsniPokazi}>Pokaži točan odgovor</button></div>
        {/if}
      </Korak>
      {#if z.rezultat}
        <div class="lx-done" class:solved={z.rezultat === POKAZANO} use:uvid>
          {#if z.rezultat === POKAZANO}
            <div class="lx-done-head">Točan odgovor: <Md text={tocanOdgovor(lekcija.cijeli.blizanac)} inline /></div>
          {:else}
            <div class="lx-done-head ok">{@render kvacica()}{z.rezultat === ODMAH ? "Točno! Ovaj si riješio sam." : "Bravo, sad znaš!"}</div>
          {/if}
          {#if lekcija.cijeli.blizanacRjesenje}
            <details class="lx-more" open={z.rezultat === POKAZANO}>
              <summary>Rješenje</summary>
              <Md text={lekcija.cijeli.blizanacRjesenje} />
            </details>
          {/if}
        </div>
        <div class="lx-next">
          <button class="btn btn-primary btn-lg" onclick={zavrsniDalje}>Završi</button>
        </div>
      {/if}
    </div>
  {:else if ekran < n}
    {#key ekran}
      <div class="lx-sub">
        {#if lekcija.cijeli && ekran === 0}
          <p class="lx-summary-note">Riješit ćemo ga zajedno, u {n} koraka. Na kraju dobivaš sličan zadatak koji rješavaš sam.</p>
        {/if}
        <h2 class="lx-sub-title"><span class="lx-sub-id" aria-hidden="true">{p.id}</span><span class="sr-only">{p.id})</span> {p.naslov}</h2>

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
              <div class="lx-done-head ok">
                {@render kvacica()}Točno!
                {#if zaredom >= 2}<span class="lx-streak">{zaredom} zaredom iz prve</span>{/if}
              </div>
              <Md text={p.zasto} />
            {:else if st.rezultat === UZ_POMOC}
              <div class="lx-done-head ok">{@render kvacica()}Bravo, sad znaš!</div>
              <Md text={p.zasto} />
            {:else}
              <div class="lx-done-head">Točan odgovor: <Md text={tocanOdgovor(cilj)} inline /></div>
              <p class="lx-solution">Ovo ćemo ti uskoro ponoviti, pa ćeš ga ponovno vježbati.</p>
            {/if}
            <details class="lx-more" open={st.rezultat === POKAZANO}>
              <summary>{st.rezultat === POKAZANO ? "Objašnjenje" : "Pokaži cijelo objašnjenje"}</summary>
              <Md text={p.objasnjenje} />
              {#if p.graf}<GrafFunkcije spec={p.graf} bezTeksta />{/if}
            </details>
          </div>
          <div class="lx-next">
            <button class="btn btn-primary btn-lg" onclick={dalje}>{ekran < n - 1 || lekcija.cijeli?.blizanac ? "Dalje" : "Završi"}</button>
          </div>
        {/if}
      </div>
    {/key}
  {:else}
    <div class="lx-summary">
      <h2 class="lx-sub-title">Gotovo!</h2>
      <div class="lx-results">
        {#if lekcija.cijeli}
          <div class="lx-result" data-r={cijeli.rezultat ?? "pokazan_odgovor"}>
            <span>Cijeli zadatak sam</span>
            <span class="lx-result-tag">{cijeli.rezultat === ODMAH ? "riješeno iz prve" : cijeli.rezultat ? "riješeno iz više pokušaja" : "uz korake"}</span>
          </div>
        {/if}
        {#each lekcija.podzadaci as x, i (x.id)}
          {#if !cijeli.rezultat}<div class="lx-result" data-r={stanja[i].rezultat}>
            <span>{x.id}) {x.naslov}</span>
            <span class="lx-result-tag">{{ [ODMAH]: "znao odmah", [UZ_POMOC]: "naučeno uz pomoć", [POKAZANO]: "treba vježbe" }[stanja[i].rezultat]}</span>
          </div>{/if}
        {/each}
        {#if lekcija.cijeli?.blizanac && !cijeli.rezultat}
          <div class="lx-result" data-r={cijeli.zavrsni.rezultat}>
            <span>Sličan zadatak sam</span>
            <span class="lx-result-tag">{{ [ODMAH]: "riješeno iz prve", [UZ_POMOC]: "riješeno iz više pokušaja", [POKAZANO]: "treba vježbe" }[cijeli.zavrsni.rezultat]}</span>
          </div>
        {/if}
      </div>
      <p class="lx-summary-note">
        {#if cijeli.rezultat === ODMAH}Riješio si ga sam iz prve. Ovo ćemo ti ponoviti tek za dulje vrijeme.{:else if lekcija.cijeli && cijeli.zavrsni.rezultat === ODMAH}Uz korake si shvatio postupak i sličan zadatak riješio sam. Vratit ćemo ti ga uskoro da provjerimo je li ostalo.{:else if lekcija.cijeli}Ovaj tip zadatka vratit ćemo ti uskoro, pa ćeš ga ponovno vježbati.{:else if stanja.every((s) => s.rezultat === ODMAH)}Sve si znao odmah. Ovo ćemo ti ponoviti tek za dulje vrijeme.{:else}Ono što si naučio uz pomoć vratit će se ranije u ponavljanju.{/if}
      </p>
      <!-- cijelo rješenje na jednom mjestu, kao u tekstualnom zadatku: i za učenika koji je sve znao odmah -->
      <details class="lx-more lx-rjesenje" open>
        <summary>Cijelo rješenje</summary>
        {#if lekcija.cijeli && rjesenje}
          <!-- autorovo objašnjenje u komadu, kao u tekstualnom zadatku -->
          {@render rjesenje()}
        {:else}
          {#each lekcija.podzadaci as x (x.id)}
            <h3 class="lx-rjesenje-dio">{x.id}) {x.naslov}</h3>
            <Md text={x.objasnjenje} />
            {#if x.graf}<GrafFunkcije spec={x.graf} bezTeksta />{/if}
          {/each}
        {/if}
      </details>
      <section class="lx-zapamti-box">
        <div class="lx-zapamti-title">Zapamti</div>
        <ul class="lx-zapamti">
          {#each lekcija.zapamti as t, i (i)}<li><Md text={t} inline /></li>{/each}
        </ul>
      </section>
      {#if lekcija.vjezba}<Vjezba vjezba={lekcija.vjezba} />{/if}
      <div class="lx-actions"><button class="btn btn-quiet" onclick={ispocetka}>Riješi lekciju ispočetka</button></div>
    </div>
  {/if}
</div>

<style>
  .lx-runner {
    display: grid;
    gap: 18px;
    max-width: 720px;
    margin: 0 auto;
  }
  /* stavka grida inače ne ide uža od sadržaja, pa bi široka formula (.katex-display ima vlastiti scroll) raširila
     cijelu lekciju izvan kartice na uskom ekranu */
  .lx-runner > :global(*),
  .lx-sub > :global(*),
  .lx-help > :global(*) {
    min-width: 0;
  }

  /* put kroz lekciju */
  .lx-path {
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .lx-path-step {
    display: flex;
    align-items: center;
    flex: 1;
  }
  .lx-path-step.end {
    flex: 0;
  }
  /* crta do sljedećeg koraka */
  .lx-path-step:not(.end)::after {
    content: "";
    flex: 1;
    height: 2px;
    margin: 0 6px;
    border-radius: 2px;
    background: var(--border);
    transition: background 0.3s;
  }
  .lx-path-step.done::after {
    background: color-mix(in srgb, var(--success) 55%, var(--border));
  }
  .lx-path-dot {
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 1.5px solid var(--border-strong);
    color: var(--text-faint);
    font-size: 13px;
    font-weight: 600;
    transition:
      background 0.3s,
      border-color 0.3s,
      color 0.3s;
  }
  .lx-path-dot svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .now .lx-path-dot {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--on-primary);
  }
  .preskoceno .lx-path-dot {
    border-style: dashed;
    opacity: 0.5;
  }
  .done .lx-path-dot {
    border-color: transparent;
    background: color-mix(in srgb, var(--success) 18%, transparent);
    color: var(--success);
  }

  /* zadatak: tekst kao u tekstualnom zadatku, bez okvira; ispod isprekidana crta kao kod „Rješenja“ */
  .lx-task {
    padding-bottom: 18px;
    border-bottom: 1px dashed var(--border);
  }
  .lx-task.zatvoren {
    padding-bottom: 10px;
  }
  .lx-task-head {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0;
    margin-bottom: 8px;
  }
  .zatvoren .lx-task-head {
    margin-bottom: 0;
  }
  .lx-task-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-dim);
  }
  .lx-task-toggle {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .lx-task-head:hover .lx-task-toggle {
    color: var(--text);
  }
  .lx-task-body {
    font-size: 17px;
    line-height: 1.6;
  }
  .lx-task-body :global(.lx-md p) {
    line-height: 1.6;
  }

  .lx-sub {
    display: grid;
    gap: 14px;
  }
  .lx-sub-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 2px 0 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .lx-sub-id {
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: var(--primary-dim);
    color: var(--primary);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0;
  }

  /* pomoć: koraci jedan ispod drugog, uz crtu koja ih veže */
  .lx-help {
    display: grid;
    gap: 10px;
    margin-left: 12px;
    padding-left: 18px;
    border-left: 2px solid var(--border);
  }
  .lx-help-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-dim);
  }

  .lx-done {
    padding: 14px 18px;
    border-radius: var(--r-lg);
    border-left: 3px solid var(--success);
    background: color-mix(in srgb, var(--success) 8%, var(--bg-elev));
  }
  .lx-done.solved {
    border-left-color: var(--border-strong);
    background: var(--bg-elev-2);
  }
  .lx-done-head {
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--success);
  }
  .solved .lx-done-head {
    color: var(--text);
  }
  .lx-done-head.ok {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
  }
  /* a short pop when the check appears; the reduced-motion rule in lesson.css turns it off */
  .lx-done-ico {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: lx-pop 0.35s ease-out;
  }
  @keyframes lx-pop {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.25);
    }
    100% {
      transform: scale(1);
    }
  }
  .lx-streak {
    padding: 2px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--success) 14%, transparent);
    color: var(--success);
    font-size: 12.5px;
    font-weight: 600;
  }
  .lx-more {
    margin-top: 10px;
  }
  .lx-more summary {
    cursor: pointer;
    font-size: 13px;
    color: var(--text-dim);
  }
  .lx-more summary:hover {
    color: var(--text);
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
    gap: 14px;
  }
  .lx-summary-note {
    margin: -4px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }
  .lx-rjesenje {
    margin-bottom: 14px;
  }
  .lx-rjesenje-dio {
    margin: 14px 0 6px;
    font-size: 15px;
    font-weight: 600;
  }
  .lx-zapamti-box {
    padding: var(--pad-4);
    border-radius: var(--r-xl);
    background: var(--bg-elev-2);
  }
  .lx-zapamti-title {
    font-weight: 600;
    margin-bottom: 8px;
  }
  .lx-zapamti {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
  }
  .lx-results {
    display: grid;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    overflow: hidden;
  }
  .lx-result {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 11px 14px;
  }
  .lx-result + .lx-result {
    border-top: 1px solid var(--border);
  }
  .lx-result-tag {
    font-size: 12.5px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .lx-result[data-r="odmah"] .lx-result-tag {
    color: var(--success);
  }
  .lx-result[data-r="pokazan_odgovor"] .lx-result-tag {
    color: var(--warn);
  }
  @media (max-width: 767px) {
    .lx-help {
      margin-left: 4px;
      padding-left: 12px;
    }
    .lx-task-body {
      font-size: 16px;
    }
  }
</style>
