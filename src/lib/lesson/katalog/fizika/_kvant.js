// _kvant: fizika, geometrija crteža, animacija (iz sjemena i vremena) i „što se smije vidjeti“ za widget kvant
// (foton, elektronvolt, fotoelektrični efekt, de Broglie). Sve su čiste funkcije (spec, stanje, t) → JSON, da web
// i iOS za isti spec i isto vrijeme crtaju isto; komponenta samo crta i prosljeđuje unos.
import { isNum, formatNumber, formatSci } from "../../core/number.js";
import { lambdaRGB, bojaIme } from "./_interferencija.js";

// ── konstante (knjižica formula, str. 4–5; kao u rješenjima) ─────────────────────────────────────
export const H = 6.626e-34; // J s
export const C = 3e8; // m/s
export const E0 = 1.6e-19; // C; 1 eV = 1,6·10⁻¹⁹ J
export const M_E = 9.11e-31; // kg
export const M_P = 1.67e-27; // kg
export const LOPTICA = { ime: "teniska loptica", m: 0.057, v: 50 };

export const SCENE = ["foton", "elektronvolt", "fotoefekt", "de_broglie"];

// ── zapis brojeva ─────────────────────────────────────────────────────────────────────────────────
export const fmt = (x) => formatNumber(Number(Number(x).toPrecision(3)));
export const sci = (x) => formatSci(x, 3);
// kratki fizikalni zapis: znanstveni samo kad treba
export const iznos = (x, j = "") =>
  `${Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0) ? sci(x) : fmt(x)}${j ? `\u00a0${j}` : ""}`;

