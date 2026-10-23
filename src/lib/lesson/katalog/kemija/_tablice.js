// Podaci iz „Kemija – tablice“ (prilog ispitu državne mature iz kemije 2025./2026.): periodni sustav (Ar), temeljne
// prirodne konstante i standardni elektrodni potencijali. Prepisano s ispitnog lista, broj po broj: svi kemijski
// widgeti računaju s ovim vrijednostima, pa učenik u lekciji dobiva iste brojeve kao na maturi (npr. Ar(Ag) = 108,
// Ar(H) = 1,01, a ne 107,87 ni 1,008).
//
// Uz to (nije na ispitnom listu, samo za prikaz trendova u periodnom sustavu): elektronegativnost po Paulingu i prva
// energija ionizacije (kJ/mol). Ti se brojevi ne traže kao odgovor.

// [Z, simbol, hrvatski naziv, Ar kao na listu (broj ili "[98]" za nestabilne)]
const PSE = [
  [1, "H", "vodik", 1.01], [2, "He", "helij", 4.0], [3, "Li", "litij", 6.94], [4, "Be", "berilij", 9.01],
  [5, "B", "bor", 10.8], [6, "C", "ugljik", 12.0], [7, "N", "dušik", 14.0], [8, "O", "kisik", 16.0],
  [9, "F", "fluor", 19.0], [10, "Ne", "neon", 20.2], [11, "Na", "natrij", 23.0], [12, "Mg", "magnezij", 24.3],
  [13, "Al", "aluminij", 27.0], [14, "Si", "silicij", 28.1], [15, "P", "fosfor", 31.0], [16, "S", "sumpor", 32.1],
  [17, "Cl", "klor", 35.5], [18, "Ar", "argon", 39.9], [19, "K", "kalij", 39.1], [20, "Ca", "kalcij", 40.1],
  [21, "Sc", "skandij", 45.0], [22, "Ti", "titanij", 47.9], [23, "V", "vanadij", 50.9], [24, "Cr", "krom", 52.0],
  [25, "Mn", "mangan", 54.9], [26, "Fe", "željezo", 55.8], [27, "Co", "kobalt", 58.9], [28, "Ni", "nikal", 58.7],
  [29, "Cu", "bakar", 63.5], [30, "Zn", "cink", 65.4], [31, "Ga", "galij", 69.7], [32, "Ge", "germanij", 72.6],
  [33, "As", "arsen", 74.9], [34, "Se", "selenij", 79.0], [35, "Br", "brom", 79.9], [36, "Kr", "kripton", 83.8],
  [37, "Rb", "rubidij", 85.5], [38, "Sr", "stroncij", 87.6], [39, "Y", "itrij", 88.9], [40, "Zr", "cirkonij", 91.2],
  [41, "Nb", "niobij", 92.9], [42, "Mo", "molibden", 95.9], [43, "Tc", "tehnecij", "[98]"], [44, "Ru", "rutenij", 101],
  [45, "Rh", "rodij", 103], [46, "Pd", "paladij", 106], [47, "Ag", "srebro", 108], [48, "Cd", "kadmij", 112],
  [49, "In", "indij", 115], [50, "Sn", "kositar", 119], [51, "Sb", "antimon", 122], [52, "Te", "telurij", 128],
  [53, "I", "jod", 127], [54, "Xe", "ksenon", 131], [55, "Cs", "cezij", 133], [56, "Ba", "barij", 137],
  [57, "La", "lantan", 139], [58, "Ce", "cerij", 140], [59, "Pr", "prazeodimij", 141], [60, "Nd", "neodimij", 144],
  [61, "Pm", "prometij", "[145]"], [62, "Sm", "samarij", 150], [63, "Eu", "europij", 152], [64, "Gd", "gadolinij", 157],
  [65, "Tb", "terbij", 159], [66, "Dy", "disprozij", 163], [67, "Ho", "holmij", 165], [68, "Er", "erbij", 167],
  [69, "Tm", "tulij", 169], [70, "Yb", "iterbij", 173], [71, "Lu", "lutecij", 175], [72, "Hf", "hafnij", 178],
  [73, "Ta", "tantal", 181], [74, "W", "volfram", 184], [75, "Re", "renij", 186], [76, "Os", "osmij", 190],
  [77, "Ir", "iridij", 192], [78, "Pt", "platina", 195], [79, "Au", "zlato", 197], [80, "Hg", "živa", 201],
  [81, "Tl", "talij", 204], [82, "Pb", "olovo", 207], [83, "Bi", "bizmut", 209], [84, "Po", "polonij", "[209]"],
  [85, "At", "astat", "[210]"], [86, "Rn", "radon", "[222]"], [87, "Fr", "francij", "[223]"], [88, "Ra", "radij", "[226]"],
  [89, "Ac", "aktinij", "[227]"], [90, "Th", "torij", 232], [91, "Pa", "protaktinij", 231], [92, "U", "uranij", 238],
  [93, "Np", "neptunij", "[237]"], [94, "Pu", "plutonij", "[244]"], [95, "Am", "americij", "[243]"], [96, "Cm", "kirij", "[247]"],
  [97, "Bk", "berkelij", "[247]"], [98, "Cf", "kalifornij", "[251]"], [99, "Es", "einsteinij", "[252]"], [100, "Fm", "fermij", "[257]"],
  [101, "Md", "mendelevij", "[258]"], [102, "No", "nobelij", "[259]"], [103, "Lr", "lorencij", "[262]"],
  [104, "Rf", "raderfordij", "[261]"], [105, "Db", "dubnij", "[262]"], [106, "Sg", "siborgij", "[266]"], [107, "Bh", "borij", "[264]"],
  [108, "Hs", "hasij", "[277]"], [109, "Mt", "majtnerij", "[268]"], [110, "Ds", "darmštatij", "[269]"], [111, "Rg", "rendgenij", "[272]"],
  [112, "Cn", "kopernicij", "[285]"],
];

