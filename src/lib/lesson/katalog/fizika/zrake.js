// zrake: geometrijska optika u četiri scene: ravno zrcalo (zakon odbijanja), slika u ravnom zrcalu, lom na granici
// dvaju sredstava (Snell, djelomično odbijanje, granični kut i totalna refleksija) i planparalelna ploča.
// Načini: istrazi i prikaz (gledanje), postavi (okreni laser / dovuci sliku; ishod skriven do provjere), izracunaj
// (upiši kut, brzinu ili udaljenost; tipične greške računa kod) i odaberi (koja je od ponuđenih zraka prava).
// Sva fizika, geometrija crteža (u koordinatama SVG-a 360 × 280), očitanja i „što je skriveno“ su čiste funkcije
// ovdje (spec, stanje) → JSON, pa ih komponenta i buduća iOS aplikacija samo crtaju.
import { isNum, formatNumber, formatSci } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
} from "../zajednicko.js";

const TIP = "zrake";
export const C_SVJETLOSTI = 3e8;
export const SCENE = ["zrcalo", "zrcalo_slika", "lom", "ploca"];
const NACINI = {
  zrcalo: ["istrazi", "prikaz", "postavi", "izracunaj"],
  zrcalo_slika: ["istrazi", "prikaz", "postavi", "izracunaj"],
  lom: ["istrazi", "prikaz", "postavi", "izracunaj", "odaberi"],
  ploca: ["istrazi", "prikaz", "izracunaj", "odaberi"],
};
const GLEDANJE = ["istrazi", "prikaz"];
export const PREDMETI = ["osoba", "strelica", "svijeca"];
const JEDINICE_DULJINE = ["cm", "m"];

// ── fizika ──────────────────────────────────────────────────────────────────────────────────────────
const RAD = Math.PI / 180;
export const sinD = (a) => Math.sin(a * RAD);
const cosD = (a) => Math.cos(a * RAD);
const tanD = (a) => Math.tan(a * RAD);
const asinD = (x) => Math.asin(x) / RAD;
const atanD = (x) => Math.atan(x) / RAD;

// Snellov zakon n₁ sin α = n₂ sin β; null = totalna refleksija (lomljene zrake nema)
export function snell(n1, n2, alpha) {
  const s = (n1 / n2) * sinD(alpha);
  if (s > 1 + 1e-12) return null;
  return asinD(Math.min(1, s));
}
export const granicniKut = (n1, n2) => (n1 > n2 ? asinD(n2 / n1) : null);
export const brewsterKut = (n1, n2) => atanD(n2 / n1);
// udio odbijene snage za nepolariziranu svjetlost (Fresnel); 1 pri totalnoj refleksiji
export function fresnel(n1, n2, alpha) {
  const b = snell(n1, n2, alpha);
  if (b == null) return 1;
  const ci = cosD(alpha);
  const ct = cosD(b);
  const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
  const rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
  return (rs * rs + rp * rp) / 2;
}
export const brzinaU = (n) => C_SVJETLOSTI / n;
// okomiti pomak izlazne zrake planparalelne ploče
export const pomakPloce = (d, alpha, beta) =>
  (d * sinD(alpha - beta)) / cosD(beta);

const TVARI = [
  [1, "zrak"],
  [1.33, "voda"],
  [1.5, "staklo"],
  [2.42, "dijamant"],
];
// naziv sredstva uz klizač n: zadani naziv dok je n zadani, inače poznata tvar ili „sredstvo“
export function nazivSredstva(n, zadano) {
  if (zadano && Math.abs(n - zadano.n) < 1e-9) return zadano.naziv;
  const t = TVARI.find(([m]) => Math.abs(m - n) < 0.006);
  return t ? t[1] : "sredstvo";
}

// sredstva scene (lom: gore 1, dolje 2; ploča: okolina 1, ploča 2)
const ZRAK = { naziv: "zrak", n: 1 };
export const sredstvo1 = (s) => s.sredstvo1 ?? ZRAK;
export const sredstvo2 = (s) => (s.scena === "ploca" ? s.ploca : s.sredstvo2);
export const jedinicaDuljine = (s) => s.jedinica ?? "cm";
export const vrstaPredmeta = (s) => s.predmet ?? "osoba";

const ID_KLIZACA = {
  zrcalo: ["kut"],
  lom: ["kut", "n1", "n2"],
  ploca: ["kut", "n", "debljina"],
  zrcalo_slika: ["udaljenost"],
};
const OZNAKA_KLIZACA = {
  kut: "upadni kut α",
  n1: "indeks loma gore n₁",
  n2: "indeks loma dolje n₂",
  n: "indeks loma ploče n",
  debljina: "debljina ploče d",
  udaljenost: "udaljenost predmeta od zrcala a",
};
export const klizaciOd = (s) =>
  (Array.isArray(s.klizaci) ? s.klizaci : []).map((k) => ({
    ...k,
    oznaka: k.oznaka ?? OZNAKA_KLIZACA[k.id],
    jedinica:
      k.id === "kut"
        ? "°"
        : k.id === "debljina"
          ? "cm"
          : k.id === "udaljenost"
            ? jedinicaDuljine(s)
            : "",
  }));

export function pocetniKut(s) {
  if (isNum(s.kut)) return s.kut;
  if (isNum(s.kut_povrsina)) return 90 - s.kut_povrsina;
  return 30;
}

// stanje: {kut, n1, n2, debljina, udaljenost, oko: [x, y] | null, klon: udaljenost iza zrcala | null}
export function pocetnoStanje(s) {
  const st = {
    kut: pocetniKut(s),
    n1: sredstvo1(s).n,
    n2: sredstvo2(s)?.n ?? 1,
    debljina: s.ploca?.debljina ?? 1,
    udaljenost: s.udaljenost ?? 1,
    oko: null,
    klon: null,
  };
  if (s.scena === "zrcalo_slika" && s.nacin === "postavi")
    st.klon = pocetniKlon(s);
  for (const k of klizaciOd(s)) {
    const v = isNum(k.pocetak)
      ? k.pocetak
      : ({ kut: st.kut, n1: st.n1, n2: st.n2, n: st.n2 }[k.id] ?? st[k.id]);
    if (k.id === "n") st.n2 = v;
    else st[k.id] = v;
  }
  return st;
}

export function fizika(s, st = pocetnoStanje(s)) {
  const alpha = st.kut;
  const n1 = st.n1;
  const n2 = st.n2;
  const out = { alpha, phi: 90 - alpha, n1, n2 };
  if (s.scena === "zrcalo") {
    out.alpha_odbojni = alpha;
    out.izmedu = 2 * alpha;
  }
  if (s.scena === "lom" || s.scena === "ploca") {
    out.beta = snell(n1, n2, alpha);
    out.totalna = out.beta == null;
    out.R = fresnel(n1, n2, alpha);
    out.alpha_g = granicniKut(n1, n2);
    out.v1 = brzinaU(n1);
    out.v2 = brzinaU(n2);
  }
  if (s.scena === "ploca" && out.beta != null) {
    out.gamma = snell(n2, n1, out.beta);
    out.debljina = st.debljina;
    out.pomak = pomakPloce(st.debljina, alpha, out.beta);
  }
  if (s.scena === "zrcalo_slika") {
    out.a = st.udaljenost;
    out.slika_zrcalo = st.udaljenost;
    out.slika_osoba = 2 * st.udaljenost;
  }
  return out;
}

// ── zapis ───────────────────────────────────────────────────────────────────────────────────────────
const zaokr1 = (x) => Math.round(x * 10) / 10;
export const kutTekst = (x) => `${formatNumber(zaokr1(x))}°`;
const nTekst = (n) => formatNumber(n);
const brzinaTekst = (v) => `${formatSci(v)} m/s`;
const duljinaTekst = (x, j) =>
  `${formatNumber(Math.round(x * 100) / 100)} ${j}`;

// ── veličine za „izracunaj“ ────────────────────────────────────────────────────────────────────────────
const KUT_TOL = 0.2;
const blizu = (tocno) => ({
  vrijednost: tocno,
  tolerancija: 1,
  poruka:
    "Blizu si, ali ne dovoljno. Računaj na jednu decimalu i zaokruži tek na kraju.",
});
// kalkulator u radijanima: sin(α) uzme α kao radijane, a sin⁻¹ vrati radijane
function radGreske(fn, tocnoStupnjevi, opisSin) {
  const out = [];
  out.push({
    vrijednost: tocnoStupnjevi * RAD,
    tolerancija: Math.max(0.005, tocnoStupnjevi * RAD * 0.01),
    poruka:
      "To je kut u **radijanima**. Traži se u stupnjevima: prebaci kalkulator u način DEG.",
  });
  const r = fn();
  if (isNum(r))
    out.push({
      vrijednost: r,
      tolerancija: Math.max(0.005, Math.abs(r) * 0.01),
      poruka: `Kalkulator ti je u radijanima (RAD), pa je ${opisSin} krivo izračunan. Prebaci ga u stupnjeve (DEG) i ponovi.`,
    });
  return out;
}

const VELICINE = {
  zrcalo: {
    alpha: { oznaka: "$\\alpha =$", naziv: "upadni kut", jedinica: "°" },
    alpha_odbojni: {
      oznaka: "$\\alpha' =$",
      naziv: "odbojni kut",
      jedinica: "°",
    },
    izmedu: {
      oznaka: "kut između zraka",
      naziv: "kut između upadne i odbijene zrake",
      jedinica: "°",
    },
    povratak_povrsina: {
      oznaka: "kut prema površini",
      naziv: "kut prema površini za povratak u izvor",
      jedinica: "°",
    },
    povratak_normala: {
      oznaka: "upadni kut",
      naziv: "upadni kut za povratak u izvor",
      jedinica: "°",
    },
  },
  zrcalo_slika: {
    slika_osoba: { oznaka: "udaljenost slike od osobe", naziv: "slika–osoba" },
    slika_zrcalo: {
      oznaka: "udaljenost slike od zrcala",
      naziv: "slika–zrcalo",
    },
  },
  lom: {
    alpha: { oznaka: "$\\alpha =$", naziv: "upadni kut", jedinica: "°" },
    beta: { oznaka: "$\\beta =$", naziv: "kut loma", jedinica: "°" },
    v1: {
      oznaka: "$v_1 =$",
      naziv: "brzina u gornjem sredstvu",
      jedinica: "m/s",
    },
    v2: {
      oznaka: "$v_2 =$",
      naziv: "brzina u donjem sredstvu",
      jedinica: "m/s",
    },
    alpha_g: {
      oznaka: "$\\alpha_g =$",
      naziv: "granični kut",
      jedinica: "°",
    },
  },
  ploca: {
    beta: { oznaka: "$\\beta =$", naziv: "kut loma u ploči", jedinica: "°" },
    gamma: {
      oznaka: "$\\gamma =$",
      naziv: "kut pod kojim zraka izlazi",
      jedinica: "°",
    },
    pomak: { oznaka: "$x =$", naziv: "pomak zrake", jedinica: "cm" },
    v2: { oznaka: "$v =$", naziv: "brzina u ploči", jedinica: "m/s" },
  },
};
export const velicineScene = (s) => VELICINE[s.scena] ?? {};
export const jedinicaPitanja = (s, p) =>
  p.jedinica ?? velicineScene(s)[p.velicina]?.jedinica ?? jedinicaDuljine(s);

