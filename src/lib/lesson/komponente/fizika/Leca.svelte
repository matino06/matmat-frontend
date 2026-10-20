<script>
  // Optička klupa s tankom lećom. Sve što se crta (zrake, slika, zamućenje na zastoru) i što je skriveno dok učenik
  // ne odgovori dolazi iz katalog/fizika/leca.js (scenaLece, ocitanjaLece, zastorSlika); ovdje je samo crtanje i unos.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import {
    scenaLece,
    ocitanjaLece,
    opisLece,
    pogledLece,
    uPx,
    izPx,
    pocetniA,
    fLece,
    naMrezuA,
    naMrezuF,
    korakA,
    mijenja,
    listaA,
    rasponZastora,
    pocetakZastora,
    zastorSlika,
    najvecaSlikaZastora,
    privuciZraku,
    tocneRuke,
    zrakeSpeca,
    nagibRuke,
    parametriZrake,
    visinaPredmeta,
    aZaCilj,
    rjesenjeIzracuna,
    tablicaMjerenja,
    imaOstruSliku,
    slikaLece,
    zonaPredmeta,
    skrivenoPostavi,
    broj,
    NAZIV_ZRAKE,
    OPIS_ZONE,
    OZNAKA,
    JEDINICA,
    SVOJSTVA,
  } from "$lib/lesson/katalog/fizika/leca.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const pg = untrack(() => pogledLece(spec));
  const uid = Math.random().toString(36).slice(2, 8);
  const r1 = (n) => Math.round(n * 10) / 10;
  const X = (x) => r1(pg.ox + x * pg.sx);
  const Y = (y) => r1(pg.oy - y * pg.sy);
  const POLA = 86;

  // ── stanje ──
  let a = $state(untrack(() => pocetniA(spec)));
  let f = $state(untrack(() => fLece(spec)));
  const mijenjaA = untrack(() => mijenja(spec).includes("a"));
  const mijenjaF = untrack(() => mijenja(spec).includes("f"));
  // zastor
  const A = untrack(() => (nacin === "zastor" ? listaA(spec) : []));
  const visestruko = A.length > 1;
  const [zLo, zHi] = untrack(() =>
    nacin === "zastor" ? rasponZastora(spec) : [0, 0],
  );
  let red = $state(0);
  let x = $state(
    untrack(() => (nacin === "zastor" ? pocetakZastora(spec) : 0)),
  );
  let zapisi = $state(untrack(() => A.map(() => null)));
  let poslaniZapisi = $state(null);
  // nacrtaj
  const imena = untrack(() => zrakeSpeca(spec));
  let ruke = $state(untrack(() => imena.map(() => null)));
  let privucene = $state(untrack(() => imena.map(() => false)));
  let poslaneRuke = $state(null);
  // izracunaj
  const pitaj = untrack(() => spec.pitaj ?? []);
  let unosi = $state(
    untrack(() =>
      pitaj.map((q) =>
        q.velicina === "vrsta"
          ? { realna: null, uspravna: null, uvecana: null }
          : "",
      ),
    ),
  );
  // postavi: položaj koji je učenik zadnji provjerio
  let poslano = $state(null);

  // otkriveno: učenik je točno odgovorio, „pokaži“, ili (postavi) provjerio baš ovaj položaj
  let otkriveno = $derived.by(() => {
    if (pokazi || locked) return true;
    if (nacin === "postavi")
      return poslano != null && poslano === a && !!ishod && !ishod.prazno;
    return !!ishod?.tocno;
  });

  let sc = $derived(
    scenaLece(spec, {
      a,
      f,
      x,
      red,
      ruke: $state.snapshot(ruke),
      otkriveno,
    }),
  );
  let ocitanja = $derived(
    nacin === "istrazi" || nacin === "prikaz" || nacin === "postavi"
      ? ocitanjaLece(spec, { a, f, otkriveno })
      : [],
  );
  let opis = $derived(opisLece(spec, sc));

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "postavi") a = naMrezuA(spec, aZaCilj(spec));
      if (nacin === "zastor") {
        zapisi = A.map((ai) =>
          imaOstruSliku(spec.f, ai)
            ? Math.round(slikaLece(spec.f, ai).b * 10) / 10
            : "nema",
        );
        if (typeof zapisi[red] === "number") x = zapisi[red];
      }
      if (nacin === "nacrtaj") ruke = tocneRuke(spec, pg);
      if (nacin === "izracunaj") unosi = rjesenjeIzracuna(spec);
    });
  });

  // ── povlačenje ──
  let svgEl = $state();
  let vuce = $state(null); // {vrsta: "predmet" | "f" | "zastor" | "ruka", i?}
  const smijeVuci = (vrsta) => {
    if (nacin === "prikaz") return false;
    if (vrsta === "predmet")
      return (
        (nacin === "istrazi" && mijenjaA) ||
        (nacin === "postavi" && !locked && !pokazi)
      );
    if (vrsta === "f") return nacin === "istrazi" && mijenjaF;
    if (vrsta === "zastor") return nacin === "zastor" && !locked && !pokazi;
    if (vrsta === "ruka")
      return nacin === "nacrtaj" && !locked && !pokazi && !otkriveno;
    return false;
  };
  function tockaPokazivaca(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return izPx(pg, [q.x, q.y]);
  }
  function down(e, vrsta, i = 0) {
    if (!smijeVuci(vrsta)) return;
    e.preventDefault();
    vuce = { vrsta, i };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (vrsta === "ruka") pomakni(e);
  }
  function pomakni(e) {
    if (!vuce) return;
    const t = tockaPokazivaca(e);
    if (!t) return;
    if (vuce.vrsta === "predmet") a = naMrezuA(spec, Math.max(0, -t[0]));
    else if (vuce.vrsta === "f") f = naMrezuF(spec, t[0]);
    else if (vuce.vrsta === "zastor")
      x = Math.min(zHi, Math.max(zLo, Math.round(t[0] * 10) / 10));
    else if (vuce.vrsta === "ruka") {
      const lim = pg.yMax * 1.1;
      const p = privuciZraku(
        spec,
        imena[vuce.i],
        [t[0], Math.max(-lim, Math.min(lim, t[1]))],
        pg,
      );
      ruke[vuce.i] = p.tocka;
      privucene[vuce.i] = p.privuceno;
    }
  }
  const pusti = () => (vuce = null);

  function tipka(e, vrsta, i = 0) {
    if (!smijeVuci(vrsta)) return;
    const k = e.key;
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[k];
    if (!d) return;
    e.preventDefault();
    if (vrsta === "predmet") {
      // strelica lijevo = predmet dalje od leće
      const s = k === "ArrowLeft" || k === "ArrowDown" ? 1 : -1;
      a = naMrezuA(spec, a + s * korakA(spec));
    } else if (vrsta === "f") f = naMrezuF(spec, f + d * 0.5);
    else if (vrsta === "zastor") fino(d * (e.shiftKey ? 1 : 0.1));
    else if (vrsta === "ruka") {
      const z = parametriZrake(imena[i], spec.f, spec.a, visinaPredmeta(spec));
      const t = ruke[i] ?? [pg.xR * 0.32, z.h];
      const dx = t[0] * pg.sx;
      const dy = (t[1] - z.h) * pg.sy;
      const L = Math.hypot(dx, dy);
      const kut = Math.atan2(dy, dx) + (d * Math.PI) / 180;
      const nk = Math.max(-1.45, Math.min(1.45, kut));
      ruke[i] = [(L * Math.cos(nk)) / pg.sx, z.h + (L * Math.sin(nk)) / pg.sy];
      privucene[i] = false;
    }
  }

  // ── zastor ──
  function fino(d) {
    if (!smijeVuci("zastor")) return;
    x = Math.min(zHi, Math.max(zLo, Math.round((x + d) * 10) / 10));
  }
  function sljedeciRed() {
    const i = zapisi.findIndex((z, j) => j > red && z == null);
    const j = i >= 0 ? i : zapisi.findIndex((z) => z == null);
    if (j >= 0) red = j;
  }
  function zabiljezi(v) {
    if (locked || pokazi) return;
    if (!visestruko) {
      poslaniZapisi = JSON.stringify([v]);
      zapisi = [v];
      onodgovor([v]);
      return;
    }
    zapisi[red] = v;
    sljedeciRed();
  }
  function provjeriZastor() {
    if (locked) return;
    poslaniZapisi = JSON.stringify(zapisi);
    onodgovor($state.snapshot(zapisi));
  }
  let zastorStanje = $derived(
    nacin === "zastor" ? zastorSlika(spec, A[red], x) : null,
  );
  const insetS = untrack(() =>
    nacin === "zastor" ? 38 / najvecaSlikaZastora(spec) : 1,
  );
  let poljaZastora = $derived(
    nacin === "zastor" &&
      ishod?.polja &&
      poslaniZapisi === JSON.stringify(zapisi)
      ? ishod.polja
      : null,
  );

  // ── nacrtaj ──
  let poljaZraka = $derived(
    nacin === "nacrtaj" && ishod?.polja && poslaneRuke === JSON.stringify(ruke)
      ? ishod.polja
      : null,
  );
  function provjeriZrake() {
    if (locked) return;
    poslaneRuke = JSON.stringify(ruke);
    onodgovor($state.snapshot(ruke));
  }
  let postavljeno = $derived(ruke.filter(Boolean).length);

  // ── postavi ──
  function provjeriPostavi() {
    if (locked) return;
    poslano = a;
    onodgovor(a);
  }

  // ── izracunaj ──
  const predznak = (q) => ["b", "y_slike", "m"].includes(q.velicina);
  function promijeniPredznak(i) {
    const v = String(unosi[i] ?? "").trim();
    unosi[i] = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : `−${v}`;
  }
  function provjeriIzracun() {
    if (locked) return;
    onodgovor($state.snapshot(unosi));
  }
  let imaUnosa = $derived(
    unosi.some((u) =>
      typeof u === "string"
        ? u.trim().length > 0
        : u && Object.values(u).some((v) => v != null),
    ),
  );
  const tablica = untrack(() => tablicaMjerenja(spec));

  // ── crtanje ──
  const KLASA_SEG = {
    upadna: "lc-pun",
    izlazna: "lc-pun",
    ucenik: "lc-pun",
    produzetak: "lc-crtkano",
    pomocna: "lc-tocke",
  };
  const put = (g) => {
    const [x0, y0] = uPx(pg, g.od);
    const [x1, y1] = uPx(pg, g.do);
    // srednja točka za strelicu smjera
    return `M${r1(x0)},${r1(y0)} L${r1((x0 + x1) / 2)},${r1((y0 + y1) / 2)} L${r1(x1)},${r1(y1)}`;
  };
  const duljina = (g) =>
    Math.hypot((g.do[0] - g.od[0]) * pg.sx, (g.do[1] - g.od[1]) * pg.sy);
  const visinaPx = (y) => y * pg.sy;
  let zone = $derived(sc.zone ?? []);
  let zona = $derived(nacin === "istrazi" ? zonaPredmeta(f, a) : null);
  const trakaY = pg.oy + POLA + 12;
  const ravnaloY = pg.oy + POLA + 16;
  let lecaPola = $derived(r1(sc.leca.pola * pg.sy));
  let vidiLegendu = $derived(sc.zrake.length > 0 || nacin === "nacrtaj");
  let natpis = $derived(sc.natpis);
  // u nacrtaj: oznaka na kraju svake zrake nakon provjere
  const statusRuke = (i) =>
    poljaZraka ? (poljaZraka[i] ? "ok" : "bad") : null;
  const kutRuke = (i) => {
    const t = ruke[i];
    if (!t) return null;
    const z = parametriZrake(imena[i], spec.f, spec.a, visinaPredmeta(spec));
    const s = nagibRuke(z.h, t);
    return s == null
      ? null
      : Math.round((Math.atan((pg.sy / pg.sx) * s) * 180) / Math.PI);
  };
  const uputaRuke = (i) => {
    const kut = kutRuke(i);
    if (kut == null) return "nije okrenuta";
    return kut === 0
      ? "vodoravno udesno"
      : `${Math.abs(kut)}° ${kut > 0 ? "prema gore" : "prema dolje"}`;
  };
