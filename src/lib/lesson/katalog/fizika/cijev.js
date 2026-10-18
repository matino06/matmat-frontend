// cijev: protok kroz cijev koja se sužava. Jednadžba kontinuiteta (Q = S₁v₁ = S₂v₂) i Bernoullijeva jednadžba za
// vodoravnu cijev (p₁ + ρv₁²/2 = p₂ + ρv₂²/2). Crtež (čestice, manometri, kanta) i provjera koriste istu funkciju stanje().
import { isNum, formatNumber } from "../../core/number.js";
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
  JEDINICE,
  jedinicaOk,
  uJedinici,
  krivoJedinica,
  krivoU,
  nacinOk,
  pozitivan,
} from "./_fluidi.js";

const TIP = "cijev";
const NACINI = ["istrazi", "predvidi"];
const VELICINE = {
  v2: "brzina",
  p2: "tlak",
  Q: "protok",
  t_kanta: "vrijeme",
  p_d1: "tlak",
  p_d2: "tlak",
};
const ZADANA_JEDINICA = {
  brzina: "m/s",
  tlak: "Pa",
  protok: "L/s",
  vrijeme: "s",
};
const KLIZACI = ["d2", "S2", "v1"];

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
// površina presjeka u m²: zadana u cm² (S) ili iz promjera u cm (d)
export const povrsina = (p) =>
  isNum(p?.S) ? p.S * 1e-4 : (Math.PI * (p.d / 100) ** 2) / 4;
export const rhoOf = (s) => (isNum(s.rho) ? s.rho : 1000);

// Stanje cijevi; `promjena` su vrijednosti klizača (d2 ili S2 u cm/cm², v1 u m/s) iz načina istrazi.
export function stanje(s, promjena = {}) {
  const [a, b0] = s.presjeci;
  const b = isNum(promjena.d2)
    ? { ...b0, d: promjena.d2 }
    : isNum(promjena.S2)
      ? { ...b0, S: promjena.S2 }
      : b0;
  const S1 = povrsina(a);
  const S2 = povrsina(b);
  const v1 = isNum(promjena.v1) ? promjena.v1 : s.v1;
  const rho = rhoOf(s);
  const Q = S1 * v1;
  const v2 = Q / S2;
  const pd1 = (rho * v1 * v1) / 2;
  const pd2 = (rho * v2 * v2) / 2;
  const p1 = isNum(s.p1) ? s.p1 : null;
  const p2 = p1 == null ? null : p1 + pd1 - pd2;
  const t_kanta = pozitivan(s.kanta?.V) ? s.kanta.V / 1000 / Q : null;
  return {
    S1,
    S2,
    d1: a.d ?? null,
    d2: b.d ?? null,
    v1,
    v2,
    Q,
    rho,
    p1,
    p2,
    pd1,
    pd2,
    t_kanta,
  };
}

const velicina = (s) => s.pitaj?.velicina;
const jedinica = (s) => s.jedinica ?? ZADANA_JEDINICA[VELICINE[velicina(s)]];
const odgovorSI = (s) => {
  const st = stanje(s);
  const v = velicina(s);
  return v === "p_d1" ? st.pd1 : v === "p_d2" ? st.pd2 : st[v];
};
export const odgovor = (s) =>
  uJedinici(odgovorSI(s), VELICINE[velicina(s)], jedinica(s));
const tolOf = (s, answer) =>
  isNum(s.tolerancija) ? s.tolerancija : Math.abs(answer) * 0.005;