// točna vrijednost i automatske tipične krive vrijednosti za jedno pitanje
export function odgovorPitanja(s, p) {
  const f = fizika(s);
  const v = p.velicina;
  const daniPhi = !isNum(s.kut) && isNum(s.kut_povrsina);
  const krivo = [];
  const k = (vrijednost, poruka, tolerancija = 0.25) =>
    isNum(vrijednost) && krivo.push({ vrijednost, poruka, tolerancija });
  let tocno = NaN;
  let tol = KUT_TOL;
  if (s.scena === "zrcalo") {
    const a = f.alpha;
    if (v === "alpha" || v === "alpha_odbojni") {
      tocno = a;
      k(
        90 - a,
        "To je kut prema **površini** zrcala. Kutovi se mjere od **normale** (okomice na zrcalo): α = 90° − φ.",
      );
      if (v === "alpha_odbojni")
        k(
          2 * a,
          "To je kut između upadne i odbijene zrake. Odbojni kut je samo jedan od njih: α' = α.",
        );
    }
    if (v === "izmedu") {
      tocno = 2 * a;
      k(
        a,
        "To je samo jedan kut. Upadna i odbijena zraka su s **različitih** strana normale, pa se kutovi zbrajaju: α + α'.",
      );
      k(
        2 * (90 - a),
        "Zbrojio si kutove prema površini. Kut između zraka zbroj je kutova od normale: α + α' = 2α.",
      );
      k(
        90 - a,
        "To je kut prema površini zrcala. Kut između zraka zbroj je upadnog i odbojnog kuta (od normale).",
      );
    }
    if (v === "povratak_povrsina") {
      tocno = 90;
      k(
        0,
        "Pod 0° prema površini zraka bi klizila uz samo zrcalo. Natrag se vraća samo zraka koja pada **po normali**, a normala s površinom zatvara 90°.",
      );
      if (daniPhi)
        k(
          s.kut_povrsina,
          "Pod tim se kutom zraka odbije na drugu stranu normale. Natrag ide samo zraka po normali.",
        );
    }
    if (v === "povratak_normala") {
      tocno = 0;
      k(
        90,
        "90° od normale je zraka uz samu površinu. Natrag ide zraka koja pada po normali: upadni kut 0°.",
      );
    }
  }
  if (s.scena === "zrcalo_slika") {
    const a = f.a;
    tol = undefined;
    if (v === "slika_osoba") {
      tocno = 2 * a;
      k(
        a,
        "To je udaljenost slike od **zrcala**. Od osobe do slike treba prijeći i njezinih a do zrcala: a + a.",
        a * 0.005,
      );
    }
    if (v === "slika_zrcalo") {
      tocno = a;
      k(
        2 * a,
        "To je udaljenost slike od osobe. Od zrcala je slika udaljena koliko i predmet: jednako daleko iza kao on ispred.",
        a * 0.01,
      );
      k(
        a / 2,
        "Slika nije na pola puta: iza zrcala je jednako daleko koliko je predmet ispred njega.",
        a * 0.005,
      );
    }
  }
  if (s.scena === "lom" || s.scena === "ploca") {
    const { n1, n2, alpha } = f;
    const [ime1, ime2] = [sredstvo1(s).naziv, sredstvo2(s).naziv];
    if (v === "alpha") {
      tocno = alpha;
      k(
        90 - alpha,
        "To je kut prema površini. Upadni kut mjeri se od normale: α = 90° − φ.",
      );
    }
    if (v === "beta") {
      tocno = f.beta;
      k(
        (alpha * n1) / n2,
        `Podijelio si kut indeksom loma. Zakon loma govori o **sinusima**: sin β = sin α · n₁/n₂ = ${formatNumber((sinD(alpha) * n1) / n2)}, pa tek onda sin⁻¹.`,
      );
      k(
        90 - f.beta,
        "To je kut lomljene zrake prema površini. Kut loma mjeri se od **normale**.",
      );
      k(
        snell(n2, n1, alpha),
        `Zamijenio si n₁ i n₂. n₁ je sredstvo iz kojeg zraka dolazi (${ime1}), a n₂ ono u koje ulazi (${ime2}).`,
      );
      k(
        alpha,
        "To je upadni kut. Na granici dvaju sredstava zraka skreće, pa je kut loma drukčiji.",
      );
      const sinB = (n1 * sinD(alpha)) / n2;
      k(
        sinB,
        "To je **sinus** kuta loma, a ne sam kut. Primijeni još sin⁻¹.",
        0.006,
      );
      krivo.push(
        ...radGreske(
          () => {
            const x = (n1 * Math.sin(alpha)) / n2;
            return Math.abs(x) <= 1 ? Math.asin(x) : null;
          },
          f.beta,
          "sin α",
        ),
      );
    }
    if (v === "gamma") {
      tocno = f.gamma;
      k(
        f.beta,
        `To je kut u ploči. Na donjoj plohi zraka opet prelazi granicu (${ime2} → ${ime1}) pa se opet lomi, sad **od** normale: n·sin β = sin γ.`,
      );
      k(
        90 - f.gamma,
        "To je kut prema površini ploče. Izlazni kut mjeri se od normale.",
      );
      k(
        snell(n1, n2, f.beta),
        "Na izlasku iz gušćeg u rjeđe sredstvo zraka skreće **od** normale, a ne prema njoj.",
      );
    }
    if (v === "pomak") {
      tocno = f.pomak;
      tol = Math.abs(f.pomak) * 0.01;
      k(
        f.debljina * (tanD(alpha) - tanD(f.beta)),
        "To je razmak duž plohe ploče. Pomak zrake mjeri se okomito na zrake: x = d·sin(α − β)/cos β.",
        Math.abs(f.pomak) * 0.01,
      );
    }
    if (v === "v1" || v === "v2") {
      const n = v === "v1" ? n1 : n2;
      tocno = brzinaU(n);
      tol = tocno * 0.01;
      if (n !== 1) {
        k(
          C_SVJETLOSTI * n,
          "Svjetlost je u sredstvu **sporija**: v = c/n, a ne c·n.",
          C_SVJETLOSTI * n * 0.01,
        );
        k(
          C_SVJETLOSTI,
          `To je brzina u vakuumu (i zraku). U sredstvu indeksa loma ${nTekst(n)} svjetlost je ${nTekst(n)} puta sporija: v = c/n.`,
          C_SVJETLOSTI * 0.005,
        );
      }
    }
    if (v === "alpha_g") {
      tocno = f.alpha_g;
      k(
        90 - f.alpha_g,
        "To je kut prema površini (ili si upotrijebio cos⁻¹). Granični kut mjeri se od normale: sin α_g = n₂/n₁.",
      );
      k(
        atanD(n2 / n1),
        "Upotrijebio si tg⁻¹. Granični kut dobiva se iz sinusa: pri njemu je β = 90°, a sin 90° = 1, pa je sin α_g = n₂/n₁.",
      );
      k(
        atanD(n1 / n2),
        "To je kut iz tg α = n (Brewsterov kut pri ulasku u kristal). Granični kut dobiva se iz sinusa: sin α_g = 1/n.",
      );
      k(n2 / n1, "To je **sinus** graničnog kuta. Primijeni još sin⁻¹.", 0.006);
      krivo.push(...radGreske(() => null, f.alpha_g, ""));
    }
  }
  const auto = krivo.filter(
    (x) =>
      isNum(x.vrijednost) &&
      Math.abs(x.vrijednost - tocno) >
        Math.max(tol ?? Math.abs(tocno) * 0.005, x.tolerancija ?? 0, 1e-9),
  );
  const t = isNum(p.tolerancija) ? p.tolerancija : tol;
  const zadnje = velicineScene(s)[v]?.jedinica === "°" ? [blizu(tocno)] : [];
  return { tocno, tol: t, krivo: [...(p.krivo ?? []), ...auto, ...zadnje] };
}

// ── odaberi ─────────────────────────────────────────────────────────────────────────────────────────
export const PONUDE = {
  lom: ["prema_normali", "ravno", "od_normale", "odbija_se"],
  ploca: ["paralelno", "kao_u_ploci", "bez_pomaka", "previse"],
};
export function tocnaPonuda(s) {
  const f = fizika(s);
  if (s.scena === "ploca") return "paralelno";
  if (f.totalna) return "odbija_se";
  return f.n2 > f.n1 ? "prema_normali" : "od_normale";
}
export const ponudeOd = (s) =>
  Array.isArray(s.ponudi) ? s.ponudi : (PONUDE[s.scena] ?? []);

// smjer svake ponuđene zrake (kut od normale) — prava ima točan kut, ostale uvjerljiv krivi
export function kutoviPonuda(s) {
  const f = fizika(s);
  const a = f.alpha;
  if (s.scena === "ploca") {
    const g = f.gamma;
    return {
      paralelno: g,
      kao_u_ploci: f.beta,
      bez_pomaka: a,
      previse: Math.min(84, a + (90 - a) * 0.55),
    };
  }
  const tocan = f.beta;
  const zamjena = snell(f.n2, f.n1, a);
  let prema = f.n2 > f.n1 ? tocan : zamjena;
  if (!isNum(prema) || a - prema < 6) prema = a * 0.55;
  let od = f.n2 < f.n1 && !f.totalna ? tocan : zamjena;
  if (!isNum(od) || od - a < 6) od = Math.min(84, a + (90 - a) * 0.55);
  return { prema_normali: prema, ravno: a, od_normale: od, odbija_se: a };
}

const PORUKE_PONUDA = (s) => {
  const f = fizika(s);
  const [i1, i2] = [sredstvo1(s).naziv, sredstvo2(s).naziv];
  if (s.scena === "ploca")
    return {
      kao_u_ploci: `Na donjoj plohi zraka opet prelazi granicu (${i2} → ${i1}) pa se opet lomi, i to **od** normale.`,
      bez_pomaka:
        "Smjer je dobar, ali zraka se ne može vratiti na pravac upadne zrake: u ploči je išla strmije, pa izlazi **pomaknuta** u stranu.",
      previse:
        "Previše skreće. Iz n·sin β = sin γ izlazi γ = α: izlazna zraka paralelna je s upadnom.",
    };
  const gusce = f.n2 > f.n1;
  return {
    prema_normali: gusce
      ? ""
      : `Iz gušćeg (${i1}) u rjeđe sredstvo (${i2}) svjetlost ubrzava, pa skreće **od** normale.`,
    ravno:
      "Ravno, bez skretanja, prolazi samo zraka koja pada okomito (po normali). Ova pada koso, pa na granici skrene.",
    od_normale: gusce
      ? `U gušće sredstvo (${i2}) svjetlost ulazi i usporava, pa skreće **prema** normali.`
      : f.totalna
        ? `Upadni kut je veći od graničnog (${kutTekst(f.alpha_g)}), pa zraka uopće ne izlazi: sva se odbije.`
        : "",
    odbija_se: gusce
      ? "Totalne refleksije pri ulasku u **gušće** sredstvo nema: zraka uvijek uđe (malo se svjetlosti samo djelomično odbije)."
      : f.totalna
        ? ""
        : `Upadni kut je manji od graničnog (${kutTekst(f.alpha_g)}), pa zraka još izlazi van; totalna refleksija tek je iznad graničnog kuta.`,
  };
};

const OPIS_PONUDE = {
  prema_normali: "skreće prema normali",
  ravno: "ide ravno",
  od_normale: "skreće od normale",
  odbija_se: "sva se odbija (totalna refleksija)",
  paralelno: "izlazi paralelno s upadnom, pomaknuta",
  kao_u_ploci: "nastavlja kao u ploči",
  bez_pomaka: "nastavlja po pravcu upadne zrake",
  previse: "skreće još više od normale",
};

// ── postavi ─────────────────────────────────────────────────────────────────────────────────────────
const TOL_POSTAVI = 0.5;
export const METAR = 20; // jedna jedinica mete = 20 px crteža
const R_META = 0.6;
export const tolPostavi = (s) =>
  isNum(s.tolerancija) ? s.tolerancija : TOL_POSTAVI;

// kut (od normale) koji ispunjava cilj, ili null
export function rjesenjePostavi(s) {
  if (s.scena === "zrcalo_slika") return s.udaljenost;
  const c = s.cilj ?? {};
  const n1 = sredstvo1(s).n;
  const n2 = sredstvo2(s)?.n ?? 1;
  if (c.vrsta === "povratak") return 0;
  if (c.vrsta === "granicni") return granicniKut(n1, n2);
  if (c.vrsta === "kut") {
    if (c.velicina === "alpha") return c.vrijednost;
    if (c.velicina === "alpha_povrsina") return 90 - c.vrijednost;
    if (c.velicina === "izmedu") return c.vrijednost / 2;
    if (c.velicina === "beta") return snell(n2, n1, c.vrijednost);
  }
  if (c.vrsta === "meta") return kutZaMetu(s);
  return null;
}

// meta [x, y] u jedinicama od točke upada (y prema gore): kut za koji zraka prolazi kroz njezino središte
export function kutZaMetu(s) {
  const [x, y] = s.cilj?.meta ?? [];
  if (!isNum(x) || !isNum(y) || x <= 0) return null;
  if (y > 0) return atanD(x / y); // odbijena zraka
  if (s.scena !== "lom" || y === 0) return null;
  const beta = atanD(x / -y);
  return snell(sredstvo2(s).n, sredstvo1(s).n, beta);
}

// prolazi li izlazna zraka kroz metu (ista funkcija za crtež i provjeru)
export function pogodakMete(s, kut) {
  const [x, y] = s.cilj.meta;
  const f = fizika(s, { ...pocetnoStanje(s), kut });
  let d;
  if (y > 0) d = [sinD(kut), cosD(kut)];
  else if (f.beta == null) return { pogodak: false, nema: true };
  else d = [sinD(f.beta), -cosD(f.beta)];
  const t = x * d[0] + y * d[1];
  const udaljenost = Math.abs(x * d[1] - y * d[0]);
  return { pogodak: t > 0 && udaljenost <= R_META, udaljenost };
}

function ispunjavaCilj(s, kut) {
  if (s.cilj?.vrsta === "meta") return pogodakMete(s, kut).pogodak;
  const r = rjesenjePostavi(s);
  return isNum(r) && Math.abs(kut - r) <= tolPostavi(s) + 1e-9;
}

// zrcalo_slika: klon počinje blizu zrcala (krivo mjesto), korak povlačenja i tolerancija
export function korakRavnala(s) {
  const a = s.udaljenost ?? 1;
  const koraci = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  return koraci.find((k) => k >= a / 12) ?? 1000;
}
const pocetniKlon = (s) => {
  const k = korakRavnala(s) / 2;
  return Math.round(((s.udaljenost ?? 1) * 0.4) / k) * k;
};
const tolSlike = (s) =>
  Math.max(0.03 * s.udaljenost, korakRavnala(s) / 4 + 1e-9);

