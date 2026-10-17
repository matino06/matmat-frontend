// Matematički unos učenika kao na papiru („2π/3“, „√3 − 1“, „2x+1“, „x²“, „sin x“) → izraz za siguran kalkulator
// (core/expr.js), zapis u LaTeX-u i usporedba s točnim odgovorom. Uspoređuju se vrijednosti, a ne zapis, pa
// „1+2x“ i „2x+1“ ili „π/6“ i „pi/6“ vrijede jednako. Isti kod radi i u validatoru, pa ovdje nema preglednika.
import { compile, FUNKCIJE, KONSTANTE } from "./expr.js";

const ZNAKOVI = [
  [/[−–—]/g, "-"],
  [/[×·⋅∙]/g, "*"],
  [/[÷:]/g, "/"],
  [/π/g, " pi "],
  [/∞/g, " inf "],
  [/²/g, "^2"],
  [/³/g, "^3"],
  [/√\s*\(/g, " sqrt("],
  [/√\s*(\d+(?:[.,]\d+)?|[A-Za-z]+)/g, " sqrt($1)"],
  [/(\d),(\d)/g, "$1.$2"],
];

// Riječ bez razmaka („pix“, „sinx“, „2ab“) → poznati dijelovi (pi, x / sin, x / a, b), najduži prvi.
function rastavi(rijec, poznato) {
  const out = [];
  let i = 0;
  while (i < rijec.length) {
    const dio = poznato.filter((p) => rijec.startsWith(p, i)).sort((a, b) => b.length - a.length)[0];
    if (!dio) return null;
    out.push(dio);
    i += dio.length;
  }
  return out;
}

// Unos → izraz koji razumije expr.js: znakovi s tipkovnice, implicitno množenje („2x“, „2(x+1)“, „x(x−1)“)
// i funkcija bez zagrada („sin x“). Baca grešku s porukom za učenika.
export function pripremi(unos, varijable = []) {
  let s = String(unos ?? "");
  for (const [re, z] of ZNAKOVI) s = s.replace(re, z);
  const poznato = [...FUNKCIJE, ...KONSTANTE, ...varijable, "inf"];
  const tokeni = [];
  for (const m of s.matchAll(/\s*(?:(\d+(?:\.\d+)?)|([A-Za-z]+)|(\*\*|[-+*/^()]))|\s*(\S)/g)) {
    if (m[4]) throw new Error(`ne razumijem znak „${m[4]}“`);
    if (m[1]) tokeni.push({ t: "num", v: m[1] });
    else if (m[2]) {
      const dijelovi = poznato.includes(m[2]) ? [m[2]] : rastavi(m[2], poznato);
      if (!dijelovi) throw new Error(`ne razumijem „${m[2]}“`);
      for (const d of dijelovi) tokeni.push({ t: FUNKCIJE.includes(d) ? "fn" : "id", v: d });
    } else if (m[3]) tokeni.push({ t: "op", v: m[3] });
  }
  if (!tokeni.length) throw new Error("upiši izraz");
  const out = [];
  for (let i = 0; i < tokeni.length; i++) {
    const tk = tokeni[i];
    const prev = out.at(-1);
    const zavrsava = prev && (prev.t === "num" || prev.t === "id" || prev.v === ")");
    const pocinje = tk.t === "num" || tk.t === "id" || tk.t === "fn" || tk.v === "(";
    if (zavrsava && pocinje) out.push({ t: "op", v: "*" });
    out.push(tk);
    // „sin x“, „sin 2x“, „√“ je već sqrt(…): funkcija bez zagrade uzima sljedeći broj i/ili varijablu
    if (tk.t === "fn" && tokeni[i + 1]?.v !== "(") {
      const arg = [];
      while (tokeni[i + 1] && (tokeni[i + 1].t === "num" || tokeni[i + 1].t === "id") && arg.length < 2) arg.push(tokeni[++i]);
      if (!arg.length) throw new Error(`iza „${tk.v}“ treba broj ili zagrada`);
      out.push({ t: "op", v: "(" });
      arg.forEach((a, k) => {
        if (k) out.push({ t: "op", v: "*" });
        out.push(a);
      });
      out.push({ t: "op", v: ")" });
    }
  }
  return out.map((t) => t.v).join(" ");
}

// ── LaTeX iz matematičkog polja (MathLive, kao na probnoj maturi) → zapis za pripremi() ──────────
// „\frac{\pi}{6}“ → „((pi)/(6))“, „\sqrt[3]{x}“ → „((x)^(1/(3)))“, „x^{2}“ → „x^(2)“, „\left|x\right|“ → „abs(x)“.
const NAREDBE = {
  pi: " pi ", infty: " inf ", cdot: "*", times: "*", ast: "*", div: "/", exponentialE: " e ",
  sin: " sin ", cos: " cos ", tan: " tan ", tg: " tan ", ln: " ln ", log: " log ", exp: " exp ",
  vert: "|", lvert: "|", rvert: "|", mid: "|",
  ",": "", ";": "", ":": "", "!": "", " ": "", quad: "", qquad: "",
};
const OGRADE = { "(": "(", ")": ")", "[": "(", "]": ")", "|": "|", ".": "", "\\{": "(", "\\}": ")", "\\vert": "|", "\\lvert": "|", "\\rvert": "|", "\\langle": "(", "\\rangle": ")" };

export function izLatexa(latex) {
  const s = String(latex ?? "").replace(/\{,\}/g, ".");
  let i = 0;
  const naredba = () => {
    const m = /^\\([A-Za-z]+|.)/.exec(s.slice(i));
    i += m[0].length;
    return m[1];
  };
  const grupa = () => {
    while (s[i] === " ") i++;
    if (s[i] === "{") {
      let dubina = 0;
      const od = ++i;
      for (; i < s.length; i++) {
        if (s[i] === "{") dubina++;
        else if (s[i] === "}" && dubina-- === 0) break;
      }
      if (i >= s.length) throw new Error("nedostaje }");
      return s.slice(od, i++);
    }
    if (s[i] === "\\") {
      const od = i;
      naredba();
      return s.slice(od, i);
    }
    return s[i++] ?? "";
  };
  const ograda = () => {
    while (s[i] === " ") i++;
    for (const k of Object.keys(OGRADE).sort((a, b) => b.length - a.length)) {
      if (s.startsWith(k, i) && !(k.length > 1 && /[A-Za-z]/.test(s[i + k.length] ?? ""))) {
        i += k.length;
        return OGRADE[k];
      }
    }
    throw new Error("ne razumijem zagradu");
  };
  let out = "";
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const n = naredba();
      if (n === "frac" || n === "dfrac" || n === "tfrac") out += `((${izLatexa(grupa())})/(${izLatexa(grupa())}))`;
      else if (n === "sqrt") {
        let korijen = null;
        if (s[i] === "[") {
          const kraj = s.indexOf("]", i);
          korijen = s.slice(i + 1, kraj);
          i = kraj + 1;
        }
        const pod = izLatexa(grupa());
        out += korijen ? `((${pod})^(1/(${izLatexa(korijen)})))` : ` sqrt(${pod})`;
      } else if (["left", "right", "mleft", "mright", "bigl", "bigr", "Bigl", "Bigr"].includes(n)) out += ograda();
      else if (["operatorname", "mathrm", "text", "mathit", "textrm"].includes(n)) out += ` ${grupa()} `;
      else if (n === "placeholder") throw new Error("dovrši izraz (ostalo je prazno mjesto)");
      else if (n in NAREDBE) out += NAREDBE[n];
      else throw new Error(`ne razumijem „\\${n}“`);
    } else if (c === "^") {
      i++;
      out += `^(${izLatexa(grupa())})`;
    } else if (c === "_") throw new Error("indeksi (npr. log s bazom) još nisu podržani");
    else if (c === "{") out += `(${izLatexa(grupa())})`;
    else {
      out += c;
      i++;
    }
  }
  // |x| → abs(x): okomite crte idu u parovima (otvara, zatvara)
  let otvoreno = false;
  return out.replace(/\|/g, () => {
    otvoreno = !otvoreno;
    return otvoreno ? " abs(" : ")";
  });
}

