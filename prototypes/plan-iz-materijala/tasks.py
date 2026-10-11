"""PROTOTIP (baci me): 5 varijacija zadatka s objašnjenjima za ticket #9.

Pokretanje:  MAXW=3 .venv/bin/python tasks.py [write|verify|overfit|katex|report|all]
Koristi plan i stavke iz pipeline.py (out/plan.json, out/stavke.json).
"""

import json, os, re, subprocess, sys
from pathlib import Path

import pipeline as P

SAMPLE = ["B05.01", "B02.02", "B11.01", "B11.02", "B15.01", "B19.05", "B22.03", "B27.02"]
WRITERS = {"haiku": "anthropic/claude-haiku-5.5", "sonnet": "anthropic/claude-sonnet-5.5"}
SONNET_SAMPLE = ["B11.02", "B22.03", "B27.02"]
SOLVERS = {
    "deepseek": ("deepseek/deepseek-v4.1-flash", {"order": ["deepinfra"], "allow_fallbacks": True, "quantizations": ["fp8", "bf16", "fp32"]}),
    "luna": ("openai/gpt-6-luna", None),
}

DESIGN = """KAKO NAPRAVITI ZADATAK KOJI UČI (strogo):
- Zadatak mora NAUČITI gradivo lekcije, a ne naučiti rješavati taj zadatak. Učenik ne zna gradivo
  unaprijed: uči ga iz objašnjenja. Lekcija nema uvodni tekst.
- Podzadaci A–D, tri sloja: (1) prepoznavanje „što je ovo i zašto baš to“, (2) primjena s postupkom,
  (3) ZADNJI podzadatak nikad nije račun: zašto / što ako / granični slučaj / usporedba / lov na
  grešku / predviđanje.
- Ne pitaj dvaput isti postupak s drugim brojevima. Ne otkrivaj formulu u tekstu zadatka.
- Podzadaci zajedno pokrivaju SVE stavke lekcije; svaka stavka se pojavi barem jednom.
- Koristi samo ono što je u stavkama ove lekcije, stavkama preduvjeta i osnovnoškolskoj matematici.
- Konstante (g, e, h, c, mase čestica…) učenik pronalazi u knjižici formula; u objašnjenju napiši
  „vrijednost pronađi u knjižici formula“, ne traži da je pamti.
- Ne prepisuj i ne parafraziraj zadatke s državne mature.

OBJAŠNJENJE (laički, za učenika kojem fizika ne ide):
- Objašnjenje RJEŠAVA OVAJ zadatak, podzadatak po podzadatak (A, pa B, pa C, pa D), s brojevima iz
  zadatka. Ne uči općenito na drugom primjeru. Novi pojam objasni u trenutku kad ga podzadatak treba.
- Koraci kao `## <emoji> Naslov koraka`, između koraka linija `---`, zadnji korak `## ✅ Zaključak`.
- Kratke rečenice; PRAZAN RED između svake rečenice. Svaki novi pojam objasni svakodnevnim jezikom
  prije formule. Uz svaki račun pokaži uvrštavanje s jedinicama.
- LaTeX: inline \\( … \\), display $$ … $$ u JEDNOM retku (bez praznih redova unutar $$), s praznim
  redom prije i poslije;
  isticanje \\textcolor{green}{…} (nikad \\color).

PET VARIJACIJA:
- Svih 5 ima ISTU strukturu podzadataka A–D i uči iste stavke; razlikuju se brojevima i kontekstom
  (drugi svakodnevni primjer), tako da ponavljanje ne bude isti zadatak.
- Brojevi moraju davati fizikalno realne rezultate."""


def lesson_ctx(lid):
    plan, S = P.load("plan.json"), {p["id"]: p for p in P.load("stavke.json")}
    L = {l["id"]: l for l in plan["lekcije"]}
    l = L[lid]
    known = [S[x]["tekst"] for p in l["preduvjeti"] for x in L[p]["stavke"]]
    return l, (f"LEKCIJA: {l['naziv']}\n\nSTAVKE OVE LEKCIJE (to uči):\n"
               + "\n".join(f"- {S[x]['tekst']}" for x in l["stavke"])
               + "\n\nUČENIK VEĆ ZNA (stavke preduvjeta):\n" + ("\n".join(f"- {k}" for k in known) or "—")
               + "\n\nPREDZNANJE: osnovnoškolska matematika\n\n" + P.formula_sheet())


