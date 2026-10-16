// Provjera cijele interaktivne lekcije prije spremanja: građa (zadatak, podzadaci, pomoć, blizanac),
// uloge koraka i provjera svakog widgeta. Isti kod pokreće skripta za izradu, a kasnije backend (GraalJS),
// kao taskSketch.js: što ovdje prođe, aplikacija sigurno prikaže i može provjeriti.
//
// validateLesson(lekcija, { rezultati, skica }) → { greske: [...], upozorenja: [...] }
// rezultati i skica su od izvornog (tekstualnog) zadatka; oba smiju nedostajati.
// Greške znače da se lekcija ne smije spremiti (model je popravlja); upozorenja su za pregled.
import { KATALOG, widget, uloga, istrazuje, tocanOdgovor, POGLEDAJ, ODGOVOR } from "./katalog/index.js";
import { sketchProblems } from "./katalog/tekst.js";
import { isText } from "./katalog/zajednicko.js";
import { parseNumber, isNum } from "./core/number.js";

export const VERZIJA = 1;
const MAX_POMOC = 4;

export function validateLesson(lekcija, { rezultati, skica } = {}) {
  const greske = [];
  const upozorenja = [];
  const err = (ok, msg) => {
    if (!ok) greske.push(msg);
    return ok;
  };
  const warn = (ok, msg) => {
    if (!ok) upozorenja.push(msg);
  };

  if (!err(lekcija && typeof lekcija === "object", "lekcija mora biti JSON objekt")) return { greske, upozorenja };
  err(lekcija.verzija === VERZIJA, `verzija mora biti ${VERZIJA}`);
  const text = allText(lekcija);

  const z = lekcija.zadatak;
  if (err(z && typeof z === "object", "nedostaje „zadatak“")) {
    err(isText(z.tekst), "zadatak.tekst mora opisati situaciju i podatke");
    if (z.skica != null) sketchProblems(z.skica, { text }, (ok, msg) => err(ok, `zadatak.skica: ${msg}`));
  }

  const pz = lekcija.podzadaci;
  if (err(Array.isArray(pz) && pz.length >= 1 && pz.length <= 3, "lekcija treba 1–3 podzadatka")) {
    const ids = pz.map((p) => p?.id);
    err(new Set(ids).size === ids.length, "id-jevi podzadataka moraju biti različiti");
    pz.forEach((p, i) => {
      const at = `podzadaci[${i}]${p?.id ? ` (${p.id})` : ""}`;
      err(["a", "b", "c"].includes(p?.id), `${at}.id mora biti "a", "b" ili "c"`);
      err(isText(p?.naslov), `${at} treba kratak naslov`);
      err(isText(p?.zasto), `${at} treba „zasto“: 1–2 rečenice za učenika koji je odmah točno odgovorio`);
      err(isText(p?.objasnjenje), `${at} treba „objasnjenje“ (cijelo objašnjenje, skriveno dok ga učenik ne otvori)`);
      step(p?.pitanje, `${at}.pitanje`, ODGOVOR);
      err(!p?.pitanje?.stube, `${at}.pitanje: stube jedinica otkrivaju postupak; smiju samo u koraku pomoći`);
      if (p?.blizanac != null) {
        step(p.blizanac, `${at}.blizanac`, ODGOVOR);
        err(JSON.stringify(p.blizanac) !== JSON.stringify(p.pitanje), `${at}.blizanac je isti kao pitanje; treba nove brojeve ili novu situaciju`);
        warn(p.blizanac?.tip === p.pitanje?.tip, `${at}.blizanac je drugog tipa nego pitanje; blizanac provjerava istu vještinu`);
      } else {
        warn(false, `${at} nema blizanca: nakon pomoći učenik ponovno rješava isto pitanje`);
      }
      if (err(Array.isArray(p?.pomoc) && p.pomoc.length >= 1 && p.pomoc.length <= MAX_POMOC, `${at}.pomoc treba 1–${MAX_POMOC} koraka`)) {
        p.pomoc.forEach((k, j) => step(k, `${at}.pomoc[${j}]`));
        warn(p.pomoc.some((k) => uloga(k) === ODGOVOR), `${at}.pomoc nema nijedan korak „Tvoj red“: pomoć bi trebala prepustiti učeniku barem jedan mali korak`);
        warn(uloga(p.pomoc[0]) === POGLEDAJ, `${at}.pomoc ne počinje objašnjenjem: učenik koji je pogriješio najprije treba vidjeti kako se to radi`);
      }
      const r = rezultati?.[p?.id];
      if (r != null && p?.pitanje) {
        const a = widget(p.pitanje)?.brojcaniOdgovor?.(p.pitanje);
        if (isNum(a)) warn(numbersIn(String(r)).some((n) => Math.abs(n - a) <= Math.max(1e-9, Math.abs(a) * 0.005)), `${at}: točan odgovor ${a} ne pojavljuje se u rezultatima izvornog zadatka („${r}“); provjeri je li pitanje isto`);
      }
    });
  }

  for (const oblik of genderForms(text)) err(false, `„${oblik}“: učeniku se obraćamo u muškom rodu („zbrojio si“), bez ženskih i dvojnih oblika`);

  if (Array.isArray(pz)) {
    sourceSketch(lekcija, parseMaybe(skica), err);
    sourceResults(pz, rezultati, err, warn);
  }

  if (err(Array.isArray(lekcija.zapamti) && lekcija.zapamti.length >= 1 && lekcija.zapamti.length <= 4, "zapamti treba 1–4 kratke natuknice")) {
    lekcija.zapamti.forEach((t, i) => err(isText(t), `zapamti[${i}] mora biti tekst`));
  }

  function step(spec, at, mora) {
    if (!err(spec && typeof spec === "object" && KATALOG[spec.tip], `${at}: nepoznat ili nedostaje tip widgeta („${spec?.tip}“); dopušteni: ${Object.keys(KATALOG).join(", ")}`)) return;
    const role = uloga(spec);
    if (mora === ODGOVOR) err(role === ODGOVOR, `${at} mora biti korak s odgovorom („Tvoj red“), a ${spec.tip}${spec.nacin ? ` (${spec.nacin})` : ""} je korak za gledanje`);
    for (const p of KATALOG[spec.tip].validate(spec, { text })) greske.push(`${at} (${spec.tip}): ${p}`);
    if (istrazuje(spec)) warn(/istraž|pomi|dodir|povuci|mijenjaj|igraj/i.test(spec.tekst ?? ""), `${at}: korak za istraživanje neka u tekstu kaže što učenik može dirati`);
  }

  return { greske, upozorenja };
}

