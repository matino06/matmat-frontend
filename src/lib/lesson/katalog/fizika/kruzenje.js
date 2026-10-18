// kruzenje: jednoliko kružno gibanje u tri scene (kotač, auto u zavoju, satelit u orbiti). Uživo T, f, ω, v, a_cp;
// auto preko granice trenja i satelit bez gravitacije odlaze po tangenti. Načini: istrazi, postavi (cilj na veličini
// scene) i smjer (učenik okrene strelicu brzine, akceleracije, sile ili smjera izlijetanja). Sve računa kod.
import { isNum } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
} from "../zajednicko.js";
import {
  G_ZEMLJA,
  GRAV_KONST,
  KUTOVI_16,
  normKut,
  razlikaKuta,
  iznos,
  klizaciOd,
  pocetneVrijednosti,
  validateKlizaci,
  validatePolje,
  validateKoristeniKlizaci,
  validateCilj,
  checkCilj,
  analizaCilja,
  formatNumber,
  withUnit,
  NACIN_ISTRAZI,
  KLIZACI_OPIS,
  CILJ_OPIS,
} from "./_sile.js";

export const SCENE = ["kotac", "zavoj", "orbita"];
const NACINI = ["istrazi", "postavi", "smjer"];
export const PITANJA = ["brzina", "akceleracija", "sila", "izlijetanje"];
export const VRTNJA = ["suprotno_kazaljci", "kao_kazaljka"];
const TOCKE = ["A", "B"];

export const tockeKotaca = (s) => (Array.isArray(s.tocke) ? s.tocke : [1, 0.5]);
// +1: suprotno od kazaljke na satu (pozitivni smjer), −1: kao kazaljka
export const predznakVrtnje = (s) =>
  s.smjer_vrtnje === "kao_kazaljka" ? -1 : 1;

// ── fizika ───────────────────────────────────────────────────────────────────────────────────────────
export function fizikaKruzenja(s, p = pocetneVrijednosti(s)) {
  const g = isNum(s.g) ? s.g : G_ZEMLJA;
  if (s.scena === "kotac") {
    const r = iznos(s, s.r, p);
    const f = iznos(s, s.f, p);
    const omega = 2 * Math.PI * f;
    const vel = { r, f, n: f * 60, T: f > 0 ? 1 / f : Infinity, omega };
    tockeKotaca(s).forEach((k, i) => {
      vel[`v_${TOCKE[i]}`] = omega * r * k;
      vel[`a_${TOCKE[i]}`] = omega * omega * r * k;
    });
    return { vel, omega, r };
  }
  if (s.scena === "zavoj") {
    const r = iznos(s, s.r, p);
    const m = iznos(s, s.masa, p);
    const v = iznos(s, s.v, p);
    const Fmax =
      s.F_max != null ? iznos(s, s.F_max, p) : iznos(s, s.mi, p) * m * g;
    const Fcp = (m * v * v) / r;
    const vel = {
      r,
      m,
      v,
      a_cp: (v * v) / r,
      F_cp: Fcp,
      F_max: Fmax,
      v_max: Math.sqrt((Fmax * r) / m),
      omega: v / r,
      T: (2 * Math.PI * r) / v,
    };
    return { vel, omega: v / r, r, prolazi: Fcp <= Fmax * (1 + 1e-9) };
  }
  if (s.scena === "orbita") {
    const M = iznos(s, s.M, p);
    const R = iznos(s, s.R, p);
    const h = iznos(s, s.h, p);
    const r = R + h;
    const v = Math.sqrt((GRAV_KONST * M) / r);
    const vel = {
      h,
      r,
      v,
      T: (2 * Math.PI * r) / v,
      a: (GRAV_KONST * M) / (r * r),
      g0: (GRAV_KONST * M) / (R * R),
      omega: v / r,
    };
    if (s.masa != null) vel.F = iznos(s, s.masa, p) * vel.a;
    return { vel, omega: v / r, r, R };
  }
  return { vel: {} };
}

