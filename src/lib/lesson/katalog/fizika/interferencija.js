// interferencija: Youngov pokus (dvije pukotine, pruge na zastoru, sonda s razlikom putova i fazom) i optička rešetka
// (maksimumi redova k pod kutovima d·sin α = kλ, kutomjer, broj osvijetljenih pukotina). Načini: istrazi, odaberi
// (dodirni prugu), izmjeri (kaliperi), izracunaj (s tipičnim greškama), postavi (klizač do cilja). Fizika, geometrija
// i „što je skriveno“ su u _interferencija.js i ovdje; komponenta samo crta.
import { isNum, formatNumber, formatSci } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
} from "../zajednicko.js";
import {
  DULJINA,
  normJed,
  rad,
  deg,
  fizika,
  kutReda,
  prugaU,
  metaKlizaca,
  klizaciOd,
  pocetneVrijednosti,
  vrijednostiKlizaca,
  KLIZACI_VRSTE,
  fmt,
  cm,
} from "./_interferencija.js";

const TIP = "interferencija";
export const VRSTE = ["young", "resetka"];
const NACINI = {
  young: ["istrazi", "odaberi", "izmjeri", "izracunaj", "postavi"],
  resetka: ["istrazi", "izracunaj", "postavi"],
};
export const PRIKAZI = {
  young: ["razlika_putova", "faza", "intenzitet", "redovi", "ravnalo"],
  resetka: ["intenzitet", "redovi", "kutovi"],
};
const POLJA = [
  "tip",
  "vrsta",
  "nacin",
  "tekst",
  "lambda",
  "d",
  "a",
  "zareza_po_mm",
  "kut",
  "red",
  "N",
  "klizaci",
  "prikazi",
  "cilj",
  "pruge",
  "jedinica",
  "pitaj",
  "krivo",
  "savjet",
];

// ── veličine za izracunaj i postavi ──────────────────────────────────────────────────────────────
export const VELICINE = {
  young: {
    s: { naziv: "razmak susjednih pruga", oznaka: "s", jed: "cm" },
    lambda: { naziv: "valna duljina", oznaka: "λ", jed: "nm" },
    d: { naziv: "razmak pukotina", oznaka: "d", jed: "µm" },
    a: { naziv: "udaljenost zastora", oznaka: "a", jed: "m" },
  },
  resetka: {
    d: { naziv: "konstanta rešetke", oznaka: "d", jed: "m" },
    zareza_po_mm: {
      naziv: "broj zareza po milimetru",
      oznaka: "N",
      jed: "",
      iza: "zareza/mm",
    },
    alpha: { naziv: "kut maksimuma", oznaka: "α", jed: "°" },
    lambda: { naziv: "valna duljina", oznaka: "λ", jed: "nm" },
    kmax: { naziv: "najviši red maksimuma", oznaka: "kₘₐₓ", jed: "" },
    broj_maksimuma: {
      naziv: "ukupan broj maksimuma",
      oznaka: "broj maksimuma",
      jed: "",
    },
  },
};
const JED_DOPUSTENE = {
  s: ["cm", "mm", "m"],
  lambda: ["nm", "µm", "m"],
  d: ["µm", "mm", "m"],
  a: ["m", "cm"],
  alpha: ["°"],
  zareza_po_mm: [],
  kmax: [],
  broj_maksimuma: [],
};
export const jedinicaPolja = (s, q) =>
  normJed(q.jedinica) ?? VELICINE[s.vrsta][q.velicina].jed;
const SUB = "₀₁₂₃₄₅₆₇₈₉";
export const indeksTekst = (n) =>
  String(n)
    .split("")
    .map((c) => SUB[Number(c)])
    .join("");
export function oznakaPolja(s, q) {
  if (q.velicina === "alpha") return `α${indeksTekst(q.red ?? 1)}`;
  if (q.velicina === "kmax") return "kₘₐₓ";
  return VELICINE[s.vrsta][q.velicina].oznaka;
}

const sinKut = (x) => Math.sin(rad(x));
const jedU = (j) => (j && j !== "°" ? `\u00a0${j}` : j === "°" ? "°" : "");
// kratki zapis iznosa: znanstveni samo kad treba
const iznos = (x, j) =>
  `${Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0) ? formatSci(x) : fmt(x)}${jedU(j)}`;

