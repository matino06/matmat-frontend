<script>
  // energijski_dijagram: entalpijski / energijski dijagram nacrtan skicom „energijski_dijagram“ (taskSketch.js), uz
  // način rada: istraživanje (izbor reakcije, katalizator, povratna reakcija, put po stupnjevima ili preko elementarnih
  // tvari, vrijednosti ispod), Hessov zakon (ΔfH tablica ili kartice jednadžbi: obrni / faktor, pa ΔrH), očitavanje
  // s dijagrama ili slaganje razina gumbima gore / dolje. Sva kemija i svi brojevi su u katalog/kemija/energijski_dijagram.js.
  import { untrack } from "svelte";
  import "$lib/sketch/sketch.css";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { tocanOdgovor } from "../../katalog/index.js";
  import {
    reakcijaOd,
    razine,
    skicaOd,
    nacrtaj,
    velicine,
    zapisVelicine,
    jedinicaOd,
    sPredznakom,
    bezPredznaka,
    stvaranjeOd,
    tvariStvaranja,
    zapisTvari,
    hessOd,
    zbrojKombinacije,
    straneVektora,
    preinacena,
    koefZapis,
    FAKTORI,
    slaganjeOd,
    tocnaMjesta,
    MJESTA,
    VRH_NAJVISE,
    zadanoOd,
    traziOd,
  } from "$lib/lesson/katalog/kemija/energijski_dijagram.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const jed = untrack(() => jedinicaOd(spec));
  const uid = Math.random().toString(36).slice(2, 8);
  let aktivno = $derived(!locked && !pokazi);
  let otkriveno = $derived(!!ishod?.tocno || pokazi);
  const dijelovi = (t) => String(t ?? "").trim().split(/\s\+\s/);
  const zapisSPredznakom = (b) => (b?.zapis ? b.zapis.replace(/-/g, "−") : sPredznakom(b.v));

  // ── istraživanje ──
  const svi = untrack(() => (spec.reakcije ?? (spec.reakcija ? [spec.reakcija] : [])).map(reakcijaOd));
  let odabrana = $state(0);
  let pogled = $state("osnovno"); // osnovno | katalizator | povratna
  let put = $state("izravno"); // izravno | stupnjevi | stvaranje
  const r = $derived(nacin === "hess" && spec.jednadzbe ? null : svi[odabrana]);
  function odaberi(i) {
    odabrana = i;
    pogled = "osnovno";
    put = "izravno";
  }
  const skicaIstrazi = $derived.by(() => {
    if (!istrazi || !r) return null;
    if (r.Ea) {
      const kat = pogled === "katalizator";
      const pov = pogled === "povratna";
      return skicaOd(spec, r, { kat, strelice: { Ea: true, Ea_kat: kat, Ea_povratne: pov, dH: true }, vrijednosti: { Ea: true, Ea_kat: true, Ea_povratne: true, dH: true } });
    }
    if (put === "stupnjevi") return skicaOd(spec, r, { stupnjevi: true });
    if (put === "stvaranje") return skicaOd(spec, r, { stvaranje: true });
    return skicaOd(spec, r, {});
  });

  // ── Hess: ΔfH ──
  const hessDf = nacin === "hess" && !untrack(() => spec.jednadzbe);
  const st = untrack(() => (hessDf ? stvaranjeOd(svi[0]) : null));
  const tvariDf = untrack(() => (hessDf ? tvariStvaranja(svi[0]) : []));
  const elementarne = tvariDf.filter((x) => x.elementarna && !x.b);
  const zadane = tvariDf.filter((x) => x.b);
  let df = $state({ dH: "", sP: "", sR: "", elementi: Object.fromEntries(elementarne.map((x) => [x.tvar.kljuc, ""])) });
  $effect(() => {
    if (!hessDf || !pokazi) return;
    untrack(() => {
      df = { dH: sPredznakom(st.dH), sP: sPredznakom(st.sP), sR: sPredznakom(st.sR), elementi: Object.fromEntries(elementarne.map((x) => [x.tvar.kljuc, "0"])) };
    });
  });
  const potpunDf = $derived(String(df.dH).trim() && (!spec.koraci || (String(df.sP).trim() && String(df.sR).trim() && Object.values(df.elementi).every((v) => String(v).trim()))));
  function predajDf(e) {
    e.preventDefault();
    if (aktivno && potpunDf) onodgovor($state.snapshot(df));
  }

  // ── Hess: jednadžbe ──
  const h = untrack(() => (nacin === "hess" && spec.jednadzbe ? hessOd(spec) : null));
  let obrni = $state(h ? h.J.map(() => false) : []);
  let faktori = $state(h ? h.J.map(() => 1) : []);
  let dHj = $state("");
  $effect(() => {
    if (!h || !pokazi) return;
    untrack(() => {
      obrni = [...h.obrni];
      faktori = [...h.faktori];
      dHj = sPredznakom(h.dH);
    });
  });
  const zbroj = $derived(h ? straneVektora(h, zbrojKombinacije(h, obrni, faktori)) : null);
  function predajJ(e) {
    e.preventDefault();
    if (aktivno && String(dHj).trim()) onodgovor({ obrni: [...obrni], faktori: [...faktori], dH: dHj });
  }
  const krivaJ = (i) => ishod && !ishod.tocno && ishod.kombinacija && (ishod.jednadzba == null || ishod.jednadzba === i);

  // ── očitavanje ──
  const tr = untrack(() => (nacin === "ocitaj" ? traziOd(spec) : []));
  const zad = untrack(() => (nacin === "ocitaj" ? zadanoOd(spec) : []));
  let unosi = $state(tr.map(() => ""));
  $effect(() => {
    if (nacin !== "ocitaj" || !pokazi) return;
    untrack(() => {
      unosi = tr.map((k) => zapisVelicine(svi[0], k));
    });
  });
  const skicaOcitaj = $derived.by(() => {
    if (nacin !== "ocitaj") return null;
    const rr = svi[0];
    // zadane veličine (i nakon provjere tražene) s brojem; sniženje se vidi kao dvije strelice Eₐ
    const vidi = Object.fromEntries([...zad.filter((z) => z !== "razine"), ...(otkriveno ? tr : [])].flatMap((k) => (k === "snizenje" ? ["Ea", "Ea_kat"] : [k])).map((k) => [k, true]));
    const upitnik = spec.strelice && !otkriveno ? Object.fromEntries(tr.filter((k) => k !== "snizenje").map((k) => [k, true])) : {};
    const strelice = { ...vidi, ...upitnik };
    if (!rr.Ea) strelice.dH = !!strelice.dH;
    return skicaOd(spec, rr, { kat: !!rr.Ea_kat, razineVrijednosti: zad.includes("razine"), strelice, vrijednosti: vidi, upitnik });
  });
  const potpunOcitaj = $derived(unosi.every((x) => String(x).trim()));
  function predajOcitaj(e) {
    e.preventDefault();
    if (aktivno && potpunOcitaj) onodgovor($state.snapshot(unosi));
  }
  const okKorak = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina > i);
  const badKorak = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  const OZNAKA = { Ea: ["E", "a", ""], dH: ["ΔH", "r", ""], Ea_povratne: ["E", "a", " povratne reakcije"], Ea_kat: ["E", "a", " s katalizatorom"], Ea_kat_povratne: ["E", "a", " povratne, s katalizatorom"], snizenje: ["sniženje E", "a", ""] };

  // ── slaganje ──
  const sl = untrack(() => (nacin === "slozi" ? slaganjeOd(svi[0]) : { razina: 0, vrhova: 0 }));
  const rzSl = untrack(() => (nacin === "slozi" ? razine(svi[0]) : []));
  let mjesta = $state(Array.from({ length: sl.razina + 1 }, () => 0));
  let vrhovi = $state(Array.from({ length: sl.vrhova }, () => 3));
  $effect(() => {
    if (nacin !== "slozi" || !pokazi || ishod?.tocno) return;
    untrack(() => {
      const t = tocnaMjesta(svi[0]);
      mjesta = t.razine;
      vrhovi = t.vrhovi;
    });
  });
  const vrhIznad = () => Math.max(mjesta[0], mjesta[mjesta.length - 1]) + 1;
  function pomakni(i, d) {
    mjesta[i] = Math.max(-MJESTA, Math.min(MJESTA, mjesta[i] + d));
    // vrh ostaje iznad obiju razina
    vrhovi = vrhovi.map((v) => Math.max(v, vrhIznad()));
  }
  function pomakniVrh(i, d) {
    vrhovi[i] = Math.max(vrhIznad(), Math.min(VRH_NAJVISE, vrhovi[i] + d));
  }
  const skicaSlozi = $derived(nacin === "slozi" ? skicaOd(spec, svi[0], { stupnjevi: true, bezDH: true, kat: true, pozicije: { razine: mjesta, vrhovi }, raspon: [-MJESTA, sl.vrhova ? VRH_NAJVISE : MJESTA] }) : null);
  const tocnaSkica = $derived(nacin === "slozi" && otkriveno ? skicaOd(spec, svi[0], { stupnjevi: true, kat: true, strelice: { Ea: true, Ea_kat: true, dH: true }, vrijednosti: { Ea: true, Ea_kat: true, dH: true } }) : null);
  function predajSlozi() {
    if (aktivno) onodgovor({ razine: mjesta.slice(1), vrhovi: [...vrhovi] });
  }
  const imeVrha = (i) => (sl.vrhova === 2 ? (i === 0 ? "vrh bez katalizatora" : "vrh s katalizatorom") : "vrh (prijelazno stanje)");

  // ± ispred broja (tipkovnica za brojeve na mobitelu nema minus)
  function predznak(v) {
    const x = String(v ?? "").trim();
    if (/^[−-]/.test(x)) return x.replace(/^[−-]\s*/, "");
    return `−${x.replace(/^\+\s*/, "")}`;
  }

  const svg = (s) => (s ? nacrtaj(s) : null);
