// redoks: oksidacijski brojevi i redoks-jednadžbe. Učenik dodjeljuje oksidacijske brojeve atomima u formuli ili u
// svim tvarima reakcije, bira što se oksidira i reducira te oksidacijsko i redukcijsko sredstvo, i izjednačuje
// polureakcije (s e⁻ i H⁺/H₂O ili OH⁻/H₂O) pa ukupnu jednadžbu.
//
// Sve računa kod iz formula:
// - oksidacijski brojevi anorganskih formula po školskim pravilima (element 0; jednoatomni ion = naboj; F −1;
//   alkalijski +1, zemnoalkalijski +2; H +1, uz metal ili manje elektronegativan element (SiH₄, B₂H₆) −1; O −2, u
//   peroksidu −1, s fluorom +2; zbroj = naboj),
//   a kad ostanu dvije nepoznanice, preko poznatog višeatomnog iona (CuSO₄ = Cu²⁺ + SO₄²⁻) ili u binarnom spoju
//   (elektronegativniji element ima negativan broj kao u svom ionu; disulfid FeS₂: S₂²⁻). Što pravila ne daju
//   jednoznačno (Fe₃O₄, prosjek 8/3; CaOCl₂, prosjek Cl 0; metal s neuobičajenim brojem), validate odbija;
// - oksalat (H₂C₂O₄, Na₂C₂O₄, C₂O₄²⁻) po istim pravilima: oba C-atoma su jednaka, svaki +3;
// - formule s više C-atoma po strukturi: sažeta strukturna formula („CH₃CH₂CHO“) čita se istim kodom kao widget
//   molekula (skupina), a svaki atom dobiva broj po vezama (elektronegativniji atom uzima elektrone veze);
// - polureakcije i ukupna jednadžba izjednačuju se logikom widgeta jednadzba (izjednaci, provjeriKoef), a H⁺/H₂O ili
//   OH⁻/H₂O kod dodaje sam na stranu na kojoj jednadžba izlazi s pozitivnim koeficijentima.
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";
import { atomiOd, element } from "./_tablice.js";
import { jednadzba, cestica, tvari, izjednaci, provjeriKoef, zapisJednadzbe, stanjaOd, genitiv } from "./jednadzba.js";
import { skupina } from "./molekula.js";

const NACINI = ["istrazi", "oks_broj", "uloge", "polureakcije"];
export const PITANJA = ["oksidira", "reducira", "oksidacijsko", "redukcijsko"];
export const DIJELOVI = ["oksidacija", "redukcija", "ukupno"];
const SREDINE = ["kisela", "luznata"];
const POLJA = [
  "tip", "nacin", "tekst", "formula", "formule", "reaktanti", "produkti", "strelica", "iznad", "koeficijenti", "stanja",
  "sredina", "oksidacija", "redukcija", "trazi", "pitaj", "dijelovi", "prikazi_oks", "krivo",
];
const NAJVISE_FORMULA = 6; // formule za prebacivanje u istraživanju

// ── zapis ──
export const zapisOks = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");
const uZagradi = (v) => (v < 0 ? `(${zapisOks(v)})` : zapisOks(v));
const velikoSlovo = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const naziv = (el) => element(el)?.naziv ?? el;
const nabrajanje = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const elektrona = (n) => `${n} e⁻`;

// ── formula u dijelove ──
// Tokeni za prikaz broja iznad simbola: {t: "el", el, n, tekst: "Cr₂"} za element s indeksom, ostalo kao tekst
// (zagrade „(“ i „)₂“, točka hidrata „·5“, naboj „²⁻“). eff je broj atoma tog tokena u formulskoj jedinki (zagrade i
// voda hidrata uračunati), dio je redni broj dijela hidrata.
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻";
export function tokeni(formula) {
  const s = [...String(formula ?? "").trim()];
  const out = [];
  let i = 0;
  const indeks = () => {
    let d = "";
    while (i < s.length && SUB.includes(s[i])) d += SUB.indexOf(s[i++]);
    return d;
  };
  let dio = 0;
  while (i < s.length) {
    const ch = s[i];
    const od = i;
    if (/[A-Z]/.test(ch)) {
      let el = ch;
      i++;
      if (i < s.length && /[a-z]/.test(s[i])) el += s[i++];
      const d = indeks();
      out.push({ t: "el", el, n: d ? Number(d) : 1, tekst: s.slice(od, i).join(""), dio });
    } else if (ch === "(" || ch === "[") {
      out.push({ t: "otvori", tekst: ch, dio });
      i++;
    } else if (ch === ")" || ch === "]") {
      i++;
      const d = indeks();
      out.push({ t: "zatvori", n: d ? Number(d) : 1, tekst: s.slice(od, i).join(""), dio });
    } else if (ch === "·" || ch === "." || ch === "*") {
      i++;
      let d = "";
      while (i < s.length && /\d/.test(s[i])) d += s[i++];
      dio++;
      out.push({ t: "tocka", n: d ? Number(d) : 1, tekst: `·${d}`, dio });
    } else if (SUP.includes(ch)) {
      while (i < s.length && SUP.includes(s[i])) i++;
      out.push({ t: "naboj", tekst: s.slice(od, i).join(""), dio });
    } else {
      out.push({ t: "tekst", tekst: ch, dio });
      i++;
    }
  }
  // broj atoma: indeks × zagrade (bez koeficijenta vode hidrata: on se ne tiče oksidacijskog broja)
  const stog = [];
  out.forEach((t, k) => {
    if (t.t === "el") t.eff = t.n;
    if (t.t === "otvori") stog.push(k);
    if (t.t === "zatvori" && stog.length) {
      const o = stog.pop();
      for (let j = o + 1; j < k; j++) if (out[j].t === "el") out[j].eff *= t.n;
      t.par = o;
      out[o].par = k;
    }
  });
  return out;
}

// ── pravila za anorganske formule ──
const ALKALIJSKI = new Set(["Li", "Na", "K", "Rb", "Cs", "Fr"]);
const ZEMNOALKALIJSKI = new Set(["Be", "Mg", "Ca", "Sr", "Ba", "Ra"]);
const jeMetal = (el) => element(el)?.vrsta === "metal";
// Element jasno manje elektronegativan od vodika (Si 1,90, B 2,04 prema H 2,20): vodik uz njega ima −1 (SiH₄, B₂H₆,
// NaBH₄). P (2,19) i As (2,18) su praktički jednaki vodiku, pa u PH₃ i AsH₃ vodik ostaje +1, kao u školi.
const manjeEnOdH = (el) => (element(el)?.en ?? 9) < (element("H")?.en ?? 2.2) - 0.1;
// Oksidacijski brojevi koje prijelazni i p-metali imaju u školskim spojevima. Broj izvan popisa (Fe +4 u FeS₂ po pravilu
// za binarni spoj) znači da pravila ovdje ne vrijede, pa validate formulu odbija umjesto da da krivi broj.
const OKS_METALA = {
  Al: [3], Ti: [2, 3, 4], V: [2, 3, 4, 5], Cr: [2, 3, 6], Mn: [2, 3, 4, 6, 7], Fe: [2, 3, 6], Co: [2, 3], Ni: [2, 3],
  Cu: [1, 2], Zn: [2], Ag: [1], Cd: [2], Sn: [2, 4], Pb: [2, 4], Hg: [1, 2], Au: [1, 3],
};
const obicanZaMetal = (el, v) => !OKS_METALA[el] || v === 0 || OKS_METALA[el].includes(v);
// Binarni spoj metala i sumpora s dva S po atomu metala, u kojem bi metal sa S −2 imao neobičan broj: disulfid s ionom
// S₂²⁻ (pirit FeS₂: Fe +2, S −1).
const DISULFIDNI_METALI = new Set(["Fe", "Co", "Ni", "Mn", "Cu", "Zn"]);

// Najmanji i najveći oksidacijski broj koji element može imati (za provjeru da pravila nisu dala besmislicu).
function raspon(el) {
  const e = element(el);
  if (!e) return [-8, 8];
  if (el === "H") return [-1, 1];
  if (el === "F") return [-1, 0];
  if (el === "O") return [-2, 2];
  const g = e.skupina;
  if (e.vrsta === "metal") return [0, g == null ? 8 : g <= 2 ? g : g >= 13 ? g - 10 : Math.min(g, 8)];
  if (g == null) return [-4, 8];
  if (g === 13) return [-3, 3];
  if (g >= 13) return [g - 18, g - 10];
  return [0, g];
}

// Poznati višeatomni ioni: kad formula ima dvije nepoznanice (CuSO₄, AgNO₃, Fe₂(SO₄)₃, NH₄NO₃), ion u njoj daje
// naboj ostatku. Redom od dužih, da ClO₄ ne pročita kao ClO.
const IONI = [
  ["Cr₂O₇", -2, "dikromatni"], ["H₂PO₄", -1, "dihidrogenfosfatni"], ["HPO₄", -2, "hidrogenfosfatni"], ["HSO₄", -1, "hidrogensulfatni"],
  ["HCO₃", -1, "hidrogenkarbonatni"], ["S₂O₃", -2, "tiosulfatni"], ["C₂O₄", -2, "oksalatni"], ["MnO₄", -1, "permanganatni"],
  ["CrO₄", -2, "kromatni"], ["ClO₄", -1, "perkloratni"], ["ClO₃", -1, "kloratni"], ["ClO₂", -1, "kloritni"], ["ClO", -1, "hipokloritni"],
  ["BrO₃", -1, "bromatni"], ["IO₃", -1, "jodatni"], ["SO₄", -2, "sulfatni"], ["SO₃", -2, "sulfitni"], ["NO₃", -1, "nitratni"],
  ["NO₂", -1, "nitritni"], ["CO₃", -2, "karbonatni"], ["PO₄", -3, "fosfatni"], ["SiO₃", -2, "silikatni"], ["NH₄", 1, "amonijev"],
  ["OH", -1, "hidroksidni"], ["CN", -1, "cijanidni"],
].map(([stem, z, ime]) => ({ stem, z, ime, lok: ime.endsWith("i") ? `${ime.slice(0, -1)}om` : `${ime}u`, t: tokeni(stem).filter((x) => x.t === "el") }));
const zapisIona = (stem, z) => `${stem}${z === 1 ? "⁺" : z === -1 ? "⁻" : `${"⁰¹²³⁴⁵⁶⁷⁸⁹"[Math.abs(z)]}${z > 0 ? "⁺" : "⁻"}`}`;

