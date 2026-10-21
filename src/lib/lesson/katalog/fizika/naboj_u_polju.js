// naboj_u_polju: nabijena čestica u homogenom magnetskom polju (kružnica r = mv/(|q|B) u mjerilu, sila prema
// središtu, period) i vodič sa strujom u polju (F = BIl sin α s klizačem kuta). Načini: istraživanje, „pogodi
// detektor“ (spektrometar masa: učenik namjesti B ili v) i izračun s tipičnim greškama koje računa kod.
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  withUnit,
  KRIVO_OPIS,
} from "../zajednicko.js";
import { isNum, formatSci } from "../../core/number.js";
import { E, ME, MP, OKOMITO, vec, cross, smjerIz } from "./_magnetizam.js";
import { checkFiz } from "./_magnetizam.js";

export const CESTICE = {
  proton: { ime: "proton", oznaka: "p⁺", m: MP, q: E },
  elektron: { ime: "elektron", oznaka: "e⁻", m: ME, q: -E },
  alfa: { ime: "alfa-čestica", oznaka: "α", m: 6.64e-27, q: 2 * E },
};
export function cesticaOf(s) {
  if (typeof s.cestica === "string") return CESTICE[s.cestica];
  const c = s.cestica;
  return {
    ime: c.ime ?? "čestica",
    oznaka: c.oznaka ?? (c.q > 0 ? "+" : "−"),
    m: c.m,
    q: c.q,
  };
}

// jedinice klizača i prikaza: vrijednost u SI = prikaz · faktor
export const JEDINICE = {
  B: { T: 1, mT: 1e-3, µT: 1e-6 },
  v: { "m/s": 1, "km/s": 1e3 },
  kut: { "°": 1 },
  I: { A: 1 },
};
const ZADANA_JED = { B: "T", v: "m/s", kut: "°", I: "A" };
export const jedKlizaca = (k) => k.jedinica ?? ZADANA_JED[k.id];
export const faktor = (k) => JEDINICE[k.id]?.[jedKlizaca(k)] ?? 1;
export function vrijednostiKlizaca(k) {
  if (Array.isArray(k.vrijednosti)) return k.vrijednosti;
  const n = Math.round((k.max - k.min) / k.korak);
  return Array.from({ length: n + 1 }, (_, i) =>
    Number((k.min + i * k.korak).toPrecision(12)),
  );
}
export const klizacOf = (s, id) => (s.klizaci ?? []).find((k) => k.id === id);
// početna vrijednost klizača (u jedinici klizača)
export function pocetakKlizaca(s, k) {
  const vals = vrijednostiKlizaca(k);
  if (isNum(k.pocetak)) return k.pocetak;
  const si = s[k.id];
  if (isNum(si)) {
    const x = si / faktor(k);
    return vals.reduce(
      (a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a),
      vals[0],
    );
  }
  return vals[0];
}

export const krug = (s) =>
  s.objekt === "cestica" && OKOMITO.includes(s.smjer_B);

// ── fizika ────────────────────────────────────────────────────────────────────────────────────────
// vrijednosti: {v, B, kut, I} u SI (ono što nije zadano, uzima se iz speca)
const rad = (d) => (d * Math.PI) / 180;
export function velicine(s, o = {}) {
  const v = o.v ?? s.v;
  const B = o.B ?? s.B;
  const kut = o.kut ?? s.kut ?? 90;
  if (s.objekt === "vodic") {
    const I = o.I ?? s.I;
    const l = s.l * { m: 1, cm: 0.01, mm: 0.001 }[s.jedinica_l ?? "m"];
    return { F: B * I * l * Math.sin(rad(kut)), B, I, l, kut };
  }
  const c = cesticaOf(s);
  const aq = Math.abs(c.q);
  return {
    F: aq * v * B * Math.sin(rad(kut)),
    r: (c.m * v) / (aq * B),
    T: (2 * Math.PI * c.m) / (aq * B),
    v,
    B,
    kut,
    m: c.m,
    q: c.q,
  };
}
// Smjer sile (za crtež): u krugu prema središtu; pri kutu u ravnini ⊙ / ⊗ (B je u ravnini papira).
// Smjer kruženja na ekranu: +1 kazaljka, −1 suprotno.
export function kruzenje(s) {
  const c = cesticaOf(s);
  // v = gore (ulaz u polje), F = q v × B
  const F = smjerIz(
    cross(vec("gore"), vec(s.smjer_B)).map((x) => x * Math.sign(c.q)),
  );
  // ako sila na ulazu gleda ulijevo, čestica kruži suprotno od kazaljke
  return F === "lijevo" ? -1 : 1;
}
export function smjerSileKut(s, kut = s.kut ?? 90) {
  const a = rad(kut);
  const B = vec(s.smjer_B ?? "desno");
  // v je pod kutom α prema B, zakrenut suprotno od kazaljke u ravnini papira
  const v = [
    B[0] * Math.cos(a) - B[1] * Math.sin(a),
    B[0] * Math.sin(a) + B[1] * Math.cos(a),
    0,
  ];
  const q = s.objekt === "vodic" ? 1 : Math.sign(cesticaOf(s).q);
  const F = cross(v, B).map((x) => x * q);
  return smjerIz(F, 1, 1e-6);
}

