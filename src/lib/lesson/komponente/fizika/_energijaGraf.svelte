<svelte:options namespace="svg" />

<script>
  // Stupci energije na zajedničkoj mreži, kao <g> unutar SVG-a roditelja (energija_stupci: prikaz, dovrsi i
  // istraživanje uz scenu). Stupce pitanog stanja učenik vuče mišem ili prstom (hvatanje na korak mreže),
  // a tipkovnicom strelicama. Ne računa fiziku: vrijednosti dobiva gotove.
  import { formatSci } from "$lib/lesson/core/number.js";

  let {
    x = 0,
    y = 0,
    w = 360,
    h = 220,
    vrste = [],
    stanja = [], // [{oznaka, stupci: [{id, v, vuci?, status?}], prazno?}]
    slozeno = false,
    min = 0,
    max = 1,
    korak = 1,
    jedinica = "J",
    ukupno = null, // isprekidana crta ukupne energije (složeni stupci)
    aktivno = false,
    onpromjena = () => {},
  } = $props();

  const LIJEVO = 40;
  const DOLJE = 40; // oznake vrsta i stanja ispod mreže

  let px0 = $derived(x + LIJEVO);
  let px1 = $derived(x + w - 4);
  let pyTop = $derived(y + 18);
  let pyBot = $derived(y + h - DOLJE);
  const Y = (v) => pyBot - ((v - min) / (max - min || 1)) * (pyBot - pyTop);
  let y0 = $derived(Y(Math.max(min, Math.min(max, 0))));

  // mreža: crta na svakom koraku, broj na svakoj n-toj (najviše ~6 brojeva)
  let crte = $derived.by(() => {
    const n = Math.round((max - min) / korak);
    const svaki = Math.max(1, Math.ceil(n / 6));
    const k0 = Math.round(min / korak);
    return Array.from({ length: n + 1 }, (_, i) => {
      const v = (k0 + i) * korak;
      return { v: Number(v.toPrecision(12)), broj: (k0 + i) % svaki === 0 };
    });
  });

  let G = $derived(Math.max(1, stanja.length));
  let gw = $derived((px1 - px0) / G);
  const boja = (id) =>
    `var(--es-${vrste.find((v) => v.id === id)?.boja ?? "siva"})`;
  // oznaka "E_{gp}" → E s indeksom gp; \Delta → Δ
  function oznaka(id) {
    const o = (vrste.find((v) => v.id === id)?.oznaka ?? id)
      .replace(/\\Delta\s*/g, "Δ")
      .replace(/\\eta/g, "η")
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\,/g, "");
    const m = o.match(/^(.*?)_\{?([^}]*)\}?$/);
    return m ? { baza: m[1], indeks: m[2] } : { baza: o, indeks: "" };
  }
  const fmt = (v) => formatSci(v, 3);

  function stupciGrupe(gi) {
    const st = stanja[gi];
    const n = slozeno ? 1 : st.stupci.length;
    const bw = Math.min(46, (gw - 14) / n - 6, slozeno ? 52 : 46);
    const sredina = px0 + gw * (gi + 0.5);
    const lijevo = sredina - (n * (bw + 6) - 6) / 2;
    return { bw, lijevo, sredina };
  }

  // složeni stupac: segmenti jedan na drugom
  function segmenti(st) {
    let baza = 0;
    return st.stupci.map((s) => {
      const o = { ...s, od: baza, do: baza + Math.max(0, s.v) };
      baza = o.do;
      return o;
    });
  }

  function wrap(t, sir) {
    const max = Math.max(6, Math.floor(sir / 6));
    if (t.length <= max) return [t];
    const rijeci = t.split(" ");
    const out = [""];
    for (const r of rijeci) {
      const cur = out[out.length - 1];
      if (!cur || (cur + " " + r).length <= max || out.length === 2)
        out[out.length - 1] = cur ? `${cur} ${r}` : r;
      else out.push(r);
    }
    return out.slice(0, 2);
  }

  // ── vučenje ──
  let vuce = null; // {gi, id, baza}
  const snap = (v) => Math.round(v / korak) * korak;
  function vrijednostIz(e, el) {
    const m = el.ownerSVGElement?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return min + ((pyBot - p.y) / (pyBot - pyTop)) * (max - min);
  }
  function postavi(gi, id, v, baza = 0) {
    let n = snap(v - baza);
    const lo = slozeno ? 0 : min;
    n = Math.min(max - baza, Math.max(lo, n));
    onpromjena(gi, id, Number(n.toPrecision(12)));
  }
  function down(e, gi) {
    if (!aktivno) return;
    const st = stanja[gi];
    const v = vrijednostIz(e, e.currentTarget);
    if (v == null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (slozeno) {
      // najbliži vrh segmenta koji se vuče
      const seg = segmenti(st).filter((s) => s.vuci);
      if (!seg.length) return;
      const best = seg.reduce((a, s) =>
        Math.abs(s.do - v) < Math.abs(a.do - v) ? s : a,
      );
      vuce = { gi, id: best.id, baza: best.od };
    } else {
      const { bw, lijevo } = stupciGrupe(gi);
      const m = e.currentTarget.ownerSVGElement.getScreenCTM();
      const px = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        m.inverse(),
      ).x;
      const vuku = st.stupci
        .map((s, k) => ({ s, k }))
        .filter(({ s }) => s.vuci);
      const best = vuku.reduce((a, b) =>
        Math.abs(lijevo + b.k * (bw + 6) + bw / 2 - px) <
        Math.abs(lijevo + a.k * (bw + 6) + bw / 2 - px)
          ? b
          : a,
      );
      vuce = { gi, id: best.s.id, baza: 0 };
    }
    postavi(vuce.gi, vuce.id, v, vuce.baza);
  }
  function move(e) {
    if (!vuce || !aktivno) return;
    const v = vrijednostIz(e, e.currentTarget);
    if (v != null) postavi(vuce.gi, vuce.id, v, vuce.baza);
  }
  function up() {
    vuce = null;
  }
  function key(e, gi, s, baza) {
    if (!aktivno) return;
    const d = {
      ArrowUp: korak,
      ArrowRight: korak,
      ArrowDown: -korak,
      ArrowLeft: -korak,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    postavi(gi, s.id, baza + s.v + d, baza);
  }
</script>

<g class="eg">
  <!-- mreža -->
  {#each crte as c (c.v)}
    <line
      class="eg-crta"
      class:eg-nula={Math.abs(c.v) < korak / 1e6}
      x1={px0}
      y1={Y(c.v)}
      x2={px1}
      y2={Y(c.v)}
    />
    {#if c.broj}<text
        class="eg-broj"
        x={px0 - 5}
        y={Y(c.v) + 3.5}
        text-anchor="end">{fmt(c.v)}</text
      >{/if}
  {/each}
  <text class="eg-broj" x={x + 2} y={pyTop - 9}>{jedinica}</text>

  {#if ukupno != null}
    <line class="eg-ukupno" x1={px0} y1={Y(ukupno)} x2={px1} y2={Y(ukupno)} />
    <text class="eg-ukupno-t" x={px1} y={Y(ukupno) - 4} text-anchor="end"
      >ukupno {fmt(ukupno)} {jedinica}</text
    >
  {/if}

  {#each stanja as st, gi (gi)}
    {@const g = stupciGrupe(gi)}
    {@const red = wrap(st.oznaka, gw - 6)}
    {#if gi > 0}
      <text
        class="eg-strelica"
        x={px0 + gw * gi}
        y={pyBot + 30}
        text-anchor="middle">→</text
      >
      <line
        class="eg-granica"
        x1={px0 + gw * gi}
        y1={pyTop}
        x2={px0 + gw * gi}
        y2={pyBot}
      />
    {/if}
    {#each red as r, k (k)}
      <text
        class="eg-stanje"
        class:eg-pitano={st.pitano}
        x={g.sredina}
        y={pyBot + (slozeno ? 15 : 27) + k * 12}
        text-anchor="middle">{r}</text
      >
    {/each}

    {#if slozeno}
      {@const segs = segmenti(st)}
      {#each segs as s (s.id)}
        {@const o = oznaka(s.id)}
        {@const vis = Math.abs(Y(s.od) - Y(s.do))}
        {#if st.prazno}
          <rect
            class="eg-prazno"
            x={g.lijevo}
            y={Y(s.do)}
            width={g.bw}
            height={Math.max(0, vis)}
          />
        {:else}
          <rect
            class="eg-stupac"
            class:ok={s.status === "ok"}
            class:bad={s.status === "bad"}
            class:eg-vuci={s.vuci}
            style:--c={boja(s.id)}
            x={g.lijevo}
            y={Y(s.do)}
            width={g.bw}
            height={Math.max(0, vis)}
          />
        {/if}
        {#if vis > 13}
          <text
            class="eg-seg-oznaka"
            x={g.lijevo + g.bw / 2}
            y={(Y(s.od) + Y(s.do)) / 2 + 4}
            text-anchor="middle"
            >{o.baza}<tspan class="eg-ind" dy="2.5">{o.indeks}</tspan></text
          >
        {/if}
        {#if !st.prazno}
          {@const desno = g.lijevo + g.bw + 4}
          <text
            class="eg-vrijednost"
            style:--c={boja(s.id)}
            x={desno}
            y={(Y(s.od) + Y(s.do)) / 2 + 4}
            >{vis > 13 ? "" : `${o.baza}${o.indeks} `}{fmt(s.v)}</text
          >
        {/if}
        {#if s.vuci && aktivno}
          <rect
            class="eg-hvat"
            x={g.lijevo - 3}
            y={Y(s.do) - 3}
            width={g.bw + 6}
            height="6"
            rx="3"
          />
          <rect
            class="eg-fokus"
            x={g.lijevo - 4}
            y={Y(s.do) - 8}
            width={g.bw + 8}
            height="16"
            rx="4"
            tabindex="0"
            role="slider"
            aria-label={`${o.baza}${o.indeks} u stanju ${st.oznaka}`}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={s.v}
            aria-valuetext={`${fmt(s.v)} ${jedinica}`}
            onkeydown={(e) => key(e, gi, s, s.od)}
          />
        {/if}
      {/each}
      {#if st.stupci.some((s) => s.vuci) && aktivno}
        <rect
          class="eg-hit lx-handle"
          role="presentation"
          x={g.lijevo - 14}
          y={pyTop - 8}
          width={g.bw + 28}
          height={pyBot - pyTop + 16}
          onpointerdown={(e) => down(e, gi)}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
        />
      {/if}
    {:else}
      {#each st.stupci as s, k (s.id)}
        {@const o = oznaka(s.id)}
        {@const bx = g.lijevo + k * (g.bw + 6)}
        {@const yv = Y(Math.max(min, Math.min(max, s.v)))}
        {#if st.prazno}
          <rect
            class="eg-prazno"
            x={bx}
            y={pyTop}
            width={g.bw}
            height={pyBot - pyTop}
          />
        {:else}
          <rect
            class="eg-stupac"
            class:ok={s.status === "ok"}
            class:bad={s.status === "bad"}
            class:eg-vuci={s.vuci}
            style:--c={boja(s.id)}
            x={bx}
            y={Math.min(yv, y0)}
            width={g.bw}
            height={Math.max(s.v === 0 ? 0 : 1, Math.abs(yv - y0))}
          />
          <text
            class="eg-vrijednost"
            style:--c={boja(s.id)}
            x={bx + g.bw / 2}
            y={s.v < 0 ? yv + 12 : yv - 4}
            text-anchor="middle">{fmt(s.v)}</text
          >
        {/if}
        <text
          class="eg-oznaka"
          x={bx + g.bw / 2}
          y={pyBot + 13}
          text-anchor="middle"
          >{o.baza}<tspan class="eg-ind" dy="2.5">{o.indeks}</tspan></text
        >
        {#if s.vuci && aktivno}
          <rect
            class="eg-hvat"
            x={bx - 3}
            y={yv - 3}
            width={g.bw + 6}
            height="6"
            rx="3"
          />
          <rect
            class="eg-fokus"
            x={bx - 4}
            y={yv - 8}
            width={g.bw + 8}
            height="16"
            rx="4"
            tabindex="0"
            role="slider"
            aria-label={`${o.baza}${o.indeks} u stanju ${st.oznaka}`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={s.v}
            aria-valuetext={`${fmt(s.v)} ${jedinica}`}
            onkeydown={(e) => key(e, gi, s, 0)}
          />
        {/if}
      {/each}
      {#if st.stupci.some((s) => s.vuci) && aktivno}
        <rect
          class="eg-hit lx-handle"
          role="presentation"
          x={px0 + gw * gi + 2}
          y={pyTop - 8}
          width={gw - 4}
          height={pyBot - pyTop + 16}
          onpointerdown={(e) => down(e, gi)}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
        />
      {/if}
    {/if}
  {/each}
</g>

<style>
  .eg-crta {
    stroke: var(--border);
    stroke-width: 1;
  }
  .eg-crta.eg-nula {
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .eg-broj {
    fill: var(--text-faint);
    font: 400 10px var(--font-mono);
  }
  .eg-granica {
    stroke: var(--border);
    stroke-dasharray: 2 4;
  }
  .eg-strelica {
    fill: var(--text-faint);
    font: 600 14px var(--font-sans);
  }
  .eg-stanje {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .eg-stanje.eg-pitano {
    fill: var(--lx-turn, var(--primary));
    font-weight: 700;
  }
  .eg-stupac {
    fill: color-mix(in srgb, var(--c) 78%, transparent);
    stroke: var(--c);
    stroke-width: 1.2;
    transition:
      y 0.08s,
      height 0.08s;
  }
  .eg-stupac.eg-vuci {
    fill: color-mix(in srgb, var(--c) 62%, transparent);
  }
  .eg-stupac.ok {
    stroke: var(--lx-ok, var(--success));
    stroke-width: 2.5;
  }
  .eg-stupac.bad {
    stroke: var(--lx-bad, var(--danger));
    stroke-width: 2.5;
  }
  .eg-prazno {
    fill: none;
    stroke: var(--border-strong);
    stroke-dasharray: 4 4;
  }
  .eg-vrijednost {
    fill: var(--text);
    font: 600 10.5px var(--font-mono);
  }
  .eg-oznaka,
  .eg-seg-oznaka {
    fill: var(--text);
    font: italic 600 12px var(--font-sans);
  }
  .eg-seg-oznaka {
    fill: #fff;
    paint-order: stroke;
    stroke: color-mix(in srgb, #000 35%, transparent);
    stroke-width: 2px;
  }
  .eg-ind {
    font-size: 9px;
    font-style: normal;
  }
  .eg-ukupno {
    stroke: var(--text);
    stroke-dasharray: 6 4;
    stroke-width: 1.3;
  }
  .eg-ukupno-t {
    fill: var(--text-dim);
    font: 500 10px var(--font-sans);
  }
  .eg-hvat {
    fill: var(--text);
    pointer-events: none;
  }
  .eg-fokus {
    fill: transparent;
    outline: none;
  }
  .eg-fokus:focus-visible {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .eg-hit {
    fill: transparent;
  }
</style>
