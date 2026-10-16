// Koraci „Tvoj red“ s klasičnim pitanjima: broj, izbor, više točnih, točno/netočno, praznine, parovi,
// redoslijed i razvrstavanje. Svaki ima provjeru odgovora koja radi isto u pregledniku i na serveru.
import { isNum, tolerance } from "../core/number.js";
import { parseQuantity } from "../core/units.js";
import { ODGOVOR, isText, problems, validateKrivo, checkNumber, withUnit, KRIVO_OPIS } from "./zajednicko.js";

export const broj = {
  tip: "broj",
  uloga: () => ODGOVOR,
  opis: `Brojčani odgovor. Polja: tekst (pitanje, markdown), odgovor (broj), jedinica? (npr. "cm³"), tolerancija? (apsolutna; zadano 0,5 %),
${KRIVO_OPIS}, savjet? (poruka za ostale krive odgovore).`,
  primjer: {
    tip: "broj",
    tekst: "Koliki je volumen kamena?",
    odgovor: 80,
    jedinica: "cm³",
    krivo: [{ vrijednost: 220, poruka: "220 cm³ je završno očitanje: uključuje i vodu koja je već bila u menzuri." }],
    savjet: "Volumen kamena je razlika dvaju očitanja.",
  },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "broj treba pitanje u „tekst“");
    need(isNum(s.odgovor), "broj treba brojčani „odgovor“");
    validateKrivo(s.krivo, s.odgovor, tolerance(s.odgovor, s.tolerancija), need);
    return list;
  },
  check: (s, input) => checkNumber({ input, answer: s.odgovor, tol: s.tolerancija, unit: s.jedinica, krivo: s.krivo, savjet: s.savjet }),
  tocanOdgovor: (s) => withUnit(s.odgovor, s.jedinica),
  brojcaniOdgovor: (s) => s.odgovor,
};

export const izbor = {
  tip: "izbor",
  uloga: () => ODGOVOR,
  opis: `Jedan točan odgovor od 2–5 ponuđenih (aplikacija ih miješa). Polja: tekst, opcije: [{tekst, tocno?: true, poruka?}];
točno je točno jedna opcija; svaka kriva opcija neka ima poruku za grešku koju predstavlja.`,
  primjer: {
    tip: "izbor",
    tekst: "Što znači riječ *srednja* u „srednja gustoća“?",
    opcije: [
      { tekst: "Ukupna masa podijeljena ukupnim volumenom", tocno: true },
      { tekst: "Zbroj gustoća dijelova podijeljen s 2", poruka: "Tako bi svaki dio vrijedio jednako, a to ovisi i o tome koliko prostora zauzima." },
    ],
  },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "izbor treba pitanje u „tekst“");
    if (need(Array.isArray(s.opcije) && s.opcije.length >= 2 && s.opcije.length <= 5, "izbor treba 2–5 opcija")) {
      need(s.opcije.filter((o) => o?.tocno === true).length === 1, "izbor mora imati točno jednu opciju s tocno: true");
      s.opcije.forEach((o, i) => need(isText(o?.tekst), `opcije[${i}].tekst mora biti tekst`));
      need(new Set(s.opcije.map((o) => o?.tekst)).size === s.opcije.length, "opcije se ne smiju ponavljati");
    }
    return list;
  },
  check(s, index) {
    const o = s.opcije[index];
    if (!o) return { tocno: false, poruka: "Odaberi jednu opciju.", prazno: true };
    return o.tocno ? { tocno: true } : { tocno: false, poruka: o.poruka || s.savjet || "Nije točno." };
  },
  tocanOdgovor: (s) => s.opcije.find((o) => o.tocno)?.tekst ?? "",
};

