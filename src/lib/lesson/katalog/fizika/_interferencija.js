// Fizika i geometrija widgeta „interferencija“ (Youngov pokus i optička rešetka). Čisti JS bez DOM-a i Intl-a:
// isti kod crta widget u pregledniku, provjerava odgovor na backendu (GraalJS) i (kasnije) daje primitive za
// nativni iOS crtež. Sve koordinate su u jedinicama viewBoxa (Young 360 × 280, rešetka 360 × 320).
import { isNum, formatNumber, formatSci } from "../../core/number.js";

export const rad = (x) => (x * Math.PI) / 180;
export const deg = (x) => (x * 180) / Math.PI;
const r1 = (n) => Math.round(n * 10) / 10;

// jedinice duljine u metrima (µ je znak mikro U+00B5; grčko μ U+03BC prihvaća se kao isto)
export const DULJINA = { m: 1, cm: 1e-2, mm: 1e-3, µm: 1e-6, nm: 1e-9 };
export const normJed = (j) => (typeof j === "string" ? j.replace("μ", "µ") : j);

// ── klizači ────────────────────────────────────────────────────────────────────────────────────────
export const KLIZACI = {
  lambda: {
    oznaka: "valna duljina λ",
    kratko: "λ",
    jedinica: "nm",
    min: 380,
    max: 750,
  },
  d: {
    oznaka: "razmak pukotina d",
    kratko: "d",
    jedinica: "µm",
    min: 10,
    max: 1000,
  },
  a: {
    oznaka: "udaljenost zastora a",
    kratko: "a",
    jedinica: "m",
    min: 0.2,
    max: 10,
  },
  zareza_po_mm: {
    oznaka: "zareza po milimetru",
    kratko: "broj zareza po mm",
    jedinica: "/mm",
    min: 20,
    max: 1250,
  },
  N: {
    oznaka: "broj osvijetljenih pukotina N",
    kratko: "N",
    jedinica: "",
    min: 2,
    max: 50,
  },
};
export const KLIZACI_VRSTE = {
  young: ["lambda", "d", "a"],
  resetka: ["lambda", "d", "zareza_po_mm", "N"],
};
// granice d za rešetku (µm) su druge nego za dvije pukotine
export const D_RESETKA = { min: 0.8, max: 50 };
export function metaKlizaca(s, id) {
  const m = { ...KLIZACI[id] };
  if (id === "d" && s.vrsta === "resetka") {
    m.oznaka = "konstanta rešetke d";
    m.min = D_RESETKA.min;
    m.max = D_RESETKA.max;
  }
  return m;
}
export const klizaciOd = (s) => (Array.isArray(s.klizaci) ? s.klizaci : []);
export const korakIndeks = (k, x) => Math.round((x - k.min) / k.korak);
export const zaokruziNaKorak = (k, x) =>
  Math.round(
    Math.min(k.max, Math.max(k.min, k.min + korakIndeks(k, x) * k.korak)) * 1e9,
  ) / 1e9;
export function vrijednostiKlizaca(k) {
  const n = Math.round((k.max - k.min) / k.korak);
  return Array.from(
    { length: n + 1 },
    (_, i) => Math.round((k.min + i * k.korak) * 1e9) / 1e9,
  );
}
export function pocetneVrijednosti(s) {
  const p = {};
  for (const k of klizaciOd(s))
    p[k.id] = isNum(k.pocetak)
      ? k.pocetak
      : zaokruziNaKorak(k, (k.min + k.max) / 2);
  return p;
}

// ── boja svjetlosti ────────────────────────────────────────────────────────────────────────────────
// λ (nm) → [r, g, b] (0–255), aproksimacija D. Brutona; rubovi spektra su tamniji, ali ne ispod 55 %, da se pruge
// od 400 nm (ljubičasti laser iz 1150) na zastoru još vide.
export function lambdaRGB(nm) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = -(nm - 440) / 60;
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = -(nm - 510) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = -(nm - 645) / 65;
  } else r = 1;
  let f = 1;
  if (nm < 420) f = 0.55 + (0.45 * (nm - 380)) / 40;
  else if (nm > 700) f = 0.55 + (0.45 * (750 - nm)) / 50;
  f = Math.min(1, Math.max(0.55, f));
  const c = (x) => Math.round(255 * Math.pow(x * f, 0.8));
  return [c(r), c(g), c(b)];
}
export const bojaCSS = (nm) => `rgb(${lambdaRGB(nm).join(" ")})`;
// neutralna „bijela“ svjetlost kad je λ tražena veličina (boja bi odala odgovor)
export const NEUTRALNA = [226, 226, 234];
export function bojaIme(nm) {
  if (nm < 450) return "ljubičasta";
  if (nm < 495) return "plava";
  if (nm < 570) return "zelena";
  if (nm < 595) return "žuta"; // natrijeva žuta (589–590 nm) je žuta
  if (nm < 620) return "narančasta";
  return "crvena";
}

