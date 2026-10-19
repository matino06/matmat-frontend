// Fizika elektrostatike za widgete naboji_polje i ploce_polje: Coulomb, superpozicija polja, vodljiva kugla,
// dodir kugli, čestica među pločama i kondenzator. Konstante su iz knjižice formula (k = 9·10⁹, e = 1,6·10⁻¹⁹ …),
// da brojevi u widgetu budu isti kao u rješenjima zadataka. Čisti JS: isti kod računa crtež i provjeru.

export const K = 9e9; // N m² C⁻²
export const E_NABOJ = 1.6e-19; // C
export const M_E = 9.11e-31; // kg
export const M_P = 1.67e-27; // kg
export const EPS0 = 8.85e-12; // F/m

const NC = 1e-9;
const CM = 1e-2;
const MM = 1e-3;

export const rad = (deg) => (deg * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
// kut vektora u stupnjevima (0° = desno, 90° = gore), u [0, 360)
export const kutVektora = (x, y) => (deg(Math.atan2(y, x)) + 360) % 360;
// najmanja razlika dvaju kutova u stupnjevima, 0–180
export function razlikaKuta(a, b) {
  const d = Math.abs(((((a - b) % 360) + 540) % 360) - 180);
  return d;
}

// ── točkasti naboji (q u nC, položaji u cm, y prema gore) ────────────────────────────────────────────
// Polje jednog naboja u točki (N/C): {Ex, Ey, E}; u samom naboju null.
export function poljeNaboja(n, x, y, er = 1) {
  const dx = (x - n.x) * CM;
  const dy = (y - n.y) * CM;
  const r2 = dx * dx + dy * dy;
  if (r2 < 1e-12) return null;
  const r = Math.sqrt(r2);
  const E = (K * n.q * NC) / (er * r2); // s predznakom: pozitivan → od naboja
  return { Ex: (E * dx) / r, Ey: (E * dy) / r, E: Math.abs(E) };
}

// Polje vodljive (po želji šuplje) kugle: unutar vanjske površine 0, izvana kao točkasti naboj u središtu.
export function poljeKugle(k, x, y, er = 1) {
  const r = Math.hypot(x - k.x, y - k.y);
  if (r < k.R - 1e-9) return { Ex: 0, Ey: 0, E: 0, unutra: true };
  return { ...poljeNaboja(k, x, y, er), unutra: false };
}

// Ukupno polje u točki i doprinosi svakog izvora (naboji pa kugla).
export function polje(s, x, y, er = sredstvoEr(s)) {
  const sastavnice = (s.naboji ?? []).map((n) => ({
    oznaka: n.oznaka,
    ...(poljeNaboja(n, x, y, er) ?? { Ex: NaN, Ey: NaN, E: Infinity }),
  }));
  if (s.kugla)
    sastavnice.push({
      oznaka: s.kugla.oznaka ?? "Q",
      ...poljeKugle(s.kugla, x, y, er),
    });
  const Ex = sastavnice.reduce((a, c) => a + c.Ex, 0);
  const Ey = sastavnice.reduce((a, c) => a + c.Ey, 0);
  return { Ex, Ey, E: Math.hypot(Ex, Ey), sastavnice };
}

export const sredstvoEr = (s) =>
  typeof s?.sredstvo?.er === "number" ? s.sredstvo.er : 1;

// Coulombova sila na naboj i od svih ostalih (N): ukupna i po izvorima.
export function silaNa(s, i, er = sredstvoEr(s)) {
  const n = s.naboji[i];
  const sastavnice = s.naboji
    .map((o, j) => {
      if (j === i) return null;
      const p = poljeNaboja(o, n.x, n.y, er);
      if (!p) return null;
      return {
        oznaka: o.oznaka,
        Fx: p.Ex * n.q * NC,
        Fy: p.Ey * n.q * NC,
        F: Math.abs(p.E * n.q * NC),
      };
    })
    .filter(Boolean);
  if (s.kugla) {
    const p = poljeKugle(s.kugla, n.x, n.y, er);
    sastavnice.push({
      oznaka: s.kugla.oznaka ?? "Q",
      Fx: p.Ex * n.q * NC,
      Fy: p.Ey * n.q * NC,
      F: Math.abs(p.E * n.q * NC),
    });
  }
  const Fx = sastavnice.reduce((a, c) => a + c.Fx, 0);
  const Fy = sastavnice.reduce((a, c) => a + c.Fy, 0);
  return { Fx, Fy, F: Math.hypot(Fx, Fy), sastavnice };
}

// Vektor koji se traži u načinu „smjer“: {x, y, iznos, jedinica, sastavnice: [{oznaka, x, y, iznos}]}.
export function ciljniVektor(s) {
  const c = s.cilj;
  if (c.vektor === "F" && c.naboj != null) {
    const i = s.naboji.findIndex((n) => n.oznaka === c.naboj);
    const f = silaNa(s, i);
    return {
      x: f.Fx,
      y: f.Fy,
      iznos: f.F,
      jedinica: "N",
      sastavnice: f.sastavnice.map((k) => ({
        oznaka: k.oznaka,
        x: k.Fx,
        y: k.Fy,
        iznos: k.F,
      })),
      tocka: s.naboji[i],
    };
  }
  const t = s.tocke.find((p) => p.oznaka === c.tocka);
  const p = polje(s, t.x, t.y);
  if (c.vektor === "F") {
    const q = c.q * NC;
    return {
      x: p.Ex * q,
      y: p.Ey * q,
      iznos: p.E * Math.abs(q),
      jedinica: "N",
      sastavnice: p.sastavnice.map((k) => ({
        oznaka: k.oznaka,
        x: k.Ex * q,
        y: k.Ey * q,
        iznos: k.E * Math.abs(q),
      })),
      tocka: t,
    };
  }
  return {
    x: p.Ex,
    y: p.Ey,
    iznos: p.E,
    jedinica: "N/C",
    sastavnice: p.sastavnice.map((k) => ({
      oznaka: k.oznaka,
      x: k.Ex,
      y: k.Ey,
      iznos: k.E,
    })),
    tocka: t,
  };
}

// Točka u kojoj je polje dvaju točkastih naboja nula (na pravcu kroz njih), ili null (jednaki suprotni naboji).
// s = udaljenost od prvog naboja prema drugom (cm; negativno = s druge strane prvog naboja).
export function tockaNule(n1, n2) {
  const d = Math.hypot(n2.x - n1.x, n2.y - n1.y);
  const a = Math.sqrt(Math.abs(n1.q));
  const b = Math.sqrt(Math.abs(n2.q));
  if (!(d > 0) || n1.q === 0 || n2.q === 0) return null;
  let s;
  if (Math.sign(n1.q) === Math.sign(n2.q)) s = (d * a) / (a + b);
  else if (Math.abs(a - b) < 1e-9) return null;
  else if (a < b) s = ((a / b) * d) / (a / b - 1);
  else s = d / (1 - b / a);
  const ux = (n2.x - n1.x) / d;
  const uy = (n2.y - n1.y) / d;
  return { x: n1.x + s * ux, y: n1.y + s * uy, s, d };
}

// ── dodir vodljivih kugli ────────────────────────────────────────────────────────────────────────────
// Kugle se dodirnu i razdvoje: ukupni naboj se dijeli u omjeru polumjera (jednaki potencijal), za jednake napola.
export function nakonDodira(kugle) {
  const Q = kugle.reduce((a, k) => a + k.q, 0);
  const R = kugle.map((k) => (typeof k.R === "number" ? k.R : 1));
  const sumR = R.reduce((a, b) => a + b, 0);
  return R.map((r) => (Q * r) / sumR);
}

// ── čestica među pločama ─────────────────────────────────────────────────────────────────────────────
export const CESTICE = {
  elektron: { naziv: "elektron", q: -E_NABOJ, m: M_E },
  proton: { naziv: "proton", q: E_NABOJ, m: M_P },
};

// Jakost polja među pločama (V/m): zadana izravno ili E = U/d (d u mm).
export const jakostPolja = (s) =>
  typeof s.E === "number" ? s.E : s.U / (s.d * MM);
export const napon = (s) => (typeof s.U === "number" ? s.U : s.E * s.d * MM);

// Vodoravni ulet sredinom razmaka; gornja ploča je pozitivna, pa elektron skreće gore, a proton dolje.
// Vraća {a (m/s²), smjer (+1 gore / −1 dolje), t (s), izlaz: true | false, y (mm, otklon na izlazu ili ½d),
// x (cm, gdje udari u ploču ili L)}.
export function putanja(s, pr = {}) {
  const c = CESTICE[s.cestica.vrsta];
  const m = pr.m ?? c.m;
  const E = jakostPolja(s);
  const a = (Math.abs(c.q) * E) / m;
  const v0 = s.cestica.v0;
  const L = s.L * CM;
  const pola = (s.d * MM) / 2;
  const tIzlaz = L / v0;
  const yIzlaz = 0.5 * a * tIzlaz * tIzlaz;
  const smjer = c.q < 0 ? 1 : -1;
  if (yIzlaz <= pola)
    return { a, smjer, t: tIzlaz, izlaz: true, y: yIzlaz / MM, x: s.L, v0 };
  const t = Math.sqrt((2 * pola) / a);
  return { a, smjer, t, izlaz: false, y: pola / MM, x: (v0 * t) / CM, v0 };
}

// Iz mirovanja uz ploču istog predznaka do druge ploče: W = qU, v = √(2qU/m), a = qE/m.
export function ubrzanje(s) {
  const c = CESTICE[s.cestica.vrsta];
  const U = napon(s);
  const E = jakostPolja(s);
  const q = Math.abs(c.q);
  const W = q * U;
  return {
    E,
    F: q * E,
    a: (q * E) / c.m,
    W,
    v: Math.sqrt((2 * W) / c.m),
    t: Math.sqrt((2 * s.d * MM) / ((q * E) / c.m)),
  };
}

// ── kondenzator ──────────────────────────────────────────────────────────────────────────────────────
// Stanje kondenzatora iz speca: C (F), U (V), Q (C), E (V/m), W (J), d (m). C iz speca (pF) ili iz A (cm²), d, εr.
export function kondenzator(s) {
  const er = typeof s.er === "number" ? s.er : 1;
  const d = (typeof s.d === "number" ? s.d : 1) * MM;
  const C =
    typeof s.C === "number" ? s.C * 1e-12 : (EPS0 * er * s.A * CM * CM) / d;
  const U = napon({ ...s, d: d / MM });
  return { C, U, Q: C * U, E: U / d, W: 0.5 * C * U * U, d, er };
}

// Promjena kondenzatora nakon akcije: faktori za C i d, pa ono što je zaključano (odspojen → Q, spojen → U).
export function nakonAkcije(s) {
  const p = kondenzator(s);
  const a = s.akcija;
  let fC = 1;
  let fd = 1;
  if (a.vrsta === "dielektrik") fC = a.er / p.er;
  if (a.vrsta === "razmakni") {
    fC = 1 / a.faktor;
    fd = a.faktor;
  }
  if (a.vrsta === "povecaj_A") fC = a.faktor;
  const C = p.C * fC;
  const d = p.d * fd;
  const spojen = s.izvor === "spojen";
  const Q = spojen ? C * p.U : p.Q;
  const U = spojen ? p.U : Q / C;
  return {
    prije: p,
    poslije: {
      C,
      U,
      Q,
      E: U / d,
      W: 0.5 * C * U * U,
      d,
      er: a.vrsta === "dielektrik" ? a.er : p.er,
    },
    fC,
    fd,
  };
}

export const VELICINE_KOND = ["Q", "C", "U", "E", "W"];
// „gore“ | „dolje“ | „isto“ za svaku veličinu
export function smjeroviPromjene(s) {
  const { prije, poslije } = nakonAkcije(s);
  return Object.fromEntries(
    VELICINE_KOND.map((v) => [v, promjena(prije[v], poslije[v])]),
  );
}
const promjena = (a, b) =>
  Math.abs(b - a) <= Math.abs(a) * 1e-9 ? "isto" : b > a ? "gore" : "dolje";
