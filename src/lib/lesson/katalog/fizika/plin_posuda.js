// plin_posuda: čestice idealnog plina u cilindru s klipom (ili čvrstoj boci). Klip i toplina određuju proces:
// zaključan klip → stalan volumen, pomičan klip s utegom → stalan tlak, ručni klip → volumen mijenja učenik
// (uz termostat stalna T, u izoliranoj posudi adijabatski: TV^(γ−1) = konst.). Tlak se računa iz pV = nRT, a ne
// iz brojanja udaraca; animacija samo prikazuje ono što ovaj modul izračuna.
// Spec s poljem „smjesa“ (kemija: smjesa plinova, Daltonov zakon) ide zasebnim putem u _smjesa.js; ostali specovi
// ovim kodom, nepromijenjeno.
import { isNum, parseNumber, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
} from "../zajednicko.js";
import {
  R,
  KB,
  NA,
  GAMA,
  P_JEDINICE,
  V_JEDINICE,
  IME,
  iznos,
  raspon,
} from "./_plin.js";
import {
  jeSmjesa,
  validateSmjesa,
  checkSmjesa,
  tocanOdgovorSmjesa,
  OPIS_SMJESE,
  PRIMJERI_SMJESE,
} from "./_smjesa.js";

const NACINI = ["istrazi", "predvidi", "odaberi"];
const KLIPOVI = ["zakljucan", "pomican", "rucni"];
const TOPLINE = ["termostat", "izolirano"];
const KONTROLE = ["T", "V", "n"];
export const PRIKAZI = ["p", "V", "T", "n", "N", "Ek", "vef", "W"];
const PITAJ = ["p", "V", "T", "n", "Ek", "vef"];
const ODABERI = ["vef", "p", "Ek", "T", "n", "V"];
export const SMJEROVI = ["gore", "dolje", "isto"];
const TOL_FAKTOR = 0.01;

export function jediniceOd(s) {
  return { p: s.jedinice?.p ?? "kPa", V: s.jedinice?.V ?? "L" };
}

// Puno stanje iz n (mol), V (jedinica speca), T (K) i M (g/mol): tlak u jedinici speca, N, Ēk (J), v_ef (m/s).
export function stanje(s, { n, V, T, M }) {
  const j = jediniceOd(s);
  const pPa = (n * R * T) / (V * V_JEDINICE[j.V]);
  return {
    n,
    V,
    T,
    M,
    p: pPa / P_JEDINICE[j.p],
    N: n * NA,
    Ek: 1.5 * KB * T,
    vef: Math.sqrt((3 * R * T) / (M / 1000)),
  };
}

// Istraživanje: kontrole postavljaju T, V i/ili n; što nije kontrola, određuje klip i toplina.
export function stanjeIstrazi(s, posuda, k = {}) {
  const n = k.n ?? posuda.n;
  const p0 = stanje(s, posuda).p;
  const j = jediniceOd(s);
  if (posuda.klip === "zakljucan")
    return stanje(s, { ...posuda, n, T: k.T ?? posuda.T });
  if (posuda.klip === "pomican") {
    const T = k.T ?? posuda.T;
    // stalan tlak: V = nRT/p
    const V = (n * R * T) / (p0 * P_JEDINICE[j.p]) / V_JEDINICE[j.V];
    return stanje(s, { ...posuda, n, T, V });
  }
  const V = k.V ?? posuda.V;
  if (posuda.toplina === "izolirano")
    return stanje(s, {
      ...posuda,
      n: posuda.n,
      V,
      T: posuda.T * (posuda.V / V) ** (GAMA - 1),
    });
  if (posuda.toplina === "termostat")
    return stanje(s, { ...posuda, n, V, T: k.T ?? posuda.T });
  return stanje(s, { ...posuda, n, V, T: k.T ?? posuda.T });
}