// Točan iznos (u jedinici polja) i tipične krive vrijednosti. Krive vrijednosti računa kod: „SI“ greške se
// preračunaju u jedinicu polja, a dodaje se i sam broj kakav bi učenik upisao (npr. 0,4 kad zaboravi µm).
export function izracun(s, q) {
  const f = fizika(s);
  const J = jedinicaPolja(s, q);
  const uJ = J && DULJINA[J] ? 1 / DULJINA[J] : 1;
  const krivo = [];
  const si = (x, poruka) => krivo.push({ vrijednost: x * uJ, poruka });
  const sirovo = (x, poruka) => krivo.push({ vrijednost: x, poruka });
  const oba = (x, poruka) => {
    si(x, poruka);
    if (uJ !== 1) sirovo(x, poruka);
  };
  const uMetrima = (x, J2 = J) =>
    `Rezultat je u metrima, a traži se u ${J2}: ${formatSci(x)} m = ${iznos(x / DULJINA[J2], J2)}.`;
  const NM = `Valnu duljinu pretvori u metre: ${fmt(f.lambdaNm)} nm = ${formatSci(f.lam)} m (n = 10⁻⁹).`;
  let x;

  if (s.vrsta === "young") {
    const { lam, d, a } = f;
    const sr = f.s;
    const N = s.pruge?.N;
    const L = N ? (N - 1) * sr : null;
    const UM = `Razmak pukotina pretvori u metre: ${fmt(f.dUm)} µm = ${formatSci(d)} m (µ = 10⁻⁶).`;
    const CM = `Razmak pruga pretvori u metre: ${cm(sr)} = ${formatSci(sr)} m.`;
    const BROJ = N
      ? `${N} pruga ima ${N - 1} razmaka (kao stupići ograde), pa je s = L / ${N - 1}, a ne L / ${N}.`
      : "";
    if (q.velicina === "s") {
      x = sr;
      if (N) {
        si(L / N, BROJ);
        si(
          L,
          "To je duljina cijele skupine pruga, a ne razmak dviju susjednih. Podijeli je brojem razmaka.",
        );
      } else {
        oba((lam * d) / a, "Iz λ = s·d/a slijedi s = λ·a/d.");
        oba(sr * 1e9, NM);
        oba(sr * 1e-6, UM);
      }
    } else if (q.velicina === "lambda") {
      x = lam;
      if (N) oba(((L / N) * d) / a, BROJ);
      oba((sr * a) / d, "Zamijenio si d i a: λ = s·d/a.");
      oba((sr * f.dUm) / a, UM);
      oba((sr * 100 * d) / a, CM);
      oba((sr * 100 * f.dUm) / a, "Pretvori u metre i s (iz cm) i d (iz µm).");
    } else if (q.velicina === "d") {
      x = d;
      oba((lam * sr) / a, "Iz λ = s·d/a slijedi d = λ·a/s.");
      oba((f.lambdaNm * a) / sr, NM);
      oba((lam * a) / (sr * 100), CM);
    } else if (q.velicina === "a") {
      x = a;
      oba((lam * d) / sr, "Iz λ = s·d/a slijedi a = s·d/λ.");
      oba((sr * d) / f.lambdaNm, NM);
      oba((sr * f.dUm) / lam, UM);
      oba((sr * 100 * d) / lam, CM);
    }
    if (DULJINA[J] && J !== "m") sirovo(x, uMetrima(x));
    return gotovo(s, q, x * uJ, J, krivo);
  }

  // rešetka
  const { lam, d } = f;
  const k0 = s.red ?? 1;
  const a0 = s.kut ?? kutReda(f, k0);
  const izKuta = f.izvor === "kut";
  const RAD =
    "Kalkulator računa u radijanima: prebaci ga na stupnjeve (DEG) pa ponovi.";
  // krive konstante rešetke (za d i za broj zareza, kad je d izveden iz kuta)
  const kriviD = () => {
    const out = [];
    if (!izKuta) return out;
    out.push([
      k0 * lam * sinKut(a0),
      "Iz d·sin α = kλ slijedi d = kλ / sin α.",
    ]);
    out.push([(k0 * lam) / Math.abs(Math.sin(a0)), RAD]);
    out.push([
      (k0 * lam) / Math.cos(rad(a0)),
      "U formuli je sin α, a ne cos α.",
    ]);
    out.push([
      (k0 * lam) / Math.tan(rad(a0)),
      "U formuli je sin α, a ne tg α.",
    ]);
    if (k0 > 1)
      out.push([
        lam / sinKut(a0),
        `Maksimum je ${k0}. reda, pa je d = ${k0}·λ / sin α.`,
      ]);
    out.push([(k0 * f.lambdaNm) / sinKut(a0), NM]);
    return out;
  };
  if (q.velicina === "d") {
    x = d;
    for (const [v, p] of kriviD()) oba(v, p);
    if (f.izvor === "zareza_po_mm") {
      const n = f.zareza;
      oba(
        1 / n,
        "Zareza je po milimetru: d = 1 mm / N = 10⁻³ m / N, a ne 1 m / N.",
      );
      oba(
        1e-2 / n,
        "Zareza je po milimetru, a ne po centimetru: d = 10⁻³ m / N.",
      );
    }
    if (J !== "µm")
      sirovo(
        d * 1e6,
        `To je d u mikrometrima; upiši ga u ${J}: ${fmt(d * 1e6)} µm = ${iznos(d / DULJINA[J], J)}.`,
      );
    if (J !== "m") sirovo(d, uMetrima(d));
  } else if (q.velicina === "zareza_po_mm") {
    x = f.zareza;
    sirovo(
      1 / d,
      "To je broj zareza po metru. Milimetar je 1000 puta kraći, pa u njega stane 1000 puta manje zareza.",
    );
    sirovo(
      1e-2 / d,
      "To je broj zareza po centimetru. Traži se po milimetru: 1 mm = 10⁻³ m.",
    );
    sirovo(
      1 / (d * 1e6),
      `1 mm = 1000 µm, pa je broj zareza 1000 µm / ${fmt(d * 1e6)} µm.`,
    );
    for (const [v, p] of kriviD()) sirovo(1e-3 / v, p);
  } else if (q.velicina === "alpha") {
    const k = q.red ?? 1;
    x = kutReda(f, k);
    const sn = (k * lam) / d;
    sirovo(
      Math.asin(sn),
      "Kut je u radijanima. Prebaci kalkulator na stupnjeve (DEG).",
    );
    sirovo(sn, "To je sin α. Kut je α = sin⁻¹(kλ/d).");
    sirovo(deg(Math.atan(sn)), "Iz d·sin α = kλ treba sin⁻¹, a ne tg⁻¹.");
    if (k > 1)
      sirovo(
        deg(Math.asin(lam / d)),
        `To je kut prvog reda. Za ${k}. red je sin α = ${k}·λ/d.`,
      );
    if (izKuta && k !== k0)
      sirovo(
        (a0 * k) / k0,
        "Kut ne raste razmjerno redu: razmjeran je sin α. Izračunaj sin α = kλ/d pa α.",
      );
  } else if (q.velicina === "lambda") {
    x = lam;
    const sa = sinKut(a0);
    if (k0 > 1) oba(d * sa, `Maksimum je ${k0}. reda: λ = d·sin α / ${k0}.`);
    oba((d / sa) * k0, "Iz d·sin α = kλ slijedi λ = d·sin α / k.");
    oba((d * Math.abs(Math.sin(a0))) / k0, RAD);
    if (f.izvor === "zareza_po_mm")
      oba(
        ((1 / f.zareza) * sa) / k0,
        "Zareza je po milimetru: d = 10⁻³ m / N, a ne 1 m / N.",
      );
    if (J !== "m") sirovo(lam, uMetrima(lam));
  } else if (q.velicina === "kmax") {
    x = f.kmax;
    if (Math.ceil(f.omjer) !== f.kmax)
      sirovo(
        Math.ceil(f.omjer),
        "Najviši red mora imati sin α < 1, pa d/λ zaokruži naniže.",
      );
    sirovo(
      f.omjer,
      "Red maksimuma je cijeli broj: najveći k za koji je k·λ < d.",
    );
    sirovo(
      f.brojMaksimuma,
      "To je broj svih maksimuma. Traži se najviši red k (s jedne strane).",
    );
  } else if (q.velicina === "broj_maksimuma") {
    x = f.brojMaksimuma;
    sirovo(
      f.kmax,
      "To je najviši red. Maksimumi su s obje strane središnjeg, a tu je i središnji (k = 0).",
    );
    sirovo(2 * f.kmax, "Zaboravio si središnji maksimum (k = 0).");
    if (Math.ceil(f.omjer) !== f.kmax)
      sirovo(
        2 * Math.ceil(f.omjer) + 1,
        "Najviši red mora imati sin α < 1, pa d/λ zaokruži naniže.",
      );
  }
  return gotovo(s, q, x * (DULJINA[J] ? uJ : 1), J, krivo);
}
function gotovo(s, q, vrijednost, J, krivo) {
  const tol =
    q.velicina === "alpha"
      ? 0.15
      : q.velicina === "kmax" || q.velicina === "broj_maksimuma"
        ? 0.01
        : Math.abs(vrijednost) * 0.01;
  // krive vrijednosti koje su (skoro) točne ili ponovljene ne smiju zbuniti provjeru
  const filt = [];
  for (const k of krivo) {
    if (!Number.isFinite(k.vrijednost) || k.vrijednost <= 0) continue;
    if (
      Math.abs(k.vrijednost - vrijednost) <=
      Math.max(tol * 1.5, Math.abs(vrijednost) * 0.015)
    )
      continue;
    if (
      filt.some(
        (o) =>
          Math.abs(o.vrijednost - k.vrijednost) <=
          Math.abs(k.vrijednost) * 0.005,
      )
    )
      continue;
    filt.push(k);
  }
  return {
    vrijednost,
    jedinica: J,
    oznaka: oznakaPolja(s, q),
    tol,
    krivo: [...(q.krivo ?? []), ...filt],
  };
}
export const pitanja = (s) => (Array.isArray(s.pitaj) ? s.pitaj : []);
export function checkPolje(s, i, input) {
  const q = pitanja(s)[i];
  const r = izracun(s, q);
  const J = r.jedinica === "°" ? "°" : r.jedinica;
  return checkNumber({
    input,
    answer: r.vrijednost,
    tol: r.tol,
    unit: J,
    krivo: r.krivo,
    savjet: q.savjet ?? s.savjet,
  });
}

