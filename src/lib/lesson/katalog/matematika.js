// Widgeti za matematiku (matura): unos izraza, skup na brojevnom pravcu i graf funkcije s parametrima.
// samoRucno: lekcije s njima pišu se ručno (Claude Code), pa ih prompt za automatsku izradu ne opisuje
// (prompt.js ih preskače), ali ih validator i aplikacija znaju provjeriti i nacrtati.
import { compile } from "../core/expr.js";
import { isNum } from "../core/number.js";
import { ucitaj, ucitajLatex, jednako, vrijednost, texIzraza } from "../core/izraz.js";
import { parseSkup, jednakiSkupovi, sadrzi, texSkupa, sredi, komplement, ucitajSkupLatex } from "../core/skup.js";
import { POGLEDAJ, ODGOVOR, isText, problems, noAnswerFields } from "./zajednicko.js";

const ID = /^[A-Za-z_][A-Za-z_0-9]*$/;
// Približna vrijednost točnog izraza (0,5236 umjesto π/6): učenik je dobro računao, ali treba točan zapis.
const PRIBLIZNO = 0.01;

// ── unos izraza ───────────────────────────────────────────────────────────────────────────────────
// Polje je izraz kao na papiru; točno je sve što ima istu vrijednost (za izraze s x: iste vrijednosti za svaki x).
const varijableIzraza = (s) => s.varijable ?? [];

function poljeOdgovor(s, p) {
  return ucitaj(String(p.odgovor), varijableIzraza(s));
}

// Rješenja s cijelim k („π/12 + kπ“): isti skup je i zapis pomaknut za cijeli broj perioda („13π/12 + kπ“, „π/12 − kπ“).
function istaObitelj(u, tocan, vars) {
  if (vars.length !== 1 || vars[0] !== "k" || u.greska || tocan.greska) return false;
  const pravac = (f) => {
    const [a, d] = [f.fn({ k: 0 }), f.fn({ k: 1 }) - f.fn({ k: 0 })];
    const linearan = [-2.5, 0.37, 3].every((k) => Math.abs(f.fn({ k }) - (a + d * k)) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(d * k)));
    return linearan && Number.isFinite(a) && Number.isFinite(d) && d !== 0 ? { a, d } : null;
  };
  const [x, y] = [pravac(u), pravac(tocan)];
  if (!x || !y || Math.abs(Math.abs(x.d) - Math.abs(y.d)) > 1e-9 * Math.abs(y.d)) return false;
  const pomak = (x.a - y.a) / y.d;
  return Math.abs(pomak - Math.round(pomak)) < 1e-9;
}

function provjeriPolje(s, p, unos) {
  const vars = varijableIzraza(s);
  if (!String(unos ?? "").trim()) return { tocno: false, poruka: "Upiši odgovor.", prazno: true };
  // unos je LaTeX iz matematičkog polja (MathLive), kao na probnoj maturi; % iza polja već piše, pa ga učenik ne mora
  const u = ucitajLatex(String(p.iza ?? "").includes("%") ? String(unos).replace(/\\%/g, "") : unos, vars);
  if (u.greska) return { tocno: false, poruka: `Ne mogu pročitati izraz: ${u.greska}.`, prazno: true };
  const tocan = poljeOdgovor(s, p);
  if (jednako(u, tocan, vars) || istaObitelj(u, tocan, vars)) return { tocno: true };
  for (const k of p.krivo ?? []) {
    const kr = ucitaj(String(k.odgovor), vars);
    // „krivo“ zadan decimalno (npr. 10.73) prepoznaje se i kad ga učenik zaokruži malo drukčije
    const rel = /\d\.\d/.test(String(k.odgovor)) && !vars.length ? 0.002 : 1e-9;
    if (!kr.greska && jednako(u, kr, vars, rel) && !jednako(u, tocan, vars, rel)) return { tocno: false, poruka: k.poruka };
  }
  if (!vars.length && !s.priblizno && jednako(u, tocan, vars, PRIBLIZNO)) {
    // točan odgovor s konačno decimala (cijena, postotak) nema π ni korijen, pa ga ne treba ni spominjati
    const t = tocan.fn({});
    const decimalan = Math.abs(t * 1e4 - Math.round(t * 1e4)) < 1e-6;
    return { tocno: false, poruka: decimalan ? "To je zaokružena vrijednost. Upiši točan rezultat, bez zaokruživanja." : "To je približna vrijednost. Upiši točnu (npr. s π, korijenom ili razlomkom)." };
  }
  if (s.priblizno && jednako(u, tocan, vars, PRIBLIZNO / 2)) return { tocno: true };
  return { tocno: false, poruka: p.savjet || s.savjet || "Nije točno." };
}

