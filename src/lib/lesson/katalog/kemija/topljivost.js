// topljivost: krivulja topljivosti soli (lekcija 007 „Topljivost soli i plinova“, pokus 4 ispitnog kataloga „Topljivost
// soli u vodi“). Krivulja je izlomljena crta kroz zadane točke (t, topljivost); topljivost je iskazana kao u lekciji i
// katalogu masenim udjelom soli u zasićenoj otopini w_sat (iskaz "w") ili, kao u ispitima, masom soli u 100 g vode
// (iskaz "g100"). Između točaka se čita linearno; izvan raspona točaka krivulje nema (nema ekstrapolacije).
// Kod sam računa: topljivost pri t, temperaturu pri kojoj je otopina zasićena, vrstu otopine (nezasićena / zasićena /
// prezasićena), koliko soli stane i koliko se još može otopiti, pri kojoj se temperaturi pojave prvi kristalići, koliko
// se istaloži hlađenjem, w_sat iz mjerenja pokusa 4 i je li otapanje endotermno ili egzotermno (nagib krivulje), te
// tipične krive vrijednosti s porukama (w prema masi vode umjesto otopine, topljivost za 100 g vode nepreračunata,
// masa otopine umjesto vode, istaloženo = razlika najvećih masa iako otopina nije bila zasićena …).
//
// Ugrađene krivulje (KRIVULJE) su SAMO podaci iz naših zadataka i ispita; svaka ima izvor. Druge soli autor zadaje
// kao tablicu točaka (krivulja: {iskaz, tocke}).
import { isNum, parseNumber, formatNumber, near } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { atomiOd } from "./_tablice.js";
import { formulaZapis } from "./mol_racun.js";

export const NACINI = ["istrazi", "ocitaj", "vrsta", "istalozi", "pokus"];
export const ISKAZI = ["w", "g100"];
export const VRSTE = ["nezasicena", "zasicena", "prezasicena"];
export const VRSTA_IME = { nezasicena: "nezasićena", zasicena: "zasićena", prezasicena: "prezasićena" };
export const PROCESI = ["endotermno", "egzotermno"];

// ── ugrađene krivulje ──
// Lekcija 007 (plan.db, objective 7, varijacije 1–5): pravci w_sat = a + b·t sa skice uz zadatak (os i mreža iste kao
// na skici). Ispiti: tablice „m(sol u 100 g H₂O) / g“ pri zadanim temperaturama.
export const KRIVULJE = {
  KNO3: { tvar: "KNO₃", naziv: "kalijev nitrat", iskaz: "w", tocke: [[0, 0.125], [70, 0.5625]], os: { x: [0, 70], y: [0, 0.625], mreza: [10, 0.125] }, izvor: "lekcija 007, 1. varijacija: w_sat = 0,125 + 0,00625 · t" },
  NH4Cl: { tvar: "NH₄Cl", naziv: "amonijev klorid", iskaz: "w", tocke: [[0, 0.24], [90, 0.42]], os: { x: [0, 90], y: [0.2, 0.45], mreza: [10, 0.02] }, izvor: "lekcija 007, 2. varijacija: w_sat = 0,24 + 0,002 · t" },
  NaNO3: { tvar: "NaNO₃", naziv: "natrijev nitrat", iskaz: "w", tocke: [[0, 0.44], [80, 0.6]], os: { x: [0, 80], y: [0.4, 0.6], mreza: [10, 0.02] }, izvor: "lekcija 007, 3. varijacija: w_sat = 0,44 + 0,002 · t" },
  "Ba(NO3)2": { tvar: "Ba(NO₃)₂", naziv: "barijev nitrat", iskaz: "w", tocke: [[0, 0.04], [100, 0.24]], os: { x: [0, 100], y: [0, 0.24], mreza: [10, 0.02] }, izvor: "lekcija 007, 4. varijacija: w_sat = 0,04 + 0,002 · t" },
  KBr: { tvar: "KBr", naziv: "kalijev bromid", iskaz: "w", tocke: [[0, 0.37], [70, 0.475]], os: { x: [0, 70], y: [0.3, 0.5], mreza: [10, 0.01] }, izvor: "lekcija 007, 5. varijacija: w_sat = 0,37 + 0,0015 · t" },
  K2C2O4: { tvar: "K₂C₂O₄", naziv: "kalijev oksalat", iskaz: "g100", tocke: [[20, 36.4], [40, 43.8], [60, 53.2], [80, 63.6]], izvor: "ispit KEM IK-2 D-S046, zadatak 4 (tablica)" },
  "Pb(NO3)2": { tvar: "Pb(NO₃)₂", naziv: "olovov(II) nitrat", iskaz: "g100", tocke: [[10, 47.2], [20, 56.3], [30, 67.1], [40, 76.8], [50, 86.1]], izvor: "ispit KEM IK-2 D-S053, zadatak 4 (tablica)" },
};
const SUB = "₀₁₂₃₄₅₆₇₈₉";
export const ascii = (f) => [...String(f ?? "")].map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : c)).join("").replace(/\s+/g, "");
export const ugradjena = (f) => KRIVULJE[ascii(f)] ?? null;

// pokus 4: 4,0 g KNO₃ u 2,5 mL vode, pa još tri puta po 2,5 mL (ρ(vode) = 1 g/mL)
export const POKUS_MJERENJA = [2.5, 5.0, 7.5, 10.0].map((v) => ({ m_sol: { vrijednost: 4, zapis: "4,0" }, m_vode: { vrijednost: v, zapis: v.toFixed(1).replace(".", ",") } }));

const POLJA = ["tip", "nacin", "tekst", "tvar", "naziv", "krivulja", "postotak", "os", "tvari", "t", "t1", "t2", "otopina", "trazi", "jos", "proces", "mjerenja", "operacije", "tolerancija", "tolerancija_t", "krivo", "savjet"];

// ── brojevi ──
const broj = (x) => (isNum(x) ? x : x && typeof x === "object" && isNum(x.vrijednost) ? x.vrijednost : null);
const zapisOd = (x) => (x && typeof x === "object" && isText(x.zapis) ? x.zapis.trim() : null);
const istiBroj = (zapis, v) => {
  const n = parseNumber(String(zapis));
  return isNum(n) && Math.abs(n - v) <= 1e-9 * Math.max(1, Math.abs(v));
};
const r3 = (v) => Number(Number(v).toPrecision(3));
// masa: tri značajne znamenke, od 100 naviše cijeli broj
export function zapisMase(v) {
  if (!isNum(v)) return "—";
  if (Math.abs(v) >= 100) return formatNumber(Math.round(v));
  return formatNumber(r3(v));
}
export const zapisT = (t) => (isNum(t) ? formatNumber(Math.round(t * 10) / 10) : "—");
// topljivost u jedinicama osi: w kao udio s barem dvije decimale („0,50“, „0,375“), u % jedna decimala, g na 100 g vode
export function zapisVrijednosti(K, v, postotak = false) {
  if (!isNum(v)) return "—";
  if (K.iskaz === "w") {
    if (postotak) return formatNumber(Math.round(v * 1000) / 10);
    const t = (Math.round(v * 1000) / 1000).toFixed(3).replace(/0$/, "");
    return t.replace(".", ",");
  }
  return formatNumber(Math.round(v * 10) / 10);
}
export const jedinicaVrijednosti = (K, postotak) => (K.iskaz === "w" ? (postotak ? "%" : "") : "g");
export const sJedinicom = (z, u) => (u ? `${z} ${u}` : z);

// ── krivulja ──
// {tvar, naziv, iskaz, tocke, os, izvor} ili {greska}
export function krivuljaOf(s) {
  const k = s?.krivulja;
  let K = null;
  if (k == null) K = ugradjena(s?.tvar);
  else if (typeof k === "string") K = ugradjena(k);
  else if (typeof k === "object") K = { iskaz: k.iskaz ?? "w", tocke: k.tocke, izvor: k.izvor ?? null, os: null };
  if (!K) return { greska: true };
  const tvar = s?.tvar ? formulaZapis(s.tvar) : K.tvar;
  return { ...K, tvar, naziv: isText(s?.naziv) ? s.naziv : (K.naziv ?? ugradjena(tvar)?.naziv ?? ""), os: osOf(s, K) };
}
const tockeOk = (K) =>
  Array.isArray(K?.tocke) &&
  K.tocke.length >= 1 &&
  K.tocke.every((p) => Array.isArray(p) && p.length === 2 && p.every(isNum)) &&
  K.tocke.every((p, i) => i === 0 || p[0] > K.tocke[i - 1][0]);
