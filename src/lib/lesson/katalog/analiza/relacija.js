// relacija: binarna relacija na konačnom skupu, kao tablica A×A (redak = prvi element, stupac = drugi) i/ili graf sa
// strelicama i petljama. Učenik nadopunjuje relaciju do najmanje s traženim svojstvima, označava svojstva ili razvrstava
// elemente u razrede ekvivalencije. Zatvorenje, svojstva, protuprimjere i particiju računa kod iz „parovi“.
import { isNum, formatNumber } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";

export const NACINI = ["prikaz", "nadopuni", "svojstva", "klase"];
export const SVOJSTVA = ["refleksivna", "simetricna", "antisimetricna", "tranzitivna"];
export const NAZIV_SVOJSTVA = { refleksivna: "refleksivna", simetricna: "simetrična", antisimetricna: "antisimetrična", tranzitivna: "tranzitivna" };
const CILJEVI = ["ekvivalencija", "refleksivna", "simetricna", "tranzitivna"];
const PRIKAZI = ["tablica", "graf"];
const NAJVISE_CRTEZ = 6; // tablica i graf: 6×6 je najviše što na 360 px stane s ćelijama od 40 px
const NAJVISE_KLASE = 12; // razvrstavanje bez crteža (relacija zadana pravilom u tekstu)

// ── elementi i parovi ─────────────────────────────────────────────────────────────────────────────
// Element je broj ili kratak naziv („a“, „∅“, „{1,2}“); uspoređuje se po zapisu, pa je 3 isto što i "3".
export const kljuc = (e) => String(e);
export const kljucPara = (a, b) => `${kljuc(a)}\u0000${kljuc(b)}`;
const jeElement = (e) => isNum(e) || (typeof e === "string" && e.trim().length > 0 && e.length <= 6);

// tekst elementa za crtež (hrvatski zapis broja: −1, 0,5)
export const tekstElementa = (e) => (isNum(e) ? formatNumber(e) : String(e));

// LaTeX elementa: broj kakav jest, jedno slovo u kurzivu, skupovni zapis s \{ \}, ostalo kao \text{}
export function texElementa(e) {
  if (isNum(e)) return formatNumber(e).replace("−", "-").replace(",", "{,}");
  const t = String(e);
  if (/^[A-Za-z]$/.test(t)) return t;
  if (/^[\d\s,{}∅a-zA-Z-]+$/.test(t)) return t.replace(/∅/g, "\\emptyset ").replace(/\{/g, "\\{").replace(/\}/g, "\\}").trim();
  return `\\text{${t.replace(/[{}\\]/g, "")}}`;
}
export const texPara = ([a, b]) => `$(${texElementa(a)}, ${texElementa(b)})$`;
export const imeRelacije = (s) => (isText(s.ime) ? s.ime : "\\rho");
const ime = (s) => `$${imeRelacije(s)}$`;

// skup elemenata u zadanom poretku; parovi se uvijek vraćaju s elementima iz skupa (ne iz unosa)
export function elementi(s) {
  return (Array.isArray(s.skup) ? s.skup : []).filter(jeElement);
}
function poKljucu(s) {
  return new Map(elementi(s).map((e) => [kljuc(e), e]));
}
// popis parova [[a, b]] → Set ključeva (parovi s nepoznatim elementima se preskaču)
function skupParova(s, parovi) {
  const E = poKljucu(s);
  const R = new Set();
  for (const p of Array.isArray(parovi) ? parovi : []) {
    if (Array.isArray(p) && p.length === 2 && E.has(kljuc(p[0])) && E.has(kljuc(p[1]))) R.add(kljucPara(p[0], p[1]));
  }
  return R;
}
export const skupRelacije = (s) => skupParova(s, s.parovi);
// Set ključeva → parovi u poretku tablice (redak po redak)
export function popisParova(s, R) {
  const E = elementi(s);
  return E.flatMap((a) => E.filter((b) => R.has(kljucPara(a, b))).map((b) => [a, b]));
}

