// razina_zvuka: točkasti izvor zvuka i „balon“ (kugla polumjera r) kroz koji prolazi njegova snaga. Uživo
// S = 4πr², I = N·P/S i L = 10 log(I/I₀) za jedno ili dva uha (mikrofona) koja se vuku po zrakama, uz dB-ljestvicu s
// poznatim zvukovima. Načini: istrazi, postavi (uho ili snagu na cilj), predvidi (promjena r, P ili broja izvora)
// i izracunaj (S, I, L, ΔL s automatskim tipičnim greškama). Sve (fizika, geometrija crteža, tekstovi očitanja i što
// je skriveno) računaju čiste funkcije ove datoteke, pa ih komponenta (i iOS) samo crta.
import { isNum, formatNumber, formatSci } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
  withUnit,
} from "../zajednicko.js";

const TIP = "razina_zvuka";
export const I0 = 1e-12; // prag čujnosti, knjižica str. 5
export const NACINI = ["istrazi", "postavi", "predvidi", "izracunaj"];
export const JEDINICE_P = { W: 1, mW: 1e-3 };
export const JEDINICE_R = { m: 1, cm: 0.01 };
export const JEDINICE_S = { "m²": 1, "cm²": 1e-4 };
export const IKONE = ["uho", "mikrofon"];
const VELICINE_IZR = ["S", "I", "L", "dL"];
const VELICINE_CILJ = ["L", "I", "dL"];
const VELICINE_PROMJENE = ["r", "P", "N"];
const PITAJ_PREDVIDI = ["I", "dL", "L"];
export const L_MAX = 130; // kraj ljestvice (dB); I = 10 W/m²
const N_MAX = 20;

// poznati zvukovi na ljestvici (dB); red 0 iznad trake, 1 ispod, da se natpisi ne preklapaju na mobitelu
export const POZNATI_ZVUKOVI = [
  { L: 0, naziv: "prag čujnosti" },
  { L: 20, naziv: "šapat" },
  { L: 40, naziv: "knjižnica" },
  { L: 60, naziv: "razgovor" },
  { L: 80, naziv: "gust promet" },
  { L: 100, naziv: "motorna pila" },
  { L: 120, naziv: "prag boli" },
];

// ── osnovno ─────────────────────────────────────────────────────────────────────────────────────────
const fP = (s) => JEDINICE_P[s.jedinica_P ?? "W"] ?? 1;
const fR = (s) => JEDINICE_R[s.jedinica_r ?? "m"] ?? 1;
export const jedinicaP = (s) => s.jedinica_P ?? "W";
export const jedinicaR = (s) => s.jedinica_r ?? "m";
const prijamniciOd = (s) => (Array.isArray(s.prijamnici) ? s.prijamnici : []);
const klizaciOd = (s) => (Array.isArray(s.klizaci) ? s.klizaci : []);
const klizacZa = (s, polje) =>
  typeof s[polje] === "string"
    ? klizaciOd(s).find((k) => k?.id === s[polje])
    : null;
const cist = (x) => Number(x.toFixed(10));
const SUB = ["₁", "₂"];

export const intenzitet = (Pw, rm, N = 1) => (N * Pw) / (4 * Math.PI * rm * rm);
export const razina = (I) => 10 * Math.log10(I / I0);
export const intenzitetIzRazine = (L) => I0 * 10 ** (L / 10);

// Stanje widgeta: {P (u jedinica_P), N, r: [r po prijamniku u jedinica_r]}. Klizači daju P i N, vučenje daje r.
export function pocetnoStanje(s) {
  const val = (polje, zadano) => {
    if (typeof s[polje] === "string") {
      const k = klizacZa(s, polje);
      return k ? (isNum(k.pocetak) ? k.pocetak : k.min) : zadano;
    }
    return isNum(s[polje]) ? s[polje] : zadano;
  };
  return {
    P: val("P", 1),
    N: val("N", 1),
    r: prijamniciOd(s).map((p) => p?.r),
  };
}

// Fizika jednog stanja: P u W, r u m; za svaki prijamnik S, I, L, a za dva i ΔL = |L₁ − L₂|.
export function fizikaZvuka(s, st = pocetnoStanje(s)) {
  const P = st.P * fP(s);
  const N = st.N ?? 1;
  const prijamnici = st.r.map((r) => {
    const rm = r * fR(s);
    const S = 4 * Math.PI * rm * rm;
    const I = (N * P) / S;
    return { r, rm, S, I, L: razina(I) };
  });
  const dL =
    prijamnici.length === 2
      ? Math.abs(prijamnici[0].L - prijamnici[1].L)
      : null;
  return { P, N, prijamnici, dL };
}

// ── zapis ───────────────────────────────────────────────────────────────────────────────────────────
const dB = (L) => `${formatNumber(Math.round(L * 100) / 100, 2)}\u00a0dB`;
const dBpredznak = (L) =>
  `${L > 0 ? "+" : ""}${formatNumber(Math.round(L * 100) / 100, 2)}\u00a0dB`;
const tekstI = (I) => `${formatSci(I)}\u00a0W/m²`;
const tekstS = (S) => `${formatSci(S)}\u00a0m²`;
const tekstR = (s, r) => withUnit(r, jedinicaR(s));
const tekstP = (s, P) => withUnit(P, jedinicaP(s));
// omjer kao razlomak kad je to čitljivije (1/4), inače broj
function tekstOmjera(k) {
  if (k >= 1) return formatNumber(Math.round(k * 1000) / 1000);
  const inv = 1 / k;
  if (Math.abs(inv - Math.round(inv)) < 1e-9) return `1/${Math.round(inv)}`;
  return formatNumber(Math.round(k * 10000) / 10000);
}
const oznakaPrijamnika = (s, i) =>
  prijamniciOd(s)[i]?.oznaka ?? (s.ikona === "mikrofon" ? "mikrofon" : "uho");
const sub = (s, i) => (prijamniciOd(s).length > 1 ? SUB[i] : "");