// ── fizika ─────────────────────────────────────────────────────────────────────────────────────────
// p: vrijednosti klizača (u jedinicama klizača). Vraća SI veličine i pomoćne iznose za prikaz.
export function fizika(s, p = pocetneVrijednosti(s)) {
  const v = (id) => (id in p ? p[id] : s[id]);
  const lambdaNm = v("lambda");
  const lam = lambdaNm * 1e-9;
  if (s.vrsta === "young") {
    const dUm = v("d");
    const d = dUm * 1e-6;
    const a = v("a");
    const razmak = (lam * a) / d;
    return { vrsta: "young", lambdaNm, lam, dUm, d, a, s: razmak, N: 2 };
  }
  let d;
  let izvor;
  if ("d" in p) [d, izvor] = [p.d * 1e-6, "d"];
  else if ("zareza_po_mm" in p)
    [d, izvor] = [1e-3 / p.zareza_po_mm, "zareza_po_mm"];
  else if (isNum(s.d)) [d, izvor] = [s.d * 1e-6, "d"];
  else if (isNum(s.zareza_po_mm))
    [d, izvor] = [1e-3 / s.zareza_po_mm, "zareza_po_mm"];
  else [d, izvor] = [((s.red ?? 1) * lam) / Math.sin(rad(s.kut)), "kut"];
  const omjer = d / lam;
  // red na točno 90° (d/λ cijeli broj) ne vidi se: svjetlost klizi uz rešetku
  const kmax = Math.max(0, Math.ceil(omjer - 1e-9) - 1);
  const redovi = [];
  for (let k = -kmax; k <= kmax; k++)
    redovi.push({ k, alpha: deg(Math.asin((k * lam) / d)) });
  const N = isNum(v("N")) ? v("N") : 20;
  return {
    vrsta: "resetka",
    lambdaNm,
    lam,
    d,
    dUm: d * 1e6,
    zareza: 1e-3 / d,
    omjer,
    kmax,
    brojMaksimuma: 2 * kmax + 1,
    redovi,
    N,
    izvor,
  };
}
export const kutReda = (f, k) =>
  Math.abs(k * f.lam) < f.d ? deg(Math.asin((k * f.lam) / f.d)) : null;

// intenzitet (0–1) za N pukotina pri faznom pomaku susjednih φ = 2π·Δ/λ; za N = 2 to je cos²(φ/2)
export function intenzitetN(N, u) {
  const h = Math.PI * u;
  const sn = Math.sin(h);
  if (Math.abs(sn) < 1e-9) return 1;
  const x = Math.sin(N * h) / (N * sn);
  return x * x;
}
export const intenzitetYoung = (u) => Math.cos(Math.PI * u) ** 2;

// ── sonda: razlika putova i faza u točki zastora ───────────────────────────────────────────────────
// y: udaljenost od središta zastora (m). u = Δ/λ = d·y/(λa) = y/s (aproksimacija malih kutova, kao λ = sd/a).
export function sonda(f, y) {
  const u = y / f.s;
  const au = Math.abs(u);
  const pola = Math.round(2 * au); // razlika putova u polovinama λ
  const tocno = Math.abs(2 * au - pola) < 0.08;
  const I = intenzitetYoung(u);
  let faza;
  let opis;
  let vrsta;
  if (tocno) {
    faza = pola === 0 ? "0" : pola === 1 ? "π" : `${pola}π`;
    const parna = pola % 2 === 0;
    if (pola > 1) faza += parna ? " ≡ 0" : " ≡ π";
    vrsta = parna ? "svijetla" : "tamna";
    opis = parna
      ? "u fazi: brijeg na brijeg, valovi se pojačaju"
      : "u protufazi: brijeg na dolinu, valovi se ponište";
  } else {
    faza = `≈ ${formatNumber(Math.round(2 * au * 10) / 10)}π`;
    vrsta = "djelomicno";
    opis = "djelomično se pojačaju";
  }
  const delta = tocno ? pola / 2 : Math.round(au * 100) / 100;
  return {
    u,
    delta,
    deltaTekst: `${formatNumber(delta)} λ`,
    deltaNm: delta * f.lambdaNm,
    faza,
    fazaRad: 2 * Math.PI * au,
    amplituda: 2 * Math.abs(Math.cos(Math.PI * u)),
    I,
    vrsta,
    opis,
  };
}
// red pruge u točki: svijetla k (u ≈ ±k) ili tamna k (u ≈ ±(k − ½), prva tamna je k = 1)
export function prugaU(u) {
  const au = Math.abs(u);
  const k = Math.round(au);
  if (Math.abs(au - k) <= 0.25) return { vrsta: "svijetla", red: k };
  return { vrsta: "tamna", red: Math.floor(au) + 1 };
}

