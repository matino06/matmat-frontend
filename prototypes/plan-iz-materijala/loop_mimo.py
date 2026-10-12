"""PROTOTIP: ista petlja kao loop_luna.py, ali ispravke radi MiMo v2.6 Pro bez razmišljanja."""
import json
import pipeline as P
import tasks as T
import loop_luna as L

FIXER = "xiaomi/mimo-v2.6-pro"


def fix(lid, v, comments):
    l, ctx = T.lesson_ctx(lid)
    ctx = ctx.replace(P.formula_sheet(), T.formula_sheet_pages())
    msg = (ctx + "\n\nZADATAK:\n" + json.dumps({"zadatak": v["zadatak"], "objasnjenje": v["objasnjenje"],
                                                "rezultati": v.get("rezultati", {})}, ensure_ascii=False)
           + "\n\nPRIMJEDBE RECENZENATA:\n" + "\n\n".join(f"- {c}" for c in comments))
    out = P.chat("loopM-fix", FIXER, L.FIX_SYS, msg, max_tokens=100000, reasoning="off")
    return {**v, **{k: out[k] for k in ("zadatak", "objasnjenje", "rezultati") if k in out}}, out.get("odbijene_primjedbe", "")


L.fix = fix
_orig_luna = L.luna
L.luna = lambda v, seed, rnd: _orig_luna(v, seed, rnd)

if __name__ == "__main__":
    import sys
    # isti tok kao loop_luna.main, ali u druge datoteke
    drafts = P.load("luna_review.json")
    if len(sys.argv) > 1:
        drafts = drafts[: int(sys.argv[1])]
    res = P.pmap(L.one, drafts, workers=8)
    P.save("loop_mimo.json", res)
    ok = [r for r in res if "greska" not in r]
    costs = {}
    for line in (P.CACHE / "costs.jsonl").read_text().splitlines():
        c = json.loads(line)
        if c["step"] == "loopM-fix":
            costs.setdefault("n", 0); costs["n"] += 1
            costs["cost"] = costs.get("cost", 0) + (c["usage"].get("cost") or 0)
            costs["reason"] = costs.get("reason", 0) + (c["usage"].get("completion_tokens_details", {}) or {}).get("reasoning_tokens", 0)
            costs["out"] = costs.get("out", 0) + (c["usage"].get("completion_tokens") or 0)
    print(f"Greške: {len(res) - len(ok)}; prošlo: {sum(r['prosao'] for r in ok)}/{len(ok)}; "
          f"ispravaka: {sorted(len(r['krugovi']) - 1 for r in ok)}")
    print("MiMo ispravci:", costs, f"→ {costs.get('cost', 0) / max(costs.get('n', 1), 1) * 100:.3f} c po ispravku")
