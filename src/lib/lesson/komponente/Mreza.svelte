<script>
  // Mreža kvadratića: istraživanje površine, prebrojavanje lika ili označavanje zadane površine.
  // Točan odgovor računa katalog; ovdje je samo crtež, bojanje i broj označenih kvadratića.
  import Md from "./Md.svelte";
  import BrojUnos from "./BrojUnos.svelte";
  import { formatNumber } from "../core/number.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = $derived(spec.nacin);
  const R = $derived(spec.redaka);
  const C = $derived(spec.stupaca);
  const jed2 = $derived(`${spec.jedinica}²`);
  const interaktivno = $derived(nacin === "istrazi" || nacin === "oznaci");
  const aktivno = $derived(interaktivno && !locked);

  // Kvadratić je veći kad je mreža mala; 20 stupaca još stane na mobitel od 360 px.
  const X0 = 4;
  const Y0 = 4;
  const cell = $derived(Math.max(14, Math.min(34, 320 / C)));
  const gw = $derived(C * cell);
  const gh = $derived(R * cell);
  const W = $derived(X0 + gw + 60);
  const H = $derived(Y0 + gh + 30);
  // Najviše ~360 px visine: oko mreže uvijek ostaje mjesta za pomicanje stranice prstom.
  const maxW = $derived(Math.round(Math.min(440, (360 * W) / H)));

  const kljuc = (r, c) => r * C + c;
  const sve = $derived(Array.from({ length: R * C }, (_, i) => ({ i, r: Math.floor(i / C), c: i % C })));

  function pocetno() {
    const a = Array(spec.redaka * spec.stupaca).fill(false);
    if (spec.nacin === "istrazi") for (const [r, c] of spec.oznacene ?? []) a[r * spec.stupaca + c] = true;
    return a;
  }
  let oznaceno = $state(pocetno());
  const broj = $derived(oznaceno.filter(Boolean).length);
  const povrsina = (n) => n * spec.velicina * spec.velicina;

  // prebroji: lik je zadan i ne mijenja se
  const cijeli = $derived(new Set((spec.oznacene ?? []).map(([r, c]) => kljuc(r, c))));
  const polovice = $derived((spec.polovice ?? []).map(([r, c]) => ({ r, c, d: trokut(r, c) })));

  // Polovica se okreće prema cijelim susjedima, da lik izgleda kao jedan otisak, a ne razbacani trokuti.
  function trokut(r, c) {
    const pun = (rr, cc) => (rr >= 0 && cc >= 0 && rr < R && cc < C && cijeli.has(kljuc(rr, cc)) ? 1 : 0);
    const gore = pun(r - 1, c);
    const dolje = pun(r + 1, c);
    const lijevo = pun(r, c - 1);
    const desno = pun(r, c + 1);
    const x = X0 + c * cell;
    const y = Y0 + r * cell;
    const s = cell;
    const opcije = [
      { b: lijevo + dolje, p: [[x, y], [x, y + s], [x + s, y + s]] },
      { b: gore + lijevo, p: [[x, y], [x + s, y], [x, y + s]] },
      { b: gore + desno, p: [[x, y], [x + s, y], [x + s, y + s]] },
      { b: desno + dolje, p: [[x + s, y], [x + s, y + s], [x, y + s]] },
    ];
    const naj = opcije.reduce((a, o) => (o.b > a.b ? o : a));
    return naj.p.map((q) => q.join(",")).join(" ");
  }

  // ── bojanje prstom ili mišem ──
  let svgEl = $state();
  let boja = null; // true = bojanje, false = brisanje, null = ne boja se
  let zadnja = -1;

  function celija(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return -1;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const c = Math.floor((p.x - X0) / cell);
    const r = Math.floor((p.y - Y0) / cell);
    return r >= 0 && r < R && c >= 0 && c < C ? kljuc(r, c) : -1;
  }
  function dolje(e) {
    if (!aktivno || e.button > 0) return;
    const i = celija(e);
    if (i < 0) return;
    e.preventDefault();
    svgEl.setPointerCapture?.(e.pointerId);
    // prvi dodir odlučuje: na praznom kvadratiću potez boja, na obojanom briše
    boja = !oznaceno[i];
    oznaceno[i] = boja;
    zadnja = i;
    kursor = i;
    tipkovnica = false;
  }
  function pomak(e) {
    if (boja === null || !aktivno) return;
    const i = celija(e);
    if (i < 0 || i === zadnja) return;
    oznaceno[i] = boja;
    zadnja = i;
  }
  function gore() {
    boja = null;
    zadnja = -1;
  }

  // ── tipkovnica: strelice pomiču okvir, Enter/razmak označava ──
  let kursor = $state(0);
  let tipkovnica = $state(false);
  let fokus = $state(false);
  function tipka(e) {
    if (!aktivno) return;
    const r = Math.floor(kursor / C);
    const c = kursor % C;
    const pomaci = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (pomaci[e.key]) {
      const [dr, dc] = pomaci[e.key];
      kursor = kljuc(Math.min(R - 1, Math.max(0, r + dr)), Math.min(C - 1, Math.max(0, c + dc)));
    } else if (e.key === "Enter" || e.key === " ") {
      oznaceno[kursor] = !oznaceno[kursor];
    } else return;
    e.preventDefault();
    tipkovnica = true;
  }

  const kvadratica = (n) => (n % 10 === 1 && n % 100 !== 11 ? "kvadratić" : "kvadratića");
  const opisMreze = $derived(`Mreža ${R} × ${C} kvadratića, stranica kvadratića ${formatNumber(spec.velicina)} ${spec.jedinica}`);

  let unos = $state("");
  const tocnoStanje = $derived(ishod ? (ishod.tocno ? "ok" : ishod.prazno ? "" : "bad") : "");
  const ciljKvadratica = $derived(spec.cilj ? Math.round(spec.cilj / (spec.velicina * spec.velicina)) : 0);