function checkSlika(s, d) {
  if (!isNum(d))
    return {
      tocno: false,
      poruka: "Povuci klona na mjesto slike.",
      prazno: true,
    };
  const a = s.udaljenost;
  const j = jedinicaDuljine(s);
  const tol = tolSlike(s);
  if (Math.abs(d - a) <= tol) return { tocno: true };
  if (d < -tol)
    return {
      tocno: false,
      poruka:
        "Slika nije ispred zrcala. Zrake se od zrcala odbijaju natrag, a oko ih vidi kao da dolaze **iza** zrcala.",
    };
  if (Math.abs(d) <= tol)
    return {
      tocno: false,
      poruka:
        "Slika nije na samom zrcalu. Zamisli da je zrcalo prozor: iza njega stoji klon jednako daleko kao ti ispred.",
    };
  if (Math.abs(d - 2 * a) <= tol)
    return {
      tocno: false,
      poruka: `To je ${duljinaTekst(2 * a, j)} iza zrcala, koliko je slika udaljena od osobe. Od zrcala je slika udaljena koliko i osoba.`,
    };
  if (Math.abs(d - a / 2) <= tol)
    return {
      tocno: false,
      poruka:
        "Slika nije na pola puta. Iza zrcala je **jednako daleko** koliko je predmet ispred njega.",
    };
  return {
    tocno: false,
    poruka:
      d < a
        ? "Preblizu zrcalu. Slika je jednako daleko iza zrcala koliko je predmet ispred njega."
        : "Predaleko. Slika je jednako daleko iza zrcala koliko je predmet ispred njega.",
  };
}

function checkPostavi(s, odgovor) {
  if (s.scena === "zrcalo_slika") return checkSlika(s, odgovor);
  const kut = isNum(odgovor) ? odgovor : odgovor?.kut;
  if (!isNum(kut))
    return { tocno: false, poruka: "Okreni laser pa provjeri.", prazno: true };
  if (ispunjavaCilj(s, kut)) return { tocno: true };
  const tol = tolPostavi(s);
  const isti = (x) => isNum(x) && Math.abs(kut - x) <= tol;
  const hit = (s.krivo ?? []).find((k) => isti(k.vrijednost));
  if (hit) return { tocno: false, poruka: hit.poruka };
  const c = s.cilj;
  const f = fizika(s, { ...pocetnoStanje(s), kut });
  const r = rjesenjePostavi(s);
  const kt = kutTekst(kut);
  if (c.vrsta === "povratak") {
    if (kut > 80)
      return {
        tocno: false,
        poruka:
          "To je zraka gotovo uz samu površinu. Natrag u izvor ide samo zraka koja pada **po normali** (okomito na zrcalo).",
      };
    return {
      tocno: false,
      poruka: `Pri upadnom kutu ${kt} odbijena zraka ode pod ${kt} na drugu stranu normale. Natrag ide samo zraka po normali: upadni kut 0°.`,
    };
  }
  if (c.vrsta === "kut") {
    const v = c.vrijednost;
    if (c.velicina === "alpha" && isti(90 - v))
      return {
        tocno: false,
        poruka: `Postavio si ${kutTekst(v)} od **površine**, a zadano je ${kutTekst(v)} od **normale**.`,
      };
    if (c.velicina === "alpha_povrsina" && isti(v))
      return {
        tocno: false,
        poruka: `Postavio si ${kutTekst(v)} od **normale**, a zadano je ${kutTekst(v)} od **površine**. Od normale je to 90° − ${kutTekst(v)}.`,
      };
    if (c.velicina === "izmedu" && isti(v))
      return {
        tocno: false,
        poruka:
          "To je upadni kut jednak cijelom kutu između zraka. Kut između zraka zbroj je upadnog i odbojnog, pa je upadni pola od toga.",
      };
    if (c.velicina === "izmedu" && isti(90 - v / 2))
      return {
        tocno: false,
        poruka:
          "Mjerio si od površine. Upadni kut mjeri se od normale, a kut između zraka je 2α.",
      };
    if (c.velicina === "beta") {
      if (isti(v))
        return {
          tocno: false,
          poruka: `Upadni kut je ${kt}, a toliki treba biti **kut loma** β. Zraka na granici skrene, pa upadni kut mora biti drukčiji.`,
        };
      if (isti(snell(f.n1, f.n2, v)))
        return {
          tocno: false,
          poruka:
            "Zamijenio si n₁ i n₂: n₁ je sredstvo iz kojeg zraka dolazi, n₂ ono u koje ulazi.",
        };
      if (f.beta == null)
        return {
          tocno: false,
          poruka: "Sve se odbilo, lomljene zrake nema. Smanji upadni kut.",
        };
      return {
        tocno: false,
        poruka: `Kut loma je ${kutTekst(f.beta)}. ${f.beta < v ? "Povećaj" : "Smanji"} upadni kut.`,
      };
    }
    return {
      tocno: false,
      poruka: `Nije taj kut. ${kut < r ? "Povećaj" : "Smanji"} upadni kut (mjeri se od normale).`,
    };
  }
  if (c.vrsta === "granicni") {
    const g = r;
    // što se stvarno dogodi pri učenikovu kutu (90° − α_g je ispod graničnog kad je α_g > 45°)
    const ishodKuta =
      kut < g && f.beta != null
        ? `zraka još izlazi u ${sredstvo2(s).naziv} (kut loma ${kutTekst(f.beta)})`
        : "sve se odbilo";
    if (isti(90 - g))
      return {
        tocno: false,
        poruka: `To je granični kut mjeren od **površine**. Upadni kut mjeri se od normale: pri ${kt} od normale ${ishodKuta}.`,
      };
    if (isti(atanD(f.n2 / f.n1)))
      return {
        tocno: false,
        poruka:
          "To je kut iz tg⁻¹. Granični kut dobiva se iz sinusa: pri njemu je kut loma 90°, pa je sin α_g = n₂/n₁.",
      };
    if (isti(atanD(f.n1 / f.n2)))
      return {
        tocno: false,
        poruka: `To je kut iz tg α = n (Brewsterov kut), a ne granični. Granični kut: sin α_g = n₂/n₁. Pri ${kt} ${ishodKuta}.`,
      };
    if (kut < g)
      return {
        tocno: false,
        poruka: `Zraka još izlazi u ${sredstvo2(s).naziv} (kut loma ${kutTekst(f.beta)}). Povećaj upadni kut.`,
      };
    return {
      tocno: false,
      poruka:
        "Sve se odbilo: to je već totalna refleksija. Granični kut je manji, točno onaj pri kojem lomljena zraka legne uz površinu.",
    };
  }
  if (c.vrsta === "meta") {
    const p = pogodakMete(s, kut);
    if (p.nema)
      return {
        tocno: false,
        poruka:
          "Nema lomljene zrake: to je već totalna refleksija. Smanji upadni kut.",
      };
    const zraka = c.meta[1] > 0 ? "Odbijena" : "Lomljena";
    return {
      tocno: false,
      poruka:
        kut < r
          ? `${zraka} zraka prolazi lijevo od mete (prestrmo). Povećaj upadni kut.`
          : `${zraka} zraka prolazi desno od mete (preplitko). Smanji upadni kut.`,
    };
  }
  return { tocno: false, poruka: s.savjet || "Nije točno." };
}

// ── izracunaj i odaberi: provjera ────────────────────────────────────────────────────────────────────
function checkIzracunaj(s, unosi) {
  const pitaj = s.pitaj;
  const vals = pitaj.map((_, i) =>
    Array.isArray(unosi) ? (unosi[i] ?? "") : i === 0 ? (unosi ?? "") : "",
  );
  const prazno = vals.findIndex((v) => !String(v).trim());
  if (prazno >= 0)
    return {
      tocno: false,
      poruka: pitaj.length > 1 ? "Upiši sve odgovore." : "Upiši odgovor.",
      prazno: true,
      polje: prazno,
    };
  for (let i = 0; i < pitaj.length; i++) {
    const p = pitaj[i];
    const o = odgovorPitanja(s, p);
    const r = checkNumber({
      input: String(vals[i]),
      answer: o.tocno,
      tol: o.tol,
      unit: jedinicaPitanja(s, p),
      krivo: o.krivo,
      savjet: s.savjet,
    });
    if (!r.tocno)
      return {
        ...r,
        polje: i,
        poruka: pitaj.length > 1 ? `U ${i + 1}. polju: ${r.poruka}` : r.poruka,
      };
  }
  return { tocno: true };
}

function checkOdaberi(s, id) {
  if (!isText(id))
    return {
      tocno: false,
      poruka: "Dodirni jednu od zraka A–D.",
      prazno: true,
    };
  if (id === tocnaPonuda(s)) return { tocno: true };
  return {
    tocno: false,
    poruka: PORUKE_PONUDA(s)[id] || s.savjet || "Nije ta zraka.",
  };
}

// ── što je skriveno ─────────────────────────────────────────────────────────────────────────────────
// otkriveno: točno odgovoreno ili prikazan točan odgovor; provjereno: „postavi“ je provjeren baš s ovim stanjem
export function skrivanje(s, { otkriveno = false, provjereno = false } = {}) {
  const n = s.nacin;
  if (GLEDANJE.includes(n)) return { izlaz: false, brojevi: false, kut: false };
  if (n === "postavi")
    return {
      izlaz: !(otkriveno || provjereno),
      brojevi: !(otkriveno || provjereno),
      kut: s.skrij === "kut" && !otkriveno,
    };
  return { izlaz: !otkriveno, brojevi: !otkriveno, kut: false };
}

export function prikaziScene(s) {
  if (Array.isArray(s.prikazi)) return s.prikazi;
  if (s.scena === "zrcalo") return ["kutovi", "kut_povrsina"];
  if (s.scena === "lom")
    return sredstvo1(s).n > (sredstvo2(s)?.n ?? 1) ||
      klizaciOd(s).some((k) => k.id === "n1")
      ? ["kutovi", "sinusi", "brzine", "granicni"]
      : ["kutovi", "sinusi", "brzine"];
  if (s.scena === "ploca") return ["kutovi", "pomak"];
  return ["udaljenosti", "zrake"];
}
const PRIKAZI = {
  zrcalo: ["kutovi", "kut_povrsina", "izmedu"],
  lom: ["kutovi", "sinusi", "brzine", "granicni"],
  ploca: ["kutovi", "pomak"],
  zrcalo_slika: ["udaljenosti", "zrake"],
};

// ── geometrija crteža (SVG 360 × 280, y prema dolje) ───────────────────────────────────────────────────
export const SIRINA = 360;
export const VISINA = 280;
const VISINE = { zrcalo: 236, lom: 280, ploca: 300, zrcalo_slika: 280 };
export const visinaScene = (s) => VISINE[s.scena] ?? VISINA;
const r1 = (v) => Math.round(v * 10) / 10;
const T = (p) => [r1(p[0]), r1(p[1])];
const plus = (o, d, t) => [o[0] + d[0] * t, o[1] + d[1] * t];
const smjerKuta = (deg) => Math.atan2(deg[1], deg[0]) / RAD;
function doRuba(o, d, h = VISINA, rub = 6) {
  let t = Infinity;
  if (d[0] > 1e-9) t = Math.min(t, (SIRINA - rub - o[0]) / d[0]);
  if (d[0] < -1e-9) t = Math.min(t, (rub - o[0]) / d[0]);
  if (d[1] > 1e-9) t = Math.min(t, (h - rub - o[1]) / d[1]);
  if (d[1] < -1e-9) t = Math.min(t, (rub - o[1]) / d[1]);
  return plus(o, d, t);
}

// luk kuta između smjerova u i v (kraći put) kao niz točaka; oznaka iza sredine luka
function luk(c, r, u, v, vrsta, tekst, rOzn = r + 14) {
  const a0 = smjerKuta(u);
  let da = smjerKuta(v) - a0;
  da = ((da + 540) % 360) - 180;
  if (Math.abs(da) < 1.5) return null;
  const n = Math.max(4, Math.ceil(Math.abs(da) / 6));
  const tocke = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (da * i) / n) * RAD;
    tocke.push(T([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]));
  }
  const am = (a0 + da / 2) * RAD;
  return {
    vrsta,
    tocke,
    oznaka: {
      x: r1(c[0] + rOzn * Math.cos(am)),
      y: r1(c[1] + rOzn * Math.sin(am) + 4),
      tekst,
      // uz normalu dva susjedna luka (α i α') ne smiju se preklopiti: tekst se poravna prema svojoj strani
      sidro:
        Math.cos(am) < -0.04 ? "end" : Math.cos(am) > 0.04 ? "start" : "middle",
    },
  };
}

// tekst oznake kuta: „α = 39°“, „α“, „α' = ?“
const oznakaKuta = (sim, x, pokazi, pitano) =>
  pitano ? `${sim} = ?` : pokazi && isNum(x) ? `${sim} = ${kutTekst(x)}` : sim;
const tonSredstva = (n) => Math.max(0, Math.min(1, (n - 1) / 1.5));

