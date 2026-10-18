// Stupčasti dijagram energije (LOL): za svako stanje (gore → dolje, prije → poslije, uloženo → korisno + gubici)
// stupci vrsta energije na zajedničkoj mreži. Pokriva i Q = W + ΔU te toplinski stroj (Q_t = W + Q_h, η).
// Način „istrazi“ ima i jednostavnu scenu (pad, odskok, tobogan) sa stupcima koji se mijenjaju uživo; fizika scene
// je ovdje (energijaScena), pa crtež i brojevi uvijek kažu isto.
import { isNum, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  withUnit,
} from "../zajednicko.js";

const NACINI = ["prikaz", "dovrsi", "istrazi"];
export const ENERGIJA_BOJE = [
  "plava",
  "crvena",
  "narancasta",
  "zelena",
  "ljubicasta",
  "siva",
];
const SCENE = ["pad", "odskok", "tobogan"];
const ID = /^[A-Za-z_][A-Za-z_0-9]*$/;
const EPS = 1e-9;

const clean = (x) => Number(x.toPrecision(12)) + 0;
const aligned = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-6;

// Okrugli korak mreže: 1, 2 ili 5 · 10ⁿ, oko desetine najvećeg stupca.
export function lijepiKorak(raspon) {
  if (!(raspon > 0)) return 1;
  const raw = raspon / 10;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const k of [1, 2, 5, 10]) if (k * p >= raw - EPS) return clean(k * p);
  return clean(10 * p);
}

const vrijednosti = (st) => st?.vrijednosti ?? {};
const zbroj = (st) =>
  clean(
    Object.values(vrijednosti(st)).reduce((a, v) => a + (isNum(v) ? v : 0), 0),
  );
// Visina stupca (ili složenog stupca) za mjerilo mreže.
const vrhovi = (s) =>
  (s.stanja ?? []).flatMap((st) =>
    s.slozeno ? [zbroj(st)] : Object.values(vrijednosti(st)).filter(isNum),
  );
export const energijaKorak = (s) =>
  isNum(s.korak)
    ? s.korak
    : lijepiKorak(Math.max(...vrhovi(s).map(Math.abs), EPS));
export const pitanoStanje = (s) =>
  (s.stanja ?? []).findIndex((st) => st?.pitanje === true);
// Stupci koje učenik vuče (u pitanom stanju bez zadanih).
export function vuceSe(s) {
  const st = s.stanja?.[pitanoStanje(s)];
  if (!st) return [];
  const zad = st.zadano ?? [];
  return Object.keys(vrijednosti(st)).filter((id) => !zad.includes(id));
}
// Ukupno koje mora ostati (zatvoren sustav): zbroj prvog stanja koje nije pitano.
export function energijaUkupno(s) {
  if (!s.zatvoren) return null;
  const i = pitanoStanje(s);
  const st = (s.stanja ?? []).find((_, k) => k !== i);
  return st ? zbroj(st) : null;
}
// Korisnost: korisno / uloženo, svaka vrsta ima vrijednost u točno jednom stanju. Uz ulaz (vrijednosti koje je
// učenik namjestio u pitanom stanju) računa se s njegovim stupcima.
export function energijaKorisnost(s, ulaz = null) {
  const k = s.korisnost;
  if (!k) return null;
  const i = pitanoStanje(s);
  const nadi = (id) => {
    for (let n = 0; n < (s.stanja ?? []).length; n++) {
      const v =
        n === i && ulaz && id in ulaz ? ulaz[id] : vrijednosti(s.stanja[n])[id];
      if (isNum(v) && Math.abs(v) > EPS) return v;
    }
    return 0;
  };
  const u = nadi(k.ulozeno);
  return u > 0 ? nadi(k.korisno) / u : null;
}

const oznakaTex = (s, id) => {
  const v = (s.vrste ?? []).find((x) => x.id === id);
  if (!v) return id;
  return /[_\\]/.test(v.oznaka) ? `$${v.oznaka}$` : v.oznaka;
};
const naziv = (s, id) => {
  const v = (s.vrste ?? []).find((x) => x.id === id);
  return v?.naziv ? `${oznakaTex(s, id)} (${v.naziv})` : oznakaTex(s, id);
};

