// Matematički unos učenika kao na papiru („2π/3“, „√3 − 1“, „2x+1“, „x²“, „sin x“) → izraz za siguran kalkulator
// (core/expr.js), zapis u LaTeX-u i usporedba s točnim odgovorom. Uspoređuju se vrijednosti, a ne zapis, pa
// „1+2x“ i „2x+1“ ili „π/6“ i „pi/6“ vrijede jednako. Isti kod radi i u validatoru, pa ovdje nema preglednika.
import { compile, FUNKCIJE as SVE_FUNKCIJE, FUNKCIJE_STUPNJEVI, KONSTANTE } from "./expr.js";

const FUNKCIJE = SVE_FUNKCIJE.filter((f) => !FUNKCIJE_STUPNJEVI.includes(f));

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
  // „70°“: oznaka mjere (70), a unutar sin/cos/tg kut u stupnjevima (vidi pripremi)
  [/°/g, " ° "],
  [/(\d+)\s*!/g, " fact($1)"],
  // hrvatski zapis tangensa: „tg x“
  [/\btg/g, " tan "],
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
  // ° je u izrazu sa sin/cos/tg kut u stupnjevima (sin 53° = sin(53π/180)), inače samo oznaka mjere (70° = 70)
  const trig = /sin|cos|tan/.test(s);
  for (const m of s.matchAll(/\s*(?:(\d+(?:\.\d+)?)|([A-Za-z]+)|(\*\*|[-+*/^()]))|\s*(\S)/g)) {
    if (m[4] === "°") {
      tokeni.push({ t: "deg", v: trig ? "* (pi / 180)" : "" });
      continue;
    }
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
    const zavrsava = prev && (prev.t === "num" || prev.t === "id" || prev.t === "deg" || prev.v === ")");
    const pocinje = tk.t === "num" || tk.t === "id" || tk.t === "fn" || tk.v === "(";
    if (zavrsava && pocinje) out.push({ t: "op", v: "*" });
    out.push(tk);
    // „sin x“, „sin 2x“, „√“ je već sqrt(…): funkcija bez zagrade uzima sljedeći broj i/ili varijablu
    if (tk.t === "fn" && tokeni[i + 1]?.v !== "(") {
      const jednostavan = (t) => t && (t.t === "num" || t.t === "id");
      // tokeni od j: jedan broj/varijabla ili cijela zagrada
      const komad = (j) => {
        if (jednostavan(tokeni[j])) return tokeni.slice(j, j + 1);
        if (tokeni[j]?.v !== "(") return null;
        for (let d = 0, k = j; k < tokeni.length; k++) {
          d += tokeni[k].v === "(" ? 1 : tokeni[k].v === ")" ? -1 : 0;
          if (d === 0) return tokeni.slice(j, k + 1);
        }
        return null;
      };
      // „sin^2 x“ = (sin x)^2
      let eksponent = null;
      if (tokeni[i + 1]?.v === "^" && komad(i + 2)) {
        eksponent = komad(i + 2);
        i += 1 + eksponent.length;
      }
      const arg = [];
      if (tokeni[i + 1]?.v === "(") {
        const z = komad(i + 1);
        if (z) arg.push(z);
        i += z ? z.length : 0;
      } else
        while (jednostavan(tokeni[i + 1]) && arg.length < 2) {
          const dio = [tokeni[++i]];
          // „ln 5^2“ je ln(25), „sin x^2“ je sin(x²): potencija ide uz argument
          const pot = tokeni[i + 1]?.v === "^" && komad(i + 2);
          if (pot) {
            dio.push(tokeni[i + 1], ...pot);
            i += 1 + pot.length;
          }
          if (tokeni[i + 1]?.t === "deg") dio.push(tokeni[++i]);
          arg.push(dio);
        }
      if (!arg.length) throw new Error(`iza „${tk.v}“ treba broj ili zagrada`);
      if (eksponent) out.splice(out.length - 1, 0, { t: "op", v: "(" });
      out.push({ t: "op", v: "(" });
      arg.forEach((a, k) => {
        if (k) out.push({ t: "op", v: "*" });
        out.push(...a);
      });
      out.push({ t: "op", v: ")" });
      if (eksponent) out.push({ t: "op", v: ")" }, { t: "op", v: "^" }, ...eksponent);
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
  ",": "", ";": "", ":": "", "!": "", " ": "", quad: "", qquad: "", degree: " ° ", "%": "/100",
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
      const pocetak = i;
      const n = naredba();
      if (n === "frac" || n === "dfrac" || n === "tfrac") {
        const [gore, dolje] = [grupa(), grupa()];
        // mješoviti broj: „1\frac{1}{3}“ je 1 + 1/3, ne 1 · 1/3
        const cijeli = /(?:^|[^\w.^_}\\])(\d+)\s*$/.exec(s.slice(0, pocetak));
        if (cijeli && /^\s*\d+\s*$/.test(gore) && /^\s*\d+\s*$/.test(dolje)) {
          out = out.replace(/\d+\s*$/, "") + `((${cijeli[1]})+(${gore})/(${dolje}))`;
        } else out += `((${izLatexa(gore)})/(${izLatexa(dolje)}))`;
      }
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
      else if (n === "pm" || n === "mp") throw new Error("umjesto ± upiši jedan predznak (+ ili −)");
      else if (n === "placeholder") throw new Error("dovrši izraz (ostalo je prazno mjesto)");
      else if (n === "binom" || n === "dbinom" || n === "tbinom") {
        const [gore, dolje] = [izLatexa(grupa()), izLatexa(grupa())];
        out += ` ((fact(${gore}))/((fact(${dolje}))*(fact((${gore})-(${dolje})))))`;
      }
      // \log_{b} x = log x / log b
      else if (n === "log" && s[i] === "_") {
        i++;
        out += ` ((1)/(log(${izLatexa(grupa())})))*log `;
      }
      else if (n in NAREDBE) out += NAREDBE[n];
      else throw new Error(`ne razumijem „\\${n}“`);
    } else if (c === "^") {
      i++;
      const g = grupa();
      // „70^{\circ}“: stupnjevi (pripremi odlučuje jesu li samo oznaka mjere)
      out += g.trim() === "\\circ" ? " ° " : `^(${izLatexa(g)})`;
    } else if (c === "!") {
      // n! i (n-1)!: faktorijel uzima broj, slovo ili zagradu ispred sebe
      i++;
      const t = out.trimEnd();
      let od = t.length;
      if (t.endsWith(")")) {
        let dub = 0;
        for (od = t.length - 1; od >= 0; od--) {
          if (t[od] === ")") dub++;
          else if (t[od] === "(" && --dub === 0) break;
        }
      } else od = t.search(/[A-Za-z0-9.]+$/);
      if (od < 0 || od >= t.length) throw new Error("ispred ! treba broj ili zagrada");
      out = `${t.slice(0, od)} fact(${t.slice(od)})`;
    } else if (c === "_") throw new Error("indeks ovdje ne pripada (baza ide samo uz log)");
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
    // točka izvan područja jednog od zapisa („b^(-2/3)“ za b < 0, a „1/∛(b²)“ je tamo definiran) se preskače
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
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
  if (n.fn === "fact") return razina(n.a) < 5 || pocinjeSlovom(n.a);
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
    if (n.fn === "fact") return `${razina(n.a) < 5 ? zagrade(tex(n.a)) : tex(n.a)}!`;
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
