// Ručno pisane interaktivne lekcije za Matematiku A: provjera validatorom i priprema za lab.
//
//   node scripts/lab/matura-provjeri.mjs [task_id …]
//
// Čita lab-out/matura/izvor-sve.json (izvorni zadaci iz baze, samo čitanje) i lab-out/matura/lekcije/<task_id>.json
// (lekcija), ispisuje greške i upozorenja i zapisuje lab-out/matura-lab/<task_id>.json za /lab/lekcija?mapa=matura-lab.
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { validateLesson } from "../../src/lib/lesson/validateLesson.js";
import { tocanOdgovor } from "../../src/lib/lesson/katalog/index.js";

const dir = join(process.cwd(), "lab-out/matura");
const izvori = Object.fromEntries(JSON.parse(await readFile(join(dir, "izvor-sve.json"), "utf8")).map((z) => [String(z.task_id), z]));
const trazeni = process.argv.slice(2);
const datoteke = (await readdir(join(dir, "lekcije"))).filter((f) => f.endsWith(".json") && (!trazeni.length || trazeni.includes(f.replace(".json", ""))));
await mkdir(join(process.cwd(), "lab-out/matura-lab"), { recursive: true });

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
  // konačni odgovor cijelog zadatka obično je i odgovor zadnjeg koraka: razlika je za pregled, ne greška
  if (lekcija.cijeli?.pitanje && Array.isArray(lekcija.podzadaci)) {
    const cijeli = odgovorZaUsporedbu(lekcija.cijeli.pitanje);
    const zadnji = odgovorZaUsporedbu(lekcija.podzadaci.at(-1)?.pitanje);
    if (cijeli && zadnji && cijeli !== zadnji) upozorenja.push(`pregled: konačni odgovor (${cijeli}) nije isti kao u zadnjem koraku (${zadnji})`);
  }
  if (greske.length) losih++;
  console.log(`${greske.length ? "✗" : "✓"} ${id}${greske.length ? `: ${greske.length} grešaka` : ""}${upozorenja.length ? ` · ${upozorenja.length} upozorenja` : ""}`);
  for (const g of greske) console.log(`    greška: ${g}`);
  for (const u of upozorenja) console.log(`    upozorenje: ${u}`);
  const izvor = izvori[id] ?? { task_id: Number(id), objective_name: "?" };
  await writeFile(join(process.cwd(), "lab-out/matura-lab", f), JSON.stringify({ izvor, lekcija, model: "claude-opus-5.5 (pretplata)", effort: "high", provjera: { greske, upozorenja } }, null, 1));
}
console.log(`\n${datoteke.length - losih}/${datoteke.length} prolazi`);
process.exitCode = losih ? 1 : 0;

function odgovorZaUsporedbu(spec) {
  try {
    return String(tocanOdgovor(spec) ?? "").replace(/\s+/g, "").replace(/\$/g, "");
  } catch {
    return "";
  }
}
