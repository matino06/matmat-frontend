<script>
  // Graf niza: točke (n, aₙ) bez spajanja, isprekidani pravac limesa, podnizovi u boji, ε-pojas (ili aₙ > M) s
  // istaknutim članovima izvan pojasa i n₀, te paukova mreža rekurzije. „istrazi“ ima klizač za ε (ili M); „n0“ je
  // polje za n₀, a pojas i n₀ crtaju se tek nakon točnog odgovora ili „Pokaži točan odgovor“, da crtež ne oda odgovor.
  // Sve brojeve računa katalog (katalog/analiza/niz.js), ovdje se samo crta.
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import { formatNumber } from "../../core/number.js";
  import { tocanOdgovor } from "../../katalog/index.js";
  import { crtezNiza, paukovaMreza, nNula, vrijednostiKlizaca, brojIzSpeca, ispisPojasa, texBroj } from "../../katalog/analiza/niz.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const r1 = (n) => Math.round(n * 10) / 10;
  const SUB = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
  const indeks = (n) => [...String(n)].map((c) => SUB[c] ?? c).join("");

  const model = $derived.by(() => {
    try {
      return crtezNiza(spec);
    } catch {
      return null;
    }
  });
  const lim = $derived(model?.lim && !model.lim.greska ? model.lim : null);
  const istrazi = $derived(spec.nacin === "istrazi");
  const n0nacin = $derived(spec.nacin === "n0");
  const otkriveno = $derived(n0nacin && (!!ishod?.tocno || pokazi));

  // ── klizač (istrazi) ──
  const vrijednosti = $derived(istrazi ? vrijednostiKlizaca(spec) : []);
  let izbor = $state(0);
  const naKlizacu = $derived(vrijednosti[Math.min(izbor, vrijednosti.length - 1)]);

  // ── pojas: u „istrazi“ uvijek, u „n0“ tek nakon odgovora ──
  const pojas = $derived.by(() => {
    if (!lim) return null;
    const v = istrazi ? naKlizacu : otkriveno ? brojIzSpeca(lim.inf ? spec.M : spec.epsilon) : null;
    if (v == null) return null;
    try {
      return nNula(spec, v);
    } catch {
      return null;
    }
  });
  const ispis = $derived(pojas ? ispisPojasa(spec, pojas) : "");

  // ── okvir crteža ──
  const W = 400;
  const H = 250;
  const T = 14;
  const B = 26;
  const R = 16;
  const ty = $derived.by(() => {
    if (!model) return [];
    const out = [];
    for (let i = Math.ceil(model.y0 / model.korak - 1e-9); i * model.korak <= model.y1 + 1e-9 && out.length < 40; i++) out.push(i * model.korak);
    return out;
  });
  const L = $derived(Math.max(34, 12 + 6.6 * Math.max(...ty.map((y) => formatNumber(y).length), 1)));
  const x1 = $derived(model ? model.N + 0.6 : 1);
  const X = (n) => L + (n / x1) * (W - L - R);
  const Y = (y) => H - B - ((y - model.y0) / (model.y1 - model.y0)) * (H - T - B);
  const oy = $derived(model && model.y0 <= 0 && model.y1 >= 0 ? 0 : model?.y0);
  const tx = $derived.by(() => {
    if (!model) return [];
    const out = [];
    for (let n = model.korakX; n <= model.N; n += model.korakX) out.push(n);
    return out;
  });
  const uCrtezu = (y) => model && y >= model.y0 - 1e-9 && y <= model.y1 + 1e-9;
  const klip = (y) => Math.min(H - B, Math.max(T, Y(y)));

  const boja = (t) => (t.podniz >= 0 ? model.podnizovi[t.podniz].css : model.podnizovi.length ? "var(--text-faint)" : "var(--primary)");
  const rTocke = $derived(model ? (model.N <= 15 ? 4.2 : model.N <= 30 ? 3.6 : 3) : 4);
  const vani = (t) => !!pojas && !pojas.uvjet.unutra(t.a);

  // pojas kao pravokutnik (u px): ⟨L−ε, L+ε⟩ ili iznad / ispod M
  const traka = $derived.by(() => {
    if (!pojas || !model) return null;
    const u = pojas.uvjet;
    const [a, b] = u.vrsta === "eps" ? [u.L - u.e, u.L + u.e] : u.smjer > 0 ? [u.M, model.y1] : [model.y0, u.M];
    const [ya, yb] = [klip(b), klip(a)];
    if (yb - ya < 0.5 && !(u.vrsta === "eps" && uCrtezu(u.L))) return null;
    return { y: ya, h: Math.max(yb - ya, 1.2), rubovi: (u.vrsta === "eps" ? [a, b] : [u.M]).filter(uCrtezu) };
  });

  // ── paukova mreža ──
  const pauk = $derived.by(() => {
    if (!spec.paukova_mreza || spec.nacin !== "prikaz") return null;
    try {
      return paukovaMreza(spec);
    } catch {
      return null;
    }
  });
  const PW = 400;
  const PH = 300;
  const PL = 34;
  const PX = (x) => PL + ((x - pauk.x0) / (pauk.x1 - pauk.x0)) * (PW - PL - R);
  const PY = (y) => PH - B - ((y - pauk.x0) / (pauk.x1 - pauk.x0)) * (PH - T - B);
  const pt = $derived.by(() => {
    if (!pauk) return [];
    const out = [];
    for (let i = Math.ceil(pauk.x0 / pauk.korak - 1e-9); i * pauk.korak <= pauk.x1 + 1e-9 && out.length < 30; i++) out.push(i * pauk.korak);
    return out;
  });
  const po = $derived(pauk && pauk.x0 <= 0 && pauk.x1 >= 0 ? 0 : pauk?.x0);
  const krivuljaF = $derived.by(() => {
    if (!pauk) return [];
    const segs = [];
    let cur = [];
    for (let k = 0; k <= 240; k++) {
      const x = pauk.x0 + ((pauk.x1 - pauk.x0) * k) / 240;
      const y = pauk.f(x);
      if (Number.isFinite(y) && y >= pauk.x0 - (pauk.x1 - pauk.x0) && y <= pauk.x1 + (pauk.x1 - pauk.x0)) cur.push(`${r1(PX(x))},${r1(PY(y))}`);
      else if (cur.length) segs.push(cur), (cur = []);
    }
    if (cur.length) segs.push(cur);
    return segs.filter((s) => s.length > 1).map((s) => s.join(" "));
  });
  const stepenice = $derived(pauk ? pauk.put.map(([x, y]) => `${r1(PX(x))},${r1(PY(y))}`).join(" ") : "");

  // ── tekst ──
  const ime = $derived(model?.ime ?? "a");
  const opis = $derived(model ? `Graf niza: točke (n, ${ime}ₙ) za n od 1 do ${model.N}${lim && !n0nacin && lim.L != null ? `, limes ${formatNumber(lim.L)}` : ""}.` : "Graf niza.");
  const oznakaKlizaca = $derived(lim?.inf ? "M" : "\\varepsilon");
  const vrijednostTex = (v) => (v == null ? "" : texBroj(v, 6));