// Skica uz izvorni zadatak mora ostati vidljiva: lik ili tijelo ide u zadatak.skica (u lekciji o površini
// složenog lika učenik je inače vidio samo ravnalo s već nanesenom duljinom), a instrument s kojeg se očitava
// (ljestvica) postaje pitanje „očitaj“ ili ostaje skica uz zadatak.
function sourceSketch(lekcija, izvor, err) {
  if (!izvor?.tip || lekcija.zadatak?.skica) return;
  const pitanja = lekcija.podzadaci.map((p) => p?.pitanje).filter(Boolean);
  if (izvor.tip === "ljestvica") {
    err(
      pitanja.some((q) => q.tip === "mjerilo" && q.nacin !== "istrazi" && (!izvor.instrument || q.instrument === izvor.instrument)),
      `izvorni zadatak očitava se s instrumenta (${izvor.instrument ?? "ljestvica"}), a lekcija ga ne prikazuje: neka očitanje bude pitanje (mjerilo "procitaj") ili stavi ljestvicu u zadatak.skica`,
    );
  } else if (!(izvor.tip === "graf" && pitanja.some((q) => q.tip === "ocitaj_graf"))) {
    err(false, `izvorni zadatak ima skicu (${izvor.tip}), a lekcija je nema: učenik ne vidi lik. Stavi istu skicu u zadatak.skica (izostavi samo oznaku koju učenik treba izračunati)`);
  }
}

