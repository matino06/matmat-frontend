// plinski_dijagram: p–V (ili V–T, p–T) dijagram idealnog plina. Stanja su točke, procesi krivulje (izobara,
// izohora, izoterma, adijabata, ravna crta), rad je površina ispod puta. Svu fiziku (krivulje, stanje nakon
// procesa, W, ΔU, Q i njihove znakove) računa ovaj modul; komponenta samo crta njegove brojeve, pa crtež i
// provjera nikad ne kažu različito. Plin je jednoatomni: U = 3/2 pV = 3/2 nRT, adijabata pV^γ = konst., γ = 5/3.
import { isNum, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
} from "../zajednicko.js";
import {
  R,
  GAMA,
  NULA_C,
  P_JEDINICE,
  V_JEDINICE,
  T_JEDINICE,
  IME,
  iznos,
  blizu,
  raspon,
} from "./_plin.js";

const NACINI = ["istrazi", "postavi", "put", "dionice"];
export const OSI = {
  pV: { x: "V", y: "p" },
  VT: { x: "T", y: "V" },
  pT: { x: "T", y: "p" },
};
export const VRSTE = [
  "izobarno",
  "izohorno",
  "izotermno",
  "adijabatno",
  "ravno",
];
const STALNO = { izobarno: "p", izohorno: "V", izotermno: "T" };
export const OPIS_VRSTE = {
  izobarno: "izobarni (stalan tlak)",
  izohorno: "izohorni (stalan volumen)",
  izotermno: "izotermni (stalna temperatura)",
  adijabatno: "adijabatski (bez izmjene topline)",
  ravno: "ravna crta",
};
const GENITIV = {
  izobarno: "izobarnog procesa (stalan tlak)",
  izohorno: "izohornog procesa (stalan volumen)",
  izotermno: "izotermnog procesa (stalna temperatura)",
  adijabatno: "adijabatskog procesa",
};
const ZENSKI = {
  izobarno: "izobarna",
  izohorno: "izohorna",
  izotermno: "izotermna",
  adijabatno: "adijabatska",
  ravno: "ravna crta",
};
export const KRATKO_VRSTE = {
  izobarno: "izobarno",
  izohorno: "izohorno",
  izotermno: "izotermno",
  adijabatno: "adijabatski",
  ravno: "ravno",
};
const PRIKAZI = ["p", "V", "T", "pV", "U", "W", "Q"];
const ENERGIJE = ["pV", "U", "W", "Q"];
export const VELICINE = ["W", "dU", "Q"];
export const ZNAKOVI = ["+", "0", "-"];
const MAX_STANJA = 8;

// ── osnovno: osi, jedinice, konstanta k u pV = k·T ─────────────────────────────────────────────────────
export const osiOd = (s) => OSI[s.osi ?? "pV"];
export function jediniceOd(s) {
  const j = s.jedinice ?? {};
  return { p: j.p ?? "kPa", V: j.V ?? "L", T: j.T ?? "K" };
}
const celzij = (s) => jediniceOd(s).T === "°C";
// T iz jedinice speca u kelvine i natrag
export const uK = (s, t) => (celzij(s) ? t + NULA_C : t);
export const izK = (s, T) => (celzij(s) ? T - NULA_C : T);
// J po (jedinica tlaka · jedinica volumena): kPa · L = 1 J
export const energijaFaktor = (s) =>
  P_JEDINICE[jediniceOd(s).p] * V_JEDINICE[jediniceOd(s).V];

// k = pV/T u jedinicama speca (T u K). Iz n, ili iz stanja koje ima i treću veličinu; inače relativno (k = 1):
// oblik krivulja i znakovi su točni, ali iznosi T (pV) i energija (V–T, p–T) nemaju smisla.
export function konstanta(s) {
  if (isNum(s.n) && s.n > 0)
    return { k: (s.n * R) / energijaFaktor(s), poznato: true };
  const treca = trecaVelicina(s);
  const st = (s.stanja ?? []).find(
    (t) =>
      isNum(t?.[treca]) &&
      isNum(t?.p ?? t?.V) &&
      ["p", "V", "T"].every((q) => isNum(t?.[q])),
  );
  if (st && uK(s, st.T) > 0)
    return { k: (st.p * st.V) / uK(s, st.T), poznato: true };
  return { k: 1, poznato: false };
}
// veličina koja nije na osima (T na p–V, p na V–T, V na p–T)
export const trecaVelicina = (s) =>
  ["p", "V", "T"].find((q) => q !== osiOd(s).x && q !== osiOd(s).y);

// Puno stanje {oznaka, p, V, T} (p, V u jedinicama speca, T u K) iz koordinata na osima.
function izKoordinata(s, k, t) {
  const osi = osiOd(s);
  if (osi.x === "V") return { p: t.p, V: t.V, T: (t.p * t.V) / k };
  const T = uK(s, t.T);
  return osi.y === "V"
    ? { p: (k * T) / t.V, V: t.V, T }
    : { p: t.p, V: (k * T) / t.p, T };
}
export function punaStanja(s) {
  const { k } = konstanta(s);
  return (s.stanja ?? []).map((t) => ({
    oznaka: t.oznaka,
    ...izKoordinata(s, k, t),
  }));
}
export const stanjeOd = (s, oznaka) =>
  punaStanja(s).find((t) => t.oznaka === oznaka);
// koordinate stanja na osima (T u jedinici speca)
export function koordinate(s, st) {
  const osi = osiOd(s);
  const v = (q) => (q === "T" ? izK(s, st.T) : st[q]);
  return { x: v(osi.x), y: v(osi.y) };
}
export function izTocke(s, x, y) {
  const osi = osiOd(s);
  return izKoordinata(s, konstanta(s).k, { [osi.x]: x, [osi.y]: y });
}

// ── procesi ────────────────────────────────────────────────────────────────────────────────────────────
// Stanje na procesu `vrsta` kroz stanje a na kojem veličina q (p, V ili T u K) ima vrijednost v; null ako to nije
// moguće (veličina je na tom procesu stalna ili vrijednost nije pozitivna).
export function naProcesu(a, vrsta, q, v, k) {
  if (!(v > 0)) return null;
  const st = (p, V) =>
    p > 0 && V > 0 && Number.isFinite(p) && Number.isFinite(V)
      ? { p, V, T: (p * V) / k }
      : null;
  if (STALNO[vrsta] === q)
    return blizu(a[q], v, 1e-9) ? { p: a.p, V: a.V, T: a.T } : null;
  if (vrsta === "izobarno")
    return q === "V" ? st(a.p, v) : st(a.p, (k * v) / a.p);
  if (vrsta === "izohorno")
    return q === "p" ? st(v, a.V) : st((k * v) / a.V, a.V);
  if (vrsta === "izotermno")
    return q === "p" ? st(v, (a.p * a.V) / v) : st((a.p * a.V) / v, v);
  if (vrsta === "adijabatno") {
    const C = a.p * a.V ** GAMA;
    if (q === "V") return st(C / v ** GAMA, v);
    if (q === "p") return st(v, (C / v) ** (1 / GAMA));
    const V = a.V * (a.T / v) ** (1 / (GAMA - 1));
    return st((k * v) / V, V);
  }
  return null;
}

