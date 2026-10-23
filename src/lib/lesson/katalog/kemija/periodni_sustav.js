// periodni_sustav: interaktivni periodni sustav kakav je na ispitnom listu mature (Kemija – tablice: Z, simbol, Ar,
// skupine 1–18, lantanoidi i aktinoidi u izdvojenim redcima). Načini: istraži (kartica elementa, sloj trenda),
// pronađi (učenik dodirne element koji zadovoljava uvjet), pročitaj (upiše Z, Ar, periodu, skupinu, valentne
// elektrone, protone, neutrone ili elektrone iona), poredaj (3–5 elemenata po EN, energiji ionizacije, polumjeru ili
// metalnom karakteru). Sve brojeve (Ar, EN, Ei) daje _tablice.js; točan odgovor i poruke za tipične greške računa kod.
import { parseNumber, formatNumber, isNum } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";
import { ELEMENTI, PO_SIMBOLU, nabojOd } from "./_tablice.js";

const NACINI = ["istrazi", "pronadji", "procitaj", "poredaj"];
export const SLOJEVI = ["vrsta", "en", "ie1", "polumjer"];
const PRIKAZI_TABLICE = ["cijeli", "glavne"];
export const PITAJ = ["z", "ar", "perioda", "skupina", "valentni", "protoni", "neutroni", "elektroni"];
export const SVOJSTVA = ["en", "ie1", "polumjer", "metalnost"];
const SMJEROVI = ["rastuci", "padajuci"];
const VRSTE = ["metal", "nemetal", "polumetal", "plemeniti plin"];
const BLOKOVI = ["s", "p", "d", "f"];
const UVJETI = ["perioda", "skupina", "valentni", "vrsta", "blok", "ljuske", "ion"];

// ── položaj u tablici kao na listu ──
// Na listu su La–Lu i Ac–Lr svi u izdvojenim redcima (La i Ac ispod 3. skupine), a u 3. skupini 6. i 7. periode
// stoji samo „57–71 lantanoidi“ / „89–103 aktinoidi“. _tablice.js Lu stavlja u 3. skupinu, pa se ovdje računa sam.
const lantanoid = (z) => z >= 57 && z <= 71;
const aktinoid = (z) => z >= 89 && z <= 103;
export const fBlok = (e) => lantanoid(e.z) || aktinoid(e.z);
// skupina za pitanja i uvjete (null za lantanoide i aktinoide)
export const skupina = (e) => (fBlok(e) ? null : e.skupina);
export function blok(e) {
  if (fBlok(e)) return "f";
  if (e.z === 2) return "s";
  if (e.skupina <= 2) return "s";
  if (e.skupina >= 13) return "p";
  return "d";
}
export const glavna = (e) => ["s", "p"].includes(blok(e));
// red (1–7 periode, 8 lantanoidi, 9 aktinoidi) i stupac (1–18) ćelije
export function celija(e) {
  if (lantanoid(e.z)) return { red: 8, stupac: e.z - 57 + 3 };
  if (aktinoid(e.z)) return { red: 9, stupac: e.z - 89 + 3 };
  return { red: e.perioda, stupac: e.skupina };
}
export const prikazOd = (s) => s.prikaz ?? (s.nacin === "poredaj" ? "glavne" : "cijeli");
export const vidljiv = (s, e) => prikazOd(s) === "cijeli" || glavna(e);

// Valentni elektroni: samo glavne skupine (1, 2 → skupina; 13–18 → skupina − 10; He 2).
export function valentni(e) {
  if (!glavna(e)) return null;
  if (e.z === 2) return 2;
  return e.skupina <= 2 ? e.skupina : e.skupina - 10;
}

// ── elektronska konfiguracija (redoslijed popunjavanja + poznate iznimke d-bloka) ──
const POPUNJAVANJE = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p", "6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p"];
const KAPACITET = { s: 2, p: 6, d: 10, f: 14 };
const IZNIMKE = {
  Cr: { "3d": 5, "4s": 1 },
  Cu: { "3d": 10, "4s": 1 },
  Nb: { "4d": 4, "5s": 1 },
  Mo: { "4d": 5, "5s": 1 },
  Ru: { "4d": 7, "5s": 1 },
  Rh: { "4d": 8, "5s": 1 },
  Pd: { "4d": 10, "5s": 0 },
  Ag: { "4d": 10, "5s": 1 },
  Pt: { "5d": 9, "6s": 1 },
  Au: { "5d": 10, "6s": 1 },
};
const PLEMENITA_JEZGRA = [
  [86, "Rn"],
  [54, "Xe"],
  [36, "Kr"],
  [18, "Ar"],
  [10, "Ne"],
  [2, "He"],
];
const GORNJI = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
export const gornji = (n) => [...String(n)].map((c) => GORNJI[c] ?? c).join("");

function popuni(z) {
  const out = {};
  let ostalo = z;
  for (const o of POPUNJAVANJE) {
    if (ostalo <= 0) break;
    const n = Math.min(ostalo, KAPACITET[o[1]]);
    out[o] = n;
    ostalo -= n;
  }
  return out;
}
const poLjuskama = (a, b) => Number(a[0]) - Number(b[0]) || "spdf".indexOf(a[1]) - "spdf".indexOf(b[1]);

// Konfiguracija kao popis orbitala {orbitala: broj}; null za f-blok i elemente iza Ra (nesigurne ili predviđene).
export function orbitale(e) {
  if (fBlok(e) || e.z > 88) return null;
  const o = { ...popuni(e.z), ...(IZNIMKE[e.simbol] ?? {}) };
  for (const k of Object.keys(o)) if (!o[k]) delete o[k];
  return o;
}
// "[Ar] 4s²", "1s² 2s¹"; orbitale poredane po ljuskama (3d prije 4s)
export function konfiguracija(e) {
  const o = orbitale(e);
  if (!o) return null;
  const jezgra = PLEMENITA_JEZGRA.find(([z]) => z < e.z);
  const unutra = jezgra ? orbitale(PO_SIMBOLU[jezgra[1]]) : {};
  const vanjske = Object.keys(o)
    .filter((k) => o[k] !== unutra[k])
    .sort(poLjuskama)
    .map((k) => `${k}${gornji(o[k])}`);
  return [jezgra ? `[${jezgra[1]}]` : null, ...vanjske].filter(Boolean).join(" ");
}
// Raspored po ljuskama [2, 8, 8, 2]; samo glavne skupine (kod prijelaznih metala zbunjuje).
export function ljuske(e) {
  if (!glavna(e)) return null;
  const o = orbitale(e);
  if (!o) return null;
  const lj = [];
  for (const [k, n] of Object.entries(o)) lj[Number(k[0]) - 1] = (lj[Number(k[0]) - 1] ?? 0) + n;
  return Array.from(lj, (n) => n ?? 0);
}

