// smjer_u_polju: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const smjer_u_polju = {
  tip: "smjer_u_polju",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "smjer_u_polju", tekst: "Widget „smjer_u_polju“ je u izradi." },
  validate: () => [],
};
