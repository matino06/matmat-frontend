// vektori: strelice na kvadratnoj mreži (zbroj nadovezivanjem, rastav kose sile na komponente, razlika Δv = v₂ − v₁,
// put i pomak) i scena „rad“ (sila pod kutom vuče sanduk: komponenta u smjeru pomaka i predznak rada). Točan
// odgovor i tipične greške računa kod iz zadanih vektora.
import { isNum, near } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
} from "../zajednicko.js";
import {
  rad,
  razlikaKuta,
  kutVektora,
  analizaCilja,
  opisVelicine,
  iznosJed,
  broj,
  formatNumber,
} from "./_sile.js";

const NACINI_MREZA = ["istrazi", "zbroji", "rastavi", "razlika"];
const NACINI_RAD = ["istrazi", "postavi"];
const PRIKAZI = ["iznos", "komponente", "zbroj", "put"];
export const NAJVISE_POLJA = 25; // kvadratića po osi

const tocka = (t) => Array.isArray(t) && t.length === 2 && t.every(isNum);
const okruglo = (x) => Math.round(x * 1e9) / 1e9;
export const duljina = ([x, y]) => Math.hypot(x, y);
const plus = (a, b) => [okruglo(a[0] + b[0]), okruglo(a[1] + b[1])];
const minus = (a, b) => [okruglo(a[0] - b[0]), okruglo(a[1] - b[1])];

// Vektori s krajevima: vektor bez „od“ (osim prvog) nastavlja se na vrh prethodnog (nadovezivanje).
export function krajevi(s) {
  const out = [];
  (s.vektori ?? []).forEach((v, i) => {
    const od = tocka(v.od) ? v.od : i > 0 ? out[i - 1].do : [0, 0];
    const d = tocka(v.do)
      ? minus(v.do, od)
      : [
          okruglo(v.iznos * Math.cos(rad(v.kut))),
          okruglo(v.iznos * Math.sin(rad(v.kut))),
        ];
    out.push({ ...v, od, do: plus(od, d), d });
  });
  return out;
}
export const zbrojVektora = (s) =>
  krajevi(s).reduce((z, v) => plus(z, v.d), [0, 0]);
export const pocetakZbroja = (s) =>
  tocka(s.pocetak) ? s.pocetak : (krajevi(s)[0]?.od ?? [0, 0]);
export const vrhZbroja = (s) => plus(pocetakZbroja(s), zbrojVektora(s));
// razlika: v₁ i v₂ preneseni u zajednički početak; Δv kreće iz vrha v₁
export const pocetakRazlike = (s) =>
  tocka(s.pocetak) ? s.pocetak : (krajevi(s)[0]?.od ?? [0, 0]);
export const deltaV = (s) => {
  const [v1, v2] = krajevi(s);
  return minus(v2.d, v1.d);
};
export const komponente = (s) => krajevi(s)[0].d;
export const korakMreze = (s) => s.mreza.korak;
export const korakVuci = (s) =>
  s.nacin === "rastavi"
    ? s.mreza.korak / 10
    : s.nacin === "razlika"
      ? s.mreza.korak / 2
      : s.mreza.korak;
const naMrezi = (v, k) => Math.abs(v / k - Math.round(v / k)) < 1e-6;
const unutra = (s, [x, y]) =>
  x >= s.mreza.x[0] - 1e-9 &&
  x <= s.mreza.x[1] + 1e-9 &&
  y >= s.mreza.y[0] - 1e-9 &&
  y <= s.mreza.y[1] + 1e-9;
const jed = (s) => (s.scena === "rad" ? "N" : (s.mreza?.jedinica ?? ""));
const tolRastav = (s) => (isNum(s.tolerancija) ? s.tolerancija : 0.04);
const tolRazlika = (s) => (isNum(s.tolerancija) ? s.tolerancija : 0.1);