// ── geometrija: Youngov pokus (viewBox 360 × 280) ─────────────────────────────────────────────────
export const YG = {
  W: 360,
  H: 280,
  cy: 140,
  laser: { x: 6, w: 34, h: 18 },
  pregradaX: 86,
  D: 56, // razmak pukotina na crtežu (povećan, nije u mjerilu)
  otvor: 7,
  zastorX: 236,
  zastorW: 24,
  vrh: 20,
  dno: 260,
  pola: 118, // pola visine zastora u px
  krivuljaX: 304,
  krivuljaW: 48,
};
export const pukotineYoung = () => [
  { x: YG.pregradaX, y: YG.cy - YG.D / 2 },
  { x: YG.pregradaX, y: YG.cy + YG.D / 2 },
];
// raspon zastora (pola visine u m) ovisno o načinu: sve tražene pruge stanu, a mjerilo se ne mijenja s klizačima
export function rasponYoung(s) {
  const f0 = fizika(s);
  if (s.nacin === "izmjeri" || (s.nacin === "izracunaj" && s.pruge))
    return Math.max(3.2, (s.pruge.N - 1) / 2 + 1.4) * f0.s;
  if (s.nacin === "izracunaj") return 3.6 * f0.s;
  return 4.6 * f0.s;
}
export const yPx = (y, Y) => YG.cy - (y / Y) * YG.pola;
export const yIzPx = (py, Y) => ((YG.cy - py) / YG.pola) * Y;

// pruge na zastoru: gradijent (offset 0 = vrh), krivulja intenziteta, maksimumi i minimumi u vidnom polju
export function zastorYoung(f, Y, n = 240) {
  const stops = [];
  const krivulja = [];
  for (let i = 0; i <= n; i++) {
    const y = Y - (2 * Y * i) / n;
    const I = intenzitetYoung(y / f.s);
    stops.push({ o: i / n, I });
    krivulja.push([
      r1(YG.krivuljaX + I * YG.krivuljaW),
      r1(YG.vrh + (i / n) * (YG.dno - YG.vrh)),
    ]);
  }
  const maksimumi = [];
  const minimumi = [];
  const kM = Math.floor(Y / f.s);
  for (let k = -kM; k <= kM; k++)
    maksimumi.push({ k, y: k * f.s, py: r1(yPx(k * f.s, Y)) });
  for (let j = -kM - 1; j <= kM; j++) {
    const y = (j + 0.5) * f.s;
    if (Math.abs(y) <= Y)
      minimumi.push({ k: j >= 0 ? j + 1 : -j, y, py: r1(yPx(y, Y)) });
  }
  return { stops, krivulja, maksimumi, minimumi };
}

// lijep korak ravnala (cm) za raspon ±Y
export function ravnalo(Y) {
  const cm = Y * 100;
  const koraci = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  const korak = koraci.find((k) => (2 * cm) / k <= 10) ?? 100;
  const crtice = [];
  const n = Math.floor((2 * cm) / korak);
  for (let i = -n; i <= n; i++) {
    const v = (i * korak) / 2;
    if (Math.abs(v) > cm) continue;
    const glavna = i % 2 === 0;
    crtice.push({
      y: v / 100,
      py: r1(yPx(v / 100, Y)),
      glavna,
      oznaka: glavna ? formatNumber(v) : null,
    });
  }
  return { korak, crtice };
}

// zrake iz pukotina do sonde, višak puta Δ (deblji dio dalje zrake) i razmak grebena na crtežu, takav da je
// razlika faza u sondi točno 2π·u (crtež nije u mjerilu, pa se λ na crtežu prilagodi)
export function zrakeYoung(f, Y, y) {
  const [p1, p2] = pukotineYoung();
  const P = { x: YG.zastorX, y: yPx(y, Y) };
  const L1 = Math.hypot(P.x - p1.x, P.y - p1.y);
  const L2 = Math.hypot(P.x - p2.x, P.y - p2.y);
  const u = y / f.s;
  const dPx = Math.abs(L2 - L1);
  const lambdaPx =
    Math.abs(u) > 0.05
      ? dPx / Math.abs(u)
      : (YG.D * (YG.pola / (Y / f.s))) / (YG.zastorX - YG.pregradaX);
  const dalja = L1 > L2 ? p1 : p2;
  const L = Math.max(L1, L2);
  const t = dPx / L;
  return {
    P: { x: r1(P.x), y: r1(P.y) },
    zrake: [
      { x1: p1.x, y1: p1.y, x2: r1(P.x), y2: r1(P.y), L: L1 },
      { x1: p2.x, y1: p2.y, x2: r1(P.x), y2: r1(P.y), L: L2 },
    ],
    delta: {
      x1: dalja.x,
      y1: dalja.y,
      x2: r1(dalja.x + (P.x - dalja.x) * t),
      y2: r1(dalja.y + (P.y - dalja.y) * t),
    },
    lambdaPx: Math.max(5, lambdaPx),
  };
}
// grebeni vala uzduž zrake: kratke crtice okomite na zraku, pomaknute za fazu (0–1 perioda)
export function grebeni(z, lambdaPx, faza, duljina = 4) {
  const dx = z.x2 - z.x1;
  const dy = z.y2 - z.y1;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const out = [];
  for (let r = (faza % 1) * lambdaPx; r < L - 2; r += lambdaPx) {
    const cx = z.x1 + ux * r;
    const cy = z.y1 + uy * r;
    out.push({
      x1: r1(cx - uy * duljina),
      y1: r1(cy + ux * duljina),
      x2: r1(cx + uy * duljina),
      y2: r1(cy - ux * duljina),
    });
  }
  return out;
}

