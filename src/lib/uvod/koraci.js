// The walkthrough's steps. Each spotlights the elements marked data-tour={meta}:
//   - ceka: what moves it on (see uvodDogadaj); without it the step has a "Dalje" button.
//   - tekst(c): c is { datum, lekcije (after the ratings so far) }.
//   - strana: where the bubble prefers to sit ("iznad" keeps the rating's hint below visible).
// Kept short on purpose: most steps are something the student does, not something to read.
import { DANA_DO_ISPITA, ZADACI, kada } from "./scenarij";

const ponovljene = (c) => c.lekcije.filter((l) => l.zadatak);
const zaboravit = (c) => c.lekcije.filter((l) => l.za <= DANA_DO_ISPITA - 1 && l.za > 0);

export const KORACI = [
  {
    meta: "savladano",
    naslov: "Ovo je Napredak",
    tekst: (c) =>
      `Za probu: predmet s jako laganim lekcijama, ispit je za dva dana (${c.datum}). Desno piše kad koju lekciju ponavljaš. Ove četiri dolaze tek nakon ispita: savladao si ih i pamtiš ih do ispita.`,
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
    tekst: () => "Ovu si riješio jednom, jučer. Upiši odgovor. Ako zapneš, lekcija te vodi korak po korak.",
  },
  {
    meta: "ocjena",
    ceka: "ocijenjeno",
    strana: "iznad",
    naslov: "Ocjena određuje kad se vraća",
    tekst: () =>
      `Ocjenu ti predlaže MatMat, prema tome kako je išlo. Uz 4 ili 5 lekcija se vraća tek ${kada(ZADACI[0].dani[4])}, nakon ispita, a uz 3 ili manje sutra. Potvrdi je ili klikni Promijeni.`,
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
      `Ovu si već dvaput točno riješio, pa se uz 4 ili 5 vraća tek ${kada(ZADACI[1].dani[4])}. Prijeđi preko ocjena ili ih dodirni pa ocijeni.`,
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
