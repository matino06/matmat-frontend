// val_uze: val na užetu u tri scene. „putujuci“: kuglice užeta titraju samo gore-dolje, a val putuje udesno (uz
// prijelaz na drugo uže); „puls“: jedan brijeg ili dolina odbija se na učvršćenom ili slobodnom kraju; „stojni“: nit
// učvršćena na oba kraja koju vibrator pobuđuje frekvencijom f, pa na harmonicima nastaje stojni val s n trbuha.
// Sva fizika, geometrija užeta (položaji kuglica u metrima), ravnalo, čvorovi i trbusi, očitanja i ono što je u
// kojem načinu skriveno su čiste funkcije (spec, stanje) → JSON; ValUze.svelte samo crta i prosljeđuje unos (isti
// kod kasnije koristi i iOS).
import { isNum, near, parseNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
  KRIVO_OPIS,
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
  iznosJed,
  formatNumber,
  withUnit,
  KLIZACI_OPIS,
} from "./_sile.js";

const TIP = "val_uze";
export const SCENE = ["putujuci", "puls", "stojni"];
export const NACINI = {
  putujuci: ["istrazi", "zaustavi", "oznaci", "postavi", "izracunaj"],
  puls: ["istrazi", "zaustavi", "predvidi", "izracunaj"],
  stojni: ["istrazi", "oznaci", "postavi", "izracunaj"],
};
export const KRAJEVI = ["ucvrscen", "slobodan", "bez_odbijanja"];
export const OBLICI = ["brijeg", "dolina"];
export const POCECI = ["brijeg", "dolina", "ravnoteza"];
const UVJETI = {
  putujuci: ["ravnoteza", "brijeg", "dolina"],
  puls: ["kraj", "povratak"],
};
export const PRIKAZI = ["ravnalo", "y-t", "lambda", "tragovi", "cvorovi"];
// prigušenje stojnog vala: val na putu duž niti oslabi za e^(−β); daje konačnu amplitudu u rezonanciji i vidljivo
// „drhtanje“ između harmonika (relativna amplituda ≈ sh β ≈ 0,05)
const BETA = 0.05;
const R_KRAJA = { ucvrscen: -1, slobodan: 1, bez_odbijanja: 0 };
// faza istaknute kuglice u t = 0 (y = A sin ψ): brijeg, dolina, ravnoteža (giba se prema gore)
const FAZA_POCETKA = {
  brijeg: Math.PI / 2,
  dolina: -Math.PI / 2,
  ravnoteza: 0,
};

// ── lijepi brojevi ──────────────────────────────────────────────────────────────────────────────────
const LIJEPI = [1, 2, 2.5, 5];
export function lijepoDolje(x) {
  if (!(x > 0)) return 0;
  const e = Math.floor(Math.log10(x));
  for (let i = LIJEPI.length - 1; i >= 0; i--) {
    const c = LIJEPI[i] * 10 ** e;
    if (c <= x * (1 + 1e-9)) return Number(c.toPrecision(6));
  }
  return Number((10 ** e).toPrecision(6));
}
export function lijepoGore(x) {
  if (!(x > 0)) return 1;
  const e = Math.floor(Math.log10(x));
  for (const m of [...LIJEPI, 10]) {
    const c = m * 10 ** e;
    if (c >= x * (1 - 1e-9)) return Number(c.toPrecision(6));
  }
  return Number((10 ** (e + 1)).toPrecision(6));
}
const decimala = (korak) => {
  const t = String(korak);
  return t.includes(".") ? t.split(".")[1].length : 0;
};

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
export const istaknute = (s) => (Array.isArray(s.istaknute) ? s.istaknute : []);

// Sve veličine scene u SI za vrijednosti klizača p.
export function parametri(s, p = pocetneVrijednosti(s)) {
  const L = iznos(s, s.L, p);
  const P = { scena: s.scena, L };
  if (s.napetost != null) {
    P.F = iznos(s, s.napetost, p);
    P.mi = iznos(s, s.mi, p);
    P.v = Math.sqrt(P.F / P.mi);
  } else P.v = iznos(s, s.v, p);
  if (s.scena === "putujuci") {
    P.f = s.f != null ? iznos(s, s.f, p) : 1 / iznos(s, s.T, p);
    P.T = 1 / P.f;
    P.omega = 2 * Math.PI * P.f;
    P.A = iznos(s, s.A, p);
    P.lambda = P.v / P.f;
    if (s.drugo_uze) {
      P.od = iznos(s, s.drugo_uze.od, p);
      P.v2 = iznos(s, s.drugo_uze.v, p);
      P.lambda2 = P.v2 / P.f;
    }
    // ustaljeno: val već ispunjava cijelo uže; inače kreće iz izvora u t = 0 (vidi se kako tek stiže)
    P.ustaljeno = s.ustaljeno ?? s.nacin !== "istrazi";
    const xi = istaknute(s)[0];
    P.faza0 =
      P.ustaljeno && xi != null
        ? FAZA_POCETKA[s.istaknuta_pocetak ?? "brijeg"] +
          P.omega * kasnjenje(P, xi)
        : 0;
  } else if (s.scena === "puls") {
    P.A = iznos(s, s.A, p);
    P.oblik = s.oblik ?? "brijeg";
    P.kraj = s.kraj ?? "ucvrscen";
    P.sigma = L / 22;
    P.t_kraj = L / P.v;
    P.t_povratak = (2 * L) / P.v;
  } else if (s.scena === "stojni") {
    P.f = iznos(s, s.f, p);
    P.T = 1 / P.f;
    P.lambda = P.v / P.f;
    P.f1 = P.v / (2 * L);
    // broj polovina valne duljine na niti; cijeli broj = harmonik (toliko trbuha)
    P.nTocno = P.f / P.f1;
    const n = Math.round(P.nTocno);
    P.n = n >= 1 && Math.abs(P.nTocno - n) <= 0.015 * n + 1e-9 ? n : null;
  }
  return P;
}

// vrijeme za koje val od izvora (x = 0) stigne do x
export function kasnjenje(P, x) {
  if (P.od == null || x <= P.od) return x / P.v;
  return P.od / P.v + (x - P.od) / P.v2;
}

export function pomakPutujuci(P, x, t) {
  const tau = kasnjenje(P, x);
  if (!P.ustaljeno && t < tau) return 0;
  return P.A * Math.sin(P.omega * (t - tau) + P.faza0);
}

// Puls: upadni g(x − vt) i odbijeni na kraju L (predznak r_L: −1 učvršćen, +1 slobodan, 0 nema). Središte pulsa je
// u t = 0 kod ruke, na kraju u ℓ/v, natrag kod ruke u 2ℓ/v; ruka vraćeni puls „primi“ (ne odbija ga opet).
export function pomakPuls(P, x, t, kraj = P.kraj) {
  const s2 = 2 * P.sigma * P.sigma;
  const g = (u) => (Math.abs(u) > 5 * P.sigma ? 0 : Math.exp(-(u * u) / s2));
  const u = P.v * t;
  const y = g(x - u) + R_KRAJA[kraj] * g(2 * P.L - x - u);
  return (P.oblik === "dolina" ? -1 : 1) * P.A * y;
}

// Stojni val: y = Re[a · sin(k̃(L − x)) / sin(k̃L) · e^{iφ}], k̃ = k − iβ/L, ruka (vibrator) u x = 0, kraj u L
// učvršćen. Iznos je relativan: u rezonanciji je najveći otklon ≈ 1, a između harmonika ≈ sh β (nit samo drhti).
function csin(a, c) {
  return [Math.sin(a) * Math.cosh(c), -Math.cos(a) * Math.sinh(c)];
}
export function amplitudaStojnog(P, x) {
  const k = (2 * Math.PI) / P.lambda;
  const [nr, ni] = csin(k * (P.L - x), (BETA * (P.L - x)) / P.L);
  const [dr, di] = csin(k * P.L, BETA);
  const d2 = dr * dr + di * di;
  const sh = Math.sinh(BETA);
  const re = ((nr * dr + ni * di) / d2) * sh;
  const im = ((ni * dr - nr * di) / d2) * sh;
  return { re, im, amp: Math.hypot(re, im) };
}
export function pomakStojni(P, x, faza) {
  const a = amplitudaStojnog(P, x);
  return Math.max(
    -1.1,
    Math.min(1.1, a.re * Math.cos(faza) - a.im * Math.sin(faza)),
  );
}

export const cvorovi = (P, n) =>
  Array.from({ length: n + 1 }, (_, j) => (j * P.L) / n);
export const trbusi = (P, n) =>
  Array.from({ length: n }, (_, j) => ((j + 0.5) * P.L) / n);

// ── geometrija užeta ────────────────────────────────────────────────────────────────────────────────
// Broj kuglica: barem šest po najkraćoj valnoj duljini u cijelom rasponu klizača (inače bi se val „preskakao“).
export function brojKuglica(s) {
  const kraj = krajnjeKombinacije(s).map((q) => parametri(s, q));
  if (s.scena === "puls") return 49;
  let omjer = 1;
  for (const P of kraj) {
    if (s.scena === "stojni") omjer = Math.max(omjer, P.L / P.lambda);
    else {
      const l1 = P.od != null ? P.od : P.L;
      omjer = Math.max(omjer, l1 / P.lambda);
      if (P.od != null) omjer = Math.max(omjer, (P.L - P.od) / P.lambda2);
    }
  }
  const n = Math.ceil(omjer * 6) + 1;
  return Math.max(41, Math.min(61, n));
}

// Najveći otklon u cijelom rasponu klizača (m): mjerilo visine crteža, da veća amplituda izgleda veća.
export function mjeriloVisine(s) {
  if (s.scena === "stojni") return 1;
  const A = krajnjeKombinacije(s).map((q) => parametri(s, q).A);
  return Math.max(...A.filter(isNum), 1e-9);
}

// Stanje užeta u trenutku t (za stojni val: faza φ prikaza): točke za glatko uže, kuglice, istaknute kuglice,
// otklon izvora i kraja. x u metrima, y u metrima (stojni: relativno, najviše ≈ 1).
// mirno: izvor ne radi (u „postavi“ prije provjere), uže je ravno.
export function uze(s, P, t, nKuglica = 41, { mirno = false, kraj } = {}) {
  const y = (x) =>
    mirno
      ? 0
      : s.scena === "puls"
        ? pomakPuls(P, x, t, kraj ?? P.kraj)
        : s.scena === "stojni"
          ? pomakStojni(P, x, t)
          : pomakPutujuci(P, x, t);
  const ns = 240;
  const tocke = Array.from({ length: ns + 1 }, (_, i) => {
    const x = (i / ns) * P.L;
    return [x, y(x)];
  });
  const kuglice = Array.from({ length: nKuglica }, (_, i) => {
    const x = (i / (nKuglica - 1)) * P.L;
    return [x, y(x)];
  });
  return {
    tocke,
    kuglice,
    istaknute: istaknute(s).map((x) => [x, y(x)]),
    izvor: y(0),
    kraj: y(P.L),
  };
}