def step_write():
    jobs = [(lid, "haiku") for lid in SAMPLE] + [(lid, "sonnet") for lid in SONNET_SAMPLE]

    def one(job):
        lid, w = job
        l, ctx = lesson_ctx(lid)
        out = P.chat("task-write", WRITERS[w], "Pišeš zadatke za MatMat, aplikaciju za učenje fizike za državnu maturu.\n" + DESIGN +
            '\nVrati JSON {"varijacije":[{"zadatak":"markdown teksta zadatka s podzadacima A) B) C) D)",'
            '"objasnjenje":"markdown objašnjenja po koracima","rezultati":{"A":"konačan odgovor","B":"…",'
            '"C":"…","D":"…"}}]} s točno 5 varijacija. U rezultatima za računske podzadatke napiši broj s '
            'jedinicom, za ostale jednu rečenicu.', ctx, max_tokens=40000)
        return {"lesson": lid, "writer": w, "naziv": l["naziv"], "varijacije": out["varijacije"]}

    res = P.pmap(one, jobs, workers=4)
    P.save("tasks.json", res)
    print(f"Pisanje: {sum(len(r['varijacije']) for r in res)} varijacija za {len(res)} (lekcija, model)")


def solve(name, text):
    model, provider = SOLVERS[name]
    body_extra = {"provider": provider} if provider else {}
    # chat() ne prima provider, pa ga dodajemo kroz sistemsku poruku nije moguće; zovemo izravno
    payload = {"model": model, "max_tokens": 12000, "usage": {"include": True}, "response_format": {"type": "json_object"},
               "messages": [{"role": "system", "content":
                   "Riješi zadatak iz fizike. Konstante uzmi standardne (g = 9,81 m/s² ako nije zadano). Vrati JSON "
                   '{"rezultati":{"A":"konačan odgovor (broj s jedinicom ili jedna rečenica)","B":"…","C":"…","D":"…"}}'},
                   {"role": "user", "content": text}], **body_extra}
    res = P._cached("task-solve", payload, lambda: P._post("https://openrouter.ai/api/v1/chat/completions", payload))
    t = res["choices"][0]["message"]["content"] or "{}"
    m = re.search(r"\{.*\}", t, re.S)
    txt = m.group(0) if m else t
    try:
        try:
            raw = json.loads(txt).get("rezultati", {})
            txt_ok = txt
        except json.JSONDecodeError:  # LaTeX u JSON-u: \cdot, \frac… nisu valjani escapeovi
            raw = json.loads(re.sub(r'\\(?![\\"/bfnrtu])', r"\\\\", txt)).get("rezultati", {})
        if not raw:  # npr. ključ „rezultati={“: uzmi prvi rječnik s podzadacima
            d = json.loads(txt) if txt.strip().startswith("{") else {}
            raw = next((x for x in d.values() if isinstance(x, dict)), d)
        out = {}
        for k, v in raw.items():  # „A)“, „a“, „A1“… → „A“; više stavki istog slova spoji
            kk = re.sub(r"[^A-Da-d]", "", str(k))[:1].upper() or str(k)
            out[kk] = (out[kk] + "; " if kk in out else "") + (json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v)
        return out
    except json.JSONDecodeError:
        return {}


SUP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻", "0123456789-")
PREFIX = {"k": 1e3, "M": 1e6, "G": 1e9, "m": 1e-3, "µ": 1e-6, "μ": 1e-6, "n": 1e-9}
NUM = re.compile(r"(-?\d+(?:\.\d+)?)(?:\s*[·*x×]\s*10\^?\{?(-?\d+)\}?)?\s*([kMGmµμn](?=[A-ZΩa-z]))?")


def numbers(s):
    t = str(s).translate(SUP).replace("−", "-").replace("\\cdot", "·").replace("{,}", ",")
    t = re.sub(r"(\d),(\d)", r"\1.\2", t)
    t = re.sub(r"10\s*(-?\d+)\b", lambda m: m.group(0), t)
    out = []
    for m in NUM.finditer(t):
        v = float(m.group(1)) * (10 ** int(m.group(2)) if m.group(2) else 1)
        out.append(v)
        if m.group(3):  # „kg“, „mol“… nisu prefiksi, pa vrijede obje vrijednosti
            out.append(v * PREFIX[m.group(3)])
    return out