// Član zbroja za opis računa: „2·(+1)“, „2x“, „x“.
const clan = (n, v) => (v == null ? (n === 1 ? "x" : `${n}x`) : n === 1 ? uZagradi(v) : `${n}·(${zapisOks(v)})`);

// Jedna jedinka (dio formule ili ion): tokeni k (indeksi u T), naboj Q. Vraća {ox: {el: v}, pravilo: {el: {vrsta,
// tekst}}, poTokenu?: {k: {v, vrsta, tekst}}} ili {greska}. dubina > 0: već unutar rastavljanja na ione.
function rijesiJedinku(T, ks, Q, opis, dubina = 0, dijeli = 1) {
  const n = {};
  const pozicije = {};
  for (const k of ks) {
    const t = T[k];
    n[t.el] = (n[t.el] ?? 0) + t.eff / dijeli; // ion u zagradi „(NO₃)₂“: atomi jednog iona
    (pozicije[t.el] ??= []).push(k);
  }
  const els = Object.keys(n);
  const ox = {};
  const pravilo = {};
  const postavi = (el, v, vrsta, tekst) => {
    ox[el] = v;
    pravilo[el] = { vrsta, tekst };
  };
  if (els.length === 1) {
    const [el] = els;
    const v = Q / n[el];
    if (!Number.isInteger(v)) return { greska: `u ${opis} naboj ${zapisOks(Q)} ne dijeli se na ${n[el]} atoma cijelim brojem` };
    if (Q === 0) postavi(el, 0, "element", `${opis} je elementarna tvar: atomi u elementarnoj tvari imaju oksidacijski broj 0.`);
    else if (n[el] === 1) postavi(el, v, "ion1", `${opis} je jednoatomni ion: oksidacijski broj jednak je naboju iona, ${zapisOks(v)}.`);
    else postavi(el, v, "ionisti", `${opis} je ion od ${n[el]} jednaka atoma: naboj ${zapisOks(Q)} dijeli se na ${n[el]} atoma, svaki ${zapisOks(v)}.`);
    return { ox, pravilo };
  }
  // stalna pravila
  for (const el of els) {
    if (el === "F") postavi(el, -1, "F", "Fluor je najelektronegativniji element: u spojevima uvijek ima −1.");
    else if (ALKALIJSKI.has(el)) postavi(el, 1, "alk", `${velikoSlovo(naziv(el))} je alkalijski metal (1. skupina): u spojevima uvijek ima +1.`);
    else if (ZEMNOALKALIJSKI.has(el)) postavi(el, 2, "zemalk", `${velikoSlovo(naziv(el))} je zemnoalkalijski metal (2. skupina): u spojevima uvijek ima +2.`);
  }
  if (n.H != null) {
    const ostali = els.filter((e) => e !== "H");
    if (ostali.every(jeMetal)) postavi("H", -1, "hidrid", `Vodik vezan samo na metal (hidrid metala) ima −1: metal je manje elektronegativan od vodika.`);
    else if (ostali.every(manjeEnOdH)) postavi("H", -1, "hidrid", `Vodik je ovdje vezan na ${nabrajanje(ostali.map(naziv))}, ${ostali.length > 1 ? "koji su manje elektronegativni" : "koji je manje elektronegativan"} od vodika, pa vodik ima −1 (kao u hidridu).`);
    else postavi("H", 1, "H", "Vodik vezan na nemetal ima +1.");
  }
  const zbrojPoznatih = () => Object.entries(ox).reduce((a, [el, v]) => a + n[el] * v, 0);
  const nepoznati = () => els.filter((e) => !(e in ox));
  const racun = (el, v) => {
    const lijevo = els.map((e) => clan(n[e], e === el ? null : ox[e])).join(" + ");
    const zbroj = Q === 0 ? `Zbroj oksidacijskih brojeva u ${opis} je 0 (neutralna tvar)` : `Zbroj oksidacijskih brojeva u ${opis} jednak je naboju iona, ${zapisOks(Q)}`;
    return `${zbroj}: ${lijevo} = ${zapisOks(Q)}, pa je x = ${zapisOks(v)}.`;
  };
  // kisik: −2, osim kad je jedina nepoznanica (peroksid −1, s fluorom +2)
  if (n.O != null && !("O" in ox)) {
    if (nepoznati().length > 1) postavi("O", -2, "O", "Kisik u spojevima ima −2 (osim u peroksidima i u spoju s fluorom).");
    else {
      const v = (Q - zbrojPoznatih()) / n.O;
      if (!Number.isInteger(v)) return { greska: `u ${opis} kisik bi imao ${Q - zbrojPoznatih()}/${n.O} (superoksid): to pravila ne daju cijelim brojem` };
      if (v === -2) postavi("O", -2, "O", "Kisik u spojevima ima −2 (osim u peroksidima i u spoju s fluorom).");
      else if (v === -1) postavi("O", -1, "peroksid", `${velikoSlovo(opis)} je peroksid (veza O–O): kisik ovdje ima −1, a ne −2. ${racun("O", v)}`);
      else if (n.F != null && v > 0) postavi("O", v, "OF", `Kisik je ovdje vezan na fluor, koji je elektronegativniji od njega, pa ima ${zapisOks(v)}. ${racun("O", v)}`);
      else return { greska: `u ${opis} kisik bi imao ${zapisOks(v)}: pravila ne daju smislen rezultat` };
    }
  }
  let U = nepoznati();
  // dvije nepoznanice: poznati višeatomni ion u formuli
  if (U.length >= 2 || (U.length === 1 && pozicije[U[0]].length > 1)) {
    if (dubina === 0) {
      const r = rastaviNaIone(T, ks, Q, opis);
      if (r) return r;
    }
    if (U.length === 1) return { greska: `u ${opis} ${naziv(U[0])} je na dva mjesta u formuli i može imati dva različita oksidacijska broja; pravila daju samo prosjek` };
  }
  if (U.length >= 2 && els.length === 2) {
    // binarni spoj: elektronegativniji ima negativan broj kao u svom ionu
    const [a, b] = U;
    const en = (e) => element(e)?.en ?? 0;
    const neg = en(a) >= en(b) ? a : b;
    const pos = neg === a ? b : a;
    const g = element(neg)?.skupina;
    if (g >= 15 && g <= 17) {
      const v = g - 18;
      const vPos = (Q - n[neg] * v) / n[pos];
      if (neg === "S" && Q === 0 && n.S === 2 * n[pos] && DISULFIDNI_METALI.has(pos) && !obicanZaMetal(pos, vPos)) {
        postavi("S", -1, "disulfid", `${velikoSlovo(opis)} je disulfid (kao pirit FeS₂): sumpor je u ionu S₂²⁻ (veza S–S), pa naboj −2 dijele dva atoma sumpora, svaki −1.`);
      } else {
        const ion = zapisIona(neg, v);
        postavi(neg, v, "binarni", `U ${opis} je ${naziv(neg)} elektronegativniji element, pa ima negativan oksidacijski broj kao u ionu ${ion}: ${zapisOks(v)}.`);
      }
      U = nepoznati();
    }
  }
  if (U.length >= 2) return { greska: `pravila ne daju oksidacijske brojeve u ${opis} jednoznačno (nepoznati su ${nabrajanje(U.map(naziv))})` };
  if (U.length === 1) {
    const [el] = U;
    const v = (Q - zbrojPoznatih()) / n[el];
    if (!Number.isInteger(v)) return { greska: `u ${opis} ${naziv(el)} bi imao prosjek ${Q - zbrojPoznatih()}/${n[el]}: pravila ne daju cijeli broj (atomi imaju različite oksidacijske brojeve)` };
    // više atoma istog elementa s prosjekom 0 u spoju (CaOCl₂: jedan Cl +1, drugi −1): prosjek nije oksidacijski broj atoma
    if (v === 0 && n[el] > 1) return { greska: `u ${opis} ${naziv(el)} bi imao prosjek 0: atomi imaju različite oksidacijske brojeve (npr. +1 i −1), a pravila daju samo prosjek` };
    postavi(el, v, "racun", racun(el, v));
  }
  for (const el of els) {
    const [min, max] = raspon(el);
    if (ox[el] < min || ox[el] > max) return { greska: `u ${opis} ${naziv(el)} bi imao ${zapisOks(ox[el])}, a to ne može: pravila ovdje ne daju smislen rezultat (provjeri formulu i naboj)` };
    if (!obicanZaMetal(el, ox[el])) return { greska: `u ${opis} ${naziv(el)} bi imao ${zapisOks(ox[el])}, a taj oksidacijski broj ${genitiv(naziv(el))} nije uobičajen: pravila ovdje ne daju pouzdan rezultat` };
  }
  if (zbrojPoznatih() !== Q) return { greska: `u ${opis} zbroj oksidacijskih brojeva (${zapisOks(zbrojPoznatih())}) nije jednak naboju (${zapisOks(Q)}): provjeri formulu` };
  return { ox, pravilo };
}

