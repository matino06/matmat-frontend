// poluraspad: zakon radioaktivnog raspada (Blok Q, moderna fizika). Dvije scene:
// - "uzorci": 1–2 „posude“ s rešetkom kockica-jezgara (X lijevo, Y desno), sat i graf N/N₀ (t) s točkama na T, 2T, 3T…;
//   jezgre se raspadaju nasumičnim redom (sjeme), a broj preostalih je uvijek točno round(N₀·2^(−t/T)).
// - "aktivnost": bočica izotopa, Geigerov brojač koji klikće to rjeđe što je jezgara manje i ploča A = λ·N.
// Načini: istrazi, prikaz (POGLEDAJ); izracunaj, postavi, zaustavi (ODGOVOR). Sva fizika, geometrija crteža, tekstovi
// očitanja i „što je skriveno“ su čiste funkcije (spec, stanje) → JSON, da ih nativna iOS aplikacija može izvršiti.
import {
  isNum,
  parseNumber,
  formatNumber,
  formatSci,
  near,
} from "../../core/number.js";
import { UNITS, normUnit } from "../../core/units.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
} from "../zajednicko.js";

const TIP = "poluraspad";
export const SCENE = ["uzorci", "aktivnost"];
export const NACINI = {
  uzorci: ["istrazi", "prikaz", "izracunaj", "postavi", "zaustavi"],
  aktivnost: ["istrazi", "prikaz", "izracunaj"],
};
export const VELICINE_UZORCI = ["udio", "omjer", "n", "N"];
export const VELICINE_AKTIVNOST = ["T_s", "A0_Bq", "lambda", "N0", "A", "N"];
export const N0_PRIKAZ = [64, 256, 1024];
export const LN2 = Math.LN2; // u tekstu: ln 2 ≈ 0,693 (kao u knjižici)

const jediniceVremena = () => UNITS.vrijeme.map(([u]) => u);
const jediniceAktivnosti = () => UNITS.aktivnost.map(([u]) => u);
const faktorVremena = (j) =>
  UNITS.vrijeme.find(([u]) => u === normUnit(j))?.[1] ?? null;
const faktorAktivnosti = (j) =>
  UNITS.aktivnost.find(([u]) => u === normUnit(j))?.[1] ?? null;

// ── osnovna fizika ──────────────────────────────────────────────────────────────────────────────────
export const udio = (t, T) => 2 ** (-t / T);
export const lambda = (T_s) => LN2 / T_s;
export const aktivnostIz = (lam, N) => lam * N;
// broj preostalih od N₀ nakon n poluraspada: jezgra ranga k (0…N₀−1) živi dok je k + 0,5 < N₀·2^(−n), pa ih je
// točno round(N₀·2^(−n)); isto pravilo koristi i crtež kockica, pa se crtež i brojka nikad ne razilaze
export const brojPreostalih = (N0, n) =>
  Math.max(0, Math.min(N0, Math.ceil(N0 * 2 ** -n - 0.5 - 1e-9)));

