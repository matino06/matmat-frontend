// Siguran kalkulator izraza iz speca („m/V“, „2.4*x“, „sqrt(a^2+b^2)“): spec piše model, pa se nikad ne
// izvršava kao JavaScript. Podržava + − * / ^, zagrade, varijable i nekoliko funkcija.

const FUNCS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  round: Math.round,
};
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
function parse(tokens) {
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
        if (!FUNCS[tk.v]) throw new Error(`nepoznata funkcija „${tk.v}“`);
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

// compile("m/V") → { fn(vars) → broj, vars: ["m","V"] }; baca grešku s hrvatskom porukom ako izraz ne valja.
export function compile(src) {
  if (typeof src !== "string" || !src.trim()) throw new Error("izraz je prazan");
  const tree = parse(tokenize(src));
  return { fn: (vars = {}) => evaluate(tree, vars), vars: [...variables(tree)] };
}
