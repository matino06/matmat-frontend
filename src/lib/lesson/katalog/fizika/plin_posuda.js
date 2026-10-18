// plin_posuda: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const plin_posuda = {
  tip: "plin_posuda",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "plin_posuda", tekst: "Widget „plin_posuda“ je u izradi." },
  validate: () => [],
};
