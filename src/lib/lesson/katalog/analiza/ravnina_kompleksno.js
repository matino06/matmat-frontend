// Mala kompleksna aritmetika za widget „ravnina“: siguran parser izraza u ℂ („1+i“, „2*exp(i*pi/3)“, „abs(z-3-3i)“),
// uvjeti skupa („1<abs(z-3-3i)<=2“, „arg(z^3)==pi/2“), zapis u LaTeX-u i prepoznavanje „lijepih“ brojeva (√5, π/3).
// Spec piše autor (ili model), pa se izraz nikad ne izvršava kao JavaScript.
//
// Izraz: brojevi (decimalna točka ili zarez), i, pi (π), e, varijable z, x (= Re z), y (= Im z); + − * / ^, zagrade,
// |…| za modul, množenje bez znaka iza broja ili zagrade („3i“, „2pi“, „(1+i)(1-i)“). Funkcije: re, im, abs, arg,
// conj, exp, ln, sqrt, sin, cos, tan, sinh, cosh, cis (cis t = cos t + i sin t).

export const C = (re, im = 0) => ({ re, im });
const I = C(0, 1);
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
function div(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return C(NaN, NaN);
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
export const modul = (a) => Math.hypot(a.re, a.im);
// glavna vrijednost ⟨−π, π] ili, uz odNule, [0, 2π⟩; arg 0 nije definiran
export function argument(a, odNule = false) {
  if (a.re === 0 && a.im === 0) return NaN;
  const t = Math.atan2(a.im, a.re);
  if (odNule) return t < 0 ? t + 2 * Math.PI : t;
  return t === -Math.PI ? Math.PI : t;
}
const cexp = (a) =>
  C(Math.exp(a.re) * Math.cos(a.im), Math.exp(a.re) * Math.sin(a.im));
const cln = (a) =>
  a.re === 0 && a.im === 0
    ? C(NaN, NaN)
    : C(Math.log(modul(a)), Math.atan2(a.im, a.re));
function csqrt(a) {
  const r = modul(a);
  const re = Math.sqrt((r + a.re) / 2);
  const im = Math.sqrt(Math.max(0, (r - a.re) / 2));
  return C(re, a.im < 0 ? -im : im);
}
const csin = (a) =>
  C(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
const ccos = (a) =>
  C(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
const csinh = (a) =>
  C(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im));
const ccosh = (a) =>
  C(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im));
// cijeli eksponent množenjem (Gaussovi cijeli brojevi ostaju točni: (1+i)^2 = 2i, ne 1,2·10⁻¹⁶ + 2i)
function cpow(a, b) {
  if (
    Math.abs(b.im) < 1e-15 &&
    Number.isInteger(b.re) &&
    Math.abs(b.re) <= 256
  ) {
    let n = Math.abs(b.re);
    let r = C(1);
    let x = a;
    while (n) {
      if (n & 1) r = mul(r, x);
      x = mul(x, x);
      n >>= 1;
    }
    return b.re < 0 ? div(C(1), r) : r;
  }
  if (a.re === 0 && a.im === 0) return b.re > 0 ? C(0) : C(NaN, NaN);
  return cexp(mul(b, cln(a)));
}

const FUNKCIJE = {
  re: (a) => C(a.re),
  im: (a) => C(a.im),
  abs: (a) => C(modul(a)),
  arg: (a, env) => C(argument(a, env.argOdNule)),
  conj: (a) => C(a.re, -a.im),
  exp: cexp,
  ln: cln,
  sqrt: csqrt,
  sin: csin,
  cos: ccos,
  tan: (a) => div(csin(a), ccos(a)),
  sinh: csinh,
  cosh: ccosh,
  cis: (a) => add(ccos(a), mul(I, csin(a))),
};
const ALIAS = {
  Re: "re",
  Im: "im",
  Arg: "arg",
  Abs: "abs",
  log: "ln",
  sh: "sinh",
  ch: "cosh",
  tg: "tan",
};
const KONSTANTE = { i: I, pi: C(Math.PI), e: C(Math.E) };
const VARIJABLE = ["z", "x", "y"];
const USPOREDBE = {
  "<": "<",
  "<=": "<=",
  "≤": "<=",
  ">": ">",
  ">=": ">=",
  "≥": ">=",
  "==": "==",
  "=": "==",
};

function tokeni(src) {
  const out = [];
  const re =
    /\s*(?:(\d+(?:[.,]\d+)?|[.,]\d+)|([A-Za-z_][A-Za-z_0-9]*|π)|(<=|>=|==|\*\*|[-+*/^()|<>=≤≥·−]))/y;
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m || !m[0].length) {
      if (/^\s*$/.test(src.slice(i))) break;
      throw new Error(`neočekivan znak „${src[i].trim() || src[i]}“`);
    }
    i = re.lastIndex;
    if (m[1]) out.push({ t: "num", v: Number(m[1].replace(",", ".")) });
    else if (m[2])
      out.push({ t: "id", v: m[2] === "π" ? "pi" : (ALIAS[m[2]] ?? m[2]) });
    else {
      const v = { "**": "^", "·": "*", "−": "-" }[m[3]] ?? m[3];
      out.push({ t: v in USPOREDBE ? "cmp" : "op", v: USPOREDBE[v] ?? v });
    }
  }
  return out;
}

