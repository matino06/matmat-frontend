// niz: graf niza (točke (n, aₙ)), ε-pojas oko limesa i n₀, podnizovi u boji, rekurzivni niz i paukova mreža.
// Za lekcije o nizovima i limesima (Matematička analiza 1). Članove, n₀, pripadnost podnizu i provjeru limesa računa
// kod iz speca (siguran kalkulator core/expr.js), pa autor lekcije ne upisuje točan odgovor.
//
// n₀ (najmanji indeks od kojeg su svi članovi u pojasu) računa se brojčano: članovi do N, zadnji član izvan pojasa,
// pa provjera da je rep (od N/2 do N) duboko u pojasu i da je n₀ ≤ N/20. Ako nije, N raste do milijun; ako ni tada
// rep nije siguran, validate to javlja (n₀ se ne može pouzdano odrediti), umjesto da učenik dobije kriv odgovor.
import { compile } from "../../core/expr.js";
import { texIzraza } from "../../core/izraz.js";
import { parseNumber, formatNumber, isNum } from "../../core/number.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "../zajednicko.js";

export const NACINI = ["prikaz", "istrazi", "n0"];
export const N_DO_MAX = 60;
const N_DO_ZADANO = 12;
const N_MAX = 1_000_000;
// boje podnizova (CSS varijable teme), redom kad boja nije zadana
export const BOJE = { plava: "--primary", narancasta: "--warn", zelena: "--success", crvena: "--danger" };
export const BOJE_RED = Object.keys(BOJE);

const BESKONACNO = { inf: 1, "+inf": 1, "∞": 1, "+∞": 1, "-inf": -1, "−inf": -1, "-∞": -1, "−∞": -1 };

// ── brojevi i izrazi iz speca ────────────────────────────────────────────────────────────────────────
// Broj iz speca: broj ili izraz bez varijabli („0.01“, „1/100“, „sqrt(2)“).
export function brojIzSpeca(v) {
  if (isNum(v)) return v;
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const c = compile(v);
    if (c.vars.length) return null;
    const x = c.fn({});
    return Number.isFinite(x) ? x : null;
  } catch {
    return null;
  }
}

function racunaj(fn, vars) {
  try {
    const x = fn(vars);
    return typeof x === "number" ? x : NaN;
  } catch {
    return NaN;
  }
}

// izraz sa zadanim dopuštenim varijablama; baca grešku s hrvatskom porukom
function izrazU(src, dopustene, ime) {
  let c;
  try {
    c = compile(String(src));
  } catch (e) {
    throw new Error(`${ime}: ${e.message}`);
  }
  const visak = c.vars.filter((v) => !dopustene.includes(v));
  if (visak.length) throw new Error(`${ime} smije sadržavati samo ${dopustene.map((v) => `„${v}“`).join(" i ")}, a ima ${visak.map((v) => `„${v}“`).join(", ")}`);
  return c;
}

// Izvor niza: opći član u n ili rekurzija aₙ₊₁ = f(aₙ, n) (u izrazu „a“ je prethodni član aₙ, a „n“ njegov indeks).
function izvorNiza(s) {
  if (s.clan != null && s.rekurzija != null) throw new Error("zadaj niz ili s „clan“ ili s „rekurzija“, ne oboje");
  if (s.clan != null) {
    const c = izrazU(s.clan, ["n"], "clan");
    return { kljuc: `c:${s.clan}`, clan: c.fn };
  }
  if (s.rekurzija != null) {
    const r = s.rekurzija;
    if (typeof r !== "object" || r.a1 == null || r.sljedeci == null) throw new Error("rekurzija treba {a1, sljedeci}");
    const a1 = brojIzSpeca(r.a1);
    if (a1 == null) throw new Error("rekurzija.a1 mora biti broj");
    const f = izrazU(r.sljedeci, ["a", "n"], "rekurzija.sljedeci");
    return { kljuc: `r:${a1}:${r.sljedeci}`, a1, f: f.fn, uN: f.vars.includes("n") };
  }
  throw new Error("niz treba „clan“ (izraz u n) ili „rekurzija“ ({a1, sljedeci})");
}

// Članovi a₁ … a_N (indeks 0 je prazan). Rekurzija se računa redom, pa se izračunati članovi pamte.
const PAMTI = new Map();
export function clanovi(s, N) {
  const iz = izvorNiza(s);
  const stari = PAMTI.get(iz.kljuc);
  if (stari && stari.length > N) return stari;
  const vals = new Float64Array(N + 1);
  vals[0] = NaN;
  let od = 1;
  if (stari) {
    vals.set(stari);
    od = stari.length;
  }
  if (iz.clan) {
    for (let n = od; n <= N; n++) vals[n] = racunaj(iz.clan, { n });
  } else {
    if (od === 1) {
      vals[1] = iz.a1;
      od = 2;
    }
    for (let n = od; n <= N; n++) vals[n] = racunaj(iz.f, { a: vals[n - 1], n: n - 1 });
  }
  // pamte se samo kraći nizovi (do 250 000 članova, 2 MB) i najviše 8 njih
  PAMTI.delete(iz.kljuc);
  if (N <= 250_000) PAMTI.set(iz.kljuc, vals);
  if (PAMTI.size > 8) PAMTI.delete(PAMTI.keys().next().value);
  return vals;
}

