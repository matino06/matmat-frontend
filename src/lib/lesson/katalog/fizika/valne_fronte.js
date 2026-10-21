// valne_fronte: valovi odozgo, u dvije scene s istim „motorom“ (izvor u jednakim razmacima šalje kružne fronte iz svog
// trenutnog položaja, polumjer v·(t − t_k)).
// - "dva_izvora": dva izvora na vodi titraju jednako (ili u protufazi). Točka P, putovi s₁ i s₂, razlika putova u
//   valnim duljinama, titranje u P od svakog vala i njihov zbroj, čvorne crte (hiperbole).
// - "pokretni_izvor": vozilo sa sirenom prolazi kraj promatrača. Ispred vozila fronte su gušće, iza rjeđe; graf
//   frekvencije koju promatrač čuje. Brojevi za „prije“ i „poslije“ su iz kolinearne formule iz knjižice.
// Sva fizika, geometrija scene (u metrima) i ono što je u kojem načinu skriveno računa se ovdje kao čiste funkcije
// (spec, stanje) → JSON; komponenta (i iOS) samo crta i prosljeđuje unos.
import { isNum, near, tolerance } from "../../core/number.js";
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
  klizaciOd,
  klizacZa,
  pocetneVrijednosti,
  iznos,
  validateKlizaci,
  broj,
  iznosJed,
} from "./_sile.js";

const TIP = "valne_fronte";
export const SCENE = ["dva_izvora", "pokretni_izvor"];
export const NACINI = {
  dva_izvora: ["istrazi", "odaberi", "izracunaj", "postavi"],
  pokretni_izvor: ["istrazi", "predvidi", "izracunaj", "postavi"],
};
export const PRIKAZI = ["fronte", "cvorne_crte", "grafovi_P", "brojaci"];
export const VELICINE = ["lambda", "ds", "omjer", "A_P", "A_jednaki"];
const JED_DULJINE = { m: 1, cm: 100, mm: 1000 };
const JED_A = ["mm", "cm"];
export const FAZE = ["priblizava", "udaljava", "miruje"];
export const PROCJENE = ["visi", "isti", "nizi"];
export const TON = { visi: "viši", isti: "isti", nizi: "niži" };
export const V_ZVUKA = 340;
export const IKONE = ["vozilo", "zvucnik"];
export const VRSTE_CILJA = ["pojacanje", "ponistavanje"];
export const ODABIR = [
  { id: "pojacanje", tekst: "pojačanje", opis: "brijeg dolazi na brijeg" },
  {
    id: "ponistavanje",
    tekst: "poništavanje",
    opis: "brijeg dolazi na dolinu",
  },
];
const VRSTA_TEKST = {
  pojacanje: "pojačanje",
  ponistavanje: "poništavanje",
  djelomicno: "djelomično",
};
const FAZA_TEKST = {
  priblizava: "dok se približava",
  udaljava: "nakon što prođe",
  miruje: "dok stoji",
};

// broj u tekstu odgovora: do 4 značajne znamenke (755,6 Hz), bez repova zaokruživanja
const tocnije = (n) => broj(n, 4);

// ══ dva izvora ═════════════════════════════════════════════════════════════════════════════════════
export function fizikaDvaIzvora(s, p = pocetneVrijednosti(s)) {
  const [i1, i2] = Array.isArray(s.izvori) ? s.izvori : [];
  const v = iznos(s, s.v, p);
  const T = s.T != null ? iznos(s, s.T, p) : 1 / iznos(s, s.f, p);
  return {
    A1: iznos(s, i1?.A, p),
    A2: iznos(s, i2?.A, p),
    v,
    T,
    f: 1 / T,
    lambda: v * T,
    faza: i2?.faza === 180 ? 180 : 0,
    jedinica_A: s.jedinica_A ?? "mm",
  };
}

// razmak izvora: zadan, ili tako da trokut S₁S₂P postoji i lijepo stane
export function razmakIzvora(s) {
  if (isNum(s.d)) return s.d;
  const { s1, s2 } = s.tocka;
  const ds = Math.abs(s2 - s1);
  return ds + 0.3 * (s1 + s2 - ds);
}

// P iz putova: S₁ = (0, −d/2), S₂ = (0, d/2), os y prema dolje (kao na zaslonu), P desno od izvora
export function tockaIzPutova(d, s1, s2) {
  const y = (s1 * s1 - s2 * s2) / (2 * d);
  return { x: Math.sqrt(Math.max(0, s1 * s1 - (y + d / 2) ** 2)), y };
}

export const OMJER_VODE = 1.5; // širina : visina prikazane vode
export function rasporedDvaIzvora(s) {
  const d = razmakIzvora(s);
  const S1 = { x: 0, y: -d / 2 };
  const S2 = { x: 0, y: d / 2 };
  const P = tockaIzPutova(d, s.tocka.s1, s.tocka.s2);
  const xmin = Math.min(0, P.x);
  const xmax = Math.max(0, P.x);
  const ymin = Math.min(S1.y, P.y);
  const ymax = Math.max(S2.y, P.y);
  const rub = 0.16 * Math.max(xmax - xmin, ymax - ymin);
  let x0 = xmin - rub;
  let x1 = xmax + rub;
  let y0 = ymin - rub;
  let y1 = ymax + rub;
  // izvori ostaju uz lijevi rub, a voda se produlji udesno (ili gore i dolje)
  if ((x1 - x0) / (y1 - y0) < OMJER_VODE) x1 = x0 + (y1 - y0) * OMJER_VODE;
  else {
    const h = (x1 - x0) / OMJER_VODE;
    const c = (y0 + y1) / 2;
    y0 = c - h / 2;
    y1 = c + h / 2;
  }
  const okvir = { x0, y0, x1, y1 };
  const doseg = Math.max(
    ...[S1, S2].flatMap((S) =>
      [
        [x0, y0],
        [x1, y0],
        [x0, y1],
        [x1, y1],
      ].map(([x, y]) => Math.hypot(x - S.x, y - S.y)),
    ),
  );
  return { d, S1, S2, P, okvir, doseg };
}

export function vrstaInterferencije(r, faza = 0, tol = 1e-6) {
  const g = Math.abs(r) - faza / 360;
  const e = Math.abs(g - Math.round(g));
  if (e <= tol) return "pojacanje";
  if (Math.abs(e - 0.5) <= tol) return "ponistavanje";
  return "djelomicno";
}

// stanje u točki iz putova: razlika putova, omjer Δs/λ, amplituda zbroja (fazori) i vrsta interferencije
export function uPutovima(s, p, s1, s2) {
  const fz = fizikaDvaIzvora(s, p);
  const ds = s2 - s1;
  const omjer = ds / fz.lambda;
  const delta = (fz.faza * Math.PI) / 180 - 2 * Math.PI * omjer;
  const A_P = Math.sqrt(
    Math.max(0, fz.A1 ** 2 + fz.A2 ** 2 + 2 * fz.A1 * fz.A2 * Math.cos(delta)),
  );
  return {
    s1,
    s2,
    ds,
    omjer,
    A_P,
    A_jednaki: fz.faza === 180 ? Math.abs(fz.A1 - fz.A2) : fz.A1 + fz.A2,
    vrsta: vrstaInterferencije(omjer, fz.faza),
    lambda: fz.lambda,
  };
}
export function uTocki(s, p, P, rs = rasporedDvaIzvora(s)) {
  return uPutovima(
    s,
    p,
    Math.hypot(P.x - rs.S1.x, P.y - rs.S1.y),
    Math.hypot(P.x - rs.S2.x, P.y - rs.S2.y),
  );
}
// vrijednosti iz zadatka (putovi iz speca, ne iz geometrije)
export const zadatakDvaIzvora = (s) =>
  uPutovima(s, pocetneVrijednosti(s), s.tocka.s1, s.tocka.s2);

// otklon u P od svakog vala i zbroj; izvori počnu titrati u t = 0, val stigne nakon s/v
export function titranjeUTocki(s, p, s1, s2, t) {
  const fz = fizikaDvaIzvora(s, p);
  const w = (2 * Math.PI) / fz.T;
  const t1 = s1 / fz.v;
  const t2 = s2 / fz.v;
  const y1 = t >= t1 ? fz.A1 * Math.sin(w * (t - t1)) : 0;
  const y2 =
    t >= t2 ? fz.A2 * Math.sin(w * (t - t2) + (fz.faza * Math.PI) / 180) : 0;
  return { y1, y2, y: y1 + y2, stigao1: t >= t1, stigao2: t >= t2 };
}
// zadnja 2,5 perioda titranja u P (za male grafove uz P)
export function grafoviUTocki(s, p, s1, s2, t, n = 72) {
  const fz = fizikaDvaIzvora(s, p);
  const prozor = 2.5 * fz.T;
  const tocke = [];
  for (let i = 0; i <= n; i++) {
    const ti = t - prozor + (prozor * i) / n;
    tocke.push({ t: ti, ...titranjeUTocki(s, p, s1, s2, Math.max(0, ti)) });
  }
  return { prozor, tocke, Amax: fz.A1 + fz.A2 };
}

// fronte: brijeg kad izvor prolazi kroz gornji položaj, dolina pola perioda kasnije. Samo fronte do dosega.
export function fronteDvaIzvora(s, p, t, rs = rasporedDvaIzvora(s), doseg) {
  const fz = fizikaDvaIzvora(s, p);
  const R = doseg ?? rs.doseg;
  const out = [];
  [rs.S1, rs.S2].forEach((S, i) => {
    const fi = i === 1 ? (fz.faza * Math.PI) / 180 : 0;
    for (const [brijeg, f0] of [
      [true, Math.PI / 2],
      [false, (3 * Math.PI) / 2],
    ]) {
      let prva = (((f0 - fi) / (2 * Math.PI)) % 1) * fz.T;
      if (prva < 0) prva += fz.T;
      const k0 = Math.max(0, Math.ceil((t - R / fz.v - prva) / fz.T));
      for (let k = k0; prva + k * fz.T <= t; k++) {
        const r = fz.v * (t - prva - k * fz.T);
        if (r > 0 && r <= R)
          out.push({ izvor: i, x: S.x, y: S.y, r, brijeg, udio: r / R });
      }
    }
  });
  return out;
}

