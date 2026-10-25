// molekula: strukturna i Lewisova formula molekule ili iona. Učenik je istražuje (dodir atoma pokaže valentne
// elektrone i oktet, prekidači za nevezne parove, oblik po VSEPR-u, numeraciju lanca i asimetrični C), slaže Lewisovu
// formulu (nevezni parovi i red veza dok svi atomi nemaju oktet), bira oblik i polarnost ili dodirom označi atome
// (asimetrični C, glavni lanac, C-atom 1, atome funkcijske skupine, atome s neveznim parom).
//
// Atomi i veze su isti kao u skici „strukturna_formula“ (taskSketch.js: simbol, x, y, nevezni, prsten, uz, broj,
// istaknut), pa se molekula iz objašnjenja prenese u lekciju bez prepisivanja; raspored (prsten, „uz“), crtanje veza i
// smjer neveznih parova dijele isti kod. Jednostavne čestice (H₂O, NH₃, CO₂, SO₄²⁻…) kod složi sam iz „formula“.
// Kemija (valentni elektroni po skupini iz _tablice.js, oktet, prošireni oktet, VSEPR, polarnost, asimetrični C,
// glavni lanac i numeracija) računa se ovdje; formalni naboj se ne računa ni ne prikazuje (nije u gradivu), naboj
// iona da.
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";
import { formatNumber } from "../../core/number.js";
import { atomiOd, nabojOd, element } from "./_tablice.js";
import { structureLayout, labelHalfWidth, freePairDirection, pairDots, bondParts } from "../../../sketch/taskSketch.js";

const NACINI = ["istrazi", "parovi", "oblik", "oznaci"];
const POLJA = [
  "tip", "nacin", "tekst", "formula", "atomi", "veze", "prsten", "naboj", "en", "sredisnji", "mijenja", "pitaj", "oblik",
  "polarna", "trazi", "tocno", "krivo", "prikazi", "vidi_parove", "istakni",
];
const POLJA_ATOMA = ["id", "simbol", "x", "y", "uz", "nevezni", "broj", "istaknut"];
export const TRAZI = [
  "asimetricni_c", "slobodni_par", "lanac", "c1", "hidroksilna", "karboksilna", "karbonilna", "aldehidna", "ketonska",
  "eterska", "esterska", "amino", "amidna", "halogen", "dvostruka_veza", "trostruka_veza", "zadano",
];
export const PRIKAZI = ["parovi", "oblik", "numeracija", "asimetricni"];
const PITAJ = ["oblik", "polarnost"];
export const NAJVISE_PAROVA = 4;

// ── elementi ──
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n) => (n > 1 ? [...String(n)].map((c) => SUB[c]).join("") : "");
const veliko = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Valentni elektroni glavnih skupina: skupina 1–2 → 1–2, 13–18 → 3–8 (He 2). null za prijelazne metale.
export function valentni(el) {
  const e = element(el);
  if (!e || e.skupina == null) return null;
  if (e.z === 2) return 2;
  if (e.skupina <= 2) return e.skupina;
  if (e.skupina >= 13) return e.skupina - 10;
  return null;
}
// Prošireni oktet (10 ili 12 elektrona) smiju nemetali od 3. periode (P, S, Cl, Br, I, Xe…), kao u ključu mature.
const prosiriv = (el) => {
  const e = element(el);
  return !!e && e.perioda >= 3 && e.skupina >= 14 && e.skupina <= 18;
};
const MANJAK = { Be: [4], B: [6, 8], Al: [6, 8] }; // elektronski manjak: BeCl₂, BF₃, AlCl₃
export const dozvoljeno = (el) => (el === "H" ? [2] : (MANJAK[el] ?? (prosiriv(el) ? [8, 10, 12] : [8])));
const VALENCIJA = { H: 1, B: 3, Al: 3, Be: 2, C: 4, Si: 4, N: 3, P: 3, As: 3, O: 2, S: 2, Se: 2, F: 1, Cl: 1, Br: 1, I: 1 };
function valencija(el, q) {
  const v = VALENCIJA[el];
  if (v == null) return null;
  if (!q) return v;
  if (["N", "P", "O", "S"].includes(el)) return v + q;
  if (el === "C") return 3;
  if (el === "B") return v - q;
  return null;
}
const dopusten = (el) => {
  const e = element(el);
  return !!e && valentni(el) != null && (e.vrsta !== "metal" || el === "Be" || el === "Al");
};
export const naziv = (el) => element(el)?.naziv ?? el;
const HALOGENI = { F: "fluor", Cl: "klor", Br: "brom", I: "jod" };

// ── naboj ──
export function nabojIz(v) {
  if (v == null || v === "" || v === 0) return 0;
  if (typeof v === "number") return Number.isInteger(v) ? v : NaN;
  const t = String(v).trim().replace(/-/g, "−");
  if (/^[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]$/.test(t)) return nabojOd(t);
  if (!/^\d*[+−]$/.test(t)) return NaN;
  return nabojOd(t);
}
export const zapisNaboja = (q) => (q === 0 ? "" : `${Math.abs(q) === 1 ? "" : Math.abs(q)}${q > 0 ? "+" : "−"}`);
// isti naboj Unicode eksponentima (za Formula.svelte): −2 → „²⁻“
const GORNJI = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const gornjiNaboj = (q) => (q === 0 ? "" : `${Math.abs(q) === 1 ? "" : [...String(Math.abs(q))].map((c) => GORNJI[c]).join("")}${q > 0 ? "⁺" : "⁻"}`);

// ── oznaka atoma → čvorovi (atomi bez vodika) ──
// Oznaka je simbol elementa („O“), "" (kut kosturne formule: C s vodicima koji se ne pišu) ili skupina iz sažete
// formule („CH₃“, „OH“, „HO“, „COOH“, „CH(CH₃)₂“, „C₂H₅“, „NH₃⁺“, „COO⁻“). R i nepoznati alkili (C₁₇H₃₃) su
// jednovalentni ostatak bez kemije. Vraća {c: [[el, h, q]], v: [[i, j, red]], spoj: 0 | "kraj" | "geom", ostatak?}.
const PREDLOSCI = {
  HOOC: { c: [["C", 0, 0], ["O", 0, 0], ["O", 1, 0]], v: [[0, 1, 2], [0, 2, 1]], spoj: 0 },
  OHC: { c: [["C", 1, 0], ["O", 0, 0]], v: [[0, 1, 2]], spoj: 0 },
  "−OOC": { c: [["C", 0, 0], ["O", 0, 0], ["O", 0, -1]], v: [[0, 1, 2], [0, 2, 1]], spoj: 0 },
  NC: { c: [["C", 0, 0], ["N", 0, 0]], v: [[0, 1, 3]], spoj: 0 },
  CN: { c: [["C", 0, 0], ["N", 0, 0]], v: [[0, 1, 3]], spoj: 0 },
  NO2: { c: [["N", 0, 1], ["O", 0, 0], ["O", 0, -1]], v: [[0, 1, 2], [0, 2, 1]], spoj: 0 },
  O2N: { c: [["N", 0, 1], ["O", 0, 0], ["O", 0, -1]], v: [[0, 1, 2], [0, 2, 1]], spoj: 0 },
  H2NOC: { c: [["C", 0, 0], ["O", 0, 0], ["N", 2, 0]], v: [[0, 1, 2], [0, 2, 1]], spoj: 0 },
};
const ALKIL = ["metil", "etil", "propil", "butil", "pentil", "heksil", "heptil", "oktil"];

function sazeto(t) {
  // t: ASCII (indeksi kao znamenke), bez naboja. Posebni dijelovi sažete formule: COOH, COO (ester), CHO, CO, CN.
  const c = [];
  const v = [];
  let cur = -1;
  let vodici = 0;
  let pos = 0;
  const naCekanju = []; // ogranci ispred prvog atoma: „(CH₃)₂CH“
  const ogranak = (g, n, na) => {
    for (let r = 0; r < n; r++) {
      const off = c.length;
      c.push(...g.c.map((x) => [...x]));
      v.push(...g.v.map(([a, b, o]) => [a + off, b + off, o]));
      v.push([na, off, 1]);
    }
  };
  const dodaj = (el, h = 0, q = 0) => {
    c.push([el, h, q]);
    const k = c.length - 1;
    if (naCekanju.length) for (const x of naCekanju.splice(0)) ogranak(x.g, x.n, k);
    return k;
  };
  const veza = (a, b, red = 1) => v.push([a, b, red]);
  while (pos < t.length) {
    const ostatak = t.slice(pos);
    let m;
    if (ostatak.startsWith("COOH")) {
      const k = dodaj("C");
      veza(k, dodaj("O"), 2);
      veza(k, dodaj("O", 1));
      if (cur >= 0) veza(cur, k);
      cur = k;
      pos += 4;
    } else if (ostatak.startsWith("COO")) {
      const k = dodaj("C");
      veza(k, dodaj("O"), 2);
      const o = dodaj("O");
      veza(k, o);
      if (cur >= 0) veza(cur, k);
      cur = o;
      pos += 3;
    } else if (ostatak === "CHO") {
      const k = dodaj("C", 1);
      veza(k, dodaj("O"), 2);
      if (cur >= 0) veza(cur, k);
      cur = k;
      pos += 3;
    } else if (/^CO(?!O)/.test(ostatak) && cur >= 0) {
      const k = dodaj("C");
      veza(k, dodaj("O"), 2);
      veza(cur, k);
      cur = k;
      pos += 2;
    } else if (ostatak === "CN" && cur >= 0) {
      const k = dodaj("C");
      veza(k, dodaj("N"), 3);
      veza(cur, k);
      cur = k;
      pos += 2;
    } else if ((m = /^([A-Z][a-z]?)(\d*)/.exec(ostatak))) {
      const n = m[2] ? Number(m[2]) : 1;
      pos += m[0].length;
      if (m[1] === "H") {
        if (cur < 0) vodici += n;
        else c[cur][1] += n;
        continue;
      }
      if (!element(m[1]) || n !== 1) return null;
      const k = dodaj(m[1]);
      if (cur >= 0) veza(cur, k);
      cur = k;
    } else if ((m = /^\(([^()]*)\)(\d*)/.exec(ostatak))) {
      pos += m[0].length;
      const g = sazeto(m[1]);
      if (!g || g.vodici || vodici) return null;
      if (cur < 0) naCekanju.push({ g, n: m[2] ? Number(m[2]) : 1 });
      else ogranak(g, m[2] ? Number(m[2]) : 1, cur);
    } else return null;
  }
  if (!c.length || naCekanju.length) return null;
  if (vodici) c[0][1] += vodici;
  return { c, v, vodici };
}

