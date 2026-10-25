// brzina_reakcije: brzina kemijske reakcije (lekcije 028, 029, 030, 043 i pokus 17 iz ispitnog kataloga).
// Kod iz speca računa sve: koeficijente reakcije (logikom widgeta „jednadzba“: izjednaci, cestica), krivulje c–t
// (c = c₀ + ν·ξ(t), ξ(t) = ξ_kraj·(1 − 0,5^(t/t½)); ξ_kraj je doseg do ravnoteže ili do nestanka mjerodavnog
// reaktanta), prosječnu brzinu trošenja / nastajanja / reakcije na intervalu (v̄ = −Δc(reaktanta)/(ν·Δt) =
// Δc(produkta)/(ν·Δt), kao u lekciji 028), koeficijente i strelicu iz grafa (lekcija 043), smjer i razlog utjecaja
// temperature, koncentracije, površine i katalizatora (lekcija 030), vrijeme zamućenja u pokusu 17
// (t ∝ 1/c, a svakih 10 °C reakcija je faktor_10 puta brža) i omjer brzina iz omjera vremena.
import { isNum, parseNumber, formatNumber, near } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  checkNumber,
  validateKrivo,
  KRIVO_OPIS,
} from "../zajednicko.js";
import {
  tvari as tvariJednadzbe,
  izjednaci,
  nzd,
  provjeriKoef,
} from "./jednadzba.js";