// Rekurzivni spust. Čvorovi: {num}, {id}, {fn, a}, {op: "+"|"-"|"*"|"/"|"^", a, b}, {op: "neg", a}.
function parser(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const je = (v) => peek()?.t === "op" && peek().v === v;
  const pojedi = (v) => {
    if (!je(v))
      throw new Error(
        peek()
          ? `očekivano „${v}“, a piše „${peek().v}“`
          : `fali „${v}“ na kraju`,
      );
    p++;
  };
  // može li ovdje početi novi faktor (množenje bez znaka: „3i“, „2(1+i)“, „(1+i)(1-i)“)
  const pocinjeFaktor = () =>
    peek() && (peek().t === "num" || peek().t === "id" || je("("));
  const izraz = () => {
    let n = clan();
    while (je("+") || je("-")) {
      const op = tokens[p++].v;
      n = { op, a: n, b: clan() };
    }
    return n;
  };
  const clan = () => {
    let n = predznak();
    for (;;) {
      if (je("*") || je("/")) {
        const op = tokens[p++].v;
        n = { op, a: n, b: predznak() };
      } else if (pocinjeFaktor())
        n = { op: "*", a: n, b: potencija(), implicitno: true };
      else return n;
    }
  };
  const predznak = () => {
    if (je("-") || je("+")) {
      const op = tokens[p++].v;
      const a = predznak();
      return op === "-" ? { op: "neg", a } : a;
    }
    return potencija();
  };
  const potencija = () => {
    const baza = atom();
    if (je("^")) {
      p++;
      return { op: "^", a: baza, b: predznak() };
    }
    return baza;
  };
  const atom = () => {
    const tk = tokens[p++];
    if (!tk) throw new Error("izraz je nepotpun");
    if (tk.t === "num") return { num: tk.v };
    if (tk.t === "id") {
      if (FUNKCIJE[tk.v]) {
        // „Re z“, „arg z“, „sin x“: jedno ime ili broj bez zagrada
        if (peek()?.t === "id" || peek()?.t === "num")
          return { fn: tk.v, a: atom() };
        if (!je("("))
          throw new Error(`iza „${tk.v}“ ide zagrada, npr. ${tk.v}(z)`);
        p++;
        const a = izraz();
        pojedi(")");
        return { fn: tk.v, a };
      }
      if (!(tk.v in KONSTANTE) && !VARIJABLE.includes(tk.v))
        throw new Error(`nepoznato ime „${tk.v}“`);
      return { id: tk.v };
    }
    if (tk.t === "op" && tk.v === "(") {
      const a = izraz();
      pojedi(")");
      return a;
    }
    if (tk.t === "op" && tk.v === "|") {
      const a = izraz();
      pojedi("|");
      return { fn: "abs", a };
    }
    throw new Error(`neočekivano „${tk.v}“`);
  };
  return {
    izraz,
    kraj: () => p >= tokens.length,
    peek,
    dalje: () => tokens[p++],
  };
}

