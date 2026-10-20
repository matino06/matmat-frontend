<script>
  // Mion u atmosferi: nastane visoko i juri prema tlu. Mionov sat (vlastito vrijeme) i sat na Zemlji kucaju uživo;
  // jedan krug kazaljke = T₀. Crtkani „duh“ raspada se nakon T₀ (klasično). Pogled iz miona: atmosfera je skraćena
  // γ puta i juri prema mionu. Položaji, satovi i oznake: mionStanje (katalog).
  import { onMount, untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import {
    mionStanje,
    mionTrajanje,
    fizika,
    visinaMiona,
    MION,
    fmtBeta,
    brojF,
  } from "$lib/lesson/katalog/fizika/relativnost.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let { spec, beta, pogled = "zemlja", pokreni = 0, kreni = true } = $props();

  const A = 4.5; // s animacije za cijeli život miona
  let t = $state(0);
  let f = $derived(fizika(spec, beta));
  let kraj = $derived(mionTrajanje(spec, beta, pogled));
  let st = $derived(mionStanje(spec, t, beta, pogled));
  $effect(() => {
    void pokreni;
    void kreni;
    untrack(() => (t = kreni && prefersReducedMotion.current ? kraj : 0));
  });
  onMount(() => {
    let id;
    let zadnji = 0;
    const korak = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (kreni && !prefersReducedMotion.current && t < kraj)
        t = Math.min(kraj, t + (dt * kraj) / A);
      id = requestAnimationFrame(korak);
    };
    id = requestAnimationFrame(korak);
    return () => cancelAnimationFrame(id);
  });
  const T0 = untrack(() => spec.T0 ?? 2.2);
  const kut = (us) => ((us / T0) * 360) % 360;
  const kazaljka = (cx, cy, r, us) => {
    const a = (kut(us) * Math.PI) / 180;
    return { x2: cx + Math.sin(a) * r, y2: cy - Math.cos(a) * r };
  };
  const mus = (us) => `${formatNumber(us, us < 10 ? 2 : 1)} µs`;
  let opis = $derived(
    !kreni
      ? `Mion nastaje na visini ${formatNumber(visinaMiona(spec))} km i giba se prema tlu brzinom ${fmtBeta(beta)}c. Mionov sat izmjerit će ${formatNumber(T0)} µs.`
      : pogled === "mion"
        ? `Pogled iz miona: atmosfera je skraćena na ${brojF(st.skraceno / 1000)} km i juri prema mionu. Mionov sat: ${mus(st.satovi.mion)}.`
        : `Mion leti prema tlu brzinom ${fmtBeta(beta)}c. Mionov sat: ${mus(st.satovi.mion)}, sat na Zemlji: ${mus(st.satovi.zemlja)}.`,
  );
  const iskra = (x, y) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return `M${x + Math.cos(a) * 5},${y + Math.sin(a) * 5} L${x + Math.cos(a) * 11},${y + Math.sin(a) * 11}`;
    }).join(" ");
</script>

