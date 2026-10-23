// elektrokemija: galvanski članak (dvije čaše, elektrolitni most, voltmetar), istiskivanje metala iz otopine soli
// (Voltin niz) i elektroliza (talina ili vodena otopina, produkti na elektrodama, Faradayev zakon).
// Sva kemija računa se iz speca: anoda i katoda iz E° s lista (POTENCIJALI), polureakcije i ukupna jednadžba
// izjednačuju se istom logikom kao widget jednadzba (izjednaci), ΔE° = E°(katoda) − E°(anoda), produkti elektrolize
// po školskim pravilima, a Faradayev lanac Q = I·t → n(e⁻) = Q : F → n(tvari) = n(e⁻) : z → m ili V iz F, Ar, V_m i R
// s lista. Autor lekcije ne upisuje ni potencijale ni odgovore.
import { isNum, parseNumber, formatNumber, formatSci, near } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { POTENCIJALI, KONSTANTE, element, atomiOd, nabojOd, molarnaMasa } from "./_tablice.js";
import { tvari, izjednaci, zapisJednadzbe, provjeriKoef } from "./jednadzba.js";
import { plinOf, uvjetiZapis } from "./mol_racun.js";

const F = KONSTANTE.F.vrijednost;
const NA = KONSTANTE.NA.vrijednost;
const E_NABOJ = KONSTANTE.e.vrijednost;
const VM = KONSTANTE.Vm.vrijednost;
const R = KONSTANTE.R.vrijednost;
const T0 = KONSTANTE.T0.vrijednost;

export const VRSTE = ["clanak", "elektroliza"];
export const NACINI = { clanak: ["istrazi", "polovi", "napon", "istiskivanje"], elektroliza: ["istrazi", "produkti", "faraday"] };
export const PITANJA_POLOVA = ["uloge", "polovi", "elektroni", "most"];
const POLJA = [
  "tip", "vrsta", "nacin", "tekst", "elektrode", "otopine", "most", "izbor", "pitaj", "pokazi_E", "metal", "otopina", "jednadzba",
  "elektrolit", "stanje", "anoda", "katoda", "serijski", "struja", "vrijeme", "izluceno", "plin", "trazi", "raspon_I", "raspon_t",
  "tolerancija_posto", "krivo",
];

// ── zapis brojeva ──
// E° kao na listu: tri decimale, pravi minus („−0,762“)
export const zapisE = (E) => `${E < 0 ? "−" : ""}${Math.abs(E).toFixed(3).replace(".", ",")}`;
export const zapisEV = (E) => `${zapisE(E)} V`;
const uZagradi = (E) => (E < 0 ? `(${zapisEV(E)})` : zapisEV(E));
const zaokruzi3 = (x) => Math.round(x * 1000) / 1000;
const velikoSlovo = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;

// ── parovi s lista ──
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-" };
const ascii = (x) =>
  [...String(x ?? "")]
    .map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : (SUP[c] ?? c)))
    .join("")
    .replace(/[−–]/g, "-")
    .replace(/\s/g, "");
export const kljucPara = (p) => `${p.oks}/${p.red}`;

// metali koji u vodi odmah reagiraju s vodom: ne mogu biti elektroda u vodenoj otopini ni „uronjeni metal“
const S_VODOM = new Set(["Na", "K", "Ca", "Ba", "Cs"]);
// parovi s kisikom i vodom: na listu su, ali nisu polučlanci školskog članka
const SAMO_ELEKTROLIZA = new Set(["O₂/H₂O", "O₂/OH⁻", "H₂O/H₂"]);
const NEMETALNI = { "H⁺/H₂": "vodikova elektroda", "Cl₂/Cl⁻": "klorova elektroda", "Br₂/Br⁻": "bromova elektroda", "I₂/I⁻": "jodova elektroda" };
// ion koji metal daje kad se oksidira (za metale s više parova na listu)
const ION_METALA = { Cu: "Cu²⁺", Fe: "Fe²⁺", Cr: "Cr³⁺" };

function infoPara(p) {
  const kljuc = kljucPara(p);
  const el = element(p.red);
  const metal = !!el && el.vrsta === "metal" && nabojOd(p.red) === 0;
  return {
    ...p,
    kljuc,
    metal,
    simbol: metal ? p.red : null,
    naziv: metal ? el.naziv : (NEMETALNI[kljuc] ?? kljuc),
    elektroda: metal ? p.red : "Pt",
    ion: metal ? p.oks : nabojOd(p.oks) !== 0 ? p.oks : p.red, // ion u otopini polučlanka
    nemetal: metal ? null : nabojOd(p.oks) !== 0 ? p.red : p.oks, // H₂, Cl₂, Br₂, I₂
    zaClanak: !SAMO_ELEKTROLIZA.has(kljuc) && !(metal && S_VODOM.has(p.red)),
  };
}
export const PAROVI = POTENCIJALI.map(infoPara);
const PO_KLJUCU = new Map(PAROVI.map((p) => [ascii(p.kljuc), p]));
export const par = (k) => (isText(k) ? (PO_KLJUCU.get(ascii(k)) ?? null) : null);
// par metala: zadani ion (Cu → Cu²⁺/Cu)
export function parMetala(simbol) {
  const svi = PAROVI.filter((p) => p.metal && p.red === simbol);
  if (!svi.length) return null;
  return svi.find((p) => p.oks === ION_METALA[simbol]) ?? svi[0];
}
const PAR_KATIONA = new Map(PAROVI.filter((p) => p.metal).map((p) => [p.oks, p]));
PAR_KATIONA.set("H⁺", PAROVI.find((p) => p.kljuc === "H⁺/H₂"));
const E_VODE = PAROVI.find((p) => p.kljuc === "H₂O/H₂").E;

// zadani popis za istraživanje članka (od najvećeg E°)
export const IZBOR_CLANKA = ["Ag⁺/Ag", "Cu²⁺/Cu", "H⁺/H₂", "Pb²⁺/Pb", "Sn²⁺/Sn", "Ni²⁺/Ni", "Fe²⁺/Fe", "Zn²⁺/Zn", "Al³⁺/Al", "Mg²⁺/Mg"];

// ── ioni elektrolita ──
const ANIONI = ["Cl⁻", "Br⁻", "I⁻", "F⁻", "OH⁻", "O²⁻", "SO₄²⁻", "NO₃⁻", "CO₃²⁻", "PO₄³⁻"];
const HALOGENIDI = { "Cl⁻": "Cl₂", "Br⁻": "Br₂", "I⁻": "I₂", "F⁻": "F₂" };
const NAZIV_ANIONA = { "Cl⁻": "kloridni", "Br⁻": "bromidni", "I⁻": "jodidni", "F⁻": "fluoridni", "OH⁻": "hidroksidni", "O²⁻": "oksidni", "SO₄²⁻": "sulfatni", "NO₃⁻": "nitratni", "CO₃²⁻": "karbonatni", "PO₄³⁻": "fosfatni" };

// Formula soli, kiseline ili lužine → {kation, anion, a, b} (a kationa i b aniona u formulskoj jedinki) ili null.
// Hidrat („CuSO₄·5H₂O“) se čita bez vode. Fe²⁺/Fe³⁺ i Cu⁺/Cu²⁺ razlikuje omjer iona.
export function ioniOd(formula) {
  if (!isText(formula)) return null;
  const f = formula.split(/[·.*]/)[0];
  const A = atomiOd(f);
  if (!A || nabojOd(f) !== 0) return null;
  const isti = (x, y) => Object.keys(x).length === Object.keys(y).length && Object.entries(x).every(([e, n]) => y[e] === n);
  for (const kation of PAR_KATIONA.keys()) {
    const ak = atomiOd(kation);
    const q = nabojOd(kation);
    for (const anion of ANIONI) {
      const p = -nabojOd(anion);
      const g = gcd(p, q);
      const a = p / g;
      const b = q / g;
      const zbroj = {};
      for (const [e, n] of Object.entries(ak)) zbroj[e] = (zbroj[e] ?? 0) + n * a;
      for (const [e, n] of Object.entries(atomiOd(anion))) zbroj[e] = (zbroj[e] ?? 0) + n * b;
      if (isti(zbroj, A)) return { kation, anion, a, b, par: PAR_KATIONA.get(kation) };
    }
  }
  return null;
}

// ── stanja i polureakcije ──
function stanjeVrste(f, talina) {
  if (f === "e⁻") return null;
  if (nabojOd(f) !== 0) return talina ? "l" : "aq";
  if (f === "H₂O") return talina ? "g" : "l";
  if (["H₂", "O₂", "Cl₂", "F₂"].includes(f)) return "g";
  if (f === "Br₂") return talina ? "g" : "l";
  if (f === "I₂") return talina ? "g" : "s";
  if (talina) return "l";
  return f === "Hg" ? "l" : "s";
}

// Izjednačena jednadžba iz popisa tvari (ista logika kao widget jednadzba): {reaktanti, produkti, koef, stanja,
// clanovi, zapis, e (broj elektrona)} ili null.
function jednadzbaOd(reaktanti, produkti, stanje = () => null) {
  const t = tvari({ reaktanti, produkti });
  if (t.some((c) => c.greska)) return null;
  const r = izjednaci(t);
  if (!r.koef) return null;
  const stanja = t.map((c) => stanje(c.formula));
  const clanovi = t.map((c, i) => ({ f: c.formula, k: r.koef[i], st: stanja[i], strana: c.strana }));
  const e = clanovi.find((c) => c.f === "e⁻")?.k ?? 0;
  return { reaktanti, produkti, koef: r.koef, stanja, clanovi, e, zapis: zapisJednadzbe({ reaktanti, produkti }, r.koef, stanja) };
}
const redukcija = (p, talina = false) => jednadzbaOd([p.oks, "e⁻"], [p.red], (f) => stanjeVrste(f, talina));
const oksidacija = (p, talina = false) => jednadzbaOd([p.red], [p.oks, "e⁻"], (f) => stanjeVrste(f, talina));
const koefOd = (j, f) => j.clanovi.find((c) => c.f === f)?.k ?? 0;