export const NACINI = ["istrazi", "prosjecna", "iz_grafa", "utjecaj", "omjer"];
export const PRIKAZI = ["graf", "sudari", "pokus"];
export const VREMENA = ["s", "min"];
// veličina na okomitoj osi grafa: simbol, jedinica osi, jedinica u brzini („mol dm⁻³“ + „ s⁻¹“)
export const VELICINE = {
  c: { simbol: "c", jed: "mol/dm³", jedB: "mol dm⁻³", naziv: "koncentracija" },
  n: { simbol: "n", jed: "mol", jedB: "mol", naziv: "množina" },
  p: { simbol: "p", jed: "kPa", jedB: "kPa", naziv: "tlak" },
  V: { simbol: "V", jed: "cm³", jedB: "cm³", naziv: "volumen" },
};
export const ULOGE = ["reaktant", "produkt", "ne"];
export const SMJEROVI = ["brza", "sporija", "isto"];
export const SMJER_NAZIV = {
  brza: "brža",
  sporija: "sporija",
  isto: "jednako brza",
};
const SLOVO = /^[A-Z]$/;
const SUP = {
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
  "-": "⁻",
};
const gore = (n) => [...String(n)].map((c) => SUP[c] ?? c).join("");
const lista = (a) =>
  a.length <= 1
    ? a.join("")
    : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`;

// ── zapis brojeva ──
// dvije značajne znamenke ako je broj njima točan (0,020), inače tri; izvan [0,001, 10⁴) znanstveni zapis „2,0·10⁻⁴“
export function zapisBroja(v, sig = null, znanstveno = false) {
  if (!isNum(v)) return "—";
  if (v === 0) return "0";
  const tocan = (n) =>
    Math.abs(Number(v.toPrecision(n)) - v) <= 1e-9 * Math.abs(v);
  const z = sig ?? [2, 3, 4].find(tocan) ?? 3;
  const a = Math.abs(v);
  if (a >= (znanstveno ? 1e-2 : 1e-3) && a < 1e4) {
    if (a >= 10 ** z) return String(Math.round(v)).replace("-", "−");
    return v.toPrecision(z).replace("-", "−").replace(".", ",");
  }
  const [m, e] = v.toExponential(z - 1).split("e");
  return `${m.replace("-", "−").replace(".", ",")}·10${gore(Number(e))}`;
}
// brzina: ispod 0,01 uvijek „9,36·10⁻³“ (kao u ispitu)
export const zapisBrzine = (v) => zapisBroja(v, null, true);
const zapisJed = (v, jed) => (/⁻¹$/.test(jed) ? zapisBrzine(v) : zapisBroja(v));
// vrijeme i temperatura na osi / u tekstu: „100 s“, „2,5 min“, „40 °C“
export const zapisT = (t) => formatNumber(Number(Number(t).toPrecision(6)));
const sPredznakom = (v) =>
  Math.abs(v) < 1e-12 ? "0" : v > 0 ? `+${zapisBroja(v)}` : zapisBroja(v);

function validateZapis(z, v, at, need) {
  if (z == null) return;
  const n = parseNumber(String(z));
  need(
    isText(z) &&
      isNum(n) &&
      isNum(v) &&
      Math.abs(n - v) <= 1e-9 * Math.max(1e-12, Math.abs(v)),
    `${at} („${z}“) mora biti isti broj kao vrijednost (${v}), samo zapisan kao u tekstu zadatka`,
  );
}

// „lijepi“ korak osi / mreže: 1, 2, 2,5 ili 5 · 10ⁿ, tako da raspon ima oko 4–8 koraka
export function lijepKorak(raspon, cilj = 5) {
  if (!(raspon > 0)) return 1;
  const sirovo = raspon / cilj;
  const e = 10 ** Math.floor(Math.log10(sirovo));
  const k = [1, 2, 2.5, 5, 10].find((x) => x * e >= sirovo * 0.75) ?? 10;
  return Number((k * e).toPrecision(6));
}
const gornjaGranica = (v, korak) =>
  Number((Math.ceil(v / korak - 1e-9) * korak).toPrecision(6));

// ── reakcija ──
export const opce = (s) => s?.reakcija?.opce === true;

// {vrste: [{f, strana, koef, nu}], opce, strelica} ili {greska}. Formule i koeficijenti kao u widgetu „jednadzba“.
export function reakcijaOf(s) {
  const r = s?.reakcija;
  if (!r || typeof r !== "object")
    return {
      greska:
        "treba reakcija: {reaktanti, produkti, koeficijenti?, opce?, strelica?}",
    };
  const R = r.reaktanti;
  const P = r.produkti;
  if (!Array.isArray(R) || !R.length || !Array.isArray(P) || !P.length)
    return {
      greska:
        "reakcija treba reaktanti: [..] i produkti: [..] (barem po jedan)",
    };
  const formule = [...R, ...P];
  if (formule.length > 6)
    return { greska: "reakcija smije imati najviše 6 tvari" };
  if (new Set(formule).size !== formule.length)
    return { greska: "ista tvar ne smije biti dvaput u reakciji" };
  let koef;
  if (r.opce === true) {
    if (!formule.every((f) => typeof f === "string" && SLOVO.test(f)))
      return { greska: "uz opce: true vrste su velika slova („A“, „B“, „C“)" };
    if (
      !(
        Array.isArray(r.koeficijenti) &&
        r.koeficijenti.length === formule.length &&
        r.koeficijenti.every((k) => Number.isInteger(k) && k >= 1 && k <= 10)
      )
    )
      return {
        greska: `uz opce: true koeficijenti su obavezni: po jedan cijeli broj od 1 do 10 za svaku tvar (${formule.length}), redom reaktanti pa produkti`,
      };
    if (nzd(r.koeficijenti) !== 1)
      return {
        greska: `koeficijenti ${r.koeficijenti.join(", ")} nisu najmanji cijeli brojevi (podijeli ih s ${nzd(r.koeficijenti)})`,
      };
    koef = r.koeficijenti;
  } else {
    if (
      formule.some(
        (f) =>
          typeof f === "string" &&
          SLOVO.test(f) &&
          ![
            "B",
            "C",
            "F",
            "H",
            "I",
            "K",
            "N",
            "O",
            "P",
            "S",
            "U",
            "V",
            "W",
            "Y",
          ].includes(f),
      )
    )
      return {
        greska: "opće vrste („A“, „B“…) traže opce: true i zadane koeficijente",
      };
    const t = tvariJednadzbe({ reaktanti: R, produkti: P });
    const los = t.find((c) => c.greska);
    if (los) return { greska: `reakcija: ${los.greska}` };
    if (t.some((c) => c.elektron))
      return {
        greska: "reakcija ne smije imati elektron (to je polureakcija)",
      };
    const iz = izjednaci(t);
    if (iz.greska) return { greska: `reakcija: ${iz.greska}` };
    koef = iz.koef;
    if (
      r.koeficijenti != null &&
      !(
        Array.isArray(r.koeficijenti) &&
        r.koeficijenti.length === koef.length &&
        r.koeficijenti.every((k, i) => k === koef[i])
      )
    )
      return {
        greska: `reakcija.koeficijenti se ne slažu s izjednačenom jednadžbom (${koef.join(", ")}); izostavi ih, kod ih računa sam`,
      };
  }
  return {
    vrste: formule.map((f, i) => ({
      f,
      strana: i < R.length ? "L" : "D",
      koef: koef[i],
      nu: i < R.length ? -koef[i] : koef[i],
    })),
    opce: r.opce === true,
    strelica: r.strelica ?? null,
  };
}
export const zapisReakcije = (vrste, strelica = "→") => {
  const clan = (v) => `${v.koef > 1 ? `${v.koef} ` : ""}${v.f}`;
  return `${vrste
    .filter((v) => v.strana === "L")
    .map(clan)
    .join(" + ")} ${strelica} ${vrste
    .filter((v) => v.strana === "D")
    .map(clan)
    .join(" + ")}`;
};

// ── model krivulja (c–t, n–t, p–t, V–t) ──
// {R, vrste (i one koje ne sudjeluju), prikazane, c(f, t), dc(f, t), povratna, xiKraj, cKraj(f), vel, jt, os, mreza, tablica}
export function modelOf(s) {
  const R = reakcijaOf(s);
  if (R.greska) return R;
  const vel = VELICINE[s.velicina ?? "c"] ?? VELICINE.c;
  const jt = s.jedinica_t ?? "s";
  const uReakciji = new Set(R.vrste.map((v) => v.f));
  const nuOd = (f) => R.vrste.find((v) => v.f === f)?.nu ?? 0;
  let c;
  let kljucevi;
  let povratna = false;
  let xiKraj = null;
  let cKraj;
  let xiMax = null;
  let tablica = null;
  if (s.tablica) {
    const T = s.tablica;
    const ts = T.t;
    kljucevi = Object.keys(T.vrijednosti ?? {});
    const lin = (niz, t) => {
      if (t <= ts[0]) return niz[0];
      for (let i = 1; i < ts.length; i++)
        if (t <= ts[i])
          return (
            niz[i - 1] +
            ((niz[i] - niz[i - 1]) * (t - ts[i - 1])) / (ts[i] - ts[i - 1])
          );
      return niz[niz.length - 1];
    };
    c = (f, t) => (T.vrijednosti[f] ? lin(T.vrijednosti[f], t) : NaN);
    cKraj = (f) => T.vrijednosti[f]?.at(-1);
    tablica = T;
  } else {
    const p0 = s.pocetne ?? {};
    kljucevi = Object.keys(p0);
    const c0 = (f) => (isNum(p0[f]) ? p0[f] : 0);
    xiMax = Math.min(
      ...R.vrste.filter((v) => v.strana === "L").map((v) => c0(v.f) / v.koef),
    );
    xiKraj = isNum(s.doseg) ? s.doseg : xiMax;
    povratna = xiKraj < xiMax * (1 - 1e-9);
    const tau = s.poluvrijeme;
    const xi = (t) => xiKraj * (1 - 0.5 ** (Math.max(0, t) / tau));
    c = (f, t) => c0(f) + nuOd(f) * xi(t);
    cKraj = (f) => c0(f) + nuOd(f) * xiKraj;
  }
  const ne = kljucevi.filter((f) => !uReakciji.has(f));
  const vrste = [
    ...R.vrste,
    ...ne.map((f) => ({ f, strana: null, koef: 0, nu: 0 })),
  ];
  const prikazane = Array.isArray(s.prikazi) ? s.prikazi : kljucevi;
  // derivacija (tangenta): numerički
  const dc = (f, t) => {
    const h = Math.max(1e-6, (s.poluvrijeme ?? 1) * 1e-4);
    return (
      (c(f, t + h) - c(f, Math.max(0, t - h))) / (t - h < 0 ? t + h : 2 * h)
    );
  };
  // osi
  const tKraj = tablica ? tablica.t.at(-1) : null;
  const xDo = isNum(s.os_x?.[1])
    ? s.os_x[1]
    : tablica
      ? tKraj
      : gornjaGranica(
          (povratna ? 6 : 3) * s.poluvrijeme,
          lijepKorak((povratna ? 6 : 3) * s.poluvrijeme),
        );
  const xOd = isNum(s.os_x?.[0]) ? s.os_x[0] : 0;
  const maxC = Math.max(
    ...prikazane
      .map((f) =>
        Math.max(c(f, xOd), c(f, xDo), ...(tablica?.vrijednosti[f] ?? [])),
      )
      .filter(isNum),
    0,
  );
  const yKorak0 = lijepKorak(maxC * 1.1 || 1, 5);
  const yDo = isNum(s.os_y?.[1])
    ? s.os_y[1]
    : gornjaGranica(maxC * 1.08 || 1, yKorak0);
  const yOd = isNum(s.os_y?.[0]) ? s.os_y[0] : 0;
  const mreza = Array.isArray(s.mreza)
    ? s.mreza
    : [lijepKorak(xDo - xOd, 6), lijepKorak(yDo - yOd, 5)];
  return {
    R,
    vrste,
    prikazane,
    c,
    dc,
    cKraj,
    povratna,
    xiKraj,
    xiMax,
    vel,
    jt,
    os: { x: [xOd, xDo], y: [yOd, yDo] },
    mreza,
    tablica,
    nuOd,
    uReakciji,
  };
}

export const jedinicaBrzine = (m, jt = m.jt) => `${m.vel.jedB} ${jt}⁻¹`;
export const vOznaka = (za) => (za === "reakcija" ? "v̄" : `v̄(${za})`);
// faktor za brzinu kad se traži u drugoj jedinici vremena nego na osi (graf u min, odgovor u s⁻¹: : 60)
const faktorT = (od, u) =>
  od === u ? 1 : od === "min" && u === "s" ? 1 / 60 : 60;

// ── prosječna brzina: lanac ──
// koraci [{id, oznaka, jed, vrijednost, f(k), formula}] – f računa iz poznatih (i učenikovih) vrijednosti k
export function prekoOd(s, m) {
  if (isText(s.preko)) return s.preko;
  if (s.za && s.za !== "reakcija" && m.prikazane.includes(s.za)) return s.za;
  return m.prikazane.find((f) => m.nuOd(f) !== 0) ?? m.prikazane[0];
}
export function lanacOf(s, m = modelOf(s)) {
  const uj = s.u_jedinici ?? m.jt;
  const jedB = jedinicaBrzine(m, uj);
  const za = s.za ?? "reakcija";
  const koefOd = (f) => Math.abs(m.nuOd(f));
  if (s.zadana_brzina) {
    const z = s.zadana_brzina;
    const zaOd = z.za ?? "reakcija";
    const vReak = zaOd === "reakcija" ? z.v : z.v / koefOd(zaOd);
    const cilj = za === "reakcija" ? vReak : vReak * koefOd(za);
    return [
      {
        id: "v",
        oznaka: vOznaka(za),
        jed: jedB,
        vrijednost: cilj,
        f: () => cilj,
        formula:
          za === "reakcija"
            ? `v̄ = v̄(${zaOd}) : ${koefOd(zaOd)}`
            : `v̄(${za}) = ${koefOd(za)} · v̄`,
      },
    ];
  }
  const X = prekoOd(s, m);
  const [t1, t2] = s.interval;
  const dt = t2 - t1;
  const fT = faktorT(m.jt, uj);
  const nuX = m.nuOd(X);
  const znak = nuX < 0 ? -1 : 1;
  const sym = m.vel.simbol;
  const sve = [];
  sve.push({
    id: "c1",
    oznaka: `${sym}(${X})`,
    pri: t1,
    jed: m.vel.jed,
    citanje: true,
    f: () => m.c(X, t1),
    formula: `očitaj ${sym}(${X}) pri t = ${zapisT(t1)} ${m.jt}`,
  });
  sve.push({
    id: "c2",
    oznaka: `${sym}(${X})`,
    pri: t2,
    jed: m.vel.jed,
    citanje: true,
    f: () => m.c(X, t2),
    formula: `očitaj ${sym}(${X}) pri t = ${zapisT(t2)} ${m.jt}`,
  });
  const vX = (k) => (znak * (k.c2 - k.c1) * fT) / dt;
  const delta = `Δ${sym}(${X})`;
  sve.push({
    id: "vX",
    oznaka: vOznaka(X),
    jed: jedB,
    f: vX,
    formula: `${vOznaka(X)} = ${znak < 0 ? "−" : ""}${delta} : Δt`,
  });
  if (za === "reakcija") {
    if (koefOd(X) !== 1)
      sve.push({
        id: "v",
        oznaka: "v̄",
        jed: jedB,
        f: (k) => k.vX / koefOd(X),
        formula: `v̄ = ${vOznaka(X)} : ${koefOd(X)}`,
      });
    else
      sve[sve.length - 1] = {
        ...sve[sve.length - 1],
        id: "v",
        oznaka: "v̄",
        formula: `v̄ = ${znak < 0 ? "−" : ""}${delta} : Δt`,
      };
  } else if (za !== X) {
    sve.push({
      id: "v",
      oznaka: vOznaka(za),
      jed: jedB,
      f: (k) => (k.vX * koefOd(za)) / koefOd(X),
      formula: `${vOznaka(za)} = ${vOznaka(X)} · ${koefOd(za)} : ${koefOd(X)}`,
    });
  } else sve[sve.length - 1].id = "v";
  const k = {};
  for (const x of sve) k[x.id] = x.vrijednost = x.f(k);
  const koraci = s.koraci ?? !m.tablica;
  return koraci ? sve : [sve.at(-1)];
}

// Tipične krive vrijednosti koraka iz poznatih vrijednosti k (učenikovih ili točnih).
function greskeLanca(id, k, s, m) {
  const out = [];
  const add = (v, poruka) =>
    isNum(v) && Math.abs(v) > 0 && out.push({ v, poruka });
  if (s.zadana_brzina) {
    const z = s.zadana_brzina;
    const zaOd = z.za ?? "reakcija";
    const za = s.za ?? "reakcija";
    const kOd = Math.abs(m.nuOd(zaOd)) || 1;
    const kZa = za === "reakcija" ? 1 : Math.abs(m.nuOd(za));
    const vReak = zaOd === "reakcija" ? z.v : z.v / kOd;
    if (zaOd === "reakcija") {
      add(
        vReak / kZa,
        `Brzina nastajanja ili trošenja tvari je ${kZa} puta veća od brzine reakcije (koeficijent ${za} je ${kZa}): pomnoži, ne dijeli.`,
      );
      add(
        vReak,
        `${za} ima koeficijent ${kZa}, pa se troši ili nastaje ${kZa} puta brže nego što teče reakcija.`,
      );
    } else if (za === "reakcija") {
      add(
        z.v * kOd,
        `Brzina reakcije je brzina tvari podijeljena njezinim koeficijentom (${kOd}), ne pomnožena.`,
      );
      add(
        z.v,
        `${zaOd} ima koeficijent ${kOd}: brzinu reakcije dobiješ kad njegovu brzinu podijeliš s ${kOd}.`,
      );
    } else {
      add(
        z.v,
        `${zaOd} i ${za} imaju različite koeficijente (${kOd} i ${kZa}), pa nemaju jednaku brzinu.`,
      );
      add(
        (z.v * kOd) / kZa,
        `Omjer je obrnut: ${za} ima koeficijent ${kZa}, a ${zaOd} ${kOd}.`,
      );
    }
    return out;
  }
  const X = prekoOd(s, m);
  const [t1, t2] = s.interval;
  const dt = t2 - t1;
  const uj = s.u_jedinici ?? m.jt;
  const fT = faktorT(m.jt, uj);
  const nuX = m.nuOd(X);
  const kX = Math.abs(nuX);
  const reaktant = nuX < 0;
  const za = s.za ?? "reakcija";
  const sym = m.vel.simbol;
  if (id === "c1" || id === "c2") {
    const t = id === "c1" ? t1 : t2;
    const drugi = id === "c1" ? t2 : t1;
    add(
      m.c(X, drugi),
      `To je vrijednost pri t = ${zapisT(drugi)} ${m.jt}. Ovdje očitaj krivulju pri t = ${zapisT(t)} ${m.jt}.`,
    );
    for (const f of m.prikazane)
      if (f !== X) add(m.c(f, t), `To je krivulja ${f}. Očitaj krivulju ${X}.`);
    return out;
  }
  // brzina tvari X iz (učenikovih) očitanja
  const c1 = isNum(k.c1) ? k.c1 : m.c(X, t1);
  const c2 = isNum(k.c2) ? k.c2 : m.c(X, t2);
  const vXt = ((reaktant ? -1 : 1) * (c2 - c1) * fT) / dt;
  const greskeVX = [];
  const g = (v, poruka) =>
    isNum(v) && Math.abs(v) > 0 && greskeVX.push({ v, poruka });
  g(
    -vXt,
    reaktant
      ? `Brzina trošenja je pozitivna. ${X} se troši, pa je Δ${sym} = ${sym}₂ − ${sym}₁ negativan, a minus ispred razlomka čini brzinu pozitivnom.`
      : `Promjena je uvijek kraj minus početak: ${sym}₂ − ${sym}₁. ${X} nastaje, pa je Δ${sym} pozitivan i brzina pozitivna.`,
  );
  g(
    (c2 * fT) / dt,
    `Za brzinu treba promjena Δ${sym} = ${sym}₂ − ${sym}₁, a ne samo ${sym} na kraju intervala.`,
  );
  if (c1 > 0)
    g(
      (c1 * fT) / dt,
      `Za brzinu treba promjena Δ${sym} = ${sym}₂ − ${sym}₁, a ne samo ${sym} na početku intervala.`,
    );
  if (t1 > 0)
    g(
      (Math.abs(c2 - c1) * fT) / t2,
      `Δt = t₂ − t₁ = ${zapisT(t2)} − ${zapisT(t1)} = ${zapisT(dt)} ${m.jt}, a ne ${zapisT(t2)} ${m.jt}.`,
    );
  g(
    (Math.abs(c2 - c1) * dt) / fT,
    `Brzina je promjena podijeljena vremenom: Δ${sym} : Δt, a ne Δ${sym} · Δt.`,
  );
  if (fT === 1) {
    if (m.jt === "min")
      g(
        Math.abs(c2 - c1) / dt / 60,
        `Vrijeme na grafu je u minutama, a brzina se ovdje traži po minuti (${jedinicaBrzine(m, uj)}): ne pretvaraj u sekunde.`,
      );
    else
      g(
        (Math.abs(c2 - c1) / dt) * 60,
        `Vrijeme je u sekundama, a brzina se traži po sekundi (${jedinicaBrzine(m, uj)}).`,
      );
  } else {
    g(
      Math.abs(c2 - c1) / dt,
      m.jt === "min"
        ? `Vrijeme na grafu je u minutama, a brzina se traži po sekundi: 1 min = 60 s, pa podijeli sa 60.`
        : `Vrijeme na grafu je u sekundama, a brzina se traži po minuti: pomnoži sa 60.`,
    );
  }
  const vXk = isNum(k.vX) ? k.vX : vXt;
  const pretvori = (v) =>
    za === "reakcija" ? v / kX : za === X ? v : (v * Math.abs(m.nuOd(za))) / kX;
  if (id === "vX") return greskeVX;
  if (id === "v") {
    const lanac = lanacOf(s, m);
    const bezKoraka = lanac.length === 1;
    // prečaci bez koraka: greška u brzini tvari X prenesena kroz pretvorbu
    if (bezKoraka || !lanac.some((x) => x.id === "vX"))
      for (const e of greskeVX)
        out.push({ v: pretvori(e.v), poruka: e.poruka });
    if (za === "reakcija" && kX !== 1) {
      add(
        vXk,
        `To je brzina ${reaktant ? "trošenja" : "nastajanja"} ${X}. Brzinu reakcije dobiješ kad je podijeliš koeficijentom ${X} u jednadžbi (ν = ${kX}).`,
      );
      add(
        vXk * kX,
        `Brzinu ${X} podijeli njegovim koeficijentom (ν = ${kX}), ne množi.`,
      );
    }
    if (za !== "reakcija" && za !== X) {
      const kZa = Math.abs(m.nuOd(za));
      const ulogaZa = m.nuOd(za) < 0 ? "trošenja" : "nastajanja";
      if (kZa !== kX) {
        add(
          vXk,
          `${X} i ${za} imaju različite koeficijente (${kX} i ${kZa}), pa nemaju jednaku brzinu. Brzina ${ulogaZa} ${za} je ${kZa} : ${kX} brzine ${X}.`,
        );
        add(
          (vXk * kX) / kZa,
          `Omjer je obrnut: koeficijent ${za} je ${kZa}, a ${X} ${kX}.`,
        );
      }
      if (kX !== 1)
        add(
          vXk / kX,
          `To je brzina reakcije. Brzina ${ulogaZa} ${za} je brzina reakcije puta koeficijent ${za} (${kZa}).`,
        );
    }
    return out;
  }
  return out;
}

// tolerancija očitanja s grafa: petina koraka mreže, ali barem 2 % vrijednosti
// (iz tablice se ne očitava s grafa: tada samo zaokruživanje)
const tolCitanja = (m, v) =>
  m.tablica
    ? Math.abs(v) * 0.001
    : Math.max(Math.abs(v) * 0.02, m.mreza[1] * 0.2);
const tolPosto = (s) => (s.tolerancija_posto ?? 3) / 100;

// vrijednost pada na crtu mreže ili na pola koraka (da je učenik može očitati)
const naMrezi = (v, korak) => {
  const q = v / (korak / 2);
  return Math.abs(q - Math.round(q)) <= 0.04;
};

// ── iz grafa: uloge, koeficijenti, strelica ──
export function izGrafaOf(s, m = modelOf(s)) {
  const vrste = m.prikazane.map((f) => {
    const v = m.vrste.find((x) => x.f === f);
    const c0 = m.c(f, m.os.x[0]);
    const ck = m.tablica ? m.cKraj(f) : m.cKraj(f);
    return {
      f,
      nu: v?.nu ?? 0,
      koef: v?.koef ?? 0,
      uloga: !v || v.nu === 0 ? "ne" : v.nu < 0 ? "reaktant" : "produkt",
      c0,
      ck,
      dc: ck - c0,
    };
  });
  return { vrste, strelica: m.povratna ? "⇌" : "→" };
}
export const pitaStrelicu = (s) => s.strelica_pitaj !== false;

// ── utjecaj ──
export const PROMJENE = {
  temperatura_gore: {
    smjer: "brza",
    razlog: "energija",
    ometaci: ["cesci_samo", "ea_temp", "ravnoteza"],
    opis: "povišenje temperature",
  },
  temperatura_dolje: {
    smjer: "sporija",
    razlog: "energija_manje",
    ometaci: ["rjedji_sudari", "ea_visa", "ravnoteza"],
    opis: "sniženje temperature",
  },
  koncentracija_gore: {
    smjer: "brza",
    razlog: "cesci_sudari",
    ometaci: ["energija", "ea_niza", "ravnoteza"],
    opis: "veća koncentracija reaktanta",
  },
  koncentracija_dolje: {
    smjer: "sporija",
    razlog: "rjedji_sudari",
    ometaci: ["energija_manje", "ea_visa", "ravnoteza"],
    opis: "manja koncentracija reaktanta",
  },
  razrjedjivanje: {
    smjer: "sporija",
    razlog: "rjedji_sudari",
    ometaci: ["energija_manje", "ea_visa", "ravnoteza"],
    opis: "razrjeđivanje otopine",
  },
  tlak_gore: {
    smjer: "brza",
    razlog: "cesci_sudari",
    ometaci: ["energija", "ea_niza", "ravnoteza"],
    opis: "povišenje tlaka plinova (manji volumen)",
  },
  tlak_dolje: {
    smjer: "sporija",
    razlog: "rjedji_sudari",
    ometaci: ["energija_manje", "ea_visa", "ravnoteza"],
    opis: "sniženje tlaka plinova (veći volumen)",
  },
  usitnjavanje: {
    smjer: "brza",
    razlog: "povrsina",
    ometaci: ["cesci_sudari", "energija", "ea_niza"],
    opis: "usitnjavanje čvrstog reaktanta (prah umjesto komada)",
  },
  okrupnjavanje: {
    smjer: "sporija",
    razlog: "povrsina_manja",
    ometaci: ["rjedji_sudari", "energija_manje", "ea_visa"],
    opis: "komad umjesto praha",
  },
  katalizator: {
    smjer: "brza",
    razlog: "ea_niza",
    ometaci: ["energija_kat", "ravnoteza", "dh"],
    opis: "dodatak katalizatora",
  },
  inhibitor: {
    smjer: "sporija",
    razlog: "ea_visa",
    ometaci: ["energija_manje", "rjedji_sudari", "ravnoteza"],
    opis: "dodatak inhibitora",
  },
  inertni_plin: {
    smjer: "isto",
    razlog: "iste_koncentracije",
    ometaci: ["cesci_sudari", "rjedji_sudari", "ravnoteza"],
    opis: "dodatak plina koji ne reagira, pri stalnom volumenu",
  },
};
export const RAZLOZI = {
  energija: "Veći dio sudara ima barem energiju aktivacije.",
  energija_manje: "Manji dio sudara ima barem energiju aktivacije.",
  cesci_sudari:
    "U istom volumenu ima više čestica reaktanta, pa se češće sudaraju.",
  rjedji_sudari:
    "U istom volumenu ima manje čestica reaktanta, pa se rjeđe sudaraju.",
  povrsina: "Veća je dodirna površina, pa se čestice češće sudaraju.",
  povrsina_manja: "Manja je dodirna površina, pa se čestice rjeđe sudaraju.",
  ea_niza: "Reakcija ide drugim putem, s nižom energijom aktivacije.",
  ea_visa: "Energija aktivacije postane viša.",
  iste_koncentracije:
    "Koncentracije reaktanata ostaju iste, pa se čestice sudaraju jednako često.",
  cesci_samo: "Čestice se samo češće sudaraju.",
  ea_temp: "Zagrijavanjem se snizuje energija aktivacije.",
  energija_kat: "Katalizator česticama daje dodatnu energiju.",
  ravnoteza: "Ravnoteža se pomiče prema produktima.",
  dh: "Reakcija oslobađa više energije.",
};
// poruka za krivi razlog (uz zadanu promjenu)
function porukaRazloga(p, r) {
  const P = PROMJENE[p];
  const tocan = P.razlog;
  const M = {
    cesci_samo:
      "Sudara je pri višoj temperaturi nešto više, ali to ne objašnjava toliko ubrzanje. Važnije je da su sudari snažniji: puno veći dio njih ima barem energiju aktivacije.",
    ea_temp:
      "Temperatura ne mijenja energiju aktivacije (visinu „brijega“). Mijenja energiju čestica: pri višoj temperaturi veći dio sudara ima barem Eₐ.",
    energija_kat:
      "Katalizator ne daje česticama energiju: temperatura i energija čestica ostaju iste. On otvara drugi put reakcije, s nižom energijom aktivacije.",
    ravnoteza:
      "Brzina i ravnoteža nisu isto. Pitanje je koliko brzo reakcija teče, a to ovisi o sudarima čestica i energiji aktivacije.",
    dh: "Katalizator ne mijenja reakcijsku entalpiju: razine reaktanata i produkata ostaju iste, niži je samo brijeg između njih.",
    energija: p.startsWith("temperatura")
      ? null
      : "Temperatura je ista, pa čestice imaju jednaku energiju kao prije. Promijenilo se nešto drugo.",
    energija_manje: p.startsWith("temperatura")
      ? null
      : "Temperatura je ista, pa čestice imaju jednaku energiju kao prije. Promijenilo se nešto drugo.",
    ea_niza:
      "Energiju aktivacije mijenja samo katalizator (ili inhibitor). Ovdje se promijenilo nešto drugo.",
    ea_visa:
      p === "temperatura_dolje"
        ? "Hlađenje ne mijenja energiju aktivacije; čestice imaju manje energije, pa manji dio sudara ima barem Eₐ."
        : "Energiju aktivacije mijenja samo katalizator ili inhibitor. Ovdje se promijenilo nešto drugo.",
    cesci_sudari:
      p === "usitnjavanje"
        ? "Koncentracija otopine (ili plina) je ista. Promijenio se oblik čvrste tvari: u prahu je puno više čestica na površini, gdje do sudara dolazi."
        : "Broj čestica u istom volumenu se nije povećao.",
    rjedji_sudari:
      p === "okrupnjavanje"
        ? "Koncentracija otopine je ista, ali komad ima manju dodirnu površinu od praha."
        : p === "temperatura_dolje"
          ? "Čestica je jednako mnogo, samo imaju manje energije: manji dio sudara ima barem energiju aktivacije."
          : "Broj čestica u istom volumenu se nije smanjio.",
  };
  if (r === tocan) return null;
  return M[r] ?? `Za ${P.opis} to nije pravi razlog.`;
}
function porukaSmjera(p, dano) {
  const P = PROMJENE[p];
  const T = {
    temperatura_gore:
      "Pri višoj temperaturi čestice se gibaju brže i imaju više energije, pa reakcija ide brže.",
    temperatura_dolje:
      "Pri nižoj temperaturi čestice imaju manje energije, pa reakcija ide sporije.",
    koncentracija_gore:
      "Što je više čestica reaktanta u istom volumenu, to se češće sudaraju, pa reakcija ide brže.",
    koncentracija_dolje:
      "Što je manje čestica reaktanta u istom volumenu, to se rjeđe sudaraju, pa reakcija ide sporije.",
    razrjedjivanje:
      "Razrjeđivanjem je u istom volumenu manje čestica reaktanta, pa se rjeđe sudaraju.",
    tlak_gore:
      "Kad se plinovi stisnu u manji volumen, u svakom dm³ ima više čestica, pa se češće sudaraju.",
    tlak_dolje:
      "U većem volumenu plinovi su razrjeđeniji, pa se čestice rjeđe sudaraju.",
    usitnjavanje:
      "Prah ima puno veću površinu od komada iste mase, pa se na površini događa više sudara.",
    okrupnjavanje:
      "Komad ima manju površinu od praha iste mase, pa se događa manje sudara.",
    katalizator: "Katalizator ubrzava reakciju, a sam se ne troši.",
    inhibitor: "Inhibitor usporava reakciju: radi suprotno od katalizatora.",
    inertni_plin:
      "Plin koji ne reagira ne mijenja koncentracije reaktanata kad je volumen stalan, pa ni brzinu.",
  };
  if (dano === P.smjer) return null;
  return T[p];
}
export function razloziOd(s) {
  const P = PROMJENE[s.promjena];
  if (!P) return [];
  if (Array.isArray(s.razlozi)) return s.razlozi;
  // stalni redoslijed (bez slučajnog miješanja): točni razlog ne smije uvijek biti prvi
  const sve = [P.razlog, ...P.ometaci];
  const pomak =
    [...s.promjena].reduce((a, ch) => a + ch.charCodeAt(0), 0) % sve.length;
  return [...sve.slice(pomak), ...sve.slice(0, pomak)];
}
export const pitaUtjecaj = (s) => s.pitaj ?? "oboje";

// ── pokus 17: vrijeme do zamućenja ──
export const POKUS_MIJENJA = ["temperatura", "koncentracija"];
export const TEMPERATURE_POKUSA = [20, 30, 40, 50, 60];
export function pokusOf(s) {
  const p = s.pokus ?? {};
  const mijenja = p.mijenja ?? "temperatura";
  const ot = {
    c: p.otopina?.c ?? 0.2,
    kiselina: p.otopina?.kiselina_mL ?? 1,
    ukupno: p.otopina?.ukupno_mL ?? 6,
  };
  const sobna = isNum(p.sobna) ? p.sobna : 20;
  // referentna točka: za temperaturu ref je ϑ (°C, uz 1 mL tiosulfata), za koncentraciju ref je c u epruveti (pri sobnoj)
  const cJedan = (ot.c * 1) / ot.ukupno;
  const refT = mijenja === "temperatura" && isNum(p.ref) ? p.ref : sobna;
  const refC = mijenja === "koncentracija" && isNum(p.ref) ? p.ref : cJedan;
  const tRef = isNum(p.t_ref) ? p.t_ref : 160;
  const f10 = isNum(p.faktor_10) ? p.faktor_10 : 2;
  const vrijeme = (theta, c) =>
    (tRef * (refC / c)) / f10 ** ((theta - refT) / 10);
  // t kao funkcija varijable koja se mijenja
  const t = (x) =>
    mijenja === "temperatura" ? vrijeme(x, refC) : vrijeme(sobna, x);
  const cIzV = (V) => (ot.c * V) / ot.ukupno;
  return {
    mijenja,
    ot,
    sobna,
    refT,
    refC,
    tRef,
    f10,
    vrijeme,
    t,
    cIzV,
    voda: (V) => ot.ukupno - ot.kiselina - V,
  };
}
export function grafPokusaOf(s, pm = pokusOf(s)) {
  const temp = pm.mijenja === "temperatura";
  const x =
    isNum(s.os_x?.[0]) && isNum(s.os_x?.[1])
      ? s.os_x
      : temp
        ? [10, 70]
        : [
            0,
            gornjaGranica(
              Math.max(...(s.usporedi ?? [pm.refC])) * 1.6,
              lijepKorak(Math.max(...(s.usporedi ?? [pm.refC])) * 1.6),
            ),
          ];
  const ys = (s.usporedi ?? [x[0] || x[1] * 0.2, x[1]]).map((v) => pm.t(v));
  const maxT = Math.max(
    ...ys,
    pm.t(temp ? x[0] : Math.max(x[0], (x[1] - x[0]) * 0.25 + x[0])),
  );
  const yK = lijepKorak(maxT * 1.1, 5);
  const y = isNum(s.os_y?.[1])
    ? [s.os_y[0] ?? 0, s.os_y[1]]
    : [0, gornjaGranica(maxT * 1.08, yK)];
  const mreza = Array.isArray(s.mreza)
    ? s.mreza
    : [lijepKorak(x[1] - x[0], 6), lijepKorak(y[1] - y[0], 5)];
  return { x, y, mreza, temp };
}
export function omjerOf(s, pm = pokusOf(s)) {
  const [x1, x2] = s.usporedi;
  const t1 = pm.t(x1);
  const t2 = pm.t(x2);
  return {
    x1,
    x2,
    t1,
    t2,
    brza: t1 < t2,
    puta: Math.max(t1, t2) / Math.min(t1, t2),
  };
}
const zapisX = (pm, x) =>
  pm.mijenja === "temperatura" ? `${zapisT(x)} °C` : `${zapisBroja(x)} mol/dm³`;
export const zapisUvjeta = zapisX;
export function lanacOmjera(s, pm = pokusOf(s)) {
  const o = omjerOf(s, pm);
  const sve = [
    {
      id: "t1",
      oznaka: "t₁",
      pri: o.x1,
      jed: "s",
      citanje: true,
      f: () => o.t1,
    },
    {
      id: "t2",
      oznaka: "t₂",
      pri: o.x2,
      jed: "s",
      citanje: true,
      f: () => o.t2,
    },
    {
      id: "puta",
      oznaka: "puta",
      jed: "",
      f: (k) => Math.max(k.t1, k.t2) / Math.min(k.t1, k.t2),
    },
  ];
  const k = {};
  for (const x of sve) k[x.id] = x.vrijednost = x.f(k);
  return s.koraci === false ? [sve.at(-1)] : sve;
}

// ── polja ──
const POLJA = [
  "tip",
  "nacin",
  "tekst",
  "prikaz",
  "reakcija",
  "pocetne",
  "poluvrijeme",
  "doseg",
  "tablica",
  "prikazi",
  "velicina",
  "jedinica_t",
  "os_x",
  "os_y",
  "mreza",
  "interval",
  "tangenta",
  "za",
  "preko",
  "zadana_brzina",
  "u_jedinici",
  "koraci",
  "operacije",
  "tolerancija_posto",
  "krivo",
  "savjet",
  "promjene",
  "strelica_pitaj",
  "promjena",
  "pitaj",
  "razlozi",
  "sudari",
  "pokus",
  "usporedi",
];
const GRAF = [
  "reakcija",
  "pocetne",
  "poluvrijeme",
  "doseg",
  "tablica",
  "prikazi",
  "velicina",
  "jedinica_t",
  "os_x",
  "os_y",
  "mreza",
];
const ZA_NACIN = {
  istrazi: ["prikaz", ...GRAF, "interval", "tangenta", "sudari", "pokus"],
  prosjecna: [
    ...GRAF,
    "interval",
    "za",
    "preko",
    "zadana_brzina",
    "u_jedinici",
    "koraci",
    "operacije",
    "tolerancija_posto",
    "krivo",
    "savjet",
  ],
  iz_grafa: [...GRAF, "promjene", "strelica_pitaj"],
  utjecaj: ["promjena", "pitaj", "razlozi"],
  omjer: [
    "pokus",
    "usporedi",
    "prikaz",
    "os_x",
    "os_y",
    "mreza",
    "koraci",
    "tolerancija_posto",
    "savjet",
  ],
};
const SUDARI_KLIZACI = [
  "temperatura",
  "koncentracija",
  "povrsina",
  "katalizator",
];
export const klizaciSudara = (s) =>
  Array.isArray(s.sudari?.klizaci)
    ? s.sudari.klizaci
    : s.sudari?.cvrsto
      ? ["temperatura", "koncentracija", "povrsina", "katalizator"]
      : ["temperatura", "koncentracija", "katalizator"];
export const prikazOf = (s) =>
  s.prikaz ??
  (s.nacin === "omjer"
    ? "graf"
    : s.pokus
      ? "pokus"
      : s.sudari && !s.reakcija
        ? "sudari"
        : "graf");

function validateGraf(s, need, list, { trebaInterval }) {
  const R = reakcijaOf(s);
  if (!need(!R.greska, R.greska)) return null;
  const r = s.reakcija;
  for (const f of Object.keys(r))
    need(
      ["reaktanti", "produkti", "koeficijenti", "opce", "strelica"].includes(f),
      `reakcija nema polje „${f}“ (dopuštena: reaktanti, produkti, koeficijenti, opce, strelica)`,
    );
  if (r.strelica != null)
    need(["→", "⇌"].includes(r.strelica), 'reakcija.strelica je "→" ili "⇌"');
  if (s.velicina != null)
    need(
      Object.keys(VELICINE).includes(s.velicina),
      `velicina je ${Object.keys(VELICINE).join(", ")}`,
    );
  if (s.jedinica_t != null)
    need(VREMENA.includes(s.jedinica_t), 'jedinica_t je "s" ili "min"');
  const imaT = s.tablica != null;
  const imaM = s.pocetne != null || s.poluvrijeme != null;
  if (
    !need(
      imaT !== imaM,
      "zadaj ili model krivulja (pocetne + poluvrijeme, doseg?) ili tablica: {t, vrijednosti}, ne oboje",
    )
  )
    return null;
  const uR = new Set(R.vrste.map((v) => v.f));
  const provjeriVrstu = (f, at) => {
    if (uR.has(f)) return;
    if (R.opce)
      need(
        SLOVO.test(f),
        `${at}: „${f}“ nije vrsta iz reakcije (opće vrste su velika slova)`,
      );
    else {
      const t = tvariJednadzbe({ reaktanti: [f], produkti: [] })[0];
      need(!t.greska, `${at}: ${t.greska}`);
    }
  };
  if (imaT) {
    const T = s.tablica;
    if (
      !need(
        T &&
          typeof T === "object" &&
          Array.isArray(T.t) &&
          T.vrijednosti &&
          typeof T.vrijednosti === "object",
        "tablica je {t: [vremena], vrijednosti: {tvar: [vrijednosti]}}",
      )
    )
      return null;
    for (const f of Object.keys(T))
      need(
        ["t", "vrijednosti", "zapisi"].includes(f),
        `tablica nema polje „${f}“`,
      );
    need(
      T.t.length >= 2 &&
        T.t.length <= 12 &&
        T.t.every(isNum) &&
        T.t.every((x, i) => i === 0 || x > T.t[i - 1]) &&
        T.t[0] >= 0,
      "tablica.t: 2–12 vremena, rastu, od 0 naviše",
    );
    const kl = Object.keys(T.vrijednosti);
    need(kl.length >= 1 && kl.length <= 5, "tablica.vrijednosti: 1–5 tvari");
    for (const f of kl) {
      provjeriVrstu(f, "tablica.vrijednosti");
      need(
        Array.isArray(T.vrijednosti[f]) &&
          T.vrijednosti[f].length === T.t.length &&
          T.vrijednosti[f].every((v) => isNum(v) && v >= 0),
        `tablica.vrijednosti[„${f}“] mora imati ${T.t.length} nenegativnih brojeva (kao t)`,
      );
      // reaktant se troši, produkt nastaje: inače bi brzina izašla s krivim predznakom
      const nu = R.vrste.find((v) => v.f === f)?.nu ?? 0;
      const niz = T.vrijednosti[f];
      if (nu && Array.isArray(niz) && niz.every(isNum))
        need(
          !niz.some((x, i) => i && (nu < 0 ? x > niz[i - 1] : x < niz[i - 1])),
          nu < 0
            ? `tablica.vrijednosti[„${f}“]: ${f} je reaktant i troši se, pa vrijednosti s vremenom ne smiju rasti`
            : `tablica.vrijednosti[„${f}“]: ${f} je produkt i nastaje, pa vrijednosti s vremenom ne smiju padati`,
        );
    }
    if (T.zapisi != null) {
      if (
        need(
          typeof T.zapisi === "object" && !Array.isArray(T.zapisi),
          "tablica.zapisi je {tvar: [zapis…]} kao u tekstu zadatka",
        )
      )
        for (const [f, z] of Object.entries(T.zapisi)) {
          if (
            !need(
              Array.isArray(T.vrijednosti[f]) &&
                Array.isArray(z) &&
                z.length === T.t.length,
              `tablica.zapisi[„${f}“] mora imati ${T.t.length} zapisa, za tvar iz tablica.vrijednosti`,
            )
          )
            continue;
          z.forEach((x, i) =>
            validateZapis(
              x,
              T.vrijednosti[f][i],
              `tablica.zapisi[„${f}“][${i}]`,
              need,
            ),
          );
        }
    }
    if (s.doseg != null)
      need(false, "doseg ide samo uz model krivulja (pocetne + poluvrijeme)");
  } else {
    if (
      !need(
        s.pocetne && typeof s.pocetne === "object" && !Array.isArray(s.pocetne),
        'pocetne: {tvar: početna vrijednost} (npr. {"N₂O": 0.04})',
      )
    )
      return null;
    for (const [f, v] of Object.entries(s.pocetne)) {
      provjeriVrstu(f, "pocetne");
      need(
        isNum(v) && v >= 0 && v <= 1e4,
        `pocetne[„${f}“] mora biti nenegativan broj`,
      );
    }
    for (const v of R.vrste.filter((x) => x.strana === "L"))
      need(
        isNum(s.pocetne[v.f]) && s.pocetne[v.f] > 0,
        `reaktant ${v.f} treba početnu vrijednost veću od 0 u pocetne`,
      );
    need(
      isNum(s.poluvrijeme) && s.poluvrijeme > 0,
      "poluvrijeme (vrijeme za koje se preostala promjena prepolovi, u jedinici osi t) mora biti pozitivan broj",
    );
    if (s.doseg != null) {
      const m0 = modelOf({ ...s, doseg: undefined });
      if (!m0.greska)
        need(
          isNum(s.doseg) && s.doseg > 0 && s.doseg <= m0.xiKraj * (1 + 1e-9),
          `doseg (koliko se reakcija pomakne do ravnoteže, po koeficijentu 1) mora biti između 0 i ${zapisBroja(m0.xiKraj)} (tada mjerodavni reaktant nestane)`,
        );
    }
  }
  if (s.prikazi != null) {
    const sve = imaT
      ? Object.keys(s.tablica.vrijednosti)
      : [...R.vrste.map((v) => v.f), ...Object.keys(s.pocetne ?? {})];
    need(
      Array.isArray(s.prikazi) &&
        s.prikazi.length >= 1 &&
        s.prikazi.length <= 5 &&
        s.prikazi.every((f) => sve.includes(f)) &&
        new Set(s.prikazi).size === s.prikazi.length,
      `prikazi: 1–5 tvari bez ponavljanja, iz reakcije ili pocetne (${sve.join(", ")})`,
    );
  }
  for (const o of ["os_x", "os_y"])
    if (s[o] != null)
      need(
        Array.isArray(s[o]) &&
          s[o].length === 2 &&
          s[o].every(isNum) &&
          s[o][1] > s[o][0],
        `${o} je [od, do]`,
      );
  if (s.mreza != null)
    need(
      Array.isArray(s.mreza) &&
        s.mreza.length === 2 &&
        s.mreza.every((x) => isNum(x) && x > 0),
      "mreza je [korak t, korak vrijednosti]",
    );
  if (list.length) return null;
  const m = modelOf(s);
  if (!need(!m.greska, m.greska)) return null;
  if (R.strelica != null && !imaT)
    need(
      R.strelica === (m.povratna ? "⇌" : "→"),
      m.povratna
        ? "uz doseg manji od potpunog reakcija je povratna: strelica ⇌"
        : "bez dosega reakcija ide do kraja: strelica →",
    );
  // krivulje stanu u graf
  const [x0, x1] = m.os.x;
  const [y0, y1] = m.os.y;
  need(
    m.mreza[0] <= (x1 - x0) / 2 &&
      m.mreza[1] <= (y1 - y0) / 2 &&
      (x1 - x0) / m.mreza[0] <= 30 &&
      (y1 - y0) / m.mreza[1] <= 30,
    "mreza: korak je premalen ili prevelik za raspon osi (najviše 30 crta)",
  );
  for (const f of m.prikazane) {
    const vals = m.tablica
      ? m.tablica.vrijednosti[f]
      : [m.c(f, x0), m.c(f, x1)];
    need(
      vals.every((v) => v >= y0 - 1e-12 && v <= y1 * (1 + 1e-9)),
      `krivulja ${f} izlazi iz grafa: os_y mora obuhvatiti vrijednosti od ${zapisBroja(Math.min(...vals))} do ${zapisBroja(Math.max(...vals))}`,
    );
  }
  if (trebaInterval) {
    if (
      !need(
        Array.isArray(s.interval) &&
          s.interval.length === 2 &&
          s.interval.every(isNum) &&
          s.interval[1] > s.interval[0],
        "interval je [t₁, t₂], t₂ > t₁",
      )
    )
      return m;
    need(
      s.interval[0] >= x0 && s.interval[1] <= x1,
      `interval mora biti na osi t (${zapisT(x0)}–${zapisT(x1)} ${m.jt})`,
    );
    if (m.tablica)
      need(
        s.interval.every((t) => m.tablica.t.includes(t)),
        "uz tablicu interval počinje i završava u vremenima iz tablice",
      );
  }
  return m;
}

// ── widget ──
export const brzina_reakcije = {
  tip: "brzina_reakcije",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Brzina kemijske reakcije: graf c–t (ili n–t, p–t, V–t) s prosječnom brzinom na intervalu, jednadžba reakcije iz grafa, model sudara (temperatura, koncentracija, površina, katalizator, raspodjela energije čestica i Eₐ) i pokus 17 (tiosulfat + kiselina, vrijeme do nestanka znaka X).
Kod sam računa koeficijente (logikom widgeta „jednadzba“), krivulje iz početnih vrijednosti, sve brzine i tipične krive vrijednosti. Prosječna brzina kao u lekciji 028: v̄(reaktanta) = −Δc/Δt, v̄(produkta) = Δc/Δt, v̄ reakcije = brzina tvari podijeljena njezinim koeficijentom ν; jedinica „mol dm⁻³ s⁻¹“ (ili min⁻¹).
Graf (istrazi s prikaz "graf", prosjecna, iz_grafa): reakcija: {reaktanti, produkti, koeficijenti?, opce?, strelica?} – formule kao u „jednadzba“ (Unicode indeksi; koeficijente kod računa sam), ili opce: true za vrste „A“, „B“, „C“ (tada koeficijenti obavezni); strelica? "→" | "⇌" mora se slagati s dosegom.
Krivulje: pocetne: {tvar: početna vrijednost} (redom kako se crtaju; tvar koje nema u reakciji ne sudjeluje i ostaje vodoravna), poluvrijeme (za koliko se preostala promjena prepolovi, u jedinici osi t), doseg? (za povratnu reakciju: koliko se reakcija pomakne do ravnoteže po koeficijentu 1, npr. 0,10 za 3 A + B ⇌ 2 C kad A padne 0,30; bez dosega mjerodavni reaktant potpuno nestane) – ili tablica: {t: [..], vrijednosti: {tvar: [..]}, zapisi?: {tvar: ["4,537·10⁻²", …]}} (prikazuje se kao tablica; zapisi kao u tekstu zadatka).
prikazi? (koje krivulje; zadano sve iz pocetne / tablice), velicina? "c" (zadano, mol/dm³) | "n" (mol) | "p" (kPa) | "V" (cm³), jedinica_t? "s" (zadano) | "min", os_x?, os_y?: [od, do], mreza?: [korak t, korak vrijednosti] (kao skica „graf“ u zadatku; vrijednosti koje učenik čita moraju pasti na crtu mreže ili pola koraka).
tekst, nacin:
- "istrazi" (nije zadatak): prikaz?: "graf" (zadano uz reakciju) – klizači t₁ i t₂ biraju interval, crta se sekanta i ispisuju Δc, Δt, v̄ tvari i v̄ reakcije; dodir na tvar bira krivulju; interval? početni; tangenta?: true dodaje gumb za tangentu u t₁ (trenutna brzina; ne uz tablicu);
  prikaz: "sudari" – čestice u posudi, klizači temperature i koncentracije, prekidač katalizatora i (uz sudari: {cvrsto: true}) komad / prah; broje se sudari i uspješni sudari, uz raspodjelu energije čestica s oznakom Eₐ; sudari?: {cvrsto?, klizaci?: ["temperatura", "koncentracija", "povrsina", "katalizator"]};
  prikaz: "pokus" – pokus 17: pokus: {mijenja: "temperatura" | "koncentracija", t_ref? (s, zadano 160), ref? (ϑ u °C ili c u epruveti u mol/dm³ za t_ref; zadano sobna 20 °C, odnosno 1 mL tiosulfata), faktor_10? (koliko je puta brža za 10 °C, zadano 2), otopina?: {c (zadano 0,20), kiselina_mL (1), ukupno_mL (6)}, sobna? (20)}; učenik bira temperaturu ili mL tiosulfata (voda dopunjava do istog volumena), miješa, zaporni sat mjeri dok X ne nestane, rezultati idu u tablicu (t i 1/t) i na graf;
- "prosjecna": interval: [t₁, t₂], za?: tvar (brzina njezina trošenja ili nastajanja) | "reakcija" (zadano), preko? (čija se krivulja čita; zadano za, ili prvi sudionik na grafu); lanac očitaj c₁ → očitaj c₂ → v̄(tvari) → v̄ (reakcije ili druge tvari, preko koeficijenata); koraci?: false samo konačni rezultat (zadano bez koraka uz tablicu); u_jedinici? "s" | "min" kad se brzina traži u drugoj jedinici vremena nego na osi; operacije?: true formule na strelicama (bez toga se ne vide prije provjere); tolerancija_posto? (zadano 3); poruke za zaboravljen minus, c umjesto Δc, t₂ umjesto Δt, min/s, zaboravljen ili obrnut koeficijent, krivu krivulju i krivo vrijeme očitanja;
  bez grafa: zadana_brzina: {za: "reakcija" | tvar, v, zapis?} – iz zadane brzine izračunaj brzinu tvari za (ν · v̄) ili brzinu reakcije (bez interval, pocetne, tablica; reakcija obavezna);
- "iz_grafa": graf svih tvari (pocetne, doseg za ravnotežu); učenik za svaku tvar bira ulogu (reaktant / produkt / ne sudjeluje) i upisuje koeficijent, a strelica_pitaj?: false (zadano pita) skida izbor → ili ⇌; promjene?: true najprije traži Δc svake tvari (s predznakom). Kod prepoznaje koeficijente iz konačnih koncentracija (česta greška), neskraćene, zamijenjene uloge, tvar koja ne sudjeluje, a uz prave formule i neizjednačenu jednadžbu (poruka kao u „jednadzba“). Graf mora ići bar do 6 poluvremena (krivulje se izravnaju);
- "utjecaj": promjena: ${Object.keys(PROMJENE)
    .map((k) => `"${k}"`)
    .join(
      " | ",
    )}; pitaj?: "oboje" (zadano) | "smjer" (brža / sporija / jednako brza) | "razlog"; razlozi?: [id…] (2–5, mora biti i točni) iz: ${Object.keys(RAZLOZI).join(", ")} (zadano: točni i tri tipična kriva);
- "omjer" (pokus 17, lekcije 029 i 030): pokus kao gore, usporedi: [x₁, x₂] (dvije temperature u °C ili dvije koncentracije tiosulfata u epruveti); prikaz? "graf" (zadano: krivulja t–ϑ ili t–c s mrežom, bez vrijednosti) | "pokus" (učenik sam pomiješa obje epruvete i očita zaporni sat); lanac t₁ → t₂ → koliko je puta reakcija uz x₁ brža (ili sporija) od reakcije uz x₂; koraci?: false samo omjer; os_x?, os_y?, mreza?; poruke za obrnut omjer (kraće vrijeme = brža reakcija) i razliku umjesto omjera.
${KRIVO_OPIS} (samo prosjecna, za konačni rezultat). savjet? – poruka kad kriva vrijednost nije prepoznata.`,
  primjer: {
    tip: "brzina_reakcije",
    nacin: "istrazi",
    tekst:
      "Didušikov oksid raspada se u zatvorenoj posudi. Pomiči t₁ i t₂ i gledaj kako se prosječna brzina mijenja kad je interval na početku, a kako kad je na kraju.",
    reakcija: { reaktanti: ["N₂O"], produkti: ["N₂", "O₂"] },
    pocetne: { "N₂O": 0.04, "O₂": 0 },
    poluvrijeme: 100,
    os_x: [0, 300],
    os_y: [0, 0.05],
    mreza: [50, 0.01],
    interval: [0, 100],
    tangenta: true,
  },
  primjeri: [
    {
      tip: "brzina_reakcije",
      nacin: "istrazi",
      prikaz: "sudari",
      tekst:
        "Čestice dvaju reaktanata sudaraju se u posudi. Mijenjaj temperaturu i koncentraciju, uključi katalizator i gledaj koliko je sudara uspješno.",
    },
    {
      tip: "brzina_reakcije",
      nacin: "istrazi",
      prikaz: "sudari",
      tekst:
        "Cink (čvrsto) reagira s klorovodičnom kiselinom. Usporedi komad i prah iste mase.",
      sudari: { cvrsto: true, klizaci: ["povrsina", "koncentracija"] },
    },
    {
      tip: "brzina_reakcije",
      nacin: "istrazi",
      prikaz: "pokus",
      tekst:
        "Pokus 17: u epruveti je 1 mL otopine natrijeva tiosulfata i 4 mL vode. Zagrij je na odabranu temperaturu, dodaj 1 mL sumporne kiseline i mjeri vrijeme dok znak X ne nestane.",
      pokus: { mijenja: "temperatura", t_ref: 160 },
    },
    {
      tip: "brzina_reakcije",
      nacin: "istrazi",
      prikaz: "pokus",
      tekst:
        "Pokus 17: mijenjaj volumen otopine tiosulfata (voda dopunjava do 5 mL), dodaj 1 mL sumporne kiseline i mjeri vrijeme do nestanka znaka X.",
      pokus: { mijenja: "koncentracija", t_ref: 160 },
    },
    {
      tip: "brzina_reakcije",
      nacin: "prosjecna",
      tekst:
        "Očitaj koncentraciju N₂O na početku i nakon 100 s pa izračunaj prosječnu brzinu trošenja N₂O u tih 100 s.",
      reakcija: { reaktanti: ["N₂O"], produkti: ["N₂", "O₂"] },
      pocetne: { "N₂O": 0.04 },
      poluvrijeme: 100,
      os_x: [0, 300],
      os_y: [0, 0.05],
      mreza: [50, 0.01],
      interval: [0, 100],
      za: "N₂O",
    },
    {
      tip: "brzina_reakcije",
      nacin: "prosjecna",
      tekst:
        "Kolika je prosječna brzina reakcije 2 N₂O → 2 N₂ + O₂ između 100 s i 200 s?",
      reakcija: { reaktanti: ["N₂O"], produkti: ["N₂", "O₂"] },
      pocetne: { "N₂O": 0.04 },
      poluvrijeme: 100,
      os_x: [0, 300],
      os_y: [0, 0.05],
      mreza: [50, 0.01],
      interval: [100, 200],
      za: "reakcija",
    },
    {
      tip: "brzina_reakcije",
      nacin: "prosjecna",
      tekst:
        "Graf prikazuje raspad N₂O₅: 2 N₂O₅ → 4 NO₂ + O₂. Kolika je prosječna brzina nastajanja NO₂ u prvih 15 minuta?",
      reakcija: { reaktanti: ["N₂O₅"], produkti: ["NO₂", "O₂"] },
      pocetne: { "N₂O₅": 12 },
      poluvrijeme: 7.5,
      jedinica_t: "min",
      os_x: [0, 30],
      os_y: [0, 14],
      mreza: [5, 1],
      interval: [0, 15],
      za: "NO₂",
      preko: "N₂O₅",
      operacije: true,
    },
    {
      tip: "brzina_reakcije",
      nacin: "prosjecna",
      tekst:
        "Koncentracija N₂O₅ tijekom 80 s padne s 4,537·10⁻² na 4,460·10⁻² mol/dm³ (2 N₂O₅ → 4 NO₂ + O₂). Kolika je prosječna brzina reakcije?",
      reakcija: { reaktanti: ["N₂O₅"], produkti: ["NO₂", "O₂"] },
      tablica: {
        t: [0, 80],
        vrijednosti: { "N₂O₅": [0.04537, 0.0446] },
        zapisi: { "N₂O₅": ["4,537·10⁻²", "4,460·10⁻²"] },
      },
      interval: [0, 80],
      za: "reakcija",
      tolerancija_posto: 1,
    },
    {
      tip: "brzina_reakcije",
      nacin: "prosjecna",
      tekst:
        "Fosfin se raspada: 4 PH₃ → P₄ + 6 H₂. Prosječna brzina reakcije je 1,56·10⁻³ mol dm⁻³ s⁻¹. Kolika je prosječna brzina nastajanja vodika?",
      reakcija: { reaktanti: ["PH₃"], produkti: ["P₄", "H₂"] },
      zadana_brzina: { za: "reakcija", v: 0.00156, zapis: "1,56·10⁻³" },
      za: "H₂",
    },
    {
      tip: "brzina_reakcije",
      nacin: "iz_grafa",
      tekst:
        "U zatvorenoj posudi su plinovi A, B, C i D. Iz grafa odredi koje tvari reagiraju i napiši jednadžbu reakcije s najmanjim cijelim koeficijentima.",
      reakcija: {
        reaktanti: ["A", "B"],
        produkti: ["C"],
        koeficijenti: [3, 1, 2],
        opce: true,
        strelica: "⇌",
      },
      pocetne: { A: 0.6, B: 0.5, C: 0, D: 0.1 },
      doseg: 0.1,
      poluvrijeme: 2,
      jedinica_t: "min",
      os_x: [0, 20],
      os_y: [0, 0.6],
      mreza: [5, 0.1],
      promjene: true,
    },
    {
      tip: "brzina_reakcije",
      nacin: "iz_grafa",
      tekst:
        "Graf prikazuje koncentracije triju plinova u posudi. Napiši jednadžbu reakcije.",
      reakcija: { reaktanti: ["N₂O₅"], produkti: ["NO₂", "O₂"] },
      pocetne: { "N₂O₅": 0.4, "NO₂": 0, "O₂": 0 },
      poluvrijeme: 5,
      jedinica_t: "min",
      os_x: [0, 30],
      os_y: [0, 0.8],
      mreza: [5, 0.1],
    },
    {
      tip: "brzina_reakcije",
      nacin: "utjecaj",
      tekst:
        "Smjesa otopina natrijeva tiosulfata i sumporne kiseline zagrije se s 20 °C na 40 °C. Kako se mijenja brzina reakcije i zašto?",
      promjena: "temperatura_gore",
    },
    {
      tip: "brzina_reakcije",
      nacin: "utjecaj",
      tekst:
        "Raspadu vodikova peroksida doda se malo manganova(IV) oksida. Kako se mijenja brzina reakcije i zašto?",
      promjena: "katalizator",
    },
    {
      tip: "brzina_reakcije",
      nacin: "utjecaj",
      tekst:
        "Umjesto komadića cinka u klorovodičnu kiselinu stavi se jednaka masa cinka u prahu. Zašto se vodik razvija brže?",
      promjena: "usitnjavanje",
      pitaj: "razlog",
    },
    {
      tip: "brzina_reakcije",
      nacin: "omjer",
      tekst:
        "Slika prikazuje vrijeme zamućenja pri različitim temperaturama. Očitaj vrijeme pri 20 °C i pri 40 °C. Koliko je puta reakcija pri 40 °C brža?",
      pokus: { mijenja: "temperatura", t_ref: 160, ref: 20 },
      usporedi: [40, 20],
      os_x: [10, 70],
      os_y: [0, 180],
      mreza: [10, 20],
    },
    {
      tip: "brzina_reakcije",
      nacin: "omjer",
      tekst:
        "U jednoj epruveti je tiosulfat koncentracije 0,10 mol/dm³, a u drugoj 0,050 mol/dm³. Pomiješaj obje s kiselinom i izmjeri vremena. Koliko je puta reakcija u prvoj epruveti brža?",
      pokus: {
        mijenja: "koncentracija",
        t_ref: 60,
        ref: 0.1,
        otopina: { c: 0.3, kiselina_mL: 1, ukupno_mL: 6 },
      },
      usporedi: [0.1, 0.05],
      prikaz: "pokus",
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (
      !need(
        NACINI.includes(s.nacin),
        `brzina_reakcije.nacin mora biti jedan od: ${NACINI.join(", ")}`,
      )
    )
      return list;
    need(isText(s.tekst), "brzina_reakcije treba „tekst“");
    for (const f of Object.keys(s))
      need(POLJA.includes(f), `brzina_reakcije nema polje „${f}“`);
    const dop = ZA_NACIN[s.nacin];
    for (const f of Object.keys(s))
      if (!["tip", "nacin", "tekst"].includes(f) && POLJA.includes(f))
        need(
          dop.includes(f),
          `${s.nacin} ne koristi „${f}“ (dopuštena: ${dop.join(", ")})`,
        );
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    for (const b of [
      "tangenta",
      "koraci",
      "operacije",
      "promjene",
      "strelica_pitaj",
    ])
      if (s[b] != null)
        need(typeof s[b] === "boolean", `${b} mora biti true ili false`);
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    if (s.tolerancija_posto != null)
      need(
        isNum(s.tolerancija_posto) &&
          s.tolerancija_posto > 0 &&
          s.tolerancija_posto <= 10,
        "tolerancija_posto je broj između 0 i 10",
      );
    if (list.length) return list;

    if (s.nacin === "istrazi") {
      const p = prikazOf(s);
      if (!need(PRIKAZI.includes(p), `prikaz je ${PRIKAZI.join(", ")}`))
        return list;
      if (p === "graf") {
        for (const f of ["sudari", "pokus"])
          need(s[f] == null, `prikaz "graf" ne koristi „${f}“`);
        const m = validateGraf(s, need, list, {
          trebaInterval: s.interval != null,
        });
        if (m && s.tangenta && m.tablica)
          need(
            false,
            "tangenta ne ide uz tablicu (krivulja između točaka nije poznata)",
          );
      } else {
        for (const f of [...GRAF, "interval", "tangenta"])
          need(s[f] == null, `prikaz "${p}" ne koristi „${f}“`);
        if (p === "sudari") {
          need(s.pokus == null, 'prikaz "sudari" ne koristi „pokus“');
          if (s.sudari != null) {
            if (
              need(
                typeof s.sudari === "object",
                "sudari je {cvrsto?, klizaci?}",
              )
            ) {
              for (const f of Object.keys(s.sudari))
                need(
                  ["cvrsto", "klizaci"].includes(f),
                  `sudari nema polje „${f}“`,
                );
              if (s.sudari.cvrsto != null)
                need(
                  typeof s.sudari.cvrsto === "boolean",
                  "sudari.cvrsto je true ili false",
                );
              if (s.sudari.klizaci != null) {
                need(
                  Array.isArray(s.sudari.klizaci) &&
                    s.sudari.klizaci.length >= 1 &&
                    s.sudari.klizaci.every((k) => SUDARI_KLIZACI.includes(k)),
                  `sudari.klizaci: popis od ${SUDARI_KLIZACI.join(", ")}`,
                );
                if (
                  Array.isArray(s.sudari.klizaci) &&
                  s.sudari.klizaci.includes("povrsina")
                )
                  need(
                    s.sudari.cvrsto === true,
                    "klizač površine traži sudari.cvrsto: true (čvrsti reaktant)",
                  );
              }
            }
          }
        } else {
          need(s.sudari == null, 'prikaz "pokus" ne koristi „sudari“');
          validatePokus(s, need);
        }
      }
      return list;
    }

    if (s.nacin === "prosjecna") {
      if (s.zadana_brzina != null) {
        for (const f of [
          "pocetne",
          "poluvrijeme",
          "doseg",
          "tablica",
          "interval",
          "preko",
          "prikazi",
          "os_x",
          "os_y",
          "mreza",
          "koraci",
        ])
          need(s[f] == null, `uz zadana_brzina nema grafa, pa ni „${f}“`);
        const R = reakcijaOf(s);
        if (!need(!R.greska, R.greska)) return list;
        const z = s.zadana_brzina;
        if (
          !need(
            z && typeof z === "object" && isNum(z.v) && z.v > 0,
            'zadana_brzina je {za: "reakcija" | tvar, v (pozitivan broj), zapis?}',
          )
        )
          return list;
        for (const f of Object.keys(z))
          need(
            ["za", "v", "zapis"].includes(f),
            `zadana_brzina nema polje „${f}“`,
          );
        const imena = R.vrste.map((v) => v.f);
        const zaOd = z.za ?? "reakcija";
        need(
          zaOd === "reakcija" || imena.includes(zaOd),
          `zadana_brzina.za je "reakcija" ili tvar iz reakcije (${imena.join(", ")})`,
        );
        need(
          s.za != null && (s.za === "reakcija" || imena.includes(s.za)),
          `za (tražena brzina) je "reakcija" ili tvar iz reakcije (${imena.join(", ")})`,
        );
        need(
          s.za !== zaOd,
          "za i zadana_brzina.za su isti: nema se što računati",
        );
        validateZapis(z.zapis, z.v, "zadana_brzina.zapis", need);
        if (s.u_jedinici != null)
          need(
            false,
            "uz zadana_brzina jedinica je ista kao u zadanoj brzini (bez u_jedinici)",
          );
        if (s.jedinica_t != null)
          need(VREMENA.includes(s.jedinica_t), 'jedinica_t je "s" ili "min"');
      } else {
        const m = validateGraf(s, need, list, { trebaInterval: true });
        if (!m || list.length) return list;
        const imena = m.R.vrste.map((v) => v.f);
        if (s.za != null)
          need(
            s.za === "reakcija" || imena.includes(s.za),
            `za je "reakcija" ili tvar iz reakcije (${imena.join(", ")})`,
          );
        const X = prekoOd(s, m);
        if (s.preko != null)
          need(
            m.prikazane.includes(s.preko),
            `preko (${s.preko}) mora biti krivulja na grafu (${m.prikazane.join(", ")})`,
          );
        need(
          m.nuOd(X) !== 0,
          `${X} ne sudjeluje u reakciji, pa se iz njegove krivulje ne računa brzina`,
        );
        if (s.u_jedinici != null)
          need(VREMENA.includes(s.u_jedinici), 'u_jedinici je "s" ili "min"');
        if (list.length) return list;
        const [t1, t2] = s.interval;
        need(
          Math.abs(m.c(X, t2) - m.c(X, t1)) > 1e-12,
          `${X} se na intervalu ne mijenja: brzina bi bila 0`,
        );
        if (!m.tablica)
          for (const t of [t1, t2]) {
            need(
              naMrezi(m.c(X, t), m.mreza[1]),
              `${m.vel.simbol}(${X}) pri t = ${zapisT(t)} ${m.jt} je ${zapisBroja(m.c(X, t), 3)}, a to ne pada na crtu mreže (korak ${zapisBroja(m.mreza[1])}): učenik ga ne može točno očitati; promijeni interval ili mrezu`,
            );
            need(
              naMrezi(t, m.mreza[0]),
              `t = ${zapisT(t)} ${m.jt} ne pada na crtu mreže (korak ${zapisT(m.mreza[0])})`,
            );
          }
      }
      if (list.length) return list;
      const L = lanacOf(s, modelZaLanac(s));
      validateKrivo(
        s.krivo,
        L.at(-1).vrijednost,
        Math.abs(L.at(-1).vrijednost) * tolPosto(s),
        need,
      );
      return list;
    }

    if (s.nacin === "iz_grafa") {
      const m = validateGraf(s, need, list, { trebaInterval: false });
      if (!m || list.length) return list;
      need(
        !m.tablica,
        "iz_grafa traži model krivulja (pocetne, poluvrijeme, doseg?), ne tablicu",
      );
      const sudionici = m.R.vrste.map((v) => v.f);
      need(
        sudionici.every((f) => m.prikazane.includes(f)),
        `na grafu moraju biti sve tvari iz reakcije (${sudionici.join(", ")})`,
      );
      need(
        m.os.x[1] >= 6 * s.poluvrijeme,
        `os t mora ići bar do ${zapisT(6 * s.poluvrijeme)} ${m.jt} (6 poluvremena), da se krivulje izravnaju i promjene točno očitaju`,
      );
      if (list.length) return list;
      const g = izGrafaOf(s, m);
      for (const v of g.vrste) {
        need(
          naMrezi(v.c0, m.mreza[1]) && naMrezi(v.ck, m.mreza[1]),
          `${v.f}: početna (${zapisBroja(v.c0, 3)}) i konačna (${zapisBroja(v.ck, 3)}) vrijednost moraju pasti na crtu mreže (korak ${zapisBroja(m.mreza[1])})`,
        );
      }
      return list;
    }

    if (s.nacin === "utjecaj") {
      need(
        Object.keys(PROMJENE).includes(s.promjena),
        `promjena je jedna od: ${Object.keys(PROMJENE).join(", ")}`,
      );
      if (s.pitaj != null)
        need(
          ["oboje", "smjer", "razlog"].includes(s.pitaj),
          'pitaj je "oboje", "smjer" ili "razlog"',
        );
      if (s.razlozi != null && PROMJENE[s.promjena]) {
        need(
          Array.isArray(s.razlozi) &&
            s.razlozi.length >= 2 &&
            s.razlozi.length <= 5 &&
            s.razlozi.every((r) => r in RAZLOZI) &&
            new Set(s.razlozi).size === s.razlozi.length,
          `razlozi: 2–5 različitih iz: ${Object.keys(RAZLOZI).join(", ")}`,
        );
        if (Array.isArray(s.razlozi))
          need(
            s.razlozi.includes(PROMJENE[s.promjena].razlog),
            `među razlozima mora biti točni: ${PROMJENE[s.promjena].razlog}`,
          );
        if (s.pitaj === "smjer") need(false, 'uz pitaj: "smjer" nema razloga');
      }
      return list;
    }

    if (s.nacin === "omjer") {
      const pm = validatePokus(s, need);
      if (s.prikaz != null)
        need(
          ["graf", "pokus"].includes(s.prikaz),
          'prikaz je "graf" ili "pokus"',
        );
      if (
        !need(
          Array.isArray(s.usporedi) &&
            s.usporedi.length === 2 &&
            s.usporedi.every(isNum) &&
            s.usporedi[0] !== s.usporedi[1],
          "usporedi je [x₁, x₂]: dvije različite temperature (°C) ili koncentracije (mol/dm³)",
        )
      )
        return list;
      if (!pm || list.length) return list;
      if (pm.mijenja === "temperatura")
        need(
          s.usporedi.every((x) => x >= 0 && x <= 80),
          "temperature u usporedi su između 0 i 80 °C",
        );
      else
        need(
          s.usporedi.every((x) => x > 0 && x <= pm.ot.c),
          `koncentracije u usporedi su između 0 i ${zapisBroja(pm.ot.c)} mol/dm³ (koncentracija otopine tiosulfata)`,
        );
      for (const o of ["os_x", "os_y"])
        if (s[o] != null)
          need(
            Array.isArray(s[o]) &&
              s[o].length === 2 &&
              s[o].every(isNum) &&
              s[o][1] > s[o][0],
            `${o} je [od, do]`,
          );
      if (s.mreza != null)
        need(
          Array.isArray(s.mreza) &&
            s.mreza.length === 2 &&
            s.mreza.every((x) => isNum(x) && x > 0),
          "mreza je [korak x, korak t]",
        );
      if (list.length) return list;
      const o = omjerOf(s, pm);
      for (const t of [o.t1, o.t2])
        need(
          t >= 2 && t <= 600,
          `vrijeme zamućenja ${zapisBroja(t)} s nije razumno (2–600 s): promijeni t_ref ili usporedi`,
        );
      if (prikazOf(s) === "graf") {
        const G = grafPokusaOf(s, pm);
        need(
          s.usporedi.every((x) => x >= G.x[0] && x <= G.x[1]),
          "vrijednosti iz usporedi moraju biti na osi x",
        );
        need(
          Math.max(o.t1, o.t2) <= G.y[1],
          `os_y mora obuhvatiti ${zapisBroja(Math.max(o.t1, o.t2))} s`,
        );
        if (s.koraci !== false) {
          for (const t of [o.t1, o.t2])
            need(
              naMrezi(t, G.mreza[1]),
              `vrijeme ${zapisBroja(t, 3)} s ne pada na crtu mreže (korak ${zapisBroja(G.mreza[1])}): učenik ga ne može očitati`,
            );
          for (const x of s.usporedi)
            need(
              naMrezi(x, G.mreza[0]),
              `${zapisX(pm, x)} ne pada na crtu mreže osi x`,
            );
        }
      }
      return list;
    }
    return list;
  },

  // prosjecna: {koraci: [...]} ili popis upisa; iz_grafa: {promjene?, uloge, koef, strelica}; utjecaj: {smjer, razlog};
  // omjer: {koraci: [...]}
  check(s, odgovor) {
    if (s.nacin === "istrazi")
      return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    if (s.nacin === "utjecaj") return provjeriUtjecaj(s, odgovor);
    if (s.nacin === "iz_grafa") return provjeriIzGrafa(s, odgovor);
    if (s.nacin === "omjer") return provjeriOmjer(s, odgovor);
    return provjeriProsjecnu(s, odgovor);
  },

  brojcaniOdgovor(s) {
    if (s.nacin === "prosjecna") {
      const v = lanacOf(s, modelZaLanac(s)).at(-1).vrijednost;
      return Number(v.toPrecision(3));
    }
    if (s.nacin === "omjer") return Number(omjerOf(s).puta.toPrecision(3));
    return null;
  },

  tocanOdgovor(s) {
    if (s.nacin === "istrazi") return "";
    if (s.nacin === "utjecaj") {
      const P = PROMJENE[s.promjena];
      const p = pitaUtjecaj(s);
      const smjer = `Reakcija je ${SMJER_NAZIV[P.smjer]}`;
      if (p === "smjer") return `${smjer}.`;
      if (p === "razlog") return RAZLOZI[P.razlog];
      return `${smjer}: ${RAZLOZI[P.razlog].charAt(0).toLowerCase()}${RAZLOZI[P.razlog].slice(1)}`;
    }
    if (s.nacin === "iz_grafa") {
      const m = modelOf(s);
      const g = izGrafaOf(s, m);
      const dio = [];
      if (s.promjene)
        dio.push(
          g.vrste
            .map(
              (v) =>
                `Δ${m.vel.simbol}(${v.f}) = ${sPredznakom(v.dc)} ${m.vel.jed}`,
            )
            .join(", "),
        );
      const ne = g.vrste.filter((v) => v.uloga === "ne").map((v) => v.f);
      dio.push(
        `${zapisReakcije(m.R.vrste, pitaStrelicu(s) ? g.strelica : "→")}${ne.length ? ` (${lista(ne)} ne sudjeluje)` : ""}`,
      );
      return dio.join("; ");
    }
    if (s.nacin === "omjer") {
      const pm = pokusOf(s);
      const o = omjerOf(s, pm);
      const L = lanacOmjera({ ...s, koraci: true }, pm);
      return `t₁ = ${zapisBroja(L[0].vrijednost)} s (${zapisX(pm, o.x1)}), t₂ = ${zapisBroja(L[1].vrijednost)} s (${zapisX(pm, o.x2)}); reakcija uz ${zapisX(pm, o.x1)} je ${formatNumber(Number(o.puta.toPrecision(3)))} puta ${o.brza ? "brža" : "sporija"}`;
    }
    const m = modelZaLanac(s);
    const L = lanacOf({ ...s, koraci: s.zadana_brzina ? undefined : true }, m);
    return L.map((k) =>
      k.citanje
        ? `${k.oznaka} = ${zapisBroja(k.vrijednost)} ${k.jed} (t = ${zapisT(k.pri)} ${m.jt})`
        : `${k.oznaka} = ${zapisJed(k.vrijednost, k.jed)} ${k.jed}`,
    ).join(" → ");
  },
};