// Gdje je puls (središte) i kamo ide: prvi put prema kraju, pa natrag prema ruci (odbijen), pa opet od ruke.
export function polozajPulsa(P, t) {
  const u = P.v * t;
  if (u <= P.L) return { x: u, smjer: 1, odbijen: false };
  if (u <= 2 * P.L) return { x: 2 * P.L - u, smjer: -1, odbijen: true };
  return { x: u - 2 * P.L, smjer: 1, odbijen: true };
}

// Faza prikaza stojnog vala u kojoj je nit najviše otklonjena (slika bez animacije, prefers-reduced-motion).
export function fazaNajvecegOtklona(P) {
  const n = Math.max(1, P.n ?? Math.round(P.nTocno) ?? 1);
  const a = amplitudaStojnog(P, P.L / (2 * n));
  return -Math.atan2(a.im, a.re);
}

export function ovojnicaStojnog(P, ns = 160) {
  return Array.from({ length: ns + 1 }, (_, i) => {
    const x = (i / ns) * P.L;
    return [x, Math.min(1.1, amplitudaStojnog(P, x).amp)];
  });
}

// Ravnalo ispod užeta: 4–8 brojeva, sitne crtice između.
export function ravnalo(L) {
  const korak = lijepoGore(L / 7);
  const sitno = korak / 5;
  const oznake = [];
  const n = Math.round(L / sitno);
  for (let i = 0; i <= n + 1e-9; i++) {
    const x = Number((i * sitno).toPrecision(9));
    if (x > L + 1e-9) break;
    const velika = Math.abs(x / korak - Math.round(x / korak)) < 1e-6;
    oznake.push({ x, velika, tekst: velika ? formatNumber(x) : "" });
  }
  return { korak, oznake };
}

// Zagrada „λ“ između dva susjedna brijega (putujući val, istraživanje): pomiče se s valom.
export function zagradeLambda(s, P, t) {
  const out = [];
  const segmenti = [
    {
      uze: 1,
      od: 0,
      do: P.od ?? P.L,
      c: P.v,
      t0: 0,
      lambda: P.lambda,
    },
  ];
  if (P.od != null)
    segmenti.push({
      uze: 2,
      od: P.od,
      do: P.L,
      c: P.v2,
      t0: P.od / P.v,
      lambda: P.lambda2,
    });
  for (const g of segmenti) {
    const fronta = P.ustaljeno ? Infinity : g.od + g.c * (t - g.t0);
    const kraj = Math.min(g.do, fronta);
    // brjegovi: ω(t − t0 − (x − od)/c) + φ0 = π/2 + 2πm
    const baza = g.od + g.c * (t - g.t0 + (P.faza0 - Math.PI / 2) / P.omega);
    const sredina = (g.od + kraj - g.lambda) / 2;
    const m = Math.round((baza - sredina) / g.lambda);
    let xa = baza - m * g.lambda;
    if (xa < g.od) xa += g.lambda;
    if (xa + g.lambda > kraj) xa -= g.lambda;
    if (xa >= g.od - 1e-9 && xa + g.lambda <= kraj + 1e-9)
      out.push({
        uze: g.uze,
        od: xa,
        do: xa + g.lambda,
        tekst: `${g.uze === 2 ? "λ₂" : "λ"} = ${iznosJed(g.lambda, "m")}`,
      });
  }
  return out;
}

// ── vrijeme ─────────────────────────────────────────────────────────────────────────────────────────
// Usporenje animacije: period (ili cijeli put pulsa) traje nekoliko sekundi stvarnog vremena.
export function ubrzanje(s) {
  if (isNum(s.ubrzanje)) return s.ubrzanje;
  const P = parametri(s);
  if (s.scena === "puls") return lijepoDolje(Math.min(1, P.t_povratak / 5));
  if (s.scena === "putujuci") return lijepoDolje(Math.min(1, P.T / 1.6));
  return 1;
}
// Stojni val: prikaz uvijek titra ~0,8 puta u sekundi (zvučne frekvencije se ne bi vidjele).
export const FREKVENCIJA_PRIKAZA_STOJNOG = 0.8;

// Trajanje trake vremena (s): ne smije odati traženi trenutak, pa je „lijep“ broj zaokružen naviše.
export function trajanje(s) {
  if (s.scena === "puls") return lijepoGore(2.3 * parametri(s).t_kraj * 1);
  if (s.scena !== "putujuci") return 0;
  if (s.nacin === "istrazi") {
    const kraj = krajnjeKombinacije(s).map((q) => parametri(s, q));
    const najdulje = Math.max(...kraj.map((P) => kasnjenje(P, P.L) + 4 * P.T));
    return lijepoGore(najdulje);
  }
  return lijepoGore(2.6 * parametri(s).T);
}
export function korakVremena(s) {
  const P = parametri(s);
  if (s.scena === "puls") return lijepoDolje(P.t_povratak / 100);
  const T = Math.min(...krajnjeKombinacije(s).map((q) => parametri(s, q).T));
  return lijepoDolje(T / 40);
}
export const decimaleVremena = (s) => decimala(korakVremena(s));

// Graf y(t) prve istaknute kuglice od 0 do t (cijela traka vremena je os t).
export function grafYT(s, P, t, tMax) {
  const xi = istaknute(s)[0];
  if (xi == null) return { tocke: [], tMax };
  const n = 240;
  const kraj = Math.min(t, tMax);
  const tocke = [];
  for (let i = 0; i <= n; i++) {
    const tt = (i / n) * tMax;
    if (tt > kraj + 1e-12) break;
    tocke.push([tt, pomakPutujuci(P, xi, tt)]);
  }
  tocke.push([kraj, pomakPutujuci(P, xi, kraj)]);
  const korak = lijepoGore(tMax / 5);
  const oznake = [];
  for (let x = 0; x <= tMax + 1e-9; x += korak)
    oznake.push({
      t: Number(x.toPrecision(9)),
      tekst: formatNumber(Number(x.toPrecision(9))),
    });
  return { tocke, tMax, oznake };
}

// ── stanje istaknute kuglice (poruke i aria) ────────────────────────────────────────────────────────
const normRad = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
export function fazaIstaknute(s, P, t) {
  return normRad(FAZA_POCETKA[s.istaknuta_pocetak ?? "brijeg"] + P.omega * t);
}
export function opisKuglice(s, P, t) {
  const psi = fazaIstaknute(s, P, t);
  const y = Math.sin(psi);
  const gore = Math.cos(psi) > 0;
  const blizu = (a) => Math.min(normRad(psi - a), normRad(a - psi)) < 0.12;
  if (blizu(Math.PI / 2)) return "na vrhu brijega";
  if (blizu((3 * Math.PI) / 2)) return "na dnu doline";
  if (blizu(0) || blizu(Math.PI))
    return `u ravnotežnom položaju, giba se prema ${gore ? "gore" : "dolje"}`;
  return `${y > 0 ? "iznad" : "ispod"} ravnotežnog položaja, giba se prema ${gore ? "gore" : "dolje"}`;
}

// Trenuci u kojima istaknuta kuglica ispuni uvjet (od početka, do t_do).
const KUT_UVJETA = {
  brijeg: [Math.PI / 2],
  dolina: [(3 * Math.PI) / 2],
  ravnoteza: [0, Math.PI],
};
export function trenuciUvjeta(s, P, uvjet, tDo) {
  const psi0 = FAZA_POCETKA[s.istaknuta_pocetak ?? "brijeg"];
  const out = [];
  for (const a of KUT_UVJETA[uvjet]) {
    let t0 = normRad(a - psi0) / P.omega;
    if (t0 < 1e-9 * P.T) t0 += P.T;
    for (let t = t0; t <= tDo + 1e-9; t += P.T) out.push(t);
  }
  return out.sort((a, b) => a - b);
}

// ── veličine i očitanja ─────────────────────────────────────────────────────────────────────────────
export const META = {
  f: { naziv: "frekvencija izvora", oznaka: "f", jedinica: "Hz" },
  T: { naziv: "period", oznaka: "T", jedinica: "s" },
  A: { naziv: "amplituda", oznaka: "A", jedinica: "m" },
  v: { naziv: "brzina vala", oznaka: "v", jedinica: "m/s" },
  lambda: { naziv: "valna duljina", oznaka: "λ", jedinica: "m" },
  v2: { naziv: "brzina na drugom užetu", oznaka: "v_2", jedinica: "m/s" },
  lambda2: {
    naziv: "valna duljina na drugom užetu",
    oznaka: "λ_2",
    jedinica: "m",
  },
  F: { naziv: "napetost užeta", oznaka: "F", jedinica: "N" },
  L: { naziv: "duljina užeta", oznaka: "ℓ", jedinica: "m" },
  n: { naziv: "broj trbuha (harmonik)", oznaka: "n", jedinica: "" },
  f1: { naziv: "osnovna frekvencija", oznaka: "f_1", jedinica: "Hz" },
};
export function kljuceviScene(s) {
  const k = ["L", "v"];
  if (s.napetost != null) k.push("F");
  if (s.scena === "putujuci") {
    k.push("f", "T", "A", "lambda");
    if (s.drugo_uze) k.push("v2", "lambda2");
  }
  if (s.scena === "puls") k.push("A");
  if (s.scena === "stojni") k.push("f", "T", "lambda", "n", "f1");
  return k;
}
export function vrijednosti(s, P) {
  const out = {};
  for (const k of kljuceviScene(s))
    out[k] = k === "n" ? (P.n ?? P.nTocno) : P[k];
  return out;
}

const ZADANI_BROJACI = {
  putujuci: ["f", "lambda", "v"],
  puls: ["v"],
  stojni: ["f", "n", "lambda"],
};
// Očitanja koja smiju biti vidljiva u načinu rada (sve ostalo bi odalo traženi odgovor).
export function dopustenaOcitanja(s) {
  const sve = kljuceviScene(s);
  if (s.nacin === "istrazi") return sve;
  if (s.nacin === "zaustavi")
    return sve.filter((k) => ["A", "lambda", "L", "lambda2"].includes(k));
  if (s.nacin === "oznaci")
    return s.scena === "stojni"
      ? sve.filter((k) => ["f", "v", "L", "F"].includes(k))
      : sve.filter((k) => ["A", "L"].includes(k));
  if (s.nacin === "postavi") {
    // samo veličine koje ne ovise o klizaču (klizač je ono što učenik postavlja)
    const k = klizaciOd(s)[0];
    if (!k) return [];
    const p0 = pocetneVrijednosti(s);
    const a = vrijednosti(s, parametri(s, { ...p0, [k.id]: k.min }));
    const b = vrijednosti(s, parametri(s, { ...p0, [k.id]: k.max }));
    return sve.filter(
      (q) =>
        isNum(a[q]) &&
        Math.abs(a[q] - b[q]) <= 1e-9 * Math.max(1, Math.abs(a[q])) &&
        !["n", "f1"].includes(q),
    );
  }
  return [];
}
export function brojaci(s) {
  if (Array.isArray(s.brojaci)) return s.brojaci;
  if (s.nacin !== "istrazi") return [];
  const z = [...ZADANI_BROJACI[s.scena]];
  if (s.scena === "putujuci" && s.drugo_uze) z.push("lambda2", "v2");
  if (s.scena === "stojni" && s.napetost != null) z.push("v");
  return z;
}