// pogodi: čestica ulazi okomito u polje i nakon polukruga pada na ulaznu crtu na udaljenosti 2r
export const doskok = (s, o) => 2 * velicine(s, o).r;
export const pogodiTol = (s) =>
  (isNum(s.tolerancija) ? s.tolerancija : 0.03) * s.detektor;
export function pogodiRjesenja(s) {
  const k = klizacOf(s, s.mijenja);
  if (!k) return [];
  return vrijednostiKlizaca(k).filter(
    (x) =>
      Math.abs(doskok(s, { [s.mijenja]: x * faktor(k) }) - s.detektor) <=
      pogodiTol(s),
  );
}

// ── izračunaj ─────────────────────────────────────────────────────────────────────────────────────
const JED_ODG = {
  r: { m: 1, cm: 0.01, mm: 0.001 },
  F: { N: 1, mN: 1e-3 },
  T: { s: 1, ms: 1e-3, µs: 1e-6, ns: 1e-9 },
};
// gumb ·10ⁿ u izracunaj: po traženoj veličini i jedinici (odgovor u osnovnoj SI jedinici m, N ili s, kod čestica
// redovito traži znanstveni zapis), nikad po iznosu odgovora
export const znanstvenoPolje = (s) =>
  s.pitaj?.jedinica == null || ["m", "N", "s"].includes(s.pitaj.jedinica);
