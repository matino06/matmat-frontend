// kruzenje: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const kruzenje = {
  tip: "kruzenje",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "kruzenje", tekst: "Widget „kruzenje“ je u izradi." },
  validate: () => [],
};
