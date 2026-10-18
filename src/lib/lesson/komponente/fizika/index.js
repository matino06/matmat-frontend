// Tip widgeta za fiziku (maturu) → Svelte komponenta. Logika je u katalog/fizika/.
import Gibanje from "./Gibanje.svelte";
import CrtajGraf from "./CrtajGraf.svelte";
import SileTijelo from "./SileTijelo.svelte";
import Vektori from "./Vektori.svelte";
import Kruzenje from "./Kruzenje.svelte";
import Sudar from "./Sudar.svelte";
import EnergijaStupci from "./EnergijaStupci.svelte";
import TlakDubina from "./TlakDubina.svelte";
import Cijev from "./Cijev.svelte";
import KrivuljaZagrijavanja from "./KrivuljaZagrijavanja.svelte";
import PlinskiDijagram from "./PlinskiDijagram.svelte";
import PlinPosuda from "./PlinPosuda.svelte";
import NabojiPolje from "./NabojiPolje.svelte";
import PlocePolje from "./PlocePolje.svelte";
import StrujniKrug from "./StrujniKrug.svelte";
import SmjerUPolju from "./SmjerUPolju.svelte";
import Indukcija from "./Indukcija.svelte";
import NabojUPolju from "./NabojUPolju.svelte";

export const KOMPONENTE_FIZIKA = {
  gibanje: Gibanje,
  crtaj_graf: CrtajGraf,
  sile_tijelo: SileTijelo,
  vektori: Vektori,
  kruzenje: Kruzenje,
  sudar: Sudar,
  energija_stupci: EnergijaStupci,
  tlak_dubina: TlakDubina,
  cijev: Cijev,
  krivulja_zagrijavanja: KrivuljaZagrijavanja,
  plinski_dijagram: PlinskiDijagram,
  plin_posuda: PlinPosuda,
  naboji_polje: NabojiPolje,
  ploce_polje: PlocePolje,
  strujni_krug: StrujniKrug,
  smjer_u_polju: SmjerUPolju,
  indukcija: Indukcija,
  naboj_u_polju: NabojUPolju,
};
