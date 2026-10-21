// Mjerne jedinice za widget pretvorba_jedinica: faktor svake jedinice prema osnovnoj, redom od najveće.
// Točan rezultat i tipične krive rezultate (krivi faktor, krivi smjer) računa kod, ne model.
import { parseNumber } from "./number.js";

export const UNITS = {
  duljina: [
    ["km", 1000],
    ["m", 1],
    ["dm", 0.1],
    ["cm", 0.01],
    ["mm", 0.001],
    ["µm", 1e-6],
    ["nm", 1e-9],
  ],
  povrsina: [
    ["km²", 1e6],
    ["ha", 1e4],
    ["a", 100],
    ["m²", 1],
    ["dm²", 1e-2],
    ["cm²", 1e-4],
    ["mm²", 1e-6],
  ],
  volumen: [
    ["m³", 1],
    ["hL", 0.1],
    ["dm³", 1e-3],
    ["L", 1e-3],
    ["dL", 1e-4],
    ["cL", 1e-5],
    ["cm³", 1e-6],
    ["mL", 1e-6],
    ["mm³", 1e-9],
  ],
  masa: [
    ["t", 1000],
    ["kg", 1],
    ["dag", 0.01],
    ["g", 0.001],
    ["mg", 1e-6],
  ],
  vrijeme: [
    ["h", 3600],
    ["min", 60],
    ["s", 1],
  ],
  gustoca: [
    ["g/cm³", 1000],
    ["kg/dm³", 1000],
    ["kg/m³", 1],
  ],
  // fizika (matura)
  brzina: [
    ["km/s", 1000],
    ["m/s", 1],
    ["km/h", 1 / 3.6],
    ["cm/s", 0.01],
  ],
  sila: [
    ["MN", 1e6],
    ["kN", 1e3],
    ["N", 1],
    ["mN", 1e-3],
  ],
  tlak: [
    ["MPa", 1e6],
    ["bar", 1e5],
    ["kPa", 1e3],
    ["hPa", 100],
    ["mbar", 100],
    ["Pa", 1],
  ],
  energija: [
    ["kWh", 3.6e6],
    ["MJ", 1e6],
    ["kJ", 1e3],
    ["J", 1],
    ["mJ", 1e-3],
  ],
  snaga: [
    ["MW", 1e6],
    ["kW", 1e3],
    ["W", 1],
    ["mW", 1e-3],
  ],
  naboj: [
    ["C", 1],
    ["mC", 1e-3],
    ["µC", 1e-6],
    ["nC", 1e-9],
    ["pC", 1e-12],
  ],
  kapacitet: [
    ["F", 1],
    ["mF", 1e-3],
    ["µF", 1e-6],
    ["nF", 1e-9],
    ["pF", 1e-12],
  ],
  struja: [
    ["kA", 1e3],
    ["A", 1],
    ["mA", 1e-3],
    ["µA", 1e-6],
  ],
  napon: [
    ["MV", 1e6],
    ["kV", 1e3],
    ["V", 1],
    ["mV", 1e-3],
  ],
  otpor: [
    ["MΩ", 1e6],
    ["kΩ", 1e3],
    ["Ω", 1],
    ["mΩ", 1e-3],
  ],
  magnetsko_polje: [
    ["T", 1],
    ["mT", 1e-3],
    ["µT", 1e-6],
  ],
  magnetski_tok: [
    ["Wb", 1],
    ["mWb", 1e-3],
    ["µWb", 1e-6],
  ],
  frekvencija: [
    ["GHz", 1e9],
    ["MHz", 1e6],
    ["kHz", 1e3],
    ["Hz", 1],
  ],
  protok: [
    ["m³/s", 1],
    ["m³/h", 1 / 3600],
    ["L/s", 1e-3],
    ["L/min", 1e-3 / 60],
  ],
  molarna_masa: [
    ["kg/mol", 1],
    ["g/mol", 1e-3],
  ],
};

// Pravopis jedinica koje učenik ili model pišu drukčije
const ALIASES = {
  m2: "m²",
  cm2: "cm²",
  mm2: "mm²",
  dm2: "dm²",
  km2: "km²",
  m3: "m³",
  cm3: "cm³",
  dm3: "dm³",
  mm3: "mm³",
  l: "L",
  ml: "mL",
  dl: "dL",
  cl: "cL",
  hl: "hL",
  "g/cm3": "g/cm³",
  "kg/m3": "kg/m³",
  "kg/dm3": "kg/dm³",
  "km/hr": "km/h",
  kmh: "km/h",
  μm: "µm",
  um: "µm",
  μC: "µC",
  uC: "µC",
  μF: "µF",
  uF: "µF",
  μA: "µA",
  uA: "µA",
  μT: "µT",
  uT: "µT",
  μWb: "µWb",
  ohm: "Ω",
  Ohm: "Ω",
  kohm: "kΩ",
  kOhm: "kΩ",
  Mohm: "MΩ",
  MOhm: "MΩ",
  Ω: "Ω",
  kΩ: "kΩ",
  MΩ: "MΩ",
  hz: "Hz", "m3/s": "m³/s", "m3/h": "m³/h", "l/s": "L/s", "l/min": "L/min",
  khz: "kHz",
  mhz: "MHz",
};