// Ion u formuli: uzastopni tokeni jednaki tokenima iona (isti elementi i indeksi), po želji u zagradi s indeksom.
function rastaviNaIone(T, ks, Q, opis) {
  const slobodno = new Set(ks);
  const nadeni = [];
  for (const ion of IONI) {
    for (let p = 0; p < ks.length; p++) {
      const dio = ks.slice(p, p + ion.t.length);
      if (dio.length < ion.t.length || dio.some((k) => !slobodno.has(k))) continue;
      if (!dio.every((k, j) => T[k].el === ion.t[j].el && T[k].n === ion.t[j].n)) continue;
      // tokeni moraju biti zaredom (bez zagrade između), a ion ne smije biti dio većeg indeksa
      if (dio.some((k, j) => j && k !== dio[j - 1] + 1)) continue;
      const prije = T[dio[0] - 1];
      const iza = T[dio[dio.length - 1] + 1];
      let puta = 1;
      if (prije?.t === "otvori" && iza?.t === "zatvori" && iza.par === dio[0] - 1) puta = iza.n;
      else if (prije?.t === "otvori" || iza?.t === "zatvori") continue;
      nadeni.push({ ion, ks: dio, puta });
      dio.forEach((k) => slobodno.delete(k));
    }
  }
  if (!nadeni.length) return null;
  const ostatak = ks.filter((k) => slobodno.has(k));
  const nabojIona = nadeni.reduce((a, x) => a + x.ion.z * x.puta, 0);
  const poTokenu = {};
  for (const x of nadeni) {
    const zap = zapisIona(x.ion.stem, x.ion.z);
    const r = rijesiJedinku(T, x.ks, x.ion.z, `${x.ion.lok} ionu ${zap}`, 1, x.puta);
    if (r.greska) return null;
    for (const k of x.ks) poTokenu[k] = { v: r.ox[T[k].el], ...r.pravilo[T[k].el], jedinka: { ks: x.ks, Q: x.ion.z, opis: `${x.ion.lok} ionu ${zap}`, dijeli: x.puta } };
  }
  if (ostatak.length) {
    const Qo = Q - nabojIona;
    const ioni = nabrajanje([...new Set(nadeni.map((x) => `${x.ion.ime} ion ${zapisIona(x.ion.stem, x.ion.z)}`))]);
    const elOst = [...new Set(ostatak.map((k) => T[k].el))];
    if (elOst.length === 1) {
      // jedan element uz ion (CuSO₄, Fe₂(SO₄)₃): nosi ostatak naboja
      const [el] = elOst;
      const n = ostatak.reduce((a, k) => a + T[k].eff, 0);
      const v = Qo / n;
      const [min, max] = raspon(el);
      if (!Number.isInteger(v) || v < min || v > max || !obicanZaMetal(el, v)) return null;
      const tekst = `${velikoSlovo(opis)} sadrži ${ioni}; ${nadeni.length === 1 && nadeni[0].puta === 1 ? "on nosi" : "oni nose"} ukupno ${zapisOks(nabojIona)}, pa ${n > 1 ? `${n} atoma ${genitiv(naziv(el))} nose ${zapisOks(Qo)}, svaki` : naziv(el)} ${zapisOks(v)} (zbroj ${Q === 0 ? "u neutralnoj tvari je 0" : `je ${zapisOks(Q)}`}).`;
      for (const k of ostatak) poTokenu[k] = { v, vrsta: "ionski", tekst, jedinka: { ks, Q, opis } };
    } else {
      const r = rijesiJedinku(T, ostatak, Qo, opis, 1);
      if (r.greska) return null;
      for (const k of ostatak) poTokenu[k] = { v: r.ox[T[k].el], ...r.pravilo[T[k].el], jedinka: { ks, Q, opis } };
    }
  } else if (nabojIona !== Q) return null;
  return { poTokenu };
}

// ── po strukturi (više C-atoma) ──
// Redoslijed teških atoma (bez H) kako ih stvara sažeta formula u widgetu molekula: ogranak u zagradi ispred prvog
// atoma („(CH₃)₂CH…“) dolazi iza njega, a „(CH₃)₂“ daje dva ogranka.
function redoslijedTeskih(T, od, do_) {
  const out = [];
  const ceka = [];
  for (let i = od; i < do_; i++) {
    const t = T[i];
    if (t.t === "otvori") {
      const j = t.par;
      if (j == null) return null;
      const unutra = redoslijedTeskih(T, i + 1, j);
      if (!unutra) return null;
      const grupe = Array.from({ length: T[j].n }, () => unutra);
      if (!out.length) ceka.push(...grupe);
      else for (const g of grupe) out.push(...g);
      i = j;
    } else if (t.t === "el" && t.el !== "H") {
      out.push(i);
      if (ceka.length) for (const g of ceka.splice(0)) out.push(...g);
    }
  }
  return ceka.length ? null : out;
}

const enEl = (el) => element(el)?.en ?? 2.55;
function poStrukturi(formula, T) {
  const greska = { greska: `formula „${formula}“ ima više C-atoma: oksidacijski broj svakog C-atoma ovisi o vezama, pa je piši kao sažetu strukturnu formulu (npr. CH₃CH₂OH, CH₃COOH, CH₃CH₂CHO)` };
  if (T.some((t) => t.t === "tocka")) return greska;
  const g = skupina(formula);
  if (!g || g.ostatak || !g.c?.length) return greska;
  const red = redoslijedTeskih(T, 0, T.length);
  if (!red || red.length !== g.c.length) return greska;
  // provjera sastava
  const sastav = {};
  for (const [el, h] of g.c) {
    sastav[el] = (sastav[el] ?? 0) + 1;
    if (h) sastav.H = (sastav.H ?? 0) + h;
  }
  const f = atomiOd(formula);
  if (!f || Object.keys({ ...f, ...sastav }).some((e) => (f[e] ?? 0) !== (sastav[e] ?? 0))) return greska;
  const susjedi = g.c.map(() => []);
  for (const [a, b, o] of g.v) {
    susjedi[a].push({ j: b, o });
    susjedi[b].push({ j: a, o });
  }
  const ox = g.c.map(([el, h, q], i) => {
    let v = q;
    for (const { j, o } of susjedi[i]) {
      const d = enEl(g.c[j][0]) - enEl(el);
      if (d > 0) v += o;
      else if (d < 0) v -= o;
    }
    v += h * (enEl("H") < enEl(el) ? -1 : 1);
    return v;
  });
  // valencija C, O, H (inače sažeta formula nije molekula)
  for (let i = 0; i < g.c.length; i++) {
    const [el, h, q] = g.c[i];
    const veze = h + susjedi[i].reduce((a, x) => a + x.o, 0);
    const treba = { C: 4, O: 2 + q, N: 3 + q, H: 1, F: 1, Cl: 1, Br: 1, I: 1 }[el];
    if (treba != null && el === "C" ? veze !== 4 - Math.abs(q) : treba != null && veze !== treba) return greska;
  }
  const poTokenu = {};
  const ime = (i) => {
    const [el, h] = g.c[i];
    return `${el}${h ? `H${h > 1 ? SUB[h] : ""}` : ""}`;
  };
  const opisVeza = (i) => {
    const [el, h] = g.c[i];
    const dijelovi = [];
    if (h) dijelovi.push(`${h} ${h === 1 ? "veza" : "veze"} s H (${enEl("H") < enEl(el) ? "−1" : "+1"} za svaku)`);
    const po = {};
    for (const { j, o } of susjedi[i]) {
      const k = `${g.c[j][0]}|${o}`;
      po[k] = (po[k] ?? 0) + 1;
    }
    for (const [k, broj] of Object.entries(po)) {
      const [e2, o] = k.split("|");
      const d = enEl(e2) - enEl(el);
      const vrsta = Number(o) === 2 ? "dvostruka veza" : Number(o) === 3 ? "trostruka veza" : broj === 1 ? "veza" : "veze";
      dijelovi.push(`${broj > 1 ? `${broj} ` : ""}${vrsta} s ${e2} (${d > 0 ? `+${o}` : d < 0 ? `−${o}` : "0"}${broj > 1 ? " za svaku" : ""})`);
    }
    return dijelovi.join(", ");
  };
  red.forEach((k, i) => {
    const [el, , q] = g.c[i];
    const v = ox[i];
    const nab = q ? ` i naboj ${zapisOks(q)} na atomu` : "";
    poTokenu[k] = {
      v,
      vrsta: el === "C" ? "struktura_c" : "struktura",
      tekst: `${el === "C" ? `Ovaj C-atom (${ime(i)})` : `Atom ${el}`} ima: ${opisVeza(i)}${nab}. Elektroni svake veze pripadaju elektronegativnijem atomu, pa je oksidacijski broj ${zapisOks(v)}.`,
      cvor: i,
    };
  });
  // vodici: pripadaju teškom atomu ispred sebe (ili prvom, ako je formula počinje s H)
  let zadnji = null;
  T.forEach((t, k) => {
    if (t.t !== "el") return;
    if (t.el !== "H") {
      zadnji = k;
      return;
    }
    const vlasnik = zadnji ?? red[0];
    const elV = T[vlasnik].el;
    const v = enEl("H") < enEl(elV) ? 1 : -1;
    poTokenu[k] = { v, vrsta: "struktura_h", tekst: `Vodik je vezan na ${elV}, koji je ${v > 0 ? "elektronegativniji" : "manje elektronegativan"} od njega, pa ima ${zapisOks(v)}.` };
  });
  return { poTokenu, prosjekC: (() => {
    const c = red.filter((k) => T[k].el === "C");
    const zbroj = c.reduce((a, k) => a + poTokenu[k].v, 0);
    return c.length ? zbroj / c.length : null;
  })() };
}

