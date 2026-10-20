// em_val: elektromagnetski val (fizika, matura, V18–V19) u tri scene:
//   „polja“    – E i B u prostoru (kosa projekcija koja se može zakretati): oba titraju okomito na smjer širenja i
//                okomito jedno na drugo;
//   „spektar“  – elektromagnetski spektar na logaritamskoj skali (λ dolje, f gore), područja iz tablice rješenja V19;
//   „sredstvo“ – svjetlost prelazi iz zraka u sredstvo: f (i T) ostaju, v i λ se smanje n puta, boja ostaje.
// Sva fizika, geometrija crteža (koordinate u viewBoxu), tekstovi očitanja i ono što je skriveno računaju se ovdje kao
// čiste funkcije (spec, stanje) → obični JSON. Komponenta (i buduća iOS verzija) samo crta i prosljeđuje unos.
import {
  isNum,
  formatNumber,
  formatSci,
  parseNumber,
} from "../../core/number.js";
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

const TIP = "em_val";
export const C_SVJ = 3e8; // m/s, kao u knjižici i rješenjima
export const SCENE = ["polja", "spektar", "sredstvo"];
export const NACINI = {
  polja: ["istrazi", "prikaz", "odaberi"],
  spektar: ["istrazi", "prikaz", "smjesti", "odaberi_podrucje"],
  sredstvo: ["istrazi", "prikaz", "predvidi", "izracunaj"],
};
const GLEDANJE = ["istrazi", "prikaz"];
export const jeGledanje = (s) => GLEDANJE.includes(s.nacin);

const r1 = (n) => Math.round(n * 10) / 10;
const RAD = Math.PI / 180;

// ══ POLJA ═══════════════════════════════════════════════════════════════════════════════════════════
// Koordinate svijeta: x = istok, y = sjever, z = gore.
export const OSI = ["gore-dolje", "istok-zapad", "sjever-jug"];
export const SMJEROVI = ["istok", "zapad", "sjever", "jug", "gore", "dolje"];
const VEKTOR = {
  istok: [1, 0, 0],
  zapad: [-1, 0, 0],
  sjever: [0, 1, 0],
  jug: [0, -1, 0],
  gore: [0, 0, 1],
  dolje: [0, 0, -1],
};
const OS_VEKTOR = {
  "istok-zapad": [1, 0, 0],
  "sjever-jug": [0, 1, 0],
  "gore-dolje": [0, 0, 1],
};
const SMJER_U_OS = {
  istok: "istok-zapad",
  zapad: "istok-zapad",
  sjever: "sjever-jug",
  jug: "sjever-jug",
  gore: "gore-dolje",
  dolje: "gore-dolje",
};
const SMJER_TEKST = {
  istok: "prema istoku",
  zapad: "prema zapadu",
  sjever: "prema sjeveru",
  jug: "prema jugu",
  gore: "uvis",
  dolje: "prema dolje",
};
export const TRAZI = ["B", "E", "smjer"];
export const osSmjera = (smjer) => SMJER_U_OS[smjer];
const trecaOs = (a, b) => OSI.find((o) => o !== a && o !== b);
const vektorski = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const smjerVektora = (v) =>
  SMJEROVI.find((s) => VEKTOR[s].every((c, i) => c === v[i]));
export const trazenoPolje = (s) => s.trazi ?? "B";

// Osi E, B i širenja te jedinični vektori. B = k × E, pa je E × B u smjeru širenja (E i B titraju u fazi).
export function poljaOsi(s) {
  let smjer = s.smjer_sirenja;
  if (!SMJEROVI.includes(smjer))
    smjer = smjerVektora(vektorski(OS_VEKTOR[s.E], OS_VEKTOR[s.B]));
  const sirenje = osSmjera(smjer);
  const E = s.E ?? trecaOs(sirenje, s.B);
  const B = s.B ?? trecaOs(sirenje, E);
  const k = VEKTOR[smjer];
  const e = OS_VEKTOR[E];
  return { E, B, sirenje, smjer, k, e, b: vektorski(k, e) };
}

export function tocnaOs(s) {
  const o = poljaOsi(s);
  const t = trazenoPolje(s);
  return t === "E" ? o.E : t === "B" ? o.B : o.sirenje;
}

// Što se crta: u „odaberi“ traženo se ne crta dok odgovor nije točan ili prikazan.
export function vidljivoPolja(s, otkriveno = false) {
  if (s.nacin !== "odaberi" || otkriveno)
    return { E: true, B: true, smjer: true };
  const t = trazenoPolje(s);
  return { E: t !== "E", B: t !== "B", smjer: t !== "smjer" };
}

// Kosa projekcija: zakret oko okomite osi (yaw) pa nagib pogleda odozgo (elev). Vraća [x, y (prema dolje), dubina].
export const POLJA = {
  vb: [360, 272],
  cx: 180,
  cy: 140,
  L: 112, // pola duljine osi
  W: 100, // pola duljine vala duž smjera širenja (2 valne duljine)
  A: 46, // amplituda na crtežu (E i B jednako, nije u mjerilu)
  yaw: -32,
  yawMin: -95,
  yawMax: 30,
  elev: 22,
};
export function projiciraj([x, y, z], yaw = POLJA.yaw, elev = POLJA.elev) {
  const a = yaw * RAD;
  const e = elev * RAD;
  const xr = x * Math.cos(a) - y * Math.sin(a);
  const yr = x * Math.sin(a) + y * Math.cos(a);
  return [
    xr,
    -(z * Math.cos(e) + yr * Math.sin(e)),
    yr * Math.cos(e) - z * Math.sin(e),
  ];
}
const KRAJEVI = {
  "istok-zapad": ["istok", "zapad"],
  "sjever-jug": ["sjever", "jug"],
  "gore-dolje": ["gore", "dolje"],
};

// Geometrija scene „polja“: osi s oznakama krajeva, val E i B (krivulja + šipke od osi do krivulje), strelica
// širenja i krug tla (vodoravna ravnina). stanje: {yaw, faza (rad), otkriveno}.
export function poljaCrtez(
  s,
  { yaw = POLJA.yaw, faza = 0, otkriveno = false } = {},
) {
  const o = poljaOsi(s);
  const vid = vidljivoPolja(s, otkriveno);
  const { cx, cy, L, W, A } = POLJA;
  const P = (v) => {
    const [x, y] = projiciraj(v, yaw);
    return [r1(cx + x), r1(cy + y)];
  };
  const mul = (v, m) => v.map((c) => c * m);
  const add = (a, b) => a.map((c, i) => c + b[i]);
  const osi = OSI.map((os) => {
    const v = OS_VEKTOR[os];
    const krajevi = [1, -1].map((pr, i) => {
      const [x, y] = P(mul(v, pr * L));
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const ime = KRAJEVI[os][i];
      return {
        ime,
        x,
        y,
        tx: r1(x + (dx / d) * 18),
        ty: r1(y + (dy / d) * 14 + 4),
        sidro: dx / d > 0.35 ? "start" : dx / d < -0.35 ? "end" : "middle",
        sirenje: vid.smjer && ime === o.smjer,
      };
    });
    return {
      os,
      x1: krajevi[0].x,
      y1: krajevi[0].y,
      x2: krajevi[1].x,
      y2: krajevi[1].y,
      krajevi,
    };
  });
  const lam = W; // dvije valne duljine na 2W
  const valovi = [];
  const tocka = [];
  for (const polje of ["E", "B"]) {
    if (!vid[polje]) continue;
    const smjerPolja = polje === "E" ? o.e : o.b;
    if (vid.smjer) {
      const put = [];
      const N = 72;
      for (let i = 0; i <= N; i++) {
        const sx = -W + (2 * W * i) / N;
        const amp = A * Math.sin((2 * Math.PI * sx) / lam - faza);
        put.push(P(add(mul(o.k, sx), mul(smjerPolja, amp))));
      }
      const sipke = [];
      const M = 20;
      for (let i = 0; i < M; i++) {
        const sx = -W + (2 * W * (i + 0.5)) / M;
        const amp = A * Math.sin((2 * Math.PI * sx) / lam - faza);
        const [x1, y1] = P(mul(o.k, sx));
        const [x2, y2] = P(add(mul(o.k, sx), mul(smjerPolja, amp)));
        sipke.push([x1, y1, x2, y2]);
      }
      valovi.push({ polje, put, sipke });
    } else {
      // smjer širenja se traži: polja se crtaju samo u jednoj točki (strelice koje titraju)
      const amp = A * 0.95 * Math.sin(faza + Math.PI / 2);
      const [x2, y2] = P(mul(smjerPolja, amp));
      tocka.push({ polje, x1: cx, y1: cy, x2, y2, pozitivno: amp >= 0 });
    }
  }
  const tlo = [];
  for (let i = 0; i < 48; i++) {
    const t = (2 * Math.PI * i) / 48;
    tlo.push(P([Math.cos(t) * L * 0.92, Math.sin(t) * L * 0.92, 0]));
  }
  const smjer = vid.smjer
    ? (() => {
        const [x1, y1] = P(mul(o.k, -W - 4));
        const [x2, y2] = P(mul(o.k, L + 2));
        return { x1, y1, x2, y2 };
      })()
    : null;
  return { osi, valovi, tocka, smjer, tlo };
}

