<script>
  // Brod leti pokraj ravnala na Zemlji: skraćuje se samo u smjeru gibanja (crtkani obris mirnog broda), a ručak
  // traje T₀ po satu u brodu i T po usklađenim satovima na Zemlji. Geometrija i iznosi: brodStanje, satoviBroda.
  import { onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import {
    brodStanje,
    satoviBroda,
    kutKazaljke,
    fizika,
    jedinicaT,
    iznos,
    fmtBeta,
    BROD,
  } from "$lib/lesson/katalog/fizika/relativnost.js";

  let {
    spec,
    beta,
    skratiti = true,
    vidi = new Set(),
    animiraj = true,
    status = null,
    ishodTekst = null,
  } = $props();

  let p = $state(0.35); // položaj leta 0…1
  let q = $state(1); // napredak ručka 0…1
  let stoji = 0;
  onMount(() => {
    let id;
    let zadnji = 0;
    const korak = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (!prefersReducedMotion.current) {
        p = (p + dt / 8) % 1;
        if (animiraj) {
          if (q < 1) q = Math.min(1, q + dt / 4.5);
          else {
            stoji += dt;
            if (stoji > 1.6) {
              stoji = 0;
              q = 0;
            }
          }
        }
      } else {
        p = 0.5;
        q = 1;
      }
      id = requestAnimationFrame(korak);
    };
    id = requestAnimationFrame(korak);
    return () => cancelAnimationFrame(id);
  });

  const J = jedinicaT(spec);
  let st = $derived(brodStanje(spec, beta, p, skratiti));
  let f = $derived(fizika(spec, beta));
  let sat = $derived(satoviBroda(spec, beta, animiraj ? q : 1));
  // obris broda u normaliziranim koordinatama (u: rep 0 → nos 1, v: 0 gore → 1 dolje)
  const OBLIK = [
    [0, 0.18],
    [0.07, 0],
    [0.74, 0],
    [1, 0.5],
    [0.74, 1],
    [0.07, 1],
    [0, 0.82],
  ];
  const put = (rep, w, y, h) =>
    "M" +
    OBLIK.map(
      ([u, v]) => `${(rep + u * w).toFixed(1)},${(y + v * h).toFixed(1)}`,
    ).join(" L") +
    " Z";
  let w = $derived(st.brod.nos - st.brod.rep);
  let oznakaL = $derived(
    vidi.has("L")
      ? `L = ${iznos(f.L, "m")}`
      : status && spec.cilj?.velicina === "L"
        ? `L = ${ishodTekst}`
        : "L = ?",
  );
  const tekstSata = (k) => {
    const ozn = k === "T0" ? "T₀" : "T";
    if (vidi.has(k))
      return `${ozn} = ${iznos(animiraj ? sat[k === "T0" ? "brod" : "zemlja"] : f[k], J)}`;
    if (status && spec.cilj?.velicina === k) return `${ozn} = ${ishodTekst}`;
    return `${ozn} = ?`;
  };
  const kazaljka = (cx, cy, r, min) => {
    const a = (kutKazaljke(min) * Math.PI) / 180;
    return { x2: cx + Math.sin(a) * r, y2: cy - Math.cos(a) * r };
  };
  let minute = $derived({
    T0: vidi.has("T0") ? (animiraj ? sat.brod : f.T0) : 0,
    T: vidi.has("T") ? (animiraj ? sat.zemlja : f.T) : 0,
  });
  // satovi u minutama (kazaljka); za jedinice h i s kazaljka pokazuje istu brojku na brojčaniku od 60
  const satovi = [
    { k: "T0", cx: 92, ime: "sat u brodu" },
    { k: "T", cx: 268, ime: "satovi na Zemlji" },
  ];
  let opis = $derived(
    `Brod dug ${iznos(spec.L0, "m")} dok miruje leti ${vidi.has("beta") ? `brzinom ${fmtBeta(beta, 3)}c ` : ""}pokraj ravnala na Zemlji. ${vidi.has("L") ? `Sa Zemlje je dug ${iznos(f.L, "m")}.` : ""}`,
  );
</script>

