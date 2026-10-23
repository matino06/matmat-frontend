// titracija: kiselo-bazna titracija. U tikvici je analit (kiselina ili lužina/baza), u bireti titrant (jaka lužina ili
// jaka kiselina). Kod iz formula zna koliko H₃O⁺ / OH⁻ daje jedinka (H₂SO₄ školski 2, Ba(OH)₂ 2), slaže jednadžbu
// neutralizacije i stehiometrijski omjer, računa volumen ekvivalencije i pH u svakoj točki krivulje (točno, iz bilance
// naboja: jaka/jaka, slaba kiselina + jaka lužina s hidrolizom soli u točki ekvivalencije, slaba baza + jaka kiselina),
// gdje indikator mijenja boju, lanac n = c · V → omjer → c i tipične krive vrijednosti, te pH pufera kad mu se doda
// malo jake kiseline ili lužine (pokus 13, acetatni pufer).
//
// Račun pH, tvari (jake i slabe kiseline i baze sa školskim Ka / Kb) i boje indikatora dolaze iz ph_skala.js, da se oba
// widgeta slažu. Kw, Ka / Kb i intervali indikatora nisu na listu mature (vidi ph_skala.js).
import { isNum, parseNumber, formatNumber, formatSci, near } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { atomiOd } from "./_tablice.js";
import { formulaZapis } from "./mol_racun.js";
import { tvar, kljuc, INDIKATORI, VRSTA_IME, KW_25, zapisPH, zapisC } from "./ph_skala.js";

export const NACINI = ["istrazi", "ekvivalencija", "izracunaj", "indikator", "pufer"];
export const KAP = 0.05; // mL, jedna kap iz birete
export const BIRETE = [10, 25, 50];
const Kw = KW_25;

// indikatori: id iz ph_skala, prihvaća se i „metiloranž“
const IND = { fenolftalein: "fenolftalein", metiloranz: "metiloranz", "metiloranž": "metiloranz", lakmus: "lakmus", univerzalni: "univerzalni" };
export const indId = (x) => IND[String(x ?? "").trim().toLowerCase()] ?? null;
export const IND_RED = ["fenolftalein", "metiloranz", "lakmus", "univerzalni"];
// boja se „promijenila“ na sredini područja prijelaza (pK indikatora)
export const pKind = (ind) => (INDIKATORI[ind]?.prijelaz ? (INDIKATORI[ind].prijelaz[0] + INDIKATORI[ind].prijelaz[1]) / 2 : null);

// ── ioni za jednadžbu neutralizacije ──
// anion kiseline: [anion, naboj, višeatomni (zagrada uz indeks), organski (sol se piše anion prvi: CH₃COONa)]
const ANION = {
  HCl: ["Cl", 1],
  HBr: ["Br", 1],
  HI: ["I", 1],
  HNO3: ["NO3", 1, true],
  HClO4: ["ClO4", 1, true],
  H2SO4: ["SO4", 2, true],
  HF: ["F", 1],
  HNO2: ["NO2", 1, true],
  HClO: ["ClO", 1, true],
  HCN: ["CN", 1, true],
  CH3COOH: ["CH3COO", 1, true, true],
  HCOOH: ["HCOO", 1, true, true],
  CH3CH2COOH: ["CH3CH2COO", 1, true, true],
  CH3CH2CH2COOH: ["CH3CH2CH2COO", 1, true, true],
  C6H5COOH: ["C6H5COO", 1, true, true],
};
// kation lužine / baze: [kation, naboj, višeatomni, nastaje voda]
const KATION = {
  LiOH: ["Li", 1, false, true],
  NaOH: ["Na", 1, false, true],
  KOH: ["K", 1, false, true],
  "Ca(OH)2": ["Ca", 2, false, true],
  "Sr(OH)2": ["Sr", 2, false, true],
  "Ba(OH)2": ["Ba", 2, false, true],
  NH3: ["NH4", 1, true, false],
  CH3NH2: ["CH3NH3", 1, true, false],
  CH3CH2NH2: ["CH3CH2NH3", 1, true, false],
  CH3CH2CH2NH2: ["CH3CH2CH2NH3", 1, true, false],
  "(CH3)2NH": ["(CH3)2NH2", 1, true, false],
  "(CH3)3N": ["(CH3)3NH", 1, true, false],
};
// sol pufera → njezina slaba kiselina
const SOL_KISELINE = { CH3COONa: "CH3COOH", CH3COOK: "CH3COOH", HCOONa: "HCOOH", HCOOK: "HCOOH", C6H5COONa: "C6H5COOH", NaF: "HF", NaClO: "HClO", NaCN: "HCN", KCN: "HCN" };

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ioni = (f, n, poli) => (n > 1 ? (poli ? `(${f})${n}` : `${f}${n}`) : f);
// „H₃O⁺“ zapis iona: „SO₄²⁻“
const SUPN = { 1: "", 2: "²", 3: "³" };
export const zapisIona = (f, z, znak) => `${formulaZapis(f)}${SUPN[z]}${znak}`;

// Jednadžba neutralizacije {lijevo: [{k, f}], desno: [{k, f}], kA, kT, sol, anion, kation} ili null (nepoznat ion)
export function jednadzbaOf(an, ti) {
  const kis = an.priroda === "kiselina" ? an : ti;
  const baz = kis === an ? ti : an;
  const A = ANION[kis.kljuc];
  const K = KATION[baz.kljuc];
  if (!A || !K) return null;
  const [af, za, apoli, org] = A;
  const [kf, zk, kpoli, voda] = K;
  const g = gcd(za, zk);
  const x = za / g; // kationa u soli
  const y = zk / g; // aniona u soli
  const sol = org ? `${ioni(af, y, true)}${ioni(kf, x, kpoli)}` : `${ioni(kf, x, kpoli)}${ioni(af, y, apoli)}`;
  const L = (za * zk) / g;
  const kKis = L / za;
  const kBaz = L / zk;
  const clan = (t) => ({ k: t === kis ? kKis : kBaz, f: t.formula });
  return {
    lijevo: [clan(an), clan(ti)],
    desno: [{ k: 1, f: formulaZapis(sol) }, ...(voda ? [{ k: L, f: "H₂O" }] : [])],
    kA: an === kis ? kKis : kBaz,
    kT: ti === kis ? kKis : kBaz,
    sol: formulaZapis(sol),
    anion: zapisIona(af, za, "⁻"),
    kation: zapisIona(kf, zk, "⁺"),
    hidrolizira: !kis.jaka ? "anion" : !baz.jaka ? "kation" : null,
  };
}
export const zapisJednadzbe = (j) =>
  j ? `${j.lijevo.map((c) => `${c.k > 1 ? `${c.k} ` : ""}${c.f}`).join(" + ")} → ${j.desno.map((c) => `${c.k > 1 ? `${c.k} ` : ""}${c.f}`).join(" + ")}` : "";

