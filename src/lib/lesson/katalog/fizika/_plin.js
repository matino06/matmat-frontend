// Zajedničko za plinske widgete (plinski_dijagram, plin_posuda): konstante iz knjižice formula, jedinice i
// ispis iznosa. Čisti JS (bez DOM-a i Intl), jer ga izvršava i validator na backendu.
import { formatSci, isNum } from "../../core/number.js";

export const R = 8.314; // J K⁻¹ mol⁻¹
export const KB = 1.381e-23; // J/K
export const NA = 6.022e23; // mol⁻¹
export const GAMA = 5 / 3; // jednoatomni idealni plin (U = 3/2 nRT)
export const NULA_C = 273; // T = t + 273, kao u rješenjima zadataka

// faktor do SI jedinice
export const P_JEDINICE = { Pa: 1, kPa: 1e3, bar: 1e5, MPa: 1e6 };
export const V_JEDINICE = {
  "m³": 1,
  L: 1e-3,
  "dm³": 1e-3,
  mL: 1e-6,
  "cm³": 1e-6,
};
export const T_JEDINICE = ["K", "°C"];

export const IME = {
  p: "tlak",
  V: "volumen",
  T: "temperatura",
  n: "količina plina",
  N: "broj čestica",
  Ek: "srednja kinetička energija",
  vef: "efektivna brzina",
  U: "unutarnja energija",
  W: "rad",
  Q: "toplina",
  pV: "umnožak pV",
};
export const SIMBOL = {
  p: "p",
  V: "V",
  T: "T",
  n: "n",
  N: "N",
  Ek: "Ēk",
  vef: "v_ef",
  U: "U",
  W: "W",
  Q: "Q",
  pV: "pV",
};

// Iznos s jedinicom, tri značajne znamenke (fizikalni zapis), uz nerastavljiv razmak.
export const iznos = (v, jedinica = "") =>
  isNum(v) ? `${formatSci(v)}${jedinica ? `\u00a0${jedinica}` : ""}` : "—";

export const blizu = (a, b, rel = 1e-6) =>
  Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));
export const raspon = (r) =>
  Array.isArray(r) && r.length === 2 && r.every(isNum) && r[1] > r[0];
