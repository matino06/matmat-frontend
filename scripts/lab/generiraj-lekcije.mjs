// Izrada interaktivnih lekcija iz postojećih zadataka (laboratorij, ne produkcija).
// Ulaz: lab-out/source.json (izvezi-izvor.sh). Izlaz: lab-out/lekcije/<objective_id>.json i lab-out/izvjestaj.json,
// koje prikazuje stranica /lab/lekcija u dev načinu.
//
//   OPENROUTER_API_KEY=… node scripts/lab/generiraj-lekcije.mjs [--model openai/gpt-6.1-sol] [--effort medium]
//       [--popravak anthropic/claude-haiku-5.5] [--samo 393,403] [--paralelno 2] [--preskoci-gotove] [--budzet 3]
//       [--izvor source.json] [--mapa lekcije]
//
// --pruzatelj claude: isti tok, ali modele zove lokalni `claude` CLI (pretplata, bez OpenRoutera i bez troška na
// računu produkcije), zadano Sonnet 5.5 za pisanje i Haiku 5.5 za popravak. Za isprobavanje prompta i provjere prije
// deploya; trošak u izvještaju tada je samo procjena po cjeniku. --izvor i --mapa su datoteka i mapa u lab-out/,
// a stranica /lab/lekcija?mapa=<mapa> prikazuje tu mapu.
//
// Isti modeli i isti tok kao backend (LessonUiStep): lekciju piše model za pisanje, a ako ne prođe validateLesson,
// jeftiniji model je jednom popravlja u jednom pozivu (izvor + lekcija + nalaz provjere). Trošak je stvarni
// usage.cost s OpenRoutera; kad potrošnja ovog pokretanja dosegne --budzet (USD), nove lekcije se ne započinju,
// da na računu (s kojeg radi i produkcija) uvijek ostane kredita.
//
// Izvor s poljem „predlozak“ (lekcija 1. varijacije; varijacije 2–4, izvezi-varijacije.sh) ide kao u backendu: jeftiniji
// model lekciju prenosi s predloška i jednom je popravlja, a tek ako ni tada ne prođe, lekciju piše model za pisanje.
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateLesson } from "../../src/lib/lesson/validateLesson.js";
import { sustavPrompt, korisnickiPrompt, popravakPrompt, predlozakPrompt } from "../../src/lib/lesson/prompt.js";

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
const CLAUDE = args.pruzatelj === "claude";
const MODEL = args.model ?? (CLAUDE ? "claude-sonnet-5-5" : "openai/gpt-6.1-sol");
const EFFORT = args.effort ?? "medium";
const REPAIR_MODEL = args.popravak ?? (CLAUDE ? "claude-haiku-5-5" : "anthropic/claude-haiku-5.5");
const PARALLEL = Number(args.paralelno ?? 2);
const BUDGET = Number(args.budzet ?? 3);
let spent = 0;
const ONLY = args.samo ? new Set(String(args.samo).split(",").map(Number)) : null;
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY && !CLAUDE) {
  console.error("Nedostaje OPENROUTER_API_KEY.");
  process.exit(1);
}

const OUT = new URL("../../lab-out/", import.meta.url);
const MAPA = `${String(args.mapa ?? "lekcije").replace(/[^\w-]/g, "")}/`;
await mkdir(new URL(MAPA, OUT), { recursive: true });
const izvori = JSON.parse(await readFile(new URL(String(args.izvor ?? "source.json"), OUT), "utf8")).filter((x) => !ONLY || ONLY.has(x.objective_id));
const system = sustavPrompt();
const SYSTEM_FILE = join(tmpdir(), `matmat-lekcija-sustav-${process.pid}.txt`);
if (CLAUDE) await writeFile(SYSTEM_FILE, system);

async function chat(messages, opts = {}) {
  return CLAUDE ? chatClaude(messages, opts) : chatOpenRouter(messages, opts);
}

// Jedan poziv `claude -p` bez alata i bez postavki projekta; poruka ide na stdin (izvor zna biti dug).
function chatClaude(messages, { model = MODEL, effort = EFFORT } = {}) {
  const argv = ["-p", "--model", model, "--effort", effort, "--system-prompt-file", SYSTEM_FILE, "--tools", "", "--output-format", "json", "--setting-sources", "", "--no-session-persistence"];
  return new Promise((resolve, reject) => {
    const p = spawn("claude", argv, { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let errOut = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (errOut += d));
    p.on("error", reject);
    p.on("close", (code) => {
      try {
        const body = JSON.parse(out);
        if (code !== 0 || body.is_error) throw new Error(body.result ?? `izlaz ${code}`);
        const m = body.modelUsage?.[model] ?? {};
        const u = body.usage ?? {};
        resolve({
          content: body.result ?? "",
          trosak: { usd: m.costUSD ?? body.total_cost_usd ?? 0, ulaz: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), izlaz: u.output_tokens ?? 0, razmisljanje: u.output_tokens_details?.thinking_tokens ?? 0, kes: u.cache_read_input_tokens ?? 0 },
        });
      } catch (e) {
        reject(new Error(`claude: ${e.message} ${errOut.slice(0, 300)}`));
      }
    });
    p.stdin.end(messages.map((x) => x.content).join("\n\n"));
  });
}

