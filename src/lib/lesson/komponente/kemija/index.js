// Tip widgeta za kemiju (maturu) → Svelte komponenta. Logika je u katalog/kemija/; komponente se učitavaju lijeno.
import Lijeno from "./Lijeno.svelte";
import { UCITAJ_KEMIJA } from "./ucitaj.js";

export const KOMPONENTE_KEMIJA = Object.fromEntries(Object.keys(UCITAJ_KEMIJA).map((tip) => [tip, Lijeno]));
