// titranje: harmonijsko titranje u tri scene (točka s referentnom kružnicom, uteg na opruzi, njihalo / ljuljačka).
// Analitičko rješenje y = A·sin(ωt + φ₀); iz istih funkcija dolaze crtež (koordinate scene, grafovi y–t, v–t, a–t,
// F–t, E–t, graf E_p(x), stupci energije), očitanja, ono što je skriveno prije odgovora i provjera. Načini: istrazi,
// zaustavi (trenutak), odaberi_polozaj (skup položaja), postavi (klizač ili sam uteg) i izracunaj (upis brojeva s
// automatskim tipičnim greškama). Čisti JS bez DOM-a i Intl-a: isti kod radi u pregledniku, u GraalJS-u na
// backendu i u iOS aplikaciji (sve exportane funkcije vraćaju obični JSON).
import { isNum, formatNumber, parseNumber, near } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  withUnit,
} from "../zajednicko.js";
import {
  klizaciOd,
  pocetneVrijednosti,
  iznos,
  validateKlizaci,
  validatePolje,
  validateKoristeniKlizaci,
  krajnjeKombinacije,
  analizaCilja,
  broj,
  iznosJed,
  KLIZACI_OPIS,
} from "./_sile.js";

const TIP = "titranje";
const G = 9.81;
const PI2 = 2 * Math.PI;

export const SCENE = ["tocka", "opruga", "njihalo"];
export const NACINI = [
  "istrazi",
  "zaustavi",
  "odaberi_polozaj",
  "postavi",
  "izracunaj",
];
export const POLOZAJI = ["okomito", "vodoravno"];
export const IKONE = ["kuglica", "ljuljacka"];
export const GRAFOVI = ["y-t", "v-t", "a-t", "F-t", "E-t"];
export const PRIKAZI = [
  ...GRAFOVI,
  "kruznica",
  "Ep-x",
  "stupci",
  "stoperica",
  "brojac_titraja",
];
export const STRELICE = ["v", "a", "F"];
export const UVJETI = [
  "y_max",
  "y_min",
  "ravnoteza",
  "krajnji",
  "v_max",
  "a_max",
  "Ek_jednako_Ep",
  "put",
  "t",
];
export const TRAZI = [
  "v_max",
  "v_nula",
  "a_max",
  "a_nula",
  "F_max",
  "Ek_max",
  "Ep_max",
  "Ek_jednako_Ep",
];
// veličine koje ovise o trenutku (ili položaju) i one koje su stalne za zadano titranje
const TRENUTNE = ["y", "v", "a", "F", "Ep", "Ek", "put", "n"];
const STALNE = ["T", "f", "omega", "A", "v0", "a0", "F0", "E", "k", "l", "m"];
const IZRACUNAJ_VEL = [
  "y",
  "v",
  "a",
  "F",
  "Ep",
  "Ek",
  "E",
  "T",
  "f",
  "omega",
  "v0",
  "a0",
  "F0",
  "k",
  "l",
];
const POSTAVI_X_VEL = ["F", "a", "Ep", "Ek", "v"];
const POSTAVI_VEL = ["T", "f", "omega", "n", "v0", "a0", "F0", "E", "k", "l"];
const PREDZNAK = new Set(["y", "v", "a", "F"]);

const vodoravno = (s) => s.scena === "opruga" && s.polozaj === "vodoravno";
const bocno = (s) => s.scena === "njihalo" || vodoravno(s);
const ljuljacka = (s) => s.scena === "njihalo" && s.ikona === "ljuljacka";
const imaMasu = (s) => s.m != null;

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
// Period se zadaje točno jednim od: omega, T, f, mjerenje {n, t} (n titraja u t sekundi), k (opruga, uz m) ili
// l (njihalo, uz g). Ostalo se računa: k = m·ω², ℓ = g/ω².
export const izvoriPerioda = (s) =>
  ["omega", "T", "f", "mjerenje", "k", "l"].filter(
    (f) =>
      s[f] != null &&
      (f !== "k" || s.scena === "opruga") &&
      (f !== "l" || s.scena === "njihalo"),
  );

export function modelTitranja(s, p = pocetneVrijednosti(s)) {
  const fA = s.jedinica_A === "cm" ? 0.01 : 1;
  const A = iznos(s, s.A, p) * fA;
  const g = s.g != null ? iznos(s, s.g, p) : G;
  const m = s.m != null ? iznos(s, s.m, p) : NaN;
  const izvor = izvoriPerioda(s)[0];
  let omega = NaN;
  if (izvor === "omega") omega = iznos(s, s.omega, p);
  else if (izvor === "T") omega = PI2 / iznos(s, s.T, p);
  else if (izvor === "f") omega = PI2 * iznos(s, s.f, p);
  else if (izvor === "mjerenje") omega = (PI2 * s.mjerenje.n) / s.mjerenje.t;
  else if (izvor === "k") omega = Math.sqrt(iznos(s, s.k, p) / m);
  else if (izvor === "l") omega = Math.sqrt(g / iznos(s, s.l, p));
  const T = PI2 / omega;
  const k = izvor === "k" ? iznos(s, s.k, p) : m * omega * omega;
  const l = izvor === "l" ? iznos(s, s.l, p) : g / (omega * omega);
  const phi0 = s.phi0 != null ? iznos(s, s.phi0, p) : 0;
  return {
    A,
    fA,
    jedA: fA === 1 ? "m" : "cm",
    omega,
    T,
    f: 1 / T,
    phi0,
    m,
    g,
    k,
    l,
    v0: A * omega,
    a0: A * omega * omega,
    F0: m * A * omega * omega,
    E: 0.5 * k * A * A,
    izvor,
  };
}

// Put u amplitudama od faze −π/2 do faze fi (totalna varijacija sinusa); razlika daje prijeđeni put.
function putFaze(fi) {
  const k = Math.floor((fi + Math.PI / 2) / Math.PI);
  const r = fi - (k * Math.PI - Math.PI / 2);
  return 2 * k + 1 - Math.cos(r);
}
// trenutak u kojem je prijeđeni put jednak P amplituda
export function casZaPut(M, P) {
  const G0 = putFaze(M.phi0) + P;
  const k = Math.floor(G0 / 2 + 1e-12);
  const ost = Math.min(2, Math.max(0, G0 - 2 * k));
  const fi = k * Math.PI - Math.PI / 2 + Math.acos(1 - ost);
  return (fi - M.phi0) / M.omega;
}

// stanje u trenutku t (SI). deg: kalkulator u stupnjevima (tipična greška)
export function stanjeTitranja(M, t, { deg = false } = {}) {
  const fiPravi = M.omega * t + M.phi0;
  const fi = deg ? (fiPravi * Math.PI) / 180 : fiPravi;
  const y = M.A * Math.sin(fi);
  const v = M.A * M.omega * Math.cos(fi);
  const a = -M.omega * M.omega * y;
  return {
    t,
    faza: fiPravi,
    y,
    v,
    a,
    F: M.m * a,
    Ep: 0.5 * M.k * y * y,
    Ek: 0.5 * M.k * (M.A * M.A - y * y),
    E: M.E,
    put: putFaze(fiPravi) - putFaze(M.phi0),
    n: t / M.T,
  };
}

// stanje kad tijelo prolazi kroz položaj y (SI); brzina je iznos
export function stanjeUPolozaju(M, y) {
  const yy = Math.max(-M.A, Math.min(M.A, y));
  const a = -M.omega * M.omega * yy;
  return {
    t: NaN,
    faza: NaN,
    y: yy,
    v: M.omega * Math.sqrt(Math.max(0, M.A * M.A - yy * yy)),
    a,
    F: M.m * a,
    Ep: 0.5 * M.k * yy * yy,
    Ek: 0.5 * M.k * (M.A * M.A - yy * yy),
    E: M.E,
    put: NaN,
    n: NaN,
  };
}

// stalne veličine titranja (za „postavi“ s klizačem i očitanja)
export function stalneVelicine(s, p = pocetneVrijednosti(s)) {
  const M = modelTitranja(s, p);
  const out = {
    T: M.T,
    f: M.f,
    omega: M.omega,
    A: M.A,
    v0: M.v0,
    a0: M.a0,
    l: M.l,
  };
  if (imaMasu(s)) Object.assign(out, { m: M.m, F0: M.F0, E: M.E, k: M.k });
  if (s.cilj && isNum(s.cilj.t)) out.n = s.cilj.t / M.T;
  return out;
}

// ── veličine (oznake, jedinice) ─────────────────────────────────────────────────────────────────────
export function velicineTitranja(s) {
  const nj = s.scena === "njihalo";
  const jedA = s.jedinica_A === "cm" ? "cm" : "m";
  const out = {
    t: { naziv: "vrijeme", oznaka: "t", jedinica: "s" },
    y: {
      naziv: "elongacija (odmak od ravnoteže)",
      oznaka: vodoravno(s) ? "x" : "y",
      jedinica: jedA,
    },
    v: { naziv: "brzina", oznaka: "v", jedinica: "m/s" },
    a: {
      naziv: nj ? "povratna akceleracija" : "akceleracija",
      oznaka: "a",
      jedinica: "m/s²",
    },
    put: { naziv: "prijeđeni put", oznaka: "put", jedinica: "A" },
    n: { naziv: "broj titraja", oznaka: "n", jedinica: "" },
    T: { naziv: "period", oznaka: "T", jedinica: "s" },
    f: { naziv: "frekvencija", oznaka: "f", jedinica: "Hz" },
    omega: { naziv: "kružna frekvencija", oznaka: "ω", jedinica: "s⁻¹" },
    A: { naziv: "amplituda", oznaka: "A", jedinica: jedA },
    v0: { naziv: "najveća brzina", oznaka: "v_0", jedinica: "m/s" },
    a0: { naziv: "najveća akceleracija", oznaka: "a_0", jedinica: "m/s²" },
  };
  if (nj) out.l = { naziv: "duljina niti", oznaka: "ℓ", jedinica: "m" };
  if (imaMasu(s)) {
    out.m = { naziv: "masa", oznaka: "m", jedinica: "kg" };
    out.F = {
      naziv: "sila prema ravnoteži (povratna sila)",
      oznaka: "F",
      jedinica: "N",
    };
    out.F0 = { naziv: "najveća povratna sila", oznaka: "F_0", jedinica: "N" };
    if (!nj)
      out.k = {
        naziv: "konstanta opruge",
        oznaka: "k",
        jedinica: "N/m",
      };
    out.Ep = {
      naziv: nj ? "potencijalna energija" : "elastična potencijalna energija",
      oznaka: "E_p",
      jedinica: "J",
    };
    out.Ek = { naziv: "kinetička energija", oznaka: "E_k", jedinica: "J" };
    out.E = { naziv: "ukupna energija", oznaka: "E", jedinica: "J" };
  }
  return out;
}

// vrijednost veličine za prikaz (y i A u jedinici amplitude, ostalo SI)
export function prikazanaVrijednost(M, kljuc, v) {
  return kljuc === "y" || kljuc === "A" ? v / M.fA : v;
}

// ── prikaz: zadane vrijednosti ──────────────────────────────────────────────────────────────────────
export const prikaziTitranja = (s) =>
  Array.isArray(s.prikazi) ? s.prikazi : ["y-t"];
export const grafoviTitranja = (s) =>
  prikaziTitranja(s).filter((v) => GRAFOVI.includes(v));
export const brojaciTitranja = (s) =>
  Array.isArray(s.brojaci) ? s.brojaci : ["t", "y"];
export const strelicePrikaza = (s) =>
  Array.isArray(s.strelice) ? s.strelice : ["v", "a"];

// mjerila crteža: najveće vrijednosti u cijelom rasponu klizača (da se promjena klizača vidi na crtežu)
export function mjerilaTitranja(s) {
  const r = { A: 0, v: 0, a: 0, F: 0, E: 0 };
  for (const p of krajnjeKombinacije(s)) {
    const M = modelTitranja(s, p);
    r.A = Math.max(r.A, M.A || 0);
    r.v = Math.max(r.v, M.v0 || 0);
    r.a = Math.max(r.a, M.a0 || 0);
    r.F = Math.max(r.F, Math.abs(M.F0) || 0);
    r.E = Math.max(r.E, M.E || 0);
  }
  return r;
}

