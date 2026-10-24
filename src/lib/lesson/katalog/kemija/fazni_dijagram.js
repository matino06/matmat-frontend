// fazni_dijagram: fazni dijagram čiste tvari (lekcija 045 „Fazni dijagram čistih tvari“, 026 „Energija faznih
// prijelaza“). Graf p prema t s tri krivulje (sublimacija, taljenje, isparavanje) koje se sastaju u trojnoj točki i
// dijele ga na tri područja: čvrsto, tekuće, plinovito. Na krivulji su dvije faze u ravnoteži, u trojnoj točki sve tri.
// Kod sam računa: agregacijsko stanje točke (ili koje su faze u ravnoteži), temperaturu ili tlak fazne promjene pri
// zadanom tlaku ili temperaturi (očitanje s krivulje), koordinate trojne točke, redoslijed faznih promjena na putu pri
// stalnom tlaku ili stalnoj temperaturi (i pri kojoj se vrijednosti događaju), promjenu između dviju točaka i koji od
// ponuđenih puteva daje traženi prijelaz; te tipične krive odgovore s porukama (druga krivulja, zadana vrijednost umjesto
// očitane, °C i K, tlak ispod trojne točke, obrnut smjer …).
//
// Ugrađeni dijagrami (DIJAGRAMI) su SAMO podaci iz naših zadataka i ispita; svaki ima izvor. Dijagrami s ispita
// očitani su sa slike (točke krivulja), a shematski (voda, tvar X iz 2026.) imaju samo oznake na osima, bez mjerila.
import { isNum, parseNumber, formatNumber, near } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  checkNumber,
} from "../zajednicko.js";

export const NACINI = ["istrazi", "stanje", "ocitaj", "put", "uvjeti"];
export const FAZE = ["s", "l", "g"];
export const FAZA_IME = { s: "čvrsto", l: "tekuće", g: "plinovito" };
export const FAZA_ZNAK = { s: "(s)", l: "(ℓ)", g: "(g)" };
export const KRIVULJE = ["sublimacija", "taljenje", "isparavanje"];
export const KRIVULJA_FAZE = {
  sublimacija: "sg",
  taljenje: "sl",
  isparavanje: "lg",
};
export const KRIVULJA_GEN = {
  sublimacija: "krivulja sublimacije",
  taljenje: "krivulja taljenja",
  isparavanje: "krivulja isparavanja",
};
const KRIVULJA_AK = {
  sublimacija: "krivulju sublimacije",
  taljenje: "krivulju taljenja",
  isparavanje: "krivulju isparavanja",
};
// odgovori načina „stanje“: jedna faza, dvije u ravnoteži ili sve tri (trojna točka)
export const STANJA = ["s", "l", "g", "sl", "lg", "sg", "slg"];
export const PRIJELAZI = {
  taljenje: "sl",
  skrucivanje: "ls",
  isparavanje: "lg",
  ukapljivanje: "gl",
  sublimacija: "sg",
  depozicija: "gs",
};
export const PRIJELAZ_IME = {
  taljenje: "taljenje",
  skrucivanje: "skrućivanje",
  isparavanje: "isparavanje",
  ukapljivanje: "ukapljivanje",
  sublimacija: "sublimacija",
  depozicija: "depozicija",
};
export const SUPROTNO = {
  taljenje: "skrucivanje",
  skrucivanje: "taljenje",
  isparavanje: "ukapljivanje",
  ukapljivanje: "isparavanje",
  sublimacija: "depozicija",
  depozicija: "sublimacija",
};
export const prijelazOd = (a, b) =>
  Object.keys(PRIJELAZI).find((k) => PRIJELAZI[k] === a + b) ?? null;
export const znakPrijelaza = (k) =>
  `${FAZA_ZNAK[PRIJELAZI[k][0]]} → ${FAZA_ZNAK[PRIJELAZI[k][1]]}`;
export const normStanje = (st) =>
  [...String(st ?? "")]
    .sort((a, b) => FAZE.indexOf(a) - FAZE.indexOf(b))
    .join("");
export function stanjeIme(st) {
  if (st.length === 1) return `${FAZA_IME[st]} ${FAZA_ZNAK[st]}`;
  if (st.length === 3) return "sve tri faze u ravnoteži (trojna točka)";
  return `ravnoteža ${FAZA_IME[st[0]]} ${FAZA_ZNAK[st[0]]} ⇌ ${FAZA_IME[st[1]]} ${FAZA_ZNAK[st[1]]}`;
}
// pri kojoj se promjeni toplina troši (lekcija 026: čestice se razdvajaju)
export const ENDOTERMNO = ["taljenje", "isparavanje", "sublimacija"];

// ── ugrađeni dijagrami ──
// Točke krivulja su [t, p] u jedinicama osi. sublimacija ide od lijevog ruba do trojne točke, taljenje i isparavanje
// od trojne točke do ruba. Između točaka je monotona glatka krivulja (kubna Hermiteova), na logaritamskoj osi u log p.
const PT_CO2 = 519.1168807672392; // tlak trojne točke (kPa) sa skice lekcije 045
const raspon = (a, b, k) =>
  Array.from({ length: Math.round((b - a) / k) + 1 }, (_, i) => a + i * k);
export const DIJAGRAMI = {
  CO2: {
    tvar: "CO₂",
    naziv: "ugljikov(IV) oksid",
    os: {
      x: [-90, -30],
      y: [0, 1200],
      mreza: [10, 200],
      fino: [2, 50],
      jx: "°C",
      jy: "kPa",
    },
    zaokruzi: [1, 10],
    trojna: [-57, PT_CO2],
    // lekcija 045, skica „graf“ uz svih 5 varijacija: iste formule
    sublimacija: raspon(-90, -57, 1).map((t) => [
      t,
      101 * (PT_CO2 / 101) ** ((t + 78) / 21),
    ]),
    taljenje: [
      [-57, PT_CO2],
      [-57 + (1200 - PT_CO2) / 150, 1200],
    ],
    isparavanje: raspon(-57, -30, 1).map((t) => [
      t,
      680 * (1000 / 680) ** ((t + 50) / 10),
    ]),
    oznaka_trojne: "T",
    nazivi: true,
    polozaj: {
      s: [-80, 820],
      l: [-46, 1090],
      g: [-43, 260],
      sublimacija: [-89, 175, "start"],
      taljenje: [-55.2, 1000, "end"],
      isparavanje: [-42.5, 720, "start"],
    },
    napomena:
      "Krivulja isparavanja završava u kritičnoj točki (31 °C i 7380 kPa), daleko izvan slike; iznad nje nema razlike između tekućine i plina.",
    izvor: "lekcija 045 (skica uz zadatak, svih 5 varijacija)",
  },
  H2O: {
    tvar: "H₂O",
    naziv: "voda",
    // shematski: mjerila nema, osi imaju samo vrijednosti iz lekcije 045 (trojna točka 0,61 kPa; pri 101,325 kPa
    // talište 0 °C i vrelište 100 °C); krivulja taljenja nagnuta je ulijevo (led se tali pod tlakom)
    os: {
      x: [0, 10],
      y: [0, 10],
      shema: true,
      jx: "°C",
      jy: "kPa",
      ox: [
        { u: 3, v: 0 },
        { u: 7.5, v: 100 },
      ],
      oy: [
        { u: 2.2, v: 0.61 },
        { u: 6, v: 101.325 },
      ],
    },
    trojna: [3.2, 2.2],
    sublimacija: [
      [0, 0.7],
      [1.2, 1.0],
      [2.2, 1.45],
      [2.8, 1.85],
      [3.2, 2.2],
    ],
    taljenje: [
      [3.2, 2.2],
      [3, 6],
      [2.79, 10],
    ],
    isparavanje: [
      [3.2, 2.2],
      [4.2, 2.75],
      [5.2, 3.45],
      [6.4, 4.5],
      [7.5, 6],
      [8.4, 7.5],
      [9.55, 10],
    ],
    oznaka_trojne: "T",
    nazivi: true,
    polozaj: {
      s: [1.4, 6.6],
      l: [5.3, 7.4],
      g: [6.3, 1.6],
      sublimacija: [0.25, 1.55, "start"],
      taljenje: [3.25, 8.6, "start"],
      isparavanje: [6.55, 3.6, "start"],
    },
    napomena:
      "Shematski dijagram (nije u mjerilu): trojna točka vode je pri samo 0,61 kPa, a pri 101,325 kPa led se tali pri 0 °C i voda vrije pri 100 °C.",
    izvor:
      "lekcija 045 (objašnjenje: trojna točka 0,61 kPa, normalno talište 0 °C i vrelište 100 °C, krivulja taljenja nagnuta ulijevo); ispit ljeto 2020., I. 2",
  },
  X_2021: {
    tvar: "X",
    naziv: "tvar X",
    // KEM IK-1 D-S046 (ljeto 2021., I. 8) = ljeto 2023., 7: očitano sa slike, T u K, p u Pa na logaritamskoj osi
    os: {
      x: [50, 450],
      y: [1e3, 1e10],
      mreza: [50, 1],
      fino: [10, 0.2],
      log: true,
      jx: "K",
      jy: "Pa",
    },
    zaokruzi: [5, 0.05],
    trojna: [217, 10 ** 5.6],
    sublimacija: [
      [50, 4.01],
      [60, 4.01],
      [70, 4.03],
      [80, 4.04],
      [90, 4.08],
      [100, 4.1],
      [110, 4.15],
      [120, 4.19],
      [130, 4.26],
      [140, 4.33],
      [150, 4.42],
      [160, 4.54],
      [170, 4.69],
      [180, 4.85],
      [190, 5.02],
      [200, 5.22],
      [210, 5.43],
      [217, 5.6],
    ].map(([t, l]) => [t, 10 ** l]),
    taljenje: [
      [217, 5.6],
      [248, 10],
    ].map(([t, l]) => [t, 10 ** l]),
    isparavanje: [
      [217, 5.6],
      [230, 5.73],
      [240, 5.85],
      [250, 5.97],
      [260, 6.08],
      [270, 6.2],
      [280, 6.34],
      [290, 6.47],
      [300, 6.62],
      [320, 6.95],
      [340, 7.34],
      [360, 7.73],
      [380, 8.18],
      [400, 8.62],
      [420, 9.08],
      [440, 9.57],
      [450, 9.79],
    ].map(([t, l]) => [t, 10 ** l]),
    polozaj: {
      s: [110, 10 ** 7.4],
      l: [300, 10 ** 8.7],
      g: [405, 10 ** 4.0],
      sublimacija: [60, 10 ** 4.4, "start"],
      taljenje: [236, 10 ** 9.3, "end"],
      isparavanje: [360, 10 ** 7.2, "start"],
    },
    izvor:
      "ispit ljeto 2021., I. 8 i ljeto 2023., 7 (KEM IK-1 D-S046; slika očitana)",
  },
  X_2025: {
    tvar: "X",
    naziv: "tvar X",
    // KEM D-S064 (1. rok 2025., 7): očitano sa slike, t u °C, p u bar
    os: {
      x: [-70, 9],
      y: [0, 14],
      mreza: [10, 2],
      fino: [2, 0.4],
      jx: "°C",
      jy: "bar",
    },
    zaokruzi: [1, 0.1],
    trojna: [-36, 5.2],
    sublimacija: [
      [-70, 2.0],
      [-65, 2.2],
      [-60, 2.45],
      [-55, 2.73],
      [-50, 3.14],
      [-45, 3.67],
      [-40, 4.44],
      [-38, 4.81],
      [-36, 5.2],
    ],
    taljenje: [
      [-36, 5.2],
      [-32, 14],
    ],
    isparavanje: [
      [-36, 5.2],
      [-35, 5.27],
      [-30, 5.58],
      [-25, 5.95],
      [-20, 6.42],
      [-15, 7.03],
      [-10, 7.78],
      [-5, 8.73],
      [0, 9.81],
      [5, 11.0],
      [9, 12.04],
    ],
    polozaj: {
      s: [-60, 9],
      l: [-20, 11],
      g: [-18, 3],
      sublimacija: [-69, 2.9, "start"],
      taljenje: [-31.5, 13, "start"],
      isparavanje: [-12, 8.5, "end"],
    },
    izvor: "ispit 1. rok 2025., 7 (KEM D-S064; slika očitana)",
  },
  X_2026: {
    tvar: "X",
    naziv: "tvar X",
    // KEM D-S069 (1. rok 2026., 10): shematski, na osima samo T₁–T₄ i p₁–p₄ (očitano sa slike u jedinicama mreže)
    os: {
      x: [0, 8],
      y: [0, 7],
      shema: true,
      jx: "K",
      jy: "Pa",
      ox: [
        { u: 2, z: "T₁" },
        { u: 3.5, z: "T₂" },
        { u: 6, z: "T₃" },
        { u: 7, z: "T₄" },
      ],
      oy: [
        { u: 1.5, z: "p₁" },
        { u: 3, z: "p₂" },
        { u: 4, z: "p₃" },
        { u: 5.5, z: "p₄" },
      ],
    },
    trojna: [3.5, 3],
    sublimacija: [
      [0, 1.0],
      [0.55, 1.08],
      [1.05, 1.17],
      [1.55, 1.31],
      [2.06, 1.54],
      [2.56, 1.86],
      [3.06, 2.4],
      [3.31, 2.72],
      [3.5, 3],
    ],
    taljenje: [
      [3.5, 3],
      [3.935, 7],
    ],
    isparavanje: [
      [3.5, 3],
      [4.06, 3.04],
      [4.56, 3.16],
      [5.06, 3.36],
      [5.56, 3.65],
      [6, 4],
      [6.31, 4.31],
      [6.56, 4.64],
      [6.81, 5.04],
      [7, 5.5],
      [7.1, 6.0],
      [7.215, 7],
    ],
    polozaj: { s: [1.2, 5.7], l: [5.0, 5.0], g: [5.0, 0.6] },
    izvor: "ispit 1. rok 2026., 10 (KEM D-S069; slika očitana)",
  },
};
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const ascii = (f) =>
  [...String(f ?? "")]
    .map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : c))
    .join("")
    .replace(/\s+/g, "");
