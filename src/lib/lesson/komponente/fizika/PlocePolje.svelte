<script>
  // Dvije vodoravne ploče (gornja +, donja −) s homogenim poljem: čestica iz mirovanja ili s vodoravnim uletom
  // (istrazi, pogodi) i pločasti kondenzator s izvorom i dielektrikom (istrazi, predvidi). Putanju, otklon i
  // promjene kondenzatora računa katalog (_elektrostatika.js), isti kod kao provjera; ovdje se samo crta i animira.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import { NAZIV_VELICINE } from "$lib/lesson/katalog/fizika/ploce_polje.js";
  import {
    putanja,
    ubrzanje,
    nakonAkcije,
    smjeroviPromjene,
    EPS0,
    CESTICE,
    jakostPolja,
  } from "$lib/lesson/katalog/fizika/_elektrostatika.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";
  import {
    svgTocka,
    strelica,
    lijepiKorak,
    ogranici,
    glatko,
  } from "./_elektrostatika.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const pitanje = nacin !== "istrazi";
  const cestica = untrack(() => spec.cestica ?? null);
  const vodoravno = cestica?.ulaz === "vodoravno";
  const f1 = (n) => Math.round(n * 10) / 10;
  const tri = (v) => formatNumber(Number(Number(v).toPrecision(3)));
  const W = 360;

  // ── klizači (istrazi) ──
  const pocetak = untrack(() => {
    const d = spec.d ?? 1;
    const er0 = spec.er ?? 1;
    const A =
      spec.A ??
      (spec.C != null
        ? (spec.C * 1e-12 * d * 1e-3) / (EPS0 * er0) / 1e-4
        : null);
    const U = spec.U ?? (spec.E != null ? spec.E * d * 1e-3 : null);
    return { U, d, A, er: er0, v0: cestica?.v0 ?? null };
  });
  const RASPON = untrack(() => {
    const r = (v, a, b) => {
      const min = v * a;
      const max = v * b;
      const korak = lijepiKorak(max - min, 60);
      return {
        min: Math.max(korak, Math.round(min / korak) * korak),
        max: Math.round(max / korak) * korak,
        korak,
      };
    };
    return {
      U: pocetak.U ? r(pocetak.U, 0.2, 3) : null,
      d: r(pocetak.d, 0.25, 3),
      A: pocetak.A ? r(pocetak.A, 0.25, 3) : null,
      er: { min: 1, max: 10, korak: 0.5 },
      v0: pocetak.v0 ? r(pocetak.v0, 0.34, 3) : null,
    };
  });
  const klizaci = untrack(() =>
    nacin === "istrazi" ? (spec.klizaci ?? []) : [],
  );
  let v = $state({ ...pocetak });
  const NAZIV_KL = {
    U: "napon U",
    d: "razmak d",
    A: "površina S",
    er: "dielektrik εᵣ",
    v0: "brzina v₀",
  };
  const JED_KL = { U: "V", d: "mm", A: "cm²", er: "", v0: "m/s" };
  const fmtKl = (k, x) =>
    k === "v0"
      ? `${formatSci(x)} m/s`
      : `${formatNumber(x)}${JED_KL[k] ? ` ${JED_KL[k]}` : ""}`;

  // trenutni spec za fiziku (istrazi mijenja U, d, v0)
  let fs = $derived({
    ...spec,
    U: v.U,
    E: undefined,
    d: v.d,
    cestica: cestica ? { ...cestica, v0: v.v0 ?? cestica.v0 } : undefined,
  });

  // ═══ ČESTICA ═══════════════════════════════════════════════════════════════════════════════════════
  const PL = 44;
  const PR = vodoravno ? 300 : 262;
  const YT = 52; // donji rub gornje ploče
  let G = $derived(
    pitanje ? 160 : ogranici(150 * Math.sqrt(v.d / RASPON.d.max), 50, 170),
  );
  let YB = $derived(YT + G);
  let YM = $derived(YT + G / 2);
  const HC = $derived(YB + 52);

  let put = $derived(cestica && vodoravno ? putanja(fs) : null);
  let ubrz = $derived(cestica && !vodoravno ? ubrzanje(fs) : null);
  let Epolje = $derived(cestica ? jakostPolja(fs) : 0);
  const E0 = untrack(() => (spec.cestica ? jakostPolja(spec) : 1));

  // animacija leta: τ 0 → 1
  let tau = $state(0);
  let leti = $state(false);
  let raf = 0;
  function pusti() {
    cancelAnimationFrame(raf);
    if (prefersReducedMotion.current) {
      tau = 1;
      leti = false;
      return;
    }
    leti = true;
    tau = 0;
    const start = performance.now();
    const korak = (sad) => {
      tau = Math.min(1, (sad - start) / 1700);
      if (tau < 1) raf = requestAnimationFrame(korak);
      else leti = false;
    };
    raf = requestAnimationFrame(korak);
  }
  $effect(() => () => cancelAnimationFrame(raf));
  // promjena klizača poništava let
  $effect(() => {
    v.U;
    v.d;
    v.v0;
    untrack(() => {
      if (nacin === "istrazi") {
        cancelAnimationFrame(raf);
        leti = false;
        tau = 0;
      }
    });
  });

  // vodoravni ulet: x u px iz vremena, y iz ½at² (okomito mjerilo je uvećano: G px = d)
  let pxPoMm = $derived(G / v.d);
  let tocka = $derived.by(() => {
    if (!put) return null;
    return (t) => {
      const tt = Math.min(t, put.t);
      let x = PL + ((put.v0 * tt) / (spec.L * 0.01)) * (PR - PL);
      let y = YM - put.smjer * 0.5 * put.a * tt * tt * 1000 * pxPoMm;
      if (t > put.t && put.izlaz) {
        // izvan ploča: ravno dalje po tangenti
        const dt = t - put.t;
        x += ((put.v0 * dt) / (spec.L * 0.01)) * (PR - PL);
        y -= put.smjer * put.a * put.t * dt * 1000 * pxPoMm;
      }
      return [x, y];
    };
  });
  // trajanje leta u stvarnom vremenu: do izlaza i još malo dalje, ili do udara
  let tKraj = $derived(
    put ? (put.izlaz ? put.t * (1 + 50 / (PR - PL)) : put.t) : 0,
  );
  const ulaz = -24; // px lijevo od ploča gdje čestica kreće
  let putanjaPx = $derived.by(() => {
    if (!put || !tocka) return "";
    const n = 60;
    const pts = [`${PL + ulaz},${f1(YM)}`];
    for (let i = 0; i <= n; i++) {
      const [x, y] = tocka((tKraj * i) / n);
      pts.push(`${f1(x)},${f1(Math.min(Math.max(y, 0), HC))}`);
    }
    return "M" + pts.join(" L");
  });
  // položaj čestice u animaciji: prvih 15 % ulazi do ploča, ostatak je let
  let cesticaPx = $derived.by(() => {
    if (!cestica) return null;
    if (vodoravno) {
      if (tau <= 0.15) return [PL + ulaz + (-ulaz * tau) / 0.15, YM];
      return tocka(((tau - 0.15) / 0.85) * tKraj);
    }
    // iz mirovanja: s ploče istog predznaka do druge, s ∝ t²
    const odGore = CESTICE[cestica.vrsta].q > 0;
    const s = tau * tau;
    const r = 8;
    return [
      (PL + PR) / 2,
      odGore ? YT + r + (G - 2 * r) * s : YB - r - (G - 2 * r) * s,
    ];
  });
  // stroboskop: položaji u jednakim vremenskim razmacima (iz mirovanja vidi se ubrzanje)
  let strob = $derived.by(() => {
    if (!cestica || vodoravno || tau === 0) return [];
    const odGore = CESTICE[cestica.vrsta].q > 0;
    const out = [];
    for (let i = 1; i < 10 && i / 10 <= tau; i++) {
      const s = (i / 10) ** 2;
      out.push(odGore ? YT + 8 + (G - 16) * s : YB - 8 - (G - 16) * s);
    }
    return out;
  });
  let tragDo = $derived(vodoravno && tau > 0 ? tau : 0);

  // silnice: broj razmjeran E
  let silnice = $derived.by(() => {
    const E = cestica ? Epolje : kond.sad.E;
    const ref = cestica ? E0 : kond.pocetno.E;
    const [x0, x1] = cestica ? [PL, PR] : [ploca.x0, ploca.x1];
    const n = ogranici(
      Math.round(6 * (E / ref) * (cestica ? 1 : ploca.w / ploca.w0)),
      1,
      16,
    );
    return Array.from(
      { length: n },
      (_, i) => x0 + ((i + 0.5) * (x1 - x0)) / n,
    );
  });

  // ── pogodi: oznaka na ⊐ putu (gornja ploča → desni rub → donja ploča) ──
  let oznaka = $state(null); // {gdje, x (cm), y (mm)}
  let poslano = $state(null);
  const korakY = untrack(() => (spec.d ? lijepiKorak(spec.d / 2, 100) : 0.1));
  const korakX = untrack(() => (spec.L ? lijepiKorak(spec.L, 100) : 0.1));
  const zaokr = (x, k) => Math.round(x / k) * k;
  let svgEl = $state();
  let vuce = false;
  let aktivno = $derived(nacin === "pogodi" && !locked);

  function oznakaIz(px, py) {
    const dIzlaz = Math.abs(px - PR);
    const dGore = Math.abs(py - YT);
    const dDolje = Math.abs(py - YB);
    const naRubu = py >= YT && py <= YB ? dIzlaz : Infinity;
    const xPlo = ogranici(px, PL, PR);
    if (naRubu <= Math.min(dGore, dDolje) || px > PR) {
      const y = zaokr(
        ogranici((YM - py) / pxPoMm, -spec.d / 2, spec.d / 2),
        korakY,
      );
      if (Math.abs(Math.abs(y) - spec.d / 2) < 1e-9)
        return { gdje: y > 0 ? "gore" : "dolje", x: spec.L, y };
      return { gdje: "izlaz", x: spec.L, y };
    }
    const x = zaokr(((xPlo - PL) / (PR - PL)) * spec.L, korakX);
    return {
      gdje: dGore < dDolje ? "gore" : "dolje",
      x,
      y: dGore < dDolje ? spec.d / 2 : -spec.d / 2,
    };
  }
  let oznakaPx = $derived.by(() => {
    if (!oznaka) return null;
    if (oznaka.gdje === "izlaz") return [PR, YM - oznaka.y * pxPoMm];
    return [
      PL + (oznaka.x / spec.L) * (PR - PL),
      oznaka.gdje === "gore" ? YT : YB,
    ];
  });
  function down(e) {
    if (!aktivno) return;
    const p = svgTocka(svgEl, e);
    if (!p) return;
    e.preventDefault();
    svgEl.setPointerCapture?.(e.pointerId);
    vuce = true;
    oznaka = oznakaIz(p.x, p.y);
  }
  function move(e) {
    if (!vuce) return;
    const p = svgTocka(svgEl, e);
    if (p) oznaka = oznakaIz(p.x, p.y);
  }
  function up() {
    vuce = false;
  }
  function pomakni(smjer) {
    if (!aktivno) return;
    if (!oznaka) oznaka = { gdje: "izlaz", x: spec.L, y: 0 };
    const o = oznaka;
    if (o.gdje === "izlaz") {
      const y = zaokr(
        ogranici(o.y + smjer * korakY, -spec.d / 2, spec.d / 2),
        korakY,
      );
      oznaka =
        Math.abs(Math.abs(y) - spec.d / 2) < 1e-9
          ? { gdje: y > 0 ? "gore" : "dolje", x: spec.L, y }
          : { ...o, y };
    } else {
      // na ploči: + = prema izlazu
      const x = zaokr(ogranici(o.x + smjer * korakX, 0, spec.L), korakX);
      oznaka =
        x >= spec.L - 1e-9
          ? {
              gdje: "izlaz",
              x: spec.L,
              y: zaokr(
                (o.gdje === "gore" ? 1 : -1) * (spec.d / 2 - korakY),
                korakY,
              ),
            }
          : { ...o, x };
    }
  }
  function keyOznaka(e) {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    if (
      oznaka?.gdje !== "izlaz" &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    )
      return;
    pomakni(d);
  }
  const opisOznake = (o) =>
    o.gdje === "izlaz"
      ? `izlaz: y = ${tri(Math.abs(o.y))} mm ${o.y > 0 ? "iznad" : o.y < 0 ? "ispod" : "na"} pravc${o.y === 0 ? "u" : "a"} ulaska`
      : `${o.gdje === "gore" ? "gornja" : "donja"} ploča: x = ${tri(o.x)} cm od ulaza`;

  // kad je ishod točan ili se traži točan odgovor: oznaka na točno mjesto i čestica proleti
  let otkrij = $derived(pitanje && (pokazi || !!ishod?.tocno));
  let promijenjeno = $derived(
    nacin === "pogodi"
      ? !poslano ||
          !oznaka ||
          poslano.gdje !== oznaka.gdje ||
          poslano.x !== oznaka.x ||
          poslano.y !== oznaka.y
      : !poslano || Object.keys(izbor).some((k) => izbor[k] !== poslano[k]),
  );
  let stanje = $derived(
    otkrij
      ? "ok"
      : ishod && !ishod.tocno && !ishod.prazno && !promijenjeno
        ? "bad"
        : "",
  );
  let pokrenuto = false;
  $effect(() => {
    if (!otkrij) return;
    untrack(() => {
      if (nacin === "pogodi" && pokazi && put)
        oznaka = put.izlaz
          ? { gdje: "izlaz", x: spec.L, y: put.smjer * put.y }
          : {
              gdje: put.smjer > 0 ? "gore" : "dolje",
              x: put.x,
              y: (put.smjer * spec.d) / 2,
            };
      if (nacin === "predvidi" && pokazi) izbor = { ...tocniSmjerovi };
      if (!pokrenuto) {
        pokrenuto = true;
        if (nacin === "pogodi") pusti();
        else animirajAkciju();
      }
    });
  });

  // ravnala: na desnom rubu otklon u mm od pravca ulaska, uz gornju ploču x u cm
  let ravnaloY = $derived.by(() => {
    if (!vodoravno) return [];
    const k = lijepiKorak(v.d / 2, 4);
    const out = [];
    for (let y = -Math.floor(v.d / 2 / k) * k; y <= v.d / 2 + 1e-9; y += k)
      out.push(Math.round(y * 1e6) / 1e6);
    return out;
  });
  const ravnaloX = untrack(() => {
    if (!vodoravno || !spec.L) return [];
    const k = lijepiKorak(spec.L, 5);
    const out = [];
    for (let x = 0; x <= spec.L + 1e-9; x += k)
      out.push(Math.round(x * 1e6) / 1e6);
    return out;
  });

  // ═══ KONDENZATOR ══════════════════════════════════════════════════════════════════════════════════
  const imaIzvor = untrack(() => spec.izvor != null);
  let spojen = $state(untrack(() => spec.izvor !== "odspojen"));
  let Qzakljucan = $state(null); // naboj kad se izvor odspoji (istrazi)
  const akcija = untrack(() => spec.akcija ?? null);
  const promjena = untrack(() =>
    nacin === "predvidi" ? nakonAkcije(spec) : null,
  );
  const tocniSmjerovi = untrack(() =>
    nacin === "predvidi" ? smjeroviPromjene(spec) : {},
  );
  let faza = $state(0); // predvidi: 0 prije, 1 poslije (animira se)

  function stanjeKond(U, d, A, er) {
    const C = (EPS0 * er * A * 1e-4) / (d * 1e-3);
    return { C, U, Q: C * U, E: U / (d * 1e-3), W: 0.5 * C * U * U };
  }
  let kond = $derived.by(() => {
    if (cestica) return { sad: { E: 0 }, pocetno: { E: 1 } };
    const pocetno = stanjeKond(pocetak.U, pocetak.d, pocetak.A, pocetak.er);
    if (nacin === "predvidi") {
      const s = glatko(faza);
      const a = promjena.prije;
      const b = promjena.poslije;
      const mix = (k) => a[k] + (b[k] - a[k]) * s;
      return {
        pocetno,
        sad: {
          C: mix("C"),
          U: mix("U"),
          Q: mix("Q"),
          E: mix("E"),
          W: mix("W"),
        },
        d: pocetak.d * (1 + (promjena.fd - 1) * s),
        A:
          pocetak.A *
          (akcija.vrsta === "povecaj_A" ? 1 + (akcija.faktor - 1) * s : 1),
      };
    }
    const C = stanjeKond(1, v.d, v.A, v.er).C;
    const U = spojen || Qzakljucan == null ? pocetak.U : Qzakljucan / C;
    return { pocetno, sad: stanjeKond(U, v.d, v.A, v.er), d: v.d, A: v.A };
  });
  function prekidac() {
    if (spojen) {
      Qzakljucan = kond.sad.Q;
      spojen = false;
    } else {
      spojen = true;
      Qzakljucan = null;
    }
  }
  // istrazi s odspojenim izvorom na početku: naboj je onaj s početnim naponom
  $effect(() => {
    if (nacin === "istrazi" && !cestica && !spojen && Qzakljucan == null)
      untrack(
        () =>
          (Qzakljucan = stanjeKond(
            pocetak.U,
            pocetak.d,
            pocetak.A,
            pocetak.er,
          ).Q),
      );
  });

  // geometrija kondenzatora (px)
  const KX = 196; // središte ploča
  const KYT = 62;
  let ploca = $derived.by(() => {
    if (cestica) return { x0: 0, x1: 0, w: 1, w0: 1, g: 0 };
    const w0 = 190;
    const w = ogranici(
      w0 * Math.sqrt((kond.A ?? pocetak.A) / pocetak.A),
      70,
      300,
    );
    const g = ogranici(64 * ((kond.d ?? pocetak.d) / pocetak.d), 22, 150);
    return { x0: KX - w / 2, x1: KX + w / 2, w, w0, g };
  });
  let KYB = $derived(KYT + ploca.g);
  let HK = $derived(Math.max(KYB + 58, 210));
  let brojNaboja = $derived(
    cestica
      ? 0
      : ogranici(Math.round(9 * (kond.sad.Q / kond.pocetno.Q)), 1, 28),
  );
  let dielektrik = $derived.by(() => {
    if (cestica) return null;
    if (nacin === "predvidi") {
      if (akcija.vrsta !== "dielektrik")
        return (spec.er ?? 1) > 1 ? { er: spec.er, naziv: "", ulaz: 0 } : null;
      return faza > 0
        ? {
            er: akcija.er,
            naziv: akcija.naziv ?? "",
            ulaz: 1 - glatko(Math.min(1, faza * 1.6)),
          }
        : null;
    }
    return v.er > 1 ? { er: v.er, naziv: "", ulaz: 0 } : null;
  });

  // ── predvidi ──
  let izbor = $state(
    untrack(() => Object.fromEntries((spec.pitaj ?? []).map((k) => [k, null]))),
  );
  let animira = $state(false);
  function animirajAkciju() {
    cancelAnimationFrame(raf);
    if (prefersReducedMotion.current) {
      faza = 1;
      return;
    }
    faza = 0;
    animira = true;
    const start = performance.now();
    const korak = (sad) => {
      faza = Math.min(1, (sad - start) / 1600);
      if (faza < 1) raf = requestAnimationFrame(korak);
      else animira = false;
    };
    raf = requestAnimationFrame(korak);
  }
  const SMJEROVI = [
    { k: "gore", t: "raste", z: "↑" },
    { k: "dolje", t: "pada", z: "↓" },
    { k: "isto", t: "isto", z: "=" },
  ];
  let prvaKriva = $derived(
    ishod && !ishod.tocno && !ishod.prazno && !promijenjeno
      ? ishod.velicina
      : null,
  );
  let popunjeno = $derived(Object.values(izbor).every((x) => x != null));

  function provjeri() {
    if (locked) return;
    if (nacin === "pogodi") {
      poslano = { ...oznaka };
      onodgovor({ ...oznaka });
    } else {
      poslano = { ...izbor };
      onodgovor({ ...izbor });
    }
  }

  // ── ispis veličina ──
  const fmtVel = {
    C: (x) => (x < 1e-9 ? `${tri(x * 1e12)} pF` : `${tri(x * 1e9)} nF`),
    Q: (x) => (x < 1e-6 ? `${tri(x * 1e9)} nC` : `${tri(x * 1e6)} µC`),
    U: (x) => `${tri(x)} V`,
    E: (x) => `${formatSci(x)} V/m`,
    W: (x) =>
      x < 1e-6
        ? `${tri(x * 1e9)} nJ`
        : x < 1e-3
          ? `${tri(x * 1e6)} µJ`
          : `${formatSci(x)} J`,
  };
  const faktor = (a, b) => {
    const r = b / a;
    if (Math.abs(r - 1) < 1e-9) return "isto";
    return r > 1 ? `× ${tri(r)}` : `: ${tri(1 / r)}`;
  };
  const prikaziKond = untrack(() => {
    const p = spec.prikazi ?? ["C", "Q", "U", "E", "Wel"];
    return ["C", "Q", "U", "E", "W"].filter((k) =>
      p.includes(k === "W" ? "Wel" : k),
    );
  });
  const imaD = untrack(() => spec.d != null);
  // površina i razmak se pišu samo ako su zadani (iz C se ne izmišljaju)
  const geometrija = untrack(() => spec.A != null && spec.d != null);
  let velicineKond = $derived(
    nacin === "predvidi"
      ? ["Q", "C", "U", "E", "W"].filter(
          (k) => k !== "E" || imaD || spec.pitaj.includes("E"),
        )
      : prikaziKond,
  );

  // očitanja čestice
  const prikaziCest = untrack(
    () =>
      spec.prikazi ??
      (vodoravno ? ["E", "a", "t", "y"] : ["E", "F", "a", "W", "v"]),
  );
  let ocitanjaCest = $derived.by(() => {
    if (!cestica) return [];
    const c = CESTICE[cestica.vrsta];
    const E = Epolje;
    const a = (Math.abs(c.q) * E) / c.m;
    const out = [];
    const ima = (k) => prikaziCest.includes(k);
    if (ima("E")) out.push(["E", `${formatSci(E)} V/m`]);
    if (ima("U")) out.push(["U", `${tri(v.U ?? E * v.d * 1e-3)} V`]);
    if (ima("F")) out.push(["F", `${formatSci(Math.abs(c.q) * E)} N`]);
    if (ima("a")) out.push(["a", `${formatSci(a)} m/s²`]);
    if (ubrz) {
      if (ima("W")) out.push(["W", `${formatSci(ubrz.W)} J`]);
      if (ima("v")) out.push(["v", `${formatSci(ubrz.v)} m/s`]);
      if (ima("t")) out.push(["t", `${formatSci(ubrz.t)} s`]);
    }
    if (put) {
      if (ima("t")) out.push(["t", `${formatSci(put.t)} s`]);
      if (ima("y"))
        out.push([
          put.izlaz ? "y" : "x",
          put.izlaz ? `${tri(put.y)} mm` : `${tri(put.x)} cm (udari)`,
        ]);
    }
    return out;
  });
  // istrazi: rezultat se vidi tek kad čestica stigne
  let vidiRezultat = $derived(nacin !== "istrazi" || tau >= 1);

  const nazivCestice = cestica ? CESTICE[cestica.vrsta].naziv : "";
  let opis = $derived(
    cestica
      ? `Dvije vodoravne ploče, gornja pozitivna, donja negativna, razmak ${formatNumber(v.d)} mm${spec.L ? `, duljina ${formatNumber(spec.L)} cm` : ""}; ${nazivCestice} ${vodoravno ? "ulijeće vodoravno sredinom" : "kreće iz mirovanja"}.`
      : `Pločasti kondenzator${imaIzvor ? `, izvor ${spojen ? "spojen" : "odspojen"}` : ""}; ${velicineKond.map((k) => `${k} = ${fmtVel[k](kond.sad[k])}`).join(", ")}.`,
  );
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="pp-tekst"><Md text={spec.tekst} /></div>
{/if}