// Os najbliža točki (x, y) u koordinatama viewBoxa, ili null ako je dodir dalje od `prag`.
export function najblizaOs(crtez, x, y, prag = 24) {
  let naj = null;
  let dmin = prag;
  for (const o of crtez.osi) {
    const vx = o.x2 - o.x1;
    const vy = o.y2 - o.y1;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - o.x1) * vx + (y - o.y1) * vy) / (vx * vx + vy * vy || 1),
      ),
    );
    const d = Math.hypot(x - o.x1 - t * vx, y - o.y1 - t * vy);
    if (d < dmin) {
      dmin = d;
      naj = o.os;
    }
  }
  return naj;
}

export function opisPolja(s, otkriveno = false) {
  const o = poljaOsi(s);
  const vid = vidljivoPolja(s, otkriveno);
  const dio = [];
  if (vid.smjer) dio.push(`Val se širi ${SMJER_TEKST[o.smjer]}.`);
  if (vid.E) dio.push(`Električno polje E titra ${o.E}.`);
  if (vid.B) dio.push(`Magnetsko polje B titra ${o.B}.`);
  return `Elektromagnetski val u prostoru. ${dio.join(" ")}`;
}

function checkPolja(s, os) {
  if (!OSI.includes(os))
    return {
      tocno: false,
      poruka: "Dodirni jednu od triju osi (ili gumb ispod crteža).",
      prazno: true,
    };
  const o = poljaOsi(s);
  const t = trazenoPolje(s);
  if (os === tocnaOs(s)) return { tocno: true };
  if (t === "B" || t === "E") {
    const drugo = t === "B" ? "E" : "B";
    const imeDrugog = drugo === "E" ? "električno" : "magnetsko";
    if (os === o[drugo])
      return {
        tocno: false,
        poruka: `Po toj osi titra **${imeDrugog}** polje ${drugo}. E i B titraju **okomito jedno na drugo**, pa ${t} ne može biti na istoj osi.`,
      };
    if (os === o.sirenje)
      return {
        tocno: false,
        poruka: `Po toj se osi val **širi**. Elektromagnetski val je transverzalni: ${t} titra **okomito na smjer širenja**.`,
      };
  }
  if (t === "smjer")
    return {
      tocno: false,
      poruka: `Po toj osi titra ${os === o.E ? "električno polje E" : "magnetsko polje B"}. Val se širi okomito i na E i na B, a u prostoru je samo jedna os okomita na obje.`,
    };
  return { tocno: false, poruka: s.savjet || "Nije ta os." };
}

// ══ SPEKTAR ═════════════════════════════════════════════════════════════════════════════════════════
// Granice iz tablice rješenja V19 (λ u metrima), poredano od najdulje valne duljine (lijevo) do najkraće (desno).
export const PODRUCJA = [
  {
    id: "radio",
    naziv: "radiovalovi",
    genitiv: "radiovalova",
    kratko: "radio",
    od: 1,
    do: Infinity,
    boja: "#fde68a",
  },
  {
    id: "mikro",
    naziv: "mikrovalovi",
    genitiv: "mikrovalova",
    kratko: "mikro",
    od: 1e-3,
    do: 1,
    boja: "#fcd34d",
  },
  {
    id: "ic",
    naziv: "infracrveno zračenje",
    genitiv: "infracrvenog zračenja",
    kratko: "IC",
    od: 7e-7,
    do: 1e-3,
    boja: "#fca5a5",
  },
  {
    id: "vidljivo",
    naziv: "vidljiva svjetlost",
    genitiv: "vidljive svjetlosti",
    kratko: "",
    od: 4e-7,
    do: 7e-7,
    boja: null,
  },
  {
    id: "uv",
    naziv: "ultraljubičasto zračenje",
    genitiv: "ultraljubičastog zračenja",
    kratko: "UV",
    od: 1e-8,
    do: 4e-7,
    boja: "#c4b5fd",
  },
  {
    id: "rendgen",
    naziv: "rendgensko zračenje",
    genitiv: "rendgenskog zračenja",
    kratko: "rendgen",
    od: 1e-11,
    do: 1e-8,
    boja: "#a5b4fc",
  },
  {
    id: "gama",
    naziv: "gama-zračenje",
    genitiv: "gama-zračenja",
    kratko: "gama",
    od: 0,
    do: 1e-11,
    boja: "#93c5fd",
  },
];
const GRANICE = [1, 1e-3, 7e-7, 4e-7, 1e-8, 1e-11];
export const podrucje = (lambda) =>
  PODRUCJA.find((p) => lambda >= p.od && lambda < p.do) ?? null;
export function susjedi(id) {
  const i = PODRUCJA.findIndex((p) => p.id === id);
  return [PODRUCJA[i - 1] ?? null, PODRUCJA[i + 1] ?? null].filter(Boolean);
}
export function izmeduTekst(id) {
  const s = susjedi(id);
  return s.length === 2
    ? `između ${s[0].genitiv} i ${s[1].genitiv}`
    : `uz ${s[0].genitiv} (rub spektra)`;
}
export const zadanaLambda = (s) =>
  isNum(s.lambda) ? s.lambda : isNum(s.f) ? C_SVJ / s.f : null;

// Raspored crteža spektra (viewBox 360 × 186): os f gore, traka područja, os λ dolje, povećana vidljiva svjetlost.
export const SPEKTAR = {
  vb: [360, 186],
  lgMin: -13,
  lgMax: 3,
  x0: 16,
  x1: 344,
  yNaslovF: 11,
  yF: 32,
  yTraka: 38,
  hTraka: 44,
  yL: 82,
  yNaslovL: 117,
  inset: { x0: 96, x1: 264, y: 144, h: 16 },
};
const lg = (x) => Math.log10(x);
export const lambdaX = (lambda) => {
  const { x0, x1, lgMin, lgMax } = SPEKTAR;
  return x0 + ((x1 - x0) * (lgMax - lg(lambda))) / (lgMax - lgMin);
};
export const xLambda = (x) => {
  const { x0, x1, lgMin, lgMax } = SPEKTAR;
  const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  return 10 ** (lgMax - t * (lgMax - lgMin));
};
// vidljivo povećano: 700 nm lijevo (dulje), 400 nm desno, kao na glavnoj traci
export const insetX = (lambda) => {
  const { x0, x1 } = SPEKTAR.inset;
  return x0 + ((x1 - x0) * (7e-7 - lambda)) / 3e-7;
};
export const xInset = (x) => {
  const { x0, x1 } = SPEKTAR.inset;
  const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  return 7e-7 - t * 3e-7;
};