// Očitanja za prikaz: [{kljuc, oznaka, tekst, naziv}].
export function ocitanja(s, P) {
  const vr = vrijednosti(s, P);
  return brojaci(s).map((k) => {
    const m = META[k];
    let tekst = iznosJed(vr[k], m.jedinica);
    if (k === "n") tekst = P.n != null ? `${P.n} (${P.n}. harmonik)` : "—";
    if (k === "T" && vr.T < 0.1) tekst = iznosJed(vr.T * 1000, "ms");
    const naziv =
      k === "f" && s.scena === "stojni" ? "frekvencija vibratora" : m.naziv;
    return { kljuc: k, oznaka: m.oznaka, naziv, tekst };
  });
}

export function prikazi(s) {
  if (Array.isArray(s.prikazi)) return s.prikazi;
  if (s.scena === "putujuci") {
    if (s.nacin === "istrazi")
      return istaknute(s).length
        ? ["ravnalo", "lambda", "y-t"]
        : ["ravnalo", "lambda"];
    if (s.nacin === "zaustavi") return ["ravnalo", "y-t"];
    if (s.nacin === "izracunaj") return [];
    return ["ravnalo"];
  }
  if (s.scena === "puls") return ["ravnalo"];
  if (s.nacin === "istrazi") return ["ravnalo", "tragovi", "cvorovi"];
  if (s.nacin === "izracunaj") return ["tragovi"];
  return ["ravnalo", "tragovi"];
}

// Opis scene za čitač zaslona (bez traženog odgovora).
export function opisScene(s, P) {
  if (s.scena === "putujuci")
    return `Vodoravno uže od ${iznosJed(P.L, "m")} s kuglicama. Izvor lijevo trese uže gore-dolje, a val putuje udesno${P.od != null ? `; na ${iznosJed(P.od, "m")} uže se nastavlja drugim užetom` : ""}. Svaka kuglica titra samo okomito.`;
  if (s.scena === "puls")
    return `Uže od ${iznosJed(P.L, "m")}. Ruka lijevo napravi jedan ${P.oblik === "dolina" ? "puls dolinu" : "puls brijeg"} koji putuje udesno prema ${{ ucvrscen: "učvršćenom kraju (zidu)", slobodan: "slobodnom kraju (prsten na šipki)", bez_odbijanja: "kraju bez odbijanja" }[P.kraj]}.`;
  return `Nit od ${iznosJed(P.L, "m")} učvršćena na oba kraja; vibrator lijevo${s.nacin === "izracunaj" ? "" : ` titra frekvencijom ${iznosJed(P.f, "Hz")}`}.`;
}

// U „izracunaj“ broja trbuha ili čvorova slika titranja bila bi odgovor: vibrator miruje dok učenik ne odgovori.
export const skrivenaSlika = (s) =>
  s.scena === "stojni" &&
  s.nacin === "izracunaj" &&
  (s.pitaj ?? []).some((q) => ["n_trbuha", "n_cvorova"].includes(q?.velicina));

// Početni položaji oznaka u „oznaci λ“: nikad ne smiju već biti točan odgovor.
export function pocetneOznake(s) {
  const P = parametri(s);
  const [a, b] = segmentUzeta(s, P);
  const l = s.uze === 2 ? P.lambda2 : P.lambda;
  let x1 = a + 0.12 * (b - a);
  let x2 = a + 0.42 * (b - a);
  for (const m of [1, 2, 3])
    if (Math.abs(x2 - x1 - m * l) < 0.15 * l) x2 += 0.3 * l;
  return [x1, Math.min(b, x2)].map(
    (x) => Math.round(x / korakOznake(s)) * korakOznake(s),
  );
}
export const korakOznake = (s) => lijepoDolje(parametri(s).L / 200);
function segmentUzeta(s, P) {
  if (P.od == null) return [0, P.L];
  return s.uze === 2 ? [P.od, P.L] : [0, P.od];
}

// ── provjere ────────────────────────────────────────────────────────────────────────────────────────
const tolZaustavi = (s, P) =>
  isNum(s.cilj?.tolerancija)
    ? s.cilj.tolerancija
    : s.scena === "puls"
      ? 0.02 * P.t_povratak
      : Math.max(0.01, 0.02 * P.T);

export function tocniTrenuci(s) {
  const P = parametri(s);
  if (s.scena === "puls")
    return [s.cilj.uvjet === "kraj" ? P.t_kraj : P.t_povratak];
  const svi = trenuciUvjeta(s, P, s.cilj.uvjet, trajanje(s));
  return s.cilj.prvi === false ? svi : svi.slice(0, 1);
}

const OPIS_UVJETA = {
  ravnoteza: "u ravnotežnom položaju",
  brijeg: "na vrhu brijega",
  dolina: "na dnu doline",
};
function checkZaustavi(s, odgovor) {
  const t = isNum(odgovor) ? odgovor : parseNumber(odgovor);
  if (!isNum(t) || t <= 0)
    return {
      tocno: false,
      poruka: "Pokreni val (▶) pa ga zaustavi u pravom trenutku.",
      prazno: true,
    };
  const P = parametri(s);
  const tol = tolZaustavi(s, P);
  const tocni = tocniTrenuci(s);
  if (tocni.some((x) => near(t, x, tol))) return { tocno: true };
  const hit = (s.krivo ?? []).find((k) =>
    near(t, k.vrijednost, isNum(k.tolerancija) ? k.tolerancija : tol),
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const tt = formatNumber(Number(t.toFixed(decimaleVremena(s) + 1)));
  if (s.scena === "puls") {
    const kraj = P.t_kraj;
    const pov = P.t_povratak;
    if (s.cilj.uvjet === "povratak") {
      if (near(t, kraj, tol))
        return {
          tocno: false,
          poruka:
            "U tom trenutku puls je tek stigao do kraja užeta (prešao je samo ℓ). Pričekaj da se vrati do ruke.",
        };
      if (t < kraj)
        return {
          tocno: false,
          poruka: `U t = ${tt} s puls još putuje prema kraju užeta.`,
        };
      if (t < pov)
        return {
          tocno: false,
          poruka: `U t = ${tt} s puls se vraća, ali još nije stigao do ruke.`,
        };
      return {
        tocno: false,
        poruka: `U t = ${tt} s puls se već vratio i odbio od ruke. Vrati vrijeme unatrag.`,
      };
    }
    if (near(t, pov, tol))
      return {
        tocno: false,
        poruka:
          "To je trenutak povratka do ruke (put 2ℓ). Traži se trenutak kad puls stigne do kraja užeta.",
      };
    return {
      tocno: false,
      poruka:
        t < kraj
          ? `U t = ${tt} s puls još nije stigao do kraja užeta.`
          : `U t = ${tt} s puls se već odbio od kraja i vraća se. Vrati vrijeme unatrag.`,
    };
  }
  const uvjet = s.cilj.uvjet;
  const trazi = `Traži se trenutak kad je kuglica ${OPIS_UVJETA[uvjet]}${s.cilj.prvi === false ? "" : " **prvi put**"}.`;
  const tMax = trajanje(s) + P.T;
  for (const u of ["ravnoteza", "brijeg", "dolina"]) {
    const kada = trenuciUvjeta(s, P, u, tMax);
    const i = kada.findIndex((x) => near(t, x, tol));
    if (i < 0) continue;
    if (u === uvjet)
      return {
        tocno: false,
        poruka: `Kuglica je doista ${OPIS_UVJETA[u]}, ali ne prvi put: prije toga je već jednom bila ondje. Vrati vrijeme unatrag.`,
      };
    const odBrijega = (s.istaknuta_pocetak ?? "brijeg") === "brijeg";
    let zasto = "";
    if (odBrijega && u === "dolina" && i === 0)
      zasto =
        ": od brijega do doline prođe **pola perioda**, a ravnotežni položaj je na pola tog puta";
    if (odBrijega && u === "brijeg" && i === 0)
      zasto = ": prošao je **cijeli period**, kuglica je opet gdje je krenula";
    return {
      tocno: false,
      poruka: `U t = ${tt} s kuglica je ${OPIS_UVJETA[u]}${zasto}. ${trazi}`,
    };
  }
  return {
    tocno: false,
    poruka: `U t = ${tt} s kuglica je ${opisKuglice(s, P, t)}. ${trazi}`,
  };
}

function checkOznaciLambda(s, odgovor) {
  if (!Array.isArray(odgovor) || odgovor.length !== 2 || !odgovor.every(isNum))
    return {
      tocno: false,
      poruka: "Postavi obje oznake na uže.",
      prazno: true,
    };
  const P = parametri(s);
  const [a, b] = segmentUzeta(s, P);
  const l = s.uze === 2 ? P.lambda2 : P.lambda;
  const d = Math.abs(odgovor[1] - odgovor[0]);
  if (P.od != null && !odgovor.every((x) => x >= a - 1e-9 && x <= b + 1e-9)) {
    const druga = s.uze === 2 ? P.lambda : P.lambda2;
    if (Math.abs(d - druga) <= 0.04 * druga)
      return {
        tocno: false,
        poruka: `To je valna duljina na ${s.uze === 2 ? "prvom" : "drugom"} užetu. Traži se na ${s.uze === 2 ? "drugom (desno od spoja)" : "prvom (lijevo od spoja)"}.`,
      };
    return {
      tocno: false,
      poruka: `Obje oznake stavi na ${s.uze === 2 ? "drugo uže (desno od spoja)" : "prvo uže (lijevo od spoja)"}.`,
    };
  }
  if (Math.abs(d - l) <= 0.04 * l) return { tocno: true };
  const dx = `Δx = ${iznosJed(d, "m")}`;
  if (d < 0.02 * l)
    return { tocno: false, poruka: "Oznake su na istom mjestu. Razmakni ih." };
  if (Math.abs(d - l / 2) <= 0.06 * l)
    return {
      tocno: false,
      poruka: `${dx} je **pola valne duljine** (od brijega do doline). Valna duljina je razmak dvaju susjednih brjegova.`,
    };
  for (const m of [2, 3, 4])
    if (Math.abs(d - m * l) <= 0.04 * m * l)
      return {
        tocno: false,
        poruka: `Između oznaka stanu ${m} vala. Valna duljina je razmak **susjednih** brjegova.`,
      };
  return {
    tocno: false,
    poruka: `${dx}. Valna duljina je razmak dvaju susjednih brjegova (ili dviju susjednih dolina): stavi oznake na takve dvije točke.`,
  };
}

const rijecCvor = (k) =>
  k % 10 === 1 && k % 100 !== 11
    ? "čvor"
    : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100)
      ? "čvora"
      : "čvorova";