// ── oksidacijski brojevi formule ──
// {formula, T (tokeni s v, vrsta, tekst za svaki element), struktura, naboj} ili {greska}.
const SPREMNIK = new Map();
export function oksFormule(formula) {
  if (SPREMNIK.has(formula)) return SPREMNIK.get(formula);
  const r = racunajFormulu(formula);
  SPREMNIK.set(formula, r);
  return r;
}
// Pravilo ide u „razlog“: „tekst“ tokena je dio formule koji se crta („Cr₂“).
const razlogOd = ({ tekst, ...o }) => ({ ...o, razlog: tekst });
function racunajFormulu(formula) {
  const c = cestica(formula);
  if (c.greska) return { greska: c.greska };
  if (c.elektron) return { greska: "elektron nema oksidacijski broj" };
  const f = c.formula;
  const T = tokeni(f);
  if (T.some((t) => t.t === "tekst")) return { greska: `formula „${f}“ ima znak koji nije dio formule` };
  const Q = c.naboj;
  const brojC = c.atomi.C ?? 0;
  // oksalat (H₂C₂O₄, Na₂C₂O₄, C₂O₄²⁻): oba C-atoma su jednaka (−OOC–COO−), pa prosjek iz pravila je broj svakog
  const oksalat = T.some((t, k) => t.t === "el" && t.el === "C" && t.n === 2 && T[k + 1]?.t === "el" && T[k + 1].el === "O" && T[k + 1].n === 4);
  if (brojC >= 2 && !(brojC === 2 && oksalat)) {
    const s = poStrukturi(f, T);
    if (s.greska) return s;
    T.forEach((t, k) => t.t === "el" && Object.assign(t, razlogOd(s.poTokenu[k])));
    return { formula: f, T, struktura: true, naboj: Q, prosjekC: s.prosjekC };
  }
  const dijelova = Math.max(...T.map((t) => t.dio)) + 1;
  for (let d = 0; d < dijelova; d++) {
    const ks = T.map((t, k) => (t.t === "el" && t.dio === d ? k : -1)).filter((k) => k >= 0);
    if (!ks.length) return { greska: `formula „${f}“ ima prazan dio` };
    const Qd = d === 0 ? Q : 0;
    const tekstDijela = T.filter((t) => t.dio === d && t.t !== "tocka" && t.t !== "naboj").map((t) => t.tekst).join("");
    const opis = d === 0 ? (dijelova > 1 ? tekstDijela : f) : `vodi ${tekstDijela}`;
    const r = rijesiJedinku(T, ks, Qd, opis);
    if (r.greska) return { greska: `${f}: ${r.greska}` };
    for (const k of ks) {
      if (r.poTokenu) Object.assign(T[k], razlogOd(r.poTokenu[k]));
      else Object.assign(T[k], razlogOd({ v: r.ox[T[k].el], ...r.pravilo[T[k].el], jedinka: { ks, Q: Qd, opis } }));
      if (d > 0) T[k].razlog = `Voda u kristalu (${tekstDijela}) je neutralna molekula: ${T[k].razlog}`;
    }
  }
  return { formula: f, T, struktura: false, naboj: Q };
}

// Atomi formule s brojem: [{k, el, v, oznaka}], oznaka je „Cr“ ili za strukturne formule „C1“, „C2“ (redni broj
// tog elementa slijeva).
export function atomiFormule(r) {
  const brojac = {};
  return r.T.map((t, k) => ({ t, k }))
    .filter(({ t }) => t.t === "el")
    .map(({ t, k }) => {
      brojac[t.el] = (brojac[t.el] ?? 0) + 1;
      return { k, el: t.el, v: t.v, red: brojac[t.el], oznaka: r.struktura ? `${t.el}${brojac[t.el]}` : t.el };
    });
}

// ── reakcija ──
export const imaReakciju = (s) => Array.isArray(s?.reaktanti) || Array.isArray(s?.produkti);
const reakcijaSpec = (s) => ({ reaktanti: s.reaktanti, produkti: s.produkti, strelica: s.strelica, iznad: s.iznad, koeficijenti: s.koeficijenti, stanja: s.stanja });
export function koefReakcije(s, t = tvari(s)) {
  return Array.isArray(s.koeficijenti) ? s.koeficijenti : (izjednaci(t).koef ?? null);
}

// Tvari koje widget prikazuje: formula (ili odabrana iz formule) ili sve tvari reakcije.
export function cestice(s, odabrana = 0) {
  if (imaReakciju(s)) return tvari(s).map((c) => ({ ...c, oks: c.elektron || c.greska ? null : oksFormule(c.formula) }));
  const f = Array.isArray(s.formule) ? s.formule[odabrana] : s.formula;
  const o = oksFormule(f);
  return [{ formula: o.formula ?? f, strana: null, i: 0, oks: o }];
}

// Promjene oksidacijskih brojeva u reakciji: po elementu vrijednosti lijevo i desno, što se oksidira i reducira, te
// sredstva (indeksi reaktanata).
export function analiza(s) {
  const t = cestice(s);
  const losa = t.find((c) => !c.elektron && c.oks?.greska);
  if (losa) return { greska: losa.oks.greska };
  const L = {};
  const D = {};
  const red = [];
  for (const c of t) {
    if (c.elektron) continue;
    for (const a of atomiFormule(c.oks)) {
      const m = c.strana === "L" ? L : D;
      (m[a.el] ??= new Set()).add(a.v);
      if (!red.includes(a.el)) red.push(a.el);
    }
  }
  const oksidira = [];
  const reducira = [];
  const detalji = [];
  for (const el of red) {
    const l = [...(L[el] ?? [])];
    const d = [...(D[el] ?? [])];
    if (!l.length || !d.length) continue;
    const novi = d.filter((v) => !l.includes(v));
    const nestali = l.filter((v) => !d.includes(v));
    const ox = novi.some((v) => v > Math.min(...l)) || nestali.some((v) => v < Math.max(...d));
    const rd = novi.some((v) => v < Math.max(...l)) || nestali.some((v) => v > Math.min(...d));
    if (ox) oksidira.push(el);
    if (rd) reducira.push(el);
    if (ox || rd) {
      if (ox) {
        const od = Math.min(...(nestali.length ? nestali : l));
        const do_ = Math.max(...(novi.length ? novi : d));
        detalji.push({ el, od, do: do_, vrsta: "oksidacija", e: do_ - od });
      }
      if (rd) {
        const od = Math.max(...(nestali.length ? nestali : l));
        const do_ = Math.min(...(novi.length ? novi : d));
        detalji.push({ el, od, do: do_, vrsta: "redukcija", e: od - do_ });
      }
    }
  }
  // sredstva: reaktant s atomom elementa koji se reducira (oksidira) na broju od kojeg desno postoji manji (veći)
  const sadrzi = (c, el, uvjet) => atomiFormule(c.oks).some((a) => a.el === el && uvjet(a.v));
  const reaktanti = t.filter((c) => c.strana === "L" && !c.elektron);
  const oksidacijsko = reaktanti.filter((c) => reducira.some((el) => sadrzi(c, el, (v) => [...D[el]].some((w) => w < v)))).map((c) => c.i);
  const redukcijsko = reaktanti.filter((c) => oksidira.some((el) => sadrzi(c, el, (v) => [...D[el]].some((w) => w > v)))).map((c) => c.i);
  return { t, elementi: red, L, D, oksidira, reducira, detalji, oksidacijsko, redukcijsko, redoks: oksidira.length > 0 && reducira.length > 0 };
}

// ── polureakcije ──
const SREDINA = { kisela: ["H⁺", "H₂O"], luznata: ["OH⁻", "H₂O"] };
function sredinaOd(s, t) {
  if (s.sredina) return s.sredina;
  if (t.some((c) => c.formula === "H⁺" || c.formula === "H₃O⁺")) return "kisela";
  if (t.some((c) => c.formula === "OH⁻")) return "luznata";
  return null;
}
// Izjednačena polureakcija: {reaktanti, produkti, koef, e (broj elektrona)} ili {greska}.
function izjednaciPolu(reaktanti, produkti) {
  const t = tvari({ reaktanti, produkti });
  const los = t.find((c) => c.greska);
  if (los) return { greska: los.greska };
  const r = izjednaci(t);
  if (!r.koef) return { greska: r.greska };
  const ie = t.findIndex((c) => c.elektron);
  return { reaktanti, produkti, koef: r.koef, e: ie >= 0 ? r.koef[ie] : 0, t };
}
function izvediPolu(s, A, vrsta) {
  const ox = vrsta === "oksidacija";
  const els = ox ? A.oksidira : A.reducira;
  if (els.length !== 1) return { greska: `${vrsta}: u reakciji se ${ox ? "oksidira" : "reducira"} više elemenata (${nabrajanje(els.map(naziv))}); zadaj „${vrsta}“: {reaktanti, produkti}` };
  const el = els[0];
  const D = [...A.D[el]];
  const imaEl = (c, uvjet) => atomiFormule(c.oks).some((a) => a.el === el && uvjet(a.v));
  const L = A.t.filter((c) => c.strana === "L" && !c.elektron && imaEl(c, (v) => D.some((w) => (ox ? w > v : w < v))));
  const vrijL = L.flatMap((c) => atomiFormule(c.oks).filter((a) => a.el === el).map((a) => a.v));
  const P = A.t.filter((c) => c.strana === "D" && !c.elektron && imaEl(c, (w) => (ox ? w > Math.min(...vrijL) : w < Math.max(...vrijL))));
  const lijevo = L.map((c) => c.formula);
  const desno = P.map((c) => c.formula);
  if (ox) desno.push("e⁻");
  else lijevo.push("e⁻");
  const sr = sredinaOd(s, A.t);
  const kandidati = (sr ? SREDINA[sr] : ["H₂O"]).filter((f) => !lijevo.includes(f) && !desno.includes(f));
  const pokusaji = [[]];
  for (const a of kandidati) pokusaji.push([[a, "L"]], [[a, "D"]]);
  if (kandidati.length === 2) {
    const [a, b] = kandidati;
    pokusaji.push([[a, "L"], [b, "D"]], [[a, "D"], [b, "L"]], [[a, "L"], [b, "L"]], [[a, "D"], [b, "D"]]);
  }
  for (const p of pokusaji) {
    const rr = [...lijevo];
    const pp = [...desno];
    for (const [f, strana] of p) {
      const cilj = strana === "L" ? rr : pp;
      cilj.splice(cilj.indexOf("e⁻") >= 0 ? cilj.indexOf("e⁻") : cilj.length, 0, f);
    }
    // elektron uvijek zadnji na svojoj strani
    const r = izjednaciPolu(rr, pp);
    if (r.koef) return r;
  }
  return { greska: `${vrsta} se ne da sama sastaviti iz tvari reakcije (${nabrajanje([...lijevo, ...desno].filter((f) => f !== "e⁻"))}${sr ? "" : "; zadaj sredina: \"kisela\" ili \"luznata\""}); zadaj „${vrsta}“: {reaktanti, produkti}` };
}

