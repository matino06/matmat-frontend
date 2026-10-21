// polarizacija: polarizacija svjetlosti u tri scene (državna matura, V17, zadaci 1160–1164).
// - filtri: izvor → 1–3 polarizacijska filtra koje učenik okreće → zastor; svjetlina i smjer titranja uživo.
// - prorez: uže (transverzalni val) i zvuk (longitudinalni) kroz ogradu s prorezom koji se okreće.
// - odsjaj: sunčeva zraka odbija se od vode/stakla; pri Brewsterovu kutu ($\\text{tg}\\,\\alpha_B = n$) odsjaj titra samo vodoravno, a
//   odbijena i lomljena zraka zatvaraju 90°; polarizacijske naočale s osi koja se okreće.
// Sva fizika i geometrija crteža (koordinate u sustavu viewBoxa komponente) su čiste funkcije ovdje, pa ih
// komponenta i buduća iOS verzija samo crtaju. Kutovi osi filtara, proreza i naočala mjere se od uspravnog
// (0° = uspravno, 90° = vodoravno); os je pravac, pa je 0° isto što i 180°. Upadni kut mjeri se od normale.
import { isNum, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
  KRIVO_OPIS,
} from "../zajednicko.js";

const TIP = "polarizacija";
export const SCENE = ["filtri", "prorez", "odsjaj"];
export const NACINI = {
  filtri: ["istrazi", "prikaz", "postavi"],
  prorez: ["istrazi", "prikaz", "odaberi"],
  odsjaj: ["istrazi", "prikaz", "postavi", "odaberi", "izracunaj"],
};
const POLJA = {
  filtri: ["izvor", "filtri", "mijenja", "cilj", "prikazi_postotak", "krivo"],
  prorez: ["prorez", "titranje", "valovi", "izvor_zvuka", "pitaj"],
  odsjaj: [
    "n",
    "povrsina",
    "kut",
    "naocale",
    "cilj",
    "pitaj",
    "krivo",
    "tolerancija",
    "prikazi_postotak",
  ],
};

export const KORAK_FILTRA = 5; // filtri, prorez i naočale okreću se u koracima od 5°
export const TOL_FILTAR = 3; // ° (os filtra u postavi)
export const TOL_NAOCALE = 5; // ° (os naočala)
export const KORAK_KUTA = 0.1; // ° (upadni kut)
export const TOL_KUT = 0.3; // ° (upadni kut u postavi; isti prag crtež koristi za „potpuno polariziran“)
const TOL_IZRACUN = 0.2; // ° (rješenja zaokružuju na 0,1°)

export const IZVORI = {
  zarulja: "žarulja",
  svijeca: "svijeća",
  lampa: "stolna lampa",
  svjetiljka: "džepna svjetiljka",
  sunce: "Sunce",
};
export const IZVORI_ZVUKA = {
  zvucnik: "zvučnik",
  vilica: "glazbena vilica",
  zvono: "zvono",
  truba: "truba",
  bubanj: "bubanj",
};
export const VALOVI = ["uze", "zvuk"];

// ── pomoćno ─────────────────────────────────────────────────────────────────────────────────────────
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
export const normOs = (k) => ((k % 180) + 180) % 180;
export const norm360 = (k) => ((k % 360) + 360) % 360;
// razlika dviju osi (pravaca), 0–90°
export function razlikaOsi(a, b) {
  const d = Math.abs(normOs(a) - normOs(b));
  return Math.min(d, 180 - d);
}
export const kutTekst = (x) =>
  `${r1(x).toFixed(1).replace("-", "−").replace(".", ",")}°`;
const naMrezi = (x, korak) =>
  isNum(x) && Math.abs(x / korak - Math.round(x / korak)) < 1e-9;
export function opisOsi(k) {
  const o = normOs(k);
  if (razlikaOsi(o, 0) < 1e-9) return "uspravno";
  if (razlikaOsi(o, 90) < 1e-9) return "vodoravno";
  return `${formatNumber(r1(o), 1)}° od uspravnog`;
}

// ── projekcija ──────────────────────────────────────────────────────────────────────────────────────
// Zraka ide slijeva nadesno (os x). Ravnina okomita na zraku ima uspravni smjer (gore) i smjer „prema gledatelju“
// koji se u kosoj projekciji crta ukoso dolje-lijevo (ZP). Os pod kutom k od uspravnog: cos k·gore + sin k·ZP.
export const ZP = [-0.42, 0.36];
export function smjerOsi(k) {
  const t = rad(k);
  return [ZP[0] * Math.sin(t), -Math.cos(t) + ZP[1] * Math.sin(t)];
}
// „gledano uzduž zrake“ (krug u kojem zraka ide ravno u oko): uspravno gore, vodoravno vodoravno
export function smjerSprijeda(k) {
  const t = rad(k);
  return [-Math.sin(t), -Math.cos(t)];
}
// točka na rubu diska (središte c, polumjer r) za kut k (0–360°)
export function tockaRuba(c, r, k) {
  const d = smjerOsi(k);
  return [r2(c[0] + r * d[0]), r2(c[1] + r * d[1])];
}
// obrnuto od tockaRuba: kut (0–360°) točke p na disku (za vučenje ručke)
export function kutIzTocke(c, p) {
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  const sin = dx / ZP[0];
  const cos = ZP[1] * sin - dy;
  return norm360(deg(Math.atan2(sin, cos)));
}
// kut ručke (0–360°) iz položaja na krugu „sprijeda“ (naočale)
export function kutSprijeda(c, p) {
  return norm360(deg(Math.atan2(-(p[0] - c[0]), -(p[1] - c[1]))));
}
export const zakljucaj = (k, korak = KORAK_FILTRA) =>
  norm360(Math.round(k / korak) * korak);

// obrub diska u ravnini okomitoj na zraku i crte (os propuštanja) u njemu
export function disk(c, r, k, crta = 0.26) {
  const obrub = [];
  for (let i = 0; i < 48; i++) obrub.push(tockaRuba(c, r, (i * 360) / 48));
  const os = smjerOsi(k);
  const okomito = smjerOsi(k + 90);
  const crte = [];
  for (let o = -0.78; o <= 0.79; o += crta) {
    const h = Math.sqrt(Math.max(0, 1 - o * o)) * r * 0.92;
    const s = [c[0] + okomito[0] * o * r, c[1] + okomito[1] * o * r];
    crte.push([
      [r2(s[0] - os[0] * h), r2(s[1] - os[1] * h)],
      [r2(s[0] + os[0] * h), r2(s[1] + os[1] * h)],
    ]);
  }
  return { obrub, crte };
}

// Val na zraci kao izlomljena crta: titranje duž osi pol (null = nepolarizirano: tri vala u različitim smjerovima).
// faza: 0–1 (vrijeme), A: amplituda u px.
export const VALNA_DULJINA = 34;
export function valCrte(od, doX, y, pol, A, faza, x0 = 0) {
  if (A <= 0.05 || doX <= od) return [];
  const smjerovi = pol == null ? [0, 60, 120] : [pol];
  return smjerovi.map((k, j) => {
    const d = smjerOsi(k);
    const pomak = pol == null ? j / 3 : 0;
    const tocke = [];
    for (let x = od; x <= doX + 0.01; x += 3) {
      const u =
        A * Math.sin(2 * Math.PI * ((x - x0) / VALNA_DULJINA - faza - pomak));
      tocke.push([r2(x + d[0] * u), r2(y + d[1] * u)]);
    }
    return { tocke, jakost: pol == null ? 0.55 : 1 };
  });
}

