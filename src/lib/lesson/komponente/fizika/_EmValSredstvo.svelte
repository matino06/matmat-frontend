<script>
  // em_val / sredstvo: svjetlost prelazi granicu zraka i sredstva. Brjegovi se u sredstvu zbiju i idu sporije, a na
  // dvije isprekidane crte bljeskaju jednako često (f isti). Fizika, krivulje, tablica i skriveno: katalog.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import {
    SREDSTVO,
    SREDSTVA,
    OPCIJE_PREDVIDI,
    sredstvoCrtez,
    tablicaSredstva,
    promjene,
    trazenaVrijednost,
    lambdaRGB,
    bojaIme,
  } from "$lib/lesson/katalog/fizika/em_val.js";
  import { tocanOdgovor } from "$lib/lesson/katalog/index.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const predvidi = nacin === "predvidi";
  const izracunaj = nacin === "izracunaj";
  const istrazi = nacin === "istrazi";
  const pitaj = untrack(() => (predvidi ? spec.pitaj : []));

  // istrazi: klizači
  let nSt = $state(untrack(() => spec.sredstvo.n));
  let lamSt = $state(untrack(() => spec.lambda));

  // ── odgovor ──
  let odg = $state({});
  let poslano = $state(null);
  let unos = $state("");
  const kljuc = () => JSON.stringify(odg);
  let tocno = $derived(
    pokazi || (!!ishod?.tocno && (izracunaj || poslano === kljuc())),
  );
  let krive = $derived(
    predvidi && ishod && !ishod.tocno && !ishod.prazno && poslano === kljuc()
      ? (ishod.krive ?? [])
      : [],
  );
  let otkriveno = $derived((!predvidi && !izracunaj) || tocno);
  let aktivno = $derived(!locked && !pokazi);
  $effect(() => {
    if (!pokazi || !predvidi) return;
    untrack(() => {
      const p = promjene(spec);
      odg = Object.fromEntries(pitaj.map((k) => [k, p[k]]));
    });
  });
  function provjeriPredvidi() {
    if (locked) return;
    poslano = kljuc();
    onodgovor({ ...odg });
  }
  let sveOdabrano = $derived(pitaj.every((k) => odg[k]));

  // ── animacija ──
  let t = $state(0.35);
  let tUlaz = $state(null);
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (!prefersReducedMotion.current) t += dt;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  // kad se odgovor otkrije, val tek tada uđe u drugo sredstvo
  let bioSkriven = untrack(() => predvidi);
  $effect(() => {
    if (!otkriveno || !bioSkriven) return;
    bioSkriven = false;
    untrack(() => (tUlaz = prefersReducedMotion.current ? null : t));
  });

  let crtez = $derived(
    sredstvoCrtez(spec, { t, lambda: lamSt, n: nSt, tUlaz, otkriveno }),
  );
  let tab = $derived(
    tablicaSredstva(spec, { lambda: lamSt, n: nSt }, otkriveno),
  );
  const { granica: G, y: Y, A, vb } = SREDSTVO;
  const pts = (a) => a.map((p) => p.join(",")).join(" ");
  const strana = (o) =>
    o.n > 1.0001 ? `${o.naziv}, n = ${formatNumber(o.n, 2)}` : o.naziv;
  let sredstvoLijevo = $derived(crtez.lijevo.n > 1.0001);
  const uid = Math.random().toString(36).slice(2, 8);

  const NAZIV = {
    f: "frekvencija f",
    lambda: "valna duljina λ",
    v: "brzina v",
    T: "period T",
    boja: "boja",
  };
  const OPCIJA = {
    raste: "raste",
    pada: "pada",
    isto: "ne mijenja se",
    ista: "ostaje ista",
    druga: "promijeni se",
  };
  let opis = $derived(
    `Svjetlost (${bojaIme(lamSt)}) prelazi iz sredstva ${crtez.lijevo.naziv} u ${crtez.desno.naziv}.` +
      (otkriveno
        ? ` U sredstvu su brjegovi bliže i val je sporiji, a boja i frekvencija ostaju iste.`
        : ""),
  );
  const trazena = untrack(() => (izracunaj ? trazenaVrijednost(spec) : null));
  const IZR_OZNAKA = { lambda_s: "λₛ =", v: "v =", f: "f =" };
  const duga = Array.from(
    { length: 19 },
    (_, i) => `${lambdaRGB(380 + i * 20.5)} ${((i / 18) * 100).toFixed(1)}%`,
  ).join(", ");
