// ph_skala: veza c(H₃O⁺) ↔ pH ↔ pOH ↔ c(OH⁻) (pri 25 °C Kw = 1,0·10⁻¹⁴ mol² dm⁻⁶), stupanj ionizacije i Ka / Kb
// slabih kiselina i baza, pH pufera i boje indikatora. Sve vrijednosti računa kod iz izvora (zadana veličina,
// otopina jake ili slabe kiseline / lužine, pufer), pa autor lekcije ne upisuje odgovore.
//
// Kw, područja promjene boje indikatora i Ka / Kb nisu na listu „Kemija – tablice“ s mature (provjereno na listu
// 2025./2026.: samo periodni sustav, temeljne konstante i elektrodni potencijali). Zato nisu u _tablice.js, nego
// ovdje kao školski podaci: Kw učenik zna napamet, a Ka / Kb i intervale indikatora zadatak mora zadati. Ka / Kb iz
// tablice ispod služe samo za poredak otopina i boje indikatora (nikad se ne traže kao broj).
import { isNum, parseNumber, formatNumber, formatSci, near } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { atomiOd } from "./_tablice.js";
import { formulaZapis } from "./mol_racun.js";

export const KW_25 = 1.0e-14;
export const KW_ZAPIS = "1,0·10⁻¹⁴ mol² dm⁻⁶";
export const NACINI = ["istrazi", "izracunaj", "indikator", "poredaj"];
export const CETIRI = ["c_H3O", "pH", "pOH", "c_OH"];
const TRAZENE = [...CETIRI, "alfa", "Ka", "Kb", "Kw"];
export const KISELOST = ["kisela", "neutralna", "luzhnata"];
export const KISELOST_NAZIV = { kisela: "kisela", neutralna: "neutralna", luzhnata: "lužnata" };

// oznaka za prikaz (kroz Formula.svelte; „K_a“ komponenta crta s indeksom) i za poruke
export const OZNAKA = { c_H3O: "c(H₃O⁺)", pH: "pH", pOH: "pOH", c_OH: "c(OH⁻)", alfa: "α", Ka: "K_a", Kb: "K_b", Kw: "K_w" };
const OZ = { ...OZNAKA, Ka: "Ka", Kb: "Kb", Kw: "Kw" };
export const IME = {
  c_H3O: "oksonijevi ioni",
  pH: "pH",
  pOH: "pOH",
  c_OH: "hidroksidni ioni",
  alfa: "stupanj ionizacije",
  Ka: "konstanta ionizacije kiseline",
  Kb: "konstanta ionizacije baze",
  Kw: "ionski produkt vode",
};
export const JEDINICA = { c_H3O: "mol/dm³", c_OH: "mol/dm³", pH: "", pOH: "", alfa: "", Ka: "mol/dm³", Kb: "mol/dm³", Kw: "mol²/dm⁶" };
const JE_P = (q) => q === "pH" || q === "pOH";

// ── tvari: [formule (prva je glavna), naziv, vrsta, n, K] ──
// n: broj iona H₃O⁺ / OH⁻ po jedinki (H₂SO₄ školski 2), kod soli broj iona koji hidroliziraju.
// K: Ka slabe kiseline, Kb slabe baze; kod soli K konjugiranog para (NH₄Cl: Kb(NH₃), CH₃COONa: Ka(CH₃COOH)).
const TVARI = [
  [["HCl"], "klorovodična kiselina", "jaka_kiselina", 1],
  [["HBr"], "bromovodična kiselina", "jaka_kiselina", 1],
  [["HI"], "jodovodična kiselina", "jaka_kiselina", 1],
  [["HNO3"], "dušična kiselina", "jaka_kiselina", 1],
  [["HClO4"], "perklorna kiselina", "jaka_kiselina", 1],
  [["H2SO4"], "sumporna kiselina", "jaka_kiselina", 2],
  [["LiOH"], "litijev hidroksid", "jaka_luzina", 1],
  [["NaOH"], "natrijev hidroksid", "jaka_luzina", 1],
  [["KOH"], "kalijev hidroksid", "jaka_luzina", 1],
  [["Ca(OH)2"], "kalcijev hidroksid", "jaka_luzina", 2],
  [["Sr(OH)2"], "stroncijev hidroksid", "jaka_luzina", 2],
  [["Ba(OH)2"], "barijev hidroksid", "jaka_luzina", 2],
  [["CH3COOH"], "octena (etanska) kiselina", "slaba_kiselina", 1, 1.8e-5],
  [["HCOOH"], "mravlja (metanska) kiselina", "slaba_kiselina", 1, 1.8e-4],
  [["CH3CH2COOH", "C2H5COOH"], "propanska kiselina", "slaba_kiselina", 1, 1.3e-5],
  [["CH3CH2CH2COOH", "C3H7COOH"], "butanska kiselina", "slaba_kiselina", 1, 1.5e-5],
  [["C6H5COOH"], "benzojeva kiselina", "slaba_kiselina", 1, 6.4e-5],
  [["HF"], "fluorovodična kiselina", "slaba_kiselina", 1, 6.8e-4],
  [["HNO2"], "dušikasta kiselina", "slaba_kiselina", 1, 4.5e-4],
  [["HClO"], "hipoklorasta kiselina", "slaba_kiselina", 1, 3.0e-8],
  [["HCN"], "cijanovodična kiselina", "slaba_kiselina", 1, 6.2e-10],
  [["H2CO3"], "ugljična kiselina", "slaba_kiselina", 1, 4.3e-7],
  [["C6H5OH"], "fenol", "slaba_kiselina", 1, 1.0e-10],
  [["NH3"], "amonijak", "slaba_baza", 1, 1.8e-5],
  [["CH3NH2"], "metilamin", "slaba_baza", 1, 4.4e-4],
  [["CH3CH2NH2", "C2H5NH2"], "etilamin", "slaba_baza", 1, 4.5e-4],
  [["CH3CH2CH2NH2", "C3H7NH2"], "propilamin", "slaba_baza", 1, 4.7e-4],
  [["(CH3)2NH"], "dimetilamin", "slaba_baza", 1, 5.4e-4],
  [["(CH3)3N"], "trimetilamin", "slaba_baza", 1, 6.3e-5],
  [["C6H5NH2"], "anilin", "slaba_baza", 1, 4.3e-10],
  [["H2O"], "voda", "neutralna"],
  [["NaCl"], "natrijev klorid", "neutralna"],
  [["KCl"], "kalijev klorid", "neutralna"],
  [["NaBr"], "natrijev bromid", "neutralna"],
  [["KBr"], "kalijev bromid", "neutralna"],
  [["NaI"], "natrijev jodid", "neutralna"],
  [["KI"], "kalijev jodid", "neutralna"],
  [["NaNO3"], "natrijev nitrat", "neutralna"],
  [["KNO3"], "kalijev nitrat", "neutralna"],
  [["Na2SO4"], "natrijev sulfat", "neutralna"],
  [["K2SO4"], "kalijev sulfat", "neutralna"],
  [["CaCl2"], "kalcijev klorid", "neutralna"],
  [["BaCl2"], "barijev klorid", "neutralna"],
  [["NaClO4"], "natrijev perklorat", "neutralna"],
  [["CH3OH"], "metanol", "neutralna"],
  [["CH3CH2OH", "C2H5OH"], "etanol", "neutralna"],
  [["CH3CH2CH2OH", "C3H7OH"], "propan-1-ol", "neutralna"],
  [["C6H12O6"], "glukoza", "neutralna"],
  [["C12H22O11"], "saharoza", "neutralna"],
  [["NH4Cl"], "amonijev klorid", "kisela_sol", 1, 1.8e-5],
  [["NH4NO3"], "amonijev nitrat", "kisela_sol", 1, 1.8e-5],
  [["(NH4)2SO4"], "amonijev sulfat", "kisela_sol", 2, 1.8e-5],
  [["CH3NH3Cl"], "metilamonijev klorid", "kisela_sol", 1, 4.4e-4],
  [["CH3COONa", "NaCH3COO"], "natrijev acetat (etanoat)", "luzhnata_sol", 1, 1.8e-5],
  [["CH3COOK", "KCH3COO"], "kalijev acetat (etanoat)", "luzhnata_sol", 1, 1.8e-5],
  [["HCOONa"], "natrijev metanoat", "luzhnata_sol", 1, 1.8e-4],
  [["HCOOK"], "kalijev metanoat", "luzhnata_sol", 1, 1.8e-4],
  [["C6H5COONa"], "natrijev benzoat", "luzhnata_sol", 1, 6.4e-5],
  [["NaF"], "natrijev fluorid", "luzhnata_sol", 1, 6.8e-4],
  [["NaClO"], "natrijev hipoklorit", "luzhnata_sol", 1, 3.0e-8],
  [["NaCN"], "natrijev cijanid", "luzhnata_sol", 1, 6.2e-10],
  [["KCN"], "kalijev cijanid", "luzhnata_sol", 1, 6.2e-10],
  [["Na2CO3"], "natrijev karbonat", "luzhnata_sol", 1, 4.7e-11],
  [["K2CO3"], "kalijev karbonat", "luzhnata_sol", 1, 4.7e-11],
];
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-" };
// „CH₃COOH“, „CH3COOH(aq)“ → „CH3COOH“
export const kljuc = (f) =>
  [...String(f ?? "")]
    .map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : (SUP[c] ?? c)))
    .join("")
    .replace(/\((?:aq|s|l|g)\)/g, "")
    .replace(/[\s]/g, "")
    .replace(/−/g, "-");
const PO_KLJUCU = Object.fromEntries(TVARI.flatMap(([f, naziv, vrsta, n, K]) => f.map((x) => [x, { formula: f[0], naziv, vrsta, n: n ?? 1, K: K ?? null }])));
export const tvar = (f) => PO_KLJUCU[kljuc(f)] ?? null;