// ── limes ────────────────────────────────────────────────────────────────────────────────────────────
// null (nije zadan), {inf: ±1} ili {L, tex}; {greska} ako izraz ne valja.
export function limesIz(v) {
  if (v == null) return null;
  const t = String(v).trim();
  if (t in BESKONACNO) return { inf: BESKONACNO[t], tex: BESKONACNO[t] > 0 ? "+\\infty" : "-\\infty" };
  const L = brojIzSpeca(t);
  if (L == null) return { greska: `limes „${t}“ nije broj ni „inf“ / „-inf“` };
  return { L, tex: texIzraza(t) };
}
export const limesNiza = (s) => limesIz(s.limes);

// Teži li niz zadan funkcijom vrijednost(i), i = 1 … K, prema limesu? Brojčano: rep (od K/2 do K) mora biti blizu L i
// bar 2,5 puta bliže nego raniji dio (od K/20 do K/10), da pomak za konstantu (2,718 umjesto e) ne prođe. Spora
// konvergencija (1/ln n) se tako ne može potvrditi; takav niz nije za ovaj widget.
function tezi(vrijednost, K, lim) {
  if (lim.inf) {
    let rano = -Infinity;
    for (let i = 1; i <= Math.min(100, K); i++) rano = Math.max(rano, lim.inf * vrijednost(i));
    let rep = Infinity;
    for (let i = Math.floor(K / 2); i <= K; i++) {
      const v = lim.inf * vrijednost(i);
      rep = Number.isNaN(v) ? -Infinity : Math.min(rep, v);
    }
    return rep > Math.max(10, rano + Math.abs(rano) + 1);
  }
  const skala = Math.max(1, Math.abs(lim.L));
  const maks = (od, d) => {
    let m = 0;
    for (let i = Math.max(1, od); i <= d; i++) {
      const x = Math.abs(vrijednost(i) - lim.L);
      m = Number.isNaN(x) ? Infinity : Math.max(m, x);
    }
    return m;
  };
  const rep = maks(Math.floor(K / 2), K);
  if (rep <= 1e-9 * skala) return true;
  return rep <= 1e-2 * skala && rep <= 0.4 * maks(Math.floor(K / 20), Math.floor(K / 10));
}

export function teziPremaLimesu(s, lim = limesNiza(s)) {
  for (const N of [200_000, N_MAX]) {
    const vals = clanovi(s, N);
    if (tezi((n) => vals[n], N, lim)) return true;
  }
  return false;
}

// ── pojas i n₀ ───────────────────────────────────────────────────────────────────────────────────────
// Uvjet „član je u pojasu“: |aₙ − L| < ε za konačan limes, aₙ > M (ili aₙ < M za −∞) za beskonačan. Vrijednost na samoj
// granici (do zaokruživanja) nije u pojasu: nejednakost je stroga.
export function uvjetPojasa(s, vrijednost, lim = limesNiza(s)) {
  if (!lim || lim.greska || !isNum(vrijednost)) return null;
  if (lim.inf) {
    const M = vrijednost;
    const rub = 1e-12 * Math.max(1, Math.abs(M));
    return { vrsta: "M", M, smjer: lim.inf, lim, unutra: (a) => (lim.inf > 0 ? a > M + rub : a < M - rub) };
  }
  const e = vrijednost;
  const rub = 1e-12 * Math.max(1, Math.abs(lim.L), e);
  return { vrsta: "eps", L: lim.L, e, lim, unutra: (a) => Math.abs(a - lim.L) < e - rub };
}

// Najmanji n₀ takav da je uvjet ispunjen za sve n ≥ n₀; {n0, siguran, uvjet}.
export function nNula(s, vrijednost) {
  const u = uvjetPojasa(s, vrijednost);
  if (!u) return null;
  let N = 2000;
  for (;;) {
    const vals = clanovi(s, N);
    let zadnji = 0;
    for (let n = N; n >= 1; n--) {
      if (!u.unutra(vals[n])) {
        zadnji = n;
        break;
      }
    }
    const n0 = zadnji + 1;
    if (n0 <= N / 20 && repSiguran(vals, N, u)) return { n0, siguran: true, uvjet: u };
    if (N >= N_MAX) return { n0, siguran: false, uvjet: u };
    N = Math.min(N_MAX, N * 10);
  }
}

function repSiguran(vals, N, u) {
  for (let n = Math.floor(N / 2); n <= N; n++) {
    const a = vals[n];
    if (u.vrsta === "eps") {
      if (!(Math.abs(a - u.L) <= u.e / 2)) return false;
    } else if (!(u.smjer * (a - u.M) >= Math.max(1, Math.abs(u.M)))) return false;
  }
  return true;
}

