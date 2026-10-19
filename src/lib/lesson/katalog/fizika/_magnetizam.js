// Zajednička fizika magnetskih widgeta (smjer_u_polju, indukcija, naboj_u_polju): smjerovi kao jedinični vektori,
// vektorski umnožak, polje vodiča, magneta i zavojnice, Lenzovo pravilo i praćenje silnica. Čisti JS (bez DOM-a i
// Intl-a): isti kod crta komponenta i provjerava katalog, pa crtež i provjera nikad ne kažu različito.
//
// Koordinate: x udesno, y prema gore (kao u fizici, ne kao u SVG-u), z prema promatraču (iz papira).

import { formatSci, parseNumber } from "../../core/number.js";
import { checkNumber } from "../zajednicko.js";

export const MU0 = 4 * Math.PI * 1e-7;
export const E = 1.6e-19; // elementarni naboj (knjižica formula)
export const ME = 9.11e-31; // masa elektrona
export const MP = 1.67e-27; // masa protona

// ── smjerovi ──────────────────────────────────────────────────────────────────────────────────────
export const SMJEROVI = {
  gore: [0, 1, 0],
  dolje: [0, -1, 0],
  lijevo: [-1, 0, 0],
  desno: [1, 0, 0],
  iz_papira: [0, 0, 1],
  u_papir: [0, 0, -1],
};
export const SMJER_IMENA = Object.keys(SMJEROVI);
export const U_RAVNINI = ["gore", "dolje", "lijevo", "desno"];
export const OKOMITO = ["iz_papira", "u_papir"];
export const NULA = "nula";
export const KRUZENJE = ["kazaljka", "suprotno"];
export const NEMA = "nema";

export const ZNAK = {
  gore: "↑",
  dolje: "↓",
  lijevo: "←",
  desno: "→",
  iz_papira: "⊙",
  u_papir: "⊗",
  nula: "0",
  kazaljka: "↻",
  suprotno: "↺",
  nema: "–",
};
export const RIJEC = {
  gore: "gore",
  dolje: "dolje",
  lijevo: "lijevo",
  desno: "desno",
  iz_papira: "iz papira",
  u_papir: "u papir",
  nula: "nula",
  kazaljka: "u smjeru kazaljke na satu",
  suprotno: "suprotno od kazaljke na satu",
  nema: "ne teče",
};
export const naziv = (smjer) =>
  `${RIJEC[smjer] ?? smjer} ${ZNAK[smjer] ?? ""}`.trim();

export const isSmjer = (s) => SMJER_IMENA.includes(s);
export const suprotan = (s) =>
  ({
    gore: "dolje",
    dolje: "gore",
    lijevo: "desno",
    desno: "lijevo",
    iz_papira: "u_papir",
    u_papir: "iz_papira",
    kazaljka: "suprotno",
    suprotno: "kazaljka",
  })[s] ?? s;

// ── vektori ───────────────────────────────────────────────────────────────────────────────────────
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const vec = (smjer) => SMJEROVI[smjer];
export const v3 = (p) => [p[0], p[1], p[2] ?? 0];

// Ime smjera vektora (jedan od 6), "nula" za (gotovo) nulti vektor, null ako vektor nije ni uz jednu os.
// `mjera` je iznos prema kojem se „gotovo nula“ mjeri (npr. polje jednog vodiča).
export function smjerIz(v, mjera = 1, tolKut = 1e-6) {
  const n = len(v);
  if (n <= Math.max(1e-12, mjera * 1e-9)) return NULA;
  for (const ime of SMJER_IMENA)
    if (dot(v, SMJEROVI[ime]) / n > Math.cos(tolKut)) return ime;
  return null;
}

// ── sile ──────────────────────────────────────────────────────────────────────────────────────────
// Lorentzova sila (samo smjer): F = q v × B. naboj: "+" ili "-".
export const lorentz = (naboj, v, B) =>
  mul(cross(vec(v), vec(B)), naboj === "-" ? -1 : 1);
// Sila na vodič: F = I L × B.
export const silaVodic = (I, B) => cross(vec(I), vec(B));

// Zadani smjer nepoznate veličine u F = k · a × b iz zadanog F i druge veličine: od 6 smjerova oni koji daju F.
// mjesto: 0 – nepoznat je prvi faktor (v ili I), 1 – drugi (B). Vraća popis rješenja (za jednoznačnost: 1).
export function rijesiFaktor(mjesto, poznat, F, k = 1) {
  return SMJER_IMENA.filter(
    (x) =>
      smjerIz(
        mul(
          mjesto === 0
            ? cross(vec(x), vec(poznat))
            : cross(vec(poznat), vec(x)),
          k,
        ),
      ) === F,
  );
}

