// plin_posuda, smjesa plinova (kemija, Daltonov zakon): neobavezno proširenje fizikalnog widgeta. Spec s poljem
// „smjesa“ ide ovim putem, a svi ostali (fizikalni) specovi ostaju na starom putu u plin_posuda.js, nepromijenjeni.
// Čvrsta boca, stalni V i T: svaki plin ima svoj parcijalni tlak p(X) = x(X)·p = n(X)RT/V, ukupni tlak je zbroj.
// R i 273 K su s lista „Kemija – tablice“ (R = 8,31, ne 8,314 iz fizike), molarne mase iz Ar s lista. Čisti JS (bez
// DOM-a), kao i ostatak kataloga.
import {
  isNum,
  parseNumber,
  formatNumber,
  formatSci,
  near,
} from "../../core/number.js";
import {
  isText,
  problems,
  noAnswerFields,
  checkNumber,
} from "../zajednicko.js";
import { V_JEDINICE } from "./_plin.js";
import { KONSTANTE, molarnaMasa } from "../kemija/_tablice.js";
import { formulaZapis } from "../kemija/mol_racun.js";

export const R_KEM = KONSTANTE.R.vrijednost; // 8,31 Pa m³ K⁻¹ mol⁻¹
export const T0_KEM = KONSTANTE.T0.vrijednost; // 273 K
// hPa samo ovdje (ispitni zadaci ga koriste); fizikalni put i plinski_dijagram zadržavaju svoj popis
export const P_SMJESA = { Pa: 1, hPa: 100, kPa: 1e3, bar: 1e5, MPa: 1e6 };
const NACINI = ["istrazi", "izracunaj"];
const KOLICINE = ["n", "m", "x", "p"]; // čime je zadan pojedini plin
const TRAZI = ["p", "x", "n", "M", "Mr"];
const MAX_PLINOVA = 4;

export const jeSmjesa = (s) =>
  s != null && typeof s === "object" && "smjesa" in s;
export const jediniceSmjese = (s) => ({
  p: s.jedinice?.p ?? "kPa",
  V: s.jedinice?.V ?? "L",
});
const zbroj = (a) => a.reduce((x, y) => x + y, 0);
const istaFormula = (a, b) =>
  formulaZapis(String(a ?? "")) === formulaZapis(String(b ?? ""));
const zadanoOd = (g) => KOLICINE.find((q) => isNum(g?.[q])) ?? null;
// „n“ i „m“ su ista vrsta podatka (m se pretvara u n preko M)
const vrstaOd = (z) => (z === "m" ? "n" : z);

// Stanje smjese iz speca: za svaki plin n, x, p (u jedinici speca), m i maseni udio w; ukupni n, p; T, V, M smjese.
// Što se iz zadanoga ne može izračunati, ostaje null. k.n: {formula: n} iz klizača (istraživanje).
// kvar: namjerna greška za tipične krive odgovore (celzij: T = t; Vm3: obujam bez pretvorbe u m³;
// pBezPretvorbe: tlak uvršten u jedinici speca, a ne u Pa).
export function stanjeSmjese(s, k = {}, kvar = {}) {
  const sm = s.smjesa ?? {};
  const j = jediniceSmjese(s);
  const pf = P_SMJESA[j.p] ?? 1;
  const pUlaz = kvar.pBezPretvorbe ? 1 : pf;
  const T =
    kvar.celzij && isNum(sm.t)
      ? sm.t
      : isNum(sm.T)
        ? sm.T
        : isNum(sm.t)
          ? sm.t + T0_KEM
          : null;
  const Vm3 = isNum(sm.V)
    ? sm.V * (kvar.Vm3 ? 1 : (V_JEDINICE[j.V] ?? 1))
    : null;
  const RTV = T != null && Vm3 ? (R_KEM * T) / Vm3 : null; // Pa po molu
  const plinovi = (Array.isArray(sm.plinovi) ? sm.plinovi : []).map((g) => {
    const M = molarnaMasa(g?.formula);
    const zadano = zadanoOd(g);
    const izKlizaca =
      k.n && Object.keys(k.n).find((f) => istaFormula(f, g?.formula));
    const n = izKlizaca
      ? k.n[izKlizaca]
      : zadano === "n"
        ? g.n
        : zadano === "m" && M
          ? g.m / M
          : null;
    return {
      formula: formulaZapis(String(g?.formula ?? "")),
      naziv: g?.naziv ?? null,
      M,
      zadano,
      n,
      x: zadano === "x" ? g.x : null,
      pPa: zadano === "p" ? g.p * pUlaz : null,
    };
  });
  const nepoznat = plinovi.findIndex((g) => g.zadano == null);
  const vrste = [
    ...new Set(plinovi.map((g) => vrstaOd(g.zadano)).filter(Boolean)),
  ];
  const vrsta = vrste.length === 1 ? vrste[0] : null;
  let pPa = isNum(sm.p) ? sm.p * pUlaz : null;
  let nUk = null;
  const nep = nepoznat >= 0 ? plinovi[nepoznat] : null;
  if (vrsta === "n") {
    const zn = zbroj(plinovi.filter((g) => g !== nep).map((g) => g.n ?? 0));
    if (nep) {
      if (pPa != null && RTV) {
        nUk = pPa / RTV;
        nep.n = nUk - zn;
      }
    } else nUk = zn;
    if (nUk != null && nUk > 0) for (const g of plinovi) g.x = g.n / nUk;
    if (pPa != null) {
      // zadani ukupni tlak: parcijalni su njegovi dijelovi (kao u rješenjima: p(X) = x(X)·p)
      if (nUk > 0) for (const g of plinovi) g.pPa = g.x * pPa;
    } else if (RTV && nUk != null) {
      for (const g of plinovi) g.pPa = g.n * RTV;
      pPa = nUk * RTV;
    }
  } else if (vrsta === "x") {
    if (nep)
      nep.x = 1 - zbroj(plinovi.filter((g) => g !== nep).map((g) => g.x));
    if (pPa != null) {
      for (const g of plinovi) g.pPa = g.x * pPa;
      if (RTV) {
        nUk = pPa / RTV;
        for (const g of plinovi) g.n = g.x * nUk;
      }
    }
  } else if (vrsta === "p") {
    const zp = zbroj(plinovi.filter((g) => g !== nep).map((g) => g.pPa));
    if (nep) {
      if (pPa != null) nep.pPa = pPa - zp;
    } else if (pPa == null) pPa = zp;
    if (pPa != null && pPa > 0 && plinovi.every((g) => g.pPa != null)) {
      for (const g of plinovi) g.x = g.pPa / pPa;
      if (RTV) {
        for (const g of plinovi) g.n = g.pPa / RTV;
        nUk = pPa / RTV;
      }
    }
  }
  const sviX = plinovi.length > 0 && plinovi.every((g) => isNum(g.x) && g.M);
  const M = sviX ? zbroj(plinovi.map((g) => g.x * g.M)) : null;
  for (const g of plinovi) {
    g.w = M ? (g.x * g.M) / M : null;
    g.m = isNum(g.n) && g.M ? g.n * g.M : null;
    g.p = isNum(g.pPa) ? g.pPa / pf : null;
  }
  return {
    plinovi,
    vrsta,
    nepoznat,
    n: nUk,
    p: pPa != null ? pPa / pf : null,
    T,
    V: isNum(sm.V) ? sm.V : null,
    M,
    jedinice: j,
    // kako se dolazi do parcijalnog tlaka (za pravilo uz polje nakon provjere)
    pIzUkupnog: isNum(sm.p),
  };
}

