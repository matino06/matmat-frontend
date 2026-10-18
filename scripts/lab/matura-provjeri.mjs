// Ručno pisane interaktivne lekcije za Matematiku A: provjera validatorom i priprema za lab.
//
//   node scripts/lab/matura-provjeri.mjs [--mapa fizika] [task_id …]
//
// --mapa: lab-out/<mapa>/ umjesto lab-out/matura/ (npr. fizika za maturu iz fizike); izlaz u lab-out/<mapa>-lab/.
// Čita lab-out/matura/izvor-sve.json (izvorni zadaci iz baze, samo čitanje) i lab-out/matura/lekcije/<task_id>.json
// (lekcija), ispisuje greške i upozorenja i zapisuje lab-out/matura-lab/<task_id>.json za /lab/lekcija?mapa=matura-lab.
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { validateLesson } from "../../src/lib/lesson/validateLesson.js";

const argv = process.argv.slice(2);
const mi = argv.indexOf("--mapa");
const mapa = mi >= 0 ? argv.splice(mi, 2)[1].replace(/[^\w-]/g, "") : "matura";
const dir = join(process.cwd(), "lab-out", mapa);
const labDir = join(process.cwd(), "lab-out", `${mapa}-lab`);
const izvori = Object.fromEntries(JSON.parse(await readFile(join(dir, "izvor-sve.json"), "utf8")).map((z) => [String(z.task_id), z]));
const trazeni = argv;
await mkdir(join(dir, "lekcije"), { recursive: true });
await mkdir(labDir, { recursive: true });
const datoteke = (await readdir(join(dir, "lekcije"))).filter((f) => f.endsWith(".json") && (!trazeni.length || trazeni.includes(f.replace(".json", ""))));

let losih = 0;
for (const f of datoteke.sort()) {
  const id = f.replace(".json", "");
  let lekcija;
  try {
    lekcija = JSON.parse(await readFile(join(dir, "lekcije", f), "utf8"));
  } catch (e) {
    console.log(`✗ ${id}: nije ispravan JSON (${e.message})`);
    losih++;
    continue;
  }
  const { greske, upozorenja } = validateLesson(lekcija, {});
  if (greske.length) losih++;
  console.log(`${greske.length ? "✗" : "✓"} ${id}${greske.length ? `: ${greske.length} grešaka` : ""}${upozorenja.length ? ` · ${upozorenja.length} upozorenja` : ""}`);
  for (const g of greske) console.log(`    greška: ${g}`);
  for (const u of upozorenja) console.log(`    upozorenje: ${u}`);
  const izvor = izvori[id] ?? { task_id: Number(id), objective_name: "?" };
  await writeFile(join(labDir, f), JSON.stringify({ izvor, lekcija, model: "claude-opus-5.5 (pretplata)", effort: "high", provjera: { greske, upozorenja } }, null, 1));
}
console.log(`\n${datoteke.length - losih}/${datoteke.length} prolazi`);
process.exitCode = losih ? 1 : 0;