export const izraz = {
  tip: "izraz",
  samoRucno: true,
  uloga: () => ODGOVOR,
  opis: `Matematički odgovor koji učenik upisuje u matematičko polje s tipkovnicom probne mature (razlomak, korijen, π, potencija
se odmah iscrtavaju). Polja: tekst, polja: [{oznaka
(markdown ispred polja, npr. "$x_1 =$"), iza? (markdown iza polja, npr. "$> 0$"), odgovor (izraz, npr. "pi/6", "2-sqrt(3)", "x^2-4*x+3"), krivo?: [{odgovor, poruka}], savjet?}] (1–4),
varijable?: ["x"] (ako je odgovor izraz s varijablom), bilo_kojim_redom?: true (npr. dvije nultočke), priblizno?: true (prihvati decimalni
zapis), graf?: graf_funkcije "prikaz" koji se crta iznad polja. Točno je sve što ima istu vrijednost.`,
  primjer: {
    tip: "izraz",
    tekst: "Koje su nultočke funkcije $f(x) = x^2 - 4x + 3$?",
    polja: [
      { oznaka: "$x_1 =$", odgovor: "1", krivo: [{ odgovor: "-1", poruka: "Pazi na predznak u formuli: $-b$ je $+4$." }] },
      { oznaka: "$x_2 =$", odgovor: "3" },
    ],
    bilo_kojim_redom: true,
  },
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "izraz treba „tekst“ (pitanje)");
    const vars = varijableIzraza(s);
    need(Array.isArray(vars) && vars.every((v) => /^[a-z]$/.test(v) && v !== "e"), "varijable su popis slova, npr. [\"x\"]");
    if (s.graf != null) {
      need(s.graf?.nacin === "prikaz", "izraz.graf mora biti graf_funkcije s nacin \"prikaz\"");
      for (const p of graf_funkcije.validate({ tip: "graf_funkcije", tekst: "-", ...s.graf, nacin: "prikaz" })) list.push(`graf: ${p}`);
    }
    if (!need(Array.isArray(s.polja) && s.polja.length >= 1 && s.polja.length <= 4, "izraz treba 1–4 polja")) return list;
    const tocni = [];
    s.polja.forEach((p, i) => {
      if (p?.oznaka != null) need(isText(p.oznaka), `polja[${i}].oznaka mora biti tekst`);
      if (p?.iza != null) need(isText(p.iza), `polja[${i}].iza mora biti tekst`);
      const t = ucitaj(String(p?.odgovor ?? ""), vars);
      if (!need(!t.greska && p?.odgovor != null, `polja[${i}].odgovor nije ispravan izraz: ${t.greska ?? "nedostaje"}`)) return;
      if (!vars.length) need(Number.isFinite(t.fn({})), `polja[${i}].odgovor nema vrijednost`);
      tocni.push(t);
      for (const [j, k] of (p.krivo ?? []).entries()) {
        const kr = ucitaj(String(k?.odgovor ?? ""), vars);
        if (!need(!kr.greska, `polja[${i}].krivo[${j}].odgovor nije ispravan izraz`)) continue;
        need(isText(k.poruka), `polja[${i}].krivo[${j}] treba „poruka“`);
        need(!jednako(kr, t, vars), `polja[${i}].krivo[${j}] jednak je točnom odgovoru`);
      }
    });
    const uzorak = Object.fromEntries(vars.map((n, i) => [n, 0.731 + 0.639 * i]));
    if (s.bilo_kojim_redom && tocni.length > 1) need(new Set(tocni.map((t) => t.fn(uzorak))).size === tocni.length, "uz bilo_kojim_redom odgovori moraju biti različiti");
    return list;
  },
  check(s, unosi) {
    const polja = s.polja;
    const vals = polja.map((_, i) => unosi?.[i] ?? "");
    const prazno = vals.findIndex((v) => !String(v).trim());
    if (prazno >= 0) return { tocno: false, poruka: polja.length > 1 ? "Upiši sve odgovore." : "Upiši odgovor.", prazno: true, polje: prazno };
    if (s.bilo_kojim_redom && polja.length > 1) {
      // svaki unos mora pogoditi drugo polje; poruka za krivo se traži u polju koje još nije pogođeno
      const slobodna = polja.map((_, i) => i);
      for (let i = 0; i < vals.length; i++) {
        const k = slobodna.findIndex((j) => provjeriPolje(s, polja[j], vals[i]).tocno);
        if (k >= 0) {
          slobodna.splice(k, 1);
          continue;
        }
        const r = slobodna.map((j) => provjeriPolje(s, polja[j], vals[i])).find((x) => x.poruka && !x.prazno && x.poruka !== (s.savjet || "Nije točno.")) ?? provjeriPolje(s, polja[slobodna[0]], vals[i]);
        return { ...r, polje: i, poruka: `${polja.length > 1 ? `${i + 1}. odgovor: ` : ""}${r.poruka}` };
      }
      return { tocno: true };
    }
    for (let i = 0; i < polja.length; i++) {
      const r = provjeriPolje(s, polja[i], vals[i]);
      if (!r.tocno) return { ...r, polje: i, poruka: polja.length > 1 ? `${i + 1}. odgovor: ${r.poruka}` : r.poruka };
    }
    return { tocno: true };
  },
  tocanOdgovor: (s) => s.polja.map((p) => `${p.oznaka ? `${p.oznaka} ` : ""}$${texIzraza(p.odgovor, varijableIzraza(s))}$`).join(", "),
  // ključ za usporedbu blizanca s pitanjem: iste vrijednosti = isti odgovor
  kljucOdgovora: (s) =>
    s.polja
      .map((p) => {
        const t = poljeOdgovor(s, p);
        // svaka varijabla dobiva svoju „nasumičnu“ vrijednost (ne samo x i y)
        const v = Object.fromEntries(varijableIzraza(s).map((n, i) => [n, 0.731 + 0.639 * i]));
        return t.greska ? "?" : String(Number(t.fn(v).toPrecision(9)));
      })
      .sort()
      .join("|"),
};

