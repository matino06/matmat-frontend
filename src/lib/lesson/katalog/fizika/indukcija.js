// indukcija: magnetski tok, Faradayev zakon i Lenzovo pravilo kao simulacija. Scene: petlja koja se zakreće u
// polju (Φ = BS cos α), magnet iznad/ispod petlje, petlja koja prolazi kroz područje polja (U = Blv) i graf toka
// s naponom kao nagibom. Sve vrijednosti (tok, napon, smjer struje, tipične krive vrijednosti) računa kod.
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
import {
  lenzMagnet,
  lenzPetlja,
  FAZE_PETLJE,
  OKOMITO,
  KRUZENJE,
  NEMA,
} from "./_magnetizam.js";
import { checkFiz } from "./_magnetizam.js";
import { poruka as porukaSmjera, natpis } from "./smjer_u_polju.js";

const SCENE = ["zakretanje", "magnet_petlja", "petlja_u_polje", "graf_toka"];
const NACINI = {
  zakretanje: ["istrazi", "izracunaj"],
  magnet_petlja: ["istrazi", "smjer"],
  petlja_u_polje: ["istrazi", "smjer", "izracunaj"],
  graf_toka: ["istrazi", "oznaci", "izracunaj"],
};
const POLJA = {
  zakretanje: ["B", "S", "jedinica_S", "N", "kut", "pitaj"],
  magnet_petlja: ["pol", "polozaj", "faze"],
  petlja_u_polje: [
    "B",
    "smjer_B",
    "l",
    "jedinica_l",
    "v",
    "R",
    "faze",
    "pitaj",
  ],
  graf_toka: ["tocke", "jedinica_toka", "N", "trazi", "dionica", "pitaj"],
};
const OPCE = [
  "tip",
  "scena",
  "nacin",
  "tekst",
  "krivo",
  "savjet",
  "tolerancija",
];

const TOK_JED = { Wb: 1, mWb: 1e-3, µWb: 1e-6, μWb: 1e-6 };
const S_JED = { "m²": 1, "dm²": 1e-2, "cm²": 1e-4, "mm²": 1e-6 };
const L_JED = { m: 1, cm: 0.01, mm: 0.001 };
const rad = (deg) => (deg * Math.PI) / 180;

// ── fizika ────────────────────────────────────────────────────────────────────────────────────────
export const povrsina = (s) => s.S * S_JED[s.jedinica_S ?? "m²"];
// Φ = B S cos α (kroz jedan zavoj); α je kut između silnica i okomice na plohu petlje
export const tokZakretanje = (s, kut = s.kut ?? 0) =>
  s.B * povrsina(s) * Math.cos(rad(kut));

// Magnet na osi petlje: tok razmjeran polju dipola na osi, Φ(z) ∝ 1 / (1 + z²)^(3/2) (z u polumjerima petlje).
export const tokMagnetaKrozPetlju = (z) => 1 / Math.pow(1 + z * z, 1.5);

// Petlja kroz područje polja: dionice gibanja i napon dok prednja stranica siječe silnice.
export const duljina = (s) => s.l * L_JED[s.jedinica_l ?? "m"];
export const naponPetlje = (s) => s.B * duljina(s) * s.v; // U = B ℓ v
export const strujaPetlje = (s) => naponPetlje(s) / s.R;
// Udio površine petlje u polju za položaj x prednje stranice (x u širinama petlje: 0 = upravo ulazi; područje je
// široko SIRINA_POLJA širina petlje). Iz njega Φ(x) i napon.
export const SIRINA_POLJA = 2;
export function udioUPolju(x) {
  const a = Math.max(0, Math.min(1, x));
  const b = Math.max(0, Math.min(1, x - SIRINA_POLJA));
  return a - b;
}
export function fazaPetlje(x) {
  if (x <= 0 || x >= SIRINA_POLJA + 1) return "izvan";
  if (x < 1) return "ulazi";
  if (x <= SIRINA_POLJA) return "unutra";
  return "izlazi";
}

