<script>
  // Graf funkcija u koordinatnom sustavu, istim izgledom kao statične skice (taskSketch.js: graph, axes).
  // Dodir ili povlačenje pokazuje vrijednosti svih funkcija na najbližoj crtici osi x: pomoć za čitanje,
  // ne odgovor, pa radi i u koraku za gledanje.
  import Md from "./Md.svelte";
  import BrojUnos from "./BrojUnos.svelte";
  import { formatNumber } from "../core/number.js";
  import { graphFns } from "../katalog/istrazivanje.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const W = 380;
  const H = 260;
  const L = 48;
  const D = 18;
  const T = 18;
  const B = 34;
  const N = 240;

  const x0 = $derived(spec.x[0]);
  const x1 = $derived(spec.x[1]);
  const y0 = $derived(spec.y[0]);
  const y1 = $derived(spec.y[1]);
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - D);
  const Y = (y) => H - B - ((y - y0) / (y1 - y0)) * (H - T - B);
  const r1 = (n) => Math.round(n * 10) / 10;

  // Lijep korak ljestvice: 1, 2 ili 5 × 10ⁿ, kao u skicama.
  function niceStep(range) {
    const raw = range / 6;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 5, 10]) if (k * p >= raw) return k * p;
    return 10 * p;
  }
  function ticks(a, b, step) {
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  }

  const sx = $derived(niceStep(x1 - x0));
  const sy = $derived(niceStep(y1 - y0));
  const tx = $derived(ticks(x0, x1, sx));
  const ty = $derived(ticks(y0, y1, sy));
  const ox = $derived(x0 <= 0 && x1 >= 0 ? 0 : x0);
  const oy = $derived(y0 <= 0 && y1 >= 0 ? 0 : y0);
  const imeX = $derived(kratko(spec.os_x, "x"));

  // „V (cm³)“ → „V“ za kratki zapis u očitanju
  function kratko(os, zamjena) {
    const s = String(os ?? "").split("(")[0].trim();
    return s || zamjena;
  }

  const fns = $derived(graphFns(spec));
  const unutra = (y) => Number.isFinite(y) && y >= y0 - 1e-9 && y <= y1 + 1e-9;

  // Krivulja se reže na rubu osi y (s točnim sjecištem), umjesto da skoči preko praznog dijela.
  function segmenti(f) {
    const segs = [];
    let cur = [];
    let prev = null;
    const rub = (out, inn) => {
      const yb = out[1] > y1 ? y1 : y0;
      const t = (yb - out[1]) / (inn[1] - out[1]);
      return [out[0] + t * (inn[0] - out[0]), yb];
    };
    for (let k = 0; k <= N; k++) {
      const x = x0 + ((x1 - x0) * k) / N;
      const y = f(x);
      const p = [x, y];
      if (unutra(y)) {
        if (!cur.length && prev && Number.isFinite(prev[1])) cur.push(rub(prev, p));
        cur.push(p);
      } else if (cur.length) {
        if (Number.isFinite(y)) cur.push(rub(p, prev));
        segs.push(cur);
        cur = [];
      }
      prev = p;
    }
    if (cur.length) segs.push(cur);
    return segs.filter((s) => s.length > 1).map((s) => s.map(([x, y]) => [X(x), Y(y)]));
  }

  const krivulje = $derived(
    spec.funkcije.map((fn, i) => {
      const segs = segmenti(fns[fn.oznaka]);
      const zadnji = segs.at(-1);
      const kraj = zadnji?.at(-1);
      return {
        oznaka: fn.oznaka,
        i,
        linije: segs.map((s) => s.map((p) => p.map(r1).join(",")).join(" ")),
        kraj: kraj ? [kraj[0] - 6, kraj[1] + (kraj[1] < 30 ? 14 : -10)] : null,
      };
    }),
  );

  // ── pomoć za čitanje: okomita crta na crtici x i vrijednost svake funkcije ──
  let svgEl = $state();
  let kx = $state(null);
  let vuce = false;
  const prviTick = $derived(tx[0] ?? x0);
  const zadnjiTick = $derived(tx.at(-1) ?? x1);
  const prikvaci = (x) => Math.min(zadnjiTick, Math.max(prviTick, Math.round(x / sx) * sx));

  function izDodira(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    kx = prikvaci(x0 + ((p.x - L) / (W - L - D)) * (x1 - x0));
  }
  function dolje(e) {
    if (e.button > 0) return;
    vuce = true;
    svgEl.setPointerCapture?.(e.pointerId);
    izDodira(e);
  }
  function pomak(e) {
    if (vuce) izDodira(e);
  }
  function tipka(e) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    kx = kx == null ? prviTick : prikvaci(kx + d * sx);
  }

  const ocitano = $derived(
    kx == null
      ? []
      : spec.funkcije.map((fn, i) => {
          const y = fns[fn.oznaka](kx);
          return { oznaka: fn.oznaka, i, y, vidljivo: unutra(y) };
        }),
  );
  // vrijednosti s grafa skrivene su dok učenik u pitanju ne odgovori točno (ili ne vidi točan odgovor)
  const skriveno = $derived(spec.nacin === "ocitaj" && !locked && !pokazi);
  const citanje = $derived(
    kx == null ? "ništa nije odabrano" : skriveno ? ("x" in (spec.ocitaj ?? {}) ? `${imeX} = ${formatNumber(kx)}` : "prati crtu do osi") : `${imeX} = ${formatNumber(kx)}: ${ocitano.map((o) => `${o.oznaka} ${o.vidljivo ? formatNumber(o.y) : "izvan grafa"}`).join(", ")}`,
  );
  const vrh = $derived(Math.max(oy, ...ocitano.filter((o) => o.vidljivo).map((o) => o.y)));

  // ── prikaz rješenja: vodilice na traženoj vrijednosti ──
  function xZaY(f, y) {
    let [a, b] = [x0, x1];
    const g = (x) => f(x) - y;
    if (!(g(a) * g(b) <= 0)) return null;
    for (let i = 0; i < 80; i++) {
      const m = (a + b) / 2;
      if (g(a) * g(m) <= 0) b = m;
      else a = m;
    }
    return (a + b) / 2;
  }
  const prikazOdgovora = $derived.by(() => {
    if (!pokazi || spec.nacin !== "ocitaj" || !spec.ocitaj) return null;
    const q = spec.ocitaj;
    const f = fns[q.oznaka];
    if (!f) return null;
    const px = "x" in q ? q.x : xZaY(f, q.y);
    const py = "x" in q ? f(q.x) : q.y;
    if (px == null || !unutra(py)) return null;
    return { px, py, trazi: "x" in q ? "y" : "x" };
  });

  const boja = (i) => `var(--og-c${(i % 3) + 1})`;
  const opis = $derived(
    `Graf: ${spec.os_y ?? "y"} u ovisnosti o ${spec.os_x ?? "x"}, funkcije ${spec.funkcije.map((f) => f.oznaka).join(", ")}. Dodirni ili strelicama lijevo i desno očitaj vrijednosti.`,
  );

  let unos = $state("");
