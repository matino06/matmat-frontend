// otopina: priprema otopine u odmjernoj tikvici (lekcija 006 „Sastav otopina i razrjeđivanje“, pokus 5 ispitnog
// kataloga: otapanje čvrste tvari i razrjeđivanje). Veličine sastava (m, n, c, V, γ, w, m(otopine), m(vode), ρ,
// molalnost b, koncentracija čestica) povezane su pravilima; svaki korak lanca računa se iz već poznatih veličina, kao
// u mol_racun. Prijelazi m ↔ n (M iz Ar s lista) i n ↔ c (V otopine) idu kroz mol_racun (njegov lanac i njegove poruke
// za tipične greške), a ovdje su samo pravila za sastav otopine: maseni udio, masena koncentracija, gustoća,
// razrjeđivanje c₁V₁ = c₂V₂, miješanje dviju otopina i broj čestica elektrolita (ioni iz speca, provjereni atomima i
// nabojem). Tipične krive vrijednosti (zamijenjene koncentracije ili volumeni, masa vode umjesto otopine, w u %
// uvršten kao broj, g/cm³ uz dm³, zaboravljen broj iona, volumen dodane vode umjesto polazne otopine …) računa kod.
// Način „postupak“: redoslijed koraka pripreme iz pokusa 5 (koraci su u kodu, autor ih ne piše).
import { isNum, parseNumber, formatNumber, formatSci, near } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { atomiOd, nabojOd, molarnaMasa } from "./_tablice.js";
import { mol_racun, lanac as molLanac, JEDINICE as MJ, normJedinica, formulaZapis } from "./mol_racun.js";

export const NACINI = ["istrazi", "izracunaj", "postupak"];
export const VRSTE = ["otapanje", "razrjedivanje", "mijesanje"];

// ── veličine ──
// jed: jedinica → faktor prema osnovnoj (g, mol, mol/dm³, dm³, g/dm³, udio, g/dm³, mol/kg); osn: zadana jedinica
// kad je autor ne napiše; druge: jedinice za poruku „isti iznos u drugoj jedinici“.
const GUSTOCA = {
  "g/cm³": 1000,
  "g cm⁻³": 1000,
  "g/mL": 1000,
  "g mL⁻¹": 1000,
  "kg/dm³": 1000,
  "kg dm⁻³": 1000,
  "kg/L": 1000,
  "g/dm³": 1,
  "g dm⁻³": 1,
  "g/L": 1,
  "g L⁻¹": 1,
  "kg/m³": 1,
  "kg m⁻³": 1,
};
export const VELICINE = {
  m: { ime: "masa otopljene tvari", sim: "m", tvar: true, jed: MJ.m, osn: "g", druge: ["g", "kg", "mg"] },
  n: { ime: "množina otopljene tvari", sim: "n", tvar: true, jed: MJ.n, osn: "mol", druge: ["mol", "mmol"] },
  c: { ime: "množinska koncentracija", sim: "c", tvar: true, jed: MJ.c, osn: "mol/dm³", druge: ["mol/dm³", "mmol/dm³"] },
  V: { ime: "volumen otopine", sim: "V", jed: MJ.V, osn: "mL", druge: ["L", "mL"] },
  gama: { ime: "masena koncentracija", sim: "γ", tvar: true, jed: { ...GUSTOCA, "mg/mL": 1, "mg/L": 0.001, "mg/dm³": 0.001 }, osn: "g/dm³", druge: ["g/dm³", "g/cm³"] },
  w: { ime: "maseni udio", sim: "w", tvar: true, jed: { "%": 0.01, "": 1 }, osn: "%", druge: ["%", ""] },
  m_otopine: { ime: "masa otopine", sim: "m", zagrada: "otopine", jed: MJ.m, osn: "g", druge: ["g", "kg"] },
  m_vode: { ime: "masa vode (otapala)", sim: "m", zagrada: "vode", jed: MJ.m, osn: "g", druge: ["g", "kg"] },
  rho: { ime: "gustoća otopine", sim: "ρ", jed: GUSTOCA, osn: "g/cm³", druge: ["g/cm³", "g/dm³"] },
  b: { ime: "molalnost", sim: "b", tvar: true, jed: { "mol/kg": 1, "mol kg⁻¹": 1, "mmol/kg": 0.001 }, osn: "mol/kg", druge: ["mol/kg", "mmol/kg"] },
  c_cestica: { ime: "koncentracija otopljenih čestica", sim: "c", zagrada: "čestica", jed: MJ.c, osn: "mol/dm³", druge: ["mol/dm³", "mmol/dm³"] },
  m_dodane_vode: { ime: "masa dodane vode", sim: "m", zagrada: "dodane vode", jed: MJ.m, osn: "g", druge: ["g", "kg"] },
};
const PO_OTOPINI = ["c", "V", "gama", "w", "m_otopine", "m_vode", "rho", "b", "c_cestica"];
const KLJUC = /^(m_otopine|m_vode|m_dodane_vode|c_cestica|gama|rho|m|n|c|V|w|b)([12]?)$/;
const IND = { 1: "₁", 2: "₂", "": "" };

// „γ₁“, „rho1“, „c₂“ → {baza, ind}; null ako veličina ne postoji
export function rastavi(kljuc) {
  const t = String(kljuc ?? "")
    .trim()
    .replace(/^γ/, "gama")
    .replace(/^ρ/, "rho")
    .replace(/₁$/, "1")
    .replace(/₂$/, "2");
  const m = KLJUC.exec(t);
  return m ? { baza: m[1], ind: m[2] } : null;
}
export const kanon = (k) => {
  const r = rastavi(k);
  return r ? r.baza + r.ind : String(k ?? "");
};
const vel = (k) => VELICINE[rastavi(k)?.baza];
export const faktor = (k, u) => vel(k)?.jed[u];
const normJ = (k, u) => (u == null ? (vel(k)?.osn ?? "") : normJedinica("x", u));

export const vrstaOf = (s) => (VRSTE.includes(s?.vrsta) ? s.vrsta : "otapanje");
export function dopusteni(vrsta) {
  if (vrsta === "razrjedivanje") return ["m", "n", "m_dodane_vode", ...["1", "2"].flatMap((i) => PO_OTOPINI.map((b) => b + i))];
  if (vrsta === "mijesanje") return ["", "1", "2"].flatMap((i) => ["m", "n", ...PO_OTOPINI].map((b) => b + i));
  return ["m", "n", ...PO_OTOPINI];
}

// Oznaka veličine: „c(NaCl)“, „V₁“, „m₂(otopine)“, „m(tvari)“; kratko (za formule): „c“, „V₁“, „m(otopine)“.
export function oznaka(k, s, kratko = false) {
  const r = rastavi(k);
  if (!r) return String(k);
  const v = VELICINE[r.baza];
  const X = s?.tvar ? formulaZapis(s.tvar) : null;
  let z = v.zagrada ?? null;
  if (!z && v.tvar && !kratko && !r.ind) z = X ?? (r.baza === "m" ? "tvari" : null);
  // otopina hidrata (CuSO₄·5H₂O) je otopina bezvodne soli: c(CuSO₄), a masa i množina ostaju hidrata
  if (z && z === X && r.baza === "c" && /·/.test(z)) z = z.split("·")[0];
  return `${v.sim}${IND[r.ind]}${z ? `(${z})` : ""}`;
}
const DIO = {
  razrjedivanje: { 1: "polazne otopine", 2: "razrijeđene otopine" },
  mijesanje: { 1: "prve otopine", 2: "druge otopine", "": "nakon miješanja" },
};
export function imeOf(k, s) {
  const r = rastavi(k);
  if (!r) return "";
  const d = DIO[vrstaOf(s)]?.[r.ind];
  const ime = VELICINE[r.baza].ime;
  if (!d) return ime;
  if (/otopine$/.test(ime) && d.endsWith("otopine")) return ime.replace(/otopine$/, d);
  return `${ime} ${d}`;
}

// ── spec → podaci ──
export const zadaniOf = (s) =>
  []
    .concat(s?.zadano ?? [])
    .map((z) => {
      const k = kanon(z?.velicina);
      return { velicina: k, vrijednost: z?.vrijednost, zapis: z?.zapis, jedinica: normJ(k, z?.jedinica), pretpostavka: z?.pretpostavka === true };
    });
export const traziOf = (s) =>
  []
    .concat(s?.trazi ?? [])
    .map((t) => {
      const k = kanon(typeof t === "string" ? t : t?.velicina);
      return { velicina: k, jedinica: normJ(k, typeof t === "object" ? t?.jedinica : null), oznaka: typeof t === "object" && isText(t?.oznaka) ? t.oznaka : null };
    });
export const Mof = (s) => (isNum(s?.M) ? s.M : s?.tvar ? molarnaMasa(s.tvar) : null);
// broj čestica po formulskoj jedinki: zbroj iona iz speca; neelektrolit 1; null ako se ne zna
export function cesticeOf(s) {
  if (Array.isArray(s?.ioni)) return s.ioni.reduce((z, x) => z + (isNum(x?.broj) ? x.broj : 1), 0);
  if (s?.elektrolit === false) return 1;
  return null;
}
const ioniZapis = (s) => (s.ioni ?? []).map((x) => `${(x.broj ?? 1) > 1 ? `${x.broj} ` : ""}${x.ion}`).join(" i ");