// Unos iz matematičkog polja (LaTeX) → isto kao ucitaj().
export function ucitajLatex(latex, varijable = []) {
  try {
    return ucitaj(izLatexa(latex), varijable);
  } catch (e) {
    return { greska: e.message };
  }
}

// Unos → { izraz, fn, vars, tex } ili { greska }. Varijable koje nisu dopuštene su greška za učenika.
export function ucitaj(unos, varijable = []) {
  try {
    const izraz = pripremi(unos, varijable);
    if (/\binf\b/.test(izraz)) throw new Error("beskonačnost ovdje nije broj");
    const c = compile(izraz);
    const strane = c.vars.filter((v) => !varijable.includes(v));
    if (strane.length) throw new Error(`ne razumijem „${strane[0]}“`);
    return { izraz, fn: c.fn, vars: c.vars, tex: tex(c.tree) };
  } catch (e) {
    return { greska: e.message };
  }
}

// Točke u kojima se uspoređuju izrazi s varijablama: „nasumične“, ali iste svaki put (provjera je ponovljiva).
const UZORCI = [0.731, -1.37, 2.19, 3.71, -0.43, 1.618, -2.9, 0.217];

// Jesu li dva učitana izraza jednaka (za sve vrijednosti varijabli)? rel je dopušteno relativno odstupanje.
export function jednako(a, b, varijable = [], rel = 1e-9) {
  const isto = (x, y) => Math.abs(x - y) <= rel * Math.max(1, Math.abs(x), Math.abs(y));
  if (!varijable.length) {
    const [x, y] = [a.fn({}), b.fn({})];
    return Number.isFinite(x) && Number.isFinite(y) && isto(x, y);
  }
  let valjanih = 0;
  for (let k = 0; k < UZORCI.length; k++) {
    const v = Object.fromEntries(varijable.map((n, j) => [n, UZORCI[(k + 3 * j) % UZORCI.length] + j * 0.113]));
    const [x, y] = [a.fn(v), b.fn(v)];
    if (Number.isFinite(x) !== Number.isFinite(y)) return false;
    if (!Number.isFinite(x)) continue;
    if (!isto(x, y)) return false;
    valjanih++;
  }
  return valjanih >= 3;
}

