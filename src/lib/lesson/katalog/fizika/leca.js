// leca: optička klupa s tankom lećom (fizika, matura; zadaci 1140–1149). Predmet (strelica ili svijeća), leća sa
// žarištima F i F′, karakteristične zrake i slika računaju se ovdje (1/a + 1/b = 1/f, y′/y = −b/a) i vraćaju kao obični
// JSON s točkama u cm (scenaLece), pa komponenta i buduća iOS aplikacija samo crtaju i prosljeđuju unos. Ovdje je i
// odluka što je skriveno dok učenik ne odgovori. Konvencija predznaka iz rješenja: b < 0 znači virtualnu sliku s iste
// strane leće kao predmet, y′ < 0 obrnutu sliku, f > 0 sabirnu leću (f < 0 rastresnu).
// Koordinate: os x je optička os u cm, leća je u x = 0, predmet u x = −a; y je visina u cm (gore pozitivno).
import { isNum, formatNumber, near, parseNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
} from "../zajednicko.js";

const TIP = "leca";
export const NACINI = [
  "istrazi",
  "prikaz",
  "zastor",
  "nacrtaj",
  "postavi",
  "izracunaj",
];
const GLEDANJE = ["istrazi", "prikaz"];
export const ZRAKE = ["paralelna", "centar", "zariste"];
export const NAZIV_ZRAKE = {
  paralelna: "paralelna s osi",
  centar: "kroz optičko središte",
  zariste: "kroz žarište F",
};
export const PREDMETI = ["strelica", "svijeca"];
export const OCITANJA = ["a", "b", "y_slike", "m", "vrsta"];
export const VELICINE = ["b", "y_slike", "m", "f", "j", "a", "vrsta"];
const CILJEVI = ["m", "b", "y_slike"];
export const JEDINICA = {
  a: "cm",
  b: "cm",
  y_slike: "cm",
  f: "cm",
  m: "",
  j: "m⁻¹",
};
export const OZNAKA = {
  a: "$a =$",
  b: "$b =$",
  y_slike: "$y' =$",
  m: "$y'/y =$",
  f: "$f =$",
  j: "$j =$",
  vrsta: "Kakva je slika?",
};
const NAZIV = {
  a: "udaljenost predmeta a",
  b: "udaljenost slike b",
  y_slike: "visina slike y′",
  m: "povećanje y′/y",
  f: "žarišna daljina f",
  j: "jakost leće j",
  vrsta: "vrsta slike",
};
// svojstva slike u načinu izracunaj (tri prekidača)
export const SVOJSTVA = [
  { kljuc: "realna", da: "realna", ne: "virtualna" },
  { kljuc: "uspravna", da: "uspravna", ne: "obrnuta" },
  { kljuc: "uvecana", da: "uvećana", ne: "umanjena" },
];

// ── brojevi ─────────────────────────────────────────────────────────────────────────────────────────
const zaokruzi = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
export const broj = (n, d = 2) =>
  Number.isFinite(n) ? formatNumber(zaokruzi(n, d) || 0) : "∞";
const cm = (n, d = 2) => `${broj(n, d)}\u00a0cm`;
const razlicit = (x, y) =>
  Math.abs(x - y) > 0.015 * Math.max(Math.abs(y), 1e-9);

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
// Slika točke na visini y udaljene a ispred leće žarišne daljine f. Predmet u žarištu: zrake izlaze paralelno.
export function slikaLece(f, a, y = 1) {
  if (Math.abs(a - f) < 1e-9 * Math.max(1, Math.abs(f)))
    return {
      beskonacno: true,
      b: Infinity,
      m: Infinity,
      y: Infinity,
      realna: null,
      uspravna: null,
      uvecana: true,
      jednaka: false,
    };
  const b = (a * f) / (a - f);
  const m = -b / a;
  return {
    beskonacno: false,
    b,
    m,
    y: m * y,
    realna: b > 0,
    uspravna: m > 0,
    uvecana: Math.abs(m) > 1 + 1e-9,
    jednaka: Math.abs(Math.abs(m) - 1) < 1e-9,
  };
}

export function vrstaTekst(sl) {
  if (sl.beskonacno) return "slike nema (zrake izlaze paralelno)";
  return [
    sl.realna ? "realna" : "virtualna",
    sl.uspravna ? "uspravna" : "obrnuta",
    sl.jednaka ? "jednake veličine" : sl.uvecana ? "uvećana" : "umanjena",
  ].join(" · ");
}

// Zona predmeta kod sabirne leće (traka ispod osi u istraživanju).
export function zonaPredmeta(f, a) {
  if (f < 0) return "rastresna";
  const e = 1e-9 * f;
  if (a > 2 * f + e) return "iza_2f";
  if (a > 2 * f - e) return "na_2f";
  if (a > f + e) return "izmedju";
  if (a > f - e) return "na_f";
  return "unutar";
}

// Karakteristična zraka iz vrha predmeta: upadna zraka iz (−a, y) pogađa leću na visini h s nagibom sUlaz, a izlazi s
// nagibom sIzlaz. Tanka leća: sIzlaz = sUlaz − h/f (vrijedi i za rastresnu leću). Zraka kroz F ne postoji kad je
// predmet baš u žarištu (bila bi okomita).
export function parametriZrake(ime, f, a, y) {
  if (ime === "paralelna") return { ime, h: y, sUlaz: 0, sIzlaz: -y / f };
  if (ime === "centar") return { ime, h: 0, sUlaz: -y / a, sIzlaz: -y / a };
  if (ime === "zariste") {
    if (Math.abs(a - f) < 1e-9 * Math.max(1, Math.abs(f))) return null;
    const sUlaz = -y / (a - f);
    return { ime, h: y + a * sUlaz, sUlaz, sIzlaz: 0 };
  }
  return null;
}

// ── polja speca i zadane vrijednosti ────────────────────────────────────────────────────────────────
export const oblikPredmeta = (s) =>
  PREDMETI.includes(s.predmet)
    ? s.predmet
    : s.nacin === "zastor" || Array.isArray(s.mjerenja)
      ? "svijeca"
      : "strelica";
export const visinaPredmeta = (s) => (isNum(s.y) ? s.y : 3);
export const zrakeSpeca = (s) => (Array.isArray(s.zrake) ? s.zrake : ZRAKE);
export const listaA = (s) =>
  Array.isArray(s.a) ? s.a : isNum(s.a) ? [s.a] : [];
export const korakA = (s) => (isNum(s.korak) ? s.korak : 0.5);
export const otvorLece = (s) => (isNum(s.otvor) ? s.otvor : 6);
export const mijenja = (s) =>
  Array.isArray(s.mijenja)
    ? s.mijenja
    : s.nacin === "istrazi" || s.nacin === "postavi"
      ? ["a"]
      : [];
export const prikaziSpeca = (s) =>
  Array.isArray(s.prikazi) ? s.prikazi : OCITANJA;
const pitano = (s, v) =>
  Array.isArray(s.pitaj) && s.pitaj.some((q) => q?.velicina === v);

// žarišna daljina: iz speca ili srednja vrijednost iz tablice mjerenja (a, b)
export function fIzMjerenja(s) {
  const f = s.mjerenja.map(([a, b]) => (a * b) / (a + b));
  return f.reduce((x, y) => x + y, 0) / f.length;
}
export const fLece = (s) =>
  isNum(s.f) ? s.f : Array.isArray(s.mjerenja) ? fIzMjerenja(s) : NaN;
export const pocetniA = (s) =>
  Array.isArray(s.mjerenja) && !isNum(s.a) ? s.mjerenja[0][0] : listaA(s)[0];

export function rasponA(s) {
  if (Array.isArray(s.a_raspon)) return s.a_raspon;
  const F = Math.max(...rasponF(s).map(Math.abs));
  const hi = Math.max(4 * F, ...listaA(s).map((a) => a * 1.5));
  return [korakA(s), Math.ceil(hi / 5) * 5];
}
export function rasponF(s) {
  if (mijenja(s).includes("f") && Array.isArray(s.f_raspon)) return s.f_raspon;
  return [s.f, s.f];
}
export function mrezaA(s) {
  const [lo, hi] = rasponA(s);
  const k = korakA(s);
  const out = [];
  for (let i = Math.ceil(lo / k - 1e-9); i * k <= hi + 1e-9; i++)
    out.push(zaokruzi(i * k, 6));
  return out;
}
export const naMrezuA = (s, a) => {
  const [lo, hi] = rasponA(s);
  const k = korakA(s);
  return Math.min(hi, Math.max(lo, zaokruzi(Math.round(a / k) * k, 6)));
};
export const naMrezuF = (s, f) => {
  const [lo, hi] = rasponF(s);
  return Math.min(
    Math.max(lo, hi),
    Math.max(Math.min(lo, hi), zaokruzi(Math.round(f * 2) / 2, 6)),
  );
};

// ── zastor (pokus) ──────────────────────────────────────────────────────────────────────────────────
// realne slike za udaljenosti predmeta s klupe; za a ≤ f oštre slike na zastoru nema
export const imaOstruSliku = (f, a) => a > f + 1e-9;
export function rasponZastora(s) {
  if (Array.isArray(s.zastor_raspon)) return s.zastor_raspon;
  const bs = listaA(s)
    .filter((a) => imaOstruSliku(s.f, a))
    .map((a) => slikaLece(s.f, a).b);
  return [2, Math.ceil(Math.max(2.5 * s.f, ...bs.map((b) => 1.5 * b)) / 5) * 5];
}
export const tolZastora = (s, b) =>
  isNum(s.tolerancija) ? s.tolerancija : Math.max(0.3, 0.01 * b);
