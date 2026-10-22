// The walkthrough's steps. Each spotlights the elements marked data-tour={meta}:
//   - ceka: what moves it on (see uvodDogadaj); without it the step has a "Dalje" button.
//   - tekst(c): c is { datum, lekcije (after the ratings so far) }.
//   - strana: where the bubble prefers to sit ("iznad" keeps the rating's hint below visible).
// One idea per step: the made-up course, its exam date, what the days mean, then today's lessons.
import { DANA_DO_ISPITA, LEKCIJE, ZADACI, kada } from "./scenarij";

const savladane = LEKCIJE.filter((l) => !l.zadatak);
const ponovljene = (c) => c.lekcije.filter((l) => l.zadatak);
const zaboravit = (c) => c.lekcije.filter((l) => l.za <= DANA_DO_ISPITA - 1 && l.za > 0);

export const KORACI = [
  {
    meta: "ispit",
    naslov: "Probni predmet",
    tekst: () =>
      "Prije tvog predmeta, kratka proba na izmišljenom predmetu. Lekcije su jako lagane, poput zbrajanja i množenja, da se možeš usredotočiti na to kako MatMat radi.",
  },
  {
    meta: "ispit",
    naslov: "Ispit je za dva dana",
    tekst: (c) =>
      `Zamisli da ti je ispit iz ovog predmeta za dva dana (${c.datum}). Za tvoj pravi predmet MatMat zna datum ispita, npr. dan mature, i sve planira prema njemu.`,
  },
  {
    meta: "dani",
    naslov: "Ponavljanje u razmacima",
    tekst: () =>
      `MatMat koristi ponavljanje u razmacima (spaced repetition): lekciju koju riješiš vraća ti nakon nekoliko dana, baš kad bi je počeo zaboravljati. Broj desno kaže kad: ${LEKCIJE[0].naziv} se vraća ${kada(LEKCIJE[0].za)}. Što ti je bolje išlo, to je razmak dulji.`,
  },
  {
    meta: "savladano",
    naslov: "Ove četiri pamtiš do ispita",
    tekst: () =>
      `Ove četiri znaš dovoljno dobro da ih do ispita nećeš zaboraviti. Zato ih MatMat vraća tek nakon ispita (desno piše za ${Math.min(...savladane.map((l) => l.za))} i više dana, a ispit je za ${DANA_DO_ISPITA}), pa ih do tada ne moraš ponavljati.`,
  },
  {
    meta: "ponavljanje",
    naslov: "Ove dvije su danas",
    tekst: () =>
      `${ZADACI[0].naziv} i ${ZADACI[1].naziv} isto znaš, ali bez ponavljanja bi ih do ispita zaboravio. Zato su danas na redu.`,
  },
  {
    meta: "nav-tasks",
    ceka: "put:/tasks",
    naslov: "Idemo ih ponoviti",
    tekst: () => "Otvori Zadatke.",
  },
  {
    meta: "zadatak",
    ceka: "otkriveno",
    naslov: ZADACI[0].naziv,
    tekst: () => "Ovu si jučer riješio s mukom. Upiši odgovor. Ako zapneš, lekcija te vodi korak po korak.",
  },
  {
    meta: "ocjena",
    ceka: "ocijenjeno",
    strana: "iznad",
    naslov: "Ocjena određuje kad se vraća",
    tekst: () =>
      `Ocjenu ti predlaže MatMat, prema tome kako je išlo. Uz „Nisam riješio“ lekcija se vraća sutra, dan prije ispita, a uz ostale ocjene tek nakon ispita (uz „Dobro“ ${kada(ZADACI[0].dani[2])}). Potvrdi je ili klikni Promijeni.`,
  },
  {
    meta: "zadatak",
    ceka: "otkriveno",
    naslov: ZADACI[1].naziv,
    tekst: () =>
      "Ovaj je prikazan kao tekst: riješi ga sam pa otvori rješenje. Gumb ispod svaki zadatak prebacuje iz teksta u interaktivni oblik i natrag.",
  },
  {
    meta: "ocjena",
    ceka: "ocijenjeno",
    strana: "iznad",
    naslov: "Ista ocjena, dulji razmak",
    tekst: () =>
      `Ovu si već dvaput dobro riješio, pa se uz „Dobro“ vraća tek ${kada(ZADACI[1].dani[2])}. Prijeđi preko ocjena ili ih dodirni pa ocijeni.`,
  },
  {
    meta: "nav-progress",
    ceka: "put:/progress",
    naslov: "Gotovo za danas",
    tekst: () => "Pogledaj što se promijenilo na Napretku.",
  },
  {
    meta: "ponavljanje",
    naslov: "Tako MatMat radi",
    zadnji: true,
    tekst: (c) => {
      const [a, b] = ponovljene(c);
      const prije = zaboravit(c);
      let t;
      if (!prije.length)
        t = `${a.naziv} se vraća ${kada(a.za)}, ${b.naziv} ${kada(b.za)}: obje nakon ispita. Spreman si.`;
      else if (prije.length === 2) t = "Obje se vraćaju sutra, dan prije ispita. Tad ih riješi i spreman si.";
      else {
        const poslije = a.za > DANA_DO_ISPITA ? a : b;
        t = `${poslije.naziv} se vraća ${kada(poslije.za)}, nakon ispita. ${prije[0].naziv} dolazi sutra, dan prije ispita: tad je riješi i spreman si.`;
      }
      return `${t} Isto ti radi za maturu: svaki dan dobiješ baš ono što bi inače zaboravio.`;
    },
  },
];