// crta stalne razlike putova Δs = s₂ − s₁ = c: grana hiperbole sa žarištima u izvorima (c > 0: bliže S₁)
export function linijaRazlike(rs, c, n = 56) {
  const { d, okvir } = rs;
  const a = Math.abs(c) / 2;
  const h = d / 2;
  if (a >= h) return [];
  if (a < 1e-12)
    return [
      [okvir.x0, 0],
      [okvir.x1, 0],
    ];
  const b = Math.sqrt(h * h - a * a);
  const X = Math.max(Math.abs(okvir.x0), Math.abs(okvir.x1)) * 1.05;
  const Y = Math.max(Math.abs(okvir.y0), Math.abs(okvir.y1)) * 1.05;
  // dovoljno daleko da crta izađe iz vode i vodoravno i okomito
  const U = Math.min(Math.asinh(X / b), Math.acosh(Math.max(1, Y / a)) + 0.05);
  const pred = c > 0 ? -1 : 1;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = -U + (2 * U * i) / n;
    out.push([b * Math.sinh(u), pred * a * Math.cosh(u)]);
  }
  return out;
}

// čvorne crte (poništavanje): Δs = (n + ½)λ uz izvore u fazi, Δs = nλ uz izvore u protufazi
export function cvorneCrte(s, p, rs = rasporedDvaIzvora(s)) {
  const { lambda, faza } = fizikaDvaIzvora(s, p);
  const baza = 0.5 + faza / 360;
  const out = [];
  const nMax = Math.ceil(rs.d / lambda) + 1;
  for (let n = -nMax; n <= nMax; n++) {
    const r = n + baza;
    const c = r * lambda;
    if (Math.abs(c) < rs.d * 0.999)
      out.push({ omjer: r, tocke: linijaRazlike(rs, c) });
  }
  return out;
}

// postavi: omjeri |Δs|/λ koji ostvaruju cilj (jedan uz zadan red, inače svi u vodi)
export function ciljniOmjeri(s, p, rs = rasporedDvaIzvora(s)) {
  const { lambda, faza } = fizikaDvaIzvora(s, p);
  const cilj = s.cilj ?? {};
  const pola = (cilj.vrsta === "ponistavanje") !== (faza === 180);
  if (isNum(cilj.red)) return [cilj.red + (pola ? 0.5 : 0)];
  const out = [];
  for (let k = pola ? 0.5 : 0; k * lambda < rs.d * 0.97; k++) out.push(k);
  return out;
}
const TOL_POSTAVI = 0.1; // u valnim duljinama
export function ostvarujeCilj(s, p, r, rs) {
  return ciljniOmjeri(s, p, rs).some(
    (k) => Math.abs(Math.abs(r) - k) <= TOL_POSTAVI,
  );
}
// točka u vodi koja ostvaruje cilj, najbliža zadanoj (za „pokaži točan odgovor“)
export function tockaZaCilj(s, odakle, p = pocetneVrijednosti(s)) {
  const rs = rasporedDvaIzvora(s);
  const { lambda } = fizikaDvaIzvora(s, p);
  const o = rs.okvir;
  const mx = 0.05 * (o.x1 - o.x0);
  const my = 0.05 * (o.y1 - o.y0);
  const blizu = 0.6 * Math.min(lambda, rs.d);
  let best = null;
  for (const k of ciljniOmjeri(s, p, rs))
    for (const c of k === 0 ? [0] : [k * lambda, -k * lambda]) {
      const crta =
        Math.abs(c) < 1e-12
          ? Array.from({ length: 61 }, (_, i) => [
              o.x0 + ((o.x1 - o.x0) * i) / 60,
              0,
            ])
          : linijaRazlike(rs, c, 240);
      for (const [x, y] of crta) {
        if (x < o.x0 + mx || x > o.x1 - mx || y < o.y0 + my || y > o.y1 - my)
          continue;
        if (
          Math.hypot(x - rs.S1.x, y - rs.S1.y) < blizu ||
          Math.hypot(x - rs.S2.x, y - rs.S2.y) < blizu
        )
          continue;
        const dist = Math.hypot(x - odakle.x, y - odakle.y);
        if (!best || dist < best.dist) best = { x, y, dist };
      }
    }
  return best && { x: best.x, y: best.y };
}

// istrazi: P se lijepi na crte gdje je Δs/λ cijeli ili polovični broj (lakše se očita „točno 2,5 λ“)
export function prilijepiP(s, p, P, rs = rasporedDvaIzvora(s)) {
  const { lambda } = fizikaDvaIzvora(s, p);
  let Q = { ...P };
  const u = uTocki(s, p, Q, rs);
  const cilj = Math.round(u.omjer * 2) / 2;
  if (Math.abs(u.omjer - cilj) > 0.06) return P;
  for (let i = 0; i < 3; i++) {
    const s1 = Math.hypot(Q.x - rs.S1.x, Q.y - rs.S1.y);
    const s2 = Math.hypot(Q.x - rs.S2.x, Q.y - rs.S2.y);
    if (s1 < 1e-9 || s2 < 1e-9) return P;
    const gx = (Q.x - rs.S2.x) / s2 - (Q.x - rs.S1.x) / s1;
    const gy = (Q.y - rs.S2.y) / s2 - (Q.y - rs.S1.y) / s1;
    const g2 = gx * gx + gy * gy;
    if (g2 < 1e-12) return P;
    const greska = s2 - s1 - cilj * lambda;
    Q = { x: Q.x - (greska * gx) / g2, y: Q.y - (greska * gy) / g2 };
  }
  return Q;
}

// usporenje prikaza: fronte prijeđu vodu za ~6 s, ali nikad brže od stvarnog vala
export function usporenjeDvaIzvora(s, p, rs = rasporedDvaIzvora(s)) {
  const { v, T } = fizikaDvaIzvora(s, p);
  return Math.max(1, (v * 6) / (rs.okvir.x1 - rs.okvir.x0), 0.5 / T);
}
// mirno stanje (smanjeno gibanje): oba vala odavno stigla do svakog kuta vode
export const ustaljenoDvaIzvora = (s, p, rs = rasporedDvaIzvora(s)) => {
  const { v, T } = fizikaDvaIzvora(s, p);
  return rs.doseg / v + 0.3 * T;
};

// ── što se vidi: u načinima s odgovorom nište ne odaje odgovor prije točnog odgovora ili „pokaži“ ──
export function vidljivoDvaIzvora(s, otkriveno) {
  const pr = new Set(Array.isArray(s.prikazi) ? s.prikazi : PRIKAZI);
  const sve = s.nacin === "istrazi" || otkriveno;
  let brojaci = [];
  if (sve && pr.has("brojaci")) {
    brojaci = ["lambda", "ds", "A_P"];
    if (
      s.nacin === "izracunaj" &&
      (s.pitaj ?? []).some((q) => q.velicina === "A_jednaki")
    )
      brojaci.push("A_jednaki");
  } else if (!sve && s.nacin === "postavi") brojaci = ["ds"];
  return {
    // prije odgovora samo mreškanje uz izvore: fronte do P otkrile bi brijeg na brijeg / dolinu
    fronte: sve && pr.has("fronte") ? "sve" : "mreskanje",
    cvorne_crte: sve && pr.has("cvorne_crte"),
    grafovi_P: sve && pr.has("grafovi_P"),
    brojaci,
    putovi: true, // s₁ i s₂ uz dužine: podaci iz zadatka (u postavi uživo)
    ciljne_crte: s.nacin === "postavi" && otkriveno,
    vuci: s.nacin === "istrazi" || (s.nacin === "postavi" && !otkriveno),
    lijepi: s.nacin === "istrazi",
  };
}

export function ocitanjaDvaIzvora(s, p, u, kljucevi) {
  const jA = s.jedinica_A ?? "mm";
  const r = Math.round(u.omjer * 100) / 100;
  const O = {
    lambda: {
      oznaka: "λ",
      tekst: iznosJed(u.lambda, "m"),
      naziv: "valna duljina, λ = v·T",
    },
    ds: {
      oznaka: "Δs",
      tekst: kljucevi.includes("lambda")
        ? `${iznosJed(Math.abs(u.ds), "m")} = ${broj(Math.abs(r))}\u00a0λ`
        : iznosJed(Math.abs(u.ds), "m"),
      naziv: "razlika putova",
    },
    A_P: {
      oznaka: "A_P",
      tekst: iznosJed(u.A_P, jA),
      naziv: `amplituda u P: ${VRSTA_TEKST[vrstaInterferencije(r, fizikaDvaIzvora(s, p).faza, 0.005)]}`,
    },
    A_jednaki: {
      oznaka: "A",
      tekst: iznosJed(u.A_jednaki, jA),
      naziv: "uz jednake putove",
    },
  };
  return kljucevi.map((k) => ({ kljuc: k, ...O[k] }));
}

export function putoviTekst(u) {
  return {
    s1: `s₁ = ${iznosJed(u.s1, "m")}`,
    s2: `s₂ = ${iznosJed(u.s2, "m")}`,
  };
}

