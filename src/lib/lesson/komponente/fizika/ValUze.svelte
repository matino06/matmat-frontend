<script>
  // Val na užetu: putujući val (kuglice titraju gore-dolje, val putuje), puls koji se odbija i stojni val.
  // Sva fizika, položaji kuglica, ravnalo, čvorovi, očitanja i što je skriveno dolaze iz katalog/fizika/val_uze.js;
  // ovdje se samo crta (metri → pikseli), vrti vrijeme i prosljeđuje unos.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import Ocitanja from "./_SileOcitanja.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    klizaciOd,
    pocetneVrijednosti,
    iznosJed,
  } from "$lib/lesson/katalog/fizika/_sile.js";
  import {
    val_uze,
    parametri,
    uze,
    ovojnicaStojnog,
    ravnalo,
    zagradeLambda,
    grafYT,
    brojKuglica,
    mjeriloVisine,
    ubrzanje,
    trajanje,
    korakVremena,
    decimaleVremena,
    ocitanja,
    prikazi,
    opisScene,
    opisKuglice,
    pocetneOznake,
    korakOznake,
    cvorovi,
    trbusi,
    rjesenje,
    izboriPredvidi,
    IZBORI_PREDVIDI,
    odbijeniOblik,
    polozajPulsa,
    fazaNajvecegOtklona,
    skrivenaSlika,
    oznakaPitanja,
    jedinicaPitanja,
    KRAJEVI,
    FREKVENCIJA_PRIKAZA_STOJNOG,
  } from "$lib/lesson/katalog/fizika/val_uze.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const scena = untrack(() => spec.scena);
  const istrazi = nacin === "istrazi";
  const uid = Math.random().toString(36).slice(2, 8);

  // ── geometrija crteža ──
  const X0 = 46;
  const X1 = 326;
  const Y0 = 64;
  const AMP = 34;
  const r1 = (n) => Math.round(n * 10) / 10;

  // ── stanje ──
  let p = $state(untrack(() => pocetneVrijednosti(spec)));
  let krajIstrazi = $state(untrack(() => spec.kraj ?? "ucvrscen"));
  let sp = $derived(
    scena === "puls" && istrazi ? { ...spec, kraj: krajIstrazi } : spec,
  );
  let P = $derived(parametri(sp, p));
  const nKug = untrack(() => brojKuglica(spec));
  // kuglice se ne smiju preklapati: polumjer najviše 40 % razmaka
  const rKug = Math.min(3.3, (0.4 * 280) / (nKug - 1));
  const Aref = untrack(() => mjeriloVisine(spec));
  const ubrz = untrack(() => ubrzanje(spec));
  const tMax = untrack(() => trajanje(spec));
  const korakT = untrack(() => (scena === "stojni" ? 0 : korakVremena(spec)));
  const decT = untrack(() => (scena === "stojni" ? 0 : decimaleVremena(spec)));
  const pr = untrack(() => prikazi(spec));
  const L0 = untrack(() => parametri(spec).L);
  const X = (x) => X0 + (x / L0) * (X1 - X0);
  const Y = (y) => Y0 - (y / Aref) * AMP;
  const mirujuciT = nacin === "oznaci" && scena === "putujuci";

  let t = $state(0);
  let igra = $state(false);
  let faza = $state(0);
  let tPred = $state(0);
  let vratio = $state(false);

  // ── postavi: dok učenik ne provjeri, izvor miruje (inače bi crtež odao odgovor) ──
  const postavi = nacin === "postavi";
  const klizac = untrack(() => klizaciOd(spec)[0]);
  let poslano = $state(null);
  let dodiri = $state([]);
  let otkriveno = $derived(
    !postavi ||
      spec.uzivo === true ||
      pokazi ||
      !!ishod?.tocno ||
      (poslano != null && klizac && poslano === p[klizac.id] && !!ishod),
  );
  const skrivena = untrack(() => skrivenaSlika(spec));
  let mirno = $derived(
    (postavi && !otkriveno) || (skrivena && !pokazi && !ishod?.tocno),
  );

  // ── animacija ──
  const autoplay =
    (scena === "putujuci" && (istrazi || nacin === "izracunaj")) ||
    (scena === "puls" && nacin === "izracunaj") ||
    (postavi && scena === "putujuci");
  onMount(() => {
    if (autoplay && !prefersReducedMotion.current) igra = true;
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      const dt = zadnji ? Math.min(0.05, (now - zadnji) / 1000) : 0;
      zadnji = now;
      korak(dt);
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  function korak(dt) {
    if (scena === "stojni") {
      if (!prefersReducedMotion.current)
        faza =
          (faza + dt * 2 * Math.PI * FREKVENCIJA_PRIKAZA_STOJNOG) %
          (2 * Math.PI);
      return;
    }
    if (nacin === "predvidi") {
      if (prefersReducedMotion.current) return;
      const kraj = otkrivenoPred
        ? P.t_povratak * 1.3
        : P.t_kraj * 0.72 + P.t_kraj * 0.25;
      tPred += dt * ubrz;
      if (tPred > kraj) tPred = 0;
      return;
    }
    if (!igra) return;
    t += dt * ubrz;
    if (scena === "puls" && istrazi && P.kraj !== "bez_odbijanja") {
      if (t >= P.t_povratak) {
        t = P.t_povratak;
        igra = false;
        vratio = true;
      }
      return;
    }
    if (nacin === "izracunaj" || (postavi && scena === "putujuci")) {
      if (scena === "puls" && t > tMax) t = 0;
      return;
    }
    if (tMax && t >= tMax) {
      t = tMax;
      igra = false;
    }
  }
  function pokreni() {
    if (tMax && t >= tMax - 1e-9) t = 0;
    if (scena === "puls" && istrazi && t >= P.t_povratak - 1e-9) t = 0;
    vratio = false;
    igra = true;
  }
  function ispocetka() {
    t = 0;
    vratio = false;
    igra = istrazi && scena === "putujuci" && !prefersReducedMotion.current;
  }
  function pomakniT(d) {
    igra = false;
    t = Math.max(0, Math.min(tMax, Math.round((t + d) / korakT) * korakT));
  }
  // promjena klizača u istraživanju putujućeg vala: val kreće ispočetka iz izvora
  let pZadnji = untrack(() => JSON.stringify(p));
  $effect(() => {
    const k = JSON.stringify(p);
    untrack(() => {
      if (k === pZadnji) return;
      pZadnji = k;
      if (scena === "puls" && istrazi) {
        t = 0;
        vratio = false;
      }
    });
  });
  function promijeniKraj(k) {
    krajIstrazi = k;
    t = 0;
    vratio = false;
    igra = !prefersReducedMotion.current;
  }

  // stojni bez animacije: slika u trenutku najvećeg otklona
  let fazaPrikaza = $derived(
    scena === "stojni" && prefersReducedMotion.current
      ? fazaNajvecegOtklona(P)
      : faza,
  );

  // ── stanje užeta ──
  let tPrikaza = $derived(mirujuciT ? 0 : t);
  let stanje = $derived(
    uze(sp, P, scena === "stojni" ? fazaPrikaza : tPrikaza, nKug, { mirno }),
  );
  const tocke = (pts) =>
    pts.map(([x, y]) => `${r1(X(x))},${r1(Y(y))}`).join(" ");
  let linija1 = $derived(
    tocke(
      P.od != null
        ? stanje.tocke.filter(([x]) => x <= P.od + 1e-9)
        : stanje.tocke,
    ),
  );
  let linija2 = $derived(
    P.od != null
      ? tocke(stanje.tocke.filter(([x]) => x >= P.od - L0 / 240))
      : "",
  );
  let ovojnica = $derived.by(() => {
    if (scena !== "stojni" || !pr.includes("tragovi") || mirno) return "";
    const o = ovojnicaStojnog(P);
    const gore = o.map(([x, a]) => `${r1(X(x))},${r1(Y(a))}`);
    const dolje = o
      .slice()
      .reverse()
      .map(([x, a]) => `${r1(X(x))},${r1(Y(-a))}`);
    return `M${gore.join(" L")} L${dolje.join(" L")} Z`;
  });
  let zagrade = $derived(
    scena === "putujuci" && pr.includes("lambda")
      ? zagradeLambda(sp, P, t)
      : [],
  );
  const lin = untrack(() => ravnalo(L0));
  const imaRavnalo = pr.includes("ravnalo");
  const H = imaRavnalo ? 150 : 124;
  const YR = 128; // ravnalo

  // ── stojni: čvorovi i trbusi ──
  let harmonik = $derived(scena === "stojni" && !mirno ? P.n : null);
  let pokaziCvorove = $derived(
    scena === "stojni" &&
      harmonik != null &&
      ((istrazi && pr.includes("cvorovi")) ||
        ((nacin === "oznaci" || postavi) && (pokazi || ishod?.tocno))),
  );
  let natpisStojni = $derived.by(() => {
    if (scena !== "stojni") return "";
    if (mirno) return "";
    if (
      nacin === "izracunaj" ||
      (nacin === "oznaci" && !pokazi && !ishod?.tocno)
    )
      return "";
    if (postavi && !(pokazi || ishod?.tocno))
      return harmonik != null
        ? `${harmonik} ${harmonik === 1 ? "trbuh" : "trbuha"}`
        : "nit samo drhti: nema stojnog vala";
    if (harmonik != null)
      return `${harmonik}. harmonik · ${harmonik} ${harmonik === 1 ? "trbuh" : "trbuha"} · λ = ${iznosJed(P.lambda, "m")}`;
    return "nit samo drhti: nema stojnog vala";
  });

  // ── očitanja ──
  let stavke = $derived(ocitanja(sp, P));
  let opis = $derived(opisScene(sp, P));

  // ── zaustavi ──
  let poslanT = $state(null);
  $effect(() => {
    if (!pokazi || nacin !== "zaustavi") return;
    untrack(() => {
      igra = false;
      t = rjesenje(spec);
    });
  });
  function provjeriZaustavi() {
    if (locked) return;
    igra = false;
    const v = Number(t.toFixed(decT));
    poslanT = v;
    onodgovor(v);
  }
  let rijesenoZ = $derived(
    nacin === "zaustavi" && (pokazi || (ishod?.tocno && poslanT != null)),
  );

  // ── oznaci: valna duljina ──
  let oznake = $state(
    untrack(() =>
      nacin === "oznaci" && scena === "putujuci" ? pocetneOznake(spec) : [],
    ),
  );
  const korOzn = untrack(() =>
    nacin === "oznaci" && scena === "putujuci" ? korakOznake(spec) : 0.01,
  );
  let aktivno = $derived(!locked && !pokazi);
  let svgEl = $state();
  function uMetre(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return ((q.x - X0) / (X1 - X0)) * L0;
  }
  const uze2 = untrack(() => spec.uze === 2);
  const granice = [0, L0];
  let vuce = $state(null);
  function oznDown(i, e) {
    if (!aktivno) return;
    e.preventDefault();
    vuce = i;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function oznMove(e) {
    if (vuce == null) return;
    const x = uMetre(e);
    if (x == null) return;
    const s = Math.round(x / korOzn) * korOzn;
    oznake[vuce] = Math.max(
      granice[0],
      Math.min(granice[1], Number(s.toFixed(6))),
    );
  }
  const oznUp = () => (vuce = null);
  function oznKey(i, e) {
    if (!aktivno) return;
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    const s = e.shiftKey ? 10 : 1;
    oznake[i] = Math.max(
      granice[0],
      Math.min(granice[1], Number((oznake[i] + d * s * korOzn).toFixed(6))),
    );
  }
  let poslaneOzn = $state(null);
  function provjeriOznake() {
    if (locked) return;
    const o = [...oznake].sort((a, b) => a - b);
    poslaneOzn = JSON.stringify(o);
    onodgovor(o);
  }
  $effect(() => {
    if (!pokazi || nacin !== "oznaci") return;
    untrack(() => {
      if (scena === "putujuci") oznake = rjesenje(spec);
      else dodiri = rjesenje(spec);
    });
  });
  let dx = $derived(oznake.length === 2 ? Math.abs(oznake[1] - oznake[0]) : 0);
  let ozStatus = $derived(
    pokazi ||
      (ishod?.tocno &&
        poslaneOzn === JSON.stringify([...oznake].sort((a, b) => a - b)))
      ? "ok"
      : ishod &&
          !ishod.tocno &&
          !ishod.prazno &&
          poslaneOzn === JSON.stringify([...oznake].sort((a, b) => a - b))
        ? "bad"
        : null,
  );

  // ── oznaci: čvorovi / trbusi (dodiri po niti) ──
  let kursor = $state(untrack(() => parametri(spec).L / 2));
  let kursorVidljiv = $state(false);
  const korDodira = untrack(() => parametri(spec).L / 96);
  function dodir(e) {
    if (!aktivno) return;
    const x = uMetre(e);
    if (x == null) return;
    prebaci(Math.max(0, Math.min(L0, x)));
  }
  function prebaci(x) {
    const blizu = dodiri.findIndex((d) => Math.abs(X(d) - X(x)) < 13);
    if (blizu >= 0) dodiri = dodiri.filter((_, i) => i !== blizu);
    else dodiri = [...dodiri, Number(x.toFixed(4))].sort((a, b) => a - b);
  }
  function dodirKey(e) {
    if (!aktivno) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      kursorVidljiv = true;
      kursor = Math.max(
        0,
        Math.min(
          L0,
          kursor +
            (e.key === "ArrowLeft" ? -1 : 1) * korDodira * (e.shiftKey ? 4 : 1),
        ),
      );
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      kursorVidljiv = true;
      prebaci(kursor);
    }
  }
  let poslaniDodiri = $state(null);
  function provjeriDodire() {
    if (locked) return;
    poslaniDodiri = JSON.stringify(dodiri);
    onodgovor([...dodiri]);
  }
  let dodiriStatus = $derived(
    pokazi || (ishod?.tocno && poslaniDodiri === JSON.stringify(dodiri))
      ? "ok"
      : ishod &&
          !ishod.tocno &&
          !ishod.prazno &&
          poslaniDodiri === JSON.stringify(dodiri)
        ? "bad"
        : null,
  );

  // ── predvidi ──
  const pitanja = untrack(() => spec.pitanja ?? []);
  const izbori = untrack(() => izboriPredvidi(spec));
  let odabir = $state(untrack(() => (spec.pitanja ?? []).map(() => null)));
  let poslanOdabir = $state(null);
  // zaključana kopija pitanja (nakon krivog odgovora) ne smije otkriti odgovor
  let otkrivenoPred = $derived(
    nacin === "predvidi" && (pokazi || !!ishod?.tocno),
  );
  $effect(() => {
    if (!pokazi || nacin !== "predvidi") return;
    untrack(() => (odabir = rjesenje(spec)));
  });
  $effect(() => {
    void otkrivenoPred;
    untrack(() => (tPred = 0));
  });
  let tRedaka = $derived.by(() => {
    if (nacin !== "predvidi") return 0;
    if (prefersReducedMotion.current)
      return otkrivenoPred ? P.t_povratak - 0.25 * P.t_kraj : 0.6 * P.t_kraj;
    return otkrivenoPred
      ? Math.min(tPred, P.t_povratak)
      : Math.min(tPred, 0.72 * P.t_kraj);
  });
  function provjeriPredvidi() {
    if (locked) return;
    poslanOdabir = JSON.stringify(odabir);
    onodgovor([...odabir]);
  }
  const IME_KRAJA = {
    ucvrscen: "Učvršćen kraj (zid)",
    slobodan: "Slobodan kraj (prsten na šipki)",
    bez_odbijanja: "Uže bez kraja (puls ne odbija)",
  };
  const KRAJ_KRATKO = {
    ucvrscen: "zid",
    slobodan: "prsten",
    bez_odbijanja: "bez kraja",
  };

  // ── postavi ──
  $effect(() => {
    if (!pokazi || !postavi) return;
    untrack(() => (p = rjesenje(spec)));
  });
  function provjeriPostavi() {
    if (locked) return;
    poslano = p[klizac.id];
    onodgovor({ ...p });
  }

  // ── izracunaj ──
  const pitaj = untrack(() => spec.pitaj ?? []);
  let unosi = $state(untrack(() => (spec.pitaj ?? []).map(() => "")));
  $effect(() => {
    if (!pokazi || nacin !== "izracunaj") return;
    untrack(() => (unosi = rjesenje(spec)));
  });
  function provjeriIzracun(e) {
    e?.preventDefault();
    if (locked) return;
    onodgovor([...unosi]);
  }

  // ── y–t graf crvene kuglice ──
  const imaYT = untrack(
    () =>
      scena === "putujuci" &&
      pr.includes("y-t") &&
      (spec.istaknute ?? []).length > 0,
  );
  const GW = 360;
  const GH = 92;
  const GX0 = 46;
  const GX1 = 340;
  const GY0 = 46;
  const GA = 30;
  let graf = $derived.by(() => {
    if (!imaYT) return null;
    const okno = tMax || 1;
    const g = grafYT(sp, P, t, okno);
    const tx = (q) => GX0 + (q / okno) * (GX1 - GX0);
    const ty = (y) => GY0 - (y / Aref) * GA;
    return {
      put: g.tocke.map(([a, b]) => `${r1(tx(a))},${r1(ty(b))}`).join(" "),
      oznake: g.oznake.map((o) => ({ x: tx(o.t), tekst: o.tekst })),
      zadnja: g.tocke.length
        ? [tx(g.tocke.at(-1)[0]), ty(g.tocke.at(-1)[1])]
        : null,
      A: GA * (P.A / Aref),
    };
  });

  // ── kontrole vremena ──
  const imaSat =
    (scena === "putujuci" && (istrazi || nacin === "zaustavi")) ||
    (scena === "puls" && (istrazi || nacin === "zaustavi"));
  const imaPlay = imaSat || (nacin === "izracunaj" && scena !== "stojni");
  const fmtT = (x) => formatNumber(Number(x.toFixed(decT)));
  let sazetak = $derived.by(() => {
    if (igra) return "";
    if (nacin === "zaustavi" && scena === "putujuci")
      return `t = ${fmtT(t)} s; crvena kuglica je ${opisKuglice(sp, P, t)}.`;
    if (imaSat) return `t = ${fmtT(t)} s.`;
    return "";
  });

  // puls: strelica smjera iznad pulsa
  let puls = $derived(
    scena === "puls" && nacin !== "predvidi" ? polozajPulsa(P, t) : null,
  );
  const usporeno = untrack(() =>
    scena === "stojni"
      ? nacin === "izracunaj" || postavi
        ? "usporeno"
        : `usporeno: nit zapravo titra ${formatNumber(parametri(spec).f)} puta u sekundi`
      : ubrz < 1
        ? `usporeno ${formatNumber(Number((1 / ubrz).toFixed(1)))}×`
        : "",
  );
  const tocanTekst = untrack(() => val_uze.tocanOdgovor(spec));
  const visinaNapomena =
    scena !== "stojni" ? "visina otklona nije u mjerilu" : "";
</script>

{#snippet hatch(x)}
  <rect class="vu-zid" {x} y={Y0 - 44} width="12" height="88" rx="2" />
  {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
    <line
      class="vu-sraf"
      x1={x + 12}
      y1={Y0 - 40 + i * 11}
      x2={x + 2}
      y2={Y0 - 32 + i * 11}
    />
  {/each}
{/snippet}

{#snippet uzeSvg(st, Q, kraj, red)}
  <!-- ravnotežni položaj -->
  <line class="vu-ravnoteza" x1={X0} y1={Y0} x2={X1} y2={Y0} />
  {#if scena === "stojni" && ovojnica}
    <path class="vu-ovojnica" d={ovojnica} />
  {/if}

  <!-- izvor -->
  {#if scena === "puls"}
    <g transform="translate({X0 - 14} {r1(Y(st.izvor))})">
      <rect class="vu-ruka" x="-13" y="-11" width="22" height="22" rx="7" />
      <rect class="vu-rukav" x="-34" y="-8" width="22" height="16" rx="3" />
    </g>
  {:else}
    <rect
      class="vu-stalak"
      x={X0 - 34}
      y={Y0 + 18}
      width="26"
      height="10"
      rx="2"
    />
    <rect
      class="vu-vibrator"
      x={X0 - 30}
      y={Y0 - 16}
      width="18"
      height="34"
      rx="3"
    />
    <line
      class="vu-sipka"
      x1={X0 - 12}
      y1={r1(Y(st.izvor))}
      x2={X0}
      y2={r1(Y(st.izvor))}
    />
  {/if}

  <!-- kraj -->
  {#if scena === "stojni" || kraj === "ucvrscen"}
    {@render hatch(X1)}
  {:else if kraj === "slobodan"}
    <line
      class="vu-sipka-kraj"
      x1={X1 + 6}
      y1={Y0 - 50}
      x2={X1 + 6}
      y2={Y0 + 50}
    />
    <ellipse class="vu-prsten" cx={X1 + 6} cy={r1(Y(st.kraj))} rx="6" ry="4" />
  {:else}
    <polyline
      class="vu-nastavak"
      points="{X1},{r1(Y(st.kraj))} {X1 + 22},{r1(Y(st.kraj))}"
    />
  {/if}

  <!-- uže -->
  <polyline class="vu-uze" points={red === 0 ? linija1 : tocke(st.tocke)} />
  {#if red === 0 && linija2}
    <polyline class="vu-uze vu-uze2" points={linija2} />
  {/if}
  {#each st.kuglice as [x, y], i (i)}
    <circle
      class="vu-kug"
      class:vu-kug2={Q.od != null && x > Q.od + 1e-9}
      cx={r1(X(x))}
      cy={r1(Y(y))}
      r={rKug}
    />
  {/each}
  {#if red === 0 && Q.od != null}
    <line
      class="vu-cvor-spoj"
      x1={r1(X(Q.od))}
      y1={Y0 - 46}
      x2={r1(X(Q.od))}
      y2={Y0 + 46}
    />
    <text class="vu-mala" x={r1(X(Q.od) - 4)} y={Y0 - 49} text-anchor="end"
      >1. uže</text
    >
    <text class="vu-mala" x={r1(X(Q.od) + 4)} y={Y0 - 49}>2. uže</text>
  {/if}
  {#each st.istaknute as [x, y], i (i)}
    <circle class="vu-ist-sjena" cx={r1(X(x))} cy={r1(Y(y))} r="9" />
    <circle class="vu-ist" cx={r1(X(x))} cy={r1(Y(y))} r="5.6" />
  {/each}
{/snippet}

{#if istrazi}
  <div class="vu-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

{#if nacin === "predvidi"}
  <!-- dva (ili jedno) užeta, za svaki kraj izbor vraćenog pulsa; nakon krivog odgovora ne označavamo pojedino
       uže (suzilo bi izbor), samo poruka da nije točno -->
  {#each pitanja as q, i (i)}
    {@const st = uze(sp, P, tRedaka, nKug, { kraj: q.kraj })}
    {@const pol = polozajPulsa(P, tRedaka)}
    {@const status =
      pokazi || (ishod?.tocno && poslanOdabir === JSON.stringify(odabir))
        ? "ok"
        : null}
    <div class="vu-red">
      <div class="vu-red-ime">{IME_KRAJA[q.kraj]}</div>
      <figure class="lx-figure vu-fig">
        <svg
          viewBox="0 0 360 {H - 26}"
          role="img"
          aria-label="{IME_KRAJA[q.kraj]}: puls {P.oblik === 'dolina'
            ? 'dolina'
            : 'brijeg'} putuje prema kraju.{otkrivenoPred
            ? ` Vrati se kao ${IZBORI_PREDVIDI[odbijeniOblik(P.oblik, q.kraj)]}.`
            : ''}"
        >
          {@render uzeSvg(st, P, q.kraj, 1)}
          {#if !otkrivenoPred}
            <text
              class="vu-upitnik"
              x={X1 - 34}
              y={Y0 - 14}
              text-anchor="middle">?</text
            >
          {/if}
          {#if otkrivenoPred || !pol.odbijen}
            <path
              class="vu-smjer"
              d="M{r1(X(pol.x) - 12 * pol.smjer)},{Y0 + 44} h{24 *
                pol.smjer} m{-6 * pol.smjer},-4 l{6 * pol.smjer},4 l{-6 *
                pol.smjer},4"
            />
          {/if}
          {#if otkrivenoPred && tRedaka >= P.t_povratak - 1e-9}
            <text class="vu-natpis" x="180" y="14" text-anchor="middle"
              >vratio se nakon t = 2ℓ/v = {iznosJed(P.t_povratak, "s")}</text
            >
          {/if}
        </svg>
      </figure>
      <div
        class="vu-izbori"
        role="radiogroup"
        aria-label="Kako se puls vrati: {IME_KRAJA[q.kraj]}"
      >
        {#each izbori as z (z)}
          <button
            type="button"
            role="radio"
            aria-checked={odabir[i] === z}
            class="lx-option vu-izbor"
            class:sel={odabir[i] === z}
            class:ok={odabir[i] === z && status === "ok"}
            class:bad={odabir[i] === z && status === "bad"}
            disabled={locked || pokazi}
            onclick={() => (odabir[i] = z)}
          >
            <svg class="vu-piktogram" viewBox="0 0 48 24" aria-hidden="true">
              <line x1="2" y1="12" x2="46" y2="12" class="vu-ik-os" />
              {#if z === "brijeg"}
                <path
                  d="M2,12 H14 C20,12 20,3 24,3 C28,3 28,12 34,12 H46"
                  class="vu-ik"
                />
              {:else if z === "dolina"}
                <path
                  d="M2,12 H14 C20,12 20,21 24,21 C28,21 28,12 34,12 H46"
                  class="vu-ik"
                />
              {:else}
                <path d="M2,12 H46" class="vu-ik" />
              {/if}
              <path d="M14,20 h-8 m3,-2.5 l-3,2.5 l3,2.5" class="vu-ik-str" />
            </svg>
            <span>{IZBORI_PREDVIDI[z]}</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
  {#if usporeno && !prefersReducedMotion.current}
    <p class="vu-usporeno">{usporeno}</p>
  {/if}
  <div class="lx-actions vu-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriPredvidi}
      disabled={locked || odabir.some((o) => !o)}>Provjeri</button
    >
  </div>
{:else}
  <figure class="lx-figure vu-fig">
    <svg bind:this={svgEl} viewBox="0 0 360 {H}" role="img" aria-label={opis}>
      {@render uzeSvg(stanje, P, P.kraj, 0)}

      <!-- zagrade λ -->
      {#each zagrade as z (z.uze)}
        {@const y = Y0 - AMP - 14}
        <g class="vu-zagrada" class:vu-zagrada2={z.uze === 2}>
          <line x1={r1(X(z.od))} y1={y} x2={r1(X(z.do))} y2={y} />
          <line x1={r1(X(z.od))} y1={y - 5} x2={r1(X(z.od))} y2={y + 5} />
          <line x1={r1(X(z.do))} y1={y - 5} x2={r1(X(z.do))} y2={y + 5} />
          <line
            class="vu-zag-crt"
            x1={r1(X(z.od))}
            y1={y + 5}
            x2={r1(X(z.od))}
            y2={Y0 - AMP + 2}
          />
          <line
            class="vu-zag-crt"
            x1={r1(X(z.do))}
            y1={y + 5}
            x2={r1(X(z.do))}
            y2={Y0 - AMP + 2}
          />
          <text x={r1((X(z.od) + X(z.do)) / 2)} y={y - 4} text-anchor="middle"
            >{z.tekst}</text
          >
        </g>
      {/each}

      <!-- puls: strelica smjera -->
      {#if puls && t > 0 && !(istrazi && vratio)}
        <path
          class="vu-smjer"
          d="M{r1(X(puls.x) - 12 * puls.smjer)},{Y0 + 46} h{24 *
            puls.smjer} m{-6 * puls.smjer},-4 l{6 * puls.smjer},4 l{-6 *
            puls.smjer},4"
        />
      {/if}
      {#if scena === "puls" && istrazi && vratio}
        <text class="vu-natpis" x="180" y="14" text-anchor="middle"
          >vratio se nakon t = 2ℓ/v = {iznosJed(P.t_povratak, "s")} · {P.kraj ===
          "ucvrscen"
            ? "okrenut"
            : "neokrenut"}</text
        >
      {/if}

      <!-- stojni: čvorovi (crveno) i trbusi (zeleno) -->
      {#if pokaziCvorove}
        {#each cvorovi(P, harmonik) as x (x)}
          <circle class="vu-cvor" cx={r1(X(x))} cy={Y0} r="4.5" />
        {/each}
        {#each trbusi(P, harmonik) as x (x)}
          <line
            class="vu-trbuh-crta"
            x1={r1(X(x))}
            y1={Y0 - AMP - 4}
            x2={r1(X(x))}
            y2={Y0 + AMP + 4}
          />
          <text
            class="vu-trbuh-t"
            x={r1(X(x))}
            y={Y0 + AMP + 16}
            text-anchor="middle">T</text
          >
        {/each}
      {/if}
      {#if natpisStojni}
        <text
          class="vu-natpis"
          class:vu-natpis-tih={harmonik == null}
          x="186"
          y="13"
          text-anchor="middle">{natpisStojni}</text
        >
      {/if}

      <!-- ravnalo -->
      {#if imaRavnalo}
        <line class="vu-rav" x1={X0} y1={YR} x2={X1} y2={YR} />
        {#each lin.oznake as o (o.x)}
          <line
            class="vu-rav"
            x1={r1(X(o.x))}
            y1={YR}
            x2={r1(X(o.x))}
            y2={YR + (o.velika ? 7 : 4)}
          />
          {#if o.velika}
            <text
              class="vu-rav-t"
              x={r1(X(o.x))}
              y={YR + 18}
              text-anchor="middle">{o.tekst}</text
            >
          {/if}
        {/each}
        <text class="vu-rav-t" x={X1 + 10} y={YR + 18}>m</text>
      {/if}

      <!-- oznaci λ: dvije oznake -->
      {#if nacin === "oznaci" && scena === "putujuci"}
        {#if ozStatus === "ok"}
          {@const a = Math.min(...oznake)}
          {@const b = Math.max(...oznake)}
          <g class="vu-zagrada vu-zag-ok">
            <line
              x1={r1(X(a))}
              y1={Y0 - AMP - 14}
              x2={r1(X(b))}
              y2={Y0 - AMP - 14}
            />
            <text
              x={r1((X(a) + X(b)) / 2)}
              y={Y0 - AMP - 18}
              text-anchor="middle"
              >{uze2 ? "λ₂" : "λ"} = {iznosJed(
                uze2 ? P.lambda2 : P.lambda,
                "m",
              )}</text
            >
          </g>
        {/if}
        {#each oznake as x, i (i)}
          <g
            class="vu-ozn"
            class:ok={ozStatus === "ok"}
            class:bad={ozStatus === "bad"}
          >
            <line
              class="vu-ozn-crta"
              x1={r1(X(x))}
              y1={Y0 - AMP - 8}
              x2={r1(X(x))}
              y2={YR}
            />
            <g
              class="lx-handle vu-ruc"
              role="slider"
              tabindex={aktivno ? 0 : -1}
              aria-label="Oznaka {i + 1}: povuci je ili pomakni strelicama"
              aria-valuemin="0"
              aria-valuemax={L0}
              aria-valuenow={x}
              aria-valuetext="{formatNumber(Number(x.toFixed(3)))} m"
              onpointerdown={(e) => oznDown(i, e)}
              onpointermove={oznMove}
              onpointerup={oznUp}
              onpointercancel={oznUp}
              onkeydown={(e) => oznKey(i, e)}
            >
              <circle class="vu-hit" cx={r1(X(x))} cy={Y0 + AMP + 12} r="22" />
              <circle
                class="vu-ruc-k"
                cx={r1(X(x))}
                cy={Y0 + AMP + 12}
                r="10"
              />
              <text
                class="vu-ruc-t"
                x={r1(X(x))}
                y={Y0 + AMP + 16}
                text-anchor="middle">{i + 1}</text
              >
            </g>
          </g>
        {/each}
      {/if}

      <!-- oznaci čvorove / trbuhe: dodiri po niti -->
      {#if nacin === "oznaci" && scena === "stojni"}
        <rect
          class="vu-dodir"
          class:aktivno
          x={X0 - 10}
          y={Y0 - AMP - 14}
          width={X1 - X0 + 20}
          height={2 * AMP + 28}
          role="button"
          tabindex={aktivno ? 0 : -1}
          aria-label="Nit: dodirni mjesto da ga označiš (ponovni dodir briše oznaku). Tipkovnica: strelice pomiču, Enter označi."
          onclick={dodir}
          onkeydown={dodirKey}
          onfocus={() => (kursorVidljiv = true)}
          onblur={() => (kursorVidljiv = false)}
        />
        {#if kursorVidljiv && aktivno}
          <line
            class="vu-kursor"
            x1={r1(X(kursor))}
            y1={Y0 - AMP - 8}
            x2={r1(X(kursor))}
            y2={Y0 + AMP + 8}
          />
        {/if}
        {#each dodiri as x (x)}
          <g
            class="vu-dod"
            class:ok={dodiriStatus === "ok"}
            class:bad={dodiriStatus === "bad"}
          >
            <line x1={r1(X(x))} y1={Y0 - 14} x2={r1(X(x))} y2={Y0 + 14} />
            <circle cx={r1(X(x))} cy={Y0} r="7" />
          </g>
        {/each}
      {/if}

      <!-- zaustavi: rješenje uz crvenu kuglicu -->
      {#if rijesenoZ && scena === "putujuci" && stanje.istaknute[0]}
        <text
          class="vu-natpis"
          x={r1(X(stanje.istaknute[0][0]))}
          y={Y0 - AMP - 10}
          text-anchor="middle">{tocanTekst}</text
        >
      {/if}
      {#if rijesenoZ && scena === "puls"}
        <text class="vu-natpis" x="180" y="14" text-anchor="middle"
          >{tocanTekst}</text
        >
      {/if}
    </svg>
    {#if mirujuciT}
      <figcaption class="vu-cap">
        📷 fotografija užeta u jednom trenutku · {visinaNapomena}
      </figcaption>
    {:else if mirno}
      <figcaption class="vu-cap">
        {skrivena
          ? "Vibrator miruje: titranje se pokaže nakon odgovora."
          : `${scena === "stojni" ? "Vibrator" : "Izvor"} miruje. Namjesti klizač i pritisni Provjeri: tada se uključi.`}
      </figcaption>
    {:else if (usporeno || visinaNapomena) && !prefersReducedMotion.current}
      <figcaption class="vu-cap">
        {[usporeno, visinaNapomena].filter(Boolean).join(" · ")}
      </figcaption>
    {/if}
  </figure>

  {#if nacin === "oznaci" && scena === "putujuci"}
    <p class="lx-readout">Razmak oznaka: <b>Δx = {iznosJed(dx, "m")}</b></p>
  {/if}
  {#if nacin === "oznaci" && scena === "stojni"}
    <p class="vu-uputa">
      Dodirni nit na svakom {spec.trazi === "cvorovi" ? "čvoru" : "trbuhu"};
      ponovni dodir briše oznaku. Oznaka: {dodiri.length}
    </p>
  {/if}

  {#if imaYT && graf}
    <figure class="lx-figure vu-fig vu-graf">
      <svg
        viewBox="0 0 {GW} {GH}"
        role="img"
        aria-label="Graf y(t) crvene kuglice: otklon kroz vrijeme."
      >
        <text class="vu-mala" x="8" y="12">y</text>
        <line class="vu-os" x1={GX0} y1="8" x2={GX0} y2={GH - 8} />
        <line class="vu-ravnoteza" x1={GX0} y1={GY0} x2={GX1} y2={GY0} />
        <line
          class="vu-amp"
          x1={GX0 - 4}
          y1={r1(GY0 - graf.A)}
          x2={GX1}
          y2={r1(GY0 - graf.A)}
        />
        <line
          class="vu-amp"
          x1={GX0 - 4}
          y1={r1(GY0 + graf.A)}
          x2={GX1}
          y2={r1(GY0 + graf.A)}
        />
        <text
          class="vu-mala"
          x={GX0 - 7}
          y={r1(GY0 - graf.A + 4)}
          text-anchor="end">A</text
        >
        <text
          class="vu-mala"
          x={GX0 - 7}
          y={r1(GY0 + graf.A + 4)}
          text-anchor="end">−A</text
        >
        {#each graf.oznake as o (o.x)}
          <line
            class="vu-os"
            x1={r1(o.x)}
            y1={GY0 - 3}
            x2={r1(o.x)}
            y2={GY0 + 3}
          />
          <text class="vu-mala" x={r1(o.x)} y={GH - 2} text-anchor="middle"
            >{o.tekst}</text
          >
        {/each}
        <text class="vu-mala" x={GX1 + 4} y={GY0 + 4}>t/s</text>
        <polyline class="vu-yt" points={graf.put} />
        {#if graf.zadnja}
          <circle
            class="vu-ist"
            cx={r1(graf.zadnja[0])}
            cy={r1(graf.zadnja[1])}
            r="4"
          />
        {/if}
      </svg>
    </figure>
  {/if}

  {#if imaPlay}
    <div class="vu-kontrole">
      {#if igra}
        <button
          type="button"
          class="btn btn-ghost vu-gumb"
          onclick={() => (igra = false)}
          aria-label="Pauza"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"
            ><path d="M5 3v10M11 3v10" /></svg
          >Pauza
        </button>
      {:else}
        <button
          type="button"
          class="btn btn-ghost vu-gumb"
          onclick={pokreni}
          disabled={mirno}
          aria-label={scena === "puls" && istrazi ? "Pusti puls" : "Pokreni"}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"
            ><path class="puno" d="M5 3l8 5-8 5z" /></svg
          >{scena === "puls" && istrazi && (t === 0 || vratio)
            ? "Pusti puls"
            : t > 0 && !vratio && (!tMax || t < tMax - 1e-9)
              ? "Nastavi"
              : "Pokreni"}
        </button>
      {/if}
      {#if imaSat}
        <button
          type="button"
          class="btn btn-quiet vu-gumb vu-ikona"
          onclick={ispocetka}
          aria-label="Ispočetka"
          title="Ispočetka"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"
            ><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v3h3" /></svg
          >
        </button>
        <div class="vu-vrijeme">
          <input
            type="range"
            min="0"
            max={tMax}
            step={korakT}
            bind:value={t}
            oninput={() => {
              igra = false;
              vratio = false;
            }}
            aria-label="Vrijeme"
            aria-valuetext="{fmtT(t)} sekundi"
          />
          <output class="vu-t">t = {fmtT(t)} s</output>
        </div>
      {/if}
    </div>
    {#if nacin === "zaustavi"}
      <div class="vu-fino">
        <button
          type="button"
          class="btn btn-quiet"
          onclick={() => pomakniT(-korakT)}
          aria-label="Malo unatrag">−{formatNumber(korakT)} s</button
        >
        <button
          type="button"
          class="btn btn-quiet"
          onclick={() => pomakniT(korakT)}
          aria-label="Malo naprijed">+{formatNumber(korakT)} s</button
        >
      </div>
    {/if}
  {/if}
  <p class="sr-only" aria-live="polite">{sazetak}</p>

  {#if scena === "puls" && istrazi}
    <div class="vu-krajevi" role="radiogroup" aria-label="Kraj užeta">
      {#each KRAJEVI as k (k)}
        <button
          type="button"
          role="radio"
          aria-checked={krajIstrazi === k}
          class="btn vu-kraj"
          class:btn-primary={krajIstrazi === k}
          class:btn-ghost={krajIstrazi !== k}
          onclick={() => promijeniKraj(k)}>{KRAJ_KRATKO[k]}</button
        >
      {/each}
    </div>
  {/if}

  <Ocitanja {stavke} />
  {#if istrazi || postavi}
    <Klizaci
      klizaci={spec.klizaci ?? []}
      bind:vrijednosti={p}
      disabled={postavi && (locked || pokazi)}
    />
  {/if}

  {#if nacin === "zaustavi"}
    <p class="vu-uputa">
      Pokreni, zaustavi u pravom trenutku (možeš i povući vrijeme), pa provjeri.
    </p>
    <div class="lx-actions vu-akcije">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriZaustavi}
        disabled={locked || t <= 0}>Provjeri (t = {fmtT(t)} s)</button
      >
    </div>
  {:else if nacin === "oznaci"}
    <div class="lx-actions vu-akcije">
      {#if scena === "stojni"}
        <button
          type="button"
          class="btn btn-quiet"
          onclick={() => (dodiri = [])}
          disabled={locked || pokazi || !dodiri.length}>Obriši oznake</button
        >
      {/if}
      <button
        type="button"
        class="btn btn-primary"
        onclick={scena === "stojni" ? provjeriDodire : provjeriOznake}
        disabled={locked || (scena === "stojni" && !dodiri.length)}
        >Provjeri</button
      >
    </div>
  {:else if postavi}
    <div class="lx-actions vu-akcije">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriPostavi}
        disabled={locked}>Provjeri</button
      >
    </div>
  {:else if nacin === "izracunaj"}
    <form class="vu-unos" onsubmit={provjeriIzracun}>
      {#each pitaj as q, i (i)}
        <div class="vu-unos-red">
          <label for="vu-{uid}-{i}"><Md text={oznakaPitanja(q)} inline /></label
          >
          <span class="vu-polje">
            <input
              id="vu-{uid}-{i}"
              class="inp lx-broj-inp"
              class:ok={pokazi || ishod?.polja?.[i] === true}
              class:bad={ishod && !ishod.prazno && ishod.polja?.[i] === false}
              inputmode="decimal"
              autocomplete="off"
              placeholder="?"
              disabled={locked}
              bind:value={unosi[i]}
            />
            {#if jedinicaPitanja(q)}<span class="lx-unit"
                >{jedinicaPitanja(q)}</span
              >{/if}
          </span>
        </div>
      {/each}
      <div class="lx-actions vu-akcije">
        <button
          class="btn btn-primary"
          type="submit"
          disabled={locked || unosi.every((u) => !String(u).trim())}
          >Provjeri</button
        >
      </div>
    </form>
  {/if}
{/if}

{#if (pokazi || (ishod?.tocno && !istrazi)) && tocanTekst && nacin !== "izracunaj"}
  <p class="lx-solution">Točan odgovor: {tocanTekst}</p>
{/if}

<style>
  .vu-tekst {
    margin-bottom: 8px;
  }
  .vu-fig {
    max-width: 460px;
    margin-bottom: 6px;
  }
  .vu-fig svg {
    overflow: visible;
  }
  .vu-graf {
    margin-top: 0;
  }
  .vu-cap,
  .vu-usporeno {
    text-align: center;
    font-size: 11.5px;
    color: var(--text-faint);
    margin: 2px 0 0;
  }
  .vu-ravnoteza {
    stroke: var(--border-strong);
    stroke-dasharray: 4 4;
    stroke-width: 1;
  }
  .vu-uze {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 75%, transparent);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .vu-uze2 {
    stroke: color-mix(in srgb, var(--warn) 80%, var(--text-dim));
    stroke-width: 3.4;
  }
  .vu-kug {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 1;
  }
  .vu-kug2 {
    fill: var(--warn);
  }
  .vu-ist {
    fill: var(--danger);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .vu-ist-sjena {
    fill: color-mix(in srgb, var(--danger) 18%, transparent);
  }
  .vu-cvor-spoj {
    stroke: var(--text-faint);
    stroke-dasharray: 2 3;
  }
  .vu-spoj {
    fill: none;
  }
  .vu-mala {
    fill: var(--text-faint);
    font: 500 10.5px var(--font-sans);
  }
  .vu-vibrator {
    fill: color-mix(in srgb, var(--text-dim) 30%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .vu-stalak {
    fill: var(--text-faint);
  }
  .vu-sipka {
    stroke: var(--text-dim);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .vu-titraj {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.4;
  }
  .vu-ruka {
    fill: color-mix(in srgb, var(--text-dim) 45%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .vu-rukav {
    fill: color-mix(in srgb, var(--text-dim) 20%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .vu-zid {
    fill: color-mix(in srgb, var(--text-dim) 22%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .vu-sraf {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .vu-sipka-kraj {
    stroke: var(--text-dim);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .vu-prsten {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.2;
  }
  .vu-nastavak {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 40%, transparent);
    stroke-width: 2;
    stroke-dasharray: 3 3;
  }
  .vu-ovojnica {
    fill: color-mix(in srgb, var(--primary) 12%, transparent);
    stroke: color-mix(in srgb, var(--primary) 35%, transparent);
    stroke-width: 1;
  }
  .vu-cvor {
    fill: var(--danger);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .vu-trbuh-crta {
    stroke: color-mix(in srgb, var(--success) 70%, transparent);
    stroke-dasharray: 2 3;
  }
  .vu-trbuh-t {
    fill: var(--success);
    font: 700 11px var(--font-sans);
  }
  .vu-natpis {
    fill: var(--text);
    font: 600 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .vu-natpis-tih {
    fill: var(--text-dim);
    font-weight: 500;
  }
  .vu-zagrada line {
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .vu-zagrada text {
    fill: var(--primary);
    font: 600 11.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .vu-zagrada2 line {
    stroke: var(--warn);
  }
  .vu-zagrada2 text {
    fill: color-mix(in srgb, var(--warn) 80%, var(--text));
  }
  .vu-zagrada .vu-zag-crt {
    stroke-width: 1;
    stroke-dasharray: 2 2;
    opacity: 0.7;
  }
  .vu-zag-ok line {
    stroke: var(--success);
  }
  .vu-zag-ok text {
    fill: var(--success);
  }
  .vu-smjer {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .vu-upitnik {
    fill: var(--text-faint);
    font: 700 22px var(--font-sans);
  }
  .vu-rav {
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .vu-rav-t {
    fill: var(--text-faint);
    font: 500 10.5px var(--font-sans);
  }
  .vu-ozn-crta {
    stroke: var(--primary);
    stroke-width: 1.4;
    stroke-dasharray: 4 3;
  }
  .vu-ozn.ok .vu-ozn-crta {
    stroke: var(--success);
  }
  .vu-ozn.bad .vu-ozn-crta {
    stroke: var(--danger);
  }
  .vu-ruc {
    outline: none;
  }
  .vu-hit {
    fill: transparent;
  }
  .vu-ruc-k {
    fill: color-mix(in srgb, var(--primary) 22%, var(--bg-elev));
    stroke: var(--primary);
    stroke-width: 1.8;
  }
  .vu-ozn.ok .vu-ruc-k {
    stroke: var(--success);
    fill: color-mix(in srgb, var(--success) 22%, var(--bg-elev));
  }
  .vu-ozn.bad .vu-ruc-k {
    stroke: var(--danger);
  }
  .vu-ruc:focus-visible .vu-ruc-k {
    stroke-width: 3.4;
  }
  .vu-ruc-t {
    fill: var(--text);
    font: 700 11px var(--font-sans);
    pointer-events: none;
  }
  .vu-dodir {
    fill: transparent;
    outline: none;
  }
  .vu-dodir.aktivno {
    cursor: pointer;
  }
  .vu-dodir:focus-visible {
    stroke: var(--primary);
    stroke-dasharray: 3 3;
  }
  .vu-kursor {
    stroke: var(--primary);
    stroke-width: 1.5;
  }
  .vu-dod line {
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .vu-dod circle {
    fill: color-mix(in srgb, var(--primary) 25%, var(--bg-elev));
    stroke: var(--primary);
    stroke-width: 2;
    pointer-events: none;
  }
  .vu-dod.ok circle,
  .vu-dod.ok line {
    stroke: var(--success);
  }
  .vu-dod.bad circle,
  .vu-dod.bad line {
    stroke: var(--danger);
  }
  .vu-os {
    stroke: var(--border-strong);
  }
  .vu-amp {
    stroke: var(--border);
    stroke-dasharray: 2 3;
  }
  .vu-yt {
    fill: none;
    stroke: var(--danger);
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .vu-kontrole {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    max-width: 460px;
    margin: 4px auto 0;
  }
  .vu-gumb svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .vu-gumb svg .puno {
    fill: currentColor;
    stroke: none;
  }
  .vu-gumb {
    min-height: 40px;
    min-width: 40px;
    justify-content: center;
    flex-shrink: 0;
  }
  .vu-ikona {
    padding: 8px;
  }
  .vu-vrijeme {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .vu-vrijeme input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .vu-t {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text);
    text-align: right;
  }
  .vu-fino {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-top: 4px;
  }
  .vu-fino .btn {
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .vu-krajevi {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: 8px 0 10px;
    flex-wrap: wrap;
  }
  .vu-kraj {
    min-height: 36px;
  }
  .vu-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 6px 0 0;
  }
  .vu-akcije {
    justify-content: center;
  }
  .vu-red {
    margin-bottom: 10px;
  }
  .vu-red-ime {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-dim);
    text-align: center;
  }
  .vu-izbori {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .vu-izbor {
    width: auto;
    align-items: center;
    padding: 8px 12px;
    font-size: 14px;
  }
  .vu-piktogram {
    width: 48px;
    height: 24px;
    flex-shrink: 0;
  }
  .vu-ik {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
  }
  .vu-ik-os {
    stroke: var(--border-strong);
    stroke-dasharray: 2 2;
  }
  .vu-ik-str {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.4;
  }
  .vu-unos {
    display: grid;
    gap: 8px;
    justify-items: center;
    margin-top: 6px;
  }
  .vu-unos-red {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .vu-unos-red label {
    min-width: 92px;
    text-align: right;
    color: var(--text-dim);
  }
  .vu-polje {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
</style>
