// Primjeri svih kemijskih widgeta (državna matura) složeni u lekcije, za backend test LessonUiKemijaTest: isti katalog mora
// proći provjeru i u GraalJS-u. Pokreni nakon promjene widgeta, uz paket-za-backend.mjs:
//
//   node scripts/lesson/kemija-primjeri-za-backend.mjs ../matmat-backend/src/test/resources/lesson/kemija-widgeti.json
import { writeFileSync } from "node:fs";
import { KATALOG, uloga, ODGOVOR } from "../../src/lib/lesson/katalog/index.js";
import { validateLesson } from "../../src/lib/lesson/validateLesson.js";
import { KEMIJA } from "../../src/lib/lesson/katalog/kemija/index.js";
const out = {};
const lose = [];
let k = 0;
for (const w of KEMIJA) {
  const svi = [w.primjer, ...(w.primjeri ?? [])];
  // svaki primjer barem jednom: pitanja u podzadacima, ostali u pomoći (1–4 koraka po podzadatku)
  const odg = svi.filter((s) => uloga(s) === ODGOVOR);
  const pogledaj = svi.filter((s) => uloga(s) !== ODGOVOR);
  const pitanja = odg.length
    ? odg
    : [{ tip: "broj", tekst: "Koliko je 2 + 2?", odgovor: 4 }];
  const pomoci = [];
  for (let i = 0; i < pogledaj.length; i += 3)
    pomoci.push(pogledaj.slice(i, i + 3));
  const n = Math.max(pitanja.length, pomoci.length);
  const podzadaci = Array.from({ length: n }, (_, i) => ({
    id: "abc"[i % 3],
    naslov: `${w.tip} ${i + 1}`,
    pitanje: pitanja[i % pitanja.length],
    zasto: "Zato.",
    objasnjenje: "Objašnjenje.",
    pomoc: [{ tip: "pojam", tekst: "Pojam." }, ...(pomoci[i] ?? [])],
    blizanac: {
      tip: "broj",
      tekst: `Koliko je ${i + 10} + 1?`,
      odgovor: i + 11,
    },
  }));
  for (let i = 0; i < podzadaci.length; i += 3) {
    const lekcija = {
      verzija: 1,
      zadatak: { tekst: `Provjera widgeta ${w.tip}.` },
      podzadaci: podzadaci.slice(i, i + 3),
      zapamti: ["Zapamti."],
    };
    const r = validateLesson(lekcija, {});
    if (r.greske.length) lose.push(`${w.tip}: ${r.greske.join(" | ")}`);
    out[`${w.tip}-${i / 3 + 1}`] = lekcija;
    k++;
  }
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
console.log(k, "lekcija; loših:", lose);
