// ploce_polje: homogeno polje između dviju paralelnih ploča — nabijena čestica (ubrzanje iz mirovanja, otklon pri
// vodoravnom uletu) i pločasti kondenzator (C, Q, U, E, W; dielektrik uz spojen ili odspojen izvor). Fiziku računa
// _elektrostatika.js, isti kod za crtež i za provjeru. Konstante su iz knjižice formula.
import { isNum, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
} from "../zajednicko.js";
import {
  putanja,
  nakonAkcije,
  smjeroviPromjene,
  VELICINE_KOND,
  M_E,
  M_P,
} from "./_elektrostatika.js";

const NACINI = ["istrazi", "pogodi", "predvidi"];
const KLIZACI = ["U", "d", "A", "er", "v0"];
export const PRIKAZI_PLOCE = [
  "E",
  "F",
  "a",
  "v",
  "W",
  "t",
  "y",
  "C",
  "Q",
  "U",
  "Wel",
];
const AKCIJE = ["dielektrik", "razmakni", "povecaj_A"];
export const NAZIV_VELICINE = {
  Q: "naboj Q",
  C: "kapacitet C",
  U: "napon U",
  E: "jakost polja E",
  W: "energija W",
};
const SMJER_OPIS = { gore: "raste", dolje: "pada", isto: "ostaje isti" };

const tri = (v) => formatNumber(Number(v.toPrecision(3)));
const fmtMm = (v) => `${tri(v)}\u00a0mm`;
const fmtCm = (v) => `${tri(v)}\u00a0cm`;

const imaCesticu = (s) => s.cestica != null;

function validateCestica(s, need) {
  const c = s.cestica;
  if (!need(c && typeof c === "object", "cestica treba {vrsta, ulaz, v0?}"))
    return;
  need(
    ["proton", "elektron"].includes(c.vrsta),
    "cestica.vrsta mora biti proton ili elektron",
  );
  need(
    ["mirovanje", "vodoravno"].includes(c.ulaz),
    "cestica.ulaz mora biti mirovanje (kreće uz ploču) ili vodoravno (ulijeće okomito na silnice)",
  );
  if (c.ulaz === "vodoravno") {
    need(
      isNum(c.v0) && c.v0 >= 1e3 && c.v0 <= 1e8,
      "cestica.v0 (m/s) mora biti između 1000 i 10⁸ (manje od brzine svjetlosti)",
    );
    need(
      isNum(s.L) && s.L >= 1 && s.L <= 50,
      "vodoravni ulet treba L (duljina ploča, cm, 1–50)",
    );
  } else need(c.v0 == null, "čestica iz mirovanja nema v0");
}