const LIJEPI_GORE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
function lijepoGore(x) {
  if (!(x > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(x));
  const m = x / e;
  return LIJEPI_GORE.find((q) => q >= m - 1e-9) * e;
}
// najveći „lijepi“ korak (1, 2, 5 · 10ⁿ) koji nije veći od x
function lijepKorakDolje(x) {
  const e = 10 ** Math.floor(Math.log10(x));
  const m = x / e;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e;
}
function lijepKorak(raspon, n) {
  const sirovo = raspon / n;
  const e = 10 ** Math.floor(Math.log10(sirovo));
  const m = sirovo / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e;
}

// trenuci (s) u kojima je ispunjen uvjet cilja „zaustavi“, poslije samog početka, do tMax
export function trenuciCilja(s, M = modelTitranja(s), tMax) {
  const c = s.cilj ?? {};
  const kraj = isNum(tMax) ? tMax : trajanjeTitranja(s);
  const tol = tolerancijaZaustavi(M);
  if (c.uvjet === "t") return isNum(c.vrijednost) ? [c.vrijednost] : [];
  if (c.uvjet === "put")
    return isNum(c.vrijednost) ? [casZaPut(M, c.vrijednost)] : [];
  const [baza, korak] = {
    y_max: [Math.PI / 2, PI2],
    y_min: [(3 * Math.PI) / 2, PI2],
    ravnoteza: [0, Math.PI],
    v_max: [0, Math.PI],
    krajnji: [Math.PI / 2, Math.PI],
    a_max: [Math.PI / 2, Math.PI],
    Ek_jednako_Ep: [Math.PI / 4, Math.PI / 2],
  }[c.uvjet] ?? [NaN, NaN];
  if (!isNum(baza) || !(M.omega > 0)) return [];
  const out = [];
  let j = Math.ceil((M.phi0 + M.omega * tol - baza) / korak);
  for (let i = 0; i < 500; i++, j++) {
    const t = (baza + j * korak - M.phi0) / M.omega;
    if (t > kraj + 1e-9) break;
    if (t > tol) out.push(t);
  }
  return out;
}
export const tolerancijaZaustavi = (M) => Math.max(0.01, 0.02 * M.T);

// trajanje vremenske osi (s): zadano t_kraj, inače bar 3 perioda i dovoljno za cilj
export function trajanjeTitranja(s) {
  if (isNum(s.t_kraj)) return s.t_kraj;
  const M = modelTitranja(s);
  if (!(M.T > 0)) return 1;
  if (s.nacin === "postavi" && s.cilj?.velicina === "n" && isNum(s.cilj.t))
    return s.cilj.t;
  let tk = 3 * M.T;
  if (s.nacin === "zaustavi") {
    const ts = trenuciCilja(s, M, 1e7);
    if (ts.length) tk = Math.max(tk, ts[0] + M.T);
  }
  if (s.nacin === "izracunaj")
    for (const it of s.pitaj ?? [])
      if (isNum(it?.t)) tk = Math.max(tk, it.t + M.T / 2);
  return lijepoGore(tk);
}

// mjerilo vremena animacije (simulirane sekunde u jednoj stvarnoj): jedan period traje oko 1,5–2,5 s, a cijela
// os najviše 20 s
const LIJEPA_UBRZANJA = [
  0.05, 0.1, 0.125, 0.2, 0.25, 0.5, 1, 2, 2.5, 3, 4, 5, 8, 10, 20, 50,
];
export function ubrzanjeTitranja(s) {
  if (isNum(s.ubrzanje)) return s.ubrzanje;
  const M = modelTitranja(s);
  if (!(M.T > 0)) return 1;
  const u = Math.max(
    M.T < 1.2 ? M.T / 1.6 : M.T > 3 ? M.T / 2.5 : 1,
    trajanjeTitranja(s) / 20,
  );
  return LIJEPA_UBRZANJA.reduce((b, q) =>
    Math.abs(Math.log(q / u)) < Math.abs(Math.log(b / u)) ? q : b,
  );
}
export function opisBrzine(u) {
  if (u > 1.05) return `ubrzano ${formatNumber(Math.round(u * 10) / 10)}×`;
  if (u < 0.95) return `usporeno ${formatNumber(Math.round(10 / u) / 10)}×`;
  return "stvarna brzina";
}
// korak premotavanja: „lijepi“ broj, najviše T/40 (pogodi se i trenutak zadan na 2 % perioda)
export const korakVremena = (s) =>
  lijepKorakDolje(Math.max(1e-4, modelTitranja(s).T / 40));

// ── geometrija scene (viewBox 320 × visina) ─────────────────────────────────────────────────────────
const r1 = (n) => Math.round(n * 10) / 10;
const SIR = 320;
const NJ_O = [160, 20]; // objesište njihala
const NJ_L = 172; // duljina niti na crtežu
const NJ_KUT = 0.42; // kut (rad) za najveću amplitudu na crtežu: mali kutovi se ne bi vidjeli
const VOD = { X0: 178, PX: 100, POD: 118 }; // vodoravna opruga
const OKO = { X: 150, Y0: 150, PX: 72 }; // okomita opruga
const TOC = { cx: 92, cy: 116, PX: 74 }; // točka i kružnica

// cik-cak opruge od (x1, y1) do (x2, y2)
function cikCak(x1, y1, x2, y2, n = 11, w = 9) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const [ux, uy] = [(x2 - x1) / L, (y2 - y1) / L];
  const kraj = Math.min(8, L * 0.15);
  const pts = [
    [x1, y1],
    [x1 + ux * kraj, y1 + uy * kraj],
  ];
  const d = (L - 2 * kraj) / n;
  for (let i = 0; i < n; i++) {
    const q = kraj + d * (i + 0.5);
    const s = i % 2 ? -w : w;
    pts.push([x1 + ux * q - uy * s, y1 + uy * q + ux * s]);
  }
  pts.push([x2 - ux * kraj, y2 - uy * kraj], [x2, y2]);
  return pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");
}
// šrafura nepomične podloge (strop ili zid)
function srafura(x, y, w, h, smjer = "strop") {
  const out = [];
  if (smjer === "strop")
    for (let q = x + 4; q <= x + w; q += 10) out.push([q, y + h, q - 8, y]);
  else for (let q = y + 4; q <= y + h; q += 10) out.push([x + w, q, x, q - 8]);
  return out.map((l) => l.map(r1));
}

// položaj tijela na crtežu za elongaciju y (SI)
export function tockaTijela(s, ref, y) {
  const u = ref.A > 0 ? y / ref.A : 0;
  if (s.scena === "tocka") {
    const osX = prikaziTitranja(s).includes("kruznica") ? 238 : 160;
    return { x: osX, y: TOC.cy - TOC.PX * u, kut: 0 };
  }
  if (s.scena === "opruga" && vodoravno(s))
    return { x: VOD.X0 + VOD.PX * u, y: VOD.POD - 17, kut: 0 };
  if (s.scena === "opruga") return { x: OKO.X, y: OKO.Y0 - OKO.PX * u, kut: 0 };
  const th = NJ_KUT * u;
  return {
    x: NJ_O[0] + NJ_L * Math.sin(th),
    y: NJ_O[1] + NJ_L * Math.cos(th),
    kut: (th * 180) / Math.PI,
  };
}
// obrnuto: elongacija (SI) najbliža točki crteža (vučenje tijela)
export function polozajIzTocke(s, ref, px, py) {
  let u;
  if (s.scena === "tocka" || (s.scena === "opruga" && !vodoravno(s))) {
    const [Y0, PX] = s.scena === "tocka" ? [TOC.cy, TOC.PX] : [OKO.Y0, OKO.PX];
    u = (Y0 - py) / PX;
  } else if (vodoravno(s)) u = (px - VOD.X0) / VOD.PX;
  else u = Math.atan2(px - NJ_O[0], py - NJ_O[1]) / NJ_KUT;
  return u * ref.A;
}

export function visinaScene(s) {
  if (vodoravno(s)) return 150;
  if (s.scena === "tocka") return 232;
  return s.scena === "njihalo" ? 232 : 262;
}

// strelice v i a (ili F) uz tijelo; duljina je razmjerna iznosu (mjerilo: najveći iznos u rasponu klizača)
function strelice(s, ref, st, vrste) {
  const P = tockaTijela(s, ref, st.y);
  // jedinični vektor pozitivnog smjera gibanja (na ekranu) i okomica za razmak strelica
  let dir;
  let pom;
  let odV;
  let odA;
  if (s.scena === "njihalo") {
    const th = (P.kut * Math.PI) / 180;
    dir = [Math.cos(th), -Math.sin(th)];
    pom = [Math.sin(th), Math.cos(th)];
    odV = -20;
    odA = 22;
  } else if (vodoravno(s)) {
    dir = [1, 0];
    pom = [0, -1];
    odV = 30;
    odA = 46;
  } else {
    dir = [0, -1];
    pom = [1, 0];
    const d = s.scena === "tocka" ? 18 : 32;
    odV = d;
    odA = -d;
  }
  const out = [];
  const dodaj = (vrsta, vr, mj, od) => {
    const L = mj > 0 ? (58 * Math.abs(vr)) / mj : 0;
    if (!(L > 2.5)) return;
    const sg = Math.sign(vr);
    const x1 = P.x + pom[0] * od;
    const y1 = P.y + pom[1] * od;
    out.push({
      vrsta,
      oznaka: vrsta,
      x1: r1(x1),
      y1: r1(y1),
      x2: r1(x1 + dir[0] * L * sg),
      y2: r1(y1 + dir[1] * L * sg),
    });
  };
  if (vrste.includes("v")) dodaj("v", st.v, ref.v, odV);
  if (vrste.includes("F") && isNum(st.F)) dodaj("F", st.F, ref.F, odA);
  else if (vrste.includes("a")) dodaj("a", st.a, ref.a, odA);
  return out;
}

export const oznakaUdjela = (u) => {
  if (Math.abs(u) < 1e-9) return "0";
  const z = u > 0 ? "+" : "−";
  const q = Math.abs(u);
  if (Math.abs(q - 1) < 1e-9) return `${z}A`;
  if (Math.abs(q - 0.5) < 1e-9) return `${z}A/2`;
  return `${z}${formatNumber(q, 2)}A`;
};
export const tockeOdabira = (s) =>
  Array.isArray(s.tocke) ? s.tocke : [-1, -0.5, 0, 0.5, 1];

// cijela scena za trenutno stanje: sve koordinate u viewBoxu SIR × visina
export function scenaTitranja(
  s,
  M,
  st,
  { ref = mjerilaTitranja(s), vrste = strelicePrikaza(s), mete = false } = {},
) {
  const H = visinaScene(s);
  const P = tockaTijela(s, ref, st.y);
  const out = {
    sirina: SIR,
    visina: H,
    scena: s.scena,
    tijelo: {
      x: r1(P.x),
      y: r1(P.y),
      kut: r1(P.kut),
      oblik:
        s.scena === "tocka"
          ? "tocka"
          : s.scena === "opruga"
            ? "uteg"
            : ljuljacka(s)
              ? "ljuljacka"
              : "kuglica",
    },
    crte: [],
    podloga: null,
    opruga: null,
    nit: null,
    luk: null,
    os: null,
    kruznica: null,
    strelice: strelice(s, ref, st, vrste),
    mete: [],
  };
  const pA = M.A; // crte ±A prate stvarnu amplitudu
  const kraj = (y) => tockaTijela(s, ref, y);
  if (s.scena === "tocka") {
    const kr = prikaziTitranja(s).includes("kruznica");
    const osX = P.x;
    out.os = {
      x1: osX,
      y1: TOC.cy + 98,
      x2: osX,
      y2: TOC.cy - 104,
      oznaka: "y",
    };
    for (const [y, oz] of [
      [pA, "+A"],
      [0, "0"],
      [-pA, "−A"],
    ])
      out.crte.push({
        x1: kr ? TOC.cx : osX - 46,
        x2: osX + 40,
        y: r1(kraj(y).y),
        oznaka: oz,
        lx: osX + 46,
        anchor: "start",
        ravnoteza: y === 0,
      });
    if (kr) {
      const R = (TOC.PX * M.A) / ref.A;
      const fi = st.faza;
      const kx = TOC.cx + R * Math.cos(fi);
      const ky = TOC.cy - R * Math.sin(fi);
      const mod = ((fi % PI2) + PI2) % PI2;
      const rl = 20;
      const veliki = mod > Math.PI ? 1 : 0;
      const ex = TOC.cx + rl * Math.cos(mod);
      const ey = TOC.cy - rl * Math.sin(mod);
      out.kruznica = {
        cx: TOC.cx,
        cy: TOC.cy,
        r: r1(R),
        kx: r1(kx),
        ky: r1(ky),
        luk:
          mod < 1e-6
            ? ""
            : `M${TOC.cx + rl},${TOC.cy} A${rl},${rl} 0 ${veliki} 0 ${r1(ex)},${r1(ey)}`,
        tekst: isNum(fi) ? opisKuta(M, fi) : "",
      };
    }
  } else if (s.scena === "opruga" && vodoravno(s)) {
    out.podloga = {
      x: 6,
      y: 58,
      w: 12,
      h: VOD.POD - 58,
      crte: srafura(6, 58, 12, VOD.POD - 58, "zid"),
      pod: { x1: 18, x2: SIR - 6, y: VOD.POD },
    };
    out.opruga = cikCak(18, P.y, P.x - 20, P.y, 12, 8);
    for (const [y, oz] of [
      [-pA, "−A"],
      [0, "0"],
      [pA, "+A"],
    ]) {
      const x = r1(kraj(y).x);
      out.crte.push({
        x1: x,
        x2: x,
        y1: 60,
        y2: VOD.POD + 6,
        oznaka: oz,
        lx: x,
        ly: VOD.POD + 22,
        anchor: "middle",
        ravnoteza: y === 0,
      });
    }
  } else if (s.scena === "opruga") {
    out.podloga = {
      x: OKO.X - 50,
      y: 4,
      w: 100,
      h: 10,
      crte: srafura(OKO.X - 50, 4, 100, 10, "strop"),
    };
    out.opruga = cikCak(OKO.X, 14, OKO.X, P.y - 17, 12, 10);
    for (const [y, oz] of [
      [pA, "+A"],
      [0, "0"],
      [-pA, "−A"],
    ]) {
      const yy = r1(kraj(y).y);
      out.crte.push({
        x1: OKO.X - 62,
        x2: OKO.X + 62,
        y: yy,
        oznaka: y === 0 ? "0 (ravnoteža)" : oz,
        lx: OKO.X + 68,
        anchor: "start",
        ravnoteza: y === 0,
      });
    }
  } else {
    const thA = (NJ_KUT * M.A) / ref.A;
    const [ox, oy] = NJ_O;
    out.podloga = {
      x: ox - 50,
      y: oy - 12,
      w: 100,
      h: 8,
      crte: srafura(ox - 50, oy - 12, 100, 8, "strop"),
      okvir: ljuljacka(s)
        ? [
            [ox - 74, H - 4, ox - 44, oy - 8],
            [ox + 74, H - 4, ox + 44, oy - 8],
          ]
        : null,
    };
    out.nit = { x1: ox, y1: oy, x2: r1(P.x), y2: r1(P.y), duljina: NJ_L };
    const a1 = [ox - NJ_L * Math.sin(thA), oy + NJ_L * Math.cos(thA)];
    const a2 = [ox + NJ_L * Math.sin(thA), oy + NJ_L * Math.cos(thA)];
    out.luk = `M${r1(a1[0])},${r1(a1[1])} A${NJ_L},${NJ_L} 0 0 0 ${r1(a2[0])},${r1(a2[1])}`;
    out.crte.push({
      x1: ox,
      x2: ox,
      y1: oy,
      y2: oy + NJ_L + 26,
      oznaka: "",
      ravnoteza: true,
    });
    for (const [y, oz] of [
      [-pA, "−A"],
      [0, "0"],
      [pA, "+A"],
    ]) {
      const q = kraj(y);
      const th = (q.kut * Math.PI) / 180;
      out.crte.push({
        x1: r1(ox + (NJ_L - 7) * Math.sin(th)),
        y1: r1(oy + (NJ_L - 7) * Math.cos(th)),
        x2: r1(ox + (NJ_L + 7) * Math.sin(th)),
        y2: r1(oy + (NJ_L + 7) * Math.cos(th)),
        oznaka: oz,
        lx: r1(ox + (NJ_L + (ljuljacka(s) ? 30 : 24)) * Math.sin(th)),
        ly: r1(oy + (NJ_L + (ljuljacka(s) ? 30 : 24)) * Math.cos(th) + 4),
        anchor: "middle",
        kvacica: true,
      });
    }
  }
  // mete: oznake crta ±A se skriju (mete imaju svoje); gusto složene mete dobiju manji krug, a oznake
  // naizmjence s obje strane putanje
  if (mete) {
    out.crte = out.crte.map((c) => ({ ...c, oznaka: "" }));
    const tocke = tockeOdabira(s);
    const poz = tocke.map((u) => tockaTijela(s, ref, u * M.A));
    const razmak = Math.min(
      ...poz.slice(1).map((q, i) => Math.hypot(q.x - poz[i].x, q.y - poz[i].y)),
    );
    const r = Math.max(6, Math.min(11, razmak / 2 - 1.5));
    out.mete = tocke.map((u, i) => {
      const q = poz[i];
      const druga = i % 2 === 1 && razmak < 40;
      let lx;
      let ly;
      let anchor;
      if (vodoravno(s))
        [lx, ly, anchor] = druga
          ? [q.x, q.y - 26, "middle"]
          : [q.x, VOD.POD + 22, "middle"];
      else if (s.scena === "njihalo") {
        const th = (q.kut * Math.PI) / 180;
        const R = druga
          ? NJ_L - (ljuljacka(s) ? 52 : 30)
          : NJ_L + (ljuljacka(s) ? 30 : 26);
        [lx, ly, anchor] = [
          NJ_O[0] + R * Math.sin(th),
          NJ_O[1] + R * Math.cos(th) + 4,
          "middle",
        ];
      } else
        [lx, ly, anchor] = druga
          ? [q.x - r - 26, q.y + 4, "end"]
          : [q.x + r + (s.scena === "tocka" ? 26 : 50), q.y + 4, "start"];
      return {
        udio: u,
        x: r1(q.x),
        y: r1(q.y),
        r: r1(r),
        oznaka: oznakaUdjela(u),
        lx: r1(lx),
        ly: r1(ly),
        anchor,
      };
    });
  }
  return out;
}