// početni položaj zastora: dalje od svih oštrih slika
export function pocetakZastora(s) {
  const [lo, hi] = rasponZastora(s);
  const bs = listaA(s)
    .filter((a) => imaOstruSliku(s.f, a))
    .map((a) => slikaLece(s.f, a).b);
  for (const u of [0.85, 0.95, 0.15, 0.6, 0.35, 0.05]) {
    const x = zaokruzi(lo + u * (hi - lo), 0);
    if (bs.every((b) => Math.abs(x - b) >= 3)) return x;
  }
  return null;
}
// Što je na zastoru u x (cm iza leće) dok je svijeća a ispred leće: mrlja polumjera (D/2)·|1 − x/b| (D = otvor leće)
// oko točke koju daje zraka kroz središte (povećanje −x/a). Za a ≤ f mrlja nikad ne nestane.
export function zastorSlika(s, a, x) {
  const y = visinaPredmeta(s);
  const r = (otvorLece(s) / 2) * Math.abs(1 - x * (1 / s.f - 1 / a));
  const m = -x / a;
  const vel = Math.abs(m) * y;
  return {
    mutnoca: r,
    povecanje: m,
    visina: vel,
    svjetlina: Math.min(
      1,
      Math.max(0.22, 1 / (1 + (r / (0.35 * vel + 0.15)) ** 2)),
    ),
  };
}
// najveća oštra slika na klupi (za mjerilo pogleda na zastor)
export function najvecaSlikaZastora(s) {
  const y = visinaPredmeta(s);
  const v = listaA(s)
    .filter((a) => imaOstruSliku(s.f, a))
    .map((a) => Math.abs(slikaLece(s.f, a, y).y));
  return Math.max(y, ...v);
}

// ── postavi ─────────────────────────────────────────────────────────────────────────────────────────
// udaljenost predmeta koja ostvaruje cilj (jedinstvena za m, b i y′)
export function aZaCilj(s) {
  const f = s.f;
  const { velicina, vrijednost } = s.cilj;
  if (velicina === "b") return (vrijednost * f) / (vrijednost - f);
  const m = velicina === "m" ? vrijednost : vrijednost / visinaPredmeta(s);
  return (f * (m - 1)) / m;
}
export function vrijednostCilja(s, a) {
  const sl = slikaLece(s.f, a, visinaPredmeta(s));
  return { m: sl.m, b: sl.b, y_slike: sl.y }[s.cilj.velicina];
}
const tolCilja = (s) =>
  isNum(s.cilj?.tolerancija)
    ? s.cilj.tolerancija
    : Math.abs(s.cilj.vrijednost) * 0.01;
const ostvaruje = (s, a) => {
  const q = vrijednostCilja(s, a);
  return Number.isFinite(q) && near(q, s.cilj.vrijednost, tolCilja(s));
};
// skriveno: dok učenik ne provjeri (i ne pomakne predmet nakon provjere), ne vidi sliku ni zrake ni brojeve slike
export const skrivenoPostavi = (s) => s.skriveno !== false;

// ── nacrtaj ─────────────────────────────────────────────────────────────────────────────────────────
// točke na osi koje učenik može ciljati (i na koje se zraka „privuče“): F, F′, 2F, 2F′
export const tockeOsi = (f) => [-2 * f, -f, f, 2 * f];
const kutPogleda = (pg, s) => (Math.atan((pg.sy / pg.sx) * s) * 180) / Math.PI;
export function nagibRuke(h, t) {
  if (!Array.isArray(t) || !isNum(t[0]) || !isNum(t[1]) || t[0] <= 1e-6)
    return null;
  return (t[1] - h) / t[0];
}
// Privlačenje izlazne zrake na „lijepe“ smjerove: vodoravno, ravno dalje, kroz F, F′, 2F ili 2F′. Isti popis za sve
// zrake, pa ne odaje koja je točna.
export function privuciZraku(s, ime, t, pg = pogledLece(s)) {
  const z = parametriZrake(ime, s.f, s.a, visinaPredmeta(s));
  const xMin = 10 / pg.sx;
  const x = Math.max(xMin, t[0]);
  const sNag = (t[1] - z.h) / x;
  const kandidati = [0, z.sUlaz, ...tockeOsi(s.f).map((xp) => -z.h / xp)];
  const th = kutPogleda(pg, sNag);
  let best = null;
  for (const c of kandidati) {
    const d = Math.abs(kutPogleda(pg, c) - th);
    if (d < 2.5 && (!best || d < best.d)) best = { c, d };
  }
  if (!best) return { tocka: [x, t[1]], privuceno: false };
  // ista udaljenost od izlazne točke (u pikselima), novi smjer
  const L = Math.hypot(x * pg.sx, (t[1] - z.h) * pg.sy);
  const ux = 1 / Math.hypot(1, (best.c * pg.sy) / pg.sx);
  const dx = (L * ux) / pg.sx;
  return { tocka: [dx, z.h + best.c * dx], privuceno: true };
}
// točne izlazne točke (za „pokaži“): na pola puta do desnog ruba
export function tocneRuke(s, pg = pogledLece(s)) {
  return zrakeSpeca(s).map((ime) => {
    const z = parametriZrake(ime, s.f, s.a, visinaPredmeta(s));
    let x = pg.xR * 0.6;
    const yy = z.h + z.sIzlaz * x;
    const lim = pg.yMax * 0.95;
    if (Math.abs(yy) > lim)
      x = Math.abs((Math.sign(yy - z.h) * lim - z.h) / (z.sIzlaz || 1e-9));
    return [x, z.h + z.sIzlaz * x];
  });
}
// početni položaj ručke: malo desno od izlazne točke, bez crte (učenik mora zraku okrenuti)
export function pocetnaRuka(s, ime, pg = pogledLece(s)) {
  const z = parametriZrake(ime, s.f, s.a, visinaPredmeta(s));
  return [pg.xR * 0.32, z.h];
}

// ── pogled (mjerilo crteža) ─────────────────────────────────────────────────────────────────────────
export const SIRINA = 360;
const RUB = 12;
const POLA_VISINE = 86; // px od osi do ruba crteža
// Fiksan za cijeli spec (crtež ne skače dok učenik vuče). U načinima s odgovorom raspon ne smije odati traženu
// vrijednost: istrazi, postavi i izracunaj imaju simetričan raspon oko leće, pa se iz ruba crteža ne vidi gdje je slika.
export function pogledLece(s) {
  const n = s.nacin;
  const f = fLece(s);
  const y = visinaPredmeta(s);
  let xL;
  let xR;
  let yMax;
  let traka = false;
  let ravnalo = false;
  if (n === "istrazi" || n === "postavi") {
    const [, aMax] = rasponA(s);
    const F = Math.max(...rasponF(s).map(Math.abs));
    const X = Math.max(aMax * 1.08, 2.4 * F);
    xL = -X;
    xR = X;
    yMax = y * 2.4;
    traka = n === "istrazi" && f > 0 && s.zone !== false;
  } else if (n === "zastor" || Array.isArray(s.mjerenja)) {
    const aMax = Math.max(
      ...(Array.isArray(s.mjerenja) ? s.mjerenja.map((p) => p[0]) : listaA(s)),
    );
    const zMax = Array.isArray(s.mjerenja)
      ? Math.max(...s.mjerenja.map((p) => p[1])) * 1.25
      : rasponZastora(s)[1];
    xL = -aMax * 1.1 - 2;
    xR = zMax * 1.05;
    yMax = 1.3 * Math.max(y, otvorLece(s) / 2);
    ravnalo = true;
  } else {
    const a = pocetniA(s);
    const sl = slikaLece(f, a, y);
    const b = Number.isFinite(sl.b) ? sl.b : 0;
    const yS = Number.isFinite(sl.y) ? Math.abs(sl.y) : y;
    yMax = 1.28 * Math.max(y, yS);
    if (n === "izracunaj") {
      const X = 1.12 * Math.max(a, Math.abs(b), 2 * Math.abs(f));
      xL = -X;
      xR = X;
      // visina crteža ne smije odati koliko je velika slika: ovisi samo o predmetu (veća slika se odreže)
      if (!pitano(s, "f") && !pitano(s, "j")) yMax = 2.6 * y;
    } else {
      const lo = Math.min(-a, b, -Math.abs(f));
      const hi = Math.max(b, 1.3 * Math.abs(f), 0.5 * a);
      const m = 0.12 * (hi - lo);
      xL = lo - m;
      xR = hi + m;
    }
  }
  const sx = (SIRINA - 2 * RUB) / (xR - xL);
  const sy = POLA_VISINE / yMax;
  const oy = 14 + POLA_VISINE;
  return {
    sirina: SIRINA,
    visina: oy + POLA_VISINE + 12 + (traka ? 30 : 0) + (ravnalo ? 30 : 0),
    xL,
    xR,
    yMax,
    sx,
    sy,
    ox: RUB - xL * sx,
    oy,
    traka,
    ravnalo,
  };
}
export const uPx = (pg, t) => [pg.ox + t[0] * pg.sx, pg.oy - t[1] * pg.sy];
export const izPx = (pg, p) => [(p[0] - pg.ox) / pg.sx, (pg.oy - p[1]) / pg.sy];

