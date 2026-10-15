// Brojevi u interaktivnoj lekciji: učenik piše hrvatski („1,5“, „1 500“, „−5“, „3/4“), a provjera mora
// prihvatiti sve te zapise. Isti kod koristi validator na serveru, pa ovdje nema ničega iz preglednika.

// Broj iz učenikova unosa, ili null ako to nije broj. Mjerna jedinica na kraju se zanemaruje („80 cm³“).
export function parseNumber(input, unit = "") {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/[−–]/g, "-").replace(/\u00a0/g, " ");
  if (unit && s.endsWith(unit)) s = s.slice(0, -unit.length).trim();
  s = s.replace(/\s+/g, "");
  if (!s) return null;
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

function toNumber(s) {
  if (!/^-?\d*(?:[.,]\d+)?$/.test(s) || s === "-" || s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Dopušteno odstupanje: zadano u specu, inače pola posto vrijednosti (zaokruživanje na 2–3 znamenke prolazi).
export function tolerance(value, given) {
  if (typeof given === "number" && given >= 0) return given;
  return Math.max(1e-9, Math.abs(value) * 0.005);
}

export function near(a, b, tol) {
  return typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tol + 1e-12;
}

// Hrvatski zapis broja: decimalni zarez, bez suvišnih nula. Najmanje `digits` decimala, a za male brojeve
// toliko da ostanu tri značajne znamenke (5 cm³ = 0,000005 m³, a ne 0).
export function formatNumber(n, digits = 3) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  const lead = n === 0 ? 0 : Math.max(0, -Math.floor(Math.log10(Math.abs(n))) - 1);
  const d = Math.min(12, Math.max(digits, lead + 3));
  // bez toLocaleString: isti kod radi i u GraalJS-u na backendu, gdje Intl ne mora postojati
  let t = n.toFixed(d);
  if (t.includes(".")) t = t.replace(/\.?0+$/, "");
  if (t === "-0") t = "0";
  return t.replace("-", "−").replace(".", ",");
}

export const isNum = (v) => typeof v === "number" && Number.isFinite(v);