// Graf toka: dionice s naponom U = −N ΔΦ/Δt (Φ u Wb)
export function dionice(s) {
  const k = TOK_JED[s.jedinica_toka ?? "mWb"];
  const N = s.N ?? 1;
  return s.tocke.slice(1).map((p, i) => {
    const [t0, f0] = s.tocke[i];
    const [t1, f1] = p;
    const dPhi = (f1 - f0) * k;
    const dt = t1 - t0;
    return { od: t0, do: t1, f0, f1, dPhi, dt, U: (-N * dPhi) / dt };
  });
}
const NULA_TOL = 1e-12;
export function tocneDionice(s) {
  const d = dionice(s);
  if (s.trazi === "nula")
    return d
      .map((x, i) => (Math.abs(x.U) < NULA_TOL ? i : -1))
      .filter((i) => i >= 0);
  const max = Math.max(...d.map((x) => Math.abs(x.U)));
  return d
    .map((x, i) => (Math.abs(Math.abs(x.U) - max) <= max * 1e-9 ? i : -1))
    .filter((i) => i >= 0);
}

// Pitanja „smjer“: Lenz po fazi, isti račun i iste poruke kao smjer_u_polju
export function fazaKaoScena(s, f) {
  if (s.scena === "magnet_petlja")
    return {
      scena: "lenz_magnet",
      pol: s.pol,
      polozaj: s.polozaj,
      gibanje: f.gibanje,
      oznaka: f.oznaka,
    };
  return {
    scena: "lenz_petlja",
    B: s.smjer_B,
    faza: typeof f === "string" ? f : f.faza,
    oznaka: typeof f === "string" ? undefined : f.oznaka,
  };
}
export const fazeOf = (s) => s.faze ?? [];
export const strujaFaze = (s, f) =>
  s.scena === "magnet_petlja"
    ? lenzMagnet(fazaKaoScena(s, f)).struja
    : lenzPetlja(fazaKaoScena(s, f)).struja;
const FAZA_TXT = {
  izvan: "izvan polja",
  ulazi: "ulazi u polje",
  unutra: "cijela u polju",
  izlazi: "izlazi iz polja",
  priblizava: "magnet se približava",
  udaljava: "magnet se udaljava",
  miruje: "magnet miruje",
};
export const oznakaFaze = (s, f, i) =>
  (typeof f === "object" && f.oznaka) ||
  `${i + 1}. ${FAZA_TXT[typeof f === "string" ? f : (f.gibanje ?? f.faza)]}`;