export function modelZaLanac(s) {
  if (!s.zadana_brzina) return modelOf(s);
  const R = reakcijaOf(s);
  return {
    R,
    nuOd: (f) => R.vrste.find((v) => v.f === f)?.nu ?? 0,
    vel: VELICINE[s.velicina ?? "c"] ?? VELICINE.c,
    jt: s.jedinica_t ?? "s",
    mreza: [1, 1],
    prikazane: [],
  };
}

function validatePokus(s, need) {
  const p = s.pokus;
  if (
    !need(
      p && typeof p === "object",
      'pokus je {mijenja: "temperatura" | "koncentracija", t_ref?, ref?, faktor_10?, otopina?, sobna?}',
    )
  )
    return null;
  for (const f of Object.keys(p))
    need(
      ["mijenja", "t_ref", "ref", "faktor_10", "otopina", "sobna"].includes(f),
      `pokus nema polje „${f}“`,
    );
  need(
    POKUS_MIJENJA.includes(p.mijenja),
    'pokus.mijenja je "temperatura" ili "koncentracija"',
  );
  if (p.t_ref != null)
    need(
      isNum(p.t_ref) && p.t_ref >= 5 && p.t_ref <= 600,
      "pokus.t_ref (s) je između 5 i 600",
    );
  if (p.faktor_10 != null)
    need(
      isNum(p.faktor_10) && p.faktor_10 >= 1.2 && p.faktor_10 <= 4,
      "pokus.faktor_10 (koliko je puta brža za 10 °C) je između 1,2 i 4",
    );
  if (p.sobna != null)
    need(
      isNum(p.sobna) && p.sobna >= 10 && p.sobna <= 30,
      "pokus.sobna (°C) je između 10 i 30",
    );
  if (p.otopina != null) {
    if (
      need(
        typeof p.otopina === "object",
        "pokus.otopina je {c, kiselina_mL, ukupno_mL}",
      )
    ) {
      for (const f of Object.keys(p.otopina))
        need(
          ["c", "kiselina_mL", "ukupno_mL"].includes(f),
          `pokus.otopina nema polje „${f}“`,
        );
      const o = p.otopina;
      if (o.c != null)
        need(
          isNum(o.c) && o.c > 0 && o.c <= 1,
          "pokus.otopina.c (mol/dm³) je između 0 i 1",
        );
      if (o.kiselina_mL != null)
        need(
          isNum(o.kiselina_mL) && o.kiselina_mL > 0 && o.kiselina_mL <= 5,
          "pokus.otopina.kiselina_mL je između 0 i 5",
        );
      if (o.ukupno_mL != null)
        need(
          isNum(o.ukupno_mL) && o.ukupno_mL >= 3 && o.ukupno_mL <= 15,
          "pokus.otopina.ukupno_mL je između 3 i 15",
        );
    }
  }
  if (p.ref != null) {
    if (p.mijenja === "temperatura")
      need(
        isNum(p.ref) && p.ref >= 0 && p.ref <= 80,
        "pokus.ref (°C) je između 0 i 80",
      );
    else
      need(
        isNum(p.ref) && p.ref > 0 && p.ref <= 1,
        "pokus.ref (c tiosulfata u epruveti, mol/dm³) je između 0 i 1",
      );
  }
  const pm = pokusOf(s);
  need(
    pm.voda(1) >= 0,
    "u epruvetu ne stane 1 mL tiosulfata uz kiselinu: povećaj pokus.otopina.ukupno_mL",
  );
  return pm;
}