export const rasponT = (K) => [K.tocke[0][0], K.tocke[K.tocke.length - 1][0]];
export const jednaTocka = (K) => K.tocke.length === 1;
// topljivost pri t u jedinicama krivulje; null izvan raspona
export function naKrivulji(K, t) {
  if (!isNum(t)) return null;
  const P = K.tocke;
  if (P.length === 1) return Math.abs(t - P[0][0]) < 1e-9 ? P[0][1] : null;
  if (t < P[0][0] - 1e-9 || t > P[P.length - 1][0] + 1e-9) return null;
  for (let i = 1; i < P.length; i++) {
    const [a, b] = [P[i - 1], P[i]];
    if (t <= b[0] + 1e-9) return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
  }
  return P[P.length - 1][1];
}
// sve temperature pri kojima krivulja ima vrijednost v (vodoravni dio: null = beskonačno mnogo)
export function tPri(K, v) {
  const P = K.tocke;
  if (P.length === 1) return Math.abs(P[0][1] - v) <= 1e-9 * Math.max(1, Math.abs(v)) ? [P[0][0]] : [];
  const out = [];
  for (let i = 1; i < P.length; i++) {
    const [a, b] = [P[i - 1], P[i]];
    const lo = Math.min(a[1], b[1]);
    const hi = Math.max(a[1], b[1]);
    if (v < lo - 1e-12 || v > hi + 1e-12) continue;
    if (Math.abs(b[1] - a[1]) < 1e-12) return null;
    const t = a[0] + ((v - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
    if (!out.some((x) => Math.abs(x - t) < 1e-9)) out.push(t);
  }
  return out;
}
// jedna temperatura ili null
export const tJedinstvena = (K, v) => {
  const r = tPri(K, v);
  return Array.isArray(r) && r.length === 1 ? r[0] : null;
};
// iskaz ↔ g soli na 100 g vode ↔ maseni udio u zasićenoj otopini
export const uS = (K, v) => (K.iskaz === "w" ? (100 * v) / (1 - v) : v);
export const uW = (K, v) => (K.iskaz === "w" ? v : v / (100 + v));
export const izSastava = (K, mSol, mVode) => (K.iskaz === "w" ? mSol / (mSol + mVode) : (100 * mSol) / mVode);
// iz vrijednosti na osi u masu soli za m(vode)
export const masaZa = (K, v, mVode) => (uS(K, v) * mVode) / 100;
// nagib: +1 raste (endotermno), −1 pada (egzotermno), 0 nije jednoznačno
export function nagib(K) {
  const P = K.tocke;
  if (P.length < 2) return 0;
  const d = P.slice(1).map((p, i) => p[1] - P[i][1]);
  if (d.every((x) => x > 0)) return 1;
  if (d.every((x) => x < 0)) return -1;
  return 0;
}
export const procesOf = (K) => (nagib(K) > 0 ? "endotermno" : nagib(K) < 0 ? "egzotermno" : null);

// os grafa (u jedinicama krivulje): iz speca, s ugrađene krivulje ili automatski
function lijepKorak(raspon, n = 6) {
  const raw = raspon / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= raw - 1e-12) return k * p;
  return 10 * p;
}
function osOf(s, K) {
  if (s?.os && typeof s.os === "object") return s.os;
  if (K.os && (s?.krivulja == null || typeof s?.krivulja === "string")) return K.os;
  if (!tockeOk(K)) return null;
  const [t0, t1] = [K.tocke[0][0], K.tocke[K.tocke.length - 1][0]];
  const x = [Math.floor(Math.min(0, t0) / 10) * 10, Math.max(10, Math.ceil(t1 / 10) * 10)];
  const vmax = Math.max(...K.tocke.map((p) => p[1]));
  const dy = lijepKorak(vmax * 1.1, 10);
  const y = [0, Math.ceil((vmax * 1.08) / dy - 1e-9) * dy];
  return { x, y, mreza: [x[1] - x[0] > 60 ? 10 : 5, dy] };
}
export const tolVrijednosti = (s, K) => (isNum(s?.tolerancija) ? s.tolerancija : K.os ? K.os.mreza[1] / 4 : 0);
export const tolTemp = (s, K) => (isNum(s?.tolerancija_t) ? s.tolerancija_t : K.os ? K.os.mreza[0] / 4 : 1);

// ── otopina iz speca ──
export function otopinaOf(s) {
  const o = s?.otopina ?? {};
  const z = (k) => zapisOd(o[k]);
  return {
    m_sol: broj(o.m_sol),
    m_vode: broj(o.m_vode),
    m_otopine: broj(o.m_otopine),
    w: broj(o.w),
    S: broj(o.S),
    zasicena: o.zasicena === true,
    zapis: { m_sol: z("m_sol"), m_vode: z("m_vode"), m_otopine: z("m_otopine"), w: z("w"), S: z("S") },
  };
}
// zadana veličina kako je piše tekst zadatka
export const zapisZadanog = (o, k) => o.zapis[k] ?? (k === "w" ? formatNumber(o.w) : zapisMase(o[k]));

// ── koraci računa (istalozi) ──
// ovisi: koraci čije vrijednosti korak treba; citanje: očitava se s grafa
export const KORACI = {
  top1: { ime: "topljivost pri početnoj temperaturi", citanje: true, ovisi: [] },
  m_sol: { ime: "masa otopljene soli", ovisi: ["top1"] },
  m_vode: { ime: "masa vode", ovisi: ["m_sol"] },
  m_max1: { ime: "najveća masa soli koja se otopi pri početnoj temperaturi", ovisi: ["top1", "m_vode"] },
  jos: { ime: "koliko se soli još može otopiti", ovisi: ["m_max1", "m_sol"] },
  sastav: { ime: "sastav otopine", ovisi: ["m_sol", "m_vode"] },
  t_kristali: { ime: "temperatura pri kojoj se pojave prvi kristalići", citanje: true, ovisi: ["sastav"] },
  top2: { ime: "topljivost pri konačnoj temperaturi", citanje: true, ovisi: [] },
  m_max2: { ime: "masa soli koja ostane otopljena", ovisi: ["top2", "m_vode"] },
  m_istalozeno: { ime: "masa istaložene soli", ovisi: ["m_max2", "m_sol"] },
};
// svi koraci o kojima korak ovisi (i posredno)
export function ovisiSve(id, out = new Set()) {
  for (const x of KORACI[id]?.ovisi ?? []) if (!out.has(x)) ovisiSve(x, out.add(x));
  return out;
}
export const REDOSLIJED = ["top1", "top2", "m_sol", "m_vode", "m_max1", "jos", "sastav", "t_kristali", "m_max2", "m_istalozeno"];
export const trazeniOf = (s) => [].concat(s?.trazi ?? []).map((t) => (typeof t === "string" ? t : t?.velicina));

// model zadatka: krivulja, otopina, temperature i točne vrijednosti svih koraka
export function modelOf(s) {
  const K = krivuljaOf(s);
  if (K.greska || !tockeOk(K)) return { greska: true };
  const o = otopinaOf(s);
  const t1 = isNum(s.t1) ? s.t1 : isNum(s.t) ? s.t : null;
  const t2 = isNum(s.t2) ? s.t2 : null;
  const iz = izvorMasa(o);
  return { K, o, t1, t2, iz, k: sveVrijednosti({ K, o, t1, t2, iz }, {}) };
}
// odakle su mase soli i vode: "mase" (m_sol i m_vode ili m_otopine), "zasicena_voda", "zasicena_otopina", "sastav" (w ili S)
function izvorMasa(o) {
  if (o.zasicena) return isNum(o.m_otopine) ? "zasicena_otopina" : "zasicena_voda";
  if (isNum(o.m_sol) && (isNum(o.m_vode) || isNum(o.m_otopine))) return "mase";
  if (isNum(o.w) || isNum(o.S)) return "sastav";
  return null;
}
// vrijednost jednog koraka iz poznatih (k); M: model
function vrijednostKoraka(id, k, M) {
  const { K, o, t1, t2, iz } = M;
  switch (id) {
    case "top1":
      return naKrivulji(K, t1);
    case "top2":
      return naKrivulji(K, t2);
    case "m_sol":
      if (iz === "zasicena_otopina") return uW(K, k.top1) * o.m_otopine;
      if (iz === "zasicena_voda") return masaZa(K, k.top1, o.m_vode);
      return o.m_sol;
    case "m_vode":
      if (iz === "zasicena_otopina" || (iz === "mase" && !isNum(o.m_vode))) return o.m_otopine - k.m_sol;
      return o.m_vode;
    case "m_max1":
      return masaZa(K, k.top1, k.m_vode);
    case "jos":
      return k.m_max1 - k.m_sol;
    case "sastav":
      if (iz === "sastav") return K.iskaz === "w" ? (isNum(o.w) ? o.w : o.S / (100 + o.S)) : isNum(o.S) ? o.S : (100 * o.w) / (1 - o.w);
      return izSastava(K, k.m_sol, k.m_vode);
    case "t_kristali":
      return tJedinstvena(K, k.sastav);
    case "m_max2":
      return masaZa(K, k.top2, k.m_vode);
    case "m_istalozeno":
      return k.m_sol - k.m_max2;
  }
  return null;
}
// svi koraci redom; prihvaceno: vrijednosti koje je učenik već upisao (zamjenjuju točne)
function sveVrijednosti(M, prihvaceno, pomak = {}) {
  const k = {};
  for (const id of REDOSLIJED) {
    if (id in prihvaceno) k[id] = prihvaceno[id];
    else {
      const v = vrijednostKoraka(id, k, M);
      k[id] = isNum(v) && id in pomak ? v + pomak[id] : v;
    }
  }
  return k;
}
// koraci koji imaju smisla za otopinu iz speca
function dopusteniKoraci(M) {
  const { iz, t1, t2 } = M;
  const out = new Set();
  if (isNum(t1)) out.add("top1");
  if (isNum(t2)) ["top2", "m_max2", "m_istalozeno"].forEach((x) => out.add(x));
  if (iz === "zasicena_otopina") ["m_sol", "m_vode"].forEach((x) => out.add(x));
  if (iz === "zasicena_voda") out.add("m_sol");
  if (iz === "mase" && !isNum(M.o.m_vode)) out.add("m_vode");
  if (iz === "mase" && isNum(t1)) ["m_max1", "jos"].forEach((x) => out.add(x));
  if (iz === "mase") ["sastav", "t_kristali"].forEach((x) => out.add(x));
  if (!isNum(t2) || iz === "sastav") ["m_max2", "m_istalozeno"].forEach((x) => out.delete(x));
  if (iz === "zasicena_voda" || iz === "zasicena_otopina") out.delete("m_max1"); // to je baš m(sol)
  return out;
}

export function oznakaKoraka(id, M) {
  const X = M.K.tvar;
  const top = (t) => (M.K.iskaz === "w" ? `w_sat(${zapisT(t)} °C)` : `m(${X} u 100 g H₂O, ${zapisT(t)} °C)`);
  switch (id) {
    case "top1":
      return top(M.t1);
    case "top2":
      return top(M.t2);
    case "m_sol":
      return `m(${X})`;
    case "m_vode":
      return "m(H₂O)";
    case "m_max1":
      return `m_max(${X})`;
    case "jos":
      return "Δm";
    case "sastav":
      return M.K.iskaz === "w" ? `w(${X})` : `m(${X}) na 100 g vode`;
    case "t_kristali":
      return "t";
    case "m_max2":
      return `m(${X}, otopljeno)`;
    case "m_istalozeno":
      return `m(${X}, istaloženo)`;
  }
  return id;
}
export function imeKoraka(id, M) {
  if (id === "top1" || id === "top2") return "očitaj s grafa";
  if (id === "m_max1") return `najviše koliko se otopi u ${zapisMase(M.k.m_vode)} g vode pri ${zapisT(M.t1)} °C`;
  if (id === "m_max2") return `ostane otopljeno pri ${zapisT(M.t2)} °C`;
  if (id === "jos") return `koliko se još može otopiti pri ${zapisT(M.t1)} °C`;
  if (id === "m_sol") return "u zasićenoj otopini";
  if (id === "m_vode") return M.iz === "zasicena_otopina" ? "u zasićenoj otopini" : "otapalo";
  if (id === "sastav") return M.K.iskaz === "w" ? "maseni udio soli u otopini" : "kao na osi grafa";
  if (id === "t_kristali") return "prvi kristalići (otopina postaje zasićena)";
  if (id === "m_istalozeno") return `hlađenjem na ${zapisT(M.t2)} °C`;
  return KORACI[id].ime;
}
// jedinica upisa koraka
export const jedinicaKoraka = (id, M, postotak) => (["top1", "top2", "sastav"].includes(id) ? jedinicaVrijednosti(M.K, postotak) : id === "t_kristali" ? "°C" : "g");
// formula koraka (na strelici samo uz operacije: true ili nakon provjere)
export function formulaKoraka(id, M) {
  const X = M.K.tvar;
  const w = M.K.iskaz === "w";
  const S = "m(u 100 g vode)"; // topljivost s grafa: masa soli u 100 g vode
  switch (id) {
    case "m_sol":
      if (M.iz === "zasicena_otopina") return w ? `m(${X}) = w_sat · m(otopine)` : `m(${X}) = m(otopine) · ${S} : (100 g + ${S})`;
      return w ? `m(${X}) = w_sat · m(H₂O) : (1 − w_sat)` : `m(${X}) = ${S} · m(H₂O) : 100 g`;
    case "m_vode":
      return `m(H₂O) = m(otopine) − m(${X})`;
    case "m_max1":
    case "m_max2":
      return w ? "m = w_sat · m(H₂O) : (1 − w_sat)" : `m = ${S} · m(H₂O) : 100 g`;
    case "jos":
      return `Δm = m_max − m(${X})`;
    case "sastav":
      return w ? `w = m(${X}) : (m(${X}) + m(H₂O))` : `${S} = m(${X}) · 100 g : m(H₂O)`;
    case "m_istalozeno":
      return `m(istaloženo) = m(${X}) − m(otopljeno)`;
  }
  return "";
}

// tipične krive vrijednosti koraka; k: poznato (s učenikovim vrijednostima)
function kriveKoraka(id, k, M, postotak) {
  const { K, o, t1, t2 } = M;
  const w = K.iskaz === "w";
  const out = [];
  const X = K.tvar;
  const mv = k.m_vode;
  const dodaj = (v, poruka) => isNum(v) && out.push({ vrijednost: v, poruka });
  const UDIO_OTOPINE = "Maseni udio odnosi se na cijelu otopinu (sol + voda), a ne samo na vodu.";
  const PO_100 = (m) => `Topljivost je masa soli u 100 g vode, a ovdje je ${zapisMase(m)} g vode: preračunaj na tu masu.`;
  if (id === "top1" || id === "top2") {
    const v = k[id];
    const tDrugi = id === "top1" ? t2 : t1;
    if (isNum(tDrugi)) dodaj(naKrivulji(K, tDrugi), `To je topljivost pri ${zapisT(tDrugi)} °C. Očitaj vrijednost pri ${zapisT(id === "top1" ? t1 : t2)} °C.`);
    if (w && !postotak) dodaj(v * 100, "Upiši maseni udio kao decimalni broj (kako piše na osi), ne u postotcima.");
    if (w && postotak) dodaj(v, "Upiši maseni udio u postotcima, kako piše na osi.");
  }
  if (id === "m_max1" || id === "m_max2") {
    const top = id === "m_max1" ? k.top1 : k.top2;
    if (w) {
      dodaj(top * mv, `${UDIO_OTOPINE} U 100 g zasićene otopine je ${zapisMase(top * 100)} g soli i ${zapisMase(100 - top * 100)} g vode.`);
      dodaj(top * 100, `To je masa soli u 100 g zasićene otopine. Ovdje je zadana masa vode (${zapisMase(mv)} g).`);
    } else {
      if (Math.abs(mv - 100) > 1e-9) dodaj(top, PO_100(mv));
      dodaj(top * mv, "Topljivost je po 100 g vode: nakon množenja masom vode podijeli sa 100.");
      dodaj((top / (100 + top)) * mv, "Masa soli računa se prema masi vode, a ne kao udio otopine.");
    }
    const drugi = id === "m_max1" ? (isNum(t2) ? naKrivulji(K, t2) : null) : naKrivulji(K, t1);
    if (isNum(drugi)) dodaj(masaZa(K, drugi, mv), `To vrijedi pri ${zapisT(id === "m_max1" ? t2 : t1)} °C. Uzmi topljivost pri ${zapisT(id === "m_max1" ? t1 : t2)} °C.`);
    if (isNum(o.m_otopine)) dodaj(masaZa(K, top, o.m_otopine), "Topljivost se odnosi na masu vode, a ne otopine.");
  }
  if (id === "jos") {
    dodaj(k.m_max1, `To je koliko najviše stane u ${zapisMase(mv)} g vode. Koliko se još može otopiti: oduzmi sol koja je već otopljena (${zapisMase(k.m_sol)} g).`);
    if (w) dodaj(k.top1 * mv - k.m_sol, UDIO_OTOPINE);
    else if (Math.abs(mv - 100) > 1e-9) dodaj(k.top1 - k.m_sol, PO_100(mv));
  }
  if (id === "sastav") {
    if (w) {
      dodaj(k.m_sol / mv, `${UDIO_OTOPINE} Masa otopine je m(${X}) + m(H₂O).`);
      if (!postotak) dodaj((100 * k.m_sol) / (k.m_sol + mv), "Upiši maseni udio kao decimalni broj (kako piše na osi), ne u postotcima.");
      else dodaj(k.m_sol / (k.m_sol + mv), "Upiši maseni udio u postotcima, kako piše na osi.");
    } else {
      dodaj(k.m_sol, `To je masa soli u ${zapisMase(mv)} g vode. Os pokazuje masu soli na 100 g vode: preračunaj.`);
      dodaj((100 * k.m_sol) / (k.m_sol + mv), "To je maseni udio u postotcima. Os pokazuje masu soli na 100 g vode.");
    }
  }
  if (id === "t_kristali") {
    if (isNum(t1)) dodaj(t1, `Pri ${zapisT(t1)} °C sve je otopljeno. Prvi kristalići pojave se kad topljivost padne baš na sastav otopine.`);
    if (w) {
      const kriva = tJedinstvena(K, k.m_sol / mv);
      if (isNum(kriva)) dodaj(kriva, `Ta temperatura vrijedi za m(${X}) : m(H₂O). ${UDIO_OTOPINE}`);
    } else if (Math.abs(mv - 100) > 1e-9) {
      const kriva = tJedinstvena(K, k.m_sol);
      if (isNum(kriva)) dodaj(kriva, PO_100(mv));
    }
  }
  if (id === "m_istalozeno") {
    dodaj(k.m_max2, `To je masa koja ostane otopljena pri ${zapisT(t2)} °C. Istaloži se ostatak.`);
    if (isNum(k.m_max1) && Math.abs(k.m_max1 - k.m_sol) > 1e-6 * Math.max(1, k.m_sol))
      dodaj(k.m_max1 - k.m_max2, `Otopina na početku nije bila zasićena: otopljeno je bilo ${zapisMase(k.m_sol)} g, a ne ${zapisMase(k.m_max1)} g.`);
    if (w) {
      dodaj(k.m_sol - k.top2 * mv, UDIO_OTOPINE);
      if (isNum(k.top1)) dodaj((k.top1 - k.top2) * mv, `Razlika masenih udjela nije masa soli. Izračunaj koliko ${X} ostane otopljeno u ${zapisMase(mv)} g vode pri ${zapisT(t2)} °C, pa to oduzmi.`);
      if (isNum(o.m_otopine) && isNum(k.top1)) dodaj((k.top1 - k.top2) * o.m_otopine, "Hlađenjem se izdvaja samo sol, a voda ostaje. Masa otopine se mijenja, pa računaj s masom vode.");
    } else {
      if (Math.abs(mv - 100) > 1e-9 && isNum(k.top1)) dodaj(k.top1 - k.top2, PO_100(mv));
      if (Math.abs(mv - 100) > 1e-9) dodaj(k.m_sol - k.top2, PO_100(mv));
    }
    if (isNum(o.m_otopine)) dodaj(k.m_sol - masaZa(K, k.top2, o.m_otopine), "Računaj s masom vode, a ne otopine: hlađenjem voda ostaje, izdvaja se samo sol.");
  }
  if (id === "m_sol") {
    if (M.iz === "zasicena_otopina") {
      dodaj(masaZa(K, k.top1, o.m_otopine), "Zadana je masa otopine, a ne vode. Soli je u otopini udio w_sat od mase otopine.");
      if (w) dodaj(k.top1 * 100, "To je masa soli u 100 g zasićene otopine. Ovdje je otopine više.");
    } else if (w) {
      dodaj(k.top1 * o.m_vode, UDIO_OTOPINE);
      dodaj(k.top1 * 100, `To je masa soli u 100 g zasićene otopine. Ovdje je zadana masa vode (${zapisMase(o.m_vode)} g).`);
    } else if (Math.abs(o.m_vode - 100) > 1e-9) dodaj(k.top1, PO_100(o.m_vode));
  }
  if (id === "m_vode") dodaj(o.m_otopine, "To je masa cijele otopine. Voda je otopina bez soli.");
  return out;
}

// ── provjere pomoćne ──
// upis udjela: „37,5 %“ uz decimalni udio (i obrnuto) preračuna se
function citajUnos(ulaz, jed) {
  const t = String(ulaz ?? "").trim();
  const n = parseNumber(t.replace(/\s*%$/, ""), jed && jed !== "%" ? jed : "");
  if (!isNum(n)) return null;
  if (jed === "" && /%$/.test(t)) return n / 100;
  return n;
}
const procesPoruka = (K) =>
  nagib(K) > 0
    ? "Krivulja raste: pri višoj temperaturi otopi se više soli. Dovođenje topline pomaže otapanju, pa otapanje toplinu troši."
    : "Krivulja pada: pri višoj temperaturi otopi se manje soli. Dovođenje topline smeta otapanju, pa otapanje toplinu oslobađa.";
// vrsta otopine: usporedba sastava s topljivošću (u g na 100 g vode); do 0,5 % je zasićena
export function vrstaZa(Ssastav, Stop) {
  const d = (Ssastav - Stop) / Stop;
  if (Math.abs(d) <= 0.005) return "zasicena";
  return d < 0 ? "nezasicena" : "prezasicena";
}
const W_SAT = "\\(w_\\mathrm{sat}\\)";
const W_MAX = "\\(m_\\mathrm{max}\\)";
export const uMd = (t) => String(t).replaceAll("w_sat", W_SAT).replaceAll("m_max", W_MAX);
const sMd = (r) => (r?.poruka ? { ...r, poruka: uMd(r.poruka) } : r);
const lista = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);

