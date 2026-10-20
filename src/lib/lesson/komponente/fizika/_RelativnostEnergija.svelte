<script>
  // Relativistička energija: čestica u cijevi akceleratora, stupac E = E₀ + E_k, brzinomjer v/c s crtom c i graf
  // E/E₀ (v/c) s asimptotom. Energija raste ravnomjerno, a v/c se sve sporije približava c i nikad je ne dosegne.
  // Geometrija i brojke: energijaStanje (katalog).
  import { onMount, untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import {
    energijaStanje,
    cestica,
    ENERGIJA,
    brojF,
  } from "$lib/lesson/katalog/fizika/relativnost.js";

  let { spec, g = 1, kreni = true } = $props();

  const c = untrack(() => cestica(spec));
  const oznaka = c.naboj === "−" ? "e⁻" : c.naboj === "+" ? "p⁺" : "";
  let st = $derived(energijaStanje(spec, g));
  let x = $state(ENERGIJA.cijev.x1 + 10);
  onMount(() => {
    let id;
    let zadnji = 0;
    const korak = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (!prefersReducedMotion.current) {
        const { x1, x2 } = ENERGIJA.cijev;
        x += (16 + 300 * st.beta) * dt;
        if (x > x2 - 8) x = x1 + 8;
      }
      id = requestAnimationFrame(korak);
    };
    id = requestAnimationFrame(korak);
    return () => cancelAnimationFrame(id);
  });
  const C = ENERGIJA.cijev;
  const M = ENERGIJA.mjerac;
  let tragDulj = $derived(Math.min(x - C.x1 - 8, 70 * st.beta));
  let opis = $derived(
    `${c.ime} u akceleratoru, brzina ${st.betaTekst}c` +
      (kreni
        ? `, ukupna energija ${brojF(g)} puta veća od energije mirovanja.`
        : "."),
  );
</script>

