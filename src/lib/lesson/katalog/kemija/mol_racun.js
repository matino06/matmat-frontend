// mol_racun: lanac računa s množinom, m ↔ n ↔ N ↔ V(plina) ↔ c(otopine), uz molarnu masu iz Ar s lista mature.
// Množina je u sredini (zvijezda): svaka veličina pretvara se samo u n i iz n, a M se računa iz formule ili iz m : n.
// Točne vrijednosti svakog koraka i tipične krive vrijednosti (množenje umjesto dijeljenja s M, zaboravljen indeks,
// 22,4 L/mol kad uvjeti nisu normirani, mmol/mol, mL/dm³, potencija N_A …) računa kod iz speca. Svi brojevi
// (Ar, N_A, V_m, R, 273 K) dolaze iz _tablice.js, pa se slažu s ispitnim listom.
import {
  isNum,
  parseNumber,
  formatNumber,
  formatSci,
  near,
} from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  checkNumber,
} from "../zajednicko.js";
import { KONSTANTE, PO_SIMBOLU, atomiOd, molarnaMasa } from "./_tablice.js";

const NA = KONSTANTE.NA.vrijednost;
const VM = KONSTANTE.Vm.vrijednost;
const R = KONSTANTE.R.vrijednost;
const T0 = KONSTANTE.T0.vrijednost;

export const NACINI = ["istrazi", "izracunaj", "molarna_masa"];
const ZADANE = ["m", "n", "N", "V", "c"];
const TRAZENE = ["m", "n", "N", "V", "c", "M"];

// Jedinice prema osnovnoj (g, mol, čestica, L, mol/dm³, g/mol). Za N „jedinica“ je samo riječ uz broj.
export const JEDINICE = {
  m: { g: 1, kg: 1000, mg: 0.001 },
  n: { mol: 1, mmol: 0.001 },
  N: {
    "": 1,
    čestica: 1,
    molekula: 1,
    atoma: 1,
    iona: 1,
    "formulskih jedinki": 1,
  },
  V: { L: 1, "dm³": 1, mL: 0.001, "cm³": 0.001, "m³": 1000 },
  c: {
    "mol/dm³": 1,
    "mol dm⁻³": 1,
    "mol/L": 1,
    "mol L⁻¹": 1,
    "mmol/dm³": 0.001,
    "mmol/L": 0.001,
  },
  M: { "g/mol": 1, "g mol⁻¹": 1 },
};
const OSNOVNA = { m: "g", n: "mol", N: "", V: "L", c: "mol/dm³", M: "g/mol" };
// jedinice za poruku „isti iznos u drugoj jedinici“ (bez istoznačnica)
const DRUGE = {
  m: ["g", "kg", "mg"],
  n: ["mol", "mmol"],
  V: ["L", "mL", "m³"],
  c: ["mol/dm³", "mmol/dm³"],
};
const P_JEDINICE = { Pa: 1, hPa: 100, kPa: 1000, MPa: 1e6, bar: 1e5 };

export const IME = {
  m: "masa",
  n: "množina",
  N: "broj čestica",
  V: "volumen plina",
  c: "množinska koncentracija",
  M: "molarna masa",
};

// „dm3“, „mol dm-3“ → „dm³“, „mol dm⁻³“
export function normJedinica(q, u) {
  if (u == null) return OSNOVNA[q];
  return String(u)
    .trim()
    .replace(/\^?-1\b/g, "⁻¹")
    .replace(/\^?-3\b/g, "⁻³")
    .replace(/(dm|cm|m)\^?3/g, "$1³");
}
const faktor = (q, u) => JEDINICE[q]?.[u];

// ── formule ──
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const ascii = (f) =>
  [...String(f ?? "")]
    .map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : c))
    .join("");
// "CuSO4·5H2O" → "CuSO₄·5H₂O": indeksi iza simbola i zagrade, koeficijent hidrata ostaje običan broj
export const formulaZapis = (f) =>
  ascii(f).replace(
    /([A-Za-z)\]])(\d+)/g,
    (_, a, d) => a + [...d].map((c) => SUB[c]).join(""),
  );

export const zaokruziM = (M) => Math.round(M * 100) / 100;
export const zapisM = (M) => `${formatNumber(zaokruziM(M))} g/mol`;

// Ar elemenata iz formule (redom pojavljivanja), za prikaz „s lista“: [{simbol, naziv, ar, arZapis, broj}]
export function arElemenata(formula) {
  const a = atomiOd(formula);
  if (!a) return [];
  return Object.entries(a).map(([e, broj]) => ({ ...PO_SIMBOLU[e], broj }));
}

// Zbroj „M = 63,5 + 32,1 + 9 · 16,0 + 10 · 1,01“
export function zbrojAr(formula) {
  return arElemenata(formula)
    .map((e) => (e.broj > 1 ? `${e.broj} · ${e.arZapis}` : e.arZapis))
    .join(" + ");
}