// ══ pokretni izvor (Doppler) ═══════════════════════════════════════════════════════════════════════
export function fizikaDopplera(s, p = pocetneVrijednosti(s)) {
  const f = iznos(s, s.izvor?.f, p);
  const vi = iznos(s, s.izvor?.v, p);
  const v = isNum(s.v_zvuka) ? s.v_zvuka : V_ZVUKA;
  return {
    f,
    vi,
    v,
    f_prije: (f * v) / (v - vi),
    f_poslije: (f * v) / (v + vi),
    lambda: v / f,
    lambda_ispred: (v - vi) / f,
    lambda_iza: (v + vi) / f,
  };
}
export const frekvencijaFaze = (fz, faza) =>
  faza === "priblizava"
    ? fz.f_prije
    : faza === "udaljava"
      ? fz.f_poslije
      : fz.f;
export const tocnaProcjena = (faza) =>
  faza === "priblizava" ? "visi" : faza === "udaljava" ? "nizi" : "isti";

// cesta odozgo, u metrima: vozilo vozi slijeva nadesno, promatrač stoji uz cestu
export function rasporedDopplera(s) {
  const D = isNum(s.udaljenost) ? s.udaljenost : 6;
  return {
    sirina: 100,
    visina: 50,
    yCeste: 18,
    poluCeste: 3,
    xPromatraca: 56,
    yPromatraca: 18 + D,
    D,
    xPocetak: 4,
    xKraj: 98,
    xParkirano: 14,
    razmakFronti: 8, // m između prikazanih fronti mirnog izvora: nije u mjerilu (prava λ je oko 0,4 m)
  };
}
// prikaz: fronta prijeđe cestu za ~1,5 s; omjer brzina vozila i zvuka ostaje točan
export const usporenjeDopplera = (s, rs = rasporedDopplera(s)) =>
  ((isNum(s.v_zvuka) ? s.v_zvuka : V_ZVUKA) * 1.5) / rs.sirina;
export function trajanjeVoznje(s, p, rs = rasporedDopplera(s)) {
  const { vi } = fizikaDopplera(s, p);
  return vi > 0 ? (rs.xKraj - rs.xPocetak) / vi : Infinity;
}
export const polozajIzvora = (s, p, t, rs = rasporedDopplera(s)) =>
  rs.xPocetak + fizikaDopplera(s, p).vi * t;

