// kalorimetar: jednostavni kalorimetar od stiropora (pokus 16 ispitnog kataloga, lekcija 027). U vodu se doda uzorak
// soli, termometar bilježi temperaturu svakih pola minute, a termogram (ϑ–t) pokazuje početnu i konačnu temperaturu.
// Kod iz speca računa sve: termogram, ΔT, toplinski kapacitet kalorimetra C = m(H₂O) · c(H₂O) (računa se kao da
// toplinu prima ili daje samo voda), izmijenjenu toplinu Q = C · ΔT, množinu n = m : M (Ar s lista), reakcijsku entalpiju
// otapanja Δ_solH = −Q : n (doseg je jednak množini otopljene tvari), entalpiju kristalizacije (−Δ_solH), relativnu
// pogrešku prema literaturnoj vrijednosti, te obrnuti račun (iz Δ_solH koliko se promijeni temperatura). Uz svaki korak
// i tipične krive vrijednosti s porukama (predznak, masa otopine ili soli umjesto vode, kg umjesto g, J i kJ,
// temperatura umjesto promjene, °C i K, zaboravljena množina).
//
// c(H₂O) = 4,19 J K⁻¹ g⁻¹ piše u pokusu 16 ispitnog kataloga (nije na listu „Kemija – tablice“). Literaturne
// entalpije otapanja (LITERATURA) samo su za istraživanje i relativnu pogrešku; lekcija računa s brojevima iz zadatka.
import { isNum, parseNumber, formatNumber, near } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { atomiOd, molarnaMasa } from "./_tablice.js";
import { formulaZapis, kriveM, zapisM } from "./mol_racun.js";

export const NACINI = ["istrazi", "ocitaj", "izracunaj"];
export const C_VODE = 4.19; // J K⁻¹ g⁻¹, ispitni katalog 2025./2026., pokus 16
export const C_VODE_ZAPIS = "4,19 J K⁻¹ g⁻¹";

// Entalpije otapanja pri beskonačnom razrjeđenju, 25 °C, kJ/mol (CRC Handbook of Chemistry and Physics, „Enthalpy of
// solution of electrolytes“), zaokruženo na 0,1. Pokus u školi daje nešto drugačije brojeve (otopina nije beskonačno
// razrijeđena, kalorimetar gubi toplinu), zato lekcije zadaju svoje, a ove služe za usporedbu.
export const LITERATURA = {
  NH4NO3: { naziv: "amonijev nitrat", dsolH: 25.7 },
  NH4Cl: { naziv: "amonijev klorid", dsolH: 14.8 },
  KNO3: { naziv: "kalijev nitrat", dsolH: 34.9 },
  KCl: { naziv: "kalijev klorid", dsolH: 17.2 },
  KBr: { naziv: "kalijev bromid", dsolH: 19.9 },
  KI: { naziv: "kalijev jodid", dsolH: 20.3 },
  NaCl: { naziv: "natrijev klorid", dsolH: 3.9 },
  NaOH: { naziv: "natrijev hidroksid", dsolH: -44.5 },
  CaCl2: { naziv: "kalcijev klorid", dsolH: -81.3 },
  LiCl: { naziv: "litijev klorid", dsolH: -37.0 },
};
export const ISTRAZI_ZADANO = ["NH4NO3", "NH4Cl", "KNO3", "NaOH", "CaCl2"];

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const ascii = (f) =>
  [...String(f ?? "")]
    .map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : c))
    .join("")
    .replace(/\((?:s|aq)\)/g, "")
    .trim();
export const literaturaZa = (f) => LITERATURA[ascii(f)] ?? null;

// ── koraci računa ──
// osnovne jedinice: C u J/K, Q u J, n u mol, ΔH u kJ/mol, ΔT u K, ϑ u °C, pogreška u %
export const KORACI = {
  C: { ime: "toplinski kapacitet kalorimetra", jedinice: { "J/K": 1, "kJ/K": 1000 }, prikaz: { "J/K": "J K⁻¹", "kJ/K": "kJ K⁻¹" }, formula: "C = m(H₂O) · c(H₂O)" },
  Q: { ime: "izmijenjena toplina", jedinice: { J: 1, kJ: 1000 }, prikaz: { J: "J", kJ: "kJ" }, predznak: true },
  n: { ime: "množina otopljene tvari", jedinice: { mol: 1, mmol: 0.001 }, prikaz: { mol: "mol", mmol: "mmol" }, formula: "n = m : M" },
  dH: { ime: "reakcijska entalpija otapanja", jedinice: { "kJ/mol": 1, "J/mol": 0.001 }, prikaz: { "kJ/mol": "kJ mol⁻¹", "J/mol": "J mol⁻¹" }, predznak: true, formula: "ΔsolH = −Q : n" },
  dH_kr: { ime: "reakcijska entalpija kristalizacije", jedinice: { "kJ/mol": 1, "J/mol": 0.001 }, prikaz: { "kJ/mol": "kJ mol⁻¹", "J/mol": "J mol⁻¹" }, predznak: true, formula: "ΔH(kristalizacije) = −ΔsolH" },
  pogreska: { ime: "relativna pogreška", jedinice: { "%": 1 }, prikaz: { "%": "%" }, formula: "P = |ΔsolH − ΔsolH(lit.)| : |ΔsolH(lit.)| · 100 %" },
  dT: { ime: "promjena temperature", jedinice: { K: 1, "°C": 1 }, prikaz: { K: "K", "°C": "°C" }, predznak: true, formula: "ΔT = Q : C" },
  T_konacna: { ime: "konačna temperatura", jedinice: { "°C": 1 }, prikaz: { "°C": "°C" }, formula: "ϑ₂ = ϑ₁ + ΔT" },
};
export const NAPRIJED = ["C", "Q", "n", "dH", "dH_kr", "pogreska"];
export const NATRAG = ["C", "Q", "dT", "T_konacna"];
// o čemu korak ovisi (samo koraci; zadani podaci su uvijek poznati)
const OVISI = { C: [], Q: ["C"], n: [], dH: ["Q", "n"], dH_kr: ["dH"], pogreska: ["dH"], dT: ["Q", "C"], T_konacna: ["dT"] };
const OVISI_NATRAG = { ...OVISI, Q: [] };
export const OCITAJ = ["T_pocetna", "T_konacna", "dT"];
export const PROCESI = ["endotermno", "egzotermno"];

const POLJA = ["tip", "nacin", "tekst", "tvar", "naziv", "voda", "uzorak", "T_pocetna", "T_konacna", "dsolH", "c", "t_dodatak", "t_kraj", "trazi", "proces", "poznato", "literatura", "operacije", "termogram", "tolerancija_posto", "tolerancija_T", "krivo", "savjet", "tvari"];