export function geometrija(s, st = pocetnoStanje(s), opt = {}) {
  const sk = skrivanje(s, opt);
  const otkriveno = !!opt.otkriveno;
  const f = fizika(s, st);
  const prikazi = GLEDANJE.includes(s.nacin)
    ? prikaziScene(s)
    : s.scena === "zrcalo_slika"
      ? ["udaljenosti", "zrake"]
      : ["kutovi"];
  const ima = (k) => prikazi.includes(k);
  const pitano = new Set(
    s.nacin === "izracunaj" && !otkriveno
      ? (s.pitaj ?? []).map((p) => p.velicina)
      : [],
  );
  // brojevi kutova: u gledanju i nakon otkrivanja svi; u „postavi“ upadni kut (osim uz skrij: kut); u
  // „izracunaj“ samo zadani kut
  const daniPhi = !isNum(s.kut) && isNum(s.kut_povrsina);
  const brojAlpha =
    !sk.brojevi ||
    (s.nacin === "postavi" && !sk.kut) ||
    (s.nacin === "izracunaj" && !daniPhi && !pitano.has("alpha"));
  const g = {
    w: SIRINA,
    h: visinaScene(s),
    scena: s.scena,
    sredstva: [],
    granice: [],
    zrcalo: null,
    normale: [],
    zrake: [],
    lukovi: [],
    kote: [],
    natpisi: [],
    laser: null,
    meta: null,
    kandidati: [],
    skriveno: sk,
  };

  if (s.scena === "zrcalo_slika")
    return geometrijaSlike(s, st, g, sk, otkriveno, opt);

  if (s.scena === "zrcalo" || s.scena === "lom") {
    const lom = s.scena === "lom";
    const O = lom ? [180, 150] : [180, 200];
    const L = lom ? 104 : 128;
    const a = f.alpha;
    const dIn = [sinD(a), cosD(a)];
    const laser = plus(O, dIn, -L);
    const gore = [0, -1];
    const unatrag = [-dIn[0], -dIn[1]];
    const dOdb = [sinD(a), -cosD(a)];
    g.laser = {
      x: r1(laser[0]),
      y: r1(laser[1]),
      kut: r1(smjerKuta(dIn)),
      o: T(O),
      L,
      rucka: T(plus(laser, dIn, -24)),
    };
    g.normale.push({
      od: T([O[0], lom ? 16 : 30]),
      do: T([O[0], lom ? 272 : O[1]]),
    });
    if (lom) {
      const [s1, s2] = [sredstvo1(s), sredstvo2(s)];
      g.sredstva.push(
        {
          tocke: [
            [0, 0],
            [SIRINA, 0],
            [SIRINA, O[1]],
            [0, O[1]],
          ],
          ton: tonSredstva(f.n1),
          naziv: nazivSredstva(f.n1, s1),
          n: f.n1,
          oznaka: {
            x: 10,
            y: 20,
            tekst: `${nazivSredstva(f.n1, s1)} · n_1 = ${nTekst(f.n1)}`,
          },
        },
        {
          tocke: [
            [0, O[1]],
            [SIRINA, O[1]],
            [SIRINA, g.h],
            [0, g.h],
          ],
          ton: tonSredstva(f.n2),
          naziv: nazivSredstva(f.n2, s2),
          n: f.n2,
          oznaka: {
            x: 10,
            y: g.h - 10,
            tekst: `${nazivSredstva(f.n2, s2)} · n_2 = ${nTekst(f.n2)}`,
          },
        },
      );
      g.granice.push({ od: [0, O[1]], do: [SIRINA, O[1]] });
    } else {
      g.zrcalo = { od: [22, O[1]], do: [SIRINA - 22, O[1]], strana: "dolje" };
    }

    if (s.nacin === "odaberi") {
      g.zrake.push({
        vrsta: "upadna",
        tocke: [T(laser), T(O)],
        n: [f.n1],
        t0: 0,
        jakost: 1,
      });
      dodajKandidate(s, g, O, f, otkriveno);
      if (otkriveno)
        dodajLom(s, g, O, L, f, sk, {
          brojevi: true,
          pitano,
          ima: () => true,
          brojAlpha: true,
        });
      else
        g.lukovi.push(luk(O, 44, gore, unatrag, "alpha", `α = ${kutTekst(a)}`));
      g.lukovi = g.lukovi.filter(Boolean);
      return g;
    }

    g.zrake.push({
      vrsta: "upadna",
      tocke: [T(laser), T(O)],
      n: [f.n1],
      t0: 0,
      jakost: 1,
    });
    if (!lom) {
      if (!sk.izlaz)
        g.zrake.push({
          vrsta: "odbijena",
          tocke: [T(O), T(doRuba(O, dOdb, g.h))],
          n: [1],
          t0: L,
          jakost: 1,
        });
      const brojevi = !sk.brojevi;
      if (ima("kutovi") || s.nacin !== "istrazi") {
        g.lukovi.push(
          luk(
            O,
            48,
            gore,
            unatrag,
            "alpha",
            oznakaKuta("α", a, brojAlpha, pitano.has("alpha")),
          ),
        );
        if (!sk.izlaz)
          g.lukovi.push(
            luk(
              O,
              48,
              gore,
              dOdb,
              "alpha_odbojni",
              oznakaKuta("α'", a, brojevi, pitano.has("alpha_odbojni")),
            ),
          );
        else if (pitano.has("alpha_odbojni"))
          g.natpisi.push({
            x: O[0] + 52,
            y: O[1] - 52,
            tekst: "α' = ?",
            vrsta: "pitanje",
          });
      }
      const phiZadan = s.nacin === "izracunaj" && daniPhi;
      if ((GLEDANJE.includes(s.nacin) && ima("kut_povrsina")) || phiZadan)
        g.lukovi.push(
          luk(
            O,
            30,
            [-1, 0],
            unatrag,
            "phi",
            oznakaKuta("φ", 90 - a, brojevi || phiZadan, false),
            66,
          ),
        );
      if (
        (GLEDANJE.includes(s.nacin) && ima("izmedu")) ||
        (pitano.has("izmedu") && !sk.izlaz) ||
        (s.nacin === "izracunaj" &&
          otkriveno &&
          (s.pitaj ?? []).some((p) => p.velicina === "izmedu"))
      )
        g.lukovi.push(
          luk(
            O,
            74,
            unatrag,
            dOdb,
            "izmedu",
            oznakaKuta("α + α'", 2 * a, brojevi, pitano.has("izmedu")),
            88,
          ),
        );
      else if (pitano.has("izmedu"))
        g.natpisi.push({
          x: O[0],
          y: O[1] - 96,
          tekst: "kut između zraka = ?",
          vrsta: "pitanje",
        });
      if (pitano.has("povratak_povrsina") || pitano.has("povratak_normala"))
        g.natpisi.push({
          x: O[0],
          y: 24,
          tekst: "kada se zraka vraća u laser?",
          vrsta: "pitanje",
        });
    } else {
      dodajLom(s, g, O, L, f, sk, {
        brojevi: !sk.brojevi,
        pitano,
        ima,
        brojAlpha,
      });
    }
    if (s.nacin === "postavi" && s.cilj?.vrsta === "meta") {
      const [mx, my] = s.cilj.meta;
      const pogodak =
        (opt.provjereno || otkriveno) && pogodakMete(s, f.alpha).pogodak;
      g.meta = {
        x: r1(O[0] + mx * METAR),
        y: r1(O[1] - my * METAR),
        r: R_META * METAR,
        pogodak,
      };
    }
    g.lukovi = g.lukovi.filter(Boolean);
    return g;
  }

  // ploča
  const s1 = sredstvo1(s);
  const s2 = s.ploca;
  const dMax = Math.max(
    st.debljina,
    ...klizaciOd(s)
      .filter((k) => k.id === "debljina")
      .map((k) => k.max),
  );
  const mjerilo = Math.min(30, 80 / dMax);
  const tpx = st.debljina * mjerilo;
  const Y1 = 110;
  const Y2 = Y1 + tpx;
  const O = [124, Y1];
  const L = 76;
  const a = f.alpha;
  const dIn = [sinD(a), cosD(a)];
  const laser = plus(O, dIn, -L);
  const unatrag = [-dIn[0], -dIn[1]];
  g.laser = {
    x: r1(laser[0]),
    y: r1(laser[1]),
    kut: r1(smjerKuta(dIn)),
    o: T(O),
    L,
    rucka: T(plus(laser, dIn, -24)),
  };
  g.sredstva.push(
    {
      tocke: [
        [0, 0],
        [SIRINA, 0],
        [SIRINA, g.h],
        [0, g.h],
      ],
      ton: tonSredstva(f.n1),
      naziv: s1.naziv,
      n: f.n1,
      oznaka: {
        x: 10,
        y: g.h - 10,
        tekst: `${s1.naziv} · n = ${nTekst(f.n1)}`,
      },
    },
    {
      tocke: T2([
        [0, Y1],
        [SIRINA, Y1],
        [SIRINA, Y2],
        [0, Y2],
      ]),
      ton: tonSredstva(f.n2),
      naziv: nazivSredstva(f.n2, s2),
      n: f.n2,
      oznaka: {
        x: 10,
        y: r1(tpx >= 24 ? Y1 + 17 : Y2 + 15),
        tekst: `${nazivSredstva(f.n2, s2)} · n = ${nTekst(f.n2)}`,
      },
    },
  );
  g.granice.push(
    { od: [0, Y1], do: [SIRINA, Y1] },
    { od: [0, r1(Y2)], do: [SIRINA, r1(Y2)] },
  );
  g.normale.push({ od: [O[0], Y1 - 66], do: T([O[0], Y2 + 14]) });
  g.zrake.push({
    vrsta: "upadna",
    tocke: [T(laser), T(O)],
    n: [f.n1],
    t0: 0,
    jakost: 1,
  });
  const b = f.beta;
  const dB = [sinD(b), cosD(b)];
  const E = plus(O, dB, tpx / cosD(b));
  const dOut = [sinD(f.gamma), cosD(f.gamma)];
  // normala u izlaznoj točki odaje gdje zraka izlazi (β, γ, pomak): u izračunu tek nakon odgovora
  if (!["beta", "gamma", "pomak"].some((v) => pitano.has(v)))
    g.normale.push({
      od: T([E[0], Y1 - 8]),
      do: T([E[0], Math.min(g.h - 4, Y2 + 64)]),
    });
  const brojevi = !sk.brojevi;
  const vidiPomak = GLEDANJE.includes(s.nacin)
    ? ima("pomak")
    : otkriveno && s.nacin === "izracunaj";
  if (s.nacin === "odaberi") {
    g.zrake.push({
      vrsta: "lomljena",
      tocke: [T(O), T(E)],
      n: [f.n2],
      t0: L * f.n1,
      jakost: 1 - f.R,
    });
    g.lukovi.push(luk(O, 34, [0, -1], unatrag, "alpha", `α = ${kutTekst(a)}`));
    dodajKandidatePloce(s, g, O, E, Y2, f, otkriveno);
    if (otkriveno) {
      g.lukovi.push(
        luk(E, 34, [0, 1], dOut, "gamma", `γ = ${kutTekst(f.gamma)}`),
      );
    }
    g.lukovi = g.lukovi.filter(Boolean);
    return g;
  }
  if (vidiPomak)
    g.zrake.push({
      vrsta: "nastavak",
      tocke: [T(O), T(doRuba(O, dIn, g.h))],
      n: [f.n1],
      t0: 0,
      jakost: 0.5,
      crtkano: true,
    });
  if (!sk.izlaz) {
    g.zrake.push({
      vrsta: "odbijena",
      tocke: [T(O), T(doRuba(O, [dIn[0], -dIn[1]], g.h))],
      n: [f.n1],
      t0: L * f.n1,
      jakost: f.R,
    });
    g.zrake.push({
      vrsta: "lomljena",
      tocke: [T(O), T(E), T(doRuba(E, dOut, g.h))],
      n: [f.n2, f.n1],
      t0: L * f.n1,
      jakost: 1 - f.R,
    });
  }
  if (ima("kutovi") || !GLEDANJE.includes(s.nacin)) {
    g.lukovi.push(
      luk(
        O,
        34,
        [0, -1],
        unatrag,
        "alpha",
        oznakaKuta("α", a, brojAlpha || brojevi, false),
      ),
    );
    if (!sk.izlaz) {
      if (tpx > 26)
        g.lukovi.push(
          luk(
            O,
            Math.min(30, tpx - 6),
            [0, 1],
            dB,
            "beta",
            oznakaKuta("β", b, brojevi, pitano.has("beta")),
            Math.min(30, tpx - 6) + 14,
          ),
        );
      g.lukovi.push(
        luk(
          E,
          34,
          [0, 1],
          dOut,
          "gamma",
          oznakaKuta("γ", f.gamma, brojevi, pitano.has("gamma")),
        ),
      );
    } else {
      const pit = [...pitano]
        .map(
          (v) =>
            ({ beta: "β = ?", gamma: "γ = ?", pomak: "x = ?", v2: "v = ?" })[v],
        )
        .filter(Boolean);
      if (pit.length)
        g.natpisi.push({
          x: 250,
          y: r1(Math.min(g.h - 30, Y2 + 40)),
          tekst: pit.join("   "),
          vrsta: "pitanje",
        });
    }
  }
  if (vidiPomak && !sk.izlaz && f.pomak > 0.01) {
    // podnožje okomice iz E na pravac upadne zrake
    const t = (E[0] - O[0]) * dIn[0] + (E[1] - O[1]) * dIn[1];
    const F = plus(O, dIn, t);
    const dl = Math.hypot(F[0] - E[0], F[1] - E[1]) || 1;
    g.kote.push({
      od: T(E),
      do: T(F),
      tekst: "x",
      oznaka: T(plus(F, [(F[0] - E[0]) / dl, (F[1] - E[1]) / dl], 9)),
    });
  }
  g.kote.push({
    od: [SIRINA - 22, Y1],
    do: [SIRINA - 22, r1(Y2)],
    tekst: `d = ${duljinaTekst(st.debljina, "cm")}`,
    okomita: true,
  });
  g.lukovi = g.lukovi.filter(Boolean);
  return g;
}
function T2(tocke) {
  return tocke.map(T);
}