const SPREMNIK_SKUPINA = new Map();
export function skupina(oznaka) {
  if (SPREMNIK_SKUPINA.has(oznaka)) return SPREMNIK_SKUPINA.get(oznaka);
  const g = citajSkupinu(oznaka);
  SPREMNIK_SKUPINA.set(oznaka, g);
  return g;
}
function citajSkupinu(oznaka) {
  if (typeof oznaka !== "string") return null;
  const o = oznaka.trim();
  if (o === "") return { c: [["C", 0, 0]], v: [], spoj: 0, kostur: true };
  // naboj na kraju („NH₃⁺“, „COO⁻“) ili na početku („⁻OOC“)
  const kraj = /[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]$/.exec(o);
  const pocetak = !kraj && /^[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]/.exec(o);
  const q = kraj ? nabojOd(kraj[0]) : pocetak ? nabojOd(pocetak[0]) : 0;
  let t = o.slice(pocetak ? pocetak[0].length : 0, kraj ? o.length - kraj[0].length : o.length);
  t = [...t].map((ch) => (SUB.includes(ch) ? String(SUB.indexOf(ch)) : ch)).join("");
  if (t === "H") return { c: [["H", 0, q]], v: [], spoj: 0 };
  if (/^R\d*[′']*$/.test(t)) return { c: [["R", 0, 0]], v: [], spoj: 0, ostatak: true };
  const kljuc = (pocetak ? "−" : "") + t;
  if (PREDLOSCI[kljuc]) {
    const p = PREDLOSCI[kljuc];
    return { c: p.c.map((x) => [...x]), v: p.v.map((x) => [...x]), spoj: p.spoj };
  }
  if (q && t === "COO") return { c: [["C", 0, 0], ["O", 0, 0], ["O", 0, q]], v: [[0, 1, 2], [0, 2, 1]], spoj: 0 };
  const alk = /^C(\d+)H(\d+)$/.exec(t);
  if (alk && Number(alk[1]) >= 2) {
    const n = Number(alk[1]);
    if (Number(alk[2]) !== 2 * n + 1) return { c: [["R", 0, 0]], v: [], spoj: 0, ostatak: true }; // nezasićen ostatak
    const c = Array.from({ length: n }, (_, i) => ["C", i === n - 1 ? 3 : 2, 0]);
    const v = Array.from({ length: n - 1 }, (_, i) => [i, i + 1, 1]);
    return { c, v, spoj: 0, alkil: n };
  }
  const g = sazeto(t);
  if (!g) return null;
  if (q) g.c[g.vodici ? 0 : g.c.length - 1][2] += q;
  return { c: g.c, v: g.v, spoj: g.c.length === 1 ? 0 : "slobodni" };
}

// ── jednostavne čestice iz formule ──
// Jedan središnji atom (najmanje elektronegativan, osim H) okružen ostalima (AXₙ), ili dvoatomna čestica. Najprije
// jednostruke veze i okteti krajnjih atoma, ostatak elektrona na središnji atom; dok središnji atom nema oktet,
// krajnji O, S, N ili C pretvori nevezni par u vezu. S i P s kisikom dobiju dvostruke veze do proširenog okteta, kao
// u ključu mature (PO₄³⁻: jedna P=O; SO₃²⁻: jedna S=O i nevezni par na S). Oksokiseline (H na kisiku), lanci i
// čestice s više jednakih „središnjih“ atoma (O₃, N₂O, H₂O₂) se ne slažu sami: tada autor zadaje atome i veze.
const SLOTOVI_LEWIS = { 1: [0], 2: [180, 0], 3: [180, 0, 270], 4: [180, 0, 90, 270], 5: [90, 162, 234, 306, 18], 6: [0, 60, 120, 180, 240, 300] };
const VISESTRUKO = ["O", "S", "N", "C", "Se"]; // krajnji atomi koji smiju dati par za višestruku vezu
export function izFormule(formula) {
  const sastav = atomiOd(formula);
  if (!sastav) return { greska: `formula „${formula}“ se ne da pročitati (indeksi ₀–₉, naboj gore, npr. SO₄²⁻)` };
  const Q = nabojOd(formula);
  const elementi = Object.keys(sastav);
  for (const el of elementi) if (!dopusten(el)) return { greska: `${naziv(el)} (${el}) nije nemetal: ionski spoj nije molekula, crtaj samo ion` };
  const ukupno = Object.values(sastav).reduce((a, b) => a + b, 0);
  const V = elementi.reduce((t, el) => t + sastav[el] * valentni(el), 0) - Q;
  const nije = (zasto) => ({ greska: `formula „${formula}“: ${zasto}; zadaj atome i veze` });
  if (V % 2) return nije("neparan broj elektrona (radikal) se ne crta");
  if (ukupno === 1) return nije("jedan atom nije molekula");
  if (ukupno === 2) {
    const [a, b] = elementi.length === 2 ? elementi : [elementi[0], elementi[0]];
    for (const red of [1, 2, 3]) {
      if ((a === "H" || b === "H") && red > 1) break;
      const lp = (el) => (el === "H" ? 0 : 4 - red);
      if (2 * red + 2 * (lp(a) + lp(b)) === V)
      {
        const [ia, ib] = a === b ? [`${a}1`, `${b}2`] : [a, b];
        return { atomi: [{ id: ia, simbol: a, x: 0, y: 0 }, { id: ib, simbol: b, x: 1, y: 0 }], veze: [[ia, ib, red]] };
      }
    }
    return nije("dvoatomna čestica bez okteta oba atoma");
  }
  const bezH = elementi.filter((el) => el !== "H");
  if (!bezH.length) return nije("nema središnjeg atoma");
  const en = (el) => element(el)?.en ?? 9;
  const sredisnji = bezH.reduce((m, el) => (en(el) < en(m) ? el : m), bezH[0]);
  if (sastav[sredisnji] !== 1) return nije(`nema jednog središnjeg atoma (${sredisnji} je ${sastav[sredisnji]} puta)`);
  if (ukupno > 7) return nije("više od 6 atoma oko središnjeg");
  if (sastav.H && sastav.O && sredisnji !== "O") return nije("vodik je u oksokiselinama vezan na kisik, ne na središnji atom");
  if (["Cl", "Br", "I"].includes(sredisnji) && sastav.O) return nije("oksoanioni klora, broma i joda crtaju se različito");
  if (MANJAK[sredisnji] && elementi.some((el) => el !== sredisnji && !["H", "F", "Cl", "Br", "I"].includes(el))) return nije("nema pouzdane strukture");
  // krajnji atomi: najveća skupina jednakih na suprotne strane
  const krajnji = elementi
    .filter((el) => el !== sredisnji)
    .sort((x, y) => sastav[y] - sastav[x])
    .flatMap((el) => Array.from({ length: sastav[el] }, () => el));
  const n = krajnji.length;
  const red = krajnji.map(() => 1);
  const lpK = krajnji.map((el) => (el === "H" ? 0 : 3));
  let R = V - 2 * n - 2 * lpK.reduce((a, b) => a + b, 0);
  if (R < 0) return nije(`premalo elektrona za oktete krajnjih atoma${Q ? "" : " (ako je ion, piši naboj u formuli, npr. CO₃²⁻)"}`);
  let lpS = R / 2;
  const ljuska = () => 2 * (red.reduce((a, b) => a + b, 0) + lpS);
  const pretvori = (i) => {
    red[i]++;
    lpK[i]--;
  };
  const kandidat = (uvjet) => {
    let best = -1;
    for (const el of VISESTRUKO)
      krajnji.forEach((e, i) => {
        if (best >= 0 || e !== el || lpK[i] <= 0 || !uvjet(i)) return;
        const min = Math.min(...krajnji.map((x, j) => (x === el && lpK[j] > 0 ? red[j] : 9)));
        if (red[i] === min) best = i;
      });
    return best;
  };
  if (!MANJAK[sredisnji]) {
    while (ljuska() < 8) {
      const i = kandidat(() => true);
      if (i < 0) return nije(`${naziv(sredisnji)} ne može dobiti oktet`);
      pretvori(i);
    }
  }
  if (ljuska() > 8 && !prosiriv(sredisnji)) return nije(`${naziv(sredisnji)} bi imao više od 8 elektrona`);
  if (ljuska() > 12) return nije("više od 12 elektrona oko središnjeg atoma");
  if (["S", "P"].includes(sredisnji)) {
    const fn = () => valentni(sredisnji) - 2 * lpS - red.reduce((a, b) => a + b, 0);
    while (fn() > 0 && ljuska() + 2 <= 12) {
      const i = kandidat((j) => krajnji[j] === "O" && red[j] === 1);
      if (i < 0) break;
      pretvori(i);
    }
  }
  const idS = sredisnji;
  const brojac = {};
  const atomi = [{ id: idS, simbol: sredisnji, x: 0, y: 0 }];
  const veze = [];
  const slot = SLOTOVI_LEWIS[n];
  krajnji.forEach((el, i) => {
    brojac[el] = (brojac[el] ?? 0) + 1;
    const id = `${el}${brojac[el]}`;
    const t = (slot[i] * Math.PI) / 180;
    atomi.push({ id, simbol: el, x: Math.round(Math.cos(t) * 1000) / 1000, y: Math.round(Math.sin(t) * 1000) / 1000 });
    veze.push([idS, id, red[i]]);
  });
  return { atomi, veze };
}

// ── model molekule ──
const SPREMNIK = new WeakMap();
export function model(s) {
  if (s && typeof s === "object" && SPREMNIK.has(s)) return SPREMNIK.get(s);
  let m;
  try {
    m = gradi(s);
  } catch (e) {
    m = { greska: `molekula se ne može složiti: ${e.message}` };
  }
  if (s && typeof s === "object") SPREMNIK.set(s, m);
  return m;
}

function gradi(s) {
  let atomi = s.atomi;
  let veze = s.veze ?? [];
  const auto = atomi == null;
  if (auto) {
    if (!isText(s.formula)) return { greska: "molekula treba „formula“ (jednostavna čestica) ili „atomi“ i „veze“" };
    const a = izFormule(s.formula.trim());
    if (a.greska) return a;
    ({ atomi, veze } = a);
  }
  if (!Array.isArray(atomi) || !atomi.length) return { greska: "atomi mora biti popis atoma" };
  if (!Array.isArray(veze)) return { greska: "veze mora biti popis [a, b, red]" };
  for (const a of atomi) {
    if (!a || typeof a !== "object") return { greska: "svaki atom je objekt {id, simbol, x, y}" };
    if (typeof a.simbol !== "string") return { greska: `atom ${a.id} treba „simbol“ (element, "" za kut kosturne formule ili skupina kao CH₃)` };
  }
  for (const b of veze) {
    const red = Array.isArray(b) ? b[2] : b?.red;
    if (red === "vodikova") return { greska: "vodikova veza nije veza unutar molekule (za nju je skica strukturna_formula)" };
  }
  const L = structureLayout({ atomi, veze, prsten: s.prsten });
  if (L.greska) return { greska: L.greska };
  for (const r of [].concat(s.prsten ?? [])) if (r.krug) return { greska: "krug u prstenu nije podržan: nacrtaj izmjenične dvostruke veze" };

  // čvorovi: atomi bez vodika (vodici skupina i kosturnih kutova su broj h na čvoru)
  const cv = [];
  const E = [];
  const atomiM = L.atoms.map((a) => {
    const g = skupina(a.simbol);
    if (!g) return { a, greska: `atom ${a.id}: „${a.simbol}“ nije element ni skupina koju kod zna (npr. CH₃, OH, COOH, C₂H₅)` };
    for (const [el] of g.c) if (el !== "R" && !dopusten(el)) return { a, greska: `atom ${a.id}: ${naziv(el)} (${el}) nije nemetal; ionski spoj nije molekula` };
    const off = cv.length;
    g.c.forEach(([el, h, q]) => cv.push({ el, h, q, atom: a.id, ostatak: el === "R", oznaka: a.simbol }));
    g.v.forEach(([i, j, red]) => E.push({ i: i + off, j: j + off, red, k: null }));
    const golo = g.c.length === 1 && !g.kostur && !g.ostatak && g.c[0][1] === 0;
    return { a, g, off, cvorovi: g.c.map((_, i) => i + off), golo, kostur: !!g.kostur };
  });
  const losi = atomiM.find((x) => x.greska);
  if (losi) return { greska: losi.greska };
  const poId = new Map(atomiM.map((x) => [x.a.id, x]));
  const vezeM = L.bonds.map((b, k) => {
    const stil = b.red === "klin" || b.red === "crtkano" ? b.red : null;
    return { a: b.a, b: b.b, red: stil ? 1 : Number(b.red), stil, k };
  });
  // spojni čvor skupine s više atoma: jedini atom skupine kojem ostaje slobodna veza („CH₂CH₃“ i „CH₃CH₂“ → CH₂,
  // „HOCH₂“ → C); ako ih je više, onaj prema susjedu (susjed desno: zadnji atom oznake)
  for (const x of atomiM) {
    const moje = vezeM.filter((v) => v.a === x.a.id || v.b === x.a.id);
    if (x.g.c.length > 1 && moje.length > 1) return { greska: `skupina „${x.a.simbol}“ (${x.a.id}) smije imati samo jednu vezu; nacrtaj joj atome zasebno` };
    let spoj = x.g.spoj;
    if (spoj === "slobodni") {
      const slobodni = x.g.c
        .map(([el, h, q], i) => ({ i, sl: (valencija(el, q) ?? 0) - h - x.g.v.reduce((t, [a, b, r]) => t + (a === i || b === i ? r : 0), 0) }))
        .filter((z) => z.sl > 0);
      if (slobodni.length === 1) spoj = slobodni[0].i;
      else if (!slobodni.length) {
        if (moje.length) return { greska: `skupina „${x.a.simbol}“ (${x.a.id}) nema slobodne veze za vezu s ostatkom molekule` };
        spoj = 0;
      } else {
        const v = moje[0];
        const drugi = v ? poId.get(v.a === x.a.id ? v.b : v.a).a : null;
        spoj = drugi && drugi.x - x.a.x > 0.25 ? slobodni[slobodni.length - 1].i : slobodni[0].i;
      }
    }
    x.spoj = x.off + spoj;
  }
  for (const v of vezeM) E.push({ i: poId.get(v.a).spoj, j: poId.get(v.b).spoj, red: v.red, k: v.k });
  const adj = cv.map(() => []);
  for (const e of E) {
    adj[e.i].push({ j: e.j, red: e.red, k: e.k });
    adj[e.j].push({ j: e.i, red: e.red, k: e.k });
  }
  // kut kosturne formule: C s vodicima do 4 veze
  for (const x of atomiM) {
    if (!x.kostur) continue;
    const i = x.spoj;
    const bs = adj[i].reduce((t, y) => t + y.red, 0);
    if (bs > 4) return { greska: `atom ${x.a.id} (kut kosturne formule, C) ima ${bs} veza, a ugljik najviše 4` };
    cv[i].h = 4 - bs;
  }
  // valencija vodika i ostataka
  for (let i = 0; i < cv.length; i++) {
    const c = cv[i];
    const bs = adj[i].reduce((t, y) => t + y.red, 0) + c.h;
    if ((c.el === "H" || c.ostatak) && bs !== 1 && cv.length > 1) return { greska: `atom ${c.atom} (${c.oznaka}) ima ${bs} veza, a smije jednu jednostruku` };
    if (c.ostatak && adj[i].some((y) => y.red !== 1)) return { greska: `ostatak „${c.oznaka}“ (${c.atom}) veže se jednostrukom vezom` };
  }

  // naboj: cijele čestice (zagrade) ili u oznaci atoma, ne oboje
  const Qs = nabojIz(s.naboj);
  if (Number.isNaN(Qs)) return { greska: `naboj „${s.naboj}“: piši npr. "2−", "−", "+" ili broj` };
  const Qc = cv.reduce((t, c) => t + c.q, 0);
  if (Qs && Qc) return { greska: "naboj zadaj ili cijeloj čestici (naboj) ili u oznaci atoma (COO⁻, NH₃⁺), ne oboje" };
  const Qf = isText(s.formula) ? nabojOd(s.formula) : null;
  const Q = auto ? Qf : Qs + Qc;
  if (Qf != null && Qf !== Q) return { greska: `naboj iz formule ${s.formula} (${zapisNaboja(Qf) || "0"}) ne slaže se s nabojem atoma (${zapisNaboja(Q) || "0"})` };
  if (auto && s.naboj != null && Qs !== Qf) return { greska: `naboj „${s.naboj}“ ne slaže se s formulom ${s.formula}` };
  const Qspec = auto ? Qf : Qs;

  // sastav prema formuli
  if (!auto && isText(s.formula)) {
    const f = atomiOd(s.formula);
    if (!f) return { greska: `formula „${s.formula}“ se ne da pročitati` };
    const sastav = {};
    let poznat = true;
    for (const c of cv) {
      if (c.ostatak) {
        const a = atomiOd(c.oznaka);
        if (!a) poznat = false;
        else for (const [el, n] of Object.entries(a)) sastav[el] = (sastav[el] ?? 0) + n;
        continue;
      }
      sastav[c.el] = (sastav[c.el] ?? 0) + 1;
      if (c.h) sastav.H = (sastav.H ?? 0) + c.h;
    }
    if (poznat) {
      const el = [...new Set([...Object.keys(f), ...Object.keys(sastav)])].find((e) => (f[e] ?? 0) !== (sastav[e] ?? 0));
      if (el) return { greska: `atomi ne odgovaraju formuli ${s.formula}: ${naziv(el)} (${el}) je nacrtan ${sastav[el] ?? 0} puta, a u formuli ${f[el] ?? 0}` };
    }
  }

  const M = {
    atomi: atomiM.map((x) => ({
      id: x.a.id,
      simbol: x.a.simbol,
      x: x.a.x,
      y: x.a.y,
      golo: x.golo,
      kostur: x.kostur,
      cvorovi: x.cvorovi,
      spoj: x.spoj,
      nevezni: x.a.nevezni,
      broj: x.a.broj,
      istaknut: !!x.a.istaknut,
      el: x.g.c[0][0],
    })),
    poId: null,
    veze: vezeM,
    cv,
    adj,
    Q,
    Qspec,
    auto,
    formula: isText(s.formula) ? s.formula.trim() : null,
  };
  M.poId = new Map(M.atomi.map((a) => [a.id, a]));
  M.lewis = lewis(M);
  return M;
}

const brojVeza = (M, i) => M.adj[i].reduce((t, y) => t + y.red, 0) + M.cv[i].h;
const ime = (M) => M.formula ?? (M.Q ? "Ovaj ion" : "Ova molekula");
const opisAtoma = (M, i) => `atom ${M.cv[i].atom} (${M.cv[i].oznaka || "C"})`;

// Nevezni parovi iz okteta. zadani: Map čvor → broj (autorovi „nevezni“ ili učenikovi); bez njih ih računa sam.
// Jedini slobodan izbor je prošireni oktet: višak elektrona ide na jedini atom koji ga smije imati.
export function lewis(M, zadani = null, redovi = null) {
  const red = (y) => (redovi && y.k != null ? redovi[y.k] : y.red);
  const nb = M.cv.map((c, i) => M.adj[i].reduce((t, y) => t + red(y), 0) + c.h);
  const V = M.cv.reduce((t, c) => t + (c.ostatak ? 1 : valentni(c.el)) - c.q + c.h, 0) - M.Qspec;
  const lp = M.cv.map(() => 0);
  const flex = [];
  const zad = zadani ?? new Map(M.atomi.filter((a) => a.golo && typeof a.nevezni === "number").map((a) => [a.spoj, a.nevezni]));
  for (let i = 0; i < M.cv.length; i++) {
    const c = M.cv[i];
    if (c.ostatak || c.el === "H") continue;
    if (MANJAK[c.el]) continue;
    lp[i] = Math.max(0, 4 - nb[i]);
    if (prosiriv(c.el)) flex.push(i);
    else if (nb[i] > 4) return { V, nb, greska: `${opisAtoma(M, i)}: ${naziv(c.el)} ima ${nb[i]} veza, a najviše 4 (oktet)` };
  }
  const fiks = new Set();
  for (const [i, z] of zad) {
    const c = M.cv[i];
    if (flex.includes(i)) {
      if (z < lp[i]) return { V, nb, greska: `${opisAtoma(M, i)}: s ${z} neveznih parova ${naziv(c.el)} nema oktet (treba barem ${lp[i]})` };
      lp[i] = z;
      fiks.add(i);
    } else if (z !== lp[i]) return { V, nb, greska: `${opisAtoma(M, i)}: ${naziv(c.el)} s ${nb[i]} veza ima ${lp[i]} neveznih parova (oktet), a zadano je ${z}` };
  }
  // elektroni u vezama: zbroj po čvorovima broji svaku vezu dvaput (2 elektrona po redu veze) + veze s vodicima skupina
  const uVezama = M.adj.reduce((t, l) => t + l.reduce((u, y) => u + red(y), 0), 0) + 2 * M.cv.reduce((t, c) => t + c.h, 0);
  const potrebno = uVezama + 2 * lp.reduce((a, b) => a + b, 0);
  const R = V - potrebno;
  const pomoc = M.Q ? " Provjeri naboj i red veza." : " Ako je čestica ion, zadaj naboj; inače provjeri red veza.";
  if (R < 0) return { V, nb, greska: `${ime(M)} ima ${V} valentnih elektrona, a za oktet svih atoma s ovim vezama treba ${potrebno}.${pomoc}` };
  if (R % 2) return { V, nb, greska: `${ime(M)} ima neparan broj elektrona (${V}): radikal se ne crta` };
  if (R > 0) {
    const slobodni = flex.filter((i) => !fiks.has(i));
    if (!slobodni.length) return { V, nb, greska: `${ime(M)} ima ${V} valentnih elektrona, a s ovim vezama ih stane ${potrebno}: previše za oktet.${pomoc}` };
    if (slobodni.length > 1) return { V, nb, viseznacno: true, greska: `višak od ${R} elektrona može biti na više atoma s proširenim oktetom (${slobodni.map((i) => M.cv[i].atom).join(", ")}): zadaj „nevezni“ tim atomima` };
    lp[slobodni[0]] += R / 2;
  }
  const ljuska = nb.map((x, i) => 2 * (x + lp[i]));
  for (let i = 0; i < M.cv.length; i++) {
    const c = M.cv[i];
    if (c.ostatak || c.el === "H") continue;
    if (!dozvoljeno(c.el).includes(ljuska[i])) return { V, nb, greska: `${opisAtoma(M, i)}: ${naziv(c.el)} bi imao ${ljuska[i]} elektrona (smije ${dozvoljeno(c.el).join(" ili ")})` };
  }
  return { V, nb, lp, ljuska };
}

// Nevezni parovi po atomu (id → broj), samo atomi bez vodika u oznaci (njima se parovi crtaju).
export const tocniParovi = (M) => Object.fromEntries(M.atomi.filter((a) => a.golo).map((a) => [a.id, M.lewis.lp?.[a.spoj] ?? 0]));

// ── VSEPR ──
// ime: uz „molekula je …“; oblik: uz „oblik je …“ (i natpis na izboru); dod: slikovito
export const OBLICI = {
  linearna: { ime: "linearna", oblik: "linearni", dod: "", kut: "180°" },
  kutna: { ime: "kutna", oblik: "kutni", dod: "oblik slova V", kut: "" },
  trigonska_planarna: { ime: "trigonska planarna", oblik: "trigonski planarni", dod: "plošni trokut", kut: "120°" },
  trigonska_piramidalna: { ime: "trigonska piramidalna", oblik: "trigonski piramidalni", dod: "trostrana piramida", kut: "nešto manji od 109,5°" },
  tetraedarska: { ime: "tetraedarska", oblik: "tetraedarski", dod: "tetraedar", kut: "109,5°" },
  trigonska_bipiramidalna: { ime: "trigonska bipiramidalna", oblik: "trigonski bipiramidalni", dod: "", kut: "90° i 120°" },
  oktaedarska: { ime: "oktaedarska", oblik: "oktaedarski", dod: "oktaedar", kut: "90°" },
};
export const OSNOVNI_OBLICI = ["linearna", "kutna", "trigonska_planarna", "trigonska_piramidalna", "tetraedarska"];
const TABLICA_OBLIKA = { "2,0": "linearna", "3,0": "trigonska_planarna", "3,1": "kutna", "4,0": "tetraedarska", "4,1": "trigonska_piramidalna", "4,2": "kutna", "5,0": "trigonska_bipiramidalna", "6,0": "oktaedarska" };
const RASPORED = { 2: "na suprotnim stranama (180°)", 3: "u ravnini, prema vrhovima trokuta (120°)", 4: "prema vrhovima tetraedra (109,5°)", 5: "prema vrhovima trigonske bipiramide", 6: "prema vrhovima oktaedra" };
const KUT_KUTNA = { 3: "nešto manji od 120°", 4: "manji od 109,5°" };
export const imeOblika = (k) => (OBLICI[k] ? `${OBLICI[k].oblik}${OBLICI[k].dod ? ` (${OBLICI[k].dod})` : ""}` : k);

const stupanj = (M, i) => M.adj[i].length + M.cv[i].h;
// Središnji atom (čvor): zadani „sredisnji“ ili jedini atom s barem dva susjeda. null za dvoatomnu česticu.
export function sredisnji(M, s) {
  if (s.sredisnji != null) {
    const a = M.poId.get(String(s.sredisnji));
    if (!a) return { greska: `sredisnji „${s.sredisnji}“ nije atom molekule` };
    if (a.cvorovi.length !== 1) return { greska: `sredisnji „${s.sredisnji}“ je skupina s više atoma; zadaj atom` };
    return { i: a.spoj };
  }
  const k = M.cv.map((_, i) => i).filter((i) => stupanj(M, i) >= 2);
  if (k.length === 1) return { i: k[0] };
  const atoma = M.cv.length + M.cv.reduce((t, c) => t + c.h, 0);
  if (atoma === 2) return { i: null, dvoatomna: true };
  return { greska: "molekula ima više središnjih atoma: zadaj „sredisnji“ (id atoma oko kojeg se gleda oblik)" };
}

// Oblik oko čvora i: broj veza (smjerova prema atomima), nevezni parovi, ključ oblika.
export function oblikOko(M, i) {
  const sigma = stupanj(M, i);
  const lp = M.lewis.lp?.[i] ?? 0;
  const d = sigma + lp;
  return { sigma, lp, d, kljuc: TABLICA_OBLIKA[`${d},${lp}`] ?? null, visestruka: M.adj[i].some((y) => y.red > 1) };
}
export function kutOblika(o) {
  if (o.kljuc === "kutna") return KUT_KUTNA[o.d] ?? "";
  return OBLICI[o.kljuc]?.kut ?? "";
}

// Oblik čestice za pitanje: {kljuc, i (središnji čvor ili null), o} ili {greska}.
export function oblikCestice(M, s) {
  if (M.lewis.greska) return { greska: M.lewis.greska };
  const c = sredisnji(M, s);
  if (c.greska) return c;
  if (c.dvoatomna) return { kljuc: "linearna", i: null, dvoatomna: true };
  const o = oblikOko(M, c.i);
  if (!o.kljuc) return { greska: `oblik sa ${o.sigma} ${o.sigma >= 5 ? "veza" : "veze"} i ${o.lp ? parova(o.lp) : "bez neveznih parova"} oko središnjeg atoma nije u školskom gradivu` };
  return { kljuc: o.kljuc, i: c.i, o };
}

// ── elektronegativnost i polarnost ──
export const enOd = (s, el) => (s.en && typeof s.en[el] === "number" ? s.en[el] : (element(el)?.en ?? null));
const zapisEN = (s, x) => (s.en ? formatNumber(Math.round(x * 100) / 100, 1) : formatNumber(Math.round(x * 100) / 100, 2));
export const znakVeze = (red) => (red === 3 ? "≡" : red === 2 ? "=" : "–");
export function vrstaVeze(s, a, b) {
  const x = enOd(s, a);
  const y = enOd(s, b);
  if (x == null || y == null) return null;
  const d = Math.abs(x - y);
  return { d, zapis: zapisEN(s, d), vrsta: d < 0.4 ? "nepolarna kovalentna" : d > 1.7 ? "polarna kovalentna (blizu ionske)" : "polarna kovalentna" };
}
// Smjerovi idealne geometrije (3D) za d smjerova; prvih (d − lp) su veze.
const SMJEROVI_3D = {
  2: [[1, 0, 0], [-1, 0, 0]],
  3: [[1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0]],
  4: [[0.943, 0, -0.333], [-0.471, 0.816, -0.333], [-0.471, -0.816, -0.333], [0, 0, 1]],
};
// Polarnost neutralne molekule: dvoatomna ili jedan središnji atom (AXₙEₘ). {polarna, razlog} ili {greska}.
export function polarnost(M, s) {
  if (M.Q) return { greska: "polarnost se pita samo za neutralnu molekulu, ne za ion" };
  const ob = oblikCestice(M, s);
  if (ob.greska) return ob;
  const susjedi = (i) => [...M.adj[i].map((y) => ({ el: M.cv[y.j].el, red: y.red, j: y.j })), ...Array.from({ length: M.cv[i].h }, () => ({ el: "H", red: 1 }))];
  if (ob.dvoatomna) {
    const i = 0;
    const [b] = susjedi(i);
    const a = M.cv[i].el;
    const v = vrstaVeze(s, a, b.el);
    if (!v) return { greska: `nema elektronegativnosti za ${a} ili ${b.el}: zadaj „en“` };
    const f = `${a}${znakVeze(b.red)}${b.el}`;
    if (a === b.el) return { polarna: false, razlog: `Dva jednaka atoma (${f}): razlika elektronegativnosti je 0, pa su veza i molekula nepolarne.` };
    return { polarna: true, razlog: `${veliko(naziv(a))} i ${naziv(b.el)} privlače elektrone različito (Δ = ${v.zapis}): jedna polarna veza čini i molekulu polarnom.` };
  }
  const c = ob.i;
  const nije = M.cv.some((x, j) => j !== c && (stupanj(M, j) !== 1 || !M.adj[j].some((y) => y.j === c)));
  if (nije) return { greska: "polarnost kod računa samo za molekulu s jednim središnjim atomom (ostali atomi vezani samo na njega)" };
  const ce = M.cv[c].el;
  const okolo = susjedi(c);
  for (const t of okolo) if (enOd(s, t.el) == null || enOd(s, ce) == null) return { greska: `nema elektronegativnosti za ${t.el} ili ${ce}: zadaj „en“` };
  const o = ob.o;
  const vrste = [...new Set(okolo.map((t) => `${ce}${znakVeze(t.red)}${t.el}`))];
  const prva = vrstaVeze(s, ce, okolo[0].el);
  if (o.lp > 0) {
    const sveNula = okolo.every((t) => vrstaVeze(s, ce, t.el).d < 1e-9);
    if (sveNula) return { polarna: false, razlog: `Veze ${vrste.join(" i ")} su nepolarne (Δ = 0), pa je i molekula nepolarna.` };
    return {
      polarna: true,
      razlog: `Molekula je ${OBLICI[o.kljuc].ime} jer ${naziv(ce)} ima ${parova(o.lp)}: nije simetrična, pa se učinci veza ${vrste.join(" i ")} (Δ = ${prva.zapis}) ne poništavaju i molekula je polarna.`,
    };
  }
  if (o.d > 4) {
    if (vrste.length > 1) return { greska: "polarnost s različitim atomima oko pet ili šest smjerova kod ne računa" };
    return { polarna: false, razlog: `Sve veze oko atoma ${ce} su jednake i simetrično raspoređene (${OBLICI[o.kljuc].oblik} oblik), pa se njihovi učinci poništavaju: molekula je nepolarna.` };
  }
  const dir = SMJEROVI_3D[o.d];
  const mu = [0, 0, 0];
  okolo.forEach((t, k) => {
    const q = enOd(s, t.el) - enOd(s, ce);
    for (let z = 0; z < 3; z++) mu[z] += q * dir[k][z];
  });
  const iznos = Math.hypot(...mu);
  if (iznos > 0.05) {
    return { polarna: true, razlog: `Oko atoma ${ce} nisu sve veze jednake (${vrste.join(" i ")}), pa se njihovi učinci ne poništavaju: molekula je polarna.` };
  }
  if (prva.d < 0.4) return { polarna: false, razlog: `Veze ${vrste.join(" i ")} su gotovo nepolarne (Δ = ${prva.zapis}), a molekula je simetrična (${OBLICI[o.kljuc].oblik} oblik): nepolarna.` };
  return { polarna: false, razlog: `Veze ${vrste.join(" i ")} su polarne (Δ = ${prva.zapis}), ali su jednake i simetrično raspoređene (${OBLICI[o.kljuc].oblik} oblik), pa se njihovi učinci poništavaju: molekula je nepolarna.` };
}

// ── riječi ──
const BROJEVI = ["nula", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam"];
const BROJEVI_Z = ["nula", "jednu", "dvije", "tri", "četiri", "pet", "šest"];
export const veza = (n) => (n === 1 ? "jednu vezu" : n <= 4 ? `${BROJEVI_Z[n]} veze` : `${BROJEVI_Z[n] ?? n} veza`);
export const parova = (n) => (n === 0 ? "nijedan nevezni par" : n === 1 ? "jedan nevezni par" : n <= 4 ? `${BROJEVI[n]} nevezna para` : `${n} neveznih parova`);
const smjera = (n) => (n <= 4 ? `${BROJEVI[n]} smjera` : `${BROJEVI[n]} smjerova`);
// množina: mn(5, ["vezna crtica", "vezne crtice", "veznih crtica"]) → „5 veznih crtica“
export const mn = (n, [j, d, m]) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? j : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? d : m}`;
const elektrona = (n) => mn(n, ["elektron", "elektrona", "elektrona"]);
const nabrajanje = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);

// ── graf za usporedbu skupina (asimetrični C) ──
// Vodici skupina dodaju se kao listovi; svaka „grana“ (od atoma prema susjedu) dobije oznaku iz pročišćavanja
// (Weisfeiler–Lehman po usmjerenim vezama): dvije grane s istom oznakom su ista skupina.
function grane(M) {
  if (M._grane) return M._grane;
  const N = M.cv.map((c) => (c.ostatak ? `R:${c.oznaka}` : `${c.el}${c.q || ""}`));
  const adj = M.adj.map((l) => l.map((y) => ({ j: y.j, red: y.red })));
  M.cv.forEach((c, i) => {
    for (let k = 0; k < c.h; k++) {
      const id = N.length;
      N.push("H");
      adj.push([{ j: i, red: 1 }]);
      adj[i].push({ j: id, red: 1 });
    }
  });
  let h = new Map();
  for (let u = 0; u < N.length; u++) for (const y of adj[u]) h.set(`${u},${y.j}`, N[y.j]);
  for (let r = 0; r < N.length; r++) {
    const nova = new Map();
    const intern = new Map();
    for (let u = 0; u < N.length; u++) {
      for (const y of adj[u]) {
        const v = y.j;
        const djeca = adj[v].filter((w) => w.j !== u).map((w) => `${w.red}:${h.get(`${v},${w.j}`)}`).sort();
        const t = `${N[v]}(${djeca.join(",")})`;
        if (!intern.has(t)) intern.set(t, intern.size);
        nova.set(`${u},${v}`, intern.get(t));
      }
    }
    const stabilno = intern.size === new Set(h.values()).size && r > 0;
    h = nova;
    if (stabilno) break;
  }
  M._grane = { N, adj, h };
  return M._grane;
}
// Sažeti zapis grane (od u prema v): „CH₃“, „CH₂CH₃“, „OH“, „COOH“, „H“.
function zapisGrane(G, u, v, dubina = 0) {
  const el = G.N[v].replace(/^R:/, "");
  if (el === "H") return "H";
  if (G.N[v].startsWith("R:")) return el;
  if (dubina > 6) return "…";
  const djeca = G.adj[v].filter((w) => w.j !== u);
  const hs = djeca.filter((w) => G.N[w.j] === "H").length;
  const teska = djeca.filter((w) => G.N[w.j] !== "H");
  const elc = el.replace(/[-\d]+$/, "");
  if (elc === "C") {
    const dO = teska.find((w) => G.N[w.j] === "O" && w.red === 2 && G.adj[w.j].length === 1);
    const oh = teska.find((w) => G.N[w.j] === "O" && w.red === 1 && G.adj[w.j].length === 2 && G.adj[w.j].some((z) => z.j !== v && G.N[z.j] === "H"));
    if (dO && oh && teska.length === 2) return "COOH";
    if (dO && teska.length === 1 && hs === 1) return "CHO";
  }
  let t = `${elc}${hs ? `H${sub(hs)}` : ""}`;
  const grupe = new Map();
  for (const w of teska) {
    const k = G.h.get(`${v},${w.j}`);
    if (!grupe.has(k)) grupe.set(k, { w, n: 0 });
    grupe.get(k).n++;
  }
  const lista = [...grupe.values()];
  lista.forEach((g, idx) => {
    const z = (g.w.red === 2 ? "=" : g.w.red === 3 ? "≡" : "") + zapisGrane(G, v, g.w.j, dubina + 1);
    if (g.n > 1) t += `(${z})${sub(g.n)}`;
    else if (idx < lista.length - 1) t += `(${z})`;
    else t += z;
  });
  return t;
}

// Asimetrični C: četiri jednostruke veze prema četiri različite skupine. [{i, skupine}]
export function asimetricni(M) {
  if (M._asim) return M._asim;
  const G = grane(M);
  const out = [];
  for (let i = 0; i < M.cv.length; i++) {
    if (M.cv[i].el !== "C") continue;
    const s = G.adj[i];
    if (s.length !== 4 || s.some((y) => y.red !== 1)) continue;
    const k = s.map((y) => G.h.get(`${i},${y.j}`));
    if (new Set(k).size === 4) out.push({ i, skupine: s.map((y) => zapisGrane(G, i, y.j)) });
  }
  M._asim = out;
  return out;
}
// Zašto C-atom (čvor i) nije asimetričan: konkretna rečenica.
export function zastoNijeAsim(M, i) {
  const c = M.cv[i];
  const oz = c.oznaka || "C";
  if (c.el !== "C") return `${oz} nije C-atom: asimetričan je samo C-atom s četiri različite skupine.`;
  const G = grane(M);
  const s = G.adj[i];
  if (s.some((y) => y.red > 1)) return `${oz} ima dvostruku ili trostruku vezu, pa nema četiri skupine oko sebe.`;
  if (s.length < 4) return `${oz} nema četiri skupine oko sebe.`;
  const k = s.map((y) => G.h.get(`${i},${y.j}`));
  const dup = k.findIndex((x, n) => k.indexOf(x) !== n);
  const z = zapisGrane(G, i, s[dup].j);
  return `${oz} ima dvije jednake skupine (${z} i ${z}), pa nije asimetričan.`;
}

// ── funkcijske skupine ──
const hBroj = (M, i) => M.cv[i].h + M.adj[i].filter((y) => M.cv[y.j].el === "H").length;
const teski = (M, i) => M.adj[i].filter((y) => M.cv[y.j].el !== "H");
const jeC = (M, j) => M.cv[j].el === "C" || M.cv[j].ostatak;
const vodiciOd = (M, i) => M.adj[i].filter((y) => M.cv[y.j].el === "H").map((y) => y.j);
// [{vrsta, cvorovi (teški atomi skupine), vodici (nacrtani H skupine), c (C-atom na koji se skupina veže ili koji je nosi)}]
export function funkcijske(M) {
  if (M._fs) return M._fs;
  const out = [];
  const karbonilni = new Set();
  const u = new Set();
  for (let i = 0; i < M.cv.length; i++) {
    if (M.cv[i].el !== "C") continue;
    const dO = M.adj[i].find((y) => M.cv[y.j].el === "O" && y.red === 2);
    if (!dO) continue;
    const ostali = teski(M, i).filter((y) => y.j !== dO.j);
    const oS = ostali.filter((y) => M.cv[y.j].el === "O" && y.red === 1);
    const nS = ostali.filter((y) => M.cv[y.j].el === "N");
    karbonilni.add(i);
    if (oS.length) {
      const o = oS[0].j;
      if (hBroj(M, o) >= 1 || M.cv[o].q < 0) out.push({ vrsta: "karboksilna", cvorovi: [i, dO.j, o], vodici: vodiciOd(M, o), c: i });
      else if (teski(M, o).some((y) => y.j !== i && jeC(M, y.j))) out.push({ vrsta: "esterska", cvorovi: [i, dO.j, o], vodici: [], c: i });
      else continue;
      u.add(o);
    } else if (nS.length) {
      out.push({ vrsta: "amidna", cvorovi: [i, dO.j, nS[0].j], vodici: vodiciOd(M, nS[0].j), c: i });
      u.add(nS[0].j);
    } else if (hBroj(M, i) >= 1) out.push({ vrsta: "aldehidna", cvorovi: [i, dO.j], vodici: vodiciOd(M, i), c: i });
    else if (ostali.filter((y) => jeC(M, y.j)).length === 2) out.push({ vrsta: "ketonska", cvorovi: [i, dO.j], vodici: [], c: i });
    u.add(dO.j);
  }
  for (let o = 0; o < M.cv.length; o++) {
    if (M.cv[o].el !== "O" || u.has(o) || M.adj[o].some((y) => y.red !== 1)) continue;
    const t = teski(M, o);
    const hb = hBroj(M, o);
    if (hb === 1 && t.length === 1 && jeC(M, t[0].j) && !karbonilni.has(t[0].j)) out.push({ vrsta: "hidroksilna", cvorovi: [o], vodici: vodiciOd(M, o), c: t[0].j });
    else if (hb === 0 && t.length === 2 && t.every((y) => jeC(M, y.j) && !karbonilni.has(y.j))) out.push({ vrsta: "eterska", cvorovi: [o], vodici: [], c: t[0].j });
  }
  for (let n = 0; n < M.cv.length; n++) {
    if (M.cv[n].el !== "N" || u.has(n) || M.adj[n].some((y) => y.red !== 1)) continue;
    const c = teski(M, n).find((y) => jeC(M, y.j) && !karbonilni.has(y.j));
    if (c) out.push({ vrsta: "amino", cvorovi: [n], vodici: vodiciOd(M, n), c: c.j });
  }
  for (let x = 0; x < M.cv.length; x++) {
    if (!HALOGENI[M.cv[x].el]) continue;
    const c = M.adj[x].find((y) => M.cv[y.j].el === "C");
    if (c) out.push({ vrsta: "halogen", cvorovi: [x], vodici: [], c: c.j });
  }
  const vidjeno = new Set();
  for (let i = 0; i < M.cv.length; i++) {
    for (const y of M.adj[i]) {
      if (M.cv[i].el !== "C" || M.cv[y.j].el !== "C" || y.red < 2) continue;
      const k = [Math.min(i, y.j), Math.max(i, y.j)].join(",");
      if (vidjeno.has(k)) continue;
      vidjeno.add(k);
      out.push({ vrsta: y.red === 2 ? "dvostruka_veza" : "trostruka_veza", cvorovi: [i, y.j], vodici: [], c: i });
    }
  }
  M._fs = out;
  return out;
}
export const IME_SKUPINE = {
  hidroksilna: "hidroksilna skupina (–OH)",
  karboksilna: "karboksilna skupina (–COOH)",
  karbonilna: "karbonilna skupina (C=O)",
  aldehidna: "aldehidna skupina (–CHO)",
  ketonska: "ketonska (karbonilna) skupina (C=O)",
  eterska: "eterska skupina (–O–)",
  esterska: "esterska skupina (–COO–)",
  amino: "amino-skupina (–NH₂)",
  amidna: "amidna skupina (–CONH–)",
  halogen: "atom halogena",
  dvostruka_veza: "dvostruka veza C=C",
  trostruka_veza: "trostruka veza C≡C",
};
const instance = (M, vrsta) => funkcijske(M).filter((f) => (vrsta === "karbonilna" ? f.vrsta === "aldehidna" || f.vrsta === "ketonska" : f.vrsta === vrsta));

// ── glavni lanac i numeracija ──
// Samo aciklički lanac C-atoma (bez etera i estera). Glavni lanac: najviše C-atoma s glavnom skupinom, pa najviše
// višestrukih veza, pa najdulji, pa najviše ogranaka (pravila iz 1993.); ako pravila iz 2013. (najdulji prije
// višestrukih veza) daju drugi lanac, kod ne odlučuje. Numeracija: najmanji brojevi glavnoj skupini, pa
// višestrukim vezama, pa ograncima, pa abecedno prvom ogranku.
const PRIORITET = ["karboksilna", "aldehidna", "ketonska", "hidroksilna", "amino"];
const IME_GLAVNE = { karboksilna: "–COOH", aldehidna: "–CHO", ketonska: "C=O", hidroksilna: "–OH", amino: "–NH₂" };
function imeOgranka(M, od, j) {
  const el = M.cv[j].el;
  if (HALOGENI[el]) return HALOGENI[el];
  if (el === "O") return M.adj[j].some((y) => y.red === 2) ? "okso" : hBroj(M, j) === 1 ? "hidroksi" : null;
  if (el === "N") return hBroj(M, j) === 2 ? "amino" : null;
  if (el !== "C") return null;
  let n = 0;
  let prev = od;
  let cur = j;
  while (cur != null) {
    n++;
    const dalje = M.adj[cur].filter((y) => y.j !== prev && M.cv[y.j].el !== "H");
    if (dalje.some((y) => M.cv[y.j].el !== "C" || y.red !== 1) || dalje.length > 1 || M.adj[cur].some((y) => y.red !== 1)) return null;
    prev = cur;
    cur = dalje[0]?.j ?? null;
  }
  return ALKIL[n - 1] ?? null;
}
export function glavniLanac(M) {
  if (M._lanac) return M._lanac;
  M._lanac = racunajLanac(M);
  return M._lanac;
}
function racunajLanac(M) {
  if (M.lewis.greska) return { greska: M.lewis.greska };
  if (M.cv.some((c) => c.ostatak)) return { greska: "ostatak (R, C₁₇H₃₃…) se ne može brojati u lancu" };
  const C = M.cv.map((_, i) => i).filter((i) => M.cv[i].el === "C");
  if (!C.length) return { greska: "molekula nema C-atoma" };
  const cAdj = new Map(C.map((i) => [i, M.adj[i].filter((y) => M.cv[y.j].el === "C")]));
  const brojCC = C.reduce((t, i) => t + cAdj.get(i).length, 0) / 2;
  // povezanost
  const vid = new Set([C[0]]);
  const st = [C[0]];
  while (st.length) for (const y of cAdj.get(st.pop())) if (!vid.has(y.j)) vid.add(y.j), st.push(y.j);
  if (vid.size !== C.length) return { greska: "C-atomi nisu u jednom nizu (npr. eter ili ester): glavni lanac kod ne određuje" };
  if (brojCC !== C.length - 1) return { greska: "molekula ima prsten: glavni lanac kod ne određuje" };
  const fs = funkcijske(M);
  if (fs.some((f) => ["esterska", "amidna", "eterska"].includes(f.vrsta))) return { greska: "esteri, amidi i eteri: glavni lanac kod ne određuje" };
  const glavna = PRIORITET.find((v) => fs.some((f) => f.vrsta === v)) ?? null;
  const P = glavna ? fs.filter((f) => f.vrsta === glavna).map((f) => f.c) : [];
  const HP = new Set(glavna ? fs.filter((f) => f.vrsta === glavna).flatMap((f) => f.cvorovi.filter((j) => M.cv[j].el !== "C")) : []);
  const put = (a, b) => {
    const od = new Map([[a, null]]);
    const q = [a];
    while (q.length) {
      const x = q.shift();
      for (const y of cAdj.get(x)) if (!od.has(y.j)) od.set(y.j, x), q.push(y.j);
    }
    const p = [];
    for (let x = b; x != null; x = od.get(x)) p.push(x);
    return p.reverse();
  };
  const ogranci = (p) => {
    const na = new Set(p);
    const out = [];
    for (const i of p) for (const y of M.adj[i]) if (!na.has(y.j) && M.cv[y.j].el !== "H" && !HP.has(y.j)) out.push({ i, j: y.j });
    return out;
  };
  const visestruke = (p) => {
    const out = [];
    for (let k = 0; k + 1 < p.length; k++) {
      const y = M.adj[p[k]].find((z) => z.j === p[k + 1]);
      if (y.red > 1) out.push(k);
    }
    return out;
  };
  const putevi = [];
  for (let x = 0; x < C.length; x++) for (let y = x; y < C.length; y++) putevi.push(put(C[x], C[y]));
  const ocjena = (p, r2013) => {
    const nP = P.filter((i) => p.includes(i)).length;
    const nV = visestruke(p).length;
    const nO = ogranci(p).length;
    return r2013 ? [nP, p.length, nV, nO] : [nP, nV, p.length, nO];
  };
  const usporedi = (a, b) => {
    for (let k = 0; k < Math.max(a.length, b.length); k++) {
      const x = a[k] ?? -Infinity;
      const y = b[k] ?? -Infinity;
      if (x !== y) return x - y;
    }
    return 0;
  };
  const najbolji = (r) => {
    let best = null;
    let lista = [];
    for (const p of putevi) {
      const o = ocjena(p, r);
      const c = best ? usporedi(o, best) : 1;
      if (c > 0) [best, lista] = [o, [p]];
      else if (c === 0) lista.push(p);
    }
    return lista;
  };
  const skup = (l) => new Set(l.map((p) => [...p].sort((a, b) => a - b).join(",")));
  const s93 = skup(najbolji(false));
  const s13 = skup(najbolji(true));
  if (s93.size !== s13.size || [...s93].some((x) => !s13.has(x))) return { greska: "glavni lanac po pravilima iz 1993. i 2013. nije isti (najdulji lanac nema sve višestruke veze): kod ga ne određuje" };
  // numeracija: oba smjera svakog kandidata
  const kandidati = najbolji(false).flatMap((p) => (p.length > 1 ? [p, [...p].reverse()] : [p]));
  let trebaAbeceda = false;
  const kljuc = (p, abeceda) => {
    const loc = new Map(p.map((i, k) => [i, k + 1]));
    const k1 = P.filter((i) => loc.has(i)).map((i) => loc.get(i)).sort((a, b) => a - b);
    const k2 = visestruke(p).map((k) => k + 1).sort((a, b) => a - b);
    const og = ogranci(p);
    const k3 = og.map((o) => loc.get(o.i)).sort((a, b) => a - b);
    const out = [...k1, -1, ...k2, -1, ...k3];
    if (abeceda) {
      const imena = og.map((o) => ({ ime: imeOgranka(M, o.i, o.j), l: loc.get(o.i) }));
      if (imena.some((x) => !x.ime)) return null;
      imena.sort((a, b) => a.ime.localeCompare(b.ime, "hr") || a.l - b.l);
      out.push(-1, ...imena.map((x) => x.l));
    }
    return out;
  };
  const manji = (a, b) => {
    for (let k = 0; k < Math.max(a.length, b.length); k++) if (a[k] !== b[k]) return (a[k] ?? -2) - (b[k] ?? -2);
    return 0;
  };
  const odaberi = (abeceda) => {
    let best = null;
    let pobjednici = [];
    for (const p of kandidati) {
      const k = kljuc(p, abeceda);
      if (!k) return null;
      const c = best ? manji(k, best) : -1;
      if (c < 0) [best, pobjednici] = [k, [p]];
      else if (c === 0) pobjednici.push(p);
    }
    return pobjednici;
  };
  let pobjednici = odaberi(false);
  // isti brojevi s oba kraja različitih ogranaka: abeceda (npr. 3-etil-4-metil…)
  const istiSkupOgranaka = (a, b) => {
    const ime = (p) => ogranci(p).map((o) => `${p.indexOf(o.i) + 1}:${imeOgranka(M, o.i, o.j)}`).sort().join("|");
    return ime(a) === ime(b);
  };
  if (pobjednici.length > 1 && pobjednici.some((p) => !istiSkupOgranaka(p, pobjednici[0]))) {
    trebaAbeceda = true;
    const a = odaberi(true);
    if (!a) return { greska: "numeraciju odlučuje abeceda ogranaka, a jednom ogranku kod ne zna ime" };
    pobjednici = a;
  }
  void trebaAbeceda;
  return { glavna, lanci: pobjednici, P, duljina: pobjednici[0].length };
}

// ── odgovori koje računa kod za „oznaci“ ──
// Drawn atomi (id) koji sadrže tražene čvorove. Za lanac/c1: popis mogućih točnih skupova.
const atomiCvorova = (M, cvorovi) => [...new Set(cvorovi.map((i) => M.cv[i].atom))];
export function tocnoOznaci(M, s) {
  const t = s.trazi;
  if (t === "zadano") return { skupovi: [[...new Set((s.tocno ?? []).map(String))]], obavezni: null };
  if (M.lewis.greska) return { greska: M.lewis.greska };
  if (t === "asimetricni_c") {
    const a = asimetricni(M);
    if (!a.length) return { greska: "molekula nema asimetričnog C-atoma" };
    return { skupovi: [atomiCvorova(M, a.map((x) => x.i))] };
  }
  if (t === "slobodni_par") {
    const ids = M.atomi.filter((a) => M.cv.some((c, i) => c.atom === a.id && (M.lewis.lp[i] ?? 0) > 0)).map((a) => a.id);
    if (!ids.length) return { greska: "nijedan atom nema nevezni par" };
    return { skupovi: [ids] };
  }
  if (t === "lanac" || t === "c1") {
    const L = glavniLanac(M);
    if (L.greska) return { greska: L.greska };
    for (const p of L.lanci) {
      const po = new Map();
      for (const i of p) po.set(M.cv[i].atom, (po.get(M.cv[i].atom) ?? 0) + 1);
      const vise = [...po].find(([, n]) => n > 1);
      if (vise) return { greska: `atom ${vise[0]} (${M.poId.get(vise[0]).simbol}) sadrži više C-atoma glavnog lanca: nacrtaj ih zasebno` };
    }
    if (t === "c1") return { skupovi: [...new Set(L.lanci.map((p) => M.cv[p[0]].atom))].map((id) => [id]), jedan: true };
    const skupovi = [];
    for (const p of L.lanci) {
      const ids = atomiCvorova(M, p).sort();
      if (!skupovi.some((x) => x.join() === ids.join())) skupovi.push(ids);
    }
    return { skupovi };
  }
  const inst = instance(M, t);
  if (!inst.length) return { greska: `molekula nema: ${IME_SKUPINE[t]}` };
  return { skupovi: [atomiCvorova(M, inst.flatMap((f) => f.cvorovi))], neobavezni: atomiCvorova(M, inst.flatMap((f) => f.vodici)) };
}

// Numeracija glavnog lanca za prikaz (id atoma → broj) ili null.
export function numeracija(M) {
  const L = glavniLanac(M);
  if (L.greska) return null;
  const p = L.lanci[0];
  const out = {};
  for (const [k, i] of p.entries()) {
    if (out[M.cv[i].atom] != null) return null;
    out[M.cv[i].atom] = k + 1;
  }
  return out;
}

// ── crtež ──
// Model (x, y u duljinama veze, y prema gore) → pikseli u okviru širine SIRINA. Pogled „lewis“ crta atome gdje ih je
// autor stavio; pogled „oblik“ složi česticu AXₙEₘ prostorno (klin ispred, crtkano iza ravnine, nevezni parovi kao
// oblaci), samo kad je središnji atom jedan i svi ostali atomi su nacrtani zasebno.
export const SIRINA = 360;
const SLOT_OBLIK = {
  "2,0": { a: [[180, "r"], [0, "r"]], p: [] },
  "3,0": { a: [[90, "r"], [210, "r"], [330, "r"]], p: [] },
  "3,1": { a: [[210, "r"], [330, "r"]], p: [90] },
  "4,0": { a: [[90, "r"], [205, "r"], [340, "k"], [290, "c"]], p: [] },
  "4,1": { a: [[205, "r"], [340, "k"], [290, "c"]], p: [90] },
  "4,2": { a: [[215, "r"], [325, "r"]], p: [55, 125] },
  "5,0": { a: [[90, "r"], [270, "r"], [180, "r"], [335, "k"], [25, "c"]], p: [] },
  "6,0": { a: [[90, "r"], [270, "r"], [200, "k"], [340, "k"], [160, "c"], [20, "c"]], p: [] },
};
// Može li se nacrtati pogled „oblik“: {c (id središnjeg atoma), o} ili null.
export function prostorno(M, s = {}) {
  if (M.lewis.greska) return null;
  const c = sredisnji(M, s);
  if (c.greska || c.dvoatomna) return null;
  const sa = M.poId.get(M.cv[c.i].atom);
  if (!sa.golo) return null;
  if (M.cv.length !== M.atomi.length || M.atomi.some((a) => a.cvorovi.length !== 1 || M.cv[a.spoj].h)) return null;
  if (M.cv.some((_, j) => j !== c.i && (stupanj(M, j) !== 1 || !M.adj[j].some((y) => y.j === c.i)))) return null;
  const o = oblikOko(M, c.i);
  if (!o.kljuc || !SLOT_OBLIK[`${o.d},${o.lp}`]) return null;
  return { c: sa.id, i: c.i, o };
}

// Položaji atoma u pikselima za pogled; h = zadana visina (zajednička za oba pogleda) ili izračunata.
export function polozaji(M, pogled = "lewis", s = {}, hZad = null) {
  let pts = M.atomi.map((a) => [a.id, a.x, a.y]);
  let stil = new Map(M.veze.map((v) => [v.k, v.stil ?? "r"]));
  let lobovi = [];
  const pr = pogled === "oblik" ? prostorno(M, s) : null;
  if (pr) {
    const slot = SLOT_OBLIK[`${pr.o.d},${pr.o.lp}`];
    const okolo = M.adj[pr.i].map((y) => ({ id: M.cv[y.j].atom, red: y.red, k: y.k })).sort((a, b) => b.red - a.red);
    const pos = new Map([[pr.c, [0, 0]]]);
    okolo.forEach((t, n) => {
      const [kut, st] = slot.a[n];
      const r = (kut * Math.PI) / 180;
      pos.set(t.id, [Math.cos(r) * 1.05, Math.sin(r) * 1.05]);
      stil.set(t.k, st);
    });
    pts = M.atomi.map((a) => [a.id, ...pos.get(a.id)]);
    lobovi = slot.p.map((kut) => (-kut * Math.PI) / 180); // y prema dolje
  }
  const naboj = M.Qspec ? 16 : 0;
  const pad = 36 + naboj;
  const xs = pts.map((p) => p[1]);
  const ys = pts.map((p) => p[2]);
  if (pr) {
    // oblaci neveznih parova zauzimaju mjesto kao atomi
    for (const t of lobovi) {
      xs.push(Math.cos(t) * 0.8);
      ys.push(-Math.sin(t) * 0.8);
    }
  }
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const W = SIRINA;
  const sc = Math.min((W - 2 * pad) / (x1 - x0 || 1), (300 - 2 * pad) / (y1 - y0 || 1), 62);
  const hPrirodno = Math.max(150, Math.min(340, (y1 - y0) * sc + 2 * pad));
  const h = hZad ?? hPrirodno;
  const ox = (W - sc * (x1 - x0)) / 2;
  const oy = (h - sc * (y1 - y0)) / 2;
  const T = (x, y) => [ox + (x - x0) * sc, h - (oy + (y - y0) * sc)];
  return { W, h, hPrirodno, sc, p: new Map(pts.map(([id, x, y]) => [id, T(x, y)])), stil, lobovi, centar: pr?.c ?? null };
}

// Sve što se crta iz položaja: veze (s redom iz stanja), nevezni parovi, oblaci, zagrade s nabojem, brojevi.
// stanje: {nevezni: {id: n}, redovi: [red po vezi], vidiParove, brojevi: {id: n}}
export function primitivi(M, P, stanje = {}) {
  const nevezni = stanje.nevezni ?? tocniParovi(M);
  const redovi = stanje.redovi ?? M.veze.map((v) => v.red);
  const A = new Map(M.atomi.map((a) => [a.id, a]));
  const hw = (a) => (a.kostur ? 0 : labelHalfWidth(a.simbol));
  const dirs = new Map(M.atomi.map((a) => [a.id, []]));
  const veze = [];
  for (const v of M.veze) {
    const [p, q] = [P.p.get(v.a), P.p.get(v.b)];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const u = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
    dirs.get(v.a).push(Math.atan2(u[1], u[0]));
    dirs.get(v.b).push(Math.atan2(-u[1], -u[0]));
    const trim = (id) => {
      const w = hw(A.get(id));
      if (!w) return 0;
      return Math.min(Math.abs(u[0]) > 1e-6 ? w / Math.abs(u[0]) : Infinity, Math.abs(u[1]) > 1e-6 ? 10 / Math.abs(u[1]) : Infinity) + 1;
    };
    const t1 = trim(v.a);
    const t2 = trim(v.b);
    const a = [p[0] + u[0] * t1, p[1] + u[1] * t1];
    const c = [q[0] - u[0] * t2, q[1] - u[1] * t2];
    const st = P.stil.get(v.k);
    const red = st === "k" ? "klin" : st === "c" ? "crtkano" : st === "klin" || st === "crtkano" ? st : redovi[v.k];
    veze.push({ k: v.k, a: v.a, b: v.b, dijelovi: bondParts(a, c, red) });
  }
  const parovi = [];
  const lobovi = [];
  if (P.centar) {
    const p = P.p.get(P.centar);
    for (const t of P.lobovi) {
      dirs.get(P.centar).push(t);
      const r = P.sc * 0.5;
      const c = [p[0] + Math.cos(t) * r, p[1] + Math.sin(t) * r];
      lobovi.push({ x: c[0], y: c[1], kut: (t * 180) / Math.PI, rx: P.sc * 0.3, ry: P.sc * 0.17, tocke: [[c[0] - Math.sin(t) * 3.4, c[1] + Math.cos(t) * 3.4], [c[0] + Math.sin(t) * 3.4, c[1] - Math.cos(t) * 3.4]] });
    }
  }
  // u prostornom pogledu nevezni parovi središnjeg atoma su oblaci, a parovi krajnjih atoma se ne crtaju
  if (stanje.vidiParove !== false && !P.centar) {
    for (const a of M.atomi) {
      if (!a.golo) continue;
      const p = P.p.get(a.id);
      const r = Math.max(13, hw(a) + 5);
      for (let k = 0; k < (nevezni[a.id] ?? 0); k++) parovi.push({ id: a.id, tocke: pairDots(p, freePairDirection(dirs.get(a.id)), r) });
    }
  }
  const brojevi = [];
  for (const a of M.atomi) {
    const b = stanje.brojevi ? stanje.brojevi[a.id] : null;
    if (b == null) continue;
    const p = P.p.get(a.id);
    const t = freePairDirection(dirs.get(a.id));
    const r = a.kostur ? 14 : Math.max(20, hw(a) + 9);
    brojevi.push({ id: a.id, x: p[0] + Math.cos(t) * r, y: p[1] + Math.sin(t) * r, tekst: String(b) });
  }
  let zagrada = null;
  if (M.Qspec) {
    const bx = M.atomi.map((a) => P.p.get(a.id));
    const extra = [...parovi.flatMap((x) => x.tocke), ...lobovi.flatMap((l) => [[l.x - l.rx, l.y - l.rx], [l.x + l.rx, l.y + l.rx]])];
    const xs = [...bx.map((p) => p[0]), ...extra.map((p) => p[0])];
    const ys = [...bx.map((p) => p[1]), ...extra.map((p) => p[1])];
    const [x0, x1] = [Math.min(...xs) - 20, Math.max(...xs) + 20];
    const [y0, y1] = [Math.min(...ys) - 20, Math.max(...ys) + 20];
    zagrada = { x0, x1, y0, y1, naboj: zapisNaboja(M.Qspec), gornji: gornjiNaboj(M.Qspec) };
  }
  const atomi = M.atomi.map((a) => ({ id: a.id, simbol: a.simbol, kostur: a.kostur, golo: a.golo, el: a.el, istaknut: a.istaknut, x: P.p.get(a.id)[0], y: P.p.get(a.id)[1] }));
  // zaokruženo na desetinku piksela (manji DOM, isti crtež)
  const r = (x) => Math.round(x * 10) / 10;
  const rp = (p) => [r(p[0]), r(p[1])];
  for (const v of veze) for (const d of v.dijelovi) d.klin ? (d.klin = d.klin.map(rp)) : (d.crta = d.crta.map(rp));
  for (const p of parovi) p.tocke = p.tocke.map(rp);
  for (const l of lobovi) Object.assign(l, { x: r(l.x), y: r(l.y), rx: r(l.rx), ry: r(l.ry), kut: r(l.kut), tocke: l.tocke.map(rp) });
  for (const b of brojevi) Object.assign(b, { x: r(b.x), y: r(b.y) });
  if (zagrada) Object.assign(zagrada, { x0: r(zagrada.x0), x1: r(zagrada.x1), y0: r(zagrada.y0), y1: r(zagrada.y1) });
  return { W: P.W, h: r(P.h), atomi, veze, parovi, lobovi, zagrada, brojevi };
}

// Najmanji razmak središta atoma u pikselima crteža: meta za dodir je 44 (na mobitelu širokom 320 px oko 39 px).
export const META = 44;
const MIN_RAZMAK = META;
export function najmanjiRazmak(M, s) {
  const P = polozaji(M, "lewis", s);
  const t = [...P.p.values()];
  let min = Infinity;
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) min = Math.min(min, Math.hypot(t[i][0] - t[j][0], t[i][1] - t[j][1]));
  return min;
}

// ── provjera odgovora ──
const brojElektrona = (M, redovi, nevezni) => 2 * M.veze.reduce((t, v) => t + (redovi[v.k] ?? 1), 0) + 2 * M.atomi.reduce((t, a) => t + (nevezni[a.id] ?? 0), 0);
export const elektronaNacrtano = brojElektrona;
// „ugljik 4 + 3 · 6 (kisik) + 2 (naboj 2−)“
function raspisElektrona(M) {
  const n = {};
  for (const c of M.cv) n[c.el] = (n[c.el] ?? 0) + 1;
  const dijelovi = Object.entries(n).map(([el, k]) => (k === 1 ? `${valentni(el)} (${el})` : `${k} · ${valentni(el)} (${el})`));
  if (M.Q) dijelovi.push(M.Q < 0 ? `${-M.Q} za naboj ${zapisNaboja(M.Q)}` : `− ${M.Q} za naboj ${zapisNaboja(M.Q)}`);
  return dijelovi.join(" + ").replace("+ −", "−");
}
const potpis = (M, redovi, nevezni) =>
  M.atomi
    .map((a) => {
      const r = M.veze.filter((v) => v.a === a.id || v.b === a.id).map((v) => redovi[v.k]).sort().join("");
      return `${a.el}:${r}:${nevezni[a.id] ?? 0}`;
    })
    .sort()
    .join("|");
const opisVisestrukih = (M, redovi) => {
  const d = M.veze.filter((v) => redovi[v.k] === 2).length;
  const t = M.veze.filter((v) => redovi[v.k] === 3).length;
  const dio = [];
  if (d) dio.push(d === 1 ? "jednom dvostrukom vezom" : `${d === 2 ? "dvjema" : d} dvostrukim vezama`);
  if (t) dio.push(t === 1 ? "jednom trostrukom vezom" : `${t} trostrukim vezama`);
  return dio.length ? dio.join(" i ") : "samo jednostrukim vezama";
};

function provjeriParove(s, M, odgovor) {
  const nevezni = {};
  for (const a of M.atomi) {
    const v = Number(odgovor?.nevezni?.[a.id] ?? 0);
    if (!Number.isInteger(v) || v < 0) return { tocno: false, poruka: "Broj neveznih parova je cijeli broj od 0 naviše.", prazno: true };
    nevezni[a.id] = v;
  }
  const tocniRed = M.veze.map((v) => v.red);
  const redovi = (s.mijenja ?? "oboje") === "parove" ? tocniRed : M.veze.map((v) => Number(odgovor?.veze?.[v.k] ?? 1));
  if (redovi.some((r) => ![1, 2, 3].includes(r))) return { tocno: false, poruka: "Veza je jednostruka, dvostruka ili trostruka.", prazno: true };
  const E = brojElektrona(M, redovi, nevezni);
  const V = M.lewis.V;
  if (E !== V) {
    return {
      tocno: false,
      poruka: `Nacrtano je ${E} elektrona, a ${ime(M)} ima ${V} valentnih: ${raspisElektrona(M)} = ${V}. Svaka crtica i svaki par su 2 elektrona.`,
      krivi: [],
    };
  }
  const krivi = [];
  let poruka = null;
  const iste = (a) => M.atomi.filter((b) => b.el === a.el).length > 1;
  // vodik prvi: nevezni par na vodiku je najčešća zabuna, a tada i susjedu fale elektroni
  for (const a of [...M.atomi].sort((x, y) => (y.el === "H") - (x.el === "H"))) {
    const moje = M.veze.filter((v) => v.a === a.id || v.b === a.id);
    const bs = moje.reduce((t, v) => t + redovi[v.k], 0);
    const lj = 2 * (bs + nevezni[a.id]);
    if (dozvoljeno(a.el).includes(lj)) continue;
    krivi.push(a.id);
    if (poruka) continue;
    const tko = `${iste(a) ? "Označeni " : ""}${iste(a) ? naziv(a.el) : veliko(naziv(a.el))}`;
    if (a.el === "H") poruka = nevezni[a.id] ? "Vodik nema neveznih parova: jedna veza mu daje 2 elektrona, koliko mu treba (kao helij)." : `${tko} ima ${elektrona(lj)} oko sebe, a vodiku trebaju 2: jedna jednostruka veza.`;
    else if (lj < Math.min(...dozvoljeno(a.el))) {
      poruka = `${tko} ima ${elektrona(lj)} oko sebe, a treba ${Math.min(...dozvoljeno(a.el))}${MANJAK[a.el] ? "" : " (oktet)"}.`;
      if ((s.mijenja ?? "oboje") === "oboje") poruka += " Kad elektrona više nema, susjed može jedan svoj nevezni par pretvoriti u dvostruku vezu.";
    } else if (!prosiriv(a.el)) poruka = `${tko} ima ${elektrona(lj)} oko sebe, a atom iz 2. periode ne može imati više od 8 (oktet).`;
    else poruka = `${tko} ima ${elektrona(lj)} oko sebe: ni prošireni oktet nema toliko (najviše 12).`;
  }
  if (krivi.length) return { tocno: false, poruka, krivi };
  const tocniPar = tocniParovi(M);
  if (potpis(M, redovi, nevezni) === potpis(M, tocniRed, tocniPar)) return { tocno: true };
  // ispravan oktet, ali druga struktura od tražene
  const sredisnjiProsiren = M.atomi.find((a) => a.golo && prosiriv(a.el) && (M.lewis.ljuska[a.spoj] ?? 8) > 8);
  const mojih = M.veze.reduce((t, v) => t + redovi[v.k], 0);
  const tocnih = M.veze.reduce((t, v) => t + tocniRed[v.k], 0);
  if (sredisnjiProsiren && mojih < tocnih)
    return {
      tocno: false,
      poruka: `Svi atomi imaju oktet, ali u ključu mature ${naziv(sredisnjiProsiren.el)} ima prošireni oktet (${M.lewis.ljuska[sredisnjiProsiren.spoj]} elektrona): ${ime(M)} se crta s ${opisVisestrukih(M, tocniRed)}.`,
      krivi: [],
    };
  return { tocno: false, poruka: `${M.atomi.some((a) => a.golo && a.el !== "H" && (M.lewis.ljuska[a.spoj] ?? 8) < 8) ? "Svaki atom ima dopušten broj elektrona" : "Svi atomi imaju oktet"}, ali tražena je struktura s ${opisVisestrukih(M, tocniRed)}. Rasporedi veze drukčije.`, krivi: [] };
}

function porukaOblika(M, ob, kriv) {
  if (ob.dvoatomna) return "Dva atoma uvijek leže na jednom pravcu: čestica je linearna.";
  const c = M.cv[ob.i];
  const o = ob.o;
  const tko = veliko(naziv(c.el));
  let p = `${tko} ima ${veza(o.sigma)} i ${o.lp ? parova(o.lp) : "nema neveznih parova"}: to su ${smjera(o.d)}, ${RASPORED[o.d]}${o.visestruka ? "; dvostruka veza je jedan smjer" : ""}.`;
  const t = OBLICI[ob.kljuc].oblik;
  const k = OBLICI[kriv]?.oblik ?? kriv;
  const dSmjerova = { tetraedarska: 4, trigonska_planarna: 3, linearna: 2 }[kriv];
  if (o.lp && dSmjerova === o.d) p += ` To je raspored svih smjerova, ali atomi su samo na ${BROJEVI[o.sigma]} od njih: oblik je ${t}, ne ${k}.`;
  else if (o.lp && kriv === "linearna") p += ` Nevezni parovi guraju veze, pa atomi nisu na pravcu: oblik je ${t}, ne linearni.`;
  else if (o.lp && kriv === "trigonska_planarna") p += ` Nevezni par gura veze od sebe, izvan ravnine: oblik je ${t}, ne plošni trokut.`;
  else if (!o.lp && (kriv === "kutna" || kriv === "trigonska_piramidalna")) p += ` Nema neveznog para koji bi savio veze: oblik je ${t}, ne ${k}.`;
  else if (!o.lp && ob.kljuc === "tetraedarska" && kriv === "trigonska_planarna") p += " Formula je nacrtana u ravnini, ali četiri veze se razmiču u prostor: tetraedar, ne plošni oblik.";
  else p += ` Oblik je ${t}, ne ${k}.`;
  return p;
}

function provjeriOblik(s, M, odgovor) {
  const pitaj = pitajOd(s);
  if (pitaj.includes("oblik") && !odgovor?.oblik) return { tocno: false, poruka: "Odaberi oblik.", prazno: true };
  if (pitaj.includes("polarnost") && typeof odgovor?.polarna !== "boolean") return { tocno: false, poruka: "Odaberi je li molekula polarna ili nepolarna.", prazno: true };
  if (pitaj.includes("oblik")) {
    const ob = oblikCestice(M, s);
    if (odgovor.oblik !== ob.kljuc) return { tocno: false, poruka: porukaOblika(M, ob, odgovor.oblik), krivo: "oblik" };
  }
  if (pitaj.includes("polarnost")) {
    const p = polarnost(M, s);
    if (odgovor.polarna !== p.polarna) return { tocno: false, poruka: p.razlog, krivo: "polarnost" };
  }
  return { tocno: true };
}

function provjeriOznaci(s, M, odgovor) {
  const odabrani = [...new Set((Array.isArray(odgovor) ? odgovor : []).map(String))].filter((id) => M.poId.has(id));
  if (!odabrani.length) return { tocno: false, poruka: "Dodirni barem jedan atom, pa Provjeri.", prazno: true };
  const T = tocnoOznaci(M, s);
  const neob = new Set(T.neobavezni ?? []);
  const t = s.trazi;
  // točno ako je odabir jednak nekom točnom skupu (uz neobavezne vodike skupine)
  const bez = odabrani.filter((id) => !neob.has(id));
  if (T.skupovi.some((sk) => sk.length === bez.length && sk.every((id) => bez.includes(id)))) return { tocno: true };
  const sviTocni = new Set(T.skupovi.flat());
  const krivi = bez.filter((id) => !sviTocni.has(id));
  const a = (id) => M.poId.get(id);
  const oz = (id) => a(id).simbol || "C";
  if (t === "zadano") {
    const k = (s.krivo ?? []).find((x) => odabrani.includes(String(x.id)) && !sviTocni.has(String(x.id)));
    if (k) return { tocno: false, poruka: k.poruka, krivi };
    return { tocno: false, poruka: krivi.length ? "Neki od označenih atoma nisu traženi." : "Nisi označio sve tražene atome.", krivi };
  }
  if (t === "asimetricni_c") {
    if (krivi.length) return { tocno: false, poruka: zastoNijeAsim(M, a(krivi[0]).spoj), krivi };
    return { tocno: false, poruka: "Točno, ali ima još asimetričnih C-atoma: potraži svaki C-atom s četiri različite skupine.", krivi: [] };
  }
  if (t === "slobodni_par") {
    if (krivi.length) {
      const x = a(krivi[0]);
      const i = x.spoj;
      return { tocno: false, poruka: `${x.golo ? veliko(naziv(x.el)) : oz(krivi[0])} ${x.el === "H" ? "ima samo jednu vezu i nijedan nevezni par" : `s ${veza(M.lewis.nb[i])} već ima oktet, pa nema neveznih parova`}.`, krivi };
    }
    return { tocno: false, poruka: "Točno, ali još neki atomi imaju nevezne parove: prebroji elektrone oko svakog atoma.", krivi: [] };
  }
  if (t === "c1") {
    const L = glavniLanac(M);
    const g = L.glavna;
    const x = a(bez[0]);
    const naKraju = L.lanci.some((p) => M.cv[p[p.length - 1]].atom === bez[0]);
    const uLancu = L.lanci.some((p) => p.some((i) => M.cv[i].atom === bez[0]));
    if (bez.length > 1) return { tocno: false, poruka: "Označi samo jedan C-atom: onaj koji dobiva broj 1.", krivi: [] };
    if (x.el !== "C") return { tocno: false, poruka: "Brojevi idu C-atomima glavnog lanca.", krivi: [bez[0]] };
    if (!uLancu) return { tocno: false, poruka: "Taj C-atom nije u glavnom lancu: broji se samo glavni (najdulji) lanac.", krivi: [bez[0]] };
    if (!naKraju && L.lanci[0].length > 1) return { tocno: false, poruka: "Broj 1 dobiva C-atom na kraju glavnog lanca, ne u sredini.", krivi: [bez[0]] };
    const zasto = g
      ? `Numerira se s kraja bližeg glavnoj skupini (${IME_GLAVNE[g]}), da dobije što manji broj.`
      : instance(M, "dvostruka_veza").length || instance(M, "trostruka_veza").length
        ? "Numerira se s kraja bližeg višestrukoj vezi, da dobije što manji broj."
        : "Numerira se s kraja bližeg prvom ogranku, da brojevi ogranaka budu što manji.";
    return { tocno: false, poruka: `${zasto}`, krivi: [bez[0]] };
  }
  if (t === "lanac") {
    if (krivi.some((id) => a(id).el !== "C")) return { tocno: false, poruka: "U glavni lanac idu samo C-atomi.", krivi: krivi.filter((id) => a(id).el !== "C") };
    const L = glavniLanac(M);
    // je li odabir neprekinut niz
    const cvorovi = bez.flatMap((id) => a(id).cvorovi.filter((i) => M.cv[i].el === "C"));
    const skup = new Set(cvorovi);
    const kraj = cvorovi.filter((i) => M.adj[i].filter((y) => skup.has(y.j)).length <= 1);
    const grananje = cvorovi.some((i) => M.adj[i].filter((y) => skup.has(y.j)).length > 2);
    const povezano = (() => {
      if (!cvorovi.length) return false;
      const v = new Set([cvorovi[0]]);
      const st = [cvorovi[0]];
      while (st.length) for (const y of M.adj[st.pop()]) if (skup.has(y.j) && !v.has(y.j)) v.add(y.j), st.push(y.j);
      return v.size === skup.size;
    })();
    if (!povezano || grananje || kraj.length > 2) return { tocno: false, poruka: "Označeni C-atomi ne čine jedan neprekinut lanac bez grananja.", krivi: [] };
    if (L.glavna && !L.P.some((i) => skup.has(i))) return { tocno: false, poruka: `Glavni lanac mora sadržavati C-atom glavne skupine (${IME_GLAVNE[L.glavna]}).`, krivi: [] };
    if (skup.size < L.duljina) return { tocno: false, poruka: "Postoji dulji lanac: broji C-atome i kroz ogranke.", krivi: [] };
    return { tocno: false, poruka: "Taj lanac je jednako dug, ali glavni lanac ima više ogranaka ili višestrukih veza: odaberi drugi put kroz molekulu.", krivi: [] };
  }
  // funkcijske skupine
  if (krivi.length) return { tocno: false, poruka: `${oz(krivi[0])} nije dio tražene skupine: ${IME_SKUPINE[t]}.`, krivi };
  return { tocno: false, poruka: `Nisi označio sve: ${IME_SKUPINE[t]} ima još atoma${instance(M, t).length > 1 ? " ili se javlja više puta" : ""}.`, krivi: [] };
}

export const pitajOd = (s) => [].concat(s.pitaj ?? ["oblik"]);
export const mijenjaOd = (s) => s.mijenja ?? "oboje";
// Prekidači u istraživanju: zadani ili svi koji za ovu molekulu imaju smisla.
export function prikaziOd(s, M = model(s)) {
  if (M.greska) return [];
  const moze = {
    parovi: M.atomi.some((a) => a.golo) && !M.lewis.greska,
    oblik: !!prostorno(M, s) || (!oblikCestice(M, s).greska && !!s.sredisnji),
    numeracija: !!numeracija(M) && M.atomi.filter((a) => a.el === "C").length >= 3,
    asimetricni: !M.lewis.greska && asimetricni(M).length > 0,
  };
  return s.prikazi ? [].concat(s.prikazi).filter((p) => moze[p]) : PRIKAZI.filter((p) => moze[p]);
}
export const vidiParoveOd = (s) => (s.nacin === "oznaci" && s.trazi === "slobodni_par" ? false : s.nacin === "parovi" ? true : s.vidi_parove ?? s.nacin !== "oznaci");

export const molekula = {
  tip: "molekula",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Strukturna ili Lewisova formula molekule ili iona (SVG, stane na 360 px). Kemiju računa kod.
Čestica: formula?: "H₂O" – za jednostavne (jedan središnji atom ili dva atoma: H₂O, NH₃, CH₄, CO₂, HCN, NO₂⁻, CO₃²⁻, SO₃²⁻, PO₄³⁻, BF₃, PCl₅…) kod sam složi Lewisovu formulu u ravnini (kao u udžbeniku, ne odaje oblik); S i P s kisikom dobiju prošireni oktet kao u ključu mature (PO₄³⁻ jedna P=O, SO₃²⁻ jedna S=O). Oksokiseline, lanci i O₃ ne: tada atomi i veze.
ili atomi: [{id, simbol, x, y, nevezni?, broj?, istaknut?}], veze: [[id, id, red]], prsten?, uz? – isto kao skica strukturna_formula (x, y u duljinama veze, y gore), pa se molekula iz objašnjenja prenese bez prepisivanja. simbol: element ("O"), "" (kut kosturne formule: C s vodicima koji se ne pišu) ili skupina sažete formule ("CH₃", "CH₂", "OH", "HO", "COOH", "CHO", "NH₂", "C₂H₅", "CH(CH₃)₂", "COO⁻", "NH₃⁺"; R i C₁₇H₃₃ su ostatak bez kemije). red: 1, 2, 3 (klin/crtkano = jednostruka nacrtana prostorno). Uz atome formula?: provjerava se sastav i naboj.
nevezni na atomu: ne treba (kod ih računa iz okteta); ako ga upišeš, mora se slagati. Samo kad višak elektrona može biti na dva atoma s proširenim oktetom, zadaj ga.
naboj?: "2−", "−", "+" – naboj cijelog iona (crta se uglata zagrada); ili naboj u oznaci skupine (COO⁻), ne oboje. Formalni naboj se ne računa ni ne crta.
en?: {C: 2.6, O: 3.4} – elektronegativnosti kako ih daje tekst zadatka (inače Pauling iz tablice); za razliku Δ i polarnost.
istakni?: [id] – istaknuti atomi (ne u "oznaci"). vidi_parove?: false sakrije nevezne parove.
nacin:
- "istrazi" (nije zadatak): dodir atoma pokaže valentne elektrone, veze, nevezne parove, elektrone oko atoma (oktet, duet, prošireni oktet), Δ i vrstu veze, smjerove oko atoma po VSEPR-u i je li C asimetričan; prekidači (prikazi?: ["parovi","oblik","numeracija","asimetricni"], zadano: svi koji za česticu imaju smisla): nevezni parovi, prostorni oblik (klin/crtkano, oblaci neveznih parova, ime i kut, polarnost), numeracija glavnog lanca, oznaka asimetričnog C (*);
- "parovi": učenik dodaje nevezne parove (i mijenja red veza ako mijenja: "oboje", zadano; "parove" = veze su zadane) dok svi atomi nemaju oktet. Provjera: ukupno elektrona (raspis valentnih + naboj), oktet/duet/prošireni oktet svakog atoma, pa ista struktura kao tražena (rezonancijske strukture su iste). Samo atomi bez vodika u oznaci, najviše 8 atoma;
- "oblik": učenik bira oblik (linearna, kutna, trigonska planarna, trigonska piramidalna, tetraedarska; za 5 i 6 smjerova i bipiramida/oktaedar) i/ili polarnost: pitaj?: ["oblik"] (zadano) | ["polarnost"] | ["oblik","polarnost"]. Oblik oko središnjeg atoma (sredisnji?: id kad ih je više, npr. C u HCO₃⁻) iz broja veza i neveznih parova; polarnost samo za neutralnu molekulu s jednim središnjim atomom ili dva atoma. Poruka za krivi izbor je konkretna („Dušik ima tri veze i jedan nevezni par…“). oblik?/polarna? ako ih upišeš, moraju se slagati s izračunatim. Crtež je Lewisova formula u ravnini (ne odaje oblik); ne zadaji koordinate koje pokazuju oblik;
- "oznaci": učenik dodirom označi atome, trazi: "asimetricni_c" | "slobodni_par" (parovi se tad ne crtaju) | "lanac" (glavni lanac) | "c1" (C-atom koji dobiva broj 1) | "hidroksilna" | "karboksilna" | "karbonilna" | "aldehidna" | "ketonska" | "eterska" | "esterska" | "amino" | "amidna" | "halogen" | "dvostruka_veza" | "trostruka_veza" | "zadano" (tocno: [id] i krivo?: [{id, poruka}] napiše autor). Kod računa točne atome sam; glavni lanac i numeraciju samo za aciklički lanac bez etera i estera kad su pravila jednoznačna (inače validate odbija). Uz lanac i c1 atomi nemaju „broj“.`,
  primjer: {
    tip: "molekula",
    nacin: "parovi",
    tekst: "Složi Lewisovu formulu nitritnog iona NO₂⁻: dodaj nevezne parove i promijeni red veze, dok svi atomi nemaju oktet.",
    formula: "NO₂⁻",
  },
  primjeri: [
    {
      tip: "molekula",
      nacin: "istrazi",
      tekst: "Karbonatni ion iz vapnenca. Dodirni atome i pogledaj koliko elektrona ima svaki; uključi oblik i pogledaj zašto je ion plošan.",
      formula: "CO₃²⁻",
      en: { C: 2.6, O: 3.4 },
    },
    {
      tip: "molekula",
      nacin: "istrazi",
      tekst: "Butan-2-ol. Dodirni C-atome i pogledaj koji ima četiri različite skupine; uključi numeraciju lanca.",
      formula: "C₄H₁₀O",
      atomi: [
        { id: "C1", simbol: "CH₃", x: 0, y: 0 },
        { id: "C2", simbol: "CH", x: 0.87, y: 0.5 },
        { id: "O", simbol: "OH", x: 0.87, y: 1.5 },
        { id: "C3", simbol: "CH₂", x: 1.74, y: 0 },
        { id: "C4", simbol: "CH₃", x: 2.61, y: 0.5 },
      ],
      veze: [["C1", "C2"], ["C2", "O"], ["C2", "C3"], ["C3", "C4"]],
    },
    {
      tip: "molekula",
      nacin: "oblik",
      tekst: "Kakav je oblik sulfitnog iona SO₃²⁻?",
      formula: "SO₃²⁻",
    },
    {
      tip: "molekula",
      nacin: "oblik",
      tekst: "Kakav je oblik molekule amonijaka i je li molekula polarna?",
      formula: "NH₃",
      pitaj: ["oblik", "polarnost"],
    },
    {
      tip: "molekula",
      nacin: "oznaci",
      tekst: "2-Metilbutan-1-ol. Dodirni asimetrično supstituirani C-atom.",
      formula: "C₅H₁₂O",
      trazi: "asimetricni_c",
      atomi: [
        { id: "C1", simbol: "CH₂", x: 0, y: 0 },
        { id: "O", simbol: "HO", x: -0.87, y: 0.5 },
        { id: "C2", simbol: "CH", x: 0.87, y: 0.5 },
        { id: "M", simbol: "CH₃", x: 0.87, y: 1.5 },
        { id: "C3", simbol: "CH₂", x: 1.74, y: 0 },
        { id: "C4", simbol: "CH₃", x: 2.61, y: 0.5 },
      ],
      veze: [["O", "C1"], ["C1", "C2"], ["C2", "M"], ["C2", "C3"], ["C3", "C4"]],
    },
    {
      tip: "molekula",
      nacin: "oznaci",
      tekst: "Mliječna kiselina ima dvije skupine s kisikom. Dodirni atome hidroksilne skupine (ne one u karboksilnoj).",
      formula: "C₃H₆O₃",
      trazi: "hidroksilna",
      atomi: [
        { id: "C3", simbol: "CH₃", x: 0, y: 0 },
        { id: "C2", simbol: "C", x: 0.87, y: 0.5 },
        { id: "H", simbol: "H", x: 0.87, y: -0.5 },
        { id: "O2", simbol: "OH", x: 0.87, y: 1.5 },
        { id: "C1", simbol: "C", x: 1.74, y: 0 },
        { id: "Od", simbol: "O", x: 1.74, y: -1 },
        { id: "Ok", simbol: "OH", x: 2.61, y: 0.5 },
      ],
      veze: [["C3", "C2"], ["C2", "H"], ["C2", "O2"], ["C2", "C1"], ["C1", "Od", 2], ["C1", "Ok"]],
    },
    {
      tip: "molekula",
      nacin: "oznaci",
      tekst: "3-Hidroksipentanska kiselina. Dodirni C-atom koji u imenu dobiva broj 1.",
      formula: "C₅H₁₀O₃",
      trazi: "c1",
      atomi: [
        { id: "a", simbol: "CH₃", x: 0, y: 0.5 },
        { id: "b", simbol: "CH₂", x: 0.87, y: 0 },
        { id: "c", simbol: "CH", x: 1.74, y: 0.5 },
        { id: "o", simbol: "OH", x: 1.74, y: 1.5 },
        { id: "d", simbol: "CH₂", x: 2.61, y: 0 },
        { id: "e", simbol: "COOH", x: 3.55, y: 0.5 },
      ],
      veze: [["a", "b"], ["b", "c"], ["c", "o"], ["c", "d"], ["d", "e"]],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    need(NACINI.includes(s.nacin), `molekula.nacin mora biti jedan od: ${NACINI.join(", ")}`);
    need(isText(s.tekst), "molekula treba „tekst“");
    for (const f of Object.keys(s)) need(POLJA.includes(f), `molekula nema polje „${f}“ (dopuštena: ${POLJA.slice(1).join(", ")})`);
    if (Array.isArray(s.atomi))
      for (const a of s.atomi) for (const f of Object.keys(a ?? {})) need(POLJA_ATOMA.includes(f), `atom ${a?.id} nema polje „${f}“ (dopuštena: ${POLJA_ATOMA.join(", ")})`);
    if (s.en != null)
      need(
        typeof s.en === "object" && Object.entries(s.en).every(([el, v]) => element(el) && typeof v === "number" && v >= 0.6 && v <= 4.1),
        "en je {simbol: elektronegativnost} (npr. {C: 2.6, O: 3.4})",
      );
    if (list.length) return list;
    const M = model(s);
    if (M.greska) return [M.greska];
    if (M.lewis.greska) return [M.lewis.greska];
    for (const a of M.atomi) {
      if (a.nevezni != null) need(a.golo && Number.isInteger(a.nevezni) && a.nevezni >= 0 && a.nevezni <= NAJVISE_PAROVA, `atom ${a.id}: nevezni (0–4) samo na atomu bez vodika u oznaci`);
      if (a.broj != null) need(Number.isInteger(a.broj) && a.broj >= 1, `atom ${a.id}: broj je redni broj C-atoma u lancu (1, 2, …)`);
    }
    // autorova numeracija mora biti točna, ako je kod zna izračunati
    const sBrojem = M.atomi.filter((a) => a.broj != null);
    if (sBrojem.length) {
      const L = glavniLanac(M);
      if (!L.greska) {
        const moguce = L.lanci.map((p) => new Map(p.map((i, k) => [M.cv[i].atom, k + 1])));
        need(
          moguce.some((m) => sBrojem.every((a) => m.get(a.id) === a.broj)),
          `brojevi atoma ne slažu se s numeracijom glavnog lanca (${[...moguce[0]].map(([id, n]) => `${id}=${n}`).join(", ")})`,
        );
      }
    }
    if (s.istakni != null) {
      need(Array.isArray(s.istakni) && s.istakni.every((id) => M.poId.has(String(id))), "istakni je popis id-jeva atoma");
      need(s.nacin !== "oznaci", "oznaci ne ističe atome (to bi odalo odgovor)");
    }
    if (s.nacin === "oznaci") need(!M.atomi.some((a) => a.istaknut), "oznaci ne ističe atome (istaknut bi odao odgovor)");
    if (s.vidi_parove != null) need(typeof s.vidi_parove === "boolean", "vidi_parove je true ili false");
    if (s.sredisnji != null) {
      const c = sredisnji(M, s);
      need(!c.greska, c.greska);
    }
    const samo = (f, nacini) => s[f] == null || need(nacini.includes(s.nacin), `${f} ide samo uz nacin ${nacini.join(" ili ")}`);
    samo("mijenja", ["parovi"]);
    samo("pitaj", ["oblik"]);
    samo("oblik", ["oblik"]);
    samo("polarna", ["oblik"]);
    samo("trazi", ["oznaci"]);
    samo("tocno", ["oznaci"]);
    samo("krivo", ["oznaci"]);
    samo("prikazi", ["istrazi"]);

    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      if (s.prikazi != null) {
        const p = [].concat(s.prikazi);
        need(p.every((x) => PRIKAZI.includes(x)), `prikazi su neki od: ${PRIKAZI.join(", ")}`);
        const moze = prikaziOd({ ...s, prikazi: undefined }, M);
        for (const x of p) if (PRIKAZI.includes(x)) need(moze.includes(x), `prikazi „${x}“ nema smisla za ovu česticu (${x === "oblik" ? "nema jednog središnjeg atoma sa zasebno nacrtanim susjedima; zadaj sredisnji" : x === "numeracija" ? "glavni lanac kod ne određuje" : x === "asimetricni" ? "nema asimetričnog C" : "nema atoma bez vodika"})`);
      }
    }

    if (s.nacin === "parovi") {
      need(["parove", "oboje"].includes(mijenjaOd(s)), `mijenja je "parove" ili "oboje"`);
      need(M.atomi.every((a) => a.golo), "u načinu parovi svi atomi su elementi bez vodika u oznaci (H crtaj kao zaseban atom)");
      need(M.atomi.length <= 8, "u načinu parovi najviše 8 atoma (dodir na mobitelu)");
      if (!list.length) need(najmanjiRazmak(M, s) >= MIN_RAZMAK, "atomi su preblizu za dodir na mobitelu: razmakni ih (veza oko 1)");
    }

    if (s.nacin === "oblik") {
      const p = pitajOd(s);
      need(p.length >= 1 && p.every((x) => PITAJ.includes(x)) && new Set(p).size === p.length, `pitaj je ["oblik"], ["polarnost"] ili ["oblik","polarnost"]`);
      if (!list.length) {
        if (p.includes("oblik")) {
          const ob = oblikCestice(M, s);
          if (need(!ob.greska, ob.greska) && s.oblik != null) need(s.oblik === ob.kljuc, `zadani oblik „${s.oblik}“ ne slaže se s izračunatim (${ob.kljuc})`);
        } else need(s.oblik == null, "oblik (odgovor) ide samo kad pitaj sadrži „oblik“");
        if (p.includes("polarnost")) {
          const pol = polarnost(M, s);
          if (need(!pol.greska, pol.greska) && s.polarna != null) need(s.polarna === pol.polarna, `zadana polarnost ne slaže se s izračunatom (${pol.polarna ? "polarna" : "nepolarna"})`);
        } else need(s.polarna == null, "polarna (odgovor) ide samo kad pitaj sadrži „polarnost“");
      }
    }

    if (s.nacin === "oznaci") {
      if (need(TRAZI.includes(s.trazi), `trazi je jedan od: ${TRAZI.join(", ")}`)) {
        if (s.trazi === "zadano") {
          if (need(Array.isArray(s.tocno) && s.tocno.length >= 1, "trazi zadano treba tocno: [id…] (barem jedan)")) need(s.tocno.every((id) => M.poId.has(String(id))), "tocno: svaki id mora biti atom molekule");
          if (s.krivo != null)
            need(
              Array.isArray(s.krivo) && s.krivo.every((k) => M.poId.has(String(k?.id)) && isText(k?.poruka) && !s.tocno?.map(String).includes(String(k.id))),
              "krivo je [{id, poruka}] za atome koji nisu točni",
            );
        } else {
          need(s.krivo == null, "krivo ide samo uz trazi zadano (ostale poruke računa kod)");
          const T = tocnoOznaci(M, s);
          if (need(!T.greska, T.greska) && s.tocno != null) {
            const z = [...new Set([].concat(s.tocno).map(String))].sort().join();
            need(
              T.skupovi.some((sk) => [...sk].sort().join() === z),
              `zadani tocno (${z}) ne slaže se s izračunatim (${T.skupovi.map((sk) => sk.join(", ")).join(" ili ")})`,
            );
          }
          if (["lanac", "c1"].includes(s.trazi)) need(!M.atomi.some((a) => a.broj != null), `uz trazi ${s.trazi} atomi nemaju „broj“ (to je odgovor)`);
          if (s.trazi === "slobodni_par") need(s.vidi_parove !== true, "uz trazi slobodni_par nevezni parovi se ne crtaju");
        }
      }
      if (!list.length) need(najmanjiRazmak(M, s) >= MIN_RAZMAK, "atomi su preblizu za dodir na mobitelu: razmakni ih ili crtaj skupine (CH₃) umjesto svakog H");
    }
    return list.filter(Boolean);
  },

  check(s, odgovor) {
    const M = model(s);
    if (M.greska || M.lewis.greska) return { tocno: false, poruka: "Ovaj korak se ne može provjeriti." };
    if (s.nacin === "parovi") return provjeriParove(s, M, odgovor);
    if (s.nacin === "oblik") return provjeriOblik(s, M, odgovor);
    if (s.nacin === "oznaci") return provjeriOznaci(s, M, odgovor);
    return { tocno: true };
  },

  tocanOdgovor(s) {
    const M = model(s);
    if (M.greska || M.lewis.greska) return "";
    if (s.nacin === "parovi") {
      const r = M.veze.map((v) => v.red);
      const crtica = r.reduce((a, b) => a + b, 0);
      const par = Object.values(tocniParovi(M)).reduce((a, b) => a + b, 0);
      const prosiren = M.atomi.find((a) => a.golo && (M.lewis.ljuska[a.spoj] ?? 8) > 8);
      // nepotpuni oktet (BF₃, BeCl₂, BH₃): bor i berilij imaju manje od 8 elektrona
      const nepotpun = M.atomi.find((a) => a.golo && a.el !== "H" && (M.lewis.ljuska[a.spoj] ?? 8) < 8);
      const iznimka = prosiren ? `${naziv(prosiren.el)} ima prošireni oktet (${M.lewis.ljuska[prosiren.spoj]} elektrona)` : nepotpun ? `${naziv(nepotpun.el)} ima nepotpuni oktet (${M.lewis.ljuska[nepotpun.spoj]} elektrona)` : null;
      const imaH = M.atomi.some((a) => a.el === "H");
      const samoH = iznimka && M.atomi.every((a) => a === (prosiren ?? nepotpun) || a.el === "H");
      const oktet = !iznimka ? `svi atomi imaju oktet${imaH ? " (vodik duet)" : ""}` : samoH ? `${iznimka}, vodik duet` : `${iznimka}, ostali atomi oktet${imaH ? " (vodik duet)" : ""}`;
      return `${ime(M)}: ${mn(crtica, ["vezna crtica", "vezne crtice", "veznih crtica"])} (s ${opisVisestrukih(M, r)}) i ${mn(par, ["nevezni par", "nevezna para", "neveznih parova"])}; ${oktet}.`;
    }
    if (s.nacin === "oblik") {
      const p = pitajOd(s);
      const dio = [];
      if (p.includes("oblik")) {
        const ob = oblikCestice(M, s);
        dio.push(`oblik: ${imeOblika(ob.kljuc)}${ob.o ? `, vezni kut ${kutOblika(ob.o)}` : ""}`);
      }
      if (p.includes("polarnost")) dio.push(polarnost(M, s).polarna ? "polarna molekula" : "nepolarna molekula");
      return veliko(dio.join("; "));
    }
    if (s.nacin === "oznaci") {
      const T = tocnoOznaci(M, s);
      if (T.greska) return "";
      const sk = T.skupovi[0].map((id) => M.poId.get(id).simbol || "C");
      if (s.trazi === "c1") {
        const L = glavniLanac(M);
        const c1 = L.lanci[0][0];
        return L.glavna && L.P.includes(c1) ? `Broj 1 dobiva C-atom glavne skupine (${IME_GLAVNE[L.glavna]}): ${sk[0]}.` : `Broj 1 dobiva ${sk[0]} na kraju lanca bližem ${L.glavna ? `skupini ${IME_GLAVNE[L.glavna]}` : "višestrukoj vezi ili ogranku"}.`;
      }
      if (s.trazi === "lanac") return `Glavni lanac ima ${glavniLanac(M).duljina} C-atoma: ${sk.join(", ")}.`;
      return `Označeno: ${nabrajanje(sk)}.`;
    }
    return "";
  },
};
