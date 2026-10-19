// Tip widgeta za fiziku (maturu) → Svelte komponenta. Logika je u katalog/fizika/.
// Komponente se učitavaju tek kad ih lekcija treba (Lijeno.svelte), pa lekcije iz matematike ne preuzimaju kod
// fizikalnih simulacija.
import Lijeno from "./Lijeno.svelte";
import { UCITAJ_FIZIKA } from "./ucitaj.js";

export const KOMPONENTE_FIZIKA = Object.fromEntries(
  Object.keys(UCITAJ_FIZIKA).map((tip) => [tip, Lijeno]),
);
