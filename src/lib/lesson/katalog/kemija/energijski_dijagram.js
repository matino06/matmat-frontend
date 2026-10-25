// energijski_dijagram: entalpijski (energijski) dijagram reakcije, nacrtan skicom „energijski_dijagram“ iz taskSketch.js
// (razine, strelice, energijski profil s prijelaznim stanjem). Autor zadaje reakciju (tekst razina reaktanata i
// produkata, ΔrH, po želji Ea, Ea s katalizatorom, stupnjeve puta ili entalpije stvaranja), a kod iz toga računa sve
// ostalo: razine i strelice dijagrama, Ea povratne reakcije (Ea − ΔrH), sniženje Ea katalizatorom, ΔrH iz stupnjeva
// (Hessov zakon) ili iz ΔfH (Σν·ΔfH(produkti) − Σν·ΔfH(reaktanti)), te koje zadane jednadžbe treba obrnuti i s kojim
// faktorom ih pomnožiti da zbroj da traženu jednadžbu (linearni sustav po tvarima). Formule i izjednačenost atoma i
// naboja provjeravaju se istom logikom kao u widgetu „jednadzba“ (cestica, atomi i naboj iz _tablice.js).
import { isNum, parseNumber, formatNumber } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { cestica } from "./jednadzba.js";
import { renderSketch } from "../../../sketch/taskSketch.js";

export const NACINI = ["istrazi", "hess", "ocitaj", "slozi"];
const ZAJEDNICKA = ["tip", "nacin", "tekst", "os", "jedinica"];
const POLJA_NACINA = {
  istrazi: ["reakcija", "reakcije"],
  hess: ["reakcija", "jednadzbe", "koraci", "zbroj", "krivo"],
  ocitaj: ["reakcija", "zadano", "trazi", "strelice", "krivo"],
  slozi: ["reakcija"],
};
const POLJA = [...new Set([...ZAJEDNICKA, ...Object.values(POLJA_NACINA).flat()])];
const POLJA_REAKCIJE = ["oznaka", "reaktanti", "produkti", "dH", "H0", "Ea", "Ea_kat", "stupnjevi", "dfH"];
export const JEDINICE = ["kJ/mol", "kJ"];
// faktori kojima se smije pomnožiti zadana jednadžba u Hessovu zakonu (gumbi u widgetu)
export const FAKTORI = [0.5, 1, 1.5, 2, 3, 4];
// veličine koje se čitaju s energijskog profila
export const VELICINE = ["Ea", "dH", "Ea_povratne", "Ea_kat", "Ea_kat_povratne", "snizenje"];
export const NAZIV = {
  Ea: "energija aktivacije",
  dH: "reakcijska entalpija",
  Ea_povratne: "energija aktivacije povratne reakcije",
  Ea_kat: "energija aktivacije s katalizatorom",
  Ea_kat_povratne: "energija aktivacije povratne reakcije s katalizatorom",
  snizenje: "sniženje energije aktivacije katalizatorom",
};
// oznake na skici (SVG tekst: Unicode indeksi, kao u lekcijama)
const SKICA_OZ = { Ea: "Eₐ", dH: "ΔᵣH", Ea_povratne: "Eₐ(povr.)", Ea_kat: "Eₐ", Ea_kat_povratne: "Eₐ(povr.)" };
// najviše/najniže mjesto razine kod slaganja (gumbi gore / dolje); vrhovi idu do VRH_MAX
export const MJESTA = 4;
const VRH_MAX = 6;

const lista = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);

// ── brojevi ──
// broj ili {vrijednost, zapis}; zapis je kako ga piše tekst zadatka („−891“, „+44“)
export const brojOd = (x) => (isNum(x) ? { v: x, zapis: null } : x && typeof x === "object" && isNum(x.vrijednost) ? { v: x.vrijednost, zapis: isText(x.zapis) ? x.zapis.trim() : null } : null);
const okrugli = (v) => Math.round(v * 1000) / 1000;
// broj s predznakom kao u termokemiji: „+44“, „−891“, „0“
export const sPredznakom = (v) => (okrugli(v) > 0 ? `+${formatNumber(okrugli(v))}` : formatNumber(okrugli(v)));
export const bezPredznaka = (v) => formatNumber(okrugli(v));
const zapisB = (b, predznak = true) => (b?.zapis ? b.zapis.replace(/-/g, "−") : predznak ? sPredznakom(b.v) : bezPredznaka(b.v));
export const jedinicaOd = (s) => (JEDINICE.includes(s?.jedinica) ? s.jedinica : "kJ/mol");
export const sJedinicom = (t, s) => `${t} ${jedinicaOd(s)}`;
// dopušteno odstupanje upisanog broja (kJ/mol su u zadacima cijeli brojevi)
export const tolE = (v) => Math.max(0.5, Math.abs(v) * 0.001);
const isti = (a, b) => Math.abs(a - b) <= tolE(b);
const zapisZadanog = (z, v) => {
  const n = parseNumber(String(z ?? "").replace(/−/g, "-"));
  return isNum(n) && Math.abs(n - v) <= 1e-9 * Math.max(1, Math.abs(v));
};

// ── tvari: „2 O₂(g)“, „½ O₂(g)“, „NH₄⁺(aq)“ ──
const STANJE_RE = /\((?:s|l|ℓ|g|aq)\)\s*$/;
const KOEF = { "½": 0.5, "¼": 0.25, "¾": 0.75, "³⁄₂": 1.5, "⁵⁄₂": 2.5 };
export const kljucOd = (formula, stanje) => `${formula}(${stanje === "ℓ" ? "l" : stanje})`;
// zapis tvari za prikaz: stanje „l“ kao „ℓ“ (tako pišu lekcije)
export const zapisTvari = (c) => `${c.formula}(${c.stanje === "l" ? "ℓ" : c.stanje})`;

function procitajKoef(t) {
  if (t == null) return 1;
  if (KOEF[t]) return KOEF[t];
  const m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : null;
  return /^\d+$/.test(t) ? Number(t) : null;
}

// Jedan član: {koef, formula, stanje, kljuc, atomi, naboj} ili {greska}.
export function clanOd(t) {
  const x = String(t ?? "").trim();
  const m = x.match(/^(?:(\d+\/\d+|\d+|½|¼|¾|³⁄₂|⁵⁄₂)\s+)?(\S.*?)\((s|l|ℓ|g|aq)\)$/);
  if (!m) return { greska: `„${x}“ nije tvar sa stanjem (npr. „2 H₂O(ℓ)“, „½ O₂(g)“; koeficijent odvoji razmakom)` };
  const koef = procitajKoef(m[1]);
  if (!(koef > 0)) return { greska: `koeficijent u „${x}“ nije pozitivan broj` };
  const c = cestica(m[2]);
  if (c.greska) return { greska: c.greska };
  if (c.elektron) return { greska: "elektron ne ide u termokemijsku jednadžbu" };
  const stanje = m[3] === "ℓ" ? "l" : m[3];
  return { koef, formula: c.formula, stanje, kljuc: kljucOd(c.formula, stanje), atomi: c.atomi, naboj: c.naboj };
}

// Strana reakcije (tekst razine): {formule: [...]} ako su to tvari sa stanjima, {rijeci: true} ako je to opis
// („reaktanti“, „elementarne tvari“), ili {greska}.
export function stranaOd(t) {
  if (!isText(t)) return { greska: "strana reakcije mora biti tekst" };
  const dijelovi = t.trim().split(/\s\+\s/);
  if (!dijelovi.some((d) => STANJE_RE.test(d))) return { rijeci: true };
  const formule = [];
  for (const d of dijelovi) {
    const c = clanOd(d);
    if (c.greska) return { greska: c.greska };
    const isto = formule.find((y) => y.kljuc === c.kljuc);
    if (isto) return { greska: `${zapisTvari(c)} je dvaput na istoj strani` };
    formule.push(c);
  }
  return { formule };
}

// atomi i naboj strane: {atomi: {El: n}, naboj}
function sastav(formule) {
  const atomi = {};
  let naboj = 0;
  for (const c of formule) {
    for (const [e, n] of Object.entries(c.atomi)) atomi[e] = (atomi[e] ?? 0) + c.koef * n;
    naboj += c.koef * c.naboj;
  }
  return { atomi, naboj };
}
// null ako je izjednačeno, inače rečenica
function neizjednaceno(L, D) {
  const a = sastav(L);
  const b = sastav(D);
  for (const e of new Set([...Object.keys(a.atomi), ...Object.keys(b.atomi)])) {
    const x = a.atomi[e] ?? 0;
    const y = b.atomi[e] ?? 0;
    if (Math.abs(x - y) > 1e-9) return `atoma ${e} je lijevo ${bezPredznaka(x)}, a desno ${bezPredznaka(y)}`;
  }
  if (Math.abs(a.naboj - b.naboj) > 1e-9) return `naboj je lijevo ${bezPredznaka(a.naboj)}, a desno ${bezPredznaka(b.naboj)}`;
  return null;
}

// Elementarna tvar u standardnom stanju (ΔfH = 0): O₂(g), H₂(g), Br₂(ℓ), I₂(s), C(s), metali (s) …
const STANDARD = { H: ["H₂", "g"], N: ["N₂", "g"], O: ["O₂", "g"], F: ["F₂", "g"], Cl: ["Cl₂", "g"], Br: ["Br₂", "l"], I: ["I₂", "s"], He: ["He", "g"], Ne: ["Ne", "g"], Ar: ["Ar", "g"], Kr: ["Kr", "g"], Xe: ["Xe", "g"], Rn: ["Rn", "g"], Hg: ["Hg", "l"], S: ["S", "s"], P: ["P", "s"] };
export function jeElementarna(c) {
  const el = Object.keys(c.atomi ?? {});
  if (el.length !== 1 || c.naboj !== 0) return false;
  const [f, st] = STANDARD[el[0]] ?? [el[0], "s"];
  if (el[0] === "S" && c.formula === "S₈") return c.stanje === "s";
  if (el[0] === "P" && c.formula === "P₄") return c.stanje === "s";
  return c.formula === f && c.stanje === st;
}

