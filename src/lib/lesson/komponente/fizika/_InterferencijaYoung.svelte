<script>
  // Youngov pokus, pogled sa strane: laser, dvije pukotine (razmak povećan), zastor s prugama, ravnalo, sonda P sa
  // zrakama i viškom puta Δ, kaliperi i oznake za izračun. Geometrija i fizika su u katalogu (_interferencija.js).
  import {
    YG,
    pukotineYoung,
    zastorYoung,
    ravnalo,
    zrakeYoung,
    grebeni,
    sonda,
    yPx,
    yIzPx,
    cm,
  } from "$lib/lesson/katalog/fizika/_interferencija.js";

  let {
    f,
    Y,
    vid,
    boja,
    t = 0,
    animacija = true,
    sondaY = $bindable(null),
    sondaAktivna = false,
    magnet = false,
    detalji = false, // Δ i grebeni na zrakama
    kaliperi = $bindable(null),
    kaliperiAktivni = false,
    razmaci = false,
    skupina = null,
    oznake = null,
    opis = "",
  } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const [S1, S2] = pukotineYoung();
  const svjetlo = (I) =>
    `rgb(${boja.map((c) => Math.round(c * Math.pow(I, 0.85))).join(" ")})`;
  let rgb = $derived(`rgb(${boja.join(" ")})`);
  let zast = $derived(zastorYoung(f, Y));
  let rav = $derived(vid.ravnalo ? ravnalo(Y) : null);
  let zr = $derived(
    vid.sonda && sondaY != null ? zrakeYoung(f, Y, sondaY) : null,
  );
  let sn = $derived(sondaY != null ? sonda(f, sondaY) : null);
  let faza = $derived(animacija ? (t * 0.6) % 1 : 0.25);
  let grebeniZraka = $derived(
    zr && detalji
      ? zr.zrake.map((z) => grebeni(z, zr.lambdaPx, faza, 3.2))
      : [],
  );
  // ravne valne fronte laserskog snopa prema pukotinama
  const SNOP_L = 10;
  let fronte = $derived.by(() => {
    const out = [];
    const x0 = YG.laser.x + YG.laser.w + 2;
    for (let x = x0 + (faza % 1) * SNOP_L; x < YG.pregradaX - 1; x += SNOP_L)
      out.push(Math.round(x * 10) / 10);
    return out;
  });
  let maksY = $derived(new Map(zast.maksimumi.map((m) => [m.k, m.py])));

  // ── sonda ──
  let svgEl = $state();
  function tocka(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  }
  const ogranici = (y) => Math.max(-Y, Math.min(Y, y));
  function postaviSondu(py) {
    let y = ogranici(yIzPx(py, Y));
    if (magnet) {
      const u = (2 * y) / f.s;
      if (Math.abs(u - Math.round(u)) < 0.14) y = (Math.round(u) * f.s) / 2;
    }
    sondaY = y;
  }
  let vuceSondu = false;
  function sondaDown(e) {
    if (!sondaAktivna) return;
    e.preventDefault();
    vuceSondu = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const q = tocka(e);
    if (q) postaviSondu(q.y);
  }
  function sondaMove(e) {
    if (!vuceSondu) return;
    const q = tocka(e);
    if (q) postaviSondu(q.y);
  }
  const sondaUp = () => (vuceSondu = false);
  function sondaKey(e) {
    if (!sondaAktivna) return;
    const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
      e.key
    ];
    if (!k) return;
    e.preventDefault();
    const korak = magnet ? f.s / 2 : Y / 60;
    const y = sondaY ?? 0;
    sondaY = ogranici(
      magnet ? Math.round((y + k * korak) / korak) * korak : y + k * korak,
    );
  }
  let sondaTekst = $derived.by(() => {
    if (sondaY == null) return "sonda nije postavljena";
    if (vid.delta && sn)
      return `razlika putova ${sn.deltaTekst}, razlika u fazi ${sn.faza}`;
    const pc = Math.round((Math.abs(sondaY) / Y) * 100);
    return pc === 0
      ? "u središtu zastora"
      : `${pc} % pola zastora ${sondaY > 0 ? "iznad" : "ispod"} središta`;
  });

  // ── kaliperi ──
  let kMax = $derived(Math.floor(Y / f.s));
  let vuceKraj = null;
  function kalDown(e, kraj) {
    if (!kaliperiAktivni) return;
    e.preventDefault();
    vuceKraj = kraj;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function kalMove(e) {
    if (!vuceKraj) return;
    const q = tocka(e);
    if (!q) return;
    const k = Math.max(-kMax, Math.min(kMax, Math.round(yIzPx(q.y, Y) / f.s)));
    if (kaliperi[vuceKraj] !== k) kaliperi = { ...kaliperi, [vuceKraj]: k };
  }
  const kalUp = () => (vuceKraj = null);
  function kalKey(e, kraj) {
    if (!kaliperiAktivni) return;
    const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
      e.key
    ];
    if (!k) return;
    e.preventDefault();
    kaliperi = {
      ...kaliperi,
      [kraj]: Math.max(-kMax, Math.min(kMax, kaliperi[kraj] + k)),
    };
  }
  let kal = $derived.by(() => {
    if (!kaliperi) return null;
    const lo = Math.min(kaliperi.i1, kaliperi.i2);
    const hi = Math.max(kaliperi.i1, kaliperi.i2);
    const obuhvaceni = [];
    for (let k = hi; k >= lo; k--) obuhvaceni.push(k);
    return {
      lo,
      hi,
      obuhvaceni,
      yLo: yPx(lo * f.s, Y),
      yHi: yPx(hi * f.s, Y),
      L: (hi - lo) * f.s,
    };
  });
  // skupina pruga uz izračun (L preko N pruga)
  let grupa = $derived.by(() => {
    if (!skupina) return null;
    const ks = [];
    for (let k = skupina.k2; k >= skupina.k1; k--) ks.push(k);
    return {
      ks,
      yGore: yPx(skupina.k2 * f.s, Y),
      yDolje: yPx(skupina.k1 * f.s, Y),
    };
  });
  const r1 = (n) => Math.round(n * 10) / 10;
