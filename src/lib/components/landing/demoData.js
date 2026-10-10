// Content for the logged-in app preview on the landing page. Everything here is
// made up for the demo, but shaped like what the real pages show: the tasks are
// Matura-style with checked solutions, the fields and their weights match
// pointsDistributionByCourse for the A level, the review intervals match the
// RatingPicker.

export const DEMO_TASKS = [
  {
    id: 1482,
    objective: "Logaritamske jednadžbe",
    text: "Riješi jednadžbu $\\log_2(x+3) + \\log_2(x-1) = 5$.",
    steps: [
      "Logaritmi su definirani za $x + 3 > 0$ i $x - 1 > 0$, dakle tražimo $x > 1$.",
      "Zbroj logaritama je logaritam umnoška: $\\log_2\\big((x+3)(x-1)\\big) = 5$, pa je $(x+3)(x-1) = 2^5 = 32$.",
      "Sređeno: $x^2 + 2x - 35 = 0$, odnosno $(x+7)(x-5) = 0$.",
      "Rješenje $x = -7$ nije veće od 1, pa ostaje $\\boxed{x = 5}$.",
    ],
    hint: "Prvo provjeri za koje $x$ su oba logaritma definirana. Zatim zbroj dva logaritma s istom bazom napiši kao jedan logaritam. Što dobiješ kad se riješiš logaritma?",
    explain: [
      "Logaritam postoji samo za pozitivan argument. Zato obje zagrade moraju biti veće od nule, a to istovremeno vrijedi tek za $x > 1$. Taj uvjet čuvamo do kraja da njime provjerimo rješenja.",
      "Koristimo pravilo $\\log_a m + \\log_a n = \\log_a(mn)$. Kad je $\\log_2$ nečega jednak 5, to nešto je $2^5$, jer je logaritam upravo eksponent.",
      "Pomnoži zagrade: $(x+3)(x-1) = x^2 + 2x - 3$. Izjednačeno s 32 daje $x^2 + 2x - 35 = 0$, a to se rastavlja jer je $7 \\cdot (-5) = -35$ i $7 - 5 = 2$.",
      "Kvadratna jednadžba daje dva kandidata, ali uvjet s početka traži $x > 1$. Broj $-7$ ga ne zadovoljava, pa je jedino rješenje $x = 5$. Provjera: $\\log_2 8 + \\log_2 4 = 3 + 2 = 5$.",
    ],
    why: "Pravilo $\\log_a m + \\log_a n = \\log_a(mn)$ spaja dva logaritma u jedan. Tek kad je s lijeve strane jedan logaritam, možeš ga se riješiti i dobiti običnu kvadratnu jednadžbu.",
  },
  {
    id: 977,
    objective: "Derivacija kvocijenta",
    text: "Zadana je funkcija $f(x) = \\dfrac{\\sin x}{x^2 + 1}$. Izračunaj $f'(0)$.",
    steps: [
      "Pravilo za derivaciju kvocijenta: $\\left(\\dfrac{u}{v}\\right)' = \\dfrac{u'v - uv'}{v^2}$.",
      "Ovdje je $u = \\sin x$, $u' = \\cos x$, $v = x^2 + 1$, $v' = 2x$.",
      "$f'(x) = \\dfrac{\\cos x\\,(x^2+1) - 2x \\sin x}{(x^2+1)^2}$",
      "Za $x = 0$: $f'(0) = \\dfrac{1 \\cdot 1 - 0}{1} = \\boxed{1}$.",
    ],
    hint: "Funkcija je razlomak, pa ti treba pravilo za derivaciju kvocijenta. Napiši posebno brojnik $u$ i nazivnik $v$ i njihove derivacije, a $x = 0$ uvrsti tek na kraju.",
    explain: [
      "Funkcija je razlomak dviju funkcija, pa je ne deriviramo dio po dio, nego pravilom za kvocijent. Pazi na redoslijed u brojniku: prvo $u'v$, pa minus $uv'$.",
      "Derivacija sinusa je kosinus, a derivacija od $x^2 + 1$ je $2x$, jer konstanta 1 nestaje.",
      "Ovdje samo uvrštavamo $u$, $u'$, $v$ i $v'$ u formulu. Nazivnik ne treba razvijati, kvadrat zagrade može ostati.",
      "U $x = 0$ je $\\cos 0 = 1$ i $\\sin 0 = 0$, pa drugi član brojnika nestaje. Ostaje $\\dfrac{1 \\cdot 1}{1^2} = 1$.",
    ],
    why: "Derivacija razlomka nije razlomak derivacija: $\\left(\\dfrac{u}{v}\\right)' \\neq \\dfrac{u'}{v'}$. Pravilo za kvocijent uzima u obzir da se mijenjaju i brojnik i nazivnik.",
  },
  {
    id: 2310,
    objective: "Geometrijski niz",
    text: "U geometrijskom nizu je $a_1 = 3$ i $a_4 = 24$. Koliki je zbroj prvih šest članova niza?",
    steps: [
      "Opći član: $a_n = a_1 q^{n-1}$, pa je $a_4 = 3q^3 = 24$.",
      "Odatle $q^3 = 8$, odnosno $q = 2$.",
      "Zbroj prvih $n$ članova: $S_n = a_1 \\dfrac{q^n - 1}{q - 1}$.",
      "$S_6 = 3 \\cdot \\dfrac{2^6 - 1}{2 - 1} = 3 \\cdot 63 = \\boxed{189}$",
    ],
    hint: "Napiši $a_4$ pomoću $a_1$ i kvocijenta $q$. Kad znaš $q$, u knjižici formula potraži zbroj prvih $n$ članova geometrijskog niza.",
    explain: [
      "U geometrijskom nizu svaki se član dobije množenjem prethodnog s $q$. Od $a_1$ do $a_4$ množiš tri puta, zato je $a_4 = a_1 q^3$.",
      "$q^3 = 8$ ima jedno realno rješenje, $q = 2$. Niz je dakle $3, 6, 12, 24, \\ldots$",
      "Formula za zbroj vrijedi kad je $q \\neq 1$. Mogao bi zbrojiti šest članova i ručno, ali formula je brža i teže je pogriješiti.",
      "Uvrštavamo $a_1 = 3$, $q = 2$ i $n = 6$. Provjera zbrajanjem: $3 + 6 + 12 + 24 + 48 + 96 = 189$.",
    ],
    why: "Formula za $S_n$ štedi zbrajanje član po član, a na maturi se zna tražiti i zbroj dvadesetak članova. Treba ti samo $a_1$, $q$ i $n$.",
  },
];

