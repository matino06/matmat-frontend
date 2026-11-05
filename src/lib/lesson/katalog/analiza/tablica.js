// Tablica koju učenik popunjava: opća tablica (vrijednosti, izbor dodirom), tablica istinitosti (kod je sastavi i
// izračuna iz sudnih formi) i tablica predznaka derivacije s monotonošću i ekstremima (kod je sastavi iz derivacije i
// njezinih nultočaka i točaka prekida). Sve tri vrste svode se na isti model (zaglavlje + redci ćelija), pa ih crta ista
// komponenta (komponente/analiza/Tablica.svelte), a provjera radi ćeliju po ćeliju.
import { compile } from "../../core/expr.js";
import { parseNumber, tolerance, near, isNum, formatNumber } from "../../core/number.js";
import { texIzraza } from "../../core/izraz.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";

const NACINI = ["prikaz", "popuni"];

// ── sudna logika ──────────────────────────────────────────────────────────────────────────────────
// Znakovi ¬ ∧ ∨ ⇒ ⇔ i zagrade; isto i LaTeX (\neg, \wedge, \vee, \Rightarrow, \Leftrightarrow) i riječi not, and, or,
// =>, <=>. Prednost: ¬, ∧, ∨, ⇒ (desno asocijativna), ⇔.
const LOG_ZAMJENE = [
  [/\\(?:Leftrightarrow|leftrightarrow|iff|Longleftrightarrow)(?![A-Za-z])|⇔|↔|<=>|<->/g, " ⇔ "],
  [/\\(?:Rightarrow|rightarrow|implies|to|Longrightarrow)(?![A-Za-z])|⇒|→|=>|->/g, " ⇒ "],
  [/\\(?:neg|lnot)(?![A-Za-z])|¬|~|!/g, " ¬ "],
  [/\\(?:wedge|land)(?![A-Za-z])|∧|&&?/g, " ∧ "],
  [/\\(?:vee|lor)(?![A-Za-z])|∨|\|\|?/g, " ∨ "],
  [/\\(?:left|right|[bB]igg?[lr]?)(?=\s*[()[\]])/g, ""],
  [/[[{]/g, "("],
  [/[\]}]/g, ")"],
  [/\$/g, " "],
];
const RIJECI = { not: "¬", and: "∧", or: "∨" };
const SUD = /^[A-Za-z][A-Za-z0-9_]*$/;

function tokeniLogike(src) {
  let t = String(src);
  for (const [re, z] of LOG_ZAMJENE) t = t.replace(re, z);
  const out = [];
  const re = /\s*(¬|∧|∨|⇒|⇔|\(|\)|[A-Za-z][A-Za-z0-9_]*)/y;
  let i = 0;
  while (i < t.length) {
    re.lastIndex = i;
    const m = re.exec(t);
    if (!m) {
      if (/^\s*$/.test(t.slice(i))) break;
      throw new Error(`neočekivan znak „${t.slice(i).trim()[0]}“`);
    }
    i = re.lastIndex;
    const w = m[1];
    out.push(RIJECI[w.toLowerCase()] ? { op: RIJECI[w.toLowerCase()] } : /^[A-Za-z]/.test(w) ? { sud: w } : { op: w });
  }
  return out;
}

// sudna forma → stablo {sud} | {op: "¬", a} | {op, a, b}
export function parseLogika(src) {
  const tk = tokeniLogike(src);
  if (!tk.length) throw new Error("forma je prazna");
  let p = 0;
  const je = (op) => tk[p]?.op === op;
  const ekv = () => {
    let n = imp();
    while (je("⇔")) {
      p++;
      n = { op: "⇔", a: n, b: imp() };
    }
    return n;
  };
  const imp = () => {
    const n = ili();
    if (je("⇒")) {
      p++;
      return { op: "⇒", a: n, b: imp() };
    }
    return n;
  };
  const ili = () => {
    let n = i_();
    while (je("∨")) {
      p++;
      n = { op: "∨", a: n, b: i_() };
    }
    return n;
  };
  const i_ = () => {
    let n = ne();
    while (je("∧")) {
      p++;
      n = { op: "∧", a: n, b: ne() };
    }
    return n;
  };
  const ne = () => {
    if (je("¬")) {
      p++;
      return { op: "¬", a: ne() };
    }
    const t = tk[p++];
    if (!t) throw new Error("forma je nepotpuna");
    if (t.sud) return { sud: t.sud };
    if (t.op === "(") {
      const n = ekv();
      if (!je(")")) throw new Error("fali zatvorena zagrada");
      p++;
      return n;
    }
    throw new Error(`neočekivano „${t.op}“`);
  };
  const stablo = ekv();
  if (p < tk.length) throw new Error(`višak „${tk[p].op ?? tk[p].sud}“`);
  return stablo;
}

export function izracunajLogiku(n, vr) {
  if (n.sud) return vr[n.sud];
  const a = izracunajLogiku(n.a, vr);
  if (n.op === "¬") return !a;
  const b = izracunajLogiku(n.b, vr);
  if (n.op === "∧") return a && b;
  if (n.op === "∨") return a || b;
  if (n.op === "⇒") return !a || b;
  return a === b;
}

const sudoviForme = (n, out = new Set()) => {
  if (n.sud) out.add(n.sud);
  if (n.a) sudoviForme(n.a, out);
  if (n.b) sudoviForme(n.b, out);
  return out;
};

const TEX_OP = { "∧": "\\wedge", "∨": "\\vee", "⇒": "\\Rightarrow", "⇔": "\\Leftrightarrow" };
// Zapis forme: binarni dio unutar binarnog uvijek u zagradama (osim ∧ u ∧ i ∨ u ∨), kao u skripti:
// ((A ⇒ B) ∧ ¬B) ⇒ ¬A.
function zapisLogike(n, tex) {
  if (n.sud) {
    const m = n.sud.match(/^([A-Za-z]+)_?(\d+)$/);
    return m ? (tex ? `${m[1]}_{${m[2]}}` : `${m[1]}${m[2]}`) : n.sud;
  }
  const z = (x) => (tex ? `(${x})` : `(${x})`);
  if (n.op === "¬") {
    const a = zapisLogike(n.a, tex);
    return `${tex ? "\\neg " : "¬"}${n.a.b ? z(a) : a}`;
  }
  const dio = (c) => (c.b && !(c.op === n.op && (n.op === "∧" || n.op === "∨")) ? z(zapisLogike(c, tex)) : zapisLogike(c, tex));
  return `${dio(n.a)} ${tex ? TEX_OP[n.op] : n.op} ${dio(n.b)}`;
}
export const texLogike = (n) => zapisLogike(n, true);
export const tekstLogike = (n) => zapisLogike(n, false);

