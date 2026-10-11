"""PROTOTIP: Haiku (medium) piše zadatak, GPT-6.1 Sol (low) ga provjerava; ako nije dobar,
Sol napiše samo komentar, Haiku ispravlja, Sol ponovno provjerava (najviše MAX_ROUNDS ispravaka).

Pokretanje:  MAXW=8 .venv/bin/python loop50.py
"""

import json, time

import pipeline as P
import tasks as T

WRITER = "anthropic/claude-haiku-5.5"  # bez parametra reasoning = medium (default)
REVIEWER = "openai/gpt-6.1-sol"
MAX_ROUNDS = 3

REVIEW_SYS = """Provjeravaš zadatak iz fizike za srednju školu (državna matura) prije nego ga dobije učenik.
Zadatak je DOBAR ako je sve ovo točno:
- situacija je fizikalno moguća i bez kontradikcija (podaci i smjerovi se ne proturječe);
- svaki podzadatak ima jedan jasan točan odgovor (nema pitanja na mišljenje ni dvosmislenih tvrdnji);
- svi rezultati i svi računi u objašnjenju su točni;
- činjenice su točne (boje i valne duljine, svojstva tvari, realne vrijednosti).
Stil i duljina NISU razlog za odbijanje.
Odgovori isključivo kao json objekt. Ako je zadatak dobar, vrati točno {"dobar": true} i ništa drugo.
Ako nije, vrati {"dobar": false, "komentar": "kratko i konkretno što je krivo i gdje"}."""

FIX_SYS = ("Pišeš zadatak za MatMat, aplikaciju za učenje fizike za državnu maturu.\n" + T.DESIGN_V2 +
           "\n\nDobit ćeš zadatak koji je recenzent odbio i njegov komentar. Ispravi SAMO ono što komentar navodi, "
           "a ostalo zadrži. Vrati cijeli ispravljeni zadatak u istom JSON obliku: "
           '{"zadatak":"…","objasnjenje":"…","rezultati":{"a":"…"}}.')


def review(v, rnd):
    body = json.dumps({"zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"], "rezultati": v.get("rezultati", {})},
                      ensure_ascii=False)
    return P.chat(f"loop-review", REVIEWER, REVIEW_SYS, body, max_tokens=8000, reasoning="low")


def fix(lid, v, comment, rnd):
    l, ctx = T.lesson_ctx(lid)
    ctx = ctx.replace(P.formula_sheet(), T.formula_sheet_pages())
    msg = (ctx + "\n\nZADATAK KOJI TREBA ISPRAVITI:\n" +
           json.dumps({"zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"], "rezultati": v.get("rezultati", {})},
                      ensure_ascii=False) + f"\n\nKOMENTAR RECENZENTA:\n{comment}")
    out = P.chat("loop-fix", WRITER, FIX_SYS, msg, max_tokens=24000)
    return {**v, **out}


def one(lid):
    t0 = time.time()
    log = []
    try:
        # novi direktorij cachea = svježe pisanje, ne koristi stare Haiku varijacije
        v = T._write_one(lid, WRITER, "loop-write")
        for rnd in range(MAX_ROUNDS + 1):
            r = review(v, rnd)
            log.append({"krug": rnd, "dobar": bool(r.get("dobar")), "komentar": r.get("komentar", "")})
            if r.get("dobar") or rnd == MAX_ROUNDS:
                break
            v = fix(lid, v, r.get("komentar", ""), rnd)
        v["katex"] = T.katex_errors([v["zadatak"] + "\n\n" + v["objasnjenje"]])[0]
        return {"lesson": lid, "naziv": v["naziv"], "zavrsni": v, "krugovi": log, "sekunde": round(time.time() - t0)}
    except Exception as e:
        return {"lesson": lid, "greska": str(e)[:300], "krugovi": log, "sekunde": round(time.time() - t0)}


def main():
    plan = P.load("plan.json")["lekcije"]
    lids = [plan[round(i * (len(plan) - 1) / 49)]["id"] for i in range(50)]
    res = P.pmap(one, lids, workers=8)
    P.save("loop50.json", res)

    ok = [r for r in res if "greska" not in r]
    first = sum(r["krugovi"][0]["dobar"] for r in ok)
    final = sum(r["krugovi"][-1]["dobar"] for r in ok)
    rounds = [len(r["krugovi"]) - 1 for r in ok]
    costs = {}
    for line in (P.CACHE / "costs.jsonl").read_text().splitlines():
        c = json.loads(line)
        if c["step"].startswith("loop-"):
            costs[c["step"]] = costs.get(c["step"], 0) + (c["usage"].get("cost") or 0)
    md = [f"# Haiku (medium) piše, GPT-6.1 Sol (low) provjerava — {len(lids)} lekcija", "",
          f"- Greške u izvođenju: {len(res) - len(ok)}",
          f"- Dobar odmah (Sol prihvatio prvu verziju): **{first}/{len(ok)}**",
          f"- Dobar nakon ispravaka: **{final}/{len(ok)}**",
          f"- Broj ispravaka po lekciji: {sorted(rounds)}",
          f"- KaTeX greške u završnim verzijama: {sum(bool(r['zavrsni']['katex']) for r in ok)}",
          f"- Medijan trajanja po lekciji: {sorted(r['sekunde'] for r in ok)[len(ok) // 2]} s",
          "", "## Trošak (USD)", ""] + [f"- {k}: {v:.3f}" for k, v in sorted(costs.items())] + [
          f"- **ukupno: {sum(costs.values()):.2f}** (≈ {sum(costs.values()) / max(len(ok), 1) * 100:.2f} centi po varijaciji)",
          "", "## Komentari recenzenta", ""]
    for r in ok:
        for k in r["krugovi"]:
            if not k["dobar"]:
                md.append(f"- **{r['lesson']}** krug {k['krug']}: {k['komentar']}")
    (P.OUT / "loop50.md").write_text("\n".join(md))
    print("\n".join(md[:12]))

    cards = []
    for r in ok:
        v = r["zavrsni"]
        flags = [("✅" if r["krugovi"][-1]["dobar"] else "❌") + f" ispravaka: {len(r['krugovi']) - 1}"]
        flags += [f"krug {k['krug']}: {k['komentar']}" for k in r["krugovi"] if not k["dobar"]]
        cards.append({"title": f"{r['lesson']} {r['naziv']}", "flags": flags, "task": v["zadatak"],
                      "expl": v["objasnjenje"], "check": {}, "ref": v.get("rezultati", {})})
    html = (P.OUT / "zadaci.html").read_text()
    a, b = html.index("const data = ") + len("const data = "), html.index(";\nconst root")
    (P.OUT / "loop50.html").write_text(html[:a] + json.dumps(cards, ensure_ascii=False) + html[b:])


if __name__ == "__main__":
    main()