</script>

{#if n0nacin}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <Md text={spec.tekst} />
{/if}
{#if istrazi}<p class="lx-hint">Pomiči klizač i gledaj koji su članovi izvan pojasa – ovo nije zadatak.</p>{/if}

{#if !model}
  <p class="lx-solution">Niz se ne može nacrtati.</p>
{:else}
  <div class="lx-figure nz">
    <svg viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
      <defs>
        <clipPath id="nz-klip-{uid}"><rect x={L} y={T} width={W - L - R} height={H - T - B} /></clipPath>
      </defs>
      {#each ty as y (y)}<line class="nz-grid" x1={X(0)} y1={Y(y)} x2={X(x1)} y2={Y(y)} />{/each}
      {#each tx as n (n)}<line class="nz-grid" x1={X(n)} y1={Y(model.y0)} x2={X(n)} y2={Y(model.y1)} />{/each}

      {#if traka}
        <rect class="nz-pojas" x={L} y={traka.y} width={W - L - R} height={traka.h} />
        {#each traka.rubovi as y, j (j)}<line class="nz-pojas-rub" x1={L} y1={Y(y)} x2={W - R} y2={Y(y)} />{/each}
      {/if}

      <line class="nz-axis" x1={X(0)} y1={Y(oy)} x2={X(x1)} y2={Y(oy)} />
      <line class="nz-axis" x1={X(0)} y1={Y(model.y0)} x2={X(0)} y2={Y(model.y1)} />
      {#each tx as n (n)}<text class="nz-tick" x={X(n)} y={Y(oy) + 13} text-anchor="middle" dominant-baseline="middle">{n}</text>{/each}
      {#each ty as y (y)}<text class="nz-tick" x={X(0) - 6} y={Y(y)} text-anchor="end" dominant-baseline="middle">{formatNumber(y)}</text>{/each}
      <text class="nz-tick nz-os" x={X(x1) - 2} y={Y(oy) - 8} text-anchor="end">n</text>
      <text class="nz-tick nz-os" x={X(0) + 7} y={T + 9} text-anchor="start">{ime}<tspan dy="0.3em" font-size="0.75em">n</tspan></text>

      <g clip-path="url(#nz-klip-{uid})">
        {#each model.podnizovi as p, j (j)}
          {#if p.L != null && uCrtezu(p.L)}<line class="nz-limes" style="stroke: {p.css}" x1={L} y1={Y(p.L)} x2={W - R} y2={Y(p.L)} />{/if}
        {/each}
        {#if lim?.L != null && uCrtezu(lim.L)}<line class="nz-limes" x1={L} y1={Y(lim.L)} x2={W - R} y2={Y(lim.L)} />{/if}
        {#if pojas && pojas.n0 <= model.N}
          <line class="nz-n0" x1={X(pojas.n0)} y1={T} x2={X(pojas.n0)} y2={H - B} />
        {/if}
        {#each model.tocke as t (t.n)}
          {#if uCrtezu(t.a)}
            {#if vani(t)}<circle class="nz-vani" cx={X(t.n)} cy={Y(t.a)} r={rTocke + 2.4} />{/if}
            <circle class="nz-pt" class:blijedo={!!pojas && !vani(t)} cx={X(t.n)} cy={Y(t.a)} r={rTocke} style="fill: {boja(t)}" />
          {/if}
        {/each}
      </g>
      {#if lim?.L != null && uCrtezu(lim.L)}<text class="nz-lbl" x={W - R - 2} y={Y(lim.L) - 6} text-anchor="end">L</text>{/if}
      {#if pojas && pojas.n0 <= model.N}
        <text class="nz-lbl nz-n0-t" x={X(pojas.n0) + (pojas.n0 > model.N * 0.75 ? -5 : 5)} y={T + 10} text-anchor={pojas.n0 > model.N * 0.75 ? "end" : "start"}>n{indeks(0)} = {pojas.n0}</text>
      {/if}
    </svg>
  </div>

    {#if model.podnizovi.length || lim?.L != null || traka || (pojas && pojas.n0 > 1)}
      <div class="nz-legenda">
        {#each model.podnizovi as p, j (j)}
          <span><i class="nz-tocka" style="background: {p.css}"></i><Md text={p.oznaka + (p.clanTex ? `: $${p.clanTex}$` : "")} inline /></span>
        {/each}
        {#if model.podnizovi.length && model.tocke.some((t) => t.podniz < 0)}<span><i class="nz-tocka" style="background: var(--text-faint)"></i>ostali članovi</span>{/if}
        {#if lim?.L != null}<span><i class="nz-crta"></i><Md text={`$L = ${lim.tex}$`} inline /></span>{/if}
        {#if traka && pojas.uvjet.vrsta === "eps"}<span><i class="nz-traka"></i><Md text="pojas $\langle L-\varepsilon, L+\varepsilon\rangle$" inline /></span>{/if}
        {#if traka && pojas.uvjet.vrsta === "M"}<span><i class="nz-traka"></i><Md text={pojas.uvjet.smjer > 0 ? "$y > M$" : "$y < M$"} inline /></span>{/if}
        {#if pojas && pojas.n0 > 1}<span><i class="nz-prsten"></i>{pojas.uvjet.vrsta === "eps" ? "izvan pojasa" : pojas.uvjet.smjer > 0 ? "nije veći od M" : "nije manji od M"}</span>{/if}
      </div>
    {/if}

  {#if istrazi && vrijednosti.length}
    <div class="nz-klizac">
      <label for="nz-{uid}"><Md text={`$${oznakaKlizaca}$`} inline /></label>
      <input
        id="nz-{uid}"
        type="range"
        min="0"
        max={vrijednosti.length - 1}
        step="1"
        bind:value={izbor}
        aria-label={lim?.inf ? "M, granica" : "ε, polovina širine pojasa"}
        aria-valuetext={`${lim?.inf ? "M" : "ε"} = ${formatNumber(naKlizacu)}`}
      />
      <output for="nz-{uid}" class="nz-vr"><Md text={`$${oznakaKlizaca} = ${vrijednostTex(naKlizacu)}$`} inline /></output>
    </div>
  {/if}

  {#if ispis}
    <div class="nz-ispis" aria-live="polite"><Md text={ispis} /></div>
  {/if}

  {#if pauk}
    <div class="lx-figure nz">
      <svg viewBox="0 0 {PW} {PH}" role="img" aria-label="Paukova mreža: krivulja y = f(x), pravac y = x i stepenice od a₁ prema limesu.">
        <defs>
          <clipPath id="nz-pklip-{uid}"><rect x={PL} y={T} width={PW - PL - R} height={PH - T - B} /></clipPath>
        </defs>
        {#each pt as v (v)}
          <line class="nz-grid" x1={PX(v)} y1={PY(pauk.x0)} x2={PX(v)} y2={PY(pauk.x1)} />
          <line class="nz-grid" x1={PX(pauk.x0)} y1={PY(v)} x2={PX(pauk.x1)} y2={PY(v)} />
        {/each}
        <line class="nz-axis" x1={PX(pauk.x0)} y1={PY(po)} x2={PX(pauk.x1)} y2={PY(po)} />
        <line class="nz-axis" x1={PX(po)} y1={PY(pauk.x0)} x2={PX(po)} y2={PY(pauk.x1)} />
        {#each pt as v (v)}
          {#if Math.abs(v - po) > 1e-9}
            <text class="nz-tick" x={PX(v)} y={PY(po) + 13} text-anchor="middle" dominant-baseline="middle">{formatNumber(v)}</text>
            <text class="nz-tick" x={PX(po) - 6} y={PY(v)} text-anchor="end" dominant-baseline="middle">{formatNumber(v)}</text>
          {/if}
        {/each}
        <text class="nz-tick nz-os" x={PX(pauk.x1) - 2} y={PY(po) - 8} text-anchor="end">x</text>
        <text class="nz-tick nz-os" x={PX(po) + 7} y={T + 9} text-anchor="start">y</text>
        <g clip-path="url(#nz-pklip-{uid})">
          <line class="nz-dijagonala" x1={PX(pauk.x0)} y1={PY(pauk.x0)} x2={PX(pauk.x1)} y2={PY(pauk.x1)} />
          {#each krivuljaF as pts, j (j)}<polyline class="nz-f" points={pts} />{/each}
          <polyline class="nz-stepenice" points={stepenice} />
          {#each pauk.a as a, j (j)}<circle class="nz-pt" cx={PX(a)} cy={PY(a)} r="3" style="fill: var(--warn)" />{/each}
        </g>
        <circle class="nz-pt" cx={PX(pauk.a[0])} cy={PY(po)} r="4" style="fill: var(--warn)" />
        <text class="nz-lbl" x={PX(pauk.a[0]) - 7} y={PY(po) - 8} text-anchor="end">{ime}{indeks(1)}</text>
        <text class="nz-lbl nz-dijagonala-t" x={PX(pauk.x1) - 4} y={PY(pauk.x1) + 16} text-anchor="end">y = x</text>
      </svg>
    </div>
      <div class="nz-legenda">
        <span><i class="nz-crta-puna"></i><Md text={`$y = ${pauk.fTex}$`} inline /></span>
        <span><i class="nz-crta-dij"></i><Md text="$y = x$" inline /></span>
        <span><i class="nz-crta-step"></i><Md text={`stepenice od $${ime}_1$`} inline /></span>
      </div>
  {/if}

  {#if n0nacin}
    <div class="nz-odgovor">
      <span class="nz-odgovor-lbl"><Md text="$n_0 =$" inline /></span>
      <BrojUnos {locked} {ishod} {onodgovor} oznaka="n₀, prirodan broj" gumbPredznak={false} gumbPotencija={false} />
    </div>
    {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
  {/if}
{/if}

<style>
  .lx-figure.nz {
    max-width: 540px;
  }
  .nz-grid {
    stroke: var(--border);
    stroke-width: 1;
  }
  .nz-axis {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .nz-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .nz-os {
    font-style: italic;
    font-size: 12px;
  }
  .nz-lbl {
    fill: var(--text);
    font: 600 12.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .nz-pt {
    stroke: var(--bg-elev);
    stroke-width: 1.2;
  }
  .nz-pt.blijedo {
    opacity: 0.8;
  }
  .nz-vani {
    fill: none;
    stroke: var(--danger);
    stroke-width: 2;
  }
  .nz-limes {
    stroke: var(--text-dim);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
  }
  .nz-pojas {
    fill: color-mix(in srgb, var(--success) 16%, transparent);
  }
  .nz-pojas-rub {
    stroke: var(--success);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.8;
  }
  .nz-n0 {
    stroke: var(--success);
    stroke-width: 1.6;
    stroke-dasharray: 5 4;
  }
  .nz-n0-t {
    fill: var(--success);
  }
  .nz-dijagonala {
    stroke: var(--text-faint);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
  }
  .nz-dijagonala-t {
    fill: var(--text-dim);
    font-weight: 500;
  }
  .nz-f {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2.4;
    stroke-linejoin: round;
  }
  .nz-stepenice {
    fill: none;
    stroke: var(--warn);
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  .nz-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 16px;
    margin: -6px auto 10px;
    max-width: 540px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .nz-legenda span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .nz-legenda i {
    display: inline-block;
    flex: none;
  }
  .nz-tocka {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .nz-prsten {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--danger);
  }
  .nz-crta,
  .nz-crta-dij {
    width: 18px;
    height: 0;
    border-top: 2px dashed var(--text-dim);
  }
  .nz-crta-dij {
    border-top-color: var(--text-faint);
  }
  .nz-crta-puna {
    width: 18px;
    height: 3px;
    border-radius: 2px;
    background: var(--primary);
  }
  .nz-crta-step {
    width: 18px;
    height: 2px;
    background: var(--warn);
  }
  .nz-traka {
    width: 18px;
    height: 10px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--success) 22%, transparent);
    border: 1px dashed var(--success);
  }
  .nz-klizac {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    align-items: center;
    gap: 10px;
    max-width: 440px;
    margin: 4px auto 8px;
  }
  .nz-klizac label {
    color: var(--text-dim);
    text-align: right;
  }
  .nz-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 32px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .nz-vr {
    min-width: 76px;
    font-size: 15px;
    color: var(--text);
    white-space: nowrap;
  }
  .nz-ispis {
    max-width: 440px;
    margin: 0 auto 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 14px;
    color: var(--text);
  }
  .nz-odgovor {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .nz-odgovor-lbl {
    font-size: 17px;
    white-space: nowrap;
  }
</style>
