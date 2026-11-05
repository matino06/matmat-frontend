// Widgeti za ručno pisane lekcije iz Matematičke analize 1 (FER, međuispit). Svi su samoRucno: prompt za automatsku
// izradu predmeta ih ne opisuje. Svaki widget ima svoju datoteku (logika) i komponentu u komponente/analiza/ (prikaz).
// Registracija: jedan import i jedan redak u popisu po widgetu (dodaje ga autor widgeta alatom Edit).
import { relacija } from "./relacija.js";
import { tablica } from "./tablica.js";

export const ANALIZA = [
  tablica,
  relacija,
];
