// relativnost: specijalna teorija relativnosti (Blok Q, 1271–1285) u pet scena: postulat (svjetlost iz broda uvijek
// stiže brzinom c), svjetlosni sat (cik-cak sa Zemlje), mion u atmosferi (dva sata, pogled iz miona), brod (kontrakcija
// i dilatacija, isti faktor √(1 − v²/c²)) i energija (E₀ = mc², E = γmc², graf E/E₀). Načini: istrazi, prikaz,
// predvidi, postavi, izracunaj. Sva fizika, geometrija scena (u px okvira OKVIR), tekstovi očitanja i „što je
// skriveno“ su čiste funkcije (spec, stanje) → JSON, pa ih iOS može izvršiti i nacrtati nativno.
import {
  isNum,
  formatNumber,
  formatSci,
  parseNumber,
  near,
} from "../../core/number.js";
import { UNITS, normUnit } from "../../core/units.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  checkNumber,
  KRIVO_OPIS,
} from "../zajednicko.js";

const TIP = "relativnost";

// ── konstante (knjižica formula, str. 4–5) ───────────────────────────────────────────────────────────
export const C = 3e8; // m/s
export const C_KM = 3e5; // km/s (tipična greška)
export const EV = 1.6e-19; // J
export const CESTICE = {
  elektron: { ime: "elektron", gen: "elektrona", m: 9.11e-31, naboj: "−" },
  proton: { ime: "proton", gen: "protona", m: 1.67e-27, naboj: "+" },
};
export const BETA_MAX = 0.9999;

export const SCENE = ["postulat", "svjetlosni_sat", "mion", "brod", "energija"];
export const NACINI = {
  postulat: ["istrazi", "prikaz", "predvidi"],
  svjetlosni_sat: ["istrazi", "prikaz"],
  mion: ["istrazi", "prikaz", "izracunaj"],
  brod: ["istrazi", "prikaz", "postavi", "izracunaj"],
  energija: ["istrazi", "prikaz", "izracunaj"],
};
export const SIGNALI = {
  laser: {
    naziv: "laserski puls",
    kratko: "puls",
    opis: "Laserski puls je svjetlost",
  },
  radio: {
    naziv: "radiosignal",
    kratko: "signal",
    opis: "Radiosignal je elektromagnetski val, kao i svjetlost",
  },
  farovi: {
    naziv: "svjetlost s farova",
    kratko: "svjetlost",
    opis: "Svjetlost s farova je obična svjetlost",
  },
};
export const OKVIR = {
  postulat: { w: 360, h: 200 },
  svjetlosni_sat: { w: 360, h: 262 },
  mion: { w: 360, h: 340 },
  brod: { w: 360, h: 262 },
  energija: { w: 360, h: 300 },
};

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
export const korijen = (b) => Math.sqrt(Math.max(0, 1 - b * b));
export const gama = (b) => 1 / korijen(b);
export const dilatacija = (T0, b) => T0 * gama(b);
export const kontrakcija = (L0, b) => L0 * korijen(b);
export const betaIzKorijena = (k) => Math.sqrt(Math.max(0, 1 - k * k));
export const betaIzGame = (g) => Math.sqrt(Math.max(0, 1 - 1 / (g * g)));
export const cestica = (s) =>
  typeof s.cestica === "string"
    ? CESTICE[s.cestica]
    : s.cestica && typeof s.cestica === "object"
      ? {
          ime: s.cestica.ime,
          gen: s.cestica.gen ?? s.cestica.ime,
          m: s.cestica.m,
          naboj: "",
        }
      : null;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r1 = (n) => Math.round(n * 10) / 10;

// ── zapis brojeva ───────────────────────────────────────────────────────────────────────────────────
// β nikad ne smije izgledati kao 1 (0,9999 → „0,9999“, a ne „1“): odsijeca se, ne zaokružuje
export function fmtBeta(b, dec = 4) {
  if (!isNum(b)) return "";
  const f = 10 ** dec;
  const t = (Math.floor(b * f + 1e-9) / f).toFixed(dec);
  return t.replace(/\.?0+$/, "").replace(".", ",");
}
// β vrlo blizu 1 (energija): toliko decimala da se vidi da nije 1
export function fmtBetaBlizu(b) {
  if (b <= 0) return "0";
  const d = clamp(Math.ceil(-Math.log10(Math.max(1e-15, 1 - b))) + 1, 2, 12);
  return fmtBeta(b, d);
}
export const brojF = (n, sig = 3) => formatSci(n, sig);
export const iznos = (n, j, sig = 3) =>
  `${formatSci(n, sig)}${j ? `\u00a0${j}` : ""}`;
const uC = (b) => `${fmtBeta(b)}c`;

// ── veličine po sceni (izracunaj) ───────────────────────────────────────────────────────────────────
// vrsta jedinica: kljuc u core/units.js ili "c" / "" (bez jedinice)
export const VELICINE = {
  mion: {
    T: {
      naziv: "vrijeme života miona izmjereno sa Zemlje",
      oznaka: "T",
      vrsta: "vrijeme",
      jedinica: "µs",
    },
    s: {
      naziv: "put koji mion prijeđe (mjereno sa Zemlje)",
      oznaka: "s",
      vrsta: "duljina",
      jedinica: "m",
    },
    gama: { naziv: "Lorentzov faktor γ", oznaka: "γ", vrsta: "", jedinica: "" },
    s0: {
      naziv: "put koji bi mion prešao „klasično“, za samo T₀",
      oznaka: "s_{klas}",
      vrsta: "duljina",
      jedinica: "m",
    },
  },
  brod: {
    beta: { naziv: "brzina broda", oznaka: "v", vrsta: "c", jedinica: "c" },
    L: {
      naziv: "duljina broda izmjerena sa Zemlje",
      oznaka: "L",
      vrsta: "duljina",
      jedinica: "m",
    },
    T0: {
      naziv: "trajanje prema satu u brodu",
      oznaka: "T₀",
      vrsta: "vrijeme",
      jedinica: "min",
    },
    T: {
      naziv: "trajanje izmjereno na Zemlji",
      oznaka: "T",
      vrsta: "vrijeme",
      jedinica: "min",
    },
    gama: { naziv: "Lorentzov faktor γ", oznaka: "γ", vrsta: "", jedinica: "" },
  },
  energija: {
    E0: {
      naziv: "energija mirovanja",
      oznaka: "E₀",
      vrsta: "energija_cestice",
      jedinica: "J",
    },
    E: {
      naziv: "ukupna energija",
      oznaka: "E",
      vrsta: "energija_cestice",
      jedinica: "J",
    },
    Ek: {
      naziv: "kinetička energija",
      oznaka: "E_k",
      vrsta: "energija_cestice",
      jedinica: "J",
    },
    gama: { naziv: "omjer E / E₀ (γ)", oznaka: "γ", vrsta: "", jedinica: "" },
  },
};
const jedFaktor = (vrsta, j) =>
  UNITS[vrsta]?.find(([u]) => u === normUnit(j))?.[1] ?? null;
const DOPUSTENE = {
  vrijeme: ["s", "ms", "µs", "ns", "min", "h"],
  duljina: ["m", "km"],
  energija_cestice: ["J", "MeV", "keV", "eV"],
};
export const pitanja = (s) => (Array.isArray(s.pitaj) ? s.pitaj : []);
export const jedinicaPitanja = (s, q) => {
  const m = VELICINE[s.scena]?.[q.velicina];
  return m ? (m.vrsta && q.jedinica ? normUnit(q.jedinica) : m.jedinica) : "";
};
// gumb ·10ⁿ uz polje: odlučuje jedinica, nikad iznos odgovora. J i s su za čestice/mione po prirodi jako mali
// brojevi, a brzina u c prihvaća i m/s (≈10⁸)
export const JEDINICE_S_POTENCIJOM = ["J", "s", "c"];
export const trebaPotenciju = (s, q) =>
  JEDINICE_S_POTENCIJOM.includes(jedinicaPitanja(s, q));

// brzina broda: zadana ili iz izmjerene duljine (L = L₀√(1 − β²))
export function betaBroda(s) {
  if (isNum(s.beta)) return s.beta;
  if (isNum(s.L) && isNum(s.L0)) return betaIzKorijena(s.L / s.L0);
  return null;
}
export const jedinicaT = (s) => normUnit(s.jedinica_T ?? "min");

// Sve veličine scene u osnovnim jedinicama scene (µs, m, min, J) za zadani β.
export function fizika(s, beta) {
  const sc = s.scena;
  if (sc === "mion") {
    const b = beta ?? s.beta;
    const T0 = s.T0 ?? 2.2;
    const T = dilatacija(T0, b);
    return {
      beta: b,
      v: b * C,
      korijen: korijen(b),
      gama: gama(b),
      T0,
      T,
      s: b * C * T * 1e-6,
      s0: b * C * T0 * 1e-6,
    };
  }
  if (sc === "brod") {
    const b = beta ?? betaBroda(s) ?? 0;
    const k = korijen(b);
    const out = { beta: b, v: b * C, korijen: k, gama: 1 / k, L0: s.L0 };
    out.L = s.L0 * k;
    if (isNum(s.T)) {
      out.T = s.T;
      out.T0 = s.T * k;
    } else {
      out.T0 = isNum(s.T0) ? s.T0 : 30;
      out.T = out.T0 / k;
    }
    return out;
  }
  if (sc === "energija") {
    const b = beta ?? s.beta ?? 0;
    const c = cestica(s);
    const g = gama(b);
    const E0 = c.m * C * C;
    return {
      beta: b,
      v: b * C,
      gama: g,
      korijen: 1 / g,
      m: c.m,
      E0,
      E: g * E0,
      Ek: (g - 1) * E0,
    };
  }
  const b = beta ?? s.beta ?? 0;
  return { beta: b, v: b * C, korijen: korijen(b), gama: gama(b) };
}