// ── sudionici ──
const TITRIRA = ["jaka_kiselina", "jaka_luzina", "slaba_kiselina", "slaba_baza"];
export function sudionikOf(o, gdje) {
  if (!o || typeof o !== "object") return { greska: `${gdje} mora biti {formula, c, …}` };
  if (!isText(o.formula)) return { greska: `${gdje} treba formulu (npr. "HCl", "NaOH")` };
  if (!atomiOd(o.formula)) return { greska: `${gdje}: formula „${o.formula}“ se ne da pročitati` };
  const t = tvar(o.formula);
  const Kz = isNum(o.Ka) ? o.Ka : isNum(o.Kb) ? o.Kb : null;
  let vrsta = t?.vrsta ?? null;
  if (!t) {
    if (isNum(o.Ka)) vrsta = "slaba_kiselina";
    else if (isNum(o.Kb)) vrsta = "slaba_baza";
    else return { greska: `${gdje}: „${o.formula}“ nije u popisu jakih i slabih kiselina i baza; za drugu slabu kiselinu zadaj Ka, za slabu bazu Kb` };
  }
  if (!TITRIRA.includes(vrsta))
    return { greska: `${gdje}: ${formulaZapis(t.formula)} je ${VRSTA_IME[vrsta]}; u kiselo-baznoj titraciji jedna je otopina kiselina, a druga lužina ili baza` };
  const k = kljuc(t?.formula ?? o.formula);
  if (k === "H2CO3") return { greska: `${gdje}: ugljična kiselina je slaba dvoprotonska kiselina; njezina titracija ima dva skoka i nije podržana` };
  return {
    formula: formulaZapis(t?.formula ?? o.formula),
    kljuc: k,
    naziv: isText(o.naziv) ? o.naziv : (t?.naziv ?? ""),
    vrsta,
    z: t?.n ?? 1,
    K: Kz ?? t?.K ?? null,
    Kzadan: Kz,
    Kime: vrsta === "slaba_baza" ? "Kb" : "Ka",
    priroda: vrsta.endsWith("kiselina") ? "kiselina" : "baza",
    jaka: vrsta.startsWith("jaka"),
  };
}
export const ionTitracije = (p) => (p.priroda === "kiselina" ? "H₃O⁺" : "OH⁻");

// ── pH smjese ── dijelovi: [{vrsta, C (mol/dm³), z?, K?}]; bilanca naboja, rješava se raspolavljanjem po log c(H₃O⁺)
export function pHSmjese(dijelovi) {
  const f = (lh) => {
    const h = 10 ** lh;
    let s = h - Kw / h;
    for (const d of dijelovi) {
      if (!(d.C > 0)) continue;
      if (d.vrsta === "jaka_kiselina") s -= (d.z ?? 1) * d.C;
      else if (d.vrsta === "jaka_luzina") s += (d.z ?? 1) * d.C;
      else if (d.vrsta === "slaba_kiselina") s -= (d.C * d.K) / (d.K + h);
      else if (d.vrsta === "slaba_baza") s += (d.C * h) / (h + Kw / d.K);
    }
    return s;
  };
  let lo = -16;
  let hi = 2;
  for (let i = 0; i < 70; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) hi = m;
    else lo = m;
  }
  return -(lo + hi) / 2;
}

// ── model titracije ──
export const nacinOf = (s) => s?.nacin;
export function trazeno(s) {
  return s.trazi ?? "c_analit";
}
// {an, ti, Va, ca, ct, r, Vekv, pH(v), pHekv, smjer, bireta, osDo, jed, ind} ili {greska}
export function modelOf(s) {
  const an = sudionikOf(s.analit, "analit");
  if (an.greska) return an;
  const ti = sudionikOf(s.titrant, "titrant");
  if (ti.greska) return ti;
  const Va = isNum(s.analit.V) ? s.analit.V : 25;
  const ct = isNum(s.titrant.c) ? s.titrant.c : 0.1;
  const jed = jednadzbaOf(an, ti);
  // z(A) · n(A) = z(T) · n(T)  →  n(A) = r · n(T)
  const r = ti.z / an.z;
  let ca = s.analit.c;
  const izUtroska = !isNum(ca) && isNum(s.utroseno?.V);
  if (izUtroska) ca = (r * ct * s.utroseno.V) / Va;
  if (!isNum(ca)) ca = 0.1;
  const Vekv = (ca * Va) / (r * ct);
  const dijelovi = (v) => [
    { vrsta: an.vrsta, C: (ca * Va) / (Va + v), z: an.z, K: an.K },
    { vrsta: ti.vrsta, C: (ct * v) / (Va + v), z: ti.z, K: ti.K },
  ];
  const pH = (v) => pHSmjese(dijelovi(Math.max(0, v)));
  const bireta = isNum(s.bireta) ? s.bireta : 50;
  const korakOsi = bireta <= 10 ? 1 : 5;
  const osDo = isNum(s.os_do) ? s.os_do : Math.min(bireta, Math.max(Math.ceil((Vekv * 1.6) / korakOsi) * korakOsi, Math.ceil(Vekv + korakOsi)));
  return {
    an,
    ti,
    Va,
    ca,
    ct,
    r,
    Vekv,
    pH,
    pHekv: pH(Vekv),
    smjer: an.priroda === "kiselina" ? 1 : -1,
    bireta,
    osDo,
    jed,
    ind: indId(s.indikator),
    izUtroska,
  };
}

// Prvi volumen titranta kod kojeg pH prijeđe `cilj` (pH raste kad je u tikvici kiselina); Infinity ako ga ne prijeđe.
export function Vpri(m, cilj, doV = Math.max(m.bireta, m.Vekv * 3)) {
  const preko = (v) => m.smjer * (m.pH(v) - cilj) >= 0;
  if (preko(0)) return 0;
  if (!preko(doV)) return Infinity;
  let lo = 0;
  let hi = doV;
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2;
    if (preko(v)) hi = v;
    else lo = v;
  }
  return hi;
}
// volumen kod kojeg indikator promijeni boju (sredina područja prijelaza)
export const Vkraja = (m, ind) => (pKind(ind) == null ? null : Vpri(m, pKind(ind)));

// Prikladni indikatori (školsko pravilo): jaka/jaka oba, slaba kiselina + jaka lužina fenolftalein (pH ekv > 7),
// jaka kiselina + slaba baza metiloranž (pH ekv < 7). Lakmus i univerzalni mijenjaju boju postupno: nikad.
export function prikladni(m) {
  const kis = m.an.priroda === "kiselina" ? m.an : m.ti;
  const baz = kis === m.an ? m.ti : m.an;
  if (kis.jaka && baz.jaka) return ["fenolftalein", "metiloranz"];
  if (!kis.jaka) return ["fenolftalein"];
  return ["metiloranz"];
}
export const tolerancijaMl = (s, m) => (isNum(s.tolerancija_mL) ? s.tolerancija_mL : Math.max(0.1, 0.01 * m.Vekv));

