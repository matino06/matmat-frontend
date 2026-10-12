"""PROTOTIP (ticket „Kako pouzdano provjeriti nultu pretpostavku“): provjera nulte pretpostavke na planu iz stavki.

Stara provjera (step_assumptions) pitala je LLM „nedostaje li nešto?“ i prijavila 120/135 lekcija, uglavnom šum.
Ovdje LLM ne presuđuje. Za svaki pojam iz predmeta koji lekcija KORISTI kao poznat mora navesti koja stavka plana
ga uči (id), ili „predznanje“, ili „nigdje“. Presudu donosi kod:
  - stavka je u lekciji ili u njezinim (tranzitivnim) preduvjetima  → u redu
  - stavka je u nekoj drugoj lekciji                                  → PREKRŠAJ (prijedlog: dodaj preduvjet)
  - „nigdje“                                                         → RUPA (pojam plan uopće ne uči)
  - „predznanje“                                                     → u redu
Uz to provjera u kodu nad grafom preduvjeta stavki (besplatna, za svaku izmjenu kreatora).

Pokretanje:  .venv/bin/python nulta_check.py   →  out/nulta.json, out/nulta.md
"""
import json, os

import pipeline as P

MODEL = os.environ.get("MODEL", "anthropic/claude-haiku-5.5")
EFFORT = os.environ.get("EFFORT", "low")
TAG = os.environ.get("TAG", "nulta")
PREDZNANJE = ("osnovnoškolska matematika: računske operacije, razlomci, decimalni brojevi, postotci, omjeri i "
              "proporcionalnost, potencije i znanstveni zapis, linearne jednadžbe i preoblikovanje formula, sustavi "
              "dviju linearnih jednadžbi, Pitagorin poučak, opseg, površina i obujam osnovnih likova i tijela, "
              "koordinatni sustav i graf linearne funkcije, mjerne jedinice i pretvorbe")


def closure(L, lid, seen=None):
    seen = set() if seen is None else seen
    for q in L[lid]["preduvjeti"]:
        if q in L and q not in seen:
            seen.add(q)
            closure(L, q, seen)
    return seen