// Matura fields with their share of the A level exam points.
export const DEMO_FIELDS = [
  { name: "Algebra i funkcije", weight: 50, pct: 58 },
  { name: "Mjerenje", weight: 20, pct: 71 },
  { name: "Oblik i prostor", weight: 15, pct: 44 },
  { name: "Brojevi", weight: 10, pct: 86 },
  { name: "Podatci, statistika i vjerojatnost", weight: 5, pct: 30 },
];

// status: mastered | learning | scheduled, dots: last rating out of 5.
export const DEMO_OBJECTIVES = [
  { name: "Logaritamske jednadžbe", status: "learning", dots: 2, when: "danas" },
  { name: "Derivacija kvocijenta", status: "scheduled", dots: 3, when: "sutra" },
  { name: "Geometrijski niz", status: "scheduled", dots: 4, when: "za 6 dana" },
  { name: "Trigonometrijske jednadžbe", status: "learning", dots: 1, when: "danas" },
  { name: "Kvadratna funkcija", status: "mastered", dots: 5, when: "za 14 dana" },
  { name: "Volumen i oplošje tijela", status: "scheduled", dots: 3, when: "za 3 dana" },
];

// The demo exam: three multiple-choice questions, one point each.
export const DEMO_EXAM_QUESTIONS = [
  {
    text: "Koliko je $\\sqrt{50} - \\sqrt{18}$?",
    options: ["$2\\sqrt{2}$", "$\\sqrt{32}$", "$4$", "$8\\sqrt{2}$"],
    correct: "A",
  },
  {
    text: "Za koji $x$ vrijedi $3^{x+1} = 27$?",
    options: ["$1$", "$2$", "$3$", "$9$"],
    correct: "B",
  },
  {
    text: "Koliko je $\\sin 150^\\circ$?",
    options: ["$-\\dfrac{1}{2}$", "$\\dfrac{\\sqrt{3}}{2}$", "$\\dfrac{1}{2}$", "$-\\dfrac{\\sqrt{3}}{2}$"],
    correct: "C",
  },
];

export const DEMO_EXAMS = [
  { title: "ljetni rok", year: 2025, term: "Ljeto" },
  { title: "jesenski rok", year: 2024, term: "Jesen" },
  { title: "ljetni rok", year: 2024, term: "Ljeto" },
];

// Last five weeks, Monday first. 0 = no tasks that day, 3 = the most.
export const DEMO_ACTIVITY = [
  1, 2, 3, 2, 1, 0, 0,
  2, 3, 3, 1, 2, 1, 0,
  3, 2, 0, 2, 3, 2, 1,
  2, 3, 3, 3, 2, 1, 2,
  3, 3, 2, 3, 2,
];