export function velicineKruzenja(s) {
  if (s.scena === "kotac") {
    const out = {
      r: { naziv: "polumjer kotača", oznaka: "r", jedinica: "m" },
      f: { naziv: "frekvencija", oznaka: "f", jedinica: "Hz" },
      n: { naziv: "broj okretaja u minuti", oznaka: "n", jedinica: "okr/min" },
      T: { naziv: "period", oznaka: "T", jedinica: "s" },
      omega: { naziv: "kutna brzina", oznaka: "ω", jedinica: "rad/s" },
    };
    tockeKotaca(s).forEach((k, i) => {
      const t = TOCKE[i];
      const gdje = k === 1 ? "na rubu" : `na ${formatNumber(k)} polumjera`;
      out[`v_${t}`] = {
        naziv: `obodna brzina točke ${t} (${gdje})`,
        oznaka: `v_${t}`,
        jedinica: "m/s",
      };
      out[`a_${t}`] = {
        naziv: `centripetalna akceleracija točke ${t}`,
        oznaka: `a_${t}`,
        jedinica: "m/s²",
      };
    });
    return out;
  }
  if (s.scena === "zavoj")
    return {
      r: { naziv: "polumjer zavoja", oznaka: "r", jedinica: "m" },
      m: { naziv: "masa auta", oznaka: "m", jedinica: "kg" },
      v: { naziv: "brzina", oznaka: "v", jedinica: "m/s" },
      a_cp: {
        naziv: "centripetalna akceleracija",
        oznaka: "a_{cp}",
        jedinica: "m/s²",
      },
      F_cp: {
        naziv: "potrebna centripetalna sila",
        oznaka: "F_{cp}",
        jedinica: "N",
      },
      F_max: { naziv: "najveća sila trenja", oznaka: "F_{max}", jedinica: "N" },
      v_max: {
        naziv: "najveća brzina u zavoju",
        oznaka: "v_{max}",
        jedinica: "m/s",
      },
      omega: { naziv: "kutna brzina", oznaka: "ω", jedinica: "rad/s" },
      T: { naziv: "vrijeme jednog kruga", oznaka: "T", jedinica: "s" },
    };
  if (s.scena === "orbita") {
    const out = {
      h: { naziv: "visina iznad površine", oznaka: "h", jedinica: "m" },
      r: { naziv: "polumjer orbite", oznaka: "r", jedinica: "m" },
      v: { naziv: "brzina satelita", oznaka: "v", jedinica: "m/s" },
      T: { naziv: "period ophoda", oznaka: "T", jedinica: "s" },
      a: {
        naziv: "akceleracija (gravitacijsko ubrzanje na orbiti)",
        oznaka: "a",
        jedinica: "m/s²",
      },
      g0: {
        naziv: "gravitacijsko ubrzanje na površini",
        oznaka: "g_0",
        jedinica: "m/s²",
      },
      omega: { naziv: "kutna brzina", oznaka: "ω", jedinica: "rad/s" },
    };
    if (s.masa != null)
      out.F = {
        naziv: "gravitacijska sila na satelit",
        oznaka: "F_g",
        jedinica: "N",
      };
    return out;
  }
  return {};
}

const PRIKAZI = {
  kotac: ["T", "omega", "v_A", "v_B"],
  zavoj: ["v", "F_cp", "F_max"],
  orbita: ["h", "v", "T"],
};
export function prikaziKruzenja(s) {
  if (Array.isArray(s.prikazi)) return s.prikazi;
  return PRIKAZI[s.scena].filter((k) => k in velicineKruzenja(s));
}

// ── smjer ───────────────────────────────────────────────────────────────────────────────────────────
// tocka: kut položaja tijela na kružnici (° od +x, suprotno kazaljci). Brzina i izlijetanje: tangenta u smjeru
// vrtnje; akceleracija i sila: prema središtu.
export const tangenta = (s) => normKut(s.tocka + 90 * predznakVrtnje(s));
export const tocanSmjer = (s) =>
  s.pitaj === "brzina" || s.pitaj === "izlijetanje"
    ? tangenta(s)
    : normKut(s.tocka + 180);
