"""PROTOTIP: petlja na istih 49 prvih Haikuovih verzija (ručno ocijenjenih).
2× Luna s popisom + provjere kodom → Haiku ispravlja → ponovno, najviše 2 ispravka.

Pokretanje:  MAXW=8 .venv/bin/python loop_luna.py
"""

import difflib, json, re, time

import pipeline as P
import tasks as T
import luna_review_v2 as LV

WRITER = "anthropic/claude-haiku-5.5"
MAX_FIXES = 2
SEEDS = (0, 7)

COMMON_MISTAKES = """ČESTE GREŠKE KOJE NE SMIJEŠ NAPRAVITI:
- Nikakve samokorekcije u tekstu („26 N? Ne, …“, „r = 4R ? To nije točno …“). Objašnjenje je konačna verzija.
- Ne tvrdi što piše ili ne piše u knjižici formula osim ako to doslovno vidiš u priloženom tekstu knjižice.
  (Knjižica, str. 5: „g = 9,81 m s⁻² (u zadatcima uzeti 10 m s⁻²)“ — to smiješ citirati.)
- Težina NIJE sila teža: sila teža je sila kojom Zemlja privlači tijelo, težina je sila kojom tijelo
  djeluje na podlogu ili ovjes.
- Boje: 600 nm je narančasto, crveno je ~620–750 nm, zeleno ~500–565 nm, plavo ~450–490 nm.
- Energija kondenzatora je CU²/2; izvor pri punjenju uloži CU².
- Svaka slikovita usporedba i „intuicija“ mora biti fizikalno točna (dva tijela na istom mjestu se sudaraju,
  ne prolaze jedno kroz drugo).
- Podaci u podzadacima ne smiju proturječiti jedni drugima; ako podzadatak mijenja uvjet, izričito reci
  vrijedi li promjena i u sljedećim podzadacima.
- Zadnji odjeljak „## ✅ Rezultati“ s po jednim retkom za svaki podzadatak je obavezan."""

FIX_SYS = ("Pišeš zadatak za MatMat, aplikaciju za učenje fizike za državnu maturu.\n" + T.DESIGN_V2 + "\n\n" + COMMON_MISTAKES +
           "\n\nDobit ćeš zadatak i primjedbe recenzenta. Za svaku primjedbu najprije procijeni je li točna. "
           "Ispravi SAMO ono što je u točnim primjedbama; ako je primjedba netočna ili je samo sitničavost izvan "
           "gradiva srednje škole, taj dio NE mijenjaj. Sve ostalo zadrži kako jest. Vrati json: "
           '{"zadatak":"…","objasnjenje":"…","rezultati":{"a":"…"},"odbijene_primjedbe":"koje primjedbe nisi '
           'prihvatio i zašto (prazno ako nijednu)"}.')


def code_checks(v):
    issues = []
    errs = T.katex_errors([v["zadatak"] + "\n\n" + v["objasnjenje"]])[0]
    if errs:
        issues.append("Formule koje se ne mogu prikazati (KaTeX): " + "; ".join(errs[:3]))
    m = re.search(r"##\s*✅\s*Rezultati\s*\n(.*)$", v["objasnjenje"], re.S)
    if not m or len(m.group(1).strip()) < 10:
        issues.append("Nedostaje ili je prazan zadnji odjeljak „## ✅ Rezultati“ s rezultatom svakog podzadatka.")
    return issues


def luna(v, seed, rnd):
    body = json.dumps({"zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"], "rezultati": v.get("rezultati", {})},
                      ensure_ascii=False)
    try:
        return P.chat(f"loopL-review", LV.REVIEWER, LV.REVIEW_SYS_V2, body, max_tokens=8000, reasoning="low", _try=seed)
    except Exception as e:
        return {"dobar": True, "greska": str(e)[:200]}


