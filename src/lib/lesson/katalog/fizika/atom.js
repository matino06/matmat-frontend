// atom: Bohrov model atoma vodika (fizika, matura, Q05: 1246–1250) u dvije scene:
//   „razine“ – energijski „bunar“: rub 0 eV, razine E_n = −13,6 eV·Z²/n² u pravom mjerilu, elektron koji skače s
//              razine na razinu; skok dolje ispusti foton u boji njegove valne duljine (UV i IC sivo s natpisom),
//              skok gore traži foton, povlačenje iznad 0 eV je ionizacija; „top fotona“ šalje foton zadane energije
//              koji se upije (točno pogađa razliku razina ili ionizira) ili prođe; traka spektra puni se linijama;
//   „staze“  – Bohrove staze oko jezgre (u mjerilu r ∝ n² ili shematski), isti skokovi i isti fotoni.
// Načini: istrazi i prikaz (POGLEDAJ); izracunaj, prijelaz i apsorpcija (ODGOVOR).
// Sva fizika, geometrija crteža (koordinate u viewBoxu), putanje fotona, slijed animacije, tekstovi očitanja i ono što
// je skriveno računaju se ovdje kao čiste funkcije (spec, stanje) → obični JSON. Komponenta (i buduća iOS verzija)
// samo crta i prosljeđuje unos.
import {
  isNum,
  formatNumber,
  formatSci,
  parseNumber,
  near,
} from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  KRIVO_OPIS,
} from "../zajednicko.js";
import { lambdaRGB, bojaIme } from "./_interferencija.js";

const TIP = "atom";
export const SCENE = ["razine", "staze"];
export const NACINI = [
  "istrazi",
  "prikaz",
  "izracunaj",
  "prijelaz",
  "apsorpcija",
];
const GLEDANJE = ["istrazi", "prikaz"];
export const jeGledanje = (s) => GLEDANJE.includes(s.nacin);
export const VELICINE = ["E_n", "E_ion", "E_f", "lambda", "f"];
export const JEDINICE = {
  E_n: ["eV", "J"],
  E_ion: ["eV", "J"],
  E_f: ["eV", "J"],
  lambda: ["nm", "m"],
  f: ["Hz"],
};
export const PRIKAZI = ["spektar", "top"];
export const BOJE = [
  "ljubičasta",
  "plava",
  "zelena",
  "žuta",
  "narančasta",
  "crvena",
];

// ── konstante (knjižica str. 4–5, kao u rješenjima Q05) ──────────────────────────────────────────────
export const H = 6.626e-34; // J s
export const C = 3e8; // m/s
export const EV = 1.6e-19; // J
export const RY = 13.6; // eV
export const TOL_EV = 0.02; // eV: foton „točno“ pogađa razliku razina (rješenja pišu 12,09 i 12,75)
export const TOL = 0.01; // relativna tolerancija brojčanih odgovora (rješenja zaokružuju na 3 znamenke)
const N_FIZ = 40; // razine do koje se traži pogodak fotona (i one koje nisu nacrtane postoje)

const r1 = (n) => Math.round(n * 10) / 10;
const zOd = (s) => (isNum(s?.Z) ? s.Z : 1);
export const nMax = (s) => (Number.isInteger(s?.n_max) ? s.n_max : 6);
export const scenaOd = (s) => (s?.scena === "staze" ? "staze" : "razine");
export const broj = (x, z = 3) => formatNumber(Number(x.toPrecision(z)));
export const eV = (x) => `${broj(x)}\u00a0eV`;
// zadana energija (iz speca) točno kako je napisana, npr. 12,09 eV
export const eVz = (x) => `${formatNumber(x)}\u00a0eV`;

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
export const En = (n, Z = 1) => (-RY * Z * Z) / (n * n);
export const ionizacija = (n, Z = 1) => -En(n, Z);

export function podrucje(nm) {
  if (nm < 380) return "UV";
  if (nm > 750) return "IC";
  return "vidljivo";
}
const NEVIDLJIVO_RGB = [150, 150, 165];
// boja fotona na crtežu: vidljivi u svojoj boji, UV i IC sivi (ne vide se)
export const rgbIzLambda = (nm) =>
  podrucje(nm) === "vidljivo" ? lambdaRGB(nm) : NEVIDLJIVO_RGB;
// foton zadane energije (eV) → sve što treba za crtež i očitanje
export function foton(E) {
  const E_J = E * EV;
  const lambda_nm = ((H * C) / E_J) * 1e9;
  const pod = podrucje(lambda_nm);
  return {
    E,
    E_J,
    lambda_nm,
    f: E_J / H,
    podrucje: pod,
    boja: pod === "vidljivo" ? bojaIme(lambda_nm) : null,
    rgb: rgbIzLambda(lambda_nm),
  };
}
const SERIJE = { 1: "Lymanova", 2: "Balmerova", 3: "Paschenova" };
// skok elektrona od → do (do smije biti "ionizacija"; od smije biti "slobodan" = 0 eV)
export function skok(s, od, doN) {
  const Z = zOd(s);
  const Eod = od === "slobodan" ? 0 : En(od, Z);
  const Edo = doN === "ionizacija" ? 0 : En(doN, Z);
  const E = Math.abs(Edo - Eod);
  return {
    od,
    do: doN,
    Eod,
    Edo,
    emisija: Edo < Eod,
    ...foton(E),
    serija: Edo < Eod && isNum(doN) ? (SERIJE[doN] ?? null) : null,
  };
}
// što se dogodi kad foton energije E padne na atom s elektronom na razini n
export function upija(s, n, E) {
  const Z = zOd(s);
  if (n === "slobodan") return { vrsta: "prolaz" };
  for (let m = n + 1; m <= N_FIZ; m++) {
    const d = En(m, Z) - En(n, Z);
    if (Math.abs(E - d) <= TOL_EV) return { vrsta: "skok", do: m, razlika: d };
  }
  const ion = ionizacija(n, Z);
  if (E >= ion - TOL_EV)
    return { vrsta: "ionizacija", E_k: Math.max(0, E - ion), ion };
  // najbliže razine ispod i iznad energije u koju bi foton „htio“ podići elektron
  const cilj = En(n, Z) + E;
  let ispod = n;
  while (ispod + 1 <= N_FIZ && En(ispod + 1, Z) <= cilj) ispod++;
  return { vrsta: "prolaz", cilj, ispod, iznad: ispod + 1 };
}

export function opisFotona(f) {
  const lam =
    f.lambda_nm >= 1e4
      ? `${broj(f.lambda_nm / 1000)} µm`
      : `${broj(f.lambda_nm)} nm`;
  const gdje =
    f.podrucje === "vidljivo"
      ? `${f.boja} svjetlost`
      : f.podrucje === "UV"
        ? "ultraljubičasto (ne vidi se)"
        : "infracrveno (ne vidi se)";
  return `${eV(f.E)} · λ = ${lam} · ${gdje}`;
}
export function opisSkoka(s, od, doN) {
  const k = skok(s, od, doN);
  const odT = od === "slobodan" ? "slobodnog" : `n = ${od}`;
  if (doN === "ionizacija")
    return `Ionizacija s n = ${od}: treba dovesti ${eV(k.E)}, elektron postane slobodan (0 eV).`;
  if (k.emisija)
    return `Skok ${odT === "slobodnog" ? "slobodnog elektrona" : odT} → n = ${doN}: atom ispusti foton ${opisFotona(k)}.`;
  return `Skok ${odT} → n = ${doN}: atom mora upiti foton ${opisFotona(k)}.`;
}