// ── polje ravnog vodiča ───────────────────────────────────────────────────────────────────────────
// vodic: {polozaj: [x, y], I: smjer, jakost? (A, zadano 1)}; tocka: [x, y]; m = metara po jedinici koordinata.
// Vodič je beskonačan pravac kroz polozaj u smjeru I (⊙/⊗: okomit na papir, inače leži u papiru).
// B = μ₀ I / (2π r) · (Î × r̂), r je okomita udaljenost od vodiča. Vraća null ako je točka na vodiču.
export function poljeVodica(vodic, tocka, m = 0.01) {
  const I = vec(vodic.I);
  const r = sub(v3(tocka), v3(vodic.polozaj));
  const rp = sub(r, mul(I, dot(r, I)));
  const d = len(rp);
  if (d < 1e-9) return null;
  const B = (MU0 * (vodic.jakost ?? 1)) / (2 * Math.PI * d * m);
  return mul(cross(I, mul(rp, 1 / d)), B);
}

export function poljeVodica_zbroj(vodici, tocka, m = 0.01) {
  let B = [0, 0, 0];
  for (const w of vodici) {
    const b = poljeVodica(w, tocka, m);
    if (!b) return null;
    B = add(B, b);
  }
  return B;
}

// ── kružna petlja i zavojnica ─────────────────────────────────────────────────────────────────────
// Petlja u ravnini papira: struja u smjeru kazaljke (gledano s promatračeve strane) daje polje u papir.
export const poljePetlje = (struja) =>
  struja === "kazaljka" ? "u_papir" : "iz_papira";
export const strujaZaPolje = (B) => (B === "u_papir" ? "kazaljka" : "suprotno");
// Zavojnica vodoravno u papiru; `struja` je smjer struje u prednjim (bližim) zavojima: gore → polje unutra ulijevo.
export const poljeZavojnice = (struja) =>
  struja === "gore" ? "lijevo" : "desno";
export const strujaZavojnice = (B) => (B === "lijevo" ? "gore" : "dolje");

// ── štapićasti magnet (i zavojnica izvana) ────────────────────────────────────────────────────────
// Model dvaju polova (izvan magneta dobar): N je izvor (+1) na kraju u smjeru N, S ponor (−1) na suprotnom.
// Magnet je u ishodištu, duljina 2 (krajevi na ±1), poludebljina DEBLJINA. Unutar magneta polje ide od S prema N.
export const DEBLJINA = 0.32;
export function polovi(N = "desno") {
  const os = vec(N);
  return { n: [os[0], os[1], 0], s: [-os[0], -os[1], 0], os };
}
export const unutarMagneta = (p, N = "desno") => {
  const { os } = polovi(N);
  const uz = Math.abs(p[0] * os[0] + p[1] * os[1]);
  const preko = Math.abs(p[0] * os[1] - p[1] * os[0]);
  return uz < 1 && preko < DEBLJINA;
};
export function poljeMagneta(p, N = "desno") {
  const { n, s, os } = polovi(N);
  if (unutarMagneta(p, N)) return [os[0] * 3, os[1] * 3, 0];
  const t = v3(p);
  const a = sub(t, n);
  const b = sub(t, s);
  const la = len(a);
  const lb = len(b);
  if (la < 1e-9 || lb < 1e-9) return null;
  return sub(mul(a, 1 / la ** 3), mul(b, 1 / lb ** 3));
}
// Funkcija toka (osnosimetrično polje dvaju polova): silnice su njezine izolinije. Ψ = cos θ_N − cos θ_S.
export function tokMagneta(p, N = "desno") {
  const { n, s, os } = polovi(N);
  const t = v3(p);
  const a = sub(t, n);
  const b = sub(t, s);
  return (
    dot(a, os) / Math.max(1e-9, len(a)) - dot(b, os) / Math.max(1e-9, len(b))
  );
}

// ── Lenzovo pravilo ───────────────────────────────────────────────────────────────────────────────
// Magnet iznad/ispod vodoravne petlje, pol okrenut prema petlji; smjer struje gledano odozgo.
// Polje izlazi iz N: N iznad petlje → kroz petlju dolje. Tok raste kad se magnet približava.
// Inducirano polje: suprotno polju magneta ako tok raste, isto ako pada. Polje prema gore (prema promatraču
// odozgo) daje struju suprotno od kazaljke.
export function lenzMagnet({ pol, polozaj, gibanje }) {
  const premaDolje = (pol === "N") === (polozaj === "iznad");
  const Bkroz = premaDolje ? "dolje" : "gore";
  if (gibanje === "miruje")
    return { Bkroz, tok: "stalan", inducirano: null, struja: NEMA };
  const tok = gibanje === "priblizava" ? "raste" : "pada";
  const inducirano = tok === "raste" ? suprotan(Bkroz) : Bkroz;
  return {
    Bkroz,
    tok,
    inducirano,
    struja: inducirano === "gore" ? "suprotno" : "kazaljka",
  };
}