const ALIAS = {
  CO2: "CO2",
  H2O: "H2O",
  voda: "H2O",
  X_2021: "X_2021",
  X_2023: "X_2021",
  X_2025: "X_2025",
  X_2026: "X_2026",
};
export const kljucDijagrama = (d) =>
  typeof d === "string" ? (ALIAS[ascii(d)] ?? null) : null;
export const imeTvari = (D) => (D.tvar === "X" ? "tvar X" : D.tvar);

// ── interpolacija ──
// monotona kubna (Fritsch–Carlson): krivulja kroz točke bez prebacivanja, izvan raspona ravno
function monotona(xs, ys) {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d = [];
  for (let i = 0; i < n - 1; i++)
    d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++)
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const h = xs[hi] - xs[lo];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * h * m[lo] +
      (-2 * t3 + 3 * t2) * ys[hi] +
      (t3 - t2) * h * m[hi]
    );
  };
}
// x za koji je f(x) = y, f monotona na [a, b]
function bisekcija(f, y, a, b) {
  let fa = f(a) - y;
  const fb = f(b) - y;
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (fa * fb > 0) return null;
  for (let i = 0; i < 80; i++) {
    const c = (a + b) / 2;
    const fc = f(c) - y;
    if (fc === 0 || b - a < 1e-12) return c;
    if (fa * fc < 0) b = c;
    else {
      a = c;
      fa = fc;
    }
  }
  return (a + b) / 2;
}

// ── model dijagrama ──
// Unutarnje koordinate: u = temperatura u jedinici osi, w = p (ili log₁₀ p na logaritamskoj osi).
// Na shematskom dijagramu u i w su jedinice mreže, a vrijednosti s oznaka osi (ox, oy) samo se prikazuju.
export function dijagramOf(s) {
  const d = s?.dijagram;
  const k = kljucDijagrama(d);
  if (k) return model(DIJAGRAMI[k], k);
  if (d && typeof d === "object" && !Array.isArray(d))
    return model(
      { tvar: d.tvar ?? "X", naziv: d.naziv, ...d, os: { ...(d.os ?? {}) } },
      null,
    );
  return { greska: true };
}
const cache = new Map();
function model(D, kljuc) {
  if (kljuc && cache.has(kljuc)) return cache.get(kljuc);
  const M = izgradi(D);
  M.kljuc = kljuc;
  if (kljuc) cache.set(kljuc, M);
  return M;
}
// točke [t, p] → [u, w]
const uw = (os, P) => P.map(([t, p]) => [t, os.log ? Math.log10(p) : p]);
export const wOd = (D, p) => (D.os.log ? Math.log10(p) : p);
export const pOd = (D, w) => (D.os.log ? 10 ** w : w);
function izgradi(D) {
  const os = D.os;
  const ok = (P) =>
    Array.isArray(P) &&
    P.length >= 2 &&
    P.every(
      (q) =>
        Array.isArray(q) &&
        q.length === 2 &&
        q.every(isNum) &&
        (!os.log || q[1] > 0),
    );
  if (
    !os ||
    !par(os.x) ||
    !par(os.y) ||
    ![D.sublimacija, D.taljenje, D.isparavanje].every(ok) ||
    !Array.isArray(D.trojna) ||
    !D.trojna.every(isNum) ||
    (os.log && os.y[0] <= 0)
  )
    return { greska: true, D };
  const x0 = os.x[0];
  const x1 = os.x[1];
  const y0 = os.log ? Math.log10(os.y[0]) : os.y[0];
  const y1 = os.log ? Math.log10(os.y[1]) : os.y[1];
  const S = uw(os, D.sublimacija);
  const L = uw(os, D.taljenje);
  const V = uw(os, D.isparavanje);
  const [uT, wT] = [
    D.trojna[0],
    os.log ? Math.log10(D.trojna[1]) : D.trojna[1],
  ];
  const sub = monotona(
    S.map((q) => q[0]),
    S.map((q) => q[1]),
  );
  const vapRaw = monotona(
    V.map((q) => q[0]),
    V.map((q) => q[1]),
  );
  const talj = monotona(
    L.map((q) => q[1]),
    L.map((q) => q[0]),
  ); // u(w)
  const vapZadnji = V[V.length - 1][0];
  // gdje isparavanje izlazi iz okvira: gore (u < x1) ili desno
  const vKraj = Math.min(vapZadnji, x1);
  const uVrh =
    vapRaw(vKraj) >= y1 - 1e-9
      ? (bisekcija(vapRaw, y1, uT, vKraj) ?? vKraj)
      : null;
  const vapKraj = uVrh ?? Math.min(vapZadnji, x1);
  // iznad okvira je krivulja „beskonačno“ visoko: sve desno od izlaza je plin
  const vap = (u) =>
    u > vapKraj + 1e-12 ? (uVrh != null ? Infinity : NaN) : vapRaw(u);
  const taljVrh = Math.min(L[L.length - 1][1], y1);
  const M = {
    D,
    os,
    x0,
    x1,
    y0,
    y1,
    uT,
    wT,
    sub,
    vap,
    talj,
    vapKraj,
    uVrh,
    taljVrh,
    subPocetak: S[0][0],
    shema: !!os.shema,
    log: !!os.log,
    tvar: D.tvar ?? "X",
    naziv: D.naziv ?? "",
  };
  M.linije = linijeKrivulja(M);
  return M;
}
const par = (x) =>
  Array.isArray(x) && x.length === 2 && x.every(isNum) && x[1] > x[0];

// normalizirane koordinate (0–1 po svakoj osi) za udaljenosti
const nx = (M, u) => (u - M.x0) / (M.x1 - M.x0);
const ny = (M, w) => (w - M.y0) / (M.y1 - M.y0);
// krivulje kao gusta izlomljena crta u unutarnjim koordinatama (za crtanje i udaljenost)
function linijeKrivulja(M) {
  const N = 160;
  const out = {};
  const sP = [];
  for (let i = 0; i <= N; i++) {
    const u = M.subPocetak + ((M.uT - M.subPocetak) * i) / N;
    sP.push([u, M.sub(u)]);
  }
  out.sublimacija = sP;
  const lP = [];
  for (let i = 0; i <= N; i++) {
    const w = M.wT + ((M.taljVrh - M.wT) * i) / N;
    lP.push([M.talj(w), w]);
  }
  out.taljenje = lP;
  const vP = [];
  for (let i = 0; i <= N; i++) {
    const u = M.uT + ((M.vapKraj - M.uT) * i) / N;
    vP.push([u, Math.min(M.y1, M.vap(u))]);
  }
  out.isparavanje = vP;
  return out;
}
function udaljenostDo(M, P, u, w) {
  const px = nx(M, u);
  const py = ny(M, w);
  let best = Infinity;
  let gdje = null;
  for (let i = 1; i < P.length; i++) {
    const ax = nx(M, P[i - 1][0]);
    const ay = ny(M, P[i - 1][1]);
    const bx = nx(M, P[i][0]);
    const by = ny(M, P[i][1]);
    const dx = bx - ax;
    const dy = by - ay;
    const L2 = dx * dx + dy * dy;
    const t = L2
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
      : 0;
    const qx = ax + t * dx;
    const qy = ay + t * dy;
    const d = Math.hypot(px - qx, py - qy);
    if (d < best) {
      best = d;
      gdje = [M.x0 + qx * (M.x1 - M.x0), M.y0 + qy * (M.y1 - M.y0)];
    }
  }
  return { d: best, gdje };
}
// najbliža krivulja: {krivulja, d, gdje}
export function najblizaKrivulja(M, u, w) {
  let best = { krivulja: null, d: Infinity, gdje: null };
  for (const k of KRIVULJE) {
    const r = udaljenostDo(M, M.linije[k], u, w);
    if (r.d < best.d) best = { krivulja: k, ...r };
  }
  return best;
}
export const udaljenostTrojne = (M, u, w) =>
  Math.hypot(nx(M, u) - nx(M, M.uT), ny(M, w) - ny(M, M.wT));
export const NA_KRIVULJI = 0.006; // dio osi: točka je na krivulji (dvije faze u ravnoteži)
export const PREBLIZU = 0.025; // bliže od toga, a nije na krivulji: nejasno je u kojem je području
export const TROJNA_R = 0.012;

