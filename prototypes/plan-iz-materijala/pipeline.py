"""PROTOTIP (baci me): izrada plana iz materijala za ticket #8.

Pokretanje:  .venv/bin/python pipeline.py <korak|all>
Koraci: ocr, classify, scope, draft, merge, coverage, assumptions, compare, report
Svaki poziv modela sprema se u cache/, pa ponovno pokretanje ne plaća ništa dvaput.
"""

import base64, hashlib, json, os, re, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pymupdf

HERE = Path(__file__).parent
CACHE = HERE / "cache"
OUT = HERE / "out"
MATERIALS = Path("/Users/matino/Documents/Coworker/test-new-feature")
MANUAL_PLAN = Path("/Users/matino/Documents/Coworker/Fizika/Plan - Fizika 3")
BACKEND_PROPS = HERE.parents[5] / "matmat-backend/src/main/resources/application-local.properties"

M_OCR = "google/gemini-2.5-flash-lite"
M_PLAN = "anthropic/claude-sonnet-5.5"
M_CHEAP = "anthropic/claude-haiku-5.5"
M_DECIDE = "typesafe/jev-1.13"


def api_key():
    if os.environ.get("OPENROUTER_API_KEY"):
        return os.environ["OPENROUTER_API_KEY"]
    for line in BACKEND_PROPS.read_text().splitlines():
        if line.startswith("openrouter.api-key="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("Nema OpenRouter ključa")


def _post(url, body):
    req = urllib.request.Request(url, json.dumps(body).encode(), {
        "Authorization": f"Bearer {api_key()}", "Content-Type": "application/json",
        "X-Title": "MatMat prototip plana"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:500]
            if e.code in (429, 500, 502, 503, 524, 529) and attempt < 5:
                time.sleep(2 ** attempt * 3); continue
            raise RuntimeError(f"{e.code} {msg}")
        except (urllib.error.URLError, TimeoutError):
            if attempt < 5:
                time.sleep(2 ** attempt * 3); continue
            raise


def _cached(step, payload, fn):
    key = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:20]
    f = CACHE / step / f"{key}.json"
    if f.exists():
        return json.loads(f.read_text())
    res = fn()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(res, ensure_ascii=False))
    with open(CACHE / "costs.jsonl", "a") as c:
        c.write(json.dumps({"step": step, "model": payload.get("model"),
                            "usage": res.get("usage", {})}) + "\n")
    return res


def chat(step, model, system, user, json_out=True, max_tokens=16000, reasoning=None):
    content = user if isinstance(user, list) else [{"type": "text", "text": user}]
    body = {"model": model, "max_tokens": max_tokens, "usage": {"include": True},
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": content}]}
    if json_out:
        body["response_format"] = {"type": "json_object"}
    if reasoning:
        body["reasoning"] = {"effort": reasoning}
    res = _cached(step, body, lambda: _post("https://openrouter.ai/api/v1/chat/completions", body))
    text = res["choices"][0]["message"]["content"] or ""
    if not json_out:
        return text
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text)


def decide(step, state, questions):
    body = {"model": M_DECIDE, "state": state, "questions": questions}
    return _cached(step, body, lambda: _post("https://openrouter.ai/api/alpha/decisions", body))["answers"]


def pmap(fn, items, workers=8):
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(fn, items))


def save(name, data):
    OUT.mkdir(exist_ok=True)
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=1))


def load(name):
    return json.loads((OUT / name).read_text())


# ---------------------------------------------------------------- 1. OCR

OCR_SYS = """Prepiši stranicu ispita/kataloga iz fizike točno kako piše, na hrvatskom.
Formule piši u LaTeX-u (\\( \\) inline, $$ $$ display). Tablice kao Markdown.
Za svaku sliku/graf/shemu napiši [SLIKA: kratak opis što prikazuje, s brojevima i oznakama].
Vrati samo Markdown, bez komentara."""


