// Brojevi u interaktivnoj lekciji: učenik piše hrvatski („1,5“, „1 500“, „−5“, „3/4“), a provjera mora
// prihvatiti sve te zapise. Isti kod koristi validator na serveru, pa ovdje nema ničega iz preglednika.

// Broj iz učenikova unosa, ili null ako to nije broj. Mjerna jedinica na kraju se zanemaruje („80 cm³“).
export function parseNumber(input, unit = "") {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  let s = input
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/\u00a0/g, " ");
  if (unit && s.endsWith(unit)) s = s.slice(0, -unit.length).trim();
  s = s.replace(/\s+/g, "");
  if (!s) return null;
  const sci = parseSci(s);
  if (sci !== undefined) return sci;
  const frac = s.match(/^(-?\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/);
  if (frac) {
    const d = toNumber(frac[2]);
    return d ? toNumber(frac[1]) / d : null;
  }
  // „1.500“ (hrvatski zapis tisućica): jedna točka i točno tri znamenke iza nje, bez vodeće nule.
  // „0.125“ i „1.5“ ostaju decimalni brojevi.
  if (/^-?[1-9]\d{0,2}\.\d{3}$/.test(s)) s = s.replace(".", "");
  // „1.500,5“ i „1,500.5“: zadnji separator je decimalni, ostali su tisućice
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (lastSep >= 0 && (s.match(/[.,]/g) ?? []).length > 1) {
    s = s.slice(0, lastSep).replace(/[.,]/g, "") + "." + s.slice(lastSep + 1);
  }
  return toNumber(s);
}

// Znanstveni zapis (fizika): „1,2·10^24“, „1,2*10^-5“, „1,2x10^{-5}“, „1,2·10⁻⁵“, „10^-3“, „1,2e-5“.
// Vraća broj, null (zapis s potencijom, ali neispravan) ili undefined (nije znanstveni zapis).
const SUP = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
};
function parseSci(s) {
  const t = s
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+$/, (m) => "^" + [...m].map((c) => SUP[c]).join(""))
    .replace(/\\cdot|\\times/g, "·");
  const m =
    t.match(/^(-?)(?:(\d+(?:[.,]\d+)?)[·*x×⋅])?10\^\{?(-?\d+)\}?$/) ??
    t.match(/^(-?)(\d+(?:[.,]\d+)?)[eE]([+-]?\d+)$/);
  if (!m) return undefined;
  const mant = m[2] == null ? 1 : toNumber(m[2]);
  if (mant == null) return null;
  // preko „e“ zapisa, da 1,2·10⁻⁵ bude točno 0,000012 (1,2 · 10 ** −5 daje 0,0000119999…)
  const n = Number(`${m[1]}${mant}e${Number(m[3])}`);
  return Number.isFinite(n) ? n : null;
}

function toNumber(s) {
  if (!/^-?\d*(?:[.,]\d+)?$/.test(s) || s === "-" || s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Dopušteno odstupanje: zadano u specu, inače pola posto vrijednosti (zaokruživanje na 2–3 znamenke prolazi).
// Samo relativno: fizikalni iznosi znaju biti 10⁻¹⁹ (naboj elektrona), pa apsolutni prag kao 10⁻⁹ prihvaća sve.
export function tolerance(value, given) {
  if (typeof given === "number" && given >= 0) return given;
  return value === 0 ? 1e-9 : Math.abs(value) * 0.005;
}

export function near(a, b, tol) {
  return (
    typeof a === "number" &&
    typeof b === "number" &&
    // rezerva za greške zaokruživanja u računu, razmjerna veličini brojeva (ne apsolutna)
    Math.abs(a - b) <= tol + 1e-12 * Math.max(Math.abs(a), Math.abs(b))
  );
}

// Hrvatski zapis broja: decimalni zarez, bez suvišnih nula. Najmanje `digits` decimala, a za male brojeve
// toliko da ostanu tri značajne znamenke (5 cm³ = 0,000005 m³, a ne 0).
export function formatNumber(n, digits = 3) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  // vrlo veliki i vrlo mali brojevi (naboj elektrona, Avogadrova konstanta) samo u znanstvenom zapisu
  if (n !== 0 && (Math.abs(n) >= 1e9 || Math.abs(n) < 1e-6))
    return formatSci(n);
  const lead =
    n === 0 ? 0 : Math.max(0, -Math.floor(Math.log10(Math.abs(n))) - 1);
  const d = Math.min(12, Math.max(digits, lead + 3));
  // bez toLocaleString: isti kod radi i u GraalJS-u na backendu, gdje Intl ne mora postojati
  let t = n.toFixed(d);
  if (t.includes(".")) t = t.replace(/\.?0+$/, "");
  if (t === "-0") t = "0";
  return t.replace("-", "−").replace(".", ",");
}

// Fizikalni zapis: tri značajne znamenke, a izvan [0,001, 1 000 000) znanstveni zapis „4,8·10⁻¹⁸“.
const SUPERSKRIPT = {
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
export function formatSci(n, sig = 3) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  if (n === 0) return "0";
  const r = Number(n.toPrecision(sig));
  const e = Math.floor(Math.log10(Math.abs(r)));
  if (e >= -3 && e < 6) return formatNumber(r, Math.max(0, sig - 1 - e));
  const [m] = r.toExponential(sig - 1).split("e");
  const mant = String(Number(m)).replace("-", "−").replace(".", ",");
  return `${mant}·10${[...String(e)].map((c) => SUPERSKRIPT[c]).join("")}`;
}

export const isNum = (v) => typeof v === "number" && Number.isFinite(v);