// Obje polureakcije i ukupna jednadžba: {oksidacija, redukcija, ukupno: {koef}, puta: {oksidacija, redukcija}} ili
// {greska}. Polureakcije autora imaju prednost; provjerava se da se zbrajaju u zadanu jednadžbu kad su sve tvari
// iste (ionska jednadžba).
const SPREMNIK_POLU = new WeakMap();
export function polureakcije(s) {
  if (SPREMNIK_POLU.has(s)) return SPREMNIK_POLU.get(s);
  const r = racunajPolu(s);
  SPREMNIK_POLU.set(s, r);
  return r;
}
function racunajPolu(s) {
  const A = analiza(s);
  if (A.greska) return { greska: A.greska };
  if (!A.redoks) return { greska: "to nije redoks-reakcija: nijednom elementu se ne mijenja oksidacijski broj" };
  const out = {};
  for (const vrsta of ["oksidacija", "redukcija"]) {
    const zad = s[vrsta];
    let p;
    if (zad != null) {
      if (!zad || !Array.isArray(zad.reaktanti) || !Array.isArray(zad.produkti)) return { greska: `${vrsta} je {reaktanti: [...], produkti: [...]} (s e⁻)` };
      p = izjednaciPolu(zad.reaktanti, zad.produkti);
      if (p.greska) return { greska: `${vrsta}: ${p.greska}` };
      const ie = p.t.findIndex((c) => c.elektron);
      if (ie < 0) return { greska: `${vrsta} mora imati elektrone e⁻` };
      if ((vrsta === "oksidacija") !== (p.t[ie].strana === "D")) return { greska: `${vrsta}: elektroni su ${vrsta === "oksidacija" ? "produkt (otpuštaju se)" : "reaktant (primaju se)"}` };
      // element koji se mijenja
      const pa = analiza({ reaktanti: zad.reaktanti, produkti: zad.produkti });
      if (pa.greska) return { greska: `${vrsta}: ${pa.greska}` };
      const els = vrsta === "oksidacija" ? pa.oksidira : pa.reducira;
      const ocek = vrsta === "oksidacija" ? A.oksidira : A.reducira;
      if (!els.length || !els.every((e) => ocek.includes(e))) return { greska: `${vrsta}: u zadanoj polureakciji ${vrsta === "oksidacija" ? "oksidira" : "reducira"} se ${els.length ? nabrajanje(els.map(naziv)) : "ništa"}, a u reakciji ${nabrajanje(ocek.map(naziv))}` };
    } else {
      p = izvediPolu(s, A, vrsta);
      if (p.greska) return p;
    }
    out[vrsta] = p;
  }
  const t = tvari(s);
  const koef = koefReakcije(s, t);
  if (!koef) return { greska: "ukupna jednadžba se ne da izjednačiti jednoznačno" };
  const n = lcm(out.oksidacija.e, out.redukcija.e);
  const puta = { oksidacija: n / out.oksidacija.e, redukcija: n / out.redukcija.e };
  // zbroj polureakcija (lijevo +, desno −), elektroni se krate
  const zbroj = {};
  for (const vrsta of ["oksidacija", "redukcija"]) {
    const p = out[vrsta];
    p.t.forEach((c, i) => {
      if (c.elektron) return;
      zbroj[c.formula] = (zbroj[c.formula] ?? 0) + (c.strana === "L" ? 1 : -1) * p.koef[i] * puta[vrsta];
    });
  }
  const ukupno = {};
  t.forEach((c, i) => (ukupno[c.formula] = (ukupno[c.formula] ?? 0) + (c.strana === "L" ? 1 : -1) * koef[i]));
  const fz = Object.keys(zbroj).filter((f) => zbroj[f] !== 0);
  const fu = Object.keys(ukupno);
  let ionska = false;
  if (fz.length === fu.length && fz.every((f) => f in ukupno)) {
    ionska = true;
    const g = fz.reduce((a, f) => gcd(a, zbroj[f]), 0);
    if (!fz.every((f) => zbroj[f] / g === ukupno[f])) return { greska: "polureakcije pomnožene da se elektroni pokrate ne daju zadanu ukupnu jednadžbu" };
  }
  return { ...out, puta, koef, ionska, A };
}

// Čestica jedne polureakcije koja nosi element koji se mijenja i koja je i u ukupnoj jednadžbi: koliko elektrona
// daje (prima) jedna takva čestica.
function nositelj(P, vrsta, s) {
  const p = P[vrsta];
  const el = (vrsta === "oksidacija" ? P.A.oksidira : P.A.reducira)[0];
  const t = tvari(s);
  for (const strana of ["L", "D"])
    for (let i = 0; i < p.t.length; i++) {
      const c = p.t[i];
      if (c.elektron || c.strana !== strana || !(el in (c.atomi ?? {}))) continue;
      const j = t.findIndex((x) => x.formula === c.formula && x.strana === strana);
      if (j >= 0) return { formula: c.formula, j, e: p.e / p.koef[i] };
    }
  return null;
}

// ── unos ──
const RIMSKI = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
// Oksidacijski broj iz polja: „+6“, „6“, „−2“, „-2“, „0“, rimski „VI“, „−II“. NaN ako se ne da pročitati.
export function procitajOks(v) {
  const x = String(v ?? "").replace(/\s/g, "").replace(/[−–]/g, "-");
  if (x === "") return null;
  let m = /^([+-]?)(\d{1,2})$/.exec(x);
  if (m) return (m[1] === "-" ? -1 : 1) * Number(m[2]) || 0;
  m = /^([+-]?)([IVX]+)$/i.exec(x);
  if (m && RIMSKI[m[2].toUpperCase()]) return (m[1] === "-" ? -1 : 1) * RIMSKI[m[2].toUpperCase()];
  return NaN;
}

// Polja za upis: [{i (tvar), k (token), el, v}] prema „trazi“.
export function trazenaPolja(s) {
  const tv = cestice(s);
  const trazi = Array.isArray(s.trazi) ? s.trazi : null;
  const out = [];
  for (const c of tv) {
    if (c.elektron || !c.oks || c.oks.greska) continue;
    for (const a of atomiFormule(c.oks)) {
      if (trazi && !trazi.includes(a.el) && !trazi.includes(a.oznaka)) continue;
      out.push({ i: c.i, k: a.k, el: a.el, v: a.v, oznaka: a.oznaka, red: a.red });
    }
  }
  return out;
}
export const kljuc = (i, k) => `${i}:${k}`;

// ── provjera: oksidacijski brojevi ──
function provjeriOks(s, odgovor) {
  const polja = trazenaPolja(s);
  const unos = odgovor?.oks ?? {};
  const tv = cestice(s);
  const dano = {};
  for (const p of polja) {
    const v = procitajOks(unos[kljuc(p.i, p.k)]);
    if (v == null) return { tocno: false, poruka: "Upiši oksidacijski broj u svako polje (npr. +6, −2 ili 0).", prazno: true };
    if (Number.isNaN(v)) return { tocno: false, poruka: "Oksidacijski broj piši kao cijeli broj s predznakom (+6, −2, 0); može i rimski (VI).", krivi: [kljuc(p.i, p.k)] };
    dano[kljuc(p.i, p.k)] = v;
  }
  const krivi = polja.filter((p) => dano[kljuc(p.i, p.k)] !== p.v);
  if (!krivi.length) return { tocno: true };
  const kljucevi = krivi.map((p) => kljuc(p.i, p.k));
  // poruke autora
  for (const p of krivi) {
    const a = dano[kljuc(p.i, p.k)];
    const f = tv[p.i].formula;
    const k = (s.krivo ?? []).find((x) => (x.element === p.el || x.element === p.oznaka) && x.vrijednost === a && (x.formula == null || x.formula === f));
    if (k) return { tocno: false, poruka: k.poruka, krivi: kljucevi };
  }
  // najprije stalna pravila, pa račun
  const stalna = ["element", "ion1", "ionisti", "F", "alk", "zemalk", "H", "hidrid", "O", "peroksid", "OF", "binarni", "struktura_h"];
  const p = krivi.find((x) => stalna.includes(tv[x.i].oks.T[x.k].vrsta)) ?? krivi[0];
  return { tocno: false, poruka: porukaOks(s, tv, p, dano), krivi: kljucevi };
}