// ── svojstva i protuprimjeri ──────────────────────────────────────────────────────────────────────
// Svaka funkcija vraća null kad svojstvo vrijedi, inače protuprimjer.
export function bezRefleksivnosti(E, R) {
  const x = E.find((a) => !R.has(kljucPara(a, a)));
  return x === undefined ? null : { fali: [x, x] };
}
export function bezSimetricnosti(E, R) {
  for (const a of E) for (const b of E) if (R.has(kljucPara(a, b)) && !R.has(kljucPara(b, a))) return { ima: [a, b], fali: [b, a] };
  return null;
}
export function bezAntisimetricnosti(E, R) {
  for (const [i, a] of E.entries()) for (const b of E.slice(i + 1)) if (R.has(kljucPara(a, b)) && R.has(kljucPara(b, a))) return { a, b };
  return null;
}
export function bezTranzitivnosti(E, R) {
  for (const a of E)
    for (const b of E) {
      if (!R.has(kljucPara(a, b))) continue;
      for (const c of E) if (R.has(kljucPara(b, c)) && !R.has(kljucPara(a, c))) return { ima: [[a, b], [b, c]], fali: [a, c] };
    }
  return null;
}
const PROTUPRIMJER = { refleksivna: bezRefleksivnosti, simetricna: bezSimetricnosti, antisimetricna: bezAntisimetricnosti, tranzitivna: bezTranzitivnosti };
export const ima = (E, R, svojstvo) => PROTUPRIMJER[svojstvo](E, R) == null;
export function svojstvaRelacije(s) {
  const [E, R] = [elementi(s), skupRelacije(s)];
  return SVOJSTVA.filter((p) => ima(E, R, p));
}

// cilj nadopune → popis svojstava (ekvivalencija = refleksivna + simetrična + tranzitivna)
export function svojstvaCilja(s) {
  const c = s.cilj ?? "ekvivalencija";
  const popis = Array.isArray(c) ? c : [c];
  return SVOJSTVA.filter((p) => p !== "antisimetricna" && (popis.includes(p) || popis.includes("ekvivalencija")));
}

// Najmanja relacija koja sadrži R i ima tražena svojstva: dodaje parove dok se ništa ne mijenja.
export function zatvorenje(E, R, svojstva) {
  const Z = new Set(R);
  for (let promjena = true; promjena; ) {
    promjena = false;
    const dodaj = (a, b) => {
      const k = kljucPara(a, b);
      if (!Z.has(k)) (Z.add(k), (promjena = true));
    };
    if (svojstva.includes("refleksivna")) for (const a of E) dodaj(a, a);
    if (svojstva.includes("simetricna")) for (const a of E) for (const b of E) if (Z.has(kljucPara(a, b))) dodaj(b, a);
    if (svojstva.includes("tranzitivna"))
      for (const a of E) for (const b of E) if (Z.has(kljucPara(a, b))) for (const c of E) if (Z.has(kljucPara(b, c))) dodaj(a, c);
  }
  return Z;
}
export const ciljnaRelacija = (s) => zatvorenje(elementi(s), skupRelacije(s), svojstvaCilja(s));
export const dodaniParovi = (s) => {
  const [R, Z] = [skupRelacije(s), ciljnaRelacija(s)];
  return popisParova(s, new Set([...Z].filter((k) => !R.has(k))));
};

// razredi ekvivalencije u poretku skupa (svaki razred u poretku skupa)
export function razredi(s) {
  const [E, R] = [elementi(s), skupRelacije(s)];
  const out = [];
  const raspor = new Set();
  for (const a of E) {
    if (raspor.has(kljuc(a))) continue;
    const r = E.filter((b) => R.has(kljucPara(a, b)));
    r.forEach((b) => raspor.add(kljuc(b)));
    out.push(r);
  }
  return out;
}
const texRazreda = (r) => `\\{${r.map(texElementa).join(", ")}\\}`;
const kljucParticije = (rs) =>
  rs
    .map((r) => r.map(kljuc).sort().join(","))
    .sort()
    .join("|");

// prikaz: "tablica" (zadano), "graf", oba, ili "nista" (samo svojstva i klase; relaciju tada opisuje tekst)
export function prikazi(s) {
  const p = s.prikaz ?? (s.nacin === "klase" && elementi(s).length > NAJVISE_CRTEZ ? "nista" : "tablica");
  if (p === "nista") return [];
  return (Array.isArray(p) ? p : [p]).filter((x) => PRIKAZI.includes(x));
}

