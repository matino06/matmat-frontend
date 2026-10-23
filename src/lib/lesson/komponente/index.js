// Tip widgeta → Svelte komponenta. Logika (provjera, uloga) je u katalog/, ovdje je samo prikaz.
//
// Komponenta koraka „Tvoj red“ dobiva { spec, locked, pokazi, ishod, onodgovor }:
//   onodgovor(odgovor) – učenik je odgovorio; LessonRunner provjerava (katalog/provjeri) i vraća ishod
//   ishod – {tocno, poruka, …} zadnje provjere (za isticanje u widgetu; poruku ispisuje LessonRunner)
//   locked – odgovor je zaključan (točno ili prikazan točan odgovor)
//   pokazi – prikaži točan odgovor u samom widgetu
// Komponenta koraka „Pogledaj“ dobiva samo { spec } i nikad ništa ne provjerava.
import Pojam from "./Pojam.svelte";
import Postupak from "./Postupak.svelte";
import Skica from "./Skica.svelte";
import Klizac from "./Klizac.svelte";
import Broj from "./Broj.svelte";
import Izbor from "./Izbor.svelte";
import ViseTocnih from "./ViseTocnih.svelte";
import TocnoNetocno from "./TocnoNetocno.svelte";
import Praznina from "./Praznina.svelte";
import Parovi from "./Parovi.svelte";
import Redoslijed from "./Redoslijed.svelte";
import Razvrstaj from "./Razvrstaj.svelte";
import Mjerilo from "./Mjerilo.svelte";
import Mreza from "./Mreza.svelte";
import OcitajGraf from "./OcitajGraf.svelte";
import PretvorbaJedinica from "./PretvorbaJedinica.svelte";
import Cestice from "./Cestice.svelte";
import Uronjeno from "./Uronjeno.svelte";
import Izraz from "./Izraz.svelte";
import Interval from "./Interval.svelte";
import GrafFunkcije from "./GrafFunkcije.svelte";
import { KOMPONENTE_FIZIKA } from "./fizika/index.js";
import { KOMPONENTE_KEMIJA } from "./kemija/index.js";

export const KOMPONENTE = {
  pojam: Pojam,
  postupak: Postupak,
  skica: Skica,
  klizac: Klizac,
  broj: Broj,
  izbor: Izbor,
  vise_tocnih: ViseTocnih,
  tocno_netocno: TocnoNetocno,
  praznina: Praznina,
  parovi: Parovi,
  redoslijed: Redoslijed,
  razvrstaj: Razvrstaj,
  mjerilo: Mjerilo,
  mreza: Mreza,
  ocitaj_graf: OcitajGraf,
  pretvorba_jedinica: PretvorbaJedinica,
  cestice: Cestice,
  uronjeno: Uronjeno,
  izraz: Izraz,
  interval: Interval,
  graf_funkcije: GrafFunkcije,
  ...KOMPONENTE_FIZIKA,
  ...KOMPONENTE_KEMIJA,
};