function dodajLom(s, g, O, L, f, sk, { brojevi, pitano, ima, brojAlpha }) {
  const a = f.alpha;
  const dIn = [sinD(a), cosD(a)];
  const unatrag = [-dIn[0], -dIn[1]];
  const dOdb = [sinD(a), -cosD(a)];
  const gore = [0, -1];
  const ishod = !sk.izlaz;
  if (ishod) {
    g.zrake.push({
      vrsta: "odbijena",
      tocke: [T(O), T(doRuba(O, dOdb, g.h))],
      n: [f.n1],
      t0: L * f.n1,
      jakost: f.R,
    });
    if (f.beta != null) {
      const dB = [sinD(f.beta), cosD(f.beta)];
      g.zrake.push({
        vrsta: "lomljena",
        tocke: [T(O), T(doRuba(O, dB, g.h))],
        n: [f.n2],
        t0: L * f.n1,
        jakost: 1 - f.R,
      });
    } else
      g.natpisi.push({
        x: 250,
        y: O[1] + 66,
        tekst: "totalna refleksija: lomljene zrake nema",
        vrsta: "totalna",
      });
  }
  if (ima("kutovi") || !GLEDANJE.includes(s.nacin)) {
    g.lukovi.push(
      luk(
        O,
        44,
        gore,
        unatrag,
        "alpha",
        oznakaKuta("α", a, brojAlpha, pitano.has("alpha")),
      ),
    );
    if (ishod && f.beta != null)
      g.lukovi.push(
        luk(
          O,
          44,
          [0, 1],
          [sinD(f.beta), cosD(f.beta)],
          "beta",
          oznakaKuta("β", f.beta, brojevi, pitano.has("beta")),
        ),
      );
    if (ishod && f.beta == null)
      g.lukovi.push(
        luk(
          O,
          44,
          gore,
          dOdb,
          "alpha_odbojni",
          oznakaKuta("α'", a, brojevi, false),
        ),
      );
    if (!ishod && pitano.has("beta"))
      g.natpisi.push({ x: 236, y: 214, tekst: "β = ?", vrsta: "pitanje" });
  }
  const granicni = f.alpha_g;
  if (
    granicni != null &&
    ((GLEDANJE.includes(s.nacin) && ima("granicni")) ||
      (s.nacin === "izracunaj" && !sk.izlaz))
  ) {
    const dG = [-sinD(granicni), -cosD(granicni)];
    const kraj = plus(O, dG, 112);
    g.zrake.push({
      vrsta: "granicna",
      tocke: [T(kraj), T(O)],
      n: [f.n1],
      t0: 0,
      jakost: 0.6,
      crtkano: true,
    });
    g.natpisi.push({
      x: r1(kraj[0] - 10),
      y: r1(kraj[1] - 4),
      tekst: "α_g",
      vrsta: "granicni",
    });
  }
  if (s.nacin === "izracunaj" && !ishod && pitano.has("alpha_g"))
    g.natpisi.push({
      x: 250,
      y: O[1] + 66,
      tekst: "α_g = ?",
      vrsta: "pitanje",
    });
  if (s.nacin === "izracunaj" && !ishod) {
    const pit = [...pitano].filter((v) => v === "v1" || v === "v2");
    for (const v of pit)
      g.natpisi.push({
        x: 350,
        y: v === "v1" ? 20 : g.h - 10,
        tekst: `${v === "v1" ? "v_1" : "v_2"} = ?`,
        vrsta: "pitanje",
        desno: true,
      });
  }
}

function dodajKandidate(s, g, O, f, otkriveno) {
  const kutovi = kutoviPonuda(s);
  const tocna = tocnaPonuda(s);
  const lista = ponudeOd(s).map((id) => {
    const k = kutovi[id];
    const d = id === "odbija_se" ? [sinD(k), -cosD(k)] : [sinD(k), cosD(k)];
    const kraj = plus(O, d, id === "odbija_se" ? 96 : 98);
    return { id, d, kraj, tocna: id === tocna };
  });
  slova(lista);
  g.kandidati = lista.map((c) => ({
    id: c.id,
    slovo: c.slovo,
    tocke: [T(O), T(c.kraj)],
    oznaka: T(plus(O, c.d, c.id === "odbija_se" ? 116 : 118)),
    tocna: otkriveno ? c.tocna : undefined,
  }));
}

function dodajKandidatePloce(s, g, O, E, Y2, f, otkriveno) {
  const kutovi = kutoviPonuda(s);
  const tocna = tocnaPonuda(s);
  const a = f.alpha;
  const dIn = [sinD(a), cosD(a)];
  const Fz = plus(O, dIn, (Y2 - O[1]) / dIn[1]); // pravac upadne zrake na donjoj plohi
  const lista = ponudeOd(s).map((id) => {
    const k = kutovi[id];
    const d = [sinD(k), cosD(k)];
    const od = id === "bez_pomaka" ? Fz : E;
    return { id, d, od, kraj: od, tocna: id === tocna };
  });
  slova(lista);
  // duljine naizmjence duge i kratke, pa se slova susjednih zraka ne preklapaju
  const dolje = g.h - 18 - Y2 - 16;
  lista.forEach((c) => {
    const y = c.slovo === "A" || c.slovo === "C" ? dolje : dolje * 0.55;
    c.kraj = plus(c.od, c.d, Math.min(130, y / c.d[1]));
  });
  g.kandidati = lista.map((c) => ({
    id: c.id,
    slovo: c.slovo,
    tocke: [T(c.od), T(c.kraj)],
    oznaka: T(plus(c.kraj, c.d, 16)),
    tocna: otkriveno ? c.tocna : undefined,
  }));
}

// slova A–D redom slijeva nadesno (po smjeru), pa prava zraka nije uvijek isto slovo
function slova(lista) {
  const poredak = [...lista].sort(
    (p, q) =>
      Math.atan2(q.d[1], q.d[0]) - Math.atan2(p.d[1], p.d[0]) ||
      p.kraj[0] - q.kraj[0],
  );
  poredak.forEach((c, i) => (c.slovo = "ABCD"[i]));
}

// zrcalo_slika: okomito zrcalo, predmet lijevo, slika desno; oko (promatrač) koje se može povući
const MX = 190;
const POD = 232;
const ZRCALO_Y = [40, POD];
const VISINA_PREDMETA = { osoba: 96, strelica: 78, svijeca: 66 };
export function mjeriloSlike(s, st = pocetnoStanje(s)) {
  const aMax = Math.max(
    st.udaljenost,
    ...klizaciOd(s)
      .filter((k) => k.id === "udaljenost")
      .map((k) => k.max),
  );
  return s.nacin === "postavi" ? 72 / s.udaljenost : 128 / aMax;
}
export const granicaKlona = (s) => {
  const m = mjeriloSlike(s);
  return [-(MX - 24) / m, (SIRINA - 14 - MX) / m];
};
export const zadanoOko = (s, st) => {
  const m = mjeriloSlike(s, st);
  const x = MX - st.udaljenost * m;
  return [r1(Math.max(26, (x + MX) / 2 - 6)), 74];
};
// povlačenje: točka crteža → upadni kut (laser se vuče oko točke upada) i → položaj klona iza zrcala
export function kutIzTocke(o, x, y) {
  const [vx, vy] = [x - o[0], y - o[1]];
  if (Math.hypot(vx, vy) < 12) return null;
  const a = atanD2(-vx, -vy);
  return Math.round(Math.max(0, Math.min(89, a)) * 10) / 10;
}
const atanD2 = (y, x) => Math.atan2(y, x) / RAD;
export function klonIzTocke(s, x) {
  const k = korakRavnala(s) / 2;
  const [lo, hi] = granicaKlona(s);
  const d = (x - MX) / mjeriloSlike(s);
  return Math.round(Math.max(lo, Math.min(hi, d)) / k) * k;
}
export const granicaOka = () => [
  [16, MX - 16],
  [ZRCALO_Y[0] + 6, POD - 10],
];

function geometrijaSlike(s, st, g, sk, otkriveno, opt) {
  const m = mjeriloSlike(s, st);
  const a = st.udaljenost;
  const j = jedinicaDuljine(s);
  const vrsta = vrstaPredmeta(s);
  const h = VISINA_PREDMETA[vrsta];
  const px = MX - a * m;
  const ix = MX + a * m;
  g.zrcalo = { od: [MX, ZRCALO_Y[0]], do: [MX, ZRCALO_Y[1]], strana: "desno" };
  g.pod = { y: POD };
  g.predmet = { vrsta, x: r1(px), dno: POD, visina: h };
  // u „postavi“ prava slika (i zrake do nje) tek uz točan odgovor: nakon krive provjere bi odala mjesto
  const vidiSliku = s.nacin === "postavi" ? otkriveno : !sk.izlaz;
  g.slika = vidiSliku ? { vrsta, x: r1(ix), dno: POD, visina: h } : null;
  const postavi = s.nacin === "postavi";
  if (postavi && isNum(st.klon)) {
    const status =
      opt.provjereno || otkriveno
        ? Math.abs(st.klon - a) <= tolSlike(s)
          ? "ok"
          : "krivo"
        : null;
    g.klon = { vrsta, x: r1(MX + st.klon * m), dno: POD, visina: h, status };
  }
  const oko = st.oko ?? zadanoOko(s, st);
  g.oko = vidiSliku
    ? { x: oko[0], y: oko[1], pomicno: s.nacin === "istrazi" }
    : null;
  // zrake iz vrha predmeta u oko (dvije, na rubove zjenice) i iz dna; crtkani produžeci iza zrcala do slike
  if (
    vidiSliku &&
    (prikaziScene(s).includes("zrake") || !GLEDANJE.includes(s.nacin))
  ) {
    const izvori = [
      [
        [px, POD - h],
        [ix, POD - h],
        [oko[0], oko[1] - 5],
      ],
      [
        [px, POD - h],
        [ix, POD - h],
        [oko[0], oko[1] + 5],
      ],
      [
        [px, POD - 2],
        [ix, POD - 2],
        [oko[0], oko[1]],
      ],
    ];
    for (const [P, Pz, E] of izvori) {
      const t = (MX - Pz[0]) / (E[0] - Pz[0]);
      const My = Pz[1] + t * (E[1] - Pz[1]);
      if (!(t > 0 && t < 1) || My < ZRCALO_Y[0] || My > ZRCALO_Y[1]) continue;
      const M = [MX, My];
      g.zrake.push({
        vrsta: "upadna",
        tocke: [T(P), T(M), T(E)],
        n: [1, 1],
        t0: 0,
        jakost: 1,
        tanka: true,
      });
      g.zrake.push({
        vrsta: "produzetak",
        tocke: [T(M), T(Pz)],
        n: [1],
        t0: 0,
        jakost: 0.7,
        crtkano: true,
      });
    }
  }
  const vidiKote = GLEDANJE.includes(s.nacin)
    ? prikaziScene(s).includes("udaljenosti")
    : true;
  if (vidiKote) {
    const yk = postavi ? POD + 40 : POD + 18;
    g.kote.push({
      od: [r1(px), yk],
      do: [MX, yk],
      tekst: `a = ${duljinaTekst(a, j)}`,
    });
    if (vidiSliku) {
      g.kote.push({
        od: [MX, yk],
        do: [r1(ix), yk],
        tekst: duljinaTekst(a, j),
      });
      if (
        !postavi &&
        (s.nacin === "izracunaj" || prikaziScene(s).includes("udaljenosti"))
      )
        g.kote.push({
          od: [r1(px), POD + 38],
          do: [r1(ix), POD + 38],
          tekst: duljinaTekst(2 * a, j),
        });
    }
  }
  if (s.nacin === "izracunaj" && !vidiSliku)
    g.natpisi.push({
      x: 276,
      y: POD - 50,
      tekst: "slika = ?",
      vrsta: "pitanje",
    });
  if (postavi) {
    const k = korakRavnala(s);
    const [lo, hi] = granicaKlona(s);
    const crtice = [];
    for (let i = Math.ceil(lo / k); i <= Math.floor(hi / k); i++) {
      const x = MX + i * k * m;
      const korakOzn = [1, 2, 5, 10].find((q) => q * k * m >= 34) ?? 10;
      crtice.push({
        x: r1(x),
        duga: i % korakOzn === 0,
        tekst: i % korakOzn === 0 ? formatNumber(Math.abs(i * k)) : null,
      });
    }
    g.ravnalo = { y: POD, crtice, jedinica: j };
  }
  return g;
}

