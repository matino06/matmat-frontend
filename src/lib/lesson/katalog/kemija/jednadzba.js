// jednadzba: jednadžba kemijske reakcije. Učenik izjednačuje koeficijente (atomi I naboj) i/ili bira agregacijska
// stanja. Koeficijente računa kod sam: najmanji pozitivni cijeli brojevi iz nul-prostora matrice „element × tvar“
// (racionalna Gaussova eliminacija s BigIntom), pa autor lekcije upisuje samo formule. Elektron „e⁻“ je čestica bez
// atoma s nabojem −1 (polureakcije). Atomi i naboji formula dolaze iz _tablice.js (atomiOd, nabojOd).
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";
import { atomiOd, nabojOd, element } from "./_tablice.js";

const NACINI = ["istrazi", "izjednaci", "stanja", "izjednaci_stanja"];
const STRELICE = ["→", "⇌"];
export const STANJA = ["s", "l", "g", "aq"];
export const NAJVISE = 20; // najveći koeficijent na gumbima u istraživanju
const POLJA = ["tip", "nacin", "tekst", "reaktanti", "produkti", "strelica", "iznad", "koeficijenti", "stanja", "pocetak", "brojac", "krivo"];

export const trazeKoef = (s) => s.nacin === "izjednaci" || s.nacin === "izjednaci_stanja";
export const trazeStanja = (s) => s.nacin === "stanja" || s.nacin === "izjednaci_stanja";

// ── čestice ──
const jeElektron = (f) => /^e\s*[⁻\-−]$/.test(f);

// Formula → {formula, atomi, naboj, elektron} ili {greska}. Stanje u formuli, ASCII indeksi i ASCII naboj su greške:
// prikaz treba prave indekse, a stanje se bira (ili zadaje) zasebno.
export function cestica(formula) {
  if (!isText(formula)) return { greska: "formula mora biti tekst" };
  const f = formula.trim();
  if (jeElektron(f)) return { formula: "e⁻", atomi: {}, naboj: -1, elektron: true };
  if (/\((?:s|l|ℓ|g|aq)\)/.test(f)) return { greska: `formula „${f}“ ne smije imati stanje u zagradi: stanja idu u polje „stanja“` };
  if (/[+\-−]$/.test(f)) return { greska: `naboj u „${f}“ piši gornjim znakovima (npr. Fe²⁺, SO₄²⁻)` };
  if (/[A-Za-z)\]][0-9]/.test(f)) return { greska: `u formuli „${f}“ indeksi se pišu znakovima ₀–₉ (npr. H₂O, ne H2O)` };
  const atomi = atomiOd(f);
  if (!atomi) return { greska: `formula „${f}“ se ne da pročitati (nepoznat simbol elementa ili zagrade)` };
  return { formula: f, atomi, naboj: nabojOd(f), elektron: false };
}

// Sve tvari redom kako stoje u jednadžbi: reaktanti pa produkti.
export function tvari(s) {
  const r = Array.isArray(s?.reaktanti) ? s.reaktanti : [];
  const p = Array.isArray(s?.produkti) ? s.produkti : [];
  return [...r.map((f) => ({ f, strana: "L" })), ...p.map((f) => ({ f, strana: "D" }))].map((t, i) => ({ ...cestica(t.f), strana: t.strana, i }));
}

// Elementi redom prvog pojavljivanja.
export function elementiOd(t) {
  const out = [];
  for (const c of t) for (const e of Object.keys(c.atomi ?? {})) if (!out.includes(e)) out.push(e);
  return out;
}