// Brojčane rezultate izvornog zadatka učenik mora sam dobiti kao odgovor na pitanje (glavni put), a ne samo
// vidjeti u pomoći: u lekciji o menzuri litre su inače bile samo iza „Ne znam“. Svaki dio rezultata (odvojen
// točkom-zarezom) treba barem jednu takvu vrijednost; ostale vrijednosti istog dijela (lanac „8 L = 80 dL =
// 8000 mL“, više udjela) samo su upozorenje, jer praznina ima najviše 4 mjesta.
function sourceResults(pz, rezultati, err, warn) {
  if (!rezultati || typeof rezultati !== "object") return;
  const odgovori = pz.flatMap((p) => answerNumbers(p?.pitanje));
  const odgovoreno = (n) => odgovori.some((a) => Math.abs(a - n) <= Math.max(1e-9, Math.abs(n) * 0.005));
  for (const [id, r] of Object.entries(rezultati)) {
    if (typeof r !== "string" && typeof r !== "number") continue;
    for (const dio of answerParts(String(r))) {
      const brojevi = numbersIn(dio);
      const nedostaje = brojevi.filter((n) => !odgovoreno(n));
      if (!nedostaje.length) continue;
      const poruka = `rezultat ${id}) izvornog zadatka („${dio.trim()}“): ${nedostaje.map(formatNumber).join(", ")} nije točan odgovor nijednog pitanja`;
      if (nedostaje.length === brojevi.length) err(false, `${poruka}. Učenik taj rezultat mora sam dobiti u pitanju podzadatka, ne samo u pomoći ili u tekstu. Ako podzadatak ima više rezultata, pitanje neka bude praznina s njima`);
      else warn(false, `${poruka}; učenik ga vidi samo u objašnjenju`);
    }
  }
}

// Brojevi koje učenik upisuje ili bira kao točan odgovor na pitanje.
function answerNumbers(spec) {
  if (!spec || !widget(spec)) return [];
  if (spec.tip === "praznina") return (spec.praznine ?? []).flatMap((p) => (isNum(p?.odgovor) ? [p.odgovor] : numbersIn(String(p?.odgovor ?? ""))));
  const out = [];
  try {
    const a = widget(spec).brojcaniOdgovor?.(spec);
    if (isNum(a)) out.push(a);
    out.push(...numbersIn(String(tocanOdgovor(spec))));
  } catch {
    // neispravan widget već je prijavljen kao greška
  }
  return out;
}

// Dijelovi rezultata koji su odgovori, bez obrazloženja („6 dm², jer dijagonala…“). Iza točke-zareza je još jedan
// odgovor samo ako počinje brojem ili oznakom („A: 2,4 g/cm³; B: 0,8 g/cm³“), a ne rečenicom („…; dijelimo sa 100“).
function answerParts(r) {
  const bezObrazlozenja = (t) => t.split(/\bjer\b|\bzato\b|\(/i)[0];
  const [prvi, ...ostali] = r.split(";");
  return [prvi, ...ostali.filter((t) => /^\s*(?:[^:\d]{1,30}:\s*)?-?\d/.test(t))].map(bezObrazlozenja);
}

// Ženski i dvojni oblici obraćanja učeniku („provela si“, „sam/sama“, „prebrojio/la“); jedinice (g/cm³) nisu riječi.
function genderForms(text) {
  const oblici = [
    ...text.matchAll(/(?<![\p{L}\d])\p{Ll}{3,}\/\p{Ll}{2,}(?![\p{L}\d³²])/gu),
    ...text.matchAll(/(?<!\p{L})si \p{L}+la(?!\p{L})|(?<!\p{L})\p{L}+la si(?!\p{L})/gu),
  ].map((m) => m[0]);
  return [...new Set(oblici)];
}

function parseMaybe(v) {
  if (typeof v !== "string") return v ?? null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function formatNumber(n) {
  return String(Number(n.toPrecision(4))).replace(".", ",");
}

function numbersIn(text) {
  text = text
    .replace(/\^\{?-?\d+\}?/g, "") // eksponent jedinice u LaTeX-u (dm^3)
    .replace(/(\d)[ \u00a0](?=\d{3}(?!\d))/g, "$1"); // „50 000“
  return (text.match(/-?\d+(?:[.,]\d+)?(?:\/\d+)?/g) ?? []).map((s) => parseNumber(s)).filter(isNum);
}

// Sav tekst lekcije: brojevi na oznakama skica moraju se pojaviti u njemu (kao kod skica uz zadatak).
function allText(l) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") out.push(v);
    else if (typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "skica") walk(x);
  };
  walk(l);
  return out.join("\n");
}