</script>

{#if nacin === "istrazi" || nacin === "prikaz"}
  <div class="lc-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

{#snippet strelica(xp, hPx, klasa, isprekidano)}
  {@const g = Math.min(9, Math.abs(hPx) * 0.45)}
  {@const sg = Math.sign(hPx) || 1}
  <g class={klasa}>
    <line
      x1={xp}
      y1={pg.oy}
      x2={xp}
      y2={r1(pg.oy - hPx + sg * g * 0.8)}
      stroke-dasharray={isprekidano ? "5 4" : null}
    />
    <path
      d="M{xp},{r1(pg.oy - hPx)} L{r1(xp - g * 0.62)},{r1(
        pg.oy - hPx + sg * g,
      )} L{r1(xp + g * 0.62)},{r1(pg.oy - hPx + sg * g)} Z"
      opacity={isprekidano ? 0.75 : 1}
    />
  </g>
{/snippet}

{#snippet svijeca(xp, yp, hPx, sirina, plamen)}
  <!-- jedinična svijeća (visina 1, širina 1) skalirana: vrh plamena je na visini hPx -->
  <g transform="translate({xp} {yp}) scale({sirina} {-hPx})">
    <rect
      class="lc-sv-tijelo"
      x="-0.5"
      y="0"
      width="1"
      height="0.6"
      vector-effect="non-scaling-stroke"
    />
    <line
      class="lc-sv-fitilj"
      x1="0"
      y1="0.6"
      x2="0"
      y2="0.67"
      vector-effect="non-scaling-stroke"
    />
    {#if plamen}
      <g class="lc-sv-plamen">
        <path
          class="lc-sv-plamen-v"
          d="M0,1 C0.62,0.82 0.66,0.68 0,0.63 C-0.66,0.68 -0.62,0.82 0,1 Z"
        />
        <path
          class="lc-sv-plamen-u"
          d="M0,0.86 C0.3,0.76 0.32,0.69 0,0.66 C-0.32,0.69 -0.3,0.76 0,0.86 Z"
        />
      </g>
    {/if}
  </g>
{/snippet}

<figure class="lx-figure lc" class:lc-siroko={nacin === "zastor"}>
  <svg
    bind:this={svgEl}
    viewBox="0 0 {pg.sirina} {pg.visina}"
    role="img"
    aria-label={opis}
    onpointermove={pomakni}
    onpointerup={pusti}
    onpointercancel={pusti}
  >
    <defs>
      <clipPath id="lc-clip-{uid}">
        <rect
          x="0"
          y={r1(pg.oy - pg.yMax * 1.14 * pg.sy)}
          width={pg.sirina}
          height={r1(2 * pg.yMax * 1.14 * pg.sy)}
        />
      </clipPath>
      {#each ["paralelna", "centar", "zariste", "stozac"] as ime (ime)}
        <marker
          id="lc-m-{ime}-{uid}"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M1,1 L9,5 L1,9 z" class="lc-mk lc-c-{ime}" />
        </marker>
      {/each}
    </defs>

    <!-- zone predmeta (istraživanje sabirne leće) -->
    {#each zone as z (z.kljuc)}
      {@const w = (z.do - z.od) * pg.sx}
      <rect
        class="lc-zona"
        class:lc-zona-akt={z.aktivna}
        x={X(z.od) + 1}
        y={trakaY}
        width={r1(Math.max(0, w - 2))}
        height="24"
        rx="6"
      />
      <text
        class="lc-zona-t"
        class:lc-zona-t-akt={z.aktivna}
        x={r1(X(z.od) + w / 2)}
        y={trakaY + 16}
        text-anchor="middle"
        >{w > 78
          ? z.oznaka
          : { iza_2f: "> 2F", izmedju: "F – 2F", unutar: "< F" }[z.kljuc]}</text
      >
    {/each}

    <!-- ravnalo klupe -->
    {#if sc.ravnalo}
      <line
        class="lc-ravnalo"
        x1={X(pg.xL)}
        y1={ravnaloY}
        x2={X(pg.xR)}
        y2={ravnaloY}
      />
      {#each sc.ravnalo as t (t.x)}
        <line
          class="lc-ravnalo"
          x1={X(t.x)}
          y1={ravnaloY}
          x2={X(t.x)}
          y2={ravnaloY + (t.oznaka != null ? 6 : 3.5)}
        />
        {#if t.oznaka != null}
          <text
            class="lc-ravnalo-t"
            x={X(t.x)}
            y={ravnaloY + 16}
            text-anchor="middle">{t.oznaka}</text
          >
        {/if}
      {/each}
    {/if}

    <!-- optička os -->
    <line class="lc-os" x1="4" y1={pg.oy} x2={pg.sirina - 4} y2={pg.oy} />

    <!-- leća -->
    <g class="lc-leca">
      {#if sc.leca.vrsta === "sabirna"}
        <path
          class="lc-leca-tijelo"
          d="M0,{pg.oy - lecaPola} Q9,{pg.oy} 0,{pg.oy +
            lecaPola} Q-9,{pg.oy} 0,{pg.oy - lecaPola} Z"
          transform="translate({X(0)} 0)"
        />
        <line x1={X(0)} y1={pg.oy - lecaPola} x2={X(0)} y2={pg.oy + lecaPola} />
        <path
          d="M{X(0) - 5},{pg.oy - lecaPola + 6} L{X(0)},{pg.oy - lecaPola} L{X(
            0,
          ) + 5},{pg.oy - lecaPola + 6}"
        />
        <path
          d="M{X(0) - 5},{pg.oy + lecaPola - 6} L{X(0)},{pg.oy + lecaPola} L{X(
            0,
          ) + 5},{pg.oy + lecaPola - 6}"
        />
      {:else}
        <path
          class="lc-leca-tijelo"
          d="M-7,{pg.oy - lecaPola} Q-1,{pg.oy} -7,{pg.oy +
            lecaPola} L7,{pg.oy + lecaPola} Q1,{pg.oy} 7,{pg.oy - lecaPola} Z"
          transform="translate({X(0)} 0)"
        />
        <line x1={X(0)} y1={pg.oy - lecaPola} x2={X(0)} y2={pg.oy + lecaPola} />
        <path
          d="M{X(0) - 5},{pg.oy - lecaPola} L{X(0)},{pg.oy - lecaPola + 6} L{X(
            0,
          ) + 5},{pg.oy - lecaPola}"
        />
        <path
          d="M{X(0) - 5},{pg.oy + lecaPola} L{X(0)},{pg.oy + lecaPola - 6} L{X(
            0,
          ) + 5},{pg.oy + lecaPola}"
        />
      {/if}
    </g>

    <!-- žarišta -->
    {#each sc.tocke as t (t.oznaka)}
      <circle
        class="lc-tocka"
        cx={X(t.x)}
        cy={pg.oy}
        r={t.oznaka.startsWith("2") ? 2.4 : 3.4}
      />
      <text
        class="lc-tocka-t"
        class:lc-tocka-2={t.oznaka.startsWith("2")}
        x={X(t.x)}
        y={pg.oy + 15}
        text-anchor="middle">{t.oznaka}</text
      >
    {/each}

    <g clip-path="url(#lc-clip-{uid})">
      <!-- svjetlosni stožac u pokusu -->
      {#each sc.stozac as g, i (i)}
        <path
          class="lc-zraka lc-c-stozac lc-pun lc-pojava"
          d={put(g)}
          marker-mid={duljina(g) > 40 ? `url(#lc-m-stozac-${uid})` : null}
        />
      {/each}

      <!-- zrake -->
      {#each sc.zrake as z, zi (z.ime)}
        {#each z.segmenti as g, i (i)}
          <path
            class="lc-zraka lc-c-{z.ime} {KLASA_SEG[g.vrsta]}"
            class:lc-ucenik={g.vrsta === "ucenik"}
            class:lc-zraka-bad={g.vrsta === "ucenik" &&
              statusRuke(zi) === "bad"}
            d={put(g)}
            marker-mid={(g.vrsta === "upadna" ||
              g.vrsta === "izlazna" ||
              g.vrsta === "ucenik") &&
            duljina(g) > 46
              ? `url(#lc-m-${z.ime}-${uid})`
              : null}
          />
          {#if g.vrsta === "upadna" || g.vrsta === "izlazna"}
            <path class="lc-tok lc-c-{z.ime}" d={put(g)} />
          {/if}
        {/each}
      {/each}

      <!-- slika -->
      {#if sc.slika && !sc.slika.izvan}
        {#key otkriveno}
          <g class="lc-pojava">
            {#if sc.slika.oblik === "svijeca"}
              <g class="lc-slika-sv" class:lc-virt={sc.slika.virtualna}>
                {@render svijeca(
                  X(sc.slika.x),
                  pg.oy,
                  visinaPx(sc.slika.y),
                  Math.max(
                    4,
                    Math.min(
                      30,
                      12 * Math.abs(sc.slika.y / visinaPredmeta(spec)),
                    ),
                  ),
                  true,
                )}
              </g>
            {:else}
              {@render strelica(
                X(sc.slika.x),
                visinaPx(sc.slika.y),
                sc.slika.virtualna ? "lc-slika lc-virt" : "lc-slika",
                sc.slika.virtualna,
              )}
            {/if}
            <text
              class="lc-ozn lc-ozn-slika"
              x={X(sc.slika.x) + 9}
              y={r1(pg.oy - visinaPx(sc.slika.y) * 0.8 + 4)}>y′</text
            >
          </g>
        {/key}
      {/if}
    </g>

    {#if sc.slika?.izvan === "gore" || sc.slika?.izvan === "dolje"}
      {@render strelica(
        X(sc.slika.x),
        visinaPx(Math.sign(sc.slika.y) * pg.yMax * 1.12),
        sc.slika.virtualna ? "lc-slika lc-virt" : "lc-slika",
        sc.slika.virtualna,
      )}
      <text
        class="lc-ozn lc-ozn-slika"
        x={X(sc.slika.x) + 7}
        y={sc.slika.izvan === "gore" ? pg.oy - POLA + 8 : pg.oy + POLA - 2}
        >{sc.slika.tekst}</text
      >
    {/if}
    {#if sc.slika?.rub}
      {@const [rx, ry] = uPx(pg, sc.slika.rub)}
      {@const desno = sc.slika.izvan === "desno"}
      <path
        class="lc-rub"
        d="M{r1(rx + (desno ? -2 : 2))},{r1(ry)} l{desno ? -9 : 9},-6 l0,12 z"
      />
      <text
        class="lc-ozn lc-ozn-slika"
        x={r1(rx + (desno ? -14 : 14))}
        y={r1(ry + 4)}
        text-anchor={desno ? "end" : "start"}>{sc.slika.tekst}</text
      >
    {/if}

    <!-- predmet -->
    {#if sc.predmet}
      {@const xp = X(-sc.a)}
      {@const hp = visinaPx(sc.predmet.y)}
      <g
        class="lc-predmet-g"
        style:transform={nacin === "zastor" ? `translateX(${xp}px)` : null}
      >
        {#if sc.predmet.oblik === "svijeca"}
          {@render svijeca(nacin === "zastor" ? 0 : xp, pg.oy, hp, 12, true)}
        {:else}
          {@render strelica(xp, hp, "lc-predmet", false)}
        {/if}
        {#if sc.predmet.oblik !== "svijeca" && !sc.oznake.some((o) => o.uz === "predmet")}
          <text
            class="lc-ozn"
            x={xp - 8}
            y={r1(pg.oy - hp / 2 + 4)}
            text-anchor="end">y</text
          >
        {/if}
      </g>
      {#if smijeVuci("predmet")}
        <g
          class="lx-handle lc-ruc"
          role="slider"
          tabindex="0"
          aria-label="Predmet: povuci lijevo ili desno (ili strelice na tipkovnici)"
          aria-valuenow={a}
          aria-valuetext="a = {broj(a)} cm"
          onpointerdown={(e) => down(e, "predmet")}
          onkeydown={(e) => tipka(e, "predmet")}
        >
          <rect
            class="lc-hit"
            x={xp - 20}
            y={r1(pg.oy - Math.max(hp, 30) - 10)}
            width="40"
            height={r1(Math.max(hp, 30) + 26)}
          />
          <circle
            class="lc-rucka"
            class:lc-ceka={vuce == null &&
              nacin === "postavi" &&
              poslano == null}
            cx={xp}
            cy={pg.oy}
            r="7"
          />
        </g>
      {/if}
    {/if}

    <!-- F′ za povlačenje (istraživanje) -->
    {#if smijeVuci("f")}
      <g
        class="lx-handle lc-ruc"
        role="slider"
        tabindex="0"
        aria-label="Žarište F′: povuci lijevo ili desno"
        aria-valuenow={f}
        aria-valuetext="f = {broj(f, 1)} cm"
        onpointerdown={(e) => down(e, "f")}
        onkeydown={(e) => tipka(e, "f")}
      >
        <circle class="lc-hit" cx={X(f)} cy={pg.oy} r="20" />
        <circle class="lc-rucka lc-rucka-f" cx={X(f)} cy={pg.oy} r="7" />
      </g>
    {/if}

    <!-- zastor -->
    {#if sc.zastor}
      {@const zx = X(sc.zastor.x)}
      {@const zp = r1(sc.zastor.pola * pg.sy)}
      <rect
        class="lc-zastor"
        x={zx - 1}
        y={pg.oy - zp}
        width="6"
        height={2 * zp}
        rx="1.5"
      />
      <text
        class="lc-ozn lc-ozn-mala"
        x={zx + 2}
        y={pg.oy - zp - 5}
        text-anchor="middle">zastor</text
      >
      {#if smijeVuci("zastor")}
        <g
          class="lx-handle lc-ruc"
          role="slider"
          tabindex="0"
          aria-label="Zastor: povuci lijevo ili desno (strelice: 0,1 cm, uz Shift 1 cm)"
          aria-valuenow={x}
          aria-valuetext="zastor {broj(x, 1)} cm iza leće"
          onpointerdown={(e) => down(e, "zastor")}
          onkeydown={(e) => tipka(e, "zastor")}
        >
          <rect
            class="lc-hit"
            x={zx - 20}
            y={pg.oy - zp - 8}
            width="44"
            height={2 * zp + 16}
          />
          <circle
            class="lc-rucka"
            class:lc-ceka={vuce == null && zapisi.every((z) => z == null)}
            cx={zx + 2}
            cy={r1(pg.oy + zp + 1)}
            r="7"
          />
        </g>
      {/if}
    {/if}

    <!-- kote i oznake -->
    {#each sc.mjere as m, i (i)}
      {@const x0 = X(m.od)}
      {@const x1 = X(m.do)}
      {@const ym = Y(m.y)}
      <g class="lc-kota">
        <line x1={x0} y1={ym} x2={x1} y2={ym} />
        <line x1={x0} y1={ym - 4} x2={x0} y2={ym + 4} />
        <line {x1} y1={ym - 4} x2={x1} y2={ym + 4} />
        <text x={r1((x0 + x1) / 2)} y={ym - 4} text-anchor="middle"
          >{m.tekst}</text
        >
      </g>
    {/each}
    {#each sc.oznake as o, i (i)}
      {#if o.uz === "F′"}
        <text
          class="lc-ozn lc-ozn-mala"
          x={X(o.x)}
          y={pg.oy + 28}
          text-anchor="middle">{o.tekst}</text
        >
      {:else}
        <text
          class="lc-ozn lc-ozn-mala"
          x={X(o.x) - 8}
          y={r1(pg.oy - visinaPx(o.y) - 6)}
          text-anchor="middle">{o.tekst}</text
        >
      {/if}
    {/each}

    <!-- nacrtaj: ručke na krajevima izlaznih zraka -->
    {#if sc.ruke}
      {#each sc.ruke as r, i (r.ime)}
        {@const [hx, hy] = uPx(pg, r.tocka)}
        {@const st = statusRuke(i)}
        <g
          class="lx-handle lc-ruc"
          role="slider"
          tabindex={smijeVuci("ruka") ? 0 : -1}
          aria-label="Zraka {NAZIV_ZRAKE[
            r.ime
          ]}: povuci kružić da okreneš zraku nakon leće (ili strelice gore i dolje)"
          aria-valuenow={kutRuke(i) ?? 0}
          aria-valuetext={uputaRuke(i)}
          onpointerdown={(e) => down(e, "ruka", i)}
          onkeydown={(e) => tipka(e, "ruka", i)}
        >
          <circle class="lc-hit" cx={r1(hx)} cy={r1(hy)} r="22" />
          <circle
            class="lc-rucka lc-rucka-z lc-c-{r.ime}"
            class:lc-ceka={!r.postavljena}
            class:lc-privuceno={privucene[i] && vuce?.i === i}
            class:lc-r-ok={st === "ok"}
            class:lc-r-bad={st === "bad"}
            cx={r1(hx)}
            cy={r1(hy)}
            r="9"
          />
          {#if st}
            <text
              class="lc-r-znak"
              class:lc-r-ok-t={st === "ok"}
              x={r1(hx)}
              y={r1(hy + 4)}
              text-anchor="middle">{st === "ok" ? "✓" : "✗"}</text
            >
          {/if}
        </g>
      {/each}
    {/if}
  </svg>
  {#if natpis}
    <figcaption class="lc-natpis">{natpis}</figcaption>
  {:else if zona && sc.zone}
    <figcaption class="lc-natpis lc-natpis-tih">{OPIS_ZONE[zona]}</figcaption>
  {/if}
</figure>

{#if vidiLegendu}
  <ul class="lc-legenda" aria-label="Zrake">
    {#each nacin === "nacrtaj" ? imena : sc.zrake.map((z) => z.ime) as ime (ime)}
      <li><span class="lc-leg-crta lc-cb-{ime}"></span>{NAZIV_ZRAKE[ime]}</li>
    {/each}
  </ul>
{/if}

{#if ocitanja.length}
  <div class="lc-ocitanja" aria-live="polite">
    {#each ocitanja as o (o.kljuc)}
      <div class="lc-oc" class:lc-oc-siroko={o.siroko}>
        {#if o.oznaka}<span class="lc-oc-ozn">{o.oznaka}</span>{/if}
        <span class="lc-oc-val">{o.skriveno ? "?" : o.tekst}</span>
      </div>
    {/each}
  </div>
{/if}

<!-- ── kontrole po načinu ── -->
{#if nacin === "zastor"}
  <div class="lc-pokus">
    <div class="lc-inset">
      <div class="lc-inset-nas">Na zastoru</div>
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label="Pogled na zastor: slika plamena"
      >
        <defs>
          <filter
            id="lc-blur-{uid}"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur
              stdDeviation={r1(
                Math.min(12, zastorStanje.mutnoca * insetS * 0.9),
              )}
            />
          </filter>
          <clipPath id="lc-inset-clip-{uid}"
            ><rect x="0" y="0" width="120" height="120" rx="8" /></clipPath
          >
        </defs>
        <rect class="lc-papir" x="0" y="0" width="120" height="120" rx="8" />
        <g clip-path="url(#lc-inset-clip-{uid})">
          <g
            filter="url(#lc-blur-{uid})"
            opacity={r1((0.4 + 0.6 * zastorStanje.svjetlina) * 10) / 10}
          >
            {@render svijeca(
              60,
              60,
              zastorStanje.povecanje * visinaPredmeta(spec) * insetS,
              Math.max(
                3,
                Math.abs(zastorStanje.povecanje) *
                  visinaPredmeta(spec) *
                  insetS *
                  0.32,
              ),
              true,
            )}
          </g>
        </g>
        <line class="lc-papir-os" x1="8" y1="60" x2="112" y2="60" />
      </svg>
    </div>
    <div class="lc-mjerenja">
      <div class="lc-chip-red">
        <span class="lc-chip">a = <b>{broj(A[red], 1)} cm</b></span>
        <span class="lc-chip">zastor: <b>{broj(x, 1)} cm</b></span>
      </div>
      <div class="lc-fino" role="group" aria-label="Fino pomicanje zastora">
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => fino(-0.1)}
          disabled={locked || pokazi}
          aria-label="Zastor 0,1 cm bliže leći">‹ 0,1</button
        >
        <span class="lc-fino-t">fino</span>
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => fino(0.1)}
          disabled={locked || pokazi}
          aria-label="Zastor 0,1 cm dalje od leće">0,1 ›</button
        >
      </div>
      {#if visestruko}
        <table class="lc-tablica">
          <thead><tr><th>a / cm</th><th>b / cm</th></tr></thead>
          <tbody>
            {#each A as ai, i (i)}
              <tr
                class:lc-red-akt={i === red && !locked}
                class:lc-red-ok={poljaZastora?.[i] === true ||
                  (locked && zapisi[i] != null)}
                class:lc-red-bad={poljaZastora?.[i] === false}
                onclick={() => !locked && !pokazi && (red = i)}
              >
                <td>
                  <button
                    type="button"
                    class="lc-red-gumb"
                    disabled={locked || pokazi}
                    onclick={() => (red = i)}
                    aria-label="Mjerenje za a = {broj(ai, 1)} cm"
                    >{broj(ai, 1)}</button
                  >
                </td>
                <td
                  >{zapisi[i] == null
                    ? "–"
                    : zapisi[i] === "nema"
                      ? "nema oštre slike"
                      : broj(zapisi[i], 1)}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
  <div class="lx-actions lc-akcije">
    {#if visestruko}
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() => zabiljezi(x)}
        disabled={locked || pokazi}>Zabilježi b = {broj(x, 1)} cm</button
      >
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() => zabiljezi("nema")}
        disabled={locked || pokazi}>Nema oštre slike</button
      >
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriZastor}
        disabled={locked || zapisi.some((z) => z == null)}>Provjeri</button
      >
    {:else}
      <button
        type="button"
        class="btn btn-primary"
        onclick={() => zabiljezi(x)}
        disabled={locked}>Provjeri: oštro je ovdje</button
      >
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() => zabiljezi("nema")}
        disabled={locked}>Nema oštre slike</button
      >
    {/if}
  </div>
{:else if nacin === "nacrtaj"}
  <p class="lc-uputa">
    {#if otkriveno}
      {natpis ? "" : "Zrake se sijeku u vrhu slike."}
    {:else}
      Povuci kružić na kraju svake zrake: okreni je kamo je leća lomi ({postavljeno}/{imena.length}).
    {/if}
  </p>
  <div class="lx-actions lc-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriZrake}
      disabled={locked || postavljeno === 0}>Provjeri</button
    >
  </div>
{:else if nacin === "postavi"}
  <p class="lc-uputa">
    Povuci predmet lijevo ili desno.{skrivenoPostavi(spec) && !otkriveno
      ? " Slika se pokaže kad provjeriš."
      : ""}
  </p>
  <div class="lx-actions lc-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriPostavi}
      disabled={locked}>Provjeri</button
    >
  </div>
{:else if nacin === "izracunaj"}
  {#if tablica}
    <table class="lc-tablica lc-tablica-sama">
      <thead><tr><th>a / cm</th><th>b / cm</th></tr></thead>
      <tbody>
        {#each tablica as r, i (i)}
          <tr><td>{r.a}</td><td>{r.b}</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <form
    class="lc-unos"
    onsubmit={(ev) => {
      ev.preventDefault();
      provjeriIzracun();
    }}
  >
    {#each pitaj as q, i (i)}
      {#if q.velicina === "vrsta"}
        <div class="lc-red lc-red-vrsta">
          <span class="lc-lab"
            ><Md text={q.oznaka ?? OZNAKA.vrsta} inline /></span
          >
          <div
            class="lc-svojstva"
            class:lc-sv-ok={pokazi || ishod?.polja?.[i] === true}
            class:lc-sv-bad={ishod &&
              !ishod.prazno &&
              ishod.polja?.[i] === false}
          >
            {#each SVOJSTVA as p (p.kljuc)}
              <div
                class="lc-prekidac"
                role="radiogroup"
                aria-label="{p.da} ili {p.ne}"
              >
                {#each [true, false] as v (v)}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={unosi[i][p.kljuc] === v}
                    class:lc-odabrano={unosi[i][p.kljuc] === v}
                    disabled={locked}
                    onclick={() => (unosi[i] = { ...unosi[i], [p.kljuc]: v })}
                    >{v ? p.da : p.ne}</button
                  >
                {/each}
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="lc-red">
          <label class="lc-lab" for="lc-{uid}-p{i}"
            ><Md text={q.oznaka ?? OZNAKA[q.velicina]} inline /></label
          >
          <span class="lc-polje">
            <input
              id="lc-{uid}-p{i}"
              class="inp lx-broj-inp"
              class:ok={pokazi || ishod?.polja?.[i] === true}
              class:bad={ishod && !ishod.prazno && ishod.polja?.[i] === false}
              inputmode="decimal"
              autocomplete="off"
              placeholder="?"
              disabled={locked}
              bind:value={unosi[i]}
            />
            {#if JEDINICA[q.velicina]}<span class="lx-unit"
                >{JEDINICA[q.velicina]}</span
              >{/if}
            {#if predznak(q) && !locked}
              <button
                type="button"
                class="btn btn-quiet lc-pm"
                onclick={() => promijeniPredznak(i)}
                aria-label="Promijeni predznak">±</button
              >
            {/if}
          </span>
        </div>
      {/if}
    {/each}
    <div class="lx-actions">
      <button
        class="btn btn-primary"
        type="submit"
        disabled={locked || !imaUnosa}>Provjeri</button
      >
    </div>
  </form>
{/if}

<style>
  .lc-tekst {
    margin-bottom: 10px;
  }
  .lc {
    max-width: 460px;
  }
  .lc.lc-siroko {
    max-width: 520px;
  }
  .lc svg {
    overflow: visible;
  }
  .lc-os {
    stroke: var(--text-faint);
    stroke-width: 1;
    stroke-dasharray: 10 3 2 3;
  }
  .lc-leca line,
  .lc-leca path:not(.lc-leca-tijelo) {
    stroke: var(--lx-water);
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .lc-leca-tijelo {
    fill: color-mix(in srgb, var(--lx-water) 22%, transparent);
    stroke: color-mix(in srgb, var(--lx-water) 55%, transparent);
    stroke-width: 1;
  }
  .lc-tocka {
    fill: var(--text);
  }
  .lc-tocka-t {
    fill: var(--text);
    font: 600 11.5px var(--font-sans);
  }
  .lc-tocka-t.lc-tocka-2 {
    fill: var(--text-dim);
    font-weight: 500;
  }
  .lc-zona {
    fill: var(--bg-elev-2);
    stroke: var(--border);
  }
  .lc-zona.lc-zona-akt {
    fill: color-mix(in srgb, var(--primary) 16%, var(--bg-elev));
    stroke: var(--primary-border);
  }
  .lc-zona-t {
    fill: var(--text-faint);
    font: 500 10.5px var(--font-sans);
  }
  .lc-zona-t.lc-zona-t-akt {
    fill: var(--text);
    font-weight: 600;
  }
  .lc-ravnalo {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .lc-ravnalo-t {
    fill: var(--text-faint);
    font: 500 9.5px var(--font-mono);
  }

  /* zrake */
  .lc-zraka {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .lc-crtkano {
    stroke-dasharray: 5 4;
    stroke-width: 1.5;
    opacity: 0.8;
  }
  .lc-tocke {
    stroke-dasharray: 1.5 4;
    stroke-width: 1.5;
    opacity: 0.7;
  }
  .lc-zraka.lc-zraka-bad {
    stroke-dasharray: 7 4;
  }
  .lc-c-paralelna {
    stroke: var(--warn);
    color: var(--warn);
  }
  .lc-c-centar {
    stroke: var(--lx-water);
    color: var(--lx-water);
  }
  .lc-c-zariste {
    stroke: color-mix(in srgb, var(--primary) 55%, var(--danger));
    color: color-mix(in srgb, var(--primary) 55%, var(--danger));
  }
  .lc-c-stozac {
    stroke: color-mix(in srgb, var(--warn) 75%, transparent);
    color: var(--warn);
    stroke-width: 1.4;
  }
  .lc-mk {
    fill: currentColor;
    stroke: none;
  }
  /* svjetlost teče po zrakama */
  .lc-tok {
    fill: none;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-dasharray: 1 22;
    stroke: color-mix(in srgb, currentColor 35%, #fff);
    opacity: 0.95;
    animation: lc-tok 1.1s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .lc-tok {
      display: none;
    }
  }
  @keyframes lc-tok {
    to {
      stroke-dashoffset: -23;
    }
  }
  .lc-pojava {
    animation: lc-pojava 0.5s ease-out both;
  }
  @keyframes lc-pojava {
    from {
      opacity: 0;
    }
  }

  /* predmet, slika */
  .lc-predmet line,
  .lc-slika line {
    stroke-width: 3;
    stroke-linecap: round;
  }
  .lc-predmet line {
    stroke: var(--text);
  }
  .lc-predmet path {
    fill: var(--text);
  }
  .lc-slika line {
    stroke: var(--primary);
  }
  .lc-slika path {
    fill: var(--primary);
  }
  .lc-slika.lc-virt line {
    stroke-width: 2.4;
    stroke-linecap: butt;
  }
  .lc-slika-sv.lc-virt {
    opacity: 0.55;
  }
  .lc-rub {
    fill: var(--primary);
  }
  .lc-predmet-g {
    transition: transform 0.45s ease;
  }
  .lc-sv-tijelo {
    fill: color-mix(in srgb, var(--text-dim) 22%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .lc-sv-fitilj {
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .lc-sv-plamen-v {
    fill: var(--warn);
  }
  .lc-sv-plamen-u {
    fill: color-mix(in srgb, var(--warn) 30%, #fff);
  }
  .lc-sv-plamen {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: lc-plamen 1.6s ease-in-out infinite;
  }
  @keyframes lc-plamen {
    30% {
      transform: scale(1.06, 0.95);
    }
    60% {
      transform: scale(0.95, 1.05);
    }
  }
  .lc-ozn {
    fill: var(--text-dim);
    font: italic 600 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .lc-ozn-slika {
    fill: var(--primary);
  }
  .lc-ozn-mala {
    font: 500 10.5px var(--font-sans);
  }
  .lc-kota line {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .lc-kota text {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }

  /* zastor */
  .lc-zastor {
    fill: color-mix(in srgb, var(--text) 8%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }

  /* ručke */
  .lc-ruc {
    outline: none;
  }
  .lc-hit {
    fill: transparent;
  }
  .lc-rucka {
    fill: color-mix(in srgb, var(--primary) 22%, var(--bg-elev));
    stroke: var(--primary);
    stroke-width: 1.8;
  }
  .lc-rucka-z {
    fill: color-mix(in srgb, currentColor 22%, var(--bg-elev));
    stroke: currentColor;
    stroke-width: 2.2;
  }
  .lc-rucka.lc-privuceno {
    stroke-width: 3.5;
  }
  .lc-rucka.lc-r-ok {
    stroke: var(--success);
  }
  .lc-rucka.lc-r-bad {
    stroke: var(--danger);
  }
  .lc-r-znak {
    fill: var(--danger);
    font: 700 11px var(--font-sans);
    pointer-events: none;
  }
  .lc-r-znak.lc-r-ok-t {
    fill: var(--success);
  }
  .lc-ruc:focus-visible .lc-rucka {
    stroke-width: 3.5;
  }
  .lc-rucka.lc-ceka {
    animation: lc-puls 1.4s ease-in-out infinite;
  }
  @keyframes lc-puls {
    50% {
      r: 12px;
    }
  }

  .lc-natpis {
    font-size: 12.5px;
    color: var(--text-dim);
    text-align: center;
    margin-top: 4px;
    line-height: 1.4;
  }
  .lc-natpis-tih {
    color: var(--text-faint);
  }
  .lc-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 14px;
    list-style: none;
    margin: -4px 0 10px;
    padding: 0;
    font-size: 12px;
    color: var(--text-dim);
  }
  .lc-legenda li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .lc-leg-crta {
    width: 16px;
    height: 3px;
    border-radius: 2px;
  }
  .lc-cb-paralelna {
    background: var(--warn);
  }
  .lc-cb-centar {
    background: var(--lx-water);
  }
  .lc-cb-zariste {
    background: color-mix(in srgb, var(--primary) 55%, var(--danger));
  }

  .lc-ocitanja {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 auto 10px;
    max-width: 520px;
  }
  .lc-oc {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .lc-oc-siroko {
    flex-basis: 100%;
    justify-content: center;
    border-style: dashed;
  }
  .lc-oc-ozn {
    font-style: italic;
    font-weight: 600;
    color: var(--text-dim);
    font-size: 14px;
  }
  .lc-oc-val {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
    white-space: nowrap;
  }
  .lc-oc-siroko .lc-oc-val {
    font-family: var(--font-sans);
  }

  /* pokus */
  .lc-pokus {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 4px;
  }
  .lc-inset {
    width: 128px;
    flex-shrink: 0;
  }
  .lc-inset-nas {
    font-size: 11.5px;
    color: var(--text-faint);
    text-align: center;
    margin-bottom: 3px;
  }
  .lc-inset svg {
    width: 128px;
    height: 128px;
    display: block;
  }
  .lc-papir {
    fill: color-mix(in srgb, var(--text) 6%, var(--bg-elev));
    stroke: var(--border-strong);
  }
  .lc-papir-os {
    stroke: var(--text-faint);
    stroke-width: 0.6;
    stroke-dasharray: 3 3;
    opacity: 0.5;
  }
  .lc-mjerenja {
    display: grid;
    gap: 8px;
    justify-items: center;
    min-width: 180px;
  }
  .lc-chip-red {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .lc-chip {
    font-size: 13.5px;
    color: var(--text-dim);
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--bg-elev);
    white-space: nowrap;
  }
  .lc-chip b {
    font-family: var(--font-mono);
    color: var(--text);
  }
  .lc-fino {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lc-fino .btn {
    min-width: 58px;
    height: 36px;
    font-family: var(--font-mono);
  }
  .lc-fino-t {
    font-size: 11.5px;
    color: var(--text-faint);
  }
  .lc-tablica {
    border-collapse: collapse;
    font-size: 13.5px;
    font-variant-numeric: tabular-nums;
  }
  .lc-tablica th,
  .lc-tablica td {
    border: 1px solid var(--border);
    padding: 4px 12px;
    text-align: center;
  }
  .lc-tablica th {
    background: var(--bg-elev-2);
    font-weight: 600;
    font-size: 12.5px;
  }
  .lc-tablica tr.lc-red-akt td {
    background: var(--primary-dim);
  }
  .lc-tablica tr.lc-red-ok td {
    background: color-mix(in srgb, var(--success) 12%, transparent);
  }
  .lc-tablica tr.lc-red-bad td {
    background: color-mix(in srgb, var(--danger) 12%, transparent);
  }
  .lc-red-gumb {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 2px 6px;
    cursor: pointer;
    min-width: 44px;
  }
  .lc-red-gumb:disabled {
    cursor: default;
  }
  .lc-tablica-sama {
    margin: 0 auto 12px;
  }
  .lc-akcije {
    justify-content: center;
  }
  .lc-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 4px;
  }

  /* izračun */
  .lc-unos {
    display: grid;
    gap: 10px;
  }
  .lc-red {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .lc-lab {
    min-width: 52px;
    font-size: 15px;
  }
  .lc-polje {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .lc-pm {
    width: 40px;
    height: var(--lx-control);
    padding: 0;
    font-size: 17px;
  }
  .lc-red-vrsta {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .lc-svojstva {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px;
    border-radius: var(--r-lg);
    border: 1px solid transparent;
  }
  .lc-svojstva.lc-sv-ok {
    border-color: var(--lx-ok);
  }
  .lc-svojstva.lc-sv-bad {
    border-color: var(--lx-bad);
  }
  .lc-prekidac {
    display: inline-flex;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    overflow: hidden;
  }
  .lc-prekidac button {
    font: 500 13.5px var(--font-sans);
    padding: 7px 12px;
    min-height: 36px;
    background: var(--bg-elev);
    color: var(--text-dim);
    border: 0;
    cursor: pointer;
  }
  .lc-prekidac button + button {
    border-left: 1px solid var(--border-strong);
  }
  .lc-prekidac button.lc-odabrano {
    background: var(--primary-dim);
    color: var(--text);
    font-weight: 600;
  }
  .lc-prekidac button:disabled {
    cursor: default;
  }
</style>
