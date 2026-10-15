// Koraci za gledanje: kratko objašnjenje, račun korak po korak i statična skica.
import { renderSketch } from "../../sketch/taskSketch.js";
import { POGLEDAJ, isText, problems, noAnswerFields } from "./zajednicko.js";

export const pojam = {
  tip: "pojam",
  uloga: () => POGLEDAJ,
  opis: `Kratko objašnjenje (1–3 rečenice): novi pojam svakodnevnim riječima, pa tek onda formula. Po želji uz skicu.
Polja: tekst (markdown), skica? (opis skice, isti tipovi kao skica uz zadatak).`,
  primjer: { tip: "pojam", tekst: "**Površina** govori koliko plohe nešto prekriva. Mjerimo je kvadratićima iste veličine." },
  validate(s, ctx) {
    const { list, need } = problems();
    need(isText(s.tekst), "pojam treba tekst");
    noAnswerFields(s, need);
    if (s.skica != null) sketchProblems(s.skica, ctx, need);
    return list;
  },
};

export const postupak = {
  tip: "postupak",
  uloga: () => POGLEDAJ,
  opis: `Račun ili postupak koji se otkriva redak po redak (učenik klikne za sljedeći redak). Za riješeni primjer.
Polja: uvod? (markdown), koraci: [{racun: LaTeX bez $, napomena?: kratko objašnjenje retka}] (1–6 redaka).`,
  primjer: {
    tip: "postupak",
    uvod: "Od završnog očitanja oduzmemo početno:",
    koraci: [
      { racun: "V = V_2 - V_1", napomena: "volumen tijela je samo povećanje" },
      { racun: "V = 220\\ \\text{mL} - 140\\ \\text{mL} = 80\\ \\text{mL}" },
    ],
  },
  validate(s) {
    const { list, need } = problems();
    if (need(Array.isArray(s.koraci) && s.koraci.length >= 1, "postupak treba barem jedan korak u „koraci“")) {
      need(s.koraci.length <= 6, "postupak smije imati najviše 6 redaka");
      s.koraci.forEach((k, i) => {
        need(isText(k?.racun), `koraci[${i}].racun mora biti LaTeX tekst`);
        need(!/^\s*\$|\$\s*$/.test(k?.racun ?? ""), `koraci[${i}].racun piši bez $ (dodaje ih aplikacija)`);
      });
    }
    noAnswerFields(s, need);
    return list;
  },
};

export const skica = {
  tip: "skica",
  uloga: () => POGLEDAJ,
  opis: `Statična skica s kratkim tekstom. Polja: skica (opis skice: trokut, kruznica, graf, koordinatni, pravokutnik, kvadar,
ljestvica, sile, strujni_krug – isti format kao skica uz zadatak), tekst? (markdown).`,
  primjer: { tip: "skica", tekst: "Papir prekriven kvadratićima od 1 cm.", skica: { tip: "pravokutnik", a: 6, b: 6, mreza: 1, oznake: { a: "6 cm", b: "6 cm" } } },
  validate(s, ctx) {
    const { list, need } = problems();
    if (need(s.skica && typeof s.skica === "object", "skica treba polje „skica“")) sketchProblems(s.skica, ctx, need);
    noAnswerFields(s, need);
    return list;
  },
};

// Skica se provjerava istim kodom koji je crta (taskSketch.js); brojevi s oznaka moraju biti u tekstu lekcije.
export function sketchProblems(spec, ctx, need) {
  const r = renderSketch(spec, ctx?.text ?? "");
  if (!r.svg) need(false, `skica se ne može nacrtati: ${r.checks.filter((c) => !c.ok).map((c) => c.text).join("; ") || "neispravan opis"}`);
}