// Strelice u krugu „gledano uzduž zrake“: {kut, duljina 0–1}
export function strelicePolarizacije(pol, udio = 1) {
  if (udio <= 1e-6) return [];
  if (pol == null)
    return [0, 45, 90, 135].map((kut) => ({ kut, duljina: udio }));
  return [{ kut: normOs(pol), duljina: udio }];
}

// ── scena filtri ────────────────────────────────────────────────────────────────────────────────────
// Intenzitet izvora je 1. Prvi filtar od nepolarizirane svjetlosti propusti polovinu; svaki sljedeći I·cos²Δ.
export function intenziteti(kutovi) {
  let I = 1;
  let pol = null;
  return kutovi.map((k, i) => {
    I = i === 0 ? I / 2 : I * Math.cos(rad(k - pol)) ** 2;
    if (I < 1e-12) I = 0;
    pol = k;
    return I;
  });
}
export const kutoviFiltara = (s) => s.filtri.map((f) => normOs(f.kut));
const konacni = (kutovi) => intenziteti(kutovi).at(-1);

// mjesta (os pomičnog filtra, 0–180° po 0,5°) na kojima je cilj ispunjen
export function rjesenjaFiltri(s) {
  const k0 = kutoviFiltara(s);
  const m = s.mijenja;
  const vals = [];
  for (let i = 0; i < 360; i++) {
    const k = [...k0];
    k[m] = i / 2;
    vals.push([i / 2, konacni(k)]);
  }
  const max = Math.max(...vals.map((v) => v[1]));
  const ok =
    s.cilj?.intenzitet === 0
      ? (v) => v[1] < 1e-9
      : (v) => v[1] > max - 1e-9 && max > 0;
  return vals.filter(ok).map((v) => v[0]);
}
const blizuRjesenja = (s, k, rj = rjesenjaFiltri(s)) =>
  rj.some((x) => razlikaOsi(x, k) <= TOL_FILTAR);

export const FILTRI_SIRINA = 360;
export const FILTRI_VISINA = 230;
// Geometrija: izvor lijevo, filtri jednako razmaknuti, zastor desno; iznad svakog dijela zrake krug
// „gledano uzduž zrake“. skrivenoOd: indeks filtra iza kojeg se ishod ne smije vidjeti (postavi prije provjere);
// iznos njegove osi tada se ne piše.
export function scenaFiltri(s, kutovi = kutoviFiltara(s), skrivenoOd = null) {
  const N = kutovi.length;
  const Y = 138;
  const X0 = 44;
  const XE = 326;
  const R = 38;
  const I = intenziteti(kutovi);
  const xs = kutovi.map((_, i) =>
    r2(X0 + 14 + ((XE - X0 - 14) * (i + 1)) / (N + 1)),
  );
  const granice = [X0 + 16, ...xs, XE];
  const segmenti = [];
  for (let i = 0; i <= N; i++) {
    const skriven = skrivenoOd != null && i > skrivenoOd;
    segmenti.push({
      od: granice[i],
      do: granice[i + 1],
      y: Y,
      intenzitet: i === 0 ? 1 : I[i - 1],
      polarizacija: i === 0 ? null : normOs(kutovi[i - 1]),
      skriven,
      krug: {
        x: r2((granice[i] + granice[i + 1]) / 2),
        y: 34,
        r: 17,
        strelice: skriven
          ? []
          : strelicePolarizacije(
              i === 0 ? null : kutovi[i - 1],
              i === 0 ? 1 : Math.sqrt(I[i - 1] / 0.5),
            ),
      },
    });
  }
  return {
    sirina: FILTRI_SIRINA,
    visina: FILTRI_VISINA,
    izvor: {
      x: X0 - 6,
      y: Y,
      vrsta: s.izvor ?? "zarulja",
      naziv: IZVORI[s.izvor ?? "zarulja"],
    },
    filtri: kutovi.map((k, i) => ({
      indeks: i,
      x: xs[i],
      y: Y,
      r: R,
      kut: normOs(k),
      // os filtra koji učenik okreće (postavi prije provjere): uz os drugog filtra odala bi kut između osi
      osSkrivena: skrivenoOd != null && i === skrivenoOd,
      ...disk([xs[i], Y], R, k),
    })),
    segmenti,
    zastor: {
      x: XE,
      y: Y,
      svjetlina: skrivenoOd != null ? null : I[N - 1],
    },
  };
}
// valovi na zraci za trenutak faza (0–1)
export function valoviFiltri(scena, faza) {
  return scena.segmenti
    .filter((g) => !g.skriven)
    .flatMap((g) =>
      valCrte(
        g.od + 2,
        g.do - 2,
        g.y,
        g.polarizacija,
        g.polarizacija == null ? 13 : 17 * Math.sqrt(g.intenzitet / 0.5),
        faza,
      ),
    );
}
export const postotak = (I) =>
  `${formatNumber(Math.round(I * 1000) / 10, 1)} %`;