// je li točka u dijelu dijagrama gdje su sve krivulje nacrtane
export function uOkviru(M, u, w) {
  const e = 1e-9;
  if (u < M.x0 - e || u > M.x1 + e || w < M.y0 - e || w > M.y1 + e)
    return false;
  if (u < M.subPocetak - e) return false;
  if (w > M.taljVrh + e && w > M.wT) return false;
  if (u > M.vapKraj + e && M.uVrh == null) return false;
  return true;
}
// faza točke izvan krivulja: "s" | "l" | "g"
export function faza(M, u, w) {
  if (w <= M.wT) {
    if (u <= M.uT) return w > M.sub(u) ? "s" : "g";
    return w > M.vap(u) ? "l" : "g";
  }
  if (u < M.talj(w)) return "s";
  if (u <= M.uT) return "l";
  return w > M.vap(u) ? "l" : "g";
}
// stanje točke: faza, ili dvije faze na krivulji, ili trojna točka
export function stanjeU(M, u, w) {
  if (udaljenostTrojne(M, u, w) < TROJNA_R)
    return { stanje: "slg", krivulja: null };
  const n = najblizaKrivulja(M, u, w);
  if (n.d < NA_KRIVULJI)
    return { stanje: KRIVULJA_FAZE[n.krivulja], krivulja: n.krivulja, d: n.d };
  return {
    stanje: faza(M, u, w),
    krivulja: null,
    d: n.d,
    najbliza: n.krivulja,
  };
}

// presjek s vodoravnom (stalan w) ili okomitom (stalan u) crtom: {krivulja: [u, w]}
export function presjeciTlak(M, w) {
  const out = {};
  if (w <= M.wT + 1e-12 && w >= M.sub(M.subPocetak) - 1e-12) {
    const u = bisekcija(M.sub, w, M.subPocetak, M.uT);
    if (isNum(u)) out.sublimacija = [u, w];
  }
  if (w >= M.wT - 1e-12 && w <= M.taljVrh + 1e-12)
    out.taljenje = [M.talj(w), w];
  if (w >= M.wT - 1e-12 && w <= Math.min(M.y1, M.vap(M.vapKraj)) + 1e-12) {
    const u = bisekcija(
      (x) => Math.min(M.y1 + 1, M.vap(x)),
      w,
      M.uT,
      M.vapKraj,
    );
    if (isNum(u)) out.isparavanje = [u, w];
  }
  return out;
}
export function presjeciTemp(M, u) {
  const out = {};
  if (u >= M.subPocetak - 1e-12 && u <= M.uT + 1e-12)
    out.sublimacija = [u, M.sub(u)];
  if (u >= M.uT - 1e-12 && u <= M.vapKraj + 1e-12 && M.vap(u) <= M.y1 + 1e-12)
    out.isparavanje = [u, M.vap(u)];
  const uA = M.talj(M.wT);
  const uB = M.talj(M.taljVrh);
  if (u >= Math.min(uA, uB) - 1e-12 && u <= Math.max(uA, uB) + 1e-12) {
    const w = bisekcija(M.talj, u, M.wT, M.taljVrh);
    if (isNum(w)) out.taljenje = [u, w];
  }
  return out;
}

// prijelazi na ravnom putu od A do B: [{prijelaz, od, do, u, w, trojna}]
export function prijelaziPuta(M, A, B) {
  const N = 800;
  const tocka = (k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
  const out = [];
  let pret = faza(M, ...tocka(0));
  for (let i = 1; i <= N; i++) {
    const f = faza(M, ...tocka(i / N));
    if (f === pret) continue;
    let a = (i - 1) / N;
    let b = i / N;
    for (let j = 0; j < 50; j++) {
      const c = (a + b) / 2;
      if (faza(M, ...tocka(c)) === pret) a = c;
      else b = c;
    }
    const [u, w] = tocka((a + b) / 2);
    out.push({
      prijelaz: prijelazOd(pret, f),
      od: pret,
      do: f,
      u,
      w,
      trojna: udaljenostTrojne(M, u, w) < TROJNA_R,
    });
    pret = f;
  }
  return out;
}

// ── brojevi i zapis ──
const broj = (x) =>
  isNum(x)
    ? x
    : x && typeof x === "object" && isNum(x.vrijednost)
      ? x.vrijednost
      : null;
const zapisOd = (x) =>
  x && typeof x === "object" && isText(x.zapis) ? x.zapis.trim() : null;
const istiBroj = (zapis, v) => {
  const n = parseNumber(String(zapis).replace(/\s+/g, ""));
  return isNum(n) && Math.abs(n - v) <= 1e-9 * Math.max(1, Math.abs(v));
};
const SUPER = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "-": "⁻",
};
// „5 × 10⁶“ kao na ispitu
export function zapisSci(p, sig = 2) {
  if (!isNum(p) || p <= 0) return "—";
  const r = Number(p.toPrecision(sig));
  const e = Math.floor(Math.log10(r));
  const m = Number((r / 10 ** e).toPrecision(sig));
  const eS = [...String(e)].map((c) => SUPER[c]).join("");
  return `${m === 1 ? "1" : formatNumber(m)} × 10${eS}`;
}
const zaokruzi = (v, k) => (k ? Math.round(v / k) * k : v);
const ZAOKRUZI = (M) =>
  M.D.zaokruzi ?? [M.os.fino?.[0] ?? 1, M.os.fino?.[1] ?? 1];
// temperatura u jedinici osi (zaokruženo kao očitanje)
export function zapisU(M, u) {
  if (!isNum(u)) return "—";
  return formatNumber(Number(zaokruzi(u, ZAOKRUZI(M)[0]).toPrecision(10)));
}
// tlak (iznos, bez jedinice)
export function zapisW(M, w) {
  if (!isNum(w)) return "—";
  if (M.log) return zapisSci(10 ** w);
  return formatNumber(Number(zaokruzi(w, ZAOKRUZI(M)[1]).toPrecision(10)));
}
export const sJ = (z, j) => (j ? `${z}\u00a0${j}` : z);

// ── točke ──
// U specu: {t} (°C) ili {T} (K) i {p} (jedinica osi), svaki broj smije biti {vrijednost, zapis}; {na: krivulja, t|T|p}
// (druga koordinata s krivulje); "trojna". Na shematskom dijagramu t i p su oznake s osi („T₃“, „p₁“, 100) ili "min"/"max".
const oznakaJednaka = (a, b) =>
  ascii(a).toLowerCase() === ascii(b).toLowerCase();
function naShemi(M, os, x) {
  const lista = os === "x" ? M.os.ox : M.os.oy;
  const [lo, hi] = os === "x" ? [M.x0, M.x1] : [M.y0, M.y1];
  if (x === "min") return { u: lo, z: null };
  if (x === "max") return { u: hi, z: null };
  const o = (lista ?? []).find(
    (q) =>
      (typeof x === "string" && isText(q.z) && oznakaJednaka(q.z, x)) ||
      (isNum(broj(x)) && isNum(q.v) && Math.abs(q.v - broj(x)) < 1e-9),
  );
  return o ? { u: o.u, z: o.z ?? null, v: o.v ?? null } : null;
}
export function tockaOf(M, t0) {
  if (t0 === "trojna" || t0?.trojna === true)
    return { u: M.uT, w: M.wT, na: "trojna", trojna: true };
  if (!t0 || typeof t0 !== "object")
    return { greska: 'točka je {t, p} (ili {T, p}), {na, t|p} ili "trojna"' };
  const out = { na: t0.na ?? null };
  if (M.shema) {
    const tx = t0.t ?? t0.T;
    const X = tx != null ? naShemi(M, "x", tx) : null;
    const Y = t0.p != null ? naShemi(M, "y", t0.p) : null;
    if (tx != null && !X)
      return {
        greska: `na shematskom dijagramu temperatura je oznaka s osi (${(M.os.ox ?? []).map((q) => q.z ?? formatNumber(q.v)).join(", ")}) ili "min"/"max"`,
      };
    if (t0.p != null && !Y)
      return {
        greska: `na shematskom dijagramu tlak je oznaka s osi (${(M.os.oy ?? []).map((q) => q.z ?? formatNumber(q.v)).join(", ")}) ili "min"/"max"`,
      };
    out.u = X?.u ?? null;
    out.w = Y?.u ?? null;
    out.zt = X
      ? (X.z ?? (isNum(X.v) ? `${formatNumber(X.v)} ${M.os.jx}` : null))
      : null;
    out.zp = Y
      ? (Y.z ?? (isNum(Y.v) ? `${formatNumber(Y.v)} ${M.os.jy}` : null))
      : null;
    out.rub = {
      t: tx === "min" || tx === "max" ? tx : null,
      p: t0.p === "min" || t0.p === "max" ? t0.p : null,
    };
  } else {
    const t = broj(t0.t);
    const T = broj(t0.T);
    if (t0.t != null && t0.T != null)
      return { greska: "zadaj t (°C) ili T (K), ne oboje" };
    if (t0.t != null && !isNum(t))
      return { greska: "t mora biti broj (°C) ili {vrijednost, zapis}" };
    if (t0.T != null && !isNum(T))
      return { greska: "T mora biti broj (K) ili {vrijednost, zapis}" };
    if (isNum(T) && T <= 0)
      return { greska: "T u kelvinima mora biti pozitivna" };
    const K = M.os.jx === "K";
    out.u = isNum(t)
      ? K
        ? t + 273.15
        : t
      : isNum(T)
        ? K
          ? T
          : T - 273.15
        : null;
    out.dano = isNum(t) ? "C" : isNum(T) ? "K" : null;
    out.zt = isNum(t)
      ? `${zapisOd(t0.t) ?? formatNumber(t)} °C`
      : isNum(T)
        ? `${zapisOd(t0.T) ?? formatNumber(T)} K`
        : null;
    const p = broj(t0.p);
    if (t0.p != null && !(isNum(p) && (p > 0 || (!M.log && p >= 0))))
      return {
        greska: "p mora biti broj (u jedinici osi) ili {vrijednost, zapis}",
      };
    out.w = isNum(p) ? wOd(M, p) : null;
    out.zp = isNum(p)
      ? `${zapisOd(t0.p) ?? (M.log ? zapisSci(p, 3) : formatNumber(p))} ${M.os.jy}`
      : null;
    for (const k of ["t", "T", "p"]) {
      const z = zapisOd(t0[k]);
      if (z != null && !istiBroj(z, broj(t0[k])))
        return {
          greska: `${k}.zapis („${z}“) mora biti isti broj kao vrijednost`,
        };
    }
  }
  if (out.na != null) {
    if (!KRIVULJE.includes(out.na))
      return { greska: `na je jedna od krivulja: ${KRIVULJE.join(", ")}` };
    if ((out.u == null) === (out.w == null))
      return {
        greska:
          "uz „na“ zadaj samo jednu koordinatu (t ili p); drugu kod uzme s krivulje",
      };
    const pr = out.u != null ? presjeciTemp(M, out.u) : presjeciTlak(M, out.w);
    const q = pr[out.na];
    if (!q)
      return {
        greska: `${KRIVULJA_GEN[out.na]} ne prolazi kroz ${out.u != null ? out.zt : out.zp}`,
      };
    out.u = q[0];
    out.w = q[1];
    if (out.zt == null) out.zt = M.shema ? null : sJ(zapisU(M, out.u), M.os.jx);
    if (out.zp == null) out.zp = M.shema ? null : sJ(zapisW(M, out.w), M.os.jy);
  }
  return out;
}
export const opisTocke = (P) =>
  P.trojna ? "u trojnoj točki" : [P.zt, P.zp].filter(Boolean).join(" i ");
export const SLOVA = "ABCD";
export const tockeOf = (s) =>
  s?.tocke != null ? [].concat(s.tocke) : s?.tocka != null ? [s.tocka] : [];