// ── sjeme slučajnosti (mulberry32) i redoslijed raspada ─────────────────────────────────────────────
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// rang svake kockice (0 = raspada se zadnja). Kockica ranga k raspadne se nakon n_k = −log₂((k + 0,5)/N₀) poluraspada.
export function rangoviKockica(N0, seed) {
  const r = rng(seed);
  const a = Array.from({ length: N0 }, (_, i) => i);
  for (let i = N0 - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const vremenaRaspada = (N0, seed) =>
  rangoviKockica(N0, seed).map((k) => -Math.log2((k + 0.5) / N0));

// ── zapisi ──────────────────────────────────────────────────────────────────────────────────────────
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const gornji = (n) => [...String(n)].map((c) => SUP[c] ?? c).join("");
const zaokr = (x, d = 6) => Number(x.toFixed(d));

export function rijecJedinice(j, v) {
  if (j !== "dan") return j;
  const n = Math.abs(v);
  return Number.isInteger(n) && n % 10 === 1 && n % 100 !== 11 ? "dan" : "dana";
}
export const zapisVremena = (v, j) =>
  `${formatNumber(zaokr(v, 3))}\u00a0${rijecJedinice(j, zaokr(v, 3))}`;

// cijeli broj s razmacima između tisućica (230 400)
export function razmak(n) {
  if (!Number.isInteger(n) || Math.abs(n) >= 1e9) return formatSci(n);
  if (Math.abs(n) < 10000) return String(n);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

// udio kao razlomak 1/64 kad je to moguće, inače decimalno
export function zapisUdjela(u) {
  if (!isNum(u)) return "";
  if (u <= 0) return "0";
  if (u >= 1 - 1e-9) return formatNumber(zaokr(u, 4));
  const inv = 1 / u;
  const k = Math.round(inv);
  if (k <= 1e6 && Math.abs(inv - k) < 1e-6 * inv) return `1/${k}`;
  return u < 0.001 ? formatSci(u) : formatNumber(Number(u.toPrecision(3)));
}
export function zapisOmjera(r) {
  if (!isNum(r) || r <= 0) return "";
  const cijeli = (x) => Math.abs(x - Math.round(x)) < 1e-6 * x;
  if (r <= 1) {
    const k = 1 / r;
    return `1 : ${cijeli(k) ? Math.round(k) : formatNumber(Number(k.toPrecision(3)))}`;
  }
  return `${cijeli(r) ? Math.round(r) : formatNumber(Number(r.toPrecision(3)))} : 1`;
}

// Učenikov unos udjela ili omjera: „1/64“, „0,0156“, „1 : 16“, „2^-6“, „(1/2)^6“, „1/2⁶“, „1,56 %“.
export function parseUdio(input) {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  let s = input
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, "")
    .replace(/\u00a0|\u202f/g, "");
  if (!s) return null;
  if (s.endsWith("%")) {
    const p = parseUdio(s.slice(0, -1));
    return p == null ? null : p / 100;
  }
  const direktno = parseNumber(s);
  if (direktno != null) return direktno;
  s = s
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => {
      const t = [...m].map((c) => (c === "⁻" ? "-" : SUP.indexOf(c))).join("");
      return `^(${t})`;
    })
    .replace(/:/g, "/")
    .replace(/[·×x*⋅]/g, "*");
  const v = izraz(s);
  return isNum(v) ? v : null;
}
// mali parser: brojevi (decimalni zarez), * / ^, zagrade, unarni minus
function izraz(s) {
  let i = 0;
  const broj = () => {
    const m = s.slice(i).match(/^\d+(?:[.,]\d+)?/);
    if (!m) throw 0;
    i += m[0].length;
    return Number(m[0].replace(",", "."));
  };
  const atom = () => {
    if (s[i] === "(") {
      i++;
      const v = produkt();
      if (s[i] !== ")") throw 0;
      i++;
      return v;
    }
    return broj();
  };
  const unarni = () => {
    if (s[i] === "-") {
      i++;
      return -unarni();
    }
    if (s[i] === "+") {
      i++;
      return unarni();
    }
    return potencija();
  };
  const potencija = () => {
    const b = atom();
    if (s[i] === "^") {
      i++;
      return b ** unarni();
    }
    return b;
  };
  const produkt = () => {
    let v = unarni();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i++];
      const d = unarni();
      v = op === "*" ? v * d : v / d;
    }
    return v;
  };
  try {
    const v = produkt();
    return i === s.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// ── scena „uzorci“: fizika ──────────────────────────────────────────────────────────────────────────
const BOJE = ["primary", "warn"]; // CSS varijable boja uzoraka (X, Y)
export const uzorciOd = (s) => (Array.isArray(s.uzorci) ? s.uzorci : []);
export const N0Prikaz = (s) => (isNum(s.N0_prikaz) ? s.N0_prikaz : 1024);
export const jedinicaT = (s) => s.jedinica_t ?? "s";
const sjeme = (s) => (isNum(s.sjeme) ? s.sjeme : 1266);
const klizaciOd = (s) => (Array.isArray(s.klizaci) ? s.klizaci : []);
export const klizacT = (s) => klizaciOd(s).find((k) => k.id === "t") ?? null;
// T uzorka: broj iz speca ili (istrazi) vrijednost klizača T_<oznaka>
export const TUzorka = (s, i, stanje = {}) => {
  const u = uzorciOd(s)[i];
  const k = klizaciOd(s).find((q) => q.id === `T_${u?.oznaka}`);
  if (k && isNum(stanje[k.id])) return stanje[k.id];
  if (k && !isNum(u?.T)) return k.pocetak ?? k.min;
  return u?.T;
};
const indeksUzorka = (s, oznaka) => {
  if (oznaka == null) return 0;
  return uzorciOd(s).findIndex((u) => u.oznaka === oznaka);
};

export function fizikaUzoraka(s, t, stanje = {}) {
  const N0 = N0Prikaz(s);
  const uz = uzorciOd(s).map((u, i) => {
    const T = TUzorka(s, i, stanje);
    const n = t / T;
    const ud = udio(t, T);
    return {
      oznaka: u.oznaka,
      T,
      n,
      udio: ud,
      N_prikaz: brojPreostalih(N0, n),
      N: isNum(s.N0) ? s.N0 * ud : null,
    };
  });
  return {
    t,
    uzorci: uz,
    omjer: uz.length === 2 ? uz[0].udio / uz[1].udio : null,
  };
}

// cilj u postavi/zaustavi: vrijeme t_cilj i „efektivno vrijeme poluraspada“ (za udio T uzorka; za omjer ono za koje se
// omjer prepolovi), iz kojeg slijedi tolerancija
export function ciljUdio(c) {
  if (c == null) return null;
  if (c.omjer != null) return parseUdio(c.omjer);
  return parseUdio(c.udio);
}
export function analizaCilja(s) {
  const c = s.cilj;
  if (!c) return null;
  const uz = uzorciOd(s);
  if (c.omjer != null) {
    if (uz.length !== 2) return null;
    const r = parseUdio(c.omjer);
    const a = 1 / uz[0].T - 1 / uz[1].T;
    if (!isNum(r) || r <= 0 || a === 0) return null;
    const t = -Math.log2(r) / a;
    const Teff = Math.abs(1 / a);
    return { t, Teff, vrsta: "omjer", vrijednost: r };
  }
  const i = indeksUzorka(s, c.uzorak);
  const u = parseUdio(c.udio);
  if (i < 0 || !isNum(u) || u <= 0 || u >= 1 || !isNum(uz[i]?.T)) return null;
  return {
    t: uz[i].T * -Math.log2(u),
    Teff: uz[i].T,
    vrsta: "udio",
    uzorak: i,
    vrijednost: u,
  };
}
export const TOL_POSTAVI = 0.02; // udio T
export const TOL_ZAUSTAVI = 0.08; // udio T (reakcija prstom)

// vremenski raspon grafa i sata
export function tMaxUzoraka(s) {
  const Tmax = Math.max(...uzorciOd(s).map((_, i) => TUzorka(s, i)));
  if (isNum(s.t_max)) return s.t_max;
  if (s.nacin === "postavi") return klizacT(s)?.max ?? 5 * Tmax;
  if (s.nacin === "zaustavi") {
    const a = analizaCilja(s);
    return a ? Math.ceil(a.t / a.Teff + 2 - 1e-9) * a.Teff : 5 * Tmax;
  }
  if (isNum(s.t) && s.t > 0) return s.t;
  const kl = klizaciOd(s).filter((k) => k.id.startsWith("T_"));
  const Tvel = Math.max(Tmax, ...kl.map((k) => k.max));
  return 4 * Tvel;
}
const Tmin = (s) => Math.min(...uzorciOd(s).map((_, i) => TUzorka(s, i)));
// koliko „simuliranog“ vremena prođe u jednoj stvarnoj sekundi
export function brzinaSata(s) {
  if (s.nacin === "zaustavi") {
    const a = analizaCilja(s);
    return a ? a.Teff / 2.5 : tMaxUzoraka(s) / 10;
  }
  if (s.nacin === "izracunaj") return tMaxUzoraka(s) / 4;
  return tMaxUzoraka(s) / 12;
}
// postavi: t na mreži klizača
export function zaokruziT(s, t) {
  const k = klizacT(s);
  const tm = tMaxUzoraka(s);
  if (!k) return Math.max(0, Math.min(tm, t));
  const v = k.min + Math.round((t - k.min) / k.korak) * k.korak;
  return zaokr(Math.max(k.min, Math.min(k.max, v)), 9);
}
export const pocetakT = (s) => {
  const k = klizacT(s);
  return k ? (k.pocetak ?? k.min) : 0;
};

// ── scena „uzorci“: geometrija ──────────────────────────────────────────────────────────────────────
export const W = 360;
export function geometrijaUzoraka(s) {
  const uz = uzorciOd(s);
  const dva = uz.length === 2;
  const strana = Math.round(Math.sqrt(N0Prikaz(s)));
  const G = dva ? 156 : 184;
  const x0s = dva ? [16, 188] : [(W - G) / 2];
  const yG = 34;
  const korak = G / strana;
  const vel = Math.max(1.5, korak * (strana >= 32 ? 0.8 : 0.84));
  const posude = x0s.map((x0, i) => ({
    x: x0,
    y: yG,
    w: G,
    h: G,
    boja: uz[i]?.boja ?? BOJE[i],
    naslovX: x0,
    naslovY: yG - 10,
    brojkaY: yG + G + 18,
  }));
  const satY = yG + G + 50;
  const graf = { x0: 46, x1: 344, y0: satY + 32, y1: satY + 32 + 120 };
  return {
    W,
    H: graf.y1 + 34,
    strana,
    korak,
    vel,
    posude,
    sat: { cx: 30, cy: satY, r: 14, tekstX: 52, tekstY: satY + 5 },
    graf,
  };
}
// položaj kockice k u posudi i (gornji lijevi kut)
export function kockica(geo, i, k) {
  const p = geo.posude[i];
  const c = k % geo.strana;
  const r = Math.floor(k / geo.strana);
  const pad = (geo.korak - geo.vel) / 2;
  return {
    x: zaokr(p.x + c * geo.korak + pad, 2),
    y: zaokr(p.y + r * geo.korak + pad, 2),
  };
}
// stanje kockica uzorka i u trenutku t: popisi indeksa živih, raspadnutih i upravo raspadnutih (bljesak)
const RANGOVI = new Map();
function rangovi(s, i) {
  const N0 = N0Prikaz(s);
  const key = `${N0}:${sjeme(s) + 7919 * i}`;
  if (!RANGOVI.has(key))
    RANGOVI.set(key, rangoviKockica(N0, sjeme(s) + 7919 * i));
  return RANGOVI.get(key);
}
export function stanjeKockica(s, i, t, stanje = {}, bljesak = 0.12) {
  const N0 = N0Prikaz(s);
  const T = TUzorka(s, i, stanje);
  const n = t / T;
  const granica = N0 * 2 ** -n;
  const svjeza = N0 * 2 ** -Math.max(0, n - bljesak);
  const zive = [];
  const raspadnute = [];
  const svjeze = [];
  rangovi(s, i).forEach((k, c) => {
    if (k + 0.5 < granica - 1e-9) zive.push(c);
    else if (k + 0.5 < svjeza - 1e-9 && n > 0) svjeze.push(c);
    else raspadnute.push(c);
  });
  return { zive, raspadnute, svjeze };
}

// os y: razine 1, ½, ¼, ⅛; os x: oznake na višekratnicima najkraćeg T (ili „okruglim“ brojevima)
const RAZINE = [
  [1, "1"],
  [1 / 2, "½"],
  [1 / 4, "¼"],
  [1 / 8, "⅛"],
];
function okrugliKorak(max, koliko = 6) {
  const sirovo = max / koliko;
  const p = 10 ** Math.floor(Math.log10(sirovo));
  const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= sirovo) ?? 10;
  return m * p;
}
// vidljivo: { krivulje, oznakeT (indeks uzorka čije se T, 2T… pišu na os, ili null), do (t do kojeg se crta) }
export function grafUzoraka(s, vidljivo, stanje = {}) {
  const geo = geometrijaUzoraka(s);
  const g = geo.graf;
  const tm = tMaxUzoraka(s);
  const X = (t) => zaokr(g.x0 + (t / tm) * (g.x1 - g.x0), 2);
  const Y = (u) => zaokr(g.y1 - u * (g.y1 - g.y0), 2);
  const tmin = Tmin(s);
  const korak = tm / tmin <= 12 ? tmin : okrugliKorak(tm);
  const osX = [];
  for (let k = 0; k * korak <= tm * (1 + 1e-9); k++) {
    const t = zaokr(k * korak, 9);
    osX.push({ x: X(t), tekst: formatNumber(t) });
  }
  // gusto: na uskom zaslonu svaka druga oznaka
  const gusto = osX.length > 9;
  osX.forEach((o, k) => (o.natpis = !gusto || k % 2 === 0));
  const osY = RAZINE.map(([u, tekst]) => ({ y: Y(u), tekst, crtkano: u < 1 }));
  const do_ = Math.max(0, Math.min(tm, vidljivo.do ?? 0));
  const krivulje = [];
  const tockeT = [];
  if (vidljivo.krivulje) {
    uzorciOd(s).forEach((u, i) => {
      const T = TUzorka(s, i, stanje);
      const kor = Math.max(1, Math.ceil(90 * (do_ / tm)));
      const tocke = [];
      for (let j = 0; j <= kor; j++) {
        const t = (do_ * j) / kor;
        tocke.push([X(t), Y(udio(t, T))]);
      }
      krivulje.push({ uzorak: i, boja: geo.posude[i].boja, tocke });
      for (let k = 1; k * T <= do_ + 1e-9 && k <= 12; k++)
        tockeT.push({
          uzorak: i,
          boja: geo.posude[i].boja,
          x: X(k * T),
          y: Y(2 ** -k),
          tekst: k === 1 ? "T" : `${k}T`,
          natpis: k <= 3 && (k * T) / tm < 0.93,
        });
    });
  }
  const oznakeT = [];
  if (vidljivo.oznakeT != null) {
    const i = vidljivo.oznakeT;
    const a = analizaCilja(s);
    const T = a?.vrsta === "omjer" ? a.Teff : TUzorka(s, i, stanje);
    for (let k = 1; k * T <= tm + 1e-9 && k <= 12; k++)
      oznakeT.push({ x: X(k * T), tekst: k === 1 ? "T" : `${k}T` });
  }
  return {
    ...g,
    osX,
    osY,
    jedinica: rijecJedinice(jedinicaT(s), 5),
    krivulje,
    tockeT,
    oznakeT,
    kursor: vidljivo.kursor ? X(do_) : null,
    tMax: tm,
  };
}
// x na grafu → t (vučenje kursora)
export function tIzX(s, x) {
  const g = geometrijaUzoraka(s).graf;
  const t = ((x - g.x0) / (g.x1 - g.x0)) * tMaxUzoraka(s);
  return zaokruziT(s, t);
}

// ── scena „uzorci“: što se vidi ─────────────────────────────────────────────────────────────────────
// otkriveno: pokazi, točan odgovor, ili (postavi/zaustavi) učenikov vlastiti provjereni položaj dok ga ne pomakne
export function vidljivoUzoraka(s, otkriveno) {
  const nacin = s.nacin;
  const slobodno = nacin === "istrazi" || nacin === "prikaz";
  const poklopac = (nacin === "postavi" || nacin === "zaustavi") && !otkriveno;
  const a = analizaCilja(s);
  return {
    kockice: !poklopac,
    krivulje: slobodno || otkriveno,
    brojke: slobodno || otkriveno || nacin === "izracunaj",
    nT: slobodno || otkriveno,
    omjer: slobodno || otkriveno,
    oznakeT:
      (nacin === "postavi" || nacin === "zaustavi") && !otkriveno
        ? (a?.uzorak ?? 0)
        : null,
  };
}