// ── mjerilo i geometrija crteža ─────────────────────────────────────────────────────────────────────
function lijepoGore(x) {
  const e = 10 ** Math.floor(Math.log10(x));
  const m = x / e;
  return cist(
    [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((v) => v >= m - 1e-9) * e,
  );
}
function lijepoDolje(x) {
  const e = 10 ** Math.floor(Math.log10(x));
  const m = x / e;
  return cist([5, 2, 1].find((v) => v <= m + 1e-9) * e);
}

// udaljenosti koje ravnalo mora pokazati: prijamnici, rješenje „postavi“ i položaj nakon promjene u „predvidi“
function potrebneUdaljenosti(s) {
  const r = prijamniciOd(s)
    .map((p) => p?.r)
    .filter(isNum);
  if (s.nacin === "predvidi" && s.promjena?.velicina === "r")
    r.push(...r.map((x) => x * s.promjena.faktor));
  if (s.nacin === "postavi" && s.mijenja !== "P") {
    try {
      r.push(...rjesenjaPostavi(s, { bezRavnala: true }));
    } catch {
      /* neispravan cilj prijavljuje validate */
    }
  }
  return r.filter((x) => isNum(x) && x > 0);
}
export function ravnaloZvuka(s) {
  const r = potrebneUdaljenosti(s);
  const rMax = isNum(s.r_max)
    ? s.r_max
    : lijepoGore(Math.max(1e-6, ...r) * 1.25);
  const korak = isNum(s.korak_r) ? s.korak_r : lijepoDolje(rMax / 160);
  return { rMax, korak };
}

// Virtualno platno 360 × 232: izvor lijevo, zrake prema prijamnicima pod ±20°, ravnalo po osi kroz izvor.
export const PLATNO = { W: 360, H: 232 };
const IZVOR = { x: 34, y: 116 };
const DULJINA = 300; // px za rMax
const KUTOVI = { 1: [-20], 2: [-20, 20] };
const kutPrijamnika = (s, i) => KUTOVI[prijamniciOd(s).length]?.[i] ?? -20;

export function scenaZvuka(s, st = pocetnoStanje(s)) {
  const { rMax, korak } = ravnaloZvuka(s);
  const px = DULJINA / rMax;
  const jed = jedinicaR(s);
  // crtice: velike tako da ih je najviše 8, male na pola
  const velika = [1, 2, 2.5, 5]
    .flatMap((m) => [-3, -2, -1, 0, 1, 2, 3, 4].map((e) => cist(m * 10 ** e)))
    .sort((a, b) => a - b)
    .find((k) => rMax / k <= 8 + 1e-9);
  const crtice = [];
  for (let i = 0; i * (velika / 2) <= rMax + 1e-9; i++) {
    const r = cist((i * velika) / 2);
    const vel = i % 2 === 0;
    crtice.push({
      x: IZVOR.x + r * px,
      velika: vel,
      tekst: vel ? formatNumber(r) : null,
    });
  }
  const prijamnici = st.r.map((r, i) => {
    const kut = kutPrijamnika(s, i);
    const a = (kut * Math.PI) / 180;
    const rPx = r * px;
    return {
      x: IZVOR.x + rPx * Math.cos(a),
      y: IZVOR.y + rPx * Math.sin(a),
      kut,
      rPx,
      // presjek balona s ravnalom: tu se udaljenost čita
      xRavnalo: IZVOR.x + rPx,
      oznaka: oznakaPrijamnika(s, i),
      kratko: `r${sub(s, i)}`,
      rTekst: tekstR(s, r),
    };
  });
  const N = Math.max(1, st.N ?? 1);
  return {
    ...PLATNO,
    // izvor: N jednakih zvučnika (crta se najviše 4) i natpis snage
    izvor: {
      ...IZVOR,
      N,
      tekst:
        N > 1
          ? `${N} izvora, svaki ${tekstP(s, st.P)}`
          : `P = ${tekstP(s, st.P)}`,
    },
    rMax,
    korak,
    pxPoJedinici: px,
    ravnalo: {
      y: IZVOR.y,
      x0: IZVOR.x,
      x1: IZVOR.x + DULJINA,
      jedinica: jed,
      crtice,
    },
    prijamnici,
  };
}

// Točka platna (x, y) → udaljenost prijamnika i (projekcija na njegovu zraku, zaokružena na korak ravnala).
export function rIzTocke(s, i, x, y) {
  const { rMax, korak } = ravnaloZvuka(s);
  const a = (kutPrijamnika(s, i) * Math.PI) / 180;
  const d =
    ((x - IZVOR.x) * Math.cos(a) + (y - IZVOR.y) * Math.sin(a)) *
    (rMax / DULJINA);
  return zaokruziR(s, d, korak, rMax);
}
export function zaokruziR(
  s,
  r,
  korak = ravnaloZvuka(s).korak,
  rMax = ravnaloZvuka(s).rMax,
) {
  return cist(Math.min(rMax, Math.max(korak, Math.round(r / korak) * korak)));
}

// Valne fronte (ukras, ali svjetlina fronte je razina zvuka na tom polumjeru): t u s → [{rPx, svjetlina 0–1}].
export function fronteZvuka(s, st, t) {
  const { rMax } = ravnaloZvuka(s);
  const px = DULJINA / rMax;
  const P = st.P * fP(s);
  const N = st.N ?? 1;
  const RAZMAK = 46;
  const BRZINA = 64; // px/s
  const pomak = (((t * BRZINA) % RAZMAK) + RAZMAK) % RAZMAK;
  const out = [];
  for (let rPx = pomak + 8; rPx < 380; rPx += RAZMAK) {
    const rm = (rPx / px) * fR(s);
    const L = razina(intenzitet(P, rm, N));
    out.push({
      rPx,
      svjetlina: Math.max(0.05, Math.min(1, L / 120)) * Math.min(1, rPx / 30),
    });
  }
  return out;
}

// dB-ljestvica (platno 360 × 86): potencije intenziteta iznad trake, oznake prijamnika (trokuti) tik iznad, traka
// 0–130 dB, ispod brojevi dB i nazivi poznatih zvukova u dva reda (red 0 / 1) da se ne preklapaju na mobitelu.
export const LJESTVICA = { W: 360, H: 86, x0: 18, x1: 342, y: 26, visina: 12 };
export const xNaLjestvici = (L) =>
  LJESTVICA.x0 +
  (Math.max(0, Math.min(L_MAX, L)) / L_MAX) * (LJESTVICA.x1 - LJESTVICA.x0);
export function ljestvicaDb() {
  return {
    ...LJESTVICA,
    zvukovi: POZNATI_ZVUKOVI.map((z, i) => ({
      ...z,
      x: xNaLjestvici(z.L),
      red: i % 2,
      tekst: `${z.naziv} ${z.L}`,
    })),
    intenziteti: [0, 40, 80, 120].map((L) => ({
      x: xNaLjestvici(L),
      tekst: `${formatSci(intenzitetIzRazine(L))}`.replace(/^1·/, ""),
      eksponent: L / 10 - 12, // I = 10^eksponent W/m²
    })),
  };
}

// ── što se vidi (prikaz) ────────────────────────────────────────────────────────────────────────────
// Što je skriveno prije točnog odgovora: u ODGOVOR načinima ni broj, ni oznaka na ljestvici, ni aria tekst ne smiju
// odati traženu vrijednost (ni međukorake iz kojih se dobije bez računa).
export function skrivenoZvuka(s, otkriveno) {
  const n = prijamniciOd(s).length;
  const nista = {
    S: Array(n).fill(false),
    I: Array(n).fill(false),
    L: Array(n).fill(false),
    dL: false,
    poslije: false,
  };
  if (otkriveno || s.nacin === "istrazi") return nista;
  if (s.nacin === "izracunaj")
    return {
      S: Array(n).fill(true),
      I: Array(n).fill(true),
      L: Array(n).fill(true),
      dL: true,
      poslije: false,
    };
  if (s.nacin === "predvidi") return { ...nista, poslije: true };
  // postavi
  if (s.mijenja === "P")
    return {
      S: Array(n).fill(false),
      I: Array(n).fill(true),
      L: Array(n).fill(true),
      dL: false,
      poslije: false,
    };
  const j = mijenjaPrijamnik(s);
  const sakrij = (k) => Array.from({ length: n }, (_, i) => i === j && k);
  return {
    S: sakrij(true),
    I: sakrij(true),
    L: sakrij(true),
    dL: true,
    poslije: false,
  };
}

// Očitanja za jedno stanje: tekstovi ("?" za skriveno), oznake na ljestvici i opis za čitač zaslona.
export function prikazZvuka(s, st, otkriveno = false) {
  const f = fizikaZvuka(s, st);
  const sk = skrivenoZvuka(s, otkriveno);
  const prijamnici = f.prijamnici.map((p, i) => ({
    oznaka: oznakaPrijamnika(s, i),
    indeks: sub(s, i),
    r: tekstR(s, p.r),
    S: sk.S[i] ? "?" : tekstS(p.S),
    I: sk.I[i] ? "?" : tekstI(p.I),
    L: sk.L[i] ? "?" : dB(p.L),
    skriveno: { S: sk.S[i], I: sk.I[i], L: sk.L[i] },
    marker: sk.L[i]
      ? null
      : {
          x: xNaLjestvici(p.L),
          L: p.L,
          tekst: dB(p.L),
          izvan: p.L > L_MAX || p.L < 0,
        },
  }));
  const dLtekst = f.dL == null ? null : sk.dL ? "?" : dB(f.dL);
  const izvor =
    f.N > 1
      ? `${f.N} jednaka izvora, svaki P = ${tekstP(s, st.P)}`
      : `P = ${tekstP(s, st.P)}`;
  const aria = [
    `Točkasti izvor zvuka, ${izvor}.`,
    ...prijamnici.map(
      (p) => `${p.oznaka}: r = ${p.r}, S = ${p.S}, I = ${p.I}, L = ${p.L}.`,
    ),
    dLtekst ? `Razlika razina ΔL = ${dLtekst}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .replaceAll("?", "nepoznato");
  return { izvor, prijamnici, dL: dLtekst, aria };
}

// ── postavi ─────────────────────────────────────────────────────────────────────────────────────────
export const mijenjaPrijamnik = (s) =>
  s.mijenja === "P" ? null : isNum(s.mijenja) ? s.mijenja : 0;
const ciljniPrijamnik = (s) =>
  isNum(s.cilj?.prijamnik) ? s.cilj.prijamnik : (mijenjaPrijamnik(s) ?? 0);
const tolPostavi = (s) =>
  isNum(s.tolerancija)
    ? s.tolerancija
    : s.cilj?.velicina === "I"
      ? Math.abs(s.cilj.vrijednost) * 0.02
      : 0.3;

// vrijednost ciljane veličine kad je kontrola (r prijamnika ili P) na x
function ciljnaVelicina(s, x) {
  const st = pocetnoStanje(s);
  if (s.mijenja === "P") st.P = x;
  else st.r = st.r.map((r, i) => (i === mijenjaPrijamnik(s) ? x : r));
  const f = fizikaZvuka(s, st);
  // dL u „postavi“ ima predznak: za koliko je uho koje se vuče tiše od drugoga
  if (s.cilj.velicina === "dL") {
    const j = mijenjaPrijamnik(s);
    return f.prijamnici[1 - j].L - f.prijamnici[j].L;
  }
  return f.prijamnici[ciljniPrijamnik(s)][s.cilj.velicina];
}

// Sva rješenja „postavi“ (u jedinici kontrole): r prijamnika ili P izvora.
export function rjesenjaPostavi(s, { bezRavnala = false } = {}) {
  const c = s.cilj;
  const st = pocetnoStanje(s);
  const N = st.N ?? 1;
  if (s.mijenja === "P") {
    const rm = st.r[ciljniPrijamnik(s)] * fR(s);
    const I =
      c.velicina === "L" ? intenzitetIzRazine(c.vrijednost) : c.vrijednost;
    return [(I * 4 * Math.PI * rm * rm) / N / fP(s)];
  }
  const j = mijenjaPrijamnik(s);
  let r;
  if (c.velicina === "dL") {
    r = [st.r[1 - j] * 10 ** (c.vrijednost / 20)];
  } else {
    const I =
      c.velicina === "L" ? intenzitetIzRazine(c.vrijednost) : c.vrijednost;
    r = [Math.sqrt((N * st.P * fP(s)) / (4 * Math.PI * I)) / fR(s)];
  }
  if (bezRavnala) return r;
  const { korak, rMax } = ravnaloZvuka(s);
  return r.filter((x) => x >= korak - 1e-12 && x <= rMax + 1e-12);
}
function korakKontrole(s) {
  if (s.mijenja === "P") return klizacZa(s, "P")?.korak ?? 0;
  return ravnaloZvuka(s).korak;
}
function postaviTocno(s, x) {
  const v = ciljnaVelicina(s, x);
  if (Math.abs(v - s.cilj.vrijednost) <= tolPostavi(s) + 1e-12) return true;
  const k = korakKontrole(s);
  return rjesenjaPostavi(s).some((r) => Math.abs(x - r) <= k / 2 + 1e-9);
}
// Tipične krive vrijednosti kontrole (izračun s greškom → tamo bi učenik postavio uho ili snagu).
function kriviPostavi(s) {
  const c = s.cilj;
  const st = pocetnoStanje(s);
  const N = st.N ?? 1;
  const out = [];
  if (s.mijenja === "P") {
    const rm = st.r[ciljniPrijamnik(s)] * fR(s);
    const I =
      c.velicina === "L" ? intenzitetIzRazine(c.vrijednost) : c.vrijednost;
    const P = (x) => x / N / fP(s);
    out.push({
      vrijednost: P(I * Math.PI * rm * rm),
      poruka:
        "To je snaga za plohu πr² (krug). Zvuk se širi na sve strane, pa se snaga razmaže po plohi kugle S = 4πr².",
    });
    out.push({
      vrijednost: P(I * 4 * Math.PI * rm),
      poruka: "U plohi kugle polumjer je na kvadrat: S = 4πr², pa P = I·4πr².",
    });
    if (c.velicina === "L")
      out.push({
        vrijednost: P(I0 * 10 ** c.vrijednost * 4 * Math.PI * rm * rm),
        poruka: "Iz decibela: I = I₀·10^(L/10). Eksponent je L/10, a ne L.",
      });
    return out;
  }
  const j = mijenjaPrijamnik(s);
  if (c.velicina === "dL") {
    const drugi = st.r[1 - j];
    out.push({
      vrijednost: drugi * 10 ** (c.vrijednost / 10),
      poruka: `Intenzitet pada s r², pa je ΔL = 20 log(r₂/r₁). Za ${dB(Math.abs(c.vrijednost))} omjer udaljenosti je 10^(ΔL/20), a ne 10^(ΔL/10).`,
    });
    out.push({
      vrijednost: drugi * 10 ** (-c.vrijednost / 20),
      poruka: `Razlika je dobra, ali na krivu stranu: ovdje je ${oznakaPrijamnika(s, j)} ${c.vrijednost > 0 ? "glasnije" : "tiše"} od drugog uha, a treba biti ${c.vrijednost > 0 ? "tiše" : "glasnije"}.`,
    });
    return out;
  }
  const I =
    c.velicina === "L" ? intenzitetIzRazine(c.vrijednost) : c.vrijednost;
  const P = N * st.P * fP(s);
  out.push({
    vrijednost: Math.sqrt(P / (Math.PI * I)) / fR(s),
    poruka:
      "Ovo je mjesto za plohu πr² (krug). Snaga se razmaže po plohi kugle 4πr², pa je to mjesto dvostruko bliže.",
  });
  if (fP(s) !== 1)
    out.push({
      vrijednost: Math.sqrt((N * st.P) / (4 * Math.PI * I)) / fR(s),
      poruka: `Snagu pretvori u vate: ${tekstP(s, st.P)} = ${formatSci(st.P * fP(s))} W.`,
    });
  if (c.velicina === "L")
    out.push({
      vrijednost:
        Math.sqrt(P / (4 * Math.PI * I0 * 10 ** c.vrijednost)) / fR(s),
      poruka: "Iz decibela: I = I₀·10^(L/10). Eksponent je L/10, a ne L.",
    });
  return out;
}
function checkPostavi(s, x) {
  if (!isNum(x))
    return {
      tocno: false,
      poruka:
        s.mijenja === "P"
          ? "Namjesti snagu izvora klizačem."
          : "Povuci uho (mikrofon) na mjesto.",
      prazno: true,
    };
  if (postaviTocno(s, x)) return { tocno: true };
  const k = korakKontrole(s);
  const blizu = (v, t) =>
    Math.abs(x - v) <= Math.max(k / 2 + 1e-9, Math.abs(v) * 0.02, t ?? 0);
  const iz = [...(s.krivo ?? []), ...kriviPostavi(s)].find(
    (w) =>
      isNum(w.vrijednost) &&
      !postaviTocno(s, w.vrijednost) &&
      blizu(w.vrijednost),
  );
  if (iz) return { tocno: false, poruka: iz.poruka };
  const v = ciljnaVelicina(s, x);
  const vise = v > s.cilj.vrijednost;
  const sto = { L: "razina zvuka", I: "intenzitet", dL: "razlika razina" }[
    s.cilj.velicina
  ];
  if (s.mijenja === "P")
    return {
      tocno: false,
      poruka: `Nije još: uz tu snagu ${sto} je ${vise ? "veća" : "manja"} od tražene. ${vise ? "Smanji" : "Povećaj"} snagu. Pomoć: I = P/(4πr²), a I iz decibela je I₀·10^(L/10).`,
    };
  if (s.cilj.velicina === "dL")
    return {
      tocno: false,
      poruka: `Nije još: ${oznakaPrijamnika(s, mijenjaPrijamnik(s))} je ${vise ? "pretiho" : "preglasno"} u odnosu na drugo uho. ${vise ? "Primakni ga bliže izvoru" : "Odmakni ga dalje od izvora"}. Pomoć: ΔL = 20 log(r₂/r₁).`,
    };
  return {
    tocno: false,
    poruka: `Nije još: ondje je ${vise ? "preglasno" : "pretiho"}. ${vise ? "Odmakni" : "Primakni"} ${oznakaPrijamnika(s, mijenjaPrijamnik(s))} ${vise ? "dalje od" : "bliže"} izvor${vise ? "a" : "u"}. Pomoć: iz L izračunaj I = I₀·10^(L/10), pa r iz I = P/(4πr²).`,
  };
}

// ── predvidi ────────────────────────────────────────────────────────────────────────────────────────
// stanja prije i poslije promjene; prijamnik je jedan
export function predvidiStanja(s) {
  const prije = pocetnoStanje(s);
  const { velicina, faktor } = s.promjena;
  const poslije = {
    ...prije,
    r: velicina === "r" ? prije.r.map((r) => cist(r * faktor)) : prije.r,
    P: velicina === "P" ? cist(prije.P * faktor) : prije.P,
    N: velicina === "N" ? Math.round(prije.N * faktor) : prije.N,
  };
  return { prije, poslije };
}
export function odgovoriPredvidi(s) {
  const { prije, poslije } = predvidiStanja(s);
  const a = fizikaZvuka(s, prije).prijamnici[0];
  const b = fizikaZvuka(s, poslije).prijamnici[0];
  return { I: b.I / a.I, dL: b.L - a.L, L: b.L, L0: a.L };
}
const OZNAKE_PREDVIDI = {
  I: {
    oznaka: "I′ : I",
    naslov: "Omjer intenziteta",
    opis: "novi intenzitet podijeljen starim (npr. 1/4)",
    jedinica: "",
  },
  dL: {
    oznaka: "ΔL",
    naslov: "Promjena razine",
    opis: "za koliko se promijeni razina (minus = tiše)",
    jedinica: "dB",
  },
  L: {
    oznaka: "L′",
    naslov: "Nova razina",
    opis: "razina zvuka nakon promjene",
    jedinica: "dB",
  },
};
export const pitajPredvidi = (s) =>
  Array.isArray(s.pitaj) ? s.pitaj : ["I", "dL"];
export function poljaPredvidi(s) {
  return pitajPredvidi(s).map((v) => ({
    kljuc: v,
    ...OZNAKE_PREDVIDI[v],
    predznak: v === "dL", // uvijek: ± samo kad razina pada odao bi „tiše“
    znanstveni: false,
  }));
}
// Tablica „prije / poslije“ i oznake na ljestvici; stanje poslije je skriveno do točnog odgovora.
export function prikazPredvidi(s, otkriveno = false) {
  const { prije, poslije } = predvidiStanja(s);
  const sk = skrivenoZvuka(s, otkriveno).poslije;
  const a = fizikaZvuka(s, prije).prijamnici[0];
  const b = fizikaZvuka(s, poslije).prijamnici[0];
  const vel = s.promjena.velicina;
  const prvi =
    vel === "r"
      ? {
          naziv: "udaljenost",
          oznaka: "r",
          prije: tekstR(s, prije.r[0]),
          poslije: tekstR(s, poslije.r[0]),
        }
      : vel === "P"
        ? {
            naziv: "snaga izvora",
            oznaka: "P",
            prije: tekstP(s, prije.P),
            poslije: tekstP(s, poslije.P),
          }
        : {
            naziv: "broj izvora",
            oznaka: "N",
            prije: String(prije.N),
            poslije: String(poslije.N),
          };
  const redovi = [
    prvi,
    {
      naziv: "intenzitet",
      oznaka: "I",
      prije: tekstI(a.I),
      poslije: sk ? "?" : tekstI(b.I),
    },
    {
      naziv: "razina",
      oznaka: "L",
      prije: dB(a.L),
      poslije: sk ? "?" : dB(b.L),
    },
  ];
  const markeri = [
    { x: xNaLjestvici(a.L), L: a.L, tekst: dB(a.L), izvan: !uRasponu(a.L) },
    sk
      ? null
      : { x: xNaLjestvici(b.L), L: b.L, tekst: dB(b.L), izvan: !uRasponu(b.L) },
  ];
  const aria = `Prije: ${redovi.map((r) => `${r.naziv} ${r.prije}`).join(", ")}. Poslije: ${redovi
    .map((r) => `${r.naziv} ${r.poslije}`)
    .join(", ")
    .replaceAll("?", "nepoznato")}.`;
  return { redovi, markeri, aria, stanja: { prije, poslije } };
}

export function opisPromjene(s) {
  const { velicina, faktor } = s.promjena;
  const { prije, poslije } = predvidiStanja(s);
  if (velicina === "r")
    return `udaljenost ${tekstR(s, prije.r[0])} → ${tekstR(s, poslije.r[0])}`;
  if (velicina === "P")
    return `snaga ${tekstP(s, prije.P)} → ${tekstP(s, poslije.P)}`;
  return `broj jednakih izvora ${prije.N} → ${poslije.N} (faktor ${formatNumber(faktor)})`;
}
function kriviPredvidi(s, v) {
  const { velicina, faktor: f } = s.promjena;
  const o = odgovoriPredvidi(s);
  const out = [];
  const add = (vrijednost, poruka, tolerancija) =>
    isNum(vrijednost) && out.push({ vrijednost, poruka, tolerancija });
  const dalje = velicina === "r";
  if (v === "I") {
    if (dalje) {
      add(
        1 / f,
        "Intenzitet ne pada s r nego s r²: ploha balona je 4πr². Dvaput dalje → četiri puta veća ploha → četvrtina intenziteta.",
      );
      add(
        f * f,
        f > 1
          ? "Uho je dalje, pa je intenzitet manji: omjer novog i starog je manji od 1."
          : "Uho je bliže, pa je intenzitet veći: omjer je veći od 1.",
      );
      add(f, "Intenzitet je obrnuto razmjeran s r²: I′/I = (r/r′)².");
    } else {
      add(
        1 / f,
        "Veća snaga daje veći intenzitet: I je razmjeran snazi (i broju izvora), pa je omjer jednak faktoru promjene.",
      );
      add(
        f * f,
        "Snaga (broj izvora) ulazi u I = N·P/(4πr²) linearno, bez kvadrata.",
      );
    }
    return out;
  }
  const d = o.dL;
  if (v === "dL") {
    add(
      -d,
      d < 0
        ? "Pazi na predznak: zvuk je tiši, pa je promjena razine negativna."
        : "Pazi na predznak: zvuk je jači, pa je promjena razine pozitivna.",
    );
    if (dalje)
      add(
        d / 2,
        "Intenzitet pada s r², pa se razina mijenja za 20 log(r/r′), a ne za 10 log(r/r′).",
      );
    add(
      o.L0 * (o.I - 1),
      "Decibeli nisu razmjerni intenzitetu: kad se I promijeni k puta, razina se promijeni za 10 log k decibela.",
    );
    add(
      d * Math.LN10,
      "Upotrijebio si ln. Ovdje treba dekadski logaritam (log).",
    );
    return out;
  }
  // L
  add(
    o.L0 - d,
    "Pazi na smjer: provjeri je li zvuk tiši ili jači, pa dodaj ili oduzmi promjenu.",
  );
  if (dalje)
    add(
      o.L0 + d / 2,
      "Intenzitet pada s r², pa se razina mijenja za 20 log(r/r′), a ne za 10 log(r/r′).",
    );
  add(
    o.L0 * o.I,
    "Decibeli nisu razmjerni intenzitetu: nova razina je L + 10 log(I′/I), a ne L·(I′/I).",
  );
  return out;
}
const tolPredvidi = (v, o) => (v === "I" ? Math.abs(o.I) * 0.01 : 0.1);
function checkPredvidi(s, odg) {
  const o = odgovoriPredvidi(s);
  const pitaj = pitajPredvidi(s);
  const vals = pitaj.map((v) => odg?.[v] ?? "");
  const prazno = vals.findIndex((x) => !String(x).trim());
  if (prazno >= 0)
    return {
      tocno: false,
      poruka: pitaj.length > 1 ? "Upiši sve odgovore." : "Upiši odgovor.",
      prazno: true,
      polje: prazno,
    };
  for (let i = 0; i < pitaj.length; i++) {
    const v = pitaj[i];
    const r = checkNumber({
      input: vals[i],
      answer: o[v],
      tol: tolPredvidi(v, o),
      unit: OZNAKE_PREDVIDI[v].jedinica,
      krivo: bezTocnog(kriviPredvidi(s, v), o[v], tolPredvidi(v, o)),
      savjet:
        v === "I"
          ? "Nije točno. Intenzitet: I = N·P/(4πr²). Usporedi novi i stari: I′ : I."
          : "Nije točno. Razina se promijeni za ΔL = 10 log(I′/I).",
    });
    if (!r.tocno)
      return {
        ...r,
        polje: i,
        poruka:
          pitaj.length > 1
            ? `**${OZNAKE_PREDVIDI[v].naslov}**: ${r.poruka}`
            : r.poruka,
      };
  }
  return { tocno: true };
}

// ── izracunaj ───────────────────────────────────────────────────────────────────────────────────────
const prijamnikPitanja = (s, p) => (isNum(p.prijamnik) ? p.prijamnik : 0);
export function oznakaPitanja(s, p) {
  if (p.velicina === "dL")
    return { oznaka: "ΔL", opis: "razlika razina", jedinica: "dB" };
  const i = prijamnikPitanja(s, p);
  const ime = oznakaPrijamnika(s, i);
  const opis = {
    S: `ploha balona do: ${ime}`,
    I: `intenzitet (${ime})`,
    L: `razina zvuka (${ime})`,
  }[p.velicina];
  const jedinica = { S: p.jedinica ?? "m²", I: "W/m²", L: "dB" }[p.velicina];
  return { oznaka: `${p.velicina}${sub(s, i)}`, opis, jedinica };
}
const bezTocnog = (krivo, a, tol) =>
  krivo.filter(
    (k) =>
      isNum(k.vrijednost) &&
      Math.abs(k.vrijednost - a) >
        Math.max(tol * 1.5, Math.abs(k.vrijednost) * 1e-6),
  );

export function izracunPitanja(s, p) {
  const st = pocetnoStanje(s);
  const f = fizikaZvuka(s, st);
  const { oznaka, jedinica } = oznakaPitanja(s, p);
  const k = [];
  const add = (vrijednost, poruka, tolerancija) =>
    isNum(vrijednost) && k.push({ vrijednost, poruka, tolerancija });
  const P = f.P;
  const N = f.N;
  const Praw = st.P;
  const pretvoriR = fR(s) !== 1;
  const pretvoriP = fP(s) !== 1;
  const porukaR = (r) =>
    `Udaljenost pretvori u metre prije računa: ${tekstR(s, r)} = ${withUnit(r * fR(s), "m")}.`;
  const porukaP = `Snagu pretvori u vate: ${tekstP(s, Praw)} = ${formatSci(P)} W.`;

  if (p.velicina === "dL") {
    // krive vrijednosti u dB: apsolutna tolerancija (0,5 % od 0,33 dB bilo bi premalo za zapis s dvije decimale)
    const addDb = (v, poruka) =>
      add(v, poruka, Math.max(0.01, Math.abs(v) * 0.03));
    const [a, b] = f.prijamnici;
    const omjer = Math.max(a.rm, b.rm) / Math.min(a.rm, b.rm);
    const dL = f.dL;
    addDb(
      10 * Math.log10(omjer),
      "Intenzitet ovisi o r², pa je ΔL = 10 log(r₂²/r₁²) = 20 log(r₂/r₁). Ti si izostavio kvadrat.",
    );
    addDb(
      10 * Math.log10(Math.abs(a.I - b.I) / I0),
      "Decibeli se ne računaju iz razlike intenziteta. Izračunaj L₁ i L₂ posebno pa ih oduzmi.",
    );
    addDb(
      20 * Math.log(omjer),
      "Upotrijebio si ln. U L = 10 log(I/I₀) je dekadski logaritam (tipka log).",
    );
    add(
      Math.max(a.I, b.I) / Math.min(a.I, b.I),
      "To je omjer intenziteta I₁/I₂. Razlika razina u decibelima je 10 log(I₁/I₂), odnosno L₁ − L₂.",
    );
    addDb(
      -dL,
      "Razlika razina je pozitivan broj: od veće razine (bliže uho) oduzmi manju.",
    );
    const tol = isNum(p.tolerancija)
      ? p.tolerancija
      : Math.max(0.01, dL * 0.02);
    const krivo = bezTocnog(k, dL, tol);
    // blizu, ali zaokruženo prerano: razlike su male, pa dvije decimale u L₁ i L₂ znače puno
    krivo.push({
      vrijednost: dL,
      tolerancija: Math.max(0.1, dL * 0.15),
      poruka:
        "Blizu, ali prerano si zaokružio. Razlika je mala, pa L₁ i L₂ računaj s dvije decimale (ili izravno ΔL = 20 log(r₂/r₁)).",
    });
    return {
      vrijednost: dL,
      jedinica,
      oznaka,
      tol,
      krivo: [...(p.krivo ?? []), ...krivo],
    };
  }

  const pr = f.prijamnici[prijamnikPitanja(s, p)];
  const rm = pr.rm;
  const rraw = pr.r;
  if (p.velicina === "S") {
    const fs = 1 / JEDINICE_S[jedinica];
    add(
      Math.PI * rm * rm * fs,
      "To je površina kruga πr². Zvuk se širi na sve strane, pa je ploha balona (kugle) S = 4πr².",
    );
    add(4 * Math.PI * rm * fs, "Polumjer treba kvadrirati: S = 4πr².");
    add(
      (4 / 3) * Math.PI * rm ** 3 * fs,
      "To je obujam kugle. Treba ploha (oplošje) kugle: S = 4πr².",
    );
    add(
      2 * Math.PI * rm * fs,
      "To je opseg kružnice. Treba ploha kugle: S = 4πr².",
    );
    if (pretvoriR && jedinica === "m²")
      add(4 * Math.PI * rraw * rraw, porukaR(rraw));
    const tol = isNum(p.tolerancija) ? p.tolerancija : pr.S * fs * 0.01;
    return {
      vrijednost: pr.S * fs,
      jedinica,
      oznaka,
      tol,
      krivo: [...(p.krivo ?? []), ...bezTocnog(k, pr.S * fs, tol)],
    };
  }

  // krivi intenziteti, zajednički za I i L
  const krivoI = [];
  const addI = (I, poruka) => krivoI.push({ I, poruka });
  addI(
    (N * P) / (Math.PI * rm * rm),
    "Uzeo si πr² (krug). Zvuk se širi na sve strane, pa je ploha balona 4πr².",
  );
  addI(
    (N * P) / (4 * Math.PI * rm),
    "U nazivniku polumjer treba kvadrirati: I = P/(4πr²).",
  );
  if (pretvoriR) addI((N * P) / (4 * Math.PI * rraw * rraw), porukaR(rraw));
  if (pretvoriP) addI((N * Praw) / (4 * Math.PI * rm * rm), porukaP);
  if (pretvoriR && pretvoriP)
    addI(
      (N * Praw) / (4 * Math.PI * rraw * rraw),
      "Pretvori snagu u vate i udaljenost u metre prije računa.",
    );
  if (N > 1)
    addI(
      P / (4 * Math.PI * rm * rm),
      `Izvora je ${N}: njihovi se intenziteti zbrajaju, I = N·P/(4πr²).`,
    );

  if (p.velicina === "I") {
    krivoI.forEach((x) => add(x.I, x.poruka));
    const tol = isNum(p.tolerancija) ? p.tolerancija : pr.I * 0.01;
    const krivo = bezTocnog(k, pr.I, tol);
    krivo.push({
      vrijednost: pr.I,
      tolerancija: pr.I * 0.05,
      poruka:
        "Blizu, ali prerano si zaokružio. Zaokruži tek rezultat, na tri značajne znamenke.",
    });
    return {
      vrijednost: pr.I,
      jedinica,
      oznaka,
      tol,
      krivo: [...(p.krivo ?? []), ...krivo],
    };
  }

  // L (krive razine s apsolutnom tolerancijom 0,1 dB)
  const L = pr.L;
  const add0 = add;
  const addL = (v, poruka) => add0(v, poruka, 0.1);
  krivoI.forEach((x) => addL(razina(x.I), x.poruka));
  addL(
    10 * Math.log(pr.I / I0),
    "Upotrijebio si ln. U L = 10 log(I/I₀) je dekadski logaritam (tipka log).",
  );
  addL(
    Math.log10(pr.I / I0),
    "Zaboravio si pomnožiti s 10: log(I/I₀) daje bele, a decibel je deseti dio bela, L = 10 log(I/I₀).",
  );
  addL(
    10 * Math.log10(pr.I),
    "Intenzitet prvo podijeli pragom čujnosti I₀ = 10⁻¹² W/m², pa tek onda logaritmiraj.",
  );
  addL(
    20 * Math.log10(pr.I / I0),
    "Za intenzitet je faktor 10, a ne 20: L = 10 log(I/I₀).",
  );
  addL(-L, "Razlomak je obrnut: L = 10 log(I/I₀), intenzitet je u brojniku.");
  const tol = isNum(p.tolerancija) ? p.tolerancija : 0.05;
  const krivo = bezTocnog(k, L, tol);
  krivo.push({
    vrijednost: L,
    tolerancija: 0.3,
    poruka:
      "Blizu, ali prerano si zaokružio. Intenzitet uzmi s tri značajne znamenke, a razinu zaokruži na dvije decimale.",
  });
  return {
    vrijednost: L,
    jedinica,
    oznaka,
    tol,
    krivo: [...(p.krivo ?? []), ...krivo],
  };
}
export function poljaIzracunaj(s) {
  return (s.pitaj ?? []).map((p) => {
    const o = oznakaPitanja(s, p);
    const r = izracunPitanja(s, p);
    return {
      ...o,
      predznak: false,
      znanstveni:
        r.vrijednost !== 0 &&
        (Math.abs(r.vrijednost) < 1e-3 || Math.abs(r.vrijednost) >= 1e6),
    };
  });
}
function checkIzracunaj(s, odg) {
  const pitaj = s.pitaj;
  const vals = pitaj.map((_, i) => (Array.isArray(odg) ? (odg[i] ?? "") : ""));
  const prazno = vals.findIndex((x) => !String(x).trim());
  if (prazno >= 0)
    return {
      tocno: false,
      poruka: pitaj.length > 1 ? "Upiši sve odgovore." : "Upiši odgovor.",
      prazno: true,
      polje: prazno,
    };
  for (let i = 0; i < pitaj.length; i++) {
    const r = izracunPitanja(s, pitaj[i]);
    const ch = checkNumber({
      input: vals[i],
      answer: r.vrijednost,
      tol: r.tol,
      unit: r.jedinica,
      krivo: r.krivo,
      savjet: {
        S: "Nije točno. Ploha balona (kugle) je S = 4πr², r u metrima.",
        I: "Nije točno. I = P/(4πr²): snaga u vatima, r u metrima.",
        L: "Nije točno. L = 10 log(I/I₀), uz I₀ = 10⁻¹² W/m².",
        dL: "Nije točno. ΔL = L₁ − L₂ (veća razina minus manja).",
      }[pitaj[i].velicina],
    });
    if (!ch.tocno)
      return {
        ...ch,
        polje: i,
        poruka: pitaj.length > 1 ? `**${r.oznaka}**: ${ch.poruka}` : ch.poruka,
      };
  }
  return { tocno: true };
}
const zapisVrijednosti = (v, jedinica) =>
  jedinica === "dB"
    ? dB(v)
    : `${formatSci(v)}${jedinica ? `\u00a0${jedinica}` : ""}`;

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Razina zvuka točkastog izvora (fizika, matura): izvor u središtu „balona“ (kugle) S = 4πr², I = N·P/S, L = 10 log(I/I₀), I₀ = 10⁻¹² W/m² (log je dekadski). Uživo S, I i L za jedno ili dva uha / mikrofona i dB-ljestvica s poznatim zvukovima (šapat 20, razgovor 60, promet 80, prag boli 120 dB).
Polja: tekst, nacin, P (snaga jednog izvora, broj ili id klizača), jedinica_P? ("W" zadano | "mW"), N? (broj jednakih izvora, zadano 1; broj ili id klizača), prijamnici: [{oznaka (kratko, npr. "bliže uho"), r}] (1–2; r u jedinica_r), jedinica_r? ("m" zadano | "cm"), ikona? ("uho" zadano | "mikrofon"), r_max? (duljina ravnala; zadano oko 1,25 × najveća udaljenost), korak_r? (korak vučenja; zadano r_max/160 zaokruženo).
Razina u svakom prijamniku mora biti 0–130 dB (I od 10⁻¹² do 10 W/m²).
Načini:
- "istrazi" (Istraži): uši se vuku po zrakama, klizači? [{id (iz P ili N), oznaka?, min, max, korak, pocetak?}] (najviše 2). Uvid: ΔL između dvaju ušiju ne ovisi o snazi izvora.
- "postavi" (Tvoj red): mijenja? (0 | 1 = indeks uha koje se vuče, zadano 0; "P" = klizač snage, tada P je id klizača), cilj: {velicina: "L" | "I" | "dL", vrijednost (dB ili W/m²), prijamnik? (indeks; zadano uho koje se vuče)}; "dL" traži dva uha i vučenje uha (ne ovisi o P), a vrijednost je za koliko je uho koje se vuče tiše od drugoga (minus = glasnije). Tražena veličina i ono iz čega se odmah dobije (S, I, L tog uha, ΔL) skriveni su do točnog odgovora. Točno: unutar tolerancija? (zadano 0,3 dB, za I 2 %) ili pola koraka od rješenja. Poruke za πr², mW nepretvorene, I = I₀·10^L i 10^(ΔL/10) dodaju se same; krivo?: [{vrijednost (r u jedinica_r ili P), poruka}].
- "predvidi" (Tvoj red): jedno uho; promjena: {velicina: "r" | "P" | "N", faktor} (npr. r × 2); pitaj? ⊂ ["I", "dL", "L"] (zadano ["I", "dL"]): I = omjer I′ : I (npr. 1/4), dL = promjena razine u dB s predznakom (−6,02), L = nova razina. Vidi se stanje prije; stanje poslije je skriveno do točnog odgovora. Automatske poruke: I ∝ 1/r umjesto 1/r², predznak, „decibeli razmjerni intenzitetu“, 10 log umjesto 20 log, ln.
- "izracunaj" (Tvoj red): pitaj: [{velicina: "S" | "I" | "L" | "dL", prijamnik? (indeks, obavezan uz dva uha osim za dL), jedinica? (za S: "m²" | "cm²"), tolerancija?, krivo?}] (1–3). Svi izvedeni iznosi su skriveni do točnog odgovora. Tolerancija: L 0,05 dB, ΔL 0,01 dB ili 2 %, S i I 1 %. Automatske krive vrijednosti: πr² (+6 dB), 4πr, obujam kugle, cm i mW nepretvoreni (−40 / +30 dB), ln, bez faktora 10, bez I₀, 20 log, ΔL bez kvadrata (10 log(r₂/r₁)), ΔL iz razlike intenziteta, prerano zaokruženo.`;

const PRIMJER = {
  tip: TIP,
  nacin: "izracunaj",
  tekst:
    "Točkasti izvor zvuka ima snagu 2 mW. Jedno uho je 50 cm od izvora, a drugo 54 cm. Kolike su razine zvuka kod ušiju i kolika je razlika među njima?",
  P: 2,
  jedinica_P: "mW",
  jedinica_r: "cm",
  prijamnici: [
    { oznaka: "bliže uho", r: 50 },
    { oznaka: "dalje uho", r: 54 },
  ],
  pitaj: [
    { velicina: "L", prijamnik: 0 },
    { velicina: "L", prijamnik: 1 },
    { velicina: "dL" },
  ],
};

const PRIMJERI = [
  {
    tip: TIP,
    nacin: "istrazi",
    tekst:
      "Izvor snage 4 mW, uši na 60 cm i 63 cm (zadatak 1116). **Mijenjaj snagu** i gledaj obje razine i razliku ΔL. Zatim povuci uši bliže ili dalje.",
    P: "P",
    jedinica_P: "mW",
    jedinica_r: "cm",
    prijamnici: [
      { oznaka: "bliže uho", r: 60 },
      { oznaka: "dalje uho", r: 63 },
    ],
    klizaci: [
      {
        id: "P",
        oznaka: "snaga izvora $P$",
        min: 0.5,
        max: 20,
        korak: 0.5,
        pocetak: 4,
        jedinica: "mW",
      },
    ],
  },
  {
    tip: TIP,
    nacin: "izracunaj",
    tekst:
      "Izvor snage 1,6 mW, uši na 45 cm i 48 cm (zadatak 1117). Koliki je intenzitet zvuka kod svakog uha?",
    P: 1.6,
    jedinica_P: "mW",
    jedinica_r: "cm",
    prijamnici: [
      { oznaka: "bliže uho", r: 45 },
      { oznaka: "dalje uho", r: 48 },
    ],
    pitaj: [
      { velicina: "I", prijamnik: 0 },
      { velicina: "I", prijamnik: 1 },
    ],
  },
  {
    tip: TIP,
    nacin: "izracunaj",
    tekst:
      "Izvor snage 3,2 mW, uho je 70 cm od njega (zadatak 1118). Kolika je ploha balona kroz koji prolazi zvuk do uha i kolika je razina zvuka kod uha?",
    P: 3.2,
    jedinica_P: "mW",
    jedinica_r: "cm",
    prijamnici: [{ oznaka: "uho", r: 70 }],
    pitaj: [
      { velicina: "S", prijamnik: 0 },
      { velicina: "L", prijamnik: 0 },
    ],
  },
  {
    tip: TIP,
    nacin: "izracunaj",
    tekst:
      "Izvor snage 2,5 mW, uši na 80 cm i 86 cm (zadatak 1119). Kolika je razlika razina zvuka među ušima?",
    P: 2.5,
    jedinica_P: "mW",
    jedinica_r: "cm",
    prijamnici: [
      { oznaka: "bliže uho", r: 80 },
      { oznaka: "dalje uho", r: 86 },
    ],
    pitaj: [{ velicina: "dL" }],
  },
  {
    tip: TIP,
    nacin: "predvidi",
    tekst:
      "Izvor snage 2 mW, uho je 50 cm od njega. Osoba se **odmakne na 100 cm**. Koliko se puta promijeni intenzitet, za koliko razina i kolika je nova razina?",
    P: 2,
    jedinica_P: "mW",
    jedinica_r: "cm",
    prijamnici: [{ oznaka: "uho", r: 50 }],
    promjena: { velicina: "r", faktor: 2 },
    pitaj: ["I", "dL", "L"],
  },
  {
    tip: TIP,
    nacin: "predvidi",
    tekst:
      "Zvučnik snage 3,2 mW, mikrofon je 70 cm od njega. Do prvog zvučnika stavimo **još jedan jednak**. Koliko se puta promijeni intenzitet i za koliko razina zvuka?",
    P: 3.2,
    jedinica_P: "mW",
    jedinica_r: "cm",
    ikona: "mikrofon",
    prijamnici: [{ oznaka: "mikrofon", r: 70 }],
    promjena: { velicina: "N", faktor: 2 },
  },
  {
    tip: TIP,
    nacin: "postavi",
    tekst:
      "Izvor ima snagu 2 mW. Povuci uho na mjesto gdje je razina zvuka **80 dB**.",
    P: 2,
    jedinica_P: "mW",
    jedinica_r: "cm",
    prijamnici: [{ oznaka: "uho", r: 50 }],
    cilj: { velicina: "L", vrijednost: 80 },
  },
  {
    tip: TIP,
    nacin: "postavi",
    tekst:
      "Bliže uho je 50 cm od izvora snage 2 mW. Povuci **dalje uho** tako da čuje razinu **6 dB nižu** od bližeg.",
    P: 2,
    jedinica_P: "mW",
    jedinica_r: "cm",
    r_max: 200,
    prijamnici: [
      { oznaka: "bliže uho", r: 50 },
      { oznaka: "dalje uho", r: 60 },
    ],
    mijenja: 1,
    cilj: { velicina: "dL", vrijednost: 6 },
  },
  {
    tip: TIP,
    nacin: "postavi",
    tekst:
      "Uho je 50 cm od izvora. Namjesti **snagu izvora** tako da razina zvuka kod uha bude **90 dB**.",
    P: "P",
    jedinica_P: "mW",
    jedinica_r: "cm",
    prijamnici: [{ oznaka: "uho", r: 50 }],
    mijenja: "P",
    klizaci: [
      {
        id: "P",
        oznaka: "snaga izvora $P$",
        min: 0.5,
        max: 10,
        korak: 0.1,
        pocetak: 1,
        jedinica: "mW",
      },
    ],
    cilj: { velicina: "L", vrijednost: 90, prijamnik: 0 },
  },
];

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
const ZAJEDNICKA = [
  "tip",
  "nacin",
  "tekst",
  "P",
  "jedinica_P",
  "N",
  "prijamnici",
  "jedinica_r",
  "ikona",
  "r_max",
  "korak_r",
];
const PO_NACINU = {
  istrazi: ["klizaci"],
  postavi: ["klizaci", "mijenja", "cilj", "tolerancija", "krivo"],
  predvidi: ["promjena", "pitaj"],
  izracunaj: ["pitaj"],
};
const uRasponu = (L) => L >= -1e-9 && L <= L_MAX + 1e-9;

function validateKlizaci(s, need) {
  if (s.klizaci == null) return;
  if (
    !need(
      Array.isArray(s.klizaci) &&
        s.klizaci.length >= 1 &&
        s.klizaci.length <= 2,
      "klizaci mora biti popis od 1 do 2 klizača",
    )
  )
    return;
  s.klizaci.forEach((k, i) => {
    const at = `klizaci[${i}]`;
    if (!need(k && typeof k === "object", `${at} mora biti objekt`)) return;
    need(isText(k.id), `${at}.id mora biti tekst`);
    need(
      s.P === k.id || s.N === k.id,
      `${at}.id „${k.id}“ ne koristi nijedno polje (P ili N mora biti „${k.id}“)`,
    );
    for (const f of Object.keys(k))
      need(
        ["id", "oznaka", "min", "max", "korak", "pocetak", "jedinica"].includes(
          f,
        ),
        `${at}: nepoznato polje „${f}“`,
      );
    if (k.oznaka != null)
      need(isText(k.oznaka), `${at}.oznaka mora biti tekst`);
    const ok =
      need(
        isNum(k.min) && isNum(k.max) && k.min > 0 && k.max > k.min,
        `${at}: min i max moraju biti brojevi, 0 < min < max`,
      ) &&
      need(
        isNum(k.korak) && k.korak > 0 && k.korak <= (k.max - k.min) / 4,
        `${at}.korak mora biti pozitivan i najviše četvrtina raspona`,
      );
    if (ok && k.pocetak != null)
      need(
        isNum(k.pocetak) && k.pocetak >= k.min && k.pocetak <= k.max,
        `${at}.pocetak mora biti između min i max`,
      );
    if (ok && s.N === k.id)
      need(
        Number.isInteger(k.min) &&
          Number.isInteger(k.max) &&
          Number.isInteger(k.korak) &&
          k.max <= N_MAX,
        `${at}: broj izvora ide u cijelim brojevima, 1–${N_MAX}`,
      );
    if (ok && s.P === k.id && k.jedinica != null)
      need(
        k.jedinica === jedinicaP(s),
        `${at}.jedinica mora biti jedinica_P (${jedinicaP(s)})`,
      );
  });
  const ids = s.klizaci.map((k) => k?.id);
  need(
    new Set(ids).size === ids.length,
    "klizaci: id-jevi se ne smiju ponavljati",
  );
}

export function validateRazinaZvuka(s) {
  const { list, need } = problems();
  if (
    !need(
      NACINI.includes(s.nacin),
      `razina_zvuka.nacin mora biti jedan od: ${NACINI.join(", ")}`,
    )
  )
    return list;
  need(isText(s.tekst), "razina_zvuka treba „tekst“");
  const dozvoljena = [...ZAJEDNICKA, ...PO_NACINU[s.nacin]];
  for (const f of Object.keys(s))
    need(
      dozvoljena.includes(f),
      `polje „${f}“ ne postoji u načinu ${s.nacin} (polja: ${dozvoljena.join(", ")})`,
    );
  if (s.jedinica_P != null)
    need(
      s.jedinica_P in JEDINICE_P,
      `jedinica_P mora biti ${Object.keys(JEDINICE_P).join(" ili ")}`,
    );
  if (s.jedinica_r != null)
    need(
      s.jedinica_r in JEDINICE_R,
      `jedinica_r mora biti ${Object.keys(JEDINICE_R).join(" ili ")}`,
    );
  if (s.ikona != null)
    need(IKONE.includes(s.ikona), `ikona mora biti ${IKONE.join(" ili ")}`);

  const smijeKlizace =
    s.nacin === "istrazi" || (s.nacin === "postavi" && s.mijenja === "P");
  if (smijeKlizace) validateKlizaci(s, need);
  else
    need(
      s.klizaci == null,
      'klizači postoje samo u istrazi i u postavi s mijenja: "P"',
    );
  if (typeof s.P === "string")
    need(
      smijeKlizace && !!klizacZa(s, "P"),
      `P „${s.P}“ nije id nijednog klizača`,
    );
  else
    need(
      isNum(s.P) && s.P * fP(s) >= 1e-9 && s.P * fP(s) <= 1e5,
      "P mora biti snaga od 10⁻⁹ do 10⁵ W (u jedinica_P)",
    );
  if (typeof s.N === "string")
    need(
      smijeKlizace && !!klizacZa(s, "N"),
      `N „${s.N}“ nije id nijednog klizača`,
    );
  else if (s.N != null)
    need(
      Number.isInteger(s.N) && s.N >= 1 && s.N <= N_MAX,
      `N mora biti cijeli broj od 1 do ${N_MAX}`,
    );
  if (s.nacin === "postavi" && s.mijenja === "P")
    need(
      typeof s.P === "string",
      'uz mijenja: "P" polje P mora biti id klizača snage',
    );

  const pr = prijamniciOd(s);
  if (
    !need(
      Array.isArray(s.prijamnici) && pr.length >= 1 && pr.length <= 2,
      "prijamnici mora biti popis od 1 do 2 prijamnika {oznaka, r}",
    )
  )
    return list;
  pr.forEach((p, i) => {
    const at = `prijamnici[${i}]`;
    if (!need(p && typeof p === "object", `${at} mora biti objekt {oznaka, r}`))
      return;
    for (const f of Object.keys(p))
      need(
        ["oznaka", "r"].includes(f),
        `${at}: nepoznato polje „${f}“ (samo oznaka i r)`,
      );
    need(
      isText(p.oznaka) && p.oznaka.length <= 24,
      `${at}.oznaka mora biti kratak tekst (do 24 znaka), npr. „bliže uho“`,
    );
    need(
      isNum(p.r) && p.r > 0,
      `${at}.r mora biti pozitivan broj (u ${jedinicaR(s)})`,
    );
  });
  if (pr.length === 2 && isText(pr[0]?.oznaka))
    need(
      pr[0].oznaka !== pr[1]?.oznaka,
      "prijamnici moraju imati različite oznake",
    );
  if (list.length) return list;

  if (s.r_max != null)
    need(isNum(s.r_max) && s.r_max > 0, "r_max mora biti pozitivan broj");
  if (s.korak_r != null)
    need(isNum(s.korak_r) && s.korak_r > 0, "korak_r mora biti pozitivan broj");
  if (list.length) return list;

  // nacin-specifično (prije ravnala, jer ravnalo ovisi o rješenju „postavi“ i faktoru „predvidi“)
  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
  }
  if (s.nacin === "postavi") {
    need(
      s.mijenja == null ||
        s.mijenja === "P" ||
        (Number.isInteger(s.mijenja) &&
          s.mijenja >= 0 &&
          s.mijenja < pr.length),
      `mijenja mora biti indeks uha (0${pr.length > 1 ? " ili 1" : ""}) ili "P"`,
    );
    const c = s.cilj;
    if (
      need(
        c && typeof c === "object",
        "postavi treba cilj: {velicina, vrijednost, prijamnik?}",
      )
    ) {
      for (const f of Object.keys(c))
        need(
          ["velicina", "vrijednost", "prijamnik"].includes(f),
          `cilj: nepoznato polje „${f}“`,
        );
      need(
        VELICINE_CILJ.includes(c.velicina),
        `cilj.velicina mora biti ${VELICINE_CILJ.join(", ")}`,
      );
      if (c.prijamnik != null)
        need(
          Number.isInteger(c.prijamnik) &&
            c.prijamnik >= 0 &&
            c.prijamnik < pr.length,
          "cilj.prijamnik mora biti indeks uha",
        );
      if (c.velicina === "L")
        need(
          isNum(c.vrijednost) && uRasponu(c.vrijednost),
          "cilj.vrijednost za L mora biti 0–130 dB",
        );
      if (c.velicina === "I")
        need(
          isNum(c.vrijednost) && c.vrijednost >= I0 && c.vrijednost <= 10,
          "cilj.vrijednost za I mora biti 10⁻¹² – 10 W/m²",
        );
      if (c.velicina === "dL") {
        need(pr.length === 2, "cilj dL traži dva uha");
        need(
          s.mijenja !== "P",
          "ΔL ne ovisi o snazi izvora, pa se ne može postaviti klizačem P; neka se vuče uho",
        );
        need(
          isNum(c.vrijednost) &&
            Math.abs(c.vrijednost) >= 0.1 &&
            Math.abs(c.vrijednost) <= 40,
          "cilj.vrijednost za dL mora biti od 0,1 do 40 dB (koliko je uho koje se vuče tiše od drugoga; minus = glasnije)",
        );
        need(c.prijamnik == null, "cilj dL nema prijamnik");
      } else if (s.mijenja !== "P" && c.prijamnik != null)
        need(
          c.prijamnik === mijenjaPrijamnik(s),
          "cilj.prijamnik mora biti uho koje se vuče",
        );
    }
    if (s.tolerancija != null)
      need(
        isNum(s.tolerancija) && s.tolerancija > 0,
        "tolerancija mora biti pozitivan broj (dB, ili W/m² za I)",
      );
  }
  if (s.nacin === "predvidi") {
    need(pr.length === 1, "predvidi ima jedno uho");
    const pm = s.promjena;
    if (
      need(
        pm && typeof pm === "object",
        "predvidi treba promjena: {velicina: r | P | N, faktor}",
      )
    ) {
      for (const f of Object.keys(pm))
        need(
          ["velicina", "faktor"].includes(f),
          `promjena: nepoznato polje „${f}“`,
        );
      need(
        VELICINE_PROMJENE.includes(pm.velicina),
        `promjena.velicina mora biti ${VELICINE_PROMJENE.join(", ")}`,
      );
      need(
        isNum(pm.faktor) &&
          pm.faktor > 0 &&
          Math.abs(pm.faktor - 1) > 1e-9 &&
          pm.faktor <= 1000 &&
          pm.faktor >= 0.001,
        "promjena.faktor mora biti pozitivan broj različit od 1 (0,001–1000)",
      );
      if (pm.velicina === "N" && isNum(pm.faktor)) {
        const N = isNum(s.N) ? s.N : 1;
        need(
          Number.isInteger(Math.round(N * pm.faktor * 1e9) / 1e9) &&
            N * pm.faktor >= 1 &&
            N * pm.faktor <= N_MAX,
          `broj izvora nakon promjene (N·faktor) mora biti cijeli broj 1–${N_MAX}`,
        );
      }
    }
    if (s.pitaj != null)
      need(
        Array.isArray(s.pitaj) &&
          s.pitaj.length >= 1 &&
          s.pitaj.length <= 3 &&
          s.pitaj.every((v) => PITAJ_PREDVIDI.includes(v)) &&
          new Set(s.pitaj).size === s.pitaj.length,
        `pitaj mora biti popis različitih od: ${PITAJ_PREDVIDI.join(", ")}`,
      );
  }
  if (s.nacin === "izracunaj") {
    if (
      need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "izracunaj treba pitaj: 1–3 stavke {velicina, prijamnik?, jedinica?}",
      )
    ) {
      const kljucevi = new Set();
      s.pitaj.forEach((p, i) => {
        const at = `pitaj[${i}]`;
        if (!need(p && typeof p === "object", `${at} mora biti objekt`)) return;
        for (const f of Object.keys(p))
          need(
            [
              "velicina",
              "prijamnik",
              "jedinica",
              "tolerancija",
              "krivo",
            ].includes(f),
            `${at}: nepoznato polje „${f}“`,
          );
        if (
          !need(
            VELICINE_IZR.includes(p.velicina),
            `${at}.velicina mora biti ${VELICINE_IZR.join(", ")}`,
          )
        )
          return;
        if (p.velicina === "dL") {
          need(pr.length === 2, `${at}: dL traži dva uha`);
          need(p.prijamnik == null, `${at}: dL nema prijamnik`);
          if (pr.length === 2)
            need(
              pr[0].r !== pr[1].r,
              `${at}: za dL uši moraju biti na različitim udaljenostima`,
            );
        } else if (pr.length === 2)
          need(
            p.prijamnik === 0 || p.prijamnik === 1,
            `${at}.prijamnik (0 ili 1) je obavezan kad su dva uha`,
          );
        else if (p.prijamnik != null)
          need(p.prijamnik === 0, `${at}.prijamnik mora biti 0`);
        if (p.jedinica != null)
          need(
            p.velicina === "S" && p.jedinica in JEDINICE_S,
            `${at}.jedinica postoji samo za S: ${Object.keys(JEDINICE_S).join(" ili ")}`,
          );
        if (p.tolerancija != null)
          need(
            isNum(p.tolerancija) && p.tolerancija > 0,
            `${at}.tolerancija mora biti pozitivan broj`,
          );
        const kljuc = `${p.velicina}${p.prijamnik ?? ""}`;
        need(!kljucevi.has(kljuc), `${at} ponavlja isto pitanje`);
        kljucevi.add(kljuc);
      });
    }
  }
  if (list.length) return list;

  // ravnalo i raspon razina
  const { rMax, korak } = ravnaloZvuka(s);
  need(korak <= rMax / 20, "korak_r mora biti najviše r_max/20");
  const st0 = pocetnoStanje(s);
  pr.forEach((p, i) =>
    need(
      p.r <= rMax + 1e-12 && p.r >= korak - 1e-12,
      `prijamnici[${i}].r mora biti na ravnalu (${tekstR(s, korak)} – ${tekstR(s, rMax)})`,
    ),
  );
  const varijante = [st0];
  for (const polje of ["P", "N"]) {
    const k = klizacZa(s, polje);
    if (k && isNum(k.min) && isNum(k.max))
      varijante.push(
        ...varijante.flatMap((v) => [
          { ...v, [polje]: k.min },
          { ...v, [polje]: k.max },
        ]),
      );
  }
  const raspon = (st) =>
    fizikaZvuka(s, st).prijamnici.every((p) => uRasponu(p.L));
  need(
    varijante.every(raspon),
    "razina zvuka kod prijamnika mora biti 0–130 dB (I od 10⁻¹² do 10 W/m²) za sve vrijednosti klizača",
  );
  if (s.nacin === "istrazi" || (s.nacin === "postavi" && s.mijenja !== "P"))
    need(
      varijante.every((v) =>
        uRasponu(fizikaZvuka(s, { ...v, r: [rMax] }).prijamnici[0].L),
      ),
      "na kraju ravnala (r_max) razina mora biti barem 0 dB; skrati ravnalo ili povećaj snagu",
    );
  if (s.nacin === "predvidi" && list.length === 0) {
    const { poslije } = predvidiStanja(s);
    need(raspon(poslije), "nakon promjene razina mora ostati 0–130 dB");
    if (s.promjena.velicina === "r")
      need(
        poslije.r[0] <= rMax + 1e-12,
        "udaljenost nakon promjene mora biti na ravnalu (povećaj r_max)",
      );
  }
  if (s.nacin === "postavi" && list.length === 0) {
    const rj = rjesenjaPostavi(s);
    if (s.mijenja === "P") {
      const k = klizacZa(s, "P");
      need(
        rj.every((x) => x >= k.min - 1e-12 && x <= k.max + 1e-12),
        `cilj traži snagu ${formatNumber(rj[0])} ${jedinicaP(s)}, a to nije u rasponu klizača`,
      );
    } else
      need(
        rj.length > 0,
        `cilj nije ostvariv na ravnalu (${tekstR(s, korak)} – ${tekstR(s, rMax)}); promijeni cilj ili r_max`,
      );
    if (list.length === 0) {
      const x0 = s.mijenja === "P" ? st0.P : st0.r[mijenjaPrijamnik(s)];
      need(
        !postaviTocno(s, x0),
        "početni položaj već ostvaruje cilj; pomakni početak",
      );
      validateKrivo(s.krivo, null, 0, need);
      if (Array.isArray(s.krivo))
        s.krivo.forEach(
          (x, i) =>
            isNum(x?.vrijednost) &&
            need(
              !postaviTocno(s, x.vrijednost),
              `krivo[${i}].vrijednost ${formatNumber(x.vrijednost)} ostvaruje cilj, a to je točan odgovor`,
            ),
        );
    }
  }
  if (s.nacin === "izracunaj" && list.length === 0)
    s.pitaj.forEach((p, i) => {
      const r = izracunPitanja(s, { ...p, krivo: undefined });
      validateKrivo(p.krivo, r.vrijednost, r.tol, need, `pitaj[${i}].krivo`);
    });
  return list;
}

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const razina_zvuka = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  fizika: fizikaZvuka,
  validate: validateRazinaZvuka,
  // odgovor: postavi → broj (r u jedinica_r ili P u jedinica_P); predvidi → {I?, dL?, L?} (tekst); izracunaj → [tekst po pitanju]
  check(s, odgovor) {
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "predvidi") return checkPredvidi(s, odgovor);
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "postavi") {
      const rj = rjesenjaPostavi(s);
      if (s.mijenja === "P")
        return `P = ${tekstP(s, Math.round(rj[0] * 1000) / 1000)}`;
      const ime = oznakaPrijamnika(s, mijenjaPrijamnik(s));
      return `${ime}: r = ${rj.map((r) => tekstR(s, Math.round(r * 100) / 100)).join(" ili ")}`;
    }
    if (s.nacin === "predvidi") {
      const o = odgovoriPredvidi(s);
      return pitajPredvidi(s)
        .map((v) =>
          v === "I"
            ? `I′ : I = ${tekstOmjera(o.I)}`
            : v === "dL"
              ? `ΔL = ${dBpredznak(o.dL)}`
              : `L′ = ${dB(o.L)}`,
        )
        .join(", ");
    }
    if (s.nacin === "izracunaj")
      return s.pitaj
        .map((p) => {
          const r = izracunPitanja(s, p);
          return `${r.oznaka} = ${zapisVrijednosti(r.vrijednost, r.jedinica)}`;
        })
        .join(", ");
    return "";
  },
  // blizanac s istim odgovorom učenik bi samo prepisao
  kljucOdgovora(s) {
    try {
      if (s.nacin === "izracunaj")
        return JSON.stringify(
          s.pitaj.map((p) =>
            Number(izracunPitanja(s, p).vrijednost.toPrecision(3)),
          ),
        );
      if (s.nacin === "predvidi") {
        const o = odgovoriPredvidi(s);
        return JSON.stringify(
          pitajPredvidi(s).map((v) => Number(o[v].toPrecision(3))),
        );
      }
      if (s.nacin === "postavi")
        return JSON.stringify(
          rjesenjaPostavi(s).map((x) => Number(x.toPrecision(3))),
        );
    } catch {
      return null;
    }
    return null;
  },
};

// za komponentu: zapis točnog odgovora u samom widgetu
export const zapisOdgovora = {
  dB,
  dBpredznak,
  tekstI,
  tekstS,
  tekstR,
  tekstP,
  tekstOmjera,
};