// prikaz izračunatog broja: tri značajne znamenke s nulama na kraju („9,00“, „0,100“), od 100 naviše cijeli broj
export function zapisBroja(v) {
  if (!isNum(v)) return "—";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e6 || a < 1e-3) return formatSci(v);
  if (a >= 100) return formatNumber(Math.round(v));
  return v.toPrecision(3).replace(".", ",").replace("-", "−");
}
export const sJedinicom = (v, u) => `${zapisBroja(v)}${u ? ` ${u}` : ""}`;
export const zapisZadanog = (z) => `${z.zapis ?? formatNumber(z.vrijednost)}${z.jedinica ? ` ${z.jedinica}` : ""}`;

// ── pravila ──
// {daje, iz, formula, f(k) → osnovna vrijednost, mol?: {od, do, iz, V?}, krive?(k) → [{osnovna, poruka}]}
// k: poznate veličine u osnovnim jedinicama (+ M).
const UDIO = "Maseni udio uvrsti kao broj: postotak podijeli sa 100 (9 % = 0,09).";
function pravilaOf(s) {
  const vrsta = vrstaOf(s);
  const i = cesticeOf(s);
  const out = [];
  const dodaj = (p) => {
    if (!out.some((q) => q.daje === p.daje && q.iz.join() === p.iz.join())) out.push(p);
  };
  const otopine = vrsta === "razrjedivanje" ? ["1", "2"] : vrsta === "mijesanje" ? ["1", "2", ""] : [""];
  const tv = (b, S) => (vrsta === "razrjedivanje" ? b : b + S);
  const o = (k) => oznaka(k, s, true);

  // 1) m ↔ n ↔ c kroz mol_racun
  for (const S of otopine) {
    const m = tv("m", S);
    const n = tv("n", S);
    const c = "c" + S;
    const V = "V" + S;
    const molP = (daje, iz, mol, formula) => {
      const p = { daje, iz, mol, formula };
      p.f = (k) => molVrijednost(s, p, k);
      dodaj(p);
    };
    molP(n, [m, "M"], { od: "m", do: "n", iz: m }, `${o(n)} = ${o(m)} : M`);
    molP(m, [n, "M"], { od: "n", do: "m", iz: n }, `${o(m)} = ${o(n)} · M`);
    molP(n, [c, V], { od: "c", do: "n", iz: c, V }, `${o(n)} = ${o(c)} · ${o(V)}`);
    molP(c, [n, V], { od: "n", do: "c", iz: n, V }, `${o(c)} = ${o(n)} : ${o(V)}`);
  }

  // 2) sastav jedne otopine
  for (const S of otopine) {
    const [m, n] = [tv("m", S), tv("n", S)];
    const [c, V, g, w, mo, mv, r, b, cc] = PO_OTOPINI.map((x) => x + S);
    const [om, on, oc, oV, og, ow, omo, omv, or] = [m, n, c, V, g, w, mo, mv, r].map(o);
    dodaj({
      daje: V,
      iz: [n, c],
      formula: `${oV} = ${on} : ${oc}`,
      f: (k) => k[n] / k[c],
      krive: (k) => [
        { osnovna: k[n] * k[c], poruka: `Množina je pomnožena koncentracijom. Volumen je ${oV} = ${on} : ${oc}.` },
        { osnovna: k[c] / k[n], poruka: "Omjer je obrnut: volumen je množina podijeljena koncentracijom." },
      ],
    });
    // masena koncentracija
    dodaj({ daje: m, iz: [g, V], formula: `${om} = ${og} · ${oV}`, f: (k) => k[g] * k[V], krive: (k) => [{ osnovna: k[g] / k[V], poruka: `Masena koncentracija je podijeljena volumenom. Masa tvari je ${om} = ${og} · ${oV}.` }] });
    dodaj({
      daje: g,
      iz: [m, V],
      formula: `${og} = ${om} : ${oV}`,
      f: (k) => k[m] / k[V],
      krive: (k) => [
        { osnovna: k[m] * k[V], poruka: `Masa je pomnožena volumenom. Masena koncentracija je ${og} = ${om} : ${oV}.` },
        { osnovna: k[V] / k[m], poruka: "Omjer je obrnut: masena koncentracija je masa tvari podijeljena volumenom otopine." },
        ...(isNum(k[mv]) ? [{ osnovna: k[m] / (k[mv] / 1000), poruka: "Za volumen je uzet volumen vode. Volumen otopine nije isti: izračunaj ga iz mase otopine i gustoće." }] : []),
        ...(isNum(k[mo]) ? [{ osnovna: k[m] / (k[mo] / 1000), poruka: "Masa otopine nije njezin volumen: volumen je masa otopine podijeljena gustoćom." }] : []),
      ],
    });
    dodaj({ daje: V, iz: [m, g], formula: `${oV} = ${om} : ${og}`, f: (k) => k[m] / k[g], krive: (k) => [{ osnovna: k[m] * k[g], poruka: `Masa je pomnožena masenom koncentracijom. Volumen je ${oV} = ${om} : ${og}.` }] });
    dodaj({ daje: g, iz: [c, "M"], formula: `${og} = ${oc} · M`, f: (k) => k[c] * k.M, krive: (k) => [{ osnovna: k[c] / k.M, poruka: `Koncentracija je podijeljena s M. Masena koncentracija je ${og} = ${oc} · M.` }] });
    dodaj({ daje: c, iz: [g, "M"], formula: `${oc} = ${og} : M`, f: (k) => k[g] / k.M, krive: (k) => [{ osnovna: k[g] * k.M, poruka: `Masena koncentracija je pomnožena s M. Množinska koncentracija je ${oc} = ${og} : M.` }] });
    // gustoća
    // krive vrijednosti u g, g/cm³ i cm³ (tako ih učenik računa): ρc = ρ u g/cm³, Vc = V u cm³
    const rc = (k) => k[r] / 1000;
    const Vc = (k) => k[V] * 1000;
    dodaj({ daje: mo, iz: [r, V], formula: `${omo} = ${or} · ${oV}`, f: (k) => k[r] * k[V], krive: (k) => [{ osnovna: Vc(k) / rc(k), poruka: `Volumen je podijeljen gustoćom. Masa otopine je ${omo} = ${or} · ${oV}.` }, { osnovna: rc(k) / Vc(k), poruka: `Gustoća je podijeljena volumenom. Masa otopine je ${omo} = ${or} · ${oV}.` }] });
    dodaj({ daje: V, iz: [mo, r], formula: `${oV} = ${omo} : ${or}`, f: (k) => k[mo] / k[r], krive: (k) => [{ osnovna: (k[mo] * rc(k)) / 1000, poruka: `Masa je pomnožena gustoćom. Volumen je ${oV} = ${omo} : ${or}.` }, { osnovna: rc(k) / k[mo] / 1000, poruka: "Omjer je obrnut: volumen je masa otopine podijeljena gustoćom." }] });
    dodaj({ daje: r, iz: [mo, V], formula: `${or} = ${omo} : ${oV}`, f: (k) => k[mo] / k[V], krive: (k) => [{ osnovna: (Vc(k) / k[mo]) * 1000, poruka: "Omjer je obrnut: gustoća je masa otopine podijeljena volumenom." }, { osnovna: k[mo] * Vc(k) * 1000, poruka: `Masa je pomnožena volumenom. Gustoća je ${or} = ${omo} : ${oV}.` }] });
    // maseni udio
    const vodaUmjesto = (k, f, poruka) => (isNum(k[mv]) ? [{ osnovna: f(k[mv]), poruka }] : []);
    dodaj({
      daje: m,
      iz: [w, mo],
      formula: `${om} = ${ow} · ${omo}`,
      f: (k) => k[w] * k[mo],
      krive: (k) => [{ osnovna: k[mo] / k[w], poruka: `Masa otopine je podijeljena masenim udjelom. Masa tvari je ${om} = ${ow} · ${omo}.` }, ...vodaUmjesto(k, (x) => k[w] * x, "Maseni udio je dio mase otopine (voda i tvar zajedno), a ne mase vode.")],
    });
    dodaj({
      daje: mo,
      iz: [m, w],
      formula: `${omo} = ${om} : ${ow}`,
      f: (k) => k[m] / k[w],
      krive: (k) => [
        { osnovna: k[m] * k[w], poruka: `Masa tvari je pomnožena masenim udjelom. Masa otopine je ${omo} = ${om} : ${ow}.` },
        { osnovna: k[m] / k[w] - k[m], poruka: "To je masa vode (otapala). Masa otopine uključuje i otopljenu tvar." },
      ],
    });
    dodaj({
      daje: w,
      iz: [m, mo],
      formula: `${ow} = ${om} : ${omo}`,
      f: (k) => k[m] / k[mo],
      krive: (k) => [{ osnovna: k[mo] / k[m], poruka: "Omjer je obrnut: maseni udio je masa tvari podijeljena masom otopine." }, ...vodaUmjesto(k, (x) => k[m] / x, "Podijeljeno je masom vode, a maseni udio se računa prema masi otopine (voda i tvar zajedno).")],
    });
    // otopina = voda + tvar
    dodaj({ daje: mo, iz: [m, mv], formula: `${omo} = ${om} + ${omv}`, f: (k) => k[m] + k[mv], krive: (k) => [{ osnovna: k[mv] - k[m], poruka: "Masa otopine je zbroj mase vode i mase otopljene tvari." }] });
    dodaj({ daje: mv, iz: [mo, m], formula: `${omv} = ${omo} − ${om}`, f: (k) => k[mo] - k[m], krive: (k) => [{ osnovna: k[mo] + k[m], poruka: "Voda je otopina bez otopljene tvari: masu tvari treba oduzeti od mase otopine." }] });
    dodaj({ daje: m, iz: [mo, mv], formula: `${om} = ${omo} − ${omv}`, f: (k) => k[mo] - k[mv], krive: (k) => [{ osnovna: k[mo] + k[mv], poruka: "Masa tvari je razlika mase otopine i mase vode." }] });
    dodaj({
      daje: m,
      iz: [w, mv],
      formula: `${om} = ${ow} · ${omv} : (1 − ${ow})`,
      f: (k) => (k[w] * k[mv]) / (1 - k[w]),
      krive: (k) => [{ osnovna: k[w] * k[mv], poruka: "Maseni udio je dio mase otopine, a ne vode: u otopini su voda i tvar, pa je masa otopine veća od mase vode." }],
    });
    dodaj({
      daje: w,
      iz: [m, mv],
      formula: `${ow} = ${om} : (${om} + ${omv})`,
      f: (k) => k[m] / (k[m] + k[mv]),
      krive: (k) => [{ osnovna: k[m] / k[mv], poruka: "Podijeljeno je masom vode, a maseni udio se računa prema masi otopine: m(otopine) = m(vode) + m(tvari)." }],
    });
    // izravno iz w i ρ
    dodaj({
      daje: g,
      iz: [w, r],
      formula: `${og} = ${ow} · ${or}`,
      f: (k) => k[w] * k[r],
      krive: (k) => [{ osnovna: k[r] / k[w], poruka: `Gustoća je podijeljena masenim udjelom. Masena koncentracija je ${og} = ${ow} · ${or}.` }],
    });
    dodaj({ daje: w, iz: [g, r], formula: `${ow} = ${og} : ${or}`, f: (k) => k[g] / k[r], krive: (k) => [{ osnovna: k[r] / k[g], poruka: "Omjer je obrnut: maseni udio je masena koncentracija podijeljena gustoćom." }] });
    dodaj({
      daje: c,
      iz: [w, r, "M"],
      formula: `${oc} = ${ow} · ${or} : M`,
      f: (k) => (k[w] * k[r]) / k.M,
      krive: (k) => [{ osnovna: (k[w] * k.M) / k[r], poruka: "Zamislimo 1 dm³ otopine: masa otopine je ρ · V, masa tvari w · m(otopine), a množina masa tvari kroz M." }],
    });
    dodaj({ daje: w, iz: [c, r, "M"], formula: `${ow} = ${oc} · M : ${or}`, f: (k) => (k[c] * k.M) / k[r], krive: (k) => [{ osnovna: k[c] / (k.M * k[r]), poruka: "Zamislimo 1 dm³ otopine: u njoj je c · M grama tvari, a masa otopine je ρ · V." }] });
    // molalnost
    dodaj({
      daje: b,
      iz: [n, mv],
      formula: `${o(b)} = ${on} : ${omv}`,
      f: (k) => k[n] / (k[mv] / 1000),
      krive: (k) => [
        { osnovna: k[n] / k[mv], poruka: "Molalnost je množina po kilogramu otapala: masu vode uvrsti u kilogramima." },
        ...(isNum(k[mo]) ? [{ osnovna: k[n] / (k[mo] / 1000), poruka: "Molalnost se računa prema masi otapala (vode), a ne otopine." }] : []),
      ],
    });
    // čestice
    if (i != null)
      dodaj({
        daje: cc,
        iz: [c],
        formula: `${o(cc)} = ${i} · ${oc}`,
        f: (k) => i * k[c],
        krive: (k) => {
          const out = [];
          const X = s.tvar ? formulaZapis(s.tvar) : "tvar";
          if (i > 1) out.push({ osnovna: k[c], poruka: `${X} je elektrolit: u vodi se raspada na ione (${ioniZapis(s)}), pa je čestica ${i} puta više od formulskih jedinki.` });
          else out.push({ osnovna: 2 * k[c], poruka: `${X} se u vodi ne raspada na ione: jedna molekula je jedna čestica.` });
          if (i > 2) out.push({ osnovna: 2 * k[c], poruka: `Prebroji ione: ${X} daje ${ioniZapis(s)}, to je ${i} iona po formulskoj jedinki.` });
          const a = s.tvar ? atomiOd(s.tvar) : null;
          const atoma = a ? Object.values(a).reduce((z, x) => z + x, 0) : 0;
          if (atoma > i && i > 1) out.push({ osnovna: atoma * k[c], poruka: `Broje se ioni, a ne atomi: ${X} daje ${ioniZapis(s)}.` });
          return out;
        },
      });
  }

  // 3) razrjeđivanje: ista otopljena tvar (m, n) u obje otopine
  if (vrsta === "razrjedivanje") {
    const VOD = "Za vodu koju dodaješ ne treba račun: tikvica se dopunjava do oznake.";
    dodaj({
      daje: "V1",
      iz: ["c2", "V2", "c1"],
      formula: "V₁ = c₂ · V₂ : c₁",
      f: (k) => (k.c2 * k.V2) / k.c1,
      krive: (k) => [
        { osnovna: (k.c1 * k.V2) / k.c2, poruka: "Koncentracije su zamijenjene: polazna otopina je koncentriranija, pa je treba manje od volumena tikvice." },
        { osnovna: k.V2 - (k.c2 * k.V2) / k.c1, poruka: `To je približno volumen vode koju dodaješ, a traži se volumen polazne otopine. ${VOD}` },
      ],
    });
    dodaj({
      daje: "c2",
      iz: ["c1", "V1", "V2"],
      formula: "c₂ = c₁ · V₁ : V₂",
      f: (k) => (k.c1 * k.V1) / k.V2,
      krive: (k) => [
        { osnovna: (k.c1 * k.V2) / k.V1, poruka: "Volumeni su zamijenjeni: razrjeđivanjem koncentracija pada, pa c₂ mora biti manja od c₁." },
        { osnovna: (k.c1 * k.V1) / (k.V1 + k.V2), poruka: "V₂ je volumen gotove otopine (do oznake), a ne volumen dodane vode." },
      ],
    });
    dodaj({
      daje: "V2",
      iz: ["c1", "V1", "c2"],
      formula: "V₂ = c₁ · V₁ : c₂",
      f: (k) => (k.c1 * k.V1) / k.c2,
      krive: (k) => [
        { osnovna: (k.c2 * k.V1) / k.c1, poruka: "Koncentracije su zamijenjene: razrijeđena otopina ima veći volumen od polazne." },
        { osnovna: (k.c1 * k.V1) / k.c2 - k.V1, poruka: "To je volumen vode koju treba dodati, a traži se volumen gotove otopine (do oznake)." },
      ],
    });
    dodaj({
      daje: "c1",
      iz: ["c2", "V2", "V1"],
      formula: "c₁ = c₂ · V₂ : V₁",
      f: (k) => (k.c2 * k.V2) / k.V1,
      krive: (k) => [{ osnovna: (k.c2 * k.V1) / k.V2, poruka: "Volumeni su zamijenjeni: polazna otopina je koncentriranija od razrijeđene." }],
    });
    dodaj({
      daje: "w2",
      iz: ["w1", "m_otopine1", "m_otopine2"],
      formula: "w₂ = w₁ · m₁(otopine) : m₂(otopine)",
      f: (k) => (k.w1 * k.m_otopine1) / k.m_otopine2,
      krive: (k) => [{ osnovna: (k.w1 * k.m_otopine2) / k.m_otopine1, poruka: "Mase otopina su zamijenjene: razrjeđivanjem maseni udio pada." }],
    });
    dodaj({
      daje: "m_otopine1",
      iz: ["w2", "m_otopine2", "w1"],
      formula: "m₁(otopine) = w₂ · m₂(otopine) : w₁",
      f: (k) => (k.w2 * k.m_otopine2) / k.w1,
      krive: (k) => [{ osnovna: (k.w1 * k.m_otopine2) / k.w2, poruka: "Maseni udjeli su zamijenjeni: koncentriranije polazne otopine treba manje." }],
    });
    dodaj({
      daje: "m_dodane_vode",
      iz: ["m_otopine2", "m_otopine1"],
      formula: "m(dodane vode) = m₂(otopine) − m₁(otopine)",
      f: (k) => k.m_otopine2 - k.m_otopine1,
      krive: (k) => [{ osnovna: k.m_otopine2, poruka: "To je masa cijele razrijeđene otopine. U njoj je već i polazna otopina, pa vode treba dodati manje." }],
    });
  }

  // 4) miješanje dviju otopine iste tvari (volumeni se zbrajaju približno)
  if (vrsta === "mijesanje") {
    const PROSJEK = "Koncentracije se ne zbrajaju i ne uprosječuju: zbroji množine i podijeli ukupnim volumenom.";
    dodaj({ daje: "n", iz: ["n1", "n2"], formula: "n = n₁ + n₂", f: (k) => k.n1 + k.n2 });
    dodaj({ daje: "m", iz: ["m1", "m2"], formula: "m = m₁ + m₂", f: (k) => k.m1 + k.m2 });
    dodaj({ daje: "V", iz: ["V1", "V2"], formula: "V = V₁ + V₂", f: (k) => k.V1 + k.V2 });
    dodaj({ daje: "m_otopine", iz: ["m_otopine1", "m_otopine2"], formula: "m(otopine) = m₁(otopine) + m₂(otopine)", f: (k) => k.m_otopine1 + k.m_otopine2 });
    dodaj({
      daje: "c",
      iz: ["n", "V1", "V2"],
      formula: "c = n : (V₁ + V₂)",
      f: (k) => k.n / (k.V1 + k.V2),
      krive: (k) => [
        { osnovna: k.n / k.V1, poruka: "Množina je podijeljena samo volumenom prve otopine: nakon miješanja volumen je V₁ + V₂." },
        { osnovna: k.n / k.V2, poruka: "Množina je podijeljena samo volumenom druge otopine: nakon miješanja volumen je V₁ + V₂." },
        ...(isNum(k.c1) && isNum(k.c2) ? [{ osnovna: (k.c1 + k.c2) / 2, poruka: `${PROSJEK} Prosjek vrijedi samo za jednake volumene.` }, { osnovna: k.c1 + k.c2, poruka: PROSJEK }] : []),
      ],
    });
    dodaj({
      daje: "c",
      iz: ["c1", "V1", "c2", "V2"],
      formula: "c = (c₁ · V₁ + c₂ · V₂) : (V₁ + V₂)",
      f: (k) => (k.c1 * k.V1 + k.c2 * k.V2) / (k.V1 + k.V2),
      krive: (k) => [
        { osnovna: (k.c1 + k.c2) / 2, poruka: `${PROSJEK} Prosjek vrijedi samo za jednake volumene.` },
        { osnovna: k.c1 + k.c2, poruka: PROSJEK },
      ],
    });
    dodaj({
      daje: "w",
      iz: ["w1", "m_otopine1", "w2", "m_otopine2"],
      formula: "w = (w₁ · m₁(otopine) + w₂ · m₂(otopine)) : (m₁(otopine) + m₂(otopine))",
      f: (k) => (k.w1 * k.m_otopine1 + k.w2 * k.m_otopine2) / (k.m_otopine1 + k.m_otopine2),
      krive: (k) => [{ osnovna: (k.w1 + k.w2) / 2, poruka: "Maseni udjeli se ne uprosječuju: zbroji mase tvari i podijeli ukupnom masom otopine." }],
    });
  }
  return out;
}

