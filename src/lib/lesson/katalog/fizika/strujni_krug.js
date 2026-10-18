// strujni_krug: interaktivni istosmjerni krug (fizika, matura). Shema se crta sama iz stabla spoja; sve struje,
// naponi i snage računaju se u kodu (_krug.js), a tipične krive vrijednosti (zaboravljen unutarnji otpor,
// zamijenjen serijski i paralelni spoj, ε umjesto napona stezaljki…) dodaju se same iz istog stabla.
import { isNum, near } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
  withUnit,
} from "../zajednicko.js";
import {
  stablo,
  rijesi,
  pocetnoStanje,
  vrijednost,
  velicineOd,
  naziv,
  rasporedi,
  JEDINICA,
  POSEBNI,
  fmt,
  vrstaCvora,
  sirinaTeksta,
} from "./_krug.js";

const NACINI = ["istrazi", "izracunaj", "postavi", "odaberi"];
const VELICINE = ["I", "U", "P", "R"];
const ID = /^[A-Za-zČĆŽŠĐčćžšđ][A-Za-z0-9_ČĆŽŠĐčćžšđ]*$/;
const MAX_W = 470;
const MAX_H = 520;

// odaberi: [veličina, smjer (1 najveća, −1 najmanja), samo žarulje]
export const KRITERIJI = {
  najsjajnija: ["P", 1, true],
  najtamnija: ["P", -1, true],
  najveca_struja: ["I", 1],
  najmanja_struja: ["I", -1],
  najveci_napon: ["U", 1],
  najmanji_napon: ["U", -1],
  najveca_snaga: ["P", 1],
  najmanja_snaga: ["P", -1],
};
// odaberi: što se dogodi kad se sklopka prebaci (otvori ako je zatvorena, zatvori ako je otvorena)
export const PROMJENE = {
  ugase_se: "se ugase",
  upale_se: "se upale",
  jace: "svijetle jače",
  slabije: "svijetle slabije (ali i dalje svijetle)",
  ne_mijenja: "svijetle jednako kao prije",
};

const aligned = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-6;
const clean = (x) => Math.round(x * 1e9) / 1e9;

export const oznakaIzvora = (s) =>
  s.izvor?.oznaka ?? (s.izvor?.r != null ? "ε" : "U");
const rUnutra = (s) =>
  !!s.izvor &&
  (s.izvor.r > 0 || (s.klizaci ?? []).some((k) => k.element === "r"));

// ── tekst ─────────────────────────────────────────────────────────────────────────────────────────
// „struja kroz R₁“, „napon na unutarnjem otporu“…: isti opis u porukama, oznakama polja i točnom odgovoru
export function fraza(T, v, el) {
  const c = T.po[el];
  const g = c?.djeca ? (c.oznaka ?? c.id) : null;
  const ime = c ? naziv(c) : el;
  if (v === "I")
    return el === "izvor" || el === "ukupno" || el === "r"
      ? "struja iz izvora"
      : g
        ? `struja kroz skupinu ${g}`
        : `struja kroz ${ime}`;
  if (v === "U")
    return el === "izvor" || el === "ukupno"
      ? "napon stezaljki izvora"
      : el === "r"
        ? "napon na unutarnjem otporu"
        : g
          ? `napon na skupini ${g}`
          : `napon na ${ime}`;
  if (v === "P")
    return el === "izvor"
      ? "ukupna snaga izvora"
      : el === "ukupno"
        ? "snaga vanjskog dijela kruga"
        : el === "r"
          ? "snaga na unutarnjem otporu"
          : g
            ? `snaga na skupini ${g}`
            : `snaga na ${ime}`;
  return el === "izvor"
    ? "otpor cijelog kruga (s unutarnjim)"
    : el === "ukupno"
      ? "ukupni otpor"
      : el === "r"
        ? "unutarnji otpor"
        : g
          ? `otpor skupine ${g}`
          : `otpor ${ime}`;
}
const veliko = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const oznakaPitanja = (s, T, q) =>
  q.oznaka ?? `${veliko(fraza(T, q.velicina, q.element))} =`;

// koje veličine elementa se traže, a ne pokazuje ih mjerilo (na shemi dobivaju „P = ?“)
function pitanoNaShemi(s, c) {
  if (s.nacin !== "izracunaj" || !c.id) return [];
  const mj = s.mjerila ?? [];
  return (s.pitaj ?? [])
    .filter(
      (q) =>
        q.element === c.id &&
        !mj.some(
          (m) =>
            m.element === c.id &&
            ((m.vrsta === "A" && q.velicina === "I") ||
              (m.vrsta === "V" && q.velicina === "U")),
        ),
    )
    .map((q) => q.velicina);
}

// redovi oznake elementa uz trenutno stanje
export function linijeElementa(s, c, st) {
  const red = [naziv(c)];
  if (c.vrsta === "R") red.push(`${fmt(st.R?.[c.id] ?? c.R)} Ω`);
  if (c.vrsta === "Z") red.push(`${fmt(c.Unaz)} V, ${fmt(c.Pnaz)} W`);
  const q = pitanoNaShemi(s, c);
  if (q.length) red.push(q.map((v) => `${v} = ?`).join(", "));
  return red;
}
export function linijeIzvora(s, st) {
  const red = [`${oznakaIzvora(s)} = ${fmt(st.emf)} V`];
  if (rUnutra(s)) red.push(`r = ${fmt(st.r)} Ω`);
  return red;
}

// najšire oznake (klizači na krajevima), da se raspored ne trese dok učenik vuče klizač
const kraj = (s, el, k) =>
  k === 0
    ? s.klizaci.find((x) => x.element === el)?.min
    : s.klizaci.find((x) => x.element === el)?.max;
const sire = (a, b) =>
  Math.max(...a.map(sirinaTeksta)) >= Math.max(...b.map(sirinaTeksta)) ? a : b;
export function oznakeZaRaspored(s) {
  const st = pocetnoStanje(s);
  const ima = (el) => (s.klizaci ?? []).some((k) => k.element === el);
  return {
    linije: (c) => {
      const a = linijeElementa(s, c, st);
      if (c.vrsta !== "R" || !ima(c.id)) return a;
      return [0, 1]
        .map((k) =>
          linijeElementa(s, c, { ...st, R: { [c.id]: kraj(s, c.id, k) } }),
        )
        .reduce(sire, a);
    },
    oznakaIzvora: () => {
      let a = linijeIzvora(s, st);
      for (const k of [0, 1])
        a = sire(
          a,
          linijeIzvora(s, {
            ...st,
            emf: ima("izvor") ? kraj(s, "izvor", k) : st.emf,
            r: ima("r") ? kraj(s, "r", k) : st.r,
          }),
        );
      return a;
    },
  };
}

