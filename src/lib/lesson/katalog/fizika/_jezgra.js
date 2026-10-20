// Zajedničko za widget „jezgra“: periodni sustav (Z → simbol, ime), čestice nuklearnih reakcija, sjeme slučajnosti,
// raspored kuglica jezgre (Vogelova spirala), elektroni na ljuskama i tablice masa jezgara i energije vezanja po
// nukleonu. Čisti JS (bez DOM-a i Intl), isti kod crta web i iOS.

// Z = 1 … 100: [simbol, ime]
const PSE = [
  ["H", "vodik"],
  ["He", "helij"],
  ["Li", "litij"],
  ["Be", "berilij"],
  ["B", "bor"],
  ["C", "ugljik"],
  ["N", "dušik"],
  ["O", "kisik"],
  ["F", "fluor"],
  ["Ne", "neon"],
  ["Na", "natrij"],
  ["Mg", "magnezij"],
  ["Al", "aluminij"],
  ["Si", "silicij"],
  ["P", "fosfor"],
  ["S", "sumpor"],
  ["Cl", "klor"],
  ["Ar", "argon"],
  ["K", "kalij"],
  ["Ca", "kalcij"],
  ["Sc", "skandij"],
  ["Ti", "titanij"],
  ["V", "vanadij"],
  ["Cr", "krom"],
  ["Mn", "mangan"],
  ["Fe", "željezo"],
  ["Co", "kobalt"],
  ["Ni", "nikal"],
  ["Cu", "bakar"],
  ["Zn", "cink"],
  ["Ga", "galij"],
  ["Ge", "germanij"],
  ["As", "arsen"],
  ["Se", "selenij"],
  ["Br", "brom"],
  ["Kr", "kripton"],
  ["Rb", "rubidij"],
  ["Sr", "stroncij"],
  ["Y", "itrij"],
  ["Zr", "cirkonij"],
  ["Nb", "niobij"],
  ["Mo", "molibden"],
  ["Tc", "tehnecij"],
  ["Ru", "rutenij"],
  ["Rh", "rodij"],
  ["Pd", "paladij"],
  ["Ag", "srebro"],
  ["Cd", "kadmij"],
  ["In", "indij"],
  ["Sn", "kositar"],
  ["Sb", "antimon"],
  ["Te", "telurij"],
  ["I", "jod"],
  ["Xe", "ksenon"],
  ["Cs", "cezij"],
  ["Ba", "barij"],
  ["La", "lantan"],
  ["Ce", "cerij"],
  ["Pr", "prazeodimij"],
  ["Nd", "neodimij"],
  ["Pm", "prometij"],
  ["Sm", "samarij"],
  ["Eu", "europij"],
  ["Gd", "gadolinij"],
  ["Tb", "terbij"],
  ["Dy", "disprozij"],
  ["Ho", "holmij"],
  ["Er", "erbij"],
  ["Tm", "tulij"],
  ["Yb", "iterbij"],
  ["Lu", "lutecij"],
  ["Hf", "hafnij"],
  ["Ta", "tantal"],
  ["W", "volfram"],
  ["Re", "renij"],
  ["Os", "osmij"],
  ["Ir", "iridij"],
  ["Pt", "platina"],
  ["Au", "zlato"],
  ["Hg", "živa"],
  ["Tl", "talij"],
  ["Pb", "olovo"],
  ["Bi", "bizmut"],
  ["Po", "polonij"],
  ["At", "astat"],
  ["Rn", "radon"],
  ["Fr", "francij"],
  ["Ra", "radij"],
  ["Ac", "aktinij"],
  ["Th", "torij"],
  ["Pa", "protaktinij"],
  ["U", "uranij"],
  ["Np", "neptunij"],
  ["Pu", "plutonij"],
  ["Am", "americij"],
  ["Cm", "kirij"],
  ["Bk", "berkelij"],
  ["Cf", "kalifornij"],
  ["Es", "einsteinij"],
  ["Fm", "fermij"],
];
export const Z_MAX = PSE.length;