def step_ocr():
    pages = []
    for f in sorted(MATERIALS.rglob("*.pdf")):
        doc = pymupdf.open(f)
        for i, p in enumerate(doc):
            pages.append((str(f.relative_to(MATERIALS)), i, p))

    def one(args):
        rel, i, page = args
        png = page.get_pixmap(dpi=130).tobytes("png")
        b64 = base64.b64encode(png).decode()
        text = chat("ocr", M_OCR, OCR_SYS, [
            {"type": "text", "text": f"Tekstualni sloj PDF-a (pomoć za slova):\n{page.get_text()[:4000]}"},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}],
            json_out=False, max_tokens=6000)
        return {"file": rel, "page": i + 1, "text": text}

    res = pmap(one, pages, workers=12)
    save("pages.json", res)
    print(f"OCR: {len(res)} stranica")


# ---------------------------------------------------------------- 2. razvrstavanje (Jev)

KINDS = {
    "kurikulum": "Ispitni katalog ili kurikulum: popis ishoda, tema, sadržaja koje treba znati, struktura ispita.",
    "ispit": "Zadaci ispita za rješavanje (pitanja, ponuđeni odgovori), bez rješenja.",
    "rjesenja": "Ključ odgovora, rješenja ili bodovni kriteriji za zadatke.",
    "formule": "Knjižica formula, tablica konstanti i fizikalnih veličina.",
    "sum": "Naslovnica, upute za rješavanje, prazna stranica, list za upisivanje odgovora.",
}


def truth(rel):
    n = rel.lower()
    if "katalog" in n: return "kurikulum"
    if "kljuc" in n or "kljuź" in n: return "rjesenja"
    if "t d" in n or "t-d" in n: return "formule"
    if "list" in n or "koncept" in n: return "sum"
    return "ispit"


def step_classify():
    pages = load("pages.json")

    def one(p):
        a = decide("classify", {"stranica": p["text"][:20000]}, {"vrsta": {
            "type": "choice", "instructions": "Kojoj vrsti materijala pripada ova stranica?",
            "criteria": KINDS}})["vrsta"]
        return {**p, "kind": a["choice"], "conf": a.get("confidence"), "truth": truth(p["file"])}

    res = pmap(one, pages, workers=8)
    save("pages.json", res)
    ok = sum(r["kind"] == r["truth"] for r in res)
    print(f"Jev razvrstavanje: {ok}/{len(res)} se slaže s nazivom datoteke (gruba istina)")


# ---------------------------------------------------------------- 3. opseg: katalog + zadaci s ispita

def doc_text(pages, pred):
    by = {}
    for p in pages:
        if pred(p):
            by.setdefault(p["file"], []).append(p)
    return {f: "\n\n".join(x["text"] for x in sorted(ps, key=lambda x: x["page"])) for f, ps in by.items()}


def step_scope():
    pages = load("pages.json")
    # Za opseg koristimo stvarnu vrstu (iz razvrstavanja), ne naziv datoteke.
    cat = "\n\n".join(doc_text(pages, lambda p: p["kind"] == "kurikulum").values())
    ishodi = chat("scope-catalog", M_PLAN,
        "Iz ispitnog kataloga izvuci sve ishode s razradom. Vrati JSON "
        '{"ishodi":[{"oznaka":"…","naslov":"…","razrada":["…"]}]}. '
        "Razrada mora biti doslovno uža od naslova, kako piše u katalogu. Ne izmišljaj.",
        cat, max_tokens=24000)["ishodi"]
    save("ishodi.json", ishodi)

    rokovi = {}
    for p in pages:
        if p["kind"] in ("ispit", "rjesenja"):
            rokovi.setdefault(p["file"].split("/")[0], []).append(p)

    def one(item):
        rok, ps = item
        txt = "\n\n".join(f"### {p['file']} str. {p['page']} ({p['kind']})\n{p['text']}"
                          for p in sorted(ps, key=lambda x: (x["file"], x["page"])))
        out = chat("scope-exam", M_CHEAP,
            "Iz ispita državne mature iz fizike (zadaci + ključ) izvuci SVAKI zadatak. Vrati JSON "
            '{"zadaci":[{"broj":"…","sazetak":"jedna rečenica što se traži","odgovor":"iz ključa ako postoji",'
            '"potrebno_znanje":["koncepti/zakoni koje učenik mora razumjeti, kratko"]}]}',
            txt, max_tokens=24000)["zadaci"]
        return [{"rok": rok, **z} for z in out]

    zadaci = [z for zs in pmap(one, sorted(rokovi.items()), workers=6) for z in zs]
    save("zadaci.json", zadaci)
    print(f"Opseg: {len(ishodi)} ishoda, {len(zadaci)} zadataka s {len(rokovi)} rokova")


