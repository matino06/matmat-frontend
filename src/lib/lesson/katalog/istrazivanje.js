// Widgeti s crtežom koji se može istraživati ili koristiti kao zadatak: klizač, mjerni instrument, mreža
// kvadratića, graf, pretvorba jedinica, čestice i tijelo u tekućini. Gdje god se može, točan odgovor računa
// kod iz parametara (ne model), a krive vrijednosti tipičnih grešaka dodaju se automatski.
import { compile } from "../core/expr.js";
import { isNum, tolerance, near, formatNumber } from "../core/number.js";
import { UNITS, normUnit, typicalMistakes, staircase, unitIndex, toBase, fromBase } from "../core/units.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, validateKrivo, checkNumber, withUnit, KRIVO_OPIS } from "./zajednicko.js";

const ID = /^[A-Za-z_][A-Za-z_0-9]*$/;
const NACIN_ISTRAZI = `nacin "istrazi" je korak za gledanje: učenik se igra, ništa se ne provjerava i nema polja s odgovorom`;

// ── klizač ────────────────────────────────────────────────────────────────────────────────────────
export const klizac = {
  tip: "klizac",
  uloga: () => POGLEDAJ,
  istrazi: () => true,
  opis: `Istraživanje (nije zadatak): klizači i rezultat koji se računa uživo. Polja: tekst, klizaci: [{id (npr. "m"), oznaka (npr. "masa m"),
min, max, korak, pocetak, jedinica?}] (1–3), izrazi: [{oznaka (markdown, npr. "$\\\\rho$"), izraz (npr. "m/V", varijable su id-jevi klizača; + - * / ^ sqrt),
jedinica?, decimale?}] (1–2).`,
  primjer: {
    tip: "klizac",
    tekst: "Mijenjaj masu i volumen i gledaj gustoću.",
    klizaci: [
      { id: "m", oznaka: "masa $m$", min: 20, max: 200, korak: 10, pocetak: 60, jedinica: "g" },
      { id: "V", oznaka: "volumen $V$", min: 10, max: 100, korak: 10, pocetak: 40, jedinica: "cm³" },
    ],
    izrazi: [{ oznaka: "gustoća $\\rho = m/V$", izraz: "m/V", jedinica: "g/cm³", decimale: 2 }],
  },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "klizac treba „tekst“ (što učenik istražuje)");
    noAnswerFields(s, need);
    const ids = [];
    if (need(Array.isArray(s.klizaci) && s.klizaci.length >= 1 && s.klizaci.length <= 3, "klizac treba 1–3 klizača")) {
      s.klizaci.forEach((k, i) => {
        need(ID.test(k?.id ?? ""), `klizaci[${i}].id mora biti ime varijable (slova, bez razmaka)`);
        ids.push(k?.id);
        const ok = need([k?.min, k?.max, k?.korak, k?.pocetak].every(isNum), `klizaci[${i}] treba brojeve min, max, korak, pocetak`);
        if (ok) {
          need(k.max > k.min && k.korak > 0, `klizaci[${i}]: mora biti min < max i korak > 0`);
          need(k.pocetak >= k.min && k.pocetak <= k.max, `klizaci[${i}].pocetak mora biti između min i max`);
          need((k.max - k.min) / k.korak <= 1000, `klizaci[${i}] ima previše koraka (najviše 1000)`);
        }
      });
      need(new Set(ids).size === ids.length, "id-jevi klizača moraju biti različiti");
    }
    if (need(Array.isArray(s.izrazi) && s.izrazi.length >= 1 && s.izrazi.length <= 2, "klizac treba 1–2 izraza")) {
      s.izrazi.forEach((iz, i) => {
        try {
          const c = compile(iz?.izraz);
          const unknown = c.vars.filter((v) => !ids.includes(v));
          need(!unknown.length, `izrazi[${i}] koristi nepoznate varijable: ${unknown.join(", ")}`);
        } catch (e) {
          need(false, `izrazi[${i}].izraz: ${e.message}`);
        }
      });
    }
    return list;
  },
};

// ── mjerni instrument ─────────────────────────────────────────────────────────────────────────────
const INSTRUMENTI = { ravnalo: 64, menzura: 36, vaga: 90, termometar: 60 };