// ── izjednačavanje: racionalna Gaussova eliminacija ──
const babs = (a) => (a < 0n ? -a : a);
const bgcd = (a, b) => {
  a = babs(a);
  b = babs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
const frac = (n, d = 1n) => {
  if (d < 0n) [n, d] = [-n, -d];
  const g = bgcd(n, d) || 1n;
  return { n: n / g, d: d / g };
};
const fsub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const fmul = (a, b) => frac(a.n * b.n, a.d * b.d);
const fdiv = (a, b) => frac(a.n * b.d, a.d * b.n);

// Nul-prostor cjelobrojne matrice: popis baznih vektora (cijeli brojevi, BigInt, skraćeni).
function nulProstor(A, n) {
  const M = A.map((red) => red.map((x) => frac(BigInt(x))));
  const pivoti = [];
  let r = 0;
  for (let c = 0; c < n && r < M.length; c++) {
    const p = M.findIndex((red, i) => i >= r && red[c].n !== 0n);
    if (p < 0) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const v = M[r][c];
    M[r] = M[r].map((x) => fdiv(x, v));
    for (let i = 0; i < M.length; i++) {
      if (i === r || M[i][c].n === 0n) continue;
      const k = M[i][c];
      M[i] = M[i].map((x, j) => fsub(x, fmul(k, M[r][j])));
    }
    pivoti.push(c);
    r++;
  }
  const slobodni = [...Array(n).keys()].filter((c) => !pivoti.includes(c));
  return slobodni.map((f) => {
    const v = Array.from({ length: n }, () => frac(0n));
    v[f] = frac(1n);
    pivoti.forEach((c, i) => (v[c] = frac(-M[i][f].n, M[i][f].d)));
    let nzv = 1n;
    for (const x of v) nzv = (nzv * x.d) / bgcd(nzv, x.d);
    const cijeli = v.map((x) => (x.n * nzv) / x.d);
    const g = cijeli.reduce((a, b) => bgcd(a, b), 0n) || 1n;
    return cijeli.map((x) => x / g);
  });
}

// Matrica: redak po elementu i redak za naboj; reaktanti pozitivno, produkti negativno.
function matrica(t) {
  const el = elementiOd(t);
  const znak = (c) => (c.strana === "L" ? 1 : -1);
  const A = el.map((e) => t.map((c) => znak(c) * (c.atomi[e] ?? 0)));
  A.push(t.map((c) => znak(c) * c.naboj));
  return A;
}

// Rješenje: {koef} (jedinstveno), ili {greska, vise?}. Ne čita autorove koeficijente.
export function izjednaci(t) {
  const n = t.length;
  const baza = nulProstor(matrica(t), n);
  if (baza.length === 0) {
    const L = new Set(elementiOd(t.filter((c) => c.strana === "L")));
    const D = new Set(elementiOd(t.filter((c) => c.strana === "D")));
    const samo = [...L].find((e) => !D.has(e)) ?? [...D].find((e) => !L.has(e));
    if (samo) return { greska: `element ${samo} je samo na ${L.has(samo) ? "lijevoj" : "desnoj"} strani, pa se jednadžba ne može izjednačiti` };
    return { greska: "jednadžba se ne može izjednačiti: nijedan izbor koeficijenata ne čuva sve atome i naboj (provjeri formule i naboje)" };
  }
  if (baza.length > 1) return { vise: true, greska: "jednadžba ima više neovisnih izjednačenja (kao dvije reakcije u jednoj), pa „najmanji cijeli koeficijenti“ nisu jednoznačni" };
  let v = baza[0];
  if (v.every((x) => x <= 0n)) v = v.map((x) => -x);
  const nula = v.findIndex((x) => x === 0n);
  if (nula >= 0) return { greska: `tvar ${t[nula].formula} ne sudjeluje u izjednačenoj jednadžbi (koeficijent bi bio 0)` };
  if (v.some((x) => x < 0n)) return { greska: "jednadžba se ne može izjednačiti pozitivnim koeficijentima: neka je tvar na krivoj strani strelice" };
  return { koef: v.map(Number) };
}

// Brojač atoma i naboja za zadane koeficijente.
export function brojac(t, koef) {
  const zbroj = (strana, fn) => t.reduce((a, c, i) => a + (c.strana === strana ? (koef[i] ?? 1) * fn(c) : 0), 0);
  const redovi = elementiOd(t).map((e) => {
    const lijevo = zbroj("L", (c) => c.atomi[e] ?? 0);
    const desno = zbroj("D", (c) => c.atomi[e] ?? 0);
    return { simbol: e, naziv: element(e)?.naziv ?? e, lijevo, desno, ok: lijevo === desno };
  });
  const imaNaboj = t.some((c) => c.naboj !== 0);
  const naboj = { lijevo: zbroj("L", (c) => c.naboj), desno: zbroj("D", (c) => c.naboj) };
  naboj.ok = naboj.lijevo === naboj.desno;
  return { redovi, naboj: imaNaboj ? naboj : null, izjednaceno: redovi.every((r) => r.ok) && naboj.ok };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const nzd = (koef) => koef.reduce((a, b) => gcd(a, b), 0);

// ── zapis ──
export const zapisNaboja = (q) => (q > 0 ? `+${q}` : q < 0 ? `−${-q}` : "0");
const NEPRAVILNI = { bakar: "bakra", kositar: "kositra", nikal: "nikla" };
// „kisik“ → „kisika“, „željezo“ → „željeza“, „živa“ → „žive“
export function genitiv(naziv) {
  if (NEPRAVILNI[naziv]) return NEPRAVILNI[naziv];
  if (naziv.endsWith("o")) return naziv.slice(0, -1) + "a";
  if (naziv.endsWith("a")) return naziv.slice(0, -1) + "e";
  return naziv + "a";
}
const atoma = (n) => (n % 10 === 1 && n % 100 !== 11 ? "atom" : "atoma");
const velikoSlovo = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nabrajanje = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} i ${a[a.length - 1]}`);

// Stanja poravnata s tvarima: niz, ili objekt {formula: stanje}; „ℓ“ = „l“. null za elektron i nezadano.
export function stanjaOd(s, t = tvari(s)) {
  const norm = (v) => (v === "ℓ" ? "l" : v);
  if (Array.isArray(s.stanja)) return t.map((c, i) => (c.elektron ? null : (norm(s.stanja[i]) ?? null)));
  if (s.stanja && typeof s.stanja === "object") return t.map((c) => (c.elektron ? null : (norm(s.stanja[c.formula]) ?? null)));
  return t.map(() => null);
}

export const tocniKoef = (s, t = tvari(s)) => (Array.isArray(s.koeficijenti) ? s.koeficijenti : izjednaci(t).koef);

// Unicode indeksi i naboji → TeX za tekst iznad strelice („H⁺“ → \text{H}^{+}).
const SUB_U = "₀₁₂₃₄₅₆₇₈₉";
const SUP_U = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-" };
function texTekst(s) {
  let out = "";
  let tekst = "";
  const zatvori = () => {
    if (tekst) out += `\\text{${tekst.replace(/[{}\\$%#&_^~]/g, (c) => `\\${c}`)}}`;
    tekst = "";
  };
  for (const ch of String(s)) {
    if (SUB_U.includes(ch)) {
      zatvori();
      out += `_{${SUB_U.indexOf(ch)}}`;
    } else if (ch in SUP_U) {
      zatvori();
      out += `^{${SUP_U[ch]}}`;
    } else tekst += ch;
  }
  zatvori();
  return out.replace(/\}\^\{([^}]*)\}\^\{/g, "}^{$1").replace(/\}_\{([^}]*)\}_\{/g, "}_{$1");
}

// Cijela jednadžba kao markdown: „2 KNO₃(l) → 2 KNO₂(s) + O₂(g)“ (koeficijent 1 se ne piše).
export function zapisJednadzbe(s, koef, stanja) {
  const t = tvari(s);
  const clan = (c, i) => `${koef && koef[i] !== 1 ? `${koef[i]} ` : ""}${c.formula}${stanja?.[i] ? `(${stanja[i]})` : ""}`;
  const L = t.filter((c) => c.strana === "L").map((c) => clan(c, c.i));
  const D = t.filter((c) => c.strana === "D").map((c) => clan(c, c.i));
  const str = s.strelica ?? "→";
  const strelica = isText(s.iznad) ? `$\\${str === "⇌" ? "xrightleftharpoons" : "xrightarrow"}{${texTekst(s.iznad)}}$` : str;
  return `${L.join(" + ")} ${strelica} ${D.join(" + ")}`;
}

// ── provjera odgovora ──
// Koeficijent iz polja: prazno = 1 (kao na maturi). Vraća broj ili {poruka}.
function procitajKoef(v) {
  const x = String(v ?? "").trim();
  if (x === "") return 1;
  if (/^\d+$/.test(x)) return Number(x);
  if (/^[-−]/.test(x)) return { poruka: "Koeficijent je pozitivan cijeli broj." };
  if (/^\d+\s*[,./]\s*\d+$/.test(x)) return { poruka: "Koeficijenti su cijeli brojevi. Ako ti je ispao razlomak (npr. ½), pomnoži sve koeficijente da dobiješ cijele." };
  return { poruka: "Upiši cijeli broj (npr. 2). Prazno polje znači 1." };
}

export function provjeriKoef(s, unos) {
  const t = tvari(s);
  const koef = [];
  for (let i = 0; i < t.length; i++) {
    const k = procitajKoef(unos?.[i]);
    if (typeof k !== "number") return { tocno: false, poruka: k.poruka, koefKrivo: true };
    if (k === 0) return { tocno: false, poruka: `Koeficijent ne može biti 0: tada ${t[i].formula} ne bi bilo u jednadžbi. Najmanji koeficijent je 1 (ne piše se).`, koefKrivo: true };
    koef.push(k);
  }
  const b = brojac(t, koef);
  const krivi = b.redovi.filter((r) => !r.ok);
  if (krivi.length) {
    const r = krivi[0];
    let p = `${velikoSlovo(genitiv(r.naziv))} je lijevo ${r.lijevo} ${atoma(r.lijevo)}, a desno ${r.desno}.`;
    if (krivi.length > 1) p += ` Ne ${krivi.length > 2 ? "slažu" : "slaže"} se ni ${krivi.slice(1).map((x) => x.naziv).join(" ni ")}.`;
    return { tocno: false, poruka: p, koefKrivo: true };
  }
  if (b.naboj && !b.naboj.ok) {
    let p = `Atomi se slažu, ali naboj ne: lijevo je ukupno ${zapisNaboja(b.naboj.lijevo)}, a desno ${zapisNaboja(b.naboj.desno)}.`;
    if (t.some((c) => c.elektron)) p += " Svaki elektron nosi naboj −1.";
    return { tocno: false, poruka: p, koefKrivo: true };
  }
  const g = nzd(koef);
  if (g > 1) return { tocno: false, poruka: `Jednadžba je izjednačena, ali koeficijente možeš podijeliti s ${g}. Traže se najmanji cijeli brojevi.`, koefKrivo: true };
  const tocni = tocniKoef(s, t);
  if (tocni && koef.some((k, i) => k !== tocni[i])) return { tocno: false, poruka: "Jednadžba je izjednačena, ali se traže drugi koeficijenti. Pogledaj tekst zadatka.", koefKrivo: true };
  return { tocno: true };
}

const NAZIV_STANJA = { s: "čvrsto (s)", l: "tekuće (l)", g: "plin (g)", aq: "vodena otopina (aq)" };
export function provjeriStanja(s, unos) {
  const t = tvari(s);
  const tocna = stanjaOd(s, t);
  const dano = t.map((c, i) => (c.elektron ? null : unos?.[i] === "ℓ" ? "l" : (unos?.[i] ?? null)));
  if (t.some((c, i) => !c.elektron && !STANJA.includes(dano[i]))) return { tocno: false, poruka: "Odaberi stanje za svaku tvar.", prazno: true };
  const krivi = t.filter((c, i) => !c.elektron && dano[i] !== tocna[i]);
  if (!krivi.length) return { tocno: true };
  const stanjaKrivo = krivi.map((c) => c.i);
  const prva = krivi[0];
  const posebna = (s.krivo ?? []).find((k) => k.tvar === prva.formula && (k.stanje === "ℓ" ? "l" : k.stanje) === dano[prva.i]);
  if (posebna) return { tocno: false, poruka: posebna.poruka, stanjaKrivo };
  const p = krivi.length === 1 ? `Za ${prva.formula} stanje ${NAZIV_STANJA[dano[prva.i]]} nije točno.` : `Stanje nije točno za ${nabrajanje(krivi.map((c) => c.formula))}.`;
  return { tocno: false, poruka: `${p} Razmisli u kakvom je stanju ${krivi.length === 1 ? "ta tvar" : "svaka od njih"} pri uvjetima reakcije.`, stanjaKrivo };
}

export const jednadzba = {
  tip: "jednadzba",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Jednadžba kemijske reakcije: učenik izjednačuje koeficijente i/ili bira agregacijska stanja.
reaktanti: [formula…], produkti: [formula…] – Unicode indeksi i naboji („C₃H₆“, „SO₄²⁻“, „CuSO₄·5H₂O“), bez stanja u formuli; „e⁻“ je elektron (naboj −1, bez atoma) za polureakcije.
strelica?: "→" (zadano) | "⇌"; iznad?: tekst iznad strelice („zagrijavanje“, „H⁺“, „katalizator“).
koeficijenti?: [broj…] redom reaktanti pa produkti. Kod ih računa sam (najmanji cijeli brojevi koji čuvaju sve atome i naboj); ako ih autor upiše, moraju biti točno ti. Ako jednadžba ima više neovisnih izjednačenja, načini s izjednačavanjem se ne mogu koristiti, a „stanja“ traži zadane koeficijente.
stanja?: niz redom kao tvari ili {formula: stanje}, stanje "s" | "l" (ili "ℓ"; prikaz je uvijek (l)) | "g" | "aq"; elektron nema stanje. Niz je obavezan kad je ista formula s obje strane (H₂O(l) → H₂O(g)).
tekst, nacin:
- "istrazi" (nije zadatak): učenik mijenja koeficijente gumbima + i − (1–${NAJVISE}) i gleda brojač atoma svakog elementa i naboja lijevo i desno; pocetak?: početni koeficijenti (zadano svi 1). Stanja, ako su zadana, samo se prikazuju;
- "izjednaci": učenik upisuje koeficijente (prazno polje = 1, kao na maturi). Poruke za element ili naboj koji se ne slaže, koeficijent 0, razlomak i „izjednačeno, ali ne najmanji cijeli“ dodaje kod sam; brojac?: true pokazuje brojač i u ovom koraku (zadano: ne). Zadana stanja se prikazuju;
- "stanja": koeficijenti su zadani (izračunati), učenik za svaku tvar bira (s), (l), (g) ili (aq); stanja su obavezna;
- "izjednaci_stanja": oboje; stanja obavezna, brojac? kao kod "izjednaci".
krivo?: [{tvar, stanje, poruka}] – poruka za tipično krivo stanje (npr. AgCl kao „aq“: „AgCl je talog, ne otapa se u vodi.“).`,
  primjer: {
    tip: "jednadzba",
    nacin: "izjednaci",
    tekst: "Propen (C₃H₆) potpuno izgara u kisiku. Izjednači jednadžbu: upiši najmanje cijele koeficijente.",
    reaktanti: ["C₃H₆", "O₂"],
    produkti: ["CO₂", "H₂O"],
  },
  primjeri: [
    {
      tip: "jednadzba",
      nacin: "istrazi",
      tekst: "Bakar i sumpor daju bakrov(I) sulfid. Mijenjaj koeficijente gumbima + i − i gledaj kad se broj atoma lijevo i desno slaže.",
      reaktanti: ["Cu", "S"],
      produkti: ["Cu₂S"],
    },
    {
      tip: "jednadzba",
      nacin: "stanja",
      tekst: "Zagrijavanjem se rastaljeni kalijev nitrat raspada na čvrsti kalijev nitrit i kisik. Odaberi agregacijsko stanje svake tvari.",
      reaktanti: ["KNO₃"],
      produkti: ["KNO₂", "O₂"],
      iznad: "zagrijavanje",
      stanja: { "KNO₃": "l", "KNO₂": "s", "O₂": "g" },
    },
    {
      tip: "jednadzba",
      nacin: "izjednaci_stanja",
      tekst: "U otopinu srebrova nitrata dodana je otopina natrijeva klorida i nastao je bijeli talog. Napiši ionsku jednadžbu taloženja: koeficijente i stanja.",
      reaktanti: ["Ag⁺", "Cl⁻"],
      produkti: ["AgCl"],
      stanja: ["aq", "aq", "s"],
      krivo: [{ tvar: "AgCl", stanje: "aq", poruka: "AgCl je bijeli talog: ne ostaje otopljen, nego se izdvaja kao čvrsta tvar." }],
    },
    {
      tip: "jednadzba",
      nacin: "izjednaci",
      tekst: "Željezo se oksidira u željezove(II) ione. Izjednači polureakciju oksidacije: pazi i na atome i na naboj.",
      reaktanti: ["Fe"],
      produkti: ["Fe²⁺", "e⁻"],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    need(NACINI.includes(s.nacin), `jednadzba.nacin mora biti jedan od: ${NACINI.join(", ")}`);
    need(isText(s.tekst), "jednadzba treba „tekst“");
    for (const f of Object.keys(s)) need(POLJA.includes(f), `jednadzba nema polje „${f}“ (dopuštena: ${POLJA.slice(1).join(", ")})`);
    need(s.strelica == null || STRELICE.includes(s.strelica), `strelica mora biti "→" ili "⇌"`);
    if (s.iznad != null) need(isText(s.iznad) && s.iznad.length <= 24, "iznad je kratak tekst iznad strelice (do 24 znaka)");
    const imaR = need(Array.isArray(s.reaktanti) && s.reaktanti.length >= 1, "jednadzba treba reaktanti: [formula…] (barem jedna)");
    const imaP = need(Array.isArray(s.produkti) && s.produkti.length >= 1, "jednadzba treba produkti: [formula…] (barem jedan)");
    if (!imaR || !imaP) return list;
    need(s.reaktanti.length + s.produkti.length <= 8, "jednadžba smije imati najviše 8 tvari");
    const t = tvari(s);
    t.forEach((c, i) => need(!c.greska, `${c.strana === "L" ? "reaktanti" : "produkti"}[${c.strana === "L" ? i : i - s.reaktanti.length}]: ${c.greska}`));
    if (list.length) return list;
    for (const strana of ["L", "D"]) {
      const f = t.filter((c) => c.strana === strana).map((c) => c.formula);
      need(new Set(f).size === f.length, `ista tvar je dvaput na ${strana === "L" ? "lijevoj" : "desnoj"} strani`);
    }
    need(t.some((c) => !c.elektron), "jednadžba ne može imati samo elektrone");
    if (list.length) return list;

    const r = izjednaci(t);
    const ko = s.nacin !== "istrazi";
    // koeficijenti autora
    if (s.koeficijenti != null) {
      if (!ko) need(false, "istrazi ne zadaje koeficijente (to je odgovor); početne vrijednosti idu u „pocetak“");
      else if (need(Array.isArray(s.koeficijenti) && s.koeficijenti.length === t.length && s.koeficijenti.every((k) => Number.isInteger(k) && k >= 1), `koeficijenti su ${t.length} pozitivnih cijelih brojeva, redom reaktanti pa produkti`)) {
        const b = brojac(t, s.koeficijenti);
        const kriv = b.redovi.find((x) => !x.ok);
        if (kriv) need(false, `zadani koeficijenti nisu izjednačeni: ${genitiv(kriv.naziv)} je lijevo ${kriv.lijevo}, a desno ${kriv.desno}`);
        else if (b.naboj && !b.naboj.ok) need(false, `zadani koeficijenti ne čuvaju naboj: lijevo ${zapisNaboja(b.naboj.lijevo)}, desno ${zapisNaboja(b.naboj.desno)}`);
        else if (need(nzd(s.koeficijenti) === 1, `zadani koeficijenti nisu najmanji cijeli brojevi (dijele se s ${nzd(s.koeficijenti)})`) && r.koef)
          need(r.koef.every((k, i) => k === s.koeficijenti[i]), `zadani koeficijenti se ne slažu s izračunatima (${r.koef.join(", ")})`);
      }
    }
    if (r.greska) {
      if (r.vise) {
        need(!trazeKoef(s), `${r.greska}; za učenika koji izjednačuje to nije zadatak s jednim odgovorom`);
        need(s.nacin !== "stanja" || s.koeficijenti != null, `${r.greska}: zadaj koeficijenti`);
      } else need(false, r.greska);
    }

    // stanja
    const trazi = trazeStanja(s);
    if (s.stanja != null) {
      const niz = Array.isArray(s.stanja);
      if (need(niz || typeof s.stanja === "object", "stanja je niz (redom kao tvari) ili {formula: stanje}")) {
        const vr = niz ? s.stanja : Object.values(s.stanja);
        need(vr.every((v) => v == null || [...STANJA, "ℓ"].includes(v)), `stanje je jedno od: s, l (ili ℓ), g, aq`);
        if (niz) {
          need(s.stanja.length === t.length, `stanja kao niz ima ${t.length} mjesta (redom reaktanti pa produkti; za elektron null)`);
          t.forEach((c, i) => c.elektron && need(s.stanja[i] == null, "elektron e⁻ nema agregacijsko stanje (stavi null)"));
        } else {
          const formule = t.map((c) => c.formula);
          for (const k of Object.keys(s.stanja)) need(formule.includes(k), `stanja: „${k}“ nije tvar iz jednadžbe`);
          need(!("e⁻" in s.stanja), "elektron e⁻ nema agregacijsko stanje");
          need(new Set(formule).size === formule.length, "ista formula je s obje strane: stanja zadaj kao niz");
        }
      }
    }
    if (trazi && !list.length) {
      const st = stanjaOd(s, t);
      need(
        t.every((c, i) => c.elektron || st[i]),
        `način ${s.nacin} traži stanje svake tvari (nedostaje za ${t.filter((c, i) => !c.elektron && !st[i]).map((c) => c.formula).join(", ")})`,
      );
    }
    if (s.krivo != null) {
      if (!trazi) need(false, "krivo (poruke za kriva stanja) ide samo uz način stanja ili izjednaci_stanja");
      else if (need(Array.isArray(s.krivo), "krivo mora biti popis {tvar, stanje, poruka}") && !list.length) {
        const st = stanjaOd(s, t);
        s.krivo.forEach((k, i) => {
          const c = t.find((x) => x.formula === k?.tvar && !x.elektron);
          need(!!c, `krivo[${i}].tvar mora biti tvar iz jednadžbe`);
          need([...STANJA, "ℓ"].includes(k?.stanje), `krivo[${i}].stanje je s, l, g ili aq`);
          need(isText(k?.poruka), `krivo[${i}].poruka mora biti tekst`);
          if (c) need((k.stanje === "ℓ" ? "l" : k.stanje) !== st[c.i], `krivo[${i}]: ${k.stanje} je točno stanje za ${k.tvar}`);
        });
      }
    }

    if (s.brojac != null) need(typeof s.brojac === "boolean" && trazeKoef(s), "brojac (true/false) ide samo uz izjednaci ili izjednaci_stanja; u istrazi se brojač uvijek vidi");

    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      if (s.pocetak != null)
        need(Array.isArray(s.pocetak) && s.pocetak.length === t.length && s.pocetak.every((k) => Number.isInteger(k) && k >= 1 && k <= NAJVISE), `pocetak su ${t.length} cijelih brojeva od 1 do ${NAJVISE}`);
      if (r.koef) need(r.koef.every((k) => k <= NAJVISE), `izjednačena jednadžba treba koeficijent veći od ${NAJVISE}, a gumbi idu samo do ${NAJVISE}`);
    } else need(s.pocetak == null, "pocetak ide samo uz istrazi");
    return list;
  },

  check(s, odgovor) {
    if (trazeKoef(s)) {
      const r = provjeriKoef(s, odgovor?.koeficijenti);
      if (!r.tocno) return r;
    }
    if (trazeStanja(s)) return provjeriStanja(s, odgovor?.stanja);
    return { tocno: true };
  },

  tocanOdgovor(s) {
    const t = tvari(s);
    const st = stanjaOd(s, t);
    return zapisJednadzbe(s, tocniKoef(s, t), st.some(Boolean) ? st : null);
  },
};