function stablo(src) {
  if (typeof src === "number") return { num: src };
  if (typeof src !== "string" || !src.trim())
    throw new Error("izraz je prazan");
  const ps = parser(tokeni(src));
  const t = ps.izraz();
  if (!ps.kraj()) throw new Error(`višak „${ps.peek().v}“`);
  return t;
}

function racunaj(n, env) {
  if ("num" in n) return C(n.num);
  if ("id" in n) {
    if (n.id in KONSTANTE) return KONSTANTE[n.id];
    const z = env.z;
    if (!z)
      throw new Error(`„${n.id}“ ovdje nije dopušten (izraz mora biti broj)`);
    return n.id === "z" ? z : n.id === "x" ? C(z.re) : C(z.im);
  }
  if (n.fn) return FUNKCIJE[n.fn](racunaj(n.a, env), env);
  const a = racunaj(n.a, env);
  if (n.op === "neg") return C(-a.re, -a.im);
  const b = racunaj(n.b, env);
  return n.op === "+"
    ? add(a, b)
    : n.op === "-"
      ? sub(a, b)
      : n.op === "*"
        ? mul(a, b)
        : n.op === "/"
          ? div(a, b)
          : cpow(a, b);
}

const imaVarijablu = (n) =>
  ("id" in n && VARIJABLE.includes(n.id)) ||
  (n.a && imaVarijablu(n.a)) ||
  (n.b && imaVarijablu(n.b));
const imaArg = (n) =>
  n.fn === "arg" || (n.a && imaArg(n.a)) || (n.b && imaArg(n.b));

// Kompleksni izraz bez varijabli → {re, im}; baca grešku s hrvatskom porukom.
export function kompleksni(src) {
  const t = stablo(src);
  if (imaVarijablu(t)) throw new Error("broj ne smije sadržavati z, x ni y");
  const v = racunaj(t, {});
  if (!Number.isFinite(v.re) || !Number.isFinite(v.im))
    throw new Error("izraz nema vrijednost");
  return v;
}
// Isto, ali null umjesto greške.
export function kompleksniIli(src) {
  try {
    return kompleksni(src);
  } catch {
    return null;
  }
}
// Realan broj (koordinata, polumjer, kut): imaginarni dio mora biti 0.
export function realni(src) {
  const v = kompleksniIli(src);
  return v && Math.abs(v.im) <= 1e-12 * Math.max(1, Math.abs(v.re))
    ? v.re
    : null;
}

// Uvjet „1<abs(z-3-3i)<=2“ → usporedbe [{a, op, b}] (lanac se dijeli na parove).
export function uvjet(src) {
  if (typeof src !== "string" || !src.trim())
    throw new Error("uvjet je prazan");
  const ps = parser(tokeni(src));
  const dijelovi = [ps.izraz()];
  const ops = [];
  while (!ps.kraj()) {
    const tk = ps.dalje();
    if (tk.t !== "cmp") throw new Error(`višak „${tk.v}“`);
    ops.push(tk.v);
    dijelovi.push(ps.izraz());
  }
  if (!ops.length) throw new Error("uvjet treba usporedbu (<, <=, >, >=, ==)");
  if (ops.includes("==") && ops.length > 1)
    throw new Error("jednakost (==) piši kao zaseban uvjet");
  return ops.map((op, k) => {
    const [a, b] = [dijelovi[k], dijelovi[k + 1]];
    return {
      a,
      b,
      op,
      izvor: src,
      saZ: [imaVarijablu(a), imaVarijablu(b)],
      arg: imaArg(a) || imaArg(b),
    };
  });
}