// ── brojevi i zapisi ──
const broj = (x) => (isNum(x) ? x : x && typeof x === "object" && isNum(x.vrijednost) ? x.vrijednost : null);
const zapisOd = (x) => (x && typeof x === "object" && isText(x.zapis) ? x.zapis.trim().replace(/-/g, "−") : null);
const istiBroj = (zapis, v) => {
  const n = parseNumber(String(zapis ?? "").replace(/−/g, "-"));
  return isNum(n) && Math.abs(n - v) <= 1e-9 * Math.max(1, Math.abs(v));
};
const r1 = (x) => Math.round(x * 10) / 10;
// temperatura s jednom decimalom („21,0“), osim ako je zadana s više
export const zapisT = (t) => (Math.abs(t * 10 - Math.round(t * 10)) < 1e-9 ? t.toFixed(1).replace("-", "−").replace(".", ",") : formatNumber(t));
export const sPredznakom = (v, z) => {
  const t = z ?? formatNumber(v);
  return v > 0 && !/^[+]/.test(t) ? `+${t}` : t;
};
// prikaz iznosa koraka: C na desetinku (209,5), Q na cijeli J kad je ≥ 100 J, ΔH na tri značajne znamenke
export function zapisKoraka(id, v, jed) {
  if (!isNum(v)) return "—";
  let t;
  if (id === "C") t = formatNumber(Math.abs(v) >= 100 ? r1(v) : Number(v.toPrecision(4)));
  else if (id === "Q") t = formatNumber(Math.abs(v) >= 100 ? Math.round(v) : Number(v.toPrecision(3)));
  else if (id === "T_konacna") t = zapisT(r1(v));
  else if (id === "dT") t = Math.abs(v) >= 0.1 ? zapisT(r1(v)) : formatNumber(Number(v.toPrecision(2)));
  else if (id === "n") t = formatNumber(Number(v.toPrecision(3)));
  else if (id === "pogreska") t = formatNumber(Number(v.toPrecision(2)));
  else t = formatNumber(Number(v.toPrecision(3)));
  const s = KORACI[id]?.predznak ? sPredznakom(v, t) : t;
  return jed ? `${s} ${KORACI[id]?.prikaz?.[jed] ?? jed}` : s;
}

// ── spec → model ──
export const traziOf = (s) =>
  [].concat(s?.trazi ?? []).map((t) => {
    const id = typeof t === "string" ? t : t?.velicina;
    const k = KORACI[id];
    const jed = typeof t === "object" && t?.jedinica ? t.jedinica : k ? Object.keys(k.jedinice)[0] : null;
    return { id, jedinica: jed };
  });
export const natragOf = (s) => s?.nacin === "izracunaj" && traziOf(s).some((t) => t.id === "dT" || t.id === "T_konacna");

// Termogram kao na milimetarskom papiru: točka svakih pola minute, vodoravno do dodatka, pola minute nakon dodatka
// 80 % promjene, minutu nakon dodatka konačna temperatura, pa opet vodoravno.
export function temperaturaU(m, t) {
  if (t <= m.td) return m.T0;
  if (t >= m.td + 1) return m.T1;
  const pola = m.T0 + 0.8 * (m.T1 - m.T0);
  return t <= m.td + 0.5 ? m.T0 + ((t - m.td) / 0.5) * (pola - m.T0) : pola + ((t - m.td - 0.5) / 0.5) * (m.T1 - pola);
}
export function mjerenja(m, doT = m.tk) {
  const out = [];
  for (let t = 0; t <= Math.min(doT, m.tk) + 1e-9; t += 0.5) out.push([Math.round(t * 10) / 10, temperaturaU(m, t)]);
  return out;
}
// raspon osi ϑ i korak mreže (glavni s brojem, sporedni bez)
export function osT(T0, T1) {
  const lo = Math.floor(Math.min(T0, T1) - 0.5);
  const hi = Math.ceil(Math.max(T0, T1) + 0.5);
  const raspon = hi - lo;
  const glavni = raspon <= 8 ? 1 : raspon <= 16 ? 2 : 5;
  const na = (k) => [T0, T1].every((t) => Math.abs(t / k - Math.round(t / k)) < 1e-6);
  const sporedni = glavni > 1 ? glavni / 2 : na(0.5) ? 0.5 : raspon <= 4 ? 0.1 : 0.2;
  return { lo, hi, glavni, sporedni };
}

// Model pokusa za jednu tvar: {M, mV, c, n, mu, T0, T1, dT, dsolH (kJ/mol), C, Q, td, tk} ili {greska}.
// `promjene` (istraživanje): {tvar, dsolH, n, mV} umjesto zadanih.
export function modelOf(s, promjene = {}) {
  const tvar = promjene.tvar ?? s.tvar;
  const M = tvar ? molarnaMasa(tvar) : null;
  const mV = promjene.mV ?? s.voda?.m;
  const c = isNum(s.c) ? s.c : C_VODE;
  let n = promjene.n ?? s.uzorak?.n;
  let mu = promjene.n != null ? (M ? promjene.n * M : null) : s.uzorak?.m;
  if (!isNum(n) && isNum(mu) && M) n = mu / M;
  if (!isNum(mu) && isNum(n) && M) mu = n * M;
  const T0 = broj(s.T_pocetna) ?? 21;
  const td = isNum(s.t_dodatak) ? s.t_dodatak : 3;
  const tk = isNum(s.t_kraj) ? s.t_kraj : 8;
  if (!isNum(mV) || mV <= 0 || !isNum(n) || n <= 0) return { greska: "nedostaju masa vode i uzorak" };
  const C = mV * c;
  const natrag = natragOf(s);
  let dsolH = promjene.dsolH ?? broj(s.dsolH);
  let T1;
  let dT;
  if (promjene.dsolH == null && broj(s.T_konacna) != null && !natrag) {
    T1 = broj(s.T_konacna);
    dT = T1 - T0;
    if (dsolH == null) dsolH = (-C * dT) / n / 1000;
  } else {
    if (dsolH == null) dsolH = literaturaZa(tvar)?.dsolH ?? null;
    if (!isNum(dsolH)) return { greska: "nedostaje T_konacna ili dsolH" };
    dT = (-n * dsolH * 1000) / C;
    // termogram i očitanje: konačna temperatura na desetinku (kao na milimetarskom papiru); obrnuti račun točno
    T1 = natrag || promjene.dsolH != null ? T0 + dT : r1(T0 + dT);
    if (!natrag && promjene.dsolH == null) dT = T1 - T0;
  }
  const Q = C * dT;
  return { tvar, M, mV, c, n, mu, T0, T1, dT, dsolH, C, Q, td, tk, natrag, dHexp: natrag ? dsolH : (-Q / n) / 1000 };
}