function checkFiltri(s, odgovor) {
  if (!isNum(odgovor))
    return {
      tocno: false,
      poruka: "Okreni filtar: povuci ručku na rubu.",
      prazno: true,
    };
  const rj = rjesenjaFiltri(s);
  if (blizuRjesenja(s, odgovor, rj)) return { tocno: true };
  const hit = (s.krivo ?? []).find(
    (k) => razlikaOsi(k.vrijednost, odgovor) <= TOL_FILTAR,
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const kutovi = kutoviFiltara(s);
  kutovi[s.mijenja] = normOs(odgovor);
  const I = konacni(kutovi);
  const N = kutovi.length;
  if (s.cilj.intenzitet === 0) {
    if (N === 2) {
      const d = Math.round(razlikaOsi(kutovi[0], kutovi[1]));
      if (d <= TOL_FILTAR)
        return {
          tocno: false,
          poruka:
            "Osi filtara su **paralelne**: drugi filtar propušta isto titranje koje je prošlo kroz prvi, pa prolazi sva ta svjetlost. Mrak je tek kad drugi filtar propušta samo titranje kojega iza prvog **uopće nema**.",
        };
      return {
        tocno: false,
        poruka: `Iza filtra još ima svjetlosti: osi zatvaraju ${d}°, pa drugi filtar propušta dio titranja koje je prošlo kroz prvi. Mrak je tek kad drugi filtar propušta samo titranje kojega iza prvog **uopće nema**.`,
      };
    }
    return {
      tocno: false,
      poruka:
        "Iza zadnjeg filtra još ima svjetlosti. Pogledaj krugove iznad zrake: u kojem smjeru titra svjetlost prije tog filtra, a koji smjer on propušta?",
    };
  }
  if (I === 0)
    return {
      tocno: false,
      poruka:
        "Sad je iza filtra **mrak**: filtar propušta samo titranje kojega u svjetlosti ispred njega nema. Najviše prolazi kad filtar propušta upravo smjer u kojem svjetlost titra.",
    };
  return {
    tocno: false,
    poruka:
      "Prolazi dio svjetlosti, ali može i više. Najviše prolazi kad filtar propušta upravo smjer u kojem svjetlost ispred njega titra.",
  };
}

// ── scena prorez ────────────────────────────────────────────────────────────────────────────────────
export const valoviProreza = (s) =>
  Array.isArray(s.valovi) ? s.valovi : VALOVI;
export const titranjeUzeta = (s) =>
  isNum(s.titranje) ? normOs(s.titranje) : 0;
// udio amplitude užeta iza proreza (komponenta titranja duž proreza), s predznakom
export const prolazUzeta = (titranje, prorez) =>
  Math.cos(rad(titranje - prorez));
export function prolaziProrez(s, prorez) {
  const a = Math.abs(prolazUzeta(titranjeUzeta(s), prorez));
  return {
    uze: a > 0.999 ? "da" : a < 0.01 ? "ne" : "djelomicno",
    zvuk: "da",
  };
}
export const OPCIJE_PROREZ = [
  { kljuc: "uze", tekst: "samo uže" },
  { kljuc: "zvuk", tekst: "samo zvuk" },
  { kljuc: "oba", tekst: "oba vala" },
  { kljuc: "nijedan", tekst: "nijedan" },
];
export function tocnaOpcijaProrez(s) {
  return prolaziProrez(s, s.prorez ?? 0).uze === "da" ? "oba" : "zvuk";
}
export const PROREZ_SIRINA = 360;
export const PROREZ_VISINA = 290;
// Geometrija: dvije staze (uže gore, zvuk dolje), u svakoj ograda s prorezom pod istim kutom.
export function scenaProrez(s, prorez = s.prorez ?? 0, skriveno = false) {
  const XF = 196;
  const staze = valoviProreza(s).map((v, i, arr) => {
    const y = arr.length === 1 ? 150 : i === 0 ? 84 : 222;
    const c = [XF, y];
    const ploca = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([a, b]) => {
      const gore = smjerOsi(0);
      const dub = smjerOsi(90);
      return [
        r2(c[0] + gore[0] * 42 * a + dub[0] * 38 * b),
        r2(c[1] + gore[1] * 42 * a + dub[1] * 38 * b),
      ];
    });
    const os = smjerOsi(prorez);
    const pop = smjerOsi(prorez + 90);
    const L = 33;
    const w = 5;
    const otvor = [
      [L, w],
      [L, -w],
      [-L, -w],
      [-L, w],
    ].map(([a, b]) => [
      r2(c[0] + os[0] * a + pop[0] * b),
      r2(c[1] + os[1] * a + pop[1] * b),
    ]);
    return {
      val: v,
      y,
      ograda: { x: XF, ploca, otvor },
      naziv:
        v === "uze"
          ? "uže: transverzalni val"
          : `zvuk (${IZVORI_ZVUKA[s.izvor_zvuka ?? "zvucnik"]}): longitudinalni val`,
      prolazi: skriveno
        ? null
        : v === "uze"
          ? prolaziProrez(s, prorez).uze
          : "da",
    };
  });
  return {
    sirina: PROREZ_SIRINA,
    visina: PROREZ_VISINA,
    xOgrade: XF,
    staze,
    prorez: normOs(prorez),
  };
}
// uže kao izlomljena crta (prije i iza ograde) i čestice zraka za zvuk, u trenutku faza
export function valoviProrez(s, scena, faza, skriveno = false) {
  const t = titranjeUzeta(s);
  return scena.staze.map((st) => {
    const XF = st.ograda.x;
    if (st.val === "uze") {
      const A = 18;
      const iza = prolazUzeta(t, scena.prorez);
      const prije = valCrte(30, XF, st.y, t, A, faza, 30)[0]?.tocke ?? [];
      const poslije = skriveno
        ? []
        : Math.abs(iza) < 0.01
          ? [
              [XF, st.y],
              [338, st.y],
            ]
          : (valCrte(
              XF,
              338,
              st.y,
              scena.prorez,
              A * Math.abs(iza),
              faza + (iza < 0 ? 0.5 : 0),
              30,
            )[0]?.tocke ?? []);
      return { val: "uze", prije, poslije };
    }
    const cestice = [];
    const A = 4.5;
    for (let red = -2; red <= 2; red++) {
      const dub = smjerOsi(90);
      for (let x0 = 34; x0 <= 338; x0 += 7) {
        if (skriveno && x0 > XF) continue;
        const u =
          A *
          Math.sin(2 * Math.PI * ((x0 - 30) / (VALNA_DULJINA * 1.4) - faza));
        cestice.push([
          r2(x0 + u + dub[0] * red * 14),
          r2(st.y + red * 3 + dub[1] * red * 14),
        ]);
      }
    }
    return { val: "zvuk", cestice };
  });
}

function checkProrez(s, odgovor) {
  const ok = OPCIJE_PROREZ.map((o) => o.kljuc);
  if (!ok.includes(odgovor))
    return { tocno: false, poruka: "Odaberi jedan odgovor.", prazno: true };
  const tocna = tocnaOpcijaProrez(s);
  if (odgovor === tocna) return { tocno: true };
  const zvukProlazi =
    "Zvuk prolazi kako god okrenuo prorez: čestice zraka titraju naprijed-natrag, **u smjeru širenja**, pa nema titranja poprijeko koje bi prorez mogao zaustaviti.";
  if (tocna === "zvuk") {
    if (odgovor === "uze")
      return {
        tocno: false,
        poruka: `Obrnuto. Uže titra **poprijeko**, a prorez je okomit na to titranje, pa ga zaustavi. ${zvukProlazi}`,
      };
    if (odgovor === "oba")
      return {
        tocno: false,
        poruka:
          "Zvuk prolazi, ali uže ne: uže titra poprijeko, a prorez propušta samo titranje u svom smjeru, okomito na titranje užeta.",
      };
    return { tocno: false, poruka: zvukProlazi };
  }
  if (odgovor === "zvuk")
    return {
      tocno: false,
      poruka: "Uže titra baš u smjeru proreza, pa i ono prolazi.",
    };
  if (odgovor === "uze") return { tocno: false, poruka: zvukProlazi };
  return {
    tocno: false,
    poruka: `Prorez je paralelan s titranjem užeta, pa uže prolazi. ${zvukProlazi}`,
  };
}

// ── scena odsjaj ────────────────────────────────────────────────────────────────────────────────────
export const brewster = (n) => deg(Math.atan(n));
export const granicni = (n) => deg(Math.asin(1 / n));
// Fresnelove formule (iz zraka u sredstvo indeksa n): udio odbijene svjetlosti za titranje paralelno s površinom
// (Rs, vodoravno) i u ravnini upada (Rp).
export function fresnel(n, alfa) {
  const a = rad(Math.min(alfa, 89.999));
  const sinB = Math.sin(a) / n;
  const b = Math.asin(sinB);
  const ci = Math.cos(a);
  const ct = Math.cos(b);
  const rs = (ci - n * ct) / (ci + n * ct);
  const rp = (n * ci - ct) / (n * ci + ct);
  return { Rs: rs * rs, Rp: rp * rp, beta: deg(b) };
}
export function kutOdsjaja(s) {
  if (isNum(s.kut)) return s.kut;
  if (s.nacin === "istrazi" || s.cilj?.velicina === "upadni_kut") return 30;
  return brewster(s.n);
}
export function stanjeOdsjaja(n, alfa) {
  const { Rs, Rp, beta } = fresnel(n, alfa);
  const P = Rs + Rp > 0 ? (Rs - Rp) / (Rs + Rp) : 0;
  const potpuno = Math.abs(alfa - brewster(n)) <= TOL_KUT + 1e-9;
  const stanje = potpuno
    ? "potpuno polariziran"
    : alfa < 0.5
      ? "nepolariziran"
      : "djelomično polariziran";
  return {
    alfa,
    beta,
    gama: 180 - alfa - beta, // kut između odbijene i lomljene zrake
    Rs,
    Rp,
    R: (Rs + Rp) / 2,
    P,
    potpuno,
    stanje,
  };
}
// udio odsjaja koji prođe kroz naočale s osi theta (od uspravnog): vodoravno titranje · sin², ostalo · cos²
export function krozNaocale(n, alfa, theta) {
  const { Rs, Rp } = fresnel(n, alfa);
  const t = rad(theta);
  return (Rs * Math.sin(t) ** 2 + Rp * Math.cos(t) ** 2) / (Rs + Rp);
}

