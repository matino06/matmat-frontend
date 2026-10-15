// Mjerne jedinice za widget pretvorba_jedinica: faktor svake jedinice prema osnovnoj, redom od najveće.
// Točan rezultat i tipične krive rezultate (krivi faktor, krivi smjer) računa kod, ne model.

export const UNITS = {
  duljina: [
    ["km", 1000],
    ["m", 1],
    ["dm", 0.1],
    ["cm", 0.01],
    ["mm", 0.001],
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
};

// Pravopis jedinica koje učenik ili model pišu drukčije
const ALIASES = { "m2": "m²", "cm2": "cm²", "mm2": "mm²", "dm2": "dm²", "km2": "km²", "m3": "m³", "cm3": "cm³", "dm3": "dm³", "mm3": "mm³", l: "L", ml: "mL", dl: "dL", cl: "cL", hl: "hL", "g/cm3": "g/cm³", "kg/m3": "kg/m³", "kg/dm3": "kg/dm³" };

export const normUnit = (u) => (typeof u === "string" ? (ALIASES[u.trim()] ?? u.trim()) : u);

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

// Jedinice veličine kao „stube“ od veće prema manjoj (za crtež u widgetu): samo one između `from` i `to`.
export function staircase(velicina, from, to) {
  const list = UNITS[velicina] ?? [];
  const i = list.findIndex(([u]) => u === normUnit(from));
  const j = list.findIndex(([u]) => u === normUnit(to));
  if (i < 0 || j < 0) return [];
  const [lo, hi] = i < j ? [i, j] : [j, i];
  return list.slice(lo, hi + 1).map(([u, f]) => ({ jedinica: u, faktor: f }));
}

// Rezultati tipičnih grešaka: za površinu i volumen faktor kao kod duljine (×10 umjesto ×100 / ×1000),
// i pretvorba u krivom smjeru. Vraća [{vrijednost, poruka}] bez točnog rezultata.
export function typicalMistakes(velicina, value, from, to) {
  const right = convert(velicina, value, from, to);
  if (right == null || right === value) return [];
  const out = [];
  const ratio = right / value;
  const wrongDir = value / ratio;
  out.push({ vrijednost: wrongDir, poruka: `Pretvorba je u krivom smjeru. Iz ${from} u ${to} broj ${ratio > 1 ? "raste" : "pada"}, jer je ${ratio > 1 ? `${to} manja` : `${to} veća`} jedinica.` });
  const power = { povrsina: 2, volumen: 3 }[velicina];
  const special = ["L", "dL", "cL", "mL", "hL", "ha", "a"];
  if (power && !special.includes(normUnit(from)) && !special.includes(normUnit(to))) {
    // isti broj koraka kao kod duljine: faktor bez kvadrata/kuba
    const asLength = value * 10 ** (Math.log10(ratio) / power);
    out.push({
      vrijednost: asLength,
      poruka: power === 2 ? "Ovo je pretvorba kao za duljinu. Kod površine svaki korak između susjednih jedinica množi se sa 100, ne s 10." : "Ovo je pretvorba kao za duljinu. Kod volumena svaki korak između susjednih jedinica množi se s 1000, ne s 10.",
    });
  }
  return out.filter((m) => Number.isFinite(m.vrijednost) && Math.abs(m.vrijednost - right) > 1e-9 * Math.max(1, Math.abs(right)));
}