export const mjerilo = {
  tip: "mjerilo",
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Mjerni instrument: instrument ("ravnalo" | "menzura" | "vaga" | "termometar"), od, do, razmak (vrijednost jednog podjeljka),
oznaka_svakih (svakih koliko je broj na ljestvici), jedinica, tekst, nacin:
- "procitaj": učenik očita prikazanu vrijednost (vrijednost = što instrument pokazuje; mora biti na crtici); ${KRIVO_OPIS} (pogreška od jednog podjeljka dodaje se sama)
- "postavi": učenik povuče razinu/kazaljku na vrijednost (vrijednost = cilj);
- "istrazi": ${NACIN_ISTRAZI}; vrijednost = početak; za menzuru po želji uranjanje: {nakon, gumb} (gumb npr. "Uroni kamen").
Pazi: (do − od)/razmak cijeli broj i najviše ${Object.entries(INSTRUMENTI).map(([k, v]) => `${k} ${v}`).join(", ")} podjeljaka.`,
  primjer: { tip: "mjerilo", nacin: "procitaj", instrument: "menzura", od: 0, do: 300, razmak: 20, oznaka_svakih: 100, jedinica: "mL", vrijednost: 140, tekst: "Očitaj volumen vode u menzuri." },
  validate(s) {
    const { list, need } = problems();
    need(["istrazi", "procitaj", "postavi"].includes(s.nacin), "mjerilo.nacin mora biti istrazi, procitaj ili postavi");
    if (!need(s.instrument in INSTRUMENTI, `mjerilo.instrument mora biti jedan od: ${Object.keys(INSTRUMENTI).join(", ")}`)) return list;
    if (!need([s.od, s.do, s.razmak, s.vrijednost].every(isNum), "mjerilo treba brojeve od, do, razmak i vrijednost")) return list;
    need(isText(s.tekst), "mjerilo treba „tekst“");
    const n = (s.do - s.od) / s.razmak;
    need(s.do > s.od && s.razmak > 0, "mjerilo: mora biti od < do i razmak > 0");
    need(Math.abs(n - Math.round(n)) < 1e-6, `od ${s.od} do ${s.do} s razmakom ${s.razmak} nije cijeli broj podjeljaka`);
    need(n <= INSTRUMENTI[s.instrument], `${formatNumber(n)} podjeljaka je previše za ${s.instrument} (najviše ${INSTRUMENTI[s.instrument]}); povećaj razmak ili smanji raspon`);
    if (s.oznaka_svakih != null) need(isNum(s.oznaka_svakih) && aligned(s.oznaka_svakih, s.razmak), "oznaka_svakih mora biti višekratnik razmaka");
    need(s.vrijednost >= s.od && s.vrijednost <= s.do, "vrijednost mora biti na ljestvici (između od i do)");
    if (s.nacin !== "istrazi") need(aligned(s.vrijednost - s.od, s.razmak), "vrijednost mora biti točno na crtici (višekratnik razmaka od početka), inače se ne može pouzdano očitati");
    if (s.uranjanje != null) {
      need(s.nacin === "istrazi" && s.instrument === "menzura", "uranjanje postoji samo za menzuru u načinu istrazi");
      need(isNum(s.uranjanje?.nakon) && s.uranjanje.nakon > s.vrijednost && s.uranjanje.nakon <= s.do, "uranjanje.nakon mora biti veće od vrijednosti i na ljestvici");
      need(isText(s.uranjanje?.gumb), "uranjanje treba tekst gumba (npr. „Uroni kamen“)");
    }
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    else validateKrivo(s.krivo, s.vrijednost, mjeriloTol(s), need);
    return list;
  },
  check(s, input) {
    if (s.nacin === "postavi") {
      if (!isNum(input)) return { tocno: false, poruka: "Povuci na vrijednost.", prazno: true };
      if (near(input, s.vrijednost, mjeriloTol(s))) return { tocno: true };
      return { tocno: false, poruka: offByDivisions(input, s) };
    }
    const auto = [s.vrijednost + s.razmak, s.vrijednost - s.razmak].filter((v) => v >= s.od && v <= s.do).map((v) => ({ vrijednost: v, poruka: `${withUnit(v, s.jedinica)} je jedan podjeljak ${v > s.vrijednost ? "previše" : "premalo"}. Kreni od najbliže označene crte i broji razmake od po ${withUnit(s.razmak, s.jedinica)}.` }));
    return checkNumber({ input, answer: s.vrijednost, tol: mjeriloTol(s), unit: s.jedinica, krivo: [...(s.krivo ?? []), ...auto], savjet: s.savjet || `Jedan podjeljak vrijedi ${withUnit(s.razmak, s.jedinica)}. Kreni od najbliže označene crte.` });
  },
  tocanOdgovor: (s) => withUnit(s.vrijednost, s.jedinica),
  brojcaniOdgovor: (s) => (s.nacin === "istrazi" ? null : s.vrijednost),
};

const aligned = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-6;
const mjeriloTol = (s) => (isNum(s.tolerancija) ? s.tolerancija : s.razmak * 0.25);
function offByDivisions(v, s) {
  const d = Math.round((v - s.vrijednost) / s.razmak);
  if (d === 0) return "Gotovo! Pomakni još malo.";
  return `Pokazuje ${withUnit(v, s.jedinica)}, a treba ${withUnit(s.vrijednost, s.jedinica)}: ${Math.abs(d)} ${Math.abs(d) === 1 ? "podjeljak" : "podjeljka"} ${d > 0 ? "previše" : "premalo"}.`;
}

// ── mreža kvadratića ──────────────────────────────────────────────────────────────────────────────
const cellKey = ([r, c]) => `${r},${c}`;

export const mreza = {
  tip: "mreza",
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Mreža kvadratića: redaka, stupaca (najviše 20×20), velicina (stranica kvadratića), jedinica ("mm" | "cm" | "dm" | "m"), tekst, nacin:
- "istrazi": ${NACIN_ISTRAZI}; učenik dodirom označava kvadratiće i vidi površinu; oznacene? = unaprijed označeni [[redak, stupac], …] (od 0);
- "prebroji": na mreži je lik od oznacene (cijeli kvadratići) i polovice ([[r,c]] polovični kvadratići na rubu); učenik upiše površinu u jedinica².
  Točan odgovor računa aplikacija: (cijeli + polovice/2) · velicina². Krive vrijednosti „polovice kao cijeli“ i „polovice izostavljene“ dodaju se same;
- "oznaci": učenik označi kvadratiće ukupne površine cilj (u jedinica²).`,
  primjer: { tip: "mreza", nacin: "prebroji", redaka: 6, stupaca: 8, velicina: 1, jedinica: "cm", oznacene: [[1, 2], [1, 3], [2, 2], [2, 3], [2, 4]], polovice: [[1, 4], [3, 3]], tekst: "Kolika je površina otiska?" },
  validate(s) {
    const { list, need } = problems();
    need(["istrazi", "prebroji", "oznaci"].includes(s.nacin), "mreza.nacin mora biti istrazi, prebroji ili oznaci");
    const dims = need(Number.isInteger(s.redaka) && Number.isInteger(s.stupaca) && s.redaka >= 1 && s.stupaca >= 1 && s.redaka <= 20 && s.stupaca <= 20, "mreza treba cijele brojeve redaka i stupaca (1–20)");
    need(isNum(s.velicina) && s.velicina > 0, "mreza.velicina mora biti pozitivan broj");
    need(["mm", "cm", "dm", "m"].includes(s.jedinica), "mreza.jedinica mora biti mm, cm, dm ili m");
    need(isText(s.tekst), "mreza treba „tekst“");
    const cells = (name) => {
      const v = s[name];
      if (v == null) return [];
      if (!need(Array.isArray(v) && v.every((c) => Array.isArray(c) && c.length === 2 && c.every(Number.isInteger)), `${name} mora biti popis [redak, stupac]`)) return [];
      if (dims) need(v.every(([r, c]) => r >= 0 && c >= 0 && r < s.redaka && c < s.stupaca), `${name}: kvadratić izvan mreže`);
      return v.map(cellKey);
    };
    const full = cells("oznacene");
    const half = cells("polovice");
    need(new Set([...full, ...half]).size === full.length + half.length, "isti kvadratić je i cijeli i polovica (ili se ponavlja)");
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.nacin === "prebroji") {
      need(full.length + half.length > 0, "mreza prebroji treba lik: oznacene i/ili polovice");
      validateKrivo(s.krivo, mrezaAnswer(s), tolerance(mrezaAnswer(s)), need);
    }
    if (s.nacin === "oznaci") {
      if (need(isNum(s.cilj) && s.cilj > 0, "mreza oznaci treba cilj (površinu)")) {
        const n = s.cilj / (s.velicina * s.velicina);
        need(Math.abs(n - Math.round(n)) < 1e-6, "cilj mora biti cijeli broj kvadratića");
        if (dims) need(n <= s.redaka * s.stupaca, "cilj je veći od cijele mreže");
      }
    }
    return list;
  },
  // prebroji: upisani broj; oznaci: broj označenih kvadratića
  check(s, input) {
    const unit = `${s.jedinica}²`;
    if (s.nacin === "oznaci") {
      if (!isNum(input) || input === 0) return { tocno: false, poruka: "Označi kvadratiće dodirom.", prazno: true };
      const area = input * s.velicina * s.velicina;
      if (near(area, s.cilj, 1e-9)) return { tocno: true };
      return { tocno: false, poruka: `Označeno je ${withUnit(area, unit)}, a treba ${withUnit(s.cilj, unit)}.` };
    }
    const nf = (s.oznacene ?? []).length;
    const nh = (s.polovice ?? []).length;
    const a = s.velicina * s.velicina;
    const auto = nh
      ? [
          { vrijednost: (nf + nh) * a, poruka: "Polovice si brojao kao cijele kvadratiće. Dvije polovice zajedno čine jedan kvadratić." },
          { vrijednost: nf * a, poruka: "Polovice si izostavio. I one pokrivaju dio plohe: dvije polovice čine jedan kvadratić." },
        ]
      : [];
    return checkNumber({ input, answer: mrezaAnswer(s), unit, krivo: [...(s.krivo ?? []), ...auto], savjet: s.savjet || `Prebroji cijele kvadratiće, dodaj polovice (dvije čine jedan) i pomnoži površinom jednog kvadratića (${withUnit(a, unit)}).` });
  },
  tocanOdgovor: (s) => (s.nacin === "oznaci" ? withUnit(s.cilj, `${s.jedinica}²`) : withUnit(mrezaAnswer(s), `${s.jedinica}²`)),
  brojcaniOdgovor: (s) => (s.nacin === "oznaci" ? s.cilj : s.nacin === "prebroji" ? mrezaAnswer(s) : null),
};