// Leži li b na procesu `vrsta` iz a.
export function naIstomProcesu(a, b, vrsta) {
  if (vrsta === "ravno") return true;
  if (vrsta === "izobarno") return blizu(a.p, b.p, 1e-3);
  if (vrsta === "izohorno") return blizu(a.V, b.V, 1e-3);
  if (vrsta === "izotermno") return blizu(a.p * a.V, b.p * b.V, 5e-3);
  if (vrsta === "adijabatno")
    return blizu(a.p * a.V ** GAMA, b.p * b.V ** GAMA, 1e-2);
  return false;
}

// n + 1 stanja od a do b po procesu (za crtanje krivulje i površine).
export function uzorci(s, a, b, vrsta, n = 60) {
  const { k } = konstanta(s);
  const out = [];
  if (vrsta === "ravno") {
    const [ka, kb] = [koordinate(s, a), koordinate(s, b)];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push(izTocke(s, ka.x + (kb.x - ka.x) * t, ka.y + (kb.y - ka.y) * t));
    }
    return out;
  }
  // izohora se uzorkuje po tlaku, ostali po volumenu (izoterma na V–T / p–T je okomita crta, volumen se ipak mijenja)
  const q = vrsta === "izohorno" ? "p" : "V";
  for (let i = 0; i <= n; i++)
    out.push(naProcesu(a, vrsta, q, a[q] + ((b[q] - a[q]) * i) / n, k) ?? a);
  return out;
}

// Rad, promjena unutarnje energije i toplina na dionici a → b (u J ako su iznosi poznati, inače relativno).
export function dionica(s, a, b, vrsta) {
  const E = energijaFaktor(s);
  let W;
  if (vrsta === "izobarno") W = a.p * (b.V - a.V);
  else if (vrsta === "izohorno") W = 0;
  else if (vrsta === "izotermno") W = a.p * a.V * Math.log(b.V / a.V);
  else if (vrsta === "adijabatno") W = (a.p * a.V - b.p * b.V) / (GAMA - 1);
  else {
    const u = uzorci(s, a, b, "ravno", 200);
    W = 0;
    for (let i = 1; i < u.length; i++)
      W += ((u[i].p + u[i - 1].p) / 2) * (u[i].V - u[i - 1].V);
  }
  const dU = 1.5 * (b.p * b.V - a.p * a.V);
  const Q = vrsta === "adijabatno" ? 0 : W + dU;
  const skala = Math.max(a.p * a.V, b.p * b.V) * E;
  return { W: W * E, dU: dU * E, Q: Q * E, skala };
}
export const znak = (x, skala) =>
  Math.abs(x) <= 1e-6 * skala ? "0" : x > 0 ? "+" : "-";

// Znakovi W, ΔU, Q za svaki proces iz speca.
export function znakoviDionica(s) {
  return (s.procesi ?? []).map((pr) => {
    const [a, b] = [stanjeOd(s, pr.od), stanjeOd(s, pr.do)];
    const d = dionica(s, a, b, pr.vrsta);
    return {
      W: znak(d.W, d.skala),
      dU: znak(d.dU, d.skala),
      Q: znak(d.Q, d.skala),
      iznosi: d,
      a,
      b,
      vrsta: pr.vrsta,
    };
  });
}

// ── postavi: stanje nakon procesa ──────────────────────────────────────────────────────────────────────
const ciljVelicina = (s) => Object.keys(s.cilj ?? {})[0];
// cilj u unutarnjim jedinicama (T u K); `kaoKelvin` = greška „°C uvršteni kao K“
export function stanjeNakon(s, { vrsta = s.proces, kaoKelvin = false } = {}) {
  const a = stanjeOd(s, s.pocetak);
  if (!a) return null;
  const q = ciljVelicina(s);
  const v = s.cilj[q];
  const { k } = konstanta(s);
  if (kaoKelvin) {
    // ista računica s brojevima u °C umjesto u K: T₁ i T₂ bez +273
    const t1 = izK(s, a.T);
    if (!(t1 > 0)) return null;
    const lazni = { p: a.p, V: a.V, T: t1 };
    const k2 = (a.p * a.V) / t1;
    const r = naProcesu(lazni, vrsta, q, v, k2);
    return r ? { ...r, T: uK(s, r.T) } : null;
  }
  return naProcesu(a, vrsta, q, q === "T" ? uK(s, v) : v, k);
}

// Krive točke za postavi: kraj drugog procesa, obrnuti omjer, °C umjesto K.
function kriveTocke(s) {
  const a = stanjeOd(s, s.pocetak);
  const tocno = stanjeNakon(s);
  const q = ciljVelicina(s);
  const out = [];
  for (const vrsta of ["izobarno", "izohorno", "izotermno", "adijabatno"]) {
    if (vrsta === s.proces) continue;
    const b = stanjeNakon(s, { vrsta });
    if (b)
      out.push({
        st: b,
        poruka: `Ta bi točka bila kraj ${GENITIV[vrsta]}. Ovdje je proces ${OPIS_VRSTE[s.proces]}${s.proces === "izotermno" ? ": vrijedi $pV$ = konst., pa točka ide po hiperboli" : s.proces === "adijabatno" ? ": plin ne izmjenjuje toplinu, pa se mijenjaju sve tri veličine" : ""}.`,
      });
  }
  // obrnuti omjer: veličina koja nije zadana promijeni se u krivom smjeru (r₁²/r)
  const osi = osiOd(s);
  const druga = [osi.x, osi.y].find((x) => x !== q && x !== STALNO[s.proces]);
  if (druga && tocno && a[druga] !== tocno[druga]) {
    const obrnuto = { ...tocno, [druga]: (a[druga] * a[druga]) / tocno[druga] };
    const gore = tocno[druga] > a[druga];
    out.push({
      st: obrnuto,
      poruka: `Obrnuo si omjer: ${IME[druga]} se ovdje mora ${gore ? "povećati" : "smanjiti"}, a ne ${gore ? "smanjiti" : "povećati"}. ${s.proces === "izotermno" ? "Pri stalnoj temperaturi veći tlak znači manji volumen ($pV$ = konst.)." : "Uvrsti vrijednosti u isti omjer s obje strane jednadžbe."}`,
    });
  }
  if (celzij(s) && (q === "T" || osi.x === "T")) {
    const b = stanjeNakon(s, { kaoKelvin: true });
    if (b)
      out.push({
        st: b,
        poruka:
          "Temperature si uvrstio u °C. U plinskim zakonima temperatura mora biti u kelvinima: $T = t + 273$.",
      });
  }
  return out;
}

