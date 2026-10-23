<script>
  // ph_skala: vodoravna pH-skala s bojama univerzalnog indikatora (boja je kemijski podatak, pa je fiksna), ispod nje
  // kartice c(H₃O⁺), c(OH⁻), pH i pOH, epruvete s indikatorima i, ovisno o načinu, unos koraka, izbor boja ili
  // poredak otopina. Sve vrijednosti, točne i krive, računa katalog/kemija/ph_skala.js; ovdje se samo prikazuje.
  // U „Tvoj red“ skala nema oznake pH dok učenik ne riješi zadatak (inače bi odala odgovor).
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { seededShuffle } from "../../core/shuffle.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";
  import {
    ph_skala,
    stanje,
    lanac,
    traziPopis,
    otopinaOf,
    poredajPodaci,
    tocanPoredak,
    INDIKATORI,
    INDIKATORI_RED,
    UNIVERZALNI_SKALA,
    bojaNaPH,
    bojeZa,
    bojaPoId,
    kiselostOf,
    KISELOST,
    KISELOST_NAZIV,
    OZNAKA,
    IME,
    JEDINICA,
    CETIRI,
    zapisPH,
    zapisC,
    pKwOf,
    KW_25,
    KW_ZAPIS,
  } from "$lib/lesson/katalog/kemija/ph_skala.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const istrazi = nacin === "istrazi";
  const racun = nacin === "izracunaj";
  const indikator = nacin === "indikator";
  const poredaj = nacin === "poredaj";
  const uid = Math.random().toString(36).slice(2, 8);

  const st = poredaj ? null : stanje(s);
  const Kw = st?.Kw ?? (typeof s.Kw === "number" ? s.Kw : KW_25);
  const pKw = pKwOf(Kw);
  const nije25 = Math.abs(Kw - KW_25) > 1e-18;
  const pKwTekst = nije25 ? formatNumber(Math.round(pKw * 100) / 100) : "14";
  const JE_P = (q) => q === "pH" || q === "pOH";
  const K_INDEKS = { Ka: "a", Kb: "b", Kw: "w" };

  // ── zadani podaci (kako ih piše tekst zadatka) ──
  const zapisZadanog = (q, v, zapis) => zapis ?? (JE_P(q) ? formatNumber(v) : formatSci(v));
  const zad = s.zadano && CETIRI.includes(s.zadano.velicina) ? s.zadano : null;
  const ot = s.otopina ? otopinaOf(s.otopina) : null;
  const izmjereno = !!(zad && ot);
  const p = s.pufer ?? null;
  const tempChip = s.t != null || nije25 ? `${s.t != null ? `t = ${formatNumber(s.t)} °C` : ""}${s.t != null && s.Kw != null ? ", " : ""}${s.Kw != null ? `Kw = ${zapisC(s.Kw, 2)} mol² dm⁻⁶` : ""}` : "";
  const otChipK = ot && !ot.greska ? (ot.alfa != null ? `α = ${s.otopina.zapis_K ?? formatNumber(ot.alfa)}` : ot.Kzadan != null ? `${ot.Kime} = ${s.otopina.zapis_K ?? formatSci(ot.Kzadan)} mol/dm³` : "") : "";

  // ── skala ──
  const DO = 14;
  const pct = (x) => (Math.max(0, Math.min(DO, x)) / DO) * 100;
  const gradijent = `linear-gradient(to right, ${UNIVERZALNI_SKALA.map((c, i) => `${c} ${((i / DO) * 100).toFixed(2)}%`).join(", ")})`;
  let sirinaSkale = $state(320);
  const brojevi = $derived(sirinaSkale >= 250 ? [...Array(DO + 1).keys()] : [0, 2, 4, 7, 10, 12, 14]);
  const neutralno = pKw / 2;
  // oznake iznad skale (više redova kad se preklapaju): [{pH, tekst, formula?}]
  function redovi(oznake) {
    const zadnji = [];
    return [...oznake]
      .sort((a, b) => a.pH - b.pH)
      .map((o) => {
        const w = ([...String(o.tekst)].length * 7.2 + 14) / Math.max(1, sirinaSkale);
        const x = pct(o.pH) / 100;
        let r = zadnji.findIndex((kraj) => x - w / 2 > kraj + 0.01);
        if (r < 0) r = zadnji.length;
        zadnji[r] = x + w / 2;
        return { ...o, red: r };
      });
  }

  // ── indikatori (epruvete) ──
  const prikazInd = s.indikatori ?? INDIKATORI_RED;
  const nazivBoje = (ind, ph) => bojaPoId(ind, bojeZa(ind, ph)[0])?.naziv ?? "";

  // ── istraživanje ──
  const klizac = s.klizac ?? "pH";
  let ph = $state(zad ? (st.pH ?? 7) : neutralno);
  const zaokruzi = (x) => Math.round(x * 100) / 100;
  const vrijednosti = $derived({ c_H3O: 10 ** -ph, pH: ph, pOH: pKw - ph, c_OH: Kw / 10 ** -ph });
  const kis = $derived(kiselostOf(ph, Kw));
  const KIS_TEKST = { kisela: "kiselo", neutralna: "neutralno", luzhnata: "lužnato" };
  const usporedba = $derived(kis === "kisela" ? ">" : kis === "luzhnata" ? "<" : "=");
  const kliz = $derived.by(() => {
    if (klizac === "pH") return { min: 0, max: pKw, v: ph };
    if (klizac === "pOH") return { min: 0, max: pKw, v: pKw - ph };
    if (klizac === "c_H3O") return { min: -pKw, max: 0, v: -ph };
    return { min: -pKw, max: 0, v: ph - pKw };
  });
  function pomakni(e) {
    const v = Number(e.currentTarget.value);
    ph = zaokruzi(klizac === "pH" ? v : klizac === "pOH" ? pKw - v : klizac === "c_H3O" ? -v : v + pKw);
  }
  const zapisUzivo = (q, v) => (JE_P(q) ? zapisPH(v) : zapisC(v));

  // ── izračun ──
  const trazi = racun ? traziPopis(s) : [];
  const koraci = racun ? lanac(s).koraci : [];
  const operacije = s.operacije === true;
  let unosi = $state(trazi.map(() => ""));
  let kiselost = $state("");
  const potpunRacun = $derived(unosi.every((v) => String(v).trim()) && (!s.kiselost || kiselost));
  const okKorak = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina != null && ishod.praznina > i) || (ishod?.kiselostKrivo && !ishod.prazno && i < trazi.length);
  const badKorak = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  function potencija(i) {
    const v = String(unosi[i]).trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^-`;
    document.getElementById(`ps-${uid}-${i}`)?.focus();
  }
  let sirina = $state(0);
  const vodoravno = $derived(sirina >= 190 * (1 + trazi.length));

  // ── indikator ──
  const pitaj = indikator ? (s.indikatori ?? []) : [];
  let izbor = $state(Object.fromEntries(pitaj.map((i) => [i, ""])));
  const potpunInd = $derived(pitaj.every((i) => izbor[i]) && (!s.kiselost || kiselost));
  const badInd = (ind) => ishod != null && !ishod.tocno && ishod.indikatoriKrivo?.includes(ind);

  // ── poredaj ──
  const pod = poredaj ? poredajPodaci(s) : [];
  const tocan = poredaj ? tocanPoredak(s) : [];
  const pocetni = untrack(() => {
    if (!poredaj) return [];
    let r = seededShuffle(pod.map((x) => x.i), JSON.stringify(s.otopine));
    if (r.every((x, i) => x === tocan[i])) r = [...r.slice(1), r[0]];
    return r;
  });
  let red = $state(pocetni);
  const prikazRed = $derived(pokazi ? tocan : red);
  const istaC = poredaj && pod.every((x) => x.ot.c === pod[0].ot.c && s.otopine[x.i].zapis === s.otopine[0].zapis) && pod[0].ot.c != null;
  const zapisCOtopine = (o) => (o.zapis ?? formatNumber(o.c));
  function pomak(pos, d) {
    const to = pos + d;
    if (locked || to < 0 || to >= red.length) return;
    [red[pos], red[to]] = [red[to], red[pos]];
  }
  const badPor = (i) => ishod != null && !ishod.tocno && ishod.krivo?.includes(i);

  // „Pokaži odgovor“: izbor se popuni točnim bojama i kiselošću
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (indikator) for (const ind of pitaj) izbor[ind] = bojeZa(ind, st.pH)[0];
      if (s.kiselost) kiselost = st.kiselost;
    });
  });

  const rijeseno = $derived(!!ishod?.tocno || pokazi);
  const tocanTekst = $derived(pokazi ? ph_skala.tocanOdgovor(s) : "");
  const aktivno = $derived(!locked && !pokazi);

  function predaj(e) {
    e?.preventDefault();
    if (!aktivno) return;
    if (racun && potpunRacun) onodgovor({ koraci: $state.snapshot(unosi), kiselost: kiselost || undefined });
    if (indikator && potpunInd) onodgovor({ boje: $state.snapshot(izbor), kiselost: kiselost || undefined });
    if (poredaj) onodgovor($state.snapshot(red));
  }

  // „pH = −log c(H₃O⁺)“ za strelice: Kw, Ka, Kb s indeksom (tekst dolazi iz koda)
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SUBF = "₀₁₂₃₄₅₆₇₈₉";
  const SUPF = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "−" };
  const formulaHtml = (t) =>
    esc(t)
      .replace(/K([wab])\b/g, "K<sub>$1</sub>")
      .replace(/[₀-₉]+/g, (m) => `<sub>${[...m].map((c) => SUBF.indexOf(c)).join("")}</sub>`)
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (m) => `<sup>${[...m].map((c) => SUPF[c]).join("")}</sup>`);
</script>

{#snippet oznaka(q)}{#if K_INDEKS[q]}<span class="ps-k">K<sub>{K_INDEKS[q]}</sub></span>{:else}<Formula f={OZNAKA[q]} />{/if}{/snippet}

{#snippet tekstK(t)}{@html formulaHtml(t)}{/snippet}

{#snippet skala(oznake)}
  {@const r = redovi(oznake)}
  {@const nRed = r.length ? Math.max(...r.map((o) => o.red)) + 1 : 0}
  <div class="ps-skala" bind:clientWidth={sirinaSkale}>
    {#if nRed}
      <div class="ps-pinovi" style="height: {nRed * 24}px" aria-hidden="true">
        {#each r as o, k (k)}
          <span class="ps-pin" style="left: {pct(o.pH)}%; bottom: {(nRed - 1 - o.red) * 24}px">
            {#if o.formula}<Formula f={o.tekst} />{:else}{o.tekst}{/if}
          </span>
        {/each}
      </div>
    {/if}
    <div class="ps-traka" style="background: {gradijent}">
      {#each r as o, k (k)}<span class="ps-crta" style="left: {pct(o.pH)}%"></span>{/each}
      <span class="ps-neutral" style="left: {pct(neutralno)}%"></span>
    </div>
    <div class="ps-brojevi" aria-hidden="true">
      {#each brojevi as n (n)}<span style="left: {pct(n)}%">{n}</span>{/each}
    </div>
    <div class="ps-podrucja" aria-hidden="true">
      <span style="left: {pct(neutralno / 2)}%">kiselo</span>
      <span class="sred" style="left: {pct(neutralno)}%">neutralno</span>
      <span style="left: {pct((neutralno + DO) / 2)}%">lužnato</span>
    </div>
  </div>
{/snippet}

{#snippet epruveta(ind, boja, naslov, podnaslov)}
  <figure class="ps-ind">
    {#if ind === "univerzalni"}
      <span class="ps-papir" style="background: {boja ?? 'transparent'}" class:prazno={!boja}></span>
    {:else}
      <svg class="ps-epr" viewBox="0 0 36 86" width="36" height="86" aria-hidden="true">
        <defs><clipPath id="ps-{uid}-{ind}"><path d="M8 3 V66 a10 10 0 0 0 20 0 V3 Z" /></clipPath></defs>
        <g clip-path="url(#ps-{uid}-{ind})">
          <rect class="ps-voda" x="0" y="30" width="36" height="60" />
          {#if boja}<rect x="0" y="30" width="36" height="60" style="fill: {boja}" />{/if}
        </g>
        <path class="ps-staklo" d="M5 3 H31 M8 3 V66 a10 10 0 0 0 20 0 V3" />
      </svg>
    {/if}
    <figcaption><span class="ps-ind-ime">{naslov}</span>{#if podnaslov}<span class="ps-ind-boja">{podnaslov}</span>{/if}</figcaption>
  </figure>
{/snippet}

{#snippet izborKiselosti()}
  <div class="ps-kis" role="radiogroup" aria-label="Kakva je otopina?">
    <span class="ps-kis-pit">Otopina je:</span>
    {#each KISELOST as k (k)}
      <button
        type="button"
        role="radio"
        aria-checked={kiselost === k}
        class="ps-pill"
        class:sel={kiselost === k}
        class:ok={rijeseno && kiselost === k}
        class:bad={ishod?.kiselostKrivo && !ishod.prazno && kiselost === k && !ishod.tocno}
        disabled={!aktivno}
        onclick={() => (kiselost = k)}>{KISELOST_NAZIV[k]}</button
      >
    {/each}
  </div>
{/snippet}

{#snippet izvorPodaci()}
  {#if ot && !ot.greska}
    <div class="ps-chips">
      <span class="ps-formula"><Formula f={ot.formula} /></span>
      {#if ot.naziv}<span class="ps-naziv">{ot.naziv}</span>{/if}
      {#if ot.c != null}<span class="ps-chip"><Formula f={`${izmjereno ? "c₀" : "c"} = ${s.otopina.zapis ?? formatNumber(ot.c)} mol/dm³`} /></span>{/if}
      {#if otChipK}<span class="ps-chip">{@render tekstK(otChipK)}</span>{/if}
    </div>
  {/if}
  {#if p}
    <div class="ps-chips">
      {#each [["kiselina", p.kiselina], ["sol", p.sol]] as [uloga, x] (uloga)}
        <span class="ps-chip"
          ><span class="ps-chip-f"><Formula f={x.formula} /></span>: <Formula f={`c = ${x.zapis ?? formatNumber(x.c)} mol/dm³`} />{#if x.V != null}, V = {x.zapis_V ?? formatNumber(x.V)} mL{/if}</span
        >
      {/each}
      <span class="ps-chip">K<sub>a</sub> = <Formula f={`${p.zapis_K ?? formatSci(p.Ka)} mol/dm³`} /></span>
    </div>
  {/if}
  {#if tempChip}<div class="ps-chips"><span class="ps-chip">{@render tekstK(tempChip)}</span></div>{/if}
{/snippet}

{#if istrazi}
  {#if s.tekst}<div class="ps-tekst"><Md text={s.tekst} /></div>{/if}
  <p class="ps-hint">Pomiči klizač – ovo nije zadatak, samo istražuješ.</p>
{:else}
  <div class="lx-question"><Md text={s.tekst} /></div>
{/if}

<div class="ps">
  {#if istrazi}
    {@render izvorPodaci()}
    {@render skala([{ pH: ph, tekst: `pH ${zapisPH(ph)}` }])}
    {#if klizac === "pH"}
      <div class="ps-klizac-skala">
        <input type="range" class="ps-klizac" min={kliz.min} max={kliz.max} step="0.01" value={kliz.v} oninput={pomakni} aria-label="pH" aria-valuetext="pH {zapisPH(ph)}" />
      </div>
    {/if}
    <div class="ps-mreza">
      {#each ["c_H3O", "c_OH", "pH", "pOH"] as q (q)}
        <div class="ps-kartica" class:zadano={q === klizac}>
          <div class="ps-glava"><span class="ps-sym">{@render oznaka(q)}</span>{#if !JE_P(q)}<span class="ps-ime">{IME[q]}</span>{/if}</div>
          <div class="ps-vrijednost" aria-live="polite"><Formula f={zapisUzivo(q, vrijednosti[q])} />{#if !JE_P(q)}<span class="ps-jed"><Formula f=" mol/dm³" /></span>{/if}</div>
          {#if q === klizac && q !== "pH"}
            <input type="range" class="ps-klizac" min={kliz.min} max={kliz.max} step="0.01" value={kliz.v} oninput={pomakni} aria-label={OZNAKA[q]} aria-valuetext={zapisUzivo(q, vrijednosti[q])} />
          {/if}
        </div>
      {/each}
    </div>
    <div class="ps-odnos">
      <span class="ps-badge {kis}">{KIS_TEKST[kis]}</span>
      <span class="ps-odnos-t"><Formula f="c(H₃O⁺)" /> {usporedba} <Formula f="c(OH⁻)" /></span>
      <span class="ps-odnos-t">pH + pOH = {pKwTekst}</span>
      <span class="ps-odnos-t">{@render tekstK("c(H₃O⁺) · c(OH⁻) = Kw")}</span>
    </div>
    <div class="ps-indikatori">
      {#each prikazInd as ind (ind)}
        {@render epruveta(ind, bojaNaPH(ind, ph), INDIKATORI[ind].kratko, nazivBoje(ind, ph))}
      {/each}
    </div>
    <p class="ps-napomena">
      {@render tekstK(nije25 ? `Kw = ${zapisC(Kw, 2)} mol² dm⁻⁶${s.t != null ? ` pri ${formatNumber(s.t)} °C` : ""}` : `Kw = ${KW_ZAPIS} pri 25 °C`)} i područja promjene boje indikatora školski su podaci: nisu na listu mature, pa ih treba znati.
    </p>
  {:else if racun}
    {@render izvorPodaci()}
    <form onsubmit={predaj} bind:clientWidth={sirina}>
      <div class="ps-lanac" class:vodoravno>
        {#if zad}
          <div class="ps-kartica zadano">
            <div class="ps-glava"><span class="ps-sym">{@render oznaka(zad.velicina)}</span><span class="ps-ime">zadano</span></div>
            <div class="ps-vrijednost"><Formula f={`${zapisZadanog(zad.velicina, zad.vrijednost, zad.zapis)}${JE_P(zad.velicina) ? "" : " mol/dm³"}`} /></div>
          </div>
        {/if}
        {#each trazi as q, i (q)}
          {#if zad || i > 0}
            <div class="ps-strelica" aria-hidden="true">
              <span class="ps-str-r">→</span><span class="ps-str-d">↓</span>
              {#if operacije && koraci[i]?.pravilo}<span class="ps-op">{@render tekstK(koraci[i].pravilo.formula)}</span>{/if}
            </div>
          {/if}
          <div class="ps-kartica" class:ok={okKorak(i)} class:bad={badKorak(i)}>
            <div class="ps-glava"><span class="ps-sym">{@render oznaka(q)}</span><span class="ps-ime">{IME[q]}</span></div>
            <div class="ps-unos">
              <input
                id="ps-{uid}-{i}"
                class="inp ps-inp"
                class:ok={okKorak(i)}
                class:bad={badKorak(i)}
                inputmode="decimal"
                autocomplete="off"
                aria-label="{IME[q]}{JEDINICA[q] ? ` u ${JEDINICA[q]}` : ''}"
                placeholder="?"
                disabled={!aktivno}
                bind:value={unosi[i]}
              />
              {#if JEDINICA[q]}<span class="lx-unit"><Formula f={JEDINICA[q]} /></span>{/if}
            </div>
            {#if !JE_P(q) && q !== "alfa" && aktivno}
              <div class="ps-pot">
                <button type="button" class="btn btn-quiet" onclick={() => potencija(i)} aria-label="Dodaj potenciju broja 10">·10ⁿ</button>
                <span>npr. 1,32·10^-3</span>
              </div>
            {:else if q === "alfa" && aktivno}
              <div class="ps-pot"><span>udio (0,0132) ili postotak (1,32 %)</span></div>
            {/if}
          </div>
        {/each}
      </div>
      {#if s.kiselost}{@render izborKiselosti()}{/if}
      <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpunRacun}>Provjeri</button></div>
    </form>
    {#if rijeseno}{@render skala([{ pH: st.pH, tekst: `pH ${zapisPH(st.pH)}` }])}{/if}
  {:else if indikator}
    {@render izvorPodaci()}
    {#if zad}
      <div class="ps-chips"><span class="ps-chip ps-chip-zad">{@render oznaka(zad.velicina)} = <Formula f={`${zapisZadanog(zad.velicina, zad.vrijednost, zad.zapis)}${JE_P(zad.velicina) ? "" : " mol/dm³"}`} /></span></div>
    {/if}
    <div class="ps-izbori">
      {#each pitaj as ind (ind)}
        {@const odabrana = bojaPoId(ind, izbor[ind])}
        <div class="ps-izbor" class:bad={badInd(ind)} class:ok={rijeseno}>
          {@render epruveta(ind, izbor[ind] ? (odabrana?.boja ?? null) : null, INDIKATORI[ind].kratko, odabrana?.naziv ?? "?")}
          <div class="ps-boje" role="radiogroup" aria-label="Boja: {INDIKATORI[ind].naziv}">
            {#each INDIKATORI[ind].boje as b (b.id)}
              <button
                type="button"
                role="radio"
                aria-checked={izbor[ind] === b.id}
                class="ps-boja"
                class:sel={izbor[ind] === b.id}
                disabled={!aktivno}
                onclick={() => (izbor[ind] = b.id)}
              >
                <span class="ps-tocka" class:bezbojna={!b.boja} style={b.boja ? `background: ${b.boja}` : ""}></span>
                <span>{b.naziv}{#if b.i}<span class="ps-boja-i"> ({b.i})</span>{/if}</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
    {#if s.kiselost}{@render izborKiselosti()}{/if}
    <div class="lx-actions"><button class="btn btn-primary" disabled={!aktivno || !potpunInd} onclick={predaj}>Provjeri</button></div>
    {#if rijeseno}{@render skala([{ pH: st.pH, tekst: `pH ${zapisPH(st.pH)}` }])}{/if}
  {:else if poredaj}
    {#if istaC}<div class="ps-chips"><span class="ps-chip">sve otopine: <Formula f={`c = ${zapisCOtopine(s.otopine[0])} mol/dm³`} /></span></div>{/if}
    <p class="ps-kraj">{s.smjer === "padajuci" ? "najviši pH" : "najniži pH"} ↑</p>
    <ol class="ps-red">
      {#each prikazRed as i, pos (i)}
        {@const o = pod[i].ot}
        <li class="lx-option" class:ok={rijeseno} class:bad={badPor(i)}>
          <span class="lx-mark">{pos + 1}</span>
          <span class="ps-red-t">
            <span class="ps-formula sm"><Formula f={o.formula} /></span>
            {#if o.naziv}<span class="ps-naziv">{o.naziv}</span>{/if}
            {#if !istaC && o.c != null}<span class="ps-chip"><Formula f={`c = ${zapisCOtopine(s.otopine[i])} mol/dm³`} /></span>{/if}
            {#if o.Kzadan != null}<span class="ps-chip">{@render tekstK(`${o.Kime} = ${s.otopine[i].zapis_K ?? formatSci(o.Kzadan)}`)}</span>{/if}
          </span>
          {#if aktivno}
            <span class="ps-red-btns">
              <button type="button" class="icon-btn" aria-label="Pomakni {o.formula} gore" disabled={pos === 0} onclick={() => pomak(pos, -1)}>↑</button>
              <button type="button" class="icon-btn" aria-label="Pomakni {o.formula} dolje" disabled={pos === prikazRed.length - 1} onclick={() => pomak(pos, 1)}>↓</button>
            </span>
          {/if}
        </li>
      {/each}
    </ol>
    <p class="ps-kraj">{s.smjer === "padajuci" ? "najniži pH" : "najviši pH"} ↓</p>
    <div class="lx-actions"><button class="btn btn-primary" disabled={!aktivno} onclick={predaj}>Provjeri</button></div>
    {#if rijeseno}{@render skala(pod.map((x) => ({ pH: x.pH, tekst: x.ot.formula, formula: true })))}{/if}
  {/if}
</div>

{#if tocanTekst}
  <p class="lx-solution">Točan odgovor: <b class="ps-tocno">{@render tekstK(tocanTekst)}</b></p>
{/if}

<style>
  .ps {
    display: grid;
    gap: 12px;
    min-width: 0;
  }
  .ps-tekst {
    margin-bottom: 6px;
  }
  .ps-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }

  /* zadani podaci */
  .ps-chips {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .ps-formula {
    font-family: var(--font-sans);
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }
  .ps-formula.sm {
    font-size: 17px;
  }
  .ps-naziv {
    color: var(--text-dim);
    font-size: 14px;
  }
  .ps-chip {
    display: inline-block;
    padding: 2px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .ps-chip-zad {
    font-size: 15px;
    color: var(--text);
    padding: 4px 12px;
  }
  .ps-chip-f {
    color: var(--text);
    font-weight: 600;
  }
  .ps-k {
    font-style: italic;
    white-space: nowrap;
  }
  .ps :global(sub),
  .ps-tocno :global(sub) {
    font-size: 0.68em;
    vertical-align: -0.3em;
    line-height: 0;
  }
  .ps :global(sup) {
    font-size: 0.68em;
    vertical-align: 0.55em;
    line-height: 0;
  }

  /* skala */
  .ps-skala {
    position: relative;
    padding: 0 12px;
    margin: 4px 0 2px;
    font-family: var(--font-sans);
  }
  .ps-pinovi {
    position: relative;
    margin-bottom: 6px;
  }
  .ps-pin {
    position: absolute;
    transform: translateX(-50%);
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--text);
    color: var(--bg);
    font-size: 12.5px;
    font-weight: 600;
    line-height: 20px;
    white-space: nowrap;
  }
  .ps-traka {
    position: relative;
    height: 22px;
    border-radius: 6px;
    border: 1px solid var(--border-strong);
  }
  .ps-crta {
    position: absolute;
    top: -8px;
    bottom: -4px;
    width: 3px;
    margin-left: -1.5px;
    background: var(--text);
    border-radius: 2px;
    box-shadow: 0 0 0 1.5px var(--bg);
  }
  .ps-neutral {
    position: absolute;
    top: 3px;
    bottom: 3px;
    width: 0;
    border-left: 1.5px dashed rgba(255, 255, 255, 0.85);
  }
  .ps-brojevi,
  .ps-podrucja {
    position: relative;
    height: 18px;
    font-size: 11px;
    color: var(--text-faint);
  }
  .ps-brojevi span,
  .ps-podrucja span {
    position: absolute;
    top: 2px;
    transform: translateX(-50%);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .ps-podrucja {
    height: 16px;
    font-size: 11.5px;
    color: var(--text-dim);
  }
  .ps-podrucja .sred {
    color: var(--text-faint);
  }
  .ps-klizac-skala {
    padding: 0 3px;
    margin-top: -6px;
  }
  .ps-klizac {
    width: 100%;
    margin: 0;
    height: 30px;
    accent-color: var(--primary);
    cursor: pointer;
  }

  /* kartice veličina */
  .ps-mreza {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .ps-kartica {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .ps-kartica.zadano {
    background: var(--bg-elev-2);
  }
  .ps-kartica.ok {
    border-color: var(--lx-ok);
  }
  .ps-kartica.bad {
    border-color: var(--lx-bad);
  }
  .ps-glava {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
  }
  .ps-sym {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
    white-space: nowrap;
  }
  .ps-ime {
    font-size: 12px;
    color: var(--text-faint);
  }
  .ps-vrijednost {
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 17px;
    font-weight: 600;
    color: var(--primary);
    white-space: nowrap;
  }
  .ps-kartica.zadano .ps-vrijednost,
  .ps-lanac .ps-vrijednost {
    color: var(--text);
  }
  .ps-jed {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-dim);
  }
  .ps-odnos {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .ps-odnos-t {
    white-space: nowrap;
  }
  .ps-badge {
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 13px;
    border: 1px solid var(--border-strong);
    color: var(--text);
  }
  /* oznaka područja: rub u boji univerzalnog indikatora (kemijski podatak) */
  .ps-badge.kisela {
    border-color: #e85d04;
  }
  .ps-badge.neutralna {
    border-color: #4caf50;
  }
  .ps-badge.luzhnata {
    border-color: #1f6fb8;
  }

  /* indikatori */
  .ps-indikatori {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 14px;
  }
  .ps-ind {
    margin: 0;
    display: grid;
    justify-items: center;
    gap: 4px;
    width: 76px;
  }
  .ps-epr {
    display: block;
    overflow: visible;
  }
  .ps-voda {
    fill: color-mix(in srgb, var(--text) 7%, transparent);
  }
  .ps-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.4;
    stroke-linecap: round;
  }
  .ps-papir {
    display: block;
    width: 26px;
    height: 70px;
    margin: 8px 0;
    border-radius: 3px;
    border: 1px solid var(--border-strong);
  }
  .ps-papir.prazno {
    border-style: dashed;
  }
  .ps-ind figcaption {
    display: grid;
    justify-items: center;
    text-align: center;
    line-height: 1.25;
  }
  .ps-ind-ime {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
  }
  .ps-ind-boja {
    font-size: 12px;
    color: var(--text-dim);
  }
  .ps-napomena {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-faint);
  }

  /* lanac računa: okomito na uskom zaslonu, vodoravno kad stane */
  .ps-lanac {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    max-width: 380px;
  }
  .ps-unos {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ps-inp {
    width: 100%;
    max-width: 150px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .ps-pot {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-faint);
  }
  .ps-pot .btn {
    min-width: 44px;
    min-height: 32px;
    font-family: var(--font-mono);
  }
  .ps-strelica {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
  }
  .ps-str-r {
    display: none;
  }
  .ps-str-d,
  .ps-str-r {
    font-size: 18px;
    line-height: 1;
  }
  .ps-op {
    font-size: 13px;
    color: var(--primary);
    font-weight: 600;
  }
  .ps-lanac.vodoravno {
    flex-direction: row;
    max-width: none;
  }
  .vodoravno .ps-kartica {
    flex: 1 1 0;
  }
  .vodoravno .ps-strelica {
    flex-direction: column;
    justify-content: center;
    align-self: center;
    gap: 2px;
    padding: 0 2px;
  }
  .vodoravno .ps-str-r {
    display: inline;
  }
  .vodoravno .ps-str-d {
    display: none;
  }

  /* kisela / neutralna / lužnata */
  .ps-kis {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .ps-kis-pit {
    font-size: 14px;
    color: var(--text-dim);
    margin-right: 4px;
  }
  .ps-pill {
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 14px;
  }
  .ps-pill:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .ps-pill.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .ps-pill.ok {
    border-color: var(--lx-ok);
  }
  .ps-pill.bad {
    border-color: var(--lx-bad);
  }

  /* izbor boje indikatora */
  .ps-izbori {
    display: grid;
    gap: 10px;
  }
  .ps-izbor {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .ps-izbor.ok {
    border-color: var(--lx-ok);
  }
  .ps-izbor.bad {
    border-color: var(--lx-bad);
  }
  .ps-boje {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
  }
  .ps-boja {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 10px 0 7px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
    color: var(--text);
    font-size: 13.5px;
    text-align: left;
  }
  .ps-boja:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .ps-boja.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .ps-boja-i {
    color: var(--text-faint);
    font-size: 12px;
  }
  .ps-tocka {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.15);
  }
  .ps-tocka.bezbojna {
    border: 1.5px dashed var(--text-faint);
  }

  /* poredak */
  .ps-red {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .ps-red li {
    align-items: center;
    padding: 6px 6px 6px 12px;
  }
  .ps-red-t {
    flex: 1;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 10px;
    min-width: 0;
  }
  .ps-red-btns {
    display: flex;
    gap: 2px;
  }
  .ps-kraj {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-faint);
  }

  .ps-tocno {
    color: var(--success);
    font-family: var(--font-sans);
    font-weight: 600;
  }

  @media (max-width: 420px) {
    .ps-vrijednost {
      font-size: 15.5px;
    }
    .ps-izbor {
      align-items: flex-start;
    }
    .ps-ind {
      width: 64px;
    }
  }
</style>
