// sudar: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const sudar = {
  tip: "sudar",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "sudar", tekst: "Widget „sudar“ je u izradi." },
  validate: () => [],
};