// ── provjera speca ──────────────────────────────────────────────────────────────────────────────────
function validate(s) {
  const { list, need } = problems();
  nacinOk(s, need, NACINI, TIP);
  need(isText(s.tekst), `${TIP} treba „tekst“`);
  if (
    need(
      Array.isArray(s.presjeci) && s.presjeci.length === 2,
      `${TIP} treba točno 2 presjeka: [šire, uže]`,
    )
  ) {
    s.presjeci.forEach((p, i) => {
      need(
        pozitivan(p?.d) !== pozitivan(p?.S),
        `presjeci[${i}] treba točno jedno od: d (promjer u cm) ili S (površina u cm²)`,
      );
      if (p?.d != null)
        need(
          pozitivan(p.d) && p.d <= 200,
          `presjeci[${i}].d mora biti promjer u cm (0–200)`,
        );
      if (p?.S != null)
        need(
          pozitivan(p.S) && p.S <= 30000,
          `presjeci[${i}].S mora biti površina u cm² (0–30 000)`,
        );
      if (p?.oznaka != null)
        need(
          isText(p.oznaka) && p.oznaka.length <= 12,
          `presjeci[${i}].oznaka je kratak tekst (npr. „šire“)`,
        );
    });
    const [a, b] = s.presjeci;
    need(
      pozitivan(a?.d) === pozitivan(b?.d),
      "oba presjeka zadaj na isti način: oba promjerom d ili oba površinom S",
    );
    if (!list.length) {
      const r = povrsina(a) / povrsina(b);
      need(
        r > 1.0001,
        "prvi presjek mora biti širi od drugog (cijev se sužava)",
      );
      need(r <= 64, "omjer površina najviše 64 (inače se uži dio ne vidi)");
    }
  }
  need(
    pozitivan(s.v1) && s.v1 <= 50,
    "v1 (brzina u širem dijelu) mora biti između 0 i 50 m/s",
  );
  if (s.rho != null)
    need(
      pozitivan(s.rho) && s.rho >= 500 && s.rho <= 22000,
      "rho (gustoća tekućine) u kg/m³, 500–22 000",
    );
  if (s.p1 != null)
    need(
      pozitivan(s.p1) && s.p1 <= 1e7,
      "p1 (tlak u širem dijelu) u Pa, pozitivan",
    );
  if (s.kanta != null)
    need(
      pozitivan(s.kanta?.V) && s.kanta.V <= 10000,
      "kanta treba V (volumen u litrama)",
    );
  if (list.length) return list;
  const st = stanje(s);
  if (s.p1 != null)
    need(
      st.p2 > 0,
      `uz ove brojeve tlak u užem dijelu bio bi ${formatNumber(st.p2)} Pa (negativan): povećaj p1 ili smanji brzinu`,
    );
  if (s.klizaci != null) {
    if (
      need(
        Array.isArray(s.klizaci) &&
          s.klizaci.length >= 1 &&
          s.klizaci.length <= 2,
        "klizaci je popis 1–2 klizača",
      )
    ) {
      s.klizaci.forEach((k, i) => {
        if (
          !need(
            KLIZACI.includes(k?.id),
            `klizaci[${i}].id mora biti jedan od: ${KLIZACI.join(", ")}`,
          )
        )
          return;
        need(
          (k.id === "d2") === pozitivan(s.presjeci[1].d) || k.id === "v1",
          `klizač ${k.id} ne odgovara načinu zadavanja presjeka (${pozitivan(s.presjeci[1].d) ? "d2" : "S2"})`,
        );
        if (
          need(
            [k.min, k.max].every(pozitivan) && k.max > k.min,
            `klizaci[${i}] treba min < max (pozitivni)`,
          )
        ) {
          const zad =
            k.id === "v1"
              ? s.v1
              : k.id === "d2"
                ? s.presjeci[1].d
                : s.presjeci[1].S;
          need(
            zad >= k.min && zad <= k.max,
            `klizaci[${i}]: zadana vrijednost ${formatNumber(zad)} mora biti između min i max`,
          );
          if (k.id !== "v1") {
            const prvi = k.id === "d2" ? s.presjeci[0].d : s.presjeci[0].S;
            need(
              k.max <= prvi * 1.5,
              `klizaci[${i}].max neka ne bude puno veći od prvog presjeka (${formatNumber(prvi)})`,
            );
            need(
              prvi / k.min <= (k.id === "d2" ? 8 : 64),
              `klizaci[${i}].min je premalen (uži dio se ne bi vidio)`,
            );
          }
        }
        if (k.korak != null)
          need(
            pozitivan(k.korak) && k.korak < k.max - k.min,
            `klizaci[${i}].korak mora biti pozitivan i manji od raspona`,
          );
      });
      need(
        new Set(s.klizaci.map((k) => k?.id)).size === s.klizaci.length,
        "klizači se ne smiju ponavljati",
      );
    }
  }
  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    need(s.pitaj == null, "istrazi nema polje pitaj");
  }
  if (s.nacin === "predvidi") {
    need(
      s.klizaci == null,
      "predvidi nema klizače (učenik računa za zadane brojeve)",
    );
    const v = velicina(s);
    if (
      !need(
        v in VELICINE,
        `predvidi treba pitaj.velicina, jedna od: ${Object.keys(VELICINE).join(", ")}`,
      )
    )
      return list;
    need(
      jedinicaOk(VELICINE[v], jedinica(s)),
      `jedinica za ${v} mora biti jedna od: ${Object.keys(JEDINICE[VELICINE[v]]).join(", ")}`,
    );
    if (v === "p2")
      need(s.p1 != null, "za p2 treba zadati p1 (tlak u širem dijelu, Pa)");
    if (v === "t_kanta") need(s.kanta != null, "za t_kanta treba kanta: {V}");
    if (!list.length)
      validateKrivo(s.krivo, odgovor(s), tolOf(s, odgovor(s)), need);
  }
  return list;
}