// ── put ──
// vrsta: "izobara" (stalan tlak), "izoterma" (stalna temperatura), "izravno"
export function putOf(M, od, doo) {
  const A = tockaOf(M, od);
  const B = tockaOf(M, doo);
  if (A.greska || B.greska) return { greska: A.greska ?? B.greska };
  if (!isNum(A.u) || !isNum(A.w) || !isNum(B.u) || !isNum(B.w))
    return { greska: "točke puta trebaju obje koordinate (t i p)" };
  const istiW = Math.abs(A.w - B.w) < 1e-9;
  const istiU = Math.abs(A.u - B.u) < 1e-9;
  if (istiW && istiU) return { greska: "početna i konačna točka puta su iste" };
  const vrsta = istiW ? "izobara" : istiU ? "izoterma" : "izravno";
  const fA = faza(M, A.u, A.w);
  const fB = faza(M, B.u, B.w);
  const koraci = prijelaziPuta(M, [A.u, A.w], [B.u, B.w]);
  const niz =
    vrsta === "izravno"
      ? fA !== fB
        ? [prijelazOd(fA, fB)]
        : []
      : koraci.map((k) => k.prijelaz);
  return {
    A,
    B,
    vrsta,
    fA,
    fB,
    koraci,
    niz,
    gore: B.w > A.w,
    desno: B.u > A.u,
  };
}
export function opisPuta(M, P) {
  const { A, B, vrsta } = P;
  if (vrsta === "izobara") {
    if (M.shema && A.zt && B.zt)
      return `promjena temperature ${A.zt} u ${B.zt} pri tlaku ${A.zp}`;
    const glag = P.desno ? "grijanje" : "hlađenje";
    return A.zt && B.zt
      ? `${glag} pri stalnom tlaku ${A.zp}, od ${A.zt} do ${B.zt}`
      : `${glag} pri stalnom tlaku ${A.zp}`;
  }
  if (vrsta === "izoterma") {
    if (M.shema && A.zp && B.zp)
      return `promjena tlaka ${A.zp} u ${B.zp} pri temperaturi ${A.zt}`;
    const glag = P.gore ? "tlačenje" : "smanjenje tlaka";
    return A.zp && B.zp
      ? `${glag} pri stalnoj temperaturi ${A.zt}, od ${A.zp} do ${B.zp}`
      : `${glag} pri stalnoj temperaturi ${A.zt}`;
  }
  return `promjena s ${opisTocke(A)} na ${opisTocke(B)}`;
}
// pri kojoj vrijednosti je prijelaz (izobara: temperatura, izoterma: tlak), u jedinici osi
export const vrijednostKoraka = (P, k) => (P.vrsta === "izobara" ? k.u : k.w);
export const jedinicaKoraka = (M, P) =>
  P.vrsta === "izobara" ? M.os.jx : M.os.jy;
export const zapisKoraka = (M, P, k) =>
  P.vrsta === "izobara" ? zapisU(M, k.u) : zapisW(M, k.w);

// ── očitanje ──
// trazi: [{p, krivulja?} → t; {t | T, krivulja?} → p; {trojna: true} → t i p]
export function ocitanjeOf(M, x) {
  if (x?.trojna === true) return { pita: "trojna", u: M.uT, w: M.wT };
  const P = tockaOf(M, { t: x?.t, T: x?.T, p: x?.p });
  if (P.greska) return { greska: P.greska };
  if (P.u != null && P.w != null)
    return {
      greska:
        "zadaj samo jednu koordinatu: p (traži se temperatura) ili t (traži se tlak)",
    };
  if (P.u == null && P.w == null)
    return {
      greska:
        "zadaj p (traži se temperatura), t (traži se tlak) ili trojna: true",
    };
  const pita = P.u == null ? "t" : "p";
  const pr = pita === "t" ? presjeciTlak(M, P.w) : presjeciTemp(M, P.u);
  const kandidati = Object.keys(pr);
  let k = x.krivulja ?? null;
  if (k == null) {
    if (kandidati.length !== 1)
      return {
        greska: kandidati.length
          ? `crta ${pita === "t" ? "pri tom tlaku" : "pri toj temperaturi"} siječe ${kandidati.map((q) => KRIVULJA_AK[q]).join(" i ")}: zadaj krivulja`
          : `crta ${pita === "t" ? "pri tom tlaku" : "pri toj temperaturi"} ne siječe nijednu krivulju`,
      };
    k = kandidati[0];
  }
  if (!KRIVULJE.includes(k))
    return { greska: `krivulja je jedna od: ${KRIVULJE.join(", ")}` };
  if (!pr[k])
    return {
      greska: `${KRIVULJA_GEN[k]} ne prolazi ${pita === "t" ? `kroz ${P.zp}` : `kroz ${P.zt}`}`,
    };
  // na jedinicu odgovora: temperatura u jedinici osi ili u x.jedinica
  const jed = pita === "t" ? (x.jedinica ?? M.os.jx) : M.os.jy;
  return {
    pita,
    krivulja: k,
    u: pr[k][0],
    w: pr[k][1],
    P,
    drugi: kandidati
      .filter((q) => q !== k)
      .map((q) => ({ krivulja: q, u: pr[q][0], w: pr[q][1] })),
    jed,
  };
}
export const traziOf = (s) => [].concat(s?.trazi ?? []);
export const ocitanjaOf = (s, M = dijagramOf(s)) =>
  traziOf(s).map((x) => ocitanjeOf(M, x));
// temperatura iz jedinice osi u jedinicu odgovora
const uUJed = (M, u, jed) =>
  jed === M.os.jx ? u : jed === "K" ? u + 273.15 : u - 273.15;
export function tocnoOcitanja(M, r, dio = 0) {
  if (r.pita === "trojna") return dio === 0 ? r.u : pOd(M, r.w);
  if (r.pita === "t") return uUJed(M, r.u, r.jed);
  return pOd(M, r.w);
}
export const zapisOcitanja = (M, r, dio = 0) => {
  if (r.pita === "trojna") return dio === 0 ? zapisU(M, r.u) : zapisW(M, r.w);
  if (r.pita === "t")
    return formatNumber(
      Number(zaokruzi(uUJed(M, r.u, r.jed), ZAOKRUZI(M)[0]).toPrecision(10)),
    );
  return zapisW(M, r.w);
};
export function tolOf(s, M) {
  const f = M.os.fino ?? M.os.mreza;
  const tt = isNum(s?.tolerancija?.t) ? s.tolerancija.t : f[0] / 2;
  const tp = isNum(s?.tolerancija?.p)
    ? s.tolerancija.p
    : M.log
      ? 0.1
      : f[1] / 2; // log: u dekadama
  return { t: tt, p: tp };
}