// ── provjere ──
function citajBroj(ulaz) {
  let u = String(ulaz ?? "").trim();
  if (u.includes("=")) u = u.slice(u.lastIndexOf("=") + 1).trim();
  u = u
    .replace(
      /\s*(mol\s*dm⁻³\s*(s|min)⁻¹|mol\s*\/\s*\(?dm³\s*(·\s*)?(s|min)\)?|mol\/\(L\s*s\)|mol\s*\/\s*dm³|mol\/L|mol|kPa|cm³|s|min|puta|×)\s*$/i,
      "",
    )
    .trim();
  return { tekst: u, broj: parseNumber(u) };
}

function provjeriProsjecnu(s, odgovor) {
  const m = modelZaLanac(s);
  const unosi = Array.isArray(odgovor)
    ? odgovor
    : [].concat(odgovor?.koraci ?? []);
  const koraci = lanacOf(s, m);
  const k = {};
  const bezKoraka = koraci.length === 1;
  if (bezKoraka && !s.zadana_brzina)
    for (const x of lanacOf({ ...s, koraci: true }, m).slice(0, -1))
      k[x.id] = x.vrijednost;
  const pct = tolPosto(s);
  for (let i = 0; i < koraci.length; i++) {
    const kor = koraci[i];
    const izUcenika = kor.f(k);
    const prihvaceno = [kor.vrijednost, izUcenika].filter(isNum);
    const tol = (v) => (kor.citanje ? tolCitanja(m, v) : Math.abs(v) * pct);
    const posebne =
      i === koraci.length - 1 && Array.isArray(s.krivo)
        ? s.krivo.map((x) => ({ v: x.vrijednost, poruka: x.poruka }))
        : [];
    const krivo = [...posebne, ...greskeLanca(kor.id, bezKoraka ? {} : k, s, m)]
      .filter((g) => !prihvaceno.some((v) => near(g.v, v, tol(v))))
      .map((g) => ({
        vrijednost: g.v,
        poruka: g.poruka,
        tolerancija: kor.citanje
          ? tolCitanja(m, g.v) * 0.8
          : Math.abs(g.v) * pct,
      }));
    const { tekst, broj } = citajBroj(unosi[i]);
    let r;
    if (isNum(broj) && prihvaceno.some((v) => near(broj, v, tol(v))))
      r = { tocno: true };
    else {
      const savjet =
        s.savjet ||
        (kor.citanje
          ? `Očitaj krivulju ${kor.oznaka.replace(/^[a-zA-Z]\(|\)$/g, "")} točno iznad t = ${zapisT(kor.pri)} ${m.jt}, pa vodoravno do osi.`
          : "Nije točno. Provjeri predznak, Δt i koeficijent.");
      r = checkNumber({
        input: broj ?? tekst,
        answer: kor.vrijednost,
        tol: tol(kor.vrijednost),
        unit: "",
        krivo,
        savjet,
      });
    }
    if (!r.tocno)
      return koraci.length > 1
        ? {
            ...r,
            praznina: i,
            poruka: `${kor.oznaka}${kor.citanje ? ` pri ${zapisT(kor.pri)} ${m.jt}` : ""}: ${r.poruka}`,
          }
        : { ...r, praznina: 0 };
    k[kor.id] = broj;
  }
  return { tocno: true };
}