// odsijecanje dužine pravokutnikom (Liang–Barsky), u cm
function odsijeci(p, q, R) {
  let t0 = 0;
  let t1 = 1;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const rub = (pp, qq) => {
    if (Math.abs(pp) < 1e-15) return qq >= 0;
    const r = qq / pp;
    if (pp < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (
    rub(-dx, p[0] - R.x0) &&
    rub(dx, R.x1 - p[0]) &&
    rub(-dy, p[1] - R.y0) &&
    rub(dy, R.y1 - p[1])
  )
    return [
      [p[0] + t0 * dx, p[1] + t0 * dy],
      [p[0] + t1 * dx, p[1] + t1 * dy],
    ];
  return null;
}
const okvir = (pg) => ({
  x0: pg.xL,
  x1: pg.xR,
  y0: -pg.yMax * 1.14,
  y1: pg.yMax * 1.14,
});

// cijela zraka: upadna, izlazna do ruba crteža, crtkani produžetak unatrag do virtualne slike, pomoćne crte kroz F
function putZrake(ime, f, a, y, R) {
  const z = parametriZrake(ime, f, a, y);
  if (!z) return null;
  const sl = slikaLece(f, a, y);
  const P0 = [-a, y];
  const P1 = [0, z.h];
  const seg = [];
  if (ime === "zariste" && f > 0 && a < f)
    seg.push({ od: [-f, 0], do: P0, vrsta: "pomocna" });
  if (ime === "zariste" && f < 0)
    seg.push({ od: P1, do: [-f, 0], vrsta: "pomocna" });
  seg.push({ od: P0, do: P1, vrsta: "upadna" });
  seg.push({ od: P1, do: [R.x1, z.h + z.sIzlaz * R.x1], vrsta: "izlazna" });
  if (!sl.beskonacno && sl.b < 0) {
    const xb = ime === "paralelna" && f < 0 ? Math.min(sl.b, f) : sl.b;
    seg.push({ od: P1, do: [xb, z.h + z.sIzlaz * xb], vrsta: "produzetak" });
  }
  return {
    ime,
    segmenti: seg
      .map((g) => {
        const c = odsijeci(g.od, g.do, R);
        return c ? { od: c[0], do: c[1], vrsta: g.vrsta } : null;
      })
      .filter(Boolean),
  };
}

// ── scena ───────────────────────────────────────────────────────────────────────────────────────────
// Sve što se crta, kao JSON (točke u cm). stanje: {a, f, x (zastor), red (zastor), ruke (nacrtaj: [[x, y] | null]),
// otkriveno (učenik je točno odgovorio, ili „pokaži“, ili u postavi provjerio baš ovaj položaj)}.
export function scenaLece(s, stanje = {}) {
  const n = s.nacin;
  const pg = pogledLece(s);
  const R = okvir(pg);
  const f = isNum(stanje.f) ? stanje.f : fLece(s);
  const y = visinaPredmeta(s);
  const otkriveno = !!stanje.otkriveno;
  const mj = Array.isArray(s.mjerenja);
  let a = isNum(stanje.a) ? stanje.a : pocetniA(s);
  if (n === "zastor") a = listaA(s)[stanje.red ?? 0] ?? a;
  const sl = slikaLece(f, a, y);
  const oblik = oblikPredmeta(s);

  // što se vidi
  const pitaF = n === "izracunaj" && (pitano(s, "f") || pitano(s, "j"));
  const pitaA = n === "izracunaj" && pitano(s, "a");
  let vidiTocke = true;
  let vidiSliku = true;
  let vidiZrake = true;
  let vidiPredmet = true;
  if (n === "zastor") {
    vidiTocke = false;
    vidiSliku = false;
    vidiZrake = false;
  } else if (n === "postavi") {
    vidiSliku = vidiZrake = otkriveno || !skrivenoPostavi(s);
  } else if (n === "nacrtaj") {
    vidiSliku = vidiZrake = otkriveno;
  } else if (n === "izracunaj") {
    if (pitaF) {
      vidiTocke = otkriveno;
      vidiZrake = otkriveno && !mj;
    } else {
      vidiSliku = vidiZrake = otkriveno;
      vidiPredmet = !pitaA || otkriveno;
    }
  }

  const leca = {
    x: 0,
    pola: n === "zastor" || mj ? otvorLece(s) / 2 : pg.yMax * 0.92,
    vrsta: f > 0 ? "sabirna" : "rastresna",
  };
  const tocke = vidiTocke
    ? [
        { x: -f, oznaka: "F" },
        { x: f, oznaka: "F′" },
        ...(f > 0
          ? [
              { x: -2 * f, oznaka: "2F" },
              { x: 2 * f, oznaka: "2F′" },
            ]
          : []),
      ].filter((t) => t.x > pg.xL && t.x < pg.xR)
    : [];

  let zone = null;
  if (pg.traka) {
    const z = zonaPredmeta(f, a);
    zone = [
      {
        kljuc: "iza_2f",
        od: pg.xL,
        do: -2 * f,
        oznaka: "dalje od 2F",
        opis: "realna · obrnuta · umanjena",
      },
      {
        kljuc: "izmedju",
        od: -2 * f,
        do: -f,
        oznaka: "između F i 2F",
        opis: "realna · obrnuta · uvećana",
      },
      {
        kljuc: "unutar",
        od: -f,
        do: 0,
        oznaka: "unutar F",
        opis: "virtualna · uspravna · uvećana",
      },
    ]
      .map((t) => ({ ...t, od: Math.max(t.od, pg.xL), aktivna: t.kljuc === z }))
      .filter((t) => t.do - t.od > 1e-9);
  }

  const predmet = vidiPredmet ? { x: -a, y, oblik } : null;

  let slika = null;
  let natpis = null;
  if (vidiSliku && n !== "zastor") {
    if (sl.beskonacno)
      natpis =
        "Predmet je u žarištu: zrake nakon leće idu paralelno, slike nema.";
    else {
      const izvanX = sl.b > pg.xR ? "desno" : sl.b < pg.xL ? "lijevo" : null;
      const izvanY =
        Math.abs(sl.y) > R.y1 ? (sl.y > 0 ? "gore" : "dolje") : null;
      slika = {
        x: sl.b,
        y: sl.y,
        oblik,
        virtualna: sl.b < 0,
        izvan: izvanX ?? izvanY,
        tekst: izvanX
          ? `slika je izvan crteža: b = ${cm(sl.b, 1)}`
          : izvanY
            ? `y′ = ${cm(sl.y, 1)}`
            : null,
        rub: izvanX
          ? [
              izvanX === "desno" ? pg.xR : pg.xL,
              Math.max(R.y0 * 0.8, Math.min(R.y1 * 0.8, sl.y)),
            ]
          : null,
      };
      if (sl.b < 0 && f > 0 && n !== "izracunaj")
        natpis =
          "Zrake se iza leće razilaze; sijeku se samo njihovi produžeci, pa je slika virtualna.";
    }
  }

  // zrake
  let zrake = [];
  let ruke = null;
  if (n === "nacrtaj") {
    zrake = zrakeSpeca(s).map((ime) => {
      if (vidiZrake) return putZrake(ime, f, a, y, R);
      const z = parametriZrake(ime, f, a, y);
      const segmenti = [];
      if (ime === "zariste" && a < f) {
        const c = odsijeci([-f, 0], [-a, y], R);
        if (c) segmenti.push({ od: c[0], do: c[1], vrsta: "pomocna" });
      }
      segmenti.push({ od: [-a, y], do: [0, z.h], vrsta: "upadna" });
      const t = stanje.ruke?.[zrakeSpeca(s).indexOf(ime)];
      const sN = nagibRuke(z.h, t);
      if (sN != null) {
        const c = odsijeci([0, z.h], [R.x1, z.h + sN * R.x1], R);
        if (c) segmenti.push({ od: c[0], do: c[1], vrsta: "ucenik" });
      }
      return { ime, segmenti };
    });
    if (!vidiZrake)
      ruke = zrakeSpeca(s).map((ime, i) => {
        const z = parametriZrake(ime, f, a, y);
        const t = stanje.ruke?.[i];
        return {
          ime,
          izlaz: [0, z.h],
          tocka: Array.isArray(t) ? t : pocetnaRuka(s, ime, pg),
          postavljena: Array.isArray(t),
        };
      });
  } else if (vidiZrake && n !== "zastor" && !mj) {
    zrake = zrakeSpeca(s)
      .map((ime) => putZrake(ime, f, a, y, R))
      .filter(Boolean);
  }

  // pokus: svjetlosni stožac iz vrha plamena preko rubova leće (tek nakon točnog odgovora)
  let zastor = null;
  let stozac = [];
  if (n === "zastor" || mj) {
    const x =
      n === "zastor"
        ? isNum(stanje.x)
          ? stanje.x
          : pocetakZastora(s)
        : s.mjerenja[0][1];
    zastor = { x, pola: pg.yMax * 0.92 };
    if (otkriveno || mj) {
      const D2 = otvorLece(s) / 2;
      const kraj = mj ? x : pg.xR;
      for (const h of [D2, -D2, 0]) {
        const s1 = (h - y) / a;
        const s2 = s1 - h / f;
        const seg = [
          { od: [-a, y], do: [0, h], vrsta: "upadna" },
          { od: [0, h], do: [kraj, h + s2 * kraj], vrsta: "izlazna" },
        ];
        stozac.push(
          ...seg
            .map((g) => {
              const c = odsijeci(g.od, g.do, R);
              return c ? { od: c[0], do: c[1], vrsta: g.vrsta } : null;
            })
            .filter(Boolean),
        );
      }
      if (!imaOstruSliku(f, a) && !mj)
        natpis =
          "Zrake se nakon leće razilaze: oštre slike nema ni na jednom mjestu (slika je virtualna, s iste strane kao svijeća).";
    }
  }

  // kote (zadane i izmjerene udaljenosti) ispod ili iznad osi
  const mjere = [];
  const dolje = -pg.yMax * 1.02;
  if (vidiPredmet && (n === "izracunaj" || n === "postavi" || n === "zastor"))
    mjere.push({
      od: -a,
      do: 0,
      y: dolje,
      tekst: pitaA && !otkriveno ? "a = ?" : `a = ${cm(a, 2)}`,
    });
  if (n === "zastor" && zastor)
    mjere.push({
      od: 0,
      do: zastor.x,
      y: dolje,
      tekst: `${broj(zastor.x, 1)} cm`,
    });
  if (n === "izracunaj" && pitaF && !mj && Number.isFinite(sl.b))
    mjere.push({
      od: 0,
      do: sl.b,
      y: pg.yMax * 1.0,
      tekst: `b = ${cm(sl.b, 2)}`,
    });
  if (mj)
    mjere.push({
      od: 0,
      do: s.mjerenja[0][1],
      y: dolje,
      tekst: `b = ${cm(s.mjerenja[0][1], 1)}`,
    });

  const oznake = [];
  if (n === "izracunaj" && vidiTocke && !pitaF)
    oznake.push({ x: f, y: 0, tekst: `f = ${cm(Math.abs(f), 2)}`, uz: "F′" });
  if (
    n === "izracunaj" &&
    vidiPredmet &&
    (pitano(s, "y_slike") || isNum(s.y)) &&
    !mj
  )
    oznake.push({ x: -a, y, tekst: `y = ${cm(y, 2)}`, uz: "predmet" });

  return {
    pogled: pg,
    f,
    a,
    leca,
    tocke,
    zone,
    predmet,
    slika,
    zrake,
    ruke,
    natpis,
    zastor,
    stozac,
    mjere,
    oznake,
    ravnalo: pg.ravnalo ? ravnaloKlupe(pg) : null,
  };
}

// crtice ravnala klupe: udaljenost od leće (lijevo i desno pozitivno), svakih 5 cm, broj svakih 10 cm
function ravnaloKlupe(pg) {
  const raspon = pg.xR - pg.xL;
  const korak = raspon > 160 ? 10 : 5;
  const out = [];
  for (let x = Math.ceil(pg.xL / korak) * korak; x <= pg.xR; x += korak)
    out.push({
      x,
      oznaka: x % (korak * 2) === 0 ? broj(Math.abs(x), 0) : null,
    });
  return out;
}

// Očitanja ispod crteža. U postavi (skriveno) i izracunaj vidi se samo ono što učenik smije znati.
export function ocitanjaLece(s, stanje = {}) {
  const f = isNum(stanje.f) ? stanje.f : fLece(s);
  const a = isNum(stanje.a) ? stanje.a : pocetniA(s);
  const sl = slikaLece(f, a, visinaPredmeta(s));
  const sakrij =
    s.nacin === "postavi" && skrivenoPostavi(s) && !stanje.otkriveno;
  const sve = {
    f: { oznaka: "f", tekst: cm(f, 1) },
    a: { oznaka: "a", tekst: cm(a, 2) },
    b: { oznaka: "b", tekst: sl.beskonacno ? "∞" : cm(sl.b, 2) },
    y_slike: { oznaka: "y′", tekst: sl.beskonacno ? "∞" : cm(sl.y, 2) },
    m: { oznaka: "y′/y", tekst: sl.beskonacno ? "∞" : broj(sl.m, 2) },
    vrsta: { oznaka: "", tekst: vrstaTekst(sl), siroko: true },
  };
  const kljucevi = [
    ...(mijenja(s).includes("f") ? ["f"] : []),
    ...prikaziSpeca(s),
  ];
  return kljucevi.map((k) => ({
    kljuc: k,
    ...sve[k],
    skriveno: sakrij && k !== "a",
  }));
}

// opis crteža za čitač ekrana: samo ono što se vidi
export function opisLece(s, sc) {
  const dijelovi = [
    `Optička klupa: ${sc.leca.vrsta === "sabirna" ? "sabirna" : "rastresna"} leća`,
  ];
  if (sc.tocke.length)
    dijelovi.push(`žarišna daljina ${cm(Math.abs(sc.f), 1)}`);
  if (sc.predmet)
    dijelovi.push(
      `${sc.predmet.oblik === "svijeca" ? "svijeća" : "predmet"} ${cm(sc.a, 1)} ispred leće`,
    );
  if (sc.zastor) dijelovi.push(`zastor ${cm(sc.zastor.x, 1)} iza leće`);
  if (sc.slika)
    dijelovi.push(
      `slika na b = ${cm(sc.slika.x, 1)}, visine ${cm(sc.slika.y, 1)}`,
    );
  if (sc.natpis) dijelovi.push(sc.natpis);
  return dijelovi.join(", ") + ".";
}

// zone za istraživanje ispod osi (tekst za čitač ekrana i natpis)
export const OPIS_ZONE = {
  iza_2f: "predmet dalje od 2F: slika je realna, obrnuta i umanjena",
  na_2f: "predmet u 2F: slika je realna, obrnuta i jednake veličine (u 2F′)",
  izmedju: "predmet između F i 2F: slika je realna, obrnuta i uvećana",
  na_f: "predmet u žarištu: slike nema, zrake izlaze paralelno",
  unutar:
    "predmet unutar žarišne daljine: slika je virtualna, uspravna i uvećana (povećalo)",
  rastresna: "rastresna leća: slika je uvijek virtualna, uspravna i umanjena",
};

// ── izracunaj ───────────────────────────────────────────────────────────────────────────────────────
export function vrijednostIzracuna(s, v) {
  const f = fLece(s);
  if (v === "f") return f;
  if (v === "j") return 100 / f;
  const sl = slikaLece(f, s.a, visinaPredmeta(s));
  return { b: sl.b, y_slike: sl.y, m: sl.m, a: s.a }[v];
}
export function tablicaMjerenja(s) {
  return Array.isArray(s.mjerenja)
    ? s.mjerenja.map(([a, b]) => ({ a: broj(a, 1), b: broj(b, 1) }))
    : null;
}
const tolPitanja = (q, x) =>
  isNum(q.tolerancija) ? q.tolerancija : Math.abs(x) * 0.01;

// tipične krive vrijednosti, izračunate iz speca
export function autoKrivo(s, v) {
  const f = fLece(s);
  const y = visinaPredmeta(s);
  const out = [];
  const dodaj = (x, poruka) => {
    if (Number.isFinite(x) && x !== 0) out.push({ vrijednost: x, poruka });
  };
  if (v === "b" || v === "y_slike" || v === "m" || v === "a") {
    const a = s.a;
    const sl = slikaLece(f, a, y);
    if (v === "b") {
      dodaj(
        -sl.b,
        sl.b < 0
          ? "Iznos je dobar, ali fali minus. Negativan $b$ nije greška: znači da je slika s **iste** strane leće kao predmet (virtualna). Upiši ga s minusom."
          : "Predznak ne valja: predmet je dalje od žarišta ($a > f$), pa je $b$ pozitivan i slika je s druge strane leće.",
      );
      dodaj(
        (a * f) / (a + f),
        "Zbrojio si $\\frac1f$ i $\\frac1a$. Iz $\\frac1a + \\frac1b = \\frac1f$ slijedi $\\frac1b = \\frac1f - \\frac1a$: oduzimaš.",
      );
      dodaj(
        -(a * f) / (a + f),
        "Zbrojio si $\\frac1f$ i $\\frac1a$. Iz $\\frac1a + \\frac1b = \\frac1f$ slijedi $\\frac1b = \\frac1f - \\frac1a$: oduzimaš.",
      );
      dodaj(
        1 / sl.b,
        "To je $\\frac1b$. Na kraju još okreni razlomak: $b = \\frac{af}{a - f}$.",
      );
    }
    if (v === "y_slike") {
      dodaj(
        -sl.y,
        sl.y < 0
          ? "Iznos je dobar, ali slika je obrnuta, pa je $y'$ negativan: $y' = -\\frac ba\\,y$."
          : "Predznak ne valja: slika je uspravna, pa je $y'$ pozitivan ($b$ je negativan, a $y' = -\\frac ba\\,y$).",
      );
      dodaj(
        -(a / sl.b) * y,
        "Omjer je obrnut: $\\frac{y'}{y} = -\\frac ba$, a ne $-\\frac ab$.",
      );
      dodaj(
        (a / sl.b) * y,
        "Omjer je obrnut: $\\frac{y'}{y} = -\\frac ba$, a ne $-\\frac ab$.",
      );
      if (Math.abs(y - 1) > 1e-9)
        dodaj(
          sl.m,
          "To je omjer $\\frac{y'}{y}$. Pomnoži ga visinom predmeta $y$.",
        );
    }
    if (v === "m") {
      dodaj(
        -sl.m,
        "Pazi na predznak: $\\frac{y'}{y} = -\\frac ba$. Negativan omjer znači obrnutu sliku, pozitivan uspravnu.",
      );
      dodaj(-a / sl.b, "Omjer je obrnut: $\\frac{y'}{y} = -\\frac ba$.");
      dodaj(a / sl.b, "Omjer je obrnut: $\\frac{y'}{y} = -\\frac ba$.");
    }
    if (v === "a") {
      const m = sl.m;
      dodaj(
        (f * (m + 1)) / m,
        m > 0
          ? "S tim $a$ slika je **obrnuta**. Uspravna slika znači $\\frac{y'}{y} = +" +
              broj(m, 2) +
              "$, pa je $b = -" +
              broj(m, 2) +
              "\\,a$ (negativan)."
          : "S tim $a$ slika je **uspravna**. Obrnuta slika znači negativan omjer $\\frac{y'}{y}$.",
      );
    }
  }
  if (v === "f") {
    if (Array.isArray(s.mjerenja)) {
      const A = s.mjerenja.map((p) => p[0]);
      const B = s.mjerenja.map((p) => p[1]);
      const sr = (l) => l.reduce((x, z) => x + z, 0) / l.length;
      dodaj(
        (sr(A) * sr(B)) / (sr(A) + sr(B)),
        "Ne uzimaj srednje vrijednosti $a$ i $b$. Izračunaj $f = \\frac{ab}{a+b}$ za **svako** mjerenje, pa uzmi srednju vrijednost tih $f$.",
      );
      dodaj(
        (sr(A) + sr(B)) / 2,
        "To je srednja vrijednost udaljenosti. Žarišnu daljinu daje jednadžba leće: $f = \\frac{ab}{a+b}$.",
      );
      dodaj(
        sr(A),
        "To je srednja vrijednost od $a$. Treba $f = \\frac{ab}{a+b}$ za svako mjerenje.",
      );
      dodaj(
        sr(B),
        "To je srednja vrijednost od $b$. Treba $f = \\frac{ab}{a+b}$ za svako mjerenje.",
      );
      dodaj(
        sr(s.mjerenja.map(([a, b]) => (a + b) / (a * b))),
        "To je $\\frac1f$. Okreni razlomak: $f = \\frac{ab}{a+b}$.",
      );
    } else {
      const sl = slikaLece(f, s.a, y);
      dodaj(
        (s.a + sl.b) / 2,
        "To je srednja vrijednost od $a$ i $b$. Žarišnu daljinu daje $f = \\frac{ab}{a+b}$.",
      );
      dodaj(
        s.a + sl.b,
        "Zbrojio si udaljenosti. Iz $\\frac1f = \\frac1a + \\frac1b$ slijedi $f = \\frac{ab}{a+b}$.",
      );
      dodaj(1 / f, "To je $\\frac1f$. Okreni razlomak: $f = \\frac{ab}{a+b}$.");
    }
  }
  if (v === "j") {
    dodaj(
      1 / f,
      `Jakost je $j = \\frac1f$, ali $f$ mora biti u **metrima**: $f = ${broj(f / 100, 4)}$ m.`,
    );
    dodaj(
      f,
      "To je žarišna daljina. Jakost je njezina obrnuta vrijednost: $j = \\frac1f$ (f u metrima).",
    );
    dodaj(
      f / 100,
      "To je $f$ u metrima. Jakost je obrnuta vrijednost: $j = \\frac1f$.",
    );
    dodaj(
      -100 / f,
      "Pazi na predznak: sabirna leća ima pozitivnu jakost, rastresna negativnu.",
    );
  }
  // bez duplikata i bez vrijednosti preblizu točnoj
  const tocno = vrijednostIzracuna(s, v);
  const vidjeno = [];
  return out.filter((k) => {
    if (!razlicit(k.vrijednost, tocno)) return false;
    if (vidjeno.some((x) => !razlicit(k.vrijednost, x))) return false;
    vidjeno.push(k.vrijednost);
    return true;
  });
}

function checkVrsta(s, o) {
  const sl = slikaLece(fLece(s), s.a, visinaPredmeta(s));
  const tocno = {
    realna: sl.realna,
    uspravna: sl.uspravna,
    uvecana: sl.uvecana,
  };
  if (!o || SVOJSTVA.some((p) => typeof o[p.kljuc] !== "boolean"))
    return {
      tocno: false,
      poruka: "Odaberi sva tri svojstva slike.",
      prazno: true,
    };
  if (SVOJSTVA.every((p) => o[p.kljuc] === tocno[p.kljuc]))
    return { tocno: true };
  if (fLece(s) > 0 && o.realna === o.uspravna)
    return {
      tocno: false,
      poruka:
        "Sabirna leća realnu sliku uvijek daje **obrnutu**, a virtualnu **uspravnu**. Provjeri predznake $b$ i $y'$.",
    };
  if (o.realna !== tocno.realna)
    return {
      tocno: false,
      poruka:
        "Realna ili virtualna: pogledaj predznak od $b$. Pozitivan $b$: slika je s druge strane leće i hvata se na zastoru (realna); negativan: virtualna.",
    };
  if (o.uspravna !== tocno.uspravna)
    return {
      tocno: false,
      poruka:
        "Uspravna ili obrnuta: pogledaj predznak od $y'$ (ili od $\\frac{y'}{y} = -\\frac ba$). Negativan znači obrnuta.",
    };
  return {
    tocno: false,
    poruka: "Uvećana ili umanjena: usporedi $|y'|$ s $y$, odnosno $|b|$ s $a$.",
  };
}

function checkIzracunaj(s, odgovor) {
  const unosi = Array.isArray(odgovor) ? odgovor : [odgovor];
  const vise = s.pitaj.length > 1;
  const polja = [];
  let prva = null;
  for (const [i, q] of s.pitaj.entries()) {
    let r;
    if (q.velicina === "vrsta") r = checkVrsta(s, unosi[i]);
    else {
      const x = vrijednostIzracuna(s, q.velicina);
      const ulaz =
        typeof unosi[i] === "string"
          ? unosi[i].replace(
              /\s*(dpt|dioptrij\w*|m\^?\{?-1\}?|m⁻¹|1\/m)\s*$/i,
              "",
            )
          : (unosi[i] ?? "");
      r = checkNumber({
        input: ulaz,
        answer: x,
        tol: tolPitanja(q, x),
        unit: JEDINICA[q.velicina],
        krivo: [...(q.krivo ?? []), ...autoKrivo(s, q.velicina)],
        savjet: s.savjet || SAVJET[q.velicina],
      });
    }
    if (r.prazno)
      return {
        tocno: false,
        poruka: vise
          ? `${velikoSlovo(NAZIV[q.velicina])}: ${malo(r.poruka)}`
          : r.poruka,
        prazno: true,
        polja: s.pitaj.map((_, j) => (j < i ? polja[j] : null)),
      };
    polja.push(!!r.tocno);
    if (!r.tocno && !prva) prva = { ...r, q };
  }
  if (!prva) return { tocno: true, polja };
  return {
    tocno: false,
    poruka: vise
      ? `${velikoSlovo(NAZIV[prva.q.velicina])}: ${prva.poruka}`
      : prva.poruka,
    polja,
  };
}
const velikoSlovo = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const malo = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const SAVJET = {
  b: "Nije točno. Iz $\\frac1a + \\frac1b = \\frac1f$ izrazi $b = \\frac{af}{a - f}$ i pazi na predznak.",
  y_slike: "Nije točno. Visina slike je $y' = -\\frac ba\\,y$ (s predznakom).",
  m: "Nije točno. Povećanje je $\\frac{y'}{y} = -\\frac ba$.",
  f: "Nije točno. Iz jednadžbe leće: $f = \\frac{ab}{a+b}$.",
  j: "Nije točno. Jakost je $j = \\frac1f$, uz $f$ u metrima.",
  a: "Nije točno. Iz $\\frac{y'}{y} = -\\frac ba$ izrazi $b$ preko $a$ i uvrsti u jednadžbu leće.",
};
// točne vrijednosti za „pokaži“ (tekst za polja i prekidače)
export function rjesenjeIzracuna(s) {
  return s.pitaj.map((q) => {
    if (q.velicina === "vrsta") {
      const sl = slikaLece(fLece(s), s.a, visinaPredmeta(s));
      return { realna: sl.realna, uspravna: sl.uspravna, uvecana: sl.uvecana };
    }
    return broj(vrijednostIzracuna(s, q.velicina), 2);
  });
}

// ── provjere ostalih načina ─────────────────────────────────────────────────────────────────────────
function checkZastor(s, odgovor) {
  const A = listaA(s);
  const unosi = Array.isArray(odgovor) ? odgovor : [odgovor];
  const polja = A.map(() => null);
  const prazan = A.findIndex((_, i) => unosi[i] == null || unosi[i] === "");
  if (prazan >= 0)
    return {
      tocno: false,
      poruka: `Zabilježi mjerenje i za $a = ${broj(A[prazan], 1)}$ cm.`,
      prazno: true,
    };
  let prva = null;
  A.forEach((a, i) => {
    const u = unosi[i];
    let poruka = null;
    if (imaOstruSliku(s.f, a)) {
      const b = slikaLece(s.f, a).b;
      if (u === "nema")
        poruka = `Za $a = ${broj(a, 1)}$ cm oštra slika **postoji**. Pomiči zastor polako i gledaj kad je plamen najoštriji.`;
      else {
        const x = typeof u === "number" ? u : parseNumber(String(u), "cm");
        if (!isNum(x)) poruka = "Pomakni zastor i zabilježi njegov položaj.";
        else if (Math.abs(x - b) > tolZastora(s, b) + 1e-9)
          poruka = `Za $a = ${broj(a, 1)}$ cm slika je još mutna: zastor je ${x < b ? "preblizu leći" : "predaleko od leće"}.`;
      }
    } else if (u !== "nema")
      poruka = `Za $a = ${broj(a, 1)}$ cm je li plamen na zastoru igdje oštar? Pomakni zastor cijelom duljinom klupe.`;
    polja[i] = poruka == null;
    if (poruka && !prva) prva = poruka;
  });
  if (!prva) return { tocno: true, polja };
  return { tocno: false, poruka: prva, polja };
}

const KRATKO_ZRAKE = {
  paralelna: "Paralelna zraka",
  centar: "Zraka kroz središte",
  zariste: "Zraka kroz F",
};
const OPIS_PRAVILA = {
  paralelna: "Paralelna zraka nakon leće prolazi kroz žarište **F′ iza leće**.",
  centar:
    "Zraka kroz optičko središte **ne skreće**: nastavlja ravno, istim smjerom.",
  zariste:
    "Zraka koja prolazi kroz žarište F nakon leće ide **paralelno s osi**.",
};
function checkNacrtaj(s, odgovor) {
  const pg = pogledLece(s);
  const imena = zrakeSpeca(s);
  const ruke = Array.isArray(odgovor) ? odgovor : [];
  const y = visinaPredmeta(s);
  const neokrenute = imena.filter((_, i) => !Array.isArray(ruke[i]));
  if (neokrenute.length)
    return {
      tocno: false,
      poruka: `Okreni sve zrake (još ${neokrenute.length}): povuci kružić na kraju svake zrake.`,
      prazno: true,
    };
  const polja = [];
  let prva = null;
  imena.forEach((ime, i) => {
    const z = parametriZrake(ime, s.f, s.a, y);
    const sN = nagibRuke(z.h, ruke[i]);
    const isti = (c) =>
      sN != null && Math.abs(kutPogleda(pg, sN) - kutPogleda(pg, c)) <= 2;
    const ok = isti(z.sIzlaz);
    polja.push(ok);
    if (ok || prva) return;
    const ime1 = KRATKO_ZRAKE[ime];
    let p = OPIS_PRAVILA[ime];
    if (sN == null) p = "Zraka nakon leće ide dalje udesno, kroz leću.";
    else if (ime === "paralelna" && isti(0))
      p = "Ne prolazi ravno: leća je lomi. " + OPIS_PRAVILA.paralelna;
    else if (ime === "paralelna" && isti(z.h / s.f))
      p =
        "Usmjerio si je kao da dolazi iz F **ispred** leće. Paralelna zraka nakon leće prolazi kroz žarište **F′ iza leće**.";
    else if (ime === "centar" && isti(0))
      p =
        "Paralelno s osi izlazi zraka koja je došla kroz F. Zraka kroz optičko središte **ne skreće**.";
    else if (ime === "zariste" && isti(z.sUlaz))
      p = "Ne nastavlja ravno: leća je lomi. " + OPIS_PRAVILA.zariste;
    else if (ime === "zariste" && isti(-z.h / s.f))
      p =
        "Kroz F′ prolazi zraka koja je došla **paralelno** s osi. " +
        OPIS_PRAVILA.zariste;
    prva = `**${ime1}:** ${p}`;
  });
  if (!prva) return { tocno: true, polja };
  return { tocno: false, poruka: prva, polja };
}

function checkPostavi(s, odgovor) {
  const a = isNum(odgovor) ? odgovor : odgovor?.a;
  if (!isNum(a))
    return { tocno: false, poruka: "Pomakni predmet.", prazno: true };
  const hit = (s.krivo ?? []).find(
    (k) => Math.abs(k.vrijednost - a) <= korakA(s) / 2 + 1e-9,
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  if (ostvaruje(s, a)) return { tocno: true };
  const f = s.f;
  const y = visinaPredmeta(s);
  const sl = slikaLece(f, a, y);
  const aT = aZaCilj(s);
  const smjer =
    aT > a
      ? "Pomakni predmet **dalje** od leće."
      : "Pomakni predmet **bliže** leći.";
  if (sl.beskonacno)
    return {
      tocno: false,
      poruka: `Predmet je točno u žarištu: zrake izlaze paralelno i slike nema. ${smjer}`,
    };
  const v = s.cilj.vrijednost;
  if (s.cilj.velicina === "b") {
    if (Math.sign(sl.b) !== Math.sign(v))
      return {
        tocno: false,
        poruka:
          v < 0
            ? `Slika je sad realna, s druge strane leće (b = ${cm(sl.b, 1)}). Slika s iste strane kao predmet (b < 0) nastaje kad je predmet **bliže** leći od žarišta.`
            : `Slika je sad virtualna (b = ${cm(sl.b, 1)}). Realnu sliku dobiješ kad je predmet dalje od žarišta.`,
      };
    return {
      tocno: false,
      poruka: `Slika je sad na b = ${cm(sl.b, 1)}, a treba ${cm(v, 1)}. ${smjer}`,
    };
  }
  const m = sl.m;
  const mT = s.cilj.velicina === "m" ? v : v / y;
  const opisM = (x) =>
    `${x > 0 ? "uspravna" : "obrnuta"} i ${Math.abs(x) > 1 ? `${broj(Math.abs(x), 2)}× veća` : `${broj(Math.abs(x), 2)} od predmeta`}`;
  if (Math.sign(m) !== Math.sign(mT)) {
    if (Math.abs(Math.abs(m) - Math.abs(mT)) <= Math.abs(mT) * 0.01 + 1e-9)
      return {
        tocno: false,
        poruka:
          mT > 0
            ? `Ovo je **obrnuta** slika ${broj(Math.abs(m), 2)}× veća. Uspravnu sliku sabirna leća daje samo kad je predmet bliže od žarišta.`
            : `Ovo je **uspravna** (virtualna) slika. Obrnutu sliku dobiješ kad je predmet dalje od žarišta.`,
      };
    return {
      tocno: false,
      poruka:
        mT > 0
          ? `Slika je sad obrnuta (y′/y = ${broj(m, 2)}). Za uspravnu sliku predmet mora biti bliže leći od žarišta.`
          : `Slika je sad uspravna (y′/y = ${broj(m, 2)}). Za obrnutu sliku predmet mora biti dalje od žarišta.`,
    };
  }
  return {
    tocno: false,
    poruka: `Slika je sad ${opisM(m)} (y′/y = ${broj(m, 2)}), a treba ${broj(mT, 2)}. ${smjer}`,
  };
}

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
const SVA_POLJA = [
  "a",
  "y",
  "predmet",
  "zrake",
  "mijenja",
  "a_raspon",
  "f_raspon",
  "korak",
  "prikazi",
  "zone",
  "otvor",
  "zastor_raspon",
  "tolerancija",
  "cilj",
  "skriveno",
  "krivo",
  "pitaj",
  "mjerenja",
];
const POLJA_NACINA = {
  istrazi: [
    "a",
    "y",
    "predmet",
    "zrake",
    "mijenja",
    "a_raspon",
    "f_raspon",
    "korak",
    "prikazi",
    "zone",
  ],
  prikaz: ["a", "y", "predmet", "zrake", "prikazi"],
  zastor: ["a", "y", "otvor", "zastor_raspon", "tolerancija", "predmet"],
  nacrtaj: ["a", "y", "predmet", "zrake"],
  postavi: [
    "a",
    "y",
    "predmet",
    "zrake",
    "korak",
    "a_raspon",
    "cilj",
    "skriveno",
    "krivo",
    "prikazi",
  ],
  izracunaj: ["a", "y", "predmet", "zrake", "pitaj", "mjerenja", "otvor"],
};
const raspon = (r, lo, hi) =>
  Array.isArray(r) &&
  r.length === 2 &&
  r.every(isNum) &&
  r[0] >= lo &&
  r[1] <= hi &&
  r[0] < r[1];

function validateLeca(s) {
  const { list, need } = problems();
  if (
    !need(
      NACINI.includes(s.nacin),
      `leca.nacin mora biti jedan od: ${NACINI.join(", ")}`,
    )
  )
    return list;
  need(isText(s.tekst), "leca treba „tekst“");
  const n = s.nacin;
  for (const p of SVA_POLJA)
    need(
      !(p in s) || POLJA_NACINA[n].includes(p),
      `polje „${p}“ ne postoji u načinu ${n} (polja: ${POLJA_NACINA[n].join(", ")})`,
    );
  if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
  const mj = Array.isArray(s.mjerenja);
  if (!(n === "izracunaj" && mj && s.f == null))
    need(
      isNum(s.f) && Math.abs(s.f) >= 2 && Math.abs(s.f) <= 100,
      "f mora biti broj (cm), |f| od 2 do 100; pozitivan za sabirnu, negativan za rastresnu leću",
    );
  if (["zastor", "nacrtaj"].includes(n))
    need(!(s.f < 0), `${n} je samo za sabirnu leću (f > 0)`);
  if (s.y != null)
    need(
      isNum(s.y) && s.y > 0 && s.y <= 50,
      "y (visina predmeta) mora biti broj od 0 do 50 cm",
    );
  if (s.predmet != null)
    need(
      PREDMETI.includes(s.predmet),
      `predmet mora biti ${PREDMETI.join(" ili ")}`,
    );
  if (s.zrake != null)
    need(
      Array.isArray(s.zrake) &&
        s.zrake.length >= (n === "nacrtaj" ? 2 : 1) &&
        s.zrake.every((z) => ZRAKE.includes(z)) &&
        new Set(s.zrake).size === s.zrake.length,
      `zrake mora biti popis različitih zraka iz: ${ZRAKE.join(", ")}${n === "nacrtaj" ? " (najmanje dvije)" : ""}`,
    );
  if (s.prikazi != null)
    need(
      Array.isArray(s.prikazi) &&
        s.prikazi.length >= 1 &&
        s.prikazi.every((p) => OCITANJA.includes(p)) &&
        new Set(s.prikazi).size === s.prikazi.length,
      `prikazi mora biti popis očitanja iz: ${OCITANJA.join(", ")}`,
    );
  if (list.length) return list;

  const f = fLece(s);
  const aOk = (a) => isNum(a) && a >= 0.5 && a <= 300;
  if (n === "zastor") {
    const A = listaA(s);
    if (
      !need(
        A.length >= 1 &&
          A.length <= 4 &&
          A.every((a) => isNum(a) && a >= 1 && a <= 300) &&
          new Set(A).size === A.length &&
          (isNum(s.a) || Array.isArray(s.a)),
        "zastor: a je udaljenost svijeće (cm) ili popis 1–4 različite udaljenosti od 1 do 300 cm",
      )
    )
      return list;
    if (s.otvor != null)
      need(
        isNum(s.otvor) && s.otvor >= 1 && s.otvor <= 20,
        "otvor (promjer leće) mora biti od 1 do 20 cm",
      );
    if (s.tolerancija != null)
      need(
        isNum(s.tolerancija) && s.tolerancija > 0 && s.tolerancija <= 5,
        "tolerancija mora biti od 0 do 5 cm",
      );
    if (
      s.zastor_raspon != null &&
      !need(
        raspon(s.zastor_raspon, 0.5, 400),
        "zastor_raspon mora biti [od, do] u cm, 0,5 ≤ od < do ≤ 400",
      )
    )
      return list;
    const [lo, hi] = rasponZastora(s);
    A.filter((a) => imaOstruSliku(f, a)).forEach((a) => {
      const b = slikaLece(f, a).b;
      need(
        b >= lo + 0.5 && b <= hi - 0.5,
        `za a = ${broj(a, 1)} cm oštra slika je na ${broj(b, 1)} cm, izvan klupe (${broj(lo, 1)}–${broj(hi, 1)} cm); smanji ili povećaj zastor_raspon`,
      );
      need(
        b <= 8 * f,
        `za a = ${broj(a, 1)} cm slika je predaleko (b = ${broj(b, 1)} cm); predmet stavi dalje od žarišta`,
      );
    });
    need(
      pocetakZastora(s) != null,
      "zastor nema početni položaj dovoljno daleko od oštrih slika; proširi zastor_raspon",
    );
    return list;
  }
  if (
    !(n === "izracunaj" && mj && s.a == null) &&
    !need(aOk(s.a), "a (udaljenost predmeta) mora biti broj od 0,5 do 300 cm")
  )
    return list;

  if (n === "istrazi" || n === "postavi") {
    if (s.korak != null)
      need(
        isNum(s.korak) && s.korak >= 0.1 && s.korak <= 5,
        "korak mora biti od 0,1 do 5 cm",
      );
    if (
      s.a_raspon != null &&
      !need(
        raspon(s.a_raspon, 0.1, 300),
        "a_raspon mora biti [od, do] u cm, 0,1 ≤ od < do ≤ 300",
      )
    )
      return list;
    const [lo, hi] = rasponA(s);
    need(
      s.a >= lo - 1e-9 && s.a <= hi + 1e-9,
      `a = ${broj(s.a)} nije u rasponu ${broj(lo)}–${broj(hi)} cm`,
    );
    need(
      Math.abs(s.a / korakA(s) - Math.round(s.a / korakA(s))) < 1e-6,
      "a mora biti na koraku pomicanja (korak)",
    );
  }
  if (n === "istrazi") {
    if (s.zone != null)
      need(typeof s.zone === "boolean", "zone mora biti true ili false");
    if (s.mijenja != null)
      need(
        Array.isArray(s.mijenja) &&
          s.mijenja.length >= 1 &&
          s.mijenja.every((m) => m === "a" || m === "f") &&
          new Set(s.mijenja).size === s.mijenja.length,
        "mijenja mora biti popis iz: a, f",
      );
    if (mijenja(s).includes("f")) {
      if (
        need(
          Array.isArray(s.f_raspon) &&
            s.f_raspon.length === 2 &&
            s.f_raspon.every(isNum) &&
            s.f_raspon[0] < s.f_raspon[1] &&
            s.f_raspon.every(
              (x) =>
                Math.sign(x) === Math.sign(s.f) &&
                Math.abs(x) >= 2 &&
                Math.abs(x) <= 100,
            ),
          "uz mijenja f treba f_raspon: [od, do] istog predznaka kao f, |f| od 2 do 100 cm",
        )
      )
        need(
          s.f >= s.f_raspon[0] && s.f <= s.f_raspon[1],
          "f mora biti unutar f_raspon",
        );
    } else
      need(
        s.f_raspon == null,
        'f_raspon ima smisla samo uz mijenja: ["a", "f"]',
      );
  }
  if (n === "prikaz" || n === "nacrtaj" || (n === "izracunaj" && !mj)) {
    const sl = slikaLece(f, s.a, visinaPredmeta(s));
    if (n !== "prikaz")
      need(
        !sl.beskonacno,
        "predmet ne smije biti točno u žarištu (a = f): slike nema",
      );
    if (!sl.beskonacno)
      need(
        Math.abs(sl.b) <= 10 * Math.abs(f),
        `slika je predaleko za crtež (b = ${broj(sl.b, 1)} cm); predmet makni dalje od žarišta`,
      );
  }
  if (n === "prikaz" || n === "istrazi") noAnswerFields(s, need);
  if (n === "nacrtaj") {
    const sl = slikaLece(f, s.a, visinaPredmeta(s));
    need(
      Math.abs(s.a - f) >= 0.15 * f,
      "nacrtaj: predmet mora biti barem 0,15 f od žarišta (inače zrake izlaze gotovo paralelno)",
    );
    if (!sl.beskonacno)
      need(
        Math.abs(sl.m) <= 6,
        "nacrtaj: slika je više od 6× veća od predmeta; stavi predmet dalje od žarišta",
      );
  }
  if (n === "postavi") validatePostavi(s, need);
  if (n === "izracunaj") validateIzracunaj(s, need, mj);
  return list;
}

function validatePostavi(s, need) {
  const c = s.cilj;
  if (
    !need(
      c &&
        typeof c === "object" &&
        CILJEVI.includes(c.velicina) &&
        isNum(c.vrijednost) &&
        c.vrijednost !== 0,
      `cilj mora biti {velicina: ${CILJEVI.join(" | ")}, vrijednost (broj ≠ 0), tolerancija?}`,
    )
  )
    return;
  if (
    c.tolerancija != null &&
    !need(
      isNum(c.tolerancija) && c.tolerancija > 0,
      "cilj.tolerancija mora biti pozitivan broj",
    )
  )
    return;
  if (c.velicina === "y_slike")
    need(isNum(s.y), "cilj y_slike treba zadanu visinu predmeta y");
  if (s.skriveno != null)
    need(typeof s.skriveno === "boolean", "skriveno mora biti true ili false");
  const aT = aZaCilj(s);
  if (
    !need(
      Number.isFinite(aT) && aT > 0,
      "cilj se ne može postići ovom lećom (predmet bi morao biti iza leće)",
    )
  )
    return;
  const [lo, hi] = rasponA(s);
  need(
    aT >= lo - 1e-9 && aT <= hi + 1e-9,
    `cilj traži a = ${broj(aT)} cm, izvan a_raspon (${broj(lo)}–${broj(hi)} cm)`,
  );
  need(
    mrezaA(s).some((a) => ostvaruje(s, a)),
    `cilj traži a = ${broj(aT, 3)} cm, a to nije na koraku pomicanja (${broj(korakA(s))} cm); promijeni korak ili cilj`,
  );
  need(!ostvaruje(s, s.a), "početni položaj predmeta već ostvaruje cilj");
  validateKrivo(s.krivo, null, 0, need);
  if (Array.isArray(s.krivo))
    s.krivo.forEach(
      (k, i) =>
        isNum(k?.vrijednost) &&
        need(
          !ostvaruje(s, k.vrijednost),
          `krivo[${i}].vrijednost ${broj(k.vrijednost)} ostvaruje cilj, a to je točan odgovor`,
        ),
    );
}

function validateIzracunaj(s, need, mj) {
  if (
    !need(
      Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 4,
      "izracunaj treba pitaj: 1–4 tražene veličine",
    )
  )
    return;
  const vidjeno = new Set();
  for (const [i, q] of s.pitaj.entries()) {
    if (
      !need(
        q && VELICINE.includes(q.velicina),
        `pitaj[${i}].velicina mora biti jedna od: ${VELICINE.join(", ")}`,
      )
    )
      continue;
    need(!vidjeno.has(q.velicina), `pitaj[${i}] se ponavlja`);
    vidjeno.add(q.velicina);
    for (const k of Object.keys(q))
      need(
        ["velicina", "oznaka", "tolerancija", "krivo"].includes(k),
        `pitaj[${i}]: nepoznato polje „${k}“ (velicina, oznaka?, tolerancija?, krivo?)`,
      );
    if (q.oznaka != null)
      need(isText(q.oznaka), `pitaj[${i}].oznaka mora biti tekst`);
    if (q.velicina === "vrsta") {
      need(
        q.tolerancija == null && q.krivo == null,
        `pitaj[${i}]: vrsta nema toleranciju ni krivo`,
      );
      continue;
    }
    if (q.tolerancija != null)
      need(
        isNum(q.tolerancija) && q.tolerancija >= 0,
        `pitaj[${i}].tolerancija mora biti broj ≥ 0`,
      );
    const x = vrijednostIzracuna(s, q.velicina);
    if (
      need(
        Number.isFinite(x),
        `pitaj[${i}]: ${NAZIV[q.velicina]} nije konačan broj`,
      )
    )
      validateKrivo(q.krivo, x, tolPitanja(q, x), need, `pitaj[${i}].krivo`);
  }
  const fj = [...vidjeno].filter((v) => v === "f" || v === "j");
  need(
    !fj.length || fj.length === vidjeno.size,
    "f i j pitaju se same (iz a i b); ne miješaj ih s b, y′, y′/y, a ili vrstom",
  );
  if (mj) {
    if (
      !need(
        s.mjerenja.length >= 1 &&
          s.mjerenja.length <= 8 &&
          s.mjerenja.every(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              p.every((x) => isNum(x) && x > 0 && x <= 400),
          ),
        "mjerenja mora biti popis 1–8 parova [a, b] u cm (pozitivni brojevi)",
      )
    )
      return;
    need(fj.length > 0, "mjerenja (tablica a, b) idu samo uz pitaj f ili j");
    const fm = fIzMjerenja(s);
    s.mjerenja.forEach(([a, b], i) =>
      need(
        Math.abs((a * b) / (a + b) - fm) <= 0.03 * fm,
        `mjerenja[${i}] = [${broj(a)}, ${broj(b)}] ne odgovara istoj leći (f = ${broj((a * b) / (a + b))} cm, a srednja vrijednost je ${broj(fm)} cm)`,
      ),
    );
    if (isNum(s.f))
      need(
        Math.abs(s.f - fm) <= 0.02 * fm,
        `f = ${broj(s.f)} ne odgovara mjerenjima (srednja vrijednost ${broj(fm)} cm)`,
      );
  } else {
    if (vidjeno.has("y_slike"))
      need(isNum(s.y), "za y′ treba zadana visina predmeta y");
    if (vidjeno.has("vrsta")) {
      const sl = slikaLece(fLece(s), s.a, visinaPredmeta(s));
      need(
        !sl.jednaka,
        "vrsta: predmet u 2F daje sliku jednake veličine; izaberi drugi a",
      );
    }
  }
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Tanka leća na optičkoj klupi (fizika, matura; jednadžba leće 1/a + 1/b = 1/f, y′/y = −b/a). Sve udaljenosti u cm. Konvencija predznaka kao u rješenjima: b < 0 = virtualna slika s iste strane kao predmet, y′ < 0 = obrnuta slika, f > 0 sabirna, f < 0 rastresna leća. Zrake, sliku, zamućenje na zastoru i sve točne odgovore računa aplikacija.
Polja: tekst, nacin, f (cm; uz mjerenja smije izostati), a (udaljenost predmeta), y? (visina predmeta, zadano 3), predmet? ("strelica" | "svijeca"; zastor i mjerenja zadano svijeća), zrake? (podskup od "paralelna", "centar", "zariste"; zadano sve tri).
Načini:
- "istrazi" (Istraži): učenik vuče predmet (i F′ ako mijenja sadrži "f"), uživo se crtaju karakteristične zrake i slika (puna = realna, crtkana s produžecima = virtualna) i ispisuju a, b, y′, y′/y i vrsta slike; ispod osi traka sa zonama (dalje od 2F, između F i 2F, unutar F). mijenja? (["a"] zadano ili ["a", "f"]), a_raspon? [od, do], f_raspon? (uz "f"), korak? (cm, zadano 0,5), prikazi? (podskup od a, b, y_slike, m, vrsta), zone? (false skriva traku). a = f: zrake izlaze paralelno, slike nema.
- "prikaz" (Pogledaj): isti crtež bez povlačenja (zamjena za sliku u objašnjenju).
- "zastor" (Tvoj red, pokus): svijeća na a (broj ili popis 1–4 udaljenosti), leća i zastor koji učenik vuče (fino ‹ ›). Na zastoru je plamen zamućen koliko bi stvarno bio (otvor? = promjer leće, zadano 6 cm); F se ne vidi. Za svaki a učenik namjesti oštru sliku i zabilježi; ako je a ≤ f, točno je „Nema oštre slike“. tolerancija? (cm, zadano max(0,3; 1 % b)), zastor_raspon? [od, do]. Odgovor je tablica izmjerenih b.
- "nacrtaj" (Tvoj red): sabirna leća, upadne zrake (najmanje 2) nacrtane do leće; učenik okreće izlazni dio svake zrake (povlači kružić; zraka se privuče na F, F′, 2F, 2F′, vodoravno i ravno dalje). Točno do 2°. Kad su sve zrake dobre, pojavi se slika (virtualna s crtkanim produžecima). Poruke za tipične greške (paralelna kroz F ispred leće, zraka kroz središte skrenuta, zraka kroz F nastavlja ravno) dodaju se same.
- "postavi" (Tvoj red): učenik vuče predmet (korak? zadano 0,5 cm, a_raspon?) dok slika ne ispuni cilj: {velicina: "m" (y′/y s predznakom, npr. 1.25 = uspravna 25 % veća) | "b" | "y_slike", vrijednost, tolerancija? (zadano 1 %)}. skriveno? (zadano true): slika, zrake i brojevi slike vide se tek nakon provjere tog položaja. Poruke za obrnutu umjesto uspravne slike i smjer pomicanja dodaju se same; krivo?: [{vrijednost (a u cm), poruka}].
- "izracunaj" (Tvoj red): pitaj: [{velicina: "b" | "y_slike" | "m" | "f" | "j" | "a" | "vrsta", oznaka?, tolerancija? (zadano 1 %), krivo?}] (1–4). Crtež ne odaje odgovor: slika i zrake (i F kad se pita f ili j; i predmet kad se pita a) pojave se tek nakon točnog odgovora. "vrsta" su tri prekidača (realna/virtualna, uspravna/obrnuta, uvećana/umanjena). j je u m⁻¹ (dioptrije). Uz pitaj f/j može mjerenja: [[a, b], …] (tablica pokusa; f je srednja vrijednost od ab/(a+b)). Tipične krive vrijednosti dodaju se same: b bez minusa, zbrojeno umjesto oduzeto (af/(a+f)), neokrenuti 1/b, y′ bez predznaka ili s obrnutim omjerom, j uz f u cm (0,08), srednja vrijednost a i b umjesto f, a za obrnutu umjesto uspravne slike.`;

// 1145 a: konstrukcija slike
const PRIMJER = {
  tip: TIP,
  nacin: "nacrtaj",
  f: 10,
  a: 14,
  y: 6,
  zrake: ["paralelna", "centar", "zariste"],
  tekst:
    "Predmet visok 6 cm stoji 14 cm ispred sabirne leće žarišne daljine 10 cm. **Okreni izlazni dio svake zrake** tako da ide kamo je leća lomi. Gdje se sijeku, tamo je vrh slike.",
};

const PRIMJERI = [
  // istraživanje: kroz sve zone (1145)
  {
    tip: TIP,
    nacin: "istrazi",
    f: 10,
    a: 25,
    y: 4,
    a_raspon: [2, 40],
    tekst:
      "**Vuci predmet** prema leći i gledaj kako se slika mijenja: gdje je realna, gdje uvećana, a kad postane virtualna (povećalo).",
  },
  // 1140 a: pokus sa zastorom
  {
    tip: TIP,
    nacin: "zastor",
    f: 12.5,
    a: [30, 35, 40, 65],
    tekst:
      "Za svaki položaj svijeće **pomakni zastor dok plamen ne bude oštar** i zabilježi udaljenost zastora od leće.",
  },
  // 1140 b: predmet unutar žarišne daljine
  {
    tip: TIP,
    nacin: "zastor",
    f: 12.5,
    a: 10,
    tekst:
      "Svijeća je sad samo 10 cm ispred iste leće. **Potraži oštru sliku** plamena na zastoru.",
  },
  // 1140 a: f i jakost iz tablice
  {
    tip: TIP,
    nacin: "izracunaj",
    mjerenja: [
      [30, 21.4],
      [35, 19.4],
      [40, 18.2],
      [65, 15.5],
    ],
    pitaj: [{ velicina: "f" }, { velicina: "j" }],
    tekst:
      "Iz izmjerenih parova izračunaj srednju vrijednost žarišne daljine leće i njezinu jakost.",
  },
  // 1140 b: gdje je slika i kakva je
  {
    tip: TIP,
    nacin: "izracunaj",
    f: 12.5,
    a: 10,
    pitaj: [{ velicina: "b" }, { velicina: "vrsta" }],
    tekst:
      "Predmet je 10 cm ispred leće žarišne daljine 12,5 cm. Gdje nastaje slika i kakva je?",
  },
  // 1145 a: račun
  {
    tip: TIP,
    nacin: "izracunaj",
    f: 10,
    a: 14,
    y: 6,
    pitaj: [{ velicina: "b" }, { velicina: "y_slike" }, { velicina: "vrsta" }],
    tekst:
      "Predmet visok 6 cm stoji 14 cm ispred sabirne leće žarišne daljine 10 cm. Gdje nastaje slika, kolika je i kakva je?",
  },
  // 1145 b: povećalo
  {
    tip: TIP,
    nacin: "postavi",
    f: 10,
    a: 6,
    y: 2,
    a_raspon: [0.5, 30],
    cilj: { velicina: "m", vrijednost: 1.25 },
    tekst:
      "Leća žarišne daljine 10 cm kao povećalo daje **uspravnu** sliku uvećanu za 25 %. Izračunaj gdje je predmet, pa ga **postavi** tamo.",
  },
  // 1146 b: račun udaljenosti predmeta
  {
    tip: TIP,
    nacin: "izracunaj",
    f: 24,
    a: 4,
    pitaj: [{ velicina: "a" }],
    tekst:
      "Leća žarišne daljine 24 cm kao povećalo daje uspravnu sliku uvećanu za 20 %. Koliko je predmet udaljen od leće?",
  },
  // povećalo: konstrukcija virtualne slike (1145 b)
  {
    tip: TIP,
    nacin: "nacrtaj",
    f: 10,
    a: 6,
    y: 2,
    zrake: ["paralelna", "centar"],
    tekst:
      "Predmet je **bliže** leći od žarišta. Okreni izlazne zrake. Sijeku li se iza leće?",
  },
  // 1147 a: gotova konstrukcija
  {
    tip: TIP,
    nacin: "prikaz",
    f: 28,
    a: 44,
    y: 4,
    tekst:
      "Predmet visok 4 cm, 44 cm ispred leće žarišne daljine 28 cm: tri karakteristične zrake sijeku se u vrhu slike.",
  },
  // rastresna leća
  {
    tip: TIP,
    nacin: "istrazi",
    f: -15,
    a: 30,
    y: 4,
    a_raspon: [3, 45],
    mijenja: ["a", "f"],
    f_raspon: [-25, -5],
    tekst:
      "Rastresna leća: **vuci predmet i žarište F′**. Može li slika ikad biti realna ili uvećana?",
  },
];

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const leca = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (GLEDANJE.includes(s.nacin) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate: validateLeca,
  check(s, odgovor) {
    if (s.nacin === "zastor") return checkZastor(s, odgovor);
    if (s.nacin === "nacrtaj") return checkNacrtaj(s, odgovor);
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    const f = fLece(s);
    const y = visinaPredmeta(s);
    if (s.nacin === "zastor")
      return listaA(s)
        .map((a) => {
          if (!imaOstruSliku(f, a))
            return `a = ${cm(a, 1)}: oštre slike nema (predmet je unutar žarišne daljine; slika je virtualna, b = ${cm(slikaLece(f, a).b, 1)})`;
          return `a = ${cm(a, 1)} → b = ${cm(slikaLece(f, a).b, 1)}`;
        })
        .join("; ");
    if (s.nacin === "nacrtaj") {
      const sl = slikaLece(f, s.a, y);
      return `paralelna zraka kroz F′, zraka kroz središte ravno, zraka kroz F paralelno s osi; slika: b = ${cm(sl.b)}, y′ = ${cm(sl.y)} (${vrstaTekst(sl).replaceAll(" · ", ", ")})`;
    }
    if (s.nacin === "postavi") {
      const aT = aZaCilj(s);
      const sl = slikaLece(f, aT, y);
      return `a = ${cm(aT)} (tada je b = ${cm(sl.b)}, y′/y = ${broj(sl.m, 2)})`;
    }
    if (s.nacin === "izracunaj")
      return s.pitaj
        .map((q) => {
          if (q.velicina === "vrsta")
            return vrstaTekst(slikaLece(f, s.a, y)).replaceAll(" · ", ", ");
          const x = vrijednostIzracuna(s, q.velicina);
          const o = {
            b: "b",
            y_slike: "y′",
            m: "y′/y",
            f: "f",
            j: "j",
            a: "a",
          }[q.velicina];
          return `${o} = ${broj(x, 2)}${JEDINICA[q.velicina] ? `\u00a0${JEDINICA[q.velicina]}` : ""}`;
        })
        .join("; ");
    return "";
  },
};
