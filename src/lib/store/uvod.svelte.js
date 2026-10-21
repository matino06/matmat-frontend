// The walkthrough ("uvod"): while it runs, Napredak and Zadaci show the made-up course
// from $lib/uvod/scenarij and UvodVodic spotlights one element of the page at a time.
import { KORACI } from "$lib/uvod/koraci";

export const uvod = $state({
  active: false,
  korak: 0,
  // the ratings given in the walkthrough: { lessonId: q }
  ocjene: {},
});

function track(event, params) {
  if (typeof window !== "undefined") window.gtag?.("event", event, params);
}

export function pokreniUvod() {
  uvod.active = true;
  uvod.korak = 0;
  uvod.ocjene = {};
  track("uvod_start");
}

export function sljedeciKorak() {
  uvod.korak += 1;
}

// What the student just did on the page ("otkriveno", "ocijenjeno", "put:/tasks");
// a step that waits for it moves on.
export function uvodDogadaj(ime) {
  if (uvod.active && KORACI[uvod.korak]?.ceka === ime) uvod.korak += 1;
}

export function ocijeniUvod(lessonId, q) {
  uvod.ocjene = { ...uvod.ocjene, [lessonId]: q };
}

export function zavrsiUvod(preskocen) {
  if (preskocen) track("uvod_preskocen", { korak: uvod.korak });
  else track("uvod_zavrsen", { ocjene: Object.values(uvod.ocjene).join(",") });
  uvod.active = false;
}