// Zbroj dviju polureakcija uz jednak broj elektrona; H⁺ i OH⁻ s iste strane daju vodu, iste tvari s obje strane se
// pokrate. null ako se sve pokrati (pročišćavanje bakra: bakar samo prelazi s anode na katodu).
function zbrojPolureakcija(j1, j2, talina) {
  const L = lcm(j1.e, j2.e);
  const net = new Map();
  const dodaj = (f, k) => net.set(f, (net.get(f) ?? 0) + k);
  for (const [j, m] of [[j1, L / j1.e], [j2, L / j2.e]]) for (const c of j.clanovi) if (c.f !== "e⁻") dodaj(c.f, (c.strana === "L" ? 1 : -1) * c.k * m);
  const h = -(net.get("H⁺") ?? 0);
  const oh = -(net.get("OH⁻") ?? 0);
  if (h > 0 && oh > 0) {
    const w = Math.min(h, oh);
    dodaj("H⁺", w);
    dodaj("OH⁻", w);
    dodaj("H₂O", -w);
  }
  const clanovi = [...net].filter(([, k]) => k !== 0);
  if (!clanovi.length) return null;
  const g = clanovi.reduce((a, [, k]) => gcd(a, k), 0);
  const reaktanti = clanovi.filter(([, k]) => k > 0).map(([f]) => f);
  const produkti = clanovi.filter(([, k]) => k < 0).map(([f]) => f);
  const koef = [...clanovi.filter(([, k]) => k > 0), ...clanovi.filter(([, k]) => k < 0)].map(([, k]) => Math.abs(k) / g);
  const stanja = [...reaktanti, ...produkti].map((f) => stanjeVrste(f, talina));
  return {
    reaktanti,
    produkti,
    koef,
    stanja,
    clanovi: [...reaktanti, ...produkti].map((f, i) => ({ f, k: koef[i], st: stanja[i], strana: i < reaktanti.length ? "L" : "D" })),
    zapis: zapisJednadzbe({ reaktanti, produkti }, koef, stanja),
  };
}

// ── galvanski članak ──
const stranaSheme = (p, anoda) => {
  if (p.metal) return anoda ? `${p.red}(${stanjeVrste(p.red)}) | ${p.oks}(aq)` : `${p.oks}(aq) | ${p.red}(${stanjeVrste(p.red)})`;
  const nm = `${p.nemetal}(${stanjeVrste(p.nemetal)})`;
  return anoda ? `Pt(s) | ${nm} | ${p.ion}(aq)` : `${p.ion}(aq) | ${nm} | Pt(s)`;
};

// Sve o članku iz dva para: indeks anode, polureakcije, ukupna jednadžba, ΔE°, shema, koeficijenti za poruke.
export function clanak(elektrode) {
  const P = (elektrode ?? []).map(par);
  if (P.length !== 2 || P.some((p) => !p)) return null;
  const ia = P[0].E < P[1].E ? 0 : 1;
  const an = P[ia];
  const ka = P[1 - ia];
  const oks = oksidacija(an);
  const red = redukcija(ka);
  const ukupno = jednadzbaOd([an.red, ka.oks], [an.oks, ka.red], (f) => stanjeVrste(f));
  const L = lcm(oks.e, red.e);
  return {
    parovi: P,
    anoda: ia,
    katoda: 1 - ia,
    an,
    ka,
    oks,
    red,
    ukupno,
    dE: zaokruzi3(ka.E - an.E),
    shema: `${stranaSheme(an, true)} ‖ ${stranaSheme(ka, false)}`,
    mnoziA: L / oks.e,
    mnoziK: L / red.e,
  };
}

// ── istiskivanje: metal uronjen u otopinu soli ili kiseline ──
export function istiskivanje(metal, otopina) {
  const pm = parMetala(metal);
  const ioni = ioniOd(otopina);
  if (!pm || !ioni) return null;
  const pk = ioni.par;
  const reagira = pk.E > pm.E;
  const j = jednadzbaOd([metal, pk.oks], [pm.oks, pk.red], (f) => stanjeVrste(f));
  return { pm, pk, ioni, reagira, jednadzba: j, kiselina: pk.kljuc === "H⁺/H₂" };
}

// ── elektroliza ──
const INERTNE = ["grafit", "Pt", "Au"];
export const NAZIV_ELEKTRODE = { grafit: "grafit", Pt: "platina", Au: "zlato" };

// Produkti na elektrodama po školskim pravilima. c = {elektrolit, stanje, anoda?, katoda?}
export function elektroliza(c) {
  const ioni = ioniOd(c?.elektrolit);
  if (!ioni) return { greska: `elektrolit „${c?.elektrolit}“ nije sol, kiselina ni lužina koju widget zna (kation s lista potencijala i anion ${ANIONI.join(", ")})` };
  const talina = c.stanje === "l";
  const anodaMat = c.anoda ?? "grafit";
  const { kation, anion } = ioni;
  const kp = ioni.par;
  if (c.elektrolit.split(/[·.*]/)[0] === "H₂O") return { greska: "čista voda gotovo ne vodi struju: elektrolizira se otopina elektrolita (npr. H₂SO₄ ili Na₂SO₄)" };
  // katoda
  let katoda;
  if (talina) {
    if (kation === "H⁺") return { greska: "kiselina se ne elektrolizira kao talina: zadaj vodenu otopinu (stanje „aq“)" };
    katoda = { j: redukcija(kp, true), produkt: kp.red, razlog: `U talini nema vode: ${kation} ioni primaju elektrone i izlučuje se ${kp.naziv}.` };
  } else if (kation === "H⁺") {
    katoda = { j: redukcija(kp), produkt: "H₂", razlog: "U kiselini ioni H⁺ primaju elektrone i nastaje vodik." };
  } else if (kp.E > E_VODE) {
    katoda = { j: redukcija(kp), produkt: kp.red, razlog: `E°(${kp.kljuc}) = ${zapisEV(kp.E)} veći je od E°(H₂O/H₂) = ${zapisEV(E_VODE)}: ioni ${kation} primaju elektrone lakše od vode, pa se izlučuje ${kp.naziv}.` };
  } else {
    katoda = {
      j: jednadzbaOd(["H₂O", "e⁻"], ["H₂", "OH⁻"], (f) => stanjeVrste(f)),
      produkt: "H₂",
      razlog: `E°(${kp.kljuc}) = ${zapisEV(kp.E)} manji je od E°(H₂O/H₂) = ${zapisEV(E_VODE)}: ioni ${kation} teže primaju elektrone od vode, pa elektrone prima voda i nastaje vodik, a ne ${kp.naziv}.`,
      voda: true,
    };
  }
  // anoda
  let anoda;
  if (!INERTNE.includes(anodaMat)) {
    const pm = parMetala(anodaMat);
    if (!pm) return { greska: `anoda „${anodaMat}“ nije grafit, Pt, Au ni metal s lista potencijala` };
    if (talina) return { greska: "aktivna (metalna) anoda ide samo uz vodenu otopinu" };
    if (S_VODOM.has(anodaMat)) return { greska: `${element(anodaMat).naziv} reagira s vodom i ne može biti elektroda u vodenoj otopini` };
    anoda = { j: oksidacija(pm), produkt: pm.oks, otapa: anodaMat, razlog: `Anoda je od metala (${pm.naziv}): metal anode se oksidira i otapa (${anodaMat} → ${pm.oks}).` };
  } else if (HALOGENIDI[anion] && (talina || anion !== "F⁻")) {
    const X = HALOGENIDI[anion];
    anoda = { j: jednadzbaOd([anion], [X, "e⁻"], (f) => stanjeVrste(f, talina)), produkt: X, razlog: `${velikoSlovo(NAZIV_ANIONA[anion])} ioni ${anion} oksidiraju se na anodi i nastaje ${X}.` };
  } else if (anion === "O²⁻") {
    if (!talina) return { greska: "oksid se elektrolizira kao talina (stanje „l“)" };
    anoda = { j: jednadzbaOd(["O²⁻"], ["O₂", "e⁻"], (f) => stanjeVrste(f, true)), produkt: "O₂", razlog: "Oksidni ioni O²⁻ oksidiraju se na anodi i nastaje kisik." };
  } else if (anion === "OH⁻") {
    anoda = { j: jednadzbaOd(["OH⁻"], ["O₂", "H₂O", "e⁻"], (f) => stanjeVrste(f, talina)), produkt: "O₂", razlog: "Hidroksidni ioni OH⁻ oksidiraju se na anodi i nastaje kisik." };
  } else {
    if (talina) return { greska: `talina soli s anionom ${anion} nije školski primjer elektrolize: zadaj vodenu otopinu, ili talinu halogenida, oksida ili hidroksida` };
    anoda = {
      j: jednadzbaOd(["H₂O"], ["O₂", "H⁺", "e⁻"], (f) => stanjeVrste(f)),
      produkt: "O₂",
      razlog: `${velikoSlovo(NAZIV_ANIONA[anion])} ioni ${anion} se na anodi ne oksidiraju: oksidira se voda i nastaje kisik (školsko pravilo: samo Cl⁻, Br⁻ i I⁻ daju halogen).`,
      voda: true,
    };
  }
  if (!katoda.j || !anoda.j) return { greska: "polureakcije se ne mogu izjednačiti" };
  // ukupno: talina s formulom soli, otopina ionski
  let ukupno;
  if (talina) {
    const prod = [katoda.produkt, ...anoda.j.produkti.filter((f) => f !== "e⁻" && nabojOd(f) === 0)];
    ukupno = jednadzbaOd([c.elektrolit.split(/[·.*]/)[0]], prod, (f) => stanjeVrste(f, true));
  } else ukupno = zbrojPolureakcija(katoda.j, anoda.j, false);
  return { ioni, talina, katoda, anoda, ukupno, anodaMat, katodaMat: c.katoda ?? "grafit" };
}