</script>

{#snippet strana(t)}{#each dijelovi(t) as d, k (k)}{#if k}{" "}<span class="ed-par"><span class="ed-plus">+</span> <Formula f={d} /></span>{:else}<span class="ed-par"><Formula f={d} /></span>{/if}{/each}{/snippet}
{#snippet clanovi(lista)}{#each lista as d, k (k)}{#if k}{" "}<span class="ed-par"><span class="ed-plus">+</span> <Formula f={d} /></span>{:else}<span class="ed-par"><Formula f={d} /></span>{/if}{/each}{/snippet}
{#snippet dH()}Δ<sub>r</sub>H{/snippet}
{#snippet Ea(dod)}E<sub>a</sub>{dod}{/snippet}
{#snippet broj(t)}<span class="ed-br">{t} {jed}</span>{/snippet}
{#snippet skica(s)}{#if svg(s)}<figure class="task-sketch ed-skica">{@html svg(s)}</figure>{/if}{/snippet}
{#snippet unos(id, label, vrijednost, postavi, ok, bad)}
  <div class="ed-korak" class:ok class:bad>
    <label class="ed-korak-oz" for={id}>{@render label()} =</label>
    <span class="ed-polje">
      <input {id} class="inp ed-inp" class:ok class:bad inputmode="decimal" autocomplete="off" placeholder="?" disabled={!aktivno} value={vrijednost} oninput={(e) => postavi(e.currentTarget.value)} />
      <span class="lx-unit">{jed}</span>
      {#if aktivno}<button type="button" class="btn btn-quiet ed-pm" onclick={() => postavi(predznak(vrijednost))} aria-label="Promijeni predznak">±</button>{/if}
    </span>
  </div>
{/snippet}

{#if istrazi}
  <div class="ed-tekst"><Md text={spec.tekst} /></div>
  <p class="ed-hint">Ovo nije zadatak: mijenjaj prikaz i gledaj razine i strelice.</p>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<!-- ═══ istraživanje ═══ -->
{#if istrazi && r}
  {#if svi.length > 1}
    <div class="ed-chips" role="radiogroup" aria-label="Reakcija">
      {#each svi as x, i (i)}
        <button type="button" role="radio" aria-checked={odabrana === i} class="ed-chip" class:sel={odabrana === i} onclick={() => odaberi(i)}><Formula f={x.oznaka} /></button>
      {/each}
    </div>
  {/if}
  {#if r.Ea}
    <div class="ed-seg" role="radiogroup" aria-label="Prikaz" style="--n:{r.Ea_kat ? 3 : 2}">
      <button type="button" role="radio" aria-checked={pogled === "osnovno"} class:sel={pogled === "osnovno"} onclick={() => (pogled = "osnovno")}>Reakcija</button>
      {#if r.Ea_kat}<button type="button" role="radio" aria-checked={pogled === "katalizator"} class:sel={pogled === "katalizator"} onclick={() => (pogled = "katalizator")}>Katalizator</button>{/if}
      <button type="button" role="radio" aria-checked={pogled === "povratna"} class:sel={pogled === "povratna"} onclick={() => (pogled = "povratna")}>Povratna</button>
    </div>
  {:else if r.stupnjevi || r.dfH}
    <div class="ed-seg" role="radiogroup" aria-label="Put" style="--n:2">
      <button type="button" role="radio" aria-checked={put === "izravno"} class:sel={put === "izravno"} onclick={() => (put = "izravno")}>Izravno</button>
      {#if r.stupnjevi}<button type="button" role="radio" aria-checked={put === "stupnjevi"} class:sel={put === "stupnjevi"} onclick={() => (put = "stupnjevi")}>Po stupnjevima</button>{/if}
      {#if r.dfH}<button type="button" role="radio" aria-checked={put === "stvaranje"} class:sel={put === "stvaranje"} onclick={() => (put = "stvaranje")}>Preko elemenata</button>{/if}
    </div>
  {/if}
  {@render skica(skicaIstrazi)}
  <div class="ed-vrijednosti" aria-live="polite">
    {#if r.Ea}
      <p>{@render Ea("")} = {@render broj(zapisVelicine(r, "Ea"))}</p>
      {#if pogled === "katalizator"}<p>S katalizatorom: {@render Ea("")} = {@render broj(zapisVelicine(r, "Ea_kat"))}, niža za {@render broj(bezPredznaka(velicine(r).snizenje))}. Razine reaktanata i produkata ostaju iste, pa je i {@render dH()} ista.</p>{/if}
      {#if pogled === "povratna"}<p>Povratna reakcija kreće od produkata: {@render Ea(" povratne")} = {@render Ea("")} − {@render dH()} = <span class="ed-br">{zapisVelicine(r, "Ea")} − ({zapisVelicine(r, "dH")})</span> = {@render broj(zapisVelicine(r, "Ea_povratne"))}.</p>{/if}
    {/if}
    {#if put === "stupnjevi" && r.stupnjevi}
      {#each r.stupnjevi as x, i (i)}<p>{x.oznaka ?? `stupanj ${i + 1}`}: {@render broj(zapisSPredznakom(x.dH))}</p>{/each}
      <p>Zbroj stupnjeva = {@render dH()} = {@render broj(zapisVelicine(r, "dH"))}: isto kao izravno (Hessov zakon).</p>
    {:else if put === "stvaranje" && r.dfH}
      {@const s2 = stvaranjeOd(r)}
      <p>Elementarne tvari su na 0. Σν·Δ<sub>f</sub>H(reaktanti) = {@render broj(sPredznakom(s2.sR))}, Σν·Δ<sub>f</sub>H(produkti) = {@render broj(sPredznakom(s2.sP))}.</p>
      <p>{@render dH()} = <span class="ed-br">{sPredznakom(s2.sP)} − ({sPredznakom(s2.sR)})</span> = {@render broj(sPredznakom(s2.dH))}</p>
    {:else}
      <p>
        {#if r.dH.v != null}{@render dH()} = {@render broj(zapisVelicine(r, "dH"))}{:else}{@render dH()} {r.dH.znak > 0 ? ">" : "<"} 0{/if}:
        {#if r.dH.znak < 0}egzotermna promjena, produkti su niže od reaktanata (toplina prelazi u okolinu).{:else}endotermna promjena, produkti su više od reaktanata (sustav uzima toplinu iz okoline).{/if}
      </p>
    {/if}
  </div>
{/if}

<!-- ═══ Hess: entalpije stvaranja ═══ -->
{#if hessDf}
  <div class="ed-cilj">{@render strana(svi[0].reaktanti)} <span class="ed-par"><span class="ed-str">→</span> {@render strana(svi[0].produkti)}</span></div>
  <form class="ed-koraci" onsubmit={predajDf}>
    <div class="ed-tablica">
      {#each zadane as x (x.tvar.kljuc)}
        <div class="ed-red"><span>Δ<sub>f</sub>H(<Formula f={`${x.tvar.formula}, ${x.tvar.stanje === "l" ? "ℓ" : x.tvar.stanje}`} />) =</span> {@render broj(zapisSPredznakom(x.b))}</div>
      {/each}
    </div>
    {#if spec.koraci}
      {#each elementarne as x (x.tvar.kljuc)}
        {#snippet oz()}Δ<sub>f</sub>H(<Formula f={`${x.tvar.formula}, ${x.tvar.stanje === "l" ? "ℓ" : x.tvar.stanje}`} />){/snippet}
        {@render unos(`ed-${uid}-el-${x.tvar.kljuc}`, oz, df.elementi[x.tvar.kljuc], (v) => (df.elementi[x.tvar.kljuc] = v), otkriveno || (ishod && !String(ishod.polje ?? "").startsWith("el:")), ishod && !ishod.tocno && !ishod.prazno && ishod.polje === `el:${x.tvar.kljuc}`)}
      {/each}
      {#snippet ozP()}Σν·Δ<sub>f</sub>H(produkti){/snippet}
      {#snippet ozR()}Σν·Δ<sub>f</sub>H(reaktanti){/snippet}
      {@render unos(`ed-${uid}-sp`, ozP, df.sP, (v) => (df.sP = v), otkriveno || (ishod && ["sR", "dH"].includes(ishod.polje)), ishod && !ishod.tocno && !ishod.prazno && ishod.polje === "sP")}
      {@render unos(`ed-${uid}-sr`, ozR, df.sR, (v) => (df.sR = v), otkriveno || (ishod && ishod.polje === "dH"), ishod && !ishod.tocno && !ishod.prazno && ishod.polje === "sR")}
    {/if}
    {@render unos(`ed-${uid}-dh`, dH, df.dH, (v) => (df.dH = v), otkriveno, ishod && !ishod.tocno && !ishod.prazno && ishod.polje === "dH")}
    <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpunDf}>Provjeri</button></div>
  </form>
  {#if otkriveno}{@render skica(skicaOd(spec, svi[0], { stvaranje: true }))}{/if}
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<!-- ═══ Hess: zadane jednadžbe ═══ -->
{#if h}
  <div class="ed-cilj"><span class="ed-cilj-oz">Tražena:</span> {@render strana(h.r.reaktanti)} <span class="ed-par"><span class="ed-str">→</span> {@render strana(h.r.produkti)}</span></div>
  <form class="ed-koraci" onsubmit={predajJ}>
    <div class="ed-kartice">
      {#each h.J as j, i (i)}
        {@const p = preinacena(j, obrni[i], faktori[i])}
        <div class="ed-kartica" class:bad={krivaJ(i)} class:ok={otkriveno}>
          <div class="ed-kartica-gl">
            <span class="ed-br-j">{i + 1}</span>
            <span class="ed-jed">{@render clanovi(p.L)} <span class="ed-par"><span class="ed-str">→</span> {@render clanovi(p.D)}</span></span>
          </div>
          <p class="ed-kartica-dh">
            ΔH = {@render broj(zapisSPredznakom(j.dH))}
            {#if otkriveno && (obrni[i] || faktori[i] !== 1)}<span class="ed-preinaka">→ {#if faktori[i] !== 1}{koefZapis(faktori[i])} · ({sPredznakom((obrni[i] ? -1 : 1) * j.dH.v)}){" "}={" "}{/if}{@render broj(sPredznakom((obrni[i] ? -1 : 1) * faktori[i] * j.dH.v))}</span>{/if}
          </p>
          <div class="ed-kontrole">
            <div class="ed-seg ed-seg-mali" role="radiogroup" aria-label="Smjer jednadžbe {i + 1}" style="--n:2">
              <button type="button" role="radio" aria-checked={!obrni[i]} class:sel={!obrni[i]} disabled={!aktivno} onclick={() => (obrni[i] = false)}>kako piše</button>
              <button type="button" role="radio" aria-checked={obrni[i]} class:sel={obrni[i]} disabled={!aktivno} onclick={() => (obrni[i] = true)}>obrnuto</button>
            </div>
            <div class="ed-seg ed-seg-mali" role="radiogroup" aria-label="Faktor jednadžbe {i + 1}" style="--n:{FAKTORI.length}">
              {#each FAKTORI as f (f)}
                <button type="button" role="radio" aria-checked={faktori[i] === f} aria-label="puta {koefZapis(f)}" class:sel={faktori[i] === f} disabled={!aktivno} onclick={() => (faktori[i] = f)}>·{koefZapis(f)}</button>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
    {#if spec.zbroj || otkriveno}
      <p class="ed-zbroj"><span class="ed-cilj-oz">Zbroj:</span> {#if zbroj.L.length || zbroj.D.length}<span class="ed-jed">{#if zbroj.L.length}{@render clanovi(zbroj.L)}{:else}<span>0</span>{/if} <span class="ed-par"><span class="ed-str">→</span> {#if zbroj.D.length}{@render clanovi(zbroj.D)}{:else}<span>0</span>{/if}</span></span>{:else}sve se pokrati{/if}</p>
    {/if}
    {@render unos(`ed-${uid}-dhj`, dH, dHj, (v) => (dHj = v), otkriveno, ishod && !ishod.tocno && !ishod.prazno && ishod.polje === "dH")}
    <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !String(dHj).trim()}>Provjeri</button></div>
  </form>
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<!-- ═══ očitavanje ═══ -->
{#if nacin === "ocitaj"}
  {@render skica(skicaOcitaj)}
  <form class="ed-koraci" onsubmit={predajOcitaj}>
    {#each tr as k, i (k)}
      {#snippet oz()}{#if k === "dH"}{@render dH()}{:else}{OZNAKA[k][0]}<sub>{OZNAKA[k][1]}</sub>{OZNAKA[k][2]}{/if}{/snippet}
      {@render unos(`ed-${uid}-o${i}`, oz, unosi[i], (v) => (unosi[i] = v), okKorak(i), badKorak(i))}
    {/each}
    <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpunOcitaj}>Provjeri</button></div>
  </form>
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<!-- ═══ slaganje ═══ -->
{#if nacin === "slozi"}
  {@render skica(skicaSlozi)}
  <div class="ed-slozi">
    {#each rzSl.slice(1) as x, k (k)}
      {@const i = k + 1}
      <div class="ed-pomak" class:bad={ishod && !ishod.tocno && ishod.krivaRazina === i} class:ok={!!ishod?.tocno}>
        <span class="ed-pomak-oz">{@render strana(x.oznaka)}</span>
        <span class="ed-gumbi">
          <button type="button" class="btn ed-gore" disabled={!aktivno || mjesta[i] >= MJESTA} onclick={() => pomakni(i, 1)} aria-label="Podigni razinu {x.oznaka}">▲</button>
          <button type="button" class="btn ed-gore" disabled={!aktivno || mjesta[i] <= -MJESTA} onclick={() => pomakni(i, -1)} aria-label="Spusti razinu {x.oznaka}">▼</button>
        </span>
      </div>
    {/each}
    {#each vrhovi as v, i (i)}
      <div class="ed-pomak" class:bad={ishod && !ishod.tocno && ishod.krivVrh === i} class:ok={!!ishod?.tocno}>
        <span class="ed-pomak-oz">{imeVrha(i)}</span>
        <span class="ed-gumbi">
          <button type="button" class="btn ed-gore" disabled={!aktivno || v >= VRH_NAJVISE} onclick={() => pomakniVrh(i, 1)} aria-label="Podigni {imeVrha(i)}">▲</button>
          <button type="button" class="btn ed-gore" disabled={!aktivno || v <= vrhIznad()} onclick={() => pomakniVrh(i, -1)} aria-label="Spusti {imeVrha(i)}">▼</button>
        </span>
      </div>
    {/each}
  </div>
  <div class="lx-actions"><button class="btn btn-primary" disabled={!aktivno} onclick={predajSlozi}>Provjeri</button></div>
  {#if tocnaSkica}<p class="ed-pod">Dijagram s vrijednostima:</p>{@render skica(tocnaSkica)}{/if}
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<style>
  .ed-tekst {
    margin-bottom: 6px;
  }
  .ed-hint {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .ed-skica {
    margin: 4px auto 8px;
    max-width: 460px;
  }
  /* „+“ i strelica u istom retku s pojmom iza sebe */
  .ed-par {
    white-space: nowrap;
  }
  .ed-plus,
  .ed-str {
    color: var(--text-dim);
  }
  .ed-jed {
    font-family: var(--font-sans);
  }
  .ed-br {
    white-space: nowrap;
  }
  .ed-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 2px 0 8px;
  }
  .ed-chip {
    min-height: 36px;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 14px;
    touch-action: manipulation;
  }
  .ed-chip.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
    color: var(--primary);
    font-weight: 600;
  }
  .ed-seg {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
    margin: 0 0 6px;
  }
  .ed-seg button {
    min-height: 38px;
    padding: 4px 4px;
    font-size: 14px;
    background: var(--bg-elev);
    color: var(--text);
    border: 0;
    border-left: 1px solid var(--border);
    touch-action: manipulation;
  }
  .ed-seg button:first-child {
    border-left: 0;
  }
  .ed-seg button:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .ed-seg button.sel {
    background: var(--primary-dim);
    color: var(--primary);
    font-weight: 600;
    box-shadow: inset 0 0 0 1.5px var(--lx-turn);
  }
  .ed-seg-mali button {
    font-size: 13.5px;
    min-height: 36px;
  }
  .ed-vrijednosti {
    font-size: 14.5px;
    line-height: 1.5;
    color: var(--text);
  }
  .ed-vrijednosti p {
    margin: 0 0 4px;
  }
  .ed-cilj,
  .ed-zbroj {
    font-family: var(--font-sans);
    font-size: 17px;
    line-height: 1.5;
    text-align: center;
    margin: 4px 0 10px;
  }
  .ed-zbroj {
    font-size: 15px;
    margin: 4px 0 8px;
  }
  .ed-cilj-oz {
    font-size: 13px;
    color: var(--text-dim);
    margin-right: 4px;
  }
  .ed-tablica {
    display: grid;
    gap: 2px;
    margin: 0 0 8px;
    font-size: 14.5px;
  }
  .ed-red {
    display: flex;
    flex-wrap: wrap;
    gap: 0 6px;
  }
  .ed-koraci {
    display: grid;
    gap: 8px;
  }
  .ed-korak {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }
  .ed-korak-oz {
    font-family: var(--font-sans);
    font-size: 15px;
  }
  .ed-polje {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .ed-inp {
    width: 6.5em;
    min-height: 40px;
  }
  .ed-pm {
    min-width: 40px;
    min-height: 40px;
    padding: 0 8px;
  }
  .ed-kartice {
    display: grid;
    gap: 8px;
  }
  .ed-kartica {
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 10px 12px;
    background: var(--bg-elev);
  }
  .ed-kartica.bad {
    border-color: var(--lx-bad);
  }
  .ed-kartica.ok {
    border-color: var(--lx-ok);
  }
  .ed-kartica-gl {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 15.5px;
    line-height: 1.45;
  }
  .ed-br-j {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-grid;
    place-items: center;
    font-size: 12px;
    font-weight: 600;
    background: var(--bg-elev-2);
    color: var(--text-dim);
  }
  .ed-kartica-dh {
    margin: 4px 0 8px 30px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .ed-preinaka {
    color: var(--text);
    white-space: nowrap;
  }
  .ed-kontrole {
    display: grid;
    gap: 6px;
  }
  .ed-kontrole .ed-seg {
    margin: 0;
  }
  .ed-slozi {
    display: grid;
    gap: 6px;
    margin: 0 0 4px;
  }
  .ed-pomak {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 4px 4px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
  }
  .ed-pomak.bad {
    border-color: var(--lx-bad);
  }
  .ed-pomak.ok {
    border-color: var(--lx-ok);
  }
  .ed-pomak-oz {
    font-size: 15px;
    font-family: var(--font-sans);
  }
  .ed-gumbi {
    display: flex;
    gap: 4px;
    flex: none;
  }
  .ed-gore {
    min-width: 44px;
    min-height: 40px;
    padding: 0;
    font-size: 15px;
    touch-action: manipulation;
  }
  .ed-pod {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--text-dim);
  }
</style>