def close(x, y):
    return abs(x - y) <= 0.03 * max(abs(x), abs(y), 1e-30)


def same(a, b):
    na, nb = numbers(a), numbers(b)
    if na and nb:
        # svaki „rezultat“ iz reference (brojevi iza „=“ ili zadnji broj) mora se pojaviti u odgovoru rješavača
        refs = [numbers(x)[-2:] for x in re.split(r"[;]", str(a)) if numbers(x)] or [na[-2:]]
        return all(any(close(r, y) for r in rs for y in nb) for rs in refs), "broj"
    ans = P.decide("task-same", {"odgovor_1": str(a), "odgovor_2": str(b)}, {"isto": {"type": "noul",
        "instructions": "Tvrde li ova dva odgovora na isto pitanje iz fizike istu stvar (isti zaključak)?"}})
    return ans["isto"]["noul"] >= 0.5, "jev"


def step_verify():
    tasks = P.load("tasks.json")
    flat = [(ti, vi, v) for ti, t in enumerate(tasks) for vi, v in enumerate(t["varijacije"])]

    def one(item):
        ti, vi, v = item
        sols = {n: solve(n, v["zadatak"]) for n in SOLVERS}
        checks = {}
        for part, ref in v["rezultati"].items():
            row = {}
            for n, s in sols.items():
                got = s.get(part, "")
                ok, how = same(ref, got) if got else (False, "nema")
                row[n] = {"odgovor": got, "ok": ok, "kako": how}
            checks[part] = row
        return ti, vi, checks

    for ti, vi, checks in P.pmap(one, flat, workers=6):
        v = tasks[ti]["varijacije"][vi]
        v["provjera"] = checks
        v["prihvacena"] = all(all(r["ok"] for r in row.values()) for row in checks.values())
    P.save("tasks.json", tasks)
    acc = sum(v["prihvacena"] for _, _, v in flat)
    print(f"Provjera: {acc}/{len(flat)} varijacija prihvaćeno (oba rješavača se slažu sa svim podzadacima)")


def step_overfit():
    tasks = P.load("tasks.json")
    exams = [f"[{z['rok']} {z['broj']}] {z['sazetak']}" for z in P.load("zadaci.json")]
    tok = lambda s: set(re.findall(r"\w{4,}", s.lower()))
    ex_tok = [tok(e) for e in exams]
    flat = [v for t in tasks for v in t["varijacije"]]

    def one(v):
        tv = tok(v["zadatak"])
        top = sorted(range(len(exams)), key=lambda i: -len(tv & ex_tok[i]) / (len(tv | ex_tok[i]) or 1))[:3]
        qs = {f"q{k}": {"type": "noul", "instructions":
              f"Je li zadatak iz stanja zapravo isti zadatak kao ovaj s državne mature, samo s promijenjenim brojevima "
              f"ili kontekstom: „{exams[i]}“?"} for k, i in enumerate(top)}
        ans = P.decide("task-overfit", {"zadatak": v["zadatak"][:6000]}, qs)
        best = max(range(len(top)), key=lambda k: ans[f"q{k}"]["noul"])
        return {"p": ans[f"q{best}"]["noul"], "ispit": exams[top[best]]}

    for v, r in zip(flat, P.pmap(one, flat, workers=6)):
        v["preblizu"] = r
    P.save("tasks.json", tasks)
    print(f"Pretreniranje: {sum(v['preblizu']['p'] >= 0.5 for v in flat)}/{len(flat)} varijacija preblizu zadatku s ispita")


def step_katex():
    tasks = P.load("tasks.json")
    texts = [v["zadatak"] + "\n\n" + v["objasnjenje"] for t in tasks for v in t["varijacije"]]
    js = r"""
const katex = require(process.argv[1]);
const texts = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const re = /\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;
const out = texts.map(t => { const errs = []; let m;
  while ((m = re.exec(t))) { const src = m[1] || m[2];
    try { katex.renderToString(src, {throwOnError: true, displayMode: !!m[1]}); } catch (e) { errs.push(src.slice(0, 80) + ' :: ' + e.message.slice(0, 80)); } }
  return errs; });
console.log(JSON.stringify(out));
"""
    katex = str(P.HERE.parents[5] / "matmat-frontend/node_modules/katex")
    res = json.loads(subprocess.run(["node", "-e", js, katex], input=json.dumps(texts), capture_output=True, text=True, check=True).stdout)
    k = 0
    for t in tasks:
        for v in t["varijacije"]:
            v["katex_greske"] = res[k]; k += 1
    P.save("tasks.json", tasks)
    n = sum(len(r) for r in res)
    print(f"KaTeX: {n} formula ne renderira, u {sum(1 for r in res if r)}/{len(res)} varijacija")