export function prikazUzoraka(s, t, otkriveno, stanje = {}) {
  const v = vidljivoUzoraka(s, otkriveno);
  const f = fizikaUzoraka(s, t, stanje);
  const j = jedinicaT(s);
  const N0 = N0Prikaz(s);
  const uz = f.uzorci.map((u) => ({
    oznaka: u.oznaka,
    naslov: `T = ${zapisVremena(u.T, j)}`,
    brojka: v.brojke
      ? `${u.N_prikaz} od ${N0} · ostalo ${zapisUdjela(u.udio)}`
      : null,
    poklopljen: !v.kockice,
  }));
  const nT =
    v.nT && f.uzorci.length
      ? f.uzorci
          .map(
            (u) =>
              `${formatNumber(zaokr(u.n, 2))} T${f.uzorci.length > 1 ? `(${u.oznaka})` : ""}`,
          )
          .join(" · ")
      : null;
  const omjer =
    v.omjer && f.omjer != null
      ? `${uz[0].oznaka} : ${uz[1].oznaka} = ${zapisOmjera(f.omjer)}`
      : null;
  const aria = [
    `Sat: t = ${zapisVremena(t, j)}.`,
    ...uz.map(
      (u) =>
        `Uzorak ${u.oznaka}, ${u.naslov}: ${u.poklopljen ? "u olovnoj kutiji, ne vidi se" : u.brojka ? `${u.brojka} jezgara` : `${N0} jezgara`}.`,
    ),
    omjer ? `Omjer ${omjer}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    sat: `t = ${zapisVremena(t, j)}`,
    nT,
    uzorci: uz,
    omjer,
    aria,
    vidljivo: v,
  };
}

// ── scena „uzorci“: izracunaj ───────────────────────────────────────────────────────────────────────
const bezTocnog = (krivo, a, tol) =>
  krivo.filter(
    (k) =>
      isNum(k.vrijednost) &&
      Number.isFinite(k.vrijednost) &&
      Math.abs(k.vrijednost - a) > Math.max(tol * 1.5, Math.abs(a) * 1e-6),
  );
const sKrivima = (krivo) => {
  // iste vrijednosti samo jednom (prva poruka ostaje)
  const out = [];
  for (const k of krivo)
    if (
      !out.some(
        (o) =>
          Math.abs(o.vrijednost - k.vrijednost) <=
          1e-9 * Math.max(1, Math.abs(k.vrijednost)),
      )
    )
      out.push(k);
  return out;
};

export function oznakaPitanjaUzorci(s, p) {
  const uz = uzorciOd(s);
  const i = Math.max(0, indeksUzorka(s, p.uzorak));
  const o = uz[i]?.oznaka ?? "";
  const vise = uz.length > 1;
  if (p.velicina === "omjer")
    return {
      oznaka: `N_${uz[0]?.oznaka} : N_${uz[1]?.oznaka}`,
      opis: "omjer broja jezgara",
      jedinica: "",
      razlomak: true,
    };
  if (p.velicina === "n")
    return {
      oznaka: vise ? `n_${o}` : "n",
      opis: `broj poluraspada${vise ? ` uzorka ${o}` : ""}`,
      jedinica: "",
    };
  if (p.velicina === "N")
    return {
      oznaka: vise ? `N_${o}` : "N",
      opis: `broj preostalih jezgara${vise ? ` uzorka ${o}` : ""}`,
      jedinica: "",
    };
  return {
    oznaka: vise ? `N_${o}/N_0` : "N/N_0",
    opis: `dio jezgara koji ostane${vise ? ` (uzorak ${o})` : ""}`,
    jedinica: "",
    razlomak: true,
  };
}

export function izracunPitanjaUzorci(s, p) {
  const f = fizikaUzoraka(s, s.t);
  const i = Math.max(0, indeksUzorka(s, p.uzorak));
  const u = f.uzorci[i];
  const drugi = f.uzorci[1 - i];
  const k = [];
  const add = (vrijednost, poruka) =>
    isNum(vrijednost) && k.push({ vrijednost, poruka });
  const o = oznakaPitanjaUzorci(s, p);
  let vrijednost;
  let tol;
  if (p.velicina === "udio" || p.velicina === "N") {
    const N0 = p.velicina === "N" ? s.N0 : 1;
    const n = u.n;
    vrijednost = N0 * u.udio;
    tol = isNum(p.tolerancija) ? p.tolerancija : vrijednost * 0.03;
    const sto = p.velicina === "N" ? "broj jezgara" : "udio";
    add(
      N0 / n,
      `Podijelio si s brojem poluraspada. Svaki poluraspad **prepolovi** ono što je ostalo, pa se polovine množe: ostane $(\\tfrac12)^n$ od početnog, a ne $\\tfrac1n$.`,
    );
    add(
      N0 / (2 * n),
      `Svaki poluraspad prepolovi ostatak, pa se polovine **množe**: nakon $n$ poluraspada ostane $(\\tfrac12)^n$, a ne $\\tfrac{1}{2n}$.`,
    );
    add(
      N0 * (1 - u.udio),
      `To je ${p.velicina === "N" ? "broj jezgara koje su se" : "dio jezgara koji se"} **raspao**. Pitanje je koliko ih je **ostalo**.`,
    );
    if (p.velicina === "udio")
      add(
        2 ** n,
        "To je koliko je puta jezgara manje. Udio je obrnuto: 1 podijeljeno s tim brojem.",
      );
    add(
      N0 * Math.max(0, 1 - n / 2),
      n >= 2
        ? "Nikad ne ostane nula: u svakom poluraspadu raspadne se polovica **preostalih** jezgara, a ne polovica početnih."
        : "Za vrijeme poluraspada raspadne se polovica **preostalih** jezgara, a ne svaki put polovica početnih: broj ne pada jednoliko.",
    );
    add(
      N0 * 2 ** (-u.T / s.t),
      "Obrnuo si $t$ i $T$: broj poluraspada je $n = t/T$ (proteklo vrijeme podijeljeno s vremenom poluraspada).",
    );
    if (drugi)
      add(
        N0 * drugi.udio,
        `To je ${sto} uzorka ${drugi.oznaka}. Za uzorak ${u.oznaka} uzmi njegovo vrijeme poluraspada.`,
      );
  } else if (p.velicina === "omjer") {
    const [a, b] = f.uzorci;
    vrijednost = f.omjer;
    tol = isNum(p.tolerancija) ? p.tolerancija : vrijednost * 0.03;
    add(
      1 / vrijednost,
      `Omjer je obrnut: traži se $N_${a.oznaka} : N_${b.oznaka}$, pa je ${a.oznaka} prvi. Izotop s kraćim vremenom poluraspada nestaje brže.`,
    );
    add(
      a.T / b.T,
      "To je omjer vremena poluraspada. Treba omjer **preostalih jezgara**: izračunaj udio svakog uzorka pa ih podijeli.",
    );
    add(
      b.T / a.T,
      "To je omjer brojeva poluraspada (ili vremena poluraspada). Treba omjer **preostalih jezgara**: izračunaj udio svakog uzorka pa ih podijeli.",
    );
    add(
      Math.abs(a.udio - b.udio),
      "Omjer se dobije **dijeljenjem**, a ne oduzimanjem udjela.",
    );
    add(
      b.udio - a.udio,
      "Omjer se dobije **dijeljenjem**, a ne oduzimanjem udjela.",
    );
    add(
      1 / a.n / (1 / b.n),
      "Udio nakon $n$ poluraspada je $(\\tfrac12)^n$, a ne $\\tfrac1n$. Izračunaj oba udjela pa ih podijeli.",
    );
  } else {
    vrijednost = u.n;
    tol = isNum(p.tolerancija) ? p.tolerancija : vrijednost * 0.01;
    add(1 / u.n, "Obrnuto: broj poluraspada je $n = t/T$.");
    add(
      2 ** u.n,
      "To je koliko je puta jezgara manje ($2^n$). Broj poluraspada je $n = t/T$.",
    );
    add(u.udio, "To je udio koji ostane. Broj poluraspada je $n = t/T$.");
  }
  return {
    vrijednost,
    tol,
    ...o,
    krivo: [...(p.krivo ?? []), ...sKrivima(bezTocnog(k, vrijednost, tol))],
  };
}

// ── scena „aktivnost“: fizika ───────────────────────────────────────────────────────────────────────
export const jedinicaTA = (s) => s.jedinica_T ?? "s";
export const jedinicaA = (s) => s.jedinica_A ?? "Bq";
export const jedinicaTt = (s) => s.jedinica_t ?? jedinicaTA(s);
const klizacTA = (s) => klizaciOd(s).find((k) => k.id === "T") ?? null;
export const TAktivnosti = (s, stanje = {}) => {
  const k = klizacTA(s);
  if (k && isNum(stanje.T)) return stanje.T;
  return s.T;
};
// t je u jedinici jedinica_t (zadano jedinica_T); T u jedinici jedinica_T
export function fizikaAktivnosti(s, t = 0, stanje = {}) {
  const T = TAktivnosti(s, stanje);
  const T_s = T * faktorVremena(jedinicaTA(s));
  const lam = lambda(T_s);
  // N₀ je zadan ili slijedi iz početne aktivnosti uz T iz speca (klizač T mijenja aktivnost, ne broj jezgara)
  const N0 = isNum(s.N0)
    ? s.N0
    : (s.A0 * faktorAktivnosti(jedinicaA(s))) /
      lambda(s.T * faktorVremena(jedinicaTA(s)));
  const A0_Bq = lam * N0;
  const t_s = t * faktorVremena(jedinicaTt(s));
  const ud = 2 ** (-t_s / T_s);
  return {
    T,
    T_s,
    lambda: lam,
    N0,
    A0_Bq,
    udio: ud,
    N: N0 * ud,
    A_Bq: A0_Bq * ud,
    n: t_s / T_s,
  };
}
export const tMaxAktivnosti = (s) =>
  isNum(s.t_max)
    ? s.t_max
    : isNum(s.t) && s.t > 0
      ? s.t
      : (4 *
          Math.max(s.T, klizacTA(s)?.max ?? 0) *
          faktorVremena(jedinicaTA(s))) /
        faktorVremena(jedinicaTt(s));
export const brzinaSataAktivnosti = (s) =>
  tMaxAktivnosti(s) / (s.nacin === "izracunaj" ? 4 : 12);

const zapisA = (A_Bq, j) => {
  const v = A_Bq / faktorAktivnosti(j);
  return `${formatSci(v)}\u00a0${j}`;
};
export const zapisIzotopa = (iz) => (iz ? `${gornji(iz.A)}${iz.simbol}` : "");

// geometrija scene aktivnosti
export function geometrijaAktivnosti() {
  const bocica = { x: 34, y: 54, w: 84, h: 104 };
  // 64 jezgre u bočici (8 × 8), rang iz sjemena kao kod kockica
  const jezgre = [];
  for (let k = 0; k < 64; k++) {
    const c = k % 8;
    const r = Math.floor(k / 8);
    jezgre.push({
      x: zaokr(bocica.x + 12 + c * 8.6 + (r % 2) * 3, 2),
      y: zaokr(bocica.y + 26 + r * 9.4, 2),
    });
  }
  return {
    W,
    H: 268,
    bocica,
    jezgre,
    brojac: { x: 214, y: 52, w: 132, h: 96 },
    sonda: { x1: 214, y1: 100, x2: 140, y2: 100 },
    ploca: { y: 186, h: 56 },
    sat: { cx: 30, cy: 22, r: 13, tekstX: 50, tekstY: 27 },
  };
}
export function jezgreBocice(s, udioOstalo) {
  const r = rangoviKockica(64, sjeme(s) + 31);
  const g = 64 * udioOstalo;
  return r.map((k) => k + 0.5 < g - 1e-9);
}

// što se vidi u aktivnosti: istrazi/prikaz sve, izracunaj tražene veličine tek nakon otkrivanja
export function prikazAktivnosti(s, t, otkriveno, stanje = {}) {
  const f = fizikaAktivnosti(s, t, stanje);
  const slobodno = s.nacin !== "izracunaj";
  const pitano = new Set((s.pitaj ?? []).map((p) => p.velicina));
  const vidi = (v) => slobodno || otkriveno || !pitano.has(v);
  const jA = jedinicaA(s);
  const A_zadan = !isNum(s.N0);
  // prije otkrivanja sat u izracunaj stoji na 0, pa je t > 0 samo kad je sve otkriveno
  const pocetak = t === 0;
  const A = pocetak
    ? A_zadan
      ? zapisA(f.A0_Bq, jA)
      : vidi("A")
        ? zapisA(f.A0_Bq, jA)
        : "?"
    : zapisA(f.A_Bq, jA);
  const kucice = {
    A,
    lambda: vidi("lambda") ? `${formatSci(f.lambda)}\u00a0s⁻¹` : "?",
    N: pocetak
      ? !A_zadan || vidi("N0")
        ? formatSci(f.N0)
        : "?"
      : formatSci(f.N),
  };
  const zaslon = A === "?" ? "· · ·" : A;
  const jT = jedinicaTA(s);
  const iz = s.izotop;
  const stopa = Math.max(0.15, Math.min(14, 5 * f.udio * (f.A0_Bq / refA(s))));
  const aria = [
    iz
      ? `Bočica s izotopom ${iz.ime ?? ""} ${iz.simbol}-${iz.A}.`
      : "Bočica s radioaktivnim uzorkom.",
    `Vrijeme poluraspada T = ${zapisVremena(f.T, jT)}.`,
    `Sat: t = ${zapisVremena(t, jedinicaTt(s))}.`,
    `Geigerov brojač: ${zaslon}.`,
    `A = λ·N: A = ${kucice.A}, λ = ${kucice.lambda}, N = ${kucice.N}.`,
  ].join(" ");
  return {
    izotop: zapisIzotopa(iz),
    ime: iz?.ime ?? "",
    T: `T = ${zapisVremena(f.T, jT)}`,
    sat: `t = ${zapisVremena(t, jedinicaTt(s))}`,
    zaslon,
    kucice,
    stopa,
    udio: f.udio,
    lanac: slobodno || otkriveno ? lanacAktivnosti(s, t, stanje) : null,
    aria,
  };
}
// referentna aktivnost (za brzinu klikanja): početna aktivnost uz T iz speca
const refA = (s) => fizikaAktivnosti(s, 0, {}).A0_Bq;

// postupak (vidi se nakon točnog odgovora ili u istraživanju)
export function lanacAktivnosti(s, t = 0, stanje = {}) {
  const f = fizikaAktivnosti(s, t, stanje);
  const jT = jedinicaTA(s);
  const fT = faktorVremena(jT);
  const out = [];
  if (fT !== 1)
    out.push(
      `T = ${zapisVremena(f.T, jT)} = ${formatNumber(zaokr(f.T, 4))} · ${razmak(fT)} s = ${razmak(zaokr(f.T_s, 3)) || formatNumber(f.T_s)} s`,
    );
  out.push(
    `λ = ln 2 / T = 0,693 / ${Number.isInteger(zaokr(f.T_s, 3)) ? razmak(zaokr(f.T_s, 3)) : formatSci(f.T_s)} s = ${formatSci(f.lambda)} s⁻¹`,
  );
  if (!isNum(s.N0)) {
    const jA = jedinicaA(s);
    if (faktorAktivnosti(jA) !== 1)
      out.push(
        `A₀ = ${formatNumber(s.A0)} ${jA} = ${formatNumber(s.A0)} · 10${gornji(Math.round(Math.log10(faktorAktivnosti(jA))))} Bq = ${formatSci(f.A0_Bq)} Bq`,
      );
    out.push(
      `N₀ = A₀ / λ = ${formatSci(f.A0_Bq)} / ${formatSci(f.lambda)} = ${formatSci(f.N0)}`,
    );
  } else
    out.push(
      `A₀ = λ · N₀ = ${formatSci(f.lambda)} · ${formatSci(f.N0)} = ${formatSci(f.A0_Bq)} Bq`,
    );
  if (t > 0)
    out.push(
      `nakon t = ${zapisVremena(t, jedinicaTt(s))}: N = N₀ · 2^(−t/T) = ${formatSci(f.N)}, A = λN = ${formatSci(f.A_Bq)} Bq`,
    );
  return out;
}

// ── scena „aktivnost“: izracunaj ────────────────────────────────────────────────────────────────────
export function oznakaPitanjaAktivnost(s, p) {
  const jA = p.jedinica ?? (isNum(s.N0) ? "Bq" : jedinicaA(s));
  return (
    {
      T_s: {
        oznaka: "T",
        opis: "vrijeme poluraspada u sekundama",
        jedinica: "s",
      },
      A0_Bq: {
        oznaka: "A_0",
        opis: "početna aktivnost u bekerelima",
        jedinica: "Bq",
      },
      lambda: { oznaka: "λ", opis: "konstanta raspada", jedinica: "s⁻¹" },
      N0: { oznaka: "N_0", opis: "početni broj jezgara", jedinica: "" },
      A: {
        oznaka: "A",
        opis: `aktivnost nakon ${zapisVremena(s.t ?? 0, jedinicaTt(s))}`,
        jedinica: jA,
      },
      N: {
        oznaka: "N",
        opis: `broj jezgara nakon ${zapisVremena(s.t ?? 0, jedinicaTt(s))}`,
        jedinica: "",
      },
    }[p.velicina] ?? { oznaka: "?", opis: "", jedinica: "" }
  );
}

export function izracunPitanjaAktivnost(s, p) {
  const f = fizikaAktivnosti(s, s.t ?? 0);
  const o = oznakaPitanjaAktivnost(s, p);
  const jT = jedinicaTA(s);
  const fT = faktorVremena(jT);
  const T = s.T;
  const T_s = f.T_s;
  const fA = isNum(s.N0) ? 1 : faktorAktivnosti(jedinicaA(s));
  const A0 = f.A0_Bq; // Bq
  const k = [];
  const add = (vrijednost, poruka) =>
    isNum(vrijednost) && k.push({ vrijednost, poruka });
  const pT = `Vrijeme poluraspada pretvori u **sekunde** (λ je u s⁻¹): ${zapisVremena(T, jT)} = ${formatNumber(T)} · ${razmak(fT)} s.`;
  const pA = `Aktivnost pretvori u bekerele: M (mega) znači $10^6$, pa je ${formatNumber(s.A0)} ${jedinicaA(s)} = ${formatNumber(s.A0)}·10${gornji(Math.round(Math.log10(fA)))} Bq.`;
  const pLog =
    "Upotrijebio si log (dekadski). U λ = ln 2 / T je **prirodni** logaritam: tipka ln, ln 2 ≈ 0,693.";
  const pLn = "Zaboravio si ln 2: konstanta raspada je λ = ln 2 / T, a ne 1/T.";
  let vrijednost;
  const kraj = (v, tolRel = 0.01, blizu = 0.05) => {
    const tol = isNum(p.tolerancija) ? p.tolerancija : Math.abs(v) * tolRel;
    const krivo = sKrivima(bezTocnog(k, v, tol));
    if (blizu)
      krivo.push({
        vrijednost: v,
        tolerancija: Math.abs(v) * blizu,
        poruka:
          "Blizu, ali prerano si zaokružio. Međurezultate uzmi s barem tri značajne znamenke (ln 2 = 0,693).",
      });
    return { vrijednost: v, tol, ...o, krivo: [...(p.krivo ?? []), ...krivo] };
  };
  if (p.velicina === "T_s") {
    vrijednost = T_s;
    add(
      T * 60,
      "Pomnožio si sa 60: tako se minute pretvaraju u sekunde. Sat ima 3600 s, a dan 86 400 s.",
    );
    add(T * 100, "Sat nema 100 s: 1 h = 60 min = 3600 s.");
    add(
      T / fT,
      "Pretvorba je u krivom smjeru: sekunda je manja jedinica, pa broj mora **narasti**.",
    );
    add(T * 3600, "1 h = 3600 s, ali dan ima 24 h: 1 dan = 86 400 s.");
    add(T * 24, "To su sati. Treba sekunde: 1 dan = 24 · 3600 s = 86 400 s.");
    return kraj(vrijednost, 0.005, 0);
  }
  if (p.velicina === "A0_Bq") {
    vrijednost = A0;
    add(s.A0, pA);
    add(s.A0 * 1e3, "Prefiks M (mega) znači milijun, $10^6$, a ne tisuću.");
    add(s.A0 * 1e9, "Prefiks M (mega) znači $10^6$; $10^9$ je G (giga).");
    add(
      s.A0 / fA,
      "Pretvorba je u krivom smjeru: Bq je manja jedinica, pa broj mora **narasti**.",
    );
    return kraj(vrijednost, 0.005, 0);
  }
  if (p.velicina === "lambda") {
    vrijednost = f.lambda;
    if (fT !== 1) add(LN2 / T, pT);
    if (fT > 60)
      add(
        LN2 / (T * 60),
        "Pretvorio si samo u minute. Konstanta raspada je u s⁻¹, pa T treba u **sekundama**.",
      );
    add(1 / T_s, pLn);
    add(Math.log10(2) / T_s, pLog);
    add(
      T_s / LN2,
      "Razlomak je obrnut: λ = ln 2 / T (vrijeme poluraspada je u nazivniku).",
    );
    add(LN2 * T_s, "Ne množi se: λ = ln 2 / T.");
    if (fT !== 1) add(T / LN2, "λ = ln 2 / T (ne obrnuto), a T u sekundama.");
    return kraj(vrijednost);
  }
  if (p.velicina === "N0") {
    vrijednost = f.N0;
    if (fT !== 1) add(A0 / (LN2 / T), pT);
    if (fA !== 1) add(s.A0 / f.lambda, pA);
    if (fT !== 1 && fA !== 1)
      add(
        s.A0 / (LN2 / T),
        "Pretvori obje veličine u osnovne jedinice: T u sekunde, aktivnost u Bq.",
      );
    add(
      A0 * f.lambda,
      "Iz A = λN izrazi N: podijeli s λ, N = A / λ (a ne A·λ).",
    );
    add(A0 / (Math.log10(2) / T_s), pLog);
    add(A0 * T_s, pLn);
    if (fT > 60)
      add(
        A0 / (LN2 / (T * 60)),
        "Pretvorio si samo u minute. T treba u **sekundama**.",
      );
    return kraj(vrijednost);
  }
  if (p.velicina === "A") {
    const jA = o.jedinica;
    const fj = faktorAktivnosti(jA);
    vrijednost = f.A_Bq / fj;
    const n = f.n;
    add(
      A0 / fj / n,
      "Podijelio si s brojem poluraspada. Svaki poluraspad prepolovi aktivnost: $A = A_0 \\cdot 2^{-t/T}$.",
    );
    add(
      (A0 * (1 - f.udio)) / fj,
      "To je koliko je aktivnost **pala**. Pitanje je kolika je **ostala**.",
    );
    add(
      (A0 * Math.max(0, 1 - n / 2)) / fj,
      "Aktivnost ne pada jednoliko: svakim poluraspadom prepolovi se ono što je ostalo.",
    );
    if (fj !== 1) add(f.A_Bq, `Rezultat je u bekerelima; traži se u ${jA}.`);
    if (fj === 1 && fA !== 1) add(f.A_Bq / fA, pA);
    return kraj(vrijednost, 0.01, 0.04);
  }
  // N nakon t
  vrijednost = f.N;
  add(
    f.N0 / f.n,
    "Podijelio si s brojem poluraspada. Ostane $N = N_0 \\cdot 2^{-t/T}$.",
  );
  add(
    f.N0 * (1 - f.udio),
    "To je broj jezgara koje su se **raspale**. Pitanje je koliko ih je **ostalo**.",
  );
  add(
    f.N0,
    "To je početni broj jezgara. Nakon vremena t ostane $N = N_0 \\cdot 2^{-t/T}$.",
  );
  return kraj(vrijednost, 0.01, 0.04);
}

// ── polja za unos (komponenta) ──────────────────────────────────────────────────────────────────────
export function poljaIzracunaj(s) {
  return (s.pitaj ?? []).map((p) => {
    const r =
      s.scena === "aktivnost"
        ? izracunPitanjaAktivnost(s, p)
        : izracunPitanjaUzorci(s, p);
    const v = r.vrijednost;
    return {
      oznaka: r.oznaka,
      opis: r.opis,
      jedinica: r.jedinica,
      razlomak: !!r.razlomak,
      znanstveni:
        !r.razlomak && v !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e6),
      primjer: r.razlomak ? "npr. 1/8 ili 1 : 8" : "",
    };
  });
}

function checkIzracunaj(s, odg) {
  const pitaj = s.pitaj ?? [];
  const vals = pitaj.map((_, i) =>
    Array.isArray(odg) ? String(odg[i] ?? "") : "",
  );
  const prazno = vals.findIndex((x) => !x.trim());
  if (prazno >= 0)
    return {
      tocno: false,
      poruka: pitaj.length > 1 ? "Upiši sve odgovore." : "Upiši odgovor.",
      prazno: true,
      polje: prazno,
    };
  for (let i = 0; i < pitaj.length; i++) {
    const p = pitaj[i];
    const akt = s.scena === "aktivnost";
    const r = akt ? izracunPitanjaAktivnost(s, p) : izracunPitanjaUzorci(s, p);
    let ch;
    if (r.razlomak || (!akt && p.velicina !== "N")) {
      const n = parseUdio(vals[i]);
      ch = provjeriBroj(n, r, savjetUzorci(s, p));
    } else
      ch = checkNumber({
        input: vals[i],
        answer: r.vrijednost,
        tol: r.tol,
        unit: r.jedinica,
        krivo: r.krivo,
        savjet: akt ? savjetAktivnost(p) : savjetUzorci(s, p),
      });
    if (!ch.tocno)
      return {
        ...ch,
        polje: i,
        poruka:
          pitaj.length > 1 ? `**$${r.oznaka}$**: ${ch.poruka}` : ch.poruka,
      };
  }
  return { tocno: true };
}
function provjeriBroj(n, r, savjet) {
  if (n == null)
    return {
      tocno: false,
      poruka: "Upiši broj ili razlomak (npr. 1/8, 1 : 8 ili 0,125).",
      prazno: true,
    };
  if (near(n, r.vrijednost, r.tol)) return { tocno: true };
  const hit = r.krivo.find((k) =>
    near(
      n,
      k.vrijednost,
      isNum(k.tolerancija)
        ? k.tolerancija
        : Math.max(1e-9, Math.abs(k.vrijednost) * 0.03),
    ),
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  return { tocno: false, poruka: savjet };
}
const savjetUzorci = (s, p) =>
  ({
    udio: "Nije točno. Izračunaj broj poluraspada $n = t/T$; svaki prepolovi ostatak, pa ostane $(\\tfrac12)^n$.",
    N: "Nije točno. Izračunaj broj poluraspada $n = t/T$, pa je $N = N_0 \\cdot 2^{-n}$.",
    n: "Nije točno. Broj poluraspada je $n = t/T$ (oba vremena u istoj jedinici).",
    omjer:
      "Nije točno. Izračunaj udio svakog uzorka, $(\\tfrac12)^{t/T}$, pa ih podijeli.",
  })[p.velicina];
const savjetAktivnost = (p) =>
  ({
    T_s: "Nije točno. 1 min = 60 s, 1 h = 3600 s, 1 dan = 86 400 s.",
    A0_Bq: "Nije točno. 1 kBq = 10³ Bq, 1 MBq = 10⁶ Bq, 1 GBq = 10⁹ Bq.",
    lambda: "Nije točno. λ = ln 2 / T, s T u sekundama.",
    N0: "Nije točno. N₀ = A₀ / λ: aktivnost u Bq, λ u s⁻¹.",
    A: "Nije točno. A = A₀ · 2^(−t/T).",
    N: "Nije točno. N = N₀ · 2^(−t/T).",
  })[p.velicina];

// ── postavi i zaustavi ──────────────────────────────────────────────────────────────────────────────
export function opisCilja(s) {
  const c = s.cilj ?? {};
  const uz = uzorciOd(s);
  if (c.omjer != null)
    return `omjer ${uz[0]?.oznaka} : ${uz[1]?.oznaka} = ${zapisOmjera(parseUdio(c.omjer))}`;
  const o = uz[Math.max(0, indeksUzorka(s, c.uzorak))]?.oznaka;
  return `od uzorka ${o} ostane ${zapisUdjela(parseUdio(c.udio))}`;
}
function checkVrijeme(s, t, tolUdio) {
  if (!isNum(t))
    return {
      tocno: false,
      poruka:
        s.nacin === "zaustavi" ? "Pokreni sat i zaustavi ga." : "Pomakni sat.",
      prazno: true,
    };
  const a = analizaCilja(s);
  if (!a) return { tocno: false, poruka: "Cilj nije ispravan." };
  if (Math.abs(t - a.t) <= tolUdio * a.Teff + 1e-9) return { tocno: true };
  const j = jedinicaT(s);
  const f = fizikaUzoraka(s, t);
  const uz = f.uzorci;
  if (a.vrsta === "omjer") {
    const r = f.omjer;
    return {
      tocno: false,
      poruka: `Na tvom satu (${zapisVremena(t, j)}) ostalo bi ${zapisUdjela(uz[0].udio)} jezgara ${uz[0].oznaka} i ${zapisUdjela(uz[1].udio)} jezgara ${uz[1].oznaka}, pa je omjer ${zapisOmjera(r)}. Traži se ${zapisOmjera(a.vrijednost)}.`,
    };
  }
  const u = uz[a.uzorak];
  const n = u.n;
  const cilj = zapisUdjela(a.vrijednost);
  // linearno: „svaki poluraspad odnese polovicu početnih“
  const nLin = 2 * (1 - a.vrijednost);
  if (Math.abs(n - nLin) <= 0.05 && Math.abs(nLin - a.t / a.Teff) > 0.1)
    return {
      tocno: false,
      poruka: `Tako bi bilo kad bi se svaki put raspala polovica **početnih** jezgara. Raspada se polovica **preostalih**: na tvom satu ostalo je ${zapisUdjela(u.udio)}, a treba ${cilj}.`,
    };
  // vrijeme poluraspada drugog uzorka
  if (uz.length === 2) {
    const d = uz[1 - a.uzorak];
    const nd = -Math.log2(a.vrijednost);
    if (Math.abs(t - nd * d.T) <= tolUdio * d.T)
      return {
        tocno: false,
        poruka: `Tako bi bilo za uzorak ${d.oznaka} (T = ${zapisVremena(d.T, j)}). Gledaj uzorak ${u.oznaka}: na tvom satu od njega ostane ${zapisUdjela(u.udio)}.`,
      };
  }
  if (1 / a.vrijednost >= 4 && Math.abs(n - 1 / a.vrijednost) <= 0.05)
    return {
      tocno: false,
      poruka: `Nakon ${formatNumber(zaokr(n, 2))} poluraspada ne bi ostalo gotovo ništa. Udio se svakim poluraspadom **prepolovi**: koliko puta treba prepoloviti 1 da dobiješ ${cilj}?`,
    };
  const nT = formatNumber(zaokr(n, 2));
  return {
    tocno: false,
    poruka:
      s.nacin === "zaustavi"
        ? `Zaustavio si na ${zapisVremena(t, j)}, to je ${nT} T: ostalo bi ${zapisUdjela(Number(u.udio.toPrecision(2)))} jezgara, a ne ${cilj}. Probaj opet.`
        : `Na tvom satu prošlo je $n = t/T = ${nT.replace(",", "{,}")}$ poluraspada, pa bi ostalo ${zapisUdjela(u.udio)} jezgara ${u.oznaka}. Traži se ${cilj}.`,
  };
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Zakon radioaktivnog raspada (fizika, matura): N = N₀·2^(−t/T), A = λN, λ = ln 2 / T. tekst, scena, nacin.
Scene:
- "uzorci": uzorci: [{oznaka, T}] (1–2 izotopa, npr. X i Y; T u jedinici jedinica_t), jedinica_t ("s" | "min" | "h" | "dan" …), N0_prikaz? (64 | 256 | 1024 kockica, zadano 1024: nakon 10 poluraspada ostane točno jedna), sjeme? (cijeli broj: redoslijed raspada kockica), N0? (stvarni broj jezgara, za pitanje N), t_max? (kraj sata i grafa). Kockice se raspadaju nasumičnim redom, a broj preostalih je uvijek točno round(N₀·2^(−t/T)); graf N/N₀ (t) s točkama na T, 2T, 3T i razinama ½, ¼, ⅛. Najviše 12 poluraspada najkraćeg T na satu.
- "aktivnost": izotop? {simbol, A, ime?} (npr. {simbol: "Y", A: 90, ime: "itrij"}), T i jedinica_T, A0 i jedinica_A ("GBq" | "MBq" | "kBq" | "Bq") ili N0 (broj jezgara), t? i jedinica_t? (zadano jedinica_T). Bočica s jezgrama, Geigerov brojač koji klikće to rjeđe što je jezgara manje, ploča A = λ·N i (nakon odgovora) postupak T → s, λ = ln 2 / T, N₀ = A₀/λ.
Načini:
- "istrazi" (Istraži): sat ▶/⏸/↺ i vučenje kursora po grafu; klizaci?: [{id: "T_X" (T uzorka X) | "T" (aktivnost), oznaka, min, max, korak, pocetak?}] (najviše 2).
- "prikaz" (Pogledaj): sat se sam zavrti od 0 do t (ili t_max), može se ponoviti.
- "izracunaj" (Tvoj red): pitaj: 1–3 × {velicina, uzorak?, jedinica?, tolerancija?, krivo?}. Uzorci (treba t): "udio" (N/N₀, upisuje se 1/64, 1 : 64, 2^-6 ili 0,0156), "omjer" (N prvog : N drugog uzorka), "n" (broj poluraspada), "N" (treba N0). Aktivnost: "T_s" (T u s), "A0_Bq", "lambda" (s⁻¹), "N0", "A" (aktivnost nakon t, jedinica? zadano jedinica_A), "N" (jezgre nakon t). Prije točnog odgovora sat stoji na 0, a tražene veličine su „?“; nakon točnog odgovora sat se zavrti do t i pokaže se postupak. Automatske krive vrijednosti: 1/n i 1/(2n) umjesto (1/2)ⁿ, raspadnuti dio 1 − 2⁻ⁿ, 2ⁿ, „linearno“ (ostane 0), t i T zamijenjeni, udio drugog uzorka, obrnut omjer, omjer T-ova, razlika udjela; T nepretvoren u sekunde (h, dan, samo u minute), MBq kao Bq, N = A·λ, λ = T/ln 2, zaboravljen ln 2, log umjesto ln, prerano zaokruženo.
- "postavi" (Tvoj red, uzorci): klizaci: [{id: "t", oznaka?, min, max, korak, pocetak?}] (sat); cilj: {uzorak?, udio: "1/64"} ili {omjer: "1/16"}. Uzorci su u „olovnoj kutiji“ i graf je prazan dok učenik ne provjeri (na osi su samo oznake T, 2T… uzorka iz cilja); nakon provjere kutija se otvori na njegovu t. Točno uz |t − t_cilj| ≤ 2 % T. Poruke: ostatak na učenikovu satu, „linearno“, T drugog uzorka, n = 1/udio.
- "zaustavi" (Tvoj red, uzorci): isti cilj, ali sat teče sam (jedan T ≈ 2,5 s) i učenik pritisne Stop; točno uz ±8 % T. Bez klizača.`;

const PRIMJER = {
  tip: TIP,
  scena: "uzorci",
  nacin: "izracunaj",
  uzorci: [
    { oznaka: "X", T: 15 },
    { oznaka: "Y", T: 45 },
  ],
  jedinica_t: "min",
  t: 90,
  pitaj: [
    { velicina: "udio", uzorak: "X" },
    { velicina: "udio", uzorak: "Y" },
    { velicina: "omjer" },
  ],
  tekst:
    "Dva uzorka imaju jednako jezgara: izotop X ima vrijeme poluraspada 15 min, a izotop Y 45 min. Koliki dio jezgara svakog uzorka ostane nakon **90 min** i koliki je tada omjer $N_X : N_Y$?",
};

const PRIMJERI = [
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "postavi",
    uzorci: [{ oznaka: "X", T: 15 }],
    jedinica_t: "min",
    klizaci: [
      { id: "t", oznaka: "vrijeme", min: 0, max: 180, korak: 5, pocetak: 0 },
    ],
    cilj: { uzorak: "X", udio: "1/64" },
    tekst:
      "Izotop X ima vrijeme poluraspada 15 min. Namjesti sat na trenutak kad od uzorka ostane **1/64** jezgara.",
  },
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "zaustavi",
    uzorci: [{ oznaka: "X", T: 15 }],
    jedinica_t: "min",
    cilj: { uzorak: "X", udio: "1/4" },
    N0_prikaz: 256,
    tekst:
      "Pokreni sat i pritisni **Stop** u trenutku kad od uzorka X (T = 15 min) ostane **četvrtina** jezgara.",
  },
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "istrazi",
    uzorci: [
      { oznaka: "X", T: 6 },
      { oznaka: "Y", T: 30 },
    ],
    jedinica_t: "s",
    t_max: 60,
    tekst:
      "Izotop X (T = 6 s) i izotop Y (T = 30 s). Pokreni sat ili povuci kursor po grafu i gledaj koliko jezgara ostaje. Koliko kockica X ostane nakon 60 s?",
  },
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "istrazi",
    uzorci: [{ oznaka: "X", T: 20 }],
    jedinica_t: "min",
    N0_prikaz: 256,
    t_max: 120,
    klizaci: [
      {
        id: "T_X",
        oznaka: "vrijeme poluraspada",
        min: 10,
        max: 40,
        korak: 5,
        pocetak: 20,
      },
    ],
    tekst:
      "Mijenjaj vrijeme poluraspada i pusti sat: kraće T znači brži raspad, ali svaki put nakon T ostane polovica.",
  },
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "prikaz",
    uzorci: [
      { oznaka: "X", T: 5 },
      { oznaka: "Y", T: 20 },
    ],
    jedinica_t: "min",
    t: 40,
    tekst:
      "Gledaj dva uzorka 40 minuta: X (T = 5 min) i Y (T = 20 min). Svaki poluraspad prepolovi ono što je ostalo.",
  },
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "izracunaj",
    uzorci: [
      { oznaka: "X", T: 12 },
      { oznaka: "Y", T: 24 },
    ],
    jedinica_t: "h",
    t: 72,
    pitaj: [
      { velicina: "udio", uzorak: "X" },
      { velicina: "udio", uzorak: "Y" },
      { velicina: "omjer" },
    ],
    tekst:
      "Izotop X ima vrijeme poluraspada 12 h, a izotop Y 24 h; na početku imaju jednako jezgara. Koliki dio svakog ostane nakon **72 h** i koliki je omjer $N_X : N_Y$?",
  },
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "izracunaj",
    uzorci: [{ oznaka: "X", T: 6 }],
    jedinica_t: "s",
    t: 60,
    N0: 10240,
    pitaj: [{ velicina: "n" }, { velicina: "N" }],
    tekst:
      "Uzorak ima 10 240 jezgara izotopa s vremenom poluraspada 6 s. Koliko poluraspada prođe za 60 s i koliko jezgara tada ostane?",
  },
  {
    tip: TIP,
    scena: "uzorci",
    nacin: "postavi",
    uzorci: [
      { oznaka: "X", T: 4 },
      { oznaka: "Y", T: 8 },
    ],
    jedinica_t: "dan",
    klizaci: [
      { id: "t", oznaka: "vrijeme", min: 0, max: 48, korak: 2, pocetak: 0 },
    ],
    cilj: { omjer: "1/16" },
    tekst:
      "X ima vrijeme poluraspada 4 dana, a Y 8 dana. Namjesti sat na trenutak kad je omjer $N_X : N_Y = 1 : 16$.",
  },
  {
    tip: TIP,
    scena: "aktivnost",
    nacin: "izracunaj",
    izotop: { simbol: "Y", A: 90, ime: "itrij" },
    T: 64,
    jedinica_T: "h",
    A0: 200,
    jedinica_A: "MBq",
    pitaj: [{ velicina: "lambda" }, { velicina: "N0" }],
    tekst:
      "Pacijentu se ubrizga itrij-90 s vremenom poluraspada 64 h i početnom aktivnošću 200 MBq. Kolika je konstanta raspada i koliko je jezgara ubrizgano?",
  },
  {
    tip: TIP,
    scena: "aktivnost",
    nacin: "izracunaj",
    izotop: { simbol: "I", A: 131, ime: "jod" },
    T: 8,
    jedinica_T: "dan",
    A0: 3700,
    jedinica_A: "MBq",
    pitaj: [{ velicina: "T_s" }, { velicina: "lambda" }, { velicina: "N0" }],
    tekst:
      "Za liječenje štitnjače ubrizga se jod-131 (T = 8 dana) aktivnosti 3700 MBq. Izrazi T u sekundama, izračunaj konstantu raspada i broj ubrizganih jezgara.",
  },
  {
    tip: TIP,
    scena: "aktivnost",
    nacin: "istrazi",
    izotop: { simbol: "Ga", A: 68, ime: "galij" },
    T: 68,
    jedinica_T: "min",
    A0: 150,
    jedinica_A: "MBq",
    t_max: 240,
    klizaci: [
      {
        id: "T",
        oznaka: "vrijeme poluraspada",
        min: 20,
        max: 140,
        korak: 4,
        pocetak: 68,
      },
    ],
    tekst:
      "Galij-68 (T = 68 min, 150 MBq). Pusti sat i slušaj brojač; zatim mijenjaj vrijeme poluraspada: uz isti broj jezgara kraće T daje veću aktivnost.",
  },
  {
    tip: TIP,
    scena: "aktivnost",
    nacin: "prikaz",
    izotop: { simbol: "Tl", A: 201, ime: "talij" },
    T: 73,
    jedinica_T: "h",
    A0: 80,
    jedinica_A: "MBq",
    t: 219,
    tekst:
      "Talij-201 (T = 73 h) početne aktivnosti 80 MBq. Gledaj kako nakon svakih 73 h aktivnost i broj jezgara padnu na pola.",
  },
];

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
const POLJA = {
  zajednicka: [
    "tip",
    "scena",
    "nacin",
    "tekst",
    "sjeme",
    "t_max",
    "klizaci",
    "pitaj",
    "cilj",
    "krivo",
  ],
  uzorci: ["uzorci", "jedinica_t", "N0_prikaz", "N0", "t"],
  aktivnost: [
    "izotop",
    "T",
    "jedinica_T",
    "A0",
    "jedinica_A",
    "N0",
    "t",
    "jedinica_t",
  ],
};