// Tvari kojima se može računati množina (metal, plin, otopljeni metal anode) s brojem elektrona z po jedinki.
export function tvariElektrolize(c) {
  const e = elektroliza(c);
  if (e.greska) return [];
  const out = [];
  for (const [strana, x] of [["katoda", e.katoda], ["anoda", e.anoda]]) {
    const f = x.otapa ?? x.produkt;
    if (nabojOd(f) !== 0) continue;
    const k = koefOd(x.j, f);
    out.push({ f, strana, z: x.j.e / k, plin: stanjeVrste(f, e.talina) === "g", M: molarnaMasa(f), otapa: !!x.otapa });
  }
  return out;
}

// ── Faradayev lanac ──
export const VELICINE = ["Q", "ne", "n", "m", "V", "t", "I"];
export const JEDINICE = {
  Q: { C: 1 },
  ne: { mol: 1, mmol: 0.001 },
  n: { mol: 1, mmol: 0.001 },
  m: { g: 1, mg: 0.001, kg: 1000 },
  V: { L: 1, "dm³": 1, mL: 0.001, "cm³": 0.001, "m³": 1000 },
  t: { s: 1, min: 60, h: 3600 },
  I: { A: 1, mA: 0.001 },
};
const OSNOVNA = { Q: "C", ne: "mol", n: "mol", m: "g", V: "L", t: "s", I: "A" };
const DRUGE = { ne: ["mol", "mmol"], n: ["mol", "mmol"], m: ["g", "mg", "kg"], V: ["L", "mL", "m³"], t: ["s", "min", "h"] };
export const IME = { Q: "naboj", ne: "množina elektrona", n: "množina", m: "masa", V: "volumen", t: "vrijeme", I: "jakost struje" };
const normJ = (q, u) =>
  u == null
    ? OSNOVNA[q]
    : String(u)
        .trim()
        .replace(/(dm|cm|m)\^?3/g, "$1³");
export const oznaka = (q, f) => (q === "ne" ? "n(e⁻)" : f ? `${q}(${f})` : q);

export const traziOf = (s) => [].concat(s?.trazi ?? []).map((t) => ({ velicina: t?.velicina, tvar: t?.tvar ?? null, jedinica: normJ(t?.velicina, t?.jedinica) }));
export const celije = (s) => [{ elektrolit: s.elektrolit, stanje: s.stanje, anoda: s.anoda, katoda: s.katoda }, ...(s.serijski ? [{ ...s.serijski }] : [])];
export function sveTvari(s) {
  const out = [];
  celije(s).forEach((c, i) => tvariElektrolize(c).forEach((x) => out.find((y) => y.f === x.f) || out.push({ ...x, celija: i })));
  return out;
}
// vrijeme u sekundama iz {h?, min?, s?}
export const sekunde = (v) => (v ? (v.h ?? 0) * 3600 + (v.min ?? 0) * 60 + (v.s ?? 0) : NaN);
export function zapisVremena(v) {
  if (!v) return "";
  if (isText(v.zapis)) return v.zapis;
  return [["h", v.h], ["min", v.min], ["s", v.s]].filter(([, x]) => isNum(x) && x > 0).map(([u, x]) => `${formatNumber(x)} ${u}`).join(" ");
}
// izlučena tvar: {tvar, m | V, jedinica?, zapis?} → {f, q: "m"|"V", vrijednost (osnovna jedinica), zadano, jedinica}
export function izlucenoOf(s) {
  const z = s?.izluceno;
  if (!z) return null;
  const q = isNum(z.m) ? "m" : isNum(z.V) ? "V" : null;
  if (!q) return null;
  const jedinica = normJ(q, z.jedinica);
  return { f: z.tvar, q, zadano: z[q], jedinica, vrijednost: z[q] * (JEDINICE[q][jedinica] ?? NaN), zapis: z.zapis };
}

// Osnovne poznate veličine (osnovne jedinice): I, t, i izlučena tvar.
function pocetno(s, uzivo) {
  const k = {};
  const I = uzivo?.I ?? s.struja?.I;
  const t = uzivo?.t ?? sekunde(s.vrijeme);
  if (isNum(I)) k.I = I;
  if (isNum(t)) k.t = t;
  const iz = izlucenoOf(s);
  if (iz) k[`${iz.q}:${iz.f}`] = iz.vrijednost;
  return k;
}

// Vrijednost veličine iz poznatih (k), uz neobavezan „scenarij greške“ o. Ključevi: I, t, Q, ne, n:X, m:X, V:X.
function izracun(s, kljuc, k, o = {}) {
  if (kljuc in k && !(o.preskoci ?? []).includes(kljuc)) return k[kljuc];
  const tv = (f) => sveTvari(s).find((x) => x.f === f);
  const zOf = (f) => {
    const z = tv(f)?.z ?? NaN;
    if (o.zBez) return 1;
    if (o.zPuta) return 1 / z;
    if (o.zAtom) return z / (atomiOd(f) ? Object.values(atomiOd(f))[0] : 1);
    return z;
  };
  const imaIt = isNum(k.I) && isNum(k.t);
  const iz = izlucenoOf(s);
  const g = (x) => izracun(s, x, k, o);
  const [q, f] = kljuc.split(":");
  if (q === "Q") {
    if (imaIt) {
      const t = o.tKriva ?? k.t;
      return o.QpodI ? k.I / t : o.QpodT ? t / k.I : k.I * t;
    }
    return g("ne") * F;
  }
  if (q === "ne") {
    if ("Q" in k || imaIt) {
      const Q = g("Q");
      return o.QputaF ? Q * F : o.Fna ? Q / NA : o.Fe ? Q / E_NABOJ : Q / F;
    }
    if (iz) return g(`n:${iz.f}`) * zOf(iz.f);
    return NaN;
  }
  if (q === "n") {
    if (`m:${f}` in k) return nIzMase(k[`m:${f}`], f, o);
    if (`V:${f}` in k) return nIzVolumena(s, k[`V:${f}`], o);
    return g("ne") / zOf(f);
  }
  if (q === "m") {
    const n = g(`n:${f}`);
    const M = o.Matom ? Mpoatomu(f) : molarnaMasa(f);
    return o.Mputa ? n / M : n * M;
  }
  if (q === "V") return vIzN(s, g(`n:${f}`), o);
  if (q === "t") return g("Q") / k.I;
  if (q === "I") return g("Q") / k.t;
  return NaN;
}
const Mpoatomu = (f) => {
  const a = atomiOd(f);
  const [e, n] = Object.entries(a ?? {})[0] ?? [];
  return Object.keys(a ?? {}).length === 1 && n > 1 ? element(e).ar : molarnaMasa(f);
};
function nIzMase(m, f, o) {
  const M = o.Matom ? Mpoatomu(f) : molarnaMasa(f);
  return o.Mputa ? m * M : m / M;
}
function plinUvjeti(s) {
  return plinOf(s) ?? { normirani: true };
}
function vIzN(s, n, o) {
  const g = plinUvjeti(s);
  if (g.normirani) return o.VmPuta ? n / VM : n * VM;
  if (o.Vm) return n * VM;
  const T = o.TC ? g.t : g.T;
  const p = o.pZad ? g.pZadano : g.p;
  const V = (n * R * T) / p; // m³
  return o.m3 ? V : V * 1000;
}
function nIzVolumena(s, V, o) {
  const g = plinUvjeti(s);
  if (g.normirani) return o.VmPuta ? V * VM : V / VM;
  if (o.Vm) return V / VM;
  const T = o.TC ? g.t : g.T;
  const p = o.pZad ? g.pZadano : g.p;
  return (p * (o.m3 ? V : V / 1000)) / (R * T);
}
const kljucKoraka = (t) => (["n", "m", "V"].includes(t.velicina) ? `${t.velicina}:${t.tvar}` : t.velicina);

// Lanac: točna vrijednost svakog koraka (osnovna i u traženoj jedinici).
export function lanac(s, uzivo) {
  const k = pocetno(s, uzivo);
  return traziOf(s).map((t) => {
    const osnovna = izracun(s, kljucKoraka(t), k);
    k[kljucKoraka(t)] = osnovna;
    return { ...t, kljuc: kljucKoraka(t), osnovna, vrijednost: osnovna / (JEDINICE[t.velicina]?.[t.jedinica] ?? NaN) };
  });
}

// Uživo za istraživanje: Q, n(e⁻) i množina / masa / volumen svake tvari na elektrodama.
export function uzivoElektroliza(s, I, tMin) {
  const k = { I, t: tMin * 60 };
  const ss = { ...s, izluceno: undefined };
  const Q = I * tMin * 60;
  const ne = Q / F;
  const tv = sveTvari(ss).map((x) => {
    const n = ne / x.z;
    return { ...x, n, m: x.M ? n * x.M : null, V: x.plin ? vIzN(ss, n, {}) : null };
  });
  return { k, Q, ne, tvari: tv };
}