// ── postulat: brod ispali puls prema Zemlji ─────────────────────────────────────────────────────────
// x: lijevi kraj broda (odatle izlazi puls, uvijek prema Zemlji lijevo); vremena u sekundama animacije
export const P_DETEKTOR = 62;
export const P_PREDTRK = 0.6;
export function postulatPostava(s, beta = s.beta, smjer = s.smjer) {
  const od = smjer === "od";
  const x0 = od ? 150 : 250;
  const D = x0 - P_DETEKTOR;
  const tStvarno = 2.2;
  const vc = D / tStvarno;
  const duhBrzina = od ? 1 - beta : 1 + beta; // u c, „da se brzine zbrajaju“
  const tDuh = tStvarno / Math.max(1e-6, duhBrzina);
  return {
    x0,
    D,
    vc,
    tStvarno,
    duhBrzina,
    tDuh,
    kraj: Math.min(Math.max(tStvarno, tDuh) + 0.5, tStvarno * 2.4),
    predtrk: P_PREDTRK,
  };
}
// t: vrijeme od ispaljivanja (s animacije; negativno = brod još leti prije ispaljivanja; null = ne ispaljuje)
export function postulatStanje(s, t, beta = s.beta, smjer = s.smjer) {
  const p = postulatPostava(s, beta, smjer);
  const dir = smjer === "od" ? 1 : -1;
  const tt = t ?? 0;
  const brodX = clamp(p.x0 + dir * beta * p.vc * tt, 92, 300);
  const ispaljen = t != null && t >= 0;
  const pulsX = ispaljen ? Math.max(P_DETEKTOR, p.x0 - p.vc * t) : null;
  const duhX = ispaljen
    ? Math.max(P_DETEKTOR, p.x0 - p.vc * p.duhBrzina * t)
    : null;
  const stigao = ispaljen && t >= p.tStvarno;
  const duhStigao = ispaljen && t >= p.tDuh;
  return {
    brod: {
      x: r1(brodX),
      y: 92,
      w: 58,
      h: 26,
      gleda: smjer === "od" ? "desno" : "lijevo",
    },
    detektor: { x: P_DETEKTOR, y: 105 },
    puls: ispaljen ? { x: r1(pulsX), y: 100, stigao } : null,
    duh: ispaljen ? { x: r1(duhX), y: 128, stigao: duhStigao } : null,
    izmjereno: stigao ? "c = 3·10⁸ m/s" : null,
    oznake: {
      brod: `v = ${uC(beta)}`,
      puls: "stvarno: c",
      duh: `da se brzine zbrajaju: ${formatNumber(p.duhBrzina)}c`,
    },
    kraj: p.kraj,
  };
}
// redoslijed ponuđenih brzina: deterministički iz speca (β, smjer, signal), da točna nije uvijek u sredini.
// Jednostavna cjelobrojna formula, da je iOS može ponoviti.
export const POREDAK_POSTULATA = [
  [0, 1, 2],
  [1, 0, 2],
  [0, 2, 1],
  [2, 0, 1],
  [1, 2, 0],
  [2, 1, 0],
];
export function indeksPoretka(s) {
  const sig = Math.max(0, Object.keys(SIGNALI).indexOf(s.signal ?? "laser"));
  const k =
    Math.round((s.beta ?? 0) * 100) + (s.smjer === "od" ? 4 : 0) + 2 * sig + 2;
  return ((k % 6) + 6) % 6;
}
export function opcijePostulata(s) {
  const sve = [
    { id: "razlika", tekst: `${formatNumber(1 - s.beta)}c`, iznos: 1 - s.beta },
    { id: "c", tekst: "c", iznos: 1 },
    { id: "zbroj", tekst: `${formatNumber(1 + s.beta)}c`, iznos: 1 + s.beta },
  ];
  return POREDAK_POSTULATA[indeksPoretka(s)]
    .map((i) => sve[i])
    .map((o) => ({
      ...o,
      opis:
        o.id === "c"
          ? "c = 3·10⁸ m/s"
          : `${o.tekst} = ${brojF(o.iznos * C)} m/s`,
    }));
}
function checkPredvidi(s, odgovor) {
  const id = typeof odgovor === "string" ? odgovor : odgovor?.id;
  if (!id)
    return { tocno: false, poruka: "Odaberi jednu brzinu.", prazno: true };
  if (id === "c") return { tocno: true };
  const sig = SIGNALI[s.signal ?? "laser"];
  // poruka objašnjava načelo, ali ne imenuje točnu brzinu (isti zadatak se ponovi nakon krivog odgovora)
  const post = `${sig.opis}, a za svjetlost klasično zbrajanje i oduzimanje brzina ne vrijedi. Sjeti se drugog postulata STR: ovisi li brzina svjetlosti u vakuumu o tome kako se gibaju izvor i promatrač?`;
  const od = s.smjer === "od";
  if (id === "zbroj")
    return {
      tocno: false,
      poruka: od
        ? `Brod se udaljava od Zemlje, pa bi se i „klasično“ brzine oduzimale, a ne zbrajale. ${post}`
        : `Tako bi bilo za loptu bačenu naprijed iz autobusa (50 + 10 = 60 km/h). ${post}`,
    };
  if (id === "razlika")
    return {
      tocno: false,
      poruka: od
        ? `Tako bi bilo za loptu bačenu unatrag iz autobusa (50 − 10 = 40 km/h). ${post}`
        : `Brod leti prema Zemlji, pa bi se „klasično“ brzine zbrajale, a ne oduzimale. ${post}`,
    };
  return {
    tocno: false,
    poruka: "Odaberi jednu od ponuđenih brzina.",
    prazno: true,
  };
}

// ── svjetlosni sat ──────────────────────────────────────────────────────────────────────────────────
// Mjerilo: razmak zrcala H px, c = 2H px/s, pa jedan tik (gore i dolje) sata u mirovanju traje 1 s animacije.
export const SAT = {
  H: 70,
  brodY: 34,
  zemljaY: 168,
  sirina: 60,
  cPx: 140,
  zemljaX: 52,
};
const SAT_PERIOD = 360 + 120;
const trokut = (u) => {
  const f = u - Math.floor(u);
  return f < 0.5 ? 2 * f : 2 - 2 * f; // 0 → 1 → 0 (dolje → gore → dolje)
};
export function satStanje(s, t, beta = s.beta ?? 0.6, pogled = "zemlja") {
  const { H, brodY, zemljaY, sirina, cPx, zemljaX } = SAT;
  const T0 = (2 * H) / cPx;
  const g = gama(beta);
  const vPx = beta * cPx;
  const yFot = (y0, f) => y0 + H - f * H; // f = 0 donje zrcalo, 1 gornje
  const zvijezde = Array.from({ length: 22 }, (_, i) => ({
    x: (i * 97 + 31) % 360,
    y: 12 + ((i * 53) % 130),
    r: i % 3 === 0 ? 1.4 : 0.9,
  }));
  if (pogled === "brod") {
    const pom = (vPx * t) % 360;
    return {
      pogled,
      brod: { x: 180, y: brodY, h: H, w: sirina },
      foton: { x: 180, y: r1(yFot(brodY, trokut(t / T0))) },
      trag: [],
      zemlja: null,
      zvijezde: zvijezde.map((z) => ({
        ...z,
        x: r1((((z.x - pom) % 360) + 360) % 360),
      })),
      tikovi: { brod: Math.floor(t / T0 + 1e-9), zemlja: null },
      tik: { brod: T0, zemlja: T0 },
    };
  }
  // pogled sa Zemlje: brod klizi udesno i kruži preko ruba; foton u brodu ide cik-cak
  const u = 60 + vPx * t;
  const xs =
    beta > 0 ? ((((u + 60) % SAT_PERIOD) + SAT_PERIOD) % SAT_PERIOD) - 60 : 180;
  const tPocetak = beta > 0 ? t - (xs + 60) / vPx : 0;
  const tikB = g * T0;
  const trag = [];
  const od = Math.max(0, tPocetak);
  for (let m = Math.ceil((od * 2) / tikB - 1e-9); (m * tikB) / 2 < t; m++) {
    const tau = (m * tikB) / 2;
    trag.push([r1(xs - vPx * (t - tau)), r1(yFot(brodY, trokut(tau / tikB)))]);
  }
  const yB = yFot(brodY, trokut(t / tikB));
  trag.push([r1(xs), r1(yB)]);
  return {
    pogled,
    brod: { x: r1(xs), y: brodY, h: H, w: sirina },
    foton: { x: r1(xs), y: r1(yB) },
    trag,
    zemlja: {
      x: zemljaX,
      y: zemljaY,
      h: H,
      w: sirina,
      foton: { x: zemljaX, y: r1(yFot(zemljaY, trokut(t / T0))) },
    },
    zvijezde,
    tikovi: {
      brod: Math.floor(t / tikB + 1e-9),
      zemlja: Math.floor(t / T0 + 1e-9),
    },
    tik: { brod: tikB, zemlja: T0 },
  };
}

