// Izrada interaktivnih lekcija iz postojećih zadataka (laboratorij, ne produkcija).
// Ulaz: lab-out/source.json (izvezi-izvor.sh). Izlaz: lab-out/lekcije/<objective_id>.json i lab-out/izvjestaj.json,
// koje prikazuje stranica /lab/lekcija u dev načinu.
//
//   OPENROUTER_API_KEY=… node scripts/lab/generiraj-lekcije.mjs [--model anthropic/claude-sonnet-5.5] [--effort medium]
//                                                               [--samo 393,403] [--paralelno 4] [--preskoci-gotove]
//
// Svaki spec prolazi validateLesson; ako ima grešaka, model ga jednom popravlja. Trošak je stvarni usage.cost s OpenRoutera.
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { validateLesson } from "../../src/lib/lesson/validateLesson.js";
import { sustavPrompt, korisnickiPrompt, popravakPrompt } from "../../src/lib/lesson/prompt.js";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split("--")
    .filter(Boolean)
    .map((a) => {
      const [k, ...v] = a.trim().split(/\s+/);
      return [k, v.join(" ") || true];
    }),
);
const MODEL = args.model ?? "anthropic/claude-sonnet-5.5";
const EFFORT = args.effort ?? "medium";
const PARALLEL = Number(args.paralelno ?? 4);
const ONLY = args.samo ? new Set(String(args.samo).split(",").map(Number)) : null;
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("Nedostaje OPENROUTER_API_KEY.");
  process.exit(1);
}

const OUT = new URL("../../lab-out/", import.meta.url);
await mkdir(new URL("lekcije/", OUT), { recursive: true });
const izvori = JSON.parse(await readFile(new URL("source.json", OUT), "utf8")).filter((x) => !ONLY || ONLY.has(x.objective_id));
const system = sustavPrompt();

async function chat(messages, effort = EFFORT) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "X-Title": "MatMat lab" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 32000,
      reasoning: { effort },
      usage: { include: true },
      messages: [{ role: "system", content: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] }, ...messages],
    }),
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
  const u = body.usage ?? {};
  return {
    content: body.choices?.[0]?.message?.content ?? "",
    trosak: { usd: u.cost ?? 0, ulaz: u.prompt_tokens ?? 0, izlaz: u.completion_tokens ?? 0, razmisljanje: u.completion_tokens_details?.reasoning_tokens ?? 0, kes: u.prompt_tokens_details?.cached_tokens ?? 0 },
  };
}

function parseJson(text) {
  const s = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("odgovor nema JSON objekt");
  return JSON.parse(s.slice(a, b + 1));
}

const zbroj = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b?.[k] ?? 0)]));

async function izradi(izvor) {
  const file = new URL(`lekcije/${izvor.objective_id}.json`, OUT);
  if (args["preskoci-gotove"]) {
    try {
      await access(file);
      return null;
    } catch {
      // datoteke još nema: izradi je
    }
  }
  const rezultatiIzvora = safeJson(izvor.results);
  const user = korisnickiPrompt(izvor);
  const t0 = Date.now();
  const prvi = await chat([{ role: "user", content: user }]);
  let trosak = prvi.trosak;
  let lekcija = null;
  let provjera;
  let popravljeno = false;
  try {
    lekcija = parseJson(prvi.content);
    provjera = validateLesson(lekcija, { rezultati: rezultatiIzvora });
  } catch (e) {
    provjera = { greske: [`JSON: ${e.message}`], upozorenja: [] };
  }
  const prvaProvjera = provjera;
  if (provjera.greske.length) {
    popravljeno = true;
    const drugi = await chat(
      [
        { role: "user", content: user },
        { role: "assistant", content: prvi.content },
        { role: "user", content: popravakPrompt(provjera.greske) },
      ],
      "low",
    );
    trosak = zbroj(trosak, drugi.trosak);
    try {
      lekcija = parseJson(drugi.content);
      provjera = validateLesson(lekcija, { rezultati: rezultatiIzvora });
    } catch (e) {
      provjera = { greske: [`JSON nakon popravka: ${e.message}`], upozorenja: [] };
    }
  }
  const zapis = { izvor, lekcija, provjera, prvaProvjera, popravljeno, model: MODEL, effort: EFFORT, trosak, sekundi: Math.round((Date.now() - t0) / 1000), znakova: lekcija ? JSON.stringify(lekcija).length : 0 };
  await writeFile(file, JSON.stringify(zapis, null, 2));
  return zapis;
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const izradeno = [];
let i = 0;
async function radnik() {
  while (i < izvori.length) {
    const izvor = izvori[i++];
    try {
      const z = await izradi(izvor);
      if (!z) continue;
      izradeno.push(z);
      console.log(`${z.provjera.greske.length ? "✗" : "✓"} ${izvor.objective_id} ${izvor.objective_name} · $${z.trosak.usd.toFixed(4)} · ${z.sekundi}s${z.popravljeno ? " · popravljeno" : ""}${z.provjera.greske.length ? ` · ${z.provjera.greske.length} grešaka` : ""}`);
    } catch (e) {
      console.log(`! ${izvor.objective_id} ${izvor.objective_name}: ${e.message}`);
      izradeno.push({ izvor, greska: e.message });
    }
  }
}
await Promise.all(Array.from({ length: PARALLEL }, radnik));
const neuspjelo = izradeno.filter((z) => z.greska).length;

// Izvještaj o svim lekcijama u lab-out/lekcije, ne samo o ovom pokretanju (--preskoci-gotove, --samo).
const rezultati = [];
for (const f of (await readdir(new URL("lekcije/", OUT))).filter((f) => f.endsWith(".json"))) {
  rezultati.push(JSON.parse(await readFile(new URL(`lekcije/${f}`, OUT), "utf8")));
}
const ok = rezultati.filter((z) => z.provjera && !z.provjera.greske.length);
const usd = rezultati.reduce((s, z) => s + (z.trosak?.usd ?? 0), 0);
const izvjestaj = {
  model: MODEL,
  effort: EFFORT,
  lekcija: rezultati.length,
  neuspjeloOvaj: neuspjelo,
  modeli: [...new Set(rezultati.map((z) => `${z.model} (${z.effort})`))],
  prolazi: ok.length,
  prolaziIzPrve: rezultati.filter((z) => z.prvaProvjera && !z.prvaProvjera.greske.length).length,
  ukupnoUsd: usd,
  prosjekUsd: rezultati.length ? usd / rezultati.length : 0,
  medijanUsd: median(rezultati.map((z) => z.trosak?.usd).filter((x) => x != null)),
  prosjekZnakova: ok.length ? Math.round(ok.reduce((s, z) => s + z.znakova, 0) / ok.length) : 0,
  widgeti: count(ok.flatMap((z) => steps(z.lekcija).map((k) => k.tip + (k.nacin ? `:${k.nacin}` : "")))),
};
await writeFile(new URL("izvjestaj.json", OUT), JSON.stringify(izvjestaj, null, 2));
console.log(izvjestaj);

function median(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
}
function steps(l) {
  return (l?.podzadaci ?? []).flatMap((p) => [p.pitanje, ...(p.pomoc ?? []), p.blizanac].filter(Boolean));
}
function count(xs) {
  return Object.fromEntries(Object.entries(xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]));
}
