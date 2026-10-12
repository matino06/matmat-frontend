"""PROTOTIP: GPT-6.1 Sol (medium) piše samo 1. varijaciju za istih 10 lekcija.
Ona će poslije biti predložak po kojem Haiku xhigh radi varijacije 2–4 (sablon_varijacije.py)."""
import json, time

import pipeline as P
import tasks as T
import loop_luna as LL
import sol4_write as S

MODEL = "openai/gpt-6.1-sol"
STEP = "sol1-write"
SYS = ("Pišeš zadatak za MatMat, aplikaciju za učenje fizike za državnu maturu.\n" + T.DESIGN_V2 + "\n\n"
       + LL.COMMON_MISTAKES + "\n- Formule piši samo unutar \\( \\) ili $$ $$; izvan njih nikad LaTeX naredbe ni {,}.\n\n"
       'Odgovori isključivo kao json objekt {"zadatak":"markdown teksta zadatka","objasnjenje":"markdown objašnjenja",'
       '"rezultati":{"a":"konačan odgovor","b":"…"}}. U rezultatima za računske podzadatke broj s jedinicom, '
       'za ostale jedna rečenica.')


def one(lid):
    l, ctx = T.lesson_ctx(lid)
    ctx = ctx.replace(P.formula_sheet(), T.formula_sheet_pages())
    t0 = time.time()
    try:
        v, err = P.chat(STEP, MODEL, SYS, ctx, max_tokens=100000, reasoning="medium"), None
    except Exception as e:
        v, err = {}, str(e)[:200]
    return {"lesson": lid, "naziv": l["naziv"], "sekunde": round(time.time() - t0), "greska": err,
            "provjere_kodom": S.checks([v]) if v else [], **v}


if __name__ == "__main__":
    lids = [d["lesson"] for d in P.load("luna_review.json")][:10]
    res = P.pmap(one, lids, workers=10)
    P.save("sol1_write10.json", res)
    usage = [json.loads(l) for l in (P.CACHE / "costs.jsonl").read_text().splitlines()
             if json.loads(l)["step"] == STEP][-len(res):]
    tot = sum(u["usage"].get("cost") or 0 for u in usage)
    print("greške:", [(r["lesson"], r["greska"]) for r in res if r["greska"]])
    print("provjere kodom:", [(r["lesson"], [c for c in r["provjere_kodom"] if "broj varijacija" not in c]) for r in res
                              if any("broj varijacija" not in c for c in r["provjere_kodom"])])
    print("sekunde:", [r["sekunde"] for r in res])
    print("ulaz tokena:", [u["usage"].get("prompt_tokens") for u in usage])
    print("izlaz tokena:", [u["usage"].get("completion_tokens") for u in usage])
    print("razmišljanje:", [(u["usage"].get("completion_tokens_details") or {}).get("reasoning_tokens") for u in usage])
    print(f"trošak: {tot:.4f} $ ukupno, {tot / max(len(usage), 1) * 100:.2f} c po varijaciji")
    with open(P.OUT / "sol1_write10.txt", "w") as f:
        for r in res:
            f.write(f"\n######## {r['lesson']} {r['naziv']} | {r['sekunde']} s | greska {r['greska']} | kod {r['provjere_kodom']}\n"
                    f"--- ZADATAK\n{r.get('zadatak', '')}\n--- REZ {json.dumps(r.get('rezultati', {}), ensure_ascii=False)}\n"
                    f"--- OBJ\n{r.get('objasnjenje', '')}\n")