// ── geometrija scene „razine“ (viewBox 360 × visina) ───────────────────────────────────────────────────
export const G = {
  sir: 360,
  y0: 40, // rub bunara (0 eV)
  dubina: 290, // |E₁| u px
  zid: [122, 262], // lijevi i desni zid bunara
  xe: 192, // elektron
  cip: { x: 6, w: 92, h: 19, razmak: 21 }, // oznake razina (ljestve)
  slobodanY: 20, // slobodan elektron iznad ruba
  spektar: { x: 22, w: 316, h: 14 },
};
export function geometrija(s) {
  const Z = zOd(s);
  const N = nMax(s);
  const E1 = Math.abs(En(1, Z));
  const yE = (E) => G.y0 + (Math.abs(E) / E1) * G.dubina;
  const raz = [];
  for (let n = 1; n <= N; n++)
    raz.push({ n, E: En(n, Z), y: r1(yE(En(n, Z))) });
  // ljestve oznaka: razine 3…6 su u pravom mjerilu preblizu (manje od 10 px), pa oznake idu od vrha prema dolje s
  // najmanjim razmakom; crtica spaja oznaku s njezinom razinom
  const yOz = {};
  let gore = G.y0 + 12;
  for (let n = N; n >= 1; n--) {
    const y = Math.max(raz[n - 1].y, gore);
    yOz[n] = r1(y);
    gore = y + G.cip.razmak;
  }
  raz.forEach((r) => (r.yOz = yOz[r.n]));
  const dno = G.y0 + G.dubina + 10;
  const spektar = { ...G.spektar, y: dno + 16 };
  return {
    sir: G.sir,
    visina: dno + 6,
    visinaSaSpektrom: spektar.y + spektar.h + 26,
    y0: G.y0,
    dno,
    zid: G.zid,
    xe: G.xe,
    cip: G.cip,
    slobodanY: G.slobodanY,
    razine: raz,
    spektar,
  };
}
export const yRazine = (s, n) =>
  n === "slobodan" || n === "ionizacija"
    ? G.slobodanY
    : (geometrija(s).razine[n - 1]?.y ?? G.y0);
// točka pokazivača (y u viewBoxu) → razina, ili "ionizacija" iznad ruba. po: "razine" (povlačenje elektrona u bunaru:
// najbliža stvarna razina) ili "ljestve" (oznake lijevo, razmaknute: tu se biraju i razine 4–6 koje su na crtežu
// preblizu za prst)
export function razinaIzY(s, y, { slobodno = true, po = "razine" } = {}) {
  const g = geometrija(s);
  if (slobodno && y < g.y0 - 6) return "ionizacija";
  const k = po === "ljestve" ? "yOz" : "y";
  let best = g.razine[0];
  for (const r of g.razine)
    if (Math.abs(r[k] - y) < Math.abs(best[k] - y)) best = r;
  return best.n;
}

// traka spektra: UV i IC sažeti logaritamski, vidljivo razvučeno (da se Balmerove linije razlikuju)
export function spektarX(s, nm) {
  const sp = geometrija(s).spektar;
  const lg = Math.log10;
  let u;
  if (nm < 380) u = 0.16 * Math.max(0, (lg(nm) - lg(80)) / (lg(380) - lg(80)));
  else if (nm <= 750) u = 0.16 + (0.64 * (nm - 380)) / 370;
  else u = 0.8 + 0.2 * Math.min(1, (lg(nm) - lg(750)) / (lg(20000) - lg(750)));
  return r1(sp.x + u * sp.w);
}
export function spektarTraka(s) {
  const sp = geometrija(s).spektar;
  const boje = [];
  for (let nm = 380; nm <= 750; nm += 10)
    boje.push({
      pomak: r1((spektarX(s, nm) - sp.x) / sp.w),
      rgb: lambdaRGB(nm),
    });
  return {
    ...sp,
    boje,
    xVid: [spektarX(s, 380), spektarX(s, 750)],
    oznake: [
      { x: r1(sp.x + 0.08 * sp.w), tekst: "UV" },
      { x: r1(sp.x + 0.48 * sp.w), tekst: "vidljivo" },
      { x: r1(sp.x + 0.9 * sp.w), tekst: "IC" },
    ],
  };
}

// ── foton kao valovit „paket“ ───────────────────────────────────────────────────────────────────────
// valna duljina na crtežu raste s pravom λ (UV gušće, IC rjeđe), da se razlika vidi
export const valPx = (nm) =>
  r1(Math.min(30, Math.max(6, 6 + 6.5 * Math.log2(nm / 100))));