// ── reakcija ──
// dH: broj, {vrijednost, zapis} ili samo predznak "+" / "−"
function dHOd(x) {
  if (x === "+" || x === "−" || x === "-") return { znak: x === "+" ? 1 : -1, v: null, zapis: null };
  const b = brojOd(x);
  return b ? { ...b, znak: Math.sign(b.v) } : null;
}

// ΔfH tablica: kljuc → {v, zapis}; {greska} ako ključ nije tvar
function dfHOd(o) {
  const out = {};
  for (const [k, x] of Object.entries(o ?? {})) {
    const c = clanOd(k);
    if (c.greska || c.koef !== 1) return { greska: `dfH: „${k}“ nije tvar sa stanjem (npr. „H₂O(ℓ)“)` };
    const b = brojOd(x);
    if (!b) return { greska: `dfH: vrijednost za ${k} mora biti broj (ili {vrijednost, zapis})` };
    out[c.kljuc] = { ...b, tvar: c };
  }
  return { tablica: out };
}

// Normalizirana reakcija: razine, ΔrH (i odakle je), Ea …; {greska} za neispravnu.
export function reakcijaOd(R) {
  if (!R || typeof R !== "object" || Array.isArray(R)) return { greska: "reakcija je {reaktanti, produkti, dH, …}" };
  const L = stranaOd(R.reaktanti);
  const D = stranaOd(R.produkti);
  if (L.greska) return { greska: `reaktanti: ${L.greska}` };
  if (D.greska) return { greska: `produkti: ${D.greska}` };
  const formule = !!(L.formule && D.formule);
  const H0b = R.H0 != null ? brojOd(R.H0) : { v: 0, zapis: null };
  if (!H0b) return { greska: "H0 (razina reaktanata) mora biti broj" };
  const out = { oznaka: isText(R.oznaka) ? R.oznaka.trim() : null, reaktanti: R.reaktanti.trim(), produkti: R.produkti.trim(), L: L.formule ?? null, D: D.formule ?? null, formule, H0: H0b.v, H0b };
  // ΔrH: zadan, iz stupnjeva ili iz ΔfH
  let dH = R.dH != null ? dHOd(R.dH) : null;
  if (R.dH != null && !dH) return { greska: 'dH mora biti broj (kJ/mol), {vrijednost, zapis} ili "+" / "−"' };
  if (dH && dH.v === 0) return { greska: "dH ne smije biti 0" };
  if (R.stupnjevi != null) {
    if (!Array.isArray(R.stupnjevi) || R.stupnjevi.length < 2 || R.stupnjevi.length > 4) return { greska: "stupnjevi je popis od 2 do 4 stupnja {do, dH, oznaka?}" };
    const st = [];
    for (const [i, x] of R.stupnjevi.entries()) {
      if (!x || typeof x !== "object") return { greska: `stupnjevi[${i}] je {do, dH, oznaka?}` };
      for (const f of Object.keys(x)) if (!["do", "dH", "oznaka"].includes(f)) return { greska: `stupnjevi[${i}] nema polje „${f}“ (dopuštena: do, dH, oznaka)` };
      const b = brojOd(x.dH);
      if (!b || b.v === 0) return { greska: `stupnjevi[${i}].dH mora biti broj različit od 0` };
      const zadnji = i === R.stupnjevi.length - 1;
      if (!zadnji && !isText(x.do)) return { greska: `stupnjevi[${i}] treba „do“: tekst međurazine (npr. „NH₄⁺(g) + Cl⁻(g)“)` };
      if (zadnji && x.do != null && String(x.do).trim() !== out.produkti) return { greska: "zadnji stupanj završava na produktima: izostavi mu „do“ ili ga napiši isto kao produkti" };
      const S = zadnji ? D : stranaOd(x.do);
      if (S.greska) return { greska: `stupnjevi[${i}].do: ${S.greska}` };
      if (formule && S.formule && neizjednaceno(L.formule, S.formule)) return { greska: `stupnjevi[${i}].do: ${neizjednaceno(L.formule, S.formule)} (međurazina mora imati iste atome kao reaktanti)` };
      st.push({ do: zadnji ? out.produkti : x.do.trim(), dH: b, oznaka: isText(x.oznaka) ? x.oznaka.trim() : null });
    }
    const zbroj = st.reduce((a, x) => a + x.dH.v, 0);
    if (Math.abs(zbroj) < 1e-9) return { greska: "zbroj ΔH stupnjeva je 0" };
    if (dH && (dH.v == null ? dH.znak !== Math.sign(zbroj) : !isti(dH.v, zbroj))) return { greska: `dH (${dH.v ?? (dH.znak > 0 ? "+" : "−")}) se ne slaže sa zbrojem stupnjeva (${sPredznakom(zbroj)})` };
    out.stupnjevi = st;
    if (!dH || dH.v == null) dH = { v: zbroj, zapis: null, znak: Math.sign(zbroj), izracunat: true };
  }
  if (R.dfH != null) {
    if (!formule) return { greska: "dfH traži reaktante i produkte kao tvari sa stanjima (npr. „CH₄(g) + 2 O₂(g)“)" };
    if (typeof R.dfH !== "object" || Array.isArray(R.dfH)) return { greska: "dfH je {\"H₂O(ℓ)\": −286, …}" };
    const t = dfHOd(R.dfH);
    if (t.greska) return { greska: t.greska };
    const sve = [...L.formule, ...D.formule];
    for (const k of Object.keys(t.tablica)) if (!sve.some((c) => c.kljuc === k)) return { greska: `dfH: ${zapisTvari(t.tablica[k].tvar)} nije u reakciji` };
    for (const c of sve) {
      const x = t.tablica[c.kljuc];
      if (jeElementarna(c)) {
        if (x && x.v !== 0) return { greska: `dfH: ${zapisTvari(c)} je elementarna tvar u standardnom stanju, pa je njezina ΔfH = 0` };
      } else if (!x) return { greska: `dfH: nedostaje ΔfH za ${zapisTvari(c)} (samo elementarne tvari u standardnom stanju imaju 0)` };
    }
    out.dfH = t.tablica;
    const s = stvaranjeOd(out);
    if (dH && (dH.v == null ? dH.znak !== Math.sign(s.dH) : !isti(dH.v, s.dH))) return { greska: `dH se ne slaže s entalpijama stvaranja (iz njih ΔrH = ${sPredznakom(s.dH)})` };
    if (Math.abs(s.dH) < 1e-9) return { greska: "iz entalpija stvaranja ΔrH ispada 0" };
    if (!dH || dH.v == null) dH = { v: s.dH, zapis: null, znak: Math.sign(s.dH), izracunat: true };
  }
  if (!dH) return { greska: "reakcija treba dH (ili stupnjeve, ili dfH iz kojih se računa)" };
  out.dH = dH;
  if (formule) {
    const g = neizjednaceno(L.formule, D.formule);
    if (g) return { greska: `reakcija nije izjednačena: ${g}` };
  }
  // energija aktivacije (energijski profil)
  for (const k of ["Ea", "Ea_kat"]) {
    if (R[k] == null) continue;
    const b = brojOd(R[k]);
    if (!b || !(b.v > 0)) return { greska: `${k} mora biti pozitivan broj` };
    out[k] = b;
  }
  if (out.Ea_kat && !out.Ea) return { greska: "Ea_kat ide uz Ea (energija aktivacije bez katalizatora)" };
  if (out.Ea) {
    if (dH.v == null) return { greska: "uz Ea dH mora biti broj (vrh se crta iznad obiju razina)" };
    if (out.stupnjevi || out.dfH) return { greska: "Ea ide uz jednostavnu reakciju, ne uz stupnjeve ni dfH" };
    if (!(out.Ea.v > dH.v)) return { greska: `Ea (${bezPredznaka(out.Ea.v)}) mora biti veća od ΔH (${sPredznakom(dH.v)}): vrh je iznad i reaktanata i produkata` };
    if (out.Ea_kat) {
      if (!(out.Ea_kat.v < out.Ea.v)) return { greska: "Ea_kat mora biti manja od Ea: katalizator snizuje energiju aktivacije" };
      if (!(out.Ea_kat.v > dH.v)) return { greska: "Ea_kat mora biti veća od ΔH: i vrh s katalizatorom je iznad produkata" };
    }
  }
  return out;
}

// Razine redom puta: [{oznaka, H}] (reaktanti, međurazine, produkti); uz samo predznak ΔH visine su zamišljene.
export function razine(r) {
  if (r.dH.v == null) return [{ oznaka: r.reaktanti, H: 0 }, { oznaka: r.produkti, H: r.dH.znak }];
  const out = [{ oznaka: r.reaktanti, H: r.H0 }];
  if (r.stupnjevi) {
    let H = r.H0;
    for (const x of r.stupnjevi) {
      H += x.dH.v;
      out.push({ oznaka: x.do, H, stupanj: x });
    }
    return out;
  }
  out.push({ oznaka: r.produkti, H: r.H0 + r.dH.v });
  return out;
}

// Entalpije stvaranja: Σν·ΔfH produkata i reaktanata, i bez koeficijenata (za poruke).
export function stvaranjeOd(r) {
  const val = (c) => r.dfH[c.kljuc]?.v ?? 0;
  const sum = (F, s = true) => F.reduce((a, c) => a + (s ? c.koef : 1) * val(c), 0);
  return { sP: sum(r.D), sR: sum(r.L), sP1: sum(r.D, false), sR1: sum(r.L, false), dH: sum(r.D) - sum(r.L) };
}
// tvari s ΔfH za tablicu: [{tvar, strana, b (zadano) | null (elementarna)}]
export function tvariStvaranja(r) {
  return [...r.L.map((c) => ({ c, strana: "L" })), ...r.D.map((c) => ({ c, strana: "D" }))].map(({ c, strana }) => ({ tvar: c, strana, b: r.dfH[c.kljuc] ?? null, elementarna: jeElementarna(c) }));
}