async function chatOpenRouter(messages, { model = MODEL, effort = EFFORT } = {}) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "X-Title": "MatMat lab" },
    body: JSON.stringify({
      model,
      max_tokens: 32000,
      response_format: { type: "json_object" },
      reasoning: { effort },
      usage: { include: true },
      // keš sustavnog prompta: Anthropic ga traži izričito, OpenAI kešira sam
      messages: [{ role: "system", content: model.startsWith("anthropic/") ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] : system }, ...messages],
    }),
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
  const u = body.usage ?? {};
  spent += u.cost ?? 0;
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
  const file = new URL(`${MAPA}${izvor.objective_id}${izvor.variation > 1 ? `-v${izvor.variation}` : ""}.json`, OUT);
  if (args["preskoci-gotove"]) {
    try {
      await access(file);
      return null;
    } catch {
      // datoteke još nema: izradi je
    }
  }
  const user = korisnickiPrompt(izvor);
  const t0 = Date.now();
  let p = null;
  let put = "model za pisanje";
  if (izvor.predlozak) {
    p = await pokusaj(izvor, `${user}\n\n${predlozakPrompt(izvor.predlozak)}`, user, REPAIR_MODEL);
    put = "predložak";
  }
  if (!p || p.provjera.greske.length) {
    const s = await pokusaj(izvor, user, user, MODEL);
    if (p) s.trosak = zbroj(s.trosak, p.trosak);
    p = s;
    put = izvor.predlozak ? "predložak → model za pisanje" : put;
  }
  const { lekcija, provjera, prvaProvjera, popravljeno, trosak } = p;
  const zapis = { izvor, lekcija, provjera, prvaProvjera, popravljeno, put, model: MODEL, effort: EFFORT, modelPopravka: popravljeno ? REPAIR_MODEL : null, trosak, sekundi: Math.round((Date.now() - t0) / 1000), znakova: lekcija ? JSON.stringify(lekcija).length : 0 };
  await writeFile(file, JSON.stringify(zapis, null, 2));
  return zapis;
}

// Lekcija od modela pa, ako ne prođe provjeru, jedan popravak jeftinijim modelom (izvor + lekcija + nalaz provjere).
async function pokusaj(izvor, prompt, user, model) {
  const rezultatiIzvora = safeJson(izvor.results);
  const prvi = await chat([{ role: "user", content: prompt }], { model });
  let trosak = prvi.trosak;
  let lekcija = null;
  let provjera;
  let popravljeno = false;
  try {
    lekcija = parseJson(prvi.content);
    provjera = validateLesson(lekcija, { rezultati: rezultatiIzvora, skica: izvor.sketch });
  } catch (e) {
    provjera = { greske: [`JSON: ${e.message}`], upozorenja: [] };
  }
  const prvaProvjera = provjera;
  if (provjera.greske.length) {
    popravljeno = true;
    const json = lekcija ? JSON.stringify(lekcija) : "(nije JSON)";
    const drugi = await chat([{ role: "user", content: `${user}\n\nTVOJA LEKCIJA (JSON):\n${json}\n\n${popravakPrompt(provjera.greske)}` }], { model: REPAIR_MODEL, effort: "medium" });
    trosak = zbroj(trosak, drugi.trosak);
    try {
      lekcija = parseJson(drugi.content);
      provjera = validateLesson(lekcija, { rezultati: rezultatiIzvora, skica: izvor.sketch });
    } catch (e) {
      provjera = { greske: [`JSON nakon popravka: ${e.message}`], upozorenja: [] };
    }
  }
  return { lekcija, provjera, prvaProvjera, popravljeno, trosak };
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
    if (spent >= BUDGET) {
      console.log(`Budžet $${BUDGET} je potrošen ($${spent.toFixed(3)}); preostale lekcije nisu započete (--preskoci-gotove ih nastavlja).`);
      return;
    }
    const izvor = izvori[i++];
    try {
      const z = await izradi(izvor);
      if (!z) continue;
      izradeno.push(z);
      console.log(`${z.provjera.greske.length ? "✗" : "✓"} ${izvor.objective_id} ${izvor.objective_name} · ${z.put} · $${z.trosak.usd.toFixed(4)} · ${z.sekundi}s${z.popravljeno ? " · popravljeno" : ""}${z.provjera.greske.length ? ` · ${z.provjera.greske.length} grešaka` : ""}`);
    } catch (e) {
      console.log(`! ${izvor.objective_id} ${izvor.objective_name}: ${e.message}`);
      izradeno.push({ izvor, greska: e.message });
    }
  }
}
await Promise.all(Array.from({ length: PARALLEL }, radnik));
const neuspjelo = izradeno.filter((z) => z.greska).length;

// Izvještaj o svim lekcijama u mapi, ne samo o ovom pokretanju (--preskoci-gotove, --samo).
const rezultati = [];
for (const f of (await readdir(new URL(MAPA, OUT))).filter((f) => f.endsWith(".json"))) {
  rezultati.push(JSON.parse(await readFile(new URL(`${MAPA}${f}`, OUT), "utf8")));
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
await writeFile(new URL(MAPA === "lekcije/" ? "izvjestaj.json" : `izvjestaj-${MAPA.slice(0, -1)}.json`, OUT), JSON.stringify(izvjestaj, null, 2));
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