// ── pomoćno ───────────────────────────────────────────────────────────────────────────────────────
const texBroj = (n) => formatNumber(n).replace("−", "-").replace(",", "{,}");
const bezRazmaka = (v) =>
  String(v ?? "")
    .replace(/\s+/g, "")
    .replace(/[−–]/g, "-")
    .toLowerCase();
// tekst iz markdowna/LaTeX-a za aria-label i poruke („$f'(x)$“ → „f'(x)“)
const goliTekst = (md) =>
  String(md ?? "")
    .replace(/\$/g, "")
    .replace(/\\langle\s*/g, "⟨")
    .replace(/\s*\\rangle/g, "⟩")
    .replace(/\\infty/g, "∞")
    .replace(/\\(left|right)/g, "")
    .replace(/\\neg\s*/g, "¬")
    .replace(/\s*\\wedge\s*/g, " ∧ ")
    .replace(/\s*\\vee\s*/g, " ∨ ")
    .replace(/\s*\\Rightarrow\s*/g, " ⇒ ")
    .replace(/\s*\\Leftrightarrow\s*/g, " ⇔ ")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function brojIzIzraza(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = String(v ?? "").trim();
  if (/^[+]?(inf|∞|\+∞)$/i.test(t)) return Infinity;
  if (/^[-−](inf|∞)$/i.test(t)) return -Infinity;
  try {
    const c = compile(t);
    if (c.vars.length) return null;
    const x = c.fn({});
    return Number.isFinite(x) ? x : null;
  } catch {
    return null;
  }
}
const texTocke = (v) => (v === Infinity ? "+\\infty" : v === -Infinity ? "-\\infty" : null);

// broj ćelija na hrvatskom: 1 ćelija, 2–4 ćelije, 5+ ćelija (11–14 ćelija)
function brojKrivih(n) {
  const [d, s] = [n % 10, n % 100];
  if (n === 1) return "Jedna ćelija nije točna (istaknuta je)";
  if (d >= 2 && d <= 4 && !(s >= 12 && s <= 14)) return `${n} ćelije nisu točne (istaknute su)`;
  return `${n} ćelija nije točno (istaknute su)`;
}

// ── opća tablica ──────────────────────────────────────────────────────────────────────────────────
const jeObjekt = (c) => c != null && typeof c === "object" && !Array.isArray(c);
const brojcana = (c) => !c.opcije && (typeof c.odgovor === "number" || (typeof c.odgovor === "string" && parseNumber(c.odgovor) != null));
const vrijednostCelije = (c) => (typeof c.odgovor === "number" ? c.odgovor : parseNumber(c.odgovor));
// bez zadane tolerancije broj se provjerava na onoliko decimala koliko ih ima točan odgovor (11,97 → ±0,005)
function tolCelije(c) {
  if (isNum(c.tolerancija) && c.tolerancija >= 0) return c.tolerancija;
  const d = (String(c.odgovor).replace(/\s+/g, "").split(/[.,]/)[1] ?? "").length;
  return d ? 0.5 * 10 ** -d : 1e-9;
}
const prikazOdgovora = (c) => (typeof c.odgovor === "number" ? formatNumber(c.odgovor) : String(c.odgovor));

function modelOpce(s) {
  const zaglavlje = Array.isArray(s.zaglavlje) ? s.zaglavlje.map((z) => ({ md: String(z ?? ""), aria: goliTekst(z) })) : null;
  const redci = (s.redci ?? []).map((r) =>
    (Array.isArray(r) ? r : []).map((c) =>
      jeObjekt(c)
        ? { upis: true, odgovor: c.opcije ? String(c.odgovor) : c.odgovor, opcije: c.opcije ?? null, broj: brojcana(c), tol: brojcana(c) ? tolCelije(c) : 0, krivo: c.krivo ?? [], savjet: c.savjet ?? null, prikaz: prikazOdgovora(c) }
        : { md: String(c ?? ""), aria: goliTekst(c) },
    ),
  );
  return { vrsta: "opca", zaglavlje, redci, oznakaRetka: !!s.oznake_redaka };
}

// ── tablica istinitosti ───────────────────────────────────────────────────────────────────────────
const OZNAKE_ISTINE = ["T", "F"];
const oznakeIstine = (s) => (Array.isArray(s.istinitost?.oznake) && s.istinitost.oznake.length === 2 ? s.istinitost.oznake.map(String) : OZNAKE_ISTINE);

// stupci za upis: zadano svi izrazi; skriveno smije biti popis indeksa (od 0) ili samih izraza
function skriveniStupci(ist) {
  const izrazi = ist.izrazi ?? [];
  if (!Array.isArray(ist.skriveno)) return izrazi.map((_, i) => i);
  return ist.skriveno.map((x) => (typeof x === "number" ? x : izrazi.indexOf(x)));
}

const OPIS_OP = {
  "∧": (a, b, v) => (v ? "konjunkcija je istinita jer su obje strane istinite" : `konjunkcija je istinita samo kad su obje strane istinite, a ovdje ${!a && !b ? "nijedna nije" : !a ? "lijeva nije" : "desna nije"}`),
  "∨": (a, b, v) => (v ? `disjunkcija je lažna samo kad su obje strane lažne, a ovdje je ${a && b ? "istinito oboje" : a ? "lijeva istinita" : "desna istinita"}` : "disjunkcija je lažna jer su obje strane lažne"),
  "⇒": (a, b, v) => (!v ? "implikacija je lažna: iz istine ne slijedi laž" : !a ? "lažna pretpostavka ne kvari implikaciju" : "istinita pretpostavka i istinit zaključak"),
  "⇔": (a, b, v) => (v ? "ekvivalencija je istinita jer su obje strane iste vrijednosti" : "ekvivalencija je lažna jer strane nemaju istu vrijednost"),
};

