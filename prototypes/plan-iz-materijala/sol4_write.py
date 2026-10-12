"""PROTOTIP: GPT-6.1 Sol (low) u jednom pozivu piše 4 varijacije: prvu po DESIGN_V2, a 2.–4. kao izmjene prve
(isti podzadaci i ista težina, jednako detaljno objašnjenje, drugi brojevi i sitnice). Istih 10 lekcija.

Pokretanje:  HTTP_TIMEOUT=600 .venv/bin/python sol4_write.py
"""
import json, os, re, time

import pipeline as P
import tasks as T
import loop_luna as LL

MODEL = os.environ.get("MODEL", "openai/gpt-6.1-sol")
EFFORT = os.environ.get("EFFORT", "low")
TAG = os.environ.get("TAG", "sol4")
STEP = f"{TAG}-write"

SYS = ("Pišeš zadatke za MatMat, aplikaciju za učenje fizike za državnu maturu.\n" + T.DESIGN_V2 + "\n\n"
       + LL.COMMON_MISTAKES + "\n\n"
       "NAPRAVI ODJEDNOM 4 VARIJACIJE ISTOG ZADATKA:\n"
       "- Varijacija 1 je zadatak napisan po gornjim pravilima.\n"
       "- Varijacije 2, 3 i 4 su izmjene varijacije 1: isti podzadaci, isti postupak, ista razina težine i jednako "
       "detaljno objašnjenje sa svim koracima (nikad „isto kao u varijaciji 1“, svaka varijacija mora stajati sama za sebe). "
       "Ne dodaj i ne mijenjaj podzadatke.\n"
       "- U njima promijeni zadane brojeve i sitnice priče (lijevo/desno, gore/dolje, kut, sinus umjesto kosinusa, druga "
       "tijela ili imena), tako da se rezultati razlikuju od svih ostalih varijacija.\n"
       "- Sve brojeve izračunaj ponovno, i međurezultate. Svaku rečenicu koja ovisi o brojevima ili promijenjenoj sitnici "
       "(usporedbe, omjeri, postotci, „blizu g“, kut veći ili manji od 45°, smjer, predznak, koja je komponenta veća) "
       "provjeri i prilagodi ili ukloni tako da ostane istinita.\n"
       "- Podaci moraju biti fizikalno realni, a podaci u različitim podzadacima iste varijacije moraju se slagati.\n"
       "- Ne piši „X puta manji“ kad je X manji od 1 (piši npr. „polumjer 0,8 polumjera Zemlje“).\n"
       "- Formule piši samo unutar \\( \\) ili $$ $$; izvan njih nikad LaTeX naredbe ni {,}.\n\n"
       'Odgovori isključivo kao json objekt {"varijacije":[{"zadatak":"markdown teksta zadatka",'
       '"objasnjenje":"markdown objašnjenja","rezultati":{"a":"konačan odgovor","b":"…"}}, … točno 4 …]}. '
       "U rezultatima za računske podzadatke broj s jedinicom, za ostale jedna rečenica.")


def raw_latex(text):
    s = re.sub(r"\$\$.*?\$\$", "", text, flags=re.S)
    s = re.sub(r"\\\(.*?\\\)", "", s, flags=re.S)
    s = re.sub(r"\$[^$\n]+\$", "", s)
    return re.findall(r".{0,20}(?:\{,\}|\\text|\\cdot|\\frac).{0,10}", s)


def checks(vs):
    out = []
    if len(vs) != 4:
        out.append(f"broj varijacija {len(vs)}")
    base = len(vs[0].get("objasnjenje", "")) if vs else 0
    for i, v in enumerate(vs):
        iss = LL.code_checks(v) if v.get("objasnjenje") and v.get("zadatak") else [f"nedostaje zadatak/objašnjenje (ključevi: {list(v)})"]
        raw = raw_latex(v.get("zadatak", "") + "\n" + v.get("objasnjenje", ""))
        if raw:
            iss.append(f"LaTeX izvan formula ({len(raw)}): {raw[:2]}")
        text = v.get("zadatak", "") + "\n" + v.get("objasnjenje", "") + json.dumps(v.get("rezultati", {}), ensure_ascii=False)
        foreign = re.findall(r"\S*[Ѐ-ӿ　-鿿가-힯]\S*", text)
        foreign += re.findall(r"\b(?:joten|olla|yhdessä|ratkaistaan|ensin|että|kuin|eli|noin|perihelissä)\b", text)
        if foreign:
            iss.append(f"strani jezik/pismo: {foreign[:4]}")
        if "\\n" in text:
            iss.append("doslovni \\n u tekstu")
        ratio = len(v.get("objasnjenje", "")) / max(base, 1)
        if ratio < 0.8:
            iss.append(f"objašnjenje kraće od prve varijacije ({ratio:.0%})")
        if iss:
            out.append(f"v{i + 1}: " + " | ".join(iss))
    return out


def one(lid):
    l, ctx = T.lesson_ctx(lid)
    ctx = ctx.replace(P.formula_sheet(), T.formula_sheet_pages())
    t0 = time.time()
    try:
        out = P.chat(STEP, MODEL, SYS, ctx, max_tokens=100000, reasoning=EFFORT)
        vs, err = out.get("varijacije", []), None
    except Exception as e:
        vs, err = [], str(e)[:200]
    return {"lesson": lid, "naziv": l["naziv"], "sekunde": round(time.time() - t0), "greska": err,
            "provjere_kodom": checks(vs) if vs else [], "varijacije": vs}


def main():
    lids = [d["lesson"] for d in P.load("luna_review.json")][:10]
    res = P.pmap(one, lids, workers=10)
    P.save(f"{TAG}_write10.json", res)
    usage = [json.loads(l) for l in (P.CACHE / "costs.jsonl").read_text().splitlines()
             if json.loads(l)["step"] == STEP][-len(res):]
    tot = sum(u["usage"].get("cost") or 0 for u in usage)
    print("greške:", [(r["lesson"], r["greska"]) for r in res if r["greska"]])
    print("broj varijacija:", [len(r["varijacije"]) for r in res])
    print("provjere kodom:")
    for r in res:
        for c in r["provjere_kodom"]:
            print("  ", r["lesson"], c)
    print("sekunde:", [r["sekunde"] for r in res])
    print("izlaz tokena:", [u["usage"].get("completion_tokens") for u in usage])
    print("razmišljanje:", [(u["usage"].get("completion_tokens_details") or {}).get("reasoning_tokens") for u in usage])
    print(f"trošak: {tot:.4f} $ ukupno, {tot / max(len(usage), 1) * 100:.2f} c po lekciji (4 varijacije), "
          f"{tot / max(len(usage), 1) / 4 * 100:.2f} c po varijaciji")
    with open(P.OUT / f"{TAG}_write10.txt", "w") as f:
        for r in res:
            f.write(f"\n\n################ {r['lesson']} {r['naziv']} | {r['sekunde']} s | greska {r['greska']}\n"
                    f"kod: {r['provjere_kodom']}\n")
            for i, v in enumerate(r["varijacije"]):
                f.write(f"\n######## {r['lesson']} varijacija {i + 1}\n--- ZADATAK\n{v.get('zadatak', '')}\n"
                        f"--- REZ {json.dumps(v.get('rezultati', {}), ensure_ascii=False)}\n"
                        f"--- OBJ\n{v.get('objasnjenje', '')}\n")


if __name__ == "__main__":
    main()
