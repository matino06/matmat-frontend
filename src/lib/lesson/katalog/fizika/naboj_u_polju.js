// naboj_u_polju: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const naboj_u_polju = {
  tip: "naboj_u_polju",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "naboj_u_polju", tekst: "Widget „naboj_u_polju“ je u izradi." },
  validate: () => [],
};
