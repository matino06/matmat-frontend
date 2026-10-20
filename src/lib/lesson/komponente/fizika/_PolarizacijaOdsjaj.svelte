<script>
  // Scena „odsjaj“: sunčeva zraka na površini (voda, staklo…), odbijena i lomljena zraka, polarizacija odsjaja
  // (Fresnel) i polarizacijske naočale. Geometrija, stanje i provjera su u katalog/fizika/polarizacija.js.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Krug from "./_PolarizacijaKrug.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import Md from "../Md.svelte";
  import { tocanOdgovor } from "$lib/lesson/katalog/index.js";
  import {
    scenaOdsjaj,
    tockeNaZrakama,
    kutOdsjaja,
    krozNaocale,
    brewster,
    smjerSprijeda,
    kutSprijeda,
    zakljucaj,
    normOs,
    opisOsi,
    kutTekst,
    izracunOdsjaja,
    OPCIJE_ODSJAJ,
    KORAK_KUTA,
    KORAK_FILTRA,
  } from "$lib/lesson/katalog/fizika/polarizacija.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const n = untrack(() => spec.n);
  const postaviKut =
    nacin === "postavi" && untrack(() => spec.cilj?.velicina) === "upadni_kut";
  const postaviNaocale = nacin === "postavi" && !postaviKut;
  const imaNaocale = untrack(() => spec.naocale != null);
  const klizac = nacin === "istrazi" || postaviKut;
  const r1 = (x) => Math.round(x * 10) / 10;

  let alfa = $state(
    untrack(() => (klizac ? r1(kutOdsjaja(spec)) : kutOdsjaja(spec))),
  );
  let naocale = $state(untrack(() => spec.naocale ?? 0));
  let izbor = $state(null);
  let unos = $state("");
  let poslano = $state(null);

  let vrijednost = $derived(postaviKut ? alfa : naocale);
  // postavi: ishod se vidi za predanu vrijednost dok je učenik ne promijeni; odaberi i izracunaj tek kad je točno
  let otkriveno = $derived(
    nacin === "istrazi" ||
      nacin === "prikaz" ||
      locked ||
      pokazi ||
      (nacin === "postavi"
        ? poslano != null && poslano === vrijednost && !!ishod && !ishod.prazno
        : !!ishod?.tocno),
  );
  let skrivenaScena = $derived(!otkriveno && !postaviNaocale);
  let scena = $derived(scenaOdsjaj(spec, alfa, skrivenaScena));
  let st = $derived(scena.stanje);
  let udio = $derived(krozNaocale(n, alfa, naocale));

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (postaviKut) alfa = r1(brewster(n));
      if (postaviNaocale) naocale = 0;
    });
  });

  // ── animacija: točke svjetlosti putuju zrakama (u sredstvu sporije) ──
  let faza = $state(0);
  onMount(() => {
    let id;
    let prije = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        const dt = Math.min(0.05, (now - (prije || now)) / 1000);
        faza = (faza + dt * 1.6) % 1000;
      }
      prije = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let tocke = $derived(tockeNaZrakama(scena, n, faza));

  // ── klizač upadnog kuta ──
  const aktivanKut = $derived(
    klizac && (nacin === "istrazi" || (!locked && !pokazi)),
  );
  function pomakni(d) {
    alfa = Math.min(89, Math.max(0, r1(alfa + d)));
  }

  // ── naočale (pogled sprijeda) ──
  const LC = [196, 62];
  const LR = 40;
  let aktivneNaocale = $derived(
    imaNaocale &&
      (nacin === "istrazi" || (postaviNaocale && !locked && !pokazi)),
  );
  let leca = $state();
  let vuce = false;
  let rucka = $derived.by(() => {
    const d = smjerSprijeda(naocale);
    return [LC[0] + d[0] * LR, LC[1] + d[1] * LR];
  });
  let crteNaocala = $derived.by(() => {
    const d = smjerSprijeda(naocale);
    const p = [-d[1], d[0]];
    const out = [];
    for (let o = -0.8; o <= 0.81; o += 0.2) {
      const h = Math.sqrt(1 - o * o) * LR * 0.96;
      const s = [LC[0] + p[0] * o * LR, LC[1] + p[1] * o * LR];
      out.push(
        [
          s[0] - d[0] * h,
          s[1] - d[1] * h,
          s[0] + d[0] * h,
          s[1] + d[1] * h,
        ].map(r1),
      );
    }
    return out;
  });
  function down(e) {
    if (!aktivneNaocale) return;
    e.preventDefault();
    vuce = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!vuce) return;
    const m = leca?.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    if (Math.hypot(q.x - LC[0], q.y - LC[1]) < 6) return;
    naocale = zakljucaj(kutSprijeda(LC, [q.x, q.y]));
  }
  const up = () => (vuce = false);
  function key(e) {
    if (!aktivneNaocale) return;
    const d = {
      ArrowLeft: KORAK_FILTRA,
      ArrowUp: KORAK_FILTRA,
      ArrowRight: -KORAK_FILTRA,
      ArrowDown: -KORAK_FILTRA,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    naocale = zakljucaj(naocale + d);
  }
  let skrivenOdsjaj = $derived(postaviNaocale && !otkriveno);

  function provjeri() {
    if (locked) return;
    poslano = vrijednost;
    onodgovor(postaviKut ? alfa : normOs(naocale));
  }
  function odaberiOpciju(k) {
    if (locked) return;
    izbor = k;
    onodgovor(k);
  }

  // ── crtanje ──
  const luk = (l) =>
    `M${l.od[0]},${l.od[1]} A${l.r},${l.r} 0 ${l.veliki ? 1 : 0} ${l.smjer} ${l.do[0]},${l.do[1]}`;
  const strelice = (k) =>
    k.nepolarizirano
      ? [0, 45, 90, 135].map((kut) => ({ kut, duljina: 1 }))
      : [
          { kut: 90, duljina: k.vodoravno },
          { kut: 0, duljina: k.uspravno },
        ];
  // vrh strelice na sredini zrake (smjer širenja)
  const vrhZrake = (z) => {
    const m = [(z.od[0] + z.do[0]) / 2, (z.od[1] + z.do[1]) / 2];
    const L = Math.hypot(z.do[0] - z.od[0], z.do[1] - z.od[1]) || 1;
    const d = [(z.do[0] - z.od[0]) / L, (z.do[1] - z.od[1]) / L];
    const p = [-d[1], d[0]];
    const t = [m[0] + d[0] * 6, m[1] + d[1] * 6];
    return [
      t,
      [m[0] - d[0] * 4 + p[0] * 5, m[1] - d[1] * 4 + p[1] * 5],
      [m[0] - d[0] * 4 - p[0] * 5, m[1] - d[1] * 4 - p[1] * 5],
    ]
      .map((q) => q.map(r1).join(","))
      .join(" ");
  };
  const ZRAKE = ["upadna", "odbijena", "lomljena"];
  let istaknuta = $derived(nacin === "odaberi" ? izbor : null);
  const povrsina = untrack(() => spec.povrsina ?? "sredstvo");
  let opis = $derived.by(() => {
    let t = `Sunčeva zraka pada na površinu (${povrsina}, n = ${formatNumber(n)}) pod upadnim kutom ${kutTekst(alfa)}.`;
    if (st) t += ` Lomni kut ${kutTekst(st.beta)}; odsjaj je ${st.stanje}.`;
    if (imaNaocale) t += ` Os naočala: ${opisOsi(naocale)}.`;
    return t;
  });
  const izr = untrack(() =>
    nacin === "izracunaj" ? izracunOdsjaja(spec) : null,
  );
  const uid = Math.random().toString(36).slice(2, 8);
</script>

<figure class="lx-figure po">
  <svg viewBox="0 0 {scena.sirina} {scena.visina}" role="img" aria-label={opis}>
    <defs>
      <radialGradient id="po-sjaj-{uid}">
        <stop offset="0" stop-color="var(--warn)" stop-opacity="0.8" />
        <stop offset="1" stop-color="var(--warn)" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect
      class="po-voda"
      x="0"
      y={scena.povrsinaY}
      width={scena.sirina}
      height={scena.visina - scena.povrsinaY}
    />
    <line
      class="po-povrsina"
      x1="0"
      y1={scena.povrsinaY}
      x2={scena.sirina}
      y2={scena.povrsinaY}
    />
    <text class="po-sredstvo" x="8" y={scena.visina - 10}
      >{povrsina} · n = {formatNumber(n)}</text
    >
    <text class="po-sredstvo" x="8" y={scena.povrsinaY - 8}>zrak</text>
    <line
      class="po-normala"
      x1={scena.normala.od[0]}
      y1={scena.normala.od[1]}
      x2={scena.normala.do[0]}
      y2={scena.normala.do[1]}
    />

    <!-- zrake -->
    {#each ZRAKE as ime (ime)}
      {@const z = scena.zrake[ime]}
      {#if istaknuta === ime}
        <line
          class="po-istaknuta"
          x1={z.od[0]}
          y1={z.od[1]}
          x2={z.do[0]}
          y2={z.do[1]}
        />
      {/if}
      <line
        class="po-zraka"
        x1={z.od[0]}
        y1={z.od[1]}
        x2={z.do[0]}
        y2={z.do[1]}
        opacity={z.jakost}
      />
      <polygon class="po-vrh" points={vrhZrake(z)} opacity={z.jakost} />
    {/each}
    {#each tocke as t, i (i)}
      <circle class="po-foton" cx={t.x} cy={t.y} r="2.2" opacity={t.jakost} />
    {/each}

    <!-- kutovi -->
    {#each scena.lukovi as l (l.oznaka)}
      <path class="po-luk" d={luk(l)} />
      <text class="po-luk-t" x={l.tekst[0]} y={l.tekst[1]} text-anchor="middle"
        >{l.oznaka}</text
      >
    {/each}
    {#if scena.gama}
      {#if scena.gama.kvadrat}
        <polygon
          class="po-pravi"
          points={scena.gama.kvadrat.map((p) => p.join(",")).join(" ")}
        />
      {:else}
        <path class="po-gama" d={luk(scena.gama)} />
      {/if}
      <text
        class="po-gama-t"
        class:po-gama-ok={scena.gama.pravi}
        x={scena.tocka[0] + 30}
        y={scena.tocka[1] + 4}>{scena.gama.oznaka}</text
      >
    {/if}

    <!-- Sunce i oko -->
    <circle
      cx={scena.sunce[0]}
      cy={scena.sunce[1]}
      r="22"
      fill="url(#po-sjaj-{uid})"
    />
    <circle class="po-sunce" cx={scena.sunce[0]} cy={scena.sunce[1]} r="10" />
    <g transform="translate({scena.oko[0]} {scena.oko[1]})">
      <path class="po-oko" d="M-11,0 Q0,-9 11,0 Q0,9 -11,0 z" />
      <circle class="po-zjenica" r="3.4" />
      {#if imaNaocale}
        <line class="po-staklo" x1="-13" y1="-11" x2="-13" y2="11" />
      {/if}
    </g>

    <!-- polarizacija gledana uzduž zraka -->
    {#each scena.krugovi as k, i (i)}
      <Krug x={k.x} y={k.y} r={k.r} strelice={strelice(k)} />
    {/each}
  </svg>
</figure>

{#if klizac}
  <div class="po-klizac">
    <label for="po-k-{uid}">upadni kut α</label>
    <div class="po-klizac-red">
      <button
        type="button"
        class="btn btn-quiet po-fino"
        onclick={() => pomakni(-KORAK_KUTA)}
        disabled={!aktivanKut}
        aria-label="Smanji kut za 0,1°">−</button
      >
      <input
        id="po-k-{uid}"
        type="range"
        min="0"
        max="89"
        step={KORAK_KUTA}
        value={alfa}
        disabled={!aktivanKut}
        aria-valuetext={kutTekst(alfa)}
        oninput={(e) => (alfa = r1(Number(e.currentTarget.value)))}
      />
      <button
        type="button"
        class="btn btn-quiet po-fino"
        onclick={() => pomakni(KORAK_KUTA)}
        disabled={!aktivanKut}
        aria-label="Povećaj kut za 0,1°">+</button
      >
      <output for="po-k-{uid}" class="po-vrijednost">{kutTekst(alfa)}</output>
    </div>
  </div>
{/if}

{#if nacin !== "izracunaj" && nacin !== "odaberi"}
  <p class="lx-readout">
    {#if !klizac}α = <b>{kutTekst(alfa)}</b>{/if}
    {#if st}
      {#if !klizac}·{/if} β = <b>{kutTekst(st.beta)}</b><br />kut odbijene i
      lomljene: <b>{kutTekst(st.gama)}</b><br />odsjaj:
      <b>{st.stanje}</b>{#if spec.prikazi_postotak}&nbsp;({formatNumber(
          Math.round(st.P * 100),
        )} % polarizacije){/if}
    {:else if postaviKut}
      <span class="po-napomena"
        >polarizaciju odsjaja vidjet ćeš nakon provjere</span
      >
    {/if}
  </p>
{/if}

{#if imaNaocale}
  <figure class="lx-figure po-nao">
    <svg
      bind:this={leca}
      viewBox="0 0 360 124"
      role="img"
      aria-label="Pogled kroz polarizacijske naočale. Os naočala: {opisOsi(
        naocale,
      )}.{skrivenOdsjaj
        ? ''
        : ` Odsjaj kroz naočale: ${Math.round(udio * 100)} %.`}"
    >
      <defs>
        <clipPath id="po-leca-{uid}">
          <circle cx={LC[0]} cy={LC[1]} r={LR} />
        </clipPath>
      </defs>
      <text class="po-nao-t" x="8" y="24">pogled kroz</text>
      <text class="po-nao-t" x="8" y="38">naočale</text>
      <text class="po-nao-os" x="8" y="62">os: {opisOsi(naocale)}</text>
      <g clip-path="url(#po-leca-{uid})">
        <rect
          class="po-nebo"
          x={LC[0] - LR}
          y={LC[1] - LR}
          width={LR * 2}
          height={LR}
        />
        <rect
          class="po-voda-l"
          x={LC[0] - LR}
          y={LC[1]}
          width={LR * 2}
          height={LR}
        />
        {#if skrivenOdsjaj}
          <text class="po-upitnik" x={LC[0]} y={LC[1] + 24} text-anchor="middle"
            >?</text
          >
        {:else}
          <ellipse
            cx={LC[0]}
            cy={LC[1] + 16}
            rx="22"
            ry="7"
            fill="url(#po-sjaj-{uid})"
            opacity={0.08 + 0.92 * udio}
          />
          <ellipse
            class="po-blijesak"
            cx={LC[0]}
            cy={LC[1] + 16}
            rx="9"
            ry="2.6"
            opacity={0.04 + 0.96 * udio}
          />
        {/if}
        {#each crteNaocala as c, i (i)}
          <line class="po-crta" x1={c[0]} y1={c[1]} x2={c[2]} y2={c[3]} />
        {/each}
      </g>
      <circle class="po-okvir" cx={LC[0]} cy={LC[1]} r={LR} />
      {#if aktivneNaocale}
        <g
          class="lx-handle po-ruc"
          role="slider"
          tabindex="0"
          aria-label="Os naočala: povuci ručku ili okreći strelicama"
          aria-valuemin="0"
          aria-valuemax="180"
          aria-valuenow={Math.round(normOs(naocale))}
          aria-valuetext={opisOsi(naocale)}
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
          onkeydown={key}
        >
          <circle class="po-hit" cx={rucka[0]} cy={rucka[1]} r="22" />
          <circle
            class="po-rucka"
            class:po-ceka={postaviNaocale && poslano == null}
            cx={rucka[0]}
            cy={rucka[1]}
            r="9"
          />
        </g>
      {/if}
      <text class="po-nao-t" x="262" y="24">odsjaj u oku</text>
      <rect class="po-traka" x="262" y="32" width="86" height="12" rx="3" />
      {#if !skrivenOdsjaj}
        <rect
          class="po-traka-ispuna"
          x="262"
          y="32"
          width={r1(86 * udio)}
          height="12"
          rx="3"
        />
        <text class="po-nao-os" x="262" y="62"
          >{udio < 0.005
            ? "nestao"
            : udio > 0.98
              ? "pun sjaj"
              : "djelomično"}</text
        >
      {:else}
        <text class="po-nao-os" x="262" y="62">nakon provjere</text>
      {/if}
    </svg>
  </figure>
{/if}

{#if nacin === "postavi"}
  <p class="po-uputa">
    {postaviKut
      ? "Namjesti upadni kut klizačem (ili gumbima − i +), pa klikni Provjeri."
      : "Povuci ručku na rubu stakla naočala (ili ga okreći strelicama), pa klikni Provjeri."}
  </p>
  <div class="lx-actions po-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
  </div>
{:else if nacin === "odaberi"}
  <div class="lx-options">
    {#each OPCIJE_ODSJAJ as o (o.kljuc)}
      {@const ok =
        (izbor === o.kljuc && ishod?.tocno) ||
        (pokazi && o.kljuc === "odbijena")}
      <button
        type="button"
        class="lx-option"
        class:ok
        class:bad={izbor === o.kljuc && ishod && !ishod.tocno}
        disabled={locked}
        onclick={() => odaberiOpciju(o.kljuc)}
      >
        <span class="lx-mark"
          >{ok ? "✓" : izbor === o.kljuc && ishod ? "✕" : ""}</span
        >
        {o.tekst}
      </button>
    {/each}
  </div>
{:else if nacin === "izracunaj"}
  <BrojUnos
    jedinica="°"
    {locked}
    {ishod}
    bind:vrijednost={unos}
    oznaka="{izr.naziv} u stupnjevima"
    onodgovor={(v) => onodgovor(v)}
  />
  {#if pokazi}
    <p class="lx-solution">
      Točan odgovor: <Md text={tocanOdgovor(spec)} inline />
    </p>
  {/if}
{/if}

<style>
  .po {
    max-width: 440px;
  }
  .po-voda {
    fill: color-mix(in srgb, var(--lx-water) 16%, transparent);
  }
  .po-povrsina {
    stroke: var(--lx-water);
    stroke-width: 2;
  }
  .po-sredstvo {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .po-normala {
    stroke: var(--text-faint);
    stroke-width: 1.2;
    stroke-dasharray: 5 4;
  }
  .po-zraka {
    stroke: var(--warn);
    stroke-width: 3.2;
    stroke-linecap: round;
  }
  .po-istaknuta {
    stroke: var(--primary);
    stroke-width: 9;
    stroke-linecap: round;
    opacity: 0.35;
  }
  .po-vrh {
    fill: var(--warn);
  }
  .po-foton {
    fill: color-mix(in srgb, var(--warn) 50%, var(--bg-elev));
  }
  .po-luk {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .po-luk-t {
    fill: var(--text);
    font: italic 600 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .po-gama {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.4;
  }
  .po-pravi {
    fill: color-mix(in srgb, var(--success) 25%, transparent);
    stroke: var(--success);
    stroke-width: 1.4;
  }
  .po-gama-t {
    fill: var(--primary);
    font: 700 11.5px var(--font-mono);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .po-gama-t.po-gama-ok {
    fill: var(--success);
  }
  .po-sunce {
    fill: var(--warn);
    stroke: color-mix(in srgb, var(--warn) 60%, var(--text));
  }
  .po-oko {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.4;
  }
  .po-zjenica {
    fill: var(--text);
  }
  .po-staklo {
    stroke: var(--text-dim);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .po-klizac {
    max-width: 440px;
    margin: 0 auto 6px;
    font-size: 14px;
  }
  .po-klizac label {
    color: var(--text-dim);
  }
  .po-klizac-red {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .po-klizac input[type="range"] {
    flex: 1;
    min-width: 0;
    height: 30px;
    accent-color: var(--primary);
  }
  .po-fino {
    min-width: 40px;
    min-height: 36px;
    font-family: var(--font-mono);
    font-size: 16px;
  }
  .po-vrijednost {
    min-width: 52px;
    text-align: right;
    font: 600 14px var(--font-mono);
  }
  .po-napomena {
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text-faint);
  }
  .po-nao {
    max-width: 440px;
    margin-top: 0;
  }
  .po-nao-t {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .po-nao-os {
    fill: var(--text);
    font: 600 11px var(--font-sans);
  }
  .po-nebo {
    fill: color-mix(in srgb, var(--lx-water) 8%, var(--bg-elev));
  }
  .po-voda-l {
    fill: color-mix(in srgb, var(--lx-water) 35%, var(--bg-elev));
  }
  .po-blijesak {
    fill: #fff;
  }
  .po-crta {
    stroke: var(--text);
    stroke-width: 0.9;
    opacity: 0.28;
  }
  .po-okvir {
    fill: none;
    stroke: var(--text);
    stroke-width: 3;
  }
  .po-upitnik {
    fill: var(--text-faint);
    font: 700 16px var(--font-sans);
  }
  .po-ruc {
    outline: none;
  }
  .po-hit {
    fill: transparent;
  }
  .po-rucka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .po-ruc:focus-visible .po-rucka {
    stroke: var(--text);
    stroke-width: 3;
  }
  .po-rucka.po-ceka {
    animation: po-puls 1.4s ease-in-out infinite;
  }
  @keyframes po-puls {
    50% {
      r: 12px;
    }
  }
  .po-traka {
    fill: var(--bg-elev-2);
    stroke: var(--border-strong);
  }
  .po-traka-ispuna {
    fill: var(--warn);
  }
  .po-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 4px;
  }
  .po-akcije {
    justify-content: center;
  }
</style>
