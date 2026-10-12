// PROTOTIP (ticket „UX uređivanja plana“): stanje plana samo u memoriji, bez backenda.
// Podaci su stvarni plan fizike iz prototipa izrade plana (135 lekcija); područja su ručno grupirana.
// Ponovna provjera i AI uputa su simulirani: provjera traje ~1 s i računa upozorenja lokalno,
// a AI uvijek predloži isti primjer izmjena.
import data from "./plan-data.json";

const fresh = () => ({
  predmet: data.predmet,
  status: "nacrt", // nacrt | potvrden
  podrucja: [{ id: "uvod", naziv: "Predznanje koje nedostaje" }, ...data.podrucja],
  cjeline: [{ id: "P00", podrucje: "uvod", naziv: "Prebačeno iz pretpostavljenog predznanja" }, ...data.cjeline],
  lekcije: data.lekcije.map((l) => ({ ...l, stavke: [...l.stavke], preduvjeti: [...l.preduvjeti] })),
  obrisane: {}, // id → naziv, da upozorenje zna ime obrisane lekcije
  predznanje: [...data.predznanje],
  nacin: "ucenje", // ucenje | brza
  nepokriveni: data.nepokriveni,
  provjera: "gotova", // u-tijeku | gotova
  zadnjaIzmjena: "—",
  prijedlog: null, // AI prijedlog koji čeka prihvaćanje
  chat: [],
  novi: 0,
});

export const plan = $state(fresh());

export function reset() {
  Object.assign(plan, fresh());
}

let timer;
function edited(opis) {
  plan.zadnjaIzmjena = opis;
  plan.provjera = "u-tijeku";
  clearTimeout(timer);
  timer = setTimeout(() => (plan.provjera = "gotova"), 1100);
}

export const byId = (id) => plan.lekcije.find((l) => l.id === id);
export const cjelinaOf = (id) => plan.cjeline.find((c) => c.id === id);
export const naziv = (id) => byId(id)?.naziv ?? plan.obrisane[id] ?? id;

export function rename(id, novi) {
  const l = byId(id);
  if (!l || !novi.trim() || novi === l.naziv) return;
  const stari = l.naziv;
  l.naziv = novi.trim();
  edited(`Preimenovano „${stari}“ → „${l.naziv}“`);
}

export function remove(id) {
  const l = byId(id);
  if (!l) return;
  plan.obrisane[id] = l.naziv;
  plan.lekcije = plan.lekcije.filter((x) => x.id !== id);
  edited(`Obrisano „${l.naziv}“`);
}

export function restore(id) {
  // samo za prototip: vraća obrisanu lekciju na kraj njezine cjeline
  const orig = data.lekcije.find((l) => l.id === id);
  if (!orig || byId(id)) return;
  const i = plan.lekcije.findLastIndex((l) => l.cjelina === orig.cjelina);
  plan.lekcije.splice(i + 1, 0, { ...orig, stavke: [...orig.stavke], preduvjeti: [...orig.preduvjeti] });
  delete plan.obrisane[id];
  edited(`Vraćeno „${orig.naziv}“`);
}

export function merge(aId, bId) {
  const a = byId(aId), b = byId(bId);
  if (!a || !b || a === b) return;
  a.naziv = `${a.naziv} + ${b.naziv}`;
  a.koncept = [a.koncept, b.koncept].filter(Boolean).join(" ");
  a.stavke = [...a.stavke, ...b.stavke];
  a.preduvjeti = [...new Set([...a.preduvjeti, ...b.preduvjeti])].filter((p) => p !== aId && p !== bId);
  plan.lekcije = plan.lekcije.filter((x) => x.id !== bId);
  for (const l of plan.lekcije)
    l.preduvjeti = [...new Set(l.preduvjeti.map((p) => (p === bId ? aId : p)))].filter((p) => p !== l.id);
  edited(`Spojeno u „${a.naziv}“`);
}

export function move(id, dir) {
  const i = plan.lekcije.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= plan.lekcije.length) return;
  if (plan.lekcije[j].cjelina !== plan.lekcije[i].cjelina) return; // samo unutar cjeline
  [plan.lekcije[i], plan.lekcije[j]] = [plan.lekcije[j], plan.lekcije[i]];
  edited(`Pomaknuto „${plan.lekcije[j].naziv}“ ${dir < 0 ? "gore" : "dolje"}`);
}

export function add(afterId, tekst, cjelina) {
  const i = afterId ? plan.lekcije.findIndex((l) => l.id === afterId) : -1;
  const id = `N${++plan.novi}`;
  const l = { id, cjelina: cjelina ?? plan.lekcije[i]?.cjelina ?? "P00", naziv: tekst, koncept: "", stavke: [], preduvjeti: [], nova: true };
  plan.lekcije.splice(i + 1, 0, l);
  edited(`Dodano „${tekst}“`);
  return id;
}