// ── skup na brojevnom pravcu ──────────────────────────────────────────────────────────────────────
// Učenik na pravcu s istaknutim točkama bira dijelove (između točaka) i točke (pune = uključene), a ispod
// vidi zapis intervala koji je time sastavio. Tako se veže slika (graf, nejednadžba) i zapis ⟨ ⟩ [ ].
export function tockePravca(s) {
  return (s.tocke ?? [])
    .map((t) => ({ v: vrijednost(String(t)), tex: texIzraza(String(t)) }))
    .filter((t) => t.v != null)
    .sort((a, b) => a.v - b.v);
}

// Odabir na pravcu {dijelovi: [bool] (n+1), tocke: [bool] (n)} → skup.
export function skupIzOdabira(s, odabir) {
  const t = tockePravca(s);
  const out = [];
  (odabir?.dijelovi ?? []).forEach((da, i) => {
    if (!da) return;
    const a = i === 0 ? { v: -Infinity, tex: "-\\infty" } : t[i - 1];
    const b = i === t.length ? { v: Infinity, tex: "+\\infty" } : t[i];
    out.push({ a: a.v, b: b.v, ua: false, ub: false, ta: a.tex, tb: b.tex });
  });
  (odabir?.tocke ?? []).forEach((da, i) => {
    if (da && t[i]) out.push({ a: t[i].v, b: t[i].v, ua: true, ub: true, ta: t[i].tex, tb: t[i].tex });
  });
  return sredi(out);
}

// Skup → odabir na pravcu (za prikaz rješenja): dio je odabran ako mu je sredina u skupu.
export function odabirIzSkupa(s, skup) {
  const t = tockePravca(s).map((x) => x.v);
  const sredine = [t.length ? t[0] - 1 : 0, ...t.slice(1).map((v, i) => (t[i] + v) / 2), t.length ? t.at(-1) + 1 : 0];
  if (!t.length) return { dijelovi: [sadrzi(skup, 0)], tocke: [] };
  return { dijelovi: sredine.map((x) => sadrzi(skup, x)), tocke: t.map((x) => sadrzi(skup, x)) };
}

const skupOdgovora = (s) => parseSkup(s.odgovor);

// „upisi“: učenikov zapis (LaTeX iz matematičkog polja) → isti skup? Poruke za tipične greške: krive zagrade na
// krajevima, suprotni dijelovi, krivi krajevi.
function provjeriZapisSkupa(s, skup, latex) {
  if (!String(latex ?? "").trim()) return { tocno: false, poruka: "Upiši skup.", prazno: true };
  const u = ucitajSkupLatex(latex);
  if (u.greska) return { tocno: false, poruka: `Ne mogu pročitati zapis: ${u.greska}.`, prazno: true };
  const njegov = u.skup;
  if (jednakiSkupovi(njegov, skup) || (s.jos_tocno ?? []).some((t) => jednakiSkupovi(njegov, parseSkup(t)))) return { tocno: true };
  for (const k of s.krivo ?? []) if (jednakiSkupovi(njegov, parseSkup(k.odgovor))) return { tocno: false, poruka: k.poruka };
  const blizu = (x, y) => x === y || Math.abs(x - y) < 1e-9;
  if (njegov.length === skup.length && njegov.every((d, i) => blizu(d.a, skup[i].a) && blizu(d.b, skup[i].b))) {
    return { tocno: false, poruka: "Krajevi su dobri, ali zagrade nisu. ⟨ ⟩ znači da kraj nije u skupu (kod < i >, i uvijek uz ∞), a [ ] da jest (kod ≤ i ≥)." };
  }
  if (skup.length && jednakiSkupovi(njegov, komplement(skup))) {
    return { tocno: false, poruka: "To je upravo suprotan dio pravca. Provjeri traži li se gdje je izraz veći ili manji od nule." };
  }
  return { tocno: false, poruka: s.savjet || "Nije točno. Provjeri krajeve: uvrsti po jedan broj iz svakog dijela i pogledaj vrijedi li uvjet." };
}