// ── odaberi ───────────────────────────────────────────────────────────────────────────────────────
export function tocnaPozicija(s) {
  const f = fizika(s);
  const c = s.cilj ?? {};
  if (c.pruga === "svijetla") return c.red * f.s;
  if (c.pruga === "tamna") return (c.red - 0.5) * f.s;
  if (c.faza === "pi") return 0.5 * f.s;
  if (c.faza === "0") return 0;
  if (isNum(c.razlika_putova)) return c.razlika_putova * f.s;
  return 0;
}
const redni = (k) => `${k}.`;
function checkOdaberi(s, odgovor) {
  const y = isNum(odgovor) ? odgovor : odgovor?.y;
  if (!isNum(y))
    return {
      tocno: false,
      poruka: "Dodirni mjesto na zastoru (ili povuci sondu P).",
      prazno: true,
    };
  const f = fizika(s);
  const u = y / f.s;
  const pr = prugaU(u);
  const c = s.cilj;
  const razlika = Math.round(2 * Math.abs(u)) / 2;
  const R = `${formatNumber(razlika)} λ`;
  const svijetlaTu = `Tu je svijetla pruga: valovi stižu u fazi (razlika putova ${R}, cijeli broj valnih duljina) i pojačaju se.`;
  const tamnaTu = `Tu je tamna pruga: razlika putova je ${R}, pa valovi stižu u protufazi (brijeg na dolinu) i ponište se.`;
  if (c.pruga) {
    if (pr.vrsta === c.pruga && pr.red === c.red) return { tocno: true };
    if (pr.vrsta !== c.pruga)
      return {
        tocno: false,
        poruka: pr.vrsta === "svijetla" ? svijetlaTu : tamnaTu,
      };
    if (c.pruga === "svijetla") {
      if (pr.red === 0)
        return {
          tocno: false,
          poruka:
            "To je središnja svijetla pruga: do nje oba vala prijeđu jednak put, pa je ona **nulta** (k = 0). Brojimo od nje prema van.",
        };
      if (pr.red === c.red + 1)
        return {
          tocno: false,
          poruka: `To je ${redni(pr.red)} svijetla pruga. Središnja je nulta (k = 0), a prva je odmah do nje: brojimo 0, 1, 2…`,
        };
      return {
        tocno: false,
        poruka: `To je ${redni(pr.red)} svijetla pruga (središnja je nulta). Traži se ${redni(c.red)}`,
      };
    }
    return {
      tocno: false,
      poruka: `To je ${redni(pr.red)} tamna pruga. Prva tamna je odmah uz središnju svijetlu (razlika putova ½ λ). Traži se ${redni(c.red)}`,
    };
  }
  if (c.faza) {
    const trazi = c.faza === "pi" ? "tamna" : "svijetla";
    if (pr.vrsta === trazi) return { tocno: true };
    return {
      tocno: false,
      poruka:
        trazi === "tamna"
          ? `${svijetlaTu} U protufazi stižu tamo gdje je tamno.`
          : `${tamnaTu} U fazi stižu tamo gdje je svijetlo.`,
    };
  }
  if (Math.abs(Math.abs(u) - c.razlika_putova) <= 0.25) return { tocno: true };
  return {
    tocno: false,
    poruka: `Tu je razlika putova ${R}. Od jedne pruge do susjedne (svijetla → tamna) razlika putova naraste za ½ λ, a u središtu je 0.`,
  };
}
function tocnoOdaberi(s) {
  const f = fizika(s);
  const c = s.cilj;
  const y = Math.abs(tocnaPozicija(s));
  const gdje = y === 0 ? "u središtu zastora" : `na y = ±${cm(y)}`;
  if (c.pruga === "svijetla")
    return c.red === 0
      ? "središnja svijetla pruga (k = 0)"
      : `${c.red}. svijetla pruga, ${gdje} (razlika putova ${c.red} λ, razlika u fazi ${2 * c.red}π ≡ 0)`;
  if (c.pruga === "tamna")
    return `${c.red}. tamna pruga, ${gdje} (razlika putova ${formatNumber(c.red - 0.5)} λ, protufaza)`;
  if (c.faza === "pi")
    return `bilo koja tamna pruga, npr. prva, na y = ±${cm(0.5 * f.s)} (razlika putova ½ λ, razlika u fazi π)`;
  if (c.faza === "0")
    return "bilo koja svijetla pruga, npr. središnja (razlika putova 0, razlika u fazi 0)";
  return `pruga ${gdje}: razlika putova ${formatNumber(c.razlika_putova)} λ`;
}

// ── izmjeri ───────────────────────────────────────────────────────────────────────────────────────
export const jedinicaIzmjeri = (s) => normJed(s.jedinica) ?? "cm";
export function izmjeriStanje(s, i1, i2) {
  const f = fizika(s);
  if (!isNum(i1) || !isNum(i2)) return { n: 0, L: 0 };
  return { n: Math.abs(i2 - i1) + 1, L: Math.abs(i2 - i1) * f.s };
}
function checkIzmjeri(s, odgovor) {
  const f = fizika(s);
  const J = jedinicaIzmjeri(s);
  const uJ = 1 / DULJINA[J];
  const N = s.pruge.N;
  const L = (N - 1) * f.s;
  const { n, L: Lm } = izmjeriStanje(s, odgovor?.i1, odgovor?.i2);
  const krivo = [...(s.krivo ?? [])];
  const brojR = (m) =>
    `${m} pruga ima samo ${m - 1} razmaka (kao stupići ograde), pa L dijeliš s ${m - 1}, a ne s ${m}.`;
  krivo.push({ vrijednost: (L / N) * uJ, poruka: brojR(N) });
  if (n >= 2 && n !== N)
    krivo.push({ vrijednost: (Lm / n) * uJ, poruka: brojR(n) });
  for (const LL of [L, Lm])
    if (LL > 0)
      krivo.push({
        vrijednost: LL * uJ,
        poruka:
          "To je duljina cijele skupine pruga (L), a ne razmak dviju susjednih. Podijeli je brojem razmaka.",
      });
  for (const j of ["m", "cm", "mm"])
    if (j !== J)
      krivo.push({
        vrijednost: f.s / DULJINA[j],
        poruka: `To je razmak u ${j}, a upiši ga u ${J}.`,
      });
  const ans = f.s * uJ;
  return checkNumber({
    input: odgovor?.s ?? odgovor,
    answer: ans,
    tol: ans * 0.01,
    unit: J,
    krivo: krivo.filter(
      (k) => Math.abs(k.vrijednost - ans) > ans * 0.015 || s.krivo?.includes(k),
    ),
    savjet:
      s.savjet ??
      (n !== N
        ? `Najprije kaliperima obuhvati točno ${N} svijetlih pruga (sad ih je ${n}). Onda izmjerenu duljinu L podijeli brojem razmaka.`
        : "Izmjerenu duljinu L podijeli brojem razmaka između tih pruga."),
  });
}