// ── tipične greške (u SI jedinicama) ──────────────────────────────────────────────────────────────────
function krivoSI(s) {
  const st = stanje(s);
  const [a, b] = s.presjeci;
  const v = velicina(s);
  const sPromjerom = pozitivan(a.d);
  const omjerD = sPromjerom ? a.d / b.d : null;
  const out = [];
  if (v === "v2") {
    if (sPromjerom)
      out.push({
        si: st.v1 * omjerD,
        poruka:
          "Brzina se mijenja s omjerom površina, a površina ide s kvadratom promjera: S₁/S₂ = (d₁/d₂)².",
      });
    out.push({
      si: (st.v1 * st.S2) / st.S1,
      poruka: "Gdje je cijev uža, voda teče brže, a ne sporije: v₂ = v₁·S₁/S₂.",
    });
    out.push({
      si: st.v1,
      poruka:
        "Brzina nije ista u oba dijela. Isti je protok Q = S·v, pa u užem dijelu voda mora biti brža.",
    });
  }
  if (v === "p2") {
    out.push({
      si: st.p1,
      poruka:
        "Tlak nije isti: u užem dijelu voda je brža, pa je statički tlak manji.",
    });
    out.push({
      si: st.p1 - st.pd1 + st.pd2,
      poruka:
        "Gdje je voda brža, tlak je manji, a ne veći: p₂ = p₁ + ρ(v₁² − v₂²)/2.",
    });
    out.push({
      si: st.p1 + 2 * (st.pd1 - st.pd2),
      poruka: "Dinamički tlak je ρv²/2: zaboravio si podijeliti s 2.",
    });
    out.push({
      si: st.p1 + (st.pd1 - st.pd2) / st.rho,
      poruka: "Pomnoži s gustoćom vode ρ: dinamički tlak je ρv²/2.",
    });
    out.push({
      si: st.p1 + (st.rho / 2) * (st.v1 - st.v2),
      poruka: "Brzine u Bernoullijevoj jednadžbi su na kvadrat: ρv²/2.",
    });
    out.push({
      si: st.p1 / 1000 + st.pd1 - st.pd2,
      poruka:
        "Tlak p₁ najprije pretvori u paskale, pa ga tek onda zbroji s ρv²/2.",
    });
    if (sPromjerom) {
      const vKrivo = st.v1 * omjerD;
      out.push({
        si: st.p1 + (st.rho / 2) * (st.v1 ** 2 - vKrivo ** 2),
        poruka: "Najprije točno izračunaj v₂: omjer površina, a ne promjera.",
      });
    }
  }
  if (v === "Q") {
    out.push({
      si: st.S1 * 1e4 * st.v1,
      poruka:
        "Površinu pretvori u m² (1 cm² = 0,0001 m²) prije množenja brzinom.",
    });
    if (sPromjerom)
      out.push({
        si: st.Q * 4,
        poruka: "Polumjer je pola promjera: S = r²π = d²π/4.",
      });
    out.push({
      si: st.S2 * st.v1,
      poruka: "Brzina v₁ pripada širem presjeku: Q = S₁·v₁ (ili S₂·v₂).",
    });
  }
  if (v === "t_kanta") {
    const V = s.kanta.V / 1000;
    out.push({
      si: V / (st.Q * 1000),
      poruka:
        "Volumen i protok uzmi u istim jedinicama (L i L/s, ili m³ i m³/s).",
    });
    out.push({ si: (st.Q / V) * 1, poruka: "Vrijeme je t = V/Q, a ne Q/V." });
    if (sPromjerom)
      out.push({
        si: V / (st.Q * 4),
        poruka: "Polumjer je pola promjera: S = r²π = d²π/4.",
      });
    out.push({
      si: V / (st.S1 * 1e4 * st.v1),
      poruka: "Površinu pretvori u m² (1 cm² = 0,0001 m²).",
    });
  }
  if (v === "p_d1" || v === "p_d2") {
    const [moj, tudi] = v === "p_d1" ? [st.v1, st.v2] : [st.v2, st.v1];
    out.push({
      si: st.rho * moj * moj,
      poruka: "Dinamički tlak je ρv²/2: zaboravio si podijeliti s 2.",
    });
    out.push({
      si: (st.rho * moj) / 2,
      poruka: "Brzina je u dinamičkom tlaku na kvadrat: ρv²/2.",
    });
    out.push({
      si: (st.rho * tudi * tudi) / 2,
      poruka: `To je dinamički tlak u ${v === "p_d1" ? "užem" : "širem"} dijelu. Uzmi brzinu iz traženog dijela.`,
    });
    if (st.p1 != null)
      out.push({
        si: v === "p_d1" ? st.p1 : st.p2,
        poruka:
          "To je statički tlak (onaj koji pokazuje manometar). Dinamički je ρv²/2.",
      });
  }
  return out;
}