// ELEMENTI[Z] = {Z, simbol, ime}; ELEMENTI[0] je prazno mjesto (nema elementa bez protona)
export const ELEMENTI = [
  null,
  ...PSE.map(([simbol, ime], i) => ({ Z: i + 1, simbol, ime })),
];
export const element = (Z) =>
  Number.isInteger(Z) && Z >= 1 && Z <= Z_MAX ? ELEMENTI[Z] : null;
export const zIzSimbola = (simbol) => {
  const i = PSE.findIndex(([s]) => s === simbol);
  return i < 0 ? null : i + 1;
};
export const simbolZ = (Z) => element(Z)?.simbol ?? "?";
export const imeIzotopa = (Z, A) => {
  const el = element(Z);
  return el ? `${el.ime}-${A}` : `jezgra (Z = ${Z}, A = ${A})`;
};

// Čestice u reakcijama i raspadima: A (maseni), Z (redni, za e⁻ je −1), zapis i ime.
export const CESTICE = {
  p: { A: 1, Z: 1, znak: "p", ime: "proton", vrsta: "p" },
  n: { A: 1, Z: 0, znak: "n", ime: "neutron", vrsta: "n" },
  "e-": { A: 0, Z: -1, znak: "e", ime: "elektron", vrsta: "e-" },
  "e+": { A: 0, Z: 1, znak: "e", ime: "pozitron", vrsta: "e+" },
  alfa: {
    A: 4,
    Z: 2,
    znak: "He",
    ime: "α-čestica (jezgra helija)",
    vrsta: "alfa",
  },
  gama: { A: 0, Z: 0, znak: "γ", ime: "γ-foton", vrsta: "gama" },
};
export const CESTICE_IDS = Object.keys(CESTICE);

// Zapis ᴬ_Z X za crtanje: gornji i donji indeks lijevo od simbola (za e⁻ donji je „−1“).
export function zapis(A, Z, simbol, pobudjena = false) {
  return {
    gore: String(A),
    dolje: Z < 0 ? `−${-Z}` : Z > 0 && simbol === "e" ? `+${Z}` : String(Z),
    simbol: simbol + (pobudjena ? "*" : ""),
  };
}
export const zapisCestice = (id) => {
  const c = CESTICE[id];
  return zapis(c.A, c.Z, c.znak);
};
export const zapisJezgre = (Z, A, pobudjena = false) =>
  zapis(A, Z, simbolZ(Z), pobudjena);

// Zapis u jednom retku (za poruke): ¹³¹₅₃I
const GORE = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "−": "⁻",
  "+": "⁺",
};
const DOLJE = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
  "−": "₋",
  "+": "₊",
};
export const tekstZapisa = (z) =>
  `${[...z.gore].map((c) => GORE[c] ?? c).join("")}${[...z.dolje].map((c) => DOLJE[c] ?? c).join("")}${z.simbol}`;
export const tekstJezgre = (Z, A, pob = false) =>
  tekstZapisa(zapisJezgre(Z, A, pob));
// „¹³¹I“ (samo maseni broj, kao u tekstu zadatka)
export const kratkiZapis = (Z, A) =>
  `${[...String(A)].map((c) => GORE[c]).join("")}${simbolZ(Z)}`;

// Isto za markdown s KaTeX-om (poruke, točan odgovor, očitanja): \({}^{131}_{53}\text{I}\)
const texSimbol = (s) =>
  s === "γ"
    ? "\\gamma"
    : `\\text{${s.replace("*", "")}}${s.endsWith("*") ? "^*" : ""}`;
export const mdZapisa = (z) =>
  `\\({}^{${z.gore}}_{${z.dolje.replace("−", "-")}}${texSimbol(z.simbol)}\\)`;
export const mdJezgre = (Z, A, pob = false) => mdZapisa(zapisJezgre(Z, A, pob));
export const mdKratko = (Z, A) => `\\({}^{${A}}\\text{${simbolZ(Z)}}\\)`;