// ── stanje iz odgovora (postavi) ──────────────────────────────────────────────────────────────────
export function grupaIzbora(s, T) {
  if (s.spoj_izbor === true) return T.korijen.djeca ? T.korijen : null;
  const c = typeof s.spoj_izbor === "string" ? T.po[s.spoj_izbor] : null;
  return c?.djeca ? c : null;
}
export function postaviVrijednost(st, el, v) {
  if (el === "izvor") st.emf = v;
  else if (el === "r") st.r = v;
  else st.R = { ...st.R, [el]: v };
}
export function pocetnaVrijednost(s, T, el) {
  if (el === "izvor") return s.izvor?.emf;
  if (el === "r") return s.izvor?.r ?? 0;
  return T.po[el]?.R;
}
// odgovor postavi: {klizaci: {element: vrijednost}, spoj: "ser" | "par" | null}
export function stanjeIz(s, T, odg) {
  const st = pocetnoStanje(s);
  for (const k of s.klizaci ?? []) {
    const v = odg?.klizaci?.[k.element];
    if (isNum(v)) postaviVrijednost(st, k.element, v);
  }
  const g = grupaIzbora(s, T);
  if (g && (odg?.spoj === "ser" || odg?.spoj === "par"))
    st.spoj = { [g.key]: odg.spoj };
  return st;
}
const tolCilja = (s) =>
  isNum(s.cilj.tolerancija)
    ? s.cilj.tolerancija
    : Math.max(1e-9, Math.abs(s.cilj.vrijednost) * 0.01);
const ciljU = (s, T, odg) =>
  vrijednost(
    rijesi(s, stanjeIz(s, T, odg), T),
    s.cilj.velicina,
    s.cilj.element,
  );
const pogodak = (s, T, odg) => {
  const v = ciljU(s, T, odg);
  return isNum(v) && near(v, s.cilj.vrijednost, tolCilja(s));
};
const mreza = (k) =>
  Array.from({ length: Math.round((k.max - k.min) / k.korak) + 1 }, (_, i) =>
    clean(k.min + i * k.korak),
  );

// svi položaji klizača (i oba spoja): rješenja, najbliži položaj, postoji li ijedan krivi
export function pretrazi(s, T, samoSpoj) {
  const ks = s.klizaci ?? [];
  const g = grupaIzbora(s, T);
  const spojevi = samoSpoj
    ? [samoSpoj]
    : g
      ? [g.vrsta, g.vrsta === "ser" ? "par" : "ser"]
      : [null];
  let kombinacije = [{}];
  for (const k of ks)
    kombinacije = kombinacije.flatMap((o) =>
      mreza(k).map((v) => ({ ...o, [k.element]: v })),
    );
  const rjesenja = [];
  let najblize = null;
  let imaKrivih = false;
  for (const spoj of spojevi) {
    for (const klizaci of kombinacije) {
      const odg = { klizaci, spoj };
      const v = ciljU(s, T, odg);
      if (!isNum(v)) {
        imaKrivih = true;
        continue;
      }
      const d = Math.abs(v - s.cilj.vrijednost);
      if (d <= tolCilja(s) + 1e-12) rjesenja.push({ odg, v, d });
      else imaKrivih = true;
      if (!najblize || d < najblize.d) najblize = { odg, v, d };
    }
  }
  rjesenja.sort((a, b) => a.d - b.d);
  return { rjesenja, najblize, imaKrivih };
}

// početak za postavi: vrijednosti iz speca, ali nikad već točan (inače bi „Provjeri“ bez pomicanja prošao)
export function pocetakPostavi(s, T) {
  const ks = s.klizaci ?? [];
  const g = grupaIzbora(s, T);
  const osnova = {
    klizaci: Object.fromEntries(
      ks.map((k) => [k.element, pocetnaVrijednost(s, T, k.element)]),
    ),
    spoj: g ? g.vrsta : null,
  };
  const probe = [osnova];
  for (const k of ks)
    for (const v of [k.min, k.max])
      probe.push({ ...osnova, klizaci: { ...osnova.klizaci, [k.element]: v } });
  if (g)
    probe.push(
      ...probe.map((p) => ({ ...p, spoj: g.vrsta === "ser" ? "par" : "ser" })),
    );
  return probe.find((p) => !pogodak(s, T, p)) ?? osnova;
}

export function nazivKlizaca(s, T, k) {
  if (k.oznaka) return k.oznaka;
  if (k.element === "izvor") return oznakaIzvora(s);
  if (k.element === "r") return "r";
  return naziv(T.po[k.element] ?? { id: k.element });
}
export const jedinicaKlizaca = (k) => (k.element === "izvor" ? "V" : "Ω");

// ── odaberi ───────────────────────────────────────────────────────────────────────────────────────
export function kandidati(s, T) {
  if (Array.isArray(s.odaberi?.medju)) return s.odaberi.medju;
  const zarulje = T.listovi.filter((c) => c.vrsta === "Z").map((c) => c.id);
  const k = s.odaberi?.kriterij;
  if (zarulje.length && (KRITERIJI[k]?.[2] || k in PROMJENE)) return zarulje;
  return T.listovi
    .filter((c) => c.vrsta === "R" || c.vrsta === "Z")
    .map((c) => c.id);
}
export function stanjePoslije(s, T) {
  const st = pocetnoStanje(s);
  const c = T.po[s.odaberi?.sklopka];
  if (c?.vrsta === "S") st.sklopke = { [c.id]: !c.zatvorena };
  return st;
}
const snage = (s, T, st, ids) => {
  const rez = rijesi(s, st, T);
  return ids.map((id) => vrijednost(rez, "P", id));
};
function promjena(pb, pa, skala) {
  const off = (p) => p <= 1e-9 * skala;
  if (off(pb) && off(pa)) return "ne_svijetli";
  if (!off(pb) && off(pa)) return "ugase_se";
  if (off(pb)) return "upale_se";
  if (pa > pb * 1.01) return "jace";
  if (pa < pb * 0.99) return "slabije";
  return "ne_mijenja";
}
// točni odabir (popis id-jeva) i za svaki kandidat vrijednost ili promjena
export function rjesenjeOdaberi(s, T) {
  const ids = kandidati(s, T);
  const k = s.odaberi.kriterij;
  if (k in PROMJENE) {
    const pb = snage(s, T, pocetnoStanje(s), ids);
    const pa = snage(s, T, stanjePoslije(s, T), ids);
    const skala = Math.max(1e-12, ...pb, ...pa);
    const opis = ids.map((id, i) => promjena(pb[i], pa[i], skala));
    return { ids, tocni: ids.filter((id, i) => opis[i] === k), opis, pb, pa };
  }
  const [vel, smjer] = KRITERIJI[k];
  const rez = rijesi(s, pocetnoStanje(s), T);
  const vr = ids.map((id) => vrijednost(rez, vel, id));
  const naj = smjer > 0 ? Math.max(...vr) : Math.min(...vr);
  const skala = Math.max(1e-12, ...vr.map(Math.abs));
  const tocni = ids.filter((id, i) => Math.abs(vr[i] - naj) <= 0.01 * skala);
  return { ids, tocni, vr, vel };
}
const OPIS_PROMJENE = {
  ugase_se: "se ugasi",
  upale_se: "se upali",
  jace: "svijetli jače",
  slabije: "svijetli slabije",
  ne_mijenja: "svijetli jednako",
  ne_svijetli: "ne svijetli ni prije ni poslije",
};

// ── automatske krive vrijednosti (izracunaj) ──────────────────────────────────────────────────────
const PAR_KAO_SER =
  "Paralelno spojene otpore zbrojio si kao da su u nizu. U paralelnom spoju zbrajaju se recipročne vrijednosti: $\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2}$.";
const SER_KAO_PAR =
  "Serijski spojene otpore računao si kao paralelne. U serijskom spoju otpori se jednostavno zbrajaju: $R = R_1 + R_2$.";

