<script>
  // razina_zvuka: točkasti izvor, „baloni“ (kugle) kroz uši, valne fronte čija svjetlina prati razinu, dB-ljestvica
  // s poznatim zvukovima. Fizika, geometrija, tekstovi i što je skriveno dolaze iz katalog/fizika/razina_zvuka.js;
  // ovdje se samo crta i prosljeđuje unos (vučenje uha, klizač snage, upisani brojevi).
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import {
    razina_zvuka,
    pocetnoStanje,
    scenaZvuka,
    prikazZvuka,
    prikazPredvidi,
    fronteZvuka,
    ljestvicaDb,
    rIzTocke,
    zaokruziR,
    mijenjaPrijamnik,
    rjesenjaPostavi,
    predvidiStanja,
    poljaPredvidi,
    poljaIzracunaj,
    opisPromjene,
    ravnaloZvuka,
  } from "$lib/lesson/katalog/fizika/razina_zvuka.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const postavi = nacin === "postavi";
  const predvidi = nacin === "predvidi";
  const izracunaj = nacin === "izracunaj";
  const postaviP = postavi && untrack(() => spec.mijenja === "P");
  const BOJE = ["var(--primary)", "var(--warn)"];
  const r1 = (n) => Math.round(n * 10) / 10;
  const uid = Math.random().toString(36).slice(2, 8);
  const mikrofon = untrack(() => spec.ikona === "mikrofon");

  // ── stanje: klizači (P, N) i udaljenosti prijamnika ──
  const st0 = untrack(() => pocetnoStanje(spec));
  let kl = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.klizaci ?? []).map((k) => [k.id, k.pocetak ?? k.min]),
      ),
    ),
  );
  let rr = $state([...st0.r]);
  let st = $derived({
    P: typeof spec.P === "string" ? kl[spec.P] : st0.P,
    N: typeof spec.N === "string" ? kl[spec.N] : st0.N,
    r: rr,
  });

  // ── predvidi: stanje prije, a nakon točnog odgovora animacija do stanja poslije ──
  const stanja = untrack(() => (predvidi ? predvidiStanja(spec) : null));
  let u = $state(0); // 0 = prije, 1 = poslije
  let stPrikaz = $derived.by(() => {
    if (!predvidi) return st;
    const { prije, poslije } = stanja;
    return {
      P: u > 0.5 ? poslije.P : prije.P,
      N: u > 0.5 ? poslije.N : prije.N,
      r: prije.r.map((r, i) => r + (poslije.r[i] - r) * u),
    };
  });

  // ── otkrivanje ──
  let poslano = $state(null); // JSON odgovora koji je zadnji provjeren
  let unosi = $state(
    untrack(() =>
      (izracunaj ? spec.pitaj : predvidi ? poljaPredvidi(spec) : []).map(
        () => "",
      ),
    ),
  );
  const kontrola = () => (postaviP ? st.P : rr[mijenjaPrijamnik(spec)]);
  const trenutno = () =>
    JSON.stringify(postavi ? kontrola() : unosi.map((x) => x.trim()));
  let neprom = $derived(poslano != null && poslano === trenutno());
  let otkriveno = $derived(istrazi || pokazi || (!!ishod?.tocno && neprom));

  let scena = $derived(scenaZvuka(spec, stPrikaz));
  let prikaz = $derived(prikazZvuka(spec, stPrikaz, otkriveno));
  let pp = $derived(predvidi ? prikazPredvidi(spec, otkriveno) : null);
  let duh = $derived(
    predvidi && u < 1 ? scenaZvuka(spec, stanja.poslije) : null,
  );
  const lj = ljestvicaDb();

  // predvidi: nakon otkrivanja uho klizne na novo mjesto
  $effect(() => {
    if (!predvidi || !otkriveno) return;
    untrack(() => {
      if (prefersReducedMotion.current) {
        u = 1;
        return;
      }
      const t0 = performance.now();
      const korak = (now) => {
        u = Math.min(1, (now - t0) / 900);
        if (u < 1) requestAnimationFrame(korak);
      };
      requestAnimationFrame(korak);
    });
  });

  // ── valne fronte ──
  let t = $state(0);
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        t += Math.min(0.05, (now - (zadnji || now)) / 1000);
        zadnji = now;
      } else zadnji = 0;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let fronte = $derived(fronteZvuka(spec, stPrikaz, t));

  // ── vučenje ──
  const vuceSe = (i) =>
    !locked &&
    !pokazi &&
    (istrazi || (postavi && !postaviP && i === mijenjaPrijamnik(spec)));
  let svgEl = $state();
  let vuce = $state(null);
  let dirnuto = $state(false);
  function tocka(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  }
  function down(e, i) {
    if (!vuceSe(i)) return;
    e.preventDefault();
    vuce = i;
    dirnuto = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (vuce == null) return;
    const q = tocka(e);
    if (!q) return;
    const r = rIzTocke(spec, vuce, q.x, q.y);
    if (r !== rr[vuce]) rr = rr.map((x, j) => (j === vuce ? r : x));
  }
  const up = () => (vuce = null);
  function key(e, i) {
    if (!vuceSe(i)) return;
    const { korak } = ravnaloZvuka(spec);
    const d = {
      ArrowRight: korak,
      ArrowUp: korak,
      ArrowLeft: -korak,
      ArrowDown: -korak,
      PageUp: 10 * korak,
      PageDown: -10 * korak,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    dirnuto = true;
    rr = rr.map((x, j) => (j === i ? zaokruziR(spec, x + d) : x));
  }

  // pokazi: kontrola na točno mjesto
  $effect(() => {
    if (!pokazi || !postavi) return;
    untrack(() => {
      const x = rjesenjaPostavi(spec)[0];
      if (x == null) return;
      if (postaviP) {
        const k = spec.klizaci.find((q) => q.id === spec.P);
        // na mrežu klizača (od k.min, unutar raspona), bez šuma s pomičnim zarezom
        const v = k.min + Math.round((x - k.min) / k.korak) * k.korak;
        kl = {
          ...kl,
          [spec.P]: Number(Math.min(k.max, Math.max(k.min, v)).toFixed(10)),
        };
      } else {
        const j = mijenjaPrijamnik(spec);
        rr = rr.map((v, i) => (i === j ? zaokruziR(spec, x) : v));
      }
    });
  });

  // ── provjera ──
  function provjeriPostavi() {
    if (locked) return;
    poslano = trenutno();
    onodgovor(kontrola());
  }
  let polja = $derived(
    izracunaj ? poljaIzracunaj(spec) : predvidi ? poljaPredvidi(spec) : [],
  );
  function provjeriUnos(e) {
    e.preventDefault();
    if (locked) return;
    poslano = trenutno();
    if (izracunaj) onodgovor(unosi.map((x) => x.trim()));
    else
      onodgovor(
        Object.fromEntries(polja.map((p, i) => [p.kljuc, unosi[i].trim()])),
      );
  }
  const stanjePolja = (i) => {
    if (pokazi) return null;
    if (!ishod || !neprom || ishod.prazno) return null;
    // nakon krivog odgovora bez zelenog/crvenog po polju (suzilo bi izbor: koje je polje krivo, jača/tiša);
    // samo poruka
    return ishod.tocno ? "ok" : null;
  };
  let elPolja = $state([]);
  function predznak(i) {
    const v = unosi[i].trim();
    unosi[i] = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : `−${v}`;
    elPolja[i]?.focus();
  }
  function potencija(i) {
    const v = unosi[i].trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
    elPolja[i]?.focus();
  }

  // ── natpisi ──
  const uputa = untrack(() => {
    if (postaviP) return "Pomakni klizač snage pa provjeri.";
    if (postavi) {
      const ime = spec.prijamnici[mijenjaPrijamnik(spec)].oznaka;
      return `Povuci ${ime} po isprekidanoj zraci (ili strelicama na tipkovnici), pa provjeri. Ondje razina ostaje skrivena dok ne provjeriš.`;
    }
    return "";
  });
  const promjena = untrack(() => (predvidi ? opisPromjene(spec) : ""));
  const jedR = untrack(() => scenaZvuka(spec).ravnalo.jedinica);
  let formula = $derived((st.N ?? 1) > 1 ? "I = N·P / S" : "I = P / S");
  let ariaScene = $derived(predvidi ? pp.aria : prikaz.aria);
  let markeri = $derived(
    predvidi ? pp.markeri : prikaz.prijamnici.map((p) => p.marker),
  );
  const zrakaKraj = (p) => {
    const a = (p.kut * Math.PI) / 180;
    return [
      scena.izvor.x + 340 * Math.cos(a),
      scena.izvor.y + 340 * Math.sin(a),
    ];
  };
  // oznaka uha: prvo iznad (zraka gore), drugo ispod
  const oznakaY = (p) => (p.kut < 0 ? p.y - 22 : p.y + 30);
  let poredak = $derived(
    scena.prijamnici.map((p, i) => ({ ...p, i })).sort((a, b) => b.rPx - a.rPx),
  );
  let brojIzvora = $derived(scena.izvor.N);
</script>

{#if istrazi}
  <div class="rz-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure rz">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {scena.W} {scena.H}"
    role="img"
    aria-label={ariaScene}
  >
    <defs>
      <clipPath id="rz-clip-{uid}">
        <rect x="0" y="0" width={scena.W} height={scena.H} rx="10" />
      </clipPath>
      <radialGradient id="rz-sjaj-{uid}">
        <stop offset="0" stop-color="var(--warn)" stop-opacity="0.55" />
        <stop offset="1" stop-color="var(--warn)" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect
      class="rz-pozadina"
      x="0"
      y="0"
      width={scena.W}
      height={scena.H}
      rx="10"
    />
    <g clip-path="url(#rz-clip-{uid})">
      <!-- valne fronte: svjetlina = razina zvuka na tom polumjeru -->
      {#each fronte as f, i (i)}
        <circle
          class="rz-fronta"
          cx={scena.izvor.x}
          cy={scena.izvor.y}
          r={r1(f.rPx)}
          stroke-opacity={Math.round(f.svjetlina * 55) / 100}
        />
      {/each}

      <!-- baloni (kugle) kroz uši: veći prvi -->
      {#each poredak as p (p.i)}
        <circle
          class="rz-balon"
          cx={scena.izvor.x}
          cy={scena.izvor.y}
          r={r1(p.rPx)}
          style:--boja={BOJE[p.i]}
        />
      {/each}
      {#if duh}
        {#each duh.prijamnici as p, i (i)}
          {#if Math.abs(p.rPx - scena.prijamnici[i].rPx) > 1}
            <circle
              class="rz-balon rz-duh"
              cx={scena.izvor.x}
              cy={scena.izvor.y}
              r={r1(p.rPx)}
              style:--boja={BOJE[i]}
            />
          {/if}
        {/each}
      {/if}

      <!-- ravnalo po osi -->
      <line
        class="rz-ravnalo"
        x1={scena.ravnalo.x0}
        y1={scena.ravnalo.y}
        x2={scena.ravnalo.x1}
        y2={scena.ravnalo.y}
      />
      {#each scena.ravnalo.crtice as c, i (i)}
        <line
          class="rz-crtica"
          x1={r1(c.x)}
          y1={scena.ravnalo.y}
          x2={r1(c.x)}
          y2={scena.ravnalo.y + (c.velika ? 6 : 3.5)}
        />
        {#if c.tekst != null && i > 0}
          <text
            class="rz-crtica-t"
            x={r1(c.x)}
            y={scena.ravnalo.y + 16}
            text-anchor="middle">{c.tekst}</text
          >
        {/if}
      {/each}
      <text
        class="rz-crtica-t rz-jed"
        x={scena.ravnalo.x1 + 4}
        y={scena.ravnalo.y + 29}
        text-anchor="end">r / {jedR}</text
      >

      <!-- zrake i udaljenosti -->
      {#each scena.prijamnici as p, i (i)}
        {@const k = zrakaKraj(p)}
        <line
          class="rz-zraka"
          class:rz-aktivna={vuceSe(i)}
          x1={scena.izvor.x}
          y1={scena.izvor.y}
          x2={r1(k[0])}
          y2={r1(k[1])}
          style:--boja={BOJE[i]}
        />
        <line
          class="rz-r"
          x1={scena.izvor.x}
          y1={scena.izvor.y}
          x2={r1(p.x)}
          y2={r1(p.y)}
          style:--boja={BOJE[i]}
        />
        <circle
          class="rz-presjek"
          cx={r1(p.xRavnalo)}
          cy={scena.ravnalo.y}
          r="3.2"
          style:--boja={BOJE[i]}
        />
      {/each}
    </g>

    <!-- izvor -->
    <circle
      cx={scena.izvor.x}
      cy={scena.izvor.y}
      r="26"
      fill="url(#rz-sjaj-{uid})"
    />
    {#each Array.from({ length: Math.min(brojIzvora, 4) }, (_, j) => j) as j (j)}
      {@const dy = (j - (Math.min(brojIzvora, 4) - 1) / 2) * 15}
      <g transform="translate({scena.izvor.x} {r1(scena.izvor.y + dy)})">
        <circle class="rz-izvor" r="10" />
        <path class="rz-zvucnik" d="M-5,-2.5 h3 l4,-3.5 v12 l-4,-3.5 h-3 z" />
      </g>
    {/each}
    <text class="rz-izvor-t" x="8" y="18">{scena.izvor.tekst}</text>

    <!-- duh: položaj nakon promjene (predvidi) -->
    {#if duh}
      {#each duh.prijamnici as p, i (i)}
        {#if Math.abs(p.rPx - scena.prijamnici[i].rPx) > 1}
          <g class="rz-duh-uho" transform="translate({r1(p.x)} {r1(p.y)})">
            <circle r="14" style:--boja={BOJE[i]} />
            <text y="4.5" text-anchor="middle">?</text>
          </g>
          <text
            class="rz-oznaka rz-oznaka-duh"
            x={r1(p.x)}
            y={r1(oznakaY(p))}
            text-anchor="middle">{p.rTekst}</text
          >
        {/if}
      {/each}
    {/if}

    <!-- uši / mikrofoni -->
    {#each scena.prijamnici as p, i (i)}
      {@const aktivno = vuceSe(i)}
      <text
        class="rz-oznaka"
        x={r1(Math.min(scena.W - 40, Math.max(40, p.x)))}
        y={r1(oznakaY(p))}
        text-anchor="middle"
        style:--boja={BOJE[i]}>{p.oznaka} · {p.rTekst}</text
      >
      <g
        class="rz-uho"
        class:lx-handle={aktivno}
        class:rz-vuce={vuce === i}
        transform="translate({r1(p.x)} {r1(p.y)})"
        style:--boja={BOJE[i]}
        role={aktivno ? "slider" : undefined}
        tabindex={aktivno ? 0 : undefined}
        aria-label={aktivno
          ? `${p.oznaka}: povuci po zraci ili koristi strelice`
          : undefined}
        aria-valuemin={aktivno ? 0 : undefined}
        aria-valuemax={aktivno ? scena.rMax : undefined}
        aria-valuenow={aktivno ? rr[i] : undefined}
        aria-valuetext={aktivno ? p.rTekst : undefined}
        onpointerdown={(e) => down(e, i)}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={up}
        onkeydown={(e) => key(e, i)}
      >
        {#if aktivno}
          <circle class="rz-hit" r="24" />
          {#if !dirnuto}<circle class="rz-poziv" r="17" />{/if}
        {/if}
        <circle class="rz-uho-k" r="13" />
        {#if mikrofon}
          <rect
            class="rz-glif-f"
            x="-3.5"
            y="-8"
            width="7"
            height="10"
            rx="3.5"
          />
          <path class="rz-glif" d="M-6,-1 a6,6 0 0 0 12,0 M0,5 v3 M-3,8 h6" />
        {:else}
          <path
            class="rz-glif"
            d="M-4.5,-1.5 C-4.5,-8.5 6,-8.5 6,-1.5 C6,2.5 2,3 1.5,6.5 C1,9.5 -2.5,9.5 -3.2,7 M-0.8,-1.2 C-0.8,-4.5 3,-4.5 3,-1.5 C3,0.5 1,0.8 0.8,2.6"
          />
        {/if}
      </g>
    {/each}
  </svg>
  {#if !prefersReducedMotion.current}
    <figcaption class="rz-napomena">
      svjetlina fronti prati razinu zvuka (razmak fronti nije u mjerilu)
    </figcaption>
  {/if}
</figure>

{#if istrazi || postaviP}
  <Klizaci
    klizaci={spec.klizaci ?? []}
    bind:vrijednosti={kl}
    disabled={postavi && (locked || pokazi)}
  />
{/if}

<!-- očitanja -->
{#if predvidi}
  <p class="rz-promjena"><b>Promjena:</b> {promjena}</p>
  <table class="rz-tablica">
    <thead>
      <tr><th></th><th>prije</th><th>poslije</th></tr>
    </thead>
    <tbody>
      {#each pp.redovi as red, ri (red.oznaka)}
        <tr>
          <th scope="row" title={red.naziv}><i>{red.oznaka}</i></th>
          <td>{red.prije}</td>
          <td
            class:rz-skriveno={red.poslije === "?"}
            class:rz-otkriveno={otkriveno && ri > 0}>{red.poslije}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <div class="rz-kartice" aria-live="polite">
    {#each prikaz.prijamnici as p, i (i)}
      <div class="rz-kartica" style:--boja={BOJE[i]}>
        <div class="rz-k-naslov">
          <span class="rz-tockica"></span>{p.oznaka}
          <span class="rz-k-r"><i>r</i><sub>{p.indeks}</sub> = {p.r}</span>
        </div>
        <dl class="rz-vel">
          <dt>ploha balona <i>S</i><sub>{p.indeks}</sub></dt>
          <dd class:rz-skriveno={p.skriveno.S}>{p.S}</dd>
          <dt>intenzitet <i>I</i><sub>{p.indeks}</sub></dt>
          <dd class:rz-skriveno={p.skriveno.I}>{p.I}</dd>
          <dt class="rz-L">razina <i>L</i><sub>{p.indeks}</sub></dt>
          <dd class="rz-L" class:rz-skriveno={p.skriveno.L}>{p.L}</dd>
        </dl>
      </div>
    {/each}
  </div>
  {#if prikaz.dL}
    <p class="rz-dL">
      <i>ΔL</i> = <i>L</i><sub>1</sub> − <i>L</i><sub>2</sub> =
      <b class:rz-skriveno={prikaz.dL === "?"}>{prikaz.dL}</b>
    </p>
  {/if}
{/if}
<p class="rz-formula">
  <i>S</i> = 4π<i>r</i>² → {formula} → <i>L</i> = 10·log(<i>I</i>/<i>I</i><sub
    >0</sub
  >), <i>I</i><sub>0</sub> = 10<sup>−12</sup> W/m²
</p>

<!-- dB-ljestvica -->
<figure class="lx-figure rz-lj">
  <svg
    viewBox="0 0 {lj.W} {lj.H}"
    role="img"
    aria-label="Ljestvica razine zvuka od 0 do 130 dB s poznatim zvukovima: {lj.zvukovi
      .map((z) => `${z.naziv} ${z.L} dB`)
      .join(', ')}."
  >
    <defs>
      <linearGradient id="rz-lj-{uid}" x1="0" x2="1">
        <stop offset="0" stop-color="var(--success)" />
        <stop offset="0.55" stop-color="var(--warn)" />
        <stop offset="1" stop-color="var(--danger)" />
      </linearGradient>
    </defs>
    {#each lj.intenziteti as q, i (i)}
      <text
        class="rz-lj-I"
        x={r1(q.x)}
        y="11"
        text-anchor={i === 0 ? "start" : "middle"}
        dx={i === 0 ? -6 : 0}
        >{#if q.eksponent === 0}1 W/m²{:else}10<tspan class="rz-lj-exp" dy="-4"
            >{q.eksponent.toString().replace("-", "−")}</tspan
          >{/if}</text
      >
    {/each}
    <rect
      x={lj.x0}
      y={lj.y}
      width={lj.x1 - lj.x0}
      height={lj.visina}
      rx="6"
      fill="url(#rz-lj-{uid})"
      opacity="0.85"
    />
    {#each lj.zvukovi as z (z.L)}
      <line
        class="rz-lj-crtica"
        x1={r1(z.x)}
        y1={lj.y + lj.visina}
        x2={r1(z.x)}
        y2={lj.y + lj.visina + 4}
      />
      <text
        class="rz-lj-db"
        x={r1(z.x)}
        y={lj.y + lj.visina + 15}
        text-anchor="middle">{z.L}</text
      >
      <text
        class="rz-lj-t"
        x={r1(z.x)}
        y={lj.y + lj.visina + (z.red ? 41 : 28)}
        text-anchor={z.L === 0 ? "start" : "middle"}
        dx={z.L === 0 ? -6 : 0}>{z.naziv}</text
      >
    {/each}
    <text
      class="rz-lj-db rz-lj-jed"
      x={lj.x1}
      y={lj.y + lj.visina + 15}
      text-anchor="end">dB</text
    >
    {#each markeri as m, i (i)}
      {#if m}
        <path
          class="rz-marker"
          class:rz-marker-poslije={predvidi && i === 1}
          d="M{r1(m.x)},{lj.y + 2} l-6,-11 h12 z"
          style:--boja={predvidi ? BOJE[0] : BOJE[i]}
        />
      {/if}
    {/each}
  </svg>
</figure>

<!-- odgovor -->
{#if postavi}
  {#if !locked && !pokazi}<p class="rz-uputa">{uputa}</p>{/if}
  <div class="lx-actions rz-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriPostavi}
      disabled={locked || pokazi}>Provjeri</button
    >
  </div>
{:else if predvidi || izracunaj}
  <form class="rz-unos" onsubmit={provjeriUnos}>
    {#each polja as p, i (i)}
      {@const stanje = stanjePolja(i)}
      <div class="rz-polje">
        <label for="rz-{uid}-{i}">
          <b>{p.oznaka}</b> =
          <span class="rz-opis">{p.opis}</span>
        </label>
        <div class="rz-red">
          <input
            id="rz-{uid}-{i}"
            bind:this={elPolja[i]}
            class="inp lx-broj-inp"
            class:ok={stanje === "ok"}
            inputmode="decimal"
            autocomplete="off"
            placeholder="?"
            disabled={locked}
            bind:value={unosi[i]}
          />
          {#if p.jedinica}<span class="lx-unit">{p.jedinica}</span>{/if}
          {#if !locked && p.predznak}
            <button
              type="button"
              class="btn btn-quiet rz-pomoc"
              onclick={() => predznak(i)}
              aria-label="Promijeni predznak">±</button
            >
          {/if}
          {#if !locked && p.znanstveni}
            <button
              type="button"
              class="btn btn-quiet rz-pomoc"
              onclick={() => potencija(i)}
              aria-label="Dodaj potenciju broja 10">·10ⁿ</button
            >
          {/if}
        </div>
      </div>
    {/each}
    <div class="lx-actions">
      <button
        class="btn btn-primary"
        type="submit"
        disabled={locked || unosi.every((x) => !x.trim())}>Provjeri</button
      >
    </div>
  </form>
{/if}

{#if pokazi && !istrazi}
  <p class="lx-solution">Točan odgovor: {razina_zvuka.tocanOdgovor(spec)}</p>
{/if}

<style>
  .rz-tekst {
    margin-bottom: 10px;
  }
  .rz {
    max-width: 460px;
    margin-bottom: 6px;
  }
  .rz svg {
    touch-action: manipulation;
  }
  .rz-pozadina {
    fill: color-mix(in srgb, var(--text) 3%, var(--bg-elev));
    stroke: var(--border);
  }
  .rz-napomena {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 3px;
  }
  .rz-fronta {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .rz-balon {
    fill: color-mix(in srgb, var(--boja) 7%, transparent);
    stroke: var(--boja);
    stroke-width: 1.4;
    stroke-dasharray: 5 4;
    opacity: 0.9;
  }
  .rz-balon.rz-duh {
    fill: none;
    opacity: 0.55;
    stroke-dasharray: 2 4;
  }
  .rz-ravnalo {
    stroke: var(--text-faint);
    stroke-width: 1.2;
  }
  .rz-crtica {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .rz-crtica-t {
    fill: var(--text-dim);
    font: 500 10px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .rz-jed {
    font-style: italic;
  }
  .rz-zraka {
    stroke: var(--boja);
    stroke-width: 1;
    stroke-dasharray: 1.5 5;
    opacity: 0.35;
  }
  .rz-zraka.rz-aktivna {
    opacity: 0.8;
    stroke-width: 1.4;
  }
  .rz-r {
    stroke: var(--boja);
    stroke-width: 2;
    opacity: 0.75;
  }
  .rz-presjek {
    fill: var(--boja);
    stroke: var(--bg-elev);
    stroke-width: 1.2;
  }
  .rz-izvor {
    fill: var(--text);
  }
  .rz-zvucnik {
    fill: var(--bg-elev);
  }
  .rz-izvor-t {
    fill: var(--text);
    font: 600 12px var(--font-mono);
  }
  .rz-oznaka {
    fill: var(--boja);
    font: 600 11.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3.5px;
  }
  .rz-oznaka-duh {
    fill: var(--text-faint);
  }
  .rz-uho {
    outline: none;
  }
  .rz-uho-k {
    fill: var(--bg-elev);
    stroke: var(--boja);
    stroke-width: 2.2;
  }
  .rz-uho.rz-vuce .rz-uho-k {
    fill: color-mix(in srgb, var(--boja) 22%, var(--bg-elev));
  }
  .rz-uho:focus-visible .rz-uho-k {
    stroke-width: 3.5;
  }
  .rz-glif {
    fill: none;
    stroke: var(--boja);
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .rz-glif-f {
    fill: var(--boja);
  }
  .rz-hit {
    fill: transparent;
  }
  .rz-poziv {
    fill: none;
    stroke: var(--boja);
    stroke-width: 1.5;
    animation: rz-puls 1.4s ease-in-out infinite;
  }
  @keyframes rz-puls {
    50% {
      r: 22px;
      opacity: 0.2;
    }
  }
  .rz-duh-uho circle {
    fill: none;
    stroke: var(--boja);
    stroke-width: 1.6;
    stroke-dasharray: 3 3;
  }
  .rz-duh-uho text {
    fill: var(--text-dim);
    font: 700 13px var(--font-sans);
  }

  /* očitanja */
  .rz-kartice {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 8px;
    max-width: 520px;
    margin: 4px auto 8px;
  }
  .rz-kartica {
    border: 1px solid var(--border);
    border-left: 3px solid var(--boja);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    padding: 8px 10px;
  }
  .rz-k-naslov {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13.5px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .rz-tockica {
    width: 8px;
    height: 8px;
    border-radius: 99px;
    background: var(--boja);
    align-self: center;
  }
  .rz-k-r {
    margin-left: auto;
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--text-dim);
    font-size: 13px;
  }
  .rz-vel {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    align-items: baseline;
    column-gap: 10px;
    row-gap: 1px;
    margin: 0;
  }
  .rz-vel dt {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .rz-vel dd {
    margin: 0;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 13.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  dd.rz-L {
    font-size: 15px;
    color: var(--boja);
  }
  dt.rz-L {
    color: var(--text);
    font-weight: 600;
  }
  .rz-skriveno {
    color: var(--text-faint) !important;
  }
  .rz-dL {
    text-align: center;
    font-size: 14px;
    margin: 0 0 6px;
  }
  .rz-dL b {
    font-family: var(--font-mono);
  }
  .rz-formula {
    text-align: center;
    font-size: 12px;
    color: var(--text-faint);
    margin: 0 0 2px;
  }
  .rz-promjena {
    text-align: center;
    font-size: 14px;
    margin: 2px 0 6px;
  }
  .rz-tablica {
    margin: 0 auto 8px;
    max-width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .rz-tablica th,
  .rz-tablica td {
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    text-align: right;
  }
  .rz-tablica thead th {
    color: var(--text-dim);
    font-weight: 500;
    font-size: 12px;
  }
  .rz-tablica tbody th {
    text-align: left;
    font-weight: 600;
  }
  .rz-tablica td {
    font-family: var(--font-mono);
    white-space: nowrap;
  }
  .rz-otkriveno {
    color: var(--success);
    font-weight: 600;
  }

  /* ljestvica */
  .rz-lj {
    max-width: 460px;
    margin-top: 4px;
  }
  .rz-lj-I {
    fill: var(--text-faint);
    font: 500 10px var(--font-sans);
  }
  .rz-lj-exp {
    font-size: 8px;
  }
  .rz-lj-crtica {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .rz-lj-t {
    fill: var(--text-dim);
    font: 500 10.5px var(--font-sans);
  }
  .rz-lj-db {
    fill: var(--text);
    font-weight: 700;
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .rz-lj-jed {
    fill: var(--text-faint);
  }
  .rz-marker {
    fill: var(--boja);
    stroke: var(--bg-elev);
    stroke-width: 1.2;
    transition: d 0.15s;
  }
  .rz-marker.rz-marker-poslije {
    fill: color-mix(in srgb, var(--boja) 30%, var(--bg-elev));
    stroke: var(--boja);
  }

  /* odgovor */
  .rz-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 6px 0 0;
  }
  .rz-akcije {
    justify-content: center;
  }
  .rz-unos {
    display: grid;
    gap: 10px;
    margin-top: 6px;
  }
  .rz-polje label {
    display: block;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .rz-opis {
    color: var(--text-dim);
    font-size: 13px;
  }
  .rz-red {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .rz-pomoc {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
  @media (prefers-reduced-motion: reduce) {
    .rz-poziv {
      animation: none;
    }
    .rz-marker {
      transition: none;
    }
  }
</style>