</script>

{#if nacin === "istrazi"}
  <Md text={spec.tekst} />
  <p class="mz-hint">Slobodno dodiruj kvadratiće – ovo nije zadatak.</p>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<div class="lx-figure mz" class:look={nacin === "istrazi"} style="max-width: {maxW}px">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <svg
    bind:this={svgEl}
    viewBox="0 0 {W} {H}"
    class:crta={interaktivno}
    class:aktivno
    role={interaktivno ? "application" : "img"}
    aria-label={interaktivno ? `${opisMreze}. Strelicama biraš kvadratić, Enter ili razmak ga označava.` : opisMreze}
    tabindex={aktivno ? 0 : undefined}
    onpointerdown={dolje}
    onpointermove={pomak}
    onpointerup={gore}
    onpointercancel={gore}
    onlostpointercapture={gore}
    onkeydown={tipka}
    onfocus={() => (fokus = true)}
    onblur={() => (fokus = false)}
  >
    {#each sve as k (k.i)}
      <rect
        class="mz-cell"
        class:on={interaktivno ? oznaceno[k.i] : cijeli.has(k.i)}
        x={X0 + k.c * cell}
        y={Y0 + k.r * cell}
        width={cell}
        height={cell}
      />
    {/each}
    {#if nacin === "prebroji"}
      {#each polovice as h (`${h.r},${h.c}`)}
        <polygon class="mz-half" points={h.d} />
      {/each}
    {/if}
    <rect class="mz-border" x={X0} y={Y0} width={gw} height={gh} />

    {#if tipkovnica && fokus && aktivno}
      <rect class="mz-cursor" x={X0 + (kursor % C) * cell + 1.5} y={Y0 + Math.floor(kursor / C) * cell + 1.5} width={cell - 3} height={cell - 3} rx="2" />
    {/if}

    <!-- kote: duljina donje i desne stranice mreže -->
    <g class="mz-dim">
      <line x1={X0} y1={Y0 + gh + 9} x2={X0 + gw} y2={Y0 + gh + 9} />
      <line x1={X0} y1={Y0 + gh + 5} x2={X0} y2={Y0 + gh + 13} />
      <line x1={X0 + gw} y1={Y0 + gh + 5} x2={X0 + gw} y2={Y0 + gh + 13} />
      <line x1={X0 + gw + 9} y1={Y0} x2={X0 + gw + 9} y2={Y0 + gh} />
      <line x1={X0 + gw + 5} y1={Y0} x2={X0 + gw + 13} y2={Y0} />
      <line x1={X0 + gw + 5} y1={Y0 + gh} x2={X0 + gw + 13} y2={Y0 + gh} />
    </g>
    <text class="lx-label" x={X0 + gw / 2} y={Y0 + gh + 23} text-anchor="middle">{formatNumber(C * spec.velicina)} {spec.jedinica}</text>
    <text class="lx-label" x={X0 + gw + 16} y={Y0 + gh / 2} dominant-baseline="middle">{formatNumber(R * spec.velicina)} {spec.jedinica}</text>
  </svg>
</div>

{#if interaktivno}
  <!-- kod „oznaci“ zbroj uživo bio bi odgovor: učenik bi dodirivao dok broj ne bude jednak cilju, umjesto da računa -->
  {#if nacin === "istrazi" || locked || pokazi || ishod}
    <p class="lx-readout mz-readout {tocnoStanje}" aria-live="polite">
      Označeno: <b>{broj} {kvadratica(broj)}</b> = <b>{formatNumber(povrsina(broj))} {jed2}</b>
    </p>
  {:else}
    <p class="lx-readout">Označi kvadratiće, pa provjeri.</p>
  {/if}
  {#if nacin === "oznaci" && pokazi}
    <p class="lx-readout">Treba označiti: <b>{ciljKvadratica} {kvadratica(ciljKvadratica)}</b> = <b>{formatNumber(spec.cilj)} {jed2}</b></p>
  {/if}
  <div class="lx-actions mz-actions">
    <button class="btn btn-ghost" type="button" disabled={!aktivno} onclick={() => (oznaceno = pocetno())}>
      {nacin === "istrazi" && (spec.oznacene ?? []).length ? "Vrati na početak" : "Očisti"}
    </button>
    {#if nacin === "oznaci"}
      <button class="btn btn-primary" type="button" disabled={locked || broj === 0} onclick={() => onodgovor(broj)}>Provjeri</button>
    {/if}
  </div>
{:else}
  {#if pokazi}
    <p class="lx-readout">
      Cijelih: <b>{cijeli.size}</b>, polovica: <b>{polovice.length}</b>
    </p>
  {/if}
  <BrojUnos jedinica={jed2} {locked} {ishod} bind:vrijednost={unos} {onodgovor} oznaka="Površina lika" />
{/if}

<style>
  .mz {
    --mz-fill: var(--lx-turn, var(--primary));
  }
  .mz.look {
    --mz-fill: color-mix(in srgb, var(--primary) 60%, var(--text-dim));
  }
  .mz-hint {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--text-dim);
  }
  svg.crta {
    outline: none;
  }
  /* Samo mreža koja se boja guta dodir; zato je niska, pa se stranica i dalje pomiče oko nje. */
  svg.aktivno {
    touch-action: none;
    cursor: pointer;
  }
  .mz-cell {
    fill: transparent;
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .mz-cell.on,
  .mz-half {
    fill: color-mix(in srgb, var(--mz-fill) 38%, transparent);
  }
  .mz-half {
    stroke: var(--mz-fill);
    stroke-width: 1;
  }
  .mz-border {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .mz-cursor {
    fill: none;
    stroke: var(--text);
    stroke-width: 2;
  }
  .mz-dim line {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .mz-readout.ok b {
    color: var(--success);
  }
  .mz-readout.bad b {
    color: var(--danger);
  }
  .mz-actions {
    justify-content: center;
    margin-top: 0;
  }
</style>
