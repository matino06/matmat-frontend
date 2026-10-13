// PROTOTIP: ručno napisani zadaci i JSON opisi skica kakve bi model vratio uz zadatak (bez poziva OpenRoutera).
// Zadnja dva primjera namjerno imaju grešku u opisu, da se vidi što se tada prikaže.

export const EXAMPLES = [
  {
    title: "Trokut (matematika)",
    task: "Pravokutni trokut \\(ABC\\) ima pravi kut u vrhu \\(C\\). Kateta \\(a = 6\\) cm, kateta \\(b = 8\\) cm.\n\na) Kolika je hipotenuza \\(c\\)?\n\nb) Koliki je kut \\(\\alpha\\)?",
    spec: {
      tip: "trokut",
      stranice: { a: 6, b: 8, c: 10 },
      pravi_kut: "C",
      oznake: { a: "6 cm", b: "8 cm", c: "?" },
      kutovi: { "α": "?" },
    },
  },
  {
    title: "Kružnica (matematika)",
    task: "U kružnici sa središtem \\(S\\) i polumjerom \\(r = 5\\) cm povučena je tetiva \\(\\overline{AB}\\) duljine 8 cm.\n\na) Kolika je udaljenost \\(d\\) tetive od središta?\n\nb) Koliki je središnji kut nad tetivom?",
    spec: { tip: "kruznica", r: 5, tetiva: { duljina: 8 }, oznake: { r: "5 cm", tetiva: "8 cm", d: "?" } },
  },
  {
    title: "Graf funkcije (matematika)",
    task: "Zadana je funkcija \\(f(x) = x^2 - 4x + 3\\) i pravac \\(g(x) = x - 1\\).\n\na) Odredi tjeme parabole.\n\nb) U kojim točkama pravac siječe parabolu?",
    spec: {
      tip: "graf",
      x: [-1, 5],
      y: [-2, 6],
      funkcije: [
        { izraz: "x^2-4x+3", oznaka: "f" },
        { izraz: "x-1", oznaka: "g" },
      ],
      tocke: [
        { x: 2, y: -1, oznaka: "T", na: "f" },
        { x: 1, y: 0, oznaka: "S₁", na: "g" },
        { x: 4, y: 3, oznaka: "S₂", na: "g" },
      ],
    },
  },
  {
    title: "Koordinatni sustav (matematika)",
    task: "Zadane su točke \\(A(-2, 1)\\) i \\(B(4, 3)\\).\n\na) Odredi polovište \\(M\\) dužine \\(\\overline{AB}\\).\n\nb) Kolika je duljina dužine \\(\\overline{AB}\\)?",
    spec: {
      tip: "koordinatni",
      x: [-3, 5],
      y: [-1, 4],
      tocke: [
        { oznaka: "A", x: -2, y: 1, zadana: true },
        { oznaka: "B", x: 4, y: 3, zadana: true },
        { oznaka: "M", x: 1, y: 2 },
      ],
      duzine: [["A", "B"]],
      polovista: [{ tocka: "M", od: ["A", "B"] }],
    },
  },
  {
    title: "Sile na kosini (fizika)",
    task: "Kutija mase 4 kg miruje na kosini nagiba \\(30^\\circ\\). Uzmi \\(g = 10\\ \\text{m/s}^2\\).\n\na) Kolika je normalna sila kosine na kutiju?\n\nb) Kolika je sila trenja koja drži kutiju na mjestu?",
    spec: {
      tip: "sile",
      podloga: { vrsta: "kosina", kut: 30 },
      sile: [
        { oznaka: "G", smjer: "dolje", iznos: 40 },
        { oznaka: "N", smjer: "okomito_od_podloge", iznos: 34.6 },
        { oznaka: "F_tr", smjer: "uz_kosinu", iznos: 20 },
      ],
      rastav: "G",
    },
  },
  {
    title: "Strujni krug (fizika)",
    task: "Izvor napona 12 V spojen je s otpornikom \\(R_1 = 4\\ \\Omega\\), a iza njega su paralelno spojeni \\(R_2 = 6\\ \\Omega\\) i \\(R_3 = 3\\ \\Omega\\). Ampermetar je u glavnoj grani.\n\na) Koliki je ukupni otpor kruga?\n\nb) Koliku struju pokazuje ampermetar?",
    spec: {
      tip: "strujni_krug",
      izvor: { oznaka: "U = 12 V" },
      spoj: { serijski: [{ R: "R₁ = 4 Ω" }, { paralelno: [{ R: "R₂ = 6 Ω" }, { R: "R₃ = 3 Ω" }] }] },
      instrumenti: [{ vrsta: "A", gdje: "glavna_grana" }],
    },
  },
  {
    title: "Greška u opisu: krivi broj",
    task: "Pravokutni trokut \\(ABC\\) ima pravi kut u vrhu \\(C\\). Kateta \\(a = 6\\) cm, kateta \\(b = 8\\) cm.\n\na) Kolika je hipotenuza \\(c\\)?",
    note: "Model je u opisu napisao b = 7 cm umjesto 8 cm.",
    spec: { tip: "trokut", stranice: { a: 6, b: 7, c: 10 }, pravi_kut: "C", oznake: { a: "6 cm", b: "7 cm", c: "?" } },
  },
  {
    title: "Greška u opisu: točka nije na grafu",
    task: "Zadana je funkcija \\(f(x) = x^2 - 4x + 3\\).\n\na) Odredi tjeme parabole.",
    note: "Model je tjeme stavio u (2, 1) umjesto (2, −1).",
    spec: { tip: "graf", x: [-1, 5], y: [-2, 6], funkcije: [{ izraz: "x^2-4x+3", oznaka: "f" }], tocke: [{ x: 2, y: 1, oznaka: "T" }] },
  },
];
