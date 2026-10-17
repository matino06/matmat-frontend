// Virtualna tipkovnica za matematički unos (MathLive), ista na probnoj maturi i u interaktivnim lekcijama:
// prvi raspored „Matura“ ima simbole koje ispit traži (intervali, skupovi, π, korijen, razlomak…).
export const maturaLayout = {
  label: "Matura",
  tooltip: "Matura simboli",
  rows: [
    [
      { latex: "[" },
      { latex: "]" },
      { latex: "(" },
      { latex: ")" },
      { latex: "\\{" },
      { latex: "\\}" },
      { latex: "\\langle" },
      { latex: "\\rangle" },
      { latex: "," },
      { latex: "|#0|" },
    ],
    [
      { latex: "\\in" },
      { latex: "\\notin" },
      { latex: "\\cup" },
      { latex: "\\cap" },
      { latex: "\\subset" },
      { latex: "\\subseteq" },
      { latex: "\\setminus" },
      { latex: "\\emptyset" },
      { latex: "\\{#0\\}" },
      { latex: "\\infty" },
    ],
    [
      { latex: "\\mathbb{R}" },
      { latex: "\\mathbb{N}" },
      { latex: "\\mathbb{Z}" },
      { latex: "\\mathbb{Q}" },
      { latex: "\\mathbb{C}" },
      { latex: "\\pm" },
      { latex: "\\neq" },
      { latex: "\\leq" },
      { latex: "\\geq" },
      { latex: "\\approx" },
    ],
    [
      { latex: "\\sin" },
      { latex: "\\cos" },
      { latex: "\\tan" },
      { latex: "\\log" },
      { latex: "\\ln" },
      { latex: "e" },
      { latex: "\\pi" },
      { latex: "\\sqrt{#0}" },
      { latex: "\\sqrt[#?]{#?}" },
      { latex: "\\frac{#?}{#?}" },
    ],
  ],
};

let ucitano;

// Učita MathLive (registrira <math-field>) i postavi rasporede tipkovnice; poziva se iz onMount.
export function ucitajMatematickiUnos() {
  ucitano ??= import("mathlive").then(() => {
    if (typeof window !== "undefined" && window.mathVirtualKeyboard) {
      window.mathVirtualKeyboard.layouts = [maturaLayout, "numeric", "symbols", "alphabetic", "greek"];
    }
  });
  return ucitano;
}