export const plinOd = (st, formula) =>
  st.plinovi.find((g) => istaFormula(g.formula, formula)) ?? null;
export const trazeni = (s) => [].concat(s.trazi ?? []);

// vrijednost tražene veličine {velicina, plin?} u stanju
export function vrijednostTrazenog(st, t) {
  const g = t.plin != null ? plinOf(st, t.plin) : null;
  if (t.velicina === "p") return g ? g.p : st.p;
  if (t.velicina === "x") return g?.x ?? null;
  if (t.velicina === "n") return g?.n ?? null;
  if (t.velicina === "M" || t.velicina === "Mr") return st.M;
  return null;
}
const plinOf = plinOd;

export const jedinicaTrazenog = (s, t) =>
  t.velicina === "p"
    ? jediniceSmjese(s).p
    : t.velicina === "n"
      ? "mol"
      : t.velicina === "M"
        ? "g/mol"
        : "";

// oznaka veličine za tekst: „p(O₂)“, „p“, „x(N₂)“, „M(smjese)“, „Mr(smjese)“
export const oznakaTrazenog = (t) =>
  t.velicina === "M" || t.velicina === "Mr"
    ? `${t.velicina}(smjese)`
    : t.plin != null
      ? `${t.velicina}(${formulaZapis(t.plin)})`
      : t.velicina;

// Pravilo za korak (prikazuje se tek nakon provjere ili uz operacije: true; pitanje ne daje formulu).
export function praviloTrazenog(s, t) {
  const st = stanjeSmjese(s);
  if (t.velicina === "p" && t.plin == null) return "p = p(A) + p(B) + …";
  if (t.velicina === "p")
    return st.pIzUkupnog ? "p(X) = x(X) · p" : "p(X) = n(X) · R · T : V";
  if (t.velicina === "x")
    return st.vrsta === "x"
      ? "x(A) + x(B) + … = 1"
      : st.vrsta === "p"
        ? "x(X) = p(X) : p"
        : st.plinovi.some((g) => g.zadano === "m")
          ? "n = m : M,  x(X) = n(X) : n"
          : "x(X) = n(X) : n";
  if (t.velicina === "n") return "n = p · V : (R · T),  n(X) = n − n(ostali)";
  return `${t.velicina} = x(A)·${t.velicina}(A) + x(B)·${t.velicina}(B) + …`;
}