// ── sjeme slučajnosti (mulberry32 po indeksu) ─────────────────────────────────────────────────────
export function rnd(seed, k, j = 0) {
  let a =
    (seed * 2654435761 + k * 2246822519 + j * 3266489917 + 1013904223) >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const sjeme = (s) => (Number.isInteger(s?.seed) ? s.seed : 7);

// ── fizika ────────────────────────────────────────────────────────────────────────────────────────
export function energijaFotona(nm) {
  const lam = nm * 1e-9;
  const J = (H * C) / lam;
  return { lam, J, eV: J / E0, f: C / lam };
}
export const lambdaIzEnergije = (eV) => (H * C) / (eV * E0) / 1e-9; // nm

// boja fotona: vidljivi dio iz lambdaRGB; UV i IC su sivi s oznakom (nevidljivi su)
export function bojaFotona(nm) {
  if (nm < 380)
    return {
      rgb: [168, 156, 214],
      oznaka: "UV",
      ime: "ultraljubičasto (nevidljivo)",
    };
  if (nm > 750)
    return {
      rgb: [190, 132, 132],
      oznaka: "IC",
      ime: "infracrveno (nevidljivo)",
    };
  return { rgb: lambdaRGB(nm), oznaka: null, ime: bojaIme(nm) };
}
export const NEUTRALNA = [214, 214, 222];

export function cesticaDB(s, st = {}) {
  const c = st.cestica ?? s.cestica ?? "elektron";
  if (c === "elektron") return { id: "elektron", ime: "elektron", m: M_E };
  if (c === "proton") return { id: "proton", ime: "proton", m: M_P };
  if (c === "loptica") return { id: "loptica", ...LOPTICA };
  if (c && typeof c === "object")
    return { id: "vlastita", ime: c.ime ?? "čestica", m: c.m, v: c.v };
  return { id: "elektron", ime: "elektron", m: M_E };
}

// izlazni rad: metal iz speca, odabrani metal (istrazi) ili iz zadatka (λ i U_z zadani)
export function izlazniRad(s, st = {}) {
  if (isNum(st.W)) return st.W; // predvidi: metal nakon promjene
  if (Array.isArray(s.metali) && isNum(st.metal) && s.metali[st.metal])
    return s.metali[st.metal].W_i;
  if (s.metal && isNum(s.metal.W_i)) return s.metal.W_i;
  if (isNum(s.lambda) && isNum(s.U_z))
    return energijaFotona(s.lambda).eV - s.U_z;
  return NaN;
}
export function nazivMetala(s, st = {}) {
  if (Array.isArray(s.metali) && isNum(st.metal) && s.metali[st.metal])
    return s.metali[st.metal].naziv ?? "metal";
  return s.metal?.naziv ?? "metal";
}

// udio izbijenih elektrona koji stignu do kolektora: E_k jednoliko u [0, E_k,max], pa udio linearno padne na 0
// točno pri U = U_z
export function udioStruje(Ekmax, U) {
  if (!(Ekmax > 0)) return 0;
  if (!(U > 0)) return 1;
  return Math.max(0, 1 - U / Ekmax);
}
export const I_MAX = 4; // µA pri jakosti 100 % i U = 0 (prikaz, nije iz zadatka)

export function pocetnoStanje(s) {
  const st = {
    lambda: s.lambda,
    jakost: isNum(s.jakost) ? s.jakost : 60,
    U: isNum(s.U)
      ? s.U
      : s.scena === "fotoefekt" && s.nacin === "izracunaj" && isNum(s.U_z)
        ? s.U_z
        : 0,
    v: s.v,
    metal: Array.isArray(s.metali) ? 0 : null,
    cestica: Array.isArray(s.cestice) ? s.cestice[0] : null,
  };
  if (s.scena === "elektronvolt") st.U = isNum(s.U) ? s.U : 1;
  for (const k of Array.isArray(s.klizaci) ? s.klizaci : [])
    st[k.id] = isNum(k.pocetak) ? k.pocetak : zaokruzi(k, (k.min + k.max) / 2);
  return st;
}
export const zaokruzi = (k, x) => {
  const n = Math.round((x - k.min) / k.korak);
  return Math.min(
    k.max,
    Math.max(k.min, Number((k.min + n * k.korak).toPrecision(12))),
  );
};
export function vrijednostiKlizaca(k) {
  const out = [];
  const n = Math.round((k.max - k.min) / k.korak);
  for (let i = 0; i <= n && i <= 20000; i++)
    out.push(Number((k.min + i * k.korak).toPrecision(12)));
  return out;
}

export function fizika(s, st = pocetnoStanje(s)) {
  if (s.scena === "foton") {
    const nm = isNum(st.lambda)
      ? st.lambda
      : isNum(s.E)
        ? lambdaIzEnergije(s.E)
        : NaN;
    const e = energijaFotona(nm);
    return {
      lambdaNm: nm,
      lam: e.lam,
      f: e.f,
      EJ: e.J,
      EeV: e.eV,
      jakost: st.jakost,
    };
  }
  if (s.scena === "elektronvolt") return { U: st.U, EeV: st.U, EJ: st.U * E0 };
  if (s.scena === "fotoefekt") {
    const nm = st.lambda;
    const e = energijaFotona(nm);
    const W = izlazniRad(s, st);
    const izlazi = e.eV > W + 1e-9;
    const Ek = izlazi ? e.eV - W : 0;
    const udio = izlazi ? udioStruje(Ek, st.U) : 0;
    return {
      lambdaNm: nm,
      lam: e.lam,
      f: e.f,
      EfJ: e.J,
      Ef: e.eV,
      W,
      Ek,
      izlazi,
      Uz: Ek,
      lambda0Nm: lambdaIzEnergije(W),
      f0: (W * E0) / H,
      U: st.U,
      jakost: st.jakost,
      udio,
      I: (I_MAX * st.jakost * udio) / 100,
      metal: nazivMetala(s, st),
    };
  }
  if (s.scena === "de_broglie") {
    const c = cesticaDB(s, st);
    let v = c.v ?? st.v;
    if (!isNum(v) && isNum(s.lambda)) v = H / (c.m * s.lambda * 1e-9);
    const p = c.m * v;
    const lam = H / p;
    return { ...c, v, p, lam, lamNm: lam / 1e-9 };
  }
  return {};
}

// ── geometrija (viewBox 360 × 240) ───────────────────────────────────────────────────────────────
export const VB = { w: 360, h: 240 };
const r1 = (x) => Math.round(x * 10) / 10;

// valni paket: točke duž osi x (lokalno, središte u 0), valna duljina lamPx, ovojnica Gauss
export function paket(lamPx, duljina, amp = 6, faza = 0) {
  const pts = [];
  const pol = duljina / 2;
  for (let u = -pol; u <= pol + 1e-9; u += 1.5) {
    const env = Math.exp(-((u / (pol * 0.55)) ** 2));
    pts.push([
      r1(u),
      r1(-amp * env * Math.sin((2 * Math.PI * u) / lamPx - faza)),
    ]);
  }
  return pts;
}
const zakreni = (pts, x0, y0, kut) => {
  const c = Math.cos(kut);
  const sn = Math.sin(kut);
  return pts.map(([u, w]) => [
    r1(x0 + u * c - w * sn),
    r1(y0 + u * sn + w * c),
  ]);
};
// valna duljina na crtežu fotona (nije u mjerilu, ali raste s λ)
export const lamPxFotona = (nm) => 4 + 0.026 * nm;

// — foton: laser, snop fotona, detektor, mjerilo energije —
export const FOTON = {
  laser: { x: 14, y: 96, w: 64, h: 30 },
  y: 111,
  x0: 82,
  x1: 316,
  detektor: { x: 318, y: 84, w: 28, h: 54 },
  brzina: 110,
  RMAX: 6,
};
const LETI_F = (FOTON.x1 - FOTON.x0) / FOTON.brzina;
// od: trenutak od kojeg detektor broji fotone (kad se promijeni svjetlost, brojač kreće od nule)
export function kadarFoton(s, st, t, vid, od = 0) {
  const f = fizika(s, st);
  const seed = sjeme(s);
  const j = Math.max(0, Math.min(100, f.jakost)) / 100;
  const lamPx = lamPxFotona(f.lambdaNm);
  const L = Math.max(18, Math.min(44, 2.6 * lamPx));
  const r = vid.energija ? Math.max(2.5, Math.min(9, 1.5 * f.EeV)) : 4;
  const fotoni = [];
  const kMax = Math.floor(t * FOTON.RMAX);
  for (
    let k = Math.max(0, Math.ceil((t - LETI_F) * FOTON.RMAX));
    k <= kMax;
    k++
  ) {
    if (rnd(seed, k) >= j) continue;
    const tau = t - k / FOTON.RMAX;
    const x = FOTON.x0 + FOTON.brzina * tau;
    if (x > FOTON.x1) continue;
    const y = FOTON.y + (rnd(seed, k, 1) - 0.5) * 16;
    fotoni.push({
      k,
      x: r1(x),
      y: r1(y),
      tocke: paket(lamPx, L, 5, 0).map(([u, w]) => [r1(x + u), r1(y + w)]),
      novcic: { x: r1(x), y: r1(y - 11), r: r1(r) },
    });
  }
  return {
    fotoni,
    stiglo: stigloFotona(s, st, t, od),
    mjerilo: mjeriloEnergije(s, f),
  };
}
export function stigloFotona(s, st, t, od = 0) {
  const seed = sjeme(s);
  const j = Math.max(0, Math.min(100, st.jakost)) / 100;
  let n = 0;
  const kMax = Math.floor((t - LETI_F) * FOTON.RMAX);
  for (
    let k = Math.max(0, Math.ceil((od - LETI_F) * FOTON.RMAX));
    k <= kMax;
    k++
  )
    if (rnd(seed, k) < j) n++;
  return n;
}
// os energije fotona (eV) ispod snopa; vidljivo područje obojeno
export function mjeriloEnergije(s, f) {
  const k = (s.klizaci ?? []).find((q) => q.id === "lambda");
  const najmanjaNm = Math.min(k ? k.min : f.lambdaNm, f.lambdaNm, 380);
  const Emax = Math.max(4, Math.ceil(energijaFotona(najmanjaNm).eV));
  const x0 = 30;
  const x1 = 330;
  const X = (eV) => r1(x0 + ((x1 - x0) * eV) / Emax);
  const korak = Emax > 8 ? 2 : 1;
  const crtice = [];
  for (let e = 0; e <= Emax + 1e-9; e += korak)
    crtice.push({ x: X(e), tekst: formatNumber(e) });
  const boje = [];
  for (let nm = 750; nm >= 380; nm -= 37)
    boje.push({ x: X(energijaFotona(nm).eV), rgb: lambdaRGB(nm) });
  return {
    x0,
    x1,
    y: 196,
    Emax,
    crtice,
    vidljivo: {
      x0: X(energijaFotona(750).eV),
      x1: X(energijaFotona(380).eV),
      boje,
    },
    oznaka: X(Math.min(Emax, f.EeV ?? 0)),
  };
}

// — elektronvolt: elektron ubrzava od − do + ploče —
export const EV = { xm: 92, xp: 268, y0: 50, y1: 170, y: 110 };
export function kadarEV(s, st, t) {
  const U = Math.max(0.05, st.U);
  const T = Math.min(3, 1.6 / Math.sqrt(U));
  const P = T + 1.1; // let + zastoj uz + ploču
  const tau = t % P;
  const u = Math.min(1, (tau / T) ** 2);
  const x0 = EV.xm + 9;
  const x1 = EV.xp - 9;
  return {
    x: r1(x0 + (x1 - x0) * u),
    y: EV.y,
    udio: u,
    stigao: tau >= T,
    dobiveno: st.U * u,
  };
}

// — fotoefekt: svjetiljka, cijev s katodom i kolektorom, krug s izvorom napona i ampermetrom —
export const FE = {
  lampa: { x: 34, y: 34, r: 13 },
  cijev: { x: 92, y: 58, w: 190, h: 120 },
  katoda: { x: 104, y: 70, w: 10, h: 96 },
  kolektor: { x: 262, y: 70, w: 8, h: 96 },
  krug: { y: 214 },
  izvor: { x: 150 },
  ampermetar: { x: 222, r: 13 },
  stupci: { x: 300, y0: 178, y1: 64, w: 17 },
  K: 72, // px/s po √eV (brzina izbijenog elektrona na crtežu)
  RMAX: 5,
  LETI: 0.55,
};
const D_FE = FE.kolektor.x - (FE.katoda.x + FE.katoda.w);
export function kadarFotoefekt(s, st, t, vid) {
  const f = fizika(s, st);
  const seed = sjeme(s);
  const j = Math.max(0, Math.min(100, f.jakost)) / 100;
  const xK = FE.katoda.x + FE.katoda.w;
  const fotoni = [];
  const elektroni = [];
  const lamPx = lamPxFotona(f.lambdaNm) * 0.8;
  const izvor = [FE.lampa.x + 9, FE.lampa.y + 9];
  const ZIVOT = 4.5;
  const kMax = Math.floor((t + FE.LETI) * FE.RMAX);
  const kMin = Math.max(0, Math.ceil((t - ZIVOT) * FE.RMAX));
  for (let k = kMin; k <= kMax; k++) {
    if (rnd(seed, k) >= j) continue;
    const tk = k / FE.RMAX;
    const yk = FE.katoda.y + 8 + rnd(seed, k, 1) * (FE.katoda.h - 16);
    const tau = t - tk;
    if (tau < 0) {
      // foton na putu prema katodi
      const u = 1 + tau / FE.LETI;
      const x = izvor[0] + (xK - izvor[0]) * u;
      const y = izvor[1] + (yk - izvor[1]) * u;
      const kut = Math.atan2(yk - izvor[1], xK - izvor[0]);
      fotoni.push({
        k,
        x: r1(x),
        y: r1(y),
        tocke: zakreni(
          paket(lamPx, 20, 4),
          x - 10 * Math.cos(kut),
          y - 10 * Math.sin(kut),
          kut,
        ),
      });
      continue;
    }
    if (!vid.elektroni || !f.izlazi) continue;
    const Ek = f.Ek * rnd(seed, k, 2);
    const v0 = FE.K * Math.sqrt(Ek);
    const a = f.U > 0 ? (FE.K * FE.K * f.U) / (2 * D_FE) : 0;
    const dx = v0 * tau - 0.5 * a * tau * tau;
    const vraca = a > 0 && tau > v0 / a;
    if (dx >= D_FE || (a > 0 && tau > (2 * v0) / a) || tau > ZIVOT) continue;
    const vy = (rnd(seed, k, 3) - 0.5) * 8;
    const y = Math.min(
      FE.cijev.y + FE.cijev.h - 8,
      Math.max(FE.cijev.y + 8, yk + vy * tau),
    );
    elektroni.push({
      k,
      x: r1(xK + 4 + Math.max(0, dx)),
      y: r1(y),
      vraca,
      blijedi: tau > ZIVOT - 0.6 ? r1((ZIVOT - tau) / 0.6) : 1,
    });
  }
  return { fotoni, elektroni, kazaljka: kazaljka(f.I) };
}
// kut kazaljke ampermetra (° od okomice): −55° pri 0, +55° pri I_MAX
export const kazaljka = (I) =>
  r1(-55 + 110 * Math.max(0, Math.min(1, I / I_MAX)));

// stupci bilance E_f = W_i + E_k (mjerilo od 0 do Emax eV)
export function stupciBilance(s, st) {
  const f = fizika(s, st);
  const k = (s.klizaci ?? []).find((q) => q.id === "lambda");
  const Emax =
    Math.max(f.W + 0.5, f.Ef, k ? energijaFotona(k.min).eV : 0) * 1.08;
  const { y0, y1 } = FE.stupci;
  const Y = (e) => r1(y0 - ((y0 - y1) * Math.min(e, Emax)) / Emax);
  return {
    Emax,
    foton: { y: Y(f.Ef), visina: r1(y0 - Y(f.Ef)) },
    W: { y: Y(f.W), visina: r1(y0 - Y(f.W)) },
    Ek: f.izlazi ? { y: Y(f.Ef), visina: r1(Y(f.W) - Y(f.Ef)) } : null,
    izlazi: f.izlazi,
  };
}

// — de Broglie: elektronski top, valni paket, kristal s atomima na 0,1 nm —
export const DB = {
  top: { x: 10, y: 62, w: 42, h: 30 },
  y: 77,
  x0: 58,
  x1: 352,
  PX_NM: 360,
  atomi: { y: 178, y2: 202, x0: 36, razmak: 36 },
  val: { y: 150 },
};
export function kadarDeBroglie(s, st, t, vid) {
  const f = fizika(s, st);
  const lamPx = f.lamNm * DB.PX_NM;
  const crta = vid.val && lamPx >= 4 && lamPx <= 400;
  const P = 3.2;
  const tau = t % P;
  const x = DB.x0 + 20 + (DB.x1 - DB.x0 - 20) * (tau / P);
  const L = Math.max(70, Math.min(170, 3 * lamPx));
  const atomi = [];
  for (let xx = DB.atomi.x0; xx <= 344; xx += DB.atomi.razmak) {
    atomi.push({ x: xx, y: DB.atomi.y });
    atomi.push({ x: xx, y: DB.atomi.y2 });
  }
  const out = {
    cestica: { x: r1(x), y: DB.y },
    atomi,
    crta,
    lamPx: r1(lamPx),
    razmak: {
      x0: DB.atomi.x0,
      x1: DB.atomi.x0 + DB.atomi.razmak,
      y: DB.atomi.y + 14,
    },
  };
  if (crta) {
    out.paket = paket(lamPx, L, 12, 0).map(([u, w]) => [
      r1(x + u),
      r1(DB.y + w),
    ]);
    // nepomični val iznad kristala: usporedba λ s razmakom atoma
    const ravnalo = [];
    for (let xx = DB.atomi.x0; xx <= 344; xx += 1.5)
      ravnalo.push([
        r1(xx),
        r1(DB.val.y - 9 * Math.sin((2 * Math.PI * (xx - DB.atomi.x0)) / lamPx)),
      ]);
    out.ravnalo = ravnalo;
    out.mjeraLambda = {
      x0: DB.atomi.x0 + lamPx / 4,
      x1: r1(DB.atomi.x0 + lamPx / 4 + lamPx),
      y: DB.val.y - 20,
    };
  }
  return out;
}
