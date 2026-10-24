<script>
  // redoks: oksidacijski brojevi iznad simbola (kao u udžbeniku: +6, −2, 0), u formuli ili u svim tvarima reakcije.
  // Istraživanje: dodir atoma pokaže pravilo i račun; uz reakciju boje označe element koji se oksidira i koji se
  // reducira. „Tvoj red“: polja iznad atoma (oks_broj), izbor elemenata i sredstava (uloge) ili koeficijenti
  // polureakcija i ukupne jednadžbe (polureakcije, prazno = 1). Sva kemija je u katalog/kemija/redoks.js.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { tocanOdgovor } from "../../katalog/index.js";
  import { stanjaOd, zapisJednadzbe } from "$lib/lesson/katalog/kemija/jednadzba.js";
  import {
    cestice, analiza, polureakcije, trazenaPolja, kljuc, zapisOks, naziv, imaReakciju, koefReakcije, pitanjaUloga,
    dijeloviPolu, NASLOV, oksFormule,
  } from "$lib/lesson/katalog/kemija/redoks.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const reakcija = untrack(() => imaReakciju(spec));
  const formule = untrack(() => (Array.isArray(spec.formule) ? spec.formule : null));

  let odabrana = $state(0);
  let tv = $derived(cestice(spec, odabrana));
  const A = untrack(() => (reakcija ? analiza(spec) : null));
  const P = untrack(() => (reakcija && (nacin === "polureakcije" || istrazi) ? polureakcije(spec) : null));
  const koef = untrack(() => (reakcija ? koefReakcije(spec) : null));
  const stanja = untrack(() => (reakcija ? stanjaOd(spec) : []));
  const dvosmjerna = untrack(() => spec.strelica === "⇌");
  const iznad = untrack(() => spec.iznad ?? "");

  let aktivno = $derived(!locked && !pokazi);

  // ── boje: atom elementa koji se oksidira (reducira), na broju koji se mijenja ──
  function promjena(c, t) {
    if (!A || !A.redoks || c.elektron || !c.strana) return { oks: false, red: false };
    const el = t.el;
    const L = [...(A.L[el] ?? [])];
    const D = [...(A.D[el] ?? [])];
    const v = t.v;
    const oks = A.oksidira.includes(el) && (c.strana === "L" ? D.some((w) => w > v) : v > Math.min(...L));
    const red = A.reducira.includes(el) && (c.strana === "L" ? D.some((w) => w < v) : v < Math.max(...L));
    return { oks, red };
  }

  // ── istraživanje: odabrani atom ──
  let odabran = $state(null); // {i, k}
  let opisOdabranog = $derived.by(() => {
    if (!odabran) return null;
    const c = tv[odabran.i];
    const t = c?.oks?.T?.[odabran.k];
    if (!t) return null;
    return { c, t };
  });
  function prebaci(i) {
    odabrana = i;
    odabran = null;
  }

  // ── oks_broj: polja ──
  const polja = untrack(() => (nacin === "oks_broj" ? trazenaPolja(spec) : []));
  const trazeno = new Set(polja.map((p) => kljuc(p.i, p.k)));
  let unosOks = $state(Object.fromEntries(polja.map((p) => [kljuc(p.i, p.k), ""])));
  let potpunOks = $derived(polja.every((p) => String(unosOks[kljuc(p.i, p.k)] ?? "").trim() !== ""));

  // ── uloge ──
  const pitaj = untrack(() => (nacin === "uloge" ? pitanjaUloga(spec) : []));
  let izbor = $state({ oksidira: [], reducira: [], oksidacijsko: [], redukcijsko: [] });
  const PITANJE = { oksidira: "Oksidira se", reducira: "Reducira se", oksidacijsko: "Oksidacijsko sredstvo", redukcijsko: "Redukcijsko sredstvo" };
  function prebaciIzbor(q, v) {
    if (!aktivno) return;
    const x = izbor[q];
    izbor[q] = x.includes(v) ? x.filter((y) => y !== v) : [...x, v];
  }
  let potpunUloge = $derived(pitaj.every((q) => izbor[q].length > 0));
  const reaktanti = untrack(() => (A?.t ?? []).filter((c) => c.strana === "L" && !c.elektron));

  // ── polureakcije ──
  const dijelovi = untrack(() => (nacin === "polureakcije" ? dijeloviPolu(spec) : []));
  const redovi = untrack(() => {
    if (!P || P.greska) return [];
    const out = [];
    for (const d of ["oksidacija", "redukcija", "ukupno"]) {
      const lista = d === "ukupno" ? cestice(spec) : P[d].t.map((c) => ({ ...c, oks: c.elektron ? null : oksFormule(c.formula) }));
      const tocni = d === "ukupno" ? P.koef : P[d].koef;
      out.push({ d, lista, tocni, trazi: dijelovi.includes(d) });
    }
    return out;
  });
  let unosKoef = $state(Object.fromEntries(["oksidacija", "redukcija", "ukupno"].map((d) => [d, (redovi.find((r) => r.d === d)?.lista ?? []).map(() => "")])));
  let potpunPolu = $derived(true);

  // ── Pokaži odgovor ──
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "oks_broj") for (const p of polja) unosOks[kljuc(p.i, p.k)] = zapisOks(p.v);
      if (nacin === "uloge") izbor = { oksidira: [...A.oksidira], reducira: [...A.reducira], oksidacijsko: [...A.oksidacijsko], redukcijsko: [...A.redukcijsko] };
      if (nacin === "polureakcije") for (const r of redovi) if (r.trazi) unosKoef[r.d] = r.tocni.map((k) => (k === 1 ? "" : String(k)));
    });
  });

  function provjeri() {
    if (!aktivno) return;
    if (nacin === "oks_broj" && potpunOks) onodgovor({ oks: { ...unosOks } });
    if (nacin === "uloge" && potpunUloge) onodgovor({ oksidira: [...izbor.oksidira], reducira: [...izbor.reducira], oksidacijsko: [...izbor.oksidacijsko], redukcijsko: [...izbor.redukcijsko] });
    if (nacin === "polureakcije") onodgovor(Object.fromEntries(dijelovi.map((d) => [d, [...unosKoef[d]]])));
  }
  let complete = $derived(nacin === "oks_broj" ? potpunOks : nacin === "uloge" ? potpunUloge : potpunPolu);

  // brojevi iznad atoma u ulogama i polureakcijama: po želji autora, ili nakon provjere / „Pokaži odgovor“
  let vidiOks = $derived(istrazi || nacin === "oks_broj" || spec.prikazi_oks === true || !!ishod?.tocno || pokazi);
  const krivo = (k) => !!ishod && !ishod.tocno && (ishod.krivi ?? []).includes(k);
  const W = Math.max(44, Math.round([...iznad].length * 7.4 + 18));
