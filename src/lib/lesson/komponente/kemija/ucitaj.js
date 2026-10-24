// Tip kemijskog widgeta → učitavanje njegove komponente (dinamički import), kao kod fizike.
export const UCITAJ_KEMIJA = {
  jednadzba: () => import("./Jednadzba.svelte"),
  mol_racun: () => import("./MolRacun.svelte"),
  periodni_sustav: () => import("./PeriodniSustav.svelte"),
  molekula: () => import("./Molekula.svelte"),
  ph_skala: () => import("./PhSkala.svelte"),
  titracija: () => import("./Titracija.svelte"),
  pokus: () => import("./Pokus.svelte"),
  ravnoteza: () => import("./Ravnoteza.svelte"),
  elektrokemija: () => import("./Elektrokemija.svelte"),
  redoks: () => import("./Redoks.svelte"),
  energijski_dijagram: () => import("./EnergijskiDijagram.svelte"),
  kalorimetar: () => import("./Kalorimetar.svelte"),
  brzina_reakcije: () => import("./BrzinaReakcije.svelte"),
  elektronska_konfiguracija: () => import("./ElektronskaKonfiguracija.svelte"),
  otopina: () => import("./Otopina.svelte"),
  topljivost: () => import("./Topljivost.svelte"),
};