// frekvencija koju promatrač čuje u trenutku t: zvuk je krenuo u t_e iz položaja izvora u t_e (vozilo vozi
// jednoliko oduvijek), f_p = f / (1 − (vᵢ/v)·cos θ), θ između brzine izvora i smjera prema promatraču
export function primljenaFrekvencija(s, p, t, rs = rasporedDopplera(s)) {
  const { f, vi, v } = fizikaDopplera(s, p);
  const X = rs.xPromatraca - rs.xPocetak;
  const D = rs.yPromatraca - rs.yCeste;
  if (vi === 0) return { f_p: f, t_e: t - Math.hypot(X, D) / v };
  const a = v * v - vi * vi;
  const b = -2 * v * v * t + 2 * X * vi;
  const c = v * v * t * t - X * X - D * D;
  const t_e = (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  const dx = X - vi * t_e;
  const cos = dx / Math.hypot(dx, D);
  return { f_p: f / (1 - (vi / v) * cos), t_e };
}
export const trenutakProlaska = (s, p, rs = rasporedDopplera(s)) => {
  const { vi } = fizikaDopplera(s, p);
  return vi > 0 ? (rs.xPromatraca - rs.xPocetak) / vi : null;
};

// fronte (samo zgušnjenja): izvor ih šalje svakih razmakFronti/v sekundi iz svog položaja u tom trenutku
export function fronteDopplera(
  s,
  p,
  t,
  rs = rasporedDopplera(s),
  { mirno = false } = {},
) {
  const { v, vi } = fizikaDopplera(s, p);
  const brz = mirno ? 0 : vi;
  const x0 = mirno ? rs.xParkirano : rs.xPocetak;
  const R = Math.hypot(rs.sirina, rs.visina) * 1.05;
  const de = rs.razmakFronti / v;
  const out = [];
  for (let k = Math.ceil((t - R / v) / de); k * de <= t; k++) {
    const r = v * (t - k * de);
    if (r > 0 && r <= R)
      out.push({ x: x0 + brz * k * de, y: rs.yCeste, r, udio: r / R });
  }
  return out;
}

// graf f_p(t) za jednu vožnju (stvarno vrijeme u s); kad vozilo stoji, ravna crta kroz 4 s
export function grafDopplera(s, p, rs = rasporedDopplera(s), n = 160) {
  const fz = fizikaDopplera(s, p);
  const traje = trajanjeVoznje(s, p, rs);
  const T = Number.isFinite(traje) ? traje : 4;
  const tocke = [];
  for (let i = 0; i <= n; i++) {
    const t = (T * i) / n;
    tocke.push({ t, f: primljenaFrekvencija(s, p, t, rs).f_p });
  }
  const lo = Math.min(fz.f_poslije, fz.f);
  const hi = Math.max(fz.f_prije, fz.f);
  const rub = Math.max((hi - lo) * 0.18, fz.f * 0.02);
  return {
    trajanje: T,
    tocke,
    tProlaz: trenutakProlaska(s, p, rs),
    fMin: lo - rub,
    fMax: hi + rub,
    crte: [
      { kljuc: "f_prije", f: fz.f_prije, oznaka: `${broj(fz.f_prije)} Hz` },
      { kljuc: "f", f: fz.f, oznaka: `${broj(fz.f)} Hz (sirena)` },
      {
        kljuc: "f_poslije",
        f: fz.f_poslije,
        oznaka: `${broj(fz.f_poslije)} Hz`,
      },
    ],
  };
}

export function vidljivoDopplera(s, otkriveno) {
  const sve = s.nacin === "istrazi" || otkriveno;
  const miruje = (s.pitanja ?? []).some((q) => q.faza === "miruje");
  let fronte = "voznja";
  // predvidi: prije odgovora vozilo stoji (mirne, koncentrične fronte); kad je pitanje i o mirnom vozilu, bez fronti
  if (s.nacin === "predvidi" && !sve) fronte = miruje ? "nista" : "mirno";
  return {
    fronte,
    voznja: fronte === "voznja",
    graf: sve,
    brojke: sve,
    zvuk: sve,
    ocitanja: sve
      ? s.nacin === "istrazi"
        ? ["f", "f_sad"]
        : ["f", "f_prije", "f_poslije"]
      : s.nacin === "postavi"
        ? ["f"]
        : ["f", "vi"],
  };
}

export function ocitanjaDopplera(s, p, kljucevi, t, rs = rasporedDopplera(s)) {
  const fz = fizikaDopplera(s, p);
  const O = {
    f: { oznaka: "f_i", tekst: iznosJed(fz.f, "Hz"), naziv: "sirena svira" },
    vi: {
      oznaka: "v_i",
      tekst: iznosJed(fz.vi, "m/s"),
      naziv: "brzina vozila",
    },
    f_sad: {
      oznaka: "f_p",
      tekst: iznosJed(primljenaFrekvencija(s, p, t ?? 0, rs).f_p, "Hz"),
      naziv: "čuješ sada",
    },
    f_prije: {
      oznaka: "f_p",
      tekst: iznosJed(fz.f_prije, "Hz"),
      naziv: "čuješ dok se približava",
    },
    f_poslije: {
      oznaka: "f_p",
      tekst: iznosJed(fz.f_poslije, "Hz"),
      naziv: "čuješ kad prođe",
    },
  };
  return kljucevi.map((k) => ({ kljuc: k, ...O[k] }));
}

// postavi: brzina vozila uz koju promatrač čuje ciljnu frekvenciju
export function ciljnaBrzina(s) {
  const { f, v } = fizikaDopplera(s);
  const fp = s.cilj.f_p;
  return s.cilj.faza === "priblizava" ? v * (1 - f / fp) : v * (f / fp - 1);
}
// položaj klizača najbliži potrebnoj brzini (za „pokaži točan odgovor“)
export function tocanPolozajKlizaca(s) {
  const k = klizaciOd(s)[0];
  const x = ciljnaBrzina(s) / (k.faktor ?? 1);
  const n = Math.round((x - k.min) / k.korak);
  return Math.round((k.min + n * k.korak) * 1e9) / 1e9;
}

// ══ provjere ═══════════════════════════════════════════════════════════════════════════════════════
const filtrirajKrive = (krivo, tocno, tol) => {
  const out = [];
  for (const k of krivo)
    if (
      isNum(k.vrijednost) &&
      !near(k.vrijednost, tocno, tol) &&
      !out.some((x) =>
        near(x.vrijednost, k.vrijednost, 1e-9 + Math.abs(k.vrijednost) * 1e-6),
      )
    )
      out.push(k);
  return out;
};

// dva izvora, izracunaj: točan iznos u traženoj jedinici i tipične krive vrijednosti
export function izracunDvaIzvora(s, q) {
  const fz = fizikaDvaIzvora(s);
  const u = zadatakDvaIzvora(s);
  const { s1, s2 } = s.tocka;
  const jA = s.jedinica_A ?? "mm";
  const ds = Math.abs(u.ds);
  const jedinicaPuta = (krivo, vrijednostM, jed) => {
    const k = JED_DULJINE[jed];
    for (const [j, f] of Object.entries(JED_DULJINE))
      if (j !== jed)
        krivo.push({
          vrijednost: vrijednostM * f,
          poruka: `Pazi na jedinicu: to je iznos u ${j}, a traži se u ${jed}.`,
        });
    return vrijednostM * k;
  };
  const krivo = [];
  let vrijednost;
  let jedinica = "";
  if (q.velicina === "lambda") {
    jedinica = q.jedinica ?? "m";
    const k = JED_DULJINE[jedinica];
    vrijednost = jedinicaPuta(krivo, fz.lambda, jedinica);
    krivo.push(
      s.T != null
        ? {
            vrijednost: (fz.v / fz.T) * k,
            poruka:
              "Iz $v = \\frac{\\lambda}{T}$ slijedi $\\lambda = v \\cdot T$: brzinu **pomnoži** periodom.",
          }
        : {
            vrijednost: fz.v * fz.f * k,
            poruka:
              "Iz $v = \\lambda f$ slijedi $\\lambda = \\frac{v}{f}$: brzinu **podijeli** frekvencijom.",
          },
      {
        vrijednost: (fz.T / fz.v) * k,
        poruka:
          "Obrnuto: $\\lambda = v \\cdot T$ (valna duljina je put koji val prijeđe za jedan period).",
      },
    );
  } else if (q.velicina === "ds") {
    jedinica = q.jedinica ?? "m";
    vrijednost = jedinicaPuta(krivo, ds, jedinica);
    krivo.push({
      vrijednost: (s1 + s2) * JED_DULJINE[jedinica],
      poruka:
        "Treba **razlika** putova (koliko jedan val kasni), a ne njihov zbroj.",
    });
  } else if (q.velicina === "omjer") {
    vrijednost = ds / fz.lambda;
    krivo.push(
      {
        vrijednost: fz.lambda / ds,
        poruka:
          "Obrnuto: dijeli razliku putova valnom duljinom, $\\frac{\\Delta s}{\\lambda}$.",
      },
      {
        vrijednost: (s1 + s2) / fz.lambda,
        poruka: "U brojniku je **razlika** putova, a ne zbroj.",
      },
      {
        vrijednost: s2 / fz.lambda,
        poruka:
          "To je samo jedan put u valnim duljinama. Treba razlika putova $\\Delta s = s_2 - s_1$.",
      },
      {
        vrijednost: s1 / fz.lambda,
        poruka:
          "To je samo jedan put u valnim duljinama. Treba razlika putova $\\Delta s = s_2 - s_1$.",
      },
      {
        vrijednost: s.T != null ? ds / (fz.v / fz.T) : ds / (fz.v * fz.f),
        poruka:
          "Provjeri valnu duljinu: $\\lambda = v \\cdot T = \\frac{v}{f}$.",
      },
      {
        vrijednost: (ds * 100) / fz.lambda,
        poruka:
          "Putove i valnu duljinu uvrsti u istoj jedinici (oboje u metrima).",
      },
    );
  } else if (q.velicina === "A_P") {
    jedinica = jA;
    vrijednost = u.A_P;
    const zbroj = fz.A1 + fz.A2;
    const razlika = Math.abs(fz.A1 - fz.A2);
    if (u.vrsta === "ponistavanje") {
      krivo.push(
        {
          vrijednost: zbroj,
          poruka:
            "Zbroj amplituda vrijedi kad brijeg dolazi na brijeg. Ovdje je $\\frac{\\Delta s}{\\lambda}$ pola više od cijelog broja: jedan val kasni pola vala, pa brijeg dolazi na dolinu i amplitude se **oduzimaju**.",
        },
        {
          vrijednost: 0,
          poruka:
            "Valovi se poništavaju, ali amplitude nisu jednake, pa ne nestane sve: ostane razlika amplituda.",
        },
      );
    } else {
      krivo.push({
        vrijednost: razlika,
        poruka:
          "Razlika amplituda vrijedi kad brijeg dolazi na dolinu. Ovdje je $\\frac{\\Delta s}{\\lambda}$ cijeli broj: valovi stižu u istom ritmu i amplitude se **zbrajaju**.",
      });
    }
    krivo.push(
      {
        vrijednost: zbroj / 2,
        poruka:
          "Amplitude se ne usrednjavaju: otkloni se zbroje (brijeg na brijeg) ili oduzmu (brijeg na dolinu).",
      },
      {
        vrijednost: fz.A1,
        poruka:
          "To je amplituda samo prvog vala. U P stižu oba vala i njihovi otkloni se zbrajaju.",
      },
      {
        vrijednost: fz.A2,
        poruka:
          "To je amplituda samo drugog vala. U P stižu oba vala i njihovi otkloni se zbrajaju.",
      },
    );
  } else if (q.velicina === "A_jednaki") {
    jedinica = jA;
    vrijednost = u.A_jednaki;
    krivo.push(
      {
        vrijednost: fz.faza === 180 ? fz.A1 + fz.A2 : Math.abs(fz.A1 - fz.A2),
        poruka:
          fz.faza === 180
            ? "Izvori titraju u protufazi: uz jednake putove brijeg jednog vala stiže zajedno s dolinom drugog, pa se amplitude oduzimaju."
            : "Uz jednake putove nijedan val ne kasni: brijeg stiže na brijeg, pa se amplitude **zbrajaju**.",
      },
      {
        vrijednost: 0,
        poruka:
          "Uz jednake putove valovi stižu u istom ritmu i pojačavaju se, a ne poništavaju.",
      },
    );
  }
  return { vrijednost, jedinica, krivo };
}

// pokretni izvor, izracunaj: kolinearna formula iz knjižice f_p = f·v/(v ∓ vᵢ)
export function izracunDopplera(s, q) {
  const fz = fizikaDopplera(s);
  const { f, v, vi } = fz;
  const pribl = q.faza === "priblizava";
  const vrijednost = pribl ? fz.f_prije : fz.f_poslije;
  const krivo = [
    {
      vrijednost: pribl ? fz.f_poslije : fz.f_prije,
      poruka: pribl
        ? "Predznak je obrnut. Dok se izvor **približava**, fronte ispred njega su zgusnute i ton je viši: u nazivniku je $v - v_i$."
        : "Predznak je obrnut. Kad izvor **prođe** i udaljava se, fronte iza njega su razrijeđene i ton je niži: u nazivniku je $v + v_i$.",
    },
    {
      vrijednost: pribl ? (f * (v + vi)) / v : (f * (v - vi)) / v,
      poruka:
        "To je formula za promatrača koji se giba ($v_p$ je u brojniku). Ovdje se giba **izvor**, a njegova brzina ide u nazivnik: $f_p = f_i \\frac{v}{v \\mp v_i}$.",
    },
    {
      vrijednost: pribl ? (f * (v - vi)) / v : (f * (v + vi)) / v,
      poruka:
        "Brzina izvora ide u nazivnik, a brzina zvuka u brojnik: $f_p = f_i \\frac{v}{v \\mp v_i}$.",
    },
    {
      vrijednost: f,
      poruka:
        "To je frekvencija koju sirena ispušta. Dok se izvor giba, ti čuješ drukčiju frekvenciju.",
    },
    {
      vrijednost: vrijednost - f,
      poruka:
        "To je samo promjena frekvencije. Traži se cijela frekvencija koju čuješ.",
    },
    {
      vrijednost: f - vrijednost,
      poruka:
        "To je samo promjena frekvencije. Traži se cijela frekvencija koju čuješ.",
    },
  ];
  return { vrijednost, jedinica: "Hz", krivo };
}

// zaokružena rješenja (756 umjesto 755,6) prolaze, a formula za pokretnog promatrača (847 umjesto 850) ne
const tolDopplera = (x) => Math.max(0.51, Math.abs(x) * 0.0007);

function checkPolja(s, unosi, izracun, tolZa) {
  const pitaj = s.pitaj;
  const vals = pitaj.map((_, i) => String(unosi?.[i] ?? ""));
  const prazno = vals.findIndex((v) => !v.trim());
  if (prazno >= 0)
    return {
      tocno: false,
      poruka: pitaj.length > 1 ? "Upiši sve odgovore." : "Upiši odgovor.",
      prazno: true,
      polje: prazno,
    };
  for (let i = 0; i < pitaj.length; i++) {
    const q = pitaj[i];
    const z = izracun(s, q);
    const tol = isNum(s.tolerancija) ? s.tolerancija : tolZa(z.vrijednost);
    const krivo = filtrirajKrive(
      [
        ...(Array.isArray(q.krivo) ? q.krivo : []),
        ...z.krivo.map((k) => ({ ...k, tolerancija: tolZa(k.vrijednost) })),
      ],
      z.vrijednost,
      tol,
    );
    // razlika putova smije biti i negativna (s₁ − s₂)
    const unos =
      q.velicina === "ds" ? vals[i].replace(/^\s*[-−]\s*/, "") : vals[i];
    const r = checkNumber({
      input: unos,
      answer: z.vrijednost,
      tol,
      unit: z.jedinica,
      krivo,
      savjet: s.savjet,
    });
    if (!r.tocno)
      return {
        ...r,
        polje: i,
        poruka: pitaj.length > 1 ? `U ${i + 1}. polju: ${r.poruka}` : r.poruka,
      };
  }
  return { tocno: true };
}

function checkPostaviDva(s, odg) {
  if (!odg || !isNum(odg.x) || !isNum(odg.y))
    return {
      tocno: false,
      poruka: "Povuci točku $P$, pa provjeri.",
      prazno: true,
    };
  const rs = rasporedDvaIzvora(s);
  const p = pocetneVrijednosti(s);
  const u = uTocki(s, p, odg, rs);
  const r = Math.abs(u.omjer);
  if (ostvarujeCilj(s, p, r, rs)) return { tocno: true };
  const { faza } = fizikaDvaIzvora(s, p);
  const vrsta = vrstaInterferencije(r, faza, TOL_POSTAVI);
  const rT = broj(Math.round(r * 100) / 100);
  const ciljV = s.cilj.vrsta;
  if (
    isNum(s.cilj.red) &&
    s.cilj.red === 0 &&
    ciljV === "pojacanje" &&
    faza === 0
  )
    return {
      tocno: false,
      poruka: `Putovi nisu jednaki: razlika je ${iznosJed(Math.abs(u.ds), "m")}. Traži mjesto gdje je točka $P$ jednako udaljena od oba izvora.`,
    };
  if (vrsta === ciljV)
    return {
      tocno: false,
      poruka: `Ovdje je ${VRSTA_TEKST[vrsta]} ($\\Delta s = ${rT.replace(",", "{,}")}\\,\\lambda$), ali ne onog reda koji se traži. Pročitaj zadatak još jednom.`,
    };
  if (vrsta !== "djelomicno")
    return {
      tocno: false,
      poruka: `Ovdje je $\\Delta s = ${rT.replace(",", "{,}")}\\,\\lambda$, a to je ${VRSTA_TEKST[vrsta]}. Za ${VRSTA_TEKST[ciljV]} razlika putova mora biti ${(ciljV === "pojacanje") === (faza === 0) ? "cijeli broj" : "pola više od cijelog broja"} valnih duljina.`,
    };
  return {
    tocno: false,
    poruka: `Ovdje je $\\Delta s = ${rT.replace(",", "{,}")}\\,\\lambda$: ni cijeli ni polovični broj valnih duljina. Izračunaj $\\lambda = v \\cdot T$ i pomakni $P$ tako da razlika putova bude ${(ciljV === "pojacanje") === (faza === 0) ? "cijeli broj" : "pola više od cijelog broja"} valnih duljina.`,
  };
}

function checkOdaberi(s, odg) {
  if (!VRSTE_CILJA.includes(odg))
    return { tocno: false, poruka: "Odaberi jedan odgovor.", prazno: true };
  const u = zadatakDvaIzvora(s);
  if (odg === u.vrsta) return { tocno: true };
  const { faza } = fizikaDvaIzvora(s);
  return {
    tocno: false,
    poruka: `Izračunaj $\\lambda = v \\cdot T$ i razliku putova $\\Delta s = s_2 - s_1$, pa pogledaj koliko valnih duljina stane u $\\Delta s$: ${faza === 0 ? "cijeli broj znači pojačanje (brijeg na brijeg), a pola više od cijelog poništavanje (brijeg na dolinu)" : "izvori titraju u protufazi, pa cijeli broj znači poništavanje, a pola više od cijelog pojačanje"}.`,
  };
}

function checkPredvidi(s, odg) {
  const pit = s.pitanja;
  if (!Array.isArray(odg) || pit.some((_, i) => !PROCJENE.includes(odg[i])))
    return {
      tocno: false,
      poruka: pit.length > 1 ? "Odgovori na sva pitanja." : "Odaberi odgovor.",
      prazno: true,
    };
  const krivi = pit.map((q, i) => odg[i] !== tocnaProcjena(q.faza));
  if (!krivi.some(Boolean)) return { tocno: true };
  const zamjena =
    pit.length > 1 &&
    pit.every(
      (q, i) =>
        (q.faza === "priblizava" && odg[i] === "nizi") ||
        (q.faza === "udaljava" && odg[i] === "visi") ||
        (q.faza === "miruje" && odg[i] === "isti"),
    );
  if (zamjena)
    return {
      tocno: false,
      poruka:
        "Zamijenjeno je. Ispred vozila fronte se zgušnjavaju (kraća valna duljina, **viši** ton), a iza njega razrjeđuju (dulja valna duljina, **niži** ton).",
    };
  const i = krivi.findIndex(Boolean);
  const q = pit[i];
  const pre = pit.length > 1 ? `${i + 1}. pitanje: ` : "";
  if (q.faza === "miruje")
    return {
      tocno: false,
      poruka: `${pre}Kad vozilo stoji, fronte su koncentrične kružnice s jednakim razmakom u svim smjerovima, pa čuješ isti ton koji sirena svira.`,
    };
  if (odg[i] === "isti")
    return {
      tocno: false,
      poruka: `${pre}Sirena svira uvijek isti ton, ali ti ga ne čuješ istog: ${q.faza === "priblizava" ? "vozilo svaku novu frontu pošalje bliže tebi, pa stižu češće." : "vozilo svaku novu frontu pošalje dalje od tebe, pa stižu rjeđe."}`,
    };
  return {
    tocno: false,
    poruka: `${pre}${q.faza === "priblizava" ? "Dok se vozilo približava, fronte ispred njega su zgusnute: kraća valna duljina, češće stižu do tebe, pa je ton **viši**." : "Kad vozilo prođe, iza njega su fronte razrijeđene: dulja valna duljina, rjeđe stižu do tebe, pa je ton **niži**."}`,
  };
}

function checkPostaviDoppler(s, odg) {
  const k = klizaciOd(s)[0];
  const x = odg?.[k.id];
  if (!isNum(x))
    return {
      tocno: false,
      poruka: "Pomakni klizač, pa provjeri.",
      prazno: true,
    };
  const vi = x * (k.faktor ?? 1);
  const cilj = ciljnaBrzina(s);
  const tol = isNum(s.tolerancija)
    ? s.tolerancija
    : (k.korak * (k.faktor ?? 1)) / 2 + 1e-9;
  if (Math.abs(vi - cilj) <= tol) return { tocno: true };
  const { f, v } = fizikaDopplera(s);
  const fp = s.cilj.f_p;
  // pokretni promatrač: f_p = f(v ± v_p)/v
  const promatrac =
    s.cilj.faza === "priblizava" ? v * (fp / f - 1) : v * (1 - fp / f);
  if (Math.abs(vi - promatrac) <= tol && Math.abs(promatrac - cilj) > 2 * tol)
    return {
      tocno: false,
      poruka:
        "To je brzina iz formule za promatrača koji se giba. Ovdje se giba **izvor**: $f_p = f_i \\frac{v}{v \\mp v_i}$, pa izrazi $v_i$ iz te formule.",
    };
  const sad =
    s.cilj.faza === "priblizava" ? (f * v) / (v - vi) : (f * v) / (v + vi);
  const visok = sad > fp;
  return {
    tocno: false,
    poruka: `Uz ${iznosJed(vi, "m/s")} čuo bi ${iznosJed(sad, "Hz")}, a to je ${visok ? "više" : "niže"} od ${iznosJed(fp, "Hz")}. Izrazi $v_i$ iz formule $f_p = f_i \\frac{v}{v ${s.cilj.faza === "priblizava" ? "-" : "+"} v_i}$.`,
  };
}

// ══ validacija ═════════════════════════════════════════════════════════════════════════════════════
// raspon vrijednosti polja: broj ili id klizača (svi položaji klizača)
function raspon(s, x) {
  if (isNum(x)) return [x, x];
  const k = klizacZa(s, x);
  if (!k || ![k.min, k.max].every(isNum)) return null;
  const f = isNum(k.faktor) ? k.faktor : 1;
  return [Math.min(k.min * f, k.max * f), Math.max(k.min * f, k.max * f)];
}
function poljeURasponu(s, need, ime, x, min, max, opis) {
  if (typeof x === "string") {
    if (!need(!!klizacZa(s, x), `${ime}: „${x}“ nije id klizača`)) return false;
  } else if (!need(isNum(x), `${ime} mora biti broj (${opis})`)) return false;
  const r = raspon(s, x);
  return need(
    r && r[0] >= min && r[1] <= max,
    `${ime} mora biti od ${broj(min)} do ${broj(max)} (${opis})${typeof x === "string" ? " u cijelom rasponu klizača" : ""}`,
  );
}

const POLJA_SCENE = {
  dva_izvora: ["izvori", "jedinica_A", "T", "f", "v", "tocka", "d", "prikazi"],
  pokretni_izvor: ["izvor", "v_zvuka", "ikona", "udaljenost"],
};
const POLJA_NACINA = {
  istrazi: ["klizaci"],
  odaberi: [],
  izracunaj: ["pitaj", "tolerancija", "savjet"],
  postavi: ["cilj", "tolerancija", "savjet", "klizaci"],
  predvidi: ["pitanja"],
};
const OSNOVNA = ["tip", "scena", "nacin", "tekst"];

function validateDvaIzvora(s, need, list) {
  const koristeni = [];
  const polje = (ime, x, min, max, opis) => {
    if (typeof x === "string") koristeni.push(x);
    return poljeURasponu(s, need, ime, x, min, max, opis);
  };
  if (
    need(
      Array.isArray(s.izvori) && s.izvori.length === 2,
      "izvori mora biti popis od točno 2 izvora: [{A}, {A, faza?}]",
    )
  ) {
    s.izvori.forEach((iz, i) => {
      if (
        !need(iz && typeof iz === "object", `izvori[${i}] mora biti objekt {A}`)
      )
        return;
      polje(
        `izvori[${i}].A`,
        iz.A,
        0,
        1000,
        `amplituda u ${s.jedinica_A ?? "mm"}`,
      );
      need(
        Object.keys(iz).every((k) => k === "A" || (k === "faza" && i === 1)),
        `izvori[${i}] smije imati samo A${i === 1 ? " i faza" : ""}`,
      );
      if (iz.faza != null)
        need(
          [0, 180].includes(iz.faza),
          "izvori[1].faza mora biti 0 (u fazi) ili 180 (u protufazi)",
        );
    });
    need(
      s.izvori.every(
        (iz) => typeof iz?.A === "string" || (isNum(iz?.A) && iz.A > 0),
      ),
      "zadane amplitude moraju biti veće od 0",
    );
  }
  if (s.jedinica_A != null)
    need(
      JED_A.includes(s.jedinica_A),
      `jedinica_A mora biti ${JED_A.join(" ili ")}`,
    );
  need(
    (s.T != null) !== (s.f != null),
    "dva_izvora treba točno jedno od: T (period u s) ili f (frekvencija u Hz)",
  );
  if (s.T != null) polje("T", s.T, 0.001, 100, "period u s");
  if (s.f != null) polje("f", s.f, 0.01, 1000, "frekvencija u Hz");
  polje("v", s.v, 0.001, 1000, "brzina vala u m/s");
  if (
    need(
      s.tocka &&
        isNum(s.tocka.s1) &&
        isNum(s.tocka.s2) &&
        Object.keys(s.tocka).length === 2,
      "tocka mora biti {s1, s2}: putovi od izvora do P u m",
    )
  ) {
    need(
      s.tocka.s1 > 0 &&
        s.tocka.s2 > 0 &&
        s.tocka.s1 <= 1000 &&
        s.tocka.s2 <= 1000,
      "tocka.s1 i tocka.s2 moraju biti od 0 do 1000 m",
    );
    if (
      s.d != null &&
      need(
        isNum(s.d) && s.d > 0,
        "d (razmak izvora u m) mora biti pozitivan broj",
      )
    )
      need(
        s.d > Math.abs(s.tocka.s2 - s.tocka.s1) * 1.02 &&
          s.d < (s.tocka.s1 + s.tocka.s2) * 0.98,
        "d: s takvim razmakom izvora točka P ne postoji (mora biti |s₂ − s₁| < d < s₁ + s₂, s malo zalihe)",
      );
  }
  if (s.prikazi != null)
    need(
      Array.isArray(s.prikazi) &&
        s.prikazi.length >= 1 &&
        s.prikazi.every((x) => PRIKAZI.includes(x)) &&
        new Set(s.prikazi).size === s.prikazi.length,
      `prikazi mora biti popis različitih od: ${PRIKAZI.join(", ")}`,
    );
  if (s.nacin === "istrazi") validateKlizaci(s, need, { najvise: 3 });
  else
    need(
      s.klizaci == null,
      `dva_izvora (${s.nacin}) nema klizače: sve vrijednosti su brojevi`,
    );
  if (list.length) return;
  for (const k of klizaciOd(s))
    need(
      koristeni.includes(k.id),
      `klizač „${k.id}“ se ne koristi ni u jednom polju (izvori[i].A, T, f, v)`,
    );

  // valovi moraju stati na crtež: ne previše fronti ni čvornih crta
  const rs = rasporedDvaIzvora(s);
  const lam = klizaciOd(s).length
    ? Math.min(...kombinacije(s).map((p) => fizikaDvaIzvora(s, p).lambda))
    : fizikaDvaIzvora(s).lambda;
  const lamMax = klizaciOd(s).length
    ? Math.max(...kombinacije(s).map((p) => fizikaDvaIzvora(s, p).lambda))
    : lam;
  need(
    rs.doseg / lam <= 40,
    `valna duljina je premala za crtež: na vodu stane ${Math.round(rs.doseg / lam)} valnih duljina (najviše 40)`,
  );
  need(
    rs.d / lam <= 12,
    `izvori su predaleko u valnim duljinama (d/λ = ${broj(rs.d / lam)}, najviše 12): previše čvornih crta`,
  );
  need(
    Math.max(s.tocka.s1, s.tocka.s2) / lamMax >= 0.5,
    "valna duljina je prevelika: P mora biti barem pola valne duljine od izvora",
  );
  const u = zadatakDvaIzvora(s);

  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    need(s.pitaj == null && s.pitanja == null, "istrazi nema pitaj ni pitanja");
  }
  if (s.nacin === "odaberi")
    need(
      u.vrsta !== "djelomicno",
      `odaberi: Δs/λ = ${broj(u.omjer)} nije ni cijeli ni polovični broj, pa u P nije ni pojačanje ni poništavanje`,
    );
  if (s.nacin === "izracunaj") {
    if (
      need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 4,
        `izracunaj treba pitaj: 1–4 stavke {velicina: ${VELICINE.join(" | ")}, jedinica?, oznaka?, krivo?}`,
      )
    ) {
      s.pitaj.forEach((q, i) => {
        if (
          !need(
            VELICINE.includes(q?.velicina),
            `pitaj[${i}].velicina mora biti jedna od: ${VELICINE.join(", ")}`,
          )
        )
          return;
        need(
          Object.keys(q).every((k) =>
            ["velicina", "jedinica", "oznaka", "krivo"].includes(k),
          ),
          `pitaj[${i}] smije imati samo velicina, jedinica, oznaka, krivo`,
        );
        if (q.oznaka != null)
          need(isText(q.oznaka), `pitaj[${i}].oznaka mora biti tekst`);
        if (q.jedinica != null) {
          if (["lambda", "ds"].includes(q.velicina))
            need(
              q.jedinica in JED_DULJINE,
              `pitaj[${i}].jedinica mora biti m, cm ili mm`,
            );
          else if (q.velicina === "omjer")
            need(false, `pitaj[${i}]: omjer Δs/λ nema jedinicu`);
          else
            need(
              q.jedinica === (s.jedinica_A ?? "mm"),
              `pitaj[${i}].jedinica za amplitudu mora biti jedinica_A (${s.jedinica_A ?? "mm"})`,
            );
        }
        if (q.velicina === "A_P")
          need(
            u.vrsta !== "djelomicno",
            `pitaj[${i}]: A_P se na maturi računa samo za pojačanje i poništavanje, a Δs/λ = ${broj(u.omjer)} nije cijeli ni polovični broj`,
          );
        if (["ds", "omjer"].includes(q.velicina))
          need(
            Math.abs(u.ds) > 1e-9,
            `pitaj[${i}]: putovi su jednaki, razlika je 0`,
          );
        const z = izracunDvaIzvora(s, q);
        validateKrivo(
          q.krivo,
          z.vrijednost,
          isNum(s.tolerancija) ? s.tolerancija : tolerance(z.vrijednost),
          need,
          `pitaj[${i}].krivo`,
        );
      });
      need(
        new Set(s.pitaj.map((q) => q?.velicina)).size === s.pitaj.length,
        "pitaj: svaka veličina smije biti samo jednom",
      );
    }
    if (s.tolerancija != null)
      need(
        isNum(s.tolerancija) && s.tolerancija >= 0,
        "tolerancija mora biti broj ≥ 0",
      );
  }
  if (s.nacin === "postavi") {
    const c = s.cilj;
    if (
      need(
        c &&
          VRSTE_CILJA.includes(c.vrsta) &&
          Object.keys(c).every((k) => ["vrsta", "red"].includes(k)),
        `postavi treba cilj: {vrsta: ${VRSTE_CILJA.join(" | ")}, red?}`,
      )
    ) {
      if (c.red != null)
        need(
          Number.isInteger(c.red) && c.red >= 0 && c.red <= 20,
          "cilj.red mora biti cijeli broj 0–20",
        );
      if (list.length) return;
      const p = pocetneVrijednosti(s);
      need(
        ciljniOmjeri(s, p, rs).every((k) => k * u.lambda < rs.d * 0.97) &&
          ciljniOmjeri(s, p, rs).length > 0,
        "cilj: takva crta ne postoji (razlika putova mora biti manja od razmaka izvora d)",
      );
      need(
        !!tockaZaCilj(s, rs.P),
        "cilj: crta koja ostvaruje cilj ne prolazi kroz prikazanu vodu (promijeni d ili red)",
      );
      need(
        !ostvarujeCilj(s, p, u.omjer, rs),
        "postavi: početni položaj P već ostvaruje cilj; zadaj drugu tocka",
      );
    }
    need(
      s.tolerancija == null,
      "dva_izvora postavi nema toleranciju (točno je ±0,1 λ)",
    );
  }
}