function opisKuta(M, fi) {
  const st = (fi * 180) / Math.PI;
  const ime = Math.abs(M.phi0) > 1e-9 ? "ωt + φ₀" : "ωt";
  return `${ime} = ${formatNumber(Math.round(fi * 100) / 100, 2)} rad = ${formatNumber(Math.round(st))}°`;
}

// ── grafovi ─────────────────────────────────────────────────────────────────────────────────────────
// Graf veličine o vremenu: okvir, crtice osi, krivulje u px. Krivulja je niz od N+1 točaka jednako razmaknutih u
// vremenu, pa komponenta podebljani dio do kursora dobije rezanjem niza.
const GR = { L: 46, R: 12, T: 16, B: 22 };
export function grafTitranja(
  s,
  M,
  vrsta,
  tKraj,
  { ref = mjerilaTitranja(s), sirina = SIR, visina = 96 } = {},
) {
  const meta = velicineTitranja(s);
  const x0 = GR.L;
  const x1 = sirina - GR.R;
  const y0 = GR.T;
  const y1 = visina - GR.B;
  const energija = vrsta === "E-t";
  const kljuc = vrsta.split("-")[0];
  const R = energija
    ? ref.E
    : { y: ref.A / M.fA, v: ref.v, a: ref.a, F: ref.F }[kljuc];
  const vMin = energija ? 0 : -R;
  const vMax = R;
  const X = (t) => x0 + ((x1 - x0) * t) / tKraj;
  const Y = (v) => y1 - ((y1 - y0) * (v - vMin)) / (vMax - vMin || 1);
  const N = Math.min(1600, Math.max(240, Math.ceil((tKraj / M.T) * 32)));
  const kljucevi = energija ? ["Ep", "Ek", "E"] : [kljuc];
  const krivulje = kljucevi.map((k) => ({
    kljuc: k,
    tocke: Array.from({ length: N + 1 }, (_, i) => {
      const t = (tKraj * i) / N;
      const st = stanjeTitranja(M, t);
      return [r1(X(t)), r1(Y(prikazanaVrijednost(M, k, st[k])))];
    }),
  }));
  const tk = lijepKorak(tKraj, 5);
  const tTicks = [];
  for (let t = 0; t <= tKraj + 1e-9; t += tk)
    tTicks.push({
      x: r1(X(t)),
      tekst: X(t) > x1 - 30 ? "" : formatNumber(Math.round(t / tk) * tk),
    });
  const yTicks = (energija ? [0, R] : [-R, 0, R]).map((v) => ({
    y: r1(Y(v)),
    tekst: broj(v),
  }));
  const m = energija ? { oznaka: "E", jedinica: "J" } : meta[kljuc];
  return {
    vrsta,
    sirina,
    visina,
    okvir: { x0, x1, y0: r1(y0), y1: r1(y1), nula: r1(Y(0)) },
    N,
    tKraj,
    krivulje,
    tTicks,
    yTicks,
    oznaka: `${m.oznaka} (${m.jedinica})`,
    kljuc,
  };
}
// točka krivulje u trenutku t (kursor)
export function tockaGrafa(s, M, graf, kljuc, t, ref = mjerilaTitranja(s)) {
  const { x0, x1, y0, y1 } = graf.okvir;
  const energija = graf.vrsta === "E-t";
  const R = energija
    ? ref.E
    : { y: ref.A / M.fA, v: ref.v, a: ref.a, F: ref.F }[graf.kljuc];
  const vMin = energija ? 0 : -R;
  const v = prikazanaVrijednost(M, kljuc, stanjeTitranja(M, t)[kljuc]);
  return [
    r1(x0 + ((x1 - x0) * t) / graf.tKraj),
    r1(y1 - ((y1 - y0) * (v - vMin)) / (R - vMin || 1)),
  ];
}

// graf E_p(x): parabola na [−A, A], crta ukupne energije, točka tijela i razmak do crte (E_k).
// Os x ima isto mjerilo kao vodoravna opruga, pa graf stoji točno ispod utega.
export function grafEnergije(
  s,
  M,
  y,
  { ref = mjerilaTitranja(s), visina = 132, skrijStanje = false } = {},
) {
  // skrijStanje: traži se E_p ili E_k u zadanom položaju, pa ni točka na paraboli ni crta E_k (ni oznaka E/2,
  // s kojom bi se vrijednost očitala) ne smiju se vidjeti do odgovora
  const yTop = 18;
  const yBot = visina - 26;
  const X = (q) => VOD.X0 + (VOD.PX * q) / ref.A;
  const Emax = Math.max(ref.E, 1e-12);
  const Y = (E) => yBot - ((yBot - yTop) * E) / Emax;
  const tocke = Array.from({ length: 61 }, (_, i) => {
    const q = -M.A + (2 * M.A * i) / 60;
    return [r1(X(q)), r1(Y(0.5 * M.k * q * q))];
  });
  const Ep = 0.5 * M.k * y * y;
  const fmtA = (q) => formatNumber(Number((q / M.fA).toPrecision(3)));
  return {
    sirina: SIR,
    visina,
    os: { x0: 40, x1: SIR - 8, y: yBot, yTop: yTop - 6, xOs: 40 },
    parabola: tocke.map(([a, b]) => `${a},${b}`).join(" "),
    E: { x1: r1(X(-M.A)), x2: r1(X(M.A)), y: r1(Y(M.E)) },
    tocka: skrijStanje ? null : { x: r1(X(y)), y: r1(Y(Ep)) },
    xTicks: [-M.A, 0, M.A].map((q) => ({
      x: r1(X(q)),
      tekst: q === 0 ? "0" : fmtA(q),
    })),
    yTicks: [
      { y: r1(Y(0)), tekst: "0" },
      ...(skrijStanje ? [] : [{ y: r1(Y(M.E / 2)), tekst: broj(M.E / 2) }]),
      { y: r1(Y(M.E)), tekst: broj(M.E) },
    ],
    oznakaX: `${vodoravno(s) ? "x" : "y"} (${M.jedA})`,
  };
}

// stupci E_p, E_k i E (zbroj je stalan); skrijStanje: stupci E_p i E_k su „?“ dok se traže
export function stupciEnergije(
  M,
  st,
  { ref = { E: M.E }, visina = 132, skrijStanje = false } = {},
) {
  const vrh = 14;
  const dno = visina - 30;
  const Emax = Math.max(ref.E, 1e-12);
  return [
    ["Ep", "E_p", st.Ep],
    ["Ek", "E_k", st.Ek],
    ["E", "E", M.E],
  ].map(([kljuc, oznaka, E], i) => {
    const skriven = skrijStanje && kljuc !== "E";
    const h = skriven ? 0 : ((dno - vrh) * Math.max(0, E)) / Emax;
    return {
      kljuc,
      oznaka,
      x: 14 + i * 38,
      w: 26,
      y: r1(dno - h),
      h: r1(h),
      dno,
      skriven,
      tekst: skriven ? "?" : iznosJed(E, "J"),
    };
  });
}

// ── očitanja i što je skriveno ──────────────────────────────────────────────────────────────────────
// Prije točnog odgovora (ili „pokaži“) u načinima s odgovorom ne smije se vidjeti tražena vrijednost.
export function skrivenoTitranja(s, otkriveno) {
  const nista = {
    brojaci: [],
    grafovi: false,
    grafoviPrazni: false,
    sjena: true,
    strelice: false,
    energija: false,
    energijaBrojevi: false,
    energijaStanje: false,
    animacija: true,
    stoperica: false,
  };
  if (s.nacin === "istrazi" || otkriveno) return nista;
  if (s.nacin === "zaustavi")
    // graf se crta samo do kursora: unaprijed nacrtana krivulja pokazala bi kad je tijelo dolje
    return { ...nista, sjena: false };
  if (s.nacin === "odaberi_polozaj")
    return {
      ...nista,
      brojaci: [...TRENUTNE, ...STALNE, "t"],
      grafovi: true,
      strelice: true,
      energija: true,
      animacija: false,
    };
  if (s.nacin === "izracunaj") {
    const trazi = (s.pitaj ?? []).map((it) => it?.velicina);
    return {
      ...nista,
      brojaci: [...TRENUTNE, ...STALNE, "t"],
      grafoviPrazni: true,
      strelice: true,
      energijaBrojevi: trazi.some((v) => ["E", "Ep", "Ek", "k"].includes(v)),
      // u izracunaj E_p(x) se čita s grafa (1090 a), ali točka ne smije pokazati stanje u traženom trenutku
      energija: false,
      // traži se E_p / E_k u zadanom položaju (1090–1094 c): bez točke, crte E_k i stupaca E_p, E_k
      energijaStanje: trazi.some((v) => v === "Ep" || v === "Ek"),
      animacija: false,
    };
  }
  // postavi
  if (s.mijenja === "x")
    return {
      ...nista,
      brojaci: [
        ...TRENUTNE.filter((k) => k !== "y"),
        ...STALNE.filter((k) => k !== "A" && k !== "m"),
      ],
      strelice: true,
      energijaBrojevi: true,
      animacija: false,
    };
  const c = s.cilj?.velicina;
  const vremenske = ["T", "f", "omega", "n"];
  const sakrij = new Set([c]);
  if (vremenske.includes(c) && s.skriveno)
    vremenske.forEach((k) => sakrij.add(k));
  if (c === "v0") sakrij.add("v");
  if (c === "a0") ["a", "F", "F0"].forEach((k) => sakrij.add(k));
  if (c === "F0") ["a", "F", "a0"].forEach((k) => sakrij.add(k));
  if (c === "E") ["Ep", "Ek"].forEach((k) => sakrij.add(k));
  return {
    ...nista,
    brojaci: [...sakrij],
    grafovi: !!s.skriveno,
    strelice: ["v0", "a0", "F0"].includes(c),
    energijaBrojevi: c === "E",
  };
}

const BOJE = { y: "y", v: "v", a: "a", F: "a", Ep: "Ep", Ek: "Ek", E: "E" };
// očitanja uživo; skrivene veličine imaju tekst „?“
export function ocitanjaTitranja(s, M, st, sakrij = []) {
  const meta = velicineTitranja(s);
  const sk = new Set(sakrij);
  return brojaciTitranja(s)
    .filter((k) => k !== "t" && meta[k])
    .map((k) => {
      const m = meta[k];
      const v = k in st && !STALNE.includes(k) ? st[k] : M[k];
      let tekst;
      if (!isNum(v)) tekst = "—";
      else if (k === "put")
        tekst = `${formatNumber(Math.round(v * 10) / 10, 1)} A`;
      else if (k === "n") tekst = formatNumber(Math.round(v * 10) / 10, 1);
      else tekst = iznosJed(prikazanaVrijednost(M, k, v), m.jedinica);
      return {
        kljuc: k,
        oznaka: m.oznaka,
        naziv: m.naziv,
        tekst: sk.has(k) ? "?" : tekst,
        skriveno: sk.has(k),
        boja: BOJE[k] ?? null,
      };
    });
}

// štoperica i brojač titraja (cijeli titraji od početka)
export function stoperica(s, M, t) {
  return {
    vrijeme: `${formatNumber(Math.round(t * 10) / 10, 1)} s`,
    titraja: Math.floor(t / M.T + 1e-9),
  };
}

// opis scene za čitač zaslona (bez skrivenih vrijednosti)
export function opisScene(s, M, st, sakrij = []) {
  const ime = {
    tocka: "Točka titra po osi y",
    opruga: vodoravno(s)
      ? "Uteg na vodoravnoj opruzi, bez trenja"
      : "Uteg obješen na okomitu oprugu",
    njihalo: ljuljacka(s) ? "Dijete na ljuljački" : "Kuglica na niti (njihalo)",
  }[s.scena];
  const sk = new Set(sakrij);
  const dijelovi = [];
  if (isNum(st.t) && !sk.has("t"))
    dijelovi.push(`t = ${formatNumber(Math.round(st.t * 100) / 100, 2)} s`);
  if (!sk.has("y"))
    dijelovi.push(
      `${velicineTitranja(s).y.oznaka} = ${iznosJed(st.y / M.fA, M.jedA)}`,
    );
  return `${ime}. ${dijelovi.join(", ")}`.trim();
}

// stanje koje widget pokazuje na početku i nakon otkrivanja
export function pocetnoStanje(s) {
  if (s.nacin === "postavi" && s.mijenja === "x")
    return { t: 0, x: isNum(s.pocetak_x) ? s.pocetak_x : 0 };
  if (s.nacin === "izracunaj") {
    const sx = (s.pitaj ?? []).find((it) => isNum(it?.x));
    if (sx) return { t: 0, x: sx.x };
  }
  return { t: 0, x: null };
}
export function otkrivenoStanje(s) {
  if (s.nacin === "izracunaj") {
    const it = (s.pitaj ?? []).find((q) => isNum(q?.t));
    if (it) return { t: it.t, x: null };
  }
  if (s.nacin === "zaustavi") return { t: trenuciCilja(s)[0] ?? 0, x: null };
  return pocetnoStanje(s);
}