// ── očitanja uživo ──────────────────────────────────────────────────────────────────────────────────
export function ocitanja(s, st, opt = {}) {
  const sk = skrivanje(s, opt);
  const f = fizika(s, st);
  const out = [];
  if (s.nacin === "postavi") {
    if (s.scena !== "zrcalo_slika" && !sk.kut)
      out.push({
        kljuc: "alpha",
        oznaka: "α",
        tekst: kutTekst(f.alpha),
        naziv: "upadni kut (od normale)",
      });
    return out;
  }
  if (!GLEDANJE.includes(s.nacin)) return out;
  const ima = (k) => prikaziScene(s).includes(k);
  if (s.scena === "zrcalo") {
    if (ima("kutovi")) {
      out.push({
        kljuc: "alpha",
        oznaka: "α",
        tekst: kutTekst(f.alpha),
        naziv: "upadni kut",
      });
      out.push({
        kljuc: "alpha_odbojni",
        oznaka: "α'",
        tekst: kutTekst(f.alpha),
        naziv: "odbojni kut",
      });
    }
    if (ima("kut_povrsina"))
      out.push({
        kljuc: "phi",
        oznaka: "φ",
        tekst: kutTekst(f.phi),
        naziv: "kut prema površini",
      });
    if (ima("izmedu"))
      out.push({
        kljuc: "izmedu",
        oznaka: "α + α'",
        tekst: kutTekst(2 * f.alpha),
        naziv: "kut između zraka",
      });
  }
  if (s.scena === "lom" || s.scena === "ploca") {
    if (ima("kutovi")) {
      out.push({
        kljuc: "alpha",
        oznaka: "α",
        tekst: kutTekst(f.alpha),
        naziv: "upadni kut",
      });
      out.push({
        kljuc: "beta",
        oznaka: "β",
        tekst: f.beta == null ? "nema" : kutTekst(f.beta),
        naziv: f.beta == null ? "totalna refleksija" : "kut loma",
      });
      if (s.scena === "ploca")
        out.push({
          kljuc: "gamma",
          oznaka: "γ",
          tekst: kutTekst(f.gamma),
          naziv: "izlazni kut",
        });
    }
    if (s.scena === "lom" && ima("granicni") && f.alpha_g != null)
      out.push({
        kljuc: "alpha_g",
        oznaka: "α_g",
        tekst: kutTekst(f.alpha_g),
        naziv: "granični kut",
      });
    if (s.scena === "lom" && ima("brzine")) {
      out.push({
        kljuc: "v1",
        oznaka: "v₁",
        tekst: brzinaTekst(f.v1),
        naziv: "gore",
      });
      out.push({
        kljuc: "v2",
        oznaka: "v₂",
        tekst: brzinaTekst(f.v2),
        naziv: "dolje",
      });
    }
    if (s.scena === "lom" && ima("sinusi") && f.beta != null && f.alpha > 0.5)
      out.push({
        kljuc: "sinusi",
        oznaka: "sin α / sin β",
        tekst: formatNumber(sinD(f.alpha) / sinD(f.beta), 2),
        naziv: `= n₂/n₁ = ${formatNumber(f.n2 / f.n1, 2)}`,
      });
    if (s.scena === "ploca" && ima("pomak"))
      out.push({
        kljuc: "pomak",
        oznaka: "x",
        tekst: duljinaTekst(f.pomak, "cm"),
        naziv: "pomak zrake",
      });
  }
  return out;
}

