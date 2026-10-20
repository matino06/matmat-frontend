<script>
  // em_val / polja: elektromagnetski val u prostoru (kosa projekcija). Učenik vuče crtež lijevo-desno i zakreće pogled;
  // u „odaberi“ dodirne os (ili gumb). Geometrija, os odgovora i ono što se ne smije vidjeti: katalog (poljaCrtez).
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import {
    OSI,
    SMJEROVI,
    POLJA,
    poljaCrtez,
    poljaOsi,
    najblizaOs,
    opisPolja,
    tocnaOs,
    trazenoPolje,
    osSmjera,
  } from "$lib/lesson/katalog/fizika/em_val.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const odaberi = nacin === "odaberi";
  const istrazi = nacin === "istrazi";
  const trazi = untrack(() => trazenoPolje(spec));

  // istrazi: učenik mijenja smjer širenja i os E
  const pocetak = untrack(() => poljaOsi(spec));
  let smjerL = $state(pocetak.smjer);
  let osEL = $state(pocetak.E);
  let sc = $derived(
    istrazi ? { ...spec, smjer_sirenja: smjerL, E: osEL, B: undefined } : spec,
  );
  let osi = $derived(poljaOsi(sc));
  function postaviSmjer(sm) {
    smjerL = sm;
    if (osEL === osSmjera(sm))
      osEL =
        OSI.find((o) => o !== osSmjera(sm) && o !== "istok-zapad") ??
        OSI.find((o) => o !== osSmjera(sm));
  }

  // ── odgovor ──
  let odabrano = $state(null);
  let poslano = $state(null);
  let tocno = $derived(pokazi || (!!ishod?.tocno && poslano === odabrano));
  let krivo = $derived(
    !!ishod && !ishod.tocno && !ishod.prazno && poslano === odabrano,
  );
  let otkriveno = $derived(!odaberi || tocno);
  let aktivno = $derived(odaberi && !locked && !pokazi);
  $effect(() => {
    if (!pokazi || !odaberi) return;
    untrack(() => (odabrano = tocnaOs(spec)));
  });
  function provjeri() {
    if (locked || !odabrano) return;
    poslano = odabrano;
    onodgovor(odabrano);
  }

  // ── animacija i pogled ──
  let yaw = $state(POLJA.yaw);
  let faza = $state(0.9);
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (!prefersReducedMotion.current)
        faza = (faza + ((2 * Math.PI) / 2.6) * dt) % (2 * Math.PI * 1000);
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let crtez = $derived(poljaCrtez(sc, { yaw, faza, otkriveno }));

  let svgEl = $state();
  let vuce = null; // {x, yaw0, pomak}
  const tockaSvg = (e) => {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  };
  function down(e) {
    vuce = {
      x: e.clientX,
      y: e.clientY,
      yaw0: yaw,
      pomak: false,
      id: e.pointerId,
    };
  }
  function move(e) {
    if (!vuce || vuce.id !== e.pointerId) return;
    const dx = e.clientX - vuce.x;
    if (!vuce.pomak && Math.abs(dx) > 6) {
      vuce.pomak = true;
      try {
        svgEl?.setPointerCapture(e.pointerId);
      } catch {
        /* sintetički događaj bez pokazivača */
      }
    }
    if (vuce.pomak) {
      const w = svgEl?.getBoundingClientRect().width || 360;
      yaw = Math.max(
        POLJA.yawMin,
        Math.min(POLJA.yawMax, vuce.yaw0 + (dx * 360 * 0.42) / w),
      );
    }
  }
  function up(e) {
    if (!vuce) return;
    const bio = vuce;
    vuce = null;
    if (bio.pomak || !aktivno) return;
    const q = tockaSvg(e);
    if (!q) return;
    const os = najblizaOs(crtez, q.x, q.y);
    if (os) odabrano = os;
  }
  function key(e) {
    const d = { ArrowLeft: -6, ArrowRight: 6 }[e.key];
    if (!d) return;
    e.preventDefault();
    yaw = Math.max(POLJA.yawMin, Math.min(POLJA.yawMax, yaw + d));
  }

  const BOJA = { E: "električno polje", B: "magnetsko polje" };
  let legenda = $derived(
    ["E", "B"].map((p) => ({
      p,
      tekst: BOJA[p],
      vidi: !odaberi || otkriveno || trazi !== p ? true : false,
    })),
  );
  const pts = (a) => a.map((p) => p.join(",")).join(" ");
  const stanjeOsi = (os) =>
    tocno && os === tocnaOs(spec)
      ? "ok"
      : krivo && os === odabrano
        ? "bad"
        : odaberi && os === odabrano
          ? "sel"
          : null;
  const uid = Math.random().toString(36).slice(2, 8);
  const NASLOV = {
    B: "Po kojoj osi titra magnetsko polje B?",
    E: "Po kojoj osi titra električno polje E?",
    smjer: "Po kojoj se osi val širi?",
  };
  let zakljucak = $derived(
    `E titra ${osi.E}, B titra ${osi.B}, a val se širi ${osi.sirenje === "gore-dolje" ? (osi.smjer === "gore" ? "uvis" : "prema dolje") : `prema ${{ istok: "istoku", zapad: "zapadu", sjever: "sjeveru", jug: "jugu" }[osi.smjer]}`}: sva tri smjera su međusobno okomita.`,
  );
