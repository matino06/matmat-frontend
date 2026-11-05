// Virtualna tipkovnica za matematički unos (MathLive), ista na probnoj maturi i u interaktivnim lekcijama, i
// složena kao tipkovnica iOS aplikacije (matmat-ios-app: MathKeyboardLayout): kartice 123 · f(x) · ∈ℝ · abc, a uz
// svaku karticu isti stupac s razlomkom, zagradama, strelicama, „Izađi“ i ⌫. Tipka s varijantama nudi ih na dugi pritisak.

// Stupac uz svaku karticu (po jedan red na redak kartice).
const STUPAC = [
  [{ latex: "\\frac{\\placeholder{}}{\\placeholder{}}", insert: "\\frac{#0}{#?}", class: "action primary", width: 2, tooltip: "Razlomak" }],
  [{ latex: "(", insert: "\\left(#0\\right)" }, { latex: ")", key: ")" }],
  ["[left]", "[right]"],
  [{ label: "Izađi", command: "moveAfterParent", class: "action small", tooltip: "Izađi iz razlomka ili potencije" }, { label: "⌫", command: "deleteBackward", class: "action", tooltip: "Obriši" }],
];

const k = (latex, ...varijante) => (varijante.length ? { latex, variants: [latex, ...varijante] } : { latex });
const ODVOJI = { class: "separator w5" };

function kartica(label, tooltip, redovi) {
  const n = Math.max(redovi.length, STUPAC.length);
  return {
    label,
    tooltip,
    displayEditToolbar: false,
    rows: Array.from({ length: n }, (_, i) => [...(redovi[i] ?? []), ODVOJI, ...(STUPAC[i] ?? [])]),
  };
}

const kvadrat = { label: "x²", insert: "#@^{2}", tooltip: "Na kvadrat" };
const potencija = { label: "xⁿ", insert: "#@^{#?}", tooltip: "Potencija" };
const korijen = { latex: "\\sqrt{\\placeholder{}}", insert: "\\sqrt{#0}", tooltip: "Drugi korijen", variants: [{ latex: "\\sqrt[n]{\\placeholder{}}", insert: "\\sqrt[#?]{#0}" }] };
const funkcija = (ime) => ({ latex: `\\${ime}`, insert: `\\${ime}\\left(#0\\right)` });

const REDOVI_BROJEVA = [
  [k("7"), k("8"), k("9"), k("+"), kvadrat],
  [k("4"), k("5"), k("6"), k("-"), potencija],
  [k("1"), k("2"), k("3"), k("\\cdot", "\\times", "\\div"), korijen],
  [k("0"), k("."), k(","), k("=", "\\neq", "\\approx"), k("x", "y", "a", "b", "n", "k")],
];
export const brojevi = kartica("123", "Brojevi", REDOVI_BROJEVA);

export const funkcije = kartica("f(x)", "Funkcije", [
  [funkcija("sin"), funkcija("cos"), funkcija("tan"), k("^{\\circ}", "'")],
  [funkcija("log"), { latex: "\\log_{\\placeholder{}}", insert: "\\log_{#?}\\left(#0\\right)", tooltip: "Logaritam s bazom" }, funkcija("ln"), { latex: "e^{n}", insert: "e^{#?}" }],
  [{ latex: "\\sqrt[n]{\\placeholder{}}", insert: "\\sqrt[#?]{#0}" }, { latex: "|x|", insert: "\\left|#0\\right|", tooltip: "Apsolutna vrijednost" }, { latex: "x_1", insert: "#@_{#?}", tooltip: "Indeks" }, k("\\pm")],
  [k("e"), k("\\pi"), k("\\%"), { latex: "!", variants: ["!", { latex: "\\binom{n}{k}", insert: "\\binom{#0}{#?}" }], tooltip: "Faktorijel (dugo drži za binomni koeficijent)" }],
]);

export const skupovi = kartica("∈ℝ", "Skupovi i intervali", [
  [k("["), k("]"), k("\\langle"), k("\\rangle"), k(";")],
  [k("\\lbrace"), k("\\rbrace"), k("\\in", "\\notin"), k("\\cup"), k("\\cap")],
  [k("\\subset", "\\subseteq"), k("\\setminus"), k("\\emptyset"), k("\\infty"), k("\\mathbb{R}", "\\mathbb{N}", "\\mathbb{Z}", "\\mathbb{Q}", "\\mathbb{C}")],
  [k("<", "\\le"), k(">", "\\ge"), k("-"), k(","), k("x")],
]);

