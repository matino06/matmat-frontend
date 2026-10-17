// Katalog widgeta interaktivne lekcije: tip → logika (uloga, provjera speca, provjera odgovora, točan odgovor,
// opis za prompt). Bez Sveltea i preglednika, pa ga koriste i validator, skripta za izradu i (kasnije) backend.
import { pojam, postupak, skica } from "./tekst.js";
import { broj, izbor, vise_tocnih, tocno_netocno, praznina, parovi, redoslijed, razvrstaj } from "./pitanja.js";
import { klizac, mjerilo, mreza, ocitaj_graf, pretvorba_jedinica, cestice, uronjeno } from "./istrazivanje.js";
import { izraz, interval, graf_funkcije } from "./matematika.js";
import { POGLEDAJ, ODGOVOR } from "./zajednicko.js";

export const KATALOG = Object.fromEntries(
  [pojam, postupak, skica, klizac, broj, izbor, vise_tocnih, tocno_netocno, praznina, parovi, redoslijed, razvrstaj, mjerilo, mreza, ocitaj_graf, pretvorba_jedinica, cestice, uronjeno, izraz, interval, graf_funkcije].map((w) => [w.tip, w]),
);

// Widgeti koje automatska izrada (prompt) ne smije koristiti: lekcije s njima pišu se ručno (matematika za maturu).
export const ZA_PROMPT = Object.fromEntries(Object.entries(KATALOG).filter(([, w]) => !w.samoRucno));

export { POGLEDAJ, ODGOVOR };

export const widget = (spec) => KATALOG[spec?.tip];
export const uloga = (spec) => widget(spec)?.uloga(spec);
// Korak za gledanje u kojem učenik ipak nešto dira (klizač, mreža…): mora jasno pisati da nije zadatak.
export const istrazuje = (spec) => uloga(spec) === POGLEDAJ && !!widget(spec)?.istrazi?.(spec);

export function provjeri(spec, odgovor) {
  const w = widget(spec);
  if (!w?.check) return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  try {
    return w.check(spec, odgovor);
  } catch {
    return { tocno: false, poruka: "Odgovor se ne može provjeriti." };
  }
}

export const tocanOdgovor = (spec) => widget(spec)?.tocanOdgovor?.(spec) ?? "";