// ── mol_racun za m ↔ n ↔ c ──
// Podspec za mol_racun s jednim korakom: zadana je izvorna veličina (u jedinici `jed` ili osnovnoj), traži se cilj.
function molSpec(s, p, k, jed = {}) {
  const ju = (kljuc, q) => jed[kljuc] ?? { m: "g", n: "mol", c: "mol/dm³", V: "L" }[q];
  const sub = { tip: "mol_racun", nacin: "izracunaj", tekst: "", tolerancija_posto: s.tolerancija_posto ?? 1 };
  if (s.tvar) sub.tvar = s.tvar;
  else if (isNum(s.M)) sub.M = s.M;
  const uIz = ju(p.mol.iz, p.mol.od);
  sub.zadano = { velicina: p.mol.od, vrijednost: k[p.mol.iz] / MJ[p.mol.od][uIz], jedinica: uIz };
  if (p.mol.V) {
    const uV = ju(p.mol.V, "V");
    sub.otopina = { V: k[p.mol.V] / MJ.V[uV], jedinica: uV };
  }
  sub.trazi = [{ velicina: p.mol.do, jedinica: ju(p.daje, p.mol.do) }];
  return sub;
}
function molVrijednost(s, p, k) {
  const kor = molLanac(molSpec(s, p, k)).koraci[0];
  return kor?.osnovna ?? NaN;
}