export const vise_tocnih = {
  tip: "vise_tocnih",
  uloga: () => ODGOVOR,
  opis: `Označi sve točne (3–6 opcija, barem jedna točna). Polja: tekst, opcije: [{tekst, tocno: true|false, poruka?}].`,
  primjer: {
    tip: "vise_tocnih",
    tekst: "Koja su tijela homogena?",
    opcije: [
      { tekst: "komad čistog željeza", tocno: true },
      { tekst: "spužva", tocno: false, poruka: "Spužva ima šupljine sa zrakom, pa tvar nije jednoliko raspoređena." },
      { tekst: "čaša čiste vode", tocno: true },
    ],
  },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "vise_tocnih treba pitanje u „tekst“");
    if (need(Array.isArray(s.opcije) && s.opcije.length >= 3 && s.opcije.length <= 6, "vise_tocnih treba 3–6 opcija")) {
      need(s.opcije.some((o) => o?.tocno === true), "vise_tocnih treba barem jednu točnu opciju");
      need(s.opcije.every((o) => typeof o?.tocno === "boolean"), "svaka opcija u vise_tocnih treba tocno: true ili false");
      s.opcije.forEach((o, i) => need(isText(o?.tekst), `opcije[${i}].tekst mora biti tekst`));
    }
    return list;
  },
  check(s, chosen) {
    const set = new Set(chosen ?? []);
    if (!set.size) return { tocno: false, poruka: "Označi barem jednu opciju.", prazno: true };
    const wrongPick = s.opcije.findIndex((o, i) => set.has(i) && !o.tocno);
    if (wrongPick >= 0) return { tocno: false, poruka: s.opcije[wrongPick].poruka || "Jedna od označenih opcija nije točna." };
    const missed = s.opcije.findIndex((o, i) => !set.has(i) && o.tocno);
    if (missed >= 0) return { tocno: false, poruka: "Sve što si označio je točno, ali nedostaje još barem jedna točna opcija." };
    return { tocno: true };
  },
  tocanOdgovor: (s) => s.opcije.filter((o) => o.tocno).map((o) => o.tekst).join("; "),
};

export const tocno_netocno = {
  tip: "tocno_netocno",
  uloga: () => ODGOVOR,
  opis: `Je li tvrdnja točna? Polja: tekst (tvrdnja), tocno (true|false), poruka (zašto, prikazuje se nakon krivog odgovora).`,
  primjer: { tip: "tocno_netocno", tekst: "Ako je tijelo samo djelomično uronjeno, porast razine vode jednak je cijelom volumenu tijela.", tocno: false, poruka: "Vodu istiskuje samo uronjeni dio tijela." },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "tocno_netocno treba tvrdnju u „tekst“");
    need(typeof s.tocno === "boolean", "tocno_netocno treba tocno: true ili false");
    need(isText(s.poruka), "tocno_netocno treba „poruka“ (zašto)");
    return list;
  },
  check: (s, value) => (typeof value !== "boolean" ? { tocno: false, poruka: "Odaberi Točno ili Netočno.", prazno: true } : value === s.tocno ? { tocno: true } : { tocno: false, poruka: s.poruka }),
  tocanOdgovor: (s) => (s.tocno ? "Točno" : "Netočno"),
};

export const praznina = {
  tip: "praznina",
  uloga: () => ODGOVOR,
  opis: `Rečenica ili račun s prazninama. Polja: tekst (markdown s oznakama [[1]], [[2]] … na mjestu praznina; svaka oznaka točno jednom;
praznina ne smije biti unutar $…$), praznine: [{odgovor: broj ili tekst, jedinica?, tolerancija?, opcije?: [tekstovi za padajući izbor], ${KRIVO_OPIS}}].
Tekstualni odgovor traži „opcije“ (učenik bira, ne tipka).`,
  primjer: {
    tip: "praznina",
    tekst: "$1\\ \\text{cm}^2$ ima [[1]] mm², pa je $3600\\ \\text{mm}^2$ = [[2]] cm².",
    praznine: [
      { odgovor: 100, krivo: [{ vrijednost: 10, poruka: "Kvadratić od 1 cm ima 10 redova po 10 mm², a ne samo jedan red." }] },
      { odgovor: 36, krivo: [{ vrijednost: 360, poruka: "Dijeli se sa 100, ne s 10." }] },
    ],
  },
  validate(s) {
    const { list, need } = problems();
    if (!need(isText(s.tekst), "praznina treba „tekst“ s oznakama [[1]] …")) return list;
    if (!need(Array.isArray(s.praznine) && s.praznine.length >= 1 && s.praznine.length <= 4, "praznina treba 1–4 praznine")) return list;
    s.praznine.forEach((p, i) => {
      const tag = `[[${i + 1}]]`;
      const count = s.tekst.split(tag).length - 1;
      need(count === 1, `oznaka ${tag} mora se u tekstu pojaviti točno jednom (sada ${count}×)`);
      need(!insideMath(s.tekst, tag), `oznaka ${tag} je unutar $…$; praznina mora biti izvan formule`);
      if (isNum(p?.odgovor)) validateKrivo(p.krivo, p.odgovor, tolerance(p.odgovor, p.tolerancija), need, `praznine[${i}].krivo`);
      else if (need(isText(p?.odgovor), `praznine[${i}].odgovor mora biti broj ili tekst`)) {
        need(Array.isArray(p.opcije) && p.opcije.includes(p.odgovor), `praznine[${i}] s tekstualnim odgovorom treba „opcije“ koje ga sadrže`);
      }
    });
    need(!/\[\[(\d+)\]\]/.test(s.tekst.replace(/\[\[(\d+)\]\]/g, (m, n) => (Number(n) <= s.praznine.length ? "" : m))), "tekst ima oznaku praznine bez zapisa u „praznine“");
    return list;
  },
  check(s, values) {
    for (let i = 0; i < s.praznine.length; i++) {
      const p = s.praznine[i];
      const v = values?.[i];
      const r = isNum(p.odgovor)
        ? checkNumber({ input: v ?? "", answer: p.odgovor, tol: p.tolerancija, unit: p.jedinica, krivo: p.krivo, savjet: s.savjet })
        : v === p.odgovor
          ? { tocno: true }
          : { tocno: false, poruka: v ? s.savjet || "Nije točno." : "Odaberi odgovor.", prazno: !v };
      if (!r.tocno) return { ...r, praznina: i, poruka: s.praznine.length > 1 ? `Praznina ${i + 1}: ${r.poruka}` : r.poruka };
    }
    return { tocno: true };
  },
  // zadnja brojčana praznina je obično konačni rezultat podzadatka
  brojcaniOdgovor: (s) => s.praznine.map((p) => p.odgovor).filter(isNum).at(-1),
  tocanOdgovor: (s) => s.praznine.map((p, i) => `${i + 1}. ${isNum(p.odgovor) ? withUnit(p.odgovor, p.jedinica) : p.odgovor}`).join(", "),
};