// ── izračunaj: točan iznos i tipične krive vrijednosti ────────────────────────────────────────────
export function izracun(s) {
  if (s.scena === "zakretanje") {
    const jed = s.pitaj?.jedinica ?? "Wb";
    const f = 1 / TOK_JED[jed];
    const a = rad(s.kut ?? 0);
    const B = s.B;
    const S = povrsina(s);
    const k = [];
    if (Math.abs(Math.sin(a) - Math.cos(a)) > 1e-6)
      k.push({
        vrijednost: B * S * Math.sin(a) * f,
        poruka:
          "Uzeo si sinus. U Φ = BS cos α kut α je između silnica i okomice na plohu petlje, zato kosinus.",
      });
    if (Math.abs(Math.cos(a) - 1) > 1e-6)
      k.push({
        vrijednost: B * S * f,
        poruka:
          "To je tok kad su silnice okomite na petlju. Petlja je zakrenuta, pa pomnoži s cos α.",
      });
    if ((s.jedinica_S ?? "m²") !== "m²")
      k.push({
        vrijednost: B * s.S * Math.cos(a) * f,
        poruka: `Površinu treba pretvoriti u m²: 1 ${s.jedinica_S} = ${formatSci(S_JED[s.jedinica_S])} m².`,
      });
    if ((s.N ?? 1) > 1)
      k.push({
        vrijednost: s.N * B * S * Math.cos(a) * f,
        poruka:
          "Tok se računa kroz jedan zavoj, bez broja zavoja N (N ulazi tek u inducirani napon).",
      });
    return {
      vrijednost: B * S * Math.cos(a) * f,
      jedinica: jed,
      oznaka: "Φ",
      krivo: k,
    };
  }
  if (s.scena === "petlja_u_polje") {
    const U = naponPetlje(s);
    const uCm = s.B * s.l * s.v;
    if ((s.pitaj?.velicina ?? "U") === "U") {
      const k = [];
      if ((s.jedinica_l ?? "m") !== "m")
        k.push({
          vrijednost: uCm,
          poruka: `Duljinu stranice treba pretvoriti u metre: ${withUnit(s.l, s.jedinica_l)} = ${withUnit(duljina(s), "m")}.`,
        });
      if (isNum(s.R))
        k.push({
          vrijednost: U / s.R,
          poruka: "To je struja I = U/R, a pita se napon.",
        });
      return { vrijednost: U, jedinica: "V", oznaka: "U", krivo: k };
    }
    const k = [
      {
        vrijednost: U,
        poruka: "To je napon U = Blv. Struju daje Ohmov zakon: I = U/R.",
      },
      {
        vrijednost: U * s.R,
        poruka: "Pomnožio si s otporom. Ohmov zakon: I = U/R.",
      },
      { vrijednost: s.R / U, poruka: "Obrnuo si omjer. Ohmov zakon: I = U/R." },
    ];
    if ((s.jedinica_l ?? "m") !== "m")
      k.push({
        vrijednost: uCm / s.R,
        poruka: `Duljinu stranice treba pretvoriti u metre: ${withUnit(s.l, s.jedinica_l)} = ${withUnit(duljina(s), "m")}.`,
      });
    return { vrijednost: U / s.R, jedinica: "A", oznaka: "I", krivo: k };
  }
  // graf_toka
  const d = dionice(s)[s.dionica - 1];
  const N = s.N ?? 1;
  const kj = TOK_JED[s.jedinica_toka ?? "mWb"];
  const U = Math.abs(d.U);
  const k = [];
  if (N > 1)
    k.push({
      vrijednost: Math.abs(d.dPhi / d.dt),
      poruka: `Zaboravio si broj zavoja: U = N·ΔΦ/Δt, a N = ${N}.`,
    });
  if (kj !== 1)
    k.push({
      vrijednost: (N * Math.abs(d.f1 - d.f0)) / d.dt,
      poruka: `Tok je u ${s.jedinica_toka ?? "mWb"}: pretvori ga u Wb (1 ${s.jedinica_toka ?? "mWb"} = ${formatSci(kj)} Wb).`,
    });
  if (d.dt !== 1)
    k.push({
      vrijednost: N * Math.abs(d.dPhi),
      poruka:
        "Zaboravio si podijeliti s vremenom: napon je promjena toka u jedinici vremena, ΔΦ/Δt.",
    });
  if (d.do !== d.dt)
    k.push({
      vrijednost: (N * Math.abs(d.dPhi)) / d.do,
      poruka: `Dijeli s trajanjem dionice Δt = ${withUnit(d.dt, "s")}, a ne s trenutkom kraja.`,
    });
  if (Math.abs(d.f1) !== Math.abs(d.f1 - d.f0))
    k.push({
      vrijednost: (N * Math.abs(d.f1) * kj) / d.dt,
      poruka:
        "Uzeo si visinu grafa (tok), a treba promjena toka ΔΦ (razlika na kraju i početku dionice).",
    });
  if (Math.abs(d.dPhi) > 0)
    k.push({
      vrijednost: (N * d.dt) / Math.abs(d.dPhi),
      poruka: "Obrnuo si omjer: U = N·ΔΦ/Δt.",
    });
  return { vrijednost: U, jedinica: "V", oznaka: "U", krivo: k };
}
const bez = (krivo, a) =>
  krivo.filter(
    (k) =>
      Number.isFinite(k.vrijednost) &&
      Math.abs(k.vrijednost - a) >
        Math.max(Math.abs(a) * 0.011, Math.abs(k.vrijednost) * 1e-6),
  );
const tol = (s, a) =>
  isNum(s.tolerancija) ? s.tolerancija : Math.max(1e-15, Math.abs(a) * 0.01);

