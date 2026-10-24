<script>
  // kromatografija: traka (kreda, papir ili pločica) u čaši s otapalom, nacrtana kodom skice „kromatogram“
  // (taskSketch.js: chromatogramBody, isti izgled kao skica u objašnjenju), uz napredak otapala (animacija), više
  // staza, pogreške u postavljanju i traku izvađenu uz ravnalo. Sav račun i sve poruke su u
  // katalog/kemija/kromatografija.js; ovdje je samo prikaz.
  // „Tvoj red“ ne odaje odgovor: R_f i formula R_f = d₁ : d₂ vide se tek nakon provjere (ili uz operacije: true),
  // a vodilice između uzorka i referencija i oznaka tražene mrlje tek nakon točnog odgovora ili „Pokaži odgovor“.
  import { untrack } from "svelte";
  import "$lib/sketch/sketch.css";
  import Md from "../Md.svelte";
  import { chromatogramBody, chromatogramLayout, SKETCH_DEFS, SPOT } from "$lib/sketch/taskSketch.js";
  import {
    kromatografija,
    crtezOf,
    stazeOf,
    podlogaOf,
    otapaloOf,
    PODLOGE,
    trazeneOf,
    ravnaloOf,
    startOf,
    zapisD,
    zapisCm,
    zapisRf,
    imeMrlje,
    oznakaRf,
    mrlja,
    podudaranja,
    trazenaMrlja,
    opcijePostupka,
    redOpcija,
    redMrlja,
    pitanjePostupka,
  } from "$lib/lesson/katalog/kemija/kromatografija.js";

  const SPOT_KLASA = (m) => SPOT[m?.boja] ?? "k5";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const istrazi = nacin === "istrazi";
  const C = crtezOf(s);
  const staze = stazeOf(s);
  const P = PODLOGE[podlogaOf(s)];
  const ot = otapaloOf(s);
  const ravnalo = ravnaloOf(s);
  const rijeseno = $derived(!!ishod?.tocno || pokazi);
  const smanjeno = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ── istraživanje: nanošenje, puštanje otapala, pogreške ──
  let napredak = $state(istrazi ? 0 : 1);
  let faza = $state(istrazi ? "start" : "kraj"); // start | tece | kraj
  let ispodRazine = $state(false);
  let tinta = $state(false);
  let naneseno = $state((staze ?? [null]).map(() => true));
  let okvir = 0;
  function pusti() {
    cancelAnimationFrame(okvir);
    if (smanjeno) {
      napredak = 1;
      faza = "kraj";
      return;
    }
    faza = "tece";
    const t0 = performance.now();
    const T = 4200;
    const korak = (t) => {
      const x = Math.min(1, (t - t0) / T);
      napredak = 1 - (1 - x) * (1 - x); // otapalo se diže sve sporije
      if (x < 1) okvir = requestAnimationFrame(korak);
      else faza = "kraj";
    };
    okvir = requestAnimationFrame(korak);
  }
  function ispocetka() {
    cancelAnimationFrame(okvir);
    napredak = 0;
    faza = "start";
  }
  $effect(() => () => cancelAnimationFrame(okvir));
  const pocetak = $derived(faza === "start");

  // ── crtež u čaši ──
  // na startnoj liniji (prije puštanja ili otopljeno u čaši) mrlje su jedna preko druge, pa bez natpisa
  const nula = (m) => m.map(({ oznaka, ...x }) => ({ ...x, udaljenost: 0 })); // eslint-disable-line no-unused-vars
  const bezOznaka = (m) => m.map(({ oznaka, ...x }) => x); // eslint-disable-line no-unused-vars
  const tijelo = $derived.by(() => {
    if (ravnalo) return "";
    if (nacin === "postupak") return chromatogramBody(C, { napredak: 0, fronta: false, kote: false, staze: staze ?? undefined });
    if (!istrazi) return chromatogramBody(C, { kote: nacin === "rf", staze: staze ?? undefined });
    const otopljeno = ispodRazine && !pocetak;
    const crtez = otopljeno ? { ...C, mrlje: nula(C.mrlje) } : faza !== "kraj" ? { ...C, mrlje: bezOznaka(C.mrlje) } : C;
    const st = staze?.map((t, i) => ({ naziv: t.naziv, mrlje: naneseno[i] ? (otopljeno ? nula(t.mrlje) : t.mrlje) : [] }));
    return chromatogramBody(crtez, {
      napredak,
      staze: st,
      fronta: !pocetak,
      kote: faza === "kraj" && !ispodRazine && !staze,
      mokro: true,
      razina: ispodRazine ? 194 : 218,
      vidljivost: otopljeno ? 1 - Math.min(1, napredak * 2.5) : 1,
      tinta,
    });
  });
  const L = chromatogramLayout(C, { staze: staze ? staze.length : 1 });

  // ── rf: unosi ──
  const trazene = nacin === "rf" ? trazeneOf(s) : [];
  let unosi = $state(trazene.map(() => ""));
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  const pokaziFormulu = $derived(!!s.operacije || rijeseno);
  function predajRf(e) {
    e.preventDefault();
    if (!locked && potpun) onodgovor($state.snapshot(unosi));
  }
  const ok = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina > i);
  const bad = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;

  // ── ravnalo: traka izvađena iz čaše ──
  const st0 = startOf(s);
  const R = (() => {
    if (!ravnalo) return null;
    const duljina = st0 + C.fronta + 1; // fronta 1 cm ispod vrha trake (pokus 2)
    const k = Math.min(24, 236 / duljina);
    const y0 = 16 + duljina * k; // donji rub trake = 0 na ravnalu
    const cm = Math.ceil(duljina);
    const [sx0, sx1] = P === PODLOGE.kreda ? [146, 174] : [142, 178];
    const crtice = [];
    for (let i = 0; i <= cm * 10; i++) {
      if (i % 10 && k < 16) continue;
      crtice.push({ y: y0 - (i / 10) * k, d: i % 10 === 0 ? 12 : i % 5 === 0 ? 8 : 5, broj: i % 10 === 0 ? i / 10 : null });
    }
    return { k, y0, yTop: y0 - duljina * k, cm, sx0, sx1, crtice, H: y0 + 24, Y: (cmOdDna) => y0 - cmOdDna * k };
  })();
  const oznakeRavnala = ravnalo
    ? [
        { id: "start", ime: "startna linija", cm: st0 },
        ...C.mrlje.map((m, i) => ({ id: `m${i}`, ime: imeMrlje(m, i), cm: st0 + m.udaljenost, m })),
        { id: "fronta", ime: "fronta otapala", cm: st0 + C.fronta },
      ]
    : [];
  let ocitano = $state({});
  const vidiOcitanje = (id) => rijeseno || ocitano[id];
  // oznake očitanja jedna ispod druge (barem 13 px razmaka)
  const yOcitanja = $derived.by(() => {
    if (!ravnalo) return {};
    const vid = oznakeRavnala.filter((o) => vidiOcitanje(o.id)).sort((a, b) => b.cm - a.cm);
    const out = {};
    let zadnji = -Infinity;
    for (const o of vid) zadnji = out[o.id] = Math.max(R.Y(o.cm), zadnji + 13);
    return out;
  });

  // ── prepoznaj ──
  const pitanje = s.pitanje;
  const pod = nacin === "prepoznaj" && pitanje === "tvari" ? podudaranja(s) : [];
  let odabrane = $state([]);
  function prebaci(i) {
    if (locked) return;
    odabrane = odabrane.includes(i) ? odabrane.filter((x) => x !== i) : [...odabrane, i];
  }
  let izbor = $state(null);
  function odaberi(v) {
    if (locked) return;
    izbor = v;
    onodgovor(v);
  }
  const redM = nacin === "prepoznaj" && (pitanje === "otapanje" || pitanje === "vezanje") ? redMrlja(s) : [];
  const tocnaMrlja = redM.length ? trazenaMrlja(s) : -1;
  const opcije = nacin === "postupak" ? redOpcija(s, opcijePostupka(s)) : [];
  const tocno = $derived(pokazi && (nacin === "rf" || pitanje === "tvari") ? kromatografija.tocanOdgovor(s) : "");

  // ── istraživanje: R_f i poruka ──
  const fmtD = (v) => zapisD(s, v);
  const rfRedovi = (mrlje) => mrlje.map((m, i) => ({ ime: imeMrlje(m, i), d1: fmtD(m.udaljenost), rf: zapisRf(m.udaljenost / C.fronta), m }));
  const porukaFaze = $derived.by(() => {
    if (!istrazi) return "";
    const nanesenih = staze ? naneseno.filter(Boolean).length : 1;
    if (faza === "start") {
      if (!nanesenih) return "Odaberi barem jedan uzorak koji ćeš nanijeti na startnu liniju.";
      if (ispodRazine) return `Startna linija s uzorkom je ispod razine otapala (${ot}).`;
      if (tinta) return `Startna linija povučena je kemijskom olovkom. Uzorak je nanesen na nju, iznad razine otapala.`;
      return `Uzorak je nanesen na startnu liniju, iznad razine otapala (${ot}).`;
    }
    if (faza === "tece") return `${ot[0].toUpperCase()}${ot.slice(1)} se diže uz ${P.aku} i nosi tvari iz uzorka. Tvari koje se bolje otapaju u njemu putuju brže.`;
    if (ispodRazine) return `Uzorak se otopio u otapalu u čaši, umjesto da ga otapalo nosi uz ${P.aku}: na ${P.lok} nema mrlja. Zato startna linija mora biti iznad razine otapala.`;
    const tintaTekst = tinta ? " I tinta s crte otopila se i otapalo ju je razvuklo u plavu mrlju, koja smeta. Zato se startna linija povlači grafitnom olovkom." : "";
    if (staze) return `Otapalo je stiglo blizu vrha: traka se vadi i fronta odmah označi olovkom. Mrlje na istoj visini imaju isti R_f.${tintaTekst}`;
    const n = C.mrlje.length;
    return `Otapalo je stiglo blizu vrha: ${P.ime} se vadi i fronta odmah označi olovkom. ${n > 1 ? `Uzorak se razdvojio na ${mrlja(n)}, pa je smjesa.` : "Ostala je jedna mrlja."}${tintaTekst}`;
  });
  const najdalje = C.mrlje.length > 1 ? C.mrlje.reduce((a, b) => (b.udaljenost > a.udaljenost ? b : a)) : null;
  const najblize = C.mrlje.length > 1 ? C.mrlje.reduce((a, b) => (b.udaljenost < a.udaljenost ? b : a)) : null;

  const naslov = $derived(nacin === "postupak" ? pitanjePostupka(s) : s.tekst);
  const crtezAria = `Kromatogram: ${P.ime} u čaši s otapalom (${ot})`;
