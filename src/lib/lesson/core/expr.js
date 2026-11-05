// Siguran kalkulator izraza iz speca („m/V“, „2.4*x“, „sqrt(a^2+b^2)“): spec piše model, pa se nikad ne
// izvršava kao JavaScript. Podržava + − * / ^, zagrade, varijable i nekoliko funkcija; uz compileKompleksno
// i račun u ℂ (imaginarna jedinica i, re, im, arg, conj).
import { C, FUNKCIJE_C, SAMO_KOMPLEKSNE, realnaUC, dodaj, oduzmi, pomnozi, podijeli, potencija } from "./kompleksno.js";

const FUNCS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  // kutovi u stupnjevima (optika: Snellov zakon, granični i Brewsterov kut)
  sind: (x) => Math.sin((x * Math.PI) / 180),
  cosd: (x) => Math.cos((x * Math.PI) / 180),
  tand: (x) => Math.tan((x * Math.PI) / 180),
  asind: (x) => (Math.asin(x) * 180) / Math.PI,
  acosd: (x) => (Math.acos(x) * 180) / Math.PI,
  atand: (x) => (Math.atan(x) * 180) / Math.PI,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  round: Math.round,
  // n! (samo za prirodne brojeve i 0)
  fact: (n) => {
    if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
    let f = 1;
    for (let k = 2; k <= n; k++) f *= k;
    return f;
  },
};
// Arkus, kotangens, hiperbolne i area funkcije (Matematička analiza). Odvojene od FUNKCIJE: učenikov unos ih
// prepoznaje tek kad se riječ ne da pročitati starim funkcijama i varijablama (core/izraz.js), pa se čitanje
// postojećih unosa („th“ uz varijable t i h) ne mijenja.
const arkus = { asin: Math.asin, acos: Math.acos, atan: Math.atan };
const NOVE = {
  asin: arkus.asin,
  acos: arkus.acos,
  atan: arkus.atan,
  arcsin: arkus.asin,
  arccos: arkus.acos,
  arctan: arkus.atan,
  arctg: arkus.atan,
  arcctg: (x) => Math.PI / 2 - Math.atan(x),
  arccot: (x) => Math.PI / 2 - Math.atan(x),
  ctg: (x) => 1 / Math.tan(x),
  cot: (x) => 1 / Math.tan(x),
  sh: Math.sinh,
  ch: Math.cosh,
  th: Math.tanh,
  cth: (x) => 1 / Math.tanh(x),
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  coth: (x) => 1 / Math.tanh(x),
  arsh: Math.asinh,
  arch: Math.acosh,
  arth: Math.atanh,
  // arcth x = ½ ln((x+1)/(x−1)), za |x| > 1
  arcth: (x) => (Math.abs(x) > 1 ? Math.atanh(1 / x) : NaN),
};
const STARE = Object.keys(FUNCS);
Object.assign(FUNCS, NOVE);
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const out = [];
  const re = /\s*(?:(\d+(?:[.,]\d+)?(?:e[+-]?\d+)?)|([A-Za-z_][A-Za-z_0-9]*)|(\*\*|[-+*/^(),]))/y;
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m || m[0].length === 0) {
      if (/^\s*$/.test(src.slice(i))) break;
      throw new Error(`neočekivan znak „${src[i]}“`);
    }
    i = re.lastIndex;
    if (m[1]) out.push({ t: "num", v: Number(m[1].replace(",", ".")) });
    else if (m[2]) out.push({ t: "id", v: m[2] });
    else out.push({ t: "op", v: m[3] === "**" ? "^" : m[3] });
  }
  return out;
}

// Rekurzivni spust; vraća stablo koje se poslije računa za zadane varijable.
function parse(tokens, funkcije = FUNCS) {
  let p = 0;
  const peek = () => tokens[p];
  const eat = (v) => {
    const tk = tokens[p];
    if (!tk || tk.v !== v) throw new Error(`očekivano „${v}“`);
    p++;
  };
  const expr = () => {
    let n = term();
    while (peek()?.t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = tokens[p++].v;
      n = { op, a: n, b: term() };
    }
    return n;
  };
  const term = () => {
    let n = unary();
    while (peek()?.t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = tokens[p++].v;
      n = { op, a: n, b: unary() };
    }
    return n;
  };
  const unary = () => {
    if (peek()?.t === "op" && (peek().v === "-" || peek().v === "+")) {
      const op = tokens[p++].v;
      const a = unary();
      return op === "-" ? { op: "neg", a } : a;
    }
    return power();
  };
  const power = () => {
    const base = atom();
    if (peek()?.t === "op" && peek().v === "^") {
      p++;
      return { op: "^", a: base, b: unary() };
    }
    return base;
  };
  const atom = () => {
    const tk = tokens[p++];
    if (!tk) throw new Error("izraz je nepotpun");
    if (tk.t === "num") return { num: tk.v };
    if (tk.t === "id") {
      if (peek()?.v === "(") {
        if (!funkcije[tk.v]) throw new Error(`nepoznata funkcija „${tk.v}“`);
        eat("(");
        const a = expr();
        eat(")");
        return { fn: tk.v, a };
      }
      return { id: tk.v };
    }
    if (tk.v === "(") {
      const a = expr();
      eat(")");
      return a;
    }
    throw new Error(`neočekivano „${tk.v}“`);
  };
  const tree = expr();
  if (p < tokens.length) throw new Error(`višak „${tokens[p].v}“`);
  return tree;
}