function kombinacije(s) {
  const ks = klizaciOd(s);
  let out = [{}];
  for (const k of ks)
    out = out.flatMap((p) => [
      { ...p, [k.id]: k.min },
      { ...p, [k.id]: k.max },
    ]);
  return out;
}

function validatePokretni(s, need, list) {
  const koristeni = [];
  const polje = (ime, x, min, max, opis) => {
    if (typeof x === "string") koristeni.push(x);
    return poljeURasponu(s, need, ime, x, min, max, opis);
  };
  const v = isNum(s.v_zvuka) ? s.v_zvuka : V_ZVUKA;
  if (s.v_zvuka != null)
    need(
      isNum(s.v_zvuka) && s.v_zvuka >= 100 && s.v_zvuka <= 2000,
      "v_zvuka mora biti od 100 do 2000 m/s",
    );
  if (s.ikona != null)
    need(IKONE.includes(s.ikona), `ikona mora biti ${IKONE.join(" ili ")}`);
  if (s.udaljenost != null)
    need(
      isNum(s.udaljenost) && s.udaljenost >= 3 && s.udaljenost <= 25,
      "udaljenost (promatrača od sredine ceste) mora biti od 3 do 25 m",
    );
  if (
    need(
      s.izvor && typeof s.izvor === "object",
      "pokretni_izvor treba izvor: {f (Hz), v (m/s)}",
    )
  ) {
    need(
      Object.keys(s.izvor).every((k) => ["f", "v"].includes(k)),
      "izvor ima samo f i v",
    );
    polje("izvor.f", s.izvor.f, 20, 20000, "frekvencija sirene u Hz");
    polje(
      "izvor.v",
      s.izvor.v,
      0,
      0.8 * v,
      `brzina izvora u m/s, manja od 0,8 brzine zvuka (nadzvučno nije u opsegu)`,
    );
  }
  if (s.nacin === "istrazi") validateKlizaci(s, need, { najvise: 2 });
  else if (s.nacin === "postavi")
    validateKlizaci(s, need, { najmanje: 1, najvise: 1 });
  else need(s.klizaci == null, `pokretni_izvor (${s.nacin}) nema klizače`);
  if (list.length) return;
  for (const k of klizaciOd(s))
    need(
      koristeni.includes(k.id),
      `klizač „${k.id}“ se ne koristi (izvor.f ili izvor.v)`,
    );
  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    need(s.pitaj == null && s.pitanja == null, "istrazi nema pitaj ni pitanja");
  }
  if (s.nacin === "predvidi") {
    if (
      need(
        Array.isArray(s.pitanja) &&
          s.pitanja.length >= 1 &&
          s.pitanja.length <= 3,
        `predvidi treba pitanja: 1–3 stavke {faza: ${FAZE.join(" | ")}}`,
      )
    ) {
      s.pitanja.forEach((q, i) => {
        need(
          FAZE.includes(q?.faza),
          `pitanja[${i}].faza mora biti jedna od: ${FAZE.join(", ")}`,
        );
        need(
          Object.keys(q ?? {}).every((k) => ["faza", "tekst"].includes(k)),
          `pitanja[${i}] smije imati samo faza i tekst`,
        );
        if (q?.tekst != null)
          need(isText(q.tekst), `pitanja[${i}].tekst mora biti tekst`);
      });
      need(
        new Set(s.pitanja.map((q) => q?.faza)).size === s.pitanja.length,
        "pitanja: svaka faza smije biti samo jednom",
      );
    }
    need(
      typeof s.izvor.v === "number" && s.izvor.v > 0,
      "predvidi: izvor.v mora biti broj veći od 0",
    );
  }
  if (s.nacin === "izracunaj") {
    need(
      typeof s.izvor.v === "number" &&
        s.izvor.v > 0 &&
        typeof s.izvor.f === "number",
      "izracunaj: izvor.f i izvor.v moraju biti brojevi (v > 0)",
    );
    if (
      need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 2,
        "izracunaj treba pitaj: 1–2 stavke {faza: priblizava | udaljava, oznaka?, krivo?}",
      )
    ) {
      s.pitaj.forEach((q, i) => {
        need(
          ["priblizava", "udaljava"].includes(q?.faza),
          `pitaj[${i}].faza mora biti priblizava ili udaljava`,
        );
        need(
          Object.keys(q ?? {}).every((k) =>
            ["faza", "oznaka", "krivo"].includes(k),
          ),
          `pitaj[${i}] smije imati samo faza, oznaka, krivo`,
        );
        if (q?.oznaka != null)
          need(isText(q.oznaka), `pitaj[${i}].oznaka mora biti tekst`);
        if (["priblizava", "udaljava"].includes(q?.faza) && !list.length) {
          const z = izracunDopplera(s, q);
          validateKrivo(
            q.krivo,
            z.vrijednost,
            isNum(s.tolerancija) ? s.tolerancija : tolDopplera(z.vrijednost),
            need,
            `pitaj[${i}].krivo`,
          );
        }
      });
      need(
        new Set(s.pitaj.map((q) => q?.faza)).size === s.pitaj.length,
        "pitaj: svaka faza smije biti samo jednom",
      );
    }
    if (s.tolerancija != null)
      need(
        isNum(s.tolerancija) && s.tolerancija >= 0,
        "tolerancija mora biti broj ≥ 0 (Hz)",
      );
  }
  if (s.nacin === "postavi") {
    const k = klizaciOd(s)[0];
    need(
      s.izvor.v === k.id,
      "postavi: klizač mora biti brzina izvora (izvor.v = id klizača)",
    );
    need(typeof s.izvor.f === "number", "postavi: izvor.f mora biti broj");
    const c = s.cilj;
    if (
      need(
        c &&
          ["priblizava", "udaljava"].includes(c.faza) &&
          isNum(c.f_p) &&
          Object.keys(c).every((x) => ["faza", "f_p"].includes(x)),
        "postavi treba cilj: {faza: priblizava | udaljava, f_p (Hz)}",
      ) &&
      !list.length
    ) {
      const f = s.izvor.f;
      need(
        c.faza === "priblizava" ? c.f_p > f : c.f_p < f,
        c.faza === "priblizava"
          ? "cilj.f_p mora biti veća od frekvencije sirene (približavanje)"
          : "cilj.f_p mora biti manja od frekvencije sirene (udaljavanje)",
      );
      if (!list.length) {
        const vi = ciljnaBrzina(s);
        const r = raspon(s, k.id);
        need(
          vi >= r[0] && vi <= r[1],
          `cilj: potrebna brzina ${iznosJed(vi, "m/s")} nije na klizaču (${broj(r[0])}–${broj(r[1])} m/s)`,
        );
        const tol = isNum(s.tolerancija)
          ? s.tolerancija
          : (k.korak * (k.faktor ?? 1)) / 2 + 1e-9;
        need(
          Math.abs(k.pocetak * (k.faktor ?? 1) - vi) > tol,
          "postavi: početni položaj klizača već je točan odgovor",
        );
      }
    }
    if (s.tolerancija != null)
      need(
        isNum(s.tolerancija) && s.tolerancija > 0,
        "tolerancija mora biti broj > 0 (m/s)",
      );
  }
}