// ── rad sile ────────────────────────────────────────────────────────────────────────────────────────
export const radVelicine = (s, kut) => {
  const F = s.F;
  const W = F * s.s * Math.cos(rad(kut));
  return {
    kut,
    W: Math.abs(W) < 1e-9 ? 0 : W,
    F_s: Math.abs(W) < 1e-9 ? 0 : F * Math.cos(rad(kut)),
    F_n: F * Math.sin(rad(kut)),
  };
};
export const RAD_META = {
  W: { naziv: "rad sile", oznaka: "W", jedinica: "J" },
  F_s: {
    naziv: "komponenta sile u smjeru pomaka",
    oznaka: "F_s",
    jedinica: "N",
  },
  F_n: {
    naziv: "komponenta sile okomito na pomak",
    oznaka: "F_⊥",
    jedinica: "N",
  },
  kut: { naziv: "kut između sile i pomaka", oznaka: "α", jedinica: "°" },
};
export const korakKuta = (s) => (isNum(s.korak_kuta) ? s.korak_kuta : 5);
export const radKlizac = (s) => ({
  id: "kut",
  oznaka: "kut sile",
  min: 0,
  max: 180,
  korak: korakKuta(s),
  pocetak: s.kut,
  jedinica: "°",
});
const radAnaliza = (s) =>
  analizaCilja({ ...s, klizaci: [radKlizac(s)] }, radKlizac(s), (p) =>
    radVelicine(s, p.kut),
  );

// ── provjere ────────────────────────────────────────────────────────────────────────────────────────
function checkZbroji(s, tip) {
  if (!tocka(tip))
    return { tocno: false, poruka: "Povuci vrh strelice.", prazno: true };
  const od = pocetakZbroja(s);
  if (near(tip[0], od[0], 1e-6) && near(tip[1], od[1], 1e-6))
    return {
      tocno: false,
      poruka: "Povuci vrh strelice iz početne točke.",
      prazno: true,
    };
  const cilj = vrhZbroja(s);
  const t = korakMreze(s) * 0.25;
  const isti = (a, b) => near(a[0], b[0], t) && near(a[1], b[1], t);
  if (isti(tip, cilj)) return { tocno: true };
  const v = krajevi(s);
  let z = od;
  for (let i = 0; i < v.length - 1; i++) {
    z = plus(z, v[i].d);
    if (isti(tip, z))
      return {
        tocno: false,
        poruka: `Strelica završava na kraju ${i + 1}. strelice. Ukupni pomak (zbroj) ide od početka do vrha **zadnje** strelice.`,
      };
  }
  if (isti(tip, minus(od, zbrojVektora(s))))
    return {
      tocno: false,
      poruka:
        "Strelica je dobre duljine, ali pokazuje obrnuto: zbroj ide od početka prve strelice prema vrhu zadnje.",
    };
  const put = v.reduce((x, w) => x + duljina(w.d), 0);
  if (v.length > 1 && near(duljina(minus(tip, od)), put, t))
    return {
      tocno: false,
      poruka:
        "Duljina tvoje strelice jednaka je zbroju duljina zadanih strelica. Vektori se ne zbrajaju kao brojevi: zbroj je ravna strelica od početka prve do vrha zadnje (nadovezane) strelice.",
    };
  return {
    tocno: false,
    poruka:
      s.savjet ||
      "Vrh nije na pravom mjestu. Nadoveži strelice jednu na drugu: zbroj ide od početka prve do vrha zadnje.",
  };
}

function checkRastavi(s, odg) {
  if (!tocka(odg) || (odg[0] === 0 && odg[1] === 0))
    return {
      tocno: false,
      poruka: "Povuci vrhove obiju komponenti.",
      prazno: true,
    };
  const [fx, fy] = komponente(s);
  const F = duljina([fx, fy]);
  const t = tolRastav(s) * F;
  const [x, y] = odg;
  if (near(x, fx, t) && near(y, fy, t)) return { tocno: true };
  if (Math.abs(fx - fy) > t && near(x, fy, t) && near(y, fx, t))
    return {
      tocno: false,
      poruka:
        "Komponente su zamijenjene. Vodoravna komponenta je projekcija sile na vodoravnu os: iz vrha sile spusti okomicu na tu os.",
    };
  const os = (ime, v, tocna) => {
    if (near(v, tocna, t)) return null;
    if (Math.abs(tocna) > t && near(v, -tocna, t))
      return `${ime} komponenta pokazuje na krivu stranu.`;
    if (Math.abs(tocna) <= t)
      return `Sila nema ${ime.toLowerCase()} komponentu (sila je ${ime === "Vodoravna" ? "okomita" : "vodoravna"}).`;
    return `${ime} komponenta je ${Math.abs(v) > Math.abs(tocna) ? "preduga" : "prekratka"}.`;
  };
  const msg = [os("Vodoravna", x, fx), os("Okomita", y, fy)]
    .filter(Boolean)
    .join(" ");
  return {
    tocno: false,
    poruka: `${msg} Komponenta završava ondje gdje okomica iz vrha sile pada na os.`,
  };
}