const rijecTrbuh = (k) =>
  k % 10 === 1 && k % 100 !== 11
    ? "trbuh"
    : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100)
      ? "trbuha"
      : "trbuha";

function checkOznaciStojni(s, odgovor) {
  if (!Array.isArray(odgovor) || !odgovor.length || !odgovor.every(isNum))
    return {
      tocno: false,
      poruka: `Dodirni nit na ${s.trazi === "cvorovi" ? "čvorovima" : "trbusima"}.`,
      prazno: true,
    };
  const P = parametri(s);
  const n = P.n;
  const ciljevi = s.trazi === "cvorovi" ? cvorovi(P, n) : trbusi(P, n);
  const drugi = s.trazi === "cvorovi" ? trbusi(P, n) : cvorovi(P, n);
  const tol = P.L / (4 * n);
  const x = [...odgovor].sort((a, b) => a - b);
  const pogodeni = new Set();
  for (const xi of x) {
    const j = ciljevi.findIndex(
      (c, i) => !pogodeni.has(i) && Math.abs(c - xi) <= tol,
    );
    if (j >= 0) {
      pogodeni.add(j);
      continue;
    }
    const isti = ciljevi.findIndex((c) => Math.abs(c - xi) <= tol);
    const mj = iznosJed(xi, "m");
    if (isti >= 0)
      return {
        tocno: false,
        poruka: `Dvije oznake su na istom ${s.trazi === "cvorovi" ? "čvoru" : "trbuhu"}. Dodirni jednu da je makneš.`,
      };
    if (drugi.some((c) => Math.abs(c - xi) <= tol))
      return {
        tocno: false,
        poruka:
          s.trazi === "cvorovi"
            ? `Na x = ${mj} nit najjače titra: to je **trbuh**, a ne čvor. Čvor je mjesto koje miruje.`
            : `Na x = ${mj} nit miruje: to je **čvor**, a ne trbuh. Trbuh je mjesto koje najjače titra.`,
      };
    return {
      tocno: false,
      poruka:
        s.trazi === "cvorovi"
          ? `Na x = ${mj} nit titra, pa to nije čvor. Čvor je mjesto koje stalno miruje.`
          : `Na x = ${mj} nit ne titra najjače. Trbuh je sredina petlje.`,
    };
  }
  if (pogodeni.size === ciljevi.length) return { tocno: true };
  const fale = ciljevi.length - pogodeni.size;
  if (s.trazi === "cvorovi" && (!pogodeni.has(0) || !pogodeni.has(n)))
    return {
      tocno: false,
      poruka:
        "Učvršćen kraj je uvijek čvor: on se ne može micati. Označi i oba kraja niti.",
    };
  return {
    tocno: false,
    poruka: `Nedostaje još ${fale} ${s.trazi === "cvorovi" ? rijecCvor(fale) : rijecTrbuh(fale)}.`,
  };
}

export const odbijeniOblik = (oblik, kraj) =>
  kraj === "bez_odbijanja"
    ? "nista"
    : kraj === "ucvrscen"
      ? oblik === "brijeg"
        ? "dolina"
        : "brijeg"
      : oblik;
export const IZBORI_PREDVIDI = {
  brijeg: "brijeg (neokrenut)",
  dolina: "dolina (okrenut)",
  nista: "ne vrati se",
};
export function izboriPredvidi(s) {
  const z = ["brijeg", "dolina"];
  if ((s.pitanja ?? []).some((q) => q.kraj === "bez_odbijanja"))
    z.push("nista");
  return z;
}
const IME_KRAJA = {
  ucvrscen: "učvršćen kraj",
  slobodan: "slobodan kraj",
  bez_odbijanja: "kraj bez odbijanja",
};
function checkPredvidi(s, odgovor) {
  const pit = s.pitanja;
  const o = Array.isArray(odgovor) ? odgovor : [];
  if (pit.some((_, i) => !o[i]))
    return {
      tocno: false,
      poruka:
        pit.length > 1
          ? "Odaberi oblik vraćenog pulsa za oba užeta."
          : "Odaberi oblik vraćenog pulsa.",
      prazno: true,
    };
  const oblik = s.oblik ?? "brijeg";
  const polja = pit.map((q, i) => o[i] === odbijeniOblik(oblik, q.kraj));
  const i = polja.indexOf(false);
  if (i < 0) return { tocno: true, polja };
  const q = pit[i];
  const pref =
    pit.length > 1
      ? `${IME_KRAJA[q.kraj][0].toUpperCase()}${IME_KRAJA[q.kraj].slice(1)}: `
      : "";
  const poruka = {
    ucvrscen:
      "zid ne pušta kraj užeta da se digne, nego ga povuče na suprotnu stranu, pa se puls vrati **okrenut**: brijeg postane dolina (i obrnuto).",
    slobodan:
      "prsten slobodno klizne po šipki do vrha i povuče uže za sobom, pa se puls vrati **neokrenut**: brijeg ostane brijeg.",
    bez_odbijanja: "kad se puls ne odbija, nastavi dalje i ne vrati se.",
  }[q.kraj];
  return { tocno: false, poruka: `${pref}${poruka}`, polja };
}

// postavi: velicine (p) → vrijednosti; cilj {trbuha: n} je isto što i {velicina: "n", vrijednost: n}
const velicineZa = (s) => (p) => {
  const P = parametri(s, p);
  return { ...vrijednosti(s, P), n: P.nTocno ?? NaN };
};
const ciljPostavi = (s) =>
  s.cilj?.trbuha != null
    ? { ...s, cilj: { velicina: "n", vrijednost: s.cilj.trbuha } }
    : s;

function checkPostavi(s, odgovor) {
  const k = klizaciOd(s)[0];
  const v = isNum(odgovor) ? odgovor : odgovor?.[k.id];
  if (!isNum(v))
    return { tocno: false, poruka: "Pomakni klizač.", prazno: true };
  const sc = ciljPostavi(s);
  const a = analizaCilja(sc, k, velicineZa(s));
  if (a.ok(v)) return { tocno: true };
  const hit = (s.krivo ?? []).find((x) => near(v, x.vrijednost, k.korak * 0.5));
  if (hit) return { tocno: false, poruka: hit.poruka };
  const P = parametri(s, { ...pocetneVrijednosti(s), [k.id]: v });
  const ime = String(k.oznaka).replace(/\$/g, "");
  const kl = `${ime.charAt(0).toUpperCase()}${ime.slice(1)} = ${withUnit(v, k.jedinica)}`;
  if (s.cilj.trbuha != null) {
    const n = s.cilj.trbuha;
    const smjer = (vise) => {
      if (k.id === s.f) return vise ? "viša frekvencija" : "niža frekvencija";
      if (k.id === s.napetost) return vise ? "manja napetost" : "veća napetost";
      if (k.id === s.L) return vise ? "dulja nit" : "kraća nit";
      return vise ? "više" : "manje";
    };
    if (P.n != null)
      return {
        tocno: false,
        poruka: `${kl}: na niti ${P.n === 1 ? "je 1 trbuh" : `su ${P.n} trbuha`} (${P.n}. harmonik), a treba ${n}: treba ${smjer(P.n < n)}.`,
      };
    return {
      tocno: false,
      poruka: `${kl}: stojni val ne nastaje: nit samo drhti. Stojni val nastaje samo kad na nit stane cijeli broj polovina valne duljine (ℓ = n·λ/2).`,
    };
  }
  const m = META[s.cilj.velicina];
  return {
    tocno: false,
    poruka: `${kl}: ${m.naziv} je ${iznosJed(velicineZa(s)({ ...pocetneVrijednosti(s), [k.id]: v })[s.cilj.velicina], m.jedinica)}, a treba ${iznosJed(s.cilj.vrijednost, m.jedinica)}.`,
  };
}

// ── izracunaj ───────────────────────────────────────────────────────────────────────────────────────
export const VELICINE_IZRACUNA = {
  putujuci: ["T", "f", "v", "lambda", "lambda2"],
  puls: ["t_povratak", "t_kraj"],
  stojni: ["lambda", "v", "f", "f1", "fn", "n_trbuha", "n_cvorova"],
};
const JEDINICE = {
  T: { s: 1, ms: 1e-3 },
  f: { Hz: 1, kHz: 1e3 },
  v: { "m/s": 1 },
  lambda: { m: 1, cm: 1e-2 },
  lambda2: { m: 1, cm: 1e-2 },
  t_povratak: { s: 1 },
  t_kraj: { s: 1 },
  f1: { Hz: 1, kHz: 1e3 },
  fn: { Hz: 1, kHz: 1e3 },
  n_trbuha: { "": 1 },
  n_cvorova: { "": 1 },
};
const OZNAKE_IZRACUNA = {
  T: "$T =$",
  f: "$f =$",
  v: "$v =$",
  lambda: "$\\lambda =$",
  lambda2: "$\\lambda_2 =$",
  t_povratak: "$t =$",
  t_kraj: "$t =$",
  f1: "$f_1 =$",
  fn: "$f_n =$",
  n_trbuha: "broj trbuha:",
  n_cvorova: "broj čvorova:",
};
export const jedinicaPitanja = (q) =>
  q.jedinica ?? Object.keys(JEDINICE[q.velicina] ?? { "": 1 })[0];
export const oznakaPitanja = (q) =>
  q.oznaka ??
  (q.velicina === "fn" ? `$f_{${q.n}} =$` : OZNAKE_IZRACUNA[q.velicina]);