function provjeriOmjer(s, odgovor) {
  const pm = pokusOf(s);
  const G = grafPokusaOf(s, pm);
  const o = omjerOf(s, pm);
  const unosi = Array.isArray(odgovor)
    ? odgovor
    : [].concat(odgovor?.koraci ?? []);
  const koraci = lanacOmjera(s, pm);
  const k = {};
  if (koraci.length === 1) Object.assign(k, { t1: o.t1, t2: o.t2 });
  const pct = tolPosto(s);
  const tolT = (v) =>
    prikazOf(s) === "pokus"
      ? Math.max(1, v * 0.02)
      : Math.max(v * 0.02, G.mreza[1] * 0.2);
  for (let i = 0; i < koraci.length; i++) {
    const kor = koraci[i];
    const izUcenika = kor.f(k);
    const prihvaceno = [kor.vrijednost, izUcenika].filter(isNum);
    const tol = (v) => (kor.citanje ? tolT(v) : Math.abs(v) * pct);
    const out = [];
    const add = (v, poruka) => isNum(v) && v > 0 && out.push({ v, poruka });
    if (kor.citanje) {
      const drugi = kor.id === "t1" ? o.t2 : o.t1;
      add(
        drugi,
        `To je vrijeme za ${zapisX(pm, kor.id === "t1" ? o.x2 : o.x1)}.`,
      );
    } else {
      const t1 = k.t1 ?? o.t1;
      const t2 = k.t2 ?? o.t2;
      const brzi = Math.min(t1, t2);
      const spori = Math.max(t1, t2);
      add(
        brzi / spori,
        `Kraće vrijeme znači bržu reakciju: ista količina sumpora nastane u kraćem vremenu. Podijeli dulje vrijeme kraćim: ${zapisBroja(spori)} s : ${zapisBroja(brzi)} s.`,
      );
      add(
        spori - brzi,
        "Traži se koliko puta, a ne za koliko sekundi: vremena podijeli, ne oduzimaj.",
      );
    }
    const krivo = out
      .filter((g) => !prihvaceno.some((v) => near(g.v, v, tol(v))))
      .map((g) => ({
        vrijednost: g.v,
        poruka: g.poruka,
        tolerancija: tol(g.v) * 0.8,
      }));
    const { tekst, broj } = citajBroj(unosi[i]);
    let r;
    if (isNum(broj) && prihvaceno.some((v) => near(broj, v, tol(v))))
      r = { tocno: true };
    else {
      const savjet =
        s.savjet ||
        (kor.citanje
          ? prikazOf(s) === "pokus"
            ? "Pomiješaj epruvetu i očitaj zaporni sat kad znak X nestane."
            : `Očitaj krivulju točno iznad ${zapisX(pm, kor.pri)}, pa vodoravno do osi t.`
          : "Koliko puta je jedno vrijeme dulje od drugoga?");
      r = checkNumber({
        input: broj ?? tekst,
        answer: kor.vrijednost,
        tol: tol(kor.vrijednost),
        unit: "",
        krivo,
        savjet,
      });
    }
    if (!r.tocno)
      return koraci.length > 1
        ? {
            ...r,
            praznina: i,
            poruka: `${kor.citanje ? `${kor.oznaka} (${zapisX(pm, kor.pri)})` : "Omjer"}: ${r.poruka}`,
          }
        : { ...r, praznina: 0 };
    k[kor.id] = broj;
  }
  return { tocno: true };
}

