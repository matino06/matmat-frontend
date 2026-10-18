// tlak_dubina: hidrostatički tlak p = p₀ + ρgh. Posude različitih oblika (i spojene posude), sonda s manometrom
// koja se vuče kroz tekućinu, uronjena kocka sa silama tlaka na gornju i donju plohu (uzgon). Sve brojeve koje
// crtež pokazuje i koje provjera smatra točnima računaju funkcije iz ove datoteke.
import { isNum, near, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
  KRIVO_OPIS,
} from "../zajednicko.js";
import {
  gOf,
  JEDINICE,
  jedinicaOk,
  uJedinici,
  krivoJedinica,
  krivoU,
  nacinOk,
  pozitivan,
  fmtJ,
} from "./_fluidi.js";

const TIP = "tlak_dubina";
const NACINI = ["istrazi", "izmjeri", "postavi", "usporedi"];
export const OBLICI = [
  "valjak",
  "siroka",
  "uska",
  "lijevak",
  "obrnuti_lijevak",
  "kosa",
  "boca",
];
const VELICINE = { p: "tlak", F_u: "sila", F_gore: "sila", F_dolje: "sila" };

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
// Posude s popunjenim zadanim vrijednostima: visina tekućine h (m), gustoća ρ (kg/m³), naziv tekućine.
export function posude(s) {
  return (s.posude ?? []).map((p) => {
    const t = p?.tekucina ?? s.tekucina ?? {};
    return {
      oblik: p?.oblik,
      h: isNum(p?.h) ? p.h : s.h,
      rho: t.gustoca,
      tekucina: t.naziv,
    };
  });
}

export const p0Of = (s) => (isNum(s.p0) ? s.p0 : 0);
// tlak na dubini d (m) ispod površine u posudi i
export const tlak = (s, i, d) => p0Of(s) + posude(s)[i].rho * gOf(s) * d;
export const tlakDno = (s, i) => tlak(s, i, posude(s)[i].h);

// Kocka uronjena u posudu 0: stranica a (m), volumen V (m³), dubina gornje plohe (m).
export function tijelo(s) {
  const t = s.tijelo;
  if (!t) return null;
  const V = isNum(t.volumen) ? t.volumen / 1000 : t.stranica ** 3;
  const a = isNum(t.stranica) ? t.stranica : Math.cbrt(V);
  return { a, V, S: a * a, d: isNum(t.dubina_vrha) ? t.dubina_vrha : 0 };
}

// Sile tlaka na kocku s gornjom plohom na dubini d (samo hidrostatički dio: p₀ djeluje jednako odozgo i odozdo).
export function sileTijela(s, d) {
  const k = tijelo(s);
  const rho = posude(s)[0].rho;
  const g = gOf(s);
  const p1 = rho * g * d;
  const p2 = rho * g * (d + k.a);
  return {
    p1,
    p2,
    F1: p1 * k.S,
    F2: p2 * k.S,
    Fu: (p2 - p1) * k.S,
    Fu_V: rho * g * k.V,
  };
}

const velicina = (s) => s.pitaj?.velicina ?? "p";
const jedinica = (s) =>
  s.jedinica ?? (VELICINE[velicina(s)] === "tlak" ? "Pa" : "N");
const posudaPitanja = (s) =>
  Number.isInteger(s.pitaj?.posuda) ? s.pitaj.posuda : 0;

// izmjeri: traženi iznos u SI jedinici
function izmjeriSI(s) {
  const v = velicina(s);
  if (v === "p") return tlak(s, posudaPitanja(s), s.pitaj.dubina);
  const f = sileTijela(s, tijelo(s).d);
  return v === "F_u" ? f.Fu_V : v === "F_gore" ? f.F1 : f.F2;
}

// postavi: dubina (m) na kojoj je tlak jednak cilju
export const dubinaCilja = (s) =>
  (s.cilj - p0Of(s)) / (posude(s)[posudaPitanja(s)].rho * gOf(s));

// Korak sonde pri povlačenju: podjeljak na kojem se dubina još dobro čita (najviše ~60 koraka po posudi).
export function korakSonde(s) {
  if (isNum(s.korak)) return s.korak;
  const H = Math.max(...posude(s).map((p) => p.h));
  return [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5].find((k) => H / k <= 60) ?? 1;
}

