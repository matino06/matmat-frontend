// Widgeti za ručno pisane lekcije iz fizike (državna matura). Svi su samoRucno: prompt za automatsku izradu
// predmeta ih ne opisuje. Svaki widget ima svoju datoteku (logika) i komponentu u komponente/fizika/ (prikaz).
import { gibanje } from "./gibanje.js";
import { crtaj_graf } from "./crtaj_graf.js";
import { sile_tijelo } from "./sile_tijelo.js";
import { vektori } from "./vektori.js";
import { kruzenje } from "./kruzenje.js";
import { sudar } from "./sudar.js";
import { energija_stupci } from "./energija_stupci.js";
import { tlak_dubina } from "./tlak_dubina.js";
import { cijev } from "./cijev.js";
import { krivulja_zagrijavanja } from "./krivulja_zagrijavanja.js";
import { plinski_dijagram } from "./plinski_dijagram.js";
import { plin_posuda } from "./plin_posuda.js";
import { naboji_polje } from "./naboji_polje.js";
import { ploce_polje } from "./ploce_polje.js";
import { strujni_krug } from "./strujni_krug.js";
import { smjer_u_polju } from "./smjer_u_polju.js";
import { indukcija } from "./indukcija.js";
import { naboj_u_polju } from "./naboj_u_polju.js";
import { titranje } from "./titranje.js";
import { val_uze } from "./val_uze.js";
import { valne_fronte } from "./valne_fronte.js";
import { razina_zvuka } from "./razina_zvuka.js";
import { zrake } from "./zrake.js";
import { leca } from "./leca.js";
import { interferencija } from "./interferencija.js";
import { em_val } from "./em_val.js";
import { polarizacija } from "./polarizacija.js";
import { kvant } from "./kvant.js";
import { atom } from "./atom.js";
import { jezgra } from "./jezgra.js";
import { poluraspad } from "./poluraspad.js";
import { relativnost } from "./relativnost.js";

export const FIZIKA = [
  gibanje,
  crtaj_graf,
  sile_tijelo,
  vektori,
  kruzenje,
  sudar,
  energija_stupci,
  tlak_dubina,
  cijev,
  krivulja_zagrijavanja,
  plinski_dijagram,
  plin_posuda,
  naboji_polje,
  ploce_polje,
  strujni_krug,
  smjer_u_polju,
  indukcija,
  naboj_u_polju,
  titranje,
  val_uze,
  valne_fronte,
  razina_zvuka,
  zrake,
  leca,
  interferencija,
  em_val,
  polarizacija,
  kvant,
  atom,
  jezgra,
  poluraspad,
  relativnost,
];
