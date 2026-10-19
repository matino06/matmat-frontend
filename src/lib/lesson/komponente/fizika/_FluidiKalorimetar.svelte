<script>
  // Kalorimetrija (krivulja_zagrijavanja, vrsta "mijesanje" ili "grijac"): graf temperature u vremenu i stupci
  // topline. Miješanje: temperature se približavaju konačnoj t = Σmct₀ / Σmc (prikaz eksponencijalan, vrijeme bez
  // brojeva), predana toplina uvijek je jednaka primljenoj. Grijač: temperatura raste jednoliko, a toplina se dijeli
  // na vodu i posudu. Brojeve računa katalog (tKonacna, grijanje).
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import {
    tKonacna,
    grijanje,
  } from "$lib/lesson/katalog/fizika/krivulja_zagrijavanja.js";
  import {
    fmtBroj,
    fmtJ,
    fmtMasa,
  } from "$lib/lesson/katalog/fizika/_fluidi.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const W = 360;
  const H = 200;
  const L = 46;
  const D = 16;
  const T = 18;
  const B = 28;
  const PW = W - L - D;
  const BRZINA = 5; // e^(−5) na kraju prikaza: temperature su praktički izjednačene

  let vrsta = $derived(spec.vrsta);
  let nacin = $derived(spec.nacin);
  let otkriveno = $derived(nacin === "istrazi" || pokazi || !!ishod?.tocno);

  // istrazi miješanja: mase se mogu mijenjati
  let mase = $state(untrack(() => (spec.tijela ?? []).map((t) => t.m)));
  let tijela = $derived(
    spec.tijela.map((t, i) =>
      vrsta === "mijesanje" && nacin === "istrazi" ? { ...t, m: mase[i] } : t,
    ),
  );
  let tk = $derived(vrsta === "mijesanje" ? tKonacna(tijela) : null);
  let gr = $derived(vrsta === "grijac" ? grijanje(spec) : null);

  // ── vrijeme prikaza: tau od 0 do 1 ──
  let tau = $state(0);
  let tece = $state(false);
  let raf = null;
  function stani() {
    tece = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }
  function pusti() {
    if (tece) return stani();
    if (tau >= 1) tau = 0;
    if (prefersReducedMotion.current) {
      tau = 1;
      return;
    }
    tece = true;
    let prije = null;
    const trajanje = vrsta === "mijesanje" ? 3.2 : 4.5;
    const petlja = (ms) => {
      const dt = prije == null ? 0 : Math.min(0.05, (ms - prije) / 1000);
      prije = ms;
      tau = Math.min(1, tau + dt / trajanje);
      if (tau >= 1) return stani();
      raf = requestAnimationFrame(petlja);
    };
    raf = requestAnimationFrame(petlja);
  }
  $effect(() => () => stani());
  // nakon točnog odgovora (ili „pokaži“) animacija se sama pokrene
  $effect(() => {
    if (nacin === "predvidi" && otkriveno)
      untrack(() => ((tau = 0), stani(), pusti()));
  });
  // promjena mase u istrazi: graf ostaje, samo se preračuna (bez ponovnog pokretanja)

  // ── os y ──
  let Traspon = $derived.by(() => {
    const vals =
      vrsta === "mijesanje" ? tijela.map((t) => t.t0) : [spec.t0, spec.t1];
    const a = Math.min(...vals);
    const b = Math.max(...vals);
    const p = (b - a) * 0.12;
    return [a - p, b + p];
  });
  function lijepiKorak(raspon, koliko = 5) {
    const raw = raspon / koliko;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= raw) return k * p;
    return 10 * p;
  }
  let yK = $derived(lijepiKorak(Traspon[1] - Traspon[0]));
  let yTicks = $derived.by(() => {
    const out = [];
    for (
      let v = Math.ceil(Traspon[0] / yK) * yK;
      v <= Traspon[1] + 1e-9;
      v += yK
    )
      out.push(Math.round(v / yK) * yK);
    return out;
  });
  const Y = (t) =>
    H - B - ((t - Traspon[0]) / (Traspon[1] - Traspon[0])) * (H - T - B);
  const X = (u) => L + u * PW;
  const r1 = (v) => Math.round(v * 10) / 10;

  // ── miješanje ──
  const Tmij = (t, u) => tk + (t.t0 - tk) * Math.exp(-BRZINA * u);
  const BOJA_TOPLO = "var(--danger)";
  const BOJA_HLADNO = "var(--lx-water)";
  const BOJE_GRIJAC = ["var(--lx-water)", "var(--text-dim)", "var(--warn)"];
  let boje = $derived(
    tijela.map((t, i) =>
      vrsta === "grijac"
        ? BOJE_GRIJAC[i]
        : t.t0 > tk
          ? BOJA_TOPLO
          : BOJA_HLADNO,
    ),
  );
  let krivulje = $derived(
    vrsta === "mijesanje"
      ? tijela.map((t) => {
          const pts = [];
          const k = Math.max(1, Math.round(tau * 60));
          for (let j = 0; j <= k; j++) {
            const u = (tau * j) / k;
            pts.push(`${r1(X(u))},${r1(Y(Tmij(t, u)))}`);
          }
          return pts.join(" ");
        })
      : [],
  );
  let Qmij = $derived.by(() => {
    if (vrsta !== "mijesanje") return null;
    const predano = tijela.reduce(
      (a, t) => a + (t.t0 > tk ? t.m * t.c * (t.t0 - Tmij(t, tau)) : 0),
      0,
    );
    const primljeno = tijela.reduce(
      (a, t) => a + (t.t0 < tk ? t.m * t.c * (Tmij(t, tau) - t.t0) : 0),
      0,
    );
    const max = tijela.reduce(
      (a, t) => a + (t.t0 > tk ? t.m * t.c * (t.t0 - tk) : 0),
      0,
    );
    return { predano, primljeno, max };
  });

  // ── grijač ──
  // crtice na okruglim sekundama (0, 20, 40 …), kao udio ukupnog vremena; zadnja ne smije biti pretijesno uz kraj
  let tTicks = $derived.by(() => {
    if (vrsta !== "grijac" || !gr?.t) return [];
    const k = lijepiKorak(gr.t, 4);
    const out = [];
    for (let v = 0; v <= gr.t + 1e-9; v += k) out.push(v / gr.t);
    return out.filter((u) => u <= 1 + 1e-9);
  });
  let Tgr = $derived(
    vrsta === "grijac" ? spec.t0 + tau * (spec.t1 - spec.t0) : null,
  );
  let Qgr = $derived(vrsta === "grijac" ? gr.Qi.map((q) => q * tau) : []);

  // ── odgovor ──
  const JED = { t_konacna: "°C", Q: "J", t_grijanja: "s" };
  let jedinica = $derived(spec.jedinica ?? JED[spec.pitaj] ?? "");
  let unos = $state("");

  const fT = (t) => `${formatNumber(Math.round(t * 10) / 10)} °C`;
  let opis = $derived(
    vrsta === "mijesanje"
      ? `Miješanje: ${tijela.map((t) => `${t.naziv} ${fmtMasa(t.m)} na ${fT(t.t0)}`).join(", ")}.${otkriveno && tau > 0 ? ` Konačna temperatura ${fT(tk)}.` : ""}`
      : `Grijač ${fmtBroj(spec.snaga)} W grije ${tijela.map((t) => `${t.naziv} ${fmtMasa(t.m)}`).join(" i ")} od ${fT(spec.t0)} do ${fT(spec.t1)}.`,
  );