// literaturna vrijednost za relativnu pogrešku
const litOf = (s) => broj(s.literatura) ?? literaturaZa(s.tvar)?.dsolH ?? null;

// točna vrijednost koraka iz poznatih k (osnovne jedinice)
function vrijednost(id, k, natrag) {
  switch (id) {
    case "C":
      return k.mV * k.c;
    case "Q":
      return natrag ? -k.n * k.dsolH * 1000 : k.C * k.dT;
    case "n":
      return k.mu / k.M;
    case "dH":
      return -k.Q / k.n / 1000;
    case "dH_kr":
      return -k.dH;
    case "pogreska":
      return (Math.abs(k.dH - k.lit) / Math.abs(k.lit)) * 100;
    case "dT":
      return k.Q / k.C;
    case "T_konacna":
      return k.T0 + k.dT;
  }
  return NaN;
}
// sve poznate i izračunate veličine (točne)
export function poznatoOf(s, m = modelOf(s)) {
  const k = { mV: m.mV, c: m.c, n: m.n, mu: m.mu, M: m.M, T0: m.T0, T1: m.T1, dT: m.dT, dsolH: m.dsolH, lit: litOf(s) };
  const red = m.natrag ? NATRAG : NAPRIJED;
  for (const id of red) {
    if (id === "n") continue; // n je zadan ili izračunat u modelu
    if (id === "dT" && !m.natrag) continue;
    if (id === "pogreska" && !isNum(k.lit)) continue;
    k[id] = vrijednost(id, k, m.natrag);
  }
  if (!m.natrag) k.dH = vrijednost("dH", k, false);
  return k;
}
export function lanacOf(s, m = modelOf(s)) {
  const k = poznatoOf(s, m);
  return traziOf(s).map((t) => {
    const K = KORACI[t.id];
    const f = K.jedinice[t.jedinica];
    return { ...t, ime: K.ime, formula: formulaKoraka(t.id, m.natrag), osnovna: k[t.id], vrijednost: k[t.id] / f, f };
  });
}
export const formulaKoraka = (id, natrag) => (id === "Q" ? (natrag ? "Q = −n · ΔsolH" : "Q = C · ΔT") : KORACI[id].formula);

// ── tipične greške koraka ──
function greske(id, k, m, s) {
  const out = [];
  const add = (v, poruka) => isNum(v) && Number.isFinite(v) && out.push({ v, poruka });
  const pala = m.dT < 0;
  const F = formulaZapis(m.tvar ?? "");
  if (id === "C") {
    if (isNum(k.mu)) add((k.mV + k.mu) * k.c, `Uzeta je masa otopine (voda + ${F}). U kalorimetru od stiropora računa se kao da toplinu prima ili daje samo voda: C = m(H₂O) · c(H₂O).`);
    if (isNum(k.mu)) add(k.mu * k.c, `Uzeta je masa ${F}. Toplinski kapacitet kalorimetra daje voda: C = m(H₂O) · c(H₂O).`);
    add((k.mV / 1000) * k.c, "Masa vode uvrštena je u kilogramima, a c(H₂O) je po gramu (J K⁻¹ g⁻¹): uvrsti grame.");
    add(k.mV / k.c, "Masa vode je podijeljena s c. Toplinski kapacitet je umnožak: masa vode puta specifični toplinski kapacitet.");
    if (!m.natrag) add(k.mV * k.c * k.dT, "To je već izmijenjena toplina Q (pomnoženo s ΔT). Toplinski kapacitet je samo masa vode puta c.");
  }
  if (id === "Q" && !m.natrag) {
    add(-k.C * k.dT, pala ? "Pazi na predznak: temperatura je pala, ΔT = ϑ₂ − ϑ₁ je negativan, pa je i Q negativan (voda je toplinu predala)." : "Pazi na predznak: temperatura je porasla, ΔT = ϑ₂ − ϑ₁ je pozitivan, pa je i Q pozitivan (voda je toplinu primila).");
    add(k.C * k.T1, "Uvrštena je konačna temperatura. U Q = C · ΔT ide promjena temperature ΔT = ϑ₂ − ϑ₁.");
    add(k.C * k.T0, "Uvrštena je početna temperatura. U Q = C · ΔT ide promjena temperature ΔT = ϑ₂ − ϑ₁.");
    add(k.C * (k.T1 + 273), "Uvrštena je temperatura u kelvinima. U Q = C · ΔT ide samo promjena temperature, a ona je ista u °C i u K.");
    add(k.C / k.dT, "C je podijeljen s ΔT. Izmijenjena toplina je umnožak: Q = C · ΔT.");
    add(k.mV * k.dT, "Masa vode pomnožena je s ΔT bez c. Uvrsti toplinski kapacitet C = m · c.");
    add(k.c * k.dT, "Uvršten je specifični toplinski kapacitet vode, a treba toplinski kapacitet cijelog kalorimetra C = m(H₂O) · c(H₂O).");
  }
  if (id === "Q" && m.natrag) {
    add(k.n * k.dsolH * 1000, k.dsolH > 0 ? "Pazi na predznak: otapanje uzima toplinu iz vode (ΔsolH > 0), pa je Q za vodu negativan: Q = −n · ΔsolH." : "Pazi na predznak: otapanje predaje toplinu vodi (ΔsolH < 0), pa je Q za vodu pozitivan: Q = −n · ΔsolH.");
    add((-k.dsolH * 1000) / k.n, "ΔsolH je podijeljen s množinom. ΔsolH vrijedi za 1 mol, pa za n mola toplinu treba pomnožiti s n.");
    add(-k.dsolH * 1000, `To je toplina za 1 mol. Ovdje se otapa ${isNum(s.uzorak?.n) && s.uzorak?.zapis ? s.uzorak.zapis : formatNumber(Number(k.n.toPrecision(3)))} mol, pa je pomnoži s n.`);
  }
  if (id === "n") {
    add(k.mu * k.M, `Masa je pomnožena s M. Množina je n = m : M, masu treba podijeliti molarnom masom (M(${F}) = ${zapisM(k.M)}).`);
    add(k.M / k.mu, "Omjer je obrnut: n = m : M (masa kroz molarnu masu).");
    for (const a of kriveM(m.tvar)) add(k.mu / a.M, `Za M je uzeto ${zapisM(a.M)}: ${a.poruka}`);
  }
  if (id === "dH") {
    const endo = k.Q < 0;
    add(k.Q / k.n / 1000, `Nedostaje minus: ΔsolH = −Q : n. Q je toplina vode, a ΔsolH toplina sustava (soli koja se otapa), pa imaju suprotne predznake. Bez minusa ispada da je otapanje ${endo ? "egzotermno, a voda se ohladila" : "endotermno, a voda se zagrijala"}.`);
    add(-k.Q / 1000, `To je toplina za ${isNum(s.uzorak?.n) && s.uzorak?.zapis ? s.uzorak.zapis : formatNumber(Number(k.n.toPrecision(3)))} mol. ΔsolH se odnosi na 1 mol: podijeli s množinom n.`);
    add((-k.Q * k.n) / 1000, "Q je pomnožen s množinom. Toplina po molu je Q podijeljen s n: ΔsolH = −Q : n.");
    if (isNum(k.mu)) add(-k.Q / k.mu / 1000, `Q je podijeljen s masom ${F}. ΔsolH je po molu, pa se dijeli s množinom n.`);
    add(-k.Q / k.n, "Toplina je u J, pa ΔsolH izlazi u J mol⁻¹. Pretvori u kJ mol⁻¹ (1 kJ = 1000 J).");
  }
  if (id === "dH_kr") add(k.dH, "Kristalizacija je otapanje unatrag: obratom procesa mijenja se predznak, ΔH(kristalizacije) = −ΔsolH.");
  if (id === "pogreska") {
    add((Math.abs(k.dH - k.lit) / Math.abs(k.dH)) * 100, "Razlika se dijeli literaturnom vrijednošću, a ne izmjerenom.");
    add(Math.abs(k.dH - k.lit), "To je razlika u kJ mol⁻¹. Relativna pogreška je ta razlika podijeljena literaturnom vrijednošću, puta 100 %.");
    add((Math.abs(k.dH - k.lit) / Math.abs(k.lit)), "Još pomnoži sa 100 %, da dobiješ postotak.");
    add((k.dH / k.lit) * 100, "To je omjer izmjerene i literaturne vrijednosti. Pogreška je razlika podijeljena literaturnom vrijednošću, puta 100 %.");
  }
  if (id === "dT") {
    add(-k.Q / k.C, pala || k.Q < 0 ? "Pazi na predznak: voda predaje toplinu (Q < 0), pa se ohladi i ΔT je negativan." : "Pazi na predznak: voda prima toplinu (Q > 0), pa se zagrije i ΔT je pozitivan.");
    add(k.C / k.Q, "Omjer je obrnut: iz Q = C · ΔT slijedi ΔT = Q : C.");
    add(k.Q / k.mV, "Q je podijeljen samo s masom vode. Podijeli ga s toplinskim kapacitetom C = m · c.");
    add(k.Q / 1000 / k.C, "Q je uvršten u kJ, a C je u J K⁻¹: uvrsti Q u džulima.");
    add(k.Q * k.C, "Q je pomnožen s C. Iz Q = C · ΔT slijedi ΔT = Q : C.");
  }
  if (id === "T_konacna") {
    add(k.T0 - k.dT, "ΔT = ϑ₂ − ϑ₁, pa je ϑ₂ = ϑ₁ + ΔT (ΔT pribroji s predznakom).");
    add(k.dT, "To je promjena temperature. Konačna temperatura je početna plus promjena: ϑ₂ = ϑ₁ + ΔT.");
    add(k.T0 + k.dT + 273, "Konačnu temperaturu upiši u °C, kao i početnu.");
  }
  return out;
}

