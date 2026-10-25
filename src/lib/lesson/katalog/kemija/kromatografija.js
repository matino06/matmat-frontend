// kromatografija: kromatografija na kredi, papiru ili tankoslojnoj pločici (lekcija 002 „Smjese, ekstrakcija,
// kromatografija“, pokus 2 ispitnog kataloga: ekstrakcija klorofila iz špinata i kromatografija ekstrakta).
// Crtež je skica „kromatogram“ iz taskSketch.js i spec je njezin (podloga, fronta, jedinica, mrlje [{udaljenost,
// boja, oznaka}], udaljenosti od startne linije); widget dodaje napredak otapala, više staza (uzorak i referencije),
// pogreške u postavljanju i ravnalo. Kod računa R_f = d₁ : d₂ svake mrlje, tipične krive vrijednosti (obrnut omjer,
// mjereno od donjeg ruba trake, udaljenost umjesto omjera, postotak, R_f druge mrlje, 1 − R_f), koje su referentne
// tvari u smjesi (mrlja na istoj visini i iste boje), je li uzorak čista tvar te koja se tvar najbolje otapa u
// otapalu (pokretnoj fazi) ili najjače veže za podlogu (nepokretnu fazu). Lekcija to piše tim riječima („tvar koja se
// jače veže za kredu zaostaje, a ona koja se bolje otapa u petroleteru putuje gotovo s njim“), pa i widget.
// Način „postupak“: razlozi koraka iz pokusa 2 (olovka, razina otapala, satno staklo, fronta, faze, o čemu ovisi R_f,
// usitnjavanje lišća); ponuđeni odgovori i poruke su u kodu.
import { isNum, parseNumber } from "../../core/number.js";
import { seededShuffle } from "../../core/shuffle.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";
import { SPOT } from "../../../sketch/taskSketch.js";

export const NACINI = ["istrazi", "rf", "prepoznaj", "postupak"];
export const PITANJA = ["tvari", "cista", "otapanje", "vezanje"];
export const BOJE = Object.keys(SPOT);
export const MJERENJA = ["kote", "ravnalo"];
const ZAJEDNICKA = ["tip", "nacin", "tekst", "podloga", "otapalo", "fronta", "jedinica", "mrlje"];
const POLJA = {
  istrazi: [...ZAJEDNICKA, "trake", "pogreske"],
  rf: [...ZAJEDNICKA, "trazi", "mjerenje", "start", "operacije"],
  prepoznaj: [...ZAJEDNICKA, "pitanje", "trake", "uzorak"],
  postupak: [...ZAJEDNICKA, "pitanje"],
};

// nepokretna faza: kako se zove i padeži za poruke
export const PODLOGE = {
  kreda: { ime: "kreda", gen: "krede", lok: "kredi", aku: "kredu", faza: "kreda" },
  papir: { ime: "papir", gen: "papira", lok: "papiru", aku: "papir", faza: "kromatografski papir" },
  plocica: { ime: "pločica", gen: "pločice", lok: "pločici", aku: "pločicu", faza: "tanki sloj na pločici" },
};
export const RF = "\\(R_\\mathrm{f}\\)"; // za markdown (poruke, točan odgovor), kao u objašnjenjima lekcije
const D1 = "d₁";
const D2 = "d₂";

export const podlogaOf = (s) => (s.podloga in PODLOGE ? s.podloga : "kreda");
export const otapaloOf = (s) => (isText(s.otapalo) ? s.otapalo.trim() : "petroleter");
export const jedinicaOf = (s) => s.jedinica ?? "cm";
export const ravnaloOf = (s) => s.nacin === "rf" && s.mjerenje === "ravnalo";
export const startOf = (s) => (isNum(s.start) ? s.start : 1);
export const stazeOf = (s) => (Array.isArray(s.trake) ? s.trake : null);
export const uzorakOf = (s) => (Number.isInteger(s.uzorak) ? s.uzorak : 0);

// Spec za crtež (chromatogramBody): pločica se crta kao papir; postupak bez mrlja dobije zelenu kap na startu.
export function crtezOf(s) {
  const fronta = isNum(s.fronta) && s.fronta > 0 ? s.fronta : 1;
  const mrlje = Array.isArray(s.mrlje) ? s.mrlje : s.nacin === "postupak" && !stazeOf(s) ? [{ udaljenost: 0.4 * fronta, boja: "zelena" }] : [];
  return { tip: "kromatogram", podloga: podlogaOf(s) === "kreda" ? "kreda" : "papir", fronta, jedinica: jedinicaOf(s), mrlje };
}

export const rfOf = (d, fronta) => d / fronta;
export const zapisRf = (v) => (isNum(v) ? v.toFixed(2).replace(".", ",") : "");
// udaljenosti kao na skici: sve s istim brojem decimala (8 uz 7,2 → „8,0“)
export function zapisD(s, v) {
  const sve = [s.fronta, ...[...(s.mrlje ?? []), ...(stazeOf(s) ?? []).flatMap((t) => t?.mrlje ?? [])].map((m) => m?.udaljenost)].filter(isNum);
  const dec = Math.max(0, ...sve.map((x) => (String(x).split(".")[1] ?? "").length));
  return `${v.toFixed(dec).replace(".", ",")}\u00a0${jedinicaOf(s)}`;
}
// očitanje na ravnalu (cm, jedna decimala)
export const zapisCm = (v) => `${(Math.round(v * 10) / 10).toFixed(1).replace(".", ",")}\u00a0cm`;