# ---------------------------------------------------------------- 4. nacrt plana

RULES = """PRAVILA PLANA (strogo):
1. Lekcija = točno JEDAN novi koncept: ideja koju učenik ne može izvesti iz ranijih lekcija i predznanja.
2. Novi tip zadatka, novi kontekst (npr. ista formula na srcu umjesto na satu), obrat formule
   (računanje druge veličine iz iste formule), ili posebni slučaj NISU razlog za novu lekciju.
3. Alat (jedinice, vektori, preuređivanje formule, čitanje grafa) nema svoju lekciju; uči se u
   lekciji u kojoj prvi put zatreba.
4. Test spajanja: ako učenik koji ne zna A sigurno ne zna ni B, i obratno, A i B su JEDNA lekcija.
5. Pravilo nulte pretpostavke: lekcija koristi samo koncepte iz svojih preduvjeta (tranzitivno)
   ili iz popisa pretpostavljenog predznanja.
6. Pokrij SVE što se traži u katalogu (razrada) i na ispitima. Ništa izvan toga.
7. Cilj je NAJMANJI broj lekcija koji to postiže. LLM-ovi sustavno rade previše lekcija;
   prije odgovora prođi popis i spoji sve što pada na testu 4."""


def step_draft():
    ishodi, zadaci = load("ishodi.json"), load("zadaci.json")
    zad = "\n".join(f"- [{z['rok']} {z['broj']}] {z['sazetak']} | treba: {', '.join(z.get('potrebno_znanje', []))}"
                    for z in zadaci)
    plan = chat("draft", M_PLAN,
        "Ti si iskusan nastavnik fizike koji radi plan učenja za državnu maturu.\n" + RULES +
        '\nVrati JSON {"predznanje":["…"],"blokovi":[{"id":"M","naziv":"…"}],'
        '"lekcije":[{"id":"M01","blok":"M","naziv":"…","koncept":"jedna rečenica: nova ideja",'
        '"zasto_nova":"što se ne može izvesti iz preduvjeta","preduvjeti":["M00"],"ishodi":["oznaka"]}]}. '
        "Lekcije poredaj tako da preduvjeti uvijek dolaze prije.",
        f"KATALOG (ishodi s razradom):\n{json.dumps(ishodi, ensure_ascii=False)}\n\n"
        f"ZADACI SA ŠEST ROKOVA:\n{zad}", max_tokens=48000, reasoning="high")
    save("plan_draft.json", plan)
    print(f"Nacrt: {len(plan['lekcije'])} lekcija, {len(plan['predznanje'])} stavki predznanja")


# ---------------------------------------------------------------- 5. spajanje (Jev + LLM)