// ── tekstovi ────────────────────────────────────────────────────────────────────────────────────────
const tijeloIme = (s) =>
  s.scena === "opruga"
    ? "uteg"
    : s.scena === "njihalo"
      ? ljuljacka(s)
        ? "dijete"
        : "kuglica"
      : "tijelo";
const veliko = (t) => t.charAt(0).toUpperCase() + t.slice(1);
// „duljina niti $\\ell$“ → „duljina niti ℓ“ (poruke su obični tekst)
export const bezLatexa = (t) =>
  String(t ?? "")
    .replace(/\\ell/g, "ℓ")
    .replace(/\\omega/g, "ω")
    .replace(/\\varphi/g, "φ")
    .replace(/\\(text|mathrm)\{([^}]*)\}/g, "$2")
    .replace(/[$\\{}]/g, "")
    .replace(/_0/g, "₀")
    .trim();
function strane(s) {
  return bocno(s)
    ? {
        plus: "udesno",
        minus: "ulijevo",
        krajPlus: "desni",
        krajMinus: "lijevi",
        odPlus: "desno od ravnoteže",
        odMinus: "lijevo od ravnoteže",
      }
    : {
        plus: "prema gore",
        minus: "prema dolje",
        krajPlus: "gornji",
        krajMinus: "donji",
        odPlus: "iznad ravnoteže",
        odMinus: "ispod ravnoteže",
      };
}
const tFmt = (t) => withUnit(Math.round(t * 1000) / 1000, "s");

function opisPolozaja(s, M, st) {
  const S = strane(s);
  const u = st.y / M.A;
  if (Math.abs(u) > 0.995)
    return `u ${u > 0 ? S.krajPlus : S.krajMinus} krajnjem položaju`;
  if (Math.abs(u) < 0.03) return "u ravnoteži";
  return `${iznosJed(Math.abs(st.y) / M.fA, M.jedA)} ${u > 0 ? S.odPlus : S.odMinus} i giba se ${st.v > 0 ? S.plus : S.minus}`;
}

// ── zaustavi ────────────────────────────────────────────────────────────────────────────────────────
function checkZaustavi(s, odgovor) {
  const t = isNum(odgovor) ? odgovor : odgovor?.t;
  if (!isNum(t))
    return {
      tocno: false,
      poruka:
        "Pusti titranje, zaustavi ga u pravom trenutku i pritisni Provjeri.",
      prazno: true,
    };
  const M = modelTitranja(s);
  const c = s.cilj;
  const ts = trenuciCilja(s, M);
  const tol = tolerancijaZaustavi(M);
  const prvi = c.prvi !== false;
  const i = ts.findIndex((r) => Math.abs(r - t) <= tol);
  if (i === 0 || (i > 0 && !prvi)) return { tocno: true };
  const ime = tijeloIme(s);
  if (i > 0)
    return {
      tocno: false,
      poruka: `Tako je, ali to nije **prvi** put: ${ime} je tu već ${i === 1 ? "bilo" : "bilo više puta"} prije. Vrati vrijeme na početak i zaustavi ranije.`,
    };
  if (t < tol)
    return {
      tocno: false,
      poruka: "Titranje još nije ni krenulo: pritisni ▶ Pusti, pa zaustavi.",
      prazno: true,
    };
  const k = (s.krivo ?? []).find((q) => Math.abs(q.vrijednost - t) <= tol);
  if (k) return { tocno: false, poruka: k.poruka };
  const st = stanjeTitranja(M, t);
  const S = strane(s);
  const fazaTol = PI2 * (tol / M.T);
  const sn = Math.sin(st.faza);
  const krajnji = Math.abs(sn) >= Math.cos(fazaTol);
  const ravn = Math.abs(sn) <= Math.sin(fazaTol);
  const sad = `U t = ${tFmt(t)} ${ime} je ${opisPolozaja(s, M, st)}`;
  const u = c.uvjet;
  if (u === "y_min" && krajnji && sn > 0)
    return {
      tocno: false,
      poruka: `To je **${S.krajPlus}** krajnji položaj (+A). Traži se ${S.krajMinus}, −A: tijelo je tada na drugoj strani ravnoteže, a minus u rezultatu znači baš tu stranu.`,
    };
  if (u === "y_max" && krajnji && sn < 0)
    return {
      tocno: false,
      poruka: `To je **${S.krajMinus}** krajnji položaj (−A). Traži se ${S.krajPlus}, +A, s druge strane ravnoteže.`,
    };
  if ((u === "a_max" || u === "krajnji") && ravn)
    return {
      tocno: false,
      poruka: `Ovdje je ${ime} u ravnoteži: brzina je najveća, a akceleracija (i sila) **nula**. Akceleracija je najveća u krajnjem položaju, gdje opruga ili nit najjače vuče natrag.`,
    };
  if ((u === "v_max" || u === "ravnoteza") && krajnji)
    return {
      tocno: false,
      poruka: `U krajnjem položaju ${ime} na trenutak **stane**: brzina je nula. Najbrže je kad prolazi kroz ravnotežu.`,
    };
  if (u === "Ek_jednako_Ep" && (krajnji || ravn))
    return {
      tocno: false,
      poruka: krajnji
        ? "U krajnjem položaju sva je energija potencijalna (E_k = 0). Jednake su između: kod y = ±A/√2 ≈ ±0,71 A."
        : "U ravnoteži sva je energija kinetička (E_p = 0). Jednake su između: kod y = ±A/√2 ≈ ±0,71 A.",
    };
  if (u === "put") {
    const dvaput = casZaPut(M, 2 * c.vrijednost);
    if (Math.abs(dvaput - t) <= tol)
      return {
        tocno: false,
        poruka: `Tijelo je prešlo ${formatNumber(2 * c.vrijednost)} A, dvostruko previše. U jednom titraju put je **4A** (do jednog kraja, natrag kroz ravnotežu do drugog i opet u ravnotežu), a ne 2A: 2A je tek pola titraja.`,
      };
    return {
      tocno: false,
      poruka: `U t = ${tFmt(t)} put je ${formatNumber(Math.round(st.put * 10) / 10, 1)} A, a traži se ${formatNumber(c.vrijednost)} A. ${st.put < c.vrijednost ? "Pusti malo dulje." : "Zaustavi ranije."}`,
    };
  }
  if (u === "t")
    return {
      tocno: false,
      poruka: `Sad je t = ${tFmt(t)}, a treba ${tFmt(c.vrijednost)}. ${t < c.vrijednost ? "Pusti malo dulje" : "Vrati malo"} (koristi gumbe ± za fino pomicanje).`,
    };
  const smjer =
    ts.length && t > ts[0]
      ? "Tijelo je to stanje već prošlo: zaustavi ranije."
      : "Pusti malo dulje.";
  return { tocno: false, poruka: `${sad}. ${smjer}` };
}

// ── odaberi položaj ─────────────────────────────────────────────────────────────────────────────────
const ZNAK_EKEP = 1 / Math.SQRT2;
function ispunjava(trazi, u) {
  const q = Math.abs(u);
  if (["v_max", "a_nula", "Ek_max"].includes(trazi)) return q < 1e-9;
  if (["v_nula", "a_max", "F_max", "Ep_max"].includes(trazi))
    return Math.abs(q - 1) < 1e-9;
  if (trazi === "Ek_jednako_Ep") return Math.abs(q - ZNAK_EKEP) < 0.01;
  return false;
}
export const tocniPolozaji = (s, trazi) =>
  tockeOdabira(s).filter((u) => ispunjava(trazi, u));

export function opisTrazenog(s, trazi) {
  const nj = s.scena === "njihalo";
  return {
    v_max: "brzina je najveća",
    v_nula: "brzina je nula",
    a_max: nj ? "povratna akceleracija je najveća" : "akceleracija je najveća",
    a_nula: nj ? "povratna akceleracija je nula" : "akceleracija je nula",
    F_max: "sila prema ravnoteži je najveća",
    Ek_max: "kinetička energija je najveća",
    Ep_max: "potencijalna energija je najveća",
    Ek_jednako_Ep: "kinetička i potencijalna energija su jednake",
  }[trazi];
}

// „gdje je brzina najveća“ (pitanje u widgetu)
export const gdjeTrazeno = (s, trazi) =>
  `gdje ${opisTrazenog(s, trazi).replace(/^(.*?) (je|su) /, "$2 $1 ")}`;

function porukaPolozaja(s, trazi, krivi, fale, odabrani) {
  const ime = tijeloIme(s);
  const nj = s.scena === "njihalo";
  const akc = nj ? "povratna akceleracija" : "akceleracija";
  if (krivi.length) {
    const u = krivi[0];
    const q = Math.abs(u);
    if (q < 1e-9)
      return {
        a_max: `U ravnoteži je sila prema ravnoteži **nula**, pa je i ${akc} nula. Tu je najveća brzina.`,
        F_max:
          "U ravnoteži je sila prema ravnoteži **nula**: tijelo je baš na mjestu kamo ga sila vuče.",
        Ep_max: `U ravnoteži je potencijalna energija nula (${nj ? "najniža točka" : "opruga nije dodatno rastegnuta"}): sva je energija kinetička.`,
        v_nula: `Kroz ravnotežu ${ime} prolazi **najbrže**, ne stoji.`,
        Ek_jednako_Ep: "U ravnoteži je sva energija kinetička (E_p = 0).",
      }[trazi];
    if (Math.abs(q - 1) < 1e-9)
      return {
        v_max: `U krajnjem položaju ${ime} na trenutak **stane** (v = 0) i krene natrag. Brzina je najveća u ravnoteži.`,
        Ek_max: `U krajnjem položaju ${ime} na trenutak stane, pa je kinetička energija nula.`,
        a_nula: `U krajnjem položaju sila prema ravnoteži je najveća, pa ${akc} nije nula, nego najveća.`,
        Ek_jednako_Ep:
          "U krajnjem položaju sva je energija potencijalna (E_k = 0).",
      }[trazi];
    if (trazi === "Ek_jednako_Ep")
      return `Kod ${oznakaUdjela(u)} nisu jednake: E_p raste s kvadratom odmaka (E_p = ½kx²). Na pola amplitude E_p je tek ¼ ukupne energije. Jednake su kod x = A/√2 ≈ 0,71 A.`;
    return `Kod ${oznakaUdjela(u)} ništa nije ni najveće ni nula: ${trazi.startsWith("v") || trazi.startsWith("Ek") ? "brzina" : akc} je ovdje „negdje između“. Traži krajnji položaj ili ravnotežu.`;
  }
  if (fale.length && odabrani.length)
    return `Dobro, ali nije sve: s druge strane ravnoteže je isto, **simetrično**. Dodirni i ${fale.map(oznakaUdjela).join(" i ")}.`;
  return `Dodirni sve položaje u kojima ${opisTrazenog(s, trazi)}.`;
}

function checkOdaberi(s, odgovor) {
  const pitanja = s.pitanja;
  const odg = Array.isArray(odgovor) ? odgovor : [];
  if (pitanja.every((_, i) => !(Array.isArray(odg[i]) && odg[i].length)))
    return {
      tocno: false,
      poruka: "Dodirni položaje na crtežu.",
      prazno: true,
    };
  for (let i = 0; i < pitanja.length; i++) {
    const tr = pitanja[i].trazi;
    const odabrani = (Array.isArray(odg[i]) ? odg[i] : []).filter(isNum);
    const tocni = tocniPolozaji(s, tr);
    const blizu = (a, b) => Math.abs(a - b) < 1e-6;
    const krivi = odabrani.filter((u) => !tocni.some((q) => blizu(q, u)));
    const fale = tocni.filter((q) => !odabrani.some((u) => blizu(q, u)));
    if (!krivi.length && !fale.length) continue;
    const p = porukaPolozaja(s, tr, krivi, fale, odabrani);
    const pref =
      pitanja.length > 1
        ? `U ${i + 1}. pitanju (${opisTrazenog(s, tr)}): `
        : "";
    return { tocno: false, poruka: `${pref}${p}`, prazno: !odabrani.length };
  }
  return { tocno: true };
}

// ── postavi ─────────────────────────────────────────────────────────────────────────────────────────
// x: učenik vuče tijelo (titranje stoji); vrijednosti u jedinici amplitude na mreži od −A do A s korakom korak_x
export function mrezaX(s) {
  const k = korakX(s);
  const n = Math.round(s.A / k);
  return Array.from({ length: 2 * n + 1 }, (_, i) =>
    Number(((i - n) * k).toPrecision(12)),
  );
}
export const korakX = (s) =>
  isNum(s.korak_x) ? s.korak_x : lijepKorakDolje(s.A / 10);

function velicinaUX(s, M, xJed) {
  const st = stanjeUPolozaju(M, xJed * M.fA);
  const v = st[s.cilj.velicina];
  return s.cilj.vrijednost >= 0 && PREDZNAK.has(s.cilj.velicina)
    ? Math.abs(v)
    : v;
}
export function analizaX(s) {
  const M = modelTitranja(s);
  const mreza = mrezaX(s);
  const cilj = s.cilj.vrijednost;
  const d = mreza.map((x) => velicinaUX(s, M, x) - cilj);
  const korakPromjena = Math.max(
    ...mreza
      .slice(1)
      .map((x, i) =>
        Math.abs(velicinaUX(s, M, x) - velicinaUX(s, M, mreza[i])),
      ),
  );
  // tolerancija: zadana, ili 1 % cilja, ali bar toliko da prolazi najbliži položaj na mreži
  const najbolji = Math.min(...d.map(Math.abs));
  const tol = isNum(s.cilj.tolerancija)
    ? s.cilj.tolerancija
    : Math.max(
        Math.abs(cilj) * 0.01,
        Math.min(najbolji * 1.0001, korakPromjena * 0.5),
      );
  const ok = (x) => Math.abs(velicinaUX(s, M, x) - cilj) <= tol + 1e-12;
  return { M, mreza, tol, ok, tocni: mreza.filter(ok) };
}

// klizač: tolerancija je zadana, ili 1 % cilja, a bar pola promjene veličine za jedan korak klizača
export function analizaPostavi(s) {
  const k = klizaciOd(s)[0];
  const vel = (p) => stalneVelicine(s, p);
  const a0 = analizaCilja(s, k, vel);
  if (isNum(s.cilj.tolerancija)) return { ...a0, k };
  const tol = Math.max(a0.tol, Math.abs(s.cilj.vrijednost) * 0.01);
  return {
    ...analizaCilja({ ...s, cilj: { ...s.cilj, tolerancija: tol } }, k, vel),
    k,
  };
}
// koje polje speca klizač pomiče (za poruku „opruga je premekana“)
const poljeKlizaca = (s, id) =>
  ["k", "l", "m", "A", "omega", "T", "f", "g"].find((f) => s[f] === id);