export const VRSTA_IME = {
  jaka_kiselina: "jaka kiselina",
  slaba_kiselina: "slaba kiselina",
  kisela_sol: "sol koja hidrolizira (kisela)",
  neutralna: "neutralna tvar",
  luzhnata_sol: "sol koja hidrolizira (lužnata)",
  slaba_baza: "slaba baza",
  jaka_luzina: "jaka lužina",
};
// „{formula} …“: za poruke kod poretka
export const VRSTA_OPIS = {
  jaka_kiselina: "je jaka kiselina i u vodi potpuno ionizira",
  slaba_kiselina: "je slaba kiselina i ionizira samo djelomično",
  kisela_sol: "je sol čiji kation hidrolizom daje H₃O⁺ (slabo kisela otopina)",
  neutralna: "ne daje ni H₃O⁺ ni OH⁻ (neutralna otopina)",
  luzhnata_sol: "je sol čiji anion hidrolizom daje OH⁻ (slabo lužnata otopina)",
  slaba_baza: "je slaba baza i samo djelomično prima proton od vode",
  jaka_luzina: "je jaka lužina i u vodi potpuno disocira na ione OH⁻",
};
const KISELO = ["jaka_kiselina", "slaba_kiselina", "kisela_sol"];

// ── brojevi ──
export const log10 = (x) => Math.log10(x);
export const pKwOf = (Kw) => -Math.log10(Kw);
// pH s dvije decimale (školski): „9,30“, „−0,30“
export const zapisPH = (v) => (isNum(v) ? (Math.round(v * 100) / 100).toFixed(2).replace("-", "−").replace(".", ",") : "");
// Koncentracija kao u školi: tri značajne znamenke s nulama na kraju, ispod 0,01 znanstveni zapis („1,32·10⁻³“)
const EKSP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻" };
export function zapisC(v, sig = 3) {
  if (!isNum(v) || v <= 0) return "";
  if (v >= 0.01 && v < 1000) return v.toPrecision(sig).replace(".", ",");
  const [m, e] = v.toExponential(sig - 1).split("e");
  return `${m.replace(".", ",")}·10${[...String(Number(e))].map((c) => EKSP[c]).join("")}`;
}
const zapisKw = (Kw) => `${zapisC(Kw, 2)} mol² dm⁻⁶`;
const pKwTekst = (Kw) => (Math.abs(Kw - KW_25) < 1e-18 ? "14" : formatNumber(Math.round(pKwOf(Kw) * 100) / 100));

export function zapisVelicine(q, v) {
  if (!isNum(v)) return "—";
  if (JE_P(q)) return zapisPH(v);
  if (q === "alfa") return `${formatNumber(Number(v.toPrecision(3)))} = ${formatNumber(Number((v * 100).toPrecision(3)))} %`;
  return `${zapisC(v, q === "Kw" ? 2 : 3)} ${JEDINICA[q]}`;
}

// c(H₃O⁺) iz bilo koje od četiri veličine i obrnuto
export function uCH(q, v, Kw) {
  if (q === "c_H3O") return v;
  if (q === "pH") return 10 ** -v;
  if (q === "pOH") return Kw / 10 ** -v;
  if (q === "c_OH") return Kw / v;
  return NaN;
}
export function izCH(q, cH, Kw) {
  if (q === "c_H3O") return cH;
  if (q === "pH") return -Math.log10(cH);
  if (q === "pOH") return Math.log10(cH) - Math.log10(Kw);
  if (q === "c_OH") return Kw / cH;
  return NaN;
}

// ── indikatori (školski podaci, nisu na listu mature) ──
const rgb = (h, a = 1) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
// univerzalni indikator: boja na svakom cijelom pH (crveno → narančasto → žuto → zeleno → plavo → ljubičasto)
export const UNIVERZALNI_SKALA = ["#c1121f", "#d62828", "#e85d04", "#f48c06", "#faa307", "#f6c90e", "#c5d22a", "#4caf50", "#1f9e89", "#1f78b4", "#1d4e9e", "#33308f", "#4e2a8a", "#5e2580", "#6a1f74"];
export const INDIKATORI = {
  univerzalni: {
    naziv: "univerzalni indikator",
    kratko: "univerzalni",
    boje: [
      { id: "crven", naziv: "crven", boja: "#d62828", od: 0, do: 3 },
      { id: "narancast", naziv: "narančast", boja: "#f48c06", od: 3, do: 5 },
      { id: "zut", naziv: "žut", boja: "#f2c80f", od: 5, do: 6.5 },
      { id: "zelen", naziv: "zelen", boja: "#4caf50", od: 6.5, do: 7.5 },
      { id: "zelenoplav", naziv: "zelenoplav", boja: "#1f9e89", od: 7.5, do: 9 },
      { id: "plav", naziv: "plav", boja: "#1f6fb8", od: 9, do: 11 },
      { id: "ljubicast", naziv: "ljubičast", boja: "#4e2a8a", od: 11, do: 14 },
    ],
  },
  fenolftalein: {
    naziv: "fenolftalein",
    kratko: "fenolftalein",
    prijelaz: [8.2, 10.0],
    boje: [
      { id: "bezbojan", naziv: "bezbojan", boja: null },
      { id: "svijetloljubicast", naziv: "svijetloljubičast", boja: "#f0a6d6" },
      { id: "ljubicast", naziv: "ljubičast", i: "crvenoljubičast, ružičast", boja: "#c2188f" },
    ],
  },
  metiloranz: {
    naziv: "metiloranž",
    kratko: "metiloranž",
    prijelaz: [3.1, 4.4],
    boje: [
      { id: "crven", naziv: "crven", boja: "#d7263d" },
      { id: "narancast", naziv: "narančast", boja: "#f08a24" },
      { id: "zut", naziv: "žut", boja: "#f2c318" },
    ],
  },
  lakmus: {
    naziv: "lakmus",
    kratko: "lakmus",
    prijelaz: [5.0, 8.0],
    boje: [
      { id: "crven", naziv: "crven", boja: "#c8323a" },
      { id: "ljubicast", naziv: "ljubičast", boja: "#7b4397" },
      { id: "plav", naziv: "plav", boja: "#2f5fa8" },
    ],
  },
};
export const INDIKATORI_RED = ["univerzalni", "fenolftalein", "metiloranz", "lakmus"];
const RUB = 0.25; // univerzalni papir je grub: blizu granice vrijedi i susjedna boja

// Boje koje se za pH prihvaćaju kao točne: [glavna, …]. U području promjene boje prihvaća se prijelazna boja i boja
// bližeg ruba (metiloranž pri pH 3,7 → narančast ili crven; tako je i na maturi 2021.: „crvene“).
export function bojeZa(ind, pH) {
  const I = INDIKATORI[ind];
  if (ind === "univerzalni") {
    const i = Math.max(0, I.boje.findIndex((b) => pH < b.do || b.do === 14));
    const out = [I.boje[i].id];
    if (i > 0 && pH - I.boje[i].od < RUB) out.push(I.boje[i - 1].id);
    if (i < I.boje.length - 1 && I.boje[i].do - pH < RUB) out.push(I.boje[i + 1].id);
    return out;
  }
  const [a, b] = I.prijelaz;
  const [kis, prij, luz] = I.boje.map((x) => x.id);
  if (pH < a) return [kis];
  if (pH > b) return [luz];
  return [prij, pH < (a + b) / 2 ? kis : luz];
}
export const bojaPoId = (ind, id) => INDIKATORI[ind]?.boje.find((b) => b.id === id) ?? null;