</script>

{#snippet Rf()}<span class="kr-nr"><i>R</i><sub>f</sub></span>{/snippet}

{#if naslov}<div class="lx-question"><Md text={naslov} /></div>{/if}
{#if istrazi}<p class="kr-hint">Pusti otapalo i gledaj – ovo nije zadatak, samo istražuješ.</p>{/if}

<div class="kr">
  {#if ravnalo}
    <figure class="task-sketch kr-fig">
      <svg viewBox="0 0 380 {R.H}" role="img" aria-label="Traka izvađena iz čaše i položena uz ravnalo; 0 na ravnalu je na donjem rubu trake">
        <rect class="strip" x={R.sx0} y={R.yTop} width={R.sx1 - R.sx0} height={R.y0 - R.yTop} rx={P === PODLOGE.kreda ? 10 : 1} />
        <line class="ln thin" x1={R.sx0 - 6} y1={R.Y(st0)} x2={R.sx1 + 6} y2={R.Y(st0)} />
        <text class="lbl small dim-t" x="84" y={R.Y(st0)} text-anchor="end" dominant-baseline="middle">startna linija</text>
        <line class="ln dash acc" x1={R.sx0 - 6} y1={R.Y(st0 + C.fronta)} x2={R.sx1 + 6} y2={R.Y(st0 + C.fronta)} />
        <text class="lbl small acc-t" x="84" y={R.Y(st0 + C.fronta)} text-anchor="end" dominant-baseline="middle">fronta otapala</text>
        {#each C.mrlje as m, i (i)}
          {@const y = R.Y(st0 + m.udaljenost)}
          <ellipse class="spot {SPOT_KLASA(m)}" cx={(R.sx0 + R.sx1) / 2} cy={y} rx={P === PODLOGE.kreda ? 11 : 13} ry="6" />
          {#if m.oznaka}<text class="lbl small" x="136" y={y} text-anchor="end" dominant-baseline="middle">{m.oznaka}</text>{/if}
        {/each}
        <!-- ravnalo: 0 na donjem rubu trake -->
        <rect class="ruler" x="190" y={R.Y(R.cm) - 6} width="36" height={R.cm * R.k + 12} rx="2" />
        {#each R.crtice as c, i (i)}
          <line class="ln thin" x1="190" y1={c.y} x2={190 + c.d} y2={c.y} />
          {#if c.broj != null}<text class="tick kr-broj" x="222" y={c.y} text-anchor="end" dominant-baseline="middle">{c.broj}</text>{/if}
        {/each}
        <text class="tick" x="208" y={R.y0 + 16} text-anchor="middle">cm</text>
        {#each oznakeRavnala as o (o.id)}
          {#if vidiOcitanje(o.id)}
            <line class="ln thin dash kr-vodilica" x1={R.sx1 + 2} y1={R.Y(o.cm)} x2="190" y2={R.Y(o.cm)} />
            <line class="ln thin kr-vodilica" x1="226" y1={R.Y(o.cm)} x2="234" y2={yOcitanja[o.id]} />
            <text class="lbl small {o.id === 'fronta' ? 'acc-t' : o.id === 'start' ? 'dim-t' : ''}" x="238" y={yOcitanja[o.id]} dominant-baseline="middle">{zapisCm(o.cm)}</text>
          {/if}
        {/each}
      </svg>
    </figure>
    <div class="kr-ocitaj" role="group" aria-label="Očitaj ravnalo">
      <span class="kr-dim">Očitaj:</span>
      {#each oznakeRavnala as o (o.id)}
        <button type="button" class="kr-chip" class:on={vidiOcitanje(o.id)} aria-pressed={!!vidiOcitanje(o.id)} disabled={rijeseno} onclick={() => (ocitano[o.id] = !ocitano[o.id])}>{o.ime}</button>
      {/each}
    </div>
  {:else if !(nacin === "postupak" && pitanje === "usitnjavanje")}
    <figure class="task-sketch kr-fig">
      <svg viewBox="0 0 380 252" role="img" aria-label={crtezAria}>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG iz koda skice (taskSketch.js), tekst je escapiran -->
        {@html SKETCH_DEFS + tijelo}
        {#if rijeseno && pitanje === "tvari"}
          {#each pod.filter((p) => p.u) as p (p.i)}
            {@const y = L.Y(p.mrlja.udaljenost)}
            <line class="kr-vodilica-ok" x1={L.sx0 - 6} y1={y} x2={L.sx1 + 6} y2={y} />
          {/each}
        {/if}
        {#if rijeseno && tocnaMrlja >= 0}
          <ellipse class="kr-prsten" cx="160" cy={L.Y(C.mrlje[tocnaMrlja].udaljenost)} rx={L.rx + 5} ry="11" />
        {/if}
      </svg>
    </figure>
  {/if}

  {#if istrazi}
    <p class="kr-faza" aria-live="polite">{#each porukaFaze.split("R_f") as dio, j (j)}{#if j}{@render Rf()}{/if}{dio}{/each}</p>
    {#if pocetak}
      {#if staze}
        <div class="kr-ocitaj" role="group" aria-label="Uzorci na startnoj liniji">
          <span class="kr-dim">Nanesi:</span>
          {#each staze as t, i (i)}
            <button type="button" class="kr-chip" class:on={naneseno[i]} aria-pressed={naneseno[i]} onclick={() => (naneseno[i] = !naneseno[i])}>{t.naziv}</button>
          {/each}
        </div>
      {/if}
      {#if s.pogreske}
        <div class="kr-pogreske">
          <label class="kr-prekidac"><input type="checkbox" bind:checked={ispodRazine} /> startna linija ispod razine otapala</label>
          <label class="kr-prekidac"><input type="checkbox" bind:checked={tinta} /> crta kemijskom olovkom</label>
        </div>
      {/if}
    {/if}
    <div class="kr-gumbi">
      {#if pocetak}
        <button type="button" class="btn btn-primary kr-g" disabled={staze && !naneseno.some(Boolean)} onclick={pusti}>Pusti otapalo</button>
      {:else}
        <button type="button" class="btn btn-quiet kr-g" disabled={faza === "tece"} onclick={ispocetka}>Ispočetka</button>
      {/if}
    </div>
    {#if faza === "kraj" && !ispodRazine}
      <div class="kr-rf">
        <p class="kr-formula">{@render Rf()} = <span class="kr-nr">d<sub>1</sub> : d<sub>2</sub></span> <span class="kr-dim">(d<sub>1</sub> do sredine mrlje, d<sub>2</sub> do fronte, obje od startne linije)</span></p>
        {#each staze ? staze.map((t, i) => ({ t, i })).filter((x) => naneseno[x.i]) : [{ t: null, i: 0 }] as x (x.i)}
          {#if x.t}<p class="kr-staza">{x.t.naziv}</p>{/if}
          <ul class="kr-lista">
            {#each rfRedovi(x.t ? x.t.mrlje : C.mrlje) as r, j (j)}
              <li><span class="kr-tocka {SPOT_KLASA(r.m)}"></span>{x.t ? (r.m.boja ?? "siva") + " mrlja" : r.ime}: <span class="kr-nr">{@render Rf()} = {r.d1} : {fmtD(C.fronta)}</span> <span class="kr-nr">= <b>{r.rf}</b></span></li>
            {/each}
          </ul>
        {/each}
        {#if najdalje && !staze}
          <p class="kr-dim kr-zakljucak">{imeMrlje(najdalje, C.mrlje.indexOf(najdalje)).replace(/^./, (c) => c.toUpperCase())} otišla je najdalje: ta se tvar najbolje otapa u otapalu ({ot}). {imeMrlje(najblize, C.mrlje.indexOf(najblize)).replace(/^./, (c) => c.toUpperCase())} najviše je zaostala: ta se tvar najjače veže za {P.aku}.</p>
        {/if}
      </div>
    {/if}
  {:else if nacin === "rf"}
    {#if pokaziFormulu}
      <p class="kr-formula">{@render Rf()} = <span class="kr-nr">d<sub>1</sub> : d<sub>2</sub></span>{#if !rijeseno}<span class="kr-dim"> (obje udaljenosti od startne linije)</span>{/if}</p>
    {/if}
    <form class="kr-unosi" onsubmit={predajRf}>
      {#each trazene as mi, k (mi)}
        {@const m = C.mrlje[mi]}
        <label class="kr-unos">
          <span class="kr-oznaka">{@render Rf()}<span class="kr-nr">({oznakaRf(m, mi)}) =</span></span>
          <input class="inp kr-inp" class:ok={ok(k)} class:bad={bad(k)} inputmode="decimal" autocomplete="off" placeholder="?" aria-label="R f ({oznakaRf(m, mi)})" disabled={locked} bind:value={unosi[k]} />
        </label>
        {#if rijeseno}
          <div class="kr-rjesenje">
            {#if ravnalo}
              <span><span class="kr-nr">d<sub>1</sub> = {zapisCm(st0 + m.udaljenost)} − {zapisCm(st0)}</span> <span class="kr-nr">= {zapisCm(m.udaljenost)}</span></span>
              <span><span class="kr-nr">d<sub>2</sub> = {zapisCm(st0 + C.fronta)} − {zapisCm(st0)}</span> <span class="kr-nr">= {zapisCm(C.fronta)}</span></span>
            {/if}
            <span><span class="kr-nr">{@render Rf()}({oznakaRf(m, mi)}) =</span> <span class="kr-nr">{fmtD(m.udaljenost)} : {fmtD(C.fronta)}</span> <span class="kr-nr">= <b>{zapisRf(m.udaljenost / C.fronta)}</b></span></span>
          </div>
        {/if}
      {/each}
      <div class="kr-akcija"><button class="btn btn-primary" type="submit" disabled={locked || !potpun}>Provjeri</button></div>
    </form>
  {:else if nacin === "prepoznaj" && pitanje === "tvari"}
    <div class="lx-options" role="group" aria-label="Tvari u uzorku">
      {#each pod as p (p.i)}
        {@const sel = odabrane.includes(p.i)}
        <button type="button" class="lx-option" class:sel={sel && !rijeseno} class:ok={rijeseno && p.u} class:bad={!rijeseno && ishod && !ishod.tocno && !ishod.prazno && sel && !p.u} aria-pressed={sel} disabled={locked} onclick={() => prebaci(p.i)}>
          <span class="lx-mark box">{(rijeseno && p.u) || (!rijeseno && sel) ? "✓" : ""}</span>
          <span>tvar {p.naziv}</span>
        </button>
      {/each}
    </div>
    <div class="kr-akcija"><button class="btn btn-primary" type="button" disabled={locked || !odabrane.length} onclick={() => onodgovor($state.snapshot(odabrane))}>Provjeri</button></div>
  {:else if nacin === "prepoznaj" && pitanje === "cista"}
    {@const tocnaV = C.mrlje.length === 1 ? "cista" : "smjesa"}
    <div class="lx-options">
      {#each [["cista", "čista tvar"], ["smjesa", "smjesa"]] as [v, t] (v)}
        <button type="button" class="lx-option" class:ok={(izbor === v && ishod?.tocno) || (pokazi && v === tocnaV)} class:bad={izbor === v && ishod && !ishod.tocno} disabled={locked} onclick={() => odaberi(v)}>
          <span class="lx-mark">{(izbor === v && ishod?.tocno) || (pokazi && v === tocnaV) ? "✓" : izbor === v && ishod ? "✕" : ""}</span>
          <span>{t}</span>
        </button>
      {/each}
    </div>
  {:else if nacin === "prepoznaj"}
    <div class="lx-options">
      {#each redM as i (i)}
        {@const m = C.mrlje[i]}
        <button type="button" class="lx-option" class:ok={(izbor === i && ishod?.tocno) || (pokazi && i === tocnaMrlja)} class:bad={izbor === i && ishod && !ishod.tocno} disabled={locked} onclick={() => odaberi(i)}>
          <span class="lx-mark">{(izbor === i && ishod?.tocno) || (pokazi && i === tocnaMrlja) ? "✓" : izbor === i && ishod ? "✕" : ""}</span>
          <span>{imeMrlje(m, i)}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="lx-options">
      {#each opcije as o (o.kljuc)}
        <button type="button" class="lx-option" class:ok={(izbor === o.kljuc && ishod?.tocno) || (pokazi && o.tocno)} class:bad={izbor === o.kljuc && ishod && !ishod.tocno} disabled={locked} onclick={() => odaberi(o.kljuc)}>
          <span class="lx-mark">{(izbor === o.kljuc && ishod?.tocno) || (pokazi && o.tocno) ? "✓" : izbor === o.kljuc && ishod ? "✕" : ""}</span>
          <Md text={o.tekst} inline />
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if tocno}<div class="kr-tocno"><span>Točan odgovor:</span> <b><Md text={tocno} inline /></b></div>{/if}

<style>
  .kr {
    display: grid;
    gap: 10px;
  }
  .kr-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .kr-fig {
    margin: 0;
    max-width: 440px;
  }
  /* natpis „fronta otapala“ skice malo izlazi lijevo iz crteža */
  .kr-fig svg {
    overflow: visible;
  }
  .kr-nr {
    white-space: nowrap;
    font-family: var(--font-sans);
  }
  .kr-nr sub,
  .kr-formula sub,
  .kr-oznaka sub {
    font-size: 0.7em;
  }
  .kr-dim {
    color: var(--text-faint);
    font-size: 13px;
  }
  .kr-faza {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-dim);
    min-height: 2.8em;
    line-height: 1.5;
  }
  .kr-gumbi,
  .kr-ocitaj,
  .kr-pogreske {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }
  .kr-g {
    min-height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .kr-chip {
    min-height: 36px;
    padding: 0 12px;
    font-size: 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
  }
  .kr-chip.on {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .kr-chip:disabled {
    cursor: default;
  }
  .kr-prekidac {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font-size: 14px;
    cursor: pointer;
  }
  .kr-prekidac input {
    width: 18px;
    height: 18px;
    accent-color: var(--primary);
  }
  .kr-rf {
    display: grid;
    gap: 4px;
    font-size: 14px;
  }
  .kr-formula {
    margin: 0;
    font-size: 15px;
    font-family: var(--font-sans);
  }
  .kr-formula .kr-dim {
    font-size: 12.5px;
  }
  .kr-staza {
    margin: 4px 0 0;
    font-weight: 600;
    font-size: 13.5px;
  }
  .kr-lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 3px;
  }
  .kr-lista li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 6px;
  }
  .kr-tocka {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    align-self: center;
  }
  .kr-tocka.k1 {
    background: var(--primary);
  }
  .kr-tocka.k2 {
    background: var(--warn);
  }
  .kr-tocka.k2.light {
    background: color-mix(in srgb, var(--warn) 55%, transparent);
  }
  .kr-tocka.k3 {
    background: var(--success);
  }
  .kr-tocka.k4 {
    background: var(--danger);
  }
  .kr-tocka.k5 {
    background: var(--text-dim);
  }
  .kr-lista b,
  .kr-rjesenje b {
    color: var(--primary);
  }
  .kr-zakljucak {
    margin: 4px 0 0;
    line-height: 1.5;
  }
  .kr-unosi {
    display: grid;
    gap: 8px;
  }
  .kr-unos {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .kr-oznaka {
    font-family: var(--font-sans);
    font-size: 16px;
    white-space: nowrap;
  }
  .kr-inp {
    width: 110px;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .kr-rjesenje {
    display: grid;
    margin: -2px 0 2px;
    font-size: 13.5px;
    color: var(--text-dim);
    line-height: 1.6;
  }
  .kr-akcija {
    margin-top: 6px;
  }
  .kr-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .kr-tocno {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }
  .kr-tocno b {
    color: var(--success);
    font-weight: 600;
  }

  /* crtež: dijelovi koje dodaje samo widget (skica ih nema) */
  .kr-fig :global(.wet) {
    fill: color-mix(in srgb, var(--lx-water) 14%, transparent);
    stroke: none;
  }
  .kr-fig :global(.ln.ink) {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .kr-fig :global(.ink-band) {
    opacity: 0.55;
  }
  .kr-fig :global(.spot) {
    transition: opacity 0.3s;
  }
  .kr-broj {
    font-size: 10px;
  }
  .kr-vodilica {
    stroke: var(--text-dim);
  }
  .kr-vodilica-ok {
    stroke: var(--success);
    stroke-width: 1.6;
    stroke-dasharray: 5 4;
  }
  .kr-prsten {
    fill: none;
    stroke: var(--success);
    stroke-width: 2.2;
  }
  @media (prefers-reduced-motion: reduce) {
    .kr-fig :global(.spot) {
      transition: none;
    }
  }
</style>