const OZNAKA_K = { C: "C", Q: "Q", n: "n", dH: "ΔsolH", dH_kr: "ΔH(kristalizacije)", pogreska: "P", dT: "ΔT", T_konacna: "ϑ₂" };
export const oznakaKoraka = (id) => OZNAKA_K[id] ?? id;

function kriveKoraka(s, i, kor, k, m, prihvaceno) {
  const out = greske(kor.id, k, m, s).map((g) => ({ vrijednost: g.v / kor.f, poruka: g.poruka }));
  for (const kr of s.krivo ?? []) if ((kr.korak ?? traziOf(s).length - 1) === i) out.push({ vrijednost: kr.vrijednost, poruka: kr.poruka });
  // isti iznos u drugoj jedinici
  const K = KORACI[kor.id];
  for (const [u, f] of Object.entries(K.jedinice))
    if (f !== kor.f) out.push({ vrijednost: k[kor.id] / f, poruka: `To je ${K.ime} u ${K.prikaz[u]}, a traži se u ${K.prikaz[kor.jedinica]}.` });
  // prepisan broj iz koraka o kojem ovisi
  for (const d of (m.natrag ? OVISI_NATRAG : OVISI)[kor.id])
    if (isNum(k[d])) out.push({ vrijednost: k[d] / (KORACI[d].jedinice[Object.keys(KORACI[d].jedinice)[0]] ?? 1), poruka: `To je ${KORACI[d].ime} (${oznakaKoraka(d)}), a ovdje se traži ${K.ime} (${oznakaKoraka(kor.id)}).` });
  return out.filter((g) => isNum(g.vrijednost) && prihvaceno.every((t) => !near(g.vrijednost, t, Math.max(Math.abs(t) * 0.005, 1e-9))));
}

// unos: „Q = −314 J“ → „−314“
export function cistiUnos(v) {
  let t = String(v ?? "").trim();
  if (t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1).trim();
  return t.replace(/\s*[A-Za-z°%][A-Za-z°%/\s⁻¹·]*$/, "").trim();
}

// ── očitavanje ──
export const tolT = (s, m) => (isNum(s.tolerancija_T) ? s.tolerancija_T : Math.max(0.05, osT(m.T0, m.T1).sporedni / 4));
export const procesOf = (m) => (m.T1 < m.T0 ? "endotermno" : "egzotermno");
const OCITAJ_IME = { T_pocetna: "početna temperatura ϑ₁", T_konacna: "konačna temperatura ϑ₂", dT: "promjena temperature ΔT" };
export const OCITAJ_OZNAKA = { T_pocetna: "ϑ₁", T_konacna: "ϑ₂", dT: "ΔT" };
export const OCITAJ_JED = { T_pocetna: "°C", T_konacna: "°C", dT: "K" };
export const ocitajOf = (s) => [].concat(s?.trazi ?? ["T_pocetna", "T_konacna", "dT"]);