function check(s, input) {
  const v = velicina(s);
  const jed = jedinica(s);
  const answer = odgovor(s);
  const krivo = [
    ...(s.krivo ?? []),
    ...krivoU(krivoSI(s), VELICINE[v], jed, answer),
    ...krivoJedinica(odgovorSI(s), VELICINE[v], jed),
  ];
  const SAVJET = {
    v2: "Protok je isti u oba dijela: S₁v₁ = S₂v₂, pa v₂ = v₁·S₁/S₂.",
    p2: "Bernoulli za vodoravnu cijev: p₁ + ρv₁²/2 = p₂ + ρv₂²/2. Najprije izračunaj v₂.",
    Q: "Protok je Q = S·v, s površinom u m².",
    t_kanta: "Vrijeme punjenja je t = V/Q, s istim jedinicama volumena.",
    p_d1: "Dinamički tlak je p_d = ρv²/2.",
    p_d2: "Dinamički tlak je p_d = ρv²/2, s brzinom u užem dijelu.",
  };
  return checkNumber({
    input,
    answer,
    tol: tolOf(s, answer),
    unit: jed,
    krivo,
    savjet: s.savjet || SAVJET[v],
  });
}

const VODA_694 = {
  presjeci: [
    { oznaka: "šire", d: 4 },
    { oznaka: "uže", d: 2 },
  ],
  v1: 1.5,
};
const BERNOULLI_699 = {
  presjeci: [
    { oznaka: "šire", S: 20 },
    { oznaka: "uže", S: 5 },
  ],
  v1: 1,
  p1: 150000,
};