// usporedi: indeks posude s najvećim tlakom na dnu ili "jednako"
export function najveciTlak(s) {
  const p = posude(s).map((_, i) => tlakDno(s, i));
  const max = Math.max(...p);
  if (p.every((x) => near(x, max, max * 1e-9))) return "jednako";
  return p.indexOf(max);
}

const tolOf = (s, answer) =>
  isNum(s.tolerancija) ? s.tolerancija : Math.abs(answer) * 0.005;

// ── provjera speca ──────────────────────────────────────────────────────────────────────────────────
function validate(s) {
  const { list, need } = problems();
  nacinOk(s, need, NACINI, TIP);
  need(isText(s.tekst), `${TIP} treba „tekst“`);
  need(
    pozitivan(s.h) && s.h <= 100,
    `${TIP}.h (visina tekućine u m) mora biti pozitivan broj do 100`,
  );
  const tekOk = (t, gdje) =>
    need(
      isText(t?.naziv) &&
        pozitivan(t?.gustoca) &&
        t.gustoca >= 500 &&
        t.gustoca <= 22000,
      `${gdje} treba {naziv, gustoca} uz gustoću u kg/m³ (500–22 000; voda je 1000)`,
    );
  if (s.tekucina != null || !(s.posude ?? []).every((p) => p?.tekucina))
    tekOk(s.tekucina, `${TIP}.tekucina`);
  if (s.g != null)
    need(
      isNum(s.g) && s.g >= 9.7 && s.g <= 10,
      "g mora biti između 9,7 i 10 m/s² (9,81 ili 10)",
    );
  if (s.p0 != null)
    need(
      isNum(s.p0) && s.p0 >= 0 && s.p0 <= 2e5,
      "p0 (tlak iznad tekućine, Pa) mora biti između 0 i 200 000 (atmosferski ≈ 101 325)",
    );
  if (s.korak != null)
    need(
      pozitivan(s.korak) && s.korak <= (s.h ?? 1) / 4,
      "korak (sonde, m) mora biti pozitivan i barem 4 puta manji od h",
    );
  if (
    !need(
      Array.isArray(s.posude) && s.posude.length >= 1 && s.posude.length <= 3,
      `${TIP} treba 1–3 posude`,
    )
  )
    return list;
  s.posude.forEach((p, i) => {
    need(
      OBLICI.includes(p?.oblik),
      `posude[${i}].oblik mora biti jedan od: ${OBLICI.join(", ")}`,
    );
    if (p?.h != null)
      need(
        pozitivan(p.h) && p.h <= 100,
        `posude[${i}].h mora biti pozitivan broj (m)`,
      );
    if (p?.tekucina != null) tekOk(p.tekucina, `posude[${i}].tekucina`);
  });
  if (list.length) return list;
  const ps = posude(s);
  const H = Math.max(...ps.map((p) => p.h));
  need(
    ps.every((p) => p.h >= H / 4),
    "visine tekućine u posudama smiju se razlikovati najviše 4 puta, inače se crtež ne vidi",
  );
  if (s.spojene != null) {
    need(typeof s.spojene === "boolean", "spojene mora biti true ili false");
    if (s.spojene) {
      need(ps.length >= 2, "spojene posude trebaju barem 2 posude");
      need(
        ps.every((p) => p.h === ps[0].h && p.rho === ps[0].rho),
        "u spojenim posudama s istom tekućinom razina je svugdje ista: izostavi posude[].h i posude[].tekucina",
      );
    }
  }
  if (s.tijelo != null) {
    const t = s.tijelo;
    need(
      ps.length === 1,
      "tijelo (uronjena kocka) može biti samo uz jednu posudu",
    );
    if (
      need(
        pozitivan(t.stranica) !== pozitivan(t.volumen),
        "tijelo treba točno jedno od: stranica (m) ili volumen (dm³)",
      )
    ) {
      const k = tijelo(s);
      need(
        k.a <= s.h / 2,
        `kocka stranice ${formatNumber(k.a)} m prevelika je za tekućinu dubine ${formatNumber(s.h)} m (najviše pola dubine)`,
      );
      if (t.dubina_vrha != null)
        need(
          isNum(t.dubina_vrha) &&
            t.dubina_vrha >= 0 &&
            t.dubina_vrha + k.a <= s.h + 1e-9,
          "tijelo.dubina_vrha mora biti ≥ 0, a kocka cijela u tekućini (dubina_vrha + stranica ≤ h)",
        );
    }
    if (t.gustoca != null)
      need(
        pozitivan(t.gustoca),
        "tijelo.gustoca (kg/m³) mora biti pozitivan broj",
      );
  }
  const pitajPosudu = () => {
    if (s.pitaj?.posuda != null)
      return need(
        Number.isInteger(s.pitaj.posuda) &&
          s.pitaj.posuda >= 0 &&
          s.pitaj.posuda < ps.length,
        "pitaj.posuda mora biti indeks posude (od 0)",
      );
    return true;
  };
  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    need(s.pitaj == null, "istrazi nema polje pitaj");
  }
  if (s.nacin === "izmjeri") {
    const v = velicina(s);
    if (
      !need(
        v in VELICINE,
        `pitaj.velicina mora biti jedna od: ${Object.keys(VELICINE).join(", ")}`,
      )
    )
      return list;
    need(
      jedinicaOk(VELICINE[v], jedinica(s)),
      `jedinica za ${v} mora biti jedna od: ${Object.keys(JEDINICE[VELICINE[v]]).join(", ")}`,
    );
    if (v === "p") {
      if (
        pitajPosudu() &&
        need(
          isNum(s.pitaj?.dubina),
          "izmjeri treba pitaj.dubina (m ispod površine)",
        )
      ) {
        const h = ps[posudaPitanja(s)].h;
        need(
          s.pitaj.dubina > 0 && s.pitaj.dubina <= h + 1e-9,
          `pitaj.dubina mora biti u tekućini (0 < dubina ≤ ${formatNumber(h)} m)`,
        );
      }
      need(s.tijelo == null, "izmjeri tlaka ne treba tijelo");
    } else {
      need(s.tijelo != null, `${v} se računa za uronjenu kocku: dodaj tijelo`);
      if (v !== "F_u")
        need(
          isNum(s.tijelo?.dubina_vrha),
          `${v} ovisi o dubini: zadaj tijelo.dubina_vrha`,
        );
    }
    if (!list.length)
      validateKrivo(
        s.krivo,
        izmjeriOdgovor(s),
        tolOf(s, izmjeriOdgovor(s)),
        need,
      );
  }
  if (s.nacin === "postavi") {
    need(s.tijelo == null, "postavi ne koristi tijelo");
    if (
      pitajPosudu() &&
      need(
        pozitivan(s.cilj),
        "postavi treba cilj: tlak u Pa na koji učenik spušta sondu",
      )
    ) {
      const d = dubinaCilja(s);
      const h = ps[posudaPitanja(s)].h;
      const k = korakSonde(s);
      need(
        d > 0 && d <= h + 1e-9,
        `tlak ${formatNumber(s.cilj)} Pa nije u tekućini: odgovara dubini ${formatNumber(d)} m, a tekućina je duboka ${formatNumber(h)} m`,
      );
      need(
        Math.abs(d / k - Math.round(d / k)) < 1e-6,
        `dubina cilja ${formatNumber(d)} m nije na koraku sonde (${formatNumber(k)} m); odaberi cilj kojemu je dubina višekratnik koraka ili zadaj korak`,
      );
    }
  }
  if (s.nacin === "usporedi") {
    need(ps.length >= 2, "usporedi treba barem 2 posude");
    need(s.tijelo == null, "usporedi ne koristi tijelo");
    const p = ps.map((_, i) => tlakDno(s, i));
    const max = Math.max(...p);
    const najvecih = p.filter((x) => near(x, max, max * 1e-9)).length;
    need(
      najvecih === 1 || najvecih === p.length,
      "najveći tlak na dnu mora biti u jednoj posudi ili jednak u svima",
    );
  }
  return list;
}