def step_merge():
    plan = load("plan_draft.json")
    L = {l["id"]: l for l in plan["lekcije"]}
    pairs = set()
    order = [l["id"] for l in plan["lekcije"]]
    for i, lid in enumerate(order):
        for p in L[lid]["preduvjeti"]:
            if p in L: pairs.add((p, lid))
        if i and L[order[i - 1]]["blok"] == L[lid]["blok"]:
            pairs.add((order[i - 1], lid))

    def desc(l):
        return f"{l['naziv']}: {l['koncept']}"

    def one(pair):
        a, b = L[pair[0]], L[pair[1]]
        ans = decide("merge-jev", {"lekcija_A": desc(a), "lekcija_B": desc(b),
                                   "preduvjeti_od_B": [desc(L[p]) for p in b["preduvjeti"] if p in L]},
            {"nova_ideja": {"type": "noul", "instructions":
                "Uvodi li lekcija B novu fizikalnu ideju koju učenik NE može izvesti iz lekcije A i "
                "preduvjeta od B? (Novi kontekst, obrat formule ili posebni slučaj NE računaju se kao nova ideja.)"}})
        return {"A": pair[0], "B": pair[1], "p_nova": ans["nova_ideja"]["noul"]}

    jev = pmap(one, sorted(pairs), workers=8)
    save("merge_jev.json", jev)
    flagged = [j for j in jev if j["p_nova"] < 0.5]

    critic = chat("merge-llm", M_PLAN,
        "Pregledavaš nacrt plana učenja i SPAJAŠ lekcije koje nisu zaseban koncept.\n" + RULES +
        "\nModel odluke je označio parove kod kojih B vjerojatno NE uvodi novu ideju (p_nova<0.5); "
        "to je samo pomoć, odluči sam za svaki par, a provjeri i ostale lekcije.\n"
        'Vrati JSON {"spajanja":[{"zadrzi":"id","spoji":["id"],"novi_naziv":"…","novi_koncept":"…","razlog":"…"}],'
        '"brisanja":[{"id":"…","razlog":"…"}]}',
        f"NACRT:\n{json.dumps(plan, ensure_ascii=False)}\n\nOZNAČENI PAROVI:\n{json.dumps(flagged, ensure_ascii=False)}",
        max_tokens=24000, reasoning="high")
    save("merge_llm.json", critic)

    # primijeni spajanja
    alias = {}
    for s in critic.get("spajanja", []):
        k = s["zadrzi"]
        if k not in L: continue
        L[k]["naziv"] = s.get("novi_naziv") or L[k]["naziv"]
        L[k]["koncept"] = s.get("novi_koncept") or L[k]["koncept"]
        L[k]["spojeno_iz"] = L[k].get("spojeno_iz", []) + s["spoji"]
        for x in s["spoji"]:
            if x in L and x != k:
                L[k]["ishodi"] = sorted(set(L[k]["ishodi"]) | set(L[x]["ishodi"]))
                alias[x] = k
    for d in critic.get("brisanja", []):
        alias[d["id"]] = None
    final = []
    for l in plan["lekcije"]:
        if l["id"] in alias: continue
        pre = []
        for p in l["preduvjeti"]:
            while p in alias and alias[p]: p = alias[p]
            if p and p != l["id"] and p not in pre and (p not in alias): pre.append(p)
        final.append({**l, "preduvjeti": pre})
    plan = {**plan, "lekcije": final}
    save("plan.json", plan)

    jev_says_merge = {(j["A"], j["B"]) for j in flagged}
    llm_merged = {(s["zadrzi"], x) for s in critic.get("spajanja", []) for x in s["spoji"]}
    llm_merged |= {(b, a) for a, b in llm_merged}
    agree = len(jev_says_merge & llm_merged)
    print(f"Spajanje: {len(plan['lekcije'])} lekcija nakon spajanja (prije {len(order)}). "
          f"Jev označio {len(flagged)}/{len(jev)} parova, LLM spojio {len(critic.get('spajanja', []))} grupa, "
          f"preklapanje {agree}")


# ---------------------------------------------------------------- 6. pokrivenost ispita

def step_coverage():
    plan, zadaci = load("plan.json"), load("zadaci.json")
    lek = "\n".join(f"{l['id']} {l['naziv']}: {l['koncept']}" for l in plan["lekcije"])
    batches = [zadaci[i:i + 25] for i in range(0, len(zadaci), 25)]

    def one(batch):
        z = "\n".join(f"{i}. [{x['rok']} {x['broj']}] {x['sazetak']} (odgovor: {x.get('odgovor', '')})"
                      for i, x in enumerate(batch))
        return chat("coverage", M_CHEAP,
            "Za svaki zadatak s ispita navedi koje lekcije plana učenik mora proći da ga riješi, "
            "i je li za njega potrebno nešto što NIJE ni u jednoj lekciji ni u predznanju. Vrati JSON "
            '{"zadaci":[{"i":0,"lekcije":["id"],"nedostaje":"" }]}  (nedostaje prazno ako ništa)',
            f"PREDZNANJE: {plan['predznanje']}\n\nLEKCIJE:\n{lek}\n\nZADACI:\n{z}", max_tokens=8000)["zadaci"]

    res = []
    for batch, out in zip(batches, pmap(one, batches, workers=6)):
        by = {o["i"]: o for o in out}
        for i, x in enumerate(batch):
            o = by.get(i, {"lekcije": [], "nedostaje": "model nije odgovorio"})
            res.append({**x, "lekcije": o["lekcije"], "nedostaje": o.get("nedostaje", "")})
    save("coverage.json", res)
    uncovered = [r for r in res if r["nedostaje"]]
    used = {l for r in res for l in r["lekcije"]}
    unused = [l["id"] for l in plan["lekcije"] if l["id"] not in used]
    print(f"Pokrivenost: {len(res) - len(uncovered)}/{len(res)} zadataka pokriveno; "
          f"{len(unused)} lekcija ne treba nijedan zadatak s ispita")