</script>

{#if spec.nacin === "ocitaj"}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <Md text={spec.tekst} />
{/if}

<div class="lx-figure og">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {W} {H}"
    role="slider"
    aria-label={opis}
    aria-valuemin={prviTick}
    aria-valuemax={zadnjiTick}
    aria-valuenow={kx ?? prviTick}
    aria-valuetext={citanje}
    tabindex="0"
    onpointerdown={dolje}
    onpointermove={pomak}
    onpointerup={() => (vuce = false)}
    onpointercancel={() => (vuce = false)}
    onkeydown={tipka}
  >
    <!-- mreža i osi -->
    {#each tx as x (x)}<line class="og-grid" x1={X(x)} y1={Y(y0)} x2={X(x)} y2={Y(y1)} />{/each}
    {#each ty as y (y)}<line class="og-grid" x1={X(x0)} y1={Y(y)} x2={X(x1)} y2={Y(y)} />{/each}
    <line class="og-axis" x1={X(x0)} y1={Y(oy)} x2={X(x1)} y2={Y(oy)} />
    <line class="og-axis" x1={X(ox)} y1={Y(y0)} x2={X(ox)} y2={Y(y1)} />
    {#each tx as x (x)}
      {#if x !== ox}<text class="og-tick" x={X(x)} y={Y(oy) + 12} text-anchor="middle" dominant-baseline="middle">{formatNumber(x)}</text>{/if}
    {/each}
    {#each ty as y (y)}
      {#if y !== oy}<text class="og-tick" x={X(ox) - 8} y={Y(y)} text-anchor="end" dominant-baseline="middle">{formatNumber(y)}</text>{/if}
    {/each}
    <text class="og-tick" x={X(x1)} y={Y(oy) + 24} text-anchor="end" dominant-baseline="middle">{spec.os_x ?? "x"}</text>
    <text class="og-tick" x={X(ox) + 8} y={Y(y1) + 2} text-anchor="start" dominant-baseline="middle">{spec.os_y ?? "y"}</text>

    <!-- krivulje -->
    {#each krivulje as k (k.oznaka)}
      {#each k.linije as pts, j (j)}<polyline class="og-curve" style="stroke: {boja(k.i)}" points={pts} />{/each}
      {#if k.kraj && k.oznaka}
        <text class="og-lbl" style="fill: {boja(k.i)}" x={k.kraj[0]} y={k.kraj[1]} text-anchor="end" dominant-baseline="middle">{k.oznaka}</text>
      {/if}
    {/each}

    {#each spec.tocke ?? [] as p, j (j)}
      {#if p.x >= x0 && p.x <= x1 && unutra(p.y)}
        <circle class="og-pt" cx={X(p.x)} cy={Y(p.y)} r="3.5" />
        {#if p.oznaka}
          <text class="og-lbl small" x={X(p.x) + 8} y={Y(p.y) + (Y(p.y) < 40 ? 12 : -12)} text-anchor="start" dominant-baseline="middle">{p.oznaka}</text>
        {/if}
      {/if}
    {/each}

    {#if prikazOdgovora}
      <g class="og-show">
        <line class="og-guide" x1={X(prikazOdgovora.px)} y1={Y(oy)} x2={X(prikazOdgovora.px)} y2={Y(prikazOdgovora.py)} />
        <line class="og-guide" x1={X(ox)} y1={Y(prikazOdgovora.py)} x2={X(prikazOdgovora.px)} y2={Y(prikazOdgovora.py)} />
        <circle cx={X(prikazOdgovora.px)} cy={Y(prikazOdgovora.py)} r="4.5" />
        {#if prikazOdgovora.trazi === "y"}
          <text class="og-ans" x={X(ox) + 5} y={Y(prikazOdgovora.py) - 8} text-anchor="start">{formatNumber(prikazOdgovora.py)}</text>
        {:else}
          <text class="og-ans" x={X(prikazOdgovora.px) + 5} y={Y(oy) - 8} text-anchor="start">{formatNumber(prikazOdgovora.px)}</text>
        {/if}
      </g>
    {/if}

    {#if kx != null}
      <g class="og-cross">
        <line x1={X(kx)} y1={Y(oy)} x2={X(kx)} y2={Y(vrh)} />
        {#each ocitano.filter((o) => o.vidljivo) as o (o.oznaka)}
          <line x1={X(ox)} y1={Y(o.y)} x2={X(kx)} y2={Y(o.y)} />
          <circle cx={X(kx)} cy={Y(o.y)} r="4" style="fill: {boja(o.i)}" />
        {/each}
      </g>
    {/if}
  </svg>
</div>

<!-- U pitanju križić samo vodi oko do osi: vrijednosti s grafa ispisale bi odgovor, a očitavanje je baš ono što se uči. -->
<p class="lx-readout" aria-live="polite">
  {#if kx == null}
    {skriveno ? "Dodirni graf: crte te vode od grafa do osi." : "Dodirni graf da vidiš vrijednosti."}
  {:else if skriveno}
    {#if "x" in (spec.ocitaj ?? {})}<b>{imeX} = {formatNumber(kx)}</b> · {/if}prati crtu do druge osi i očitaj
  {:else}
    <b>{imeX} = {formatNumber(kx)}</b> →
    {#each ocitano as o, j (o.oznaka)}
      <span style="color: {boja(o.i)}">{o.oznaka}:</span>
      <b>{o.vidljivo ? formatNumber(o.y) : "izvan grafa"}</b>{j < ocitano.length - 1 ? ", " : ""}
    {/each}
  {/if}
</p>

{#if spec.nacin === "ocitaj"}
  <BrojUnos jedinica={spec.jedinica ?? ""} {locked} {ishod} bind:vrijednost={unos} {onodgovor} oznaka="Očitana vrijednost" />
{/if}

<style>
  .og {
    --og-c1: var(--primary);
    --og-c2: var(--warn);
    --og-c3: var(--success);
  }
  svg {
    outline: none;
    cursor: crosshair;
    /* okomito povlačenje i dalje pomiče stranicu; vodoravno pomiče crtu po grafu */
    touch-action: pan-y;
  }
  svg:focus-visible {
    outline: 2px solid var(--primary-border, var(--primary));
    outline-offset: 2px;
    border-radius: var(--r-md);
  }
  .og-grid {
    stroke: var(--border);
    stroke-width: 1;
  }
  .og-axis {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .og-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .og-curve {
    fill: none;
    stroke-width: 2.4;
    stroke-linejoin: round;
  }
  .og-lbl {
    fill: var(--text);
    font: 600 14px var(--font-sans);
  }
  .og-lbl.small {
    font-size: 12.5px;
  }
  .og-pt {
    fill: var(--primary);
  }
  .og-cross line {
    stroke: var(--text-dim);
    stroke-width: 1.2;
    stroke-dasharray: 4 3;
  }
  .og-cross circle {
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .og-show .og-guide {
    stroke: var(--success);
    stroke-width: 1.8;
    stroke-dasharray: 6 4;
  }
  .og-show circle {
    fill: var(--success);
  }
  .og-ans {
    fill: var(--success);
    font: 700 13px var(--font-sans);
  }
</style>