// ── provjera odgovora ───────────────────────────────────────────────────────────────────────────────
export const izmjeriOdgovor = (s) =>
  uJedinici(izmjeriSI(s), VELICINE[velicina(s)], jedinica(s));

function izmjeriKrivo(s) {
  const v = velicina(s);
  const g = gOf(s);
  const druga = g === 10 ? 9.81 : 10;
  const gTekst = (x) => formatNumber(x);
  const out = [];
  if (v === "p") {
    const i = posudaPitanja(s);
    const { rho, h } = posude(s)[i];
    const d = s.pitaj.dubina;
    const p0 = p0Of(s);
    out.push({
      si: p0 + rho * d,
      poruka: "Zaboravio si g: hidrostatički tlak je p = ρ·g·h.",
    });
    out.push({
      si: p0 + rho * g * d * 100,
      poruka: "Dubinu uvrsti u metrima, a ne u centimetrima.",
    });
    out.push({
      si: p0 + rho * druga * d,
      poruka: `U ovom zadatku uzmi g = ${gTekst(g)} m/s².`,
    });
    if (p0)
      out.push({
        si: rho * g * d,
        poruka:
          "To je samo tlak stupca tekućine. Traži se ukupni tlak: dodaj tlak iznad površine p₀.",
      });
    if (d < h)
      out.push({
        si: p0 + rho * g * (h - d),
        poruka:
          "Dubina se mjeri od površine tekućine prema dolje, a ne od dna.",
      });
    if (d < h)
      out.push({
        si: p0 + rho * g * h,
        poruka: "To je tlak na dnu. Traži se tlak na označenoj dubini.",
      });
    posude(s).forEach((p, j) => {
      if (j !== i && p.rho !== rho)
        out.push({
          si: p0 + p.rho * g * d,
          poruka: `To je gustoća tekućine u drugoj posudi (${p.tekucina}). Uzmi gustoću tekućine u kojoj je točka.`,
        });
    });
  } else {
    const k = tijelo(s);
    const rho = posude(s)[0].rho;
    const f = sileTijela(s, k.d);
    if (v === "F_u") {
      out.push({ si: rho * k.V, poruka: "Zaboravio si g: F_u = ρ·g·V." });
      out.push({
        si: rho * g * k.V * 1000,
        poruka: "Volumen pretvori u m³ (1 dm³ = 0,001 m³).",
      });
      out.push({
        si: rho * druga * k.V,
        poruka: `U ovom zadatku uzmi g = ${gTekst(g)} m/s².`,
      });
      if (pozitivan(s.tijelo.gustoca))
        out.push({
          si: s.tijelo.gustoca * g * k.V,
          poruka:
            "To je težina tijela. Uzgon ovisi o gustoći tekućine, a ne tijela.",
        });
      if (k.d > 0)
        out.push({
          si: f.F2,
          poruka:
            "To je samo sila na donju plohu. Uzgon je razlika: sila odozdo minus sila odozgo.",
        });
    } else {
      const [moja, tuda] = v === "F_gore" ? [f.p1, f.p2] : [f.p2, f.p1];
      out.push({
        si: tuda * k.S,
        poruka:
          v === "F_gore"
            ? "To je sila na donju plohu (dubina gornje plohe + stranica)."
            : "To je sila na gornju plohu. Donja ploha je dublje za cijelu stranicu kocke.",
      });
      out.push({
        si: moja,
        poruka: "To je tlak. Sila je tlak puta površina plohe: F = p·S.",
      });
      out.push({
        si: (moja / g) * k.S,
        poruka: "Zaboravio si g u tlaku p = ρ·g·h.",
      });
    }
  }
  return out;
}

