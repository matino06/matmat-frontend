// Baza pokusa u epruveti (widget „pokus“): tvari i reagensi, što se vidi kad se sretnu i jednadžba. Ovo je podatak,
// ne autor: lekcija zadaje samo ključeve tvari, a opažanje (talog i boja, plin, boja otopine, zamućenje, plamen)
// računa se ovdje iz čestica u tvarima.
//
// Kako: svaka tvar ima popis čestica („Na⁺“, „Cl⁻“, „kov:Zn“, „C=C“, „Fehling“ …). Za par tvari gleda se svaki par
// čestica: izričito pravilo (PRAVILA), tablica topljivosti iona (TOPLJIVOST), elektrodni potencijali s ispitnog lista
// (metal + kiselina, metal + ion drugog metala, halogen + halogenid) i promatrači (Na⁺, K⁺, NO₃⁻, voda). Ako za neki
// par čestica nije poznato što se događa, par tvari NIJE u bazi (null + razlog): bolje ništa nego izmišljeno opažanje.
// Boje i opažanja su kako ih pišu ispitni katalog (pokusi 7–12, 15) i naše lekcije (017, 020, 021, 023, 031, 035, 044);
// gdje nismo sigurni (Ag⁺ + CO₃²⁻, Ca²⁺ + SO₄²⁻, glukoza + bromna voda …), para nema.
import { POTENCIJALI, element } from "./_tablice.js";
import { formatNumber } from "../../core/number.js";

