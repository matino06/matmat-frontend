// Provjera cijele interaktivne lekcije prije spremanja: građa (zadatak, podzadaci, pomoć, blizanac),
// uloge koraka i provjera svakog widgeta. Isti kod pokreće skripta za izradu, a kasnije backend (GraalJS),
// kao taskSketch.js: što ovdje prođe, aplikacija sigurno prikaže i može provjeriti.
//
// validateLesson(lekcija, { rezultati }) → { greske: [...], upozorenja: [...] }
// Greške znače da se lekcija ne smije spremiti (model je popravlja); upozorenja su za pregled.
import { KATALOG, widget, uloga, istrazuje, POGLEDAJ, ODGOVOR } from "./katalog/index.js";
import { sketchProblems } from "./katalog/tekst.js";
import { isText } from "./katalog/zajednicko.js";
import { parseNumber, isNum } from "./core/number.js";

export const VERZIJA = 1;
const MAX_POMOC = 4;

export function validateLesson(lekcija, { rezultati } = {}) {
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

function numbersIn(text) {
  return (text.match(/-?\d+(?:[.,]\d+)?/g) ?? []).map((s) => parseNumber(s)).filter(isNum);
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