// Scenariji tipičnih grešaka u Faradayevu lancu: [opcije, poruka(s, korak)].
function scenariji(s) {
  const v = s.vrijeme ?? {};
  const t = sekunde(v);
  const out = [];
  const tZapis = zapisVremena(v);
  if ((v.min || v.h) && isNum(t)) {
    const kriva = v.h ? t / 3600 : t / 60;
    out.push([{ tKriva: kriva }, `Vrijeme uvrsti u sekundama: ${tZapis} = ${formatNumber(t)} s (jakost struje je u amperima, 1 A = 1 C/s).`]);
    if (v.h) out.push([{ tKriva: t / 60 }, `Vrijeme uvrsti u sekundama, ne u minutama: ${tZapis} = ${formatNumber(t)} s.`]);
    if (v.min && v.s) out.push([{ tKriva: (v.h ?? 0) * 60 + v.min + v.s }, `Minute i sekunde ne zbrajaju se izravno: ${tZapis} = ${(v.h ? `${v.h} · 3600 s + ` : "") + `${v.min} · 60 s + ${v.s} s`} = ${formatNumber(t)} s.`]);
  }
  out.push([{ QpodI: true }, "Naboj je umnožak jakosti struje i vremena: Q = I · t."]);
  out.push([{ QpodT: true }, "Naboj je umnožak jakosti struje i vremena: Q = I · t."]);
  out.push([{ QputaF: true }, "Naboj se dijeli Faradayevom konstantom: n(e⁻) = Q : F."]);
  out.push([{ Fna: true }, `Za F je uzeta Avogadrova konstanta. Faradayeva konstanta (naboj jednog mola elektrona) je F = ${KONSTANTE.F.zapis}.`]);
  out.push([{ Fe: true }, "Q : e daje broj elektrona, a ne množinu. Množina elektrona je n(e⁻) = Q : F."]);
  out.push([{ zBez: true }, (x) => `Zaboravljen je broj elektrona z: za jedan ${x.f} ${x.z === 1 ? "treba 1 elektron" : `trebaju ${x.z} elektrona`} (${x.zapis}), pa je n(e⁻) = ${x.z} · n(${x.f}).`]);
  out.push([{ zPuta: true }, (x) => `Obrnut je omjer: elektrona ima ${x.z} puta više nego ${x.f} (${x.zapis}), pa je n(${x.f}) = n(e⁻) : ${x.z}.`]);
  out.push([{ zAtom: true }, (x) => `${x.f} je dvoatomna molekula: za jednu molekulu ${x.f} trebaju ${x.z} elektrona (${x.zapis}).`]);
  out.push([{ Mputa: true }, "Masa je m = n · M, a množina n = m : M."]);
  out.push([{ Matom: true }, (x) => `Za M je uzeta masa jednog atoma. ${x.f} je molekula: M(${x.f}) = ${formatNumber(molarnaMasa(x.f))} g/mol.`]);
  const g = plinUvjeti(s);
  if (g.normirani) out.push([{ VmPuta: true }, "Pri normiranim uvjetima V = n · V_m, a n = V : V_m (V_m = 22,4 L/mol)."]);
  else {
    out.push([{ Vm: true }, "22,4 L/mol vrijedi samo pri 0 °C i 101 kPa (normirani uvjeti). Ovdje uvjeti nisu normirani: računaj iz pV = nRT."]);
    if (g.t) out.push([{ TC: true }, "Temperaturu uvrsti u kelvinima: T = t + 273."]);
    if (g.pj !== "Pa") out.push([{ pZad: true }, `Tlak uvrsti u paskalima (${formatNumber(g.pZadano)} ${g.pj} = ${formatSci(g.p)} Pa), jer je R = 8,31 Pa m³ K⁻¹ mol⁻¹.`]);
    out.push([{ m3: true }, "Iz pV = nRT volumen izlazi u m³ (uz p u Pa). Pretvori ga u traženu jedinicu: 1 m³ = 1000 L = 10⁶ mL."]);
  }
  return out;
}

// Krive vrijednosti koraka i iz učenikovih prethodnih rezultata k.
function kriveKoraka(s, i, korak, k, tocne) {
  const f = JEDINICE[korak.velicina][korak.jedinica];
  const out = [];
  const izf = izlucenoOf(s)?.f;
  const x = sveTvari(s).find((y) => y.f === (korak.tvar ?? izf)) ?? sveTvari(s)[0];
  const opis = x ? { ...x, zapis: polureakcijaTvari(s, x.f)?.zapis ?? "" } : null;
  for (const [o, p] of scenariji(s)) {
    const val = izracun(s, korak.kljuc, k, { ...o, preskoci: [korak.kljuc] });
    if (!isNum(val) || val <= 0) continue;
    if (typeof p === "function" && !opis) continue;
    out.push({ vrijednost: val / f, poruka: typeof p === "function" ? p(opis) : p });
  }
  for (const kr of s.krivo ?? []) if ((kr.korak ?? traziOf(s).length - 1) === i) out.push({ vrijednost: kr.vrijednost, poruka: kr.poruka });
  for (const u of DRUGE[korak.velicina] ?? [])
    if (JEDINICE[korak.velicina][u] !== f) out.push({ vrijednost: korak.osnovna / JEDINICE[korak.velicina][u], poruka: `To je ${IME[korak.velicina]} u ${u}, a traži se u ${korak.jedinica}.` });
  return out.filter((g) => isNum(g.vrijednost) && tocne.every((t) => !near(g.vrijednost, t, Math.abs(t) * 0.005)));
}

// polureakcija u kojoj nastaje (ili se otapa) tvar f
function polureakcijaTvari(s, f) {
  for (const c of celije(s)) {
    const e = elektroliza(c);
    if (e.greska) continue;
    for (const x of [e.katoda, e.anoda]) if (x.produkt === f || x.otapa === f) return x.j;
  }
  return null;
}

// ── opcije u načinu „produkti“ ──
export function opcijeProdukata(c) {
  const e = elektroliza(c);
  if (e.greska) return null;
  const { kation, anion } = e.ioni;
  const kp = e.ioni.par;
  const katoda = [];
  if (kation !== "H⁺") katoda.push({ kljuc: kp.red, f: kp.red, tekst: kp.naziv });
  katoda.push({ kljuc: "H₂", f: "H₂", tekst: "vodik" });
  if (kation === "H⁺") katoda.push({ kljuc: "O₂", f: "O₂", tekst: "kisik" });
  const anoda = [{ kljuc: "O₂", f: "O₂", tekst: "kisik" }];
  if (HALOGENIDI[anion]) anoda.unshift({ kljuc: HALOGENIDI[anion], f: HALOGENIDI[anion], tekst: { "Cl₂": "klor", "Br₂": "brom", "I₂": "jod", "F₂": "fluor" }[HALOGENIDI[anion]] });
  if (anion === "SO₄²⁻") anoda.push({ kljuc: "SO₂", f: "SO₂", tekst: "sumporov dioksid" });
  if (anion === "NO₃⁻") anoda.push({ kljuc: "NO₂", f: "NO₂", tekst: "dušikov dioksid" });
  if (e.anoda.otapa) anoda.push({ kljuc: e.anoda.produkt, f: e.anoda.produkt, tekst: `otapa se ${element(e.anoda.otapa).naziv} anode` });
  anoda.push({ kljuc: "H₂", f: "H₂", tekst: "vodik" });
  return { katoda, anoda };
}
const tocanProdukt = (e, strana) => (strana === "katoda" ? e.katoda.produkt : e.anoda.produkt);

function porukaProdukta(e, strana, izbor) {
  const { kation, anion } = e.ioni;
  const kp = e.ioni.par;
  if (strana === "katoda") {
    if (izbor === "O₂") return "Kisik nastaje oksidacijom, a na katodi je redukcija (čestice primaju elektrone).";
    if (izbor === "H₂" && e.talina) return `U talini nema vode ni vodikovih iona: ${kation} ioni primaju elektrone i izlučuje se ${kp.naziv}.`;
    if (izbor === "H₂") return e.katoda.razlog;
    return e.katoda.razlog;
  }
  if (izbor === "H₂") return "Vodik nastaje redukcijom (primanjem elektrona), a na anodi je oksidacija.";
  if (izbor === "SO₂" || izbor === "NO₂") return `${velikoSlovo(NAZIV_ANIONA[anion])} ioni se na anodi ne oksidiraju: oksidira se voda i nastaje kisik.`;
  if (e.anoda.otapa) return e.anoda.razlog;
  if (izbor === "O₂" && HALOGENIDI[anion] && e.talina) return `U talini nema vode: ${NAZIV_ANIONA[anion]} ioni ${anion} oksidiraju se u ${HALOGENIDI[anion]}.`;
  if (izbor === "O₂" && HALOGENIDI[anion]) return `${velikoSlovo(NAZIV_ANIONA[anion])} ioni ${anion} oksidiraju se lakše od vode (školsko pravilo: Cl⁻, Br⁻ i I⁻ na anodi daju halogen), pa nastaje ${HALOGENIDI[anion]}.`;
  return e.anoda.razlog;
}

// ── poruke za članak ──
function nazivZaPoruku(p) {
  return p.metal ? velikoSlovo(p.naziv) : velikoSlovo(p.naziv);
}
function porukaUloge(c) {
  const { an, ka } = c;
  const drugi = ka.metal ? ka.naziv : `${ka.naziv} (${ka.kljuc})`;
  if (an.metal) return `${nazivZaPoruku(an)} ima manji E° (${zapisEV(an.E)}) nego ${drugi} (${zapisEV(ka.E)}), pa se ${an.naziv} oksidira: to je anoda.`;
  return `${nazivZaPoruku(an)} (${an.kljuc}) ima manji E° (${zapisEV(an.E)}) nego ${drugi} (${zapisEV(ka.E)}), pa je na njoj oksidacija: to je anoda.`;
}
const kratko = (p) => (p.metal ? p.red : p.nemetal);

