// pokus: epruveta u koju se doda reagens, pa se vidi opažanje (talog i njegova boja, mjehurići plina, promjena boje,
// zamućenje, obezbojenje, izlučeni metal, srebrno zrcalo, boja plamena). Autor zadaje samo ključeve tvari i reagensa;
// opažanje, jednadžbu, ponuđena opažanja s tipičnim krivima i poruke računa kod iz baze u _reakcije.js. Par koji nije
// u bazi validate odbija (bolje nego izmišljeno opažanje).
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";
import { tvari as tvariJednadzbe, izjednaci } from "./jednadzba.js";
import { seededShuffle } from "../../core/shuffle.js";
import { TVARI, tvar, pokus as rezultat, opis, potpis, produkt, imaPromjenu, ime, tex, uMd, BOJE } from "./_reakcije.js";

export const NACINI = ["istrazi", "opazanje", "dokazi", "prepoznaj"];
const POLJA = ["tip", "nacin", "tekst", "tvari", "reagensi", "tvar", "reagens", "opcije", "oznake"];
export const NAJVISE_EPRUVETA = 4;
const SLOVA = ["A", "B", "C", "D"];

export { rezultat, opis, tvar, ime };

// Kako tvar izgleda prije pokusa (za „dokazi“ i „prepoznaj“: kandidati moraju izgledati jednako, inače odgovor
// odaje već boja ili oblik).
export function izgled(t) {
  if (t.cestice.some((c) => c.startsWith("kov:"))) return `metal:${t.kljuc === "Cu" ? "crvenkast" : "siv"}`;
  return `${t.oblik === "tekucina" ? "otopina" : t.oblik}:${t.boja}`;
}

// „Nema vidljive promjene. Otopina ostaje modra.“ → „nema vidljive promjene, otopina ostaje modra“
const kratko = (o) => {
  const t = opis(o).replace(/\.$/, "").replace(/\. (\p{Lu})/gu, (_, c) => `, ${c.toLowerCase()}`);
  return t.charAt(0).toLowerCase() + t.slice(1);
};

// Jednadžba s koeficijentima za prikaz: {clanovi: [{k, f, st, strana}], strelica, iznad} ili null.
export function prikazJednadzbe(j) {
  const t = tvariJednadzbe(j);
  const koef = j.koeficijenti ?? (t.every((c) => !c.greska) ? izjednaci(t).koef : null);
  if (!koef) return null;
  return {
    clanovi: t.map((c, i) => ({ k: koef[i], f: c.formula ?? (i < j.reaktanti.length ? j.reaktanti[i] : j.produkti[i - j.reaktanti.length]), st: j.stanja?.[i] ?? null, strana: c.strana })),
    strelica: j.strelica ?? "→",
    iznad: j.iznad ?? null,
  };
}
// Jednadžba u formatu widgeta „jednadzba“ (za korak koji slijedi pokus), ili null.
export function jednadzbaPokusa(kT, kR) {
  const o = rezultat(kT, kR);
  return o.greska || !o.jednadzbe.length ? null : o.jednadzbe[0];
}

// ── savjet za krivi odgovor: uputa koja ne odaje opažanje ──
function uputa(o, T, R) {
  if (o.indikator) return `Je li ${T.naziv} kisela, neutralna ili lužnata otopina?`;
  if (o.plamen) return "Boju plamena daje kation metala u soli.";
  if (!o.reakcija) return `Provjeri reagira li ${R.naziv} uopće s tvari u epruveti.`;
  const [a, b] = o.cestice ?? [];
  const sve = [a, b].join(" ");
  if (/C=C|C≡C/.test(sve)) return "Ima li tvar dvostruku ili trostruku vezu?";
  if (/reducirajući|aldehid/.test(sve)) return "Ima li tvar slobodnu aldehidnu skupinu?";
  if (/protein|biuret/.test(sve)) return "Ima li tvar peptidne veze?";
  if (/škrob/.test(sve)) return "Što jod daje sa škrobom?";
  if (/ravnoteža/.test(sve) || /ravnoteža/.test(T.cestice.join(" "))) return "Kamo se pomiče ravnoteža?";
  if (/kov:/.test(sve)) return "Usporedi elektrodne potencijale s ispitnog lista (Voltin niz).";
  if (/^(Cl₂|Br₂|I₂)$/.test(a) || /^(Cl₂|Br₂|I₂)$/.test(b)) return "Koji je halogen jače oksidacijsko sredstvo?";
  if (a && b) return `Pomisli što nastaje kad se sretnu ${tex(a)} i ${tex(b)}.`;
  return "";
}