function uParalelnoj(c) {
  for (let p = c?.roditelj; p; p = p.roditelj)
    if (p.vrsta === "par" && p.djeca.length > 1) return true;
  return false;
}

export function autoKrivo(s, T, q) {
  const st0 = pocetnoStanje(s);
  const rez = rijesi(s, st0, T);
  const { velicina: v, element: el } = q;
  const tocno = vrijednost(rez, v, el);
  const out = [];
  const tol = Math.max(1e-9, Math.abs(tocno) * 0.01);
  const add = (x, poruka) => {
    if (
      !isNum(x) ||
      near(x, tocno, tol) ||
      out.some((k) => near(k.vrijednost, x, Math.abs(x) * 0.005 + 1e-12))
    )
      return;
    out.push({ vrijednost: x, poruka });
  };
  const c = T.po[el];
  const list = c && !c.djeca ? c : null;
  const ime = c ? naziv(c) : "";
  const oz = oznakaIzvora(s);
  const emf = st0.emf;
  const ostatak = () => {
    const unutra = st0.r > 0;
    // napon elementa manji od napona stezaljki: dio pada i na drugim elementima u nizu
    const drugi = rez.po[c.key].U < rez.Ut * (1 - 1e-9);
    return unutra && drugi
      ? "unutarnjem otporu i ostalim otpornicima"
      : unutra
        ? "unutarnjem otporu izvora"
        : "ostalim otpornicima";
  };
  const Rel = c ? rez.po[c.key].R : null;

  // žarulja: nazivne vrijednosti umjesto stvarnih
  if (list?.vrsta === "Z") {
    const st = rez.po[c.key];
    if (v === "P") {
      add(
        c.Pnaz,
        `To je nazivna snaga, ona koja piše na žarulji. Žarulja je daje samo kad je na njoj ${withUnit(c.Unaz, "V")}, a ovdje je na njoj ${withUnit(st.U, "V")}.`,
      );
      add(
        c.Pnaz * (st.U / c.Unaz),
        "Snaga ne pada razmjerno naponu: kad se smanji napon, smanji se i struja. Zato $P = \\frac{U^2}{R}$, s otporom žarulje $R = \\frac{U_{naz}^2}{P_{naz}}$.",
      );
    }
    if (v === "I")
      add(
        c.Pnaz / c.Unaz,
        `To je nazivna struja (kad je na žarulji ${withUnit(c.Unaz, "V")}). Ovdje je na žarulji ${withUnit(st.U, "V")}, pa je i struja drukčija.`,
      );
    if (v === "U")
      add(
        c.Unaz,
        "To je nazivni napon, onaj koji piše na žarulji. Stvarni napon na žarulji ovisi o spoju.",
      );
  }
  // ε umjesto napona na dijelu kruga
  if (s.izvor && list && isNum(Rel) && Rel > 0 && Rel < Infinity) {
    if (v === "I")
      add(
        emf / Rel,
        `Podijelio si cijeli napon izvora s otporom ${ime}. Na ${ime} nije cijeli napon izvora: dio padne na ${ostatak()}. Najprije nađi napon na ${ime}.`,
      );
    if (v === "U")
      add(
        emf,
        `To je napon cijelog izvora. Na ${ime} padne samo dio, a ostatak na ${ostatak()}.`,
      );
    if (v === "P")
      add(
        (emf * emf) / Rel,
        `Računao si snagu s punim naponom izvora. Na ${ime} je samo dio napona, pa je i snaga manja.`,
      );
  }
  if (s.izvor && (el === "izvor" || el === "ukupno") && v === "U" && st0.r > 0)
    add(
      emf,
      `To je elektromotorni napon ${oz}. Napon stezaljki manji je za pad napona na unutarnjem otporu: $U = ${oz === "ε" ? "\\varepsilon" : oz} - I r$.`,
    );
  // struja izvora umjesto struje grane i obrnuto
  if (v === "I" && c && uParalelnoj(c))
    add(
      rez.I,
      `To je struja iz izvora. U čvoru se ona grana, pa kroz ${ime} teče samo dio. Nađi napon na ${ime}, pa $I = \\frac{U}{R}$.`,
    );
  if (v === "P" && list && uParalelnoj(c))
    add(
      rez.po[c.key].U * rez.I,
      `Pomnožio si napon sa strujom iz izvora. Za snagu na ${ime} treba struja baš kroz ${ime}.`,
    );
  if (v === "I" && (el === "izvor" || el === "ukupno"))
    for (const l of T.listovi)
      if (l.vrsta !== "S")
        add(
          rez.po[l.key].I,
          `To je struja samo kroz ${naziv(l)}. Iz izvora izlazi zbroj struja svih grana.`,
        );
  // R: zaboravljeno prevrtanje 1/R
  if (v === "R") {
    const g = el === "ukupno" ? T.korijen : c;
    if (g?.djeca && g.vrsta === "par")
      add(
        g.djeca.reduce((x, d) => x + 1 / rez.po[d.key].R, 0),
        "To je $\\frac{1}{R}$, a ne $R$. Na kraju razlomak treba prevrnuti.",
      );
  }
  // zaboravljen unutarnji otpor
  if (s.izvor && st0.r > 0 && el !== "r")
    add(
      vrijednost(rijesi(s, { ...st0, r: 0 }, T), v, el),
      `Zaboravio si unutarnji otpor izvora. Struja u krugu je $I = \\frac{${oz === "ε" ? "\\varepsilon" : oz}}{R + r}$: i $r$ je u nazivniku.`,
    );
  // zamijenjen serijski i paralelni spoj
  for (const g of T.grupe) {
    if (g.djeca.length < 2) continue;
    add(
      vrijednost(
        rijesi(
          s,
          { ...st0, spoj: { [g.key]: g.vrsta === "ser" ? "par" : "ser" } },
          T,
        ),
        v,
        el,
      ),
      g.vrsta === "par" ? PAR_KAO_SER : SER_KAO_PAR,
    );
  }
  // ista veličina na drugom elementu (zamijenjene grane, napon stezaljki umjesto pada na r…)
  const drugi = [
    ...T.listovi
      .filter((l) => l.vrsta !== "S" || v === "I" || v === "U")
      .map((l) => l.id),
    ...T.grupe.filter((g) => g.id).map((g) => g.id),
    ...(s.izvor ? ["ukupno"] : []),
    ...(st0.r > 0 ? ["r"] : []),
  ];
  for (const d of drugi)
    if (d !== el)
      add(
        vrijednost(rez, v, d),
        `To je ${fraza(T, v, d)}, a traži se ${fraza(T, v, el)}.`,
      );
  return out;
}

const SAVJET = {
  I: "Nije točno. Kreni od ukupnog otpora kruga, izračunaj struju iz izvora, pa pogledaj kako se dijeli.",
  U: "Nije točno. Napon na dijelu kruga je $U = I R$, sa strujom i otporom baš tog dijela.",
  P: "Nije točno. Snaga je $P = U I$, s naponom i strujom baš tog elementa.",
  R: "Nije točno. Serijski se otpori zbrajaju, a u paralelnom spoju zbrajaju se recipročne vrijednosti.",
};
const tolPitanja = (q, a) =>
  isNum(q.tolerancija) ? q.tolerancija : Math.max(1e-9, Math.abs(a) * 0.01);