// ── scena za istraživanje ─────────────────────────────────────────────────────────────────────────
// Stanje tijela u trenutku t (s): položaj, brzina i energije. Energije su uvijek točne vrijednosti iz očuvanja
// energije (Ep = mgy, Ek = mg(h − y) − Q), a ne iz numeričke integracije.
export function energijaScena(sc, oblik = "strmi") {
  const g = isNum(sc.g) ? sc.g : 9.81;
  const { m, h } = sc;
  const E = m * g * h;
  if (sc.vrsta === "pad" || sc.vrsta === "odskok") {
    const t1 = Math.sqrt((2 * h) / g);
    const h2 = sc.vrsta === "odskok" ? sc.odskok_do : 0;
    const t2 = sc.vrsta === "odskok" ? Math.sqrt((2 * h2) / g) : 0;
    const Q = sc.vrsta === "odskok" ? m * g * (h - h2) : 0;
    return {
      g,
      E,
      trajanje: t1 + t2,
      udar: t1,
      stanje(t) {
        const tt = Math.min(Math.max(t, 0), t1 + t2);
        if (tt <= t1 || sc.vrsta === "pad") {
          const y = Math.max(0, h - (g * tt * tt) / 2);
          return {
            x: 0,
            y,
            v: -g * tt,
            Ep: m * g * y,
            Ek: m * g * (h - y),
            Q: 0,
          };
        }
        const u = tt - t1;
        const vb = Math.sqrt(2 * g * h2);
        const y = Math.max(0, vb * u - (g * u * u) / 2);
        return {
          x: 0,
          y,
          v: vb - g * u,
          Ep: m * g * y,
          Ek: Math.max(0, m * g * (h2 - y)),
          Q,
        };
      },
    };
  }
  // tobogan: y(u) = h(1 − u)^n na vodoravnoj duljini L, pa ravni dio duljine h/2
  const n = oblik === "blagi" ? 2 : 3;
  const L = h * (oblik === "blagi" ? 2.6 : 1);
  const N = 400;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    pts.push([u * L, h * Math.pow(1 - u, n)]);
  }
  const ravno = h / 2;
  pts.push([L + ravno, 0]);
  const tablica = [{ t: 0, s: 0, x: 0, y: h }];
  let t = 0;
  let s = 0;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1];
    const [x1, y1] = pts[k];
    const ds = Math.hypot(x1 - x0, y1 - y0);
    const vm = Math.sqrt(2 * g * (h - (y0 + y1) / 2));
    t += ds / Math.max(vm, 1e-6);
    s += ds;
    tablica.push({ t, s, x: x1, y: y1 });
  }
  return {
    g,
    E,
    trajanje: t,
    udar: null,
    staza: pts,
    stanje(tt) {
      const c = Math.min(Math.max(tt, 0), t);
      let k = 1;
      while (k < tablica.length - 1 && tablica[k].t < c) k++;
      const a = tablica[k - 1];
      const b = tablica[k];
      const f = b.t > a.t ? (c - a.t) / (b.t - a.t) : 0;
      const x = a.x + (b.x - a.x) * f;
      const y = Math.max(0, a.y + (b.y - a.y) * f);
      return {
        x,
        y,
        v: Math.sqrt(2 * g * (h - y)),
        Ep: m * g * y,
        Ek: m * g * (h - y),
        Q: 0,
      };
    },
  };
}

