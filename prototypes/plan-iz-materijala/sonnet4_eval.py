"""PROTOTIP: provjera i procjena tokena za Sonnet 5.5 (medium) varijacije napravljene preko Claude Code podagenata.
Tokeni se procjenjuju iz omjera znakova i tokena Haiku 5.5 poziva (isti tokenizator obitelji Claude)."""
import json, glob, os
import pipeline as P, tasks as T, sol4_write as S

hx = {r["lesson"]: r for r in P.load("haikux_write10.json")}
use = [json.loads(l) for l in (P.CACHE / "costs.jsonl").read_text().splitlines() if json.loads(l)["step"] == "haikux-write"][-10:]
# omjer znakova po tokenu za ulaz i izlaz (Haiku xhigh, istih 10 lekcija)
in_chars = out_chars = in_tok = out_tok = 0
for lid, u in zip([d["lesson"] for d in P.load("luna_review.json")][:10], use):
    l, ctx = T.lesson_ctx(lid); ctx = ctx.replace(P.formula_sheet(), T.formula_sheet_pages())
    in_chars += len(ctx) + 3000; in_tok += u["usage"]["prompt_tokens"]
    r = hx[lid]; out_chars += len(json.dumps({k: r[k] for k in ("zadatak", "objasnjenje", "rezultati")}, ensure_ascii=False))
    out_tok += u["usage"]["completion_tokens"] - ((u["usage"].get("completion_tokens_details") or {}).get("reasoning_tokens") or 0)
cin, cout = in_chars / in_tok, out_chars / out_tok
print(f"znakova po tokenu: ulaz {cin:.2f}, izlaz {cout:.2f}")

rows = []
for f in sorted(glob.glob("out/sonnet4/*.json")):
    lid = os.path.basename(f)[:-5]
    raw = open(f).read()
    try:
        vs = json.loads(raw)["varijacije"]
    except Exception as e:
        print(lid, "NEISPRAVAN JSON", e); continue
    tin = len(open(f"sonnet_in/{lid}.md").read()) / cin
    tout = len(raw) / cout
    rows.append((lid, tin, tout))
    print(lid, f"ulaz ~{tin:.0f} tok, izlaz (bez razmišljanja) ~{tout:.0f} tok,", "provjere:", S.checks(vs) or "OK")
if rows:
    n = len(rows); tin = sum(r[1] for r in rows) / n; tout = sum(r[2] for r in rows) / n
    c = (tin * 2 + tout * 10) / 1e6
    print(f"prosjek: ulaz {tin:.0f}, izlaz {tout:.0f} tok → {c*100:.1f} c po lekciji bez razmišljanja (Sonnet 2$/10$ po M)")
