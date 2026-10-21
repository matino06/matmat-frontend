// The walkthrough's steps. Each spotlights the elements marked data-tour={meta}:
//   - ceka: what moves it on (see uvodDogadaj); without it the step has a "Dalje" button.
//   - tekst(c): c is { datum, lekcije (after the ratings so far), zadaci }.
//   - strana: where the bubble prefers to sit ("iznad" keeps the rating's hint below visible).
import { DANA_DO_ISPITA, ZADACI, kada } from "./scenarij";

const ponovljene = (c) => c.lekcije.filter((l) => l.zadatak);
const zaboravit = (c) => c.lekcije.filter((l) => l.za <= DANA_DO_ISPITA - 1 && l.za > 0);

export const KORACI = [
  {
    put: "/progress",
    meta: "spremnost",
    naslov: "Ovo je Napredak",
    tekst: (c) =>
      `Za probu smo ti složili predmet s jako laganim lekcijama. Ispit je ${c.datum}, za dva dana. Krug pokazuje koliko si spreman.`,
  },
  {
    put: "/progress",
    meta: "ishodi",
    naslov: "Svaka lekcija ima svoj datum",
    tekst: () =>
      "Desno piše kad je sljedeće ponavljanje. Zbrajanje, oduzimanje, množenje i dijeljenje dolaze tek nakon ispita, znači da ih pamtiš do ispita.",
  },
  {
    put: "/progress",
    meta: "ponavljanje",
    naslov: "Ove dvije su danas",
    tekst: () =>
      "Znaš ih, ali bez ponavljanja bi ih do ispita zaboravio. Zato ti ih MatMat daje danas.",
  },
  {
    meta: "nav-tasks",
    ceka: "put:/tasks",
    naslov: "Idemo ih ponoviti",
    tekst: () => "Otvori Zadatke.",
  },
  {
    put: "/tasks",
    meta: "zadatak",
    ceka: "otkriveno",
    naslov: ZADACI[0].naziv,
    tekst: () => "Ovu si riješio jednom, jučer. Riješi zadatak u glavi pa klikni Pokaži rješenje.",
  },
  {
    put: "/tasks",
    meta: "ocjena",
    ceka: "ocijenjeno",
    strana: "iznad",
    naslov: "Ocjena određuje kad se vraća",
    tekst: () =>
      `Prijeđi preko ocjena ili ih dodirni pa pogledaj kad se lekcija vraća. S 4 ili 5 tek ${kada(ZADACI[0].dani[4])}, nakon ispita. S 3 ili manje sutra, dan prije ispita. Ocijeni iskreno.`,
  },
  {
    put: "/tasks",
    meta: "zadatak",
    ceka: "otkriveno",
    naslov: ZADACI[1].naziv,
    tekst: () => "Ovu si već dvaput točno riješio, zadnji put prije 6 dana. Riješi pa otvori rješenje.",
  },
  {
    put: "/tasks",
    meta: "ocjena",
    ceka: "ocijenjeno",
    strana: "iznad",
    naslov: "Ista ocjena, dulji razmak",
    tekst: () =>
      `Lekcija koju si više puta riješio vraća se kasnije: s 4 ili 5 tek ${kada(ZADACI[1].dani[4])}. Pogledaj pa ocijeni.`,
  },
  {
    meta: "nav-progress",
    ceka: "put:/progress",
    naslov: "Gotovo za danas",
    tekst: () => "Pogledaj što se promijenilo na Napretku.",
  },
  {
    put: "/progress",
    meta: "ponavljanje",
    naslov: "Novi datumi",
    tekst: (c) => {
      const [a, b] = ponovljene(c);
      const prije = zaboravit(c);
      if (!prije.length)
        return `${a.naziv} se vraća ${kada(a.za)}, ${b.naziv} ${kada(b.za)}. Obje tek nakon ispita, pa ih do tada ne moraš ponavljati.`;
      if (prije.length === 2)
        return "Obje se vraćaju sutra, dan prije ispita: tad ih opet riješi i zapamtit ćeš ih do ispita.";
      const poslije = a.za > DANA_DO_ISPITA ? a : b;
      return `${poslije.naziv} se vraća ${kada(poslije.za)}, nakon ispita. ${prije[0].naziv} dolazi sutra, dan prije ispita: tad je opet riješi i zapamtit ćeš je do ispita.`;
    },
  },
  {
    put: "/progress",
    meta: "spremnost",
    naslov: "Tako MatMat radi",
    zadnji: true,
    tekst: (c) => {
      const prije = zaboravit(c);
      const stanje = prije.length
        ? `Još ${prije.length === 1 ? "jedno ponavljanje" : "dva ponavljanja"} sutra i spreman si za ispit.`
        : "Svih 6 lekcija pamtiš do ispita, spreman si.";
      return `${stanje} Isto ti radi za maturu: svaki dan ti da baš ono što bi inače zaboravio, a ocjena određuje kad se vraća.`;
    },
  },
];