// indeksi izvan pojasa (n < n₀) kao rasponi [[od, do], …]
export function izvanPojasa(s, r) {
  if (!r || r.n0 <= 1) return [];
  const vals = clanovi(s, r.n0);
  const out = [];
  for (let n = 1; n < r.n0; n++) {
    if (r.uvjet.unutra(vals[n])) continue;
    const zadnji = out[out.length - 1];
    if (zadnji && zadnji[1] === n - 1) zadnji[1] = n;
    else out.push([n, n]);
  }
  return out;
}

// Vrijednosti klizača u „istrazi“: zadane (epsiloni / M_vrijednosti), ili lijepe vrijednosti ε prema rasponu članova.
export function vrijednostiKlizaca(s) {
  const lim = limesNiza(s);
  if (!lim || lim.greska) return [];
  const zadane = lim.inf ? s.M_vrijednosti : s.epsiloni;
  // klizač udesno = stroži uvjet: ε od većeg prema manjem, M od manjeg prema većem (za −∞ obrnuto)
  if (Array.isArray(zadane)) return zadane.map(brojIzSpeca).sort((x, y) => (lim.inf ? lim.inf * (x - y) : y - x));
  if (lim.inf) return [];
  const vals = clanovi(s, nDo(s));
  let raspon = 0;
  for (let n = 1; n <= nDo(s); n++) raspon = Math.max(raspon, Math.abs(vals[n] - lim.L));
  const out = [];
  for (let k = 3; k >= -4; k--) for (const m of [5, 2, 1]) out.push(m * 10 ** k);
  return out.filter((e) => e < raspon && e >= raspon / 60).slice(0, 6);
}

// ── podnizovi ────────────────────────────────────────────────────────────────────────────────────────
export const nDo = (s) => (s.n_do == null ? N_DO_ZADANO : s.n_do);

function indeksiPodniza(p) {
  const c = izrazU(p.indeksi, ["k"], "indeksi");
  return (k) => racunaj(c.fn, { k });
}

// Indeksi podniza do granice (n_k ≤ do), k = 1, 2, …
export function clanoviPodniza(p, doN) {
  const nk = indeksiPodniza(p);
  const out = [];
  for (let k = 1; k <= doN; k++) {
    const n = Math.round(nk(k));
    if (!(n >= 1) || n > doN) break;
    out.push(n);
  }
  return out;
}