function validatePoluraspad(s) {
  const { list, need } = problems();
  if (
    !need(
      SCENE.includes(s.scena),
      `poluraspad.scena mora biti: ${SCENE.join(" ili ")}`,
    )
  )
    return list;
  const nacini = NACINI[s.scena];
  if (
    !need(
      nacini.includes(s.nacin),
      `poluraspad.nacin u sceni ${s.scena} mora biti jedan od: ${nacini.join(", ")}`,
    )
  )
    return list;
  need(isText(s.tekst), "poluraspad treba „tekst“");
  const dopustena = [...POLJA.zajednicka, ...POLJA[s.scena]];
  for (const f of Object.keys(s))
    need(
      dopustena.includes(f),
      `polje „${f}“ ne postoji u sceni ${s.scena} (polja: ${dopustena.join(", ")})`,
    );
  if (s.sjeme != null)
    need(
      Number.isInteger(s.sjeme) && s.sjeme >= 0,
      "sjeme mora biti cijeli broj ≥ 0",
    );
  if (s.t_max != null)
    need(isNum(s.t_max) && s.t_max > 0, "t_max mora biti broj > 0");
  if (list.length) return list;
  if (s.scena === "uzorci") validateUzorci(s, need, list);
  else validateAktivnost(s, need, list);
  return list;
}