def fix(lid, v, comments):
    l, ctx = T.lesson_ctx(lid)
    ctx = ctx.replace(P.formula_sheet(), T.formula_sheet_pages())
    msg = (ctx + "\n\nZADATAK:\n" + json.dumps({"zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"],
                                                "rezultati": v.get("rezultati", {})}, ensure_ascii=False)
           + "\n\nPRIMJEDBE RECENZENATA:\n" + "\n\n".join(f"- {c}" for c in comments))
    out = P.chat("loopL-fix", WRITER, FIX_SYS, msg, max_tokens=24000)
    return {**v, **{k: out[k] for k in ("zadatak", "objasnjenje", "rezultati") if k in out}}, out.get("odbijene_primjedbe", "")


def one(v0):
    t0, v, log = time.time(), dict(v0), []
    try:
        for rnd in range(MAX_FIXES + 1):
            comments = code_checks(v)
            for s in SEEDS:
                r = luna(v, s, rnd)
                if r.get("dobar") is False and r.get("komentar"):
                    comments.append(r["komentar"])
            log.append({"krug": rnd, "primjedbe": comments})
            if not comments or rnd == MAX_FIXES:
                break
            v, rejected = fix(v0["lesson"], v, comments)
            log[-1]["odbijene"] = rejected
        return {"lesson": v0["lesson"], "naziv": v0["naziv"], "pocetni": v0, "zavrsni": v, "krugovi": log,
                "prosao": not log[-1]["primjedbe"], "sekunde": round(time.time() - t0)}
    except Exception as e:
        return {"lesson": v0["lesson"], "greska": str(e)[:300], "krugovi": log}


def main():
    drafts = P.load("luna_review.json")
    res = P.pmap(one, drafts, workers=8)
    P.save("loop_luna.json", res)
    ok = [r for r in res if "greska" not in r]
    costs = {}
    for line in (P.CACHE / "costs.jsonl").read_text().splitlines():
        c = json.loads(line)
        if c["step"].startswith("loopL-"):
            costs[c["step"]] = costs.get(c["step"], 0) + (c["usage"].get("cost") or 0)
    fixes = [len(r["krugovi"]) - 1 for r in ok]
    print(f"Greške: {len(res) - len(ok)}; prošlo bez primjedbi na kraju: {sum(r['prosao'] for r in ok)}/{len(ok)}; "
          f"ispravaka: {sorted(fixes)}")
    print("Trošak:", {k: round(v, 3) for k, v in costs.items()}, "ukupno", round(sum(costs.values()), 3),
          f"= {sum(costs.values()) / max(len(ok), 1) * 100:.2f} c po varijaciji (bez pisanja)")
    # diff za ručnu provjeru
    with open(P.OUT / "loop_luna_diff.txt", "w") as f:
        for i, r in enumerate(res):
            if "greska" in r:
                f.write(f"\n######## [{i}] {r['lesson']} GREŠKA {r['greska']}\n"); continue
            f.write(f"\n######## [{i}] {r['lesson']} {r['naziv']} | ispravaka {len(r['krugovi']) - 1} | "
                    f"{'PROŠAO' if r['prosao'] else 'NIJE PROŠAO'}\n")
            for k in r["krugovi"]:
                for c in k["primjedbe"]:
                    f.write(f"  [krug {k['krug']}] {c[:600]}\n")
                if k.get("odbijene"):
                    f.write(f"  [krug {k['krug']} Haiku odbio] {k['odbijene'][:400]}\n")
            a = (r["pocetni"]["zadatak"] + "\n\n" + r["pocetni"]["objasnjenje"]).splitlines()
            b = (r["zavrsni"]["zadatak"] + "\n\n" + r["zavrsni"]["objasnjenje"]).splitlines()
            d = [l for l in difflib.unified_diff(a, b, lineterm="", n=0) if not l.startswith(("---", "+++", "@@"))]
            f.write("  DIFF:\n" + "\n".join("    " + l[:400] for l in d[:80]) + "\n")


if __name__ == "__main__":
    main()
