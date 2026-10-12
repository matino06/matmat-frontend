"""PROTOTIP: HTML pregled Solovih prvih varijacija (sol1_write10.json) i Haikuovih 2.–4. po predlošku
(solhx_varijacije.json), s označenim malim greškama iz ručne provjere.

Pokretanje:  .venv/bin/python solhx_html.py   →  out/solhx-pregled.html
"""
import json

import pipeline as P

# (lekcija, varijacija): [(vrsta, točan tekst za označiti, komentar)]
# tekst se traži u običnom tekstu ili u TeX izvoru formule (tada se označi cijela formula)
MARKS = {
    ("B01.01", 1): [("sitnica", "priješla", "pravopis: „prešla“")],
    ("B01.05", 2): [("mala", "Loptica", "ostatak iz predloška; u ovoj varijaciji je kuglica")],
    ("B05.03", 3): [("mala", "Pri gubitku od 19", "suvišna rečenica, samo ponavlja 81 % iz prethodne")],
    ("B07.01", 3): [("mala", "355{,}73", "previše decimala za podatke s 2–3 značajne znamenke"),
                    ("mala", "489{,}13", "previše decimala"),
                    ("mala", "825{,}41", "previše decimala")],
    ("B07.04", 1): [("sitnica", "prikuplja podatke", "umjetan okvir d): satelit „prikuplja podatke“ za prikaz gibanja planeta")],
    ("B07.04", 2): [("mala", "Satelit iz nove orbite ostaje u orbiti iz c)", "nespretno, ponavlja isto dvaput")],
    ("B07.04", 3): [("mala", "1{,}0785", "previše decimala"),
                    ("mala", "Satelit iz nove orbite ostaje u orbiti iz c)",
                     "nespretno; u objašnjenju pitanje glasi drukčije nego u tekstu zadatka („Satelit ostaje u novoj orbiti iz c)“)")],
    ("B07.04", 4): [("sitnica", "prikuplja podatke", "umjetan okvir d), preuzet iz predloška")],
}