def step_report():
    tasks = P.load("tasks.json")
    costs = {}
    for line in (P.CACHE / "costs.jsonl").read_text().splitlines():
        r = json.loads(line)
        if r["step"].startswith("task-"):
            key = (r["step"], r.get("model"))
            costs[key] = costs.get(key, 0) + (r["usage"].get("cost") or 0)
    rows = []
    for t in tasks:
        vs = t["varijacije"]
        rows.append(f"| {t['lesson']} {t['naziv'][:40]} | {t['writer']} | {sum(v['prihvacena'] for v in vs)}/{len(vs)} | "
                    f"{sum(v['preblizu']['p'] >= 0.5 for v in vs)} | {sum(len(v['katex_greske']) for v in vs)} |")
    md = ["# Mjerenja: zadaci s objašnjenjima", "", "| Lekcija | Pisac | Prihvaćeno | Preblizu ispitu | KaTeX greške |",
          "|---|---|---|---|---|"] + rows + ["", "## Trošak (USD)", ""] + [
          f"- {s} {m}: {c:.3f}" for (s, m), c in sorted(costs.items())] + [f"- **ukupno: {sum(costs.values()):.2f}**"]
    (P.OUT / "zadaci-mjerenja.md").write_text("\n".join(md))

    # HTML pregled: slijepo A/B za lekcije koje su pisala oba modela
    import random
    random.seed(7)
    blind = {}
    for lid in SONNET_SAMPLE:
        ws = ["haiku", "sonnet"]; random.shuffle(ws)
        blind[lid] = {w: "AB"[i] for i, w in enumerate(ws)}
    (P.OUT / "zadaci-slijepo.json").write_text(json.dumps(blind))
    cards = []
    for t in sorted(tasks, key=lambda t: (t["lesson"], blind.get(t["lesson"], {}).get(t["writer"], ""))):
        label = f"Verzija {blind[t['lesson']][t['writer']]}" if t["lesson"] in blind else t["writer"]
        for i, v in enumerate(t["varijacije"], 1):
            flags = []
            if not v["prihvacena"]: flags.append("❌ rješavači se ne slažu")
            if v["preblizu"]["p"] >= 0.5: flags.append(f"⚠️ preblizu: {v['preblizu']['ispit']}")
            if v["katex_greske"]: flags.append(f"⚠️ KaTeX: {len(v['katex_greske'])}")
            cards.append({"title": f"{t['lesson']} {t['naziv']} — {label} — varijacija {i}",
                          "flags": flags, "task": v["zadatak"], "expl": v["objasnjenje"],
                          "check": v["provjera"], "ref": v["rezultati"]})
    html = r"""<!doctype html><meta charset=utf-8><title>MatMat prototip: zadaci</title>
<link rel=stylesheet href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<style>body{font:16px/1.55 system-ui;max-width:860px;margin:2rem auto;padding:0 1rem;background:#111;color:#ddd}
.card{background:#1c1c22;border-radius:10px;padding:1rem 1.4rem;margin:1.5rem 0}h2{font-size:1.05rem;color:#9ab}
details{margin-top:1rem}summary{cursor:pointer;color:#8af}.flag{color:#fb7}table{font-size:.85rem}td{padding:2px 6px}</style>
<p>PROTOTIP — tekst zadatka, pa objašnjenje (klik). „Verzija A/B“ = isti zadatak napisan s dva modela (slijepo).</p>
<div id=root></div><script>
const md = window.markdownit({html:false});
function render(s) {  // formule zaštiti od markdowna, pa ih vrati kao KaTeX
  const math = [];
  s = s.replace(/\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g, (m, a, b) => {
    math.push(katex.renderToString(a || b, {displayMode: !!a, throwOnError: false})); return `@@M${math.length - 1}@@`; });
  return md.render(s).replace(/@@M(\d+)@@/g, (m, i) => math[i]);
}
const data = __DATA__;
const root = document.getElementById('root');
for (const c of data) {
  const el = document.createElement('div'); el.className='card';
  const rows = Object.entries(c.check).map(([p,r]) => `<tr><td>${p}</td><td>${c.ref[p]}</td>` +
     Object.entries(r).map(([n,x]) => `<td>${x.ok?'✅':'❌'} ${n}: ${x.odgovor}</td>`).join('') + '</tr>').join('');
  el.innerHTML = `<h2>${c.title}</h2>${c.flags.map(f=>`<div class=flag>${f}</div>`).join('')}` + render(c.task) +
    `<details><summary>Objašnjenje</summary>${render(c.expl)}</details>` +
    `<details><summary>Provjera rješavača</summary><table>${rows}</table></details>`;
  root.appendChild(el);
}
</script>"""
    (P.OUT / "zadaci.html").write_text(html.replace("__DATA__", json.dumps(cards, ensure_ascii=False)))
    print((P.OUT / "zadaci-mjerenja.md").read_text())