</script>

<figure class="lx-figure ev-fig">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <svg
    bind:this={svgEl}
    viewBox="0 0 {POLJA.vb[0]} {POLJA.vb[1]}"
    role="img"
    aria-label={opisPolja(sc, otkriveno)}
    tabindex="0"
    class="ev-pan"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={() => (vuce = null)}
    onkeydown={key}
  >
    <defs>
      <marker
        id="ev-vrh-{uid}"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" class="ev-vrh" />
      </marker>
      <marker
        id="ev-vrhE-{uid}"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" class="ev-vrh-E" />
      </marker>
      <marker
        id="ev-vrhB-{uid}"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" class="ev-vrh-B" />
      </marker>
    </defs>

    <polygon class="ev-tlo" points={pts(crtez.tlo)} />

    {#each crtez.osi as o (o.os)}
      {@const st = stanjeOsi(o.os)}
      {#if st}
        <line
          class="ev-os-halo ev-{st}"
          x1={o.x1}
          y1={o.y1}
          x2={o.x2}
          y2={o.y2}
        />
      {/if}
      <line class="ev-os" x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} />
      {#each o.krajevi as k (k.ime)}
        <text
          class="ev-kraj"
          class:ev-kraj-sir={k.sirenje}
          x={k.tx}
          y={k.ty}
          text-anchor={k.sidro}>{k.ime}</text
        >
      {/each}
    {/each}

    {#if crtez.smjer}
      <line
        class="ev-smjer"
        x1={crtez.smjer.x1}
        y1={crtez.smjer.y1}
        x2={crtez.smjer.x2}
        y2={crtez.smjer.y2}
        marker-end="url(#ev-vrh-{uid})"
      />
    {/if}

    {#each crtez.valovi as v (v.polje)}
      <g class="ev-val ev-{v.polje}">
        {#each v.sipke as s, i (i)}
          <line class="ev-sipka" x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
        {/each}
        <polyline class="ev-krivulja" points={pts(v.put)} />
      </g>
    {/each}
    {#each crtez.tocka as t (t.polje)}
      <line
        class="ev-tocka ev-{t.polje}"
        x1={t.x1}
        y1={t.y1}
        x2={t.x2}
        y2={t.y2}
        marker-end="url(#ev-vrh{t.polje}-{uid})"
      />
    {/each}
    {#if crtez.tocka.length}
      <circle class="ev-izvor" cx={POLJA.cx} cy={POLJA.cy} r="4" />
    {/if}

    <g class="ev-legenda">
      {#each legenda as l, i (l.p)}
        <g transform="translate(10 {16 + i * 18})">
          <line
            class="ev-leg-{l.p}"
            class:ev-leg-skriveno={!l.vidi}
            x1="0"
            y1="-4"
            x2="16"
            y2="-4"
          />
          <text x="22" y="0"
            ><tspan class="ev-leg-oznaka ev-leg-t-{l.p}">{l.p}</tspan>
            {l.vidi ? l.tekst : `${l.tekst}: ?`}</text
          >
        </g>
      {/each}
    </g>
  </svg>
  <figcaption class="ev-napomena">
    povuci crtež lijevo-desno da ga zakreneš{crtez.valovi.length
      ? " · amplitude nisu u mjerilu"
      : ""}
  </figcaption>
</figure>

{#if istrazi}
  <div class="ev-kontrole">
    <div class="ev-red">
      <span class="ev-red-oznaka">smjer širenja</span>
      <div class="ev-chips">
        {#each SMJEROVI as sm (sm)}
          <button
            type="button"
            class="ev-chip"
            class:on={smjerL === sm}
            aria-pressed={smjerL === sm}
            onclick={() => postaviSmjer(sm)}>{sm}</button
          >
        {/each}
      </div>
    </div>
    <div class="ev-red">
      <span class="ev-red-oznaka">E titra</span>
      <div class="ev-chips">
        {#each OSI.filter((o) => o !== osSmjera(smjerL)) as os (os)}
          <button
            type="button"
            class="ev-chip ev-chip-E"
            class:on={osEL === os}
            aria-pressed={osEL === os}
            onclick={() => (osEL = os)}>{os}</button
          >
        {/each}
      </div>
    </div>
    <p class="ev-zakljucak" aria-live="polite">
      B titra <b>{osi.B}</b>: okomito i na E i na smjer širenja.
    </p>
  </div>
{:else if nacin === "prikaz"}
  <p class="ev-zakljucak">{zakljucak}</p>
{:else}
  <p class="ev-uputa">{NASLOV[trazi]} Dodirni os na crtežu ili gumb.</p>
  <div class="ev-osi-gumbi" role="group" aria-label="Osi">
    {#each OSI as os (os)}
      {@const st = stanjeOsi(os)}
      <button
        type="button"
        class="ev-os-gumb"
        class:sel={st === "sel"}
        class:ok={st === "ok"}
        class:bad={st === "bad"}
        aria-pressed={odabrano === os}
        disabled={!aktivno}
        onclick={() => (odabrano = os)}>{os}</button
      >
    {/each}
  </div>
  {#if tocno}
    <p class="ev-zakljucak ev-ok">{zakljucak}</p>
  {/if}
  <div class="lx-actions ev-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || pokazi || !odabrano}>Provjeri</button
    >
  </div>
{/if}

<style>
  .ev-fig {
    max-width: 420px;
    margin-bottom: 6px;
  }
  .ev-pan {
    touch-action: pan-y;
    cursor: grab;
    outline: none;
  }
  .ev-pan:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 8px;
  }
  .ev-tlo {
    fill: color-mix(in srgb, var(--text-dim) 7%, transparent);
    stroke: var(--border);
    stroke-dasharray: 3 4;
  }
  .ev-os {
    stroke: var(--text-faint);
    stroke-width: 1.4;
  }
  .ev-os-halo {
    stroke-width: 12;
    stroke-linecap: round;
    opacity: 0.35;
  }
  .ev-os-halo.ev-sel {
    stroke: var(--primary);
  }
  .ev-os-halo.ev-ok {
    stroke: var(--success);
    opacity: 0.45;
  }
  .ev-os-halo.ev-bad {
    stroke: var(--danger);
  }
  .ev-kraj {
    fill: var(--text-dim);
    font: 500 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .ev-kraj-sir {
    fill: var(--text);
    font-weight: 700;
  }
  .ev-smjer {
    stroke: var(--text);
    stroke-width: 2.4;
  }
  .ev-vrh {
    fill: var(--text);
  }
  .ev-E {
    --ev-c: var(--ev-E);
  }
  .ev-B {
    --ev-c: var(--ev-B);
  }
  .ev-krivulja {
    fill: none;
    stroke: var(--ev-c);
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .ev-sipka {
    stroke: var(--ev-c);
    stroke-width: 1.1;
    opacity: 0.55;
  }
  .ev-tocka {
    stroke: var(--ev-c);
    stroke-width: 3.5;
  }
  .ev-vrh-E {
    fill: var(--ev-E);
  }
  .ev-vrh-B {
    fill: var(--ev-B);
  }
  .ev-izvor {
    fill: var(--text);
  }
  .ev-legenda text {
    fill: var(--text-dim);
    font: 12px var(--font-sans);
  }
  .ev-leg-oznaka {
    font-weight: 700;
    font-style: italic;
  }
  .ev-leg-t-E {
    fill: var(--ev-E);
  }
  .ev-leg-t-B {
    fill: var(--ev-B);
  }
  .ev-leg-E {
    stroke: var(--ev-E);
    stroke-width: 3;
  }
  .ev-leg-B {
    stroke: var(--ev-B);
    stroke-width: 3;
  }
  .ev-leg-skriveno {
    stroke-dasharray: 3 3;
    opacity: 0.6;
  }
  .ev-napomena {
    text-align: center;
    font-size: 11.5px;
    color: var(--text-faint);
    margin-top: -2px;
  }
  .ev-osi-gumbi {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    max-width: 420px;
    margin: 0 auto;
  }
  .ev-os-gumb {
    min-height: 44px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13.5px;
    font-weight: 500;
    white-space: nowrap;
  }
  .ev-os-gumb:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .ev-os-gumb.sel {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .ev-os-gumb.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 12%, transparent);
  }
  .ev-os-gumb.bad {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, transparent);
  }
  .ev-os-gumb:disabled {
    cursor: default;
  }
  .ev-akcije {
    justify-content: center;
  }
</style>