// ── tipični krivi odgovori za korak ──
function kriviOdgovori(s, t) {
  const st = stanjeSmjese(s);
  const tocno = vrijednostTrazenog(st, t);
  const j = st.jedinice;
  const g = t.plin != null ? plinOf(st, t.plin) : null;
  const ostali = st.plinovi.filter((h) => h !== g);
  const out = [];
  const add = (v, poruka) => {
    if (isNum(v) && v > 0) out.push({ vrijednost: v, poruka });
  };
  const imaMasu = st.plinovi.some((h) => h.zadano === "m");
  if (t.velicina === "p" && g) {
    add(
      st.p,
      `To je ukupni tlak smjese. ${g.formula} nosi samo svoj dio tlaka, razmjeran svom udjelu čestica.`,
    );
    for (const h of ostali)
      add(h.p, `To je parcijalni tlak ${h.formula}, a traži se ${g.formula}.`);
    if (imaMasu && isNum(g.w) && isNum(st.p))
      add(
        g.w * st.p,
        `Uzeo si maseni udio ${g.formula}. Tlak ovisi o broju čestica: najprije n = m : M, pa množinski udio.`,
      );
    if (ostali.length === 1 && g.n && ostali[0].n && isNum(st.p))
      add(
        (g.n / ostali[0].n) * st.p,
        `Podijelio si množinu ${g.formula} množinom ${ostali[0].formula}. Množinski udio dijeli se ukupnom množinom smjese.`,
      );
  }
  if (t.velicina === "p" && !g)
    for (const h of st.plinovi)
      add(
        st.p - h.p,
        `Nedostaje parcijalni tlak ${h.formula}: ukupni tlak je zbroj parcijalnih tlakova svih plinova.`,
      );
  if (t.velicina === "x" && g) {
    add(
      g.x * 100,
      `Množinski udio je broj od 0 do 1: upiši ${formatNumber(Number(g.x.toPrecision(3)))} ili ${formatNumber(Number((g.x * 100).toPrecision(3)))} %.`,
    );
    if (imaMasu)
      add(
        g.w,
        `To je maseni udio ${g.formula}. Množinski udio računa se iz množina: najprije n = m : M za svaki plin.`,
      );
    for (const h of ostali)
      add(h.x, `To je množinski udio ${h.formula}, a traži se ${g.formula}.`);
    if (ostali.length === 1 && g.n && ostali[0].n)
      add(
        g.n / ostali[0].n,
        `Podijelio si množinu ${g.formula} množinom ${ostali[0].formula}. Dijeli se ukupnom množinom smjese.`,
      );
  }
  if (t.velicina === "n" && g) {
    add(
      st.n,
      `To je ukupna množina plina u posudi. Od nje oduzmi množinu ostalih plinova.`,
    );
    if (isNum(st.n))
      add(
        st.n + zbroj(ostali.map((h) => h.n ?? 0)),
        "Množinu ostalih plinova treba oduzeti od ukupne, a ne dodati.",
      );
  }
  if ((t.velicina === "M" || t.velicina === "Mr") && st.M) {
    const M = st.plinovi.map((h) => h.M);
    add(
      zbroj(M) / M.length,
      "To je običan prosjek molarnih masa. Svaku pomnoži množinskim udjelom tog plina, pa zbroji.",
    );
    if (st.plinovi.length > 2)
      for (const h of st.plinovi)
        add(st.M - h.x * h.M, `Izostavio si ${h.formula}.`);
  }
  // greške u jedinicama i temperaturi: račun iznova s tom greškom
  const sm = s.smjesa;
  if (isNum(sm.t))
    add(
      vrijednostTrazenog(stanjeSmjese(s, {}, { celzij: true }), t),
      "Temperaturu uvrsti u kelvinima: T = t + 273.",
    );
  if (j.V !== "m³")
    add(
      vrijednostTrazenog(stanjeSmjese(s, {}, { Vm3: true }), t),
      `Obujam pretvori u m³ (1 ${j.V} = ${formatSci(V_JEDINICE[j.V])} m³), jer je R u Pa m³ K⁻¹ mol⁻¹.`,
    );
  if (j.p !== "Pa" && t.velicina === "n")
    add(
      vrijednostTrazenog(stanjeSmjese(s, {}, { pBezPretvorbe: true }), t),
      `Tlak pretvori u Pa (1 ${j.p} = ${formatSci(P_SMJESA[j.p])} Pa), jer je R u Pa m³ K⁻¹ mol⁻¹.`,
    );
  if (t.velicina === "p" && isNum(tocno))
    for (const u of ["Pa", "hPa", "kPa"])
      if (u !== j.p)
        add(
          (tocno * P_SMJESA[j.p]) / P_SMJESA[u],
          `To je tlak u ${u}, a traži se u ${j.p}.`,
        );
  // bez dvostrukih i bez onih koje su (unutar tolerancije) točne; kriva vrijednost prepoznaje se s istom
  // tolerancijom kao točna (0,33 je ukupna množina 0,333)
  const tol = tolerancijaPosto(s) / 100;
  const vidjeno = [];
  return out
    .filter((k) => {
      if (!isNum(tocno) || near(k.vrijednost, tocno, Math.abs(tocno) * tol))
        return false;
      if (
        vidjeno.some((v) =>
          near(v, k.vrijednost, Math.abs(k.vrijednost) * 1e-3),
        )
      )
        return false;
      vidjeno.push(k.vrijednost);
      return true;
    })
    .map((k) => ({ ...k, tolerancija: Math.abs(k.vrijednost) * tol }));
}

const tolerancijaPosto = (s) =>
  isNum(s.tolerancija_posto) ? s.tolerancija_posto : 1;