function modelIstinitosti(s) {
  const ist = s.istinitost;
  const [T, F] = oznakeIstine(s);
  const sudovi = ist.sudovi.map(String);
  const forme = ist.izrazi.map((iz) => parseLogika(iz));
  const skriveni = new Set(skriveniStupci(ist));
  const naslovi = ist.naslovi ?? [];
  const oz = (b) => (b ? T : F);
  const zaglavlje = [
    ...sudovi.map((x) => ({ md: `$${texLogike({ sud: x })}$`, aria: x })),
    ...forme.map((f, i) => (isText(naslovi[i]) ? { md: naslovi[i], aria: goliTekst(naslovi[i]) } : { md: `$${texLogike(f)}$`, aria: tekstLogike(f) })),
  ];
  const n = sudovi.length;
  const redci = [];
  const vrijednostiZadnjeg = [];
  for (let k = 0; k < 2 ** n; k++) {
    // redoslijed kao u skripti: najprije F, zadnji sud se mijenja najbrže (FF, FT, TF, TT)
    const vr = Object.fromEntries(sudovi.map((x, j) => [x, !!((k >> (n - 1 - j)) & 1)]));
    const opisRetka = sudovi.map((x) => `$${texLogike({ sud: x })}$ = ${oz(vr[x])}`).join(", ");
    const red = sudovi.map((x) => ({ md: oz(vr[x]), aria: oz(vr[x]) }));
    forme.forEach((f, i) => {
      const v = izracunajLogiku(f, vr);
      if (i === forme.length - 1) vrijednostiZadnjeg.push({ v, opisRetka });
      if (!skriveni.has(i)) return red.push({ md: oz(v), aria: oz(v) });
      let zasto;
      if (f.sud) zasto = `U retku ${opisRetka} sud $${texLogike(f)}$ ima vrijednost ${oz(v)}.`;
      else if (f.op === "¬") zasto = `U retku ${opisRetka} je $${texLogike(f.a)}$ = ${oz(izracunajLogiku(f.a, vr))}, a negacija okreće vrijednost, pa je $${texLogike(f)}$ = ${oz(v)}.`;
      else {
        const [a, b] = [izracunajLogiku(f.a, vr), izracunajLogiku(f.b, vr)];
        const strane = f.a.sud && f.b.sud ? "" : ` ($${texLogike(f.a)}$ = ${oz(a)}, $${texLogike(f.b)}$ = ${oz(b)})`;
        zasto = `U retku ${opisRetka} je $${texLogike(f)}$ = ${oz(v)}${strane}: ${OPIS_OP[f.op](a, b, v)}.`;
      }
      red.push({ upis: true, odgovor: oz(v), opcije: [T, F], zasto });
    });
    redci.push(red);
  }
  let tautologija = null;
  if (ist.tautologija) {
    const pada = vrijednostiZadnjeg.find((x) => !x.v);
    const zadnji = `$${texLogike(forme.at(-1))}$`;
    tautologija = {
      odgovor: !pada,
      zasto: pada ? `Zadnji izraz nije tautologija: u retku ${pada.opisRetka} ima vrijednost ${F}.` : `Zadnji izraz jest tautologija: u svakom retku ima vrijednost ${T}.`,
      pitanje: `Je li ${zadnji} tautologija?`,
    };
  }
  const opisiRedaka = redci.map((r) => sudovi.map((x, j) => `${x} = ${r[j].aria}`).join(", "));
  return { vrsta: "istinitost", zaglavlje, redci, oznakaRetka: false, tautologija, opisiRedaka };
}

// ── tablica predznaka i monotonosti ───────────────────────────────────────────────────────────────
const PLUS = "+";
const MINUS = "−";
const RASTE = "↗";
const PADA = "↘";
const MAX = "max";
const MIN = "min";
const NEMA = "—";
const NE_POSTOJI = "∄";

// Podaci za tablicu predznaka: točke, intervali, predznaci i ponašanje; null ako spec nije ispravan.
export function analizaPredznaka(p) {
  const v = p.varijabla ?? "x";
  const c = compile(String(p.izraz));
  const fd = (t) => c.fn({ [v]: t });
  const fn = p.funkcija != null ? compile(String(p.funkcija)) : null;
  const od = brojIzIzraza(p.interval?.[0] ?? "-inf");
  const d = brojIzIzraza(p.interval?.[1] ?? "inf");
  const tocke = (p.tocke ?? []).map((t) => ({ v: brojIzIzraza(t), tex: texIzraza(String(t)) })).sort((a, b) => a.v - b.v);
  const granice = [{ v: od, tex: texTocke(od) ?? texIzraza(String(p.interval?.[0])) }, ...tocke, { v: d, tex: texTocke(d) ?? texIzraza(String(p.interval?.[1])) }];
  const intervali = granice.slice(0, -1).map((a, i) => {
    const b = granice[i + 1];
    return { a, b, uzorak: uzorakIntervala(a.v, b.v) };
  });
  for (const I of intervali) {
    I.vrijednost = fd(I.uzorak);
    I.znak = I.vrijednost > 0 ? PLUS : MINUS;
  }
  tocke.forEach((t, i) => {
    const y = fd(t.v);
    t.nultocka = Number.isFinite(y) && Math.abs(y) <= 1e-9 * Math.max(1, ...intervali.map((I) => Math.abs(I.vrijednost)).filter(Number.isFinite));
    t.prekid = !Number.isFinite(y);
    t.fDefinirana = fn ? Number.isFinite(fn.fn({ [v]: t.v })) : !t.prekid;
    const [l, r] = [intervali[i].znak, intervali[i + 1].znak];
    t.lijevo = l;
    t.desno = r;
    t.ponasanje = !t.fDefinirana ? NE_POSTOJI : l === PLUS && r === MINUS ? MAX : l === MINUS && r === PLUS ? MIN : NEMA;
  });
  return { v, fd, fn, od, d, tocke, intervali };
}

// predstavnik intervala za predznak i za poruku: cijeli broj blizu sredine ako ga ima, inače sredina
function uzorakIntervala(a, b) {
  if (a === -Infinity && b === Infinity) return 0;
  if (a === -Infinity) return Math.ceil(b) - 1;
  if (b === Infinity) return Math.floor(a) + 1;
  const m = (a + b) / 2;
  const k = Math.round(m);
  return k > a && k < b ? k : m;
}

const texIntervala = (I) => `\\langle ${I.a.tex}, ${I.b.tex} \\rangle`;