// ── mion ────────────────────────────────────────────────────────────────────────────────────────────
// Atmosfera od y = MION.vrh (visina nastanka) do MION.tlo; t u µs (zemaljsko vrijeme, ili vlastito u pogledu iz miona).
export const MION = {
  vrh: 26,
  tlo: 314,
  x: 92,
  duhX: 160,
  lijevo: 30,
  desno: 214,
  satX: 294,
};
export const visinaMiona = (s) => (isNum(s.visina) ? s.visina : 15); // km
export function mionTrajanje(s, beta = s.beta, pogled = "zemlja") {
  const f = fizika({ ...s, scena: "mion" }, beta);
  const h = visinaMiona(s) * 1000;
  // mion stigne do tla prije raspada?
  if (pogled === "mion") return Math.min(f.T0, h / f.gama / f.v / 1e-6);
  return Math.min(f.T, h / f.v / 1e-6);
}
export function mionStanje(s, t, beta = s.beta, pogled = "zemlja") {
  const f = fizika({ ...s, scena: "mion" }, beta);
  const h = visinaMiona(s) * 1000; // m
  const px = (MION.tlo - MION.vrh) / h;
  const vMus = f.v * 1e-6; // m po µs
  const korak = h >= 12000 ? 5 : h >= 6000 ? 2 : 1; // km između oznaka
  if (pogled === "mion") {
    // mion miruje; atmosfera (skraćena γ puta) juri prema gore brzinom v; t je mionovo vlastito vrijeme
    const tm = Math.min(t, mionTrajanje(s, beta, "mion"));
    const pomak = vMus * tm; // m (u sustavu miona)
    const yM = MION.vrh + 14;
    const yZaVisinu = (km) => yM + ((h - km * 1000) / f.gama - pomak) * px;
    const oznake = [];
    for (let km = 0; km <= h / 1000 + 1e-9; km += korak)
      oznake.push({ y: r1(yZaVisinu(km)), tekst: `${formatNumber(km)} km` });
    const tlo = yZaVisinu(0);
    const raspad = t >= f.T0 - 1e-12;
    return {
      pogled,
      mion: {
        x: MION.x,
        y: yM,
        raspadnut: raspad && tlo > yM + 0.5,
        naTlu: tlo <= yM + 0.5,
      },
      duh: null,
      tlo: r1(Math.max(yM, tlo)),
      vrh: r1(yZaVisinu(h / 1000)),
      oznake,
      satovi: { mion: tm, zemlja: null },
      put: Math.min(pomak * f.gama, h),
      skraceno: h / f.gama,
    };
  }
  const tz = Math.min(t, mionTrajanje(s, beta));
  const dol = Math.min(h, vMus * tz);
  const tDuh = Math.min(t, f.T0);
  const oznake = [];
  for (let km = 0; km <= h / 1000 + 1e-9; km += korak)
    oznake.push({
      y: r1(MION.tlo - km * 1000 * px),
      tekst: `${formatNumber(km)} km`,
    });
  return {
    pogled,
    mion: {
      x: MION.x,
      y: r1(MION.vrh + dol * px),
      raspadnut: t >= f.T - 1e-12 && f.s < h,
      naTlu: f.s >= h && vMus * t >= h,
    },
    duh: {
      x: MION.duhX,
      y: r1(MION.vrh + Math.min(h, vMus * tDuh) * px),
      raspadnut: t >= f.T0 - 1e-12,
    },
    tlo: MION.tlo,
    vrh: MION.vrh,
    oznake,
    satovi: { mion: tz / f.gama, zemlja: tz },
    put: dol,
    skraceno: h / f.gama,
  };
}

// ── brod ────────────────────────────────────────────────────────────────────────────────────────────
// Brod leti udesno iznad ravnala na Zemlji. Mirni brod je dug BROD.dulj px; ravnalo je u istom mjerilu.
export const BROD = {
  dulj: 190,
  y: 50,
  h: 30,
  ravnaloY: 112,
  satY: 206,
  satR: 36,
};
const lijepiKorak = (raspon, najvise) => {
  for (const k of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000])
    if (raspon / k <= najvise) return k;
  return 1000;
};
// p: 0…1 položaj petlje leta; vidljivo: smije li se brod skratiti (inače se crta u vlastitoj duljini)
export function brodStanje(s, beta, p = 0.5, skratiti = true) {
  const pxm = BROD.dulj / s.L0;
  const k = skratiti ? korijen(beta) : 1;
  const w = BROD.dulj * k;
  const raspon = 360 / pxm;
  const korak = lijepiKorak(raspon, 9);
  const ravnalo = [];
  for (let m = 0; m * pxm <= 352; m += korak)
    ravnalo.push({ x: r1(8 + m * pxm), tekst: formatNumber(m) });
  // nos broda putuje od x = w + 10 do x = 352 (pa ponovo)
  const nos = 18 + w + (334 - 18 - w) * p;
  return {
    brod: { nos: r1(nos), rep: r1(nos - w), y: BROD.y, h: BROD.h, k },
    obris: { nos: r1(nos), rep: r1(nos - BROD.dulj) },
    ravnalo,
    ravnaloY: BROD.ravnaloY,
    mjerilo: pxm,
    nula: 8,
  };
}
// kazaljka sata: minute → kut (° od 12 h, kao kazaljka)
export const kutKazaljke = (min) => ((min % 60) / 60) * 360;
export function satoviBroda(s, beta, p) {
  const f = fizika(s, beta);
  return { brod: f.T0 * p, zemlja: f.T * p, T0: f.T0, T: f.T };
}

// ── energija ────────────────────────────────────────────────────────────────────────────────────────
export const ENERGIJA = {
  cijev: { x1: 14, x2: 346, y: 24 },
  stupac: { x: 30, w: 52, vrh: 90, dno: 284 },
  mjerac: { x1: 140, x2: 340, y: 98 },
  graf: { x1: 158, x2: 340, y1: 146, y2: 268 },
};
const lijepiVrh = (g) => {
  for (const m of [
    2, 3, 5, 8, 10, 15, 20, 30, 50, 100, 200, 500, 1000, 5000, 1e4,
  ])
    if (g <= m * 0.92) return m;
  return Math.ceil(g / 1e4) * 1e4;
};
// gamma: E/E₀ (istrazi: 1 + n·obrok)
export function energijaStanje(s, g) {
  const E = ENERGIJA;
  const b = betaIzGame(g);
  const vrh = lijepiVrh(Math.max(g, 1.4));
  const st = E.stupac;
  const hE0 = (st.dno - st.vrh) / vrh;
  const yMax = Math.max(5, lijepiVrh(g * 1.1));
  const G = E.graf;
  const gx = (x) => G.x1 + x * (G.x2 - G.x1);
  const gy = (y) => G.y2 - (y / yMax) * (G.y2 - G.y1);
  const krivulja = [];
  for (let i = 0; i <= 80; i++) {
    const x = (1 - (1 - i / 80) ** 2) * 0.99999; // gušće uz c
    const y = 1 / Math.sqrt(1 - x * x);
    if (y > yMax) {
      krivulja.push([r1(gx(Math.sqrt(1 - 1 / (yMax * yMax)))), G.y1]);
      break;
    }
    krivulja.push([r1(gx(x)), r1(gy(y))]);
  }
  const oznakeY = [];
  const kY = yMax <= 5 ? 1 : yMax <= 10 ? 2 : yMax / 5;
  for (let y = 0; y <= yMax + 1e-9; y += kY)
    oznakeY.push({ y: r1(gy(y)), tekst: formatNumber(y) });
  return {
    beta: b,
    betaTekst: fmtBetaBlizu(b),
    stupac: {
      x: st.x,
      w: st.w,
      dno: st.dno,
      vrhE0: r1(st.dno - hE0),
      vrhE: r1(Math.max(st.vrh, st.dno - hE0 * g)),
      vrh,
      oznake: [0, vrh / 2, vrh].map((v) => ({
        y: r1(st.dno - v * hE0),
        tekst: `${formatNumber(v)} E₀`,
      })),
    },
    mjerac: {
      x: r1(E.mjerac.x1 + b * (E.mjerac.x2 - E.mjerac.x1)),
      ...E.mjerac,
    },
    graf: {
      ...G,
      yMax,
      krivulja,
      oznakeY,
      tocka: g <= yMax ? { x: r1(gx(b)), y: r1(gy(g)) } : null,
      asimptota: r1(gx(1)),
    },
  };
}