// Upis množinskog udjela: „0,25“ ili „25 %“.
function ulazX(input) {
  const t = String(input ?? "").trim();
  if (/%$/.test(t)) {
    const n = parseNumber(t.replace(/%$/, "").trim());
    return n == null ? t : String(n / 100).replace(".", ",");
  }
  return t;
}

export function checkSmjesa(s, odgovor) {
  if (s.nacin !== "izracunaj")
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  const st = stanjeSmjese(s);
  const tr = trazeni(s);
  const unosi = [].concat(odgovor ?? []);
  const pct = tolerancijaPosto(s) / 100;
  for (let i = 0; i < tr.length; i++) {
    const t = tr[i];
    const answer = vrijednostTrazenog(st, t);
    const unit = jedinicaTrazenog(s, t);
    const r = checkNumber({
      input: t.velicina === "x" ? ulazX(unosi[i]) : (unosi[i] ?? ""),
      answer,
      tol: Math.abs(answer) * pct,
      unit,
      krivo: [
        ...(s.krivo ?? []).filter((k) => (k.korak ?? tr.length - 1) === i),
        ...kriviOdgovori(s, t),
      ],
      savjet: s.savjet || `Provjeri račun za ${oznakaTrazenog(t)} i jedinice.`,
    });
    if (!r.tocno)
      return tr.length > 1
        ? { ...r, praznina: i, poruka: `${oznakaTrazenog(t)}: ${r.poruka}` }
        : { ...r, praznina: 0 };
  }
  return { tocno: true };
}

export const zapisTrazenog = (s, t, v) => {
  if (!isNum(v)) return "—";
  const u = jedinicaTrazenog(s, t);
  const broj =
    t.velicina === "x" ? formatNumber(Number(v.toPrecision(3))) : formatSci(v);
  return `${broj}${u ? `\u00a0${u}` : ""}`;
};

export function tocanOdgovorSmjesa(s) {
  if (s.nacin !== "izracunaj") return "";
  const st = stanjeSmjese(s);
  return trazeni(s)
    .map(
      (t) =>
        `${oznakaTrazenog(t)} = ${zapisTrazenog(s, t, vrijednostTrazenog(st, t))}`,
    )
    .join("; ");
}

// Raspon klizača (istraživanje) za plin: zadani ili [0, 2n].
export function rasponPlina(s, formula) {
  const kljuc = Object.keys(s.raspon ?? {}).find((f) =>
    istaFormula(f, formula),
  );
  if (kljuc) return s.raspon[kljuc];
  const g = (s.smjesa?.plinovi ?? []).find((h) =>
    istaFormula(h.formula, formula),
  );
  return [0, (g?.n ?? 1) * 2];
}
export const kontroleSmjese = (s) =>
  s.nacin === "istrazi"
    ? (s.kontrole ?? (s.smjesa?.plinovi ?? []).map((g) => g.formula)).map((f) =>
        formulaZapis(f),
      )
    : [];

// zapis zadanog broja kako ga piše tekst („0,0501“, „75,00 %“), inače tri značajne znamenke
export function zapisZadanog(g, q) {
  const z = g?.zapis;
  if (isText(z)) return z;
  if (q === "x") return formatNumber(Number(g[q].toPrecision(3)));
  return formatSci(g[q]);
}
const brojIzZapisa = (z) => {
  const t = String(z).trim();
  const post = /%$/.test(t);
  const n = parseNumber(t.replace(/%$/, "").trim());
  return n == null ? null : post ? n / 100 : n;
};
const istiBroj = (a, b) =>
  isNum(a) &&
  isNum(b) &&
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