// ── lanac ──
// Početno poznato: zadane veličine (osnovne jedinice) i M. `promjene` {velicina: iznos u jedinici speca} (klizači).
export function pocetno(s, promjene = {}) {
  const k = {};
  const M = Mof(s);
  if (isNum(M)) k.M = M;
  for (const z of zadaniOf(s)) {
    const v = isNum(promjene[z.velicina]) ? promjene[z.velicina] : z.vrijednost;
    k[z.velicina] = v * faktor(z.velicina, z.jedinica);
  }
  return k;
}
const nadji = (q, k, pravila) => pravila.find((p) => p.daje === q && p.iz.every((x) => isNum(k[x]))) ?? null;

export function lanac(s, promjene) {
  const pravila = pravilaOf(s);
  const k = pocetno(s, promjene);
  const koraci = traziOf(s).map((t) => {
    const p = nadji(t.velicina, k, pravila);
    if (!p) return { ...t, pravilo: null, osnovna: NaN, vrijednost: NaN };
    const osnovna = p.f(k);
    k[t.velicina] = osnovna;
    return { ...t, pravilo: p, osnovna, vrijednost: osnovna / faktor(t.velicina, t.jedinica) };
  });
  return { poznato: k, koraci };
}

// Sve što se iz zadanog (i koraka lanca) može izračunati: za crtež (vaga, tikvica, boja) i provjeru speca.
export function sveOf(s, promjene, samoZadano = false) {
  const pravila = pravilaOf(s);
  const k = samoZadano ? pocetno(s, promjene) : lanac(s, promjene).poznato;
  for (let krug = 0; krug < 12; krug++) {
    let novo = false;
    for (const p of pravila)
      if (!isNum(k[p.daje]) && p.iz.every((x) => isNum(k[x]))) {
        const v = p.f(k);
        if (isNum(v)) {
          k[p.daje] = v;
          novo = true;
        }
      }
    if (!novo) break;
  }
  return k;
}

// prikazne jedinice poznatih veličina (zadano ili traženo), za poruke i podspec mol_racun
export function jediniceOf(s) {
  const j = {};
  for (const z of zadaniOf(s)) j[z.velicina] = z.jedinica;
  for (const t of traziOf(s)) j[t.velicina] = t.jedinica;
  return j;
}

// ── tipične greške koraka (u jedinici koraka) ──
function kriveKoraka(s, i, kor, k, jed, tocne) {
  const f = faktor(kor.velicina, kor.jedinica);
  const p = kor.pravilo;
  const out = (p.krive?.(k) ?? []).map((g) => ({ vrijednost: g.osnovna / f, poruka: g.poruka }));
  for (const kr of s.krivo ?? []) if ((kr.korak ?? traziOf(s).length - 1) === i) out.push({ vrijednost: kr.vrijednost, poruka: kr.poruka });
  const v = vel(kor.velicina);
  for (const u of v.druge)
    if (faktor(kor.velicina, u) !== f) {
      const poruka =
        rastavi(kor.velicina).baza === "w"
          ? u === ""
            ? "To je maseni udio kao decimalni broj, a traži se u postocima (pomnoži sa 100)."
            : "To je maseni udio u postocima, a traži se kao decimalni broj (podijeli sa 100)."
          : `To je ${v.ime} u ${u}, a traži se u ${kor.jedinica}.`;
      out.push({ vrijednost: kor.osnovna / faktor(kor.velicina, u), poruka });
    }
  // zadani iznos u jedinici koja nije osnovna, uvršten bez pretvorbe (w u %, mL uz g/dm³ …)
  for (const x of p.iz) {
    if (x === "M" || !isNum(k[x]) || !jed[x]) continue;
    const fx = faktor(x, jed[x]);
    if (!isNum(fx) || fx === 1) continue;
    const sirovo = p.f({ ...k, [x]: k[x] / fx });
    const baza = rastavi(x).baza;
    const poruka =
      baza === "w"
        ? UDIO
        : baza === "m" || baza === "m_otopine" || baza === "m_vode"
          ? `${oznaka(x, s)} je u ${jed[x]}: pretvori je u grame.`
          : `Jedinice se ne slažu: ${oznaka(x, s)} je u ${jed[x]}. Prije računa pretvori veličine u jedinice koje se slažu (1 dm³ = 1000 cm³ = 1000 mL, 1 g/cm³ = 1000 g/dm³).`;
    out.push({ vrijednost: sirovo / f, poruka });
  }
  // prepisana veličina iz koje se računa
  for (const x of p.iz) {
    if (x === "M" || !isNum(k[x])) continue;
    const jx = jed[x] ?? vel(x).osn;
    out.push({ vrijednost: k[x] / faktor(x, jx), poruka: `To je ${oznaka(x, s)}, a traži se ${kor.oznaka ?? oznaka(kor.velicina, s)}.` });
  }
  return out.filter((g) => isNum(g.vrijednost) && g.vrijednost > 0 && tocne.every((t) => !near(g.vrijednost, t, Math.abs(t) * 0.005)));
}