export const ODSJAJ_SIRINA = 360;
export const ODSJAJ_VISINA = 262;
// Geometrija scene odsjaj: površina, normala, tri zrake, lukovi kutova, krugovi polarizacije, oko.
// skriveno: polarizacija, β i kut između zraka se ne crtaju (postavi/odaberi/izracunaj prije provjere).
export function scenaOdsjaj(s, alfa = kutOdsjaja(s), skriveno = false) {
  const n = s.n;
  const st = stanjeOdsjaja(n, alfa);
  const P = [178, 150];
  const LG = 138;
  const LD = 100;
  const a = rad(alfa);
  const b = rad(st.beta);
  const kraj = (L, sx, sy) => [r2(P[0] + L * sx), r2(P[1] + L * sy)];
  const upadna = { od: kraj(LG, -Math.sin(a), -Math.cos(a)), do: P };
  const odbijena = { od: P, do: kraj(LG, Math.sin(a), -Math.cos(a)) };
  const lomljena = { od: P, do: kraj(LD, Math.sin(b), Math.cos(b)) };
  // luk od smjera u1 do u2 (kutovi u SVG-u, ° od +x u smjeru kazaljke), polumjer r
  const luk = (u1, u2, r, oznaka) => {
    const p1 = [
      r2(P[0] + r * Math.cos(rad(u1))),
      r2(P[1] + r * Math.sin(rad(u1))),
    ];
    const p2 = [
      r2(P[0] + r * Math.cos(rad(u2))),
      r2(P[1] + r * Math.sin(rad(u2))),
    ];
    const um = (u1 + u2) / 2;
    const rl = r + 11;
    return {
      od: p1,
      do: p2,
      r,
      veliki: Math.abs(u2 - u1) > 180,
      smjer: u2 > u1 ? 1 : 0,
      oznaka,
      tekst: [
        r2(P[0] + rl * Math.cos(rad(um))),
        r2(P[1] + rl * Math.sin(rad(um)) + 4),
      ],
    };
  };
  const lukovi = [];
  if (alfa >= 3) {
    lukovi.push(luk(-90 - alfa, -90, 34, "α"));
    lukovi.push(luk(-90, -90 + alfa, 34, "α'"));
  }
  if (!skriveno && st.beta >= 3) lukovi.push(luk(90 - st.beta, 90, 30, "β"));
  const gama = skriveno
    ? null
    : {
        ...luk(-90 + alfa, 90 - st.beta, 18, kutTekst(st.gama)),
        pravi: st.potpuno,
        // oznaka pravog kuta: mali kvadrat uz vrh
        kvadrat: st.potpuno
          ? [
              P,
              [r2(P[0] + 12 * Math.sin(a)), r2(P[1] - 12 * Math.cos(a))],
              [
                r2(P[0] + 12 * Math.sin(a) + 12 * Math.sin(b)),
                r2(P[1] - 12 * Math.cos(a) + 12 * Math.cos(b)),
              ],
              [r2(P[0] + 12 * Math.sin(b)), r2(P[1] + 12 * Math.cos(b))],
            ]
          : null,
      };
  const na = (zr, f) => [
    r2(zr.od[0] + (zr.do[0] - zr.od[0]) * f),
    r2(zr.od[1] + (zr.do[1] - zr.od[1]) * f),
  ];
  // amplitude (krug „gledano uzduž zrake“): vodoravno (s) i u ravnini upada (p), normirano na veću
  const amp = (x, y) => {
    const m = Math.max(Math.sqrt(x), Math.sqrt(y), 1e-9);
    return { s: Math.sqrt(x) / m, p: Math.sqrt(y) / m };
  };
  const krug = (pozicija, a2, nepol = false) => ({
    x: pozicija[0],
    y: pozicija[1],
    r: 15,
    nepolarizirano: nepol,
    vodoravno: r2(a2.s),
    uspravno: r2(a2.p),
  });
  const krugovi = skriveno
    ? [krug(na(upadna, 0.42), { s: 1, p: 1 }, true)]
    : [
        krug(na(upadna, 0.42), { s: 1, p: 1 }, true),
        krug(na(odbijena, 0.62), amp(st.Rs, st.Rp), alfa < 0.5),
        krug(na(lomljena, 0.72), amp(1 - st.Rs, 1 - st.Rp)),
      ];
  return {
    sirina: ODSJAJ_SIRINA,
    visina: ODSJAJ_VISINA,
    povrsinaY: P[1],
    tocka: P,
    normala: { od: [P[0], 22], do: [P[0], 246] },
    zrake: {
      upadna: { ...upadna, jakost: 1 },
      odbijena: {
        ...odbijena,
        jakost: r2(0.3 + 0.7 * Math.sqrt(Math.min(1, st.R / 0.2))),
      },
      lomljena: { ...lomljena, jakost: r2(0.35 + 0.65 * (1 - st.R)) },
    },
    sunce: upadna.od,
    oko: odbijena.do,
    lukovi,
    gama,
    krugovi,
    stanje: skriveno ? null : st,
  };
}
// točke koje putuju zrakom (svjetlost u sredstvu sporija za faktor n), faza 0–1
export function tockeNaZrakama(scena, n, faza) {
  const out = [];
  const zr = scena.zrake;
  const korak = 26;
  for (const [ime, z] of Object.entries(zr)) {
    const dx = z.do[0] - z.od[0];
    const dy = z.do[1] - z.od[1];
    const L = Math.hypot(dx, dy);
    if (L < 1) continue;
    const k = ime === "lomljena" ? korak / n : korak;
    const pocetak = ((faza * korak) / (ime === "lomljena" ? n : 1)) % k;
    for (let d = pocetak; d < L; d += k)
      out.push({
        zraka: ime,
        x: r2(z.od[0] + (dx * d) / L),
        y: r2(z.od[1] + (dy * d) / L),
        jakost: z.jakost,
      });
  }
  return out;
}

export const OPCIJE_ODSJAJ = [
  { kljuc: "upadna", tekst: "upadna (sunčeva) zraka" },
  { kljuc: "odbijena", tekst: "odbijena zraka (odsjaj)" },
  { kljuc: "lomljena", tekst: "lomljena zraka (u sredstvu)" },
];

const nazivSredstva = (s) => (isText(s.povrsina) ? s.povrsina : "sredstvo");