export function validateSmjesa(s) {
  const { list, need } = problems();
  need(
    NACINI.includes(s.nacin),
    `plin_posuda sa smjesom: nacin mora biti jedan od: ${NACINI.join(", ")}`,
  );
  need(isText(s.tekst), "plin_posuda treba „tekst“");
  for (const f of [
    "posude",
    "promjena",
    "pitaj",
    "faktor",
    "pitanje",
    "manja",
    "prikazi",
  ])
    need(
      !(f in s),
      `polje „${f}“ ne postoji uz smjesu (smjesa je zaseban način)`,
    );
  const j = s.jedinice ?? {};
  need(
    j.p == null || j.p in P_SMJESA,
    `jedinice.p mora biti jedna od: ${Object.keys(P_SMJESA).join(", ")}`,
  );
  need(
    j.V == null || j.V in V_JEDINICE,
    `jedinice.V mora biti jedna od: ${Object.keys(V_JEDINICE).join(", ")}`,
  );
  if (s.jedinice != null)
    need(
      typeof s.jedinice === "object" &&
        Object.keys(s.jedinice).every((q) => ["p", "V"].includes(q)),
      "jedinice smije imati samo p i V",
    );
  if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
  if (s.operacije != null)
    need(
      typeof s.operacije === "boolean",
      "operacije mora biti true ili false",
    );
  const sm = s.smjesa;
  if (
    !need(
      sm && typeof sm === "object" && !Array.isArray(sm),
      "smjesa mora biti objekt {plinovi, V?, T? ili t?, p?, zapis?}",
    )
  )
    return list;
  need(
    Object.keys(sm).every((f) =>
      ["plinovi", "V", "T", "t", "p", "zapis"].includes(f),
    ),
    "smjesa smije imati samo plinovi, V, T, t, p i zapis",
  );
  const pl = sm.plinovi;
  if (
    !need(
      Array.isArray(pl) && pl.length >= 2 && pl.length <= MAX_PLINOVA,
      `smjesa.plinovi: popis od 2 do ${MAX_PLINOVA} plina`,
    )
  )
    return list;
  pl.forEach((g, i) => {
    const w = `smjesa.plinovi[${i}]`;
    if (
      !need(
        g && typeof g === "object",
        `${w} mora biti objekt {formula, n | m | x | p}`,
      )
    )
      return;
    need(
      isText(g.formula) && molarnaMasa(g.formula) != null,
      `${w}.formula („${g.formula}“) nije formula koja se može pročitati (npr. "N₂", "C₃H₆")`,
    );
    if (g.naziv != null) need(isText(g.naziv), `${w}.naziv mora biti tekst`);
    need(
      Object.keys(g).every((f) =>
        ["formula", "naziv", "zapis", ...KOLICINE].includes(f),
      ),
      `${w} smije imati samo formula, naziv, zapis i jedno od n, m, x, p`,
    );
    const zadane = KOLICINE.filter((q) => q in g);
    need(zadane.length <= 1, `${w}: zadaj samo jedno od n, m, x, p`);
    for (const q of zadane) {
      if (q === "x")
        need(
          isNum(g.x) && g.x > 0 && g.x < 1,
          `${w}.x (množinski udio) mora biti između 0 i 1`,
        );
      else if (s.nacin === "istrazi" && q === "n")
        need(isNum(g.n) && g.n >= 0, `${w}.n (mol) mora biti broj ≥ 0`);
      else need(isNum(g[q]) && g[q] > 0, `${w}.${q} mora biti pozitivan broj`);
    }
    if (g.zapis != null)
      need(
        isText(g.zapis) &&
          zadane.length === 1 &&
          istiBroj(brojIzZapisa(g.zapis), g[zadane[0]]),
        `${w}.zapis („${g.zapis}“) mora biti isti broj kao ${zadane[0] ?? "zadana količina"} (decimalni zarez; za x smije „75,00 %“)`,
      );
  });
  if (list.length) return list;
  need(
    new Set(pl.map((g) => formulaZapis(g.formula))).size === pl.length,
    "svaki plin u smjesi smije biti samo jednom",
  );
  for (const q of ["V", "T", "t", "p"])
    if (q in sm)
      need(
        isNum(sm[q]) && (q === "t" ? sm[q] > -273 : sm[q] > 0),
        `smjesa.${q} mora biti ${q === "t" ? "temperatura u °C iznad −273" : "pozitivan broj"}`,
      );
  need(
    !("T" in sm && "t" in sm),
    "zadaj temperaturu samo jednom: T (K) ili t (°C)",
  );
  if (sm.zapis != null) {
    if (
      need(
        typeof sm.zapis === "object" &&
          Object.keys(sm.zapis).every(
            (q) => q in sm && ["V", "T", "t", "p"].includes(q),
          ),
        "smjesa.zapis: {V?, T?, t?, p?} samo za zadane veličine",
      )
    )
      for (const [q, z] of Object.entries(sm.zapis))
        need(
          isText(z) && istiBroj(brojIzZapisa(z), sm[q]),
          `smjesa.zapis.${q} („${z}“) mora biti isti broj kao smjesa.${q}`,
        );
  }
  if (list.length) return list;
  const nepoznati = pl.filter((g) => zadanoOd(g) == null);
  const vrste = [
    ...new Set(pl.map((g) => vrstaOd(zadanoOd(g))).filter(Boolean)),
  ];
  need(
    vrste.length === 1,
    "svi zadani plinovi moraju biti zadani istom vrstom podatka: n ili m (množina ili masa), x (udio) ili p (parcijalni tlak)",
  );
  const imaVT = isNum(sm.V) && (isNum(sm.T) || isNum(sm.t));
  need(
    !("V" in sm) || isNum(sm.T) || isNum(sm.t),
    "uz V zadaj i temperaturu (T ili t), inače V ne služi ničemu",
  );
  if (list.length) return list;

  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    need(
      !("trazi" in s),
      "istrazi nema polje „trazi“ (račun ide u zaseban korak „izracunaj“)",
    );
    need(
      pl.every((g) => zadanoOd(g) === "n"),
      "u istrazi svaki plin treba n (mol); učenik ga mijenja ventilom",
    );
    need(
      imaVT,
      "istrazi treba V i temperaturu (T ili t): boca je čvrsta, V i T su stalni",
    );
    need(
      !("p" in sm),
      "u istrazi se ukupni tlak ne zadaje: računa ga widget iz pV = nRT",
    );
    if (list.length) return list;
    need(
      zbroj(pl.map((g) => g.n)) > 0,
      "barem jedan plin mora na početku biti u boci (n > 0)",
    );
    const k = s.kontrole;
    if (k != null)
      need(
        Array.isArray(k) &&
          k.length >= 1 &&
          new Set(k.map((f) => formulaZapis(f))).size === k.length &&
          k.every((f) => pl.some((g) => istaFormula(g.formula, f))),
        "kontrole: popis formula plinova iz smjese kojima učenik mijenja množinu ventilom",
      );
    const kontrolirani = k ?? pl.map((g) => g.formula);
    if (
      s.raspon != null &&
      need(typeof s.raspon === "object", "raspon: {formula: [od, do]}")
    )
      for (const [f, r] of Object.entries(s.raspon)) {
        const g = pl.find((h) => istaFormula(h.formula, f));
        if (
          !need(
            g && kontrolirani.some((x) => istaFormula(x, f)),
            `raspon.${f}: nema tog plina među kontrolama`,
          )
        )
          continue;
        if (
          need(
            Array.isArray(r) &&
              r.length === 2 &&
              r.every(isNum) &&
              r[0] >= 0 &&
              r[1] > r[0],
            `raspon.${f} mora biti [od, do] uz 0 ≤ od < do`,
          )
        )
          need(
            g.n >= r[0] && g.n <= r[1],
            `početni n(${f}) mora biti unutar raspon.${f}`,
          );
      }
    for (const f of kontrolirani) {
      const g = pl.find((h) => istaFormula(h.formula, f));
      if (g && g.n === 0)
        need(
          Object.keys(s.raspon ?? {}).some((x) => istaFormula(x, f)),
          `plin ${f} počinje s n = 0, pa mu zadaj raspon (npr. [0, 0.2])`,
        );
    }
    return list;
  }

  // izracunaj
  need(
    !("kontrole" in s) && !("raspon" in s),
    "kontrole i raspon su samo za istrazi",
  );
  need(
    nepoznati.length <= 1,
    "najviše jedan plin smije biti bez podatka (njegov dio izračuna se iz ukupnog)",
  );
  if (s.tolerancija_posto != null)
    need(
      isNum(s.tolerancija_posto) &&
        s.tolerancija_posto > 0 &&
        s.tolerancija_posto <= 10,
      "tolerancija_posto mora biti broj između 0 i 10",
    );
  if (list.length) return list;
  const vrsta = vrste[0];
  if (vrsta === "x") {
    const zx = zbroj(pl.filter((g) => isNum(g.x)).map((g) => g.x));
    if (nepoznati.length)
      need(
        zx < 1 - 1e-9,
        "zbroj zadanih množinskih udjela mora biti manji od 1 (ostatak je plin bez podatka)",
      );
    else
      need(
        Math.abs(zx - 1) <= 0.005,
        `zbroj množinskih udjela mora biti 1 (sada ${formatNumber(zx)})`,
      );
  }
  if (vrsta === "n" && nepoznati.length)
    need(
      isNum(sm.p) && imaVT,
      "plin bez podatka uz množine traži ukupni tlak p, V i temperaturu (n = pV : RT)",
    );
  if (vrsta === "p") {
    need(
      nepoznati.length === 0 || isNum(sm.p),
      "plin bez podatka uz parcijalne tlakove traži ukupni tlak p",
    );
    if (!nepoznati.length && isNum(sm.p))
      need(
        Math.abs(zbroj(pl.map((g) => g.p)) - sm.p) <= 0.01 * sm.p,
        "zbroj parcijalnih tlakova mora biti jednak zadanom ukupnom tlaku",
      );
  }
  if (list.length) return list;
  const st = stanjeSmjese(s);
  if (
    !need(
      st.plinovi.every((g) => isNum(g.x) && g.x > 0 && g.x < 1),
      "iz zadanih podataka ne može se odrediti sastav smjese (ostatku ispada udio ≤ 0); provjeri brojeve",
    )
  )
    return list;
  // ukupni tlak, V i T zadani zajedno uz množine: moraju se slagati s pV = nRT
  if (vrsta === "n" && !nepoznati.length && isNum(sm.p) && imaVT) {
    const izracunat = stanjeSmjese({ ...s, smjesa: { ...sm, p: undefined } }).p;
    need(
      Math.abs(izracunat - sm.p) <= 0.02 * sm.p,
      `zadani ukupni tlak (${formatNumber(sm.p)}) ne slaže se s pV = nRT (${formatSci(izracunat)} ${st.jedinice.p})`,
    );
  }
  const tr = s.trazi;
  if (
    !need(
      Array.isArray(tr)
        ? tr.length >= 1 && tr.length <= 3
        : tr && typeof tr === "object",
      "trazi: {velicina, plin?} ili popis od 1 do 3 takva koraka",
    )
  )
    return list;
  const koraci = trazeni(s);
  koraci.forEach((t, i) => {
    const w = koraci.length > 1 ? `trazi[${i}]` : "trazi";
    if (
      !need(
        t && TRAZI.includes(t.velicina),
        `${w}.velicina mora biti jedna od: ${TRAZI.join(", ")} (p bez plina = ukupni tlak; M ili Mr = smjese)`,
      )
    )
      return;
    need(
      Object.keys(t).every((f) => ["velicina", "plin"].includes(f)),
      `${w} smije imati samo velicina i plin`,
    );
    if (t.velicina === "x" || t.velicina === "n")
      need(t.plin != null, `${w}: za ${t.velicina} zadaj plin (formulu)`);
    if (t.velicina === "M" || t.velicina === "Mr")
      need(
        t.plin == null,
        `${w}: ${t.velicina} je molarna masa smjese, bez plina`,
      );
    if (
      t.plin != null &&
      !need(
        pl.some((g) => istaFormula(g.formula, t.plin)),
        `${w}.plin („${t.plin}“) nije u smjesi`,
      )
    )
      return;
    const g =
      t.plin != null ? pl.find((h) => istaFormula(h.formula, t.plin)) : null;
    const zadano = g ? zadanoOd(g) : null;
    if (g)
      need(
        zadano !== t.velicina,
        `${w}: ${t.velicina}(${t.plin}) je zadan, pa se ne traži`,
      );
    if (t.velicina === "p" && !g)
      need(
        !isNum(sm.p),
        `${w}: ukupni tlak je zadan (smjesa.p), pa se ne traži`,
      );
    need(
      isNum(vrijednostTrazenog(st, t)) && vrijednostTrazenog(st, t) > 0,
      `${w}: ${oznakaTrazenog(t)} ne može se izračunati iz zadanoga (za tlak treba ukupni tlak ili V i T, za n treba V i T)`,
    );
  });
  need(
    new Set(koraci.map((t) => oznakaTrazenog(t))).size === koraci.length,
    "isti korak u trazi ne smije se ponavljati",
  );
  if (
    s.krivo != null &&
    need(Array.isArray(s.krivo), "krivo mora biti popis")
  ) {
    s.krivo.forEach((k, i) => {
      need(
        isNum(k?.vrijednost) && isText(k?.poruka),
        `krivo[${i}] treba vrijednost (broj) i poruku`,
      );
      const kor = k?.korak ?? koraci.length - 1;
      if (
        !need(
          Number.isInteger(kor) && kor >= 0 && kor < koraci.length,
          `krivo[${i}].korak mora biti redni broj koraka iz trazi (od 0)`,
        )
      )
        return;
      const a = list.length ? null : vrijednostTrazenog(st, koraci[kor]);
      if (isNum(a) && isNum(k.vrijednost))
        need(
          !near(k.vrijednost, a, (Math.abs(a) * tolerancijaPosto(s)) / 100),
          `krivo[${i}].vrijednost je točan odgovor`,
        );
    });
  }
  return list;
}

