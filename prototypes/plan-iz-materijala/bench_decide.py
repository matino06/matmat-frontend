"""PROTOTIP: usporedba modela odluke kao recenzenata zadataka na ručno označenom skupu."""
import json, sys
import pipeline as P, tasks as T

MODELS = sys.argv[1:] or ["typesafe/jev-1.13", "openai/gpt-6-luna-decisions", "cloudflare/clef", "perplexity/pplx-decider-v1.1-27b",
                          "upstage/solar-decide", "microsoft/microsoft-decision-1", "nace-ai/drex-v1.5", "liquid/d1",
                          "inception/mercury-decide", "cloudflare/clef-omni"]

# ručno označeni skup: 64 varijacije, 10 s greškom ili nedosljednošću
items, bad = [], set()
for t in P.load("tasks.json"):
    if t["writer"] == "haiku":
        for i, v in enumerate(t["varijacije"], 1):
            items.append((f"{t['lesson']} v{i}", v))
for r in P.load("tasks_v2.json"):
    items.append((f"V2 {r['lesson']} k{r['k']}", r))
for o in json.load(open(P.OUT / "haiku_medium_50.json")):
    if o["status"] == "odbijen":
        items.append((f"T50 {o['lesson']}", o))
bad = {"B15.01 v2", "B19.05 v3", "B15.01 v1", "V2 B22.03 k2", "V2 B05.01 k2", "B11.02 v4",
       "T50 B14.01", "T50 B22.04", "T50 B20.03", "T50 B17.06"}


def auc(scores):  # vjerojatnost da loš zadatak dobije nižu ocjenu od dobrog
    b = [s for n, s in scores if n in bad]; g = [s for n, s in scores if n not in bad]
    return sum((x < y) + 0.5 * (x == y) for x in b for y in g) / (len(b) * len(g))


rows = []
for m in MODELS:
    def one(it):
        n, v = it
        try:
            a = P.decide("bench-review", {"zadatak": v["zadatak"][:8000], "rezultati": v.get("rezultati", {})}, T.REVIEW_Q, model=m)
            return n, min(a[k]["noul"] for k in T.REVIEW_Q)
        except Exception as e:
            return n, None
    sc = [x for x in P.pmap(one, items, workers=6)]
    ok = [(n, s) for n, s in sc if s is not None]
    if len(ok) < len(items) * 0.8:
        rows.append(f"| {m} | greška ({len(items) - len(ok)} poziva palo) | | |"); continue
    # najbolji prag: uhvati sve loše uz najmanje lažnih
    th = max(s for n, s in ok if n in bad)
    fp = sum(1 for n, s in ok if n not in bad and s <= th)
    th5 = sorted(s for n, s in ok if n in bad)[len([1 for n, _ in ok if n in bad]) // 2]
    fp5 = sum(1 for n, s in ok if n not in bad and s <= th5)
    rows.append(f"| {m} | {auc(ok):.2f} | {fp}/{len(ok) - len([1 for n,_ in ok if n in bad])} | {fp5} |")
    print(rows[-1], flush=True)
costs = {}
for line in (P.CACHE / "costs.jsonl").read_text().splitlines():
    r = json.loads(line)
    if r["step"] == "bench-review":
        costs[r["model"]] = costs.get(r["model"], 0) + (r["usage"].get("cost") or 0)
(P.OUT / "usporedba-modela-odluke.md").write_text(
    f"# Modeli odluke kao recenzenti ({len(items)} varijacija, {len(bad)} s greškom)\n\n"
    "| Model | AUC (1 = savršeno, 0,5 = slučajno) | lažne uzbune da uhvati SVE loše | lažne uzbune da uhvati pola loših |\n|---|---|---|---|\n"
    + "\n".join(rows) + "\n\nTrošak: " + json.dumps({k: round(v, 4) for k, v in costs.items()}))
print(json.dumps({k: round(v, 4) for k, v in costs.items()}))
