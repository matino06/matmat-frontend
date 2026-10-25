<script>
  // molekula: strukturna ili Lewisova formula. Crtež: veze, nevezni parovi i zagrada iona u SVG-u, a oznake atoma su
  // HTML (Formula.svelte za indekse i naboje) i ujedno gumbi za dodir, pozicionirani u postocima i skalirani s
  // crtežom (container query jedinice), pa crtež stane na 360 px, a meta za dodir ostane oko 40 px. Sva kemija
  // (oktet, VSEPR, polarnost, asimetrični C, lanac) i položaji su u katalog/kemija/molekula.js; ovdje se samo crta.
  import { untrack } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { tocanOdgovor } from "../../katalog/index.js";
  import {
    model,
    polozaji,
    primitivi,
    prikaziOd,
    vidiParoveOd,
    tocniParovi,
    prostorno,
    oblikOko,
    kutOblika,
    imeOblika,
    OBLICI,
    OSNOVNI_OBLICI,
    oblikCestice,
    polarnost,
    vrstaVeze,
    znakVeze,
    asimetricni,
    zastoNijeAsim,
    numeracija,
    funkcijske,
    IME_SKUPINE,
    valentni,
    naziv,
    mijenjaOd,
    pitajOd,
    tocnoOznaci,
    elektronaNacrtano,
    NAJVISE_PAROVA,
    mn,
    veza,
    parova,
  } from "$lib/lesson/katalog/kemija/molekula.js";
  import { element } from "$lib/lesson/katalog/kemija/_tablice.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const M = untrack(() => model(spec));
  const greska = M.greska ?? M.lewis?.greska ?? null;
  const aktivno = $derived(!locked && !pokazi);

  // ── pogledi: Lewisova formula i (u istraživanju) prostorni oblik, iste visine ──
  const prikazi = greska ? [] : untrack(() => (istrazi ? prikaziOd(spec, M) : []));
  const prost = greska || !istrazi ? null : untrack(() => prostorno(M, spec));
  const visina = greska ? 150 : untrack(() => Math.max(polozaji(M, "lewis", spec).hPrirodno, prost ? polozaji(M, "oblik", spec).hPrirodno : 0));
  const PL = greska ? null : untrack(() => polozaji(M, "lewis", spec, visina));
  const PO = prost ? untrack(() => polozaji(M, "oblik", spec, visina)) : null;

  let vidiParove = $state(untrack(() => (istrazi ? prikazi.includes("parovi") : vidiParoveOd(spec))));
  let vidiOblik = $state(false);
  let vidiBrojeve = $state(false);
  let vidiAsim = $state(false);

  const t = new Tween(0, { duration: 450, easing: cubicInOut });
  function prebaciOblik() {
    vidiOblik = !vidiOblik;
    const tiho = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    t.set(vidiOblik ? 1 : 0, { duration: tiho ? 0 : 450 });
  }
  const P = $derived.by(() => {
    if (!PO) return PL;
    const k = t.current;
    if (k <= 0.001) return PL;
    if (k >= 0.999) return PO;
    const p = new Map([...PL.p].map(([id, a]) => {
      const b = PO.p.get(id);
      return [id, [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]];
    }));
    return { ...(k > 0.5 ? PO : PL), p };
  });

  // ── stanje učenika ──
  const mijenjaVeze = nacin === "parovi" && untrack(() => mijenjaOd(spec)) === "oboje";
  let nev = $state(untrack(() => Object.fromEntries((M.atomi ?? []).map((a) => [a.id, 0]))));
  let redovi = $state(untrack(() => (M.veze ?? []).map((v) => (mijenjaVeze ? 1 : v.red))));
  let odabran = $state(null);
  let oznaceni = $state([]);
  let poslano = $state(null);
  let izborOblik = $state(null);
  let izborPolar = $state(null);
  const pitaj = nacin === "oblik" ? untrack(() => pitajOd(spec)) : [];

  const tocniOblik = nacin === "oblik" && !greska ? untrack(() => (pitaj.includes("oblik") ? oblikCestice(M, spec).kljuc : null)) : null;
  const tocnaPolar = nacin === "oblik" && !greska ? untrack(() => (pitaj.includes("polarnost") ? polarnost(M, spec).polarna : null)) : null;
  const ponuda = tocniOblik && !OSNOVNI_OBLICI.includes(tocniOblik) ? [...OSNOVNI_OBLICI, "trigonska_bipiramidalna", "oktaedarska"] : OSNOVNI_OBLICI;

  $effect(() => {
    if (!pokazi || greska) return;
    untrack(() => {
      odabran = null;
      if (nacin === "parovi") {
        nev = tocniParovi(M);
        redovi = M.veze.map((v) => v.red);
      }
      if (nacin === "oznaci") oznaceni = [...(tocnoOznaci(M, spec).skupovi?.[0] ?? [])];
      if (nacin === "oblik") {
        izborOblik = tocniOblik;
        izborPolar = tocnaPolar;
      }
    });
  });

  // ── što se crta ──
  const brojeviAutora = greska ? null : Object.fromEntries(M.atomi.filter((a) => a.broj != null).map((a) => [a.id, a.broj]));
  const brojeviLanca = greska || !prikazi.includes("numeracija") ? null : numeracija(M);
  const asimAtomi = greska ? new Set() : new Set(prikazi.includes("asimetricni") ? asimetricni(M).map((x) => M.cv[x.i].atom) : []);
  const crtez = $derived(
    greska
      ? null
      : primitivi(M, P, {
          nevezni: nacin === "parovi" ? nev : tocniParovi(M),
          redovi: nacin === "parovi" ? redovi : null,
          vidiParove,
          brojevi: vidiBrojeve && brojeviLanca ? brojeviLanca : Object.keys(brojeviAutora ?? {}).length ? brojeviAutora : null,
        }),
  );
  const istaknuti = new Set([...(untrack(() => spec.istakni) ?? []).map(String), ...(greska ? [] : M.atomi.filter((a) => a.istaknut).map((a) => a.id))]);
  const interaktivno = istrazi || nacin === "parovi" || nacin === "oznaci";
  const pct = (v, u) => `${(v / u) * 100}%`;

  // ── dodir atoma ──
  function dodir(id) {
    if (istrazi) odabran = odabran === id ? null : id;
    else if (nacin === "parovi") {
      if (aktivno) odabran = odabran === id ? null : id;
    } else if (nacin === "oznaci" && aktivno) oznaceni = oznaceni.includes(id) ? oznaceni.filter((x) => x !== id) : [...oznaceni, id];
  }
  const isto = (a, b) => a != null && a.length === b.length && a.every((x) => b.includes(x));
  function stanjeAtoma(id) {
    if (nacin === "oznaci") {
      const sel = oznaceni.includes(id);
      const neprom = isto(poslano, oznaceni);
      return { sel, ok: (sel && ishod?.tocno) || (pokazi && sel), bad: sel && neprom && ishod && !ishod.tocno && ishod.krivi?.includes(id) };
    }
    if (nacin === "parovi") return { sel: odabran === id, ok: !!ishod?.tocno || pokazi, bad: !!ishod && !ishod.tocno && ishod.krivi?.includes(id) && !odabran };
    return { sel: odabran === id };
  }
  function opisAtoma(a) {
    const ime = a.kostur ? "ugljik (kut kosturne formule)" : a.golo ? naziv(a.el) : `skupina ${a.simbol}`;
    if (nacin === "parovi") return `${ime}, ${parova(nev[a.id] ?? 0)}`;
    return ime;
  }

  // ── slaganje Lewisove formule ──
  const SMJER = ["desno", "dolje desno", "dolje", "dolje lijevo", "lijevo", "gore lijevo", "gore", "gore desno"];
  function smjerOd(a, b) {
    const p = crtez.atomi.find((x) => x.id === a);
    const q = crtez.atomi.find((x) => x.id === b);
    const k = Math.round(((Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI + 360) / 45) % 8;
    return SMJER[k];
  }
  const vezeOd = (id) => M.veze.filter((v) => v.a === id || v.b === id);
  function promijeniPar(id, d) {
    if (!aktivno) return;
    nev[id] = Math.max(0, Math.min(NAJVISE_PAROVA, (nev[id] ?? 0) + d));
  }
  const ukupnoE = $derived(greska || nacin !== "parovi" ? 0 : elektronaNacrtano(M, redovi, nev));
  function provjeriParove() {
    if (!aktivno) return;
    odabran = null;
    onodgovor({ nevezni: { ...nev }, veze: [...redovi] });
  }

  // ── oblik ──
  function provjeriOblik() {
    if (!aktivno) return;
    onodgovor({ oblik: izborOblik, polarna: izborPolar });
  }
  const spremnoOblik = $derived((!pitaj.includes("oblik") || izborOblik) && (!pitaj.includes("polarnost") || izborPolar != null));

  // ── označi ──
  function provjeriOznaci() {
    if (!aktivno || !oznaceni.length) return;
    poslano = [...oznaceni];
    onodgovor([...oznaceni]);
  }
  const UPUTA = {
    asimetricni_c: "Dodirni asimetrični C-atom (ako ih je više, sve), pa Provjeri.",
    slobodni_par: "Dodirni sve atome s neveznim elektronskim parom, pa Provjeri.",
    lanac: "Dodirni sve C-atome glavnog lanca, pa Provjeri.",
    c1: "Dodirni C-atom koji dobiva broj 1, pa Provjeri.",
    zadano: "Dodirni tražene atome, pa Provjeri.",
  };
  const trazi = untrack(() => spec.trazi);
  const uputa = nacin === "oznaci" ? (UPUTA[trazi] ?? `Dodirni atome: ${IME_SKUPINE[trazi] ?? ""}, pa Provjeri.`) : "";

  // ── kartica atoma (istraživanje) ──
  const smjera = (n) => (n <= 4 ? `${["", "jedan", "dva", "tri", "četiri"][n]} smjera` : `${n} smjerova`);
  const LJUSKA = (el, e) => {
    if (el === "H") return e === 2 ? "duet (kao helij)" : "nije duet";
    if (el === "B" || el === "Al") return e === 6 ? "6: iznimka, nema oktet (elektronski manjak)" : e === 8 ? "oktet" : "";
    if (el === "Be") return "4: iznimka, nema oktet";
    return e === 8 ? "oktet" : e > 8 ? `prošireni oktet (${e})` : "";
  };
  const kartica = $derived.by(() => {
    if (!istrazi || !odabran || greska) return null;
    const a = M.poId.get(odabran);
    const i = a.spoj;
    const c = M.cv[i];
    const redak = [];
    const e = element(c.el);
    const vez = M.adj[i];
    const bs = vez.reduce((s, y) => s + y.red, 0) + c.h;
    const lp = M.lewis.lp[i];
    const lj = M.lewis.ljuska[i];
    if (a.cvorovi.length > 1) {
      const sastav = {};
      for (const n of a.cvorovi) {
        sastav[M.cv[n].el] = (sastav[M.cv[n].el] ?? 0) + 1;
        if (M.cv[n].h) sastav.H = (sastav.H ?? 0) + M.cv[n].h;
      }
      redak.push(`Skupina sažete formule: ${Object.entries(sastav).map(([el, n]) => `${n} ${naziv(el)}`).join(", ")}.`);
    } else if (c.ostatak) {
      redak.push("Ostatak molekule (npr. alkilna skupina), crta se skraćeno.");
    } else {
      if (e && valentni(c.el) != null) redak.push(`${e.skupina}. skupina → ${mn(valentni(c.el), ["valentni elektron", "valentna elektrona", "valentnih elektrona"])}.`);
      if (c.h && !a.kostur) redak.push(`Uz to ${mn(c.h, ["vodik", "vodika", "vodika"])} u oznaci ${a.simbol}.`);
      if (a.kostur) redak.push(`Kut kosturne formule: ugljik s ${mn(c.h, ["vodikom", "vodika", "vodika"])} koji se ne pišu.`);
      const pVez = vez.length + c.h;
      if (lj) {
        const vise = vez.filter((y) => y.red > 1).map((y) => (y.red === 2 ? "dvostruka" : "trostruka"));
        const opisVise = vise.length ? ` (${vise.length === 1 ? `jedna ${vise[0]}` : vise.join(" i ")})` : "";
        redak.push(`${veza(pVez).replace(/^./, (x) => x.toUpperCase())}${opisVise} ${lp ? `i ${parova(lp)}` : "bez neveznih parova"}: oko atoma ${mn(lj, ["elektron", "elektrona", "elektrona"])} (${2 * bs} u vezama + ${2 * lp} u parovima) – ${LJUSKA(c.el, lj)}.`);
      }
      const vidjene = new Set();
      for (const y of vez) {
        const d = M.cv[y.j];
        if (d.ostatak || vidjene.has(d.el)) continue;
        vidjene.add(d.el);
        const v = vrstaVeze(spec, c.el, d.el);
        if (v) redak.push(`Veza ${c.el}–${d.el}: Δ = ${v.zapis}, ${v.vrsta}.`);
      }
      if (pVez >= 2) {
        const o = oblikOko(M, i);
        if (o.kljuc) redak.push(`Oko atoma ${smjera(o.d)} (${mn(o.sigma, ["veza", "veze", "veza"])}${o.lp ? ` + ${parova(o.lp)}` : ""}): ${o.lp ? `elektronski parovi prema vrhovima ${o.d === 4 ? "tetraedra" : "trokuta"}, a atomi daju ${imeOblika(o.kljuc)} oblik` : `${imeOblika(o.kljuc)} raspored`}${kutOblika(o) ? `, kut ${kutOblika(o)}` : ""}.`);
      }
      if (c.el === "C" && pVez === 4) {
        const as = asimetricni(M).find((x) => x.i === i);
        redak.push(as ? `Asimetričan C-atom: četiri različite skupine (${as.skupine.join(", ")}).` : `Nije asimetričan: ${zastoNijeAsim(M, i).replace(/^[^ ]+ /, "")}`);
      }
    }
    for (const f of funkcijske(M)) if (a.cvorovi.some((n) => f.cvorovi.includes(n))) redak.push(`Dio skupine: ${IME_SKUPINE[f.vrsta]}.`);
    if (vidiBrojeve && brojeviLanca?.[odabran] != null) redak.push(`U glavnom lancu: C-atom ${brojeviLanca[odabran]}.`);
    const ime = a.cvorovi.length > 1 ? "skupina" : c.ostatak ? "ostatak" : naziv(c.el);
    return { simbol: a.kostur ? "C" : a.simbol, ime, redak };
  });

  // ── oblik u istraživanju ──
  const opisOblika = greska || !istrazi || !prikazi.includes("oblik") ? null : untrack(() => {
    const ob = oblikCestice(M, spec);
    if (ob.greska) return null;
    const pol = M.Q ? null : polarnost(M, spec);
    return {
      ime: imeOblika(ob.kljuc),
      kut: ob.o ? kutOblika(ob.o) : "180°",
      lp: ob.o?.lp ?? 0,
      polar: pol && !pol.greska ? pol : null,
    };
  });
</script>

{#if istrazi}
  <div class="mo-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

{#if greska}
  <p class="lx-solution">Ova se čestica ne može nacrtati.</p>
{:else}
  {#if istrazi && prikazi.length}
    <div class="mo-prekidaci" role="group" aria-label="Što se prikazuje">
      {#if prikazi.includes("parovi")}<button type="button" class="mo-chip" class:on={vidiParove} aria-pressed={vidiParove} onclick={() => (vidiParove = !vidiParove)}>Nevezni parovi</button>{/if}
      {#if prikazi.includes("oblik")}<button type="button" class="mo-chip" class:on={vidiOblik} aria-pressed={vidiOblik} onclick={prebaciOblik}>Oblik</button>{/if}
      {#if prikazi.includes("numeracija")}<button type="button" class="mo-chip" class:on={vidiBrojeve} aria-pressed={vidiBrojeve} onclick={() => (vidiBrojeve = !vidiBrojeve)}>Numeracija</button>{/if}
      {#if prikazi.includes("asimetricni")}<button type="button" class="mo-chip" class:on={vidiAsim} aria-pressed={vidiAsim} onclick={() => (vidiAsim = !vidiAsim)}>Asimetrični C</button>{/if}
    </div>
  {/if}

  <div class="mo-fig" style:aspect-ratio="{crtez.W} / {crtez.h}" role="group" aria-label={M.formula ? `Strukturna formula ${M.formula}` : "Strukturna formula"}>
    <svg viewBox="0 0 {crtez.W} {crtez.h}" aria-hidden="true">
      {#if crtez.zagrada}
        {@const z = crtez.zagrada}
        <path class="mo-ln tanko" d="M{z.x0 + 7},{z.y0} H{z.x0} V{z.y1} H{z.x0 + 7} M{z.x1 - 7},{z.y0} H{z.x1} V{z.y1} H{z.x1 - 7}" />
      {/if}
      {#each crtez.lobovi as l, k (k)}
        <ellipse class="mo-lob" cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} transform="rotate({l.kut} {l.x} {l.y})" />
        {#each l.tocke as d, n (n)}<circle class="mo-e" cx={d[0]} cy={d[1]} r="2.1" />{/each}
      {/each}
      {#each crtez.veze as v (v.k)}
        {#each v.dijelovi as d, n (n)}
          {#if d.klin}
            <polygon class="mo-klin" points={d.klin.map((p) => p.join(",")).join(" ")} />
          {:else}
            <line class="mo-ln" class:crtkano={d.cls.includes("dash")} x1={d.crta[0][0]} y1={d.crta[0][1]} x2={d.crta[1][0]} y2={d.crta[1][1]} />
          {/if}
        {/each}
      {/each}
      {#each crtez.parovi as par, k (k)}
        {#each par.tocke as d, n (n)}<circle class="mo-e" class:sel={odabran === par.id} cx={d[0]} cy={d[1]} r="2.1" />{/each}
      {/each}
      {#each crtez.brojevi as b (b.id)}
        <text class="mo-broj" x={b.x} y={b.y} text-anchor="middle" dominant-baseline="middle">{b.tekst}</text>
      {/each}
    </svg>
    {#if crtez.zagrada}
      <span class="mo-naboj" style:left={pct(crtez.zagrada.x1 + 2, crtez.W)} style:top={pct(crtez.zagrada.y0 - 2, crtez.h)}>{crtez.zagrada.naboj}</span>
    {/if}
    {#each crtez.atomi as a (a.id)}
      {@const st = stanjeAtoma(a.id)}
      {@const zv = vidiAsim && asimAtomi.has(a.id)}
      {#if interaktivno}
        <button
          type="button"
          class="mo-at"
          class:kostur={a.kostur}
          class:sel={st.sel}
          class:ok={st.ok}
          class:bad={st.bad}
          class:ist={istaknuti.has(a.id)}
          style:left={pct(a.x, crtez.W)}
          style:top={pct(a.y, crtez.h)}
          aria-label={opisAtoma(M.poId.get(a.id))}
          aria-pressed={nacin === "oznaci" ? st.sel : istrazi || nacin === "parovi" ? odabran === a.id : undefined}
          disabled={nacin !== "istrazi" && !aktivno && !st.sel && !st.ok}
          onclick={() => dodir(a.id)}
        >
          {#if a.kostur}<span class="mo-vrh" aria-hidden="true"></span>{:else}<span class="mo-lbl"><Formula f={a.simbol} />{#if zv}<span class="mo-zv">*</span>{/if}</span>{/if}
        </button>
      {:else if !a.kostur}
        <span class="mo-at" class:ist={istaknuti.has(a.id)} style:left={pct(a.x, crtez.W)} style:top={pct(a.y, crtez.h)}>
          <span class="mo-lbl"><Formula f={a.simbol} /></span>
        </span>
      {/if}
    {/each}
  </div>

  {#if istrazi}
    {#if vidiOblik && opisOblika}
      <div class="mo-oblik" aria-live="polite">
        <p><b>Oblik:</b> {opisOblika.ime}; vezni kut {opisOblika.kut}.</p>
        {#if opisOblika.lp}<p class="mo-mala">Nevezni par zauzima smjer kao veza (oblak na crtežu), ali u obliku se vide samo atomi.</p>{/if}
        {#if opisOblika.polar}<p><b>{opisOblika.polar.polarna ? "Polarna" : "Nepolarna"} molekula.</b> {opisOblika.polar.razlog}</p>{/if}
        {#if prost && [...PO.stil.values()].some((x) => x === "k" || x === "c")}<p class="mo-mala">Klin: veza prema tebi; crtkano: veza iza ravnine papira.</p>{/if}
      </div>
    {/if}
    {#if kartica}
      <div class="mo-kartica" aria-live="polite">
        <div class="mo-kartica-glava"><span class="mo-velika"><Formula f={kartica.simbol} /></span><span class="mo-ime">{kartica.ime}</span></div>
        <ul>
          {#each kartica.redak as r, k (k)}<li><Formula f={r} /></li>{/each}
        </ul>
      </div>
    {:else}
      <p class="mo-mala mo-uputa">Dodirni atom da vidiš njegove elektrone i veze.</p>
    {/if}
  {/if}

  {#if nacin === "parovi"}
    {#if odabran && aktivno}
      {@const a = M.poId.get(odabran)}
      <div class="mo-ploca">
        <div class="mo-ploca-red">
          <span class="mo-ploca-ime"><b><Formula f={a.simbol} /></b> {naziv(a.el)}: nevezni parovi</span>
          <span class="mo-step">
            <button type="button" class="mo-sbtn" aria-label="Makni nevezni par" disabled={(nev[a.id] ?? 0) <= 0} onclick={() => promijeniPar(a.id, -1)}>−</button>
            <span class="mo-k" aria-live="polite">{nev[a.id] ?? 0}</span>
            <button type="button" class="mo-sbtn" aria-label="Dodaj nevezni par" disabled={(nev[a.id] ?? 0) >= NAJVISE_PAROVA} onclick={() => promijeniPar(a.id, 1)}>+</button>
          </span>
        </div>
        {#if mijenjaVeze}
          {#each vezeOd(a.id) as v (v.k)}
            {@const drugi = M.poId.get(v.a === a.id ? v.b : v.a)}
            <div class="mo-ploca-red">
              <span class="mo-ploca-ime">veza prema <b><Formula f={drugi.simbol} /></b> <span class="mo-mala">{smjerOd(a.id, drugi.id)}</span></span>
              <span class="seg mo-seg" role="group" aria-label="Red veze prema {naziv(drugi.el)}, {smjerOd(a.id, drugi.id)}">
                {#each [1, 2, 3] as r (r)}
                  <button type="button" class="seg-item" class:active={redovi[v.k] === r} aria-pressed={redovi[v.k] === r} aria-label={["jednostruka", "dvostruka", "trostruka"][r - 1]} onclick={() => (redovi[v.k] = r)}>{znakVeze(r)}</button>
                {/each}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    {:else if aktivno}
      <p class="mo-mala mo-uputa">Dodirni atom da mu dodaš nevezne parove{mijenjaVeze ? " ili promijeniš red veze" : ""}.</p>
    {/if}
    <div class="lx-actions">
      <button type="button" class="btn btn-primary" disabled={!aktivno} onclick={provjeriParove}>Provjeri</button>
      <span class="mo-mala">Nacrtano: <b>{mn(ukupnoE, ["elektron", "elektrona", "elektrona"])}</b> (crtica i par su po 2)</span>
    </div>
  {/if}

  {#if nacin === "oblik"}
    {#if pitaj.includes("oblik")}
      <p class="mo-naslov">Oblik</p>
      <div class="lx-options mo-opcije">
        {#each ponuda as k (k)}
          {@const sel = izborOblik === k}
          <button
            type="button"
            class="lx-option"
            class:sel
            class:ok={(sel && ishod?.tocno) || (pokazi && k === tocniOblik)}
            class:bad={sel && ishod && !ishod.tocno && ishod.krivo === "oblik"}
            aria-pressed={sel}
            disabled={!aktivno}
            onclick={() => (izborOblik = k)}
          >
            <span class="lx-mark">{(sel && ishod?.tocno) || (pokazi && k === tocniOblik) ? "✓" : sel && ishod && !ishod.tocno && ishod.krivo === "oblik" ? "✕" : ""}</span>
            <span>{OBLICI[k].oblik}{#if OBLICI[k].dod}&nbsp;<span class="mo-mala">({OBLICI[k].dod})</span>{/if}</span>
          </button>
        {/each}
      </div>
    {/if}
    {#if pitaj.includes("polarnost")}
      <p class="mo-naslov">Molekula je</p>
      <div class="lx-options mo-opcije mo-dvije">
        {#each [true, false] as p (p)}
          {@const sel = izborPolar === p}
          <button
            type="button"
            class="lx-option"
            class:sel
            class:ok={(sel && ishod?.tocno) || (pokazi && p === tocnaPolar)}
            class:bad={sel && ishod && !ishod.tocno && ishod.krivo === "polarnost"}
            aria-pressed={sel}
            disabled={!aktivno}
            onclick={() => (izborPolar = p)}
          >
            <span class="lx-mark">{(sel && ishod?.tocno) || (pokazi && p === tocnaPolar) ? "✓" : sel && ishod && !ishod.tocno && ishod.krivo === "polarnost" ? "✕" : ""}</span>
            <span>{p ? "polarna" : "nepolarna"}</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="lx-actions">
      <button type="button" class="btn btn-primary" disabled={!aktivno || !spremnoOblik} onclick={provjeriOblik}>Provjeri</button>
    </div>
  {/if}

  {#if nacin === "oznaci"}
    <div class="lx-actions">
      <button type="button" class="btn btn-primary" disabled={!aktivno || !oznaceni.length} onclick={provjeriOznaci}>Provjeri</button>
      {#if oznaceni.length && aktivno}<button type="button" class="btn btn-ghost" onclick={() => (oznaceni = [])}>Poništi</button>{/if}
      {#if aktivno}<span class="mo-mala">{oznaceni.length ? `Označeno: ${oznaceni.length}` : uputa}</span>{/if}
    </div>
  {/if}

  {#if !istrazi && pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<style>
  .mo-tekst {
    margin-bottom: 10px;
  }
  .mo-mala {
    font-size: 12.5px;
    color: var(--text-faint);
    line-height: 1.45;
  }
  .mo-mala b {
    color: var(--text);
    font-weight: 600;
  }
  .mo-uputa {
    text-align: center;
    margin: 4px 0 0;
  }

  /* prekidači u istraživanju */
  .mo-prekidaci {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin: 2px 0 8px;
  }
  .mo-chip {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text-dim);
    font-size: 13.5px;
    font-weight: 500;
    touch-action: manipulation;
  }
  .mo-chip:hover {
    border-color: var(--border-strong);
    color: var(--text);
  }
  .mo-chip.on {
    border-color: var(--primary);
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, var(--bg-elev));
  }

  /* crtež: SVG ispod, oznake atoma (HTML) iznad, sve u postocima širine */
  .mo-fig {
    position: relative;
    width: 100%;
    max-width: 420px;
    margin: 4px auto 8px;
    container-type: inline-size;
    color: var(--text);
    font-family: var(--font-sans);
  }
  .mo-fig svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .mo-ln {
    stroke: var(--text);
    stroke-width: 2;
    stroke-linecap: round;
    fill: none;
  }
  .mo-ln.tanko {
    stroke-width: 1.4;
  }
  .mo-ln.crtkano {
    stroke-dasharray: 4 3.5;
  }
  .mo-klin {
    fill: var(--text);
  }
  .mo-e {
    fill: var(--text);
  }
  .mo-e.sel {
    fill: var(--lx-turn);
  }
  .mo-lob {
    fill: color-mix(in srgb, var(--primary) 13%, transparent);
    stroke: color-mix(in srgb, var(--primary) 45%, transparent);
    stroke-width: 1;
  }
  .mo-broj {
    fill: var(--text-faint);
    font: 600 12px var(--font-sans);
  }
  .mo-naboj {
    position: absolute;
    transform: translateY(-50%);
    font-size: 3.6cqw;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }
  .mo-at {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 12.2cqw; /* 44 px na crtežu od 360 px; na mobitelu od 320 px oko 39 px */
    height: 12.2cqw;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--text);
    touch-action: manipulation;
  }
  span.mo-at {
    pointer-events: none;
  }
  .mo-lbl {
    font-size: 4.6cqw;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    padding: 0.4cqw 0.5cqw;
    border-radius: 1.4cqw;
    background: color-mix(in srgb, var(--bg-elev) 82%, transparent);
  }
  .mo-zv {
    color: var(--primary);
    font-weight: 700;
    margin-left: 1px;
  }
  button.mo-at {
    cursor: pointer;
  }
  button.mo-at:hover .mo-lbl,
  button.mo-at:focus-visible .mo-lbl {
    background: var(--bg-hover);
  }
  button.mo-at:focus-visible {
    outline: 2px solid var(--lx-turn);
    outline-offset: -2px;
  }
  button.mo-at:disabled {
    cursor: default;
  }
  .mo-at.ist {
    color: var(--primary);
  }
  .mo-at.sel {
    box-shadow: inset 0 0 0 2px var(--lx-turn);
    background: color-mix(in srgb, var(--lx-turn) 10%, transparent);
  }
  .mo-at.ok.sel,
  .mo-at.ok:not(.kostur) .mo-lbl {
    color: var(--lx-ok);
  }
  .mo-at.ok.sel {
    box-shadow: inset 0 0 0 2px var(--lx-ok);
    background: color-mix(in srgb, var(--lx-ok) 10%, transparent);
  }
  .mo-at.bad {
    box-shadow: inset 0 0 0 2px var(--lx-bad);
    background: color-mix(in srgb, var(--lx-bad) 10%, transparent);
    color: var(--lx-bad);
  }
  .mo-vrh {
    width: 2cqw;
    height: 2cqw;
    border-radius: 50%;
    background: transparent;
  }
  button.mo-at:hover .mo-vrh,
  .mo-at.sel .mo-vrh,
  .mo-at.bad .mo-vrh {
    background: currentColor;
  }

  /* oblik i kartica (istraživanje) */
  .mo-oblik {
    margin: 0 0 8px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: var(--bg-elev-2);
    font-size: 14px;
    line-height: 1.5;
  }
  .mo-oblik p {
    margin: 0 0 4px;
  }
  .mo-oblik p:last-child {
    margin: 0;
  }
  .mo-kartica {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 10px 12px;
    background: var(--bg-elev);
  }
  .mo-kartica-glava {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 4px;
  }
  .mo-velika {
    font-size: 22px;
    font-weight: 700;
    font-family: var(--font-sans);
  }
  .mo-ime {
    color: var(--text-dim);
    font-size: 14px;
  }
  .mo-kartica ul {
    margin: 0;
    padding-left: 18px;
    font-size: 14px;
    line-height: 1.5;
  }
  .mo-kartica li + li {
    margin-top: 2px;
  }
  .mo-kartica :global(.kf) {
    white-space: normal;
  }

  /* slaganje Lewisove formule */
  .mo-ploca {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 6px 10px;
    background: var(--bg-elev);
  }
  .mo-ploca-red {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 44px;
    flex-wrap: wrap;
  }
  .mo-ploca-red + .mo-ploca-red {
    border-top: 1px solid var(--border);
  }
  .mo-ploca-ime {
    font-size: 14px;
    font-family: var(--font-sans);
  }
  .mo-step {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .mo-sbtn {
    width: 40px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 18px;
    line-height: 1;
    touch-action: manipulation;
  }
  .mo-sbtn:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .mo-sbtn:disabled {
    opacity: 0.35;
  }
  .mo-k {
    min-width: 1.4em;
    text-align: center;
    font-weight: 600;
    font-size: 16px;
  }
  .mo-seg :global(.seg-item) {
    min-width: 40px;
    min-height: 36px;
    font-size: 18px;
    font-family: var(--font-sans);
  }

  /* oblik: izbor */
  .mo-naslov {
    margin: 8px 0 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
  }
  .mo-dvije {
    grid-template-columns: 1fr 1fr;
  }
</style>
