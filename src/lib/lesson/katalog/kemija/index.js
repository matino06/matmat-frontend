// Widgeti za ručno pisane lekcije iz kemije (državna matura). Svi su samoRucno: prompt za automatsku izradu
// predmeta ih ne opisuje. Svaki widget ima svoju datoteku (logika) i komponentu u komponente/kemija/ (prikaz).
// Brojeve uzimaju iz _tablice.js (Kemija – tablice s ispita), pa se slažu s maturom.
import { jednadzba } from "./jednadzba.js";
import { mol_racun } from "./mol_racun.js";
import { periodni_sustav } from "./periodni_sustav.js";
import { ph_skala } from "./ph_skala.js";
import { pokus } from "./pokus.js";

export const KEMIJA = [
  jednadzba,
  mol_racun,
  periodni_sustav,
  ph_skala,
  pokus,
];