export const SMJEROVI = KUTOVI_16;
const STO = {
  brzina: "brzina",
  akceleracija: "akceleracija",
  sila: "sila",
  izlijetanje: "smjer izlijetanja",
};
const TIJELO = { kotac: "točka", zavoj: "auto", orbita: "satelit" };

function checkSmjer(s, kut) {
  if (!isNum(kut))
    return {
      tocno: false,
      poruka: "Okreni strelicu: povuci njezin vrh.",
      prazno: true,
    };
  const tocan = tocanSmjer(s);
  if (razlikaKuta(kut, tocan) < 1) return { tocno: true };
  const van = s.tocka;
  const unutra = normKut(s.tocka + 180);
  const naprijed = tangenta(s);
  const natrag = normKut(naprijed + 180);
  const isti = (a) => razlikaKuta(kut, a) < 1;
  const tko = TIJELO[s.scena];
  const vrti =
    predznakVrtnje(s) > 0
      ? "suprotno od kazaljke na satu"
      : "kao kazaljka na satu";
  if (isti(van)) {
    if (s.pitaj === "izlijetanje")
      return {
        tocno: false,
        poruka: `To je česta zabluda: ${tko} ne odleti radijalno prema van. Kad nestane sile prema središtu, ništa ga više ne skreće, pa nastavi **ravno**, u smjeru brzine koju je imao: po tangenti.`,
      };
    if (s.pitaj === "brzina")
      return {
        tocno: false,
        poruka:
          "Brzina ne gleda prema van. Pokazuje kamo se tijelo upravo giba, a to je tangenta na kružnicu.",
      };
    return {
      tocno: false,
      poruka:
        "To je „centrifugalna“ zabluda: prema van ne djeluje nikakva sila. Da bi skretalo u krug, na tijelo mora djelovati sila **prema središtu**; bez nje bi otišlo ravno, po tangenti.",
    };
  }
  if (isti(natrag))
    return {
      tocno: false,
      poruka: `Pravac je dobar (tangenta), ali smjer je obrnut: tijelo se vrti ${vrti}, pa ${STO[s.pitaj]} gleda naprijed, u smjeru vrtnje.`,
    };
  if (isti(unutra))
    return {
      tocno: false,
      poruka:
        s.pitaj === "izlijetanje"
          ? "Prema središtu ga je vukla sila dok je kružio. Kad te sile nema, tijelo nastavi ravno, u smjeru brzine: po tangenti."
          : "Prema središtu pokazuju akceleracija i sila. Brzina je uvijek tangenta na kružnicu, u smjeru vrtnje.",
    };
  if (isti(naprijed))
    return {
      tocno: false,
      poruka: `To je smjer brzine. Iznos brzine se ne mijenja, mijenja se njezin smjer, pa ${s.pitaj === "sila" ? "sila" : "akceleracija"} pokazuje **prema središtu** kružnice.`,
    };
  return {
    tocno: false,
    poruka:
      s.savjet ||
      (s.pitaj === "brzina" || s.pitaj === "izlijetanje"
        ? "Nije taj smjer. Brzina je tangenta na kružnicu u točki gdje je tijelo, u smjeru vrtnje."
        : "Nije taj smjer. Kod jednolikog kruženja akceleracija i sila pokazuju prema središtu kružnice."),
  };
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Kružno gibanje (fizika, matura). tekst, scena, nacin, g? (zadano 9,81), smjer_vrtnje? ("suprotno_kazaljci" zadano | "kao_kazaljka").
Scene (brojčano polje smije biti id klizača):
- "kotac": r (m), f (Hz; okretaje u minuti zadaj klizačem s jedinica "okr/min" i faktor 1/60), tocke? (udjeli polumjera za točke A i B, zadano [1, 0.5]). Veličine r, f, n, T, omega, v_A, a_A, v_B, a_B. Gumb „Pusti točku“: točka odleti po tangenti.
- "zavoj": auto odozgo na kružnoj cesti: r (m), masa (kg), v (m/s), F_max (N, najveća sila trenja) ili mi. Veličine r, m, v, a_cp, F_cp, F_max, v_max, omega, T. Kad je F_cp > F_max, auto klizne po tangenti.
- "orbita": satelit oko planeta: M (kg), R (m), h (visina u m; klizač u km uz faktor 1000), masa? (satelita, za silu). Veličine h, r, v, T, a, g0, omega (i F uz masu). Gumb „Isključi gravitaciju“: satelit ode po tangenti.
Načini:
- ${NACIN_ISTRAZI}. ${KLIZACI_OPIS} (najviše 3); prikazi?: veličine koje se vide uživo (najviše 4).
- "postavi" (Tvoj red): točno jedan klizač; ${CILJ_OPIS}. Npr. najveća brzina u zavoju: {velicina: "F_cp", vrijednost: "F_max"}. krivo?: [{vrijednost (klizača), poruka}].
- "smjer" (Tvoj red): gibanje stane, tijelo je na tocka (kut položaja u °, višekratnik 22,5; 0 = desno od središta, 90 = iznad); pitaj: "brzina" | "akceleracija" | "sila" | "izlijetanje"; učenik okrene strelicu (16 smjerova). Točan smjer računa aplikacija; poruke za „prema van“ (centrifugalna zabluda), obrnutu tangentu i zamjenu brzine s akceleracijom dodaju se same. Bez klizača.`;

const PRIMJER = {
  tip: "kruzenje",
  nacin: "postavi",
  scena: "zavoj",
  r: 50,
  masa: 1200,
  F_max: 9600,
  v: "v",
  tekst:
    "Najveća sila trenja koju gume mogu dati je 9600 N. Postavi **najveću** brzinu kojom auto još prolazi zavoj.",
  klizaci: [
    {
      id: "v",
      oznaka: "brzina auta",
      min: 5,
      max: 30,
      korak: 0.5,
      pocetak: 15,
      jedinica: "m/s",
    },
  ],
  prikazi: ["v", "F_cp", "F_max"],
  cilj: { velicina: "F_cp", vrijednost: "F_max" },
};

const PRIMJERI = [
  {
    tip: "kruzenje",
    nacin: "istrazi",
    scena: "kotac",
    r: 0.4,
    f: "n",
    tekst:
      "Kotač polumjera 0,4 m. **Mijenjaj broj okretaja** i usporedi točku na rubu (A) i točku na pola polumjera (B).",
    klizaci: [
      {
        id: "n",
        oznaka: "okretaja u minuti",
        min: 30,
        max: 600,
        korak: 30,
        pocetak: 300,
        jedinica: "okr/min",
        faktor: 1 / 60,
      },
    ],
    prikazi: ["T", "omega", "v_A", "v_B"],
  },
  {
    tip: "kruzenje",
    nacin: "smjer",
    scena: "kotac",
    r: 0.4,
    f: 5,
    tocka: 45,
    pitaj: "brzina",
    tekst:
      "Kotač se vrti suprotno od kazaljke na satu. Okreni strelicu tako da pokazuje **brzinu** označene točke.",
  },
  {
    tip: "kruzenje",
    nacin: "istrazi",
    scena: "zavoj",
    r: 50,
    masa: 1200,
    F_max: 9600,
    v: "v",
    tekst:
      "Auto u zavoju polumjera 50 m. **Povećavaj brzinu** i usporedi potrebnu centripetalnu silu s najvećim trenjem.",
    klizaci: [
      {
        id: "v",
        oznaka: "brzina auta",
        min: 5,
        max: 30,
        korak: 0.5,
        pocetak: 15,
        jedinica: "m/s",
      },
    ],
  },
  {
    tip: "kruzenje",
    nacin: "smjer",
    scena: "zavoj",
    r: 50,
    masa: 1200,
    F_max: 9600,
    v: 25,
    tocka: 90,
    pitaj: "izlijetanje",
    tekst:
      "Auto ulazi u zavoj prebrzo i trenje ga više ne može zadržati. Okreni strelicu: **kamo** će auto kliznuti?",
  },
  {
    tip: "kruzenje",
    nacin: "istrazi",
    scena: "orbita",
    M: 6e24,
    R: 6.37e6,
    h: "h",
    tekst:
      "Satelit kruži oko Zemlje. **Mijenjaj visinu** i gledaj brzinu i period. Probaj i isključiti gravitaciju.",
    klizaci: [
      {
        id: "h",
        oznaka: "visina orbite",
        min: 200,
        max: 2000,
        korak: 100,
        pocetak: 400,
        jedinica: "km",
        faktor: 1000,
      },
    ],
    prikazi: ["h", "v", "T"],
  },
  {
    tip: "kruzenje",
    nacin: "smjer",
    scena: "orbita",
    M: 6e24,
    R: 6.37e6,
    h: 400000,
    tocka: 135,
    pitaj: "sila",
    tekst:
      "Okreni strelicu tako da pokazuje smjer **sile** koja drži satelit u orbiti.",
  },
];

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const kruzenje = {
  tip: "kruzenje",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  fizika: fizikaKruzenja,
  velicine: velicineKruzenja,
  validate(s) {
    const { list, need } = problems();
    need(
      NACINI.includes(s.nacin),
      `kruzenje.nacin mora biti jedan od: ${NACINI.join(", ")}`,
    );
    need(isText(s.tekst), "kruzenje treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `kruzenje.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return list;
    if (s.g != null)
      need(
        isNum(s.g) && s.g >= 1 && s.g <= 30,
        "g mora biti broj od 1 do 30 (m/s²)",
      );
    if (s.smjer_vrtnje != null)
      need(
        VRTNJA.includes(s.smjer_vrtnje),
        `smjer_vrtnje mora biti ${VRTNJA.join(" ili ")}`,
      );

    if (s.nacin === "istrazi") validateKlizaci(s, need, { najvise: 3 });
    else if (s.nacin === "postavi")
      validateKlizaci(s, need, { najmanje: 1, najvise: 1 });
    else
      need(s.klizaci == null, "smjer nema klizače: sve vrijednosti su brojevi");

    const koristeni = [];
    const polje = (ime, o) => {
      if (typeof s[ime] === "string") koristeni.push(s[ime]);
      return validatePolje(s, need, ime, o);
    };
    const dozvoljena = {
      kotac: ["r", "f", "tocke"],
      zavoj: ["r", "masa", "v", "F_max", "mi"],
      orbita: ["M", "R", "h", "masa"],
    }[s.scena];
    for (const f of [
      "r",
      "f",
      "tocke",
      "masa",
      "v",
      "F_max",
      "mi",
      "M",
      "R",
      "h",
    ])
      need(
        !(f in s) || dozvoljena.includes(f),
        `polje „${f}“ ne postoji u sceni ${s.scena} (polja scene: ${dozvoljena.join(", ")})`,
      );
    if (s.scena === "kotac") {
      polje("r", { min: 0.001, max: 1000, opis: "polumjer u m" });
      polje("f", { min: 0.001, max: 1000, opis: "frekvencija u Hz" });
      if (s.tocke != null)
        need(
          Array.isArray(s.tocke) &&
            s.tocke.length >= 1 &&
            s.tocke.length <= 2 &&
            s.tocke.every((k) => isNum(k) && k > 0 && k <= 1) &&
            new Set(s.tocke).size === s.tocke.length,
          "tocke mora biti 1–2 različita udjela polumjera iz (0, 1], npr. [1, 0.5]",
        );
    }
    if (s.scena === "zavoj") {
      polje("r", { min: 1, max: 10000, opis: "polumjer zavoja u m" });
      polje("masa", { min: 1, max: 100000, opis: "masa auta u kg" });
      polje("v", { min: 0.1, max: 200, opis: "brzina u m/s" });
      need(
        (s.F_max != null) !== (s.mi != null),
        "zavoj treba točno jedno od: F_max (najveća sila trenja u N) ili mi (faktor trenja)",
      );
      if (s.F_max != null) polje("F_max", { min: 1, max: 1e7 });
      if (s.mi != null) polje("mi", { min: 0.01, max: 2 });
    }
    if (s.scena === "orbita") {
      polje("M", { min: 1e15, max: 1e32, opis: "masa planeta u kg" });
      polje("R", { min: 1e3, max: 1e9, opis: "polumjer planeta u m" });
      polje("h", { min: 0, max: 1e9, opis: "visina orbite u m" });
      if (s.masa != null) polje("masa", { min: 0.001, max: 1e7 });
      if (isNum(s.R) && isNum(iznos(s, s.h)))
        need(
          klizaciOd(s).every(
            (k) => k.id !== s.h || k.max * (k.faktor ?? 1) <= 5 * s.R,
          ) &&
            (typeof s.h === "string" || s.h <= 5 * s.R),
          "orbita: visina do 5 polumjera planeta (inače se planet na crtežu ne vidi)",
        );
    }
    if (list.length) return list;
    validateKoristeniKlizaci(s, need, koristeni);

    const meta = velicineKruzenja(s);
    if (
      s.prikazi != null &&
      need(
        Array.isArray(s.prikazi) &&
          s.prikazi.length >= 1 &&
          s.prikazi.length <= 4,
        "prikazi mora biti popis od 1 do 4 veličine",
      )
    ) {
      for (const v of s.prikazi)
        need(
          v in meta,
          `prikazi: „${v}“ nije veličina scene (${Object.keys(meta).join(", ")})`,
        );
    }
    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      need(
        s.pitaj == null && s.tocka == null,
        "istrazi nema pitaj ni tocka (to je za smjer)",
      );
    }
    if (s.nacin === "postavi") {
      need(
        s.pitaj == null && s.tocka == null,
        "postavi nema pitaj ni tocka (to je za smjer)",
      );
      const k = klizaciOd(s)[0];
      validateCilj(s, need, k, (p) => fizikaKruzenja(s, p).vel, meta);
      if (k) validateKrivo(s.krivo, null, 0, need);
      if (k && Array.isArray(s.krivo) && s.cilj) {
        try {
          const a = analizaCilja(s, k, (p) => fizikaKruzenja(s, p).vel);
          s.krivo.forEach(
            (x, i) =>
              isNum(x?.vrijednost) &&
              need(
                !a.ok(x.vrijednost),
                `krivo[${i}].vrijednost ${formatNumber(x.vrijednost)} ostvaruje cilj, a to je točan odgovor`,
              ),
          );
        } catch {
          /* cilj je već prijavljen */
        }
      }
    }
    if (s.nacin === "smjer") {
      need(
        PITANJA.includes(s.pitaj),
        `smjer treba pitaj: ${PITANJA.join(", ")}`,
      );
      need(
        isNum(s.tocka) &&
          s.tocka >= 0 &&
          s.tocka < 360 &&
          Math.abs(s.tocka / 22.5 - Math.round(s.tocka / 22.5)) < 1e-9,
        "tocka mora biti kut položaja 0–337,5° u koracima od 22,5°",
      );
      need(s.cilj == null && s.prikazi == null, "smjer nema cilj ni prikazi");
      if (s.pitaj === "izlijetanje" && s.scena === "zavoj")
        need(
          !fizikaKruzenja(s).prolazi,
          "izlijetanje u zavoju: brzina mora biti veća od najveće (F_cp > F_max), inače auto ne izlijeće",
        );
    }
    return list;
  },
  check(s, odgovor) {
    if (s.nacin === "smjer") return checkSmjer(s, odgovor);
    if (s.nacin === "postavi")
      return checkCilj(
        s,
        odgovor,
        (p) => fizikaKruzenja(s, p).vel,
        velicineKruzenja(s),
      );
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "postavi") {
      const k = klizaciOd(s)[0];
      return `${k.oznaka} = ${withUnit(analizaCilja(s, k, (p) => fizikaKruzenja(s, p).vel).best, k.jedinica)}`;
    }
    if (s.nacin === "smjer")
      return s.pitaj === "brzina" || s.pitaj === "izlijetanje"
        ? "po tangenti na kružnicu, u smjeru vrtnje"
        : "prema središtu kružnice";
    return "";
  },
};