// točke valovite crte od (x0, y0) do (x1, y1); omotnica stanji krajeve paketa
export function valFotona(x0, y0, x1, y1, nm, faza = 0) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 1) return [[r1(x0), r1(y0)]];
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const lp = valPx(nm);
  const A = 4.5;
  const out = [];
  const n = Math.max(2, Math.ceil(L / 1.5));
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * L;
    const env = Math.min(1, d / 8, (L - d) / 8);
    const a = A * env * Math.sin(((d - faza) / lp) * 2 * Math.PI);
    out.push([r1(x0 + ux * d - uy * a), r1(y0 + uy * d + ux * a)]);
  }
  return out;
}
const PAKET = 58;
// kadar fotona na putu (t ∈ [0, 1]): točke paketa, vrh i kut strelice
export function kadarFotona(put, t, nm) {
  const L = Math.hypot(put.x1 - put.x0, put.y1 - put.y0);
  const ux = (put.x1 - put.x0) / L;
  const uy = (put.y1 - put.y0) / L;
  const d = t * (L + PAKET);
  const dv = Math.min(L, d);
  const dr = Math.max(0, d - PAKET);
  const vrh = [put.x0 + ux * dv, put.y0 + uy * dv];
  const rep = [put.x0 + ux * dr, put.y0 + uy * dr];
  return {
    tocke: valFotona(rep[0], rep[1], vrh[0], vrh[1], nm, -d),
    vrh: [r1(vrh[0]), r1(vrh[1])],
    kut: r1((Math.atan2(uy, ux) * 180) / Math.PI),
    vidljiv: dv - dr > 2,
  };
}
// putanje fotona u sceni „razine“: odlazi desno od elektrona, dolazi s desnog ruba, ili prolazi kroz atom
export function putFotona(s, vrsta, n) {
  const y = yRazine(s, n);
  const xe = G.xe;
  if (vrsta === "odlazi")
    return { x0: xe + 12, y0: y, x1: G.sir + 4, y1: y - 26 };
  if (vrsta === "dolazi")
    return { x0: G.sir + 4, y0: y - 26, x1: xe + 10, y1: y };
  return { x0: G.sir + 4, y0: y - 26, x1: -60, y1: y + 26 }; // prolazi
}
// slijed animacije jednog događaja (iOS radi isti slijed): koraci {tip, trajanje (s), …}
export function dogadjaj(s, od, doN) {
  const k = skok(s, od, doN);
  if (doN === "ionizacija")
    return [
      {
        tip: "foton",
        smjer: "dolazi",
        put: putFotona(s, "dolazi", od),
        n: od,
        nm: k.lambda_nm,
        trajanje: 0.9,
      },
      { tip: "elektron", od, do: "slobodan", trajanje: 0.5 },
    ];
  if (k.emisija)
    return [
      { tip: "elektron", od, do: doN, trajanje: 0.45 },
      {
        tip: "foton",
        smjer: "odlazi",
        put: putFotona(s, "odlazi", doN),
        n: doN,
        nm: k.lambda_nm,
        trajanje: 1.1,
      },
    ];
  return [
    {
      tip: "foton",
      smjer: "dolazi",
      put: putFotona(s, "dolazi", od),
      n: od,
      nm: k.lambda_nm,
      trajanje: 0.9,
    },
    { tip: "elektron", od, do: doN, trajanje: 0.45 },
  ];
}
// foton iz topa (istrazi i apsorpcija): upije se, ionizira ili prođe
export function dogadjajTopa(s, n, E) {
  const f = foton(E);
  const u = upija(s, n, E);
  if (u.vrsta === "prolaz")
    return {
      ishod: u,
      koraci: [
        {
          tip: "foton",
          smjer: "prolazi",
          put: putFotona(s, "prolazi", n),
          n,
          nm: f.lambda_nm,
          trajanje: 1.6,
        },
      ],
    };
  const doN = u.vrsta === "skok" ? Math.min(u.do, nMax(s)) : "slobodan";
  return {
    ishod: u,
    koraci: [
      {
        tip: "foton",
        smjer: "dolazi",
        put: putFotona(s, "dolazi", n),
        n,
        nm: f.lambda_nm,
        trajanje: 0.9,
      },
      { tip: "elektron", od: n, do: doN, trajanje: 0.5 },
    ],
  };
}
// apsorpcija nakon otkrivanja: fotoni dolete jedan po jedan; nakon upijanja atom se vrati u početno stanje
export function nizApsorpcije(s) {
  const n = pocetnaOd(s);
  return (s.fotoni ?? []).map((E, i) => {
    const d = dogadjajTopa(s, n, E);
    const koraci = [...d.koraci];
    if (d.ishod.vrsta === "prolaz")
      koraci.push({ tip: "pauza", trajanje: 0.3 });
    else
      koraci.push(
        { tip: "pauza", trajanje: 1 },
        { tip: "reset", n, trajanje: 0.25 },
      );
    return {
      i,
      E,
      upije: d.ishod.vrsta !== "prolaz",
      koraci,
      tekst: opisTopa(s, n, E),
    };
  });
}
export function opisRazine(s, n) {
  const E = En(n, zOd(s));
  return `Elektron na n = ${n}: E = ${eV(E)}, to jest ${eV(-E)} ispod ruba bunara (0 eV).`;
}
export function opisTopa(s, n, E) {
  const u = upija(s, n, E);
  const Z = zOd(s);
  if (n === "slobodan") return "Elektron je slobodan: nema ga što podići.";
  if (u.vrsta === "skok")
    return u.do > nMax(s)
      ? `Upijen! ${eV(E)} je točno razlika do razine n = ${u.do} (nije nacrtana).`
      : `Upijen! ${eV(E)} je točno razlika ${eV(Math.abs(En(n, Z)))} − ${eV(Math.abs(En(u.do, Z)))}: elektron skoči na n = ${u.do}.`;
  if (u.vrsta === "ionizacija")
    return u.E_k < 0.005
      ? `Upijen! ${eV(E)} je baš energija ionizacije: elektron upravo postane slobodan.`
      : `Upijen! Foton je jači od energije ionizacije (${eV(u.ion)}): elektron izleti, a višak ${eV(u.E_k)} odnese kao kinetičku energiju.`;
  return `Prošao. Elektron bi završio na ${eV(u.cilj)}, a ondje nema razine (između n = ${u.ispod} i n = ${u.iznad}). Atom ne uzima „dio“ fotona.`;
}

// ── geometrija scene „staze“ (viewBox 360 × 300) ────────────────────────────────────────────────────
export const GS = { sir: 360, visina: 300, cx: 180, cy: 150, rMax: 128 };
export function staze(s, mjerilo = "shematski") {
  const N = nMax(s);
  const out = [];
  for (let n = 1; n <= N; n++)
    out.push({
      n,
      r: r1(
        mjerilo === "pravo"
          ? (GS.rMax * n * n) / (N * N)
          : 22 + ((GS.rMax - 22) * (n - 1)) / Math.max(1, N - 1),
      ),
    });
  return { ...GS, staze: out, jezgraR: mjerilo === "pravo" ? 2.5 : 6 };
}
export const rStaze = (s, mjerilo, n) => {
  const g = staze(s, mjerilo);
  return n === "slobodan" ? g.rMax + 24 : g.staze[n - 1].r;
};
// put fotona u sceni „staze“: radijalno od elektrona prema van (odlazi), izvana do elektrona (dolazi) ili kroz atom
export function putFotonaStaze(s, mjerilo, n, kut, smjer) {
  const g = staze(s, mjerilo);
  const r = rStaze(s, mjerilo, n);
  const c = Math.cos(kut);
  const si = -Math.sin(kut);
  const blizu = [g.cx + c * (r + 8), g.cy + si * (r + 8)];
  const daleko = [g.cx + c * 260, g.cy + si * 260];
  if (smjer === "prolazi")
    return {
      x0: daleko[0],
      y0: daleko[1],
      x1: g.cx - c * 260,
      y1: g.cy - si * 260,
    };
  return smjer === "odlazi"
    ? { x0: blizu[0], y0: blizu[1], x1: daleko[0], y1: daleko[1] }
    : { x0: daleko[0], y0: daleko[1], x1: blizu[0], y1: blizu[1] };
}
// isti slijed događaja kao u „razine“, s putanjama fotona za staze (kut = trenutni položaj elektrona na stazi)
export const uStaze = (s, mjerilo, koraci, kut) =>
  koraci.map((k) =>
    k.tip === "foton"
      ? { ...k, put: putFotonaStaze(s, mjerilo, k.n, kut, k.smjer) }
      : k,
  );

// ── što je skriveno (ne otkrivati odgovor) ──────────────────────────────────────────────────────────
// otkriveno = pokazi || točan odgovor. Do tada: u izracunaj nema energija razina (osim energije: true uz E_f), fotona
// ni linija spektra; u prijelaz se vide energije, ali ne foton ni njegova boja; u apsorpcija fotoni ne lete.
export function skriveno(s, otkriveno = false) {
  if (jeGledanje(s) || otkriveno)
    return { energije: false, foton: false, spektar: false, ishod: false };
  if (s.nacin === "izracunaj")
    return {
      energije: s.energije !== true,
      foton: true,
      spektar: true,
      ishod: true,
    };
  return { energije: false, foton: true, spektar: true, ishod: true };
}
export function oznakaRazine(s, r, sakrij) {
  return sakrij ? `n = ${r.n}` : `n = ${r.n}  ${broj(r.E)} eV`;
}