// ── pufer ──
export function puferModel(s) {
  const p = s.pufer ?? {};
  const k = p.kiselina ?? {};
  const b = p.sol ?? {};
  const tk = isText(k.formula) ? tvar(k.formula) : null;
  const tb = isText(b.formula) ? tvar(b.formula) : null;
  const Ka = isNum(p.Ka) ? p.Ka : (tk?.K ?? null);
  const imaV = isNum(k.V) && isNum(b.V);
  const cK = imaV ? (k.c * k.V) / (k.V + b.V) : k.c;
  const cS = imaV ? (b.c * b.V) / (k.V + b.V) : b.c;
  const uzorak = isNum(s.uzorak) ? s.uzorak : 10;
  const dodatak = (s.dodatak ?? [{ formula: "HCl", c: 1.0, zapis: "1,0" }, { formula: "NaOH", c: 1.0, zapis: "1,0" }]).map((d) => ({ ...sudionikOf(d, "dodatak"), c: d.c, zapis: d.zapis }));
  const kis = tk ? kljuc(tk.formula) : null;
  const anion = kis && ANION[kis] ? zapisIona(ANION[kis][0], 1, "⁻") : "A⁻";
  // kapi: popis broja kapi za svaki dodatak
  const pH = (uPuferu, kapi) => {
    const Vd = kapi.map((n) => n * KAP);
    const Vt = uzorak + Vd.reduce((a, x) => a + x, 0);
    const dijelovi = dodatak.map((d, i) => ({ vrsta: d.vrsta, C: (d.c * Vd[i]) / Vt, z: d.z }));
    if (uPuferu) dijelovi.push({ vrsta: "slaba_kiselina", C: ((cK + cS) * uzorak) / Vt, K: Ka }, { vrsta: "jaka_luzina", C: (cS * uzorak) / Vt, z: 1 });
    return pHSmjese(dijelovi);
  };
  return { Ka, cK, cS, uzorak, dodatak, kiselina: tk ? formulaZapis(tk.formula) : "", sol: tb ? formulaZapis(tb.formula) : "", anion, pH, imaV };
}
// reakcija u puferu kad se doda jaka kiselina / lužina
export function reakcijaPufera(pm, d) {
  if (d.priroda === "kiselina") return `${pm.anion} + H₃O⁺ → ${pm.kiselina} + H₂O`;
  return `${pm.kiselina} + OH⁻ → ${pm.anion} + H₂O`;
}

// ── lanac računa (izracunaj) ──
// koraci: [{id, oznaka, jed, f(k), vrijednost}] – f računa iz poznatih vrijednosti k (i učenikovih)
export function lanacOf(s, m = modelOf(s)) {
  const A = m.an.formula;
  const T = m.ti.formula;
  const Vt = s.utroseno?.V;
  const sve =
    trazeno(s) === "c_analit"
      ? [
          { id: "n_t", oznaka: `n(${T})`, jed: "mol", f: () => (m.ct * Vt) / 1000, formula: `n(${T}) = c(${T}) · V(${T})` },
          { id: "n_a", oznaka: `n(${A})`, jed: "mol", f: (k) => k.n_t * m.r, formula: `n(${A}) iz omjera u jednadžbi` },
          { id: "c_a", oznaka: `c(${A})`, jed: "mol/dm³", f: (k) => k.n_a / (m.Va / 1000), formula: `c(${A}) = n(${A}) : V(${A})` },
        ]
      : [
          { id: "n_a", oznaka: `n(${A})`, jed: "mol", f: () => (m.ca * m.Va) / 1000, formula: `n(${A}) = c(${A}) · V(${A})` },
          { id: "n_t", oznaka: `n(${T})`, jed: "mol", f: (k) => k.n_a / m.r, formula: `n(${T}) iz omjera u jednadžbi` },
          { id: "V_t", oznaka: `V(${T})`, jed: "mL", f: (k) => (k.n_t / m.ct) * 1000, formula: `V(${T}) = n(${T}) : c(${T})` },
        ];
  const k = {};
  for (const x of sve) k[x.id] = x.vrijednost = x.f(k);
  return s.koraci === false ? [sve.at(-1)] : sve;
}

// „20,0 mL = 0,0200 dm³“: dm³ s istim brojem značajnih znamenki kao zapis u zadatku
function mlUDm3(V, zapis) {
  const z = isText(zapis) ? zapis : formatNumber(V);
  const znam = z.replace(/[^0-9]/g, "").replace(/^0+/, "").length || 1;
  return `${z} mL = ${(V / 1000).toPrecision(Math.max(1, znam)).replace(".", ",")} dm³`;
}

// tipične krive vrijednosti koraka iz poznatih vrijednosti k (učenikovih ili točnih)
function greske(id, k, s, m) {
  const out = [];
  const add = (v, poruka) => isNum(v) && v > 0 && out.push({ v, poruka });
  const A = m.an.formula;
  const T = m.ti.formula;
  const Vt = s.utroseno?.V;
  const VaL = m.Va / 1000;
  const j = m.jed;
  const omjerTekst = j
    ? `Iz jednadžbe: ${j.kA > 1 ? `${j.kA} ` : ""}${A} reagira s ${j.kT > 1 ? `${j.kT} ` : ""}${T}`
    : `${A} daje ${m.an.z} ${ionTitracije(m.an)}, a ${T} ${m.ti.z} ${ionTitracije(m.ti)} po jedinki`;
  const naA = m.r === 1 ? `n(${A}) = n(${T})` : m.r < 1 ? `n(${A}) = n(${T}) : ${formatNumber(1 / m.r)}` : `n(${A}) = ${formatNumber(m.r)} · n(${T})`;
  const naT = m.r === 1 ? `n(${T}) = n(${A})` : m.r < 1 ? `n(${T}) = ${formatNumber(1 / m.r)} · n(${A})` : `n(${T}) = n(${A}) : ${formatNumber(m.r)}`;
  const mLuL = (V, zapis) => `Volumen je u mL: pretvori ga u dm³ (${mlUDm3(V, zapis)}), pa n = c · V.`;
  if (id === "n_t" && trazeno(s) === "c_analit") {
    add(m.ct * Vt, mLuL(Vt, s.utroseno?.zapis));
    add(m.ct / (Vt / 1000), "n = c · V: koncentraciju pomnoži volumenom, ne dijeli.");
    add(Vt / 1000 / m.ct, "n = c · V, a ne V : c.");
  }
  if (id === "n_a" && trazeno(s) !== "c_analit") {
    add(m.ca * m.Va, mLuL(m.Va, s.analit?.zapis_V));
    add(m.ca / VaL, "n = c · V: koncentraciju pomnoži volumenom, ne dijeli.");
    add(VaL / m.ca, "n = c · V, a ne V : c.");
  }
  if (id === "n_a" && trazeno(s) === "c_analit" && isNum(k.n_t)) {
    if (m.r !== 1) {
      add(k.n_t, `${omjerTekst}, pa je ${naA}. Množine nisu jednake.`);
      add(k.n_t / m.r, `Omjer je obrnut. ${omjerTekst}, pa je ${naA}.`);
    }
    add(k.n_t / VaL, "To je koncentracija. Najprije množina: koliko je mola u tikvici reagiralo.");
  }
  if (id === "n_t" && trazeno(s) !== "c_analit" && isNum(k.n_a)) {
    if (m.r !== 1) {
      add(k.n_a, `${omjerTekst}, pa je ${naT}. Množine nisu jednake.`);
      add(k.n_a * m.r, `Omjer je obrnut. ${omjerTekst}, pa je ${naT}.`);
    }
  }
  if (id === "c_a") {
    const n = isNum(k.n_a) ? k.n_a : (m.ct * Vt * m.r) / 1000;
    add(n / m.Va, `Volumen uzorka je u mL: pretvori ga u dm³ (${mlUDm3(m.Va, s.analit?.zapis_V)}), pa c = n : V.`);
    add(n * VaL, "c = n : V, a ne n · V.");
    add(VaL / n, "c = n : V, a ne V : n.");
    add(n / (Vt / 1000), `To je volumen titranta iz birete. Koncentraciju uzorka računaš s njegovim volumenom u tikvici, V(${A}) = ${formatNumber(m.Va)} mL.`);
    add(n, `To je množina ${A}. Koncentracija je c = n : V.`);
    // prečaci bez koraka
    if (m.r !== 1) {
      add((m.ct * Vt) / m.Va, `c · V = c · V vrijedi samo kad tvari reagiraju 1 : 1. ${omjerTekst}, pa je ${naA}.`);
      add((m.ct * Vt) / (m.r * m.Va), `Omjer je obrnut. ${omjerTekst}, pa je ${naA}.`);
    }
    add((m.ct * m.Va * m.r) / Vt, "Volumeni su zamijenjeni: n(titranta) = c · V iz birete, a c(uzorka) = n : V(uzorka u tikvici).");
  }
  if (id === "V_t") {
    const n = isNum(k.n_t) ? k.n_t : (m.ca * VaL) / m.r;
    add(n / m.ct, `To je volumen u dm³. Pretvori ga u mL (· 1000).`);
    add(n * m.ct * 1000, "V = n : c, a ne n · c.");
    add(m.ct / n, "V = n : c, a ne c : n.");
    if (m.r !== 1) {
      add((m.ca * m.Va) / m.ct, `c · V = c · V vrijedi samo kad tvari reagiraju 1 : 1. ${omjerTekst}, pa je ${naT}.`);
      add((m.ca * m.Va * m.r) / m.ct, `Omjer je obrnut. ${omjerTekst}, pa je ${naT}.`);
    }
  }
  return out;
}

