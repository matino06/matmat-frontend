// Zajedničko za widgete skupine „sile“ (sile_tijelo, vektori, kruzenje): kutovi i smjerovi, klizači (polje speca je
// broj ili id klizača), opći način „postavi“ (cilj na veličini scene) i zapis fizikalnih iznosa. Čisti JS bez DOM-a
// i Intl-a: isti kod radi u pregledniku i u GraalJS-u na backendu.
import { isNum, formatSci, formatNumber, near } from "../../core/number.js";
import { isText, withUnit } from "../zajednicko.js";

export const G_ZEMLJA = 9.81;
export const GRAV_KONST = 6.674e-11;

// ── kutovi ──────────────────────────────────────────────────────────────────────────────────────────
// Kut je u stupnjevima, matematički: 0° = desno (+x), 90° = gore, suprotno od kazaljke na satu.
export const rad = (d) => (d * Math.PI) / 180;
export const normKut = (d) => ((d % 360) + 360) % 360;
export const razlikaKuta = (a, b) => {
  const d = normKut(a - b);
  return Math.min(d, 360 - d);
};
export const kutVektora = (x, y) => normKut((Math.atan2(y, x) * 180) / Math.PI);

export const STRANE = {
  desno: 0,
  "gore-desno": 45,
  gore: 90,
  "gore-lijevo": 135,
  lijevo: 180,
  "dolje-lijevo": 225,
  dolje: 270,
  "dolje-desno": 315,
};
export const KUTOVI_8 = [0, 45, 90, 135, 180, 225, 270, 315];
export const KUTOVI_16 = Array.from({ length: 16 }, (_, i) => i * 22.5);

// najbliži kut iz popisa dopuštenih (zaključavanje strelice)
export function zakljucajKut(kut, dopusteni) {
  let best = dopusteni[0];
  for (const d of dopusteni)
    if (razlikaKuta(kut, d) < razlikaKuta(kut, best)) best = d;
  return normKut(best);
}

// riječima, za poruke i opis: „gore“, „dolje-lijevo“ ili „30° iznad vodoravne udesno“
const RIJECI = {
  0: "udesno",
  45: "gore udesno",
  90: "gore",
  135: "gore ulijevo",
  180: "ulijevo",
  225: "dolje ulijevo",
  270: "dolje",
  315: "dolje udesno",
};
export function smjerRijecima(kut) {
  const k = normKut(kut);
  const ime = Object.keys(RIJECI).find((v) => razlikaKuta(Number(v), k) < 0.5);
  if (ime != null) return RIJECI[ime];
  const vod = k < 90 || k > 270 ? "udesno" : "ulijevo";
  const nagib = Math.round(
    k < 90 ? k : k < 180 ? 180 - k : k < 270 ? k - 180 : 360 - k,
  );
  return `${nagib}° ${k < 180 ? "iznad" : "ispod"} vodoravne, ${vod}`;
}

// ── brojevi ─────────────────────────────────────────────────────────────────────────────────────────
// fizikalni iznos za prikaz: tri značajne znamenke, znanstveni zapis za vrlo velike i male
export const broj = (n, sig = 3) =>
  isNum(n) ? (Math.abs(n) < 1e-9 ? "0" : formatSci(n, sig)) : "—";
export const iznosJed = (n, jed, sig = 3) =>
  `${broj(n, sig)}${jed ? `\u00a0${jed}` : ""}`;
export { withUnit, formatNumber };

// „F_g“, „F_{tr}“, „$F_g$“ → {osnova: "F", indeks: "g"}: oznake sila i u SVG-u i u HTML-u bez KaTeX-a
export function rastaviOznaku(oznaka) {
  const t = String(oznaka ?? "")
    .replace(/\$/g, "")
    .replace(/\\parallel/g, "∥")
    .replace(/\\perp/g, "⊥")
    .replace(/\\vec\{?([A-Za-z])\}?/g, "$1")
    .replace(/\\Delta\s*/g, "Δ")
    .replace(/\\(mathrm|text)\{([^}]*)\}/g, "$2")
    .trim();
  const m = t.match(/^([^_]*)_\{?([^}]*)\}?$/);
  return m ? { osnova: m[1], indeks: m[2] } : { osnova: t, indeks: "" };
}
export const oznakaTekst = (oznaka) => {
  const { osnova, indeks } = rastaviOznaku(oznaka);
  return indeks ? `${osnova}${indeks}` : osnova;
};