def main():
    tpls = P.load("sol1_write10.json")
    vars_ = P.load("solhx_varijacije.json")
    cards = []
    for t in tpls:
        rows = [(1, "Sol medium (predložak)", t)] + [
            (v["varijacija"], "Haiku xhigh po predlošku", v) for v in vars_ if v["lesson"] == t["lesson"]]
        for n, who, v in sorted(rows, key=lambda r: r[0]):
            marks = MARKS.get((t["lesson"], n), [])
            cards.append({"id": f"{t['lesson']}-{n}", "title": f"{t['lesson']} {t['naziv']} — varijacija {n}",
                          "who": who, "task": v["zadatak"], "expl": v["objasnjenje"], "ref": v["rezultati"],
                          "marks": [{"kind": k, "text": s, "note": c} for k, s, c in marks]})
    html = r"""<!doctype html><meta charset=utf-8><title>MatMat prototip: Sol medium + Haiku xhigh varijacije</title>
<link rel=stylesheet href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<style>body{font:16px/1.6 system-ui;max-width:900px;margin:2rem auto;padding:0 1rem;background:#111;color:#ddd}
a{color:#8af}.card{background:#1c1c22;border-radius:10px;padding:1rem 1.4rem;margin:1.5rem 0}
.card.has{border-left:4px solid #f5a623}h2{font-size:1.05rem;color:#9ab;margin-bottom:.2rem}.who{color:#888;font-size:.85rem}
details{margin-top:1rem}summary{cursor:pointer;color:#8af}
mark,.katex.mk{background:#f5a62355;color:inherit;border-bottom:2px solid #f5a623;border-radius:3px}
mark.sitnica,.katex.mk.sitnica{background:#4a90e244;border-color:#4a90e2}
.notes{margin:.5rem 0;padding:.5rem .8rem;background:#2a2418;border-radius:6px;font-size:.9rem}
.notes li{margin:.2rem 0}.tag{font-size:.75rem;padding:1px 6px;border-radius:8px;background:#f5a623;color:#111;margin-right:4px}
.tag.sitnica{background:#4a90e2}.ref{font-size:.85rem;color:#aaa}.ref td{padding:2px 8px;vertical-align:top}
#toc li{margin:.15rem 0}</style>
<h1 style="font-size:1.3rem">Sol medium (1. varijacija) + Haiku xhigh (2.–4. po predlošku) — 10 lekcija</h1>
<p>Ozbiljnih grešaka nema; računi su 30/30 točni. <mark>Narančasto</mark> = mala greška u Haikuovoj varijaciji,
<mark class=sitnica>plavo</mark> = sitnica u Solovu predlošku. Kartice s oznakama imaju narančasti rub, a objašnjenje
im je automatski otvoreno.</p>
<ul id=toc></ul>
<div id=root></div><script>
const md = window.markdownit({html:false});
function render(s) {  // formule zaštiti od markdowna, pa ih vrati kao KaTeX
  const math = [];
  s = s.replace(/\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g, (m, a, b) => {
    math.push(katex.renderToString(a || b, {displayMode: !!a, throwOnError: false})); return `@@M${math.length - 1}@@`; });
  return md.render(s).replace(/@@M(\d+)@@/g, (m, i) => math[i]);
}
function highlight(el, marks) {
  for (const mk of marks) {
    // formule: usporedi TeX izvor iz KaTeX anotacije
    el.querySelectorAll('.katex').forEach(k => {
      const a = k.querySelector('annotation');
      if (a && a.textContent.includes(mk.text)) { k.classList.add('mk', mk.kind); k.title = mk.note; }
    });
    // običan tekst
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {acceptNode: n =>
      n.parentElement.closest('.katex, .notes') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
    const hits = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.includes(mk.text)) hits.push(walker.currentNode);
    for (const node of hits) {
      const i = node.nodeValue.indexOf(mk.text);
      const r = node.splitText(i); r.splitText(mk.text.length);
      const m = document.createElement('mark'); m.className = mk.kind; m.title = mk.note;
      r.replaceWith(m); m.appendChild(r);
    }
  }
}
const data = __DATA__;
const root = document.getElementById('root'), toc = document.getElementById('toc');
for (const c of data) {
  const el = document.createElement('div'); el.className = 'card' + (c.marks.length ? ' has' : ''); el.id = c.id;
  const notes = c.marks.length ? `<ul class=notes>${c.marks.map(m =>
    `<li><span class="tag ${m.kind}">${m.kind === 'mala' ? 'mala greška' : 'sitnica'}</span><b>${m.text.replaceAll('{,}', ',')}</b> — ${m.note}</li>`).join('')}</ul>` : '';
  const ref = Object.entries(c.ref).map(([p, r]) => `<tr><td>${p})</td><td>${render(String(r)).replace(/^<p>|<\/p>\s*$/g, '')}</td></tr>`).join('');
  el.innerHTML = `<h2>${c.title}</h2><div class=who>${c.who}</div>${notes}` + render(c.task) +
    `<details ${c.marks.length ? 'open' : ''}><summary>Objašnjenje</summary>${render(c.expl)}</details>` +
    `<details><summary>Rezultati</summary><table class=ref>${ref}</table></details>`;
  highlight(el, c.marks);
  root.appendChild(el);
  if (c.id.endsWith('-1')) toc.insertAdjacentHTML('beforeend', `<li>${c.title.replace(/ — varijacija 1$/, '')}: ` +
    [1,2,3,4].map(n => `<a href="#${c.id.slice(0, -2)}-${n}">v${n}</a>`).join(' ') + '</li>');
  if (c.marks.length) toc.lastElementChild.querySelector(`a[href="#${c.id}"]`).insertAdjacentText('afterend', c.marks.some(m => m.kind === 'mala') ? ' 🟠' : ' 🔵');
}
</script>"""
    (P.OUT / "solhx-pregled.html").write_text(html.replace("__DATA__", json.dumps(cards, ensure_ascii=False)))
    print(P.OUT / "solhx-pregled.html", len(cards), "kartica")


if __name__ == "__main__":
    main()