# ---------------------------------------------------------------- 7. nulta pretpostavka

def step_assumptions():
    plan = load("plan.json")
    L = {l["id"]: l for l in plan["lekcije"]}

    def closure(lid, seen=None):
        seen = seen if seen is not None else set()
        for p in L[lid]["preduvjeti"]:
            if p in L and p not in seen:
                seen.add(p); closure(p, seen)
        return seen

    def one(l):
        pre = [f"{L[p]['naziv']}: {L[p]['koncept']}" for p in sorted(closure(l["id"]))]
        return {"id": l["id"], **chat("assume", M_CHEAP,
            "Provjeri pravilo nulte pretpostavke: smije li se ova lekcija naučiti samo uz navedene "
            "ranije lekcije i predznanje? Vrati JSON "
            '{"ok":true,"nedostaje":["koncept koji lekcija koristi, a nije ni u preduvjetima ni u predznanju"]}',
            f"LEKCIJA: {l['naziv']}: {l['koncept']}\n\nRANIJE LEKCIJE (preduvjeti, tranzitivno):\n"
            + "\n".join(pre) + f"\n\nPREDZNANJE: {plan['predznanje']}", max_tokens=2000)}

    res = pmap(one, plan["lekcije"], workers=8)
    save("assumptions.json", res)
    print(f"Nulta pretpostavka: {sum(1 for r in res if not r.get('ok'))} lekcija s problemom")


# ---------------------------------------------------------------- 8. usporedba s ručnim planom

def manual_plan():
    out = []
    for f in sorted(MANUAL_PLAN.glob("*.md")):
        if f.name.startswith("_"): continue
        t = f.read_text()
        learn = re.search(r"## Što ćeš naučiti\n(.*?)\n## ", t, re.S)
        out.append({"id": f.stem.split(" - ")[0], "naziv": f.stem.split(" - ", 1)[-1],
                    "uci": (learn.group(1).strip() if learn else "")[:600]})
    return out


def step_compare():
    plan, manual = load("plan.json"), manual_plan()
    lek = "\n".join(f"{l['id']} {l['naziv']}: {l['koncept']}" for l in plan["lekcije"])
    batches = [manual[i:i + 20] for i in range(0, len(manual), 20)]

    def one(batch):
        m = "\n".join(f"{x['id']} {x['naziv']} — uči: {x['uci']}" for x in batch)
        return chat("compare", M_PLAN,
            "Za svaku lekciju RUČNOG plana navedi koje lekcije GENERIRANOG plana pokrivaju njezino gradivo. "
            "Vrati JSON {\"lekcije\":[{\"rucna\":\"id\",\"generirane\":[\"id\"],\"pokriveno\":\"cijelo|djelomicno|nista\","
            "\"napomena\":\"što fali ili zašto je spojeno\"}]}",
            f"GENERIRANI PLAN:\n{lek}\n\nRUČNE LEKCIJE:\n{m}", max_tokens=12000)["lekcije"]

    res = [x for out in pmap(one, batches, workers=5) for x in out]
    save("compare.json", res)
    c = {k: sum(1 for r in res if r["pokriveno"] == k) for k in ("cijelo", "djelomicno", "nista")}
    print(f"Usporedba s ručnim ({len(manual)} lekcija): {c}")


# ---------------------------------------------------------------- 9. izvještaj

