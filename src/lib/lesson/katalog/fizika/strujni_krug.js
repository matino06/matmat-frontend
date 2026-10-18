// strujni_krug: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const strujni_krug = {
  tip: "strujni_krug",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "strujni_krug", tekst: "Widget „strujni_krug“ je u izradi." },
  validate: () => [],
};