<svg viewBox="0 0 360 300" role="img" aria-label={opis}>
  <!-- cijev akceleratora -->
  <rect
    class="re-cijev"
    x={C.x1}
    y={C.y - 10}
    width={C.x2 - C.x1}
    height="20"
    rx="10"
  />
  {#each [0.2, 0.4, 0.6, 0.8] as u (u)}
    <rect
      class="re-zavojnica"
      x={C.x1 + u * (C.x2 - C.x1) - 6}
      y={C.y - 14}
      width="12"
      height="28"
      rx="3"
    />
  {/each}
  {#if tragDulj > 2}
    <line class="re-trag" x1={x - tragDulj} y1={C.y} x2={x} y2={C.y} />
  {/if}
  <circle class="re-cestica" cx={x} cy={C.y} r="8" />
  <text class="re-cestica-t" {x} y={C.y + 3.5} text-anchor="middle"
    >{oznaka}</text
  >
  <text class="re-t" x={C.x1} y={C.y + 26}>{c.ime}, m = {brojF(c.m)} kg</text>

  <!-- brzinomjer v/c -->
  <text class="re-t" x={M.x1} y={M.y - 12}>brzina</text>
  <text class="re-t re-jako" x={M.x2} y={M.y - 12} text-anchor="end"
    >v = {st.betaTekst}c</text
  >
  <rect
    class="re-mjerac"
    x={M.x1}
    y={M.y - 5}
    width={M.x2 - M.x1}
    height="10"
    rx="5"
  />
  <rect
    class="re-mjerac-p"
    x={M.x1}
    y={M.y - 5}
    width={Math.max(0, st.mjerac.x - M.x1)}
    height="10"
    rx="5"
  />
  <line class="re-c" x1={M.x2} y1={M.y - 10} x2={M.x2} y2={M.y + 10} />
  <text class="re-t re-c-t" x={M.x2} y={M.y + 21} text-anchor="middle">c</text>
  <text class="re-t" x={M.x1} y={M.y + 21} text-anchor="middle">0</text>

  <!-- stupac energije -->
  {#if kreni}
    {@const s = st.stupac}
    <text class="re-t re-jako" x={s.x + s.w / 2} y="66" text-anchor="middle"
      >E = {brojF(g)} E₀</text
    >
    <rect
      class="re-okvir"
      x={s.x}
      y={ENERGIJA.stupac.vrh}
      width={s.w}
      height={s.dno - ENERGIJA.stupac.vrh}
      rx="4"
    />
    <rect
      class="re-ek"
      x={s.x}
      y={s.vrhE}
      width={s.w}
      height={Math.max(0, s.vrhE0 - s.vrhE)}
      rx="3"
    />
    <rect
      class="re-e0"
      x={s.x}
      y={s.vrhE0}
      width={s.w}
      height={s.dno - s.vrhE0}
      rx="3"
    />
    {#if s.dno - s.vrhE0 > 14}
      <text
        class="re-st-t"
        x={s.x + s.w / 2}
        y={(s.vrhE0 + s.dno) / 2 + 4}
        text-anchor="middle">E₀</text
      >
    {/if}
    {#if s.vrhE0 - s.vrhE > 14}
      <text
        class="re-st-t"
        x={s.x + s.w / 2}
        y={(s.vrhE + s.vrhE0) / 2 + 4}
        text-anchor="middle">E_k</text
      >
    {/if}
    {#each s.oznake as o (o.tekst)}
      <line
        class="re-crt"
        x1={s.x + s.w}
        y1={o.y}
        x2={s.x + s.w + 5}
        y2={o.y}
      />
      <text class="re-t re-mm" x={s.x + s.w + 8} y={o.y + 3.5}>{o.tekst}</text>
    {/each}

    <!-- graf E/E₀ (v/c) -->
    {@const G = st.graf}
    <line class="re-os" x1={G.x1} y1={G.y2} x2={G.x2 + 6} y2={G.y2} />
    <line class="re-os" x1={G.x1} y1={G.y2} x2={G.x1} y2={G.y1 - 6} />
    {#each G.oznakeY as o (o.tekst)}
      <line class="re-crt" x1={G.x1 - 4} y1={o.y} x2={G.x1} y2={o.y} />
      <text class="re-t re-mm" x={G.x1 - 7} y={o.y + 3.5} text-anchor="end"
        >{o.tekst}</text
      >
    {/each}
    {#each [0.5, 1] as u (u)}
      <text
        class="re-t re-mm"
        x={G.x1 + u * (G.x2 - G.x1)}
        y={G.y2 + 14}
        text-anchor="middle">{u === 1 ? "c" : "0,5c"}</text
      >
    {/each}
    <line
      class="re-asim"
      x1={G.asimptota}
      y1={G.y1 - 6}
      x2={G.asimptota}
      y2={G.y2}
    />
    <polyline
      class="re-krivulja"
      points={G.krivulja.map((p) => p.join(",")).join(" ")}
    />
    {#if G.tocka}
      <line
        class="re-vod"
        x1={G.tocka.x}
        y1={G.tocka.y}
        x2={G.tocka.x}
        y2={G.y2}
      />
      <circle class="re-tocka" cx={G.tocka.x} cy={G.tocka.y} r="5" />
    {/if}
    <text class="re-t" x={G.x1 + 4} y={G.y1 - 8}>E/E₀</text>
    <text class="re-t" x={G.x2 - 30} y={G.y2 + 28}>v/c</text>
  {:else}
    <rect
      class="re-okvir"
      x={ENERGIJA.stupac.x}
      y={ENERGIJA.stupac.vrh}
      width={ENERGIJA.stupac.w}
      height={ENERGIJA.stupac.dno - ENERGIJA.stupac.vrh}
      rx="4"
    />
    <text
      class="re-upitnik"
      x={ENERGIJA.stupac.x + ENERGIJA.stupac.w / 2}
      y="190"
      text-anchor="middle">?</text
    >
    <text
      class="re-t"
      x={ENERGIJA.stupac.x + ENERGIJA.stupac.w / 2}
      y="66"
      text-anchor="middle">E = ?</text
    >
    <text class="re-t" x="240" y="180" text-anchor="middle"
      >Graf energije pojavit će se</text
    >
    <text class="re-t" x="240" y="195" text-anchor="middle"
      >nakon tvog odgovora.</text
    >
  {/if}
</svg>

<style>
  .re-cijev {
    fill: color-mix(in srgb, var(--text-dim) 12%, var(--bg-elev));
    stroke: var(--border-strong);
  }
  .re-zavojnica {
    fill: color-mix(in srgb, var(--warn) 35%, var(--bg-elev));
    stroke: var(--warn);
    opacity: 0.8;
  }
  .re-trag {
    stroke: var(--primary);
    stroke-width: 6;
    stroke-linecap: round;
    opacity: 0.3;
  }
  .re-cestica {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .re-cestica-t {
    fill: #fff;
    font: 700 9px var(--font-sans);
  }
  .re-t {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .re-jako {
    fill: var(--text);
    font-weight: 700;
    font-family: var(--font-mono);
  }
  .re-mm {
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .re-mjerac {
    fill: var(--bg-elev-2);
    stroke: var(--border);
  }
  .re-mjerac-p {
    fill: var(--primary);
  }
  .re-c {
    stroke: var(--danger);
    stroke-width: 2.5;
  }
  .re-c-t {
    fill: var(--danger);
    font-weight: 700;
  }
  .re-okvir {
    fill: var(--bg-elev-2);
    stroke: var(--border);
  }
  .re-e0 {
    fill: color-mix(in srgb, var(--text-dim) 45%, var(--bg-elev));
  }
  .re-ek {
    fill: var(--primary);
    transition:
      y 0.25s,
      height 0.25s;
  }
  .re-st-t {
    fill: #fff;
    font: 700 11px var(--font-sans);
  }
  .re-crt {
    stroke: var(--text-faint);
  }
  .re-os {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .re-asim {
    stroke: var(--danger);
    stroke-dasharray: 4 3;
  }
  .re-krivulja {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2.2;
  }
  .re-vod {
    stroke: var(--text-faint);
    stroke-dasharray: 2 3;
  }
  .re-tocka {
    fill: var(--warn);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .re-upitnik {
    fill: var(--text-faint);
    font: 700 28px var(--font-sans);
  }
</style>