// ══ opis i primjeri ════════════════════════════════════════════════════════════════════════════════
const OPIS = `Valovi odozgo (fizika, matura): interferencija dvaju izvora i Dopplerov efekt. tekst, scena, nacin. Svi brojevi, crtež i provjera računaju se iz speca; u načinima s odgovorom crtež ne odaje odgovor dok učenik ne odgovori točno (ili „pokaži“).
Scena "dva_izvora" (voda odozgo; izvori S₁ i S₂, točka P, dužine s₁ i s₂, fronte: brijeg puna crta, dolina tanka; uz P mali grafovi titranja od svakog vala i zbroja; čvorne crte):
- izvori: [{A}, {A, faza?}] (amplitude u jedinica_A, "mm" zadano ili "cm"; faza drugog 0 = u fazi, 180 = u protufazi), T (s) ili f (Hz), v (m/s), tocka: {s1, s2} (putovi do P u m; aplikacija sama smjesti P), d? (razmak izvora u m; zadano automatski), prikazi? (od "fronte", "cvorne_crte", "grafovi_P", "brojaci"; zadano sve).
- "istrazi": učenik vuče P (lijepi se na cijeli i polovični Δs/λ) i gleda λ, Δs = n·λ, A_P, grafove u P i čvorne crte. klizaci? (najviše 3; izvori[i].A, T, f, v smiju biti id klizača).
- "odaberi" (Tvoj red): pojačanje ili poništavanje u P. Δs/λ mora biti cijeli ili polovični broj.
- "izracunaj" (Tvoj red): pitaj: 1–4 od [{velicina: "lambda" | "ds" | "omjer" | "A_P" | "A_jednaki" (amplituda uz jednake putove), jedinica? (lambda, ds: m | cm | mm), oznaka?, krivo?}]. Tipične greške (λ = v/T, zbroj umjesto razlike putova, A₁ + A₂ kod poništavanja, 0 kod nejednakih amplituda, prosjek amplituda, jedinice) dodaje aplikacija. tolerancija? (zadano 0,5 %).
- "postavi" (Tvoj red): učenik dovuče P; cilj: {vrsta: "pojacanje" | "ponistavanje", red?} (red k: |Δs| = kλ za pojačanje, (k + ½)λ za poništavanje uz izvore u fazi; bez reda bilo koji). Točno ±0,1 λ. Početni P (tocka) ne smije ostvarivati cilj. Prije provjere vide se samo s₁, s₂ i Δs.
Scena "pokretni_izvor" (cesta odozgo; vozilo sa sirenom vozi slijeva nadesno kraj promatrača; fronte ispred gušće, iza rjeđe; razmak fronti nije u mjerilu, omjer brzina jest; graf frekvencije koju promatrač čuje; zvuk po želji):
- izvor: {f (Hz), v (brzina izvora u m/s, < 0,8 brzine zvuka)}, v_zvuka? (zadano 340), ikona? ("vozilo" | "zvucnik"), udaljenost? (promatrača od sredine ceste u m, zadano 6). Formula iz knjižice: f_p = f·v/(v ∓ vᵢ) (promatrač miruje).
- "istrazi": klizaci? (najviše 2; izvor.f, izvor.v smiju biti id klizača); uživo f koju čuješ i graf.
- "predvidi" (Tvoj red): pitanja: [{faza: "priblizava" | "udaljava" | "miruje", tekst?}] → za svako viši / isti / niži ton od sirene. Prije odgovora vozilo stoji; poslije prođe.
- "izracunaj" (Tvoj red): pitaj: 1–2 od [{faza: "priblizava" | "udaljava", oznaka?, krivo?}] (Hz). Greške (zamijenjeni predznaci, formula za pokretnog promatrača, frekvencija sirene, samo Δf) dodaje aplikacija. tolerancija? (Hz; zadano 0,07 %, najmanje 0,51 Hz: zaokruženo na cijeli Hz prolazi).
- "postavi" (Tvoj red): jedan klizač za izvor.v; cilj: {faza, f_p}. Točan je položaj klizača najbliži potrebnoj brzini.
${KRIVO_OPIS} (u stavci pitaj).`;