// Tipične krive molarne mase za formulu: indeksi zanemareni, zagrada bez indeksa, hidrat bez vode ili s jednom
// molekulom vode, zbroj rednih brojeva.
export function kriveM(formula) {
  const M = molarnaMasa(formula);
  const a = atomiOd(formula);
  if (!M || !a) return [];
  const zapis = formulaZapis(formula);
  const f = ascii(formula).replace(/\((?:s|l|g|aq)\)/g, "");
  const out = [];
  const visi = Object.entries(a).filter(([, n]) => n > 1);
  if (visi.length)
    out.push({
      M: Object.keys(a).reduce((z, e) => z + PO_SIMBOLU[e].ar, 0),
      poruka: `kao da je svaki element u ${zapis} samo jednom. Pazi na indekse: ${visi.map(([e, n]) => `${e} ima ${n}`).join(", ")}.`,
    });
  if (/\)\d+/.test(f))
    out.push({
      M: molarnaMasa(f.replace(/\)(\d+)/g, ")")),
      poruka: "indeks iza zagrade množi cijelu skupinu u zagradi.",
    });
  const dijelovi = f.split(/[·.*]/);
  if (dijelovi.length > 1) {
    out.push({
      M: molarnaMasa(dijelovi[0]),
      poruka: `zaboravljena je kristalna voda: i ${formulaZapis(dijelovi.slice(1).join("·"))} ulazi u molarnu masu.`,
    });
    if (dijelovi.slice(1).some((d) => /^\d/.test(d)))
      out.push({
        M: molarnaMasa(
          [
            dijelovi[0],
            ...dijelovi.slice(1).map((d) => d.replace(/^\d+/, "")),
          ].join("·"),
        ),
        poruka:
          "broj ispred H₂O je broj molekula vode: masu vode treba pomnožiti tim brojem.",
      });
  }
  out.push({
    M: Object.entries(a).reduce((z, [e, n]) => z + PO_SIMBOLU[e].z * n, 0),
    poruka:
      "zbrojeni su redni brojevi (protoni). U molarnu masu ulaze relativne atomske mase Ar s lista.",
  });
  return out.filter(
    (k) => isNum(k.M) && k.M > 0 && Math.abs(k.M - M) > 0.005 * M,
  );
}

// ── spec → podaci ──
export const zadaniOf = (s) =>
  []
    .concat(s?.zadano ?? [])
    .map((z) => ({
      velicina: z?.velicina,
      vrijednost: z?.vrijednost,
      zapis: z?.zapis,
      jedinica: normJedinica(z?.velicina, z?.jedinica),
    }));
export const traziOf = (s) =>
  []
    .concat(s?.trazi ?? [])
    .map((t) => ({
      velicina: t?.velicina,
      jedinica: normJedinica(t?.velicina, t?.jedinica),
    }));

// Plin: normirani uvjeti (V_m) ili p i T za pV = nRT. p u Pa, T u K.
export function plinOf(s) {
  const g = s?.plin;
  if (!g) return null;
  if (g.uvjeti === "normirani") return { normirani: true };
  const pj = g.jedinica ?? "kPa";
  return {
    normirani: false,
    p: g.p * P_JEDINICE[pj],
    pZadano: g.p,
    pj,
    T: isNum(g.T) ? g.T : g.t + T0,
    t: isNum(g.T) ? null : g.t,
  };
}
export function uvjetiZapis(s) {
  const g = plinOf(s);
  if (!g) return "";
  if (g.normirani) return "normirani uvjeti (0 °C, 101 kPa)";
  return `${g.t != null ? `${formatNumber(g.t)} °C` : `${formatNumber(g.T)} K`}, ${formatNumber(g.pZadano)} ${g.pj}`;
}
const otopinaOf = (s) => {
  const o = s?.otopina;
  if (!o) return null;
  const j = normJedinica("V", o.jedinica ?? "L");
  return { V: o.V * (faktor("V", j) ?? NaN), zadano: o.V, jedinica: j };
};
export const otopinaZapis = (s) =>
  s?.otopina
    ? `V(otopine) = ${s.otopina.zapis ?? formatNumber(s.otopina.V)} ${normJedinica("V", s.otopina.jedinica ?? "L")}`
    : "";

// M zadan u specu ili iz formule (Ar s lista); null ako se ne zna.
export function zadanaM(s) {
  if (isNum(s?.M)) return s.M;
  return s?.tvar ? molarnaMasa(s.tvar) : null;
}
const mJeKorak = (s) => traziOf(s).some((t) => t.velicina === "M");

// Pravilo za korak q iz poznatih veličina k (osnovne jedinice): {iz, f(k) → osnovna vrijednost, formula, oznaka}
// ili null ako se q još ne može izračunati.
function pravilo(q, k, s) {
  const plin = plinOf(s);
  const ot = otopinaOf(s);
  const ima = (x) => isNum(k[x]);
  if (q === "n") {
    for (const x of Object.keys(k)) {
      if (x === "m" && ima("M"))
        return {
          iz: ["m", "M"],
          f: (k) => k.m / k.M,
          formula: "n = m : M",
          op: ": M",
        };
      if (x === "N")
        return {
          iz: ["N"],
          f: (k) => k.N / NA,
          formula: "n = N : N_A",
          op: ": N_A",
        };
      if (x === "V" && plin)
        return plin.normirani
          ? {
              iz: ["V"],
              f: (k) => k.V / VM,
              formula: "n = V : V_m",
              op: ": V_m",
            }
          : {
              iz: ["V"],
              f: (k) => (plin.p * (k.V / 1000)) / (R * plin.T),
              formula: "n = pV : (RT)",
              op: "· p : (RT)",
            };
      if (x === "c" && ot)
        return {
          iz: ["c"],
          f: (k) => k.c * ot.V,
          formula: "n = c · V(otopine)",
          op: "· V(otopine)",
        };
    }
    return null;
  }
  if (q === "M") {
    if (ima("m") && ima("n"))
      return {
        iz: ["m", "n"],
        f: (k) => k.m / k.n,
        formula: "M = m : n",
        op: "m : n",
      };
    if (s.tvar && molarnaMasa(s.tvar))
      return {
        iz: [],
        f: () => molarnaMasa(s.tvar),
        formula: "M = zbroj Ar",
        op: "zbroj Ar",
      };
    return null;
  }
  if (!ima("n")) return null;
  if (q === "m")
    return ima("M")
      ? { iz: ["n", "M"], f: (k) => k.n * k.M, formula: "m = n · M", op: "· M" }
      : null;
  if (q === "N")
    return {
      iz: ["n"],
      f: (k) => k.n * NA,
      formula: "N = n · N_A",
      op: "· N_A",
    };
  if (q === "V" && plin)
    return plin.normirani
      ? { iz: ["n"], f: (k) => k.n * VM, formula: "V = n · V_m", op: "· V_m" }
      : {
          iz: ["n"],
          f: (k) => ((k.n * R * plin.T) / plin.p) * 1000,
          formula: "V = nRT : p",
          op: "· RT : p",
        };
  if (q === "c" && ot)
    return {
      iz: ["n"],
      f: (k) => k.n / ot.V,
      formula: "c = n : V(otopine)",
      op: ": V(otopine)",
    };
  return null;
}

