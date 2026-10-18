// „Vježbaj još“ na kraju lekcije: model samo kaže koje jedinice lekcija vježba, a zadatke pretvorbe (i lance i
// mješovite zapise, kao „Pretvori!“ stranice u materijalima) sastavlja kod. Vježba je neobavezna, ne ulazi u
// ocjenu za ponavljanje i ne košta ništa, pa je učenik može ponavljati koliko hoće (nova vježba = novo sjeme;
// početno sjeme je nasumično, pa i ista lekcija i varijacije s istim jedinicama daju nove brojeve).
import { UNITS, normUnit, unitIndex, toBase, fromBase } from "../core/units.js";
import { isNum } from "../core/number.js";
import { pretvorba_jedinica } from "./istrazivanje.js";
import { isText, problems } from "./zajednicko.js";

export const VJEZBA_OPIS = `vjezba (po želji, samo kad lekcija uči pretvaranje jedinica): {"velicina": "duljina" | "povrsina" | "volumen" | "masa" | "vrijeme",
"jedinice": [2–7 jedinica iz lekcije i izvornog zadatka, npr. ["km", "m", "dm", "cm", "mm"]], "lanac"?: true (i lanci "8 m = … dm = … cm"),
"mjesovito"?: true (i "2 m 7 dm = … cm")}. Zadatke s brojevima sastavlja aplikacija; ti ih ne pišeš.`;

const MIN_ZADATAKA = 4;
const MAX_ZADATAKA = 8;

export function validateVjezba(v) {
  const { list, need } = problems();
  if (!need(v && typeof v === "object", "vjezba mora biti objekt")) return list;
  if (!need(v.velicina in UNITS, `vjezba.velicina mora biti jedna od: ${Object.keys(UNITS).join(", ")}`)) return list;
  const names = UNITS[v.velicina].map(([u]) => u);
  if (!need(Array.isArray(v.jedinice) && v.jedinice.length >= 2 && v.jedinice.length <= 7, "vjezba.jedinice treba 2–7 jedinica")) return list;
  need(v.jedinice.every((u) => names.includes(normUnit(u))), `vjezba.jedinice moraju biti iz popisa za ${v.velicina}: ${names.join(", ")}`);
  need(new Set(v.jedinice.map(normUnit)).size === v.jedinice.length, "vjezba.jedinice se ne smiju ponavljati");
  if (v.zadataka != null) need(Number.isInteger(v.zadataka) && v.zadataka >= MIN_ZADATAKA && v.zadataka <= MAX_ZADATAKA, `vjezba.zadataka je ${MIN_ZADATAKA}–${MAX_ZADATAKA}`);
  if (v.tekst != null) need(isText(v.tekst), "vjezba.tekst mora biti tekst");
  if (!list.length) {
    const zadaci = generirajVjezbu(v, "provjera");
    need(zadaci.length >= MIN_ZADATAKA, "od tih jedinica ne mogu se sastaviti zadaci; dodaj jedinice koje su susjedne na stubama");
    for (const z of zadaci) for (const p of pretvorba_jedinica.validate(z)) need(false, `vjezba: ${p}`);
  }
  return list;
}

function rng(seed) {
  let s = 2166136261;
  for (const ch of String(seed)) s = Math.imul(s ^ ch.charCodeAt(0), 16777619);
  s = s >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// „Lijep“ broj za zadatak: cijeli, s jednom decimalom ili okrugao (4300), kao u udžbeniku.
function lijepBroj(rand) {
  const r = rand();
  if (r < 0.4) return 2 + Math.floor(rand() * 98);
  if (r < 0.7) return Math.round((1 + rand() * 9) * 10) / 10;
  return (1 + Math.floor(rand() * 99)) * 10 ** (1 + Math.floor(rand() * 2));
}

// rezultat zapisan s najviše 4 značajne znamenke i ne previše sitan ili golem
function lijepRezultat(x) {
  if (!isNum(x) || x < 1e-3 || x > 1e6) return false;
  return Math.abs(Number(x.toPrecision(4)) - x) <= 1e-9 * x;
}

// Zadaci vježbe (specovi pretvorba_jedinica), uvijek isti za isto sjeme.
export function generirajVjezbu(v, seed) {
  const rand = rng(`${seed}|${JSON.stringify(v)}`);
  const jed = [...new Set((v.jedinice ?? []).map(normUnit))].filter((u) => unitIndex(v.velicina, u) >= 0).sort((a, b) => unitIndex(v.velicina, a) - unitIndex(v.velicina, b));
  if (jed.length < 2) return [];
  const n = Math.min(MAX_ZADATAKA, Math.max(MIN_ZADATAKA, v.zadataka ?? 6));
  const vrste = ["jedna", "jedna", ...(v.lanac && jed.length >= 3 ? ["lanac"] : []), ...(v.mjesovito ? ["mjesovito"] : [])];
  const out = [];
  const vidjeno = new Set();
  for (let pokusaj = 0; out.length < n && pokusaj < 400; pokusaj++) {
    const vrsta = out.length < 2 ? "jedna" : vrste[Math.floor(rand() * vrste.length)];
    const z = sastavi(v.velicina, jed, vrsta, rand);
    if (!z) continue;
    const kljuc = JSON.stringify([z.vrijednost, z.od, z.do]);
    if (vidjeno.has(kljuc)) continue;
    vidjeno.add(kljuc);
    out.push({ tip: "pretvorba_jedinica", velicina: v.velicina, ...z, tekst: "" });
  }
  return out;
}

function sastavi(velicina, jed, vrsta, rand) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  if (vrsta === "lanac") {
    const duljina = jed.length >= 4 && rand() < 0.5 ? 4 : 3;
    const start = Math.floor(rand() * (jed.length - duljina + 1));
    const niz = jed.slice(start, start + duljina);
    if (rand() < 0.5) niz.reverse();
    const vrijednost = lijepBroj(rand);
    const base = toBase(velicina, vrijednost, niz[0]);
    const rez = niz.slice(1).map((u) => fromBase(velicina, base, u));
    return rez.every(lijepRezultat) ? { vrijednost, od: niz[0], do: niz.slice(1) } : null;
  }
  if (vrsta === "mjesovito") {
    const i = Math.floor(rand() * (jed.length - 1));
    const [veca, manja] = [jed[i], jed[i + 1]];
    const omjer = Math.round(toBase(velicina, 1, veca) / toBase(velicina, 1, manja));
    if (!(omjer >= 10 && omjer <= 1000)) return null;
    const a = 1 + Math.floor(rand() * 9);
    const b = 1 + Math.floor(rand() * (omjer - 1));
    const cilj = rand() < 0.6 || !jed[i + 2] ? manja : jed[i + 2];
    const rez = fromBase(velicina, toBase(velicina, [a, b], [veca, manja]), cilj);
    return lijepRezultat(rez) ? { vrijednost: [a, b], od: [veca, manja], do: cilj } : null;
  }
  // najviše dva koraka po stubama lekcije (m → mm da, km → mm ne)
  const i = Math.floor(rand() * jed.length);
  const cilj = pick(jed.filter((u, j) => j !== i && Math.abs(j - i) <= 2));
  const od = jed[i];
  const vrijednost = lijepBroj(rand);
  const rez = fromBase(velicina, toBase(velicina, vrijednost, od), cilj);
  return lijepRezultat(rez) ? { vrijednost, od, do: cilj } : null;
}
