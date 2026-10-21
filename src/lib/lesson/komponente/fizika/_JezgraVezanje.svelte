<script>
  // jezgra / vezanje: vaga (Z protona + N neutrona naspram gotove jezgre: jezgra je lakša) i lanac pretvorbi
  // Δm (u) → kg → J → eV → MeV → MeV po nukleonu. U „izracunaj“ su kućice lanca s „?“ do točnog odgovora;
  // sve brojke dolaze iz katalog/fizika/jezgra.js (racunVezanja, lanacVezanja).
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Kuglice from "./_JezgraKuglice.svelte";
  import Zapis from "./_JezgraZapis.svelte";
  import {
    lanacVezanja,
    vagaVezanja,
    kuglice,
    polumjerJezgre,
    zIzSimbola,
    imeIzotopa,
    mdKratko,
    zapisVrijednosti,
    VELICINE_VEZANJA,
    MASE_JEZGARA,
  } from "$lib/lesson/katalog/fizika/jezgra.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const izracunaj = nacin === "izracunaj";
  const prikaz = nacin === "prikaz";
  const pitaj = untrack(() => spec.pitaj ?? []);
  const lanacVidljiv = untrack(() => !izracunaj || spec.lanac !== false);

  // istraživanje: ugrađene jezgre (i ona iz speca)
  const izbor = untrack(() => {
    const l = [...MASE_JEZGARA];
    if (
      spec.jezgra &&
      !l.some((j) => j.simbol === spec.jezgra.simbol && j.A === spec.jezgra.A)
    )
      l.push(spec.jezgra);
    return l.sort((a, b) => a.A - b.A);
  });
  let jezgra = $state(
    untrack(() => spec.jezgra ?? MASE_JEZGARA.find((j) => j.simbol === "He")),
  );
  let L = $derived(lanacVezanja(spec, jezgra));
  let r = $derived(L.r);

  let otkriveno = $derived(!izracunaj || pokazi || !!ishod?.tocno);
  // prikaz: otkriva se korak po korak (0 = slobodni nukleoni, 1 = Δm, 2… = kućice lanca)
  const KORACI = 7;
  let korak = $state(prikaz ? 0 : KORACI);
  let vidiKorak = (k) => (prikaz ? korak >= k : otkriveno);

  // unos
  let unos = $state(
    untrack(() => Object.fromEntries(pitaj.map((q) => [q.velicina, ""]))),
  );
  $effect(() => {
    if (!pokazi || !izracunaj) return;
    untrack(() => {
      unos = Object.fromEntries(
        pitaj.map((q) => [
          q.velicina,
          zapisVrijednosti(q.velicina, r[q.velicina]),
        ]),
      );
    });
  });
  function provjeri() {
    if (locked) return;
    onodgovor({ ...unos });
  }

  // ── vaga ──
  const r1 = (n) => Math.round(n * 10) / 10;
  const NAGIB = 6; // ° (shematski: lijeva strana je teža)
  // izracunaj: Z i N (brojke, boje kuglica, redni broj, opis) skriveni do točnog odgovora ili pokazi
  let V = $derived(vagaVezanja(r, izracunaj && !otkriveno, 104));
  let hrpa = $derived(V.hrpa);
  let R1 = $derived(Math.min(9, 36 / Math.cbrt(r.A)));
  let kJ = $derived(kuglice(V.tipoviJezgre, R1));
  let RJ = $derived(polumjerJezgre(r.A, R1));
  const C = [180, 34];
  const KRAK = 100;
  const dy = KRAK * Math.sin((NAGIB * Math.PI) / 180);
  const dx = KRAK * Math.cos((NAGIB * Math.PI) / 180);
  const lijevo = { x: C[0] - dx, y: C[1] + dy };
  const desno = { x: C[0] + dx, y: C[1] - dy };
  const VIS = 78; // duljina užeta do zdjelice
  let bljesak = $state(0);
  $effect(() => {
    if (otkriveno && izracunaj) untrack(() => bljesak++);
  });
  let opis = $derived(V.opis);
  const ozn = (q) => VELICINE_VEZANJA[q.velicina];
</script>

