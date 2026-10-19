// Strujni krug (widget „strujni_krug“): fizika i raspored sheme. Čisti JS bez preglednika: isti kod računa
// provjeru u katalogu (i na backendu, GraalJS) i crtež u komponenti, pa ono što učenik vidi i ono što se
// smatra točnim dolaze iz iste funkcije.
//
// Spoj je stablo: list {id, R} | {id, zarulja: {U, P}} | {id, sklopka: "otvorena" | "zatvorena"},
// skupina {id?, serijski: [...]} | {id?, paralelno: [...]}. Na maturi su samo serijsko-paralelni krugovi, pa
// nije potrebna analiza čvorova: otpor se računa rekurzivno, a struja i napon dijele se niz stablo.
import { formatSci } from "../../core/number.js";

export const POSEBNI = ["izvor", "r", "ukupno"];
export const JEDINICA = { I: "A", U: "V", P: "W", R: "Ω" };
export const fmt = (v) => formatSci(v, 3);

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
// „R1“ → „R₁“, „Z_2“ → „Z₂“; oznaka iz speca ima prednost
export const naziv = (c) =>
  c.oznaka ||
  String(c.id ?? "").replace(/_?(\d+)$/, (m, d) =>
    [...d].map((x) => SUB[x]).join(""),
  );

export function vrstaCvora(n) {
  if (!n || typeof n !== "object" || Array.isArray(n)) return null;
  const k = [
    ["serijski", "ser"],
    ["paralelno", "par"],
    ["zarulja", "Z"],
    ["sklopka", "S"],
    ["R", "R"],
  ].filter(([f]) => f in n);
  return k.length === 1 ? k[0][1] : null;
}

// Stablo s ključevima („k“, „k.0“, „k.0.1“…): ključ ostaje isti kad se skupina prebaci serijski ⇄ paralelno.
export function stablo(spoj) {
  const listovi = [];
  const grupe = [];
  const po = {};
  const walk = (n, key, dubina, roditelj) => {
    const vrsta = vrstaCvora(n);
    const c = {
      key,
      id: n.id ?? null,
      oznaka: n.oznaka ?? null,
      vrsta,
      dubina,
      roditelj,
    };
    if (vrsta === "ser" || vrsta === "par") {
      c.djeca = (vrsta === "ser" ? n.serijski : n.paralelno).map((d, i) =>
        walk(d, `${key}.${i}`, dubina + 1, c),
      );
      grupe.push(c);
    } else {
      if (vrsta === "R") c.R = n.R;
      if (vrsta === "Z") {
        c.Unaz = n.zarulja.U;
        c.Pnaz = n.zarulja.P;
        c.R = (n.zarulja.U * n.zarulja.U) / n.zarulja.P;
      }
      if (vrsta === "S") c.zatvorena = n.sklopka === "zatvorena";
      listovi.push(c);
    }
    if (c.id) po[c.id] = c;
    return c;
  };
  return { korijen: walk(spoj, "k", 0, null), listovi, grupe, po };
}

// Stanje koje učenik mijenja: ε, r, otpori s klizača, sklopke i vrsta spoja skupina (po ključu).
export function pocetnoStanje(spec) {
  return {
    emf: spec.izvor?.emf ?? 0,
    r: spec.izvor?.r ?? 0,
    R: {},
    sklopke: {},
    spoj: {},
  };
}

export const zatvorena = (c, st) => st.sklopke?.[c.id] ?? c.zatvorena;
export const vrstaSkupine = (c, st) => st.spoj?.[c.key] ?? c.vrsta;

