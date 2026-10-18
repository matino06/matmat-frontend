// Tip widgeta za fiziku (maturu) → Svelte komponenta. Logika je u katalog/fizika/.
// Komponente se učitavaju tek kad ih lekcija treba (Lijeno.svelte), pa lekcije iz matematike ne preuzimaju kod
// fizikalnih simulacija.
import Lijeno from "./Lijeno.svelte";

export const UCITAJ_FIZIKA = {
  gibanje: () => import("./Gibanje.svelte"),
  crtaj_graf: () => import("./CrtajGraf.svelte"),
  sile_tijelo: () => import("./SileTijelo.svelte"),
  vektori: () => import("./Vektori.svelte"),
  kruzenje: () => import("./Kruzenje.svelte"),
  sudar: () => import("./Sudar.svelte"),
  energija_stupci: () => import("./EnergijaStupci.svelte"),
  tlak_dubina: () => import("./TlakDubina.svelte"),
  cijev: () => import("./Cijev.svelte"),
  krivulja_zagrijavanja: () => import("./KrivuljaZagrijavanja.svelte"),
  plinski_dijagram: () => import("./PlinskiDijagram.svelte"),
  plin_posuda: () => import("./PlinPosuda.svelte"),
  naboji_polje: () => import("./NabojiPolje.svelte"),
  ploce_polje: () => import("./PlocePolje.svelte"),
  strujni_krug: () => import("./StrujniKrug.svelte"),
  smjer_u_polju: () => import("./SmjerUPolju.svelte"),
  indukcija: () => import("./Indukcija.svelte"),
  naboj_u_polju: () => import("./NabojUPolju.svelte"),
};

export const KOMPONENTE_FIZIKA = Object.fromEntries(
  Object.keys(UCITAJ_FIZIKA).map((tip) => [tip, Lijeno]),
);
