<script>
  // ravnoteza: jednadžba ravnoteže (samo za čitanje, s bojama obojenih vrsta), posuda i stupci koncentracija
  // (RavnotezaPrikaz) te, ovisno o načinu: gumbi za promjene (istraživanje: smjesa se odmah poremeti, Q ≠ K, pa se
  // animirano uspostavi nova ravnoteža), izbor smjera / boje / koncentracije (pomak: crtež pomaka tek nakon provjere),
  // slaganje izraza za K (brojnik / nazivnik / ne ulazi i eksponent) ili lanac računa. Sva kemija i svi brojevi su u
  // katalog/kemija/ravnoteza.js. Uz prefers-reduced-motion nova ravnoteža se pokaže odmah.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import RavnotezaPrikaz from "./RavnotezaPrikaz.svelte";
  import { tocanOdgovor } from "../../katalog/index.js";
  import { BOJE } from "$lib/lesson/katalog/kemija/_reakcije.js";
  import {
    vrste,
    pocetnoStanje,
    simuliraj,
    pomak as pomakOd,
    promjeneIstrazivanja,
    oznakaPromjene,
    opisPromjene,
    mozeT,
    procitajPromjenu,
    dijelovi,
    bojaVrste,
    izraz,
    simbolK,
    slovo,
    jedinicaK,
    jedinicaVelicine,
    brojeviOd,
    brojOd,
    traziOf,
    jedinicaKoraka,
    zapisZadanog,
    zapisBroja,
    tocneVrijednosti,
    pitanjaOd,
    rjesenjePomaka,
    opcijeBoje,
    OPCIJE_KONCENTRACIJE,
    OPCIJE_SMJERA,
  } from "$lib/lesson/katalog/kemija/ravnoteza.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const v = untrack(() => vrste(spec));
  const u = v.filter((x) => x.ulazi);
  const L = v.filter((x) => x.strana === "L");
  const D = v.filter((x) => x.strana === "D");
  const K_ = untrack(() => simbolK(spec));
  const sl = untrack(() => slovo(spec));
  const uid = Math.random().toString(36).slice(2, 8);
  let aktivno = $derived(!locked && !pokazi);
  const smanjiPomak = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const bojaHex = (f) => {
    const b = bojaVrste(spec, f);
    return b && b !== "bezbojna" && BOJE[b]?.hex ? BOJE[b].hex : null;
  };

  // ── smjesa (istraživanje i pomak) ──
  const imaSmjesu = istrazi || nacin === "pomak";
  const pocetak = untrack(() => (imaSmjesu ? pocetnoStanje(spec) : null));
  const skalaOd = (st) => Object.fromEntries(u.map((x) => [x.formula, 2 * (st?.c[x.formula] ?? 1) || 1]));
  let prikaz = $state.raw(pocetak);
  let cilj = pocetak; // zadnja (ili sljedeća) ravnoteža
  let prije = $state.raw(null);
  let faza = $state("ravnoteza");
  let zadnja = $state.raw(null); // {kljuc, smjer, objasnjenje, Q0, K}
  let skala = $state.raw(skalaOd(pocetak));
  let raf = 0;
  let timer = 0;
  function stani() {
    if (raf) cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
    raf = 0;
    timer = 0;
  }
  $effect(() => () => stani());
  function rasiri(...stanja) {
    const n = { ...skala };
    let pr = false;
    for (const st of stanja)
      for (const x of u)
        if ((st.c[x.formula] ?? 0) > n[x.formula]) {
          n[x.formula] = st.c[x.formula] * 1.25;
          pr = true;
        }
    if (pr) skala = n;
  }
  function primijeni(k) {
    stani();
    prikaz = cilj;
    const sim = simuliraj(spec, cilj, k);
    prije = cilj.c;
    zadnja = { kljuc: k, smjer: sim.smjer, Q0: sim.Q, K: sim.poremeceno.K, objasnjenje: pomakOd(spec, k)?.objasnjenje ?? "" };
    cilj = sim.poslije;
    rasiri(sim.poremeceno, sim.poslije);
    if (smanjiPomak() || sim.xi === 0) {
      prikaz = sim.poslije;
      faza = "ravnoteza";
      return;
    }
    prikaz = sim.poremeceno;
    faza = "poremeceno";
    timer = setTimeout(() => {
      faza = "pomak";
      const t0 = performance.now();
      const korak = (now) => {
        const t = Math.min(1, (now - t0) / 1500);
        const e = 1 - (1 - t) ** 3;
        prikaz = { ...sim.poremeceno, c: Object.fromEntries(u.map((x) => [x.formula, sim.poremeceno.c[x.formula] + x.nu * sim.xi * e])), xiBoje: sim.poremeceno.xiBoje == null ? null : sim.poremeceno.xiBoje + sim.xi * e };
        if (t < 1) raf = requestAnimationFrame(korak);
        else {
          prikaz = sim.poslije;
          faza = "ravnoteza";
          raf = 0;
        }
      };
      raf = requestAnimationFrame(korak);
    }, 700);
  }
  function vrati() {
    stani();
    prikaz = pocetak;
    cilj = pocetak;
    prije = null;
    zadnja = null;
    faza = "ravnoteza";
    skala = skalaOd(pocetak);
  }
  const promjene = untrack(() => (istrazi ? promjeneIstrazivanja(spec) : []));
  // granice crteža: volumen od 1/8 do 8 puta, temperatura tri koraka u svaku stranu
  function moze(k) {
    const p = procitajPromjenu(k);
    if (!p || !cilj) return false;
    if (p.vrsta === "povecanje_tlaka") return cilj.V > 1 / 8;
    if (p.vrsta === "smanjenje_tlaka" || p.vrsta === "razrjedivanje") return cilj.V < 8;
    return mozeT(cilj, k);
  }

  // ── pomak ──
  const pitanja = untrack(() => (nacin === "pomak" ? pitanjaOd(spec) : []));
  const opcijeB = untrack(() => (nacin === "pomak" ? opcijeBoje(spec) : []));
  let odabir = $state({ smjer: "", boja: "", koncentracija: "" });
  let otkriveno = $derived(nacin === "pomak" && (!!ishod?.tocno || pokazi));
  let pokrenuto = false;
  $effect(() => {
    if (!otkriveno || pokrenuto) return;
    pokrenuto = true;
    untrack(() => {
      if (pokazi && !ishod?.tocno) odabir = { smjer: tocnoPomak.smjer ?? "", boja: tocnoPomak.boja ?? "", koncentracija: tocnoPomak.koncentracija ?? "" };
      primijeni(spec.promjena);
    });
  });
  // točni odgovori trebaju samo za „Pokaži odgovor“ (popuni izbor)
  const tocnoPomak = untrack(() => (nacin === "pomak" ? rjesenjePomaka(spec) : {}));
  const potpunPomak = $derived(pitanja.every((p) => odabir[p]));
  function provjeriPomak() {
    if (!aktivno || !potpunPomak) return;
    onodgovor({ ...odabir });
  }
  const krivoPitanje = $derived(ishod && !ishod.tocno && !ishod.prazno ? ishod.krivo : null);

  // ── kc_izraz ──
  let izbor = $state(v.map(() => ({ mjesto: "", eksp: 1 })));
  $effect(() => {
    if (nacin !== "kc_izraz" || !pokazi) return;
    untrack(() => {
      izbor = v.map((x) => ({ mjesto: !x.ulazi ? "ne" : x.strana === "D" ? "brojnik" : "nazivnik", eksp: x.koef }));
    });
  });
  const brojnikUc = $derived(v.filter((x) => izbor[x.i].mjesto === "brojnik").map((x) => ({ formula: x.formula, eksp: Number(izbor[x.i].eksp) })));
  const nazivnikUc = $derived(v.filter((x) => izbor[x.i].mjesto === "nazivnik").map((x) => ({ formula: x.formula, eksp: Number(izbor[x.i].eksp) })));
  const potpunIzraz = $derived(izbor.every((z) => z.mjesto));
  function provjeriIzraz() {
    if (!aktivno || !potpunIzraz) return;
    onodgovor({ clanovi: $state.snapshot(izbor) });
  }
  const MJESTA = [
    { k: "brojnik", t: "brojnik" },
    { k: "nazivnik", t: "nazivnik" },
    { k: "ne", t: "ne ulazi" },
  ];
  const krivRed = (i) => ishod && !ishod.tocno && ishod.krivi?.includes(i);

  // ── izracunaj ──
  const tr = untrack(() => (nacin === "izracunaj" ? traziOf(spec) : []));
  const rav = untrack(() => brojeviOd(spec.ravnotezne));
  const poc = untrack(() => (spec.pocetne ? brojeviOd(spec.pocetne) : null));
  const Kzad = untrack(() => brojOd(spec.K));
  const jedK = untrack(() => jedinicaK(spec));
  const jedC = untrack(() => jedinicaVelicine(spec));
  let unosi = $state(tr.map(() => ""));
  $effect(() => {
    if (nacin !== "izracunaj" || !pokazi) return;
    untrack(() => {
      unosi = tocneVrijednosti(spec).map((x) => zapisBroja(x));
    });
  });
  const potpunRacun = $derived(unosi.every((x) => String(x).trim()));
  function predajRacun(e) {
    e.preventDefault();
    if (aktivno && potpunRacun) onodgovor($state.snapshot(unosi));
  }
  function potencija(i) {
    const x = String(unosi[i]).trim();
    if (!/10\^/.test(x)) unosi[i] = `${x || "1"}·10^`;
    document.getElementById(`rv-${uid}-${i}`)?.focus();
  }
  const okKorak = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina > i);
  const badKorak = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  const izrazTocan = untrack(() => izraz(spec));