// Sve struje, naponi i snage. po[key] = {I, U, P, R} za svaki list i skupinu.
export function rijesi(spec, st, T = stablo(spec.spoj)) {
  const po = {};
  const Rc = {};
  const otpor = (c) => {
    let R;
    if (c.djeca) {
      const rs = c.djeca.map(otpor);
      if (vrstaSkupine(c, st) === "ser") R = rs.reduce((s, x) => s + x, 0);
      else if (rs.some((x) => x === 0)) R = 0;
      else {
        const g = rs.reduce((s, x) => s + (x === Infinity ? 0 : 1 / x), 0);
        R = g === 0 ? Infinity : 1 / g;
      }
    } else if (c.vrsta === "S") R = zatvorena(c, st) ? 0 : Infinity;
    else if (c.vrsta === "R") R = st.R?.[c.id] ?? c.R;
    else R = c.R;
    Rc[c.key] = R;
    return R;
  };
  const raspodijeli = (c, I, U) => {
    const R = Rc[c.key];
    po[c.key] = { I, U, P: U * I, R };
    if (!c.djeca) return;
    if (vrstaSkupine(c, st) === "ser") {
      if (R === Infinity) {
        // prekinut niz: struje nema, a cijeli napon je na otvorenim dijelovima
        const n = c.djeca.filter((d) => Rc[d.key] === Infinity).length;
        c.djeca.forEach((d) =>
          raspodijeli(d, 0, Rc[d.key] === Infinity ? U / n : 0),
        );
      } else c.djeca.forEach((d) => raspodijeli(d, I, I * Rc[d.key]));
    } else if (R === 0) {
      // kratki spoj u paralelnoj skupini: sva struja ide granom bez otpora
      const n = c.djeca.filter((d) => Rc[d.key] === 0).length;
      c.djeca.forEach((d) => raspodijeli(d, Rc[d.key] === 0 ? I / n : 0, 0));
    } else
      c.djeca.forEach((d) =>
        raspodijeli(d, Rc[d.key] === Infinity ? 0 : U / Rc[d.key], U),
      );
  };
  const Rv = otpor(T.korijen);
  const emf = st.emf;
  const r = st.r;
  const I = Rv === Infinity || Rv + r === 0 ? 0 : emf / (Rv + r);
  const Ut = Rv === Infinity ? emf : I * Rv;
  raspodijeli(T.korijen, I, Ut);
  return { po, I, Ut, Rv, emf, r, T };
}

// {I, U, P, R} za element: id lista ili skupine, „izvor“, „r“ (unutarnji otpor) ili „ukupno“ (vanjski dio).
export function velicineOd(rez, element) {
  if (element === "ukupno")
    return { I: rez.I, U: rez.Ut, P: rez.Ut * rez.I, R: rez.Rv };
  if (element === "izvor")
    return { I: rez.I, U: rez.Ut, P: rez.emf * rez.I, R: rez.Rv + rez.r };
  if (element === "r")
    return { I: rez.I, U: rez.I * rez.r, P: rez.I * rez.I * rez.r, R: rez.r };
  const c = rez.T.po[element];
  return c ? rez.po[c.key] : null;
}
export const vrijednost = (rez, velicina, element) =>
  velicineOd(rez, element)?.[velicina];

// Kako se element zove u rečenici: „R₁“, „izvor“, „unutarnji otpor“, „vanjski dio kruga“.
export function imeElementa(T, element) {
  if (element === "izvor") return "izvor";
  if (element === "r") return "unutarnji otpor $r$";
  if (element === "ukupno") return "vanjski dio kruga";
  const c = T.po[element];
  if (!c) return element;
  return c.djeca
    ? c.oznaka
      ? `skupina ${c.oznaka}`
      : `skupina ${c.id}`
    : naziv(c);
}

// ── raspored sheme ────────────────────────────────────────────────────────────────────────────────
// Izvor je lijevo (okomito), gore je niz elemenata, a paralelna skupina na kraju crta se kao stupci između
// gornje i donje žice (kao u udžbeniku). Unutarnje paralelne skupine su „ljestve“ (grane jedna ispod druge ili
// jedna do druge). Svaki blok se mjeri u lokalnim koordinatama (u uzduž toka, v poprijeko), pa se ništa ne
// preklapa: oznake su s jedne strane žice, voltmetri s druge.
const LEAD = 10;
const GAP = 10;
const RAIL = 12;
const AM = 40; // ampermetar u nizu
const MR = 11; // polumjer mjerila
const RH = 14; // visina očitanja
const RW = 46; // širina očitanja
const BRG = 14; // razmak voltmetra od elementa
const GAPV = 14;
const GAPC = 18;
const LINE = 14;
// [duljina tijela, poluširina prema oznaci, poluširina na drugu stranu]; poluga sklopke otvara se prema oznaci
export const TIJELO = { R: [40, 8, 8], Z: [28, 14, 14], S: [36, 18, 4] };
export const GEOM = { MR, AM };

export const sirinaTeksta = (s) => String(s).length * 6.9 + 2;

// o = "h": u → x, v → y (oznake gore); o = "v": u → y, v → x (oznake desno)
const preslikaj = (o, x0, y0) =>
  o === "h" ? (u, v) => [x0 + u, y0 + v] : (u, v) => [x0 + v, y0 + u];
