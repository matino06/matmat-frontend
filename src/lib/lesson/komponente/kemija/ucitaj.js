// Tip kemijskog widgeta → učitavanje njegove komponente (dinamički import), kao kod fizike.
export const UCITAJ_KEMIJA = {
  jednadzba: () => import("./Jednadzba.svelte"),
  mol_racun: () => import("./MolRacun.svelte"),
  periodni_sustav: () => import("./PeriodniSustav.svelte"),
};