// Oznaka se namješta na „lijepe“ vrijednosti (24 po dekadi): svaka valna duljina ima susjednu unutar 6 %.
export const NIZ = [
  1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.5, 2.7, 3, 3.3, 3.6, 4, 4.5, 5,
  5.5, 6, 6.5, 7, 7.5, 8, 9,
];
const LG_MIN_OZNAKE = -12.9;
const LG_MAX_OZNAKE = 2.9;
const izNiza = (i) => {
  const d = Math.floor(i / NIZ.length);
  const m = ((i % NIZ.length) + NIZ.length) % NIZ.length;
  return Number((NIZ[m] * 10 ** d).toPrecision(3));
};
const indeksNiza = (lambda) => {
  const d = Math.floor(lg(lambda) + 1e-12);
  const m = lambda / 10 ** d;
  let naj = 0;
  NIZ.forEach((v, i) => {
    if (Math.abs(lg(v / m)) < Math.abs(lg(NIZ[naj] / m))) naj = i;
  });
  // 9,6 je bliže 10 nego 9
  if (Math.abs(lg(10 / m)) < Math.abs(lg(NIZ[naj] / m)))
    return (d + 1) * NIZ.length;
  return d * NIZ.length + naj;
};
export function zaokruziLambda(lambda) {
  const l = Math.min(
    10 ** LG_MAX_OZNAKE,
    Math.max(10 ** LG_MIN_OZNAKE, lambda),
  );
  return izNiza(indeksNiza(l));
}
// smjesti: oznaka od početka stoji na traci (pa se može micati i gumbima ◀ ▶ i tipkovnicom), na sredini skale
// (10 µm); ako je odgovor blizu sredine, malo dalje, da početni položaj nikad ne bude točan
export function pocetakSmjesti(s) {
  const t = zadanaLambda(s);
  const sredina = 1e-5;
  if (!isNum(t) || Math.abs(lg(sredina / t)) > 0.6)
    return zaokruziLambda(sredina);
  return zaokruziLambda(t > sredina ? 1e-7 : 1e-3);
}
export function korakLambda(lambda, d) {
  const v = izNiza(indeksNiza(lambda) + d);
  return v > 10 ** LG_MAX_OZNAKE || v < 10 ** LG_MIN_OZNAKE
    ? zaokruziLambda(lambda)
    : v;
}

// λ u čitljivoj jedinici (kao u rješenjima: cm, nm…)
export function lambdaTekst(lambda) {
  const u =
    lambda >= 1000
      ? ["km", 1e3]
      : lambda >= 1
        ? ["m", 1]
        : lambda >= 0.01
          ? ["cm", 1e-2]
          : lambda >= 1e-3
            ? ["mm", 1e-3]
            : lambda >= 1e-6
              ? ["µm", 1e-6]
              : lambda >= 1e-11
                ? ["nm", 1e-9]
                : ["pm", 1e-12];
  return `${formatSci(lambda / u[1], 2)}\u00a0${u[0]}`;
}
export const lambdaMTekst = (lambda) => `${formatSci(lambda, 2)}\u00a0m`;
export const fTekst = (f) => `${formatSci(f, 3)}\u00a0Hz`;

// Uređaji za brzo skakanje u „istrazi“ (iz zadataka V19 i svakodnevice)
export const UREDAJI = [
  { naziv: "FM radio", lambda: 3 },
  { naziv: "mikrovalna pećnica", lambda: 0.12 },
  { naziv: "daljinski upravljač", lambda: 1e-6 },
  { naziv: "laserski pokazivač", lambda: 5e-7 },
  { naziv: "UV-lampa", lambda: 2.5e-7 },
  { naziv: "rendgen", lambda: 5e-11 },
  { naziv: "gama (radioaktivnost)", lambda: 1e-12 },
];

// Što se vidi: os f se skriva kad je zadana frekvencija (inače bi se λ = c/f samo prepisala s osi), a područje uživo
// i istaknuti susjedi tek kad je odgovor točan ili prikazan.
export function vidljivoSpektra(s, otkriveno = false) {
  const odgovor = !jeGledanje(s);
  return {
    fOs: !(odgovor && isNum(s.f)) || otkriveno,
    oznaka: s.nacin !== "odaberi_podrucje" || otkriveno,
    vuci: s.nacin === "istrazi" || s.nacin === "smjesti",
    fUzivo: !(odgovor && isNum(s.f)) || otkriveno,
    podrucjeUzivo: s.nacin === "istrazi" || s.nacin === "prikaz" || otkriveno,
    uredaji: s.nacin === "istrazi",
  };
}

const SUP = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "-": "⁻",
};
const potencija = (e) => `10${[...String(e)].map((c) => SUP[c]).join("")}`;

// Geometrija spektra. stanje: {lambda (oznaka, m) | null, otkriveno, odabrano (id područja) | null}
export function spektarCrtez(s, { lambda = null, otkriveno = false } = {}) {
  const vid = vidljivoSpektra(s, otkriveno);
  const { x0, x1, yTraka, hTraka, inset } = SPEKTAR;
  const podrucja = PODRUCJA.map((p) => {
    const xa = p.do === Infinity ? x0 : lambdaX(p.do);
    const xb = p.od === 0 ? x1 : lambdaX(p.od);
    return {
      id: p.id,
      naziv: p.naziv,
      kratko: p.kratko,
      boja: p.boja,
      x0: r1(xa),
      x1: r1(xb),
      xs: r1((xa + xb) / 2),
    };
  });
  const lambdaOznake = [3, 0, -3, -6, -9, -12].map((e) => ({
    x: r1(lambdaX(10 ** e)),
    tekst: {
      3: "1 km",
      0: "1 m",
      "-3": "1 mm",
      "-6": "1 µm",
      "-9": "1 nm",
      "-12": "1 pm",
    }[e],
  }));
  const lambdaCrtice = [];
  for (let e = SPEKTAR.lgMin; e <= SPEKTAR.lgMax; e++)
    lambdaCrtice.push(r1(lambdaX(10 ** e)));
  const fOznake = [];
  const fCrtice = [];
  if (vid.fOs) {
    for (let e = 6; e <= 21; e++) {
      const x = lambdaX(C_SVJ / 10 ** e);
      if (x < x0 || x > x1) continue;
      fCrtice.push(r1(x));
      if (e % 3 === 0) fOznake.push({ x: r1(x), tekst: potencija(e) });
    }
  }
  // duga: od 700 nm (lijevo) do 400 nm (desno)
  const duga = [];
  for (let nm = 700; nm >= 400; nm -= 20)
    duga.push({ pomak: r1((700 - nm) / 3) / 100, boja: lambdaRGB(nm) });
  const vidljivo = {
    x0: r1(lambdaX(7e-7)),
    x1: r1(lambdaX(4e-7)),
    lijevo: { x: inset.x0, tekst: "700 nm" },
    desno: { x: inset.x1, tekst: "400 nm" },
    crtice: [600, 500].map((nm) => ({
      x: r1(insetX(nm * 1e-9)),
      tekst: `${nm}`,
    })),
  };
  let oznaka = null;
  if (lambda != null && vid.oznaka) {
    const p = podrucje(lambda);
    oznaka = {
      x: r1(lambdaX(lambda)),
      xInset: lambda >= 4e-7 && lambda <= 7e-7 ? r1(insetX(lambda)) : null,
      podrucje: p?.id ?? null,
    };
  }
  return {
    podrucja,
    lambdaOznake,
    lambdaCrtice,
    fOznake,
    fCrtice,
    duga,
    vidljivo,
    oznaka,
    yTraka,
    hTraka,
  };
}

// Očitanje oznake (tekst), samo ono što smije biti vidljivo
export function ocitanjeSpektra(s, lambda, otkriveno = false) {
  if (lambda == null) return null;
  const vid = vidljivoSpektra(s, otkriveno);
  const p = podrucje(lambda);
  return {
    lambda: lambdaTekst(lambda),
    lambdaM: lambdaMTekst(lambda),
    f: vid.fUzivo ? fTekst(C_SVJ / lambda) : null,
    podrucje: vid.podrucjeUzivo && p ? p.naziv : null,
    izmedu: vid.podrucjeUzivo && p ? izmeduTekst(p.id) : null,
  };
}