// „žuta“ → „žuta mrlja“, „A“ → „mrlja A“, bez oznake → „2. mrlja“
export function imeMrlje(m, i) {
  if (m?.oznaka && BOJE.includes(m.oznaka)) return `${m.oznaka} mrlja`;
  if (m?.oznaka) return `mrlja ${m.oznaka}`;
  return `${i + 1}. mrlja`;
}
export const oznakaRf = (m, i) => m?.oznaka ?? `${i + 1}.`;
// 1 mrlja, 2–4 mrlje, 5 mrlja
export const mrlja = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "mrlja" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "mrlje" : "mrlja"}`;

// koje mrlje se traže u načinu rf (indeksi); trazi: [indeks ili oznaka], zadano sve
export function trazeneOf(s) {
  const M = s.mrlje ?? [];
  if (!Array.isArray(s.trazi)) return M.map((_, i) => i);
  return s.trazi.map((t) => (Number.isInteger(t) ? t : M.findIndex((m) => m.oznaka === t)));
}

// ── R_f: točno i tipične krive vrijednosti ──
export function greskeRf(s, i) {
  const M = s.mrlje;
  const d1 = M[i].udaljenost;
  const d2 = s.fronta;
  const R = d1 / d2;
  const P = PODLOGE[podlogaOf(s)];
  const g = [];
  const add = (v, poruka, tol) => g.push({ vrijednost: v, poruka, tolerancija: tol ?? Math.max(0.006, 0.006 * Math.abs(v)) });
  add(d2 / d1, `Omjer je obrnut: ${RF} = ${D1} : ${D2}, udaljenost mrlje kroz udaljenost fronte otapala. Zato nikad nije veći od 1.`);
  if (ravnaloOf(s)) {
    const st = startOf(s);
    const z = zapisCm(st);
    add((d1 + st) / (d2 + st), `Obje udaljenosti mjere se od startne linije, a ne od donjeg ruba ${P.gen}: od očitanja mrlje i fronte oduzmi očitanje startne linije (${z}).`);
    add((d1 + st) / d2, `Udaljenost mrlje izmjerio si od donjeg ruba ${P.gen}, a mjeri se od startne linije: oduzmi ${z}.`);
    add(d1 / (d2 + st), `Udaljenost fronte izmjerio si od donjeg ruba ${P.gen}, a mjeri se od startne linije: oduzmi ${z}.`);
  }
  add(100 * R, `${RF} je omjer dviju udaljenosti, broj između 0 i 1 (npr. 0,45), a ne postotak.`, 0.6);
  add(d1, `To je udaljenost mrlje ${D1}. ${RF} je omjer ${D1} : ${D2} i nema jedinicu.`, 0.02);
  add(1 - R, `To je dio puta koji mrlja nije prešla. ${D1} se mjeri od startne linije do sredine mrlje.`);
  M.forEach((o, j) => j !== i && add(o.udaljenost / d2, `To je ${RF} druge mrlje (${imeMrlje(o, j)}).`));
  return g;
}

export const TOL_RF = 0.0075; // 0,9 = 0,90; zaokruženo na dvije decimale prolazi, 0,91 uz 0,90 ne

function provjeriRf(s, i, unos) {
  const m = s.mrlje[i];
  const R = m.udaljenost / s.fronta;
  let t = String(unos ?? "").trim();
  if (t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1).trim();
  if (!t) return { tocno: false, poruka: `Upiši ${RF} (decimalni broj, npr. 0,45).`, prazno: true };
  const n = parseNumber(t.replace(/\s*%$/, ""));
  if (!isNum(n)) return { tocno: false, poruka: `Upiši ${RF} kao broj (decimalni zarez je u redu, npr. 0,45).`, prazno: true };
  const blizu = (a, b, tol) => Math.abs(a - b) <= tol + 1e-12;
  if (blizu(n, R, TOL_RF)) return { tocno: true };
  const hit = greskeRf(s, i)
    .filter((k) => !blizu(k.vrijednost, R, TOL_RF))
    .find((k) => blizu(n, k.vrijednost, k.tolerancija));
  if (hit) return { tocno: false, poruka: hit.poruka };
  if (n > 1) return { tocno: false, poruka: `${RF} ne može biti veći od 1: nijedna tvar ne putuje dalje od otapala koje je nosi.` };
  if (n <= 0) return { tocno: false, poruka: `${RF} je pozitivan broj: mrlja je iznad startne linije.` };
  const decimala = (t.split(/[.,]/)[1] ?? "").length;
  if (decimala <= 1 && Math.abs(n - R) < 0.05) return { tocno: false, poruka: `Blizu je. Zaokruži na dvije decimale.` };
  return { tocno: false, poruka: `Podijeli udaljenost od startne linije do sredine mrlje (${D1}) s udaljenošću od startne linije do fronte otapala (${D2}).` };
}

// ── prepoznaj: koje referentne tvari su u uzorku ──
export const SKUPA = 0.015; // udio fronte: mrlje na toliko bliskoj visini imaju isti R_f
export const DALEKO = 0.07; // dovoljno daleko da se na crtežu jasno vidi razlika
const klasa = (m) => SPOT[m?.boja] ?? SPOT.siva;
export function podudaranja(s) {
  const T = stazeOf(s);
  if (!T) return [];
  const u = uzorakOf(s);
  const S = T[u]?.mrlje ?? [];
  return T.map((t, i) => {
    if (i === u) return null;
    const r = t.mrlje?.[0];
    if (!r || !S.length) return { i, naziv: t.naziv, u: false, blizina: 1, istaBoja: false };
    const x = S.reduce((a, b) => (Math.abs(b.udaljenost - r.udaljenost) < Math.abs(a.udaljenost - r.udaljenost) ? b : a));
    const blizina = Math.abs(x.udaljenost - r.udaljenost) / s.fronta;
    const istaBoja = klasa(x) === klasa(r);
    return { i, naziv: t.naziv, u: blizina <= SKUPA && istaBoja, blizina, istaBoja, mrlja: x, bojaKaoUzorak: S.some((y) => klasa(y) === klasa(r)) };
  }).filter(Boolean);
}
export const uSmjesi = (s) => podudaranja(s).filter((p) => p.u).map((p) => p.i);

// ── otapanje / vezanje: mrlja koja je otišla najdalje / najmanje ──
export function trazenaMrlja(s) {
  const M = s.mrlje ?? [];
  if (!M.length) return -1;
  const d = M.map((m) => m.udaljenost);
  return d.indexOf(s.pitanje === "vezanje" ? Math.min(...d) : Math.max(...d));
}

// ── postupak: razlozi koraka iz pokusa 2 ──
export const POSTUPCI = {
  olovka: {
    pitanje: "Zašto se startna linija povlači grafitnom olovkom, a ne kemijskom olovkom ili flomasterom?",
    tocno: "Grafit se ne otapa, a tinta bi se otopila i razdvojila u mrlje.",
    krivo: [
      ["Crta grafitnom olovkom je tanja, pa su izmjerene udaljenosti točnije.", "Debljina crte nije razlog. Pomisli što otapalo napravi s tintom kad dođe do nje."],
      ["Grafit upija otapalo, pa se ono brže i ravnomjernije diže uz traku.", "Tanka crta ne mijenja brzinu otapala. Važno je otapa li se crta u otapalu."],
      ["Tinta bi kemijski reagirala s uzorkom i promijenila boju mrlja.", "Nije riječ o reakciji. Tinta je i sama smjesa obojenih tvari koje se otapaju, pa bi otapalo i nju nosilo i razdvojilo."],
    ],
  },
  razina: {
    pitanje: "Zašto startna linija s uzorkom mora biti iznad razine otapala u čaši?",
    tocno: "Uzorak bi se otopio u otapalu u čaši umjesto da putuje uz traku.",
    krivo: [
      ["Da otapalo brže dođe do vrha trake i pokus kraće traje.", "Brzina otapala ne ovisi o tome gdje je startna linija. Pomisli što bi bilo s kapi uzorka uronjenom u otapalo."],
      ["Da se mrlje ne razmažu kad se traka izvadi iz čaše i suši.", "Vađenje ne razmaže mrlje. Važno je da uzorak ne završi otopljen u otapalu u čaši."],
      ["Da se startna linija bolje vidi kad se mjere udaljenosti.", "Vidljivost nije razlog. Što bi se dogodilo s uzorkom uronjenim u otapalo?"],
    ],
  },
  poklopac: {
    pitanje: "Zašto se čaša s otapalom tijekom kromatografije pokrije satnim staklom?",
    tocno: "Da otapalo ne hlapi i da manje njegovih para izlazi u prostoriju.",
    krivo: [
      ["Da u čašu ne ulazi svjetlo, koje razgrađuje obojene tvari.", "Satno staklo je prozirno, pa svjetlo prolazi. Pomisli na otapalo koje lako hlapi."],
      ["Da se otapalo ne zagrije od topline ruku i svjetiljke.", "Satno staklo ne hladi čašu. Petroleter lako hlapi: što poklopac sprječava?"],
      ["Da povećani tlak para u čaši potiskuje otapalo uz traku.", "Otapalo se uz traku diže samo od sebe (kao kava kroz kocku šećera), bez tlaka. Poklopac sprječava hlapljenje."],
    ],
  },
  fronta: {
    pitanje: "Zašto se fronta otapala označi olovkom odmah nakon vađenja trake iz čaše?",
    tocno: "Otapalo brzo ishlapi, pa se poslije ne vidi dokle je došlo.",
    krivo: [
      ["Da se mrlje prestanu gibati prema vrhu trake.", "Mrlje stanu same kad traka izađe iz otapala. Crta se povlači jer se mokri dio trake brzo osuši."],
      ["Jer se fronta i nakon vađenja iz čaše i dalje polako diže.", "Izvan čaše otapalo više ne dolazi. Problem je što ishlapi i granica nestane."],
      ["Da se fronta ne zamijeni sa startnom linijom pri mjerenju.", "Startna linija je pri dnu, a fronta pri vrhu, pa se ne zamijene. Crta je potrebna jer otapalo ishlapi i granica se izgubi."],
    ],
  },
  faze: {
    pitanje: "Što je u ovom pokusu pokretna, a što nepokretna faza?",
  },
  ovisnost: {
    pitanje: `O čemu ovisi ${RF}-vrijednost tvari?`,
    tocno: "O tvari, o otapalu i o nepokretnoj fazi (kreda, papir…).",
    krivo: [
      ["O tome koliko dugo traje kromatografija.", "Što dulje traje, i mrlja i fronta odu dalje, a njihov omjer ostaje isti."],
      ["O količini uzorka nanesenog na startnu liniju.", "Veća kap daje veću mrlju, ali tvar putuje jednako daleko u odnosu na otapalo."],
      [`Samo o tvari: tvar ima isti ${RF} u svakom otapalu.`, `Ista tvar u drugom otapalu ili na drugoj podlozi ima drugi ${RF}. Zato se tvari uspoređuju samo uz isti postupak.`],
    ],
  },
  usitnjavanje: {
    pitanje: "Zašto se listovi prije ekstrakcije usitne nožem i izgnječe u tarioniku?",
    tocno: "Da otapalo dođe do više stanica i otopi više obojenih tvari.",
    krivo: [
      ["Da se klorofil u lišću razgradi na jednostavnije obojene tvari.", "Gnječenjem se tvari ne razgrađuju, samo se lišće usitni. Što to omogućuje otapalu?"],
      ["Da smjesa lišća i otapala postane homogena.", "Smjesa je i dalje heterogena (komadići plutaju), zato se poslije filtrira. Usitnjavanje povećava dodir otapala sa stanicama."],
      ["Da se lišće brže osuši prije nanošenja na startnu liniju.", "Lišće se ne suši, nego se iz njega otapalom izvlače tvari. Što usitnjavanje mijenja za otapalo?"],
    ],
  },
};
export const pitanjePostupka = (s) => (isText(s.tekst) ? s.tekst : POSTUPCI[s.pitanje]?.pitanje ?? "");

// ponuđeni odgovori [{kljuc, tekst, tocno, poruka}], redom kako ih složi kod (komponenta ih miješa)
export function opcijePostupka(s) {
  const P = POSTUPCI[s.pitanje];
  if (!P) return [];
  if (s.pitanje === "faze") {
    const ot = otapaloOf(s);
    const nep = PODLOGE[podlogaOf(s)].faza;
    return [
      { kljuc: "t", tekst: `pokretna faza: ${ot}; nepokretna faza: ${nep}`, tocno: true },
      { kljuc: "k0", tekst: `pokretna faza: ${nep}; nepokretna faza: ${ot}`, poruka: `Obrnuto: pokretna faza se giba (${ot} puzi uz traku i nosi tvari), a nepokretna stoji.` },
      { kljuc: "k1", tekst: `pokretna faza: uzorak (ekstrakt); nepokretna faza: ${nep}`, poruka: `Uzorak se ne giba sam: nosi ga otapalo. Pokretna faza je ${ot}.` },
      { kljuc: "k2", tekst: `pokretna faza: ${ot}; nepokretna faza: staklena čaša`, poruka: `Čaša samo drži otapalo. Nepokretna faza je ono uz što otapalo putuje i za što se tvari vežu.` },
    ];
  }
  return [{ kljuc: "t", tekst: P.tocno, tocno: true }, ...P.krivo.map(([tekst, poruka], i) => ({ kljuc: `k${i}`, tekst, poruka }))];
}
export const redOpcija = (s, op) => seededShuffle(op, JSON.stringify([s.pitanje, s.tekst ?? "", s.otapalo ?? "", s.podloga ?? ""]));
// otapanje / vezanje: mrlje izmiješane (da odgovor nije uvijek prva ili zadnja mrlja)
export const redMrlja = (s) => seededShuffle((s.mrlje ?? []).map((_, i) => i), JSON.stringify([s.mrlje, s.tekst ?? ""]));

// ── provjera speca ──
function provjeriMrlje(mrlje, fronta, need, gdje, { oznake = false } = {}) {
  if (!need(Array.isArray(mrlje) && mrlje.length >= 1 && mrlje.length <= 5, `${gdje} je popis od 1 do 5 mrlja {udaljenost, boja?, oznaka?}`)) return false;
  let ok = true;
  mrlje.forEach((m, i) => {
    const at = `${gdje}[${i}]`;
    if (!need(m && typeof m === "object", `${at} mora biti {udaljenost, boja?, oznaka?}`)) return (ok = false);
    for (const k of Object.keys(m)) need(["udaljenost", "boja", "oznaka"].includes(k), `${at} nema polje „${k}“ (dopuštena: udaljenost, boja, oznaka)`);
    if (!need(isNum(m.udaljenost) && isNum(fronta) && m.udaljenost > 0 && m.udaljenost < fronta, `${at}.udaljenost mora biti broj veći od 0 i manji od fronte (${fronta}), mjereno od startne linije`)) ok = false;
    else {
      need(m.udaljenost >= 0.05 * fronta, `${at}: mrlja na ${m.udaljenost} preblizu je startnoj liniji (najmanje 5 % fronte), na crtežu se ne odvaja od starta`);
      need(m.udaljenost <= 0.98 * fronta, `${at}: mrlja na ${m.udaljenost} preblizu je fronti (najviše 98 % fronte)`);
    }
    if (m.boja != null) need(BOJE.includes(m.boja), `${at}.boja mora biti jedna od: ${BOJE.join(", ")}`);
    if (m.oznaka != null) need(isText(m.oznaka) && m.oznaka.length <= 12, `${at}.oznaka je kratak natpis (do 12 znakova), npr. „žuta“ ili „A“`);
    if (oznake) need(isText(m.oznaka), `${at} treba oznaku (po njoj učenik zna o kojoj je mrlji riječ)`);
  });
  if (!ok) return false;
  const d = mrlje.map((m) => m.udaljenost).sort((a, b) => a - b);
  for (let i = 1; i < d.length; i++) need(d[i] - d[i - 1] >= 0.08 * fronta, `${gdje}: mrlje na ${d[i - 1]} i ${d[i]} preblizu su (najmanje 8 % fronte), na crtežu se preklapaju`);
  const oz = mrlje.map((m) => m.oznaka).filter(Boolean);
  need(new Set(oz).size === oz.length, `${gdje}: oznake mrlja moraju biti različite`);
  return true;
}
const desetinka = (v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6;

export const kromatografija = {
  tip: "kromatografija",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Kromatografija na kredi, papiru ili tankoslojnoj pločici (pokus 2: ekstrakt lišća na kredi u petroleteru). Crtež je skica „kromatogram“ i spec je njezin: podloga?: "kreda" | "papir" | "plocica" (zadano kreda), fronta (udaljenost fronte otapala od startne linije), jedinica?: "cm" | "mm" (zadano cm), mrlje: [{udaljenost (od startne linije do sredine mrlje), boja?: ${BOJE.join(" | ")} (zadano siva), oznaka?: kratak natpis uz mrlju, npr. "žuta"}] (1–5 mrlja, razmak barem 8 % fronte). otapalo?: naziv pokretne faze (zadano "petroleter"). Udaljenosti se prikazuju s jednakim brojem decimala (8 uz 7,2 → 8,0 cm), kao u skici. Kod računa R_f = d₁ : d₂ i sve poruke.
tekst, nacin:
- "istrazi" (nije zadatak): učenik nanese uzorak i pusti otapalo; fronta se diže, mrlje se razdvajaju, na kraju kote d₁, d₂ i R_f svake mrlje (s formulom). trake?: [{naziv (do 8 znakova), mrlje}] (2–4 uzorka jedan do drugog na papiru ili pločici, umjesto mrlje; učenik bira koje uzorke nanosi). pogreske?: true doda prekidače „startna linija ispod razine otapala“ (uzorak se otopi u čaši) i „crta kemijskom olovkom“ (i tinta se razdvoji);
- "rf": učenik upiše R_f mrlja. trazi?: [indeks ili oznaka mrlje] (zadano sve; uz više mrlja svaka tražena treba oznaku). mjerenje?: "kote" (zadano: na crtežu su d₁ i d₂ kao u skici, iz teksta zadatka) | "ravnalo" (traka je izvađena i položena uz ravnalo kojemu je 0 na donjem rubu trake; učenik dodirom očita startnu liniju, mrlje i frontu i sam oduzme; start?: udaljenost startne linije od donjeg ruba u cm, zadano 1; sve vrijednosti u cm na jednu decimalu). operacije?: true pokaže R_f = d₁ : d₂ već prije provjere (inače tek nakon). Kod prepoznaje obrnut omjer, mjereno od donjeg ruba trake, postotak, udaljenost umjesto omjera, 1 − R_f, R_f druge mrlje i R_f veći od 1;
- "prepoznaj": pitanje: "tvari" (trake: [{naziv, mrlje}] 3–5 staza na papiru ili pločici: uzorak (uzorak?: indeks staze, zadano 0) i referentne čiste tvari s po jednom mrljom; učenik označi koje su tvari u uzorku; kod računa: referencija je u uzorku ako uzorak ima mrlju na istoj visini i iste boje; barem jedna referencija koje nema u uzorku mora biti iste boje kao neka mrlja uzorka, da se odgovor ne čita samo iz boje — npr. sve mrlje "ljubičasta" kao aminokiseline s ninhidrinom) | "cista" (mrlje: čista tvar ili smjesa; jedna mrlja = čista tvar) | "otapanje" (mrlje s oznakama, barem 2: koja se tvar najbolje otapa u otapalu, putuje najdalje) | "vezanje" (koja se tvar najjače veže za podlogu, najviše zaostaje);
- "postupak": pitanje: "olovka" (zašto startna linija grafitnom olovkom) | "razina" (zašto iznad razine otapala) | "poklopac" (satno staklo) | "fronta" (zašto se fronta odmah označi) | "faze" (pokretna i nepokretna faza, iz otapalo i podloga) | "ovisnost" (o čemu ovisi R_f) | "usitnjavanje" (zašto se lišće usitni prije ekstrakcije); ponuđeni razlozi i poruke su u kodu, tekst je neobavezan (zadano pitanje iz koda); mrlje i fronta neobavezno (crtež pokusa prije puštanja otapala).`,
  primjer: {
    tip: "kromatografija",
    nacin: "rf",
    tekst: "Petroleter se od startne linije podigao 8,0 cm, a na kredi su nastale žuta mrlja na 7,2 cm i zelena na 3,2 cm od startne linije. Izračunaj \\(R_\\mathrm{f}\\)-vrijednosti mrlja.",
    podloga: "kreda",
    fronta: 8,
    mrlje: [
      { udaljenost: 7.2, boja: "žuta", oznaka: "žuta" },
      { udaljenost: 3.2, boja: "zelena", oznaka: "zelena" },
    ],
  },
  primjeri: [
    {
      tip: "kromatografija",
      nacin: "istrazi",
      tekst: "Zeleni ekstrakt špinata nanesen je na startnu liniju krede, a kreda je uspravljena u čašu s petroleterom. Pusti otapalo i gledaj kako se ekstrakt razdvaja. Uključi i pogrešku pa usporedi.",
      podloga: "kreda",
      fronta: 8,
      mrlje: [
        { udaljenost: 7.2, boja: "žuta", oznaka: "žuta" },
        { udaljenost: 3.2, boja: "zelena", oznaka: "zelena" },
      ],
      pogreske: true,
    },
    {
      tip: "kromatografija",
      nacin: "istrazi",
      tekst: "Na startnu liniju kromatografskog papira naneseni su ekstrakti lišća peršina i mrkve. Odaberi uzorke, pusti petroleter i usporedi mrlje.",
      podloga: "papir",
      fronta: 10,
      trake: [
        { naziv: "peršin", mrlje: [{ udaljenost: 8.8, boja: "narančasta" }, { udaljenost: 3.5, boja: "zelena" }] },
        { naziv: "mrkva", mrlje: [{ udaljenost: 8.8, boja: "narančasta" }] },
      ],
    },
    {
      tip: "kromatografija",
      nacin: "rf",
      tekst: "Traka papira izvađena je iz čaše s petroleterom i položena uz ravnalo. Dodirni oznake da očitaš ravnalo, pa izračunaj \\(R_\\mathrm{f}\\)-vrijednost zelene mrlje.",
      podloga: "papir",
      fronta: 10,
      mrlje: [
        { udaljenost: 8.8, boja: "narančasta", oznaka: "narančasta" },
        { udaljenost: 3.5, boja: "zelena", oznaka: "zelena" },
      ],
      trazi: ["zelena"],
      mjerenje: "ravnalo",
      start: 1,
    },
    {
      tip: "kromatografija",
      nacin: "prepoznaj",
      pitanje: "tvari",
      tekst: "Na startnu liniju papira naneseni su uzorak i tri čiste tvari A, B i C. Nakon kromatografije papir je poprskan otopinom ninhidrina, pa su se mrlje obojile ljubičasto. Koje su tvari u uzorku?",
      podloga: "papir",
      fronta: 8,
      trake: [
        { naziv: "uzorak", mrlje: [{ udaljenost: 5.6, boja: "ljubičasta" }, { udaljenost: 2.0, boja: "ljubičasta" }] },
        { naziv: "A", mrlje: [{ udaljenost: 5.6, boja: "ljubičasta" }] },
        { naziv: "B", mrlje: [{ udaljenost: 3.6, boja: "ljubičasta" }] },
        { naziv: "C", mrlje: [{ udaljenost: 2.0, boja: "ljubičasta" }] },
      ],
    },
    {
      tip: "kromatografija",
      nacin: "prepoznaj",
      pitanje: "cista",
      tekst: "Ekstrakt lišća koprive na kredi u petroleteru dao je kromatogram na slici. Je li ekstrakt čista tvar?",
      podloga: "kreda",
      fronta: 6,
      mrlje: [
        { udaljenost: 5.7, boja: "žuta", oznaka: "žuta" },
        { udaljenost: 2.7, boja: "zelena", oznaka: "zelena" },
      ],
    },
    {
      tip: "kromatografija",
      nacin: "prepoznaj",
      pitanje: "otapanje",
      tekst: "Na slici je kreda nakon kromatografije ekstrakta lišća blitve u petroleteru. Koja se tvar iz ekstrakta najbolje otapa u petroleteru?",
      podloga: "kreda",
      fronta: 7.5,
      mrlje: [
        { udaljenost: 6.9, boja: "žuta", oznaka: "žuta" },
        { udaljenost: 2.4, boja: "zelena", oznaka: "zelena" },
      ],
    },
    {
      tip: "kromatografija",
      nacin: "prepoznaj",
      pitanje: "vezanje",
      tekst: "Na slici je papir nakon kromatografije ekstrakta lišća kelja u petroleteru. Koja se tvar najjače veže za papir?",
      podloga: "papir",
      fronta: 9,
      mrlje: [
        { udaljenost: 8.6, boja: "žuta", oznaka: "žuta" },
        { udaljenost: 4.5, boja: "zelena", oznaka: "zelena" },
      ],
    },
    { tip: "kromatografija", nacin: "postupak", pitanje: "razina", podloga: "kreda" },
    { tip: "kromatografija", nacin: "postupak", pitanje: "olovka", podloga: "papir" },
    { tip: "kromatografija", nacin: "postupak", pitanje: "faze", podloga: "kreda", otapalo: "petroleter" },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `kromatografija.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    const dopustena = POLJA[s.nacin];
    for (const f of Object.keys(s)) need(dopustena.includes(f), `kromatografija (${s.nacin}) nema polje „${f}“ (dopuštena: ${dopustena.slice(2).join(", ")})`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (s.nacin === "postupak") {
      if (s.tekst != null) need(isText(s.tekst), "tekst mora biti tekst (ili ga izostavi: pitanje je u kodu)");
    } else need(isText(s.tekst), "kromatografija treba „tekst“");
    if (s.podloga != null) need(s.podloga in PODLOGE, `podloga mora biti jedna od: ${Object.keys(PODLOGE).join(", ")}`);
    if (s.otapalo != null) need(isText(s.otapalo) && s.otapalo.length <= 30, "otapalo je kratak naziv pokretne faze, npr. „petroleter“");
    if (s.jedinica != null) need(["cm", "mm"].includes(s.jedinica), "jedinica je „cm“ ili „mm“");
    if (list.length) return list;

    const trake = stazeOf(s);
    const smijuTrake = s.nacin === "istrazi" || (s.nacin === "prepoznaj" && s.pitanje === "tvari");
    if (s.trake != null && !smijuTrake) need(false, "trake (više uzoraka) idu samo u istrazi i prepoznaj s pitanjem „tvari“");
    if (s.nacin === "prepoznaj") {
      if (!need(PITANJA.includes(s.pitanje), `prepoznaj.pitanje mora biti jedno od: ${PITANJA.join(", ")}`)) return list;
      if (s.uzorak != null) need(s.pitanje === "tvari", "uzorak (indeks staze) ide samo uz pitanje „tvari“");
    }
    if (s.nacin === "postupak" && !need(s.pitanje in POSTUPCI, `postupak.pitanje mora biti jedno od: ${Object.keys(POSTUPCI).join(", ")}`)) return list;
    if (list.length) return list;

    // podaci kromatograma
    const trebaPodatke = s.nacin !== "postupak" || s.mrlje != null || s.fronta != null;
    if (trebaPodatke && !need(isNum(s.fronta) && s.fronta > 0, "fronta (udaljenost fronte otapala od startne linije) mora biti pozitivan broj")) return list;
    if (trake) {
      need(s.mrlje == null, "zadaj ili mrlje (jedan uzorak) ili trake (više uzoraka), ne oboje");
      need(s.podloga === "papir" || s.podloga === "plocica", "više staza stane samo na papir ili pločicu: podloga „papir“ ili „plocica“");
      const [od, doo] = s.nacin === "istrazi" ? [2, 4] : [3, 5];
      if (!need(trake.length >= od && trake.length <= doo, `trake je popis od ${od} do ${doo} staza {naziv, mrlje}`)) return list;
      trake.forEach((t, i) => {
        if (!need(t && typeof t === "object", `trake[${i}] mora biti {naziv, mrlje}`)) return;
        for (const k of Object.keys(t)) need(["naziv", "mrlje"].includes(k), `trake[${i}] nema polje „${k}“ (dopuštena: naziv, mrlje)`);
        need(isText(t.naziv) && t.naziv.length <= 8, `trake[${i}].naziv je kratak natpis staze (do 8 znakova), npr. „uzorak“ ili „A“`);
        provjeriMrlje(t.mrlje, s.fronta, need, `trake[${i}].mrlje`);
        for (const m of t.mrlje ?? []) need(m?.oznaka == null, `trake[${i}]: mrlje na stazi nemaju oznaku (natpis je naziv staze)`);
      });
      const nazivi = trake.map((t) => t?.naziv);
      need(new Set(nazivi).size === nazivi.length, "nazivi staza moraju biti različiti");
    } else if (s.nacin !== "postupak" || s.mrlje != null) {
      const oznake = s.nacin === "prepoznaj" && (s.pitanje === "otapanje" || s.pitanje === "vezanje");
      if (s.nacin === "prepoznaj" && s.pitanje === "tvari") need(false, "pitanje „tvari“ treba trake: uzorak i referentne tvari");
      else provjeriMrlje(s.mrlje, s.fronta, need, "mrlje", { oznake });
    }
    if (list.length) return list;

    if (s.nacin === "istrazi") {
      if (s.pogreske != null) need(typeof s.pogreske === "boolean", "pogreske je true ili false");
      return list;
    }
    if (s.nacin === "rf") {
      const M = s.mrlje;
      if (s.trazi != null) {
        if (!need(Array.isArray(s.trazi) && s.trazi.length >= 1 && s.trazi.length <= 3, "trazi je popis od 1 do 3 mrlje (indeks ili oznaka)")) return list;
        const idx = trazeneOf(s);
        idx.forEach((i, k) => need(i >= 0 && i < M.length, `trazi[${k}]: nema mrlje „${s.trazi[k]}“`));
        need(new Set(idx).size === idx.length, "trazi: ista mrlja je navedena dvaput");
      } else need(M.length <= 3, "rf traži najviše 3 mrlje: zadaj trazi");
      if (M.length > 1) trazeneOf(s).forEach((i) => M[i] && need(isText(M[i].oznaka), `mrlje[${i}] treba oznaku: uz više mrlja učenik po njoj zna čiji R_f upisuje`));
      if (s.mjerenje != null) need(MJERENJA.includes(s.mjerenje), `mjerenje je „kote“ ili „ravnalo“`);
      if (s.operacije != null) need(typeof s.operacije === "boolean", "operacije je true ili false");
      if (s.start != null) {
        need(s.mjerenje === "ravnalo", "start (položaj startne linije na ravnalu) ide samo uz mjerenje „ravnalo“");
        need(isNum(s.start) && s.start >= 0.5 && s.start <= 3 && desetinka(s.start), "start je udaljenost startne linije od donjeg ruba trake u cm, od 0,5 do 3, na jednu decimalu");
      }
      if (s.mjerenje === "ravnalo") {
        need(jedinicaOf(s) === "cm", "ravnalo je u centimetrima: jedinica „cm“");
        need(s.fronta >= 3 && s.fronta <= 16, "uz ravnalo fronta mora biti od 3 do 16 cm");
        need([s.fronta, ...M.map((m) => m.udaljenost)].every(desetinka), "uz ravnalo fronta i udaljenosti mrlja moraju biti na jednu decimalu (ravnalo se čita na milimetar)");
      }
      return list;
    }
    if (s.nacin === "prepoznaj") {
      if (s.pitanje === "tvari") {
        const u = uzorakOf(s);
        if (!need(Number.isInteger(u) && u >= 0 && u < trake.length, `uzorak je indeks staze s uzorkom (0 do ${trake.length - 1})`)) return list;
        trake.forEach((t, i) => i !== u && need(t.mrlje.length === 1, `trake[${i}] (${t.naziv}) je referentna čista tvar: ima točno jednu mrlju`));
        if (list.length) return list;
        const P = podudaranja(s);
        for (const p of P) {
          if (p.blizina <= SKUPA && !p.istaBoja) need(false, `${p.naziv} ima mrlju na istoj visini kao mrlja uzorka, ali druge boje: to zbunjuje (ista visina, a druga tvar); pomakni je ili joj daj istu boju`);
          else if (p.blizina > SKUPA && p.blizina < DALEKO) need(false, `${p.naziv} je preblizu mrlji uzorka (${Math.round(p.blizina * 100)} % fronte): na crtežu se ne vidi je li na istoj visini; neka bude na istoj visini ili barem ${Math.round(DALEKO * 100)} % fronte dalje`);
        }
        need(P.some((p) => p.u), "nijedna referentna tvar nije u uzorku (nijedna nema mrlju na istoj visini i iste boje kao uzorak)");
        need(P.some((p) => !p.u), "sve referentne tvari su u uzorku, pa izbor nije zadatak: dodaj i tvar koje u uzorku nema");
        if (list.length) return list;
        need(P.some((p) => !p.u && p.bojaKaoUzorak), "odgovor se čita već iz boje: barem jedna tvar koje nema u uzorku neka bude iste boje kao neka mrlja uzorka (tvari se prepoznaju po visini, R_f)");
      }
      return list;
    }
    // postupak
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "istrazi") return { tocno: true };
    if (s.nacin === "rf") {
      const idx = trazeneOf(s);
      const unosi = Array.isArray(odgovor) ? odgovor : [odgovor];
      for (let k = 0; k < idx.length; k++) {
        const r = provjeriRf(s, idx[k], unosi[k]);
        if (!r.tocno) return idx.length > 1 ? { ...r, praznina: k, poruka: `${RF}(${oznakaRf(s.mrlje[idx[k]], idx[k])}): ${r.poruka}` } : { ...r, praznina: 0 };
      }
      return { tocno: true };
    }
    if (s.nacin === "prepoznaj") {
      const P = PODLOGE[podlogaOf(s)];
      const ot = otapaloOf(s);
      if (s.pitanje === "tvari") {
        const tocne = uSmjesi(s);
        const odabrane = Array.isArray(odgovor) ? [...new Set(odgovor.filter(Number.isInteger))] : [];
        if (!odabrane.length) return { tocno: false, poruka: "Označi tvari koje su u uzorku.", prazno: true };
        const pod = podudaranja(s);
        const visak = odabrane.map((i) => pod.find((p) => p.i === i)).find((p) => p && !p.u);
        if (visak) {
          if (visak.bojaKaoUzorak) return { tocno: false, poruka: `Mrlja tvari ${visak.naziv} iste je boje kao mrlja uzorka, ali nije na istoj visini, pa nema isti ${RF}. Tvar se prepoznaje po tome koliko je daleko otišla.` };
          return { tocno: false, poruka: `U uzorku nema mrlje na visini mrlje tvari ${visak.naziv}.` };
        }
        if (odabrane.some((i) => !pod.some((p) => p.i === i))) return { tocno: false, poruka: "Označi samo referentne tvari (staze uz uzorak).", prazno: true };
        const fali = tocne.filter((i) => !odabrane.includes(i));
        if (fali.length) return { tocno: false, poruka: `Nisi označio sve: ${fali.length === 1 ? "još jedna tvar ima" : `još ${fali.length} tvari imaju`} mrlju na istoj visini kao jedna mrlja uzorka.` };
        return { tocno: true };
      }
      if (s.pitanje === "cista") {
        const n = s.mrlje.length;
        if (odgovor !== "cista" && odgovor !== "smjesa") return { tocno: false, poruka: "Odaberi jedan odgovor.", prazno: true };
        if (odgovor === (n === 1 ? "cista" : "smjesa")) return { tocno: true };
        return n === 1
          ? { tocno: false, poruka: `Na ${P.lok} je samo jedna mrlja: uzorak se nije razdvojio, pa se ponaša kao čista tvar.` }
          : { tocno: false, poruka: `Uzorak se razdvojio na ${mrlja(n)}, a čista tvar dala bi samo jednu. Svaka mrlja je druga tvar.` };
      }
      const i = Number.isInteger(odgovor) ? odgovor : -1;
      if (i < 0 || i >= s.mrlje.length) return { tocno: false, poruka: "Odaberi jednu mrlju.", prazno: true };
      if (i === trazenaMrlja(s)) return { tocno: true };
      return s.pitanje === "otapanje"
        ? { tocno: false, poruka: `Ta mrlja nije otišla najdalje. Tvar koja se najbolje otapa u otapalu (${ot}) putuje gotovo s njim, pa je najbliže fronti.` }
        : { tocno: false, poruka: `Ta tvar nije najviše zaostala. Tvar koja se najjače veže za ${P.aku} najmanje se pomakne, pa je najbliže startnoj liniji.` };
    }
    // postupak
    const op = opcijePostupka(s).find((o) => o.kljuc === odgovor);
    if (!op) return { tocno: false, poruka: "Odaberi jedan odgovor.", prazno: true };
    return op.tocno ? { tocno: true } : { tocno: false, poruka: op.poruka };
  },

  tocanOdgovor(s) {
    if (s.nacin === "istrazi") return "";
    if (s.nacin === "rf") {
      return trazeneOf(s)
        .map((i) => {
          const m = s.mrlje[i];
          return `${RF}(${oznakaRf(m, i)}) = ${zapisD(s, m.udaljenost)} : ${zapisD(s, s.fronta)} = ${zapisRf(m.udaljenost / s.fronta)}`;
        })
        .join("; ");
    }
    if (s.nacin === "prepoznaj") {
      if (s.pitanje === "tvari") {
        const n = uSmjesi(s).map((i) => s.trake[i].naziv);
        return n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} i ${n[n.length - 1]}`;
      }
      if (s.pitanje === "cista") return s.mrlje.length === 1 ? "čista tvar (jedna mrlja)" : `smjesa (${mrlja(s.mrlje.length)}, dakle barem ${s.mrlje.length} tvari)`;
      const i = trazenaMrlja(s);
      return `${imeMrlje(s.mrlje[i], i)} (${RF} = ${zapisRf(s.mrlje[i].udaljenost / s.fronta)})`;
    }
    return opcijePostupka(s).find((o) => o.tocno)?.tekst ?? "";
  },
};