{#if izracunaj}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="jz-tekst"><Md text={spec.tekst} /></div>
{/if}

{#if nacin === "istrazi"}
  <div class="jzv-izbor" role="group" aria-label="Jezgra">
    {#each izbor as j (j.simbol + j.A)}
      <button
        type="button"
        class="jzv-j"
        class:sel={j.simbol === jezgra.simbol && j.A === jezgra.A}
        aria-pressed={j.simbol === jezgra.simbol && j.A === jezgra.A}
        onclick={() => (jezgra = j)}
        ><Md inline text={mdKratko(zIzSimbola(j.simbol), j.A)} /></button
      >
    {/each}
  </div>
{/if}

<figure class="lx-figure jzv">
  <svg viewBox="0 0 360 200" role="img" aria-label={opis}>
    <!-- stalak i greda -->
    <path
      class="jzv-stalak"
      d="M{C[0]},{C[1]} L{C[0]},186 M{C[0] - 34},186 h68"
    />
    <line
      class="jzv-greda"
      x1={r1(lijevo.x)}
      y1={r1(lijevo.y)}
      x2={r1(desno.x)}
      y2={r1(desno.y)}
    />
    <circle class="jzv-os" cx={C[0]} cy={C[1]} r="5" />
    {#each [lijevo, desno] as p, i (i)}
      <line
        class="jzv-uze"
        x1={r1(p.x)}
        y1={r1(p.y)}
        x2={r1(p.x - 50)}
        y2={r1(p.y + VIS)}
      />
      <line
        class="jzv-uze"
        x1={r1(p.x)}
        y1={r1(p.y)}
        x2={r1(p.x + 50)}
        y2={r1(p.y + VIS)}
      />
      <path
        class="jzv-zdjela"
        d="M{r1(p.x - 58)},{r1(p.y + VIS)} q58,22 116,0 z"
      />
    {/each}
    <!-- lijevo: slobodni nukleoni -->
    <Kuglice
      k={hrpa.map((b, i) => ({ ...b, i }))}
      x={lijevo.x}
      y={lijevo.y + VIS + 3}
    />
    <!-- desno: jezgra -->
    <Kuglice k={kJ} x={desno.x} y={desno.y + VIS - RJ - 2} />
    <text
      class="jzv-t"
      x={r1(lijevo.x)}
      y={r1(lijevo.y + VIS + 26)}
      text-anchor="middle">{V.lijevo}</text
    >
    <text
      class="jzv-t"
      x={r1(desno.x)}
      y={r1(desno.y + VIS + 26)}
      text-anchor="middle">jezgra: {formatNumber(r.m, 5)} u</text
    >
    <Zapis zapis={V.zapis} x={desno.x} y={desno.y + VIS + 46} vel={16} />
    {#if vidiKorak(0)}
      <text
        class="jzv-t jzv-m"
        x={r1(lijevo.x)}
        y={r1(lijevo.y + VIS + 42)}
        text-anchor="middle">{formatNumber(r.slobodno, 5)} u</text
      >
    {/if}
    {#key bljesak}
      {#if vidiKorak(1)}
        <g class="jzv-dm" class:anim={bljesak > 0 || prikaz}>
          <rect x={C[0] - 52} y="60" width="104" height="26" rx="13" />
          <text x={C[0]} y="78" text-anchor="middle"
            >Δm = {formatNumber(r.dm, 5)} u</text
          >
        </g>
      {/if}
    {/key}
  </svg>
</figure>

{#if vidiKorak(0) && vidiKorak(1)}
  <div class="jzv-racun">
    <Md
      inline
      text={`\\(Z m_p + N m_n = ${L.izrazSlobodno.replace(/·/g, "\\cdot").replace(/,/g, "{,}").replace(" u", "\\ \\text{u}")}\\)`}
    />
    <br />
    <Md
      inline
      text={`\\(\\Delta m = ${L.izrazDm.replace(/,/g, "{,}").replace(" u", "\\ \\text{u}")}\\)`}
    />
  </div>
{/if}

{#if lanacVidljiv}
  <div class="jzv-lanac" aria-label="Lanac pretvorbi">
    {#each L.kucice as k, i (k.kljuc)}
      {@const vidi = vidiKorak(1 + i)}
      <span class="jzv-op" class:vidi={i === 0 || vidiKorak(i)}
        >{#if i > 0}<Md inline text={`\\(${L.operacijeTex[i - 1]}\\)`} />
          →{/if}</span
      >
      <div
        class="jzv-k"
        class:trazi={izracunaj && pitaj.some((q) => q.velicina === k.kljuc)}
        class:vidi
      >
        <span class="jzv-k-o">{k.oznaka} =</span>
        <b
          >{#if vidi}<Md inline text={`\\(${k.tex}\\)`} />{:else}?{/if}</b
        >
        <span class="jzv-k-j">{k.jedinica}</span>
      </div>
    {/each}
  </div>
{/if}

{#if izracunaj}
  <div class="jzv-unos">
    {#each pitaj as q (q.velicina)}
      <label class="lx-broj jzv-red">
        <span class="jzv-lbl">{ozn(q).oznaka} =</span>
        <input
          class="inp lx-broj-inp"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          aria-label="{ozn(q).naziv} u {ozn(q).jedinica}"
          bind:value={unos[q.velicina]}
          disabled={locked || pokazi}
          onkeydown={(e) => e.key === "Enter" && provjeri()}
        />
        <span class="lx-unit">{ozn(q).jedinica}</span>
      </label>
    {/each}
  </div>
  <p class="lx-hint">
    <Md
      inline
      text={"\\(1\\ \\text{u} = 1{,}66\\cdot 10^{-27}\\ \\text{kg}\\), \\(c = 3\\cdot 10^{8}\\ \\text{m/s}\\), \\(1\\ \\text{eV} = 1{,}6\\cdot 10^{-19}\\ \\text{J}\\). Potenciju broja 10 piši kao a·10^n."}
    />
  </p>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
  </div>
{:else if prikaz}
  <div class="lx-actions jzv-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={() => (korak = korak >= KORACI ? 0 : korak + 1)}
      >{korak >= KORACI
        ? "Ispočetka"
        : korak === 0
          ? "Počni"
          : "Sljedeći korak"}</button
    >
  </div>
{:else}
  <p class="jzv-ea">
    {imeIzotopa(r.Z, r.A)}: energija vezanja
    <b>{zapisVrijednosti("E", r.E)} MeV</b>, po nukleonu
    <b>{zapisVrijednosti("E_A", r.E_A)} MeV</b>
  </p>
{/if}

<style>
  .jz-tekst {
    margin-bottom: 10px;
  }
  .jzv {
    max-width: 420px;
    margin-bottom: 4px;
  }
  .jzv-izbor {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .jzv-j {
    min-width: 52px;
    min-height: 38px;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 15px;
  }
  .jzv-j.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .jzv-stalak {
    stroke: var(--text-faint);
    stroke-width: 4;
    stroke-linecap: round;
    fill: none;
  }
  .jzv-greda {
    stroke: var(--text-dim);
    stroke-width: 5;
    stroke-linecap: round;
  }
  .jzv-os {
    fill: var(--text);
  }
  .jzv-uze {
    stroke: var(--border-strong);
    stroke-width: 1.2;
  }
  .jzv-zdjela {
    fill: color-mix(in srgb, var(--text-dim) 18%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .jzv-t {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .jzv-m {
    fill: var(--text);
  }
  .jzv-dm rect {
    fill: color-mix(in srgb, var(--warn) 22%, var(--bg-elev));
    stroke: var(--warn);
  }
  .jzv-dm text {
    fill: var(--text);
    font: 700 12px var(--font-sans);
  }
  .jzv-dm.anim {
    animation: jzv-isparava 0.9s ease-out;
    transform-origin: 180px 73px;
  }
  @keyframes jzv-isparava {
    0% {
      opacity: 0;
      transform: translateY(40px) scale(0.6);
    }
    60% {
      opacity: 1;
      transform: translateY(-4px) scale(1.08);
    }
    100% {
      transform: none;
    }
  }
  .jzv-racun {
    text-align: center;
    font-size: 14px;
    margin-bottom: 8px;
    overflow-x: auto;
  }
  .jzv-lanac {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: center;
    gap: 4px 8px;
    max-width: 440px;
    margin: 0 auto 10px;
  }
  .jzv-k {
    display: grid;
    grid-template-columns: 44px minmax(96px, auto) 84px;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    font-size: 13px;
    transition: border-color 0.3s;
  }
  .jzv-k b {
    font-weight: 700;
    font-size: 14px;
    color: var(--text);
    text-align: right;
  }
  .jzv-k.trazi {
    border-color: var(--primary-border);
    border-style: dashed;
  }
  .jzv-k.trazi.vidi {
    border-style: solid;
    border-color: var(--success);
  }
  .jzv-k-o,
  .jzv-k-j {
    color: var(--text-dim);
  }
  .jzv-op {
    font-size: 12.5px;
    color: var(--text-faint);
    text-align: right;
    white-space: nowrap;
  }
  .jzv-op.vidi {
    color: var(--text-dim);
  }
  .jzv-unos {
    display: grid;
    gap: 8px;
    justify-content: center;
  }
  .jzv-red {
    justify-content: flex-start;
  }
  .jzv-lbl {
    min-width: 48px;
    text-align: right;
    font-weight: 600;
  }
  .jzv-ea {
    text-align: center;
    font-size: 14px;
    color: var(--text-dim);
    margin: 0;
  }
  .jzv-ea b {
    color: var(--text);
  }
  .jzv-akcije {
    justify-content: center;
  }
</style>