function modelPredznaka(s) {
  const p = s.predznak;
  const A = analizaPredznaka(p);
  const naziv = p.naziv ?? "f";
  const der = `${naziv}'(${A.v})`;
  const skriveno = new Set(Array.isArray(p.skriveno) ? p.skriveno : ["predznak", "ponasanje"]);
  const imaPrekid = A.tocke.some((t) => t.prekid);
  const zaglavlje = [{ md: `$${A.v}$`, aria: A.v }];
  const redZnak = [{ md: `$${der}$`, aria: goliTekst(der) }];
  const redPon = [{ md: `$${naziv}$`, aria: naziv }];
  A.intervali.forEach((I, i) => {
    const iv = texIntervala(I);
    zaglavlje.push({ md: `$${iv}$`, aria: goliTekst(iv) });
    const vr = `$${der.replace(`(${A.v})`, `(${texBroj(I.uzorak)})`)} = ${texBroj(I.vrijednost)}$`;
    const zasto = `Na $${iv}$ je $${der} ${I.znak === PLUS ? ">" : "<"} 0$ (npr. ${vr})`;
    redZnak.push(skriveno.has("predznak") ? { upis: true, odgovor: I.znak, opcije: [PLUS, MINUS], zasto: `${zasto}, pa je predznak ${I.znak}.` } : { md: I.znak, aria: I.znak });
    redPon.push(
      skriveno.has("ponasanje")
        ? { upis: true, odgovor: I.znak === PLUS ? RASTE : PADA, opcije: [RASTE, PADA], zasto: `${zasto}, pa $${naziv}$ ${I.znak === PLUS ? "raste (↗)" : "pada (↘)"}.` }
        : { md: I.znak === PLUS ? RASTE : PADA, aria: I.znak === PLUS ? "raste" : "pada" },
    );
    const t = A.tocke[i];
    if (!t) return;
    zaglavlje.push({ md: `$${t.tex}$`, aria: goliTekst(t.tex) });
    redZnak.push({ md: t.prekid ? NE_POSTOJI : "0", aria: t.prekid ? "ne postoji" : "0" });
    const u = `U $${A.v} = ${t.tex}$ derivacija`;
    const zastoT =
      t.ponasanje === NE_POSTOJI
        ? `$${naziv}$ nije definirana u $${A.v} = ${t.tex}$, pa ondje nema ni ekstrema (${NE_POSTOJI}).`
        : t.ponasanje === NEMA
          ? `${u} ne mijenja predznak (${t.lijevo} s obje strane), pa to nije ekstrem (${NEMA}).`
          : `${u} mijenja predznak iz ${t.lijevo} u ${t.desno}: $${naziv}$ ${t.ponasanje === MAX ? "raste pa pada" : "pada pa raste"}, pa je to lokalni ${t.ponasanje === MAX ? "maksimum" : "minimum"}.`;
    const opcije = [MIN, MAX, NEMA, ...(imaPrekid ? [NE_POSTOJI] : [])];
    redPon.push(skriveno.has("ponasanje") ? { upis: true, odgovor: t.ponasanje, opcije, zasto: zastoT } : { md: t.ponasanje, aria: t.ponasanje });
  });
  const legenda = `${RASTE} raste, ${PADA} pada, ${MAX}/${MIN} lokalni ekstrem, ${NEMA} nije ekstrem${imaPrekid ? `, ${NE_POSTOJI} ne postoji (nije definirano)` : ""}`;
  return { vrsta: "predznak", zaglavlje, redci: [redZnak, redPon], oznakaRetka: true, legenda };
}

// ── zajednički model ──────────────────────────────────────────────────────────────────────────────
// {vrsta, zaglavlje: [{md, aria}] | null, redci: [[ćelija]], oznakaRetka, legenda?, tautologija?}
// ćelija: {md, aria} (zadana) ili {upis: true, odgovor, opcije?, zasto?/krivo?/savjet?, broj?, tol?}
export function modelTablice(s) {
  if (s.istinitost) return modelIstinitosti(s);
  if (s.predznak) return modelPredznaka(s);
  return modelOpce(s);
}

// Matrica odgovora istog oblika kao redci (null za zadane ćelije): točni odgovori, za „Pokaži“ i za iOS.
export const tocnaMatrica = (m) => m.redci.map((r) => r.map((c) => (c.upis ? c.odgovor : null)));

function tocnaCelija(c, u) {
  if (c.opcije) return u === c.odgovor;
  if (c.broj) {
    const n = parseNumber(String(u ?? ""));
    return n != null && near(n, vrijednostCelije(c), c.tol);
  }
  return bezRazmaka(u) === bezRazmaka(c.odgovor);
}

function istoKaoKrivo(c, u, k) {
  if (c.broj) {
    const n = parseNumber(String(u ?? ""));
    const kv = typeof k.odgovor === "number" ? k.odgovor : parseNumber(String(k.odgovor));
    return n != null && kv != null && near(n, kv, tolerance(kv, k.tolerancija ?? c.tol));
  }
  return c.opcije ? u === String(k.odgovor) : bezRazmaka(u) === bezRazmaka(k.odgovor);
}

// Oznake retka i stupca ćelije (md i goli tekst). Bez zaglavlja, a s nazivima redaka, stupac imenuje prvi redak
// („$x$ = 2,1“), kao u tablici vrijednosti.
function oznakeCelije(m, r, k) {
  const prvi = m.redci[r][0];
  const red = m.oznakaRetka && prvi && !prvi.upis ? { md: prvi.md, aria: prvi.aria } : null;
  let stupac = m.zaglavlje?.[k] ? { md: m.zaglavlje[k].md, aria: m.zaglavlje[k].aria } : null;
  const gore = m.redci[0];
  if (!stupac && m.oznakaRetka && r > 0 && gore.every((c) => !c.upis)) stupac = { md: `${gore[0].md} = ${gore[k].md}`, aria: `${gore[0].aria} = ${gore[k].aria}` };
  return { red, stupac };
}

// opis ćelije za čitač zaslona: „Redak A = F, B = T, stupac A ⇒ B“
export function ariaCelije(m, r, k) {
  const { red, stupac } = oznakeCelije(m, r, k);
  const redak = m.opisiRedaka?.[r] ?? red?.aria ?? `${r + 1}.`;
  return `Redak ${redak}, stupac ${stupac?.aria ?? `${k + 1}.`}`;
}