// izracunaj: točan iznos i tipične krive vrijednosti
export function izracunOdsjaja(s) {
  const n = s.n;
  const aB = brewster(n);
  const p = s.pitaj;
  if (p === "beta_B")
    return {
      oznaka: "$\\beta$",
      naziv: "kut loma pri Brewsterovu kutu",
      vrijednost: 90 - aB,
      krivo: [
        {
          vrijednost: aB,
          poruka:
            "To je upadni (Brewsterov) kut. Lomni kut β je kut lomljene zrake od normale, u sredstvu.",
        },
        {
          vrijednost: granicni(n),
          poruka:
            "To je granični kut totalne refleksije (sin⁻¹(1/n)), a ne lomni kut. Prvo izračunaj $\\alpha_B$ iz $\\text{tg}\\,\\alpha_B = n$.",
        },
        {
          vrijednost: aB / n,
          poruka:
            "Ne dijeli se kut s n: Snellov zakon dijeli sinuse, sin α / sin β = n. Ili iskoristi da odbijena i lomljena zraka zatvaraju 90°.",
        },
      ],
    };
  if (p === "kut_zraka")
    return {
      oznaka: "$\\gamma$",
      naziv: "kut između odbijene i lomljene zrake",
      vrijednost: 90,
      krivo: [
        {
          vrijednost: 2 * aB,
          poruka:
            "To je kut između upadne i odbijene zrake (α + α'). Traži se kut između **odbijene** i **lomljene**.",
        },
        {
          vrijednost: aB,
          poruka:
            "To je Brewsterov kut, kut zrake od normale. Traži se kut između odbijene i lomljene zrake.",
        },
        {
          vrijednost: 180 - aB,
          poruka:
            "Od 180° oduzmi oba kuta uz normalu: α' (odbijena) i β (lomljena).",
        },
      ],
    };
  return {
    oznaka: "$\\alpha_B$",
    naziv: "Brewsterov kut",
    vrijednost: aB,
    krivo: [
      {
        vrijednost: 90 - aB,
        poruka:
          "To je kut prema **površini** ($90° - \\alpha_B$), odnosno tg⁻¹(1/n). Brewsterov kut mjeri se od **okomice** (normale): $\\text{tg}\\,\\alpha_B = n$.",
      },
      {
        vrijednost: granicni(n),
        poruka:
          "To je sin⁻¹(1/n), **granični kut** totalne refleksije. Za Brewsterov kut vrijedi $\\text{tg}\\,\\alpha_B = n$, pa treba **tg⁻¹**.",
      },
      {
        vrijednost: deg(Math.acos(1 / n)),
        poruka:
          "To je cos⁻¹(1/n). Za Brewsterov kut vrijedi $\\text{tg}\\,\\alpha_B = n$, pa treba **tg⁻¹(n)**.",
      },
      {
        vrijednost: Math.atan(n),
        poruka:
          "Kalkulator je u radijanima (RAD). Prebaci ga u stupnjeve (DEG) i ponovi tg⁻¹.",
      },
      {
        vrijednost: Math.tan(rad(n)),
        poruka:
          "Izračunao si tg(n). Treba obrnuto: kut kojemu je tangens jednak n, dakle **tg⁻¹(n)**.",
      },
      {
        vrijednost: Math.tan(n),
        poruka:
          "Izračunao si tg(n) (i to u radijanima). Treba kut kojemu je tangens jednak n: **tg⁻¹(n)**, kalkulator u DEG.",
      },
    ],
  };
}
const tolIzracun = (s) => (isNum(s.tolerancija) ? s.tolerancija : TOL_IZRACUN);

// postavi (upadni kut): tipične krive vrijednosti kuta
function krivoUpadni(n) {
  return [
    {
      vrijednost: 90 - brewster(n),
      poruka:
        "To je kut prema **površini** ($90° - \\alpha_B$). Upadni kut mjeri se od okomice na površinu (normale).",
    },
    {
      vrijednost: granicni(n),
      poruka:
        "To je **granični kut** totalne refleksije, sin⁻¹(1/n). Za Brewsterov kut vrijedi $\\text{tg}\\,\\alpha_B = n$, pa treba tg⁻¹.",
    },
    {
      vrijednost: deg(Math.acos(1 / n)),
      poruka:
        "To je cos⁻¹(1/n). Za Brewsterov kut vrijedi $\\text{tg}\\,\\alpha_B = n$, pa treba tg⁻¹(n).",
    },
  ];
}