// Veličine energijskog profila.
export function velicine(r) {
  const q = { dH: r.dH.v };
  if (r.Ea) {
    q.Ea = r.Ea.v;
    q.Ea_povratne = r.Ea.v - r.dH.v;
  }
  if (r.Ea_kat) {
    q.Ea_kat = r.Ea_kat.v;
    q.Ea_kat_povratne = r.Ea_kat.v - r.dH.v;
    q.snizenje = r.Ea.v - r.Ea_kat.v;
  }
  return q;
}
const zadanZapis = (r, k) => (k === "dH" ? r.dH : k === "Ea" ? r.Ea : k === "Ea_kat" ? r.Ea_kat : null);
// vrijednost veličine kao tekst: zadani zapis ako postoji
export function zapisVelicine(r, k) {
  const z = zadanZapis(r, k);
  const v = velicine(r)[k];
  if (z?.zapis) return zapisB(z, k === "dH");
  return k === "dH" ? sPredznakom(v) : bezPredznaka(v);
}

// ── skica ──
const tekstSkice = (spec) =>
  [...(spec.razine ?? []).map((x) => x.oznaka), ...(spec.prijelazi ?? []).map((x) => x.oznaka), ...(spec.vrhovi ?? []).map((x) => x.oznaka)].filter(Boolean).join("\n");
export function nacrtaj(spec) {
  return renderSketch(spec, tekstSkice(spec)).svg;
}
const sv = (ime, v) => (v == null ? ime : `${ime}\n${v}`);

// Opis skice za reakciju. o: {kat, povratna, stupnjevi (true: put po stupnjevima), stvaranje, vrijednosti
// (veličine s brojem: {Ea: true, …}), upitnik ({Ea: true}: strelica s „?“), razineVrijednosti, bezDH, pozicije, raspon}.
export function skicaOd(s, r, o = {}) {
  const jed = jedinicaOd(s);
  const os = s.os ?? (r.Ea ? "E" : "H");
  const lbl = (k) => {
    // Eₐ u jednom retku (oznaka stoji ispod podnožja strelice), ΔrH u dva (desno od dijagrama)
    if (o.vrijednosti?.[k]) return k === "dH" ? sv(SKICA_OZ[k], `${zapisVelicine(r, k)} ${jed}`) : `${SKICA_OZ[k]} = ${zapisVelicine(r, k)} ${jed}`;
    if (o.upitnik?.[k]) return `${SKICA_OZ[k]} = ?`;
    return SKICA_OZ[k];
  };
  const vrijednostRazine = (H) => (o.razineVrijednosti ? `${formatNumber(okrugli(H))} ${jed}` : null);
  if (o.stvaranje && r.dfH) {
    const st = stvaranjeOd(r);
    // reaktanti su same elementarne tvari: dvije razine
    if (Math.abs(st.sR) < 1e-9) return { tip: "energijski_dijagram", os, razine: [{ oznaka: r.reaktanti, vrijednost: 0 }, { oznaka: r.produkti, vrijednost: st.sP }], prijelazi: [{ od: 0, do: 1, oznaka: `ΔᵣH\n${sPredznakom(st.dH)} ${jed}` }] };
    // elementarne tvari (0), reaktanti, produkti: Σ reaktanata i ΔrH su susjedne strelice, Σ produkata desno
    const lv = [
      { oznaka: "elementarne\ntvari", vrijednost: 0 },
      { oznaka: r.reaktanti, vrijednost: st.sR },
      { oznaka: r.produkti, vrijednost: st.sP },
    ];
    // kratka strelica Σ reaktanata ne stane s oznakom: tada je nema (broj piše ispod dijagrama)
    const raspon = Math.max(0, st.sR, st.sP) - Math.min(0, st.sR, st.sP);
    const pr = [
      ...(Math.abs(st.sR) >= 0.15 * raspon ? [{ od: 0, do: 1, oznaka: `${sPredznakom(st.sR)} ${jed}` }] : []),
      { od: 1, do: 2, oznaka: `ΔᵣH\n${sPredznakom(st.dH)} ${jed}` },
      { od: 0, do: 2, oznaka: `${sPredznakom(st.sP)} ${jed}` },
    ];
    return { tip: "energijski_dijagram", os, razine: lv, prijelazi: pr };
  }
  const rz = razine(r);
  const poz = o.pozicije;
  const H = (i) => (poz ? poz.razine[i] : rz[i].H);
  const spec = { tip: "energijski_dijagram", os, razine: [], prijelazi: [] };
  if (o.raspon) spec.raspon = o.raspon;
  if (r.stupnjevi && o.stupnjevi) {
    spec.razine = rz.map((x, i) => ({ oznaka: sv(x.oznaka, vrijednostRazine(x.H)), vrijednost: H(i) }));
    r.stupnjevi.forEach((x, i) => spec.prijelazi.push({ od: i, do: i + 1, oznaka: o.bezDH ? (x.oznaka ?? "") : sv(x.oznaka ?? "", `${zapisB(x.dH)} ${jed}`).replace(/^\n/, "") }));
    spec.prijelazi.push({ od: 0, do: rz.length - 1, oznaka: o.bezDH ? "ΔᵣH" : sv("ΔᵣH", `${zapisVelicine(r, "dH")} ${jed}`) });
    return spec;
  }
  // izravno (i stupnjevi bez puta): samo reaktanti i produkti
  const zadnja = rz.length - 1;
  spec.razine = [
    { oznaka: sv(r.reaktanti, vrijednostRazine(r.H0)), vrijednost: H(0) },
    { oznaka: sv(r.produkti, vrijednostRazine(r.H0 + (r.dH.v ?? 0))), vrijednost: H(zadnja) },
  ];
  if (r.Ea) {
    const vrh = poz ? poz.vrhovi[0] : r.H0 + r.Ea.v;
    const kat = o.kat && r.Ea_kat;
    spec.vrhovi = [{ od: 0, do: 1, vrijednost: vrh, oznaka: kat ? (o.razineVrijednosti ? `bez katalizatora (${formatNumber(okrugli(vrh))} ${jed})` : "bez katalizatora") : o.razineVrijednosti ? `prijelazno stanje\n${formatNumber(okrugli(vrh))} ${jed}` : "" }];
    if (kat) {
      const vk = poz ? poz.vrhovi[1] : r.H0 + r.Ea_kat.v;
      spec.vrhovi.push({ od: 0, do: 1, vrijednost: vk, oznaka: o.razineVrijednosti ? `s katalizatorom (${formatNumber(okrugli(vk))} ${jed})` : "s katalizatorom", isprekidano: true });
    }
    const pok = o.strelice ?? {};
    if (pok.Ea) spec.prijelazi.push({ od: 0, vrh: 0, oznaka: lbl("Ea") });
    if (kat && pok.Ea_kat) spec.prijelazi.push({ od: 0, vrh: 1, oznaka: lbl("Ea_kat") });
    if (pok.Ea_povratne) spec.prijelazi.push({ od: 1, vrh: 0, oznaka: lbl("Ea_povratne") });
    if (kat && pok.Ea_kat_povratne) spec.prijelazi.push({ od: 1, vrh: 1, oznaka: lbl("Ea_kat_povratne") });
    if (pok.dH) spec.prijelazi.push({ od: 0, do: 1, desno: true, oznaka: lbl("dH") });
    return spec;
  }
  // bez Ea: strelica ΔrH se crta osim uz strelice: {dH: false} (očitavanje prije provjere)
  if (o.strelice?.dH !== false || o.upitnik?.dH) spec.prijelazi.push({ od: 0, do: 1, oznaka: o.bezDH || r.dH.v == null ? "ΔᵣH" : o.upitnik?.dH ? "ΔᵣH = ?" : sv("ΔᵣH", `${zapisVelicine(r, "dH")} ${jed}`) });
  return spec;
}

