<script>
  // p–V (V–T, p–T) dijagram idealnog plina. Sva fizika (krivulje, stanje nakon procesa, W, ΔU, Q, znakovi) dolazi iz
  // katalog/fizika/plinski_dijagram.js, pa crtež i provjera uvijek kažu isto. Ovdje su samo crtanje i povlačenje.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    osiOd,
    jediniceOd,
    konstanta,
    punaStanja,
    stanjeOd,
    koordinate,
    izTocke,
    izK,
    uK,
    uzorci,
    dionica,
    znakoviDionica,
    stanjeNakon,
    vodilica,
    crteMreze,
    energijaFaktor,
    zadaneVrste,
    velicineOd,
    trecaVelicina,
    VELICINA_TXT,
    ZNAK_TXT,
    KRATKO_VRSTE,
    ZNAKOVI,
  } from "$lib/lesson/katalog/fizika/plinski_dijagram.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = $derived(spec.nacin);
  const pitanje = $derived(nacin !== "istrazi");
  const osi = $derived(osiOd(spec));
  const jed = $derived(jediniceOd(spec));
  const poznato = $derived(konstanta(spec).poznato);
  const E = $derived(energijaFaktor(spec));
  const stanja = $derived(punaStanja(spec));
  const pV = $derived(osi.x === "V");

  // ── geometrija ──
  const W = 360;
  const L = 50;
  const Rr = 16;
  const T = 26;
  const B = 42;
  const H = 300;
  const x0 = $derived(spec[osi.x][0]);
  const x1 = $derived(spec[osi.x][1]);
  const y0 = $derived(spec[osi.y][0]);
  const y1 = $derived(spec[osi.y][1]);
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - Rr);
  const Y = (y) => H - B - ((y - y0) / (y1 - y0)) * (H - T - B);
  const r1 = (n) => Math.round(n * 10) / 10;
  const P = (t) => [r1(X(t.x)), r1(Y(t.y))];
  const tk = (st) => koordinate(spec, st);
  const pts = (arr) => arr.map((st) => P(tk(st)).join(",")).join(" ");

  const crteX = $derived(crteMreze(spec, osi.x));
  const crteY = $derived(crteMreze(spec, osi.y));
  // brojevi na svakoj m-toj crti, m iz „lijepih“ višekratnika (0,1 · 0,2 …, a ne 0,15 · 0,3)
  const svaka = (n, max) =>
    [1, 2, 4, 5, 10, 20, 25, 50].find((m) => Math.ceil(n / m) <= max) ?? 100;
  const svakaX = $derived(svaka(crteX.length, 8));
  const svakaY = $derived(svaka(crteY.length, 10));
  const oznakaOsi = (q) => `${q} (${q === "T" ? jed.T : jed[q]})`;

  // ── očitanja ──
  function vrijednost(st, q) {
    if (q === "T") return izK(spec, st.T);
    if (q === "pV") return st.p * st.V * E;
    if (q === "U") return 1.5 * st.p * st.V * E;
    return st[q];
  }
  const fmtOs = (v) => formatNumber(Number(v.toPrecision(4)), 2);
  function txt(q, v) {
    if (v == null || !Number.isFinite(v)) return "—";
    if (["pV", "U", "W", "Q"].includes(q))
      return `${formatNumber(Number(v.toPrecision(3)), 0)}\u00a0J`;
    return `${fmtOs(v)}\u00a0${q === "T" ? jed.T : jed[q]}`;
  }
  const SIMB = { p: "p", V: "V", T: "T", pV: "pV", U: "U", W: "W", Q: "Q" };

  const prikazi = $derived.by(() => {
    if (spec.prikazi) return spec.prikazi;
    if (nacin === "istrazi")
      return pV
        ? [...(poznato ? ["T"] : []), "U", "W"]
        : poznato
          ? [trecaVelicina(spec)]
          : [];
    if (nacin === "postavi" && Object.keys(spec.cilj ?? {})[0] === "T" && pV)
      return ["T"];
    return [];
  });
  const ocitanja = $derived([
    osi.x,
    osi.y,
    ...prikazi.filter((q) => q !== osi.x && q !== osi.y),
  ]);

  // ── istrazi: put iz procesa ──
  const procesi = $derived(
    (spec.procesi ?? []).map((pr) => {
      const a = stanjeOd(spec, pr.od);
      const b = stanjeOd(spec, pr.do);
      return { ...pr, a, b, u: uzorci(spec, a, b, pr.vrsta, 90) };
    }),
  );
  const slobodno = $derived(nacin === "istrazi" && !!spec.slobodno);

  // položaj na putu: dionica i indeks uzorka
  let polozaj = $state({ i: 0, j: 0 });
  // slobodno: dovršene dionice i trenutna
  let vrsta = $state(untrack(() => (spec.vrste ?? zadaneVrste(spec))[0]));
  let dionice = $state([]);
  let sidro = $state(untrack(() => punaStanja(spec)[0]));
  let trenutna = $state(null); // {a, b, vrsta} dok se vuče

  // ── postavi ──
  const pocetak = $derived(
    nacin === "postavi" ? stanjeOd(spec, spec.pocetak) : null,
  );
  const tocnoStanje = $derived(nacin === "postavi" ? stanjeNakon(spec) : null);
  let tocka = $state(
    untrack(() =>
      spec.nacin === "postavi"
        ? koordinate(spec, stanjeOd(spec, spec.pocetak))
        : null,
    ),
  );
  let poslanaTocka = $state(null);

  // ── put ──
  let putTocke = $state(
    untrack(() =>
      spec.nacin === "put" ? [koordinate(spec, punaStanja(spec)[0])] : [],
    ),
  );
  let putVrste = $state([]);
  let nacrt = $state(null); // {x, y} kraj dionice koja se slaže

  // ── dionice ──
  const vel = $derived(velicineOd(spec));
  const tocniZnakovi = $derived(
    nacin === "dionice" ? znakoviDionica(spec) : [],
  );
  let znakovi = $state(
    untrack(() =>
      spec.nacin === "dionice" ? (spec.procesi ?? []).map(() => ({})) : [],
    ),
  );
  let poslaniZnakovi = $state(null);
  let aktivna = $state(-1);

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "postavi") tocka = tk(tocnoStanje);
      if (nacin === "put") {
        putTocke = [
          ...spec.stanja,
          ...(spec.zatvoren ? [spec.stanja[0]] : []),
        ].map((t) => tk(stanjeOd(spec, t.oznaka)));
        putVrste = spec.procesi.map((pr) => pr.vrsta);
        nacrt = null;
      }
      if (nacin === "dionice")
        znakovi = tocniZnakovi.map((d) =>
          Object.fromEntries(vel.map((v) => [v, d[v]])),
        );
    });
  });

  const gotovo = $derived(pokazi || !!ishod?.tocno);

  // ── trenutno stanje (ručka) i nakupljeni rad ──
  const ruckaStanje = $derived.by(() => {
    if (nacin === "postavi") return izTocke(spec, tocka.x, tocka.y);
    if (nacin === "put") {
      const t = nacrt ?? putTocke.at(-1);
      return izTocke(spec, t.x, t.y);
    }
    if (nacin === "istrazi") {
      if (slobodno) return trenutna?.b ?? sidro;
      return procesi[polozaj.i]?.u[polozaj.j] ?? stanja[0];
    }
    return null;
  });
  // prijeđene dionice do ručke: [{a, b, vrsta, u}]
  const prijedeno = $derived.by(() => {
    if (nacin !== "istrazi") return [];
    if (slobodno)
      return [...dionice, ...(trenutna ? [trenutna] : [])].map((d) => ({
        ...d,
        u: uzorci(spec, d.a, d.b, d.vrsta, 60),
      }));
    const out = [];
    for (let i = 0; i <= polozaj.i && i < procesi.length; i++) {
      const pr = procesi[i];
      if (i < polozaj.i) out.push(pr);
      else if (polozaj.j > 0)
        out.push({
          ...pr,
          b: pr.u[polozaj.j],
          u: pr.u.slice(0, polozaj.j + 1),
        });
    }
    return out;
  });
  const zbroj = $derived(
    prijedeno.reduce(
      (acc, d) => {
        const r = dionica(spec, d.a, d.b, d.vrsta);
        return { W: acc.W + r.W, Q: acc.Q + r.Q };
      },
      { W: 0, Q: 0 },
    ),
  );
  const ocitaj = (q) =>
    q === "W" ? zbroj.W : q === "Q" ? zbroj.Q : vrijednost(ruckaStanje, q);

  // ── povlačenje ──
  let svgEl = $state();
  let vucem = $state(false);
  const aktivno = $derived(!locked && !gotovo && nacin !== "dionice");

  function podatak(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { px: p.x, py: p.y };
  }
  const najbliza = (lista, px, py) => {
    let best = null;
    let d = Infinity;
    lista.forEach((t, i) => {
      const dd = (X(t.x) - px) ** 2 + (Y(t.y) - py) ** 2;
      if (dd < d) [d, best] = [dd, i];
    });
    return best;
  };
  const naMrezu = (v, q, r) => {
    const k = spec.korak[q];
    const s = Number((Math.round(v / k) * k).toPrecision(12));
    return Math.min(r[1], Math.max(r[0], s));
  };
  const invX = (px) => x0 + ((px - L) / (W - L - Rr)) * (x1 - x0);
  const invY = (py) => y0 + ((H - B - py) / (H - T - B)) * (y1 - y0);
  function slobodnaTocka(px, py) {
    return {
      x: naMrezu(invX(px), osi.x, spec[osi.x]),
      y: naMrezu(invY(py), osi.y, spec[osi.y]),
    };
  }

  // vodilice ovise o polazištu, pa se računaju kad se ono promijeni
  const postaviVod = $derived(
    nacin === "postavi" && spec.vodilica
      ? vodilica(spec, pocetak, spec.proces)
      : null,
  );
  const putPolaziste = $derived(
    nacin === "put"
      ? izTocke(spec, putTocke.at(-1).x, putTocke.at(-1).y)
      : null,
  );
  const putVod = $derived(
    nacin === "put" && vrsta !== "ravno"
      ? vodilica(spec, putPolaziste, vrsta)
      : null,
  );
  const slobodnoVod = $derived(slobodno ? vodilica(spec, sidro, vrsta) : null);

  function pomakni(px, py) {
    if (nacin === "postavi") {
      if (postaviVod) {
        const i = najbliza(postaviVod.kandidati, px, py);
        if (i != null)
          tocka = {
            x: postaviVod.kandidati[i].x,
            y: postaviVod.kandidati[i].y,
          };
      } else tocka = slobodnaTocka(px, py);
    } else if (nacin === "put") {
      if (putVod) {
        const i = najbliza(putVod.kandidati, px, py);
        if (i != null)
          nacrt = { x: putVod.kandidati[i].x, y: putVod.kandidati[i].y };
      } else nacrt = slobodnaTocka(px, py);
    } else if (slobodno) {
      const i = najbliza(slobodnoVod.linija, px, py);
      if (i != null)
        trenutna = { a: sidro, b: slobodnoVod.linija[i].st, vrsta };
    } else {
      // najbliži uzorak na cijelom putu
      let best = { i: 0, j: 0 };
      let d = Infinity;
      procesi.forEach((pr, i) =>
        pr.u.forEach((st, j) => {
          const [x, y] = P(tk(st));
          const dd = (x - px) ** 2 + (y - py) ** 2;
          if (dd < d) [d, best] = [dd, { i, j }];
        }),
      );
      polozaj = best;
    }
  }
  function dolje(e) {
    if (!aktivno) return;
    const p = podatak(e);
    if (!p) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vucem = true;
    pomakni(p.px, p.py);
  }
  function mic(e) {
    if (!vucem || !aktivno) return;
    const p = podatak(e);
    if (p) pomakni(p.px, p.py);
  }
  function gore() {
    if (!vucem) return;
    vucem = false;
    zavrsiSlobodno();
  }
  // dodir podloge (bez povlačenja) premjesti ručku, a stranica se i dalje može pomicati prstom
  function klikPodloge(e) {
    if (!aktivno || vucem) return;
    const p = podatak(e);
    if (!p) return;
    pomakni(p.px, p.py);
    zavrsiSlobodno();
  }
  function zavrsiSlobodno() {
    if (!slobodno || !trenutna) return;
    const { a, b } = trenutna;
    if (Math.abs(a.p - b.p) + Math.abs(a.V - b.V) > 1e-9) {
      dionice = [...dionice, trenutna].slice(-12);
      sidro = b;
    }
    trenutna = null;
  }
  function tipka(e) {
    if (!aktivno) return;
    const smjer = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[
      e.key
    ];
    if (!smjer) return;
    e.preventDefault();
    const okomito = e.key === "ArrowUp" || e.key === "ArrowDown";
    const korakTipke = (lista, trenutni) => {
      let i = najbliza(lista, X(trenutni.x), Y(trenutni.y)) ?? 0;
      i = Math.min(lista.length - 1, Math.max(0, i + smjer));
      return lista[i];
    };
    if (nacin === "postavi" || nacin === "put") {
      const vod = nacin === "postavi" ? postaviVod : putVod;
      const sada = nacin === "postavi" ? tocka : (nacrt ?? putTocke.at(-1));
      let nova;
      if (vod) nova = korakTipke(vod.kandidati, sada);
      else
        nova = okomito
          ? {
              x: sada.x,
              y: naMrezu(
                sada.y + smjer * spec.korak[osi.y],
                osi.y,
                spec[osi.y],
              ),
            }
          : {
              x: naMrezu(
                sada.x + smjer * spec.korak[osi.x],
                osi.x,
                spec[osi.x],
              ),
              y: sada.y,
            };
      if (nacin === "postavi") tocka = { x: nova.x, y: nova.y };
      else nacrt = { x: nova.x, y: nova.y };
    } else if (slobodno) {
      const lista = slobodnoVod.linija;
      const t = korakTipke(lista, tk(trenutna?.b ?? sidro));
      trenutna = { a: sidro, b: t.st, vrsta };
      zavrsiSlobodno();
    } else {
      let { i, j } = polozaj;
      j += smjer * 3;
      if (j > procesi[i].u.length - 1)
        [i, j] =
          i < procesi.length - 1 ? [i + 1, 3] : [i, procesi[i].u.length - 1];
      if (j < 0) [i, j] = i > 0 ? [i - 1, procesi[i - 1].u.length - 4] : [0, 0];
      polozaj = { i, j };
    }
  }

  function ispocetka() {
    polozaj = { i: 0, j: 0 };
    dionice = [];
    trenutna = null;
    sidro = stanja[0];
  }

  // ── put: dodavanje i brisanje dionica ──
  const nacrtPomaknut = $derived(
    !!nacrt &&
      (Math.abs(nacrt.x - putTocke.at(-1).x) > 1e-9 ||
        Math.abs(nacrt.y - putTocke.at(-1).y) > 1e-9),
  );
  const ponudjeneVrste = $derived(spec.vrste ?? zadaneVrste(spec));
  function dodajDionicu() {
    if (!nacrtPomaknut || locked) return;
    putTocke = [...putTocke, nacrt];
    putVrste = [...putVrste, vrsta];
    nacrt = null;
  }
  function ponisti() {
    if (locked) return;
    if (nacrtPomaknut) nacrt = null;
    else if (putVrste.length) {
      putTocke = putTocke.slice(0, -1);
      putVrste = putVrste.slice(0, -1);
    }
  }
  function biraj(v) {
    if (locked && nacin === "put") return;
    vrsta = v;
    nacrt = null;
  }
  const putOdgovor = () => {
    const t = nacrtPomaknut ? [...putTocke, nacrt] : putTocke;
    const v = nacrtPomaknut ? [...putVrste, vrsta] : putVrste;
    return {
      tocke: t.map((p) => ({ [osi.x]: p.x, [osi.y]: p.y })),
      vrste: [...v],
    };
  };
  const putDionice = $derived.by(() => {
    if (nacin !== "put") return [];
    const out = putTocke.slice(1).map((t, i) => {
      const a = izTocke(spec, putTocke[i].x, putTocke[i].y);
      const b = izTocke(spec, t.x, t.y);
      return {
        a,
        b,
        vrsta: putVrste[i],
        u: uzorci(spec, a, b, putVrste[i], 60),
      };
    });
    if (nacrtPomaknut) {
      const a = izTocke(spec, putTocke.at(-1).x, putTocke.at(-1).y);
      const b = izTocke(spec, nacrt.x, nacrt.y);
      out.push({ a, b, vrsta, u: uzorci(spec, a, b, vrsta, 60), nacrt: true });
    }
    return out;
  });
  const zatvara = $derived(
    nacin === "put" &&
      spec.zatvoren &&
      nacrtPomaknut &&
      putTocke.length > 1 &&
      Math.abs(nacrt.x - putTocke[0].x) < 1e-9 &&
      Math.abs(nacrt.y - putTocke[0].y) < 1e-9,
  );

  // ── provjera ──
  function provjeri() {
    if (locked) return;
    if (nacin === "postavi") {
      poslanaTocka = { ...tocka };
      onodgovor({ [osi.x]: tocka.x, [osi.y]: tocka.y });
    } else if (nacin === "put") {
      if (nacrtPomaknut) dodajDionicu();
      onodgovor(putOdgovor());
    } else if (nacin === "dionice") {
      poslaniZnakovi = znakovi.map((z) => ({ ...z }));
      onodgovor(znakovi.map((z) => ({ ...z })));
    }
  }
  const postaviNeprom = $derived(
    poslanaTocka && poslanaTocka.x === tocka?.x && poslanaTocka.y === tocka?.y,
  );
  const statusTocke = $derived(
    pokazi
      ? "ok"
      : ishod && postaviNeprom && !ishod.prazno
        ? ishod.tocno
          ? "ok"
          : "bad"
        : "",
  );
  const dioniceNeprom = $derived(
    poslaniZnakovi != null &&
      poslaniZnakovi.every((z, i) => vel.every((v) => z[v] === znakovi[i][v])),
  );
  const sviZnakovi = $derived(
    znakovi.every((z) => vel.every((v) => ZNAKOVI.includes(z[v]))),
  );

  // ── crtanje: krivulje, površine, strelice, izoterme ──
  // dionice koje se crtaju punom crtom
  const crtaneDionice = $derived.by(() => {
    if (nacin === "istrazi") return slobodno ? prijedeno : procesi;
    if (nacin === "dionice") return procesi;
    if (nacin === "put") return putDionice;
    if (nacin === "postavi" && gotovo)
      return [
        {
          a: pocetak,
          b: tocnoStanje,
          vrsta: spec.proces,
          u: uzorci(spec, pocetak, tocnoStanje, spec.proces, 60),
        },
      ];
    return [];
  });
  const povrsine = $derived.by(() => {
    if (!pV || !spec.povrsina) return [];
    const izvor =
      nacin === "istrazi"
        ? prijedeno
        : nacin === "dionice" && gotovo
          ? procesi
          : nacin === "postavi" && gotovo
            ? crtaneDionice
            : nacin === "put"
              ? putDionice
              : [];
    return izvor
      .filter(
        (d) =>
          d.vrsta !== "izohorno" &&
          d.u.length > 1 &&
          Math.abs(d.u.at(-1).V - d.u[0].V) > 1e-12,
      )
      .map((d) => {
        const prvi = tk(d.u[0]);
        const zadnji = tk(d.u.at(-1));
        return {
          d: `M${pts(d.u).replaceAll(" ", " L")} L${r1(X(zadnji.x))},${r1(Y(y0))} L${r1(X(prvi.x))},${r1(Y(y0))} Z`,
          plus: zadnji.x > prvi.x,
        };
      });
  });
  function strelica(u) {
    if (u.length < 3) return null;
    const m = Math.floor(u.length / 2);
    const [ax, ay] = P(tk(u[m - 1]));
    const [bx, by] = P(tk(u[m + 1]));
    const [cx, cy] = P(tk(u[m]));
    const d = Math.hypot(bx - ax, by - ay);
    if (d < 0.5) return null;
    const [ux, uy] = [(bx - ax) / d, (by - ay) / d];
    const s = 6;
    return `${r1(cx + ux * s)},${r1(cy + uy * s)} ${r1(cx - ux * s - uy * s * 0.8)},${r1(cy - uy * s + ux * s * 0.8)} ${r1(cx - ux * s + uy * s * 0.8)},${r1(cy - uy * s - ux * s * 0.8)}`;
  }
  // produžetak pravca do apsolutne nule: izobara na V–T, izohora na p–T
  const doNule = $derived.by(() => {
    if (pV) return [];
    const kroz = osi.y === "V" ? "izobarno" : "izohorno";
    const lista =
      nacin === "postavi"
        ? gotovo || spec.vodilica
          ? [{ a: pocetak, vrsta: spec.proces }]
          : []
        : nacin === "put"
          ? putDionice
          : crtaneDionice;
    const xn = izK(spec, 0);
    if (xn < x0 - 1e-9) return [];
    return lista
      .filter((d) => d.vrsta === kroz)
      .map((d) => {
        const k = tk(d.a);
        return `${r1(X(xn))},${r1(Y(0))} ${r1(X(k.x))},${r1(Y(k.y))}`;
      });
  });
  const apsNula = $derived(
    !pV && jed.T === "°C" && izK(spec, 0) >= x0 ? X(izK(spec, 0)) : null,
  );

  // izoterme kroz stanja (p–V); oznaka na desnom rubu ili na vrhu
  function izotermaLinija(C) {
    const out = [];
    for (let i = 0; i <= 120; i++) {
      const V = x0 + ((x1 - x0) * i) / 120;
      if (V <= 0) continue;
      const p = C / V;
      if (p > y1 * 1.02) continue;
      out.push(`${r1(X(V))},${r1(Y(Math.max(y0, p)))}`);
    }
    return out.join(" ");
  }
  function izotermaOznaka(C) {
    const p = C / x1;
    if (p >= y0 && p <= y1) return { x: X(x1) - 2, y: Y(p) - 5, anchor: "end" };
    return { x: X(C / y1) + 4, y: Y(y1) + 11, anchor: "start" };
  }
  const izoterme = $derived.by(() => {
    if (!pV || !spec.izoterme) return [];
    const vidjeno = [];
    const out = [];
    for (const st of stanja) {
      const C = st.p * st.V;
      if (vidjeno.some((c) => Math.abs(c - C) < 1e-6 * C)) continue;
      vidjeno.push(C);
      out.push({
        C,
        linija: izotermaLinija(C),
        oznaka: izotermaOznaka(C),
        tekst: poznato
          ? `${formatNumber(Math.round(st.T))} K`
          : `T${st.oznaka.length === 1 ? sub(st.oznaka) : `(${st.oznaka})`}`,
      });
    }
    return out;
  });
  const SUB = {
    0: "₀",
    1: "₁",
    2: "₂",
    3: "₃",
    4: "₄",
    5: "₅",
    6: "₆",
    7: "₇",
    8: "₈",
    9: "₉",
  };
  const sub = (o) => [...String(o)].map((c) => SUB[c] ?? c).join("");
  // živa izoterma kroz ručku (istraživanje): pokazuje da je dalje od ishodišta toplije
  const zivaIzoterma = $derived(
    pV && spec.izoterme && nacin === "istrazi" && ruckaStanje
      ? izotermaLinija(ruckaStanje.p * ruckaStanje.V)
      : "",
  );

  // vodilica koja se crta (isprekidano)
  const vodilicaLinija = $derived.by(() => {
    if (nacin === "postavi" && postaviVod && !gotovo) return postaviVod.linija;
    if (nacin === "put" && putVod && !gotovo && !locked) return putVod.linija;
    if (slobodno) return slobodnoVod.linija;
    return null;
  });
  // zadana krajnja vrijednost u postavi: isprekidana crta s oznakom
  const ciljCrta = $derived.by(() => {
    if (nacin !== "postavi") return null;
    const [q, v] = Object.entries(spec.cilj)[0];
    const lbl = `${q} = ${txt(q, v)}`;
    if (q === osi.x)
      return {
        d: `M${r1(X(v))},${r1(Y(y0))} V${r1(Y(y1))}`,
        x: X(v) + 4,
        y: Y(y1) + 11,
        anchor: "start",
        lbl,
      };
    if (q === osi.y)
      return {
        d: `M${r1(X(x0))},${r1(Y(v))} H${r1(X(x1))}`,
        x: X(x1) - 2,
        y: Y(v) - 5,
        anchor: "end",
        lbl,
      };
    if (q === "T" && pV && poznato) {
      const C = konstanta(spec).k * uK(spec, v);
      const o = izotermaOznaka(C);
      return { d: `M${izotermaLinija(C).replaceAll(" ", " L")}`, ...o, lbl };
    }
    return null;
  });

  const rucka = $derived.by(() => {
    if (nacin === "dionice") return null;
    if (nacin === "postavi") return tocka;
    if (nacin === "put") return gotovo ? null : (nacrt ?? putTocke.at(-1));
    return tk(ruckaStanje);
  });

  // oznake stanja koja se vide: u postavi samo početak, u putu samo stanje 1 (ostala učenik traži sam)
  const vidljivaStanja = $derived.by(() => {
    if (nacin === "postavi") return stanja;
    if (nacin === "put") return gotovo ? stanja : [stanja[0]];
    return stanja;
  });
  function smjerOznake(st) {
    // oznaka ide od središta crteža prema van
    const [x, y] = P(tk(st));
    const cx = (L + W - Rr) / 2;
    const cy = (T + H - B) / 2;
    return {
      dx: x >= cx ? 9 : -9,
      dy: y > cy ? 16 : -9,
      anchor: x >= cx ? "start" : "end",
    };
  }

  const opis = $derived(
    `Dijagram ${osi.y}–${osi.x}. ` +
      vidljivaStanja
        .map(
          (st) =>
            `Stanje ${st.oznaka}: ${osi.x} = ${txt(osi.x, vrijednost(st, osi.x))}, ${osi.y} = ${txt(osi.y, vrijednost(st, osi.y))}.`,
        )
        .join(" ") +
      (rucka
        ? ` Ručka: ${osi.x} = ${txt(osi.x, rucka.x)}, ${osi.y} = ${txt(osi.y, rucka.y)}.`
        : ""),
  );
  const ukupniW = $derived(tocniZnakovi.reduce((a, d) => a + d.iznosi.W, 0));
  const zatvorenCiklus = $derived(
    procesi.length > 1 && procesi[0].od === procesi.at(-1).do,
  );
  const VRSTA_GUMB = {
    izobarno: "izobarno",
    izohorno: "izohorno",
    izotermno: "izotermno",
    adijabatno: "adijabatski",
    ravno: "ravno",
  };
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="pd-tekst"><Md text={spec.tekst} /></div>
{/if}