// Elektronegativnost (Pauling) i prva energija ionizacije (kJ/mol), samo za prikaz trendova.
const EN = {
  H: 2.2, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.9,
  P: 2.19, S: 2.58, Cl: 3.16, K: 0.82, Ca: 1.0, Sc: 1.36, Ti: 1.54, V: 1.63, Cr: 1.66, Mn: 1.55, Fe: 1.83, Co: 1.88,
  Ni: 1.91, Cu: 1.9, Zn: 1.65, Ga: 1.81, Ge: 2.01, As: 2.18, Se: 2.55, Br: 2.96, Kr: 3.0, Rb: 0.82, Sr: 0.95, Y: 1.22,
  Zr: 1.33, Nb: 1.6, Mo: 2.16, Ru: 2.2, Rh: 2.28, Pd: 2.2, Ag: 1.93, Cd: 1.69, In: 1.78, Sn: 1.96, Sb: 2.05, Te: 2.1,
  I: 2.66, Xe: 2.6, Cs: 0.79, Ba: 0.89, Pt: 2.28, Au: 2.54, Hg: 2.0, Pb: 2.33, Bi: 2.02,
  Tc: 1.9, Hf: 1.3, Ta: 1.5, W: 2.36, Re: 1.9, Os: 2.2, Ir: 2.2, Tl: 1.62, Po: 2.0, At: 2.2, Fr: 0.7, Ra: 0.9,
};
const IE1 = {
  H: 1312, He: 2372, Li: 520, Be: 900, B: 801, C: 1086, N: 1402, O: 1314, F: 1681, Ne: 2081, Na: 496, Mg: 738,
  Al: 578, Si: 787, P: 1012, S: 1000, Cl: 1251, Ar: 1521, K: 419, Ca: 590, Sc: 633, Ti: 659, V: 651, Cr: 653,
  Mn: 717, Fe: 763, Co: 760, Ni: 737, Cu: 746, Zn: 906, Ga: 579, Ge: 762, As: 947, Se: 941, Br: 1140, Kr: 1351,
  Rb: 403, Sr: 550, Ag: 731, Cd: 868, In: 558, Sn: 709, Sb: 834, Te: 869, I: 1008, Xe: 1170, Cs: 376, Ba: 503,
  Au: 890, Hg: 1007, Pb: 716, Y: 600, Zr: 640, Nb: 652, Mo: 684, Tc: 702, Ru: 710, Rh: 720, Pd: 804, Pt: 870,
  Tl: 589, Bi: 703, Po: 812, At: 899, Rn: 1037, Fr: 393, Ra: 509,
};