// ── Hessov zakon: zadane jednadžbe ──
// Jednadžba {reaktanti, produkti, dH}: {L, D, dH} ili {greska}.
function jednadzbaOd(j, i) {
  if (!j || typeof j !== "object") return { greska: `jednadzbe[${i}] je {reaktanti, produkti, dH}` };
  for (const f of Object.keys(j)) if (!["reaktanti", "produkti", "dH"].includes(f)) return { greska: `jednadzbe[${i}] nema polje „${f}“` };
  const L = stranaOd(j.reaktanti);
  const D = stranaOd(j.produkti);
  if (L.greska || D.greska) return { greska: `jednadzbe[${i}]: ${L.greska ?? D.greska}` };
  if (!L.formule || !D.formule) return { greska: `jednadzbe[${i}]: reaktanti i produkti su tvari sa stanjima (npr. „H₂O(ℓ)“)` };
  const g = neizjednaceno(L.formule, D.formule);
  if (g) return { greska: `jednadzbe[${i}] nije izjednačena: ${g}` };
  const b = brojOd(j.dH);
  if (!b || b.v === 0) return { greska: `jednadzbe[${i}].dH mora biti broj različit od 0` };
  return { L: L.formule, D: D.formule, dH: b, reaktanti: j.reaktanti.trim(), produkti: j.produkti.trim() };
}
// vektor tvari: produkti +, reaktanti −
function vektor(L, D, k = 1) {
  const v = {};
  for (const c of L) v[c.kljuc] = (v[c.kljuc] ?? 0) - k * c.koef;
  for (const c of D) v[c.kljuc] = (v[c.kljuc] ?? 0) + k * c.koef;
  return v;
}
// x za Σ xᵢ·jᵢ = cilj (Gaussova eliminacija); null ako rješenje ne postoji ili nije jedinstveno
function rijesi(kljucevi, J, cilj) {
  const n = J.length;
  const A = kljucevi.map((k) => [...J.map((v) => v[k] ?? 0), cilj[k] ?? 0]);
  let red = 0;
  const pivoti = [];
  for (let col = 0; col < n && red < A.length; col++) {
    let p = red;
    for (let i = red + 1; i < A.length; i++) if (Math.abs(A[i][col]) > Math.abs(A[p][col])) p = i;
    if (Math.abs(A[p][col]) < 1e-9) return null;
    [A[red], A[p]] = [A[p], A[red]];
    for (let i = 0; i < A.length; i++) {
      if (i === red) continue;
      const f = A[i][col] / A[red][col];
      if (f) for (let j = col; j <= n; j++) A[i][j] -= f * A[red][j];
    }
    pivoti.push(col);
    red++;
  }
  if (pivoti.length < n) return null;
  for (let i = red; i < A.length; i++) if (Math.abs(A[i][n]) > 1e-7) return null;
  return pivoti.map((col, i) => A[i][n] / A[i][col]);
}
export function hessOd(s) {
  const r = reakcijaCilja(s);
  if (r.greska) return r;
  const J = [];
  for (const [i, j] of (s.jednadzbe ?? []).entries()) {
    const x = jednadzbaOd(j, i);
    if (x.greska) return x;
    J.push(x);
  }
  const cilj = vektor(r.L, r.D);
  const vek = J.map((j) => vektor(j.L, j.D));
  const kljucevi = [...new Set([...Object.keys(cilj), ...vek.flatMap((v) => Object.keys(v))])];
  const x = rijesi(kljucevi, vek, cilj);
  if (!x) return { greska: "zbrajanjem zadanih jednadžbi (obrnutih ili pomnoženih) ne dobiva se jednoznačno tražena jednadžba: provjeri tvari i stanja" };
  const nula = x.findIndex((v) => Math.abs(v) < 1e-9);
  if (nula >= 0) return { greska: `jednadžba ${nula + 1} nije potrebna za traženu (faktor 0); izbaci je` };
  for (const [i, v] of x.entries()) if (!FAKTORI.some((f) => Math.abs(Math.abs(v) - f) < 1e-6)) return { greska: `jednadžbu ${i + 1} trebalo bi pomnožiti s ${bezPredznaka(Math.abs(v))}; dopušteni faktori su ${FAKTORI.map(bezPredznaka).join(", ")}` };
  const faktori = x.map((v) => FAKTORI.find((f) => Math.abs(Math.abs(v) - f) < 1e-6));
  const obrni = x.map((v) => v < 0);
  const dH = J.reduce((a, j, i) => a + (obrni[i] ? -1 : 1) * faktori[i] * j.dH.v, 0);
  return { r, J, cilj, kljucevi, faktori, obrni, dH };
}
function reakcijaCilja(s) {
  const R = s.reakcija ?? {};
  const L = stranaOd(R.reaktanti);
  const D = stranaOd(R.produkti);
  if (L.greska || D.greska) return { greska: `reakcija: ${L.greska ?? D.greska}` };
  if (!L.formule || !D.formule) return { greska: "reakcija: reaktanti i produkti su tvari sa stanjima (npr. „CH₄(g) + 2 O₂(g)“)" };
  const g = neizjednaceno(L.formule, D.formule);
  if (g) return { greska: `reakcija nije izjednačena: ${g}` };
  return { L: L.formule, D: D.formule, reaktanti: R.reaktanti.trim(), produkti: R.produkti.trim() };
}
// Učenikova kombinacija → zbroj tvari (pokraćeno), za prikaz i provjeru
export function zbrojKombinacije(h, obrni, faktori) {
  const v = {};
  h.J.forEach((j, i) => {
    const k = (obrni[i] ? -1 : 1) * (faktori[i] ?? 1);
    for (const [kl, n] of Object.entries(vektor(j.L, j.D, k))) v[kl] = (v[kl] ?? 0) + n;
  });
  return v;
}
// tvar po ključu (za ispis „H₂O(ℓ)“)
function tvarKljuca(h, k) {
  for (const c of [...h.r.L, ...h.r.D, ...h.J.flatMap((j) => [...j.L, ...j.D])]) if (c.kljuc === k) return zapisTvari(c);
  return k;
}
// zapis strane iz vektora: lijevo (−) ili desno (+)
export function straneVektora(h, v) {
  const clan = (k, n) => `${Math.abs(n - 1) < 1e-9 ? "" : `${koefZapis(n)} `}${tvarKljuca(h, k)}`;
  const red = h.kljucevi.filter((k) => Math.abs(v[k] ?? 0) > 1e-9);
  return { L: red.filter((k) => v[k] < 0).map((k) => clan(k, -v[k])), D: red.filter((k) => v[k] > 0).map((k) => clan(k, v[k])) };
}
export const koefZapis = (n) => (Math.abs(n - 0.5) < 1e-9 ? "½" : Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : Math.abs(n * 2 - Math.round(n * 2)) < 1e-9 ? `${Math.round(n * 2)}/2` : bezPredznaka(n));
// jednadžba nakon obrtanja i množenja: {L: [tekst člana], D: [...]}
export function preinacena(j, obrni, f) {
  const clan = (c) => {
    const k = c.koef * f;
    return `${Math.abs(k - 1) < 1e-9 ? "" : `${koefZapis(k)} `}${zapisTvari(c)}`;
  };
  const L = j.L.map(clan);
  const D = j.D.map(clan);
  return obrni ? { L: D, D: L } : { L, D };
}

// ── slaganje (slozi) ──
// broj razina koje učenik pomiče (sve osim reaktanata) i vrhova
export function slaganjeOd(r) {
  return { razina: razine(r).length - 1, vrhova: r.Ea ? (r.Ea_kat ? 2 : 1) : 0 };
}
// Ispravan raspored mjesta (za „Pokaži odgovor“): redoslijed i predznaci kao u stvarnim vrijednostima.
export function tocnaMjesta(r) {
  const rz = razine(r);
  const d = rz.map((x) => x.H - rz[0].H);
  const max = Math.max(...d.map(Math.abs)) || 1;
  const m = d.map((x, i) => (i === 0 ? 0 : Math.max(-MJESTA, Math.min(MJESTA, Math.round((x / max) * MJESTA) || Math.sign(x)))));
  // susjedne razine ne smiju biti na istom mjestu
  for (let i = 1; i < m.length; i++) {
    if (m[i] === m[i - 1]) m[i] = Math.max(-MJESTA, Math.min(MJESTA, m[i] + Math.sign(d[i] - d[i - 1])));
  }
  const vrhovi = [];
  if (r.Ea) {
    const top = Math.max(0, ...m);
    vrhovi.push(Math.min(VRH_MAX, top + 3));
    if (r.Ea_kat) vrhovi.push(Math.min(VRH_MAX - 1, top + 1));
  }
  return { razine: m, vrhovi };
}
export const VRH_NAJVISE = VRH_MAX;

