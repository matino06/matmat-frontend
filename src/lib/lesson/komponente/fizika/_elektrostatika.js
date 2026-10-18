// Pomoćne funkcije za crteže elektrostatike (NabojiPolje, PlocePolje, _ElektrostatikaDodir): točka pokazivača u
// koordinatama SVG-a, strelice, oznake s indeksom i „lijepi“ koraci ljestvice. Bez fizike (ona je u katalogu).

// Točka pokazivača u koordinatama viewBoxa.
export function svgTocka(svg, e) {
  const m = svg?.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

const f1 = (n) => Math.round(n * 10) / 10;

// Strelica od (x1, y1) do (x2, y2): {linija, glava} kao „d“ za <path>. Glava je trokut na vrhu, linija staje
// na dnu glave da se debljina ne vidi preko vrha.
export function strelica(x1, y1, x2, y2, glava = 9, sirina = 0.55) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  if (L < 0.5) return { linija: "", glava: "" };
  const ux = dx / L;
  const uy = dy / L;
  const g = Math.min(glava, L * 0.6);
  const bx = x2 - ux * g;
  const by = y2 - uy * g;
  const w = g * sirina;
  return {
    linija: `M${f1(x1)},${f1(y1)} L${f1(bx + ux * 0.5)},${f1(by + uy * 0.5)}`,
    glava: `M${f1(x2)},${f1(y2)} L${f1(bx - uy * w)},${f1(by + ux * w)} L${f1(bx + uy * w)},${f1(by - ux * w)} Z`,
  };
}

// „q_1“ → {baza: "q", indeks: "1"} za <tspan> s indeksom u SVG-u.
export function oznaka(o) {
  const m = String(o ?? "").match(/^([^_]+)_\{?([^}]*)\}?$/);
  return m
    ? { baza: m[1], indeks: m[2] }
    : { baza: String(o ?? ""), indeks: "" };
}

// Indeks kao Unicode znakovi za običan tekst (aria, gumbi): q_1 → q₁.
const SUB = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
};
export const oznakaTekst = (o) => {
  const { baza, indeks } = oznaka(o);
  return baza + [...indeks].map((c) => SUB[c] ?? c).join("");
};

// Korak mreže/ljestvice: 1, 2 ili 5 · 10ⁿ, tako da raspon ima otprilike n koraka.
export function lijepiKorak(raspon, n = 6) {
  const raw = raspon / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const k of [1, 2, 5, 10]) if (k * p >= raw) return k * p;
  return 10 * p;
}

export const ogranici = (v, a, b) => Math.min(b, Math.max(a, v));
// glatko ubrzanje i usporenje za animacije (0 → 1)
export const glatko = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