// ── validacija ────────────────────────────────────────────────────────────────────────────────────
function provjeriStablo(spoj, need) {
  const ids = new Set();
  let listova = 0;
  let ok = true;
  const ne = (uvjet, poruka) => {
    if (!need(uvjet, poruka)) ok = false;
    return uvjet;
  };
  const walk = (n, put, dubina) => {
    const v = vrstaCvora(n);
    if (
      !ne(
        v,
        `${put}: element mora imati točno jedno od polja R, zarulja, sklopka, serijski ili paralelno`,
      )
    )
      return;
    if (
      n.id != null &&
      ne(
        typeof n.id === "string" && ID.test(n.id),
        `${put}.id mora biti kratko ime od slova i brojki (npr. "R1")`,
      )
    ) {
      ne(
        !POSEBNI.includes(n.id),
        `${put}.id „${n.id}“ je rezerviran (izvor, r, ukupno)`,
      );
      ne(!ids.has(n.id), `id „${n.id}“ se ponavlja`);
      ids.add(n.id);
    }
    if (n.oznaka != null)
      ne(
        isText(n.oznaka) && n.oznaka.length <= 10,
        `${put}.oznaka mora biti kratak tekst (najviše 10 znakova, npr. "Ž₁")`,
      );
    if (v === "ser" || v === "par") {
      const polje = v === "ser" ? "serijski" : "paralelno";
      const arr = n[polje];
      if (
        !ne(
          Array.isArray(arr) && arr.length >= 1,
          `${put}.${polje} mora biti neprazan popis`,
        )
      )
        return;
      ne(
        dubina < 3,
        `${put}: spoj je preduboko ugniježđen (najviše 3 razine skupina)`,
      );
      if (dubina > 0)
        ne(arr.length >= 2, `${put}: skupina unutar spoja treba barem 2 člana`);
      if (v === "par") ne(arr.length <= 4, `${put}: najviše 4 paralelne grane`);
      else ne(arr.length <= 5, `${put}: najviše 5 elemenata u nizu`);
      arr.forEach((d, i) => walk(d, `${put}.${polje}[${i}]`, dubina + 1));
      return;
    }
    listova++;
    ne(n.id != null, `${put}: svaki element treba id (npr. "R1", "Z1", "S1")`);
    if (v === "R")
      ne(
        isNum(n.R) && n.R > 0 && n.R <= 1e6,
        `${put}.R mora biti otpor u Ω (0 < R ≤ 10⁶)`,
      );
    if (v === "Z")
      ne(
        isNum(n.zarulja?.U) &&
          n.zarulja.U > 0 &&
          n.zarulja.U <= 1e4 &&
          isNum(n.zarulja?.P) &&
          n.zarulja.P > 0 &&
          n.zarulja.P <= 1e5,
        `${put}.zarulja treba nazivni napon U (V) i nazivnu snagu P (W), oba pozitivna`,
      );
    if (v === "S")
      ne(
        ["otvorena", "zatvorena"].includes(n.sklopka),
        `${put}.sklopka mora biti "otvorena" ili "zatvorena"`,
      );
  };
  walk(spoj, "spoj", 0);
  if (ok)
    ne(
      listova <= 8,
      `spoj ima ${listova} elemenata; najviše 8 stane na mobitel`,
    );
  return ok;
}

function refOk(s, T, el) {
  if (typeof el !== "string") return false;
  if (el === "ukupno") return true;
  if (el === "izvor") return !!s.izvor;
  if (el === "r") return !!s.izvor && s.izvor.r != null;
  return !!T.po[el];
}
const REF_OPIS = `id elementa ili skupine, "izvor", "ukupno" ili "r"`;

function provjeriVelicinu(s, T, q, at, need) {
  const ok1 = need(
    VELICINE.includes(q?.velicina),
    `${at}.velicina mora biti I, U, P ili R`,
  );
  const ok2 = need(
    refOk(s, T, q?.element),
    `${at}.element mora biti ${REF_OPIS}`,
  );
  if (!ok1 || !ok2) return false;
  if (!s.izvor)
    return need(
      q.velicina === "R",
      `${at}: bez izvora se može pitati samo otpor (R)`,
    );
  const c = T.po[q.element];
  if (c?.vrsta === "S")
    return need(
      q.velicina === "I" || q.velicina === "U",
      `${at}: za sklopku ima smisla samo struja ili napon`,
    );
  return true;
}

// sva stanja koja učenik može vidjeti: sklopke (u istraživanju sve kombinacije) × spoj
function svaStanja(s, T) {
  const st0 = pocetnoStanje(s);
  const rk = (s.klizaci ?? []).find((k) => k.element === "r");
  if (rk) st0.r = rk.min;
  let stanja = [st0];
  if (s.nacin === "istrazi")
    for (const c of T.listovi.filter((l) => l.vrsta === "S"))
      stanja = stanja.flatMap((st) =>
        [true, false].map((z) => ({
          ...st,
          sklopke: { ...st.sklopke, [c.id]: z },
        })),
      );
  if (s.nacin === "odaberi" && T.po[s.odaberi?.sklopka]?.vrsta === "S")
    stanja.push({ ...st0, sklopke: stanjePoslije(s, T).sklopke });
  const g = grupaIzbora(s, T);
  if (g)
    stanja = stanja.flatMap((st) =>
      ["ser", "par"].map((v) => ({ ...st, spoj: { [g.key]: v } })),
    );
  return stanja;
}