// Perioda i skupina iz Z (lantanoidi i aktinoidi: skupina null, kao u tablici gdje su izdvojeni).
function polozaj(z) {
  const granice = [2, 10, 18, 36, 54, 86, 118];
  const perioda = granice.findIndex((g) => z <= g) + 1;
  const pocetak = [0, 2, 10, 18, 36, 54, 86][perioda - 1];
  const k = z - pocetak; // redni broj u periodi
  if (perioda === 1) return { perioda, skupina: z === 1 ? 1 : 18 };
  if (perioda <= 3) return { perioda, skupina: k <= 2 ? k : k + 10 };
  if (perioda <= 5) return { perioda, skupina: k };
  // 6. i 7. perioda: kao na listu mature, lantanoidi La–Lu i aktinoidi Ac–Lr (15 elemenata) su u zasebnim
  // redovima, a u 3. skupini piše samo „57–71“ / „89–103“; od Hf/Rf dalje skupine 4–18
  if (k <= 2) return { perioda, skupina: k };
  if (k <= 17) return { perioda, skupina: null, f: true };
  return { perioda, skupina: k - 14 };
}

const PLEMENITI = new Set([2, 10, 18, 36, 54, 86]);
const NEMETALI = new Set([1, 6, 7, 8, 9, 15, 16, 17, 34, 35, 53]);
const POLUMETALI = new Set([5, 14, 32, 33, 51, 52, 85]);
function vrsta(z) {
  if (PLEMENITI.has(z)) return "plemeniti plin";
  if (NEMETALI.has(z)) return "nemetal";
  if (POLUMETALI.has(z)) return "polumetal";
  return "metal";
}

export const ELEMENTI = PSE.map(([z, simbol, naziv, ar]) => {
  const p = polozaj(z);
  return {
    z,
    simbol,
    naziv,
    // Ar kao broj (za račun) i kao zapis s lista (npr. "1,01", "108", "[98]")
    ar: typeof ar === "number" ? ar : Number(ar.slice(1, -1)),
    arZapis: typeof ar === "number" ? String(ar).replace(".", ",") : ar,
    nestabilan: typeof ar !== "number",
    perioda: p.perioda,
    skupina: p.skupina,
    fBlok: !!p.f,
    vrsta: vrsta(z),
    en: EN[simbol] ?? null,
    ie1: IE1[simbol] ?? null,
  };
});
// Ar s jednom decimalom gdje je list piše s jednom (C 12,0 → "12,0"): zapis za prikaz, uvijek kao na listu.
for (const e of ELEMENTI) if (typeof e.ar === "number" && e.ar < 100 && !e.nestabilan && Number.isInteger(e.ar)) e.arZapis = `${e.ar},0`;
for (const e of ELEMENTI) if (e.simbol === "He") e.arZapis = "4,00";

export const PO_SIMBOLU = Object.fromEntries(ELEMENTI.map((e) => [e.simbol, e]));
export const element = (simbol) => PO_SIMBOLU[simbol] ?? null;

// Temeljne prirodne konstante (tablica s lista).
export const KONSTANTE = {
  c0: { naziv: "brzina svjetlosti u vakuumu", vrijednost: 3.0e8, jedinica: "m s⁻¹", zapis: "3,00×10⁸ m s⁻¹" },
  h: { naziv: "Planckova konstanta", vrijednost: 6.63e-34, jedinica: "J s", zapis: "6,63×10⁻³⁴ J s" },
  e: { naziv: "elementarni naboj", vrijednost: 1.6e-19, jedinica: "C", zapis: "1,60×10⁻¹⁹ C" },
  me: { naziv: "masa mirovanja elektrona", vrijednost: 9.11e-31, jedinica: "kg", zapis: "9,11×10⁻³¹ kg" },
  mp: { naziv: "masa mirovanja protona", vrijednost: 1.67e-27, jedinica: "kg", zapis: "1,67×10⁻²⁷ kg" },
  mn: { naziv: "masa mirovanja neutrona", vrijednost: 1.67e-27, jedinica: "kg", zapis: "1,67×10⁻²⁷ kg" },
  u: { naziv: "atomska masena konstanta (1 u = 1 Da)", vrijednost: 1.66e-27, jedinica: "kg", zapis: "1,66×10⁻²⁷ kg" },
  NA: { naziv: "Avogadrova konstanta", vrijednost: 6.02e23, jedinica: "mol⁻¹", zapis: "6,02×10²³ mol⁻¹" },
  k: { naziv: "Boltzmannova konstanta", vrijednost: 1.38e-23, jedinica: "J K⁻¹", zapis: "1,38×10⁻²³ J K⁻¹" },
  F: { naziv: "Faradayeva konstanta", vrijednost: 9.65e4, jedinica: "C mol⁻¹", zapis: "9,65×10⁴ C mol⁻¹" },
  R: { naziv: "molarna plinska konstanta", vrijednost: 8.31, jedinica: "Pa m³ K⁻¹ mol⁻¹", zapis: "8,31 Pa m³ K⁻¹ mol⁻¹" },
  T0: { naziv: "nula Celzijeve temperature", vrijednost: 273, jedinica: "K", zapis: "273 K" },
  Vm: { naziv: "molarni volumen idealnoga plina (p = 101 kPa, t = 0 °C)", vrijednost: 22.4, jedinica: "L mol⁻¹", zapis: "22,4 L mol⁻¹" },
};