// ── izracunaj: točne i tipične krive vrijednosti ────────────────────────────────────────────────────
function osnovno(s, q) {
  const f = fizika(s);
  const sc = s.scena;
  const b = f.beta;
  const v = q.velicina;
  const k = f.korijen;
  const W = []; // [vrijednost u osnovnoj jedinici, poruka]
  const iza =
    "Ako ti ispadne da promatrač koji miruje izmjeri **kraće** vrijeme od sata koji putuje s tijelom, nešto nije u redu.";
  if (sc === "mion") {
    if (v === "T") {
      W.push([
        f.T0 * k,
        `To je T₀·√(1 − v²/c²): pomnožio si umjesto podijelio. Sat na Zemlji (u mirovanju) mjeri **dulje** vrijeme od mionova sata. ${iza}`,
      ]);
      W.push([
        f.T0,
        "To je vlastito vrijeme miona T₀ (mjeri ga sat koji leti s mionom). Traži se vrijeme izmjereno sa Zemlje: T = T₀ / √(1 − v²/c²).",
      ]);
      W.push([
        f.T0 / (1 - b * b),
        "Zaboravio si korijen: u nazivniku je √(1 − v²/c²), a ne 1 − v²/c².",
      ]);
      W.push([
        f.T0 / Math.sqrt(1 - b),
        "Brzinu treba kvadrirati: pod korijenom je 1 − (v/c)² = 1 − " +
          `${formatNumber(b)}², a ne 1 − ${formatNumber(b)}.`,
      ]);
      W.push([
        f.T0 * f.gama * 1e-6,
        "To je vrijeme u sekundama, a polje traži µs.",
      ]);
      return { vrijednost: f.T, W };
    }
    if (v === "s" || v === "s0") {
      const prava = v === "s" ? f.s : f.s0;
      if (v === "s") {
        W.push([
          f.s0,
          "To je put za vlastito vrijeme T₀. Brzinu miona mjeri promatrač na Zemlji, pa i vrijeme mora biti zemaljsko: s = v·T.",
        ]);
        W.push([
          b * C * f.T0 * k * 1e-6,
          "Uvrstio si krivo vrijeme: sa Zemlje mion živi **dulje** (T = T₀ / √(1 − v²/c²)), pa je put s = v·T.",
        ]);
      } else
        W.push([
          f.s,
          "To je stvarni put, za zemaljsko vrijeme T. „Klasično“ bi mion živio samo T₀, pa s = v·T₀.",
        ]);
      W.push([prava * 1e6, "Vrijeme nisi pretvorio u sekunde: µs = 10⁻⁶ s."]);
      W.push([prava / C, "Zaboravio si brzinu pomnožiti s c = 3·10⁸ m/s."]);
      return { vrijednost: prava, W };
    }
    if (v === "gama") {
      W.push([
        k,
        "To je √(1 − v²/c²), a γ je njegova recipročna vrijednost: γ = 1/√(1 − v²/c²) i uvijek je veći od 1.",
      ]);
      W.push([1 / (1 - b * b), "Zaboravio si korijen: γ = 1/√(1 − v²/c²)."]);
      return { vrijednost: f.gama, W };
    }
  }
  if (sc === "brod") {
    const omjer = isNum(s.L) ? s.L / s.L0 : null;
    if (v === "beta") {
      if (omjer != null) {
        W.push([
          omjer,
          `${formatNumber(omjer)} je omjer L/L₀ = √(1 − v²/c²), a ne v/c. Iz njega tek treba izvući v: v = c·√(1 − (L/L₀)²).`,
        ]);
        W.push([
          1 - omjer,
          "Provjeri izvod: omjer L/L₀ najprije kvadriraj, oduzmi od 1 i tek onda korjenuj.",
        ]);
        W.push([
          1 - omjer * omjer,
          "Zaboravio si korijen na kraju: v²/c² = 1 − (L/L₀)², pa je v/c = √(1 − (L/L₀)²).",
        ]);
        W.push([
          omjer * omjer,
          "Provjeri izvod: v²/c² = 1 − (L/L₀)², a ne (L/L₀)².",
        ]);
      }
      W.push([
        b * C_KM,
        "To je brzina u km/s. Upiši je kao dio brzine svjetlosti (npr. 0,8 za 0,8c) ili u m/s.",
      ]);
      return { vrijednost: b, W };
    }
    if (v === "L") {
      W.push([
        s.L0 / k,
        "Brod u gibanju je **kraći**, a ne dulji: L = L₀·√(1 − v²/c²).",
      ]);
      W.push([
        s.L0 * (1 - b * b),
        "Zaboravio si korijen: L = L₀·√(1 − v²/c²).",
      ]);
      W.push([
        s.L0 * Math.sqrt(1 - b),
        "Brzinu treba kvadrirati: pod korijenom je 1 − (v/c)².",
      ]);
      W.push([
        s.L0,
        "To je duljina broda dok miruje. Promatrač pokraj kojeg brod proleti izmjeri ga kraćim.",
      ]);
      W.push([s.L0 * b, "Pomnožio si s v/c, a treba s √(1 − v²/c²)."]);
      return { vrijednost: f.L, W };
    }
    if (v === "T0" || v === "T") {
      const trazi0 = v === "T0";
      const dano = trazi0 ? f.T : f.T0;
      const prava = trazi0 ? f.T0 : f.T;
      W.push([
        trazi0 ? f.T / k : f.T0 * k,
        trazi0
          ? "Pomnožio si s γ, a sat u brodu (vlastito vrijeme) mjeri **kraće** od satova na Zemlji: T₀ = T·√(1 − v²/c²)."
          : `Podijelio si krivo: satovi na Zemlji mjere **dulje** od sata u brodu, T = T₀ / √(1 − v²/c²). ${iza}`,
      ]);
      W.push([
        dano,
        trazi0
          ? "To je vrijeme izmjereno na Zemlji. Sat u brodu putuje s astronautom i mjeri kraće vrijeme: T₀ = T·√(1 − v²/c²)."
          : "To je vrijeme prema satu u brodu. Na Zemlji se izmjeri dulje: T = T₀ / √(1 − v²/c²).",
      ]);
      W.push([
        trazi0 ? f.T * (1 - b * b) : f.T0 / (1 - b * b),
        "Zaboravio si korijen: faktor je √(1 − v²/c²), a ne 1 − v²/c².",
      ]);
      W.push([
        trazi0 ? f.T * Math.sqrt(1 - b) : f.T0 / Math.sqrt(1 - b),
        "Brzinu treba kvadrirati: pod korijenom je 1 − (v/c)².",
      ]);
      W.push([
        trazi0 ? f.T * b : f.T0 / b,
        "Uvrstio si v/c umjesto √(1 − v²/c²).",
      ]);
      return { vrijednost: prava, W, osnovna: jedinicaT(s) };
    }
    if (v === "gama") {
      W.push([
        k,
        "To je √(1 − v²/c²), a γ = 1/√(1 − v²/c²) je uvijek veći od 1.",
      ]);
      W.push([1 / (1 - b * b), "Zaboravio si korijen: γ = 1/√(1 − v²/c²)."]);
      return { vrijednost: f.gama, W };
    }
  }
  if (sc === "energija") {
    const c = cestica(s);
    const drugi =
      s.cestica === "elektron"
        ? CESTICE.proton
        : s.cestica === "proton"
          ? CESTICE.elektron
          : null;
    if (v === "E0") {
      W.push([
        c.m * C,
        "Zaboravio si kvadrat: E₀ = m·c², a c² = (3·10⁸)² = 9·10¹⁶ m²/s².",
      ]);
      W.push([
        c.m * C_KM * C_KM,
        "Uvrstio si c u km/s. U formulu ide c = 3·10⁸ **m/s**, pa energija izađe u džulima.",
      ]);
      if (drugi)
        W.push([
          drugi.m * C * C,
          `To je energija mirovanja ${drugi.gen}. Uzmi masu ${c.gen}: ${brojF(c.m)} kg.`,
        ]);
      W.push([
        (c.m * C * C) / 2,
        "Energija mirovanja je E₀ = m·c², bez ½ (to nije kinetička energija).",
      ]);
      return { vrijednost: f.E0, W };
    }
    if (v === "E") {
      W.push([
        f.E0 * f.korijen,
        "Ukupna energija mora biti **veća** od energije mirovanja: E₀ se **dijeli** s √(1 − v²/c²), a ne množi.",
      ]);
      W.push([
        f.E0,
        "To je energija mirovanja (v = 0). Čestica se giba, pa joj je ukupna energija veća: E = E₀ / √(1 − v²/c²).",
      ]);
      W.push([
        0.5 * c.m * f.v * f.v,
        "To je klasična kinetička energija ½mv². Ukupna relativistička energija je E = mc² / √(1 − v²/c²).",
      ]);
      W.push([
        c.m * f.v * f.v,
        "To je m·v². Ukupna energija je E = mc² / √(1 − v²/c²): u brojniku je c², a ne v².",
      ]);
      W.push([
        f.E0 / (1 - b * b),
        "Zaboravio si korijen: E = mc² / √(1 − v²/c²).",
      ]);
      W.push([
        f.E0 / Math.sqrt(1 - b),
        "Brzinu treba kvadrirati: pod korijenom je 1 − (v/c)².",
      ]);
      W.push([f.E0 / b, "Podijelio si s v/c, a treba s √(1 − v²/c²)."]);
      W.push([
        f.Ek,
        "To je kinetička energija E − E₀. Traži se ukupna energija E = E₀ + E_k.",
      ]);
      W.push([
        f.E * 1e-6,
        "Uvrstio si c u km/s. U formulu ide c = 3·10⁸ **m/s**.",
      ]);
      if (drugi)
        W.push([
          drugi.m * C * C * f.gama,
          `To bi bila energija ${drugi.gen}. Uzmi masu ${c.gen}: ${brojF(c.m)} kg.`,
        ]);
      return { vrijednost: f.E, W };
    }
    if (v === "Ek") {
      W.push([
        f.E,
        "To je ukupna energija. Kinetička je ono što je dodano energiji mirovanja: E_k = E − E₀.",
      ]);
      W.push([
        0.5 * c.m * f.v * f.v,
        "To je klasična formula ½mv², koja pri brzinama blizu c ne vrijedi. E_k = E − E₀.",
      ]);
      W.push([f.E0, "To je energija mirovanja. E_k = E − E₀."]);
      return { vrijednost: f.Ek, W };
    }
    if (v === "gama") {
      W.push([
        1 / f.gama,
        "To je √(1 − v²/c²). Omjer E/E₀ = 1/√(1 − v²/c²) je uvijek veći od 1.",
      ]);
      W.push([1 / (1 - b * b), "Zaboravio si korijen: E/E₀ = 1/√(1 − v²/c²)."]);
      return { vrijednost: f.gama, W };
    }
  }
  return null;
}

