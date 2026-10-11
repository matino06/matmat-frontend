"""PROTOTIP: GPT-6 Luna (low) s popisom što tražiti, na istih 49 prvih Haikuovih verzija (ručno ocijenjenih)."""
import json, re, sys
import pipeline as P

SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 0

REVIEWER = "openai/gpt-6-luna"

REVIEW_SYS_V2 = """Provjeravaš zadatak iz fizike za srednju školu (državna matura) prije nego ga dobije učenik.
Pročitaj ZADATAK, OBJAŠNJENJE i REZULTATE rečenicu po rečenicu i potraži ove vrste grešaka:

1. Fizikalno nemoguće ili besmislene rečenice i usporedbe (npr. „kamen prolazi kroz drugi kamen“,
   „ronilac se spušta na 15 m u jezeru dubokom 12 m“, „masa ostaje ista iako smo dodali teret“).
2. Proturječja: dio teksta tvrdi suprotno od drugog dijela, podzadatak proturječi drugom podzadatku,
   ili objašnjenje „ispravlja samo sebe“ („26 N? Ne, …“, „r = 4R ? To nije točno … pa je r = 4R“).
3. Netočne tvrdnje u objašnjenju, čak i kad je konačni rezultat točan (krivo obrazloženje, kriva
   definicija, kriv uzrok, krivi predznak u formuli, npr. „energija kondenzatora je rad izvora“).
4. Pogrešno nazvani pojmovi (npr. težina ≠ sila teža; težina je sila kojom tijelo djeluje na podlogu).
5. Krive činjenice: boje i valne duljine (600 nm je narančasto, crveno je ~620–750 nm), svojstva
   tvari, realne vrijednosti konstanti, primjene u stvarnom svijetu.
6. Tvrdnje o tome što piše ili ne piše u knjižici formula koje si proturječe ili su izmišljene
   (npr. „formula je u knjižici … nema je u knjižici“, „g = 10 propisano je u knjižici“).
7. Podaci koji nisu međusobno usklađeni ili pitanje koje nema jedan jasan točan odgovor.
8. Računske greške u bilo kojem koraku.

NE prijavljuj: stil, duljinu, rubne slučajeve izvan gradiva srednje škole, uobičajena školska
pojednostavljenja (idealni plin, zanemareno trenje, g = 10 m/s² kad je zadano u zadatku).

Odgovori isključivo kao json objekt. Ako nema nijedne greške iz popisa, vrati točno {"dobar": true}.
Inače vrati {"dobar": false, "komentar": "za SVAKU grešku: gdje je (citat) i što je krivo"}."""


def main():
    drafts = P.load("luna_review.json")  # isti 49 zadataka (prve Haikuove verzije)

    def one(v):
        body = json.dumps({"zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"], "rezultati": v["rezultati"]},
                          ensure_ascii=False)
        try:
            r = P.chat("luna-review-v2", REVIEWER, REVIEW_SYS_V2, body, max_tokens=8000, reasoning="low", _try=SEED)
        except Exception as e:
            r = {"greska": str(e)[:200]}
        return {"lesson": v["lesson"], "dobar": r.get("dobar"), "komentar": r.get("komentar", ""), "greska": r.get("greska")}

    res = P.pmap(one, drafts, workers=8)
    P.save(f"luna_review_v2{'_s' + str(SEED) if SEED else ''}.json", res)
    cost = sum(json.loads(l)["usage"].get("cost") or 0 for l in (P.CACHE / "costs.jsonl").read_text().splitlines()
               if json.loads(l)["step"] == "luna-review-v2")
    print(f"Luna v2: dobar {sum(1 for r in res if r['dobar'])}, odbijeno {sum(1 for r in res if r['dobar'] is False)}, "
          f"greške {sum(1 for r in res if r['greska'])}; trošak {cost:.4f} $")


if __name__ == "__main__":
    main()