// Standardni elektrodni potencijali pri 25 °C, redom kao na listu (od najvećeg). oks/red: oksidirani i reducirani
// oblik, e: broj elektrona, E: potencijal u V.
export const POTENCIJALI = [
  { oks: "Au⁺", red: "Au", e: 1, E: 1.692, reakcija: "Au⁺ + e⁻ ⇌ Au" },
  { oks: "Cl₂", red: "Cl⁻", e: 2, E: 1.358, reakcija: "Cl₂ + 2 e⁻ ⇌ 2 Cl⁻" },
  { oks: "O₂", red: "H₂O", e: 4, E: 1.229, reakcija: "O₂ + 4 e⁻ + 4 H⁺ ⇌ 2 H₂O" },
  { oks: "Br₂", red: "Br⁻", e: 2, E: 1.087, reakcija: "Br₂ + 2 e⁻ ⇌ 2 Br⁻" },
  { oks: "Hg²⁺", red: "Hg", e: 2, E: 0.851, reakcija: "Hg²⁺ + 2 e⁻ ⇌ Hg" },
  { oks: "Ag⁺", red: "Ag", e: 1, E: 0.8, reakcija: "Ag⁺ + e⁻ ⇌ Ag" },
  { oks: "I₂", red: "I⁻", e: 2, E: 0.535, reakcija: "I₂ + 2 e⁻ ⇌ 2 I⁻" },
  { oks: "Cu⁺", red: "Cu", e: 1, E: 0.521, reakcija: "Cu⁺ + e⁻ ⇌ Cu" },
  { oks: "O₂", red: "OH⁻", e: 4, E: 0.401, reakcija: "O₂ + 2 H₂O + 4 e⁻ ⇌ 4 OH⁻" },
  { oks: "Cu²⁺", red: "Cu", e: 2, E: 0.342, reakcija: "Cu²⁺ + 2 e⁻ ⇌ Cu" },
  { oks: "H⁺", red: "H₂", e: 2, E: 0.0, reakcija: "2 H⁺ + 2 e⁻ ⇌ H₂" },
  { oks: "Fe³⁺", red: "Fe", e: 3, E: -0.037, reakcija: "Fe³⁺ + 3 e⁻ ⇌ Fe" },
  { oks: "Pb²⁺", red: "Pb", e: 2, E: -0.126, reakcija: "Pb²⁺ + 2 e⁻ ⇌ Pb" },
  { oks: "Sn²⁺", red: "Sn", e: 2, E: -0.137, reakcija: "Sn²⁺ + 2 e⁻ ⇌ Sn" },
  { oks: "Ni²⁺", red: "Ni", e: 2, E: -0.257, reakcija: "Ni²⁺ + 2 e⁻ ⇌ Ni" },
  { oks: "Co²⁺", red: "Co", e: 2, E: -0.28, reakcija: "Co²⁺ + 2 e⁻ ⇌ Co" },
  { oks: "Cd²⁺", red: "Cd", e: 2, E: -0.352, reakcija: "Cd²⁺ + 2 e⁻ ⇌ Cd" },
  { oks: "Fe²⁺", red: "Fe", e: 2, E: -0.447, reakcija: "Fe²⁺ + 2 e⁻ ⇌ Fe" },
  { oks: "Cr³⁺", red: "Cr", e: 3, E: -0.744, reakcija: "Cr³⁺ + 3 e⁻ ⇌ Cr" },
  { oks: "Zn²⁺", red: "Zn", e: 2, E: -0.762, reakcija: "Zn²⁺ + 2 e⁻ ⇌ Zn" },
  { oks: "H₂O", red: "H₂", e: 2, E: -0.828, reakcija: "2 H₂O + 2 e⁻ ⇌ H₂ + 2 OH⁻" },
  { oks: "Cr²⁺", red: "Cr", e: 2, E: -0.913, reakcija: "Cr²⁺ + 2 e⁻ ⇌ Cr" },
  { oks: "Mn²⁺", red: "Mn", e: 2, E: -1.185, reakcija: "Mn²⁺ + 2 e⁻ ⇌ Mn" },
  { oks: "Ti²⁺", red: "Ti", e: 2, E: -1.63, reakcija: "Ti²⁺ + 2 e⁻ ⇌ Ti" },
  { oks: "Al³⁺", red: "Al", e: 3, E: -1.662, reakcija: "Al³⁺ + 3 e⁻ ⇌ Al" },
  { oks: "Mg²⁺", red: "Mg", e: 2, E: -2.372, reakcija: "Mg²⁺ + 2 e⁻ ⇌ Mg" },
  { oks: "Na⁺", red: "Na", e: 1, E: -2.711, reakcija: "Na⁺ + e⁻ ⇌ Na" },
  { oks: "Ca²⁺", red: "Ca", e: 2, E: -2.868, reakcija: "Ca²⁺ + 2 e⁻ ⇌ Ca" },
  { oks: "Ba²⁺", red: "Ba", e: 2, E: -2.912, reakcija: "Ba²⁺ + 2 e⁻ ⇌ Ba" },
  { oks: "K⁺", red: "K", e: 1, E: -2.931, reakcija: "K⁺ + e⁻ ⇌ K" },
  { oks: "Cs⁺", red: "Cs", e: 1, E: -3.026, reakcija: "Cs⁺ + e⁻ ⇌ Cs" },
];

