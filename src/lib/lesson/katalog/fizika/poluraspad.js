// poluraspad: STUB — widget je u izradi (Blok Q: moderna fizika).
import { POGLEDAJ, ODGOVOR } from "../zajednicko.js";

const TIP = "poluraspad";

export const poluraspad = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: "U izradi.",
  primjer: { tip: TIP, nacin: "istrazi", tekst: "U izradi." },
  primjeri: [],
  validate: () => [],
  check: () => ({ tocno: false, poruka: "U izradi." }),
  tocanOdgovor: () => "",
};