// ── zapisi ──
export const zapisMl = (v, dec = 2) => (isNum(v) ? v.toFixed(dec).replace(".", ",") : "");
const zapisN = (v) => zapisC(v);
export const zapisVrijednosti = (id, v) => (id === "V_t" ? `${zapisMl(v, 1)} mL` : id === "c_a" ? `${zapisC(v)} mol/dm³` : `${zapisN(v)} mol`);
const zapisZadan = (zapis, v) => zapis ?? formatNumber(v);

function validateZapis(z, v, at, need) {
  if (z == null) return;
  const n = parseNumber(String(z));
  need(isText(z) && isNum(n) && isNum(v) && Math.abs(n - v) <= 1e-9 * Math.max(1, Math.abs(v)), `${at} („${z}“) mora biti isti broj kao vrijednost (${v}), samo zapisan kao u tekstu zadatka`);
}

const POLJA = ["tip", "nacin", "tekst", "analit", "titrant", "indikator", "bireta", "os_do", "utroseno", "trazi", "koraci", "operacije", "tolerancija_mL", "tolerancija_posto", "ponudeni", "krivulja", "intervali", "jednadzba", "pufer", "uzorak", "dodatak", "savjet"];
const ZA_NACIN = {
  istrazi: ["analit", "titrant", "indikator", "bireta", "os_do", "jednadzba"],
  ekvivalencija: ["analit", "titrant", "indikator", "bireta", "tolerancija_mL", "jednadzba", "savjet"],
  izracunaj: ["analit", "titrant", "indikator", "bireta", "utroseno", "trazi", "koraci", "operacije", "tolerancija_posto", "jednadzba", "savjet"],
  indikator: ["analit", "titrant", "ponudeni", "krivulja", "intervali", "jednadzba", "os_do", "bireta"],
  pufer: ["pufer", "uzorak", "dodatak"],
};

function validateSudionik(o, gdje, need, { trebaC, trebaV, smijeK }) {
  const p = sudionikOf(o, gdje);
  if (!need(!p.greska, p.greska)) return null;
  const DOP = ["formula", "c", "zapis", "V", "zapis_V", "naziv", ...(smijeK ? ["Ka", "Kb", "zapis_K"] : [])];
  for (const f of Object.keys(o)) need(DOP.includes(f), `${gdje} nema polje „${f}“ (dopuštena: ${DOP.join(", ")})`);
  if (trebaC === true) need(isNum(o.c), `${gdje}.c (mol/dm³) je obavezan`);
  if (trebaC === false) need(o.c == null, `${gdje}.c se traži, pa ga ne zadaj (kod ga računa iz utrošenog volumena)`);
  if (o.c != null) need(isNum(o.c) && o.c >= 0.001 && o.c <= 2, `${gdje}.c (mol/dm³) mora biti broj između 0,001 i 2`);
  validateZapis(o.zapis, o.c, `${gdje}.zapis`, need);
  if (trebaV) need(isNum(o.V), `${gdje}.V (mL, volumen uzorka u tikvici) je obavezan`);
  if (o.V != null) need(isNum(o.V) && o.V >= 1 && o.V <= 100, `${gdje}.V (mL) mora biti između 1 i 100`);
  validateZapis(o.zapis_V, o.V, `${gdje}.zapis_V`, need);
  if (o.naziv != null) need(isText(o.naziv), `${gdje}.naziv mora biti tekst`);
  if (isNum(o.Ka) && isNum(o.Kb)) need(false, `${gdje}: zadaj Ka ili Kb, ne oboje`);
  if (o.Ka != null) need(isNum(o.Ka) && p.vrsta === "slaba_kiselina" && o.Ka > 0 && o.Ka < 1, `${gdje}: Ka ide samo uz slabu kiselinu i mora biti između 0 i 1`);
  if (o.Kb != null) need(isNum(o.Kb) && p.vrsta === "slaba_baza" && o.Kb > 0 && o.Kb < 1, `${gdje}: Kb ide samo uz slabu bazu i mora biti između 0 i 1`);
  if (o.zapis_K != null) validateZapis(o.zapis_K, o.Ka ?? o.Kb, `${gdje}.zapis_K`, need);
  if (!p.jaka && isNum(p.K)) need(p.K >= 1e-8, `${gdje}: ${p.formula} je preslaba (${p.Kime} = ${formatSci(p.K)}): skok pH u točki ekvivalencije premalen je za titraciju s indikatorom`);
  return p;
}

