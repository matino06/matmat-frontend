// elektronska_konfiguracija: orbitale kao kućice sa strelicama, zapis konfiguracije (puni i skraćeni) i ono što se
// iz nje čita (nespareni i valentni elektroni, raspored po ljuskama). Načini: istraži (klizač Z i ioni, kućice se
// pune), popuni (učenik dodiruje kućice; provjera redoslijeda, Hundova pravila i broja elektrona), zapiši (učenik
// upiše zapis, npr. „1s2 2s2 2p4“ ili „[Ar] 3d6 4s2“), nespareni (upiše broj nesparenih / valentnih elektrona, broj
// ljusaka ili raspored po ljuskama). Konfiguraciju atoma (redoslijed popunjavanja i iznimke) daje periodni_sustav.js;
// ione, zapise, kućice i poruke za tipične greške računa ovaj modul.
import { parseNumber, isNum } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";
import { PO_SIMBOLU } from "./_tablice.js";
import { orbitale, cesticaOd, dopusteniNaboji, nabojTxt, gornji, glavna, valentni as valentniAtoma } from "./periodni_sustav.js";

const NACINI = ["istrazi", "popuni", "zapisi", "nespareni"];
export const RASPOREDI = ["energija", "ljuske"];
const OBLICI = ["puni", "skraceni", "bilo"];
export const PITAJ = ["nespareni", "valentni", "brojLjusaka", "raspored"];

// Redoslijed popunjavanja (po energiji) do 6s: widget radi s elementima do Ba (Z = 56), bez f-podljuski.
export const POREDAK = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p", "6s"];
export const ORBITALA = { s: 1, p: 3, d: 5 };
const KAP = { s: 2, p: 6, d: 10, f: 14 };
const MAX_Z = 56;
// Iznimke koje se u školi objašnjavaju (napola ili potpuno popunjena d-podljuska); ostale iznimke 5. periode
// (Nb, Ru, Rh, Pd) pravila ne predviđaju, pa ih validate odbija.
const IZNIMKE = {
  Cr: { naivno: { "3d": 4, "4s": 2 }, tekst: "Krom je iznimka: umjesto 3d⁴ 4s² ima 3d⁵ 4s¹. Jedan elektron iz 4s prelazi u 3d, jer je napola popunjena podljuska d (5 elektrona) stabilnija." },
  Cu: { naivno: { "3d": 9, "4s": 2 }, tekst: "Bakar je iznimka: umjesto 3d⁹ 4s² ima 3d¹⁰ 4s¹. Jedan elektron iz 4s prelazi u 3d, jer je potpuno popunjena podljuska d (10 elektrona) stabilnija." },
  Mo: { naivno: { "4d": 4, "5s": 2 }, tekst: "Molibden je iznimka, kao krom iznad njega: umjesto 4d⁴ 5s² ima 4d⁵ 5s¹ (napola popunjena podljuska d)." },
  Ag: { naivno: { "4d": 9, "5s": 2 }, tekst: "Srebro je iznimka, kao bakar iznad njega: umjesto 4d⁹ 5s² ima 4d¹⁰ 5s¹ (potpuno popunjena podljuska d)." },
};
const NEPRAVILNI = ["Nb", "Ru", "Rh", "Pd"];
// Uobičajeni ioni prijelaznih metala (glavne skupine: dopusteniNaboji iz periodni_sustav.js).
const NABOJI_D = { Sc: [3], Ti: [2, 3, 4], V: [2, 3], Cr: [2, 3], Mn: [2], Fe: [2, 3], Co: [2, 3], Ni: [2], Cu: [1, 2], Zn: [2], Y: [3], Zr: [4], Ag: [1], Cd: [2] };
const PLEMENITI = ["He", "Ne", "Ar", "Kr", "Xe"];