// ── klizači ─────────────────────────────────────────────────────────────────────────────────────────
// Klizač: {id, oznaka, min, max, korak, pocetak, jedinica?, faktor?}. Polje speca smije biti broj ili id klizača;
// vrijednost u SI jedinici = vrijednost klizača · faktor (npr. visina u km uz faktor 1000, okretaji u minuti uz 1/60).
const ID = /^[A-Za-z_][A-Za-z_0-9]*$/;
export const klizaciOd = (s) => (Array.isArray(s.klizaci) ? s.klizaci : []);
export const pocetneVrijednosti = (s) =>
  Object.fromEntries(klizaciOd(s).map((k) => [k.id, k.pocetak]));
export const klizacZa = (s, x) =>
  typeof x === "string" ? klizaciOd(s).find((k) => k.id === x) : undefined;

export function iznos(s, x, p) {
  if (isNum(x)) return x;
  const k = klizacZa(s, x);
  if (!k) return NaN;
  const v = p && isNum(p[x]) ? p[x] : k.pocetak;
  return v * (isNum(k.faktor) ? k.faktor : 1);
}

export function validateKlizaci(s, need, { najmanje = 0, najvise = 3 } = {}) {
  if (s.klizaci == null) {
    need(
      najmanje === 0,
      `${s.tip} (${s.nacin}) treba ${najmanje === najvise ? najmanje : `${najmanje}–${najvise}`} klizač(a)`,
    );
    return;
  }
  if (
    !need(
      Array.isArray(s.klizaci) &&
        s.klizaci.length >= najmanje &&
        s.klizaci.length <= najvise,
      `klizaci: ${s.tip} (${s.nacin}) smije imati ${najmanje === najvise ? `točno ${najmanje}` : `${najmanje}–${najvise}`} klizač(a)`,
    )
  )
    return;
  const ids = [];
  s.klizaci.forEach((k, i) => {
    need(
      ID.test(k?.id ?? ""),
      `klizaci[${i}].id mora biti ime varijable (slova, bez razmaka)`,
    );
    need(
      isText(k?.oznaka),
      `klizaci[${i}] treba „oznaka“ (npr. "masa tijela")`,
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
      const n = (k.max - k.min) / k.korak;
      need(n <= 1000, `klizaci[${i}] ima previše koraka (najviše 1000)`);
      need(
        Math.abs(n - Math.round(n)) < 1e-6,
        `klizaci[${i}]: (max − min) mora biti višekratnik koraka`,
      );
      need(
        Math.abs(
          (k.pocetak - k.min) / k.korak -
            Math.round((k.pocetak - k.min) / k.korak),
        ) < 1e-6,
        `klizaci[${i}].pocetak mora biti na koraku klizača`,
      );
    }
    if (k?.jedinica != null)
      need(
        typeof k.jedinica === "string",
        `klizaci[${i}].jedinica mora biti tekst`,
      );
    if (k?.faktor != null)
      need(
        isNum(k.faktor) && k.faktor > 0,
        `klizaci[${i}].faktor mora biti pozitivan broj (SI vrijednost = vrijednost klizača · faktor)`,
      );
  });
  need(
    new Set(ids).size === ids.length,
    "id-jevi klizača moraju biti različiti",
  );
}