function evaluate(n, vars) {
  if ("num" in n) return n.num;
  if ("id" in n) {
    if (n.id in vars) return vars[n.id];
    if (n.id in CONSTS) return CONSTS[n.id];
    throw new Error(`nepoznata varijabla „${n.id}“`);
  }
  if (n.fn) return FUNCS[n.fn](evaluate(n.a, vars));
  const a = evaluate(n.a, vars);
  if (n.op === "neg") return -a;
  const b = evaluate(n.b, vars);
  switch (n.op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
    case "^":
      return a ** b;
  }
  throw new Error(`nepoznata operacija ${n.op}`);
}

function variables(n, out = new Set()) {
  if ("id" in n && !(n.id in CONSTS)) out.add(n.id);
  if (n.a) variables(n.a, out);
  if (n.b) variables(n.b, out);
  return out;
}

// compile("m/V") → { fn(vars) → broj, vars: ["m","V"], tree }; baca grešku s hrvatskom porukom ako izraz ne valja.
// Stablo (tree) koristi matematički unos (core/izraz.js) za zapis u LaTeX-u.
export function compile(src) {
  if (typeof src !== "string" || !src.trim()) throw new Error("izraz je prazan");
  const tree = parse(tokenize(src));
  return { fn: (vars = {}) => evaluate(tree, vars), vars: [...variables(tree)], tree };
}

export const FUNKCIJE = STARE;
export const FUNKCIJE_NOVE = Object.keys(NOVE);

// ── račun u ℂ ─────────────────────────────────────────────────────────────────────────────────────
const FUNCS_C = { ...Object.fromEntries(Object.entries(FUNCS).map(([k, f]) => [k, realnaUC(f)])), ...FUNKCIJE_C };
const CONSTS_C = { pi: C(Math.PI), e: C(Math.E), i: C(0, 1) };

function evaluateC(n, vars, o) {
  if ("num" in n) return C(n.num);
  if ("id" in n) {
    if (n.id in vars) return typeof vars[n.id] === "number" ? C(vars[n.id]) : vars[n.id];
    if (n.id in CONSTS_C) return CONSTS_C[n.id];
    throw new Error(`nepoznata varijabla „${n.id}“`);
  }
  if (n.fn) return FUNCS_C[n.fn](evaluateC(n.a, vars, o), o);
  const a = evaluateC(n.a, vars, o);
  if (n.op === "neg") return C(-a.re, -a.im);
  const b = evaluateC(n.b, vars, o);
  switch (n.op) {
    case "+":
      return dodaj(a, b);
    case "-":
      return oduzmi(a, b);
    case "*":
      return pomnozi(a, b);
    case "/":
      return podijeli(a, b);
    case "^":
      return potencija(a, b);
  }
  throw new Error(`nepoznata operacija ${n.op}`);
}

// compileKompleksno("2*exp(i*pi/3)") → { fn(vars, {argOdNule}) → {re, im}, vars, tree }; i je imaginarna jedinica.
export function compileKompleksno(src) {
  if (typeof src !== "string" || !src.trim()) throw new Error("izraz je prazan");
  const tree = parse(tokenize(src), FUNCS_C);
  const vars = [...variables(tree)].filter((v) => v !== "i");
  return { fn: (v = {}, o = {}) => evaluateC(tree, v, o), vars, tree, kompleksno: true };
}
export const FUNKCIJE_KOMPLEKSNE = SAMO_KOMPLEKSNE;
// Funkcije u stupnjevima su samo za izraze iz speca; učenikov unos „sind“ i dalje znači sin(d) (core/izraz.js).
export const FUNKCIJE_STUPNJEVI = ["sind", "cosd", "tand", "asind", "acosd", "atand"];
export const KONSTANTE = Object.keys(CONSTS);