// ── izracunaj ───────────────────────────────────────────────────────────────────────────────────────
export const jedinicaStavke = (it) => it.jedinica ?? JEDINICE[it.velicina]?.[0];
// točna vrijednost stavke u njezinoj jedinici
export function tocnoStavke(s, it) {
  const Z = zOd(s);
  const j = jedinicaStavke(it);
  if (it.velicina === "E_n") return j === "J" ? En(it.n, Z) * EV : En(it.n, Z);
  if (it.velicina === "E_ion")
    return j === "J" ? ionizacija(it.n, Z) * EV : ionizacija(it.n, Z);
  const k = skok(s, it.od, it.do);
  if (it.velicina === "E_f") return j === "J" ? k.E_J : k.E;
  if (it.velicina === "lambda")
    return j === "m" ? k.lambda_nm * 1e-9 : k.lambda_nm;
  return k.f;
}
export function oznakaStavke(it) {
  if (isText(it.oznaka)) return it.oznaka;
  if (it.velicina === "E_n") return `$E_{${it.n}}$`;
  if (it.velicina === "E_ion") return `$E_{ion}$`;
  if (it.velicina === "E_f") return `$E_f$`;
  if (it.velicina === "lambda") return `$\\lambda$`;
  return `$f$`;
}
export function opisStavke(it) {
  if (it.velicina === "E_n") return `energija elektrona na ${it.n}. stazi`;
  if (it.velicina === "E_ion") return `energija ionizacije s ${it.n}. staze`;
  const sk = `pri skoku ${it.od} → ${it.do}`;
  if (it.velicina === "E_f") return `energija fotona ${sk}`;
  if (it.velicina === "lambda") return `valna duljina fotona ${sk}`;
  return `frekvencija fotona ${sk}`;
}
const PRETVORBA_J =
  "To je u džulima, a traži se u eV. Ne pretvaraj: −13,6 eV/n² daje odmah eV.";
const PRETVORBA_EV =
  "To je u eV, a traži se u džulima: pomnoži s 1,6·10⁻¹⁹ J/eV.";
const PRETVORBA_DIJELI =
  "Iz eV u džule se **množi** s 1,6·10⁻¹⁹ (1 eV = 1,6·10⁻¹⁹ J), ne dijeli.";
// tipične krive vrijednosti stavke (u jedinici stavke), izračunate iz speca
export function greskeStavke(s, it) {
  const Z = zOd(s);
  const j = jedinicaStavke(it);
  const out = [];
  const dodaj = (v, poruka) => isNum(v) && out.push({ vrijednost: v, poruka });
  // energije: krive vrijednosti u eV, pa (ako se traži J) iste ×e
  const energija = (lista, tocnoEv) => {
    const f = j === "J" ? EV : 1;
    lista.forEach(([v, p]) => dodaj(v * f, p));
    if (j === "J") {
      dodaj(tocnoEv, PRETVORBA_EV);
      dodaj(tocnoEv / EV, PRETVORBA_DIJELI);
    } else dodaj(tocnoEv * EV, PRETVORBA_J);
  };
  const z2 = Z > 1 ? " (i pomnoži sa Z²)" : "";
  if (it.velicina === "E_n") {
    const n = it.n;
    const t = En(n, Z);
    const l = [
      [
        -t,
        "Vezani elektron ima **negativnu** energiju: on je dolje u „bunaru“, ispod ruba na 0 eV. Fali minus.",
      ],
      [
        (-RY * Z * Z) / n,
        `Dijeli se s **n²**, ne s n: $E_n = -\\dfrac{13{,}6 \\text{ eV}}{n^2}$${z2}.`,
      ],
      [
        (RY * Z * Z) / n,
        "Dva propusta: dijeli se s **n²** (ne s n), a energija vezanog elektrona je negativna.",
      ],
      [
        -RY * Z * Z * n * n,
        "n² ide u **nazivnik**: što je staza viša, to je energija bliža nuli, a ne sve negativnija.",
      ],
    ];
    if (Z > 1)
      l.push([
        En(n, 1),
        `To je energija za vodik. Jezgra s Z = ${Z} protona veže jače: $E_n = -13{,}6 \\text{ eV}\\cdot Z^2/n^2$.`,
      ]);
    energija(l, t);
  } else if (it.velicina === "E_ion") {
    const n = it.n;
    const t = ionizacija(n, Z);
    const l = [
      [
        -t,
        "Energija ionizacije je ono što treba **dovesti**, pa je pozitivna: elektron s negativne energije mora doći do 0 eV, a 0 − (negativno) je pozitivno.",
      ],
      [(RY * Z * Z) / n, "Dijeli se s **n²**, ne s n."],
      [
        -(RY * Z * Z) / n,
        "Dva propusta: dijeli se s **n²**, a energiju treba **dovesti**, pa je pozitivna.",
      ],
    ];
    if (n > 1) {
      l.push([
        RY * Z * Z,
        "To je ionizacija iz **osnovnog** stanja (n = 1). Ovaj elektron je na višoj stazi, bliže rubu bunara, pa treba manje.",
      ]);
      l.push([
        RY * Z * Z - t,
        "To je skok s 1. staze na ovu stazu. Za ionizaciju elektron s **ove** staze mora doći do ruba, do 0 eV.",
      ]);
    }
    energija(l, t);
  } else if (
    it.velicina === "E_f" ||
    it.velicina === "lambda" ||
    it.velicina === "f"
  ) {
    const k = skok(s, it.od, it.do);
    const zbroj = Math.abs(k.Eod) + Math.abs(k.Edo);
    const bezKv = RY * Z * Z * Math.abs(1 / it.do - 1 / it.od);
    const jedna = [Math.abs(k.Eod), Math.abs(k.Edo)];
    const P_ZBROJ =
      "Zbrojio si energije dviju razina. Foton odnosi **razliku**: viša razina minus niža, $E_f = E_m - E_n$ (pazi na minuse).";
    const P_KV =
      "U formuli su **kvadrati**: $E_f = 13{,}6 \\text{ eV}\\left(\\dfrac{1}{n^2} - \\dfrac{1}{m^2}\\right)$.";
    const P_JEDNA =
      "To je energija samo jedne razine. Foton nosi **razliku** energija dviju razina.";
    if (it.velicina === "E_f") {
      const l = [
        [
          -k.E,
          "Energija fotona je pozitivna: foton odnosi energiju koju je atom izgubio. Oduzmi **višu minus nižu** razinu.",
        ],
        [zbroj, P_ZBROJ],
        [bezKv, P_KV],
        ...jedna.map((v) => [v, P_JEDNA]),
      ];
      energija(l, k.E);
    } else {
      const izE = (E) =>
        it.velicina === "lambda"
          ? ((H * C) / (E * EV)) * (j === "m" ? 1 : 1e9)
          : (E * EV) / H;
      dodaj(izE(zbroj), P_ZBROJ);
      dodaj(izE(bezKv), P_KV);
      jedna.forEach((v) => dodaj(izE(v), P_JEDNA));
      const P_J =
        "Energiju fotona prvo pretvori u **džule** (×1,6·10⁻¹⁹), pa tek onda u formulu s h.";
      if (it.velicina === "lambda") {
        dodaj(((H * C) / k.E) * (j === "m" ? 1 : 1e9), P_J);
        if (j === "m")
          dodaj(
            k.lambda_nm,
            "To je u nanometrima, a traži se u metrima: 1 nm = 10⁻⁹ m.",
          );
        else
          dodaj(
            k.lambda_nm * 1e-9,
            "To je u metrima, a traži se u nanometrima: pomnoži s 10⁹ (1 nm = 10⁻⁹ m).",
          );
        dodaj(
          ((H * k.E_J) / C) * (j === "m" ? 1 : 1e9),
          "Formula je $\\lambda = \\dfrac{hc}{E}$: h i c su u brojniku, E u nazivniku.",
        );
      } else {
        dodaj(k.E / H, P_J);
        dodaj(
          k.E_J * H,
          "Formula je $f = \\dfrac{E}{h}$: energiju **dijeli** s Planckovom konstantom.",
        );
      }
    }
  }
  const t = tocnoStavke(s, it);
  return out.filter(
    (q, i) =>
      !near(q.vrijednost, t, Math.abs(t) * TOL * 1.5) &&
      out.findIndex((r) =>
        near(r.vrijednost, q.vrijednost, Math.abs(q.vrijednost) * 1e-6),
      ) === i,
  );
}
const tolStavke = (it, t) =>
  isNum(it.tolerancija) ? it.tolerancija : Math.abs(t) * TOL;