function check(s, odgovor) {
  if (s.nacin === "usporedi") {
    if (odgovor !== "jednako" && !Number.isInteger(odgovor))
      return {
        tocno: false,
        poruka: "Dodirni posudu ili „Jednako u svima“.",
        prazno: true,
      };
    const tocno = najveciTlak(s);
    if (odgovor === tocno) return { tocno: true };
    if (tocno === "jednako")
      return {
        tocno: false,
        poruka:
          "Tlak na dnu ovisi samo o dubini i gustoći tekućine, a ne o obliku posude ni o količini tekućine. Ovdje je u svim posudama jednak.",
      };
    if (odgovor === "jednako")
      return {
        tocno: false,
        poruka:
          "Posude se razlikuju po dubini ili po tekućini. Usporedi ρ·h za svaku posudu.",
      };
    return {
      tocno: false,
      poruka:
        "Usporedi ρ·g·h za svaku posudu: oblik i količina tekućine ne utječu na tlak, samo dubina i gustoća.",
    };
  }
  if (s.nacin === "postavi") {
    if (!isNum(odgovor))
      return {
        tocno: false,
        poruka: "Povuci sondu na traženu dubinu.",
        prazno: true,
      };
    const d = dubinaCilja(s);
    const k = korakSonde(s);
    if (Math.abs(odgovor - d) <= k * 0.25) return { tocno: true };
    const h = posude(s)[posudaPitanja(s)].h;
    if (Math.abs(odgovor - (h - d)) <= k * 0.25)
      return {
        tocno: false,
        poruka:
          "Dubina se mjeri od površine tekućine prema dolje, a ne od dna.",
      };
    const g = gOf(s);
    if (
      Math.abs(
        odgovor - (s.cilj - p0Of(s)) / posude(s)[posudaPitanja(s)].rho,
      ) <=
      k * 0.25
    )
      return { tocno: false, poruka: "Zaboravio si g: h = p / (ρ·g)." };
    return {
      tocno: false,
      poruka: `Na dubini ${formatNumber(odgovor)} m tlak je ${odgovor < d ? "manji" : "veći"} od ${fmtJ(s.cilj, "Pa")}: sonda mora ${odgovor < d ? "dublje" : "pliće"}. Izračunaj h = ${p0Of(s) ? "(p − p₀)" : "p"} / (ρ·g), uz g = ${formatNumber(g)} m/s².`,
    };
  }
  const v = velicina(s);
  const jed = jedinica(s);
  const answer = izmjeriOdgovor(s);
  const krivo = [
    ...(s.krivo ?? []),
    ...krivoU(izmjeriKrivo(s), VELICINE[v], jed, answer),
    ...krivoJedinica(izmjeriSI(s), VELICINE[v], jed),
  ];
  const savjet =
    v === "p"
      ? "Hidrostatički tlak: p = ρ·g·h, dubina u metrima, mjerena od površine."
      : "Uzgon je razlika sila tlaka na donju i gornju plohu: F_u = ρ·g·V.";
  return checkNumber({
    input: odgovor,
    answer,
    tol: tolOf(s, answer),
    unit: jed,
    krivo,
    savjet: s.savjet || savjet,
  });
}