function porukaOks(s, tv, p, dano) {
  const c = tv[p.i];
  const tok = c.oks.T[p.k];
  const a = dano[kljuc(p.i, p.k)];
  const f = c.formula;
  const ime = naziv(p.el);
  const Ime = velikoSlovo(ime);
  switch (tok.vrsta) {
    case "element":
      return `${f} je elementarna tvar: atomi u elementarnoj tvari imaju oksidacijski broj 0.`;
    case "ion1":
      return `${f} je jednoatomni ion: oksidacijski broj jednak je naboju iona.`;
    case "ionisti":
      return `U ionu ${f} naboj se jednako dijeli na sve atome.`;
    case "F":
      return "Fluor je najelektronegativniji element: u spojevima uvijek ima −1.";
    case "alk":
      return `${Ime} je alkalijski metal: u spojevima uvijek ima +1.`;
    case "zemalk":
      return `${Ime} je zemnoalkalijski metal: u spojevima uvijek ima +2.`;
    case "hidrid":
      return a === 1 ? `Vodik je ovdje vezan na metal (hidrid metala): ${zapisOks(-1)}, jer je metal manje elektronegativan od vodika.` : "Vodik vezan na metal (hidrid metala) ima −1.";
    case "H":
      return "Vodik vezan na nemetal ima +1.";
    case "O":
      return "Kisik u spojevima ima −2 (osim u peroksidima i u spoju s fluorom).";
    case "peroksid":
      return a === -2 ? `Kisik je ovdje u peroksidu (veza O–O): −1, a ne −2.` : `${f} je peroksid (veza O–O): kisik u njemu ima −1.`;
    case "OF":
      return `U ${f} kisik je vezan na fluor, koji je elektronegativniji od njega: kisik ovdje ima pozitivan oksidacijski broj.`;
    case "binarni":
      return `U ${f} je ${ime} elektronegativniji element, pa ima negativan oksidacijski broj kao u svom ionu.`;
    case "struktura_h":
      return "Vodik vezan na C, N ili O ima +1.";
    case "struktura_c": {
      if (c.oks.prosjekC != null && a === c.oks.prosjekC && Number.isInteger(a)) return `To je prosječni oksidacijski broj ugljika u ${f}. Svaki C-atom ima svoj broj, prema svojim vezama.`;
      return `Za ovaj C-atom zbroji po vezama: veza s elektronegativnijim atomom (O, N, halogen) daje +1 za svaki elektronski par (C=O daje +2), svaka veza s H daje −1, a veza s drugim C-atomom 0.`;
    }
    case "struktura":
      return `Elektroni svake veze pripadaju elektronegativnijem atomu: zbroji doprinose svih veza tog atoma.`;
    default: {
      // račun preko zbroja: zbroj u jedinki s učenikovim brojevima (za neupisane atome točni)
      const J = tok.jedinka;
      if (!J) return "Nije točno. Provjeri pravila i zbroj oksidacijskih brojeva.";
      const eff = (k) => c.oks.T[k].eff / (J.dijeli ?? 1);
      if (a === tok.v * eff(p.k) && eff(p.k) > 1) return `${eff(p.k)} atoma ${genitiv(ime)} zajedno imaju ${zapisOks(a)}; oksidacijski broj piše se za jedan atom.`;
      if (J.Q !== 0) {
        const bez = tok.v - J.Q / J.ks.filter((k) => c.oks.T[k].el === p.el).reduce((x, k) => x + eff(k), 0);
        if (Number.isInteger(bez) && a === bez) return `Zbroj oksidacijskih brojeva u ${J.opis} nije 0 nego naboj iona, ${zapisOks(J.Q)}.`;
      }
      if (a === -tok.v && a !== 0) return `Pazi na predznak: zbroj oksidacijskih brojeva u ${J.opis} mora biti ${zapisOks(J.Q)}.`;
      const clanovi = [];
      let zbroj = 0;
      const po = {};
      for (const k of J.ks) {
        const t = c.oks.T[k];
        const v = dano[kljuc(p.i, k)] ?? t.v;
        const kl = `${t.el}|${v}`;
        po[kl] = (po[kl] ?? 0) + eff(k);
        zbroj += eff(k) * v;
      }
      for (const [kl, nn] of Object.entries(po)) clanovi.push(clan(nn, Number(kl.split("|")[1])));
      return `Zbroj oksidacijskih brojeva u ${J.opis} mora biti ${J.Q === 0 ? "0" : `${zapisOks(J.Q)} (naboj iona)`}, a s ovim brojevima je ${clanovi.join(" + ")} = ${zapisOks(zbroj)}.`;
    }
  }
}

// ── provjera: uloge ──
export const pitanjaUloga = (s) => (Array.isArray(s.pitaj) ? s.pitaj : PITANJA);
const promjenaZapis = (A, el) => {
  const l = [...A.L[el]].sort((a, b) => a - b).map(zapisOks).join(" i ");
  const d = [...A.D[el]].sort((a, b) => a - b).map(zapisOks).join(" i ");
  return { l, d };
};
function provjeriUloge(s, odgovor) {
  const A = analiza(s);
  const pitaj = pitanjaUloga(s);
  const prazno = pitaj.find((q) => !Array.isArray(odgovor?.[q]) || !odgovor[q].length);
  if (prazno) return { tocno: false, poruka: "Odgovori na svako pitanje.", prazno: true };
  const krivo = [];
  let poruka = null;
  const isto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  for (const q of pitaj) {
    const dano = odgovor[q];
    const el = q === "oksidira" || q === "reducira";
    const tocno = el ? A[q] : A[q];
    if (isto(dano, tocno)) continue;
    krivo.push(q);
    if (poruka) continue;
    if (el) {
      const ox = q === "oksidira";
      const kriv = dano.find((x) => !tocno.includes(x));
      if (kriv != null) {
        const { l, d } = promjenaZapis(A, kriv);
        const suprotno = (ox ? A.reducira : A.oksidira).includes(kriv);
        if (suprotno) poruka = `${velikoSlovo(naziv(kriv))}: oksidacijski broj ${ox ? "pada" : "raste"} (lijevo ${l}, desno ${d}), a to je ${ox ? "redukcija: atom prima elektrone" : "oksidacija: atom otpušta elektrone"}. ${ox ? "Oksidira" : "Reducira"} se element kojem oksidacijski broj ${ox ? "raste" : "pada"}.`;
        else if (!(kriv in A.L) || !(kriv in A.D)) poruka = `${velikoSlovo(naziv(kriv))} nije u tvarima s obje strane jednadžbe.`;
        else poruka = `${velikoSlovo(naziv(kriv))} ima ${l === d ? `${l} i lijevo i desno` : `lijevo ${l}, a desno ${d}`}: oksidacijski broj mu se ne mijenja, pa se ne ${ox ? "oksidira" : "reducira"}.`;
      } else poruka = `${ox ? "Oksidira" : "Reducira"} se još jedan element: pogledaj kojem još oksidacijski broj ${ox ? "raste" : "pada"}.`;
    } else {
      const oks = q === "oksidacijsko";
      const kriv = dano.find((x) => !tocno.includes(x));
      const f = (i) => A.t[i]?.formula ?? "?";
      if (kriv != null) {
        const suprotno = (oks ? A.redukcijsko : A.oksidacijsko).includes(kriv);
        if (suprotno) poruka = oks ? `${f(kriv)} se oksidira (otpušta elektrone), pa je redukcijsko sredstvo. Oksidacijsko sredstvo je tvar koja se reducira: ona drugoj tvari uzima elektrone.` : `${f(kriv)} se reducira (prima elektrone), pa je oksidacijsko sredstvo. Redukcijsko sredstvo je tvar koja se oksidira: ona drugoj tvari predaje elektrone.`;
        else poruka = `U ${f(kriv)} nijedan atom ne mijenja oksidacijski broj: ta tvar nije ni oksidacijsko ni redukcijsko sredstvo.`;
      } else poruka = `${oks ? "Oksidacijsko" : "Redukcijsko"} sredstvo je još jedna tvar.`;
    }
  }
  return krivo.length ? { tocno: false, poruka, uloge: krivo } : { tocno: true };
}

// ── provjera: polureakcije ──
export const dijeloviPolu = (s) => (Array.isArray(s.dijelovi) ? s.dijelovi : DIJELOVI);
const NASLOV = { oksidacija: "Oksidacija", redukcija: "Redukcija", ukupno: "Ukupna jednadžba" };
function provjeriPolu(s, odgovor) {
  const P = polureakcije(s);
  for (const d of dijeloviPolu(s)) {
    const unos = odgovor?.[d];
    if (d === "ukupno") {
      const e = elektroniUkupno(s, P, unos);
      if (e) return { tocno: false, poruka: e, dio: d, koefKrivo: true };
      const r = provjeriKoef(reakcijaSpec(s), unos);
      if (!r.tocno) return { ...r, poruka: `${NASLOV[d]}: ${r.poruka}`, dio: d };
    } else {
      const p = P[d];
      const r = provjeriKoef({ reaktanti: p.reaktanti, produkti: p.produkti }, unos);
      if (!r.tocno) return { ...r, poruka: `${NASLOV[d]}: ${r.poruka}`, dio: d };
    }
  }
  return { tocno: true };
}
// Ukupna jednadžba: najprije elektroni (koliko jedna strana preda, toliko druga primi).
function elektroniUkupno(s, P, unos) {
  const a = nositelj(P, "oksidacija", s);
  const b = nositelj(P, "redukcija", s);
  if (!a || !b || a.formula === b.formula) return null;
  const k = (j) => {
    const x = String(unos?.[j] ?? "").trim();
    return x === "" ? 1 : /^\d+$/.test(x) ? Number(x) : null;
  };
  const ka = k(a.j);
  const kb = k(b.j);
  if (!ka || !kb) return null;
  const ea = ka * a.e;
  const eb = kb * b.e;
  if (!Number.isInteger(ea) || !Number.isInteger(eb) || ea === eb) return null;
  const uz = (k, f) => `${k === 1 ? "" : `${k} `}${f}`;
  return `Elektroni se ne slažu: uz ${uz(ka, a.formula)} oksidacijom se preda ${elektrona(ea)}, a uz ${uz(kb, b.formula)} redukcijom se primi ${elektrona(eb)}. Koliko se elektrona preda, toliko se mora primiti.`;
}