{#snippet plusevi(x0, x1, y, n, minus)}
  {#each Array.from({ length: n }, (_, i) => i) as i (i)}
    <text
      class="pp-znak"
      class:minus
      x={f1(x0 + ((i + 0.5) * (x1 - x0)) / n)}
      y={f1(y)}
      text-anchor="middle">{minus ? "−" : "+"}</text
    >
  {/each}
{/snippet}

{#if cestica}
  <figure
    class="lx-figure pp"
    class:pp-ok={stanje === "ok"}
    class:pp-bad={stanje === "bad"}
  >
    <svg
      bind:this={svgEl}
      viewBox="0 0 {W} {HC}"
      role="img"
      aria-label={opis}
      class:pp-aktivno={aktivno}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
    >
      <!-- silnice: od + prema − -->
      {#each silnice as x, i (i)}
        <line
          class="pp-silnica"
          x1={f1(x)}
          y1={YT + 6}
          x2={f1(x)}
          y2={YB - 6}
        />
        <path
          class="pp-silnica-gl"
          d={strelica(x, YM - 12, x, YM + 2, 7, 0.6).glava}
        />
      {/each}
      <!-- ploče -->
      <rect
        class="pp-ploca plus"
        x={PL}
        y={YT - 9}
        width={PR - PL}
        height="9"
        rx="2"
      />
      <rect
        class="pp-ploca minus"
        x={PL}
        y={YB}
        width={PR - PL}
        height="9"
        rx="2"
      />
      {@render plusevi(PL, PR, YT - 13, 10, false)}
      {@render plusevi(PL, PR, YB + 23, 10, true)}
      <!-- razmak d -->
      {#if !vodoravno}
        <g class="pp-kota">
          <line x1={PR + 16} y1={YT} x2={PR + 16} y2={YB} />
          <line x1={PR + 11} y1={YT} x2={PR + 21} y2={YT} />
          <line x1={PR + 11} y1={YB} x2={PR + 21} y2={YB} />
          <text class="lx-label" x={PR + 24} y={f1(YM - 4)}>d =</text>
          <text class="lx-label" x={PR + 24} y={f1(YM + 12)}
            >{formatNumber(v.d)} mm</text
          >
        </g>
      {/if}
      {#if vodoravno}
        <line class="pp-os" x1={PL + ulaz} y1={f1(YM)} x2={W - 6} y2={f1(YM)} />
        <!-- ravnalo otklona na desnom rubu -->
        {#each ravnaloY as y (y)}
          <line
            class="pp-crtica"
            x1={PR}
            y1={f1(YM - y * pxPoMm)}
            x2={PR + (y === 0 ? 10 : 6)}
            y2={f1(YM - y * pxPoMm)}
          />
          <text
            class="lx-label pp-mala"
            x={PR + 13}
            y={f1(YM - y * pxPoMm + 3.5)}>{formatNumber(Math.abs(y))}</text
          >
        {/each}
        <text class="lx-label pp-mala" x={PR + 13} y={YT - 14}>y (mm)</text>
        <line class="pp-rub" x1={PR} y1={YT} x2={PR} y2={YB} />
        <!-- ravnalo duljine ispod donje ploče -->
        {#each ravnaloX as x (x)}
          <line
            class="pp-crtica"
            x1={f1(PL + (x / spec.L) * (PR - PL))}
            y1={YB + 26}
            x2={f1(PL + (x / spec.L) * (PR - PL))}
            y2={YB + 31}
          />
          <text
            class="lx-label pp-mala"
            x={f1(PL + (x / spec.L) * (PR - PL))}
            y={YB + 42}
            text-anchor="middle">{formatNumber(x)}</text
          >
        {/each}
        <text class="lx-label pp-mala" x={PR} y={YB + 52} text-anchor="end"
          >x (cm)</text
        >
        <text class="lx-label pp-mala" x={PL} y="14"
          >d = {formatNumber(v.d)} mm, L = {formatNumber(spec.L)} cm · okomito mjerilo
          je uvećano</text
        >
      {/if}

      <!-- putanja i čestica -->
      {#if vodoravno && tragDo > 0}
        <path
          class="pp-trag"
          d={putanjaPx}
          pathLength="1"
          stroke-dasharray="1"
          stroke-dashoffset={1 - Math.min(1, tragDo)}
        />
      {/if}
      {#each strob as y, i (i)}
        <circle class="pp-strob" cx={(PL + PR) / 2} cy={f1(y)} r="5" />
      {/each}
      {#if cesticaPx && (tau > 0 || nacin === "istrazi" || !vodoravno)}
        {@const [cx, cy] = cesticaPx}
        <g class="pp-cestica" class:minus={cestica.vrsta === "elektron"}>
          <circle cx={f1(cx)} cy={f1(cy)} r="8" />
          <text x={f1(cx)} y={f1(cy + 4)} text-anchor="middle"
            >{cestica.vrsta === "elektron" ? "−" : "+"}</text
          >
        </g>
        {#if !vodoravno}
          {@const dolje = CESTICE[cestica.vrsta].q > 0}
          {@const F = strelica(
            cx + 16,
            cy,
            cx + 16,
            cy + (dolje ? 26 : -26),
            8,
          )}
          <g class="pp-sila"
            ><path class="pp-v-lin" d={F.linija} /><path
              class="pp-v-gl"
              d={F.glava}
            /><text
              class="pp-v-ozn"
              x={f1(cx + 24)}
              y={f1(cy + (dolje ? 22 : -14))}>F</text
            ></g
          >
        {/if}
      {/if}
      {#if vodoravno && tau === 0 && nacin !== "pogodi"}
        <text class="lx-label pp-mala" x={PL + ulaz} y={f1(YM - 12)}
          >{nazivCestice}, v₀ →</text
        >
      {/if}
      {#if vodoravno && nacin === "pogodi" && tau === 0}
        <g class="pp-cestica" class:minus={cestica.vrsta === "elektron"}>
          <circle cx={PL + ulaz} cy={f1(YM)} r="8" />
          <text x={PL + ulaz} y={f1(YM + 4)} text-anchor="middle"
            >{cestica.vrsta === "elektron" ? "−" : "+"}</text
          >
        </g>
        {@const s = strelica(PL + ulaz + 10, YM, PL + ulaz + 34, YM, 7)}
        <g class="pp-brzina"
          ><path class="pp-v-lin" d={s.linija} /><path
            class="pp-v-gl"
            d={s.glava}
          /></g
        >
      {/if}

      <!-- oznaka (pogodi) -->
      {#if nacin === "pogodi"}
        {#if oznakaPx}
          {@const [ox, oy] = oznakaPx}
          <g
            class="pp-oznaka"
            role="slider"
            tabindex={locked ? -1 : 0}
            aria-label="Oznaka mjesta izlaska ili udara: pomiči strelicama"
            aria-valuenow={oznaka.gdje === "izlaz" ? oznaka.y : oznaka.x}
            aria-valuetext={opisOznake(oznaka)}
            onkeydown={keyOznaka}
          >
            <circle class="pp-oznaka-hit" cx={f1(ox)} cy={f1(oy)} r="20" />
            {#if oznaka.gdje === "izlaz"}
              <path
                class="pp-oznaka-oblik"
                d="M{f1(ox)},{f1(oy)} l14,-8 v16 Z"
              />
            {:else}
              <path
                class="pp-oznaka-oblik"
                d="M{f1(ox)},{f1(oy)} l-8,{oznaka.gdje === 'gore'
                  ? -14
                  : 14} h16 Z"
              />
            {/if}
            <circle class="pp-oznaka-tocka" cx={f1(ox)} cy={f1(oy)} r="3" />
          </g>
        {:else if !locked}
          <g
            class="pp-oznaka pp-duh"
            role="slider"
            tabindex="0"
            aria-label="Oznaka: pomakni strelicama ili povuci na rub"
            aria-valuenow="0"
            onkeydown={keyOznaka}
          >
            <path class="pp-oznaka-oblik" d="M{PR},{f1(YM)} l14,-8 v16 Z" />
            <text class="pp-uputa" x={PR - 6} y={f1(YM - 12)} text-anchor="end"
              >povuci oznaku</text
            >
          </g>
        {/if}
      {/if}
    </svg>
  </figure>

  {#if nacin === "pogodi"}
    <div class="pp-ocitanje">
      {#if oznaka}<b>{opisOznake(oznaka)}</b>{:else}Povuci oznaku na desni rub
        (izlaz) ili na ploču (udar).{/if}
    </div>
    {#if !locked}
      <div class="pp-fino">
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => pomakni(-1)}
          aria-label={oznaka?.gdje === "izlaz"
            ? "oznaka niže"
            : "oznaka prema ulazu"}
          >{oznaka && oznaka.gdje !== "izlaz" ? "←" : "▼"}</button
        >
        <span class="lx-hint">fino pomicanje</span>
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => pomakni(1)}
          aria-label={oznaka?.gdje === "izlaz"
            ? "oznaka više"
            : "oznaka prema izlazu"}
          >{oznaka && oznaka.gdje !== "izlaz" ? "→" : "▲"}</button
        >
      </div>
    {/if}
    {#if otkrij && put}
      <div class="pp-ocitanje">
        a = {formatSci(put.a)} m/s² · t = {formatSci(put.t)} s →
        <b
          >{put.izlaz
            ? `y = ${tri(put.y)} mm`
            : `udari na x = ${tri(put.x)} cm`}</b
        >
      </div>
    {/if}
  {:else}
    <div class="pp-plocice" aria-live="polite">
      {#each ocitanjaCest as [k, val] (k)}
        <div class="pp-plocica">
          <span class="pp-pl-ozn">{k}</span><span class="pp-pl-v"
            >{vidiRezultat || ["E", "F", "a", "U"].includes(k)
              ? val
              : "…"}</span
          >
        </div>
      {/each}
    </div>
  {/if}
{:else}
  <!-- kondenzator -->
  <figure class="lx-figure pp" class:pp-ok={stanje === "ok"}>
    <svg viewBox="0 0 {W} {HK}" role="img" aria-label={opis}>
      {#if imaIzvor}
        {@const yb = (KYT + KYB) / 2}
        <!-- strujni krug: gornja ploča – prekidač – izvor – donja ploča -->
        <path
          class="pp-zica"
          d="M{f1(ploca.x0 + 12)},{KYT - 9} V{KYT - 30} H100 M70,{KYT -
            30} H30 V{f1(yb - 9)}"
        />
        <path
          class="pp-zica"
          d="M30,{f1(yb + 9)} V{f1(KYB + 30)} H{f1(ploca.x0 + 12)} V{f1(
            KYB + 9,
          )}"
        />
        <line
          class="pp-baterija"
          x1="16"
          y1={f1(yb - 5)}
          x2="44"
          y2={f1(yb - 5)}
        />
        <line
          class="pp-baterija tanka"
          x1="23"
          y1={f1(yb + 5)}
          x2="37"
          y2={f1(yb + 5)}
        />
        <text class="lx-label pp-mala" x="48" y={f1(yb - 8)}>+</text>
        <text class="lx-label" x="48" y={f1(yb + 16)}
          >{formatNumber(pocetak.U)} V</text
        >
        <!-- prekidač na gornjoj žici -->
        {@const sx = 70}
        <circle class="pp-spoj" cx={sx} cy={KYT - 30} r="3" />
        <circle class="pp-spoj" cx={sx + 30} cy={KYT - 30} r="3" />
        <line
          class="pp-poluga"
          x1={sx}
          y1={KYT - 30}
          x2={sx + 30}
          y2={KYT - 30}
          transform={spojen ? "" : `rotate(-32 ${sx} ${KYT - 30})`}
        />
        <text
          class="lx-label pp-mala"
          x={sx + 15}
          y={KYT - 50}
          text-anchor="middle">{spojen ? "spojen" : "odspojen"}</text
        >
      {/if}
      <!-- dielektrik -->
      {#if dielektrik}
        <g transform="translate({f1(dielektrik.ulaz * (W - ploca.x0 + 10))} 0)">
          <rect
            class="pp-dielektrik"
            x={f1(ploca.x0)}
            y={KYT + 1}
            width={f1(ploca.w)}
            height={f1(ploca.g - 2)}
            rx="3"
          />
          <text
            class="lx-label pp-mala"
            x={f1(ploca.x1 - 6)}
            y={f1(KYB - 6)}
            text-anchor="end"
            >{dielektrik.naziv ? `${dielektrik.naziv}, ` : ""}εᵣ = {formatNumber(
              dielektrik.er,
            )}</text
          >
        </g>
      {/if}
      {#each silnice as x, i (i)}
        <line
          class="pp-silnica"
          x1={f1(x)}
          y1={KYT + 4}
          x2={f1(x)}
          y2={f1(KYB - 4)}
        />
        {#if ploca.g > 30}<path
            class="pp-silnica-gl"
            d={strelica(x, (KYT + KYB) / 2 - 8, x, (KYT + KYB) / 2 + 3, 6, 0.6)
              .glava}
          />{/if}
      {/each}
      <rect
        class="pp-ploca plus"
        x={f1(ploca.x0)}
        y={KYT - 9}
        width={f1(ploca.w)}
        height="9"
        rx="2"
      />
      <rect
        class="pp-ploca minus"
        x={f1(ploca.x0)}
        y={f1(KYB)}
        width={f1(ploca.w)}
        height="9"
        rx="2"
      />
      {@render plusevi(ploca.x0, ploca.x1, KYT - 13, brojNaboja, false)}
      {@render plusevi(ploca.x0, ploca.x1, KYB + 23, brojNaboja, true)}
      {#if geometrija}
        <text class="lx-label" x={KX} y={f1(KYB + 44)} text-anchor="middle"
          >S = {tri(kond.A)} cm², d = {tri(kond.d)} mm</text
        >
      {:else if akcija?.vrsta === "razmakni" && faza > 0}
        <text class="lx-label" x={KX} y={f1(KYB + 44)} text-anchor="middle"
          >razmak × {formatNumber(akcija.faktor)}</text
        >
      {/if}
    </svg>
  </figure>

  {#if nacin === "istrazi"}
    <div class="pp-plocice" aria-live="polite">
      {#each velicineKond as k (k)}
        <div class="pp-plocica">
          <span class="pp-pl-ozn">{k}</span><span class="pp-pl-v"
            >{fmtVel[k](kond.sad[k])}</span
          >{#if Math.abs(kond.sad[k] / kond.pocetno[k] - 1) > 1e-6}<span
              class="pp-pl-f">{faktor(kond.pocetno[k], kond.sad[k])}</span
            >{/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="pp-predvidi">
      {#each spec.pitaj as k (k)}
        {@const ok = otkrij}
        <div class="pp-pred-red" class:ok class:bad={prvaKriva === k}>
          <div class="pp-pred-ime">
            <span>{NAZIV_VELICINE[k]}</span>
            <span class="pp-sivo"
              >{faza > 0
                ? `${fmtVel[k](promjena.prije[k])} → ${fmtVel[k](kond.sad[k])}`
                : imaD || k !== "E"
                  ? fmtVel[k](promjena.prije[k])
                  : ""}{faza >= 1
                ? ` (${faktor(promjena.prije[k], promjena.poslije[k])})`
                : ""}</span
            >
          </div>
          <div class="seg" role="group" aria-label={NAZIV_VELICINE[k]}>
            {#each SMJEROVI as s (s.k)}
              <button
                type="button"
                class="seg-item"
                class:active={izbor[k] === s.k}
                aria-pressed={izbor[k] === s.k}
                disabled={locked}
                onclick={() => (izbor[k] = s.k)}
                ><span aria-hidden="true">{s.z}</span> {s.t}</button
              >
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<!-- kontrole -->
{#if klizaci.length}
  <div class="pp-kontrole">
    {#each klizaci as k (k)}
      {@const r = RASPON[k]}
      {#if r}
        <label class="pp-red">
          <span class="pp-red-ime">{NAZIV_KL[k]}</span>
          <input
            type="range"
            min={r.min}
            max={r.max}
            step={r.korak}
            bind:value={v[k]}
            aria-label={NAZIV_KL[k]}
          />
          <output class="pp-red-v">{fmtKl(k, v[k])}</output>
        </label>
      {/if}
    {/each}
  </div>
{/if}

<div class="lx-actions">
  {#if nacin === "istrazi" && cestica}
    <button
      type="button"
      class="btn btn-primary"
      onclick={pusti}
      disabled={leti}
      >{tau > 0 && !leti ? "Pusti ponovo" : "Pusti"} {nazivCestice}</button
    >
  {/if}
  {#if nacin === "istrazi" && !cestica && imaIzvor}
    <button type="button" class="btn btn-primary" onclick={prekidac}
      >{spojen ? "Odspoji izvor" : "Spoji izvor"}</button
    >
    <span class="lx-hint"
      >{spojen
        ? "Spojen: izvor drži napon stalnim."
        : "Odspojen: naboj nema kamo, ostaje isti."}</span
    >
  {/if}
  {#if pitanje}
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || (nacin === "pogodi" ? !oznaka : !popunjeno)}
      >Provjeri</button
    >
    {#if otkrij && !leti && !animira}
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() => (nacin === "pogodi" ? pusti() : animirajAkciju())}
        >{nacin === "pogodi" ? "Ispali ponovo" : "Ponovi"}</button
      >
    {/if}
    {#if nacin === "pogodi" && !otkrij}<span class="lx-hint pp-uputa-dolje"
        >Izračunaj otklon, povuci oznaku na to mjesto i provjeri. Nakon točnog
        odgovora {nazivCestice} proleti.</span
      >{/if}
    {#if nacin === "predvidi" && !otkrij}<span class="lx-hint pp-uputa-dolje"
        >Za svaku veličinu odaberi raste, pada ili isto. Nakon točnog odgovora
        vidjet ćeš promjenu.</span
      >{/if}
  {/if}
</div>

<style>
  .pp,
  .pp-plocice,
  .pp-predvidi {
    --np-plus: #f87171;
    --np-minus: #60a5fa;
  }
  :global(html[data-theme="light"]) :is(.pp, .pp-plocice, .pp-predvidi) {
    --np-plus: #dc2626;
    --np-minus: #2563eb;
  }
  .pp-tekst {
    margin-bottom: 12px;
  }
  .pp {
    max-width: 480px;
    margin-bottom: 6px;
  }
  .pp svg.pp-aktivno {
    touch-action: none;
    cursor: crosshair;
  }
  .pp-ploca.plus {
    fill: color-mix(in srgb, var(--np-plus) 55%, var(--bg-elev));
  }
  .pp-ploca.minus {
    fill: color-mix(in srgb, var(--np-minus) 55%, var(--bg-elev));
  }
  .pp-znak {
    font: 700 12px var(--font-sans);
    fill: var(--np-plus);
  }
  .pp-znak.minus {
    fill: var(--np-minus);
  }
  .pp-silnica {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .pp-silnica-gl {
    fill: var(--text-faint);
  }
  .pp-kota line {
    stroke: var(--text-faint);
  }
  .pp-os {
    stroke: var(--text-faint);
    stroke-dasharray: 4 4;
  }
  .pp-rub {
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .pp-crtica {
    stroke: var(--text-dim);
  }
  .pp-mala {
    font-size: 10.5px;
  }
  .pp-trag {
    fill: none;
    stroke: var(--lx-turn);
    stroke-width: 2;
  }
  .pp-strob {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.2;
  }
  .pp-cestica circle {
    fill: color-mix(in srgb, var(--np-plus) 35%, var(--bg-elev));
    stroke: var(--np-plus);
    stroke-width: 2;
  }
  .pp-cestica.minus circle {
    fill: color-mix(in srgb, var(--np-minus) 35%, var(--bg-elev));
    stroke: var(--np-minus);
  }
  .pp-cestica text {
    font: 700 12px var(--font-sans);
    fill: var(--text);
  }
  .pp-v-lin {
    fill: none;
    stroke-width: 2.4;
  }
  .pp-sila .pp-v-lin {
    stroke: var(--warn);
  }
  .pp-sila .pp-v-gl,
  .pp-sila .pp-v-ozn {
    fill: var(--warn);
  }
  .pp-v-ozn {
    font: 600 12px var(--font-sans);
  }
  .pp-brzina .pp-v-lin {
    stroke: var(--text);
  }
  .pp-brzina .pp-v-gl {
    fill: var(--text);
  }
  .pp-oznaka-hit {
    fill: transparent;
  }
  .pp-oznaka-oblik {
    fill: var(--lx-turn);
  }
  .pp-oznaka-tocka {
    fill: var(--bg-elev);
    stroke: var(--lx-turn);
    stroke-width: 2;
  }
  .pp.pp-ok .pp-oznaka-oblik {
    fill: var(--success);
  }
  .pp.pp-bad .pp-oznaka-oblik {
    fill: var(--danger);
  }
  .pp-oznaka:focus-visible {
    outline: none;
  }
  .pp-oznaka:focus-visible .pp-oznaka-oblik {
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .pp-duh .pp-oznaka-oblik {
    opacity: 0.45;
  }
  .pp-uputa {
    fill: var(--lx-turn);
    font-size: 11.5px;
  }
  .pp-zica {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .pp-baterija {
    stroke: var(--text);
    stroke-width: 3;
  }
  .pp-baterija.tanka {
    stroke-width: 6;
  }
  .pp-spoj {
    fill: var(--text-dim);
  }
  .pp-poluga {
    stroke: var(--text);
    stroke-width: 2.4;
    stroke-linecap: round;
    transition: transform 0.25s;
  }
  .pp-dielektrik {
    fill: color-mix(in srgb, var(--warn) 22%, transparent);
    stroke: color-mix(in srgb, var(--warn) 60%, transparent);
  }
  .pp-ocitanje {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 8px;
  }
  .pp-ocitanje b {
    color: var(--text);
  }
  .pp-fino {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .pp-fino .btn {
    min-width: 44px;
    min-height: 40px;
    font-size: 15px;
  }
  .pp-fino .lx-hint {
    margin: 0;
  }
  .pp-plocice {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 2px 0 8px;
  }
  .pp-plocica {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .pp-pl-ozn {
    font-weight: 600;
    color: var(--text-dim);
  }
  .pp-pl-f {
    font-size: 11.5px;
    color: var(--lx-turn);
  }
  .pp-predvidi {
    display: grid;
    gap: 8px;
  }
  .pp-pred-red {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .pp-pred-red.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 10%, transparent);
  }
  .pp-pred-red.bad {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, transparent);
  }
  .pp-pred-ime {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .pp-sivo {
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .pp-pred-red .seg-item {
    font-size: 13px;
    padding: 7px 11px;
    border: 0;
    background: transparent;
  }
  .pp-pred-red .seg-item.active {
    background: var(--primary-dim);
    color: var(--text);
    box-shadow: 0 0 0 1px var(--primary-border);
  }
  .pp-pred-red .seg-item:disabled {
    cursor: default;
  }
  .pp-kontrole {
    display: grid;
    gap: 6px;
    max-width: 440px;
    margin: 4px auto 0;
  }
  .pp-red {
    display: grid;
    grid-template-columns: 96px 1fr 96px;
    align-items: center;
    gap: 10px;
  }
  .pp-red-ime {
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .pp-red input[type="range"] {
    width: 100%;
    height: 28px;
    margin: 0;
    accent-color: var(--primary);
  }
  .pp-red-v {
    font-family: var(--font-mono);
    font-size: 13px;
    text-align: right;
    white-space: nowrap;
  }
  .pp-uputa-dolje {
    margin-top: 0;
  }
  @media (max-width: 420px) {
    .pp-red {
      grid-template-columns: 1fr 96px;
    }
    .pp-red input[type="range"] {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
</style>