export const interval = {
  tip: "interval",
  samoRucno: true,
  uloga: (s) => (s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR),
  opis: `Skup na brojevnom pravcu ili zapis skupa. Polja: tekst, tocke: [brojevi ili izrazi, npr. 1, "2-sqrt(3)"] (1–6 istaknutih točaka), nacin:
- "odaberi": učenik bira dijelove pravca i pune/prazne točke, a ispod vidi zapis; odgovor: "⟨-inf, 1⟩ U ⟨3, inf⟩" (⟨ ⟩ ili < > za otvoren, [ ]
  za zatvoren kraj, U za uniju, {2} ili {1; 2} za točke, ∅, R, R \\ {-4} za razliku, ∩ za presjek); svaki konačni kraj mora biti među tockama;
  krivo?: [{odgovor (skup), poruka}];
- "upisi": učenik sam piše zapis skupa u matematičko polje (tipkovnica sa ⟨ ⟩ [ ] ∪ ∞ ℝ); oznaka? (ispred polja, zadano "$x \\in$"),
  odgovor i krivo kao gore, tocke nisu potrebne; jos_tocno?: [skup] za drugi jednako ispravan odgovor (npr. rast na [-1, 1] i ⟨-1, 1⟩); točan je svaki zapis istog skupa (npr. ℝ∖{-4} i ⟨-∞, -4⟩ ∪ ⟨-4, +∞⟩);
- "prikaz": pokazuje skup (odgovor) bez pitanja: korak za gledanje.`,
  primjer: { tip: "interval", nacin: "odaberi", tekst: "Za koje je $x$ parabola iznad osi $x$?", tocke: [1, 3], odgovor: "<-inf, 1> U <3, inf>", krivo: [{ odgovor: "<1, 3>", poruka: "Između 1 i 3 parabola je ispod osi." }] },
  validate(s) {
    const { list, need } = problems();
    need(["odaberi", "upisi", "prikaz"].includes(s.nacin), "interval.nacin mora biti odaberi, upisi ili prikaz");
    if (s.oznaka != null) need(isText(s.oznaka), "interval.oznaka mora biti tekst");
    need(isText(s.tekst), "interval treba „tekst“");
    const raw = s.tocke ?? [];
    const t = tockePravca(s);
    need(Array.isArray(raw) && raw.length <= 6 && t.length === raw.length, "tocke su 0–6 brojeva ili izraza bez varijabli");
    need(new Set(t.map((x) => x.v.toPrecision(9))).size === t.length, "tocke moraju biti različite");
    let skup = null;
    try {
      skup = skupOdgovora(s);
    } catch (e) {
      need(false, `odgovor: ${e.message}`);
    }
    if (skup && s.nacin !== "upisi") {
      const krajevi = skup.flatMap((d) => [d.a, d.b]).filter(Number.isFinite);
      const nema = krajevi.filter((k) => !t.some((x) => Math.abs(x.v - k) < 1e-9));
      need(!nema.length, `kraj ${nema[0]} nije među tockama, pa ga učenik ne može označiti`);
    }
    if (s.nacin === "prikaz") need(!("krivo" in s), "interval \"prikaz\" je za gledanje, pa nema „krivo“");
    for (const [j, t] of (s.jos_tocno ?? []).entries()) {
      try {
        parseSkup(t);
      } catch (e) {
        need(false, `jos_tocno[${j}]: ${e.message}`);
      }
    }
    for (const [j, k] of (s.krivo ?? []).entries()) {
      try {
        const kr = parseSkup(k?.odgovor);
        need(isText(k?.poruka), `krivo[${j}] treba „poruka“`);
        if (skup) need(!jednakiSkupovi(kr, skup), `krivo[${j}] jednak je točnom odgovoru`);
      } catch (e) {
        need(false, `krivo[${j}].odgovor: ${e.message}`);
      }
    }
    return list;
  },
  check(s, odabir) {
    const skup = skupOdgovora(s);
    if (s.nacin === "upisi") return provjeriZapisSkupa(s, skup, odabir);
    const njegov = skupIzOdabira(s, odabir);
    if (jednakiSkupovi(njegov, skup) || (s.jos_tocno ?? []).some((t) => jednakiSkupovi(njegov, parseSkup(t)))) return { tocno: true };
    for (const k of s.krivo ?? []) if (jednakiSkupovi(njegov, parseSkup(k.odgovor))) return { tocno: false, poruka: k.poruka };
    const tocan = odabirIzSkupa(s, skup);
    const isti = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    if (isti(odabir.dijelovi, tocan.dijelovi)) {
      return { tocno: false, poruka: "Dijelovi pravca su dobri, ali krajevi nisu. Kod < i > granica nije u rješenju (prazan kružić, ⟨ ⟩), a kod ≤ i ≥ jest (pun kružić, [ ])." };
    }
    if (tocan.dijelovi.length > 1 && isti(odabir.dijelovi, tocan.dijelovi.map((x) => !x))) {
      return { tocno: false, poruka: "Odabrao si upravo suprotne dijelove. Provjeri traži li se gdje je izraz veći ili manji od nule." };
    }
    return { tocno: false, poruka: s.savjet || "Nije točno. Za svaki dio pravca provjeri vrijedi li nejednakost (npr. uvrsti jedan broj iz tog dijela)." };
  },
  tocanOdgovor: (s) => `$${texSkupa(skupOdgovora(s))}$`,
  kljucOdgovora: (s) => {
    try {
      return texSkupa(skupOdgovora(s)).replace(/\s+/g, "");
    } catch {
      return "?";
    }
  },
};

