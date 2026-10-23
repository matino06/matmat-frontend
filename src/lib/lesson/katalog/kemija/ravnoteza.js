// ravnoteza: kemijska ravnoteža i Le Chatelierovo načelo. Reakcija se zadaje kao u widgetu „jednadzba“ i provjerava
// istom logikom (formule, izjednačenost, stanja; uglate zagrade kompleksa čita atomiOd), a kod iz nje računa sve
// ostalo: izraz za Kc (ili Kp) bez čvrstih tvari i čistih tekućina (otapalo voda), jedinicu konstante, kvocijent Q,
// smjer pomaka za svaku promjenu (dodatak/uklanjanje tvari, temperatura prema ΔrH, tlak prema broju molekula plina,
// razrjeđivanje prema broju otopljenih čestica, katalizator i inertni plin bez pomaka), novu ravnotežu uz isti K
// (rješava Q(ξ) = K za doseg reakcije ξ bisekcijom), boju smjese iz obojenih vrsta, te K iz ravnotežnih koncentracija,
// ravnotežnu koncentraciju iz K i tablicu početno / promjena / ravnoteža.
import { isNum, parseNumber, formatNumber, near } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields, checkNumber } from "../zajednicko.js";
import { jednadzba, tvari as tvariJednadzbe, tocniKoef, stanjaOd, STANJA } from "./jednadzba.js";
import { BOJE } from "./_reakcije.js";

export const NACINI = ["istrazi", "pomak", "kc_izraz", "izracunaj"];
const POLJA = ["tip", "nacin", "tekst", "reakcija", "dH", "boje", "konstanta", "jedinica_tlaka", "ravnotezne", "pocetne", "K", "promjene", "promjena", "pitaj", "tvar", "trazi", "pokazi_izraz", "tolerancija_posto", "krivo"];
const POLJA_NACINA = {
  istrazi: ["promjene", "ravnotezne"],
  pomak: ["promjena", "pitaj", "tvar", "ravnotezne"],
  kc_izraz: [],
  izracunaj: ["ravnotezne", "pocetne", "K", "trazi", "pokazi_izraz", "tolerancija_posto", "krivo"],
};
const ZAJEDNICKA = ["tip", "nacin", "tekst", "reakcija", "dH", "boje", "konstanta", "jedinica_tlaka"];
export const PITANJA = ["smjer", "boja", "koncentracija"];
const TLAK = ["bar", "kPa", "Pa"];
const NAJVISE_KLIKOVA_T = 3; // zagrijavanje / hlađenje u istraživanju: najviše tri koraka u svaku stranu

const EKSP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻" };
export const gore = (n) => [...String(n)].map((c) => EKSP[c] ?? c).join("");
const lista = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);

// ── reakcija ──
export const jeKp = (s) => s?.konstanta === "Kp";
export const opce = (s) => s?.reakcija?.opce === true;
export const tlakJedinica = (s) => s?.jedinica_tlaka ?? "bar";
// jedinica ravnotežne veličine: koncentracija ili parcijalni tlak
export const jedinicaVelicine = (s) => (jeKp(s) ? tlakJedinica(s) : "mol/dm³");
export const simbolK = (s) => (jeKp(s) ? "Kp" : "Kc");
export const slovo = (s) => (jeKp(s) ? "p" : "c");

// Reakcija u obliku widgeta „jednadzba“ (ista provjera i isti izračun koeficijenata).
export function jednadzbaOd(s) {
  const r = s?.reakcija ?? {};
  return {
    tip: "jednadzba",
    nacin: "stanja",
    tekst: "ravnoteža",
    reaktanti: r.reaktanti,
    produkti: r.produkti,
    strelica: "⇌",
    ...(r.koeficijenti != null && { koeficijenti: r.koeficijenti }),
    ...(r.stanja != null && { stanja: r.stanja }),
  };
}

// Sve vrste redom (reaktanti pa produkti): {formula, strana, i, koef, nu (reaktanti −, produkti +), stanje, ulazi}.
// U izraz za K ne ulaze čvrste tvari (s) ni čiste tekućine (l), npr. voda kao otapalo.
export function vrste(s) {
  const r = s?.reakcija ?? {};
  const R = Array.isArray(r.reaktanti) ? r.reaktanti : [];
  const P = Array.isArray(r.produkti) ? r.produkti : [];
  let formule, koef, st;
  if (opce(s)) {
    formule = [...R.map((f) => ({ formula: f, strana: "L" })), ...P.map((f) => ({ formula: f, strana: "D" }))];
    koef = Array.isArray(r.koeficijenti) ? r.koeficijenti : formule.map(() => 1);
    const norm = (v) => (v === "ℓ" ? "l" : v);
    st = Array.isArray(r.stanja) ? formule.map((_, i) => norm(r.stanja[i]) ?? null) : r.stanja && typeof r.stanja === "object" ? formule.map((c) => norm(r.stanja[c.formula]) ?? null) : formule.map(() => null);
  } else {
    const j = jednadzbaOd(s);
    const t = tvariJednadzbe(j);
    formule = t.map((c, i) => ({ formula: c.formula ?? [...R, ...P][i], strana: c.strana }));
    koef = (t.every((c) => !c.greska) ? tocniKoef(j, t) : null) ?? t.map(() => 1);
    st = stanjaOd(j, t);
  }
  return formule.map((c, i) => {
    const k = koef[i] ?? 1;
    const stanje = st[i] ?? null;
    return { formula: c.formula, strana: c.strana, i, koef: k, nu: c.strana === "L" ? -k : k, stanje, ulazi: stanje !== "s" && stanje !== "l" };
  });
}
export const ukljucene = (s) => vrste(s).filter((v) => v.ulazi);
const dn = (v) => v.reduce((a, x) => a + x.nu, 0);
// plin: stanje (g), ili opća vrsta bez stanja uz Kp
const jePlin = (s, x) => x.stanje === "g" || (jeKp(s) && x.stanje == null);
// zbroj koeficijenata plinova („g“) ili otopljenih vrsta („aq“) lijevo i desno
function brojCestica(s, stanje) {
  const v = vrste(s).filter((x) => x.ulazi && (stanje === "g" ? jePlin(s, x) : x.stanje === stanje));
  const L = v.filter((x) => x.strana === "L").reduce((a, x) => a + x.koef, 0);
  const D = v.filter((x) => x.strana === "D").reduce((a, x) => a + x.koef, 0);
  return { L, D, ima: v.length > 0 };
}
const imaStanje = (s, stanje) => vrste(s).some((x) => x.ulazi && (stanje === "g" ? jePlin(s, x) : x.stanje === stanje));

// Jedinica konstante iz Δn: „mol/dm³“, „dm³/mol“, „dm¹²/mol⁴“, „bar⁻¹“, „kPa⁻²“; bez jedinice za Δn = 0.
export function jedinicaK(s) {
  const n = dn(ukljucene(s));
  if (n === 0) return "";
  if (jeKp(s)) return n === 1 ? tlakJedinica(s) : `${tlakJedinica(s)}${gore(n)}`;
  const a = Math.abs(n);
  const mol = a === 1 ? "mol" : `mol${gore(a)}`;
  const dm = `dm${gore(3 * a)}`;
  return n > 0 ? `${mol}/${dm}` : `${dm}/${mol}`;
}

// ── brojevi ──
// broj ili {vrijednost, zapis}
export const brojOd = (x) => (isNum(x) ? { v: x, zapis: null } : x && typeof x === "object" && isNum(x.vrijednost) ? { v: x.vrijednost, zapis: isText(x.zapis) ? x.zapis : null } : null);
export const brojeviOd = (o) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).map(([k, x]) => [k, brojOd(x)]));
// Rezultat: dvije značajne znamenke ako je broj njima točan (0,020), inače tri; izvan [0,001, 10⁶) znanstveni zapis.
export function zapisBroja(v, sig = null) {
  if (!isNum(v)) return "—";
  if (v === 0) return "0";
  const z = sig ?? (Math.abs(Number(v.toPrecision(2)) - v) <= 1e-9 * Math.abs(v) ? 2 : 3);
  const a = Math.abs(v);
  if (a >= 1e-3 && a < 1e6) {
    if (a >= 10 ** z) return String(Math.round(v)).replace("-", "−");
    return v.toPrecision(z).replace("-", "−").replace(".", ",");
  }
  const [m, e] = v.toExponential(z - 1).split("e");
  return `${m.replace("-", "−").replace(".", ",")}·10${gore(Number(e))}`;
}
export const zapisZadanog = (b) => (b ? (b.zapis ?? zapisBroja(b.v)) : "—");

// Kvocijent Q = Π c^ν za uključene vrste (isti izraz kao K).
export function kvocijent(s, c) {
  let lnQ = 0;
  for (const x of ukljucene(s)) {
    const v = c[x.formula];
    if (!(v > 0)) return x.nu > 0 ? 0 : Infinity;
    lnQ += x.nu * Math.log(v);
  }
  return Math.exp(lnQ);
}