// ── formule ──
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "−" };

// Naboj na kraju formule: "SO₄²⁻" → −2, "Na⁺" → 1, "H₂O" → 0.
export function nabojOd(formula) {
  const s = [...String(formula ?? "")].map((c) => SUP[c] ?? c).join("").replace(/-/g, "−").trim();
  const m = s.match(/(\d*)([+−])$/);
  return m ? (m[1] ? Number(m[1]) : 1) * (m[2] === "+" ? 1 : -1) : 0;
}

// Atomi u formuli: "Cu₂S" → {Cu: 2, S: 1}; podržava zagrade "(CH₃COO)₂Mg", hidrate "CuSO₄·5H₂O", stanja "(aq)" i
// naboj na kraju. Vraća null ako formula sadrži nepoznat simbol ili se ne da pročitati.
export function atomiOd(formula) {
  let s = [...String(formula ?? "")].map((c) => (SUB.includes(c) ? String(SUB.indexOf(c)) : c)).join("");
  s = s.replace(/\((?:s|l|g|aq|ℓ)\)/g, "").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/, "").replace(/\s/g, "");
  const ukupno = {};
  for (const dio of s.split(/[·.*]/)) {
    const m = dio.match(/^(\d*)(.*)$/);
    const k = m[1] ? Number(m[1]) : 1;
    const a = atomiDijela(m[2]);
    if (!a) return null;
    for (const [e, n] of Object.entries(a)) ukupno[e] = (ukupno[e] ?? 0) + n * k;
  }
  return Object.keys(ukupno).length ? ukupno : null;
}
// Uglate zagrade kompleksa („[Cu(H₂O)₄]²⁺“, „[Fe(SCN)(H₂O)₅]²⁺“) čitaju se kao obične; zagrada se mora zatvoriti
// istom vrstom.
function atomiDijela(s) {
  const stog = [{}];
  const otvorene = [];
  const re = /([A-Z][a-z]?)(\d*)|([([])|([)\]])(\d*)/g;
  let m;
  let pos = 0;
  while ((m = re.exec(s))) {
    if (m.index !== pos) return null;
    pos = re.lastIndex;
    const vrh = stog[stog.length - 1];
    if (m[1]) {
      if (!PO_SIMBOLU[m[1]]) return null;
      vrh[m[1]] = (vrh[m[1]] ?? 0) + (m[2] ? Number(m[2]) : 1);
    } else if (m[3]) {
      stog.push({});
      otvorene.push(m[3]);
    } else if (m[4]) {
      if (stog.length < 2 || otvorene.pop() !== (m[4] === "]" ? "[" : "(")) return null;
      const g = stog.pop();
      const u = stog[stog.length - 1];
      for (const [e, n] of Object.entries(g)) u[e] = (u[e] ?? 0) + n * (m[5] ? Number(m[5]) : 1);
    }
  }
  if (pos !== s.length || stog.length !== 1) return null;
  return stog[0];
}

// Molarna masa (g/mol) iz Ar s lista; null ako se formula ne da pročitati ili ima nestabilan element.
export function molarnaMasa(formula) {
  const a = atomiOd(formula);
  if (!a) return null;
  let M = 0;
  for (const [e, n] of Object.entries(a)) {
    const el = PO_SIMBOLU[e];
    if (!el || el.nestabilan) return null;
    M += el.ar * n;
  }
  return Math.round(M * 1000) / 1000;
}
