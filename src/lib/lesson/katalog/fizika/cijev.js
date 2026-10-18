// cijev: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const cijev = {
  tip: "cijev",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "cijev", tekst: "Widget „cijev“ je u izradi." },
  validate: () => [],
};
