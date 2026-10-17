// Skup realnih brojeva kao unija intervala, u hrvatskom školskom zapisu: ⟨−∞, 1⟩ ∪ [3, +∞⟩, {2}, ∅, ℝ.
// Kraj intervala smije biti izraz („2-sqrt(3)“). Skup je popis dijelova {a, b, ua, ub, ta, tb}: a i b su brojevi
// (±Infinity za beskonačno), ua/ub kaže je li kraj uključen, ta/tb je LaTeX kraja.
import { ucitaj, vrijednost, izLatexa } from "./izraz.js";

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

// Tekst → skup (sređen); baca grešku s porukom ako zapis ne valja. Uz uniju (U, ∪) zna i razliku („R \\ {-4}“,
// „[0, inf> \\ {1; 2}“) i presjek (∩), slijeva nadesno.
export function parseSkup(src) {
  const s = String(src ?? "").trim();
  const op = [...s.matchAll(/\s*(\\|∖|∩)\s*/g)].at(-1);
  if (op) {
    const lijevo = parseSkup(s.slice(0, op.index));
    const desno = parseSkup(s.slice(op.index + op[0].length));
    return op[1] === "∩" ? presjek(lijevo, desno) : razlika(lijevo, desno);
  }
  return parseUnije(s);
}

function parseUnije(s) {
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

// Komplement u ℝ: praznine između dijelova (kraj je uključen ako ga dio nije uključio).
export function komplement(skup) {
  const out = [];
  let a = { v: -Infinity, u: false, t: "-\\infty" };
  for (const d of sredi(skup)) {
    if (d.a > a.v || (isti(d.a, a.v) && a.u && !d.ua && Number.isFinite(d.a))) out.push({ a: a.v, b: d.a, ua: a.u, ub: !d.ua, ta: a.t, tb: d.ta });
    a = { v: d.b, u: !d.ub, t: d.tb };
  }
  if (a.v < Infinity) out.push({ a: a.v, b: Infinity, ua: a.u, ub: false, ta: a.t, tb: "+\\infty" });
  return sredi(out.filter((d) => d.a < d.b || (isti(d.a, d.b) && d.ua && d.ub)));
}

export function presjek(s1, s2) {
  const out = [];
  for (const x of s1) {
    for (const y of s2) {
      const [a, ua, ta] = x.a > y.a || (isti(x.a, y.a) && !x.ua) ? [x.a, x.ua, x.ta] : [y.a, y.ua, y.ta];
      const [b, ub, tb] = x.b < y.b || (isti(x.b, y.b) && !x.ub) ? [x.b, x.ub, x.tb] : [y.b, y.ub, y.tb];
      if (a < b - EPS || (isti(a, b) && ua && ub)) out.push({ a, b, ua, ub, ta, tb });
    }
  }
  return sredi(out);
}

export const razlika = (s1, s2) => presjek(s1, komplement(s2));

// Zapis iz matematičkog polja (LaTeX, tipkovnica „∈ℝ“) → tekst za parseSkup: „\left\langle-\infty,\frac{1}{2}\right]“
// → „<-∞;((1)/(2))]“. Krajevi su izrazi (razlomak, korijen, π). Baca grešku s porukom za učenika.
export function tekstSkupaIzLatexa(latex) {
  let s = String(latex ?? "")
    .replace(/\{,\}/g, ".")
    .replace(/\\(?:left|right|mleft|mright)\s*\./g, "")
    .replace(/\\(?:left|right|mleft|mright|bigl|bigr|Bigl|Bigr)(?![A-Za-z])\s*/g, "")
    .replace(/\\langle(?![A-Za-z])|⟨/g, "<")
    .replace(/\\rangle(?![A-Za-z])|⟩/g, ">")
    .replace(/\\lbrack(?![A-Za-z])/g, "[")
    .replace(/\\rbrack(?![A-Za-z])/g, "]")
    .replace(/\\lbrace(?![A-Za-z])|\\\{/g, "⦃")
    .replace(/\\rbrace(?![A-Za-z])|\\\}/g, "⦄")
    .replace(/\\cup(?![A-Za-z])|∪/g, "U")
    .replace(/\\cap(?![A-Za-z])/g, "∩")
    .replace(/\\setminus(?![A-Za-z])|\\backslash(?![A-Za-z])|\\smallsetminus(?![A-Za-z])/g, "∖")
    .replace(/\\(?:emptyset|varnothing)(?![A-Za-z])/g, "∅")
    .replace(/\\mathbb\{R\}|\\R(?![A-Za-z])|ℝ/g, "R")
    .replace(/\\infty(?![A-Za-z])/g, "∞")
    .replace(/^\s*x\s*\\in(?![A-Za-z])/, "")
    .trim();
  if (!s) throw new Error("upiši skup");
  if (/\\placeholder/.test(s)) throw new Error("dovrši zapis (ostalo je prazno mjesto)");
  let i = 0;
  // kraj intervala ili točka skupa: sve do odvajača ili zagrade koja zatvara, osim unutar {…} i (…) izraza
  const kraj = (odvajaci) => {
    let t = "";
    let dub = 0;
    let zag = 0;
    while (i < s.length) {
      const c = s[i];
      if (s.startsWith("\\sqrt[", i)) {
        const j = s.indexOf("]", i);
        if (j < 0) throw new Error("nedostaje ] u korijenu");
        t += s.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      if (c === "{") dub++;
      else if (c === "}") dub--;
      else if (dub === 0) {
        if (c === "(") zag++;
        else if (c === ")" && zag > 0) zag--;
        else if (zag === 0 && (odvajaci.includes(c) || ">])⦄".includes(c))) break;
      }
      t += c;
      i++;
    }
    const k = t.trim();
    if (!k) throw new Error("nedostaje kraj intervala");
    if (/^[-+]?∞$/.test(k)) return k;
    return izLatexa(odvajaci === ";" ? k.replace(/(\d),(\d)/g, "$1.$2") : k).replace(/\s+/g, "");
  };
  // „<1,5; 3]“: uz točku-zarez zarez je decimalni
  const odvajac = () => {
    const zatvara = s.slice(i).search(/[>\])⦄]/);
    return s.slice(i, zatvara < 0 ? undefined : i + zatvara).includes(";") ? ";" : ",;";
  };
  let out = "";
  while (i < s.length) {
    const c = s[i];
    if (c === " ") i++;
    else if ("<[(".includes(c)) {
      i++;
      const od = odvajac();
      const a = kraj(od);
      if (![",", ";"].includes(s[i])) throw new Error("odvoji krajeve intervala zarezom ili točkom-zarezom");
      i++;
      const b = kraj(od);
      const z = s[i++];
      if (!z || !">])".includes(z)) throw new Error("zatvori interval s ⟩ ili ]");
      out += `${c}${a};${b}${z}`;
    } else if (c === "⦃") {
      i++;
      const od = odvajac();
      const tocke = [kraj(od)];
      while ([",", ";"].includes(s[i])) {
        i++;
        tocke.push(kraj(od));
      }
      if (s[i++] !== "⦄") throw new Error("zatvori skup točaka sa }");
      out += `{${tocke.join(";")}}`;
    } else if ("U∩∖".includes(c)) {
      out += ` ${c} `;
      i++;
    } else if (c === "∅" || c === "R") {
      out += c;
      i++;
    } else throw new Error(`ne razumijem „${c}“ (skup piši kao ⟨a, b⟩, [a, b], {a}, ∅ ili ℝ, a dijelove spoji s ∪)`);
  }
  return out;
}

// LaTeX iz matematičkog polja → skup, ili { greska }.
export function ucitajSkupLatex(latex) {
  try {
    return { skup: parseSkup(tekstSkupaIzLatexa(latex)) };
  } catch (e) {
    return { greska: e.message };
  }
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