export function togglePrereq(id, pre) {
  const l = byId(id);
  if (!l || id === pre) return;
  l.preduvjeti = l.preduvjeti.includes(pre) ? l.preduvjeti.filter((p) => p !== pre) : [...l.preduvjeti, pre];
  edited(`Preduvjeti „${l.naziv}“ promijenjeni`);
}

export function neZnam(tekst) {
  plan.predznanje = plan.predznanje.filter((p) => p !== tekst);
  plan.lekcije.unshift({ id: `N${++plan.novi}`, cjelina: "P00", naziv: tekst, koncept: "", stavke: [], preduvjeti: [], nova: true });
  edited(`„${tekst}“ prebačeno iz predznanja u plan`);
}

export function dodajPredznanje(tekst) {
  if (!tekst.trim()) return;
  plan.predznanje = [...plan.predznanje, tekst.trim()];
  edited(`Dodano u predznanje: „${tekst.trim()}“`);
}

export function setNacin(n) {
  plan.nacin = n;
  edited(n === "brza" ? "Način učenja: brza priprema" : "Način učenja: učenje gradiva");
}

// AI uputa: u prototipu uvijek isti, stvarno izvedivi prijedlog
export function posaljiUputu(tekst) {
  if (!tekst.trim()) return;
  plan.chat = [...plan.chat, { tko: "kreator", tekst }];
  plan.prijedlog = null;
  setTimeout(() => {
    const ops = [];
    if (byId("B01.03") && byId("B01.04"))
      ops.push({ op: "merge", a: "B01.03", b: "B01.04", opis: `Spoji „${naziv("B01.03")}“ i „${naziv("B01.04")}“` });
    if (byId("B01.05"))
      ops.push({ op: "rename", id: "B01.05", naziv: "Slobodni pad i promjena smjera gibanja", opis: `Preimenuj „${naziv("B01.05")}“ u „Slobodni pad i promjena smjera gibanja“` });
    if (byId("B31.05")) ops.push({ op: "remove", id: "B31.05", opis: `Obriši „${naziv("B31.05")}“` });
    plan.prijedlog = { ops };
    plan.chat = [...plan.chat, { tko: "ai", tekst: ops.length ? `Predlažem ${ops.length} izmjene (simulirano u prototipu):` : "Nemam prijedloga.", prijedlog: true }];
  }, 900);
}

export function prihvatiPrijedlog() {
  for (const o of plan.prijedlog?.ops ?? []) {
    if (o.op === "merge") merge(o.a, o.b);
    if (o.op === "rename") rename(o.id, o.naziv);
    if (o.op === "remove") remove(o.id);
  }
  plan.prijedlog = null;
  plan.chat = [...plan.chat, { tko: "sustav", tekst: "Izmjene prihvaćene." }];
}

export function odbaciPrijedlog() {
  plan.prijedlog = null;
  plan.chat = [...plan.chat, { tko: "sustav", tekst: "Prijedlog odbačen." }];
}

export function potvrdi() {
  plan.status = "potvrden";
}

// Upozorenja ponovne provjere, računaju se lokalno
export function upozorenja() {
  const pos = Object.fromEntries(plan.lekcije.map((l, i) => [l.id, i]));
  const out = [];
  for (const l of plan.lekcije) {
    for (const p of l.preduvjeti) {
      if (plan.obrisane[p] && pos[p] === undefined)
        out.push({ vrsta: "nulta", id: l.id, pre: p, tekst: `„${l.naziv}“ koristi gradivo iz obrisane lekcije „${plan.obrisane[p]}“.` });
      else if (pos[p] > pos[l.id])
        out.push({ vrsta: "redoslijed", id: l.id, pre: p, tekst: `„${l.naziv}“ dolazi prije svog preduvjeta „${naziv(p)}“.` });
    }
    if (l.stavke.length > 6)
      out.push({ vrsta: "velicina", id: l.id, tekst: `„${l.naziv}“ ima ${l.stavke.length} stavki znanja; lekcija bi trebala imati najviše 6.` });
    if (l.nova)
      out.push({ vrsta: "nova", id: l.id, tekst: `„${l.naziv}“ je nova: stavke i preduvjete izradit će AI pri provjeri.` });
  }
  for (const n of plan.nepokriveni)
    out.push({ vrsta: "ispit", tekst: `Plan ne pokriva zadatak s ispita (${n.ispit}): ${n.zadatak}`, detalj: n.nedostaje });
  return out;
}

export const VRSTE = {
  nulta: { label: "Nulta pretpostavka", ozbiljno: true },
  redoslijed: { label: "Redoslijed", ozbiljno: true },
  velicina: { label: "Prevelika lekcija", ozbiljno: false },
  nova: { label: "Nova lekcija", ozbiljno: false },
  ispit: { label: "Nepokriven zadatak s ispita", ozbiljno: false },
};