// opis crteža za čitač zaslona (bez odgovora dok je skriven)
export function opisCrteza(s, st, opt = {}) {
  const sk = skrivanje(s, opt);
  const f = fizika(s, st);
  // u „izracunaj“ samo zadani podatak: uz kut prema površini upadni kut je već dio odgovora
  const kut = sk.kut
    ? ""
    : s.nacin === "izracunaj" && !isNum(s.kut) && isNum(s.kut_povrsina)
      ? ` tako da s površinom zatvara ${kutTekst(s.kut_povrsina)}`
      : ` pod upadnim kutom ${kutTekst(f.alpha)}`;
  if (s.scena === "zrcalo")
    return `Laser obasjava ravno zrcalo${kut}.${sk.izlaz ? " Odbijena zraka je skrivena." : ` Odbijena zraka odlazi pod ${kutTekst(f.alpha)} s druge strane normale.`}`;
  if (s.scena === "lom") {
    const [i1, i2] = [
      nazivSredstva(f.n1, sredstvo1(s)),
      nazivSredstva(f.n2, sredstvo2(s)),
    ];
    if (s.nacin === "odaberi")
      return `Zraka iz sredstva ${i1} pada${kut} na granicu sa sredstvom ${i2}. Ponuđene su zrake A do D.`;
    return `Zraka iz sredstva ${i1} (n = ${nTekst(f.n1)}) pada${kut} na granicu sa sredstvom ${i2} (n = ${nTekst(f.n2)}).${sk.izlaz ? " Ishod je skriven do provjere." : f.beta == null ? " Totalna refleksija: sva se svjetlost odbija." : ` Lomljena zraka ide pod ${kutTekst(f.beta)}.`}`;
  }
  if (s.scena === "ploca")
    return `Zraka pada${kut} na planparalelnu ploču (n = ${nTekst(f.n2)}, debljina ${duljinaTekst(st.debljina, "cm")}).${sk.izlaz ? "" : ` Izlazi pod ${kutTekst(f.gamma)}, paralelno s upadnom.`}`;
  const j = jedinicaDuljine(s);
  // isti uvjet kao crtež (geometrijaSlike): u „postavi“ slika se otkriva tek uz točan odgovor ili „pokaži“
  const vidiSliku = s.nacin === "postavi" ? !!opt.otkriveno : !sk.izlaz;
  return `Predmet stoji ${duljinaTekst(f.a, j)} ispred okomitog ravnog zrcala.${vidiSliku ? ` Slika je ${duljinaTekst(f.a, j)} iza zrcala.` : ""}`;
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Geometrijska optika (fizika, matura): zraka lasera, normala i kutovi uživo. tekst, scena, nacin. Kutovi se uvijek mjere od normale (α upadni, α' odbojni, β kut loma, γ izlazni, φ = 90° − α kut prema površini). c = 3·10⁸ m/s.
Scene:
- "zrcalo": vodoravno ravno zrcalo; kut (upadni, od normale, 0–89) ILI kut_povrsina (φ, 1–90).
- "zrcalo_slika": okomito ravno zrcalo; udaljenost (predmet–zrcalo, > 0), jedinica? ("cm" zadano | "m"), predmet? ("osoba" | "strelica" | "svijeca"). Zrake iz vrha predmeta preko zrcala u oko (oko se vuče), crtkani produžeci do slike.
- "lom": vodoravna granica; sredstvo1? (gore, odakle zraka dolazi; zadano {naziv: "zrak", n: 1}), sredstvo2 {naziv, n} (dolje); kut ILI kut_povrsina. Djelomično odbijena zraka (debljina iz Fresnela); za n1 > n2 granični kut i totalna refleksija.
- "ploca": planparalelna ploča u sredstvu sredstvo1? (zadano zrak); ploca {naziv, n, debljina (cm)}; kut ILI kut_povrsina. Izlazna zraka paralelna s upadnom, pomak x = d·sin(α − β)/cos β.
Načini:
- "istrazi" (gledanje): laser se vuče (kut), klizaci?: [{id, min, max, korak, pocetak?, oznaka?}] (1–3; id zrcalo: kut; lom: kut, n1, n2; ploca: kut, n, debljina; zrcalo_slika: udaljenost); prikazi?: zrcalo: kutovi, kut_povrsina, izmedu; lom: kutovi, sinusi, brzine, granicni; ploca: kutovi, pomak; zrcalo_slika: udaljenosti, zrake.
- "prikaz" (gledanje): isti crtež bez povlačenja i klizača (zamjena za sliku u objašnjenju); prikazi? kao gore.
- "postavi" (Tvoj red, zrcalo i lom): učenik okreće laser; izlazne zrake vide se tek nakon provjere. cilj: {vrsta: "kut", velicina: "alpha" | "alpha_povrsina" | "izmedu" (zrcalo) | "beta" (lom), vrijednost (°)} | {vrsta: "povratak"} (zrcalo: zraka se vraća u laser) | {vrsta: "granicni"} (lom, n1 > n2) | {vrsta: "meta", meta: [x, y]} (jedinice po 20 px od točke upada, y prema gore; y > 0 pogađa odbijena, y < 0 lomljena zraka). kut / kut_povrsina = početni položaj lasera (ne smije već ispunjavati cilj). skrij?: "kut" (bez broja kuta uživo), tolerancija? (°, zadano 0,5), krivo?: [{vrijednost (upadni kut), poruka}]. Poruke za kut od površine, Brewsterov kut umjesto graničnog, „još izlazi / sve se odbilo“, promašaj mete dodaju se same.
  zrcalo_slika + postavi: učenik povlači klona po ravnalu iza zrcala na mjesto slike (bez cilja); poruke za sliku na zrcalu, na pola puta, na 2a i ispred zrcala dodaju se same.
- "izracunaj" (Tvoj red): scena s „?“, izlazne zrake skrivene do točnog odgovora. pitaj: [{velicina, oznaka?, jedinica?, tolerancija?, krivo?}] (1–3). Veličine: zrcalo: alpha, alpha_odbojni, izmedu, povratak_povrsina, povratak_normala; zrcalo_slika: slika_osoba, slika_zrcalo; lom: alpha, beta, v1, v2, alpha_g (n1 > n2); ploca: beta, gamma, pomak, v2. Kutovi ±0,2°, brzine 1 %. Tipične greške računa kod: kut od površine, α/n umjesto sinusa, zamijenjeni n, sin β bez sin⁻¹, kalkulator u radijanima, c·n, 90° − α_g, tg⁻¹ i Brewster umjesto graničnog, γ = β, a umjesto 2a.
- "odaberi" (Tvoj red, lom i ploca): uz upadnu zraku nacrtane su zrake A–D, učenik dodirne pravu. ponudi?: lom: prema_normali, ravno, od_normale, odbija_se; ploca: paralelno, kao_u_ploci, bez_pomaka, previse (3–4, mora uključiti točnu). Točnu računa kod iz n i kuta.`;

const PRIMJER = {
  tip: TIP,
  scena: "lom",
  nacin: "izracunaj",
  tekst:
    "Svjetlost iz zraka upada na staklo indeksa loma 1,5 pod kutom 39° prema normali. Koliki je kut loma i kolika je brzina svjetlosti u tom staklu?",
  sredstvo1: { naziv: "zrak", n: 1 },
  sredstvo2: { naziv: "staklo", n: 1.5 },
  kut: 39,
  pitaj: [
    { velicina: "beta", oznaka: "$\\beta =$" },
    { velicina: "v2", oznaka: "$v =$" },
  ],
};

const PRIMJERI = [
  // 1125 a
  {
    tip: TIP,
    scena: "zrcalo",
    nacin: "izracunaj",
    tekst:
      "Zraka svjetlosti pada na ravno zrcalo tako da s njegovom **površinom** zatvara kut 25°. Koliki je odbojni kut i koliki je kut između upadne i odbijene zrake?",
    kut_povrsina: 25,
    pitaj: [{ velicina: "alpha_odbojni" }, { velicina: "izmedu" }],
  },
  // 1125 a, treći dio
  {
    tip: TIP,
    scena: "zrcalo",
    nacin: "postavi",
    tekst:
      "Okreni laser tako da se odbijena zraka vrati **natrag u laser**. Odbijenu zraku vidjet ćeš tek kad provjeriš.",
    kut_povrsina: 25,
    cilj: { vrsta: "povratak" },
  },
  // 1126 a: istraživanje
  {
    tip: TIP,
    scena: "zrcalo",
    nacin: "istrazi",
    tekst:
      "Okreći laser i usporedi kut prema **normali** (α, α') s kutom prema **površini** (φ).",
    kut_povrsina: 35,
    prikazi: ["kutovi", "kut_povrsina", "izmedu"],
  },
  // 1128 a: blizanac
  {
    tip: TIP,
    scena: "zrcalo",
    nacin: "postavi",
    tekst:
      "Namjesti laser tako da zraka s **površinom** zrcala zatvara 40°. Brojka uz laser pokazuje kut od normale.",
    kut: 20,
    cilj: { vrsta: "kut", velicina: "alpha_povrsina", vrijednost: 40 },
  },
  // 1127 a: igra s metom
  {
    tip: TIP,
    scena: "zrcalo",
    nacin: "postavi",
    tekst:
      "Okreni laser tako da odbijena zraka pogodi metu. Zraku ćeš vidjeti tek kad provjeriš, pa prvo procijeni kut.",
    kut: 30,
    cilj: { vrsta: "meta", meta: [6, 3.5] },
  },
  // 1125 b
  {
    tip: TIP,
    scena: "zrcalo_slika",
    nacin: "postavi",
    tekst:
      "Osoba stoji 80 cm ispred ravnog zrcala. Dovuci njezinog „klona“ na mjesto na kojem se vidi njezina slika.",
    udaljenost: 80,
    jedinica: "cm",
    predmet: "osoba",
  },
  // 1126 b
  {
    tip: TIP,
    scena: "zrcalo_slika",
    nacin: "izracunaj",
    tekst:
      "Osoba stoji 120 cm ispred ravnog zrcala. Koliko je njezina slika udaljena od nje?",
    udaljenost: 120,
    pitaj: [{ velicina: "slika_osoba" }],
  },
  // 1125 b: istraživanje
  {
    tip: TIP,
    scena: "zrcalo_slika",
    nacin: "istrazi",
    tekst:
      "Povuci **oko** i promijeni udaljenost svijeće. Gdje se sijeku crtkani produžeci zraka?",
    udaljenost: 80,
    predmet: "svijeca",
    klizaci: [{ id: "udaljenost", min: 20, max: 150, korak: 10 }],
  },
  // 1131 a
  {
    tip: TIP,
    scena: "lom",
    nacin: "istrazi",
    tekst:
      "Okreći laser i mijenjaj indeks loma donjeg sredstva. Prati omjer sinusa i točkice svjetlosti: gdje putuju sporije?",
    sredstvo2: { naziv: "voda", n: 1.33 },
    kut: 35,
    klizaci: [{ id: "n2", min: 1, max: 2.5, korak: 0.01 }],
  },
  // 1132 a
  {
    tip: TIP,
    scena: "lom",
    nacin: "odaberi",
    tekst:
      "Zraka iz zraka pada na staklo indeksa loma 1,7 pod kutom 55° prema normali. Koja je od zraka A–D prava lomljena zraka?",
    sredstvo2: { naziv: "staklo", n: 1.7 },
    kut: 55,
  },
  // 1130 b
  {
    tip: TIP,
    scena: "ploca",
    nacin: "istrazi",
    tekst:
      "Mijenjaj debljinu ploče i indeks loma. Što se mijenja na izlaznoj zraci, a što ostaje isto?",
    ploca: { naziv: "staklo", n: 1.5, debljina: 2 },
    kut: 39,
    klizaci: [
      { id: "debljina", min: 0.5, max: 4, korak: 0.5 },
      { id: "n", min: 1.1, max: 2.5, korak: 0.05 },
    ],
  },
  // 1133 b
  {
    tip: TIP,
    scena: "ploca",
    nacin: "izracunaj",
    tekst:
      "Zraka pada pod kutom 63° prema normali na planparalelnu staklenu ploču indeksa loma 1,75. Pod kojim kutom izlazi s druge strane ploče?",
    ploca: { naziv: "staklo", n: 1.75, debljina: 2 },
    kut: 63,
    pitaj: [{ velicina: "beta" }, { velicina: "gamma" }],
  },
  // 1134 b
  {
    tip: TIP,
    scena: "ploca",
    nacin: "odaberi",
    tekst:
      "Zraka pada pod 26° na staklenu planparalelnu ploču (n = 1,55). Kojim putem zraka izlazi iz ploče?",
    ploca: { naziv: "staklo", n: 1.55, debljina: 2 },
    kut: 26,
  },
  // 1135
  {
    tip: TIP,
    scena: "lom",
    nacin: "postavi",
    tekst:
      "Zraka ide iz kristala (n = 1,5) prema zraku. Izračunaj granični kut i namjesti laser na njega. Ishod ćeš vidjeti kad provjeriš.",
    sredstvo1: { naziv: "kristal", n: 1.5 },
    sredstvo2: { naziv: "zrak", n: 1 },
    kut: 20,
    cilj: { vrsta: "granicni" },
  },
  // 1138
  {
    tip: TIP,
    scena: "lom",
    nacin: "izracunaj",
    tekst:
      "Kristal ima indeks loma 2,42. Koliki je granični kut totalne refleksije pri prijelazu iz tog kristala u zrak?",
    sredstvo1: { naziv: "kristal", n: 2.42 },
    sredstvo2: { naziv: "zrak", n: 1 },
    kut: 15,
    pitaj: [{ velicina: "alpha_g" }],
  },
  // 1137: istraživanje totalne refleksije
  {
    tip: TIP,
    scena: "lom",
    nacin: "istrazi",
    tekst:
      "Zraka izlazi iz kristala (n = 1,6) u zrak. **Povećavaj upadni kut** i gledaj lomljenu i odbijenu zraku oko graničnog kuta.",
    sredstvo1: { naziv: "kristal", n: 1.6 },
    sredstvo2: { naziv: "zrak", n: 1 },
    kut: 25,
  },
  // 1135, blizanac: totalne refleksije pri ulasku u gušće sredstvo nema
  {
    tip: TIP,
    scena: "lom",
    nacin: "odaberi",
    tekst:
      "Zraka iz zraka pada na kristal (n = 1,5) pod kutom 60°. Što se dogodi na granici?",
    sredstvo2: { naziv: "kristal", n: 1.5 },
    kut: 60,
  },
  // 1136: crtež za objašnjenje
  {
    tip: TIP,
    scena: "lom",
    nacin: "prikaz",
    tekst:
      "Iz kristala (n = 1,33) pod 60°: kut je veći od graničnog (48,8°), pa je to totalna refleksija.",
    sredstvo1: { naziv: "kristal", n: 1.33 },
    sredstvo2: { naziv: "zrak", n: 1 },
    kut: 60,
    prikazi: ["kutovi", "granicni"],
  },
];

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
const KLJUCEVI = {
  zajednicki: ["tip", "scena", "nacin", "tekst", "savjet"],
  zrcalo: ["kut", "kut_povrsina"],
  lom: ["kut", "kut_povrsina", "sredstvo1", "sredstvo2"],
  ploca: ["kut", "kut_povrsina", "sredstvo1", "ploca"],
  zrcalo_slika: ["udaljenost", "jedinica", "predmet"],
  istrazi: ["klizaci", "prikazi"],
  prikaz: ["prikazi"],
  postavi: ["cilj", "skrij", "tolerancija", "krivo"],
  izracunaj: ["pitaj"],
  odaberi: ["ponudi"],
};

function validateSredstvo(x, ime, need) {
  if (!need(x && typeof x === "object", `${ime} mora biti {naziv, n}`))
    return false;
  need(isText(x.naziv), `${ime}.naziv mora biti tekst (npr. "staklo")`);
  return need(
    isNum(x.n) && x.n >= 1 && x.n <= 3,
    `${ime}.n mora biti indeks loma od 1 do 3`,
  );
}

function validateKlizaci(s, need) {
  if (s.klizaci == null) return;
  if (
    !need(
      Array.isArray(s.klizaci) &&
        s.klizaci.length >= 1 &&
        s.klizaci.length <= 3,
      "klizaci mora biti popis od 1 do 3 klizača",
    )
  )
    return;
  const ids = ID_KLIZACA[s.scena];
  const raspon = {
    kut: [0, 89],
    n1: [1, 3],
    n2: [1, 3],
    n: [1, 3],
    debljina: [0.1, 50],
    udaljenost: [0.01, 10000],
  };
  const vidjeni = new Set();
  s.klizaci.forEach((k, i) => {
    const w = `klizaci[${i}]`;
    if (
      !need(
        ids.includes(k?.id),
        `${w}.id mora biti jedan od: ${ids.join(", ")}`,
      )
    )
      return;
    need(!vidjeni.has(k.id), `${w}: klizač „${k.id}“ je već zadan`);
    vidjeni.add(k.id);
    const [lo, hi] = raspon[k.id];
    const ok =
      need(
        isNum(k.min) && isNum(k.max) && k.min < k.max,
        `${w}: min i max moraju biti brojevi, min < max`,
      ) &&
      need(
        k.min >= lo && k.max <= hi,
        `${w}: raspon za ${k.id} mora biti unutar [${formatNumber(lo)}, ${formatNumber(hi)}]`,
      ) &&
      need(
        isNum(k.korak) && k.korak > 0 && (k.max - k.min) / k.korak <= 2000,
        `${w}.korak mora biti pozitivan broj (najviše 2000 koraka)`,
      );
    if (ok && k.pocetak != null)
      need(
        isNum(k.pocetak) && k.pocetak >= k.min && k.pocetak <= k.max,
        `${w}.pocetak mora biti između min i max`,
      );
    if (k.oznaka != null) need(isText(k.oznaka), `${w}.oznaka mora biti tekst`);
    for (const p of Object.keys(k ?? {}))
      need(
        ["id", "min", "max", "korak", "pocetak", "oznaka"].includes(p),
        `${w}: nepoznato polje „${p}“`,
      );
  });
  // bez „pocetak“ klizač kreće od vrijednosti iz speca, pa ona mora biti u rasponu
  const izSpeca = {
    kut: pocetniKut(s),
    n1: sredstvo1(s).n,
    n2: s.sredstvo2?.n,
    n: s.ploca?.n,
    debljina: s.ploca?.debljina,
    udaljenost: s.udaljenost,
  };
  for (const k of s.klizaci)
    if (
      k &&
      k.pocetak == null &&
      isNum(k.min) &&
      isNum(k.max) &&
      isNum(izSpeca[k.id])
    )
      need(
        izSpeca[k.id] >= k.min && izSpeca[k.id] <= k.max,
        `klizač ${k.id}: vrijednost iz speca (${formatNumber(izSpeca[k.id])}) nije između min i max; zadaj pocetak ili promijeni raspon`,
      );
  if (s.scena === "ploca") {
    const n = s.klizaci.find((k) => k.id === "n");
    if (n && isNum(n.min))
      need(
        n.min > sredstvo1(s).n,
        "klizač n ploče mora biti veći od indeksa loma okoline",
      );
  }
}

export const zrake = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (GLEDANJE.includes(s.nacin) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  fizika,
  geometrija,
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "zrake treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `zrake.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return list;
    if (
      !need(
        NACINI[s.scena].includes(s.nacin),
        `zrake.nacin za scenu ${s.scena} mora biti jedan od: ${NACINI[s.scena].join(", ")}`,
      )
    )
      return list;
    const dozvoljeni = [
      ...KLJUCEVI.zajednicki,
      ...KLJUCEVI[s.scena],
      ...(KLJUCEVI[s.nacin] ?? []),
    ];
    for (const k of Object.keys(s))
      need(
        dozvoljeni.includes(k),
        `zrake: polje „${k}“ ne pripada sceni ${s.scena} u načinu ${s.nacin} (dopuštena: ${dozvoljeni.join(", ")})`,
      );
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");

    // kut
    if (s.scena !== "zrcalo_slika") {
      const imaKut = s.kut != null;
      const imaPhi = s.kut_povrsina != null;
      if (s.nacin === "postavi")
        need(
          !(imaKut && imaPhi),
          "zadaj najviše jedno od: kut, kut_povrsina (početni položaj lasera)",
        );
      else
        need(
          imaKut !== imaPhi,
          "zadaj točno jedno od: kut (upadni, od normale) ili kut_povrsina (prema površini)",
        );
      if (imaKut)
        need(
          isNum(s.kut) && s.kut >= 0 && s.kut <= 89,
          "kut mora biti upadni kut od 0 do 89 (°, od normale)",
        );
      if (imaPhi)
        need(
          isNum(s.kut_povrsina) && s.kut_povrsina >= 1 && s.kut_povrsina <= 90,
          "kut_povrsina mora biti od 1 do 90 (°)",
        );
    }
    // sredstva
    let sredstvaOk = true;
    if (s.scena === "lom") {
      if (s.sredstvo1 != null)
        sredstvaOk =
          validateSredstvo(s.sredstvo1, "sredstvo1", need) && sredstvaOk;
      sredstvaOk =
        validateSredstvo(s.sredstvo2, "sredstvo2", need) && sredstvaOk;
      if (sredstvaOk && s.nacin !== "istrazi")
        need(
          sredstvo1(s).n !== s.sredstvo2.n,
          "sredstvo1 i sredstvo2 moraju imati različit n (inače nema loma)",
        );
    }
    if (s.scena === "ploca") {
      if (s.sredstvo1 != null)
        sredstvaOk =
          validateSredstvo(s.sredstvo1, "sredstvo1", need) && sredstvaOk;
      sredstvaOk = validateSredstvo(s.ploca, "ploca", need) && sredstvaOk;
      if (sredstvaOk) {
        need(
          isNum(s.ploca.debljina) &&
            s.ploca.debljina >= 0.1 &&
            s.ploca.debljina <= 50,
          "ploca.debljina mora biti od 0,1 do 50 (cm)",
        );
        need(
          s.ploca.n > sredstvo1(s).n,
          "ploca.n mora biti veći od indeksa loma okoline (sredstvo1)",
        );
        for (const p of Object.keys(s.ploca))
          need(
            ["naziv", "n", "debljina"].includes(p),
            `ploca: nepoznato polje „${p}“`,
          );
      }
    }
    if (s.scena === "zrcalo_slika") {
      need(
        isNum(s.udaljenost) && s.udaljenost > 0 && s.udaljenost <= 10000,
        "udaljenost mora biti pozitivan broj (predmet–zrcalo)",
      );
      if (s.jedinica != null)
        need(
          JEDINICE_DULJINE.includes(s.jedinica),
          `jedinica mora biti ${JEDINICE_DULJINE.join(" ili ")}`,
        );
      if (s.predmet != null)
        need(
          PREDMETI.includes(s.predmet),
          `predmet mora biti jedan od: ${PREDMETI.join(", ")}`,
        );
    }
    if (list.length) return list;

    if (GLEDANJE.includes(s.nacin)) {
      noAnswerFields(s, need);
      if (s.nacin === "istrazi") validateKlizaci(s, need);
      if (
        s.prikazi != null &&
        need(
          Array.isArray(s.prikazi) && s.prikazi.length >= 1,
          "prikazi mora biti neprazan popis",
        )
      )
        for (const p of s.prikazi)
          need(
            PRIKAZI[s.scena].includes(p),
            `prikazi: „${p}“ nije za scenu ${s.scena} (${PRIKAZI[s.scena].join(", ")})`,
          );
      if (s.scena === "lom" && (s.prikazi ?? []).includes("granicni"))
        need(
          sredstvo1(s).n > s.sredstvo2.n ||
            (s.klizaci ?? []).some((k) => k.id === "n1" || k.id === "n2"),
          "prikazi granicni ima smisla samo uz n1 > n2 (iz gušćeg u rjeđe)",
        );
      return list;
    }

    if (s.nacin === "postavi") {
      if (s.scena === "zrcalo_slika") {
        need(
          s.cilj == null && s.skrij == null && s.tolerancija == null,
          "zrcalo_slika + postavi nema cilj, skrij ni tolerancija: učenik dovlači sliku",
        );
        if (s.krivo != null)
          need(
            false,
            "zrcalo_slika + postavi nema krivo (poruke se računaju same)",
          );
        return list;
      }
      const c = s.cilj;
      if (!need(c && typeof c === "object", "postavi treba cilj {vrsta, …}"))
        return list;
      const vrste =
        s.scena === "zrcalo"
          ? ["kut", "povratak", "meta"]
          : ["kut", "granicni", "meta"];
      if (
        !need(
          vrste.includes(c.vrsta),
          `cilj.vrsta za scenu ${s.scena} mora biti: ${vrste.join(", ")}`,
        )
      )
        return list;
      const polja = {
        kut: ["vrsta", "velicina", "vrijednost"],
        povratak: ["vrsta"],
        granicni: ["vrsta"],
        meta: ["vrsta", "meta"],
      }[c.vrsta];
      for (const p of Object.keys(c))
        need(
          polja.includes(p),
          `cilj ${c.vrsta}: nepoznato polje „${p}“ (polja: ${polja.join(", ")})`,
        );
      if (c.vrsta === "kut") {
        const vel =
          s.scena === "zrcalo"
            ? ["alpha", "alpha_povrsina", "izmedu"]
            : ["alpha", "alpha_povrsina", "beta"];
        if (
          !need(
            vel.includes(c.velicina),
            `cilj.velicina mora biti: ${vel.join(", ")}`,
          )
        )
          return list;
        need(
          isNum(c.vrijednost),
          "cilj.vrijednost mora biti kut u stupnjevima",
        );
      }
      if (c.vrsta === "granicni")
        need(
          sredstvo1(s).n > s.sredstvo2.n,
          "granicni: zraka mora ići iz gušćeg u rjeđe sredstvo (sredstvo1.n > sredstvo2.n)",
        );
      if (c.vrsta === "meta") {
        if (
          !need(
            Array.isArray(c.meta) && c.meta.length === 2 && c.meta.every(isNum),
            "cilj.meta mora biti [x, y] (jedinice od točke upada, y prema gore)",
          )
        )
          return list;
        const [x, y] = c.meta;
        need(
          x > 0 && x <= 8.5,
          "meta: x mora biti od 0 do 8,5 (desno od normale, unutar crteža)",
        );
        if (s.scena === "zrcalo")
          need(
            y > 0 && y <= 9,
            "meta: za zrcalo y mora biti od 0 do 9 (iznad zrcala)",
          );
        else
          need(
            y !== 0 && Math.abs(y) <= 6.5,
            "meta: za lom y mora biti od −6,5 do 6,5 (ne 0)",
          );
        need(
          Math.hypot(x, y) >= 2.5,
          "meta je preblizu točki upada (udaljenost barem 2,5)",
        );
      }
      if (s.skrij != null)
        need(
          s.skrij === "kut",
          'skrij može biti samo "kut" (ishod je u postavi ionako skriven do provjere)',
        );
      if (s.tolerancija != null)
        need(
          isNum(s.tolerancija) && s.tolerancija > 0 && s.tolerancija <= 5,
          "tolerancija mora biti od 0 do 5 (°)",
        );
      if (list.length) return list;
      const r = rjesenjePostavi(s);
      if (
        !need(
          isNum(r) && r >= 0 && r <= 89,
          "cilj se ne može postići upadnim kutom od 0° do 89°",
        )
      )
        return list;
      need(
        !ispunjavaCilj(s, pocetniKut(s)),
        "početni položaj lasera (kut / kut_povrsina, zadano 30°) već ispunjava cilj: zadaj drugi",
      );
      if (
        s.krivo != null &&
        need(Array.isArray(s.krivo), "krivo mora biti popis")
      ) {
        s.krivo.forEach((k, i) => {
          need(
            isNum(k?.vrijednost) && k.vrijednost >= 0 && k.vrijednost <= 89,
            `krivo[${i}].vrijednost mora biti upadni kut 0–89`,
          );
          need(isText(k?.poruka), `krivo[${i}].poruka mora biti tekst`);
          if (isNum(k?.vrijednost))
            need(
              !ispunjavaCilj(s, k.vrijednost),
              `krivo[${i}].vrijednost ${formatNumber(k.vrijednost)} ispunjava cilj, a to je točan odgovor`,
            );
        });
      }
      return list;
    }

    if (s.nacin === "izracunaj") {
      if (
        !need(
          Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
          "pitaj mora biti popis od 1 do 3 pitanja {velicina, …}",
        )
      )
        return list;
      const vel = velicineScene(s);
      const f = fizika(s);
      const vidjene = new Set();
      s.pitaj.forEach((p, i) => {
        const w = `pitaj[${i}]`;
        if (
          !need(
            p && p.velicina in vel,
            `${w}.velicina za scenu ${s.scena} mora biti: ${Object.keys(vel).join(", ")}`,
          )
        )
          return;
        need(
          !vidjene.has(p.velicina),
          `${w}: veličina „${p.velicina}“ se već traži`,
        );
        vidjene.add(p.velicina);
        for (const k of Object.keys(p))
          need(
            ["velicina", "oznaka", "jedinica", "tolerancija", "krivo"].includes(
              k,
            ),
            `${w}: nepoznato polje „${k}“`,
          );
        if (p.oznaka != null)
          need(isText(p.oznaka), `${w}.oznaka mora biti tekst`);
        if (p.tolerancija != null)
          need(
            isNum(p.tolerancija) && p.tolerancija >= 0,
            `${w}.tolerancija mora biti broj ≥ 0`,
          );
        const zadana = vel[p.velicina].jedinica;
        if (p.jedinica != null)
          need(
            p.jedinica === (zadana ?? jedinicaDuljine(s)),
            `${w}.jedinica mora biti „${zadana ?? jedinicaDuljine(s)}“ (ili je izostavi)`,
          );
        if (p.velicina === "alpha")
          need(
            s.kut_povrsina != null,
            `${w}: alpha se traži samo kad je zadan kut_povrsina`,
          );
        if (p.velicina === "alpha_g")
          need(
            f.n1 > f.n2,
            `${w}: granični kut postoji samo iz gušćeg u rjeđe (sredstvo1.n > sredstvo2.n)`,
          );
        if (["beta", "gamma", "pomak"].includes(p.velicina))
          need(
            f.beta != null,
            `${w}: pri ovom kutu je totalna refleksija, pa nema kuta loma`,
          );
        if (["gamma", "pomak"].includes(p.velicina))
          need(f.alpha > 0, `${w}: uz kut 0° zraka prolazi ravno`);
        if (list.length) return;
        const o = odgovorPitanja(s, p);
        validateKrivo(
          p.krivo,
          o.tocno,
          o.tol ?? Math.abs(o.tocno) * 0.005,
          need,
          `${w}.krivo`,
        );
      });
      return list;
    }

    if (s.nacin === "odaberi") {
      const f = fizika(s);
      const sve = PONUDE[s.scena];
      if (s.ponudi != null) {
        if (
          need(
            Array.isArray(s.ponudi) &&
              s.ponudi.length >= 3 &&
              s.ponudi.length <= 4,
            `ponudi mora biti popis od 3 do 4 zrake (${sve.join(", ")})`,
          )
        ) {
          for (const p of s.ponudi)
            need(
              sve.includes(p),
              `ponudi: „${p}“ nije zraka scene ${s.scena} (${sve.join(", ")})`,
            );
          need(
            new Set(s.ponudi).size === s.ponudi.length,
            "ponudi: zrake se ne smiju ponavljati",
          );
          need(
            s.ponudi.includes(tocnaPonuda(s)),
            `ponudi mora uključiti točnu zraku („${tocnaPonuda(s)}“)`,
          );
        }
      }
      need(
        f.alpha >= 10 && f.alpha <= 80,
        "odaberi: upadni kut mora biti od 10° do 80° (inače se zrake ne razlikuju)",
      );
      if (s.scena === "lom" && f.n1 > f.n2 && f.alpha_g != null)
        need(
          Math.abs(f.alpha - f.alpha_g) >= 3,
          "odaberi: kut je preblizu graničnom, zraka se ne vidi jasno",
        );
      if (s.scena === "ploca") {
        need(f.beta != null, "odaberi: zraka mora ući u ploču");
        const tpx = Math.min(40 * s.ploca.debljina, 104);
        if (ponudeOd(s).includes("bez_pomaka") && f.beta != null)
          need(
            tpx * (tanD(f.alpha) - tanD(f.beta)) >= 12,
            "odaberi: pomak zrake je premalen da se „bez_pomaka“ razlikuje od prave zrake (povećaj kut, n ili debljinu, ili izbaci bez_pomaka iz ponudi)",
          );
      }
      if (list.length) return list;
      const kut = kutoviPonuda(s);
      const ids = ponudeOd(s).filter(
        (id) => id !== "odbija_se" && id !== "bez_pomaka",
      );
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          need(
            Math.abs(kut[ids[i]] - kut[ids[j]]) >= 4,
            `odaberi: zrake „${ids[i]}“ i „${ids[j]}“ su preblizu (razlika manja od 4°), promijeni kut ili n`,
          );
      return list;
    }
    return list;
  },
  check(s, odgovor) {
    if (s.nacin === "postavi") return checkPostavi(s, odgovor);
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    if (s.nacin === "odaberi") return checkOdaberi(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "postavi") {
      if (s.scena === "zrcalo_slika")
        return `slika je ${duljinaTekst(s.udaljenost, jedinicaDuljine(s))} iza zrcala`;
      const r = rjesenjePostavi(s);
      const c = s.cilj;
      if (c.vrsta === "povratak")
        return "upadni kut 0°: zraka pada po normali (90° prema površini)";
      if (c.vrsta === "granicni") return `granični kut α_g = ${kutTekst(r)}`;
      if (c.vrsta === "meta") return `upadni kut α ≈ ${kutTekst(r)}`;
      return `upadni kut α = ${kutTekst(r)} (od normale)`;
    }
    if (s.nacin === "izracunaj")
      return s.pitaj
        .map((p) => {
          const o = odgovorPitanja(s, p);
          const j = jedinicaPitanja(s, p);
          const iznos =
            j === "°"
              ? kutTekst(o.tocno)
              : j === "m/s"
                ? brzinaTekst(o.tocno)
                : duljinaTekst(o.tocno, j);
          return `${p.oznaka ?? velicineScene(s)[p.velicina].oznaka} ${iznos}`;
        })
        .join("; ");
    if (s.nacin === "odaberi") {
      const id = tocnaPonuda(s);
      const f = fizika(s);
      const dodatak =
        s.scena === "lom" && f.beta != null
          ? ` (β = ${kutTekst(f.beta)})`
          : s.scena === "ploca"
            ? ` (γ = α = ${kutTekst(f.alpha)})`
            : "";
      return `zraka koja ${OPIS_PONUDE[id]}${dodatak}`;
    }
    return "";
  },
};