export function izracun(s) {
  const vel = s.pitaj.velicina;
  const jed = s.pitaj.jedinica ?? { r: "m", F: "N", T: "s" }[vel];
  const f = 1 / JED_ODG[vel][jed];
  const x = velicine(s);
  const k = [];
  const add = (vrijednost, poruka) =>
    k.push({ vrijednost: vrijednost * f, poruka });
  const jB =
    s.jedinica_B && s.jedinica_B !== "T" ? JEDINICE.B[s.jedinica_B] : null;
  if (s.objekt === "vodic") {
    if ((s.jedinica_l ?? "m") !== "m")
      add(
        x.B * x.I * s.l * Math.sin(rad(x.kut)),
        `Duljinu vodiča pretvori u metre: ${withUnit(s.l, s.jedinica_l)} = ${withUnit(x.l, "m")}.`,
      );
    if (Math.abs(Math.sin(rad(x.kut)) - Math.cos(rad(x.kut))) > 1e-9)
      add(
        x.B * x.I * x.l * Math.cos(rad(x.kut)),
        "Uzeo si kosinus. U F = BIl sin α kut α je između vodiča i silnica.",
      );
    if (Math.abs(Math.sin(rad(x.kut)) - 1) > 1e-9)
      add(
        x.B * x.I * x.l,
        x.kut === 0
          ? "Vodič leži uzduž silnica: α = 0°, a sin 0° = 0, pa sile nema."
          : "Izostavio si sin α: vodič nije okomit na silnice.",
      );
    if (jB)
      add(
        (x.B / jB) * x.I * x.l * Math.sin(rad(x.kut)),
        `Polje pretvori u tesle: 1 ${s.jedinica_B} = ${formatSci(jB)} T.`,
      );
    return { vrijednost: x.F * f, jedinica: jed, oznaka: "F", krivo: k };
  }
  const c = cesticaOf(s);
  const aq = Math.abs(c.q);
  const druga =
    s.cestica === "elektron" ? MP : s.cestica === "proton" ? ME : null;
  if (vel === "F") {
    if (Math.abs(Math.sin(rad(x.kut)) - 1) > 1e-9)
      add(
        aq * x.v * x.B,
        x.kut === 0
          ? "Čestica se giba uzduž silnica: α = 0°, a sin 0° = 0, pa sile nema."
          : "Izostavio si sin α: brzina nije okomita na silnice.",
      );
    add(
      x.v * x.B * Math.sin(rad(x.kut)),
      "Zaboravio si naboj: F = q·v·B·sin α, a q = 1,6·10⁻¹⁹ C.",
    );
    if (jB)
      add(
        aq * x.v * (x.B / jB) * Math.sin(rad(x.kut)),
        `Polje pretvori u tesle: 1 ${s.jedinica_B} = ${formatSci(jB)} T.`,
      );
    return { vrijednost: x.F * f, jedinica: jed, oznaka: "F", krivo: k };
  }
  if (vel === "r") {
    if (druga)
      add(
        (druga * x.v) / (aq * x.B),
        `To je polumjer za ${s.cestica === "elektron" ? "proton" : "elektron"}: uzmi masu ${s.cestica === "elektron" ? "elektrona, 9,11·10⁻³¹ kg" : "protona, 1,67·10⁻²⁷ kg"}.`,
      );
    add(
      (c.m * x.v * x.v) / (aq * x.B),
      "Pokrati jedan v: iz qvB = mv²/r slijedi r = mv/(qB).",
    );
    add((aq * x.B) / (c.m * x.v), "Obrnuo si razlomak: r = mv/(qB).");
    if (jed === "m")
      k.push({
        vrijednost: x.r * 100,
        poruka:
          "To je polumjer u centimetrima, a odgovor treba upisati u metrima.",
      });
    if (jB)
      add(
        (c.m * x.v) / (aq * (x.B / jB)),
        `Polje pretvori u tesle: 1 ${s.jedinica_B} = ${formatSci(jB)} T.`,
      );
    return { vrijednost: x.r * f, jedinica: jed, oznaka: "r", krivo: k };
  }
  // T
  if (druga)
    add(
      (2 * Math.PI * druga) / (aq * x.B),
      `To je period za ${s.cestica === "elektron" ? "proton" : "elektron"}: uzmi njegovu masu.`,
    );
  add(c.m / (aq * x.B), "Zaboravio si 2π: T = 2πr/v = 2πm/(qB).");
  if (jB)
    add(
      (2 * Math.PI * c.m) / (aq * (x.B / jB)),
      `Polje pretvori u tesle: 1 ${s.jedinica_B} = ${formatSci(jB)} T.`,
    );
  return { vrijednost: x.T * f, jedinica: jed, oznaka: "T", krivo: k };
}
const tolIzr = (s, a) =>
  isNum(s.tolerancija) ? s.tolerancija : Math.max(1e-30, Math.abs(a) * 0.01);
const bez = (krivo, a) =>
  krivo.filter(
    (k) =>
      Number.isFinite(k.vrijednost) &&
      Math.abs(k.vrijednost - a) >
        Math.max(Math.abs(a) * 0.011, Math.abs(k.vrijednost) * 1e-6),
  );

// ── opis ──────────────────────────────────────────────────────────────────────────────────────────
const NACINI = {
  cestica: ["istrazi", "pogodi", "izracunaj"],
  vodic: ["istrazi", "izracunaj"],
};
const POLJA = {
  cestica: [
    "cestica",
    "v",
    "B",
    "smjer_B",
    "kut",
    "jedinica_B",
    "klizaci",
    "detektor",
    "mijenja",
    "pitaj",
  ],
  vodic: ["B", "I", "l", "jedinica_l", "kut", "jedinica_B", "klizaci", "pitaj"],
};
const OPCE = [
  "tip",
  "objekt",
  "nacin",
  "tekst",
  "krivo",
  "savjet",
  "tolerancija",
];

