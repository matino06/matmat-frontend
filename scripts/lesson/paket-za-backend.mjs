// Paket validatora i prompta interaktivnih lekcija za backend (GraalJS), kao kopija taskSketch.js:
// backend izvršava isti kod kao frontend, pa provjera i prompt nikad ne odstupaju od aplikacije.
//
//   node scripts/lesson/paket-za-backend.mjs [putanja-do-matmat-backend]
//
// Izlaz: <backend>/src/main/resources/lesson/lesson.js – jedna skripta koja postavlja globalni MatMatLesson
// { validateLesson, sustavPrompt, korisnickiPrompt, popravakPrompt, predlozakPrompt, VERZIJA }. Pokreni nakon svake promjene
// u src/lib/lesson/katalog, validateLesson.js, prompt.js ili core/.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const backend = resolve(process.argv[2] ?? join(root, "../matmat-backend"));
const outfile = join(backend, "src/main/resources/lesson/lesson.js");

await build({
  stdin: {
    contents: `export { validateLesson, VERZIJA } from "./src/lib/lesson/validateLesson.js";
export { sustavPrompt, korisnickiPrompt, popravakPrompt, predlozakPrompt } from "./src/lib/lesson/prompt.js";`,
    resolveDir: root,
    loader: "js",
  },
  bundle: true,
  format: "iife",
  globalName: "MatMatLesson",
  target: "es2022",
  charset: "utf8",
  legalComments: "none",
  banner: { js: "// GENERIRANO iz matmat-frontend (scripts/lesson/paket-za-backend.mjs). Ne mijenjati ručno." },
  outfile,
});
console.log(`Zapisano: ${outfile}`);
