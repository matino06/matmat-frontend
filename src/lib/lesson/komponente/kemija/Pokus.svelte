<script>
  // pokus: SVG epruvete u koje se doda reagens (kapalica, cjevčica za plin, komadić metala, kupelj, plamen), pa se
  // vidi opažanje: kapi padnu, boja prijeđe, talog se slegne, mjehurići se dižu, otopina se zamuti, na metalu se
  // izluči prevlaka, na stijenci srebrno zrcalo, plamen se oboji. Sva kemija (opažanje, jednadžba, ponuđena opažanja,
  // poruke) je u katalog/kemija/pokus.js i _reakcije.js; ovdje je samo prikaz.
  // U „Tvoj red“ opažanje se ne crta dok ga učenik ne pogodi (ili ne otvori točan odgovor), osim u „prepoznaj“, gdje je
  // opažanje zadano, a skriva se tvar. Animacije su CSS; uz prefers-reduced-motion vidi se odmah završno stanje.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { tocanOdgovor } from "../../katalog/index.js";
  import { tvar, rezultat, opis, opcijeOpazanja, redOpcija, usporedba, dobriReagensi, prikazJednadzbe } from "$lib/lesson/katalog/kemija/pokus.js";
  import { BOJE, dijelovi } from "$lib/lesson/katalog/kemija/_reakcije.js";
  import { seededShuffle } from "$lib/lesson/core/shuffle.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const uid = Math.random().toString(36).slice(2, 8);
  const SLOVA = ["A", "B", "C", "D"];
  let aktivno = $derived(!locked && !pokazi);

  // ── istraživanje: svaka epruveta ima svoj reagens; dodavanje istog ponovno pokreće animaciju ──
  let celije = $state(untrack(() => (istrazi ? spec.tvari.map((t) => ({ t, r: null, run: 0 })) : [])));
  let odabrani = $state(untrack(() => (istrazi ? spec.reagensi[0] : null)));
  function dodaj(i) {
    celije[i] = { ...celije[i], r: odabrani, run: celije[i].run + 1 };
  }
  function dodajSve() {
    celije = celije.map((c) => ({ ...c, r: odabrani, run: c.run + 1 }));
  }
  function odaberi(k) {
    odabrani = k;
    if (celije.length === 1) dodaj(0);
  }
  function isprazni() {
    celije = celije.map((c) => ({ ...c, r: null }));
  }

  // ── „Tvoj red“ ──
  let odabrano = $state(null);
  let brojac = $state(0);
  function izaberi(k) {
    if (!aktivno) return;
    odabrano = k;
    brojac++;
    onodgovor(k);
  }
  let otkriveno = $derived(!!ishod?.tocno || pokazi);

  const opcije = untrack(() => (nacin === "opazanje" ? redOpcija(spec, opcijeOpazanja(spec)) : []));
  const dobri = untrack(() => (nacin === "dokazi" ? dobriReagensi(spec) : []));
  const ponudeniReagensi = untrack(() => (nacin === "dokazi" ? seededShuffle([...spec.reagensi], JSON.stringify(spec.reagensi)) : []));
  const ponudeneTvari = untrack(() => (nacin === "prepoznaj" ? seededShuffle([...spec.tvari], JSON.stringify(spec.tvari)) : []));

  // reagens koji se vidi u epruvetama kod „dokazi“: zadnji izbor nakon provjere, ili točan uz „Pokaži odgovor“
  let reagensDokaza = $derived(pokazi && !ishod?.tocno ? dobri[0] : ishod && odabrano ? odabrano : null);

  // epruvete za crtanje u svakom načinu
  let prikaz = $derived.by(() => {
    if (istrazi) return celije.map((c, i) => ({ ...c, oznaka: spec.oznake?.[i] ?? null, i }));
    if (nacin === "opazanje") return [{ t: spec.tvar, r: otkriveno ? spec.reagens : null, ceka: spec.reagens, run: 1, i: 0 }];
    if (nacin === "dokazi")
      return spec.tvari.map((t, i) => ({ t, r: reagensDokaza, ceka: null, run: brojac + (pokazi ? 100 : 0), i, oznaka: spec.oznake?.[i] ?? SLOVA[i], skrij: !reagensDokaza }));
    return [{ t: spec.tvar, r: spec.reagens, run: 1, i: 0, skrij: !otkriveno }];
  });

  // ── crtež jedne epruvete ──
  const tekuce = (t) => !!t && (t.oblik === "otopina" || t.oblik === "tekucina");
  const boja = (b) => (b && b !== "bezbojna" && BOJE[b]?.hex ? BOJE[b].hex : "var(--pk-voda)");
  const prozirnost = (b) => (b && b !== "bezbojna" ? 0.78 : 1);
  const METAL = { Mg: "#b9bdc3", Zn: "#a2a8af", Fe: "#7c8187", Ni: "#9aa0a6", Ag: "#d3d7db", Cu: "#b87333" };
  const komadOd = (t) => (t?.oblik !== "cvrsto" ? null : METAL[t.kljuc] ? { vrsta: "metal", boja: METAL[t.kljuc] } : { vrsta: "zrnca", boja: "#efede6" });
  // ponovljivi „slučajni“ brojevi za položaje mjehurića i čestica
  const slucajno = (seed) => {
    let x = seed * 9301 + 49297;
    return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  };

  function crtez(c) {
    const T = tvar(c.t);
    const R = c.r ? tvar(c.r) : null;
    const W = !R && c.ceka ? tvar(c.ceka) : null; // reagens koji čeka (prije provjere)
    const o = R ? rezultat(c.t, c.r) : null;
    const plamen = (R ?? W)?.kljuc === "plamen";
    const tl = tekuce(T);
    const rl = tekuce(R);
    const razina = tl ? (rl ? 108 : 122) : rl ? 126 : null;
    const pocetna = tl ? 122 : 200;
    const kupelj = R?.kljuc === "zagrijavanje" || o?.zagrijavanje ? "toplo" : R?.kljuc === "hlađenje" ? "hladno" : null;
    const kapalica = R && rl ? R : W && tekuce(W) ? W : null;
    const plinR = R?.oblik === "plin" || (!R && W?.oblik === "plin");
    const komadT = komadOd(T);
    const komadR = komadOd(R) ?? (W ? null : null);
    const komadCeka = W?.oblik === "cvrsto" ? komadOd(W) : null;
    const komad = komadT ?? komadR;
    // vrijeme: kapi 0–0,7 s; kupelj; zatim opažanje
    const D = !R ? 0 : R.oblik === "postupak" ? 0.6 : plinR ? 1.2 : R.oblik === "cvrsto" ? 0.8 : 0.9 + (o?.zagrijavanje ? 0.8 : 0);
    const bojaT = tl ? T.boja : null;
    const prije = o ? o.boja.prije : bojaT;
    const poslije = o ? o.boja.poslije : bojaT;
    const rnd = slucajno((c.i + 1) * 31 + (c.run ?? 0));
    const dno = komad ? 168 : 182;
    const brojMjehurica = o?.plin ? [0, 3, 5, 8, 12][o.plin.jakost] ?? 6 : 0;
    const mjehurici = Array.from({ length: brojMjehurica }, () => ({ x: 37 + rnd() * 16, r: 1.3 + rnd() * 1.6, d: D + rnd() * 1.6, t: 1.1 + rnd() * 0.9, s: 0.1 + rnd() * 0.8 }));
    const uvodi = plinR && R ? Array.from({ length: 6 }, (_, k) => ({ x: 44 + rnd() * 3, r: 1.4 + rnd() * 1.2, d: 0.2 + k * 0.35, t: 1.2, s: k / 6 })) : [];
    const cestice = o?.talog ? Array.from({ length: 9 }, () => ({ x: 35 + rnd() * 20, y: (razina ?? 120) + 6 + rnd() * 40, d: D + rnd() * 0.5 })) : [];
    return { T, R, W, o, plamen, razina, pocetna, kupelj, kapalica, plinR, komad, komadPada: !!komadR && !komadT, komadCeka, D, prije, poslije, bojaT, mjehurici, uvodi, cestice, dno };
  }

  // kratki naziv za oznaku reagensa ispod epruvete
  const kratkiNaziv = (t) => (t.formula && t.oblik !== "postupak" ? null : (t.kratko ?? t.naziv));

  // izvještaj u istraživanju: epruvete u koje je dodan reagens
  let izvjestaj = $derived(istrazi ? celije.map((c, i) => ({ ...c, i })).filter((c) => c.r) : []);
  const naslovEpruvete = (i) => spec.oznake?.[i] ?? String(i + 1);