function tocanOdgovor(s) {
  if (s.nacin === "usporedi") {
    const t = najveciTlak(s);
    return t === "jednako"
      ? `jednak u svim posudama (${fmtJ(tlakDno(s, 0), "Pa")})`
      : `posuda ${t + 1} (${fmtJ(tlakDno(s, t), "Pa")})`;
  }
  if (s.nacin === "postavi") return `dubina ${formatNumber(dubinaCilja(s))} m`;
  if (s.nacin === "izmjeri")
    return `${formatNumber(izmjeriOdgovor(s))} ${jedinica(s)}`;
  return "";
}

const VODA = { naziv: "voda", gustoca: 1000 };

export const tlak_dubina = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Hidrostatički tlak p = p₀ + ρgh: 1–3 posude s tekućinom, sonda s manometrom, uronjena kocka (uzgon iz razlike tlakova).
Polja: tekst, h (visina tekućine, m), tekucina: {naziv, gustoca (kg/m³)}, posude: [{oblik, h?, tekucina?}] (1–3; oblik: ${OBLICI.join(" | ")};
h i tekucina posude zamjenjuju zajedničke), spojene? (true: posude spojene cijevi pri dnu, ista razina), g? (9,81; u zadacima često 10),
p0? (tlak iznad tekućine u Pa, npr. 101325; bez njega se prikazuje samo hidrostatički tlak), tijelo?: {stranica (m) ili volumen (dm³),
dubina_vrha? (m), gustoca? (kg/m³)} (kocka u jedinoj posudi; strelice sila tlaka na plohe, F_u = F₂ − F₁ = ρgV), korak? (korak sonde u m), nacin:
- "istrazi": učenik vuče sondu kroz tekućinu (ili kocku gore-dolje) i gleda tlak uživo; isprekidana crta pokazuje istu dubinu u svim posudama;
- "izmjeri": pitaj: {velicina: "p" (zadano) | "F_u" | "F_gore" | "F_dolje", dubina (m, za p), posuda? (indeks)}; točka je označena,
  učenik upiše iznos u jedinica ("Pa" | "hPa" | "kPa" | "MPa" za tlak, "N" | "kN" za silu). Točan odgovor i tipične greške (bez g,
  dubina u cm, dubina od dna, tlak na dnu, dm³ umjesto m³, krivi g, kriva jedinica) računa aplikacija; ${KRIVO_OPIS};
