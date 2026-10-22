// The walkthrough's made-up course: its exam is in two days. Four lessons are already
// remembered past the exam; two would be forgotten before it, so they are today's
// tasks. The real Napredak and Zadaci pages show it while the walkthrough runs, and
// nothing is sent to the backend.
//
// `dani[grade - 1]` is the interval (in days) the backend gives after rating grade 1–4,
// worked out with FSRS-6 (Fsrs, default parameters) and capToExam for this history
// (exam in 2 days; a review after the exam stays only if the lesson is known with
// 90 % on the exam day):
//   - Tablica množenja, rated hard once yesterday (S 1.29): 1, 3, 5, 7.
//   - Pola i četvrtina, rated good twice (2, then 11 days apart; S 10.96): 1, 32, 46, 77.
//   - Nisam riješio → 1 day, the day before the exam.
export const DANA_DO_ISPITA = 2;

export const PREDMET = { label: "Probni predmet", badge: "PP", color: 160, sub: "Ispit za 2 dana" };

// `za`: days until the next review; `lastGrade`: the last rating 1–4 (the dots on Napredak).
export const LEKCIJE = [
  { id: 1, naziv: "Zbrajanje", podrucje: "Računanje", za: 9, lastGrade: 3 },
  { id: 2, naziv: "Oduzimanje", podrucje: "Računanje", za: 12, lastGrade: 3 },
  { id: 3, naziv: "Množenje", podrucje: "Računanje", za: 20, lastGrade: 4 },
  { id: 4, naziv: "Dijeljenje", podrucje: "Računanje", za: 5, lastGrade: 3 },
  {
    id: 5,
    naziv: "Tablica množenja",
    podrucje: "Računanje",
    za: 0,
    lastGrade: 2,
    zadatak: "Koliko je $7 \\cdot 8$?",
    rjesenje: "$7 \\cdot 8 = 56$",
    dani: [1, 3, 5, 7],
    // the walkthrough solves this one as an interactive lesson
    lekcija: {
      verzija: 1,
      zadatak: { tekst: "Pomnoži dva broja iz tablice množenja." },
      cijeli: {
        pitanje: {
          tip: "broj",
          tekst: "Koliko je $7 \\cdot 8$?",
          odgovor: 56,
          krivo: [
            { vrijednost: 15, poruka: "15 je zbroj $7 + 8$, a traži se umnožak." },
            { vrijednost: 54, poruka: "54 je $6 \\cdot 9$. Pokušaj ponovno." },
          ],
          savjet: "Kreni od $7 \\cdot 10 = 70$ pa oduzmi dva puta po 7.",
        },
        blizanac: { tip: "broj", tekst: "Koliko je $6 \\cdot 8$?", odgovor: 48 },
        blizanacRjesenje: "$6 \\cdot 8 = 48$",
      },
      podzadaci: [
        {
          id: "a",
          naslov: "Deset sedmica",
          pitanje: { tip: "broj", tekst: "Koliko je $7 \\cdot 10$?", odgovor: 70 },
          zasto: "Množenje s 10 samo doda nulu.",
          objasnjenje: "$7 \\cdot 10 = 70$.",
          pomoc: [
            { tip: "pojam", tekst: "Pomnožiti s **10** znači dopisati nulu na kraj broja." },
            { tip: "broj", tekst: "Dopiši nulu na $7$. Koji broj dobiješ?", odgovor: 70 },
          ],
          blizanac: { tip: "broj", tekst: "Koliko je $6 \\cdot 10$?", odgovor: 60 },
        },
        {
          id: "b",
          naslov: "Dvije sedmice manje",
          pitanje: { tip: "broj", tekst: "Osam sedmica je dvije sedmice manje od deset. Koliko je $7 \\cdot 8$?", odgovor: 56 },
          zasto: "$70 - 7 - 7 = 56$.",
          objasnjenje: "$7 \\cdot 8 = 7 \\cdot 10 - 7 \\cdot 2 = 70 - 14 = 56$.",
          pomoc: [
            { tip: "postupak", uvod: "Od deset sedmica oduzmemo dvije:", koraci: [{ racun: "7 \\cdot 2 = 14" }, { racun: "70 - 14" }] },
            { tip: "broj", tekst: "Koliko je $70 - 14$?", odgovor: 56 },
          ],
          blizanac: { tip: "broj", tekst: "Koliko je $7 \\cdot 9$?", odgovor: 63 },
        },
      ],
      zapamti: ["$7 \\cdot 8 = 56$"],
    },
  },
  {
    id: 6,
    naziv: "Pola i četvrtina",
    podrucje: "Razlomci",
    za: 0,
    lastGrade: 3,
    zadatak: "Koliko je četvrtina od $20$?",
    rjesenje: "Četvrtina je jedan od četiri jednaka dijela: $20 : 4 = 5$.",
    dani: [1, 32, 46, 77],
    // shown as text, to point out the switch between the two forms
    kaoTekst: true,
    lekcija: {
      verzija: 1,
      zadatak: { tekst: "Podijeli broj na jednake dijelove." },
      cijeli: {
        pitanje: {
          tip: "broj",
          tekst: "Koliko je četvrtina od $20$?",
          odgovor: 5,
          krivo: [{ vrijednost: 10, poruka: "10 je polovina od 20. Četvrtina je upola manja." }],
          savjet: "Četvrtina znači podijeliti na 4 jednaka dijela.",
        },
        blizanac: { tip: "broj", tekst: "Koliko je četvrtina od $12$?", odgovor: 3 },
        blizanacRjesenje: "$12 : 4 = 3$",
      },
      podzadaci: [
        {
          id: "a",
          naslov: "Pola",
          pitanje: { tip: "broj", tekst: "Koliko je pola od $20$?", odgovor: 10 },
          zasto: "Pola znači podijeliti s 2.",
          objasnjenje: "$20 : 2 = 10$.",
          pomoc: [
            { tip: "pojam", tekst: "**Pola** je jedan od dva jednaka dijela: broj podijelimo s 2." },
            { tip: "broj", tekst: "Koliko je $20 : 2$?", odgovor: 10 },
          ],
          blizanac: { tip: "broj", tekst: "Koliko je pola od $16$?", odgovor: 8 },
        },
        {
          id: "b",
          naslov: "Pola od pola",
          pitanje: { tip: "broj", tekst: "Četvrtina je pola od pola. Koliko je četvrtina od $20$?", odgovor: 5 },
          zasto: "Pola od 10 je 5.",
          objasnjenje: "Četvrtina od 20 je $20 : 4 = 5$, isto kao pola od 10.",
          pomoc: [
            { tip: "pojam", tekst: "**Četvrtina** je jedan od četiri jednaka dijela, to jest pola od pola." },
            { tip: "broj", tekst: "Koliko je pola od $10$?", odgovor: 5 },
          ],
          blizanac: { tip: "broj", tekst: "Koliko je četvrtina od $8$?", odgovor: 2 },
        },
      ],
      zapamti: ["Četvrtina od broja: podijeli ga s 4."],
    },
  },
];

export const ZADACI = LEKCIJE.filter((l) => l.zadatak);

// The lessons as they stand after the ratings given so far ({ lessonId: grade }).
export function lekcijeNakon(ocjene) {
  return LEKCIJE.map((l) => (l.id in ocjene ? { ...l, za: l.dani[ocjene[l.id] - 1], lastGrade: ocjene[l.id] } : l));
}

export function kada(dana) {
  if (dana <= 0) return "danas";
  if (dana === 1) return "sutra";
  return `za ${dana} dana`;
}
