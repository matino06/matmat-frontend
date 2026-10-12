"""PROTOTIP: Haiku 5.5 xhigh sam piše varijacije (, bez Lune, bez Haikua). 10 lekcija."""
import json, time
import pipeline as P, tasks as T

MODEL = "anthropic/claude-haiku-5.5"


def one(lid):
    l, ctx = T.lesson_ctx(lid)
    ctx = ctx.replace(P.formula_sheet(), T.formula_sheet_pages())
    t0 = time.time()
    try:
        v = P.chat("haikux-write", MODEL, "Pišeš zadatak za MatMat, aplikaciju za učenje fizike za državnu maturu.\n"
            + T.DESIGN_V2 + '\nVrati json {"zadatak":"markdown teksta zadatka","objasnjenje":"markdown objašnjenja",'
            '"rezultati":{"a":"konačan odgovor","b":"…"}}. U rezultatima za računske podzadatke broj s jedinicom, '
            'za ostale jedna rečenica.', ctx, max_tokens=128000, reasoning="xhigh")
        err = None
    except Exception as e:
        v, err = {}, str(e)[:200]
    return {"lesson": lid, "naziv": l["naziv"], "sekunde": round(time.time() - t0), "greska": err, **v}


if __name__ == "__main__":
    lids = [d["lesson"] for d in P.load("luna_review.json")][:10]
    res = P.pmap(one, lids, workers=10)
    P.save("haikux_write10.json", res)
    usage = [json.loads(l) for l in (P.CACHE / "costs.jsonl").read_text().splitlines() if json.loads(l)["step"] == "haikux-write"][-10:]
    for r, u in zip(res, usage):
        pass
    tot = sum(u["usage"].get("cost") or 0 for u in usage)
    print("greške:", [r["lesson"] for r in res if r["greska"]])
    print("sekunde:", [r["sekunde"] for r in res])
    print("izlaz tokena:", [u["usage"].get("completion_tokens") for u in usage])
    print("razmišljanje:", [(u["usage"].get("completion_tokens_details") or {}).get("reasoning_tokens") for u in usage])
    print(f"trošak: {tot:.4f} $ ukupno, {tot / len(usage) * 100:.2f} c po varijaciji")