</script>

{#snippet strelica(dvo = false, tekst = "")}
  {@const w = tekst ? W : 44}
  <span class="rd-str" aria-label={dvo ? "ravnoteža" : "daje"}>
    {#if tekst}<span class="rd-iznad"><Formula f={tekst} /></span>{/if}
    <svg width={w} height="14" viewBox="0 0 {w} 14" aria-hidden="true">
      {#if dvo}
        <path d="M2,5 H{w - 2} l-6,-4" />
        <path d="M{w - 2},9 H2 l6,4" />
      {:else}
        <path d="M2,7 H{w - 3}" />
        <path class="vrh" d="M{w - 1},7 l-8,-4.5 v9 z" />
      {/if}
    </svg>
  </span>
{/snippet}

<!-- jedna tvar: brojevi iznad simbola (ili polja), indeksi i naboj kroz Formula -->
{#snippet tvar(c, gore)}
  {#if c.elektron}
    <span class="rd-f"><span class="rd-at"><span class="rd-ox" class:prazno={!gore}></span><span class="rd-sim"><Formula f="e⁻" /></span></span></span>
  {:else}
    <span class="rd-f">
      {#each c.oks.T as t, k (k)}
        {#if t.t === "el"}
          {@const pr = promjena(c, t)}
          {@const kl = kljuc(c.i, k)}
          {#if istrazi}
            <button
              type="button"
              class="rd-at rd-dodir"
              class:oks={pr.oks}
              class:red={pr.red}
              class:sel={odabran?.i === c.i && odabran?.k === k}
              aria-pressed={odabran?.i === c.i && odabran?.k === k}
              aria-label="{naziv(t.el)} u {c.formula}: {zapisOks(t.v)}"
              onclick={() => (odabran = { i: c.i, k })}
            >
              <span class="rd-ox">{zapisOks(t.v)}</span>
              <span class="rd-sim"><Formula f={t.tekst} /></span>
            </button>
          {:else}
            <span class="rd-at" class:oks={vidiOks && pr.oks} class:red={vidiOks && pr.red}>
              {#if gore && trazeno.has(kl)}
                <input
                  class="inp rd-inp"
                  class:ok={ishod?.tocno}
                  class:bad={krivo(kl)}
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  placeholder="?"
                  aria-label="Oksidacijski broj: {naziv(t.el)} u {c.formula}"
                  disabled={!aktivno}
                  bind:value={unosOks[kl]}
                  onkeydown={(e) => e.key === "Enter" && provjeri()}
                />
              {:else}
                <span class="rd-ox" class:prazno={!gore}>{gore && vidiOks && nacin !== "oks_broj" ? zapisOks(t.v) : ""}</span>
              {/if}
              <span class="rd-sim"><Formula f={t.tekst} /></span>
            </span>
          {/if}
        {:else}
          <span class="rd-tx"><Formula f={t.tekst} /></span>
        {/if}
      {/each}
    </span>
  {/if}
{/snippet}

<!-- jednadžba: lista tvari (strana L/D); predKoef(c, j) crta koeficijent ili polje ispred tvari -->
{#snippet jednadzbaRed(lista, predKoef, st, gore, dvo, tekstStr)}
  {@const L = lista.map((c, j) => ({ c, j })).filter((x) => x.c.strana === "L")}
  {@const D = lista.map((c, j) => ({ c, j })).filter((x) => x.c.strana === "D")}
  <div class="rd-eq" class:gore>
    <div class="rd-strana">
      {#each L as x, n (x.j)}
        <span class="rd-par">{#if n}<span class="rd-plus">+</span>{/if}<span class="rd-clan">{@render predKoef(x.c, x.j)}{@render tvar(x.c, gore)}{#if st?.[x.j]}<span class="rd-st">({st[x.j]})</span>{/if}</span></span>
      {/each}
    </div>
    <div class="rd-strana">
      <span class="rd-par">
        {@render strelica(dvo, tekstStr)}
        {#if D.length}<span class="rd-clan">{@render predKoef(D[0].c, D[0].j)}{@render tvar(D[0].c, gore)}{#if st?.[D[0].j]}<span class="rd-st">({st[D[0].j]})</span>{/if}</span>{/if}
      </span>
      {#each D.slice(1) as x (x.j)}
        <span class="rd-par"><span class="rd-plus">+</span><span class="rd-clan">{@render predKoef(x.c, x.j)}{@render tvar(x.c, gore)}{#if st?.[x.j]}<span class="rd-st">({st[x.j]})</span>{/if}</span></span>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet koefTekst(c)}
  {#if koef?.[c.i] > 1}<span class="rd-k">{koef[c.i]}</span>{/if}
{/snippet}

{#if istrazi}
  <div class="rd-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

{#if formule && formule.length > 1}
  <div class="rd-chips" role="group" aria-label="Formula">
    {#each formule as f, i (f)}
      <button type="button" class="rd-chip" class:on={odabrana === i} aria-pressed={odabrana === i} onclick={() => prebaci(i)}><Formula {f} /></button>
    {/each}
  </div>
{/if}

<!-- formula ili reakcija s brojevima -->
{#if nacin !== "polureakcije"}
  {#if reakcija}
    {@render jednadzbaRed(tv, koefTekst, stanja, vidiOks, dvosmjerna, iznad)}
  {:else}
    <div class="rd-eq rd-jedna gore">{@render tvar(tv[0], true)}</div>
  {/if}
{/if}

{#if nacin === "oks_broj" && !locked}
  <p class="lx-hint rd-napomena">Upiši broj s predznakom: +6, −2 ili 0.</p>
{/if}

<!-- istraživanje: pravilo za odabrani atom, promjene u reakciji -->
{#if istrazi}
  <div class="rd-info" role="status" aria-live="polite">
    {#if opisOdabranog}
      <p class="rd-info-naslov">
        <span class="rd-info-el">{naziv(opisOdabranog.t.el)}</span> u <Formula f={opisOdabranog.c.formula} />: <b class="rd-nowrap">{zapisOks(opisOdabranog.t.v)}</b>
      </p>
      <p class="rd-info-tekst">{opisOdabranog.t.razlog}</p>
    {:else}
      <p class="rd-info-tekst rd-dim">Dodirni atom da vidiš kojim je pravilom dobiven njegov oksidacijski broj.</p>
    {/if}
  </div>
  {#if A?.redoks}
    <ul class="rd-promjene">
      {#each A.detalji as d (d.el + d.vrsta)}
        <li class:oks={d.vrsta === "oksidacija"} class:red={d.vrsta === "redukcija"}>
          <span class="rd-oznaka" aria-hidden="true"></span>
          <span><b>{naziv(d.el)}</b> <span class="rd-nowrap">{zapisOks(d.od)} → {zapisOks(d.do)}</span>: {d.vrsta}, {d.vrsta === "oksidacija" ? "otpušta" : "prima"} <span class="rd-nowrap">{d.e} <Formula f="e⁻" /></span> po atomu</span>
        </li>
      {/each}
    </ul>
    <p class="rd-sredstva">
      Oksidacijsko sredstvo: {#each A.oksidacijsko as i, n (i)}{#if n}, {/if}<Formula f={A.t[i].formula} />{/each}.
      Redukcijsko sredstvo: {#each A.redukcijsko as i, n (i)}{#if n}, {/if}<Formula f={A.t[i].formula} />{/each}.
    </p>
    {#if P && !P.greska}
      <div class="rd-polu-pregled">
        <p><span class="rd-lbl">oksidacija</span> <Md text={zapisJednadzbe({ reaktanti: P.oksidacija.reaktanti, produkti: P.oksidacija.produkti }, P.oksidacija.koef)} inline />{#if P.puta.oksidacija > 1} <span class="rd-puta">/ ·{P.puta.oksidacija}</span>{/if}</p>
        <p><span class="rd-lbl">redukcija</span> <Md text={zapisJednadzbe({ reaktanti: P.redukcija.reaktanti, produkti: P.redukcija.produkti }, P.redukcija.koef)} inline />{#if P.puta.redukcija > 1} <span class="rd-puta">/ ·{P.puta.redukcija}</span>{/if}</p>
      </div>
    {/if}
  {/if}
{/if}

<!-- uloge -->
{#if nacin === "uloge"}
  <div class="rd-uloge">
    {#each pitaj as q (q)}
      {@const bad = !!ishod && !ishod.tocno && (ishod.uloge ?? []).includes(q)}
      <div class="rd-pitanje">
        <span class="rd-pitanje-n">{PITANJE[q]}:</span>
        <span class="rd-chips rd-chips-mali" class:bad role="group" aria-label={PITANJE[q]}>
          {#if q === "oksidira" || q === "reducira"}
            {#each A.elementi as el (el)}
              <button type="button" class="rd-chip" class:on={izbor[q].includes(el)} aria-pressed={izbor[q].includes(el)} disabled={!aktivno} onclick={() => prebaciIzbor(q, el)}>{el} <span class="rd-chip-n">{naziv(el)}</span></button>
            {/each}
          {:else}
            {#each reaktanti as c (c.i)}
              <button type="button" class="rd-chip" class:on={izbor[q].includes(c.i)} aria-pressed={izbor[q].includes(c.i)} disabled={!aktivno} onclick={() => prebaciIzbor(q, c.i)}><Formula f={c.formula} /></button>
            {/each}
          {/if}
        </span>
      </div>
    {/each}
  </div>
{/if}

<!-- polureakcije -->
{#if nacin === "polureakcije"}
  {#each redovi as r (r.d)}
    {@const bad = !!ishod && !ishod.tocno && ishod.dio === r.d && ishod.koefKrivo}
    <div class="rd-polu" class:ukupno={r.d === "ukupno"}>
      <div class="rd-polu-n">{NASLOV[r.d]}{#if !r.trazi}<span class="rd-dim"> (zadano)</span>{/if}</div>
      {#snippet unos(c, j)}
        {#if r.trazi}
          <input
            class="inp rd-kinp"
            class:ok={ishod?.tocno}
            class:bad
            inputmode="numeric"
            autocomplete="off"
            placeholder="1"
            aria-label="{NASLOV[r.d]}: koeficijent ispred {c.formula}"
            disabled={!aktivno}
            bind:value={unosKoef[r.d][j]}
            onkeydown={(e) => e.key === "Enter" && provjeri()}
          />
        {:else if r.tocni[j] > 1}<span class="rd-k">{r.tocni[j]}</span>{/if}
      {/snippet}
      {@render jednadzbaRed(r.lista, unos, r.d === "ukupno" ? stanja : null, vidiOks, r.d === "ukupno" && dvosmjerna, r.d === "ukupno" ? iznad : "")}
    </div>
  {/each}
  {#if !locked}<p class="lx-hint rd-napomena">Prazno polje znači 1.</p>{/if}
{/if}

{#if !istrazi}
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={!aktivno || !complete} onclick={provjeri}>Provjeri</button>
  </div>
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<style>
  .rd-tekst {
    margin-bottom: 12px;
  }
  .rd-eq {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: center;
    gap: 10px;
    margin: 6px 0 10px;
    font-family: var(--font-sans);
    font-size: 20px;
    line-height: 1.2;
    color: var(--text);
  }
  .rd-jedna {
    font-size: 24px;
  }
  .rd-strana {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
  }
  /* „+“ i strelica idu u isti red s pojmom iza sebe, da na mobitelu ne ostanu sami na kraju retka */
  .rd-par {
    display: inline-flex;
    align-items: flex-end;
    gap: 8px;
    white-space: nowrap;
  }
  .rd-clan {
    display: inline-flex;
    align-items: flex-end;
    gap: 4px;
    white-space: nowrap;
  }
  .rd-plus,
  .rd-k,
  .rd-st,
  .rd-str {
    padding-bottom: 2px;
  }
  .rd-plus {
    color: var(--text-dim);
  }
  .rd-k {
    font-weight: 500;
  }
  .rd-st {
    font-size: 0.8em;
    color: var(--text-dim);
  }
  .rd-f {
    display: inline-flex;
    align-items: flex-end;
    font-weight: 500;
  }
  .rd-tx {
    padding-bottom: 2px;
  }
  /* atom: broj gore, simbol dolje */
  .rd-at {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0 1px 2px;
    border-radius: var(--r-md);
    color: var(--text);
  }
  .rd-ox {
    min-height: 1.15em;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.15;
    color: var(--text-dim);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .rd-ox.prazno {
    display: none;
  }
  .rd-eq:not(.gore) .rd-ox {
    display: none;
  }
  .rd-at.oks .rd-ox,
  .rd-at.oks .rd-sim {
    color: var(--primary);
  }
  .rd-at.red .rd-ox,
  .rd-at.red .rd-sim {
    color: var(--warn);
  }
  .rd-at.oks.red .rd-sim {
    text-decoration: underline 2px var(--warn);
    text-underline-offset: 3px;
  }
  .rd-dodir {
    min-width: 36px;
    min-height: 44px;
    justify-content: flex-end;
    border: 1px solid transparent;
    background: none;
    font: inherit;
    cursor: pointer;
    touch-action: manipulation;
  }
  .rd-dodir:hover {
    background: var(--bg-hover);
  }
  .rd-dodir.sel {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .rd-inp {
    width: 46px;
    height: 36px;
    padding: 0 2px;
    text-align: center;
    font-family: var(--font-sans);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
    font-weight: 500;
  }
  .rd-inp::placeholder,
  .rd-kinp::placeholder {
    color: var(--text-faint);
    opacity: 0.7;
  }
  .rd-kinp {
    width: 2.4em;
    height: var(--lx-control);
    padding: 0 4px;
    text-align: center;
    font-family: var(--font-sans);
    font-size: 16px;
  }
  .rd-str {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .rd-str svg {
    display: block;
    overflow: visible;
  }
  .rd-str path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .rd-str path.vrh {
    fill: currentColor;
    stroke: none;
  }
  .rd-iznad {
    font-size: 12px;
    line-height: 1;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .rd-napomena {
    text-align: center;
    margin-top: 0;
  }
  .rd-nowrap {
    white-space: nowrap;
  }
  .rd-dim {
    color: var(--text-faint);
  }

  /* izbor formule i uloge */
  .rd-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;
    border-radius: var(--r-md);
  }
  .rd-chips.bad {
    outline: 2px solid var(--lx-bad);
    outline-offset: 2px;
  }
  .rd-chips-mali {
    justify-content: flex-start;
    margin: 4px 0 0;
  }
  .rd-chip {
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
    font-size: 15px;
    line-height: 1.2;
    touch-action: manipulation;
  }
  .rd-chip:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .rd-chip.on {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .rd-chip:disabled {
    cursor: default;
  }
  .rd-chip-n {
    color: var(--text-dim);
    font-size: 0.85em;
  }
  .rd-uloge {
    display: grid;
    gap: 10px;
    max-width: 520px;
    margin: 4px auto 0;
  }
  .rd-pitanje-n {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-dim);
  }

  /* istraživanje */
  .rd-info {
    max-width: 520px;
    margin: 4px auto 10px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: var(--bg-elev);
    border: 1px solid var(--border);
    font-size: 14px;
    line-height: 1.5;
  }
  .rd-info p {
    margin: 0;
  }
  .rd-info-naslov {
    font-size: 15px;
    margin-bottom: 4px !important;
  }
  .rd-info-el {
    text-transform: capitalize;
    font-weight: 600;
  }
  .rd-promjene {
    list-style: none;
    margin: 0 auto 8px;
    padding: 0;
    max-width: 520px;
    display: grid;
    gap: 4px;
    font-size: 14px;
    line-height: 1.45;
  }
  .rd-promjene li {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .rd-oznaka {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transform: translateY(1px);
  }
  .rd-promjene li.oks .rd-oznaka {
    background: var(--primary);
  }
  .rd-promjene li.red .rd-oznaka {
    background: var(--warn);
  }
  .rd-sredstva {
    max-width: 520px;
    margin: 0 auto 8px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .rd-polu-pregled {
    max-width: 520px;
    margin: 0 auto;
    display: grid;
    gap: 4px;
    font-size: 14px;
  }
  .rd-polu-pregled p {
    margin: 0;
  }
  .rd-lbl {
    display: inline-block;
    min-width: 6.2em;
    color: var(--text-faint);
    font-size: 13px;
  }
  .rd-puta {
    color: var(--text-dim);
    white-space: nowrap;
  }

  /* polureakcije */
  .rd-polu {
    margin: 0 0 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }
  .rd-polu:first-of-type {
    border-top: 0;
  }
  .rd-polu-n {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
  }
  .rd-polu .rd-eq {
    font-size: 18px;
    margin: 4px 0 6px;
  }

  @media (max-width: 420px) {
    .rd-eq {
      font-size: 18px;
      gap: 8px;
    }
    .rd-jedna {
      font-size: 22px;
    }
    .rd-polu .rd-eq {
      font-size: 17px;
    }
    .rd-strana,
    .rd-par {
      gap: 6px;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .rd-dodir,
    .rd-chip {
      transition: background-color 0.12s, border-color 0.12s;
    }
  }
</style>