// Vrijednost izraza bez varijabli (npr. kraj intervala „2-sqrt(3)“), ili null.
export function vrijednost(izraz) {
  const r = ucitaj(String(izraz));
  if (r.greska || r.vars.length) return null;
  const v = r.fn({});
  return Number.isFinite(v) ? v : null;
}

// ── LaTeX iz stabla izraza ──────────────────────────────────────────────────────────────────────
const RAZINA = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };
const razina = (n) => (n.op ? RAZINA[n.op] : 5);
const zagrade = (t) => `\\left(${t}\\right)`;
const omot = (n, min) => (razina(n) < min ? zagrade(tex(n)) : tex(n));
const TEX_FN = { sin: "\\sin", cos: "\\cos", tan: "\\tan", ln: "\\ln", log: "\\log", exp: "\\exp" };

export function broj(n) {
  const t = String(Number(n.toPrecision(12)));
  return t.replace(".", "{,}");
}

// Počinje li zapis slovom, funkcijom ili zagradom (pa se „2·x“ piše „2x“)?
function pocinjeSlovom(n) {
  if ("id" in n || n.fn) return true;
  if (n.op === "^") return pocinjeSlovom(n.a);
  if (n.op === "*") return pocinjeSlovom(n.a);
  return false;
}

export function tex(n) {
  if ("num" in n) return broj(n.num);
  if ("id" in n) return n.id === "pi" ? "\\pi " : n.id === "e" ? "e" : n.id.length > 1 ? `\\mathrm{${n.id}}` : n.id;
  if (n.fn) {
    if (n.fn === "sqrt") return `\\sqrt{${tex(n.a)}}`;
    if (n.fn === "abs") return `\\left|${tex(n.a)}\\right|`;
    return `${TEX_FN[n.fn] ?? `\\mathrm{${n.fn}}`}${zagrade(tex(n.a))}`;
  }
  switch (n.op) {
    case "+":
      return `${tex(n.a)} + ${n.b.op === "neg" ? zagrade(tex(n.b)) : tex(n.b)}`;
    case "-":
      return `${tex(n.a)} - ${n.b.op === "neg" ? zagrade(tex(n.b)) : omot(n.b, 2)}`;
    case "*": {
      const a = omot(n.a, 2);
      const b = n.b.op === "neg" ? zagrade(tex(n.b)) : omot(n.b, 3);
      // „2x“, „2\pi x“, „\frac{\pi}{6}x“, „(x-1)(x-3)“; točka samo ispred broja i negativnog faktora
      const spoj = !("num" in n.b) && n.b.op !== "neg" && (pocinjeSlovom(n.b) || razina(n.b) < 3);
      return spoj ? `${a}${b}` : `${a} \\cdot ${b}`;
    }
    case "/":
      return `\\frac{${tex(n.a)}}{${tex(n.b)}}`;
    case "^":
      return `${razina(n.a) < 5 || n.a.fn ? zagrade(tex(n.a)) : tex(n.a)}^{${tex(n.b)}}`;
    case "neg":
      return `-${razina(n.a) < 3 && n.a.op !== "/" ? zagrade(tex(n.a)) : tex(n.a)}`;
  }
  return "";
}

// LaTeX izraza iz speca („pi/6“ → „\frac{\pi}{6}“); neispravan izraz ostaje kakav jest.
export function texIzraza(izraz, varijable = []) {
  const r = ucitaj(String(izraz), varijable);
  return r.greska ? String(izraz) : r.tex;
}