// ── opazanje: ponuđena opažanja ── [{kljuc, tekst, tocno, poruka}] redom kako ih kod složi (komponenta miješa)
const BOJE_TALOGA = ["bijela", "zuta", "plava", "crvenosmeda", "zelenkasta"];
function slicnost(X, T) {
  return X.cestice.filter((c) => T.cestice.includes(c)).length * 2 + (X.oblik === T.oblik ? 1 : 0);
}
export function opcijeOpazanja(s) {
  const T = tvar(s.tvar);
  const R = tvar(s.reagens);
  const o = rezultat(s.tvar, s.reagens);
  if (!T || !R || o.greska) return [];
  const n = Number.isInteger(s.opcije) ? s.opcije : 4;
  const u = uputa(o, T, R);
  const sa = (txt) => [txt, u].filter(Boolean).join(" ");
  const tocna = { kljuc: potpis(o), tekst: opis(o), tocno: true };
  const vidjeno = new Set([tocna.kljuc]);
  const tekstovi = new Set([tocna.tekst]);
  // isti pokus s drugom tvari u epruveti ili drugim reagensom; samo ako tekućina na početku izgleda jednako
  const iz = [];
  const strane = [
    ...TVARI.filter((X) => X !== T && X.oblik !== "postupak").map((X) => ({ X, o: rezultat(X.kljuc, R.kljuc), sl: slicnost(X, T), poruka: `Tako bi izgledalo da je u epruveti ${ime(X)}.` })),
    ...TVARI.filter((Y) => Y !== R && Y !== T).map((Y) => ({ X: Y, o: rezultat(T.kljuc, Y.kljuc), sl: slicnost(Y, R), poruka: Y.nakon ? `Tako bi izgledalo ${Y.nakon}.` : `Tako bi izgledalo da se doda ${ime(Y)}.` })),
  ];
  strane
    .map((x, i) => ({ ...x, i }))
    .filter((x) => !x.o.greska && x.o.boja.prije === o.boja.prije && !!x.o.plamen === !!o.plamen && !!x.o.indikator === !!o.indikator)
    .sort((a, b) => b.sl - a.sl || a.i - b.i)
    .forEach((x) => iz.push({ kljuc: potpis(x.o), tekst: opis(x.o), tocno: false, poruka: sa(x.poruka) }));
  const sint = (obs, poruka) => ({ kljuc: potpis(obs), tekst: opis(obs), tocno: false, poruka: sa(poruka) });
  const prazno = { boja: { prije: o.boja.prije, poslije: o.boja.prije } };
  const kandidati = [];
  kandidati.push(...iz.slice(0, 2));
  if (o.talog) {
    const c = BOJE_TALOGA.find((b) => b !== o.talog.boja && !iz.slice(0, 2).some((x) => x.kljuc.includes(`talog:${b}`)));
    if (c) kandidati.push(sint({ ...prazno, talog: { boja: c }, boja: o.boja }, `Talog nastaje, ali nije ${BOJE[c].m}.`));
  }
  if (!o.plamen) {
    if (!o.plin && !o.indikator) kandidati.push(sint({ ...prazno, plin: { formula: "?", jakost: 3 } }, "Ovdje se ne razvija plin."));
    if (imaPromjenu(o)) kandidati.push(sint(prazno, "Ovdje se vidi promjena."));
    if (!o.talog && !o.indikator) kandidati.push(sint({ ...prazno, talog: { boja: "bijela" } }, "Ovdje ne nastaje talog."));
  }
  kandidati.push(...iz.slice(2));
  const krive = [];
  for (const k of kandidati) {
    if (krive.length >= n - 1) break;
    if (vidjeno.has(k.kljuc) || tekstovi.has(k.tekst)) continue;
    vidjeno.add(k.kljuc);
    tekstovi.add(k.tekst);
    krive.push(k);
  }
  return [tocna, ...krive];
}
export const redOpcija = (s, opcije) => seededShuffle(opcije, JSON.stringify([s.tvar, s.reagens, s.tekst]));