function insideMath(text, tag) {
  const at = text.indexOf(tag);
  if (at < 0) return false;
  const before = text.slice(0, at).replace(/\$\$/g, "");
  return (before.match(/\$/g) ?? []).length % 2 === 1;
}

export const parovi = {
  tip: "parovi",
  uloga: () => ODGOVOR,
  opis: `Spoji parove (3–5). Polja: tekst, parovi: [{lijevo, desno}] u točnom paru; desna strana se miješa. Npr. veličina ↔ jedinica,
ili jednaki iznosi u različitim jedinicama ("27 dm" ↔ "2 m 7 dm", "3 m" ↔ "300 cm"; tada aplikacija provjeri da su parovi jednaki).`,
  primjer: {
    tip: "parovi",
    tekst: "Spoji veličinu s njezinom jedinicom.",
    parovi: [
      { lijevo: "masa", desno: "kg" },
      { lijevo: "volumen", desno: "m³" },
      { lijevo: "gustoća", desno: "kg/m³" },
    ],
  },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "parovi treba „tekst“");
    if (need(Array.isArray(s.parovi) && s.parovi.length >= 3 && s.parovi.length <= 5, "parovi treba 3–5 parova")) {
      s.parovi.forEach((p, i) => need(isText(p?.lijevo) && isText(p?.desno), `parovi[${i}] treba „lijevo“ i „desno“`));
      need(new Set(s.parovi.map((p) => p?.desno)).size === s.parovi.length, "desne strane parova moraju biti različite");
      // jednaki iznosi: ako su sve strane iznosi s jedinicama, svaki par mora biti stvarno jednak
      const iznosi = s.parovi.map((p) => [parseQuantity(p?.lijevo), parseQuantity(p?.desno)]);
      if (iznosi.every(([l, d]) => l && d)) {
        iznosi.forEach(([l, d], i) => need(l.velicina === d.velicina && Math.abs(l.base - d.base) <= 1e-9 * Math.max(1, Math.abs(l.base)), `parovi[${i}]: „${s.parovi[i].lijevo}“ i „${s.parovi[i].desno}“ nisu jednaki iznosi`));
        need(new Set(iznosi.map(([l]) => `${l.velicina}:${l.base.toPrecision(9)}`)).size === iznosi.length, "dva para imaju isti iznos, pa spajanje nije jednoznačno");
      }
    }
    return list;
  },
  // odgovor: za svaki lijevi indeks i odabrani desni indeks (iz izvornog popisa)
  check(s, map) {
    if (!Array.isArray(map) || map.some((j) => j == null)) return { tocno: false, poruka: "Spoji sve parove.", prazno: true };
    const wrong = map.findIndex((j, i) => j !== i);
    return wrong < 0 ? { tocno: true } : { tocno: false, poruka: s.savjet || `„${s.parovi[wrong].lijevo}“ nije spojeno s pravim parom.` };
  },
  tocanOdgovor: (s) => s.parovi.map((p) => `${p.lijevo} – ${p.desno}`).join("; "),
};