</script>

{#snippet tekstF(t)}{#each dijelovi(t) as d, k (k)}{#if d.formula}<Formula f={d.z} />{:else}{d.z}{/if}{/each}{/snippet}

{#snippet clan(x)}
  <span class="rv-clan">
    {#if x.koef > 1}<span class="rv-koef">{x.koef}</span>{/if}
    <span class="rv-f"><Formula f={x.formula} /></span>{#if x.stanje}<span class="rv-st">({x.stanje})</span>{/if}
    {#if bojaHex(x.formula)}<span class="rv-boja" style="background:{bojaHex(x.formula)}" title={BOJE[bojaVrste(spec, x.formula)].z}></span>{/if}
  </span>
{/snippet}

{#snippet clanovi(lista)}
  {#each lista as y, k (y.formula)}{#if k}<span class="rv-puta"> · </span>{/if}<span class="rv-c">{sl}(<Formula f={y.formula} />){#if y.eksp > 1}<sup class="rv-eksp">{y.eksp}</sup>{/if}</span>{/each}
{/snippet}

{#snippet razlomak(br, naz, simbol = K_)}
  <span class="rv-izraz">
    <span class="rv-k">{simbol[0]}{#if simbol.length > 1}<sub>{simbol.slice(1)}</sub>{/if}</span><span class="rv-jednako">=</span>
    {#if naz.length}
      <span class="rv-razlomak">
        <span class="rv-brojnik">{#if br.length}{@render clanovi(br)}{:else}1{/if}</span>
        <span class="rv-nazivnik">{@render clanovi(naz)}</span>
      </span>
    {:else if br.length}
      <span>{@render clanovi(br)}</span>
    {:else}
      <span class="rv-prazno">?</span>
    {/if}
  </span>
{/snippet}

{#if istrazi}
  <div class="rv-tekst"><Md text={spec.tekst} /></div>
  <p class="rv-hint">Ovo nije zadatak: mijenjaj uvjete i gledaj kako se smjesa vraća u ravnotežu.</p>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<!-- jednadžba ravnoteže (samo za čitanje) -->
<div class="rv-eq" role="group" aria-label="Jednadžba ravnoteže">
  <div class="rv-strana">
    {#each L as x, k (x.i)}<span class="rv-par">{#if k}<span class="rv-plus">+</span>{/if}{@render clan(x)}</span>{/each}
  </div>
  <div class="rv-strana">
    <span class="rv-par">
      <span class="rv-strelica" class:desno={faza !== "ravnoteza" && zadnja?.smjer === "udesno"} class:lijevo={faza !== "ravnoteza" && zadnja?.smjer === "ulijevo"} aria-label="ravnoteža">
        <svg width="44" height="16" viewBox="0 0 44 16" aria-hidden="true">
          <path class="gore" d="M2,6 H41 l-6,-4.5" />
          <path class="dolje" d="M42,10 H3 l6,4.5" />
        </svg>
      </span>
      {@render clan(D[0])}
    </span>
    {#each D.slice(1) as x (x.i)}<span class="rv-par"><span class="rv-plus">+</span>{@render clan(x)}</span>{/each}
  </div>
</div>
{#if spec.dH != null && nacin !== "kc_izraz" && nacin !== "izracunaj"}
  <p class="rv-dh">{typeof spec.dH === "number" ? `ΔrH = ${String(spec.dH).replace("-", "−").replace(".", ",")} kJ/mol` : `ΔrH ${spec.dH === "+" ? ">" : "<"} 0`} <span>(reakcija udesno je {(typeof spec.dH === "number" ? spec.dH > 0 : spec.dH === "+") ? "endotermna" : "egzotermna"})</span></p>
{/if}

{#if imaSmjesu && prikaz}
  {#if nacin === "pomak"}
    <p class="rv-promjena"><span class="rv-chip">Promjena</span> {@render tekstF(opisPromjene(spec.promjena))}</p>
  {/if}
  <RavnotezaPrikaz
    {spec}
    c={prikaz.c}
    c0={pocetak.c}
    xiBoje={prikaz.xiBoje}
    prije={nacin === "pomak" && !otkriveno ? null : prije}
    V={prikaz.V}
    T={prikaz.T}
    K={prikaz.K}
    K0={pocetak.K}
    {skala}
    {faza}
    smjer={zadnja?.smjer}
    pokaziKQ={istrazi || otkriveno}
    zamisljeno={pocetak.zamisljeno && (istrazi || otkriveno)}
  />
{/if}

{#if istrazi}
  <div class="rv-gumbi">
    {#each promjene as k (k)}
      <button type="button" class="btn rv-gumb" disabled={!moze(k)} onclick={() => primijeni(k)}>{@render tekstF(oznakaPromjene(k))}</button>
    {/each}
  </div>
  <div class="rv-dno">
    {#if zadnja}
      <p class="rv-obj" aria-live="polite">{@render tekstF(zadnja.objasnjenje)}</p>
    {:else}
      <p class="rv-obj rv-tiho">Odaberi promjenu.</p>
    {/if}
    {#if zadnja}<button type="button" class="btn btn-quiet rv-vrati" onclick={vrati}>Vrati na početak</button>{/if}
  </div>
{/if}

{#if nacin === "pomak"}
  <div class="rv-pitanja">
    {#if pitanja.includes("smjer")}
      <fieldset class="rv-pitanje" class:bad={krivoPitanje === "smjer"}>
        <legend>Kamo se pomiče ravnoteža?</legend>
        <div class="rv-tri" role="radiogroup">
          {#each OPCIJE_SMJERA as o (o.kljuc)}
            <button type="button" role="radio" aria-checked={odabir.smjer === o.kljuc} class="lx-option rv-opcija" class:sel={odabir.smjer === o.kljuc && !otkriveno} class:ok={otkriveno && odabir.smjer === o.kljuc} class:bad={krivoPitanje === "smjer" && odabir.smjer === o.kljuc} disabled={!aktivno} onclick={() => (odabir.smjer = o.kljuc)}>
              <span class="rv-op-gl">{o.kljuc === "ulijevo" ? "← " : ""}{o.tekst}{o.kljuc === "udesno" ? " →" : ""}</span>
              {#if o.pod}<span class="rv-op-pod">{o.pod}</span>{/if}
            </button>
          {/each}
        </div>
      </fieldset>
    {/if}
    {#if pitanja.includes("boja")}
      <fieldset class="rv-pitanje" class:bad={krivoPitanje === "boja"}>
        <legend>Kako se mijenja boja smjese?</legend>
        <div class="lx-options" role="radiogroup">
          {#each opcijeB as o (o.kljuc)}
            <button type="button" role="radio" aria-checked={odabir.boja === o.kljuc} class="lx-option rv-opcija-red" class:sel={odabir.boja === o.kljuc && !otkriveno} class:ok={otkriveno && odabir.boja === o.kljuc} class:bad={krivoPitanje === "boja" && odabir.boja === o.kljuc} disabled={!aktivno} onclick={() => (odabir.boja = o.kljuc)}>
              <span>{@render tekstF(o.tekst.charAt(0).toUpperCase() + o.tekst.slice(1))}</span>
            </button>
          {/each}
        </div>
      </fieldset>
    {/if}
    {#if pitanja.includes("koncentracija")}
      <fieldset class="rv-pitanje" class:bad={krivoPitanje === "koncentracija"}>
        <legend>Što se u novoj ravnoteži događa s {sl}(<Formula f={spec.tvar} />)?</legend>
        <div class="rv-tri" role="radiogroup">
          {#each OPCIJE_KONCENTRACIJE as o (o.kljuc)}
            <button type="button" role="radio" aria-checked={odabir.koncentracija === o.kljuc} class="lx-option rv-opcija" class:sel={odabir.koncentracija === o.kljuc && !otkriveno} class:ok={otkriveno && odabir.koncentracija === o.kljuc} class:bad={krivoPitanje === "koncentracija" && odabir.koncentracija === o.kljuc} disabled={!aktivno} onclick={() => (odabir.koncentracija = o.kljuc)}>
              <span class="rv-op-gl">{o.tekst}</span>
            </button>
          {/each}
        </div>
      </fieldset>
    {/if}
  </div>
  {#if otkriveno && zadnja}<p class="rv-obj">{@render tekstF(zadnja.objasnjenje)}</p>{/if}
  <div class="lx-actions"><button class="btn btn-primary" disabled={!aktivno || !potpunPomak} onclick={provjeriPomak}>Provjeri</button></div>
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

{#if nacin === "kc_izraz"}
  <div class="rv-pregled" aria-live="polite">{@render razlomak(brojnikUc, nazivnikUc)}</div>
  <div class="rv-clanovi">
    {#each v as x (x.i)}
      <div class="rv-kartica" class:bad={krivRed(x.i)} class:ok={ishod?.tocno}>
        <div class="rv-kartica-gl">
          <span class="rv-f"><Formula f={x.formula} /></span>{#if x.stanje}<span class="rv-st">({x.stanje})</span>{/if}
          <span class="rv-uloga">{x.strana === "L" ? "reaktant" : "produkt"}</span>
          <label class="rv-eksp-izbor" class:skriven={izbor[x.i].mjesto === "ne"}>
            <span>eksponent</span>
            <select class="inp" bind:value={izbor[x.i].eksp} disabled={!aktivno || izbor[x.i].mjesto === "ne"} aria-label="Eksponent uz {x.formula}">
              {#each [1, 2, 3, 4, 5, 6] as n (n)}<option value={n}>{n}</option>{/each}
            </select>
          </label>
        </div>
        <div class="rv-seg" role="radiogroup" aria-label="Gdje je {x.formula} u izrazu">
          {#each MJESTA as m (m.k)}
            <button type="button" role="radio" aria-checked={izbor[x.i].mjesto === m.k} class:sel={izbor[x.i].mjesto === m.k} disabled={!aktivno} onclick={() => (izbor[x.i].mjesto = m.k)}>{m.t}</button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="lx-actions"><button class="btn btn-primary" disabled={!aktivno || !potpunIzraz} onclick={provjeriIzraz}>Provjeri</button></div>
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

{#if nacin === "izracunaj"}
  <div class="rv-tablica-okvir">
    <table class="rv-tablica">
      <thead>
        <tr><th scope="col"><span class="rv-jed"><Formula f={`${sl} / (${jedC})`} /></span></th>{#each u as x (x.formula)}<th scope="col"><Formula f={x.formula} /></th>{/each}</tr>
      </thead>
      <tbody>
        {#if poc}
          <tr><th scope="row">početno</th>{#each u as x (x.formula)}<td>{poc[x.formula] ? zapisZadanog(poc[x.formula]) : "0"}</td>{/each}</tr>
          <tr class="rv-tiho"><th scope="row">promjena</th>{#each u as x (x.formula)}<td>?</td>{/each}</tr>
        {/if}
        <tr><th scope="row">ravnoteža</th>{#each u as x (x.formula)}<td class:nepoznato={!rav[x.formula]}><Formula f={rav[x.formula] ? zapisZadanog(rav[x.formula]) : "?"} /></td>{/each}</tr>
      </tbody>
    </table>
  </div>
  {#if Kzad}<p class="rv-kzad"><span class="rv-k">K<sub>{K_.slice(1)}</sub></span> = <Formula f={`${zapisZadanog(Kzad)}${jedK ? ` ${jedK}` : ""}`} /></p>{/if}
  {#if spec.pokazi_izraz}<div class="rv-pregled">{@render razlomak(izrazTocan.brojnik, izrazTocan.nazivnik)}</div>{/if}
  <form class="rv-koraci" onsubmit={predajRacun}>
    {#each tr as t, i (t)}
      <div class="rv-korak" class:ok={okKorak(i)} class:bad={badKorak(i)}>
        <label class="rv-korak-oz" for="rv-{uid}-{i}">{#if t === "K"}<span class="rv-k">K<sub>{K_.slice(1)}</sub></span>{:else}{sl}(<Formula f={t} />){/if} =</label>
        <input id="rv-{uid}-{i}" class="inp rv-inp" class:ok={okKorak(i)} class:bad={badKorak(i)} inputmode="decimal" autocomplete="off" placeholder="?" disabled={!aktivno} bind:value={unosi[i]} />
        {#if jedinicaKoraka(spec, t)}<span class="lx-unit"><Formula f={jedinicaKoraka(spec, t)} /></span>{/if}
        {#if aktivno}<button type="button" class="btn btn-quiet rv-pot" onclick={() => potencija(i)} aria-label="Dodaj potenciju broja 10">·10ⁿ</button>{/if}
      </div>
    {/each}
    <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpunRacun}>Provjeri</button></div>
  </form>
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<style>
  .rv-tekst {
    margin-bottom: 6px;
  }
  .rv-hint {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--text-dim);
  }
  /* jednadžba */
  .rv-eq {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 10px;
    margin: 4px 0 6px;
    font-family: var(--font-sans);
    font-size: 19px;
    line-height: 1.25;
    color: var(--text);
  }
  .rv-strana {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  /* „+“ i strelica u istom redu s pojmom iza sebe */
  .rv-par {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .rv-clan {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }
  .rv-koef {
    font-weight: 500;
    margin-right: 2px;
  }
  .rv-f {
    font-weight: 500;
  }
  .rv-st {
    font-size: 0.75em;
    color: var(--text-dim);
  }
  .rv-boja {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-left: 3px;
    border: 1px solid color-mix(in srgb, var(--text) 25%, transparent);
  }
  .rv-plus {
    color: var(--text-dim);
  }
  .rv-strelica svg {
    display: block;
  }
  .rv-strelica path {
    fill: none;
    stroke: var(--text);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke 0.2s, stroke-width 0.2s;
  }
  .rv-strelica.desno .gore,
  .rv-strelica.lijevo .dolje {
    stroke: var(--primary);
    stroke-width: 2.8;
  }
  .rv-dh {
    margin: 0 0 8px;
    text-align: center;
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .rv-dh span {
    color: var(--text-faint);
  }
  .rv-promjena {
    margin: 4px 0 6px;
    font-size: 14.5px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
  }
  .rv-chip {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-elev-2);
    font-size: 12px;
    color: var(--text-dim);
  }

  /* istraživanje */
  .rv-gumbi {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 8px;
    margin-top: 4px;
  }
  .rv-gumb {
    white-space: normal;
    text-align: center;
    min-height: 40px;
    padding: 6px 10px;
    font-size: 14px;
    line-height: 1.25;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    touch-action: manipulation;
  }
  .rv-gumb:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .rv-gumb:disabled {
    opacity: 0.4;
  }
  .rv-dno {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6px 12px;
    margin-top: 10px;
  }
  .rv-obj {
    flex: 1 1 240px;
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text);
  }
  .rv-tiho {
    color: var(--text-faint);
  }
  .rv-vrati {
    min-height: 36px;
    font-size: 13px;
  }

  /* pomak */
  .rv-pitanja {
    display: grid;
    gap: 12px;
    margin: 8px 0 4px;
  }
  .rv-pitanje {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  .rv-pitanje legend {
    padding: 0;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .rv-pitanje.bad legend {
    color: var(--lx-bad);
  }
  .rv-tri {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .rv-opcija {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    min-height: 48px;
    padding: 8px 6px;
    text-align: center;
  }
  .rv-opcija-red {
    padding: 10px 12px;
  }
  .rv-op-gl {
    font-weight: 600;
    font-size: 14.5px;
  }
  .rv-op-pod {
    font-size: 11.5px;
    color: var(--text-faint);
  }

  /* izraz */
  .rv-pregled {
    display: flex;
    justify-content: center;
    margin: 6px 0 12px;
    overflow-x: auto;
  }
  .rv-izraz {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-sans);
    font-size: 17px;
    white-space: nowrap;
  }
  .rv-k {
    font-style: italic;
    font-weight: 600;
  }
  .rv-k sub {
    font-style: normal;
    font-size: 0.7em;
  }
  .rv-razlomak {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }
  .rv-brojnik {
    padding: 0 4px 3px;
    border-bottom: 1.5px solid currentColor;
  }
  .rv-nazivnik {
    padding: 3px 4px 0;
  }
  .rv-eksp {
    font-size: 0.68em;
    vertical-align: 0.6em;
    line-height: 0;
  }
  .rv-puta {
    color: var(--text-dim);
  }
  .rv-prazno {
    color: var(--text-faint);
  }
  .rv-clanovi {
    display: grid;
    gap: 8px;
  }
  .rv-kartica {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .rv-kartica.bad {
    border-color: var(--lx-bad);
  }
  .rv-kartica.ok {
    border-color: var(--lx-ok);
  }
  .rv-kartica-gl {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
    font-family: var(--font-sans);
    font-size: 17px;
  }
  .rv-uloga {
    font-size: 12px;
    color: var(--text-faint);
  }
  .rv-eksp-izbor {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .rv-eksp-izbor.skriven {
    visibility: hidden;
  }
  .rv-eksp-izbor select {
    height: 36px;
    width: 56px;
    padding: 0 6px;
    font-size: 16px;
  }
  .rv-seg {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
  }
  .rv-seg button {
    min-height: 38px;
    padding: 4px 6px;
    font-size: 14px;
    background: var(--bg-elev);
    color: var(--text);
    border: 0;
    border-left: 1px solid var(--border);
    touch-action: manipulation;
  }
  .rv-seg button:first-child {
    border-left: 0;
  }
  .rv-seg button:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .rv-seg button.sel {
    background: var(--primary-dim);
    color: var(--primary);
    font-weight: 600;
    box-shadow: inset 0 0 0 1.5px var(--lx-turn);
  }

  /* račun */
  .rv-tablica-okvir {
    overflow-x: auto;
    margin: 4px 0 8px;
  }
  .rv-tablica {
    border-collapse: collapse;
    margin: 0 auto;
    font-family: var(--font-sans);
    font-size: 14.5px;
  }
  .rv-tablica th,
  .rv-tablica td {
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
    text-align: center;
    white-space: nowrap;
  }
  .rv-tablica thead th {
    font-weight: 600;
  }
  .rv-tablica tbody th {
    text-align: left;
    font-weight: 500;
    color: var(--text-dim);
    font-size: 13px;
  }
  .rv-tablica td.nepoznato,
  .rv-tablica tr.rv-tiho td {
    color: var(--text-faint);
  }
  .rv-jed {
    font-weight: 400;
    font-size: 12px;
    color: var(--text-faint);
  }
  .rv-kzad {
    margin: 0 0 8px;
    text-align: center;
    font-family: var(--font-sans);
  }
  .rv-koraci {
    display: grid;
    gap: 8px;
  }
  .rv-korak {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .rv-korak.ok {
    border-color: var(--lx-ok);
  }
  .rv-korak.bad {
    border-color: var(--lx-bad);
  }
  .rv-korak-oz {
    font-family: var(--font-sans);
    font-size: 16px;
    white-space: nowrap;
  }
  .rv-inp {
    width: 130px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .rv-pot {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
    font-size: 13px;
  }

  @media (max-width: 420px) {
    .rv-eq {
      font-size: 17px;
    }
    .rv-izraz {
      font-size: 15.5px;
    }
    .rv-inp {
      width: 110px;
    }
  }
</style>
