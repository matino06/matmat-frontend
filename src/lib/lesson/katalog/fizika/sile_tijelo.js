// sile_tijelo: u izradi (fizika, matura). Zamjenjuje se pravom implementacijom.
import { POGLEDAJ } from "../zajednicko.js";

export const sile_tijelo = {
  tip: "sile_tijelo",
  samoRucno: true,
  uloga: () => POGLEDAJ,
  opis: "U izradi.",
  primjer: { tip: "sile_tijelo", tekst: "Widget „sile_tijelo“ je u izradi." },
  validate: () => [],
};