// Mapa načina na funkciju provjere i točan odgovor
function provjeriPolove(s, o) {
  const c = clanak(s.elektrode);
  const pitaj = s.pitaj ?? ["uloge", "polovi", "elektroni"];
  const strana = (i) => (i === 0 ? "lijevo" : "desno");
  if (pitaj.includes("uloge") && !Number.isInteger(o?.anoda)) return { tocno: false, poruka: "Označi koja je elektroda anoda, a koja katoda.", prazno: true };
  if (pitaj.includes("polovi") && !(Array.isArray(o?.polovi) && o.polovi.every((p) => p === "+" || p === "−"))) return { tocno: false, poruka: "Označi pol (+ ili −) svake elektrode.", prazno: true };
  if (pitaj.includes("elektroni") && !["lijevo", "desno"].includes(o?.elektroni)) return { tocno: false, poruka: "Odaberi kamo idu elektroni u žici.", prazno: true };
  if (pitaj.includes("most") && !["lijevo", "desno"].includes(o?.most)) return { tocno: false, poruka: "Odaberi kamo idu kationi iz mosta.", prazno: true };
  if (pitaj.includes("uloge") && o.anoda !== c.anoda) return { tocno: false, poruka: porukaUloge(c), krivo: ["uloge"] };
  if (pitaj.includes("polovi") && (o.polovi[c.anoda] !== "−" || o.polovi[c.katoda] !== "+"))
    return { tocno: false, poruka: `U galvanskom članku anoda (${kratko(c.an)}) šalje elektrone u žicu, pa je negativni pol (−), a katoda (${kratko(c.ka)}) je pozitivni pol (+).`, krivo: ["polovi"] };
  if (pitaj.includes("elektroni") && o.elektroni !== strana(c.katoda))
    return { tocno: false, poruka: `Elektroni idu žicom od anode, gdje nastaju oksidacijom, prema katodi, gdje se troše: od ${kratko(c.an)} prema ${kratko(c.ka)}.`, krivo: ["elektroni"] };
  if (pitaj.includes("most") && o.most !== strana(c.katoda)) {
    const m = ioniOd(s.most ?? "KNO₃");
    return { tocno: false, poruka: `Uz katodu se troše kationi (${c.ka.metal ? c.ka.oks : c.ka.ion}), pa kationi iz mosta (${m?.kation ?? "K⁺"}) idu prema katodi, a anioni (${m?.anion ?? "NO₃⁻"}) prema anodi.`, krivo: ["most"] };
  }
  return { tocno: true };
}

export function kriviNaponi(c) {
  const { an, ka, dE } = c;
  const out = [];
  const add = (v, poruka) => out.push({ vrijednost: zaokruzi3(v), poruka, tolerancija: 0.0015 });
  add(-dE, "Napon je negativan: zamijenjene su katoda i anoda. Katoda je elektroda s većim E°, pa je ΔE° = E°(katoda) − E°(anoda) pozitivan.");
  add(ka.E + an.E, "Potencijali su zbrojeni. ΔE° = E°(katoda) − E°(anoda): potencijal anode se oduzima (pazi na predznak).");
  const MNOZI = "Potencijal se ne množi koeficijentom iz jednadžbe: E° ovisi o vrsti tvari, a ne o tome koliko je čestica izreagiralo.";
  if (c.mnoziK !== 1 || c.mnoziA !== 1) add(c.mnoziK * ka.E - c.mnoziA * an.E, MNOZI);
  if (c.red.e !== 1 || c.oks.e !== 1) add(c.red.e * ka.E - c.oks.e * an.E, MNOZI);
  add(ka.E, "To je samo E° katode. Napon članka je razlika: ΔE° = E°(katoda) − E°(anoda).");
  add(an.E, "To je samo E° anode. Napon članka je razlika: ΔE° = E°(katoda) − E°(anoda).");
  return out.filter((k, i) => !near(k.vrijednost, dE, 0.004) && out.findIndex((x) => near(x.vrijednost, k.vrijednost, 0.0005)) === i);
}

// „1.057“ je ovdje decimalni broj (napon), ne tisućice
const normNapon = (v) => String(v ?? "").replace(/^(\s*[-−+]?\d)\.(\d{1,3})(\s*V?\s*)$/, "$1,$2$3");

function provjeriIstiskivanje(s, o) {
  const r = istiskivanje(s.metal, s.otopina);
  if (typeof o?.reagira !== "boolean") return { tocno: false, poruka: "Odaberi reagira li metal s otopinom.", prazno: true };
  const { pm, pk } = r;
  const imeK = pk.metal ? pk.naziv : "vodik";
  if (o.reagira !== r.reagira) {
    if (r.reagira)
      return {
        tocno: false,
        poruka: r.kiselina
          ? `${velikoSlovo(pm.naziv)} ima negativan E° (${zapisEV(pm.E)}), manji od E°(H⁺/H₂) = 0,000 V: jače je redukcijsko sredstvo od vodika i istiskuje ga iz kiseline (mjehurići vodika).`
          : `${velikoSlovo(pm.naziv)} ima manji E° (${zapisEV(pm.E)}) nego ${imeK} (${zapisEV(pk.E)}): jače je redukcijsko sredstvo, pa reducira ione ${pk.oks} i na metalu se izlučuje ${imeK}.`,
        krivoReagira: true,
      };
    return {
      tocno: false,
      poruka: r.kiselina
        ? `${velikoSlovo(pm.naziv)} ima pozitivan E° (${zapisEV(pm.E)}), veći od E°(H⁺/H₂) = 0,000 V: slabije je redukcijsko sredstvo od vodika i ne istiskuje ga iz kiseline.`
        : `${velikoSlovo(pm.naziv)} ima veći E° (${zapisEV(pm.E)}) nego ${imeK} (${zapisEV(pk.E)}): slabije je redukcijsko sredstvo i ne može reducirati ione ${pk.oks}. Metal reducira samo ione metala koji je iznad njega u tablici potencijala.`,
      krivoReagira: true,
    };
  }
  if (s.jednadzba && r.reagira) {
    const k = provjeriKoef({ reaktanti: r.jednadzba.reaktanti, produkti: r.jednadzba.produkti }, o.koeficijenti);
    if (!k.tocno) return { ...k, poruka: `Reagira, ali jednadžba nije točna. ${k.poruka}` };
  }
  return { tocno: true };
}

function provjeriProdukte(s, o) {
  const c = celije(s)[0];
  const e = elektroliza(c);
  const pitaj = s.pitaj ?? ["katoda", "anoda"];
  for (const strana of pitaj) if (!isText(o?.[strana])) return { tocno: false, poruka: `Odaberi što nastaje na ${strana === "katoda" ? "katodi" : "anodi"}.`, prazno: true };
  for (const strana of pitaj) {
    if (o[strana] !== tocanProdukt(e, strana)) return { tocno: false, poruka: `${strana === "katoda" ? "Katoda" : "Anoda"}: ${porukaProdukta(e, strana, o[strana])}`, krivo: [strana] };
  }
  return { tocno: true };
}

function provjeriFaraday(s, odgovor) {
  const pct = (s.tolerancija_posto ?? 1) / 100;
  const koraci = lanac(s);
  const unosi = [].concat(odgovor ?? []);
  const k = pocetno(s);
  for (let i = 0; i < koraci.length; i++) {
    const kor = koraci[i];
    const f = JEDINICE[kor.velicina][kor.jedinica];
    const izUcenika = izracun(s, kor.kljuc, k) / f;
    const tocne = [kor.vrijednost, izUcenika];
    const r = checkNumber({
      input: unosi[i] ?? "",
      answer: kor.vrijednost,
      tol: Math.abs(kor.vrijednost) * pct,
      unit: kor.jedinica,
      krivo: kriveKoraka(s, i, kor, k, tocne),
      savjet: `Pogledaj formulu: ${formulaKoraka(s, i)}, i jedinice.`,
    });
    const broj = parseNumber(String(unosi[i] ?? ""), kor.jedinica);
    const ok = r.tocno || (isNum(broj) && near(broj, izUcenika, Math.abs(izUcenika) * pct));
    if (!ok) return koraci.length > 1 ? { ...r, praznina: i, poruka: `${oznaka(kor.velicina, kor.tvar)}: ${r.poruka}` } : { ...r, praznina: 0 };
    k[kor.kljuc] = broj * f;
  }
  return { tocno: true };
}
export const FORMULA = { Q: "Q = I · t", ne: "n(e⁻) = Q : F", n: "n = n(e⁻) : z", m: "m = n · M", V: "V = n · V_m ili V = nRT : p", t: "t = Q : I", I: "I = Q : t" };

// Formula za strelicu ispred koraka i: ovisi o tome što je već poznato (I i t, ili izlučena tvar) i o prethodnim
// koracima. Broj elektrona z ostaje slovo (to je dio zadatka).
export function formulaKoraka(s, i) {
  const t = traziOf(s);
  const k = t[i];
  if (!k) return "";
  const prije = new Set(t.slice(0, i).map(kljucKoraka));
  const imaIt = s.struja != null && s.vrijeme != null;
  const iz = izlucenoOf(s);
  const plinV = plinUvjeti(s).normirani ? "V = n · V_m" : "V = nRT : p";
  const nOd = (f) => (iz && iz.f === f ? (iz.q === "m" ? `n(${f}) = m : M` : `n(${f}) = V : V_m`) : `n(${f}) = n(e⁻) : z`);
  if (k.velicina === "Q") return imaIt ? "Q = I · t" : "Q = n(e⁻) · F";
  if (k.velicina === "ne") {
    if (imaIt || prije.has("Q")) return prije.has("Q") || !imaIt ? "n(e⁻) = Q : F" : "n(e⁻) = I · t : F";
    return prije.has(`n:${iz.f}`) ? `n(e⁻) = z · n(${iz.f})` : `n(e⁻) = z · ${iz.q}(${iz.f}) : ${iz.q === "m" ? "M" : "V_m"}`;
  }
  if (k.velicina === "n") return nOd(k.tvar);
  if (k.velicina === "m") return prije.has(`n:${k.tvar}`) ? "m = n · M" : `${nOd(k.tvar)}, m = n · M`;
  if (k.velicina === "V") return prije.has(`n:${k.tvar}`) ? plinV : `${nOd(k.tvar)}, ${plinV}`;
  return FORMULA[k.velicina];
}
export const zapisVrijednosti = (v, u) => `${formatSci(v)}${u ? ` ${u}` : ""}`;

