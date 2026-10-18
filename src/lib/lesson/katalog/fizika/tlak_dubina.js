// tlak_dubina: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const tlak_dubina = {
  tip: "tlak_dubina",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "tlak_dubina", tekst: "Widget „tlak_dubina“ je u izradi." },
  validate: () => [],
};