function checkOcitaj(s, odgovor) {
  const m = modelOf(s);
  const tr = ocitajOf(s);
  const unosi = Array.isArray(odgovor) ? odgovor : [].concat(odgovor?.unosi ?? []);
  const tol = tolT(s, m);
  const uc = {}; // učenikova (prihvaćena) očitanja
  for (let i = 0; i < tr.length; i++) {
    const id = tr[i];
    const ulaz = cistiUnos(unosi[i]);
    let tocno;
    let t;
    const krivo = [];
    if (id === "T_pocetna") {
      tocno = m.T0;
      t = tol;
      krivo.push({ vrijednost: m.T1, poruka: "To je temperatura nakon otapanja. Početna je ona prije dodatka uzorka: vodoravni dio crte lijevo." });
      krivo.push({ vrijednost: m.T0 + 273, poruka: "Upiši temperaturu u °C, kako piše na osi termograma." });
    } else if (id === "T_konacna") {
      tocno = m.T1;
      t = tol;
      krivo.push({ vrijednost: m.T0, poruka: "To je početna temperatura. Konačna je ona kad se crta nakon dodatka uzorka opet umiri (vodoravni dio desno)." });
      krivo.push({ vrijednost: temperaturaU(m, m.td + 0.5), poruka: "To je temperatura dok se uzorak još otapa. Konačna je ona kad se crta opet umiri.", tolerancija: tol });
      krivo.push({ vrijednost: m.T1 + 273, poruka: "Upiši temperaturu u °C, kako piše na osi termograma." });
    } else {
      const T0u = uc.T_pocetna ?? m.T0;
      const T1u = uc.T_konacna ?? m.T1;
      tocno = T1u - T0u;
      t = Math.max(1e-6, (uc.T_pocetna != null && uc.T_konacna != null ? 0.02 : 2 * tol));
      krivo.push({ vrijednost: T0u - T1u, poruka: m.T1 < m.T0 ? "Promjena je konačna minus početna: ΔT = ϑ₂ − ϑ₁. Temperatura je pala, pa je ΔT negativan." : "Promjena je konačna minus početna: ΔT = ϑ₂ − ϑ₁. Temperatura je porasla, pa je ΔT pozitivan." });
      krivo.push({ vrijednost: T1u + 273 - T0u, poruka: "273 je dodan samo jednoj temperaturi. Razlika od 1 °C jednaka je razlici od 1 K, pa je ΔT isti broj u °C i u K." });
      krivo.push({ vrijednost: T1u, poruka: "To je konačna temperatura. Promjena je ΔT = ϑ₂ − ϑ₁." });
    }
    for (const kr of s.krivo ?? []) if ((kr.korak ?? tr.length - 1) === i) krivo.push(kr);
    const r = checkNumber({ input: ulaz, answer: tocno, tol: t, unit: "", krivo: krivo.filter((k) => !near(k.vrijednost, tocno, t)).map((k) => ({ tolerancija: Math.min(t, tol), ...k })), savjet: s.savjet || (id === "dT" ? "ΔT = ϑ₂ − ϑ₁ (konačna minus početna)." : `Očitaj ${OCITAJ_IME[id]} s osi termograma.`) });
    if (!r.tocno) return tr.length > 1 || s.proces ? { ...r, praznina: i, poruka: `${OCITAJ_OZNAKA[id]}: ${r.poruka}` } : { ...r, praznina: 0 };
    uc[id] = parseNumber(ulaz);
  }
  if (s.proces) {
    const p = Array.isArray(odgovor) ? null : odgovor?.proces;
    if (!PROCESI.includes(p)) return { tocno: false, prazno: true, praznina: tr.length, poruka: "Odaberi je li otapanje endotermno ili egzotermno." };
    if (p !== procesOf(m))
      return {
        tocno: false,
        praznina: tr.length,
        poruka:
          m.T1 < m.T0
            ? "Voda se ohladila: predala je toplinu soli koja se otapa. Sustav (otapanje) toplinu prima iz okoline, a to je endotermna promjena, ΔH > 0."
            : "Voda se zagrijala: otapanje joj je predalo toplinu. Sustav toplinu predaje okolini, a to je egzotermna promjena, ΔH < 0.",
      };
  }
  return { tocno: true };
}

// u porukama i točnom odgovoru (Md s KaTeX-om) Δ_solH s pravim indeksom
const DS = "\\(\\Delta_\\mathrm{sol}H\\)";
const uMd = (t) => String(t).replaceAll("ΔsolH", DS);
const sMd = (r) => (r?.poruka ? { ...r, poruka: uMd(r.poruka) } : r);

const lista = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);