// Točan iznos (u jedinici pitanja) i tipične krive vrijednosti koje računa aplikacija.
export function izracun(s, q) {
  const P = parametri(s);
  const j = jedinicaPitanja(q);
  const fk = JEDINICE[q.velicina]?.[j] ?? 1;
  const n = P.n;
  let a;
  let k = [];
  switch (q.velicina) {
    case "T":
      a = P.T;
      k = [
        [
          P.T / 4,
          "To je četvrtina perioda: od brijega do ravnoteže čestica napravi četvrtinu titraja, pa je T četiri puta dulji.",
        ],
        [P.T / 2, "To je pola perioda (od brijega do doline)."],
        [P.f, "To je frekvencija. Period je T = 1/f."],
      ];
      break;
    case "f":
      if (s.scena === "stojni") {
        a = P.f;
        k = [[P.f1, "To je osnovna frekvencija (jedan trbuh)."]];
        break;
      }
      a = P.f;
      k = [
        [
          4 * P.f,
          "Uzeo si četvrtinu perioda kao cijeli period. Od brijega do ravnoteže je T/4, pa je T četiri puta dulji.",
        ],
        [2 * P.f, "Uzeo si pola perioda kao cijeli period."],
        [P.T, "To je period. Frekvencija je f = 1/T."],
      ];
      break;
    case "v":
      if (s.scena === "stojni") {
        a = P.v;
        k = [
          [
            (P.f * P.L) / n,
            "Uzeo si jednu petlju kao cijeli val. Petlja je pola valne duljine: λ = 2ℓ/n.",
          ],
          [
            (P.f * 2 * P.L) / (n + 1),
            "Brojao si čvorove umjesto petlji (trbuha). Na niti je n petlji, a svaka je λ/2.",
          ],
          [P.f / P.lambda, "Brzina vala je v = λ·f, a ne f/λ."],
        ];
        break;
      }
      a = P.v;
      k = [
        [P.lambda * P.T, "Brzina je v = λ/T (ili λ·f), a ne λ·T."],
        [
          4 * P.v,
          "Period nije vrijeme od brijega do ravnoteže: to je tek T/4.",
        ],
        [2 * P.v, "Od brijega do ravnoteže je četvrtina perioda, a ne pola."],
      ];
      break;
    case "lambda":
      if (s.scena === "stojni") {
        a = P.lambda;
        k = [
          [
            P.L / n,
            "Jedna petlja je **pola** valne duljine (brijeg ili dolina), a ne cijeli val: λ = 2ℓ/n.",
          ],
          [(2 * P.L) / (n + 1), "Brojao si čvorove umjesto petlji (trbuha)."],
          [
            P.L / (2 * n),
            "Petlja je pola valne duljine, pa je λ dvostruko dulja od petlje, a ne kraća.",
          ],
        ];
        break;
      }
      a = P.lambda;
      k = [[P.v * P.f, "Valna duljina je λ = v·T = v/f, a ne v·f."]];
      break;
    case "lambda2":
      a = P.lambda2;
      k = [
        [
          P.lambda,
          "Valna duljina se pri prijelazu mijenja. Ista ostaje frekvencija (određuje je izvor), a brzina je druga, pa je i λ₂ = v₂·T druga.",
        ],
        [
          (P.lambda * P.v) / P.v2,
          "Omjer je obrnut: valna duljina mijenja se u **istom** omjeru kao brzina (λ₂/λ₁ = v₂/v₁).",
        ],
        [P.v2 * P.f, "Valna duljina je λ = v·T = v/f, a ne v·f."],
      ];
      break;
    case "t_povratak":
      a = P.t_povratak;
      k = [
        [
          P.t_kraj,
          "To je vrijeme samo do kraja užeta. Puls mora doći do kraja **i vratiti se**: put je 2ℓ.",
        ],
        [P.v / (2 * P.L), "Vrijeme je t = s/v, a ne v/s."],
      ];
      break;
    case "t_kraj":
      a = P.t_kraj;
      k = [
        [
          P.t_povratak,
          "To je vrijeme do kraja i natrag. Do kraja je put samo ℓ.",
        ],
        [P.v / P.L, "Vrijeme je t = s/v, a ne v/s."],
      ];
      break;
    case "f1":
      a = P.f1;
      k = [
        [P.f * n, "Osnovna frekvencija je **najniža**: f₁ = f/n, a ne f·n."],
        [
          P.v / P.L,
          "Na niti s jednim trbuhom stane samo pola vala: λ₁ = 2ℓ, pa je f₁ = v/(2ℓ).",
        ],
        [P.f, `To je frekvencija ${n}. harmonika (${n} trbuha), a ne osnovna.`],
        [
          P.f / 2,
          `Na niti je ${n} trbuha, pa je osnovna frekvencija ${n} puta manja.`,
        ],
      ];
      break;
    case "fn":
      a = q.n * P.f1;
      k = [
        [P.f1, "To je osnovna frekvencija (jedan trbuh)."],
        [
          (q.n * P.v) / P.L,
          "Svaka petlja je pola valne duljine: λ = 2ℓ/n, pa je f = n·v/(2ℓ).",
        ],
      ];
      break;
    case "n_trbuha":
      a = n;
      k = [
        [
          n + 1,
          "To je broj čvorova (s krajevima). Trbuha je jedan manje: svaki je sredina jedne petlje.",
        ],
        [
          n - 1,
          "To je broj čvorova bez krajeva. Trbuh je sredina petlje: koliko petlji, toliko trbuha.",
        ],
      ];
      break;
    case "n_cvorova":
      a = n + 1;
      k = [
        [
          n,
          "To je broj trbuha (petlji). Čvorova je jedan više jer su i oba kraja čvorovi.",
        ],
        [n - 1, "Zaboravio si krajeve: učvršćen kraj je uvijek čvor."],
      ];
      break;
    default:
      a = NaN;
  }
  const odg = a / fk;
  const tol = isNum(q.tolerancija) ? q.tolerancija : Math.abs(odg) * 0.01;
  const krivo = [];
  for (const [vr, poruka] of k) {
    const x = vr / fk;
    if (!isNum(x) || x <= 0) continue;
    if (near(x, odg, Math.max(tol, Math.abs(odg) * 0.02))) continue;
    if (krivo.some((y) => near(y.vrijednost, x, Math.abs(x) * 0.01))) continue;
    krivo.push({ vrijednost: x, poruka });
  }
  return { odgovor: odg, jedinica: j, tol, krivo };
}

const SAVJET = {
  T: "Period je vrijeme jednog cijelog titraja.",
  f: "Frekvencija je f = 1/T.",
  v: "Brzina vala: v = λ/T = λ·f.",
  lambda: "Valna duljina: λ = v·T = v/f.",
  lambda2: "Frekvencija ostaje ista, pa je λ₂ = v₂·T.",
  t_povratak: "Put pulsa je do kraja i natrag: s = 2ℓ, t = s/v.",
  t_kraj: "Do kraja je put ℓ: t = ℓ/v.",
  f1: "Osnovna frekvencija: f₁ = v/(2ℓ).",
  fn: "Frekvencija n. harmonika: fₙ = n·v/(2ℓ).",
  n_trbuha: "Prebroji petlje: svaka petlja ima jedan trbuh.",
  n_cvorova: "Čvorovi su mjesta koja miruju, uključujući oba kraja.",
};