// ── ioni ──
// Uobičajeni naboji iona (matura): sve drugo validate odbija („Cl²⁻“, „Na²⁺“, „O⁻“ …).
export function dopusteniNaboji(e) {
  const g = skupina(e);
  const S = e.simbol;
  if (S === "H") return [1, -1];
  if (fBlok(e)) return [2, 3, 4];
  if (g === 1) return [1];
  if (g === 2) return [2];
  if (g === 13) return S === "B" ? [] : S === "Tl" ? [1, 3] : [3];
  if (g === 14) return ["Sn", "Pb"].includes(S) ? [2, 4] : [];
  if (g === 15) return ["N", "P", "As"].includes(S) ? [-3] : ["Sb", "Bi"].includes(S) ? [3] : [];
  if (g === 16) return ["O", "S", "Se", "Te"].includes(S) ? [-2] : [];
  if (g === 17) return S === "At" ? [] : [-1];
  if (g === 18) return [];
  // prijelazni metali
  if (["Zn", "Cd"].includes(S)) return [2];
  if (S === "Ag") return [1];
  if (S === "Hg") return [1, 2];
  if (S === "Sc") return [3];
  return [1, 2, 3, 4];
}
export const nabojTxt = (q) => (q === 0 ? "" : `${Math.abs(q) === 1 ? "" : gornji(Math.abs(q))}${q > 0 ? "⁺" : "⁻"}`);
// "Ca²⁺" | "Cl-" | "Ca2+" → {e, naboj}; null ako se ne da pročitati
export function cesticaOd(t) {
  const m = String(t ?? "")
    .trim()
    .match(/^([A-Z][a-z]?)([0-9⁰¹²³⁴⁵⁶⁷⁸⁹]*[+\-−⁺⁻]?)$/);
  if (!m || !PO_SIMBOLU[m[1]]) return null;
  if (m[2] && !/[+\-−⁺⁻]$/.test(m[2])) return null;
  return { e: PO_SIMBOLU[m[1]], naboj: m[2] ? nabojOd(m[2]) : 0 };
}
export const zapisCestice = (s) => {
  const c = cesticaOd(s.element);
  return c ? `${isNum(s.A) ? gornji(s.A) : ""}${c.e.simbol}${nabojTxt(c.naboj)}` : "";
};