DESIGN_V2 = r"""KAKO NAPRAVITI ZADATAK KOJI UČI:
- Zadatak uči gradivo lekcije; učenik ga ne zna unaprijed i uči ga iz objašnjenja. Nema uvodnog teksta.
- Jedna realna situacija (boca, auto, opruga…) kroz podzadatke a), b), c), po potrebi d): podzadaci se
  nastavljaju jedan na drugi („Taj plin prebacimo u…“, „Vratimo plin u bocu iz a)“).
- Podzadaci zajedno pokrivaju sve stavke lekcije. Barem jedan traži razumijevanje (koliko puta se nešto
  promijeni, što ako, zašto) i ugrađen je prirodno u situaciju, ne kao „Navedi…“ ili „Opiši…“.
- Ne otkrivaj formulu u tekstu zadatka. Ne prepisuj zadatke s mature.
- Uzmi g = 10 m/s² i lijepe brojeve s kojima se lako računa; rezultati fizikalno realni.
- Koristi samo stavke ove lekcije, stavke preduvjeta i osnovnoškolsku matematiku.

KAKO OBJAŠNJAVATI (ovako piše autor MatMata):
- Jedan korak po podzadatku: `## <emoji> Kratak naslov`, pa odmah **podebljano ponovljeno pitanje
  podzadatka**, pa jednom rečenicom što je zadano.
- Novi pojam uvedi tek kad ga podzadatak treba: prvo što on JEST svakodnevnim jezikom, s usporedbom iz
  života („Mol je samo brojevna jedinica, kao što je tucet“; „potencijalna energija je rad koji ostane
  pohranjen u podignutoj knjizi“), i zašto se tako zove. Tek onda formula.
- Formulu ne izmišljaj iz zraka: reci gdje je — „u **knjižici formula, str. N**, poglavlje *X*“ — i prepiši
  je kao display formulu. Konstante isto tako („R ne treba pamtiti, nalazi se u knjižici, str. 5“). Ako
  formule nema u knjižici, izvedi je u par redaka iz one koja jest i reci „Nema je u knjižici, ali se iz nje
  izvede u dva reda“.
- Preuređivanje formule pokaži korak po korak s operacijom desno:
  $$\begin{aligned} pV &= nRT && / : V \\ p &= \frac{nRT}{V} \end{aligned}$$
- Pretvorbe jedinica napiši izričito prije uvrštavanja; uvrštavanje pokaži s brojevima; konačan rezultat
  \textcolor{green}{…}.
- Piši u odlomcima od 2–4 povezane rečenice, prirodnim tonom („Primijeti…“, „Sad tlak.“, „Ključna riječ u
  zadatku je **jednoliko**.“). Ne piši telegrafski, jednu po jednu kratku rečenicu.
- Zamku najavi izričito („Prvo jedna zamka.“, „Zamka je…“) i objasni zašto je zamka.
- Nakon rezultata jednom ili dvjema rečenicama poveži ga s intuicijom ili provjeri drugim putem
  („brzina 3×, energija 9×, zato dvostruko brži auto koči četiri puta dulje“; „da smo visinu mjerili od
  stola, razlika bi bila ista“).
- Pojmove i ključne riječi podebljaj. Decimalni zarez u LaTeX-u: 0{,}8. Jedinice: 20 \ \text{m/s}.
- LaTeX: inline \( … \), display $$ … $$ u jednom retku (osim aligned), prazan red prije i poslije.
- Zadnji korak `## ✅ Rezultati`: po jedan redak za svaki podzadatak s rezultatom."""