// ── postupak (pokus 5) ──
// prije: zašto taj korak dolazi baš ovdje (poruka kad ga je učenik stavio kasnije, a na njegovo mjesto nešto drugo)
export const POSTUPCI = {
  otapanje: [
    { id: "racun", tekst: "Izračunaj masu tvari potrebnu za otopinu.", kratko: "Izračunaj masu", prije: "Prvo se izračuna koliko tvari treba izvagati." },
    { id: "vagaj", tekst: "Na vagi namještenoj na nulu izvaži tvar u posudici za vaganje.", kratko: "Izvaži tvar", prije: "U tikvicu ide izvagana tvar, pa se najprije važe." },
    { id: "prenesi", tekst: "Preko lijevka prenesi tvar u odmjernu tikvicu i isperi lijevak destiliranom vodom u tikvicu.", kratko: "Prenesi u tikvicu", prije: "Tvar se otapa u tikvici, pa je najprije treba prenijeti u nju (i isprati lijevak, da ništa ne ostane izvan tikvice)." },
    { id: "otopi", tekst: "Dolij destilirane vode do otprilike polovine tikvice, začepi je i mućkanjem otopi svu tvar.", kratko: "Otopi u malo vode", prije: "Tvar se najprije otopi u manje vode (do polovine tikvice). Do oznake se dopunjava tek kad je sve otopljeno." },
    { id: "dopuni", tekst: "Dopuni destiliranom vodom do oznake na vratu tikvice.", kratko: "Dopuni do oznake", prije: "Prije miješanja tikvica se dopuni do oznake: tek tada je volumen otopine točno onaj napisan na tikvici." },
    { id: "promijesaj", tekst: "Začepi tikvicu i promiješaj otopinu višestrukim okretanjem.", kratko: "Promiješaj", prije: "" },
  ],
  razrjedivanje: [
    { id: "racun", tekst: "Izračunaj volumen polazne (koncentriranije) otopine.", kratko: "Izračunaj volumen", prije: "Prvo se izračuna koliko polazne otopine treba odmjeriti." },
    { id: "odmjeri", tekst: "Menzurom (ili pipetom) odmjeri izračunati volumen polazne otopine.", kratko: "Odmjeri polaznu otopinu", prije: "U tikvicu ide odmjereni volumen polazne otopine, pa se najprije odmjerava." },
    { id: "ulij", tekst: "Preko lijevka ulij je u odmjernu tikvicu i isperi lijevak destiliranom vodom u tikvicu.", kratko: "Ulij u tikvicu", prije: "Polazna otopina mora biti u tikvici prije nego što se dopunjava vodom (i lijevak se ispere, da sva otopljena tvar završi u tikvici)." },
    { id: "dopuni", tekst: "Dopuni destiliranom vodom do oznake na vratu tikvice.", kratko: "Dopuni do oznake", prije: "Prije miješanja tikvica se dopuni do oznake. Ne dodaje se cijeli volumen tikvice vode, nego voda do oznake." },
    { id: "promijesaj", tekst: "Začepi tikvicu i promiješaj otopinu višestrukim okretanjem.", kratko: "Promiješaj", prije: "" },
  ],
};
export const koraciPostupka = (s) => (POSTUPCI[vrstaOf(s)] ?? []).filter((k) => !(s.bez_racuna && k.id === "racun"));

// ── boje otopina (kemijski podatak) ──
// cRef: koncentracija (mol/dm³) pri kojoj je otopina u tikvici jako obojena; samo za prikaz.
export const BOJE = {
  CuSO4: { css: "#2a7fd4", naziv: "plava", cRef: 0.5 },
  CuCl2: { css: "#1fa3a0", naziv: "plavozelena", cRef: 0.5 },
  "Cu(NO3)2": { css: "#2a7fd4", naziv: "plava", cRef: 0.5 },
  KMnO4: { css: "#8a1c9c", naziv: "ljubičasta", cRef: 0.002 },
  K2Cr2O7: { css: "#ec6a0c", naziv: "narančasta", cRef: 0.05 },
  K2CrO4: { css: "#e8c000", naziv: "žuta", cRef: 0.05 },
  Na2CrO4: { css: "#e8c000", naziv: "žuta", cRef: 0.05 },
  NiSO4: { css: "#3f9e4d", naziv: "zelena", cRef: 0.5 },
  NiCl2: { css: "#3f9e4d", naziv: "zelena", cRef: 0.5 },
  CoCl2: { css: "#d23a6e", naziv: "ružičasta", cRef: 0.3 },
  FeCl3: { css: "#c98a1a", naziv: "žutosmeđa", cRef: 0.1 },
};
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const asciiF = (f) =>
  [...String(f ?? "")]
    .map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : c))
    .join("")
    .replace(/\((?:s|aq)\)/g, "")
    .split(/[·.*]/)[0]
    .trim();
export function bojaOf(s) {
  if (s?.boja === false) return null;
  if (typeof s?.boja === "string") return { css: s.boja, naziv: "", cRef: 0.5 };
  if (s?.boja && typeof s.boja === "object") return { css: s.boja.css, naziv: s.boja.naziv ?? "", cRef: isNum(s.boja.c_ref) ? s.boja.c_ref : 0.5 };
  return BOJE[asciiF(s?.tvar)] ?? null;
}
const hidrat = (s) => /[·.*]/.test(String(s?.tvar ?? ""));

const POLJA = ["tip", "nacin", "tekst", "vrsta", "tvar", "naziv", "M", "zadano", "trazi", "ioni", "elektrolit", "klizaci", "operacije", "tolerancija_posto", "krivo", "savjet", "boja", "bez_racuna"];
const istiBroj = (zapis, v) => {
  const n = parseNumber(String(zapis ?? "").replace(/−/g, "-"));
  return isNum(n) && Math.abs(n - v) <= 1e-9 * Math.max(1, Math.abs(v));
};
// tikvice iz laboratorija (mL), za klizač volumena u istraživanju
export const TIKVICE = [50, 100, 250, 500, 1000];

// klizači istraživanja: [{velicina, od, do, korak, vrijednosti?}] u jedinici zadane veličine
export function klizaciOf(s) {
  const zad = zadaniOf(s);
  const popis = s?.klizaci ?? (zad[0] ? [{ velicina: zad[0].velicina }] : []);
  return popis.map((kl) => {
    const k = kanon(kl?.velicina);
    const z = zad.find((x) => x.velicina === k);
    const v = z?.vrijednost ?? 1;
    if (Array.isArray(kl?.vrijednosti)) return { velicina: k, vrijednosti: kl.vrijednosti, z };
    if (!kl?.raspon && rastavi(k)?.baza === "V" && z?.jedinica === "mL" && TIKVICE.includes(v) && !(vrstaOf(s) === "razrjedivanje" && k === "V1")) return { velicina: k, vrijednosti: TIKVICE, z };
    let [od, doo] = kl?.raspon ?? [v / 5, v * 3];
    if (rastavi(k)?.baza === "w" && !kl?.raspon) doo = Math.min(doo, z?.jedinica === "%" ? 60 : 0.6);
    const sirina = (doo - od) / 200;
    const p = 10 ** Math.floor(Math.log10(sirina));
    const korak = [1, 2, 5, 10].map((x) => x * p).find((x) => x >= sirina) ?? sirina;
    return { velicina: k, od, do: doo, korak, z };
  });
}