function checkIzracunaj(s, odgovor) {
  const unosi = Array.isArray(odgovor) ? odgovor : [odgovor];
  const vise = s.pitaj.length > 1;
  const polja = [];
  let prva = null;
  for (const [i, q] of s.pitaj.entries()) {
    const r0 = izracun(s, q);
    const r = checkNumber({
      input: unosi[i] ?? "",
      answer: r0.odgovor,
      tol: r0.tol,
      unit: r0.jedinica,
      krivo: [...(q.krivo ?? []), ...r0.krivo],
      savjet: s.savjet || SAVJET[q.velicina],
    });
    if (r.prazno)
      return {
        tocno: false,
        poruka: vise ? "Upiši sve odgovore." : r.poruka,
        prazno: true,
      };
    polja.push(!!r.tocno);
    if (!r.tocno && !prva) prva = { ...r, q, i };
  }
  if (!prva) return { tocno: true, polja };
  return {
    tocno: false,
    poruka: vise ? `U ${prva.i + 1}. polju: ${prva.poruka}` : prva.poruka,
    polja,
  };
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Val na užetu (fizika, matura). tekst, scena, nacin, L (duljina užeta u m), v (brzina vala, m/s) ILI napetost (N) + mi (kg/m; v = √(F/μ)), ubrzanje? (usporenje animacije; zadano automatski), prikazi? (${PRIKAZI.join(", ")}), brojaci? (veličine uživo: ${Object.keys(META).join(", ")}; u načinima s odgovorom samo one koje ne odaju odgovor).
Brojčano polje smije biti id klizača. ${KLIZACI_OPIS}.
Scene:
- "putujuci": f (Hz) ILI T (s), A (amplituda, m), drugo_uze? {v, od (mjesto spoja u m)} (val prelazi na drugo uže: f ista, λ se mijenja; odbijeni dio na spoju se ne crta), istaknute? [x u m] (1–2 crvene kuglice), istaknuta_pocetak? ("brijeg" zadano | "dolina" | "ravnoteza": stanje prve crvene kuglice u t = 0), ustaljeno? (samo istrazi: val već ispunjava uže; zadano u istrazi val kreće iz izvora). Kuglice titraju samo okomito; "lambda" crta zagradu između susjednih brjegova, "y-t" graf y(t) crvene kuglice.
- "puls": A (m), oblik? ("brijeg" zadano | "dolina"), kraj ("ucvrscen" zid | "slobodan" prsten na šipki | "bez_odbijanja"). Puls kreće od ruke u t = 0, kraj stigne u ℓ/v, natrag u 2ℓ/v; zid ga vrati okrenutog, prsten neokrenutog.
- "stojni": f (Hz, broj ili klizač). Nit učvršćena na oba kraja, vibrator lijevo; na fₙ = n·v/(2ℓ) „zapleše“ s n trbuha, između harmonika samo drhti. "tragovi" crta ovojnicu, "cvorovi" (samo istrazi) označi čvorove i trbuhe.
Načini (istrazi = POGLEDAJ, ostali = Tvoj red):
- "istrazi" (sve scene): klizači (do 3, npr. f, A, napetost), ▶/⏸ i traka vremena; puls ima gumb za novi puls i izbor kraja. Bez polja s odgovorom.
- "zaustavi" (putujuci, puls): učenik pokrene i zaustavi vrijeme (ili ga premota) pa provjeri. putujuci: cilj {uvjet: "ravnoteza" | "brijeg" | "dolina" (za prvu crvenu kuglicu, od istaknuta_pocetak), prvi? (zadano true), tolerancija? (s; zadano max(0,01 s, 2 % T))}; puls: cilj {uvjet: "kraj" | "povratak", tolerancija? (zadano 2 % od 2ℓ/v)}. Trenutke i poruke („to je dolina: pola perioda“, „puls je tek stigao do kraja“) računa aplikacija; krivo?: [{vrijednost (t u s), poruka}]. Bez klizača; T, f i v se ne prikazuju.
- "oznaci": putujuci: trazi "lambda", uze? (1 | 2, uz drugo_uze): učenik povuče dvije oznake na zamrznutoj fotografiji užeta; točno je |Δx − λ| ≤ 4 % (bilo koje dvije točke iste faze). stojni: trazi "cvorovi" | "trbusi" (f mora biti harmonik): učenik dodirne nit na svim čvorovima (s krajevima) ili trbusima.
- "predvidi" (puls): pitanja [{kraj}] (1–2 užeta): učenik za svako bira oblik vraćenog pulsa (brijeg / dolina, uz bez_odbijanja i „ne vrati se“); nakon odgovora animacija pokaže odbijanje.
- "postavi" (putujuci, stojni): točno jedan klizač; cilj {trbuha: n} (stojni) ILI {velicina (${Object.keys(META).join(", ")}), vrijednost, tolerancija?}. Scena se ne mijenja dok učenik ne provjeri (vibrator miruje), osim uz uzivo: true. krivo?: [{vrijednost (klizača), poruka}].
- "izracunaj": pitaj [{velicina, jedinica?, oznaka?, n? (za fn), tolerancija? (zadano 1 %), krivo?}] (1–3). Veličine: putujuci ${VELICINE_IZRACUNA.putujuci.join(", ")}; puls ${VELICINE_IZRACUNA.puls.join(", ")}; stojni ${VELICINE_IZRACUNA.stojni.join(", ")} (f mora biti harmonik). Scena se samo animira (bez sata, bez očitanja). Tipične krive vrijednosti (T/4 kao period, λ·T, λ₂ = λ₁, obrnut omjer, ℓ/v umjesto 2ℓ/v, petlja kao cijeli val, brojanje čvorova, f₁ = f·n, v/ℓ…) dodaju se same; ${KRIVO_OPIS}.`;

const PRIMJER = {
  tip: TIP,
  scena: "putujuci",
  nacin: "zaustavi",
  tekst:
    "Crvena kuglica je na vrhu brijega. Pokreni val i zaustavi ga kad kuglica **prvi put** dođe u ravnotežni položaj.",
  L: 4.8,
  v: 3,
  T: 0.4,
  A: 0.15,
  istaknute: [2.4],
  istaknuta_pocetak: "brijeg",
  cilj: { uvjet: "ravnoteza" },
};

const PRIMJERI = [
  {
    tip: TIP,
    scena: "putujuci",
    nacin: "izracunaj",
    tekst:
      "Valna duljina je 1,2 m, a crvenoj kuglici od vrha brijega do ravnotežnog položaja treba 0,1 s. Kolika je frekvencija izvora i kolika je brzina vala?",
    L: 4.8,
    v: 3,
    T: 0.4,
    A: 0.15,
    istaknute: [2.4],
    pitaj: [{ velicina: "f" }, { velicina: "v" }],
  },
  {
    tip: TIP,
    scena: "putujuci",
    nacin: "oznaci",
    trazi: "lambda",
    tekst:
      "Ovo je fotografija užeta u jednom trenutku. Povuci dvije oznake tako da između njih bude **jedna valna duljina**.",
    L: 4.8,
    v: 3,
    T: 0.4,
    A: 0.15,
  },
  {
    tip: TIP,
    scena: "putujuci",
    nacin: "istrazi",
    tekst:
      "Uže je na 3,6 m vezano za drugo uže, po kojem val ide upola sporije. Mijenjaj frekvenciju i amplitudu i gledaj valne duljine na oba užeta.",
    L: 6,
    v: 3,
    f: "f",
    A: "A",
    drugo_uze: { v: 1.5, od: 3.6 },
    klizaci: [
      {
        id: "f",
        oznaka: "frekvencija izvora",
        min: 1,
        max: 3,
        korak: 0.5,
        pocetak: 2.5,
        jedinica: "Hz",
      },
      {
        id: "A",
        oznaka: "amplituda",
        min: 0.05,
        max: 0.3,
        korak: 0.05,
        pocetak: 0.15,
        jedinica: "m",
      },
    ],
  },
  {
    tip: TIP,
    scena: "putujuci",
    nacin: "istrazi",
    tekst:
      "Što mijenja **brzinu** vala? Mijenjaj napetost užeta, frekvenciju i amplitudu i gledaj brzinu.",
    L: 6,
    napetost: "F",
    mi: 0.05,
    f: "f",
    A: "A",
    istaknute: [3],
    ustaljeno: false,
    klizaci: [
      {
        id: "F",
        oznaka: "napetost užeta",
        min: 0.2,
        max: 1.8,
        korak: 0.05,
        pocetak: 0.45,
        jedinica: "N",
      },
      {
        id: "f",
        oznaka: "frekvencija izvora",
        min: 1,
        max: 3,
        korak: 0.5,
        pocetak: 2.5,
        jedinica: "Hz",
      },
      {
        id: "A",
        oznaka: "amplituda",
        min: 0.05,
        max: 0.3,
        korak: 0.05,
        pocetak: 0.15,
        jedinica: "m",
      },
    ],
    brojaci: ["v", "lambda", "f"],
  },
  {
    tip: TIP,
    scena: "putujuci",
    nacin: "izracunaj",
    tekst:
      "Val (λ = 1,2 m, T = 0,4 s) prelazi na drugo uže, po kojem ide brzinom 1,5 m/s. Kolika je valna duljina na drugom užetu?",
    L: 6,
    v: 3,
    T: 0.4,
    A: 0.15,
    drugo_uze: { v: 1.5, od: 3.6 },
    pitaj: [{ velicina: "lambda2" }],
  },
  {
    tip: TIP,
    scena: "putujuci",
    nacin: "postavi",
    tekst:
      "Val ide užetom brzinom 3 m/s. Namjesti frekvenciju izvora tako da valna duljina bude **1,5 m**, pa provjeri.",
    L: 6,
    v: 3,
    f: "f",
    A: 0.15,
    klizaci: [
      {
        id: "f",
        oznaka: "frekvencija izvora",
        min: 0.5,
        max: 5,
        korak: 0.5,
        pocetak: 3,
        jedinica: "Hz",
      },
    ],
    cilj: { velicina: "lambda", vrijednost: 1.5 },
  },
  {
    tip: TIP,
    scena: "puls",
    nacin: "predvidi",
    tekst:
      "Puls (brijeg) putuje prema kraju užeta. Kako će izgledati kad se vrati, ako je kraj **učvršćen**, a kako ako je **slobodan**?",
    L: 12,
    v: 16,
    A: 0.4,
    oblik: "brijeg",
    pitanja: [{ kraj: "ucvrscen" }, { kraj: "slobodan" }],
  },
  {
    tip: TIP,
    scena: "puls",
    nacin: "zaustavi",
    tekst: "Pokreni puls i zaustavi vrijeme točno kad se **vrati do ruke**.",
    L: 12,
    v: 16,
    A: 0.4,
    kraj: "ucvrscen",
    cilj: { uvjet: "povratak" },
  },
  {
    tip: TIP,
    scena: "puls",
    nacin: "istrazi",
    tekst:
      "Napravi puls i gledaj kako se odbija. Promijeni kraj užeta: zid ili prsten koji klizi po šipki.",
    L: 12,
    v: 16,
    A: 0.4,
    kraj: "ucvrscen",
  },
  {
    tip: TIP,
    scena: "puls",
    nacin: "izracunaj",
    tekst:
      "Uže je dugo 12 m, a puls njime putuje brzinom 16 m/s. Nakon kojeg se vremena puls vrati do ruke?",
    L: 12,
    v: 16,
    A: 0.4,
    kraj: "ucvrscen",
    pitaj: [{ velicina: "t_povratak" }],
  },
  {
    tip: TIP,
    scena: "stojni",
    nacin: "postavi",
    tekst:
      "Na niti duljine 1,2 m val ide brzinom 432 m/s. Namjesti frekvenciju vibratora tako da nastane stojni val s **3 trbuha**, pa provjeri.",
    L: 1.2,
    v: 432,
    f: "f",
    klizaci: [
      {
        id: "f",
        oznaka: "frekvencija vibratora",
        min: 50,
        max: 1000,
        korak: 10,
        pocetak: 300,
        jedinica: "Hz",
      },
    ],
    cilj: { trbuha: 3 },
  },
  {
    tip: TIP,
    scena: "stojni",
    nacin: "postavi",
    tekst:
      "Ista nit (1,2 m, 432 m/s). Namjesti **najnižu** frekvenciju pri kojoj na niti nastaje stojni val.",
    L: 1.2,
    v: 432,
    f: "f",
    klizaci: [
      {
        id: "f",
        oznaka: "frekvencija vibratora",
        min: 50,
        max: 1000,
        korak: 10,
        pocetak: 300,
        jedinica: "Hz",
      },
    ],
    cilj: { trbuha: 1 },
  },
  {
    tip: TIP,
    scena: "stojni",
    nacin: "istrazi",
    tekst:
      "Polako mijenjaj frekvenciju vibratora. Kad nit „zapleše“, prebroji trbuhe.",
    L: 1.2,
    v: 432,
    f: "f",
    klizaci: [
      {
        id: "f",
        oznaka: "frekvencija vibratora",
        min: 50,
        max: 1000,
        korak: 10,
        pocetak: 300,
        jedinica: "Hz",
      },
    ],
  },
  {
    tip: TIP,
    scena: "stojni",
    nacin: "oznaci",
    trazi: "cvorovi",
    tekst:
      "Na niti je stojni val. Dodirni nit na **svim čvorovima** (mjestima koja stalno miruju).",
    L: 1.2,
    v: 432,
    f: 540,
  },
  {
    tip: TIP,
    scena: "stojni",
    nacin: "oznaci",
    trazi: "trbusi",
    tekst: "Dodirni nit na **svim trbusima** (mjestima koja najjače titraju).",
    L: 1,
    v: 300,
    f: 600,
  },
  {
    tip: TIP,
    scena: "stojni",
    nacin: "izracunaj",
    tekst:
      "Nit duljine 1,2 m titra frekvencijom 540 Hz i na njoj su 3 trbuha. Kolika je valna duljina i kolika je brzina vala?",
    L: 1.2,
    v: 432,
    f: 540,
    pitaj: [{ velicina: "lambda" }, { velicina: "v" }],
  },
  {
    tip: TIP,
    scena: "stojni",
    nacin: "izracunaj",
    tekst:
      "Na istoj niti (1,2 m, 3 trbuha pri 540 Hz) kolika je najniža frekvencija pri kojoj nastaje stojni val?",
    L: 1.2,
    v: 432,
    f: 540,
    pitaj: [{ velicina: "f1" }],
  },
];

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
const ZAJEDNICKA = [
  "tip",
  "scena",
  "nacin",
  "tekst",
  "L",
  "v",
  "napetost",
  "mi",
  "klizaci",
  "ubrzanje",
  "brojaci",
  "prikazi",
  "savjet",
];
const POLJA_SCENE = {
  putujuci: [
    "f",
    "T",
    "A",
    "drugo_uze",
    "istaknute",
    "istaknuta_pocetak",
    "ustaljeno",
  ],
  puls: ["A", "oblik", "kraj"],
  stojni: ["f"],
};
const POLJA_NACINA = {
  istrazi: [],
  zaustavi: ["cilj", "krivo"],
  oznaci: ["trazi", "uze"],
  predvidi: ["pitanja"],
  postavi: ["cilj", "krivo", "uzivo"],
  izracunaj: ["pitaj"],
};

function validate(s) {
  const { list, need } = problems();
  need(isText(s.tekst), "val_uze treba „tekst“");
  if (
    !need(
      SCENE.includes(s.scena),
      `val_uze.scena mora biti jedna od: ${SCENE.join(", ")}`,
    )
  )
    return list;
  if (
    !need(
      NACINI[s.scena].includes(s.nacin),
      `val_uze.nacin za scenu ${s.scena} mora biti jedan od: ${NACINI[s.scena].join(", ")}`,
    )
  )
    return list;
  const dopustena = [
    ...ZAJEDNICKA,
    ...POLJA_SCENE[s.scena],
    ...POLJA_NACINA[s.nacin],
  ];
  for (const f of Object.keys(s))
    need(
      dopustena.includes(f),
      `polje „${f}“ ne postoji u sceni ${s.scena} (način ${s.nacin})`,
    );

  if (s.nacin === "istrazi") validateKlizaci(s, need, { najvise: 3 });
  else if (s.nacin === "postavi")
    validateKlizaci(s, need, { najmanje: 1, najvise: 1 });
  else
    need(
      s.klizaci == null,
      `način ${s.nacin} nema klizače: sve vrijednosti su brojevi`,
    );
  if (list.length) return list;

  const koristeni = [];
  const polje = (ime, o, obj = s) => {
    if (typeof obj[ime] === "string") koristeni.push(obj[ime]);
    return validatePolje({ ...s, [ime]: obj[ime] }, need, ime, o);
  };
  polje("L", { min: 0.1, max: 100, opis: "duljina užeta u m" });
  if (s.napetost != null || s.mi != null) {
    need(s.v == null, "zadaj ili v ili napetost i mi, ne oboje");
    polje("napetost", { min: 0.001, max: 1e5, opis: "napetost u N" });
    polje("mi", { min: 1e-6, max: 10, opis: "masa po duljini u kg/m" });
  } else polje("v", { min: 0.05, max: 5000, opis: "brzina vala u m/s" });

  if (s.scena === "putujuci") {
    need(
      (s.f != null) !== (s.T != null),
      "putujuci treba točno jedno od: f (Hz) ili T (s)",
    );
    if (s.f != null)
      polje("f", { min: 0.05, max: 50, opis: "frekvencija u Hz" });
    if (s.T != null) polje("T", { min: 0.02, max: 20, opis: "period u s" });
    polje("A", { min: 0.001, max: 5, opis: "amplituda u m" });
    if (
      s.drugo_uze != null &&
      need(
        typeof s.drugo_uze === "object" && !Array.isArray(s.drugo_uze),
        "drugo_uze mora biti {v, od}",
      )
    ) {
      need(
        Object.keys(s.drugo_uze).every((k) => ["v", "od"].includes(k)),
        "drugo_uze ima samo v i od",
      );
      polje(
        "v",
        { min: 0.05, max: 5000, opis: "brzina na drugom užetu u m/s" },
        s.drugo_uze,
      );
      need(
        isNum(s.drugo_uze.od),
        "drugo_uze.od mora biti broj (mjesto spoja u m)",
      );
    }
    if (s.istaknute != null)
      need(
        Array.isArray(s.istaknute) &&
          s.istaknute.length >= 1 &&
          s.istaknute.length <= 2 &&
          s.istaknute.every((x) => isNum(x) && isNum(s.L) && x > 0 && x < s.L),
        "istaknute mora biti 1–2 položaja kuglica (m) unutar užeta, 0 < x < L",
      );
    if (s.istaknuta_pocetak != null) {
      need(
        POCECI.includes(s.istaknuta_pocetak),
        `istaknuta_pocetak mora biti: ${POCECI.join(", ")}`,
      );
      need(istaknute(s).length > 0, "istaknuta_pocetak treba istaknute");
    }
    if (s.ustaljeno != null) {
      need(typeof s.ustaljeno === "boolean", "ustaljeno je true ili false");
      need(
        s.nacin === "istrazi",
        "ustaljeno postoji samo u istrazi (ostali načini su uvijek ustaljeni)",
      );
      need(
        !(s.ustaljeno === false && s.istaknuta_pocetak != null),
        "istaknuta_pocetak ima smisla samo kad val već ispunjava uže (ustaljeno)",
      );
    }
    if (s.nacin === "istrazi" && s.ustaljeno !== true)
      need(
        s.istaknuta_pocetak == null,
        "u istrazi val kreće iz izvora, pa istaknuta_pocetak treba ustaljeno: true",
      );
  }
  if (s.scena === "puls") {
    polje("A", { min: 0.001, max: 5, opis: "amplituda pulsa u m" });
    if (s.oblik != null)
      need(OBLICI.includes(s.oblik), `oblik mora biti: ${OBLICI.join(", ")}`);
    if (s.nacin === "predvidi")
      need(s.kraj == null, "predvidi nema kraj: krajevi su u pitanja");
    else
      need(KRAJEVI.includes(s.kraj), `puls treba kraj: ${KRAJEVI.join(", ")}`);
  }
  if (s.scena === "stojni")
    polje("f", { min: 1, max: 20000, opis: "frekvencija u Hz" });
  if (s.ubrzanje != null)
    need(
      isNum(s.ubrzanje) && s.ubrzanje > 0 && s.ubrzanje <= 1,
      "ubrzanje mora biti broj iz (0, 1] (usporenje animacije)",
    );
  if (list.length) return list;
  validateKoristeniKlizaci(s, need, koristeni);
  if (list.length) return list;

  // geometrija u cijelom rasponu klizača
  let kraj;
  try {
    kraj = krajnjeKombinacije(s).map((q) => parametri(s, q));
  } catch {
    need(false, "scena se ne može izračunati");
    return list;
  }
  for (const P of kraj) {
    if (s.scena === "putujuci") {
      if (P.od != null) {
        need(
          P.od >= 0.15 * P.L && P.od <= 0.85 * P.L,
          "drugo_uze.od mora biti između 15 % i 85 % duljine užeta",
        );
        need(
          (P.L - P.od) / P.lambda2 <= 12 && (P.L - P.od) / P.lambda2 >= 0.5,
          `na drugom užetu mora stati 0,5–12 valnih duljina (sad ${formatNumber((P.L - P.od) / P.lambda2)})`,
        );
      }
      const l1 = P.od ?? P.L;
      need(
        l1 / P.lambda <= 12 && P.L / P.lambda >= 0.5,
        `na užetu mora stati 0,5–12 valnih duljina (sad ${formatNumber(l1 / P.lambda)})`,
      );
      need(
        P.A <= P.L / 4,
        "amplituda mora biti najviše četvrtina duljine užeta",
      );
    }
    if (s.scena === "puls")
      need(
        P.A <= P.L / 4,
        "amplituda pulsa mora biti najviše četvrtina duljine užeta",
      );
    if (s.scena === "stojni")
      need(
        P.nTocno <= 15,
        `na niti smije biti najviše 15 trbuha (sad do ${formatNumber(P.nTocno)})`,
      );
    if (list.length) return list;
  }
  const P = parametri(s);

  // prikazi i brojaci
  if (
    s.prikazi != null &&
    need(Array.isArray(s.prikazi), "prikazi mora biti popis")
  ) {
    for (const x of s.prikazi)
      need(
        PRIKAZI.includes(x),
        `prikazi: „${x}“ nije jedno od: ${PRIKAZI.join(", ")}`,
      );
    const pr = s.prikazi;
    if (pr.includes("y-t"))
      need(
        s.scena === "putujuci" && istaknute(s).length > 0,
        "y-t (graf crvene kuglice) treba scenu putujuci i istaknute",
      );
    if (pr.includes("lambda"))
      need(s.scena === "putujuci", "lambda (zagrada) je samo za putujuci");
    if (pr.includes("tragovi") || pr.includes("cvorovi"))
      need(s.scena === "stojni", "tragovi i cvorovi su samo za stojni");
    if (pr.includes("cvorovi"))
      need(
        s.nacin === "istrazi",
        "cvorovi (oznake čvorova i trbuha) samo u istrazi: inače odaju odgovor",
      );
    if (pr.includes("lambda"))
      need(
        !["oznaci", "postavi"].includes(s.nacin),
        "lambda (zagrada) odaje odgovor u oznaci/postavi",
      );
    if (s.nacin === "izracunaj") {
      const pit = (s.pitaj ?? []).map((q) => q?.velicina);
      if (pit.some((v) => ["lambda", "lambda2", "v"].includes(v)))
        need(
          !pr.includes("ravnalo") && !pr.includes("lambda"),
          "izracunaj λ ili v: bez ravnala i zagrade λ (odale bi odgovor)",
        );
      if (pit.some((v) => ["T", "f"].includes(v)))
        need(
          !pr.includes("y-t"),
          "izracunaj T ili f: bez grafa y-t (odaje period)",
        );
    }
  }
  if (
    s.brojaci != null &&
    need(
      Array.isArray(s.brojaci) && s.brojaci.length <= 5,
      "brojaci mora biti popis do 5 veličina",
    )
  ) {
    const smiju = dopustenaOcitanja(s);
    for (const k of s.brojaci)
      need(
        smiju.includes(k),
        `brojaci: „${k}“ ${kljuceviScene(s).includes(k) ? `bi u načinu ${s.nacin} odao odgovor (dopušteno: ${smiju.join(", ") || "ništa"})` : `nije veličina scene (${kljuceviScene(s).join(", ")})`}`,
      );
  }

  // načini
  if (s.nacin === "istrazi") noAnswerFields(s, need);
  if (s.nacin === "zaustavi") {
    const c = s.cilj;
    if (need(c && typeof c === "object", "zaustavi treba cilj: {uvjet}")) {
      need(
        UVJETI[s.scena].includes(c.uvjet),
        `cilj.uvjet za ${s.scena} mora biti: ${UVJETI[s.scena].join(", ")}`,
      );
      need(
        Object.keys(c).every((k) =>
          ["uvjet", "prvi", "tolerancija"].includes(k),
        ),
        "cilj ima samo uvjet, prvi? i tolerancija?",
      );
      if (c.prvi != null)
        need(
          typeof c.prvi === "boolean" && s.scena === "putujuci",
          "cilj.prvi je true/false i samo za putujuci",
        );
      if (c.tolerancija != null)
        need(
          isNum(c.tolerancija) && c.tolerancija > 0,
          "cilj.tolerancija je broj sekundi > 0",
        );
      if (s.scena === "putujuci") {
        need(
          istaknute(s).length === 1,
          "zaustavi (putujuci) treba točno jednu istaknutu (crvenu) kuglicu",
        );
        if (!list.length && UVJETI.putujuci.includes(c.uvjet))
          need(
            tocniTrenuci(s).length > 0,
            "cilj se ne dogodi unutar trake vremena",
          );
      }
      if (!list.length) {
        const tocni = tocniTrenuci(s);
        validateKrivo(s.krivo, null, 0, need);
        (s.krivo ?? []).forEach(
          (k, i) =>
            isNum(k?.vrijednost) &&
            need(
              !tocni.some((x) => near(k.vrijednost, x, tolZaustavi(s, P))),
              `krivo[${i}].vrijednost je točan trenutak`,
            ),
        );
      }
    }
  }
  if (s.nacin === "oznaci") {
    if (s.scena === "putujuci") {
      need(s.trazi === "lambda", 'oznaci na putujućem valu: trazi "lambda"');
      if (s.uze != null)
        need(
          [1, 2].includes(s.uze) && s.drugo_uze != null,
          "uze (1 | 2) samo uz drugo_uze",
        );
      const [a, b] = segmentUzeta(s, P);
      const l = s.uze === 2 ? P.lambda2 : P.lambda;
      need(
        b - a >= 1.3 * l,
        "na užetu (dijelu) za oznake moraju stati barem 1,3 valne duljine",
      );
    } else {
      need(
        ["cvorovi", "trbusi"].includes(s.trazi),
        'oznaci na stojnom valu: trazi "cvorovi" ili "trbusi"',
      );
      need(s.uze == null, "uze je samo za putujuci");
      need(
        P.n != null && Math.abs(P.nTocno - P.n) < 1e-6,
        `oznaci treba f na harmoniku: f = n·v/(2ℓ), npr. ${formatNumber(P.f1)}, ${formatNumber(2 * P.f1)}, ${formatNumber(3 * P.f1)} Hz (sad ${formatNumber(P.nTocno)} polovina vala)`,
      );
    }
  }
  if (s.nacin === "predvidi") {
    if (
      need(
        Array.isArray(s.pitanja) &&
          s.pitanja.length >= 1 &&
          s.pitanja.length <= 2,
        "predvidi treba pitanja: [{kraj}] (1–2)",
      )
    )
      s.pitanja.forEach((q, i) => {
        need(
          KRAJEVI.includes(q?.kraj),
          `pitanja[${i}].kraj mora biti: ${KRAJEVI.join(", ")}`,
        );
        need(
          Object.keys(q ?? {}).every((k) => k === "kraj"),
          `pitanja[${i}] ima samo kraj`,
        );
      });
    if (Array.isArray(s.pitanja) && s.pitanja.length === 2)
      need(
        s.pitanja[0]?.kraj !== s.pitanja[1]?.kraj,
        "dva pitanja moraju imati različite krajeve",
      );
  }
  if (s.nacin === "postavi") {
    need(s.scena !== "puls", "postavi nije za puls");
    if (s.uzivo != null)
      need(typeof s.uzivo === "boolean", "uzivo je true ili false");
    const k = klizaciOd(s)[0];
    const c = s.cilj;
    if (
      need(
        c && typeof c === "object",
        "postavi treba cilj: {trbuha} ili {velicina, vrijednost}",
      )
    ) {
      if (c.trbuha != null) {
        need(s.scena === "stojni", "cilj.trbuha je samo za stojni");
        need(
          Number.isInteger(c.trbuha) && c.trbuha >= 1 && c.trbuha <= 15,
          "cilj.trbuha je cijeli broj 1–15",
        );
        need(
          Object.keys(c).every((x) => x === "trbuha"),
          "cilj {trbuha} nema drugih polja",
        );
      } else {
        need(
          kljuceviScene(s).includes(c.velicina) && c.velicina !== "n",
          `cilj.velicina mora biti jedna od: ${kljuceviScene(s)
            .filter((x) => x !== "n")
            .join(", ")}`,
        );
        need(isNum(c.vrijednost), "cilj.vrijednost mora biti broj");
        if (c.tolerancija != null)
          need(
            isNum(c.tolerancija) && c.tolerancija >= 0,
            "cilj.tolerancija je nenegativan broj",
          );
        need(
          Object.keys(c).every((x) =>
            ["velicina", "vrijednost", "tolerancija"].includes(x),
          ),
          "cilj ima samo velicina, vrijednost, tolerancija?",
        );
      }
      if (!list.length && k) {
        const sc = ciljPostavi(s);
        const a = analizaCilja(sc, k, velicineZa(s));
        const vr = velicineZa(s)({ ...pocetneVrijednosti(s), [k.id]: a.best })[
          sc.cilj.velicina
        ];
        need(
          isNum(vr) &&
            Math.abs(vr - sc.cilj.vrijednost) <=
              0.01 * Math.abs(sc.cilj.vrijednost) + (c.tolerancija ?? 0),
          `cilj nije ostvariv klizačem „${k.id}“ (najbliže: ${formatNumber(a.best)}${k.jedinica ? ` ${k.jedinica}` : ""} daje ${formatNumber(vr)})`,
        );
        need(
          !a.ok(k.pocetak),
          `klizač „${k.id}“ na početku već ostvaruje cilj`,
        );
        validateKrivo(s.krivo, null, 0, need);
        (s.krivo ?? []).forEach(
          (x, i) =>
            isNum(x?.vrijednost) &&
            need(
              !a.ok(x.vrijednost),
              `krivo[${i}].vrijednost ostvaruje cilj, a to je točan odgovor`,
            ),
        );
      }
    }
  }
  if (s.nacin === "izracunaj") {
    if (
      need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "izracunaj treba pitaj: [{velicina, ...}] (1–3)",
      )
    ) {
      const dop = VELICINE_IZRACUNA[s.scena];
      s.pitaj.forEach((q, i) => {
        if (
          !need(
            dop.includes(q?.velicina),
            `pitaj[${i}].velicina za ${s.scena} mora biti: ${dop.join(", ")}`,
          )
        )
          return;
        need(
          Object.keys(q).every((k) =>
            [
              "velicina",
              "jedinica",
              "oznaka",
              "n",
              "tolerancija",
              "krivo",
            ].includes(k),
          ),
          `pitaj[${i}] ima samo velicina, jedinica?, oznaka?, n?, tolerancija?, krivo?`,
        );
        if (q.jedinica != null)
          need(
            q.jedinica in JEDINICE[q.velicina],
            `pitaj[${i}].jedinica za ${q.velicina} mora biti: ${Object.keys(JEDINICE[q.velicina]).join(", ")}`,
          );
        if (q.oznaka != null)
          need(isText(q.oznaka), `pitaj[${i}].oznaka mora biti tekst`);
        if (q.velicina === "fn")
          need(
            Number.isInteger(q.n) && q.n >= 1 && q.n <= 12,
            `pitaj[${i}]: fn treba n (cijeli broj 1–12)`,
          );
        else need(q.n == null, `pitaj[${i}].n je samo za fn`);
        if (q.velicina === "lambda2")
          need(s.drugo_uze != null, `pitaj[${i}]: lambda2 treba drugo_uze`);
        if (q.tolerancija != null)
          need(
            isNum(q.tolerancija) && q.tolerancija >= 0,
            `pitaj[${i}].tolerancija je nenegativan broj`,
          );
        if (!list.length) {
          const r = izracun(s, q);
          validateKrivo(q.krivo, r.odgovor, r.tol, need, `pitaj[${i}].krivo`);
        }
      });
      if (s.scena === "stojni")
        need(
          P.n != null && Math.abs(P.nTocno - P.n) < 1e-6,
          `izracunaj na stojnom valu treba f na harmoniku (f = n·v/(2ℓ); sad ${formatNumber(P.nTocno)} polovina vala)`,
        );
      need(
        new Set(s.pitaj.map((q) => `${q?.velicina}${q?.n ?? ""}`)).size ===
          s.pitaj.length,
        "pitaj: svaka veličina samo jednom",
      );
    }
  }
  return list;
}

// ── točan odgovor ───────────────────────────────────────────────────────────────────────────────────
const RAZLOMAK_T = { 0.25: "T/4", 0.5: "T/2", 0.75: "3T/4", 1: "T" };
function tocanOdgovor(s) {
  const P = parametri(s);
  if (s.nacin === "zaustavi") {
    const t = tocniTrenuci(s)[0];
    if (s.scena === "puls")
      return s.cilj.uvjet === "povratak"
        ? `t = 2ℓ/v = ${iznosJed(t, "s")}`
        : `t = ℓ/v = ${iznosJed(t, "s")}`;
    const r = RAZLOMAK_T[Math.round((t / P.T) * 4) / 4];
    return `t = ${iznosJed(t, "s")}${r ? ` (${r})` : ""}`;
  }
  if (s.nacin === "oznaci") {
    if (s.scena === "putujuci")
      return `dvije oznake razmaknute ${s.uze === 2 ? "λ₂" : "λ"} = ${iznosJed(s.uze === 2 ? P.lambda2 : P.lambda, "m")} (npr. dva susjedna brijega)`;
    const x = s.trazi === "cvorovi" ? cvorovi(P, P.n) : trbusi(P, P.n);
    return `${s.trazi === "cvorovi" ? "čvorovi" : "trbusi"} na x = ${x.map((q) => formatNumber(Number(q.toPrecision(6)))).join("; ")} m`;
  }
  if (s.nacin === "predvidi")
    return s.pitanja
      .map(
        (q) =>
          `${IME_KRAJA[q.kraj]}: ${IZBORI_PREDVIDI[odbijeniOblik(s.oblik ?? "brijeg", q.kraj)]}`,
      )
      .join("; ");
  if (s.nacin === "postavi") {
    const k = klizaciOd(s)[0];
    const a = analizaCilja(ciljPostavi(s), k, velicineZa(s));
    return `${String(k.oznaka).replace(/\$/g, "")} = ${withUnit(a.best, k.jedinica)}`;
  }
  if (s.nacin === "izracunaj")
    return s.pitaj
      .map((q) => {
        const r = izracun(s, q);
        return `${oznakaPitanja(q)} ${withUnit(Number(r.odgovor.toPrecision(6)), r.jedinica)}`;
      })
      .join(", ");
  return "";
}

// Točno rješenje za prikaz u widgetu (pokazi): oblik odgovora isti kao onodgovor.
export function rjesenje(s) {
  const P = parametri(s);
  if (s.nacin === "zaustavi") return tocniTrenuci(s)[0];
  if (s.nacin === "oznaci") {
    if (s.scena === "stojni")
      return s.trazi === "cvorovi" ? cvorovi(P, P.n) : trbusi(P, P.n);
    const l = s.uze === 2 ? P.lambda2 : P.lambda;
    const z = zagradeLambda(s, P, 0).find((g) => g.uze === (s.uze ?? 1));
    return z
      ? [z.od, z.do]
      : [segmentUzeta(s, P)[0], segmentUzeta(s, P)[0] + l];
  }
  if (s.nacin === "predvidi")
    return s.pitanja.map((q) => odbijeniOblik(s.oblik ?? "brijeg", q.kraj));
  if (s.nacin === "postavi") {
    const k = klizaciOd(s)[0];
    return {
      ...pocetneVrijednosti(s),
      [k.id]: analizaCilja(ciljPostavi(s), k, velicineZa(s)).best,
    };
  }
  if (s.nacin === "izracunaj")
    return s.pitaj.map((q) =>
      formatNumber(Number(izracun(s, q).odgovor.toPrecision(6))),
    );
  return null;
}

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const val_uze = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate,
  check(s, odgovor) {
    if (s.nacin === "zaustavi") return checkZaustavi(s, odgovor);
    if (s.nacin === "oznaci")
      return s.scena === "stojni"
        ? checkOznaciStojni(s, odgovor)
        : checkOznaciLambda(s, odgovor);
    if (s.nacin === "predvidi") return checkPredvidi(s, odgovor);
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor,
};