</script>

{#snippet tekst(t)}{#each dijelovi(t) as d, k (k)}{#if d.formula}<Formula f={d.z} />{:else}{d.z}{/if}{/each}{/snippet}

{#snippet ime(t)}{#if t.formula && !t.skrijFormulu && t.oblik !== "postupak"}<span class="pk-f"><Formula f={t.formula} /></span>{" "}{/if}<span class="pk-n">{t.naziv}</span>{/snippet}

{#snippet jednadzba(j)}
  {@const p = prikazJednadzbe(j)}
  {#if p}
    {@const L = p.clanovi.filter((c) => c.strana === "L")}
    {@const Dd = p.clanovi.filter((c) => c.strana === "D")}
    <div class="pk-eq" aria-label="Jednadžba reakcije">
      {#each L as c, k (k)}
        <span class="pk-par">{#if k}<span class="pk-plus">+</span>{/if}{#if c.k > 1}<span class="pk-k">{c.k}</span>{/if}<Formula f={c.f} />{#if c.st}<span class="pk-st">({c.st})</span>{/if}</span>
      {/each}
      <span class="pk-par">
        <span class="pk-str">{#if p.iznad}<span class="pk-iznad">{p.iznad}</span>{/if}<span>{p.strelica}</span></span>
        {#if Dd[0]}{#if Dd[0].k > 1}<span class="pk-k">{Dd[0].k}</span>{/if}<Formula f={Dd[0].f} />{#if Dd[0].st}<span class="pk-st">({Dd[0].st})</span>{/if}{/if}
      </span>
      {#each Dd.slice(1) as c, k (k)}
        <span class="pk-par"><span class="pk-plus">+</span>{#if c.k > 1}<span class="pk-k">{c.k}</span>{/if}<Formula f={c.f} />{#if c.st}<span class="pk-st">({c.st})</span>{/if}</span>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet epruveta(c)}
  {@const z = crtez(c)}
  {@const lv = z.razina ?? 200}
  <svg viewBox="0 0 90 200" class="pk-svg" aria-hidden="true">
    <defs>
      <clipPath id="pk-{uid}-{c.i}"><path d="M32.5,58 V172 a12.5,12.5 0 0 0 25,0 V58 Z" /></clipPath>
      <linearGradient id="pk-sr-{uid}" x1="0" x2="1"><stop offset="0" stop-color="#e9ecef" /><stop offset="0.5" stop-color="#9aa1a8" /><stop offset="1" stop-color="#dfe3e7" /></linearGradient>
    </defs>
    {#if z.plamen}
      <!-- plamenik i plamen; uzorak na žici -->
      {#key c.run}
        <g class="pk-plamen" class:gori={!!z.o}>
          <path class="pk-plamen-osnova" d="M45,62 C31,92 31,134 45,160 C59,134 59,92 45,62 Z" />
          {#if z.o}
            <path class="pk-anim pk-in pk-titraj" style="--d:0.4s;--t:0.8s" d="M45,56 C28,90 29,136 45,160 C61,136 62,90 45,56 Z" fill={BOJE[z.o.plamen].hex} fill-opacity="0.82" />
          {/if}
          <path class="pk-plamen-jezgra" d="M45,118 C39,130 39,148 45,160 C51,148 51,130 45,118 Z" />
        </g>
      {/key}
      <rect class="pk-metal-sivo" x="38" y="160" width="14" height="30" rx="2" />
      <rect class="pk-metal-sivo" x="27" y="188" width="36" height="7" rx="2" />
      <line class="pk-zica" x1="88" y1="112" x2="50" y2="124" />
      <circle cx="49" cy="124.5" r="3.2" fill={boja(z.bojaT === "bezbojna" ? "bijela" : z.bojaT)} class="pk-uzorak" />
    {:else}
      <!-- kupelj iza epruvete -->
      {#if z.kupelj}
        {#key c.run}
          <g class="pk-anim pk-in" style="--d:{z.R?.oblik === 'postupak' ? 0 : 0.7}s;--t:0.4s">
            <path class="pk-casa" d="M10,116 V192 a4,4 0 0 0 4,4 H76 a4,4 0 0 0 4,-4 V116" />
            <rect class="pk-kupelj" x="11" y="136" width="68" height="59" rx="3" />
            {#if z.kupelj === "toplo"}
              {#each [24, 45, 66] as x, k (x)}
                <path class="pk-para pk-anim" style="--d:{0.9 + k * 0.4}s" d="M{x},128 c-3,-4 3,-6 0,-10 c-3,-4 3,-6 0,-10" />
              {/each}
            {:else}
              {#each [[16, 132], [62, 134], [20, 150]] as [x, y], k (k)}
                <rect class="pk-led" x={x} y={y} width="11" height="10" rx="2" transform="rotate({k * 17 - 10} {x + 5} {y + 5})" />
              {/each}
            {/if}
          </g>
        {/key}
      {/if}
      <!-- staklo -->
      <path class="pk-staklo-pozadina" d="M32,58 V172 a13,13 0 0 0 26,0 V58 Z" />
      <g clip-path="url(#pk-{uid}-{c.i})">
        {#key c.run}
          {#if z.razina != null}
            <!-- tekućina: razina se podigne kad se doda reagens; boje se pretope -->
            <g class="pk-anim pk-razina" style="--dy:{z.R && z.pocetna !== lv ? Math.min(z.pocetna, 200) - lv : 0}px;--d:0.35s;--t:0.5s">
              {#if z.bojaT && z.bojaT !== z.prije}
                <rect class="pk-anim pk-out" style="--d:0.4s;--t:0.5s" x="30" y={lv} width="30" height={200 - lv} fill={boja(z.bojaT)} fill-opacity={prozirnost(z.bojaT)} />
              {/if}
              {#if z.prije !== z.poslije}
                <rect class="pk-anim {z.bojaT && z.bojaT !== z.prije ? 'pk-in-out' : 'pk-out'}" style="--d:{z.bojaT && z.bojaT !== z.prije ? 0.4 : z.D}s;--d2:{z.D}s;--t:{z.o?.blijedi ? 2.4 : 1.1}s" x="30" y={lv} width="30" height={200 - lv} fill={boja(z.prije)} fill-opacity={prozirnost(z.prije)} />
                <rect class="pk-anim pk-in" style="--d:{z.D}s;--t:{z.o?.blijedi ? 2.4 : 1.1}s" x="30" y={lv} width="30" height={200 - lv} fill={boja(z.poslije)} fill-opacity={prozirnost(z.poslije)} />
              {:else}
                <rect class="pk-anim {z.bojaT && z.bojaT !== z.prije ? 'pk-in' : ''}" style="--d:0.4s;--t:0.5s" x="30" y={lv} width="30" height={200 - lv} fill={boja(z.poslije)} fill-opacity={prozirnost(z.poslije)} />
              {/if}
              <line class="pk-povrsina" x1="30" x2="60" y1={lv} y2={lv} />
            </g>
          {/if}
          <!-- komad metala ili zrnca karbonata na dnu -->
          {#if z.komad}
            <g class:pk-anim={z.komadPada} class:pk-padni={z.komadPada} style="--dy:-150px;--d:0s;--t:0.6s">
              {#if z.komad.vrsta === "metal"}
                <rect x="37" y="171" width="16" height="11" rx="3" fill={z.komad.boja} class="pk-komad" />
              {:else}
                <g class="pk-anim" class:pk-otapa={z.o?.otapanje} style="--d:{z.D}s;--t:3s">
                  <path d="M35,183 l4,-7 l6,1 l2,6 Z M46,184 l3,-8 l7,2 l-1,6 Z M40,177 l3,-5 l5,2 l-2,4 Z" fill={z.komad.boja} class="pk-komad" />
                </g>
              {/if}
            </g>
          {/if}
          {#if z.o}
            <!-- talog: oblak, čestice padaju, sloj na dnu raste -->
            {#if z.o.talog}
              {@const tb = BOJE[z.o.talog.boja].hex}
              <rect class="pk-anim pk-oblak" style="--d:{z.D}s;--t:1.6s" x="30" y={lv} width="30" height={200 - lv} fill={tb} />
              {#each z.cestice as p, k (k)}
                <circle class="pk-anim pk-slegni" style="--d:{p.d}s;--t:1.2s;--dy:{z.dno + 2 - p.y}px" cx={p.x} cy={p.y} r="1.6" fill={tb} />
              {/each}
              <ellipse class="pk-anim pk-rast pk-talog" style="--d:{z.D + 0.5}s;--t:1.1s" cx="45" cy={z.komad ? 183 : 181} rx="16" ry={z.komad ? 7 : 16} fill={tb} />
            {/if}
            {#if z.o.zamucenje}
              <rect class="pk-anim pk-in pk-mutno" style="--d:{z.D}s;--t:1.6s" x="30" y={lv} width="30" height={200 - lv} fill={BOJE[z.o.zamucenje.boja].hex} />
            {/if}
            {#if z.o.prevlaka && z.komad}
              {@const pb = BOJE[z.o.prevlaka.boja].hex}
              <g class="pk-anim pk-in" style="--d:{z.D}s;--t:2.2s">
                <rect x="36" y="170" width="18" height="12" rx="3.5" fill={pb} fill-opacity="0.92" />
                {#if z.o.prevlaka.oblik === "kristalici"}
                  <path d="M39,170 l-2,-6 M39,166 l-3,-1 M44,170 l1,-8 M45,164 l3,-2 M50,170 l2,-6 M52,166 l3,0" stroke={pb} stroke-width="1.4" stroke-linecap="round" fill="none" />
                {/if}
              </g>
            {/if}
            {#if z.o.zrcalo}
              <path class="pk-anim pk-in" style="--d:{z.D}s;--t:2s" d="M33.5,{lv} V172 a11.5,11.5 0 0 0 23,0 V{lv}" fill="none" stroke="url(#pk-sr-{uid})" stroke-width="3.5" />
            {/if}
            <!-- mjehurići plina iz reakcije -->
            {#each z.mjehurici as m, k (k)}
              <circle class="pk-anim pk-dizi pk-mjehur" style="--d:{m.d}s;--t:{m.t}s;--dy:{z.dno - lv - 6}px;--sy:{m.s * (z.dno - lv - 6)}px" cx={m.x} cy={z.dno - 2} r={m.r} />
            {/each}
          {/if}
          <!-- plin koji se uvodi kroz cjevčicu -->
          {#each z.uvodi as m, k (k)}
            <circle class="pk-anim pk-dizi pk-mjehur" style="--d:{m.d}s;--t:{m.t}s;--dy:{176 - lv - 6}px;--sy:{m.s * (176 - lv - 6)}px" cx={m.x} cy="174" r={m.r} />
          {/each}
        {/key}
      </g>
      <path class="pk-staklo" d="M32,58 V172 a13,13 0 0 0 26,0 V58" />
      <path class="pk-rub" d="M28,58 H62" />
      <!-- reagens iznad epruvete -->
      {#key c.run}
        {#if z.kapalica}
          {@const kb = z.kapalica.boja}
          <g class="pk-anim" class:pk-out={!!z.R} class:pk-kapalica-ceka={!z.R} style="--d:1s;--t:0.4s">
            <ellipse cx="45" cy="9" rx="6.5" ry="7.5" class="pk-guma" />
            <path d="M42,15 H48 V44 L46,52 H44 L42,44 Z" class="pk-cijev" />
            <path d="M42.8,26 H47.2 V44 L45.6,51 H44.4 L42.8,44 Z" fill={boja(kb)} fill-opacity={prozirnost(kb)} />
          </g>
          {#if z.R}
            {#each [0, 1, 2] as k (k)}
              <circle class="pk-anim pk-kap" style="--d:{k * 0.22}s;--t:0.45s;--dy:{lv - 56}px" cx="45" cy="55" r="2.1" fill={boja(kb)} />
            {/each}
          {/if}
        {/if}
        {#if z.plinR}
          <path class="pk-cjevcica" d="M88,4 C70,4 45,10 45,30 V{z.R ? 174 : 46}" />
        {/if}
        {#if z.komadCeka}
          <rect x="37" y="20" width="16" height="11" rx="3" fill={z.komadCeka.boja} class="pk-komad pk-kapalica-ceka" />
        {/if}
        {#if z.o?.plin?.miris}
          {#each [36, 45, 54] as x, k (x)}
            <path class="pk-anim pk-para" style="--d:{z.D + k * 0.3}s" d="M{x},50 c-3,-4 3,-6 0,-10 c-3,-4 3,-6 0,-10" />
          {/each}
        {/if}
      {/key}
    {/if}
  </svg>
{/snippet}

{#snippet natpis(c)}
  {@const T = tvar(c.t)}
  <span class="pk-nat">
    {#if c.oznaka}<span class="pk-ozn">{c.oznaka}</span>{/if}
    {#if c.skrij}<span class="pk-upit">?</span>{:else}{@render ime(T)}{/if}
  </span>
{/snippet}

{#if istrazi}
  <div class="pk-tekst"><Md text={spec.tekst} /></div>
  <p class="pk-hint">{celije.length > 1 ? "Odaberi reagens, pa dodirni epruvetu (ili dodaj u sve)." : "Odaberi reagens i pogledaj što se dogodi."}</p>
  <div class="pk-reagensi" role="group" aria-label="Reagensi">
    {#each spec.reagensi as k (k)}
      {@const R = tvar(k)}
      <button type="button" class="pk-chip" class:on={odabrani === k} aria-pressed={odabrani === k} onclick={() => odaberi(k)}>{@render ime(R)}</button>
    {/each}
  </div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<div class="pk-red" style="--n:{prikaz.length}">
  {#each prikaz as c (c.i)}
    {#if istrazi}
      <button type="button" class="pk-cel pk-gumb" aria-label="Dodaj {tvar(odabrani).naziv} u epruvetu {naslovEpruvete(c.i)} ({tvar(c.t).naziv})" onclick={() => dodaj(c.i)}>
        {@render natpis(c)}
        {@render epruveta(c)}
        <span class="pk-dodano">{#if c.r}+ {#if kratkiNaziv(tvar(c.r))}{kratkiNaziv(tvar(c.r))}{:else}<Formula f={tvar(c.r).formula} />{/if}{/if}</span>
      </button>
    {:else}
      <div class="pk-cel">
        {@render natpis(c)}
        {@render epruveta(c)}
      </div>
    {/if}
  {/each}
</div>

{#if istrazi}
  {#if celije.length > 1}
    <div class="pk-akcije">
      <button type="button" class="btn btn-quiet" onclick={dodajSve}>Dodaj u sve</button>
      {#if izvjestaj.length}<button type="button" class="btn btn-quiet" onclick={isprazni}>Isprazni</button>{/if}
    </div>
  {/if}
  {#if izvjestaj.length}
    <ul class="pk-izvj" aria-live="polite">
      {#each izvjestaj as c (c.i)}
        {@const o = rezultat(c.t, c.r)}
        <li>
          <div class="pk-izvj-glava"><span class="pk-ozn">{naslovEpruvete(c.i)}</span> {@render ime(tvar(c.t))} <span class="pk-plus">+</span> {@render ime(tvar(c.r))}</div>
          <div class="pk-opazanje">{opis(o)}</div>
          {#if o.savjet}<div class="pk-savjet">{@render tekst(o.savjet)}</div>{/if}
          {#each o.jednadzbe as j, k (k)}{@render jednadzba(j)}{/each}
        </li>
      {/each}
    </ul>
  {/if}
{:else}
  <!-- što se dodaje (opažanje i prepoznavanje) -->
  {#if nacin === "opazanje" || nacin === "prepoznaj"}
    {@const R = tvar(spec.reagens)}
    <p class="pk-dodaje">{R.oblik === "postupak" ? "Postupak:" : "Dodaje se:"} {@render ime(R)}{#if R.opis} <span class="pk-n">({@render tekst(R.opis)})</span>{/if}</p>
  {/if}
  {#if nacin === "prepoznaj"}
    <p class="pk-opazanje pk-zadano">Opažanje: {opis(rezultat(spec.tvar, spec.reagens))}</p>
  {/if}
  {#if nacin === "dokazi"}
    <p class="pk-dodaje">U epruvetama su {#each spec.tvari as k, i (k)}{i ? (i === spec.tvari.length - 1 ? " i " : ", ") : ""}{@render ime(tvar(k))}{/each}, ne zna se gdje je koja.</p>
  {/if}

  <div class="lx-options pk-opcije">
    {#if nacin === "opazanje"}
      {#each opcije as op (op.kljuc)}
        {@const ok = (odabrano === op.kljuc && ishod?.tocno) || (pokazi && op.tocno)}
        {@const bad = odabrano === op.kljuc && ishod && !ishod.tocno}
        <button class="lx-option" class:ok class:bad disabled={!aktivno} onclick={() => izaberi(op.kljuc)}>
          <span class="lx-mark">{ok ? "✓" : bad ? "✕" : ""}</span><span>{op.tekst}</span>
        </button>
      {/each}
    {:else if nacin === "dokazi"}
      {#each ponudeniReagensi as k (k)}
        {@const ok = (odabrano === k && ishod?.tocno) || (pokazi && dobri.includes(k))}
        {@const bad = odabrano === k && ishod && !ishod.tocno}
        <button class="lx-option" class:ok class:bad disabled={!aktivno} onclick={() => izaberi(k)}>
          <span class="lx-mark">{ok ? "✓" : bad ? "✕" : ""}</span><span>{@render ime(tvar(k))}</span>
        </button>
      {/each}
    {:else}
      {#each ponudeneTvari as k (k)}
        {@const ok = (odabrano === k && ishod?.tocno) || (pokazi && tvar(k) === tvar(spec.tvar))}
        {@const bad = odabrano === k && ishod && !ishod.tocno}
        <button class="lx-option" class:ok class:bad disabled={!aktivno} onclick={() => izaberi(k)}>
          <span class="lx-mark">{ok ? "✓" : bad ? "✕" : ""}</span><span>{@render ime(tvar(k))}</span>
        </button>
      {/each}
    {/if}
  </div>

  <!-- nakon provjere: što se vidi i zašto, s jednadžbom -->
  {#if nacin === "dokazi" && reagensDokaza}
    <ul class="pk-izvj" aria-live="polite">
      {#each spec.tvari as k, i (k)}
        {@const o = rezultat(k, reagensDokaza)}
        <li>
          <div class="pk-izvj-glava"><span class="pk-ozn">{spec.oznake?.[i] ?? SLOVA[i]}</span> {@render ime(tvar(k))} <span class="pk-plus">+</span> {@render ime(tvar(reagensDokaza))}</div>
          <div class="pk-opazanje">{opis(o)}</div>
          {#if otkriveno && o.savjet}<div class="pk-savjet">{@render tekst(o.savjet)}</div>{/if}
          {#if otkriveno}{#each o.jednadzbe as j, n (n)}{@render jednadzba(j)}{/each}{/if}
        </li>
      {/each}
    </ul>
  {:else if nacin !== "dokazi" && otkriveno}
    {@const o = rezultat(spec.tvar, spec.reagens)}
    <div class="pk-objasnjenje" aria-live="polite">
      {#if o.savjet}<div class="pk-savjet">{@render tekst(o.savjet)}</div>{/if}
      {#each o.jednadzbe as j, k (k)}{@render jednadzba(j)}{/each}
    </div>
  {/if}
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<style>
  .pk-tekst {
    margin-bottom: 8px;
  }
  .pk-hint {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .pk-reagensi {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .pk-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    min-height: 36px;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.2;
    touch-action: manipulation;
  }
  .pk-chip:hover {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .pk-chip.on {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .pk-f {
    font-weight: 600;
  }
  .pk-n {
    color: var(--text-dim);
    font-size: 0.92em;
  }
  .pk-chip.on .pk-n {
    color: var(--text);
  }

  /* epruvete: na 360 px stanu 4 */
  .pk-red {
    --pk-voda: color-mix(in srgb, var(--lx-water) 16%, transparent);
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 112px));
    justify-content: center;
    gap: 6px;
    margin: 4px 0 8px;
  }
  .pk-cel {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    padding: 6px 2px 4px;
    border-radius: var(--r-lg);
    background: none;
    border: 1px solid transparent;
    color: var(--text);
    font-family: var(--font-sans);
  }
  .pk-gumb {
    cursor: pointer;
    touch-action: manipulation;
  }
  .pk-gumb:hover {
    border-color: var(--border);
    background: var(--bg-hover);
  }
  .pk-svg {
    width: 100%;
    max-width: 96px;
    height: auto;
    display: block;
    overflow: visible;
  }
  .pk-nat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-height: 46px;
    text-align: center;
    font-size: 12px;
    line-height: 1.2;
  }
  .pk-nat .pk-f {
    font-size: 15px;
  }
  .pk-ozn {
    font-weight: 700;
    font-size: 12px;
    color: var(--text-faint);
  }
  .pk-upit {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-faint);
  }
  .pk-dodano {
    min-height: 18px;
    font-size: 12px;
    color: var(--text-dim);
    text-align: center;
  }
  .pk-akcije {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  /* SVG: staklo i pribor u bojama teme */
  .pk-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .pk-staklo-pozadina {
    fill: color-mix(in srgb, var(--bg-elev) 70%, transparent);
  }
  .pk-rub {
    stroke: var(--text-dim);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .pk-povrsina {
    stroke: var(--text-faint);
    stroke-width: 0.8;
    opacity: 0.7;
  }
  .pk-guma {
    fill: var(--text-faint);
  }
  .pk-cijev {
    fill: color-mix(in srgb, var(--bg-elev) 80%, transparent);
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .pk-cjevcica {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .pk-komad,
  .pk-talog,
  .pk-uzorak {
    stroke: var(--border-strong);
    stroke-width: 0.8;
  }
  .pk-mutno {
    opacity: 0.72;
  }
  .pk-mjehur {
    fill: color-mix(in srgb, var(--bg) 40%, transparent);
    stroke: var(--text-dim);
    stroke-width: 0.7;
    opacity: 0.85;
  }
  .pk-casa {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.4;
  }
  .pk-kupelj {
    fill: color-mix(in srgb, var(--lx-water) 22%, transparent);
  }
  .pk-led {
    fill: color-mix(in srgb, #ffffff 75%, var(--lx-water));
    stroke: var(--border-strong);
    stroke-width: 0.8;
  }
  .pk-para {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.3;
    stroke-linecap: round;
  }
  .pk-plamen-osnova {
    fill: color-mix(in srgb, var(--lx-water) 35%, transparent);
  }
  .pk-plamen-jezgra {
    fill: color-mix(in srgb, var(--lx-water) 60%, transparent);
  }
  .pk-metal-sivo {
    fill: var(--text-faint);
  }
  .pk-zica {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }

  /* animacije: završno stanje je stil bez animacije (prefers-reduced-motion), animacija samo dolazi do njega */
  .pk-anim {
    animation-duration: var(--t, 1s);
    animation-delay: var(--d, 0s);
    animation-fill-mode: both;
    animation-timing-function: ease-out;
    transform-box: fill-box;
  }
  .pk-in {
    animation-name: pk-in;
  }
  .pk-out {
    opacity: 0;
    animation-name: pk-out;
  }
  .pk-in-out {
    opacity: 0;
    animation: pk-in 0.5s ease-out var(--d) both, pk-out var(--t) ease-out var(--d2) forwards;
  }
  .pk-razina {
    animation-name: pk-razina;
  }
  .pk-kap {
    opacity: 0;
    animation-name: pk-kap;
    animation-timing-function: ease-in;
  }
  .pk-oblak {
    opacity: 0.16;
    animation-name: pk-oblak;
  }
  .pk-slegni {
    opacity: 0;
    animation-name: pk-slegni;
    animation-timing-function: ease-in;
  }
  .pk-rast {
    transform-origin: 50% 100%;
    animation-name: pk-rast;
  }
  .pk-padni {
    animation-name: pk-padni;
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
  }
  .pk-otapa {
    transform-origin: 50% 100%;
    transform: scale(0.65);
    animation-name: pk-otapa;
  }
  .pk-dizi {
    animation-name: pk-dizi;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in;
    animation-fill-mode: backwards;
  }
  .pk-para.pk-anim {
    opacity: 0.6;
    animation-name: pk-para;
    animation-duration: 1.8s;
    animation-iteration-count: infinite;
  }
  .pk-titraj {
    transform-origin: 50% 100%;
    animation:
      pk-in var(--t) ease-out var(--d) both,
      pk-titraj 0.9s ease-in-out calc(var(--d) + var(--t)) infinite;
  }
  @keyframes pk-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes pk-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  @keyframes pk-razina {
    from {
      transform: translateY(var(--dy));
    }
    to {
      transform: none;
    }
  }
  @keyframes pk-kap {
    0% {
      opacity: 1;
      transform: translateY(0);
    }
    85% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(var(--dy));
    }
  }
  @keyframes pk-oblak {
    0% {
      opacity: 0;
    }
    30% {
      opacity: 0.55;
    }
    /* iznad taloga otopina ostaje malo mutna, pa se i bijeli talog vidi na svijetloj podlozi */
    100% {
      opacity: 0.16;
    }
  }
  @keyframes pk-slegni {
    0% {
      opacity: 0.95;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(var(--dy));
    }
  }
  @keyframes pk-rast {
    from {
      transform: scaleY(0);
    }
    to {
      transform: scaleY(1);
    }
  }
  @keyframes pk-padni {
    from {
      transform: translateY(var(--dy));
    }
    to {
      transform: none;
    }
  }
  @keyframes pk-otapa {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(0.65);
    }
  }
  @keyframes pk-dizi {
    0% {
      opacity: 0;
      transform: translateY(0);
    }
    15% {
      opacity: 0.9;
    }
    100% {
      opacity: 0;
      transform: translateY(calc(-1 * var(--dy)));
    }
  }
  @keyframes pk-para {
    0% {
      opacity: 0;
      transform: translateY(0);
    }
    50% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  @keyframes pk-titraj {
    0%,
    100% {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(1.04);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pk-anim,
    .pk-titraj,
    .pk-in-out {
      animation: none !important;
    }
    /* mjehurići stoje raspoređeni po tekućini */
    .pk-dizi {
      transform: translateY(calc(-1 * var(--sy, 0px)));
    }
  }

  /* izvještaj, opažanje, objašnjenje */
  .pk-izvj {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .pk-izvj li {
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .pk-izvj-glava {
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 3px;
  }
  .pk-izvj-glava .pk-f {
    color: var(--text);
  }
  .pk-plus {
    color: var(--text-faint);
  }
  .pk-opazanje {
    font-weight: 600;
    font-size: 15px;
    line-height: 1.45;
  }
  .pk-zadano {
    margin: 0 0 12px;
    padding: 8px 12px;
    border-left: 3px solid var(--border-strong);
    background: var(--bg-elev);
    border-radius: var(--r-md);
  }
  .pk-savjet {
    margin-top: 4px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-dim);
  }
  .pk-dodaje {
    margin: 0 0 10px;
    font-size: 14px;
    color: var(--text-dim);
    text-align: center;
  }
  .pk-dodaje .pk-f {
    color: var(--text);
  }
  .pk-opcije {
    margin-top: 4px;
  }
  .pk-objasnjenje {
    margin-top: 12px;
  }

  /* jednadžba: „+“ i strelica ostaju uz pojam iza sebe */
  .pk-eq {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    margin-top: 6px;
    font-family: var(--font-sans);
    font-size: 16px;
    color: var(--text);
  }
  .pk-par {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
  .pk-k {
    font-weight: 500;
  }
  .pk-st {
    font-size: 0.78em;
    color: var(--text-dim);
  }
  .pk-str {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
  }
  .pk-iznad {
    font-size: 10.5px;
    color: var(--text-dim);
  }
</style>