const nOd = (k) => Number(k[0]);
const lOd = (k) => "spdf".indexOf(k[1]);
const tipOd = (k) => k[1];
export const poLjuskama = (a, b) => nOd(a) - nOd(b) || lOd(a) - lOd(b);
export const poEnergiji = (a, b) => POREDAK.indexOf(a) - POREDAK.indexOf(b);
const zbroj = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const ocisti = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v > 0));
const jednako = (a, b) => {
  const x = ocisti(a);
  const y = ocisti(b);
  return Object.keys(x).length === Object.keys(y).length && Object.keys(x).every((k) => x[k] === y[k]);
};
const elektronaTxt = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "elektron" : "elektrona"}`;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ── čestica ──
// "Fe", "Fe³⁺", "Cl⁻", "S2-" → {e, naboj}; null ako se ne da pročitati
export const cesticaIz = (t) => cesticaOd(t);
export const zapisCestice = (c) => `${c.e.simbol}${nabojTxt(c.naboj)}`;
export const elektroniCestice = (c) => c.e.z - c.naboj;
export function naboji(e) {
  if (glavna(e)) return dopusteniNaboji(e).filter((q) => e.z - q > 0);
  return NABOJI_D[e.simbol] ?? [];
}
export const dopusten = (e) => e.z <= MAX_Z && !NEPRAVILNI.includes(e.simbol);
export const MAX_Z_ISTRAZI = 36;

// Konfiguracija atoma (s iznimkama Cr, Cu, Mo, Ag) ili iona: {podljuska: broj elektrona}.
function ionOd(atom, naboj) {
  const o = { ...atom };
  if (naboj > 0) {
    // kation gubi najprije elektrone najveće ljuske (4s prije 3d), a u istoj ljusci najprije p pa s
    for (let q = naboj; q > 0; q--) {
      const k = Object.keys(o)
        .filter((x) => o[x] > 0)
        .sort((a, b) => nOd(b) - nOd(a) || lOd(b) - lOd(a))[0];
      o[k]--;
    }
  } else if (naboj < 0) {
    // anion prima elektrone redom popunjavanja
    for (let q = -naboj; q > 0; q--) {
      const k = POREDAK.find((x) => (o[x] ?? 0) < KAP[tipOd(x)]);
      o[k] = (o[k] ?? 0) + 1;
    }
  }
  return ocisti(o);
}
export const podljuskeCestice = (c) => ionOd(orbitale(c.e), c.naboj);
// Kako bi izgledalo bez iznimke (za poruku „krom je iznimka“)
function naivnoCestice(c) {
  const izn = IZNIMKE[c.e.simbol];
  if (!izn) return null;
  return ionOd({ ...orbitale(c.e), ...izn.naivno }, c.naboj);
}
// Kation prijelaznog metala kad učenik ukloni elektrone redom obrnutim od popunjavanja (3d prije 4s)
function krivoUklonjeno(c) {
  if (c.naboj <= 0) return null;
  const o = { ...orbitale(c.e) };
  for (let q = c.naboj; q > 0; q--) {
    const k = [...POREDAK].reverse().find((x) => o[x] > 0);
    o[k]--;
  }
  return ocisti(o);
}

// ── plemeniti plin u zagradi ──
const jezgraO = (simbol) => orbitale(PO_SIMBOLU[simbol]);
const sadrzi = (o, j) => Object.entries(j).every(([k, v]) => o[k] === v);
// Najveći plemeniti plin čija je konfiguracija sadržana u konfiguraciji čestice; za atom samo plin prije njega
// („[Ne] 3s² 3p⁶“ za Ar), a ion jednak plemenitom plinu piše se samo „[Kr]“ (Rb⁺, kao u ispitu).
export function jezgraCestice(c, o = podljuskeCestice(c)) {
  const E = elektroniCestice(c);
  const plinovi = PLEMENITI.filter((p) => PO_SIMBOLU[p].z <= E && (c.naboj !== 0 || PO_SIMBOLU[p].z < c.e.z) && sadrzi(o, jezgraO(p)));
  return plinovi[plinovi.length - 1] ?? null;
}
// Dopuštene jezgre u zapisu: najbliža, a za ion jednak plemenitom plinu i plin prije njega („[He] 2s² 2p⁶“ za Na⁺).
function dopusteneJezgre(c, o) {
  const j = jezgraCestice(c, o);
  const out = j ? [j] : [];
  if (j && c.naboj !== 0 && jednako(o, jezgraO(j))) {
    const i = PLEMENITI.indexOf(j);
    if (i > 0) out.push(PLEMENITI[i - 1]);
  }
  return out;
}

// ── zapis ──
const tokeni = (o, bez = {}) =>
  Object.keys(o)
    .filter((k) => o[k] > 0 && o[k] !== bez[k])
    .sort(poLjuskama)
    .map((k) => `${k}${gornji(o[k])}`);
// "1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²" (po ljuskama, kao u ključu ispita)
export const puniZapis = (o) => tokeni(o).join(" ");
// "[Ar] 3d⁶ 4s²"; "[Ar]" za ion jednak plemenitom plinu; puni zapis kad nema jezgre (H, He, Li⁺ …)
export function skraceniZapis(c, o = podljuskeCestice(c)) {
  const j = jezgraCestice(c, o);
  if (!j) return puniZapis(o);
  return [`[${j}]`, ...tokeni(o, jezgraO(j))].join(" ");
}

const NORM_GORNJI = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
// Učenikov zapis: „1s2 2s2 2p6“, „1s² 2s²“, „1s^2“, „1s22s22p6“, „[Ar] 3d6 4s2“. Vraća {jezgra, podljuske:
// [{k, n}], greska?}. Bez razmaka se čita s vraćanjem: „3d104s2“ = 3d¹⁰ 4s².
export function procitajZapis(t) {
  let s = [...String(t ?? "")].map((ch) => NORM_GORNJI[ch] ?? ch).join("");
  s = s.replace(/\^/g, "").replace(/[{}]/g, "").replace(/\s+/g, "");
  if (!s) return { greska: "prazno" };
  let jezgra = null;
  const m = s.match(/^\[([A-Za-z]{1,2})\]/);
  if (m) {
    const sim = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    if (!PLEMENITI.includes(sim) && sim !== "Rn") return { greska: `U uglatoj zagradi piše se plemeniti plin (He, Ne, Ar, Kr, Xe), a ne ${sim}.` };
    jezgra = sim;
    s = s.slice(m[0].length);
  } else if (/^\[/.test(s)) return { greska: "Zagradu zatvori iza simbola plemenitog plina, npr. [Ar] 4s2." };
  if (/\[/.test(s)) return { greska: "Plemeniti plin u zagradi piše se samo jednom, na početku." };
  const out = [];
  function dalje(i) {
    if (i === s.length) return true;
    const g = s.slice(i).match(/^([1-7])([spdfSPDF])/);
    if (!g) return false;
    const j = i + 2;
    for (const len of [2, 1]) {
      const e = s.slice(j, j + len);
      if (e.length !== len || !/^\d+$/.test(e) || (len === 2 && e[0] === "0")) continue;
      out.push({ k: `${g[1]}${g[2].toLowerCase()}`, n: Number(e) });
      if (dalje(j + len)) return true;
      out.pop();
    }
    return false;
  }
  if (!dalje(0)) {
    if (/^[1-7][spdfSPDF]$|[1-7][spdfSPDF](?=[1-7][spdfSPDF])/.test(s)) return { greska: "Uz svaku podljusku napiši broj elektrona u njoj, npr. 2p6." };
    return { greska: "Ne mogu pročitati zapis. Piši podljusku pa broj elektrona u njoj, jednu za drugom: 1s2 2s2 2p6 (ili s plemenitim plinom: [Ne] 3s1)." };
  }
  if (!jezgra && !out.length) return { greska: "prazno" };
  return { jezgra, podljuske: out };
}

// Zapis za prikaz: tokeni s eksponentom kao Unicode („3d⁶“), za Formula.svelte.
export function tokeniZapisa(z) {
  if (!z || z.greska) return [];
  return [...(z.jezgra ? [`[${z.jezgra}]`] : []), ...z.podljuske.map((p) => `${p.k}${gornji(p.n)}`)];
}

// ── kućice ──
// Stanje kućice: 0 prazna, 1 ↑, 2 ↑↓, 3 ↓
export const STRELICE = ["", "↑", "↑↓", "↓"];
const uKucici = (x) => (x === 2 ? 2 : x === 1 || x === 3 ? 1 : 0);
// Kućice podljuske s n elektrona po Hundovu pravilu: prvo po jedan (↑) u svaku orbitalu, pa parovi.
export function kuciceOd(k, n) {
  const m = ORBITALA[tipOd(k)];
  return Array.from({ length: m }, (_, i) => (n > m + i ? 2 : n > i ? 1 : 0));
}
export const nesparenihU = (k, n) => {
  const m = ORBITALA[tipOd(k)];
  return n <= m ? n : 2 * m - n;
};
export const nespareniOd = (o) => Object.entries(o).reduce((a, [k, n]) => a + nesparenihU(k, n), 0);
export function rasporedPoLjuskama(o) {
  const lj = [];
  for (const [k, n] of Object.entries(o)) if (n > 0) lj[nOd(k) - 1] = (lj[nOd(k) - 1] ?? 0) + n;
  return Array.from(lj, (n) => n ?? 0);
}
// Valentni elektroni: samo neutralan atom glavne skupine (kao u periodnom sustavu)
export const valentniCestice = (c) => (c.naboj === 0 ? valentniAtoma(c.e) : null);

// Jezgra za kućice (jezgra: true): najveći plemeniti plin s manje elektrona od čestice, pa učenik uvijek ima što
// popuniti (K⁺: [Ne], pa 3s i 3p).
export function jezgraKucica(c) {
  const E = elektroniCestice(c);
  const o = podljuskeCestice(c);
  const p = PLEMENITI.filter((x) => PO_SIMBOLU[x].z < E && sadrzi(o, jezgraO(x)));
  return p[p.length - 1] ?? null;
}
// Podljuske s kućicama: sve redom popunjavanja do zadnje zauzete i još dvije iza nje (da redoslijed ne bude
// očit), bez podljuski u jezgri. Isti skup u svakom rasporedu.
export function podljuskePrikaza(s, c = cesticaIz(s.element), viska = 2) {
  const o = podljuskeCestice(c);
  const jez = s.jezgra ? jezgraKucica(c) : null;
  const jo = jez ? jezgraO(jez) : {};
  const zadnja = Math.max(...Object.keys(o).map((k) => POREDAK.indexOf(k)));
  const pod = POREDAK.slice(0, Math.min(POREDAK.length, zadnja + 1 + viska)).filter((k) => !(k in jo));
  return { jezgra: jez, podljuske: pod };
}
const brojKucica = (pod) => pod.reduce((a, k) => a + ORBITALA[tipOd(k)], 0);
export const rasporedOd = (s) => s.raspored ?? (s.nacin === "istrazi" ? "energija" : "ljuske");
// Retci kućica: po energiji (svaka podljuska svoj redak, najniža dolje) ili po ljuskama (redak = ljuska)
export function retci(pod, raspored) {
  if (raspored === "energija") return [...pod].sort(poEnergiji).reverse().map((k) => [k]);
  const r = {};
  for (const k of [...pod].sort(poLjuskama)) (r[nOd(k)] ??= []).push(k);
  return Object.values(r);
}

// ── poruke za krivi broj ili raspored elektrona (zajedničke za popuni i zapiši) ──
function zastoBroj(c, ukupno, sto) {
  const E = elektroniCestice(c);
  const S = zapisCestice(c);
  const q = c.naboj;
  if (q !== 0 && ukupno === c.e.z)
    return `To je ${sto} atoma ${c.e.simbol}. Ion ${S} ${q > 0 ? "izgubio" : "primio"} je ${elektronaTxt(Math.abs(q))}, pa ih ima ${q > 0 ? "manje" : "više"} nego atom.`;
  if (q !== 0 && ukupno === c.e.z + q)
    return `Pogrešan smjer: ${q > 0 ? "pozitivan ion izgubio je elektrone, pa ih ima manje nego protona" : "negativan ion primio je elektrone, pa ih ima više nego protona"}.`;
  const koliko = q === 0 ? `Atom ${S} ima elektrona koliko i protona (Z = ${c.e.z}).` : `${S} ima Z ${q > 0 ? "−" : "+"} ${Math.abs(q)} = ${E} elektrona.`;
  return `Ukupno je ${elektronaTxt(ukupno)}. ${koliko}`;
}
function zastoRaspored(c, o) {
  const t = podljuskeCestice(c);
  if (jednako(o, t)) return null;
  const S = zapisCestice(c);
  const naiv = naivnoCestice(c);
  if (naiv && jednako(o, naiv)) return IZNIMKE[c.e.simbol].tekst;
  const kr = krivoUklonjeno(c);
  if (kr && jednako(o, kr) && !jednako(kr, t)) {
    const vanjska = Object.keys(orbitale(c.e)).filter((k) => tipOd(k) === "s").sort(poLjuskama).pop();
    return `Kation najprije gubi elektrone iz vanjske ljuske: ${S} prvo gubi elektrone iz ${vanjska}, a tek onda iz ${Object.keys(t).filter((k) => tipOd(k) === "d").sort(poLjuskama).pop() ?? "podljuske ispod"}.`;
  }
  // prva podljuska koja nije puna, a neka viša (po energiji) ima elektrona; samo ako toga nema u točnoj konfiguraciji
  for (let i = 0; i < POREDAK.length; i++) {
    const k1 = POREDAK[i];
    if ((o[k1] ?? 0) >= KAP[tipOd(k1)]) continue;
    const k2 = POREDAK.slice(i + 1).find((x) => (o[x] ?? 0) > 0);
    if (!k2) break;
    const uTocnoj = (t[k1] ?? 0) < KAP[tipOd(k1)] && (t[k2] ?? 0) > 0;
    if (uTocnoj) continue;
    return `${k1} se puni prije ${k2}: ima nižu energiju. Viša podljuska dobiva elektrone tek kad je niža puna.`;
  }
  if (c.naboj > 0) return `Kation gubi elektrone najprije iz najveće ljuske (najprije p pa s), a tek onda iz d-podljuske ispod nje.`;
  return "Broj elektrona je dobar, ali nisu dobro raspoređeni. Pazi koliko stane u koju podljusku i kojim se redom pune.";
}

// ── zapiši: provjera zapisa ──
function provjeriZapis(s, unos) {
  const c = cesticaIz(s.element);
  const z = procitajZapis(unos);
  if (z.greska === "prazno") return { tocno: false, poruka: "Upiši zapis konfiguracije, npr. 1s2 2s2 2p6.", prazno: true };
  if (z.greska) return { tocno: false, poruka: z.greska };
  const vidjeno = new Set();
  for (const p of z.podljuske) {
    if (lOd(p.k) >= nOd(p.k)) return { tocno: false, poruka: `Ljuska ${nOd(p.k)} nema podljusku ${tipOd(p.k)}: ljuska n ima n podljuski (1s; 2s 2p; 3s 3p 3d).` };
    if (tipOd(p.k) === "f") return { tocno: false, poruka: "Podljuska f ovdje ne treba: elementi do Ba nemaju elektrona u f." };
    if (p.n > KAP[tipOd(p.k)]) return { tocno: false, poruka: `U podljusku ${tipOd(p.k)} stane najviše ${KAP[tipOd(p.k)]} elektrona (${ORBITALA[tipOd(p.k)]} ${ORBITALA[tipOd(p.k)] === 1 ? "orbitala" : "orbitale"} po 2).` };
    if (p.n === 0) return { tocno: false, poruka: `Podljuska bez elektrona (${p.k}0) se ne piše.` };
    if (vidjeno.has(p.k)) return { tocno: false, poruka: `Podljuska ${p.k} napisana je dvaput: zbroji elektrone u jednu.` };
    vidjeno.add(p.k);
  }
  const jo = z.jezgra ? jezgraO(z.jezgra) : {};
  for (const p of z.podljuske) if (p.k in jo) return { tocno: false, poruka: `${p.k} je već u [${z.jezgra}]: zagrada zamjenjuje sve podljuske plemenitog plina.` };
  const o = { ...jo };
  for (const p of z.podljuske) o[p.k] = p.n;
  const E = elektroniCestice(c);
  if (z.jezgra && PO_SIMBOLU[z.jezgra].z > E) return { tocno: false, poruka: `[${z.jezgra}] ima ${PO_SIMBOLU[z.jezgra].z} elektrona, više nego ${zapisCestice(c)} (${E}). Uzmi plemeniti plin prije.` };
  const uk = zbroj(o);
  if (uk !== E) return { tocno: false, poruka: zastoBroj(c, uk, "zapis") };
  const r = zastoRaspored(c, o);
  if (r) return { tocno: false, poruka: r };
  // dobar raspored: oblik i redoslijed pisanja
  const oblik = s.oblik ?? "bilo";
  const t = podljuskeCestice(c);
  const kan = jezgraCestice(c, t);
  if (oblik === "skraceni" && !z.jezgra && kan) return { tocno: false, poruka: `Raspored je dobar, ali traži se skraćeni zapis: počni plemenitim plinom u uglatoj zagradi, npr. [${kan}].` };
  if (oblik === "puni" && z.jezgra) return { tocno: false, poruka: "Raspored je dobar, ali traži se puni zapis: napiši sve podljuske, bez plemenitog plina u zagradi." };
  if (z.jezgra && !dopusteneJezgre(c, t).includes(z.jezgra))
    return { tocno: false, poruka: `Skraćeni zapis počinje najbližim plemenitim plinom koji stane u česticu: [${kan}], a ne [${z.jezgra}].` };
  const k = z.podljuske.map((p) => p.k);
  const sortirano = (f) => k.every((x, i) => i === 0 || f(k[i - 1], x) < 0);
  if (!sortirano(poLjuskama) && !sortirano(poEnergiji))
    return { tocno: false, poruka: "Broj elektrona u svakoj podljusci je dobar, ali ih piši redom: po ljuskama (… 3d⁶ 4s²) ili redom popunjavanja (… 4s² 3d⁶)." };
  return { tocno: true };
}

// ── popuni: provjera kućica ──
// odgovor: {podljuska: [stanja kućica]} za prikazane podljuske (bez jezgre)
function provjeriKucice(s, odgovor) {
  const c = cesticaIz(s.element);
  const { jezgra, podljuske } = podljuskePrikaza(s, c);
  const st = Object.fromEntries(podljuske.map((k) => [k, [].concat(odgovor?.[k] ?? []).slice(0, ORBITALA[tipOd(k)])]));
  const o = { ...(jezgra ? jezgraO(jezgra) : {}) };
  for (const k of podljuske) o[k] = st[k].reduce((a, x) => a + uKucici(x), 0);
  const ucrtano = podljuske.reduce((a, k) => a + o[k], 0);
  if (!ucrtano) return { tocno: false, poruka: "Dodirni kućice da ucrtaš elektrone.", prazno: true };
  const uk = zbroj(o);
  if (uk !== elektroniCestice(c)) return { tocno: false, poruka: zastoBroj(c, uk, "raspored") };
  const r = zastoRaspored(c, o);
  if (r) return { tocno: false, poruka: r };
  for (const k of podljuske) {
    const x = st[k];
    if (x.length < 2) continue;
    if (x.some((v) => v === 2) && x.some((v) => !v)) return { tocno: false, poruka: `Hundovo pravilo: u ${k} prvo ide po jedan elektron u svaku orbitalu, a tek onda u parove.`, podljuska: k };
    if (x.some((v) => v === 1) && x.some((v) => v === 3)) return { tocno: false, poruka: `Hundovo pravilo: nespareni elektroni u ${k} imaju isti spin, pa sve strelice gledaju na istu stranu.`, podljuska: k };
  }
  return { tocno: true };
}

// ── nespareni: brojčani odgovori ──
export const IME_PITAJ = {
  nespareni: "broj nesparenih elektrona",
  valentni: "broj valentnih elektrona",
  brojLjusaka: "broj ljusaka s elektronima",
  raspored: "raspored po ljuskama",
};
export const pitajOd = (s) => [].concat(s.pitaj ?? []);
export function tocneVrijednosti(s) {
  const c = cesticaIz(s.element);
  const o = podljuskeCestice(c);
  const lj = rasporedPoLjuskama(o);
  return { nespareni: nespareniOd(o), valentni: valentniCestice(c), brojLjusaka: lj.length, raspored: lj };
}
const procitajRaspored = (t) => {
  const d = String(t ?? "")
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (!d.length || !d.every((x) => /^\d+$/.test(x))) return null;
  return d.map(Number);
};
function krivoPolje(s, q, x) {
  const c = cesticaIz(s.element);
  const S = zapisCestice(c);
  const o = podljuskeCestice(c);
  const v = tocneVrijednosti(s);
  const atom = c.naboj !== 0 ? orbitale(c.e) : null;
  const kriva = [];
  const dodaj = (vr, poruka) => vr != null && vr !== v[q] && !kriva.some((k) => k.vrijednost === vr) && kriva.push({ vrijednost: vr, poruka });
  if (q === "nespareni") {
    const djelomicne = Object.keys(o).filter((k) => o[k] < KAP[tipOd(k)]);
    const svi = djelomicne.reduce((a, k) => a + o[k], 0);
    const k = djelomicne.find((x) => o[x] > ORBITALA[tipOd(x)]);
    if (k) dodaj(svi, `Nisu svi elektroni u ${k} nespareni: ${k} ima ${ORBITALA[tipOd(k)]} ${ORBITALA[tipOd(k)] === 1 ? "orbitalu" : ORBITALA[tipOd(k)] < 5 ? "orbitale" : "orbitala"}. Po Hundovu pravilu prvo ide po jedan elektron u svaku, a ostali u parove.`);
    if (atom) dodaj(nespareniOd(atom), `To vrijedi za atom ${c.e.simbol}. Napiši najprije konfiguraciju iona ${S}: ${c.naboj > 0 ? "kation gubi elektrone iz vanjske ljuske" : "anion prima elektrone u prvu nepopunjenu podljusku"}.`);
    const naiv = naivnoCestice(c);
    if (naiv) dodaj(nespareniOd(naiv), IZNIMKE[c.e.simbol].tekst);
    const val = valentniCestice(c);
    if (val != null) dodaj(val, "To je broj valentnih elektrona. Nespareni su samo oni koji u orbitali nemaju para.");
    if (v.nespareni > 0) dodaj(0, `Nije sve u parovima: ${djelomicne.join(" i ")} nije popunjena. Nacrtaj kućice i rasporedi elektrone po Hundovu pravilu.`);
    else dodaj(1, "Sve su podljuske popunjene, pa su svi elektroni u parovima.");
  }
  if (q === "valentni") {
    const g = c.e.skupina;
    if (g >= 13 && c.e.z !== 2) dodaj(g, "To je broj skupine. Valentni su elektroni u vanjskoj ljusci: za skupine 13–18 to je skupina − 10.");
    if (c.e.z === 2) dodaj(8, "Helij ima samo jednu ljusku, a u nju stanu 2 elektrona.");
    dodaj(c.e.z, "To je ukupan broj elektrona. Valentni su samo elektroni u vanjskoj (zadnjoj) ljusci.");
    dodaj(v.brojLjusaka, "To je broj ljusaka (perioda). Valentni su elektroni u vanjskoj ljusci.");
    dodaj(nespareniOd(o), "To je broj nesparenih elektrona. Valentni su svi elektroni vanjske ljuske, i spareni i nespareni.");
  }
  if (q === "brojLjusaka") {
    if (atom) dodaj(rasporedPoLjuskama(atom).length, `To vrijedi za atom ${c.e.simbol}. ${c.naboj > 0 ? `${S} je izgubio elektrone vanjske ljuske${rasporedPoLjuskama(atom).length > v.brojLjusaka ? ", pa mu je ostala jedna ljuska manje" : ""}.` : `${S} je primio elektrone u istu vanjsku ljusku.`}`);
    dodaj(v.raspored[v.raspored.length - 1], "To je broj elektrona u vanjskoj ljusci. Broj ljusaka je najveći n (broj ispred s, p, d) u konfiguraciji.");
  }
  return kriva;
}
function porukaRasporeda(s, x) {
  const c = cesticaIz(s.element);
  const S = zapisCestice(c);
  const v = tocneVrijednosti(s);
  const E = elektroniCestice(c);
  const uk = x.reduce((a, b) => a + b, 0);
  if (c.naboj !== 0 && x.join() === rasporedPoLjuskama(orbitale(c.e)).join())
    return `To je raspored atoma ${c.e.simbol}. Ion ${S} ${c.naboj > 0 ? "izgubio" : "primio"} je ${elektronaTxt(Math.abs(c.naboj))} ${c.naboj > 0 ? "iz vanjske ljuske" : "u vanjsku ljusku"}.`;
  if (uk !== E) return zastoBroj(c, uk, "raspored");
  const i = x.findIndex((n, k) => n > 2 * (k + 1) ** 2);
  if (i >= 0) return `U ${i + 1}. ljusku stane najviše ${2 * (i + 1) ** 2} elektrona (2n²).`;
  if (x.length < v.raspored.length && x[x.length - 1] > 8) return "Vanjska ljuska atoma nema više od 8 elektrona: 4s se puni prije 3d, pa sljedeći elektroni idu u novu ljusku.";
  if (x.length > v.raspored.length) return "Previše ljusaka: popuni najprije unutrašnje ljuske koliko pravila dopuštaju (redom popunjavanja podljuski).";
  return "Raspored nije točan. Napiši konfiguraciju pa zbroji elektrone svake ljuske (sve podljuske s istim brojem n).";
}
const SAVJET = {
  nespareni: "Nacrtaj kućice zadnje nepopunjene podljuske: po Hundovu pravilu prvo ide po jedan elektron u svaku orbitalu.",
  valentni: "Valentni su elektroni u vanjskoj ljusci (s najvećim n).",
  brojLjusaka: "Broj ljusaka je najveći n u konfiguraciji.",
};
function provjeriBrojeve(s, odgovor) {
  const p = pitajOd(s);
  const unos = typeof odgovor === "object" && odgovor ? odgovor : { [p[0]]: odgovor };
  const v = tocneVrijednosti(s);
  for (const q of p) {
    const prazno = !String(unos[q] ?? "").trim();
    if (prazno) return { tocno: false, poruka: p.length > 1 ? `Upiši ${IME_PITAJ[q]}.` : "Upiši odgovor.", prazno: true, polje: q };
  }
  const pre = (q) => (p.length > 1 ? `**${cap(IME_PITAJ[q])}.** ` : "");
  for (const q of p) {
    if (q === "raspored") {
      const x = procitajRaspored(unos[q]);
      if (!x) return { tocno: false, poruka: `${pre(q)}Upiši brojeve elektrona po ljuskama odvojene zarezom, npr. 2, 8, 1.`, polje: q };
      if (x.join() === v.raspored.join()) continue;
      return { tocno: false, poruka: pre(q) + porukaRasporeda(s, x), polje: q };
    }
    const x = parseNumber(String(unos[q]));
    if (x == null) return { tocno: false, poruka: `${pre(q)}Upiši broj.`, polje: q };
    if (x === v[q]) continue;
    const vlastita = (s.krivo ?? []).filter((k) => (k.polje ?? p[0]) === q);
    const hit = [...vlastita, ...krivoPolje(s, q, x)].find((k) => k.vrijednost === x);
    return { tocno: false, poruka: pre(q) + (hit?.poruka ?? s.savjet ?? `Nije točno. ${SAVJET[q]}`), polje: q };
  }
  return { tocno: true };
}

// ── validate ──
const POLJA = {
  istrazi: ["element", "doZ", "raspored", "ljuske"],
  popuni: ["element", "raspored", "jezgra", "savjet"],
  zapisi: ["element", "oblik", "tocno", "savjet"],
  nespareni: ["element", "pitaj", "konfiguracija", "tocno", "krivo", "savjet"],
};
const OPCA = ["tip", "nacin", "tekst"];

function validateCestica(x, need) {
  const c = cesticaIz(x);
  if (!need(!!c, `element „${x}“ nije simbol elementa (s nabojem), npr. "O", "Fe³⁺" ili "Cl⁻"`)) return null;
  const e = c.e;
  if (!need(e.z <= MAX_Z, `${e.simbol} (Z = ${e.z}) je iza Ba: widget radi s elementima do Z = ${MAX_Z} (bez f-podljuski)`)) return null;
  if (!need(!NEPRAVILNI.includes(e.simbol), `${e.simbol} ima iznimnu konfiguraciju koju školska pravila ne predviđaju; od iznimaka su podržane samo Cr, Cu, Mo i Ag`)) return null;
  if (c.naboj !== 0) {
    const n = naboji(e);
    if (!need(n.includes(c.naboj), `${zapisCestice(c)} nije uobičajen ion${n.length ? ` (${e.simbol}: ${n.map((q) => e.simbol + nabojTxt(q)).join(", ")})` : `: ${e.simbol} ovdje nema iona`}`)) return null;
  }
  return c;
}

export const elektronska_konfiguracija = {
  tip: "elektronska_konfiguracija",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Elektronska konfiguracija atoma i iona (do Ba, Z ≤ ${MAX_Z}; bez f): orbitale kao kućice sa strelicama, zapis i ono što se iz njega čita. Sve računa kod: redoslijed popunjavanja (1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s), iznimke Cr, Cu, Mo, Ag (3d⁵ 4s¹, 3d¹⁰ 4s¹ …), ione (kation gubi najprije elektrone najveće ljuske: Fe³⁺ = [Ar] 3d⁵; anion prima u prvu nepopunjenu), plemeniti plin za skraćeni zapis, nesparene elektrone po Hundovu pravilu i raspored po ljuskama.
element: "O", "Fe", "Fe³⁺", "Cl⁻", "S²⁻" (ioni: uobičajeni naboji; Nb, Ru, Rh, Pd se odbijaju). Zapis se prikazuje po ljuskama (1s² … 3d⁶ 4s², kao ključ ispita); učenik smije pisati i redom popunjavanja (… 4s² 3d⁶).
Zajedničko: tekst; raspored?: "energija" (svaka podljuska svoj redak, najniža energija dolje; zadano u istrazi) | "ljuske" (redak = ljuska: 1s | 2s 2p | 3s 3p 3d …; zadano u popuni, jer poredak po energiji odaje redoslijed popunjavanja).
nacin:
- "istrazi" (nije zadatak): klizač Z (1 do doZ?: zadano ${MAX_Z_ISTRAZI}, najviše ${MAX_Z}) i gumbi za uobičajene ione; kućice se pune, uz puni i skraćeni zapis, raspored po ljuskama, nesparene i valentne elektrone, napomenu za iznimku ili ion te model ljuski (ljuske?: false ga skriva). element?: početna čestica.
- "popuni": učenik dodiruje kućice (prazno → ↑ → ↑↓ → ↓ → prazno), pa Provjeri. Prikazane su podljuske redom popunjavanja do zadnje zauzete i još dvije iza nje (npr. za K i 3d i 4p). jezgra?: true – unutrašnji elektroni kao [Ar] (prikazano, ne popunjava se), za veće atome. Poruke: krivi broj elektrona (atom umjesto iona, krivi smjer naboja), 4s se puni prije 3d, kation gubi 4s prije 3d, iznimka Cr/Cu, Hundovo pravilo (prvo po jedan u svaku orbitalu; isti spin).
- "zapisi": učenik upiše zapis u jedno polje („1s2 2s2 2p4“, „1s² 2s²“ ili „[Ar] 3d6 4s2“; pregled s eksponentima dok piše). oblik?: "bilo" (zadano) | "puni" | "skraceni". tocno?: zapis (ako ga autor upiše, mora se slagati s kodom). Poruke: nepostojeća podljuska (2d), previše elektrona u podljusci, krivi zbroj, redoslijed, iznimka, ion, krivi plemeniti plin.
- "nespareni": pitaj: jedno ili popis od ${PITAJ.join(", ")} (raspored = „2, 8, 8“; valentni samo za neutralan atom glavne skupine). konfiguracija?: true – zadani zapis čestice prikazan je uz pitanje (za „iz konfiguracije odredi …“). tocno?: broj ili {polje: broj}; krivo?: [{polje?, vrijednost, poruka}]. Poruke: svi elektroni nepopunjene podljuske umjesto nesparenih, valentni umjesto nesparenih, atom umjesto iona, iznimka, skupina umjesto valentnih, vanjska ljuska s više od 8.`,
  primjer: {
    tip: "elektronska_konfiguracija",
    nacin: "istrazi",
    tekst: "Pomiči klizač i gledaj kako elektroni pune orbitale. Kod kalija (Z = 19) zadnji elektron ne ide u 3d, nego u 4s. Isprobaj i ione željeza.",
    element: "Fe",
  },
  primjeri: [
    {
      tip: "elektronska_konfiguracija",
      nacin: "istrazi",
      tekst: "Kućice su poredane po ljuskama. Usporedi atom Fe i ione Fe²⁺ i Fe³⁺: iz koje podljuske odlaze elektroni?",
      element: "Fe",
      raspored: "ljuske",
      ljuske: false,
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "popuni",
      tekst: "Ucrtaj elektrone atoma kisika u kućice.",
      element: "O",
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "popuni",
      tekst: "Ucrtaj elektrone atoma kalija (Z = 19) u kućice.",
      element: "K",
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "popuni",
      tekst: "Unutrašnji elektroni željeza već su ucrtani kao [Ar]. Ucrtaj ostale elektrone iona Fe³⁺.",
      element: "Fe³⁺",
      jezgra: true,
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "zapisi",
      tekst: "Napiši elektronsku konfiguraciju atoma kalcija.",
      element: "Ca",
      oblik: "puni",
      tocno: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s²",
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "zapisi",
      tekst: "Napiši skraćenu elektronsku konfiguraciju iona Fe³⁺.",
      element: "Fe³⁺",
      oblik: "skraceni",
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "zapisi",
      tekst: "Napiši elektronsku konfiguraciju atoma srebra.",
      element: "Ag",
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "zapisi",
      tekst: "Napiši elektronsku konfiguraciju sulfidnog iona S²⁻.",
      element: "S²⁻",
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "nespareni",
      tekst: "Koliko nesparenih elektrona ima atom željeza u osnovnom stanju?",
      element: "Fe",
      pitaj: "nespareni",
      konfiguracija: true,
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "nespareni",
      tekst: "Kakav je raspored elektrona po ljuskama iona Ca²⁺?",
      element: "Ca²⁺",
      pitaj: "raspored",
    },
    {
      tip: "elektronska_konfiguracija",
      nacin: "nespareni",
      tekst: "Koliko valentnih i koliko nesparenih elektrona ima atom kisika?",
      element: "O",
      pitaj: ["valentni", "nespareni"],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `elektronska_konfiguracija.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "elektronska_konfiguracija treba „tekst“");
    const dopustena = [...OPCA, ...POLJA[s.nacin]];
    for (const f of Object.keys(s)) need(dopustena.includes(f), `polje „${f}“ ne postoji u načinu ${s.nacin} (dopuštena: ${dopustena.join(", ")})`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.raspored != null) need(RASPOREDI.includes(s.raspored), 'raspored mora biti "energija" ili "ljuske"');
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    if (list.length) return list;

    if (s.nacin === "istrazi") {
      if (s.doZ != null) need(Number.isInteger(s.doZ) && s.doZ >= 2 && s.doZ <= MAX_Z, `doZ je cijeli broj 2–${MAX_Z}`);
      if (s.ljuske != null) need(typeof s.ljuske === "boolean", "ljuske mora biti true ili false");
      if (s.element != null) {
        const c = validateCestica(s.element, need);
        if (c && Number.isInteger(s.doZ)) need(c.e.z <= s.doZ, `element ${c.e.simbol} (Z = ${c.e.z}) je iza doZ = ${s.doZ}`);
        else if (c && s.doZ == null) need(c.e.z <= MAX_Z_ISTRAZI, `element ${c.e.simbol} (Z = ${c.e.z}) je iza zadanog klizača (do Z = ${MAX_Z_ISTRAZI}): stavi doZ`);
      }
      return list;
    }

    if (!need(s.element != null, `način ${s.nacin} treba element`)) return list;
    const c = validateCestica(s.element, need);
    if (!c) return list;
    const E = elektroniCestice(c);
    if (!need(E > 0, `${zapisCestice(c)} nema elektrona`)) return list;

    if (s.nacin === "popuni") {
      if (s.jezgra != null) need(typeof s.jezgra === "boolean", "jezgra mora biti true ili false");
      if (s.jezgra) need(jezgraKucica(c) != null, `${zapisCestice(c)} ima premalo elektrona za jezgru plemenitog plina: makni jezgra`);
      if (list.length) return list;
      const n = brojKucica(podljuskePrikaza(s, c).podljuske);
      need(n <= 24, `za ${zapisCestice(c)} bilo bi ${n} kućica, previše za mobitel: stavi jezgra: true`);
    }

    if (s.nacin === "zapisi") {
      if (s.oblik != null) need(OBLICI.includes(s.oblik), `oblik mora biti jedan od: ${OBLICI.join(", ")}`);
      if (s.oblik === "skraceni") need(jezgraCestice(c) != null, `${zapisCestice(c)} nema plemeniti plin prije sebe: skraćeni zapis ne postoji, makni oblik`);
      if (s.tocno != null) {
        if (need(isText(s.tocno), "tocno mora biti zapis (tekst)")) {
          const r = provjeriZapis({ ...s, oblik: "bilo" }, s.tocno);
          need(r.tocno, `tocno „${s.tocno}“ ne slaže se s konfiguracijom ${zapisCestice(c)} (${puniZapis(podljuskeCestice(c))}): ${r.poruka ?? ""}`);
        }
      }
    }

    if (s.nacin === "nespareni") {
      const p = pitajOd(s);
      if (!need(p.length >= 1 && p.length <= 4 && p.every((q) => PITAJ.includes(q)) && new Set(p).size === p.length, `pitaj je jedno ili popis 1–4 različita od: ${PITAJ.join(", ")}`)) return list;
      if (p.includes("valentni")) {
        need(glavna(c.e), `valentni elektroni prijelaznog metala (${c.e.simbol}) nisu jednoznačni (u vezi sudjeluju i d-elektroni): pitaj za element glavne skupine`);
        need(c.naboj === 0, "valentni elektroni pitaju se za neutralan atom, ne za ion");
      }
      if (s.konfiguracija != null) need(typeof s.konfiguracija === "boolean", "konfiguracija mora biti true ili false");
      if (list.length) return list;
      const v = tocneVrijednosti(s);
      if (s.tocno != null) {
        const t = typeof s.tocno === "object" && !Array.isArray(s.tocno) ? s.tocno : p.length === 1 ? { [p[0]]: s.tocno } : null;
        if (need(t != null, "tocno je broj (kad se pita jedno) ili {polje: vrijednost}"))
          for (const [q, x] of Object.entries(t)) {
            if (!need(p.includes(q), `tocno.${q} nije među pitaj`)) continue;
            const ok = q === "raspored" ? [].concat(x).join() === v.raspored.join() || procitajRaspored(x)?.join() === v.raspored.join() : Number(x) === v[q];
            need(ok, `tocno.${q} = ${x}, a kod računa ${q === "raspored" ? v.raspored.join(", ") : v[q]}`);
          }
      }
      if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis"))
        s.krivo.forEach((k, i) => {
          const q = k?.polje ?? (p.length === 1 ? p[0] : null);
          if (!need(p.includes(q) && q !== "raspored", `krivo[${i}].polje mora biti jedno od pitaj (brojčano, ne raspored)`)) return;
          if (need(isNum(k?.vrijednost) && isText(k?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`)) need(k.vrijednost !== v[q], `krivo[${i}].vrijednost je točan odgovor`);
        });
    }
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "popuni") return provjeriKucice(s, odgovor);
    if (s.nacin === "zapisi") return provjeriZapis(s, odgovor);
    if (s.nacin === "nespareni") return provjeriBrojeve(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  tocanOdgovor(s) {
    const c = cesticaIz(s.element);
    if (!c) return "";
    const o = podljuskeCestice(c);
    const S = zapisCestice(c);
    if (s.nacin === "popuni") {
      const nesp = nespareniOd(o);
      return `${S}: ${puniZapis(o)} (nesparenih elektrona: ${nesp})`;
    }
    if (s.nacin === "zapisi") {
      const ob = s.oblik ?? "bilo";
      const sk = skraceniZapis(c, o);
      if (ob === "puni" || sk === puniZapis(o)) return puniZapis(o);
      if (ob === "skraceni") return sk;
      return `${puniZapis(o)} ili ${sk}`;
    }
    if (s.nacin === "nespareni") {
      const v = tocneVrijednosti(s);
      return pitajOd(s)
        .map((q) => `${IME_PITAJ[q]}: ${q === "raspored" ? v.raspored.join(", ") : v[q]}`)
        .join("; ");
    }
    return "";
  },
};

// za prikaz
export const iznimkaTekst = (e) => IZNIMKE[e.simbol]?.tekst ?? null;
export function ionTekst(c) {
  if (!c || c.naboj === 0) return null;
  const S = zapisCestice(c);
  const atom = orbitale(c.e);
  const ion = podljuskeCestice(c);
  const promjena = Object.keys({ ...atom, ...ion })
    .filter((k) => (atom[k] ?? 0) !== (ion[k] ?? 0))
    .sort(c.naboj > 0 ? (a, b) => nOd(b) - nOd(a) || lOd(b) - lOd(a) : poEnergiji)
    .map((k) => `${Math.abs((atom[k] ?? 0) - (ion[k] ?? 0))} ${c.naboj > 0 ? "iz" : "u"} ${k}`);
  if (c.naboj > 0) return `${S}: atom ${c.e.simbol} gubi ${elektronaTxt(c.naboj)}, najprije iz najveće ljuske (${promjena.join(", pa ")}).`;
  return `${S}: atom ${c.e.simbol} prima ${elektronaTxt(-c.naboj)} u prvu nepopunjenu podljusku (${promjena.join(", ")}) i dobiva konfiguraciju plemenitog plina.`;
}
export { gornji, KAP };