const PRETVORBE = {
  2: "1 cm = 10⁻² m",
  3: "1 mm = 10⁻³ m",
  6: "1 µm = 10⁻⁶ m",
  9: "1 nm = 10⁻⁹ m",
};
function checkSmjesti(s, odgovor) {
  const l =
    typeof odgovor === "number" ? odgovor : parseNumber(String(odgovor ?? ""));
  if (!isNum(l) || l <= 0)
    return {
      tocno: false,
      poruka: "Povuci oznaku na traci spektra.",
      prazno: true,
    };
  const tocna = zadanaLambda(s);
  const d = lg(l / tocna);
  if (Math.abs(d) <= 0.05) return { tocno: true };
  const krivo = (s.krivo ?? []).find(
    (k) => isNum(k?.vrijednost) && Math.abs(lg(l / k.vrijednost)) <= 0.05,
  );
  if (krivo) return { tocno: false, poruka: krivo.poruka };
  if (isNum(s.f) && Math.abs(lg((l * C_SVJ) / s.f)) <= 0.05)
    return {
      tocno: false,
      poruka:
        "To je f/c. Valna duljina je $\\lambda = \\dfrac{c}{f}$: **veća frekvencija znači kraću valnu duljinu**.",
    };
  const k = Math.round(d);
  if (k !== 0 && Math.abs(d - k) <= 0.05) {
    const pretv = PRETVORBE[Math.abs(k)];
    const gdje =
      k > 0
        ? "predaleko lijevo (preduga valna duljina)"
        : "predaleko desno (prekratka valna duljina)";
    return {
      tocno: false,
      poruka: `Znamenke su dobre, ali oznaka je ${potencija(Math.abs(k))} puta ${gdje}. ${pretv ? `Provjeri pretvorbu jedinica: ${pretv}.` : "Provjeri potenciju broja 10 u računu."}`,
    };
  }
  if (podrucje(l)?.id === podrucje(tocna)?.id)
    return {
      tocno: false,
      poruka:
        "Područje je dobro, ali vrijednost nije. Izračunaj λ točno pa oznaku namjesti strelicama ◀ ▶.",
    };
  return {
    tocno: false,
    poruka:
      s.savjet ||
      (isNum(s.f)
        ? "Nije tu. Izračunaj $\\lambda = \\dfrac{c}{f}$ uz $c = 3\\cdot10^8$ m/s pa namjesti oznaku na tu valnu duljinu."
        : "Nije tu. Pretvori valnu duljinu u metre pa namjesti oznaku."),
  };
}

function checkPodrucje(s, id) {
  const odabrano = PODRUCJA.find((p) => p.id === id);
  if (!odabrano)
    return {
      tocno: false,
      poruka: "Dodirni jedno područje na traci spektra.",
      prazno: true,
    };
  const tocna = zadanaLambda(s);
  const t = podrucje(tocna);
  if (odabrano.id === t.id) return { tocno: true };
  if (isNum(s.f) && podrucje(s.f / C_SVJ)?.id === odabrano.id)
    return {
      tocno: false,
      poruka:
        "Nije to područje. Ako si računao f/c, obrni: $\\lambda = \\dfrac{c}{f}$. Veća frekvencija znači **kraću** valnu duljinu.",
    };
  for (const k of [9, 6, 3, 2]) {
    for (const pr of [1, -1]) {
      const kriva = tocna * 10 ** (pr * k);
      if (
        kriva > 1e-14 &&
        kriva < 1e5 &&
        podrucje(kriva)?.id === odabrano.id &&
        podrucje(kriva).id !== t.id &&
        !isNum(s.f)
      )
        return {
          tocno: false,
          poruka: `Pazi na jedinicu: ${PRETVORBE[k]}. Valnu duljinu najprije pretvori u metre.`,
        };
    }
  }
  const i = PODRUCJA.indexOf(odabrano);
  const j = PODRUCJA.indexOf(t);
  if (Math.abs(i - j) === 1) {
    const granica = GRANICE[Math.min(i, j)];
    return {
      tocno: false,
      poruka: `Blizu je, ali nije to područje. Usporedi valnu duljinu s granicom ${lambdaTekst(granica)}: je li dulja ili kraća od nje?`,
    };
  }
  return {
    tocno: false,
    poruka:
      s.savjet ||
      `Nije to područje. ${isNum(s.f) ? "Izračunaj $\\lambda = \\dfrac{c}{f}$ i " : "Valnu duljinu "}usporedi s granicama područja. Dulje valne duljine su lijevo, kraće desno.`,
  };
}

// ══ SREDSTVO ════════════════════════════════════════════════════════════════════════════════════════
export const SREDSTVA = [
  { naziv: "voda", n: 1.33 },
  { naziv: "led", n: 1.31 },
  { naziv: "staklo", n: 1.5 },
  { naziv: "plastika", n: 1.58 },
  { naziv: "dijamant", n: 2.42 },
];
export const SMJER_SVJETLOSTI = ["u_sredstvo", "iz_sredstva"];
export const PREDVIDI = ["f", "lambda", "v", "T", "boja"];
export const IZRACUNAJ = ["lambda_s", "v", "f"];

// Boja po valnoj duljini u zraku (rasponi iz prijedloga; svih pet zadataka V18 se uklapa)
const BOJE = [
  { ime: "ljubičasta", korijen: "ljubičast", do: 450 },
  { ime: "plava", korijen: "plav", do: 495 },
  { ime: "zelena", korijen: "zelen", do: 570 },
  { ime: "žuta", korijen: "žut", do: 590 },
  { ime: "narančasta", korijen: "narančast", do: 620 },
  { ime: "crvena", korijen: "crven", do: Infinity },
];
export const bojaIme = (nm) => BOJE.find((b) => nm < b.do).ime;

