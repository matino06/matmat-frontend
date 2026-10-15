<script>
  // Mjerni instrument koji se očitava, namješta povlačenjem ili istražuje. Ljestvica izgleda kao statična skica
  // instrumenta u zadacima (taskSketch → scale), da učenik u lekciji vježba na istom crtežu koji će poslije vidjeti.
  import { untrack } from "svelte";
  import { Tween, prefersReducedMotion } from "svelte/motion";
  import { cubicIn, cubicOut } from "svelte/easing";
  import Md from "./Md.svelte";
  import BrojUnos from "./BrojUnos.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const NAZIV = { ravnalo: "Ravnalo", menzura: "Menzura", vaga: "Vaga", termometar: "Termometar" };

  // geometrija u koordinatama viewBoxa; širina 360 da na mobitelu od 360 px crtež bude ≈ 1:1
  const RAV = { x0: 26, x1: 334, top: 64, h: 48 };
  const MEN = { cx: 180, w: 72, y0: 62, y1: 250 };
  const TER = { cx: 180, y0: 30, y1: 236, by: 266 };
  const VAG = { cx: 180, cy: 148, R: 112 };

  let od = $derived(spec.od);
  let to = $derived(spec.do);
  let razmak = $derived(spec.razmak);
  let jed = $derived(spec.jedinica ?? "");
  let instrument = $derived(spec.instrument);
  let nacin = $derived(spec.nacin);
  let pitanje = $derived(nacin !== "istrazi");
  let uranjanje = $derived(nacin === "istrazi" && instrument === "menzura" ? spec.uranjanje : null);
  let vuci = $derived((nacin === "postavi" || nacin === "istrazi") && !uranjanje);
  let aktivno = $derived(vuci && !locked);

  const clean = (x) => Math.round(x * 1e9) / 1e9;
  const fmt = (v) => `${formatNumber(v)}${jed ? ` ${jed}` : ""}`;

  function niceStep(range) {
    const raw = range / 6;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 5, 10]) if (k * p >= raw) return k * p;
    return 10 * p;
  }
  let big = $derived(spec.oznaka_svakih >= razmak ? spec.oznaka_svakih : razmak * Math.max(1, Math.round(niceStep(to - od) / razmak)));
  // brojevi idu na okrugle vrijednosti (0, 10, 20 …) kao na pravom instrumentu; ako ljestvica ne počinje na
  // crtici takve mreže, broji se od početka jer inače ne bi bilo nijednog broja
  let odPoravnat = $derived(Math.abs(od / razmak - Math.round(od / razmak)) < 1e-6);
  const isBig = (u) => {
    const k = (odPoravnat ? u : u - od) / big;
    return Math.abs(k - Math.round(k)) < 1e-6;
  };
  let ticks = $derived(
    Array.from({ length: Math.round((to - od) / razmak) + 1 }, (_, i) => {
      const u = clean(od + i * razmak);
      return { u, long: isBig(u) };
    }),
  );

  const snap = (v) => clean(Math.min(to, Math.max(od, od + Math.round((v - od) / razmak) * razmak)));
  const frac = (v) => (v - od) / (to - od);

  // u „postavi“ početak ne smije biti cilj, inače bi „Provjeri“ bez pomicanja bio točan
  const pocetak = (s) => (s.nacin !== "postavi" ? s.vrijednost : s.vrijednost === s.od ? s.do : s.od);
  let val = $state(untrack(() => pocetak(spec)));
  let poslano = $state(null);
  let unos = $state("");

  $effect(() => {
    if (!pokazi) return;
    val = spec.vrijednost;
    unos = formatNumber(spec.vrijednost);
  });

  // uranjanje: razina vode i položaj kamena (0 iznad menzure, 1 na dnu) animiraju se zasebno
  const razina = new Tween(untrack(() => spec.vrijednost));
  const pad = new Tween(0);
  let faza = $state("prije");

  async function uroni() {
    if (!uranjanje) return;
    faza = "pada";
    const k = prefersReducedMotion.current ? 0 : 1;
    await pad.set(1, { duration: 650 * k, easing: cubicIn });
    await razina.set(uranjanje.nakon, { duration: 550 * k, easing: cubicOut });
    faza = "poslije";
  }
  function ponovi() {
    pad.set(0, { duration: 0 });
    razina.set(spec.vrijednost, { duration: 0 });
    faza = "prije";
  }

  let prikaz = $derived(uranjanje ? razina.current : val);

  let status = $derived(pokazi ? "ok" : ishod && poslano === val && !ishod.prazno ? (ishod.tocno ? "ok" : "bad") : "");

  // ── povlačenje ──
  let svgEl = $state();
  let vucem = false;

  function vrijednostIz(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return val;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    if (instrument === "ravnalo") return od + ((p.x - RAV.x0) / (RAV.x1 - RAV.x0)) * (to - od);
    if (instrument === "menzura") return od + ((MEN.y1 - p.y) / (MEN.y1 - MEN.y0)) * (to - od);
    if (instrument === "termometar") return od + ((TER.y1 - p.y) / (TER.y1 - TER.y0)) * (to - od);
    // vaga: kut od 210° (početak, dolje lijevo) do −30° (kraj, dolje desno); mrtvi dio luka je dolje
    let a = (Math.atan2(VAG.cy - p.y, p.x - VAG.cx) * 180) / Math.PI;
    if (a < -90) a += 360;
    return od + Math.min(1, Math.max(0, (210 - a) / 240)) * (to - od);
  }
  function down(e) {
    if (!aktivno) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    vucem = true;
    val = snap(vrijednostIz(e));
  }
  function move(e) {
    if (vucem && aktivno) val = snap(vrijednostIz(e));
  }
  function up() {
    vucem = false;
  }
  function key(e) {
    if (!aktivno) return;
    const step = { ArrowUp: razmak, ArrowRight: razmak, ArrowDown: -razmak, ArrowLeft: -razmak, PageUp: big, PageDown: -big }[e.key];
    if (e.key === "Home") val = od;
    else if (e.key === "End") val = to;
    else if (step) val = snap(val + step);
    else return;
    e.preventDefault();
  }

  function provjeri() {
    if (locked) return;
    poslano = val;
    onodgovor(val);
  }

  let opis = $derived(`${NAZIV[instrument] ?? "Instrument"}, ljestvica od ${fmt(od)} do ${fmt(to)}, jedan podjeljak ${fmt(razmak)}${nacin === "procitaj" && !pokazi ? "" : `, pokazuje ${fmt(prikaz)}`}`);

  // ── crtanje ──
  const f1 = (n) => Math.round(n * 10) / 10;
  const X = (v) => RAV.x0 + frac(v) * (RAV.x1 - RAV.x0);
  const YM = (v) => MEN.y1 - frac(v) * (MEN.y1 - MEN.y0);
  const YT = (v) => TER.y1 - frac(v) * (TER.y1 - TER.y0);
  const ang = (v) => ((210 - 240 * frac(v)) * Math.PI) / 180;
  const polar = (v, r) => [VAG.cx + r * Math.cos(ang(v)), VAG.cy - r * Math.sin(ang(v))];

  // čaša menzure: ravan vrh, zaobljeno dno; voda je isti oblik odrezan na razini
  const menL = MEN.cx - MEN.w / 2;
  const menR = MEN.cx + MEN.w / 2;
  const menDno = MEN.y1 + 4;
  const casa = (top) => `M${menL},${f1(top)} V${menDno - 8} Q${menL},${menDno} ${menL + 8},${menDno} H${menR - 8} Q${menR},${menDno} ${menR},${menDno - 8} V${f1(top)}`;

  // kamen: obla nepravilna oblutica, malo zakošena
  const KAMEN = "M-16,2 C-16,-8 -7,-12 2,-11 C11,-10 16,-4 16,3 C16,10 8,11 0,11 C-9,11 -16,9 -16,2 Z";
  const kamenGore = MEN.y0 - 38;
  const kamenDolje = menDno - 12;

  const tL = TER.cx - 10;
  const tR = TER.cx + 10;
  const tJy = TER.by - Math.sqrt(18 * 18 - 10 * 10);
  const cijev = `M${tL},${TER.y0 - 12} A10,10 0 0 1 ${tR},${TER.y0 - 12} V${f1(tJy)} A18,18 0 1 1 ${tL},${f1(tJy)} Z`;

  let luk = $derived({ a: polar(od, VAG.R), b: polar(to, VAG.R) });
  let vrh = $derived(polar(prikaz, VAG.R - 6));
  let rep = $derived(polar(prikaz, -16));
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="mj-tekst"><Md text={spec.tekst} /></div>
{/if}