def step_report():
    plan = load("plan.json")
    cov, ass, cmp_, jev = load("coverage.json"), load("assumptions.json"), load("compare.json"), load("merge_jev.json")
    pages = load("pages.json")
    costs = {}
    for line in (CACHE / "costs.jsonl").read_text().splitlines():
        r = json.loads(line)
        costs[r["step"]] = costs.get(r["step"], 0) + (r["usage"].get("cost") or 0)
    used = {}
    for r in cov:
        for l in r["lekcije"]: used[l] = used.get(l, 0) + 1
    bad = {a["id"]: a.get("nedostaje", []) for a in ass if not a.get("ok")}

    md = ["# Generirani plan: Fizika (državna matura)", "",
          f"**{len(plan['lekcije'])} lekcija** (ručni plan: {len(manual_plan())}).", "",
          "## Pretpostavljeno predznanje", ""] + [f"- {p}" for p in plan["predznanje"]] + [""]
    for b in plan["blokovi"]:
        md += [f"## {b['id']} – {b['naziv']}", ""]
        for l in [l for l in plan["lekcije"] if l["blok"] == b["id"]]:
            flags = []
            if not used.get(l["id"]): flags.append("⚠️ ne treba ga nijedan zadatak s ispita")
            if l["id"] in bad: flags.append("⚠️ nulta pretpostavka: " + "; ".join(bad[l["id"]]))
            md += [f"**{l['id']} {l['naziv']}** · zadataka s ispita: {used.get(l['id'], 0)}"
                   + (f" · spojeno iz {', '.join(l['spojeno_iz'])}" if l.get("spojeno_iz") else ""),
                   f"- Koncept: {l['koncept']}", f"- Zašto nova: {l['zasto_nova']}",
                   f"- Preduvjeti: {', '.join(l['preduvjeti']) or '—'}"] + [f"- {f}" for f in flags] + [""]
    (OUT / "plan.md").write_text("\n".join(md))

    unc = [r for r in cov if r["nedostaje"]]
    nista = [r for r in cmp_ if r["pokriveno"] == "nista"]
    ok_cls = sum(p["kind"] == p["truth"] for p in pages)
    rep = ["# Mjerenja prototipa", "",
           f"- Lekcija: **{len(plan['lekcije'])}** (nacrt prije spajanja: {len(load('plan_draft.json')['lekcije'])}, ručni: {len(manual_plan())})",
           f"- Zadaci s ispita pokriveni: **{len(cov) - len(unc)}/{len(cov)}**",
           f"- Lekcije koje ne treba nijedan zadatak s ispita: {sum(1 for l in plan['lekcije'] if not used.get(l['id']))}",
           f"- Nulta pretpostavka prekršena: {len(bad)} lekcija",
           f"- Ručne lekcije koje generirani plan uopće ne pokriva: {len(nista)}",
           f"- Jev razvrstavanje stranica: {ok_cls}/{len(pages)} slaže se s nazivom datoteke",
           f"- Jev parovi „nova ideja?“: {len(jev)}, označeno za spajanje {sum(1 for j in jev if j['p_nova'] < 0.5)}",
           "", "## Trošak po koraku (USD)", ""] + [f"- {k}: {v:.3f}" for k, v in sorted(costs.items())] + [
           f"- **ukupno: {sum(costs.values()):.2f}**", "",
           "## Nepokriveni zadaci s ispita", ""] + [f"- [{r['rok']} {r['broj']}] {r['sazetak']} → {r['nedostaje']}" for r in unc] + [
           "", "## Ručne lekcije bez pokrića", ""] + [f"- {r['rucna']}: {r['napomena']}" for r in nista] + [
           "", "## Djelomično pokrivene ručne lekcije", ""] + [
           f"- {r['rucna']} → {', '.join(r['generirane'])}: {r['napomena']}" for r in cmp_ if r["pokriveno"] == "djelomicno"]
    (OUT / "mjerenja.md").write_text("\n".join(rep))
    print((OUT / "mjerenja.md").read_text()[:1500])


STEPS = ["ocr", "classify", "scope", "draft", "merge", "coverage", "assumptions", "compare", "report"]

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    # "all" = sve; "merge+" = od tog koraka do kraja; "merge" = samo taj korak
    steps = STEPS if arg == "all" else STEPS[STEPS.index(arg[:-1]):] if arg.endswith("+") else [arg]
    for s in steps:
        globals()[f"step_{s}"]()