function checkRazlika(s, odg) {
  if (!tocka(odg) || (odg[0] === 0 && odg[1] === 0))
    return { tocno: false, poruka: "Povuci vrh strelice Δv.", prazno: true };
  const dv = deltaV(s);
  const [v1, v2] = krajevi(s);
  const isto = (a, b) =>
    duljina(b) > 0 &&
    razlikaKuta(kutVektora(...a), kutVektora(...b)) <= 10 &&
    Math.abs(duljina(a) - duljina(b)) <= tolRazlika(s) * duljina(b);
  if (isto(odg, dv)) return { tocno: true };
  if (isto(odg, minus(v1.d, v2.d)))
    return {
      tocno: false,
      poruka:
        "To je v₁ − v₂: strelica je obrnuta. Δv = v₂ − v₁ ide od vrha v₁ do vrha v₂ (kad obje kreću iz iste točke).",
    };
  if (isto(odg, plus(v1.d, v2.d)))
    return {
      tocno: false,
      poruka:
        "To je zbroj v₁ + v₂. Za razliku Δv = v₂ − v₁ strelica ide od vrha v₁ do vrha v₂.",
    };
  if (isto(odg, v2.d))
    return {
      tocno: false,
      poruka:
        "To je sama v₂. Δv je promjena brzine: strelica od vrha v₁ do vrha v₂.",
    };
  return {
    tocno: false,
    poruka:
      s.savjet ||
      "Nije dobro. Obje brzine kreću iz iste točke; Δv je strelica koja spaja vrh v₁ s vrhom v₂.",
  };
}