// Početno poznato: zadane veličine (osnovne jedinice) i M ako nije korak. `prvi` zamjenjuje iznos prve zadane
// veličine (klizač u istraživanju), u jedinici speca.
function pocetno(s, prvi) {
  const k = {};
  zadaniOf(s).forEach((z, i) => {
    const v = i === 0 && isNum(prvi) ? prvi : z.vrijednost;
    k[z.velicina] = v * faktor(z.velicina, z.jedinica);
  });
  if (!mJeKorak(s)) {
    const M = zadanaM(s);
    if (isNum(M)) k.M = M;
  }
  return k;
}

// Cijeli lanac: koraci s osnovnom vrijednošću i vrijednošću u traženoj jedinici. Korak koji se ne da izračunati
// ima pravilo null (validate to prijavljuje).
export function lanac(s, prvi) {
  const k = pocetno(s, prvi);
  const koraci = traziOf(s).map((t) => {
    const p = pravilo(t.velicina, k, s);
    if (!p) return { ...t, pravilo: null, osnovna: NaN, vrijednost: NaN };
    const osnovna = p.f(k);
    k[t.velicina] = osnovna;
    return {
      ...t,
      pravilo: p,
      osnovna,
      vrijednost: osnovna / faktor(t.velicina, t.jedinica),
    };
  });
  return { poznato: k, koraci };
}