// Predviđanje: promjena {n?, T?, V?} (faktori) uz brave klipa i topline → stanje poslije.
export function nakonPromjene(s, posuda, promjena = s.promjena ?? {}) {
  const fn = promjena.n ?? 1;
  const fT = promjena.T ?? 1;
  const fV = promjena.V ?? 1;
  if (posuda.klip === "zakljucan")
    return stanje(s, { ...posuda, n: posuda.n * fn, T: posuda.T * fT });
  if (posuda.klip === "pomican")
    return stanje(s, {
      ...posuda,
      n: posuda.n * fn,
      T: posuda.T * fT,
      V: posuda.V * fn * fT,
    });
  if (posuda.toplina === "izolirano")
    return stanje(s, {
      ...posuda,
      V: posuda.V * fV,
      T: posuda.T * fV ** (1 - GAMA),
    });
  if (posuda.toplina === "termostat")
    return stanje(s, { ...posuda, n: posuda.n * fn, V: posuda.V * fV });
  return stanje(s, {
    ...posuda,
    n: posuda.n * fn,
    T: posuda.T * fT,
    V: posuda.V * fV,
  });
}

export function faktori(s, promjena = s.promjena) {
  const p = s.posude[0];
  const a = stanje(s, p);
  const b = nakonPromjene(s, p, promjena);
  return Object.fromEntries(PITAJ.map((q) => [q, b[q] / a[q]]));
}
const smjerOd = (f) =>
  f > 1 + 1e-9 ? "gore" : f < 1 - 1e-9 ? "dolje" : "isto";
export const faktorPolja = (s) => [].concat(s.faktor ?? []);

// ── tekst ──
export const JEDINICA = (s, q) =>
  ({
    p: jediniceOd(s).p,
    V: jediniceOd(s).V,
    T: "K",
    n: "mol",
    N: "",
    Ek: "J",
    vef: "m/s",
    W: "J",
  })[q];
export const SMJER_TXT = {
  gore: "raste",
  dolje: "pada",
  isto: "ne mijenja se",
};
const STRELICA = { gore: "↑", dolje: "↓", isto: "=" };
const OPIS_PROMJENE = {
  n: (f) =>
    f < 1
      ? `izlazak ${formatNumber(Math.round((1 - f) * 1000) / 10)} % čestica (n × ${formatNumber(f)})`
      : `dodavanje plina (n × ${formatNumber(f)})`,
  T: (f) => `${f > 1 ? "grijanje" : "hlađenje"} (T × ${formatNumber(f)})`,
  V: (f) => `${f < 1 ? "stiskanje" : "širenje"} (V × ${formatNumber(f)})`,
};

function zakon(s, q) {
  const p = s.posude[0];
  if (q === "Ek")
    return "Srednja kinetička energija čestice ovisi samo o termodinamičkoj temperaturi: $\\bar{E}_k = \\frac{3}{2}kT$.";
  if (q === "vef")
    return "Efektivna brzina razmjerna je korijenu temperature: $v_{ef} = \\sqrt{3RT/M}$.";
  if (q === "n")
    return "Količina plina mijenja se samo kad plin izlazi kroz ventil ili se dodaje.";
  if (q === "V")
    return p.klip === "zakljucan"
      ? "Boca je čvrsta, pa joj se volumen ne mijenja."
      : p.klip === "pomican"
        ? "Klip je slobodan, pa je tlak stalan i volumen je razmjeran umnošku $nT$ ($V = nRT/p$)."
        : "Volumen određuje položaj klipa.";
  if (q === "T")
    return p.toplina === "termostat"
      ? "Termostat drži temperaturu stalnom."
      : p.toplina === "izolirano"
        ? "Izolirana posuda ne izmjenjuje toplinu: rad pri stiskanju povećava unutarnju energiju, pa temperatura raste (pri širenju pada)."
        : "Temperatura se mijenja samo grijanjem ili hlađenjem.";
  // tlak
  if (p.klip === "zakljucan")
    return "Volumen je stalan, pa je tlak razmjeran umnošku $nT$ ($p = nRT/V$).";
  if (p.klip === "pomican")
    return "Tlak plina uvijek je jednak tlaku koji stvara slobodni klip s utegom, pa se ne mijenja (mijenja se volumen).";
  if (p.toplina === "termostat")
    return "Temperatura je stalna, pa je tlak razmjeran $n/V$ ($pV$ = konst. za isti plin).";
  if (p.toplina === "izolirano")
    return "U izoliranoj posudi pri stiskanju raste i temperatura, pa tlak raste više nego obrnuto razmjerno volumenu ($pV^{5/3}$ = konst.).";
  return "Vrijedi $p = nRT/V$: pomnoži faktore promjene $n$ i $T$ i podijeli faktorom promjene $V$.";
}