- "postavi": cilj (tlak u Pa): učenik spusti sondu na dubinu na kojoj je tlak jednak cilju (vidi dubinu, ne tlak); dubina cilja mora biti
  višekratnik koraka sonde;
- "usporedi": učenik dodirne posudu s najvećim tlakom na dnu ili „Jednako u svima“ (računa se iz ρ i h svake posude).`,
  primjer: {
    tip: TIP,
    nacin: "usporedi",
    tekst:
      "Tri posude različitog oblika napunjene su vodom do visine 1,2 m. U kojoj je posudi tlak na dnu najveći?",
    h: 1.2,
    g: 10,
    tekucina: VODA,
    posude: [
      { oblik: "valjak" },
      { oblik: "lijevak" },
      { oblik: "obrnuti_lijevak" },
    ],
  },
  primjeri: [
    {
      tip: TIP,
      nacin: "istrazi",
      tekst:
        "Povuci sondu kroz vodu u bilo kojoj posudi. Gledaj manometar: o čemu ovisi tlak?",
      h: 1.2,
      g: 10,
      tekucina: VODA,
      posude: [
        { oblik: "valjak" },
        { oblik: "lijevak" },
        { oblik: "obrnuti_lijevak" },
      ],
    },
    {
      tip: TIP,
      nacin: "izmjeri",
      tekst: "Koliki je tlak vode na dnu posude?",
      h: 1.2,
      g: 10,
      tekucina: VODA,
      posude: [{ oblik: "lijevak" }],
      pitaj: { dubina: 1.2 },
    },
    {
      tip: TIP,
      nacin: "izmjeri",
      tekst: "Koliki je tlak morske vode na dubini 1,5 m? Odgovor upiši u kPa.",
      h: 2.5,
      g: 10,
      tekucina: { naziv: "morska voda", gustoca: 1030 },
      posude: [{ oblik: "siroka" }],
      pitaj: { dubina: 1.5 },
      jedinica: "kPa",
    },
    {
      tip: TIP,
      nacin: "postavi",
      tekst: "Spusti sondu na dubinu na kojoj je tlak ulja 4500 Pa.",
      h: 0.8,
      g: 10,
      tekucina: { naziv: "ulje", gustoca: 900 },
      posude: [{ oblik: "siroka" }],
      cilj: 4500,
    },
    {
      tip: TIP,
      nacin: "istrazi",
      tekst:
        "Spojene posude: povuci sondu i usporedi tlak na istoj dubini u svakoj posudi.",
      h: 0.5,
      g: 10,
      tekucina: VODA,
      spojene: true,
      posude: [{ oblik: "uska" }, { oblik: "boca" }, { oblik: "kosa" }],
    },
    {
      tip: TIP,
      nacin: "usporedi",
      tekst:
        "Posude su napunjene do iste visine različitim tekućinama. Gdje je tlak na dnu najveći?",
      h: 0.8,
      g: 10,
      posude: [
        { oblik: "valjak", tekucina: { naziv: "ulje", gustoca: 900 } },
        { oblik: "valjak", tekucina: VODA },
        { oblik: "valjak", tekucina: { naziv: "glicerin", gustoca: 1260 } },
      ],
    },
    {
      tip: TIP,
      nacin: "istrazi",
      tekst:
        "Povuci kocku gore-dolje kroz vodu. Strelice su sile tlaka na plohe kocke. Mijenja li se njihova razlika?",
      h: 0.4,
      g: 10,
      tekucina: VODA,
      posude: [{ oblik: "siroka" }],
      tijelo: { volumen: 2, dubina_vrha: 0.1 },
    },
    {
      tip: TIP,
      nacin: "izmjeri",
      tekst:
        "Kocka volumena 2 dm³ potpuno je uronjena u vodu. Kolika je sila uzgona?",
      h: 0.4,
      g: 10,
      tekucina: VODA,
      posude: [{ oblik: "siroka" }],
      tijelo: { volumen: 2, dubina_vrha: 0.1 },
      pitaj: { velicina: "F_u" },
    },
  ],
  validate,
  check,
  tocanOdgovor,
  brojcaniOdgovor: (s) =>
    s.nacin === "izmjeri"
      ? izmjeriOdgovor(s)
      : s.nacin === "postavi"
        ? dubinaCilja(s)
        : null,
};