// Točan iznos u jedinici pitanja, tolerancija i tipične krive vrijednosti (bez onih koje su preblizu točnoj).
export function izracun(s, q) {
  const m = VELICINE[s.scena][q.velicina];
  const r = osnovno(s, q);
  const J = jedinicaPitanja(s, q);
  // osnovne jedinice: mion µs i m; brod m i jedinica_T; energija J
  const baza =
    m.vrsta === "vrijeme"
      ? (r.osnovna ?? "µs")
      : m.vrsta === "duljina"
        ? "m"
        : m.vrsta === "energija_cestice"
          ? "J"
          : null;
  const u = (x) =>
    baza && J ? (x * jedFaktor(m.vrsta, baza)) / jedFaktor(m.vrsta, J) : x;
  const vrijednost = u(r.vrijednost);
  const tol = isNum(q.tolerancija)
    ? q.tolerancija
    : Math.abs(vrijednost) * 0.01;
  const krivo = [];
  const dodaj = (x, poruka) => {
    if (!isNum(x) || !Number.isFinite(x) || x === 0) return;
    if (near(x, vrijednost, tol * 1.5)) return;
    if (krivo.some((o) => near(o.vrijednost, x, Math.abs(x) * 0.004))) return;
    krivo.push({ vrijednost: x, poruka, tolerancija: Math.abs(x) * 0.006 });
  };
  for (const kr of q.krivo ?? []) krivo.push(kr);
  for (const [x, p] of r.W) dodaj(u(x), p);
  // jedinice: nepretvoren iznos (u osnovnoj jedinici) i obrnuta pretvorba
  if (baza && J && J !== baza) {
    const fJ = jedFaktor(m.vrsta, J) / jedFaktor(m.vrsta, baza);
    dodaj(r.vrijednost, `To je iznos u ${baza}, a polje traži ${J}.`);
    dodaj(
      r.vrijednost * fJ,
      `Pretvorbu jedinica provjeri: iz ${baza} u ${J} si pretvorio u krivom smjeru.`,
    );
  }
  if (m.vrsta === "energija_cestice" && J === "J") {
    dodaj(r.vrijednost / EV, "To je iznos u eV, a polje traži džule.");
    dodaj(r.vrijednost / 1.6e-13, "To je iznos u MeV, a polje traži džule.");
  }
  if (m.vrsta === "duljina" && J === "m")
    dodaj(
      r.vrijednost / 1000,
      "To je put u kilometrima (c = 3·10⁵ km/s). Polje traži metre: 1 km = 1000 m.",
    );
  if (m.vrsta === "duljina" && J === "km")
    dodaj(r.vrijednost, "To je put u metrima, a polje traži kilometre.");
  return {
    vrijednost,
    jedinica: J,
    oznaka: m.oznaka,
    naziv: q.naziv ?? m.naziv,
    tol,
    krivo,
  };
}

export function checkPolje(s, i, input) {
  const q = pitanja(s)[i];
  const r = izracun(s, q);
  let ulaz = input;
  if (q.velicina === "beta") {
    // brzina broda: kao dio c („0,8“, „0,8c“) ili u m/s („2,4·10^8“)
    const t = String(input ?? "")
      .trim()
      .replace(/\s*c$/i, "");
    let n = parseNumber(t, "m/s");
    if (n != null && n >= 1e6) n /= C;
    ulaz = n ?? input;
  }
  return checkNumber({
    input: ulaz,
    answer: r.vrijednost,
    tol: r.tol,
    unit: r.jedinica === "c" ? "" : r.jedinica,
    krivo: r.krivo,
    savjet: q.savjet ?? s.savjet,
  });
}
function checkIzracunaj(s, odgovor) {
  const q = pitanja(s);
  const ul = Array.isArray(odgovor) ? odgovor : [odgovor];
  if (q.some((_, i) => !String(ul[i] ?? "").trim()))
    return {
      tocno: false,
      poruka: q.length > 1 ? "Upiši broj u svako polje." : "Upiši broj.",
      prazno: true,
    };
  for (let i = 0; i < q.length; i++) {
    const r = checkPolje(s, i, ul[i]);
    if (!r.tocno)
      return {
        ...r,
        polje: i,
        poruka: q.length > 1 ? `U ${i + 1}. polju: ${r.poruka}` : r.poruka,
      };
  }
  return { tocno: true };
}

// ── postavi (brod): namjesti brzinu ─────────────────────────────────────────────────────────────────
export const korakPostavi = (s) => (isNum(s.korak) ? s.korak : 0.001);
// relativna tolerancija ciljanog omjera √(1 − β²) (0,5 %): apsolutna bi za brze ciljeve (mali omjer) bila
// 10–20 % široka
export const TOL_FAKTORA = 0.005;
// najveća brzina klizača u postavi: ista za klizač, zaokruživanje i provjeru ostvarivosti cilja
export const BETA_MAX_POSTAVI = 0.999;
// ciljani faktor √(1 − β²) iz cilja
export function ciljaniFaktor(s) {
  const c = s.cilj ?? {};
  if (c.velicina === "L") return c.vrijednost / s.L0;
  if (c.velicina === "T0") return c.vrijednost / s.T;
  if (c.velicina === "T") return s.T0 / c.vrijednost;
  return null;
}
// točna brzina (bez zaokruživanja) i najbliži položaj klizača
export const betaCilja = (s) => betaIzKorijena(ciljaniFaktor(s));
export const tocnaBeta = (s) => {
  const kk = korakPostavi(s);
  return Math.round(betaCilja(s) / kk) * kk;
};
// Točno: omjer unutar ±0,5 % ciljanog ILI brzina najviše jedan korak klizača od točne. Za brze ciljeve
// (omjer < ~0,5) ±0,5 % omjera bude uže od jednog koraka, pa bi točno izračunata β zaokružena na korak
// (npr. na 3 decimale) mogla pasti. Oba susjedna položaja točne β su prihvaćena; ostvarivost cilja
// (tocnaBeta ≤ BETA_MAX_POSTAVI) i dalje provjerava validate.
export const ostvarujeCilj = (s, b) => {
  const kz = ciljaniFaktor(s);
  if (Math.abs(korijen(b) - kz) <= TOL_FAKTORA * kz + 1e-12) return true;
  return Math.abs(b - betaCilja(s)) <= korakPostavi(s) * (1 + 1e-9);
};
// što bi promatrač izmjerio uz brzinu b (za poruke i za otkrivanje nakon provjere)
export function ishodPostavi(s, b) {
  const f = fizika(s, b);
  const c = s.cilj;
  const vr = c.velicina === "L" ? f.L : c.velicina === "T0" ? f.T0 : f.T;
  const J = c.velicina === "L" ? "m" : jedinicaT(s);
  return { vrijednost: vr, jedinica: J, tekst: iznos(vr, J) };
}
function checkPostavi(s, odgovor) {
  const b = isNum(odgovor) ? odgovor : odgovor?.beta;
  if (!isNum(b))
    return {
      tocno: false,
      poruka: "Namjesti brzinu broda klizačem.",
      prazno: true,
    };
  if (ostvarujeCilj(s, b)) return { tocno: true };
  const kz = ciljaniFaktor(s);
  const is = ishodPostavi(s, b);
  const sto = {
    L: "promatrač bi izmjerio da je brod dug",
    T0: "sat u brodu bi pokazao",
    T: "na Zemlji bi se izmjerilo",
  }[s.cilj.velicina];
  const blizu = (x) => Math.abs(b - x) <= 0.004;
  const kr = (s.krivo ?? []).find(
    (x) => isNum(x.vrijednost) && Math.abs(x.vrijednost - b) <= 0.004,
  );
  if (kr) return { tocno: false, poruka: kr.poruka };
  if (blizu(kz))
    return {
      tocno: false,
      poruka: `Uz ${uC(b)} ${sto} ${is.tekst}. ${formatNumber(kz)} je omjer ${s.cilj.velicina === "L" ? "L/L₀" : "T₀/T"} = √(1 − v²/c²), a ne v/c: iz njega tek treba izračunati brzinu.`,
    };
  if (blizu(1 - kz * kz))
    return {
      tocno: false,
      poruka: `Uz ${uC(b)} ${sto} ${is.tekst}. Zaboravio si korijen: v²/c² = 1 − ${formatNumber(kz)}², pa je v/c = √(1 − ${formatNumber(kz)}²).`,
    };
  if (blizu(1 - kz) || blizu(kz * kz))
    return {
      tocno: false,
      poruka: `Uz ${uC(b)} ${sto} ${is.tekst}. Provjeri izvod: omjer kvadriraj, oduzmi od 1, pa korjenuj.`,
    };
  const vel = s.cilj.velicina;
  const previse = is.vrijednost > s.cilj.vrijednost;
  const povecaj = vel === "T" ? !previse : previse;
  const opis =
    vel === "L"
      ? previse
        ? "brod je još predug"
        : "brod je prekratak"
      : previse
        ? "to je previše"
        : "to je premalo";
  const formula = {
    L: "L = L₀·√(1 − v²/c²)",
    T0: "T₀ = T·√(1 − v²/c²)",
    T: "T = T₀ / √(1 − v²/c²)",
  }[vel];
  return {
    tocno: false,
    poruka: `Uz ${uC(b)} ${sto} ${is.tekst}: ${opis}, pa ${povecaj ? "povećaj" : "smanji"} brzinu. Brzinu izračunaj iz ${formula}.`,
  };
}