// ── zapis odgovora ──
const zapisPolu = (p) => zapisJednadzbe({ reaktanti: p.reaktanti, produkti: p.produkti }, p.koef);
export function zapisOksFormule(o, trazi) {
  const sve = atomiFormule(o);
  const at = sve.filter((a) => !trazi || trazi.includes(a.el) || trazi.includes(a.oznaka));
  const vidjeno = new Set();
  const dijelovi = [];
  for (const a of at) {
    // u strukturnoj formuli element s različitim brojevima ide atom po atom („3. C +1“)
    const razliciti = o.struktura && new Set(sve.filter((x) => x.el === a.el).map((x) => x.v)).size > 1;
    const k = razliciti ? a.oznaka : `${a.el}${a.v}`;
    if (vidjeno.has(k)) continue;
    vidjeno.add(k);
    dijelovi.push(razliciti ? `${a.red}. ${a.el} slijeva ${zapisOks(a.v)}` : `${a.el} ${zapisOks(a.v)}`);
  }
  return `${o.formula}: ${dijelovi.join(", ")}`;
}
function tocanUloge(s) {
  const A = analiza(s);
  const f = (i) => A.t[i].formula;
  const dio = (el) => {
    const { l, d } = promjenaZapis(A, el);
    return `${el} (${l} → ${d})`;
  };
  const out = [];
  const pitaj = pitanjaUloga(s);
  if (pitaj.includes("oksidira")) out.push(`oksidira se ${A.oksidira.map(dio).join(", ")}`);
  if (pitaj.includes("reducira")) out.push(`reducira se ${A.reducira.map(dio).join(", ")}`);
  if (pitaj.includes("oksidacijsko")) out.push(`oksidacijsko sredstvo: ${A.oksidacijsko.map(f).join(", ")}`);
  if (pitaj.includes("redukcijsko")) out.push(`redukcijsko sredstvo: ${A.redukcijsko.map(f).join(", ")}`);
  return velikoSlovo(out.join("; ")) + ".";
}

// ── validate ──
function validirajFormulu(f, need, gdje) {
  if (!need(isText(f), `${gdje} mora biti formula (tekst)`)) return null;
  const o = oksFormule(f.trim());
  need(!o.greska, `${gdje}: ${o.greska}`);
  return o.greska ? null : o;
}

