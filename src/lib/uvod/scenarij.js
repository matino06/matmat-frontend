// The walkthrough's made-up course: its exam is in two days. Four lessons are already
// remembered past the exam; two would be forgotten before it, so they are today's
// tasks. The real Napredak and Zadaci pages show it while the walkthrough runs, and
// nothing is sent to the backend.
//
// `dani[q]` is the interval (in days) the backend gives after rating q, worked out
// with AccountObjectiveService.nextInterval and capToExam for this history
// (ef 2.5, exam in 2 days). Update it with the backend's algorithm (e.g. FSRS):
//   - Tablica množenja, solved once yesterday (n=1, i=1): 4–5 → 6 days.
//   - Pola i četvrtina, solved twice, last 6 days ago (n=2, i=6): 4–5 → round(6 · 2.5) = 15.
//   - 0–2 → 1 day; 3 → past the exam, so it is pulled to the day before it (1 day).
export const DANA_DO_ISPITA = 2;

export const PREDMET = { label: "Probni predmet", badge: "PP", color: 160, sub: "Ispit za 2 dana" };

// `za`: days until the next review; `lastQ`: the last rating (the dots on Napredak).
export const LEKCIJE = [
  { id: 1, naziv: "Zbrajanje", podrucje: "Računanje", za: 9, lastQ: 4 },
  { id: 2, naziv: "Oduzimanje", podrucje: "Računanje", za: 12, lastQ: 4 },
  { id: 3, naziv: "Množenje", podrucje: "Računanje", za: 20, lastQ: 5 },
  { id: 4, naziv: "Dijeljenje", podrucje: "Računanje", za: 5, lastQ: 4 },
  {
    id: 5,
    naziv: "Tablica množenja",
    podrucje: "Računanje",
    za: 0,
    lastQ: 4,
    zadatak: "Koliko je $7 \\cdot 8$?",
    rjesenje: "$7 \\cdot 8 = 56$",
    dani: [1, 1, 1, 1, 6, 6],
  },
  {
    id: 6,
    naziv: "Pola i četvrtina",
    podrucje: "Razlomci",
    za: 0,
    lastQ: 4,
    zadatak: "Koliko je četvrtina od $20$?",
    rjesenje: "Četvrtina je jedan od četiri jednaka dijela: $20 : 4 = 5$.",
    dani: [1, 1, 1, 1, 15, 15],
  },
];

export const ZADACI = LEKCIJE.filter((l) => l.zadatak);

// The lessons as they stand after the ratings given so far ({ lessonId: q }).
export function lekcijeNakon(ocjene) {
  return LEKCIJE.map((l) => (l.id in ocjene ? { ...l, za: l.dani[ocjene[l.id]], lastQ: ocjene[l.id] } : l));
}

export function kada(dana) {
  if (dana <= 0) return "danas";
  if (dana === 1) return "sutra";
  return `za ${dana} dana`;
}