export const OPIS_SMJESE = `
Smjesa plinova (kemija, Daltonov zakon; neobavezno, umjesto posude): čvrsta boca, stalni V i T, čestice svakog plina svojom bojom (legenda s formulama), broj čestica razmjeran množini; uz bocu stupac ukupnog tlaka podijeljen na parcijalne tlakove. R = 8,31 i T = t + 273 s lista „Kemija – tablice“, M iz Ar s lista.
smjesa: {plinovi: [{formula ("N₂", "C₃H₆"), naziv?, jedno od: n (mol) | m (g) | x (množinski udio, 0–1) | p (parcijalni tlak, u jedinice.p), zapis? („0,0501“, „75,00 %“)}] (2–4; najviše jedan bez podatka: njegov dio računa se iz ukupnog),
V?, T? (K) ili t? (°C), p? (ukupni tlak), zapis?: {V?, t?, T?, p?}}, jedinice?: {p: "kPa" (Pa | hPa | kPa | bar | MPa), V: "L"}, nacin:
- "istrazi" (nije zadatak): svaki plin s n (smije 0), V i T/t zadani, p se ne zadaje; kontrole?: popis formula (ventil za taj plin; zadano svi), raspon?: {formula: [od, do]} u mol (obavezno za plin koji počinje s n = 0).
  Učenik dodaje i ispušta plin i vidi da se mijenja samo njegov parcijalni tlak, a ukupni je zbroj;
- "izracunaj" (Tvoj red): trazi: {velicina: "p" (uz plin parcijalni, bez plina ukupni) | "x" | "n" | "M" | "Mr" (molarna / relativna molekulska masa smjese), plin?} ili popis od 1–3 koraka (npr. x pa p).
  Točne vrijednosti i tipične krive (ukupni umjesto parcijalnog, udio drugog plina, maseni umjesto množinskog udjela, °C umjesto K, L umjesto m³, Pa umjesto kPa, zaboravljen plin) računa aplikacija;
  krivo?: [{vrijednost, poruka, korak?}], tolerancija_posto? (zadano 1), operacije?: true (pravila uz polja i prije provjere). Prije provjere widget ne pokazuje izračunate udjele ni tlakove.`;

