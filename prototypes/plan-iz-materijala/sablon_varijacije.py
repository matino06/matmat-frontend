"""PROTOTIP: prva varijacija = Haiku xhigh (out/haikux_write10.json, ručno provjerena).
Varijacije 2–4 radi Haiku medium po tom predlošku: ista razina težine i jednako detaljno objašnjenje,
mijenjaju se brojevi i sitnice (smjer, kut, sin/cos …), a tekst se prilagođava novim brojevima.

Pokretanje:  .venv/bin/python sablon_varijacije.py
"""
import json, time

import pipeline as P
import loop_luna as LL

MODEL = "anthropic/claude-haiku-5.5"
N = 3  # varijacije 2, 3 i 4

SYS = ("Pišeš zadatak za MatMat, aplikaciju za učenje fizike za državnu maturu.\n"
       "Dobit ćeš PREDLOŽAK: provjereno točan zadatak s objašnjenjem. Napravi NOVU VARIJACIJU istog zadatka.\n\n"
       "PRAVILA:\n"
       "- Ista razina težine, isti podzadaci, isti postupak i jednako detaljno objašnjenje kao predložak. "
       "Zadrži strukturu, naslove, analogije, citate knjižice i stil.\n"
       "- Promijeni zadane brojeve i sitnice priče (npr. lijevo/desno, gore/dolje, kut, sinus umjesto kosinusa, "
       "druga tijela ili imena), tako da učenik ne može prepisati rezultate iz prethodnih varijacija.\n"
       "- Sve brojeve izračunaj ponovno i pažljivo, uključujući međurezultate.\n"
       "- Svaku rečenicu koja ovisi o brojevima ili o promijenjenoj sitnici (usporedbe, postotci, „blizu g“, "
       "smjer sile, predznak, koja je komponenta veća …) prilagodi ili ukloni tako da ostane istinita.\n"
       "- Novi podaci moraju biti fizikalno realni i dati smislene rezultate (npr. trenje ne smije biti veće "
       "od sile koja bi pokrenula tijelo ako zadatak pretpostavlja gibanje, satelit ne smije biti ispod površine).\n"
       "- Nemoj ponoviti vrijednosti iz već napravljenih varijacija.\n\n"
       + LL.COMMON_MISTAKES +
       '\n\nVrati json {"zadatak":"markdown teksta zadatka","objasnjenje":"markdown objašnjenja",'
       '"rezultati":{"a":"konačan odgovor","b":"…"}}.')


def one(t):
    tpl = {k: t[k] for k in ("zadatak", "objasnjenje", "rezultati")}
    out, used = [], []
    for i in range(N):
        msg = "PREDLOŽAK:\n" + json.dumps(tpl, ensure_ascii=False)
        if used:
            msg += "\n\nVEĆ NAPRAVLJENE VARIJACIJE (njihovi zadaci, ne ponavljaj te vrijednosti):\n" + "\n\n".join(used)
        t0 = time.time()
        try:
            v = P.chat("sablon-var", MODEL, SYS, msg, max_tokens=32000, _try=i)
            err = None
        except Exception as e:
            v, err = {}, str(e)[:200]
        sec = round(time.time() - t0)
        issues = LL.code_checks(v) if not err else []
        out.append({"lesson": t["lesson"], "naziv": t["naziv"], "varijacija": i + 2, "sekunde": sec,
                    "greska": err, "provjere_kodom": issues, **v})
        if v.get("zadatak"):
            used.append(v["zadatak"])
    return out


def main():
    tpls = P.load("haikux_write10.json")
    res = [v for vs in P.pmap(one, tpls, workers=10) for v in vs]
    P.save("sablon_varijacije.json", res)
    usage = [json.loads(l) for l in (P.CACHE / "costs.jsonl").read_text().splitlines()
             if json.loads(l)["step"] == "sablon-var"][-len(res):]
    tot = sum(u["usage"].get("cost") or 0 for u in usage)
    print("greške:", [(r["lesson"], r["varijacija"]) for r in res if r["greska"]])
    print("provjere kodom:", [(r["lesson"], r["varijacija"], r["provjere_kodom"]) for r in res if r["provjere_kodom"]])
    print("sekunde:", [r["sekunde"] for r in res])
    print("izlaz tokena:", [u["usage"].get("completion_tokens") for u in usage])
    print("razmišljanje:", [(u["usage"].get("completion_tokens_details") or {}).get("reasoning_tokens") for u in usage])
    print(f"trošak: {tot:.4f} $ ukupno, {tot / max(len(usage), 1) * 100:.2f} c po varijaciji")
    with open(P.OUT / "sablon_varijacije.txt", "w") as f:
        for t in tpls:
            f.write(f"\n\n################ {t['lesson']} {t['naziv']}\n--- PREDLOŽAK ZADATAK\n{t['zadatak']}\n"
                    f"--- PREDLOŽAK REZ {json.dumps(t['rezultati'], ensure_ascii=False)}\n")
            for r in res:
                if r["lesson"] != t["lesson"]:
                    continue
                f.write(f"\n######## {r['lesson']} varijacija {r['varijacija']} | {r['sekunde']} s | "
                        f"greska {r['greska']} | kod {r['provjere_kodom']}\n--- ZADATAK\n{r.get('zadatak', '')}\n"
                        f"--- REZ {json.dumps(r.get('rezultati', {}), ensure_ascii=False)}\n"
                        f"--- OBJ\n{r.get('objasnjenje', '')}\n")


if __name__ == "__main__":
    main()