// ── poruke ────────────────────────────────────────────────────────────────────────────────────────
function porukaNijeSvojstvo(s, svojstvo, E, R, oznacioSimetricnu) {
  const p = PROTUPRIMJER[svojstvo](E, R);
  const r = ime(s);
  if (svojstvo === "refleksivna") return { poruka: `Nije refleksivna: ${texPara(p.fali)} nije u ${r}.`, par: p.fali };
  if (svojstvo === "simetricna") return { poruka: `Nije simetrična: ${texPara(p.ima)} je u ${r}, a ${texPara(p.fali)} nije.`, par: p.fali };
  if (svojstvo === "antisimetricna") {
    const dodatak = !oznacioSimetricnu && !ima(E, R, "simetricna") ? " Antisimetrična ne znači „nije simetrična“." : "";
    return { poruka: `Nije antisimetrična: i ${texPara([p.a, p.b])} i ${texPara([p.b, p.a])} su u ${r}, a $${texElementa(p.a)} \\neq ${texElementa(p.b)}$.${dodatak}`, par: [p.a, p.b] };
  }
  return { poruka: `Nije tranzitivna: ${texPara(p.ima[0])} i ${texPara(p.ima[1])} su u ${r}, a ${texPara(p.fali)} nije.`, par: p.fali };
}

function porukaJestSvojstvo(s, svojstvo, E, R) {
  const r = ime(s);
  const izvan = [...R].filter((k) => !E.some((a) => k === kljucPara(a, a)));
  if (svojstvo === "refleksivna") return `Refleksivna jest: za svaki $x$ par $(x, x)$ je u ${r}.`;
  if (svojstvo === "simetricna") {
    if (!izvan.length) return `Simetrična jest: u ${r} nema para $(x, y)$ s $x \\neq y$, pa nijednom paru ne fali obrat.`;
    return `Simetrična jest: uz svaki par $(x, y)$ u ${r} je i $(y, x)$.`;
  }
  if (svojstvo === "antisimetricna") {
    if (ima(E, R, "simetricna")) return `Antisimetrična jest: nijedna dva različita elementa nisu povezana u oba smjera. Relacija smije biti i simetrična i antisimetrična.`;
    return `Antisimetrična jest: nema različitih $x$ i $y$ za koje su i $(x, y)$ i $(y, x)$ u ${r}.`;
  }
  const lanac = E.some((a) => E.some((b) => a !== b && R.has(kljucPara(a, b)) && E.some((c) => c !== b && R.has(kljucPara(b, c)))));
  if (!lanac) return `Tranzitivna jest: u ${r} nema lanca $(x, y)$, $(y, z)$ s $x \\neq y \\neq z$, pa uvjet nema što prekršiti.`;
  return `Tranzitivna jest: kad god su $(x, y)$ i $(y, z)$ u ${r}, u ${r} je i $(x, z)$.`;
}

// nadopuna: najprije višak (inače bi poruke o svojstvima vodile u još više suvišnih parova), pa prvo prekršeno svojstvo
function provjeriNadopunu(s, unos) {
  const E = elementi(s);
  const R = new Set([...skupRelacije(s), ...skupParova(s, unos)]);
  const Z = ciljnaRelacija(s);
  const visak = [...R].filter((k) => !Z.has(k));
  if (visak.length) {
    const koliko = visak.length === 1 ? "Jedan par nije potreban" : `Ima parova koji nisu potrebni (njih ${visak.length})`;
    return { tocno: false, poruka: `${koliko}: tražimo najmanju relaciju s traženim svojstvima.` };
  }
  if (R.size === Z.size) return { tocno: true };
  const cilj = svojstvaCilja(s);
  if (cilj.includes("refleksivna")) {
    const p = bezRefleksivnosti(E, R);
    if (p) {
      const [x] = p.fali;
      const zadana = skupRelacije(s);
      const sam = E.some((b) => zadana.has(kljucPara(x, b)) || zadana.has(kljucPara(b, x))) ? "" : ` I $${texElementa(x)}$, iako nije ni u jednom zadanom paru.`;
      return { tocno: false, poruka: `Fali ${texPara(p.fali)}: relacija mora biti refleksivna, pa je svaki element u relaciji sam sa sobom.${sam}`, par: p.fali };
    }
  }
  if (cilj.includes("simetricna")) {
    const p = bezSimetricnosti(E, R);
    if (p) return { tocno: false, poruka: `Fali ${texPara(p.fali)}: imaš ${texPara(p.ima)}, a relacija mora biti simetrična.`, par: p.fali };
  }
  const p = bezTranzitivnosti(E, R);
  return { tocno: false, poruka: `Fali ${texPara(p.fali)}: imaš ${texPara(p.ima[0])} i ${texPara(p.ima[1])}, a relacija mora biti tranzitivna.`, par: p.fali };
}