<svg viewBox="0 0 360 340" role="img" aria-label={opis}>
  <defs>
    <linearGradient id="rm-nebo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="rm-n0" />
      <stop offset="1" class="rm-n1" />
    </linearGradient>
  </defs>
  <!-- atmosfera -->
  <rect
    x={MION.lijevo}
    y={st.vrh}
    width={MION.desno - MION.lijevo}
    height={Math.max(0, st.tlo - st.vrh)}
    fill="url(#rm-nebo)"
    rx="4"
  />
  <rect
    class="rm-tlo"
    x={MION.lijevo - 10}
    y={st.tlo}
    width={MION.desno - MION.lijevo + 20}
    height="16"
  />
  <text
    class="rm-t rm-tlo-t"
    x={(MION.lijevo + MION.desno) / 2}
    y={Math.min(336, st.tlo + 12)}
    text-anchor="middle">tlo</text
  >
  {#each st.oznake as o (o.tekst)}
    {#if o.y >= st.vrh - 1 && o.y <= st.tlo + 1}
      <line
        class="rm-crt"
        x1={MION.lijevo - 6}
        y1={o.y}
        x2={MION.lijevo}
        y2={o.y}
      />
      <text
        class="rm-t rm-km"
        x={MION.lijevo - 8}
        y={o.y + 3.5}
        text-anchor="end">{o.tekst.replace(" km", "")}</text
      >
    {/if}
  {/each}
  <text class="rm-t rm-km" x={MION.lijevo - 8} y="12" text-anchor="end">km</text
  >

  {#if pogled === "mion" && kreni}
    <text
      class="rm-t"
      x={(MION.lijevo + MION.desno) / 2}
      y={Math.min(st.tlo + 34, 330)}
      text-anchor="middle">atmosfera skraćena γ = {brojF(f.gama)} puta:</text
    >
    <text
      class="rm-t rm-jako"
      x={(MION.lijevo + MION.desno) / 2}
      y={Math.min(st.tlo + 48, 338)}
      text-anchor="middle"
      >{formatNumber(visinaMiona(spec))} km → {brojF(st.skraceno / 1000)} km</text
    >
    <line
      class="rm-v"
      x1={MION.desno + 10}
      y1={st.tlo}
      x2={MION.desno + 10}
      y2={st.tlo - 20}
    />
    <path class="rm-v-vrh" d="M{MION.desno + 10},{st.tlo - 26} l-4,8 l8,0 z" />
  {/if}

  <!-- duh: klasično bi se raspao nakon T₀ -->
  {#if kreni && st.duh}
    <line
      class="rm-duh-trag"
      x1={st.duh.x}
      y1={st.vrh}
      x2={st.duh.x}
      y2={st.duh.y}
    />
    {#if st.duh.raspadnut}
      <path class="rm-duh-iskra" d={iskra(st.duh.x, st.duh.y)} />
      <text class="rm-t rm-duh-t" x={st.duh.x + 13} y={st.duh.y + 4}
        >klasično</text
      >
    {:else}
      <circle class="rm-duh" cx={st.duh.x} cy={st.duh.y} r="6" />
    {/if}
  {/if}

  <!-- mion -->
  {#if kreni && pogled === "zemlja"}
    <line
      class="rm-trag"
      x1={st.mion.x}
      y1={st.vrh}
      x2={st.mion.x}
      y2={st.mion.y}
    />
  {/if}
  {#if st.mion.raspadnut}
    <path class="rm-iskra" d={iskra(st.mion.x, st.mion.y)} />
    <text class="rm-t rm-jako" x={st.mion.x + 14} y={st.mion.y + 4}>raspad</text
    >
  {:else}
    <circle class="rm-mion" cx={st.mion.x} cy={st.mion.y} r="7" />
    <text
      class="rm-mion-t"
      x={st.mion.x}
      y={st.mion.y + 3.5}
      text-anchor="middle">μ</text
    >
  {/if}
  {#if st.mion.naTlu}
    <text class="rm-t rm-jako" x={st.mion.x + 14} y={st.mion.y - 6}
      >stigao do tla!</text
    >
  {/if}
  {#if !kreni || t === 0}
    <text
      class="rm-t rm-jako"
      x={st.mion.x}
      y={st.mion.y - 12}
      text-anchor="middle">v = {fmtBeta(beta)}c</text
    >
  {/if}

  <!-- satovi: jedan krug kazaljke = T₀ -->
  {#each [{ cy: 82, ime: "mionov sat", ozn: "T₀", us: st.satovi.mion, vidi: true }, { cy: 228, ime: "sat na Zemlji", ozn: "T", us: st.satovi.zemlja, vidi: kreni && pogled === "zemlja" }] as s (s.ime)}
    <g class="rm-sat">
      <text class="rm-t" x={MION.satX} y={s.cy - 52} text-anchor="middle"
        >{s.ime} ({s.ozn})</text
      >
      <circle class="rm-brojcanik" cx={MION.satX} cy={s.cy} r="40" />
      {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
        {@const a = (i * Math.PI) / 6}
        <line
          class="rm-crt"
          x1={MION.satX + Math.sin(a) * 34}
          y1={s.cy - Math.cos(a) * 34}
          x2={MION.satX + Math.sin(a) * 39}
          y2={s.cy - Math.cos(a) * 39}
        />
      {/each}
      {#if s.vidi}
        <line
          class="rm-kaz"
          x1={MION.satX}
          y1={s.cy}
          {...kazaljka(MION.satX, s.cy, 31, s.us)}
        />
      {:else if pogled === "zemlja"}
        <text class="rm-upitnik" x={MION.satX} y={s.cy + 9} text-anchor="middle"
          >?</text
        >
      {/if}
      <circle class="rm-os" cx={MION.satX} cy={s.cy} r="3" />
      <text class="rm-dig" x={MION.satX} y={s.cy + 58} text-anchor="middle">
        {#if s.vidi}{s.ozn === "T₀" && !kreni
            ? mus(T0)
            : mus(s.us)}{:else if pogled === "zemlja"}T = ?{:else}—{/if}
      </text>
    </g>
  {/each}
  <text class="rm-t rm-mali" x={MION.satX} y="330" text-anchor="middle"
    >jedan krug kazaljke = {formatNumber(T0)} µs</text
  >
</svg>
{#if !prefersReducedMotion.current && kreni}
  <figcaption class="rm-usp">prikaz je usporen milijun puta</figcaption>
{/if}

<style>
  .rm-n0 {
    stop-color: color-mix(in srgb, #1e3a8a 70%, var(--bg-elev));
  }
  .rm-n1 {
    stop-color: color-mix(in srgb, #38bdf8 45%, var(--bg-elev));
  }
  .rm-tlo {
    fill: color-mix(in srgb, var(--success) 45%, var(--bg-elev));
  }
  .rm-tlo-t {
    fill: var(--text);
    font-weight: 600;
  }
  .rm-t {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .rm-km {
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .rm-jako {
    fill: var(--text);
    font-weight: 700;
  }
  .rm-mali {
    font-size: 10px;
    fill: var(--text-faint);
  }
  .rm-crt {
    stroke: var(--text-faint);
  }
  .rm-trag {
    stroke: #fde047;
    stroke-width: 2;
    opacity: 0.8;
  }
  .rm-mion {
    fill: #f59e0b;
    stroke: #fef3c7;
    stroke-width: 1.5;
  }
  .rm-mion-t {
    fill: #1f2937;
    font: 700 10px var(--font-sans);
  }
  .rm-iskra {
    stroke: #f59e0b;
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .rm-duh {
    fill: none;
    stroke: #e2e8f0;
    stroke-width: 1.5;
    stroke-dasharray: 3 2;
  }
  .rm-duh-trag {
    stroke: #e2e8f0;
    stroke-dasharray: 3 3;
    opacity: 0.6;
  }
  .rm-duh-iskra {
    stroke: #e2e8f0;
    stroke-width: 1.6;
    stroke-linecap: round;
    opacity: 0.8;
  }
  .rm-duh-t {
    fill: #f1f5f9;
    font-style: italic;
  }
  .rm-v {
    stroke: var(--success);
    stroke-width: 2;
  }
  .rm-v-vrh {
    fill: var(--success);
  }
  .rm-brojcanik {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 2;
  }
  .rm-kaz {
    stroke: var(--primary);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .rm-os {
    fill: var(--text);
  }
  .rm-upitnik {
    fill: var(--text-faint);
    font: 700 26px var(--font-sans);
  }
  .rm-dig {
    fill: var(--text);
    font: 700 13px var(--font-mono);
  }
  .rm-usp {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 2px;
  }
</style>