// ── postavi ───────────────────────────────────────────────────────────────────────────────────────
export const CILJ_VELICINE = {
  young: { s: ["lambda", "d", "a"] },
  resetka: { alpha: ["lambda", "d", "zareza_po_mm"] },
};
export function vrijednostCilja(s, p) {
  const f = fizika(s, p);
  if (s.cilj.velicina === "s") return f.s * 100;
  return kutReda(f, s.cilj.red ?? 1);
}
export const tolCilja = (s) =>
  s.cilj.velicina === "s" ? Math.abs(s.cilj.vrijednost) * 0.01 : 0.15;
export const jedCilja = (s) => (s.cilj.velicina === "s" ? "cm" : "°");
export const oznakaCilja = (s) =>
  s.cilj.velicina === "s" ? "s" : `α${indeksTekst(s.cilj.red ?? 1)}`;
function pogadja(s, p) {
  const q = vrijednostCilja(s, p);
  return isNum(q) && Math.abs(q - s.cilj.vrijednost) <= tolCilja(s);
}
export function najboljaVrijednost(s) {
  const k = klizaciOd(s)[0];
  let best = null;
  let bd = Infinity;
  for (const x of vrijednostiKlizaca(k)) {
    const q = vrijednostCilja(s, { [k.id]: x });
    if (!isNum(q)) continue;
    const dd = Math.abs(q - s.cilj.vrijednost);
    if (dd < bd) [best, bd] = [x, dd];
  }
  return best;
}
const FIZ_SAVJET = {
  "s:lambda": "Veća valna duljina daje veći razmak pruga (s = λa/d).",
  "s:d":
    "Što su pukotine bliže (manji d), to su pruge dalje jedna od druge (s = λa/d).",
  "s:a": "Što je zastor dalje, to su pruge šire razmaknute (s = λa/d).",
  "alpha:lambda": "Veća valna duljina skreće pod većim kutom (sin α = kλ/d).",
  "alpha:d":
    "Manja konstanta rešetke (gušći zarezi) daje veći kut (sin α = kλ/d).",
  "alpha:zareza_po_mm":
    "Više zareza po milimetru znači manji d, a time veći kut (sin α = kλ/d).",
};
function checkPostavi(s, odgovor) {
  const k = klizaciOd(s)[0];
  const x = isNum(odgovor) ? odgovor : odgovor?.[k.id];
  if (!isNum(x))
    return { tocno: false, poruka: "Pomakni klizač.", prazno: true };
  if (pogadja(s, { [k.id]: x })) return { tocno: true };
  const hit = (s.krivo ?? []).find(
    (c) => Math.abs(c.vrijednost - x) <= k.korak / 2,
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const m = metaKlizaca(s, k.id);
  const q = vrijednostCilja(s, { [k.id]: x });
  if (!isNum(q))
    return {
      tocno: false,
      poruka: `Uz ${m.oznaka} = ${iznos(x, m.jedinica)} ${s.cilj.red ?? 1}. red uopće ne postoji (kλ > d). ${FIZ_SAVJET[`alpha:${k.id}`]}`,
    };
  const gore = vrijednostCilja(s, { [k.id]: x + k.korak });
  const raste = isNum(gore) ? gore > q : true;
  const vise = q < s.cilj.vrijednost === raste;
  return {
    tocno: false,
    poruka: `Sada je ${oznakaCilja(s)} = ${iznos(q, jedCilja(s))}, a treba ${iznos(s.cilj.vrijednost, jedCilja(s))}. ${FIZ_SAVJET[`${s.cilj.velicina}:${k.id}`]} Zato ${vise ? "povećaj" : "smanji"} ${m.kratko}.`,
  };
}

// ── što crtež smije pokazati ──────────────────────────────────────────────────────────────────────
// otkriveno: učenik je točno odgovorio ili je zatražio točan odgovor. Do tada ništa na crtežu, u brojevima ni u
// aria oznakama ne smije odati traženu vrijednost.
export function vidljivo(s, otkriveno = false) {
  const pr = new Set(Array.isArray(s.prikazi) ? s.prikazi : PRIKAZI[s.vrsta]);
  const n = s.nacin;
  const trazi = new Set(pitanja(s).map((q) => q.velicina));
  if (s.vrsta === "young") {
    const ist = n === "istrazi";
    return {
      boja: !(n === "izracunaj" && trazi.has("lambda") && !otkriveno),
      ravnalo: ist
        ? pr.has("ravnalo")
        : n === "izmjeri" || (n !== "izracunaj" && otkriveno),
      redovi: ist ? pr.has("redovi") : otkriveno && n !== "izmjeri",
      intenzitet: ist
        ? pr.has("intenzitet")
        : n === "odaberi" || n === "postavi",
      sonda: ist || n === "odaberi",
      delta: ist ? pr.has("razlika_putova") : n === "odaberi" && otkriveno,
      faza: ist ? pr.has("faza") : n === "odaberi" && otkriveno,
      valovi: ist || otkriveno,
      razmak: ist || otkriveno,
      oznakeIzracuna: n === "izracunaj",
    };
  }
  const ist = n === "istrazi";
  const kutTrazen =
    trazi.has("alpha") || trazi.has("kmax") || trazi.has("broj_maksimuma");
  // izracunaj: dok se ne odgovori, vidi se samo nulti red i red čiji je kut zadan (ili iz kojeg se računa λ)
  const zadani = s.kut != null || trazi.has("lambda") ? [0, s.red ?? 1] : [0];
  return {
    boja: !(n === "izracunaj" && trazi.has("lambda") && !otkriveno),
    // krivulja pokazuje sve maksimume, pa bi u izračunu odala kutove i najviši red
    intenzitet: ist ? pr.has("intenzitet") : n !== "izracunaj" || otkriveno,
    redoviVidljivi: n === "izracunaj" && !otkriveno ? zadani : null,
    oznakeRedova: ist ? pr.has("redovi") : otkriveno || n === "postavi",
    kutovi: ist ? pr.has("kutovi") : otkriveno,
    stupnjevi: ist || otkriveno || (n === "izracunaj" && !kutTrazen),
    zadaniKut: n === "izracunaj" && !otkriveno,
    oznakeIzracuna: n === "izracunaj",
  };
}

// skupina od N susjednih maksimuma oko središta (izmjeri, izracunaj s pruge): redovi od k1 do k2
export function skupinaPruga(s) {
  const N = s.pruge?.N ?? 0;
  const k1 = -Math.floor((N - 1) / 2);
  return { k1, k2: k1 + N - 1 };
}
// izmjeri: kaliperi počinju na tri središnje pruge (učenik ih mora raširiti)
export const pocetniKaliperi = () => ({ i1: -1, i2: 1 });

// oznake zadanih i traženih veličina na crtežu (izracunaj): {kljuc: tekst}; tražena je „?“ dok se ne otkrije
export function oznakeIzracuna(s, otkriveno = false) {
  const f = fizika(s);
  const trazi = new Set(pitanja(s).map((q) => q.velicina));
  const o = {};
  const st = (k, ozn, vr) =>
    (o[k] = `${ozn} = ${trazi.has(k) && !otkriveno ? "?" : vr}`);
  st("lambda", "λ", `${fmt(f.lambdaNm)} nm`);
  if (s.vrsta === "young") {
    st("d", "d", `${fmt(f.dUm)} µm`);
    st("a", "a", `${fmt(f.a)} m`);
    if (s.pruge) {
      o.L = `L = ${cm((s.pruge.N - 1) * f.s)}`;
      if (trazi.has("s")) st("s", "s", cm(f.s));
    } else st("s", "s", cm(f.s));
    return o;
  }
  const k0 = s.red ?? 1;
  if (f.izvor === "zareza_po_mm" || trazi.has("zareza_po_mm"))
    st("zareza_po_mm", "N", `${fmt(f.zareza)} zareza/mm`);
  if (f.izvor === "d" || trazi.has("d"))
    st(
      "d",
      "d",
      f.dUm >= 0.1 && !trazi.has("d")
        ? `${fmt(f.dUm)} µm`
        : `${formatSci(f.d)} m`,
    );
  if (s.kut != null || trazi.has("lambda"))
    o.alpha = `α${indeksTekst(k0)} = ${fmt(s.kut ?? kutReda(f, k0))}°`;
  for (const q of pitanja(s)) {
    if (q.velicina === "alpha") {
      const k = q.red ?? 1;
      o[`alpha${k}`] =
        `α${indeksTekst(k)} = ${otkriveno ? `${fmt(kutReda(f, k))}°` : "?"}`;
    }
    if (q.velicina === "kmax") o.kmax = `kₘₐₓ = ${otkriveno ? f.kmax : "?"}`;
    if (q.velicina === "broj_maksimuma")
      o.broj = `broj maksimuma = ${otkriveno ? f.brojMaksimuma : "?"}`;
  }
  return o;
}

// ── opis ──────────────────────────────────────────────────────────────────────────────────────────
const OPIS = `Interferencija svjetlosti (fizika, matura): Youngov pokus i optička rešetka. Polja: tekst, vrsta ("young" | "resetka"), nacin.
Iznosi: lambda (nm, 380–750). Young: d (razmak pukotina, µm, 10–1000), a (udaljenost zastora, m, 0,2–10); s = λa/d (aproksimacija malih kutova, s/a < 0,05). Rešetka: točno jedno od d (konstanta, µm, 0,8–50), zareza_po_mm (20–1250) ili kut + red (kut maksimuma reda red u °; d = red·λ / sin kut), red? (zadano 1) je red čiji se kut zadaje ili prikazuje; N? (broj osvijetljenih pukotina za oštrinu maksimuma, 2–50, zadano 20).
Klizači (istrazi do 3, postavi točno 1): klizaci: [{id, min, max, korak, pocetak?}], id je "lambda" | "d" | "a" (Young) ili "lambda" | "d" | "zareza_po_mm" | "N" (rešetka); veličinu koju zadaje klizač ne piši i kao broj. Oznake i jedinice klizača dodaje widget (λ u nm s bojom spektra, d u µm, a u m).
Crtež: Young — laser, dvije pukotine (d povećan), zastor s prugama u boji λ, krivulja intenziteta cos², ravnalo u cm, sonda P sa zrakama iz obje pukotine, istaknutim viškom puta Δ i pločom s dva vala i njihovim zbrojem (razlika u fazi 0, π, 2π ≡ 0…). Rešetka — kutomjer s maksimumima redova 0, ±1, ±2… pod kutovima sin α = kλ/d, polarna krivulja intenziteta za N pukotina i tablica kutova.
Načini:
- "istrazi" (pogledaj): klizači; prikazi? (Young: razlika_putova, faza, intenzitet, redovi, ravnalo; rešetka: intenzitet, redovi, kutovi; zadano sve). Sonda se vuče po zastoru.
- "odaberi" (Tvoj red, samo Young): učenik dodirne zastor. cilj: {pruga: "svijetla" | "tamna", red} (središnja svijetla je red 0, prva tamna red 1; red ≤ 4) | {faza: "0" | "pi"} (bilo koja svijetla / tamna) | {razlika_putova: x} (u λ, višekratnik od 0,5, ≤ 4). Tolerancija ±¼ razmaka pruga; poruke za krivi red (nulta pruga), svijetlu umjesto tamne i obrnuto dodaju se same. Do provjere nema oznaka redova, Δ ni faze.
- "izmjeri" (Tvoj red, samo Young): pruge: {N} (3–12); jedinica? ("cm" zadano | "mm" | "m"). Učenik kaliperima obuhvati N svijetlih pruga (L se očita), pa upiše s = L/(N − 1). Auto-greške: L/N, cijela duljina L, kriva jedinica. ${"krivo?"} kao kod broja.
- "izracunaj" (Tvoj red): pitaj: [{velicina, jedinica?, red?, krivo?, savjet?}] (1–3 polja). Young: s (cm | mm | m), lambda (nm | µm | m), d (µm | mm | m), a (m | cm); pruge? {N}: na zastoru je označena skupina od N pruga s duljinom L. Rešetka: d (m | µm | mm), zareza_po_mm, alpha (°, red), lambda (nm | µm | m; d ili zareza_po_mm zadani), kmax, broj_maksimuma. Tražene veličine na crtežu su „?“ (λ tražena → bijela svjetlost). Tolerancija 1 % (kut ±0,15°). Auto-greške: nm/µm/cm nepretvoreni, L/N umjesto L/(N − 1), zamijenjeni d i a, d = λ·sin α, cos/tg umjesto sin, kalkulator u radijanima, zaboravljen red k, zareza po metru ili centimetru, k_max zaokružen naviše, broj maksimuma bez središnjeg.
- "postavi" (Tvoj red): točno jedan klizač; cilj: {velicina: "s", vrijednost (cm)} (Young; klizač lambda, d ili a) | {velicina: "alpha", red?, vrijednost (°)} (rešetka; klizač lambda, d ili zareza_po_mm). Tražena veličina, ravnalo i stupnjevi se ne vide do provjere. krivo?: [{vrijednost (klizača), poruka}].`;

const PRIMJER = {
  tip: TIP,
  vrsta: "young",
  nacin: "izmjeri",
  lambda: 400,
  d: 80,
  a: 4.4,
  pruge: { N: 9 },
  tekst:
    "Pukotine su razmaknute 80 µm, a zastor je 4,4 m od njih. Kaliperima obuhvati **9 susjednih svijetlih pruga**, pa izračunaj razmak dviju susjednih pruga.",
};

const PRIMJERI = [
  {
    tip: TIP,
    vrsta: "young",
    nacin: "istrazi",
    klizaci: [
      { id: "lambda", min: 380, max: 750, korak: 5, pocetak: 400 },
      { id: "d", min: 40, max: 200, korak: 10, pocetak: 80 },
      { id: "a", min: 1, max: 6, korak: 0.1, pocetak: 4.4 },
    ],
    tekst:
      "Povuci sondu **P** po zastoru i gledaj kako dva vala stižu: kolika je razlika putova i jesu li u fazi. Zatim mijenjaj λ, d i a i gledaj razmak pruga.",
  },
  {
    tip: TIP,
    vrsta: "young",
    nacin: "odaberi",
    lambda: 400,
    d: 80,
    a: 4.4,
    cilj: { faza: "pi" },
    tekst:
      "Dodirni na zastoru mjesto u koje dva vala stižu **u protufazi** (razlika u fazi π).",
  },
  {
    tip: TIP,
    vrsta: "young",
    nacin: "odaberi",
    lambda: 600,
    d: 120,
    a: 3.8,
    cilj: { pruga: "svijetla", red: 2 },
    tekst:
      "Dodirni **drugu svijetlu prugu** (maksimum drugog reda) na zastoru.",
  },
  {
    tip: TIP,
    vrsta: "young",
    nacin: "izracunaj",
    lambda: 400,
    d: 80,
    a: 4.4,
    pruge: { N: 9 },
    pitaj: [
      { velicina: "s", jedinica: "cm" },
      { velicina: "lambda", jedinica: "nm" },
    ],
    tekst:
      "Pukotine su razmaknute 80 µm, a zastor je 4,4 m od njih. Između prvog i zadnjeg od 9 susjednih maksimuma izmjereno je 17,6 cm. Koliki je razmak susjednih pruga i kolika je valna duljina lasera?",
  },
  {
    tip: TIP,
    vrsta: "young",
    nacin: "postavi",
    d: 80,
    a: 4.4,
    klizaci: [{ id: "lambda", min: 380, max: 750, korak: 5, pocetak: 600 }],
    cilj: { velicina: "s", vrijednost: 2.2 },
    tekst:
      "Pukotine su razmaknute 80 µm, a zastor je 4,4 m daleko. **Namjesti valnu duljinu** lasera tako da razmak susjednih pruga bude 2,2 cm.",
  },
  {
    tip: TIP,
    vrsta: "resetka",
    nacin: "istrazi",
    klizaci: [
      { id: "lambda", min: 380, max: 750, korak: 5, pocetak: 540 },
      { id: "zareza_po_mm", min: 50, max: 800, korak: 10, pocetak: 200 },
      { id: "N", min: 2, max: 20, korak: 1, pocetak: 2 },
    ],
    tekst:
      "Povećaj **broj osvijetljenih pukotina** od 2 do 20: maksimumi ostaju na istim mjestima, ali postaju oštri. Zatim mijenjaj λ i broj zareza po milimetru.",
  },
  {
    tip: TIP,
    vrsta: "resetka",
    nacin: "izracunaj",
    lambda: 540,
    kut: 6.2,
    red: 1,
    pitaj: [{ velicina: "d", jedinica: "m" }, { velicina: "zareza_po_mm" }],
    tekst:
      "Laserska svjetlost valne duljine 540 nm pada okomito na optičku rešetku. Maksimum prvog reda vidi se pod kutom 6,2°. Kolika je konstanta rešetke i koliko zareza po milimetru ima ta rešetka?",
  },
  {
    tip: TIP,
    vrsta: "resetka",
    nacin: "izracunaj",
    lambda: 420,
    zareza_po_mm: 800,
    pitaj: [{ velicina: "alpha", red: 2 }, { velicina: "kmax" }],
    tekst:
      "Svjetlost valne duljine 420 nm pada na rešetku s 800 zareza po milimetru. Pod kojim se kutom vidi maksimum drugog reda i koji je najviši red koji se još vidi?",
  },
  {
    tip: TIP,
    vrsta: "resetka",
    nacin: "postavi",
    lambda: 540,
    klizaci: [
      { id: "zareza_po_mm", min: 50, max: 800, korak: 10, pocetak: 400 },
    ],
    cilj: { velicina: "alpha", red: 1, vrijednost: 6.2 },
    tekst:
      "Laser valne duljine 540 nm. **Namjesti broj zareza po milimetru** tako da se maksimum prvog reda vidi pod kutom 6,2°.",
  },
];

// ── validacija ────────────────────────────────────────────────────────────────────────────────────
function validateKlizaci(s, need, { najmanje = 0, najvise = 3 } = {}) {
  if (s.klizaci == null) {
    need(najmanje === 0, `${s.nacin} treba klizači (${najmanje})`);
    return [];
  }
  if (
    !need(
      Array.isArray(s.klizaci) &&
        s.klizaci.length >= najmanje &&
        s.klizaci.length <= najvise,
      `klizaci mora biti popis od ${najmanje} do ${najvise} klizača`,
    )
  )
    return [];
  const ids = [];
  s.klizaci.forEach((k, i) => {
    const at = `klizaci[${i}]`;
    if (
      !need(
        KLIZACI_VRSTE[s.vrsta].includes(k?.id),
        `${at}.id mora biti jedan od: ${KLIZACI_VRSTE[s.vrsta].join(", ")}`,
      )
    )
      return;
    need(!ids.includes(k.id), `${at}: klizač „${k.id}“ je već zadan`);
    ids.push(k.id);
    need(
      s[k.id] == null,
      `${at}: „${k.id}“ zadaje klizač, pa ga ne piši i kao broj u specu`,
    );
    for (const f of Object.keys(k))
      need(
        ["id", "min", "max", "korak", "pocetak"].includes(f),
        `${at}: nepoznato polje „${f}“ (oznaku i jedinicu dodaje widget)`,
      );
    const m = metaKlizaca(s, k.id);
    if (
      !need(
        isNum(k.min) &&
          isNum(k.max) &&
          isNum(k.korak) &&
          k.korak > 0 &&
          k.min < k.max,
        `${at}: min < max i korak > 0 moraju biti brojevi`,
      )
    )
      return;
    need(
      k.min >= m.min && k.max <= m.max,
      `${at}: raspon za ${k.id} mora biti unutar ${formatNumber(m.min)}–${formatNumber(m.max)} ${m.jedinica}`,
    );
    const n = (k.max - k.min) / k.korak;
    need(
      Math.abs(n - Math.round(n)) < 1e-6 && n <= 2000,
      `${at}: (max − min) mora biti višekratnik koraka (najviše 2000 koraka)`,
    );
    if (k.id === "N")
      need(
        Number.isInteger(k.min) && Number.isInteger(k.korak),
        `${at}: broj pukotina je cijeli broj`,
      );
    if (k.pocetak != null)
      need(
        isNum(k.pocetak) &&
          k.pocetak >= k.min &&
          k.pocetak <= k.max &&
          Math.abs(
            (k.pocetak - k.min) / k.korak -
              Math.round((k.pocetak - k.min) / k.korak),
          ) < 1e-6,
        `${at}.pocetak mora biti vrijednost klizača (od min do max u koracima)`,
      );
  });
  return ids;
}
const brojU = (s, need, ime, min, max, opis) =>
  need(
    isNum(s[ime]) && s[ime] >= min && s[ime] <= max,
    `${ime} mora biti broj od ${formatNumber(min)} do ${formatNumber(max)} (${opis})`,
  );
// sve kombinacije krajeva klizača (za provjere „vrijedi za svaku postavku“)
function krajevi(s) {
  let out = [{}];
  for (const k of klizaciOd(s))
    out = out.flatMap((p) => [
      { ...p, [k.id]: k.min },
      { ...p, [k.id]: k.max },
    ]);
  return out;
}

function validate(s) {
  const { list, need } = problems();
  need(isText(s.tekst), "interferencija treba „tekst“");
  if (!need(VRSTE.includes(s.vrsta), `vrsta mora biti: ${VRSTE.join(" ili ")}`))
    return list;
  if (
    !need(
      NACINI[s.vrsta].includes(s.nacin),
      `nacin za vrstu ${s.vrsta} mora biti jedan od: ${NACINI[s.vrsta].join(", ")}`,
    )
  )
    return list;
  for (const k of Object.keys(s))
    need(POLJA.includes(k), `interferencija: nepoznato polje „${k}“`);
  const young = s.vrsta === "young";
  const nac = s.nacin;

  const ids =
    nac === "istrazi"
      ? validateKlizaci(s, need, { najvise: 3 })
      : nac === "postavi"
        ? validateKlizaci(s, need, { najmanje: 1, najvise: 1 })
        : (need(
            s.klizaci == null,
            `u načinu ${nac} nema klizača (vrijednosti su zadane)`,
          ),
          []);
  if (list.length) return list;
  const imaK = (id) => ids.includes(id);

  if (!imaK("lambda"))
    brojU(
      s,
      need,
      "lambda",
      380,
      750,
      "valna duljina u nm, vidljiva svjetlost",
    );
  if (young) {
    for (const f of ["zareza_po_mm", "kut", "red", "N"])
      need(s[f] == null, `polje „${f}“ postoji samo za rešetku`);
    if (!imaK("d")) brojU(s, need, "d", 10, 1000, "razmak pukotina u µm");
    if (!imaK("a")) brojU(s, need, "a", 0.2, 10, "udaljenost zastora u m");
  } else {
    need(s.a == null, "rešetka nema „a“: kutovi se čitaju na kutomjeru");
    const izvori = ["d", "zareza_po_mm", "kut"].filter((f) => s[f] != null);
    const kIzvor = ids.filter((i) => i === "d" || i === "zareza_po_mm");
    need(
      izvori.length + kIzvor.length === 1,
      "rešetka treba točno jedno od: d (µm), zareza_po_mm, kut (+ red) ili klizač d / zareza_po_mm",
    );
    if (s.d != null) brojU(s, need, "d", 0.8, 50, "konstanta rešetke u µm");
    if (s.zareza_po_mm != null)
      brojU(s, need, "zareza_po_mm", 20, 1250, "broj zareza po milimetru");
    if (s.red != null)
      need(
        Number.isInteger(s.red) && s.red >= 1 && s.red <= 10,
        "red mora biti cijeli broj od 1 do 10",
      );
    if (s.kut != null) {
      brojU(s, need, "kut", 0.5, 80, "kut maksimuma reda „red“ u °");
      need(
        !imaK("lambda"),
        "uz kut λ mora biti broj (d se računa iz kuta i λ), a ne klizač",
      );
    }
    if (s.N != null)
      need(
        Number.isInteger(s.N) && s.N >= 2 && s.N <= 50,
        "N (broj osvijetljenih pukotina) mora biti cijeli broj od 2 do 50",
      );
    if (s.N != null)
      need(!imaK("N"), "N zadaje klizač, pa ga ne piši i kao broj");
  }
  if (list.length) return list;

  // fizika mora imati smisla za svaku postavku klizača
  for (const p of krajevi(s)) {
    const f = fizika(s, p);
    if (young)
      need(
        f.s / f.a < 0.05,
        `s/a = λ/d mora biti < 0,05 (aproksimacija malih kutova iz λ = sd/a); uz λ = ${fmt(f.lambdaNm)} nm i d = ${fmt(f.dUm)} µm je ${fmt(f.s / f.a)}`,
      );
    else
      need(
        f.dUm >= 0.8 && f.dUm <= 50,
        `konstanta rešetke mora biti 0,8–50 µm (sad ${fmt(f.dUm)} µm)`,
      );
  }
  if (list.length) return list;
  const f = fizika(s);
  if (!young && s.kut != null && s.red != null)
    need(
      Math.abs(kutReda(f, s.red) - s.kut) < 0.1,
      "zadani kut i izračunati kut se ne slažu",
    );
  if (!young && s.nacin !== "istrazi" && s.nacin !== "postavi")
    need(
      f.kmax >= (s.red ?? 1),
      `uz ove brojeve ${s.red ?? 1}. red ne postoji (kλ ≥ d)`,
    );

  if (s.prikazi != null) {
    need(nac === "istrazi", "prikazi postoji samo u načinu istrazi");
    need(
      Array.isArray(s.prikazi) &&
        s.prikazi.length >= 1 &&
        s.prikazi.every((x) => PRIKAZI[s.vrsta].includes(x)),
      `prikazi mora biti popis od: ${PRIKAZI[s.vrsta].join(", ")}`,
    );
  }
  const samo = (polja, gdje) =>
    polja.forEach((p) =>
      need(s[p] == null, `polje „${p}“ postoji samo u načinu ${gdje}`),
    );
  if (nac !== "izracunaj") samo(["pitaj"], "izracunaj");
  if (nac !== "izmjeri") samo(["jedinica"], "izmjeri");
  if (nac !== "izmjeri" && nac !== "izracunaj")
    samo(["pruge"], "izmjeri ili izracunaj");
  if (nac !== "odaberi" && nac !== "postavi")
    samo(["cilj"], "odaberi ili postavi");
  if (nac === "istrazi" || nac === "odaberi" || nac === "izracunaj")
    samo(["krivo"], "izmjeri ili postavi (u izracunaj krivo ide u pitaj)");

  if (nac === "istrazi") noAnswerFields(s, need);
  if (s.pruge != null) {
    need(
      s.pruge &&
        Object.keys(s.pruge).every((k) => k === "N") &&
        Number.isInteger(s.pruge.N) &&
        s.pruge.N >= 3 &&
        s.pruge.N <= 12,
      "pruge mora biti {N} s cijelim N od 3 do 12",
    );
  }
  if (nac === "odaberi") {
    const c = s.cilj;
    if (need(c && typeof c === "object", "odaberi treba cilj")) {
      const kljuc = Object.keys(c).sort().join(",");
      if (kljuc === "pruga,red")
        need(
          ["svijetla", "tamna"].includes(c.pruga) &&
            Number.isInteger(c.red) &&
            c.red >= (c.pruga === "svijetla" ? 0 : 1) &&
            c.red <= 4,
          "cilj {pruga: svijetla (red 0–4) | tamna (red 1–4), red}",
        );
      else if (kljuc === "faza")
        need(["0", "pi"].includes(c.faza), 'cilj.faza mora biti "0" ili "pi"');
      else if (kljuc === "razlika_putova")
        need(
          isNum(c.razlika_putova) &&
            c.razlika_putova >= 0 &&
            c.razlika_putova <= 4 &&
            Number.isInteger(c.razlika_putova * 2),
          "cilj.razlika_putova mora biti višekratnik od 0,5 između 0 i 4 (u λ)",
        );
      else
        need(
          false,
          'cilj mora biti {pruga, red}, {faza: "0" | "pi"} ili {razlika_putova}',
        );
    }
  }
  if (nac === "izmjeri") {
    need(s.pruge != null, "izmjeri treba pruge: {N}");
    need(
      s.jedinica == null || ["cm", "mm", "m"].includes(normJed(s.jedinica)),
      "jedinica mora biti cm, mm ili m",
    );
    if (!list.length) {
      const J = jedinicaIzmjeri(s);
      validateKrivo(s.krivo, f.s / DULJINA[J], (f.s / DULJINA[J]) * 0.01, need);
    }
  }
  if (nac === "izracunaj") {
    if (
      need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "pitaj mora biti popis od 1 do 3 polja",
      )
    ) {
      const vel = VELICINE[s.vrsta];
      s.pitaj.forEach((q, i) => {
        const at = `pitaj[${i}]`;
        if (
          !need(
            q && q.velicina in vel,
            `${at}.velicina mora biti: ${Object.keys(vel).join(", ")}`,
          )
        )
          return;
        for (const k of Object.keys(q))
          need(
            ["velicina", "jedinica", "red", "krivo", "savjet"].includes(k),
            `${at}: nepoznato polje „${k}“`,
          );
        const dop = JED_DOPUSTENE[q.velicina];
        if (q.jedinica != null)
          need(
            dop.includes(normJed(q.jedinica)),
            dop.length
              ? `${at}.jedinica za ${q.velicina} mora biti: ${dop.join(", ")}`
              : `${at}: ${q.velicina} nema jedinicu`,
          );
        if (q.red != null)
          need(
            q.velicina === "alpha" &&
              Number.isInteger(q.red) &&
              q.red >= 1 &&
              q.red <= f.kmax,
            `${at}.red postoji samo za alpha i mora biti red koji postoji (1–${f.kmax})`,
          );
        if (q.savjet != null)
          need(isText(q.savjet), `${at}.savjet mora biti tekst`);
        need(
          !s.pitaj.some(
            (o, j) =>
              j < i &&
              o.velicina === q.velicina &&
              (o.red ?? 1) === (q.red ?? 1),
          ),
          `${at}: ista veličina je već u pitaj`,
        );
        if (!young && q.velicina === "lambda")
          need(
            s.kut == null,
            `${at}: za λ zadaj d ili zareza_po_mm (i red), a ne kut`,
          );
        if (!young && (q.velicina === "d" || q.velicina === "zareza_po_mm"))
          need(
            s.d == null || q.velicina !== "d",
            `${at}: d je zadan, pa ga ne pitaj`,
          );
        if (!young && q.velicina === "zareza_po_mm")
          need(
            s.zareza_po_mm == null,
            `${at}: broj zareza je zadan, pa ga ne pitaj`,
          );
        if (!list.length) {
          const r = izracun(s, q);
          validateKrivo(q.krivo, r.vrijednost, r.tol, need, `${at}.krivo`);
        }
      });
      if (young && s.pruge) {
        need(
          !s.pitaj.some((q) => q.velicina !== "s" && q.velicina !== "lambda"),
          "uz pruge Young pita s i/ili lambda",
        );
      }
    }
    need(s.savjet == null || isText(s.savjet), "savjet mora biti tekst");
  }
  if (nac === "postavi") {
    const c = s.cilj;
    const dop = CILJ_VELICINE[s.vrsta];
    if (
      need(
        c && c.velicina in dop && isNum(c.vrijednost) && c.vrijednost > 0,
        `postavi treba cilj: {velicina: ${Object.keys(dop).join(" | ")}, vrijednost${young ? " (cm)" : " (°), red?"}}`,
      )
    ) {
      for (const k of Object.keys(c))
        need(
          ["velicina", "vrijednost", "red"].includes(k),
          `cilj: nepoznato polje „${k}“`,
        );
      need(
        dop[c.velicina].includes(ids[0]),
        `za cilj ${c.velicina} klizač mora biti: ${dop[c.velicina].join(", ")}`,
      );
      if (c.velicina === "alpha") {
        need(c.vrijednost < 80, "cilj.vrijednost (kut) mora biti manji od 80°");
        if (c.red != null)
          need(
            Number.isInteger(c.red) && c.red >= 1 && c.red <= 10,
            "cilj.red mora biti cijeli broj 1–10",
          );
      } else need(c.red == null, "cilj za s nema red");
      if (!list.length) {
        const k = klizaciOd(s)[0];
        const best = najboljaVrijednost(s);
        need(
          best != null && pogadja(s, { [k.id]: best }),
          "cilj se ne može postići nijednom vrijednošću klizača (u toleranciji 1 % ili ±0,15°)",
        );
        need(
          !pogadja(s, pocetneVrijednosti(s)),
          "početna vrijednost klizača već ostvaruje cilj",
        );
        if (s.krivo != null) {
          validateKrivo(s.krivo, null, 0, need);
          if (Array.isArray(s.krivo))
            s.krivo.forEach(
              (x, i) =>
                isNum(x?.vrijednost) &&
                need(
                  !pogadja(s, { [k.id]: x.vrijednost }),
                  `krivo[${i}].vrijednost ostvaruje cilj, a to je točan odgovor`,
                ),
            );
        }
      }
    }
  }
  return list;
}