def formula_sheet_pages():
    pages = P.load("pages.json")
    return "MATERIJAL DOSTUPAN NA ISPITU (knjižica formula), po stranicama:\n\n" + "\n\n".join(
        f"[knjižica formula, str. {p['page']}]\n{p['text']}" for p in pages if p["file"] == "FIZ-T-D.pdf")


def step_write_v2(lessons=("B05.01", "B11.01", "B22.03"), n=2):
    """Lijeno generiranje: varijacija k dobiva prethodne kao kontekst."""
    res = []
    for lid in lessons:
        l, ctx = lesson_ctx(lid)
        ctx = ctx.replace(P.formula_sheet(), formula_sheet_pages())
        prev = []
        for k in range(1, n + 1):
            extra = ("" if not prev else "\n\nVEĆ POSTOJEĆE VARIJACIJE (napravi NOVU: druga situacija i brojevi, iste "
                     "stavke; ne ponavljaj iste podzadatke):\n" + "\n---\n".join(prev))
            v = P.chat("task-write-v2", WRITERS["haiku"], "Pišeš zadatak za MatMat, aplikaciju za učenje fizike za državnu maturu.\n"
                + DESIGN_V2 + '\nVrati JSON {"zadatak":"markdown teksta zadatka","objasnjenje":"markdown objašnjenja",'
                '"rezultati":{"a":"konačan odgovor","b":"…"}}. U rezultatima za računske podzadatke broj s jedinicom, '
                'za ostale jedna rečenica.', ctx + extra, max_tokens=12000)
            prev.append(v["zadatak"])
            res.append({"lesson": lid, "naziv": l["naziv"], "k": k, **v})
    P.save("tasks_v2.json", res)
    cards = [{"title": f"{r['lesson']} {r['naziv']} — varijacija {r['k']}", "flags": [], "task": r["zadatak"],
              "expl": r["objasnjenje"], "check": {}, "ref": r["rezultati"]} for r in res]
    html = (P.OUT / "zadaci.html").read_text()
    start = html.index("const data = ") + len("const data = ")
    end = html.index(";\nconst root")
    (P.OUT / "zadaci-v2.html").write_text(html[:start] + json.dumps(cards, ensure_ascii=False) + html[end:])
    print(f"v2: {len(res)} varijacija")


KATEX_JS = r"""
const katex = require(process.argv[1]);
const texts = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const re = /\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;
console.log(JSON.stringify(texts.map(t => { const errs = []; let m;
  while ((m = re.exec(t))) { const src = m[1] || m[2];
    try { katex.renderToString(src, {throwOnError: true, displayMode: !!m[1]}); } catch (e) { errs.push(src.slice(0, 80) + ' :: ' + e.message.slice(0, 80)); } }
  return errs; })));
"""