// Polje koje je broj ili id klizača; raspon [min, max] u SI jedinici vrijedi i za cijeli raspon klizača.
export function validatePolje(
  s,
  need,
  ime,
  { min = -Infinity, max = Infinity, obavezno = true, opis = "" } = {},
) {
  const x = s[ime];
  if (x == null) {
    need(
      !obavezno,
      `${s.tip} (${s.scena ?? s.nacin}) treba polje „${ime}“${opis ? ` (${opis})` : ""}`,
    );
    return false;
  }
  const raspon = `${formatNumber(min)} – ${formatNumber(max)}`
    .replace("-Infinity", "−∞")
    .replace("Infinity", "∞");
  if (isNum(x))
    return need(
      x >= min && x <= max,
      `${ime} = ${formatNumber(x)} je izvan smislenih granica (${raspon})`,
    );
  const k = klizacZa(s, x);
  if (!need(k, `${ime} mora biti broj ili id klizača (nema klizača „${x}“)`))
    return false;
  if (![k.min, k.max].every(isNum)) return false;
  const f = isNum(k.faktor) ? k.faktor : 1;
  return need(
    k.min * f >= min && k.max * f <= max,
    `klizač „${k.id}“ za ${ime} izlazi iz smislenih granica (${raspon})`,
  );
}

// Svaki klizač mora nešto pomicati: njegov id mora biti vrijednost nekog polja.
export function validateKoristeniKlizaci(s, need, koristeni) {
  for (const k of klizaciOd(s))
    need(
      koristeni.includes(k.id),
      `klizač „${k.id}“ ne mijenja ništa u sceni (nijedno polje nije "${k.id}")`,
    );
}

// Kombinacije krajnjih vrijednosti klizača (za mjerilo strelica: najveća sila u cijelom rasponu).
export function krajnjeKombinacije(s) {
  let out = [pocetneVrijednosti(s)];
  for (const k of klizaciOd(s))
    out = out.flatMap((p) => [
      p,
      { ...p, [k.id]: k.min },
      { ...p, [k.id]: k.max },
    ]);
  return out;
}

// ── opći „postavi“: učenik namjesti jedan klizač tako da veličina scene postigne cilj ──────────────
// cilj: {velicina, vrijednost (broj ili ime druge veličine scene, npr. "F_max"), tolerancija?}.
// Prihvaća se vrijednost klizača čiji je rezultat unutar tolerancije; bez zadane tolerancije to je pola promjene
// veličine za jedan korak klizača oko najboljeg položaja, pa je točan samo najbliži položaj.
export function analizaCilja(s, k, velicine) {
  const cilj = s.cilj;
  const razlika = (v) => {
    const vel = velicine({ ...pocetneVrijednosti(s), [k.id]: v });
    const t = isNum(cilj.vrijednost) ? cilj.vrijednost : vel[cilj.vrijednost];
    return { q: vel[cilj.velicina], t, d: vel[cilj.velicina] - t };
  };
  const n = Math.round((k.max - k.min) / k.korak);
  const vr = Array.from(
    { length: n + 1 },
    (_, i) => Math.round((k.min + i * k.korak) * 1e9) / 1e9,
  );
  const d = vr.map((v) => razlika(v).d);
  let best = 0;
  d.forEach((x, i) => {
    if (Math.abs(x) < Math.abs(d[best])) best = i;
  });
  const lokalno = Math.max(
    best > 0 ? Math.abs(d[best - 1] - d[best]) : 0,
    best < n ? Math.abs(d[best + 1] - d[best]) : 0,
  );
  const tol = isNum(cilj.tolerancija)
    ? cilj.tolerancija
    : Math.max(lokalno * 0.5 * 1.0001, 1e-9);
  const ok = (v) => {
    const x = razlika(v).d;
    return isNum(x) && Math.abs(x) <= tol;
  };
  return {
    vrijednosti: vr,
    best: vr[best],
    tol,
    dostizno: isNum(d[best]) && Math.abs(d[best]) <= tol,
    ok,
    razlika,
  };
}