</script>

<figure class="lx-figure ev-sr">
  <svg viewBox="0 0 {vb[0]} {vb[1]}" role="img" aria-label={opis}>
    <defs>
      <marker
        id="ev-sr-vrh-{uid}"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" class="ev-sr-vrh" />
      </marker>
    </defs>
    <!-- sredstva -->
    <rect
      class="ev-sr-medij"
      x={sredstvoLijevo ? 0 : G}
      y="0"
      width={vb[0] - G}
      height={vb[1]}
      rx="0"
    />
    <line class="ev-sr-granica" x1={G} y1="0" x2={G} y2={vb[1]} />
    <text class="ev-sr-ime" x={G / 2} y="17" text-anchor="middle"
      >{strana(crtez.lijevo)}</text
    >
    <text class="ev-sr-ime" x={G + (vb[0] - G) / 2} y="17" text-anchor="middle"
      >{strana(crtez.desno)}</text
    >

    <!-- vrata: brojanje brjegova -->
    {#each crtez.vrata.filter((v) => v.vidljiva) as v (v.x)}
      <line
        class="ev-sr-vrata"
        x1={v.x}
        y1={Y - A - 8}
        x2={v.x}
        y2={Y + A + 8}
      />
      {#if v.bljesak > 0.02}
        <circle
          class="ev-sr-bljesak"
          cx={v.x}
          cy={Y - A}
          r={5 + 7 * v.bljesak}
          style:opacity={v.bljesak}
          style:fill={crtez.boja}
        />
      {/if}
    {/each}

    <!-- val -->
    <polyline class="ev-sr-halo" points={pts(crtez.putL)} />
    <polyline
      class="ev-sr-val"
      points={pts(crtez.putL)}
      style:stroke={crtez.boja}
    />
    {#if crtez.putD.length}
      <polyline class="ev-sr-halo" points={pts(crtez.putD)} />
      <polyline
        class="ev-sr-val"
        points={pts(crtez.putD)}
        style:stroke={crtez.boja}
      />
    {/if}
    {#each crtez.brjegovi as b, i (i)}
      <circle
        class="ev-sr-brijeg"
        cx={b[0]}
        cy={b[1]}
        r="3.2"
        style:fill={crtez.boja}
      />
    {/each}
    {#if !crtez.putD.length}
      <text
        class="ev-sr-upitnik"
        x={G + (vb[0] - G) / 2}
        y={Y + 12}
        text-anchor="middle">?</text
      >
    {/if}

    <!-- strelice λ i v -->
    {#each crtez.strelice as s (s.vrsta + s.strana)}
      {@const ozn =
        s.vrsta === "lambda"
          ? (s.strana === "lijevo" ? sredstvoLijevo : !sredstvoLijevo)
            ? "λₛ"
            : "λ"
          : (s.strana === "lijevo" ? sredstvoLijevo : !sredstvoLijevo)
            ? "v = c/n"
            : "c"}
      <line
        class="ev-sr-strelica"
        x1={s.x1}
        y1={s.y}
        x2={s.x2}
        y2={s.y}
        marker-end="url(#ev-sr-vrh-{uid})"
        marker-start={s.vrsta === "lambda"
          ? `url(#ev-sr-vrh-${uid})`
          : undefined}
      />
      <text
        class="ev-sr-ozn"
        x={(s.x1 + s.x2) / 2}
        y={s.vrsta === "lambda" ? s.y - 6 : s.y + 15}
        text-anchor="middle">{ozn}</text
      >
    {/each}
  </svg>
  {#if !prefersReducedMotion.current}
    <figcaption class="ev-sr-napomena">
      prikaz je usporen otprilike 10¹⁵ puta
    </figcaption>
  {/if}
</figure>

<table class="ev-tab">
  <thead>
    <tr>
      <th></th>
      <th>{crtez.lijevo.naziv}</th>
      <th>{crtez.desno.naziv}</th>
    </tr>
  </thead>
  <tbody>
    {#each tab.redovi as r (r.kljuc)}
      <tr>
        <th scope="row">{r.oznaka}</th>
        {#each [r.lijevo, r.desno] as v, i (i)}
          <td class:ev-skriveno={v == null}>
            {#if v == null}?{:else if r.kljuc === "boja"}<span
                class="ev-swatch"
                style:background={tab.rgb}
              ></span>{v}{:else}{v}{/if}
          </td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>

{#if istrazi}
  <div class="ev-kontrole">
    <div class="ev-red">
      <label class="ev-red-oznaka" for="ev-n-{uid}"
        >indeks loma sredstva <b class="ev-izn">n = {formatNumber(nSt, 2)}</b
        ></label
      >
      <input
        id="ev-n-{uid}"
        type="range"
        min="1"
        max="2.5"
        step="0.01"
        bind:value={nSt}
        aria-valuetext="n = {formatNumber(nSt, 2)}"
      />
      <div class="ev-chips">
        {#each SREDSTVA as s (s.naziv)}
          <button
            type="button"
            class="ev-chip"
            class:on={Math.abs(nSt - s.n) < 1e-9}
            onclick={() => (nSt = s.n)}>{s.naziv} {formatNumber(s.n, 2)}</button
          >
        {/each}
      </div>
    </div>
    <div class="ev-red">
      <label class="ev-red-oznaka" for="ev-l-{uid}"
        >valna duljina u zraku <b class="ev-izn">λ = {formatNumber(lamSt)} nm</b
        ></label
      >
      <input
        id="ev-l-{uid}"
        class="ev-duga"
        type="range"
        min="380"
        max="750"
        step="5"
        bind:value={lamSt}
        style:--ev-duga="linear-gradient(90deg, {duga})"
        aria-valuetext="λ = {formatNumber(lamSt)} nm, {bojaIme(lamSt)}"
      />
    </div>
  </div>
{/if}

{#if otkriveno}
  <p class="ev-zakljucak" class:ev-ok={predvidi || izracunaj}>
    Na isprekidanim crtama brjegovi prolaze <b>jednako često</b> s obje strane
    granice: frekvencija je ista, pa je i boja ista ({bojaIme(lamSt)}). U
    sredstvu je val {formatNumber(
      crtez.lijevo.n > crtez.desno.n ? crtez.lijevo.n : crtez.desno.n,
      2,
    )}
    puta sporiji, pa su brjegovi toliko puta bliže.
  </p>
{/if}

{#if predvidi}
  <div class="ev-pr" role="group" aria-label="Predviđanje">
    <p class="ev-uputa">
      Što se dogodi kad svjetlost prijeđe granicu {crtez.lijevo.naziv} → {crtez
        .desno.naziv}?
    </p>
    {#each pitaj as k (k)}
      <div class="ev-pr-red" class:ev-pr-bad={krive.includes(k)}>
        <span class="ev-pr-naziv">{NAZIV[k]}</span>
        <div class="ev-seg">
          {#each OPCIJE_PREDVIDI[k] as o (o)}
            <button
              type="button"
              class="ev-seg-gumb"
              class:on={odg[k] === o}
              class:ok={tocno && odg[k] === o}
              aria-pressed={odg[k] === o}
              disabled={!aktivno}
              onclick={() => (odg = { ...odg, [k]: o })}>{OPCIJA[o]}</button
            >
          {/each}
        </div>
      </div>
    {/each}
    <div class="lx-actions ev-sr-akcije">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriPredvidi}
        disabled={locked || pokazi || !sveOdabrano}>Provjeri</button
      >
    </div>
  </div>
{/if}

{#if izracunaj}
  <div class="ev-izr">
    <span class="ev-izr-oznaka">{IZR_OZNAKA[spec.pitaj]}</span>
    <BrojUnos
      jedinica={trazena.jedinica}
      odgovor={trazena.vrijednost}
      oznaka={trazena.naziv}
      {locked}
      {ishod}
      bind:vrijednost={unos}
      {onodgovor}
    />
  </div>
  {#if pokazi}<p class="lx-solution">
      Točan odgovor: <Md text={tocanOdgovor(spec)} inline />
    </p>{/if}
{/if}

<style>
  .ev-sr {
    max-width: 440px;
    margin-bottom: 6px;
  }
  .ev-sr-medij {
    fill: color-mix(in srgb, var(--lx-water) 13%, transparent);
  }
  .ev-sr-granica {
    stroke: var(--lx-water);
    stroke-width: 2;
  }
  .ev-sr-ime {
    fill: var(--text);
    font: 600 12.5px var(--font-sans);
  }
  .ev-sr-vrata {
    stroke: var(--text-faint);
    stroke-dasharray: 3 4;
  }
  .ev-sr-bljesak {
    stroke: var(--text);
    stroke-width: 1;
  }
  .ev-sr-halo {
    fill: none;
    stroke: var(--text);
    stroke-opacity: 0.22;
    stroke-width: 6.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .ev-sr-val {
    fill: none;
    stroke-width: 3.2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .ev-sr-brijeg {
    stroke: var(--text);
    stroke-width: 1;
  }
  .ev-sr-upitnik {
    fill: var(--text-faint);
    font: 700 34px var(--font-sans);
  }
  .ev-sr-strelica {
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .ev-sr-vrh {
    fill: var(--text-dim);
  }
  .ev-sr-ozn {
    fill: var(--text);
    font: italic 600 13px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .ev-sr-napomena {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: -2px;
  }
  .ev-tab {
    margin: 0 auto 10px;
    border-collapse: collapse;
    font-size: 13.5px;
    width: 100%;
    max-width: 440px;
  }
  .ev-tab th,
  .ev-tab td {
    padding: 5px 8px;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  .ev-tab thead th {
    font-weight: 600;
    color: var(--text-dim);
    font-size: 12.5px;
  }
  .ev-tab tbody th {
    font-style: italic;
    font-weight: 600;
    color: var(--text-dim);
    width: 3.2em;
  }
  .ev-tab td {
    font-family: var(--font-mono);
    font-size: 13px;
    white-space: nowrap;
  }
  .ev-tab td.ev-skriveno {
    color: var(--text-faint);
    font-weight: 700;
  }
  .ev-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 6px;
    vertical-align: -1px;
    box-shadow: 0 0 0 1px var(--border-strong);
  }
  .ev-izn {
    color: var(--text);
    font-family: var(--font-mono);
    font-weight: 600;
    margin-left: 4px;
  }
  input[type="range"] {
    width: 100%;
    margin: 0;
    height: 30px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .ev-duga {
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
  }
  .ev-duga::-webkit-slider-runnable-track {
    height: 10px;
    border-radius: 999px;
    background: var(--ev-duga);
  }
  .ev-duga::-moz-range-track {
    height: 10px;
    border-radius: 999px;
    background: var(--ev-duga);
  }
  .ev-duga::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -6px;
    border-radius: 999px;
    background: var(--bg-elev);
    border: 2px solid var(--text);
  }
  .ev-duga::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: var(--bg-elev);
    border: 2px solid var(--text);
  }
  .ev-pr {
    max-width: 440px;
    margin: 4px auto 0;
  }
  .ev-pr-red {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }
  .ev-pr-naziv {
    font-size: 14px;
    font-weight: 500;
  }
  .ev-pr-bad .ev-pr-naziv {
    color: var(--danger);
  }
  .ev-seg {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
  }
  .ev-pr-bad .ev-seg {
    border-color: var(--danger);
  }
  .ev-seg-gumb {
    min-height: 38px;
    padding: 4px 11px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13.5px;
    border: none;
  }
  .ev-seg-gumb + .ev-seg-gumb {
    border-left: 1px solid var(--border);
  }
  .ev-seg-gumb:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .ev-seg-gumb.on {
    background: var(--primary-dim);
    color: var(--text);
    font-weight: 600;
    box-shadow: inset 0 -2px 0 var(--primary);
  }
  .ev-seg-gumb.ok {
    background: color-mix(in srgb, var(--success) 16%, transparent);
    box-shadow: inset 0 -2px 0 var(--success);
  }
  .ev-seg-gumb:disabled {
    cursor: default;
  }
  .ev-sr-akcije {
    justify-content: center;
  }
  .ev-izr {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ev-izr-oznaka {
    font-style: italic;
    font-weight: 600;
    font-size: 16px;
  }
</style>