const mrezaAnswer = (s) => ((s.oznacene ?? []).length + (s.polovice ?? []).length / 2) * s.velicina * s.velicina;

// ── graf ──────────────────────────────────────────────────────────────────────────────────────────
export const ocitaj_graf = {
  tip: "ocitaj_graf",
  uloga: (s) => (s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "prikaz",
  opis: `Graf funkcija u koordinatnom sustavu: x: [od, do], y: [od, do], os_x, os_y (npr. "V (cm³)"), funkcije: [{izraz (u varijabli x, npr. "2.4*x"), oznaka}] (1–3),
tocke?: [{x, y, oznaka}] (istaknute točke), tekst, nacin:
- "prikaz": korak za gledanje (dodirom se vide vrijednosti), bez odgovora;
- "ocitaj": učenik očita vrijednost: ocitaj: {oznaka: oznaka funkcije, x} (traži y) ili {oznaka, y} (traži x); jedinica?.
  Točan odgovor računa aplikacija iz funkcije; krive vrijednosti „s druge funkcije“ i „s druge osi“ dodaju se same. Vrijednost neka je na crtici mreže.`,
  primjer: { tip: "ocitaj_graf", nacin: "ocitaj", x: [0, 60], y: [0, 150], os_x: "V (cm³)", os_y: "m (g)", funkcije: [{ izraz: "2.4*x", oznaka: "A" }, { izraz: "0.8*x", oznaka: "B" }], ocitaj: { oznaka: "A", x: 20 }, jedinica: "g", tekst: "Kolika je masa uzorka A volumena 20 cm³?" },
  validate(s) {
    const { list, need } = problems();
    need(["prikaz", "ocitaj"].includes(s.nacin), "ocitaj_graf.nacin mora biti prikaz ili ocitaj");
    const axesOk = need(Array.isArray(s.x) && Array.isArray(s.y) && s.x.length === 2 && s.y.length === 2 && [...s.x, ...s.y].every(isNum) && s.x[1] > s.x[0] && s.y[1] > s.y[0], "ocitaj_graf treba x i y kao [od, do] uz od < do");
    need(isText(s.tekst), "ocitaj_graf treba „tekst“");
    const fns = {};
    if (need(Array.isArray(s.funkcije) && s.funkcije.length >= 1 && s.funkcije.length <= 3, "ocitaj_graf treba 1–3 funkcije")) {
      s.funkcije.forEach((fn, i) => {
        try {
          const c = compile(fn?.izraz);
          need(c.vars.every((v) => v === "x"), `funkcije[${i}] smije koristiti samo varijablu x`);
          fns[fn?.oznaka ?? `f${i}`] = (x) => c.fn({ x });
        } catch (e) {
          need(false, `funkcije[${i}].izraz: ${e.message}`);
        }
      });
    }
    if (s.nacin === "prikaz") noAnswerFields(s, need);
    if (s.nacin === "ocitaj" && axesOk) {
      const q = s.ocitaj;
      if (need(q && fns[q.oznaka], "ocitaj.oznaka mora biti oznaka jedne od funkcija")) {
        const a = grafAnswer(s, fns);
        need(isNum(a), "vrijednost za očitati nije na grafu (izvan raspona osi)");
        validateKrivo(s.krivo, a, grafTol(s), need);
      }
    }
    return list;
  },
  check(s, input) {
    const fns = graphFns(s);
    const answer = grafAnswer(s, fns);
    const q = s.ocitaj;
    const auto = [];
    for (const fn of s.funkcije) {
      if (fn.oznaka === q.oznaka) continue;
      const other = grafAnswer({ ...s, ocitaj: { ...q, oznaka: fn.oznaka } }, fns);
      if (isNum(other)) auto.push({ vrijednost: other, poruka: `To je vrijednost s grafa ${fn.oznaka}, a traži se graf ${q.oznaka}.` });
    }
    const given = "x" in q ? q.x : q.y;
    auto.push({ vrijednost: given, poruka: `Pročitao si vrijednost na krivoj osi. Kreni od ${"x" in q ? s.os_x : s.os_y} = ${formatNumber(given)} do grafa, pa očitaj na drugoj osi.` });
    return checkNumber({ input, answer, tol: grafTol(s), unit: s.jedinica, krivo: [...(s.krivo ?? []), ...auto], savjet: s.savjet || "Dodirni graf na zadanoj vrijednosti i prati crtu do druge osi." });
  },
  tocanOdgovor: (s) => withUnit(grafAnswer(s, graphFns(s)), s.jedinica),
  brojcaniOdgovor: (s) => (s.nacin === "ocitaj" ? grafAnswer(s, graphFns(s)) : null),
};

// oznaka → f(x); izrazi su već provjereni validatorom
export function graphFns(s) {
  return Object.fromEntries(
    s.funkcije.map((fn) => {
      const c = compile(fn.izraz);
      return [fn.oznaka, (x) => c.fn({ x })];
    }),
  );
}

const grafTol = (s) => (isNum(s.tolerancija) ? s.tolerancija : ("x" in (s.ocitaj ?? {}) ? s.y[1] - s.y[0] : s.x[1] - s.x[0]) * 0.02);

function grafAnswer(s, fns) {
  const q = s.ocitaj;
  const f = fns[q.oznaka];
  if ("x" in q) {
    const y = f(q.x);
    return q.x >= s.x[0] && q.x <= s.x[1] && y >= s.y[0] - 1e-9 && y <= s.y[1] + 1e-9 ? y : null;
  }
  // x za zadani y: bisekcija na rasponu osi (funkcije u lekcijama su monotone na prikazanom dijelu)
  let [a, b] = s.x;
  const g = (x) => f(x) - q.y;
  if (g(a) * g(b) > 0) return null;
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2;
    if (g(a) * g(m) <= 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

// ── pretvorba jedinica ────────────────────────────────────────────────────────────────────────────
// Jedna pretvorba („3600 mm² = [ ] cm²“), lanac („8 m = [ ] dm = [ ] cm = [ ] mm“) ili mješoviti zapis
// („2 m 7 dm = [ ] cm“). Svaki rezultat i tipične greške računa kod.
const lanac = (s) => [].concat(s.do);
const izvor = (s) => ({ vrijednosti: [].concat(s.vrijednost), jedinice: [].concat(s.od).map(normUnit) });
const zapisIzvora = (s) => {
  const { vrijednosti, jedinice } = izvor(s);
  return vrijednosti.map((v, i) => withUnit(v, jedinice[i])).join(" ");
};
// točni rezultati redom za svaku jedinicu iz „do“
export function pretvorbaRezultati(s) {
  const { vrijednosti, jedinice } = izvor(s);
  const base = toBase(s.velicina, vrijednosti, jedinice);
  return lanac(s).map((u) => fromBase(s.velicina, base, u));
}

const prepisano = (velicina, od, cilj) =>
  unitIndex(velicina, cilj) > unitIndex(velicina, od)
    ? `Prepisao si broj iz ${od}. Kad promijeniš jedinicu, mijenja se i broj: ${cilj} je manja jedinica, pa ih treba više.`
    : `Prepisao si broj iz ${od}. Kad promijeniš jedinicu, mijenja se i broj: ${cilj} je veća jedinica, pa ih treba manje.`;

// Isti iznos zapisan u drugoj jedinici (27 dm umjesto 270 cm): česta greška kad učenik stane korak prerano.
function drugeJedinice(velicina, tocno, cilj) {
  const base = toBase(velicina, tocno, cilj);
  return UNITS[velicina].filter(([u]) => u !== cilj).map(([u]) => ({ vrijednost: fromBase(velicina, base, u), poruka: `To je isti iznos u ${u}, a ovdje ga treba zapisati u ${cilj}.` }));
}

// Prompt za automatsku izradu opisuje samo osnovne veličine; fizikalne (brzina, tlak, naboj…) koriste ručno pisane
// lekcije za maturu iz fizike.
const PROMPT_VELICINE = ["duljina", "povrsina", "volumen", "masa", "vrijeme", "gustoca"];

export const pretvorba_jedinica = {
  tip: "pretvorba_jedinica",
  uloga: () => ODGOVOR,
  opis: `Pretvorba jedinica: velicina (${PROMPT_VELICINE.join(" | ")}), vrijednost, od, do (jedinice, npr. "mm²" → "cm²"), tekst?, stube? (true: prikaži stube
jedinica s faktorima – za korak pomoći, ne za prvi pokušaj). Točan rezultat i tipične greške (faktor kao za duljinu, krivi smjer) računa aplikacija.
Lanac: do je popis 2–4 jedinice ("8 m = … dm = … cm = … mm": vrijednost 8, od "m", do ["dm", "cm", "mm"]); učenik upisuje svaku.
Mješoviti zapis: vrijednost i od su popisi iste duljine, od veće jedinice prema manjoj ("2 m 7 dm": vrijednost [2, 7], od ["m", "dm"]).
Jedinice: ${PROMPT_VELICINE.map((k) => `${k}: ${UNITS[k].map(([u]) => u).join(", ")}`).join("; ")}.`,
  primjer: { tip: "pretvorba_jedinica", velicina: "povrsina", vrijednost: 3600, od: "mm²", do: "cm²", tekst: "Pretvori površinu papira u cm²." },
  validate(s) {
    const { list, need } = problems();
    if (!need(s.velicina in UNITS, `pretvorba_jedinica.velicina mora biti jedna od: ${Object.keys(UNITS).join(", ")}`)) return list;
    const names = UNITS[s.velicina].map(([u]) => u);
    const { vrijednosti, jedinice } = izvor(s);
    const cilj = lanac(s);
    if (!need([...jedinice, ...cilj].every((u) => names.includes(normUnit(u))), `jedinice od/do moraju biti iz popisa za ${s.velicina}: ${names.join(", ")}`)) return list;
    need(vrijednosti.length === jedinice.length, "kod mješovitog zapisa vrijednost i od moraju biti popisi iste duljine");
    need(vrijednosti.every(isNum), "pretvorba_jedinica treba brojčanu vrijednost");
    need(cilj.length >= 1 && cilj.length <= 4, "do je jedna jedinica ili lanac od 2–4 jedinice");
    if (jedinice.length > 1) {
      need(jedinice.length <= 3, "mješoviti zapis ima najviše 3 dijela");
      need(jedinice.every((u, i) => i === 0 || unitIndex(s.velicina, u) > unitIndex(s.velicina, jedinice[i - 1])), "mješoviti zapis ide od veće jedinice prema manjoj (2 m 7 dm)");
    }
    const sve = [jedinice.length === 1 ? jedinice[0] : null, ...cilj.map(normUnit)].filter(Boolean);
    need(new Set(sve).size === sve.length, "od i do moraju biti različite jedinice, a lanac bez ponavljanja");
    return list;
  },
  // input: broj (jedna jedinica u „do“) ili popis brojeva (lanac)
  check(s, input) {
    const cilj = lanac(s).map(normUnit);
    const tocni = pretvorbaRezultati(s);
    const unosi = cilj.length === 1 ? [Array.isArray(input) ? input[0] : input] : [].concat(input ?? []);
    const { vrijednosti, jedinice } = izvor(s);
    for (let i = 0; i < cilj.length; i++) {
      // tipične greške računaju se od prethodne karike lanca (ili od zadanog iznosa)
      const [prije, odJ] = i > 0 ? [tocni[i - 1], cilj[i - 1]] : jedinice.length === 1 ? [vrijednosti[0], jedinice[0]] : [null, null];
      const krivo = [
        ...(i === cilj.length - 1 ? (s.krivo ?? []) : []),
        ...(prije == null ? [] : typicalMistakes(s.velicina, prije, odJ, cilj[i])),
        ...(prije == null ? [] : [{ vrijednost: prije, poruka: prepisano(s.velicina, odJ, cilj[i]) }]),
        ...drugeJedinice(s.velicina, tocni[i], cilj[i]),
      ].filter((k) => Math.abs(k.vrijednost - tocni[i]) > 1e-9 * Math.max(1, Math.abs(tocni[i])));
      const r = checkNumber({ input: unosi[i] ?? "", answer: tocni[i], unit: cilj[i], krivo, savjet: s.savjet || "Pogledaj koliko je koraka između jedinica i koliki je faktor svakog koraka." });
      if (!r.tocno) return cilj.length > 1 ? { ...r, praznina: i, poruka: `${cilj[i]}: ${r.poruka}` } : r;
    }
    return { tocno: true };
  },
  brojcaniOdgovor: (s) => pretvorbaRezultati(s).at(-1),
  tocanOdgovor: (s) => [zapisIzvora(s), ...pretvorbaRezultati(s).map((v, i) => withUnit(v, normUnit(lanac(s)[i])))].join(" = "),
  stube: (s) => staircase(s.velicina, s.od, s.do),
};

// ── čestice ───────────────────────────────────────────────────────────────────────────────────────
const STANJA = ["cvrsto", "tekuce", "plin"];

export const cestice = {
  tip: "cestice",
  uloga: (s) => (s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR),
  istrazi: () => false,
  opis: `Čestični crtež: 2–4 kutije s česticama koje se gibaju kao u tvari. kutije: [{oznaka, stanje: "cvrsto" | "tekuce" | "plin", poruka?}], tekst, nacin:
- "prikaz": korak za gledanje (usporedba stanja);
- "odaberi": učenik dodirne kutiju koja odgovara pitanju; tocna = indeks kutije; poruka kutije = zašto nije ta.`,
  primjer: { tip: "cestice", nacin: "odaberi", tekst: "U kojoj su kutiji čestice tekućine?", kutije: [{ oznaka: "A", stanje: "cvrsto", poruka: "Čestice samo titraju na mjestu: to je čvrsto tijelo." }, { oznaka: "B", stanje: "tekuce" }, { oznaka: "C", stanje: "plin", poruka: "Čestice su daleko i slobodno lete: to je plin." }], tocna: 1 },
  validate(s) {
    const { list, need } = problems();
    need(["prikaz", "odaberi"].includes(s.nacin), "cestice.nacin mora biti prikaz ili odaberi");
    need(isText(s.tekst), "cestice treba „tekst“");
    if (need(Array.isArray(s.kutije) && s.kutije.length >= 2 && s.kutije.length <= 4, "cestice treba 2–4 kutije")) {
      s.kutije.forEach((k, i) => {
        need(STANJA.includes(k?.stanje), `kutije[${i}].stanje mora biti cvrsto, tekuce ili plin`);
        need(isText(k?.oznaka), `kutije[${i}].oznaka mora biti tekst`);
      });
    }
    if (s.nacin === "prikaz") noAnswerFields(s, need);
    if (s.nacin === "odaberi") need(Number.isInteger(s.tocna) && s.tocna >= 0 && s.tocna < (s.kutije?.length ?? 0), "cestice odaberi treba tocna = indeks kutije");
    return list;
  },
  check(s, index) {
    if (!Number.isInteger(index)) return { tocno: false, poruka: "Dodirni jednu kutiju.", prazno: true };
    return index === s.tocna ? { tocno: true } : { tocno: false, poruka: s.kutije[index]?.poruka || s.savjet || "Nije ta kutija. Pogledaj kako su čestice raspoređene i kako se gibaju." };
  },
  tocanOdgovor: (s) => `kutija ${s.kutije[s.tocna]?.oznaka}`,
};

// ── tijelo u tekućini ─────────────────────────────────────────────────────────────────────────────
const ISHODI = ["pliva", "lebdi", "tone"];
const ishod = (rt, rf) => (Math.abs(rt - rf) <= rf * 0.005 ? "lebdi" : rt < rf ? "pliva" : "tone");

export const uronjeno = {
  tip: "uronjeno",
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Tijela u tekućini: tekucina: {naziv, gustoca (g/cm³)}, tijela: [{naziv, gustoca (g/cm³)}] (1–4), tekst, nacin:
- "istrazi": ${NACIN_ISTRAZI}; učenik spušta tijela u tekućinu i vidi plivaju li;
- "predvidi": za svako tijelo učenik odabere pliva / lebdi / tone. Točan odgovor računa aplikacija iz gustoća.`,
  primjer: { tip: "uronjeno", nacin: "predvidi", tekst: "Što će se dogoditi sa svakim tijelom u vodi?", tekucina: { naziv: "voda", gustoca: 1 }, tijela: [{ naziv: "drvena kocka", gustoca: 0.6 }, { naziv: "željezni uteg", gustoca: 7.9 }] },
  validate(s) {
    const { list, need } = problems();
    need(["istrazi", "predvidi"].includes(s.nacin), "uronjeno.nacin mora biti istrazi ili predvidi");
    need(isText(s.tekst), "uronjeno treba „tekst“");
    need(isText(s.tekucina?.naziv) && isNum(s.tekucina?.gustoca) && s.tekucina.gustoca > 0, "uronjeno treba tekucina: {naziv, gustoca > 0}");
    if (need(Array.isArray(s.tijela) && s.tijela.length >= 1 && s.tijela.length <= 4, "uronjeno treba 1–4 tijela")) {
      s.tijela.forEach((t, i) => need(isText(t?.naziv) && isNum(t?.gustoca) && t.gustoca > 0, `tijela[${i}] treba naziv i gustoću > 0`));
    }
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    return list;
  },
  ishodi: (s) => s.tijela.map((t) => ishod(t.gustoca, s.tekucina.gustoca)),
  check(s, picks) {
    if (!Array.isArray(picks) || picks.length !== s.tijela.length || picks.some((p) => !ISHODI.includes(p))) return { tocno: false, poruka: "Odaberi ishod za svako tijelo.", prazno: true };
    const rf = s.tekucina.gustoca;
    for (let i = 0; i < s.tijela.length; i++) {
      const t = s.tijela[i];
      const right = ishod(t.gustoca, rf);
      if (picks[i] !== right) {
        const cmp = right === "pliva" ? "manja od" : right === "tone" ? "veća od" : "jednaka";
        return { tocno: false, poruka: `${t.naziv}: gustoća ${withUnit(t.gustoca, "g/cm³")} je ${cmp} ${right === "lebdi" ? "gustoći" : "gustoće"} tekućine (${withUnit(rf, "g/cm³")}), pa tijelo ${right}. Odlučuje gustoća, a ne masa ili veličina.` };
      }
    }
    return { tocno: true };
  },
  tocanOdgovor: (s) => s.tijela.map((t) => `${t.naziv}: ${ishod(t.gustoca, s.tekucina.gustoca)}`).join("; "),
};