export function provjeriStavku(s, i, unos) {
  const it = s.pitaj[i];
  const jed = jedinicaStavke(it);
  const n = parseNumber(String(unos ?? ""), jed);
  if (n == null) return { tocno: false, prazno: true };
  const t = tocnoStavke(s, it);
  if (near(n, t, tolStavke(it, t))) return { tocno: true };
  // „2.856“ se čita kao tisućice (2856), ali učenik je mislio decimalnu točku (kao checkNumber u zajednicko.js)
  const tekst = String(unos ?? "").replace(jed, "");
  if (!Number.isInteger(t) && /^\s*[-−]?[1-9]\d{0,2}\.\d{3}\s*$/.test(tekst)) {
    const d = parseNumber(tekst.replace(".", ","));
    if (near(d, t, tolStavke(it, t))) return { tocno: true };
  }
  const hit = (it.krivo ?? []).find((q) =>
    near(
      n,
      q.vrijednost,
      isNum(q.tolerancija) ? q.tolerancija : Math.abs(q.vrijednost) * TOL,
    ),
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const gr = greskeStavke(s, it).find((q) =>
    near(n, q.vrijednost, Math.abs(q.vrijednost) * TOL),
  );
  if (gr) return { tocno: false, poruka: gr.poruka };
  const savjet = {
    E_n: "Energija staze: $E_n = -\\dfrac{13{,}6 \\text{ eV}}{n^2}$.",
    E_ion: "Elektron treba podići do ruba bunara (0 eV): $E_{ion} = 0 - E_n$.",
    E_f: "Foton odnosi razliku energija: $E_f = E_m - E_n$ (viša minus niža).",
    lambda:
      "Iz energije fotona: $\\lambda = \\dfrac{hc}{E_f}$, s $E_f$ u džulima.",
    f: "Iz energije fotona: $f = \\dfrac{E_f}{h}$, s $E_f$ u džulima.",
  }[it.velicina];
  return { tocno: false, poruka: it.savjet || `Nije točno. ${savjet}` };
}
function checkIzracunaj(s, odgovor) {
  const unosi = Array.isArray(odgovor) ? odgovor : [odgovor];
  const vise = s.pitaj.length > 1;
  if (s.pitaj.every((_, i) => !String(unosi[i] ?? "").trim()))
    return {
      tocno: false,
      poruka: "Upiši broj (decimalni zarez je u redu, npr. 1,5).",
      prazno: true,
    };
  for (let i = 0; i < s.pitaj.length; i++) {
    const r = provjeriStavku(s, i, unosi[i] ?? "");
    if (r.tocno) continue;
    const pref = vise ? `U ${i + 1}. polju: ` : "";
    if (r.prazno)
      return {
        tocno: false,
        poruka: `${pref}upiši broj (decimalni zarez je u redu).`,
        prazno: true,
      };
    return { tocno: false, poruka: `${pref}${r.poruka}` };
  }
  return { tocno: true };
}
export const formatOdgovora = (v) => formatSci(v, 3);
// elektron i skok koji crtež pokazuje u izracunaj (zadani podaci, ne odgovor)
export function crtezIzracunaj(s) {
  const it = (s.pitaj ?? []).find((q) => isNum(q?.od) && isNum(q?.do));
  const n = (s.pitaj ?? []).find((q) => isNum(q?.n))?.n;
  return {
    elektron: Number.isInteger(s.pocetna) ? s.pocetna : (n ?? it?.od ?? 1),
    skok: it ? { od: it.od, do: it.do } : null,
    ionizacija: (s.pitaj ?? []).some((q) => q?.velicina === "E_ion"),
  };
}

// ── prijelaz ────────────────────────────────────────────────────────────────────────────────────────
const tolCilja = (E) => Math.max(TOL_EV, E * TOL);
function pogadjaCilj(s, k) {
  const c = s.cilj ?? {};
  if (isNum(c.E_f)) return Math.abs(k.E - c.E_f) <= tolCilja(c.E_f);
  if (isNum(c.lambda))
    return Math.abs(k.lambda_nm - c.lambda) <= c.lambda * TOL;
  if (isText(c.boja)) return k.boja === c.boja;
  return false;
}
// svi skokovi traženog smjera unutar nacrtanih razina koji daju traženi foton
export function skokoviCilja(s) {
  const N = nMax(s);
  const out = [];
  for (let a = 1; a <= N; a++)
    for (let b = 1; b <= N; b++) {
      if (a === b) continue;
      if (Number.isInteger(s.od) && a !== s.od) continue;
      const k = skok(s, a, b);
      if (k.emisija !== (s.vrsta !== "apsorpcija")) continue;
      if (pogadjaCilj(s, k)) out.push({ od: a, do: b });
    }
  return out;
}
export const tocanPrijelaz = (s) => skokoviCilja(s)[0] ?? null;
export function opisCilja(s) {
  const c = s.cilj ?? {};
  if (isNum(c.E_f)) return `foton od ${eV(c.E_f)}`;
  if (isNum(c.lambda)) return `foton valne duljine ${broj(c.lambda)} nm`;
  return `${c.boja} foton`;
}
function opisDobivenog(s, k) {
  const c = s.cilj ?? {};
  if (isNum(c.lambda)) return `λ = ${broj(k.lambda_nm)} nm`;
  if (isText(c.boja))
    return k.boja
      ? `${k.boja.replace(/a$/, "u")} svjetlost (${broj(k.lambda_nm)} nm)`
      : `nevidljivo ${k.podrucje === "UV" ? "ultraljubičasto" : "infracrveno"} zračenje (${broj(k.lambda_nm)} nm)`;
  return `foton od ${eV(k.E)}`;
}
function checkPrijelaz(s, odg) {
  const od = odg?.od;
  const doN = odg?.do;
  if (!Number.isInteger(od) || !Number.isInteger(doN))
    return {
      tocno: false,
      prazno: true,
      poruka: Number.isInteger(s.od)
        ? "Povuci elektron na razinu na koju skoči (ili dodirni oznaku razine)."
        : "Odaberi skok: dodirni početnu, pa završnu razinu (ili povuci od jedne do druge).",
    };
  if (od === doN)
    return {
      tocno: false,
      poruka: "Elektron mora skočiti na **drugu** razinu.",
    };
  const k = skok(s, od, doN);
  const t = tocanPrijelaz(s);
  if (t && t.od === od && t.do === doN) return { tocno: true };
  const hit = (s.krivo ?? []).find((q) => q?.od === od && q?.do === doN);
  if (hit) return { tocno: false, poruka: hit.poruka };
  const emisija = s.vrsta !== "apsorpcija";
  if (emisija && !k.emisija)
    return {
      tocno: false,
      poruka:
        "To je **upijanje**: kad elektron ide gore, atom foton upija i foton nestaje. Da atom foton **ispusti**, elektron mora pasti na nižu razinu.",
    };
  if (!emisija && k.emisija)
    return {
      tocno: false,
      poruka:
        "To je **ispuštanje**: kad elektron padne na nižu razinu, atom pošalje foton van. Da atom foton **upije**, elektron mora ići gore.",
    };
  if (s.savjet) return { tocno: false, poruka: s.savjet };
  return {
    tocno: false,
    poruka: `Skok ${od} → ${doN} daje ${opisDobivenog(s, k)}, a traži se ${opisCilja(s)}. Foton nosi razliku energija dviju razina.`,
  };
}

// ── apsorpcija ──────────────────────────────────────────────────────────────────────────────────────
export const pocetnaOd = (s) => (Number.isInteger(s.pocetna) ? s.pocetna : 1);
export function ishodiApsorpcije(s) {
  return (s.fotoni ?? []).map((E) => {
    const u = upija(s, pocetnaOd(s), E);
    return { E, upije: u.vrsta !== "prolaz", ...u };
  });
}
export const IZBORI = ["upije", "prodje"];
function checkApsorpcija(s, odg) {
  const iz = Array.isArray(odg) ? odg : [];
  const isti = ishodiApsorpcije(s);
  if (isti.some((_, i) => !IZBORI.includes(iz[i])))
    return {
      tocno: false,
      prazno: true,
      poruka: "Za **svaki** foton odaberi: upije ili prođe.",
    };
  const pogresni = isti.filter((x, i) => (iz[i] === "upije") !== x.upije);
  if (!pogresni.length) return { tocno: true };
  if (s.savjet) return { tocno: false, poruka: s.savjet };
  // poruka govori o vrsti greške, a ne o tome koji je foton krivo označen (to bi otkrilo odgovor)
  const Ep = Math.abs(En(pocetnaOd(s), zOd(s)));
  if (pogresni.some((x) => !x.upije))
    return {
      tocno: false,
      poruka: `Atom ne uzima „dio“ fotona i ne upija foton samo zato što je „dovoljno jak“. Foton se upije samo ako podigne elektron **točno** na neku razinu: $E_{poč} + E_f$ mora biti baš energija jedne razine (ili barem 0 eV, pa elektron izleti). Elektron je na ${broj(-Ep)} eV.`,
    };
  if (pogresni.some((x) => x.vrsta === "ionizacija"))
    return {
      tocno: false,
      poruka: `Foton jači od energije ionizacije (${eV(Ep)}) atom **upije**: elektron izleti iz atoma, a višak energije odnese kao kinetičku energiju.`,
    };
  return {
    tocno: false,
    poruka:
      "Foton čija je energija **točno** jednaka razlici dviju razina atom upije, a elektron skoči gore. Izračunaj koliko treba za skokove s početne razine na više razine.",
  };
}

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
const POLJA_NACINA = {
  istrazi: ["prikazi", "pocetna", "mjerilo"],
  prikaz: ["od", "do", "mjerilo", "pocetna"],
  izracunaj: ["pitaj", "pocetna", "energije"],
  prijelaz: ["vrsta", "cilj", "od", "krivo", "savjet"],
  apsorpcija: ["fotoni", "pocetna", "savjet"],
};
const SVA_POLJA = [
  "prikazi",
  "pocetna",
  "mjerilo",
  "od",
  "do",
  "pitaj",
  "energije",
  "vrsta",
  "cilj",
  "krivo",
  "savjet",
  "fotoni",
];
const jeN = (s, n) => Number.isInteger(n) && n >= 1 && n <= nMax(s);

function validateIzracunaj(s, need) {
  if (
    !need(
      Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
      "izracunaj treba pitaj: [{velicina, n? | od? i do?, jedinica?}] (1–3)",
    )
  )
    return;
  s.pitaj.forEach((it, i) => {
    const w = `pitaj[${i}]`;
    if (
      !need(
        it && VELICINE.includes(it.velicina),
        `${w}.velicina mora biti jedna od: ${VELICINE.join(", ")}`,
      )
    )
      return;
    const razina = it.velicina === "E_n" || it.velicina === "E_ion";
    if (razina) {
      need(
        jeN(s, it.n),
        `${w}.n mora biti cijeli broj od 1 do n_max (${nMax(s)})`,
      );
      need(
        it.od == null && it.do == null,
        `${w}: ${it.velicina} ima samo n (od i do su za foton skoka)`,
      );
    } else {
      need(
        jeN(s, it.od) && jeN(s, it.do) && it.od !== it.do,
        `${w}: ${it.velicina} treba od i do: dvije različite razine 1…${nMax(s)}`,
      );
      need(
        it.n == null,
        `${w}: ${it.velicina} nema n (skok se zadaje s od i do)`,
      );
    }
    if (it.jedinica != null)
      need(
        JEDINICE[it.velicina].includes(it.jedinica),
        `${w}.jedinica za ${it.velicina} mora biti ${JEDINICE[it.velicina].join(" ili ")}`,
      );
    if (it.tolerancija != null)
      need(
        isNum(it.tolerancija) && it.tolerancija > 0,
        `${w}.tolerancija mora biti pozitivan broj`,
      );
    if (it.oznaka != null)
      need(isText(it.oznaka), `${w}.oznaka mora biti tekst`);
    if (it.savjet != null)
      need(isText(it.savjet), `${w}.savjet mora biti tekst`);
    const ok = razina
      ? jeN(s, it.n)
      : jeN(s, it.od) && jeN(s, it.do) && it.od !== it.do;
    if (
      ok &&
      (it.jedinica == null || JEDINICE[it.velicina].includes(it.jedinica))
    ) {
      const t = tocnoStavke(s, it);
      validateKrivo(it.krivo, t, tolStavke(it, t), need, `${w}.krivo`);
    }
  });
  const kljuc = (it) =>
    JSON.stringify([it?.velicina, it?.n, it?.od, it?.do, it?.jedinica ?? null]);
  need(
    new Set(s.pitaj.map(kljuc)).size === s.pitaj.length,
    "pitaj: dvije stavke pitaju isto",
  );
  if (s.energije != null) {
    need(typeof s.energije === "boolean", "energije mora biti true ili false");
    need(
      !(
        s.energije === true &&
        s.pitaj.some((it) => it?.velicina === "E_n" || it?.velicina === "E_ion")
      ),
      "energije: true bi pokazalo energije razina, a one se traže (E_n ili E_ion)",
    );
  }
}
function validatePrijelaz(s, need) {
  need(
    s.vrsta === "emisija" || s.vrsta === "apsorpcija",
    "prijelaz.vrsta mora biti emisija ili apsorpcija",
  );
  if (s.od != null)
    need(
      jeN(s, s.od),
      `prijelaz.od (zadana početna razina) mora biti 1…${nMax(s)}`,
    );
  const c = s.cilj;
  if (
    !need(
      c && typeof c === "object" && !Array.isArray(c),
      "prijelaz treba cilj: {E_f} | {lambda} | {boja}",
    )
  )
    return;
  const kljucevi = Object.keys(c);
  if (
    !need(
      kljucevi.length === 1 && ["E_f", "lambda", "boja"].includes(kljucevi[0]),
      "cilj ima točno jedno polje: E_f (eV), lambda (nm) ili boja",
    )
  )
    return;
  if (c.E_f != null)
    need(
      isNum(c.E_f) && c.E_f > 0 && c.E_f < 200,
      "cilj.E_f mora biti energija fotona u eV (pozitivan broj)",
    );
  if (c.lambda != null)
    need(
      isNum(c.lambda) && c.lambda > 10 && c.lambda < 1e5,
      "cilj.lambda mora biti valna duljina u nm",
    );
  if (c.boja != null)
    need(
      BOJE.includes(c.boja),
      `cilj.boja mora biti jedna od: ${BOJE.join(", ")}`,
    );
  const sk = skokoviCilja(s);
  need(
    sk.length === 1,
    sk.length
      ? `cilj nije jednoznačan: daju ga skokovi ${sk.map((x) => `${x.od} → ${x.do}`).join(", ")}`
      : `nijedan skok (${s.vrsta}) između razina 1…${nMax(s)}${Number.isInteger(s.od) ? ` s početkom na ${s.od}` : ""} ne daje ${opisCilja(s)}`,
  );
  if (
    s.krivo != null &&
    need(Array.isArray(s.krivo), "krivo mora biti popis [{od, do, poruka}]")
  )
    s.krivo.forEach((q, i) => {
      need(
        jeN(s, q?.od) && jeN(s, q?.do) && q.od !== q.do,
        `krivo[${i}] treba od i do (dvije različite razine)`,
      );
      need(isText(q?.poruka), `krivo[${i}].poruka mora biti tekst`);
      need(
        !sk.some((x) => x.od === q?.od && x.do === q?.do),
        `krivo[${i}] je točan skok`,
      );
    });
}
function validateApsorpcija(s, need) {
  if (s.pocetna != null)
    need(
      Number.isInteger(s.pocetna) && s.pocetna >= 1 && s.pocetna < nMax(s),
      `pocetna mora biti 1…${nMax(s) - 1} (elektron mora imati kamo skočiti)`,
    );
  if (
    !need(
      Array.isArray(s.fotoni) &&
        s.fotoni.length >= 2 &&
        s.fotoni.length <= 4 &&
        s.fotoni.every((E) => isNum(E) && E > 0 && E <= 100),
      "apsorpcija treba fotoni: 2–4 energije u eV, npr. [10.2, 11]",
    )
  )
    return;
  const f = [...s.fotoni].sort((a, b) => a - b);
  need(
    f.every((E, i) => i === 0 || E - f[i - 1] > 0.05),
    "fotoni moraju imati različite energije",
  );
  const n = pocetnaOd(s);
  const Z = zOd(s);
  const ion = ionizacija(n, Z);
  s.fotoni.forEach((E, i) => {
    const u = upija(s, n, E);
    if (u.vrsta === "skok")
      need(
        u.do <= nMax(s),
        `fotoni[${i}] = ${broj(E)} eV podiže elektron na n = ${u.do}, a crtež ima razine do ${nMax(s)} (povećaj n_max ili uzmi drugi foton)`,
      );
    else {
      // dvosmisleno: blizu nekog skoka, ali izvan tolerancije, ili blizu energije ionizacije
      let najb = Math.abs(E - ion);
      for (let m = n + 1; m <= N_FIZ; m++)
        najb = Math.min(najb, Math.abs(E - (En(m, Z) - En(n, Z))));
      need(
        najb >= 0.1,
        `fotoni[${i}] = ${broj(E)} eV je preblizu energiji nekog skoka ili ionizacije (manje od 0,1 eV), pa je odgovor dvosmislen`,
      );
    }
  });
  const ish = ishodiApsorpcije(s);
  need(
    ish.some((x) => x.upije) && ish.some((x) => !x.upije),
    "apsorpcija: barem jedan foton mora se upiti i barem jedan proći",
  );
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Bohrov model atoma vodika (fizika, matura): E_n = −13,6 eV·Z²/n², foton pri skoku E_f = E_m − E_n, λ = hc/E_f (h = 6,626·10⁻³⁴ J s, c = 3·10⁸ m/s, 1 eV = 1,6·10⁻¹⁹ J). Boja fotona iz λ (UV < 380 nm, IC > 750 nm). Zajednička polja: tekst, nacin, scena? ("razine" zadano | "staze"), n_max? (2–7, zadano 6), Z? (1–3, zadano 1: vodik; 2 = He⁺, 3 = Li²⁺), pocetna? (razina elektrona).
Scene:
- "razine": energijski „bunar“: rub 0 eV, razine u pravom mjerilu (oznake n i E lijevo, s crticama), elektron na razini; skok dolje ispusti foton u boji, skok gore traži foton, iznad 0 eV je ionizacija. Traka spektra ispod.
- "staze": Bohrove staze oko jezgre, mjerilo? ("shematski" zadano | "pravo": r ∝ n²); samo istrazi i prikaz.
Načini:
- "istrazi" (pogledaj): učenik povuče elektron (ili dodirne oznaku razine) i gleda fotone; prikazi? ⊂ spektar, top (zadano oba; „top“ šalje foton zadane energije koji se upije ili prođe). Bez polja odgovora.
- "prikaz" (pogledaj): od, do (razina ili "ionizacija") — skok se sam odigra (gumb „Ponovi“) uz opis fotona.
- "izracunaj" (Tvoj red): pitaj: [{velicina: "E_n" | "E_ion" (uz n) | "E_f" | "lambda" | "f" (uz od, do), jedinica? (E: eV zadano | J; lambda: nm zadano | m; f: Hz), oznaka?, tolerancija? (zadano 1 %), ${KRIVO_OPIS}, savjet?}] (1–3); energije? (true: energije razina se vide, samo kad se ne traže E_n ni E_ion). Crtež pokazuje elektron i zadani skok (strelica), a foton, boja i linija spektra pojave se tek nakon točnog odgovora. Automatske krive vrijednosti: bez minusa, n umjesto n², −13,6·n², krivi predznak, zbroj umjesto razlike, bez kvadrata, energija samo jedne razine, ionizacija iz osnovnog stanja, eV ↔ J (×/÷ 1,6·10⁻¹⁹), nm ↔ m, hc/E bez pretvorbe u J.
- "prijelaz" (Tvoj red): vrsta: "emisija" | "apsorpcija"; cilj: {E_f (eV)} | {lambda (nm)} | {boja: ${BOJE.join(" | ")}} — mora ga davati točno jedan skok; od? (zadana početna razina: učenik bira samo završnu). Učenik dodirne/povuče skok; energije razina se vide, a foton i boja tek nakon točnog. Poruke za obrnut smjer i za krivi skok (s njegovim fotonom) dodaju se same; krivo?: [{od, do, poruka}], savjet?.
- "apsorpcija" (Tvoj red): pocetna? (zadano 1), fotoni: [E u eV] (2–4; svaki ili točno pogađa skok s pocetna (±0,02 eV) ili je od svakog skoka i ionizacije udaljen barem 0,1 eV; barem jedan se upije, barem jedan prođe; foton jači od ionizacije se upije). Učenik za svaki foton odabere „upije“ ili „prođe“; tek nakon točnog fotoni dolete i pokažu ishod. savjet?.`;

const PRIMJER = {
  tip: TIP,
  scena: "razine",
  nacin: "izracunaj",
  pocetna: 2,
  pitaj: [
    { velicina: "E_n", n: 2, jedinica: "eV" },
    { velicina: "E_ion", n: 2, jedinica: "eV" },
  ],
  tekst:
    "Elektron u atomu vodika nalazi se na 2. stazi. Kolika mu je energija i koliko energije treba dovesti da ga se potpuno otrgne od atoma?",
};

const PRIMJERI = [
  {
    tip: TIP,
    scena: "razine",
    nacin: "istrazi",
    pocetna: 3,
    tekst:
      "**Povuci elektron** na drugu razinu (ili dodirni oznaku razine). Gledaj kakav foton izleti pri skoku dolje, a kakav treba za skok gore. Pošalji i foton iz topa desno.",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "prikaz",
    od: 2,
    do: "ionizacija",
    tekst:
      "Elektron na 2. stazi je 3,4 eV „duboko“ u bunaru. Toliko mu energije treba dovesti da izađe na rub, do 0 eV.",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "izracunaj",
    pocetna: 3,
    pitaj: [{ velicina: "E_f", od: 3, do: 2, jedinica: "eV" }],
    tekst:
      "U drugom atomu vodika elektron skoči s 3. na 2. stazu. Kolika je energija emitiranog fotona?",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "izracunaj",
    pitaj: [
      { velicina: "E_f", od: 5, do: 2, jedinica: "eV" },
      { velicina: "lambda", od: 5, do: 2, jedinica: "nm" },
    ],
    energije: true,
    tekst:
      "Elektron skoči s 5. na 2. stazu. Kolika je energija fotona i njegova valna duljina? Energije razina očitaj s crteža.",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "apsorpcija",
    pocetna: 1,
    fotoni: [10.2, 11],
    tekst:
      "Na atom vodika u osnovnom stanju padnu dva fotona, jedan od 10,2 eV, a drugi od 11 eV. Za svaki odaberi hoće li ga atom upiti.",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "apsorpcija",
    pocetna: 1,
    fotoni: [12.75, 12.4, 16],
    tekst:
      "Na atom vodika u osnovnom stanju padnu tri fotona. Za svaki odaberi hoće li ga atom upiti.",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "prijelaz",
    vrsta: "emisija",
    od: 4,
    cilj: { E_f: 2.55 },
    tekst:
      "Elektron je na 4. razini. **Povuci ga** na razinu na koju mora skočiti da atom ispusti foton od 2,55 eV.",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "prijelaz",
    vrsta: "emisija",
    cilj: { boja: "crvena" },
    n_max: 5,
    tekst:
      "Atom vodika svijetli crveno. **Odaberi skok** pri kojem atom ispusti crveni foton: dodirni početnu, pa završnu razinu.",
  },
  {
    tip: TIP,
    scena: "razine",
    nacin: "prijelaz",
    vrsta: "apsorpcija",
    cilj: { E_f: 12.09 },
    tekst:
      "Atom vodika upije foton od 12,09 eV. **Odaberi skok** elektrona: dodirni početnu, pa završnu razinu.",
  },
  {
    tip: TIP,
    scena: "staze",
    nacin: "istrazi",
    pocetna: 2,
    tekst:
      "Bohrove staze: **dodirni stazu** i gledaj kako elektron skače i kakav foton pri tome nastaje. Prebaci na „u mjerilu“: staze rastu s n².",
  },
  {
    tip: TIP,
    scena: "staze",
    nacin: "prikaz",
    od: 3,
    do: 2,
    tekst:
      "Elektron skoči s 3. na 2. stazu i atom ispusti foton crvene svjetlosti.",
  },
];

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const atom = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (jeGledanje(s) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate(s) {
    const { list, need } = problems();
    if (
      !need(
        NACINI.includes(s.nacin),
        `atom.nacin mora biti jedan od: ${NACINI.join(", ")}`,
      )
    )
      return list;
    need(isText(s.tekst), "atom treba „tekst“");
    if (s.scena != null)
      need(
        SCENE.includes(s.scena),
        `atom.scena mora biti ${SCENE.join(" ili ")}`,
      );
    if (s.scena === "staze")
      need(
        jeGledanje(s),
        "scena staze je samo za istrazi i prikaz (pitanja idu na razine)",
      );
    if (s.n_max != null)
      need(
        Number.isInteger(s.n_max) && s.n_max >= 2 && s.n_max <= 7,
        "n_max mora biti cijeli broj od 2 do 7",
      );
    if (s.Z != null)
      need(
        [1, 2, 3].includes(s.Z),
        "Z mora biti 1 (vodik), 2 (He⁺) ili 3 (Li²⁺)",
      );
    if (s.pocetna != null && s.nacin !== "apsorpcija")
      need(jeN(s, s.pocetna), `pocetna mora biti razina 1…${nMax(s)}`);
    const dozv = POLJA_NACINA[s.nacin];
    for (const f of SVA_POLJA)
      need(
        !(f in s) || dozv.includes(f),
        `polje „${f}“ ne pripada načinu ${s.nacin} (polja načina: ${dozv.join(", ")})`,
      );
    if (s.mjerilo != null)
      need(
        s.scena === "staze" && ["pravo", "shematski"].includes(s.mjerilo),
        "mjerilo (pravo | shematski) postoji samo u sceni staze",
      );
    if (jeGledanje(s)) noAnswerFields(s, need);
    if (s.nacin === "istrazi" && s.prikazi != null)
      need(
        Array.isArray(s.prikazi) &&
          s.prikazi.every((p) => PRIKAZI.includes(p)) &&
          new Set(s.prikazi).size === s.prikazi.length,
        `prikazi mora biti popis od: ${PRIKAZI.join(", ")}`,
      );
    if (s.nacin === "prikaz") {
      need(jeN(s, s.od), `prikaz treba od: razina 1…${nMax(s)}`);
      need(
        (jeN(s, s.do) && s.do !== s.od) || s.do === "ionizacija",
        `prikaz treba do: druga razina 1…${nMax(s)} ili "ionizacija"`,
      );
    }
    if (s.nacin === "izracunaj") validateIzracunaj(s, need);
    if (s.nacin === "prijelaz") validatePrijelaz(s, need);
    if (s.nacin === "apsorpcija") validateApsorpcija(s, need);
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    return list;
  },
  check(s, odgovor) {
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    if (s.nacin === "prijelaz") return checkPrijelaz(s, odgovor);
    if (s.nacin === "apsorpcija") return checkApsorpcija(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "izracunaj")
      return s.pitaj
        .map(
          (it) =>
            `${opisStavke(it)}: ${formatOdgovora(tocnoStavke(s, it))} ${jedinicaStavke(it)}`,
        )
        .join("; ");
    if (s.nacin === "prijelaz") {
      const t = tocanPrijelaz(s);
      if (!t) return "";
      return `skok ${t.od} → ${t.do} (foton ${opisFotona(skok(s, t.od, t.do))})`;
    }
    if (s.nacin === "apsorpcija")
      return ishodiApsorpcije(s)
        .map((x) =>
          x.vrsta === "skok"
            ? `${eVz(x.E)}: upije (elektron na ${x.do}. razinu)`
            : x.vrsta === "ionizacija"
              ? `${eVz(x.E)}: upije (ionizacija, elektron izleti)`
              : `${eVz(x.E)}: prođe`,
        )
        .join("; ");
    return "";
  },
};