// ── boje ── (m: muški rod „talog“, z: ženski „otopina“, p: prilog „oboji se …“; hex je kemijski podatak)
export const BOJE = {
  bezbojna: { m: "bezbojan", z: "bezbojna", p: "bezbojno", hex: null },
  bijela: { m: "bijeli", z: "bijela", p: "bijelo", hex: "#f3f2ec" },
  zuckasta: { m: "žućkasti", z: "žućkasta", p: "žućkasto", hex: "#eadc96" },
  zuta: { m: "žuti", z: "žuta", p: "žuto", hex: "#f2c418" },
  blijedozuta: { m: "blijedožuti", z: "blijedožuta", p: "blijedožuto", hex: "#e8e48a" },
  zutosmeda: { m: "žutosmeđi", z: "žutosmeđa", p: "žutosmeđe", hex: "#c08a2c" },
  zutonarancasta: { m: "žutonarančasti", z: "žutonarančasta", p: "žutonarančasto", hex: "#f2a330" },
  narancasta: { m: "narančasti", z: "narančasta", p: "narančasto", hex: "#ef8526" },
  narancastosmeda: { m: "narančastosmeđi", z: "narančastosmeđa", p: "narančastosmeđe", hex: "#c4621c" },
  narancastocrvena: { m: "narančastocrveni", z: "narančastocrvena", p: "narančastocrveno", hex: "#e4572e" },
  crvena: { m: "crveni", z: "crvena", p: "crveno", hex: "#d7263d" },
  crvenosmeda: { m: "crvenosmeđi", z: "crvenosmeđa", p: "crvenosmeđe", hex: "#9b3a1a" },
  crvenkasta: { m: "crvenkasti", z: "crvenkasta", p: "crvenkasto", hex: "#b4532a" },
  smeda: { m: "smeđi", z: "smeđa", p: "smeđe", hex: "#7b4a22" },
  ruzicasta: { m: "ružičasti", z: "ružičasta", p: "ružičasto", hex: "#ee8db3" },
  ruzicastoljubicasta: { m: "ružičastoljubičasti", z: "ružičastoljubičasta", p: "ružičastoljubičasto", hex: "#c2268a" },
  ljubicasta: { m: "ljubičasti", z: "ljubičasta", p: "ljubičasto", hex: "#8e44ad" },
  modra: { m: "modri", z: "modra", p: "modro", hex: "#2f6fd0" },
  plava: { m: "plavi", z: "plava", p: "plavo", hex: "#3a8ee0" },
  tamnoplava: { m: "tamnoplavi", z: "tamnoplava", p: "tamnoplavo", hex: "#1f2b80" },
  zelenoplava: { m: "zelenoplavi", z: "zelenoplava", p: "zelenoplavo", hex: "#1f95a8" },
  plavozelena: { m: "plavozeleni", z: "plavozelena", p: "plavozeleno", hex: "#1fa192" },
  zelena: { m: "zeleni", z: "zelena", p: "zeleno", hex: "#2f9e4f" },
  zutozelena: { m: "žutozeleni", z: "žutozelena", p: "žutozeleno", hex: "#a5c22a" },
  zelenkasta: { m: "zelenkasti", z: "zelenkasta", p: "zelenkasto", hex: "#7f9c5c" },
  blijedozelena: { m: "blijedozeleni", z: "blijedozelena", p: "blijedozeleno", hex: "#b7d99c" },
  srebrna: { m: "srebrni", z: "srebrna", p: "srebrno", hex: "#c9ced3" },
  sivkasta: { m: "sivkasti", z: "sivkasta", p: "sivkasto", hex: "#8d9399" },
  tamnosiva: { m: "tamnosivi", z: "tamnosiva", p: "tamnosivo", hex: "#50555a" },
};
const gen = (z) => z.replace(/a$/, "e"); // „plava“ → „plave“
const aku = (z) => z.replace(/a$/, "u"); // „plava“ → „plavu“
const velikoSlovo = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ── formule u tekstu ── Poruke i savjeti formule nose kao oznaku ⟦SO₄²⁻⟧: komponenta ih crta kroz Formula.svelte
// (dijelovi(tekst)), a za markdown (poruka provjere, točan odgovor) uMd() ih pretvara u $\mathrm{SO_{4}^{2-}}$.
export const tex = (f) => `⟦${f}⟧`;
export const dijelovi = (t) => String(t ?? "").split(/⟦([^⟧]*)⟧/).map((z, i) => ({ formula: i % 2 === 1, z })).filter((d) => d.z);
export const uMd = (t) => String(t ?? "").replace(/⟦([^⟧]*)⟧/g, (_, f) => texMath(f));
const SUB_U = "₀₁₂₃₄₅₆₇₈₉";
const SUP_U = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-" };
function texMath(f) {
  let out = "";
  let i = 0;
  const z = [...String(f)];
  while (i < z.length) {
    const c = z[i];
    if (SUB_U.includes(c)) {
      let n = "";
      while (i < z.length && SUB_U.includes(z[i])) n += SUB_U.indexOf(z[i++]);
      out += `_{${n}}`;
    } else if (c in SUP_U) {
      let n = "";
      while (i < z.length && z[i] in SUP_U) n += SUP_U[z[i++]];
      out += `^{${n}}`;
    } else {
      out += c === " " ? "\\ " : /[{}\\$%#&_^~]/.test(c) ? `\\${c}` : c;
      i++;
    }
  }
  return `$\\mathrm{${out}}$`;
}
const E = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), 3)} V`;

// ── tvari ──
// oblik: otopina | tekucina | cvrsto | plin | postupak; boja: ključ iz BOJE (zadano bezbojna); pH za indikatore.
const T = (kljuc, naziv, oblik, cestice, x = {}) => ({ kljuc, naziv, oblik, cestice, boja: "bezbojna", formula: null, ...x });
const SOL = (f, naziv, cestice, x = {}) => T(f, naziv, "otopina", cestice, { formula: f, ...x });

export const TVARI = [
  // soli
  SOL("NaCl", "natrijev klorid", ["Na⁺", "Cl⁻"], { pH: 7 }),
  SOL("KCl", "kalijev klorid", ["K⁺", "Cl⁻"], { pH: 7 }),
  SOL("LiCl", "litijev klorid", ["Li⁺", "Cl⁻"], { pH: 7 }),
  SOL("CsCl", "cezijev klorid", ["Cs⁺", "Cl⁻"], { pH: 7 }),
  SOL("NaBr", "natrijev bromid", ["Na⁺", "Br⁻"], { pH: 7 }),
  SOL("KBr", "kalijev bromid", ["K⁺", "Br⁻"], { pH: 7 }),
  SOL("NaI", "natrijev jodid", ["Na⁺", "I⁻"], { pH: 7 }),
  SOL("KI", "kalijev jodid", ["K⁺", "I⁻"], { pH: 7 }),
  SOL("Na₂SO₄", "natrijev sulfat", ["Na⁺", "SO₄²⁻"], { pH: 7 }),
  SOL("NaNO₃", "natrijev nitrat", ["Na⁺", "NO₃⁻"], { pH: 7 }),
  SOL("KNO₃", "kalijev nitrat", ["K⁺", "NO₃⁻"], { pH: 7 }),
  SOL("Na₂CO₃", "natrijev karbonat", ["Na⁺", "CO₃²⁻"], { pH: 11, aliasi: ["soda"] }),
  SOL("NaHCO₃", "natrijev hidrogenkarbonat", ["Na⁺", "HCO₃⁻"], { pH: 8.3, aliasi: ["soda bikarbona"] }),
  SOL("CH₃COONa", "natrijev acetat", ["Na⁺", "CH₃COO⁻"], { pH: 9, aliasi: ["natrijev etanoat"] }),
  SOL("AgNO₃", "srebrov nitrat", ["Ag⁺", "NO₃⁻"]),
  SOL("BaCl₂", "barijev klorid", ["Ba²⁺", "Cl⁻"], { pH: 7 }),
  SOL("Ba(NO₃)₂", "barijev nitrat", ["Ba²⁺", "NO₃⁻"], { pH: 7 }),
  SOL("CaCl₂", "kalcijev klorid", ["Ca²⁺", "Cl⁻"], { pH: 7 }),
  SOL("SrCl₂", "stroncijev klorid", ["Sr²⁺", "Cl⁻"], { pH: 7 }),
  SOL("MgCl₂", "magnezijev klorid", ["Mg²⁺", "Cl⁻"]),
  SOL("MgSO₄", "magnezijev sulfat", ["Mg²⁺", "SO₄²⁻"]),
  SOL("CuSO₄", "bakrov(II) sulfat", ["Cu²⁺", "SO₄²⁻"], { boja: "plava", aliasi: ["modra galica"] }),
  SOL("CuCl₂", "bakrov(II) klorid", ["Cu²⁺", "Cl⁻"], { boja: "plava" }),
  SOL("FeCl₃", "željezov(III) klorid", ["Fe³⁺", "Cl⁻"], { boja: "zutosmeda" }),
  SOL("FeSO₄", "željezov(II) sulfat", ["Fe²⁺", "SO₄²⁻"], { boja: "blijedozelena" }),
  SOL("ZnCl₂", "cinkov klorid", ["Zn²⁺", "Cl⁻"]),
  SOL("ZnSO₄", "cinkov sulfat", ["Zn²⁺", "SO₄²⁻"]),
  SOL("NiCl₂", "niklov(II) klorid", ["Ni²⁺", "Cl⁻"], { boja: "zelena" }),
  SOL("Pb(NO₃)₂", "olovov(II) nitrat", ["Pb²⁺", "NO₃⁻"]),
  SOL("NH₄Cl", "amonijev klorid", ["NH₄⁺", "Cl⁻"], { pH: 5 }),
  SOL("(NH₄)₂SO₄", "amonijev sulfat", ["NH₄⁺", "SO₄²⁻"], { pH: 5 }),
  // kiseline, lužine, voda
  SOL("HCl", "klorovodična kiselina", ["H⁺", "Cl⁻"], { pH: 1, aliasi: ["razrijeđena klorovodična kiselina", "solna kiselina"] }),
  SOL("H₂SO₄", "sumporna kiselina", ["H⁺", "SO₄²⁻"], { pH: 1, aliasi: ["razrijeđena sumporna kiselina"] }),
  SOL("CH₃COOH", "octena kiselina", ["CH₃COOH"], { pH: 2.5, aliasi: ["etanska kiselina", "ocat"] }),
  T("konc. HCl", "koncentrirana klorovodična kiselina", "otopina", ["konc. HCl"], { formula: "HCl" }),
  SOL("NaOH", "natrijeva lužina", ["Na⁺", "OH⁻"], { pH: 13, aliasi: ["natrijev hidroksid"] }),
  SOL("KOH", "kalijeva lužina", ["K⁺", "OH⁻"], { pH: 13, aliasi: ["kalijev hidroksid"] }),
  SOL("NH₃", "amonijačna voda", ["NH₃"], { pH: 11, aliasi: ["vodena otopina amonijaka"] }),
  T("vapnena voda", "vapnena voda", "otopina", ["Ca(OH)₂"], { formula: "Ca(OH)₂", pH: 12.4 }),
  T("voda", "destilirana voda", "otopina", ["H₂O"], { formula: "H₂O", pH: 7 }),
  // halogeni u vodi
  T("klorna voda", "klorna voda", "otopina", ["Cl₂"], { formula: "Cl₂", boja: "blijedozuta" }),
  T("bromna voda", "bromna voda", "otopina", ["Br₂"], { formula: "Br₂", boja: "narancastosmeda" }),
  T("jodna voda", "jodna voda", "otopina", ["I₂"], { formula: "I₂", boja: "smeda" }),
  // reagensi za dokazne reakcije
  T("Lugolova otopina", "Lugolova otopina", "otopina", ["Lugol"], { boja: "zutosmeda", aliasi: ["Lugol"] }),
  T("Fehlingov reagens", "Fehlingov reagens", "otopina", ["Fehling"], { boja: "modra", aliasi: ["Fehling"] }),
  T("Tollensov reagens", "Tollensov reagens", "otopina", ["Tollens"], { aliasi: ["Tollens"] }),
  T("biuretski reagens", "biuretski reagens", "otopina", ["biuretski"], { boja: "modra", opis: "natrijeva lužina i kap ⟦CuSO₄⟧", aliasi: ["biuret reagens"] }),
  T("fenolftalein", "fenolftalein", "otopina", ["ind:fenolftalein"]),
  T("metiloranž", "metiloranž", "otopina", ["ind:metiloranž"], { boja: "narancasta" }),
  T("lakmus", "lakmus", "otopina", ["ind:lakmus"], { boja: "ljubicasta" }),
  T("univerzalni indikator", "univerzalni indikator", "otopina", ["ind:univerzalni"], { boja: "zelena" }),
  // plinovi
  T("CO₂", "ugljikov(IV) oksid", "plin", ["CO₂"], { formula: "CO₂" }),
  T("izdahnuti zrak", "izdahnuti zrak", "plin", ["CO₂"]),
  // postupci (samo kao reagens)
  T("plamen", "unošenje u plamen", "postupak", ["plamen"], { kratko: "plamen" }),
  T("zagrijavanje", "zagrijavanje u vrućoj vodi", "postupak", ["toplo"], { nakon: "nakon zagrijavanja u vrućoj vodi", kratko: "vruća voda" }),
  T("hlađenje", "hlađenje u ledu", "postupak", ["hladno"], { nakon: "nakon hlađenja u ledu", kratko: "led" }),
  // ravnoteže kompleksa (pokus 12, lekcija 031)
  T("bakrovi kompleksi", "bakrovi kompleksi", "otopina", ["ravnoteža Cu"], { boja: "plavozelena", opis: "⟦CuSO₄⟧ i konc. ⟦HCl⟧" }),
  T("kobaltovi kompleksi", "kobaltovi kompleksi", "otopina", ["ravnoteža Co"], { boja: "ljubicasta", opis: "⟦CoCl₂⟧ i konc. ⟦HCl⟧" }),
  // metali i čvrsti karbonati
  ...["Mg", "Zn", "Fe", "Ni", "Cu", "Ag"].map((m) => T(m, element(m).naziv, "cvrsto", [`kov:${m}`], { formula: m })),
  T("CaCO₃", "kalcijev karbonat", "cvrsto", ["CaCO₃"], { formula: "CaCO₃", aliasi: ["vapnenac", "ljuska jajeta", "mramor"] }),
  T("MgCO₃", "magnezijev karbonat", "cvrsto", ["MgCO₃"], { formula: "MgCO₃" }),
  // ugljikovodici i drugi organski spojevi
  ...[
    ["eten", "C₂H₄", "plin"],
    ["propen", "C₃H₆", "plin"],
    ["but-1-en", "C₄H₈", "plin"],
    ["pent-1-en", "C₅H₁₀", "tekucina"],
    ["heks-1-en", "C₆H₁₂", "tekucina"],
    ["cikloheksen", "C₆H₁₀", "tekucina"],
  ].map(([k, f, o]) => T(k, k, o, ["C=C"], { formula: f })),
  T("etin", "etin", "plin", ["C≡C"], { formula: "C₂H₂", aliasi: ["acetilen"] }),
  ...[
    ["metan", "CH₄", "plin", ["zemni plin"]],
    ["propan", "C₃H₈", "plin"],
    ["butan", "C₄H₁₀", "plin"],
    ["pentan", "C₅H₁₂", "tekucina"],
    ["heksan", "C₆H₁₄", "tekucina"],
    ["cikloheksan", "C₆H₁₂", "tekucina"],
  ].map(([k, f, o, a]) => T(k, k, o, ["zasićen"], { formula: f, aliasi: a })),
  T("benzen", "benzen", "tekucina", ["benzen"], { formula: "C₆H₆" }),
  T("jestivo ulje", "jestivo ulje", "tekucina", ["C=C"], { aliasi: ["ulje"] }),
  T("limonen", "limonen (sok kore limuna)", "tekucina", ["C=C"], { formula: "C₁₀H₁₆" }),
  T("etanol", "etanol", "tekucina", ["alkohol"], { formula: "C₂H₅OH", pH: 7 }),
  T("propanon", "propanon (aceton)", "tekucina", ["keton"], { formula: "CH₃COCH₃", aliasi: ["aceton"] }),
  T("etanal", "etanal (acetaldehid)", "otopina", ["aldehid"], { formula: "CH₃CHO", oksidacija: ["CH₃CHO", "CH₃COO⁻"], aliasi: ["acetaldehid"] }),
  T("metanal", "metanal (formaldehid)", "otopina", ["aldehid"], { formula: "HCHO", oksidacija: ["HCHO", "HCOO⁻"], aliasi: ["formaldehid"] }),
  // biomolekule (vodene otopine)
  T("glukoza", "glukoza", "otopina", ["reducirajući šećer"], { formula: "C₆H₁₂O₆", skrijFormulu: true, oksidacija: ["C₆H₁₂O₆", "C₆H₁₁O₇⁻"] }),
  ...["fruktoza", "galaktoza", "maltoza", "laktoza", "riboza"].map((k) => T(k, k, "otopina", ["reducirajući šećer"])),
  ...["saharoza", "trehaloza"].map((k) => T(k, k, "otopina", ["nereducirajući šećer"])),
  T("škrob", "škrob", "otopina", ["škrob"]),
  T("glikogen", "glikogen", "otopina", ["polisaharid"]),
  T("bjelanjak", "bjelanjak jajeta", "otopina", ["protein"], { aliasi: ["otopina bjelanjka"] }),
  T("želatina", "želatina", "otopina", ["protein"]),
  T("kazein", "kazein (protein mlijeka)", "otopina", ["protein"]),
  T("ureja", "ureja", "otopina", ["ureja"]),
  T("biuret", "biuret", "otopina", ["biuret"]),
];

// „Na2SO4“ → „Na₂SO₄“ (autor smije pisati obične znamenke)
const norm = (k) => String(k ?? "").trim().replace(/(?<=[A-Za-z)])(\d+)/g, (d) => [...d].map((c) => SUB_U[c]).join(""));
const INDEKS = new Map();
for (const t of TVARI) for (const k of [t.kljuc, t.formula && t.oblik !== "postupak" ? t.formula : null, t.naziv, ...(t.aliasi ?? [])]) if (k && !INDEKS.has(k.toLowerCase())) INDEKS.set(k.toLowerCase(), t);
export const tvar = (k) => INDEKS.get(norm(k).toLowerCase()) ?? INDEKS.get(String(k ?? "").trim().toLowerCase()) ?? null;
export const ime = (t) => (t.formula && !t.skrijFormulu && t.oblik !== "postupak" && t.kljuc !== "konc. HCl" ? (t.naziv.endsWith(")") ? t.naziv.replace(/\)$/, `, ${tex(t.formula)})`) : `${t.naziv} (${tex(t.formula)})`) : t.naziv);

// ── tablica topljivosti (razrijeđene otopine, kap reagensa) ── null = topljivo, [formula, boja] = talog
const TOPLJIVOST = {
  "Ag⁺": { "Cl⁻": ["AgCl", "bijela"], "Br⁻": ["AgBr", "zuckasta"], "I⁻": ["AgI", "zuta"], "NO₃⁻": null, "SO₄²⁻": null },
  "Ba²⁺": { "Cl⁻": null, "Br⁻": null, "I⁻": null, "NO₃⁻": null, "OH⁻": null, "SO₄²⁻": ["BaSO₄", "bijela"], "CO₃²⁻": ["BaCO₃", "bijela"] },
  "Ca²⁺": { "Cl⁻": null, "Br⁻": null, "I⁻": null, "NO₃⁻": null, "CO₃²⁻": ["CaCO₃", "bijela"] },
  "Sr²⁺": { "Cl⁻": null, "Br⁻": null, "I⁻": null, "NO₃⁻": null },
  "Mg²⁺": { "Cl⁻": null, "Br⁻": null, "I⁻": null, "NO₃⁻": null, "SO₄²⁻": null, "OH⁻": ["Mg(OH)₂", "bijela"], "CO₃²⁻": ["MgCO₃", "bijela"] },
  "Cu²⁺": { "Cl⁻": null, "Br⁻": null, "NO₃⁻": null, "SO₄²⁻": null, "OH⁻": ["Cu(OH)₂", "plava"] },
  "Fe³⁺": { "Cl⁻": null, "NO₃⁻": null, "SO₄²⁻": null, "OH⁻": ["Fe(OH)₃", "crvenosmeda"] },
  "Fe²⁺": { "Cl⁻": null, "NO₃⁻": null, "SO₄²⁻": null, "OH⁻": ["Fe(OH)₂", "zelenkasta"] },
  "Zn²⁺": { "Cl⁻": null, "Br⁻": null, "I⁻": null, "NO₃⁻": null, "SO₄²⁻": null, "OH⁻": ["Zn(OH)₂", "bijela"] },
  "Ni²⁺": { "Cl⁻": null, "NO₃⁻": null, "SO₄²⁻": null, "OH⁻": ["Ni(OH)₂", "zelena"] },
  "Pb²⁺": { "NO₃⁻": null, "I⁻": ["PbI₂", "zuta"] },
  "NH₄⁺": { "Cl⁻": null, "Br⁻": null, "I⁻": null, "NO₃⁻": null, "SO₄²⁻": null, "CO₃²⁻": null },
  "H⁺": { "Cl⁻": null, "Br⁻": null, "I⁻": null, "NO₃⁻": null, "SO₄²⁻": null },
};
// čestice koje ni s čim iz baze ne daju vidljivu promjenu (osim u plamenu i s indikatorom)
const PROMATRACI = new Set(["Na⁺", "K⁺", "Li⁺", "Cs⁺", "NO₃⁻", "H₂O"]);
const kation = (c) => /⁺$/.test(c);
const anion = (c) => /⁻$/.test(c);

// metal → njegov ion u otopini (Fe u kiselini daje Fe²⁺); E° s ispitnog lista
const ION_METALA = { Mg: "Mg²⁺", Zn: "Zn²⁺", Fe: "Fe²⁺", Ni: "Ni²⁺", Cu: "Cu²⁺", Ag: "Ag⁺", Pb: "Pb²⁺", Ca: "Ca²⁺", Ba: "Ba²⁺" };
const METAL_IONA = Object.fromEntries(Object.entries(ION_METALA).map(([m, i]) => [i, m]));
const potencijal = (ion, red) => POTENCIJALI.find((p) => p.oks === ion && p.red === red)?.E;
const E_METALA = (m) => potencijal(ION_METALA[m], m);
// izgled izlučenog metala
const PREVLAKA = { Cu: ["crvenkasta", "prevlaka"], Ag: ["sivkasta", "kristalici"], Zn: ["tamnosiva", "prevlaka"], Pb: ["tamnosiva", "prevlaka"], Ni: ["tamnosiva", "prevlaka"], Fe: ["tamnosiva", "prevlaka"] };
const BOJA_IONA = { "Cu²⁺": "plava", "Fe²⁺": "blijedozelena", "Ni²⁺": "zelena", "Fe³⁺": "zutosmeda" };
const HALOGENI = { "Cl₂": "Cl⁻", "Br₂": "Br⁻", "I₂": "I⁻" };
const BOJA_HALOGENA = { "Br₂": "zutonarancasta", "I₂": "smeda" }; // nastali halogen u razrijeđenoj otopini (lekcija 016)
const IME_HALOGENA = { "Cl₂": "klor", "Br₂": "brom", "I₂": "jod" };
const GEN_HALOGENA = { "Cl₂": "klora", "Br₂": "broma", "I₂": "joda" };

// jakost razvijanja vodika po E° metala (lekcija 035: Mg burno, Zn živo, Fe polagano, Ni tek pokoji mjehurić)
const jakostH2 = (e) => (e < -2 ? 4 : e < -0.6 ? 3 : e < -0.35 ? 2 : 1);

// ── jednadžbe ── {reaktanti, produkti, stanja?, strelica?, iznad?, koeficijenti?} (format widgeta „jednadzba“)
const stanjeCestice = (f, talog) => (f === talog ? "s" : /[⁺⁻]$/.test(f) ? "aq" : f === "H₂O" ? "l" : ["CO₂", "H₂", "NH₃"].includes(f) ? "g" : null);
function jed(reaktanti, produkti, { stanja, talog, iznad, strelica, koeficijenti, bezStanja } = {}) {
  const sve = [...reaktanti, ...produkti];
  const st = bezStanja ? null : (stanja ?? sve.map((f) => stanjeCestice(f, talog)));
  return { reaktanti, produkti, ...(st && st.every(Boolean) ? { stanja: st } : {}), ...(iznad ? { iznad } : {}), ...(strelica ? { strelica } : {}), ...(koeficijenti ? { koeficijenti } : {}) };
}

// ── izričita pravila za par čestica ── r: reakcija (opažanje + jednadžba + savjet); n: nema vidljive promjene (zasto)
// Funkcije dobivaju (A, B): tvar s prvom i tvar s drugom česticom para.
const PRAVILA = {};
const pravilo = (a, b, p) => {
  PRAVILA[`${a}|${b}`] = { ...p, red: [a, b] };
};
// „zasto“ je dio rečenice o tvari s drugom česticom: nista("Fehling", "keton", "je keton …") → „Propanon je keton …“
const nista = (a, b, zasto) => pravilo(a, b, { nista: true, poruka: zasto ? (P, Q) => `${velikoSlovo(Q.naziv)} ${zasto}.` : null });

pravilo("H⁺", "OH⁻", { toplina: true, jednadzba: () => jed(["H⁺", "OH⁻"], ["H₂O"]), savjet: "Kiselina i lužina se neutraliziraju: nastaje voda, a otopina se malo zagrije." });
pravilo("CH₃COOH", "OH⁻", { toplina: true, jednadzba: () => jed(["CH₃COOH", "OH⁻"], ["CH₃COO⁻", "H₂O"], { stanja: ["aq", "aq", "aq", "l"] }), savjet: "Octena kiselina i lužina se neutraliziraju." });
pravilo("NH₃", "H⁺", { toplina: true, jednadzba: () => jed(["NH₃", "H⁺"], ["NH₄⁺"], { stanja: ["aq", "aq", "aq"] }), savjet: `Amonijak veže ion ${tex("H⁺")} i nastaje amonijev ion.` });
pravilo("Ca(OH)₂", "H⁺", { toplina: true, jednadzba: () => jed(["Ca(OH)₂", "H⁺"], ["Ca²⁺", "H₂O"], { stanja: ["aq", "aq", "aq", "l"] }), savjet: "Kiselina neutralizira vapnenu vodu." });
pravilo("H⁺", "CH₃COO⁻", { jednadzba: () => jed(["CH₃COO⁻", "H⁺"], ["CH₃COOH"], { stanja: ["aq", "aq", "aq"] }), savjet: `Acetatni ion veže ${tex("H⁺")} u octenu kiselinu, koja ostaje otopljena.` });
pravilo("NH₄⁺", "OH⁻", {
  plin: { formula: "NH₃", miris: true, jakost: 1 },
  zagrijavanje: true,
  jednadzba: () => jed(["NH₄⁺", "OH⁻"], ["NH₃", "H₂O"], { iznad: "zagrijavanje" }),
  savjet: `Lužina iz amonijeva iona oslobađa amonijak: osjeti se njegov oštar miris, a navlaženi crveni lakmusov papir na otvoru epruvete poplavi.`,
});
// karbonati i hidrogenkarbonati s kiselinom → CO₂
for (const kis of ["H⁺", "CH₃COOH"])
  for (const k of ["CO₃²⁻", "HCO₃⁻", "CaCO₃", "MgCO₃"]) {
    const cvrsto = k === "CaCO₃" || k === "MgCO₃";
    pravilo(kis, k, {
      plin: { formula: "CO₂", jakost: 3 },
      otapanje: cvrsto,
      jednadzba: () => {
        const r = [k, kis];
        const p = [...(cvrsto ? [k === "CaCO₃" ? "Ca²⁺" : "Mg²⁺"] : []), ...(kis === "CH₃COOH" ? ["CH₃COO⁻"] : []), "CO₂", "H₂O"];
        const st = [cvrsto ? "s" : "aq", "aq", ...p.map((f) => stanjeCestice(f))];
        return jed(r, p, { stanja: st });
      },
      savjet: `Kiselina s ${k === "HCO₃⁻" ? "hidrogenkarbonatom" : "karbonatom"} daje ugljičnu kiselinu, koja se odmah raspada na vodu i ${tex("CO₂")}: zato se pjeni.`,
    });
  }
pravilo("CO₂", "Ca(OH)₂", {
  zamucenje: { boja: "bijela", formula: "CaCO₃" },
  jednadzba: () => jed(["CO₂", "Ca(OH)₂"], ["CaCO₃", "H₂O"], { stanja: ["g", "aq", "s", "l"] }),
  savjet: `${tex("CO₂")} je kiseli oksid: s vapnenom vodom daje slabo topljivi kalcijev karbonat, sitne bijele čestice raspršene po cijeloj otopini.`,
});
pravilo("CO₂", "OH⁻", { jednadzba: () => jed(["CO₂", "OH⁻"], ["CO₃²⁻", "H₂O"], { stanja: ["g", "aq", "aq", "l"] }), savjet: `${tex("CO₂")} reagira s lužinom, ali nastali natrijev karbonat je topljiv.` });
pravilo("Ca(OH)₂", "CO₃²⁻", {
  talog: { formula: "CaCO₃", boja: "bijela" },
  jednadzba: () => jed(["Ca(OH)₂", "CO₃²⁻"], ["CaCO₃", "OH⁻"], { stanja: ["aq", "aq", "s", "aq"] }),
  savjet: `Ioni ${tex("Ca²⁺")} i ${tex("CO₃²⁻")} daju slabo topljivi kalcijev karbonat.`,
});
nista("Ca(OH)₂", "Cl⁻", "");
nista("CO₂", "Cl⁻", "");

// adicija halogena na dvostruku (trostruku) vezu → obezbojenje (pokus 9, lekcija 021)
for (const X of ["Br₂", "I₂"]) {
  const vise = (n) => [...String(n)].map((c) => SUB_U[c]).join("");
  pravilo(X, "C=C", {
    boja: "bezbojna",
    jednadzba: (A, B) => (B.formula && B.kljuc !== "limonen" ? jed([B.formula, X], [`${B.formula}${X[0]}${X[1] === "r" ? "r" : ""}${vise(2)}`], { bezStanja: true }) : null),
    savjet: `${velikoSlovo(IME_HALOGENA[X])} se adira na dvostruku vezu i troši se, pa boja nestane: to je dokaz nezasićenosti.`,
  });
  nista(X, "zasićen", "je zasićen: nema dvostruku ni trostruku vezu na koju bi se halogen adirao");
  nista(X, "benzen", "ne adira halogen kao alkeni: njegove veze su delokalizirane i stabilne");
  nista(X, "alkohol", "nema dvostruku vezu na koju bi se halogen adirao");
}
pravilo("Br₂", "C≡C", {
  boja: "bezbojna",
  jednadzba: (A, B) => jed([B.formula, "Br₂"], ["C₂H₂Br₄"], { bezStanja: true }),
  savjet: "Brom se adira na trostruku vezu i troši se, pa boja nestane: to je dokaz nezasićenosti.",
});
// jod i škrob (lekcije 023, 044: „tamnoplavo“, „tamnomodro“)
pravilo("I₂", "škrob", { boja: "tamnoplava", savjet: "Jod sa škrobom daje tamnoplavi (modroljubičasti) spoj: tako se dokazuje škrob." });
pravilo("Lugol", "škrob", { boja: "tamnoplava", savjet: "Jod iz Lugolove otopine sa škrobom daje tamnoplavi (modroljubičasti) spoj: tako se dokazuje škrob." });
for (const c of ["reducirajući šećer", "nereducirajući šećer", "protein"]) nista("Lugol", c, "nije škrob, pa s jodom ne daje tamnoplavu boju");

// Fehling i Tollens: reducirajući šećeri i aldehidi (pokus 10, lekcija 023)
const NEREDUCIRA = {
  "nereducirajući šećer": "nema slobodnu aldehidnu skupinu (nije reducirajući šećer)",
  škrob: "nema slobodnu aldehidnu skupinu: škrob nije reducirajući šećer",
  polisaharid: "nema slobodnu aldehidnu skupinu: polisaharid nije reducirajući šećer",
  keton: "je keton: nema aldehidnu skupinu koja bi reducirala reagens",
  alkohol: "nema aldehidnu skupinu koja bi reducirala reagens",
};
for (const c of ["reducirajući šećer", "aldehid"]) {
  pravilo("Fehling", c, {
    talog: { formula: "Cu₂O", boja: "crvenosmeda" },
    boja: "bezbojna",
    zagrijavanje: true,
    jednadzba: (A, B) => (B.oksidacija ? jed([B.oksidacija[0], "Cu²⁺", "OH⁻"], [B.oksidacija[1], "Cu₂O", "H₂O"], { iznad: "zagrijavanje", stanja: ["aq", "aq", "aq", "aq", "s", "l"] }) : null),
    savjet: `Aldehidna skupina reducira bakrove(II) ione u crvenosmeđi bakrov(I) oksid, ${tex("Cu₂O")}, a sama se oksidira.`,
  });
  pravilo("Tollens", c, {
    zrcalo: true,
    zagrijavanje: true,
    jednadzba: (A, B) => (B.oksidacija ? jed([B.oksidacija[0], "Ag⁺", "OH⁻"], [B.oksidacija[1], "Ag", "H₂O"], { iznad: "zagrijavanje", stanja: ["aq", "aq", "aq", "aq", "s", "l"] }) : null),
    savjet: `Aldehidna skupina reducira srebrove ione u srebro, koje se uhvati na stijenku epruvete kao zrcalo.`,
  });
}
for (const [c, z] of Object.entries(NEREDUCIRA)) {
  nista("Fehling", c, z);
  nista("Tollens", c, z);
  PRAVILA[`Fehling|${c}`].zagrijavanje = PRAVILA[`Tollens|${c}`].zagrijavanje = true;
}
// biuret reakcija (pokus 11, lekcije 023, 044)
for (const c of ["protein", "biuret"]) pravilo("biuretski", c, { boja: "ljubicasta", savjet: "Bakrovi(II) ioni u lužnatoj otopini s peptidnim vezama daju ljubičasti kompleks." });
for (const [c, z] of [
  ["reducirajući šećer", "nema peptidnih veza"],
  ["nereducirajući šećer", "nema peptidnih veza"],
  ["škrob", "nema peptidnih veza"],
  ["polisaharid", "nema peptidnih veza"],
  ["ureja", "nema peptidnu vezu (ima je tek biuret, koji nastaje zagrijavanjem ureje)"],
  ["alkohol", "nema peptidnih veza"],
])
  nista("biuretski", c, z);

// ravnoteže kompleksa: [Cu(H₂O)₄]²⁺ (plavi) + 4 Cl⁻ ⇌ [CuCl₄]²⁻ (žutozeleni), endotermno udesno (pokus 12, lekcija 031)
const RAVNOTEZA = {
  Cu: { lijevo: "[Cu(H₂O)₄]²⁺", desno: "[CuCl₄]²⁻", voda: 4, bojaL: "plava", bojaD: "zutozelena" },
  Co: { lijevo: "[Co(H₂O)₆]²⁺", desno: "[CoCl₄]²⁻", voda: 6, bojaL: "ruzicasta", bojaD: "plava" },
};
const jedRavnoteze = (r) => jed([r.lijevo, "Cl⁻"], [r.desno, "H₂O"], { strelica: "⇌", koeficijenti: [1, 4, 1, r.voda], stanja: ["aq", "aq", "aq", "l"] });
const dat = (m) => m.replace(/i$/, "om"); // „plavi“ → „plavom“
for (const [m, r] of Object.entries(RAVNOTEZA)) {
  const L = `${dat(BOJE[r.bojaL].m)} ${tex(r.lijevo)}`;
  const D = `${dat(BOJE[r.bojaD].m)} ${tex(r.desno)}`;
  const j = () => jedRavnoteze(r);
  pravilo(`ravnoteža ${m}`, "toplo", { boja: r.bojaD, zagrijavanje: true, jednadzba: j, savjet: `Zagrijavanjem se ravnoteža pomiče udesno, u endotermnom smjeru, prema ${D}.` });
  pravilo(`ravnoteža ${m}`, "hladno", { boja: r.bojaL, hladenje: true, jednadzba: j, savjet: `Hlađenjem se ravnoteža pomiče ulijevo, u egzotermnom smjeru, prema ${L}.` });
  pravilo(`ravnoteža ${m}`, "H₂O", { boja: r.bojaL, jednadzba: j, savjet: `Razrjeđivanjem se ravnoteža pomiče ulijevo, na stranu s više otopljenih čestica, prema ${L}.` });
  pravilo(`ravnoteža ${m}`, "konc. HCl", { boja: r.bojaD, jednadzba: j, savjet: `Dodani kloridni ioni pomiču ravnotežu udesno, prema ${D}.` });
}
pravilo("ravnoteža Cu", "Cu²⁺", { boja: "plava", savjet: `Suvišak bakrova(II) sulfata daje više plavih iona ${tex("[Cu(H₂O)₄]²⁺")}, pa otopina postane plavija.` });
nista("ravnoteža Cu", "SO₄²⁻", "");
pravilo("Cu²⁺", "konc. HCl", {
  boja: "plavozelena",
  jednadzba: () => jedRavnoteze(RAVNOTEZA.Cu),
  savjet: `Kloridni ioni zamjenjuju molekule vode oko bakrova iona: uz plavi ${tex("[Cu(H₂O)₄]²⁺")} nastaje i žutozeleni ${tex("[CuCl₄]²⁻")}, pa je otopina plavozelena.`,
});
nista("SO₄²⁻", "konc. HCl", "");

// ── par čestica ── → {r} reakcija, {n} bez promjene, null nepoznato
function parCestica(a, b, A, B) {
  const izr = PRAVILA[`${a}|${b}`] ?? PRAVILA[`${b}|${a}`];
  if (izr) {
    const [x] = izr.red;
    const [P, Q] = x === a ? [A, B] : [B, A];
    return izr.nista ? { n: true, ...izr, P, Q } : { r: true, ...izr, P, Q };
  }
  if (a === b) return { n: true };
  // ioni: tablica topljivosti; kation + kation i anion + anion ne reagiraju
  // kation + kation i anion + anion ne reagiraju, osim redoks-parova (Ag⁺ polagano oksidira Fe²⁺ i izluči srebro)
  if ([a, b].includes("Ag⁺") && [a, b].includes("Fe²⁺")) return null;
  if ((kation(a) && kation(b)) || (anion(a) && anion(b))) return { n: true };
  for (const [k, an] of [
    [a, b],
    [b, a],
  ]) {
    if (kation(k) && anion(an) && TOPLJIVOST[k] && an in TOPLJIVOST[k]) {
      const t = TOPLJIVOST[k][an];
      if (!t) return { n: true };
      const [P, Q] = k === a ? [A, B] : [B, A];
      return {
        r: true,
        talog: { formula: t[0], boja: t[1] },
        jednadzba: () => jed([k, an], [t[0]], { talog: t[0] }),
        savjet: `Ioni ${tex(k)} i ${tex(an)} daju slabo topljivu tvar, ${tex(t[0])}, koja se izlučuje kao talog.`,
        P,
        Q,
        red: [k, an],
      };
    }
  }
  // čvrsti karbonat s ionima koji ga ne otapaju
  for (const [k, x] of [
    [a, b],
    [b, a],
  ])
    if ((k === "CaCO₃" || k === "MgCO₃") && anion(x) && x !== "OH⁻" && x !== "CO₃²⁻") return { n: true };
  // metal + kiselina, metal + ion drugog metala (Voltin niz)
  for (const [k, x] of [
    [a, b],
    [b, a],
  ]) {
    if (!k.startsWith("kov:")) continue;
    const m = k.slice(4);
    const Em = E_METALA(m);
    const [P, Q] = k === a ? [A, B] : [B, A];
    const nazivM = element(m).naziv;
    if (x === "H⁺") {
      if (Em >= 0) return { n: true, poruka: () => `${velikoSlovo(nazivM)} ima pozitivan elektrodni potencijal, E°(${tex(ION_METALA[m])}/${tex(m)}) = ${E(Em)}, pa ne istiskuje vodik iz kiseline.` };
      const j = jakostH2(Em);
      return {
        r: true,
        plin: { formula: "H₂", jakost: j },
        jednadzba: () => jed([m, "H⁺"], [ION_METALA[m], "H₂"], { stanja: ["s", "aq", "aq", "g"] }),
        savjet: `${velikoSlovo(nazivM)} ima negativan elektrodni potencijal, E° = ${E(Em)}: predaje elektrone vodikovim ionima iz kiseline i razvija se vodik.`,
        P,
        Q,
        red: [k, x],
      };
    }
    if (x === "CH₃COOH") {
      if (m === "Mg")
        return { r: true, plin: { formula: "H₂", jakost: 3 }, jednadzba: () => jed(["Mg", "CH₃COOH"], ["Mg²⁺", "CH₃COO⁻", "H₂"], { stanja: ["s", "aq", "aq", "aq", "g"] }), savjet: "Magnezij s octenom kiselinom razvija vodik.", P, Q, red: [k, x] };
      if (Em >= 0) return { n: true, poruka: () => `${velikoSlovo(nazivM)} ima pozitivan elektrodni potencijal, pa ne istiskuje vodik iz kiseline.` };
      return null;
    }
    if (kation(x) && METAL_IONA[x] && x !== "Fe³⁺") {
      const n = METAL_IONA[x];
      if (n === m) return { n: true };
      const En = potencijal(x, n);
      if (En == null || Em == null) return null;
      if (En <= Em) return { n: true, poruka: () => `${velikoSlovo(nazivM)} ima viši elektrodni potencijal (${E(Em)}) od ${genitivMetala(n)} (${E(En)}), pa ne istiskuje ${element(n).naziv} iz otopine.` };
      const [bojaPrevlake, oblik] = PREVLAKA[n] ?? ["tamnosiva", "prevlaka"];
      const bojaIzlaza = BOJA_IONA[ION_METALA[m]] ?? "bezbojna";
      return {
        r: true,
        prevlaka: { metal: n, boja: bojaPrevlake, oblik },
        boja: bojaIzlaza,
        blijedi: true,
        jednadzba: () => jed([m, x], [ION_METALA[m], n], { stanja: ["s", "aq", "aq", "s"] }),
        savjet: `${velikoSlovo(nazivM)} ima niži elektrodni potencijal (${E(Em)}) od para ${tex(x)}/${tex(n)} (${E(En)}): predaje elektrone ionima ${tex(x)}, koji se izlučuju kao ${element(n).naziv}.`,
        P,
        Q,
        red: [k, x],
      };
    }
    if (anion(x) && x !== "OH⁻") return { n: true };
    if (kation(x) && ["Ba²⁺", "Ca²⁺", "Na⁺", "K⁺", "Li⁺"].includes(x)) return { n: true };
  }
  // halogen + halogenid: jači oksidans istiskuje slabiji halogen
  for (const [h, x] of [
    [a, b],
    [b, a],
  ]) {
    if (!HALOGENI[h] || !Object.values(HALOGENI).includes(x)) continue;
    const Y = Object.keys(HALOGENI).find((k) => HALOGENI[k] === x);
    const Eh = potencijal(h, HALOGENI[h]);
    const Ey = potencijal(Y, x);
    if (Y === h) return { n: true };
    const [P, Q] = h === a ? [A, B] : [B, A];
    if (Eh <= Ey) return { n: true, poruka: () => `${velikoSlovo(IME_HALOGENA[h])} je slabije oksidacijsko sredstvo od ${GEN_HALOGENA[Y]} (E° = ${E(Eh)} < ${E(Ey)}), pa ga ne istiskuje iz soli.` };
    return {
      r: true,
      boja: BOJA_HALOGENA[Y],
      jednadzba: () => jed([h, x], [HALOGENI[h], Y], { stanja: ["aq", "aq", "aq", "aq"] }),
      savjet: `${velikoSlovo(IME_HALOGENA[h])} je jače oksidacijsko sredstvo (E° = ${E(Eh)}) od ${GEN_HALOGENA[Y]} (${E(Ey)}): oduzima elektrone ionima ${tex(x)} i nastaje ${IME_HALOGENA[Y]}.`,
      P,
      Q,
      red: [h, x],
    };
  }
  if (PROMATRACI.has(a) || PROMATRACI.has(b)) return { n: true };
  return null;
}

// ── indikatori i plamen ──
// pH → boja; null = prijelazno područje (boja nije jednoznačna, par nije u bazi)
const INDIKATORI = {
  fenolftalein: (pH) => (pH <= 8 ? "bezbojna" : pH >= 9 ? "ruzicastoljubicasta" : null),
  metiloranž: (pH) => (pH <= 3 ? "crvena" : pH >= 4.5 ? "zuta" : null),
  lakmus: (pH) => (pH <= 5 ? "crvena" : pH >= 6.5 && pH <= 7.5 ? "ljubicasta" : pH >= 8.5 ? "plava" : null),
  univerzalni: (pH) => (pH < 3.5 ? "crvena" : pH < 5.5 ? "narancasta" : pH < 6.5 ? "zuta" : pH <= 7.5 ? "zelena" : pH < 9 ? "zelenoplava" : pH < 11.5 ? "plava" : "ljubicasta"),
};
const podrucje = (pH) => (pH < 6.5 ? "kisela" : pH <= 7.5 ? "neutralna" : "lužnata");
// boje plamena (lekcija 013: Li crveno, Na žuto, Ba zeleno, Cs plavo; školski udžbenik za ostale)
const PLAMEN = { "Li⁺": "crvena", "Na⁺": "zuta", "K⁺": "ljubicasta", "Ca²⁺": "narancastocrvena", "Sr²⁺": "crvena", "Ba²⁺": "zutozelena", "Cu²⁺": "plavozelena", "Cs⁺": "plava" };
const IME_IONA = { "Li⁺": "litijevi", "Na⁺": "natrijevi", "K⁺": "kalijevi", "Ca²⁺": "kalcijevi", "Sr²⁺": "stroncijevi", "Ba²⁺": "barijevi", "Cu²⁺": "bakrovi(II)", "Cs⁺": "cezijevi" };

const tekuce = (t) => t.oblik === "otopina" || t.oblik === "tekucina";

// ── pokus: tvar u epruveti + reagens → opažanje ili {greska} ──
// Opažanje: {talog?, zamucenje?, prevlaka?, zrcalo?, plin?, plamen?, boja: {prije, poslije}, blijedi?, toplina?,
// zagrijavanje?, hladenje?, otapanje?, jednadzbe: [], savjet (markdown), reakcija: bool, cestice?: [a, b]}
const cache = new Map();
export function pokus(kT, kR) {
  const kljuc = `${kT}→${kR}`;
  if (!cache.has(kljuc)) cache.set(kljuc, izracunaj(tvar(kT), tvar(kR), kT, kR));
  return cache.get(kljuc);
}

function izracunaj(A, R, kT, kR) {
  if (!A) return { greska: `nepoznata tvar „${kT}“` };
  if (!R) return { greska: `nepoznat reagens „${kR}“` };
  if (A === R) return { greska: `tvar i reagens su ista tvar (${A.kljuc})` };
  if (A.oblik === "postupak") return { greska: `„${A.kljuc}“ je postupak, pa ide u reagens, a ne u epruvetu` };
  const indA = A.cestice.find((c) => c.startsWith("ind:"));
  const indR = R.cestice.find((c) => c.startsWith("ind:"));

  // plamen
  if (R.cestice.includes("plamen")) {
    if (A.oblik !== "otopina" && A.oblik !== "cvrsto") return { greska: `u plamen se unosi sol (otopina ili čvrsta tvar), a ne ${A.kljuc}` };
    const boje = A.cestice.filter((c) => PLAMEN[c]);
    if (boje.length !== 1 || A.cestice.some((c) => !PLAMEN[c] && !anion(c))) return { greska: `za ${A.kljuc} boja plamena nije u bazi (poznate su soli Li, Na, K, Ca, Sr, Ba, Cu, Cs)` };
    const ion = boje[0];
    return { plamen: PLAMEN[ion], boja: { prije: A.boja, poslije: A.boja }, jednadzbe: [], reakcija: true, cestice: [ion], savjet: `${velikoSlovo(IME_IONA[ion])} ioni, ${tex(ion)}, boje plamen ${BOJE[PLAMEN[ion]].p}: toplina pobudi elektrone, a oni pri povratku zrače svjetlost te boje.` };
  }
  if (A.oblik === "postupak" || (R.oblik === "postupak" && !tekuce(A))) return { greska: `postupak „${R.kljuc}“ ide samo uz otopinu` };

  // indikator
  if (indA || indR) {
    if (indA && indR) return { greska: "dva indikatora zajedno nisu pokus" };
    const [I, X] = indR ? [R, A] : [A, R];
    const ind = (indR ?? indA).slice(4);
    if (X.pH == null) return { greska: `za ${X.kljuc} nije zadan pH, pa boja indikatora nije u bazi` };
    if (X.boja !== "bezbojna") return { greska: `${X.kljuc} je obojena otopina, pa boja indikatora u njoj nije jednoznačna` };
    const b = INDIKATORI[ind](X.pH);
    if (!b) return { greska: `pH ${formatNumber(X.pH)} (${X.kljuc}) je u prijelaznom području indikatora ${ind}, pa boja nije jednoznačna` };
    const pr = podrucje(X.pH);
    return {
      boja: { prije: "bezbojna", poslije: b },
      jednadzbe: [],
      reakcija: b !== "bezbojna",
      indikator: { ime: I.naziv, pH: X.pH },
      cestice: [],
      savjet: `Otopina je ${pr} (pH oko ${formatNumber(X.pH)}), a ${I.naziv} je u ${pr === "kisela" ? "kiselom" : pr === "neutralna" ? "neutralnom" : "lužnatom"} ${b === "bezbojna" ? "bezbojan" : BOJE[b].m.replace(/i$/, "")}.`,
    };
  }

  if (!tekuce(A) && !tekuce(R)) return { greska: `${A.kljuc} i ${R.kljuc}: barem jedno mora biti otopina ili tekućina` };

  // boja prije reakcije: tekućina u epruveti nakon dodavanja
  const boje = [A, R].filter(tekuce).map((t) => t.boja);
  const obojene = [...new Set(boje.filter((b) => b !== "bezbojna"))];

  const reakcije = [];
  const bez = [];
  for (const a of A.cestice)
    for (const b of R.cestice) {
      const p = parCestica(a, b, A, R);
      if (!p) return { greska: `nije poznato što se vidi kad se sretnu ${a} (${A.kljuc}) i ${b} (${R.kljuc}), pa taj par nije u bazi` };
      if (p.r) reakcije.push({ ...p, a, b });
      else if (p.poruka) bez.push(p.poruka(p.P ?? A, p.Q ?? R));
    }
  const sa = (f) => reakcije.filter((r) => r[f]);
  for (const f of ["talog", "plin", "boja", "prevlaka", "zamucenje"]) if (new Set(sa(f).map((r) => JSON.stringify(r[f]))).size > 1) return { greska: `${A.kljuc} i ${R.kljuc} daju više istodobnih promjena (${f}), a takav pokus nije u bazi` };
  const prekriva = reakcije.find((r) => r.boja);
  if (obojene.length > 1 && !prekriva) return { greska: `${A.kljuc} i ${R.kljuc} su obje obojene, a boja smjese nije u bazi` };
  const prije = obojene.length === 1 ? obojene[0] : obojene.length ? A.boja : "bezbojna";
  const glavna = reakcije.find((r) => r.talog || r.plin || r.prevlaka || r.zrcalo || r.zamucenje || r.boja) ?? reakcije[0];
  const o = {
    talog: sa("talog")[0]?.talog ?? null,
    zamucenje: sa("zamucenje")[0]?.zamucenje ?? null,
    prevlaka: sa("prevlaka")[0]?.prevlaka ?? null,
    zrcalo: reakcije.some((r) => r.zrcalo),
    plin: sa("plin")[0]?.plin ?? null,
    plamen: null,
    boja: { prije, poslije: prekriva?.boja ?? prije },
    blijedi: !!prekriva?.blijedi,
    toplina: reakcije.some((r) => r.toplina),
    zagrijavanje: reakcije.some((r) => r.zagrijavanje) || A.cestice.some((a) => R.cestice.some((b) => (PRAVILA[`${a}|${b}`] ?? PRAVILA[`${b}|${a}`])?.zagrijavanje)),
    hladenje: reakcije.some((r) => r.hladenje),
    otapanje: reakcije.some((r) => r.otapanje),
    jednadzbe: reakcije.map((r) => r.jednadzba?.(r.P, r.Q)).filter(Boolean),
    cestice: glavna ? glavna.red : null,
    reakcija: reakcije.length > 0,
  };
  // savjet: zašto se to vidi, ili zašto nema promjene
  o.savjet = reakcije.length ? (glavna.savjet ?? "") : (bez[0] ?? "Nijedan par čestica ne daje slabo topljivu tvar, plin ni obojeni spoj.");
  return o;
}

// ── zapis opažanja ──
const PLIN_TEKST = {
  4: "Burno se razvijaju mjehurići plina.",
  3: "Živo se razvijaju mjehurići plina.",
  2: "Polagano se razvijaju mjehurići plina.",
  1: "Tek se polagano javlja pokoji mjehurić plina.",
};
const imaPromjenu = (o) => !!(o.talog || o.zamucenje || o.prevlaka || o.zrcalo || o.plin || o.plamen || o.boja.poslije !== o.boja.prije);

// Rečenice opažanja (obični tekst, bez formula): što učenik vidi.
export function opis(o) {
  const r = [];
  if (o.plamen) return `Plamen se oboji ${BOJE[o.plamen].p}.`;
  if (o.plin?.miris) r.push("Osjeti se oštar miris amonijaka.");
  else if (o.plin) r.push(PLIN_TEKST[o.plin.jakost] ?? PLIN_TEKST[3]);
  if (o.otapanje) r.push("Čvrsta tvar se otapa.");
  if (o.talog) r.push(`Nastaje ${BOJE[o.talog.boja].m} talog.`);
  if (o.zamucenje) r.push("Otopina se zamuti.");
  if (o.prevlaka) r.push(o.prevlaka.oblik === "kristalici" ? `Na metalu se izlučuju ${BOJE[o.prevlaka.boja].m} kristalići ${genitivMetala(o.prevlaka.metal)}.` : `Na metalu se izlučuje ${BOJE[o.prevlaka.boja].z} prevlaka ${genitivMetala(o.prevlaka.metal)}.`);
  if (o.zrcalo) r.push("Na stijenci epruvete izlučuje se srebro (srebrno zrcalo).");
  const { prije, poslije } = o.boja;
  if (poslije !== prije) {
    if (poslije === "bezbojna") r.push(o.blijedi ? `${velikoSlovo(BOJE[prije].z)} boja otopine blijedi.` : o.talog ? `${velikoSlovo(BOJE[prije].z)} boja nestane.` : `${velikoSlovo(BOJE[prije].z)} boja nestane: otopina se obezboji.`);
    else if (prije === "bezbojna") r.push(o.blijedi ? `Otopina postupno postaje ${BOJE[poslije].z}.` : `Otopina postane ${BOJE[poslije].z}.`);
    else r.push(`Boja otopine prijeđe iz ${gen(BOJE[prije].z)} u ${aku(BOJE[poslije].z)}.`);
  }
  if (!r.length) {
    r.push("Nema vidljive promjene.");
    if (prije !== "bezbojna" || o.indikator) r.push(`Otopina ostaje ${BOJE[prije].z}.`);
    if (o.toplina) r.push("Otopina se malo zagrije.");
  }
  return r.join(" ");
}
const GEN_METALA = { Cu: "bakra", Ag: "srebra", Zn: "cinka", Pb: "olova", Ni: "nikla", Fe: "željeza", Mg: "magnezija" };
const genitivMetala = (m) => GEN_METALA[m] ?? element(m)?.naziv ?? m;

// Potpis opažanja: dva pokusa „izgledaju jednako“ kad im je potpis isti (jakost mjehurića se ne broji).
export function potpis(o) {
  if (o.plamen) return `plamen:${o.plamen}`;
  const d = [];
  if (o.plin) d.push(o.plin.miris ? "miris" : "plin");
  if (o.talog) d.push(`talog:${o.talog.boja}`);
  if (o.zamucenje) d.push("zamucenje");
  if (o.prevlaka) d.push(`prevlaka:${o.prevlaka.metal}`);
  if (o.zrcalo) d.push("zrcalo");
  if (o.boja.poslije !== o.boja.prije) d.push(`boja:${o.boja.poslije}`);
  return d.length ? d.join("+") : `nista:${o.boja.prije}`;
}
export { imaPromjenu };

// Produkt koji se vidi (za „Točan odgovor“ i poruke): formula taloga, plina, izlučenog metala …
export function produkt(o) {
  if (o.talog) return o.talog.formula;
  if (o.zamucenje) return o.zamucenje.formula;
  if (o.prevlaka) return o.prevlaka.metal;
  if (o.zrcalo) return "Ag";
  if (o.plin) return o.plin.formula;
  return null;
}