// ── widget ──
export const titracija = {
  tip: "titracija",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" || s.nacin === "pufer" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi" || s.nacin === "pufer",
  opis: `Kiselo-bazna titracija: bireta s titrantom iznad Erlenmeyerove tikvice s analitom i indikatorom, krivulja pH–V, točka ekvivalencije, račun nepoznate koncentracije (n = c · V, stehiometrijski omjer) i pufer.
Kod sam zna iz formula koliko H₃O⁺ / OH⁻ daje jedinka (H₂SO₄ školski 2, Ca(OH)₂ / Sr(OH)₂ / Ba(OH)₂ 2), slaže jednadžbu neutralizacije i omjer (H₂SO₄ + 2 NaOH: 1 : 2), računa V ekvivalencije, pH u svakoj točki (točno, bilanca naboja; slaba kiselina daje pufersko područje i pH ekv > 7, slaba baza pH ekv < 7), gdje indikator mijenja boju i sve točne i krive vrijednosti.
Polja: analit: {formula, c (mol/dm³), V (mL u tikvici), zapis?, zapis_V?, Ka?/Kb?, zapis_K?, naziv?} – jaka kiselina (HCl, HBr, HI, HNO₃, HClO₄, H₂SO₄), jaka lužina (NaOH, KOH, LiOH, Ca(OH)₂, Sr(OH)₂, Ba(OH)₂), slaba kiselina (CH₃COOH, HCOOH, HF, …; školska Ka ako nije zadana) ili slaba baza (NH₃, CH₃NH₂, …);
titrant: {formula, c, zapis?} – uvijek jaka kiselina ili jaka lužina, suprotna analitu (dvije slabe ne idu); indikator?: "fenolftalein" | "metiloranz" | "lakmus" | "univerzalni"; bireta?: 10 | 25 | 50 (mL, zadano 50) – V ekvivalencije mora stati u biretu; os_do? (mL, os volumena).
tekst, nacin:
- "istrazi" (nije zadatak): gumbi +1 kap (0,05 mL) / +0,1 mL / +1 mL / +5 mL i klizač dodaju titrant; krivulja pH–V crta se uživo, tikvica mijenja boju indikatora, očitanje birete s dvije decimale, pH; nakon prolaska oznaka točke ekvivalencije (za slabu kiselinu/bazu i točka pH = pKₐ na pola puta); jednadzba?: false skriva jednadžbu;
- "ekvivalencija": učenik dodaje titrant i zaustavi se kad indikator promijeni boju (c analita se ne prikazuje; krivulja i točka ekvivalencije vide se tek nakon provjere); indikator obavezan i prikladan; tolerancija_mL? (zadano 1 % V ekv, najmanje 0,1 mL); poruke „boja se još nije promijenila“ / „prešao si završnu točku“ (gumb Ispočetka);
- "izracunaj": trazi?: "c_analit" (zadano; uz utroseno: {V (mL), zapis?} i bez analit.c) ili "V_titrant" (uz analit.c, bez utroseno); učenik upisuje lanac n(titranta) → n(analita) → c(analita) (ili n(analita) → n(titranta) → V(titranta) u mL); koraci?: false – samo konačni rezultat; operacije?: formule na strelicama (omjer se ne odaje); tolerancija_posto? (zadano 1); jednadzba?: true pokazuje jednadžbu (a s njom i omjer) prije provjere; poruke za zaboravljen ili obrnut omjer (1 : 2), mL umjesto dm³, c · V = c · V uz omjer različit od 1 : 1, zamijenjene volumene, n · V umjesto n : V;
- "indikator": učenik bira sve prikladne indikatore (jaka/jaka: fenolftalein i metiloranž; slaba kiselina + jaka lužina: fenolftalein; jaka kiselina + slaba baza: metiloranž; lakmus i univerzalni nikad); ponudeni? (zadano fenolftalein i metiloranz; smiju i lakmus, univerzalni); intervali?: false skriva intervale prijelaza; krivulja?: true pokazuje krivulju (bez oznake ekvivalencije) prije provjere; analit.c, V i titrant.c neobavezni (zadano 0,1 mol/dm³, 25 mL);
- "pufer" (nije zadatak, pokus 13): pufer: {Ka?, zapis_K?, kiselina: {formula, c, V?, zapis?, zapis_V?}, sol: {formula, c, V?, zapis?, zapis_V?}} (V u mL ako se miješaju, oba ili nijedan), uzorak? (mL u svakoj epruveti, zadano 10), dodatak?: [{formula, c, zapis?}] jaka kiselina i/ili lužina (zadano HCl i NaOH 1,0 mol/dm³); učenik kapa (0,05 mL) u vodu i pufer istodobno i uspoređuje pH, boju univerzalnog indikatora i koliko je puta porasla c(H₃O⁺).`,
  primjer: {
    tip: "titracija",
    nacin: "istrazi",
    tekst: "U tikvici je 25,0 mL klorovodične kiseline i nekoliko kapi fenolftaleina. Dodaj natrijevu lužinu iz birete i prati kako se mijenja pH. Kad se fenolftalein oboji?",
    analit: { formula: "HCl", c: 0.08, zapis: "0,0800", V: 25, zapis_V: "25,0" },
    titrant: { formula: "NaOH", c: 0.1, zapis: "0,100" },
    indikator: "fenolftalein",
  },
  primjeri: [
    {
      tip: "titracija",
      nacin: "istrazi",
      tekst: "Octena kiselina titrira se natrijevom lužinom. Pogledaj kako se pH mijenja na početku, u puferskom području i oko točke ekvivalencije. Je li pH u točki ekvivalencije 7?",
      analit: { formula: "CH₃COOH", c: 0.1, zapis: "0,100", V: 20, zapis_V: "20,0" },
      titrant: { formula: "NaOH", c: 0.1, zapis: "0,100" },
      indikator: "fenolftalein",
    },
    {
      tip: "titracija",
      nacin: "ekvivalencija",
      tekst: "U tikvici je 20,0 mL octene kiseline nepoznate koncentracije i nekoliko kapi fenolftaleina. Dodaji natrijevu lužinu, c(NaOH) = 0,100 mol/dm³, i zaustavi se čim otopina ostane (svijetlo)ljubičasta.",
      analit: { formula: "CH₃COOH", c: 0.0875, V: 20, zapis_V: "20,0" },
      titrant: { formula: "NaOH", c: 0.1, zapis: "0,100" },
      indikator: "fenolftalein",
    },
    {
      tip: "titracija",
      nacin: "izracunaj",
      tekst: "Uzorku klorovodične kiseline volumena 25,0 mL dodano je nekoliko kapi fenolftaleina pa je titriran otopinom natrijeva hidroksida, c(NaOH) = 0,100 mol/dm³. Do promjene boje utrošeno je 20,0 mL lužine. Kolika je množinska koncentracija klorovodične kiseline?",
      analit: { formula: "HCl", V: 25, zapis_V: "25,0" },
      titrant: { formula: "NaOH", c: 0.1, zapis: "0,100" },
      utroseno: { V: 20, zapis: "20,0" },
      indikator: "fenolftalein",
    },
    {
      tip: "titracija",
      nacin: "izracunaj",
      tekst: "Koliko bi mL iste lužine, c(NaOH) = 0,100 mol/dm³, trebalo za 25,0 mL sumporne kiseline koncentracije 0,0800 mol/dm³?",
      analit: { formula: "H₂SO₄", c: 0.08, zapis: "0,0800", V: 25, zapis_V: "25,0" },
      titrant: { formula: "NaOH", c: 0.1, zapis: "0,100" },
      trazi: "V_titrant",
      indikator: "fenolftalein",
    },
    {
      tip: "titracija",
      nacin: "izracunaj",
      tekst: "Za titraciju 20,0 mL sumporne kiseline utrošeno je 16,0 mL natrijeve lužine, c(NaOH) = 0,150 mol/dm³. Kolika je koncentracija sumporne kiseline?",
      analit: { formula: "H₂SO₄", V: 20, zapis_V: "20,0" },
      titrant: { formula: "NaOH", c: 0.15, zapis: "0,150" },
      utroseno: { V: 16, zapis: "16,0" },
      koraci: false,
    },
    {
      tip: "titracija",
      nacin: "indikator",
      tekst: "Octena kiselina titrira se natrijevom lužinom. Koji je indikator prikladan za tu titraciju?",
      analit: { formula: "CH₃COOH", c: 0.1, zapis: "0,100", V: 20, zapis_V: "20,0" },
      titrant: { formula: "NaOH", c: 0.1, zapis: "0,100" },
    },
    {
      tip: "titracija",
      nacin: "indikator",
      tekst: "Otopina amonijaka titrira se klorovodičnom kiselinom. Odaberi sve prikladne indikatore.",
      analit: { formula: "NH₃", c: 0.1, zapis: "0,100", V: 25, zapis_V: "25,0" },
      titrant: { formula: "HCl", c: 0.1, zapis: "0,100" },
      ponudeni: ["fenolftalein", "metiloranz", "lakmus"],
      krivulja: true,
    },
    {
      tip: "titracija",
      nacin: "pufer",
      tekst: "Acetatni pufer (20 mL octene kiseline i 20 mL natrijeva acetata, oba 1,0 mol/dm³) i destilirana voda, po 10 mL. Kapaj jednako klorovodične kiseline ili natrijeve lužine u obje epruvete i usporedi pH.",
      pufer: {
        kiselina: { formula: "CH₃COOH", c: 1.0, zapis: "1,0", V: 20, zapis_V: "20" },
        sol: { formula: "CH₃COONa", c: 1.0, zapis: "1,0", V: 20, zapis_V: "20" },
      },
      uzorak: 10,
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `titracija.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "titracija treba „tekst“");
    for (const f of Object.keys(s)) need(POLJA.includes(f), `titracija nema polje „${f}“`);
    const dop = ZA_NACIN[s.nacin];
    for (const f of Object.keys(s)) if (!["tip", "nacin", "tekst"].includes(f) && POLJA.includes(f)) need(dop.includes(f), `${s.nacin} ne koristi „${f}“ (dopuštena: ${dop.join(", ")})`);
    if (s.nacin === "istrazi" || s.nacin === "pufer") noAnswerFields(s, need);
    for (const b of ["koraci", "operacije", "krivulja", "intervali", "jednadzba"]) if (s[b] != null) need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    if (list.length) return list;

    if (s.nacin === "pufer") {
      const p = s.pufer;
      if (!need(p && typeof p === "object", "pufer mora biti {kiselina: {formula, c, V?}, sol: {formula, c, V?}, Ka?}")) return list;
      for (const f of Object.keys(p)) need(["Ka", "zapis_K", "kiselina", "sol"].includes(f), `pufer nema polje „${f}“`);
      for (const d of ["kiselina", "sol"]) {
        const x = p[d];
        if (!need(x && typeof x === "object", `pufer.${d} mora biti {formula, c, V?}`)) continue;
        for (const f of Object.keys(x)) need(["formula", "c", "zapis", "V", "zapis_V"].includes(f), `pufer.${d} nema polje „${f}“`);
        need(isText(x.formula) && !!atomiOd(x.formula), `pufer.${d}.formula se ne da pročitati`);
        need(isNum(x.c) && x.c >= 0.01 && x.c <= 2, `pufer.${d}.c (mol/dm³) mora biti između 0,01 i 2`);
        validateZapis(x.zapis, x.c, `pufer.${d}.zapis`, need);
        if (x.V != null) need(isNum(x.V) && x.V > 0 && x.V <= 100, `pufer.${d}.V (mL) mora biti pozitivan broj do 100`);
        validateZapis(x.zapis_V, x.V, `pufer.${d}.zapis_V`, need);
      }
      if (list.length) return list;
      need((p.kiselina.V == null) === (p.sol.V == null), "pufer: zadaj volumen i kiseline i soli (miješanje), ili nijedan");
      const tk = tvar(p.kiselina.formula);
      const tb = tvar(p.sol.formula);
      need(tk?.vrsta === "slaba_kiselina", "pufer.kiselina mora biti slaba kiselina iz popisa (npr. CH₃COOH, HCOOH)");
      need(tb?.vrsta === "luzhnata_sol", "pufer.sol mora biti sol te slabe kiseline (npr. CH₃COONa uz CH₃COOH)");
      if (tk && tb) need(SOL_KISELINE[kljuc(tb.formula)] === kljuc(tk.formula), `${formulaZapis(tb.formula)} nije sol kiseline ${formulaZapis(tk.formula)}: pufer čine slaba kiselina i njezina konjugirana baza (npr. CH₃COOH i CH₃COONa)`);
      if (p.Ka != null) need(isNum(p.Ka) && p.Ka > 0 && p.Ka < 1, "pufer.Ka mora biti broj između 0 i 1");
      if (p.zapis_K != null) validateZapis(p.zapis_K, p.Ka, "pufer.zapis_K", need);
      if (s.uzorak != null) need(isNum(s.uzorak) && s.uzorak >= 1 && s.uzorak <= 100, "uzorak (mL u svakoj epruveti) mora biti između 1 i 100");
      if (s.dodatak != null) {
        if (need(Array.isArray(s.dodatak) && s.dodatak.length >= 1 && s.dodatak.length <= 2, "dodatak je popis 1–2 otopine [{formula, c}] (jaka kiselina i/ili jaka lužina)")) {
          const d = s.dodatak.map((x, i) => {
            const p2 = sudionikOf(x, `dodatak[${i}]`);
            if (!need(!p2.greska, p2.greska)) return null;
            need(p2.jaka, `dodatak[${i}]: ${p2.formula} nije jaka kiselina ni jaka lužina`);
            need(isNum(x.c) && x.c >= 0.01 && x.c <= 2, `dodatak[${i}].c (mol/dm³) mora biti između 0,01 i 2`);
            validateZapis(x.zapis, x.c, `dodatak[${i}].zapis`, need);
            for (const f of Object.keys(x)) need(["formula", "c", "zapis", "naziv"].includes(f), `dodatak[${i}] nema polje „${f}“`);
            return p2;
          });
          if (d.length === 2 && d[0] && d[1]) need(d[0].priroda !== d[1].priroda, "dodatak: dvije otopine su jedna kiselina i jedna lužina");
        }
      }
      if (list.length) return list;
      const pm = puferModel(s);
      need(isNum(pm.Ka), "pufer: zadaj Ka");
      const pH0 = pm.pH(true, pm.dodatak.map(() => 0));
      need(pH0 > 2 && pH0 < 12, `pH pufera (${zapisPH(pH0)}) je izvan razumnog područja`);
      return list;
    }

    // titracija
    const ind = s.indikator != null ? indId(s.indikator) : null;
    if (s.indikator != null) need(ind, `indikator je jedan od: fenolftalein, metiloranz, lakmus, univerzalni`);
    const trebaC = s.nacin === "izracunaj" ? trazeno(s) !== "c_analit" : s.nacin === "indikator" ? null : true;
    const an = validateSudionik(s.analit, "analit", need, { trebaC, trebaV: s.nacin !== "indikator", smijeK: true });
    const ti = validateSudionik(s.titrant, "titrant", need, { trebaC: s.nacin === "indikator" ? null : true, trebaV: false, smijeK: false });
    if (s.titrant?.V != null) need(false, "titrant nema volumen: utrošeni volumen ide u utroseno (izracunaj), a u ostalim načinima ga učenik dodaje");
    if (!an || !ti) return list;
    need(ti.jaka, `titrant (${ti.formula}) mora biti jaka kiselina ili jaka lužina; slaba kiselina ili baza ide u tikvicu`);
    need(an.priroda !== ti.priroda, `analit i titrant su oboje ${an.priroda === "kiselina" ? "kiseline" : "baze"}: u titraciji kiselinu titriraš lužinom i obrnuto`);
    need(an.jaka || ti.jaka, "dvije slabe tvari se ne titriraju (nema oštrog skoka pH)");
    if (s.bireta != null) need(BIRETE.includes(s.bireta), `bireta je ${BIRETE.join(", ")} mL`);
    if (list.length) return list;

    if (s.nacin === "izracunaj") {
      const tr = trazeno(s);
      need(["c_analit", "V_titrant"].includes(tr), 'trazi je "c_analit" (zadano) ili "V_titrant"');
      if (tr === "c_analit") {
        if (need(s.utroseno && typeof s.utroseno === "object" && isNum(s.utroseno.V), "utroseno: {V (mL), zapis?} – utrošeni volumen titranta je obavezan kad se traži c analita")) {
          for (const f of Object.keys(s.utroseno)) need(["V", "zapis"].includes(f), `utroseno nema polje „${f}“`);
          need(s.utroseno.V > 0, "utroseno.V mora biti pozitivan broj");
          validateZapis(s.utroseno.zapis, s.utroseno.V, "utroseno.zapis", need);
        }
      } else need(s.utroseno == null, "uz trazi \"V_titrant\" volumen titranta se računa, pa nema utroseno");
      if (s.tolerancija_posto != null) need(isNum(s.tolerancija_posto) && s.tolerancija_posto > 0 && s.tolerancija_posto <= 5, "tolerancija_posto je broj između 0 i 5");
    }
    if (s.nacin === "ekvivalencija" || s.nacin === "istrazi") need(isNum(s.titrant.c), "titrant.c je obavezan");
    if (s.nacin === "ekvivalencija") need(ind, "ekvivalencija treba indikator (fenolftalein ili metiloranz), jer se kraj titracije vidi po promjeni boje");
    if (s.tolerancija_mL != null) need(isNum(s.tolerancija_mL) && s.tolerancija_mL >= 0.05 && s.tolerancija_mL <= 2, "tolerancija_mL je između 0,05 i 2 mL");
    if (s.ponudeni != null)
      need(Array.isArray(s.ponudeni) && s.ponudeni.length >= 2 && s.ponudeni.length <= 4 && s.ponudeni.every((x) => indId(x)) && new Set(s.ponudeni.map(indId)).size === s.ponudeni.length, "ponudeni je popis 2–4 indikatora bez ponavljanja: fenolftalein, metiloranz, lakmus, univerzalni");
    if (list.length) return list;

    const m = modelOf(s);
    need(m.Vekv >= 1, `V ekvivalencije (${formatNumber(m.Vekv)} mL) je premalen za titraciju: povećaj volumen ili koncentraciju uzorka`);
    need(m.Vekv <= m.bireta, `V ekvivalencije (${formatNumber(Number(m.Vekv.toPrecision(3)))} mL) ne stane u biretu od ${m.bireta} mL`);
    if (s.utroseno && isNum(s.utroseno.V)) need(s.utroseno.V <= m.bireta, `utrošeni volumen (${formatNumber(s.utroseno.V)} mL) ne stane u biretu od ${m.bireta} mL`);
    if (s.os_do != null) need(isNum(s.os_do) && s.os_do >= m.Vekv * 1.1 && s.os_do <= Math.max(m.bireta, m.Vekv * 3), `os_do (mL) mora obuhvatiti točku ekvivalencije (${formatNumber(Number(m.Vekv.toPrecision(3)))} mL) s malo prostora iza nje`);
    if (s.nacin === "izracunaj" && m.izUtroska) need(m.ca >= 0.001 && m.ca <= 2, `iz utrošenog volumena c analita je ${formatSci(m.ca)} mol/dm³, što nije razumno`);
    if (s.nacin === "ekvivalencija" && ind) {
      const ok = prikladni(m).includes(ind);
      need(ok, `${INDIKATORI[ind].naziv} nije prikladan za ovu titraciju (prikladni: ${prikladni(m).map((x) => INDIKATORI[x].naziv).join(", ")}), pa se kraj ne može očitati`);
      const Vk = Vkraja(m, ind);
      const tol = tolerancijaMl(s, m);
      if (ok) need(isNum(Vk) && Math.abs(Vk - m.Vekv) <= tol / 2, `${INDIKATORI[ind].naziv} ovdje mijenja boju kod ${formatNumber(Number((Vk ?? NaN).toFixed(2)))} mL, predaleko od točke ekvivalencije (${formatNumber(Number(m.Vekv.toFixed(2)))} mL); otopine su prerazrijeđene`);
    }
    if (s.nacin === "indikator") {
      const pon = (s.ponudeni ?? ["fenolftalein", "metiloranz"]).map(indId);
      need(pon.some((x) => prikladni(m).includes(x)), "među ponuđenima mora biti barem jedan prikladan indikator");
    }
    return list;
  },

  // ekvivalencija: {V} ili broj (mL); izracunaj: {koraci: [...]} ili popis upisa; indikator: popis id-ova ili {indikatori}
  check(s, odgovor) {
    const m = modelOf(s);
    if (s.nacin === "ekvivalencija") {
      const V = typeof odgovor === "number" ? odgovor : parseNumber(String(odgovor?.V ?? ""));
      if (!isNum(V) || V <= 0) return { tocno: false, poruka: "Dodaj titrant iz birete i zaustavi se kad indikator promijeni boju.", prazno: true };
      const tol = tolerancijaMl(s, m);
      const I = INDIKATORI[m.ind];
      if (Math.abs(V - m.Vekv) <= tol) return { tocno: true };
      if (V < m.Vekv)
        return {
          tocno: false,
          poruka: `${I.naziv[0].toUpperCase()}${I.naziv.slice(1)} još nije promijenio boju: ${m.an.formula} u tikvici još nije sav izreagirao. Dodaj još, a pred kraj kap po kap.`,
          rano: true,
        };
      return { tocno: false, poruka: `Prešao si završnu točku: boja se promijenila već prije. Kreni ispočetka i, kad se boja počne mijenjati, dodaj kap po kap.`, kasno: true };
    }
    if (s.nacin === "indikator") {
      const odabrani = (Array.isArray(odgovor) ? odgovor : (odgovor?.indikatori ?? [])).map(indId).filter(Boolean);
      if (!odabrani.length) return { tocno: false, poruka: "Odaberi barem jedan indikator.", prazno: true };
      const dobri = prikladni(m);
      const krivi = odabrani.filter((x) => !dobri.includes(x));
      const pHe = zapisPH(m.pHekv);
      const kisTi = m.an.priroda === "kiselina" ? m.an : m.ti;
      const j = m.jed;
      if (krivi.length) {
        const x = krivi[0];
        let poruka;
        if (x === "lakmus") poruka = "Lakmus mijenja boju postupno, u širokom području (pH 5–8), pa se završna točka ne vidi oštro. Za titraciju se ne koristi.";
        else if (x === "univerzalni") poruka = "Univerzalni indikator mijenja boju postupno kroz cijelu skalu pH, pa ne pokazuje jednu završnu točku. Za titraciju se ne koristi.";
        else if (x === "metiloranz")
          poruka = `U točki ekvivalencije u tikvici je ${j ? `otopina ${j.sol}` : "otopina soli"}: ${j?.anion ?? "anion slabe kiseline"} hidrolizom daje ione OH⁻, pa je pH ≈ ${pHe} (lužnato). Metiloranž mijenja boju već pri pH 3,1–4,4, dok ${kisTi.formula} još nije izreagirala.`;
        else
          poruka = `U točki ekvivalencije u tikvici je ${j ? `otopina ${j.sol}` : "otopina soli"}: ${j?.kation ?? "kation slabe baze"} hidrolizom daje ione H₃O⁺, pa je pH ≈ ${pHe} (kiselo). Fenolftalein mijenja boju pri pH 8,2–10, daleko od točke ekvivalencije.`;
        return { tocno: false, poruka, krivi };
      }
      const nedostaju = dobri.filter((x) => !odabrani.includes(x));
      if (nedostaju.length) {
        const prije = zapisPH(m.pH(m.Vekv - KAP));
        const poslije = zapisPH(m.pH(m.Vekv + KAP));
        return {
          tocno: false,
          poruka: `Nije sve. Kod titracije jake kiseline jakom lužinom pH oko točke ekvivalencije skoči naglo: kap prije je pH ${prije}, a kap poslije ${poslije}. U tom skoku boju mijenja i ${INDIKATORI[nedostaju[0]].naziv}.`,
          nedostaju,
        };
      }
      return { tocno: true };
    }
    if (s.nacin !== "izracunaj") return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    const unosi = Array.isArray(odgovor) ? odgovor : [].concat(odgovor?.koraci ?? []);
    const pct = (s.tolerancija_posto ?? 1) / 100;
    const koraci = lanacOf(s, m);
    const k = {};
    // bez koraka: prethodne vrijednosti su točne
    if (s.koraci === false) {
      const sve = lanacOf({ ...s, koraci: true }, m);
      for (const x of sve.slice(0, -1)) k[x.id] = x.vrijednost;
    }
    for (let i = 0; i < koraci.length; i++) {
      const kor = koraci[i];
      const izUcenika = kor.f(k);
      const prihvaceno = [kor.vrijednost, izUcenika].filter(isNum);
      const tol = (v) => Math.abs(v) * pct;
      const krivo = greske(kor.id, s.koraci === false ? {} : k, s, m)
        .filter((g) => !prihvaceno.some((v) => near(g.v, v, tol(v))))
        .map((g) => ({ vrijednost: g.v, poruka: g.poruka, tolerancija: tol(g.v) }));
      let ulaz = String(unosi[i] ?? "").trim();
      if (ulaz.includes("=")) ulaz = ulaz.slice(ulaz.lastIndexOf("=") + 1).trim();
      ulaz = ulaz.replace(/\s*(mol\s*\/\s*dm³|mol\s*\/\s*dm3|mol\s*dm⁻³|mol\/L|mol|mL|ml)\s*$/i, "").trim();
      const broj = parseNumber(ulaz);
      let r;
      if (isNum(broj) && prihvaceno.some((v) => near(broj, v, tol(v)))) r = { tocno: true };
      else r = checkNumber({ input: broj ?? ulaz, answer: kor.vrijednost, tol: tol(kor.vrijednost), unit: "", krivo, savjet: s.savjet || `Pogledaj: ${kor.formula}.` });
      if (!r.tocno) return koraci.length > 1 ? { ...r, praznina: i, poruka: `${kor.oznaka}: ${r.poruka}` } : { ...r, praznina: 0 };
      k[kor.id] = broj;
    }
    return { tocno: true };
  },

  brojcaniOdgovor(s) {
    const m = modelOf(s);
    if (m.greska) return null;
    if (s.nacin === "ekvivalencija") return Math.round(m.Vekv * 100) / 100;
    if (s.nacin !== "izracunaj") return null;
    const v = lanacOf(s, m).at(-1).vrijednost;
    return Number(v.toPrecision(3));
  },

  tocanOdgovor(s) {
    if (s.nacin === "istrazi" || s.nacin === "pufer") return "";
    const m = modelOf(s);
    if (m.greska) return "";
    const T = m.ti.formula;
    if (s.nacin === "ekvivalencija") return `V(${T}) ≈ ${zapisMl(m.Vekv)} mL (točka ekvivalencije, pH ${zapisPH(m.pHekv)})`;
    if (s.nacin === "indikator") return `${prikladni(m).map((x) => INDIKATORI[x].naziv).join(" i ")} (pH u točki ekvivalencije ≈ ${zapisPH(m.pHekv)})`;
    const sve = lanacOf({ ...s, koraci: true }, m);
    return sve.map((x) => `${x.oznaka} = ${zapisVrijednosti(x.id, x.vrijednost)}`).join(" → ");
  },
};

// zadani podaci za prikaz: „25,0 mL“, „0,100 mol/dm³“
export const zapisV = (o) => `${zapisZadan(o?.zapis_V, o?.V)} mL`;
export const zapisCZadan = (o) => `${zapisZadan(o?.zapis, o?.c)} mol/dm³`;