function provjeriUtjecaj(s, odgovor) {
  const p = pitaUtjecaj(s);
  const smjer = odgovor?.smjer ?? null;
  const razlog = odgovor?.razlog ?? null;
  if (
    (p !== "razlog" && !SMJEROVI.includes(smjer)) ||
    (p !== "smjer" && !razlog)
  )
    return {
      tocno: false,
      poruka:
        p === "oboje"
          ? "Odaberi kako se brzina mijenja i zašto."
          : p === "smjer"
            ? "Odaberi kako se brzina mijenja."
            : "Odaberi razlog.",
      prazno: true,
    };
  if (p !== "razlog") {
    const ps = porukaSmjera(s.promjena, smjer);
    if (ps) return { tocno: false, poruka: ps, krivo: "smjer" };
  }
  if (p !== "smjer") {
    const pr = porukaRazloga(s.promjena, razlog);
    if (pr) return { tocno: false, poruka: pr, krivo: "razlog" };
  }
  return { tocno: true };
}

function provjeriIzGrafa(s, odgovor) {
  const m = modelOf(s);
  const g = izGrafaOf(s, m);
  const sym = m.vel.simbol;
  const o = odgovor ?? {};
  if (s.promjene) {
    const unosi = o.promjene ?? [];
    for (let i = 0; i < g.vrste.length; i++) {
      const v = g.vrste[i];
      const { broj } = citajBroj(unosi[i]);
      if (!isNum(broj))
        return {
          tocno: false,
          poruka: `Upiši Δ${sym}(${v.f}) (0 ako se ne mijenja).`,
          prazno: true,
          polje: { vrsta: i, sto: "promjena" },
        };
      const tol = Math.max(Math.abs(v.dc) * 0.03, m.mreza[1] * 0.2);
      if (near(broj, v.dc, tol)) continue;
      let poruka = `Δ${sym}(${v.f}) nije točno. Promjena je kraj minus početak: očitaj ${v.f} na početku i kad se krivulja izravna.`;
      if (Math.abs(v.dc) > 1e-12 && near(broj, -v.dc, tol))
        poruka =
          v.dc < 0
            ? `${v.f} pada, pa je Δ${sym}(${v.f}) negativan: kraj minus početak.`
            : `${v.f} raste, pa je Δ${sym}(${v.f}) pozitivan: kraj minus početak.`;
      else if (near(broj, v.ck, tol) && Math.abs(v.ck - v.dc) > tol)
        poruka = `To je ${sym}(${v.f}) na kraju. Promjena je kraj minus početak.`;
      else if (near(broj, v.c0, tol) && Math.abs(v.c0 - v.dc) > tol)
        poruka = `To je ${sym}(${v.f}) na početku. Promjena je kraj minus početak.`;
      else if (Math.abs(v.dc) < 1e-12)
        poruka = `Krivulja ${v.f} je vodoravna: ${v.f} se ne mijenja, pa je Δ${sym}(${v.f}) = 0.`;
      return { tocno: false, poruka, polje: { vrsta: i, sto: "promjena" } };
    }
  }
  const uloge = o.uloge ?? [];
  if (g.vrste.some((_, i) => !ULOGE.includes(uloge[i])))
    return {
      tocno: false,
      poruka: "Za svaku tvar odaberi je li reaktant, produkt ili ne sudjeluje.",
      prazno: true,
    };
  for (let i = 0; i < g.vrste.length; i++) {
    const v = g.vrste[i];
    if (uloge[i] === v.uloga) continue;
    let poruka;
    if (v.uloga === "ne")
      poruka = `Krivulja ${v.f} je vodoravna: ${v.f} se ne troši i ne nastaje, pa ne sudjeluje u reakciji.`;
    else if (v.uloga === "reaktant")
      poruka = `${sym}(${v.f}) pada: ${v.f} se troši, pa je reaktant.`;
    else
      poruka = `${sym}(${v.f}) raste${Math.abs(v.c0) < 1e-12 ? " od nule" : ""}: ${v.f} nastaje, pa je produkt.`;
    return { tocno: false, poruka, polje: { vrsta: i, sto: "uloga" } };
  }
  // koeficijenti sudionika (prazno = 1)
  const ud = g.vrste
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v.uloga !== "ne");
  const koef = [];
  for (const { v, i } of ud) {
    const x = String(o.koef?.[i] ?? "").trim();
    const n = x === "" ? 1 : /^\d+$/.test(x) ? Number(x) : null;
    if (n == null)
      return {
        tocno: false,
        poruka: `Koeficijent je cijeli broj (prazno polje znači 1)${/[,./]/.test(x) ? ". Ako ti je ispao razlomak, pomnoži sve koeficijente da dobiješ cijele." : "."}`,
        polje: { vrsta: i, sto: "koef" },
      };
    if (n === 0)
      return {
        tocno: false,
        poruka: `Koeficijent ne može biti 0. ${v.f} sudjeluje u reakciji.`,
        polje: { vrsta: i, sto: "koef" },
      };
    koef.push(n);
  }
  const tocni = ud.map((x) => x.v.koef);
  const razmjerno = (a, b) =>
    a.every(
      (x, j) =>
        Math.abs(x * b[0] - b[j] * a[0]) <= 0.02 * Math.abs(b[j] * a[0]),
    );
  if (!koef.every((x, j) => x === tocni[j])) {
    if (razmjerno(koef, tocni))
      return {
        tocno: false,
        poruka: `Omjer je dobar, ali koeficijente možeš podijeliti s ${nzd(koef)}. Traže se najmanji cijeli brojevi.`,
        polje: { sto: "koef" },
      };
    if (
      ud.length > 1 &&
      razmjerno(
        koef,
        ud.map((x) => x.v.ck),
      ) &&
      !razmjerno(
        tocni,
        ud.map((x) => x.v.ck),
      )
    )
      return {
        tocno: false,
        poruka:
          "Koeficijenti se ne čitaju iz konačnih koncentracija, nego iz promjena: koliko je koje tvari nestalo ili nastalo u istom vremenu.",
        polje: { sto: "koef" },
      };
    if (!m.R.opce) {
      const L = ud.filter((x) => x.v.uloga === "reaktant").map((x) => x.v.f);
      const D = ud.filter((x) => x.v.uloga === "produkt").map((x) => x.v.f);
      const red = [...L, ...D];
      const unos = red.map((f) => koef[ud.findIndex((x) => x.v.f === f)]);
      const pk = provjeriKoef({ reaktanti: L, produkti: D }, unos);
      if (!pk.tocno && !/najmanji|drugi koeficijenti/.test(pk.poruka))
        return {
          tocno: false,
          poruka: `${pk.poruka} Koeficijenti se odnose kao promjene koncentracija.`,
          polje: { sto: "koef" },
        };
    }
    // koja dva se ne slažu
    const a = ud[0];
    const j = koef.findIndex(
      (x, jj) => Math.abs(x * tocni[0] - tocni[jj] * koef[0]) > 1e-9,
    );
    const b = ud[j >= 0 ? j : 1];
    return {
      tocno: false,
      poruka: `Omjer koeficijenata ${a.v.f} i ${b.v.f} nije kao omjer njihovih promjena: usporedi za koliko je ${a.v.f} ${a.v.dc < 0 ? "pao" : "porastao"}, a za koliko ${b.v.f} ${b.v.dc < 0 ? "pao" : "porastao"}.`,
      polje: { sto: "koef" },
    };
  }
  if (pitaStrelicu(s)) {
    if (!["→", "⇌"].includes(o.strelica))
      return {
        tocno: false,
        poruka: "Odaberi strelicu: → ili ⇌.",
        prazno: true,
      };
    if (o.strelica !== g.strelica) {
      const reakt = g.vrste.filter((v) => v.uloga === "reaktant");
      if (g.strelica === "⇌")
        return {
          tocno: false,
          poruka: `Krivulje postanu vodoravne, a ${reakt.length > 1 ? "nijedan reaktant ne padne" : `${reakt[0].f} ne padne`} na nulu: smjesa je u ravnoteži, pa je reakcija povratna (⇌).`,
          polje: { sto: "strelica" },
        };
      const nest = reakt.find((v) => Math.abs(v.ck) < 1e-9);
      return {
        tocno: false,
        poruka: `${nest ? `${nest.f} potpuno nestane` : "Reaktant potpuno nestane"}: reakcija ide do kraja, pa je strelica →.`,
        polje: { sto: "strelica" },
      };
    }
  }
  return { tocno: true };
}

