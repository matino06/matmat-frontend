"""PROTOTIP: GPT-6 Luna (low) recenzira prve Haikuove verzije iz loop50 (iz cachea, bez ponovnog pisanja)."""
import json
import pipeline as P, tasks as T, loop50 as L

REVIEWER = "openai/gpt-6-luna"


def first_drafts():
    orig = P._post
    P._post = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("nije u cacheu"))
    plan = P.load("plan.json")["lekcije"]
    lids = [plan[round(i * (len(plan) - 1) / 49)]["id"] for i in range(50)]
    out = []
    for lid in lids:
        try:
            out.append(T._write_one(lid, L.WRITER, "loop-write"))
        except Exception:
            pass
    P._post = orig
    return out


def main():
    drafts = first_drafts()

    def one(v):
        body = json.dumps({"zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"], "rezultati": v.get("rezultati", {})},
                          ensure_ascii=False)
        try:
            r = P.chat("luna-review", REVIEWER, L.REVIEW_SYS, body, max_tokens=8000, reasoning="low")
        except Exception as e:
            r = {"greska": str(e)[:200]}
        return {"lesson": v["lesson"], "naziv": v["naziv"], "dobar": r.get("dobar"), "komentar": r.get("komentar", ""),
                "greska": r.get("greska"), "zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"], "rezultati": v.get("rezultati", {})}

    res = P.pmap(one, drafts, workers=8)
    P.save("luna_review.json", res)
    cost = sum(json.loads(l)["usage"].get("cost") or 0 for l in (P.CACHE / "costs.jsonl").read_text().splitlines()
               if json.loads(l)["step"] == "luna-review")
    print(f"Luna: {len(res)} pregledano, dobar {sum(1 for r in res if r['dobar'])}, odbijeno {sum(1 for r in res if r['dobar'] is False)}, "
          f"greške {sum(1 for r in res if r['greska'])}; trošak {cost:.4f} $ ({cost / len(res) * 100:.3f} c po provjeri)")


if __name__ == "__main__":
    main()