export const ploce_polje = {
  tip: "ploce_polje",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Homogeno polje između dviju vodoravnih ploča (gornja +, donja −). Konstante iz knjižice (e = 1,6·10⁻¹⁹ C, mₑ = 9,11·10⁻³¹ kg,
mₚ = 1,67·10⁻²⁷ kg, ε₀ = 8,85·10⁻¹² F/m). Polja: tekst, nacin, U? (V) ili E? (V/m), d (razmak, mm), L? (duljina ploča, cm),
A? (površina ploča, cm²) ili C? (pF), er? (zadano 1), izvor? ("spojen" | "odspojen"),
cestica?: {vrsta: "proton" | "elektron", ulaz: "mirovanje" (kreće uz ploču istog predznaka) | "vodoravno" (ulijeće sredinom, okomito na silnice), v0? (m/s)}.
- "istrazi": korak za gledanje; klizaci?: ["U", "d", "A", "er", "v0"]; prikazi?: ["E", "F", "a", "v", "W", "t", "y", "C", "Q", "U", "Wel"].
  S česticom: gumb „Pusti“ animira gibanje (ubrzanje ili parabola) i pokazuje očitanja. Bez čestice: kondenzator (C, Q, U, E, W uživo,
  gustoća naboja na pločama i silnica); uz izvor učenik spaja/odspaja izvor i vidi što ostaje stalno (Q ili U).
- "pogodi": cestica s ulaz "vodoravno", L i d obavezni. Učenik povuče oznaku na mjesto gdje čestica izlazi iz ploča (desni rub, otklon y u mm)
  ili udari u ploču (x u cm od ulaza), pa provjeri; zatim čestica proleti. Točno: |y − y*| ≤ max(tolerancija, 8 % y*), y* = ½·(qE/m)·(L/v₀)²
  (isto za x). Poruke za krivu ploču, zaboravljenu ½, krivu masu i izlaz/udar su automatske; krivo?: [{vrijednost (mm), poruka}].
- "predvidi": kondenzator (U i C ili A, d) s izvor "spojen" | "odspojen" i akcija: {vrsta: "dielektrik" (er) | "razmakni" (faktor, d × faktor) |
  "povecaj_A" (faktor), naziv? (npr. "guma")}; pitaj: popis iz ["Q", "C", "U", "E", "W"]. Učenik za svaku bira raste / pada / isto;
  točno računa aplikacija (odspojen: Q stalan; spojen: U stalan), a nakon odgovora animacija izvede promjenu i pokaže faktore.`,
  primjer: {
    tip: "ploce_polje",
    nacin: "pogodi",
    tekst:
      "Elektron ulijeće brzinom $2 \\cdot 10^7$ m/s okomito na silnice polja jakosti 2000 V/m. Ploče su duge 8 cm. Izračunaj otklon i povuci oznaku na mjesto gdje će elektron izaći.",
    E: 2000,
    d: 10,
    L: 8,
    cestica: { vrsta: "elektron", v0: 2e7, ulaz: "vodoravno" },
  },
  primjeri: [
    {
      tip: "ploce_polje",
      nacin: "istrazi",
      tekst:
        "Proton kreće iz mirovanja uz pozitivnu ploču. Mijenjaj napon i razmak, pusti proton i gledaj polje, akceleraciju i brzinu udara.",
      U: 200,
      d: 5,
      cestica: { vrsta: "proton", ulaz: "mirovanje" },
      klizaci: ["U", "d"],
      prikazi: ["E", "a", "W", "v"],
    },
    {
      tip: "ploce_polje",
      nacin: "istrazi",
      tekst:
        "Elektron ulijeće među ploče. Mijenjaj brzinu i napon i pusti ga: koliko skrene?",
      U: 20,
      d: 10,
      L: 8,
      cestica: { vrsta: "elektron", v0: 2e7, ulaz: "vodoravno" },
      klizaci: ["v0", "U"],
      prikazi: ["E", "a", "t", "y"],
    },
    {
      tip: "ploce_polje",
      nacin: "istrazi",
      tekst:
        "Mijenjaj površinu ploča, razmak i dielektrik i gledaj kapacitet. Odspoji izvor pa ponovo mijenjaj: što ostaje isto?",
      U: 500,
      A: 200,
      d: 1,
      izvor: "spojen",
      klizaci: ["A", "d", "er"],
      prikazi: ["C", "Q", "U", "E", "Wel"],
    },
    {
      tip: "ploce_polje",
      nacin: "predvidi",
      tekst:
        "Kondenzator je odspojen od izvora. Između ploča umetnemo gumu ($\\varepsilon_r = 2{,}5$). Što se dogodi s nabojem, kapacitetom, naponom i energijom?",
      C: 40,
      U: 500,
      izvor: "odspojen",
      akcija: { vrsta: "dielektrik", er: 2.5, naziv: "guma" },
      pitaj: ["Q", "C", "U", "W"],
    },
    {
      tip: "ploce_polje",
      nacin: "predvidi",
      tekst:
        "Kondenzator ostaje spojen na izvor, a razmak ploča udvostručimo. Što se dogodi?",
      C: 40,
      U: 500,
      d: 1,
      izvor: "spojen",
      akcija: { vrsta: "razmakni", faktor: 2 },
      pitaj: ["C", "Q", "U", "E"],
    },
    {
      tip: "ploce_polje",
      nacin: "pogodi",
      tekst:
        "Proton ulijeće brzinom $2 \\cdot 10^5$ m/s među ploče razmaka 10 mm i napona 100 V. Gdje udari? Povuci oznaku.",
      U: 100,
      d: 10,
      L: 10,
      cestica: { vrsta: "proton", v0: 2e5, ulaz: "vodoravno" },
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (
      !need(
        NACINI.includes(s.nacin),
        `ploce_polje.nacin mora biti jedan od: ${NACINI.join(", ")}`,
      )
    )
      return list;
    need(isText(s.tekst), "ploce_polje treba „tekst“");
    need(
      !(s.U != null && s.E != null),
      "zadaj ili U (napon) ili E (jakost polja), ne oboje",
    );
    if (s.U != null)
      need(
        isNum(s.U) && s.U > 0 && s.U <= 1e6,
        "U (V) mora biti pozitivan broj do 10⁶",
      );
    if (s.E != null)
      need(
        isNum(s.E) && s.E > 0 && s.E <= 1e8,
        "E (V/m) mora biti pozitivan broj do 10⁸",
      );
    need(
      s.U != null || s.E != null,
      "ploce_polje treba napon U (V) ili jakost polja E (V/m)",
    );
    if (s.d != null)
      need(
        isNum(s.d) && s.d >= 0.1 && s.d <= 100,
        "d (razmak ploča) mora biti između 0,1 i 100 mm",
      );
    if (s.L != null)
      need(
        isNum(s.L) && s.L >= 1 && s.L <= 50,
        "L (duljina ploča) mora biti između 1 i 50 cm",
      );
    need(
      !(s.A != null && s.C != null),
      "zadaj ili A (površina ploča) ili C (kapacitet), ne oboje",
    );
    if (s.A != null)
      need(
        isNum(s.A) && s.A >= 1 && s.A <= 10000,
        "A (površina ploča) mora biti između 1 i 10 000 cm²",
      );
    if (s.C != null)
      need(
        isNum(s.C) && s.C >= 0.1 && s.C <= 1e6,
        "C (kapacitet) mora biti između 0,1 i 10⁶ pF",
      );
    if (s.er != null)
      need(
        isNum(s.er) && s.er >= 1 && s.er <= 100,
        "er (relativna permitivnost) mora biti između 1 i 100",
      );
    if (s.izvor != null)
      need(
        ["spojen", "odspojen"].includes(s.izvor),
        "izvor mora biti spojen ili odspojen",
      );
    if (s.cestica != null) validateCestica(s, need);
    if (s.prikazi != null)
      need(
        Array.isArray(s.prikazi) &&
          s.prikazi.length >= 1 &&
          s.prikazi.every((p) => PRIKAZI_PLOCE.includes(p)),
        `prikazi smije sadržavati samo: ${PRIKAZI_PLOCE.join(", ")}`,
      );
    if (imaCesticu(s)) {
      need(isNum(s.d), "čestica među pločama treba d (razmak, mm)");
      need(
        s.A == null && s.C == null && s.izvor == null,
        "čestica među pločama ne koristi A, C ni izvor (to je za kondenzator)",
      );
    }

    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      need(
        s.akcija == null && s.pitaj == null && s.pogodi == null,
        "istrazi nema akcija, pitaj ni pogodi",
      );
      if (!imaCesticu(s)) {
        need(s.U != null, "kondenzator treba napon U (V)");
        need(
          s.C != null || (s.A != null && s.d != null),
          "kondenzator treba C (pF) ili A (cm²) i d (mm)",
        );
      }
      if (
        s.klizaci != null &&
        need(
          Array.isArray(s.klizaci) &&
            s.klizaci.every((k) => KLIZACI.includes(k)) &&
            new Set(s.klizaci).size === s.klizaci.length,
          `klizaci smije sadržavati samo: ${KLIZACI.join(", ")} (bez ponavljanja)`,
        )
      ) {
        if (s.klizaci.includes("v0"))
          need(
            s.cestica?.ulaz === "vodoravno",
            "klizač v0 postoji samo uz vodoravni ulet čestice",
          );
        if (s.klizaci.includes("A"))
          need(s.A != null, "klizač A treba zadanu površinu A");
        if (s.klizaci.includes("er"))
          need(
            !imaCesticu(s),
            "klizač er (dielektrik) je za kondenzator bez čestice",
          );
        if (s.klizaci.includes("d"))
          need(isNum(s.d), "klizač d treba zadan razmak d");
      }
      return list;
    }
    need(s.klizaci == null, "klizaci postoje samo u načinu istrazi");

    if (s.nacin === "pogodi") {
      if (
        !need(
          s.cestica?.ulaz === "vodoravno",
          'pogodi treba cesticu s ulaz "vodoravno" (i v0, L, d)',
        )
      )
        return list;
      if (s.pogodi != null)
        need(
          s.pogodi?.velicina == null || s.pogodi.velicina === "y",
          'pogodi.velicina može biti samo "y"',
        );
      if (!list.length) {
        const p = putanja(s);
        if (p.izlaz) {
          need(
            p.y >= 0.08 * (s.d / 2),
            `otklon na izlazu (${fmtMm(p.y)}) je premalen prema razmaku ploča ${fmtMm(s.d)}: smanji d da se oznaka može postaviti`,
          );
          validateKrivo(s.krivo, p.y, tolPogodi(s, p), need);
        } else {
          need(
            p.x >= 0.08 * s.L,
            "čestica udari u ploču odmah na ulazu; povećaj d ili v₀",
          );
          need(
            s.krivo == null,
            "krivo (mm) ide samo kad čestica izlazi iz ploča",
          );
        }
        if (s.tolerancija != null)
          need(
            isNum(s.tolerancija) && s.tolerancija > 0,
            "tolerancija mora biti pozitivan broj (mm za otklon, cm kad udari u ploču)",
          );
      }
      need(s.akcija == null && s.pitaj == null, "pogodi nema akcija ni pitaj");
      return list;
    }

    // predvidi
    need(!imaCesticu(s), "predvidi je za kondenzator, bez čestice");
    need(s.U != null, "predvidi treba napon U (V)");
    need(
      s.C != null || (s.A != null && s.d != null),
      "predvidi treba C (pF) ili A (cm²) i d (mm)",
    );
    need(
      s.izvor != null,
      'predvidi treba izvor: "spojen" (napon stalan) ili "odspojen" (naboj stalan)',
    );
    const a = s.akcija;
    if (
      need(
        a && AKCIJE.includes(a.vrsta),
        `predvidi treba akcija: {vrsta: ${AKCIJE.join(" | ")}}`,
      )
    ) {
      if (a.vrsta === "dielektrik")
        need(
          isNum(a.er) && a.er > 1 && a.er <= 100 && a.er !== (s.er ?? 1),
          "akcija dielektrik treba er (> 1 i različit od početnog)",
        );
      else
        need(
          isNum(a.faktor) &&
            a.faktor > 0 &&
            a.faktor !== 1 &&
            a.faktor <= 10 &&
            a.faktor >= 0.1,
          "akcija treba faktor (0,1–10, različit od 1)",
        );
      if (a.naziv != null)
        need(isText(a.naziv), "akcija.naziv mora biti tekst");
    }
    need(
      Array.isArray(s.pitaj) &&
        s.pitaj.length >= 1 &&
        s.pitaj.every((v) => VELICINE_KOND.includes(v)) &&
        new Set(s.pitaj).size === s.pitaj.length,
      `pitaj: 1–5 veličina iz ${VELICINE_KOND.join(", ")} bez ponavljanja`,
    );
    need(s.pogodi == null && s.krivo == null, "predvidi nema pogodi ni krivo");
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "pogodi") return checkPogodi(s, odgovor);
    if (s.nacin === "predvidi") return checkPredvidi(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  tocanOdgovor(s) {
    if (s.nacin === "pogodi") {
      const p = putanja(s);
      const ploca = p.smjer > 0 ? "gornju (+)" : "donju (−)";
      return p.izlaz
        ? `izađe ${fmtMm(p.y)} ${p.smjer > 0 ? "iznad" : "ispod"} pravca ulaska (y = ${tri(p.y)}·10⁻³ m)`
        : `udari u ${ploca} ploču ${fmtCm(p.x)} od ulaza`;
    }
    if (s.nacin === "predvidi") {
      const t = smjeroviPromjene(s);
      return s.pitaj.map((v) => `${v} ${SMJER_OPIS[t[v]]}`).join(", ");
    }
    return "";
  },
  brojcaniOdgovor(s) {
    if (s.nacin !== "pogodi") return null;
    const p = putanja(s);
    return p.izlaz ? p.y : p.x;
  },
};

// ── pogodi ──────────────────────────────────────────────────────────────────────────────────────────
// odgovor: {gdje: "izlaz" | "gore" | "dolje", x (cm od ulaza), y (mm od pravca ulaska, + prema gornjoj ploči)}
const tolPogodi = (s, p) =>
  Math.max(
    isNum(s.tolerancija) ? s.tolerancija : 0,
    0.08 * (p.izlaz ? p.y : p.x),
  );

function checkPogodi(s, odgovor) {
  const o = odgovor;
  if (
    !o ||
    !["izlaz", "gore", "dolje"].includes(o.gdje) ||
    !isNum(o.x) ||
    !isNum(o.y)
  )
    return {
      tocno: false,
      poruka:
        "Povuci oznaku na mjesto gdje čestica izlazi iz ploča ili udari u ploču.",
      prazno: true,
    };
  const p = putanja(s);
  const tol = tolPogodi(s, p);
  const elektron = s.cestica.vrsta === "elektron";
  const naziv = elektron ? "Elektron" : "Proton";
  // kriva strana: elektron ide prema +, proton prema −
  const strana =
    o.gdje === "izlaz"
      ? Math.abs(o.y) <= tol
        ? 0
        : Math.sign(o.y)
      : o.gdje === "gore"
        ? 1
        : -1;
  if (strana === -p.smjer)
    return {
      tocno: false,
      poruka: elektron
        ? "Elektron je negativan, pa ga privlači pozitivna (gornja) ploča: skreće prema njoj."
        : "Proton je pozitivan, pa ga privlači negativna (donja) ploča: skreće prema njoj.",
    };
  if (p.izlaz) {
    if (o.gdje !== "izlaz")
      return {
        tocno: false,
        poruka: `${naziv} ne stigne do ploče: izađe kroz desni rub prije nego što skrene za pola razmaka (${fmtMm(s.d / 2)}). Ako ti je račun dao više, provjeri jesi li L pretvorio u metre i kvadrirao vrijeme.`,
      };
    const y = Math.abs(o.y);
    if (Math.abs(y - p.y) <= tol) return { tocno: true };
    const hit = (s.krivo ?? []).find(
      (k) =>
        Math.abs(y - k.vrijednost) <=
        Math.max(tol, 0.08 * Math.abs(k.vrijednost)),
    );
    if (hit) return { tocno: false, poruka: hit.poruka };
    if (Math.abs(y - 2 * p.y) <= Math.max(tol, 0.08 * 2 * p.y))
      return {
        tocno: false,
        poruka:
          "Oznaka je dvaput dalje nego treba. Jesi li zaboravio ½ u $y = \\frac{1}{2} a t^2$?",
      };
    const drugaMasa = elektron ? (p.y * M_E) / M_P : (p.y * M_P) / M_E;
    if (
      drugaMasa < s.d / 2 &&
      Math.abs(y - drugaMasa) <= Math.max(tol, 0.08 * drugaMasa)
    )
      return {
        tocno: false,
        poruka: elektron
          ? "Tako bi skrenuo proton. Za elektron uzmi njegovu masu $m_e = 9{,}11 \\cdot 10^{-31}$ kg."
          : "Tako bi skrenuo elektron. Za proton uzmi njegovu masu $m_p = 1{,}67 \\cdot 10^{-27}$ kg.",
      };
    return {
      tocno: false,
      poruka:
        s.savjet ||
        `${naziv} izađe ${y > p.y ? "bliže pravcu ulaska" : "dalje od pravca ulaska"}. Izračunaj $a = \\frac{qE}{m}$, vrijeme prolaska $t = \\frac{L}{v_0}$ i otklon $y = \\frac{1}{2} a t^2$.`,
    };
  }
  if (o.gdje === "izlaz")
    return {
      tocno: false,
      poruka: `Otklon na kraju ploča bio bi veći od pola razmaka (${fmtMm(s.d / 2)}), pa ${naziv.toLowerCase()} udari u ploču prije kraja. Iz $\\frac{d}{2} = \\frac{1}{2} a t^2$ nađi vrijeme, pa $x = v_0 t$.`,
    };
  if (Math.abs(o.x - p.x) <= tol) return { tocno: true };
  return {
    tocno: false,
    poruka:
      s.savjet ||
      `${naziv} udari ${o.x > p.x ? "bliže ulazu" : "dalje od ulaza"}. Iz $\\frac{d}{2} = \\frac{1}{2} a t^2$ nađi vrijeme do ploče, pa $x = v_0 t$.`,
  };
}

// ── predvidi ────────────────────────────────────────────────────────────────────────────────────────
const SMJEROVI = ["gore", "dolje", "isto"];

function checkPredvidi(s, odgovor) {
  if (!odgovor || s.pitaj.some((v) => !SMJEROVI.includes(odgovor[v])))
    return {
      tocno: false,
      poruka: "Za svaku veličinu odaberi: raste, pada ili ostaje ista.",
      prazno: true,
    };
  const t = smjeroviPromjene(s);
  const kriva = s.pitaj.find((v) => odgovor[v] !== t[v]);
  if (!kriva) return { tocno: true };
  return { tocno: false, poruka: objasni(s, kriva, t), velicina: kriva };
}

// Zašto se veličina mijenja baš tako: iz onoga što je zaključano (Q ili U) i formule koja je veže.
function objasni(s, v, t) {
  const spojen = s.izvor === "spojen";
  const { fC, fd } = nakonAkcije(s);
  const a = s.akcija;
  const Cgore = fC > 1;
  const zasto =
    a.vrsta === "dielektrik"
      ? `dielektrik povećava $\\varepsilon_r$`
      : a.vrsta === "razmakni"
        ? `${fd > 1 ? "veći" : "manji"} razmak $d$`
        : `${a.faktor > 1 ? "veća" : "manja"} površina $S$`;
  const C = Cgore ? "raste" : "pada";
  switch (v) {
    case "C":
      return `Kapacitet ovisi samo o građi kondenzatora: $C = \\varepsilon_0 \\varepsilon_r \\frac{S}{d}$, a ${zasto}, pa C ${C}. Izvor tu ne igra ulogu.`;
    case "Q":
      return spojen
        ? `Izvor drži napon stalnim, pa kad C ${C}, izvor ${Cgore ? "dovede još" : "odvede dio"} naboja: $Q = CU$ ${t.Q === "gore" ? "raste" : "pada"}.`
        : "Odspojen kondenzator nema kamo poslati naboj ni odakle ga dobiti: Q ostaje isti.";
    case "U":
      return spojen
        ? "Kondenzator je spojen na izvor, pa je napon na njemu uvijek napon izvora: U ostaje isti."
        : `Naboj je zaključan, a C ${C}, pa $U = \\frac{Q}{C}$ ${t.U === "gore" ? "raste" : "pada"}.`;
    case "E":
      if (t.E === "isto")
        return spojen
          ? "Napon je stalan i razmak se ne mijenja, pa $E = \\frac{U}{d}$ ostaje isti."
          : "Napon se mijenja jednako kao razmak, pa $E = \\frac{U}{d}$ ostaje isti (gustoća naboja na pločama je ista).";
      return spojen
        ? `Napon je stalan, a razmak ${fd > 1 ? "veći" : "manji"}, pa $E = \\frac{U}{d}$ ${t.E === "gore" ? "raste" : "pada"}.`
        : `Polje je $E = \\frac{U}{d}$: napon ${t.U === "gore" ? "raste" : "pada"}${fd !== 1 ? ", ali pazi i na razmak" : ", a razmak je isti"}, pa E ${t.E === "gore" ? "raste" : "pada"}.`;
    case "W":
      return spojen
        ? `Napon je stalan, a C ${C}, pa $W = \\frac{CU^2}{2}$ ${t.W === "gore" ? "raste" : "pada"}.`
        : `Naboj je stalan, a C ${C}, pa $W = \\frac{Q^2}{2C}$ ${t.W === "gore" ? "raste" : "pada"}.`;
  }
  return "Nije točno.";
}