<svg viewBox="0 0 360 262" role="img" aria-label={opis}>
  <rect class="rb-svemir" x="0" y="0" width="360" height="98" />
  {#each Array.from({ length: 18 }, (_, i) => i) as i (i)}
    <circle
      class="rb-zv"
      cx={(i * 89 + 23) % 360}
      cy={6 + ((i * 41) % 88)}
      r={i % 3 ? 0.8 : 1.3}
    />
  {/each}

  <!-- obris mirnog broda -->
  {#if skratiti && st.brod.k < 0.995}
    <path
      class="rb-obris"
      d={put(st.obris.rep, BROD.dulj, st.brod.y, st.brod.h)}
    />
  {/if}
  <!-- brod -->
  <path class="rb-plamen" d="M{st.brod.rep},{st.brod.y + 9} l-14,6 l14,6 z" />
  <path class="rb-brod" d={put(st.brod.rep, w, st.brod.y, st.brod.h)} />
  {#each [0.28, 0.44, 0.6] as u (u)}
    <ellipse
      class="rb-prozor"
      cx={st.brod.rep + u * w}
      cy={st.brod.y + st.brod.h / 2}
      rx={4 * st.brod.k}
      ry="4"
    />
  {/each}
  <!-- mjera duljine -->
  <g class="rb-mjera" class:ok={status === "ok"} class:bad={status === "bad"}>
    <line x1={st.brod.rep} y1="38" x2={st.brod.nos} y2="38" />
    <line x1={st.brod.rep} y1="33" x2={st.brod.rep} y2="43" />
    <line x1={st.brod.nos} y1="33" x2={st.brod.nos} y2="43" />
    <text
      x={Math.min(300, Math.max(60, (st.brod.rep + st.brod.nos) / 2))}
      y="28"
      text-anchor="middle">{oznakaL}</text
    >
  </g>
  {#if vidi.has("beta")}
    <text class="rb-v" x="352" y="92" text-anchor="end"
      >v = {fmtBeta(beta, 3)}c →</text
    >
  {/if}

  <!-- ravnalo na Zemlji s usklađenim satovima -->
  <rect class="rb-zemlja" x="0" y="98" width="360" height="164" />
  <line class="rb-ravnalo" x1="4" y1={st.ravnaloY} x2="356" y2={st.ravnaloY} />
  {#each st.ravnalo as r (r.tekst)}
    <line
      class="rb-crt"
      x1={r.x}
      y1={st.ravnaloY}
      x2={r.x}
      y2={st.ravnaloY + 7}
    />
    <text class="rb-t rb-mm" x={r.x} y={st.ravnaloY + 18} text-anchor="middle"
      >{r.tekst}</text
    >
  {/each}
  <text class="rb-t rb-mm" x="356" y={st.ravnaloY + 30} text-anchor="end"
    >m</text
  >
  {#each [60, 150, 240, 330] as x (x)}
    <circle class="rb-mini" cx={x} cy={st.ravnaloY + 34} r="6" />
    <line
      class="rb-mini-k"
      x1={x}
      y1={st.ravnaloY + 34}
      {...kazaljka(x, st.ravnaloY + 34, 5, minute.T)}
    />
  {/each}

  <!-- ručak: sat u brodu i satovi na Zemlji -->
  <text class="rb-t rb-jako" x="180" y={BROD.satY + 4} text-anchor="middle"
    >ručak</text
  >
  {#each satovi as s (s.k)}
    <g>
      <text
        class="rb-t"
        x={s.cx}
        y={BROD.satY - BROD.satR - 8}
        text-anchor="middle">{s.ime}</text
      >
      <circle class="rb-brojcanik" cx={s.cx} cy={BROD.satY} r={BROD.satR} />
      {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
        {@const a = (i * Math.PI) / 6}
        <line
          class="rb-crt"
          x1={s.cx + Math.sin(a) * (BROD.satR - 6)}
          y1={BROD.satY - Math.cos(a) * (BROD.satR - 6)}
          x2={s.cx + Math.sin(a) * (BROD.satR - 1)}
          y2={BROD.satY - Math.cos(a) * (BROD.satR - 1)}
        />
      {/each}
      {#if vidi.has(s.k)}
        <line
          class="rb-kaz"
          x1={s.cx}
          y1={BROD.satY}
          {...kazaljka(s.cx, BROD.satY, BROD.satR - 9, minute[s.k])}
        />
      {:else}
        <text class="rb-upitnik" x={s.cx} y={BROD.satY + 9} text-anchor="middle"
          >?</text
        >
      {/if}
      {#if vidi.has(s.k)}<circle
          class="rb-os"
          cx={s.cx}
          cy={BROD.satY}
          r="3"
        />{/if}
      <text
        class="rb-dig"
        x={s.cx}
        y={BROD.satY + BROD.satR + 16}
        text-anchor="middle">{tekstSata(s.k)}</text
      >
    </g>
  {/each}
</svg>
{#if !prefersReducedMotion.current}
  <figcaption class="rb-usp">
    prikaz je usporen; jedan krug kazaljke = 60 {J}
  </figcaption>
{/if}

<style>
  .rb-svemir {
    fill: color-mix(in srgb, #0b1020 85%, var(--bg-elev));
  }
  .rb-zv {
    fill: #cbd5e1;
    opacity: 0.5;
  }
  .rb-obris {
    fill: none;
    stroke: #94a3b8;
    stroke-width: 1.3;
    stroke-dasharray: 4 3;
  }
  .rb-brod {
    fill: #e2e8f0;
    stroke: #64748b;
    stroke-width: 1.2;
  }
  .rb-prozor {
    fill: #38bdf8;
  }
  .rb-plamen {
    fill: #f59e0b;
  }
  .rb-mjera line {
    stroke: #f8fafc;
    stroke-width: 1.4;
  }
  .rb-mjera text {
    fill: #f8fafc;
    font: 700 12px var(--font-mono);
  }
  .rb-mjera.ok line {
    stroke: #4ade80;
  }
  .rb-mjera.ok text {
    fill: #4ade80;
  }
  .rb-mjera.bad line {
    stroke: #f87171;
  }
  .rb-mjera.bad text {
    fill: #fca5a5;
  }
  .rb-v {
    fill: #cbd5e1;
    font: 600 11px var(--font-mono);
  }
  .rb-zemlja {
    fill: color-mix(in srgb, var(--success) 8%, var(--bg-elev));
  }
  .rb-ravnalo {
    stroke: var(--text);
    stroke-width: 2;
  }
  .rb-crt {
    stroke: var(--text-dim);
  }
  .rb-t {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .rb-mm {
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .rb-jako {
    fill: var(--text);
    font-weight: 700;
  }
  .rb-mini {
    fill: var(--bg-elev);
    stroke: var(--text-faint);
  }
  .rb-mini-k {
    stroke: var(--primary);
    stroke-width: 1.4;
  }
  .rb-brojcanik {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 2;
  }
  .rb-kaz {
    stroke: var(--primary);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .rb-os {
    fill: var(--text);
  }
  .rb-upitnik {
    fill: var(--text-faint);
    font: 700 24px var(--font-sans);
  }
  .rb-dig {
    fill: var(--text);
    font: 700 12.5px var(--font-mono);
  }
  .rb-usp {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 2px;
  }
</style>