// ── što se smije vidjeti ────────────────────────────────────────────────────────────────────────────
// U predvidi/postavi/izracunaj se ishod i izvedene veličine ne vide dok odgovor nije točan ili prikazan.
// Vraća popis ključeva koji se smiju prikazati na crtežu i u očitanjima.
export function vidljivo(s, otkriveno) {
  const sc = s.scena;
  const svi = {
    postulat: ["animacija", "brod"],
    svjetlosni_sat: ["animacija", "faktor", "tikovi"],
    mion: [
      "animacija",
      "beta",
      "T0",
      "T",
      "s",
      "s0",
      "gama",
      "faktor",
      "visina",
    ],
    brod: ["animacija", "beta", "L0", "L", "T0", "T", "gama", "faktor"],
    energija: [
      "animacija",
      "beta",
      "m",
      "E0",
      "E",
      "Ek",
      "gama",
      "graf",
      "stupac",
    ],
  }[sc];
  if (otkriveno || s.nacin === "istrazi" || s.nacin === "prikaz") return svi;
  if (sc === "postulat") return ["brod"];
  if (sc === "mion") return ["beta", "T0", "visina"];
  if (sc === "energija") return ["beta", "m"];
  if (sc === "brod") {
    const dano = ["L0"];
    if (s.nacin === "izracunaj") {
      if (isNum(s.beta)) dano.push("beta");
      if (isNum(s.L)) dano.push("L");
      if (isNum(s.T)) dano.push("T");
      if (isNum(s.T0)) dano.push("T0");
    } else {
      dano.push("beta"); // učenikov klizač
      if (s.cilj?.velicina === "T0") dano.push("T");
      if (s.cilj?.velicina === "T") dano.push("T0");
    }
    return dano;
  }
  return [];
}

