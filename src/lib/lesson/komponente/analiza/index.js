// Tip widgeta iz Matematičke analize → Svelte komponenta. Logika je u katalog/analiza/; komponente se učitavaju lijeno.
import Lijeno from "./Lijeno.svelte";
import { UCITAJ_ANALIZA } from "./ucitaj.js";

export const KOMPONENTE_ANALIZA = Object.fromEntries(Object.keys(UCITAJ_ANALIZA).map((tip) => [tip, Lijeno]));
