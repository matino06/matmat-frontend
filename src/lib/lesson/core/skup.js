// Skup realnih brojeva kao unija intervala, u hrvatskom školskom zapisu: ⟨−∞, 1⟩ ∪ [3, +∞⟩, {2}, ∅, ℝ.
// Kraj intervala smije biti izraz („2-sqrt(3)“). Skup je popis dijelova {a, b, ua, ub, ta, tb}: a i b su brojevi
// (±Infinity za beskonačno), ua/ub kaže je li kraj uključen, ta/tb je LaTeX kraja.
import { ucitaj, vrijednost } from "./izraz.js";

const EPS = 1e-9;
const isti = (x, y) => x === y || (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= EPS * Math.max(1, Math.abs(x)));

function kraj(t) {
  const s = t.trim().replace(/[−–]/g, "-").replace(/\s+/g, "");
  if (/^-(∞|inf)$/.test(s)) return { v: -Infinity, tex: "-\\infty" };
  if (/^\+?(∞|inf)$/.test(s)) return { v: Infinity, tex: "+\\infty" };
  const v = vrijednost(s);
  if (v == null) throw new Error(`kraj intervala „${t.trim()}“ nije broj`);
  return { v, tex: ucitaj(s).tex };
}

// Tekst → skup (sređen); baca grešku s porukom ako zapis ne valja.
export function parseSkup(src) {
  const s = String(src ?? "").trim();
  if (/^(∅|\{\s*\}|prazan skup)$/i.test(s)) return [];
  if (/^(R|ℝ)$/.test(s)) return [{ a: -Infinity, b: Infinity, ua: false, ub: false, ta: "-\\infty", tb: "+\\infty" }];
  const dijelovi = s.split(/∪|\s+U\s+|\bU\b/).map((d) => d.trim());
  if (dijelovi.some((d) => !d)) throw new Error("prazan dio unije");
  const out = [];
  for (const d of dijelovi) {
    if (d.startsWith("{")) {
      if (!d.endsWith("}")) throw new Error(`„${d}“: skup točaka mora završiti s }`);
      for (const t of d.slice(1, -1).split(";")) {
        const k = kraj(t);
        if (!Number.isFinite(k.v)) throw new Error("točka ne može biti beskonačna");
        out.push({ a: k.v, b: k.v, ua: true, ub: true, ta: k.tex, tb: k.tex });
      }
      continue;
    }
    const [o, z] = [d[0], d.at(-1)];
    if (!"<⟨([".includes(o) || !">⟩)]".includes(z)) throw new Error(`„${d}“: interval počinje s ⟨ ili [ i završava s ⟩ ili ]`);
    const unutra = d.slice(1, -1);
    const krajevi = unutra.includes(";") ? unutra.split(";") : unutra.split(",");
    if (krajevi.length !== 2) throw new Error(`„${d}“: interval ima dva kraja odvojena zarezom`);
    const [a, b] = krajevi.map(kraj);
    const ua = o === "[";
    const ub = z === "]";
    if (!(a.v < b.v)) throw new Error(`„${d}“: lijevi kraj mora biti manji od desnog`);
    if ((ua && !Number.isFinite(a.v)) || (ub && !Number.isFinite(b.v))) throw new Error(`„${d}“: beskonačnost nikad nije uključena, uz nju ide ⟨ ili ⟩`);
    out.push({ a: a.v, b: b.v, ua, ub, ta: a.tex, tb: b.tex });
  }
  return sredi(out);
}

// Spaja dijelove koji se preklapaju ili dodiruju u uključenoj točki, i slaže ih slijeva nadesno.
export function sredi(dijelovi) {
  const d = dijelovi.map((x) => ({ ...x })).sort((x, y) => x.a - y.a || (x.ua === y.ua ? 0 : x.ua ? -1 : 1));
  const out = [];
  for (const x of d) {
    const cur = out.at(-1);
    if (cur && (x.a < cur.b - EPS || (isti(x.a, cur.b) && (cur.ub || x.ua)))) {
      if (isti(x.a, cur.a)) cur.ua ||= x.ua;
      if (x.b > cur.b + EPS) Object.assign(cur, { b: x.b, ub: x.ub, tb: x.tb });
      else if (isti(x.b, cur.b)) cur.ub ||= x.ub;
    } else out.push(x);
  }
  return out;
}

export function jednakiSkupovi(s1, s2) {
  if (s1.length !== s2.length) return false;
  return s1.every((x, i) => {
    const y = s2[i];
    return isti(x.a, y.a) && isti(x.b, y.b) && (x.ua === y.ua || !Number.isFinite(x.a)) && (x.ub === y.ub || !Number.isFinite(x.b));
  });
}

export function sadrzi(skup, x) {
  return skup.some((d) => (x > d.a || (d.ua && isti(x, d.a))) && (x < d.b || (d.ub && isti(x, d.b))));
}

// LaTeX skupa: ⟨−∞, 1⟩ ∪ [3, 7], {2}, ∅, ℝ
export function texSkupa(skup) {
  if (!skup.length) return "\\emptyset";
  if (skup.length === 1 && skup[0].a === -Infinity && skup[0].b === Infinity) return "\\mathbb{R}";
  return skup
    .map((d) => (isti(d.a, d.b) ? `\\{${d.ta}\\}` : `${d.ua ? "\\left[" : "\\left\\langle"} ${d.ta},\\ ${d.tb} ${d.ub ? "\\right]" : "\\right\\rangle"}`))
    .join(" \\cup ");
}