function gdje(m, r, k) {
  const { red, stupac } = oznakeCelije(m, r, k);
  const redak = red ? `U retku „${red.aria}“` : m.redci.length > 1 ? `U ${r + 1}. retku` : "U tablici";
  return `${redak}${stupac ? `, stupac „${stupac.aria}“` : `, ${k + 1}. stupac`}`;
}

// Točan odgovor tablice predznaka kao rečenica: predznak, monotonost, ekstremi.
function opisPredznaka(m, s) {
  const A = analizaPredznaka(s.predznak);
  const naziv = s.predznak.naziv ?? "f";
  const iv = (I) => `$${texIntervala(I)}$`;
  const na = (znak) => A.intervali.filter((I) => I.znak === znak).map(iv);
  const spoji = (l) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} i ${l.at(-1)}` : l[0]);
  const d = [`$${naziv}'$: ${A.intervali.map((I) => `${I.znak} na ${iv(I)}`).join(", ")}`];
  const mon = [na(PLUS).length ? `raste na ${spoji(na(PLUS))}` : "", na(MINUS).length ? `pada na ${spoji(na(MINUS))}` : ""].filter(Boolean);
  d.push(`$${naziv}$ ${mon.join(", a ")}`);
  const ekstremi = A.tocke.filter((t) => t.ponasanje === MAX || t.ponasanje === MIN).map((t) => `lokalni ${t.ponasanje === MAX ? "maksimum" : "minimum"} u $${A.v} = ${t.tex}$`);
  const bez = A.tocke.filter((t) => t.ponasanje === NEMA).map((t) => `$${A.v} = ${t.tex}$`);
  if (ekstremi.length) d.push(ekstremi.join(", "));
  if (bez.length) d.push(`u ${spoji(bez)} nije ekstrem`);
  return d.join("; ");
}

function objasni(m, r, k, u) {
  const c = m.redci[r][k];
  const hit = (c.krivo ?? []).find((x) => istoKaoKrivo(c, u, x));
  if (hit) return `${gdje(m, r, k)}: ${hit.poruka}`;
  if (c.zasto) return c.zasto;
  if (c.savjet) return `${gdje(m, r, k)}: ${c.savjet}`;
  if (c.broj && parseNumber(String(u ?? "")) == null) return `${gdje(m, r, k)}: upiši broj (decimalni zarez je u redu).`;
  return `${gdje(m, r, k)}: nije točno.`;
}

// ── widget ────────────────────────────────────────────────────────────────────────────────────────
function validateOpca(s, need) {
  const zag = s.zaglavlje;
  if (zag != null) need(Array.isArray(zag) && zag.length >= 1 && zag.length <= 10 && zag.every((z) => typeof z === "string"), "zaglavlje je popis 1–10 tekstova");
  if (!need(Array.isArray(s.redci) && s.redci.length >= 1 && s.redci.length <= 16, "redci su popis 1–16 redaka")) return;
  const sirina = Array.isArray(zag) ? zag.length : s.redci[0]?.length;
  let upisa = 0;
  s.redci.forEach((r, i) => {
    if (!need(Array.isArray(r) && r.length >= 1 && r.length <= 10, `redci[${i}] je popis 1–10 ćelija`)) return;
    need(r.length === sirina, `redci[${i}] nema jednako ćelija kao ${Array.isArray(zag) ? "zaglavlje" : "prvi redak"} (${r.length} prema ${sirina})`);
    r.forEach((c, j) => {
      const gd = `redci[${i}][${j}]`;
      if (!jeObjekt(c)) return need(typeof c === "string" || typeof c === "number", `${gd} je tekst ili {odgovor, opcije?}`);
      upisa++;
      if (!need(typeof c.odgovor === "number" || isText(String(c.odgovor ?? "")), `${gd} treba „odgovor“`)) return;
      if (c.opcije != null) {
        if (!need(Array.isArray(c.opcije) && c.opcije.length >= 2 && c.opcije.length <= 6 && c.opcije.every((o) => isText(String(o))), `${gd}.opcije su 2–6 kratkih tekstova`)) return;
        need(new Set(c.opcije.map(String)).size === c.opcije.length, `${gd}.opcije moraju biti različite`);
        need(c.opcije.map(String).includes(String(c.odgovor)), `${gd}.odgovor „${c.odgovor}“ nije među opcijama`);
      }
      if (c.tolerancija != null) need(isNum(c.tolerancija) && c.tolerancija >= 0, `${gd}.tolerancija je broj ≥ 0`);
      if (c.savjet != null) need(isText(c.savjet), `${gd}.savjet je tekst`);
      const cel = modelOpce({ redci: [[c]] }).redci[0][0];
      for (const [k, x] of (c.krivo ?? []).entries()) {
        need(isText(x?.poruka), `${gd}.krivo[${k}] treba „poruka“`);
        if (c.opcije) need(c.opcije.map(String).includes(String(x?.odgovor)), `${gd}.krivo[${k}].odgovor nije među opcijama`);
        need(!tocnaCelija(cel, String(x?.odgovor)), `${gd}.krivo[${k}] jednak je točnom odgovoru`);
      }
    });
  });
  if (s.nacin === "popuni") need(upisa >= 1, "„popuni“ treba barem jednu ćeliju za upis ({odgovor, opcije?})");
}