// ── sjeme slučajnosti: isti spec = isti crtež na webu i na iOS-u ──
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── kuglice jezgre ──
// Jezgra je niz „tipova“ ('p' ili 'n') po indeksu Vogelove spirale: indeks 0 je u sredini, veći indeksi su dalje.
// Dodavanje i raspad mijenjaju niz, pa unutarnje kuglice ostaju na mjestu i crtež ne „skače“.
export function tipoviJezgre(Z, N, seed = 1) {
  const t = [...Array(Z).fill("p"), ...Array(N).fill("n")];
  const r = rng(seed * 7919 + Z * 131 + N);
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// Dodaj ili makni kuglice da jezgra ima Z protona i N neutrona; nove idu na pseudoslučajna mjesta.
export function uskladiTipove(tipovi, Z, N, seed = 1) {
  const t = [...tipovi];
  const broj = (v) => t.filter((x) => x === v).length;
  for (const [v, cilj] of [
    ["p", Z],
    ["n", N],
  ]) {
    let k = broj(v);
    while (k < cilj) {
      const r = rng(seed * 31 + t.length * 977 + k * 13 + (v === "p" ? 1 : 2));
      t.splice(Math.floor(r() * (t.length + 1)), 0, v);
      k++;
    }
    while (k > cilj) {
      // makni zadnju takvu (vanjsku) kuglicu
      t.splice(t.lastIndexOf(v), 1);
      k--;
    }
  }
  return t;
}

// Raspad mijenja niz tipova: α odnese dvije vanjske p i dvije vanjske n, β⁻ vanjski n postane p, β⁺ obrnuto.
export function raspadTipova(tipovi, vrsta) {
  const t = [...tipovi];
  if (vrsta === "alfa") {
    const izbaceni = [];
    for (const v of ["p", "p", "n", "n"]) {
      for (let i = t.length - 1; i >= 0; i--)
        if (t[i] === v && !izbaceni.includes(i)) {
          izbaceni.push(i);
          break;
        }
    }
    return {
      tipovi: t.filter((_, i) => !izbaceni.includes(i)),
      izbaceni: izbaceni.sort((a, b) => a - b),
      promijenjen: null,
    };
  }
  if (vrsta === "beta-" || vrsta === "beta+") {
    const iz = vrsta === "beta-" ? "n" : "p";
    const i = t.lastIndexOf(iz);
    if (i >= 0) t[i] = iz === "n" ? "p" : "n";
    return { tipovi: t, izbaceni: [], promijenjen: i >= 0 ? i : null };
  }
  return { tipovi: t, izbaceni: [], promijenjen: null };
}

const ZLATNI_KUT = Math.PI * (3 - Math.sqrt(5));
// Polumjer jezgre ∝ ∛A (R1 = polumjer jednog nukleona na crtežu).
export const polumjerJezgre = (A, R1 = 9) => (A <= 0 ? 0 : R1 * Math.cbrt(A));
// Položaji kuglica: [{x, y, r, vrsta, i}] oko (0, 0), poredano za crtanje (vanjske prve, unutarnje na vrhu).
export function kuglice(tipovi, R1 = 9) {
  const A = tipovi.length;
  if (!A) return [];
  const R = polumjerJezgre(A, R1);
  const rb = A === 1 ? R1 * 0.75 : R / (Math.sqrt(A) + 0.6);
  const s = rb * 1.0;
  const out = tipovi.map((vrsta, i) => {
    const rr = A === 1 ? 0 : s * Math.sqrt(i + 0.5);
    const th = i * ZLATNI_KUT;
    return {
      i,
      x: Math.round(rr * Math.cos(th) * 100) / 100,
      y: Math.round(rr * Math.sin(th) * 100) / 100,
      r: Math.round(rb * 100) / 100,
      vrsta,
    };
  });
  return out.reverse();
}

// Elektroni u omotaču, shematski: ljuske s najviše 2, 8, 18, 32 elektrona; preko 60 elektrona samo „oblak“.
export const LJUSKE = [2, 8, 18, 32];
export function elektroniPolozaji(e, R0, korak, faza = 0) {
  if (e <= 0) return { oblak: false, tocke: [], prsteni: [] };
  if (e > 60)
    return { oblak: true, tocke: [], prsteni: [R0 + korak, R0 + 3 * korak] };
  const tocke = [];
  const prsteni = [];
  let ostalo = e;
  LJUSKE.forEach((kap, k) => {
    if (ostalo <= 0) return;
    const n = Math.min(kap, ostalo);
    ostalo -= n;
    const R = R0 + k * korak;
    prsteni.push(R);
    const smjer = k % 2 ? -1 : 1;
    for (let j = 0; j < n; j++) {
      const th = (2 * Math.PI * j) / n + smjer * faza * (1 / (k + 1)) + k * 0.4;
      tocke.push({
        x: Math.round(R * Math.cos(th) * 100) / 100,
        y: Math.round(R * Math.sin(th) * 100) / 100,
      });
    }
  });
  return { oblak: false, tocke, prsteni };
}

// ── konstante i mase (kao u rješenjima Q08; knjižica str. 4–5) ──
export const KONST = {
  m_p: 1.00728, // u (masa protona)
  m_n: 1.00866, // u (masa neutrona)
  m_H: 1.00783, // u (masa atoma vodika, česta krivo uzeta masa)
  u: 1.66e-27, // kg
  c: 3e8, // m/s
  eV: 1.6e-19, // J
};

// Mase jezgara (u) za istraživanje energije vezanja; zadaci 1256–1260 koriste iste brojeve.
export const MASE_JEZGARA = [
  { simbol: "H", A: 2, m: 2.01355 },
  { simbol: "H", A: 3, m: 3.0155 },
  { simbol: "He", A: 4, m: 4.00151 },
  { simbol: "Li", A: 7, m: 7.01436 },
  { simbol: "C", A: 12, m: 11.99671 },
  { simbol: "O", A: 16, m: 15.99053 },
  { simbol: "Fe", A: 56, m: 55.92067 },
  { simbol: "U", A: 235, m: 234.99346 },
];

// Stvarna energija vezanja po nukleonu (MeV), stabilne jezgre i nekoliko važnih; vrh je kod ⁵⁶Fe (⁶²Ni je
// izostavljen jer je u gimnazijskoj fizici „najstabilnije“ željezo).
export const KRIVULJA_EA = [
  ["H", 2, 1.112],
  ["H", 3, 2.827],
  ["He", 4, 7.074],
  ["Li", 6, 5.332],
  ["Li", 7, 5.606],
  ["Be", 9, 6.463],
  ["B", 11, 6.928],
  ["C", 12, 7.68],
  ["N", 14, 7.476],
  ["O", 16, 7.976],
  ["F", 19, 7.779],
  ["Ne", 20, 8.032],
  ["Mg", 24, 8.261],
  ["Al", 27, 8.332],
  ["Si", 28, 8.448],
  ["S", 32, 8.493],
  ["Ca", 40, 8.551],
  ["Ti", 48, 8.723],
  ["Cr", 52, 8.776],
  ["Fe", 56, 8.79],
  ["Co", 59, 8.768],
  ["Zn", 64, 8.736],
  ["Ge", 74, 8.725],
  ["Kr", 84, 8.717],
  ["Zr", 90, 8.71],
  ["Mo", 98, 8.635],
  ["Ag", 107, 8.554],
  ["Sn", 120, 8.505],
  ["I", 127, 8.445],
  ["Ce", 140, 8.376],
  ["Ho", 165, 8.147],
  ["W", 184, 8.005],
  ["Au", 197, 7.916],
  ["Pb", 208, 7.868],
  ["Th", 232, 7.615],
  ["U", 235, 7.591],
  ["U", 238, 7.57],
].map(([simbol, A, EA]) => ({ simbol, A, Z: zIzSimbola(simbol), EA }));