// ── opis i primjeri ───────────────────────────────────────────────────────────────────────────────
export const indukcija = {
  tip: "indukcija",
  samoRucno: true,
  uloga: (s) => (s?.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s?.nacin === "istrazi",
  opis: `Elektromagnetska indukcija kao simulacija. Polja: tekst, scena, nacin ("istrazi" = korak za gledanje, ostalo = Tvoj red).
Scene i načini:
- "zakretanje": petlja u homogenom polju, klizač kuta i gumb „Vrti“ (grafovi Φ(t) i U(t)). B (T), S, jedinica_S? ("m²" | "cm²", zadano m²), N? (zavoji), kut? (°, kut između silnica i okomice na petlju).
  nacin "istrazi" | "izracunaj" (Φ = BS cos α pri kutu; pitaj?: {jedinica: "Wb" | "mWb"}).
- "magnet_petlja": štapićasti magnet iznad ili ispod vodoravne petlje: pol ("N" | "S", pol prema petlji), polozaj ("iznad" | "ispod").
  nacin "istrazi" (učenik vuče magnet, galvanometar i struja uživo) | "smjer" (faze: [{gibanje: "priblizava" | "udaljava" | "miruje", oznaka?}] 1–3; učenik za svaku bira ↻ / ↺ / nema, gledano odozgo).
- "petlja_u_polje": pravokutna petlja ulazi u područje polja, prolazi ga i izlazi: B (T), smjer_B ("u_papir" | "iz_papira"), l (prednja stranica), jedinica_l? ("m" | "cm"), v (m/s), R? (Ω).
  nacin "istrazi" (pokreni/povuci petlju, grafovi Φ i U) | "smjer" (faze: 1–4 od "izvan", "ulazi", "unutra", "izlazi") | "izracunaj" (pitaj: {velicina: "U" | "I"} dok petlja ulazi; za I treba R).
- "graf_toka": graf Φ(t) po dionicama: tocke [[t (s), Φ], …] (3–6 točaka, t raste), jedinica_toka? ("mWb" zadano | "Wb" | "µWb"), N? (zavoji, zadano 1); ispod je graf napona U = −N·ΔΦ/Δt.
  nacin "istrazi" | "oznaci" (trazi: "najveci" | "nula": učenik dodirne dionicu s najvećim / nultim naponom) | "izracunaj" (dionica: redni broj od 1, učenik upiše iznos napona u V).
Za "izracunaj" točan iznos i tipične krive vrijednosti (sinus umjesto kosinusa, cm² ili mWb nepretvoreni, bez N, visina umjesto nagiba, I = U·R…) računa aplikacija; ${KRIVO_OPIS}; tolerancija? (zadano 1 %).`,
  primjer: {
    tip: "indukcija",
    scena: "graf_toka",
    nacin: "oznaci",
    tekst: "Dodirni dionicu u kojoj je inducirani napon najveći.",
    tocke: [
      [0, 0],
      [4, 4],
      [6, 4],
      [7, 0],
    ],
    jedinica_toka: "mWb",
    N: 200,
    trazi: "najveci",
  },
  primjeri: [
    {
      tip: "indukcija",
      scena: "graf_toka",
      nacin: "oznaci",
      tekst: "Dodirni dionicu u kojoj je inducirani napon nula.",
      tocke: [
        [0, 0],
        [4, 4],
        [6, 4],
        [7, 0],
      ],
      jedinica_toka: "mWb",
      N: 200,
      trazi: "nula",
    },
    {
      tip: "indukcija",
      scena: "graf_toka",
      nacin: "izracunaj",
      tekst:
        "Koliki je inducirani napon u prvoj dionici? Zavojnica ima 200 zavoja.",
      tocke: [
        [0, 0],
        [4, 4],
        [6, 4],
        [7, 0],
      ],
      jedinica_toka: "mWb",
      N: 200,
      dionica: 1,
    },
    {
      tip: "indukcija",
      scena: "graf_toka",
      nacin: "istrazi",
      tekst:
        "Povuci crtu po grafu toka i gledaj napon ispod: ovisi o nagibu, a ne o visini.",
      tocke: [
        [0, 0],
        [4, 4],
        [6, 4],
        [7, 0],
      ],
      jedinica_toka: "mWb",
      N: 200,
    },
    {
      tip: "indukcija",
      scena: "zakretanje",
      nacin: "istrazi",
      tekst:
        "Zakreći petlju klizačem ili je pusti da se vrti i gledaj tok i napon.",
      B: 0.4,
      S: 12,
      jedinica_S: "cm²",
    },
    {
      tip: "indukcija",
      scena: "zakretanje",
      nacin: "izracunaj",
      tekst:
        "Zavoj površine 12 cm² zakrenut je za 60°. Koliki je tok kroz njega u polju 0,4 T?",
      B: 0.4,
      S: 12,
      jedinica_S: "cm²",
      N: 200,
      kut: 60,
    },
    {
      tip: "indukcija",
      scena: "magnet_petlja",
      nacin: "istrazi",
      tekst:
        "Povuci magnet prema petlji i od nje i gledaj galvanometar i smjer struje.",
      pol: "N",
      polozaj: "iznad",
    },
    {
      tip: "indukcija",
      scena: "magnet_petlja",
      nacin: "smjer",
      tekst: "Kojim smjerom teče inducirana struja, gledano odozgo?",
      pol: "N",
      polozaj: "iznad",
      faze: [{ gibanje: "priblizava" }, { gibanje: "udaljava" }],
    },
    {
      tip: "indukcija",
      scena: "petlja_u_polje",
      nacin: "istrazi",
      tekst: "Pokreni petlju (ili je povuci) i prati graf napona.",
      B: 0.25,
      smjer_B: "u_papir",
      l: 40,
      jedinica_l: "cm",
      v: 5,
      R: 2.5,
    },
    {
      tip: "indukcija",
      scena: "petlja_u_polje",
      nacin: "smjer",
      tekst:
        "Kojim smjerom teče struja dok petlja ulazi, dok je cijela u polju i dok izlazi?",
      B: 0.25,
      smjer_B: "u_papir",
      l: 40,
      jedinica_l: "cm",
      v: 5,
      R: 2.5,
      faze: ["ulazi", "unutra", "izlazi"],
    },
    {
      tip: "indukcija",
      scena: "petlja_u_polje",
      nacin: "izracunaj",
      tekst: "Koliku struju polje inducira dok petlja ulazi?",
      B: 0.25,
      smjer_B: "u_papir",
      l: 40,
      jedinica_l: "cm",
      v: 5,
      R: 2.5,
      pitaj: { velicina: "I" },
    },
  ],
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "indukcija treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `indukcija.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return list;
    if (
      !need(
        NACINI[s.scena].includes(s.nacin),
        `za scenu „${s.scena}“ nacin mora biti: ${NACINI[s.scena].join(", ")}`,
      )
    )
      return list;
    for (const k of Object.keys(s))
      need(
        [...OPCE, ...POLJA[s.scena]].includes(k),
        `indukcija (${s.scena}): nepoznato polje „${k}“`,
      );
    const ist = s.nacin === "istrazi";
    if (ist) noAnswerFields(s, need);
    const broj = (k, lo, hi, opis) =>
      need(
        isNum(s[k]) && s[k] > lo && s[k] <= hi,
        `${k} mora biti broj (${opis})`,
      );
    const nepotrebno = (keys, kada) =>
      keys.forEach((k) =>
        need(s[k] == null, `polje „${k}“ ima smisla samo ${kada}`),
      );
    if (s.nacin !== "izracunaj")
      nepotrebno(
        ["pitaj", "savjet", "tolerancija", ...(ist ? [] : ["krivo"])],
        "u načinu izracunaj",
      );

    if (s.scena === "zakretanje") {
      broj("B", 0, 100, "T, veći od 0");
      broj("S", 0, 1e6, "površina, veća od 0");
      if (s.jedinica_S != null)
        need(
          s.jedinica_S in S_JED,
          `jedinica_S mora biti jedna od: ${Object.keys(S_JED).join(", ")}`,
        );
      if (s.N != null)
        need(
          Number.isInteger(s.N) && s.N >= 1 && s.N <= 10000,
          "N je cijeli broj zavoja (1–10000)",
        );
      if (s.kut != null)
        need(
          isNum(s.kut) && s.kut >= 0 && s.kut <= 180,
          "kut je u stupnjevima, 0–180",
        );
      if (s.nacin === "izracunaj") {
        need(isNum(s.kut), "izracunaj treba kut (°) pri kojem se računa tok");
        if (s.pitaj != null)
          need(
            typeof s.pitaj === "object" &&
              ["Wb", "mWb", "µWb"].includes(s.pitaj.jedinica ?? "Wb") &&
              Object.keys(s.pitaj).every((k) =>
                ["jedinica", "velicina"].includes(k),
              ),
            "pitaj: {jedinica: Wb | mWb | µWb}",
          );
      }
    }
    if (s.scena === "magnet_petlja") {
      need(
        ["N", "S"].includes(s.pol),
        `pol (pol okrenut prema petlji) mora biti "N" ili "S"`,
      );
      need(
        ["iznad", "ispod"].includes(s.polozaj),
        `polozaj mora biti "iznad" ili "ispod"`,
      );
      if (s.nacin === "smjer") {
        if (
          need(
            Array.isArray(s.faze) && s.faze.length >= 1 && s.faze.length <= 3,
            "faze: 1–3 faze [{gibanje, oznaka?}]",
          )
        )
          s.faze.forEach((f, i) => {
            need(
              ["priblizava", "udaljava", "miruje"].includes(f?.gibanje),
              `faze[${i}].gibanje mora biti priblizava, udaljava ili miruje`,
            );
            if (f?.oznaka != null)
              need(isText(f.oznaka), `faze[${i}].oznaka mora biti tekst`);
            for (const k of Object.keys(f ?? {}))
              need(
                ["gibanje", "oznaka"].includes(k),
                `faze[${i}] nema polje „${k}“`,
              );
          });
      } else nepotrebno(["faze"], "u načinu smjer");
    }
    if (s.scena === "petlja_u_polje") {
      broj("B", 0, 100, "T, veći od 0");
      need(
        OKOMITO.includes(s.smjer_B),
        `smjer_B mora biti "u_papir" ili "iz_papira"`,
      );
      broj("l", 0, 1000, "duljina prednje stranice, veća od 0");
      if (s.jedinica_l != null)
        need(s.jedinica_l in L_JED, "jedinica_l mora biti m, cm ili mm");
      broj("v", 0, 1e4, "brzina u m/s, veća od 0");
      if (s.R != null) broj("R", 0, 1e6, "otpor petlje u Ω");
      if (s.nacin === "smjer") {
        if (
          need(
            Array.isArray(s.faze) && s.faze.length >= 1 && s.faze.length <= 4,
            "faze: 1–4 od izvan, ulazi, unutra, izlazi",
          )
        )
          s.faze.forEach((f, i) =>
            need(
              FAZE_PETLJE.includes(f) ||
                (FAZE_PETLJE.includes(f?.faza) &&
                  (f.oznaka == null || isText(f.oznaka))),
              `faze[${i}] mora biti jedna od: ${FAZE_PETLJE.join(", ")} (ili {faza, oznaka})`,
            ),
          );
      } else nepotrebno(["faze"], "u načinu smjer");
      if (s.nacin === "izracunaj") {
        if (
          need(
            s.pitaj && ["U", "I"].includes(s.pitaj.velicina),
            `pitaj: {velicina: "U" | "I"}`,
          )
        ) {
          need(
            Object.keys(s.pitaj).every((k) => ["velicina"].includes(k)),
            "pitaj ima samo polje velicina",
          );
          if (s.pitaj.velicina === "I")
            need(isNum(s.R), "za struju I treba otpor R");
        }
      }
    }
    if (s.scena === "graf_toka") {
      const okT = need(
        Array.isArray(s.tocke) &&
          s.tocke.length >= 3 &&
          s.tocke.length <= 6 &&
          s.tocke.every(
            (p) => Array.isArray(p) && p.length === 2 && p.every(isNum),
          ),
        "tocke: 3–6 točaka [t, Φ]",
      );
      if (okT) {
        need(
          s.tocke.every((p, i) => i === 0 || p[0] > s.tocke[i - 1][0]),
          "vrijeme t u tockama mora strogo rasti",
        );
        need(s.tocke[0][0] >= 0, "graf počinje u t ≥ 0");
        need(
          s.tocke.every((p) => p[1] >= 0),
          "tok u grafu neka bude ≥ 0 (crta se od nule)",
        );
        need(
          s.tocke.some((p) => p[1] > 0),
          "tok ne smije biti stalno nula",
        );
      }
      if (s.jedinica_toka != null)
        need(
          s.jedinica_toka in TOK_JED,
          `jedinica_toka mora biti jedna od: Wb, mWb, µWb`,
        );
      if (s.N != null)
        need(
          Number.isInteger(s.N) && s.N >= 1 && s.N <= 10000,
          "N je cijeli broj zavoja (1–10000)",
        );
      if (s.nacin === "oznaci") {
        if (
          need(
            ["najveci", "nula"].includes(s.trazi),
            `oznaci treba trazi: "najveci" ili "nula"`,
          ) &&
          okT &&
          !list.length
        ) {
          const t = tocneDionice(s);
          if (s.trazi === "najveci")
            need(
              t.length === 1,
              "najveći napon mora biti u točno jednoj dionici (dvije su jednako strme)",
            );
          else
            need(
              t.length >= 1 && t.length < dionice(s).length,
              "za trazi nula graf treba barem jednu vodoravnu dionicu i barem jednu koja nije",
            );
        }
      } else nepotrebno(["trazi"], "u načinu oznaci");
      if (s.nacin === "izracunaj")
        need(
          Number.isInteger(s.dionica) &&
            okT &&
            s.dionica >= 1 &&
            s.dionica < s.tocke.length,
          `dionica mora biti redni broj dionice (1–${okT ? s.tocke.length - 1 : "?"})`,
        );
      else nepotrebno(["dionica"], "u načinu izracunaj");
    }
    if (s.nacin === "izracunaj" && !list.length) {
      const r = izracun(s);
      need(Number.isFinite(r.vrijednost), "rezultat se ne može izračunati");
      validateKrivo(s.krivo, r.vrijednost, tol(s, r.vrijednost), need);
    }
    return list;
  },
  check(s, odgovor) {
    if (s.nacin === "smjer") {
      const f = fazeOf(s);
      const o = Array.isArray(odgovor) ? odgovor : [];
      if (
        o.length !== f.length ||
        o.some((x) => ![...KRUZENJE, NEMA].includes(x))
      )
        return {
          tocno: false,
          poruka: "Odaberi smjer struje za svaku fazu.",
          prazno: true,
        };
      for (let i = 0; i < f.length; i++) {
        const r = strujaFaze(s, f[i]);
        if (o[i] !== r)
          return {
            tocno: false,
            kriv: i,
            poruka: `**${oznakaFaze(s, f[i], i)}:** ${porukaSmjera(fazaKaoScena(s, f[i]), o[i], r)}`,
          };
      }
      return { tocno: true };
    }
    if (s.nacin === "oznaci") {
      if (!Number.isInteger(odgovor))
        return {
          tocno: false,
          poruka: "Dodirni jednu dionicu grafa.",
          prazno: true,
        };
      const d = dionice(s);
      if (tocneDionice(s).includes(odgovor)) return { tocno: true };
      const x = d[odgovor];
      if (!x)
        return {
          tocno: false,
          poruka: "Dodirni jednu dionicu grafa.",
          prazno: true,
        };
      const najvisa = Math.max(...s.tocke.map((p) => p[1]));
      if (s.trazi === "najveci") {
        if (Math.abs(x.U) < NULA_TOL && Math.max(x.f0, x.f1) === najvisa)
          return {
            tocno: false,
            poruka:
              "Tu je tok najveći, ali se ne mijenja: graf je vodoravan, pa je napon nula. Napon ovisi o nagibu grafa, a ne o visini.",
          };
        if (Math.abs(x.U) < NULA_TOL)
          return {
            tocno: false,
            poruka:
              "Tu je graf vodoravan: tok se ne mijenja, pa je napon nula. Traži najstrmiju dionicu.",
          };
        return {
          tocno: false,
          poruka: `U ${odgovor + 1}. dionici tok se mijenja, ali ima strmija dionica. Napon je razmjeran nagibu: ΔΦ/Δt.`,
        };
      }
      return {
        tocno: false,
        poruka:
          "Tu se tok mijenja (graf nije vodoravan), pa napon nije nula. Napon je nula gdje je graf vodoravan, makar tok bio velik.",
      };
    }
    if (s.nacin === "izracunaj") {
      const r = izracun(s);
      return checkFiz({
        input: odgovor,
        answer: r.vrijednost,
        tol: tol(s, r.vrijednost),
        unit: r.jedinica,
        krivo: [...(s.krivo ?? []), ...bez(r.krivo, r.vrijednost)],
        savjet: s.savjet,
      });
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "smjer")
      return fazeOf(s)
        .map(
          (f, i) =>
            `${oznakaFaze(s, f, i)}: ${natpis(fazaKaoScena(s, f), strujaFaze(s, f))}`,
        )
        .join("; ");
    if (s.nacin === "oznaci")
      return tocneDionice(s)
        .map((i) => `${i + 1}. dionica`)
        .join(" ili ");
    if (s.nacin === "izracunaj") {
      const r = izracun(s);
      return `${r.oznaka} = ${formatSci(r.vrijednost)} ${r.jedinica}`;
    }
    return "";
  },
  brojcaniOdgovor: (s) =>
    s?.nacin === "izracunaj" ? izracun(s).vrijednost : null,
};