function provjeriSvojstva(s, unos) {
  if (!Array.isArray(unos)) return { tocno: false, poruka: "Označi svojstva koja relacija ima.", prazno: true };
  const [E, R] = [elementi(s), skupRelacije(s)];
  const ponudena = ponudenaSvojstva(s);
  const oznaceno = ponudena.filter((p) => unos.includes(p));
  const vrijedi = ponudena.filter((p) => ima(E, R, p));
  for (const p of oznaceno) if (!vrijedi.includes(p)) return { tocno: false, ...porukaNijeSvojstvo(s, p, E, R, oznaceno.includes("simetricna")) };
  for (const p of vrijedi) if (!oznaceno.includes(p)) return { tocno: false, poruka: porukaJestSvojstvo(s, p, E, R) };
  return { tocno: true };
}
export const ponudenaSvojstva = (s) => (Array.isArray(s.svojstva) ? SVOJSTVA.filter((p) => s.svojstva.includes(p)) : SVOJSTVA);

function provjeriKlase(s, unos) {
  const E = elementi(s);
  const R = skupRelacije(s);
  const K = poKljucu(s);
  if (!Array.isArray(unos) || !unos.every(Array.isArray)) return { tocno: false, poruka: "Razvrstaj elemente u razrede.", prazno: true };
  const gdje = new Map();
  for (const [i, r] of unos.entries())
    for (const e of r) {
      if (!K.has(kljuc(e))) return { tocno: false, poruka: `$${texElementa(e)}$ nije element skupa.` };
      if (gdje.has(kljuc(e))) return { tocno: false, poruka: `$${texElementa(e)}$ je u dva razreda, a svaki element pripada točno jednom razredu.`, elementi: [K.get(kljuc(e))] };
      gdje.set(kljuc(e), i);
    }
  const nije = E.find((e) => !gdje.has(kljuc(e)));
  if (nije !== undefined) return { tocno: false, poruka: `Razvrstaj sve elemente: $${texElementa(nije)}$ još nije ni u jednom razredu.`, prazno: true };
  const r = ime(s);
  // dva elementa istog razreda koja nisu u relaciji
  for (const a of E)
    for (const b of E)
      if (a !== b && gdje.get(kljuc(a)) === gdje.get(kljuc(b)) && !R.has(kljucPara(a, b)))
        return { tocno: false, poruka: `$${texElementa(a)}$ i $${texElementa(b)}$ ne idu u isti razred: ${texPara([a, b])} nije u ${r}.`, elementi: [a, b] };
  // povezani elementi u različitim razredima
  for (const a of E)
    for (const b of E)
      if (gdje.get(kljuc(a)) !== gdje.get(kljuc(b)) && R.has(kljucPara(a, b)))
        return { tocno: false, poruka: `$${texElementa(a)}$ i $${texElementa(b)}$ idu u isti razred: ${texPara([a, b])} je u ${r}.`, elementi: [a, b] };
  return { tocno: true };
}

// ── widget ────────────────────────────────────────────────────────────────────────────────────────
const A5 = [1, 2, 3, 4, 5];

