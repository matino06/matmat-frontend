// gibanje: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const gibanje = {
  tip: "gibanje",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "gibanje", tekst: "Widget „gibanje“ je u izradi." },
  validate: () => [],
};