// ── graf funkcije s parametrima ───────────────────────────────────────────────────────────────────
// Funkcije u x i parametrima klizača; klizač ima raspon (min, max, korak) ili popis vrijednosti (izraza, npr. π/6).
// „poklopi“: učenik klizačima namješta svoj graf dok se ne poklopi s isprekidanim grafom iz zadatka.
export function vrijednostiKlizaca(k) {
  if (Array.isArray(k.vrijednosti)) return k.vrijednosti.map((v) => ({ v: vrijednost(String(v)), tex: texIzraza(String(v)), izvor: v }));
  const out = [];
  if (![k.min, k.max, k.korak].every(isNum) || k.korak <= 0 || k.max <= k.min) return out;
  for (let v = k.min; v <= k.max + k.korak * 1e-6 && out.length <= 400; v += k.korak) {
    const r = Number((Math.round(v / k.korak) * k.korak).toPrecision(10));
    out.push({ v: r, tex: texIzraza(String(r)), izvor: r });
  }
  return out;
}

export const indeksVrijednosti = (k, v) => {
  const x = vrijednost(String(v));
  return vrijednostiKlizaca(k).findIndex((o) => x != null && Math.abs(o.v - x) < 1e-9);
};

// Funkcije grafa za zadane parametre: oznaka → f(x); izvan [od, do] funkcija nije nacrtana
export function funkcijeGrafa(s, parametri = {}) {
  return (s.funkcije ?? []).map((fn) => {
    const c = compile(fn.izraz);
    const [od, d] = [fn.od != null ? vrijednost(String(fn.od)) : -Infinity, fn.do != null ? vrijednost(String(fn.do)) : Infinity];
    return { ...fn, od, do: d, f: (x) => (x < od - 1e-12 || x > d + 1e-12 ? NaN : c.fn({ ...parametri, x })) };
  });
}

// ── geometrija na istom crtežu ──
// Točka je [x, y] ili [x, y, z] (tijelo u prostoru: z je visina, y dubina), a koordinate smiju biti izrazi („sqrt(3)“).
// Prostor se crta kosom projekcijom: dubina ide pod 45° skraćena na pola.
const KOSO = 0.5 * Math.SQRT1_2;
export function tockaCrteza(t) {
  if (!Array.isArray(t) || (t.length !== 2 && t.length !== 3)) return null;
  // broj ide izravno: String(1e-16) bi se pročitao kao 1·e − 16
  const v = t.map((x) => (typeof x === "number" ? (Number.isFinite(x) ? x : null) : vrijednost(String(x))));
  if (v.some((x) => x == null)) return null;
  return t.length === 2 ? v : [v[0] + KOSO * v[1], v[2] + KOSO * v[1]];
}
export const tockaIzPolja = (t) => tockaCrteza(t?.z != null ? [t.x, t.y, t.z] : [t?.x, t?.y]);

// Okvir crteža (u px) za zadani raspon: geometrija i jednaka mjerila na osima (krug ostaje krug, kut ostaje kut).
export const CRTEZ = { W: 400, rub: { L: 34, R: 14, T: 14, B: 26 }, rubBezOsi: { L: 14, R: 14, T: 14, B: 14 }, minH: 180, maxH: 380, maxHBezOsi: 460 };
// lijevi rub mora primiti najdulji broj na osi y (npr. „12000“)
function sirinaBrojevaY(s) {
  const k = s.korak_y ?? 1;
  let n = 1;
  for (let i = Math.ceil(s.y[0] / k - 1e-9); i * k <= s.y[1] + 1e-9 && i - Math.ceil(s.y[0] / k) < 60; i++) n = Math.max(n, String(Number((i * k).toPrecision(10))).length);
  return n;
}
export function okvirCrteza(s) {
  const osnovni = s.osi === false ? CRTEZ.rubBezOsi : CRTEZ.rub;
  const rub = s.osi === false ? osnovni : { ...osnovni, L: Math.max(osnovni.L, 12 + 6.6 * sirinaBrojevaY(s)) };
  const sirina = CRTEZ.W - rub.L - rub.R;
  const zeljena = (sirina / (s.x[1] - s.x[0])) * (s.y[1] - s.y[0]) + rub.T + rub.B;
  const H = Math.round(Math.min(s.osi === false ? CRTEZ.maxHBezOsi : CRTEZ.maxH, Math.max(CRTEZ.minH, zeljena)));
  return { ...rub, W: CRTEZ.W, H, jednako: Math.abs(H - zeljena) < 2 };
}