function validateIstinitost(s, need) {
  const ist = s.istinitost;
  if (!need(jeObjekt(ist), "istinitost je {sudovi, izrazi, skriveno?, tautologija?}")) return;
  const oznake = ist.oznake ?? OZNAKE_ISTINE;
  need(Array.isArray(oznake) && oznake.length === 2 && oznake.every((o) => isText(String(o))) && oznake[0] !== oznake[1], "istinitost.oznake su dvije različite oznake [istina, laž], npr. [\"T\", \"F\"]");
  const sudovi = ist.sudovi;
  if (!need(Array.isArray(sudovi) && sudovi.length >= 1 && sudovi.length <= 4 && sudovi.every((x) => SUD.test(String(x)) && !RIJECI[String(x).toLowerCase()]), "istinitost.sudovi su 1–4 imena sudova, npr. [\"A\", \"B\"]")) return;
  need(new Set(sudovi).size === sudovi.length, "imena sudova moraju biti različita");
  need(!sudovi.some((x) => oznake.includes(x)), `sud se ne smije zvati kao oznaka vrijednosti (${oznake.join(", ")})`);
  if (!need(Array.isArray(ist.izrazi) && ist.izrazi.length >= 1 && ist.izrazi.length <= 6, "istinitost.izrazi su 1–6 sudnih formi")) return;
  ist.izrazi.forEach((iz, i) => {
    try {
      const f = parseLogika(iz);
      const strani = [...sudoviForme(f)].filter((x) => !sudovi.includes(x));
      need(!strani.length, `izrazi[${i}] koristi sud koji nije u „sudovi“: ${strani.join(", ")}`);
    } catch (e) {
      need(false, `izrazi[${i}] „${iz}“: ${e.message}`);
    }
  });
  if (ist.naslovi != null) need(Array.isArray(ist.naslovi) && ist.naslovi.length <= ist.izrazi.length, "istinitost.naslovi su popis naslova stupaca izraza (null za zadani zapis)");
  if (ist.skriveno != null) {
    const sk = skriveniStupci(ist);
    need(Array.isArray(ist.skriveno) && sk.every((i) => Number.isInteger(i) && i >= 0 && i < ist.izrazi.length), "istinitost.skriveno su indeksi (od 0) ili sami izrazi iz „izrazi“");
    if (s.nacin === "popuni") need(sk.length >= 1 || ist.tautologija, "„popuni“ treba barem jedan stupac za upis (skriveno) ili pitanje o tautologiji");
  }
  if (ist.tautologija != null) need(ist.tautologija === true || ist.tautologija === false, "istinitost.tautologija je true ili false");
}

function validatePredznak(s, need) {
  const p = s.predznak;
  if (!need(jeObjekt(p), "predznak je {izraz, tocke, interval?, funkcija?}")) return;
  const v = p.varijabla ?? "x";
  if (!need(/^[a-z]$/.test(v) && v !== "e", "predznak.varijabla je jedno malo slovo (zadano x)")) return;
  if (p.naziv != null) need(isText(p.naziv) && p.naziv.length <= 3, "predznak.naziv je kratko ime funkcije (zadano f)");
  let izraziOk = true;
  for (const k of ["izraz", "funkcija"]) {
    if (k === "funkcija" && p[k] == null) continue;
    try {
      const c = compile(String(p[k] ?? ""));
      const strane = c.vars.filter((x) => x !== v);
      izraziOk = need(!strane.length, `predznak.${k} smije koristiti samo varijablu ${v} (ima ${strane.join(", ")})`);
    } catch (e) {
      izraziOk = need(false, `predznak.${k}: ${e.message}`);
    }
  }
  if (p.skriveno != null) need(Array.isArray(p.skriveno) && p.skriveno.length >= 1 && p.skriveno.every((x) => ["predznak", "ponasanje"].includes(x)), "predznak.skriveno je popis od \"predznak\" i \"ponasanje\"");
  const od = brojIzIzraza(p.interval?.[0] ?? "-inf");
  const d = brojIzIzraza(p.interval?.[1] ?? "inf");
  if (p.interval != null) need(Array.isArray(p.interval) && p.interval.length === 2 && od != null && d != null && od < d, "predznak.interval je [od, do] uz od < do (smiju -inf i inf)");
  if (!need(Array.isArray(p.tocke) && p.tocke.length >= 1 && p.tocke.length <= 6, "predznak.tocke su 1–6 nultočaka i točaka prekida izraza")) return;
  const t = p.tocke.map(brojIzIzraza);
  if (!need(t.every((x) => x != null && Number.isFinite(x)), "predznak.tocke su brojevi ili izrazi bez varijable")) return;
  need(new Set(t.map((x) => x.toPrecision(9))).size === t.length, "predznak.tocke moraju biti različite");
  if (od == null || d == null || od >= d || !izraziOk) return;
  const izvan = t.find((x) => x <= od || x >= d);
  if (!need(izvan == null, `točka ${formatNumber(izvan ?? 0)} nije unutar intervala`)) return;
  let c;
  try {
    c = compile(String(p.izraz));
  } catch {
    return;
  }
  const f = (x) => c.fn({ [v]: x });
  const ts = [...t].sort((a, b) => a - b);
  const granice = [od, ...ts, d];
  // mjerilo za „nula“: tipična veličina izraza na intervalu
  const uzorci = [];
  for (let i = 0; i + 1 < granice.length; i++) {
    const [a, b] = rubovi(granice[i], granice[i + 1], ts);
    for (let k = 1; k < 400; k++) uzorci.push(Math.abs(f(a + ((b - a) * k) / 400)));
  }
  const fin = uzorci.filter(Number.isFinite).sort((a, b) => a - b);
  const mjera = Math.max(1, fin[Math.floor(fin.length / 2)] ?? 1);
  ts.forEach((x) => {
    const y = f(x);
    need(!Number.isFinite(y) || Math.abs(y) <= 1e-9 * mjera, `u ${v} = ${formatNumber(x)} izraz je ${formatNumber(y)}, pa to nije ni nultočka ni točka prekida`);
    if (!Number.isFinite(y) && p.funkcija == null) need(false, `u ${v} = ${formatNumber(x)} izraz nije definiran: dodaj predznak.funkcija (sama funkcija), da kod zna je li ona ondje definirana (ekstrem ili ∄)`);
  });
  // u svakom intervalu izraz mora biti definiran i istog predznaka, bez skrivene nultočke (dvostruke)
  for (let i = 0; i + 1 < granice.length; i++) {
    const [a, b] = rubovi(granice[i], granice[i + 1], ts);
    const N = 2000;
    const xs = Array.from({ length: N - 1 }, (_, k) => a + ((b - a) * (k + 1)) / N);
    const ys = xs.map(f);
    const nedef = xs.find((x, k) => !Number.isFinite(ys[k]));
    const iv = `⟨${fmtRub(granice[i])}, ${fmtRub(granice[i + 1])}⟩`;
    if (!need(nedef == null, `izraz nije definiran oko ${v} ≈ ${formatNumber(nedef ?? 0)} u ${iv}: suzi interval ili dodaj točku`)) continue;
    const promjena = xs.findIndex((x, k) => k > 0 && Math.sign(ys[k]) !== Math.sign(ys[k - 1]) && ys[k] !== 0 && ys[k - 1] !== 0);
    if (!need(promjena < 0, `u ${iv} izraz mijenja predznak oko ${v} ≈ ${formatNumber(xs[Math.max(0, promjena)])}: fali nultočka ili točka prekida`)) continue;
    const nula = xs.findIndex((x, k) => ys[k] === 0);
    if (!need(nula < 0, `u ${iv} izraz je 0 u ${v} = ${formatNumber(xs[Math.max(0, nula)])}: fali ta nultočka`)) continue;
    // lokalni minimum |f| koji se profinjen spusti na nulu = nultočka bez promjene predznaka
    for (let k = 1; k + 1 < N - 1; k++) {
      const [l, m0, r] = [Math.abs(ys[k - 1]), Math.abs(ys[k]), Math.abs(ys[k + 1])];
      if (!(m0 <= l && m0 <= r)) continue;
      let [lo, hi] = [xs[k - 1], xs[k + 1]];
      for (let it = 0; it < 80; it++) {
        const [x1, x2] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3];
        if (Math.abs(f(x1)) < Math.abs(f(x2))) hi = x2;
        else lo = x1;
      }
      const xm = (lo + hi) / 2;
      if (Math.abs(f(xm)) <= 1e-9 * mjera) {
        need(false, `u ${iv} izraz ima nultočku ${v} ≈ ${formatNumber(xm)} (bez promjene predznaka): dodaj je u tocke`);
        break;
      }
    }
  }
}
// beskonačni rub → konačan raspon za uzorke (desetak jedinica iza zadnje točke)
function rubovi(a, b, ts) {
  const raspon = ts.length ? Math.max(10, 2 * (ts.at(-1) - ts[0])) : 10;
  const lijevo = ts.length ? ts[0] : 0;
  const desno = ts.length ? ts.at(-1) : 0;
  return [a === -Infinity ? Math.min(lijevo, b) - raspon : a, b === Infinity ? Math.max(desno, a) + raspon : b];
}
const fmtRub = (x) => (x === Infinity ? "+∞" : x === -Infinity ? "−∞" : formatNumber(x));