{#if slobodno || (nacin === "put" && !gotovo)}
  <div class="pd-vrste">
    <span class="pd-mala"
      >{nacin === "put" ? `Dionica ${putVrste.length + 1}:` : "Proces:"}</span
    >
    <div class="seg pd-seg" role="group" aria-label="Vrsta procesa">
      {#each slobodno ? (spec.vrste ?? zadaneVrste(spec)) : ponudjeneVrste as v (v)}
        <button
          type="button"
          class="seg-item"
          class:active={vrsta === v}
          aria-pressed={vrsta === v}
          disabled={locked || gotovo}
          onclick={() => biraj(v)}>{VRSTA_GUMB[v]}</button
        >
      {/each}
    </div>
  </div>
{/if}

<figure class="lx-figure pd">
  <svg bind:this={svgEl} viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
    <!-- mreža -->
    {#each crteX as v, i (i)}
      <line class="pd-mreza" x1={r1(X(v))} y1={T} x2={r1(X(v))} y2={H - B} />
      {#if Math.abs(Math.round(v / spec.korak[osi.x]) % svakaX) === 0}<text
          class="lx-label pd-broj"
          x={r1(X(v))}
          y={H - B + 15}
          text-anchor="middle">{formatNumber(v)}</text
        >{/if}
    {/each}
    {#each crteY as v, i (i)}
      <line class="pd-mreza" x1={L} y1={r1(Y(v))} x2={W - Rr} y2={r1(Y(v))} />
      {#if Math.abs(Math.round(v / spec.korak[osi.y]) % svakaY) === 0}<text
          class="lx-label pd-broj"
          x={L - 6}
          y={r1(Y(v)) + 4}
          text-anchor="end">{formatNumber(v)}</text
        >{/if}
    {/each}
    <line
      class="lx-stroke pd-os"
      x1={L}
      y1={H - B}
      x2={W - Rr + 4}
      y2={H - B}
    />
    <line class="lx-stroke pd-os" x1={L} y1={H - B} x2={L} y2={T - 8} />
    <text class="lx-label pd-naslov" x={L - 6} y={T - 12} text-anchor="start"
      >{oznakaOsi(osi.y)}</text
    >
    <text class="lx-label pd-naslov" x={W - Rr} y={H - 6} text-anchor="end"
      >{oznakaOsi(osi.x)}</text
    >
    {#if apsNula != null}
      <line
        class="pd-nula"
        x1={r1(apsNula)}
        y1={T}
        x2={r1(apsNula)}
        y2={H - B}
      />
      <text class="lx-label pd-mala-svg" x={r1(apsNula) + 3} y={T + 10}
        >0 K</text
      >
    {/if}

    <!-- podloga: dodir premjesti ručku (stranica se i dalje pomiče prstom), mišem se može i vući -->
    {#if aktivno}
      <rect
        class="pd-podloga"
        role="presentation"
        x={L}
        y={T}
        width={W - L - Rr}
        height={H - T - B}
        onclick={klikPodloge}
        onpointerdown={(e) => e.pointerType === "mouse" && dolje(e)}
        onpointermove={mic}
        onpointerup={gore}
      />
    {/if}

    <!-- izoterme -->
    {#each izoterme as iz (iz.C)}
      <polyline class="pd-izoterma" points={iz.linija} />
      <text
        class="lx-label pd-mala-svg"
        x={r1(iz.oznaka.x)}
        y={r1(iz.oznaka.y)}
        text-anchor={iz.oznaka.anchor}>{iz.tekst}</text
      >
    {/each}
    {#if zivaIzoterma}<polyline
        class="pd-izoterma pd-ziva"
        points={zivaIzoterma}
      />{/if}

    <!-- površine (rad) -->
    {#each povrsine as pv, i (i)}
      <path class="pd-povrsina" class:minus={!pv.plus} d={pv.d} />
    {/each}

    <!-- zadana krajnja vrijednost i vodilica -->
    {#if ciljCrta && !gotovo}
      <path class="pd-cilj" d={ciljCrta.d} />
      <text
        class="lx-label pd-cilj-tekst"
        x={r1(ciljCrta.x)}
        y={r1(ciljCrta.y)}
        text-anchor={ciljCrta.anchor}>{ciljCrta.lbl}</text
      >
    {/if}
    {#each doNule as d, i (i)}
      <polyline class="pd-nula-crta" points={d} />
    {/each}
    {#if vodilicaLinija?.length > 1}
      <polyline
        class="pd-vodilica"
        points={vodilicaLinija.map((t) => P(t).join(",")).join(" ")}
      />
    {/if}

    <!-- procesi -->
    {#each crtaneDionice as d, i (i)}
      {@const s = strelica(d.u)}
      <polyline
        class="pd-proces"
        class:nacrt={d.nacrt}
        class:aktivna={nacin === "dionice" && aktivna === i}
        points={pts(d.u)}
      />
      {#if s}<polygon
          class="pd-strelica"
          class:aktivna={nacin === "dionice" && aktivna === i}
          points={s}
        />{/if}
    {/each}
    <!-- u istraživanju po zadanom putu: prijeđeni dio jače -->
    {#if nacin === "istrazi" && !slobodno}
      {#each prijedeno as d, i (i)}
        <polyline class="pd-prijedeno" points={pts(d.u)} />
      {/each}
    {/if}
    {#if nacin === "put" && !gotovo}
      {#each putTocke as t, i (i)}
        {#if i > 0 && !(spec.zatvoren && i === putTocke.length - 1 && Math.abs(t.x - putTocke[0].x) < 1e-9 && Math.abs(t.y - putTocke[0].y) < 1e-9)}
          <circle class="pd-tocka" cx={r1(X(t.x))} cy={r1(Y(t.y))} r="4.5" />
          <text class="pd-oznaka" x={r1(X(t.x)) + 7} y={r1(Y(t.y)) - 7}
            >{i + 1}</text
          >
        {/if}
      {/each}
    {/if}

    <!-- stanja -->
    {#each vidljivaStanja as st (st.oznaka)}
      {@const k = tk(st)}
      {@const o = smjerOznake(st)}
      <circle class="pd-tocka" cx={r1(X(k.x))} cy={r1(Y(k.y))} r="4.5" />
      <text
        class="pd-oznaka"
        x={r1(X(k.x)) + o.dx}
        y={r1(Y(k.y)) + o.dy}
        text-anchor={o.anchor}>{st.oznaka}</text
      >
    {/each}
    {#if nacin === "postavi" && gotovo && tocnoStanje}
      {@const k = tk(tocnoStanje)}
      <circle class="pd-tocka" cx={r1(X(k.x))} cy={r1(Y(k.y))} r="4.5" />
    {/if}

    <!-- ručka -->
    {#if rucka}
      {@const [hx, hy] = P(rucka)}
      <line class="pd-pomocna" x1={hx} y1={hy} x2={hx} y2={H - B} />
      <line class="pd-pomocna" x1={hx} y1={hy} x2={L} y2={hy} />
      <g
        class="pd-rucka {statusTocke}"
        class:lx-handle={aktivno}
        class:vucem
        role="slider"
        tabindex={aktivno ? 0 : -1}
        aria-label="Stanje plina"
        aria-valuetext="{osi.x} = {txt(osi.x, rucka.x)}, {osi.y} = {txt(
          osi.y,
          rucka.y,
        )}"
        aria-valuenow={rucka.x}
        aria-disabled={!aktivno}
        onpointerdown={dolje}
        onpointermove={mic}
        onpointerup={gore}
        onpointercancel={gore}
        onkeydown={tipka}
      >
        <circle class="pd-rucka-meta" cx={hx} cy={hy} r="22" />
        <circle class="pd-rucka-krug" cx={hx} cy={hy} r={vucem ? 10 : 8} />
      </g>
    {/if}
  </svg>
</figure>

{#if ocitanja.length && nacin !== "dionice" && ruckaStanje}
  <div class="pd-ocitanja" aria-live="polite">
    {#each ocitanja as q (q)}
      <div
        class="pd-ocitanje"
        class:energija={["pV", "U", "W", "Q"].includes(q)}
      >
        <span class="pd-simbol">{SIMB[q]}</span>
        <span class="pd-vrijednost">{txt(q, ocitaj(q))}</span>
      </div>
    {/each}
  </div>
  {#if nacin === "istrazi" && prikazi.includes("W") && pV}
    <p class="pd-mala pd-legenda">
      <span class="pd-kv plus"></span> plin se širi, W &gt; 0
      <span class="pd-kv minus"></span> plin se steže, W &lt; 0
    </p>
  {/if}
{/if}

{#if nacin === "istrazi"}
  <div class="lx-actions">
    <button type="button" class="btn btn-ghost" onclick={ispocetka}
      >Ispočetka</button
    >
    <span class="pd-mala"
      >{slobodno
        ? "Vuci kružić; svaki potez je jedna dionica odabranog procesa."
        : "Vuci kružić po putu."}</span
    >
  </div>
{/if}

{#if nacin === "postavi"}
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
    {#if !locked}<span class="pd-mala"
        >{spec.vodilica
          ? "Vuci kružić po isprekidanoj krivulji procesa."
          : "Vuci kružić na stanje nakon procesa."}</span
      >{/if}
  </div>
{/if}

{#if nacin === "put"}
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-ghost"
      onclick={dodajDionicu}
      disabled={locked || !nacrtPomaknut}
      >{zatvara ? "Zatvori ciklus" : "Dodaj dionicu"}</button
    >
    <button
      type="button"
      class="btn btn-quiet"
      onclick={ponisti}
      disabled={locked || (!nacrtPomaknut && !putVrste.length)}>Poništi</button
    >
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || (!putVrste.length && !nacrtPomaknut)}>Provjeri</button
    >
  </div>
  {#if !locked}<p class="pd-mala pd-uputa">
      Odaberi proces, povuci kružić do kraja dionice i dodaj je. Ponovi za svaku
      dionicu.
    </p>{/if}
{/if}

{#if nacin === "dionice"}
  <div class="pd-dionice">
    {#each procesi as pr, i (i)}
      {@const ok = gotovo && dioniceNeprom}
      <div
        class="pd-red"
        class:ok={ok || pokazi}
        role="group"
        aria-label="Dionica {pr.od} → {pr.do}"
        onpointerenter={() => (aktivna = i)}
        onpointerleave={() => (aktivna = -1)}
        onfocusin={() => (aktivna = i)}
        onfocusout={() => (aktivna = -1)}
      >
        <div class="pd-red-ime">
          <b>{pr.od} → {pr.do}</b>
          <span class="pd-mala">{KRATKO_VRSTE[pr.vrsta]}</span>
        </div>
        <div class="pd-red-znakovi">
          {#each vel as v (v)}
            <div class="pd-znak">
              <span class="pd-znak-ime">{VELICINA_TXT[v]}</span>
              <div
                class="seg pd-seg"
                role="group"
                aria-label="{VELICINA_TXT[v]} za {pr.od} → {pr.do}"
              >
                {#each ZNAKOVI as z (z)}
                  <button
                    type="button"
                    class="seg-item"
                    class:active={znakovi[i]?.[v] === z}
                    aria-pressed={znakovi[i]?.[v] === z}
                    disabled={locked}
                    onclick={() => (znakovi[i] = { ...znakovi[i], [v]: z })}
                    >{ZNAK_TXT[z]}</button
                  >
                {/each}
              </div>
            </div>
          {/each}
        </div>
        {#if gotovo && pV}
          <div class="pd-iznosi">
            {#each vel as v (v)}
              <span
                >{VELICINA_TXT[v]} = {txt("W", tocniZnakovi[i].iznosi[v])}</span
              >
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  {#if gotovo && pV && vel.includes("W") && zatvorenCiklus}
    <p class="pd-ukupno">
      Ukupni rad ciklusa: <b>{txt("W", ukupniW)}</b>
      <span class="pd-mala">(površina unutar ciklusa)</span>
    </p>
  {/if}
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || !sviZnakovi}>Provjeri</button
    >
  </div>
{/if}

<style>
  .pd-tekst {
    margin-bottom: 10px;
  }
  .pd {
    margin-bottom: 6px;
  }
  .pd svg {
    overflow: visible;
  }
  .pd-podloga {
    fill: transparent;
    cursor: crosshair;
  }
  .pd-mreza {
    stroke: var(--border);
    stroke-width: 1;
  }
  .pd-os {
    stroke-width: 1.4;
  }
  .pd-broj {
    font-size: 11px;
    font-family: var(--font-mono);
  }
  .pd-naslov {
    font-size: 12px;
    font-weight: 600;
    fill: var(--text);
  }
  .pd-mala-svg {
    font-size: 10.5px;
    fill: var(--text-faint);
  }
  .pd-nula {
    stroke: var(--text-faint);
    stroke-dasharray: 2 3;
  }
  .pd-izoterma {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.2;
    stroke-dasharray: 5 4;
    opacity: 0.8;
  }
  .pd-izoterma.pd-ziva {
    stroke: var(--primary);
    opacity: 0.45;
  }
  .pd-povrsina {
    fill: color-mix(in srgb, var(--success) 20%, transparent);
    stroke: none;
  }
  .pd-povrsina.minus {
    fill: color-mix(in srgb, var(--danger) 18%, transparent);
  }
  .pd-cilj {
    fill: none;
    stroke: var(--warn);
    stroke-width: 1.3;
    stroke-dasharray: 6 4;
  }
  .pd-cilj-tekst {
    fill: var(--warn);
    font-size: 11px;
    font-weight: 600;
  }
  .pd-nula-crta {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.2;
    stroke-dasharray: 3 4;
  }
  .pd-vodilica {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.6;
    stroke-dasharray: 5 5;
    opacity: 0.6;
  }
  .pd-proces {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
    transition: stroke 0.15s;
  }
  .pd-proces.nacrt {
    stroke: var(--primary);
    stroke-dasharray: 6 4;
  }
  .pd-proces.aktivna {
    stroke: var(--primary);
    stroke-width: 3.5;
  }
  .pd-prijedeno {
    fill: none;
    stroke: var(--primary);
    stroke-width: 3.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .pd-strelica {
    fill: var(--text);
  }
  .pd-strelica.aktivna {
    fill: var(--primary);
  }
  .pd-tocka {
    fill: var(--text);
  }
  .pd-oznaka {
    font: 600 13px var(--font-sans);
    fill: var(--text);
  }
  .pd-pomocna {
    stroke: var(--primary);
    stroke-width: 1;
    stroke-dasharray: 2 3;
    opacity: 0.7;
    pointer-events: none;
  }
  .pd-rucka-meta {
    fill: transparent;
  }
  .pd-rucka-krug {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2.5;
    transition: r 0.12s;
  }
  .pd-rucka.ok .pd-rucka-krug {
    fill: var(--success);
  }
  .pd-rucka.bad .pd-rucka-krug {
    fill: var(--danger);
  }
  .pd-rucka:focus-visible {
    outline: none;
  }
  .pd-rucka:focus-visible .pd-rucka-krug {
    stroke: var(--primary);
    stroke-width: 4;
    stroke-opacity: 0.4;
  }
  .pd-ocitanja {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 auto 4px;
    max-width: 440px;
  }
  .pd-ocitanje {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    font-family: var(--font-mono);
    font-size: 13.5px;
  }
  .pd-ocitanje.energija {
    border-color: color-mix(in srgb, var(--warn) 40%, var(--border));
  }
  .pd-simbol {
    color: var(--text-dim);
    font-style: italic;
  }
  .pd-vrijednost {
    color: var(--text);
    font-weight: 600;
    white-space: nowrap;
  }
  .pd-mala {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .pd-legenda {
    text-align: center;
    margin: 6px 0 0;
  }
  .pd-kv {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin: 0 3px 0 8px;
    vertical-align: -1px;
  }
  .pd-kv.plus {
    background: color-mix(in srgb, var(--success) 45%, transparent);
  }
  .pd-kv.minus {
    background: color-mix(in srgb, var(--danger) 40%, transparent);
  }
  .pd-uputa {
    margin: 8px 0 0;
  }
  .pd-vrste {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    margin-bottom: 8px;
  }
  .pd-seg {
    flex-wrap: wrap;
  }
  .pd-seg .seg-item {
    border: 0;
    background: transparent;
    font-size: 13px;
    padding: 7px 11px;
    min-height: 34px;
  }
  .pd-seg .seg-item.active {
    background: var(--primary-dim);
    color: var(--text);
    box-shadow: 0 0 0 1px var(--primary-border);
  }
  .pd-seg .seg-item:disabled {
    cursor: default;
  }
  .pd-dionice {
    display: grid;
    gap: 8px;
  }
  .pd-red {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .pd-red.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 8%, transparent);
  }
  .pd-red-ime {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 72px;
  }
  .pd-red-znakovi {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .pd-znak {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .pd-znak-ime {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-dim);
    min-width: 22px;
    text-align: right;
  }
  .pd-znak .seg-item {
    min-width: 34px;
    padding: 7px 0;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 15px;
  }
  /* uski zaslon: ime dionice u jednom retku, ispod tri stupca znakova (W, ΔU, Q) s oznakom iznad */
  @media (max-width: 560px) {
    .pd-red-ime {
      flex-direction: row;
      align-items: baseline;
      gap: 8px;
    }
    .pd-red-znakovi {
      flex-basis: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
      gap: 8px;
    }
    .pd-znak {
      flex-direction: column;
      align-items: stretch;
      gap: 3px;
    }
    .pd-znak-ime {
      text-align: center;
      min-width: 0;
    }
    .pd-znak .seg {
      justify-content: space-between;
      padding: 2px;
    }
    .pd-znak .seg-item {
      min-width: 0;
      flex: 1;
    }
  }
  .pd-iznosi {
    flex-basis: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .pd-ukupno {
    margin: 10px 0 0;
    text-align: center;
  }
</style>