const PRIMJER_ISTRAZI = {
  tip: "plin_posuda",
  nacin: "istrazi",
  tekst:
    "U boci obujma 1,24 L pri 25 °C je 0,0501 mol propena. Otvori ventil i dodaj dušik (do 0,150 mol), pa ga opet ispusti. Gledaj parcijalni tlak svakog plina i ukupni tlak.",
  smjesa: {
    plinovi: [
      { formula: "C₃H₆", naziv: "propen", n: 0.0501, zapis: "0,0501" },
      { formula: "N₂", naziv: "dušik", n: 0 },
    ],
    V: 1.24,
    t: 25,
    zapis: { V: "1,24" },
  },
  jedinice: { p: "kPa", V: "L" },
  kontrole: ["N₂"],
  raspon: { "N₂": [0, 0.2] },
};

export const PRIMJERI_SMJESE = [
  PRIMJER_ISTRAZI,
  {
    tip: "plin_posuda",
    nacin: "izracunaj",
    tekst:
      "U boci obujma 1,24 L pri 25 °C nalazi se 0,0501 mol propena, \\(\\mathrm{C_3H_6}\\), i 0,150 mol dušika. Izračunaj parcijalni tlak svakog plina i ukupni tlak u boci.",
    smjesa: {
      plinovi: [
        { formula: "C₃H₆", naziv: "propen", n: 0.0501, zapis: "0,0501" },
        { formula: "N₂", naziv: "dušik", n: 0.15, zapis: "0,150" },
      ],
      V: 1.24,
      t: 25,
      zapis: { V: "1,24" },
    },
    jedinice: { p: "kPa", V: "L" },
    trazi: [
      { velicina: "p", plin: "C₃H₆" },
      { velicina: "p", plin: "N₂" },
      { velicina: "p" },
    ],
  },
  {
    tip: "plin_posuda",
    nacin: "izracunaj",
    tekst:
      "U bocu s 0,0501 mol propena dodano je 0,150 mol dušika, pa je ukupni tlak porastao na 400 kPa. Koliki je množinski udio propena i koliki je sada njegov parcijalni tlak?",
    smjesa: {
      plinovi: [
        { formula: "C₃H₆", naziv: "propen", n: 0.0501, zapis: "0,0501" },
        { formula: "N₂", naziv: "dušik", n: 0.15, zapis: "0,150" },
      ],
      p: 400,
    },
    jedinice: { p: "kPa" },
    trazi: [
      { velicina: "x", plin: "C₃H₆" },
      { velicina: "p", plin: "C₃H₆" },
    ],
  },
  {
    tip: "plin_posuda",
    nacin: "izracunaj",
    tekst:
      "U boci je 2,10 g propena, \\(\\mathrm{C_3H_6}\\), i 4,20 g dušika. Ukupni tlak u boci je 400 kPa. Izračunaj množinski udio propena i njegov parcijalni tlak.",
    smjesa: {
      plinovi: [
        { formula: "C₃H₆", naziv: "propen", m: 2.1, zapis: "2,10" },
        { formula: "N₂", naziv: "dušik", m: 4.2, zapis: "4,20" },
      ],
      p: 400,
    },
    jedinice: { p: "kPa" },
    trazi: [
      { velicina: "x", plin: "C₃H₆" },
      { velicina: "p", plin: "C₃H₆" },
    ],
  },
  {
    tip: "plin_posuda",
    nacin: "izracunaj",
    tekst:
      "Koliko iznosi parcijalni tlak kisika u plinskoj smjesi kisika i dušika ako je ukupni tlak plinske smjese 1200 hPa, a množinski udio dušika u smjesi 75,00\u00a0%?",
    smjesa: {
      plinovi: [
        { formula: "N₂", naziv: "dušik", x: 0.75, zapis: "75,00 %" },
        { formula: "O₂", naziv: "kisik" },
      ],
      p: 1200,
    },
    jedinice: { p: "hPa" },
    trazi: { velicina: "p", plin: "O₂" },
  },
  {
    tip: "plin_posuda",
    nacin: "izracunaj",
    tekst:
      "Zrak je smjesa plinova. Množinski udjeli u suhome zraku su: \\(x(\\mathrm{N_2}) = 0{,}78\\), \\(x(\\mathrm{O_2}) = 0{,}21\\), a ostali plinovi 0,01 (uzmi da je to samo argon). Izračunaj parcijalni tlak kisika pri tlaku \\(10^5\\) Pa i relativnu molekulsku masu suhoga zraka.",
    smjesa: {
      plinovi: [
        { formula: "N₂", naziv: "dušik", x: 0.78, zapis: "0,78" },
        { formula: "O₂", naziv: "kisik", x: 0.21, zapis: "0,21" },
        {
          formula: "Ar",
          naziv: "ostali plinovi (argon)",
          x: 0.01,
          zapis: "0,01",
        },
      ],
      p: 100000,
      zapis: { p: "10⁵" },
    },
    jedinice: { p: "Pa" },
    trazi: [{ velicina: "p", plin: "O₂" }, { velicina: "Mr" }],
  },
  {
    tip: "plin_posuda",
    nacin: "izracunaj",
    tekst:
      "U zatvorenoj posudi volumena 10 L nalazi se smjesa metana i ugljikova(IV) oksida. Ukupni tlak smjese je \\(8{,}31\\cdot10^{4}\\) Pa pri 27 °C. Kolika je množina ugljikova(IV) oksida ako je u smjesi 0,22 mol metana?",
    smjesa: {
      plinovi: [
        { formula: "CH₄", naziv: "metan", n: 0.22, zapis: "0,22" },
        { formula: "CO₂", naziv: "ugljikov(IV) oksid" },
      ],
      V: 10,
      t: 27,
      p: 83100,
      zapis: { p: "8,31·10⁴" },
    },
    jedinice: { p: "Pa", V: "L" },
    trazi: { velicina: "n", plin: "CO₂" },
    // ispitni odgovor 0,11 mol (0,22 ima dvije značajne znamenke); točno 0,113 mol
    tolerancija_posto: 3,
  },
];