export const tablica = {
  tip: "tablica",
  samoRucno: true,
  uloga: (s) => (s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR),
  opis: `Tablica koju učenik popunjava (tablica istinitosti, predznaka derivacije i monotonosti, tablica vrijednosti). Polja: tekst, nacin:
"prikaz" (sve popunjeno, korak za gledanje) ili "popuni" (Tvoj red: učenik popuni ćelije za upis i provjeri; krive ćelije se istaknu,
poruka kaže koliko ih je krivo i objasni prvu). Točno jedno od triju:
- opća tablica: zaglavlje?: [markdown, …] (naslovi stupaca), redci: [[ćelija, …], …] (1–16 redaka, 1–10 stupaca), oznake_redaka?: true
  (prvi stupac su nazivi redaka, ostaje vidljiv pri pomicanju). Ćelija je tekst (zadano, smije $…$) ili {odgovor, opcije?, krivo?: [{odgovor,
  poruka}], savjet?, tolerancija?}. S opcijama (npr. ["T", "F"], ["+", "−", "0"], ["↗", "↘"]) učenik dodirom mijenja vrijednost; bez opcija
  upisuje: broj (odgovor 11.97 ili "11,97": točno na onoliko decimala koliko ih ima odgovor, ili ± tolerancija) ili kratak tekst (bez
  razmaka i velikih slova).
- istinitost: {sudovi: ["A", "B"] (1–4), izrazi: ["A => B", "(A => B) and not B", "((A => B) ∧ ¬B) ⇒ ¬A"] (1–6; ¬ ∧ ∨ ⇒ ⇔ i zagrade,
  ili not, and, or, =>, <=>, ili LaTeX \\neg \\wedge \\vee \\Rightarrow \\Leftrightarrow), skriveno?: stupci za upis (indeksi od 0 ili sami
  izrazi; zadano svi izrazi), naslovi?: [naslov stupca izraza ili null] (npr. "cijela forma"), tautologija?: true (pitanje „Je li zadnji
  izraz tautologija?“), oznake?: ["T", "F"] (zadano; može ["1", "0"])}. Kod sastavi sve retke (F prije T, zadnji sud se mijenja najbrže:
  FF, FT, TF, TT) i izračuna vrijednosti; poruka za krivu ćeliju objasni veznik u tom retku.
- predznak: {izraz (derivacija, npr. "6*x^2-18*x+12"), tocke: [nultočke i točke u kojima izraz nije definiran] (1–6, brojevi ili izrazi),
  interval?: [od, do] (domena, zadano ["-inf", "inf"]), funkcija?: sama funkcija (obavezna kad izraz u nekoj točki nije definiran: kod iz nje
  zna je li funkcija ondje definirana), naziv?: "f", varijabla?: "x", skriveno?: ["predznak", "ponasanje"] (redci za upis, zadano oba)}. Kod
  sastavi stupce ⟨−∞, x₁⟩, x₁, ⟨x₁, x₂⟩, … s retkom predznaka (+/−; u točkama 0 ili ∄, zadano) i retkom ponašanja (↗/↘; u točkama min, max,
  — nije ekstrem, ∄ nije definirana); validator provjeri da su tocke stvarno nultočke ili prekidi i da nijedna ne fali.`,
  primjer: {
    tip: "tablica",
    nacin: "popuni",
    tekst: "Tablicom istinitosti provjeri je li sudna forma $\\big((A\\Rightarrow B)\\wedge\\neg B\\big)\\Rightarrow\\neg A$ tautologija.",
    istinitost: { sudovi: ["A", "B"], izrazi: ["A => B", "not B", "(A => B) and not B", "not A", "((A => B) and not B) => not A"], naslovi: [null, null, null, null, "cijela forma"], tautologija: true },
  },
  primjeri: [
    {
      tip: "tablica",
      nacin: "prikaz",
      tekst: "Implikacija $X\\Rightarrow Y$ lažna je jedino kad je $X$ istinit, a $Y$ lažan.",
      istinitost: { sudovi: ["X", "Y"], izrazi: ["X => Y"] },
    },
    {
      tip: "tablica",
      nacin: "popuni",
      tekst: "Za $n=6$ promatramo sudove $X$: „$n$ je djeljiv s 4“ i $Y$: „$n$ je paran“. Odredi istinitost svakog suda.",
      zaglavlje: ["$X$", "$Y$", "$\\neg X$", "$X\\wedge Y$", "$X\\vee Y$"],
      redci: [
        [
          { odgovor: "F", opcije: ["T", "F"], krivo: [{ odgovor: "T", poruka: "6 nije djeljiv s 4 ($6 = 4 \\cdot 1 + 2$)." }] },
          { odgovor: "T", opcije: ["T", "F"] },
          { odgovor: "T", opcije: ["T", "F"], savjet: "negacija okreće vrijednost suda $X$." },
          { odgovor: "F", opcije: ["T", "F"], savjet: "konjunkcija je istinita samo kad su oba suda istinita." },
          { odgovor: "T", opcije: ["T", "F"], savjet: "disjunkcija je lažna samo kad su oba suda lažna." },
        ],
      ],
    },
    {
      tip: "tablica",
      nacin: "popuni",
      tekst: "Za $f(x) = 2x^3 - 9x^2 + 12x$ je $f'(x) = 6x^2 - 18x + 12 = 6(x-1)(x-2)$. Popuni tablicu predznaka derivacije i ponašanja funkcije.",
      predznak: { izraz: "6*x^2-18*x+12", tocke: [1, 2] },
    },
    {
      tip: "tablica",
      nacin: "popuni",
      tekst: "Za $f(x) = (x-1)^3(x+3)$ je $f'(x) = 4(x-1)^2(x+2)$. Popuni tablicu.",
      predznak: { izraz: "4*(x-1)^2*(x+2)", tocke: [-2, 1], skriveno: ["ponasanje"] },
    },
    {
      tip: "tablica",
      nacin: "prikaz",
      tekst: "Funkcija $f(x) = x + \\frac{1}{x}$ ima $f'(x) = 1 - \\frac{1}{x^2}$; u $x = 0$ nije definirana.",
      predznak: { izraz: "1-1/x^2", tocke: [-1, 0, 1], funkcija: "x+1/x" },
    },
    {
      tip: "tablica",
      nacin: "popuni",
      tekst: "Funkcija je $f(x) = 3x + 6$ za $x \\neq 2$ i $f(2) = 4$. Izračunaj vrijednosti blizu 2.",
      oznake_redaka: true,
      redci: [
        ["$x$", "1,9", "1,99", "2,01", "2,1"],
        ["$f(x)$", { odgovor: "11,7" }, { odgovor: "11,97" }, { odgovor: "12,03" }, { odgovor: "12,3", krivo: [{ odgovor: 4, poruka: "$f(2) = 4$ vrijedi samo u točki 2, a ovdje je $x = 2{,}1$." }] }],
      ],
    },
  ],
  validate(s) {
    const { list, need } = problems();
    need(NACINI.includes(s.nacin), "tablica.nacin mora biti \"prikaz\" ili \"popuni\"");
    need(isText(s.tekst), "tablica treba „tekst“");
    const vrste = ["istinitost", "predznak", "redci"].filter((k) => s[k] != null);
    if (!need(vrste.length === 1, "tablica treba točno jedno od: redci (opća tablica), istinitost, predznak")) return list;
    if (s.nacin === "prikaz") noAnswerFields(s, need);
    if (s.istinitost) validateIstinitost(s, need);
    else if (s.predznak) validatePredznak(s, need);
    else validateOpca(s, need);
    if (!list.length) {
      try {
        const m = modelTablice(s);
        need(m.redci.length >= 1, "tablica nema redaka");
      } catch (e) {
        need(false, `tablica se ne može sastaviti: ${e.message}`);
      }
    }
    return list;
  },
  // odgovor: matrica istog oblika kao tablica (redci × stupci tijela, null za zadane ćelije);
  // uz istinitost.tautologija: {celije: matrica, tautologija: true | false}
  check(s, odgovor) {
    const m = modelTablice(s);
    const celije = Array.isArray(odgovor) ? odgovor : (odgovor?.celije ?? []);
    const prazne = [];
    const krive = [];
    m.redci.forEach((r, i) =>
      r.forEach((c, k) => {
        if (!c.upis) return;
        const u = celije?.[i]?.[k];
        if (u == null || !String(u).trim()) prazne.push([i, k]);
        else if (!tocnaCelija(c, u)) krive.push([i, k]);
      }),
    );
    const t = m.tautologija;
    const tOdg = odgovor?.tautologija;
    if (prazne.length) return { tocno: false, prazno: true, prazne, poruka: `Popuni sve ćelije (prazno: ${prazne.length}).` };
    if (t && tOdg !== true && tOdg !== false) return { tocno: false, prazno: true, prazne: [], poruka: "Odgovori je li zadnji izraz tautologija." };
    const tKriva = !!t && tOdg !== t.odgovor;
    if (!krive.length && !tKriva) return { tocno: true };
    if (!krive.length) return { tocno: false, krive, krivaTautologija: true, poruka: t.zasto };
    const [r, k] = krive[0];
    return { tocno: false, krive, krivaTautologija: tKriva, poruka: `${brojKrivih(krive.length)}. ${objasni(m, r, k, celije[r][k])}` };
  },
  tocanOdgovor(s) {
    const m = modelTablice(s);
    const dijelovi = [];
    if (m.vrsta === "istinitost") {
      m.zaglavlje.forEach((z, k) => {
        const vr = m.redci.map((r) => r[k]).filter((c) => c.upis);
        if (vr.length) dijelovi.push(`${z.md}: ${vr.map((c) => c.odgovor).join(", ")}`);
      });
    } else if (m.vrsta === "predznak") {
      dijelovi.push(opisPredznaka(m, s));
    } else {
      m.redci.forEach((r, i) =>
        r.forEach((c, k) => {
          if (!c.upis) return;
          const { red, stupac } = oznakeCelije(m, i, k);
          const gdje = [red?.md ?? (m.redci.length > 1 ? `${i + 1}. redak` : ""), stupac?.md ?? `${k + 1}. stupac`].filter(Boolean).join(", ");
          dijelovi.push(`${gdje}: ${c.prikaz ?? c.odgovor}`);
        }),
      );
    }
    if (m.tautologija) dijelovi.push(m.tautologija.odgovor ? "jest tautologija" : "nije tautologija");
    return dijelovi.join("; ");
  },
  kljucOdgovora: (s) => {
    try {
      const m = modelTablice(s);
      return JSON.stringify([tocnaMatrica(m), m.tautologija?.odgovor ?? null]);
    } catch {
      return "?";
    }
  },
};