export const redoslijed = {
  tip: "redoslijed",
  uloga: () => ODGOVOR,
  opis: `Poredaj 3–6 stavki (koraci postupka, vrijednosti po veličini). Polja: tekst, stavke: [tekstovi u TOČNOM redoslijedu] (aplikacija ih miješa), savjet?.`,
  primjer: { tip: "redoslijed", tekst: "Poredaj korake mjerenja volumena kamena.", stavke: ["Očitaj početnu razinu vode", "Potpuno uroni kamen", "Očitaj novu razinu", "Oduzmi početno od završnog očitanja"] },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "redoslijed treba „tekst“");
    if (need(Array.isArray(s.stavke) && s.stavke.length >= 3 && s.stavke.length <= 6, "redoslijed treba 3–6 stavki")) {
      need(s.stavke.every(isText), "svaka stavka mora biti tekst");
      need(new Set(s.stavke).size === s.stavke.length, "stavke se ne smiju ponavljati");
    }
    return list;
  },
  check(s, order) {
    if (!Array.isArray(order) || order.length !== s.stavke.length) return { tocno: false, poruka: "Poredaj sve stavke.", prazno: true };
    const wrong = order.findIndex((j, i) => j !== i);
    return wrong < 0 ? { tocno: true } : { tocno: false, poruka: s.savjet || `Na ${wrong + 1}. mjestu treba biti nešto drugo.` };
  },
  tocanOdgovor: (s) => s.stavke.map((t, i) => `${i + 1}. ${t}`).join(" → "),
};

export const razvrstaj = {
  tip: "razvrstaj",
  uloga: () => ODGOVOR,
  opis: `Razvrstaj 3–8 stavki u 2–3 skupine. Polja: tekst, kategorije: [nazivi], stavke: [{tekst, kategorija: indeks skupine, poruka?: zašto}].`,
  primjer: {
    tip: "razvrstaj",
    tekst: "Razvrstaj tijela.",
    kategorije: ["Homogeno", "Nehomogeno"],
    stavke: [
      { tekst: "komad čistog željeza", kategorija: 0 },
      { tekst: "spužva", kategorija: 1, poruka: "Spužva ima šupljine sa zrakom." },
      { tekst: "figurica od aluminija i plastike", kategorija: 1, poruka: "Aluminij i plastika imaju različite gustoće." },
    ],
  },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "razvrstaj treba „tekst“");
    const nk = Array.isArray(s.kategorije) ? s.kategorije.length : 0;
    need(nk >= 2 && nk <= 3, "razvrstaj treba 2–3 kategorije");
    if (need(Array.isArray(s.stavke) && s.stavke.length >= 3 && s.stavke.length <= 8, "razvrstaj treba 3–8 stavki")) {
      s.stavke.forEach((st, i) => {
        need(isText(st?.tekst), `stavke[${i}].tekst mora biti tekst`);
        need(Number.isInteger(st?.kategorija) && st.kategorija >= 0 && st.kategorija < nk, `stavke[${i}].kategorija mora biti indeks kategorije (0–${nk - 1})`);
      });
      need(new Set(s.stavke.map((st) => st?.kategorija)).size >= 2, "stavke moraju biti u barem dvije različite kategorije");
    }
    return list;
  },
  check(s, picks) {
    if (!Array.isArray(picks) || picks.some((k) => k == null) || picks.length !== s.stavke.length) return { tocno: false, poruka: "Razvrstaj sve stavke.", prazno: true };
    const wrong = picks.findIndex((k, i) => k !== s.stavke[i].kategorija);
    if (wrong < 0) return { tocno: true };
    const st = s.stavke[wrong];
    return { tocno: false, poruka: st.poruka ? `„${st.tekst}“: ${st.poruka}` : `„${st.tekst}“ nije u pravoj skupini.` };
  },
  tocanOdgovor: (s) => s.kategorije.map((k, ki) => `**${k}:** ${s.stavke.filter((st) => st.kategorija === ki).map((st) => st.tekst).join(", ")}`).join("; "),
};