// ── tipične greške koraka: [{osnovna | vrijednost, poruka}] iz poznatih vrijednosti k ──
function greske(q, p, k, s) {
  const out = [];
  const add = (osnovna, poruka) =>
    isNum(osnovna) && osnovna > 0 && out.push({ osnovna, poruka });
  const plin = plinOf(s);
  const ot = otopinaOf(s);
  const zad = Object.fromEntries(zadaniOf(s).map((z) => [z.velicina, z]));
  // zadani iznos uzet kao da je već u osnovnoj jedinici (mg kao g, mmol kao mol, mL kao L)
  const sirovo = (x) =>
    zad[x] && faktor(x, zad[x].jedinica) !== 1 ? zad[x].vrijednost : null;
  const ZADANA = {
    m: "Masa je zadana",
    n: "Množina je zadana",
    V: "Volumen je zadan",
    c: "Koncentracija je zadana",
  };
  const nePretvoreno = (x, kako) => {
    const r = sirovo(x);
    if (r != null)
      add(p.f({ ...k, [x]: r }), `${ZADANA[x]} u ${zad[x].jedinica}: ${kako}.`);
  };
  const POTENCIJA = "Pazi na potenciju: N_A = 6,02×10²³ mol⁻¹.";
  const formulaM = !isNum(s.M) && s.tvar && p.iz.includes("M") && !mJeKorak(s);
  const kriveMase = formulaM ? kriveM(s.tvar) : [];

  if (q === "n" && p.iz[0] === "m") {
    add(
      k.m * k.M,
      "Masa je pomnožena s M. Množina je n = m : M, masu treba podijeliti molarnom masom.",
    );
    for (const a of kriveMase)
      add(k.m / a.M, `Za M je uzeto ${zapisM(a.M)}: ${a.poruka}`);
    nePretvoreno("m", "najprije je pretvori u grame");
  }
  if (q === "m") {
    add(k.n / k.M, "Množina je podijeljena s M. Masa je m = n · M.");
    for (const a of kriveMase)
      add(k.n * a.M, `Za M je uzeto ${zapisM(a.M)}: ${a.poruka}`);
  }
  if (q === "N") {
    add(k.n / NA, "Množina je podijeljena s N_A. Broj čestica je N = n · N_A.");
    for (const f of [6.02e22, 6.02e24, 6.02e-23]) add(k.n * f, POTENCIJA);
  }
  if (q === "n" && p.iz[0] === "N") {
    add(k.N * NA, "Broj čestica je pomnožen s N_A. Množina je n = N : N_A.");
    for (const f of [6.02e22, 6.02e24]) add(k.N / f, POTENCIJA);
  }
  if (q === "V" && plin?.normirani)
    add(
      k.n / VM,
      "Množina je podijeljena s V_m. Volumen plina je V = n · V_m.",
    );
  if (q === "n" && p.iz[0] === "V" && plin?.normirani) {
    add(k.V * VM, "Volumen je pomnožen s V_m. Množina je n = V : V_m.");
    nePretvoreno("V", "V_m je 22,4 L/mol, pa ga najprije pretvori u litre");
  }
  if (
    plin &&
    !plin.normirani &&
    (q === "V" || (q === "n" && p.iz[0] === "V"))
  ) {
    const VM_PORUKA =
      "22,4 L/mol vrijedi samo pri 0 °C i 101 kPa (normirani uvjeti). Ovdje uvjeti nisu normirani: računaj iz pV = nRT.";
    const T_PORUKA = "Temperaturu uvrsti u kelvinima: T = t + 273.";
    const P_PORUKA = `Tlak uvrsti u paskalima (${formatNumber(plin.pZadano)} ${plin.pj} = ${formatSci(plin.p)} Pa), jer je R = 8,31 Pa m³ K⁻¹ mol⁻¹.`;
    const V_PORUKA =
      "U pV = nRT volumen ide u m³ (1 L = 0,001 m³), jer je R = 8,31 Pa m³ K⁻¹ mol⁻¹.";
    if (q === "V") {
      add(k.n * VM, VM_PORUKA);
      if (plin.t) add(((k.n * R * plin.t) / plin.p) * 1000, T_PORUKA);
      if (plin.pj !== "Pa")
        add(((k.n * R * plin.T) / plin.pZadano) * 1000, P_PORUKA);
      // V iz pV = nRT izlazi u m³; broj u m³ zapisan kao litre
      add(
        (k.n * R * plin.T) / plin.p,
        "Iz pV = nRT volumen izlazi u m³ (uz p u Pa). Pretvori ga u traženu jedinicu: 1 m³ = 1000 L.",
      );
    } else {
      add(k.V / VM, VM_PORUKA);
      if (plin.t) add((plin.p * (k.V / 1000)) / (R * plin.t), T_PORUKA);
      if (plin.pj !== "Pa")
        add((plin.pZadano * (k.V / 1000)) / (R * plin.T), P_PORUKA);
      add((plin.p * k.V) / (R * plin.T), V_PORUKA);
      if (sirovo("V") != null)
        add((plin.p * sirovo("V")) / (R * plin.T), V_PORUKA);
    }
  }
  if (q === "c" && ot) {
    add(
      k.n * ot.V,
      "Množina je pomnožena s volumenom. Koncentracija je c = n : V.",
    );
    if (ot.zadano !== ot.V)
      add(
        k.n / ot.zadano,
        `Volumen otopine je u ${ot.jedinica}: za c ga pretvori u dm³ (${formatNumber(ot.zadano)} ${ot.jedinica} = ${formatNumber(ot.V)} dm³).`,
      );
  }
  if (q === "n" && p.iz[0] === "c" && ot) {
    add(
      k.c / ot.V,
      "Koncentracija je podijeljena s volumenom. Množina je n = c · V.",
    );
    if (ot.zadano !== ot.V)
      add(
        k.c * ot.zadano,
        `Volumen otopine je u ${ot.jedinica}: za n ga pretvori u dm³ (${formatNumber(ot.zadano)} ${ot.jedinica} = ${formatNumber(ot.V)} dm³).`,
      );
    nePretvoreno("c", "najprije je pretvori u mol/dm³");
  }
  if (q === "M" && p.iz.length === 2) {
    add(k.n / k.m, "Omjer je obrnut: M = m : n (masa kroz množinu).");
    add(k.m * k.n, "Masa je pomnožena s množinom. Molarna masa je M = m : n.");
  }
  if (q === "M" && p.iz.length === 0)
    for (const a of kriveM(s.tvar))
      add(a.M, `Ispada ${zapisM(a.M)}: ${a.poruka}`);
  // zadana množina u mmol uzeta kao mol
  if (p.iz[0] === "n")
    nePretvoreno("n", "najprije je pretvori u mol (1 mmol = 0,001 mol)");
  return out;
}

// Krive vrijednosti koraka u njegovoj jedinici: posebne greške, autorove (krivo), isti iznos u drugoj jedinici,
// prepisan broj iz prethodnog koraka.
function kriveKoraka(s, i, korak, k, tocne) {
  const f = faktor(korak.velicina, korak.jedinica);
  const out = greske(korak.velicina, korak.pravilo, k, s).map((g) => ({
    vrijednost: g.osnovna / f,
    poruka: g.poruka,
  }));
  for (const kr of s.krivo ?? [])
    if ((kr.korak ?? traziOf(s).length - 1) === i)
      out.push({ vrijednost: kr.vrijednost, poruka: kr.poruka });
  for (const u of DRUGE[korak.velicina] ?? [])
    if (faktor(korak.velicina, u) !== f)
      out.push({
        vrijednost: korak.osnovna / faktor(korak.velicina, u),
        poruka: `To je ${IME[korak.velicina]} u ${u}, a traži se u ${korak.jedinica}.`,
      });
  const izvor = korak.pravilo.iz[0];
  if (izvor && izvor !== "M" && isNum(k[izvor])) {
    const z = zadaniOf(s).find((x) => x.velicina === izvor);
    const t = traziOf(s).find((x) => x.velicina === izvor);
    const j = z?.jedinica ?? t?.jedinica ?? OSNOVNA[izvor];
    out.push({
      vrijednost: k[izvor] / faktor(izvor, j),
      poruka: `To je ${IME[izvor]} (${izvor}), a ovdje se traži ${IME[korak.velicina]} (${korak.velicina}).`,
    });
  }
  return out.filter(
    (g) =>
      isNum(g.vrijednost) &&
      tocne.every((t) => !near(g.vrijednost, t, Math.abs(t) * 0.005)),
  );
}