// Vrijednost strane usporedbe u točki z (realna ili NaN).
export function strana(n, z, argOdNule) {
  const v = racunaj(n, { z, argOdNule });
  if (!Number.isFinite(v.re) || !Number.isFinite(v.im)) return NaN;
  return Math.abs(v.im) <= 1e-9 * Math.max(1, Math.abs(v.re))
    ? v.re
    : { kompleksno: true };
}

const omotaj = (d) => d - 2 * Math.PI * Math.round(d / (2 * Math.PI));
const tolerancija = (a, b) => 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
// Vrijedi li usporedba u z. zatvoreno: < i > se čitaju kao ≤ i ≥ (zatvarač skupa, za rubove).
export function vrijedi(u, z, argOdNule, zatvoreno = false) {
  const [a, b] = [strana(u.a, z, argOdNule), strana(u.b, z, argOdNule)];
  if (
    typeof a !== "number" ||
    typeof b !== "number" ||
    Number.isNaN(a) ||
    Number.isNaN(b)
  )
    return false;
  const t = tolerancija(a, b);
  switch (u.op) {
    case "<":
      return zatvoreno ? a <= b + t : a < b - t;
    case "<=":
      return a <= b + t;
    case ">":
      return zatvoreno ? a >= b - t : a > b + t;
    case ">=":
      return a >= b - t;
    default:
      // arg je kut: jednakost do na 2π (raspon arg provjerava validate)
      return Math.abs(u.arg ? omotaj(a - b) : a - b) <= t * 100;
  }
}
// Realna funkcija čija je nultočka rub usporedbe (a − b; za jednakost s arg omotano u ⟨−π, π]).
export function razlika(u, z, argOdNule) {
  const [a, b] = [strana(u.a, z, argOdNule), strana(u.b, z, argOdNule)];
  if (typeof a !== "number" || typeof b !== "number") return NaN;
  return u.op === "==" && u.arg ? omotaj(a - b) : a - b;
}

// ── LaTeX ──
const PREDNOST = { "+": 1, "-": 1, neg: 2, "*": 2, "/": 3, "^": 4 };
const prednost = (n) =>
  "num" in n ? (n.num < 0 ? 2 : 5) : "id" in n || n.fn ? 5 : PREDNOST[n.op];
const TEX_FN = {
  sin: "\\sin",
  cos: "\\cos",
  tan: "\\tan",
  sinh: "\\sinh",
  cosh: "\\cosh",
  ln: "\\ln",
  arg: "\\arg",
  re: "\\operatorname{Re}",
  im: "\\operatorname{Im}",
  cis: "\\operatorname{cis}",
};
const texBrojaZapis = (v) =>
  String(Number(v.toPrecision(12))).replace(".", "{,}");
const zagrade = (t) => `\\left(${t}\\right)`;
// je li čvor „jednostavan“ argument funkcije (sin x, Re z, arg z bez zagrada)
const jednostavan = (n) => ("num" in n && n.num >= 0) || "id" in n;