// tipični krivi faktori za veličinu q
function kriviFaktori(s, q) {
  const prom = s.promjena ?? {};
  const f = faktori(s)[q];
  const out = [];
  const kljucevi = Object.keys(prom);
  if (kljucevi.length > 1) {
    for (const k of kljucevi) {
      const bez = { ...prom, [k]: 1 };
      out.push({
        faktor: faktori(s, bez)[q],
        poruka: `Nisi uračunao ${OPIS_PROMJENE[k](prom[k])}. Na kraju obje promjene djeluju zajedno.`,
      });
    }
    const zbroj =
      1 +
      kljucevi.reduce((a, k) => a + (faktori(s, { [k]: prom[k] })[q] - 1), 0);
    out.push({
      faktor: zbroj,
      poruka: "Faktori promjena se množe, a ne zbrajaju.",
    });
  }
  if (isNum(prom.n) && prom.n < 1)
    out.push({
      faktor: faktori(s, { ...prom, n: 1 - prom.n })[q],
      poruka: `Izašlo je ${formatNumber(Math.round((1 - prom.n) * 1000) / 10)} % čestica, pa ih je ostalo ${formatNumber(Math.round(prom.n * 1000) / 10)} %: n × ${formatNumber(prom.n)}.`,
    });
  if (
    s.posude[0].toplina === "izolirano" &&
    isNum(prom.V) &&
    (q === "p" || q === "T")
  ) {
    const izotermno = q === "p" ? 1 / prom.V : 1;
    out.push({
      faktor: izotermno,
      poruka:
        "To bi vrijedilo pri stalnoj temperaturi. Posuda je izolirana, pa se pri stiskanju plin i zagrije.",
    });
  }
  if (Math.abs(f - 1) > 1e-9)
    out.push({
      faktor: 1 / f,
      poruka: "Obrnuo si omjer: podijelio si umjesto pomnožio (ili obrnuto).",
    });
  return out.filter((k) => Math.abs(k.faktor - f) > TOL_FAKTOR * Math.abs(f));
}

// vrijednost za usporedbu u načinu odaberi
const usporedba = (s) => s.posude.map((p) => stanje(s, p)[s.pitanje]);
export function tocnaPosuda(s) {
  const [a, b] = usporedba(s);
  if (Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b)))
    return "jednako";
  const veca = a > b ? 0 : 1;
  return s.manja ? 1 - veca : veca;
}

function validatePosuda(p, i, need) {
  const w = `posude[${i}]`;
  need(isText(p?.oznaka), `${w}.oznaka mora biti tekst (npr. "helij")`);
  need(
    isNum(p?.M) && p.M > 0 && p.M <= 400,
    `${w}.M (molarna masa u g/mol) mora biti broj između 0 i 400`,
  );
  need(isNum(p?.n) && p.n > 0, `${w}.n (mol) mora biti pozitivan broj`);
  need(isNum(p?.V) && p.V > 0, `${w}.V mora biti pozitivan broj`);
  need(
    isNum(p?.T) && p.T > 0 && p.T <= 5000,
    `${w}.T (u K) mora biti između 0 i 5000`,
  );
  need(
    KLIPOVI.includes(p?.klip),
    `${w}.klip mora biti "zakljucan", "pomican" ili "rucni"`,
  );
  if (p?.toplina != null)
    need(
      TOPLINE.includes(p.toplina) && p.klip === "rucni",
      `${w}.toplina mora biti "termostat" ili "izolirano" i postoji samo uz klip "rucni"`,
    );
  need(
    Object.keys(p ?? {}).every((f) =>
      ["oznaka", "M", "n", "V", "T", "klip", "toplina"].includes(f),
    ),
    `${w} smije imati samo oznaka, M, n, V, T, klip i toplina`,
  );
}