export function validateCilj(s, need, k, velicine, meta) {
  const c = s.cilj;
  if (
    !need(
      c && typeof c === "object",
      `${s.tip} postavi treba cilj: {velicina, vrijednost}`,
    )
  )
    return;
  const imena = Object.keys(meta);
  if (
    !need(
      imena.includes(c.velicina),
      `cilj.velicina mora biti jedna od: ${imena.join(", ")}`,
    )
  )
    return;
  if (
    !need(
      isNum(c.vrijednost) || imena.includes(c.vrijednost),
      `cilj.vrijednost mora biti broj ili ime druge veličine (${imena.join(", ")})`,
    )
  )
    return;
  need(
    c.vrijednost !== c.velicina,
    "cilj.vrijednost ne smije biti ista veličina kao cilj.velicina",
  );
  if (c.tolerancija != null)
    need(
      isNum(c.tolerancija) && c.tolerancija >= 0,
      "cilj.tolerancija mora biti nenegativan broj (u jedinici veličine)",
    );
  if (
    !k ||
    ![k.min, k.max, k.korak, k.pocetak].every(isNum) ||
    !(k.korak > 0) ||
    !(k.max > k.min)
  )
    return;
  let a;
  try {
    a = analizaCilja(s, k, velicine);
  } catch {
    need(false, "cilj se ne može izračunati iz scene");
    return;
  }
  need(
    a.dostizno,
    `cilj nije ostvariv klizačem „${k.id}“ (od ${formatNumber(k.min)} do ${formatNumber(k.max)}, korak ${formatNumber(k.korak)}): najbliže je ${formatNumber(a.best)}${k.jedinica ? ` ${k.jedinica}` : ""}`,
  );
  need(
    !a.ok(k.pocetak),
    `klizač „${k.id}“ na početku (${formatNumber(k.pocetak)}) već ostvaruje cilj, pa bi „Provjeri“ bez pomicanja bio točan`,
  );
}

// Provjera odgovora „postavi“: odgovor je {id: vrijednost} (ili sam broj za jedini klizač).
export function checkCilj(s, odgovor, velicine, meta) {
  const k = klizaciOd(s)[0];
  const v = isNum(odgovor) ? odgovor : odgovor?.[k.id];
  if (!isNum(v))
    return { tocno: false, poruka: "Pomakni klizač.", prazno: true };
  const a = analizaCilja(s, k, velicine);
  if (a.ok(v)) return { tocno: true };
  const hit = (s.krivo ?? []).find((x) => near(v, x.vrijednost, k.korak * 0.5));
  if (hit) return { tocno: false, poruka: hit.poruka };
  const { q, t } = a.razlika(v);
  const m = meta[s.cilj.velicina];
  const ime = String(k.oznaka).replace(/\$/g, "");
  const kl = `${ime.charAt(0).toUpperCase()}${ime.slice(1)} = ${withUnit(v, k.jedinica)}`;
  const tren = `${m.naziv} je ${opisVelicine(q, m)}`;
  const treba = isNum(s.cilj.vrijednost)
    ? `a treba ${iznosJed(t, m.jedinica)}`
    : `a treba biti koliko i ${meta[s.cilj.vrijednost]?.naziv ?? s.cilj.vrijednost} (${iznosJed(t, m.jedinica)})`;
  return {
    tocno: false,
    poruka: `${kl}: ${tren}, ${treba}.${s.savjet ? ` ${s.savjet}` : ""}`,
  };
}

// iznos s jedinicom i, za veličinu s predznakom, smjerom riječima („2 m/s² udesno“)
export function opisVelicine(q, m) {
  if (!isNum(q)) return "—";
  if (m.smjer && Math.abs(q) > 1e-9)
    return `${iznosJed(Math.abs(q), m.jedinica)} ${q > 0 ? m.smjer[0] : m.smjer[1]}`;
  return iznosJed(m.smjer ? Math.abs(q) : q, m.jedinica);
}

export const NACIN_ISTRAZI = `"istrazi": korak za gledanje: učenik pomiče klizače i gleda, ništa se ne provjerava i nema polja s odgovorom (ni cilj ni krivo)`;
export const KLIZACI_OPIS = `klizaci: [{id, oznaka, min, max, korak, pocetak, jedinica?, faktor?}]; brojčano polje speca smije umjesto broja biti id klizača (SI vrijednost = vrijednost klizača · faktor, npr. visina u km uz faktor 1000)`;
export const CILJ_OPIS = `cilj: {velicina, vrijednost (broj ili ime druge veličine scene), tolerancija?}; točno je ono što aplikacija izračuna iz scene, a bez tolerancije prolazi samo najbliži položaj klizača`;