export const strujni_krug = {
  tip: "strujni_krug",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Istosmjerni strujni krug: shema se crta sama iz stabla spoja, a sve struje, napone i snage računa aplikacija. Struja teče kao točkice (brže kad je veća), žarulje svijetle razmjerno snazi, mjerila pokazuju žive vrijednosti.
Polja: tekst, nacin, izvor?: {emf (V), r? (unutarnji otpor u Ω; tada se izvor crta u isprekidanoj kutiji), oznaka? ("ε" | "U")} (bez izvora shema ima samo stezaljke i pita se samo otpor),
spoj: stablo od elemenata {id, R} (otpornik), {id, zarulja: {U, P}} (nazivni napon i snaga; R = U²/P), {id, sklopka: "otvorena" | "zatvorena"} i skupina {id?, serijski: [...]} | {id?, paralelno: [...]}
(najviše 8 elemenata, 4 grane, 3 razine; svaki element može imati oznaka, npr. "Ž₁"; inače se "R1" piše R₁),
mjerila?: [{vrsta: "A" | "V", element}] (najviše 5; element = id elementa ili skupine, "izvor" (struja izvora / napon stezaljki), "ukupno" (isto, vanjski dio) ili "r" (samo V: pad napona na unutarnjem otporu)).
Veličine (velicina + element): I, U, P, R za element, skupinu, "ukupno" (vanjski dio kruga; R = ukupni otpor), "izvor" (P = εI, R = R + r) ili "r".
nacin:
- "istrazi": korak za gledanje: dodir na sklopku je otvara/zatvara; klizaci?: [{element (id otpornika, "izvor" za ε ili "r"), min, max, korak, oznaka?}] (1–2; početak je vrijednost iz speca);
  spoj_izbor?: true (cijeli spoj) ili id skupine – gumb serijski ⇄ paralelno; presjek?: true – crtkani presjek žice s brojačem naboja q = It i broja elektrona; podaci?: [{velicina, element, oznaka?}] (najviše 3 živa iznosa ispod sheme);
- "izracunaj": pitaj: [{velicina, element, oznaka? (npr. "$I_1 =$"), tolerancija?, krivo?}] (1–3 polja). Mjerila tražene veličine pokazuju „?“. Točno računa aplikacija (1 %), a krive vrijednosti
  (zaboravljen r, zamijenjen serijski/paralelni spoj, ε umjesto napona na dijelu, struja izvora umjesto grane, 1/R, nazivna snaga žarulje, vrijednost drugog elementa) dodaju se same;
- "postavi": učenik klizačem (i po želji spoj_izbor) dovede veličinu na cilj: cilj: {velicina, element, vrijednost, tolerancija? (zadano 1 %), skriveno? (true: živi iznos se ne vidi do provjere)}, klizaci, podaci?;
- "odaberi": učenik dodirne element: odaberi: {kriterij, medju? (id-jevi; zadano žarulje ili svi otpornici)}. kriterij: ${Object.keys(KRITERIJI).join(", ")} (mora biti jedinstven; sjaj = stvarna snaga)
  ili promjena kad se sklopka prebaci: odaberi: {kriterij: ${Object.keys(PROMJENE).join(" | ")}, sklopka: id} (učenik označi sve takve žarulje; nakon točnog odgovora sklopka se prebaci).`,
  primjer: {
    tip: "strujni_krug",
    nacin: "izracunaj",
    tekst: "Kolika struja izlazi iz izvora i kolika teče kroz svaki otpornik?",
    izvor: { emf: 96, r: 4 },
    spoj: {
      paralelno: [
        { id: "R1", R: 20 },
        { id: "R2", R: 30 },
      ],
    },
    mjerila: [
      { vrsta: "A", element: "izvor" },
      { vrsta: "A", element: "R1" },
      { vrsta: "A", element: "R2" },
    ],
    pitaj: [
      { velicina: "I", element: "izvor", oznaka: "$I =$" },
      { velicina: "I", element: "R1", oznaka: "$I_1 =$" },
      { velicina: "I", element: "R2", oznaka: "$I_2 =$" },
    ],
  },
  primjeri: [
    {
      tip: "strujni_krug",
      nacin: "istrazi",
      tekst:
        "Pomiči klizač otpora $R_2$ i gledaj mjerila: što se događa sa strujom izvora i s naponom na paru kad se $R_2$ smanji?",
      izvor: { emf: 96, r: 4 },
      spoj: {
        id: "P",
        paralelno: [
          { id: "R1", R: 20 },
          { id: "R2", R: 30 },
        ],
      },
      mjerila: [
        { vrsta: "A", element: "izvor" },
        { vrsta: "A", element: "R2" },
        { vrsta: "V", element: "r" },
        { vrsta: "V", element: "P" },
      ],
      klizaci: [{ element: "R2", min: 5, max: 60, korak: 5 }],
    },
    {
      tip: "strujni_krug",
      nacin: "istrazi",
      tekst:
        "Mijenjaj napon izvora i gledaj koliko naboja prođe kroz presjek žice. Dodirni sklopku da prekineš krug.",
      izvor: { emf: 12 },
      spoj: {
        serijski: [
          { id: "S", sklopka: "zatvorena" },
          { id: "R1", R: 4 },
        ],
      },
      mjerila: [{ vrsta: "A", element: "izvor" }],
      klizaci: [{ element: "izvor", min: 2, max: 24, korak: 1 }],
      presjek: true,
    },
    {
      tip: "strujni_krug",
      nacin: "istrazi",
      tekst:
        "Prebaci žarulje iz serijskog u paralelni spoj i usporedi koliko svijetle.",
      izvor: { emf: 12 },
      spoj: {
        serijski: [
          { id: "Z1", oznaka: "Ž₁", zarulja: { U: 12, P: 9 } },
          { id: "Z2", oznaka: "Ž₂", zarulja: { U: 12, P: 9 } },
        ],
      },
      spoj_izbor: true,
      mjerila: [{ vrsta: "V", element: "Z1" }],
      podaci: [
        { velicina: "P", element: "Z1", oznaka: "snaga $P_1$" },
        { velicina: "R", element: "ukupno", oznaka: "ukupni otpor $R_u$" },
      ],
    },
    {
      tip: "strujni_krug",
      nacin: "postavi",
      tekst:
        "Otpornik od 60 Ω spojen je s otpornikom nepoznatog otpora $R$ tako da je ukupni otpor 20 Ω. Odaberi spoj i namjesti $R$.",
      spoj: {
        serijski: [
          { id: "R1", R: 60 },
          { id: "R", R: 10 },
        ],
      },
      spoj_izbor: true,
      klizaci: [{ element: "R", min: 5, max: 100, korak: 5 }],
      cilj: {
        velicina: "R",
        element: "ukupno",
        vrijednost: 20,
        oznaka: "$R_u$",
      },
    },
    {
      tip: "strujni_krug",
      nacin: "postavi",
      tekst: "Namjesti napon izvora tako da kroz otpornik teče struja 3 A.",
      izvor: { emf: 6 },
      spoj: { id: "R1", R: 4 },
      mjerila: [
        { vrsta: "A", element: "R1" },
        { vrsta: "V", element: "izvor" },
      ],
      klizaci: [{ element: "izvor", min: 1, max: 24, korak: 1 }],
      cilj: { velicina: "I", element: "R1", vrijednost: 3 },
    },
    {
      tip: "strujni_krug",
      nacin: "izracunaj",
      tekst:
        "Dvije žarulje s oznakom 12 V, 9 W spojene su serijski na 12 V. Kolika je snaga svake?",
      izvor: { emf: 12 },
      spoj: {
        serijski: [
          { id: "Z1", oznaka: "Ž₁", zarulja: { U: 12, P: 9 } },
          { id: "Z2", oznaka: "Ž₂", zarulja: { U: 12, P: 9 } },
        ],
      },
      pitaj: [{ velicina: "P", element: "Z1", oznaka: "$P =$" }],
    },
    {
      tip: "strujni_krug",
      nacin: "odaberi",
      tekst:
        "Žarulje 12 V, 9 W i 12 V, 18 W spojene su serijski na 12 V. Dodirni žarulju koja svijetli jače.",
      izvor: { emf: 12 },
      spoj: {
        serijski: [
          { id: "Z1", oznaka: "Ž₁", zarulja: { U: 12, P: 9 } },
          { id: "Z2", oznaka: "Ž₂", zarulja: { U: 12, P: 18 } },
        ],
      },
      odaberi: { kriterij: "najsjajnija" },
    },
    {
      tip: "strujni_krug",
      nacin: "odaberi",
      tekst:
        "Sve tri žarulje su jednake. Koje žarulje svijetle jače kad se sklopka S otvori? Dodirni sve takve.",
      izvor: { emf: 6 },
      spoj: {
        serijski: [
          { id: "Z1", oznaka: "Ž₁", zarulja: { U: 6, P: 3 } },
          {
            paralelno: [
              { id: "Z2", oznaka: "Ž₂", zarulja: { U: 6, P: 3 } },
              {
                serijski: [
                  { id: "S", sklopka: "zatvorena" },
                  { id: "Z3", oznaka: "Ž₃", zarulja: { U: 6, P: 3 } },
                ],
              },
            ],
          },
        ],
      },
      odaberi: { kriterij: "jace", sklopka: "S" },
    },
    {
      tip: "strujni_krug",
      nacin: "istrazi",
      tekst: "Dodirni sklopku S i gledaj kako se mijenja sjaj svake žarulje.",
      izvor: { emf: 6, r: 1 },
      spoj: {
        serijski: [
          { id: "Z1", oznaka: "Ž₁", zarulja: { U: 6, P: 3 } },
          {
            paralelno: [
              { id: "Z2", oznaka: "Ž₂", zarulja: { U: 6, P: 3 } },
              {
                serijski: [
                  { id: "S", sklopka: "zatvorena" },
                  { id: "Z3", oznaka: "Ž₃", zarulja: { U: 6, P: 3 } },
                ],
              },
            ],
          },
        ],
      },
      mjerila: [{ vrsta: "A", element: "izvor" }],
    },
  ],
  validate(s) {
    const { list, need } = problems();
    need(
      NACINI.includes(s.nacin),
      `strujni_krug.nacin mora biti jedan od: ${NACINI.join(", ")}`,
    );
    need(isText(s.tekst), "strujni_krug treba „tekst“");
    if (s.izvor != null) {
      if (need(typeof s.izvor === "object", "izvor mora biti {emf, r?}")) {
        need(
          isNum(s.izvor.emf) && s.izvor.emf > 0 && s.izvor.emf <= 1e5,
          "izvor.emf mora biti pozitivan napon u V",
        );
        if (s.izvor.r != null)
          need(
            isNum(s.izvor.r) && s.izvor.r >= 0 && s.izvor.r <= 1e4,
            "izvor.r mora biti unutarnji otpor u Ω (≥ 0)",
          );
        if (s.izvor.oznaka != null)
          need(
            ["ε", "U"].includes(s.izvor.oznaka),
            `izvor.oznaka mora biti "ε" ili "U"`,
          );
      }
    }
    if (
      !need(
        s.spoj && typeof s.spoj === "object",
        "strujni_krug treba „spoj“ (stablo elemenata)",
      )
    )
      return list;
    if (!provjeriStablo(s.spoj, need) || list.length) return list;
    const T = stablo(s.spoj);
    const nacin = s.nacin;

    if (
      s.mjerila != null &&
      need(
        Array.isArray(s.mjerila) && s.mjerila.length <= 5,
        "mjerila: popis od najviše 5 mjerila",
      )
    ) {
      need(
        !!s.izvor || !s.mjerila.length,
        "mjerila imaju smisla samo uz izvor",
      );
      const kljucevi = new Set();
      s.mjerila.forEach((m, i) => {
        need(
          ["A", "V"].includes(m?.vrsta),
          `mjerila[${i}].vrsta mora biti "A" (ampermetar) ili "V" (voltmetar)`,
        );
        need(
          refOk(s, T, m?.element),
          `mjerila[${i}].element mora biti ${REF_OPIS}`,
        );
        if (m?.vrsta === "A")
          need(
            m.element !== "r",
            `mjerila[${i}]: struju izvora mjeri ampermetar na "izvor"`,
          );
        if (m?.element === "r")
          need(
            rUnutra(s),
            `mjerila[${i}]: voltmetar na "r" treba izvor s unutarnjim otporom r > 0`,
          );
        const k = `${m?.vrsta}:${m?.element === "ukupno" ? "izvor" : m?.element}`;
        need(!kljucevi.has(k), `mjerila[${i}] se ponavlja`);
        kljucevi.add(k);
      });
      need(
        !(kljucevi.has("V:r") && kljucevi.has("V:izvor")),
        `najviše jedan voltmetar uz izvor: na "r" ili na "izvor"`,
      );
    }

    if (s.klizaci != null) {
      need(
        nacin === "istrazi" || nacin === "postavi",
        "klizaci postoje samo u načinima istrazi i postavi",
      );
      if (
        need(
          Array.isArray(s.klizaci) &&
            s.klizaci.length >= 1 &&
            s.klizaci.length <= 2,
          "klizaci: 1–2 klizača",
        )
      ) {
        s.klizaci.forEach((k, i) => {
          const el = k?.element;
          const c = T.po[el];
          need(
            el === "izvor" || el === "r" ? !!s.izvor : c?.vrsta === "R",
            `klizaci[${i}].element mora biti id otpornika, "izvor" (ε) ili "r"`,
          );
          if (k?.oznaka != null)
            need(
              isText(k.oznaka) && k.oznaka.length <= 10,
              `klizaci[${i}].oznaka mora biti kratak tekst`,
            );
          if (
            !need(
              [k?.min, k?.max, k?.korak].every(isNum),
              `klizaci[${i}] treba brojeve min, max i korak`,
            )
          )
            return;
          need(
            k.max > k.min && k.korak > 0,
            `klizaci[${i}]: mora biti min < max i korak > 0`,
          );
          need(
            (k.max - k.min) / k.korak <= 1000,
            `klizaci[${i}] ima previše koraka (najviše 1000)`,
          );
          need(
            el === "r" ? k.min >= 0 : k.min > 0,
            `klizaci[${i}].min mora biti pozitivan`,
          );
          const p = pocetnaVrijednost(s, T, el);
          if (isNum(p)) {
            need(
              p >= k.min - 1e-9 && p <= k.max + 1e-9,
              `klizaci[${i}]: početna vrijednost iz speca (${p}) mora biti između min i max`,
            );
            need(
              aligned(p - k.min, k.korak),
              `klizaci[${i}]: početna vrijednost iz speca (${p}) mora biti na koraku klizača`,
            );
          }
        });
        need(
          new Set(s.klizaci.map((k) => k?.element)).size === s.klizaci.length,
          "dva klizača za isti element",
        );
      }
    }
    if (s.spoj_izbor != null) {
      need(
        nacin === "istrazi" || nacin === "postavi",
        "spoj_izbor postoji samo u načinima istrazi i postavi",
      );
      need(
        grupaIzbora(s, T)?.djeca.length >= 2,
        "spoj_izbor mora biti true (cijeli spoj je skupina) ili id skupine s barem 2 člana",
      );
    }
    if (s.presjek != null)
      need(
        s.presjek === true && nacin === "istrazi" && !!s.izvor,
        "presjek: true postoji samo u načinu istrazi, uz izvor",
      );
    if (s.podaci != null) {
      need(
        nacin === "istrazi" || nacin === "postavi",
        "podaci (živi iznosi) postoje samo u načinima istrazi i postavi",
      );
      if (
        need(
          Array.isArray(s.podaci) &&
            s.podaci.length >= 1 &&
            s.podaci.length <= 3,
          "podaci: 1–3 iznosa",
        )
      )
        s.podaci.forEach((q, i) =>
          provjeriVelicinu(s, T, q, `podaci[${i}]`, need),
        );
    }
    if (list.length) return list;

    // kratki spoj: izvor bez ikakvog otpora
    if (s.izvor)
      for (const st of svaStanja(s, T))
        if (
          !need(
            rijesi(s, st, T).Rv + st.r > 1e-9,
            "kratki spoj: u nekom stanju sklopki krug nema nikakav otpor (dodaj unutarnji otpor r ili otpornik u niz)",
          )
        )
          break;

    if (nacin === "istrazi") {
      noAnswerFields(s, need);
      for (const f of ["pitaj", "odaberi"])
        need(
          !(f in s),
          `korak „istrazi“ je za gledanje, pa ne smije imati polje „${f}“`,
        );
    }
    if (nacin === "izracunaj") {
      for (const f of [
        "klizaci",
        "spoj_izbor",
        "presjek",
        "podaci",
        "cilj",
        "odaberi",
      ])
        need(!(f in s), `izracunaj je nepomičan krug, bez polja „${f}“`);
      if (
        need(
          Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
          "izracunaj treba pitaj: 1–3 tražene veličine",
        )
      ) {
        const rez = rijesi(s, pocetnoStanje(s), T);
        const vidjeno = new Set();
        s.pitaj.forEach((q, i) => {
          if (!provjeriVelicinu(s, T, q, `pitaj[${i}]`, need)) return;
          const c = T.po[q.element];
          if (c?.vrsta === "R")
            need(
              q.velicina !== "R",
              `pitaj[${i}]: otpor ${naziv(c)} piše na shemi; pitaj ukupni otpor ili otpor žarulje`,
            );
          const a = vrijednost(rez, q.velicina, q.element);
          need(
            isNum(a),
            `pitaj[${i}]: tražena vrijednost nije konačan broj (npr. otpor prekinutog kruga)`,
          );
          if (q.oznaka != null)
            need(isText(q.oznaka), `pitaj[${i}].oznaka mora biti tekst`);
          if (q.tolerancija != null)
            need(
              isNum(q.tolerancija) && q.tolerancija >= 0,
              `pitaj[${i}].tolerancija mora biti broj ≥ 0`,
            );
          if (isNum(a))
            validateKrivo(
              q.krivo,
              a,
              tolPitanja(q, a),
              need,
              `pitaj[${i}].krivo`,
            );
          const k = `${q.velicina}:${q.element}`;
          need(!vidjeno.has(k), `pitaj[${i}] se ponavlja`);
          vidjeno.add(k);
        });
      }
    }
    if (nacin === "postavi") {
      for (const f of ["pitaj", "odaberi", "presjek"])
        need(!(f in s), `postavi ne smije imati polje „${f}“`);
      need(
        (s.klizaci?.length ?? 0) > 0 || s.spoj_izbor != null,
        "postavi treba barem jedan klizač ili spoj_izbor",
      );
      const c = s.cilj;
      if (
        need(
          c && typeof c === "object",
          "postavi treba cilj: {velicina, element, vrijednost}",
        ) &&
        provjeriVelicinu(s, T, c, "cilj", need)
      ) {
        need(isNum(c.vrijednost), "cilj.vrijednost mora biti broj");
        if (c.tolerancija != null)
          need(
            isNum(c.tolerancija) && c.tolerancija >= 0,
            "cilj.tolerancija mora biti broj ≥ 0",
          );
        if (c.skriveno != null)
          need(
            typeof c.skriveno === "boolean",
            "cilj.skriveno mora biti true ili false",
          );
        if (c.oznaka != null)
          need(isText(c.oznaka), "cilj.oznaka mora biti tekst");
        const n = (s.klizaci ?? []).reduce(
          (p, k) => p * (Math.round((k.max - k.min) / k.korak) + 1),
          1,
        );
        if (
          need(
            n <= 40000,
            "klizači zajedno imaju previše položaja (najviše 40 000)",
          ) &&
          isNum(c.vrijednost) &&
          !list.length
        ) {
          const { rjesenja, najblize, imaKrivih } = pretrazi(s, T);
          need(
            rjesenja.length > 0,
            `cilj se ne može postići ni na jednom položaju klizača${najblize ? ` (najbliže je ${withUnit(najblize.v, JEDINICA[c.velicina])})` : ""}`,
          );
          need(
            imaKrivih,
            "cilj je ispunjen na svakom položaju: nema što namjestiti",
          );
        }
      }
    }
    if (nacin === "odaberi") {
      for (const f of [
        "pitaj",
        "cilj",
        "klizaci",
        "spoj_izbor",
        "presjek",
        "podaci",
      ])
        need(!(f in s), `odaberi ne smije imati polje „${f}“`);
      const o = s.odaberi;
      if (
        need(
          o && typeof o === "object",
          "odaberi treba odaberi: {kriterij, medju?, sklopka?}",
        ) &&
        need(
          o.kriterij in KRITERIJI || o.kriterij in PROMJENE,
          `odaberi.kriterij mora biti jedan od: ${[...Object.keys(KRITERIJI), ...Object.keys(PROMJENE)].join(", ")}`,
        )
      ) {
        need(!!s.izvor, "odaberi treba izvor");
        const promjena = o.kriterij in PROMJENE;
        if (promjena)
          need(
            T.po[o.sklopka]?.vrsta === "S",
            "odaberi.sklopka mora biti id sklopke koja se prebacuje",
          );
        else
          need(
            o.sklopka == null,
            "odaberi.sklopka ide samo uz kriterije promjene (ugase_se, upale_se, jace, slabije, ne_mijenja)",
          );
        if (o.medju != null)
          need(
            Array.isArray(o.medju) &&
              o.medju.every((id) => ["R", "Z"].includes(T.po[id]?.vrsta)) &&
              new Set(o.medju).size === o.medju.length,
            "odaberi.medju mora biti popis različitih id-jeva otpornika i žarulja",
          );
        const ids = kandidati(s, T);
        need(
          ids.length >= 2,
          "odaberi treba barem 2 elementa između kojih učenik bira",
        );
        if ((KRITERIJI[o.kriterij]?.[2] || promjena) && !o.medju)
          need(
            ids.every((id) => T.po[id]?.vrsta === "Z"),
            "za sjaj i promjenu sjaja kandidati moraju biti žarulje",
          );
        if (!list.length) {
          const { tocni } = rjesenjeOdaberi(s, T);
          if (promjena)
            need(
              tocni.length > 0,
              `nijedna žarulja ne ${PROMJENE[o.kriterij].replace(/^se /, "")} kad se sklopka prebaci; promijeni kriterij`,
            );
          else
            need(
              tocni.length === 1,
              `kriterij „${o.kriterij}“ nema jedinstven odgovor (${tocni.length} elementa su jednaka)`,
            );
        }
      }
    }
    if (list.length) return list;

    // raspored mora stati na mobitel
    const oz = oznakeZaRaspored(s);
    for (const st of svaStanja(s, T).slice(0, 4)) {
      const L = rasporedi(s, st, T, oz);
      if (
        !need(
          L.w <= MAX_W && L.h <= MAX_H,
          `shema je prevelika za mobitel (${L.w}×${L.h}, najviše ${MAX_W}×${MAX_H}); smanji broj elemenata ili mjerila`,
        )
      )
        break;
    }
    return list;
  },
  check(s, odgovor) {
    const T = stablo(s.spoj);
    if (s.nacin === "izracunaj") {
      const unosi = Array.isArray(odgovor) ? odgovor : [odgovor];
      const rez = rijesi(s, pocetnoStanje(s), T);
      const vise = s.pitaj.length > 1;
      const polja = [];
      let prva = null;
      for (const [i, q] of s.pitaj.entries()) {
        const a = vrijednost(rez, q.velicina, q.element);
        const r = checkNumber({
          input: unosi[i] ?? "",
          answer: a,
          tol: tolPitanja(q, a),
          unit: JEDINICA[q.velicina],
          krivo: [...(q.krivo ?? []), ...autoKrivo(s, T, q)],
          savjet: s.savjet || SAVJET[q.velicina],
        });
        if (r.prazno)
          return {
            tocno: false,
            poruka: vise
              ? `${oznakaPitanja(s, T, q)} upiši broj (decimalni zarez je u redu).`
              : r.poruka,
            prazno: true,
          };
        polja.push(!!r.tocno);
        if (!r.tocno && !prva) prva = { ...r, q };
      }
      if (!prva) return { tocno: true, polja };
      return {
        tocno: false,
        poruka: vise
          ? `${oznakaPitanja(s, T, prva.q)} ${prva.poruka}`
          : prva.poruka,
        polja,
      };
    }
    if (s.nacin === "postavi") {
      if (!odgovor || typeof odgovor !== "object")
        return { tocno: false, poruka: "Pomakni klizač.", prazno: true };
      const c = s.cilj;
      const v = ciljU(s, T, odgovor);
      const j = JEDINICA[c.velicina];
      if (isNum(v) && near(v, c.vrijednost, tolCilja(s)))
        return { tocno: true };
      const opis = c.oznaka ?? fraza(T, c.velicina, c.element);
      let poruka = `Sad je ${opis} = ${isNum(v) ? withUnit(v, j) : "?"}, a treba ${withUnit(c.vrijednost, j)}.`;
      const g = grupaIzbora(s, T);
      const spoj = odgovor.spoj ?? g?.vrsta;
      if (g && !pretrazi(s, T, spoj).rjesenja.length) {
        poruka +=
          c.velicina === "R"
            ? " S ovim spojem to ne ide: serijski spoj uvijek daje više od najvećeg otpornika, a paralelni manje od najmanjeg."
            : " S ovim spojem cilj se ne može postići. Probaj drugi spoj.";
      } else if (isNum(v))
        poruka += v > c.vrijednost ? " Treba manje." : " Treba više.";
      return { tocno: false, poruka };
    }
    if (s.nacin === "odaberi") {
      const odabrano = (
        Array.isArray(odgovor) ? odgovor : odgovor ? [odgovor] : []
      ).filter((x) => typeof x === "string");
      const promjena = s.odaberi.kriterij in PROMJENE;
      if (!odabrano.length)
        return {
          tocno: false,
          poruka: promjena
            ? "Dodirni žarulje za koje to vrijedi."
            : "Dodirni jedan element.",
          prazno: true,
        };
      const r = rjesenjeOdaberi(s, T);
      const ime = (id) => naziv(T.po[id]);
      const visak = odabrano.filter((id) => !r.tocni.includes(id));
      const fali = r.tocni.filter((id) => !odabrano.includes(id));
      if (!visak.length && !fali.length) return { tocno: true };
      if (promjena) {
        if (visak.length) {
          const i = r.ids.indexOf(visak[0]);
          const sk = T.po[s.odaberi.sklopka];
          return {
            tocno: false,
            poruka: `${ime(visak[0])} ${OPIS_PROMJENE[r.opis[i]] ?? "se mijenja drukčije"} kad se sklopka ${naziv(sk)} ${sk.zatvorena ? "otvori" : "zatvori"}. Prati put struje: kroz koje žarulje struja ide i kroz sklopku?`,
          };
        }
        return {
          tocno: false,
          poruka: `Nisi označio sve: ${fali.length === 1 ? "još jedna žarulja" : `još ${fali.length} žarulje`} ${PROMJENE[s.odaberi.kriterij]}. Pomisli kako se promijeni ukupni otpor, a time i struja iz izvora.`,
        };
      }
      const id = odabrano[0];
      const i = r.ids.indexOf(id);
      const vel = r.vel;
      const k = s.odaberi.kriterij;
      const c = T.po[id];
      const t = r.tocni[0] ? T.po[r.tocni[0]] : null;
      const iznos = isNum(r.vr[i]) ? withUnit(r.vr[i], JEDINICA[vel]) : "";
      if (KRITERIJI[k][2]) {
        let poruka = `${ime(id)} troši ${iznos}, a jedna druga žarulja ${KRITERIJI[k][1] > 0 ? "više" : "manje"}. Sjaj ovisi o snazi koju žarulja stvarno troši ($P = U I$), a ne o tome što piše na njoj.`;
        if (
          c?.vrsta === "Z" &&
          t?.vrsta === "Z" &&
          (c.Pnaz - t.Pnaz) * KRITERIJI[k][1] > 0
        )
          poruka +=
            " U serijskom spoju kroz obje teče ista struja, pa jače svijetli ona s većim otporom ($P = I^2 R$), a to je žarulja manje nazivne snage.";
        return { tocno: false, poruka };
      }
      const rijec = { I: "Kroz", U: "Na", P: "Na" }[vel];
      return {
        tocno: false,
        poruka: `${rijec} ${ime(id)} je ${{ I: "struja", U: "napon", P: "snaga" }[vel]} ${iznos}, a na jednom drugom elementu ${KRITERIJI[k][1] > 0 ? "veća" : "manja"}.`,
      };
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    const T = stablo(s.spoj);
    const rez = rijesi(s, pocetnoStanje(s), T);
    if (s.nacin === "izracunaj")
      return s.pitaj
        .map(
          (q) =>
            `${oznakaPitanja(s, T, q)} ${withUnit(vrijednost(rez, q.velicina, q.element), JEDINICA[q.velicina])}`,
        )
        .join(", ");
    if (s.nacin === "postavi") {
      const best = pretrazi(s, T).rjesenja[0];
      if (!best) return "";
      const dijelovi = [];
      if (best.odg.spoj)
        dijelovi.push(
          best.odg.spoj === "par" ? "paralelni spoj" : "serijski spoj",
        );
      for (const k of s.klizaci ?? [])
        dijelovi.push(
          `${nazivKlizaca(s, T, k)} = ${withUnit(best.odg.klizaci[k.element], jedinicaKlizaca(k))}`,
        );
      return `${dijelovi.join(", ")} (tada je ${s.cilj.oznaka ?? fraza(T, s.cilj.velicina, s.cilj.element)} = ${withUnit(best.v, JEDINICA[s.cilj.velicina])})`;
    }
    if (s.nacin === "odaberi")
      return rjesenjeOdaberi(s, T)
        .tocni.map((id) => naziv(T.po[id]))
        .join(", ");
    return "";
  },
  brojcaniOdgovor(s) {
    const T = stablo(s.spoj);
    if (s.nacin === "izracunaj" && s.pitaj.length === 1)
      return vrijednost(
        rijesi(s, pocetnoStanje(s), T),
        s.pitaj[0].velicina,
        s.pitaj[0].element,
      );
    if (s.nacin === "postavi") {
      const best = pretrazi(s, T).rjesenja[0];
      return (s.klizaci ?? []).length === 1 && best
        ? best.odg.klizaci[s.klizaci[0].element]
        : s.cilj.vrijednost;
    }
    return null;
  },
};

export { velicineOd };