// ── geometrija: optička rešetka s kutomjerom (viewBox 360 × 320) ──────────────────────────────────
export const RG = {
  W: 360,
  H: 320,
  cx: 62,
  cy: 160,
  R: 116, // luk kutomjera
  vis: 18, // najveća visina krivulje intenziteta iznad luka
  laserX: 6,
};
const naLuku = (alpha, r) => ({
  x: r1(RG.cx + r * Math.cos(rad(alpha))),
  y: r1(RG.cy - r * Math.sin(rad(alpha))),
});
export function lukResetke() {
  const a = naLuku(90, RG.R);
  const b = naLuku(-90, RG.R);
  const crtice = [];
  for (let k = -90; k <= 90; k += 10) {
    const o = naLuku(k, RG.R);
    const i = naLuku(k, RG.R - (k % 30 === 0 ? 9 : 5));
    const t = naLuku(k, RG.R - 20);
    crtice.push({
      kut: k,
      x1: o.x,
      y1: o.y,
      x2: i.x,
      y2: i.y,
      oznaka: k % 30 === 0 && Math.abs(k) < 90 ? `${Math.abs(k)}°` : null,
      tx: t.x,
      ty: t.y,
    });
  }
  return {
    luk: `M${a.x},${a.y} A${RG.R},${RG.R} 0 0 1 ${b.x},${b.y}`,
    crtice,
  };
}
// krivulja intenziteta iznad luka (polarni graf) za N osvijetljenih pukotina
export function krivuljaResetke(f, korak = 0.1) {
  const tocke = [];
  for (let a = -90; a <= 90 + 1e-9; a += korak) {
    const u = (f.d * Math.sin(rad(a))) / f.lam;
    const I = intenzitetN(f.N, u);
    const t = naLuku(a, RG.R + 3 + I * RG.vis);
    tocke.push([t.x, t.y]);
  }
  return tocke;
}
// maksimumi na luku; oznaka reda samo kad je dovoljno mjesta do susjedne (dodirne se ne preklapaju)
export function redoviResetke(f, vidljivi = null) {
  const out = [];
  for (const r of f.redovi) {
    if (vidljivi && !vidljivi.includes(Math.abs(r.k))) continue;
    const t = naLuku(r.alpha, RG.R);
    const o = naLuku(r.alpha, RG.R + RG.vis + 13);
    out.push({ ...r, x: t.x, y: t.y, ox: o.x, oy: o.y + 4, oznaka: true });
  }
  out.sort((p, q) => p.alpha - q.alpha);
  // od središta prema van: oznaka se crta ako je bar 15 px od zadnje nacrtane
  for (const smjer of [1, -1]) {
    let zadnji = null;
    const red = out
      .filter((r) => r.k * smjer >= 0)
      .sort((p, q) => Math.abs(p.k) - Math.abs(q.k));
    for (const r of red) {
      if (zadnji && Math.hypot(r.ox - zadnji.ox, r.oy - zadnji.oy) < 15)
        r.oznaka = false;
      else zadnji = r;
    }
  }
  return out;
}
export function lukKuta(alpha, r = 44) {
  const a = naLuku(0, r);
  const b = naLuku(alpha, r);
  const t = naLuku(alpha / 2, r + 12);
  return {
    d: `M${a.x},${a.y} A${r},${r} 0 0 ${alpha > 0 ? 0 : 1} ${b.x},${b.y}`,
    tx: t.x + 4,
    ty: t.y + 4,
  };
}
export const tockaNaLuku = naLuku;

// ── formatiranje ───────────────────────────────────────────────────────────────────────────────────
export const fmt = (x) => formatNumber(Number(x.toPrecision(4)));
export const fmtSci = (x) => formatSci(x, 3);
export const cm = (m) => `${fmt(m * 100)}\u00a0cm`;