</script>

{#if nacin === "istrazi"}
  <div class="fk-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<div class="fk-tijela">
  {#each tijela as t, i (i)}
    <div class="fk-tijelo" style:--fk-boja={boje[i]}>
      <span class="fk-ime">{t.naziv}</span>
      <span class="mono"
        >{fmtMasa(t.m)} · c = {fmtBroj(t.c)}{vrsta === "mijesanje"
          ? ` · ${fT(t.t0)}`
          : ""}</span
      >
    </div>
  {/each}
  {#if vrsta === "grijac"}
    <div class="fk-tijelo fk-grijac">
      <span class="fk-ime">grijač</span>
      <span class="mono"
        >P = {fmtBroj(spec.snaga)} W · {fT(spec.t0)} → {fT(spec.t1)}</span
      >
    </div>
  {/if}
</div>

<figure class="lx-figure fk">
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
    {#each yTicks as t (t)}
      <line class="fk-mreza" x1={L} y1={r1(Y(t))} x2={W - D} y2={r1(Y(t))} />
      <text class="fk-tick" x={L - 6} y={r1(Y(t)) + 4} text-anchor="end"
        >{formatNumber(t)}</text
      >
    {/each}
    <line class="fk-os" x1={L} y1={T - 6} x2={L} y2={H - B} />
    <line class="fk-os" x1={L} y1={H - B} x2={W - D + 4} y2={H - B} />
    <text class="fk-osT" x={L - 6} y={T - 8} text-anchor="end">t (°C)</text>

    {#if vrsta === "mijesanje"}
      <text class="fk-osT" x={W - D} y={H - 8} text-anchor="end">vrijeme →</text
      >
      {#if otkriveno && tau > 0}
        <line class="fk-tk" x1={L} y1={r1(Y(tk))} x2={W - D} y2={r1(Y(tk))} />
        <text
          class="fk-tk-t"
          class:ok={nacin === "predvidi"}
          x={W - D - 2}
          y={r1(Y(tk)) - 6}
          text-anchor="end">t = {fT(tk)}</text
        >
      {/if}
      {#each tijela as t, i (i)}
        {#if otkriveno && tau > 0}
          <polyline
            class="fk-krivulja"
            style:--fk-boja={boje[i]}
            points={krivulje[i]}
          />
          <circle
            class="fk-tocka"
            style:--fk-boja={boje[i]}
            cx={r1(X(tau))}
            cy={r1(Y(Tmij(t, tau)))}
            r="5"
          />
        {/if}
        <circle
          class="fk-tocka"
          style:--fk-boja={boje[i]}
          cx={X(0)}
          cy={r1(Y(t.t0))}
          r="5"
        />
      {/each}
      {#if !otkriveno}
        <text
          class="fk-upitnik"
          x={W - D - 16}
          y={(Y(Traspon[0]) + Y(Traspon[1])) / 2 + 6}
          text-anchor="middle">?</text
        >
      {/if}
    {:else}
      {@const xKraj = X(1)}
      {#if otkriveno}
        {#each tTicks as u (u)}
          <line
            class="fk-os"
            x1={r1(X(u))}
            y1={H - B}
            x2={r1(X(u))}
            y2={H - B + 4}
          />
          <text class="fk-tick" x={r1(X(u))} y={H - B + 15} text-anchor="middle"
            >{formatNumber(Math.round(u * gr.t))}</text
          >
        {/each}
        <text class="fk-osT" x={W - D} y={H - 1} text-anchor="end"
          >vrijeme (s)</text
        >
      {:else}
        <text class="fk-osT" x={W - D} y={H - 8} text-anchor="end"
          >vrijeme →</text
        >
      {/if}
      <line
        class="fk-pravac"
        x1={X(0)}
        y1={r1(Y(spec.t0))}
        x2={xKraj}
        y2={r1(Y(spec.t1))}
      />
      {#if tau > 0}
        <line
          class="fk-pravac fk-zivo"
          x1={X(0)}
          y1={r1(Y(spec.t0))}
          x2={r1(X(tau))}
          y2={r1(Y(Tgr))}
        />
      {/if}
      <circle
        class="fk-tocka"
        style:--fk-boja="var(--danger)"
        cx={r1(X(tau))}
        cy={r1(Y(Tgr))}
        r="5.5"
      />
    {/if}
  </svg>
</figure>

{#if vrsta === "mijesanje" && otkriveno && Qmij}
  <div class="fk-stupci" aria-live="polite">
    <div class="fk-stupac">
      <span>predano (toplije)</span>
      <span class="fk-traka"
        ><span
          style:width="{(Qmij.predano / Qmij.max) * 100}%"
          style:background={BOJA_TOPLO}
        ></span></span
      >
      <span class="mono">{fmtJ(Qmij.predano, "J", 3)}</span>
    </div>
    <div class="fk-stupac">
      <span>primljeno (hladnije)</span>
      <span class="fk-traka"
        ><span
          style:width="{(Qmij.primljeno / Qmij.max) * 100}%"
          style:background={BOJA_HLADNO}
        ></span></span
      >
      <span class="mono">{fmtJ(Qmij.primljeno, "J", 3)}</span>
    </div>
  </div>
{:else if vrsta === "grijac"}
  <div class="fk-stupci" aria-live="polite">
    {#each tijela as t, i (i)}
      <div class="fk-stupac">
        <span>{t.naziv}</span>
        <span class="fk-traka"
          ><span
            style:width="{(Qgr[i] / gr.Q) * 100}%"
            style:background={boje[i]}
          ></span></span
        >
        <span class="mono">{otkriveno ? fmtJ(Qgr[i], "J", 3) : "?"}</span>
      </div>
    {/each}
    {#if otkriveno}
      <p class="lx-readout fk-zbroj">
        t = {fmtJ(tau * gr.t, "s", 3)} · {fT(Tgr)} · Q =
        <b>{fmtJ(gr.Q * tau, "J", 3)}</b>
      </p>
    {/if}
  </div>
{/if}

{#if nacin === "istrazi"}
  {#if vrsta === "mijesanje"}
    <div class="fk-klizaci">
      {#each spec.tijela as t, i (i)}
        <div class="fk-klizac">
          <div class="fk-kl-head">
            <label for="fk-{uid}-{i}">masa: {t.naziv}</label>
            <output for="fk-{uid}-{i}" class="mono">{fmtMasa(mase[i])}</output>
          </div>
          <input
            id="fk-{uid}-{i}"
            type="range"
            min="0.05"
            max={Math.max(1, Math.ceil(t.m * 2 * 10) / 10)}
            step="0.05"
            bind:value={mase[i]}
            oninput={() => (tau = tau > 0 ? 1 : 0)}
          />
        </div>
      {/each}
    </div>
  {:else}
    <div class="fk-klizac fk-vrijeme">
      <div class="fk-kl-head">
        <label for="fk-{uid}-t">vrijeme grijanja</label>
        <output for="fk-{uid}-t" class="mono">{fmtJ(tau * gr.t, "s", 3)}</output
        >
      </div>
      <input
        id="fk-{uid}-t"
        type="range"
        min="0"
        max="1"
        step="0.005"
        bind:value={tau}
        oninput={stani}
      />
    </div>
  {/if}
  <div class="lx-actions fk-akcije">
    <button type="button" class="btn btn-primary" onclick={pusti}>
      {#if tece}Zaustavi{:else if vrsta === "mijesanje"}{tau > 0
          ? "Pomiješaj ponovno"
          : "Pomiješaj"}{:else}{tau >= 1 ? "Ispočetka" : "Uključi grijač"}{/if}
    </button>
  </div>
{:else}
  {#if !otkriveno}<p class="fk-hint">
      Izračunaj i upiši – nakon točnog odgovora vidjet ćeš što se događa.
    </p>{/if}
  <BrojUnos
    {jedinica}
    {locked}
    {ishod}
    bind:vrijednost={unos}
    {onodgovor}
    oznaka={vrsta === "mijesanje" ? "Konačna temperatura" : "Odgovor"}
  />
{/if}

<style>
  .fk-tekst {
    margin-bottom: 12px;
  }
  .fk {
    max-width: 460px;
    margin-bottom: 6px;
  }
  .fk-tijela {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin-bottom: 8px;
  }
  .fk-tijelo {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-left: 4px solid var(--fk-boja, var(--border-strong));
    border-radius: var(--r-md);
    background: var(--bg-elev);
    font-size: 12.5px;
  }
  .fk-grijac {
    --fk-boja: var(--danger);
  }
  .fk-ime {
    font-weight: 600;
    color: var(--text);
  }
  .fk-tijelo .mono {
    color: var(--text-dim);
  }
  .fk-mreza {
    stroke: var(--border);
  }
  .fk-os {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .fk-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .fk-osT {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .fk-krivulja {
    fill: none;
    stroke: var(--fk-boja);
    stroke-width: 2.6;
    stroke-linejoin: round;
  }
  .fk-tocka {
    fill: var(--fk-boja);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .fk-tk {
    stroke: var(--text-dim);
    stroke-dasharray: 5 4;
  }
  .fk-tk-t {
    fill: var(--text);
    font: 700 12.5px var(--font-mono);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .fk-tk-t.ok {
    fill: var(--success);
  }
  .fk-upitnik {
    fill: var(--primary);
    font: 700 22px var(--font-sans);
  }
  .fk-pravac {
    stroke: var(--border-strong);
    stroke-width: 2;
    stroke-dasharray: 4 4;
  }
  .fk-pravac.fk-zivo {
    stroke: var(--danger);
    stroke-width: 2.6;
    stroke-dasharray: none;
  }
  .fk-stupci {
    display: grid;
    gap: 6px;
    max-width: 440px;
    margin: 0 auto 8px;
    font-size: 12.5px;
  }
  .fk-stupac {
    display: grid;
    grid-template-columns: 9.5em 1fr 6.5em;
    gap: 8px;
    align-items: center;
  }
  .fk-stupac > span:first-child {
    color: var(--text-dim);
  }
  .fk-stupac .mono {
    text-align: right;
  }
  .fk-traka {
    height: 12px;
    border-radius: 6px;
    background: var(--border);
    overflow: hidden;
  }
  .fk-traka > span {
    display: block;
    height: 100%;
    border-radius: 6px;
  }
  .fk-zbroj {
    margin: 2px 0 0;
  }
  .fk-klizaci {
    display: grid;
    gap: 8px;
    max-width: 440px;
    margin: 0 auto;
  }
  .fk-kl-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 13px;
  }
  .fk-kl-head label {
    color: var(--text-dim);
  }
  .fk-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .fk-vrijeme {
    max-width: 440px;
    margin: 0 auto;
  }
  .fk-akcije {
    justify-content: center;
    margin-top: 8px;
  }
  .fk-hint {
    font-size: 13px;
    color: var(--text-dim);
    margin: 0 0 8px;
  }
  @media (max-width: 420px) {
    .fk-stupac {
      grid-template-columns: 1fr 5.5em;
    }
    .fk-stupac > span:first-child {
      grid-column: 1 / -1;
    }
  }
</style>