// N se upisuje bez jedinice; riječ „čestica / molekula …“ na kraju se zanemaruje.
const bezRijeci = (v) =>
  String(v ?? "").replace(
    /\s*(čestica|čestice|molekula|molekule|atoma|atomi|iona|ioni|formulskih jedinki|jedinki)\s*$/i,
    "",
  );

export const zapisVrijednosti = (v, u) => `${formatSci(v)}${u ? ` ${u}` : ""}`;

export const mol_racun = {
  tip: "mol_racun",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Lanac računa s množinom: m ↔ n ↔ N ↔ V(plina) ↔ c(otopine), uz molarnu masu iz Ar s lista mature (kod je računa iz formule).
Polja: tekst, tvar ("NaCl", "CuSO₄·5H₂O", "CO₂"; ASCII "H2O" također), naziv?, M? (g/mol; samo ako nema formule, a s formulom se mora slagati),
zadano: {velicina: ${ZADANE.join(" | ")}, vrijednost, jedinica, zapis?} ili popis od dvije (npr. V i m za M = m : n); zapis? je isti broj kako ga piše tekst kad su važne nule na kraju („2,10“),
jedinice: ${ZADANE.map((q) => `${q}: ${Object.keys(JEDINICE[q]).filter(Boolean).join(", ") || "bez jedinice"}`).join("; ")}; M: g/mol,
plin?: {uvjeti: "normirani"} (V_m = 22,4 L/mol) ili {p, jedinica: "kPa" (Pa | hPa | kPa | MPa | bar), T (K) ili t (°C)} za pV = nRT – treba uz svaki V,
otopina?: {V, jedinica: "L" | "dm³" | "mL" | "cm³", zapis?} – volumen otopine, treba uz svaki c,
trazi: popis 1–3 koraka [{velicina: ${TRAZENE.join(" | ")}, jedinica?}] redom kojim se računaju; svaki ide preko n (m → n → N, n → V, c → n → m),
M kao korak: iz formule (prije n) ili M = m : n kad su m i n poznati.
operacije? (strelice s „: M“, „· N_A“…; zadano samo u istrazi), pokazi_M? (zadano samo u istrazi), pokazi_ar? (Ar elemenata s lista; zadano samo u molarna_masa),
tolerancija_posto? (zadano 1), nacin:
- "istrazi" (nije zadatak): klizač za prvu zadanu veličinu, raspon? [od, do]; svi koraci računaju se uživo;
- "izracunaj": učenik upisuje vrijednost svakog koraka; svaki se provjerava (i iz učenikova prethodnog rezultata);
- "molarna_masa": učenik iz formule računa M (bez zadano i trazi); Ar s lista se smiju pokazati, zbroj ne.
Točne vrijednosti i tipične greške (množenje umjesto dijeljenja s M, zaboravljen indeks, 22,4 L/mol uz nenormirane uvjete, °C umjesto K,
kPa umjesto Pa, L umjesto m³, mmol/mol, mg/g, mL/dm³ kod c, potencija N_A) računa kod. krivo?: [{korak? (indeks, zadano zadnji), vrijednost, poruka}]`,
  primjer: {
    tip: "mol_racun",
    nacin: "izracunaj",
    tekst:
      "U 1,00 L fiziološke otopine otopljeno je 9,0 g natrijeva klorida. Izračunaj množinu NaCl i množinsku koncentraciju otopine.",
    tvar: "NaCl",
    naziv: "natrijev klorid",
    zadano: { velicina: "m", vrijednost: 9.0, jedinica: "g", zapis: "9,0" },
    otopina: { V: 1.0, jedinica: "L", zapis: "1,00" },
    trazi: [
      { velicina: "n", jedinica: "mol" },
      { velicina: "c", jedinica: "mol/dm³" },
    ],
  },
  primjeri: [
    {
      tip: "mol_racun",
      nacin: "istrazi",
      tekst:
        "Pomiči klizač mase vode i gledaj kako se mijenjaju množina i broj molekula.",
      tvar: "H₂O",
      naziv: "voda",
      zadano: { velicina: "m", vrijednost: 9.0, jedinica: "g", zapis: "9,0" },
      raspon: [1, 36],
      trazi: [
        { velicina: "n", jedinica: "mol" },
        { velicina: "N", jedinica: "molekula" },
      ],
    },
    {
      tip: "mol_racun",
      nacin: "molarna_masa",
      tekst: "Izračunaj molarnu masu modre galice.",
      tvar: "CuSO₄·5H₂O",
      naziv: "modra galica",
    },
    {
      tip: "mol_racun",
      nacin: "izracunaj",
      tekst:
        "Koliki volumen pri normiranim uvjetima zauzima 0,25 mol ugljikova dioksida?",
      tvar: "CO₂",
      zadano: { velicina: "n", vrijednost: 0.25, jedinica: "mol" },
      plin: { uvjeti: "normirani" },
      trazi: [{ velicina: "V", jedinica: "L" }],
    },
    {
      tip: "mol_racun",
      nacin: "izracunaj",
      tekst:
        "U boci obujma 1,24 L nalazi se 2,10 g plinovitog ugljikovodika pri 25 °C i 100 kPa. Izračunaj množinu plina i njegovu molarnu masu.",
      naziv: "plinoviti ugljikovodik",
      zadano: [
        { velicina: "V", vrijednost: 1.24, jedinica: "L" },
        { velicina: "m", vrijednost: 2.1, jedinica: "g", zapis: "2,10" },
      ],
      plin: { p: 100, jedinica: "kPa", t: 25 },
      trazi: [
        { velicina: "n", jedinica: "mol" },
        { velicina: "M", jedinica: "g/mol" },
      ],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (
      !need(
        NACINI.includes(s.nacin),
        `mol_racun.nacin mora biti jedan od: ${NACINI.join(", ")}`,
      )
    )
      return list;
    need(isText(s.tekst), "mol_racun treba „tekst“");
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    for (const b of ["operacije", "pokazi_M", "pokazi_ar"])
      if (s[b] != null)
        need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (s.tolerancija_posto != null)
      need(
        isNum(s.tolerancija_posto) &&
          s.tolerancija_posto > 0 &&
          s.tolerancija_posto <= 5,
        "tolerancija_posto je broj između 0 i 5",
      );
    if (s.naziv != null) need(isText(s.naziv), "naziv mora biti tekst");

    let Mformule = null;
    if (s.tvar != null) {
      if (
        need(
          isText(s.tvar),
          'tvar mora biti formula (tekst), npr. "NaCl" ili "CuSO₄·5H₂O"',
        )
      ) {
        const a = atomiOd(s.tvar);
        if (
          need(
            a,
            `formula „${s.tvar}“ se ne da pročitati ili ima simbol kojeg nema u periodnom sustavu`,
          )
        ) {
          Mformule = molarnaMasa(s.tvar);
          need(
            Mformule,
            `formula „${s.tvar}“ ima element bez stalne Ar na listu (nestabilan element)`,
          );
        }
      }
    }
    if (
      s.M != null &&
      need(isNum(s.M) && s.M > 0, "M mora biti pozitivan broj (g/mol)") &&
      Mformule
    )
      need(
        Math.abs(s.M - Mformule) <= 0.005 * Mformule,
        `M = ${formatNumber(s.M)} g/mol ne slaže se s M(${formulaZapis(s.tvar)}) = ${formatNumber(zaokruziM(Mformule))} g/mol iz Ar s lista (izostavi M, kod ga računa sam)`,
      );

    if (s.nacin === "molarna_masa") {
      need(Mformule, "molarna_masa treba tvar (formulu)");
      for (const f of ["zadano", "trazi", "plin", "otopina", "raspon"])
        need(!(f in s), `molarna_masa ne koristi „${f}“`);
      need(s.M == null, "molarna_masa ne smije imati zadan M (to je odgovor)");
      need(
        s.pokazi_M !== true,
        "molarna_masa ne smije pokazati M (to je odgovor)",
      );
      if (
        s.krivo != null &&
        need(Array.isArray(s.krivo), "krivo mora biti popis") &&
        Mformule
      )
        s.krivo.forEach((k, i) => {
          need(
            isNum(k?.vrijednost) && isText(k?.poruka),
            `krivo[${i}] treba vrijednost (broj) i poruku`,
          );
          if (isNum(k?.vrijednost))
            need(
              Math.abs(k.vrijednost - Mformule) > 0.005 * Mformule,
              `krivo[${i}].vrijednost je točan odgovor`,
            );
        });
      return list;
    }

    // zadano
    const zadani = zadaniOf(s);
    if (
      !need(
        zadani.length >= 1 && zadani.length <= 2,
        "zadano je jedna veličina {velicina, vrijednost, jedinica} ili popis od dvije",
      )
    )
      return list;
    zadani.forEach((z, i) => {
      const at = zadani.length > 1 ? `zadano[${i}]` : "zadano";
      if (
        !need(
          ZADANE.includes(z.velicina),
          `${at}.velicina mora biti jedna od: ${ZADANE.join(", ")} (M se zadaje poljem M ili formulom)`,
        )
      )
        return;
      need(
        isNum(z.vrijednost) && z.vrijednost > 0,
        `${at}.vrijednost mora biti pozitivan broj`,
      );
      if (z.zapis != null)
        need(
          isText(z.zapis) && Number(z.zapis.replace(",", ".")) === z.vrijednost,
          `${at}.zapis („${z.zapis}“) mora biti isti broj kao vrijednost (${z.vrijednost}), samo s decimalnim zarezom`,
        );
      need(
        faktor(z.velicina, z.jedinica) != null,
        `${at}.jedinica za ${z.velicina} mora biti jedna od: ${Object.keys(
          JEDINICE[z.velicina],
        )
          .map((u) => u || "(bez jedinice)")
          .join(", ")}`,
      );
    });
    need(
      new Set(zadani.map((z) => z.velicina)).size === zadani.length,
      "dvije zadane veličine moraju biti različite",
    );

    // trazi
    const trazeni = traziOf(s);
    if (
      !need(
        trazeni.length >= 1 && trazeni.length <= 3,
        "trazi je popis 1–3 koraka [{velicina, jedinica}]",
      )
    )
      return list;
    trazeni.forEach((t, i) => {
      if (
        !need(
          TRAZENE.includes(t.velicina),
          `trazi[${i}].velicina mora biti jedna od: ${TRAZENE.join(", ")}`,
        )
      )
        return;
      need(
        faktor(t.velicina, t.jedinica) != null,
        `trazi[${i}].jedinica za ${t.velicina} mora biti jedna od: ${Object.keys(
          JEDINICE[t.velicina],
        )
          .map((u) => u || "(bez jedinice)")
          .join(", ")}`,
      );
    });
    const sve = [...zadani, ...trazeni].map((x) => x.velicina);
    need(
      new Set(sve).size === sve.length,
      "svaka veličina je u lancu samo jednom (ni zadana ni tražena dvaput)",
    );
    if (mJeKorak(s))
      need(s.M == null, "M je traženi korak, pa ne smije biti zadan");
    if (s.pokazi_M && mJeKorak(s))
      need(false, "pokazi_M ne ide uz korak M (otkrio bi odgovor)");

    // plin i otopina
    const imaV = sve.includes("V");
    const imaC = sve.includes("c");
    if (s.plin != null) {
      const g = s.plin;
      if (g?.uvjeti != null) {
        need(
          g.uvjeti === "normirani",
          'plin.uvjeti može biti samo "normirani" (inače zadaj p i T)',
        );
        need(
          !("p" in g) && !("T" in g) && !("t" in g),
          "uz normirane uvjete ne zadaju se p ni T",
        );
      } else {
        need(
          isNum(g?.p) && g.p > 0,
          'plin treba uvjeti: "normirani" ili tlak p > 0',
        );
        need(
          g?.jedinica == null || g.jedinica in P_JEDINICE,
          `plin.jedinica (tlaka) mora biti jedna od: ${Object.keys(P_JEDINICE).join(", ")}`,
        );
        need(
          isNum(g?.T) !== isNum(g?.t),
          "plin treba temperaturu: T (K) ili t (°C), ne oboje",
        );
        if (isNum(g?.T))
          need(g.T > 0, "plin.T je u kelvinima i mora biti veća od 0");
        if (isNum(g?.t))
          need(g.t > -T0, "plin.t je u °C i mora biti iznad −273 °C");
      }
      need(imaV, "plin je zadan, a u lancu nema volumena plina (V)");
    } else
      need(
        !imaV,
        'volumen plina (V) treba plin: {uvjeti: "normirani"} ili {p, jedinica, T ili t}',
      );
    if (s.otopina != null) {
      need(
        isNum(s.otopina?.V) && s.otopina.V > 0,
        "otopina.V mora biti pozitivan broj",
      );
      if (s.otopina?.zapis != null)
        need(
          isText(s.otopina.zapis) && Number(s.otopina.zapis.replace(",", ".")) === s.otopina.V,
          `otopina.zapis („${s.otopina.zapis}“) mora biti isti broj kao otopina.V`,
        );
      need(
        faktor("V", normJedinica("V", s.otopina?.jedinica ?? "L")) != null,
        `otopina.jedinica mora biti jedna od: ${Object.keys(JEDINICE.V).join(", ")}`,
      );
      need(imaC, "otopina je zadana, a u lancu nema koncentracije (c)");
    } else
      need(
        !imaC,
        "koncentracija (c) treba otopina: {V, jedinica} – volumen otopine",
      );
    if (list.length) return list;

    // M: potreban za korak m ↔ n, a ne zna se
    if (!mJeKorak(s) && sve.includes("m") && !isNum(zadanaM(s)))
      need(false, "za m ↔ n treba tvar (formula) ili M");

    // svaki korak mora se dati izračunati, redom
    const k = pocetno(s);
    const korisceno = new Set();
    trazeni.forEach((t, i) => {
      const p = pravilo(t.velicina, k, s);
      const poznate = Object.keys(k).filter((x) => x !== "M");
      if (
        !need(
          p,
          `trazi[${i}] (${t.velicina}) ne može se izračunati iz ${poznate.join(", ")}: lanac ide preko množine (npr. m → n → N), a M treba formulu ili m i n`,
        )
      ) {
        k[t.velicina] = NaN;
        return;
      }
      p.iz.forEach((x) => korisceno.add(x));
      k[t.velicina] = p.f(k);
      need(
        isNum(k[t.velicina]) && k[t.velicina] > 0,
        `trazi[${i}] (${t.velicina}) ne daje pozitivan broj`,
      );
    });
    for (const z of zadani)
      need(
        korisceno.has(z.velicina),
        `zadano ${z.velicina} se ne koristi ni u jednom koraku lanca`,
      );
    // dvije zadane veličine koje obje daju n moraju se slagati
    if (zadani.length === 2) {
      const k0 = pocetno(s);
      const nIz = zadani
        .map((z) => {
          const p = pravilo(
            "n",
            { [z.velicina]: k0[z.velicina], ...(isNum(k0.M) && { M: k0.M }) },
            s,
          );
          return p && p.iz[0] === z.velicina ? { z, n: p.f({ ...k0 }) } : null;
        })
        .filter(Boolean);
      if (nIz.length === 2 && !zadani.some((z) => z.velicina === "n"))
        need(
          Math.abs(nIz[0].n - nIz[1].n) <= 0.01 * nIz[0].n,
          `zadani podaci se ne slažu: iz ${nIz[0].z.velicina} slijedi n = ${formatSci(nIz[0].n)} mol, a iz ${nIz[1].z.velicina} n = ${formatSci(nIz[1].n)} mol`,
        );
      if (zadani.some((z) => z.velicina === "n") && nIz.length) {
        const nZ = k0.n;
        const drugi = nIz.find((x) => x.z.velicina !== "n");
        if (drugi)
          need(
            Math.abs(drugi.n - nZ) <= 0.01 * nZ,
            `zadani podaci se ne slažu: zadano je n = ${formatSci(nZ)} mol, a iz ${drugi.z.velicina} slijedi n = ${formatSci(drugi.n)} mol`,
          );
      }
    }

    if (s.nacin === "istrazi" && s.raspon != null) {
      const r = s.raspon;
      need(
        Array.isArray(r) &&
          r.length === 2 &&
          r.every(isNum) &&
          r[0] > 0 &&
          r[1] > r[0],
        "raspon je [od, do] s 0 < od < do",
      );
      if (Array.isArray(r) && isNum(zadani[0]?.vrijednost))
        need(
          zadani[0].vrijednost >= r[0] && zadani[0].vrijednost <= r[1],
          "početna zadana vrijednost mora biti unutar raspona",
        );
    }
    if (
      s.nacin === "izracunaj" &&
      s.krivo != null &&
      need(Array.isArray(s.krivo), "krivo mora biti popis")
    ) {
      const { koraci } = lanac(s);
      s.krivo.forEach((kr, i) => {
        const j = kr?.korak ?? koraci.length - 1;
        if (
          !need(
            Number.isInteger(j) && j >= 0 && j < koraci.length,
            `krivo[${i}].korak mora biti indeks koraka iz trazi`,
          )
        )
          return;
        need(
          isNum(kr?.vrijednost) && isText(kr?.poruka),
          `krivo[${i}] treba vrijednost (broj) i poruku`,
        );
        if (isNum(kr?.vrijednost))
          need(
            !near(
              kr.vrijednost,
              koraci[j].vrijednost,
              Math.abs(koraci[j].vrijednost) * 0.005,
            ),
            `krivo[${i}].vrijednost je točan odgovor`,
          );
      });
    }
    if (s.nacin === "izracunaj")
      need(s.raspon == null, "raspon je samo za istrazi");
    return list;
  },

  // odgovor: popis upisa (po jedan za svaki korak iz trazi) ili, u načinu molarna_masa, jedan upis
  check(s, odgovor) {
    const pct = (s.tolerancija_posto ?? 1) / 100;
    if (s.nacin === "molarna_masa") {
      const M = molarnaMasa(s.tvar);
      const krivo = [
        ...(s.krivo ?? []),
        ...kriveM(s.tvar).map((a) => ({
          vrijednost: a.M,
          poruka: `Ispada ${zapisM(a.M)}: ${a.poruka}`,
        })),
      ];
      return checkNumber({
        input: Array.isArray(odgovor) ? odgovor[0] : odgovor,
        answer: M,
        tol: M * Math.min(pct, 0.005),
        unit: "g/mol",
        krivo,
        savjet:
          "Zbroji Ar svih atoma u formuli: Ar svakog elementa pomnoži brojem njegovih atoma.",
      });
    }
    if (s.nacin !== "izracunaj")
      return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    const { koraci } = lanac(s);
    const unosi = [].concat(odgovor ?? []);
    const k = pocetno(s); // poznato, s učenikovim (prihvaćenim) vrijednostima
    for (let i = 0; i < koraci.length; i++) {
      const kor = koraci[i];
      const f = faktor(kor.velicina, kor.jedinica);
      // i iz učenikova prethodnog rezultata (zaokružen n = 0,15 vodi na nešto drugačiji N)
      const izUcenika = kor.pravilo.f(k) / f;
      const tocne = [kor.vrijednost, izUcenika];
      const ulaz =
        kor.velicina === "N" ? bezRijeci(unosi[i]) : (unosi[i] ?? "");
      const r = checkNumber({
        input: ulaz,
        answer: kor.vrijednost,
        tol: Math.abs(kor.vrijednost) * pct,
        unit: kor.jedinica,
        krivo: kriveKoraka(s, i, kor, k, tocne),
        savjet:
          s.savjet || `Pogledaj formulu: ${kor.pravilo.formula}, i jedinice.`,
      });
      const broj = parseNumber(ulaz, kor.jedinica);
      const ok =
        r.tocno ||
        (isNum(broj) && near(broj, izUcenika, Math.abs(izUcenika) * pct));
      if (!ok)
        return koraci.length > 1
          ? { ...r, praznina: i, poruka: `${kor.velicina}: ${r.poruka}` }
          : { ...r, praznina: 0 };
      k[kor.velicina] = broj * f;
    }
    return { tocno: true };
  },

  brojcaniOdgovor(s) {
    if (s.nacin === "molarna_masa") return zaokruziM(molarnaMasa(s.tvar));
    if (s.nacin !== "izracunaj") return null;
    const v = lanac(s).koraci.at(-1)?.vrijednost;
    return isNum(v) ? Number(v.toPrecision(3)) : null;
  },

  tocanOdgovor(s) {
    if (s.nacin === "molarna_masa") {
      const M = molarnaMasa(s.tvar);
      return `M(${formulaZapis(s.tvar)}) = ${zbrojAr(s.tvar)} = ${zapisM(M)}`;
    }
    const zad = zadaniOf(s)
      .map(
        (z) =>
          `${z.velicina} = ${formatNumber(z.vrijednost)}${z.jedinica ? ` ${z.jedinica}` : ""}`,
      )
      .join(", ");
    const kor = lanac(s).koraci.map((k) =>
      k.velicina === "M" && s.tvar && k.pravilo?.iz.length === 0
        ? `M(${formulaZapis(s.tvar)}) = ${zapisM(k.vrijednost)}`
        : `${k.velicina} = ${zapisVrijednosti(k.vrijednost, k.jedinica)}`,
    );
    return [zad, ...kor].join(" → ");
  },
};
