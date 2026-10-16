// Laboratorij interaktivnih lekcija: čita lokalne rezultate skripte (lab-out/, izvan repozitorija). Samo u dev
// načinu; u produkciji stranica ne postoji, pa sadržaj kreatora nikad ne završi na serveru.
import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { validateLesson } from "$lib/lesson/validateLesson.js";

export async function load({ url }) {
  if (!dev) error(404, "Not found");
  const dir = join(process.cwd(), "lab-out");
  // ?mapa=<ime>: druga mapa u lab-out (skripta s --mapa), npr. za usporedbu prompta ili modela
  const mapa = (url.searchParams.get("mapa") ?? "lekcije").replace(/[^\w-]/g, "") || "lekcije";
  const files = await readdir(join(dir, mapa)).catch(() => []);
  const lekcije = [];
  for (const f of files.filter((f) => f.endsWith(".json")).sort()) {
    try {
      const z = JSON.parse(await readFile(join(dir, mapa, f), "utf8"));
      // provjera iznova, trenutnim validatorom: spremljeni nalaz je od trenutka izrade
      if (z.lekcija) z.provjera = validateLesson(z.lekcija, { rezultati: parse(z.izvor?.results), skica: z.izvor?.sketch });
      lekcije.push(z);
    } catch {
      // napola zapisana datoteka dok skripta radi
    }
  }
  return { lekcije };
}

function parse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