def main():
    plan, S = P.load("plan.json"), {s["id"]: s for s in P.load("stavke.json")}
    L = {l["id"]: l for l in plan["lekcije"]}
    where = {s: l["id"] for l in plan["lekcije"] for s in l["stavke"]}
    order = {l["id"]: i for i, l in enumerate(plan["lekcije"])}
    popis = "\n".join(f"{s} [{l['id']}] {S[s]['tekst']}" for l in plan["lekcije"] for s in l["stavke"])

    sys_ = ("Pomažeš provjeriti plan učenja fizike. Dobit ćeš CIJELI PLAN kao popis stavki znanja "
            "(id stavke, [lekcija], tekst) i jednu LEKCIJU.\n"
            "Zadatak: nađi pojmove IZ FIZIKE koje stavke te lekcije KORISTE kao već poznate, a lekcija ih sama ne uči. "
            "Za svaki takav pojam navedi id-ove SVIH stavki iz plana koje ga uče (ako ga uči više stavki, navedi sve).\n"
            "Pravila:\n"
            "- Ne navodi ono što stavke same lekcije uvode i objašnjavaju.\n"
            f"- Matematika iz PREDZNANJA nije pojam iz fizike: {PREDZNANJE}. Za nju piši \"predznanje\".\n"
            "- Svakodnevno znanje (vrijeme, udaljenost, brzina kao riječ iz svakodnevice) nije pojam iz fizike.\n"
            "- Ako pojam iz fizike ne uči nijedna stavka plana, piši \"nigdje\".\n"
            "- Navedi samo pojmove bez kojih se stavka stvarno ne može razumjeti, ne usputne spomene.\n"
            "- Opće znanje koje učenik ima iz svakodnevice i osnovne škole NIJE pojam koji treba prijaviti: atom, molekula, "
            "elektron, zvijezda, planet, galaksija, masa i težina kao riječi (kg), tekućina, plin i čvrsto tijelo, struja i "
            "baterija kao riječi, svjetlost, toplo i hladno. Prijavi ga samo ako stavka traži njegovu fizikalnu definiciju, "
            "formulu ili model.\n"
            "- Ako stavka sama objasni pojam (npr. „ionizacijska energija: energija potrebna da se elektron odvoji“), "
            "nije prekršaj.\n"
            "- Konstanta ili oznaka koja je dana u materijalu dostupnom na ispitu (npr. g, R, k_B, h, c) nije prekršaj "
            "ako je stavka samo koristi u formuli.\n"
            "- Pojam koji je samo jedan od primjera u nabrajanju (npr. „gravitacijska, Lorentzova, Coulombova sila…“) "
            "nije prekršaj; prijavi ga samo ako stavka bez njega gubi smisao.\n"
            'Vrati JSON {"koristi":[{"pojam":"kratko","stavka_lekcije":"id stavke ove lekcije koja ga koristi",'
            '"uci_ga":["id stavke iz plana", "…"] ili ["predznanje"] ili ["nigdje"]}]} ([] ako nema ničega).\n\n'
            "CIJELI PLAN:\n" + popis)

    def one(l):
        user = (f"LEKCIJA {l['id']}: {l['naziv']}\nSTAVKE LEKCIJE:\n"
                + "\n".join(f"{s} {S[s]['tekst']}" for s in l["stavke"]))
        try:
            out = P.chat(f"{TAG}-llm", MODEL, sys_, user, max_tokens=4000, reasoning=EFFORT, _try=int(os.environ.get("SEED", "0")))
        except Exception as e:
            return {"id": l["id"], "greska": str(e)[:200], "koristi": []}
        return {"id": l["id"], "koristi": out.get("koristi", [])}

    res = P.pmap(one, plan["lekcije"], workers=10)

    out, n_viol, n_rupa = [], 0, 0
    for l, r in zip(plan["lekcije"], res):
        known = set(l["stavke"]) | {s for q in closure(L, l["id"]) for s in L[q]["stavke"]}
        # kod: graf stavki
        kod = [{"stavka": s, "treba": p, "u_lekciji": where.get(p)} for s in l["stavke"]
               for p in S[s]["preduvjeti"] if p not in known]
        prek, rupe = [], []
        for k in r["koristi"]:
            u = k.get("uci_ga") or []
            u = [str(x).strip() for x in (u if isinstance(u, list) else [u])]
            if not u or "predznanje" in u or any(x in known for x in u):
                continue
            ids = sorted((x for x in u if x in where), key=lambda x: order[where[x]])
            if ids:  # najranija stavka koja ga uči
                prek.append({**k, "uci_ga": ids[0], "lekcija": where[ids[0]], "kasnije": order[where[ids[0]]] > order[l["id"]]})
            elif "nigdje" in u:
                rupe.append(k)
        n_viol += bool(prek)
        n_rupa += bool(rupe)
        out.append({"id": l["id"], "naziv": l["naziv"], "kod": kod, "prekrsaji": prek, "rupe": rupe,
                    "sirovo": r["koristi"], "greska": r.get("greska")})
    P.save(f"{TAG}.json", out)

    usage = [json.loads(x) for x in (P.CACHE / "costs.jsonl").read_text().splitlines()
             if json.loads(x)["step"] == f"{TAG}-llm"][-len(res):]
    cost = sum(u["usage"].get("cost") or 0 for u in usage)
    print(f"kod (graf stavki): {sum(bool(o['kod']) for o in out)} lekcija")
    print(f"LLM + kod: prekršaji u {n_viol} lekcija, rupe u {n_rupa} lekcija, greške {sum(bool(o['greska']) for o in out)}")
    print(f"trošak: {cost:.3f} $ za {len(res)} lekcija")

    md = [f"# Nulta pretpostavka ({MODEL}, {EFFORT})", "",
          f"Prekršaji u {n_viol} lekcija, rupe u {n_rupa} lekcija; trošak {cost:.3f} $.", ""]
    for o in out:
        if not (o["prekrsaji"] or o["rupe"] or o["kod"]):
            continue
        md.append(f"## {o['id']} {o['naziv']}")
        for k in o["prekrsaji"]:
            md.append(f"- PREKRŠAJ: „{k['pojam']}“ ({k['stavka_lekcije']}) uči {k['uci_ga']} u {k['lekcija']}"
                      f" ({'kasnije' if k['kasnije'] else 'ranije, ali nije preduvjet'})")
        for k in o["rupe"]:
            md.append(f"- RUPA: „{k['pojam']}“ ({k['stavka_lekcije']}) plan ne uči nigdje")
        for k in o["kod"]:
            md.append(f"- KOD: {k['stavka']} treba {k['treba']} iz {k['u_lekciji']}")
        md.append("")
    (P.OUT / f"{TAG}.md").write_text("\n".join(md))


if __name__ == "__main__":
    main()