// ── model sudara (istrazi, prikaz "sudari") ──
// Udio sudara s energijom barem Eₐ: e^(−Eₐ/RT), normiran tako da pri 20 °C bez katalizatora bude 5 %; Eₐ je odabrana
// tako da je reakcija oko 2 puta brža za 10 °C (kao u pokusu 17); katalizator snizuje Eₐ.
export const SUDARI = { Ea: 51, EaKat: 45, R: 8.314e-3, udio20: 0.05 };
export function udioUspjesnih(T_C, kat) {
  const T = T_C + 273.15;
  const Ea = kat ? SUDARI.EaKat : SUDARI.Ea;
  const A = SUDARI.udio20 / Math.exp(-SUDARI.Ea / (SUDARI.R * 293.15));
  return Math.min(1, A * Math.exp(-Ea / (SUDARI.R * T)));
}
// relativna brzina (pri 20 °C, koncentraciji 1, komadu, bez katalizatora = 1): sudari ∝ c·√T (ili površina), uspješni ∝ udio
export function relativnaBrzina({ T, c = 1, kat = false, povrsina = 1 }) {
  const sudari = c * povrsina * Math.sqrt((T + 273.15) / 293.15);
  return (sudari * udioUspjesnih(T, kat)) / udioUspjesnih(20, false);
}
// Raspodjela energije čestica za sliku (Maxwell–Boltzmann): E je u jedinicama Eₐ bez katalizatora, a kT na slici raste
// s temperaturom brže nego stvarno, da se pomak „repa“ iza Eₐ vidi. Udio uspješnih sudara uvijek je iz udioUspjesnih.
export const kTslike = (T_C) => 0.3 * ((T_C + 273.15) / 293.15) ** 4;
export const EA_SLIKA = { bez: 1, kat: SUDARI.EaKat / SUDARI.Ea };
export const raspodjela = (E, T_C) => {
  const kT = kTslike(T_C);
  return (
    ((2 * Math.sqrt(Math.max(0, E) / Math.PI)) / kT ** 1.5) * Math.exp(-E / kT)
  );
};