function checkRad(s, kut) {
  if (!isNum(kut))
    return { tocno: false, poruka: "Okreni silu.", prazno: true };
  const a = radAnaliza(s);
  if (a.ok(kut)) return { tocno: true };
  const W = radVelicine(s, kut).W;
  const cilj = s.cilj.vrijednost;
  const tol = a.tol;
  const sin = s.F * s.s * Math.sin(rad(kut));
  let savjet = "";
  if (Math.abs(cilj) > tol && near(W, -cilj, tol))
    savjet =
      "Iznos je dobar, ali predznak nije: sila koja ima komponentu unatrag (protiv pomaka) obavlja negativan rad.";
  else if (near(sin, cilj, tol))
    savjet =
      "Izgleda da si računao sa sinusom. U rad ulazi samo komponenta sile u smjeru pomaka, $F \\cos\\alpha$.";
  else
    savjet =
      Math.abs(W) > Math.abs(cilj)
        ? "Komponenta sile u smjeru pomaka je prevelika."
        : "Komponenta sile u smjeru pomaka je premala.";
  return {
    tocno: false,
    poruka: `Pod kutom ${formatNumber(kut)}° rad je ${opisVelicine(W, RAD_META.W)}, a treba ${iznosJed(cilj, "J")}. ${savjet}`,
  };
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Vektori na mreži ili sila pod kutom (fizika, matura). tekst, nacin, scena? ("mreza" zadano | "rad").
Scena "mreza": mreza: {x: [od, do], y: [od, do], korak, jedinica?} (isto mjerilo na osima, najviše ${NAJVISE_POLJA} kvadratića po osi), strane_svijeta? (true: S, J, I, Z umjesto osi x, y),
vektori: [{od? ([x, y]; bez „od“ vektor se nadovezuje na vrh prethodnog), do ([x, y]) ili iznos + kut (° od +x, suprotno kazaljci), oznaka?, pomicno? (istrazi: vrh se vuče)}]. Načini:
- "istrazi": korak za gledanje: vuku se vrhovi pomičnih vektora ili točke putanja?: [[x, y], …] (2–6 točaka); prikazi?: ${PRIKAZI.join(", ")} (iznos, komponente, zbroj kao strelica, put naspram pomaka). Bez odgovora.
- "zbroji" (Tvoj red): učenik vuče vrh strelice zbroja iz pocetak? (zadano početak prvog vektora); točan vrh = početak + zbroj (računa aplikacija, mora biti na mreži); iznos se dok vuče ne vidi. Tipične greške (kraj prve strelice, obrnut smjer, zbroj iznosa) prepoznaju se same.
- "rastavi" (Tvoj red): jedan kosi vektor (iznos + kut); učenik vuče vrhove vodoravne i okomite komponente (zaključavanje na desetinu kvadratića); tolerancija? (udio iznosa, zadano 0,04).
- "razlika" (Tvoj red): dva vektora v₁, v₂ (npr. brzine u dvije točke kružnice); aplikacija ih prenese u zajednički pocetak? (zadano početak v₁), a učenik crta Δv = v₂ − v₁ iz vrha v₁; točno uz kut ±10° i iznos ±tolerancija (zadano 0,1).
Scena "rad": sanduk se pomakne za s (m) udesno, sila F (N) vuče ga pod kutom kut (°, 0–180, početni položaj); vidi se F·cos α i rad W = F·s·cos α (zelen pozitivan, crven negativan). korak_kuta? (zadano 5). Načini:
- "istrazi": učenik okreće silu i gleda komponentu i rad;
- "postavi" (Tvoj red): cilj: {velicina: "W", vrijednost (J), tolerancija?}; učenik okrene silu tako da rad bude cilj (npr. 0 J kod 90°). Kut koji to ostvaruje računa aplikacija.`;

const PRIMJER = {
  tip: "vektori",
  nacin: "zbroji",
  strane_svijeta: true,
  tekst:
    "Biciklist vozi 30 km na istok, pa 40 km na jug. Povuci strelicu **pomaka**: od točke O do mjesta gdje je stao.",
  mreza: { x: [-10, 50], y: [-50, 10], korak: 10, jedinica: "km" },
  vektori: [
    { od: [0, 0], do: [30, 0], oznaka: "30 km" },
    { do: [30, -40], oznaka: "40 km" },
  ],
};

const PRIMJERI = [
  {
    tip: "vektori",
    nacin: "istrazi",
    strane_svijeta: true,
    tekst:
      "Povuci točke puta. Gledaj kako se mijenjaju **put** i **pomak**; probaj se vratiti u točku O.",
    mreza: { x: [-10, 50], y: [-50, 10], korak: 10, jedinica: "km" },
    putanja: [
      [0, 0],
      [30, 0],
      [30, -40],
    ],
    prikazi: ["put"],
  },
  {
    tip: "vektori",
    nacin: "rastavi",
    tekst:
      "Uže vuče sanduk silom 200 N pod kutom 30°. Povuci vrhove **vodoravne** i **okomite** komponente sile.",
    mreza: { x: [-25, 225], y: [-25, 125], korak: 25, jedinica: "N" },
    vektori: [{ od: [0, 0], iznos: 200, kut: 30, oznaka: "F = 200 N" }],
  },
  {
    tip: "vektori",
    nacin: "razlika",
    tekst:
      "Točka na kotaču ima brzinu $v_1$, a četvrt okreta kasnije brzinu $v_2$ (isti iznos). Nacrtaj promjenu brzine $\\Delta v = v_2 - v_1$.",
    mreza: { x: [-4, 4], y: [-4, 4], korak: 1, jedinica: "m/s" },
    vektori: [
      { od: [0, 0], do: [0, 3], oznaka: "v₁" },
      { od: [0, 0], do: [-3, 0], oznaka: "v₂" },
    ],
  },
  {
    tip: "vektori",
    nacin: "istrazi",
    tekst:
      "Povuci vrhove vektora $\\vec a$ i $\\vec b$ i gledaj njihov **zbroj** i komponente.",
    mreza: { x: [-2, 8], y: [-2, 6], korak: 1 },
    vektori: [
      { od: [0, 0], do: [3, 1], oznaka: "a", pomicno: true },
      { do: [5, 4], oznaka: "b", pomicno: true },
    ],
    prikazi: ["zbroj", "komponente"],
  },
  {
    tip: "vektori",
    scena: "rad",
    nacin: "istrazi",
    F: 80,
    s: 10,
    kut: 30,
    tekst:
      "Sanduk se pomakne 10 m udesno. **Okreći silu** i gledaj koliki dio sile vuče naprijed i koliki je rad.",
  },
  {
    tip: "vektori",
    scena: "rad",
    nacin: "postavi",
    F: 80,
    s: 10,
    kut: 30,
    tekst: "Okreni silu tako da **ne obavlja rad**, iako se sanduk pomiče.",
    cilj: { velicina: "W", vrijednost: 0 },
  },
];

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const vektori = {
  tip: "vektori",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "vektori treba „tekst“");
    if (s.scena === "rad") {
      validateRad(s, need);
      return list;
    }
    if (
      !need(
        s.scena == null || s.scena === "mreza",
        'vektori.scena mora biti "mreza" (zadano) ili "rad"',
      )
    )
      return list;
    if (
      !need(
        NACINI_MREZA.includes(s.nacin),
        `vektori.nacin mora biti jedan od: ${NACINI_MREZA.join(", ")}`,
      )
    )
      return list;
    const m = s.mreza;
    if (
      !need(
        m &&
          Array.isArray(m.x) &&
          Array.isArray(m.y) &&
          m.x.length === 2 &&
          m.y.length === 2 &&
          [...m.x, ...m.y].every(isNum) &&
          m.x[1] > m.x[0] &&
          m.y[1] > m.y[0],
        "vektori treba mreza: {x: [od, do], y: [od, do], korak} uz od < do",
      )
    )
      return list;
    if (
      !need(
        isNum(m.korak) && m.korak > 0,
        "mreza.korak mora biti pozitivan broj",
      )
    )
      return list;
    need(
      (m.x[1] - m.x[0]) / m.korak <= NAJVISE_POLJA &&
        (m.y[1] - m.y[0]) / m.korak <= NAJVISE_POLJA,
      `mreza ima previše kvadratića (najviše ${NAJVISE_POLJA} po osi): povećaj korak ili smanji raspon`,
    );
    need(
      (m.x[1] - m.x[0]) / m.korak >= 2 && (m.y[1] - m.y[0]) / m.korak >= 2,
      "mreza treba barem 2 kvadratića po osi",
    );
    need(
      [...m.x, ...m.y].every((v) => naMrezi(v, m.korak)),
      "rubovi mreže (x i y) moraju biti višekratnici koraka",
    );
    if (m.jedinica != null)
      need(typeof m.jedinica === "string", "mreza.jedinica mora biti tekst");
    if (s.strane_svijeta != null)
      need(
        typeof s.strane_svijeta === "boolean",
        "strane_svijeta mora biti true ili false",
      );
    if (s.pocetak != null)
      need(
        tocka(s.pocetak) && unutra(s, s.pocetak),
        "pocetak mora biti točka [x, y] na mreži",
      );

    const vs = s.vektori;
    const trebaVektora = {
      istrazi: [0, 4],
      zbroji: [1, 4],
      rastavi: [1, 1],
      razlika: [2, 2],
    }[s.nacin];
    if (vs != null || trebaVektora[0] > 0) {
      if (
        !need(
          Array.isArray(vs) &&
            vs.length >= trebaVektora[0] &&
            vs.length <= trebaVektora[1],
          `vektori (${s.nacin}) treba ${trebaVektora[0] === trebaVektora[1] ? trebaVektora[0] : `${trebaVektora[0]}–${trebaVektora[1]}`} vektor(a)`,
        )
      )
        return list;
      vs.forEach((v, i) => {
        if (!need(v && typeof v === "object", `vektori[${i}] mora biti objekt`))
          return;
        if (v.od != null)
          need(tocka(v.od), `vektori[${i}].od mora biti [x, y]`);
        need(i > 0 || tocka(v.od), "prvi vektor treba „od“ ([x, y])");
        need(
          tocka(v.do) !== (isNum(v.iznos) && isNum(v.kut)),
          `vektori[${i}] treba ili „do“ ([x, y]) ili „iznos“ i „kut“`,
        );
        if (isNum(v.iznos))
          need(v.iznos > 0, `vektori[${i}].iznos mora biti pozitivan`);
        if (v.oznaka != null)
          need(isText(v.oznaka), `vektori[${i}].oznaka mora biti tekst`);
        if (v.pomicno != null)
          need(
            s.nacin === "istrazi" && typeof v.pomicno === "boolean",
            `vektori[${i}].pomicno postoji samo u načinu istrazi`,
          );
      });
      if (list.length) return list;
      const k = krajevi(s);
      k.forEach((v, i) => {
        need(
          unutra(s, v.od) && unutra(s, v.do),
          `vektori[${i}] izlazi iz mreže`,
        );
        need(duljina(v.d) > 0, `vektori[${i}] ima duljinu 0`);
        if (v.pomicno || s.nacin === "zbroji")
          need(
            [...v.od, ...v.do].every((x) => naMrezi(x, m.korak)),
            `vektori[${i}]: krajevi moraju biti na čvorovima mreže (višekratnici koraka)`,
          );
      });
    }
    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      need(s.tolerancija == null, "istrazi nema toleranciju");
      if (
        s.putanja != null &&
        need(
          Array.isArray(s.putanja) &&
            s.putanja.length >= 2 &&
            s.putanja.length <= 6 &&
            s.putanja.every(tocka),
          "putanja mora biti popis od 2 do 6 točaka [x, y]",
        )
      ) {
        need(
          s.putanja.every(
            (t) => unutra(s, t) && t.every((x) => naMrezi(x, m.korak)),
          ),
          "točke putanje moraju biti na čvorovima mreže",
        );
      }
      need(
        (vs?.length ?? 0) > 0 || s.putanja != null,
        "istrazi treba vektore ili putanju",
      );
      if (
        s.prikazi != null &&
        need(
          Array.isArray(s.prikazi) &&
            s.prikazi.every((p) => PRIKAZI.includes(p)),
          `prikazi smije sadržavati: ${PRIKAZI.join(", ")}`,
        )
      ) {
        need(
          !s.prikazi.includes("put") || s.putanja != null,
          "prikazi „put“ treba putanju",
        );
        need(
          !s.prikazi.includes("zbroj") || (vs?.length ?? 0) >= 2,
          "prikazi „zbroj“ treba barem 2 vektora",
        );
      }
      return list;
    }
    need(
      s.putanja == null && s.prikazi == null,
      `${s.nacin} nema putanju ni prikazi (to je za istrazi)`,
    );
    if (s.nacin === "zbroji") {
      const vrh = vrhZbroja(s);
      need(unutra(s, vrh), "vrh zbroja izlazi iz mreže: proširi mrežu");
      need(
        vrh.every((x) => naMrezi(x, m.korak)),
        "vrh zbroja mora biti na čvoru mreže",
      );
      need(
        duljina(zbrojVektora(s)) > 0,
        "zbroj vektora je nula: učenik ne bi imao što nacrtati",
      );
      if (s.tolerancija != null)
        need(
          false,
          "zbroji nema toleranciju (vrh se zaključava na čvor mreže)",
        );
    }
    if (s.nacin === "rastavi") {
      if (s.tolerancija != null)
        need(
          isNum(s.tolerancija) && s.tolerancija > 0 && s.tolerancija <= 0.2,
          "tolerancija je udio iznosa sile (npr. 0.04)",
        );
      const v = krajevi(s)[0];
      need(
        unutra(s, [v.od[0] + v.d[0], v.od[1]]) &&
          unutra(s, [v.od[0], v.od[1] + v.d[1]]),
        "komponente izlaze iz mreže",
      );
      need(
        Math.abs(v.d[0]) > 1e-9 && Math.abs(v.d[1]) > 1e-9,
        "vektor za rastav mora biti kos (obje komponente različite od nule)",
      );
    }
    if (s.nacin === "razlika") {
      if (s.tolerancija != null)
        need(
          isNum(s.tolerancija) && s.tolerancija > 0 && s.tolerancija <= 0.3,
          "tolerancija je udio iznosa Δv (npr. 0.1)",
        );
      const p0 = pocetakRazlike(s);
      const [v1, v2] = krajevi(s);
      need(duljina(deltaV(s)) > 0, "v₁ i v₂ su jednaki: Δv je nula");
      need(
        unutra(s, plus(p0, v1.d)) && unutra(s, plus(p0, v2.d)),
        "preneseni v₁ i v₂ (iz zajedničkog početka) izlaze iz mreže: promijeni pocetak ili mrežu",
      );
      need(
        [...plus(p0, v1.d), ...plus(p0, v2.d)].every((x) =>
          naMrezi(x, m.korak / 2),
        ),
        "vrhovi prenesenih v₁ i v₂ moraju biti na mreži (pola koraka)",
      );
    }
    return list;
  },
  check(s, odg) {
    if (s.scena === "rad")
      return s.nacin === "postavi"
        ? checkRad(s, odg)
        : { tocno: false, poruka: "Ovaj korak nema provjeru." };
    if (s.nacin === "zbroji") return checkZbroji(s, odg);
    if (s.nacin === "rastavi") return checkRastavi(s, odg);
    if (s.nacin === "razlika") return checkRazlika(s, odg);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    const j = jed(s);
    if (s.scena === "rad")
      return s.nacin === "postavi"
        ? `α = ${formatNumber(radAnaliza(s).best)}°`
        : "";
    if (s.nacin === "zbroji") {
      const z = zbrojVektora(s);
      return `strelica od (${s.pocetak ? pocetakZbroja(s).map(formatNumber).join(", ") : "početka"}) do (${vrhZbroja(s).map(formatNumber).join(", ")}), iznos ${iznosJed(duljina(z), j)}`;
    }
    if (s.nacin === "rastavi") {
      const [x, y] = komponente(s);
      return `vodoravna ${iznosJed(x, j)}, okomita ${iznosJed(y, j)}`;
    }
    if (s.nacin === "razlika") {
      const d = deltaV(s);
      return `$\\Delta v$ od vrha $v_1$ do vrha $v_2$: (${d.map(formatNumber).join(", ")}), iznos ${iznosJed(duljina(d), j)}`;
    }
    return "";
  },
};

function validateRad(s, need) {
  need(
    NACINI_RAD.includes(s.nacin),
    `vektori (scena rad): nacin mora biti ${NACINI_RAD.join(" ili ")}`,
  );
  need(
    isNum(s.F) && s.F > 0 && s.F <= 1e6,
    "rad treba F (iznos sile u N, pozitivan)",
  );
  need(
    isNum(s.s) && s.s > 0 && s.s <= 1e6,
    "rad treba s (pomak u m, pozitivan)",
  );
  need(
    isNum(s.kut) && s.kut >= 0 && s.kut <= 180,
    "rad treba kut (početni kut sile, 0–180°)",
  );
  if (s.korak_kuta != null)
    need(
      isNum(s.korak_kuta) && [1, 5, 10, 15].includes(s.korak_kuta),
      "korak_kuta mora biti 1, 5, 10 ili 15",
    );
  for (const f of ["mreza", "vektori", "putanja", "prikazi", "klizaci"])
    need(!(f in s), `scena rad nema polje „${f}“`);
  if (!isNum(s.F) || !isNum(s.s) || !isNum(s.kut)) return;
  need(
    Math.abs(s.kut / korakKuta(s) - Math.round(s.kut / korakKuta(s))) < 1e-9,
    "kut mora biti višekratnik koraka kuta",
  );
  if (s.nacin === "istrazi") return noAnswerFields(s, need);
  const c = s.cilj;
  if (
    !need(
      c && c.velicina === "W" && isNum(c.vrijednost),
      'rad postavi treba cilj: {velicina: "W", vrijednost (J)}',
    )
  )
    return;
  if (c.tolerancija != null)
    need(
      isNum(c.tolerancija) && c.tolerancija >= 0,
      "cilj.tolerancija mora biti nenegativan broj (J)",
    );
  need(
    Math.abs(c.vrijednost) <= s.F * s.s + 1e-9,
    `rad ne može biti veći od F·s = ${broj(s.F * s.s)} J`,
  );
  const a = radAnaliza(s);
  need(
    a.dostizno,
    `cilj W = ${broj(c.vrijednost)} J nije ostvariv uz korak kuta ${korakKuta(s)}° (najbliže ${formatNumber(a.best)}°)`,
  );
  need(
    !a.ok(s.kut),
    "početni kut već daje ciljani rad, pa bi „Provjeri“ bez okretanja bio točan",
  );
}