export const kalorimetar = {
  tip: "kalorimetar",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Jednostavni kalorimetar od stiropora (pokus 16, lekcija 027): čaša s vodom, poklopac i termometar, uzorak soli u epruveti; ispod termogram ϑ–t (točka svakih pola minute). c(H₂O) = ${C_VODE_ZAPIS} (ispitni katalog); računa se kao da toplinu prima ili daje samo voda.
Polja: tekst, tvar (formula soli, "NH₄Cl"; M iz Ar s lista), naziv?, voda: {m (g), zapis?}, uzorak: {n (mol) ili m (g), zapis?},
T_pocetna (°C, zadano 21), T_konacna? (°C, kako je na termogramu) i/ili dsolH? (Δ_solH u kJ/mol, broj ili {vrijednost, zapis}; uz oba moraju se slagati na 2 %),
c? (zadano 4,19), t_dodatak? (min, zadano 3), t_kraj? (min, zadano 8), tolerancija_posto? (zadano 1), krivo?: [{korak? (indeks), vrijednost, poruka}], savjet?, nacin:
- "istrazi" (nije zadatak): bira sol (tvari?: popis formula iz ugrađenih literaturnih vrijednosti ${Object.keys(LITERATURA).join(", ")} ili {tvar, dsolH, naziv?}; zadano tvar ili ${ISTRAZI_ZADANO.join(", ")}), klizačima množinu uzorka i masu vode, pokrene pokus i gleda termometar, termogram i račun C → Q → Δ_solH uživo;
- "ocitaj": s termograma upisuje trazi? (podskup od ${OCITAJ.join(", ")}, zadano sva tri) i, uz proces: true, bira endotermno / egzotermno. Vrijednosti nisu napisane na grafu (mreža da); T na desetinku; tolerancija_T? (°C, zadano četvrtina sporednog podjeljka);
- "izracunaj": lanac kartica, trazi redom: naprijed iz termograma podskup od ${NAPRIJED.join(", ")} (n samo kad je uzorak zadan masom; pogreska uz literatura? ili ugrađenu vrijednost) ili natrag iz dsolH (bez T_konacna) podskup od ${NATRAG.join(", ")} („za koliko bi pala temperatura“). Stavka je "Q" ili {velicina: "Q", jedinica: "kJ"} (C: J/K | kJ/K, Q: J | kJ, n: mol | mmol, ΔH: kJ/mol | J/mol). poznato?: koraci koji nisu u trazi, a pokažu se kao zadani (npr. ["C"]). termogram? (zadano true naprijed: ϑ₁ i ϑ₂ su napisani na grafu). operacije? (formule na strelicama; zadano samo u istrazi).
Kod računa termogram, sve korake, prihvaća i račun iz učenikova prethodnog koraka, i daje poruke za: predznak Q i Δ_solH, masu otopine ili soli umjesto vode, kg umjesto g, temperaturu umjesto promjene, °C/K (ΔT je isti), J/kJ, zaboravljenu množinu (toplina za n mola umjesto za 1 mol), m · M, obrnut omjer.`,
  primjer: {
    tip: "kalorimetar",
    nacin: "izracunaj",
    tekst: "U kalorimetar od stiropora s 50,0 g vode doda se 0,0200 mol amonijeva klorida. Temperatura padne s 21,0 °C na 19,5 °C. Izračunaj toplinski kapacitet kalorimetra, izmijenjenu toplinu i reakcijsku entalpiju otapanja.",
    tvar: "NH₄Cl",
    naziv: "amonijev klorid",
    voda: { m: 50, zapis: "50,0" },
    uzorak: { n: 0.02, zapis: "0,0200" },
    T_pocetna: 21.0,
    T_konacna: 19.5,
    trazi: ["C", "Q", "dH"],
  },
  primjeri: [
    {
      tip: "kalorimetar",
      nacin: "istrazi",
      tekst: "Odaberi sol, množinu uzorka i masu vode, pa pokreni pokus. Gledaj termometar i termogram.",
      voda: { m: 50, zapis: "50,0" },
      uzorak: { n: 0.02, zapis: "0,0200" },
      tvari: ["NH4NO3", "NH4Cl", "KNO3", "NaOH", "CaCl2"],
    },
    {
      tip: "kalorimetar",
      nacin: "ocitaj",
      tekst: "U kalorimetar od stiropora s 50,0 g vode doda se 0,0200 mol amonijeva klorida, a temperatura se bilježi svakih pola minute. Očitaj s termograma početnu i konačnu temperaturu i promjenu temperature. Je li otapanje endotermno ili egzotermno?",
      tvar: "NH₄Cl",
      voda: { m: 50, zapis: "50,0" },
      uzorak: { n: 0.02, zapis: "0,0200" },
      T_pocetna: 21.0,
      T_konacna: 19.5,
      proces: true,
    },
    {
      tip: "kalorimetar",
      nacin: "izracunaj",
      tekst: "U kalorimetar od stiropora sa 60,0 g vode doda se 1,11 g bezvodnog kalcijeva klorida. Temperatura poraste s 19,0 °C na 22,0 °C. Izračunaj toplinski kapacitet kalorimetra, izmijenjenu toplinu, množinu CaCl₂ i reakcijsku entalpiju otapanja.",
      tvar: "CaCl₂",
      voda: { m: 60, zapis: "60,0" },
      uzorak: { m: 1.11, zapis: "1,11" },
      T_pocetna: 19.0,
      T_konacna: 22.0,
      trazi: ["C", "Q", "n", "dH"],
    },
    {
      tip: "kalorimetar",
      nacin: "izracunaj",
      tekst: "Reakcijska entalpija otapanja amonijeva klorida je +15,7 kJ mol⁻¹, a toplinski kapacitet kalorimetra s 50,0 g vode 209,5 J K⁻¹. Za koliko bi pala temperatura (početna 21,0 °C) da se u istih 50,0 g vode otopi 0,0400 mol NH₄Cl?",
      tvar: "NH₄Cl",
      voda: { m: 50, zapis: "50,0" },
      uzorak: { n: 0.04, zapis: "0,0400" },
      T_pocetna: 21.0,
      dsolH: { vrijednost: 15.7, zapis: "+15,7" },
      poznato: ["C"],
      trazi: ["Q", "dT", "T_konacna"],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `kalorimetar.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "kalorimetar treba „tekst“");
    for (const k of Object.keys(s)) need(POLJA.includes(k), `kalorimetar ne poznaje polje „${k}“ (polja: ${POLJA.slice(1).join(", ")})`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    for (const b of ["operacije", "termogram", "proces"]) if (s[b] != null) need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (s.naziv != null) need(isText(s.naziv), "naziv mora biti tekst");
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    if (s.tolerancija_posto != null) need(isNum(s.tolerancija_posto) && s.tolerancija_posto > 0 && s.tolerancija_posto <= 5, "tolerancija_posto je broj između 0 i 5");
    if (s.tolerancija_T != null) need(isNum(s.tolerancija_T) && s.tolerancija_T > 0 && s.tolerancija_T <= 0.5, "tolerancija_T je broj između 0 i 0,5 (°C)");
    if (s.c != null) need(isNum(s.c) && s.c > 0 && s.c < 10, "c je specifični toplinski kapacitet u J K⁻¹ g⁻¹ (za vodu 4,19)");
    if (s.t_dodatak != null) need(isNum(s.t_dodatak) && s.t_dodatak >= 1 && s.t_dodatak <= 6 && Math.abs(s.t_dodatak * 2 - Math.round(s.t_dodatak * 2)) < 1e-9, "t_dodatak je minuta dodatka uzorka, od 1 do 6, na pola minute");
    const td = isNum(s.t_dodatak) ? s.t_dodatak : 3;
    if (s.t_kraj != null) need(isNum(s.t_kraj) && s.t_kraj >= td + 2 && s.t_kraj <= 15 && Math.abs(s.t_kraj * 2 - Math.round(s.t_kraj * 2)) < 1e-9, "t_kraj (min) mora biti barem 2 minute iza dodatka i najviše 15, na pola minute");

    // tvar
    const provjeriTvar = (f, gdje) => {
      if (!need(isText(f), `${gdje} mora biti formula (tekst), npr. "NH₄Cl"`)) return null;
      if (!need(atomiOd(f), `${gdje}: formula „${f}“ se ne da pročitati ili ima simbol kojeg nema u periodnom sustavu`)) return null;
      const Mf = molarnaMasa(f);
      need(Mf, `${gdje}: „${f}“ ima element bez stalne Ar na listu`);
      return Mf;
    };
    if (s.tvar != null) provjeriTvar(s.tvar, "tvar");
    else need(s.nacin === "istrazi", "kalorimetar treba tvar (formulu soli)");

    // voda i uzorak
    const v = s.voda;
    if ((s.nacin !== "istrazi" || v != null) && need(v && typeof v === "object" && isNum(v.m) && v.m > 0, "voda mora biti {m (g), zapis?} s pozitivnom masom")) {
      need(v.m >= 10 && v.m <= 500, "masa vode u kalorimetru od stiropora je između 10 i 500 g (čaša od 200 mL, oko 50 mL vode)");
      if (v.zapis != null) need(isText(v.zapis) && istiBroj(v.zapis, v.m), `voda.zapis („${v.zapis}“) mora biti isti broj kao voda.m (${v.m})`);
    }
    const u = s.uzorak;
    if ((s.nacin !== "istrazi" || u != null) && need(u && typeof u === "object", "uzorak mora biti {n (mol)} ili {m (g)}, uz zapis?")) {
      need(isNum(u.n) !== isNum(u.m), "uzorak ima ili n (mol) ili m (g), ne oboje");
      if (isNum(u.n)) need(u.n > 0 && u.n <= 1, "uzorak.n je množina u mol (pozitivna, najviše 1)");
      if (isNum(u.m)) {
        need(u.m > 0 && u.m <= 100, "uzorak.m je masa u g (pozitivna, najviše 100)");
        need(s.tvar != null || s.nacin !== "istrazi", "uzorak zadan masom treba tvar");
      }
      const zb = isNum(u.n) ? u.n : u.m;
      if (u.zapis != null && isNum(zb)) need(isText(u.zapis) && istiBroj(u.zapis, zb), `uzorak.zapis („${u.zapis}“) mora biti isti broj kao ${isNum(u.n) ? "uzorak.n" : "uzorak.m"} (${zb})`);
    }

    // temperature i entalpija
    for (const f of ["T_pocetna", "T_konacna"])
      if (s[f] != null) {
        const t = broj(s[f]);
        need(isNum(t) && t > -10 && t < 80, `${f} je temperatura u °C (broj između −10 i 80)`);
        if (zapisOd(s[f]) != null && isNum(t)) need(istiBroj(zapisOd(s[f]), t), `${f}.zapis mora biti isti broj kao vrijednost`);
      }
    if (s.dsolH != null) {
      const d = broj(s.dsolH);
      need(isNum(d) && d !== 0 && Math.abs(d) < 200, "dsolH je Δ_solH u kJ/mol (broj različit od 0, ili {vrijednost, zapis})");
      if (zapisOd(s.dsolH) != null && isNum(d)) need(istiBroj(zapisOd(s.dsolH), d), "dsolH.zapis mora biti isti broj kao dsolH.vrijednost");
    }
    if (s.literatura != null) {
      const d = broj(s.literatura);
      need(isNum(d) && d !== 0, "literatura je literaturna Δ_solH u kJ/mol (broj ili {vrijednost, zapis})");
    }
    if (list.length) return list;

    // istraživanje: popis soli
    if (s.nacin === "istrazi") {
      need(s.trazi == null && s.poznato == null && s.proces == null, "istrazi ne koristi trazi, poznato ni proces");
      const tv = s.tvari ?? (s.tvar ? [s.tvar] : ISTRAZI_ZADANO);
      if (need(Array.isArray(tv) && tv.length >= 1 && tv.length <= 6, "tvari je popis od 1 do 6 soli")) {
        tv.forEach((x, i) => {
          const f = typeof x === "string" ? x : x?.tvar;
          if (!provjeriTvar(f, `tvari[${i}]`)) return;
          const d = typeof x === "object" ? broj(x.dsolH) : null;
          if (typeof x === "object" && x.dsolH != null) need(isNum(d) && d !== 0, `tvari[${i}].dsolH mora biti broj u kJ/mol`);
          else if (!(s.tvar && ascii(f) === ascii(s.tvar) && (s.dsolH != null || s.T_konacna != null)))
            need(literaturaZa(f), `tvari[${i}]: za „${f}“ nema ugrađene literaturne vrijednosti (${Object.keys(LITERATURA).join(", ")}); zadaj {tvar, dsolH}`);
        });
      }
      need(s.tvar == null || s.tvari == null || s.tvari.some((x) => ascii(typeof x === "string" ? x : x?.tvar) === ascii(s.tvar)), "tvar mora biti među tvari (to je početni izbor)");
      if (s.T_konacna != null || s.dsolH != null) need(s.tvar != null, "T_konacna i dsolH u istraživanju vrijede za tvar, pa zadaj i tvar");
      return list;
    }

    const natrag = natragOf(s);
    const T0 = broj(s.T_pocetna);
    need(isNum(T0), "T_pocetna (°C) je obavezna");
    if (natrag) {
      need(s.nacin === "izracunaj", "obrnuti račun (dT, T_konacna) je samo u načinu izracunaj");
      need(s.dsolH != null, "obrnuti račun (iz Δ_solH koliko se promijeni temperatura) treba dsolH");
      need(s.T_konacna == null, "u obrnutom računu T_konacna je odgovor, pa se ne zadaje");
    } else {
      need(s.T_konacna != null || s.dsolH != null, "zadaj T_konacna (s termograma) ili dsolH");
      if (s.T_konacna != null && s.dsolH != null && isNum(T0)) {
        const m0 = modelOf({ ...s, dsolH: undefined });
        const d = broj(s.dsolH);
        need(Math.abs(m0.dHexp - d) <= 0.02 * Math.abs(d), `T_konacna i dsolH se ne slažu: iz termograma Δ_solH = ${formatNumber(Number(m0.dHexp.toPrecision(3)))} kJ/mol, a zadano je ${formatNumber(d)} kJ/mol`);
      }
    }
    if (list.length) return list;
    const m = modelOf(s);
    if (!need(!m.greska, `kalorimetar: ${m.greska}`)) return list;
    need(Math.abs(m.dT) >= 0.2, `promjena temperature je samo ${formatNumber(Number(m.dT.toPrecision(2)))} K: na termogramu se ne bi vidjela (barem 0,2 K)`);
    need(m.T1 > 0 && m.T1 < 90, `konačna temperatura ${formatNumber(r1(m.T1))} °C nije moguća u kalorimetru s vodom`);

    if (s.nacin === "ocitaj") {
      need(s.poznato == null && s.operacije == null && s.termogram == null, "ocitaj ne koristi poznato, operacije ni termogram (termogram se uvijek vidi, bez napisanih vrijednosti)");
      const tr = ocitajOf(s);
      if (need(tr.length >= 1 && tr.every((x) => OCITAJ.includes(x)), `ocitaj: trazi je podskup od ${OCITAJ.join(", ")}`)) {
        need(new Set(tr).size === tr.length, "ocitaj: svaka veličina u trazi samo jednom");
        need(tr.join() === OCITAJ.filter((x) => tr.includes(x)).join(), `ocitaj: trazi redom ${OCITAJ.join(", ")}`);
      }
      for (const [f, t] of [["T_pocetna", m.T0], ["T_konacna", m.T1]]) need(Math.abs(t * 10 - Math.round(t * 10)) < 1e-6, `${f} = ${formatNumber(t)} °C: za očitavanje s termograma temperatura je na desetinku (zadaj T_konacna)`);
      if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis"))
        s.krivo.forEach((kr, i) => {
          const j = kr?.korak ?? tr.length - 1;
          need(Number.isInteger(j) && j >= 0 && j < tr.length, `krivo[${i}].korak mora biti indeks iz trazi`);
          need(isNum(kr?.vrijednost) && isText(kr?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
        });
      return list;
    }

    // izracunaj
    need(s.proces == null, "proces je samo za ocitaj (u računu predznak Δ_solH već kaže je li otapanje endotermno)");
    const tr = traziOf(s);
    if (!need(tr.length >= 1 && tr.length <= 4, "trazi je popis 1–4 koraka")) return list;
    const red = natrag ? NATRAG : NAPRIJED;
    tr.forEach((t, i) => {
      if (!need(red.includes(t.id), `trazi[${i}] („${t.id}“) ${natrag ? `u obrnutom računu mora biti jedan od: ${NATRAG.join(", ")}` : `mora biti jedan od: ${NAPRIJED.join(", ")} (ili obrnuti račun ${NATRAG.join(", ")})`}`)) return;
      need(KORACI[t.id].jedinice[t.jedinica] != null, `trazi[${i}].jedinica za ${t.id} mora biti jedna od: ${Object.keys(KORACI[t.id].jedinice).join(", ")}`);
    });
    if (list.length) return list;
    need(new Set(tr.map((t) => t.id)).size === tr.length, "svaki korak je u trazi samo jednom");
    const ovisi = natrag ? OVISI_NATRAG : OVISI;
    tr.forEach((t, i) => {
      for (const d of ovisi[t.id]) {
        const j = tr.findIndex((x) => x.id === d);
        if (j > i) need(false, `trazi: ${t.id} ovisi o ${d}, pa ${d} ide prije`);
      }
    });
    if (tr.some((t) => t.id === "n")) need(isNum(s.uzorak?.m), "korak n (množina) ide samo kad je uzorak zadan masom (uzorak.m)");
    if (tr.some((t) => t.id === "pogreska")) need(isNum(litOf(s)), `pogreska treba literaturnu vrijednost: literatura (kJ/mol) ili tvar iz ugrađenog popisa (${Object.keys(LITERATURA).join(", ")})`);
    if (s.poznato != null && need(Array.isArray(s.poznato), "poznato je popis koraka, npr. [\"C\"]"))
      s.poznato.forEach((p, i) => {
        need(red.includes(p), `poznato[${i}] („${p}“) mora biti korak iz: ${red.join(", ")}`);
        need(!tr.some((t) => t.id === p), `poznato[${i}] („${p}“) je u trazi: odgovor se ne pokazuje kao zadan`);
        need(p !== "n" || isNum(s.uzorak?.m), "poznato n ima smisla samo kad je uzorak zadan masom");
      });
    if (natrag) need(s.termogram !== true, "u obrnutom računu termogram bi pokazao odgovor (konačnu temperaturu)");
    if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis")) {
      const kor = lanacOf(s, m);
      s.krivo.forEach((kr, i) => {
        const j = kr?.korak ?? kor.length - 1;
        if (!need(Number.isInteger(j) && j >= 0 && j < kor.length, `krivo[${i}].korak mora biti indeks koraka iz trazi`)) return;
        if (need(isNum(kr?.vrijednost) && isText(kr?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`))
          need(!near(kr.vrijednost, kor[j].vrijednost, Math.abs(kor[j].vrijednost) * 0.005), `krivo[${i}].vrijednost je točan odgovor`);
      });
    }
    return list;
  },

  // ocitaj: {unosi: [...], proces?} ili popis upisa; izracunaj: popis upisa (po jedan za svaki korak iz trazi)
  check(s, odgovor) {
    if (s.nacin === "ocitaj") return sMd(checkOcitaj(s, odgovor));
    if (s.nacin !== "izracunaj") return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    const m = modelOf(s);
    const pct = (s.tolerancija_posto ?? 1) / 100;
    const koraci = lanacOf(s, m);
    const unosi = Array.isArray(odgovor) ? odgovor : [].concat(odgovor?.unosi ?? []);
    const k = poznatoOf(s, m); // točne vrijednosti, pa učenikove (prihvaćene) za korake iz trazi
    for (let i = 0; i < koraci.length; i++) {
      const kor = koraci[i];
      const izUcenika = vrijednost(kor.id, k, m.natrag) / kor.f;
      const prihvaceno = [kor.vrijednost, izUcenika].filter(isNum);
      const tol = (v) => Math.max(Math.abs(v) * pct, kor.id === "T_konacna" ? 0.05 : kor.id === "dT" ? 0.02 : 0);
      const ulaz = cistiUnos(unosi[i]);
      const br = parseNumber(ulaz);
      const krivo = kriveKoraka(s, i, kor, k, m, prihvaceno).map((g) => ({ ...g, tolerancija: tol(g.vrijednost) }));
      let r;
      if (isNum(br) && prihvaceno.some((v) => near(br, v, tol(v)))) r = { tocno: true };
      else r = checkNumber({ input: ulaz, answer: kor.vrijednost, tol: tol(kor.vrijednost), unit: "", krivo, savjet: s.savjet || `Provjeri račun za ${oznakaKoraka(kor.id)} i jedinicu.` });
      if (!r.tocno) return sMd(koraci.length > 1 ? { ...r, praznina: i, poruka: `${oznakaKoraka(kor.id)}: ${r.poruka}` } : { ...r, praznina: 0 });
      k[kor.id] = br * kor.f;
    }
    return { tocno: true };
  },

  brojcaniOdgovor(s) {
    if (s.nacin === "izracunaj") {
      const v = lanacOf(s).at(-1)?.vrijednost;
      return isNum(v) ? Number(v.toPrecision(3)) : null;
    }
    if (s.nacin === "ocitaj") {
      const m = modelOf(s);
      const id = ocitajOf(s).at(-1);
      return id === "T_pocetna" ? m.T0 : id === "T_konacna" ? m.T1 : r1(m.T1 - m.T0);
    }
    return null;
  },

  tocanOdgovor(s) {
    if (s.nacin === "istrazi") return "";
    const m = modelOf(s);
    if (m.greska) return "";
    if (s.nacin === "ocitaj") {
      const dio = ocitajOf(s).map((id) => (id === "T_pocetna" ? `ϑ₁ = ${zapisT(m.T0)} °C` : id === "T_konacna" ? `ϑ₂ = ${zapisT(m.T1)} °C` : `ΔT = ${zapisKoraka("dT", r1(m.T1 - m.T0), "K")}`));
      if (s.proces) dio.push(`otapanje je ${procesOf(m)} (${m.T1 < m.T0 ? "temperatura pada, ΔH > 0" : "temperatura raste, ΔH < 0"})`);
      return lista(dio);
    }
    return uMd(
      lanacOf(s, m)
        .map((x) => `${oznakaKoraka(x.id)} = ${zapisKoraka(x.id, x.vrijednost, x.jedinica)}`)
        .join(" → "),
    );
  },
};