// ── crtež ────────────────────────────────────────────────────────────────────────────────────────────
function lijepiKorak(x) {
  if (!(x > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= x - 1e-12) return m * p;
  return 10 * p;
}

// Raspon osi y: zadan (y), ili iz nacrtanih članova, limesa i pojasa (s malo zraka), zaokružen na korak mreže.
export function rasponY(s) {
  if (Array.isArray(s.y) && s.y.length === 2) {
    const [y0, y1] = s.y.map(brojIzSpeca);
    return { y0, y1, korak: lijepiKorak((y1 - y0) / 5) };
  }
  const N = nDo(s);
  const vals = clanovi(s, N);
  const ys = [];
  for (let n = 1; n <= N; n++) if (Number.isFinite(vals[n])) ys.push(vals[n]);
  const lim = limesNiza(s);
  if (lim && isNum(lim.L)) ys.push(lim.L);
  for (const p of s.podnizovi ?? []) {
    const l = limesIz(p.limes);
    if (l && isNum(l.L)) ys.push(l.L);
  }
  if (lim && isNum(lim.L)) {
    const eps = s.nacin === "istrazi" ? vrijednostiKlizaca(s) : s.nacin === "n0" ? [brojIzSpeca(s.epsilon)] : [];
    for (const e of eps) if (isNum(e)) ys.push(lim.L - e, lim.L + e);
  }
  if (lim?.inf && s.nacin === "istrazi") for (const M of vrijednostiKlizaca(s)) if (isNum(M)) ys.push(M);
  if (!ys.length) ys.push(0, 1);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (hi - lo < 1e-9) [lo, hi] = [lo - 1, hi + 1];
  const zrak = (hi - lo) * 0.08;
  lo -= zrak;
  hi += zrak;
  // os x (y = 0) neka bude na crtežu kad je blizu
  if (lo > 0 && lo <= (hi - lo) * 0.6) lo = 0;
  if (hi < 0 && -hi <= (hi - lo) * 0.6) hi = 0;
  const korak = lijepiKorak((hi - lo) / 7);
  return { y0: Math.floor(lo / korak + 1e-9) * korak, y1: Math.ceil(hi / korak - 1e-9) * korak, korak };
}

export const korakX = (N) => (N <= 12 ? 1 : N <= 25 ? 2 : N <= 50 ? 5 : 10);

// Sve što komponenta crta, izračunato iz speca (isti podaci trebaju i iOS-u).
export function crtezNiza(s) {
  const N = nDo(s);
  const vals = clanovi(s, N);
  const ime = s.oznaka ?? "a";
  const podnizovi = (s.podnizovi ?? []).map((p, i) => {
    const boja = p.boja ?? BOJE_RED[i % BOJE_RED.length];
    const lim = limesIz(p.limes);
    const indeksTex = texIzraza(String(p.indeksi), ["k"]);
    return {
      boja,
      css: `var(${BOJE[boja] ?? BOJE.plava})`,
      clanovi: new Set(clanoviPodniza(p, N)),
      oznaka: p.oznaka ?? `$(${ime}_{${indeksTex}})$`,
      clanTex: p.clan_podniza != null ? `${ime}_{${indeksTex}} = ${texIzraza(String(p.clan_podniza), ["k"])}` : null,
      L: lim && isNum(lim.L) ? lim.L : null,
    };
  });
  const tocke = [];
  for (let n = 1; n <= N; n++) {
    const p = podnizovi.findIndex((q) => q.clanovi.has(n));
    tocke.push({ n, a: vals[n], podniz: p });
  }
  return { N, ime, tocke, podnizovi, lim: limesNiza(s), ...rasponY(s), korakX: korakX(N) };
}

// Paukova mreža rekurzije aₙ₊₁ = f(aₙ): krivulja y = f(x), pravac y = x i stepenice od a₁.
export function paukovaMreza(s) {
  const iz = izvorNiza(s);
  const koraci = Math.max(1, Math.min(s.koraci ?? Math.min(nDo(s) - 1, 8), 20));
  const vals = clanovi(s, koraci + 1);
  const a = Array.from({ length: koraci + 1 }, (_, i) => vals[i + 1]);
  let x0, x1;
  if (Array.isArray(s.mreza_x) && s.mreza_x.length === 2) [x0, x1] = s.mreza_x.map(brojIzSpeca);
  else {
    const lim = limesNiza(s);
    const xs = [...a, ...(lim && isNum(lim.L) ? [lim.L] : []), 0].filter(Number.isFinite);
    const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
    const k = lijepiKorak((hi - lo) / 5);
    x0 = Math.floor((lo - (hi - lo) * 0.06) / k) * k;
    x1 = Math.ceil((hi + (hi - lo) * 0.12) / k) * k;
    if (lo >= 0 && x0 < 0) x0 = 0;
  }
  const f = (x) => racunaj(iz.f, { a: x });
  const pocetak = x0 <= 0 && x1 >= 0 ? 0 : x0;
  const put = [[a[0], pocetak]];
  for (let i = 0; i < koraci; i++) put.push([a[i], a[i + 1]], [a[i + 1], a[i + 1]]);
  return { x0, x1, korak: lijepiKorak((x1 - x0) / 5), f, a, put, fTex: texIzraza(String(s.rekurzija.sljedeci).replace(/\ba\b/g, "x"), ["x"]) };
}

// ── zapis za poruke i ispis ──────────────────────────────────────────────────────────────────────────
export const texBroj = (x, d = 3) => formatNumber(x, d).replace("−", "-").replace(",", "{,}");

// toliko decimala da se broj razlikuje od granice (0,01003 prema 0,01); „=“ ako je zapis točan, inače „≈“
function texBlizu(x, granica) {
  let d = 3;
  while (d < 10 && formatNumber(x, d) === formatNumber(granica, d)) d++;
  const t = formatNumber(x, d);
  const tocno = Math.abs(Number(t.replace("−", "-").replace(",", ".")) - x) <= 1e-12 * Math.max(1, Math.abs(x));
  return `${tocno ? "=" : "\\approx"} ${texBroj(x, d)}`;
}

const texL = (lim) => (lim.L < 0 && lim.tex.startsWith("-") ? `+ ${lim.tex.slice(1)}` : `- ${lim.L < 0 ? `(${lim.tex})` : lim.tex}`);
const clanTex = (s, n) => `${s.oznaka ?? "a"}_{${n}}`;

// Zapis udaljenosti člana od limesa ili od M, za poruke: „|a_{149} - 2| ≈ 0{,}01003 ≥ 0{,}01“.
function opisClana(s, u, n, a) {
  if (u.vrsta === "eps") {
    const d = Math.abs(a - u.L);
    return `\${|${clanTex(s, n)} ${texL(u.lim)}| ${texBlizu(d, u.e)} ${u.unutra(a) ? "<" : "\\ge"} ${texBroj(u.e, 6)}}$`;
  }
  return `\${${clanTex(s, n)} ${texBlizu(a, u.M)} ${u.smjer > 0 ? (a > u.M ? ">" : "\\le") : a < u.M ? "<" : "\\ge"} ${texBroj(u.M, 6)}}$`;
}

const uPojasu = (u) => (u.vrsta === "eps" ? "u pojasu" : u.smjer > 0 ? "veći od $M$" : "manji od $M$");
const izvan = (u) => (u.vrsta === "eps" ? "je izvan pojasa" : u.smjer > 0 ? "nije veći od $M$" : "nije manji od $M$");

// rasponi indeksa kao tekst: „1, \dots, 7“, „1, 3, 5, \dots, 9“
export function texRaspona(r) {
  const dijelovi = r.slice(0, 5).map(([a, b]) => (a === b ? `${a}` : b === a + 1 ? `${a}, ${b}` : `${a}, \\dots, ${b}`));
  return dijelovi.join(", ") + (r.length > 5 ? ", \\dots" : "");
}

// Ispis pod grafom za pojas: tko je izvan i od kojeg n su svi unutra.
export function ispisPojasa(s, r) {
  const u = r.uvjet;
  const r1 = izvanPojasa(s, r);
  const izvanCrteza = r.n0 > nDo(s) ? " (izvan crteža)" : "";
  const svi = u.vrsta === "eps" ? "svi su unutra" : u.smjer > 0 ? "svi su veći od $M$" : "svi su manji od $M$";
  if (!r1.length) return `Svi su članovi ${uPojasu(u)}: $n_0 = 1$.`;
  const koji = u.vrsta === "eps" ? "Izvan pojasa" : u.smjer > 0 ? "Nisu veći od $M$" : "Nisu manji od $M$";
  return `${koji}: \${n = ${texRaspona(r1)}}$; od \${n_0 = ${r.n0}}$${izvanCrteza} ${svi}.`;
}

// ── widget ───────────────────────────────────────────────────────────────────────────────────────────
function vrijednostZaN0(s) {
  const lim = limesNiza(s);
  return lim?.inf ? brojIzSpeca(s.M) : brojIzSpeca(s.epsilon);
}

const POLJA = ["oznaka", "indeksi", "boja", "clan_podniza", "limes"];

export const niz = {
  tip: "niz",
  samoRucno: true,
  uloga: (s) => (s.nacin === "prikaz" || s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Niz kao točkasti graf (n, aₙ) za n = 1 … n_do, s limesom, ε-pojasom i n₀, podnizovima u boji i paukovom mrežom rekurzije.
Niz (jedno od): clan – opći član, izraz u n ("(4*n-1)/(2*n+1)", "(-1)^n*(1+1/n)", "3*sin(n*pi/2)+1/n");
  rekurzija: {a1, sljedeci} – a₁ i aₙ₊₁ kao izraz u a (= aₙ) i po želji n (indeks člana a), npr. {a1: 1, sljedeci: "sqrt(2*a+3)"}.
tekst, oznaka? (ime niza, zadano "a"), n_do? (koliko članova crtati, 1–${N_DO_MAX}, zadano ${N_DO_ZADANO}), y? [od, do] (zadano iz članova, limesa i pojasa).
limes? – izraz ("2", "e^2", "sqrt(2)") ili "inf" / "-inf"; kod brojčano provjerava da niz tome teži. Crta se isprekidani pravac y = L.
podnizovi?: [{indeksi: "2*k" | "2*k-1" | "4*k-3" (izraz u k, strogo rastući prirodni brojevi), oznaka? (zadano "$(a_{2k})$"), boja? (${BOJE_RED.join(" | ")}), clan_podniza? (izraz u k; kod provjerava da je to baš a_{n_k}), limes? (limes podniza, provjerava se; crta se isprekidano u boji podniza)}] – članovi podniza se oboje, legenda pokazuje oznaku i opći član.
nacin:
- "prikaz" (Pogledaj): graf; uz rekurzija i paukova_mreza: true (sljedeci bez n) još i y = f(x), y = x i stepenice od a₁ (koraci? zadano do 8, mreza_x? [od, do]).
- "istrazi" (Istraži, nije zadatak): treba limes; klizač za ε (epsiloni?: popis, zadano lijepe vrijednosti prema rasponu članova) ili za M uz limes ±∞ (M_vrijednosti: popis). Crta se pojas ⟨L−ε, L+ε⟩ (ili aₙ > M), članovi izvan su istaknuti, a ispis kaže „izvan pojasa: n = 1 … 7; od n₀ = 8 svi su unutra“. n₀ računa kod.
- "n0" (Tvoj red): treba limes i epsilon (ili M uz limes ±∞: najmanji n₀ takav da je aₙ > M za sve n ≥ n₀); učenik upisuje n₀. Kod računa najmanji n₀ (|aₙ − L| < ε za sve n ≥ n₀, strogo) i javlja ako se ne može sigurno odrediti.
  najmanji?: false – prihvaća se svaki ispravan n₀ (≥ najmanjeg), npr. iz ocjene ⌊3/(2ε)⌋ + 1. krivo?: [{vrijednost, poruka}].
  Poruke kod: n₀ premalen (navodi član izvan pojasa), zadnji član izvan umjesto prvog unutra, n₀ nije najmanji (i prethodni je u pojasu), n₀ nije prirodan broj (iz n > 149,5 uzmi 150).
  Pojas i n₀ crtaju se tek nakon točnog odgovora ili „Pokaži točan odgovor“.`,
  primjer: {
    tip: "niz",
    nacin: "n0",
    tekst: "Niz $a_n = \\dfrac{4n-1}{2n+1}$ ima limes 2. Za $\\varepsilon = 0{,}01$ odredi najmanji $n_0$ takav da su svi članovi od $a_{n_0}$ nadalje u intervalu $\\langle 2-\\varepsilon, 2+\\varepsilon\\rangle$.",
    clan: "(4*n-1)/(2*n+1)",
    limes: "2",
    epsilon: 0.01,
    n_do: 12,
  },
  primjeri: [
    {
      tip: "niz",
      nacin: "istrazi",
      tekst: "Mijenjaj $\\varepsilon$ i gledaj koji su članovi niza $a_n = \\dfrac{4n-1}{2n+1}$ izvan pojasa oko limesa 2. Što se događa s $n_0$ kad se pojas suzi?",
      clan: "(4*n-1)/(2*n+1)",
      limes: "2",
      epsiloni: [0.5, 0.25, 0.1, 0.05],
      n_do: 30,
    },
    {
      tip: "niz",
      nacin: "prikaz",
      tekst: "Niz $a_n = 3\\sin\\frac{n\\pi}{2} + \\frac{1}{n}$ rastavljen na tri podniza. Svaki teži svom broju: to su gomilišta niza.",
      clan: "3*sin(n*pi/2)+1/n",
      n_do: 24,
      podnizovi: [
        { indeksi: "4*k-3", clan_podniza: "3+1/(4*k-3)", limes: "3" },
        { indeksi: "2*k", clan_podniza: "1/(2*k)", limes: "0" },
        { indeksi: "4*k-1", clan_podniza: "-3+1/(4*k-1)", limes: "-3" },
      ],
    },
    {
      tip: "niz",
      nacin: "prikaz",
      tekst: "Niz $a_1 = 1$, $a_{n+1} = \\sqrt{2a_n + 3}$ raste i teži broju 3. Stepenice između $y = f(x)$ i $y = x$ pokazuju kako se iz $a_n$ dobije $a_{n+1}$.",
      rekurzija: { a1: 1, sljedeci: "sqrt(2*a+3)" },
      limes: "3",
      n_do: 10,
      paukova_mreza: true,
    },
    {
      tip: "niz",
      nacin: "n0",
      tekst: "Niz $a_n = 3n - 7$ divergira prema $+\\infty$. Za $M = 1000$ odredi najmanji $n_0$ takav da je $a_n > M$ za sve $n \\ge n_0$.",
      clan: "3*n-7",
      limes: "inf",
      M: 1000,
      n_do: 20,
    },
    {
      tip: "niz",
      nacin: "n0",
      tekst: "Niz $a_n = \\dfrac{6n-1}{2n+3}$ ima limes 3. Za $\\varepsilon = 0{,}02$ nađi neki $n_0$ (ne mora biti najmanji) takav da je $|a_n - 3| < \\varepsilon$ za sve $n \\ge n_0$.",
      clan: "(6*n-1)/(2*n+3)",
      limes: "3",
      epsilon: 0.02,
      najmanji: false,
      n_do: 12,
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (!need(NACINI.includes(s.nacin), `nacin mora biti ${NACINI.map((n) => `„${n}“`).join(", ")}`)) return list;
    need(isText(s.tekst), "tekst je obavezan");
    const N = nDo(s);
    if (!need(Number.isInteger(N) && N >= 1 && N <= N_DO_MAX, `n_do mora biti cijeli broj od 1 do ${N_DO_MAX}`)) return list;
    let iz;
    try {
      iz = izvorNiza(s);
    } catch (e) {
      need(false, e.message);
      return list;
    }
    const vals = clanovi(s, N);
    const nedef = [];
    for (let n = 1; n <= N; n++) if (!Number.isFinite(vals[n])) nedef.push(n);
    if (!need(!nedef.length, `član ${clanTex(s, "n")} nije definiran (ili je beskonačan) za n = ${nedef.slice(0, 6).join(", ")}${nedef.length > 6 ? ", …" : ""}`)) return list;
    if (s.oznaka != null) need(/^[A-Za-z]$/.test(s.oznaka), "oznaka niza je jedno slovo (npr. „a“, „b“, „c“)");

    // raspon y
    if (s.y != null) {
      const y = Array.isArray(s.y) && s.y.length === 2 ? s.y.map(brojIzSpeca) : null;
      if (need(y && y.every(isNum) && y[0] < y[1], "y mora biti [od, do] uz od < do")) {
        const van = [];
        for (let n = 1; n <= N; n++) if (vals[n] < y[0] || vals[n] > y[1]) van.push(n);
        need(!van.length, `članovi za n = ${van.slice(0, 6).join(", ")}${van.length > 6 ? ", …" : ""} izlaze iz raspona y: proširi y ili izostavi y (računa se sam)`);
      }
    }

    // limes
    const lim = limesNiza(s);
    if (lim?.greska) need(false, lim.greska);
    const limOk = !!lim && !lim.greska && need(teziPremaLimesu(s, lim), `niz brojčano ne teži prema ${String(s.limes)} (provjereno do n = milijun): provjeri clan / rekurziju ili limes`);

    // podnizovi
    if (s.podnizovi != null && need(Array.isArray(s.podnizovi) && s.podnizovi.length >= 1 && s.podnizovi.length <= 4, "podnizovi su popis od 1 do 4 podniza")) {
      s.podnizovi.forEach((p, i) => {
        const gdje = `podnizovi[${i}]`;
        if (!need(p && typeof p === "object", `${gdje} mora biti objekt`)) return;
        for (const k of Object.keys(p)) need(POLJA.includes(k), `${gdje}: nepoznato polje „${k}“`);
        if (p.boja != null) need(p.boja in BOJE, `${gdje}.boja mora biti ${BOJE_RED.join(", ")}`);
        if (p.oznaka != null) need(isText(p.oznaka), `${gdje}.oznaka mora biti tekst`);
        let nk;
        try {
          nk = indeksiPodniza(p);
        } catch (e) {
          need(false, `${gdje}.${e.message}`);
          return;
        }
        let prije = 0;
        for (let k = 1; k <= 300; k++) {
          const n = nk(k);
          if (!need(Number.isFinite(n) && Math.abs(n - Math.round(n)) < 1e-9 && Math.round(n) >= 1, `${gdje}.indeksi za k = ${k} ne daje prirodan broj`)) return;
          if (!need(Math.round(n) > prije, `${gdje}.indeksi moraju strogo rasti (k = ${k - 1} → ${prije}, k = ${k} → ${Math.round(n)}), inače to nije podniz`)) return;
          prije = Math.round(n);
        }
        need(clanoviPodniza(p, N).length >= 2, `${gdje}: do n_do = ${N} ima manje od dva člana podniza; povećaj n_do`);
        const Nn = Math.min(200_000, Math.max(N, Math.round(nk(2000))));
        const v = clanovi(s, Nn);
        const K = clanoviPodniza(p, Nn).length;
        const b = (k) => v[Math.round(nk(k))];
        if (p.clan_podniza != null) {
          try {
            const c = izrazU(p.clan_podniza, ["k"], `${gdje}.clan_podniza`);
            const krivi = [];
            for (let k = 1; k <= Math.min(K, 40); k++) {
              const [x, y] = [racunaj(c.fn, { k }), b(k)];
              if (!(Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y)))) krivi.push(k);
            }
            need(!krivi.length, `${gdje}.clan_podniza nije jednak članu a_{${p.indeksi}} za k = ${krivi.slice(0, 4).join(", ")}`);
          } catch (e) {
            need(false, e.message);
          }
        }
        if (p.limes != null) {
          const l = limesIz(p.limes);
          if (l.greska) need(false, `${gdje}: ${l.greska}`);
          else need(K >= 40 && tezi(b, K, l), `${gdje}: podniz brojčano ne teži prema ${String(p.limes)}`);
        }
      });
    }

    // paukova mreža
    if (s.paukova_mreza != null) {
      need(s.paukova_mreza === true || s.paukova_mreza === false, "paukova_mreza je true ili false");
      if (s.paukova_mreza) {
        need(s.nacin === "prikaz", "paukova_mreza crta se samo u načinu „prikaz“");
        need(!!iz.f, "paukova_mreza treba rekurziju (rekurzija: {a1, sljedeci})");
        if (iz.f) need(!iz.uN, "paukova_mreza treba rekurziju aₙ₊₁ = f(aₙ) bez n u izrazu sljedeci");
        if (s.koraci != null) need(Number.isInteger(s.koraci) && s.koraci >= 1 && s.koraci <= 20, "koraci mora biti cijeli broj od 1 do 20");
        if (s.mreza_x != null) {
          const x = Array.isArray(s.mreza_x) && s.mreza_x.length === 2 ? s.mreza_x.map(brojIzSpeca) : null;
          need(x && x.every(isNum) && x[0] < x[1], "mreza_x mora biti [od, do] uz od < do");
        }
      }
    }

    if (s.nacin === "prikaz") {
      noAnswerFields(s, need);
      for (const k of ["epsilon", "M", "epsiloni", "M_vrijednosti", "najmanji"]) need(!(k in s), `„${k}“ ima smisla samo u načinima „istrazi“ ili „n0“`);
      return list;
    }

    // istrazi i n0 trebaju limes
    if (!need(lim != null, `način „${s.nacin}“ treba limes (izraz ili "inf" / "-inf")`) || !limOk) return list;

    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      const polje = lim.inf ? "M_vrijednosti" : "epsiloni";
      need(!(lim.inf ? "epsiloni" in s : "M_vrijednosti" in s), lim.inf ? "uz limes ±∞ klizač je za M: koristi M_vrijednosti, ne epsiloni" : "uz konačan limes klizač je za ε: koristi epsiloni, ne M_vrijednosti");
      if (lim.inf) need(Array.isArray(s.M_vrijednosti), "uz limes ±∞ „istrazi“ treba M_vrijednosti: popis vrijednosti M za klizač");
      const vr = vrijednostiKlizaca(s);
      if (s[polje] != null) need(Array.isArray(s[polje]) && s[polje].length >= 2 && s[polje].length <= 8, `${polje} je popis od 2 do 8 vrijednosti`);
      if (!lim.inf && s.epsiloni == null) need(vr.length >= 2, "ne mogu sam odabrati ε za klizač: zadaj epsiloni");
      vr.forEach((v, i) => {
        if (!need(isNum(v) && (lim.inf || v > 0), `${polje}[${i}] mora biti ${lim.inf ? "broj" : "pozitivan broj"}`)) return;
        const r = nNula(s, v);
        need(r.siguran, `za ${lim.inf ? "M" : "ε"} = ${formatNumber(v)} n₀ se ne može sigurno odrediti (niz se do n = ${N_MAX} ne smiri u pojasu)`);
      });
      return list;
    }

    // n0
    const polje = lim.inf ? "M" : "epsilon";
    need(!(lim.inf ? "epsilon" in s : "M" in s), lim.inf ? "uz limes ±∞ zadaje se M, ne epsilon" : "uz konačan limes zadaje se epsilon, ne M");
    const v = vrijednostZaN0(s);
    if (!need(isNum(v) && (lim.inf || v > 0), `način „n0“ treba ${polje}: ${lim.inf ? "broj M" : "pozitivan broj ε"}`)) return list;
    if (s.najmanji != null) need(typeof s.najmanji === "boolean", "najmanji je true ili false");
    const r = nNula(s, v);
    if (!need(r.siguran, `n₀ se ne može sigurno odrediti: niz se do n = ${N_MAX} ne smiri u pojasu (provjeri limes i ${polje})`)) return list;
    if (s.krivo != null && need(Array.isArray(s.krivo), "krivo mora biti popis")) {
      s.krivo.forEach((k, i) => {
        need(isNum(k?.vrijednost), `krivo[${i}].vrijednost mora biti broj`);
        need(isText(k?.poruka), `krivo[${i}].poruka mora biti tekst`);
        if (isNum(k?.vrijednost)) need(s.najmanji === false ? !(Number.isInteger(k.vrijednost) && k.vrijednost >= r.n0) : k.vrijednost !== r.n0, `krivo[${i}].vrijednost ${k.vrijednost} je točan odgovor`);
      });
    }
    return list;
  },

  check(s, odgovor) {
    const x = parseNumber(typeof odgovor === "number" ? odgovor : String(odgovor ?? ""));
    if (x == null) return { tocno: false, poruka: "Upiši prirodan broj $n_0$.", prazno: true };
    const r = nNula(s, vrijednostZaN0(s));
    const { n0, uvjet: u } = r;
    const najmanji = s.najmanji !== false;
    if (najmanji ? x === n0 : Number.isInteger(x) && x >= n0) return { tocno: true };
    const hit = (s.krivo ?? []).find((k) => k.vrijednost === x);
    if (hit) return { tocno: false, poruka: hit.poruka };
    if (!Number.isInteger(x) || x < 1) {
      if (x > 0 && Math.floor(x) + 1 === n0) return { tocno: false, poruka: `$n_0$ je prirodan broj (indeks člana). Iz $n > ${texBroj(x, 6)}$ uzmi prvi prirodan broj veći od toga.` };
      return { tocno: false, poruka: "$n_0$ je indeks člana, pa mora biti prirodan broj (1, 2, 3, …)." };
    }
    const vals = clanovi(s, Math.max(n0, x) + 1);
    if (x < n0) {
      if (x === n0 - 1 && najmanji)
        return { tocno: false, poruka: `$${clanTex(s, x)}$ je zadnji član koji ${izvan(u)}: ${opisClana(s, u, x, vals[x])}. A $n_0$ je prvi indeks od kojeg su svi članovi ${uPojasu(u)}.` };
      if (!u.unutra(vals[x])) return { tocno: false, poruka: `Premalen: već $${clanTex(s, x)}$ ${izvan(u)}: ${opisClana(s, u, x, vals[x])}.` };
      let m = x + 1;
      while (m < n0 && u.unutra(vals[m])) m++;
      return { tocno: false, poruka: `$${clanTex(s, x)}$ jest ${uPojasu(u)}, ali kasniji $${clanTex(s, m)}$ nije: ${opisClana(s, u, m, vals[m])}. Od $n_0$ nadalje moraju biti svi.` };
    }
    // x > n0, a traži se najmanji
    return {
      tocno: false,
      poruka: `Od $${clanTex(s, x)}$ nadalje svi su članovi ${uPojasu(u)}, ali to nije najmanji takav $n_0$: i $${clanTex(s, x - 1)}$ je ${uPojasu(u)} (${opisClana(s, u, x - 1, vals[x - 1])}).`,
    };
  },

  tocanOdgovor(s) {
    const r = nNula(s, vrijednostZaN0(s));
    if (!r) return "";
    return s.najmanji === false ? `$n_0 = ${r.n0}$ (ili bilo koji veći)` : `$n_0 = ${r.n0}$`;
  },
};