export const plin_posuda = {
  tip: "plin_posuda",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Čestice plina u cilindru s klipom (animacija; brzina čestica razmjerna je √(T/M), broj čestica količini n). Tlak se računa iz pV = nRT.
posude: [{oznaka, M (g/mol), n (mol), V, T (K), klip: "zakljucan" (čvrsta boca, V stalan) | "pomican" (klip s utegom, p stalan) | "rucni" (V mijenja učenik),
toplina?: "termostat" (T stalna) | "izolirano" (adijabatski, TV^(2/3) = konst.) – samo uz "rucni"}] (1–2), jedinice?: {p: "kPa" (Pa | kPa | bar | MPa), V: "L" (L | dm³ | m³ | mL | cm³)},
prikazi?: popis od ${PRIKAZI.join(", ")} (očitanja; zadano p, V, T; Ek = srednja kinetička energija čestice, vef = efektivna brzina, W = rad plina od početka), tekst, nacin:
- "istrazi" (nije zadatak): kontrole: popis od "T" (grij/hladi), "V" (pomiči klip, samo uz "rucni"), "n" (ventil); raspon?: {T: [od, do], V: […], n: […]} za klizače.
  Uz dvije posude kontrole mijenjaju obje (početne vrijednosti kontroliranih veličina moraju biti jednake);
- "predvidi": jedna posuda, promjena: {n?, T?, V?} faktori (n 0,75 = izađe 25 % čestica; V samo uz "rucni"; uz termostat bez T, uz izolirano samo V),
  pitaj: popis od ${PITAJ.join(", ")} – za svaku učenik bira raste / pada / ostaje isti; faktor?: veličina ili popis veličina za koje upisuje i faktor (npr. p × 1,5).
  Točne faktore računa aplikacija; krivi faktori (zanemarena jedna promjena, zbroj umjesto umnoška, obrnut omjer, izotermno umjesto adijabatski) dodaju se sami;
  krivo?: [{velicina, faktor, poruka}]. Nakon točnog odgovora animacija izvede promjenu;
- "odaberi": dvije posude, pitanje: ${ODABERI.join(" | ")}, manja?: true (traži se manja vrijednost); učenik dodirne posudu ili „jednako“.${OPIS_SMJESE}`,
  primjer: {
    tip: "plin_posuda",
    nacin: "predvidi",
    tekst:
      "Kroz rupicu iz čvrste boce izađe 25 % čestica, a termodinamička temperatura preostalog plina poraste 2 puta. Što se dogodi s tlakom u boci?",
    posude: [
      { oznaka: "kisik", M: 32, n: 2, V: 10, T: 300, klip: "zakljucan" },
    ],
    promjena: { n: 0.75, T: 2 },
    pitaj: ["p"],
    faktor: "p",
  },
  primjeri: [
    {
      tip: "plin_posuda",
      nacin: "istrazi",
      tekst:
        "U boci je 64 g kisika (2 mol). Mijenjaj temperaturu i količinu plina i gledaj tlak.",
      posude: [
        { oznaka: "kisik", M: 32, n: 2, V: 10, T: 300, klip: "zakljucan" },
      ],
      kontrole: ["T", "n"],
      prikazi: ["p", "V", "T", "n", "N"],
    },
    {
      tip: "plin_posuda",
      nacin: "istrazi",
      tekst:
        "Plin je ispod slobodnog klipa s utegom. Grij ga i gledaj kako se klip diže pri stalnom tlaku i koliki rad plin obavi.",
      posude: [
        { oznaka: "zrak", M: 29, n: 0.2, V: 4, T: 300, klip: "pomican" },
      ],
      kontrole: ["T"],
      prikazi: ["p", "V", "T", "W"],
    },
    {
      tip: "plin_posuda",
      nacin: "istrazi",
      tekst:
        "Obje posude su na istoj temperaturi. Mijenjaj je i usporedi molekule helija i argona.",
      posude: [
        { oznaka: "helij", M: 4, n: 1, V: 10, T: 300, klip: "zakljucan" },
        { oznaka: "argon", M: 40, n: 1, V: 10, T: 300, klip: "zakljucan" },
      ],
      kontrole: ["T"],
      prikazi: ["T", "Ek", "vef"],
    },
    {
      tip: "plin_posuda",
      nacin: "istrazi",
      tekst:
        "Posuda je toplinski izolirana. Stisni plin klipom i gledaj temperaturu.",
      posude: [
        {
          oznaka: "helij",
          M: 4,
          n: 0.5,
          V: 12,
          T: 300,
          klip: "rucni",
          toplina: "izolirano",
        },
      ],
      kontrole: ["V"],
      raspon: { V: [3, 12] },
      prikazi: ["p", "V", "T", "W"],
    },
    {
      tip: "plin_posuda",
      nacin: "predvidi",
      tekst:
        "Plin u izoliranoj posudi adijabatski se stisne na polovicu volumena. Što se dogodi s temperaturom, tlakom i brzinom molekula?",
      posude: [
        {
          oznaka: "helij",
          M: 4,
          n: 0.5,
          V: 12,
          T: 300,
          klip: "rucni",
          toplina: "izolirano",
        },
      ],
      promjena: { V: 0.5 },
      pitaj: ["T", "p", "vef"],
    },
    {
      tip: "plin_posuda",
      nacin: "odaberi",
      tekst:
        "Helij i argon su na istoj temperaturi. U kojoj se posudi molekule gibaju brže?",
      posude: [
        { oznaka: "helij", M: 4, n: 1, V: 10, T: 300, klip: "zakljucan" },
        { oznaka: "argon", M: 40, n: 1, V: 10, T: 300, klip: "zakljucan" },
      ],
      pitanje: "vef",
    },
    ...PRIMJERI_SMJESE,
  ],

  validate(s) {
    if (jeSmjesa(s)) return validateSmjesa(s);
    const { list, need } = problems();
    need(
      NACINI.includes(s.nacin),
      `plin_posuda.nacin mora biti jedan od: ${NACINI.join(", ")}`,
    );
    need(isText(s.tekst), "plin_posuda treba „tekst“");
    const j = s.jedinice ?? {};
    need(
      j.p == null || j.p in P_JEDINICE,
      `jedinice.p mora biti jedna od: ${Object.keys(P_JEDINICE).join(", ")}`,
    );
    need(
      j.V == null || j.V in V_JEDINICE,
      `jedinice.V mora biti jedna od: ${Object.keys(V_JEDINICE).join(", ")}`,
    );
    if (s.jedinice != null)
      need(
        typeof s.jedinice === "object" &&
          Object.keys(s.jedinice).every((q) => ["p", "V"].includes(q)),
        "jedinice smije imati samo p i V",
      );
    if (s.prikazi != null)
      need(
        Array.isArray(s.prikazi) &&
          s.prikazi.length >= 1 &&
          s.prikazi.every((q) => PRIKAZI.includes(q)) &&
          new Set(s.prikazi).size === s.prikazi.length,
        `prikazi je popis različitih od: ${PRIKAZI.join(", ")}`,
      );
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    if (
      !need(
        Array.isArray(s.posude) && s.posude.length >= 1 && s.posude.length <= 2,
        "plin_posuda treba posude: 1–2 posude",
      )
    )
      return list;
    s.posude.forEach((p, i) => validatePosuda(p, i, need));
    if (list.length) return list;
    const zabranjena = (polja) =>
      polja.forEach((f) =>
        need(!(f in s), `polje „${f}“ ne postoji u načinu ${s.nacin}`),
      );

    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      zabranjena(["promjena", "pitaj", "faktor", "pitanje", "manja"]);
      const k = s.kontrole ?? [];
      if (
        need(
          Array.isArray(k) &&
            k.length >= 1 &&
            k.every((q) => KONTROLE.includes(q)) &&
            new Set(k).size === k.length,
          "istrazi treba kontrole: popis od T, V, n",
        )
      ) {
        for (const p of s.posude) {
          need(
            !k.includes("V") || p.klip === "rucni",
            `kontrola V (pomicanje klipa) traži klip "rucni" (${p.oznaka})`,
          );
          need(
            !k.includes("T") || p.toplina !== "izolirano",
            `izoliranu posudu (${p.oznaka}) ne može se grijati: makni kontrolu T`,
          );
          need(
            !k.includes("n") || p.toplina !== "izolirano",
            `izoliranoj posudi (${p.oznaka}) ne ispušta se plin: makni kontrolu n`,
          );
        }
        if (s.posude.length === 2)
          for (const q of k)
            need(
              s.posude[0][q] === s.posude[1][q],
              `uz dvije posude kontrola ${q} mijenja obje, pa početni ${q} mora biti jednak`,
            );
      }
      if (s.raspon != null) {
        if (
          need(
            typeof s.raspon === "object" &&
              Object.keys(s.raspon).every((q) => k.includes(q)),
            "raspon smije imati samo veličine iz kontrole",
          )
        ) {
          for (const [q, r] of Object.entries(s.raspon)) {
            if (
              need(
                raspon(r) && r[0] > 0,
                `raspon.${q} mora biti [od, do] uz 0 < od < do`,
              )
            )
              need(
                s.posude.every((p) => p[q] >= r[0] && p[q] <= r[1]),
                `početni ${q} mora biti unutar raspon.${q}`,
              );
          }
        }
      }
    }

    if (s.nacin === "predvidi") {
      zabranjena(["kontrole", "raspon", "pitanje", "manja"]);
      need(s.posude.length === 1, "predvidi ima jednu posudu");
      const p = s.posude[0];
      const prom = s.promjena;
      if (
        need(
          prom &&
            typeof prom === "object" &&
            Object.keys(prom).length >= 1 &&
            Object.entries(prom).every(
              ([q, f]) =>
                KONTROLE.includes(q) &&
                isNum(f) &&
                f > 0 &&
                Math.abs(f - 1) > 1e-9,
            ),
          "predvidi treba promjena: {n?, T?, V?} s faktorima > 0 i različitim od 1",
        )
      ) {
        need(
          !("V" in prom) || p.klip === "rucni",
          'promjena V traži klip "rucni" (zaključan klip drži volumen, slobodni ga mijenja sam)',
        );
        need(
          !("T" in prom) || p.toplina == null,
          "uz termostat ili izolaciju temperatura se ne zadaje: mijenja se sama (ili ostaje stalna)",
        );
        need(
          p.toplina !== "izolirano" || Object.keys(prom).join() === "V",
          "u izoliranoj posudi zadaje se samo promjena V",
        );
        need(
          !isNum(prom.n) || prom.n <= 1 || p.toplina !== "izolirano",
          "u izoliranu posudu ne dodaje se plin",
        );
      }
      const pitaj = s.pitaj;
      if (
        need(
          Array.isArray(pitaj) &&
            pitaj.length >= 1 &&
            pitaj.length <= 4 &&
            pitaj.every((q) => PITAJ.includes(q)) &&
            new Set(pitaj).size === pitaj.length,
          `pitaj je popis 1–4 različite od: ${PITAJ.join(", ")}`,
        )
      ) {
        const fp = faktorPolja(s);
        need(
          s.faktor == null ||
            (fp.length >= 1 && fp.every((q) => pitaj.includes(q))),
          "faktor mora biti veličina (ili popis veličina) iz pitaj",
        );
        if (
          s.krivo != null &&
          need(Array.isArray(s.krivo), "krivo mora biti popis")
        ) {
          const f = list.length ? null : faktori(s);
          s.krivo.forEach((k, i) => {
            need(
              fp.includes(k?.velicina),
              `krivo[${i}].velicina mora biti veličina iz faktor`,
            );
            need(
              isNum(k?.faktor) && isText(k?.poruka),
              `krivo[${i}] treba faktor (broj) i poruku`,
            );
            if (f && isNum(k?.faktor) && fp.includes(k?.velicina))
              need(
                Math.abs(k.faktor - f[k.velicina]) > TOL_FAKTOR * f[k.velicina],
                `krivo[${i}].faktor je točan odgovor`,
              );
          });
        }
      }
    }

    if (s.nacin === "odaberi") {
      zabranjena([
        "kontrole",
        "raspon",
        "promjena",
        "pitaj",
        "faktor",
        "krivo",
      ]);
      need(s.posude.length === 2, "odaberi treba dvije posude");
      need(
        ODABERI.includes(s.pitanje),
        `pitanje mora biti jedno od: ${ODABERI.join(", ")}`,
      );
      if (s.manja != null)
        need(typeof s.manja === "boolean", "manja mora biti true ili false");
    }
    return list;
  },

  check(s, odgovor) {
    if (jeSmjesa(s)) return checkSmjesa(s, odgovor);
    if (s.nacin === "odaberi") return checkOdaberi(s, odgovor);
    if (s.nacin === "predvidi") return checkPredvidi(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  tocanOdgovor(s) {
    if (jeSmjesa(s)) return tocanOdgovorSmjesa(s);
    if (s.nacin === "odaberi") {
      const t = tocnaPosuda(s);
      return t === "jednako" ? "jednako u obje posude" : s.posude[t].oznaka;
    }
    if (s.nacin === "predvidi") {
      const f = faktori(s);
      const fp = faktorPolja(s);
      return s.pitaj
        .map(
          (q) =>
            `${q} ${STRELICA[smjerOd(f[q])]} ${SMJER_TXT[smjerOd(f[q])]}${fp.includes(q) ? ` (× ${formatNumber(Number(f[q].toPrecision(3)))})` : ""}`,
        )
        .join("; ");
    }
    return "";
  },
};

// odgovor: {p: {smjer: "gore" | "dolje" | "isto", faktor?: "1,5"}, …}
function checkPredvidi(s, odgovor) {
  const f = faktori(s);
  const fp = faktorPolja(s);
  for (const q of s.pitaj)
    if (!SMJEROVI.includes(odgovor?.[q]?.smjer))
      return {
        tocno: false,
        poruka: "Za svaku veličinu odaberi raste, pada ili ostaje isti.",
        prazno: true,
      };
  for (const q of s.pitaj) {
    const tocan = smjerOd(f[q]);
    if (odgovor[q].smjer !== tocan)
      return {
        tocno: false,
        poruka:
          s.savjet ||
          `${cap(IME[q])} ${odgovor[q].smjer === "isto" ? "se mijenja" : `ne ${SMJER_TXT[odgovor[q].smjer]}`}. ${zakon(s, q)}`,
      };
  }
  for (const q of s.pitaj) {
    if (!fp.includes(q) || smjerOd(f[q]) === "isto") continue;
    const unos = parseNumber(
      String(odgovor[q].faktor ?? "").replace(/^[×x*]\s*/, ""),
    );
    if (unos == null)
      return {
        tocno: false,
        poruka: `Upiši koliko puta se promijeni ${IME[q]} (npr. 1,5).`,
        prazno: true,
      };
    if (Math.abs(unos - f[q]) <= TOL_FAKTOR * f[q]) continue;
    const hit = [
      ...(s.krivo ?? []).filter((k) => k.velicina === q),
      ...kriviFaktori(s, q),
    ].find((k) => Math.abs(unos - k.faktor) <= TOL_FAKTOR * Math.abs(k.faktor));
    if (hit) return { tocno: false, poruka: hit.poruka };
    return {
      tocno: false,
      poruka: s.savjet || `Smjer je dobar, ali faktor nije. ${zakon(s, q)}`,
    };
  }
  return { tocno: true };
}

function checkOdaberi(s, odgovor) {
  if (odgovor !== 0 && odgovor !== 1 && odgovor !== "jednako")
    return {
      tocno: false,
      poruka: "Dodirni posudu (ili „jednako“).",
      prazno: true,
    };
  const t = tocnaPosuda(s);
  if (odgovor === t) return { tocno: true };
  const [a, b] = s.posude;
  const poruka = {
    vef:
      t === "jednako"
        ? "Molekule imaju jednaku masu i temperaturu, pa su jednako brze."
        : `$v_{ef} = \\sqrt{3RT/M}$: ${a.T === b.T ? "na istoj temperaturi lakše molekule (manja molarna masa) gibaju se brže" : "brzina raste s temperaturom, a pada s molarnom masom"}.`,
    Ek:
      t === "jednako"
        ? "Srednja kinetička energija ovisi samo o temperaturi ($\\bar{E}_k = \\frac{3}{2}kT$), a ne o vrsti plina. Na istoj temperaturi jednaka je."
        : "Srednja kinetička energija ovisi samo o temperaturi: veća je gdje je temperatura viša.",
    T: "Pogledaj termometre: temperatura je zadana za svaku posudu.",
    p: `Tlak je $p = nRT/V$ i ne ovisi o vrsti plina${t === "jednako" ? ": uz iste n, T i V tlak je jednak" : ""}.`,
    n: "Količina plina je broj molova: usporedi n.",
    V: "Usporedi volumene posuda.",
  }[s.pitanje];
  return { tocno: false, poruka: s.savjet || poruka };
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export { iznos };