export const normUnit = (u) =>
  typeof u === "string" ? (ALIASES[u.trim()] ?? u.trim()) : u;

function factor(velicina, unit) {
  const row = UNITS[velicina]?.find(([u]) => u === normUnit(unit));
  return row ? row[1] : null;
}

export function convert(velicina, value, from, to) {
  const a = factor(velicina, from);
  const b = factor(velicina, to);
  if (a == null || b == null) return null;
  return (value * a) / b;
}

// Položaj jedinice na stubama veličine (0 = najveća), ili -1.
export const unitIndex = (velicina, unit) =>
  (UNITS[velicina] ?? []).findIndex(([u]) => u === normUnit(unit));

// Iznos u osnovnoj jedinici za jednu vrijednost ili mješoviti zapis („2 m 7 dm“ = [2, 7] u ["m", "dm"]).
export function toBase(velicina, values, units) {
  const vs = [].concat(values);
  const us = [].concat(units);
  if (!vs.length || vs.length !== us.length) return null;
  let sum = 0;
  for (let i = 0; i < vs.length; i++) {
    const f = factor(velicina, us[i]);
    if (f == null || typeof vs[i] !== "number" || !Number.isFinite(vs[i]))
      return null;
    sum += vs[i] * f;
  }
  return sum;
}

export function fromBase(velicina, base, unit) {
  const f = factor(velicina, unit);
  return f == null || base == null ? null : base / f;
}

// Iznos zapisan u tekstu („27 dm“, „2 m 7 dm“, „0,5 L“) → { velicina, base }, ili null ako tekst nije samo
// iznos s jedinicama jedne veličine.
export function parseQuantity(text) {
  const t = String(text ?? "")
    .trim()
    .replace(/\$/g, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\[ ,;]/g, " ")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³");
  const re = /(-?\d+(?:[.,]\d+)?)\s*([^\s\d]+)/g;
  const parts = [...t.matchAll(re)];
  if (!parts.length || t.replace(re, "").trim()) return null;
  const units = parts.map((m) => normUnit(m[2]));
  const values = parts.map((m) => parseNumber(m[1]));
  for (const velicina of Object.keys(UNITS)) {
    const base = toBase(velicina, values, units);
    if (base != null) return { velicina, base };
  }
  return null;
}

// Jedinice veličine kao „stube“ od veće prema manjoj (za crtež u widgetu): samo one između krajnjih zadanih
// jedinica (`from`, `to` mogu biti i popisi, za lanac ili mješoviti zapis).
export function staircase(velicina, from, to) {
  const list = UNITS[velicina] ?? [];
  const idx = [...[].concat(from), ...[].concat(to)].map((u) =>
    unitIndex(velicina, u),
  );
  if (!idx.length || idx.some((i) => i < 0)) return [];
  return list
    .slice(Math.min(...idx), Math.max(...idx) + 1)
    .map(([u, f]) => ({ jedinica: u, faktor: f }));
}

// Rezultati tipičnih grešaka: za površinu i volumen faktor kao kod duljine (×10 umjesto ×100 / ×1000),
// i pretvorba u krivom smjeru. Vraća [{vrijednost, poruka}] bez točnog rezultata.
export function typicalMistakes(velicina, value, from, to) {
  const right = convert(velicina, value, from, to);
  if (right == null || right === value) return [];
  const out = [];
  const ratio = right / value;
  const wrongDir = value / ratio;
  out.push({
    vrijednost: wrongDir,
    poruka: `Pretvorba je u krivom smjeru. Iz ${from} u ${to} broj ${ratio > 1 ? "raste" : "pada"}, jer je ${ratio > 1 ? `${to} manja` : `${to} veća`} jedinica.`,
  });
  const power = { povrsina: 2, volumen: 3 }[velicina];
  const special = ["L", "dL", "cL", "mL", "hL", "ha", "a"];
  if (
    power &&
    !special.includes(normUnit(from)) &&
    !special.includes(normUnit(to))
  ) {
    // isti broj koraka kao kod duljine: faktor bez kvadrata/kuba
    const asLength = value * 10 ** (Math.log10(ratio) / power);
    out.push({
      vrijednost: asLength,
      poruka:
        power === 2
          ? "Ovo je pretvorba kao za duljinu. Kod površine svaki korak između susjednih jedinica množi se sa 100, ne s 10."
          : "Ovo je pretvorba kao za duljinu. Kod volumena svaki korak između susjednih jedinica množi se s 1000, ne s 10.",
    });
  }
  return out.filter(
    (m) =>
      Number.isFinite(m.vrijednost) &&
      Math.abs(m.vrijednost - right) > 1e-9 * Math.max(1, Math.abs(right)),
  );
}