const mix = (x, y, t) => x.map((v, i) => v + (y[i] - v) * t);
const css = ([r, g, b, a]) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 100) / 100})`;
// Boja indikatora za pH kao CSS (glatki prijelaz); bezbojan je prozirna boja.
export function bojaNaPH(ind, pH) {
  if (ind === "univerzalni") {
    const x = Math.max(0, Math.min(14, pH));
    const i = Math.min(13, Math.floor(x));
    return css(mix(rgb(UNIVERZALNI_SKALA[i]), rgb(UNIVERZALNI_SKALA[i + 1]), x - i));
  }
  const I = INDIKATORI[ind];
  const [a, b] = I.prijelaz;
  const [k, p, l] = I.boje.map((x) => (x.boja ? rgb(x.boja) : rgb(I.boje[1].boja, 0)));
  const sred = (a + b) / 2;
  if (pH <= a) return css(k);
  if (pH >= b) return css(l);
  return css(pH < sred ? mix(k, p, (pH - a) / (sred - a)) : mix(p, l, (pH - sred) / (b - sred)));
}

export function kiselostOf(pH, Kw) {
  const n = pKwOf(Kw) / 2;
  if (pH < n - 0.005) return "kisela";
  if (pH > n + 0.005) return "luzhnata";
  return "neutralna";
}

// ── spec → izvor ──
const traziOf = (s) => [].concat(s?.trazi ?? []).map((t) => (typeof t === "string" ? t : t?.velicina));
export const traziPopis = traziOf;
const jeTrazenKw = (s) => traziOf(s).includes("Kw");

// Otopina iz speca: {formula, naziv, vrsta, n, c, K, Kzadan, alfa, priroda: "kiselina"|"baza"|"neutralno"} ili {greska}
export function otopinaOf(o) {
  if (!o || typeof o !== "object") return { greska: "otopina mora biti {formula, c, …}" };
  if (!isText(o.formula)) return { greska: "otopina treba formulu (npr. \"HCl\", \"CH₃COOH\")" };
  if (!atomiOd(o.formula.replace(/[⁺⁻+−-]+$/, ""))) return { greska: `formula „${o.formula}“ se ne da pročitati` };
  const t = tvar(o.formula);
  const Kzadan = isNum(o.Ka) ? o.Ka : isNum(o.Kb) ? o.Kb : null;
  let vrsta = t?.vrsta ?? null;
  if (!t) {
    if (isNum(o.Ka)) vrsta = "slaba_kiselina";
    else if (isNum(o.Kb)) vrsta = "slaba_baza";
    else if (isNum(o.alfa) && (o.vrsta === "kiselina" || o.vrsta === "baza")) vrsta = o.vrsta === "kiselina" ? "slaba_kiselina" : "slaba_baza";
    else
      return {
        greska: `„${o.formula}“ nije u popisu jakih kiselina, lužina, slabih kiselina i baza ni soli; za slabu kiselinu zadaj Ka, za slabu bazu Kb (ili alfa i vrsta: "kiselina" | "baza")`,
      };
  }
  const priroda = KISELO.includes(vrsta) ? "kiselina" : vrsta === "neutralna" ? "neutralno" : "baza";
  return {
    formula: formulaZapis(o.formula),
    naziv: isText(o.naziv) ? o.naziv : (t?.naziv ?? ""),
    vrsta,
    n: t?.n ?? 1,
    c: o.c,
    zapis: o.zapis,
    K: Kzadan ?? t?.K ?? null,
    Kzadan,
    Kime: vrsta === "slaba_baza" ? "Kb" : "Ka",
    alfa: isNum(o.alfa) ? o.alfa : null,
    priroda,
    poznata: !!t,
  };
}

// c(H₃O⁺) otopine (školski: slaba kiselina √(Ka · c), sol iz Kw : K para). `tocno`: bez aproksimacije (kvadratna
// jednadžba), prihvaća se i to.
export function cHOtopine(ot, Kw, tocno = false) {
  const { vrsta, n, c, K, alfa } = ot;
  const slabo = (K, c) => (tocno ? (-K + Math.sqrt(K * K + 4 * K * c)) / 2 : Math.sqrt(K * c));
  if (vrsta === "jaka_kiselina") return n * c;
  if (vrsta === "jaka_luzina") return Kw / (n * c);
  if (vrsta === "slaba_kiselina") return alfa != null ? alfa * c : slabo(K, c);
  if (vrsta === "slaba_baza") return Kw / (alfa != null ? alfa * c : slabo(K, c));
  if (vrsta === "neutralna") return Math.sqrt(Kw);
  if (vrsta === "kisela_sol") return slabo(Kw / K, n * c);
  if (vrsta === "luzhnata_sol") return Kw / slabo(Kw / K, n * c);
  return NaN;
}

// Pufer: c(H₃O⁺) = Ka · n(kiseline) : n(soli); V u mL, neobavezno (zadano oba ili nijedan)
export function puferOf(p) {
  if (!p || typeof p !== "object") return { greska: "pufer mora biti {Ka, kiselina: {formula, c, V?}, sol: {formula, c, V?}}" };
  const k = p.kiselina ?? {};
  const b = p.sol ?? {};
  const imaV = isNum(k.V) && isNum(b.V);
  const nK = k.c * (imaV ? k.V : 1);
  const nB = b.c * (imaV ? b.V : 1);
  return { Ka: p.Ka, kiselina: k, sol: b, imaV, nK, nB, cH: (p.Ka * nK) / nB };
}

// Stanje otopine: {cH, Kw, pH, pOH, cOH, c0?, priroda?, alfa?, K?} i opis izvora
export function stanje(s) {
  const zad = s.zadano;
  let Kw = isNum(s.Kw) ? s.Kw : KW_25;
  let cH = NaN;
  let izvor = null;
  if (zad && CETIRI.includes(zad.velicina) && isNum(zad.vrijednost)) {
    if (s.neutralna && !isNum(s.Kw)) {
      // neutralna otopina pri drugoj temperaturi: c(H₃O⁺) = c(OH⁻), Kw = c(H₃O⁺)²
      cH = zad.velicina === "c_H3O" || zad.velicina === "c_OH" ? zad.vrijednost : 10 ** -zad.vrijednost;
      Kw = cH * cH;
    } else cH = uCH(zad.velicina, zad.vrijednost, Kw);
    izvor = { tip: "zadano", velicina: zad.velicina };
  } else if (s.otopina) {
    const ot = otopinaOf(s.otopina);
    if (!ot.greska) {
      cH = cHOtopine(ot, Kw);
      izvor = { tip: "otopina", ot };
    }
  } else if (s.pufer) {
    const p = puferOf(s.pufer);
    if (!p.greska) {
      cH = p.cH;
      izvor = { tip: "pufer", p };
    }
  }
  const st = { cH, Kw, pKw: pKwOf(Kw), izvor };
  st.c_H3O = cH;
  st.pH = -Math.log10(cH);
  st.pOH = st.pKw - st.pH;
  st.c_OH = Kw / cH;
  // slaba kiselina / baza uz zadanu veličinu (izmjereni pH): α i K iz c₀
  if (s.otopina && izvor) {
    const ot = otopinaOf(s.otopina);
    if (!ot.greska && (ot.vrsta === "slaba_kiselina" || ot.vrsta === "slaba_baza")) {
      const x = ot.vrsta === "slaba_kiselina" ? st.c_H3O : st.c_OH;
      st.ot = ot;
      st.c0 = ot.c;
      st.prirodna = ot.vrsta === "slaba_kiselina" ? "c_H3O" : "c_OH";
      st.alfa = x / ot.c;
      st.K = (x * x) / (ot.c - x);
      st.Kpribl = (x * x) / ot.c;
      st[ot.Kime] = st.K;
    }
  }
  st.Kw_ = Kw;
  st.kiselost = kiselostOf(st.pH, Kw);
  return st;
}

// ── lanac koraka ──
const SUSJEDI = { c_H3O: ["pH", "c_OH"], pH: ["c_H3O", "pOH"], pOH: ["pH", "c_OH"], c_OH: ["pOH", "c_H3O"] };
function formulaPara(iz, q, Kw) {
  const P = pKwTekst(Kw);
  const F = {
    "c_H3O>pH": "pH = −log c(H₃O⁺)",
    "pH>c_H3O": "c(H₃O⁺) = 10^(−pH)",
    "pH>pOH": `pOH = ${P} − pH`,
    "pOH>pH": `pH = ${P} − pOH`,
    "c_OH>pOH": "pOH = −log c(OH⁻)",
    "pOH>c_OH": "c(OH⁻) = 10^(−pOH)",
    "c_H3O>c_OH": "c(OH⁻) = Kw : c(H₃O⁺)",
    "c_OH>c_H3O": "c(H₃O⁺) = Kw : c(OH⁻)",
    "c_H3O>pOH": `pOH = ${P} − pH, pH = −log c(H₃O⁺)`,
    "c_OH>pH": `pH = ${P} − pOH, pOH = −log c(OH⁻)`,
    "pH>c_OH": `c(OH⁻) = 10^(−pOH), pOH = ${P} − pH`,
    "pOH>c_H3O": `c(H₃O⁺) = 10^(−pH), pH = ${P} − pOH`,
  };
  return F[`${iz}>${q}`];
}
// Kako izvor daje svoju „prirodnu“ koncentraciju (c(H₃O⁺) za kiseline, c(OH⁻) za lužine)
function izvorFormula(st) {
  const iz = st.izvor;
  if (iz.tip === "pufer") return { q: "c_H3O", formula: "c(H₃O⁺) = Ka · n(kiseline) : n(soli)" };
  const ot = iz.ot;
  const F = ot.formula;
  const q = ot.priroda === "baza" ? "c_OH" : "c_H3O";
  const cq = OZ[q];
  if (ot.vrsta === "jaka_kiselina" || ot.vrsta === "jaka_luzina") return { q, formula: `${cq} = ${ot.n > 1 ? `${ot.n} · ` : ""}c(${F})` };
  if (ot.alfa != null) return { q, formula: `${cq} = α · c(${F})` };
  return { q, formula: `${cq} = √(${ot.Kime} · c)` };
}

// Pravilo za korak q iz poznatih vrijednosti k (redom kako su postale poznate u `red`):
// {iz, f(k), alt?(k), formula} ili null.
function pravilo(q, k, red, s, st) {
  const Kw = st.Kw;
  const zadnji = (popis) => [...red].reverse().find((x) => popis.includes(x));
  if (CETIRI.includes(q)) {
    const iz = zadnji(SUSJEDI[q]) ?? zadnji(CETIRI.filter((x) => x !== q));
    if (iz) return { iz, f: (k) => izCH(q, uCH(iz, k[iz], Kw), Kw), formula: formulaPara(iz, q, Kw) };
    if (!st.izvor || st.izvor.tip === "zadano") return null;
    const z = izvorFormula(st);
    const formula = z.q === q ? z.formula : `${formulaPara(z.q, q, Kw)}, ${z.formula}`;
    return { iz: "izvor", f: () => st[q], alt: () => izCH(q, cHOtopine(st.izvor.ot ?? {}, Kw, true), Kw), formula };
  }
  if (!st.ot) return null;
  const nat = st.prirodna;
  const cq = OZ[nat];
  const c0 = st.c0;
  // prirodna koncentracija iz najsvježije poznate od četiri veličine
  const xIz = (k) => {
    const iz = zadnji(CETIRI);
    return iz ? izCH(nat, uCH(iz, k[iz], Kw), Kw) : st[nat];
  };
  const izX = zadnji(CETIRI) ?? "izvor";
  if (q === "alfa") return { iz: izX, f: (k) => xIz(k) / c0, formula: `α = ${cq} : c₀` };
  if (q === st.ot.Kime) {
    const brojnik = st.ot.Kime === "Ka" ? "c(A⁻) · c(H₃O⁺) : c(HA)" : "c(BH⁺) · c(OH⁻) : c(B)";
    if (zadnji(["alfa", ...CETIRI]) === "alfa")
      return { iz: "alfa", f: (k) => (k.alfa ** 2 * c0) / (1 - k.alfa), alt: (k) => k.alfa ** 2 * c0, formula: `${OZ[q]} = α² · c₀ : (1 − α)` };
    return { iz: izX, f: (k) => xIz(k) ** 2 / (c0 - xIz(k)), alt: (k) => xIz(k) ** 2 / c0, formula: `${OZ[q]} = ${brojnik} = ${cq}² : (c₀ − ${cq})` };
  }
  return null;
}
function praviloKw(k, red, st) {
  const iz = [...red].reverse().find((x) => CETIRI.includes(x));
  if (!iz) return null;
  return { iz, f: (k) => uCH(iz === "pOH" ? "pH" : iz === "c_OH" ? "c_H3O" : iz, k[iz], 1) ** 2, formula: "Kw = c(H₃O⁺) · c(OH⁻) = c(H₃O⁺)²" };
}

// Početno poznato: zadana veličina
function pocetno(s) {
  const k = {};
  const red = [];
  if (s.zadano && CETIRI.includes(s.zadano.velicina)) {
    k[s.zadano.velicina] = s.zadano.vrijednost;
    red.push(s.zadano.velicina);
  }
  return { k, red };
}

export function lanac(s) {
  const st = stanje(s);
  const { k, red } = pocetno(s);
  const koraci = traziOf(s).map((q) => {
    const p = q === "Kw" ? praviloKw(k, red, st) : pravilo(q, k, red, s, st);
    const v = q === "Kw" ? st.Kw : st[q];
    if (p) {
      k[q] = v;
      red.push(q);
    }
    return { velicina: q, pravilo: p, vrijednost: v };
  });
  return { st, koraci };
}

// ── tipične greške: [{v, poruka}] u veličini koraka ──
function greskeIzvora(st) {
  const iz = st.izvor;
  const Kw = st.Kw;
  const out = [];
  const add = (cH, poruka) => isNum(cH) && cH > 0 && out.push({ cH, poruka });
  if (iz.tip === "pufer") {
    const p = iz.p;
    add((p.Ka * p.nB) / p.nK, "Omjer je obrnut: c(H₃O⁺) = Ka · n(kiseline) : n(soli).");
    if (Math.abs(p.nK / p.nB - 1) > 0.01) add(p.Ka, "c(H₃O⁺) je jednaka Ka samo kad je kiseline i soli jednako. Ovdje pomnoži Ka omjerom n(kiseline) : n(soli).");
    add(Math.sqrt(p.Ka * p.kiselina.c), "Tako bi bilo u samoj kiselini. Sol (konjugirana baza) potiskuje ionizaciju: c(H₃O⁺) = Ka · n(kiseline) : n(soli).");
    if (p.imaV && Math.abs(p.kiselina.c / p.sol.c - p.nK / p.nB) > 0.01 * (p.nK / p.nB))
      add((p.Ka * p.kiselina.c) / p.sol.c, "Volumeni nisu jednaki: u omjer idu množine, n = c · V.");
    return out;
  }
  const ot = iz.ot;
  const F = ot.formula;
  const { n, c, K, alfa } = ot;
  const kao = (x) => (ot.priroda === "baza" ? Kw / x : x); // prirodna koncentracija → c(H₃O⁺)
  const cq = ot.priroda === "baza" ? "c(OH⁻)" : "c(H₃O⁺)";
  if (ot.vrsta === "jaka_kiselina") {
    if (n > 1) add(c, `${F} daje ${n === 2 ? "dva iona" : `${n} iona`} H₃O⁺ po jedinki: c(H₃O⁺) = ${n} · c(${F}).`);
    add(Kw / (n * c), `${F} je kiselina: u vodi daje ione H₃O⁺, pa je c(H₃O⁺) = ${n > 1 ? `${n} · ` : ""}c(${F}), a ne c(OH⁻).`);
  }
  if (ot.vrsta === "jaka_luzina") {
    if (n > 1) add(Kw / c, `${F} daje ${n === 2 ? "dva iona" : `${n} iona`} OH⁻ po jedinki: c(OH⁻) = ${n} · c(${F}).`);
    add(n * c, `${F} je lužina: u vodi daje ione OH⁻, a ne H₃O⁺. Najprije c(OH⁻), pa pOH, pa pH = ${pKwTekst(Kw)} − pOH.`);
    if (n > 1) add(c, `${F} je lužina: daje ione OH⁻, i to dva po jedinki. Najprije c(OH⁻) = ${n} · c, pa pOH i pH.`);
  }
  if (ot.vrsta === "slaba_kiselina" || ot.vrsta === "slaba_baza") {
    const ime = ot.vrsta === "slaba_kiselina" ? "slaba kiselina" : "slaba baza";
    if (alfa != null) {
      add(kao(c), `${F} je ${ime}: ionizirao je samo dio jedinki (α), pa je ${cq} = α · c.`);
      add(kao(alfa), `To je α, udio ioniziranih jedinki. ${cq} = α · c.`);
      add(kao(c / alfa), `α · c: koncentraciju treba pomnožiti s α, a ne podijeliti.`);
      add(kao(100 * alfa * c), "α je udio, a ne postotak: u račun ide kao decimalni broj (npr. 1,3 % = 0,013).");
    } else {
      const Kn = ot.Kime;
      add(kao(c), `${F} je ${ime}: ionizira samo mali dio jedinki, pa ${cq} nije jednaka c(${F}). ${cq} = √(${Kn} · c).`);
      add(kao(K * c), `Zaboravljen je korijen: ${cq} = √(${Kn} · c).`);
      add(kao(Math.sqrt(K)), `U korijen ide umnožak ${Kn} · c, i koncentracija.`);
      add(kao(Math.sqrt(K / c)), `To je α = √(${Kn} : c). ${cq} = √(${Kn} · c).`);
      add(kao(K), `${Kn} nije koncentracija iona: ${cq} = √(${Kn} · c).`);
    }
    if (ot.vrsta === "slaba_baza") add(alfa != null ? alfa * c : Math.sqrt(K * c), `${F} je baza: u vodi nastaju ioni OH⁻, pa najprije računaš c(OH⁻), a iz nje pOH i pH.`);
  }
  return out;
}

function greske(q, p, k, s, st) {
  const out = [];
  const add = (v, poruka) => isNum(v) && out.push({ v, poruka });
  const Kw = st.Kw;
  const pKw = st.pKw;
  const P = pKwTekst(Kw);
  const nije25 = Math.abs(Kw - KW_25) > 1e-18;
  if (CETIRI.includes(q)) {
    const par = { pH: "pOH", pOH: "pH", c_H3O: "c_OH", c_OH: "c_H3O" }[q];
    add(st[par], `To je ${OZ[par]}, a traži se ${OZ[q]}.${JE_P(q) ? ` Vrijedi pH + pOH = ${P}.` : " Vrijedi c(H₃O⁺) · c(OH⁻) = Kw."}`);
    const iz = p.iz;
    if (CETIRI.includes(iz)) {
      const x = k[iz];
      const tip = `${iz}>${q}`;
      if (tip === "c_H3O>pH" || tip === "c_OH>pOH") {
        add(Math.log10(x), `Zaboravljen je minus: ${q} = −log ${OZ[iz]}, pa je ${q} pozitivan broj.`);
        add(-Math.log(x), "To je prirodni logaritam (ln). Treba dekadski: tipka log.");
        const e = Math.floor(Math.log10(x) + 1e-9);
        if (Math.abs(x / 10 ** e - 1) > 0.05) add(-e, `${q} nije samo eksponent: izračunaj −log cijelog broja na kalkulatoru.`);
      }
      if (tip === "pH>c_H3O" || tip === "pOH>c_OH") {
        add(10 ** x, `Zaboravljen je minus u eksponentu: ${OZ[q]} = 10^(−${iz}).`);
        add(Math.exp(-x), `To je e^(−${iz}). Treba 10^(−${iz}): na kalkulatoru SHIFT log (10ˣ).`);
      }
      if (tip === "pH>pOH" || tip === "pOH>pH") {
        add(x - pKw, `Obrnuto: ${q} = ${P} − ${iz}.`);
        add(pKw + x, `${q} = ${P} − ${iz}: oduzmi, ne zbrajaj.`);
        if (nije25) add(14 - x, `14 vrijedi samo pri 25 °C. Ovdje je pH + pOH = −log Kw = ${P}.`);
      }
      if (tip === "c_H3O>c_OH" || tip === "c_OH>c_H3O") {
        add(Kw * x, `Kw se dijeli: ${OZ[q]} = Kw : ${OZ[iz]}.`);
        add(x / Kw, `Obrnut omjer: ${OZ[q]} = Kw : ${OZ[iz]}.`);
        if (nije25) add(KW_25 / x, `Kw = 1,0·10⁻¹⁴ vrijedi samo pri 25 °C. Ovdje je Kw = ${zapisKw(Kw)}.`);
      }
      if (tip === "c_OH>pH" || tip === "c_H3O>pOH") add(pKw - Math.log10(x), `Zaboravljen je minus: ${par} = −log ${OZ[iz]}, pa ${q} = ${P} − ${par}.`);
      if (tip === "pH>c_OH" || tip === "pOH>c_H3O") add(10 ** (pKw - x), `Zaboravljen je minus u eksponentu: ${OZ[q]} = 10^(−${par}).`);
      if (nije25 && (tip === "c_OH>pH" || tip === "c_H3O>pOH")) add(14 + Math.log10(x), `14 vrijedi samo pri 25 °C. Ovdje je pH + pOH = ${P}.`);
    } else if (iz === "izvor") {
      for (const g of greskeIzvora(st)) add(izCH(q, g.cH, Kw), g.poruka);
      const nat = izvorFormula(st).q;
      if ((nat === "c_H3O" && q === "pH") || (nat === "c_OH" && q === "pOH")) add(-st[q], `Zaboravljen je minus: ${q} = −log ${OZ[nat]}, pa je ${q} pozitivan broj.`);
    }
    return out;
  }
  const nat = st.prirodna;
  const cq = OZ[nat];
  const c0 = st.c0;
  const x = st[nat];
  if (q === "alfa") {
    add(c0 / x, `Obrnuto: α = ${cq} : c₀, i manji je od 1.`);
    add(x, `To je ${cq}. α je udio ioniziranih jedinki: ${cq} : c₀.`);
  }
  if (q === "Ka" || q === "Kb") {
    const a = isNum(k.alfa) ? k.alfa : st.alfa;
    add(a * a, `Pomnoži s c₀: ${OZ[q]} = α² · c₀ : (1 − α).`);
    add(a * c0, `To je ${cq} = α · c₀. ${OZ[q]} = α² · c₀ : (1 − α).`);
    add(a, `To je α. ${OZ[q]} = ${cq}² : (c₀ − ${cq}) = α² · c₀ : (1 − α).`);
    add(x * x, `Brojnik ${cq}² treba podijeliti s ravnotežnom koncentracijom ${q === "Ka" ? "kiseline" : "baze"}, c₀ − ${cq}.`);
    add(x / (c0 - x), `U brojniku su dvije jednake koncentracije (iona ${q === "Ka" ? "A⁻ i H₃O⁺" : "BH⁺ i OH⁻"}), pa je brojnik ${cq}².`);
    add((c0 - x) / (x * x), "Obrnuto: produkti ionizacije su u brojniku, neionizirane jedinke u nazivniku.");
  }
  return out;
}
function greskeKw(k, p, st) {
  const out = [];
  const x = uCH(p.iz === "pOH" ? "pH" : p.iz === "c_OH" ? "c_H3O" : p.iz, k[p.iz], 1);
  out.push({ v: x, poruka: "Kw = c(H₃O⁺) · c(OH⁻), a u neutralnoj otopini obje su jednake: Kw = c(H₃O⁺)²." });
  out.push({ v: 2 * x, poruka: "Kvadriraj: c(H₃O⁺) · c(H₃O⁺), a ne 2 · c(H₃O⁺)." });
  out.push({ v: KW_25, poruka: "1,0·10⁻¹⁴ vrijedi pri 25 °C. Ovdje je druga temperatura, pa Kw računaš iz pH." });
  return out;
}

// ── unos ──
// „pH = 9,30“ → „9,30“; „2·10^-5 mol/dm3“ → „2·10^-5“; α s „%“ → udio
function ocisti(q, ulaz) {
  let v = String(ulaz ?? "").trim();
  if (v.includes("=")) v = v.slice(v.lastIndexOf("=") + 1).trim();
  v = v.replace(/\s*mol.*$/i, "").trim();
  if (q === "alfa" && /%\s*$/.test(v)) {
    const n = parseNumber(v.replace(/%\s*$/, ""));
    return n == null ? v : n / 100;
  }
  return v;
}

const polja = (s) => ["tip", "nacin", "tekst", "zadano", "otopina", "pufer", "trazi", "kiselost", "Kw", "t", "neutralna", "klizac", "indikatori", "otopine", "smjer", "tolerancija_pH", "tolerancija_posto", "operacije", "savjet"];
const tolPH = (s) => (isNum(s.tolerancija_pH) ? s.tolerancija_pH : 0.02);
const pctOf = (s) => (s.tolerancija_posto ?? 1) / 100;

function validateZapis(z, v, at, need) {
  if (z == null) return;
  const n = parseNumber(String(z));
  need(isText(z) && isNum(n) && Math.abs(n - v) <= 1e-9 * Math.max(1, Math.abs(v)), `${at} („${z}“) mora biti isti broj kao vrijednost (${v}), samo zapisan kao u tekstu zadatka`);
}

function validateOtopina(o, at, need, nacin) {
  const ot = otopinaOf(o);
  if (!need(!ot.greska, `${at}: ${ot.greska}`)) return null;
  const nijeNeutr = ot.vrsta !== "neutralna";
  if (nijeNeutr || o.c != null) need(isNum(o.c) && o.c > 0 && o.c <= 20, `${at}.c (mol/dm³) mora biti pozitivan broj`);
  validateZapis(o.zapis, o.c, `${at}.zapis`, need);
  if (isNum(o.Ka) && isNum(o.Kb)) need(false, `${at}: zadaj Ka ili Kb, ne oboje`);
  const slaba = ot.vrsta === "slaba_kiselina" || ot.vrsta === "slaba_baza";
  if (isNum(o.Ka)) need(ot.vrsta === "slaba_kiselina" && o.Ka > 0 && o.Ka < 1, `${at}: Ka ide samo uz slabu kiselinu (${ot.formula} je ${VRSTA_IME[ot.vrsta]}) i mora biti između 0 i 1`);
  if (isNum(o.Kb)) need(ot.vrsta === "slaba_baza" && o.Kb > 0 && o.Kb < 1, `${at}: Kb ide samo uz slabu bazu (${ot.formula} je ${VRSTA_IME[ot.vrsta]}) i mora biti između 0 i 1`);
  if (o.alfa != null) {
    need(slaba, `${at}: alfa (stupanj ionizacije) ide samo uz slabu kiselinu ili bazu`);
    need(isNum(o.alfa) && o.alfa > 0 && o.alfa < 1, `${at}.alfa je udio između 0 i 1 (1,32 % = 0.0132)`);
    need(!isNum(o.Ka) && !isNum(o.Kb), `${at}: zadaj alfa ili konstantu, ne oboje`);
  }
  if (o.zapis_K != null) validateZapis(o.zapis_K, o.Ka ?? o.Kb ?? o.alfa, `${at}.zapis_K`, need);
  if (o.vrsta != null) need(["kiselina", "baza"].includes(o.vrsta), `${at}.vrsta je "kiselina" ili "baza" (samo za nepoznatu formulu uz alfa)`);
  if (o.naziv != null) need(isText(o.naziv), `${at}.naziv mora biti tekst`);
  for (const f of Object.keys(o)) need(["formula", "c", "zapis", "Ka", "Kb", "alfa", "zapis_K", "vrsta", "naziv"].includes(f), `${at} nema polje „${f}“`);
  return ot;
}

export function pHOtopine(o, Kw = KW_25) {
  const ot = otopinaOf(o);
  if (ot.greska) return NaN;
  return -Math.log10(cHOtopine({ ...ot, c: ot.c ?? 0.1 }, Kw));
}

// ── poredaj ──
const RANG = ["jaka_kiselina", "slaba_kiselina", "kisela_sol", "neutralna", "luzhnata_sol", "slaba_baza", "jaka_luzina"];
export function poredajPodaci(s) {
  const Kw = isNum(s.Kw) ? s.Kw : KW_25;
  return [].concat(s.otopine ?? []).map((o, i) => {
    const ot = otopinaOf(o);
    return { i, ot, pH: ot.greska ? NaN : -Math.log10(cHOtopine({ ...ot, c: ot.c ?? 0.1 }, Kw)) };
  });
}
export function tocanPoredak(s) {
  const d = poredajPodaci(s);
  const pad = s.smjer === "padajuci";
  return [...d].sort((a, b) => (pad ? b.pH - a.pH : a.pH - b.pH)).map((x) => x.i);
}
function porukaPara(a, b, s) {
  // a je stavljen ispred b, a treba iza
  const A = a.ot;
  const B = b.ot;
  const pad = s.smjer === "padajuci";
  const smjer = pad ? "Na vrhu je najviši pH (najlužnatija otopina)." : "Na vrhu je najniži pH (najkiselija otopina).";
  if (A.vrsta !== B.vrsta) return `${A.formula} i ${B.formula} su krivim redom: ${A.formula} ${VRSTA_OPIS[A.vrsta]}, a ${B.formula} ${VRSTA_OPIS[B.vrsta]}. ${smjer}`;
  const kis = A.priroda === "kiselina";
  const ion = kis ? "H₃O⁺" : "OH⁻";
  if (kljuc(A.formula) === kljuc(B.formula))
    return `${A.formula} je u obje otopine: veća koncentracija daje više iona ${ion}, pa je pH ${kis ? "niži" : "viši"}. ${smjer}`;
  if ((A.vrsta === "jaka_kiselina" || A.vrsta === "jaka_luzina") && A.n !== B.n) {
    const v = A.n > B.n ? A : B;
    return `Usporedi koliko iona ${ion} daje svaka otopina: ${v.formula} daje ${v.n === 2 ? "dva" : v.n} po jedinki, pa ${ion} ima n · c. ${smjer}`;
  }
  if ((A.vrsta === "slaba_kiselina" || A.vrsta === "slaba_baza") && A.c === B.c && A.K !== B.K)
    return `Obje su ${kis ? "slabe kiseline" : "slabe baze"} iste koncentracije: jača je ona s većom ${A.Kime}, pa ima ${kis ? "niži" : "viši"} pH. ${smjer}`;
  return `Usporedi c(${ion}) u otopinama ${A.formula} i ${B.formula}. ${smjer}`;
}

// ── widget ──
export const ph_skala = {
  tip: "ph_skala",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `pH-skala: veza c(H₃O⁺) ↔ pH ↔ pOH ↔ c(OH⁻) (pri 25 °C Kw = 1,0·10⁻¹⁴ mol² dm⁻⁶), stupanj ionizacije i Ka/Kb slabih kiselina i baza, pH pufera, boje indikatora i poredak otopina po pH.