export const relacija = {
  tip: "relacija",
  samoRucno: true,
  uloga: (s) => (s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR),
  istrazi: () => false,
  opis: `Binarna relacija na konačnom skupu: tablica A×A (redak = prvi element para, stupac = drugi; točka = par je u relaciji) i/ili
graf sa strelicama (petlja za (a, a)). Polja: tekst, skup (2–6 elemenata: brojevi ili kratki nazivi do 6 znakova, npr. "a", "∅", "{1,2}"),
parovi ([[a, b], …], barem jedan), ime? (LaTeX oznaka relacije, zadano "\\\\rho"), prikaz? ("tablica" zadano, "graf", ["tablica", "graf"];
u načinima svojstva i klase i "nista", kad relaciju opisuje tekst). nacin:
- "prikaz": samo crtež (Pogledaj); istakni?: [[a, b]] parovi koje treba istaknuti (par koji nije u relaciji crta se isprekidano, kao „fali“).
- "nadopuni": zadani parovi su zaključani, učenik dodirom ćelija dodaje parove do NAJMANJE relacije sa svojstvima cilj
  ("ekvivalencija" zadano, "refleksivna", "simetricna", "tranzitivna" ili popis njih). Tablica je uvijek prikazana (to je unos).
  Kod računa zatvorenje; poruka imenuje prvi par koji fali i svojstvo zbog kojeg fali, ili kaže da ima suvišnih parova.
  Zadani parovi ne smiju već imati sva tražena svojstva.
- "svojstva": učenik označi svojstva koja relacija ima (refleksivna, simetrična, antisimetrična, tranzitivna; svojstva? suzi ponudu,
  npr. ["simetricna", "antisimetricna"]). Kod računa svojstva; poruka za krivo daje protuprimjer iz parova.
- "klase": učenik razvrsta elemente u razrede ekvivalencije (dodir elementa pa dodir razreda ili „Novi razred“). Relacija mora biti
  ekvivalencija (svi parovi, i (a, a)). Ovdje skup smije imati do 12 elemenata; iznad 6 nema crteža (prikaz "nista"), pa tekst
  mora opisati relaciju. Poredak razreda nije bitan.
Točan odgovor računa kod; odgovor? (neobavezno: dodani parovi / popis svojstava / popis razreda) validate uspoređuje s izračunatim.`,
  primjer: {
    tip: "relacija",
    nacin: "nadopuni",
    tekst: "Nadopuni $\\rho$ najmanjim brojem parova do relacije ekvivalencije na $S = \\{1, 2, 3, 4, 5, 6\\}$.",
    skup: [1, 2, 3, 4, 5, 6],
    parovi: [[1, 4], [2, 5], [3, 3], [6, 3]],
    cilj: "ekvivalencija",
  },
  primjeri: [
    {
      tip: "relacija",
      nacin: "prikaz",
      tekst: "Relacija $x \\,\\rho\\, y \\iff y - x$ je neparan prirodan broj, na $A = \\{1, 2, 3, 4, 5\\}$. Par $(2, 5)$ je u $\\rho$, a $(5, 2)$ nije.",
      skup: A5,
      parovi: [[1, 2], [1, 4], [2, 3], [2, 5], [3, 4], [4, 5]],
      prikaz: ["tablica", "graf"],
      istakni: [[2, 5], [5, 2]],
    },
    {
      tip: "relacija",
      nacin: "svojstva",
      tekst: "Na $A = \\{1, 2, 3, 4\\}$ je $x \\,\\rho\\, y \\iff |x - y| \\le 1$. Koja svojstva ima $\\rho$?",
      skup: [1, 2, 3, 4],
      parovi: [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 2], [3, 3], [3, 4], [4, 3], [4, 4]],
    },
    {
      tip: "relacija",
      nacin: "svojstva",
      tekst: "Inkluzija $\\subseteq$ na $\\mathcal{P}(\\{1, 2\\})$. Koja svojstva ima?",
      ime: "\\subseteq",
      skup: ["∅", "{1}", "{2}", "{1,2}"],
      parovi: [["∅", "∅"], ["∅", "{1}"], ["∅", "{2}"], ["∅", "{1,2}"], ["{1}", "{1}"], ["{1}", "{1,2}"], ["{2}", "{2}"], ["{2}", "{1,2}"], ["{1,2}", "{1,2}"]],
      prikaz: "graf",
    },
    {
      tip: "relacija",
      nacin: "klase",
      tekst: "Na $A = \\{1, 2, 3, 4, 5, 6\\}$ je $x \\sim y$ kad $x$ i $y$ daju isti ostatak pri dijeljenju s 3. Razvrstaj elemente u razrede ekvivalencije.",
      ime: "\\sim",
      skup: [1, 2, 3, 4, 5, 6],
      parovi: [[1, 1], [1, 4], [4, 1], [4, 4], [2, 2], [2, 5], [5, 2], [5, 5], [3, 3], [3, 6], [6, 3], [6, 6]],
      prikaz: "graf",
    },
    {
      tip: "relacija",
      nacin: "klase",
      tekst: "Na $A = \\{1, 2, \\ldots, 10\\}$ je $x \\sim y$ kad $x^2$ i $y^2$ daju isti ostatak pri dijeljenju sa 6. Razvrstaj elemente u razrede.",
      ime: "\\sim",
      skup: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      parovi: (() => {
        const A = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        return A.flatMap((x) => A.filter((y) => (x * x) % 6 === (y * y) % 6).map((y) => [x, y]));
      })(),
    },
  ],
  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `relacija.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "relacija treba „tekst“ (pitanje ili opis)");
    if (s.ime != null) need(isText(s.ime), "ime mora biti LaTeX oznaka relacije, npr. \"\\\\rho\"");
    const najvise = s.nacin === "klase" ? NAJVISE_KLASE : NAJVISE_CRTEZ;
    if (!need(Array.isArray(s.skup) && s.skup.length >= 2 && s.skup.length <= najvise, `skup treba 2–${najvise} elemenata${s.nacin === "klase" ? "" : " (veća tablica ne stane na mobitel)"}`)) return list;
    s.skup.forEach((e, i) => need(jeElement(e), `skup[${i}] mora biti broj ili kratak naziv (do 6 znakova)`));
    need(new Set(s.skup.map(kljuc)).size === s.skup.length, "elementi skupa moraju biti različiti");
    const K = poKljucu(s);
    const parOk = (p) => Array.isArray(p) && p.length === 2 && K.has(kljuc(p[0])) && K.has(kljuc(p[1]));
    if (!need(Array.isArray(s.parovi) && s.parovi.length >= 1, "parovi su neprazan popis [[a, b], …]")) return list;
    s.parovi.forEach((p, i) => need(parOk(p), `parovi[${i}] nije par elemenata skupa: ${JSON.stringify(p)}`));
    need(skupParova(s, s.parovi).size === s.parovi.filter(parOk).length, "neki par se ponavlja u „parovi“");

    // prikaz
    const p = s.prikaz;
    if (p != null) {
      const popis = Array.isArray(p) ? p : [p];
      const smijeNista = s.nacin === "svojstva" || s.nacin === "klase";
      need(
        (p === "nista" && smijeNista) || (popis.length >= 1 && popis.length <= 2 && popis.every((x) => PRIKAZI.includes(x)) && new Set(popis).size === popis.length),
        `prikaz je "tablica", "graf" ili ["tablica", "graf"]${smijeNista ? ', ili "nista"' : ""}`,
      );
    }
    if (prikazi(s).length || s.nacin === "nadopuni") need(s.skup.length <= NAJVISE_CRTEZ, `tablica i graf imaju najviše ${NAJVISE_CRTEZ} elemenata; za veći skup u načinu „klase“ stavi prikaz "nista" i opiši relaciju u tekstu`);

    if (s.istakni != null) {
      if (need(s.nacin === "prikaz", "istakni smije samo u načinu „prikaz“ (u koraku „Tvoj red“ bi odao odgovor)"))
        need(Array.isArray(s.istakni) && s.istakni.length >= 1 && s.istakni.every(parOk), "istakni je popis parova elemenata skupa");
    }
    if (s.nacin !== "nadopuni") need(!("cilj" in s) || s.nacin === "prikaz", "cilj ide samo uz način „nadopuni“");
    if (s.nacin !== "svojstva") need(!("svojstva" in s), "svojstva idu samo uz način „svojstva“");

    const E = elementi(s);
    const R = skupRelacije(s);
    if (s.nacin === "prikaz") {
      noAnswerFields(s, need);
      return list;
    }
    if (s.nacin === "nadopuni") {
      const c = s.cilj ?? "ekvivalencija";
      const popis = Array.isArray(c) ? c : [c];
      if (!need(popis.length >= 1 && popis.every((x) => CILJEVI.includes(x)), `cilj je jedno od: ${CILJEVI.join(", ")} (ili popis); antisimetričnost se ne postiže dodavanjem parova`)) return list;
      const cilj = svojstvaCilja(s);
      need(!cilj.every((x) => ima(E, R, x)), "zadani parovi već imaju sva tražena svojstva, pa učenik nema što dodati");
      if (s.odgovor != null) {
        const tocno = popisParova(s, new Set([...ciljnaRelacija(s)].filter((k) => !R.has(k))));
        const njegov = skupParova(s, s.odgovor);
        const isto = Array.isArray(s.odgovor) && njegov.size === s.odgovor.length && njegov.size === tocno.length && tocno.every(([a, b]) => njegov.has(kljucPara(a, b)));
        need(isto, `odgovor (dodani parovi) se ne slaže s izračunatim zatvorenjem: dodaju se ${tocno.map(([a, b]) => `(${a},${b})`).join(", ")}`);
      }
      return list;
    }
    if (s.nacin === "svojstva") {
      if (s.svojstva != null)
        need(Array.isArray(s.svojstva) && s.svojstva.length >= 1 && s.svojstva.every((x) => SVOJSTVA.includes(x)) && new Set(s.svojstva).size === s.svojstva.length, `svojstva su popis od: ${SVOJSTVA.join(", ")}`);
      if (s.odgovor != null) {
        const tocno = ponudenaSvojstva(s).filter((x) => ima(E, R, x));
        const isto = Array.isArray(s.odgovor) && s.odgovor.length === tocno.length && tocno.every((x) => s.odgovor.includes(x));
        need(isto, `odgovor se ne slaže sa svojstvima relacije: ${tocno.length ? tocno.join(", ") : "nijedno"}`);
      }
      return list;
    }
    // klase
    for (const sv of ["refleksivna", "simetricna", "tranzitivna"]) {
      const pr = PROTUPRIMJER[sv](E, R);
      if (!pr) continue;
      const zasto = sv === "refleksivna" ? `fali (${pr.fali.join(",")})` : sv === "simetricna" ? `ima (${pr.ima.join(",")}), a fali (${pr.fali.join(",")})` : `ima (${pr.ima[0].join(",")}) i (${pr.ima[1].join(",")}), a fali (${pr.fali.join(",")})`;
      list.push(`u načinu „klase“ relacija mora biti ekvivalencija, a nije ${NAZIV_SVOJSTVA[sv]}: ${zasto}`);
    }
    if (s.odgovor != null) {
      const ok = Array.isArray(s.odgovor) && s.odgovor.every(Array.isArray) && kljucParticije(s.odgovor) === kljucParticije(razredi(s));
      need(ok, `odgovor se ne slaže s razredima relacije: ${razredi(s).map((r) => `{${r.join(",")}}`).join(" ")}`);
    }
    return list;
  },
  check(s, odgovor) {
    if (s.nacin === "nadopuni") return provjeriNadopunu(s, odgovor);
    if (s.nacin === "svojstva") return provjeriSvojstva(s, odgovor);
    if (s.nacin === "klase") return provjeriKlase(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "nadopuni") {
      const d = dodaniParovi(s);
      return `Dodaje se ${d.length === 1 ? "1 par" : `${d.length} ${d.length % 10 >= 2 && d.length % 10 <= 4 && (d.length % 100 < 12 || d.length % 100 > 14) ? "para" : "parova"}`}: ${d.map(texPara).join(", ")}.`;
    }
    if (s.nacin === "svojstva") {
      const da = ponudenaSvojstva(s).filter((p) => svojstvaRelacije(s).includes(p));
      if (!da.length) return "Nema nijedno od ponuđenih svojstava.";
      const n = da.map((p) => NAZIV_SVOJSTVA[p]);
      const t = n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} i ${n.at(-1)}`;
      return `${t[0].toUpperCase()}${t.slice(1)}.`;
    }
    if (s.nacin === "klase") return `Razredi: ${razredi(s).map((r) => `$${texRazreda(r)}$`).join(", ")}.`;
    return "";
  },
  // blizanac ne smije imati isti odgovor (validateLesson); kod svojstava je isti popis svojstava u redu
  kljucOdgovora(s) {
    if (s.nacin === "nadopuni") return `n:${[...ciljnaRelacija(s)].sort().join(";")}`;
    if (s.nacin === "klase") return `k:${kljucParticije(razredi(s))}`;
    return null;
  },
};
