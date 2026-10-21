<script>
  // valne_fronte, scena „dva_izvora“: voda odozgo, izvori S₁ i S₂, točka P. Geometrija, fronte, čvorne crte, titranje u P
  // i ono što je prije odgovora skriveno dolaze iz katalog/fizika/valne_fronte.js; ovdje se samo crta i vuče P.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import Ocitanja from "./_SileOcitanja.svelte";
  import Polja from "./_FrontePolja.svelte";
  import {
    valne_fronte,
    rasporedDvaIzvora,
    fizikaDvaIzvora,
    uTocki,
    grafoviUTocki,
    fronteDvaIzvora,
    cvorneCrte,
    linijaRazlike,
    ciljniOmjeri,
    tockaZaCilj,
    prilijepiP,
    usporenjeDvaIzvora,
    ustaljenoDvaIzvora,
    vidljivoDvaIzvora,
    ocitanjaDvaIzvora,
    putoviTekst,
    izracunDvaIzvora,
    zadatakDvaIzvora,
    ODABIR,
  } from "$lib/lesson/katalog/fizika/valne_fronte.js";
  import {
    pocetneVrijednosti,
    iznosJed,
  } from "$lib/lesson/katalog/fizika/_sile.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const rs = untrack(() => rasporedDvaIzvora(spec));
  const o = rs.okvir;
  const W = 360;
  const H = 240;
  const K = W / (o.x1 - o.x0);
  const r1 = (n) => Math.round(n * 10) / 10;
  const px = (x) => r1((x - o.x0) * K);
  const py = (y) => r1((y - o.y0) * K);
  const uid = Math.random().toString(36).slice(2, 8);

  let p = $state(untrack(() => pocetneVrijednosti(spec)));
  let P = $state({ ...rs.P });
  let fz = $derived(fizikaDvaIzvora(spec, p));
  let u = $derived(uTocki(spec, p, P, rs));

  // ── što se vidi ──
  let otkriveno = $derived(istrazi || pokazi || !!ishod?.tocno);
  let vid = $derived(vidljivoDvaIzvora(spec, otkriveno));
  let sve = $derived(vid.fronte === "sve");

  // ── vrijeme: izvori krenu u t = 0; nakon odgovora valovi krenu iznova, pa se vidi kako stižu do P ──
  let t = $state(0);
  let kappa = $derived(usporenjeDvaIzvora(spec, p, rs));
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      if (prefersReducedMotion.current) {
        t = ustaljenoDvaIzvora(spec, p, rs);
        zadnji = 0;
      } else {
        const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
        zadnji = now;
        t += dt / kappa;
      }
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let bioOtkriven = untrack(() => otkriveno);
  $effect(() => {
    if (otkriveno && !bioOtkriven) {
      bioOtkriven = true;
      untrack(() => (t = 0));
    }
  });
  const ponovi = () => (t = 0);

  // ── crtež ──
  const mreskanje = untrack(() =>
    Math.min(
      1.5 * fizikaDvaIzvora(spec).lambda,
      0.45 * Math.min(spec.tocka.s1, spec.tocka.s2),
    ),
  );
  let fronte = $derived(
    sve
      ? fronteDvaIzvora(spec, p, t, rs)
      : fronteDvaIzvora(spec, p, t, rs, mreskanje),
  );
  const putanja = (tocke) =>
    tocke.length
      ? "M" + tocke.map(([x, y]) => `${px(x)},${py(y)}`).join("L")
      : "";
  let cvorne = $derived(
    vid.cvorne_crte ? cvorneCrte(spec, p, rs).map((c) => putanja(c.tocke)) : [],
  );
  let ciljne = $derived(
    vid.ciljne_crte
      ? ciljniOmjeri(spec, p, rs).flatMap((kk) =>
          (kk === 0 ? [0] : [kk, -kk]).map((x) =>
            putanja(linijaRazlike(rs, x * fz.lambda)),
          ),
        )
      : [],
  );
  const w = () => (2 * Math.PI) / fz.T;
  let izvorR = $derived([
    6 + 2 * Math.sin(w() * t),
    6 + 2 * Math.sin(w() * t + (fz.faza * Math.PI) / 180),
  ]);
  let graf = $derived(
    vid.grafovi_P ? grafoviUTocki(spec, p, u.s1, u.s2, t) : null,
  );
  let sada = $derived(graf ? graf.tocke[graf.tocke.length - 1] : null);
  // P „diše“ s otklonom zbroja samo kad se smije vidjeti (inače bi odala amplitudu)
  let pR = $derived(sada && graf.Amax > 0 ? 7 + (4 * sada.y) / graf.Amax : 7);

  let put = $derived(putoviTekst(u));
  const sredina = (A, B) => [(px(A.x) + px(B.x)) / 2, (py(A.y) + py(B.y)) / 2];
  let oznaka1 = $derived(sredina(rs.S1, P));
  let oznaka2 = $derived(sredina(rs.S2, P));

  let stavke = $derived(ocitanjaDvaIzvora(spec, p, u, vid.brojaci));

  // ── grafovi u P ──
  const GX = 64;
  const GW = 210;
  const RED = 38;
  let redovi = $derived(
    graf
      ? [
          {
            naziv: "od S₁",
            kljuc: "y1",
            boja: "var(--primary)",
            desno: sada.stigao1
              ? `A₁ = ${iznosJed(fz.A1, fz.jedinica_A)}`
              : "val putuje…",
          },
          {
            naziv: "od S₂",
            kljuc: "y2",
            boja: "var(--warn)",
            desno: sada.stigao2
              ? `A₂ = ${iznosJed(fz.A2, fz.jedinica_A)}`
              : "val putuje…",
          },
          {
            naziv: "zbroj u P",
            kljuc: "y",
            boja: "var(--text)",
            desno:
              sada.stigao1 && sada.stigao2
                ? `A = ${iznosJed(u.A_P, fz.jedinica_A)}`
                : "",
          },
        ]
      : [],
  );
  const krivulja = (kljuc, i) => {
    const yc = 4 + RED / 2 + RED * i;
    const sk = (RED / 2 - 4) / Math.max(1e-9, graf.Amax);
    return graf.tocke
      .map((q, j) => {
        const x = GX + (GW * j) / (graf.tocke.length - 1);
        return `${r1(x)},${r1(yc - q[kljuc] * sk)}`;
      })
      .join(" ");
  };

  // ── vučenje P ──
  let svgEl = $state();
  let vuce = false;
  let dirnut = $state(false);
  function uScenu(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: o.x0 + q.x / K, y: o.y0 + q.y / K };
  }
  function postaviP(Q) {
    if (!Q) return;
    const mx = 0.03 * (o.x1 - o.x0);
    const my = 0.03 * (o.y1 - o.y0);
    let x = Math.min(o.x1 - mx, Math.max(o.x0 + mx, Q.x));
    let y = Math.min(o.y1 - my, Math.max(o.y0 + my, Q.y));
    const najmanje = 0.05 * (o.x1 - o.x0);
    for (const S of [rs.S1, rs.S2]) {
      const dx = x - S.x;
      const dy = y - S.y;
      const dd = Math.hypot(dx, dy);
      if (dd < najmanje) {
        x = dd ? S.x + (dx * najmanje) / dd : S.x + najmanje;
        y = dd ? S.y + (dy * najmanje) / dd : S.y;
      }
    }
    P = vid.lijepi ? prilijepiP(spec, p, { x, y }, rs) : { x, y };
    dirnut = true;
  }
  let aktivno = $derived(vid.vuci && !locked && !pokazi);
  function down(e) {
    if (!aktivno) return;
    e.preventDefault();
    vuce = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (vuce) postaviP(uScenu(e));
  }
  const up = () => (vuce = false);
  function tapniVodu(e) {
    if (aktivno) postaviP(uScenu(e));
  }
  function tipka(e) {
    if (!aktivno) return;
    const korak = 0.02 * (o.x1 - o.x0);
    const d = {
      ArrowLeft: [-korak, 0],
      ArrowRight: [korak, 0],
      ArrowUp: [0, -korak],
      ArrowDown: [0, korak],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    postaviP({ x: P.x + d[0], y: P.y + d[1] });
  }

  // ── odgovori ──
  let odabir = $state(null);
  let poslanOdabir = $state(null);
  let poslanP = $state(null);
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "postavi") {
        const q = tockaZaCilj(spec, P);
        if (q) P = q;
      }
      if (nacin === "odaberi") odabir = zadatakDvaIzvora(spec).vrsta;
    });
  });
  function provjeriOdabir() {
    if (locked || !odabir) return;
    poslanOdabir = odabir;
    onodgovor(odabir);
  }
  function provjeriP() {
    if (locked) return;
    poslanP = { ...P };
    onodgovor({ x: P.x, y: P.y });
  }
  let stanjeOpcije = (id) => {
    if (pokazi) return id === zadatakDvaIzvora(spec).vrsta ? "ok" : "";
    // krivi odabir ostaje samo označen (bez ✗): uz dvije mogućnosti ✗ bi otkrio drugu
    if (ishod?.tocno && poslanOdabir === odabir && odabir === id) return "ok";
    return odabir === id ? "sel" : "";
  };
  let pTocan = $derived(
    nacin === "postavi" &&
      (pokazi || (!!ishod?.tocno && poslanP?.x === P.x && poslanP?.y === P.y)),
  );
  let pKriv = $derived(
    nacin === "postavi" &&
      !!ishod &&
      !ishod.tocno &&
      !ishod.prazno &&
      poslanP?.x === P.x &&
      poslanP?.y === P.y,
  );

  const OZNAKE = {
    lambda: "$\\lambda =$",
    ds: "$\\Delta s =$",
    omjer: "$\\Delta s / \\lambda =$",
    A_P: "$A_P =$",
    A_jednaki: "$A =$",
  };
  const polja = untrack(() =>
    nacin === "izracunaj"
      ? spec.pitaj.map((q) => ({
          oznaka: q.oznaka ?? OZNAKE[q.velicina],
          jedinica: izracunDvaIzvora(spec, q).jedinica,
        }))
      : [],
  );

  let opis = $derived.by(() => {
    let tekst = `Voda odozgo: dva izvora valova S₁ i S₂ ${fz.faza === 180 ? "u protufazi" : "titraju jednako"} i točka P. ${put.s1}, ${put.s2}.`;
    if (sve)
      tekst += ` Razlika putova ${iznosJed(Math.abs(u.ds), "m")}, amplituda u P ${iznosJed(u.A_P, fz.jedinica_A)}.`;
    return tekst;
  });