Kw, Ka/Kb i područja promjene boje indikatora nisu na listu mature: Kw učenik zna napamet, a Ka/Kb zadatak mora zadati (u „izracunaj“). Kod računa sve vrijednosti sam.
Izvor (jedan): zadano: {velicina: "c_H3O" | "pH" | "pOH" | "c_OH", vrijednost, zapis?} (zapis kao u tekstu: "2,0·10⁻⁵", "2,88"),
ili otopina: {formula, c (mol/dm³), zapis?, naziv?} jake kiseline (HCl, HBr, HI, HNO₃, HClO₄, H₂SO₄ – školski 2 H₃O⁺) ili lužine (NaOH, KOH, LiOH, Ca(OH)₂, Sr(OH)₂, Ba(OH)₂ – 2 OH⁻),
  slabe kiseline uz Ka ili slabe baze uz Kb (c(H₃O⁺) = √(Ka · c), kako se radi u školi; prihvaća se i točno rješenje) ili uz alfa (stupanj ionizacije, udio: 0.0132); zapis_K? za Ka/Kb/alfa;
  zadano + otopina slabe kiseline/baze bez konstante: izmjereni pH i c₀, pa se traže alfa i Ka/Kb (Ka = c(H₃O⁺)² : (c₀ − c(H₃O⁺)); prihvaća se i c(H₃O⁺)² : c₀),