const PRIMJER = {
  tip: TIP,
  scena: "dva_izvora",
  nacin: "izracunaj",
  tekst:
    "Dva izvora na površini vode titraju jednako, s periodom $0{,}2$ s, a valovi se šire brzinom $0{,}5$ m/s. Do točke $P$ prvi val prijeđe $0{,}6$ m, a drugi $0{,}85$ m. Amplitude su im $5$ mm i $3$ mm. Kolika je amplituda vala u $P$, a kolika bi bila da su putovi jednaki?",
  izvori: [{ A: 5 }, { A: 3 }],
  T: 0.2,
  v: 0.5,
  tocka: { s1: 0.6, s2: 0.85 },
  pitaj: [
    { velicina: "A_P", oznaka: "$A_P =$" },
    { velicina: "A_jednaki", oznaka: "uz jednake putove $A =$" },
  ],
};

const PRIMJERI = [
  {
    tip: TIP,
    scena: "dva_izvora",
    nacin: "istrazi",
    tekst:
      "Dva izvora titraju jednako ($A_1 = 4$ mm, $A_2 = 1$ mm). **Vuci točku $P$** i gledaj koliko valnih duljina iznosi razlika putova i što se događa s titranjem u $P$. Promijeni i period.",
    izvori: [{ A: 4 }, { A: "A2" }],
    T: "T",
    v: 0.8,
    tocka: { s1: 0.9, s2: 1.2 },
    klizaci: [
      {
        id: "T",
        oznaka: "period $T$",
        min: 0.15,
        max: 0.4,
        korak: 0.05,
        pocetak: 0.25,
        jedinica: "s",
      },
      {
        id: "A2",
        oznaka: "amplituda $A_2$",
        min: 0,
        max: 4,
        korak: 0.5,
        pocetak: 1,
        jedinica: "mm",
      },
    ],
  },
  {
    tip: TIP,
    scena: "dva_izvora",
    nacin: "odaberi",
    tekst:
      "Izvori titraju jednako, s periodom $0{,}4$ s, a valovi se šire brzinom $0{,}3$ m/s. Do točke $P$ prvi val prijeđe $0{,}7$ m, a drugi $1{,}12$ m. Je li val u $P$ pojačan ili prigušen?",
    izvori: [{ A: 7 }, { A: 2 }],
    T: 0.4,
    v: 0.3,
    tocka: { s1: 0.7, s2: 1.12 },
  },
  {
    tip: TIP,
    scena: "dva_izvora",
    nacin: "izracunaj",
    tekst:
      "Period je $0{,}5$ s, a brzina valova $0{,}6$ m/s. Do točke $P$ prvi val prijeđe $0{,}4$ m, a drugi $1{,}75$ m. Izračunaj valnu duljinu, razliku putova i koliko valnih duljina stane u tu razliku.",
    izvori: [{ A: 9 }, { A: 5 }],
    T: 0.5,
    v: 0.6,
    tocka: { s1: 0.4, s2: 1.75 },
    pitaj: [
      { velicina: "lambda", oznaka: "$\\lambda =$" },
      { velicina: "ds", oznaka: "$\\Delta s =$" },
      { velicina: "omjer", oznaka: "$\\dfrac{\\Delta s}{\\lambda} =$" },
    ],
  },
  {
    tip: TIP,
    scena: "dva_izvora",
    nacin: "postavi",
    tekst:
      "Pomakni točku $P$ na mjesto gdje su **putovi od oba izvora jednaki**. Kolika je tamo amplituda?",
    izvori: [{ A: 5 }, { A: 3 }],
    T: 0.2,
    v: 0.5,
    tocka: { s1: 0.6, s2: 0.85 },
    cilj: { vrsta: "pojacanje", red: 0 },
  },
  {
    tip: TIP,
    scena: "dva_izvora",
    nacin: "postavi",
    tekst:
      "Period je $0{,}8$ s, a brzina valova $0{,}2$ m/s. Pomakni $P$ na bilo koje mjesto gdje se valovi **pojačavaju**, ali ne na sredinu između izvora: razlika putova mora biti $1\\lambda$.",
    izvori: [{ A: 11 }, { A: 4 }],
    T: 0.8,
    v: 0.2,
    tocka: { s1: 1.1, s2: 1.18 },
    cilj: { vrsta: "pojacanje", red: 1 },
  },
  {
    tip: TIP,
    scena: "pokretni_izvor",
    nacin: "istrazi",
    tekst:
      "Sirena svira $800$ Hz. **Mijenjaj brzinu vozila** i gledaj fronte ispred i iza njega i frekvenciju koju čuješ. Uključi i zvuk.",
    izvor: { f: 800, v: "vi" },
    ikona: "vozilo",
    klizaci: [
      {
        id: "vi",
        oznaka: "brzina vozila $v_i$",
        min: 0,
        max: 150,
        korak: 5,
        pocetak: 20,
        jedinica: "m/s",
      },
    ],
  },
  {
    tip: TIP,
    scena: "pokretni_izvor",
    nacin: "predvidi",
    tekst:
      "Vozilo sa sirenom od $600$ Hz vozi brzinom $40$ m/s i prolazi kraj tebe. Kakav ton čuješ?",
    izvor: { f: 600, v: 40 },
    pitanja: [{ faza: "priblizava" }, { faza: "udaljava" }],
  },
  {
    tip: TIP,
    scena: "pokretni_izvor",
    nacin: "izracunaj",
    tekst:
      "Vozilo sa sirenom koja ispušta ton frekvencije $800$ Hz vozi se cestom brzinom $20$ m/s i prolazi kraj tebe. Koju frekvenciju čuješ dok ti se približava, a koju nakon što prođe? Brzina zvuka u zraku je $340$ m/s.",
    izvor: { f: 800, v: 20 },
    v_zvuka: 340,
    pitaj: [
      { faza: "priblizava", oznaka: "$f_{\\text{prije}} =$" },
      { faza: "udaljava", oznaka: "$f_{\\text{poslije}} =$" },
    ],
  },
  {
    tip: TIP,
    scena: "pokretni_izvor",
    nacin: "postavi",
    tekst:
      "Sirena svira $800$ Hz. Namjesti brzinu vozila tako da, dok ti se približava, čuješ $850$ Hz. Brzina zvuka je $340$ m/s.",
    izvor: { f: 800, v: "vi" },
    v_zvuka: 340,
    klizaci: [
      {
        id: "vi",
        oznaka: "brzina vozila $v_i$",
        min: 0,
        max: 60,
        korak: 1,
        pocetak: 5,
        jedinica: "m/s",
      },
    ],
    cilj: { faza: "priblizava", f_p: 850 },
  },
];