def katex_errors(texts):
    katex = str(P.HERE.parents[5] / "matmat-frontend/node_modules/katex")
    out = subprocess.run(["node", "-e", KATEX_JS, katex], input=json.dumps(texts), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


REVIEW_Q = {
    "premisa": {"type": "noul", "instructions": "Je li situacija opisana u zadatku fizikalno moguća i bez kontradikcija (podaci se ne proturječe, npr. isti uređaj na istom naponu ne može imati drugu struju)?"},
    "jednoznacno": {"type": "noul", "instructions": "Ima li SVAKI podzadatak jedan jasan točan odgovor na razini srednje škole (nema pitanja na mišljenje ni dvosmislenih tvrdnji)?"},
    "cinjenice": {"type": "noul", "instructions": "Jesu li sve činjenice u tekstu zadatka točne (boje i valne duljine svjetlosti, svojstva tvari, realne vrijednosti, smislene rečenice)?"},
}
REVIEW_TH = 0.8
FALLBACK = "anthropic/claude-haiku-5.5"  # isti model, ali reasoning effort xhigh (Haiku po defaultu radi s medium)


def write_one(lid, model, step, effort=None):
    try:
        return _write_one(lid, model, step, effort)
    except Exception as e:  # jedna pokvarena lekcija ne smije srušiti cijeli test
        return {"lesson": lid, "naziv": "", "model": model, "greska": str(e)[:300], "zadatak": "", "objasnjenje": "", "rezultati": {}}


def _write_one(lid, model, step, effort=None):
    l, ctx = lesson_ctx(lid)
    ctx = ctx.replace(P.formula_sheet(), formula_sheet_pages())
    v = P.chat(step, model, "Pišeš zadatak za MatMat, aplikaciju za učenje fizike za državnu maturu.\n"
        + DESIGN_V2 + '\nVrati JSON {"zadatak":"markdown teksta zadatka","objasnjenje":"markdown objašnjenja",'
        '"rezultati":{"a":"konačan odgovor","b":"…"}}. U rezultatima za računske podzadatke broj s jedinicom, '
        'za ostale jedna rečenica.', ctx, max_tokens=64000 if effort else 24000,
        reasoning=effort)
    return {"lesson": lid, "naziv": l["naziv"], "model": model, **v}


def check_one(v):
    if v.get("greska"):
        return {"katex": [], "recenzija": {k: 0 for k in REVIEW_Q}, "prosao": False, "greska": v["greska"]}
    errs = katex_errors([v["zadatak"] + "\n\n" + v["objasnjenje"]])[0]
    a = P.decide("task-review", {"zadatak": v["zadatak"][:8000], "rezultati": v.get("rezultati", {})}, REVIEW_Q)
    scores = {k: round(a[k]["noul"], 2) for k in REVIEW_Q}
    return {"katex": errs, "recenzija": scores, "prosao": not errs and min(scores.values()) >= REVIEW_TH}


def step_test50():
    plan = P.load("plan.json")["lekcije"]
    lids = [plan[round(i * (len(plan) - 1) / 49)]["id"] for i in range(50)]

    def one(lid):
        h = write_one(lid, WRITERS["haiku"], "t50-haiku")
        h["provjera"] = check_one(h)
        out = {"lesson": lid, "naziv": h["naziv"], "haiku": h}
        if not h["provjera"]["prosao"]:
            m = write_one(lid, FALLBACK, "t50-xhigh", effort="xhigh")
            m["provjera"] = check_one(m)
            out["xhigh"] = m
        return out

    res = P.pmap(one, lids, workers=4)
    P.save("test50.json", res)
    costs = {}
    for line in (P.CACHE / "costs.jsonl").read_text().splitlines():
        r = json.loads(line)
        if r["step"].startswith("t50-") or r["step"] == "task-review":
            costs[r["step"]] = costs.get(r["step"], 0) + (r["usage"].get("cost") or 0)
    fb = [r for r in res if "xhigh" in r]
    print(f"Haiku (medium) prošao: {50 - len(fb)}/50; Haiku xhigh pisao {len(fb)}, od toga prošao {sum(r['xhigh']['provjera']['prosao'] for r in fb)}")
    print("KaTeX greške kod Haikua:", sum(bool(r['haiku']['provjera']['katex']) for r in res))
    print("Trošak:", {k: round(v, 3) for k, v in costs.items()})
    cards = []
    for r in res:
        for key in ("haiku", "xhigh"):
            if key not in r: continue
            v = r[key]; pv = v["provjera"]
            flags = [("✅ prošao" if pv["prosao"] else "❌ nije prošao") + f" · recenzija {pv['recenzija']}"]
            if pv["katex"]: flags.append(f"KaTeX: {pv['katex'][0]}")
            cards.append({"title": f"{r['lesson']} {r['naziv']} — {key}", "flags": flags, "task": v["zadatak"],
                          "expl": v["objasnjenje"], "check": {}, "ref": v.get("rezultati", {})})
    html = (P.OUT / "zadaci.html").read_text()
    a, b = html.index("const data = ") + len("const data = "), html.index(";\nconst root")
    (P.OUT / "test50.html").write_text(html[:a] + json.dumps(cards, ensure_ascii=False) + html[b:])


STEPS = ["write", "verify", "overfit", "katex", "report", "write_v2", "test50"]

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    for s in (STEPS if arg == "all" else STEPS[STEPS.index(arg[:-1]):] if arg.endswith("+") else [arg]):
        globals()[f"step_{s}"]()