// geometrija traži jednako mjerilo na osima (krug, kut); crtež bez funkcije smije biti i samo točke ili crte
const ima = (s, polja = ["tijela", "likovi", "duzine", "kruznice", "kutovi"]) => polja.some((k) => (s[k] ?? []).length);
const imaIstoMjerilo = (s) => ima(s);
const imaSadrzaj = (s) => ima(s, ["tijela", "likovi", "duzine", "kruznice", "kutovi", "vektori", "tekstovi", "tocke", "crte", "strelice"]);

export const pocetniParametri = (s) => Object.fromEntries((s.klizaci ?? []).map((k) => [k.id, vrijednost(String(k.pocetak))]));
export const ciljniParametri = (s) => Object.fromEntries(Object.entries(s.cilj ?? {}).map(([id, v]) => [id, vrijednost(String(v))]));

function istiGrafovi(s, p1, p2) {
  const [f] = funkcijeGrafa(s, p1);
  const [g] = funkcijeGrafa(s, p2);
  let n = 0;
  for (let k = 0; k <= 60; k++) {
    const x = s.x[0] + ((s.x[1] - s.x[0]) * (k + 0.37)) / 61;
    const [a, b] = [f.f(x), g.f(x)];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a))) return false;
    n++;
  }
  return n > 10;
}

const NACINI_GRAFA = ["prikaz", "istrazi", "poklopi"];
export const POLOZAJI = ["gore", "dolje", "lijevo", "desno", "gore-desno", "gore-lijevo", "dolje-desno", "dolje-lijevo"];