// ══ widget ═════════════════════════════════════════════════════════════════════════════════════════
export const valne_fronte = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "valne_fronte treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `valne_fronte.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return list;
    if (
      !need(
        NACINI[s.scena].includes(s.nacin),
        `nacin u sceni ${s.scena} mora biti jedan od: ${NACINI[s.scena].join(", ")}`,
      )
    )
      return list;
    const dopustena = [
      ...OSNOVNA,
      ...POLJA_SCENE[s.scena],
      ...POLJA_NACINA[s.nacin],
    ];
    for (const k of Object.keys(s))
      need(
        dopustena.includes(k),
        `polje „${k}“ ne postoji u sceni ${s.scena} (način ${s.nacin})`,
      );
    if (list.length) return list;
    if (s.scena === "dva_izvora") validateDvaIzvora(s, need, list);
    else validatePokretni(s, need, list);
    return list;
  },
  check(s, odgovor) {
    if (s.scena === "dva_izvora") {
      if (s.nacin === "odaberi") return checkOdaberi(s, odgovor);
      if (s.nacin === "izracunaj")
        return checkPolja(s, odgovor, izracunDvaIzvora, (x) => tolerance(x));
      if (s.nacin === "postavi") return checkPostaviDva(s, odgovor);
    } else {
      if (s.nacin === "predvidi") return checkPredvidi(s, odgovor);
      if (s.nacin === "izracunaj")
        return checkPolja(s, odgovor, izracunDopplera, tolDopplera);
      if (s.nacin === "postavi") return checkPostaviDoppler(s, odgovor);
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.scena === "dva_izvora") {
      const u = zadatakDvaIzvora(s);
      const r = broj(Math.abs(u.omjer));
      if (s.nacin === "odaberi")
        return `${VRSTA_TEKST[u.vrsta]} ($\\Delta s = ${r.replace(",", "{,}")}\\,\\lambda$)`;
      if (s.nacin === "izracunaj") {
        const ozn = {
          lambda: "λ",
          ds: "Δs",
          omjer: "Δs/λ",
          A_P: "A_P",
          A_jednaki: "A (jednaki putovi)",
        };
        return s.pitaj
          .map((q) => {
            const z = izracunDvaIzvora(s, q);
            return `${ozn[q.velicina]} = ${iznosJed(z.vrijednost, z.jedinica)}`;
          })
          .join(", ");
      }
      if (s.nacin === "postavi") {
        const ks = ciljniOmjeri(s);
        if (ks.length === 1 && ks[0] === 0)
          return "bilo koja točka jednako udaljena od oba izvora (simetrala između njih)";
        return `bilo koja točka na kojoj je |Δs| = ${ks.map((k) => `${broj(k)} λ`).join(" ili ")} (${VRSTA_TEKST[s.cilj.vrsta]})`;
      }
      return "";
    }
    if (s.nacin === "predvidi")
      return s.pitanja
        .map((q) => `${FAZA_TEKST[q.faza]}: ${TON[tocnaProcjena(q.faza)]} ton`)
        .join("; ");
    if (s.nacin === "izracunaj") {
      const fz = fizikaDopplera(s);
      return s.pitaj
        .map(
          (q) =>
            `${FAZA_TEKST[q.faza]}: ${tocnije(frekvencijaFaze(fz, q.faza))} Hz`,
        )
        .join(", ");
    }
    if (s.nacin === "postavi") {
      const k = klizaciOd(s)[0];
      return `v_i = ${iznosJed(tocanPolozajKlizaca(s), k.jedinica ?? "m/s")}`;
    }
    return "";
  },
};