// ── upis tlaka na log osi: usporedba u dekadama ──
function citaj(ulaz, jed) {
  return parseNumber(
    String(ulaz ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    jed,
  );
}

const lista = (a) =>
  a.length <= 1
    ? a.join("")
    : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`;
const POLJA = [
  "tip",
  "nacin",
  "tekst",
  "dijagram",
  "tvari",
  "tocka",
  "tocke",
  "trazi",
  "od",
  "do",
  "putevi",
  "prijelaz",
  "vrijednosti",
  "samo_faze",
  "pokazi_tocke",
  "nazivi",
  "tolerancija",
  "krivo",
  "savjet",
];

export const fazni_dijagram = {
  tip: "fazni_dijagram",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Fazni dijagram čiste tvari (lekcija 045, i 026 za energiju faznih prijelaza): graf p prema t s krivuljama sublimacije, taljenja i isparavanja koje se sastaju u trojnoj točki; područja čvrsto (s), tekuće (ℓ), plinovito (g). Na krivulji su dvije faze u ravnoteži, u trojnoj točki sve tri.
Polja: tekst, dijagram: ugrađeni ${Object.entries(DIJAGRAMI)
    .map(
      ([k, D]) =>
        `"${k}" (${D.naziv}; ${D.os.shema ? "shematski, " : ""}${D.izvor})`,
    )
    .join(
      "; ",
    )} ili vlastiti {tvar, naziv?, os: {x: [od, do], y: [od, do], mreza: [korak t, korak p], fino?, log?: true (p na logaritamskoj osi, mreza[1] u dekadama), jx: "°C" | "K", jy: "kPa" | "Pa" | "bar"}, trojna: [t, p], sublimacija: [[t, p], …] (od lijevog ruba do trojne točke), taljenje: [[t, p], …] (od trojne točke do vrha), isparavanje: [[t, p], …] (od trojne točke do ruba), zaokruzi?: [t, p], izvor} — samo podaci iz zadatka, ne izmišljaj. nazivi?: true | false (nazivi krivulja na grafu; zadano kao na izvornoj slici).
Točka: {t} (°C) ili {T} (K) i {p} (u jedinici osi); broj smije biti {vrijednost, zapis} („5 × 10⁶“); {na: "sublimacija" | "taljenje" | "isparavanje", t | p} uzima drugu koordinatu s krivulje; "trojna". Kod pretvara °C i K prema osi. Na shematskom dijagramu koordinate su oznake s osi ("T3", "p1"; kod vode 0 i 100 °C, 0.61 i 101.325 kPa) ili "min"/"max" (rub grafa).
nacin:
- "istrazi" (nije zadatak): pomična točka (privuče se na krivulju i trojnu točku), boje i nazivi područja, čestice i naziv stanja ili „ravnoteža X ⇌ Y“; put pri stalnom tlaku (grijanje) ili stalnoj temperaturi (tlačenje) s popisom faznih promjena i animacijom. tocka? (početna), tvari?: popis ugrađenih dijagrama za izbor;
- "stanje": tocka ili tocke (1–4, slova A–D): učenik bira čvrsto / tekuće / plinovito / ravnotežu dviju faza / sve tri (trojna točka). samo_faze?: true nudi samo tri faze (ako nijedna točka nije na krivulji). Točka ne smije biti preblizu krivulji ako nije na njoj;
- "ocitaj" (samo dijagram s mjerilom): trazi: [{p} → temperatura fazne promjene pri tom tlaku, {t} ili {T} → tlak pri toj temperaturi, {trojna: true} → t i p trojne točke], 1–3 stavke; krivulja? (obavezna kad crta siječe više krivulja), jedinica?: "°C" | "K" (za temperaturu, zadano kao os), oznaka? (tekst kartice, zadano „t pri 101 kPa“ — bez naziva krivulje). tolerancija?: {t, p} (zadano pola finog koraka mreže; na log osi p u dekadama, 0,1);
- "put": od i do (točke). Isti tlak = grijanje/hlađenje, ista temperatura = tlačenje/smanjenje tlaka: učenik slaže redom fazne promjene (taljenje, skrućivanje, isparavanje, ukapljivanje, sublimacija, depozicija); vrijednosti?: true još traži temperaturu (ili tlak) svake promjene (samo s mjerilom). Inače (obje se mijenjaju, kao na ispitu 2021.) bira jednu promjenu iz početnog u konačno stanje. Poruke za tlak ispod trojne točke, obrnut smjer, krivi redoslijed;
- "uvjeti": prijelaz (npr. "ukapljivanje") i putevi: [{od, do}, …] (2–4, slova A–D; kao ispit 2026.): učenik bira put na kojem se događa taj prijelaz; točno jedan put ga smije imati.
pokazi_tocke?: true crta zadanu točku ili put i prije provjere (zadano: tek nakon provjere, kao ispit bez crteža). U „Tvoj red“ područja nisu obojena ni imenovana dok učenik ne provjeri. krivo?: [{korak?, vrijednost, poruka}] (ocitaj), savjet?.`,
  primjer: {
    tip: "fazni_dijagram",
    nacin: "put",
    tekst:
      "Komad suhog leda (čvrsti \\( \\mathrm{CO_2} \\)) leži na stolu pri 101 kPa i polako se zagrijava od −90 °C do −30 °C. Koje fazne promjene se događaju i pri kojoj temperaturi?",
    dijagram: "CO2",
    od: { t: -90, p: 101 },
    do: { t: -30, p: 101 },
    vrijednosti: true,
  },
  primjeri: [
    {
      tip: "fazni_dijagram",
      nacin: "istrazi",
      tekst:
        "Povuci točku po dijagramu i gledaj u kojem je stanju tvar. Stavi je na krivulju ili u trojnu točku, pa probaj grijanje pri stalnom tlaku i tlačenje pri stalnoj temperaturi.",
      dijagram: "CO2",
      tocka: { t: -70, p: 400 },
      tvari: ["CO2", "H2O"],
    },
    {
      tip: "fazni_dijagram",
      nacin: "stanje",
      tekst:
        "Očitaj u kojem je agregacijskom stanju \\( \\mathrm{CO_2} \\) pri −70 °C i 400 kPa. Koje su faze u ravnoteži u točki T?",
      dijagram: "CO2",
      tocke: [{ t: -70, p: 400 }, "trojna"],
    },
    {
      tip: "fazni_dijagram",
      nacin: "stanje",
      tekst: "Koje su faze u ravnoteži u trojnoj točki vode?",
      dijagram: "H2O",
      tocka: "trojna",
    },
    {
      tip: "fazni_dijagram",
      nacin: "ocitaj",
      tekst:
        "Plinoviti \\( \\mathrm{CO_2} \\) tlači se pri stalnoj temperaturi od −50 °C. Očitaj pri kojem tlaku počinje prelaziti u tekućinu. Očitaj i koordinate trojne točke T.",
      dijagram: "CO2",
      trazi: [{ t: -50 }, { trojna: true }],
    },
    {
      tip: "fazni_dijagram",
      nacin: "ocitaj",
      tekst:
        "Pri kojoj su temperaturi tekuća i plinovita faza tvari X u ravnoteži ako tlak iznosi 7 bar?",
      dijagram: "X_2025",
      trazi: [{ p: 7, krivulja: "isparavanje" }],
    },
    {
      tip: "fazni_dijagram",
      nacin: "put",
      tekst:
        "Na slici je fazni dijagram čiste tvari. Koja se fazna promjena odvija ako se tlak promijeni s \\( 5 \\times 10^{6} \\) Pa i temperature −123 °C na tlak od \\( 5 \\times 10^{4} \\) Pa i temperaturu 77 °C?",
      dijagram: "X_2021",
      od: { t: -123, p: { vrijednost: 5e6, zapis: "5 × 10⁶" } },
      do: { t: 77, p: { vrijednost: 5e4, zapis: "5 × 10⁴" } },
    },
    {
      tip: "fazni_dijagram",
      nacin: "put",
      tekst:
        "Led se pri stalnom tlaku od 101,325 kPa grije od niske temperature dok ne postane vodena para. Koje fazne promjene se događaju redom?",
      dijagram: "H2O",
      od: { t: "min", p: 101.325 },
      do: { t: "max", p: 101.325 },
    },
    {
      tip: "fazni_dijagram",
      nacin: "uvjeti",
      tekst:
        "Slika prikazuje fazni dijagram čiste tvari X. Pri kojim od navedenih uvjeta tlaka i temperature dolazi do prijelaza tvari X iz plinovitoga u tekuće agregacijsko stanje?",
      dijagram: "X_2026",
      prijelaz: "ukapljivanje",
      putevi: [
        { od: { t: "T1", p: "p3" }, do: { t: "T4", p: "p3" } },
        { od: { t: "T3", p: "p2" }, do: { t: "T1", p: "p2" } },
        { od: { t: "T3", p: "p1" }, do: { t: "T3", p: "p4" } },
        { od: { t: "T2", p: "p4" }, do: { t: "T2", p: "p1" } },
      ],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (
      !need(
        NACINI.includes(s.nacin),
        `fazni_dijagram.nacin mora biti jedan od: ${NACINI.join(", ")}`,
      )
    )
      return list;
    need(isText(s.tekst), "fazni_dijagram treba „tekst“");
    for (const k of Object.keys(s))
      need(
        POLJA.includes(k),
        `fazni_dijagram ne poznaje polje „${k}“ (polja: ${POLJA.slice(1).join(", ")})`,
      );
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    for (const b of ["vrijednosti", "samo_faze", "pokazi_tocke", "nazivi"])
      if (s[b] != null)
        need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (list.length) return list;

    // dijagram
    if (
      !need(
        s.dijagram != null,
        `fazni_dijagram treba dijagram (ugrađeni: ${Object.keys(DIJAGRAMI).join(", ")}, ili vlastiti {os, trojna, sublimacija, taljenje, isparavanje, izvor})`,
      )
    )
      return list;
    if (typeof s.dijagram === "string") {
      if (
        !need(
          kljucDijagrama(s.dijagram),
          `nema ugrađenog dijagrama „${s.dijagram}“ (ugrađeni: ${Object.keys(DIJAGRAMI).join(", ")})`,
        )
      )
        return list;
    } else if (!validirajVlastiti(s.dijagram, need)) return list;
    const M = dijagramOf(s);
    if (!need(!M.greska, "dijagram se ne da pročitati")) return list;
    if (s.tolerancija != null)
      need(
        s.tolerancija &&
          typeof s.tolerancija === "object" &&
          Object.keys(s.tolerancija).every(
            (k) =>
              ["t", "p"].includes(k) &&
              isNum(s.tolerancija[k]) &&
              s.tolerancija[k] > 0,
          ),
        "tolerancija je {t?, p?} (pozitivni brojevi; p na log osi u dekadama)",
      );
    const tockaOk = (t0, gdje, { krivulja = true } = {}) => {
      const P = tockaOf(M, t0);
      if (!need(!P.greska, `${gdje}: ${P.greska}`)) return null;
      if (
        !need(
          isNum(P.u) && isNum(P.w),
          `${gdje}: točka treba obje koordinate (t ili T, i p)`,
        )
      )
        return null;
      if (
        !need(
          uOkviru(M, P.u, P.w),
          `${gdje} (${opisTocke(P)}) je izvan dijagrama ili ondje nema svih krivulja`,
        )
      )
        return null;
      if (!P.trojna && !P.na) {
        const st = stanjeU(M, P.u, P.w);
        if (!krivulja && st.krivulja)
          return (
            need(
              false,
              `${gdje} (${opisTocke(P)}) je na ${KRIVULJA_GEN[st.krivulja].replace("krivulja", "krivulji")}: početak i kraj puta moraju biti u području`,
            ),
            null
          );
        if (!krivulja && st.stanje === "slg")
          return (
            need(
              false,
              `${gdje} je u trojnoj točki: početak i kraj puta moraju biti u području`,
            ),
            null
          );
        if (!st.krivulja && st.stanje.length === 1 && !M.shema)
          need(
            st.d >= PREBLIZU,
            `${gdje} (${opisTocke(P)}) je preblizu ${KRIVULJA_GEN[st.najbliza].replace("krivulja", "krivulji")}: s grafa se ne vidi u kojem je području (pomakni je ili zadaj na: „${st.najbliza}“)`,
          );
      } else if (!krivulja)
        return (
          need(
            false,
            `${gdje}: početak i kraj puta moraju biti u području, ne na krivulji`,
          ),
          null
        );
      return P;
    };

    if (s.nacin === "istrazi") {
      for (const f of [
        "tocke",
        "trazi",
        "od",
        "do",
        "putevi",
        "prijelaz",
        "vrijednosti",
        "samo_faze",
        "pokazi_tocke",
        "tolerancija",
      ])
        need(!(f in s), `istrazi ne koristi „${f}“`);
      if (s.tocka != null) tockaOk(s.tocka, "tocka");
      if (
        s.tvari != null &&
        need(
          Array.isArray(s.tvari) && s.tvari.length >= 1 && s.tvari.length <= 5,
          "tvari je popis 1–5 ugrađenih dijagrama",
        )
      )
        s.tvari.forEach((x, i) =>
          need(
            kljucDijagrama(x),
            `tvari[${i}] („${x}“) nije ugrađeni dijagram (${Object.keys(DIJAGRAMI).join(", ")})`,
          ),
        );
      if (s.tvari != null && typeof s.dijagram === "string")
        need(
          s.tvari.some((x) => kljucDijagrama(x) === kljucDijagrama(s.dijagram)),
          "dijagram mora biti jedan od tvari",
        );
      return list;
    }
    need(s.tvari == null, "tvari je samo za istrazi");

    if (s.nacin === "stanje") {
      for (const f of [
        "trazi",
        "od",
        "do",
        "putevi",
        "prijelaz",
        "vrijednosti",
      ])
        need(!(f in s), `stanje ne koristi „${f}“`);
      need(
        !(s.tocka != null && s.tocke != null),
        "zadaj tocka ili tocke, ne oboje",
      );
      const T = tockeOf(s);
      if (
        !need(
          T.length >= 1 && T.length <= 4,
          "stanje treba tocka ili tocke (1–4)",
        )
      )
        return list;
      const P = T.map((t0, i) =>
        tockaOk(t0, T.length > 1 ? `tocke[${i}]` : "tocka"),
      );
      if (list.length) return list;
      const st = P.map((q) => stanjeTocke(M, q));
      if (s.samo_faze)
        need(
          st.every((x) => x.length === 1),
          "samo_faze: nijedna točka ne smije biti na krivulji ni u trojnoj točki",
        );
      const kljucevi = P.map((q) => `${q.u.toFixed(6)}|${q.w.toFixed(6)}`);
      need(new Set(kljucevi).size === kljucevi.length, "dvije točke su iste");
      return list;
    }

    if (s.nacin === "ocitaj") {
      for (const f of [
        "tocka",
        "tocke",
        "od",
        "do",
        "putevi",
        "prijelaz",
        "vrijednosti",
        "samo_faze",
      ])
        need(!(f in s), `ocitaj ne koristi „${f}“`);
      if (
        !need(
          !M.shema,
          "očitavanje treba dijagram s mjerilom (shematski nema brojeva na osima)",
        )
      )
        return list;
      const tr = [].concat(s.trazi ?? []);
      if (
        !need(
          tr.length >= 1 && tr.length <= 3,
          "trazi je popis 1–3 očitanja [{p}, {t}, {T} ili {trojna: true}]",
        )
      )
        return list;
      tr.forEach((x, i) => {
        if (
          !need(
            x && typeof x === "object",
            `trazi[${i}] je {p}, {t}, {T} ili {trojna: true}`,
          )
        )
          return;
        for (const k of Object.keys(x))
          need(
            [
              "p",
              "t",
              "T",
              "trojna",
              "krivulja",
              "jedinica",
              "oznaka",
            ].includes(k),
            `trazi[${i}] ne poznaje polje „${k}“ (p, t, T, trojna, krivulja, jedinica, oznaka)`,
          );
        if (x.oznaka != null)
          need(isText(x.oznaka), `trazi[${i}].oznaka mora biti tekst`);
        if (x.jedinica != null)
          need(
            ["°C", "K"].includes(x.jedinica) && x.p != null,
            `trazi[${i}].jedinica je "°C" ili "K" (samo kad se traži temperatura)`,
          );
        if (x.trojna != null)
          need(
            x.trojna === true &&
              Object.keys(x).every((k) => k === "trojna" || k === "oznaka"),
            `trazi[${i}]: {trojna: true} nema drugih polja`,
          );
        const r = ocitanjeOf(M, x);
        if (!need(!r.greska, `trazi[${i}]: ${r.greska}`)) return;
        if (r.pita !== "trojna") {
          need(
            uOkviru(M, r.u, r.w),
            `trazi[${i}]: očitanje je izvan dijagrama`,
          );
          need(
            udaljenostTrojne(M, r.u, r.w) >= TROJNA_R * 2,
            `trazi[${i}]: to je baš trojna točka; traži {trojna: true}`,
          );
        }
      });
      need(
        tr.filter((x) => x?.trojna).length <= 1,
        "trojna točka je u trazi najviše jednom",
      );
      if (
        s.krivo != null &&
        need(Array.isArray(s.krivo), "krivo mora biti popis")
      )
        s.krivo.forEach((kr, i) => {
          need(
            isNum(kr?.vrijednost) && isText(kr?.poruka),
            `krivo[${i}] treba vrijednost (broj) i poruku`,
          );
          if (kr?.korak != null)
            need(
              Number.isInteger(kr.korak) &&
                kr.korak >= 0 &&
                kr.korak < tr.length,
              `krivo[${i}].korak je indeks iz trazi`,
            );
        });
      return list;
    }

    need(s.krivo == null, "krivo je samo za ocitaj");
    need(s.samo_faze == null, "samo_faze je samo za stanje");
    if (s.nacin === "put") {
      for (const f of ["tocka", "tocke", "trazi", "putevi", "prijelaz"])
        need(!(f in s), `put ne koristi „${f}“`);
      if (!need(s.od != null && s.do != null, "put treba od i do (točke)"))
        return list;
      const A = tockaOk(s.od, "od", { krivulja: false });
      const B = tockaOk(s.do, "do", { krivulja: false });
      if (!A || !B || list.length) return list;
      const P = putOf(M, s.od, s.do);
      if (!need(!P.greska, P.greska)) return list;
      if (P.vrsta === "izravno") {
        need(
          P.fA !== P.fB,
          `početno i konačno stanje su ista (${FAZA_IME[P.fA]}): nema fazne promjene`,
        );
        need(
          !s.vrijednosti,
          "vrijednosti idu samo uz put pri stalnom tlaku ili stalnoj temperaturi",
        );
        return list;
      }
      if (
        !need(
          P.koraci.length >= 1,
          `na putu nema fazne promjene (cijelim putem ${FAZA_IME[P.fA]} stanje)`,
        )
      )
        return list;
      need(P.koraci.length <= 3, "put ima više od 3 fazne promjene");
      need(
        !P.koraci.some((k) => k.trojna),
        "put prolazi kroz trojnu točku: pomakni ga da prijelazi budu jasni",
      );
      if (s.vrijednosti)
        need(!M.shema, "vrijednosti traže dijagram s mjerilom");
      return list;
    }

    // uvjeti
    for (const f of ["tocka", "tocke", "trazi", "od", "do", "vrijednosti"])
      need(!(f in s), `uvjeti ne koristi „${f}“`);
    if (
      !need(
        Object.keys(PRIJELAZI).includes(s.prijelaz),
        `prijelaz je jedan od: ${Object.keys(PRIJELAZI).join(", ")}`,
      )
    )
      return list;
    if (
      !need(
        Array.isArray(s.putevi) && s.putevi.length >= 2 && s.putevi.length <= 4,
        "putevi je popis 2–4 puta {od, do}",
      )
    )
      return list;
    const P = s.putevi.map((x, i) => {
      if (
        !need(
          x && typeof x === "object" && x.od != null && x.do != null,
          `putevi[${i}] je {od, do}`,
        )
      )
        return null;
      for (const k of Object.keys(x))
        need(
          ["od", "do", "opis"].includes(k),
          `putevi[${i}] ne poznaje polje „${k}“ (od, do, opis)`,
        );
      if (x.opis != null)
        need(isText(x.opis), `putevi[${i}].opis mora biti tekst`);
      const A = tockaOf(M, x.od);
      const B = tockaOf(M, x.do);
      for (const [Q, k] of [
        [A, "od"],
        [B, "do"],
      ]) {
        if (!need(!Q.greska, `putevi[${i}].${k}: ${Q.greska}`)) return null;
        if (
          !need(
            isNum(Q.u) && isNum(Q.w) && uOkviru(M, Q.u, Q.w),
            `putevi[${i}].${k} je izvan dijagrama ili nema obje koordinate`,
          )
        )
          return null;
      }
      const r = putOf(M, x.od, x.do);
      return need(!r.greska, `putevi[${i}]: ${r.greska}`) ? r : null;
    });
    if (list.length) return list;
    const imaju = P.map((r, i) => (r.niz.includes(s.prijelaz) ? i : -1)).filter(
      (i) => i >= 0,
    );
    need(
      imaju.length === 1,
      imaju.length
        ? `prijelaz „${PRIJELAZ_IME[s.prijelaz]}“ ima ${imaju.length} puta (${imaju.map((i) => SLOVA[i]).join(", ")}); točno jedan smije`
        : `nijedan put nema prijelaz „${PRIJELAZ_IME[s.prijelaz]}“`,
    );
    return list;
  },

  // stanje: {stanja: [...]}; ocitaj: {unosi: [...]} (trojna: dva upisa); put: {prijelazi: [...], vrijednosti?: [...]}; uvjeti: {put}
  check(s, odgovor) {
    const M = dijagramOf(s);
    if (M.greska) return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    if (s.nacin === "stanje") {
      const T = tockeOf(s).map((t0) => tockaOf(M, t0));
      const izbor = [].concat(odgovor?.stanja ?? []);
      for (let i = 0; i < T.length; i++) {
        const P = T[i];
        const ozn = T.length > 1 ? `${P.trojna ? "T" : SLOVA[i]}: ` : "";
        const st = stanjeTocke(M, P);
        const iz = normStanje(izbor[i]);
        if (!STANJA.includes(iz))
          return {
            tocno: false,
            prazno: true,
            praznina: i,
            poruka: T.length > 1 ? `${ozn}odaberi stanje.` : "Odaberi stanje.",
          };
        if (iz === st) continue;
        return {
          tocno: false,
          praznina: i,
          poruka: ozn + porukaStanja(M, P, st, iz, s),
        };
      }
      return { tocno: true };
    }
    if (s.nacin === "ocitaj") {
      const O = ocitanjaOf(s, M);
      const unosi = [].concat(
        odgovor?.unosi ?? (Array.isArray(odgovor) ? odgovor : []),
      );
      const tol = tolOf(s, M);
      let j = 0;
      for (let i = 0; i < O.length; i++) {
        const r = O[i];
        const dijelovi = r.pita === "trojna" ? [0, 1] : [0];
        for (const dio of dijelovi) {
          const ulaz = String(unosi[j] ?? "");
          const res = provjeriOcitanje(M, r, dio, ulaz, tol, s, i);
          if (!res.tocno)
            return {
              ...res,
              praznina: j,
              poruka:
                O.length > 1 || r.pita === "trojna"
                  ? `${oznakaOcitanja(M, r, dio, traziOf(s)[i])}: ${res.poruka}`
                  : res.poruka,
            };
          j++;
        }
      }
      return { tocno: true };
    }
    if (s.nacin === "put") {
      const P = putOf(M, s.od, s.do);
      if (P.greska)
        return { tocno: false, poruka: "Ovaj korak nema provjeru." };
      const niz = []
        .concat(odgovor?.prijelazi ?? [])
        .filter((x) => x in PRIJELAZI);
      if (!niz.length)
        return {
          tocno: false,
          prazno: true,
          praznina: 0,
          poruka:
            P.vrsta === "izravno"
              ? "Odaberi faznu promjenu."
              : "Dodaj fazne promjene redom kojim se događaju.",
        };
      const dobro =
        niz.length === P.niz.length && niz.every((x, i) => x === P.niz[i]);
      if (!dobro)
        return { tocno: false, praznina: 0, poruka: porukaPuta(M, P, niz, s) };
      if (s.vrijednosti && P.vrsta !== "izravno") {
        const vr = [].concat(odgovor?.vrijednosti ?? []);
        const tol = tolOf(s, M);
        for (let i = 0; i < P.koraci.length; i++) {
          const k = P.koraci[i];
          const res = provjeriKorakPuta(M, P, i, String(vr[i] ?? ""), tol, s);
          if (!res.tocno)
            return {
              ...res,
              praznina: 1 + i,
              poruka: `${PRIJELAZ_IME[k.prijelaz]}: ${res.poruka}`,
            };
        }
      }
      return { tocno: true };
    }
    if (s.nacin === "uvjeti") {
      const P = s.putevi.map((x) => putOf(M, x.od, x.do));
      const i = odgovor?.put;
      if (!Number.isInteger(i) || i < 0 || i >= P.length)
        return {
          tocno: false,
          prazno: true,
          praznina: 0,
          poruka: "Odaberi put.",
        };
      if (P[i].niz.includes(s.prijelaz)) return { tocno: true };
      const r = P[i];
      const sto = r.niz.length
        ? `tvar ${opisNiza(r.niz)}${r.fA !== r.fB ? `, ${FAZA_ZNAK[r.fA]} → ${FAZA_ZNAK[r.fB]}` : ""}`
        : `nema fazne promjene: cijelim putem tvar je u ${lokFaze(r.fA)} stanju`;
      return {
        tocno: false,
        praznina: 0,
        poruka: `Na putu ${SLOVA[i]} ${sto}. Traži se ${PRIJELAZ_IME[s.prijelaz]}, ${znakPrijelaza(s.prijelaz)}: nađi put koji počinje u području ${genFaze(PRIJELAZI[s.prijelaz][0])} stanja, a završava u području ${genFaze(PRIJELAZI[s.prijelaz][1])}.`,
      };
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  brojcaniOdgovor(s) {
    try {
      const M = dijagramOf(s);
      if (M.greska) return null;
      if (s.nacin === "ocitaj") {
        const r = ocitanjaOf(s, M).at(-1);
        if (!r || r.greska) return null;
        const v = parseNumber(
          zapisOcitanja(M, r, r.pita === "trojna" ? 1 : 0).replace(/\s+/g, ""),
        );
        return isNum(v) ? v : null;
      }
      if (s.nacin === "put" && s.vrijednosti) {
        const P = putOf(M, s.od, s.do);
        const k = P.koraci?.at(-1);
        return k ? parseNumber(zapisKoraka(M, P, k).replace(/\s+/g, "")) : null;
      }
    } catch {
      return null;
    }
    return null;
  },

  tocanOdgovor(s) {
    if (s.nacin === "istrazi") return "";
    const M = dijagramOf(s);
    if (M.greska) return "";
    if (s.nacin === "stanje") {
      const T = tockeOf(s).map((t0) => tockaOf(M, t0));
      return T.map(
        (P, i) =>
          `${T.length > 1 ? `${P.trojna ? "T" : SLOVA[i]}: ` : ""}${stanjeIme(stanjeTocke(M, P))}`,
      ).join("; ");
    }
    if (s.nacin === "ocitaj") {
      return ocitanjaOf(s, M)
        .map((r, i) => {
          if (r.greska) return "";
          if (r.pita === "trojna")
            return `trojna točka: t = ${sJ(zapisU(M, r.u), M.os.jx)}, p = ${sJ(zapisW(M, r.w), M.os.jy)}`;
          const z =
            r.pita === "t"
              ? sJ(zapisOcitanja(M, r), r.jed)
              : sJ(zapisW(M, r.w), M.os.jy);
          return `${oznakaOcitanja(M, r, 0, traziOf(s)[i])}: ${z} (${KRIVULJA_GEN[r.krivulja]})`;
        })
        .join("; ");
    }
    if (s.nacin === "put") {
      const P = putOf(M, s.od, s.do);
      if (P.greska) return "";
      if (P.vrsta === "izravno")
        return `${PRIJELAZ_IME[P.niz[0]]}, ${znakPrijelaza(P.niz[0])}`;
      return P.koraci
        .map(
          (k) =>
            `${PRIJELAZ_IME[k.prijelaz]} ${znakPrijelaza(k.prijelaz)}${M.shema ? "" : ` pri ${sJ(zapisKoraka(M, P, k), jedinicaKoraka(M, P))}`}`,
        )
        .join(", pa ");
    }
    if (s.nacin === "uvjeti") {
      const P = s.putevi.map((x) => putOf(M, x.od, x.do));
      const i = P.findIndex((r) => r.niz.includes(s.prijelaz));
      if (i < 0) return "";
      return `${SLOVA[i]}: ${s.putevi[i].opis ?? opisPuta(M, P[i])} (${PRIJELAZ_IME[s.prijelaz]}, ${znakPrijelaza(s.prijelaz)})`;
    }
    return "";
  },
};

// stanje zadane točke ("trojna" i točke „na“ krivulji su točne po definiciji)
export function stanjeTocke(M, P) {
  if (P.trojna) return "slg";
  if (P.na) return KRIVULJA_FAZE[P.na];
  return stanjeU(M, P.u, P.w).stanje;
}
const genFaze = (f) => ({ s: "čvrstog", l: "tekućeg", g: "plinovitog" })[f];
const lokFaze = (f) => ({ s: "čvrstom", l: "tekućem", g: "plinovitom" })[f];
const glagol = {
  taljenje: "se tali",
  skrucivanje: "se skrućuje",
  isparavanje: "isparava",
  ukapljivanje: "se ukapljuje",
  sublimacija: "sublimira",
  depozicija: "prelazi izravno iz plina u čvrsto (depozicija)",
};
const opisNiza = (niz) =>
  lista(niz.map((k, i) => (i ? `zatim ${glagol[k]}` : glagol[k])));

function porukaStanja(M, P, st, iz, s) {
  const hint =
    s.savjet ||
    (P.trojna
      ? ""
      : `Nađi ${P.zt ?? "temperaturu"} na vodoravnoj osi i idi okomito do ${P.zp ?? "tlaka"}.`);
  const KARTA =
    "Hladno i stisnuto je čvrsto (gore lijevo), toplo i rijetko je plin (dolje desno), a tekućina je između krivulja taljenja i isparavanja, iznad trojne točke.";
  if (st === "slg")
    return iz.length === 2
      ? "U toj se točki sastaju sve tri krivulje, pa su ondje u ravnoteži sve tri faze: to je trojna točka."
      : "To je trojna točka: u njoj se sastaju sve tri krivulje.";
  if (st.length === 2) {
    if (iz.length === 1)
      return `Točka je baš na krivulji. Na krivulji su dvije faze u ravnoteži: koliko čestica prijeđe iz jedne u drugu, toliko ih se vrati. ${hint}`;
    if (iz.length === 3)
      return "Trojna točka je samo ondje gdje se sastaju sve tri krivulje. Ova točka je na jednoj krivulji.";
    const k = Object.keys(KRIVULJA_FAZE).find((q) => KRIVULJA_FAZE[q] === iz);
    return `${KRIVULJA_GEN[k][0].toUpperCase()}${KRIVULJA_GEN[k].slice(1)} dijeli ${FAZA_IME[iz[0]]} i ${FAZA_IME[iz[1]]}, a točka nije na njoj. ${hint}`;
  }
  // točka je u području
  if (iz.length > 1)
    return `Točka nije na krivulji: dvije faze su u ravnoteži samo na samoj krivulji. Pogledaj u kojem je području. ${hint}`;
  // °C umjesto K (ili obrnuto): stanje pri brojčano istoj vrijednosti na osi
  if (
    P.dano &&
    ((P.dano === "C" && M.os.jx === "K") ||
      (P.dano === "K" && M.os.jx === "°C"))
  ) {
    const u2 = P.dano === "C" ? P.u - 273.15 : P.u + 273.15;
    if (uOkviru(M, u2, P.w) && faza(M, u2, P.w) === iz)
      return `Os temperature je u ${M.os.jx === "K" ? "kelvinima" : "°C"}, a zadano je u ${P.dano === "C" ? "°C" : "kelvinima"}: pretvori (T / K = t / °C + 273).`;
  }
  if (iz === "l" && P.w < M.wT)
    return `Tlak je niži od tlaka trojne točke: pri njemu tekuća faza ne postoji. ${hint}`;
  return `${hint} ${KARTA}`;
}

function oznakaOcitanja(M, r, dio, x) {
  if (r.pita === "trojna")
    return dio === 0 ? "t trojne točke" : "p trojne točke";
  if (isText(x?.oznaka)) return x.oznaka;
  return r.pita === "t" ? `t pri ${r.P.zp}` : `p pri ${r.P.zt}`;
}
function provjeriOcitanje(M, r, dio, ulaz, tol, s, i) {
  const pitaT = r.pita === "t" || (r.pita === "trojna" && dio === 0);
  const jed = pitaT ? (r.pita === "t" ? r.jed : M.os.jx) : M.os.jy;
  const tocno = tocnoOcitanja(M, r, dio);
  const krivo = [];
  const autor = (s.krivo ?? []).filter(
    (k) => (k.korak ?? traziOf(s).length - 1) === i,
  );
  const savjet =
    s.savjet ||
    (r.pita === "trojna"
      ? "Trojna točka je ondje gdje se sastaju sve tri krivulje. Spusti se okomito do osi temperature i vodoravno do osi tlaka."
      : r.pita === "t"
        ? `Kreni od ${r.P.zp} na okomitoj osi vodoravno do krivulje, pa okomito dolje do osi temperature.`
        : `Kreni od ${r.P.zt} na vodoravnoj osi okomito gore do krivulje, pa vodoravno do osi tlaka.`);
  if (pitaT) {
    const tolT = tol.t;
    const dodaj = (v, poruka) =>
      isNum(v) &&
      !near(v, tocno, tolT) &&
      krivo.push({ vrijednost: v, poruka, tolerancija: tolT });
    for (const d of r.drugi ?? [])
      dodaj(
        uUJed(M, d.u, jed),
        `To je temperatura na ${KRIVULJA_GEN[d.krivulja].replace("krivulja", "krivulji")} (ravnoteža ${FAZA_IME[KRIVULJA_FAZE[d.krivulja][0]]} ⇌ ${FAZA_IME[KRIVULJA_FAZE[d.krivulja][1]]}). Traži se ravnoteža ${FAZA_IME[KRIVULJA_FAZE[r.krivulja][0]]} ⇌ ${FAZA_IME[KRIVULJA_FAZE[r.krivulja][1]]}.`,
      );
    if (jed === "°C")
      dodaj(tocno + 273.15, "To je temperatura u kelvinima. Upiši je u °C.");
    if (jed === "K")
      dodaj(
        tocno - 273.15,
        "To je temperatura u °C. Upiši je u kelvinima (T / K = t / °C + 273).",
      );
    if (r.pita === "t" && !M.log)
      dodaj(
        pOd(M, r.w),
        "To je zadani tlak. Traži se temperatura: vrijednost na vodoravnoj osi.",
      );
    if (r.pita === "trojna" && !M.log)
      dodaj(pOd(M, r.w), "To je tlak trojne točke. Ovdje upiši temperaturu.");
    krivo.push(...autor);
    const res = checkNumber({
      input: ulaz,
      answer: tocno,
      tol: tolT,
      unit: jed,
      krivo,
      savjet,
    });
    return res;
  }
  // tlak
  if (M.log) {
    const n = citaj(ulaz, jed);
    if (!isNum(n))
      return {
        tocno: false,
        prazno: true,
        poruka: "Upiši broj (npr. 5·10^6 ili 5e6).",
      };
    if (n > 0 && Math.abs(Math.log10(n) - Math.log10(tocno)) <= tol.p)
      return { tocno: true };
    if (
      r.pita === "p" &&
      isNum(r.P.u) &&
      n > 0 &&
      near(n, uUJed(M, r.P.u, M.os.jx), 1)
    )
      return {
        tocno: false,
        poruka:
          "To je zadana temperatura. Traži se tlak: vrijednost na okomitoj osi.",
      };
    for (const k of autor)
      if (near(n, k.vrijednost, Math.abs(k.vrijednost) * 0.05))
        return { tocno: false, poruka: k.poruka };
    return {
      tocno: false,
      poruka: `${savjet} Os tlaka je logaritamska: svaka glavna crta je deset puta veći tlak.`,
    };
  }
  const tolP = tol.p;
  const dodaj = (v, poruka) =>
    isNum(v) &&
    !near(v, tocno, tolP) &&
    krivo.push({ vrijednost: v, poruka, tolerancija: tolP });
  if (r.pita === "p") {
    for (const d of r.drugi ?? [])
      dodaj(
        pOd(M, d.w),
        `To je tlak na ${KRIVULJA_GEN[d.krivulja].replace("krivulja", "krivulji")}. Traži se ravnoteža ${FAZA_IME[KRIVULJA_FAZE[r.krivulja][0]]} ⇌ ${FAZA_IME[KRIVULJA_FAZE[r.krivulja][1]]}.`,
      );
    const tz = r.P.u;
    if (isNum(tz))
      krivo.push({
        vrijednost:
          r.P.dano === "K"
            ? tz + (M.os.jx === "K" ? 0 : 273.15)
            : M.os.jx === "K"
              ? tz - 273.15
              : tz,
        poruka:
          "To je zadana temperatura. Traži se tlak: vrijednost na okomitoj osi.",
        tolerancija: 0.5,
      });
  }
  if (r.pita === "trojna")
    krivo.push({
      vrijednost: r.u,
      poruka: "To je temperatura trojne točke. Ovdje upiši tlak.",
      tolerancija: tol.t,
    });
  krivo.push(...autor);
  return checkNumber({
    input: ulaz,
    answer: tocno,
    tol: tolP,
    unit: jed,
    krivo: krivo.filter((k) => !near(k.vrijednost, tocno, tolP)),
    savjet,
  });
}

function provjeriKorakPuta(M, P, i, ulaz, tol, s) {
  const k = P.koraci[i];
  const izobara = P.vrsta === "izobara";
  const tocno = izobara ? k.u : pOd(M, k.w);
  const t = izobara ? tol.t : tol.p;
  const jed = jedinicaKoraka(M, P);
  const krivo = [];
  const dodaj = (v, poruka) =>
    isNum(v) &&
    !near(v, tocno, t) &&
    krivo.push({ vrijednost: v, poruka, tolerancija: t });
  P.koraci.forEach(
    (q, j) =>
      j !== i &&
      dodaj(
        izobara ? q.u : pOd(M, q.w),
        `To je vrijednost pri kojoj je ${PRIJELAZ_IME[q.prijelaz]}.`,
      ),
  );
  if (izobara) {
    dodaj(
      pOd(M, P.A.w),
      "To je tlak puta. Upiši temperaturu pri kojoj crta siječe krivulju.",
    );
    if (jed === "°C") dodaj(tocno + 273.15, "To je u kelvinima. Upiši u °C.");
    if (jed === "K") dodaj(tocno - 273.15, "To je u °C. Upiši u kelvinima.");
  } else
    dodaj(
      P.A.u,
      "To je temperatura puta. Upiši tlak pri kojem crta siječe krivulju.",
    );
  if (M.log && !izobara) {
    const n = citaj(ulaz, jed);
    if (!isNum(n)) return { tocno: false, prazno: true, poruka: "Upiši broj." };
    if (n > 0 && Math.abs(Math.log10(n) - k.w) <= tol.p) return { tocno: true };
    return {
      tocno: false,
      poruka:
        "Očitaj tlak pri kojem crta siječe krivulju (os je logaritamska).",
    };
  }
  return checkNumber({
    input: ulaz,
    answer: tocno,
    tol: t,
    unit: jed,
    krivo,
    savjet:
      s.savjet ||
      `Nađi gdje crta puta siječe ${KRIVULJA_AK[Object.keys(KRIVULJA_FAZE).find((q) => KRIVULJA_FAZE[q] === normStanje(PRIJELAZI[k.prijelaz]))]} i očitaj ${izobara ? "temperaturu" : "tlak"}.`,
  });
}

function porukaPuta(M, P, niz, s) {
  const pravi = P.niz;
  if (s.savjet) return s.savjet;
  if (P.vrsta === "izravno") {
    const iz = PRIJELAZI[niz[0]];
    const tA = P.fA === iz[0];
    const tB = P.fB === iz[1];
    if (tA && !tB)
      return `Početak je dobar: na početku je tvar u ${lokFaze(P.fA)} stanju. Pogledaj u kojem je području konačna točka (${opisTocke(P.B)}).`;
    if (!tA && tB)
      return `Kraj je dobar: na kraju je tvar u ${lokFaze(P.fB)} stanju. Pogledaj u kojem je području početna točka (${opisTocke(P.A)}).`;
    if (iz[0] === P.fB && iz[1] === P.fA)
      return "Pazi na smjer: promjena ide od početne prema konačnoj točki.";
    const kelvin =
      (P.A.dano === "C" && M.os.jx === "K") ||
      (P.A.dano === "K" && M.os.jx === "°C");
    return `Odredi u kojem je području početna točka (${opisTocke(P.A)}), a u kojem konačna (${opisTocke(P.B)}).${kelvin ? ` Os temperature je u ${M.os.jx === "K" ? "kelvinima: T / K = t / °C + 273" : "°C"}.` : ""}`;
  }
  const smjer =
    P.vrsta === "izobara"
      ? P.desno
        ? "tvar se grije"
        : "tvar se hladi"
      : P.gore
        ? "tlak raste"
        : "tlak pada";
  if (
    niz.length === pravi.length &&
    niz.every((x, i) => x === SUPROTNO[pravi[i]])
  )
    return `Pazi na smjer: ${smjer}. Promjena u suprotnom smjeru ima suprotan naziv (taljenje ↔ skrućivanje, isparavanje ↔ ukapljivanje, sublimacija ↔ depozicija).`;
  const tekuce = (x) => PRIJELAZI[x].includes("l");
  if (P.vrsta === "izobara" && P.A.w < M.wT && niz.some(tekuce))
    return `Tlak puta (${P.A.zp ?? "zadani"}) niži je od tlaka trojne točke: pri njemu tekuća faza ne postoji, pa tvar ne može biti tekuća. Crta siječe samo krivulju ${pravi.includes("sublimacija") || pravi.includes("depozicija") ? "sublimacije" : "koja je ispod trojne točke"}.`;
  if (
    P.vrsta === "izobara" &&
    P.A.w > M.wT &&
    pravi.some(tekuce) &&
    niz.some((x) => x === "sublimacija" || x === "depozicija")
  )
    return "Tlak puta viši je od tlaka trojne točke: crta prolazi kroz područje tekućine, pa tvar ne prelazi izravno iz čvrstog u plin.";
  if (
    niz.length === pravi.length &&
    [...niz].sort().join() === [...pravi].sort().join()
  )
    return "Promjene su dobre, ali redoslijed nije: prati crtu od početne točke prema konačnoj.";
  if (niz.length < pravi.length && niz.every((x) => pravi.includes(x)))
    return "Crta siječe još jednu krivulju. Prati je od početne do konačne točke i zapiši svaku faznu promjenu.";
  if (niz.length > pravi.length)
    return "Neke od tih promjena nema na putu: zapiši samo krivulje koje crta siječe.";
  return `Prati crtu od početne točke (${FAZA_IME[P.fA]} stanje) i zapiši svaku krivulju koju siječe: krivulja dijeli dvije faze, a prijelaz ide u smjeru puta (${smjer}).`;
}

// vlastiti dijagram: građa i smisao krivulja
function validirajVlastiti(d, need) {
  if (
    !need(
      d && typeof d === "object" && !Array.isArray(d),
      "dijagram je ime ugrađenog ili {os, trojna, sublimacija, taljenje, isparavanje, izvor}",
    )
  )
    return false;
  for (const k of Object.keys(d))
    need(
      [
        "tvar",
        "naziv",
        "os",
        "trojna",
        "sublimacija",
        "taljenje",
        "isparavanje",
        "zaokruzi",
        "izvor",
        "polozaj",
        "nazivi",
        "oznaka_trojne",
        "napomena",
      ].includes(k),
      `dijagram ne poznaje polje „${k}“`,
    );
  need(
    isText(d.izvor),
    "dijagram.izvor je tekst (odakle su podaci: zadatak, ispit)",
  );
  const os = d.os;
  if (
    !need(
      os &&
        typeof os === "object" &&
        par(os.x) &&
        par(os.y) &&
        Array.isArray(os.mreza) &&
        os.mreza.length === 2 &&
        os.mreza.every((x) => isNum(x) && x > 0),
      "dijagram.os je {x: [od, do], y: [od, do], mreza: [korak t, korak p], jx, jy}",
    )
  )
    return false;
  need(["°C", "K"].includes(os.jx), 'os.jx je "°C" ili "K"');
  need(
    ["Pa", "kPa", "MPa", "bar", "atm"].includes(os.jy),
    'os.jy je "Pa", "kPa", "MPa", "bar" ili "atm"',
  );
  need(!os.shema, "vlastiti dijagram ne može biti shematski");
  if (os.log)
    need(os.y[0] > 0, "na logaritamskoj osi y počinje pozitivnim brojem");
  if (os.fino != null)
    need(
      Array.isArray(os.fino) &&
        os.fino.length === 2 &&
        os.fino.every((x) => isNum(x) && x > 0),
      "os.fino je [korak t, korak p]",
    );
  const ly = os.log ? [Math.log10(os.y[0]), Math.log10(os.y[1])] : os.y;
  need(
    (os.x[1] - os.x[0]) / os.mreza[0] <= 20 &&
      (ly[1] - ly[0]) / os.mreza[1] <= 20,
    "mreža je pregusta (najviše 20 polja po osi)",
  );
  const tocke = (P, ime) =>
    need(
      Array.isArray(P) &&
        P.length >= 2 &&
        P.length <= 60 &&
        P.every(
          (q) =>
            Array.isArray(q) &&
            q.length === 2 &&
            q.every(isNum) &&
            (!os.log || q[1] > 0),
        ),
      `dijagram.${ime} je popis 2–60 točaka [t, p]`,
    );
  if (
    !need(
      Array.isArray(d.trojna) && d.trojna.length === 2 && d.trojna.every(isNum),
      "dijagram.trojna je [t, p]",
    )
  )
    return false;
  const ok = [
    tocke(d.sublimacija, "sublimacija"),
    tocke(d.taljenje, "taljenje"),
    tocke(d.isparavanje, "isparavanje"),
  ].every(Boolean);
  if (!ok) return false;
  const [tT, pT] = d.trojna;
  const isti = (q) =>
    Math.abs(q[0] - tT) < 1e-9 &&
    Math.abs(q[1] - pT) <= 1e-9 * Math.max(1, Math.abs(pT));
  const S = d.sublimacija;
  const L = d.taljenje;
  const V = d.isparavanje;
  need(isti(S[S.length - 1]), "sublimacija završava u trojnoj točki");
  need(
    isti(L[0]) && isti(V[0]),
    "taljenje i isparavanje počinju u trojnoj točki",
  );
  need(
    Math.abs(S[0][0] - os.x[0]) < 1e-9,
    "sublimacija počinje na lijevom rubu grafa (os.x[0])",
  );
  const raste = (P, k) => P.every((q, i) => i === 0 || q[k] > P[i - 1][k]);
  need(raste(S, 0) && raste(S, 1), "na krivulji sublimacije t i p rastu");
  need(raste(V, 0) && raste(V, 1), "na krivulji isparavanja t i p rastu");
  need(raste(L, 1), "na krivulji taljenja p raste");
  need(
    L.every(
      (q, i) =>
        i < 2 || Math.sign(q[0] - L[i - 1][0]) === Math.sign(L[1][0] - L[0][0]),
    ),
    "krivulja taljenja ide samo ulijevo ili samo udesno",
  );
  const unutra = (q) =>
    q[0] >= os.x[0] - 1e-9 && q[0] <= os.x[1] + 1e-9 && q[1] >= os.y[0] - 1e-9;
  need(
    [...S, ...L, ...V].every(unutra),
    "točke krivulja moraju biti unutar osi (krivulje smiju izaći samo preko gornjeg ruba)",
  );
  need(
    L[L.length - 1][1] >= os.y[1] - 1e-9 * Math.max(1, os.y[1]),
    "krivulja taljenja ide do vrha grafa (os.y[1]), inače se ne zna gdje je granica čvrstog i tekućeg",
  );
  need(
    V[V.length - 1][0] >= os.x[1] - 1e-9 || V[V.length - 1][1] >= os.y[1],
    "krivulja isparavanja ide do desnog ili gornjeg ruba grafa",
  );
  if (d.zaokruzi != null)
    need(
      Array.isArray(d.zaokruzi) &&
        d.zaokruzi.length === 2 &&
        d.zaokruzi.every((x) => isNum(x) && x > 0),
      "dijagram.zaokruzi je [t, p]",
    );
  // taljenje iznad isparavanja (inače područja nemaju smisla)
  const M = izgradi({ ...d, os: { ...os } });
  if (!need(!M.greska, "dijagram se ne da složiti")) return false;
  for (let i = 1; i <= 20; i++) {
    const w = M.wT + ((M.taljVrh - M.wT) * i) / 20;
    const u = M.talj(w);
    if (u > M.uT && u <= M.vapKraj) {
      if (
        !need(
          M.vap(u) < w,
          "krivulja taljenja mora biti iznad krivulje isparavanja",
        )
      )
        break;
    }
  }
  return true;
}