</script>

<svg
  bind:this={svgEl}
  viewBox="0 0 {YG.W} {YG.H}"
  role="img"
  aria-label={opis}
  class="ify"
>
  <defs>
    <linearGradient id="ify-pr-{uid}" x1="0" y1="0" x2="0" y2="1">
      {#each zast.stops as st, i (i)}
        <stop offset={st.o} stop-color={svjetlo(st.I)} />
      {/each}
    </linearGradient>
    <filter id="ify-sjaj-{uid}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" />
    </filter>
  </defs>
  <rect x="0" y="0" width={YG.W} height={YG.H} rx="12" class="ify-bg" />

  <!-- laser i snop -->
  <rect
    x={YG.laser.x}
    y={YG.cy - YG.laser.h / 2}
    width={YG.laser.w}
    height={YG.laser.h}
    rx="3"
    class="ify-laser"
  />
  <circle cx={YG.laser.x + YG.laser.w} cy={YG.cy} r="2.5" fill={rgb} />
  <text x={YG.laser.x + 3} y={YG.cy + 3.5} class="ify-mali">laser</text>
  <rect
    x={YG.laser.x + YG.laser.w}
    y={S1.y - 9}
    width={YG.pregradaX - YG.laser.x - YG.laser.w}
    height={S2.y - S1.y + 18}
    fill={rgb}
    opacity="0.13"
  />
  {#each fronte as x (x)}
    <line
      x1={x}
      x2={x}
      y1={S1.y - 8}
      y2={S2.y + 8}
      stroke={rgb}
      stroke-width="1.2"
      opacity="0.55"
    />
  {/each}

  <!-- pregrada s dvije pukotine -->
  <rect
    x={YG.pregradaX - 2}
    y="14"
    width="4"
    height={S1.y - YG.otvor / 2 - 14}
    class="ify-pregrada"
  />
  <rect
    x={YG.pregradaX - 2}
    y={S1.y + YG.otvor / 2}
    width="4"
    height={S2.y - S1.y - YG.otvor}
    class="ify-pregrada"
  />
  <rect
    x={YG.pregradaX - 2}
    y={S2.y + YG.otvor / 2}
    width="4"
    height={YG.H - 14 - S2.y - YG.otvor / 2}
    class="ify-pregrada"
  />
  <text x={YG.pregradaX + 6} y={S1.y - 7} class="ify-mali">S₁</text>
  <text x={YG.pregradaX + 6} y={S2.y + 14} class="ify-mali">S₂</text>

  <!-- zrake do sonde -->
  {#if zr}
    {#each zr.zrake as z, i (i)}
      <line
        x1={z.x1}
        y1={z.y1}
        x2={z.x2}
        y2={z.y2}
        stroke={rgb}
        stroke-width="1.3"
        opacity="0.7"
      />
      {#each grebeniZraka[i] ?? [] as g, j (j)}
        <line
          x1={g.x1}
          y1={g.y1}
          x2={g.x2}
          y2={g.y2}
          stroke={rgb}
          stroke-width="1.4"
          opacity="0.9"
        />
      {/each}
    {/each}
    {#if detalji && vid.delta}
      <line
        x1={zr.delta.x1}
        y1={zr.delta.y1}
        x2={zr.delta.x2}
        y2={zr.delta.y2}
        class="ify-delta"
      />
      {#if Math.hypot(zr.delta.x2 - zr.delta.x1, zr.delta.y2 - zr.delta.y1) > 3}
        <text
          x={zr.delta.x2 + 5}
          y={zr.delta.y2 + (zr.delta.y1 < YG.cy ? 13 : -5)}
          class="ify-delta-t">Δ</text
        >
      {/if}
    {/if}
  {/if}

  <!-- zastor s prugama -->
  <rect
    x={YG.zastorX}
    y={YG.vrh}
    width={YG.zastorW}
    height={YG.dno - YG.vrh}
    fill="url(#ify-pr-{uid})"
    class="ify-zastor"
  />
  <rect
    x={YG.zastorX}
    y={YG.vrh}
    width={YG.zastorW}
    height={YG.dno - YG.vrh}
    fill="url(#ify-pr-{uid})"
    filter="url(#ify-sjaj-{uid})"
    opacity="0.7"
  />
  <text
    x={YG.zastorX + YG.zastorW / 2}
    y="14"
    class="ify-mali"
    text-anchor="middle">zastor</text
  >

  <!-- krivulja intenziteta -->
  {#if vid.intenzitet}
    <line
      x1={YG.krivuljaX}
      x2={YG.krivuljaX}
      y1={YG.vrh}
      y2={YG.dno}
      class="ify-os"
    />
    <polyline
      points={zast.krivulja.map((p) => p.join(",")).join(" ")}
      fill="none"
      stroke={rgb}
      stroke-width="1.5"
    />
    <text x={YG.krivuljaX + 2} y="14" class="ify-mali">I</text>
  {/if}

  <!-- ravnalo -->
  {#if rav}
    {#each rav.crtice as c, i (i)}
      <line
        x1={YG.zastorX + YG.zastorW}
        x2={YG.zastorX + YG.zastorW + (c.glavna ? 7 : 4)}
        y1={c.py}
        y2={c.py}
        class="ify-crtica"
      />
      {#if c.oznaka != null}
        <text
          x={YG.zastorX + YG.zastorW + 10}
          y={c.py + 3.5}
          class="ify-ravnalo">{c.oznaka}</text
        >
      {/if}
    {/each}
    <text x={YG.zastorX + YG.zastorW + 10} y={YG.dno + 13} class="ify-ravnalo"
      >cm</text
    >
  {/if}

  <!-- redovi svijetlih pruga -->
  {#if vid.redovi && !grupa && !kal}
    {#each zast.maksimumi.filter((m) => !zr || Math.abs(m.py - zr.P.y) > 16) as m (m.k)}
      <text x={YG.zastorX - 4} y={m.py + 3.5} class="ify-red" text-anchor="end"
        >{Math.abs(m.k)}</text
      >
    {/each}
  {/if}

  <!-- izracunaj: zadane i tražene veličine -->
  {#if oznake}
    <text x={YG.laser.x} y={YG.cy - 16} class="ify-ozn">{oznake.lambda}</text>
    <line x1="96" x2="96" y1={S1.y} y2={S2.y} class="ify-mjera" />
    <line x1="92" x2="100" y1={S1.y} y2={S1.y} class="ify-mjera" />
    <line x1="92" x2="100" y1={S2.y} y2={S2.y} class="ify-mjera" />
    <text x="103" y={YG.cy + 4} class="ify-ozn">{oznake.d}</text>
    <line
      x1={YG.pregradaX}
      x2={YG.zastorX}
      y1={YG.H - 10}
      y2={YG.H - 10}
      class="ify-mjera"
    />
    <line
      x1={YG.pregradaX}
      x2={YG.pregradaX}
      y1={YG.H - 14}
      y2={YG.H - 6}
      class="ify-mjera"
    />
    <line
      x1={YG.zastorX}
      x2={YG.zastorX}
      y1={YG.H - 14}
      y2={YG.H - 6}
      class="ify-mjera"
    />
    <text
      x={(YG.pregradaX + YG.zastorX) / 2}
      y={YG.H - 14}
      text-anchor="middle"
      class="ify-ozn">{oznake.a}</text
    >
    {#if grupa}
      <line
        x1={YG.zastorX + YG.zastorW + 8}
        x2={YG.zastorX + YG.zastorW + 8}
        y1={grupa.yGore}
        y2={grupa.yDolje}
        class="ify-mjera"
      />
      <line
        x1={YG.zastorX + YG.zastorW + 3}
        x2={YG.zastorX + YG.zastorW + 13}
        y1={grupa.yGore}
        y2={grupa.yGore}
        class="ify-mjera"
      />
      <line
        x1={YG.zastorX + YG.zastorW + 3}
        x2={YG.zastorX + YG.zastorW + 13}
        y1={grupa.yDolje}
        y2={grupa.yDolje}
        class="ify-mjera"
      />
      <text
        x={YG.zastorX + YG.zastorW + 17}
        y={(grupa.yGore + grupa.yDolje) / 2 - 3}
        class="ify-ozn">{oznake.L}</text
      >
      <text
        x={YG.zastorX + YG.zastorW + 17}
        y={(grupa.yGore + grupa.yDolje) / 2 + 12}
        class="ify-mali">({grupa.ks.length} pruga)</text
      >
      {#each grupa.ks as k, i (k)}
        <text
          x={YG.zastorX - 4}
          y={maksY.get(k) + 3.5}
          class="ify-broj"
          text-anchor="end">{grupa.ks.length - i}</text
        >
      {/each}
      {#if oznake.s}
        {@const y1 = maksY.get(skupina.k2)}
        {@const y2 = maksY.get(skupina.k2 - 1)}
        <line x1="218" x2="218" {y1} {y2} class="ify-mjera ify-s" />
        <text x="214" y={(y1 + y2) / 2 + 4} class="ify-ozn" text-anchor="end"
          >{oznake.s}</text
        >
      {/if}
    {:else if oznake.s}
      {@const y1 = maksY.get(1)}
      {@const y2 = maksY.get(0)}
      <line
        x1={YG.zastorX + YG.zastorW + 8}
        x2={YG.zastorX + YG.zastorW + 8}
        {y1}
        {y2}
        class="ify-mjera ify-s"
      />
      <line
        x1={YG.zastorX + YG.zastorW + 3}
        x2={YG.zastorX + YG.zastorW + 13}
        {y1}
        y2={y1}
        class="ify-mjera ify-s"
      />
      <line
        x1={YG.zastorX + YG.zastorW + 3}
        x2={YG.zastorX + YG.zastorW + 13}
        y1={y2}
        {y2}
        class="ify-mjera ify-s"
      />
      <text
        x={YG.zastorX + YG.zastorW + 17}
        y={(y1 + y2) / 2 + 4}
        class="ify-ozn">{oznake.s}</text
      >
    {/if}
  {:else}
    <text x="6" y={YG.H - 7} class="ify-sitno"
      >razmak pukotina je povećan (nije u mjerilu)</text
    >
  {/if}

  <!-- kaliperi -->
  {#if kal}
    {#each kal.obuhvaceni as k, i (k)}
      <text
        x={YG.zastorX - 4}
        y={maksY.get(k) + 3.5}
        class="ify-broj"
        text-anchor="end">{i + 1}</text
      >
    {/each}
    {#if razmaci}
      {#each kal.obuhvaceni.slice(1) as k, i (k)}
        {@const ya = maksY.get(k + 1)}
        {@const yb = maksY.get(k)}
        <path
          d="M222,{ya + 2} Q212,{r1((ya + yb) / 2)} 222,{yb - 2}"
          class="ify-luk"
        />
        <text
          x="209"
          y={r1((ya + yb) / 2 + 3)}
          class="ify-razmak"
          text-anchor="end">{i + 1}</text
        >
      {/each}
    {/if}
    <line x1="306" x2="306" y1={kal.yHi} y2={kal.yLo} class="ify-kal-linija" />
    <text x="312" y={(kal.yHi + kal.yLo) / 2 - 3} class="ify-ozn">L =</text>
    <text x="312" y={(kal.yHi + kal.yLo) / 2 + 11} class="ify-ozn"
      >{cm(kal.L)}</text
    >
    {#each [["i2", kaliperi.i2], ["i1", kaliperi.i1]] as [kraj, k] (kraj)}
      {@const py = yPx(k * f.s, Y)}
      <line x1={YG.zastorX - 2} x2="306" y1={py} y2={py} class="ify-celjust" />
      {#if kaliperiAktivni}
        <g
          class="lx-handle ify-ruc"
          role="slider"
          tabindex="0"
          aria-label="Krak kalipera {kraj === 'i2'
            ? 'gore'
            : 'dolje'}: povuci ga na svijetlu prugu"
          aria-valuenow={k}
          aria-valuetext="na {Math.abs(k)}. svijetloj pruzi {k > 0
            ? 'iznad'
            : k < 0
              ? 'ispod'
              : 'u'} središta"
          onpointerdown={(e) => kalDown(e, kraj)}
          onpointermove={kalMove}
          onpointerup={kalUp}
          onpointercancel={kalUp}
          onkeydown={(e) => kalKey(e, kraj)}
        >
          <circle cx="292" cy={py} r="20" class="ify-hit" />
          <circle cx="292" cy={py} r="9" class="ify-rucka" />
          <path
            d="M288,{py - 2} l4,-4 l4,4 M288,{py + 2} l4,4 l4,-4"
            class="ify-strelice"
          />
        </g>
      {:else}
        <circle cx="292" cy={py} r="5" class="ify-rucka" />
      {/if}
    {/each}
  {/if}

  <!-- sonda P -->
  {#if vid.sonda}
    {#if sondaAktivna}
      <rect
        class="lx-handle ify-hit"
        x="180"
        y={YG.vrh - 6}
        width="120"
        height={YG.dno - YG.vrh + 12}
        role="slider"
        tabindex="0"
        aria-label="Sonda P na zastoru: dodirni ili povuci; strelicama gore i dolje"
        aria-valuenow={sondaY == null ? 0 : Math.round((sondaY / Y) * 100)}
        aria-valuetext={sondaTekst}
        onpointerdown={sondaDown}
        onpointermove={sondaMove}
        onpointerup={sondaUp}
        onpointercancel={sondaUp}
        onkeydown={sondaKey}
      />
    {/if}
    {#if zr}
      <line
        x1={YG.zastorX - 6}
        x2={YG.zastorX + YG.zastorW + 6}
        y1={zr.P.y}
        y2={zr.P.y}
        class="ify-sonda-crta"
      />
      <circle cx={zr.P.x} cy={zr.P.y} r="5.5" class="ify-sonda" stroke={rgb} />
      <text x={zr.P.x - 9} y={zr.P.y - 7} class="ify-p" text-anchor="end"
        >P</text
      >
    {:else if sondaAktivna}
      <text x={YG.zastorX - 8} y={YG.cy + 4} class="ify-uputa" text-anchor="end"
        >dodirni zastor →</text
      >
    {/if}
  {/if}
</svg>

<style>
  .ify {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-select: none;
  }
  .ify-bg {
    fill: #0e1117;
    stroke: var(--border);
  }
  .ify-laser {
    fill: #2a3140;
    stroke: #64748b;
  }
  .ify-pregrada {
    fill: #94a3b8;
  }
  .ify-zastor {
    stroke: #334155;
  }
  .ify-mali {
    fill: #94a3b8;
    font: 500 9.5px var(--font-sans);
  }
  .ify-sitno {
    fill: #64748b;
    font: 400 8.5px var(--font-sans);
  }
  .ify-os {
    stroke: #2b3343;
  }
  .ify-crtica {
    stroke: #94a3b8;
    stroke-width: 1;
  }
  .ify-ravnalo {
    fill: #94a3b8;
    font: 500 9px var(--font-mono);
  }
  .ify-red {
    fill: #e2e8f0;
    font: 600 9.5px var(--font-mono);
  }
  .ify-broj {
    fill: #fde68a;
    font: 700 9.5px var(--font-mono);
  }
  .ify-luk {
    fill: none;
    stroke: #fbbf24;
    stroke-width: 1.2;
    opacity: 0.8;
  }
  .ify-razmak {
    fill: #fbbf24;
    font: italic 600 8.5px var(--font-sans);
  }
  .ify-ozn {
    fill: #e2e8f0;
    font: 600 11px var(--font-sans);
  }
  .ify-mjera {
    stroke: #94a3b8;
    stroke-width: 1.1;
  }
  .ify-mjera.ify-s {
    stroke: #fbbf24;
  }
  .ify-delta {
    stroke: #fbbf24;
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.9;
  }
  .ify-delta-t {
    fill: #fbbf24;
    font: 700 12px var(--font-sans);
  }
  .ify-hit {
    fill: transparent;
    outline: none;
  }
  .ify-sonda-crta {
    stroke: #f8fafc;
    stroke-dasharray: 3 2;
    stroke-width: 1;
  }
  .ify-sonda {
    fill: #f8fafc;
    stroke-width: 2.5;
  }
  .ify-p {
    fill: #f8fafc;
    font: 700 12px var(--font-sans);
  }
  .ify-uputa {
    fill: #cbd5e1;
    font: 500 10.5px var(--font-sans);
    animation: ify-puls 1.6s ease-in-out infinite;
  }
  @keyframes ify-puls {
    50% {
      opacity: 0.45;
    }
  }
  .ify-celjust {
    stroke: #f1f5f9;
    stroke-width: 1.6;
  }
  .ify-kal-linija {
    stroke: #f1f5f9;
    stroke-width: 1.2;
    stroke-dasharray: 2 2;
  }
  .ify-ruc {
    outline: none;
  }
  .ify-rucka {
    fill: #1e293b;
    stroke: #f1f5f9;
    stroke-width: 1.8;
  }
  .ify-ruc:focus-visible .ify-rucka {
    stroke: var(--primary);
    stroke-width: 3;
  }
  .ify-strelice {
    fill: none;
    stroke: #f1f5f9;
    stroke-width: 1.3;
  }
  .ify-hit:focus-visible {
    stroke: var(--primary);
    stroke-width: 2;
  }
</style>