// ── widget ────────────────────────────────────────────────────────────────────────────────────────
export const interferencija = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  fizika,
  validate,
  check(s, odgovor) {
    if (s.nacin === "odaberi") return checkOdaberi(s, odgovor);
    if (s.nacin === "izmjeri") return checkIzmjeri(s, odgovor);
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "izracunaj") {
      const q = pitanja(s);
      const ul = Array.isArray(odgovor) ? odgovor : [odgovor];
      if (q.some((_, i) => !String(ul[i] ?? "").trim()))
        return {
          tocno: false,
          poruka: q.length > 1 ? "Upiši broj u svako polje." : "Upiši broj.",
          prazno: true,
        };
      for (let i = 0; i < q.length; i++) {
        const r = checkPolje(s, i, ul[i]);
        if (!r.tocno)
          return {
            ...r,
            polje: i,
            poruka: q.length > 1 ? `U ${i + 1}. polju: ${r.poruka}` : r.poruka,
          };
      }
      return { tocno: true };
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "odaberi") return tocnoOdaberi(s);
    if (s.nacin === "izmjeri") {
      const f = fizika(s);
      const J = jedinicaIzmjeri(s);
      const N = s.pruge.N;
      const L = (N - 1) * f.s;
      return `s = L / ${N - 1} = ${iznos(L / DULJINA[J], J)} / ${N - 1} = ${iznos(f.s / DULJINA[J], J)}`;
    }
    if (s.nacin === "izracunaj")
      return pitanja(s)
        .map((q) => {
          const r = izracun(s, q);
          const m = VELICINE[s.vrsta][q.velicina];
          return `${r.oznaka} = ${iznos(r.vrijednost, r.jedinica)}${m.iza ? ` ${m.iza}` : ""}`;
        })
        .join("; ");
    if (s.nacin === "postavi") {
      const k = klizaciOd(s)[0];
      const m = metaKlizaca(s, k.id);
      const x = najboljaVrijednost(s);
      return k.id === "zareza_po_mm"
        ? `${fmt(x)} zareza po milimetru`
        : `${m.kratko} = ${iznos(x, m.jedinica)}`;
    }
    return "";
  },
  brojcaniOdgovor(s) {
    if (s?.nacin === "izmjeri")
      return fizika(s).s / DULJINA[jedinicaIzmjeri(s)];
    if (s?.nacin === "izracunaj") {
      const q = pitanja(s).at(-1);
      return q ? izracun(s, q).vrijednost : null;
    }
    if (s?.nacin === "postavi") return najboljaVrijednost(s);
    return null;
  },
};