// ── widget ────────────────────────────────────────────────────────────────────────────────────────
export const energija_stupci = {
  tip: "energija_stupci",
  samoRucno: true,
  uloga: (s) => (s.nacin === "dovrsi" ? ODGOVOR : POGLEDAJ),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Stupčasti dijagram energije: za svako stanje stupci vrsta energije na zajedničkoj mreži (Ep → Ek, Ek → Ek + toplina, uloženo → korisno
+ gubici, Q = W + ΔU, toplinski stroj Q_t = W + Q_h). Polja: tekst, nacin, jedinica? (zadano "J"), korak? (korak mreže i hvatanja; zadano okrugla
desetina najvećeg stupca), vrste: [{id (npr. "Ep"), oznaka (kratko, LaTeX bez $: "E_{gp}", "E_k", "Q", "\\\\Delta U", "Q_t"), naziv? (npr. "toplina i zvuk"),
boja? (${ENERGIJA_BOJE.join(" | ")})}] (1–5), stanja: [{oznaka (npr. "gore", "tik prije udara"), vrijednosti: {id: broj} (samo vrste koje u tom
stanju postoje; 0 se crta kao prazan stupac), pitanje?: true, zadano?: [id]}] (1–4), zatvoren?: true (ukupna energija je ista u svim stanjima;
provjerava se), slozeno?: true (svako stanje je jedan složeni stupac; samo nenegativne vrijednosti), korisnost?: {korisno: id, ulozeno: id}
(prikazuje η = korisno/uloženo; svaka od tih vrsta ima vrijednost u samo jednom stanju), poruke?: {id: poruka kad je baš taj stupac kriv}.
Negativne vrijednosti (npr. W < 0 pri kompresiji) crtaju se ispod nule. Načini:
- "prikaz": korak za gledanje; stanja se otkrivaju redom (gumb „Dalje“), stupci prelaze iz prethodnog stanja;
- "dovrsi": točno jedno stanje ima pitanje: true; učenik vuče stupce tog stanja (osim onih u zadano) na mrežu. Točno je kad je svaki stupac
  unutar pola koraka od točne vrijednosti (zato vrijednosti pitanog stanja moraju biti višekratnici koraka). Poruke za zbroj koji se ne čuva
  (zatvoren), zamijenjene stupce, stupac koji mora biti 0 i previsok/prenizak stupac daju se same;
- "istrazi": korak za gledanje sa scenom i stupcima E_gp, E_k i toplina uživo; učenik pušta tijelo i pomiče ga po putanji.
  scena: {vrsta: "pad" | "odskok" | "tobogan", m (kg), h (m), odskok_do? (m, za odskok), g? (zadano 9,81)}, klizaci?: [{id: "h" | "m", min, max, korak}].
  Tobogan ima prekidač strmi/blagi (ista brzina na dnu). Bez vrste i stanja.`,
  primjer: {
    tip: "energija_stupci",
    nacin: "dovrsi",
    jedinica: "J",
    korak: 0.8,
    zatvoren: true,
    tekst:
      "Kuglica mase 0,4 kg pada s 3,2 m i odbije se samo do 2 m ($g = 10$ m/s²). Povuci stupce za trenutak kad je na vrhu odskoka.",
    vrste: [
      {
        id: "Ep",
        oznaka: "E_{gp}",
        naziv: "gravitacijska potencijalna",
        boja: "plava",
      },
      { id: "Ek", oznaka: "E_k", naziv: "kinetička", boja: "crvena" },
      { id: "Q", oznaka: "Q", naziv: "toplina i zvuk", boja: "narancasta" },
    ],
    stanja: [
      { oznaka: "puštena", vrijednosti: { Ep: 12.8, Ek: 0, Q: 0 } },
      { oznaka: "tik prije udara", vrijednosti: { Ep: 0, Ek: 12.8, Q: 0 } },
      {
        oznaka: "vrh odskoka",
        vrijednosti: { Ep: 8, Ek: 0, Q: 4.8 },
        pitanje: true,
      },
    ],
    poruke: {
      Ek: "Na vrhu odskoka kuglica na trenutak miruje, pa je $E_k = 0$.",
    },
  },
  primjeri: [
    {
      tip: "energija_stupci",
      nacin: "prikaz",
      zatvoren: true,
      tekst:
        "Kuglica (0,2 kg) pada s 1,8 m. Klikni „Dalje“ i gledaj kako potencijalna energija prelazi u kinetičku.",
      vrste: [
        {
          id: "Ep",
          oznaka: "E_{gp}",
          naziv: "gravitacijska potencijalna",
          boja: "plava",
        },
        { id: "Ek", oznaka: "E_k", naziv: "kinetička", boja: "crvena" },
      ],
      stanja: [
        { oznaka: "gore", vrijednosti: { Ep: 3.6, Ek: 0 } },
        { oznaka: "na pola puta", vrijednosti: { Ep: 1.8, Ek: 1.8 } },
        { oznaka: "tik prije tla", vrijednosti: { Ep: 0, Ek: 3.6 } },
      ],
    },
    {
      tip: "energija_stupci",
      nacin: "dovrsi",
      korak: 600,
      zatvoren: true,
      tekst:
        "Motor dizala iz mreže uzme 9000 J, a ormar dobije 7200 J potencijalne energije. Povuci stupac gubitaka.",
      vrste: [
        {
          id: "E",
          oznaka: "E_{el}",
          naziv: "iz mreže (uloženo)",
          boja: "ljubicasta",
        },
        { id: "Ep", oznaka: "E_{gp}", naziv: "ormar (korisno)", boja: "plava" },
        {
          id: "Q",
          oznaka: "Q",
          naziv: "gubici (toplina, trenje)",
          boja: "narancasta",
        },
      ],
      stanja: [
        { oznaka: "uloženo", vrijednosti: { E: 9000 } },
        {
          oznaka: "kamo ode",
          vrijednosti: { Ep: 7200, Q: 1800 },
          pitanje: true,
          zadano: ["Ep"],
        },
      ],
      korisnost: { korisno: "Ep", ulozeno: "E" },
    },
    {
      tip: "energija_stupci",
      nacin: "prikaz",
      zatvoren: true,
      tekst: "Vagoni se spoje: kinetička energija prije i poslije sudara.",
      vrste: [
        { id: "Ek", oznaka: "E_k", naziv: "kinetička", boja: "crvena" },
        {
          id: "Q",
          oznaka: "Q",
          naziv: "toplina, zvuk, deformacija",
          boja: "narancasta",
        },
      ],
      stanja: [
        { oznaka: "prije sudara", vrijednosti: { Ek: 16000, Q: 0 } },
        { oznaka: "poslije sudara", vrijednosti: { Ek: 6400, Q: 9600 } },
      ],
    },
    {
      tip: "energija_stupci",
      nacin: "prikaz",
      tekst:
        "Puška i metak imaju jednake količine gibanja, ali ne i kinetičke energije.",
      vrste: [
        { id: "metak", oznaka: "E_{k}", naziv: "metak", boja: "crvena" },
        { id: "puska", oznaka: "E_{k}", naziv: "puška", boja: "plava" },
      ],
      stanja: [
        { oznaka: "nakon pucnja", vrijednosti: { metak: 1800, puska: 4.5 } },
      ],
    },
    {
      tip: "energija_stupci",
      nacin: "dovrsi",
      korak: 50,
      zatvoren: true,
      slozeno: true,
      tekst:
        "Plinu je dovedeno 800 J topline, a plin je obavio rad 300 J. Povuci gornji dio stupca: koliko je porasla unutarnja energija?",
      vrste: [
        { id: "Q", oznaka: "Q", naziv: "dovedena toplina", boja: "narancasta" },
        { id: "W", oznaka: "W", naziv: "rad plina", boja: "zelena" },
        {
          id: "dU",
          oznaka: "\\Delta U",
          naziv: "promjena unutarnje energije",
          boja: "crvena",
        },
      ],
      stanja: [
        { oznaka: "dovedeno", vrijednosti: { Q: 800 } },
        {
          oznaka: "kamo ode",
          vrijednosti: { W: 300, dU: 500 },
          pitanje: true,
          zadano: ["W"],
        },
      ],
    },
    {
      tip: "energija_stupci",
      nacin: "dovrsi",
      korak: 100,
      zatvoren: true,
      slozeno: true,
      tekst:
        "Stroj u ciklusu obavi rad 800 J i preda hladnom spremniku 1200 J. Povuci stupac topline iz toplog spremnika.",
      vrste: [
        {
          id: "Qt",
          oznaka: "Q_t",
          naziv: "iz toplog spremnika",
          boja: "crvena",
        },
        { id: "W", oznaka: "W", naziv: "rad", boja: "zelena" },
        { id: "Qh", oznaka: "Q_h", naziv: "u hladni spremnik", boja: "plava" },
      ],
      stanja: [
        { oznaka: "primljeno", vrijednosti: { Qt: 2000 }, pitanje: true },
        { oznaka: "predano", vrijednosti: { W: 800, Qh: 1200 } },
      ],
      korisnost: { korisno: "W", ulozeno: "Qt" },
    },
    {
      tip: "energija_stupci",
      nacin: "prikaz",
      zatvoren: true,
      slozeno: true,
      tekst:
        "Grijač preda 68 400 J: većinu dobije voda, a dio aluminijska posuda.",
      vrste: [
        { id: "E", oznaka: "E_{el}", naziv: "grijač", boja: "ljubicasta" },
        { id: "Qv", oznaka: "Q_v", naziv: "voda", boja: "plava" },
        { id: "Qp", oznaka: "Q_p", naziv: "posuda", boja: "siva" },
      ],
      stanja: [
        { oznaka: "grijač daje", vrijednosti: { E: 68400 } },
        { oznaka: "primaju", vrijednosti: { Qv: 63000, Qp: 5400 } },
      ],
    },
    {
      tip: "energija_stupci",
      nacin: "istrazi",
      tekst:
        "Pusti kuglicu i povlači klizač položaja. Promijeni visinu i masu: što se događa s brzinom pri tlu?",
      scena: { vrsta: "pad", m: 0.2, h: 1.8, g: 10 },
      klizaci: [
        { id: "h", min: 0.5, max: 5, korak: 0.1 },
        { id: "m", min: 0.1, max: 1, korak: 0.1 },
      ],
    },
    {
      tip: "energija_stupci",
      nacin: "istrazi",
      tekst:
        "Pusti kuglicu da padne i odbije se. Pomiči klizač položaja i gledaj kamo ode dio energije pri udaru.",
      scena: { vrsta: "odskok", m: 0.2, h: 1.8, odskok_do: 1.3, g: 10 },
    },
    {
      tip: "energija_stupci",
      nacin: "istrazi",
      tekst:
        "Pusti dijete niz strmi pa niz blagi tobogan iste visine. Promijeni i masu: ovisi li brzina u dnu o obliku ili masi?",
      scena: { vrsta: "tobogan", m: 30, h: 3.2, g: 10 },
      klizaci: [{ id: "m", min: 20, max: 80, korak: 5 }],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    need(
      NACINI.includes(s.nacin),
      `energija_stupci.nacin mora biti ${NACINI.join(", ")}`,
    );
    need(isText(s.tekst), "energija_stupci treba „tekst“");
    if (s.jedinica != null)
      need(
        isText(s.jedinica) && s.jedinica.length <= 6,
        "jedinica mora biti kratak tekst (npr. J, kJ)",
      );
    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      for (const f of [
        "vrste",
        "stanja",
        "pitanje",
        "korisnost",
        "poruke",
        "slozeno",
        "zatvoren",
      ])
        need(
          !(f in s),
          `istrazi crta svoje stupce (E_gp, E_k, toplina): makni „${f}“`,
        );
      const sc = s.scena;
      if (
        !need(
          sc && SCENE.includes(sc.vrsta),
          `istrazi treba scena: {vrsta: ${SCENE.join(" | ")}, m, h}`,
        )
      )
        return list;
      need(
        isNum(sc.m) && sc.m > 0 && sc.m <= 1e5,
        "scena.m mora biti masa u kg (> 0)",
      );
      need(
        isNum(sc.h) && sc.h > 0 && sc.h <= 1000,
        "scena.h mora biti visina u m (0 < h ≤ 1000)",
      );
      if (sc.g != null)
        need(
          isNum(sc.g) && sc.g > 0 && sc.g <= 30,
          "scena.g mora biti broj (npr. 9,81 ili 10)",
        );
      if (sc.vrsta === "odskok")
        need(
          isNum(sc.odskok_do) && sc.odskok_do > 0 && sc.odskok_do < sc.h,
          "odskok treba odskok_do između 0 i h",
        );
      else need(sc.odskok_do == null, "odskok_do postoji samo uz vrsta odskok");
      if (
        s.klizaci != null &&
        need(
          Array.isArray(s.klizaci) &&
            s.klizaci.length >= 1 &&
            s.klizaci.length <= 2,
          "klizaci mora biti popis 1–2 klizača (h, m)",
        )
      ) {
        const ids = [];
        s.klizaci.forEach((k, i) => {
          const at = `klizaci[${i}]`;
          if (
            !need(
              k?.id === "h" || k?.id === "m",
              `${at}.id mora biti "h" ili "m"`,
            )
          )
            return;
          ids.push(k.id);
          if (
            !need(
              [k.min, k.max, k.korak].every(isNum) &&
                k.min > 0 &&
                k.max > k.min &&
                k.korak > 0,
              `${at} treba brojeve 0 < min < max i korak > 0`,
            )
          )
            return;
          need(
            (k.max - k.min) / k.korak <= 400,
            `${at} ima previše koraka (najviše 400)`,
          );
          const cur = sc[k.id];
          need(
            isNum(cur) && cur >= k.min - EPS && cur <= k.max + EPS,
            `${at}: scena.${k.id} mora biti između min i max`,
          );
          if (k.id === "h" && sc.vrsta === "odskok")
            need(
              isNum(sc.odskok_do) && sc.odskok_do < k.min,
              `${at}: najmanja visina mora biti veća od odskok_do`,
            );
        });
        need(
          new Set(ids).size === ids.length,
          "id-jevi klizača moraju biti različiti",
        );
      }
      return list;
    }
    need(
      s.scena == null && s.klizaci == null,
      "scena i klizaci postoje samo u načinu istrazi",
    );

    const ids = [];
    if (
      !need(
        Array.isArray(s.vrste) && s.vrste.length >= 1 && s.vrste.length <= 5,
        "energija_stupci treba vrste: 1–5 vrsta energije",
      )
    )
      return list;
    s.vrste.forEach((v, i) => {
      const at = `vrste[${i}]`;
      need(
        ID.test(v?.id ?? ""),
        `${at}.id mora biti ime bez razmaka (npr. "Ep")`,
      );
      ids.push(v?.id);
      need(
        isText(v?.oznaka) && v.oznaka.length <= 16 && !v.oznaka.includes("$"),
        `${at}.oznaka mora biti kratka oznaka bez $ (npr. "E_k", "\\\\Delta U")`,
      );
      if (v?.naziv != null)
        need(
          isText(v.naziv) && v.naziv.length <= 40,
          `${at}.naziv mora biti kratak tekst`,
        );
      if (v?.boja != null)
        need(
          ENERGIJA_BOJE.includes(v.boja),
          `${at}.boja mora biti jedna od: ${ENERGIJA_BOJE.join(", ")}`,
        );
    });
    need(
      new Set(ids).size === ids.length,
      "id-jevi vrsta moraju biti različiti",
    );
    if (
      !need(
        Array.isArray(s.stanja) && s.stanja.length >= 1 && s.stanja.length <= 4,
        "energija_stupci treba stanja: 1–4 stanja",
      )
    )
      return list;
    let ok = true;
    s.stanja.forEach((st, i) => {
      const at = `stanja[${i}]`;
      need(
        isText(st?.oznaka) && st.oznaka.length <= 28,
        `${at}.oznaka mora biti kratak tekst (do 28 znakova)`,
      );
      const v = st?.vrijednosti;
      if (
        !(ok =
          need(
            v &&
              typeof v === "object" &&
              !Array.isArray(v) &&
              Object.keys(v).length >= 1,
            `${at}.vrijednosti mora biti {id: broj} s barem jednom vrstom`,
          ) && ok)
      )
        return;
      for (const [id, x] of Object.entries(v)) {
        ok =
          need(
            ids.includes(id),
            `${at}.vrijednosti: nepoznata vrsta „${id}“`,
          ) && ok;
        ok = need(isNum(x), `${at}.vrijednosti.${id} mora biti broj`) && ok;
        if (s.slozeno && isNum(x))
          ok =
            need(
              x >= 0,
              `${at}.vrijednosti.${id}: složeni stupac ne može imati negativan dio`,
            ) && ok;
      }
      if (st.pitanje != null)
        need(st.pitanje === true, `${at}.pitanje je true ili ga nema`);
      if (st.zadano != null) {
        need(st.pitanje === true, `${at}.zadano postoji samo u pitanom stanju`);
        need(
          Array.isArray(st.zadano) && st.zadano.every((id) => id in v),
          `${at}.zadano mora biti popis vrsta iz tog stanja`,
        );
      }
    });
    if (!ok) return list;
    if (s.slozeno != null)
      need(typeof s.slozeno === "boolean", "slozeno je true ili false");
    if (s.zatvoren != null)
      need(typeof s.zatvoren === "boolean", "zatvoren je true ili false");
    const korak = energijaKorak(s);
    if (s.korak != null)
      need(isNum(s.korak) && s.korak > 0, "korak mora biti pozitivan broj");
    const vrh = Math.max(...vrhovi(s).map(Math.abs), EPS);
    if (korak > 0)
      need(
        vrh / korak <= 40,
        `korak ${formatNumber(korak)} je premalen za stupce do ${formatNumber(vrh)} (najviše 40 koraka mreže)`,
      );
    if (s.zatvoren && s.stanja.length >= 2) {
      const z = s.stanja.map(zbroj);
      need(
        z.every(
          (x) => Math.abs(x - z[0]) <= Math.max(EPS, Math.abs(z[0]) * 0.005),
        ),
        `zatvoren: ukupna energija mora biti ista u svim stanjima, a zbrojevi su ${z.map((x) => formatNumber(x)).join(", ")}`,
      );
    }
    if (s.zatvoren)
      need(s.stanja.length >= 2, "zatvoren ima smisla tek uz barem dva stanja");
    if (s.korisnost != null) {
      const k = s.korisnost;
      if (
        need(
          k &&
            ids.includes(k.korisno) &&
            ids.includes(k.ulozeno) &&
            k.korisno !== k.ulozeno,
          "korisnost: {korisno: id, ulozeno: id} – dvije različite vrste",
        )
      ) {
        for (const id of [k.korisno, k.ulozeno]) {
          const n = s.stanja.filter(
            (st) =>
              isNum(st.vrijednosti[id]) && Math.abs(st.vrijednosti[id]) > EPS,
          ).length;
          need(
            n === 1,
            `korisnost: vrsta „${id}“ mora imati vrijednost (≠ 0) u točno jednom stanju`,
          );
        }
        const eta = energijaKorisnost(s);
        need(
          eta != null && eta >= 0 && eta <= 1 + EPS,
          "korisnost mora biti između 0 i 100 % (uloženo > 0, korisno ≤ uloženo)",
        );
      }
    }
    if (s.poruke != null) {
      if (
        need(
          typeof s.poruke === "object" && !Array.isArray(s.poruke),
          "poruke mora biti {id: poruka}",
        )
      )
        for (const [id, p] of Object.entries(s.poruke)) {
          need(ids.includes(id), `poruke: nepoznata vrsta „${id}“`);
          need(isText(p), `poruke.${id} mora biti tekst`);
        }
    }
    const pitana = s.stanja.filter((st) => st.pitanje === true).length;
    if (s.nacin === "prikaz") {
      noAnswerFields(s, need);
      need(
        pitana === 0,
        "prikaz je za gledanje: nijedno stanje ne smije imati pitanje",
      );
      need(s.poruke == null, "poruke postoje samo u načinu dovrsi");
    }
    if (s.nacin === "dovrsi") {
      if (
        !need(pitana === 1, "dovrsi treba točno jedno stanje s pitanje: true")
      )
        return list;
      const st = s.stanja[pitanoStanje(s)];
      const vuku = vuceSe(s);
      need(
        vuku.length >= 1,
        "u pitanom stanju mora ostati barem jedan stupac za vući (nije sve u zadano)",
      );
      need(
        vuku.some((id) => Math.abs(st.vrijednosti[id]) > EPS),
        "barem jedan stupac za vući mora biti različit od 0 (stupci kreću od 0, pa bi bez vučenja bilo točno)",
      );
      for (const id of vuku)
        need(
          aligned(st.vrijednosti[id], korak),
          `vrijednost ${id} = ${formatNumber(st.vrijednosti[id])} nije višekratnik koraka ${formatNumber(korak)}: učenik je ne može točno namjestiti`,
        );
    }
    return list;
  },

  // odgovor: {id: vrijednost} za stupce koje učenik vuče
  check(s, odgovor) {
    const i = pitanoStanje(s);
    const st = s.stanja[i];
    const vuku = vuceSe(s);
    const korak = energijaKorak(s);
    const tol = korak / 2 + EPS * Math.max(1, korak);
    const o = odgovor && typeof odgovor === "object" ? odgovor : {};
    const x = (id) => (isNum(o[id]) ? o[id] : 0);
    const t = (id) => st.vrijednosti[id];
    if (vuku.every((id) => x(id) === 0))
      return {
        tocno: false,
        poruka: "Povuci stupce stanja „" + st.oznaka + "“ na pravu visinu.",
        prazno: true,
      };
    const krivi = vuku.filter((id) => Math.abs(x(id) - t(id)) > tol);
    if (!krivi.length) return { tocno: true };
    const J = s.jedinica ?? "J";
    const ukupno = energijaUkupno(s);
    if (ukupno != null) {
      const S = clean(
        Object.keys(st.vrijednosti).reduce(
          (a, id) => a + (vuku.includes(id) ? x(id) : t(id)),
          0,
        ),
      );
      if (Math.abs(S - ukupno) > tol)
        return {
          tocno: false,
          poruka: `Ukupna energija se ne mijenja: zbroj stupaca u stanju „${st.oznaka}“ mora biti ${withUnit(ukupno, J)}, a sad je ${withUnit(S, J)}.`,
        };
    }
    for (const a of krivi)
      for (const b of krivi) {
        if (
          a < b &&
          Math.abs(x(a) - t(b)) <= tol &&
          Math.abs(x(b) - t(a)) <= tol
        )
          return {
            tocno: false,
            poruka: `Zamijenio si ${oznakaTex(s, a)} i ${oznakaTex(s, b)}.`,
          };
      }
    const id = krivi[0];
    if (s.poruke?.[id]) return { tocno: false, poruka: s.poruke[id] };
    if (Math.abs(t(id)) <= EPS)
      return {
        tocno: false,
        poruka: `Stupac ${naziv(s, id)} u stanju „${st.oznaka}“ mora biti 0.`,
      };
    if (Math.abs(x(id)) <= EPS)
      return {
        tocno: false,
        poruka: `Stupac ${naziv(s, id)} u stanju „${st.oznaka}“ nije 0: povuci i njega.`,
      };
    return {
      tocno: false,
      poruka: `Stupac ${naziv(s, id)} je ${x(id) > t(id) ? "previsok" : "prenizak"}.`,
    };
  },
  tocanOdgovor(s) {
    const st = s.stanja?.[pitanoStanje(s)];
    if (!st) return "";
    const J = s.jedinica ?? "J";
    return vuceSe(s)
      .map((id) => `${oznakaTex(s, id)} = ${withUnit(st.vrijednosti[id], J)}`)
      .join(", ");
  },
  brojcaniOdgovor(s) {
    if (s.nacin !== "dovrsi") return null;
    const v = vuceSe(s);
    return v.length === 1 ? s.stanja[pitanoStanje(s)].vrijednosti[v[0]] : null;
  },
};