export const cijev = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Voda teče kroz vodoravnu cijev koja se sužava: čestice se gibaju brzinom v = Q/S (u užem dijelu brže), uz svaki presjek d ili S i v,
isti protok Q; uz p1 manometri pokazuju statički tlak, a stupci statički + dinamički tlak (zbroj isti). Kanta se puni protokom Q.
Polja: tekst, presjeci: [{oznaka?, d (cm) ili S (cm²)}, {…}] (točno 2, prvi širi, oba istim načinom), v1 (m/s, u širem dijelu),
p1? (statički tlak u širem dijelu, Pa), rho? (1000 kg/m³), kanta?: {V (L)}, nacin:
- "istrazi": učenik mijenja klizače i gleda; klizaci?: [{id: "d2" | "S2" | "v1", min, max, korak?}] (1–2; bez njih klizač za uži presjek i v1);
- "predvidi": pitaj: {velicina: "v2" | "p2" | "Q" | "t_kanta" | "p_d1" | "p_d2"}, jedinica? (v2: "m/s"; p: "Pa" | "kPa" …; Q: "L/s" | "m³/s" |
  "L/min"; t: "s" | "min"); animacija i traženi broj skriveni su dok učenik ne odgovori. Točan odgovor i tipične greške (omjer promjera
  umjesto površina, veći tlak gdje je brže, zaboravljeno /2, cm² u m², kPa i Pa…) računa aplikacija; tolerancija? (zadano 0,5 %); ${KRIVO_OPIS}.`,
  primjer: {
    tip: TIP,
    nacin: "predvidi",
    tekst:
      "Cijev se sužava s promjera 4 cm na promjer 2 cm. U širem dijelu voda teče brzinom 1,5 m/s. Kolika je brzina vode u užem dijelu?",
    ...VODA_694,
    kanta: { V: 10 },
    pitaj: { velicina: "v2" },
  },
  primjeri: [
    {
      tip: TIP,
      nacin: "istrazi",
      tekst:
        "Mijenjaj promjer užeg dijela i brzinu. Gledaj kako se mijenjaju brzina u užem dijelu i protok.",
      ...VODA_694,
      kanta: { V: 10 },
    },
    {
      tip: TIP,
      nacin: "predvidi",
      tekst: "Koliki je protok vode kroz cijev?",
      ...VODA_694,
      kanta: { V: 10 },
      pitaj: { velicina: "Q" },
    },
    {
      tip: TIP,
      nacin: "predvidi",
      tekst: "Za koliko se sekundi napuni kanta od 10 litara?",
      ...VODA_694,
      kanta: { V: 10 },
      pitaj: { velicina: "t_kanta" },
    },
    {
      tip: TIP,
      nacin: "istrazi",
      tekst:
        "Mijenjaj površinu užeg dijela. Prati manometre: gdje je tlak manji? Zbroj statičkog i dinamičkog tlaka ostaje isti.",
      ...BERNOULLI_699,
      klizaci: [{ id: "S2", min: 4, max: 20, korak: 1 }],
    },
    {
      tip: TIP,
      nacin: "predvidi",
      tekst:
        "U vodoravnoj cijevi presjeka 20 cm² voda teče brzinom 1 m/s pri tlaku 150 kPa. Uži dio ima presjek 5 cm². Koliki je tlak u užem dijelu?",
      ...BERNOULLI_699,
      pitaj: { velicina: "p2" },
    },
    {
      tip: TIP,
      nacin: "predvidi",
      tekst: "Koliki je dinamički tlak u užem dijelu cijevi?",
      ...BERNOULLI_699,
      pitaj: { velicina: "p_d2" },
    },
  ],
  validate,
  check,
  tocanOdgovor: (s) =>
    s.nacin === "predvidi" ? `${formatNumber(odgovor(s))} ${jedinica(s)}` : "",
  brojcaniOdgovor: (s) => (s.nacin === "predvidi" ? odgovor(s) : null),
};
