// Widgeti za ručno pisane lekcije iz kemije (državna matura). Svi su samoRucno: prompt za automatsku izradu
// predmeta ih ne opisuje. Svaki widget ima svoju datoteku (logika) i komponentu u komponente/kemija/ (prikaz).
// Brojeve uzimaju iz _tablice.js (Kemija – tablice s ispita), pa se slažu s maturom.
import { jednadzba } from "./jednadzba.js";
import { mol_racun } from "./mol_racun.js";
import { periodni_sustav } from "./periodni_sustav.js";
import { molekula } from "./molekula.js";
import { ph_skala } from "./ph_skala.js";
import { titracija } from "./titracija.js";
import { pokus } from "./pokus.js";
import { ravnoteza } from "./ravnoteza.js";
import { elektrokemija } from "./elektrokemija.js";
import { redoks } from "./redoks.js";
import { energijski_dijagram } from "./energijski_dijagram.js";

export const KEMIJA = [
  jednadzba,
  mol_racun,
  periodni_sustav,
  molekula,
  ph_skala,
  titracija,
  pokus,
  ravnoteza,
  elektrokemija,
  redoks,
  energijski_dijagram,
];