function validateKlizace(s, need, dopusteni, najvise) {
  if (s.klizaci == null) return;
  if (
    !need(
      Array.isArray(s.klizaci) &&
        s.klizaci.length >= 1 &&
        s.klizaci.length <= najvise,
      `klizaci mora biti popis od 1 do ${najvise}`,
    )
  )
    return;
  const ids = new Set();
  s.klizaci.forEach((k, i) => {
    const at = `klizaci[${i}]`;
    need(
      dopusteni.includes(k?.id),
      `${at}.id mora biti jedan od: ${dopusteni.join(", ")}`,
    );
    need(!ids.has(k?.id), `${at}.id se ponavlja`);
    ids.add(k?.id);
    if (k?.oznaka != null)
      need(isText(k.oznaka), `${at}.oznaka mora biti tekst`);
    if (
      !need(
        isNum(k?.min) && isNum(k?.max) && k.min >= 0 && k.max > k.min,
        `${at}: min ≥ 0 i max > min`,
      )
    )
      return;
    if (
      !need(
        isNum(k.korak) && k.korak > 0 && k.korak <= k.max - k.min,
        `${at}.korak mora biti > 0 i ne veći od raspona`,
      )
    )
      return;
    need((k.max - k.min) / k.korak <= 2000, `${at}: najviše 2000 koraka`);
    const naMrezi = (v) =>
      Math.abs((v - k.min) / k.korak - Math.round((v - k.min) / k.korak)) <
      1e-6;
    need(naMrezi(k.max), `${at}.max mora biti na mreži min + n·korak`);
    if (k.pocetak != null)
      need(
        isNum(k.pocetak) &&
          k.pocetak >= k.min &&
          k.pocetak <= k.max &&
          naMrezi(k.pocetak),
        `${at}.pocetak mora biti na mreži klizača između min i max`,
      );
    if (k.id?.startsWith("T") && isNum(k.min))
      need(k.min > 0, `${at}: vrijeme poluraspada mora biti > 0`);
  });
}