// ── očitanja (tekst) ────────────────────────────────────────────────────────────────────────────────
export function ocitanja(s, stanje = {}) {
  const sc = s.scena;
  const b = stanje.beta ?? s.beta;
  const vid = new Set(vidljivo(s, stanje.otkriveno));
  const out = [];
  const st = (kljuc, oznaka, tekst) =>
    out.push({ kljuc, oznaka, tekst, skriveno: !vid.has(kljuc) });
  if (sc === "mion") {
    const f = fizika(s, b);
    st("beta", "v", `${uC(b)} = ${iznos(f.v, "m/s", 4)}`);
    st("T0", "T₀", `${iznos(f.T0, "µs")} (mionov sat)`);
    st("gama", "γ", brojF(f.gama));
    st("T", "T", `${iznos(f.T, "µs")} (sat na Zemlji)`);
    st("s", "s", iznos(f.s, "m", 4));
    st("s0", "v·T₀", `${iznos(f.s0, "m", f.s0 >= 1000 ? 4 : 3)} (klasično)`);
  }
  if (sc === "brod") {
    const f = fizika(s, b);
    const J = jedinicaT(s);
    st("beta", "v", uC(b));
    st("L0", "L₀", iznos(s.L0, "m"));
    st("L", "L", iznos(f.L, "m"));
    st("T0", "T₀", `${iznos(f.T0, J)} (u brodu)`);
    st("T", "T", `${iznos(f.T, J)} (na Zemlji)`);
  }
  if (sc === "energija") {
    const c = cestica(s);
    const g = stanje.gama ?? gama(b);
    const E0 = c.m * C * C;
    st("m", "m", `${iznos(c.m, "kg")} (${c.ime})`);
    st("beta", "v", `${fmtBetaBlizu(betaIzGame(g))}c`);
    st("E0", "E₀ = mc²", `${iznos(E0, "J")} = ${iznos(E0 / 1.6e-13, "MeV")}`);
    st("E", "E", `${iznos(g * E0, "J")} = ${brojF(g)} E₀`);
  }
  return out;
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Specijalna teorija relativnosti (fizika, matura; c = 3·10⁸ m/s, mₑ = 9,11·10⁻³¹ kg, mₚ = 1,67·10⁻²⁷ kg). tekst, scena, nacin; brzina je uvijek beta = v/c (0 < beta ≤ 0,9999). Uloga: istrazi i prikaz = gledanje, ostalo = Tvoj red. Tolerancija brojeva 1 %.
Scene:
- "postulat": brod leti brzinom beta, smjer: "prema" | "od" Zemlje, signal?: "laser" (zadano) | "radio" | "farovi"; brod pošalje signal prema Zemlji: stvarni puls putuje brzinom c, a crtkani „duh“ brzinom c ± v (da se brzine zbrajaju); detektor na Zemlji uvijek izmjeri c. Načini: istrazi (klizač brzine, prekidač smjera, gumb „Pošalji“), prikaz, predvidi (učenik bira (1 − β)c / c / (1 + β)c; utrka se pokaže tek nakon odgovora; poruke za zbrajanje/oduzimanje brzina dodaju se same).
- "svjetlosni_sat": dva zrcala i foton u brodu; pogled?: "zemlja" (zadano: cik-cak, uz mirni sat na Zemlji, brojači tikova i faktor √(1 − v²/c²)) | "brod" (foton okomito). beta (zadano 0,6). Načini: istrazi (klizač i prekidač pogleda), prikaz.
- "mion": mion nastane na visina? km (zadano 15) i juri prema tlu; T0 (µs, zadano 2,2). Dva sata (mionov T₀ i zemaljski T) kucaju uživo, crtkani „duh“ raspadne se nakon v·T₀. Načini: istrazi (klizač brzine i prekidač „pogled iz miona“: atmosfera skraćena γ puta), prikaz, izracunaj (pitaj: [{velicina: "T" (µs | ns | ms | s) | "s" (m | km) | "gama" | "s0" (klasični put v·T₀), jedinica?, tolerancija?, krivo?, savjet?}], 1–3 polja; T, s, γ i ishod skriveni do točnog odgovora).
- "brod": brod duljine L0 (m) leti pokraj ravnala na Zemlji; skraćuje se samo u smjeru gibanja (crtkani obris mirnog broda), sat u brodu i usklađeni satovi na Zemlji mjere trajanje ručka. beta ili L (izmjerena duljina, L < L0) za brzinu; T (trajanje na Zemlji) ili T0 (u brodu), jedinica_T? (zadano "min"). Načini: istrazi (klizač brzine), prikaz, postavi (cilj: {velicina: "L" | "T0" | "T", vrijednost}; beta = početna brzina (ne smije ostvarivati cilj), korak? zadano 0,001; brod se do provjere crta u vlastitoj duljini i ništa se ne očitava; točno kad je √(1 − β²) unutar ±0,5 % ciljanog omjera ili je β najviše jedan korak klizača od točne; cilj mora biti ostvariv do v = 0,999c; poruke za β = L/L₀, zaboravljen korijen i krivi izvod dodaju se same; krivo?: [{vrijednost (β), poruka}]), izracunaj (pitaj: [{velicina: "beta" (u c; prihvaća i m/s) | "L" | "T0" | "T" | "gama", jedinica?, tolerancija?, krivo?, savjet?}]; zadane veličine se vide, ostale su skrivene).
- "energija": cestica: "elektron" | "proton" | {ime, gen?, m (kg)} u cijevi akceleratora; stupac E = E₀ + E_k, brzinomjer v/c s crtom c i graf E/E₀ (v/c) s asimptotom. Načini: istrazi (gumbi „Dodaj energiju“ po obrok? · E₀, zadano 0,5; v/c se približava c i nikad je ne dosegne; beta? početna brzina), prikaz (beta), izracunaj (pitaj: [{velicina: "E0" | "E" | "Ek" (J | MeV | keV | eV) | "gama", …}]; beta potrebna za E, Ek i gama).
Tipične greške u izracunaj računa aplikacija (γ obrnuto, zaboravljen korijen, v umjesto v², ½mv², m·c, c u km/s, µs nepretvoren, put s vlastitim vremenom, druga čestica, krive jedinice); u pitaj[i].krivo smiju se dodati vlastite (${KRIVO_OPIS}).`;

const PRIMJER = {
  tip: TIP,
  scena: "postulat",
  nacin: "predvidi",
  beta: 0.6,
  smjer: "prema",
  signal: "laser",
  tekst:
    "Svemirski brod leti brzinom 0,6c prema Zemlji i u smjeru Zemlje pošalje laserski puls. Kolikom brzinom puls stiže na Zemlju, prema mjerenju na Zemlji?",
};
const PRIMJERI = [
  {
    tip: TIP,
    scena: "postulat",
    nacin: "istrazi",
    beta: 0.5,
    smjer: "od",
    signal: "radio",
    tekst:
      "Brod se udaljava od Zemlje i šalje radiosignal prema Zemlji (1272). **Mijenjaj brzinu i smjer** broda i pošalji signal: koliku brzinu izmjeri detektor na Zemlji?",
  },
  {
    tip: TIP,
    scena: "postulat",
    nacin: "predvidi",
    beta: 0.9,
    smjer: "od",
    signal: "laser",
    tekst:
      "Svemirski brod leti brzinom 0,9c od Zemlje i u smjeru Zemlje pošalje laserski puls. Kolikom brzinom puls stiže na Zemlju, prema mjerenju na Zemlji?",
  },
  {
    tip: TIP,
    scena: "svjetlosni_sat",
    nacin: "istrazi",
    beta: 0.6,
    pogled: "zemlja",
    tekst:
      "Svjetlosni sat: foton putuje između dva zrcala, a svaki povratak je jedan tik. **Usporedi** sat u brodu sa satom na Zemlji i prebaci pogled u brod.",
  },
  {
    tip: TIP,
    scena: "mion",
    nacin: "izracunaj",
    beta: 0.995,
    T0: 2.2,
    pitaj: [
      { velicina: "T", jedinica: "µs" },
      { velicina: "s", jedinica: "m" },
    ],
    tekst:
      "Mion nastane visoko u atmosferi i giba se prema tlu brzinom 0,995c. U sustavu u kojem miruje živi 2,2 µs. Koliko živi prema mjerenju sa Zemlje i koliki put za to vrijeme prijeđe?",
  },
  {
    tip: TIP,
    scena: "mion",
    nacin: "istrazi",
    beta: 0.98,
    T0: 2.2,
    tekst:
      "Mion (1272) leti brzinom 0,98c. Pusti ga i **usporedi dva sata**. Zatim uključi pogled iz miona.",
  },
  {
    tip: TIP,
    scena: "brod",
    nacin: "postavi",
    L0: 150,
    beta: 0.3,
    T: 50,
    cilj: { velicina: "L", vrijednost: 90 },
    tekst:
      "Brod je dug 150 m dok miruje (1276). Izračunaj i **namjesti brzinu** broda tako da ga promatrač na Zemlji izmjeri dugog 90 m.",
  },
  {
    tip: TIP,
    scena: "brod",
    nacin: "izracunaj",
    L0: 150,
    L: 90,
    T: 50,
    pitaj: [{ velicina: "T0", jedinica: "min" }],
    tekst:
      "Svemirski brod dugačak je 150 m dok miruje. Dok leti pokraj Zemlje, promatrač na Zemlji izmjeri da je dugačak 90 m. Isti promatrač izmjeri da je astronautov ručak trajao 50 min. Koliko je ručak trajao prema satu u brodu?",
  },
  {
    tip: TIP,
    scena: "brod",
    nacin: "izracunaj",
    L0: 250,
    L: 70,
    T: 50,
    pitaj: [{ velicina: "beta" }, { velicina: "T0", jedinica: "min" }],
    tekst:
      "Brod dug 250 m dok miruje promatrač na Zemlji izmjeri dugog 70 m, a ručak na brodu po zemaljskim satovima traje 50 min (1279). Kolika je brzina broda i koliko ručak traje prema satu u brodu?",
  },
  {
    tip: TIP,
    scena: "brod",
    nacin: "istrazi",
    L0: 100,
    beta: 0.3,
    T: 25,
    tekst:
      "Brod dug 100 m leti pokraj ravnala na Zemlji (1277). **Povećavaj brzinu** i usporedi omjer duljina L/L₀ s omjerom vremena T₀/T.",
  },
  {
    tip: TIP,
    scena: "energija",
    nacin: "izracunaj",
    cestica: "elektron",
    beta: 0.8,
    pitaj: [
      { velicina: "E0", jedinica: "J" },
      { velicina: "E", jedinica: "J" },
    ],
    tekst:
      "a) Kolika je energija mirovanja elektrona? b) Elektron se giba brzinom 0,8c. Kolika mu je ukupna energija?",
  },
  {
    tip: TIP,
    scena: "energija",
    nacin: "istrazi",
    cestica: "elektron",
    tekst:
      "Dodaj elektronu energije koliko želiš (1281 c). **Možeš li ga dovesti do brzine svjetlosti?**",
  },
  {
    tip: TIP,
    scena: "energija",
    nacin: "izracunaj",
    cestica: "proton",
    beta: 0.28,
    pitaj: [
      { velicina: "E0", jedinica: "J" },
      { velicina: "E", jedinica: "J" },
    ],
    tekst:
      "a) Kolika je energija mirovanja protona? b) Proton se giba brzinom 0,28c. Kolika mu je ukupna energija?",
  },
  {
    tip: TIP,
    scena: "energija",
    nacin: "prikaz",
    cestica: "elektron",
    beta: 0.96,
    tekst:
      "Elektron pri 0,96c (1283): ukupna energija je više od tri puta veća od energije mirovanja.",
  },
];

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
const POLJA_SCENE = {
  postulat: ["beta", "smjer", "signal"],
  svjetlosni_sat: ["beta", "pogled"],
  mion: ["beta", "T0", "visina", "pitaj", "pogled"],
  brod: [
    "L0",
    "beta",
    "L",
    "T",
    "T0",
    "jedinica_T",
    "cilj",
    "korak",
    "pitaj",
    "krivo",
  ],
  energija: ["cestica", "beta", "obrok", "pitaj"],
};
const OPCA = ["tip", "scena", "nacin", "tekst", "savjet"];
const PITAJ_SCENE = {
  mion: ["T", "s", "gama", "s0"],
  brod: ["beta", "L", "T0", "T", "gama"],
  energija: ["E0", "E", "Ek", "gama"],
};
const betaOk = (b) => isNum(b) && b > 0 && b <= BETA_MAX;

function validate(s) {
  const { list, need } = problems();
  need(isText(s.tekst), "relativnost treba „tekst“");
  if (
    !need(
      SCENE.includes(s.scena),
      `relativnost.scena mora biti jedna od: ${SCENE.join(", ")}`,
    )
  )
    return list;
  const nac = NACINI[s.scena];
  if (
    !need(
      nac.includes(s.nacin),
      `scena ${s.scena}: nacin mora biti jedan od: ${nac.join(", ")}`,
    )
  )
    return list;
  for (const f of Object.keys(s))
    need(
      OPCA.includes(f) || POLJA_SCENE[s.scena].includes(f),
      `polje „${f}“ ne postoji u sceni ${s.scena} (polja: ${POLJA_SCENE[s.scena].join(", ")})`,
    );
  if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
  const gledanje = s.nacin === "istrazi" || s.nacin === "prikaz";
  if (gledanje) noAnswerFields(s, need);
  if (s.pitaj != null)
    need(s.nacin === "izracunaj", "pitaj ide samo uz nacin izracunaj");
  const beta = (obavezno) => {
    if (s.beta == null)
      return need(!obavezno, `scena ${s.scena} (${s.nacin}) treba beta = v/c`);
    return need(
      betaOk(s.beta),
      "beta mora biti broj u (0; 0,9999] (brzina u jedinicama c, npr. 0,995)",
    );
  };

  if (s.scena === "postulat") {
    beta(true);
    need(
      ["prema", "od"].includes(s.smjer),
      "postulat.smjer mora biti „prema“ ili „od“ (Zemlje)",
    );
    if (s.signal != null)
      need(
        s.signal in SIGNALI,
        `signal mora biti: ${Object.keys(SIGNALI).join(", ")}`,
      );
    if (s.nacin !== "istrazi")
      need(
        s.beta == null || s.beta <= 0.99,
        "postulat: beta najviše 0,99 (inače se brod i puls na crtežu ne razlikuju)",
      );
  }
  if (s.scena === "svjetlosni_sat") {
    beta(false);
    if (isNum(s.beta))
      need(s.beta <= 0.99, "svjetlosni_sat: beta najviše 0,99");
    if (s.pogled != null)
      need(
        ["zemlja", "brod"].includes(s.pogled),
        "pogled mora biti „zemlja“ ili „brod“",
      );
  }
  if (s.scena === "mion") {
    beta(true);
    if (s.T0 != null)
      need(
        isNum(s.T0) && s.T0 > 0 && s.T0 <= 1000,
        "T0 mora biti vlastito vrijeme života u µs (0; 1000]",
      );
    if (s.visina != null)
      need(
        isNum(s.visina) && s.visina >= 1 && s.visina <= 100,
        "visina mora biti visina nastanka miona u km [1; 100]",
      );
    if (s.pogled != null)
      need(
        s.nacin === "istrazi" && ["zemlja", "mion"].includes(s.pogled),
        "pogled („zemlja“ | „mion“) samo uz istrazi",
      );
  }
  if (s.scena === "brod") {
    need(
      isNum(s.L0) && s.L0 >= 1 && s.L0 <= 10000,
      "L0 mora biti duljina broda u mirovanju u m [1; 10 000]",
    );
    if (s.L != null)
      need(
        isNum(s.L) && s.L > 0 && isNum(s.L0) && s.L < s.L0,
        "L (duljina izmjerena sa Zemlje) mora biti broj u (0; L0): brod u gibanju je kraći",
      );
    if (s.T != null)
      need(
        isNum(s.T) && s.T > 0,
        "T mora biti pozitivan broj (trajanje na Zemlji)",
      );
    if (s.T0 != null)
      need(
        isNum(s.T0) && s.T0 > 0,
        "T0 mora biti pozitivan broj (trajanje u brodu)",
      );
    need(
      !(s.T != null && s.T0 != null),
      "zadaj samo jedno od T (Zemlja) i T0 (brod): drugo slijedi iz brzine",
    );
    if (s.jedinica_T != null)
      need(
        DOPUSTENE.vrijeme.includes(normUnit(s.jedinica_T)),
        `jedinica_T mora biti: ${DOPUSTENE.vrijeme.join(", ")}`,
      );
    if (s.nacin === "postavi") {
      beta(true);
      need(
        s.L == null,
        "postavi: L se ne zadaje (učenik namješta brzinu); cilj ide u cilj",
      );
      const c = s.cilj;
      if (
        need(
          c &&
            ["L", "T0", "T"].includes(c.velicina) &&
            isNum(c.vrijednost) &&
            c.vrijednost > 0,
          "postavi treba cilj: {velicina: „L“ | „T0“ | „T“, vrijednost > 0}",
        )
      ) {
        if (c.velicina === "L")
          need(c.vrijednost < s.L0, "cilj L mora biti manji od L0");
        if (c.velicina === "T0")
          need(
            isNum(s.T) && c.vrijednost < s.T,
            "cilj T0 traži zadani T i T0 < T",
          );
        if (c.velicina === "T")
          need(
            isNum(s.T0) && c.vrijednost > s.T0,
            "cilj T traži zadani T0 i T > T0",
          );
      }
      if (s.korak != null)
        need(
          isNum(s.korak) && s.korak >= 0.0001 && s.korak <= 0.01,
          "korak mora biti u [0,0001; 0,01]",
        );
      if (list.length) return list;
      const kz = ciljaniFaktor(s);
      need(
        kz > 0.02 && kz < 0.998,
        "cilj nije ostvariv: traženi omjer √(1 − v²/c²) mora biti u (0,02; 0,998)",
      );
      need(
        tocnaBeta(s) <= BETA_MAX_POSTAVI + 1e-9,
        `cilj traži brzinu ${formatNumber(Number(tocnaBeta(s).toFixed(4)))}c, a klizač ide najviše do ${formatNumber(BETA_MAX_POSTAVI)}c`,
      );
      need(
        ostvarujeCilj(s, tocnaBeta(s)),
        "cilj se ne može postići na mreži klizača (smanji korak)",
      );
      need(
        !ostvarujeCilj(s, s.beta),
        "početna beta već ostvaruje cilj: učenik ne bi ništa morao napraviti",
      );
      if (
        s.krivo != null &&
        need(Array.isArray(s.krivo), "krivo mora biti popis")
      )
        s.krivo.forEach((x, i) => {
          need(
            isNum(x?.vrijednost) &&
              x.vrijednost > 0 &&
              x.vrijednost < 1 &&
              isText(x?.poruka),
            `krivo[${i}] mora biti {vrijednost: β u (0; 1), poruka}`,
          );
          if (isNum(x?.vrijednost))
            need(
              !ostvarujeCilj(s, x.vrijednost),
              `krivo[${i}].vrijednost ostvaruje cilj, a to je točan odgovor`,
            );
        });
    } else {
      need(
        s.cilj == null && s.korak == null && s.krivo == null,
        "cilj, korak i krivo idu samo uz postavi",
      );
      if (s.nacin === "izracunaj")
        need(
          (s.beta != null) !== (s.L != null),
          "brod (izracunaj): zadaj točno jedno od beta ili L (brzina slijedi iz L/L₀)",
        );
      else need(s.L == null || s.beta == null, "zadaj beta ili L, ne oba");
      if (s.beta != null) beta(true);
      if (gledanje && s.beta == null && s.L == null)
        need(false, "brod treba beta (početnu brzinu) ili L");
    }
  }
  if (s.scena === "energija") {
    const c = cestica(s);
    need(
      c &&
        isNum(c.m) &&
        c.m > 0 &&
        c.m < 1 &&
        (typeof s.cestica === "string" || isText(c.ime)),
      "cestica mora biti „elektron“, „proton“ ili {ime, m (kg)}",
    );
    if (s.nacin === "prikaz") beta(true);
    else beta(false);
    if (s.obrok != null)
      need(
        s.nacin === "istrazi" &&
          isNum(s.obrok) &&
          s.obrok >= 0.05 &&
          s.obrok <= 10,
        "obrok (u E₀, samo istrazi) mora biti u [0,05; 10]",
      );
  }

  if (s.nacin === "izracunaj") {
    const dozv = PITAJ_SCENE[s.scena];
    if (
      need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "izracunaj treba pitaj: 1–3 pitanja [{velicina, jedinica?}]",
      )
    ) {
      const vidjeno = new Set();
      s.pitaj.forEach((q, i) => {
        if (
          !need(
            dozv.includes(q?.velicina),
            `pitaj[${i}].velicina mora biti: ${dozv.join(", ")}`,
          )
        )
          return;
        need(
          !vidjeno.has(q.velicina),
          `pitaj[${i}]: veličina ${q.velicina} se ponavlja`,
        );
        vidjeno.add(q.velicina);
        for (const f of Object.keys(q))
          need(
            [
              "velicina",
              "jedinica",
              "tolerancija",
              "krivo",
              "savjet",
              "naziv",
            ].includes(f),
            `pitaj[${i}]: nepoznato polje „${f}“`,
          );
        const m = VELICINE[s.scena][q.velicina];
        if (q.jedinica != null)
          need(
            m.vrsta && DOPUSTENE[m.vrsta]?.includes(normUnit(q.jedinica)),
            m.vrsta
              ? `pitaj[${i}].jedinica mora biti: ${(DOPUSTENE[m.vrsta] ?? []).join(", ")}`
              : `pitaj[${i}] (${q.velicina}) nema jedinicu`,
          );
        if (q.tolerancija != null)
          need(
            isNum(q.tolerancija) && q.tolerancija > 0,
            `pitaj[${i}].tolerancija mora biti pozitivan broj`,
          );
        if (s.scena === "brod") {
          if (q.velicina === "beta")
            need(
              isNum(s.L) && s.beta == null,
              "pitaj beta: zadaj L (i L0), a ne beta",
            );
          if (q.velicina === "L")
            need(isNum(s.beta) && s.L == null, "pitaj L: zadaj beta, a ne L");
          if (q.velicina === "T0")
            need(isNum(s.T), "pitaj T0: zadaj T (trajanje na Zemlji)");
          if (q.velicina === "T")
            need(isNum(s.T0), "pitaj T: zadaj T0 (trajanje u brodu)");
        }
        if (s.scena === "energija" && q.velicina !== "E0")
          need(betaOk(s.beta), `pitaj ${q.velicina}: zadaj beta`);
      });
      if (!list.length)
        s.pitaj.forEach((q, i) => {
          const r = izracun(s, q);
          need(
            isNum(r.vrijednost) && r.vrijednost > 0,
            `pitaj[${i}]: odgovor se ne može izračunati`,
          );
          (q.krivo ?? []).forEach((x, j) => {
            need(
              isNum(x?.vrijednost) && isText(x?.poruka),
              `pitaj[${i}].krivo[${j}] mora biti {vrijednost, poruka}`,
            );
            if (isNum(x?.vrijednost))
              need(
                !near(x.vrijednost, r.vrijednost, r.tol),
                `pitaj[${i}].krivo[${j}].vrijednost jednaka je točnom odgovoru`,
              );
          });
        });
    }
  }
  return list;
}

// ── točan odgovor ───────────────────────────────────────────────────────────────────────────────────
function tocanOdgovor(s) {
  if (s.nacin === "predvidi")
    return "c (3·10⁸ m/s): brzina svjetlosti ista je za svakog promatrača";
  if (s.nacin === "postavi") {
    const b = tocnaBeta(s);
    return `v = ${uC(b)} (${s.cilj.velicina === "L" ? "L" : s.cilj.velicina === "T0" ? "T₀" : "T"} = ${ishodPostavi(s, b).tekst})`;
  }
  if (s.nacin === "izracunaj")
    return pitanja(s)
      .map((q) => {
        const r = izracun(s, q);
        if (q.velicina === "beta") return `v = ${formatSci(r.vrijednost, 3)}c`;
        return `${r.oznaka} = ${iznos(r.vrijednost, r.jedinica, Math.abs(r.vrijednost) >= 1000 && Math.abs(r.vrijednost) < 1e6 ? 4 : 3)}`;
      })
      .join("; ");
  return "";
}

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const relativnost = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) =>
    s.nacin === "istrazi" || s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR,
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  fizika,
  validate,
  check(s, odgovor) {
    if (s.nacin === "predvidi") return checkPredvidi(s, odgovor);
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor,
};
