<script>
  // jezgra / krivulja: energija vezanja po nukleonu E/A (A) iz stvarnih podataka. Učenik vuče točku po krivulji.
  // U „odaberi“ su strelice fuzije i fisije i natpis vrha skriveni do točnog odgovora, a za cilj {simbol, A} ni ime
  // ni A ne vide se uživo. Točke, osi, strelice i najbliža točka dolaze iz kataloga.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import {
    geometrijaKrivulje,
    najblizaTocka,
    streliceKrivulje,
    opisTockeKrivulje,
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
  const odaberi = nacin === "odaberi";
  const cilj = untrack(() => spec.cilj);
  const ciljJezgra = typeof cilj === "object" && cilj != null;
  const g = geometrijaKrivulje(360, 240);
  const S = streliceKrivulje(g);
  const oznaci = untrack(() =>
    (spec.oznaci ?? []).map((o) =>
      g.tocke.find((t) => t.simbol === o.simbol && t.A === o.A),
    ),
  );

  let sel = $state(
    odaberi ? null : g.tocke.find((t) => t.simbol === "He" && t.A === 4),
  );
  let otkriveno = $derived(!odaberi || pokazi || !!ishod?.tocno);
  let aktivno = $derived(!odaberi || (!locked && !pokazi));
  $effect(() => {
    if (!pokazi || !odaberi) return;
    untrack(() => {
      if (cilj === "najstabilnija") sel = S.vrh;
      else if (cilj === "fuzija") sel = g.tocke.find((t) => t.A === 4);
      else if (cilj === "fisija") sel = g.tocke.find((t) => t.A === 235);
      else
        sel = g.tocke.find((t) => t.simbol === cilj.simbol && t.A === cilj.A);
    });
  });

  let svgEl = $state();
  let vuce = false;
  function tocka(e) {
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svgEl.getScreenCTM().inverse());
    sel = najblizaTocka(g, p.x, p.y);
  }
  function down(e) {
    if (!aktivno) return;
    vuce = true;
    svgEl.setPointerCapture?.(e.pointerId);
    tocka(e);
  }
  function move(e) {
    if (vuce && aktivno) tocka(e);
  }
  function up() {
    vuce = false;
  }
  function key(e) {
    if (!aktivno) return;
    const i = sel ? sel.i : -1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      sel = g.tocke[Math.min(g.tocke.length - 1, i + 1)];
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      sel = g.tocke[Math.max(0, i - 1)];
    } else if (e.key === "Enter" && odaberi) provjeri();
  }
  function provjeri() {
    if (locked) return;
    onodgovor(sel ? { A: sel.A, Z: sel.Z } : null);
  }

  // što se smije vidjeti uživo
  let ocitanje = $derived.by(() => {
    if (!sel) return "";
    if (otkriveno) return opisTockeKrivulje(sel, true);
    if (ciljJezgra) return "";
    return opisTockeKrivulje(sel, false);
  });
  let ariaVrijednost = $derived(
    !sel
      ? "nijedna točka"
      : otkriveno
        ? `${sel.simbol}-${sel.A}, E/A ${formatNumber(sel.EA, 2)} MeV`
        : ciljJezgra
          ? `točka ${sel.i + 1} od ${g.tocke.length}`
          : `A ${sel.A}, E/A ${formatNumber(sel.EA, 2)} MeV`,
  );
  const r1 = (n) => Math.round(n * 10) / 10;
  const strelica = (a, b, pomak) => {
    const x1 = a.x + pomak[0];
    const y1 = a.y + pomak[1];
    const x2 = b.x + pomak[2];
    const y2 = b.y + pomak[3];
    return `M${r1(x1)},${r1(y1)} Q${r1((x1 + x2) / 2 + pomak[4])},${r1((y1 + y2) / 2 + pomak[5])} ${r1(x2)},${r1(y2)}`;
  };
</script>

