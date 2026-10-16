// Zajedničko svim widgetima kataloga: provjere polja speca i provjera brojčanog odgovora s porukama
// za tipične krive vrijednosti („krivo“).
import { parseNumber, tolerance, near, isNum, formatNumber } from "../core/number.js";

export const POGLEDAJ = "pogledaj"; // korak koji se samo gleda ili istražuje: nikad ne traži odgovor
export const ODGOVOR = "odgovor"; // korak „Tvoj red“: učenik mora odgovoriti

export const isText = (v) => typeof v === "string" && v.trim().length > 0;

// Popis problema: svaki zapis je rečenica koju model dobiva natrag kad treba popraviti spec.
export function problems() {
  const list = [];
  const need = (ok, msg) => {
    if (!ok) list.push(msg);
    return ok;
  };
  return { list, need };
}

// Polja koja smiju imati samo koraci s odgovorom; korak „pogledaj“ s njima zbunjuje učenika.
const ANSWER_FIELDS = ["odgovor", "tocno", "tocna", "krivo", "cilj", "praznine", "ocitaj"];
export function noAnswerFields(spec, need) {
  for (const f of ANSWER_FIELDS) need(!(f in spec), `korak „${spec.tip}“ je za gledanje, pa ne smije imati polje „${f}“ (odgovor ide u zaseban korak „Tvoj red“)`);
}

// „krivo“: [{vrijednost, poruka}] za brojčane odgovore; nijedna kriva vrijednost ne smije biti točna.
export function validateKrivo(krivo, answer, tol, need, where = "krivo") {
  if (krivo == null) return;
  if (!need(Array.isArray(krivo), `${where} mora biti popis`)) return;
  krivo.forEach((k, i) => {
    need(isNum(k?.vrijednost), `${where}[${i}].vrijednost mora biti broj`);
    need(isText(k?.poruka), `${where}[${i}].poruka mora biti tekst`);
    if (isNum(k?.vrijednost) && isNum(answer)) need(!near(k.vrijednost, answer, tol), `${where}[${i}].vrijednost ${formatNumber(k.vrijednost)} jednaka je točnom odgovoru`);
  });
}

// Brojčani odgovor: točno unutar tolerancije; inače poruka kriva vrijednosti, savjet ili općenita poruka.
export function checkNumber({ input, answer, tol, unit, krivo, savjet }) {
  const n = parseNumber(input, unit);
  if (n == null) return { tocno: false, poruka: "Upiši broj (decimalni zarez je u redu, npr. 1,5).", prazno: true };
  const t = tolerance(answer, tol);
  if (near(n, answer, t)) return { tocno: true };
  // kriva vrijednost s vlastitom tolerancijom: s tolerancijom točnog odgovora (0,7 kod 140) 0,14 bi se
  // prepoznao kao 0,00014
  const hit = (krivo ?? []).find((k) => near(n, k.vrijednost, tolerance(k.vrijednost, k.tolerancija)));
  if (hit) return { tocno: false, poruka: hit.poruka };
  return { tocno: false, poruka: savjet || "Nije točno. Provjeri račun i jedinicu." };
}

// Opis polja „krivo“ za prompt, isti za sve widgete s brojčanim odgovorom.
export const KRIVO_OPIS = `krivo?: [{vrijednost, poruka}] – tipične krive vrijednosti i poruka baš za tu grešku (npr. 220 = „to je završno očitanje, a ne volumen tijela“)`;

export const withUnit = (n, unit) => `${formatNumber(n)}${unit ? `\u00a0${unit}` : ""}`;