// Nova ravnoteža: c_i + ν_i·ξ takav da je Q = K (Q raste s ξ, pa bisekcija na ln Q − ln K). Vraća ξ.
export function dosegDoRavnoteze(s, c, K) {
  const v = ukljucene(s);
  let lo = -Infinity;
  let hi = Infinity;
  for (const x of v) {
    const ci = Math.max(0, c[x.formula] ?? 0);
    if (x.nu > 0) lo = Math.max(lo, -ci / x.nu);
    else hi = Math.min(hi, ci / -x.nu);
  }
  const g = (xi) => {
    let r = -Math.log(K);
    for (const x of v) r += x.nu * Math.log(Math.max(1e-300, (c[x.formula] ?? 0) + x.nu * xi));
    return r;
  };
  const sk = Math.max(1, ...v.map((x) => c[x.formula] ?? 0), K);
  if (!Number.isFinite(lo)) {
    lo = -sk;
    for (let k = 0; k < 200 && g(lo) > 0; k++) lo *= 2;
  }
  if (!Number.isFinite(hi)) {
    hi = sk;
    for (let k = 0; k < 200 && g(hi) < 0; k++) hi *= 2;
  }
  for (let k = 0; k < 200; k++) {
    const m = (lo + hi) / 2;
    if (g(m) < 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
export const pomakni = (s, c, xi) => Object.fromEntries(ukljucene(s).map((x) => [x.formula, (c[x.formula] ?? 0) + x.nu * xi]));

// ── promjene ──
const PROMJENE = {
  zagrijavanje: "Zagrij",
  hladenje: "Ohladi",
  povecanje_tlaka: "Povećaj tlak (smanji volumen)",
  smanjenje_tlaka: "Smanji tlak (povećaj volumen)",
  razrjedivanje: "Razrijedi vodom",
  katalizator: "Dodaj katalizator",
  inertni_plin: "Dodaj inertni plin (stalan volumen)",
};
const OPIS_PROMJENE = {
  zagrijavanje: "Smjesa se zagrije.",
  hladenje: "Smjesa se ohladi.",
  povecanje_tlaka: "Tlak se poveća smanjenjem volumena posude.",
  smanjenje_tlaka: "Tlak se smanji povećanjem volumena posude.",
  razrjedivanje: "Otopina se razrijedi vodom.",
  katalizator: "U smjesu se doda katalizator.",
  inertni_plin: "U posudu stalnog volumena uvede se inertni plin (npr. argon).",
};
// "dodaj Cl⁻" → {vrsta: "dodaj", formula: "Cl⁻"}; "zagrijavanje" → {vrsta: "zagrijavanje"}
export function procitajPromjenu(k) {
  if (!isText(k)) return null;
  const m = k.trim().match(/^(dodaj|ukloni)\s+(.+)$/);
  if (m) return { vrsta: m[1], formula: m[2].trim(), kljuc: k.trim() };
  return PROMJENE[k.trim()] ? { vrsta: k.trim(), kljuc: k.trim() } : null;
}
export function oznakaPromjene(k) {
  const p = procitajPromjenu(k);
  if (!p) return k;
  if (p.vrsta === "dodaj") return `Dodaj ⟦${p.formula}⟧`;
  if (p.vrsta === "ukloni") return `Ukloni dio ⟦${p.formula}⟧`;
  return PROMJENE[p.vrsta];
}
export function opisPromjene(k) {
  const p = procitajPromjenu(k);
  if (!p) return "";
  if (p.vrsta === "dodaj") return `U ravnotežnu smjesu doda se još ⟦${p.formula}⟧.`;
  if (p.vrsta === "ukloni") return `Iz ravnotežne smjese ukloni se dio ⟦${p.formula}⟧.`;
  return OPIS_PROMJENE[p.vrsta];
}
// ⟦formula⟧ → formula (za markdown poruke); komponenta crta ⟦…⟧ kroz Formula.svelte
export const bezOznaka = (t) => String(t ?? "").replace(/⟦([^⟧]*)⟧/g, "$1");
export const dijelovi = (t) => String(t ?? "").split(/⟦([^⟧]*)⟧/).map((z, i) => ({ formula: i % 2 === 1, z })).filter((d) => d.z);

// predznak ΔrH reakcije udesno: 1, −1 ili null
export function znakDH(s) {
  const d = s?.dH;
  if (isNum(d) && d !== 0) return Math.sign(d);
  if (d === "+") return 1;
  if (d === "−" || d === "-") return -1;
  return null;
}
const zapisDH = (s) => (isNum(s.dH) ? `ΔrH = ${formatNumber(s.dH)} kJ/mol` : `ΔrH ${znakDH(s) > 0 ? ">" : "<"} 0`);

// Promjene koje imaju smisla za ovu reakciju (zadano u istraživanju).
export function moguceKljuceve(s) {
  const out = [];
  if (znakDH(s)) out.push("zagrijavanje", "hladenje");
  for (const x of ukljucene(s)) out.push(`dodaj ${x.formula}`);
  for (const x of ukljucene(s)) out.push(`ukloni ${x.formula}`);
  if (imaStanje(s, "g")) out.push("povecanje_tlaka", "smanjenje_tlaka");
  if (!jeKp(s) && imaStanje(s, "aq")) out.push("razrjedivanje");
  out.push("katalizator");
  return out;
}
export const promjeneIstrazivanja = (s) => (Array.isArray(s.promjene) ? s.promjene : moguceKljuceve(s).filter((k) => !k.startsWith("ukloni") && k !== "smanjenje_tlaka" && k !== "hladenje")).slice(0, 8);

// Zašto promjena ne ide: null ako ide, inače rečenica za validate.
export function greskaPromjene(s, k) {
  const p = procitajPromjenu(k);
  if (!p) return `„${k}“ nije promjena (dopušteno: ${Object.keys(PROMJENE).join(", ")}, "dodaj <formula>", "ukloni <formula>")`;
  if (p.vrsta === "dodaj" || p.vrsta === "ukloni") {
    const x = vrste(s).find((v) => v.formula === p.formula);
    if (!x) return `„${k}“: ${p.formula} nije tvar iz reakcije`;
    if (x.stanje === "l" && imaStanje(s, "aq")) return `„${k}“: ${p.formula} je otapalo; za dodatak vode koristi "razrjedivanje"`;
    return null;
  }
  if ((p.vrsta === "zagrijavanje" || p.vrsta === "hladenje") && !znakDH(s)) return `„${k}“ treba dH (ΔrH reakcije udesno: broj u kJ/mol ili "+" / "−")`;
  if ((p.vrsta === "povecanje_tlaka" || p.vrsta === "smanjenje_tlaka") && !imaStanje(s, "g")) return `„${k}“: u reakciji nema plinova (g), pa tlak nema smisla`;
  if (p.vrsta === "razrjedivanje" && (jeKp(s) || !imaStanje(s, "aq"))) return `„${k}“: razrjeđivanje ide samo uz otopljene vrste (aq) i Kc`;
  if (p.vrsta === "inertni_plin" && !imaStanje(s, "g")) return `„${k}“: inertni plin ima smisla samo uz plinove`;
  return null;
}

const SMJER = { udesno: "udesno (prema produktima)", ulijevo: "ulijevo (prema reaktantima)", nema: "nema pomaka" };
export const zapisSmjera = (sm) => SMJER[sm];
const nazivStanja = (x) => (x.stanje === "s" ? "čvrsta tvar (s)" : "čista tekućina (l)");

// Smjer pomaka i objašnjenje za promjenu: {smjer, objasnjenje, savjet} (savjet: za krivi odgovor, bez smjera).
export function pomak(s, k) {
  const p = procitajPromjenu(k);
  if (!p) return null;
  const F = (f) => `⟦${f}⟧`;
  if (p.vrsta === "dodaj" || p.vrsta === "ukloni") {
    const x = vrste(s).find((v) => v.formula === p.formula);
    if (!x) return null;
    if (!x.ulazi) {
      const t = `${F(x.formula)} je ${nazivStanja(x)}: ne ulazi u izraz za ${simbolK(s)}, pa ${p.vrsta === "dodaj" ? "njezin dodatak" : "uklanjanje dijela"} ne pomiče ravnotežu.`;
      return { smjer: "nema", objasnjenje: t, savjet: `${F(x.formula)} je ${nazivStanja(x)}. Ulazi li u izraz za ${simbolK(s)}?` };
    }
    const reak = x.strana === "L";
    const smjer = (p.vrsta === "dodaj") === reak ? "udesno" : "ulijevo";
    const ob =
      p.vrsta === "dodaj"
        ? `Dodatkom ${F(x.formula)} poraste ${slovo(s)}(${F(x.formula)}), pa je Q ${reak ? "<" : ">"} ${simbolK(s)}. Sustav dio dodanog ${F(x.formula)} potroši: ravnoteža se pomiče ${SMJER[smjer]}.`
        : `Uklanjanjem dijela ${F(x.formula)} padne ${slovo(s)}(${F(x.formula)}), pa je Q ${reak ? ">" : "<"} ${simbolK(s)}. Sustav dio ${F(x.formula)} nadoknadi: ravnoteža se pomiče ${SMJER[smjer]}.`;
    const sv = `Sustav se opire promjeni: ${p.vrsta === "dodaj" ? "dodanu tvar djelomično potroši" : "uklonjenu tvar djelomično nadoknadi"}. ${F(x.formula)} je ${reak ? "reaktant" : "produkt"}.`;
    return { smjer, objasnjenje: ob, savjet: sv };
  }
  if (p.vrsta === "zagrijavanje" || p.vrsta === "hladenje") {
    const z = znakDH(s);
    const toplo = p.vrsta === "zagrijavanje";
    const smjer = (z > 0) === toplo ? "udesno" : "ulijevo";
    const endo = z > 0 ? "endotermna" : "egzotermna";
    const ob = toplo
      ? `Zagrijavanje pogoduje endotermnom smjeru, koji troši toplinu. Reakcija udesno je ${endo} (${zapisDH(s)}), pa se ravnoteža pomiče ${SMJER[smjer]}, a ${simbolK(s)} ${z > 0 ? "raste" : "se smanjuje"}.`
      : `Hlađenje pogoduje egzotermnom smjeru, koji oslobađa toplinu. Reakcija udesno je ${endo} (${zapisDH(s)}), pa se ravnoteža pomiče ${SMJER[smjer]}, a ${simbolK(s)} ${z > 0 ? "se smanjuje" : "raste"}.`;
    const sv = toplo
      ? `Zagrijavanje pogoduje endotermnom smjeru, onom koji troši toplinu. Ovdje je ${zapisDH(s)} za reakciju udesno.`
      : `Hlađenje pogoduje egzotermnom smjeru, onom koji oslobađa toplinu. Ovdje je ${zapisDH(s)} za reakciju udesno.`;
    return { smjer, objasnjenje: ob, savjet: sv, mijenjaK: true };
  }
  if (p.vrsta === "povecanje_tlaka" || p.vrsta === "smanjenje_tlaka") {
    const { L, D } = brojCestica(s, "g");
    const vise = p.vrsta === "povecanje_tlaka";
    const ime = vise ? "Povećanje tlaka (manji volumen)" : "Smanjenje tlaka (veći volumen)";
    const prebroj = `lijevo je ${L}, a desno ${D} molekula plina`;
    if (L === D) return { smjer: "nema", objasnjenje: `${ime} ne pomiče ravnotežu: lijevo i desno je jednako molekula plina (${L}).`, savjet: `Tlak pomiče ravnotežu samo kad je broj molekula plina lijevo i desno različit. Prebroji koeficijente plinova (g): ${prebroj}.` };
    const smjer = (D < L) === vise ? "udesno" : "ulijevo";
    return {
      smjer,
      objasnjenje: `${ime} pomiče ravnotežu na stranu s ${vise ? "manje" : "više"} molekula plina: ${prebroj}, pa ${SMJER[smjer]}.`,
      savjet: `${ime} pogoduje strani s ${vise ? "manje" : "više"} molekula plina. Prebroji koeficijente plinova (g) lijevo i desno.`,
    };
  }
  if (p.vrsta === "razrjedivanje") {
    const { L, D } = brojCestica(s, "aq");
    const bez = vrste(s).some((x) => !x.ulazi) ? " (voda i čvrste tvari se ne broje)" : "";
    const prebroj = `lijevo ${L}, desno ${D}${bez}`;
    if (L === D) return { smjer: "nema", objasnjenje: `Razrjeđivanje ne pomiče ravnotežu: otopljenih čestica je lijevo i desno jednako (${L}).`, savjet: `Prebroji otopljene čestice (aq): ${prebroj}.` };
    const smjer = D > L ? "udesno" : "ulijevo";
    return {
      smjer,
      objasnjenje: `Razrjeđivanjem otopljenih čestica u svakom mililitru ima manje. Ravnoteža se pomiče na stranu s više otopljenih čestica: ${prebroj}, pa ${SMJER[smjer]}.`,
      savjet: `Razrjeđivanje pogoduje strani s više otopljenih čestica (aq). Prebroji ih lijevo i desno${bez}.`,
    };
  }
  if (p.vrsta === "katalizator") {
    const t = `Katalizator jednako ubrzava oba smjera: ravnoteža se brže uspostavi, ali se ne pomiče, a ${simbolK(s)} ostaje isti.`;
    return { smjer: "nema", objasnjenje: t, savjet: t };
  }
  const t = `Inertni plin pri stalnom volumenu ne mijenja ${jeKp(s) ? "parcijalne tlakove" : "koncentracije"} tvari iz ravnoteže, pa se ravnoteža ne pomiče.`;
  return { smjer: "nema", objasnjenje: t, savjet: t };
}

// ── stanje smjese (istraživanje i „pomak“) ──
// c: ravnotežne koncentracije (ili parcijalni tlakovi) uključenih vrsta; V i T samo za crtež (relativno).
export function pocetnoStanje(s) {
  const zad = brojeviOd(s.ravnotezne);
  // zamišljene: razmjerne koeficijentima (Cl⁻ s koeficijentom 4 ima 4 puta više), da se pomak vidi i kad je
  // eksponent velik
  const def = jeKp(s) ? 1 : 0.5;
  const c = Object.fromEntries(ukljucene(s).map((x) => [x.formula, zad[x.formula]?.v ?? def * x.koef]));
  return { c, K: kvocijent(s, c), V: 1, T: 0, zamisljeno: !s.ravnotezne };
}
const FAKTOR_T = 3; // koliko se puta K promijeni po koraku zagrijavanja (zamišljeno, samo za crtež)

// Smjesa odmah nakon promjene (prije pomaka). Vraća novo stanje (c, K, V, T).
export function poremeti(s, st, k) {
  const p = procitajPromjenu(k);
  const c = { ...st.c };
  let { K, V, T } = st;
  const v = ukljucene(s);
  const sr = v.reduce((a, x) => a + (c[x.formula] ?? 0), 0) / Math.max(1, v.length);
  if (!p) return { ...st };
  if (p.vrsta === "dodaj" && p.formula in c) c[p.formula] += Math.max(0.5 * c[p.formula], 0.25 * sr);
  if (p.vrsta === "ukloni" && p.formula in c) c[p.formula] *= 0.5;
  if (p.vrsta === "zagrijavanje" || p.vrsta === "hladenje") {
    const gore = p.vrsta === "zagrijavanje";
    T += gore ? 1 : -1;
    K *= (znakDH(s) > 0) === gore ? FAKTOR_T : 1 / FAKTOR_T;
  }
  if (p.vrsta === "povecanje_tlaka" || p.vrsta === "smanjenje_tlaka") {
    const f = p.vrsta === "povecanje_tlaka" ? 2 : 0.5;
    V /= f;
    for (const x of v) if (jePlin(s, x)) c[x.formula] *= f;
  }
  if (p.vrsta === "razrjedivanje") {
    V *= 2;
    for (const x of v) if (x.stanje === "aq") c[x.formula] /= 2;
  }
  return { c, K, V, T, zamisljeno: st.zamisljeno };
}
export const mozeT = (st, k) => (k === "zagrijavanje" ? st.T < NAJVISE_KLIKOVA_T : k === "hladenje" ? st.T > -NAJVISE_KLIKOVA_T : true);

// Promjena od ravnoteže do nove ravnoteže: {prije, poremeceno, poslije, xi, Q (odmah nakon promjene), smjer}.
export function simuliraj(s, st, k) {
  const por = poremeti(s, st, k);
  const Q = kvocijent(s, por.c);
  const xi = dosegDoRavnoteze(s, por.c, por.K);
  const rel = Math.log(Q / por.K);
  const smjer = Math.abs(rel) < 1e-9 ? "nema" : rel < 0 ? "udesno" : "ulijevo";
  return { prije: st, poremeceno: por, poslije: { ...por, c: pomakni(s, por.c, Math.abs(rel) < 1e-9 ? 0 : xi) }, xi: Math.abs(rel) < 1e-9 ? 0 : xi, Q, smjer };
}

// ── boje ──
export const bojaVrste = (s, f) => (s?.boje && typeof s.boje === "object" ? (s.boje[f] ?? null) : null);
const obojena = (s) => ukljucene(s).filter((x) => { const b = bojaVrste(s, x.formula); return b && b !== "bezbojna" && BOJE[b]?.hex; });
// "dvije": obojene vrste s obje strane (različitih boja) → boja je omjer; "jedna": obojeno samo s jedne strane →
// boja je jakost; null: nema boja
export function vrstaBoje(s) {
  const o = obojena(s);
  if (!o.length) return null;
  const L = o.filter((x) => x.strana === "L");
  const D = o.filter((x) => x.strana === "D");
  if (L.length && D.length) {
    const bL = new Set(L.map((x) => bojaVrste(s, x.formula)));
    const bD = new Set(D.map((x) => bojaVrste(s, x.formula)));
    return [...bL].some((b) => !bD.has(b)) || [...bD].some((b) => !bL.has(b)) ? "dvije" : "jedna";
  }
  return "jedna";
}
// Boja smjese za crtež: hex i jakost (0–1). Kad su obojene vrste s obje strane, boja je mješavina boje lijeve i
// desne strane po udjelu; promjena udjela prema početnoj smjesi crta se dvostruko (u epruveti je promjena boje jasna,
// a linearna mješavina dviju sličnih boja jedva se vidi). Jakost raste s ukupnom količinom obojenih čestica.
const rgbOd = (hex) => [0, 1, 2].map((k) => parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16));
const hexOd = (rgb) => `#${rgb.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("")}`;
function mjesavina(par) {
  const w = par.reduce((a, p) => a + p.w, 0) || 1;
  return [0, 1, 2].map((k) => par.reduce((a, p) => a + rgbOd(p.hex)[k] * p.w, 0) / w);
}
export function bojaSmjese(s, c, c0 = c) {
  const o = obojena(s);
  if (!o.length) return null;
  const tez = (cc, strana) => o.filter((x) => strana == null || x.strana === strana).map((x) => ({ hex: BOJE[bojaVrste(s, x.formula)].hex, w: Math.max(0, cc[x.formula] ?? 0) }));
  const zb = (cc, strana) => tez(cc, strana).reduce((a, t) => a + t.w, 0);
  const ukupno = zb(c);
  const jakost = Math.max(0.06, Math.min(0.95, 0.72 * Math.sqrt(ukupno / (zb(c0) || 1))));
  let rgb;
  if (vrstaBoje(s) === "dvije") {
    const u0 = zb(c0, "D") / (zb(c0) || 1);
    const u = zb(c, "D") / (ukupno || 1);
    const prikaz = Math.max(0, Math.min(1, u0 + 2 * (u - u0)));
    const L = mjesavina(tez(c0, "L"));
    const D = mjesavina(tez(c0, "D"));
    rgb = L.map((x, k) => x * (1 - prikaz) + D[k] * prikaz);
  } else rgb = mjesavina(tez(c));
  return { hex: hexOd(rgb), jakost };
}
// Kako se boja promijeni od ravnoteže do nove ravnoteže: "L" | "D" (prevladava boja te strane), "jaca" | "slabija",
// "ista".
export function promjenaBoje(s, prije, poslije) {
  const vr = vrstaBoje(s);
  if (!vr) return null;
  const o = obojena(s);
  const zb = (c, strana) => o.filter((x) => strana == null || x.strana === strana).reduce((a, x) => a + (c[x.formula] ?? 0), 0);
  if (vr === "dvije") {
    const u0 = zb(prije, "D") / (zb(prije) || 1);
    const u1 = zb(poslije, "D") / (zb(poslije) || 1);
    return Math.abs(u1 - u0) < 1e-6 ? "ista" : u1 > u0 ? "D" : "L";
  }
  const a0 = zb(prije);
  const a1 = zb(poslije);
  return Math.abs(a1 - a0) <= 1e-6 * Math.max(a0, 1e-12) ? "ista" : a1 > a0 ? "jaca" : "slabija";
}
// Opcije za pitanje o boji: [{kljuc, tekst}]
export function opcijeBoje(s) {
  const vr = vrstaBoje(s);
  if (!vr) return [];
  const o = obojena(s);
  const naStrani = (strana) => {
    const x = o.filter((v) => v.strana === strana);
    const b = bojaVrste(s, x[0].formula);
    return `prevladava ${BOJE[b].z} boja (${x.map((v) => `⟦${v.formula}⟧`).join(", ")})`;
  };
  if (vr === "dvije") return [{ kljuc: "L", tekst: naStrani("L") }, { kljuc: "D", tekst: naStrani("D") }, { kljuc: "ista", tekst: "boja se ne mijenja" }];
  const b = BOJE[bojaVrste(s, o[0].formula)].z;
  const imena = o.map((v) => `⟦${v.formula}⟧`).join(", ");
  return [
    { kljuc: "jaca", tekst: `${b} boja (${imena}) postaje jača` },
    { kljuc: "slabija", tekst: `${b} boja (${imena}) slabi` },
    { kljuc: "ista", tekst: "boja se ne mijenja" },
  ];
}
export const OPCIJE_KONCENTRACIJE = [
  { kljuc: "raste", tekst: "povećava se" },
  { kljuc: "pada", tekst: "smanjuje se" },
  { kljuc: "ista", tekst: "ne mijenja se" },
];
export const OPCIJE_SMJERA = [
  { kljuc: "ulijevo", tekst: "ulijevo", pod: "prema reaktantima" },
  { kljuc: "nema", tekst: "nema pomaka", pod: "" },
  { kljuc: "udesno", tekst: "udesno", pod: "prema produktima" },
];

export const pitanjaOd = (s) => (Array.isArray(s.pitaj) && s.pitaj.length ? s.pitaj : ["smjer"]);

// Točni odgovori za „pomak“: {smjer, boja, koncentracija, sim}
export function rjesenjePomaka(s) {
  const st = pocetnoStanje(s);
  const sim = simuliraj(s, st, s.promjena);
  const p = pomak(s, s.promjena);
  const out = { smjer: p?.smjer, sim, pomak: p };
  out.boja = promjenaBoje(s, st.c, sim.poslije.c);
  if (isText(s.tvar) && s.tvar in st.c) {
    const a = st.c[s.tvar];
    const b = sim.poslije.c[s.tvar];
    out.koncentracija = Math.abs(b - a) <= 1e-7 * Math.max(a, 1e-12) ? "ista" : b > a ? "raste" : "pada";
  }
  return out;
}

// ── izraz za K ──
// {brojnik: [{formula, eksp}], nazivnik: [...]} iz uključenih vrsta
export function izraz(s) {
  const v = ukljucene(s);
  return {
    brojnik: v.filter((x) => x.strana === "D").map((x) => ({ formula: x.formula, eksp: x.koef })),
    nazivnik: v.filter((x) => x.strana === "L").map((x) => ({ formula: x.formula, eksp: x.koef })),
  };
}
// „c(NO₂)²“, „c([Cu(H₂O)₄]²⁺) · c(Cl⁻)⁴“ (Unicode, za markdown)
export function zapisClanova(s, cl) {
  return cl.map((x) => `${slovo(s)}(${x.formula})${x.eksp > 1 ? gore(x.eksp) : ""}`).join(" · ");
}
export function zapisIzraza(s, iz = izraz(s)) {
  const b = iz.brojnik.length ? zapisClanova(s, iz.brojnik) : "1";
  if (!iz.nazivnik.length) return `${simbolK(s)} = ${b}`;
  const n = zapisClanova(s, iz.nazivnik);
  const zag = (t, k) => (k > 1 ? `(${t})` : t);
  return `${simbolK(s)} = ${zag(b, iz.brojnik.length)} / ${zag(n, iz.nazivnik.length)}`;
}

// Provjera izraza: odgovor {clanovi: [{mjesto: "brojnik" | "nazivnik" | "ne", eksp}]} redom kao vrste
export function provjeriIzraz(s, odgovor) {
  const v = vrste(s);
  const cl = Array.isArray(odgovor?.clanovi) ? odgovor.clanovi : [];
  const M = ["brojnik", "nazivnik", "ne"];
  if (v.some((x, i) => !M.includes(cl[i]?.mjesto))) return { tocno: false, poruka: "Za svaku tvar odaberi: brojnik, nazivnik ili ne ulazi.", prazno: true };
  const krivi = (i) => ({ krivi: [i] });
  // 1. čvrste tvari i čiste tekućine
  const visak = v.find((x, i) => !x.ulazi && cl[i].mjesto !== "ne");
  if (visak) {
    const voda = visak.stanje === "l" && imaStanje(s, "aq");
    const t = voda
      ? `${visak.formula} je otapalo: ima ga toliko da mu se koncentracija reakcijom praktički ne mijenja, pa ne ulazi u izraz za ${simbolK(s)}.`
      : visak.stanje === "s"
        ? `${visak.formula} je čvrsta tvar (s): ne ulazi u izraz za ${simbolK(s)}.`
        : `${visak.formula} je čista tekućina (l): ne ulazi u izraz za ${simbolK(s)}.`;
    return { tocno: false, poruka: t, ...krivi(visak.i) };
  }
  // 2. izostavljena vrsta
  const fali = v.find((x, i) => x.ulazi && cl[i].mjesto === "ne");
  if (fali) {
    const zasto = jePlin(s, fali) ? "je plin (g)" : fali.stanje === "aq" ? "je otopljen (aq)" : "sudjeluje u ravnoteži";
    return { tocno: false, poruka: `${slovo(s)}(${fali.formula}) mora biti u izrazu: ${fali.formula} ${zasto}, pa mu se ${jeKp(s) ? "tlak" : "koncentracija"} reakcijom mijenja.`, ...krivi(fali.i) };
  }
  // 3. mjesto
  const u = v.filter((x) => x.ulazi);
  const kriva = u.filter((x) => cl[x.i].mjesto !== (x.strana === "D" ? "brojnik" : "nazivnik"));
  if (kriva.length && kriva.length === u.length) return { tocno: false, poruka: "Brojnik i nazivnik su zamijenjeni: produkti idu u brojnik, a reaktanti u nazivnik.", krivi: kriva.map((x) => x.i) };
  if (kriva.length) {
    const x = kriva[0];
    return { tocno: false, poruka: `${x.formula} je ${x.strana === "D" ? "produkt, pa ide u brojnik" : "reaktant, pa ide u nazivnik"}.`, krivi: kriva.map((y) => y.i) };
  }
  // 4. eksponenti
  const eksp = (i) => Number(cl[i].eksp ?? 1);
  const krivEksp = u.filter((x) => eksp(x.i) !== x.koef);
  if (krivEksp.length) {
    const sviJedan = u.every((x) => eksp(x.i) === 1);
    const x = krivEksp[0];
    if (sviJedan) return { tocno: false, poruka: `Zaboravljeni su eksponenti: svaka se koncentracija diže na potenciju svog koeficijenta iz jednadžbe (${x.formula} ima koeficijent ${x.koef}).`, krivi: krivEksp.map((y) => y.i) };
    return { tocno: false, poruka: `Eksponent uz ${slovo(s)}(${x.formula}) je koeficijent te tvari u jednadžbi${x.koef === 1 ? " (1 se ne piše)" : ""}.`, krivi: krivEksp.map((y) => y.i) };
  }
  return { tocno: true };
}

// ── račun (izracunaj) ──
// Ravnotežno stanje iz podataka: {c0?, c (ravnotežne), K, xi?, poznata?, greska?}
export function stanjeZadatka(s) {
  const v = ukljucene(s);
  const rav = brojeviOd(s.ravnotezne);
  const Kz = brojOd(s.K)?.v ?? null;
  if (s.pocetne != null) {
    const poc = brojeviOd(s.pocetne);
    const c0 = Object.fromEntries(v.map((x) => [x.formula, poc[x.formula]?.v ?? 0]));
    const poznata = v.find((x) => rav[x.formula]);
    let xi;
    if (poznata) xi = (rav[poznata.formula].v - c0[poznata.formula]) / poznata.nu;
    else if (Kz != null) xi = dosegDoRavnoteze(s, c0, Kz);
    else return { greska: "uz pocetne treba ravnotežna koncentracija jedne tvari (ravnotezne) ili K" };
    const c = pomakni(s, c0, xi);
    return { c0, c, K: Kz ?? kvocijent(s, c), xi, poznata: poznata?.formula ?? null, izK: !poznata };
  }
  const c = Object.fromEntries(v.filter((x) => rav[x.formula]).map((x) => [x.formula, rav[x.formula].v]));
  const nepoznate = v.filter((x) => !(x.formula in c));
  if (!nepoznate.length) return { c, K: Kz ?? kvocijent(s, c) };
  if (nepoznate.length === 1 && Kz != null) {
    const X = nepoznate[0];
    let ostalo = 0;
    for (const x of v) if (x !== X) ostalo += x.nu * Math.log(c[x.formula]);
    c[X.formula] = Math.exp((Math.log(Kz) - ostalo) / X.nu);
    return { c, K: Kz, izracunata: X.formula };
  }
  return { greska: nepoznate.length === 1 ? `nedostaje K ili ravnotežna vrijednost za ${nepoznate[0].formula}` : `nedostaju ravnotežne vrijednosti za ${nepoznate.map((x) => x.formula).join(", ")} (ili zadaj pocetne)` };
}
export const traziOf = (s) => [].concat(s?.trazi ?? []);
export const jedinicaKoraka = (s, t) => (t === "K" ? jedinicaK(s) : jedinicaVelicine(s));
export const oznakaKoraka = (s, t) => (t === "K" ? simbolK(s) : `${slovo(s)}(${t})`);

// K iz koncentracija s drugim eksponentima (tipične greške): f(x) → eksponent
function Kiz(s, c, eksp) {
  let ln = 0;
  for (const x of ukljucene(s)) {
    const v = c[x.formula];
    if (!(v > 0)) return NaN;
    ln += eksp(x) * Math.log(v);
  }
  return Math.exp(ln);
}

// Tipične krive vrijednosti koraka t uz stanje st (c: s učenikovim prihvaćenim vrijednostima)
function kriveKoraka(s, t, st, c) {
  const out = [];
  const add = (v, poruka) => isNum(v) && v > 0 && out.push({ vrijednost: v, poruka });
  const u = ukljucene(s);
  const K = simbolK(s);
  if (t === "K") {
    const Kt = kvocijent(s, c);
    add(1 / Kt, `Brojnik i nazivnik su zamijenjeni: produkti idu u brojnik, reaktanti u nazivnik.`);
    if (u.some((x) => x.koef > 1)) {
      add(Kiz(s, c, (x) => Math.sign(x.nu)), "Zaboravljen je eksponent: svaka se koncentracija diže na potenciju svog koeficijenta iz jednadžbe.");
      add(Kiz(s, Object.fromEntries(u.map((x) => [x.formula, c[x.formula] * x.koef])), (x) => Math.sign(x.nu)), "Koncentracija je pomnožena koeficijentom, a treba je potencirati: koeficijent je eksponent.");
      add(1 / Kiz(s, c, (x) => Math.sign(x.nu)), "Brojnik i nazivnik su zamijenjeni, a eksponenti zaboravljeni.");
    }
    if (st.c0 && u.every((x) => st.c0[x.formula] > 0)) add(kvocijent(s, st.c0), `Uvrštene su početne koncentracije. U ${K} idu ravnotežne.`);
    return out;
  }
  const X = u.find((x) => x.formula === t);
  if (!X) return out;
  const tocna = c[t];
  if (st.c0) {
    const c0 = st.c0[t] ?? 0;
    const pr = X.nu * st.xi;
    if (st.poznata) {
      const Y = u.find((x) => x.formula === st.poznata);
      const dY = Math.abs(st.c[Y.formula] - st.c0[Y.formula]);
      if (X.koef !== Y.koef) add(c0 + Math.sign(X.nu) * Math.sign(st.xi) * dY, `Promjene koncentracija su u omjeru koeficijenata iz jednadžbe (${Y.formula} : ${X.formula} = ${Y.koef} : ${X.koef}).`);
    }
    add(c0 - pr, "Predznak promjene je obrnut: reaktanti se troše (koncentracija pada), a produkti nastaju (raste), ako reakcija ide udesno.");
    if (c0 > 0) {
      add(Math.abs(pr), `To je samo promjena. Ravnotežna vrijednost je početna + promjena.`);
      add(c0, "To je početna vrijednost; traži se ravnotežna.");
    }
    return out.filter((k) => Math.abs(k.vrijednost - tocna) > 1e-9 * tocna);
  }
  // iz K i ostalih ravnotežnih: c_X^ν = K / ostalo
  const n = Math.abs(X.nu);
  if (n > 1) add(tocna ** n, `Zaboravljen je korijen: iz izraza dobiješ ${slovo(s)}(${t})${gore(n)}, pa na kraju ${n === 2 ? "izvadi drugi korijen" : `izvadi ${n}. korijen`}.`);
  const Kv = st.K;
  let ostalo = 0;
  for (const x of u) if (x !== X) ostalo += x.nu * Math.log(c[x.formula]);
  add(Math.exp((Math.log(1 / Kv) - ostalo) / X.nu), "Brojnik i nazivnik su zamijenjeni: produkti idu u brojnik, reaktanti u nazivnik.");
  add(Math.exp((Math.log(Kv) + ostalo) / X.nu), `Pogrešno je izdvojeno iz izraza: ${slovo(s)}(${t}) je ${X.nu > 0 ? "u brojniku" : "u nazivniku"}, pa ostale vrijednosti prebaci na drugu stranu.`);
  if (u.some((x) => x !== X && x.koef > 1)) {
    let o1 = 0;
    for (const x of u) if (x !== X) o1 += Math.sign(x.nu) * Math.log(c[x.formula]);
    add(Math.exp((Math.log(Kv) - o1) / X.nu), "Zaboravljen je eksponent uz ostale koncentracije: svaka se diže na potenciju svog koeficijenta.");
  }
  return out.filter((k) => Math.abs(k.vrijednost - tocna) > 1e-9 * tocna);
}

// Dopušteno odstupanje: tolerancija_posto (zadano 2 %), ali uvijek prolazi i rezultat zaokružen na dvije značajne
// znamenke, kao u ključu mature (Kc = 0,156 → „0,16“).
export function tolerancijaOd(s, v) {
  const a = Math.abs(v);
  if (!(a > 0)) return 1e-12;
  const pct = (s.tolerancija_posto ?? 2) / 100;
  return Math.max(a * pct, 0.5 * 10 ** (Math.floor(Math.log10(a)) - 1) * 1.0001);
}

// točne vrijednosti koraka izracunaj (redom kao trazi)
export function tocneVrijednosti(s) {
  const st = stanjeZadatka(s);
  return traziOf(s).map((t) => (t === "K" ? st.K : st.c?.[t]));
}

export const ravnoteza = {
  tip: "ravnoteza",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Kemijska ravnoteža i Le Chatelierovo načelo: posuda sa smjesom (boja), stupci koncentracija, Kc (ili Kp) i Q.
reakcija: {reaktanti, produkti, koeficijenti?, stanja} kao u widgetu „jednadzba“ (Unicode formule, uglate zagrade kompleksa „[Cu(H₂O)₄]²⁺“; koeficijente kod računa sam; stanja su obavezna jer određuju što ulazi u K: čvrste tvari (s) i čiste tekućine (l), npr. voda kao otapalo, ne ulaze). opce: true za opće vrste „A“, „B“, „C“ (tada koeficijenti obavezni, stanja neobavezna).
konstanta?: "Kc" (zadano) | "Kp" (sve uključene vrste su plinovi; jedinica_tlaka?: "bar" (zadano) | "kPa" | "Pa"). Jedinicu konstante (mol/dm³, dm³/mol, mol²/dm⁶, bar⁻¹ …) kod računa iz Δn.
dH?: ΔrH reakcije udesno, broj (kJ/mol) ili "+" | "−" – obavezno uz zagrijavanje/hlađenje.
boje?: {formula: boja} – boja vrste kao kemijski podatak (ključevi kao u widgetu „pokus“: "plava", "zutozelena", "smeda", "bezbojna", "ruzicasta", "crvena", "zuckasta" …).
ravnotezne?: {formula: broj | {vrijednost, zapis}} – ravnotežne koncentracije (ili parcijalni tlakovi) uključenih vrsta; zapis kao u tekstu („0,080“).
Promjene (ključevi): "dodaj <formula>", "ukloni <formula>", "zagrijavanje", "hladenje", "povecanje_tlaka", "smanjenje_tlaka" (volumenom), "razrjedivanje", "katalizator", "inertni_plin" (pri stalnom volumenu).
tekst, nacin:
- "istrazi" (nije zadatak): gumbi za promjene (promjene?: do 8 ključeva; zadano: zagrijavanje i hlađenje uz dH, dodatak svake vrste, tlak uz plinove, razrjeđivanje uz otopine, katalizator); smjesa se odmah poremeti (Q ≠ K), pa se animirano uspostavi nova ravnoteža uz isti K (osim pri promjeni temperature); ravnotezne? (bez njih su koncentracije zamišljene i tako označene);
- "pomak": promjena (jedan ključ), pitaj?: ["smjer"] (zadano) uz "boja" (treba boje; kod računa boju nove ravnoteže iz koncentracija: npr. dodatak plavog iona daje plaviju otopinu iako se ravnoteža pomiče udesno) i/ili "koncentracija" (tvar: formula uključene vrste; raste / pada / ista u novoj ravnoteži prema staroj). Smjer i poruke (endotermni smjer, broj molekula plina, broj otopljenih čestica, čvrsta tvar ne ulazi u K, katalizator) računa kod; pomak i boja se ne pokazuju prije provjere;
- "kc_izraz": učenik za svaku tvar bira brojnik / nazivnik / ne ulazi i eksponent; poruke za uključenu čvrstu tvar ili vodu, zamijenjen brojnik i nazivnik, zaboravljen eksponent dodaje kod;
- "izracunaj": trazi: 1–3 koraka redom, svaki "K" ili formula (ravnotežna vrijednost te vrste); podaci: (a) ravnotezne svih uključenih vrsta → K; (b) K i ravnotezne svih osim jedne → ta jedna; (c) pocetne ({formula: c0}, nezadane su 0) i ravnotežna vrijednost jedne vrste (u ravnotezne) ili K → tablica početno / promjena / ravnoteža. Kod računa točne vrijednosti i tipične greške (zamijenjen brojnik i nazivnik, zaboravljen eksponent ili korijen, koeficijent kao faktor, početne umjesto ravnotežnih, promjena bez omjera koeficijenata, obrnut predznak); pokazi_izraz? (zadano ne), tolerancija_posto? (zadano 2), krivo?: [{korak?, vrijednost, poruka}].`,
  primjer: {
    tip: "ravnoteza",
    nacin: "istrazi",
    tekst: "U otopini bakrova(II) sulfata s koncentriranom klorovodičnom kiselinom uspostavi se ravnoteža plavog i žutozelenog kompleksnog iona. Zagrij ili ohladi otopinu, dodaj kloridne ione ili je razrijedi i gledaj kako se mijenjaju boja i koncentracije.",
    reakcija: { reaktanti: ["[Cu(H₂O)₄]²⁺", "Cl⁻"], produkti: ["[CuCl₄]²⁻", "H₂O"], stanja: ["aq", "aq", "aq", "l"] },
    dH: "+",
    boje: { "[Cu(H₂O)₄]²⁺": "plava", "[CuCl₄]²⁻": "zutozelena" },
    promjene: ["zagrijavanje", "hladenje", "dodaj Cl⁻", "dodaj [Cu(H₂O)₄]²⁺", "razrjedivanje", "katalizator"],
  },
  primjeri: [
    {
      tip: "ravnoteza",
      nacin: "pomak",
      tekst: "Epruveta s plavozelenom otopinom bakrovih kompleksa stavi se u vruću vodu. Kamo se pomiče ravnoteža i kakva postaje otopina?",
      reakcija: { reaktanti: ["[Cu(H₂O)₄]²⁺", "Cl⁻"], produkti: ["[CuCl₄]²⁻", "H₂O"], stanja: ["aq", "aq", "aq", "l"] },
      dH: "+",
      boje: { "[Cu(H₂O)₄]²⁺": "plava", "[CuCl₄]²⁻": "zutozelena" },
      promjena: "zagrijavanje",
      pitaj: ["smjer", "boja"],
    },
    {
      tip: "ravnoteza",
      nacin: "pomak",
      tekst: "U treću epruvetu s plavozelenom otopinom dolije se jednak volumen vode. Kamo se pomiče ravnoteža i kako se mijenja boja?",
      reakcija: { reaktanti: ["[Cu(H₂O)₄]²⁺", "Cl⁻"], produkti: ["[CuCl₄]²⁻", "H₂O"], stanja: ["aq", "aq", "aq", "l"] },
      dH: "+",
      boje: { "[Cu(H₂O)₄]²⁺": "plava", "[CuCl₄]²⁻": "zutozelena" },
      promjena: "razrjedivanje",
      pitaj: ["smjer", "boja"],
    },
    {
      tip: "ravnoteza",
      nacin: "istrazi",
      tekst: "U zatvorenoj posudi je ravnotežna smjesa bezbojnog N₂O₄ i smeđeg NO₂. Mijenjaj tlak i temperaturu i gledaj boju, koncentracije i Kc.",
      reakcija: { reaktanti: ["N₂O₄"], produkti: ["NO₂"], stanja: ["g", "g"] },
      dH: "+",
      boje: { "N₂O₄": "bezbojna", "NO₂": "smeda" },
      ravnotezne: { "N₂O₄": { vrijednost: 0.08, zapis: "0,080" }, "NO₂": { vrijednost: 0.04, zapis: "0,040" } },
      promjene: ["povecanje_tlaka", "smanjenje_tlaka", "zagrijavanje", "hladenje", "dodaj NO₂", "katalizator"],
    },
    {
      tip: "ravnoteza",
      nacin: "pomak",
      tekst: "Amonijak se industrijski dobiva iz dušika i vodika. Kamo se pomiče ravnoteža kad se tlak u reaktoru poveća?",
      reakcija: { reaktanti: ["N₂", "H₂"], produkti: ["NH₃"], stanja: ["g", "g", "g"] },
      dH: -92.6,
      promjena: "povecanje_tlaka",
    },
    {
      tip: "ravnoteza",
      nacin: "kc_izraz",
      tekst: "Napiši izraz za koncentracijsku konstantu ravnoteže sinteze amonijaka.",
      reakcija: { reaktanti: ["N₂", "H₂"], produkti: ["NH₃"], stanja: ["g", "g", "g"] },
    },
    {
      tip: "ravnoteza",
      nacin: "kc_izraz",
      tekst: "Napiši izraz za koncentracijsku konstantu ravnoteže bakrovih kompleksa.",
      reakcija: { reaktanti: ["[Cu(H₂O)₄]²⁺", "Cl⁻"], produkti: ["[CuCl₄]²⁻", "H₂O"], stanja: ["aq", "aq", "aq", "l"] },
    },
    {
      tip: "ravnoteza",
      nacin: "izracunaj",
      tekst: "U ravnoteži je c(N₂O₄) = 0,080 mol/dm³ i c(NO₂) = 0,040 mol/dm³. Izračunaj koncentracijsku konstantu ravnoteže.",
      reakcija: { reaktanti: ["N₂O₄"], produkti: ["NO₂"], stanja: ["g", "g"] },
      ravnotezne: { "N₂O₄": { vrijednost: 0.08, zapis: "0,080" }, "NO₂": { vrijednost: 0.04, zapis: "0,040" } },
      trazi: ["K"],
    },
    {
      tip: "ravnoteza",
      nacin: "izracunaj",
      tekst: "Pri istoj temperaturi (Kc = 0,020 mol/dm³) u ravnoteži je c(N₂O₄) = 0,045 mol/dm³. Kolika je ravnotežna koncentracija NO₂?",
      reakcija: { reaktanti: ["N₂O₄"], produkti: ["NO₂"], stanja: ["g", "g"] },
      K: { vrijednost: 0.02, zapis: "0,020" },
      ravnotezne: { "N₂O₄": { vrijednost: 0.045, zapis: "0,045" } },
      trazi: ["NO₂"],
    },
    {
      tip: "ravnoteza",
      nacin: "izracunaj",
      tekst: "U posudu se uvede samo NO₂, c = 0,100 mol/dm³. U ravnoteži je c(NO₂) = 0,020 mol/dm³. Izračunaj ravnotežnu koncentraciju N₂O₄ i Kc.",
      reakcija: { reaktanti: ["N₂O₄"], produkti: ["NO₂"], stanja: ["g", "g"] },
      pocetne: { "NO₂": { vrijednost: 0.1, zapis: "0,100" } },
      ravnotezne: { "NO₂": { vrijednost: 0.02, zapis: "0,020" } },
      trazi: ["N₂O₄", "K"],
    },
    {
      tip: "ravnoteza",
      nacin: "izracunaj",
      tekst: "Za ravnotežu 2 A ⇌ B + 3 C ravnotežne su koncentracije A 0,58, B 0,21 i C 0,63 mol dm⁻³. Izračunaj Kc.",
      reakcija: { reaktanti: ["A"], produkti: ["B", "C"], koeficijenti: [2, 1, 3], opce: true },
      ravnotezne: { A: 0.58, B: 0.21, C: 0.63 },
      trazi: ["K"],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `ravnoteza.nacin mora biti jedan od: ${NACINI.join(", ")}`)) return list;
    need(isText(s.tekst), "ravnoteza treba „tekst“");
    const dopustena = [...ZAJEDNICKA, ...POLJA_NACINA[s.nacin]];
    for (const f of Object.keys(s)) need(dopustena.includes(f), POLJA.includes(f) ? `polje „${f}“ ne ide uz način ${s.nacin}` : `ravnoteza nema polje „${f}“`);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    // reakcija
    const r = s.reakcija;
    if (!need(r && typeof r === "object" && Array.isArray(r.reaktanti) && Array.isArray(r.produkti) && r.reaktanti.length && r.produkti.length, "ravnoteza treba reakcija: {reaktanti: [...], produkti: [...], stanja}")) return list;
    for (const f of Object.keys(r)) need(["reaktanti", "produkti", "koeficijenti", "stanja", "opce"].includes(f), `reakcija nema polje „${f}“ (dopuštena: reaktanti, produkti, koeficijenti, stanja, opce)`);
    if (opce(s)) {
      const sve = [...r.reaktanti, ...r.produkti];
      need(sve.every((f) => typeof f === "string" && /^[A-Z]$/.test(f)), "uz opce: true vrste su velika slova („A“, „B“, „C“)");
      need(new Set(sve).size === sve.length, "svaka opća vrsta je u reakciji samo jednom");
      need(Array.isArray(r.koeficijenti) && r.koeficijenti.length === sve.length && r.koeficijenti.every((k) => Number.isInteger(k) && k >= 1), `uz opce: true koeficijenti su obavezni: ${sve.length} pozitivnih cijelih brojeva`);
      if (r.stanja != null) {
        const vr = Array.isArray(r.stanja) ? r.stanja : Object.values(r.stanja);
        need(vr.every((v) => [...STANJA, "ℓ"].includes(v)), "stanje je s, l, g ili aq");
      }
    } else {
      for (const p of jednadzba.validate(jednadzbaOd(s))) need(false, /^način stanja traži stanje/.test(p) ? `reakcija treba stanje svake tvari, jer stanje određuje što ulazi u ${simbolK(s)} (${p.replace(/^[^(]*\(/, "(")}` : `reakcija: ${p}`);
      if (list.length) return list;
      const v = vrste(s);
      need(v.every((x) => x.stanje), `reakcija treba stanje svake tvari (određuje što ulazi u ${simbolK(s)})`);
    }
    if (list.length) return list;
    const v = vrste(s);
    const u = v.filter((x) => x.ulazi);
    need(u.length > 0, "u izraz za K mora ući barem jedna vrsta (sve su čvrste ili tekuće)");
    // konstanta
    need(s.konstanta == null || ["Kc", "Kp"].includes(s.konstanta), 'konstanta je "Kc" ili "Kp"');
    if (s.jedinica_tlaka != null) need(jeKp(s) && TLAK.includes(s.jedinica_tlaka), `jedinica_tlaka (${TLAK.join(", ")}) ide samo uz konstanta: "Kp"`);
    if (jeKp(s)) need(u.every((x) => x.stanje === "g" || (opce(s) && x.stanje == null)), `Kp vrijedi za plinove: ${u.filter((x) => x.stanje !== "g").map((x) => x.formula).join(", ")} nije plin (g)`);
    // dH
    if (s.dH != null) need(znakDH(s) != null, 'dH je ΔrH reakcije udesno: broj (kJ/mol, različit od 0) ili "+" / "−"');
    // boje
    if (s.boje != null && need(typeof s.boje === "object" && !Array.isArray(s.boje), "boje je {formula: boja}")) {
      for (const [f, b] of Object.entries(s.boje)) {
        const x = v.find((y) => y.formula === f);
        need(!!x, `boje: „${f}“ nije tvar iz reakcije`);
        need(b in BOJE, `boje: „${b}“ nije poznata boja (${Object.keys(BOJE).join(", ")})`);
        if (x && !x.ulazi && b !== "bezbojna") need(false, `boje: ${f} je ${x.stanje === "s" ? "čvrsta tvar" : "tekućina"}; boja smjese računa se samo iz otopljenih vrsta i plinova`);
      }
    }
    // brojevi
    const provjeriBrojeve = (o, ime, smijeNula) => {
      if (o == null) return;
      if (!need(typeof o === "object" && !Array.isArray(o), `${ime} je {formula: broj ili {vrijednost, zapis}}`)) return;
      for (const [f, x] of Object.entries(o)) {
        const y = v.find((z) => z.formula === f);
        if (!need(!!y, `${ime}: „${f}“ nije tvar iz reakcije`)) continue;
        if (!need(y.ulazi, `${ime}: ${f} je ${y.stanje === "s" ? "čvrsta tvar" : "čista tekućina"} i ne ulazi u ${simbolK(s)}, pa joj se ne zadaje ${jeKp(s) ? "tlak" : "koncentracija"}`)) continue;
        const b = brojOd(x);
        if (!need(b && (smijeNula ? b.v >= 0 : b.v > 0), `${ime}.${f} mora biti ${smijeNula ? "nenegativan" : "pozitivan"} broj (ili {vrijednost, zapis})`)) continue;
        if (b.zapis != null || (x && typeof x === "object" && "zapis" in x)) {
          const n = parseNumber(String(x.zapis ?? ""));
          need(isText(x.zapis) && isNum(n) && Math.abs(n - b.v) <= 1e-9 * Math.max(1, Math.abs(b.v)), `${ime}.${f}.zapis („${x.zapis}“) mora biti isti broj kao vrijednost (${b.v})`);
        }
      }
    };
    provjeriBrojeve(s.ravnotezne, "ravnotezne", false);
    provjeriBrojeve(s.pocetne, "pocetne", true);
    if (s.K != null) {
      const b = brojOd(s.K);
      if (need(b && b.v > 0, "K mora biti pozitivan broj (ili {vrijednost, zapis})") && s.K?.zapis != null) {
        const n = parseNumber(String(s.K.zapis));
        need(isNum(n) && Math.abs(n - b.v) <= 1e-9 * Math.max(1, b.v), `K.zapis („${s.K.zapis}“) mora biti isti broj kao vrijednost (${b.v})`);
      }
    }
    if (list.length) return list;
    if ((s.nacin === "istrazi" || s.nacin === "pomak") && s.ravnotezne != null)
      need(u.every((x) => x.formula in s.ravnotezne), `ravnotezne treba sve vrste iz izraza za ${simbolK(s)} (${u.map((x) => x.formula).join(", ")})`);

    if (s.nacin === "istrazi") {
      if (s.promjene != null && need(Array.isArray(s.promjene) && s.promjene.length >= 1 && s.promjene.length <= 8, "promjene je popis od 1 do 8 ključeva")) {
        s.promjene.forEach((k) => {
          const g = greskaPromjene(s, k);
          need(!g, `promjene: ${g}`);
        });
        need(new Set(s.promjene).size === s.promjene.length, "promjene se ne ponavljaju");
      }
    }

    if (s.nacin === "pomak") {
      if (!need(isText(s.promjena), "pomak treba promjena (npr. \"zagrijavanje\", \"dodaj Cl⁻\", \"povecanje_tlaka\")")) return list;
      const g = greskaPromjene(s, s.promjena);
      if (!need(!g, `promjena: ${g}`)) return list;
      const pit = pitanjaOd(s);
      need(Array.isArray(pit) && pit.every((p) => PITANJA.includes(p)) && new Set(pit).size === pit.length, `pitaj je popis bez ponavljanja od: ${PITANJA.join(", ")}`);
      if (pit.includes("boja")) {
        const vr = vrstaBoje(s);
        if (need(vr, "pitanje o boji treba boje obojenih vrsta koje ulaze u ravnotežu")) {
          const p = procitajPromjenu(s.promjena);
          need(!(vr === "jedna" && ["povecanje_tlaka", "smanjenje_tlaka", "razrjedivanje"].includes(p.vrsta)), "uz promjenu tlaka ili razrjeđivanje boja jedne obojene tvari nije jednoznačna (smjesa se najprije zgusne ili razrijedi, a pomak to samo djelomično poništi): pitaj smjer ili koncentraciju");
        }
      }
      if (pit.includes("koncentracija")) {
        if (need(isText(s.tvar), "pitanje o koncentraciji treba tvar (formulu)")) need(u.some((x) => x.formula === s.tvar), `tvar ${s.tvar} mora biti vrsta koja ulazi u ${simbolK(s)} (${u.map((x) => x.formula).join(", ")})`);
      } else need(s.tvar == null, "tvar ide samo uz pitaj: [..., \"koncentracija\"]");
    }

    if (s.nacin === "izracunaj") {
      const tr = traziOf(s);
      if (!need(tr.length >= 1 && tr.length <= 3, "trazi je popis od 1 do 3 koraka: \"K\" ili formula")) return list;
      need(new Set(tr).size === tr.length, "trazi: korak se ne ponavlja");
      tr.forEach((t, i) => need(t === "K" || u.some((x) => x.formula === t), `trazi[${i}]: „${t}“ je "K" ili formula vrste iz izraza (${u.map((x) => x.formula).join(", ")})`));
      if (list.length) return list;
      const st = stanjeZadatka(s);
      if (!need(!st.greska, `podaci: ${st.greska}`)) return list;
      const rav = brojeviOd(s.ravnotezne);
      for (const x of u) need(isNum(st.c[x.formula]) && st.c[x.formula] > 0, `ravnotežna vrijednost za ${x.formula} ispada ${formatNumber(st.c[x.formula])} (mora biti pozitivna): provjeri podatke`);
      if (list.length) return list;
      if (st.c0) {
        // zadane ravnotežne vrijednosti moraju se slagati s jednim dosegom ξ
        for (const x of u)
          if (rav[x.formula]) need(Math.abs(rav[x.formula].v - st.c[x.formula]) <= 0.01 * st.c[x.formula], `ravnotezne.${x.formula} se ne slaže s početnim vrijednostima i omjerom koeficijenata (iz ostalog slijedi ${zapisBroja(st.c[x.formula], 3)})`);
        if (s.K != null && st.poznata) need(Math.abs(brojOd(s.K).v - kvocijent(s, st.c)) <= 0.02 * brojOd(s.K).v, `zadani K se ne slaže s ravnotežnim vrijednostima (iz njih K = ${zapisBroja(kvocijent(s, st.c), 3)})`);
        tr.forEach((t, i) => need(t === "K" ? s.K == null : !rav[t], `trazi[${i}]: ${t === "K" ? "K" : t} je zadan, pa ne može biti korak`));
      } else {
        if (s.K != null && !st.izracunata) need(Math.abs(brojOd(s.K).v - kvocijent(s, st.c)) <= 0.02 * brojOd(s.K).v, `zadani K se ne slaže s ravnotežnim vrijednostima (iz njih K = ${zapisBroja(kvocijent(s, st.c), 3)})`);
        tr.forEach((t, i) => {
          if (t === "K") need(s.K == null, `trazi[${i}]: K je zadan, pa ne može biti korak`);
          else need(t === st.izracunata, `trazi[${i}]: ${t} je zadan u ravnotezne (bez pocetne se računa samo K ili jedna nepoznata ravnotežna vrijednost iz K)`);
        });
        need(tr.length === 1, "bez pocetne lanac ima jedan korak (K ili jedna ravnotežna vrijednost)");
      }
      if (s.tolerancija_posto != null) need(isNum(s.tolerancija_posto) && s.tolerancija_posto > 0 && s.tolerancija_posto <= 5, "tolerancija_posto je broj između 0 i 5");
      if (s.pokazi_izraz != null) need(typeof s.pokazi_izraz === "boolean", "pokazi_izraz je true ili false");
      if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis {korak?, vrijednost, poruka}") && !list.length) {
        const tocne = tocneVrijednosti(s);
        s.krivo.forEach((k, i) => {
          const j = k?.korak ?? tr.length - 1;
          if (!need(Number.isInteger(j) && j >= 0 && j < tr.length, `krivo[${i}].korak je indeks koraka iz trazi`)) return;
          need(isNum(k?.vrijednost) && isText(k?.poruka), `krivo[${i}] treba vrijednost (broj) i poruku`);
          if (isNum(k?.vrijednost)) need(Math.abs(k.vrijednost - tocne[j]) > 0.005 * tocne[j], `krivo[${i}].vrijednost je točan odgovor`);
        });
      }
    }
    return list;
  },

  // pomak: {smjer, boja?, koncentracija?}; kc_izraz: {clanovi: [{mjesto, eksp}]}; izracunaj: [upis po koraku]
  check(s, odgovor) {
    if (s.nacin === "pomak") {
      const rj = rjesenjePomaka(s);
      const pit = pitanjaOd(s);
      if (pit.some((p) => !odgovor?.[p])) return { tocno: false, poruka: "Odgovori na sva pitanja.", prazno: true };
      if (pit.includes("smjer") && odgovor.smjer !== rj.smjer) return { tocno: false, poruka: bezOznaka(rj.pomak.savjet), krivo: "smjer" };
      if (pit.includes("boja") && odgovor.boja !== rj.boja) {
        const p = procitajPromjenu(s.promjena);
        const x = p.formula && vrste(s).find((y) => y.formula === p.formula);
        let poruka;
        if (x && bojaVrste(s, x.formula) && bojaVrste(s, x.formula) !== "bezbojna" && (p.vrsta === "dodaj" || p.vrsta === "ukloni"))
          poruka = `Pomak samo djelomično poništi promjenu: ${x.formula} (${BOJE[bojaVrste(s, x.formula)].z} boja) ostane ${p.vrsta === "dodaj" ? "više" : "manje"} nego prije.`;
        else if (rj.smjer === "nema") poruka = "Ravnoteža se ne pomiče, pa ni omjer obojenih tvari ostaje isti.";
        else poruka = `Boju daju obojene tvari (${obojena(s).map((y) => `${y.formula} ${BOJE[bojaVrste(s, y.formula)].z}`).join(", ")}): kojih ima više kad se ravnoteža pomakne?`;
        return { tocno: false, poruka, krivo: "boja" };
      }
      if (pit.includes("koncentracija") && odgovor.koncentracija !== rj.koncentracija) {
        const p = procitajPromjenu(s.promjena);
        let poruka;
        if ((p.vrsta === "dodaj" || p.vrsta === "ukloni") && p.formula === s.tvar) poruka = `Pomak samo djelomično poništi promjenu: ${p.vrsta === "dodaj" ? `dio dodanog ${s.tvar} se potroši, ali ga ostane više` : `dio ${s.tvar} se nadoknadi, ali ga ostane manje`} nego prije.`;
        else if (p.vrsta === "povecanje_tlaka") poruka = "Smanjenjem volumena sve koncentracije plinova najprije porastu; pomak to samo djelomično poništi.";
        else if (p.vrsta === "smanjenje_tlaka") poruka = "Povećanjem volumena sve koncentracije plinova najprije padnu; pomak to samo djelomično poništi.";
        else if (p.vrsta === "razrjedivanje") poruka = "Razrjeđivanjem sve koncentracije otopljenih tvari najprije padnu; pomak to samo djelomično poništi.";
        else if (rj.smjer === "nema") poruka = "Ravnoteža se ne pomiče, pa se ni koncentracije ne mijenjaju.";
        else poruka = `Kad se ravnoteža pomakne ${SMJER[rj.smjer]}, tvari na toj strani nastaje više, a one s druge strane se troše.`;
        return { tocno: false, poruka, krivo: "koncentracija" };
      }
      return { tocno: true };
    }
    if (s.nacin === "kc_izraz") return provjeriIzraz(s, odgovor);
    if (s.nacin !== "izracunaj") return { tocno: false, poruka: "Ovaj korak nema provjeru." };
    const st = stanjeZadatka(s);
    const tr = traziOf(s);
    const unosi = [].concat(odgovor ?? []);
    const c = { ...st.c }; // s učenikovim prihvaćenim vrijednostima
    for (let i = 0; i < tr.length; i++) {
      const t = tr[i];
      const tocna = t === "K" ? st.K : st.c[t];
      // K i iz učenikovih ravnotežnih vrijednosti (zaokružene 0,040 umjesto 0,0400…)
      const izUcenika = t === "K" && s.K == null ? kvocijent(s, c) : tocna;
      const unit = jedinicaKoraka(s, t);
      const tol = tolerancijaOd(s, tocna);
      const krivo = [...kriveKoraka(s, t, st, c), ...(s.krivo ?? []).filter((k) => (k.korak ?? tr.length - 1) === i)].filter((k) => !near(k.vrijednost, tocna, tol) && !near(k.vrijednost, izUcenika, tolerancijaOd(s, izUcenika)));
      const r = checkNumber({ input: unosi[i] ?? "", answer: tocna, tol, unit, krivo, savjet: t === "K" ? `Uvrsti ravnotežne vrijednosti u izraz: ${zapisIzraza(s)}.` : `Pogledaj izraz ${zapisIzraza(s)} i izdvoji ${oznakaKoraka(s, t)}.` });
      const n = parseNumber(String(unosi[i] ?? ""), unit);
      const ok = r.tocno || (isNum(n) && near(n, izUcenika, tolerancijaOd(s, izUcenika)));
      if (!ok) return tr.length > 1 ? { ...r, praznina: i, poruka: `${oznakaKoraka(s, t)}: ${r.poruka}` } : { ...r, praznina: 0 };
      if (t !== "K") c[t] = n;
    }
    return { tocno: true };
  },

  brojcaniOdgovor(s) {
    if (s.nacin !== "izracunaj") return null;
    const v = tocneVrijednosti(s).at(-1);
    return isNum(v) ? Number(v.toPrecision(3)) : null;
  },

  tocanOdgovor(s) {
    if (s.nacin === "kc_izraz") {
      const bez = vrste(s).filter((x) => !x.ulazi);
      return `${zapisIzraza(s)}${bez.length ? `; ${lista(bez.map((x) => `${x.formula}(${x.stanje})`))} ne ${bez.length > 1 ? "ulaze" : "ulazi"} u izraz` : ""}`;
    }
    if (s.nacin === "pomak") {
      const rj = rjesenjePomaka(s);
      const pit = pitanjaOd(s);
      const dio = [`Ravnoteža: ${SMJER[rj.smjer]}.`];
      if (pit.includes("boja")) dio.push(`Boja: ${bezOznaka(opcijeBoje(s).find((o) => o.kljuc === rj.boja)?.tekst ?? "")}.`);
      if (pit.includes("koncentracija")) dio.push(`${slovo(s)}(${s.tvar}): ${OPCIJE_KONCENTRACIJE.find((o) => o.kljuc === rj.koncentracija)?.tekst}.`);
      return dio.join(" ");
    }
    if (s.nacin === "izracunaj") {
      const v = tocneVrijednosti(s);
      return traziOf(s)
        .map((t, i) => `${oznakaKoraka(s, t)} = ${zapisBroja(v[i])}${jedinicaKoraka(s, t) ? ` ${jedinicaKoraka(s, t)}` : ""}`)
        .join(" → ");
    }
    return "";
  },
};