// ── očitavanje ──
// {t} → topljivost pri t; {vrijednost} → t pri kojoj je topljivost tolika
export const ocitajOf = (s) => [].concat(s?.trazi ?? []).map((x) => (isNum(x) ? { t: x } : x));
function ocitanje(K, x) {
  if (isNum(x?.t)) return { pita: "vrijednost", t: x.t, tocno: naKrivulji(K, x.t) };
  if (isNum(x?.vrijednost)) return { pita: "t", v: x.vrijednost, tocno: tJedinstvena(K, x.vrijednost) };
  return null;
}
export const ocitanjaOf = (s, K = krivuljaOf(s)) => ocitajOf(s).map((x) => ocitanje(K, x));

// ── pokus 4 ──
export function mjerenjaOf(s, K = krivuljaOf(s)) {
  const M = Array.isArray(s?.mjerenja) ? s.mjerenja : POKUS_MJERENJA;
  return M.map((r) => {
    const m_sol = broj(r?.m_sol);
    const m_vode = broj(r?.m_vode);
    const w = isNum(m_sol) && isNum(m_vode) ? m_sol / (m_sol + m_vode) : null;
    let t = broj(r?.t);
    const izKrivulje = !isNum(t);
    if (izKrivulje && isNum(w) && !K.greska && tockeOk(K)) {
      const v = K.iskaz === "w" ? w : (100 * m_sol) / m_vode;
      const tt = tJedinstvena(K, v);
      t = isNum(tt) ? Math.round(tt) : null;
    }
    return { m_sol, m_vode, t, w, izKrivulje, zapis: { m_sol: zapisOd(r?.m_sol) ?? formatNumber(m_sol), m_vode: zapisOd(r?.m_vode) ?? formatNumber(m_vode), t: zapisOd(r?.t) } };
  });
}
const zapisW = (w) => (isNum(w) ? (Math.round(w * 1000) / 1000).toFixed(3).replace(".", ",") : "—");