export function tex(n) {
  if (typeof n === "string" || typeof n === "number") n = stablo(n);
  if ("num" in n) return texBrojaZapis(n.num);
  if ("id" in n) return n.id === "pi" ? "\\pi" : n.id;
  if (n.fn) {
    const a = tex(n.a);
    if (n.fn === "abs") return `\\left|${a}\\right|`;
    if (n.fn === "sqrt") return `\\sqrt{${a}}`;
    if (n.fn === "exp") return `e^{${a}}`;
    if (n.fn === "conj") return `\\overline{${a}}`;
    return `${TEX_FN[n.fn]}${jednostavan(n.a) || n.a.op === "/" ? ` ${a}` : zagrade(a)}`;
  }
  if (n.op === "neg")
    return `-${prednost(n.a) <= 2 ? zagrade(tex(n.a)) : tex(n.a)}`;
  const [A, B] = [tex(n.a), tex(n.b)];
  switch (n.op) {
    case "+":
      return n.b.op === "neg"
        ? `${A} - ${prednost(n.b.a) <= 1 ? zagrade(tex(n.b.a)) : tex(n.b.a)}`
        : `${A} + ${B}`;
    case "-":
      return `${A} - ${prednost(n.b) <= 1 || n.b.op === "neg" ? zagrade(B) : B}`;
    case "/":
      return `\\frac{${A}}{${B}}`;
    case "^": {
      const baza =
        "id" in n.a || ("num" in n.a && n.a.num >= 0) || n.a.fn === "abs"
          ? A
          : zagrade(A);
      return `${baza}^{${B}}`;
    }
    default: {
      const lijevo = prednost(n.a) < 2 ? zagrade(A) : A;
      const desno = prednost(n.b) <= 2 ? zagrade(B) : B;
      // „2 · 3“ i „z · 2“ trebaju točku; „2i“, „3e^{…}“, „\sqrt{2}(…)“ ne (razmak LaTeX ne prikazuje)
      return `${lijevo}${/^\d/.test(desno) ? " \\cdot " : " "}${desno}`;
    }
  }
}
const TEX_OP = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge", "==": "=" };
export const texOp = (op) => TEX_OP[op];
export const texUsporedbe = (u) => `${tex(u.a)} ${TEX_OP[u.op]} ${tex(u.b)}`;
// cijeli uvjet iz speca u LaTeX-u (lanac ostaje lanac)
export function texUvjeta(src) {
  const ps = parser(tokeni(src));
  let out = tex(ps.izraz());
  while (!ps.kraj()) {
    const tk = ps.dalje();
    out += ` ${TEX_OP[tk.v]} ${tex(ps.izraz())}`;
  }
  return out;
}

// ── prepoznavanje „lijepih“ brojeva za poruke: 2, −3/2, √5, 3√2/2, π/3, −2π/3; inače decimalni zarez ──
const KORIJENI = [
  2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30,
];
function razlomak(v, maxN = 12) {
  for (let q = 1; q <= maxN; q++) {
    const p = Math.round(v * q);
    if (Math.abs(p / q - v) < 1e-9 * Math.max(1, Math.abs(v))) return [p, q];
  }
  return null;
}
function texRazlomka(p, q, uz = "") {
  const znak = p < 0 ? "-" : "";
  const a = Math.abs(p);
  const brojnik = uz ? (a === 1 ? uz : `${a}${uz}`) : String(a);
  return q === 1 ? `${znak}${brojnik}` : `${znak}\\frac{${brojnik}}{${q}}`;
}
export function texBroja(v) {
  if (!Number.isFinite(v)) return "?";
  if (Math.abs(v) < 1e-12) return "0";
  const r = razlomak(v);
  if (r) return texRazlomka(r[0], r[1]);
  for (const n of KORIJENI) {
    const k = razlomak(v / Math.sqrt(n));
    if (k) return texRazlomka(k[0], k[1], `\\sqrt{${n}}`);
  }
  const pi = razlomak(v / Math.PI, 24);
  if (pi) return texRazlomka(pi[0], pi[1], "\\pi");
  return texBrojaZapis(Math.round(v * 1000) / 1000);
}
// a + bi s lijepim dijelovima („1 + \sqrt{3}i“, „-\frac{1}{2} - i“)
export function texKompleksnog(z) {
  const [a, b] = [
    Math.abs(z.re) < 1e-12 ? 0 : z.re,
    Math.abs(z.im) < 1e-12 ? 0 : z.im,
  ];
  if (b === 0) return texBroja(a);
  const bt = texBroja(Math.abs(b));
  const imag =
    bt === "1" ? "i" : /\\sqrt|\\frac/.test(bt) ? `${bt}\\,i` : `${bt}i`;
  if (a === 0) return `${b < 0 ? "-" : ""}${imag}`;
  return `${texBroja(a)} ${b < 0 ? "-" : "+"} ${imag}`;
}
