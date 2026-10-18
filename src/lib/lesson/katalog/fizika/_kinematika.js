// Pomoćni kod za widgete kinematike (gibanje, crtaj_graf): ljestvice osi, nazivi osi i vrijednosti iz speca koje
// smiju biti broj ili izraz s id-jevima klizača. Čisti JS (bez DOM-a i Intl), jer se izvršava i na backendu.
import { compile } from "../../core/expr.js";
import { isNum } from "../../core/number.js";

export const ID = /^[A-Za-z_][A-Za-z_0-9]*$/;

// Lijep korak ljestvice: 1, 2, 2,5 ili 5 × 10ⁿ, tako da raspon ima otprilike `koliko` podjeljaka.
export function lijepKorak(raspon, koliko = 6) {
  if (!(raspon > 0)) return 1;
  const sirovo = raspon / koliko;
  const p = Math.pow(10, Math.floor(Math.log10(sirovo)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= sirovo * 0.999) return k * p;
  return 10 * p;
}

// Vrijednosti crtica od a do b s korakom k (zaokružene, bez 0,30000000000000004).
export function crtice(a, b, k) {
  const out = [];
  if (!(k > 0)) return out;
  for (
    let i = Math.ceil(a / k - 1e-9);
    i * k <= b + 1e-9 && out.length < 200;
    i++
  )
    out.push(Number((i * k).toPrecision(12)));
  return out;
}

// Raspon [od, do] koji obuhvaća sve vrijednosti, poravnat na lijep korak.
export function lijepRaspon(min, max, koliko = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (max - min < 1e-9) {
    const d = Math.max(1, Math.abs(max) * 0.5);
    [min, max] = [min - (min < 0 ? d : 0), max + d];
  }
  const k = lijepKorak(max - min, koliko);
  return [
    Number((Math.floor(min / k + 1e-9) * k).toPrecision(12)),
    Number((Math.ceil(max / k - 1e-9) * k).toPrecision(12)),
  ];
}

// „v (m/s)“ → {ime: "v", jedinica: "m/s"}
export function dijeloviOsi(os, zamjena = "") {
  const t = String(os ?? "").trim();
  const m = t.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  return m
    ? { ime: m[1].trim() || zamjena, jedinica: m[2].trim() }
    : { ime: t || zamjena, jedinica: "" };
}

// Vrijednost polja: broj ili izraz s id-jevima klizača („v“, „-a“, „2*v“). Izrazi se kompiliraju jednom.
const PREVEDENO = new Map();
export function prevedi(izraz) {
  if (!PREVEDENO.has(izraz)) {
    try {
      PREVEDENO.set(izraz, compile(izraz));
    } catch (e) {
      PREVEDENO.set(izraz, { greska: e.message });
    }
  }
  return PREVEDENO.get(izraz);
}

export function izracunaj(v, parametri = {}, zadano = NaN) {
  if (v == null) return zadano;
  if (isNum(v)) return v;
  if (typeof v !== "string") return NaN;
  const c = prevedi(v);
  if (c.greska) return NaN;
  try {
    const r = c.fn(parametri);
    return Number.isFinite(r) ? r : NaN;
  } catch {
    return NaN;
  }
}

// Provjera polja koje smije biti broj ili izraz s klizačima; vraća true ako je ispravno.
export function provjeriVrijednost(v, ids, need, gdje) {
  if (isNum(v)) return true;
  if (typeof v !== "string" || !v.trim())
    return need(false, `${gdje} mora biti broj ili izraz s klizačima`);
  const c = prevedi(v);
  if (!need(!c.greska, `${gdje}: ${c.greska}`)) return false;
  const nepoznate = c.vars.filter((x) => !ids.includes(x));
  return need(
    !nepoznate.length,
    `${gdje} koristi nepoznate varijable: ${nepoznate.join(", ")} (smiju samo id-jevi klizača)`,
  );
}

// Varijable koje izraz koristi (za provjeru koriste li se svi klizači).
export const varijable = (v) =>
  typeof v === "string" && !prevedi(v).greska ? prevedi(v).vars : [];

// Klizači kao u widgetu „klizac“: {id, oznaka, min, max, korak, pocetak, jedinica?}
export function provjeriKlizace(klizaci, need, najvise = 3) {
  const ids = [];
  if (klizaci == null) return ids;
  if (
    !need(
      Array.isArray(klizaci) && klizaci.length <= najvise,
      `klizaci mora biti popis od najviše ${najvise} klizača`,
    )
  )
    return ids;
  klizaci.forEach((k, i) => {
    need(
      ID.test(k?.id ?? ""),
      `klizaci[${i}].id mora biti ime varijable (slova, bez razmaka)`,
    );
    need(
      typeof k?.oznaka === "string" && k.oznaka.trim().length > 0,
      `klizaci[${i}] treba „oznaka“`,
    );
    ids.push(k?.id);
    if (
      need(
        [k?.min, k?.max, k?.korak, k?.pocetak].every(isNum),
        `klizaci[${i}] treba brojeve min, max, korak, pocetak`,
      )
    ) {
      need(
        k.max > k.min && k.korak > 0,
        `klizaci[${i}]: mora biti min < max i korak > 0`,
      );
      need(
        k.pocetak >= k.min && k.pocetak <= k.max,
        `klizaci[${i}].pocetak mora biti između min i max`,
      );
      need(
        (k.max - k.min) / k.korak <= 1000,
        `klizaci[${i}] ima previše koraka (najviše 1000)`,
      );
    }
  });
  need(
    new Set(ids).size === ids.length,
    "id-jevi klizača moraju biti različiti",
  );
  return ids;
}

// Sve vrijednosti klizača (min, min + korak, …, max).
export function vrijednostiKlizaca(k) {
  const n = Math.round((k.max - k.min) / k.korak);
  return Array.from({ length: n + 1 }, (_, i) =>
    Number((k.min + i * k.korak).toPrecision(12)),
  );
}

export const pocetniParametri = (s) =>
  Object.fromEntries((s.klizaci ?? []).map((k) => [k.id, k.pocetak]));

// Svi korijeni funkcije na [a, b]: promjena predznaka (bisekcija), ulazak u nulu (tijelo stane i miruje)
// i dodir (lokalni minimum |f| koji je praktički nula, npr. tijelo samo dotakne zadanu visinu).
export function korijeni(f, a, b, n = 1500) {
  const out = [];
  const h = (b - a) / n;
  const xs = Array.from({ length: n + 1 }, (_, i) => a + i * h);
  const ys = xs.map((x) => f(x));
  const skala = Math.max(1e-9, ...ys.filter(Number.isFinite).map(Math.abs));
  const eps = skala * 1e-9;
  const nula = (y) => Math.abs(y) <= eps;
  const dodaj = (x) => {
    if (!out.some((r) => Math.abs(r - x) < Math.max(1e-6, h * 0.5)))
      out.push(x);
  };
  if (nula(ys[0])) dodaj(a);
  for (let i = 1; i <= n; i++) {
    const [y0, y1] = [ys[i - 1], ys[i]];
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
    if (nula(y1) && !nula(y0)) {
      // ulazak u nulu: prvi x u kojem je f praktički 0
      let [l, r] = [xs[i - 1], xs[i]];
      for (let k = 0; k < 60; k++) {
        const m = (l + r) / 2;
        if (nula(f(m))) r = m;
        else if (Math.sign(f(m)) !== Math.sign(y0)) r = m;
        else l = m;
      }
      dodaj(r);
    } else if (!nula(y0) && !nula(y1) && Math.sign(y0) !== Math.sign(y1)) {
      let [l, r] = [xs[i - 1], xs[i]];
      for (let k = 0; k < 70; k++) {
        const m = (l + r) / 2;
        if (Math.sign(f(m)) === Math.sign(f(l))) l = m;
        else r = m;
      }
      dodaj((l + r) / 2);
    } else if (
      i < n &&
      !nula(y1) &&
      Math.abs(y1) <= Math.abs(y0) &&
      Math.abs(y1) <= Math.abs(ys[i + 1]) &&
      Math.sign(y0) === Math.sign(y1) &&
      Math.sign(ys[i + 1]) === Math.sign(y1)
    ) {
      // dodir: zlatni rez na |f| oko lokalnog minimuma
      let [l, r] = [xs[i - 1], xs[i + 1]];
      for (let k = 0; k < 80; k++) {
        const m1 = l + (r - l) * 0.382;
        const m2 = l + (r - l) * 0.618;
        if (Math.abs(f(m1)) < Math.abs(f(m2))) r = m2;
        else l = m1;
      }
      const m = (l + r) / 2;
      if (Math.abs(f(m)) <= skala * 1e-7) dodaj(m);
    }
  }
  return out.sort((x, y) => x - y);
}
