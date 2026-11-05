// Tip widgeta iz Matematičke analize → učitavanje njegove komponente (dinamički import), kao kod kemije.
export const UCITAJ_ANALIZA = {
  tablica: () => import("./Tablica.svelte"),
  relacija: () => import("./Relacija.svelte"),
};