export const graf_funkcije = {
  tip: "graf_funkcije",
  samoRucno: true,
  uloga: (s) => (s.nacin === "poklopi" ? ODGOVOR : POGLEDAJ),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Graf funkcije u koordinatnom sustavu. Polja: tekst, x: [od, do], y: [od, do], korak_x?, korak_y? (mreža; inače 1), pi_x?: k (crtice na
x-osi u koracima π/k), funkcije: [{izraz (u x i parametrima), oznaka?, isprekidano?}] (1–3), tocke?: [{x, y, oznaka?}],
crte?: [{y | x, oznaka?}] (vodoravna/okomita isprekidana crta), strelice?: [{od: [x, y], do: [x, y], oznaka?}],
istakni?: {znak: ">0" | "<0" | ">=0" | "<=0"} (dio grafa prve funkcije iznad/ispod osi i odgovarajući dio osi x),
formula?: LaTeX s {id} parametara ({id:k} za koeficijent: 1 se ne piše; npr. "f(x) = {A:k}\\\\cos({B}x) + {D}"), klizaci?: [{id, oznaka, min, max, korak, pocetak} ili
{id, oznaka, vrijednosti: ["pi/6", …], pocetak}] (1–4), nacin:
Isti crtež crta i geometriju (točka je [x, y] ili [x, y, z] za tijelo u prostoru, z je visina, y dubina, kosa projekcija; koordinate
smiju biti izrazi): osi?: false (bez osi i brojeva), mreza?: false (bez mreže), funkcije tada smiju biti 0, funkcija.od?/do? (graf samo na
[od, do]), tocke[].z?, tocke[].polozaj? ("gore", "dolje", "lijevo", "desno", "gore-desno"…), tocke[].prazna? (prazan kružić),
likovi?: [{tocke: [[x, y], …], ispuna?, isprekidano?}], duzine?: [{od, do, oznaka?, isprekidano?, istaknuto?, strana?: 1 | -1}],
kruznice?: [{sredina: [x, y] ili [x, y, z], r, isprekidano?, ispuna?}] (sa [x, y, z] vodoravna kružnica u prostoru, npr. baza valjka:
elipsa sa stražnjom polovicom isprekidano; ispuna: baza vidljiva odozgo, cijela puna), kutovi?: [{vrh, od, do, oznaka?, pravi?}] (manji kut između krakova vrh→od i
vrh→do), tijela?: [{vrsta: "valjak" | "stozac", sredina: [x, y, z] (središte donje baze), r, h}] (obris, baze i skriveni dio
isprekidano, točno izračunati za kosu projekciju; visinu, polumjer i oznake dodaj kao duzine/tocke), vektori?: [{od, do, oznaka?}], tekstovi?: [{x, y, z?, tekst}], os_x?, os_y? (imena osi, npr. "Re" i "Im"). Oznake na crtežu su kratak tekst (smije $\\alpha$, $\\sqrt{3}$,
$x_1$, $\\vec{a}$, $90^\\circ$). Uz geometriju raspon x i y mora čuvati omjer (validator javi ako bi se krug izobličio).
- "prikaz": samo graf (bez klizača); "istrazi": klizači mijenjaju graf (korak za gledanje);
- "poklopi": učenik klizačima poklopi svoj graf s isprekidanim grafom iz zadatka: cilj: {id: vrijednost}; klizac.poruka? kad taj parametar ne valja.`,
  primjer: {
    tip: "graf_funkcije",
    nacin: "poklopi",
    tekst: "Pomiči klizač dok se tvoj graf ne poklopi s isprekidanim.",
    x: [-1, 13],
    y: [-5, 3],
    funkcije: [{ izraz: "A*cos(pi/6*x+pi/3)-1", oznaka: "f" }],
    klizaci: [{ id: "A", oznaka: "$A$", min: -4, max: 4, korak: 1, pocetak: 1 }],
    formula: "f(x) = {A:k}\\cos\\left(\\frac{\\pi}{6}x + \\frac{\\pi}{3}\\right) - 1",
    cilj: { A: 3 },
  },
  validate(s) {
    const { list, need } = problems();
    need(NACINI_GRAFA.includes(s.nacin), `graf_funkcije.nacin mora biti ${NACINI_GRAFA.join(", ")}`);
    need(isText(s.tekst), "graf_funkcije treba „tekst“");
    const osi = need(Array.isArray(s.x) && Array.isArray(s.y) && [...s.x, ...s.y].every(isNum) && s.x[1] > s.x[0] && s.y[1] > s.y[0], "x i y su [od, do] uz od < do");
    for (const k of ["korak_x", "korak_y"]) if (s[k] != null) need(isNum(s[k]) && s[k] > 0, `${k} mora biti pozitivan broj`);
    if (osi) {
      const kx = s.pi_x ? Math.PI / s.pi_x : (s.korak_x ?? 1);
      need((s.x[1] - s.x[0]) / kx <= 40 && (s.y[1] - s.y[0]) / (s.korak_y ?? 1) <= 40, "mreža ima previše crta (najviše 40 po osi): povećaj korak_x/korak_y");
    }
    const klizaci = s.klizaci ?? [];
    const ids = klizaci.map((k) => k?.id);
    if (s.nacin === "prikaz") need(!klizaci.length, "graf „prikaz“ nema klizače (za njih je „istrazi“ ili „poklopi“)");
    else need(klizaci.length >= 1 && klizaci.length <= 4, `graf „${s.nacin}“ treba 1–4 klizača`);
    klizaci.forEach((k, i) => {
      need(ID.test(k?.id ?? "") && k.id !== "x" && k.id !== "pi" && k.id !== "e", `klizaci[${i}].id mora biti ime parametra (ne x)`);
      need(isText(k?.oznaka), `klizaci[${i}] treba „oznaka“`);
      const v = vrijednostiKlizaca(k);
      if (need(v.length >= 2 && v.every((o) => o.v != null), `klizaci[${i}] treba min, max, korak ili popis vrijednosti (barem 2)`)) {
        need(indeksVrijednosti(k, k.pocetak) >= 0, `klizaci[${i}].pocetak mora biti jedna od vrijednosti klizača`);
      }
    });
    need(new Set(ids).size === ids.length, "id-jevi klizača moraju biti različiti");
    const geometrija = imaIstoMjerilo(s);
    const najmanje = imaSadrzaj(s) && s.nacin === "prikaz" ? 0 : 1;
    if (need(Array.isArray(s.funkcije ?? (najmanje ? null : [])) && (s.funkcije ?? []).length >= najmanje && (s.funkcije ?? []).length <= 3, `graf_funkcije treba ${najmanje}–3 funkcije`)) {
      (s.funkcije ?? []).forEach((fn, i) => {
        for (const k of ["od", "do"]) if (fn?.[k] != null) need(vrijednost(String(fn[k])) != null, `funkcije[${i}].${k} mora biti broj`);
        try {
          const c = compile(fn?.izraz);
          const strane = c.vars.filter((v) => v !== "x" && !ids.includes(v));
          need(!strane.length, `funkcije[${i}] koristi nepoznate parametre: ${strane.join(", ")}`);
        } catch (e) {
          need(false, `funkcije[${i}].izraz: ${e.message}`);
        }
      });
    }
    for (const [i, t] of (s.tocke ?? []).entries()) {
      need(tockaIzPolja(t) != null, `tocke[${i}] treba x i y (i z za prostor), brojeve ili izraze`);
      if (t?.polozaj != null) need(POLOZAJI.includes(t.polozaj), `tocke[${i}].polozaj mora biti jedno od: ${POLOZAJI.join(", ")}`);
    }
    for (const k of ["os_x", "os_y"]) if (s[k] != null) need(isText(s[k]), `${k} mora biti tekst`);
    const tocka = (t, gdje) => need(tockaCrteza(t) != null, `${gdje} mora biti točka [x, y] ili [x, y, z]`);
    for (const [i, l] of (s.likovi ?? []).entries()) {
      if (need(Array.isArray(l?.tocke) && l.tocke.length >= 3, `likovi[${i}] treba barem 3 točke`)) l.tocke.forEach((t, j) => tocka(t, `likovi[${i}].tocke[${j}]`));
    }
    for (const [i, d] of (s.duzine ?? []).entries()) {
      tocka(d?.od, `duzine[${i}].od`);
      tocka(d?.do, `duzine[${i}].do`);
      if (d?.strana != null) need(d.strana === 1 || d.strana === -1, `duzine[${i}].strana je 1 ili -1`);
    }
    for (const [i, k] of (s.kruznice ?? []).entries()) {
      tocka(k?.sredina, `kruznice[${i}].sredina`);
      need(vrijednost(String(k?.r)) > 0, `kruznice[${i}].r mora biti pozitivan broj`);
    }
    for (const [i, t] of (s.tijela ?? []).entries()) {
      need(["valjak", "stozac"].includes(t?.vrsta), `tijela[${i}].vrsta je "valjak" ili "stozac"`);
      need(Array.isArray(t?.sredina) && t.sredina.length === 3 && tockaCrteza(t.sredina) != null, `tijela[${i}].sredina je [x, y, z]`);
      need(vrijednost(String(t?.r)) > 0 && vrijednost(String(t?.h)) > 0, `tijela[${i}] treba pozitivne r i h`);
    }
    for (const [i, k] of (s.kutovi ?? []).entries()) for (const z of ["vrh", "od", "do"]) tocka(k?.[z], `kutovi[${i}].${z}`);
    for (const [i, v] of (s.vektori ?? []).entries()) for (const z of ["od", "do"]) tocka(v?.[z], `vektori[${i}].${z}`);
    for (const [i, t] of (s.tekstovi ?? []).entries()) need(tockaIzPolja(t) != null && isText(t?.tekst), `tekstovi[${i}] treba x, y i tekst`);
    if (osi && (geometrija || s.osi === false)) {
      const o = okvirCrteza(s);
      if (!o.jednako) {
        const omjer = (s.y[1] - s.y[0]) / (s.x[1] - s.x[0]);
        need(false, `raspon x i y ne čuva omjer (y/x = ${omjer.toFixed(2)}), pa bi se krug ili kut izobličio: ${o.H >= (s.osi === false ? CRTEZ.maxHBezOsi : CRTEZ.maxH) ? "proširi x ili smanji y" : "proširi y ili smanji x"}`);
      }
    }
    for (const [i, c] of (s.crte ?? []).entries()) need(("x" in (c ?? {})) !== ("y" in (c ?? {})) && vrijednost(String(c.x ?? c.y)) != null, `crte[${i}] treba točno jedno od x ili y`);
    for (const [i, st] of (s.strelice ?? []).entries()) need([...(st?.od ?? []), ...(st?.do ?? [])].length === 4 && [...st.od, ...st.do].every((v) => vrijednost(String(v)) != null), `strelice[${i}] treba od: [x, y] i do: [x, y]`);
    if (s.istakni != null) need([">0", "<0", ">=0", "<=0"].includes(s.istakni?.znak), "istakni.znak mora biti >0, <0, >=0 ili <=0");
    if (s.nacin === "poklopi") {
      if (need(s.cilj && typeof s.cilj === "object" && ids.every((id) => id in s.cilj), "„poklopi“ treba cilj s vrijednošću svakog klizača") && osi && !list.length) {
        klizaci.forEach((k, i) => need(indeksVrijednosti(k, s.cilj[k.id]) >= 0, `cilj.${k.id} mora biti jedna od vrijednosti klizača ${i + 1}`));
        need(!istiGrafovi(s, pocetniParametri(s), ciljniParametri(s)), "graf se na početku već poklapa s ciljem: promijeni pocetak klizača");
      }
    } else noAnswerFields(s, need);
    return list;
  },
  check(s, parametri) {
    if (istiGrafovi(s, parametri, ciljniParametri(s))) return { tocno: true };
    const cilj = ciljniParametri(s);
    const los = (s.klizaci ?? []).find((k) => Math.abs((parametri?.[k.id] ?? NaN) - cilj[k.id]) > 1e-9);
    return { tocno: false, poruka: los?.poruka || "Grafovi se još ne poklapaju. Usporedi najviše i najniže točke i razmak između vrhova." };
  },
  tocanOdgovor: (s) =>
    (s.klizaci ?? [])
      .map((k) => `$${k.id} = ${texIzraza(String(s.cilj?.[k.id]))}$`)
      .join(", "),
  kljucOdgovora: (s) => (s.nacin === "poklopi" ? JSON.stringify(ciljniParametri(s)) + (s.funkcije?.[0]?.izraz ?? "") : null),
};

export { texSkupa, parseSkup };