// ── dokazi: koji reagensi razlikuju sve kandidate ──
export function usporedba(s, kR) {
  const os = s.tvari.map((k) => ({ T: tvar(k), o: rezultat(k, kR) }));
  for (let i = 0; i < os.length; i++)
    for (let j = i + 1; j < os.length; j++) if (!os[i].o.greska && potpis(os[i].o) === potpis(os[j].o)) return { razlikuje: false, par: [os[i], os[j]] };
  return { razlikuje: true, os };
}
export const dobriReagensi = (s) => (s.reagensi ?? []).filter((k) => usporedba(s, k).razlikuje);

const lista = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);

export const pokus = {
  tip: "pokus",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Pokus u epruveti: u tvar se doda reagens i vidi se opažanje (talog i boja, mjehurići plina, promjena boje, zamućenje, obezbojenje, izlučeni metal, srebrno zrcalo, boja plamena). Autor zadaje samo ključeve tvari i reagensa; opažanje, jednadžbu, ponuđena opažanja i poruke za krive odgovore računa kod iz baze reakcija.
Ključ tvari je formula („NaCl“, „AgNO₃“, „CuSO₄“, „HCl“, „NaOH“, „Mg“, „CaCO₃“, „CO₂“) ili naziv („glukoza“, „bromna voda“, „Fehlingov reagens“, „Tollensov reagens“, „biuretski reagens“, „Lugolova otopina“, „vapnena voda“, „fenolftalein“, „metiloranž“, „lakmus“, „univerzalni indikator“, „bjelanjak“, „škrob“, „propen“, „heksan“, „bakrovi kompleksi“). Postupci kao reagens: „plamen“ (boja plamena soli), „zagrijavanje“, „hlađenje“ (ravnoteže kompleksa). Par koji nije u bazi validate odbija i kaže zašto.
tekst, nacin:
- "istrazi" (nije zadatak): tvari: [ključ…] (1–${NAJVISE_EPRUVETA} epruvete, smiju se ponavljati, npr. tri epruvete iste otopine), reagensi: [ključ…] (1–6); učenik odabere reagens i doda ga u jednu ili sve epruvete, vidi animirano opažanje, objašnjenje i jednadžbu. oznake?: ["1","2","3"] natpisi epruveta (zadano bez natpisa);
- "opazanje": tvar, reagens; učenik bira što će se vidjeti. Ponuđena opažanja sastavlja kod: točno, isti reagens s drugim tvarima iz baze (npr. žuti talog jodida uz bijeli klorida), kriva boja taloga, plin umjesto taloga, „nema vidljive promjene“. opcije?: 3–5 (zadano 4). Animacija se vidi tek nakon točnog odgovora;
- "dokazi": tvari: [2–3 ključa] (kandidati koji izgledaju jednako, npr. ["NaCl","Na₂SO₄"] ili ["glukoza","saharoza"]), reagensi: [2–5 ključeva] ponuđenih reagensa; učenik bira reagens kojim ih razlikuje. Točan je svaki reagens koji svim kandidatima daje različito opažanje (kod računa koji su to; mora biti barem jedan točan i jedan krivi). Nakon izbora vidi se što taj reagens daje u svakoj epruveti;
- "prepoznaj": tvar (koja je stvarno u epruveti), reagens, tvari: [2–4 ključa] ponuđene (uključuje tvar; moraju izgledati jednako i s reagensom davati različita opažanja); učenik vidi opažanje i bira tvar.`,
  primjer: {
    tip: "pokus",
    nacin: "opazanje",
    tekst: "U epruveti je otopina kalcijeva klorida (nastala otapanjem ljuske jajeta u klorovodičnoj kiselini). U nju se dokapa otopina srebrova nitrata. Što će se vidjeti?",
    tvar: "CaCl₂",
    reagens: "AgNO₃",
  },
  primjeri: [
    {
      tip: "pokus",
      nacin: "istrazi",
      tekst: "Halogenidni i sulfatni ioni dokazuju se taloženjem. Odaberi reagens i dodaj ga u epruvete, pa usporedi opažanja.",
      tvari: ["NaCl", "NaBr", "NaI", "Na₂SO₄"],
      reagensi: ["AgNO₃", "BaCl₂"],
    },
    {
      tip: "pokus",
      nacin: "istrazi",
      tekst: "Ubaci jednako velike komadiće metala u razrijeđenu klorovodičnu kiselinu i u otopine soli. Kad se razvija vodik, a kad se izlučuje drugi metal?",
      tvari: ["Mg", "Zn", "Fe", "Cu"],
      reagensi: ["HCl", "CuSO₄", "AgNO₃"],
    },
    {
      tip: "pokus",
      nacin: "istrazi",
      tekst: "Kapni indikator u kiselinu, vodu i lužinu i usporedi boje.",
      tvari: ["HCl", "voda", "NaOH"],
      reagensi: ["fenolftalein", "metiloranž", "lakmus", "univerzalni indikator"],
    },
    {
      tip: "pokus",
      nacin: "istrazi",
      tekst: "Plavozelena otopina bakrovih kompleksa razdijeljena je u tri epruvete. Epruvetu 1 ostavi za usporedbu, epruvetu 2 zagrij u vrućoj vodi, a epruvetu 3 ohladi u ledu.",
      tvari: ["bakrovi kompleksi", "bakrovi kompleksi", "bakrovi kompleksi"],
      reagensi: ["zagrijavanje", "hlađenje", "voda"],
      oznake: ["1", "2", "3"],
    },
    {
      tip: "pokus",
      nacin: "istrazi",
      tekst: "Unesi sol svakog metala u plamen i usporedi boje plamena.",
      tvari: ["LiCl", "NaCl", "KCl", "BaCl₂"],
      reagensi: ["plamen"],
    },
    {
      tip: "pokus",
      nacin: "opazanje",
      tekst: "Plin koji nastaje otapanjem ljuske jajeta u klorovodičnoj kiselini uvodi se u vapnenu vodu. Što će se vidjeti?",
      tvar: "vapnena voda",
      reagens: "CO₂",
    },
    {
      tip: "pokus",
      nacin: "opazanje",
      tekst: "Plin propen uvodi se u smeđu jodnu vodu. Što će se vidjeti?",
      tvar: "jodna voda",
      reagens: "propen",
    },
    {
      tip: "pokus",
      nacin: "opazanje",
      tekst: "Komadić bakra uroni se u otopinu srebrova nitrata. Što će se vidjeti nakon nekog vremena?",
      tvar: "AgNO₃",
      reagens: "Cu",
    },
    {
      tip: "pokus",
      nacin: "dokazi",
      tekst: "U dvije epruvete su bezbojne otopine glukoze i saharoze, ali ne znaš u kojoj je koja. Kojim ćeš ih reagensom razlikovati?",
      tvari: ["glukoza", "saharoza"],
      reagensi: ["Lugolova otopina", "Fehlingov reagens", "biuretski reagens"],
    },
    {
      tip: "pokus",
      nacin: "dokazi",
      tekst: "U jednoj epruveti je otopina natrijeva klorida, a u drugoj natrijeva sulfata. Kojim reagensom ćeš ih razlikovati?",
      tvari: ["NaCl", "Na₂SO₄"],
      reagensi: ["HCl", "BaCl₂", "NaOH"],
    },
    {
      tip: "pokus",
      nacin: "prepoznaj",
      tekst: "U bezbojnu otopinu natrijeve soli dokapan je srebrov nitrat. Koja je sol bila u epruveti?",
      tvar: "NaBr",
      reagens: "AgNO₃",
      tvari: ["NaCl", "NaBr", "NaI"],
    },
    {
      tip: "pokus",
      nacin: "prepoznaj",
      tekst: "U bezbojnu otopinu dodana je natrijeva lužina i kap otopine bakrova(II) sulfata. Što je bilo u epruveti?",
      tvar: "bjelanjak",
      reagens: "biuretski reagens",
      tvari: ["glukoza", "škrob", "bjelanjak"],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    need(NACINI.includes(s.nacin), `pokus.nacin mora biti jedan od: ${NACINI.join(", ")}`);
    need(isText(s.tekst), "pokus treba „tekst“");
    for (const f of Object.keys(s)) need(POLJA.includes(f), `pokus nema polje „${f}“ (dopuštena: ${POLJA.slice(1).join(", ")})`);
    if (list.length) return list;

    const nadi = (k, gdje) => {
      const t = tvar(k);
      if (!t) need(false, `${gdje}: nepoznata tvar „${k}“${prijedlog(k)}`);
      return t;
    };
    const popis = (polje, od, doo) => {
      const v = s[polje];
      if (!need(Array.isArray(v) && v.length >= od && v.length <= doo, `${polje} je popis od ${od} do ${doo} ključeva tvari`)) return null;
      const t = v.map((k, i) => nadi(k, `${polje}[${i}]`));
      return t.every(Boolean) ? t : null;
    };
    const par = (kT, kR) => {
      const o = rezultat(kT, kR);
      need(!o.greska, `${kT} + ${kR}: ${o.greska}`);
      return o.greska ? null : o;
    };
    const bez = (...polja) => polja.forEach((p) => need(!(p in s), `način ${s.nacin} nema polje „${p}“`));
    const jednako = (t, polje) => need(new Set(t.map(izgled)).size === 1, `${polje}: kandidati se razlikuju već po izgledu (${t.map((x) => `${x.kljuc}: ${izgled(x).replace(/^.*:/, "")}`).join(", ")}), pa reagens nije potreban`);
    const razliciti = (t, polje) => need(new Set(t.map((x) => x.kljuc)).size === t.length, `${polje}: ista tvar je navedena dvaput`);

    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      bez("tvar", "reagens", "opcije");
      const T = popis("tvari", 1, NAJVISE_EPRUVETA);
      const R = popis("reagensi", 1, 6);
      if (R) razliciti(R, "reagensi");
      if (T && R) for (const t of T) for (const r of R) par(t.kljuc, r.kljuc);
      if (s.oznake != null) need(Array.isArray(s.oznake) && s.oznake.length === (s.tvari?.length ?? -1) && s.oznake.every((x) => isText(x) && x.length <= 4), "oznake su kratki natpisi epruveta (do 4 znaka), po jedan za svaku tvar");
      if (T && T.some((t) => t.oblik === "postupak")) need(false, "postupak (plamen, zagrijavanje, hlađenje) ide u reagense, a ne u epruvetu");
      return list;
    }
    if (s.nacin === "opazanje") {
      bez("tvari", "reagensi", "oznake");
      const T = nadi(s.tvar, "tvar");
      const R = nadi(s.reagens, "reagens");
      if (s.opcije != null) need(Number.isInteger(s.opcije) && s.opcije >= 3 && s.opcije <= 5, "opcije je broj ponuđenih opažanja, od 3 do 5");
      if (T && R && par(s.tvar, s.reagens)) need(opcijeOpazanja(s).length >= 3, `za ${s.tvar} + ${s.reagens} baza ne daje dovoljno različitih krivih opažanja`);
      return list;
    }
    if (s.nacin === "dokazi") {
      bez("tvar", "reagens", "opcije");
      const T = popis("tvari", 2, 3);
      const R = popis("reagensi", 2, 5);
      if (T) razliciti(T, "tvari");
      if (R) razliciti(R, "reagensi");
      if (!T || !R || list.length) return list;
      jednako(T, "tvari");
      for (const t of T) for (const r of R) par(t.kljuc, r.kljuc);
      if (list.length) return list;
      const dobri = dobriReagensi(s);
      need(dobri.length >= 1, `nijedan ponuđeni reagens ne razlikuje ${lista(s.tvari)}: dodaj reagens koji im daje različita opažanja`);
      need(dobri.length < s.reagensi.length, `svi ponuđeni reagensi razlikuju ${lista(s.tvari)}, pa izbor nije zadatak: dodaj i reagens koji ih ne razlikuje`);
      if (s.oznake != null) need(Array.isArray(s.oznake) && s.oznake.length === s.tvari.length && s.oznake.every((x) => isText(x) && x.length <= 4), "oznake su kratki natpisi epruveta (do 4 znaka), po jedan za svaku tvar");
      return list;
    }
    // prepoznaj
    bez("opcije", "reagensi", "oznake");
    const T = nadi(s.tvar, "tvar");
    nadi(s.reagens, "reagens");
    const K = popis("tvari", 2, 4);
    if (!T || !K || list.length) return list;
    razliciti(K, "tvari");
    need(K.includes(T), `tvari (ponuđene) moraju sadržavati tvar „${s.tvar}“`);
    jednako(K, "tvari");
    const o = par(s.tvar, s.reagens);
    for (const x of K) if (x !== T) {
      const ox = par(x.kljuc, s.reagens);
      if (o && ox) need(potpis(ox) !== potpis(o), `${x.kljuc} i ${T.kljuc} s ${s.reagens} izgledaju jednako (${kratko(o)}), pa se iz opažanja ne može zaključiti`);
    }
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "opazanje") {
      const op = opcijeOpazanja(s).find((x) => x.kljuc === odgovor);
      if (!op) return { tocno: false, poruka: "Odaberi jedno opažanje.", prazno: true };
      return op.tocno ? { tocno: true } : { tocno: false, poruka: uMd(op.poruka) };
    }
    if (s.nacin === "dokazi") {
      const R = tvar(odgovor);
      if (!R || !(s.reagensi ?? []).some((k) => tvar(k) === R)) return { tocno: false, poruka: "Odaberi jedan od ponuđenih reagensa.", prazno: true };
      const u = usporedba(s, R.kljuc);
      if (u.razlikuje) return { tocno: true };
      const [a, b] = u.par;
      return { tocno: false, poruka: uMd(`Kad se doda ${R.naziv}, ${a.T.naziv} i ${b.T.naziv} izgledaju jednako (${kratko(a.o)}), pa ih tim reagensom ne razlikuješ.`), reagens: R.kljuc };
    }
    if (s.nacin === "prepoznaj") {
      const X = tvar(odgovor);
      const T = tvar(s.tvar);
      if (!X || !(s.tvari ?? []).some((k) => tvar(k) === X)) return { tocno: false, poruka: "Odaberi jednu od ponuđenih tvari.", prazno: true };
      if (X === T) return { tocno: true };
      const ox = rezultat(X.kljuc, s.reagens);
      return { tocno: false, poruka: uMd(`Da je u epruveti ${ime(X)}, vidjelo bi se: ${kratko(ox)}.`) };
    }
    return { tocno: true };
  },

  tocanOdgovor(s) {
    if (s.nacin === "opazanje") {
      const o = rezultat(s.tvar, s.reagens);
      if (o.greska) return "";
      const p = produkt(o);
      return uMd(p ? opis(o).replace(".", ` (${tex(p)}).`) : opis(o));
    }
    if (s.nacin === "dokazi") {
      const dobri = dobriReagensi(s).map((k) => tvar(k));
      return uMd(
        dobri
          .map((R) => `${ime(R)} (${s.tvari.map((k) => `${tvar(k).naziv}: ${kratko(rezultat(k, R.kljuc))}`).join("; ")})`)
          .join(" ili "),
      );
    }
    if (s.nacin === "prepoznaj") return uMd(ime(tvar(s.tvar)));
    return "";
  },
};

// prijedlog za nepoznat ključ: slični ključevi iz baze
function prijedlog(k) {
  const x = String(k ?? "").toLowerCase().replace(/[^a-zčćđšž]/g, "");
  if (x.length < 2) return "";
  const slicni = TVARI.filter((t) => [t.kljuc, t.naziv, ...(t.aliasi ?? [])].some((n) => {
    const y = n.toLowerCase().replace(/[^a-zčćđšž]/g, "");
    return y.includes(x) || x.includes(y);
  })).slice(0, 6);
  return slicni.length ? ` (možda: ${slicni.map((t) => t.kljuc).join(", ")})` : "";
}