function checkOdsjaj(s, odgovor) {
  const n = s.n;
  if (s.nacin === "izracunaj") {
    const r = izracunOdsjaja(s);
    const t = tolIzracun(s);
    return checkNumber({
      input: odgovor,
      answer: r.vrijednost,
      tol: t,
      unit: "°",
      krivo: [
        ...(s.krivo ?? []),
        ...r.krivo
          .filter((k) => Math.abs(k.vrijednost - r.vrijednost) > 2 * t)
          .map((k) => ({
            ...k,
            tolerancija: Math.max(t, Math.abs(k.vrijednost) * 0.01),
          })),
      ],
      savjet:
        "Nije točno. Brewsterov kut: $\\text{tg}\\,\\alpha_B = n$ (kut se mjeri od okomice na površinu).",
    });
  }
  if (s.nacin === "odaberi") {
    if (!OPCIJE_ODSJAJ.some((o) => o.kljuc === odgovor))
      return { tocno: false, poruka: "Odaberi jednu zraku.", prazno: true };
    if (odgovor === "odbijena") return { tocno: true };
    if (odgovor === "upadna")
      return {
        tocno: false,
        poruka:
          "Sunčeva svjetlost je **nepolarizirana**: titra u svim smjerovima jednako. Polarizira se tek pri odbijanju.",
      };
    return {
      tocno: false,
      poruka: `Svjetlost koja uđe u ${nazivSredstva(s)} samo je **djelomično** polarizirana: u njoj ima i vodoravnog titranja. Potpuno polariziran može biti samo odsjaj, i to pod Brewsterovim kutom.`,
    };
  }
  if (s.nacin === "postavi" && s.cilj?.velicina === "naocale") {
    if (!isNum(odgovor))
      return {
        tocno: false,
        poruka: "Okreni naočale: povuci ručku na rubu stakla.",
        prazno: true,
      };
    if (razlikaOsi(odgovor, 0) <= TOL_NAOCALE) return { tocno: true };
    const hit = (s.krivo ?? []).find(
      (k) => razlikaOsi(k.vrijednost, odgovor) <= TOL_NAOCALE,
    );
    if (hit) return { tocno: false, poruka: hit.poruka };
    if (razlikaOsi(odgovor, 90) <= TOL_NAOCALE)
      return {
        tocno: false,
        poruka:
          "Vodoravne naočale propuštaju upravo **vodoravno** titranje, a odsjaj titra baš tako: vidiš ga punim sjajem.",
      };
    return {
      tocno: false,
      poruka:
        "Ukoso okrenute naočale propuštaju dio vodoravnog titranja, pa se odsjaj još vidi. Odsjaj titra vodoravno: naočale moraju propuštati samo titranje **okomito** na to.",
    };
  }
  if (s.nacin === "postavi") {
    if (!isNum(odgovor))
      return {
        tocno: false,
        poruka: "Namjesti upadni kut klizačem.",
        prazno: true,
      };
    const aB = brewster(n);
    if (Math.abs(odgovor - aB) <= TOL_KUT + 1e-9) return { tocno: true };
    const hit = [...(s.krivo ?? []), ...krivoUpadni(n)].find(
      (k) => Math.abs(k.vrijednost - odgovor) <= 0.5,
    );
    if (hit) return { tocno: false, poruka: hit.poruka };
    return {
      tocno: false,
      poruka: `Pri ${kutTekst(odgovor)} odsjaj je tek **djelomično** polariziran (pogledaj krug na odbijenoj zraci i kut između odbijene i lomljene zrake). Brewsterov kut izračunaj iz $\\text{tg}\\,\\alpha_B = n$ i mjeri ga od okomice.`,
    };
  }
  return { tocno: false, poruka: "Ovaj korak nema provjeru." };
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Polarizacija svjetlosti (fizika, matura). tekst, scena, nacin. Kutovi osi (filtar, prorez, naočale) mjere se od uspravnog: 0 = uspravno, 90 = vodoravno, višekratnici od 5, u [0, 180). Upadni kut mjeri se od normale. U ODGOVOR načinima ishod (svjetlina iza filtra, polarizacija odsjaja, β, kut između zraka, uže iza proreza) ostaje skriven do provjere.
Scene:
- "filtri": izvor? ("zarulja" | "svijeca" | "lampa" | "svjetiljka" | "sunce"; nepolarizirana svjetlost) → filtri: 1–3 [{kut}] → zastor. Prvi filtar propusti polovinu, svaki sljedeći I·cos²Δ (to se vidi samo kao svjetlina; brojke uz prikazi_postotak: true). Iznad zrake krugovi „gledano uzduž zrake“ (smjer titranja).
  Načini: "istrazi" (mijenja?: indeks ili popis indeksa filtara koji se okreću, zadano svi), "prikaz", "postavi" (mijenja: indeks filtra koji učenik okreće; cilj: {intenzitet: 0} = mrak iza zadnjeg filtra ili {intenzitet: "najvise"}; točno u ±3°, npr. 90° i 270° oba; početni kut ne smije već ispunjavati cilj; ${KRIVO_OPIS}, vrijednost = kut osi).
- "prorez": uže (transverzalni val, ruka ga trese u smjeru titranje?, zadano 0 = gore-dolje) i zvuk (izvor_zvuka?: "zvucnik" | "vilica" | "zvono" | "truba" | "bubanj"; longitudinalni val, čestice zraka) prolaze kroz ogradu s prorezom pod kutom prorez (zadano 0). Uže prolazi kad je prorez paralelan s titranjem, zvuk uvijek. valovi?: ["uze", "zvuk"] (zadano oba).
  Načini: "istrazi" (učenik okreće prorez), "prikaz", "odaberi" (pitaj: "prolazi"; učenik bira: samo uže / samo zvuk / oba / nijedan; prorez mora biti paralelan ili okomit na titranje; treba oba vala).
- "odsjaj": sunčeva zraka pada na površinu (povrsina?: npr. "jezero (voda)", n: 1,2–2,5) pod upadnim kutom kut (°, 0–89). Odbijena i lomljena zraka, lukovi α, α', β i kut između odbijene i lomljene; krugovi polarizacije (Fresnel): odsjaj je nepolariziran pri 0°, djelomično polariziran, a potpuno (samo vodoravno) pri α_B (tg α_B = n), kad odbijena i lomljena zraka zatvaraju 90°. naocale?: kut osi polarizacijskih naočala; tada se vidi i „pogled kroz naočale“ (odsjaj kroz naočale = vodoravni dio·sin² + ostalo·cos²).
  Načini: "istrazi" (klizač upadnog kuta, zadano 30°; naočale se okreću), "prikaz" (kut zadano α_B), "postavi" s cilj {velicina: "upadni_kut", vrijednost: "brewster"} (učenik namjesti kut, ±0,3°; kut = početni, ne α_B; bez naočala; poruke za 90° − α_B, granični kut sin⁻¹(1/n) i cos⁻¹(1/n) dodaju se same; krivo?: [{vrijednost (°), poruka}]) ili {velicina: "naocale", vrijednost: "bez_odsjaja"} (kut = α_B, zadano; naocale = početna os, nije uspravna; točno uspravno ±5°), "odaberi" (pitaj: "potpuno_polarizirana": učenik bira upadnu, odbijenu ili lomljenu zraku; kut = α_B), "izracunaj" (pitaj: "alpha_B" | "beta_B" (lomni kut pri α_B) | "kut_zraka" (između odbijene i lomljene); upis u °; tolerancija? zadano 0,2°; tipične greške (90° − α_B, sin⁻¹ i cos⁻¹ umjesto tg⁻¹, RAD, tg(n)…) dodaje aplikacija; ${KRIVO_OPIS}).`;

const PRIMJER = {
  tip: TIP,
  scena: "filtri",
  nacin: "postavi",
  izvor: "zarulja",
  filtri: [{ kut: 0 }, { kut: 30 }],
  mijenja: 1,
  cilj: { intenzitet: 0 },
  tekst:
    "Svjetlost žarulje prolazi kroz dva polarizacijska filtra. **Okreni drugi filtar** tako da iza njega bude potpuni mrak.",
};

const PRIMJERI = [
  {
    tip: TIP,
    scena: "filtri",
    nacin: "istrazi",
    izvor: "svijeca",
    filtri: [{ kut: 0 }, { kut: 0 }],
    mijenja: 1,
    tekst:
      "Svjetlost svijeće prolazi kroz dva polarizacijska filtra. **Okreći drugi filtar** i prati svjetlinu iza njega i krugove iznad zrake (smjer titranja gledan uzduž zrake).",
  },
  {
    tip: TIP,
    scena: "filtri",
    nacin: "istrazi",
    izvor: "sunce",
    filtri: [{ kut: 0 }, { kut: 45 }, { kut: 90 }],
    prikazi_postotak: true,
    tekst:
      "Iznenađenje: prvi i zadnji filtar su okomiti, a ipak nešto prolazi. **Okreći srednji filtar** i gledaj što se događa iza zadnjeg.",
  },
  {
    tip: TIP,
    scena: "prorez",
    nacin: "istrazi",
    izvor_zvuka: "zvucnik",
    prorez: 0,
    tekst:
      "Uže tresemo gore-dolje, a zvučnik šalje zvuk. **Okreći prorez** i usporedi koji val prolazi.",
  },
  {
    tip: TIP,
    scena: "prorez",
    nacin: "odaberi",
    izvor_zvuka: "vilica",
    prorez: 90,
    pitaj: "prolazi",
    tekst:
      "Uže tresemo gore-dolje, a glazbena vilica titra. Prorez je **vodoravan**. Koji val prolazi kroz prorez?",
  },
  {
    tip: TIP,
    scena: "odsjaj",
    nacin: "istrazi",
    povrsina: "jezero (voda)",
    n: 1.33,
    kut: 30,
    naocale: 90,
    tekst:
      "Sunčeva svjetlost odbija se od jezera. **Mijenjaj upadni kut** i prati krug na odbijenoj zraci; **okreći naočale** i gledaj odsjaj kroz njih.",
  },
  {
    tip: TIP,
    scena: "odsjaj",
    nacin: "postavi",
    povrsina: "jezero (voda)",
    n: 1.33,
    kut: 30,
    cilj: { velicina: "upadni_kut", vrijednost: "brewster" },
    tekst:
      "Indeks loma vode je 1,33. Izračunaj Brewsterov kut i **namjesti sunčevu zraku** na njega, tako da odsjaj bude potpuno polariziran.",
  },
  {
    tip: TIP,
    scena: "odsjaj",
    nacin: "postavi",
    povrsina: "jezero (voda)",
    n: 1.33,
    naocale: 90,
    cilj: { velicina: "naocale", vrijednost: "bez_odsjaja" },
    tekst:
      "Sunce je pod Brewsterovim kutom, pa je odsjaj s jezera potpuno polariziran. **Okreni os naočala** tako da odsjaj nestane.",
  },
  {
    tip: TIP,
    scena: "odsjaj",
    nacin: "odaberi",
    povrsina: "stakleni stol",
    n: 1.5,
    pitaj: "potpuno_polarizirana",
    tekst:
      "Sunčeva svjetlost pada na stakleni stol (n = 1,5) pod Brewsterovim kutom. Koja je zraka **potpuno** polarizirana?",
  },
  {
    tip: TIP,
    scena: "odsjaj",
    nacin: "izracunaj",
    povrsina: "zaleđeno klizalište (led)",
    n: 1.31,
    pitaj: "alpha_B",
    tekst:
      "Sunčeva svjetlost odbija se od zaleđenog klizališta (indeks loma leda 1,31). Pod kojim je upadnim kutom odsjaj potpuno polariziran?",
  },
  {
    tip: TIP,
    scena: "odsjaj",
    nacin: "izracunaj",
    povrsina: "plastični stol",
    n: 1.58,
    pitaj: "kut_zraka",
    tekst:
      "Svjetlost pada na plastični stol (n = 1,58) pod Brewsterovim kutom. Koliki kut zatvaraju odbijena i lomljena zraka?",
  },
  {
    tip: TIP,
    scena: "odsjaj",
    nacin: "prikaz",
    povrsina: "lakirani stol",
    n: 1.55,
    tekst:
      "Odsjaj pod Brewsterovim kutom: odbijena zraka titra samo vodoravno, a odbijena i lomljena zraka zatvaraju 90°.",
  },
];

// ── validacija ──────────────────────────────────────────────────────────────────────────────────────
function validateFiltri(s, need) {
  if (s.izvor != null)
    need(
      IZVORI[s.izvor] != null,
      `izvor mora biti jedan od: ${Object.keys(IZVORI).join(", ")}`,
    );
  if (
    !need(
      Array.isArray(s.filtri) && s.filtri.length >= 1 && s.filtri.length <= 3,
      "filtri mora biti popis od 1 do 3 filtra [{kut}]",
    )
  )
    return;
  let ispravni = true;
  s.filtri.forEach((f, i) => {
    ispravni =
      need(
        f &&
          typeof f === "object" &&
          naMrezi(f.kut, KORAK_FILTRA) &&
          f.kut >= 0 &&
          f.kut < 180,
        `filtri[${i}].kut mora biti kut osi od uspravnog u [0, 180), višekratnik od 5`,
      ) && ispravni;
    if (f && typeof f === "object")
      need(
        Object.keys(f).every((k) => k === "kut"),
        `filtri[${i}] smije imati samo „kut“`,
      );
  });
  if (s.prikazi_postotak != null)
    need(
      typeof s.prikazi_postotak === "boolean",
      "prikazi_postotak mora biti true ili false",
    );
  const indeks = (m) => Number.isInteger(m) && m >= 0 && m < s.filtri.length;
  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    if (s.mijenja != null)
      need(
        indeks(s.mijenja) ||
          (Array.isArray(s.mijenja) &&
            s.mijenja.length >= 1 &&
            s.mijenja.every(indeks) &&
            new Set(s.mijenja).size === s.mijenja.length),
        "mijenja mora biti indeks filtra (od 0) ili popis različitih indeksa",
      );
  }
  if (s.nacin === "prikaz") {
    noAnswerFields(s, need);
    need(s.mijenja == null, "prikaz se ne dira: bez polja mijenja");
  }
  if (s.nacin === "postavi") {
    need(
      s.filtri.length >= 2,
      "postavi treba barem 2 filtra (iza jednog filtra uvijek prolazi polovina)",
    );
    const okM = need(
      indeks(s.mijenja),
      "postavi treba mijenja: indeks filtra (od 0) koji učenik okreće",
    );
    const okC = need(
      s.cilj &&
        typeof s.cilj === "object" &&
        (s.cilj.intenzitet === 0 || s.cilj.intenzitet === "najvise") &&
        Object.keys(s.cilj).length === 1,
      'cilj mora biti {intenzitet: 0} (mrak) ili {intenzitet: "najvise"}',
    );
    if (okM && okC && ispravni && s.filtri.length >= 2) {
      const rj = rjesenjaFiltri(s);
      if (
        need(rj.length > 0, "cilj se ne može postići okretanjem tog filtra")
      ) {
        need(
          !blizuRjesenja(s, s.filtri[s.mijenja].kut, rj),
          "početni kut pomičnog filtra već ispunjava cilj: zadaj drugi početni kut",
        );
        need(
          !(s.cilj.intenzitet === "najvise" && rj.length > 6),
          "cilj „najvise“: pomični filtar ne mijenja svjetlinu (ništa se ne može naučiti)",
        );
      }
      validateKrivo(s.krivo, null, 0, need);
      (s.krivo ?? []).forEach(
        (k, i) =>
          isNum(k?.vrijednost) &&
          need(
            !blizuRjesenja(s, k.vrijednost, rj),
            `krivo[${i}].vrijednost ${formatNumber(k.vrijednost)}° ispunjava cilj, a to je točan odgovor`,
          ),
      );
    }
  } else
    need(s.cilj == null && s.krivo == null, `${s.nacin} nema cilj ni krivo`);
}

function validateProrez(s, need) {
  for (const [ime, opis] of [
    ["prorez", "kut proreza"],
    ["titranje", "smjer titranja užeta"],
  ])
    if (s[ime] != null)
      need(
        naMrezi(s[ime], KORAK_FILTRA) && s[ime] >= 0 && s[ime] < 180,
        `${ime} (${opis}) mora biti kut od uspravnog u [0, 180), višekratnik od 5`,
      );
  if (s.izvor_zvuka != null)
    need(
      IZVORI_ZVUKA[s.izvor_zvuka] != null,
      `izvor_zvuka mora biti jedan od: ${Object.keys(IZVORI_ZVUKA).join(", ")}`,
    );
  if (s.valovi != null)
    need(
      Array.isArray(s.valovi) &&
        s.valovi.length >= 1 &&
        s.valovi.every((v) => VALOVI.includes(v)) &&
        new Set(s.valovi).size === s.valovi.length,
      'valovi mora biti popis od: "uze", "zvuk"',
    );
  if (s.nacin === "odaberi") {
    need(s.pitaj === "prolazi", 'odaberi treba pitaj: "prolazi"');
    need(
      s.valovi == null || s.valovi.length === 2,
      "odaberi treba oba vala (uže i zvuk)",
    );
    const d = razlikaOsi(titranjeUzeta(s), s.prorez ?? 0);
    need(
      d < 1e-9 || Math.abs(d - 90) < 1e-9,
      "odaberi: prorez mora biti paralelan ili okomit na titranje užeta",
    );
    need(
      s.cilj == null && s.krivo == null,
      "odaberi nema cilj ni krivo (poruke daje aplikacija)",
    );
  } else {
    noAnswerFields(s, need);
    need(s.pitaj == null, `${s.nacin} nema pitaj`);
  }
}

function validateOdsjaj(s, need) {
  if (
    !need(
      isNum(s.n) && s.n >= 1.2 && s.n <= 2.5,
      "n (indeks loma površine) mora biti broj od 1,2 do 2,5",
    )
  )
    return;
  if (s.povrsina != null)
    need(
      isText(s.povrsina) && s.povrsina.length <= 40,
      "povrsina mora biti kratak tekst (npr. „jezero (voda)“)",
    );
  if (s.kut != null)
    need(
      isNum(s.kut) && s.kut >= 0 && s.kut <= 89,
      "kut (upadni, od normale) mora biti od 0 do 89°",
    );
  if (s.naocale != null)
    need(
      naMrezi(s.naocale, KORAK_FILTRA) && s.naocale >= 0 && s.naocale < 180,
      "naocale (os naočala od uspravnog) mora biti u [0, 180), višekratnik od 5",
    );
  if (s.prikazi_postotak != null)
    need(
      typeof s.prikazi_postotak === "boolean",
      "prikazi_postotak mora biti true ili false",
    );
  const aB = brewster(s.n);
  const kutJeB = !isNum(s.kut) || Math.abs(s.kut - aB) <= TOL_KUT;
  if (s.nacin === "istrazi" || s.nacin === "prikaz") {
    noAnswerFields(s, need);
    need(
      s.pitaj == null && s.tolerancija == null,
      `${s.nacin} nema pitaj ni tolerancija`,
    );
    return;
  }
  if (s.nacin === "postavi") {
    need(
      s.pitaj == null && s.tolerancija == null,
      "postavi nema pitaj ni tolerancija",
    );
    const v = s.cilj?.velicina;
    if (
      !need(
        s.cilj &&
          ((v === "upadni_kut" && s.cilj.vrijednost === "brewster") ||
            (v === "naocale" && s.cilj.vrijednost === "bez_odsjaja")) &&
          Object.keys(s.cilj).length === 2,
        'cilj mora biti {velicina: "upadni_kut", vrijednost: "brewster"} ili {velicina: "naocale", vrijednost: "bez_odsjaja"}',
      )
    )
      return;
    if (v === "upadni_kut") {
      need(
        s.naocale == null,
        "postavi upadni_kut nema naočale (one bi odale kut)",
      );
      need(
        !isNum(s.kut) || Math.abs(s.kut - aB) > 2,
        "početni kut ne smije biti blizu Brewsterova kuta (barem 2° od njega)",
      );
      validateKrivo(s.krivo, aB, TOL_KUT, need);
    } else {
      need(
        isNum(s.naocale),
        "postavi naocale treba naocale: početnu os naočala",
      );
      if (isNum(s.naocale))
        need(
          razlikaOsi(s.naocale, 0) > TOL_NAOCALE,
          "početna os naočala ne smije biti uspravna (to je točan odgovor)",
        );
      need(
        kutJeB,
        `kut mora biti Brewsterov (${kutTekst(aB)}) ili izostavljen: samo tada odsjaj potpuno nestane`,
      );
      validateKrivo(s.krivo, null, 0, need);
      (s.krivo ?? []).forEach(
        (k, i) =>
          isNum(k?.vrijednost) &&
          need(
            razlikaOsi(k.vrijednost, 0) > TOL_NAOCALE,
            `krivo[${i}].vrijednost je uspravno, a to je točan odgovor`,
          ),
      );
    }
    return;
  }
  need(s.cilj == null, `${s.nacin} nema cilj`);
  need(s.naocale == null, `${s.nacin} nema naočale`);
  need(
    kutJeB,
    `${s.nacin}: kut mora biti Brewsterov (${kutTekst(aB)}) ili izostavljen`,
  );
  if (s.nacin === "odaberi") {
    need(
      s.pitaj === "potpuno_polarizirana",
      'odaberi treba pitaj: "potpuno_polarizirana"',
    );
    need(
      s.krivo == null && s.tolerancija == null,
      "odaberi nema krivo ni tolerancija (poruke daje aplikacija)",
    );
  }
  if (s.nacin === "izracunaj") {
    if (
      need(
        ["alpha_B", "beta_B", "kut_zraka"].includes(s.pitaj),
        'izracunaj treba pitaj: "alpha_B", "beta_B" ili "kut_zraka"',
      )
    ) {
      const r = izracunOdsjaja(s);
      if (s.tolerancija != null)
        need(
          isNum(s.tolerancija) && s.tolerancija > 0 && s.tolerancija <= 2,
          "tolerancija mora biti od 0 do 2 (°)",
        );
      validateKrivo(s.krivo, r.vrijednost, tolIzracun(s), need);
    }
  }
}

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const polarizacija = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) =>
    s.nacin === "istrazi" || s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR,
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "polarizacija treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `polarizacija.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return list;
    if (
      !need(
        NACINI[s.scena].includes(s.nacin),
        `scena ${s.scena}: nacin mora biti jedan od: ${NACINI[s.scena].join(", ")}`,
      )
    )
      return list;
    const svaPolja = new Set(Object.values(POLJA).flat());
    for (const f of svaPolja)
      need(
        !(f in s) || POLJA[s.scena].includes(f),
        `polje „${f}“ ne postoji u sceni ${s.scena} (polja scene: ${POLJA[s.scena].join(", ")})`,
      );
    need(
      !("skrij" in s),
      "skrij nije potreban: u načinima s odgovorom ishod je uvijek skriven do provjere",
    );
    if (s.scena === "filtri") validateFiltri(s, need);
    if (s.scena === "prorez") validateProrez(s, need);
    if (s.scena === "odsjaj") validateOdsjaj(s, need);
    return list;
  },
  check(s, odgovor) {
    if (s.scena === "filtri" && s.nacin === "postavi")
      return checkFiltri(s, odgovor);
    if (s.scena === "prorez" && s.nacin === "odaberi")
      return checkProrez(s, odgovor);
    if (s.scena === "odsjaj") return checkOdsjaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.scena === "filtri" && s.nacin === "postavi") {
      const rj = rjesenjaFiltri(s);
      const kutovi = [...new Set(rj.map((x) => Math.round(x)))];
      const ime = `${s.mijenja + 1}. filtra`;
      const opis = (k) =>
        razlikaOsi(k, 0) < 1e-9 || razlikaOsi(k, 90) < 1e-9
          ? `${k}° (${opisOsi(k)})`
          : `${k}°`;
      if (s.cilj.intenzitet === 0 && s.filtri.length === 2)
        return `os ${ime} okomita na os ${s.mijenja === 0 ? 2 : 1}. filtra: ${kutovi.map(opis).join(" ili ")}`;
      return `os ${ime}: ${kutovi.map(opis).join(" ili ")}`;
    }
    if (s.scena === "prorez" && s.nacin === "odaberi")
      return tocnaOpcijaProrez(s) === "oba"
        ? "oba vala: uže titra u smjeru proreza, a zvuk (longitudinalni val) prolazi uvijek"
        : "samo zvuk: longitudinalni val prolazi uvijek, a uže titra okomito na prorez";
    if (s.scena === "odsjaj") {
      if (s.nacin === "izracunaj") {
        const r = izracunOdsjaja(s);
        return `${r.oznaka} = ${kutTekst(r.vrijednost)}`;
      }
      if (s.nacin === "odaberi")
        return "odbijena zraka (odsjaj): titra samo vodoravno";
      if (s.nacin === "postavi" && s.cilj?.velicina === "naocale")
        return "uspravno: naočale propuštaju samo uspravno titranje, a odsjaj titra vodoravno";
      if (s.nacin === "postavi")
        return `$\\alpha_B$ = tg⁻¹(${formatNumber(s.n)}) = ${kutTekst(brewster(s.n))}`;
    }
    return "";
  },
  brojcaniOdgovor(s) {
    if (s?.scena !== "odsjaj" || !isNum(s.n)) return null;
    if (s.nacin === "izracunaj") return izracunOdsjaja(s).vrijednost;
    if (s.nacin === "postavi" && s.cilj?.velicina === "upadni_kut")
      return brewster(s.n);
    return null;
  },
};