ili pufer: {Ka, zapis_K?, kiselina: {formula, c, V?, zapis?, zapis_V?}, sol: {formula, c, V?, zapis?, zapis_V?}} (V u mL, oba ili nijedan; c(H₃O⁺) = Ka · n(kiseline) : n(soli)).
Kw? (zadano 1,0·10⁻¹⁴) i t? (°C) za drugu temperaturu; neutralna?: true – neutralna otopina pri drugoj temperaturi (zadan pH), tada se traži i "Kw" (Kw = c(H₃O⁺)²).
tekst, nacin:
- "istrazi" (nije zadatak): klizač za ${CETIRI.join(" | ")} (klizac?, zadano "pH"), početna vrijednost iz zadano (zadano pH 7); uživo se mijenjaju pOH, obje koncentracije, kiselo/neutralno/lužnato, boja univerzalnog indikatora na skali i boje fenolftaleina, metiloranža i lakmusa (indikatori? popis, zadano svi);
- "izracunaj": trazi: popis 1–4 koraka redom kojim se računaju, od ${TRAZENE.join(", ")} (npr. ["pOH", "pH"] iz c(OH⁻); ["c_H3O", "alfa", "Ka"] iz pH i c₀); svaki korak se provjerava i iz učenikova prethodnog rezultata;
  pH i pOH s dvije decimale (tolerancija_pH?, zadano 0,02), ostalo tolerancija_posto? (zadano 1); kiselost?: true – na kraju bira kisela / neutralna / lužnata; operacije?: formule na strelicama (zadano ne);