// ── vrsta ──
export function vrstaModel(s) {
  const M = modelOf(s);
  if (M.greska) return M;
  const Stop = uS(M.K, M.k.top1);
  const Ssas = uS(M.K, M.k.sastav);
  return { ...M, Stop, Ssas, vrsta: vrstaZa(Ssas, Stop) };
}

export const topljivost = {
  tip: "topljivost",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Krivulja topljivosti soli (lekcija 007, pokus 4): graf topljivosti o temperaturi s mrežom, epruveta s otopinom i kristalima. Topljivost je iskazana masenim udjelom soli u zasićenoj otopini w_sat (iskaz "w", kao lekcija i katalog; postotak?: true prikazuje i traži %) ili masom soli u 100 g vode (iskaz "g100", kao ispiti). Između zadanih točaka krivulja je ravna crta; izvan njih je nema.
Polja: tekst, tvar (formula, "KNO₃"), naziv?, krivulja?: ime ugrađene ili {iskaz: "w" | "g100", tocke: [[t (°C), topljivost], …] (t raste; w kao udio 0–1), izvor?} — jedna točka [[90, 0.412]] znači samo podatak pri toj temperaturi, bez grafa. Bez krivulje uzima se ugrađena za tvar: ${Object.values(KRIVULJE)
    .map((k) => `${k.tvar} (${k.izvor})`)
    .join("; ")}. Ne izmišljaj vrijednosti: druge soli samo iz zadatka.
os?: {x: [od, do], y: [od, do] (u jedinicama krivulje), mreza: [korak t, korak topljivosti]}; tolerancija? (očitanje topljivosti, zadano četvrtina koraka mreže), tolerancija_t? (°C, isto), proces?: true (još bira je li otapanje endotermno ili egzotermno, iz nagiba), krivo?: [{korak? (indeks), vrijednost, poruka}], savjet?, nacin:
- "istrazi" (nije zadatak): klizači temperature i mase soli (i povlačenje točke po grafu), epruveta pokazuje otopljeno i kristale na dnu, ploča piše topljivost, koliko stane i vrstu otopine; „bez kristalića“ pokazuje prezasićenu otopinu, „ubaci kristalić“ istaloži višak. otopina?: {m_vode (zadano 100 g), m_sol?}, t? (početna), tvari?: popis ugrađenih krivulja za izbor;
- "ocitaj": trazi: [{t: 20} (upiše topljivost pri 20 °C) ili {vrijednost: 0.375} (upiše t pri kojoj je topljivost tolika)], 1–4 stavke; na grafu nema točaka ni pomoćnih crta dok ne provjeri;
- "vrsta": t i otopina: {m_sol, m_vode | m_otopine} ili {w} ili {S} (g na 100 g vode); bira nezasićena / zasićena / prezasićena (bistra otopina iznad krivulje je prezasićena; do 0,5 % od krivulje zasićena). jos?: true još traži koliko se soli još može otopiti (g; samo nezasićena s masama). Točka otopine vidi se na grafu tek nakon provjere;
- "istalozi": lanac kartica, t1 (početna), t2? (konačna, hlađenje), otopina: {m_sol, m_vode} ili {m_vode | m_otopine, zasicena: true}; trazi redom podskup od ${REDOSLIJED.join(", ")}: top1/top2 (očitaj topljivost pri t1/t2), m_sol i m_vode (iz mase zasićene otopine), m_max1 (koliko najviše stane pri t1), jos (koliko se još otopi), sastav (w ili S otopine), t_kristali (pri kojoj se t pojave prvi kristalići), m_max2 (ostane otopljeno pri t2), m_istalozeno. Bez t2: račun samo pri t1 (npr. „koliko soli za zasićenu otopinu u 200 g vode pri 25 °C“). operacije?: true pokazuje formule na strelicama (inače tek nakon provjere);
- "pokus": tablica pokusa 4 (m(sol), m(H₂O), t prvih kristalića), učenik upiše w_sat za svaki redak; nakon provjere točke se ucrtaju. mjerenja?: [{m_sol, m_vode, t?}] (zadano 4,0 g soli u 2,5; 5,0; 7,5 i 10,0 g vode iz kataloga; t bez zadanog računa se s krivulje).
Brojevi kao u tekstu: svaka masa u otopina/mjerenja smije biti {vrijednost, zapis}. Kod računa sve korake, prihvaća račun iz učenikova prethodnog koraka i daje poruke za: w prema masi vode umjesto otopine, topljivost za 100 g vode nepreračunatu na zadanu masu vode, masu otopine umjesto vode, istaloženo kao razliku najvećih masa iako otopina nije bila zasićena, otopljeno umjesto istaloženog, % umjesto udjela, očitanje pri drugoj temperaturi.`,
  primjer: {
    tip: "topljivost",
    nacin: "istalozi",
    tekst: "U 150 g vode pri 60 °C otopljeno je 90 g kalijeva nitrata. Koliko se KNO₃ istaloži kad se otopina ohladi na 20 °C?",
    tvar: "KNO₃",
    t1: 60,
    t2: 20,
    otopina: { m_sol: 90, m_vode: 150 },
    trazi: ["top2", "m_max2", "m_istalozeno"],
    proces: true,
  },
  primjeri: [
    {
      tip: "topljivost",
      nacin: "istrazi",
      tekst: "Pomiči temperaturu i masu soli (ili povuci točku po grafu) i gledaj epruvetu: kada je otopina nezasićena, a kada se na dnu pojave kristali?",
      tvar: "KNO₃",
      otopina: { m_vode: 150, m_sol: 90 },
      t: 60,
      tvari: ["KNO₃", "NH₄Cl", "Ba(NO₃)₂"],
    },
    {
      tip: "topljivost",
      nacin: "ocitaj",
      tekst: "Očitaj s grafa topljivost kalijeva oksalata pri 20 °C, 40 °C i 60 °C.",
      tvar: "K₂C₂O₄",
      trazi: [{ t: 20 }, { t: 40 }, { t: 60 }],
    },
    {
      tip: "topljivost",
      nacin: "ocitaj",
      tekst: "Pri kojoj je temperaturi maseni udio kalijeva nitrata u zasićenoj otopini 0,375?",
      tvar: "KNO₃",
      trazi: [{ vrijednost: 0.375 }],
    },
    {
      tip: "topljivost",
      nacin: "vrsta",
      tekst: "U 150 g vode pri 60 °C otopi se 90 g KNO₃. Je li ta otopina nezasićena, zasićena ili prezasićena? Koliko bi se KNO₃ u njoj još moglo otopiti pri 60 °C?",
      tvar: "KNO₃",
      t: 60,
      otopina: { m_sol: 90, m_vode: 150 },
      jos: true,
    },
    {
      tip: "topljivost",
      nacin: "vrsta",
      tekst: "Kakva je s obzirom na zasićenost bistra vodena otopina u kojoj je maseni udio kalijeva oksalata 28,6 % pri 20 °C?",
      tvar: "K₂C₂O₄",
      t: 20,
      otopina: { w: { vrijednost: 0.286, zapis: "28,6 %" } },
    },
    {
      tip: "topljivost",
      nacin: "istalozi",
      tekst: "U 144 g vode pri 80 °C otopi se 81 g amonijeva klorida. Otopina se polako hladi. Izračunaj maseni udio NH₄Cl u otopini i očitaj pri kojoj se temperaturi pojave prvi kristalići.",
      tvar: "NH₄Cl",
      t1: 80,
      otopina: { m_sol: 81, m_vode: 144 },
      trazi: ["sastav", "t_kristali"],
    },
    {
      tip: "topljivost",
      nacin: "istalozi",
      tekst: "Kolika se masa olovova(II) nitrata istaloži hlađenjem 300 g otopine zasićene pri 50 °C na 20 °C?",
      tvar: "Pb(NO₃)₂",
      t1: 50,
      t2: 20,
      otopina: { m_otopine: 300, zasicena: true },
      trazi: ["m_sol", "m_vode", "m_max2", "m_istalozeno"],
    },
    {
      tip: "topljivost",
      nacin: "istalozi",
      tekst: "Maseni udio kalijeva bikromata u zasićenoj vodenoj otopini pri 90 °C iznosi 41,2 %. Izračunaj masu kalijeva bikromata koja se otopi u 150 g vode pri 90 °C.",
      tvar: "K₂Cr₂O₇",
      krivulja: { iskaz: "w", tocke: [[90, 0.412]], izvor: "ispit KEM IK-2 D-S055, zadatak 4" },
      postotak: true,
      t1: 90,
      otopina: { m_vode: 150, zasicena: true },
      trazi: ["m_sol"],
    },
    {
      tip: "topljivost",
      nacin: "pokus",
      tekst: "U pokusu 4 u epruveti je 4,0 g kalijeva nitrata, a voda se dodaje po 2,5 mL (ρ = 1 g/mL). Zabilježena je temperatura pri kojoj se pojave prvi kristalići. Izračunaj \\( w_\\mathrm{sat} \\) kalijeva nitrata za svako mjerenje.",
      tvar: "KNO₃",
      mjerenja: [
        { m_sol: { vrijednost: 4, zapis: "4,0" }, m_vode: { vrijednost: 5, zapis: "5,0" } },
        { m_sol: { vrijednost: 4, zapis: "4,0" }, m_vode: { vrijednost: 7.5, zapis: "7,5" } },
        { m_sol: { vrijednost: 4, zapis: "4,0" }, m_vode: { vrijednost: 10, zapis: "10,0" } },
      ],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `topljivost.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "topljivost treba „tekst“");
    for (const k of Object.keys(s)) need(POLJA.includes(k), `topljivost ne poznaje polje „${k}“ (polja: ${POLJA.slice(1).join(", ")})`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.naziv != null) need(isText(s.naziv), "naziv mora biti tekst");
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    for (const b of ["postotak", "proces", "operacije", "jos"]) if (s[b] != null) need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (s.tolerancija != null) need(isNum(s.tolerancija) && s.tolerancija > 0, "tolerancija je pozitivan broj (u jedinicama krivulje)");
    if (s.tolerancija_t != null) need(isNum(s.tolerancija_t) && s.tolerancija_t > 0 && s.tolerancija_t <= 5, "tolerancija_t je broj °C između 0 i 5");

    // tvar
    if (s.tvar != null) {
      if (need(isText(s.tvar), 'tvar mora biti formula (tekst), npr. "KNO₃"')) need(atomiOd(s.tvar), `formula „${s.tvar}“ se ne da pročitati ili ima simbol kojeg nema u periodnom sustavu`);
    } else need(s.krivulja != null && typeof s.krivulja === "string", "topljivost treba tvar (formulu soli)");

    // krivulja
    if (typeof s.krivulja === "string") need(ugradjena(s.krivulja), `nema ugrađene krivulje „${s.krivulja}“ (ugrađene: ${Object.values(KRIVULJE).map((k) => k.tvar).join(", ")}); druge soli zadaj kao krivulja: {iskaz, tocke}`);
    else if (s.krivulja != null) {
      const k = s.krivulja;
      if (need(typeof k === "object" && !Array.isArray(k), "krivulja je ime ugrađene krivulje ili {iskaz, tocke}")) {
        for (const p of Object.keys(k)) need(["iskaz", "tocke", "izvor"].includes(p), `krivulja ne poznaje polje „${p}“ (iskaz, tocke, izvor)`);
        if (k.iskaz != null) need(ISKAZI.includes(k.iskaz), 'krivulja.iskaz je "w" (maseni udio u zasićenoj otopini) ili "g100" (g soli na 100 g vode)');
        if (k.izvor != null) need(isText(k.izvor), "krivulja.izvor je tekst (odakle su podaci)");
      }
    } else if (s.tvar) need(ugradjena(s.tvar), `za ${formulaZapis(s.tvar)} nema ugrađene krivulje (ugrađene: ${Object.values(KRIVULJE).map((k) => k.tvar).join(", ")}): zadaj krivulja: {iskaz, tocke} s podacima iz zadatka`);
    if (list.length) return list;
    const K = krivuljaOf(s);
    if (!need(!K.greska, "krivulja se ne da pročitati")) return list;
    if (!need(tockeOk(K), "krivulja.tocke je popis [t, topljivost] (barem jedna točka), t strogo raste")) return list;
    for (const [t, v] of K.tocke) {
      need(t >= 0 && t <= 100, `temperatura ${formatNumber(t)} °C nije između 0 i 100 °C (tekuća voda)`);
      if (K.iskaz === "w") need(v > 0 && v < 1, `w_sat = ${formatNumber(v)} nije udio između 0 i 1 (37,5 % piši 0.375)`);
      else need(v > 0 && v < 1000, `topljivost ${formatNumber(v)} g na 100 g vode mora biti pozitivna`);
    }
    if (K.tocke.length > 30) need(false, "krivulja ima najviše 30 točaka");
    if (list.length) return list;
    if (s.postotak) need(K.iskaz === "w", "postotak ide samo uz iskaz w (maseni udio)");
    const jedna = jednaTocka(K);
    const [ta, tb] = rasponT(K);
    const rasp = jedna ? `${formatNumber(ta)} °C (krivulja ima samo tu točku)` : `${formatNumber(ta)}–${formatNumber(tb)} °C`;
    const uRasponu = (t) => isNum(t) && t >= ta - 1e-9 && t <= tb + 1e-9;
    if (s.os != null) {
      const o = s.os;
      const par = (x) => Array.isArray(x) && x.length === 2 && x.every(isNum) && x[1] > x[0];
      if (need(o && typeof o === "object" && par(o.x) && par(o.y) && Array.isArray(o.mreza) && o.mreza.length === 2 && o.mreza.every((x) => isNum(x) && x > 0), "os je {x: [od, do], y: [od, do], mreza: [korak t, korak topljivosti]}")) {
        need(o.x[0] <= ta && o.x[1] >= tb, "os.x mora obuhvatiti sve točke krivulje");
        const vs = K.tocke.map((p) => p[1]);
        need(o.y[0] <= Math.min(...vs) && o.y[1] >= Math.max(...vs), "os.y mora obuhvatiti sve točke krivulje");
        need((o.x[1] - o.x[0]) / o.mreza[0] <= 20 && (o.y[1] - o.y[0]) / o.mreza[1] <= 20, "mreža je pregusta (najviše 20 polja po osi)");
      }
    }
    if (s.proces) need(procesOf(K), "proces: krivulja mora cijela rasti ili cijela padati (i imati barem dvije točke)");
    if (s.nacin !== "istrazi" && s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis"))
      s.krivo.forEach((kr, i) => need(isNum(kr?.vrijednost) && isText(kr?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`));

    // otopina
    const o = otopinaOf(s);
    if (s.otopina != null && need(typeof s.otopina === "object" && !Array.isArray(s.otopina), "otopina je {m_sol, m_vode} (g), {m_otopine, zasicena: true}, {w} ili {S}")) {
      for (const p of Object.keys(s.otopina)) need(["m_sol", "m_vode", "m_otopine", "w", "S", "zasicena"].includes(p), `otopina ne poznaje polje „${p}“ (m_sol, m_vode, m_otopine, w, S, zasicena)`);
      for (const p of ["m_sol", "m_vode", "m_otopine", "w", "S"]) {
        if (s.otopina[p] == null) continue;
        if (!need(isNum(o[p]) && o[p] > 0, `otopina.${p} mora biti pozitivan broj ili {vrijednost, zapis}`)) continue;
        const z = o.zapis[p];
        if (z != null) need(istiBroj(z.replace(/\s*%$/, ""), p === "w" && /%$/.test(z) ? o[p] * 100 : o[p]), `otopina.${p}.zapis („${z}“) mora biti isti broj kao vrijednost`);
      }
      if (isNum(o.w)) need(o.w < 1, "otopina.w je udio između 0 i 1 (28,6 % piši 0.286, zapis „28,6 %“)");
      if (s.otopina.zasicena != null) need(s.otopina.zasicena === true, "otopina.zasicena može biti samo true");
      if (isNum(o.m_otopine) && isNum(o.m_sol)) need(o.m_otopine > o.m_sol, "masa otopine mora biti veća od mase soli");
      need(!(isNum(o.m_vode) && isNum(o.m_otopine) && isNum(o.m_sol)), "zadaj masu vode ili masu otopine, ne obje");
      if (o.zasicena) need(!isNum(o.m_sol) && !isNum(o.w) && !isNum(o.S) && (isNum(o.m_vode) !== isNum(o.m_otopine)), "zasićena otopina zadaje se samo masom vode ili masom otopine (sol računa kod iz krivulje)");
      need([isNum(o.w), isNum(o.S), isNum(o.m_sol)].filter(Boolean).length <= 1, "zadaj sastav samo na jedan način: masama, w ili S");
    }
    if (list.length) return list;

    // ── po načinima ──
    const M = modelOf(s);
    if (s.nacin === "istrazi") {
      need(!jedna, "istraživanje treba krivulju s barem dvije točke");
      for (const f of ["trazi", "jos", "proces", "mjerenja", "t1", "t2", "operacije"]) need(!(f in s), `istrazi ne koristi „${f}“`);
      if (s.t != null) need(uRasponu(s.t), `t = ${formatNumber(s.t)} °C je izvan krivulje (${rasp})`);
      if (s.otopina != null) need(!o.zasicena && !isNum(o.w) && !isNum(o.S) && !isNum(o.m_otopine), "u istraživanju otopina je {m_vode, m_sol?}");
      if (s.tvari != null && need(Array.isArray(s.tvari) && s.tvari.length >= 1 && s.tvari.length <= 5, "tvari je popis 1–5 ugrađenih krivulja"))
        s.tvari.forEach((x, i) => need(ugradjena(x), `tvari[${i}] („${x}“) nije ugrađena krivulja (${Object.values(KRIVULJE).map((k) => k.tvar).join(", ")})`));
      return list;
    }
    need(s.tvari == null, "tvari je samo za istrazi");

    if (s.nacin === "ocitaj") {
      need(!jedna, "očitavanje treba graf: krivulju s barem dvije točke");
      for (const f of ["otopina", "jos", "mjerenja", "t", "t1", "t2", "operacije"]) need(!(f in s), `ocitaj ne koristi „${f}“`);
      const tr = ocitajOf(s);
      if (!need(tr.length >= 1 && tr.length <= 4, "trazi je popis 1–4 očitanja [{t: 20}] ili [{vrijednost: 0.375}]")) return list;
      tr.forEach((x, i) => {
        const r = ocitanje(K, x);
        if (!need(r && Object.keys(x).length === 1, `trazi[${i}] je {t} (topljivost pri t) ili {vrijednost} (t pri toj topljivosti)`)) return;
        if (r.pita === "vrijednost") need(isNum(r.tocno), `trazi[${i}]: t = ${formatNumber(x.t)} °C je izvan krivulje (${rasp})`);
        else {
          const sva = tPri(K, x.vrijednost);
          if (sva === null) need(false, `trazi[${i}]: krivulja je vodoravna pri ${formatNumber(x.vrijednost)}, temperatura nije jednoznačna`);
          else if (need(sva.length > 0, `trazi[${i}]: krivulja nigdje nema vrijednost ${formatNumber(x.vrijednost)}`)) need(sva.length === 1, `trazi[${i}]: krivulja ima vrijednost ${formatNumber(x.vrijednost)} pri više temperatura`);
          if (K.iskaz === "w") need(x.vrijednost > 0 && x.vrijednost < 1, `trazi[${i}].vrijednost je udio (0,375), ne postotak`);
        }
      });
      return list;
    }

    if (s.nacin === "pokus") {
      for (const f of ["otopina", "jos", "trazi", "t", "t1", "t2", "operacije"]) need(!(f in s), `pokus ne koristi „${f}“`);
      need(K.iskaz === "w", "pokus 4 iskazuje topljivost masenim udjelom w_sat: krivulja s iskaz w");
      need(!s.postotak, "pokus 4 piše w_sat kao decimalni broj (bez postotak)");
      if (s.mjerenja != null && !need(Array.isArray(s.mjerenja) && s.mjerenja.length >= 2 && s.mjerenja.length <= 6, "mjerenja je popis 2–6 redaka {m_sol, m_vode, t?}")) return list;
      const R = mjerenjaOf(s, K);
      R.forEach((r, i) => {
        if (!need(isNum(r.m_sol) && r.m_sol > 0 && isNum(r.m_vode) && r.m_vode > 0, `mjerenja[${i}] treba m_sol i m_vode (pozitivni brojevi, g)`)) return;
        for (const p of ["m_sol", "m_vode", "t"]) {
          const z = zapisOd(s.mjerenja?.[i]?.[p]);
          if (z != null) need(istiBroj(z, broj(s.mjerenja[i][p])), `mjerenja[${i}].${p}.zapis („${z}“) mora biti isti broj kao vrijednost`);
        }
        if (r.izKrivulje) need(isNum(r.t), `mjerenja[${i}]: otopina s w_sat = ${zapisW(r.w)} nije zasićena ni pri jednoj temperaturi krivulje (${rasp}); zadaj t (izmjereno) ili drugu masu`);
        else need(isNum(r.t) && r.t >= 0 && r.t <= 100, `mjerenja[${i}].t mora biti između 0 i 100 °C`);
      });
      if (!list.length) need(new Set(R.map((r) => zapisW(r.w))).size === R.length, "dva retka mjerenja imaju isti w_sat");
      return list;
    }

    // vrsta i istalozi
    for (const f of ["mjerenja"]) need(!(f in s), `${s.nacin} ne koristi „${f}“`);
    if (!need(s.otopina != null && M.iz, "otopina je {m_sol, m_vode} (g), {m_sol, m_otopine}, {m_vode | m_otopine, zasicena: true}, {w} ili {S}")) return list;
    const t1 = M.t1;
    if (s.nacin === "vrsta") {
      for (const f of ["t1", "t2", "trazi", "operacije"]) need(!(f in s), `vrsta ne koristi „${f}“ (temperatura je t)`);
      if (!need(isNum(s.t), "vrsta treba t (°C)")) return list;
      if (!need(uRasponu(s.t), `t = ${formatNumber(s.t)} °C je izvan krivulje (${rasp})`)) return list;
      need(!o.zasicena, "u načinu vrsta otopina ne smije biti zadana kao zasićena (to je odgovor)");
      if (list.length) return list;
      const V = vrstaModel(s);
      const d = Math.abs(V.Ssas - V.Stop) / V.Stop;
      need(d <= 0.005 || d >= 0.03, `sastav otopine je ${formatNumber(Math.round(d * 1000) / 10)} % od topljivosti: preblizu krivulji da bi bilo jasno je li zasićena (do 0,5 % je zasićena, a razlika neka bude barem 3 %)`);
      if (s.jos) {
        need(M.iz === "mase", "jos treba otopinu zadanu masama soli i vode");
        need(V.vrsta === "nezasicena", "jos (koliko se još može otopiti) ima smisla samo za nezasićenu otopinu");
      }
      return list;
    }

    // istalozi
    need(s.jos == null && s.t == null, "istalozi koristi t1 i t2 (ne t) i korake u trazi (ne jos)");
    if (!need(isNum(t1), "istalozi treba t1 (početna temperatura, °C)")) return list;
    need(uRasponu(t1), `t1 = ${formatNumber(t1)} °C je izvan krivulje (${rasp})`);
    if (M.t2 != null || s.t2 != null) {
      if (need(isNum(M.t2), "t2 mora biti broj (°C)")) {
        need(uRasponu(M.t2), `t2 = ${formatNumber(M.t2)} °C je izvan krivulje (${rasp})`);
        need(M.t2 < t1, "t2 mora biti niža od t1 (otopina se hladi)");
      }
    }
    need(M.iz !== "sastav", "istalozi treba mase: otopina {m_sol, m_vode}, {m_sol, m_otopine} ili {m_vode | m_otopine, zasicena: true}");
    if (list.length) return list;
    const tr = trazeniOf(s);
    if (!need(tr.length >= 1 && tr.length <= 4, `trazi je popis 1–4 koraka (${REDOSLIJED.join(", ")})`)) return list;
    const smije = dopusteniKoraci(M);
    tr.forEach((id, i) => {
      if (!need(KORACI[id], `trazi[${i}] („${id}“) nije korak; koraci: ${REDOSLIJED.join(", ")}`)) return;
      need(smije.has(id), `trazi[${i}] („${id}“) nema smisla za ovu otopinu${isNum(M.t2) ? "" : " (bez t2 nema hlađenja)"}; mogući: ${[...smije].join(", ")}`);
      need(tr.indexOf(id) === i, `korak „${id}“ je u trazi dvaput`);
      const prije = tr.slice(i + 1).find((x) => ovisiSve(id).has(x));
      need(!prije, `trazi ide redom računa: „${id}“ treba „${prije}“, pa „${prije}“ mora doći prije`);
    });
    if (list.length) return list;
    if (jedna) need(!tr.some((x) => KORACI[x].citanje), "krivulja s jednom točkom nema graf: koraci očitavanja (top1, top2, t_kristali) traže krivulju");
    const k = M.k;
    for (const [id, v] of Object.entries(k)) {
      if (!smije.has(id) && !["top1", "m_sol", "m_vode", "sastav"].includes(id)) continue;
      if (id === "t_kristali") {
        if (tr.includes("t_kristali")) {
          const sva = tPri(K, k.sastav);
          need(Array.isArray(sva) && sva.length === 1, `prvi kristalići: krivulja ${Array.isArray(sva) && sva.length > 1 ? "ima sastav otopine pri više temperatura" : "nigdje nema sastav otopine"} (${zapisVrijednosti(K, k.sastav, s.postotak)}); otopina mora postati zasićena unutar ${rasp}`);
          if (isNum(v)) need(v < t1 - 1e-9, "prvi kristalići pojave se pri hlađenju: otopina pri t1 mora biti nezasićena");
        }
        continue;
      }
      if (["m_sol", "m_vode"].includes(id)) need(isNum(v) && v > 0, `${id} ispada ${zapisMase(v)} g: provjeri otopinu`);
    }
    if (list.length) return list;
    if (M.iz === "mase") {
      const vr = vrstaZa(uS(K, k.sastav), uS(K, k.top1));
      need(vr !== "prezasicena", `otopina pri t1 = ${formatNumber(t1)} °C ima više soli nego što stane (${zapisMase(k.m_sol)} g, a stane ${zapisMase(k.m_max1)} g): zadaj manje soli ili višu t1`);
    }
    if (tr.includes("jos")) need(k.jos > 1e-6, "jos: otopina je već zasićena, ne može se otopiti više");
    if (isNum(M.t2) && tr.some((x) => x === "m_istalozeno" || x === "m_max2")) need(k.m_istalozeno > 1e-6 * Math.max(1, k.m_sol), `hlađenjem na ${formatNumber(M.t2)} °C ništa se ne istaloži (otopljeno ostaje ${zapisMase(k.m_sol)} g, a stane ${zapisMase(k.m_max2)} g)`);
    if (s.krivo != null)
      s.krivo.forEach((kr, i) => {
        const j = kr?.korak ?? tr.length - 1;
        if (!need(Number.isInteger(j) && j >= 0 && j < tr.length, `krivo[${i}].korak mora biti indeks koraka iz trazi`)) return;
        if (isNum(kr?.vrijednost)) need(!near(kr.vrijednost, k[tr[j]], Math.abs(k[tr[j]]) * 0.005), `krivo[${i}].vrijednost je točan odgovor`);
      });
    return list;
  },

  // ocitaj, istalozi, pokus: {unosi: [...], proces?} ili popis upisa; vrsta: {vrsta, jos?, proces?}
  check(s, odgovor) {
    const K = krivuljaOf(s);
    if (K.greska) return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    const unosi = Array.isArray(odgovor) ? odgovor : [].concat(odgovor?.unosi ?? []);
    const postotak = !!s.postotak;
    const jedV = jedinicaVrijednosti(K, postotak);
    const prikaz = (v) => (K.iskaz === "w" && postotak ? v * 100 : v); // vrijednost na osi → upis
    const izUpisa = (n) => (K.iskaz === "w" && postotak ? n / 100 : n);
    const tolY = tolVrijednosti(s, K);
    const tolX = tolTemp(s, K);
    const autorKrivo = (i, n) => (s.krivo ?? []).filter((kr) => (kr.korak ?? n - 1) === i);
    const proces = () => {
      if (!s.proces) return null;
      const p = Array.isArray(odgovor) ? null : odgovor?.proces;
      if (!PROCESI.includes(p)) return { tocno: false, prazno: true, poruka: "Odaberi je li otapanje endotermno ili egzotermno." };
      if (p !== procesOf(K)) return { tocno: false, poruka: procesPoruka(K) };
      return null;
    };

    if (s.nacin === "ocitaj") {
      const O = ocitanjaOf(s, K);
      for (let i = 0; i < O.length; i++) {
        const r = O[i];
        const ulaz = String(unosi[i] ?? "");
        const krivo = [...autorKrivo(i, O.length)];
        let res;
        if (r.pita === "vrijednost") {
          const tocno = prikaz(r.tocno);
          const tol = prikaz(tolY);
          if (K.iskaz === "w") krivo.push({ vrijednost: postotak ? r.tocno : r.tocno * 100, poruka: postotak ? "Upiši maseni udio u postotcima, kako piše na osi." : "Upiši maseni udio kao decimalni broj (kako piše na osi), ne u postotcima." });
          krivo.push({ vrijednost: r.t, poruka: "To je temperatura. Upiši topljivost: vrijednost na okomitoj osi." });
          const n = citajUnos(ulaz, jedV);
          res = isNum(n) && near(n, tocno, tol) ? { tocno: true } : checkNumber({ input: isNum(n) ? n : ulaz, answer: tocno, tol, unit: "", krivo: krivo.filter((k) => !near(k.vrijednost, tocno, tol)).map((k) => ({ tolerancija: tol, ...k })), savjet: s.savjet || `Kreni od ${zapisT(r.t)} °C na vodoravnoj osi okomito do krivulje, pa vodoravno do okomite osi.` });
        } else {
          krivo.push({ vrijednost: prikaz(r.v), poruka: "To je topljivost iz pitanja. Upiši temperaturu: vrijednost na vodoravnoj osi." });
          res = checkNumber({ input: ulaz, answer: r.tocno, tol: tolX, unit: "°C", krivo: krivo.filter((k) => !near(k.vrijednost, r.tocno, tolX)).map((k) => ({ tolerancija: tolX, ...k })), savjet: s.savjet || `Kreni od ${zapisVrijednosti(K, r.v, postotak)}${jedV ? ` ${jedV}` : ""} na okomitoj osi vodoravno do krivulje, pa okomito do osi temperature.` });
        }
        if (!res.tocno) {
          const oz = r.pita === "vrijednost" ? `pri ${zapisT(r.t)} °C` : "t";
          return sMd(O.length > 1 || s.proces ? { ...res, praznina: i, poruka: `${oz}: ${res.poruka}` } : { ...res, praznina: 0 });
        }
      }
      const p = proces();
      if (p) return sMd({ ...p, praznina: O.length });
      return { tocno: true };
    }

    if (s.nacin === "pokus") {
      const R = mjerenjaOf(s, K);
      for (let i = 0; i < R.length; i++) {
        const r = R[i];
        const krivo = [
          { vrijednost: r.m_sol / r.m_vode, poruka: "Maseni udio odnosi se na cijelu otopinu: podijeli masu soli zbrojem mase soli i vode." },
          { vrijednost: r.w * 100, poruka: "Upiši w_sat kao decimalni broj, ne u postotcima." },
          { vrijednost: r.m_vode / (r.m_sol + r.m_vode), poruka: "To je maseni udio vode. Traži se udio soli." },
          ...autorKrivo(i, R.length),
        ];
        const tol = 0.005; // dvije značajne znamenke (4,0 g i 5,0 g → 0,44) su točne
        const res = checkNumber({ input: String(unosi[i] ?? ""), answer: r.w, tol, unit: "", krivo: krivo.filter((k) => !near(k.vrijednost, r.w, tol)).map((k) => ({ tolerancija: Math.max(0.003, Math.abs(k.vrijednost) * 0.005), ...k })), savjet: s.savjet || "w_sat = m(sol) : (m(sol) + m(H₂O))." });
        if (!res.tocno) return sMd({ ...res, praznina: i, poruka: `${i + 1}. mjerenje: ${res.poruka}` });
      }
      return { tocno: true };
    }

    if (s.nacin === "vrsta") {
      const V = vrstaModel(s);
      if (V.greska) return { tocno: false, poruka: "Ovaj korak nema provjeru." };
      const izbor = Array.isArray(odgovor) ? null : odgovor?.vrsta;
      if (!VRSTE.includes(izbor)) return { tocno: false, prazno: true, praznina: 0, poruka: "Odaberi vrstu otopine." };
      if (izbor !== V.vrsta) {
        const { K: KK, o, k } = V;
        const usporedi = `Usporedi sastav otopine s topljivošću pri ${zapisT(V.t1)} °C (očitaj je s grafa).`;
        let poruka;
        // tipična greška: w prema masi vode, ili masa soli nepreračunata na 100 g vode
        const krivoW = V.iz === "mase" && KK.iskaz === "w" ? vrstaZa(uS(KK, k.m_sol / k.m_vode), V.Stop) : null;
        const kriviS = V.iz === "mase" && KK.iskaz === "g100" && Math.abs(k.m_vode - 100) > 1e-9 ? vrstaZa(k.m_sol, V.Stop) : null;
        if (krivoW === izbor) poruka = `Maseni udio odnosi se na cijelu otopinu (sol + voda), a ne samo na vodu. ${usporedi}`;
        else if (kriviS === izbor) poruka = `Topljivost je masa soli u 100 g vode, a ovdje je ${zapisMase(k.m_vode)} g vode: preračunaj, pa usporedi.`;
        else if (izbor === "zasicena") poruka = `Zasićena otopina ima baš toliko soli koliko pri toj temperaturi stane: njezina točka je na krivulji. ${usporedi}`;
        else if (izbor === "prezasicena") poruka = `Prezasićena otopina ima više soli nego što pri toj temperaturi stane. ${usporedi}`;
        else poruka = `Nezasićena otopina ima manje soli nego što pri toj temperaturi stane. ${usporedi}`;
        void o;
        return sMd({ tocno: false, praznina: 0, poruka });
      }
      if (s.jos) {
        const ulaz = String((Array.isArray(odgovor) ? null : odgovor?.jos) ?? "");
        const k = V.k;
        const krivo = [...kriveKoraka("jos", k, V, postotak), ...autorKrivo(1, 2)];
        // očitanje topljivosti s grafa nije egzaktno: prihvati raspon za ± desetinu koraka mreže
        const [lo, hi] = rasponKoraka("jos", V, {}, [], s, K);
        const n = parseNumber(ulaz, "g");
        const pct = 0.01;
        const res =
          isNum(n) && n >= lo * (1 - pct) - 1e-9 && n <= hi * (1 + pct) + 1e-9
            ? { tocno: true }
            : checkNumber({ input: ulaz, answer: k.jos, tol: Math.abs(k.jos) * pct, unit: "g", krivo: krivo.filter((x) => !near(x.vrijednost, k.jos, Math.abs(k.jos) * pct)).map((x) => ({ tolerancija: Math.abs(x.vrijednost) * pct, ...x })), savjet: s.savjet || "Izračunaj koliko soli najviše stane u toj vodi pri toj temperaturi, pa oduzmi ono što je već otopljeno." });
        if (!res.tocno) return sMd({ ...res, praznina: 1, poruka: `Δm: ${res.poruka}` });
      }
      const p = proces();
      if (p) return sMd({ ...p, praznina: s.jos ? 2 : 1 });
      return { tocno: true };
    }

    if (s.nacin === "istalozi") {
      const M = modelOf(s);
      if (M.greska) return { tocno: false, poruka: "Ovaj korak nema provjeru." };
      const tr = trazeniOf(s);
      const prihvaceno = {};
      for (let i = 0; i < tr.length; i++) {
        const id = tr[i];
        const jed = jedinicaKoraka(id, M, postotak);
        const ulaz = String(unosi[i] ?? "");
        const k = sveVrijednosti(M, prihvaceno);
        const tocno = id === "top1" || id === "top2" || id === "sastav" ? prikaz(k[id]) : k[id];
        const exact = M.k[id];
        const n0 = citajUnos(ulaz, jed);
        const n = isNum(n0) ? (["top1", "top2", "sastav"].includes(id) ? izUpisa(n0) : n0) : null;
        let ok = false;
        if (isNum(n)) {
          if (KORACI[id].citanje && id !== "t_kristali") ok = near(n, k[id], tolY) || near(n, exact, tolY);
          else if (id === "t_kristali") ok = (isNum(k[id]) && near(n, k[id], tolX)) || near(n, exact, tolX);
          else {
            const [lo, hi] = rasponKoraka(id, M, prihvaceno, tr, s, K);
            const pct = 0.01;
            ok = n >= Math.min(lo, hi) - Math.abs(lo) * pct - 1e-9 && n <= Math.max(lo, hi) + Math.abs(hi) * pct + 1e-9;
          }
        }
        if (ok) {
          prihvaceno[id] = n;
          continue;
        }
        const tol = KORACI[id].citanje ? (id === "t_kristali" ? tolX : prikaz(tolY)) : Math.abs(tocno) * 0.01;
        const krivo = [...kriveKoraka(id, k, M, postotak), ...autorKrivo(i, tr.length)];
        // krive vrijednosti udjela su u jedinicama krivulje; upis uz postotak je u %
        const krivoU = krivo.map((x) => (["top1", "top2", "sastav"].includes(id) && postotak && !/postotcima/.test(x.poruka) ? { ...x, vrijednost: x.vrijednost * 100 } : x));
        const res = checkNumber({
          input: isNum(n0) ? n0 : ulaz,
          answer: tocno,
          tol,
          unit: "",
          krivo: krivoU.filter((x) => isNum(x.vrijednost) && !near(x.vrijednost, tocno, tol)).map((x) => ({ tolerancija: KORACI[id].citanje ? tol : Math.abs(x.vrijednost) * 0.01, ...x })),
          savjet: s.savjet || (KORACI[id].citanje ? (id === "t_kristali" ? "Na krivulji potraži gdje je topljivost jednaka sastavu otopine i spusti se na os temperature." : "Očitaj topljivost s grafa pri toj temperaturi.") : `Provjeri račun za ${oznakaKoraka(id, M)}.`),
        });
        if (res.tocno) {
          prihvaceno[id] = k[id];
          continue;
        }
        const oz = oznakaKoraka(id, M);
        return sMd(tr.length > 1 || s.proces ? { ...res, praznina: i, poruka: `${oz}: ${res.poruka}` } : { ...res, praznina: 0 });
      }
      const p = proces();
      if (p) return sMd({ ...p, praznina: tr.length });
      return { tocno: true };
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  brojcaniOdgovor(s) {
    try {
      const K = krivuljaOf(s);
      if (K.greska) return null;
      const pr = (v) => (K.iskaz === "w" && s.postotak ? v * 100 : v);
      if (s.nacin === "ocitaj") {
        const r = ocitanjaOf(s, K).at(-1);
        return r ? Number(r.pita === "vrijednost" ? pr(r.tocno).toPrecision(3) : r.tocno.toPrecision(3)) : null;
      }
      if (s.nacin === "pokus") return r3(mjerenjaOf(s, K).at(-1).w);
      if (s.nacin === "vrsta") return s.jos ? r3(vrstaModel(s).k.jos) : null;
      if (s.nacin === "istalozi") {
        const M = modelOf(s);
        const id = trazeniOf(s).at(-1);
        const v = M.k[id];
        return isNum(v) ? r3(["top1", "top2", "sastav"].includes(id) ? pr(v) : v) : null;
      }
    } catch {
      return null;
    }
    return null;
  },

  tocanOdgovor(s) {
    if (s.nacin === "istrazi") return "";
    const K = krivuljaOf(s);
    if (K.greska || !tockeOk(K)) return "";
    const postotak = !!s.postotak;
    const jedV = jedinicaVrijednosti(K, postotak);
    const top = K.iskaz === "w" ? "w_sat" : "topljivost";
    const dodatak = [];
    if (s.proces && procesOf(K)) dodatak.push(`otapanje je ${procesOf(K)} (krivulja ${nagib(K) > 0 ? "raste" : "pada"})`);
    if (s.nacin === "ocitaj") {
      const dio = ocitanjaOf(s, K).map((r) =>
        r.pita === "vrijednost" ? (K.iskaz === "w" ? `${top}(${zapisT(r.t)} °C) = ${sJedinicom(zapisVrijednosti(K, r.tocno, postotak), jedV)}` : `pri ${zapisT(r.t)} °C ${sJedinicom(zapisVrijednosti(K, r.tocno), "g")} u 100 g vode`) : `t = ${zapisT(r.tocno)} °C`,
      );
      return uMd(lista([...dio, ...dodatak]));
    }
    if (s.nacin === "pokus")
      return uMd(
        mjerenjaOf(s, K)
          .map((r, i) => `${i + 1}. w_sat = ${zapisW(r.w)}`)
          .join("; "),
      );
    if (s.nacin === "vrsta") {
      const V = vrstaModel(s);
      if (V.greska) return "";
      const dio = [`otopina je ${VRSTA_IME[V.vrsta]}`];
      if (s.jos) dio.push(`može se otopiti još ${zapisMase(V.k.jos)} g`);
      return uMd(lista([...dio, ...dodatak]));
    }
    if (s.nacin === "istalozi") {
      const M = modelOf(s);
      if (M.greska) return "";
      const dio = trazeniOf(s).map((id) => {
        const v = M.k[id];
        const z = ["top1", "top2", "sastav"].includes(id) ? zapisVrijednosti(K, v, postotak) : id === "t_kristali" ? zapisT(v) : zapisMase(v);
        return `${oznakaKoraka(id, M)} = ${sJedinicom(z, jedinicaKoraka(id, M, postotak))}`;
      });
      return uMd([dio.join(" → "), ...dodatak].join("; "));
    }
    return "";
  },
};

// raspon prihvaćenih vrijednosti računskog koraka: očitanja koja učenik nije upisao smiju biti ± desetina koraka mreže
function rasponKoraka(id, M, prihvaceno, trazeni, s, K) {
  const d = jednaTocka(K) ? 0 : (K.os?.mreza?.[1] ?? 0) / 10;
  const slobodna = ["top1", "top2"].filter((x) => !(x in prihvaceno) && !trazeni.includes(x));
  const pomaci = [{}];
  for (const x of slobodna) {
    const n = pomaci.length;
    for (let i = 0; i < n; i++) {
      pomaci.push({ ...pomaci[i], [x]: -d });
      pomaci.push({ ...pomaci[i], [x]: d });
    }
  }
  const vs = pomaci.map((p) => sveVrijednosti(M, prihvaceno, p)[id]).filter(isNum);
  return [Math.min(...vs), Math.max(...vs)];
}