{#if odaberi}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="jz-tekst"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure jzg">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {g.W} {g.H}"
    role="slider"
    tabindex="0"
    aria-label="Krivulja energije vezanja po nukleonu. Strelicama lijevo i desno biraš jezgru{odaberi
      ? ', Enter provjerava'
      : ''}."
    aria-valuemin="1"
    aria-valuemax={g.tocke.length}
    aria-valuenow={sel ? sel.i + 1 : 0}
    aria-valuetext={ariaVrijednost}
    class:aktivno
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onkeydown={key}
  >
    <defs>
      {#each ["fuz", "fis"] as m (m)}
        <marker
          id="jzg-vrh-{m}"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" class="jzg-vrh-m {m}" />
        </marker>
      {/each}
    </defs>
    {#each g.yOznake as o (o.EA)}
      <line
        class="jzg-mreza"
        x1={g.okvir.x0}
        y1={o.y}
        x2={g.okvir.x1}
        y2={o.y}
      />
      <text class="jzg-oz" x={g.okvir.x0 - 5} y={o.y + 4} text-anchor="end"
        >{o.EA}</text
      >
    {/each}
    {#each g.xOznake as o (o.A)}
      <text class="jzg-oz" x={o.x} y={g.okvir.y1 + 14} text-anchor="middle"
        >{o.A}</text
      >
    {/each}
    <line
      class="jzg-os"
      x1={g.okvir.x0}
      y1={g.okvir.y1}
      x2={g.okvir.x1}
      y2={g.okvir.y1}
    />
    <line
      class="jzg-os"
      x1={g.okvir.x0}
      y1={g.okvir.y0}
      x2={g.okvir.x0}
      y2={g.okvir.y1}
    />
    <text class="jzg-os-t" x={g.okvir.x1} y={g.H - 2} text-anchor="end"
      >maseni broj A</text
    >
    <text class="jzg-os-t" x="4" y="9">E/A (MeV)</text>
    <path class="jzg-krivulja" d={g.put} />
    {#each g.tocke as t (t.i)}
      <circle class="jzg-t" cx={t.x} cy={t.y} r="2.6" />
    {/each}

    {#if otkriveno}
      <path
        class="jzg-str fuz"
        d={strelica(S.fuzija.od, S.fuzija.do, [8, -2, 4, 8, 22, 6])}
        marker-end="url(#jzg-vrh-fuz)"
      />
      <text class="jzg-str-t fuz" x="54" y="196">fuzija →</text>
      <text class="jzg-str-t2" x="54" y="208">lake se spajaju (Sunce)</text>
      <path
        class="jzg-str fis"
        d={strelica(S.fisija.od, S.fisija.do, [-4, -8, 4, -8, 0, -26])}
        marker-end="url(#jzg-vrh-fis)"
      />
      <text
        class="jzg-str-t fis"
        x={g.okvir.x1}
        y={S.fisija.od.y + 24}
        text-anchor="end">← fisija</text
      >
      <text
        class="jzg-str-t2"
        x={g.okvir.x1}
        y={S.fisija.od.y + 37}
        text-anchor="end">teška se cijepa (Krško)</text
      >
      <circle class="jzg-oznaci" cx={S.vrh.x} cy={S.vrh.y} r="5" />
      <text class="jzg-vrh-t" x={S.vrh.x - 4} y={S.vrh.y + 22}
        >Fe-56: najstabilnija</text
      >
    {/if}
    {#each oznaci as t (t.i)}
      <circle class="jzg-oznaci" cx={t.x} cy={t.y} r="6" />
      <text
        class="jzg-oznaci-t"
        x={t.x > 300 ? t.x - 8 : t.x + 8}
        y={t.x > 300 ? t.y - 10 : t.y + 16}
        text-anchor={t.x > 300 ? "end" : "start"}>{t.simbol}-{t.A}</text
      >
    {/each}

    {#if sel}
      <line class="jzg-vod" x1={sel.x} y1={sel.y} x2={sel.x} y2={g.okvir.y1} />
      <circle
        class="jzg-sel"
        class:ok={odaberi && ishod?.tocno}
        cx={sel.x}
        cy={sel.y}
        r="8"
      />
    {:else if aktivno}
      <text
        class="jzg-uputa"
        x={(g.okvir.x0 + g.okvir.x1) / 2}
        y={g.okvir.y1 - 50}
        text-anchor="middle">dodirni ili povuci po krivulji</text
      >
    {/if}
  </svg>
</figure>
<p class="lx-readout jzg-oc" aria-live="polite">
  {#if ocitanje}<Md inline text={ocitanje} />{:else}&nbsp;{/if}
</p>

{#if odaberi}
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
  </div>
{/if}

<style>
  .jz-tekst {
    margin-bottom: 10px;
  }
  .jzg {
    max-width: 440px;
    margin-bottom: 6px;
  }
  .jzg svg {
    outline: none;
  }
  .jzg svg.aktivno {
    touch-action: none;
    cursor: crosshair;
  }
  .jzg svg:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 8px;
  }
  .jzg-mreza {
    stroke: var(--border);
    stroke-dasharray: 2 4;
  }
  .jzg-os {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .jzg-oz {
    fill: var(--text-dim);
    font: 500 10.5px var(--font-mono);
  }
  .jzg-os-t {
    fill: var(--text-faint);
    font: 500 10.5px var(--font-sans);
  }
  .jzg-krivulja {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2.2;
    stroke-linejoin: round;
  }
  .jzg-t {
    fill: var(--primary);
  }
  .jzg-str {
    fill: none;
    stroke-width: 2;
    stroke-dasharray: 5 3;
  }
  .jzg-str.fuz {
    stroke: var(--warn);
  }
  .jzg-str.fis {
    stroke: var(--success);
  }
  .jzg-vrh-m.fuz {
    fill: var(--warn);
  }
  .jzg-vrh-m.fis {
    fill: var(--success);
  }
  .jzg-str-t {
    font: 700 12px var(--font-sans);
  }
  .jzg-str-t.fuz {
    fill: var(--warn);
  }
  .jzg-str-t.fis {
    fill: var(--success);
  }
  .jzg-str-t2 {
    fill: var(--text-dim);
    font: 500 10.5px var(--font-sans);
  }
  .jzg-vrh-t {
    fill: var(--text);
    font: 700 11px var(--font-sans);
  }
  .jzg-oznaci {
    fill: none;
    stroke: var(--warn);
    stroke-width: 2;
  }
  .jzg-oznaci-t {
    fill: var(--text);
    font: 600 11px var(--font-sans);
  }
  .jzg-vod {
    stroke: var(--text-faint);
    stroke-dasharray: 3 3;
  }
  .jzg-sel {
    fill: color-mix(in srgb, var(--primary) 25%, transparent);
    stroke: var(--primary);
    stroke-width: 2;
  }
  .jzg-sel.ok {
    stroke: var(--success);
    fill: color-mix(in srgb, var(--success) 25%, transparent);
  }
  .jzg-uputa {
    fill: var(--text-faint);
    font: 500 12px var(--font-sans);
  }
  .jzg-oc {
    min-height: 1.4em;
  }
</style>
