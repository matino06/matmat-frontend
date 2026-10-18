// energija_stupci: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const energija_stupci = {
  tip: "energija_stupci",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "energija_stupci", tekst: "Widget „energija_stupci“ je u izradi." },
  validate: () => [],
};