function validateUzorci(s, need, list) {
  const uz = s.uzorci;
  if (
    !need(
      Array.isArray(uz) && uz.length >= 1 && uz.length <= 2,
      "uzorci mora biti popis od 1 do 2 izotopa {oznaka, T}",
    )
  )
    return;
  uz.forEach((u, i) => {
    const at = `uzorci[${i}]`;
    need(
      isText(u?.oznaka) && u.oznaka.length <= 6,
      `${at}.oznaka mora biti kratak tekst (npr. „X“)`,
    );
    for (const f of Object.keys(u ?? {}))
      need(
        ["oznaka", "T"].includes(f),
        `${at}: polje „${f}“ ne postoji (samo oznaka, T)`,
      );
    const kl = (Array.isArray(s.klizaci) ? s.klizaci : []).some(
      (k) => k?.id === `T_${u?.oznaka}`,
    );
    need(
      (isNum(u?.T) && u.T > 0 && u.T <= 1e9) || (kl && u?.T == null),
      `${at}.T mora biti broj > 0 (vrijeme poluraspada u ${jedinicaT(s)})`,
    );
  });
  if (uz.length === 2)
    need(
      uz[0]?.oznaka !== uz[1]?.oznaka,
      "uzorci moraju imati različite oznake",
    );
  need(
    jediniceVremena().includes(s.jedinica_t),
    `jedinica_t mora biti jedna od: ${jediniceVremena().join(", ")}`,
  );
  if (s.N0_prikaz != null)
    need(
      N0_PRIKAZ.includes(s.N0_prikaz),
      `N0_prikaz mora biti ${N0_PRIKAZ.join(", ")}`,
    );
  if (s.N0 != null)
    need(isNum(s.N0) && s.N0 >= 1, "N0 mora biti broj jezgara ≥ 1");
  const istrazi = s.nacin === "istrazi";
  const postavi = s.nacin === "postavi";
  validateKlizace(
    s,
    need,
    istrazi ? uz.map((u) => `T_${u?.oznaka}`) : postavi ? ["t"] : [],
    istrazi ? 2 : 1,
  );
  if (!istrazi && !postavi)
    need(s.klizaci == null, `način ${s.nacin} nema klizače`);
  if (postavi)
    need(
      Array.isArray(s.klizaci) &&
        s.klizaci.length === 1 &&
        s.klizaci[0]?.id === "t",
      'postavi treba točno jedan klizač {id: "t", min, max, korak}',
    );
  if (s.nacin === "izracunaj")
    need(isNum(s.t) && s.t > 0, "izracunaj treba t (proteklo vrijeme, > 0)");
  else if (s.t != null)
    need(
      s.nacin === "prikaz" && isNum(s.t) && s.t > 0,
      "t je samo za izracunaj i prikaz (za ostale načine kraj sata je t_max)",
    );
  if (
    uz.some(
      (u) =>
        !isNum(TUzorka(s, uz.indexOf(u))) || TUzorka(s, uz.indexOf(u)) <= 0,
    )
  )
    return;
  // najviše 12 poluraspada najkraćeg T (inače rešetka ostane prazna)
  const kl = (Array.isArray(s.klizaci) ? s.klizaci : []).filter((k) =>
    k?.id?.startsWith("T_"),
  );
  const tMinT = Math.min(
    ...uz.map((_, i) => TUzorka(s, i)),
    ...kl.map((k) => k.min),
  );
  const tm = tMaxUzoraka(s);
  need(
    tm / tMinT <= 12 + 1e-9,
    `na satu je ${formatNumber(zaokr(tm / tMinT, 2))} poluraspada najkraćeg T; najviše 12 (smanji t ili t_max)`,
  );
  if (s.nacin === "izracunaj") {
    noCilj(s, need);
    if (
      !need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "izracunaj treba pitaj: 1–3 stavke {velicina, uzorak?}",
      )
    )
      return;
    s.pitaj.forEach((p, i) => {
      const at = `pitaj[${i}]`;
      if (
        !need(
          VELICINE_UZORCI.includes(p?.velicina),
          `${at}.velicina mora biti jedna od: ${VELICINE_UZORCI.join(", ")}`,
        )
      )
        return;
      for (const f of Object.keys(p))
        need(
          ["velicina", "uzorak", "tolerancija", "krivo"].includes(f),
          `${at}: polje „${f}“ ne postoji`,
        );
      if (p.velicina === "omjer") {
        need(uz.length === 2, `${at}: omjer treba dva uzorka`);
        need(
          p.uzorak == null,
          `${at}: omjer nema uzorak (uvijek prvi : drugi)`,
        );
      } else if (uz.length === 2)
        need(
          uz.some((u) => u.oznaka === p.uzorak),
          `${at}.uzorak mora biti oznaka jednog od uzoraka (${uz.map((u) => u.oznaka).join(", ")})`,
        );
      else if (p.uzorak != null)
        need(
          p.uzorak === uz[0].oznaka,
          `${at}.uzorak mora biti „${uz[0].oznaka}“`,
        );
      if (p.velicina === "N")
        need(
          isNum(s.N0),
          `${at}: za N treba N0 (stvarni broj jezgara na početku)`,
        );
      if (p.tolerancija != null)
        need(
          isNum(p.tolerancija) && p.tolerancija > 0,
          `${at}.tolerancija mora biti broj > 0`,
        );
    });
    const kljucevi = s.pitaj.map((p) => `${p?.velicina}:${p?.uzorak ?? ""}`);
    need(
      new Set(kljucevi).size === kljucevi.length,
      "pitaj: ista veličina se ponavlja",
    );
    if (list.length) return;
    s.pitaj.forEach((p, i) => {
      if (!VELICINE_UZORCI.includes(p?.velicina)) return;
      const r = izracunPitanjaUzorci(s, p);
      validateKrivo(p.krivo, r.vrijednost, r.tol, need, `pitaj[${i}].krivo`);
    });
    return;
  }
  if (postavi || s.nacin === "zaustavi") {
    need(s.pitaj == null, `${s.nacin} nema pitaj (cilj je u „cilj“)`);
    need(s.krivo == null || postavi, "zaustavi nema krivo");
    const c = s.cilj;
    if (
      !need(
        c && typeof c === "object",
        `${s.nacin} treba cilj: {uzorak?, udio: "1/4"} ili {omjer: "1/16"}`,
      )
    )
      return;
    for (const f of Object.keys(c))
      need(
        ["uzorak", "udio", "omjer"].includes(f),
        `cilj: polje „${f}“ ne postoji (uzorak, udio ili omjer)`,
      );
    if (c.omjer != null) {
      need(
        c.udio == null && c.uzorak == null,
        "cilj ima ili udio (uz uzorak) ili omjer, ne oboje",
      );
      need(uz.length === 2, "cilj omjer treba dva uzorka");
      need(
        uz.length === 2 && uz[0].T !== uz[1].T,
        "za omjer uzorci moraju imati različita T",
      );
    } else {
      const u = parseUdio(c.udio);
      need(
        isNum(u) && u > 0 && u < 1,
        'cilj.udio mora biti razlomak između 0 i 1, npr. "1/8"',
      );
      if (uz.length === 2)
        need(
          uz.some((x) => x.oznaka === c.uzorak),
          "cilj.uzorak mora biti oznaka jednog od uzoraka",
        );
      else if (c.uzorak != null)
        need(
          c.uzorak === uz[0].oznaka,
          `cilj.uzorak mora biti „${uz[0].oznaka}“`,
        );
    }
    const a = analizaCilja(s);
    if (
      !need(
        a && a.t > 0,
        "cilj nije ostvariv: vrijeme cilja mora biti > 0 (kod omjera pazi koji uzorak brže nestaje)",
      )
    )
      return;
    if (postavi) {
      const k = s.klizaci?.[0];
      if (!k || !isNum(k.korak)) return;
      const tol = TOL_POSTAVI * a.Teff;
      need(
        a.t <= k.max + tol && a.t >= k.min - tol,
        `cilj (t = ${formatNumber(zaokr(a.t, 3))}) mora biti unutar klizača ${formatNumber(k.min)}–${formatNumber(k.max)}`,
      );
      need(
        Math.abs(zaokruziT(s, a.t) - a.t) <= tol + 1e-9,
        `cilj t = ${formatNumber(zaokr(a.t, 3))} ne može se namjestiti klizačem s korakom ${formatNumber(k.korak)} (tolerancija ±2 % T); promijeni korak`,
      );
      need(
        Math.abs(pocetakT(s) - a.t) > tol,
        "početni položaj sata već ispunjava cilj",
      );
      if (s.krivo != null) {
        validateKrivo(s.krivo, null, 0, need);
        if (Array.isArray(s.krivo))
          s.krivo.forEach(
            (x, i) =>
              isNum(x?.vrijednost) &&
              need(
                Math.abs(x.vrijednost - a.t) > tol,
                `krivo[${i}].vrijednost ostvaruje cilj, a to je točan odgovor`,
              ),
          );
      }
    } else {
      need(
        tMaxUzoraka(s) >= a.t + a.Teff * 0.5,
        "t_max mora biti barem pola T iza cilja (da se može zakasniti)",
      );
    }
    return;
  }
  // istrazi, prikaz
  noAnswerFields(s, need);
  need(s.pitaj == null, `${s.nacin} nema pitaj`);
}
const noCilj = (s, need) => need(s.cilj == null, `${s.nacin} nema cilj`);