// ── tekst ──
const VRSTA_TXT = { metal: "metal", nemetal: "nemetal", polumetal: "polumetal", "plemeniti plin": "plemeniti plin" };
const valentnihTxt = (n) => `${n} ${n === 1 ? "valentni elektron" : n >= 2 && n <= 4 ? "valentna elektrona" : "valentnih elektrona"}`;
const elektronaTxt = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "elektron" : "elektrona"}`;
const elementaTxt = (n) => `${n} ${n === 1 ? "element" : n >= 2 && n <= 4 ? "elementa" : "elemenata"}`;
const popisTxt = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);
export const IME_PITAJ = {
  z: "protonski broj Z",
  ar: "relativna atomska masa Ar",
  perioda: "perioda",
  skupina: "skupina",
  valentni: "broj valentnih elektrona",
  protoni: "broj protona",
  neutroni: "broj neutrona",
  elektroni: "broj elektrona",
};
export const IME_SVOJSTVA = {
  en: "elektronegativnost",
  ie1: "prva energija ionizacije",
  polumjer: "polumjer atoma",
  metalnost: "metalni karakter",
};
const VECI = {
  en: "veću elektronegativnost",
  ie1: "veću energiju ionizacije",
  polumjer: "veći polumjer",
  metalnost: "izraženiji metalni karakter",
};
// smjer pravila: +1 = vrijednost raste udesno u periodi i prema gore u skupini (EN, Ei), −1 obrnuto
const SMJER_PRAVILA = { en: 1, ie1: 1, polumjer: -1, metalnost: -1 };
const RAZLOG = {
  en: {
    perioda: "U istoj periodi elektronegativnost raste udesno: jezgra ima više protona, a elektroni su na istom broju ljusaka.",
    skupina: "Niz skupinu elektronegativnost pada: atom ima više ljusaka, pa su vanjski elektroni dalje od jezgre.",
  },
  ie1: {
    perioda: "U istoj periodi energija ionizacije raste udesno: veći naboj jezgre jače drži vanjski elektron.",
    skupina: "Niz skupinu energija ionizacije pada: vanjski elektron je dalje od jezgre, pa ga je lakše ukloniti.",
  },
  polumjer: {
    perioda: "U istoj periodi polumjer pada udesno: broj ljusaka je isti, a veći naboj jezgre jače privlači elektrone.",
    skupina: "Niz skupinu polumjer raste: svaka sljedeća perioda dodaje jednu ljusku.",
  },
  metalnost: {
    perioda: "U istoj periodi metalni karakter pada udesno: atomi sve teže otpuštaju elektrone.",
    skupina: "Niz skupinu metalni karakter raste: vanjski elektron je dalje od jezgre i lakše se otpušta.",
  },
};
// Iznimke prve energije ionizacije u periodi (podaci, ne pravilo); nalaze se u maturalnim zadacima.
const IZNIMKE_IE = {
  "Be-B": "Iznimka: B ima manju energiju ionizacije od Be. Elektron koji B gubi sam je u 2p-orbitali, višoj od popunjene 2s.",
  "Mg-Al": "Iznimka: Al ima manju energiju ionizacije od Mg. Elektron koji Al gubi sam je u 3p-orbitali, višoj od popunjene 3s.",
  "N-O": "Iznimka: O ima manju energiju ionizacije od N. U O su dva elektrona u istoj 2p-orbitali, odbijaju se, pa jedan lakše ode.",
  "P-S": "Iznimka: S ima manju energiju ionizacije od P. U S su dva elektrona u istoj 3p-orbitali, odbijaju se, pa jedan lakše ode.",
};
const iznimkaIE = (a, b) => IZNIMKE_IE[`${a.simbol}-${b.simbol}`] ?? IZNIMKE_IE[`${b.simbol}-${a.simbol}`] ?? null;

// ── usporedba po pravilu periode i skupine ──
// > 0: a ima veću vrijednost svojstva od b; 0: pravilo ih ne razlikuje (ni ista perioda ni skupina, a nije jedan
// istodobno niže i lijevo od drugoga).
function poPravilu(a, b, svojstvo) {
  const k = SMJER_PRAVILA[svojstvo];
  const dP = a.perioda - b.perioda; // > 0: a je niže
  const dS = a.skupina - b.skupina; // > 0: a je desno
  if (dP === 0 && dS === 0) return 0;
  if (dP === 0) return k * Math.sign(dS);
  if (dS === 0) return -k * Math.sign(dP);
  if (Math.sign(dP) === -Math.sign(dS)) return -k * Math.sign(dP); // niže i lijevo (ili više i desno)
  return 0;
}
const PODATAK = { en: (e) => e.en, ie1: (e) => e.ie1 };
const PRAG = { en: 0.05, ie1: 15 };
// > 0: a ima veću vrijednost (podaci za EN i Ei, pravilo za polumjer i metalnost)
function usporedi(a, b, svojstvo) {
  if (PODATAK[svojstvo]) return Math.sign(PODATAK[svojstvo](a) - PODATAK[svojstvo](b));
  return poPravilu(a, b, svojstvo);
}
export function tocanRedoslijed(s) {
  const el = s.elementi.map((x) => PO_SIMBOLU[x]);
  const smjer = s.smjer === "padajuci" ? -1 : 1;
  return el.sort((a, b) => smjer * usporedi(a, b, s.svojstvo)).map((e) => e.simbol);
}
export const vrijednostSvojstva = (e, svojstvo) =>
  svojstvo === "en" ? (e.en == null ? null : e.en.toFixed(2).replace(".", ",")) : svojstvo === "ie1" ? (e.ie1 == null ? null : `${e.ie1} kJ/mol`) : null;

function razlogPara(a, b, svojstvo) {
  // a ima veću vrijednost od b
  if (svojstvo === "ie1") {
    const izn = iznimkaIE(a, b);
    if (izn && poPravilu(a, b, svojstvo) < 0) return izn;
  }
  const r = RAZLOG[svojstvo];
  if (a.perioda === b.perioda) return `${a.simbol} ima ${VECI[svojstvo]} od ${b.simbol}. ${r.perioda}`;
  if (a.skupina === b.skupina) return `${a.simbol} ima ${VECI[svojstvo]} od ${b.simbol}. ${r.skupina}`;
  const gore = a.perioda < b.perioda ? a : b;
  const dolje = gore === a ? b : a;
  return `${a.simbol} ima ${VECI[svojstvo]} od ${b.simbol}: ${dolje.simbol} je i niže i lijevo od ${gore.simbol}, pa oba pravila kažu isto. ${r.skupina}`;
}

// ── uvjet (pronađi) ──
function zadovoljava(e, u) {
  if (u.perioda != null && e.perioda !== u.perioda) return false;
  if (u.skupina != null && skupina(e) !== u.skupina) return false;
  if (u.valentni != null && valentni(e) !== u.valentni) return false;
  if (u.vrsta != null && e.vrsta !== u.vrsta) return false;
  if (u.blok != null && blok(e) !== u.blok) return false;
  if (u.ljuske != null && (ljuske(e) ?? []).join() !== u.ljuske.join()) return false;
  if (u.ion != null && e.z !== u.ion.elektroni + u.ion.naboj) return false;
  return true;
}
export function tocniElementi(s) {
  if (s.uvjet) return ELEMENTI.filter((e) => zadovoljava(e, s.uvjet)).map((e) => e.simbol);
  return [].concat(s.tocno ?? []);
}

// Zašto odabrani element ne zadovoljava uvjet (prva razlika), laički.
function zastoNe(e, u) {
  const S = e.simbol;
  if (u.perioda != null && u.skupina != null && e.perioda === u.skupina && skupina(e) === u.perioda)
    return `Zamijenio si periodu i skupinu: perioda je redak (1–7), a skupina stupac (1–18). ${S} je u ${e.perioda}. periodi i ${skupina(e)}. skupini.`;
  if (u.perioda != null && e.perioda !== u.perioda) return `${S} je u ${e.perioda}. periodi, a traži se ${u.perioda}. perioda. Perioda je redak tablice.`;
  if (u.skupina != null && skupina(e) !== u.skupina)
    return skupina(e) == null
      ? `${S} je ${lantanoid(e.z) ? "lantanoid" : "aktinoid"}, a traži se ${u.skupina}. skupina.`
      : `${S} je u ${skupina(e)}. skupini, a traži se ${u.skupina}. skupina. Skupina je stupac tablice.`;
  if (u.valentni != null && valentni(e) !== u.valentni) {
    if (!glavna(e))
      return `${S} je ${fBlok(e) ? "u f-bloku" : "prijelazni metal"}: broj valentnih elektrona ne čita se iz broja skupine. Traži se element glavne skupine (1, 2, 13–18)${u.valentni >= 3 ? `; za skupine 13–18 valentnih je elektrona skupina − 10, pa ${valentnihTxt(u.valentni)} ima ${u.valentni + 10}. skupina` : ""}.`;
    return `${S} ima ${valentnihTxt(valentni(e))}, a traži se ${u.valentni}.${skupina(e) >= 13 ? " Za skupine 13–18 valentnih je elektrona skupina − 10." : ""}`;
  }
  if (u.vrsta != null && e.vrsta !== u.vrsta) return `${S} je ${VRSTA_TXT[e.vrsta]}, a traži se ${VRSTA_TXT[u.vrsta]}.`;
  if (u.blok != null && blok(e) !== u.blok) return `${S} je u ${blok(e)}-bloku, a traži se ${u.blok}-blok.`;
  if (u.ljuske != null) {
    const lj = ljuske(e);
    if (!lj) return `${S} nije u glavnoj skupini. Broj ljusaka je perioda, a broj elektrona u zadnjoj ljusci je broj valentnih elektrona.`;
    if (lj.join() !== u.ljuske.join())
      return `${S} ima raspored ${lj.join(", ")}, a traži se ${u.ljuske.join(", ")}. Broj ljusaka je perioda, a zadnji broj je broj valentnih elektrona.`;
  }
  if (u.ion != null) {
    const { naboj, elektroni } = u.ion;
    const ion = `ion s nabojem ${naboj > 0 ? "+" : "−"}${Math.abs(naboj)}`;
    if (e.z === elektroni) return `${S} kao neutralan atom ima ${elektronaTxt(elektroni)}. ${cap(ion)} ima ${naboj > 0 ? "manje elektrona nego protona" : "više elektrona nego protona"}, pa traži element s ${naboj > 0 ? "većim" : "manjim"} Z.`;
    if (e.z === elektroni - naboj)
      return `Pogrešan smjer: ${naboj > 0 ? "pozitivan ion izgubio je elektrone, pa ima manje elektrona nego protona" : "negativan ion primio je elektrone, pa ima više elektrona nego protona"}. Z = broj elektrona ${naboj > 0 ? "+" : "−"} ${Math.abs(naboj)}.`;
    return `${S} ima Z = ${e.z}, pa bi njegov ${ion} imao ${elektronaTxt(e.z - naboj)}, a traži se ${elektroni}.`;
  }
  return null;
}

// ── odgovor u načinu pročitaj ──
export const pitajOd = (s) => [].concat(s.pitaj ?? []);
export function tocneVrijednosti(s) {
  const c = cesticaOd(s.element);
  const e = c.e;
  return {
    z: e.z,
    ar: e.ar,
    perioda: e.perioda,
    skupina: skupina(e),
    valentni: valentni(e),
    protoni: e.z,
    neutroni: isNum(s.A) ? s.A - e.z : null,
    elektroni: e.z - c.naboj,
  };
}
const jednako = (q, x, v, e) => (q === "ar" ? Math.abs(x - v) <= (e.nestabilan ? 0.5 : 0.051) : x === v);

function krivoPolje(s, q, x) {
  const { e, naboj } = cesticaOd(s.element);
  const S = `${e.simbol}${nabojTxt(naboj)}`;
  const v = tocneVrijednosti(s);
  const arR = Math.round(e.ar);
  const A = s.A;
  const ion = naboj !== 0;
  const kriva = [];
  const dodaj = (vrijednost, poruka) => vrijednost != null && vrijednost !== v[q] && kriva.push({ vrijednost, poruka });
  if (q === "z" || q === "protoni") {
    if (ion) dodaj(v.elektroni, `To je broj elektrona iona. Naboj mijenja broj elektrona, a broj protona (Z) ostaje isti.`);
    if (isNum(A)) dodaj(A, "To je nukleonski broj A (protoni + neutroni). Broj protona je Z, mali broj iznad simbola u tablici.");
    if (isNum(A)) dodaj(A - e.z, "To je broj neutrona (A − Z). Broj protona je Z.");
    dodaj(arR, "To je relativna atomska masa (broj ispod simbola). Z je mali broj iznad simbola.");
    dodaj(e.perioda, "To je perioda. Z je mali broj iznad simbola.");
  }
  if (q === "ar") {
    dodaj(e.z, "To je protonski broj Z (mali broj iznad simbola). Ar je broj ispod simbola.");
    if (isNum(A)) dodaj(A, "To je nukleonski broj ovog izotopa. Ar je broj ispod simbola na listu.");
    if (!e.nestabilan && Math.abs(arR - e.ar) > 0.051) dodaj(arR, `Na listu Ar ima decimalu: prepiši ga baš kako piše, bez zaokruživanja.`);
  }
  if (q === "perioda") {
    if (skupina(e) != null) dodaj(skupina(e), "Zamijenio si periodu i skupinu: perioda je redak (1–7), a skupina stupac (1–18).");
    dodaj(valentni(e), "To je broj valentnih elektrona. Perioda je redak, a jednaka je broju ljusaka.");
  }
  if (q === "skupina") {
    dodaj(e.perioda, "Zamijenio si periodu i skupinu: skupina je stupac (1–18), a perioda redak (1–7).");
    if (skupina(e) >= 13) dodaj(valentni(e), "To je broj valentnih elektrona. Za skupine 13–18 skupina je za 10 veća od broja valentnih elektrona.");
  }
  if (q === "valentni") {
    if (skupina(e) >= 13 && e.z !== 2) dodaj(skupina(e), `To je broj skupine. Za skupine 13–18 valentnih je elektrona skupina − 10.`);
    if (e.z === 2) dodaj(8, "Helij ima samo jednu ljusku, a u nju stanu 2 elektrona.");
    dodaj(e.z, "To je ukupan broj elektrona. Valentni su samo elektroni u vanjskoj (zadnjoj) ljusci.");
    dodaj(e.perioda, "Perioda kaže koliko atom ima ljusaka, a ne koliko je elektrona u vanjskoj.");
  }
  if (q === "neutroni") {
    dodaj(A, "A je zbroj protona i neutrona. Broj neutrona je A − Z.");
    dodaj(e.z, "To je broj protona. Broj neutrona je A − Z.");
    dodaj(A + e.z, "Oduzmi, ne zbroji: broj neutrona je A − Z.");
    dodaj(arR - e.z, `Računaj s nukleonskim brojem A = ${A} iz zapisa, a ne s Ar s lista.`);
    if (ion) dodaj(A - v.elektroni, "Neutroni se računaju s brojem protona (Z), a ne s brojem elektrona iona.");
  }
  if (q === "elektroni") {
    if (ion) dodaj(e.z, `To je broj elektrona neutralnog atoma. ${S} ima naboj, pa je ${naboj > 0 ? `izgubio ${elektronaTxt(naboj)}` : `primio ${elektronaTxt(-naboj)}`}.`);
    if (ion) dodaj(e.z + naboj, `Pogrešan smjer: ${naboj > 0 ? "pozitivan ion izgubio je elektrone, pa ih ima manje od protona" : "negativan ion primio je elektrone, pa ih ima više od protona"}.`);
    if (isNum(A)) dodaj(A, "To je nukleonski broj. Broj elektrona atoma jednak je broju protona (Z), a naboj ga mijenja.");
    dodaj(valentni(e), "To su samo valentni elektroni. Traži se ukupan broj elektrona.");
  }
  return kriva;
}
const SAVJET = {
  z: "Z je mali broj iznad simbola u ćeliji elementa.",
  protoni: "Broj protona je protonski broj Z, mali broj iznad simbola.",
  ar: "Ar je broj ispod simbola u ćeliji elementa.",
  perioda: "Perioda je redak tablice (1–7) u kojem je element.",
  skupina: "Skupina je stupac tablice (1–18); broj skupine piše na vrhu stupca.",
  valentni: "Za skupine 1 i 2 broj valentnih elektrona je broj skupine, a za skupine 13–18 skupina − 10.",
  neutroni: "Broj neutrona je A − Z: od nukleonskog broja oduzmi broj protona.",
  elektroni: "Neutralan atom ima elektrona koliko i protona (Z). Pozitivan ion ima ih manje za naboj, negativan više.",
};

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const POLJA = {
  istrazi: ["prikazi", "odabran"],
  pronadji: ["tocno", "uvjet", "viseTocnih", "savjet"],
  procitaj: ["element", "A", "pitaj", "krivo", "savjet"],
  poredaj: ["elementi", "svojstvo", "smjer", "savjet"],
};
const OPCA = ["tip", "nacin", "tekst", "prikaz", "istakni", "periode"];

function validateUvjet(u, need) {
  if (!need(u && typeof u === "object" && !Array.isArray(u) && Object.keys(u).length >= 1, "uvjet mora biti objekt s barem jednim uvjetom")) return false;
  const pr = problems();
  const n = pr.need;
  for (const k of Object.keys(u)) n(UVJETI.includes(k), `uvjet.${k} ne postoji; dopušteni: ${UVJETI.join(", ")}`);
  if (u.perioda != null) n(Number.isInteger(u.perioda) && u.perioda >= 1 && u.perioda <= 7, "uvjet.perioda je cijeli broj 1–7");
  if (u.skupina != null) n(Number.isInteger(u.skupina) && u.skupina >= 1 && u.skupina <= 18, "uvjet.skupina je cijeli broj 1–18");
  if (u.valentni != null) n(Number.isInteger(u.valentni) && u.valentni >= 1 && u.valentni <= 8, "uvjet.valentni je cijeli broj 1–8 (samo glavne skupine)");
  if (u.vrsta != null) n(VRSTE.includes(u.vrsta), `uvjet.vrsta je jedna od: ${VRSTE.join(", ")}`);
  if (u.blok != null) n(BLOKOVI.includes(u.blok), "uvjet.blok je s, p, d ili f");
  if (u.ljuske != null) n(Array.isArray(u.ljuske) && u.ljuske.length >= 1 && u.ljuske.every((x) => Number.isInteger(x) && x > 0), "uvjet.ljuske je raspored po ljuskama, npr. [2, 8, 7]");
  if (u.ion != null && n(u.ion && Number.isInteger(u.ion.naboj) && u.ion.naboj !== 0 && Number.isInteger(u.ion.elektroni) && u.ion.elektroni >= 0, "uvjet.ion je {naboj (cijeli broj ≠ 0, npr. 2 ili −1), elektroni}")) {
    const e = ELEMENTI.find((x) => x.z === u.ion.elektroni + u.ion.naboj);
    if (n(!!e, "uvjet.ion ne daje postojeći element")) n(dopusteniNaboji(e).includes(u.ion.naboj), `${e.simbol}${nabojTxt(u.ion.naboj)} nije uobičajen ion`);
  }
  pr.list.forEach((p) => need(false, p));
  return pr.list.length === 0;
}

export const periodni_sustav = {
  tip: "periodni_sustav",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Periodni sustav kao na ispitnom listu (Kemija – tablice): ćelija Z, simbol, Ar s lista; skupine 1–18, lantanoidi i aktinoidi u izdvojenim redcima. Brojeve daje kod.
Zajedničko: tekst, prikaz?: "cijeli" (zadano; na mobitelu se tablica pomiče vodoravno uz zalijepljene oznake perioda) | "glavne" (samo skupine 1, 2, 13–18; zadano za poredaj),
istakni?: [simboli] (obrub oko ćelija), periode?: true|false (oznake perioda lijevo; zadano prikazane, osim kad se pita za periodu ili ljuske – na listu ih nema).
nacin:
- "istrazi" (nije zadatak): dodir elementa otvori karticu (naziv, Z, Ar, perioda, skupina, blok, vrsta, konfiguracija; valentni elektroni i ljuske za glavne skupine);
  prikazi?: sloj ili popis slojeva od ${SLOJEVI.join(", ")} (vrsta = metal/nemetal/polumetal/plemeniti plin; en = elektronegativnost; ie1 = prva energija ionizacije;
  polumjer = kvalitativno po pravilu, samo glavne skupine) – boja ćelija, legenda i strelice trenda; uz više slojeva učenik ih bira. odabran?: simbol (kartica otvorena na početku).
- "pronadji": učenik dodirne element(e) pa Provjeri. tocno?: simbol ili [simboli] ILI uvjet?: {perioda?, skupina?, valentni?, vrsta?, blok? ("s"|"p"|"d"|"f"), ljuske? ([2, 8, 2]),
  ion? ({naboj: 2, elektroni: 18} → Ca)}; kod iz uvjeta sam nađe elemente i piše poruke (zamijenjena perioda i skupina, prijelazni metal za valentne, krivi smjer naboja …).
  viseTocnih?: true kad je točno više elemenata (inače uvjet mora dati točno jedan). Ako su zadani i tocno i uvjet, moraju se slagati.
- "procitaj": element: "Ca" ili ion "Ca²⁺", "Cl⁻"; pitaj: jedno ili popis (1–4) od ${PITAJ.join(", ")}; A?: nukleonski broj (obavezan za neutroni; prikazuje se kao ³⁷Cl⁻).
  Točno računa kod iz tablica (Ar baš kako piše na listu); poruke za Z umjesto Ar, zamijenjenu periodu i skupinu, skupinu umjesto valentnih, elektrone bez naboja …
  valentni samo za glavne skupine i neutralan atom. krivo?: [{polje?, vrijednost, poruka}].
- "poredaj": elementi: 3–5 simbola iz glavnih skupina, svojstvo: ${SVOJSTVA.join(" | ")}, smjer?: "rastuci" (zadano, od najmanjeg) | "padajuci".
  Redoslijed računa kod (EN i Ei iz podataka, polumjer i metalnost po pravilu periode i skupine); validate odbija skup koji pravilo ne poreda jednoznačno.`,
  primjer: {
    tip: "periodni_sustav",
    nacin: "istrazi",
    tekst: "Boja ćelije pokazuje elektronegativnost: što je tamnija, to atom jače privlači elektrone u vezi. Dodirni nekoliko elemenata i usporedi.",
    prikazi: ["en", "vrsta"],
    odabran: "F",
  },
  primjeri: [
    {
      tip: "periodni_sustav",
      nacin: "istrazi",
      tekst: "Dodirni element u glavnim skupinama i pogledaj kako se mijenja polumjer atoma.",
      prikaz: "glavne",
      prikazi: ["polumjer", "ie1"],
    },
    {
      tip: "periodni_sustav",
      nacin: "procitaj",
      tekst: "Koliko valentnih elektrona ima atom kalcija?",
      element: "Ca",
      pitaj: "valentni",
    },
    {
      tip: "periodni_sustav",
      nacin: "procitaj",
      tekst: "Koliko elektrona ima kloridni ion Cl⁻?",
      element: "Cl⁻",
      pitaj: "elektroni",
    },
    {
      tip: "periodni_sustav",
      nacin: "procitaj",
      tekst: "Koliko protona, neutrona i elektrona ima ion $^{37}\\mathrm{Cl}^{-}$?",
      element: "Cl⁻",
      A: 37,
      pitaj: ["protoni", "neutroni", "elektroni"],
    },
    {
      tip: "periodni_sustav",
      nacin: "pronadji",
      tekst: "Dodirni element 3. periode čiji atom ima 2 valentna elektrona.",
      uvjet: { perioda: 3, valentni: 2 },
    },
    {
      tip: "periodni_sustav",
      nacin: "pronadji",
      tekst: "Dodirni sve halogene elemente (17. skupina) od 2. do 5. periode.",
      prikaz: "glavne",
      tocno: ["F", "Cl", "Br", "I"],
      viseTocnih: true,
    },
    {
      tip: "periodni_sustav",
      nacin: "poredaj",
      tekst: "Poredaj litij, natrij i kalij od najmanje do najveće prve energije ionizacije.",
      elementi: ["Li", "Na", "K"],
      svojstvo: "ie1",
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `periodni_sustav.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "periodni_sustav treba „tekst“");
    const dopustena = [...OPCA, ...POLJA[s.nacin]];
    for (const f of Object.keys(s)) need(dopustena.includes(f), `polje „${f}“ ne postoji u načinu ${s.nacin} (dopuštena: ${dopustena.join(", ")})`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.prikaz != null) need(PRIKAZI_TABLICE.includes(s.prikaz), 'prikaz mora biti "cijeli" ili "glavne"');
    if (s.periode != null) need(typeof s.periode === "boolean", "periode mora biti true ili false");
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    const glavneTxt = (e) => `${e.simbol} nije u glavnim skupinama, a prikaz je "glavne"`;
    const poznat = (x, gdje) => {
      const e = PO_SIMBOLU[x];
      if (!need(!!e, `${gdje}: „${x}“ nije simbol elementa iz tablice (H–Cn)`)) return null;
      need(vidljiv(s, e), glavneTxt(e));
      return e;
    };
    if (s.istakni != null && need(Array.isArray(s.istakni) && s.istakni.length >= 1 && new Set(s.istakni).size === s.istakni.length, "istakni je popis različitih simbola"))
      s.istakni.forEach((x) => poznat(x, "istakni"));
    if (list.length) return list;

    if (s.nacin === "istrazi") {
      if (s.prikazi != null) {
        const p = [].concat(s.prikazi);
        need(p.length >= 1 && p.every((x) => SLOJEVI.includes(x)) && new Set(p).size === p.length, `prikazi je sloj ili popis različitih od: ${SLOJEVI.join(", ")}`);
      }
      if (s.odabran != null) poznat(s.odabran, "odabran");
    }

    if (s.nacin === "pronadji") {
      need(s.tocno != null || s.uvjet != null, "pronadji treba tocno (simboli) ili uvjet");
      if (s.viseTocnih != null) need(typeof s.viseTocnih === "boolean", "viseTocnih mora biti true ili false");
      let tocno = null;
      if (s.tocno != null) {
        const t = [].concat(s.tocno);
        if (need(t.length >= 1 && new Set(t).size === t.length, "tocno je simbol ili popis različitih simbola")) {
          const ok = t.map((x) => poznat(x, "tocno")).every(Boolean);
          if (ok) tocno = t;
        }
      }
      let izUvjeta = null;
      if (s.uvjet != null && validateUvjet(s.uvjet, need)) {
        izUvjeta = ELEMENTI.filter((e) => zadovoljava(e, s.uvjet));
        if (need(izUvjeta.length >= 1, "nijedan element ne zadovoljava uvjet")) {
          for (const e of izUvjeta) need(vidljiv(s, e), glavneTxt(e));
          izUvjeta = izUvjeta.map((e) => e.simbol);
        } else izUvjeta = null;
      }
      const t = izUvjeta ?? tocno;
      if (t) {
        if (!s.viseTocnih) need(t.length === 1, `${izUvjeta ? "uvjet daje" : "tocno ima"} više elemenata (${t.join(", ")}): suzi uvjet ili stavi viseTocnih: true`);
        else need(t.length >= 2, "viseTocnih: true, a točan je samo jedan element: makni viseTocnih");
      }
      if (izUvjeta && tocno)
        need(
          izUvjeta.length === tocno.length && izUvjeta.every((x) => tocno.includes(x)),
          `uvjet daje ${izUvjeta.join(", ")}, a tocno je ${tocno.join(", ")}: makni tocno (kod ga računa sam) ili ispravi uvjet`,
        );
    }

    if (s.nacin === "procitaj") {
      const c = cesticaOd(s.element);
      if (!need(!!c, `element „${s.element}“ nije simbol (s nabojem), npr. "Ca", "Ca²⁺" ili "Cl⁻"`)) return list;
      const e = c.e;
      need(vidljiv(s, e), glavneTxt(e));
      if (c.naboj !== 0) need(dopusteniNaboji(e).includes(c.naboj), `${e.simbol}${nabojTxt(c.naboj)} nije uobičajen ion${dopusteniNaboji(e).length ? ` (${e.simbol}: ${dopusteniNaboji(e).map((q) => e.simbol + nabojTxt(q)).join(", ")})` : `: ${e.simbol} ne tvori jednostavan ion`}`);
      const p = pitajOd(s);
      if (!need(p.length >= 1 && p.length <= 4 && p.every((q) => PITAJ.includes(q)) && new Set(p).size === p.length, `pitaj je jedno ili popis 1–4 različita od: ${PITAJ.join(", ")}`)) return list;
      if (s.A != null) need(Number.isInteger(s.A) && s.A >= e.z && Math.abs(s.A - e.ar) <= Math.max(3, 0.12 * e.ar), `A = ${s.A} nije moguć nukleonski broj za ${e.simbol} (Z = ${e.z}, Ar ≈ ${e.arZapis})`);
      if (p.includes("neutroni")) need(isNum(s.A), "pitaj neutroni traži A (nukleonski broj izotopa)");
      if (p.includes("valentni")) {
        need(glavna(e), `valentni elektroni prijelaznog metala (${e.simbol}) nisu jednoznačni: osim vanjskih s-elektrona u vezi sudjeluju i d-elektroni, pa ih ne pitaj; pitaj za element glavne skupine`);
        need(c.naboj === 0, "valentni elektroni pitaju se za neutralan atom, ne za ion");
      }
      if (p.includes("skupina")) need(skupina(e) != null, `${e.simbol} je ${lantanoid(e.z) ? "lantanoid" : "aktinoid"}: na listu je u izdvojenom retku, pa se za skupinu ne pita`);
      if (p.includes("ar")) need(!e.nestabilan, `${e.simbol} je nestabilan: na listu je [${e.ar}] (nukleonski broj najstabilnijeg izotopa), a ne Ar`);
      if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis")) {
        const v = tocneVrijednosti(s);
        s.krivo.forEach((k, i) => {
          const q = k?.polje ?? (p.length === 1 ? p[0] : null);
          need(p.includes(q), `krivo[${i}].polje mora biti jedno od pitaj`);
          need(isNum(k?.vrijednost) && isText(k?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
          if (p.includes(q) && isNum(k?.vrijednost) && v[q] != null) need(!jednako(q, k.vrijednost, v[q], e), `krivo[${i}].vrijednost je točan odgovor`);
        });
      }
    }

    if (s.nacin === "poredaj") {
      need(SVOJSTVA.includes(s.svojstvo), `svojstvo mora biti jedno od: ${SVOJSTVA.join(", ")}`);
      if (s.smjer != null) need(SMJEROVI.includes(s.smjer), 'smjer mora biti "rastuci" ili "padajuci"');
      if (!need(Array.isArray(s.elementi) && s.elementi.length >= 3 && s.elementi.length <= 5 && new Set(s.elementi).size === s.elementi.length, "elementi: 3–5 različitih simbola"))
        return list;
      const el = s.elementi.map((x) => poznat(x, "elementi"));
      if (list.length || !el.every(Boolean)) return list;
      for (const e of el) need(glavna(e), `${e.simbol} nije u glavnoj skupini: trendovi se uspoređuju samo za skupine 1, 2 i 13–18`);
      if (s.svojstvo === "en") for (const e of el) need(e.en != null, `${e.simbol} nema elektronegativnost u podacima${e.vrsta === "plemeniti plin" ? " (plemeniti plin)" : ""}`);
      if (s.svojstvo === "ie1") for (const e of el) need(e.ie1 != null, `${e.simbol} nema prvu energiju ionizacije u podacima`);
      if (["polumjer", "metalnost"].includes(s.svojstvo)) for (const e of el) need(e.vrsta !== "plemeniti plin", `plemeniti plin ${e.simbol} ne uspoređuje se po svojstvu ${IME_SVOJSTVA[s.svojstvo]}`);
      if (list.length || !SVOJSTVA.includes(s.svojstvo)) return list;
      for (let i = 0; i < el.length; i++)
        for (let j = i + 1; j < el.length; j++) {
          const [a, b] = [el[i], el[j]];
          const pr = poPravilu(a, b, s.svojstvo);
          if (!need(pr !== 0, `${a.simbol} i ${b.simbol} nisu u istoj periodi ni skupini, a pravilo ih ne razlikuje (jedan je niže, drugi lijevo): zamijeni jedan element`)) continue;
          if (PODATAK[s.svojstvo]) {
            const d = PODATAK[s.svojstvo](a) - PODATAK[s.svojstvo](b);
            if (!need(Math.abs(d) >= PRAG[s.svojstvo], `${a.simbol} i ${b.simbol} imaju gotovo jednaku vrijednost (${IME_SVOJSTVA[s.svojstvo]}): zamijeni jedan element`)) continue;
            const izn = s.svojstvo === "ie1" && a.perioda === b.perioda && iznimkaIE(a, b);
            need(Math.sign(d) === pr || izn, `za ${a.simbol} i ${b.simbol} podaci (${IME_SVOJSTVA[s.svojstvo]}) ne slažu se s pravilom periode i skupine: zamijeni jedan element`);
          }
        }
    }
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "pronadji") return checkPronadji(s, odgovor);
    if (s.nacin === "procitaj") return checkProcitaj(s, odgovor);
    if (s.nacin === "poredaj") return checkPoredaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  tocanOdgovor(s) {
    if (s.nacin === "pronadji")
      return tocniElementi(s)
        .map((x) => `${x} (${PO_SIMBOLU[x].naziv})`)
        .join(", ");
    if (s.nacin === "procitaj") {
      const v = tocneVrijednosti(s);
      const e = cesticaOd(s.element).e;
      return pitajOd(s)
        .map((q) => `${IME_PITAJ[q]}: ${q === "ar" ? e.arZapis : v[q]}`)
        .join("; ");
    }
    if (s.nacin === "poredaj") return tocanRedoslijed(s).join(s.smjer === "padajuci" ? " > " : " < ");
    return "";
  },
};

// odgovor: [simboli]
function checkPronadji(s, odgovor) {
  const odabrani = [].concat(odgovor ?? []).filter((x) => PO_SIMBOLU[x]);
  if (!odabrani.length) return { tocno: false, poruka: s.viseTocnih ? "Dodirni elemente, pa Provjeri." : "Dodirni element, pa Provjeri.", prazno: true };
  const tocni = tocniElementi(s);
  const visak = odabrani.filter((x) => !tocni.includes(x));
  const fali = tocni.filter((x) => !odabrani.includes(x));
  if (!visak.length && !fali.length) return { tocno: true };
  if (!s.viseTocnih && odabrani.length > 1) return { tocno: false, poruka: "Traži se samo jedan element." };
  if (visak.length) {
    const e = PO_SIMBOLU[visak[0]];
    let zasto = s.uvjet ? zastoNe(e, s.uvjet) : null;
    if (!zasto && !s.uvjet && tocni.length === 1) {
      const t = PO_SIMBOLU[tocni[0]];
      if (t.perioda === skupina(e) && skupina(t) === e.perioda) zasto = "Zamijenio si periodu i skupinu: perioda je redak (1–7), a skupina stupac (1–18).";
    }
    const uvod = s.viseTocnih && visak.length < odabrani.length ? `${visak.length === 1 ? `${e.simbol} ne pripada` : `${popisTxt(visak)} ne pripadaju`}. ` : "";
    const poruka = uvod ? `${uvod}${zasto ?? s.savjet ?? ""}`.trim() : (zasto ?? s.savjet ?? `${e.simbol} nije traženi element. Pročitaj pitanje još jednom.`);
    return { tocno: false, poruka };
  }
  return { tocno: false, poruka: `Odabrani su točni, ali nisu svi: nedostaje još ${elementaTxt(fali.length)}.` };
}

// odgovor: {z: "20", …} (ili samo tekst kad se pita jedno)
function checkProcitaj(s, odgovor) {
  const p = pitajOd(s);
  const unos = typeof odgovor === "object" && odgovor ? odgovor : { [p[0]]: odgovor };
  const v = tocneVrijednosti(s);
  const { e } = cesticaOd(s.element);
  for (const q of p) {
    const x = parseNumber(String(unos[q] ?? ""));
    if (x == null) return { tocno: false, poruka: p.length > 1 ? `Upiši ${IME_PITAJ[q]}.` : "Upiši broj.", prazno: true, polje: q };
  }
  for (const q of p) {
    const x = parseNumber(String(unos[q]));
    if (jednako(q, x, v[q], e)) continue;
    const vlastita = (s.krivo ?? []).filter((k) => (k.polje ?? p[0]) === q);
    const hit = [...vlastita, ...krivoPolje(s, q, x)].find((k) => jednako(q, x, k.vrijednost, e));
    const pre = p.length > 1 ? `**${cap(IME_PITAJ[q])}.** ` : "";
    const tekst = hit?.poruka ?? s.savjet ?? `Nije točno. ${SAVJET[q]}`;
    return { tocno: false, poruka: pre + tekst, polje: q };
  }
  return { tocno: true };
}

// odgovor: [simboli] redom kako ih je učenik poredao
function checkPoredaj(s, odgovor) {
  const o = [].concat(odgovor ?? []);
  if (o.length !== s.elementi.length || !s.elementi.every((x) => o.includes(x))) return { tocno: false, poruka: "Poredaj sve zadane elemente.", prazno: true };
  const t = tocanRedoslijed(s);
  if (o.every((x, i) => x === t[i])) return { tocno: true };
  if (o.every((x, i) => x === t[t.length - 1 - i]))
    return { tocno: false, poruka: `Redoslijed je obrnut: traži se od ${s.smjer === "padajuci" ? "najveće prema najmanjoj" : "najmanje prema najvećoj"} vrijednosti.` };
  // prvi par koji je krivim redom
  for (let i = 0; i < o.length; i++)
    for (let j = i + 1; j < o.length; j++) {
      const [a, b] = [PO_SIMBOLU[o[i]], PO_SIMBOLU[o[j]]];
      if (t.indexOf(a.simbol) > t.indexOf(b.simbol)) {
        const veci = usporedi(a, b, s.svojstvo) > 0 ? [a, b] : [b, a];
        return { tocno: false, poruka: s.savjet || `${a.simbol} i ${b.simbol} su krivim redom. ${razlogPara(veci[0], veci[1], s.svojstvo)}` };
      }
    }
  return { tocno: false, poruka: s.savjet || "Redoslijed nije točan." };
}

export const IME_VRSTE = VRSTA_TXT;
export { formatNumber };