export const otopina = {
  tip: "otopina",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Priprema otopine u odmjernoj tikvici (otapanje čvrste tvari, razrjeđivanje, miješanje dviju otopina) i lanac računa sastava otopine. Crtež: vaga s posudicom ili menzura s polaznom otopinom, odmjerna tikvica s oznakom, boja otopine (CuSO₄ plava, KMnO₄ ljubičasta, K₂Cr₂O₇ narančasta …) blijedi pri razrjeđivanju; bezbojna otopina ima točkice čestica.
Polja: tekst, vrsta?: ${VRSTE.join(" | ")} (zadano otapanje), tvar? (formula, npr. "NaCl", "CuSO₄·5H₂O"), naziv?, M? (samo bez formule),
zadano: [{velicina, vrijednost, jedinica?, zapis?, pretpostavka?: true (npr. „zamisli 1 dm³ otopine“)}], trazi: [{velicina, jedinica?, oznaka? (npr. "c(glukoze)")}] 1–4 koraka redom kojim se računaju.
Veličine: m (masa otopljene tvari), n, c, V (volumen otopine), gama (γ, masena koncentracija), w (maseni udio, jedinica "%" ili "" za udio), m_otopine, m_vode, rho (ρ, gustoća otopine), b (molalnost, mol/kg), c_cestica (koncentracija čestica; treba ioni ili elektrolit: false), m_dodane_vode (samo razrjeđivanje).
Razrjeđivanje: c1, V1, w1, rho1, m_otopine1 … za polaznu otopinu i c2, V2 … za razrijeđenu; m i n su iste u obje. Miješanje: …1 i …2 za otopine koje se miješaju, bez broja za smjesu (volumeni se zbrajaju).
Jedinice: m g | kg | mg; n mol | mmol; c mol/dm³ | mmol/dm³; V L | dm³ | mL | cm³; γ g/dm³ | g/L | g/cm³ | g/mL; ρ g/cm³ | g/mL | kg/dm³ | g/dm³; w % | "" ; b mol/kg.
ioni?: [{ion: "Ca²⁺", broj?: 1}, {ion: "Cl⁻", broj: 2}] – ioni jedne formulske jedinke (kod provjerava atome i naboj), elektrolit?: false za neelektrolit (glukoza).
operacije? (formule na strelicama; zadano samo u istrazi), boja? ("#hex" ili {css, naziv, c_ref}; false = bezbojna), tolerancija_posto? (zadano 1), krivo?: [{korak?, vrijednost, poruka}], savjet?, nacin:
- "istrazi" (nije zadatak): klizaci?: [{velicina (zadana), raspon? [od, do] ili vrijednosti?}] (najviše 2; zadano prva zadana; volumen tikvice u mL ide po 50, 100, 250, 500, 1000 mL), svi koraci računaju se uživo, „Pripremi otopinu“ pokaže postupak;
- "izracunaj": učenik upisuje vrijednost svakog koraka (svaki se provjerava i iz učenikova prethodnog rezultata); crtež pokazuje samo zadano, a nakon provjere pripremu;
- "postupak": učenik slaže korake pripreme iz pokusa 5 (otapanje: izračunaj, izvaži, prenesi i isperi lijevak, otopi u malo vode, dopuni do oznake, promiješaj; razrjeđivanje: izračunaj, odmjeri, ulij i isperi, dopuni do oznake, promiješaj) – koraci su u kodu; bez zadano i trazi; bez_racuna?: true izostavlja prvi korak.
Kod računa sve korake (m ↔ n ↔ c preko mol_racun, uz M iz Ar s lista; w = m : m(otopine), m(otopine) = ρ · V, γ = m : V = c · M = w · ρ, c₁V₁ = c₂V₂, miješanje, b = n : m(vode), c(čestica) = broj iona · c),
provjerava da se zadani podaci slažu i daje poruke za tipične greške: zamijenjene koncentracije ili volumeni, volumen dodane vode umjesto polazne otopine, masa vode umjesto otopine, w u % uvršten kao broj, g/cm³ uz dm³, mL/L, zaboravljen broj iona, prosjek koncentracija pri miješanju, g umjesto kg kod molalnosti.`,
  primjer: {
    tip: "otopina",
    nacin: "izracunaj",
    tekst: "Fiziološka otopina je vodena otopina natrijeva klorida masenog udjela 0,90 % i gustoće 1,00 g cm⁻³. Zamisli 1 dm³ te otopine i izračunaj redom masu otopine, masu NaCl, množinu NaCl i množinsku koncentraciju.",
    tvar: "NaCl",
    naziv: "natrijev klorid",
    zadano: [
      { velicina: "w", vrijednost: 0.9, jedinica: "%", zapis: "0,90" },
      { velicina: "rho", vrijednost: 1.0, jedinica: "g/cm³", zapis: "1,00" },
      { velicina: "V", vrijednost: 1, jedinica: "dm³", pretpostavka: true },
    ],
    trazi: [
      { velicina: "m_otopine", jedinica: "g" },
      { velicina: "m", jedinica: "g" },
      { velicina: "n", jedinica: "mol" },
      { velicina: "c", jedinica: "mol/dm³" },
    ],
  },
  primjeri: [
    {
      tip: "otopina",
      nacin: "istrazi",
      tekst: "Odaberi tikvicu i koncentraciju otopine modre galice. Gledaj koliko treba izvagati i kako je otopina plava.",
      tvar: "CuSO₄·5H₂O",
      naziv: "modra galica",
      zadano: [
        { velicina: "c", vrijednost: 0.1, jedinica: "mol/dm³", zapis: "0,100" },
        { velicina: "V", vrijednost: 250, jedinica: "mL" },
      ],
      klizaci: [{ velicina: "c", raspon: [0.02, 0.5] }, { velicina: "V" }],
      trazi: [
        { velicina: "n", jedinica: "mol" },
        { velicina: "m", jedinica: "g" },
      ],
    },
    {
      tip: "otopina",
      nacin: "istrazi",
      vrsta: "razrjedivanje",
      tekst: "Iz otopine bakrova(II) sulfata koncentracije 0,500 mol dm⁻³ pripremaš 100 mL razrijeđene otopine. Mijenjaj volumen polazne otopine i gledaj koncentraciju i boju.",
      tvar: "CuSO₄",
      zadano: [
        { velicina: "V1", vrijednost: 20, jedinica: "mL" },
        { velicina: "c1", vrijednost: 0.5, jedinica: "mol/dm³", zapis: "0,500" },
        { velicina: "V2", vrijednost: 100, jedinica: "mL" },
      ],
      klizaci: [{ velicina: "V1", raspon: [5, 80] }],
      trazi: [{ velicina: "c2", jedinica: "mol/dm³" }],
    },
    {
      tip: "otopina",
      nacin: "izracunaj",
      vrsta: "razrjedivanje",
      tekst: "Koliki volumen otopine NaCl koncentracije 2,00 mol dm⁻³ treba odmjeriti da se razrjeđivanjem pripremi 500 mL fiziološke otopine koncentracije 0,154 mol dm⁻³?",
      tvar: "NaCl",
      zadano: [
        { velicina: "c1", vrijednost: 2.0, jedinica: "mol/dm³", zapis: "2,00" },
        { velicina: "c2", vrijednost: 0.154, jedinica: "mol/dm³" },
        { velicina: "V2", vrijednost: 500, jedinica: "mL" },
      ],
      trazi: [{ velicina: "V1", jedinica: "mL" }],
    },
    {
      tip: "otopina",
      nacin: "izracunaj",
      tekst: "Treba pripremiti 100 mL otopine natrijeva acetata koncentracije 1,0 mol dm⁻³ otapanjem čvrstog natrijeva acetata. Izračunaj množinu i masu natrijeva acetata koju treba izvagati.",
      tvar: "CH₃COONa",
      naziv: "natrijev acetat",
      zadano: [
        { velicina: "c", vrijednost: 1.0, jedinica: "mol/dm³", zapis: "1,0" },
        { velicina: "V", vrijednost: 100, jedinica: "mL" },
      ],
      trazi: [
        { velicina: "n", jedinica: "mol" },
        { velicina: "m", jedinica: "g" },
      ],
    },
    {
      tip: "otopina",
      nacin: "izracunaj",
      vrsta: "razrjedivanje",
      tekst: "Iz alkoholnog octa (w = 9 %, ρ = 1,01 g cm⁻³) treba razrjeđivanjem pripremiti 100 mL otopine octene kiseline koncentracije 1,0 mol dm⁻³. Izračunaj množinu i masu octene kiseline, masu octa koja je sadrži i volumen octa koji treba odmjeriti.",
      tvar: "CH₃COOH",
      naziv: "octena kiselina",
      zadano: [
        { velicina: "c2", vrijednost: 1.0, jedinica: "mol/dm³", zapis: "1,0" },
        { velicina: "V2", vrijednost: 100, jedinica: "mL" },
        { velicina: "w1", vrijednost: 9, jedinica: "%" },
        { velicina: "rho1", vrijednost: 1.01, jedinica: "g/cm³" },
      ],
      trazi: [
        { velicina: "n", jedinica: "mol" },
        { velicina: "m", jedinica: "g" },
        { velicina: "m_otopine1", jedinica: "g" },
        { velicina: "V1", jedinica: "mL" },
      ],
    },
    {
      tip: "otopina",
      nacin: "izracunaj",
      tekst: "Otopina kalcijeva klorida ima koncentraciju 0,0999 mol dm⁻³. Kolika je koncentracija svih otopljenih čestica? Tolika mora biti koncentracija otopine glukoze istog osmotskog tlaka.",
      tvar: "CaCl₂",
      zadano: [{ velicina: "c", vrijednost: 0.0999, jedinica: "mol/dm³" }],
      ioni: [
        { ion: "Ca²⁺", broj: 1 },
        { ion: "Cl⁻", broj: 2 },
      ],
      trazi: [{ velicina: "c_cestica", jedinica: "mol/dm³", oznaka: "c(glukoze)" }],
    },
    {
      tip: "otopina",
      nacin: "izracunaj",
      tekst: "U 1500 g vode otopi se 330,0 g natrijeva klorida. Gustoća nastale otopine je 1,130 g cm⁻³. Izračunaj masu otopine, njezin volumen i masenu koncentraciju NaCl.",
      tvar: "NaCl",
      zadano: [
        { velicina: "m", vrijednost: 330, jedinica: "g", zapis: "330,0" },
        { velicina: "m_vode", vrijednost: 1500, jedinica: "g" },
        { velicina: "rho", vrijednost: 1.13, jedinica: "g/cm³", zapis: "1,130" },
      ],
      trazi: [
        { velicina: "m_otopine", jedinica: "g" },
        { velicina: "V", jedinica: "cm³" },
        { velicina: "gama", jedinica: "g/dm³" },
      ],
    },
    {
      tip: "otopina",
      nacin: "izracunaj",
      vrsta: "mijesanje",
      tekst: "Pomiješa se 100 mL otopine NaCl koncentracije 0,200 mol dm⁻³ i 300 mL otopine NaCl koncentracije 0,100 mol dm⁻³. Izračunaj množinu NaCl u svakoj otopini, ukupnu množinu i koncentraciju nastale otopine (volumeni se zbrajaju).",
      tvar: "NaCl",
      zadano: [
        { velicina: "c1", vrijednost: 0.2, jedinica: "mol/dm³", zapis: "0,200" },
        { velicina: "V1", vrijednost: 100, jedinica: "mL" },
        { velicina: "c2", vrijednost: 0.1, jedinica: "mol/dm³", zapis: "0,100" },
        { velicina: "V2", vrijednost: 300, jedinica: "mL" },
      ],
      trazi: [
        { velicina: "n1", jedinica: "mmol" },
        { velicina: "n2", jedinica: "mmol" },
        { velicina: "n", jedinica: "mmol" },
        { velicina: "c", jedinica: "mol/dm³" },
      ],
    },
    {
      tip: "otopina",
      nacin: "postupak",
      tekst: "Poredaj korake pripreme 100 mL otopine natrijeva acetata koncentracije 1,0 mol dm⁻³ otapanjem čvrste tvari.",
      tvar: "CH₃COONa",
    },
    {
      tip: "otopina",
      nacin: "postupak",
      vrsta: "razrjedivanje",
      tekst: "Poredaj korake pripreme 100 mL otopine octene kiseline razrjeđivanjem alkoholnog octa.",
      tvar: "CH₃COOH",
      bez_racuna: true,
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `otopina.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "otopina treba „tekst“");
    for (const k of Object.keys(s)) need(POLJA.includes(k), `otopina ne poznaje polje „${k}“ (polja: ${POLJA.slice(1).join(", ")})`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.vrsta != null) need(VRSTE.includes(s.vrsta), `vrsta mora biti jedna od: ${VRSTE.join(", ")}`);
    for (const b of ["operacije", "bez_racuna"]) if (s[b] != null) need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (s.naziv != null) need(isText(s.naziv), "naziv mora biti tekst");
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    if (s.tolerancija_posto != null) need(isNum(s.tolerancija_posto) && s.tolerancija_posto > 0 && s.tolerancija_posto <= 5, "tolerancija_posto je broj između 0 i 5");
    if (s.boja != null && s.boja !== false) {
      const css = typeof s.boja === "string" ? s.boja : s.boja?.css;
      need(/^#[0-9a-fA-F]{6}$/.test(css ?? ""), 'boja je "#rrggbb", {css: "#rrggbb", naziv?, c_ref?} ili false (bezbojna)');
      if (typeof s.boja === "object" && s.boja.c_ref != null) need(isNum(s.boja.c_ref) && s.boja.c_ref > 0, "boja.c_ref je koncentracija (mol/dm³) pri kojoj je otopina jako obojena");
    }

    // tvar i M
    let Mf = null;
    if (s.tvar != null && need(isText(s.tvar), 'tvar mora biti formula (tekst), npr. "NaCl"')) {
      if (need(atomiOd(s.tvar), `formula „${s.tvar}“ se ne da pročitati ili ima simbol kojeg nema u periodnom sustavu`)) {
        Mf = molarnaMasa(s.tvar);
        need(Mf, `formula „${s.tvar}“ ima element bez stalne Ar na listu`);
      }
    }
    if (s.M != null && need(isNum(s.M) && s.M > 0, "M mora biti pozitivan broj (g/mol)") && Mf)
      need(Math.abs(s.M - Mf) <= 0.005 * Mf, `M = ${formatNumber(s.M)} g/mol ne slaže se s M(${formulaZapis(s.tvar)}) = ${formatNumber(Mf)} g/mol iz Ar s lista (izostavi M, kod ga računa sam)`);

    // ioni
    if (s.ioni != null) {
      if (need(Array.isArray(s.ioni) && s.ioni.length >= 2, 'ioni je popis od barem dva iona [{ion: "Na⁺"}, {ion: "Cl⁻"}]')) {
        let naboj = 0;
        const atomi = {};
        let ok = true;
        s.ioni.forEach((x, i) => {
          const b = x?.broj ?? 1;
          if (!need(Number.isInteger(b) && b >= 1 && b <= 4, `ioni[${i}].broj je cijeli broj od 1 do 4`)) return (ok = false);
          const a = atomiOd(x?.ion);
          if (!need(isText(x?.ion) && a, `ioni[${i}].ion („${x?.ion}“) mora biti formula iona, npr. "Ca²⁺" ili "SO₄²⁻"`)) return (ok = false);
          const q = nabojOd(x.ion);
          need(q !== 0, `ioni[${i}] („${x.ion}“) nema naboj: napiši ga, npr. "Na⁺"`);
          naboj += q * b;
          for (const [e, n] of Object.entries(a)) atomi[e] = (atomi[e] ?? 0) + n * b;
        });
        if (ok) {
          need(naboj === 0, `naboji iona se ne poništavaju (zbroj je ${naboj}): formulska jedinka je neutralna`);
          const t = s.tvar ? atomiOd(String(s.tvar).split(/[·.*]/)[0]) : null;
          if (need(t, "ioni trebaju tvar (formulu), da se provjeri jesu li to njezini ioni"))
            need(
              Object.keys({ ...t, ...atomi }).every((e) => t[e] === atomi[e]),
              `ioni (${ioniZapis(s)}) nemaju iste atome kao ${formulaZapis(s.tvar)}`,
            );
        }
      }
      need(s.elektrolit !== false, "ioni i elektrolit: false ne idu zajedno");
    }
    if (s.elektrolit != null) need(s.elektrolit === false, "elektrolit može biti samo false (neelektrolit); za elektrolit napiši ione");

    // postupak
    if (s.nacin === "postupak") {
      need(vrstaOf(s) !== "mijesanje", "postupak postoji za otapanje i razrjeđivanje");
      for (const f of ["zadano", "trazi", "klizaci", "krivo", "operacije"]) need(!(f in s), `postupak ne koristi „${f}“ (koraci su iz pokusa 5)`);
      return list;
    }
    need(s.bez_racuna == null, "bez_racuna je samo za postupak");

    // zadano
    const vrsta = vrstaOf(s);
    const smije = dopusteni(vrsta);
    const VRSTA_PORUKA = { razrjedivanje: " (u razrjeđivanju: c1, V1 … polazna, c2, V2 … razrijeđena; m i n bez broja)", mijesanje: " (u miješanju: …1 i …2 otopine koje se miješaju, bez broja smjesa)", otapanje: " (bez brojeva 1 i 2; za razrjeđivanje zadaj vrsta: \"razrjedivanje\")" };
    const zadani = zadaniOf(s);
    if (!need(zadani.length >= 1 && zadani.length <= 5, "zadano je popis 1–5 veličina {velicina, vrijednost, jedinica}")) return list;
    zadani.forEach((z, i) => {
      if (!need(smije.includes(z.velicina), `zadano[${i}].velicina „${z.velicina}“ ne postoji za vrstu ${vrsta}${VRSTA_PORUKA[vrsta]}`)) return;
      need(isNum(z.vrijednost) && z.vrijednost > 0, `zadano[${i}].vrijednost mora biti pozitivan broj`);
      if (z.zapis != null) need(isText(z.zapis) && istiBroj(z.zapis, z.vrijednost), `zadano[${i}].zapis („${z.zapis}“) mora biti isti broj kao vrijednost (${z.vrijednost}), samo s decimalnim zarezom`);
      need(faktor(z.velicina, z.jedinica) != null, `zadano[${i}].jedinica za ${z.velicina} mora biti jedna od: ${Object.keys(vel(z.velicina).jed).map((u) => u || "(bez jedinice, udio)").join(", ")}`);
      if (z.pretpostavka) need(["V", "m_otopine"].includes(rastavi(z.velicina).baza), `zadano[${i}].pretpostavka ide samo uz volumen ili masu otopine („zamisli 1 dm³ otopine“)`);
    });
    need(new Set(zadani.map((z) => z.velicina)).size === zadani.length, "svaka veličina je u zadano samo jednom");

    // trazi
    const trazeni = traziOf(s);
    if (!need(trazeni.length >= 1 && trazeni.length <= 4, "trazi je popis 1–4 koraka [{velicina, jedinica}]")) return list;
    trazeni.forEach((t, i) => {
      if (!need(smije.includes(t.velicina), `trazi[${i}].velicina „${t.velicina}“ ne postoji za vrstu ${vrsta}${VRSTA_PORUKA[vrsta]}`)) return;
      need(faktor(t.velicina, t.jedinica) != null, `trazi[${i}].jedinica za ${t.velicina} mora biti jedna od: ${Object.keys(vel(t.velicina).jed).map((u) => u || "(bez jedinice, udio)").join(", ")}`);
    });
    const sve = [...zadani, ...trazeni].map((x) => x.velicina);
    need(new Set(sve).size === sve.length, "svaka veličina je u lancu samo jednom (ni zadana ni tražena dvaput)");
    if (list.length) return list;
    if (s.tvar && hidrat(s))
      need(!sve.some((x) => ["w", "gama", "m_otopine", "m_vode", "b"].includes(rastavi(x).baza)), "uz hidrat (npr. CuSO₄·5H₂O) računaj samo m, n i c: maseni udio i masena koncentracija odnose se na bezvodnu sol, a M je hidrata");
    if (sve.some((x) => rastavi(x).baza === "c_cestica")) need(cesticeOf(s) != null, "c_cestica treba ioni (npr. NaCl: Na⁺ i Cl⁻) ili elektrolit: false");

    // svaki korak mora se dati izračunati, redom
    const pravila = pravilaOf(s);
    const k = pocetno(s);
    const korisceno = new Set();
    trazeni.forEach((t, i) => {
      const p = nadji(t.velicina, k, pravila);
      const poznate = Object.keys(k).filter((x) => x !== "M");
      const bezM = !isNum(k.M) && ["m", "n"].includes(rastavi(t.velicina).baza) ? " (za m ↔ n treba tvar, formula, ili M)" : "";
      if (!need(p, `trazi[${i}] (${t.velicina}) ne može se izračunati iz ${poznate.join(", ")}${bezM}`)) {
        k[t.velicina] = NaN;
        return;
      }
      p.iz.forEach((x) => korisceno.add(x));
      k[t.velicina] = p.f(k);
      need(isNum(k[t.velicina]) && k[t.velicina] > 0, `trazi[${i}] (${t.velicina}) ne daje pozitivan broj: provjeri zadane podatke`);
    });
    if (list.length) return list;
    for (const z of zadani) need(korisceno.has(z.velicina), `zadano ${z.velicina} se ne koristi ni u jednom koraku lanca`);

    // zadani podaci moraju se slagati (prezadano): svaka zadana veličina koja slijedi iz ostalih zadanih mora se slagati
    const pun = sveOf(s);
    for (const z of zadani) {
      if (z.pretpostavka) continue;
      const bez = sveOf({ ...s, zadano: [].concat(s.zadano).filter((x) => kanon(x?.velicina) !== z.velicina) }, {}, true);
      const v = bez[z.velicina];
      const zv = z.vrijednost * faktor(z.velicina, z.jedinica);
      if (isNum(v) && Math.abs(v - zv) > 0.02 * Math.abs(zv)) {
        need(false, `zadani podaci se ne slažu: iz ostalih zadanih podataka slijedi ${z.velicina} = ${zapisBroja(v / faktor(z.velicina, z.jedinica))} ${z.jedinica}, a zadano je ${formatNumber(z.vrijednost)} ${z.jedinica}`);
        break;
      }
    }
    for (const [x, v] of Object.entries(pun)) {
      const r = rastavi(x);
      if (!r || !isNum(v)) continue;
      if (r.baza === "w") need(v > 0 && v < 1, `maseni udio ${x} ispada ${formatSci(v * 100)} %: mora biti između 0 i 100 %`);
      if (r.baza === "rho") need(v >= 600 && v <= 2000, `gustoća otopine ${x} ispada ${formatSci(v / 1000)} g/cm³: vodene otopine imaju između 0,6 i 2,0 g/cm³`);
      if (r.baza === "m_otopine" && isNum(pun[(vrsta === "razrjedivanje" ? "m" : "m" + r.ind)])) need(v > pun[vrsta === "razrjedivanje" ? "m" : "m" + r.ind], `masa otopine ${x} mora biti veća od mase otopljene tvari`);
    }
    if (vrsta === "razrjedivanje") {
      if (isNum(pun.c1) && isNum(pun.c2)) need(pun.c2 < pun.c1, "razrjeđivanjem koncentracija pada: c2 mora biti manja od c1");
      if (isNum(pun.V1) && isNum(pun.V2)) need(pun.V1 < pun.V2, "polazne otopine (V1) ima manje od razrijeđene (V2)");
      if (isNum(pun.w1) && isNum(pun.w2)) need(pun.w2 < pun.w1, "razrjeđivanjem maseni udio pada: w2 mora biti manji od w1");
    }

    // istraživanje: klizači
    if (s.nacin === "istrazi") {
      if (s.klizaci != null && need(Array.isArray(s.klizaci) && s.klizaci.length >= 1 && s.klizaci.length <= 2, "klizaci je popis od 1–2 klizača [{velicina, raspon?}]"))
        s.klizaci.forEach((kl, i) => {
          const z = zadani.find((x) => x.velicina === kanon(kl?.velicina));
          if (!need(z, `klizaci[${i}].velicina mora biti jedna od zadanih veličina`)) return;
          if (kl.raspon != null) {
            const r = kl.raspon;
            if (need(Array.isArray(r) && r.length === 2 && r.every(isNum) && r[0] > 0 && r[1] > r[0], `klizaci[${i}].raspon je [od, do] s 0 < od < do`))
              need(z.vrijednost >= r[0] && z.vrijednost <= r[1], `klizaci[${i}]: početna vrijednost mora biti unutar raspona`);
          }
          if (kl.vrijednosti != null) need(Array.isArray(kl.vrijednosti) && kl.vrijednosti.length >= 2 && kl.vrijednosti.every((v) => isNum(v) && v > 0) && kl.vrijednosti.includes(z.vrijednost), `klizaci[${i}].vrijednosti je popis pozitivnih brojeva koji sadrži zadanu vrijednost`);
        });
      // svaki položaj klizača mora dati moguću otopinu
      for (const kl of klizaciOf(s)) {
        const kraj = kl.vrijednosti ? [Math.min(...kl.vrijednosti), Math.max(...kl.vrijednosti)] : [kl.od, kl.do];
        for (const v of kraj) {
          const p = sveOf(s, { [kl.velicina]: v });
          const losi = Object.entries(p).filter(([x, y]) => rastavi(x)?.baza === "w" && !(y > 0 && y < 1));
          need(!losi.length, `klizač ${kl.velicina} = ${formatNumber(v)} daje maseni udio izvan 0–100 %: suzi raspon`);
          if (vrsta === "razrjedivanje" && isNum(p.V1) && isNum(p.V2)) need(p.V1 < p.V2, `klizač ${kl.velicina} = ${formatNumber(v)}: polazne otopine bi bilo više od razrijeđene, suzi raspon`);
        }
      }
      need(s.krivo == null && s.savjet == null, "istrazi nema krivo ni savjet");
    } else need(s.klizaci == null, "klizaci su samo za istrazi");

    if (s.nacin === "izracunaj" && s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis")) {
      const { koraci } = lanac(s);
      s.krivo.forEach((kr, i) => {
        const j = kr?.korak ?? koraci.length - 1;
        if (!need(Number.isInteger(j) && j >= 0 && j < koraci.length, `krivo[${i}].korak mora biti indeks koraka iz trazi`)) return;
        need(isNum(kr?.vrijednost) && isText(kr?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
        if (isNum(kr?.vrijednost)) need(!near(kr.vrijednost, koraci[j].vrijednost, Math.abs(koraci[j].vrijednost) * 0.005), `krivo[${i}].vrijednost je točan odgovor`);
      });
    }
    return list;
  },

  // odgovor: popis upisa (po jedan za svaki korak iz trazi); u načinu postupak popis indeksa koraka redom
  check(s, odgovor) {
    if (s.nacin === "postupak") {
      const kor = koraciPostupka(s);
      if (!Array.isArray(odgovor) || odgovor.length !== kor.length) return { tocno: false, poruka: "Poredaj sve korake.", prazno: true };
      const p = odgovor.findIndex((j, i) => j !== i);
      if (p < 0) return { tocno: true };
      const rano = kor[odgovor[p]];
      return { tocno: false, pozicija: p, poruka: `„${rano?.kratko ?? "Taj korak"}“ dolazi kasnije. ${kor[p].prije}` };
    }
    if (s.nacin !== "izracunaj") return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    const pct = (s.tolerancija_posto ?? 1) / 100;
    const { koraci } = lanac(s);
    const jed = jediniceOf(s);
    const unosi = [].concat(odgovor ?? []);
    const k = pocetno(s); // poznato, s učenikovim (prihvaćenim) vrijednostima
    for (let i = 0; i < koraci.length; i++) {
      const kor = koraci[i];
      const f = faktor(kor.velicina, kor.jedinica);
      const izUcenika = kor.pravilo.f(k) / f;
      const ulaz = String(unosi[i] ?? "");
      // maseni udio traži se kao decimalni broj, ali „10 %“ je isti udio kao 0,10
      const uPostocima = kor.jedinica === "" && rastavi(kor.velicina)?.baza === "w" && /%\s*$/.test(ulaz);
      const uPost = uPostocima ? parseNumber(ulaz.replace(/\s*%\s*$/, "")) : null;
      const broj = uPostocima ? (isNum(uPost) ? uPost / 100 : null) : parseNumber(ulaz, kor.jedinica);
      const ime = kor.oznaka ?? oznaka(kor.velicina, s);
      const prihvati = (b) => near(b, kor.vrijednost, Math.abs(kor.vrijednost) * pct) || near(b, izUcenika, Math.abs(izUcenika) * pct);
      if (isNum(broj) && prihvati(broj)) {
        k[kor.velicina] = broj * f;
        continue;
      }
      const savjet = s.savjet || `Provjeri račun za ${ime} i jedinicu.`;
      const autor = (s.krivo ?? []).find((kr) => (kr.korak ?? koraci.length - 1) === i && isNum(broj) && near(broj, kr.vrijednost, Math.abs(kr.vrijednost) * 0.005));
      let r;
      if (autor) r = { tocno: false, poruka: autor.poruka };
      else if (kor.pravilo.mol && isNum(broj)) {
        // m ↔ n ↔ c: poruke mol_racun (M s lista, zaboravljen indeks, mL/dm³ …)
        r = mol_racun.check({ ...molSpec(s, kor.pravilo, k, jed), savjet }, [ulaz]);
        if (r.tocno) {
          k[kor.velicina] = broj * f;
          continue;
        }
      } else
        r = checkNumber({
          input: uPostocima && isNum(broj) ? broj : ulaz,
          answer: izUcenika,
          tol: Math.abs(izUcenika) * pct,
          unit: kor.jedinica,
          krivo: kriveKoraka(s, i, kor, k, jed, [kor.vrijednost, izUcenika]),
          savjet,
        });
      if (r.tocno) {
        // „3.875“ pročitano kao decimalni broj (checkNumber)
        k[kor.velicina] = izUcenika * f;
        continue;
      }
      const ostalo = { ...r };
      delete ostalo.praznina;
      return koraci.length > 1 ? { ...ostalo, tocno: false, praznina: i, poruka: `${ime}: ${r.poruka}` } : { ...ostalo, tocno: false, praznina: 0 };
    }
    return { tocno: true };
  },

  brojcaniOdgovor(s) {
    if (s.nacin !== "izracunaj") return null;
    const v = lanac(s).koraci.at(-1)?.vrijednost;
    return isNum(v) ? Number(v.toPrecision(3)) : null;
  },

  tocanOdgovor(s) {
    if (s.nacin === "postupak")
      return koraciPostupka(s)
        .map((k, i) => `${i + 1}. ${k.tekst}`)
        .join(" ");
    if (s.nacin !== "izracunaj") return "";
    return lanac(s)
      .koraci.map((k) => `${k.oznaka ?? oznaka(k.velicina, s)} = ${sJedinicom(k.vrijednost, k.jedinica)}`)
      .join(" → ");
  },
};