// ── točan odgovor (tekst) ──
const shemaZapis = (c) => c.shema;
function tocanClanak(s) {
  const c = clanak(s.elektrode);
  if (!c) return "";
  const uloge = `Anoda (−) je ${kratko(c.an)}: ${c.oks.zapis}; katoda (+) je ${kratko(c.ka)}: ${c.red.zapis}`;
  const ukupno = c.ukupno ? `ukupno: ${c.ukupno.zapis}` : "";
  const napon = `ΔE° = ${zapisEV(c.ka.E)} − ${uZagradi(c.an.E)} = ${zapisEV(c.dE)}`;
  if (s.nacin === "napon") return napon;
  if (s.nacin === "polovi") {
    const m = ioniOd(s.most ?? "KNO₃");
    const dio = [uloge, `elektroni idu žicom od ${kratko(c.an)} prema ${kratko(c.ka)}`];
    if ((s.pitaj ?? []).includes("most")) dio.push(`kationi iz mosta (${m?.kation}) idu prema katodi`);
    return dio.join("; ");
  }
  return [uloge, ukupno, `shema: ${shemaZapis(c)}`, napon].filter(Boolean).join("; ");
}
function tocanIstiskivanje(s) {
  const r = istiskivanje(s.metal, s.otopina);
  if (!r) return "";
  if (!r.reagira) return `Ne reagira: E°(${r.pm.kljuc}) = ${zapisEV(r.pm.E)} veći je od E°(${r.pk.kljuc}) = ${zapisEV(r.pk.E)}.`;
  return `Reagira: ${r.jednadzba.zapis}`;
}
function tocanElektroliza(s) {
  if (s.nacin === "faraday") {
    const iz = izlucenoOf(s);
    const zad = [];
    if (s.struja) zad.push(`I = ${s.struja.zapis ?? formatNumber(s.struja.I)} A`);
    if (s.vrijeme) zad.push(`t = ${formatNumber(sekunde(s.vrijeme))} s`);
    if (iz) zad.push(`${iz.q}(${iz.f}) = ${iz.zapis ?? formatNumber(iz.zadano)} ${iz.jedinica}`);
    const kor = lanac(s).map((k) => `${oznaka(k.velicina, k.tvar)} = ${zapisVrijednosti(k.vrijednost, k.jedinica)}`);
    return [zad.join(", "), ...kor].join(" → ");
  }
  const e = elektroliza(celije(s)[0]);
  if (e.greska) return "";
  const out = [`katoda (−): ${e.katoda.j.zapis}`, `anoda (+): ${e.anoda.j.zapis}`];
  if (s.nacin === "istrazi" && e.ukupno) out.push(`ukupno: ${e.ukupno.zapis}`);
  return out.join("; ");
}