// ── ocitaj ──
export const zadanoOd = (s) => (Array.isArray(s.zadano) ? s.zadano : ["razine"]);
export const traziOd = (s) => (Array.isArray(s.trazi) ? s.trazi : typeof s.trazi === "string" ? [s.trazi] : []);
// što se može izračunati iz zadanoga
function rjesivo(zad, trazi) {
  if (zad.includes("razine")) return true;
  const z = new Set(zad);
  const pravila = [
    [["Ea", "dH"], "Ea_povratne"], [["Ea", "Ea_povratne"], "dH"], [["dH", "Ea_povratne"], "Ea"],
    [["Ea_kat", "dH"], "Ea_kat_povratne"], [["Ea_kat", "Ea_kat_povratne"], "dH"], [["dH", "Ea_kat_povratne"], "Ea_kat"],
    [["Ea", "Ea_kat"], "snizenje"], [["Ea", "snizenje"], "Ea_kat"], [["Ea_kat", "snizenje"], "Ea"],
  ];
  for (let k = 0; k < 6; k++) for (const [iz, u] of pravila) if (iz.every((x) => z.has(x))) z.add(u);
  return trazi.every((t) => z.has(t));
}
// tipične krive vrijednosti za veličinu k (ocitaj)
function kriveOcitanja(s, r, k) {
  const q = velicine(r);
  const vrh = r.Ea ? r.H0 + r.Ea.v : null;
  const vrhK = r.Ea_kat ? r.H0 + r.Ea_kat.v : null;
  const Hp = r.H0 + r.dH.v;
  const razineZ = zadanoOd(s).includes("razine");
  const out = [];
  const add = (v, poruka) => {
    if (isNum(v) && !isti(v, q[k]) && !out.some((x) => isti(x.vrijednost, v))) out.push({ vrijednost: v, poruka });
  };
  const nize = r.dH.v < 0;
  if (k === "dH") {
    add(-q.dH, `Pazi na predznak: ΔrH = H(produkti) − H(reaktanti). Produkti su ${nize ? "niže" : "više"} od reaktanata, pa je ΔrH ${nize ? "negativna" : "pozitivna"}.`);
    if (razineZ) add(Hp, "To je razina produkata. ΔrH je razlika: razina produkata minus razina reaktanata.");
    if (q.Ea != null) add(q.Ea, "To je energija aktivacije (do vrha). ΔrH je razlika između produkata i reaktanata.");
    if (q.Ea_povratne != null) add(q.Ea_povratne, "To je energija aktivacije povratne reakcije. ΔrH je razlika između produkata i reaktanata.");
  }
  if (k === "Ea") {
    if (razineZ && vrh != null) add(vrh, "To je visina vrha. Eₐ je razlika između vrha i razine reaktanata.");
    add(q.Ea_povratne, "To je energija aktivacije povratne reakcije (od produkata do vrha). Polazna reakcija kreće od reaktanata.");
    add(q.Ea + q.dH, "Eₐ se ne računa preko produkata: mjeri se od razine reaktanata do vrha.");
    add(Math.abs(q.dH), "To je ΔrH (razlika reaktanata i produkata). Eₐ je od reaktanata do vrha.");
    if (q.Ea_kat != null) add(q.Ea_kat, "To je energija aktivacije s katalizatorom (niži vrh). Traži se bez katalizatora.");
  }
  if (k === "Ea_povratne") {
    add(q.Ea, "To je energija aktivacije polazne reakcije. Povratna reakcija kreće s razine produkata, pa je Eₐ(povratne) = Eₐ − ΔrH.");
    add(q.Ea + q.dH, `Eₐ(povratne) = Eₐ − ΔrH: ΔrH je ${nize ? "negativna, pa se Eₐ povećava" : "pozitivna, pa se Eₐ smanjuje"}.`);
    add(Math.abs(q.dH), "To je ΔrH. Povratna reakcija ide od produkata do vrha.");
    if (razineZ && vrh != null) add(vrh, "To je visina vrha. Eₐ(povratne) je razlika između vrha i razine produkata.");
  }
  if (k === "Ea_kat") {
    add(q.Ea, "To je energija aktivacije bez katalizatora. S katalizatorom je vrh niži.");
    add(q.snizenje, "To je koliko katalizator snizi Eₐ, a ne sama Eₐ s katalizatorom.");
    if (razineZ && vrhK != null) add(vrhK, "To je visina nižeg vrha. Eₐ je razlika između vrha i razine reaktanata.");
    add(q.Ea_kat_povratne, "To je Eₐ povratne reakcije s katalizatorom (od produkata). Polazna reakcija kreće od reaktanata.");
  }
  if (k === "Ea_kat_povratne") {
    add(q.Ea_kat, "To je Eₐ polazne reakcije s katalizatorom. Povratna kreće s razine produkata.");
    add(q.Ea_povratne, "To je Eₐ povratne reakcije bez katalizatora. S katalizatorom je vrh niži.");
    add(q.Ea_kat + q.dH, "Eₐ(povratne) = Eₐ − ΔrH: pazi na predznak ΔrH.");
    if (razineZ && vrhK != null) add(vrhK, "To je visina nižeg vrha. Eₐ(povratne) je razlika između vrha i razine produkata.");
  }
  if (k === "snizenje") {
    add(q.Ea_kat, "To je Eₐ s katalizatorom. Traži se za koliko je niža nego bez katalizatora.");
    add(q.Ea, "To je Eₐ bez katalizatora. Traži se za koliko je katalizator snizi.");
    if (razineZ) add(vrh - r.H0 + (vrhK - r.H0), "Sniženje je razlika dviju energija aktivacije, a ne zbroj.");
  }
  return out;
}

// ── tekst točnog odgovora ──
function zapisJednadzbe(L, D) {
  return `${L.join(" + ")} → ${D.join(" + ")}`;
}

