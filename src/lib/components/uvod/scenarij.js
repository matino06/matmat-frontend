// The /uvod walkthrough: a made-up course whose exam is in two days. Four lessons
// are already remembered past the exam; two would be forgotten before it, so they
// are today's tasks. Nothing is sent to the backend.
//
// `dani[q]` is the interval (in days) the backend gives after rating q, worked out
// with AccountObjectiveService.nextInterval and capToExam for this history
// (ef 2.5, exam in 2 days). Update it with the backend's algorithm (e.g. FSRS):
//   - Tablica množenja, solved once yesterday (n=1, i=1): 4–5 → 6 days.
//   - Pola i četvrtina, solved twice, last 6 days ago (n=2, i=6): 4–5 → round(6 · 2.5) = 15.
//   - 0–2 → 1 day; 3 → past the exam, so it is pulled to the day before it (1 day).
export const DANA_DO_ISPITA = 2;

export const LEKCIJE = [
  { id: "zbrajanje", naziv: "Zbrajanje", za: 9, tocno: 4 },
  { id: "oduzimanje", naziv: "Oduzimanje", za: 12, tocno: 4 },
  { id: "mnozenje", naziv: "Množenje", za: 20, tocno: 5 },
  {
    id: "tablica",
    naziv: "Tablica množenja",
    za: 0,
    tocno: 1,
    povijest: "Riješio si je jednom, jučer.",
    zadatak: "Koliko je **7 · 8**?",
    rjesenje: "7 · 8 = **56**",
    dani: [1, 1, 1, 1, 6, 6],
  },
  { id: "dijeljenje", naziv: "Dijeljenje", za: 5, tocno: 3 },
  {
    id: "cetvrtina",
    naziv: "Pola i četvrtina",
    za: 0,
    tocno: 2,
    povijest: "Riješio si je dvaput, zadnji put prije 6 dana.",
    zadatak: "Koliko je **četvrtina od 20**?",
    rjesenje: "20 : 4 = **5**",
    dani: [1, 1, 1, 1, 15, 15],
  },
];

export const ZADACI = LEKCIJE.filter((l) => l.zadatak);