// Približna RGB boja svjetlosti valne duljine nm (380–780), kao "#rrggbb"
export function lambdaRGB(nm) {
  const l = Math.min(780, Math.max(380, nm));
  let r = 0;
  let g = 0;
  let b = 0;
  if (l < 440) {
    r = (440 - l) / 60;
    b = 1;
  } else if (l < 490) {
    g = (l - 440) / 50;
    b = 1;
  } else if (l < 510) {
    g = 1;
    b = (510 - l) / 20;
  } else if (l < 580) {
    r = (l - 510) / 70;
    g = 1;
  } else if (l < 645) {
    r = 1;
    g = (645 - l) / 65;
  } else r = 1;
  // rubovi vidljivog su tamniji, ali ne toliko da se val ne vidi
  const k =
    l > 700
      ? 0.55 + (0.45 * (780 - l)) / 80
      : l < 420
        ? 0.55 + (0.45 * (l - 380)) / 40
        : 1;
  const h = (x) =>
    Math.round(255 * (x * k) ** 0.8)
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Fizika prijelaza: lijevo je prvo sredstvo (odakle svjetlost dolazi), desno drugo. lambda je uvijek valna duljina u
// zraku (nm). stanje: {lambda, n} (klizači u „istrazi“).
export function fizikaSredstva(s, st = {}) {
  const lambda = isNum(st.lambda) ? st.lambda : s.lambda;
  const n = isNum(st.n) ? st.n : s.sredstvo?.n;
  const naziv =
    isNum(st.n) && st.n !== s.sredstvo?.n
      ? (SREDSTVA.find((x) => Math.abs(x.n - st.n) < 1e-9)?.naziv ?? "sredstvo")
      : (s.sredstvo?.naziv ?? "sredstvo");
  const f = C_SVJ / (lambda * 1e-9);
  const zrak = { naziv: "zrak", n: 1, lambda, v: C_SVJ };
  const sred = { naziv, n, lambda: lambda / n, v: C_SVJ / n };
  const uSredstvo = (s.smjer ?? "u_sredstvo") === "u_sredstvo";
  return {
    lambda,
    n,
    f,
    T: 1 / f,
    boja: bojaIme(lambda),
    rgb: lambdaRGB(lambda),
    lijevo: uSredstvo ? zrak : sred,
    desno: uSredstvo ? sred : zrak,
    uSredstvo,
  };
}

// Točni smjerovi promjene (desno u odnosu na lijevo)
export function promjene(s) {
  const fz = fizikaSredstva(s);
  const smjer = (a, b) =>
    b > a * (1 + 1e-9) ? "raste" : b < a * (1 - 1e-9) ? "pada" : "isto";
  return {
    f: "isto",
    T: "isto",
    lambda: smjer(fz.lijevo.lambda, fz.desno.lambda),
    v: smjer(fz.lijevo.v, fz.desno.v),
    boja: "ista",
  };
}

const NAZIV_VELICINE = {
  f: "frekvencija",
  T: "period",
  lambda: "valna duljina",
  v: "brzina",
  boja: "boja",
};
export const OPCIJE_PREDVIDI = {
  f: ["raste", "pada", "isto"],
  T: ["raste", "pada", "isto"],
  lambda: ["raste", "pada", "isto"],
  v: ["raste", "pada", "isto"],
  boja: ["ista", "druga"],
};

// Odgovor koji se traži u „izracunaj“: vrijednost u jedinici polja
export function trazenaVrijednost(s) {
  const fz = fizikaSredstva(s);
  if (s.pitaj === "lambda_s")
    return {
      vrijednost: fz.desno.lambda,
      jedinica: "nm",
      oznaka: "λ_s",
      naziv: `valna duljina u sredstvu (${fz.desno.naziv})`,
    };
  if (s.pitaj === "v")
    return {
      vrijednost: fz.desno.v,
      jedinica: "m/s",
      oznaka: "v",
      naziv: `brzina svjetlosti u sredstvu (${fz.desno.naziv})`,
    };
  return {
    vrijednost: fz.f,
    jedinica: "Hz",
    oznaka: "f",
    naziv: "frekvencija svjetlosti",
  };
}
const tolIzracunaj = (s, ans) =>
  isNum(s.tolerancija) ? s.tolerancija : Math.abs(ans) * 0.01;

// Tipične krive vrijednosti, računa kod iz speca
export function kriveSredstva(s) {
  const fz = fizikaSredstva(s);
  const { lambda, n } = fz;
  if (s.pitaj === "lambda_s")
    return [
      {
        vrijednost: lambda * n,
        poruka:
          "Pomnožio si s n. U sredstvu je val sporiji, pa su mu brjegovi **bliže**: $\\lambda_s = \\dfrac{\\lambda}{n}$ je manja od λ.",
      },
      {
        vrijednost: lambda,
        poruka:
          "To je valna duljina u zraku. Frekvencija ostaje ista, ali val je u sredstvu sporiji, pa se valna duljina smanji n puta.",
      },
      {
        vrijednost: (lambda / n) * 1e-9,
        poruka:
          "To je u metrima, a polje traži nanometre. Valnu duljinu u nm samo podijeli s n.",
      },
      {
        vrijednost: n / lambda,
        poruka: "Obrnuo si razlomak: $\\lambda_s = \\dfrac{\\lambda}{n}$.",
      },
    ];
  if (s.pitaj === "v")
    return [
      {
        vrijednost: C_SVJ * n,
        poruka:
          "Pomnožio si s n. Iz $n = \\dfrac{c}{v}$ slijedi $v = \\dfrac{c}{n}$: u sredstvu je svjetlost **sporija** nego u zraku.",
      },
      {
        vrijednost: C_SVJ,
        poruka:
          "To je brzina svjetlosti u zraku. U sredstvu indeksa loma n svjetlost je n puta sporija.",
      },
      {
        vrijednost: C_SVJ / n / 1000,
        poruka: "To je u km/s, a polje traži m/s.",
      },
    ];
  return [
    {
      vrijednost: C_SVJ / ((lambda * 1e-9) / n),
      poruka:
        "Uzeo si valnu duljinu u sredstvu, a uz c ide valna duljina u zraku: $f = \\dfrac{c}{\\lambda}$ (ili $f = \\dfrac{v}{\\lambda_s}$).",
    },
    {
      vrijednost: C_SVJ / lambda,
      poruka: "Nanometre nisi pretvorio u metre: 1 nm = 10⁻⁹ m.",
    },
    {
      vrijednost: C_SVJ / (lambda * 1e-9) / n,
      poruka:
        "Frekvencija se pri ulasku u sredstvo **ne mijenja**: $f = \\dfrac{c}{\\lambda}$ s valnom duljinom u zraku.",
    },
    {
      vrijednost: (lambda * 1e-9) / C_SVJ,
      poruka: "Obrnuo si razlomak: $f = \\dfrac{c}{\\lambda}$.",
    },
  ];
}

// Što je skriveno („?“ u tablici, val u drugom sredstvu)
export function skrivenoSredstva(s, otkriveno = false) {
  const sk = { valDesno: false, desno: [], oba: [] };
  if (otkriveno) return sk;
  if (s.nacin === "predvidi") {
    sk.valDesno = true;
    sk.desno = ["f", "T", "lambda", "v", "boja"];
  }
  if (s.nacin === "izracunaj") {
    if (s.pitaj === "lambda_s" || s.pitaj === "v") sk.desno = ["lambda", "v"];
    if (s.pitaj === "f") sk.oba = ["f", "T"];
  }
  return sk;
}

// Redovi tablice očitanja: {kljuc, oznaka, lijevo, desno} (null = skriveno „?“)
export function tablicaSredstva(s, st = {}, otkriveno = false) {
  const fz = fizikaSredstva(s, st);
  const sk = skrivenoSredstva(s, otkriveno);
  const red = (kljuc, oznaka, l, d) => ({
    kljuc,
    oznaka,
    lijevo: sk.oba.includes(kljuc) ? null : l,
    desno: sk.oba.includes(kljuc) || sk.desno.includes(kljuc) ? null : d,
  });
  const nm = (x) => `${formatSci(x, 3)}\u00a0nm`;
  const ms = (x) => `${formatSci(x, 3)}\u00a0m/s`;
  const redovi = [red("f", "f", fTekst(fz.f), fTekst(fz.f))];
  if (s.nacin === "predvidi" && (s.pitaj ?? []).includes("T"))
    redovi.push(
      red(
        "T",
        "T",
        `${formatSci(fz.T, 3)}\u00a0s`,
        `${formatSci(fz.T, 3)}\u00a0s`,
      ),
    );
  redovi.push(red("lambda", "λ", nm(fz.lijevo.lambda), nm(fz.desno.lambda)));
  redovi.push(red("v", "v", ms(fz.lijevo.v), ms(fz.desno.v)));
  redovi.push(red("boja", "boja", fz.boja, fz.boja));
  return { redovi, lijevo: fz.lijevo, desno: fz.desno, rgb: fz.rgb };
}

// Raspored scene „sredstvo“ (viewBox 360 × 200). Val je usporen; period na crtežu raste s valnom duljinom (crvena
// titra sporije od ljubičaste), ali omjer λ i brzina u dva sredstva je točan.
export const SREDSTVO = {
  vb: [360, 200],
  granica: 180,
  y: 100,
  A: 30,
  pxPoNm: 0.13,
  vrata: [90, 270],
  xMin: 6,
  xMax: 354,
};
export const periodCrteza = (lambda) => 1.7 * (lambda / 550);

// Geometrija: krivulje vala lijevo i desno, brjegovi, strelice λ i v, bljesak na „vratima“ (točke gdje se broje
// brjegovi). stanje: {t (s), lambda, n, tUlaz (s, kad je val ušao u drugo sredstvo; null = već je posvuda), otkriveno}
export function sredstvoCrtez(
  s,
  { t = 0, lambda, n, tUlaz = null, otkriveno = false } = {},
) {
  const fz = fizikaSredstva(s, { lambda, n });
  const sk = skrivenoSredstva(s, otkriveno);
  const { granica: g, y: Y, A, pxPoNm, vrata, xMin, xMax } = SREDSTVO;
  const T = periodCrteza(fz.lambda);
  const l1 = fz.lijevo.lambda * pxPoNm;
  const l2 = fz.desno.lambda * pxPoNm;
  const w = (2 * Math.PI * t) / T;
  const faza = (x) =>
    x <= g
      ? (2 * Math.PI * x) / l1
      : (2 * Math.PI * g) / l1 + (2 * Math.PI * (x - g)) / l2;
  const front = sk.valDesno
    ? g
    : tUlaz == null
      ? xMax
      : Math.min(xMax, g + (l2 / T) * Math.max(0, t - tUlaz));
  const yy = (x) => r1(Y - A * Math.sin(faza(x) - w));
  const putL = [];
  for (let x = xMin; x <= g; x += 2) putL.push([x, yy(x)]);
  putL.push([g, yy(g)]);
  const putD = [];
  if (front > g) {
    for (let x = g; x <= front; x += 1.5) putD.push([r1(x), yy(x)]);
    putD.push([r1(front), yy(front)]);
  }
  // brjegovi: faza(x) − w = π/2 + 2πm
  const brjegovi = [];
  for (let m = -40; m < 80; m++) {
    const fi = Math.PI / 2 + 2 * Math.PI * m + w;
    let x = (fi * l1) / (2 * Math.PI);
    if (x > g) x = g + ((fi - (2 * Math.PI * g) / l1) * l2) / (2 * Math.PI);
    if (x >= xMin && x <= Math.min(front, xMax)) brjegovi.push([r1(x), Y - A]);
  }
  const vrataOut = vrata.map((x) => ({
    x,
    vidljiva: x <= front,
    bljesak:
      x > front
        ? 0
        : r1(Math.max(0, Math.cos(faza(x) - w - Math.PI / 2)) ** 12 * 100) /
          100,
  }));
  const yL = Y - A - 16;
  const yV = Y + A + 22;
  const vL = 64;
  const strelice = [
    {
      vrsta: "lambda",
      strana: "lijevo",
      x1: r1(vrata[0] - l1 / 2),
      x2: r1(vrata[0] + l1 / 2),
      y: yL,
    },
    {
      vrsta: "v",
      strana: "lijevo",
      x1: r1(vrata[0] - vL / 2),
      x2: r1(vrata[0] - vL / 2 + vL / fz.lijevo.n),
      y: yV,
    },
  ];
  if (!sk.valDesno) {
    strelice.push({
      vrsta: "lambda",
      strana: "desno",
      x1: r1(vrata[1] - l2 / 2),
      x2: r1(vrata[1] + l2 / 2),
      y: yL,
    });
    strelice.push({
      vrsta: "v",
      strana: "desno",
      x1: r1(vrata[1] - vL / 2),
      x2: r1(vrata[1] - vL / 2 + vL / fz.desno.n),
      y: yV,
    });
  }
  return {
    putL,
    putD,
    brjegovi,
    vrata: vrataOut,
    strelice,
    boja: fz.rgb,
    lijevo: fz.lijevo,
    desno: fz.desno,
    period: T,
    front: r1(front),
  };
}

function checkPredvidi(s, odg) {
  const pitaj = s.pitaj ?? [];
  if (
    !odg ||
    typeof odg !== "object" ||
    pitaj.some((k) => !OPCIJE_PREDVIDI[k].includes(odg[k]))
  )
    return {
      tocno: false,
      poruka: "Odaberi odgovor za svaku veličinu.",
      prazno: true,
    };
  const tocno = promjene(s);
  const krive = pitaj.filter((k) => odg[k] !== tocno[k]);
  if (!krive.length) return { tocno: true };
  const k = krive[0];
  // načelo bez smjera promjene (inače bi poruka odala odgovor koji vrijedi i za blizanca)
  const PORUKE = {
    f: "Koliko brjegova u sekundi **uđe** u granicu, toliko ih mora i **izaći**: ne mogu se nigdje nagomilati ni izgubiti. Što to znači za frekvenciju?",
    T: "Period je $T = \\dfrac{1}{f}$: mijenja se samo ako se mijenja frekvencija. Prvo odluči što je s frekvencijom.",
    lambda:
      "Valna duljina je $\\lambda = \\dfrac{v}{f}$. Usporedi brzinu i frekvenciju s obje strane granice.",
    v: "Brzina svjetlosti u sredstvu indeksa loma n je $v = \\dfrac{c}{n}$, a u zraku (n ≈ 1) gotovo c. Usporedi n s jedne i s druge strane granice.",
    boja: "Boju određuje **frekvencija**, a ne valna duljina. Što se na granici događa s frekvencijom?",
  };
  return {
    tocno: false,
    poruka: `Nije sve točno. **${NAZIV_VELICINE[k][0].toUpperCase()}${NAZIV_VELICINE[k].slice(1)}:** ${PORUKE[k]}`,
    krive,
  };
}

function checkIzracunaj(s, odgovor) {
  const t = trazenaVrijednost(s);
  const tol = tolIzracunaj(s, t.vrijednost);
  return checkNumber({
    input: odgovor,
    answer: t.vrijednost,
    tol,
    unit: t.jedinica,
    krivo: [...(s.krivo ?? []), ...kriveSredstva(s)],
    savjet: s.savjet,
  });
}

// Riječ boje u tekstu mora odgovarati valnoj duljini (npr. „zelena svjetlost 520 nm“)
function bojeUTekstu(tekst) {
  const t = ` ${String(tekst ?? "")
    .toLowerCase()
    .replace(/infracrven|ultraljubičast/g, "")}`;
  return BOJE.filter((b) => new RegExp(`[^a-zčćžšđ]${b.korijen}`).test(t));
}

// ══ OPIS I PRIMJERI ═════════════════════════════════════════════════════════════════════════════════
const OPIS = `Elektromagnetski val (fizika, matura): polja E i B u prostoru, spektar i svjetlost u sredstvu. tekst, scena, nacin, savjet? (poruka za ostale krive odgovore). c = 3·10⁸ m/s.
Scene i načini („istrazi“ = učenik se igra, „prikaz“ = samo animacija, oboje POGLEDAJ; ostalo je Tvoj red):
- "polja": val u prostoru (kosa projekcija; učenik vuče crtež lijevo-desno i zakreće pogled). Osi: "gore-dolje", "istok-zapad", "sjever-jug". smjer_sirenja: "istok" | "zapad" | "sjever" | "jug" | "gore" | "dolje"; E i/ili B: os titranja (B se računa sam: okomit na E i na smjer širenja). E crveno, B plavo.
  - "istrazi" / "prikaz": smjer_sirenja + E (ili B). U „istrazi“ učenik mijenja i smjer širenja i os E.
  - "odaberi": trazi? "B" (zadano; spec ima smjer_sirenja + E) | "E" (smjer_sirenja + B) | "smjer" (E + B, smjer_sirenja? za animaciju nakon odgovora). Traženo se ne crta; učenik dodirne os (ili gumb s nazivom osi). Poruke za os drugog polja i os širenja dodaju se same.
- "spektar": traka od radiovalova (lijevo) do gama-zračenja (desno), log skala, os λ dolje i os f gore, vidljivo povećano ispod. Granice: radio > 1 m, mikro 1 mm–1 m, IC 700 nm–1 mm, vidljivo 400–700 nm, UV 10–400 nm, rendgen 0,01–10 nm, gama < 0,01 nm. Zadaje se f (Hz) ili lambda (u METRIMA, npr. 2.5e-7), od 10⁻¹² do 10³ m; za Tvoj red ne bliže od 10 % granici područja.
  - "istrazi": f ili lambda? za početni položaj; učenik vuče oznaku (uživo λ, f, područje), gumbi s uređajima.
  - "prikaz": f ili lambda; oznaka stoji, istaknuto je područje i susjedi.
  - "smjesti": f ili lambda; učenik vuče oznaku na valnu duljinu (oznaka skače po „lijepim“ vrijednostima, fino strelicama). Točno unutar ±12 % (0,05 dekade). Os f je skrivena kad je zadana f. Poruke za f/c i pogrešnu potenciju (cm, mm, µm, nm) dodaju se same; ${KRIVO_OPIS} (vrijednost je λ u m). Nakon točnog zasvijetle područje i susjedi.
  - "odaberi_podrucje": f ili lambda; učenik dodirne područje. Poruke za f/c, jedinicu i susjedno područje dodaju se same.
- "sredstvo": svjetlost iz zraka ulazi u sredstvo (ili izlazi iz njega): lambda (valna duljina u ZRAKU, nm, 380–750), sredstvo: {naziv, n (1,1–3)}, smjer? "u_sredstvo" (zadano) | "iz_sredstva", boja? (ime boje; mora odgovarati λ: ljubičasta < 450, plava < 495, zelena < 570, žuta < 590, narančasta < 620, crvena). Brjegovi se u sredstvu zbiju (λ/n) i idu sporije (c/n), boja ostaje; na dvije točke bljeskaju brjegovi koji prolaze (jednako često). Tablica f, λ, v, boja s obje strane.
  - "istrazi": klizači n (s gumbima voda, led, staklo, plastika, dijamant) i λ.
  - "prikaz": samo animacija i tablica.
  - "predvidi": pitaj: popis od "f", "lambda", "v", "T", "boja"; učenik za svaku bira raste / pada / isto (boja: ista / druga). Val u drugom sredstvu i njegove vrijednosti vide se tek nakon točnog odgovora. Poruke se računaju same.
  - "izracunaj": samo "u_sredstvo"; pitaj: "lambda_s" (nm) | "v" (m/s) | "f" (Hz); tolerancija? (apsolutna, zadano 1 %). Krive vrijednosti λ·n, λ, m umjesto nm, c·n, c, km/s, f s λ_s, nm nepretvoreni… dodaju se same; ${KRIVO_OPIS}.`;

const PRIMJER = {
  tip: TIP,
  scena: "polja",
  nacin: "odaberi",
  smjer_sirenja: "istok",
  E: "gore-dolje",
  trazi: "B",
  tekst:
    "Antena odašilje elektromagnetski val koji se širi **prema istoku**, a električno polje titra **gore-dolje**. Dodirni os po kojoj titra **magnetsko** polje.",
};

const PRIMJERI = [
  {
    tip: TIP,
    scena: "polja",
    nacin: "istrazi",
    smjer_sirenja: "sjever",
    E: "gore-dolje",
    tekst:
      "Val se širi prema sjeveru, električno polje titra gore-dolje. **Zakreni crtež** i promijeni smjer širenja: gdje je uvijek magnetsko polje?",
  },
  {
    tip: TIP,
    scena: "polja",
    nacin: "odaberi",
    smjer_sirenja: "gore",
    E: "sjever-jug",
    tekst:
      "Val se širi **uvis**, a električno polje titra **sjever-jug**. Dodirni os po kojoj titra magnetsko polje.",
  },
  {
    tip: TIP,
    scena: "polja",
    nacin: "odaberi",
    trazi: "smjer",
    E: "gore-dolje",
    B: "istok-zapad",
    smjer_sirenja: "jug",
    tekst:
      "U nekoj točki električno polje titra **gore-dolje**, a magnetsko **istok-zapad**. Dodirni os po kojoj se val širi.",
  },
  {
    tip: TIP,
    scena: "polja",
    nacin: "prikaz",
    smjer_sirenja: "zapad",
    E: "sjever-jug",
    tekst:
      "Val se širi prema zapadu, E titra sjever-jug, pa B titra gore-dolje.",
  },
  {
    tip: TIP,
    scena: "spektar",
    nacin: "smjesti",
    f: 2.5e9,
    tekst:
      "Mikrovalna pećnica grije hranu zračenjem frekvencije $2{,}5\\cdot10^{9}$ Hz. Izračunaj valnu duljinu i **povuci oznaku** na nju.",
  },
  {
    tip: TIP,
    scena: "spektar",
    nacin: "istrazi",
    lambda: 5e-7,
    tekst:
      "Vuci oznaku po spektru i gledaj kako se mijenjaju valna duljina i frekvencija. Isprobaj i uređaje ispod.",
  },
  {
    tip: TIP,
    scena: "spektar",
    nacin: "odaberi_podrucje",
    f: 3e14,
    tekst:
      "Daljinski upravljač šalje zračenje frekvencije $3\\cdot10^{14}$ Hz. **Dodirni područje** spektra kojem to zračenje pripada.",
  },
  {
    tip: TIP,
    scena: "spektar",
    nacin: "smjesti",
    f: 1.2e15,
    tekst:
      "Lampa za dezinfekciju vode šalje zračenje frekvencije $1{,}2\\cdot10^{15}$ Hz. Povuci oznaku na valnu duljinu tog zračenja.",
  },
  {
    tip: TIP,
    scena: "spektar",
    nacin: "prikaz",
    f: 6e18,
    tekst:
      "Rendgenski uređaj: $f = 6\\cdot10^{18}$ Hz, pa je $\\lambda = 0{,}05$ nm, između ultraljubičastog i gama-zračenja.",
  },
  {
    tip: TIP,
    scena: "sredstvo",
    nacin: "predvidi",
    lambda: 520,
    sredstvo: { naziv: "voda", n: 1.33 },
    pitaj: ["f", "lambda", "v", "boja"],
    tekst:
      "Zelena svjetlost valne duljine 520 nm iz zraka ulazi u vodu. Što se pritom događa s ovim veličinama?",
  },
  {
    tip: TIP,
    scena: "sredstvo",
    nacin: "izracunaj",
    lambda: 660,
    sredstvo: { naziv: "staklo", n: 1.5 },
    pitaj: "lambda_s",
    tekst:
      "Crvena svjetlost valne duljine 660 nm iz zraka uđe u staklo indeksa loma 1,5. Kolika je njezina valna duljina u staklu?",
  },
  {
    tip: TIP,
    scena: "sredstvo",
    nacin: "istrazi",
    lambda: 580,
    sredstvo: { naziv: "dijamant", n: 2.42 },
    tekst:
      "Žuta svjetlost ulazi u dijamant. Mijenjaj **indeks loma** i **valnu duljinu**: što se mijenja, a što ostaje isto?",
  },
  {
    tip: TIP,
    scena: "sredstvo",
    nacin: "izracunaj",
    lambda: 470,
    sredstvo: { naziv: "led", n: 1.31 },
    pitaj: "v",
    tekst:
      "Plava svjetlost iz zraka uđe u led indeksa loma 1,31. Kolikom brzinom putuje kroz led?",
  },
  {
    tip: TIP,
    scena: "sredstvo",
    nacin: "predvidi",
    lambda: 610,
    sredstvo: { naziv: "plastika", n: 1.58 },
    smjer: "iz_sredstva",
    pitaj: ["f", "lambda", "v", "boja"],
    tekst:
      "Narančasta svjetlost **izlazi** iz plastike u zrak. Što se pritom događa s ovim veličinama?",
  },
  {
    tip: TIP,
    scena: "sredstvo",
    nacin: "prikaz",
    lambda: 610,
    sredstvo: { naziv: "plastika", n: 1.58 },
    tekst:
      "Narančasta svjetlost u plastici: brjegovi su 1,58 puta bliže, a boja je ista.",
  },
];

// ══ VALIDACIJA ══════════════════════════════════════════════════════════════════════════════════════
const POLJA_SCENE = {
  polja: ["smjer_sirenja", "E", "B", "trazi"],
  spektar: ["f", "lambda"],
  sredstvo: ["lambda", "sredstvo", "smjer", "boja", "pitaj", "tolerancija"],
};

function validatePolja(s, need) {
  const ima = (k) => s[k] != null;
  if (ima("smjer_sirenja"))
    need(
      SMJEROVI.includes(s.smjer_sirenja),
      `smjer_sirenja mora biti jedan od: ${SMJEROVI.join(", ")}`,
    );
  for (const k of ["E", "B"])
    if (ima(k))
      need(OSI.includes(s[k]), `${k} mora biti os: ${OSI.join(", ")}`);
  if (ima("trazi"))
    need(
      s.nacin === "odaberi" && TRAZI.includes(s.trazi),
      `trazi postoji samo u „odaberi“ i mora biti: ${TRAZI.join(", ")}`,
    );
  if (ima("smjer_sirenja") && SMJEROVI.includes(s.smjer_sirenja)) {
    const os = osSmjera(s.smjer_sirenja);
    if (OSI.includes(s.E))
      need(
        s.E !== os,
        `E ne može titrati po osi širenja (${os}): EM val je transverzalni`,
      );
    if (OSI.includes(s.B))
      need(
        s.B !== os,
        `B ne može titrati po osi širenja (${os}): EM val je transverzalni`,
      );
  }
  if (OSI.includes(s.E) && OSI.includes(s.B))
    need(s.E !== s.B, "E i B ne mogu titrati po istoj osi");
  const t = trazenoPolje(s);
  if (s.nacin === "odaberi" && t === "B") {
    need(
      ima("smjer_sirenja") && ima("E"),
      "odaberi (trazi B) treba smjer_sirenja i E",
    );
    need(!ima("B"), "odaberi (trazi B): B je odgovor, ne smije biti u specu");
  } else if (s.nacin === "odaberi" && t === "E") {
    need(
      ima("smjer_sirenja") && ima("B"),
      "odaberi (trazi E) treba smjer_sirenja i B",
    );
    need(!ima("E"), "odaberi (trazi E): E je odgovor, ne smije biti u specu");
  } else if (s.nacin === "odaberi" && t === "smjer") {
    need(ima("E") && ima("B"), "odaberi (trazi smjer) treba E i B");
  } else {
    need(
      ima("smjer_sirenja") && (ima("E") || ima("B")),
      `${s.nacin} treba smjer_sirenja i E (ili B)`,
    );
  }
}

function validateSpektar(s, need) {
  const imaF = s.f != null;
  const imaL = s.lambda != null;
  if (s.nacin === "istrazi")
    need(
      !(imaF && imaL),
      "istrazi: najviše jedno od f i lambda (početni položaj oznake)",
    );
  else
    need(
      imaF !== imaL,
      `${s.nacin} treba točno jedno od: f (Hz) ili lambda (m)`,
    );
  if (imaF) need(isNum(s.f) && s.f > 0, "f mora biti pozitivan broj (Hz)");
  if (imaL)
    need(
      isNum(s.lambda) && s.lambda > 0,
      "lambda mora biti pozitivan broj (u metrima, npr. 2.5e-7)",
    );
  const l = zadanaLambda(s);
  if (!isNum(l) || l <= 0) return;
  need(
    l >= 10 ** LG_MIN_OZNAKE && l <= 10 ** LG_MAX_OZNAKE,
    `valna duljina ${lambdaMTekst(l)} je izvan crteža (10⁻¹² m do 10³ m, tj. f od 3·10⁵ do 3·10²⁰ Hz)`,
  );
  if (s.nacin !== "istrazi")
    for (const g of GRANICE)
      need(
        Math.abs(l / g - 1) > 0.1,
        `valna duljina ${lambdaTekst(l)} je preblizu granici područja (${lambdaTekst(g)}), pa je odgovor dvosmislen`,
      );
  if (s.nacin === "smjesti") {
    validateKrivo(s.krivo, null, 0, need);
    (s.krivo ?? []).forEach((k, i) => {
      if (isNum(k?.vrijednost)) {
        need(
          k.vrijednost > 0,
          `krivo[${i}].vrijednost mora biti valna duljina u m (> 0)`,
        );
        if (k.vrijednost > 0)
          need(
            Math.abs(lg(k.vrijednost / l)) > 0.05,
            `krivo[${i}].vrijednost je (unutar 12 %) točna valna duljina`,
          );
      }
    });
  } else need(s.krivo == null, "krivo postoji samo u „smjesti“");
}

function validateSredstvo(s, need) {
  need(
    isNum(s.lambda) && s.lambda >= 380 && s.lambda <= 750,
    "lambda mora biti valna duljina vidljive svjetlosti u zraku, 380–750 (nm)",
  );
  const sr = s.sredstvo;
  if (need(sr && typeof sr === "object", "sredstvo mora biti {naziv, n}")) {
    need(isText(sr.naziv), "sredstvo.naziv mora biti tekst (npr. „voda“)");
    need(
      isNum(sr.n) && sr.n >= 1.1 && sr.n <= 3,
      "sredstvo.n mora biti indeks loma od 1,1 do 3",
    );
  }
  if (s.smjer != null)
    need(
      SMJER_SVJETLOSTI.includes(s.smjer),
      `smjer mora biti ${SMJER_SVJETLOSTI.join(" ili ")}`,
    );
  if (isNum(s.lambda) && s.lambda >= 380 && s.lambda <= 750) {
    const ime = bojaIme(s.lambda);
    if (s.boja != null)
      need(
        s.boja === ime,
        `boja „${s.boja}“ ne odgovara valnoj duljini ${formatNumber(s.lambda)} nm (to je ${ime})`,
      );
    const uTekstu = bojeUTekstu(s.tekst);
    if (uTekstu.length === 1)
      need(
        uTekstu[0].ime === ime,
        `tekst kaže da je svjetlost ${uTekstu[0].ime}, a ${formatNumber(s.lambda)} nm je ${ime}`,
      );
  }
  if (s.nacin === "predvidi") {
    need(
      Array.isArray(s.pitaj) &&
        s.pitaj.length >= 1 &&
        s.pitaj.every((k) => PREDVIDI.includes(k)) &&
        new Set(s.pitaj).size === s.pitaj.length,
      `predvidi: pitaj mora biti popis različitih veličina od: ${PREDVIDI.join(", ")}`,
    );
    need(
      s.krivo == null && s.tolerancija == null,
      "predvidi nema krivo ni tolerancija",
    );
  } else if (s.nacin === "izracunaj") {
    need(
      IZRACUNAJ.includes(s.pitaj),
      `izracunaj: pitaj mora biti jedno od: ${IZRACUNAJ.join(", ")}`,
    );
    need(
      (s.smjer ?? "u_sredstvo") === "u_sredstvo",
      "izracunaj postoji samo za smjer u_sredstvo",
    );
    if (s.tolerancija != null)
      need(
        isNum(s.tolerancija) && s.tolerancija > 0,
        "tolerancija mora biti pozitivan broj (u jedinici odgovora)",
      );
    if (IZRACUNAJ.includes(s.pitaj) && isNum(s.lambda) && isNum(sr?.n)) {
      const t = trazenaVrijednost(s);
      validateKrivo(s.krivo, t.vrijednost, tolIzracunaj(s, t.vrijednost), need);
    }
  } else need(s.pitaj == null, `${s.nacin} nema pitaj`);
}

// ══ WIDGET ══════════════════════════════════════════════════════════════════════════════════════════
export const em_val = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (jeGledanje(s) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  poljaOsi,
  fizikaSredstva,
  validate(s) {
    const { list, need } = problems();
    need(isText(s.tekst), "em_val treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `em_val.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return list;
    if (
      !need(
        NACINI[s.scena].includes(s.nacin),
        `em_val.nacin za scenu ${s.scena} mora biti jedan od: ${NACINI[s.scena].join(", ")}`,
      )
    )
      return list;
    const svoja = POLJA_SCENE[s.scena];
    for (const [scena, polja] of Object.entries(POLJA_SCENE))
      if (scena !== s.scena)
        for (const p of polja)
          if (!svoja.includes(p))
            need(
              !(p in s),
              `polje „${p}“ ne postoji u sceni ${s.scena} (polja scene: ${svoja.join(", ")})`,
            );
    if (jeGledanje(s)) noAnswerFields(s, need);
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    if (s.scena === "polja") validatePolja(s, need);
    if (s.scena === "spektar") validateSpektar(s, need);
    if (s.scena === "sredstvo") validateSredstvo(s, need);
    return list;
  },
  check(s, odgovor) {
    if (s.scena === "polja" && s.nacin === "odaberi")
      return checkPolja(s, odgovor);
    if (s.scena === "spektar" && s.nacin === "smjesti")
      return checkSmjesti(s, odgovor);
    if (s.scena === "spektar" && s.nacin === "odaberi_podrucje")
      return checkPodrucje(s, odgovor);
    if (s.scena === "sredstvo" && s.nacin === "predvidi")
      return checkPredvidi(s, odgovor);
    if (s.scena === "sredstvo" && s.nacin === "izracunaj")
      return checkIzracunaj(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.scena === "polja" && s.nacin === "odaberi") {
      const os = tocnaOs(s);
      const t = trazenoPolje(s);
      return t === "smjer"
        ? `val se širi po osi ${os}`
        : `${t === "B" ? "magnetsko" : "električno"} polje titra ${os}`;
    }
    if (
      s.scena === "spektar" &&
      (s.nacin === "smjesti" || s.nacin === "odaberi_podrucje")
    ) {
      const l = zadanaLambda(s);
      const p = podrucje(l);
      const nm = l >= 1e-6 && l < 1e-5 ? ` = ${formatNumber(l * 1e9)} nm` : "";
      const racun = isNum(s.f)
        ? `λ = c/f = ${lambdaMTekst(l)} = ${lambdaTekst(l)}${nm}`
        : `λ = ${lambdaTekst(l)}${nm}`;
      return `${racun}; ${p.naziv}, ${izmeduTekst(p.id)}`;
    }
    if (s.scena === "sredstvo" && s.nacin === "predvidi") {
      const p = promjene(s);
      const fz = fizikaSredstva(s);
      const RIJEC = {
        raste: "se poveća",
        pada: "se smanji",
        isto: "ostaje ista",
        ista: `ostaje ista (${fz.boja})`,
      };
      return (s.pitaj ?? [])
        .map((k) => {
          if (k === "lambda")
            return `valna duljina ${RIJEC[p.lambda]} (${formatSci(fz.lijevo.lambda, 3)} nm → ${formatSci(fz.desno.lambda, 3)} nm)`;
          if (k === "T")
            return `period ${p.T === "isto" ? "ostaje isti" : RIJEC[p.T]}`;
          return `${NAZIV_VELICINE[k]} ${RIJEC[p[k]]}`;
        })
        .join("; ");
    }
    if (s.scena === "sredstvo" && s.nacin === "izracunaj") {
      const t = trazenaVrijednost(s);
      const fz = fizikaSredstva(s);
      const iznos = `${formatSci(t.vrijednost, 3)} ${t.jedinica}`;
      if (s.pitaj === "lambda_s")
        return `λ_s = λ/n = ${formatNumber(fz.lambda)} nm / ${formatNumber(fz.n)} ≈ ${iznos}`;
      if (s.pitaj === "v")
        return `v = c/n = 3·10⁸ m/s / ${formatNumber(fz.n)} ≈ ${iznos}`;
      return `f = c/λ = 3·10⁸ m/s / ${formatSci(fz.lambda * 1e-9, 3)} m ≈ ${iznos}`;
    }
    return "";
  },
};