// Kartica s arkus, hiperbolnim i area funkcijama (Matematička analiza), samo uz izraz s vise_funkcija: true.
// Hrvatski zapis kao na FER-u: arctg, ctg, sh, ch, th, arsh…
// Četiri tipke po redu; arkus i area imena (arcsin, arcctg, arsh…) imaju manja slova da stanu na 360 px.
const op = (ime) => ({ latex: `\\operatorname{${ime}}`, insert: `\\operatorname{${ime}}\\left(#0\\right)` });
const sitno = (t) => (/arc|arsh|arch|arth/.test(t.latex) ? { ...t, class: "small" } : t);
export const viseFunkcija = kartica(
  "arc sh",
  "Arkus, hiperbolne i area funkcije",
  [
    [funkcija("arcsin"), funkcija("arccos"), op("arctg"), op("arcctg")],
    [op("sh"), op("ch"), op("th"), op("cth")],
    [op("arsh"), op("arch"), op("arth"), op("arcth")],
    [op("ctg"), { latex: "\\log_{\\placeholder{}}", insert: "\\log_{#?}\\left(#0\\right)", tooltip: "Logaritam s bazom" }, { latex: "e^{n}", insert: "e^{#?}" }, k("\\pi")],
  ].map((red) => red.map(sitno)),
);

// Dodatni red kartice 123: ∞ (uz beskonacno) te i i crta konjugata (uz kompleksno).
function brojeviS({ beskonacno, kompleksno }) {
  const red = [
    ...(kompleksno ? [{ latex: "i", tooltip: "Imaginarna jedinica" }, { latex: "\\overline{z}", insert: "\\overline{#0}", tooltip: "Konjugat (crta iznad)" }, { latex: "e^{n}", insert: "e^{#?}" }, { latex: "|z|", insert: "\\left|#0\\right|", tooltip: "Modul" }] : []),
    ...(beskonacno ? [{ latex: "\\infty", tooltip: "Beskonačno (uz + ili −)" }] : []),
  ];
  // red je poravnat ulijevo, ispod brojeva: prazna mjesta do 5 tipki i ispod stupca s razlomkom
  const praznina = (w) => ({ class: `separator w${w}` });
  const k = kartica("123", "Brojevi", [...REDOVI_BROJEVA, [...red, ...Array.from({ length: Math.max(0, 5 - red.length) }, () => praznina(10))]]);
  k.rows.at(-1).push(praznina(20));
  return k;
}

// slovo s velikim slovom na Shift (oznake točaka i skupova: A, B, S…)
const slovo = (c) => ({ latex: c, shift: c.toUpperCase() });
export const slova = kartica("abc", "Slova", [
  [..."qwertzuiop"].map(slovo),
  [..."asdfghjkl"].map(slovo),
  ["[shift]", ...[..."yxcvbnm"].map(slovo), k("\\alpha", "\\beta", "\\gamma", "\\varphi", "\\theta")],
]);

const KARTICE = { brojevi, funkcije, skupovi, slova };

// Redoslijed kartica: prva je ona koja se otvara (npr. „skupovi“ za upis intervala). Ista tipkovnica je zajednička
// svim poljima na stranici, pa polje koje želi drugu prvu karticu to postavi kad dobije fokus.
// opcije (polje izraza): { beskonacno, kompleksno } dodaju red tipki na karticu 123, { viseFunkcija } karticu
// „arc sh“ iza f(x). Bez opcija tipkovnica je ista kao na probnoj maturi.
export function postaviKartice(prva = "brojevi", opcije = {}) {
  if (typeof window === "undefined" || !window.mathVirtualKeyboard) return;
  let kartice = KARTICE;
  if (opcije.beskonacno || opcije.kompleksno || opcije.viseFunkcija) {
    const { brojevi: b, funkcije: f, ...ostale } = KARTICE;
    kartice = {
      brojevi: opcije.beskonacno || opcije.kompleksno ? brojeviS(opcije) : b,
      funkcije: f,
      ...(opcije.viseFunkcija ? { viseFunkcija } : {}),
      ...ostale,
    };
  }
  window.mathVirtualKeyboard.layouts = [kartice[prva], ...Object.values(kartice).filter((k) => k !== kartice[prva])];
}

let ucitano;

// Učita MathLive (registrira <math-field>) i postavi kartice tipkovnice; poziva se iz onMount.
export function ucitajMatematickiUnos() {
  ucitano ??= import("mathlive").then(() => {
    postaviKartice("brojevi");
  });
  return ucitano;
}