- "indikator": indikatori: popis od ${INDIKATORI_RED.join(", ")}; učenik bira boju svakoga za izvor (zadano, otopina – i soli poput NaCl, CH₃COONa, NH₄Cl – ili pufer); kiselost? kao gore.
  Boje (školski): univerzalni crven < 3, narančast, žut, zelen ≈ 7, zelenoplav, plav > 9, ljubičast > 11; fenolftalein bezbojan < 8,2, ljubičast > 10; metiloranž crven < 3,1, žut > 4,4; lakmus crven < 5, plav > 8; u području promjene vrijedi prijelazna boja i boja bližeg ruba;
- "poredaj": otopine: 3–6 otopina [{formula, c?, Ka?/Kb?, naziv?}] (bez konstante kod koristi školske Ka/Kb samo za poredak; dvije slabe kiseline različitih tvari trebaju zadane Ka), smjer?: "rastuci" (zadano, od najnižeg pH) | "padajuci"; pH otopina mora se razlikovati.
Poruke za tipične greške (zaboravljen minus u pH = −log c, ln umjesto log, pomiješani pH i pOH, 14 − pH, Kw dijeli, faktor 2 kod H₂SO₄ i Ba(OH)₂, lužina daje OH⁻, slaba kiselina kao jaka, zaboravljen korijen, α kao postotak, obrnut omjer u puferu, Kw = 10⁻¹⁴ pri drugoj temperaturi) dodaje kod.`,
  primjer: {
    tip: "ph_skala",
    nacin: "izracunaj",
    tekst: "U otopini natrijeva acetata izmjereno je c(OH⁻) = 2,0·10⁻⁵ mol/dm³. Izračunaj pOH i pH te otopine.",
    zadano: { velicina: "c_OH", vrijednost: 2.0e-5, zapis: "2,0·10⁻⁵" },
    trazi: ["pOH", "pH"],
    kiselost: true,
  },
  primjeri: [
    {
      tip: "ph_skala",
      nacin: "istrazi",
      tekst: "Pomiči klizač pH i gledaj kako se mijenjaju koncentracije oksonijevih i hidroksidnih iona i boje indikatora.",
      zadano: { velicina: "pH", vrijednost: 7 },
    },
    {
      tip: "ph_skala",
      nacin: "istrazi",
      tekst: "Mijenjaj koncentraciju oksonijevih iona. Za koliko se promijeni pH kad je c(H₃O⁺) deset puta veća?",
      zadano: { velicina: "c_H3O", vrijednost: 1e-3 },
      klizac: "c_H3O",
      indikatori: ["univerzalni"],
    },
    {
      tip: "ph_skala",
      nacin: "izracunaj",
      tekst: "Izmjereni pH otopine octene kiseline, c₀(CH₃COOH) = 0,100 mol/dm³, iznosi 2,88. Izračunaj c(H₃O⁺), stupanj ionizacije i konstantu ionizacije octene kiseline.",
      zadano: { velicina: "pH", vrijednost: 2.88, zapis: "2,88" },
      otopina: { formula: "CH₃COOH", c: 0.1, zapis: "0,100" },
      trazi: ["c_H3O", "alfa", "Ka"],
    },
    {
      tip: "ph_skala",
      nacin: "izracunaj",
      tekst: "Izračunaj c(OH⁻), pOH i pH otopine barijeva hidroksida koncentracije 0,0050 mol/dm³.",
      otopina: { formula: "Ba(OH)₂", c: 0.005, zapis: "0,0050" },
      trazi: ["c_OH", "pOH", "pH"],
    },
    {
      tip: "ph_skala",
      nacin: "izracunaj",
      tekst: "Pomiješa se 20,0 mL otopine octene kiseline i 10,0 mL otopine natrijeva acetata iste koncentracije, 0,100 mol/dm³. Ka(CH₃COOH) = 1,76·10⁻⁵ mol/dm³. Koliki je pH nastale otopine?",
      pufer: {
        Ka: 1.76e-5,
        kiselina: { formula: "CH₃COOH", c: 0.1, zapis: "0,100", V: 20, zapis_V: "20,0" },
        sol: { formula: "CH₃COONa", c: 0.1, zapis: "0,100", V: 10, zapis_V: "10,0" },
      },
      trazi: ["c_H3O", "pH"],
    },
    {
      tip: "ph_skala",
      nacin: "izracunaj",
      tekst: "Pri 60 °C otopina u točki ekvivalencije ima pH = 6,50. Izračunaj c(H₃O⁺) i konstantu ionizacije vode pri 60 °C. Je li ta otopina kisela?",
      zadano: { velicina: "pH", vrijednost: 6.5, zapis: "6,50" },
      neutralna: true,
      t: 60,
      trazi: ["c_H3O", "Kw"],
      kiselost: true,
    },
    {
      tip: "ph_skala",
      nacin: "indikator",
      tekst: "U otopini natrijeva acetata c(OH⁻) = 2,0·10⁻⁵ mol/dm³. Koje će boje biti univerzalni indikatorski papir i je li otopina kisela, neutralna ili lužnata?",
      zadano: { velicina: "c_OH", vrijednost: 2.0e-5, zapis: "2,0·10⁻⁵" },
      indikatori: ["univerzalni"],
      kiselost: true,
    },
    {
      tip: "ph_skala",
      nacin: "indikator",
      tekst: "U tri epruvete s otopinom perklorne kiseline, c(HClO₄) = 2,0·10⁻⁴ mol/dm³, doda se metiloranž, fenolftalein i lakmus. Koje je boje svaka otopina?",
      otopina: { formula: "HClO₄", c: 2.0e-4, zapis: "2,0·10⁻⁴" },
      indikatori: ["metiloranz", "fenolftalein", "lakmus"],
    },
    {
      tip: "ph_skala",
      nacin: "poredaj",
      tekst: "Otopine imaju jednaku množinsku koncentraciju, 0,10 mol/dm³. Poredaj ih od najnižeg do najvišeg pH.",
      otopine: [{ formula: "NaCl", c: 0.1 }, { formula: "CH₃COOH", c: 0.1 }, { formula: "NaOH", c: 0.1 }, { formula: "HCl", c: 0.1 }, { formula: "NH₃", c: 0.1 }],
    },
    {
      tip: "ph_skala",
      nacin: "poredaj",
      tekst: "Bočice sadrže vodene otopine etanola, etanske kiseline i metilamina jednake koncentracije. Poredaj ih od najnižeg do najvišeg pH.",
      otopine: [{ formula: "CH₃NH₂", c: 0.1, naziv: "metilamin" }, { formula: "CH₃CH₂OH", c: 0.1, naziv: "etanol" }, { formula: "CH₃COOH", c: 0.1, naziv: "etanska kiselina" }],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `ph_skala.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "ph_skala treba „tekst“");
    const POLJA = polja(s);
    for (const f of Object.keys(s)) need(POLJA.includes(f), `ph_skala nema polje „${f}“ (dopuštena: ${POLJA.slice(1).join(", ")})`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.Kw != null) need(isNum(s.Kw) && s.Kw > 1e-16 && s.Kw < 1e-11, "Kw (mol² dm⁻⁶) mora biti broj reda 10⁻¹⁴ (između 10⁻¹⁶ i 10⁻¹¹)");
    if (s.t != null) need(isNum(s.t) && s.t >= 0 && s.t <= 100, "t je temperatura u °C (0–100)");
    if (isNum(s.t) && s.t !== 25) need(s.Kw != null || s.neutralna === true, `pri ${s.t} °C Kw nije 1,0·10⁻¹⁴: zadaj Kw (ili neutralna: true i zadani pH, pa se Kw traži)`);
    if (s.Kw != null && s.Kw !== KW_25) need(s.t != null, "uz Kw različit od 1,0·10⁻¹⁴ zadaj i temperaturu t (°C), da učenik zna zašto");
    if (s.tolerancija_pH != null) need(isNum(s.tolerancija_pH) && s.tolerancija_pH >= 0.005 && s.tolerancija_pH <= 0.1, "tolerancija_pH je između 0,005 i 0,1");
    if (s.tolerancija_posto != null) need(isNum(s.tolerancija_posto) && s.tolerancija_posto > 0 && s.tolerancija_posto <= 5, "tolerancija_posto je broj između 0 i 5");
    for (const b of ["kiselost", "neutralna", "operacije"]) if (s[b] != null) need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    const Kw = isNum(s.Kw) ? s.Kw : KW_25;
    const pKw = pKwOf(Kw);

    // zadano
    if (s.zadano != null) {
      const z = s.zadano;
      if (need(z && CETIRI.includes(z.velicina), `zadano.velicina mora biti jedna od: ${CETIRI.join(", ")}`)) {
        if (JE_P(z.velicina)) need(isNum(z.vrijednost) && z.vrijednost >= 0 && z.vrijednost <= pKw, `zadano ${z.velicina} mora biti broj od 0 do ${pKwTekst(Kw)} (školska skala)`);
        else need(isNum(z.vrijednost) && z.vrijednost > 0 && z.vrijednost <= 1 && z.vrijednost >= Kw, `zadano ${z.velicina} (mol/dm³) mora biti između ${formatSci(Kw)} i 1, da pH ostane na skali 0–${pKwTekst(Kw)}`);
        validateZapis(z.zapis, z.vrijednost, "zadano.zapis", need);
        for (const f of Object.keys(z)) need(["velicina", "vrijednost", "zapis"].includes(f), `zadano nema polje „${f}“`);
      }
    }

    if (s.nacin === "istrazi") {
      for (const f of ["otopina", "pufer", "trazi", "otopine", "kiselost", "neutralna", "smjer"]) need(!(f in s), `istrazi ne koristi „${f}“ (klizač mijenja pH; početna vrijednost ide u zadano)`);
      if (s.klizac != null) need(CETIRI.includes(s.klizac), `klizac je jedan od: ${CETIRI.join(", ")}`);
      if (s.indikatori != null) need(Array.isArray(s.indikatori) && s.indikatori.length && s.indikatori.every((x) => INDIKATORI_RED.includes(x)) && new Set(s.indikatori).size === s.indikatori.length, `indikatori je popis bez ponavljanja od: ${INDIKATORI_RED.join(", ")}`);
      return list;
    }
    need(s.klizac == null, "klizac je samo za istrazi");

    if (s.nacin === "poredaj") {
      for (const f of ["zadano", "otopina", "pufer", "trazi", "kiselost", "neutralna", "indikatori", "operacije"]) need(!(f in s), `poredaj ne koristi „${f}“`);
      if (s.smjer != null) need(["rastuci", "padajuci"].includes(s.smjer), 'smjer je "rastuci" (od najnižeg pH) ili "padajuci"');
      if (!need(Array.isArray(s.otopine) && s.otopine.length >= 3 && s.otopine.length <= 6, "poredaj treba otopine: 3–6 otopina [{formula, c}]")) return list;
      const ot = s.otopine.map((o, i) => validateOtopina(o, `otopine[${i}]`, need, s.nacin));
      if (list.length) return list;
      const d = poredajPodaci(s);
      need(d.every((x) => isNum(x.pH)), "pH neke otopine ne može se izračunati");
      const sort = [...d].sort((a, b) => a.pH - b.pH);
      for (let i = 1; i < sort.length; i++)
        need(sort[i].pH - sort[i - 1].pH >= 0.1, `${sort[i - 1].ot.formula} i ${sort[i].ot.formula} imaju (gotovo) isti pH (${zapisPH(sort[i - 1].pH)} i ${zapisPH(sort[i].pH)}): poredak nije jednoznačan`);
      // dvije slabe kiseline (baze) različitih tvari: učenik ih može usporediti samo uz zadane konstante
      for (let i = 0; i < ot.length; i++)
        for (let j = i + 1; j < ot.length; j++) {
          const a = ot[i];
          const b = ot[j];
          if (a && b && a.vrsta === b.vrsta && ["slaba_kiselina", "slaba_baza"].includes(a.vrsta) && kljuc(a.formula) !== kljuc(b.formula))
            need(a.Kzadan != null && b.Kzadan != null, `${a.formula} i ${b.formula} su obje ${a.vrsta === "slaba_kiselina" ? "slabe kiseline" : "slabe baze"}: zadaj obje ${a.Kime} (nisu na listu), inače učenik ne može znati koja je jača`);
        }
      return list;
    }

    // izracunaj, indikator: točno jedan izvor
    need(s.otopine == null && s.smjer == null, "otopine i smjer su samo za poredaj");
    const izvori = ["zadano", "otopina", "pufer"].filter((f) => s[f] != null);
    let ot = null;
    if (s.otopina != null) ot = validateOtopina(s.otopina, "otopina", need, s.nacin);
    const slaba = ot && (ot.vrsta === "slaba_kiselina" || ot.vrsta === "slaba_baza");
    const izmjereno = s.zadano != null && s.otopina != null;
    if (izmjereno) {
      need(izvori.length === 2 && slaba, "zadano i otopina zajedno idu samo za slabu kiselinu ili bazu s izmjerenim pH (pa se traže alfa i Ka/Kb)");
      if (ot) need(ot.Kzadan == null && ot.alfa == null, "uz izmjereni pH otopina ne smije imati Ka, Kb ni alfa (to se računa iz pH i c₀)");
      if (ot && isNum(ot.c) && s.zadano && CETIRI.includes(s.zadano.velicina)) {
        const st = stanje(s);
        const x = st[ot.vrsta === "slaba_kiselina" ? "c_H3O" : "c_OH"];
        need(x < ot.c, `iz zadanog ${s.zadano.velicina} ${ot.vrsta === "slaba_kiselina" ? "c(H₃O⁺)" : "c(OH⁻)"} = ${formatSci(x)} mol/dm³ veća je od c₀ = ${formatSci(ot.c)}: tolika ionizacija nije moguća`);
        need(st.pH >= 0 && st.pH <= st.pKw, "pH izvan skale");
        need(ot.vrsta === "slaba_kiselina" ? st.pH < st.pKw / 2 : st.pH > st.pKw / 2, `${ot.formula} je ${ot.vrsta === "slaba_kiselina" ? "kiselina, a zadani pH nije kiseo" : "baza, a zadani pH nije lužnat"}`);
      }
    } else need(izvori.length === 1, "zadaj točno jedan izvor: zadano (c_H3O, pH, pOH ili c_OH), otopina ili pufer");
    if (ot && !izmjereno && s.nacin === "izracunaj") {
      need(["jaka_kiselina", "jaka_luzina", "slaba_kiselina", "slaba_baza"].includes(ot.vrsta), `${ot.formula} je ${VRSTA_IME[ot.vrsta]}: u „izracunaj“ otopina je jaka ili slaba kiselina ili lužina (za soli koristi „indikator“ ili „poredaj“)`);
      if (slaba) need(ot.Kzadan != null || ot.alfa != null, `${ot.formula} je slaba ${ot.priroda === "baza" ? "baza: zadaj Kb" : "kiselina: zadaj Ka"} ili alfa (konstante nisu na listu mature, pa ih zadatak mora dati)`);
    }
    if (ot && !izmjereno && ["jaka_kiselina", "jaka_luzina"].includes(ot.vrsta) && isNum(ot.c)) {
      need(ot.n * ot.c >= 1e-6, `c(${ot.formula}) je premala: ispod 10⁻⁶ mol/dm³ ioni iz vode nisu zanemarivi i školska formula ne vrijedi`);
      need(ot.n * ot.c <= 1, `c(${ot.formula}) je prevelika: pH bi bio izvan skale 0–14`);
    }
    if (s.pufer != null) {
      const p = s.pufer;
      need(isNum(p?.Ka) && p.Ka > 0 && p.Ka < 1, "pufer.Ka mora biti pozitivan broj (mol/dm³)");
      if (p?.zapis_K != null) validateZapis(p.zapis_K, p.Ka, "pufer.zapis_K", need);
      for (const d of ["kiselina", "sol"]) {
        const x = p?.[d];
        if (!need(x && typeof x === "object", `pufer.${d} mora biti {formula, c, V?}`)) continue;
        need(isText(x.formula) && atomiOd(x.formula.replace(/[⁺⁻+−-]+$/, "")), `pufer.${d}.formula se ne da pročitati`);
        need(isNum(x.c) && x.c > 0, `pufer.${d}.c mora biti pozitivan broj`);
        validateZapis(x.zapis, x.c, `pufer.${d}.zapis`, need);
        if (x.V != null) need(isNum(x.V) && x.V > 0, `pufer.${d}.V (mL) mora biti pozitivan broj`);
        if (x.zapis_V != null) validateZapis(x.zapis_V, x.V, `pufer.${d}.zapis_V`, need);
        for (const f of Object.keys(x)) need(["formula", "c", "zapis", "V", "zapis_V"].includes(f), `pufer.${d} nema polje „${f}“`);
      }
      if (p?.kiselina && p?.sol) need((p.kiselina.V == null) === (p.sol.V == null), "pufer: zadaj volumen i kiseline i soli, ili nijedan");
      const t = p?.kiselina?.formula && tvar(p.kiselina.formula);
      if (t) need(t.vrsta === "slaba_kiselina", `pufer.kiselina mora biti slaba kiselina (${t.naziv} nije)`);
      const b = p?.sol?.formula && tvar(p.sol.formula);
      if (b) need(b.vrsta === "luzhnata_sol", `pufer.sol mora biti sol te slabe kiseline (npr. CH₃COONa uz CH₃COOH)`);
    }
    if (s.neutralna) {
      need(s.zadano && CETIRI.includes(s.zadano.velicina) && izvori.length === 1, "neutralna: true ide uz zadanu veličinu (npr. pH u točki ekvivalencije)");
      if (s.nacin === "izracunaj" && s.Kw == null) need(traziOf(s).includes("Kw"), "neutralna bez zadanog Kw: Kw se računa, pa ga dodaj u trazi");
    }
    if (list.length) return list;

    const st = stanje(s);
    need(isNum(st.pH) && st.pH >= -0.005 && st.pH <= st.pKw + 0.005, `pH otopine (${zapisPH(st.pH)}) je izvan skale 0–${pKwTekst(st.Kw)}`);

    if (s.nacin === "indikator") {
      for (const f of ["trazi", "operacije"]) need(!(f in s), `indikator ne koristi „${f}“`);
      need(Array.isArray(s.indikatori) && s.indikatori.length >= 1 && s.indikatori.every((x) => INDIKATORI_RED.includes(x)) && new Set(s.indikatori).size === s.indikatori.length, `indikatori: popis bez ponavljanja od: ${INDIKATORI_RED.join(", ")}`);
      return list;
    }

    // izracunaj
    need(s.indikatori == null, "indikatori su za istrazi i indikator");
    const trazi = traziOf(s);
    if (!need(trazi.length >= 1 && trazi.length <= 4, "trazi je popis 1–4 koraka, npr. [\"pOH\", \"pH\"]")) return list;
    trazi.forEach((q, i) => need(TRAZENE.includes(q), `trazi[${i}] mora biti jedan od: ${TRAZENE.join(", ")}`));
    need(new Set(trazi).size === trazi.length, "svaka veličina je u trazi samo jednom");
    if (s.zadano) need(!trazi.includes(s.zadano.velicina), `${s.zadano.velicina} je zadan, pa se ne može tražiti`);
    if (list.length) return list;
    if (trazi.includes("alfa") || trazi.includes("Ka") || trazi.includes("Kb")) need(izmjereno, "alfa, Ka i Kb traže se uz zadano (izmjereni pH ili koncentraciju) i otopinu slabe kiseline ili baze s c₀");
    if (izmjereno && ot) {
      if (trazi.includes("Ka")) need(ot.vrsta === "slaba_kiselina", `${ot.formula} je baza: traži Kb, a ne Ka`);
      if (trazi.includes("Kb")) need(ot.vrsta === "slaba_baza", `${ot.formula} je kiselina: traži Ka, a ne Kb`);
    }
    if (trazi.includes("Kw")) need(s.neutralna === true && s.Kw == null, "Kw se traži samo uz neutralna: true i bez zadanog Kw");
    if (list.length) return list;
    const { koraci } = lanac(s);
    koraci.forEach((k, i) => {
      if (need(k.pravilo, `trazi[${i}] (${k.velicina}) ne može se izračunati iz onoga što je poznato prije njega`)) need(isNum(k.vrijednost), `trazi[${i}] (${k.velicina}) ne daje broj`);
    });
    return list;
  },

  // izracunaj: {koraci: [upis…], kiselost?} ili popis upisa; indikator: {boje: {indikator: id}, kiselost?}; poredaj: [indeksi]
  check(s, odgovor) {
    if (s.nacin === "poredaj") {
      const tocan = tocanPoredak(s);
      const red = Array.isArray(odgovor) ? odgovor : null;
      if (!red || red.length !== tocan.length) return { tocno: false, poruka: "Poredaj sve otopine.", prazno: true };
      const p = red.findIndex((x, i) => x !== tocan[i]);
      if (p < 0) return { tocno: true };
      const d = poredajPodaci(s);
      const a = d[red[p]];
      const b = d[tocan[p]];
      return { tocno: false, poruka: porukaPara(a, b, s), krivo: [red[p], tocan[p]] };
    }
    const st = stanje(s);
    const kis = (o) => {
      if (!s.kiselost) return null;
      const v = o?.kiselost;
      if (!KISELOST.includes(v)) return { tocno: false, poruka: "Odaberi je li otopina kisela, neutralna ili lužnata.", prazno: true, kiselostKrivo: true };
      if (v === st.kiselost) return null;
      const nije25 = Math.abs(st.Kw - KW_25) > 1e-18;
      if (nije25 && st.kiselost === "neutralna")
        return { tocno: false, kiselostKrivo: true, poruka: `Pri ${isNum(s.t) ? `${formatNumber(s.t)} °C` : "ovoj temperaturi"} neutralna otopina nema pH 7: neutralna je kad je c(H₃O⁺) = c(OH⁻). pH = 7 je granica samo pri 25 °C.` };
      return { tocno: false, kiselostKrivo: true, poruka: nije25 ? "Usporedi c(H₃O⁺) i c(OH⁻): kisela je otopina u kojoj je c(H₃O⁺) veća." : "Pri 25 °C: ispod pH 7 otopina je kisela, pH 7 je neutralno, a iznad 7 lužnato." };
    };
    if (s.nacin === "indikator") {
      const boje = odgovor?.boje ?? {};
      const krivi = [];
      let poruka = null;
      for (const ind of s.indikatori) {
        const v = boje[ind];
        if (!v) return { tocno: false, poruka: `Odaberi boju: ${INDIKATORI[ind].naziv}.`, prazno: true };
        if (bojeZa(ind, st.pH).includes(v)) continue;
        krivi.push(ind);
        if (poruka) continue;
        const I = INDIKATORI[ind];
        const b = bojaPoId(ind, v);
        if (ind === "univerzalni") {
          const kraj = b && b.od < 6.5 ? "kiselo" : b && b.do > 7.5 ? "lužnato" : "neutralno";
          poruka = `Univerzalni indikator je ${b?.naziv ?? "te boje"} u području pH ${formatNumber(b?.od)}–${formatNumber(b?.do)} (${kraj}). Izračunaj pH otopine i pogledaj gdje je na skali: od crvene (jako kiselo) preko zelene (neutralno) do ljubičaste (jako lužnato).`;
        } else {
          const [a, c] = I.prijelaz;
          const [k, , l] = I.boje;
          poruka = `${I.naziv[0].toUpperCase()}${I.naziv.slice(1)} mijenja boju između pH ${formatNumber(a)} i ${formatNumber(c)}: ispod je ${k.naziv}, iznad ${l.naziv}, a između prijelazne boje. Koliki je pH ove otopine?`;
        }
      }
      if (krivi.length) return { tocno: false, poruka, indikatoriKrivo: krivi };
      return kis(odgovor) ?? { tocno: true };
    }
    if (s.nacin !== "izracunaj") return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    const unosi = Array.isArray(odgovor) ? odgovor : [].concat(odgovor?.koraci ?? []);
    const pct = pctOf(s);
    const tP = tolPH(s);
    const { k, red } = pocetno(s);
    const { koraci } = lanac(s);
    for (let i = 0; i < koraci.length; i++) {
      const kor = koraci[i];
      const q = kor.velicina;
      const p = q === "Kw" ? praviloKw(k, red, st) : pravilo(q, k, red, s, st);
      const izUcenika = p.f(k);
      const prihvaceno = [kor.vrijednost, izUcenika, p.alt?.(k)].filter(isNum);
      const tol = (v) => (JE_P(q) ? tP : Math.abs(v) * pct);
      const blizu = (n) => prihvaceno.some((v) => near(n, v, tol(v)));
      const krivo = (q === "Kw" ? greskeKw(k, p, st) : greske(q, p, k, s, st))
        .filter((g) => !prihvaceno.some((v) => near(g.v, v, tol(v))))
        .map((g) => ({ vrijednost: g.v, poruka: g.poruka, tolerancija: tol(g.v) }));
      const ulaz = ocisti(q, unosi[i]);
      const broj = typeof ulaz === "number" ? ulaz : parseNumber(ulaz);
      let r;
      if (isNum(broj) && blizu(broj)) r = { tocno: true };
      else if (q === "alfa" && isNum(broj) && broj > 1 && prihvaceno.some((v) => near(broj, v * 100, v * 100 * pct)))
        r = { tocno: false, poruka: `Ako je to postotak, dopiši znak %: α = ${formatNumber(Number((broj).toPrecision(3)))} % = ${formatNumber(Number((broj / 100).toPrecision(3)))}.` };
      else
        r = checkNumber({
          input: broj ?? ulaz,
          answer: kor.vrijednost,
          tol: tol(kor.vrijednost),
          unit: "",
          krivo,
          savjet: s.savjet || `Pogledaj formulu: ${p.formula}.`,
        });
      if (!r.tocno) return koraci.length > 1 ? { ...r, praznina: i, poruka: `${OZ[q]}: ${r.poruka}` } : { ...r, praznina: 0 };
      k[q] = broj;
      red.push(q);
    }
    return kis(odgovor) ?? { tocno: true };
  },

  brojcaniOdgovor(s) {
    if (s.nacin !== "izracunaj") return null;
    const kor = lanac(s).koraci.at(-1);
    if (!kor || !isNum(kor.vrijednost)) return null;
    return JE_P(kor.velicina) ? Math.round(kor.vrijednost * 100) / 100 : Number(kor.vrijednost.toPrecision(3));
  },

  tocanOdgovor(s) {
    if (s.nacin === "poredaj") {
      const d = poredajPodaci(s);
      return tocanPoredak(s)
        .map((i) => `${d[i].ot.formula} (pH ${zapisPH(d[i].pH)})`)
        .join(s.smjer === "padajuci" ? " > " : " < ");
    }
    const st = stanje(s);
    const kis = s.kiselost ? `; otopina je ${KISELOST_NAZIV[st.kiselost]}` : "";
    if (s.nacin === "indikator") {
      const boje = (s.indikatori ?? []).map((ind) => {
        const [g, ...ost] = bojeZa(ind, st.pH);
        const nazivi = [g, ...ost].map((id) => bojaPoId(ind, id).naziv);
        return `${INDIKATORI[ind].naziv}: ${nazivi.join(" ili ")}`;
      });
      return `pH = ${zapisPH(st.pH)}: ${boje.join(", ")}${kis}`;
    }
    if (s.nacin !== "izracunaj") return "";
    const z = s.zadano ? [`${OZ[s.zadano.velicina]} = ${s.zadano.zapis ?? zapisVelicine(s.zadano.velicina, s.zadano.vrijednost)}${JE_P(s.zadano.velicina) ? "" : s.zadano.zapis ? " mol/dm³" : ""}`] : [];
    const kor = lanac(s).koraci.map((k) => `${OZ[k.velicina]} = ${zapisVelicine(k.velicina, k.vrijednost)}`);
    return [...z, ...kor].join(" → ") + kis;
  },
};