const strana = (o) => (o === "h" ? { ls: -1, bs: 1 } : { ls: 1, bs: -1 });
const ocitanjeAmp = (o) => (o === "h" ? MR + 4 + RH : MR + 6 + RW);
const ocitanjeMosta = (o) => (o === "h" ? MR + 4 + RH : MR + 6 + RW);

// linije(c) → popis redaka oznake (najširi mogući), oznakaIzvora → popis redaka uz izvor
export function rasporedi(spec, st, T, { linije, oznakaIzvora }) {
  const mj = spec.mjerila ?? [];
  const imaMj = (vrsta, el) =>
    mj.some((m) => m.vrsta === vrsta && m.element === el);
  const refMj = (vrsta, c) => (c.id && imaMj(vrsta, c.id) ? c.id : null);

  // stablo za crtanje: skupina s jednim članom nestaje (mjerila prelaze na člana), ista vrsta u istoj se spaja
  const pripremi = (c) => {
    const A = refMj("A", c);
    const V = refMj("V", c);
    if (!c.djeca) return { key: c.key, c, vrsta: c.vrsta, A, V };
    const v = vrstaSkupine(c, st);
    let djeca = c.djeca.map(pripremi);
    if (djeca.length === 1) {
      const k = djeca[0];
      k.A ??= A;
      k.V ??= V;
      return k;
    }
    djeca = djeca.flatMap((d) =>
      d.djeca && d.vrsta === v && !d.A && !d.V ? d.djeca : [d],
    );
    return { key: c.key, c, vrsta: v, djeca, A, V };
  };

  let korijen = pripremi(T.korijen);
  let dolje =
    mj.find(
      (m) =>
        m.vrsta === "A" && (m.element === "izvor" || m.element === "ukupno"),
    )?.element ?? null;
  let lijevo =
    mj.find(
      (m) =>
        m.vrsta === "V" && (m.element === "izvor" || m.element === "ukupno"),
    )?.element ?? null;
  const naR = imaMj("V", "r") ? "r" : null;

  let niz = [];
  let stupci = null;
  if (!korijen.djeca) niz = [korijen];
  else if (korijen.vrsta === "ser") {
    dolje ??= korijen.A;
    lijevo ??= korijen.V;
    korijen.A = korijen.V = null;
    const zadnji = korijen.djeca.at(-1);
    if (zadnji.djeca && zadnji.vrsta === "par") {
      niz = korijen.djeca.slice(0, -1);
      stupci = zadnji;
    } else niz = korijen.djeca;
  } else stupci = korijen;
  if (stupci) {
    dolje ??= stupci.A;
    stupci.A = null;
  }

  // ── mjerenje ──
  const mjeri = (L, o) => {
    let m;
    if (!L.djeca) {
      const [tl, th, to] = TIJELO[L.vrsta];
      const red = linije(L.c);
      const lw = Math.max(...red.map(sirinaTeksta));
      const tijelo = Math.max(tl + 2 * LEAD, o === "h" ? lw + 10 : 0);
      const am = L.A ? AM : 0;
      const ls = Math.max(
        o === "h" ? th + 6 + red.length * LINE : th + 8 + lw,
        L.A ? ocitanjeAmp(o) : 0,
      );
      let bs = Math.max(to, L.A ? MR : 0);
      const dV = bs + BRG;
      if (L.V) bs = dV + ocitanjeMosta(o);
      m = { len: am + tijelo, ls, bs, am, tijelo, dV, red };
    } else if (L.vrsta === "ser") {
      const ms = L.djeca.map((d) => mjeri(d, o));
      const am = L.A ? AM : 0;
      const ls = Math.max(...ms.map((x) => x.ls), L.A ? ocitanjeAmp(o) : 0);
      let bs = Math.max(...ms.map((x) => x.bs), L.A ? MR : 0);
      const dV = bs + BRG;
      if (L.V) bs = dV + ocitanjeMosta(o);
      m = {
        len: am + ms.reduce((s, x) => s + x.len, 0) + GAP * (ms.length - 1),
        ls,
        bs,
        am,
        dV,
      };
    } else {
      const grane = L.djeca.map((d) => ({ L: d, m: mjeri(d, o) }));
      if (L.V)
        grane.push({
          L: null,
          ref: L.V,
          m: { len: 2 * MR + 2 * LEAD, ls: ocitanjeAmp(o), bs: MR },
        });
      const neg = (x) => (o === "h" ? x.ls : x.bs);
      const pos = (x) => (o === "h" ? x.bs : x.ls);
      let v = 0;
      grane.forEach((g, i) => {
        if (i) v += pos(grane[i - 1].m) + GAPV + neg(g.m);
        g.v = v;
      });
      const am = L.A ? AM : 0;
      const unutra = Math.max(...grane.map((g) => g.m.len));
      const n = neg(grane[0].m);
      const p = v + pos(grane.at(-1).m);
      let ls = o === "h" ? n : p;
      let bs = o === "h" ? p : n;
      if (L.A) {
        ls = Math.max(ls, ocitanjeAmp(o));
        bs = Math.max(bs, MR);
      }
      m = { len: am + unutra + 2 * RAIL, ls, bs, am, grane, unutra };
    }
    L.m = m;
    return m;
  };

  // ── crtanje ──
  const zice = [];
  const elementi = [];
  const mjerila = [];
  const cvorovi = [];
  const zica = (pts, kljucevi) => zice.push({ pts, kljucevi });
  const mjerilo = (vrsta, element, [x, y], ocitanje) =>
    mjerila.push({ vrsta, element, x, y, ocitanje });
  const ocitanjeUz = (o, P, u, v, sgn) =>
    o === "h"
      ? {
          ...xy(P(u, v + sgn * (MR + 4))),
          anchor: "middle",
          baseline: sgn < 0 ? "auto" : "hanging",
        }
      : {
          ...xy(P(u, v + sgn * (MR + 6))),
          anchor: sgn > 0 ? "start" : "end",
          baseline: "central",
        };

  const crtaj = (L, o, P, u0, v0) => {
    const m = L.m;
    const { ls, bs } = strana(o);
    let u = u0;
    const kroz = [L.key];
    if (m.am) {
      zica([P(u, v0), P(u + AM, v0)], kroz);
      mjerilo(
        "A",
        L.A,
        P(u + AM / 2, v0),
        ocitanjeUz(o, P, u + AM / 2, v0, ls),
      );
      u += AM;
    }
    const most = (a, b, uc, d, ref) => {
      zica([P(a, v0), P(a, v0 + bs * d), P(b, v0 + bs * d), P(b, v0)], null);
      cvorovi.push(P(a, v0), P(b, v0));
      mjerilo(
        "V",
        ref,
        P(uc, v0 + bs * d),
        ocitanjeUz(o, P, uc, v0 + bs * d, bs),
      );
    };
    if (!L.djeca) {
      const [tl, th] = TIJELO[L.vrsta];
      const uc = u + m.tijelo / 2;
      // sklopka: žica završava na kontaktima, pa otvorena sklopka zaista prekida crtež
      if (L.vrsta === "S") {
        zica([P(u, v0), P(uc - tl / 2, v0)], kroz);
        zica([P(uc + tl / 2, v0), P(u + m.tijelo, v0)], kroz);
      } else zica([P(u, v0), P(u + m.tijelo, v0)], kroz);
      const oz =
        o === "h"
          ? { ...xy(P(uc, v0 - (th + 6))), anchor: "middle", poravnaj: "dno" }
          : { ...xy(P(uc, v0 + th + 8)), anchor: "start", poravnaj: "sredina" };
      elementi.push({ c: L.c, ...xy(P(uc, v0)), o, oznaka: oz, ls });
      if (L.V) most(uc - tl / 2 - 5, uc + tl / 2 + 5, uc, m.dV, L.V);
      return;
    }
    if (L.vrsta === "ser") {
      const start = u;
      L.djeca.forEach((d, i) => {
        if (i) {
          zica([P(u, v0), P(u + GAP, v0)], kroz);
          u += GAP;
        }
        crtaj(d, o, P, u, v0);
        u += d.m.len;
      });
      if (L.V) most(start, u, (start + u) / 2, m.dV, L.V);
      return;
    }
    // paralelno: ljestve; gornja tračnica nosi struju grana iza sebe, donja je vraća
    const uA = u + RAIL;
    const uB = u0 + m.len - RAIL;
    zica([P(u, v0), P(uA, v0)], kroz);
    zica([P(uB, v0), P(u0 + m.len, v0)], kroz);
    const g = m.grane;
    g.forEach((gr, i) => {
      const v = v0 + gr.v;
      const us = uA + (uB - uA - gr.m.len) / 2;
      const kljucevi = gr.L ? [gr.L.key] : null;
      zica([P(uA, v), P(us, v)], kljucevi);
      zica([P(us + gr.m.len, v), P(uB, v)], kljucevi);
      if (gr.L) crtaj(gr.L, o, P, us, v);
      else {
        zica([P(us, v), P(us + gr.m.len, v)], null);
        mjerilo(
          "V",
          gr.ref,
          P(us + gr.m.len / 2, v),
          ocitanjeUz(o, P, us + gr.m.len / 2, v, ls),
        );
      }
      if (i < g.length - 1) {
        const iza = g
          .slice(i + 1)
          .filter((x) => x.L)
          .map((x) => x.L.key);
        const vn = v0 + g[i + 1].v;
        zica([P(uA, v), P(uA, vn)], iza.length ? iza : null);
        zica([P(uB, vn), P(uB, v)], iza.length ? iza : null);
        cvorovi.push(P(uA, v), P(uB, v));
      }
    });
  };

  // ── sklapanje ──
  const imaIzvor = !!spec.izvor;
  const rUnutra =
    imaIzvor &&
    (spec.izvor.r > 0 || (spec.klizaci ?? []).some((k) => k.element === "r"));
  const izvRed = imaIzvor ? oznakaIzvora() : [];
  const izvW = Math.max(0, ...izvRed.map(sirinaTeksta));
  const izvPola = rUnutra ? 22 : 17;
  const mostL = imaIzvor && (lijevo || naR);
  const xs = 8 + (mostL ? izvPola + 14 + MR + 6 + RW : 26);
  const xNiz = xs + Math.max(48, izvPola + 10 + izvW + 14);

  niz.forEach((L) => mjeri(L, "h"));
  const nizLen =
    niz.reduce((s, L) => s + L.m.len, 0) + GAP * Math.max(0, niz.length - 1);
  const nizLs = Math.max(0, ...niz.map((L) => L.m.ls));
  const nizBs = Math.max(0, ...niz.map((L) => L.m.bs));

  let kolone = [];
  if (stupci) {
    kolone = stupci.djeca.map((d) => ({ L: d, m: mjeri(d, "v") }));
    if (stupci.V)
      kolone.push({
        L: null,
        ref: stupci.V,
        m: { len: 2 * MR + 2 * LEAD, ls: ocitanjeAmp("v"), bs: MR },
      });
  }
  let x = xNiz + nizLen;
  kolone.forEach((k, i) => {
    x += i
      ? kolone[i - 1].m.ls + GAPC + k.m.bs
      : (niz.length ? GAP + 6 : 0) + k.m.bs;
    k.x = x;
  });
  const xR = kolone.length ? kolone.at(-1).x : x + 16;
  const sirina = (kolone.length ? xR + kolone.at(-1).m.ls : xR) + 10;

  const presjek = spec.presjek && imaIzvor;
  const yTop = 10 + Math.max(nizLs, presjek ? 28 : 12);
  const visinaIzvora = imaIzvor ? (rUnutra ? 128 : 96) : 70;
  const H = Math.max(
    visinaIzvora,
    nizBs + 22 + (dolje ? MR : 0),
    ...kolone.map((k) => k.m.len + 16),
    mostL ? 96 : 0,
  );
  const yBot = yTop + H;
  const visina = yBot + (dolje ? MR + 4 + RH + 8 : 12);
  const ym = (yTop + yBot) / 2;

  // gornja žica, niz i stupci
  const xPrvi = kolone.length ? kolone[0].x : xR;
  zica(
    [
      [xs, yTop],
      [xNiz, yTop],
    ],
    ["@"],
  );
  let u = xNiz;
  niz.forEach((L, i) => {
    if (i) {
      zica(
        [
          [u, yTop],
          [u + GAP, yTop],
        ],
        ["@"],
      );
      u += GAP;
    }
    crtaj(L, "h", preslikaj("h", 0, yTop), u, 0);
    u += L.m.len;
  });
  zica(
    [
      [u, yTop],
      [xPrvi, yTop],
    ],
    ["@"],
  );
  if (kolone.length) {
    kolone.forEach((k, i) => {
      const y0 = yTop + (H - k.m.len) / 2;
      const kljucevi = k.L ? [k.L.key] : null;
      zica(
        [
          [k.x, yTop],
          [k.x, y0],
        ],
        kljucevi,
      );
      zica(
        [
          [k.x, y0 + k.m.len],
          [k.x, yBot],
        ],
        kljucevi,
      );
      if (k.L) crtaj(k.L, "v", preslikaj("v", k.x, y0), 0, 0);
      else {
        zica(
          [
            [k.x, y0],
            [k.x, y0 + k.m.len],
          ],
          null,
        );
        mjerilo("V", k.ref, [k.x, ym], {
          x: k.x + MR + 6,
          y: ym,
          anchor: "start",
          baseline: "central",
        });
      }
      if (i < kolone.length - 1) {
        const iza = kolone
          .slice(i + 1)
          .filter((z) => z.L)
          .map((z) => z.L.key);
        zica(
          [
            [k.x, yTop],
            [kolone[i + 1].x, yTop],
          ],
          iza.length ? iza : null,
        );
        zica(
          [
            [kolone[i + 1].x, yBot],
            [k.x, yBot],
          ],
          iza.length ? iza : null,
        );
        cvorovi.push([k.x, yTop], [k.x, yBot]);
      }
    });
  } else
    zica(
      [
        [xR, yTop],
        [xR, yBot],
      ],
      ["@"],
    );

  // donja žica s ampermetrom izvora
  zica(
    [
      [xPrvi, yBot],
      [xs, yBot],
    ],
    ["@"],
  );
  if (dolje) {
    const xa = (xs + xPrvi) / 2;
    mjerilo("A", dolje, [xa, yBot], {
      x: xa,
      y: yBot + MR + 4,
      anchor: "middle",
      baseline: "hanging",
    });
  }

  // izvor: struja izlazi na + (duža ploča, gore) i vraća se odozdo
  let izvor = null;
  if (imaIzvor) {
    const yb = rUnutra ? ym - 24 : ym;
    const yr = rUnutra ? ym + 26 : null;
    zica(
      [
        [xs, yBot],
        [xs, yb + 5],
      ],
      ["@"],
    );
    zica(
      [
        [xs, yb - 5],
        [xs, yTop],
      ],
      ["@"],
    );
    izvor = {
      x: xs,
      yb,
      yr,
      kutija: rUnutra
        ? {
            x: xs - izvPola,
            y: yb - 22,
            w: 2 * izvPola,
            h: yr + 30 - (yb - 22),
          }
        : null,
      oznaka: { x: xs + izvPola + 10, red: izvRed },
    };
    if (mostL) {
      const xb = xs - izvPola - 14;
      if (lijevo) {
        zica(
          [
            [xs, yTop],
            [xb, yTop],
            [xb, yBot],
            [xs, yBot],
          ],
          null,
        );
        cvorovi.push([xs, yTop], [xs, yBot]);
        mjerilo("V", lijevo, [xb, ym], {
          x: xb - MR - 6,
          y: ym,
          anchor: "end",
          baseline: "central",
        });
      } else {
        const a = yr - 22;
        const b = yr + 22;
        zica(
          [
            [xs, a],
            [xb, a],
            [xb, b],
            [xs, b],
          ],
          null,
        );
        cvorovi.push([xs, a], [xs, b]);
        mjerilo("V", naR, [xb, yr], {
          x: xb - MR - 6,
          y: yr,
          anchor: "end",
          baseline: "central",
        });
      }
    }
  }

  return {
    w: Math.round(sirina),
    h: Math.round(visina),
    zice: zice
      .map((z) => ({ ...z, pts: z.pts.map(([px, py]) => [r1(px), r1(py)]) }))
      .filter((z) => z.pts.length > 1 && duljina(z.pts) > 0.5),
    elementi,
    mjerila,
    cvorovi: cvorovi.map(([px, py]) => [r1(px), r1(py)]),
    izvor,
    stezaljke: imaIzvor ? null : { x: xs, yTop, yBot },
    presjek: presjek ? { x: r1((xs + xNiz) / 2), y: yTop } : null,
    yTop,
    yBot,
  };
}

const r1 = (n) => Math.round(n * 10) / 10;
const xy = ([x, y]) => ({ x: r1(x), y: r1(y) });
export const duljina = (pts) =>
  pts
    .slice(1)
    .reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// točka na izlomljenoj crti na udaljenosti s od početka
export function tockaNa(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (s <= l || i === pts.length - 1) {
      const t = l ? Math.min(1, s / l) : 0;
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
      ];
    }
    s -= l;
  }
  return pts[0];
}