export const naboj_u_polju = {
  tip: "naboj_u_polju",
  samoRucno: true,
  uloga: (s) => (s?.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s?.nacin === "istrazi",
  opis: `Naboj ili vodič u homogenom magnetskom polju. Polja: tekst, objekt ("cestica" | "vodic"), nacin.
- objekt "cestica": cestica ("proton" | "elektron" | "alfa" | {ime?, oznaka?, m (kg), q (C, s predznakom)}), v (m/s), B (T), jedinica_B? (u kojoj je B zadan u tekstu, npr. "mT": dodaje grešku „nepretvoreno“),
  smjer_B: "u_papir" | "iz_papira" (polje okomito na papir: čestica kruži, crta se kružnica r = mv/(|q|B) u mjerilu, sila prema središtu, period)
  ili "desno" (polje u ravnini papira: v je pod kutom kut (°) prema B, sila ⊙/⊗ iznosa |q|vB sin α).
- objekt "vodic": B (T), I (A), l, jedinica_l? ("m" | "cm"), kut (° između vodiča i silnica): F = BIl sin α; vodič se može zakretati.
- klizaci?: [{id: "v" | "B" | "kut" | "I", min, max, korak ili vrijednosti: [..], jedinica? (B: T | mT | µT, v: m/s | km/s), pocetak?}] (najviše 3; vrijednosti su u jedinici klizača).
nacin:
- "istrazi": korak za gledanje: učenik pomiče klizače (i zakreće vodič), sve se računa i crta uživo;
- "pogodi" (samo cestica s poljem okomitim na papir): detektor (m, udaljenost od ulaza), mijenja ("B" | "v", id klizača koji učenik namješta);
  čestica nakon polukruga mora pasti na detektor (|2r − d| ≤ tolerancija·d, zadano 3 %); r se ne prikazuje, učenik ga mora procijeniti ili izračunati;
- "izracunaj": pitaj: {velicina: "r" | "F" | "T" (vodič: "F"), jedinica?}; točan iznos i tipične greške (masa protona umjesto elektrona, v², bez sin α,
  nepretvoreni mT ili cm, kosinus) računa aplikacija; ${KRIVO_OPIS}; tolerancija? (zadano 1 %).`,
  primjer: {
    tip: "naboj_u_polju",
    objekt: "cestica",
    nacin: "izracunaj",
    tekst:
      "Elektron brzine $2 \\cdot 10^{6}$ m/s ulijeće okomito u polje $1 \\cdot 10^{-3}$ T. Koliki je polumjer kružnice?",
    cestica: "elektron",
    v: 2e6,
    B: 1e-3,
    smjer_B: "u_papir",
    pitaj: { velicina: "r", jedinica: "m" },
  },
  primjeri: [
    {
      tip: "naboj_u_polju",
      objekt: "cestica",
      nacin: "istrazi",
      tekst:
        "Mijenjaj brzinu i polje i gledaj kako se mijenjaju polumjer i period kruženja elektrona.",
      cestica: "elektron",
      v: 2e6,
      B: 1e-3,
      smjer_B: "u_papir",
      klizaci: [
        { id: "v", vrijednosti: [1e6, 2e6, 3e6, 5e6], jedinica: "m/s" },
        { id: "B", min: 0.5, max: 3, korak: 0.5, jedinica: "mT" },
      ],
    },
    {
      tip: "naboj_u_polju",
      objekt: "cestica",
      nacin: "pogodi",
      tekst:
        "Elektron brzine $2 \\cdot 10^{6}$ m/s ulijeće u polje. Namjesti polje $B$ tako da elektron nakon polukruga pogodi detektor udaljen 4,56 cm od ulaza.",
      cestica: "elektron",
      v: 2e6,
      B: 1e-3,
      smjer_B: "u_papir",
      detektor: 0.0456,
      mijenja: "B",
      klizaci: [
        { id: "B", min: 0.1, max: 2, korak: 0.1, jedinica: "mT", pocetak: 1 },
      ],
    },
    {
      tip: "naboj_u_polju",
      objekt: "cestica",
      nacin: "istrazi",
      tekst:
        "Mijenjaj kut između brzine protona i silnica. Kolika je sila kad se proton giba uzduž silnica?",
      cestica: "proton",
      v: 2e6,
      B: 0.5,
      smjer_B: "desno",
      kut: 90,
      klizaci: [{ id: "kut", min: 0, max: 180, korak: 15, jedinica: "°" }],
    },
    {
      tip: "naboj_u_polju",
      objekt: "cestica",
      nacin: "izracunaj",
      tekst:
        "Kolika sila djeluje na proton koji se brzinom $2 \\cdot 10^{6}$ m/s giba okomito na silnice polja 0,5 T?",
      cestica: "proton",
      v: 2e6,
      B: 0.5,
      smjer_B: "desno",
      kut: 90,
      pitaj: { velicina: "F" },
    },
    {
      tip: "naboj_u_polju",
      objekt: "vodic",
      nacin: "istrazi",
      tekst:
        "Zakreći vodič (povuci mu kraj ili pomakni klizač) i gledaj silu. Kad sila nestaje?",
      B: 0.4,
      I: 5,
      l: 20,
      jedinica_l: "cm",
      kut: 90,
      klizaci: [{ id: "kut", min: 0, max: 180, korak: 5, jedinica: "°" }],
    },
    {
      tip: "naboj_u_polju",
      objekt: "vodic",
      nacin: "izracunaj",
      tekst:
        "Vodič duljine 20 cm sa strujom 5 A okomit je na silnice polja 0,4 T. Kolika sila djeluje na njega?",
      B: 0.4,
      I: 5,
      l: 20,
      jedinica_l: "cm",
      kut: 90,
      pitaj: { velicina: "F" },
    },
  ],
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "naboj_u_polju treba „tekst“");
    if (
      !need(
        ["cestica", "vodic"].includes(s.objekt),
        `objekt mora biti "cestica" ili "vodic"`,
      )
    )
      return list;
    if (
      !need(
        NACINI[s.objekt].includes(s.nacin),
        `za objekt „${s.objekt}“ nacin mora biti: ${NACINI[s.objekt].join(", ")}`,
      )
    )
      return list;
    for (const k of Object.keys(s))
      need(
        [...OPCE, ...POLJA[s.objekt]].includes(k),
        `naboj_u_polju (${s.objekt}): nepoznato polje „${k}“`,
      );
    const ist = s.nacin === "istrazi";
    if (ist) noAnswerFields(s, need);
    const broj = (k, lo, hi, opis) =>
      need(
        isNum(s[k]) && s[k] > lo && s[k] <= hi,
        `${k} mora biti broj (${opis})`,
      );
    if (s.objekt === "cestica") {
      if (typeof s.cestica === "string")
        need(
          s.cestica in CESTICE,
          `cestica mora biti jedna od: ${Object.keys(CESTICE).join(", ")} ili {m, q}`,
        );
      else
        need(
          s.cestica &&
            isNum(s.cestica.m) &&
            s.cestica.m > 0 &&
            isNum(s.cestica.q) &&
            s.cestica.q !== 0,
          "cestica: {ime?, oznaka?, m (kg) > 0, q (C) ≠ 0}",
        );
      broj("v", 0, 3e8, "m/s, 0 < v < c");
      broj("B", 0, 100, "T, veći od 0");
      need(
        [...OKOMITO, "desno"].includes(s.smjer_B),
        `smjer_B mora biti "u_papir", "iz_papira" ili "desno"`,
      );
      if (OKOMITO.includes(s.smjer_B))
        need(
          s.kut == null || s.kut === 90,
          "kad je polje okomito na papir, brzina je okomita na polje (kut 90° ili bez kuta)",
        );
      else
        need(
          isNum(s.kut) && s.kut >= 0 && s.kut <= 180,
          "uz polje u ravnini papira treba kut (0–180°) između brzine i silnica",
        );
    } else {
      broj("B", 0, 100, "T, veći od 0");
      broj("I", 0, 1e4, "A, veća od 0");
      broj("l", 0, 1e4, "duljina vodiča u polju");
      if (s.jedinica_l != null)
        need(
          ["m", "cm", "mm"].includes(s.jedinica_l),
          "jedinica_l mora biti m, cm ili mm",
        );
      need(
        isNum(s.kut) && s.kut >= 0 && s.kut <= 180,
        "kut (0–180°) između vodiča i silnica",
      );
    }
    if (s.jedinica_B != null)
      need(s.jedinica_B in JEDINICE.B, "jedinica_B mora biti T, mT ili µT");
    const dop =
      s.objekt === "vodic"
        ? ["kut", "I", "B"]
        : krug(s)
          ? ["v", "B"]
          : ["kut", "v", "B"];
    if (
      s.klizaci != null &&
      need(
        Array.isArray(s.klizaci) &&
          s.klizaci.length >= 1 &&
          s.klizaci.length <= 3,
        "klizaci: 1–3 klizača",
      )
    ) {
      const ids = s.klizaci.map((k) => k?.id);
      need(
        new Set(ids).size === ids.length,
        "id-jevi klizača moraju biti različiti",
      );
      s.klizaci.forEach((k, i) => {
        if (
          !need(
            dop.includes(k?.id),
            `klizaci[${i}].id mora biti jedan od: ${dop.join(", ")}`,
          )
        )
          return;
        need(
          k.jedinica == null || k.jedinica in JEDINICE[k.id],
          `klizaci[${i}].jedinica za ${k.id} mora biti: ${Object.keys(JEDINICE[k.id]).join(", ")}`,
        );
        if (Array.isArray(k.vrijednosti))
          need(
            k.vrijednosti.length >= 2 &&
              k.vrijednosti.length <= 30 &&
              k.vrijednosti.every((x) => isNum(x) && x >= 0) &&
              k.vrijednosti.every(
                (x, j) => j === 0 || x > k.vrijednosti[j - 1],
              ),
            `klizaci[${i}].vrijednosti: 2–30 rastućih brojeva`,
          );
        else if (
          need(
            [k.min, k.max, k.korak].every(isNum) &&
              k.max > k.min &&
              k.korak > 0 &&
              (k.max - k.min) / k.korak <= 400,
            `klizaci[${i}] treba min < max i korak > 0 (najviše 400 koraka) ili vrijednosti`,
          )
        )
          need(
            Math.abs(
              (k.max - k.min) / k.korak - Math.round((k.max - k.min) / k.korak),
            ) < 1e-6,
            `klizaci[${i}]: (max − min) mora biti višekratnik koraka`,
          );
        if (k.id === "kut")
          need(
            vrijednostiKlizaca(k).every((x) => x >= 0 && x <= 180),
            `klizaci[${i}]: kut je od 0° do 180°`,
          );
        if (k.id !== "kut" && list.length === 0)
          need(
            vrijednostiKlizaca(k).every((x) => x > 0),
            `klizaci[${i}]: ${k.id} mora biti veći od 0`,
          );
        if (k.pocetak != null)
          need(
            vrijednostiKlizaca(k).some(
              (x) => Math.abs(x - k.pocetak) < 1e-9 * Math.max(1, Math.abs(x)),
            ),
            `klizaci[${i}].pocetak mora biti jedna od vrijednosti klizača`,
          );
        for (const key of Object.keys(k))
          need(
            [
              "id",
              "min",
              "max",
              "korak",
              "vrijednosti",
              "jedinica",
              "pocetak",
              "oznaka",
            ].includes(key),
            `klizaci[${i}] nema polje „${key}“`,
          );
      });
    }
    if (s.nacin === "pogodi") {
      need(
        krug(s),
        "pogodi radi samo kad je polje okomito na papir (smjer_B u_papir ili iz_papira)",
      );
      broj("detektor", 0, 100, "udaljenost detektora od ulaza u m");
      if (
        need(
          ["B", "v"].includes(s.mijenja) && klizacOf(s, s.mijenja),
          `mijenja mora biti "B" ili "v", a klizač s tim id-jem mora postojati`,
        ) &&
        !list.length
      ) {
        const k = klizacOf(s, s.mijenja);
        const rj = pogodiRjesenja(s);
        need(
          rj.length >= 1,
          "nijedan položaj klizača ne pogađa detektor; promijeni detektor ili raspon klizača",
        );
        need(
          rj.length <= 2,
          "detektor se pogađa s previše položaja klizača; smanji toleranciju ili korak",
        );
        const p = pocetakKlizaca(s, k);
        need(
          !rj.some((x) => Math.abs(x - p) < 1e-12 * Math.max(1, x)),
          "početni položaj klizača već pogađa detektor",
        );
      }
      if (s.tolerancija != null)
        need(
          isNum(s.tolerancija) && s.tolerancija > 0 && s.tolerancija <= 0.2,
          "tolerancija je udio udaljenosti detektora (npr. 0.03)",
        );
    } else {
      need(
        s.detektor == null && s.mijenja == null,
        "detektor i mijenja postoje samo u načinu pogodi",
      );
    }
    if (s.nacin === "izracunaj") {
      const vel =
        s.objekt === "vodic" ? ["F"] : krug(s) ? ["r", "F", "T"] : ["F"];
      if (
        need(
          s.pitaj && vel.includes(s.pitaj.velicina),
          `pitaj: {velicina: ${vel.join(" | ")}, jedinica?}`,
        )
      ) {
        need(
          s.pitaj.jedinica == null ||
            s.pitaj.jedinica in JED_ODG[s.pitaj.velicina],
          `pitaj.jedinica za ${s.pitaj.velicina} mora biti: ${Object.keys(JED_ODG[s.pitaj.velicina]).join(", ")}`,
        );
        need(
          Object.keys(s.pitaj).every((k) =>
            ["velicina", "jedinica"].includes(k),
          ),
          "pitaj ima samo velicina i jedinica",
        );
        if (!list.length) {
          const r = izracun(s);
          need(Number.isFinite(r.vrijednost), "rezultat se ne može izračunati");
          validateKrivo(s.krivo, r.vrijednost, tolIzr(s, r.vrijednost), need);
        }
      }
      need(
        s.klizaci == null,
        "u načinu izracunaj nema klizača (vrijednosti su zadane)",
      );
    } else need(s.pitaj == null, "pitaj postoji samo u načinu izracunaj");
    if (s.nacin !== "izracunaj")
      for (const k of ["savjet", ...(ist ? [] : ["krivo"])])
        need(s[k] == null, `polje „${k}“ ima smisla samo u načinu izracunaj`);
    return list;
  },
  check(s, odgovor) {
    if (s.nacin === "pogodi") {
      if (!isNum(odgovor) || odgovor <= 0)
        return { tocno: false, poruka: "Namjesti klizač.", prazno: true };
      const d = doskok(s, { [s.mijenja]: odgovor });
      if (Math.abs(d - s.detektor) <= pogodiTol(s)) return { tocno: true };
      const predaleko = d > s.detektor;
      const savjet =
        s.mijenja === "B"
          ? predaleko
            ? "Jače polje jače savija putanju: veće B → manji krug."
            : "Slabije polje manje savija putanju: manje B → veći krug."
          : predaleko
            ? "Sporija čestica kruži po manjoj kružnici: manja v → manji krug."
            : "Brža čestica kruži po većoj kružnici: veća v → veći krug.";
      return {
        tocno: false,
        poruka: `Čestica je pala ${predaleko ? "iza" : "ispred"} detektora: na ${withUnit(Number((d * 100).toPrecision(3)), "cm")} od ulaza, a detektor je na ${withUnit(Number((s.detektor * 100).toPrecision(3)), "cm")}. ${savjet} Pomoć: pada na udaljenosti 2r, a r = mv/(|q|B).`,
      };
    }
    if (s.nacin === "izracunaj") {
      const r = izracun(s);
      return checkFiz({
        input: odgovor,
        answer: r.vrijednost,
        tol: tolIzr(s, r.vrijednost),
        unit: r.jedinica,
        krivo: [...(s.krivo ?? []), ...bez(r.krivo, r.vrijednost)],
        savjet: s.savjet,
      });
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "pogodi") {
      const k = klizacOf(s, s.mijenja);
      return pogodiRjesenja(s)
        .map((x) => `${s.mijenja} = ${formatSci(x)} ${jedKlizaca(k)}`)
        .join(" ili ");
    }
    if (s.nacin === "izracunaj") {
      const r = izracun(s);
      return `${r.oznaka} = ${formatSci(r.vrijednost)} ${r.jedinica}`;
    }
    return "";
  },
  brojcaniOdgovor: (s) =>
    s?.nacin === "izracunaj" ? izracun(s).vrijednost : null,
  // za komponentu: pogodi šalje vrijednost klizača u SI
  uSI: (k, x) => x * faktor(k),
};