export const redoks = {
  tip: "redoks",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Oksidacijski brojevi i redoks-reakcije. Brojevi se pišu iznad simbola, arapski s predznakom (+6, −2, 0); učenik smije upisati i rimski (VI, −II).
Kod sve računa sam: oksidacijske brojeve po školskim pravilima (element 0; jednoatomni ion = naboj; F −1; alkalijski +1, zemnoalkalijski +2; H +1, uz metal ili manje elektronegativan element −1 (NaH, SiH₄); O −2, u peroksidu −1, s fluorom +2; zbroj = naboj; s dvije nepoznanice preko poznatog iona (CuSO₄ = Cu²⁺ + SO₄²⁻, NH₄NO₃) ili u binarnom spoju; disulfid FeS₂: Fe +2, S −1), za formule s više C-atoma po vezama iz sažete strukturne formule (CH₃CH₂CHO, CH₃COOH, (CH₃)₂CHCH₂CH₂OH; ne C₃H₆O), što se oksidira i reducira, sredstva, polureakcije i ukupnu jednadžbu (logika widgeta jednadzba). Oksalat (H₂C₂O₄, C₂O₄²⁻) ide po pravilima (C +3). Formula za koju pravila daju samo prosjek (Fe₃O₄, CaOCl₂) ili metal s neuobičajenim oksidacijskim brojem se odbija.
Formula: Unicode indeksi i naboj („K₂Cr₂O₇“, „SO₄²⁻“, „CuSO₄·5H₂O“, „H₂O₂“, „NaH“). Reakcija: reaktanti, produkti, strelica?, iznad?, koeficijenti?, stanja? kao u widgetu jednadzba (kod je izjednačuje i prikazuje s koeficijentima).
tekst, nacin:
- "istrazi" (nije zadatak): formula, ili formule: [do ${NAJVISE_FORMULA}] (učenik ih prebacuje), ili reakcija. Brojevi stoje iznad atoma; dodir atoma pokaže pravilo i račun. Uz reakciju: koji se element oksidira, a koji reducira (boje), koliko elektrona, sredstva i polureakcije (ako ih kod može sastaviti ili ih autor zada);
- "oks_broj": formula ili reakcija; učenik upisuje broj iznad atoma. trazi?: ["S"] samo ti elementi (zadano: svi atomi); u strukturnoj formuli i "C3" = treći C slijeva (npr. karbonilni C u CH₃CH₂CHO). Poruke za peroksid, hidrid, zaboravljen naboj iona, zbroj koji nije jednak naboju, broj za sve atome umjesto za jedan i prosjek ugljika kod sam; krivo?: [{element, vrijednost, poruka, formula?}];
- "uloge": reakcija (mora biti redoks); pitaj?: podskup ["oksidira", "reducira", "oksidacijsko", "redukcijsko"] (zadano sva četiri): učenik bira element koji se oksidira/reducira i reaktant koji je oksidacijsko/redukcijsko sredstvo; prikazi_oks?: true pokazuje brojeve iznad atoma (zadano: tek nakon provjere);
- "polureakcije": reakcija (mora biti redoks); učenik upisuje koeficijente (prazno = 1) polureakcije oksidacije, redukcije (s e⁻ i H⁺/H₂O ili OH⁻/H₂O) i ukupne jednadžbe. sredina?: "kisela" | "luznata" (zadano: kisela ako je H⁺ u reakciji, lužnata ako je OH⁻). Polureakcije kod sastavlja sam iz ionske jednadžbe; za molekulsku (Cu + HNO₃ → Cu(NO₃)₂ + NO + H₂O) zadaj oksidacija: {reaktanti, produkti} i redukcija: {…} s e⁻ (kod ih izjednačuje i provjerava). dijelovi?: podskup ["oksidacija", "redukcija", "ukupno"] (zadano sva tri; nezadani se prikazuju izjednačeni); prikazi_oks? kao kod uloga. Poruka „elektroni se ne slažu“ i poruke za atome i naboj kao u widgetu jednadzba.`,
  primjer: {
    tip: "redoks",
    nacin: "oks_broj",
    tekst: "Modra galica je bakrov(II) sulfat pentahidrat. Odredi oksidacijski broj sumpora u njoj.",
    formula: "CuSO₄·5H₂O",
    trazi: ["S"],
  },
  primjeri: [
    {
      tip: "redoks",
      nacin: "istrazi",
      tekst: "Dodirni atom i pogledaj kojim je pravilom dobiven njegov oksidacijski broj. Prebaci se na drugu formulu: gdje kisik nema −2, a vodik nema +1?",
      formule: ["K₂Cr₂O₇", "H₂O₂", "NaH", "OF₂", "CuSO₄·5H₂O", "CH₃CH₂CHO"],
    },
    {
      tip: "redoks",
      nacin: "istrazi",
      tekst: "Permanganatni ioni u kiseloj otopini oksidiraju željezove(II) ione. Pogledaj kojem se atomu oksidacijski broj povećava, a kojem smanjuje.",
      reaktanti: ["MnO₄⁻", "Fe²⁺", "H⁺"],
      produkti: ["Mn²⁺", "Fe³⁺", "H₂O"],
    },
    {
      tip: "redoks",
      nacin: "oks_broj",
      tekst: "Odredi oksidacijske brojeve svih atoma u kalijevu dikromatu.",
      formula: "K₂Cr₂O₇",
    },
    {
      tip: "redoks",
      nacin: "oks_broj",
      tekst: "Cink reagira s klorovodičnom kiselinom. Odredi oksidacijske brojeve atoma u svim tvarima.",
      reaktanti: ["Zn", "HCl"],
      produkti: ["ZnCl₂", "H₂"],
      stanja: ["s", "aq", "aq", "g"],
    },
    {
      tip: "redoks",
      nacin: "oks_broj",
      tekst: "Koliki je oksidacijski broj atoma ugljika karbonilne skupine u propanalu?",
      formula: "CH₃CH₂CHO",
      trazi: ["C3"],
    },
    {
      tip: "redoks",
      nacin: "uloge",
      tekst: "Otopina modre galice ostavljena je preko noći u željeznoj kanti i na stijenci je nastala crvenkasta prevlaka bakra. Što se oksidira, što se reducira i što je oksidacijsko, a što redukcijsko sredstvo?",
      reaktanti: ["Fe", "Cu²⁺"],
      produkti: ["Fe²⁺", "Cu"],
      stanja: ["s", "aq", "aq", "s"],
    },
    {
      tip: "redoks",
      nacin: "uloge",
      tekst: "Kalijev dikromat reagira s klorovodičnom kiselinom. Koji je reaktant oksidacijsko sredstvo?",
      reaktanti: ["K₂Cr₂O₇", "HCl"],
      produkti: ["CrCl₃", "Cl₂", "KCl", "H₂O"],
      pitaj: ["oksidacijsko"],
      prikazi_oks: true,
    },
    {
      tip: "redoks",
      nacin: "polureakcije",
      tekst: "Permanganatni ioni u kiseloj otopini oksidiraju željezove(II) ione u željezove(III). Izjednači polureakcije oksidacije i redukcije, pa ukupnu jednadžbu.",
      reaktanti: ["MnO₄⁻", "Fe²⁺", "H⁺"],
      produkti: ["Mn²⁺", "Fe³⁺", "H₂O"],
      sredina: "kisela",
    },
    {
      tip: "redoks",
      nacin: "polureakcije",
      tekst: "Bakar se otapa u razrijeđenoj dušičnoj kiselini, a nastaje dušikov(II) oksid. Izjednači polureakcije, pa ukupnu jednadžbu.",
      reaktanti: ["Cu", "HNO₃"],
      produkti: ["Cu(NO₃)₂", "NO", "H₂O"],
      oksidacija: { reaktanti: ["Cu"], produkti: ["Cu²⁺", "e⁻"] },
      redukcija: { reaktanti: ["NO₃⁻", "H⁺", "e⁻"], produkti: ["NO", "H₂O"] },
    },
  ],

  validate(s) {
    const { list, need } = problems();
    need(NACINI.includes(s.nacin), `redoks.nacin mora biti jedan od: ${NACINI.join(", ")}`);
    need(isText(s.tekst), "redoks treba „tekst“");
    for (const f of Object.keys(s)) need(POLJA.includes(f), `redoks nema polje „${f}“ (dopuštena: ${POLJA.slice(1).join(", ")})`);
    if (list.length) return list;
    const reakcija = imaReakciju(s);
    const izvora = [s.formula != null, s.formule != null, reakcija].filter(Boolean).length;
    need(izvora === 1, "redoks treba točno jedno od: formula, formule (samo istrazi) ili reakcija (reaktanti i produkti)");
    if (list.length) return list;
    if (s.formule != null) need(s.nacin === "istrazi", "formule (više formula za prebacivanje) idu samo uz istrazi; za zadatak zadaj formula");
    if ((s.nacin === "uloge" || s.nacin === "polureakcije") && !reakcija) need(false, `način ${s.nacin} treba reakciju (reaktanti i produkti)`);
    if (list.length) return list;

    if (s.formula != null) validirajFormulu(s.formula, need, "formula");
    if (s.formule != null && need(Array.isArray(s.formule) && s.formule.length >= 1 && s.formule.length <= NAJVISE_FORMULA, `formule su popis od 1 do ${NAJVISE_FORMULA} formula`)) {
      s.formule.forEach((f, i) => validirajFormulu(f, need, `formule[${i}]`));
      need(new Set(s.formule).size === s.formule.length, "formule se ne smiju ponavljati");
    }
    if (reakcija) {
      for (const f of ["formula", "formule"]) need(!(f in s), `uz reakciju nema polja „${f}“`);
      // reakcija se provjerava kao jednadžba (formule, izjednačivost, koeficijenti, stanja)
      const j = jednadzba.validate({ tip: "jednadzba", nacin: "izjednaci", tekst: s.tekst, ...Object.fromEntries(Object.entries(reakcijaSpec(s)).filter(([, v]) => v != null)) });
      for (const p of j) need(false, `reakcija: ${p}`);
      if (list.length) return list;
      tvari(s).forEach((c) => !c.elektron && validirajFormulu(c.formula, need, `tvar ${c.formula}`));
      if (list.length) return list;
    } else for (const f of ["sredina", "oksidacija", "redukcija", "pitaj", "dijelovi", "prikazi_oks", "strelica", "iznad", "koeficijenti", "stanja"]) need(!(f in s), `polje „${f}“ ide samo uz reakciju`);
    if (list.length) return list;

    // načini
    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      for (const f of ["trazi", "pitaj", "dijelovi", "prikazi_oks"]) need(!(f in s), `istrazi nema polje „${f}“ (to je za zadatke)`);
    } else need(s.krivo == null || s.nacin === "oks_broj", "krivo ide samo uz način oks_broj");
    if (s.nacin !== "oks_broj") need(s.trazi == null || s.nacin === "istrazi", "trazi ide samo uz način oks_broj");
    if (s.nacin !== "uloge") need(s.pitaj == null || s.nacin === "istrazi", "pitaj ide samo uz način uloge");
    if (s.nacin !== "polureakcije") {
      need(s.dijelovi == null || s.nacin === "istrazi", "dijelovi idu samo uz način polureakcije");
      if (s.nacin !== "istrazi") for (const f of ["sredina", "oksidacija", "redukcija"]) need(!(f in s), `„${f}“ ide uz način polureakcije (ili istrazi reakcije)`);
    }
    if (s.prikazi_oks != null) need(typeof s.prikazi_oks === "boolean" && (s.nacin === "uloge" || s.nacin === "polureakcije"), "prikazi_oks (true/false) ide uz uloge ili polureakcije");
    if (s.sredina != null) need(SREDINE.includes(s.sredina), `sredina je "kisela" ili "luznata"`);
    if (list.length) return list;

    if (s.nacin === "oks_broj") {
      if (s.trazi != null && need(Array.isArray(s.trazi) && s.trazi.length >= 1, "trazi je popis elemenata (npr. [\"S\"]) ili atoma strukturne formule (\"C3\")")) {
        const tv = cestice(s);
        const at = tv.flatMap((c) => (c.elektron ? [] : atomiFormule(c.oks)));
        for (const x of s.trazi) {
          const okEl = at.some((a) => a.el === x);
          const okAt = !reakcija && at.some((a) => a.oznaka === x && /\d$/.test(x));
          need(okEl || okAt, `trazi: „${x}“ nije element${reakcija ? " iz reakcije" : ` ni atom (npr. C1) formule ${s.formula}`}`);
        }
        need(new Set(s.trazi).size === s.trazi.length, "trazi se ne smije ponavljati");
      }
      need(trazenaPolja(s).length <= 14, "previše polja za upis (najviše 14): suzi ih poljem trazi");
      if (s.krivo != null && need(Array.isArray(s.krivo), "krivo je popis {element, vrijednost, poruka, formula?}")) {
        const polja = trazenaPolja(s);
        const tv = cestice(s);
        s.krivo.forEach((k, i) => {
          need(isText(k?.element), `krivo[${i}].element je simbol (npr. "O")`);
          need(Number.isInteger(k?.vrijednost), `krivo[${i}].vrijednost je cijeli broj`);
          need(isText(k?.poruka), `krivo[${i}].poruka mora biti tekst`);
          const p = polja.filter((x) => (x.el === k?.element || x.oznaka === k?.element) && (k?.formula == null || tv[x.i].formula === k.formula));
          if (need(p.length > 0, `krivo[${i}]: „${k?.element}“ nije polje za upis`)) need(p.every((x) => x.v !== k.vrijednost), `krivo[${i}]: ${zapisOks(k.vrijednost)} je točan oksidacijski broj`);
        });
      }
    }
    if (s.nacin === "uloge" || (s.nacin === "istrazi" && reakcija) || s.nacin === "polureakcije") {
      const A = analiza(s);
      if (A.greska) need(false, A.greska);
      else if (s.nacin !== "istrazi") need(A.redoks, "to nije redoks-reakcija: nijednom elementu se ne mijenja oksidacijski broj");
    }
    if (s.nacin === "uloge" && s.pitaj != null)
      if (need(Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.every((q) => PITANJA.includes(q)), `pitaj je podskup od: ${PITANJA.join(", ")}`)) need(new Set(s.pitaj).size === s.pitaj.length, "pitaj se ne smije ponavljati");
    if (s.nacin === "polureakcije" || (s.nacin === "istrazi" && reakcija && (s.oksidacija || s.redukcija || s.sredina))) {
      if (!list.length) {
        const P = polureakcije(s);
        need(!P.greska, P.greska);
      }
      if (s.dijelovi != null)
        if (need(Array.isArray(s.dijelovi) && s.dijelovi.length >= 1 && s.dijelovi.every((d) => DIJELOVI.includes(d)), `dijelovi su podskup od: ${DIJELOVI.join(", ")}`)) need(new Set(s.dijelovi).size === s.dijelovi.length, "dijelovi se ne smiju ponavljati");
    }
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "oks_broj") return provjeriOks(s, odgovor);
    if (s.nacin === "uloge") return provjeriUloge(s, odgovor);
    if (s.nacin === "polureakcije") return provjeriPolu(s, odgovor);
    return { tocno: true };
  },

  tocanOdgovor(s) {
    if (s.nacin === "oks_broj") {
      const trazi = Array.isArray(s.trazi) ? s.trazi : null;
      return cestice(s)
        .filter((c) => !c.elektron)
        .map((c) => zapisOksFormule(c.oks, trazi))
        .filter((z) => !/: $/.test(z))
        .join("; ");
    }
    if (s.nacin === "uloge") return tocanUloge(s);
    if (s.nacin === "polureakcije") {
      const P = polureakcije(s);
      if (P.greska) return "";
      const st = stanjaOd(s);
      return [
        `oksidacija: ${zapisPolu(P.oksidacija)}`,
        `redukcija: ${zapisPolu(P.redukcija)}`,
        `ukupno: ${zapisJednadzbe(s, P.koef, st.some(Boolean) ? st : null)}`,
      ].join("; ");
    }
    return "";
  },
};

// za prikaz
export { reakcijaSpec, NASLOV, NAJVISE_FORMULA };