export const energijski_dijagram = {
  tip: "energijski_dijagram",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Entalpijski (energijski) dijagram: razine reaktanata i produkata, strelice ΔrH i Ea, energijski profil s prijelaznim stanjem (crta ga skica „energijski_dijagram“).
reakcija: {reaktanti, produkti (tekst razine: tvari sa stanjima „CH₄(g) + 2 O₂(g)“, „½ O₂(g)“, ili opis „reaktanti“), dH (ΔrH u kJ/mol, broj ili {vrijednost, zapis}; "+" / "−" kad je poznat samo predznak), H0? (visina razine reaktanata, zadano 0; npr. 40 za profil s razinama 40 / 15 / 95), Ea? (energija aktivacije bez katalizatora; vrh = H0 + Ea), Ea_kat? (s katalizatorom, manja od Ea), stupnjevi? (put preko međurazina, Hessov zakon: [{do: "NH₄⁺(g) + Cl⁻(g)", dH: 705, oznaka: "razaranje"}, {dH: −690, oznaka: "hidratacija"}]; zadnji završava na produktima; dH = zbroj, kod ga računa), dfH? (entalpije stvaranja {"CH₄(g)": −75, "CO₂(g)": −394, "H₂O(ℓ)": −286}; elementarne tvari u standardnom stanju imaju 0 i ne zadaju se; kod računa ΔrH = Σν·ΔfH(produkti) − Σν·ΔfH(reaktanti)), oznaka? (ime za izbor u istraživanju)}. Kad su strane tvari sa stanjima, kod provjerava formule i izjednačenost (atomi, naboj).
os?: "H" (zadano) ili "E" (zadano uz Ea); jedinica?: "kJ/mol" (zadano) | "kJ". ΔrH, Ea povratne (Ea − ΔrH), sniženje Ea i sve razine računa kod.
tekst, nacin:
- "istrazi" (nije zadatak): reakcija ili reakcije (2–4, svaka s oznaka, gumbi za izbor); prekidači koje kod sam nudi: katalizator (uz Ea_kat: niži vrh, isti ΔrH), povratna reakcija (uz Ea: Ea povratne), stupnjevi (uz stupnjevi: izravno ili po stupnjevima, isti ΔrH), preko elementarnih tvari (uz dfH); ispod dijagrama vrijednosti Ea i ΔrH i je li reakcija egzotermna ili endotermna;
- "hess": reakcija (tražena jednadžba, tvari sa stanjima) i jedno od: (a) reakcija.dfH: učenik upisuje ΔrH; koraci?: true dodaje polja za ΔfH elementarnih tvari (moraju biti 0), Σν·ΔfH(produkti) i Σν·ΔfH(reaktanti); (b) jednadzbe: [{reaktanti, produkti, dH}] (2–4): učenik za svaku bira kako piše / obrnuto i faktor (½, 1, 3/2, 2, 3, 4), pa upisuje ΔrH; kod rješava koji izbor daje traženu jednadžbu (mora biti jednoznačan); zbroj?: true pokazuje zbroj odabranih jednadžbi uživo. Poruke (obrnut predznak pri obrtanju, nije pomnožio ΔH, zamijenjeni produkti i reaktanti, zaboravljeni koeficijenti, ΔfH elementarne tvari nije 0, tvar se ne pokrati) dodaje kod; krivo?: [{vrijednost, poruka}] za ΔrH;
- "ocitaj": reakcija s dH (i Ea, Ea_kat za profil); zadano?: ["razine"] (zadano: uz razine i vrh pišu njihove energije) ili popis veličina napisanih na strelicama (Ea, dH, Ea_povratne, Ea_kat, Ea_kat_povratne); trazi: 1–3 od Ea, dH, Ea_povratne, Ea_kat, Ea_kat_povratne, snizenje (mora se dati izračunati iz zadanoga); strelice?: true crta i tražene strelice s „?“ (zadano: tražene strelice se ne vide do provjere); poruke za zamjenu Ea i ΔrH, Ea polazne i povratne reakcije, visinu vrha umjesto razlike i predznak ΔrH dodaje kod; krivo?: [{korak?, vrijednost, poruka}];
- "slozi": reakcija s dH (ili stupnjevi; uz Ea i vrh, uz Ea_kat i vrh s katalizatorom): razina reaktanata stoji, a učenik gumbima gore / dolje postavlja ostale razine (i vrhove) tako da dijagram odgovara reakciji; provjerava se je li svaka razina iznad ili ispod prethodne prema predznaku ΔH i je li vrh s katalizatorom niži; brojevi se ne pokazuju do provjere.`,
  primjer: {
    tip: "energijski_dijagram",
    nacin: "istrazi",
    tekst: "Energijski profil razgradnje vodikova peroksida. Uključi katalizator i usporedi energije aktivacije, pa pogledaj i povratnu reakciju.",
    reakcija: { reaktanti: "reaktanti", produkti: "produkti", H0: 40, dH: -25, Ea: 55, Ea_kat: 20 },
  },
  primjeri: [
    {
      tip: "energijski_dijagram",
      nacin: "istrazi",
      tekst: "Usporedi entalpijske dijagrame gorenja metana i otapanja amonijeva klorida.",
      reakcije: [
        { oznaka: "gorenje metana", reaktanti: "CH₄(g) + 2 O₂(g)", produkti: "CO₂(g) + 2 H₂O(ℓ)", dfH: { "CH₄(g)": -75, "CO₂(g)": -394, "H₂O(ℓ)": -286 } },
        { oznaka: "otapanje NH₄Cl", reaktanti: "NH₄Cl(s)", produkti: "NH₄⁺(aq) + Cl⁻(aq)", stupnjevi: [{ do: "NH₄⁺(g) + Cl⁻(g)", dH: 705, oznaka: "razaranje" }, { dH: -690, oznaka: "hidratacija" }] },
      ],
    },
    {
      tip: "energijski_dijagram",
      nacin: "hess",
      tekst: "Izračunaj reakcijsku entalpiju gorenja metana iz entalpija stvaranja: ΔfH(CH₄, g) = −75 kJ/mol, ΔfH(CO₂, g) = −394 kJ/mol, ΔfH(H₂O, ℓ) = −286 kJ/mol.",
      reakcija: { reaktanti: "CH₄(g) + 2 O₂(g)", produkti: "CO₂(g) + 2 H₂O(ℓ)", dfH: { "CH₄(g)": -75, "CO₂(g)": -394, "H₂O(ℓ)": -286 } },
      koraci: true,
    },
    {
      tip: "energijski_dijagram",
      nacin: "hess",
      tekst: "Kolika je reakcijska entalpija gorenja metana kad voda nastaje kao para? Odaberi koje jednadžbe treba obrnuti ili pomnožiti, pa izračunaj ΔrH.",
      reakcija: { reaktanti: "CH₄(g) + 2 O₂(g)", produkti: "CO₂(g) + 2 H₂O(g)" },
      jednadzbe: [
        { reaktanti: "CH₄(g) + 2 O₂(g)", produkti: "CO₂(g) + 2 H₂O(ℓ)", dH: -891 },
        { reaktanti: "H₂O(ℓ)", produkti: "H₂O(g)", dH: 44 },
      ],
    },
    {
      tip: "energijski_dijagram",
      nacin: "hess",
      tekst: "Izračunaj entalpiju stvaranja ugljikova monoksida iz entalpija gorenja ugljika i ugljikova monoksida.",
      reakcija: { reaktanti: "C(s) + ½ O₂(g)", produkti: "CO(g)" },
      jednadzbe: [
        { reaktanti: "C(s) + O₂(g)", produkti: "CO₂(g)", dH: -394 },
        { reaktanti: "2 CO(g) + O₂(g)", produkti: "2 CO₂(g)", dH: -566 },
      ],
      zbroj: true,
    },
    {
      tip: "energijski_dijagram",
      nacin: "ocitaj",
      tekst: "S dijagrama očitaj energiju aktivacije i reakcijsku entalpiju, pa izračunaj energiju aktivacije povratne reakcije.",
      reakcija: { reaktanti: "reaktanti", produkti: "produkti", H0: 40, dH: -25, Ea: 55 },
      trazi: ["Ea", "dH", "Ea_povratne"],
    },
    {
      tip: "energijski_dijagram",
      nacin: "ocitaj",
      tekst: "Za koliko katalizator snizuje energiju aktivacije?",
      reakcija: { reaktanti: "reaktanti", produkti: "produkti", H0: 40, dH: -25, Ea: 55, Ea_kat: 20 },
      zadano: ["Ea", "Ea_kat"],
      trazi: ["snizenje"],
    },
    {
      tip: "energijski_dijagram",
      nacin: "slozi",
      tekst: "Složi entalpijski dijagram gorenja metana (ΔrH = −891 kJ/mol): postavi razinu produkata.",
      reakcija: { reaktanti: "CH₄(g) + 2 O₂(g)", produkti: "CO₂(g) + 2 H₂O(ℓ)", dH: -891 },
    },
    {
      tip: "energijski_dijagram",
      nacin: "slozi",
      tekst: "Otapanje NH₄Cl ide u dva stupnja: razaranje kristalne strukture (+705 kJ/mol) i hidratacija iona (−690 kJ/mol). Postavi razine plinovitih i hidratiziranih iona.",
      reakcija: { reaktanti: "NH₄Cl(s)", produkti: "NH₄⁺(aq) + Cl⁻(aq)", stupnjevi: [{ do: "NH₄⁺(g) + Cl⁻(g)", dH: 705, oznaka: "razaranje" }, { dH: -690, oznaka: "hidratacija" }] },
    },
    {
      tip: "energijski_dijagram",
      nacin: "slozi",
      tekst: "Endotermna reakcija ima energiju aktivacije 80 kJ/mol i ΔrH = +30 kJ/mol. Postavi razinu produkata i oba vrha: bez katalizatora i s katalizatorom.",
      reakcija: { reaktanti: "reaktanti", produkti: "produkti", dH: 30, Ea: 80, Ea_kat: 50 },
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `energijski_dijagram.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "energijski_dijagram treba „tekst“");
    const dopustena = [...ZAJEDNICKA, ...POLJA_NACINA[s.nacin]];
    for (const f of Object.keys(s)) need(dopustena.includes(f), POLJA.includes(f) ? `polje „${f}“ ne ide uz način ${s.nacin}` : `energijski_dijagram nema polje „${f}“`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.os != null) need(["H", "E"].includes(s.os), 'os je "H" ili "E"');
    if (s.jedinica != null) need(JEDINICE.includes(s.jedinica), `jedinica je ${JEDINICE.join(" ili ")}`);
    if (list.length) return list;

    const provjeriReakciju = (R, ime) => {
      if (!need(R && typeof R === "object" && !Array.isArray(R), `${ime} je {reaktanti, produkti, dH, …}`)) return null;
      for (const f of Object.keys(R)) need(POLJA_REAKCIJE.includes(f), `${ime} nema polje „${f}“ (dopuštena: ${POLJA_REAKCIJE.join(", ")})`);
      const r = reakcijaOd(R);
      if (!need(!r.greska, `${ime}: ${r.greska}`)) return null;
      // zapisi zadanih brojeva moraju biti isti broj
      for (const k of ["dH", "H0", "Ea", "Ea_kat"]) {
        if (R[k] && typeof R[k] === "object" && "zapis" in R[k]) need(isText(R[k].zapis) && zapisZadanog(R[k].zapis, R[k].vrijednost), `${ime}.${k}.zapis („${R[k].zapis}“) mora biti isti broj kao vrijednost (${R[k].vrijednost})`);
      }
      for (const [k, x] of Object.entries(R.dfH ?? {})) if (x && typeof x === "object" && "zapis" in x) need(isText(x.zapis) && zapisZadanog(x.zapis, x.vrijednost), `${ime}.dfH.${k}.zapis mora biti isti broj kao vrijednost`);
      // skica se mora dati nacrtati
      need(!!nacrtaj(skicaOd(s, r, { stupnjevi: true, kat: true, strelice: { Ea: true, Ea_kat: true, dH: true }, vrijednosti: { Ea: true, Ea_kat: true, dH: true } })), `${ime}: dijagram se ne može nacrtati`);
      if (r.dfH) need(!!nacrtaj(skicaOd(s, r, { stvaranje: true })), `${ime}: dijagram preko elementarnih tvari se ne može nacrtati`);
      return r;
    };

    if (s.nacin === "istrazi") {
      if (s.reakcije != null) {
        need(s.reakcija == null, "istrazi ima reakcija ili reakcije, ne oboje");
        if (!need(Array.isArray(s.reakcije) && s.reakcije.length >= 2 && s.reakcije.length <= 4, "reakcije je popis od 2 do 4 reakcije (za jednu koristi reakcija)")) return list;
        s.reakcije.forEach((R, i) => {
          provjeriReakciju(R, `reakcije[${i}]`);
          need(isText(R?.oznaka), `reakcije[${i}] treba oznaka (ime na gumbu za izbor)`);
        });
        const oz = s.reakcije.map((R) => R?.oznaka);
        need(new Set(oz).size === oz.length, "oznake reakcija se ne ponavljaju");
      } else if (need(s.reakcija != null, "istrazi treba reakcija (ili reakcije)")) provjeriReakciju(s.reakcija, "reakcija");
      return list;
    }

    if (s.nacin === "hess") {
      if (!need(s.reakcija && typeof s.reakcija === "object", "hess treba reakcija (tražena jednadžba)")) return list;
      const imaDf = s.reakcija.dfH != null;
      if (!need(imaDf !== (s.jednadzbe != null), "hess treba točno jedno: reakcija.dfH (entalpije stvaranja) ili jednadzbe (zadane jednadžbe)")) return list;
      if (imaDf) {
        need(s.zbroj == null, "zbroj ide samo uz jednadzbe");
        const r = provjeriReakciju(s.reakcija, "reakcija");
        if (!r) return list;
        need(r.formule, "hess traži tvari sa stanjima");
        for (const f of ["H0", "Ea", "Ea_kat", "stupnjevi"]) need(s.reakcija[f] == null, `reakcija.${f} ne ide uz hess`);
        if (s.koraci != null) need(typeof s.koraci === "boolean", "koraci je true ili false");
      } else {
        need(s.koraci == null, "koraci ide samo uz reakcija.dfH");
        for (const f of Object.keys(s.reakcija)) need(["reaktanti", "produkti", "dH"].includes(f), `uz jednadzbe reakcija ima samo reaktanti, produkti i dH? (ne „${f}“)`);
        if (!need(Array.isArray(s.jednadzbe) && s.jednadzbe.length >= 2 && s.jednadzbe.length <= 4, "jednadzbe je popis od 2 do 4 jednadžbe {reaktanti, produkti, dH}")) return list;
        if (list.length) return list;
        const h = hessOd(s);
        if (!need(!h.greska, h.greska)) return list;
        if (s.reakcija.dH != null) {
          const b = brojOd(s.reakcija.dH);
          need(b && isti(b.v, h.dH), `reakcija.dH se ne slaže s jednadžbama (iz njih ΔrH = ${sPredznakom(h.dH)})`);
        }
        if (s.zbroj != null) need(typeof s.zbroj === "boolean", "zbroj je true ili false");
        s.jednadzbe.forEach((j, i) => {
          if (j?.dH && typeof j.dH === "object" && "zapis" in j.dH) need(isText(j.dH.zapis) && zapisZadanog(j.dH.zapis, j.dH.vrijednost), `jednadzbe[${i}].dH.zapis mora biti isti broj kao vrijednost`);
        });
      }
      if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis {vrijednost, poruka}") && !list.length) {
        const t = tocanDH(s);
        s.krivo.forEach((k, i) => {
          need(isNum(k?.vrijednost) && isText(k?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
          if (isNum(k?.vrijednost)) need(!isti(k.vrijednost, t), `krivo[${i}].vrijednost je točan odgovor`);
        });
      }
      return list;
    }

    // ocitaj, slozi
    if (!need(s.reakcija != null, `${s.nacin} treba reakcija`)) return list;
    const r = provjeriReakciju(s.reakcija, "reakcija");
    if (!r) return list;
    need(s.reakcija.dfH == null, `reakcija.dfH ide uz istrazi ili hess, ne uz ${s.nacin}`);
    if (s.nacin === "slozi") return list;

    need(r.dH.v != null, "ocitaj treba brojčani dH");
    need(!r.stupnjevi, "ocitaj ide uz jednostavnu reakciju (bez stupnjeva)");
    if (list.length) return list;
    const tr = traziOd(s);
    const zad = zadanoOd(s);
    if (!need(tr.length >= 1 && tr.length <= 3, `trazi je popis od 1 do 3 veličine: ${VELICINE.join(", ")}`)) return list;
    need(new Set(tr).size === tr.length, "trazi: veličina se ne ponavlja");
    tr.forEach((t, i) => need(VELICINE.includes(t), `trazi[${i}]: „${t}“ nije jedna od ${VELICINE.join(", ")}`));
    need(Array.isArray(zad) && zad.length >= 1 && zad.every((z) => z === "razine" || VELICINE.includes(z)), `zadano je ["razine"] ili popis veličina (${VELICINE.slice(0, 5).join(", ")})`);
    need(!zad.includes("snizenje"), "zadano: sniženje se ne crta strelicom (zadaj Ea i Ea_kat)");
    if (list.length) return list;
    const q = velicine(r);
    for (const t of [...tr, ...zad.filter((z) => z !== "razine")]) need(q[t] != null, `${t} traži ${/kat|snizenje/.test(t) ? "Ea i Ea_kat" : "Ea"} u reakciji`);
    tr.forEach((t) => need(!zad.includes(t), `${t} je zadan na dijagramu, pa se ne može tražiti`));
    if (list.length) return list;
    need(rjesivo(zad, tr), `iz zadanoga (${zad.join(", ")}) ne može se izračunati ${tr.join(", ")}`);
    if (s.strelice != null) need(typeof s.strelice === "boolean", "strelice je true ili false");
    if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis {korak?, vrijednost, poruka}")) {
      s.krivo.forEach((k, i) => {
        const j = k?.korak ?? tr.length - 1;
        if (!need(Number.isInteger(j) && j >= 0 && j < tr.length, `krivo[${i}].korak je indeks iz trazi`)) return;
        need(isNum(k?.vrijednost) && isText(k?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
        if (isNum(k?.vrijednost)) need(!isti(k.vrijednost, q[tr[j]]), `krivo[${i}].vrijednost je točan odgovor`);
      });
    }
    return list;
  },

  // hess: {dH, sP?, sR?, elementi?: {kljuc: upis}} ili {obrni: [bool], faktori: [broj], dH};
  // ocitaj: [upis po koraku]; slozi: {razine: [mjesto], vrhovi: [mjesto]}
  check(s, odgovor) {
    const jed = jedinicaOd(s);
    if (s.nacin === "hess") {
      if (s.jednadzbe) return provjeriKombinaciju(s, odgovor ?? {});
      return provjeriStvaranje(s, odgovor ?? {});
    }
    if (s.nacin === "ocitaj") {
      const r = reakcijaOd(s.reakcija);
      const q = velicine(r);
      const tr = traziOd(s);
      const unosi = [].concat(odgovor ?? []);
      for (let i = 0; i < tr.length; i++) {
        const k = tr[i];
        const tocna = q[k];
        const n = parseNumber(String(unosi[i] ?? ""), jed);
        if (isNum(n) && k !== "dH" && n < 0 && !isti(n, tocna)) return { tocno: false, poruka: `${tr.length > 1 ? `${oznakaKoraka(k)}: ` : ""}Energija aktivacije je uvijek pozitivna: vrh je iznad razine od koje se kreće.`, praznina: i };
        const krivo = [...kriveOcitanja(s, r, k), ...(s.krivo ?? []).filter((x) => (x.korak ?? tr.length - 1) === i)];
        const res = checkNumber({ input: unosi[i] ?? "", answer: tocna, tol: tolE(tocna), unit: jed, krivo, savjet: savjetOcitanja(k) });
        if (!res.tocno) return { ...res, praznina: i, poruka: tr.length > 1 && !res.prazno ? `${oznakaKoraka(k)}: ${res.poruka}` : res.poruka };
      }
      return { tocno: true };
    }
    if (s.nacin === "slozi") {
      const r = reakcijaOd(s.reakcija);
      const rz = razine(r);
      const poz = [0, ...[].concat(odgovor?.razine ?? [])].map(Number);
      const vr = [].concat(odgovor?.vrhovi ?? []).map(Number);
      const { razina, vrhova } = slaganjeOd(r);
      if (poz.length !== razina + 1 || poz.some((x) => !Number.isFinite(x)) || vr.length !== vrhova) return { tocno: false, poruka: "Postavi sve razine.", prazno: true };
      for (let i = 1; i < rz.length; i++) {
        const znak = Math.sign(rz[i].H - rz[i - 1].H);
        const d = poz[i] - poz[i - 1];
        const ime = rz[i].stupanj?.oznaka ? `${velikoSlovo(rz[i].stupanj.oznaka)}` : "Reakcija";
        if (d === 0) return { tocno: false, poruka: `Razine „${rz[i].oznaka}“ i „${rz[i - 1].oznaka}“ ne mogu biti na istoj visini: ΔH ${rz[i].stupanj?.oznaka ? `${genitivStupnja(rz[i].stupanj.oznaka)} ` : ""}nije 0.`, krivaRazina: i };
        if (Math.sign(d) !== znak) return { tocno: false, poruka: `${ime} je ${znak > 0 ? "endotermn" : "egzotermn"}${ime === "Reakcija" ? "a" : rodSufiks(ime)} (ΔH ${znak > 0 ? "> 0" : "< 0"}), pa razina „${rz[i].oznaka}“ ide ${znak > 0 ? "iznad" : "ispod"} razine „${rz[i - 1].oznaka}“.`, krivaRazina: i };
      }
      if (rz.length > 2) {
        const znak = r.dH.znak;
        const d = poz[rz.length - 1] - poz[0];
        if (d === 0 || Math.sign(d) !== znak) return { tocno: false, poruka: `Ukupno je ΔrH ${znak > 0 ? "pozitivna (endotermno)" : "negativna (egzotermno)"}, pa razina „${r.produkti}“ ide ${znak > 0 ? "iznad" : "ispod"} razine „${r.reaktanti}“.`, krivaRazina: rz.length - 1 };
      }
      if (vrhova) {
        const top = Math.max(poz[0], poz[poz.length - 1]);
        if (vr.some((v) => !(v > top))) return { tocno: false, poruka: "Vrh (prijelazno stanje) mora biti iznad i reaktanata i produkata.", krivVrh: vr.findIndex((v) => !(v > top)) };
        if (vrhova === 2 && !(vr[1] < vr[0])) return { tocno: false, poruka: "Katalizator snizuje energiju aktivacije: vrh s katalizatorom mora biti niži od vrha bez katalizatora. Razine reaktanata i produkata ostaju iste.", krivVrh: 1 };
      }
      return { tocno: true };
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  brojcaniOdgovor(s) {
    if (s.nacin === "hess") {
      const v = tocanDH(s);
      return isNum(v) ? okrugli(v) : null;
    }
    if (s.nacin === "ocitaj") {
      const r = reakcijaOd(s.reakcija);
      if (r.greska) return null;
      const v = velicine(r)[traziOd(s).at(-1)];
      return isNum(v) ? okrugli(v) : null;
    }
    return null;
  },

  tocanOdgovor(s) {
    const jed = jedinicaOd(s);
    if (s.nacin === "hess") {
      if (s.jednadzbe) {
        const h = hessOd(s);
        if (h.greska) return "";
        const opis = h.J.map((j, i) => `jednadžba ${i + 1} ${[h.obrni[i] && "obrnuta", h.faktori[i] !== 1 && `pomnožena s ${koefZapis(h.faktori[i])}`].filter(Boolean).join(" i ") || "kako piše"}`);
        const clan = (j, i) => {
          const f = (h.obrni[i] ? -1 : 1) * h.faktori[i];
          const v = f * j.dH.v;
          return h.faktori[i] !== 1 ? `${koefZapis(h.faktori[i])} · (${sPredznakom((h.obrni[i] ? -1 : 1) * j.dH.v)})` : `(${sPredznakom(v)})`;
        };
        return `${velikoSlovo(lista(opis))}; ΔrH = ${h.J.map(clan).join(" + ")} = ${sPredznakom(h.dH)} ${jed}`;
      }
      const r = reakcijaOd(s.reakcija);
      if (r.greska) return "";
      const st = stvaranjeOd(r);
      const zbroj = (F) => {
        const cl = F.filter((c) => !jeElementarna(c)).map((c) => `${c.koef !== 1 ? `${koefZapis(c.koef)} · ` : ""}(${zapisB(r.dfH[c.kljuc])})`);
        return cl.length ? cl.join(" + ") : "0";
      };
      return `ΔrH = [${zbroj(r.D)}] − [${zbroj(r.L)}] = ${sPredznakom(st.sP)} − (${sPredznakom(st.sR)}) = ${sPredznakom(st.dH)} ${jed}`;
    }
    if (s.nacin === "ocitaj") {
      const r = reakcijaOd(s.reakcija);
      if (r.greska) return "";
      return traziOd(s)
        .map((k) => `${oznakaKoraka(k)} = ${zapisVelicine(r, k)} ${jed}`)
        .join(" → ");
    }
    if (s.nacin === "slozi") {
      const r = reakcijaOd(s.reakcija);
      if (r.greska) return "";
      const rz = razine(r);
      const dio = [];
      for (let i = 1; i < rz.length; i++) dio.push(`razina „${rz[i].oznaka}“ ${rz[i].H > rz[i - 1].H ? "iznad" : "ispod"} razine „${rz[i - 1].oznaka}“${rz[i].stupanj ? ` (${rz[i].stupanj.oznaka ?? "stupanj"} ${zapisB(rz[i].stupanj.dH)} ${jed})` : r.dH.v != null ? ` (ΔrH = ${zapisVelicine(r, "dH")} ${jed})` : ` (ΔrH ${r.dH.znak > 0 ? "> 0" : "< 0"})`}`);
      if (r.Ea) dio.push(`vrh iznad obiju razina${r.Ea_kat ? ", a vrh s katalizatorom niži od vrha bez katalizatora" : ""}`);
      return `${velikoSlovo(dio.join("; "))}.`;
    }
    return "";
  },
};

// ── pomoćno za provjeru ──
const velikoSlovo = (t) => t.charAt(0).toUpperCase() + t.slice(1);
// „razaranje“ → „razaranja“, „hidratacija“ → „hidratacije“
const genitivStupnja = (t) => t.replace(/(\S+)$/, (w) => (w.endsWith("a") ? w.slice(0, -1) + "e" : w.endsWith("e") ? w.slice(0, -1) + "a" : w));
// „Razaranje je endotermno“, „Hidratacija je egzotermna“, „Isparavanje …“
const rodSufiks = (ime) => (/a$/.test(ime.split(" ")[0]) ? "a" : /e$/.test(ime.split(" ")[0]) ? "o" : "a");
export const oznakaKoraka = (k) => ({ Ea: "Eₐ", dH: "ΔrH", Ea_povratne: "Eₐ povratne reakcije", Ea_kat: "Eₐ s katalizatorom", Ea_kat_povratne: "Eₐ povratne s katalizatorom", snizenje: "Sniženje Eₐ" })[k];
const savjetOcitanja = (k) =>
  ({
    Ea: "Eₐ je razlika između vrha i razine reaktanata.",
    dH: "ΔrH je razlika: razina produkata minus razina reaktanata.",
    Ea_povratne: "Povratna reakcija kreće od produkata: Eₐ(povratne) je razlika između vrha i razine produkata.",
    Ea_kat: "S katalizatorom je vrh niži: Eₐ je razlika između tog vrha i razine reaktanata.",
    Ea_kat_povratne: "Povratna reakcija kreće od produkata do nižeg vrha.",
    snizenje: "Sniženje je razlika energija aktivacije bez katalizatora i s katalizatorom.",
  })[k];

function tocanDH(s) {
  if (s.jednadzbe) {
    const h = hessOd(s);
    return h.greska ? null : h.dH;
  }
  const r = reakcijaOd(s.reakcija);
  return r.greska ? null : stvaranjeOd(r).dH;
}

function provjeriStvaranje(s, o) {
  const jed = jedinicaOd(s);
  const r = reakcijaOd(s.reakcija);
  const st = stvaranjeOd(r);
  const broj = (x) => parseNumber(String(x ?? ""), jed);
  if (s.koraci) {
    const el = tvariStvaranja(r).filter((x) => x.elementarna);
    for (const x of el) {
      const n = broj(o.elementi?.[x.tvar.kljuc]);
      if (n == null) return { tocno: false, poruka: "Upiši sve vrijednosti.", prazno: true, polje: `el:${x.tvar.kljuc}` };
      if (Math.abs(n) > 1e-9) return { tocno: false, poruka: `${zapisTvari(x.tvar)} je elementarna tvar u standardnom stanju, pa je njezina ΔfH = 0.`, polje: `el:${x.tvar.kljuc}` };
    }
    const korak = (kljuc, tocna, bez, druga, ime) => {
      const krivo = [];
      if (!isti(bez, tocna)) krivo.push({ vrijednost: bez, poruka: `Svaku ΔfH pomnoži s koeficijentom te tvari u jednadžbi (broj molova).` });
      if (!isti(druga, tocna)) krivo.push({ vrijednost: druga, poruka: `To je zbroj za ${ime === "produkti" ? "reaktante" : "produkte"}. Ovdje se zbrajaju ${ime}.` });
      const res = checkNumber({ input: o[kljuc] ?? "", answer: tocna, tol: tolE(tocna), unit: jed, krivo, savjet: `Zbroji ΔfH ${ime === "produkti" ? "produkata" : "reaktanata"}, svaku pomnoženu koeficijentom; elementarne tvari daju 0.` });
      return res.tocno ? null : { ...res, polje: kljuc };
    };
    const a = korak("sP", st.sP, st.sP1, st.sR, "produkti");
    if (a) return a;
    const b = korak("sR", st.sR, st.sR1, st.sP, "reaktanti");
    if (b) return b;
  }
  const krivo = [
    { vrijednost: st.sR - st.sP, poruka: "Zamijenjeni su produkti i reaktanti: ΔrH = Σν·ΔfH(produkti) − Σν·ΔfH(reaktanti)." },
    { vrijednost: st.sP1 - st.sR1, poruka: "Nisi pomnožio s koeficijentima: svaku ΔfH pomnoži s brojem molova te tvari u jednadžbi." },
    { vrijednost: st.sP + st.sR, poruka: "Zbroj za reaktante se oduzima od zbroja za produkte, a ne dodaje." },
    ...(Math.abs(st.sR) > 1e-9 ? [{ vrijednost: st.sP, poruka: "To je samo zbroj za produkte: od njega oduzmi zbroj za reaktante." }, { vrijednost: -st.sR, poruka: "Nedostaje zbroj za produkte." }] : []),
    ...(s.krivo ?? []),
  ].filter((k, i, a) => !isti(k.vrijednost, st.dH) && a.findIndex((y) => isti(y.vrijednost, k.vrijednost)) === i);
  const res = checkNumber({ input: o.dH ?? "", answer: st.dH, tol: tolE(st.dH), unit: jed, krivo, savjet: "Od zbroja ΔfH produkata oduzmi zbroj ΔfH reaktanata (svaku pomnoženu koeficijentom)." });
  return res.tocno ? res : { ...res, polje: "dH" };
}

function provjeriKombinaciju(s, o) {
  const jed = jedinicaOd(s);
  const h = hessOd(s);
  const n = h.J.length;
  const obrni = Array.from({ length: n }, (_, i) => !!o.obrni?.[i]);
  const faktori = Array.from({ length: n }, (_, i) => Number(o.faktori?.[i] ?? 1));
  if (faktori.some((f) => !(f > 0))) return { tocno: false, poruka: "Odaberi faktor za svaku jednadžbu.", prazno: true };
  const v = zbrojKombinacije(h, obrni, faktori);
  const u = (k) => [...h.r.L, ...h.r.D].some((c) => c.kljuc === k);
  const kljucevi = [...h.kljucevi.filter(u), ...h.kljucevi.filter((k) => !u(k))];
  const uJ = (k) => h.J.map((j, i) => (vektor(j.L, j.D)[k] ? i : -1)).filter((i) => i >= 0);
  const krive = kljucevi.filter((k) => Math.abs((h.cilj[k] ?? 0) - (v[k] ?? 0)) >= 1e-9);
  // najprije tvar koja je samo u jednoj jednadžbi: poruka tada kaže baš koju jednadžbu promijeniti
  const k = krive.find((x) => uJ(x).length === 1) ?? krive[0];
  if (k) {
    const t = h.cilj[k] ?? 0;
    const x = v[k] ?? 0;
    const tvar = tvarKljuca(h, k);
    const sJ = uJ(k);
    const koja = sJ.length === 1 ? `jednadžbu ${sJ[0] + 1}` : "jednadžbu u kojoj se pojavljuje";
    const strana = (z) => (z < 0 ? "lijevoj strani" : "desnoj strani");
    let poruka;
    if (t === 0) poruka = `${tvar} se u zbroju ne pokrati: ostane ${koefZapis(Math.abs(x))} mol na ${strana(x)}. Promijeni faktor ili smjer jednadžbi u kojima se pojavljuje.`;
    else if (Math.abs(x) < 1e-9) poruka = `${tvar} se u tvom zbroju pokratio, a u traženoj jednadžbi je na ${strana(t)}.`;
    else if (Math.sign(x) !== Math.sign(t)) poruka = `${tvar} je u traženoj jednadžbi na ${strana(t)}, a u tvom zbroju na ${strana(x)}: obrni ${koja}.`;
    else poruka = `${tvar}: u traženoj jednadžbi ${koefZapis(Math.abs(t))} mol, a u tvom zbroju ${koefZapis(Math.abs(x))} mol. Pomnoži ${koja} drugim brojem.`;
    return { tocno: false, poruka, kombinacija: true, jednadzba: sJ.length === 1 ? sJ[0] : null };
  }
  const zn = (i) => (h.obrni[i] ? -1 : 1);
  const krivo = [
    { vrijednost: h.J.reduce((a, j, i) => a + h.faktori[i] * j.dH.v, 0), poruka: "Kad obrneš jednadžbu, njezin ΔH mijenja predznak." },
    { vrijednost: h.J.reduce((a, j, i) => a + zn(i) * j.dH.v, 0), poruka: "Kad jednadžbu pomnožiš nekim brojem, istim brojem pomnoži i njezin ΔH." },
    { vrijednost: h.J.reduce((a, j) => a + j.dH.v, 0), poruka: "Obrnutoj jednadžbi promijeni predznak ΔH, a pomnoženoj pomnoži ΔH istim brojem." },
    { vrijednost: -h.dH, poruka: "Predznak nije dobar: zbroji ΔH preinačenih jednadžbi, svaki sa svojim predznakom." },
    ...(s.krivo ?? []),
  ].filter((k, i, a) => !isti(k.vrijednost, h.dH) && a.findIndex((y) => isti(y.vrijednost, k.vrijednost)) === i);
  const res = checkNumber({ input: o.dH ?? "", answer: h.dH, tol: tolE(h.dH), unit: jed, krivo, savjet: "Jednadžbe su dobro odabrane. Zbroji njihove ΔH: obrnutoj promijeni predznak, pomnoženu pomnoži istim brojem." });
  return res.tocno ? res : { ...res, polje: "dH" };
}