</script>

{#if istrazi}
  <div class="vf-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure vf">
  <svg bind:this={svgEl} viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
    <defs>
      <clipPath id="vf-voda-{uid}">
        <rect x="0" y="0" width={W} height={H} rx="12" />
      </clipPath>
    </defs>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (P se pomiče i strelicama na ručki) -->
    <rect
      class="vf-voda"
      class:vf-tap={aktivno}
      x="0"
      y="0"
      width={W}
      height={H}
      rx="12"
      onclick={tapniVodu}
    />
    <g clip-path="url(#vf-voda-{uid})" class="vf-nedodir">
      {#each fronte as f, i (i)}
        <circle
          class={f.brijeg ? "vf-brijeg" : "vf-dolina"}
          cx={px(f.x)}
          cy={py(f.y)}
          r={r1(f.r * K)}
          opacity={sve
            ? r1((1 - 0.65 * f.udio) * 10) / 10
            : r1((1 - f.udio) * 10) / 10}
        />
      {/each}
      {#each cvorne as d, i (i)}
        <path class="vf-cvorna" {d} />
      {/each}
      {#each ciljne as d, i (i)}
        <path class="vf-ciljna" {d} />
      {/each}
    </g>

    <!-- putovi do P -->
    <line
      class="vf-put vf-put1"
      x1={px(rs.S1.x)}
      y1={py(rs.S1.y)}
      x2={px(P.x)}
      y2={py(P.y)}
    />
    <line
      class="vf-put vf-put2"
      x1={px(rs.S2.x)}
      y1={py(rs.S2.y)}
      x2={px(P.x)}
      y2={py(P.y)}
    />
    {#if vid.putovi}
      <text
        class="vf-oznaka vf-o1"
        x={r1(oznaka1[0])}
        y={r1(oznaka1[1] - 8)}
        text-anchor="middle">{put.s1}</text
      >
      <text
        class="vf-oznaka vf-o2"
        x={r1(oznaka2[0])}
        y={r1(oznaka2[1] + 17)}
        text-anchor="middle">{put.s2}</text
      >
    {/if}

    <!-- izvori -->
    {#each [rs.S1, rs.S2] as S, i (i)}
      <circle
        class="vf-izvor"
        class:vf-izvor2={i === 1}
        cx={px(S.x)}
        cy={py(S.y)}
        r={r1(izvorR[i])}
      />
      <text class="vf-ime" x={px(S.x) + 13} y={py(S.y) + (i === 0 ? -8 : 16)}
        >S<tspan baseline-shift="sub" font-size="9">{i + 1}</tspan></text
      >
    {/each}

    <!-- točka P -->
    <circle
      class="vf-p"
      class:vf-p-ok={pTocan}
      class:vf-p-bad={pKriv}
      cx={px(P.x)}
      cy={py(P.y)}
      r={r1(pR)}
    />
    <text class="vf-ime" x={px(P.x) + 12} y={py(P.y) - 9}>P</text>
    {#if aktivno}
      <g
        class="lx-handle vf-ruc"
        role="slider"
        tabindex="0"
        aria-label="Točka P: povuci je ili je pomiči strelicama"
        aria-valuenow={0}
        aria-valuetext="{put.s1}, {put.s2}"
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={up}
        onkeydown={tipka}
      >
        <circle class="vf-hit" cx={px(P.x)} cy={py(P.y)} r="24" />
        <circle
          class="vf-rucka"
          class:vf-ceka={!dirnut}
          cx={px(P.x)}
          cy={py(P.y)}
          r="13"
        />
      </g>
    {/if}
  </svg>
  {#if sve}
    <figcaption class="vf-legenda">
      {#if vid.fronte === "sve"}
        <span><i class="vf-l vf-l-brijeg"></i>brijeg</span>
        <span><i class="vf-l vf-l-dolina"></i>dolina</span>
      {/if}
      {#if cvorne.length}
        <span><i class="vf-l vf-l-cvorna"></i>čvorna crta (poništavanje)</span>
      {/if}
      {#if ciljne.length}
        <span><i class="vf-l vf-l-ciljna"></i>tu je cilj ostvaren</span>
      {/if}
      {#if kappa > 1.05 && !prefersReducedMotion.current}
        <span class="vf-usp">prikaz je usporen</span>
      {/if}
    </figcaption>
  {/if}
</figure>

{#if graf}
  <figure class="lx-figure vf-grafovi">
    <svg
      viewBox="0 0 {W} {RED * 3 + 8}"
      role="img"
      aria-label="Titranje u točki P: od prvog vala, od drugog vala i njihov zbroj"
    >
      {#each redovi as red, i (red.kljuc)}
        {@const yc = 4 + RED / 2 + RED * i}
        <text class="vf-g-naziv" x="4" y={yc + 4}>{red.naziv}</text>
        <line class="vf-g-os" x1={GX} y1={yc} x2={GX + GW} y2={yc} />
        <polyline
          class="vf-g-crta"
          class:vf-g-zbroj={red.kljuc === "y"}
          points={krivulja(red.kljuc, i)}
          style:stroke={red.boja}
        />
        <circle
          cx={GX + GW}
          cy={r1(
            yc - (sada[red.kljuc] * (RED / 2 - 4)) / Math.max(1e-9, graf.Amax),
          )}
          r="3"
          style:fill={red.boja}
        />
        <text class="vf-g-desno" x={GX + GW + 8} y={yc + 4}>{red.desno}</text>
      {/each}
    </svg>
  </figure>
{/if}

<Ocitanja {stavke} />
{#if istrazi}
  <Klizaci klizaci={spec.klizaci ?? []} bind:vrijednosti={p} />
{/if}

{#if nacin === "odaberi"}
  <div class="vf-opcije" role="radiogroup" aria-label="Što je u točki P?">
    {#each ODABIR as op (op.id)}
      {@const st = stanjeOpcije(op.id)}
      <button
        type="button"
        role="radio"
        aria-checked={odabir === op.id}
        class="lx-option vf-opcija"
        class:sel={st === "sel"}
        class:ok={st === "ok"}
        disabled={locked || pokazi}
        onclick={() => (odabir = op.id)}
      >
        <span class="lx-mark">{st === "ok" ? "✓" : ""}</span>
        <span><b>{op.tekst}</b><span class="vf-opis">{op.opis}</span></span>
      </button>
    {/each}
  </div>
  <div class="lx-actions vf-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriOdabir}
      disabled={locked || !odabir}>Provjeri</button
    >
  </div>
{:else if nacin === "izracunaj"}
  <Polja {polja} {locked} {ishod} {onodgovor} />
{:else if nacin === "postavi"}
  {#if !locked && !pokazi}
    <p class="vf-uputa">
      Povuci točku <i>P</i> (ili dodirni vodu) na mjesto koje traži zadatak, pa provjeri.
    </p>
  {/if}
  <div class="lx-actions vf-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriP}
      disabled={locked}>Provjeri</button
    >
  </div>
{/if}

{#if sve && !prefersReducedMotion.current}
  <div class="lx-actions vf-akcije">
    <button type="button" class="btn btn-ghost" onclick={ponovi}
      >↺ Pusti valove iznova</button
    >
  </div>
{/if}

{#if pokazi && !istrazi}
  <p class="lx-solution">
    Točan odgovor: <Md text={valne_fronte.tocanOdgovor(spec)} inline />
  </p>
{/if}

<style>
  .vf-tekst {
    margin-bottom: 10px;
  }
  .vf {
    max-width: 460px;
    margin-bottom: 6px;
  }
  .vf-voda {
    fill: color-mix(in srgb, var(--lx-water) 13%, var(--bg-elev));
    stroke: color-mix(in srgb, var(--lx-water) 45%, transparent);
    stroke-width: 1;
  }
  .vf-tap {
    cursor: crosshair;
  }
  .vf-nedodir {
    pointer-events: none;
  }
  .vf-brijeg {
    fill: none;
    stroke: var(--lx-water);
    stroke-width: 2.2;
  }
  .vf-dolina {
    fill: none;
    stroke: color-mix(in srgb, var(--lx-water) 55%, var(--text));
    stroke-width: 0.8;
    stroke-dasharray: 2 3;
  }
  .vf-cvorna {
    fill: none;
    stroke: var(--danger);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
    opacity: 0.75;
  }
  .vf-ciljna {
    fill: none;
    stroke: var(--success);
    stroke-width: 3;
    opacity: 0.55;
  }
  .vf-put {
    stroke-width: 1.8;
    pointer-events: none;
  }
  .vf-put1 {
    stroke: var(--primary);
  }
  .vf-put2 {
    stroke: var(--warn);
  }
  .vf-oznaka {
    font: 600 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3.5px;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .vf-o1 {
    fill: var(--primary);
  }
  .vf-o2 {
    fill: var(--warn);
  }
  .vf-izvor {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
    pointer-events: none;
  }
  .vf-izvor2 {
    fill: var(--warn);
  }
  .vf-ime {
    fill: var(--text);
    font: 700 13px var(--font-sans);
    font-style: italic;
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
    pointer-events: none;
  }
  .vf-p {
    fill: var(--text);
    stroke: var(--bg-elev);
    stroke-width: 2;
    pointer-events: none;
  }
  .vf-p-ok {
    fill: var(--success);
  }
  .vf-p-bad {
    fill: var(--danger);
  }
  .vf-ruc {
    outline: none;
  }
  .vf-hit {
    fill: transparent;
  }
  .vf-rucka {
    fill: color-mix(in srgb, var(--primary) 14%, transparent);
    stroke: var(--primary);
    stroke-width: 1.8;
  }
  .vf-ruc:focus-visible .vf-rucka {
    stroke-width: 3.5;
  }
  .vf-rucka.vf-ceka {
    animation: vf-puls 1.4s ease-in-out infinite;
  }
  @keyframes vf-puls {
    50% {
      r: 17px;
    }
  }
  .vf-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 14px;
    margin-top: 6px;
    font-size: 11.5px;
    color: var(--text-dim);
  }
  .vf-legenda span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .vf-l {
    display: inline-block;
    width: 18px;
    height: 0;
    border-top: 2.5px solid var(--lx-water);
  }
  .vf-l-dolina {
    border-top: 1.5px dotted
      color-mix(in srgb, var(--lx-water) 55%, var(--text));
  }
  .vf-l-cvorna {
    border-top: 2px dashed var(--danger);
  }
  .vf-l-ciljna {
    border-top: 3px solid color-mix(in srgb, var(--success) 60%, transparent);
  }
  .vf-usp {
    color: var(--text-faint);
  }
  .vf-grafovi {
    max-width: 460px;
    margin-top: 0;
  }
  .vf-g-naziv {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .vf-g-os {
    stroke: var(--border);
  }
  .vf-g-crta {
    fill: none;
    stroke-width: 1.8;
  }
  .vf-g-zbroj {
    stroke-width: 2.6;
  }
  .vf-g-desno {
    fill: var(--text);
    font: 600 11.5px var(--font-mono);
  }
  .vf-opcije {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    max-width: 460px;
    margin: 4px auto 0;
  }
  .vf-opcija {
    align-items: center;
  }
  .vf-opis {
    display: block;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .vf-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 4px;
  }
  .vf-akcije {
    justify-content: center;
  }
</style>