const FRAZE = {
  k: ["opruga je premekana: povećaj k", "opruga je pretvrda: smanji k"],
  l: ["nit je prekratka: produlji je", "nit je preduga: skrati je"],
  m: ["uteg je prelagan: povećaj masu", "uteg je pretežak: smanji masu"],
  A: ["amplituda je premala: povećaj je", "amplituda je prevelika: smanji je"],
};

function checkPostavi(s, odgovor) {
  if (s.mijenja === "x") {
    const x = isNum(odgovor) ? odgovor : odgovor?.x;
    if (!isNum(x))
      return {
        tocno: false,
        poruka: `Povuci ${tijeloIme(s)} na pravo mjesto i pritisni Provjeri.`,
        prazno: true,
      };
    const a = analizaX(s);
    if (a.ok(x)) return { tocno: true };
    const kq = korakX(s);
    const hit = (s.krivo ?? []).find(
      (q) => Math.abs(q.vrijednost - x) <= kq / 2,
    );
    if (hit) return { tocno: false, poruka: hit.poruka };
    const meta = velicineTitranja(s)[s.cilj.velicina];
    const q = velicinaUX(s, a.M, x);
    const cilj = s.cilj.vrijednost;
    const raste = ["F", "a", "Ep"].includes(s.cilj.velicina);
    const dalje = q < cilj === raste;
    const ozX = velicineTitranja(s).y.oznaka;
    return {
      tocno: false,
      poruka: `Na ${ozX} = ${withUnit(x, a.M.jedA)} ${meta.naziv} je ${iznosJed(q, meta.jedinica)}, a treba ${withUnit(cilj, meta.jedinica)}: povuci ${dalje ? "dalje od ravnoteže" : "bliže ravnoteži"}.`,
    };
  }
  const k = klizaciOd(s)[0];
  const v = isNum(odgovor) ? odgovor : odgovor?.[k.id];
  if (!isNum(v))
    return { tocno: false, poruka: "Pomakni klizač.", prazno: true };
  const a = analizaPostavi(s);
  if (a.ok(v)) return { tocno: true };
  const hit = (s.krivo ?? []).find(
    (q) => Math.abs(q.vrijednost - v) <= k.korak / 2,
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const { q, t } = a.razlika(v);
  const c = s.cilj;
  const meta = velicineTitranja(s);
  const ime = bezLatexa(k.oznaka);
  const kl = `${veliko(ime)} = ${withUnit(v, k.jedinica)}`;
  const sad =
    c.velicina === "n"
      ? `${kl}: ${tijeloIme(s)} u ${withUnit(c.t, "s")} napravi ${formatNumber(Math.round(q * 10) / 10, 1)} titraja, a treba ${formatNumber(t)}.`
      : `${kl}: ${meta[c.velicina].naziv} je ${iznosJed(q, meta[c.velicina].jedinica)}, a treba ${iznosJed(t, meta[c.velicina].jedinica)}.`;
  // smjer: kako se veličina mijenja kad se klizač malo poveća
  const gore = a.razlika(Math.min(k.max, v + k.korak)).q;
  const dolje = a.razlika(Math.max(k.min, v - k.korak)).q;
  let savjet = "";
  if (isNum(gore) && isNum(dolje) && Math.abs(gore - dolje) > 1e-12) {
    const povecaj = gore > dolje === t > q;
    const polje = poljeKlizaca(s, k.id);
    const brzo = ["n", "f", "omega"].includes(c.velicina)
      ? q > t
        ? "Titra prebrzo"
        : "Titra presporo"
      : c.velicina === "T"
        ? q > t
          ? "Period je predug"
          : "Period je prekratak"
        : "";
    const fraza = FRAZE[polje]?.[povecaj ? 0 : 1];
    savjet = fraza
      ? ` ${brzo ? `${brzo}, ${fraza}` : veliko(fraza)}.`
      : ` ${brzo ? `${brzo}. ` : ""}${povecaj ? "Povećaj" : "Smanji"} ${ime}.`;
  }
  return {
    tocno: false,
    poruka: `${sad}${savjet}${s.savjet ? ` ${s.savjet}` : ""}`,
  };
}

// ── izračunaj ───────────────────────────────────────────────────────────────────────────────────────
export function jedinicaStavke(s, it) {
  if (it.velicina === "y")
    return it.jedinica ?? (s.jedinica_A === "cm" ? "cm" : "m");
  return {
    v: "m/s",
    a: "m/s²",
    F: "N",
    Ep: "J",
    Ek: "J",
    E: "J",
    T: "s",
    f: "Hz",
    omega: "s⁻¹",
    v0: "m/s",
    a0: "m/s²",
    F0: "N",
    k: "N/m",
    l: "m",
  }[it.velicina];
}
const OZNAKE_STAVKE = {
  y: "y",
  v: "v",
  a: "a",
  F: "F",
  Ep: "E_p",
  Ek: "E_k",
  E: "E",
  T: "T",
  f: "f",
  omega: "\\omega",
  v0: "v_0",
  a0: "a_0",
  F0: "F_0",
  k: "k",
  l: "\\ell",
};
export function oznakaStavke(s, it) {
  if (isText(it.oznaka)) return it.oznaka;
  const o =
    it.velicina === "y" && vodoravno(s) ? "x" : OZNAKE_STAVKE[it.velicina];
  return `$${o}$`;
}
export function kadStavke(s, it) {
  if (isNum(it.t)) return `u t = ${withUnit(it.t, "s")}`;
  if (isNum(it.x))
    return `kod ${vodoravno(s) ? "x" : "y"} = ${withUnit(it.x, s.jedinica_A === "cm" ? "cm" : "m")}`;
  return "";
}

// vrijednost tražene veličine u jedinici stavke za zadani model (i tipične greške računa)
function vrijednostStavke(s, M, it, { deg = false } = {}) {
  let st = null;
  if (isNum(it.t)) st = stanjeTitranja(M, it.t, { deg });
  else if (isNum(it.x)) st = stanjeUPolozaju(M, it.x * M.fA);
  const K = {
    T: M.T,
    f: M.f,
    omega: M.omega,
    v0: M.v0,
    a0: M.a0,
    F0: M.F0,
    E: M.E,
    k: M.k,
    l: M.l,
  };
  let v = it.velicina in K ? K[it.velicina] : st?.[it.velicina];
  if (it.velicina === "y" && jedinicaStavke(s, it) === "cm") v = v * 100;
  return v;
}
const sPredznakom = (it) =>
  PREDZNAK.has(it.velicina) && isNum(it.t) && it.predznak !== false;
export function tocnoStavke(s, it) {
  const v = vrijednostStavke(s, modelTitranja(s), it);
  return PREDZNAK.has(it.velicina) && !sPredznakom(it) ? Math.abs(v) : v;
}
const tolStavke = (it, v) =>
  isNum(it.tolerancija) ? it.tolerancija : Math.max(Math.abs(v) * 0.01, 1e-12);

const P = {
  deg: "Kalkulator je bio u stupnjevima (DEG). ωt je kut u **radijanima**: prebaci kalkulator u RAD i izračunaj ponovno.",
  cm: "Amplituda je u centimetrima: prije računa je pretvori u metre (npr. 5 cm = 0,05 m).",
  amplituda:
    "To je amplituda, najveći odmak. Elongacija se mijenja: y = A·sin(ωt), pa uvrsti zadani t.",
  v0: "To je najveća brzina v₀ = Aω, a tijelo baš sad ne prolazi kroz ravnotežu: v = v₀·cos(ωt).",
  a0: "To je najveća akceleracija a₀, a ona je samo u krajnjem položaju. U tom trenutku a = −a₀·sin(ωt).",
  F0: "To je najveća sila m·a₀. U tom trenutku F = m·a, gdje je a = −a₀·sin(ωt).",
  piKv: "U formuli je **π²** (4π²), a ne π.",
  TKv: "Period je u formuli na kvadrat (T²).",
  faliMasa: "To je akceleracija. Sila je F = m·a.",
  TfZamjena: "Zamijenio si T i f: period je T = 1/f, frekvencija f = 1/T.",
  TOmega: "To je f = ω/2π. Period je T = 2π/ω.",
  fOmega: "To je ω. Frekvencija je f = ω/2π.",
  omegaFali2pi: "Fali 2π: ω = 2πf = 2π/T.",
  nt: "Period je vrijeme podijeljeno brojem titraja: T = t/n (a ne n/t).",
  g981: "U zadacima uzmi g = 10 m/s² (knjižica formula, str. 5).",
  g10: "Ovdje je g = 9,81 m/s².",
  bezPola: "Fali ½: E_p = ½kx² (i E = ½kA²).",
  kvadratX: "Odmak je u formuli na kvadrat: E_p = ½kx².",
  kvadratA: "Amplituda je u formuli na kvadrat: E = ½kA².",
  EumjestoEp:
    "To je ukupna energija. U tom položaju samo je dio potencijalna: E_p = ½kx².",
  EkJeE: "Zaboravio si oduzeti: E_k = E − E_p.",
  EkJeEp: "To je potencijalna energija. Kinetička je ostatak: E_k = E − E_p.",
  k2E: "Iz E = ½kA² slijedi k = 2E/A²: fali 2.",
  kA: "Amplituda je na kvadrat: k = 2E/A².",
  v0Fali2pi: "Fali 2π: v₀ = 2πA/T = Aω.",
  a0JeV0:
    "To je najveća brzina v₀. Najveća akceleracija je a₀ = 4π²A/T² = Aω².",
  kmFormula: "Masa ide u brojnik: T = 2π·√(m/k).",
  lgFormula: "Duljina ide u brojnik: T = 2π·√(ℓ/g).",
  kFKX: "To je E_p (½kx²). Sila opruge je F = k·x.",
  aKX: "To je sila k·x. Akceleracija je a = F/m = −(k/m)·x.",
};
const FORMULE = {
  y: "y = A·sin(ωt + φ₀)",
  v: "v = v₀·cos(ωt + φ₀), v₀ = Aω",
  a: "a = −a₀·sin(ωt + φ₀) = −ω²·y",
  F: "F = m·a",
  Ep: "E_p = ½kx²",
  Ek: "E_k = E − E_p",
  E: "E = ½kA²",
  T: "T = 2π/ω = 1/f",
  f: "f = 1/T",
  omega: "ω = 2π/T",
  v0: "v₀ = 2πA/T",
  a0: "a₀ = 4π²A/T²",
  F0: "F₀ = m·a₀",
  k: "T = 2π√(m/k), pa k = 4π²m/T²",
  l: "T = 2π√(ℓ/g), pa ℓ = gT²/4π²",
};

// tipične krive vrijednosti za stavku (u jedinici stavke), izračunate iz speca
export function greskeStavke(s, it) {
  const M = modelTitranja(s);
  const tocno = tocnoStavke(s, it);
  const v = it.velicina;
  const out = [];
  const dodaj = (vr, poruka) => {
    if (isNum(vr)) out.push({ vrijednost: vr, poruka });
  };
  const kod = (Mx, opc) => {
    const q = vrijednostStavke(s, Mx, it, opc);
    return PREDZNAK.has(v) && !sPredznakom(it) ? Math.abs(q) : q;
  };
  const vremenska = isNum(it.t) && ["y", "v", "a", "F", "Ep", "Ek"].includes(v);
  if (vremenska) dodaj(kod(M, { deg: true }), P.deg);
  // amplituda u cm uvrštena kao da je u metrima
  if (s.jedinica_A === "cm" && !(v === "y" && jedinicaStavke(s, it) === "cm"))
    dodaj(kod(modelTitranja({ ...s, jedinica_A: "m" })), P.cm);
  if (s.mjerenje)
    dodaj(
      kod(
        modelTitranja({ ...s, mjerenje: { n: s.mjerenje.t, t: s.mjerenje.n } }),
      ),
      P.nt,
    );
  if (s.scena === "njihalo" && (v === "l" || M.izvor === "l")) {
    const gDrugi = Math.abs(M.g - 10) < 1e-9 ? 9.81 : 10;
    dodaj(
      kod(modelTitranja({ ...s, g: gDrugi })),
      gDrugi === 9.81 ? P.g981 : P.g10,
    );
  }
  const yF = v === "y" && jedinicaStavke(s, it) === "cm" ? 100 : 1;
  const sn = isNum(it.t) ? Math.sin(M.omega * it.t + M.phi0) : NaN;
  const yX = isNum(it.x) ? it.x * M.fA : isNum(it.t) ? M.A * sn : NaN;
  switch (v) {
    case "y":
      dodaj(M.A * yF, P.amplituda);
      dodaj(-M.A * yF, P.amplituda);
      break;
    case "v":
      if (isNum(it.t)) {
        dodaj(M.v0, P.v0);
        dodaj(-M.v0, P.v0);
      }
      break;
    case "a":
      if (isNum(it.t)) {
        dodaj(M.a0, P.a0);
        dodaj(-M.a0, P.a0);
        dodaj(tocno / Math.PI, P.piKv);
      } else if (imaMasu(s)) dodaj(-M.k * yX, P.aKX);
      break;
    case "F":
      if (isNum(it.t)) {
        dodaj(M.F0, P.F0);
        dodaj(-M.F0, P.F0);
        dodaj(tocno / Math.PI, P.piKv);
      } else dodaj(0.5 * M.k * yX * yX, P.kFKX);
      dodaj(tocno / M.m, P.faliMasa);
      break;
    case "Ep":
      dodaj(2 * tocno, P.bezPola);
      dodaj(M.E, P.EumjestoEp);
      dodaj(0.5 * M.k * Math.abs(yX), P.kvadratX);
      break;
    case "Ek":
      dodaj(M.E, P.EkJeE);
      dodaj(0.5 * M.k * yX * yX, P.EkJeEp);
      dodaj(M.E - M.k * yX * yX, P.bezPola);
      break;
    case "E":
      dodaj(2 * M.E, P.bezPola);
      dodaj(0.5 * M.k * M.A, P.kvadratA);
      break;
    case "T":
      dodaj(M.f, P.TfZamjena);
      if (M.izvor === "k") dodaj(PI2 * Math.sqrt(M.k / M.m), P.kmFormula);
      if (M.izvor === "l") dodaj(PI2 * Math.sqrt(M.g / M.l), P.lgFormula);
      break;
    case "f":
      dodaj(M.T, P.TfZamjena);
      dodaj(M.omega, P.fOmega);
      break;
    case "omega":
      dodaj(M.f, P.omegaFali2pi);
      dodaj(1 / M.T, P.omegaFali2pi);
      dodaj(PI2 * M.T, "ω = 2π/T: period je u nazivniku.");
      break;
    case "v0":
      dodaj(M.v0 / PI2, P.v0Fali2pi);
      break;
    case "a0":
      dodaj(M.a0 / Math.PI, P.piKv);
      dodaj(M.a0 * M.T, P.TKv);
      dodaj(M.v0, P.a0JeV0);
      break;
    case "F0":
      dodaj(M.F0 / Math.PI, P.piKv);
      dodaj(M.a0, P.faliMasa);
      break;
    case "k":
      dodaj(M.k / Math.PI, P.piKv);
      dodaj(M.k * M.T, P.TKv);
      dodaj(M.k / 2, P.k2E);
      dodaj(M.k * M.A, P.kA);
      break;
    case "l":
      dodaj(M.l * Math.PI, P.piKv);
      dodaj(M.l / M.T, P.TKv);
      break;
  }
  // bez onih koje su (skoro) jednake točnom odgovoru i bez ponavljanja
  const tol = tolStavke(it, tocno) * 1.5;
  const jedinstvene = [];
  for (const g of out) {
    if (Math.abs(g.vrijednost - tocno) <= tol) continue;
    if (
      jedinstvene.some((q) =>
        near(q.vrijednost, g.vrijednost, Math.abs(g.vrijednost) * 0.002),
      )
    )
      continue;
    jedinstvene.push(g);
  }
  return jedinstvene;
}

function porukaPredznaka(s, it, tocno) {
  const S = strane(s);
  if (it.velicina === "y")
    return tocno < 0
      ? `Iznos je dobar, ali fali **minus**: tijelo je ${S.odMinus}, na drugoj strani.`
      : `Iznos je dobar, ali bez minusa: tijelo je ${S.odPlus}.`;
  if (it.velicina === "v")
    return `Iznos je dobar, ali predznak nije: predznak brzine kaže kamo se tijelo giba (sad ${tocno < 0 ? S.minus : S.plus}).`;
  const sto = it.velicina === "a" ? "akceleracija" : "sila";
  return tocno < 0
    ? `Iznos je dobar, ali fali **minus**: ${sto} uvijek gleda prema ravnoteži, suprotno od elongacije. Minus znači: prema ravnoteži.`
    : `Iznos je dobar, ali predznak nije: tijelo je ${S.odMinus}, pa ${sto} prema ravnoteži gleda ${S.plus} (pozitivno).`;
}

// provjera jedne stavke (komponenta je koristi i za oznaku polja nakon provjere)
export function provjeriStavku(s, i, unos) {
  const it = s.pitaj[i];
  const jed = jedinicaStavke(s, it);
  const n = parseNumber(unos, jed);
  if (n == null) return { tocno: false, prazno: true };
  const tocno = tocnoStavke(s, it);
  const tol = tolStavke(it, tocno);
  if (near(n, tocno, tol)) return { tocno: true };
  if (sPredznakom(it) && Math.abs(tocno) > 1e-12 && near(-n, tocno, tol))
    return { tocno: false, poruka: porukaPredznaka(s, it, tocno) };
  const hit = (it.krivo ?? []).find((q) =>
    near(
      n,
      q.vrijednost,
      isNum(q.tolerancija) ? q.tolerancija : Math.abs(q.vrijednost) * 0.01,
    ),
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const gr = greskeStavke(s, it).find((q) =>
    near(n, q.vrijednost, Math.abs(q.vrijednost) * 0.01),
  );
  if (gr) return { tocno: false, poruka: gr.poruka };
  return {
    tocno: false,
    poruka: it.savjet || `Nije točno. Pomoć: ${FORMULE[it.velicina]}.`,
  };
}

function checkIzracunaj(s, odgovor) {
  const unosi = Array.isArray(odgovor) ? odgovor : [odgovor];
  const vise = s.pitaj.length > 1;
  if (s.pitaj.every((_, i) => !String(unosi[i] ?? "").trim()))
    return {
      tocno: false,
      poruka: "Upiši broj (decimalni zarez je u redu, npr. 1,5).",
      prazno: true,
    };
  for (let i = 0; i < s.pitaj.length; i++) {
    const r = provjeriStavku(s, i, unosi[i] ?? "");
    if (r.tocno) continue;
    const pref = vise ? `U ${i + 1}. polju: ` : "";
    if (r.prazno)
      return {
        tocno: false,
        poruka: `${pref}upiši broj (decimalni zarez je u redu).`,
        prazno: true,
      };
    return { tocno: false, poruka: `${pref}${r.poruka}` };
  }
  return { tocno: true };
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Harmonijsko titranje (fizika, matura): y = A·sin(ωt + φ₀), crtež i grafovi uživo. tekst, nacin, scena:
- "tocka": točka titra po osi y (čista jednadžba); uz prikazi "kruznica" crta se referentna kružnica s kutom ωt u rad i °.
- "opruga": uteg na opruzi; polozaj? "okomito" (zadano; F je povratna sila oko ravnoteže) | "vodoravno" (bez trenja, oznaka x).
- "njihalo": kuglica na niti, ikona? "kuglica" (zadano) | "ljuljacka" (dijete na ljuljački). Kut na crtežu je povećan.
Polja (brojčano polje smije biti id klizača): A (> 0), jedinica_A? ("m" zadano | "cm"), točno jedan izvor perioda: omega (s⁻¹) | T (s) | f (Hz) | mjerenje {n, t} (n titraja u t s) | k (N/m, samo opruga, treba m) | l (m, samo njihalo); m? (kg, treba za F, F₀, k, energije), g? (zadano 9,81; u zadacima knjižice 10), phi0? (rad, zadano 0).
Prikaz: prikazi? ⊂ ${PRIKAZI.join(", ")} (najviše 3 grafa; zadano ["y-t"]; F-t, E-t, Ep-x i stupci trebaju m; kruznica samo uz scena "tocka"); brojaci? ⊂ t, y, v, a, F, Ep, Ek, E, n, put (put u amplitudama), T, f, omega, v0, a0, F0, k, l (zadano ["t", "y"], najviše 6; [] = bez očitanja); strelice? ⊂ v, a, F (zadano ["v", "a"]; v zelena, a/F plava, uvijek prema ravnoteži); ubrzanje? (simulirane sekunde u stvarnoj; zadano tako da jedan period traje 1,5–2,5 s); t_kraj? (duljina vremenske osi, s).
Načini:
- "istrazi" (pogledaj): ▶/⏸, premotavanje, „usporeno ×¼“; ${KLIZACI_OPIS} (do 3; id-jevi npr. A, m, k, l, g, omega, T, f). Kod njihala klizač m ne mijenja period (u formuli nema mase).
- "zaustavi" (Tvoj red): učenik pusti titranje, zaustavi ga (ili premota) i pritisne Provjeri. cilj: {uvjet: y_max | y_min | ravnoteza | krajnji | v_max | a_max | Ek_jednako_Ep | put (vrijednost: put u amplitudama, cijeli broj ili polovica) | t (vrijednost: s), prvi? (zadano true)}. Trenutke računa aplikacija; tolerancija max(0,01 s; 2 % T). Poruke za y_max umjesto y_min, ravnotežu umjesto a_max, krajnji umjesto v_max, put 2A po titraju i drugi umjesto prvog prolaska dodaju se same. Graf se crta tek do kursora.
- "odaberi_polozaj" (Tvoj red): titranje stoji, učenik dodiruje mete na putanji. tocke? (udjeli od A, zadano [-1, -0.5, 0, 0.5, 1]; za Ek_jednako_Ep dodaj ±0.71), pitanja: [{trazi}] (1–3) s trazi ∈ ${TRAZI.join(", ")}. Odgovor je skup položaja (oba krajnja!).
- "postavi" (Tvoj red): mijenja: id jedinog klizača ili "x" (učenik vuče sam uteg; korak_x? u jedinici amplitude, pocetak_x? zadano 0). Uz klizač cilj {velicina ∈ ${POSTAVI_VEL.join(", ")}, vrijednost, t? (za n: broj titraja u t s), tolerancija?}; uz "x" cilj {velicina ∈ ${POSTAVI_X_VEL.join(", ")}, vrijednost (≥ 0 znači iznos)}. Zadana tolerancija: 1 % cilja, a bar pola koraka. skriveno?: true sakrije veličine vremena (T, f, ω, n) i grafove do provjere (štoperica i brojač titraja ostaju). Cilj i ono što ga odaje vide se tek nakon provjere. krivo?: [{vrijednost (klizača ili x), poruka}].
- "izracunaj" (Tvoj red): pitaj: [{velicina ∈ ${IZRACUNAJ_VEL.join(", ")}, t? (s) | x? (u jedinici amplitude; y, v, a, F, Ep, Ek trebaju jedno od toga), jedinica? (samo za y: m | cm), oznaka?, predznak? (zadano true: y, v, a, F u trenutku t traže se s predznakom), tolerancija? (zadano 1 %), krivo?, savjet?}] (1–3). Do točnog odgovora crtež stoji na t = 0, a tražene vrijednosti su „?“. Automatske krive vrijednosti: kalkulator u DEG, cm nepretvoreni u m, amplituda umjesto elongacije, v₀/a₀/F₀ umjesto vrijednosti u trenutku, π nekvadriran, T nekvadriran, zamijenjeni T i f, T = n/t, g = 9,81 umjesto 10, E_p bez ½, E_k = E, krivi predznak.`;

const PRIMJER = {
  tip: TIP,
  scena: "tocka",
  nacin: "zaustavi",
  tekst:
    "Pusti titranje $y = 5\\ \\text{cm} \\cdot \\sin(15{,}7\\ \\text{s}^{-1} \\cdot t)$ i zaustavi ga kad tijelo **prvi put** dođe u najniži položaj.",
  A: 5,
  jedinica_A: "cm",
  omega: 15.7,
  prikazi: ["y-t", "kruznica"],
  brojaci: ["t", "y"],
  ubrzanje: 0.25,
  cilj: { uvjet: "y_min" },
};

const PRIMJERI = [
  // 1080 a: što znači ωt (radijani)
  {
    tip: TIP,
    scena: "tocka",
    nacin: "istrazi",
    tekst:
      "Tijelo titra po jednadžbi $y = 5\\ \\text{cm} \\cdot \\sin(15{,}7\\ \\text{s}^{-1} \\cdot t)$. Gledaj kružnicu: kut $\\omega t$ raste, a točka na osi je njegova projekcija. Jedan krug je $2\\pi \\approx 6{,}28$ rad.",
    A: 5,
    jedinica_A: "cm",
    omega: 15.7,
    prikazi: ["y-t", "kruznica"],
    brojaci: ["t", "y"],
    ubrzanje: 0.25,
  },
  // 1080 a: elongacija u trenutku (kalkulator u RAD)
  {
    tip: TIP,
    scena: "tocka",
    nacin: "izracunaj",
    tekst:
      "Tijelo titra po jednadžbi $y = 5\\ \\text{cm} \\cdot \\sin(15{,}7\\ \\text{s}^{-1} \\cdot t)$. Izračunaj period, frekvenciju i elongaciju u trenutku $t = 0{,}3$ s.",
    A: 5,
    jedinica_A: "cm",
    omega: 15.7,
    prikazi: ["y-t", "kruznica"],
    brojaci: ["t", "y"],
    ubrzanje: 0.25,
    pitaj: [
      { velicina: "T" },
      { velicina: "f" },
      { velicina: "y", t: 0.3, jedinica: "cm" },
    ],
  },
  // 1080 b: put 6A
  {
    tip: TIP,
    scena: "tocka",
    nacin: "zaustavi",
    tekst:
      "Tijelo krene iz ravnoteže. Zaustavi ga kad prijeđe put od **6 amplituda**. Koliko je vremena prošlo?",
    A: 3,
    jedinica_A: "cm",
    T: 8,
    prikazi: ["y-t"],
    brojaci: ["t", "put"],
    cilj: { uvjet: "put", vrijednost: 6 },
  },
  // 1085: ljuljačka, istraživanje v i a
  {
    tip: TIP,
    scena: "njihalo",
    ikona: "ljuljacka",
    nacin: "istrazi",
    tekst:
      "Dijete se ljulja: najviše se odmakne 10 cm, a puni zamah traje 1,6 s. Prati strelice i grafove: gdje je brzina najveća, a gdje akceleracija?",
    A: 10,
    jedinica_A: "cm",
    T: 1.6,
    g: 10,
    prikazi: ["y-t", "v-t", "a-t"],
    brojaci: ["y", "v", "a"],
  },
  // 1085 a: položaji
  {
    tip: TIP,
    scena: "njihalo",
    ikona: "ljuljacka",
    nacin: "odaberi_polozaj",
    tekst: "Dodirni **sve** položaje u kojima je traženo najveće.",
    A: 10,
    jedinica_A: "cm",
    T: 1.6,
    g: 10,
    pitanja: [{ trazi: "v_max" }, { trazi: "a_max" }],
  },
  // 1085 a: najveći iznosi
  {
    tip: TIP,
    scena: "njihalo",
    ikona: "ljuljacka",
    nacin: "izracunaj",
    tekst:
      "Od sredine se dijete najviše odmakne 10 cm, a puni zamah traje 1,6 s. Izračunaj najveću brzinu i najveću akceleraciju.",
    A: 10,
    jedinica_A: "cm",
    T: 1.6,
    g: 10,
    prikazi: ["v-t", "a-t"],
    brojaci: ["v", "a"],
    pitaj: [{ velicina: "v0" }, { velicina: "a0" }],
  },
  // 1085 b: y, a, F u t = 0,2 s
  {
    tip: TIP,
    scena: "njihalo",
    ikona: "ljuljacka",
    nacin: "izracunaj",
    tekst:
      "Dijete mase 30 kg prođe kroz sredinu u $t = 0$. Koliki su odmak, akceleracija i sila $0{,}2$ s kasnije?",
    A: 10,
    jedinica_A: "cm",
    T: 1.6,
    g: 10,
    m: 30,
    prikazi: ["y-t", "a-t"],
    brojaci: ["y", "a", "F"],
    strelice: ["v", "F"],
    pitaj: [
      { velicina: "y", t: 0.2, jedinica: "m" },
      { velicina: "a", t: 0.2 },
      { velicina: "F", t: 0.2 },
    ],
  },
  // 1090 a: graf E_p(x)
  {
    tip: TIP,
    scena: "opruga",
    polozaj: "vodoravno",
    nacin: "izracunaj",
    tekst:
      "Na grafu je elastična potencijalna energija tijela na opruzi u ovisnosti o elongaciji. Kolika je ukupna energija titranja, a kolika konstanta opruge?",
    A: 0.6,
    k: 20,
    m: 1,
    prikazi: ["Ep-x"],
    brojaci: ["y", "Ep", "Ek"],
    pitaj: [{ velicina: "E" }, { velicina: "k" }],
  },
  // 1090 b: položaj u kojem je sila 10 N
  {
    tip: TIP,
    scena: "opruga",
    polozaj: "vodoravno",
    nacin: "postavi",
    tekst:
      "Opruga ima $k = 20$ N/m, amplituda je $0{,}6$ m. Povuci uteg na mjesto gdje ga opruga vuče silom od **10 N**.",
    A: 0.6,
    k: 20,
    m: 1,
    mijenja: "x",
    korak_x: 0.05,
    prikazi: ["Ep-x", "stupci"],
    brojaci: ["y", "F", "Ep", "Ek"],
    cilj: { velicina: "F", vrijednost: 10 },
  },
  // 1090 b: E_p i E_k
  {
    tip: TIP,
    scena: "opruga",
    polozaj: "vodoravno",
    nacin: "izracunaj",
    tekst:
      "Tijelo je na $x = 0{,}5$ m od ravnoteže ($k = 20$ N/m, $A = 0{,}6$ m). Kolike su tamo potencijalna i kinetička energija?",
    A: 0.6,
    k: 20,
    m: 1,
    prikazi: ["Ep-x", "stupci"],
    brojaci: ["y", "Ep", "Ek"],
    pitaj: [
      { velicina: "Ep", x: 0.5 },
      { velicina: "Ek", x: 0.5 },
    ],
  },
  // energija: E_k = E_p
  {
    tip: TIP,
    scena: "opruga",
    polozaj: "vodoravno",
    nacin: "odaberi_polozaj",
    tekst:
      "Dodirni položaje u kojima je kinetička energija jednaka potencijalnoj.",
    A: 0.6,
    k: 20,
    m: 1,
    tocke: [-1, -0.71, -0.5, 0, 0.5, 0.71, 1],
    pitanja: [{ trazi: "Ek_jednako_Ep" }],
  },
  // 1095: opruga i njihalo, štoperica
  {
    tip: TIP,
    scena: "opruga",
    polozaj: "okomito",
    nacin: "istrazi",
    tekst:
      "Mijenjaj masu utega i konstantu opruge. Štopericom i brojačem titraja izmjeri period: kako ovisi o $m$, a kako o $k$?",
    A: 0.05,
    m: "m",
    k: "k",
    klizaci: [
      {
        id: "m",
        oznaka: "masa utega $m$",
        min: 0.1,
        max: 2,
        korak: 0.1,
        pocetak: 0.4,
        jedinica: "kg",
      },
      {
        id: "k",
        oznaka: "konstanta opruge $k$",
        min: 1,
        max: 20,
        korak: 0.5,
        pocetak: 4,
        jedinica: "N/m",
      },
    ],
    prikazi: ["y-t", "stoperica", "brojac_titraja"],
    brojaci: ["T"],
  },
  // 1095 a: namjesti oprugu
  {
    tip: TIP,
    scena: "opruga",
    polozaj: "okomito",
    nacin: "postavi",
    tekst:
      "Namjesti oprugu tako da uteg od 0,4 kg napravi **30 titraja u 60 s**. Pusti štopericu i broji titraje.",
    m: 0.4,
    A: 0.05,
    k: "k",
    mijenja: "k",
    klizaci: [
      {
        id: "k",
        oznaka: "konstanta opruge $k$",
        min: 1,
        max: 10,
        korak: 0.1,
        pocetak: 8,
        jedinica: "N/m",
      },
    ],
    prikazi: ["stoperica", "brojac_titraja"],
    brojaci: [],
    ubrzanje: 4,
    skriveno: true,
    cilj: { velicina: "n", t: 60, vrijednost: 30 },
  },
  // 1095 b: njihalo, masa ne mijenja period
  {
    tip: TIP,
    scena: "njihalo",
    nacin: "istrazi",
    tekst:
      "Mijenjaj duljinu niti i masu kuglice i mjeri period. Što od toga mijenja period?",
    A: 0.1,
    g: 10,
    l: "l",
    m: "m",
    klizaci: [
      {
        id: "l",
        oznaka: "duljina niti $\\ell$",
        min: 0.5,
        max: 5,
        korak: 0.05,
        pocetak: 1,
        jedinica: "m",
      },
      {
        id: "m",
        oznaka: "masa kuglice $m$",
        min: 0.1,
        max: 2,
        korak: 0.1,
        pocetak: 0.5,
        jedinica: "kg",
      },
    ],
    prikazi: ["y-t", "stoperica", "brojac_titraja"],
    brojaci: ["T"],
  },
  // 1095 b: namjesti nit
  {
    tip: TIP,
    scena: "njihalo",
    nacin: "postavi",
    tekst:
      "Namjesti duljinu niti tako da kuglica napravi **10 titraja u 35 s** ($g = 10$ m/s²).",
    A: 0.1,
    g: 10,
    l: "l",
    mijenja: "l",
    klizaci: [
      {
        id: "l",
        oznaka: "duljina niti $\\ell$",
        min: 0.5,
        max: 5,
        korak: 0.05,
        pocetak: 1,
        jedinica: "m",
      },
    ],
    prikazi: ["stoperica", "brojac_titraja"],
    brojaci: [],
    skriveno: true,
    cilj: { velicina: "n", t: 35, vrijednost: 10 },
  },
  // 1095: izračun k i ℓ iz mjerenja
  {
    tip: TIP,
    scena: "njihalo",
    nacin: "izracunaj",
    tekst:
      "Kuglica obješena na nit napravi 10 titraja u 35 s. Koliki su period i duljina niti? ($g = 10$ m/s²)",
    A: 0.2,
    g: 10,
    mjerenje: { n: 10, t: 35 },
    prikazi: ["stoperica", "brojac_titraja"],
    pitaj: [{ velicina: "T" }, { velicina: "l" }],
  },
  // zaustavi: akceleracija najveća (okomita opruga)
  {
    tip: TIP,
    scena: "opruga",
    polozaj: "okomito",
    nacin: "zaustavi",
    tekst:
      "Zaustavi titranje u trenutku kad je **akceleracija** utega najveća.",
    A: 4,
    jedinica_A: "cm",
    T: 2,
    m: 0.5,
    prikazi: ["y-t", "a-t"],
    brojaci: ["t", "y"],
    strelice: ["v"],
    cilj: { uvjet: "a_max" },
  },
];

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
function validateSpec(s) {
  const { list, need } = problems();
  need(
    NACINI.includes(s.nacin),
    `titranje.nacin mora biti jedan od: ${NACINI.join(", ")}`,
  );
  need(isText(s.tekst), "titranje treba „tekst“");
  if (
    !need(
      SCENE.includes(s.scena),
      `titranje.scena mora biti jedna od: ${SCENE.join(", ")}`,
    )
  )
    return list;
  if (s.polozaj != null)
    need(
      s.scena === "opruga" && POLOZAJI.includes(s.polozaj),
      `polozaj ("okomito" | "vodoravno") postoji samo uz scena "opruga"`,
    );
  if (s.ikona != null)
    need(
      s.scena === "njihalo" && IKONE.includes(s.ikona),
      `ikona ("kuglica" | "ljuljacka") postoji samo uz scena "njihalo"`,
    );
  if (s.jedinica_A != null)
    need(
      ["m", "cm"].includes(s.jedinica_A),
      'jedinica_A mora biti "m" ili "cm"',
    );

  // klizači po načinu
  if (s.nacin === "istrazi") validateKlizaci(s, need, { najvise: 3 });
  else if (s.nacin === "postavi" && s.mijenja !== "x")
    validateKlizaci(s, need, { najmanje: 1, najvise: 1 });
  else
    need(
      s.klizaci == null,
      `${s.nacin === "postavi" ? 'postavi s mijenja "x"' : s.nacin} nema klizače: sve vrijednosti su brojevi`,
    );

  const koristeni = [];
  const polje = (ime, o) => {
    if (typeof s[ime] === "string") koristeni.push(s[ime]);
    return validatePolje(s, need, ime, o);
  };
  const fA = s.jedinica_A === "cm" ? 0.01 : 1;
  polje("A", {
    min: 0.0001 / fA,
    max: 10 / fA,
    opis: `amplituda u ${s.jedinica_A === "cm" ? "cm" : "m"}`,
  });
  const izv = izvoriPerioda(s);
  need(
    izv.length === 1,
    `period se zadaje točno jednim od: omega, T, f, mjerenje {n, t}${s.scena === "opruga" ? ", k (uz m)" : ""}${s.scena === "njihalo" ? ", l (uz g)" : ""}${izv.length > 1 ? ` (sad ih je više: ${izv.join(", ")})` : ""}`,
  );
  if (s.k != null && s.scena === "njihalo")
    need(false, "njihalo nema k: period zadaj s l (duljina niti) ili T");
  if (s.l != null && s.scena !== "njihalo")
    need(false, "l (duljina niti) postoji samo uz scena njihalo");
  if (s.k != null && s.scena === "tocka")
    need(false, "točka nema oprugu (k): period zadaj s omega, T ili f");
  if (s.omega != null)
    polje("omega", { min: 0.01, max: 1000, opis: "kružna frekvencija u s⁻¹" });
  if (s.T != null) polje("T", { min: 0.01, max: 1000, opis: "period u s" });
  if (s.f != null)
    polje("f", { min: 0.001, max: 100, opis: "frekvencija u Hz" });
  if (s.k != null && s.scena === "opruga") {
    polje("k", { min: 0.01, max: 1e6, opis: "konstanta opruge u N/m" });
    need(s.m != null, "uz k treba i masa m (period T = 2π√(m/k))");
  }
  if (s.l != null && s.scena === "njihalo")
    polje("l", { min: 0.01, max: 100, opis: "duljina niti u m" });
  if (s.m != null) polje("m", { min: 0.001, max: 1e5, opis: "masa u kg" });
  if (s.g != null) polje("g", { min: 1, max: 30, opis: "g u m/s²" });
  if (s.phi0 != null)
    polje("phi0", { min: -PI2, max: PI2, opis: "početna faza u rad" });
  if (s.mjerenje != null)
    need(
      s.mjerenje &&
        isNum(s.mjerenje.n) &&
        isNum(s.mjerenje.t) &&
        s.mjerenje.n > 0 &&
        s.mjerenje.n <= 1000 &&
        s.mjerenje.t > 0 &&
        s.mjerenje.t <= 10000,
      "mjerenje mora biti {n (broj titraja > 0), t (vrijeme u s > 0)}",
    );
  if (list.length) return list;
  validateKoristeniKlizaci(s, need, koristeni);
  if (list.length) return list;

  // fizikalna smislenost u cijelom rasponu klizača
  for (const p of krajnjeKombinacije(s)) {
    const M = modelTitranja(s, p);
    if (
      !need(
        isNum(M.T) && M.T > 0,
        "period se ne može izračunati iz zadanih vrijednosti",
      )
    )
      return list;
    if (
      s.scena === "njihalo" &&
      !need(
        M.A / M.l <= 0.35 + 1e-9,
        `njihalo: A/ℓ = ${formatNumber(M.A / M.l, 2)} je prevelik (najviše 0,35): kod velikog otklona titranje nije harmonijsko`,
      )
    )
      return list;
  }
  const M = modelTitranja(s);
  const tKraj = trajanjeTitranja(s);

  // prikaz
  const meta = velicineTitranja(s);
  const pr = prikaziTitranja(s);
  if (s.prikazi != null) {
    if (
      need(
        Array.isArray(s.prikazi) &&
          s.prikazi.every((v) => PRIKAZI.includes(v)) &&
          new Set(s.prikazi).size === s.prikazi.length,
        `prikazi mora biti popis različitih vrijednosti iz: ${PRIKAZI.join(", ")}`,
      )
    ) {
      need(grafoviTitranja(s).length <= 3, "prikazi: najviše 3 grafa");
      need(
        !pr.includes("kruznica") || s.scena === "tocka",
        'kruznica (referentna kružnica) ide samo uz scena "tocka"',
      );
      for (const v of ["F-t", "E-t", "Ep-x", "stupci"])
        need(
          !pr.includes(v) || imaMasu(s),
          `prikaz ${v} treba masu m (sila i energija)`,
        );
    }
  }
  if (s.brojaci != null)
    need(
      Array.isArray(s.brojaci) &&
        s.brojaci.length <= 6 &&
        new Set(s.brojaci).size === s.brojaci.length &&
        s.brojaci.every((k) => k in meta && k !== "A" && k !== "m"),
      `brojaci: 0–6 različitih veličina iz: ${Object.keys(meta)
        .filter((k) => k !== "A" && k !== "m")
        .join(", ")} (F, energije, F0 i k trebaju m)`,
    );
  if (s.strelice != null)
    need(
      Array.isArray(s.strelice) &&
        s.strelice.length <= 2 &&
        s.strelice.every((v) => STRELICE.includes(v)) &&
        !(s.strelice.includes("a") && s.strelice.includes("F")) &&
        (!s.strelice.includes("F") || imaMasu(s)),
      'strelice: popis od najviše dvije iz v, a, F (a ili F, ne obje; F treba m), npr. ["v", "a"]',
    );
  if (s.ubrzanje != null)
    need(
      isNum(s.ubrzanje) && s.ubrzanje > 0 && s.ubrzanje <= 50,
      "ubrzanje je mjerilo vremena animacije (0–50)",
    );
  if (s.t_kraj != null)
    need(
      isNum(s.t_kraj) &&
        s.t_kraj > 0 &&
        s.t_kraj <= 1000 &&
        s.t_kraj / M.T <= 200,
      "t_kraj mora biti od 0 do 1000 s i najviše 200 perioda",
    );
  else
    need(
      tKraj / M.T <= 200,
      "vremenska os bi imala više od 200 perioda: zadaj kraći t_kraj ili veći period",
    );

  const nacinPolja = [
    "cilj",
    "pitanja",
    "pitaj",
    "mijenja",
    "skriveno",
    "tocke",
    "korak_x",
    "pocetak_x",
  ];
  const dopustena = {
    istrazi: [],
    zaustavi: ["cilj"],
    odaberi_polozaj: ["pitanja", "tocke"],
    postavi: ["cilj", "mijenja", "skriveno", "korak_x", "pocetak_x"],
    izracunaj: ["pitaj"],
  }[s.nacin];
  for (const f of nacinPolja)
    need(
      !(f in s) || dopustena.includes(f),
      `polje „${f}“ ne postoji u načinu ${s.nacin}`,
    );
  need(
    !("krivo" in s) || ["zaustavi", "postavi"].includes(s.nacin),
    "krivo na razini speca postoji samo u zaustavi i postavi (u izracunaj ide uz stavku pitaj)",
  );

  if (s.nacin === "istrazi") noAnswerFields(s, need);
  if (s.nacin === "zaustavi") validateZaustavi(s, need, M, tKraj);
  if (s.nacin === "odaberi_polozaj") validateOdaberi(s, need);
  if (s.nacin === "postavi") validatePostavi(s, need, M, meta);
  if (s.nacin === "izracunaj") validateIzracunaj(s, need, M);
  return list;
}

function validateZaustavi(s, need, M, tKraj) {
  const c = s.cilj;
  if (
    !need(
      c && typeof c === "object" && UVJETI.includes(c.uvjet),
      `zaustavi treba cilj: {uvjet: ${UVJETI.join(" | ")}}`,
    )
  )
    return;
  if (c.prvi != null)
    need(typeof c.prvi === "boolean", "cilj.prvi mora biti true ili false");
  if (c.uvjet === "put")
    need(
      isNum(c.vrijednost) &&
        c.vrijednost > 0 &&
        c.vrijednost <= 200 &&
        Math.abs(c.vrijednost * 2 - Math.round(c.vrijednost * 2)) < 1e-9,
      "uvjet put: cilj.vrijednost je put u amplitudama, cijeli broj ili polovica (npr. 6 ili 2,5)",
    );
  else if (c.uvjet === "t")
    need(
      isNum(c.vrijednost) && c.vrijednost > 0 && c.vrijednost <= tKraj,
      `uvjet t: cilj.vrijednost je trenutak u s, od 0 do kraja osi (${formatNumber(tKraj)} s)`,
    );
  else need(c.vrijednost == null, `uvjet ${c.uvjet} nema vrijednost`);
  const ts = trenuciCilja(s, M, tKraj);
  need(
    ts.length > 0 && ts[0] <= tKraj + 1e-9,
    `uvjet se ne ispuni do kraja vremenske osi (${formatNumber(tKraj)} s): povećaj t_kraj`,
  );
  validateKrivo(s.krivo, null, 0, need);
  if (Array.isArray(s.krivo) && ts.length)
    s.krivo.forEach((k, i) =>
      need(
        !(
          isNum(k?.vrijednost) &&
          Math.abs(k.vrijednost - ts[0]) <= tolerancijaZaustavi(M)
        ),
        `krivo[${i}].vrijednost je točan trenutak`,
      ),
    );
}

function validateOdaberi(s, need) {
  const tocke = tockeOdabira(s);
  if (s.tocke != null)
    need(
      Array.isArray(s.tocke) &&
        s.tocke.length >= 3 &&
        s.tocke.length <= 9 &&
        s.tocke.every((u) => isNum(u) && u >= -1 && u <= 1) &&
        new Set(s.tocke).size === s.tocke.length &&
        s.tocke.every((u, i) => i === 0 || u > s.tocke[i - 1]),
      "tocke: 3–9 različitih udjela amplitude od −1 do 1, poredanih od najmanjeg (npr. [-1, -0.5, 0, 0.5, 1])",
    );
  if (
    !need(
      Array.isArray(s.pitanja) &&
        s.pitanja.length >= 1 &&
        s.pitanja.length <= 3,
      "odaberi_polozaj treba pitanja: [{trazi}] (1–3)",
    )
  )
    return;
  const vidjeno = new Set();
  s.pitanja.forEach((q, i) => {
    if (
      !need(
        TRAZI.includes(q?.trazi),
        `pitanja[${i}].trazi mora biti jedno od: ${TRAZI.join(", ")}`,
      )
    )
      return;
    need(!vidjeno.has(q.trazi), `pitanja[${i}]: „${q.trazi}“ se ponavlja`);
    vidjeno.add(q.trazi);
    need(
      tocke.some((u) => ispunjava(q.trazi, u)),
      q.trazi === "Ek_jednako_Ep"
        ? "za Ek_jednako_Ep tocke moraju sadržavati ±0.71 (A/√2)"
        : `pitanja[${i}]: nijedna točka ne ispunjava „${q.trazi}“ (dodaj 0 ili ±1 u tocke)`,
    );
    need(
      !tocke.every((u) => ispunjava(q.trazi, u)),
      `pitanja[${i}]: sve točke su točne, pa pitanje ništa ne provjerava`,
    );
  });
}

function validatePostavi(s, need, M, meta) {
  const c = s.cilj;
  if (s.skriveno != null)
    need(typeof s.skriveno === "boolean", "skriveno mora biti true ili false");
  if (s.mijenja === "x") {
    need(isNum(s.A), 'uz mijenja "x" amplituda A mora biti broj');
    need(s.skriveno == null, 'skriveno ne postoji uz mijenja "x"');
    if (
      !need(
        c && POSTAVI_X_VEL.includes(c.velicina) && isNum(c.vrijednost),
        `postavi s mijenja "x" treba cilj: {velicina: ${POSTAVI_X_VEL.join(" | ")}, vrijednost}`,
      )
    )
      return;
    need(
      c.velicina === "v" || c.velicina === "a" || imaMasu(s),
      `cilj ${c.velicina} treba masu m`,
    );
    if (c.tolerancija != null)
      need(
        isNum(c.tolerancija) && c.tolerancija >= 0,
        "cilj.tolerancija mora biti nenegativan broj",
      );
    need(c.t == null, "cilj.t postoji samo uz cilj n");
    const kq = korakX(s);
    if (
      !need(
        isNum(kq) &&
          kq > 0 &&
          Math.abs(s.A / kq - Math.round(s.A / kq)) < 1e-6 &&
          s.A / kq <= 200,
        "korak_x mora dijeliti amplitudu A (najviše 200 koraka)",
      )
    )
      return;
    const mreza = mrezaX(s);
    if (s.pocetak_x != null)
      need(
        isNum(s.pocetak_x) &&
          mreza.some((x) => Math.abs(x - s.pocetak_x) < 1e-9),
        "pocetak_x mora biti na mreži od −A do A s korakom korak_x",
      );
    const a = analizaX(s);
    need(
      a.tocni.length > 0,
      `cilj nije ostvariv na mreži položaja (korak ${formatNumber(kq)}): ${meta[c.velicina]?.naziv} ide od ${broj(Math.min(...mreza.map((x) => Math.abs(stanjeUPolozaju(M, x * M.fA)[c.velicina]))))} do ${broj(Math.max(...mreza.map((x) => Math.abs(stanjeUPolozaju(M, x * M.fA)[c.velicina]))))}`,
    );
    need(
      !a.ok(pocetnoStanje(s).x),
      "tijelo na početku već ostvaruje cilj, pa bi Provjeri bez pomicanja bio točan",
    );
    validateKrivo(s.krivo, null, 0, need);
    if (Array.isArray(s.krivo))
      s.krivo.forEach(
        (k, i) =>
          isNum(k?.vrijednost) &&
          need(
            !a.ok(k.vrijednost),
            `krivo[${i}].vrijednost ostvaruje cilj, a to je točan odgovor`,
          ),
      );
    return;
  }
  const k = klizaciOd(s)[0];
  if (!k) return;
  need(
    s.mijenja === k.id,
    `mijenja mora biti "x" ili id jedinog klizača („${k.id}“)`,
  );
  need(
    s.korak_x == null && s.pocetak_x == null,
    'korak_x i pocetak_x postoje samo uz mijenja "x"',
  );
  if (
    !need(
      c && POSTAVI_VEL.includes(c.velicina) && isNum(c.vrijednost),
      `postavi treba cilj: {velicina: ${POSTAVI_VEL.join(" | ")}, vrijednost (broj)}`,
    )
  )
    return;
  if (c.velicina === "n")
    need(
      isNum(c.t) && c.t > 0 && c.t <= 1000,
      "cilj n treba t: vrijeme u s u kojem se broje titraji",
    );
  else need(c.t == null, "cilj.t postoji samo uz cilj n");
  if (
    !need(
      c.velicina in stalneVelicine(s),
      `cilj ${c.velicina} ne postoji u ovoj sceni (${["F0", "E", "k"].includes(c.velicina) ? "treba masu m" : c.velicina === "l" ? "samo njihalo" : ""})`,
    )
  )
    return;
  if (c.tolerancija != null)
    need(
      isNum(c.tolerancija) && c.tolerancija >= 0,
      "cilj.tolerancija mora biti nenegativan broj",
    );
  let a;
  try {
    a = analizaPostavi(s);
  } catch {
    need(false, "cilj se ne može izračunati");
    return;
  }
  need(
    a.dostizno,
    `cilj nije ostvariv klizačem „${k.id}“ (od ${formatNumber(k.min)} do ${formatNumber(k.max)}, korak ${formatNumber(k.korak)}): najbliže je ${formatNumber(a.best)}${k.jedinica ? ` ${k.jedinica}` : ""}`,
  );
  need(
    !a.ok(k.pocetak),
    `klizač „${k.id}“ na početku (${formatNumber(k.pocetak)}) već ostvaruje cilj`,
  );
  const ok = a.vrijednosti.filter((v) => a.ok(v));
  need(
    ok.length <= 4,
    `cilj prihvaća previše položaja klizača (${ok.length}): smanji korak ili toleranciju`,
  );
  validateKrivo(s.krivo, null, 0, need);
  if (Array.isArray(s.krivo))
    s.krivo.forEach(
      (q, i) =>
        isNum(q?.vrijednost) &&
        need(
          !a.ok(q.vrijednost),
          `krivo[${i}].vrijednost ostvaruje cilj, a to je točan odgovor`,
        ),
    );
}

function validateIzracunaj(s, need, M) {
  if (
    !need(
      Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
      "izracunaj treba pitaj: [{velicina, t? | x?, jedinica?}] (1–3)",
    )
  )
    return;
  const meta = velicineTitranja(s);
  s.pitaj.forEach((it, i) => {
    const w = `pitaj[${i}]`;
    if (
      !need(
        it && IZRACUNAJ_VEL.includes(it.velicina),
        `${w}.velicina mora biti jedna od: ${IZRACUNAJ_VEL.join(", ")}`,
      )
    )
      return;
    const v = it.velicina;
    if (
      !need(
        v in meta,
        `${w}: ${v} ne postoji u ovoj sceni (${["F", "F0", "Ep", "Ek", "E", "k"].includes(v) ? "treba masu m" : v === "l" ? "samo njihalo" : v === "k" ? "njihalo nema k" : ""})`,
      )
    )
      return;
    const trenutna = ["y", "v", "a", "F", "Ep", "Ek"].includes(v);
    if (trenutna) {
      need(
        (it.t != null) !== (it.x != null),
        `${w}: ${v} treba točno jedno od t (trenutak u s) ili x (položaj)`,
      );
      need(
        v !== "y" || it.x == null,
        `${w}: elongacija se traži u trenutku t, ne u položaju x`,
      );
    } else
      need(
        it.t == null && it.x == null,
        `${w}: ${v} je stalna veličina, bez t i x`,
      );
    if (it.t != null)
      need(
        isNum(it.t) && it.t >= 0 && it.t <= 1000,
        `${w}.t mora biti trenutak od 0 do 1000 s`,
      );
    if (it.x != null)
      need(
        isNum(it.x) && Math.abs(it.x * M.fA) <= M.A * (1 + 1e-9),
        `${w}.x mora biti položaj od −A do A (u jedinici amplitude)`,
      );
    if (it.jedinica != null)
      need(
        v === "y"
          ? ["m", "cm"].includes(it.jedinica)
          : it.jedinica === jedinicaStavke(s, { velicina: v }),
        `${w}.jedinica: ${v === "y" ? '"m" ili "cm"' : `za ${v} je ${jedinicaStavke(s, { velicina: v })}`}`,
      );
    if (it.predznak != null)
      need(
        typeof it.predznak === "boolean",
        `${w}.predznak mora biti true ili false`,
      );
    if (it.oznaka != null)
      need(isText(it.oznaka), `${w}.oznaka mora biti tekst`);
    if (it.tolerancija != null)
      need(
        isNum(it.tolerancija) && it.tolerancija >= 0,
        `${w}.tolerancija mora biti nenegativan broj`,
      );
    const tocno = tocnoStavke(s, it);
    if (!need(isNum(tocno), `${w}: vrijednost se ne može izračunati`)) return;
    validateKrivo(it.krivo, tocno, tolStavke(it, tocno), need, `${w}.krivo`);
  });
}

// ── točan odgovor ───────────────────────────────────────────────────────────────────────────────────
function tocanOdgovor(s) {
  const M = modelTitranja(s);
  if (s.nacin === "zaustavi") {
    const t = trenuciCilja(s, M)[0];
    return isNum(t) ? `t = ${tFmt(t)}` : "";
  }
  if (s.nacin === "odaberi_polozaj")
    return s.pitanja
      .map(
        (q, i) =>
          `${s.pitanja.length > 1 ? `${i + 1}. ` : ""}${opisTrazenog(s, q.trazi)}: ${tocniPolozaji(s, q.trazi).map(oznakaUdjela).join(" i ")}`,
      )
      .join("; ");
  if (s.nacin === "postavi") {
    if (s.mijenja === "x") {
      const a = analizaX(s);
      const poz = [...new Set(a.tocni.map((x) => Math.abs(x)))];
      const oz = velicineTitranja(s).y.oznaka;
      return poz
        .map((x) => `${oz} = ${x === 0 ? "0" : "±"}${withUnit(x, a.M.jedA)}`)
        .join(" ili ");
    }
    const a = analizaPostavi(s);
    return `${bezLatexa(a.k.oznaka)} = ${withUnit(a.best, a.k.jedinica)}`;
  }
  if (s.nacin === "izracunaj")
    return s.pitaj
      .map((it) => {
        const oz = bezLatexa(oznakaStavke(s, it)).replace(/_(\w)/, "$1");
        return `${oz} = ${withUnit(Number(tocnoStavke(s, it).toPrecision(3)), jedinicaStavke(s, it))}`;
      })
      .join("; ");
  return "";
}

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const titranje = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate: validateSpec,
  check(s, odgovor) {
    if (s.nacin === "zaustavi") return checkZaustavi(s, odgovor);
    if (s.nacin === "odaberi_polozaj") return checkOdaberi(s, odgovor);
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor,
};