// ── provjera speca ──
function validateClanak(s, need, list) {
  if (s.nacin === "istiskivanje") {
    for (const f of ["elektrode", "otopine", "most", "izbor", "pitaj"]) need(!(f in s), `istiskivanje ne koristi „${f}“ (metal i otopina)`);
    const pm = isText(s.metal) ? parMetala(s.metal) : null;
    if (!need(pm, `metal mora biti simbol metala s lista potencijala (npr. "Zn", "Cu"), a ne „${s.metal}“`)) return;
    need(!S_VODOM.has(s.metal), `${pm.naziv} reagira s vodom, pa se ne uranja u vodenu otopinu soli`);
    const ioni = ioniOd(s.otopina);
    if (!need(ioni, `otopina „${s.otopina}“ mora biti formula soli ili kiseline s kationom s lista (npr. "CuSO₄", "AgNO₃", "HCl")`)) return;
    need(ioni.anion !== "OH⁻" && ioni.anion !== "O²⁻", "otopina mora biti sol ili kiselina, ne lužina ili oksid");
    need(ioni.par.red !== s.metal, `${pm.naziv} u otopini vlastite soli ne reagira: to nije pitanje istiskivanja`);
    if (s.jednadzba != null) need(typeof s.jednadzba === "boolean", "jednadzba je true ili false");
    if (s.jednadzba) need(istiskivanje(s.metal, s.otopina)?.jednadzba, "ionska jednadžba istiskivanja ne može se izjednačiti");
    return;
  }
  for (const f of ["metal", "otopina", "jednadzba"]) need(!(f in s), `${s.nacin} ne koristi „${f}“ (to je za način istiskivanje)`);
  if (!need(Array.isArray(s.elektrode) && s.elektrode.length === 2, 'elektrode su dva para s lista potencijala, npr. ["Zn²⁺/Zn", "Cu²⁺/Cu"] (lijeva i desna čaša)')) return;
  const P = s.elektrode.map(par);
  P.forEach((p, i) => {
    if (!need(p, `elektrode[${i}] „${s.elektrode[i]}“ nije par s lista potencijala (oblik "Zn²⁺/Zn", "Cl₂/Cl⁻")`)) return;
    need(!SAMO_ELEKTROLIZA.has(p.kljuc), `${p.kljuc} nije polučlanak školskog galvanskog članka`);
    need(!(p.metal && S_VODOM.has(p.red)), `${p.naziv} reagira s vodom i ne može biti elektroda u vodenoj otopini`);
  });
  if (list.length) return;
  need(P[0].kljuc !== P[1].kljuc, "obje elektrode su isti par: članak nema napona");
  need(P[0].red !== P[1].red && P[0].oks !== P[1].oks, `${P[0].kljuc} i ${P[1].kljuc} dijele istu tvar: to nisu dva neovisna polučlanka`);
  need(P[0].E !== P[1].E, "parovi imaju isti E°: ne zna se koja je anoda");
  if (list.length) return;
  need(clanak(s.elektrode)?.ukupno, "ukupna jednadžba članka ne može se izjednačiti");
  if (s.otopine != null && need(Array.isArray(s.otopine) && s.otopine.length === 2, "otopine su dvije formule soli, redom kao elektrode (npr. [\"ZnSO₄\", \"CuSO₄\"])"))
    s.otopine.forEach((f, i) => {
      const io = ioniOd(f);
      const p = P[i];
      const ion = p.metal ? p.oks : p.ion;
      need(io && (io.kation === ion || io.anion === ion), `otopine[${i}] „${f}“ ne sadrži ione ${ion} polučlanka ${p.kljuc}`);
    });
  if (s.most != null) {
    const m = ioniOd(s.most);
    need(m && m.kation !== "H⁺", `most „${s.most}“ mora biti sol (npr. "KNO₃", "KCl")`);
  }
  if (s.pokazi_E != null) need(typeof s.pokazi_E === "boolean", "pokazi_E je true ili false");
  if (s.nacin === "istrazi") {
    if (s.izbor != null && need(Array.isArray(s.izbor) && s.izbor.length >= 2, "izbor je popis barem dva para s lista"))
      s.izbor.forEach((k, i) => {
        const p = par(k);
        need(p && p.zaClanak, `izbor[${i}] „${k}“ nije par s lista koji može biti polučlanak`);
      });
    if (Array.isArray(s.izbor) && P.every(Boolean)) need(P.every((p) => s.izbor.some((k) => par(k)?.kljuc === p.kljuc)), "početne elektrode moraju biti u popisu izbor");
  } else need(s.izbor == null, "izbor (padajući popis elektroda) ide samo uz istrazi");
  if (s.nacin === "polovi") {
    if (s.pitaj != null && need(Array.isArray(s.pitaj) && s.pitaj.length >= 1, `pitaj je popis od: ${PITANJA_POLOVA.join(", ")}`))
      s.pitaj.forEach((p) => need(PITANJA_POLOVA.includes(p), `pitaj: „${p}“ nije jedno od ${PITANJA_POLOVA.join(", ")}`));
  } else need(s.pitaj == null, "pitaj ide samo uz polovi");
  if (s.nacin === "napon" && s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis {vrijednost, poruka}")) {
    const dE = clanak(s.elektrode)?.dE;
    s.krivo.forEach((k, i) => {
      need(isNum(k?.vrijednost) && isText(k?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
      if (isNum(k?.vrijednost) && isNum(dE)) need(!near(k.vrijednost, dE, 0.004), `krivo[${i}].vrijednost je točan odgovor`);
    });
  } else if (s.nacin !== "napon") need(s.krivo == null, "krivo ide samo uz napon i faraday");
}

function validateCelija(c, at, need) {
  if (!need(isText(c?.elektrolit), `${at}elektrolit je formula, npr. "CuSO₄", "NaCl", "H₂SO₄"`)) return null;
  if (!need(c.stanje === "aq" || c.stanje === "l", `${at}stanje je "aq" (vodena otopina) ili "l" (talina)`)) return null;
  for (const st of ["anoda", "katoda"])
    if (c[st] != null) need(INERTNE.includes(c[st]) || parMetala(c[st]), `${at}${st} je "grafit", "Pt", "Au" ili simbol metala s lista (npr. "Cu" za bakrenu elektrodu)`);
  if (c.katoda != null && !INERTNE.includes(c.katoda)) need(!S_VODOM.has(c.katoda), `${at}katoda: ${element(c.katoda)?.naziv} reagira s vodom`);
  const e = elektroliza(c);
  if (!need(!e.greska, `${at}${e.greska}`)) return null;
  return e;
}

function validateElektroliza(s, need, list) {
  for (const f of ["elektrode", "otopine", "most", "metal", "otopina", "jednadzba", "pokazi_E"]) need(!(f in s), `elektroliza ne koristi „${f}“`);
  const e = validateCelija(s, "", need);
  if (!e) return;
  if (s.serijski != null) {
    need(s.nacin !== "produkti", "serijski (drugi članak) ide uz istrazi ili faraday, ne uz produkti");
    if (need(typeof s.serijski === "object", "serijski je {elektrolit, stanje, anoda?, katoda?}")) validateCelija(s.serijski, "serijski.", need);
  }
  if (list.length) return;
  // struja, vrijeme, plin
  if (s.struja != null) {
    need(isNum(s.struja?.I) && s.struja.I > 0, "struja.I je jakost struje u amperima (pozitivan broj)");
    if (s.struja?.zapis != null) need(isText(s.struja.zapis) && Number(s.struja.zapis.replace(",", ".")) === s.struja.I, `struja.zapis („${s.struja.zapis}“) mora biti isti broj kao struja.I`);
  }
  if (s.vrijeme != null) {
    const v = s.vrijeme;
    need(["h", "min", "s"].some((u) => isNum(v?.[u])) && ["h", "min", "s"].every((u) => v?.[u] == null || (isNum(v[u]) && v[u] >= 0)) && sekunde(v) > 0, "vrijeme je {h?, min?, s?}, npr. {min: 16, s: 5}");
    for (const f of Object.keys(v ?? {})) need(["h", "min", "s", "zapis"].includes(f), `vrijeme nema polje „${f}“ (h, min, s, zapis)`);
  }
  if (s.plin != null) {
    const g = s.plin;
    if (g?.uvjeti != null) need(g.uvjeti === "normirani" && !("p" in g) && !("t" in g) && !("T" in g), 'plin: {uvjeti: "normirani"} ili {p, jedinica, t ili T}');
    else {
      need(isNum(g?.p) && g.p > 0, 'plin treba uvjeti: "normirani" ili tlak p > 0');
      need(g?.jedinica == null || ["Pa", "hPa", "kPa", "MPa", "bar"].includes(g.jedinica), "plin.jedinica (tlaka) je Pa, hPa, kPa, MPa ili bar");
      need(isNum(g?.T) !== isNum(g?.t), "plin treba temperaturu: T (K) ili t (°C), ne oboje");
      if (isNum(g?.t)) need(g.t > -T0, "plin.t je u °C i mora biti iznad −273 °C");
    }
  }
  const tv = sveTvari(s);
  if (s.nacin === "istrazi") {
    need(s.pitaj == null, "pitaj ide uz produkti");
    for (const f of ["trazi", "izluceno", "krivo", "tolerancija_posto"]) need(!(f in s), `istrazi ne koristi „${f}“`);
    for (const [f, ime] of [["raspon_I", "A"], ["raspon_t", "min"]])
      if (s[f] != null) need(Array.isArray(s[f]) && s[f].length === 2 && s[f].every(isNum) && s[f][0] > 0 && s[f][1] > s[f][0], `${f} je [od, do] u ${ime}, 0 < od < do`);
    if (s.izbor != null && need(Array.isArray(s.izbor) && s.izbor.length >= 2, "izbor je popis barem dva elektrolita [{elektrolit, stanje}]"))
      s.izbor.forEach((c, i) => validateCelija(c, `izbor[${i}].`, need));
    if (Array.isArray(s.izbor)) need(s.izbor.some((c) => c?.elektrolit === s.elektrolit && c?.stanje === s.stanje), "početni elektrolit mora biti u popisu izbor");
    need(s.izbor == null || s.serijski == null, "izbor ne ide uz serijski članak");
    return;
  }
  need(s.izbor == null && s.raspon_I == null && s.raspon_t == null, "izbor, raspon_I i raspon_t idu samo uz istrazi");
  if (s.nacin === "produkti") {
    for (const f of ["struja", "vrijeme", "izluceno", "plin", "trazi", "krivo", "tolerancija_posto"]) need(!(f in s), `produkti ne koristi „${f}“`);
    if (s.pitaj != null && need(Array.isArray(s.pitaj) && s.pitaj.length >= 1, 'pitaj je ["katoda"], ["anoda"] ili oba'))
      s.pitaj.forEach((p) => need(p === "katoda" || p === "anoda", `pitaj: „${p}“ nije katoda ni anoda`));
    return;
  }
  // faraday
  need(s.pitaj == null, "pitaj ide uz produkti");
  const iz = izlucenoOf(s);
  if (s.izluceno != null) {
    const z = s.izluceno;
    if (need(iz, "izluceno je {tvar, m (g) ili V (L), jedinica?, zapis?}")) {
      const x = tv.find((y) => y.f === z.tvar);
      need(x, `izluceno.tvar „${z.tvar}“ ne nastaje na elektrodama (moguće: ${tv.map((y) => y.f).join(", ")})`);
      need(JEDINICE[iz.q][iz.jedinica] != null, `izluceno.jedinica za ${iz.q} je jedna od: ${Object.keys(JEDINICE[iz.q]).join(", ")}`);
      need(iz.zadano > 0, "izlučena količina mora biti pozitivna");
      if (iz.q === "V" && x) need(x.plin, `${z.tvar} nije plin, pa se zadaje masom`);
      if (z.zapis != null) need(isText(z.zapis) && Number(z.zapis.replace(",", ".")) === iz.zadano, `izluceno.zapis („${z.zapis}“) mora biti isti broj kao zadana vrijednost`);
    }
  }
  const imaI = s.struja != null;
  const imaT = s.vrijeme != null;
  need((imaI && imaT && !iz) || (iz && !(imaI && imaT)), "faraday treba ili struju i vrijeme, ili izlučenu tvar (uz najviše jedno od struja / vrijeme)");
  const trazeni = traziOf(s);
  if (!need(trazeni.length >= 1 && trazeni.length <= 4, "trazi je popis 1–4 koraka [{velicina, tvar?, jedinica?}]")) return;
  trazeni.forEach((t, i) => {
    if (!need(VELICINE.includes(t.velicina), `trazi[${i}].velicina je jedna od: ${VELICINE.join(", ")}`)) return;
    need(JEDINICE[t.velicina][t.jedinica] != null, `trazi[${i}].jedinica za ${t.velicina} je jedna od: ${Object.keys(JEDINICE[t.velicina]).join(", ")}`);
    if (["n", "m", "V"].includes(t.velicina)) {
      const x = tv.find((y) => y.f === t.tvar);
      if (!need(x, `trazi[${i}] (${t.velicina}) treba tvar koja nastaje na elektrodi (moguće: ${tv.map((y) => y.f).join(", ")})`)) return;
      if (t.velicina === "V") need(x.plin, `${t.tvar} nije plin, pa nema volumen plina`);
      if (t.velicina === "m") need(isNum(x.M), `${t.tvar} nema molarnu masu`);
    } else need(t.tvar == null, `trazi[${i}] (${t.velicina}) nema tvar`);
    if (t.velicina === "t") need(imaI && !imaT, "vrijeme t se računa samo kad je zadana struja, a ne vrijeme");
    if (t.velicina === "I") need(imaT && !imaI, "jakost struje I se računa samo kad je zadano vrijeme, a ne struja");
  });
  const kl = trazeni.map(kljucKoraka);
  need(new Set(kl).size === kl.length, "svaki korak lanca traži se samo jednom");
  if (iz) need(!kl.includes(`${iz.q}:${iz.f}`), "zadana izlučena količina ne smije biti i tražena");
  if (iz && iz.q === "V") need(s.plin != null, 'volumen plina treba plin: {uvjeti: "normirani"} ili {p, jedinica, t}');
  if (trazeni.some((t) => t.velicina === "V")) need(s.plin != null, 'volumen plina treba plin: {uvjeti: "normirani"} ili {p, jedinica, t}');
  else if (!(iz && iz.q === "V")) need(s.plin == null, "plin je zadan, a u lancu nema volumena plina");
  if (s.tolerancija_posto != null) need(isNum(s.tolerancija_posto) && s.tolerancija_posto > 0 && s.tolerancija_posto <= 5, "tolerancija_posto je broj između 0 i 5");
  if (list.length) return;
  const koraci = lanac(s);
  koraci.forEach((k, i) => need(isNum(k.vrijednost) && k.vrijednost > 0, `trazi[${i}] (${k.velicina}) ne daje pozitivan broj`));
  if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis {korak?, vrijednost, poruka}"))
    s.krivo.forEach((kr, i) => {
      const j = kr?.korak ?? koraci.length - 1;
      if (!need(Number.isInteger(j) && j >= 0 && j < koraci.length, `krivo[${i}].korak mora biti indeks koraka iz trazi`)) return;
      need(isNum(kr?.vrijednost) && isText(kr?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
      if (isNum(kr?.vrijednost)) need(!near(kr.vrijednost, koraci[j].vrijednost, Math.abs(koraci[j].vrijednost) * 0.005), `krivo[${i}].vrijednost je točan odgovor`);
    });
}

export const elektrokemija = {
  tip: "elektrokemija",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Elektrokemija: galvanski članak, istiskivanje metala (Voltin niz) i elektroliza. Potencijali, F, Ar, V_m i R su s ispitnog lista; anodu, katodu, polureakcije, ukupnu jednadžbu, ΔE°, shemu članka, produkte elektrolize i Faradayev lanac računa kod.
vrsta: "clanak" | "elektroliza"; tekst; nacin ovisi o vrsti.
Članak: elektrode: [par, par] – lijeva i desna čaša, parovi s lista u obliku "Zn²⁺/Zn", "Cu²⁺/Cu", "Ag⁺/Ag", "H⁺/H₂", "Cl₂/Cl⁻" (nemetalni par ima Pt elektrodu); par koji nije na listu, metal koji reagira s vodom (Na, K, Ca, Ba, Cs) i parovi s O₂ ili H₂O se odbijaju.
otopine?: [formula, formula] (npr. ["ZnSO₄", "CuSO₄"]; zadano piše samo ion), most?: sol u mostu (zadano "KNO₃"), pokazi_E?: E° oba para uz čaše (zadano true; to su podaci s lista).
- "istrazi" (nije zadatak): padajući popis za svaku čašu (izbor?: parovi, zadano ${IZBOR_CLANKA.join(", ")}), crtež s elektronima u žici i ionima u mostu, voltmetar s ΔE°, polureakcije, ukupno, shema, Voltin niz i istiskivanje u oba smjera;
- "polovi": učenik označi anodu/katodu, pol (+/−) i smjer elektrona; pitaj?: podskup ["uloge", "polovi", "elektroni", "most"] (zadano prva tri; "most" = kamo idu kationi iz mosta). Prije provjere crtež nema oznaka ni strelica;
- "napon": učenik upisuje ΔE° (tri decimale kao na listu); poruke za negativan napon (zamijenjene elektrode), zbrojene potencijale, potencijal pomnožen koeficijentom ili brojem elektrona, samo E° jedne elektrode; krivo?: [{vrijednost, poruka}];
- "istiskivanje": metal ("Zn") uronjen u otopina (sol "CuSO₄" ili kiselina "HCl"); učenik bira reagira li; jednadzba?: true – uz „reagira“ upisuje i koeficijente ionske jednadžbe (npr. Cu + 2 Ag⁺ → Cu²⁺ + 2 Ag). Bez elektrode i otopine istog metala.
Elektroliza: elektrolit (formula: "CuSO₄", "NaCl", "Na₂SO₄", "H₂SO₄", "NaOH", "Al₂O₃", "AgNO₃", "ZnCl₂"…), stanje: "aq" (vodena otopina) | "l" (talina), anoda?/katoda?: "grafit" (zadano) | "Pt" | simbol metala (metalna anoda se otapa, npr. "Cu" za pročišćavanje bakra).
Školska pravila: katoda u talini – metal; u otopini – metal ako mu je E° veći od E°(H₂O/H₂) = −0,828 V (Zn, Fe, Ni, Cu, Ag…), inače vodik (alkalijski i zemnoalkalijski metali, Al); kiselina – vodik. Anoda: Cl⁻, Br⁻, I⁻ daju halogen; SO₄²⁻, NO₃⁻ (u otopini) ne, nego kisik iz vode; O²⁻ i OH⁻ daju kisik; metalna anoda se otapa.
serijski?: {elektrolit, stanje, anoda?, katoda?} – drugi članak spojen serijski (isti naboj); plin?: {uvjeti: "normirani"} ili {p, jedinica ("kPa"…), t (°C) ili T (K)} za volumen plina.
- "istrazi" (nije zadatak): klizači struje i vremena (raspon_I? [od, do] u A, raspon_t? u min), mjehurići i izlučeni metal, Q, n(e⁻) i m ili V svake tvari uživo; izbor?: [{elektrolit, stanje}] za izbor elektrolita; struja?/vrijeme? su početne vrijednosti;
- "produkti": učenik bira što nastaje na katodi i na anodi (pitaj?: ["katoda"] / ["anoda"], zadano oba); poruke po pravilima gore;
- "faraday": lanac kao mol_racun. Zadano: struja {I, zapis?} (A) i vrijeme {h?, min?, s?, zapis?} ili izluceno {tvar, m (g) | V (L), jedinica?, zapis?} (uz najviše jedno od struja/vrijeme); trazi: 1–4 koraka [{velicina: "Q" (C) | "ne" (n(e⁻), mol) | "n" | "m" | "V" (uz tvar s elektrode, npr. "Cu", "H₂", "O₂", "Cl₂") | "t" | "I", jedinica?}], npr. Q → ne → n(H₂) → V(H₂) u mL. Poruke za minute umjesto sekundi, Q = I : t, Q · F, F zamijenjen s N_A ili e, zaboravljen ili pomnožen z, z po atomu za O₂ i Cl₂, M atoma umjesto molekule, 22,4 L/mol uz nenormirane uvjete, °C, kPa, m³ – dodaje kod; tolerancija_posto? (zadano 1); krivo?: [{korak?, vrijednost, poruka}].`,
  primjer: {
    tip: "elektrokemija",
    vrsta: "clanak",
    nacin: "istrazi",
    tekst: "Daniellov članak: cinkova pločica u otopini cinkova sulfata i bakrena u otopini bakrova(II) sulfata. Promijeni elektrode i gledaj kamo idu elektroni i koliki je napon.",
    elektrode: ["Zn²⁺/Zn", "Cu²⁺/Cu"],
    otopine: ["ZnSO₄", "CuSO₄"],
  },
  primjeri: [
    {
      tip: "elektrokemija",
      vrsta: "clanak",
      nacin: "polovi",
      tekst: "Galvanski članak složen je od niklove pločice u otopini niklova(II) sulfata i srebrne pločice u otopini srebrova nitrata. Označi anodu i katodu, polove i smjer elektrona u žici.",
      elektrode: ["Ni²⁺/Ni", "Ag⁺/Ag"],
      otopine: ["NiSO₄", "AgNO₃"],
    },
    {
      tip: "elektrokemija",
      vrsta: "clanak",
      nacin: "napon",
      tekst: "Izračunaj razliku standardnih elektrodnih potencijala članka Ni | Ni²⁺ ‖ Ag⁺ | Ag.",
      elektrode: ["Ni²⁺/Ni", "Ag⁺/Ag"],
      otopine: ["NiSO₄", "AgNO₃"],
    },
    {
      tip: "elektrokemija",
      vrsta: "clanak",
      nacin: "istiskivanje",
      tekst: "Komadić bakra uroni se u otopinu srebrova nitrata. Hoće li doći do promjene? Ako hoće, napiši ionsku jednadžbu.",
      metal: "Cu",
      otopina: "AgNO₃",
      jednadzba: true,
    },
    {
      tip: "elektrokemija",
      vrsta: "elektroliza",
      nacin: "istrazi",
      tekst: "Odaberi elektrolit, mijenjaj jakost struje i vrijeme, i gledaj što nastaje na elektrodama i koliko.",
      elektrolit: "CuSO₄",
      stanje: "aq",
      struja: { I: 1 },
      vrijeme: { min: 10 },
      izbor: [
        { elektrolit: "NaCl", stanje: "l" },
        { elektrolit: "CuSO₄", stanje: "aq" },
        { elektrolit: "NaCl", stanje: "aq" },
        { elektrolit: "Na₂SO₄", stanje: "aq" },
      ],
    },
    {
      tip: "elektrokemija",
      vrsta: "elektroliza",
      nacin: "produkti",
      tekst: "Elektrolizira se talina natrijeva klorida s grafitnim elektrodama. Što nastaje na katodi, a što na anodi?",
      elektrolit: "NaCl",
      stanje: "l",
    },
    {
      tip: "elektrokemija",
      vrsta: "elektroliza",
      nacin: "produkti",
      tekst: "Elektrolizira se vodena otopina bakrova(II) sulfata s grafitnim elektrodama. Što nastaje na katodi, a što na anodi?",
      elektrolit: "CuSO₄",
      stanje: "aq",
    },
    {
      tip: "elektrokemija",
      vrsta: "elektroliza",
      nacin: "faraday",
      tekst: "Vodena otopina natrijeva sulfata elektrolizira se strujom jakosti 2,00 A tijekom 16 min 5 s, pri 20 °C i 10⁵ Pa. Koliko je mililitara vodika nastalo?",
      elektrolit: "Na₂SO₄",
      stanje: "aq",
      struja: { I: 2, zapis: "2,00" },
      vrijeme: { min: 16, s: 5 },
      plin: { p: 100, jedinica: "kPa", t: 20 },
      trazi: [
        { velicina: "Q", jedinica: "C" },
        { velicina: "ne", jedinica: "mol" },
        { velicina: "n", tvar: "H₂", jedinica: "mol" },
        { velicina: "V", tvar: "H₂", jedinica: "mL" },
      ],
    },
    {
      tip: "elektrokemija",
      vrsta: "elektroliza",
      nacin: "faraday",
      tekst: "Dva elektrolizna članka spojena su serijski: u prvom je vodena otopina srebrova nitrata, a u drugom cinkova klorida. Koliki se volumen klora pri normiranim uvjetima razvije u drugom članku ako se na katodi prvoga istaloži 25,5 g srebra?",
      elektrolit: "AgNO₃",
      stanje: "aq",
      serijski: { elektrolit: "ZnCl₂", stanje: "aq" },
      izluceno: { tvar: "Ag", m: 25.5 },
      plin: { uvjeti: "normirani" },
      trazi: [
        { velicina: "ne", jedinica: "mol" },
        { velicina: "V", tvar: "Cl₂", jedinica: "L" },
      ],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    for (const f of Object.keys(s)) need(POLJA.includes(f), `elektrokemija nema polje „${f}“`);
    if (!need(VRSTE.includes(s.vrsta), `elektrokemija.vrsta je "clanak" ili "elektroliza"`)) return list;
    if (!need(NACINI[s.vrsta].includes(s.nacin), `nacin za vrstu ${s.vrsta} je jedan od: ${NACINI[s.vrsta].join(", ")}`)) return list;
    need(isText(s.tekst), "elektrokemija treba „tekst“");
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.vrsta === "clanak") {
      for (const f of ["elektrolit", "stanje", "anoda", "katoda", "serijski", "struja", "vrijeme", "izluceno", "plin", "trazi", "raspon_I", "raspon_t", "tolerancija_posto"])
        need(!(f in s), `članak ne koristi „${f}“ (to je za elektrolizu)`);
      validateClanak(s, need, list);
    } else validateElektroliza(s, need, list);
    return list;
  },

  // odgovor: polovi {anoda, polovi, elektroni, most}; napon broj (tekst); istiskivanje {reagira, koeficijenti?};
  // produkti {katoda, anoda}; faraday popis upisa po koracima
  check(s, odgovor) {
    if (s.nacin === "polovi") return provjeriPolove(s, odgovor);
    if (s.nacin === "napon") {
      const c = clanak(s.elektrode);
      return checkNumber({
        input: normNapon(Array.isArray(odgovor) ? odgovor[0] : odgovor),
        answer: c.dE,
        tol: 0.004,
        unit: "V",
        krivo: [...(s.krivo ?? []).map((k) => ({ ...k, tolerancija: 0.0015 })), ...kriviNaponi(c)],
        savjet: "Napon članka je ΔE° = E°(katoda) − E°(anoda). Katoda je elektroda s većim E°.",
      });
    }
    if (s.nacin === "istiskivanje") return provjeriIstiskivanje(s, odgovor);
    if (s.nacin === "produkti") return provjeriProdukte(s, odgovor);
    if (s.nacin === "faraday") return provjeriFaraday(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  brojcaniOdgovor(s) {
    if (s.nacin === "napon") return clanak(s.elektrode)?.dE ?? null;
    if (s.nacin !== "faraday") return null;
    const v = lanac(s).at(-1)?.vrijednost;
    return isNum(v) ? Number(v.toPrecision(3)) : null;
  },

  tocanOdgovor(s) {
    if (s.vrsta === "clanak") return s.nacin === "istiskivanje" ? tocanIstiskivanje(s) : tocanClanak(s);
    return tocanElektroliza(s);
  },
};

export { uvjetiZapis };