// ── put: vrhovi i procesi kojima ih učenik mora povezati ───────────────────────────────────────────────
function putSpeca(s) {
  const st = s.stanja ?? [];
  return (s.procesi ?? []).map((pr, i) => ({
    ...pr,
    cilj: st[(i + 1) % st.length],
  }));
}

// ── tolerancija i usporedba točaka ─────────────────────────────────────────────────────────────────────
export function tolerancije(s) {
  const osi = osiOd(s);
  const t = (q) =>
    (isNum(s.tolerancija?.[q]) ? s.tolerancija[q] : (s.korak?.[q] ?? 0) / 2) *
      (1 + 1e-6) +
    1e-9;
  return { x: t(osi.x), y: t(osi.y) };
}
function istaTocka(s, st, tocka) {
  const k = koordinate(s, st);
  const tol = tolerancije(s);
  return Math.abs(k.x - tocka.x) <= tol.x && Math.abs(k.y - tocka.y) <= tol.y;
}
// odgovor {V: 0,4, p: 125} → {x, y}
function tockaOdgovora(s, o) {
  const osi = osiOd(s);
  const x = Number(o?.[osi.x]);
  const y = Number(o?.[osi.y]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

// ── tekst ──────────────────────────────────────────────────────────────────────────────────────────────
export function vrijednostTxt(s, q, v) {
  const j = jediniceOd(s);
  if (q === "T") return iznos(v, j.T);
  return iznos(v, j[q]);
}
export const tockaTxt = (s, st) => {
  const osi = osiOd(s);
  const k = koordinate(s, st);
  return `${osi.x} = ${vrijednostTxt(s, osi.x, k.x)}, ${osi.y} = ${vrijednostTxt(s, osi.y, k.y)}`;
};
export const ZNAK_TXT = { "+": "+", 0: "0", "-": "−" };
export const VELICINA_TXT = { W: "W", dU: "ΔU", Q: "Q" };
export const velicineOd = (s) => [].concat(s.velicina ?? "W");

// ── validacija ─────────────────────────────────────────────────────────────────────────────────────────
function validateZajednicko(s, need) {
  need(
    NACINI.includes(s.nacin),
    `plinski_dijagram.nacin mora biti jedan od: ${NACINI.join(", ")}`,
  );
  need(isText(s.tekst), "plinski_dijagram treba „tekst“ (što učenik radi)");
  if (!need(s.osi == null || s.osi in OSI, 'osi mora biti "pV", "VT" ili "pT"'))
    return false;
  const j = s.jedinice ?? {};
  need(
    j.p == null || j.p in P_JEDINICE,
    `jedinice.p mora biti jedna od: ${Object.keys(P_JEDINICE).join(", ")}`,
  );
  need(
    j.V == null || j.V in V_JEDINICE,
    `jedinice.V mora biti jedna od: ${Object.keys(V_JEDINICE).join(", ")}`,
  );
  need(
    j.T == null || T_JEDINICE.includes(j.T),
    'jedinice.T mora biti "K" ili "°C"',
  );
  if (s.jedinice != null)
    need(
      typeof s.jedinice === "object" &&
        Object.keys(s.jedinice).every((q) => ["p", "V", "T"].includes(q)),
      "jedinice smije imati samo p, V i T",
    );
  if (s.n != null)
    need(
      isNum(s.n) && s.n > 0,
      "n (količina plina u mol) mora biti pozitivan broj",
    );
  const osi = osiOd(s);
  let ok = true;
  for (const q of [osi.x, osi.y]) {
    const r = s[q];
    if (!need(raspon(r), `${q} mora biti raspon osi [od, do] uz od < do`)) {
      ok = false;
      continue;
    }
    // os smije početi malo ispod −273 °C, da se vidi produžetak pravca do apsolutne nule
    if (q === "T")
      need(
        uK(s, r[0]) >= -30,
        "raspon T smije početi najniže na −300 °C (apsolutna nula je 0 K = −273 °C)",
      );
    else need(r[0] >= 0, `raspon ${q} ne smije biti negativan`);
    const k = s.korak?.[q];
    if (
      need(
        isNum(k) && k > 0,
        `korak.${q} (razmak crta mreže na osi ${q}) mora biti pozitivan broj`,
      )
    ) {
      const n = (r[1] - r[0]) / k;
      need(
        n >= 2 && n <= 40,
        `os ${q}: (do − od)/korak mora biti između 2 i 40 (sada ${formatNumber(n)})`,
      );
    } else ok = false;
  }
  if (s.tolerancija != null)
    need(
      typeof s.tolerancija === "object" &&
        Object.entries(s.tolerancija).every(
          ([q, v]) => [osi.x, osi.y].includes(q) && isNum(v) && v > 0,
        ),
      `tolerancija mora biti {${osi.x}?, ${osi.y}?} s pozitivnim brojevima`,
    );
  for (const f of ["izoterme", "povrsina", "slobodno", "vodilica", "zatvoren"])
    need(
      s[f] == null || typeof s[f] === "boolean",
      `${f} mora biti true ili false`,
    );
  need(
    !s.povrsina || osi.x === "V",
    "povrsina (rad kao površina ispod krivulje) postoji samo na p–V dijagramu",
  );
  need(
    !s.izoterme || osi.x === "V",
    "izoterme u pozadini postoje samo na p–V dijagramu (na V–T i p–T su izoterme okomite crte)",
  );
  if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");

  // stanja
  const oznake = [];
  if (
    need(
      Array.isArray(s.stanja) &&
        s.stanja.length >= 1 &&
        s.stanja.length <= MAX_STANJA,
      `plinski_dijagram treba stanja: 1–${MAX_STANJA} točaka [{oznaka, ${osi.x}, ${osi.y}}]`,
    )
  ) {
    s.stanja.forEach((t, i) => {
      need(
        isText(t?.oznaka) && String(t.oznaka).length <= 3,
        `stanja[${i}].oznaka mora biti kratak tekst (npr. "1" ili "A")`,
      );
      oznake.push(t?.oznaka);
      for (const q of [osi.x, osi.y]) {
        if (need(isNum(t?.[q]), `stanja[${i}] treba broj ${q}`) && raspon(s[q]))
          need(
            t[q] >= s[q][0] && t[q] <= s[q][1],
            `stanja[${i}].${q} = ${formatNumber(t[q])} je izvan osi [${formatNumber(s[q][0])}, ${formatNumber(s[q][1])}]`,
          );
      }
      const treca = trecaVelicina(s);
      if (t?.[treca] != null)
        need(
          isNum(t[treca]) &&
            (treca === "T" ? uK(s, t[treca]) > 0 : t[treca] > 0),
          `stanja[${i}].${treca} mora biti pozitivan broj`,
        );
      need(
        Object.keys(t ?? {}).every((f) =>
          ["oznaka", "p", "V", "T"].includes(f),
        ),
        `stanja[${i}] smije imati samo oznaka, p, V i T`,
      );
    });
    need(
      new Set(oznake).size === oznake.length,
      "oznake stanja moraju biti različite",
    );
  } else ok = false;
  if (!ok) return false;

  // treće veličine moraju se slagati s pV = nRT
  const { k, poznato } = konstanta(s);
  const puna = punaStanja(s);
  s.stanja.forEach((t, i) => {
    need(
      puna[i].p > 0 && puna[i].V > 0 && puna[i].T > 0,
      `stanja[${i}]: tlak, volumen i temperatura moraju biti pozitivni (u K)`,
    );
    const treca = trecaVelicina(s);
    if (isNum(t[treca])) {
      const zadano = treca === "T" ? uK(s, t[treca]) : t[treca];
      need(
        blizu(zadano, puna[i][treca], 1e-2),
        `stanja[${i}].${treca} se ne slaže s pV = nRT (iz ostalih podataka izlazi ${formatNumber(treca === "T" ? izK(s, puna[i].T) : puna[i][treca])})`,
      );
    }
  });

  // prikazi
  if (s.prikazi != null) {
    if (
      need(
        Array.isArray(s.prikazi) && s.prikazi.every((q) => PRIKAZI.includes(q)),
        `prikazi je popis od: ${PRIKAZI.join(", ")}`,
      )
    ) {
      need(
        !s.prikazi.includes("T") || osi.x === "T" || poznato,
        "prikazi T na p–V dijagramu traži n ili T u nekom stanju",
      );
      need(
        osi.x === "V" ||
          poznato ||
          !s.prikazi.some((q) => ENERGIJE.includes(q)),
        "energije (pV, U, W, Q) na V–T i p–T dijagramu traže n",
      );
      need(
        osi.x === "V" || poznato || !s.prikazi.includes(trecaVelicina(s)),
        `${trecaVelicina(s)} na ovom dijagramu nije na osi, pa prikaz traži n`,
      );
    }
  }

  // procesi
  if (s.procesi != null) {
    if (
      need(
        Array.isArray(s.procesi) && s.procesi.length <= 8,
        "procesi mora biti popis (najviše 8) [{od, do, vrsta}]",
      )
    ) {
      s.procesi.forEach((pr, i) => {
        const a = puna.find((t) => t.oznaka === pr?.od);
        const b = puna.find((t) => t.oznaka === pr?.do);
        need(
          VRSTE.includes(pr?.vrsta),
          `procesi[${i}].vrsta mora biti jedna od: ${VRSTE.join(", ")}`,
        );
        if (
          need(a && b, `procesi[${i}]: od i do moraju biti oznake stanja`) &&
          VRSTE.includes(pr.vrsta)
        ) {
          need(
            pr.od !== pr.do,
            `procesi[${i}]: početno i završno stanje moraju biti različiti`,
          );
          need(
            naIstomProcesu(a, b, pr.vrsta),
            `procesi[${i}] (${pr.od} → ${pr.do}) nije ${pr.vrsta}: stanja ne leže na takvom procesu`,
          );
          need(
            pr.vrsta !== "adijabatno" || osi.x === "V" || poznato,
            `procesi[${i}]: adijabata na V–T / p–T dijagramu traži n`,
          );
        }
      });
    }
  }
  return { k, poznato, puna };
}

const lanac = (procesi) =>
  procesi.every((pr, i) => i === 0 || pr.od === procesi[i - 1].do);

export const plinski_dijagram = {
  tip: "plinski_dijagram",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Dijagram stanja idealnog (jednoatomnog) plina: osi? ("pV" zadano: V vodoravno, p okomito | "VT": T vodoravno, V okomito | "pT": T vodoravno, p okomito),
rasponi osi kao [od, do] za veličine na osima (npr. V: [0, 8], p: [0, 350]), korak: {V, p} (ili {T, …}) razmak mreže (2–40 crta po osi),
jedinice?: {p: "kPa" (Pa | kPa | bar | MPa), V: "L" (L | dm³ | mL | cm³ | m³), T: "K" (K | °C)} – svi brojevi u specu su u tim jedinicama (1 kPa · 1 L = 1 J),
stanja: [{oznaka, i dvije veličine s osi, npr. V, p}] (1–8; treća veličina smije se dodati i mora se slagati s pV = nRT),
n? (mol; bez njega T na p–V dijagramu nije poznata, osim ako neko stanje ima T), procesi?: [{od, do, vrsta: "izobarno" | "izohorno" | "izotermno" | "adijabatno" | "ravno"}]
(stanja moraju ležati na takvom procesu), izoterme? (blijede izoterme kroz stanja, p–V), povrsina? (rad kao osjenčana površina ispod puta, p–V),
prikazi?: ["p", "V", "T", "pV", "U", "W", "Q"] očitanja uživo (U = 3/2 pV), tekst, nacin:
- "istrazi" (nije zadatak): učenik vuče stanje po putu iz procesi (lanac 1 → 2 → 3…) i gleda očitanja; slobodno: true → učenik sam bira vrstu procesa
  (gumbi) i vuče stanje od stanja[0]; vrste? = ponuđene vrste;
- "postavi": pocetak (oznaka stanja), proces (vrsta), cilj: {p | V | T: vrijednost}; učenik povuče točku na stanje nakon procesa. Točku računa aplikacija;
  prihvaća se pola koraka mreže (tolerancija?: {V, p} prepisuje). vodilica: true → točka klizi po krivulji procesa (lakše). Poruke za kraj drugog procesa,
  obrnuti omjer i °C umjesto K dodaju se same; krivo?: [{V, p (osi), poruka}];
- "put": učenik slaže put od stanja[0]: za svaku dionicu odabere vrstu procesa i povuče kraj. Točan put = stanja redom povezana s procesi
  (procesi[i] ide od stanja[i] do stanja[i+1]); zatvoren: true → zadnji proces vraća u stanja[0] (obrnut smjer ciklusa dobiva posebnu poruku); vrste?;
- "dionice": za svaki proces iz procesi učenik označi znak (+, 0, −) veličina iz velicina ("W" | "dU" | "Q" ili popis); znakove računa aplikacija
  (W = ∫p dV, ΔU = 3/2 Δ(pV), Q = W + ΔU). Nakon točnog vide se iznosi i ukupni rad ciklusa.`,
  primjer: {
    tip: "plinski_dijagram",
    nacin: "postavi",
    tekst:
      "Zrak se izotermno stisne dok tlak ne naraste na 125 kPa. Povuci stanje na kraj procesa.",
    V: [0, 0.8],
    p: [0, 150],
    korak: { V: 0.05, p: 25 },
    jedinice: { p: "kPa", V: "L" },
    stanja: [{ oznaka: "1", V: 0.5, p: 100 }],
    pocetak: "1",
    proces: "izotermno",
    cilj: { p: 125 },
  },
  primjeri: [
    {
      tip: "plinski_dijagram",
      nacin: "istrazi",
      tekst:
        "Povuci stanje plina po putu 1 → 2 → 3 → 4. Gledaj umnožak $pV$ i unutarnju energiju: na izotermi se $U$ ne mijenja.",
      V: [0, 14],
      p: [0, 350],
      korak: { V: 1, p: 50 },
      stanja: [
        { oznaka: "1", V: 2, p: 100 },
        { oznaka: "2", V: 6, p: 100 },
        { oznaka: "3", V: 6, p: 300 },
        { oznaka: "4", V: 12, p: 150 },
      ],
      procesi: [
        { od: "1", do: "2", vrsta: "izobarno" },
        { od: "2", do: "3", vrsta: "izohorno" },
        { od: "3", do: "4", vrsta: "izotermno" },
      ],
      izoterme: true,
      povrsina: true,
      prikazi: ["pV", "U", "W"],
    },
    {
      tip: "plinski_dijagram",
      nacin: "istrazi",
      slobodno: true,
      tekst:
        "Odaberi proces i vuci stanje. Rad plina je površina ispod krivulje: zelena kad se plin širi, crvena kad se steže.",
      V: [0, 10],
      p: [0, 400],
      korak: { V: 1, p: 50 },
      n: 0.2,
      stanja: [{ oznaka: "1", V: 4, p: 200 }],
      vrste: ["izobarno", "izohorno", "izotermno", "adijabatno"],
      izoterme: true,
      povrsina: true,
      prikazi: ["T", "U", "W", "Q"],
    },
    {
      tip: "plinski_dijagram",
      nacin: "postavi",
      osi: "pT",
      tekst:
        "Čvrsta boca s plinom pri tlaku 200 kPa zagrije se s 27 °C na 177 °C. Povuci stanje na kraj zagrijavanja.",
      T: [-300, 300],
      p: [0, 400],
      korak: { T: 50, p: 25 },
      jedinice: { p: "kPa", T: "°C" },
      stanja: [{ oznaka: "1", T: 27, p: 200 }],
      pocetak: "1",
      proces: "izohorno",
      cilj: { T: 177 },
      vodilica: true,
    },
    {
      tip: "plinski_dijagram",
      nacin: "postavi",
      osi: "VT",
      tekst:
        "Plin se pri stalnom tlaku zagrijava s 300 K dok mu volumen ne poraste s 10 L na 15 L. Povuci stanje na kraj procesa i očitaj temperaturu.",
      T: [0, 500],
      V: [0, 20],
      korak: { T: 50, V: 2.5 },
      stanja: [{ oznaka: "1", T: 300, V: 10 }],
      pocetak: "1",
      proces: "izobarno",
      cilj: { V: 15 },
    },
    {
      tip: "plinski_dijagram",
      nacin: "put",
      zatvoren: true,
      tekst:
        "Nacrtaj kružni proces: iz stanja 1 (2 L, 300 kPa) plin se izobarno raširi na 6 L, zatim se izohorno ohladi na 100 kPa, izobarno stisne na 2 L i izohorno vrati u stanje 1.",
      V: [0, 8],
      p: [0, 400],
      korak: { V: 1, p: 50 },
      stanja: [
        { oznaka: "1", V: 2, p: 300 },
        { oznaka: "2", V: 6, p: 300 },
        { oznaka: "3", V: 6, p: 100 },
        { oznaka: "4", V: 2, p: 100 },
      ],
      procesi: [
        { od: "1", do: "2", vrsta: "izobarno" },
        { od: "2", do: "3", vrsta: "izohorno" },
        { od: "3", do: "4", vrsta: "izobarno" },
        { od: "4", do: "1", vrsta: "izohorno" },
      ],
    },
    {
      tip: "plinski_dijagram",
      nacin: "dionice",
      velicina: ["W", "dU", "Q"],
      tekst:
        "Za svaku dionicu ciklusa označi je li rad plina $W$, promjena unutarnje energije $\\Delta U$ i dovedena toplina $Q$ pozitivna, nula ili negativna.",
      V: [0, 8],
      p: [0, 400],
      korak: { V: 1, p: 100 },
      stanja: [
        { oznaka: "1", V: 2, p: 300 },
        { oznaka: "2", V: 6, p: 300 },
        { oznaka: "3", V: 6, p: 100 },
        { oznaka: "4", V: 2, p: 100 },
      ],
      procesi: [
        { od: "1", do: "2", vrsta: "izobarno" },
        { od: "2", do: "3", vrsta: "izohorno" },
        { od: "3", do: "4", vrsta: "izobarno" },
        { od: "4", do: "1", vrsta: "izohorno" },
      ],
      povrsina: true,
    },
  ],

  validate(s) {
    const { list, need } = problems();
    const z = validateZajednicko(s, need);
    if (s.nacin === "istrazi") noAnswerFields(s, need);
    if (!z) return list;
    const osi = osiOd(s);
    const procesi = s.procesi ?? [];
    const vrste = s.vrste;
    if (vrste != null)
      need(
        Array.isArray(vrste) &&
          vrste.length >= 1 &&
          vrste.every((v) => VRSTE.includes(v)) &&
          new Set(vrste).size === vrste.length,
        `vrste mora biti popis različitih od: ${VRSTE.join(", ")}`,
      );
    need(
      !(vrste ?? []).includes("adijabatno") || osi.x === "V" || z.poznato,
      "adijabata na V–T / p–T dijagramu traži n",
    );
    const zabranjena = (polja) =>
      polja.forEach((f) =>
        need(!(f in s), `polje „${f}“ ne postoji u načinu ${s.nacin}`),
      );

    if (s.nacin === "istrazi") {
      zabranjena([
        "pocetak",
        "proces",
        "velicina",
        "zatvoren",
        "vodilica",
        "tolerancija",
      ]);
      if (s.slobodno)
        need(
          !procesi.length,
          "istrazi sa slobodno: true ne treba procese (učenik ih bira sam)",
        );
      else {
        need(
          procesi.length >= 1,
          "istrazi treba procese (put po kojem se vuče stanje) ili slobodno: true",
        );
        need(
          lanac(procesi),
          "procesi u istrazi moraju biti lanac: svaki počinje gdje je prethodni završio",
        );
        need(s.vrste == null, "vrste postoje samo uz slobodno: true");
      }
    }

    if (s.nacin === "postavi") {
      zabranjena(["velicina", "zatvoren", "slobodno", "vrste"]);
      const a = z.puna.find((t) => t.oznaka === s.pocetak);
      need(a, "postavi treba pocetak: oznaka jednog od stanja");
      const vrstaOk = need(
        ["izobarno", "izohorno", "izotermno", "adijabatno"].includes(s.proces),
        "postavi treba proces: izobarno, izohorno, izotermno ili adijabatno",
      );
      const kljucevi = Object.keys(s.cilj ?? {});
      const ciljOk = need(
        s.cilj &&
          typeof s.cilj === "object" &&
          kljucevi.length === 1 &&
          ["p", "V", "T"].includes(kljucevi[0]) &&
          isNum(s.cilj[kljucevi[0]]),
        "postavi treba cilj: točno jedna od {p}, {V} ili {T} s brojem (krajnja vrijednost)",
      );
      if (a && vrstaOk && ciljOk) {
        const q = kljucevi[0];
        need(
          STALNO[s.proces] !== q,
          `cilj ${q} ne može se zadati za ${s.proces} proces (${q} je tada stalan)`,
        );
        need(
          q !== "T" || osi.x === "T" || z.poznato,
          "cilj T na p–V dijagramu traži n ili T početnog stanja",
        );
        need(
          q === "T" ? uK(s, s.cilj.T) > 0 : s.cilj[q] > 0,
          "cilj mora biti pozitivan (T iznad apsolutne nule)",
        );
        const b = STALNO[s.proces] !== q ? stanjeNakon(s) : null;
        if (need(b, "stanje nakon procesa ne postoji (provjeri cilj)")) {
          const kb = koordinate(s, b);
          const ka = koordinate(s, a);
          for (const [os, v] of [
            [osi.x, kb.x],
            [osi.y, kb.y],
          ])
            need(
              v >= s[os][0] - 1e-9 && v <= s[os][1] + 1e-9,
              `stanje nakon procesa (${os} = ${formatNumber(v)}) je izvan osi ${os}; proširi raspon`,
            );
          need(
            Math.abs(kb.x - ka.x) >= s.korak[osi.x] - 1e-9 ||
              Math.abs(kb.y - ka.y) >= s.korak[osi.y] - 1e-9,
            "krajnje stanje mora biti barem jedan korak mreže od početnog (inače je odgovor već na početku)",
          );
          if (
            s.krivo != null &&
            need(Array.isArray(s.krivo), "krivo mora biti popis")
          ) {
            s.krivo.forEach((kr, i) => {
              need(
                isNum(kr?.[osi.x]) && isNum(kr?.[osi.y]),
                `krivo[${i}] treba ${osi.x} i ${osi.y} (točku na dijagramu)`,
              );
              need(isText(kr?.poruka), `krivo[${i}].poruka mora biti tekst`);
              if (isNum(kr?.[osi.x]) && isNum(kr?.[osi.y]))
                need(
                  !istaTocka(s, b, { x: kr[osi.x], y: kr[osi.y] }),
                  `krivo[${i}] je točan odgovor`,
                );
            });
          }
        }
      }
    }

    if (s.nacin === "put") {
      zabranjena([
        "pocetak",
        "proces",
        "cilj",
        "velicina",
        "slobodno",
        "vodilica",
        "krivo",
      ]);
      const st = s.stanja;
      const trebaProcesa = st.length - 1 + (s.zatvoren ? 1 : 0);
      if (
        need(
          st.length >= 2 &&
            procesi.length === trebaProcesa &&
            procesi.length <= 6,
          `put treba 2+ stanja i ${trebaProcesa} procesa (procesi[i] od stanja[i] do stanja[i+1]${s.zatvoren ? ", zadnji natrag u stanja[0]" : ""}), najviše 6 dionica`,
        )
      ) {
        procesi.forEach((pr, i) =>
          need(
            pr.od === st[i].oznaka && pr.do === st[(i + 1) % st.length].oznaka,
            `procesi[${i}] mora ići od ${st[i].oznaka} do ${st[(i + 1) % st.length].oznaka} (redom kako su stanja zadana)`,
          ),
        );
        const ponudjene = vrste ?? zadaneVrste(s);
        need(
          procesi.every((pr) => ponudjene.includes(pr.vrsta)),
          "vrste moraju sadržavati sve vrste procesa iz puta",
        );
        procesi.forEach((pr, i) => {
          if (pr.vrsta !== "ravno") return;
          const k = koordinate(s, z.puna[(i + 1) % st.length]);
          const naMrezi = (v, q) =>
            Math.abs(
              (v - s[q][0]) / s.korak[q] -
                Math.round((v - s[q][0]) / s.korak[q]),
            ) < 1e-6;
          need(
            naMrezi(k.x, osi.x) && naMrezi(k.y, osi.y),
            `procesi[${i}] je ravna crta, pa njegov kraj mora biti na čvoru mreže`,
          );
        });
      }
    }

    if (s.nacin === "dionice") {
      zabranjena([
        "pocetak",
        "proces",
        "cilj",
        "slobodno",
        "vodilica",
        "krivo",
        "vrste",
      ]);
      const vel = velicineOd(s);
      need(
        vel.length >= 1 &&
          vel.every((v) => VELICINE.includes(v)) &&
          new Set(vel).size === vel.length,
        'velicina mora biti "W", "dU", "Q" ili popis od njih',
      );
      need(
        procesi.length >= 1 && procesi.length <= 6,
        "dionice treba 1–6 procesa",
      );
      need(
        lanac(procesi),
        "procesi moraju biti lanac (svaki počinje gdje je prethodni završio)",
      );
      need(
        osi.x === "V" ||
          z.poznato ||
          !vel.includes("W") ||
          procesi.every((pr) => pr.vrsta !== "ravno"),
        "ravna crta na V–T / p–T dijagramu traži n",
      );
    }
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "put") return checkPut(s, odgovor);
    if (s.nacin === "dionice") return checkDionice(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  tocanOdgovor(s) {
    if (s.nacin === "postavi") {
      const b = stanjeNakon(s);
      const q = ciljVelicina(s);
      const osi = osiOd(s);
      const dodatno =
        q === "T" && osi.x === "V"
          ? `, T = ${vrijednostTxt(s, "T", izK(s, b.T))}`
          : "";
      return `${tockaTxt(s, b)}${dodatno}`;
    }
    if (s.nacin === "put") {
      const puna = punaStanja(s);
      return putSpeca(s)
        .map(
          (pr) =>
            `${pr.od} → ${pr.do}: ${KRATKO_VRSTE[pr.vrsta]} do (${tockaTxt(
              s,
              puna.find((t) => t.oznaka === pr.do),
            )})`,
        )
        .join("; ");
    }
    if (s.nacin === "dionice") {
      const vel = velicineOd(s);
      return znakoviDionica(s)
        .map(
          (d, i) =>
            `${s.procesi[i].od} → ${s.procesi[i].do}: ${vel.map((v) => `${VELICINA_TXT[v]} ${ZNAK_TXT[d[v]]}`).join(", ")}`,
        )
        .join("; ");
    }
    return "";
  },
};

export const zadaneVrste = (s) => {
  const iz = (s.procesi ?? []).map((pr) => pr.vrsta);
  return [
    "izobarno",
    "izohorno",
    "izotermno",
    ...(iz.includes("adijabatno") ? ["adijabatno"] : []),
    ...(iz.includes("ravno") ? ["ravno"] : []),
  ];
};

// ── provjere ───────────────────────────────────────────────────────────────────────────────────────────
function checkPostavi(s, odgovor) {
  const t = tockaOdgovora(s, odgovor);
  if (!t)
    return {
      tocno: false,
      poruka: "Povuci točku na stanje nakon procesa.",
      prazno: true,
    };
  const b = stanjeNakon(s);
  if (istaTocka(s, b, t)) return { tocno: true };
  const a = stanjeOd(s, s.pocetak);
  if (istaTocka(s, a, t))
    return {
      tocno: false,
      poruka:
        "Točka je još u početnom stanju. Povuci je tamo gdje plin završi nakon procesa.",
      prazno: true,
    };
  const osi = osiOd(s);
  const vlastite = (s.krivo ?? []).map((k) => ({
    st: izTocke(s, k[osi.x], k[osi.y]),
    poruka: k.poruka,
  }));
  const pogodak = [...vlastite, ...kriveTocke(s)].find((k) =>
    istaTocka(s, k.st, t),
  );
  if (pogodak) return { tocno: false, poruka: pogodak.poruka };
  const q = ciljVelicina(s);
  const tol = tolerancije(s);
  const stu = izTocke(s, t.x, t.y);
  // zadana krajnja vrijednost nije pogođena
  if (q === osi.x || q === osi.y) {
    const os = q === osi.x ? "x" : "y";
    const zadano = s.cilj[q];
    if (Math.abs(t[os] - zadano) > tol[os])
      return {
        tocno: false,
        poruka: `Na kraju procesa mora biti ${q} = ${vrijednostTxt(s, q, zadano)}, a tvoja točka je na ${q} = ${vrijednostTxt(s, q, t[os])}.`,
      };
  } else if (
    q === "T" &&
    konstanta(s).poznato &&
    Math.abs(stu.T - uK(s, s.cilj.T)) > 0.03 * uK(s, s.cilj.T)
  ) {
    return {
      tocno: false,
      poruka: `Na kraju procesa temperatura mora biti ${vrijednostTxt(s, "T", s.cilj.T)}, a u tvojoj točki je ${vrijednostTxt(s, "T", izK(s, stu.T))}. Pomakni točku po krivulji procesa.`,
    };
  }
  const zakon = {
    izobarno:
      "Pri stalnom tlaku vrijedi $V/T$ = konst.: volumen raste u istom omjeru kao temperatura (u K).",
    izohorno:
      "Pri stalnom volumenu vrijedi $p/T$ = konst.: tlak raste u istom omjeru kao temperatura (u K).",
    izotermno:
      "Pri stalnoj temperaturi vrijedi $pV$ = konst.: koliko puta tlak naraste, toliko se puta volumen smanji.",
    adijabatno:
      "Adijabatski vrijedi $pV^{5/3}$ = konst.: krivulja je strmija od izoterme.",
  }[s.proces];
  return {
    tocno: false,
    poruka: s.savjet || `Zadana vrijednost je dobra, ali proces nije. ${zakon}`,
  };
}

// odgovor: {tocke: [{x-veličina, y-veličina} …] (prva je početno stanje), vrste: [vrsta …] (po dionici)}
function checkPut(s, odgovor) {
  const tocke = (odgovor?.tocke ?? []).map((o) => tockaOdgovora(s, o));
  const vrste = odgovor?.vrste ?? [];
  if (
    tocke.length < 2 ||
    tocke.some((t) => !t) ||
    vrste.length !== tocke.length - 1
  )
    return {
      tocno: false,
      poruka: "Dodaj barem jednu dionicu: odaberi proces i povuci kraj.",
      prazno: true,
    };
  const puna = punaStanja(s);
  const put = putSpeca(s);
  const sredi = (koraci) => {
    for (let i = 0; i < Math.min(koraci.length, vrste.length); i++) {
      const pr = koraci[i];
      const kraj = puna.find((t) => t.oznaka === pr.do);
      if (vrste[i] !== pr.vrsta) return { i, vrsta: true, pr };
      if (!istaTocka(s, kraj, tocke[i + 1]))
        return { i, kraj: true, pr, cilj: kraj };
    }
    return null;
  };
  const greska = sredi(put);
  if (!greska && vrste.length === put.length) return { tocno: true };
  // obrnut smjer ciklusa: isti vrhovi i procesi, ali unatrag
  if (s.zatvoren && greska) {
    const unatrag = [...put]
      .reverse()
      .map((pr) => ({ od: pr.do, do: pr.od, vrsta: pr.vrsta }));
    if (!sredi(unatrag) && vrste.length >= unatrag.length)
      return {
        tocno: false,
        poruka:
          "Obišao si ciklus u suprotnom smjeru (suprotno od kazaljke na satu). Takav ciklus je hladnjak: ukupni rad plina bio bi negativan. Kreni od 1 redom kako piše u zadatku.",
      };
  }
  if (greska) {
    const br = greska.i + 1;
    const oznaka = `Dionica ${br} (${greska.pr.od} → ${greska.pr.do})`;
    if (greska.vrsta)
      return {
        tocno: false,
        poruka: `${oznaka} nije ${ZENSKI[vrste[greska.i]] ?? "dobro odabrana"}: ${greska.pr.vrsta === "ravno" ? "to je ravna crta između dva stanja" : `pročitaj opet što se u njoj ne mijenja. To je ${ZENSKI[greska.pr.vrsta]} dionica ${OPIS_VRSTE[greska.pr.vrsta].replace(/^\S+ /, "")}`}.`,
      };
    const osi = osiOd(s);
    const kc = koordinate(s, greska.cilj);
    const t = tocke[greska.i + 1];
    const tol = tolerancije(s);
    const krivaOs = Math.abs(t.x - kc.x) > tol.x ? ["x", osi.x] : ["y", osi.y];
    const vise = t[krivaOs[0]] > kc[krivaOs[0]];
    const zenski = krivaOs[1] === "T";
    return {
      tocno: false,
      poruka: `${oznaka} je dobra vrsta procesa, ali završava na krivom mjestu: ${IME[krivaOs[1]]} na kraju je ${vrijednostTxt(s, krivaOs[1], t[krivaOs[0]])}, a prema zadatku treba biti ${vise ? (zenski ? "manja" : "manji") : zenski ? "veća" : "veći"}.`,
    };
  }
  if (vrste.length < put.length)
    return {
      tocno: false,
      poruka: `Put još nije gotov: nacrtano je ${vrste.length} od ${put.length} dionica.${s.zatvoren ? " Ciklus se mora vratiti u stanje 1." : ""}`,
    };
  return {
    tocno: false,
    poruka: `Put ima previše dionica: treba ih ${put.length}. Obriši višak gumbom „Poništi“.`,
  };
}

const OBJASNI = {
  W: (d) =>
    d.vrsta === "izohorno"
      ? "volumen se ne mijenja, pa plin ne obavlja rad ($W$ = 0)"
      : d.W === "+"
        ? "plin se širi (volumen raste), pa obavlja pozitivan rad"
        : d.W === "-"
          ? "plin se steže (volumen pada): rad plina je negativan, okolina radi na plinu"
          : "volumen je na kraju isti",
  dU: (d) =>
    d.vrsta === "izotermno"
      ? "temperatura je stalna, a $U$ ovisi samo o temperaturi, pa je $\\Delta U$ = 0"
      : `$U = \\frac{3}{2}pV$, a umnožak $pV$ ${d.dU === "+" ? "raste (temperatura raste)" : d.dU === "-" ? "pada (temperatura pada)" : "ostaje isti"}`,
  Q: (d) =>
    d.vrsta === "adijabatno"
      ? "adijabatski proces po definiciji nema izmjene topline ($Q$ = 0)"
      : d.vrsta === "izotermno"
        ? "$\\Delta U$ = 0, pa je $Q = W$"
        : d.vrsta === "izohorno"
          ? "nema rada, pa je $Q = \\Delta U$"
          : `$Q = W + \\Delta U$, a ${d.W === d.dU ? `i $W$ i $\\Delta U$ su ${d.W === "+" ? "pozitivni" : "negativni"}` : "pogledaj koji je veći po iznosu"}`,
};

// odgovor: [{W: "+", dU: "0", Q: "-"} …] po procesu
function checkDionice(s, odgovor) {
  const vel = velicineOd(s);
  const zn = znakoviDionica(s);
  if (
    !Array.isArray(odgovor) ||
    odgovor.length !== zn.length ||
    odgovor.some((o) => vel.some((v) => !ZNAKOVI.includes(o?.[v])))
  )
    return {
      tocno: false,
      poruka: "Označi znak za svaku dionicu.",
      prazno: true,
    };
  for (let i = 0; i < zn.length; i++) {
    for (const v of vel) {
      if (odgovor[i][v] !== zn[i][v])
        return {
          tocno: false,
          poruka:
            s.savjet ||
            `${s.procesi[i].od} → ${s.procesi[i].do}, ${VELICINA_TXT[v]}: ${OBJASNI[v](zn[i])}.`,
        };
    }
  }
  return { tocno: true };
}

// ── crtanje: krivulja procesa kroz stanje a preko cijelog dijagrama i točke na koje se ručka hvata ─────────
const mnozine = (r, k) => {
  const out = [];
  for (
    let i = Math.ceil(r[0] / k - 1e-9);
    i * k <= r[1] + 1e-9 && out.length < 400;
    i++
  )
    out.push(Number((i * k).toPrecision(12)));
  return out;
};
// vrijednosti na osi q u unutarnjim jedinicama (T u K)
const unutra = (s, q, v) => (q === "T" ? uK(s, v) : v);
function presjeci(s, a, vrsta, vrijednostiX, vrijednostiY) {
  const osi = osiOd(s);
  const { k } = konstanta(s);
  const out = [];
  const dodaj = (st) => {
    if (!st) return;
    const t = koordinate(s, st);
    if (
      t.x >= s[osi.x][0] - 1e-9 &&
      t.x <= s[osi.x][1] + 1e-9 &&
      t.y >= s[osi.y][0] - 1e-9 &&
      t.y <= s[osi.y][1] + 1e-9
    )
      out.push({ ...t, st });
  };
  if (STALNO[vrsta] !== osi.x)
    for (const v of vrijednostiX)
      dodaj(naProcesu(a, vrsta, osi.x, unutra(s, osi.x, v), k));
  if (STALNO[vrsta] !== osi.y)
    for (const v of vrijednostiY)
      dodaj(naProcesu(a, vrsta, osi.y, unutra(s, osi.y, v), k));
  // poredano duž krivulje (sve su krivulje monotone); bez ponavljanja
  const po = STALNO[vrsta] === osi.x ? "y" : "x";
  out.sort((m, n) => m[po] - n[po]);
  return out.filter(
    (t, i) =>
      i === 0 ||
      Math.abs(t.x - out[i - 1].x) > 1e-9 * Math.max(1, Math.abs(t.x)) ||
      Math.abs(t.y - out[i - 1].y) > 1e-9 * Math.max(1, Math.abs(t.y)),
  );
}
// gusta krivulja za crtanje (vodilica) i točke za hvatanje: presjeci krivulje s crtama pola koraka mreže
export function vodilica(s, a, vrsta) {
  const osi = osiOd(s);
  const gusto = (q) =>
    Array.from(
      { length: 161 },
      (_, i) => s[q][0] + ((s[q][1] - s[q][0]) * i) / 160,
    );
  const linija = presjeci(s, a, vrsta, gusto(osi.x), gusto(osi.y));
  const kandidati = presjeci(
    s,
    a,
    vrsta,
    mnozine(s[osi.x], s.korak[osi.x] / 2),
    mnozine(s[osi.y], s.korak[osi.y] / 2),
  );
  const ka = koordinate(s, a);
  kandidati.push({ ...ka, st: a });
  const po = STALNO[vrsta] === osi.x ? "y" : "x";
  kandidati.sort((m, n) => m[po] - n[po]);
  return { linija, kandidati };
}
export const crteMreze = (s, q) => mnozine(s[q], s.korak[q]);