{#snippet crtez()}
  {#if instrument === "ravnalo"}
    <svg bind:this={svgEl} viewBox="0 0 360 130" role="img" aria-label={opis}>
      <!-- predmet leži na ravnalu i počinje na nuli -->
      <rect class="mj-predmet" x={f1(X(od))} y={RAV.top - 38} width={f1(Math.max(0, X(prikaz) - X(od)))} height="34" rx="3" />
      <rect class="mj-ravnalo" x={RAV.x0 - 12} y={RAV.top} width={RAV.x1 - RAV.x0 + 24} height={RAV.h} rx="4" />
      {#each ticks as t (t.u)}
        <line class="lx-stroke mj-tick" x1={f1(X(t.u))} y1={RAV.top} x2={f1(X(t.u))} y2={RAV.top + (t.long ? 17 : 9)} />
        {#if t.long}<text class="lx-label" x={f1(X(t.u))} y={RAV.top + 32} text-anchor="middle">{formatNumber(t.u)}</text>{/if}
      {/each}
      {#if jed}<text class="lx-label mj-jed" x={RAV.x1 + 8} y={RAV.top + RAV.h - 5} text-anchor="end">{jed}</text>{/if}
      <line class="mj-oznaka" x1={f1(X(prikaz))} y1={RAV.top - 44} x2={f1(X(prikaz))} y2={RAV.top + 4} />
      {#if vuci}
        <rect class="mj-grip" x={f1(X(prikaz)) - 5} y={RAV.top - 32} width="10" height="22" rx="4" />
        <rect
          class="mj-hit"
          class:lx-handle={aktivno}
          role="presentation"
          x={RAV.x0 - 14}
          y={RAV.top - 50}
          width={RAV.x1 - RAV.x0 + 28}
          height="54"
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
        />
      {/if}
    </svg>
  {:else if instrument === "menzura"}
    <svg bind:this={svgEl} viewBox="0 0 360 272" role="img" aria-label={opis}>
      {#if uranjanje}
        <g transform="translate({MEN.cx} {f1(kamenGore + pad.current * (kamenDolje - kamenGore))}) rotate({f1(pad.current * 18)})">
          <path class="mj-kamen" d={KAMEN} />
        </g>
      {/if}
      {#if prikaz > od || od !== 0}
        <path class="lx-water mj-voda" d="{casa(YM(prikaz))} Z" />
      {/if}
      <line class="mj-razina" x1={menL} y1={f1(YM(prikaz))} x2={menR} y2={f1(YM(prikaz))} />
      <path class="lx-stroke mj-casa" d={casa(MEN.y0 - 18)} />
      <rect class="mj-postolje" x={MEN.cx - 52} y={menDno} width="104" height="9" rx="3" />
      {#each ticks as t (t.u)}
        <line class="lx-stroke mj-tick" x1={menL} y1={f1(YM(t.u))} x2={menL + (t.long ? 17 : 9)} y2={f1(YM(t.u))} />
        {#if t.long}<text class="lx-label" x={menL - 7} y={f1(YM(t.u)) + 4.5} text-anchor="end">{formatNumber(t.u)}</text>{/if}
      {/each}
      {#if jed}<text class="lx-label mj-jed" x={menR + 8} y={MEN.y0 - 10}>{jed}</text>{/if}
      {#if vuci}
        <path class="mj-grip" d="M{menR + 4},{f1(YM(prikaz))} l12,-8 v16 z" />
        <rect
          class="mj-hit"
          class:lx-handle={aktivno}
          role="presentation"
          x={menL - 46}
          y={MEN.y0 - 20}
          width={MEN.w + 92}
          height={MEN.y1 - MEN.y0 + 28}
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
        />
      {/if}
    </svg>
  {:else if instrument === "termometar"}
    <svg bind:this={svgEl} viewBox="0 0 360 296" role="img" aria-label={opis}>
      <path class="mj-cijev" d={cijev} />
      <circle class="mj-alkohol" cx={TER.cx} cy={TER.by} r="13" />
      <rect class="mj-alkohol" x={TER.cx - 4} y={f1(YT(prikaz))} width="8" height={f1(TER.by - YT(prikaz))} />
      <path class="lx-stroke mj-casa" d={cijev} />
      {#each ticks as t (t.u)}
        <line class="lx-stroke mj-tick" x1={tL - 5 - (t.long ? 17 : 9)} y1={f1(YT(t.u))} x2={tL - 5} y2={f1(YT(t.u))} />
        {#if t.long}<text class="lx-label" x={tL - 28} y={f1(YT(t.u)) + 4.5} text-anchor="end">{formatNumber(t.u)}</text>{/if}
      {/each}
      {#if jed}<text class="lx-label mj-jed" x={tR + 10} y={TER.y0 - 8}>{jed}</text>{/if}
      {#if vuci}
        <path class="mj-grip" d="M{tR + 5},{f1(YT(prikaz))} l12,-8 v16 z" />
        <rect
          class="mj-hit"
          class:lx-handle={aktivno}
          role="presentation"
          x={tL - 64}
          y={TER.y0 - 16}
          width="140"
          height={TER.y1 - TER.y0 + 26}
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
        />
      {/if}
    </svg>
  {:else}
    <svg bind:this={svgEl} viewBox="0 0 360 286" role="img" aria-label={opis}>
      <circle class="mj-lice" cx={VAG.cx} cy={VAG.cy} r={VAG.R + 16} />
      <path class="lx-stroke" d="M{f1(luk.a[0])},{f1(luk.a[1])} A{VAG.R},{VAG.R} 0 1 1 {f1(luk.b[0])},{f1(luk.b[1])}" />
      {#each ticks as t (t.u)}
        {@const a = polar(t.u, VAG.R)}
        {@const b = polar(t.u, VAG.R - (t.long ? 15 : 8))}
        <line class="lx-stroke mj-tick" x1={f1(a[0])} y1={f1(a[1])} x2={f1(b[0])} y2={f1(b[1])} />
        {#if t.long}
          {@const l = polar(t.u, VAG.R - 30)}
          <text class="lx-label" x={f1(l[0])} y={f1(l[1]) + 4.5} text-anchor="middle">{formatNumber(t.u)}</text>
        {/if}
      {/each}
      {#if jed}<text class="lx-label mj-jed" x={VAG.cx} y={VAG.cy + 46} text-anchor="middle">{jed}</text>{/if}
      <line class="mj-kazaljka" x1={f1(rep[0])} y1={f1(rep[1])} x2={f1(vrh[0])} y2={f1(vrh[1])} />
      <circle class="mj-os" cx={VAG.cx} cy={VAG.cy} r="6" />
      {#if vuci}
        <circle
          class="mj-hit"
          class:lx-handle={aktivno}
          role="presentation"
          cx={VAG.cx}
          cy={VAG.cy}
          r={VAG.R + 16}
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
        />
      {/if}
    </svg>
  {/if}
{/snippet}

<div class="lx-figure mj" class:mj-uspravno={instrument === "menzura" || instrument === "termometar"}>
  {#if vuci}
    <div
      class="mj-slider"
      role="slider"
      tabindex={aktivno ? 0 : -1}
      aria-label={`${NAZIV[instrument] ?? "Instrument"}: povuci ili koristi strelice`}
      aria-valuemin={od}
      aria-valuemax={to}
      aria-valuenow={val}
      aria-valuetext={nacin === "postavi" && !locked && !pokazi ? "povuci i čitaj ljestvicu" : fmt(val)}
      aria-disabled={!aktivno}
      onkeydown={key}
    >
      {@render crtez()}
    </div>
  {:else}
    {@render crtez()}
  {/if}
</div>

{#if nacin === "procitaj"}
  {#if pokazi}<p class="lx-readout">Pokazuje: <b class="ok">{fmt(spec.vrijednost)}</b></p>{/if}
  <BrojUnos jedinica={jed} {locked} {ishod} bind:vrijednost={unos} {onodgovor} oznaka="Očitana vrijednost" />
{:else if uranjanje}
  <p class="lx-readout" aria-live="polite">
    prije: <b>{fmt(spec.vrijednost)}</b>{#if faza === "poslije"}&ensp;·&ensp;poslije: <b>{fmt(uranjanje.nakon)}</b>{/if}
  </p>
  <div class="lx-actions mj-centar">
    {#if faza === "poslije"}
      <button type="button" class="btn btn-ghost" onclick={ponovi}>Ponovi</button>
    {:else}
      <button type="button" class="btn btn-primary" onclick={uroni} disabled={faza === "pada"}>{uranjanje.gumb}</button>
    {/if}
  </div>
{:else}
  <!-- kod „postavi“ očitanje uživo odalo bi odgovor: učenik bi vukao dok broj ne bude točan, umjesto da čita ljestvicu -->
  {#if nacin !== "postavi" || locked || pokazi}
    <p class="lx-readout">Pokazuje: <b class={status}>{fmt(val)}</b></p>
  {:else}
    <p class="lx-readout">Povuci na traženu vrijednost čitajući ljestvicu, pa provjeri.</p>
  {/if}
  {#if nacin === "postavi"}
    <div class="lx-actions">
      <button type="button" class="btn btn-primary" onclick={provjeri} disabled={locked}>Provjeri</button>
    </div>
  {/if}
{/if}

<style>
  .mj-tekst {
    margin-bottom: 12px;
  }
  /* okomiti instrumenti bi na širokom ekranu narasli previsoko */
  .mj-uspravno {
    max-width: 380px;
  }
  .mj .lx-label {
    font-size: 13px;
  }
  .mj .mj-jed {
    font-weight: 600;
  }
  .mj-slider {
    border-radius: var(--r-lg);
    outline: none;
  }
  .mj-slider:focus-visible {
    box-shadow: 0 0 0 2px var(--primary-border);
  }
  .mj .mj-tick {
    stroke-width: 1;
  }
  .mj .mj-casa {
    stroke-width: 2;
  }
  .mj-ravnalo {
    fill: color-mix(in srgb, var(--warn) 14%, transparent);
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .mj-predmet {
    fill: color-mix(in srgb, var(--text) 14%, transparent);
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .mj-oznaka {
    stroke: var(--lx-turn, var(--primary));
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }
  .mj .mj-voda {
    stroke: none;
  }
  .mj-razina {
    stroke: var(--lx-look, var(--primary));
    stroke-width: 2;
  }
  .mj-postolje {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .mj-kamen {
    fill: color-mix(in srgb, var(--text-dim) 55%, var(--bg-elev));
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .mj-cijev {
    fill: var(--bg-elev);
  }
  .mj-alkohol {
    fill: color-mix(in srgb, var(--danger) 75%, transparent);
  }
  .mj-lice {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .mj-kazaljka {
    stroke: var(--danger);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .mj-os {
    fill: var(--text);
  }
  .mj-grip {
    fill: var(--lx-turn, var(--primary));
  }
  .mj-hit {
    fill: transparent;
    pointer-events: all;
  }
  .lx-readout b.ok {
    color: var(--success);
  }
  .lx-readout b.bad {
    color: var(--danger);
  }
  .mj-centar {
    justify-content: center;
    margin-top: 0;
  }
</style>