function validateAktivnost(s, need, list) {
  need(
    jediniceVremena().includes(s.jedinica_T),
    `jedinica_T mora biti jedna od: ${jediniceVremena().join(", ")}`,
  );
  if (s.jedinica_t != null)
    need(
      jediniceVremena().includes(s.jedinica_t),
      `jedinica_t mora biti jedna od: ${jediniceVremena().join(", ")}`,
    );
  need(
    isNum(s.T) && s.T > 0 && s.T <= 1e12,
    "T mora biti vrijeme poluraspada > 0",
  );
  need(
    (s.A0 != null) !== (s.N0 != null),
    "aktivnost treba točno jedno od: A0 (početna aktivnost, uz jedinica_A) ili N0 (broj jezgara)",
  );
  if (s.A0 != null) {
    need(isNum(s.A0) && s.A0 > 0, "A0 mora biti broj > 0");
    need(
      jediniceAktivnosti().includes(s.jedinica_A),
      `jedinica_A mora biti jedna od: ${jediniceAktivnosti().join(", ")}`,
    );
  } else {
    need(isNum(s.N0) && s.N0 >= 1, "N0 mora biti broj jezgara ≥ 1");
    need(
      s.jedinica_A == null || jediniceAktivnosti().includes(s.jedinica_A),
      `jedinica_A mora biti jedna od: ${jediniceAktivnosti().join(", ")}`,
    );
  }
  if (s.izotop != null) {
    const iz = s.izotop;
    need(
      iz && /^[A-Z][a-z]?$/.test(iz.simbol ?? ""),
      "izotop.simbol mora biti kemijski simbol (npr. „Y“, „Tl“)",
    );
    need(
      Number.isInteger(iz?.A) && iz.A >= 1 && iz.A <= 300,
      "izotop.A mora biti maseni broj 1–300",
    );
    if (iz?.ime != null) need(isText(iz.ime), "izotop.ime mora biti tekst");
    for (const f of Object.keys(iz ?? {}))
      need(
        ["simbol", "A", "ime"].includes(f),
        `izotop: polje „${f}“ ne postoji`,
      );
  }
  if (s.t != null) need(isNum(s.t) && s.t >= 0, "t mora biti broj ≥ 0");
  validateKlizace(s, need, s.nacin === "istrazi" ? ["T"] : [], 1);
  if (s.nacin !== "istrazi")
    need(s.klizaci == null, `način ${s.nacin} nema klizače`);
  if (!isNum(s.T) || s.T <= 0 || !jediniceVremena().includes(s.jedinica_T))
    return;
  const tm = tMaxAktivnosti(s);
  const Tt = (s.T * faktorVremena(s.jedinica_T)) / faktorVremena(jedinicaTt(s));
  const Tmin_ = Math.min(
    Tt,
    ((s.klizaci?.[0]?.min ?? s.T) * faktorVremena(s.jedinica_T)) /
      faktorVremena(jedinicaTt(s)),
  );
  need(
    tm / Tmin_ <= 12 + 1e-9,
    "na satu je više od 12 poluraspada; smanji t ili t_max",
  );
  if (s.nacin === "izracunaj") {
    noCilj(s, need);
    if (
      !need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "izracunaj treba pitaj: 1–3 stavke {velicina}",
      )
    )
      return;
    s.pitaj.forEach((p, i) => {
      const at = `pitaj[${i}]`;
      if (
        !need(
          VELICINE_AKTIVNOST.includes(p?.velicina),
          `${at}.velicina mora biti jedna od: ${VELICINE_AKTIVNOST.join(", ")}`,
        )
      )
        return;
      for (const f of Object.keys(p))
        need(
          ["velicina", "jedinica", "tolerancija", "krivo"].includes(f),
          `${at}: polje „${f}“ ne postoji`,
        );
      if (["A0_Bq", "N0"].includes(p.velicina))
        need(
          s.A0 != null,
          `${at}: ${p.velicina} traži zadanu aktivnost A0 (N0 je inače zadan)`,
        );
      if (["A", "N"].includes(p.velicina))
        need(isNum(s.t) && s.t > 0, `${at}: ${p.velicina} treba t > 0`);
      if (p.jedinica != null)
        need(
          p.velicina === "A" && jediniceAktivnosti().includes(p.jedinica),
          `${at}.jedinica je samo za A (${jediniceAktivnosti().join(", ")})`,
        );
      if (p.tolerancija != null)
        need(
          isNum(p.tolerancija) && p.tolerancija > 0,
          `${at}.tolerancija mora biti broj > 0`,
        );
    });
    const v = s.pitaj.map((p) => p?.velicina);
    need(new Set(v).size === v.length, "pitaj: ista veličina se ponavlja");
    if (v.includes("T_s"))
      need(
        faktorVremena(s.jedinica_T) !== 1,
        "T_s nema smisla kad je T već u sekundama",
      );
    if (v.includes("A0_Bq"))
      need(
        faktorAktivnosti(s.jedinica_A) !== 1,
        "A0_Bq nema smisla kad je A0 već u Bq",
      );
    if (list.length) return;
    s.pitaj.forEach((p, i) => {
      if (!VELICINE_AKTIVNOST.includes(p?.velicina)) return;
      const r = izracunPitanjaAktivnost(s, p);
      validateKrivo(p.krivo, r.vrijednost, r.tol, need, `pitaj[${i}].krivo`);
    });
    return;
  }
  noAnswerFields(s, need);
  need(s.pitaj == null, `${s.nacin} nema pitaj`);
}

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
const POGLED = ["istrazi", "prikaz"];
export const poluraspad = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (POGLED.includes(s.nacin) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate: validatePoluraspad,
  // odgovor: izracunaj → [tekst po pitanju]; postavi i zaustavi → t (broj, u jedinica_t)
  check(s, odgovor) {
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    if (s.nacin === "postavi") return checkVrijeme(s, odgovor, TOL_POSTAVI);
    if (s.nacin === "zaustavi") return checkVrijeme(s, odgovor, TOL_ZAUSTAVI);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "izracunaj") {
      if (s.scena === "aktivnost")
        return s.pitaj
          .map((p) => {
            const r = izracunPitanjaAktivnost(s, p);
            return `${r.oznaka.replace("_0", "₀")} = ${formatSci(r.vrijednost)}${r.jedinica ? `\u00a0${r.jedinica}` : ""}`;
          })
          .join("; ");
      return s.pitaj
        .map((p) => {
          const r = izracunPitanjaUzorci(s, p);
          if (p.velicina === "omjer")
            return `N(${uzorciOd(s)[0].oznaka}) : N(${uzorciOd(s)[1].oznaka}) = ${zapisOmjera(r.vrijednost)}`;
          if (p.velicina === "udio")
            return `${uzorciOd(s).length > 1 ? `${p.uzorak}: ` : ""}ostane ${zapisUdjela(r.vrijednost)}`;
          if (p.velicina === "n")
            return `n = ${formatNumber(zaokr(r.vrijednost, 3))} poluraspada`;
          return `N = ${formatSci(r.vrijednost)}`;
        })
        .join("; ");
    }
    if (s.nacin === "postavi" || s.nacin === "zaustavi") {
      const a = analizaCilja(s);
      return a ? `t = ${zapisVremena(a.t, jedinicaT(s))}` : "";
    }
    return "";
  },
  // blizanac s istim odgovorom učenik bi samo prepisao
  kljucOdgovora(s) {
    try {
      if (s.nacin === "izracunaj")
        return JSON.stringify(
          s.pitaj.map((p) =>
            Number(
              (s.scena === "aktivnost"
                ? izracunPitanjaAktivnost(s, p)
                : izracunPitanjaUzorci(s, p)
              ).vrijednost.toPrecision(3),
            ),
          ),
        );
      if (s.nacin === "postavi" || s.nacin === "zaustavi")
        return JSON.stringify(Number(analizaCilja(s).t.toPrecision(3)));
    } catch {
      return null;
    }
    return null;
  },
};