// Petlja ulazi u područje polja okomitog na papir (gledano s promatračeve strane).
export const FAZE_PETLJE = ["izvan", "ulazi", "unutra", "izlazi"];
export function lenzPetlja({ B, faza }) {
  if (faza === "unutra" || faza === "izvan")
    return {
      tok: faza === "unutra" ? "stalan" : "nula",
      inducirano: null,
      struja: NEMA,
    };
  const tok = faza === "ulazi" ? "raste" : "pada";
  const inducirano = tok === "raste" ? suprotan(B) : B;
  return { tok, inducirano, struja: strujaZaPolje(inducirano) };
}

// ── silnice ───────────────────────────────────────────────────────────────────────────────────────
// Izolinije skalarne funkcije f na pravokutniku (marching squares): popis dužina [[x1, y1, x2, y2], …] po razini.
export function izolinije(f, [x0, x1], [y0, y1], razine, nx = 72, ny = 48) {
  const dx = (x1 - x0) / nx;
  const dy = (y1 - y0) / ny;
  const g = [];
  for (let j = 0; j <= ny; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) row.push(f(x0 + i * dx, y0 + j * dy));
    g.push(row);
  }
  return razine.map((c) => {
    const seg = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v = [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]];
        if (v.some((x) => !Number.isFinite(x))) continue;
        const px = [
          x0 + i * dx,
          x0 + (i + 1) * dx,
          x0 + (i + 1) * dx,
          x0 + i * dx,
        ];
        const py = [
          y0 + j * dy,
          y0 + j * dy,
          y0 + (j + 1) * dy,
          y0 + (j + 1) * dy,
        ];
        const pts = [];
        for (let k = 0; k < 4; k++) {
          const a = v[k] - c;
          const b = v[(k + 1) % 4] - c;
          if (a < 0 !== b < 0) {
            const t = a / (a - b);
            pts.push([
              px[k] + t * (px[(k + 1) % 4] - px[k]),
              py[k] + t * (py[(k + 1) % 4] - py[k]),
            ]);
          }
        }
        if (pts.length === 2) seg.push([...pts[0], ...pts[1]]);
        else if (pts.length === 4)
          seg.push([...pts[0], ...pts[1]], [...pts[2], ...pts[3]]);
      }
    }
    return seg;
  });
}

// Funkcija čije su izolinije silnice vodiča okomitih na papir: ψ = Σ ±I ln r (vektorski potencijal A_z).
export const potencijalVodica = (vodici) => (x, y) =>
  vodici.reduce(
    (s, w) =>
      s +
      (w.I === "iz_papira" ? 1 : -1) *
        (w.jakost ?? 1) *
        Math.log(Math.hypot(x - w.polozaj[0], y - w.polozaj[1]) + 1e-9),
    0,
  );

// ── zapis ─────────────────────────────────────────────────────────────────────────────────────────
export const iznos = (n, jed) => `${formatSci(n)}\u00a0${jed}`;
// Mikrotesle i militesle za polja vodiča (10 μT čitljivije od 1·10⁻⁵ T).
export function iznosB(B) {
  const a = Math.abs(B);
  if (a === 0) return "0 T";
  if (a < 1e-3) return iznos(B * 1e6, "μT");
  if (a < 1) return iznos(B * 1e3, "mT");
  return iznos(B, "T");
}

// Brojčani odgovor za fizikalne iznose. core/number.js near() dopušta apsolutno odstupanje 1e-12, pa bi za sile
// reda 10⁻¹³ N bilo točno gotovo sve; zato se prije usporedbe sve skalira na red veličine točnog odgovora.
export function checkFiz({ input, answer, tol, unit, krivo = [], savjet }) {
  const n = parseNumber(input, unit);
  if (n == null)
    return checkNumber({ input, answer, tol, unit, krivo, savjet });
  const ref =
    Math.abs(answer) ||
    Math.max(1e-300, ...krivo.map((k) => Math.abs(k.vrijednost)));
  const k = 1 / ref;
  return checkNumber({
    input: n * k,
    answer: answer * k,
    tol: tol == null ? undefined : tol * k,
    krivo: krivo.map((x) => ({
      ...x,
      vrijednost: x.vrijednost * k,
      tolerancija: x.tolerancija == null ? undefined : x.tolerancija * k,
    })),
    savjet,
  });
}
