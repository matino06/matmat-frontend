// Zajedničko widgetima skupine „fluidi i toplina“ (tlak_dubina, cijev, krivulja_zagrijavanja): g, jedinice
// odgovora, krive vrijednosti zbog krive jedinice i hrvatski zapis fizikalnih iznosa. Čisti JS (GraalJS na backendu).
import { isNum, formatNumber } from "../../core/number.js";

export const G = 9.81;
export const gOf = (s) => (isNum(s?.g) ? s.g : G);

// Jedinice u kojima učenik smije upisati odgovor: faktor prema SI jedinici.
export const JEDINICE = {
  tlak: { Pa: 1, hPa: 100, kPa: 1e3, MPa: 1e6 },
  sila: { N: 1, kN: 1e3 },
  brzina: { "m/s": 1 },
  protok: { "m³/s": 1, "L/s": 1e-3, "L/min": 1e-3 / 60 },
  vrijeme: { s: 1, min: 60 },
  energija: { J: 1, kJ: 1e3, MJ: 1e6 },
  temperatura: { "°C": 1 },
  duljina: { m: 1, cm: 0.01 },
};

export const jedinicaOk = (velicina, jed) =>
  typeof jed === "string" && jed in (JEDINICE[velicina] ?? {});
export const uJedinici = (si, velicina, jed) => si / JEDINICE[velicina][jed];

// Isti iznos u drugoj jedinici iste veličine: učenik je dobro računao, ali je upisao npr. Pa umjesto kPa.
export function krivoJedinica(si, velicina, jed) {
  return Object.entries(JEDINICE[velicina] ?? {})
    .filter(([u]) => u !== jed)
    .map(([u, f]) => ({
      vrijednost: si / f,
      poruka: `To je iznos u ${u}, a odgovor treba upisati u ${jed}.`,
    }));
}

// Krive vrijednosti zadane u SI jedinici → u jedinici odgovora, bez onih koje se poklapaju s točnim odgovorom
// ili međusobno (prva poruka pobjeđuje).
export function krivoU(lista, velicina, jed, tocno) {
  const out = [];
  for (const k of lista) {
    if (!isNum(k.si)) continue;
    const v = uJedinici(k.si, velicina, jed);
    if (Math.abs(v - tocno) <= Math.abs(tocno) * 0.006 + 1e-12) continue;
    if (
      out.some((o) => Math.abs(o.vrijednost - v) <= Math.abs(v) * 1e-6 + 1e-12)
    )
      continue;
    out.push({ vrijednost: v, poruka: k.poruka });
  }
  return out;
}

export function nacinOk(s, need, nacini, tip) {
  return need(
    nacini.includes(s.nacin),
    `${tip}.nacin mora biti jedan od: ${nacini.join(", ")}`,
  );
}

export const pozitivan = (v) => isNum(v) && v > 0;

// Iznos za prikaz: 4 značajne znamenke (7848 Pa, 142 500 Pa, 0,001885 m³/s) i razmak tisućica od 10 000.
export function fmtBroj(n, sig = 4) {
  if (!isNum(n)) return "—";
  if (n === 0) return "0";
  const r = Number(n.toPrecision(sig));
  const t = formatNumber(
    r,
    Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(r)))),
  );
  const [cijeli, dec] = t.split(",");
  const znak = cijeli.startsWith("−") ? "−" : "";
  const z = cijeli.replace("−", "");
  const grupirano =
    z.length > 4 ? z.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") : z;
  return `${znak}${grupirano}${dec ? `,${dec}` : ""}`;
}

export const fmtJ = (n, jed, sig = 4) =>
  `${fmtBroj(n, sig)}${jed ? `\u00a0${jed}` : ""}`;

// Masa za prikaz: ispod 1 kg u gramima (250 g), inače u kilogramima.
export const fmtMasa = (kg) =>
  kg < 1 ? fmtJ(kg * 1000, "g", 3) : fmtJ(kg, "kg", 3);
