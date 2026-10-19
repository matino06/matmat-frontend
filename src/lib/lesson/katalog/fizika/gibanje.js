// gibanje: kinematika jednog ili dvaju tijela (staza, okomito, hitac u ravnini) s animacijom, tragovima, strelicama
// v i a i povezanim grafovima s–t, v–t, a–t. Položaj i brzina računaju se analitički po dionicama stalne
// akceleracije (modelGibanja); isti model crta komponenta, a koristi ga i provjera („zaustavi“: trenuci u kojima
// je uvjet ispunjen; „postavi“: ishod gibanja za vrijednosti klizača).
import { isNum, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  withUnit,
} from "../zajednicko.js";
import {
  ID,
  izracunaj,
  provjeriVrijednost,
  provjeriKlizace,
  varijable,
  vrijednostiKlizaca,
  pocetniParametri,
  korijeni,
  lijepRaspon,
} from "./_kinematika.js";

export { pocetniParametri };

const NACINI = ["istrazi", "zaustavi", "postavi"];
const PROSTORI = ["staza", "vertikalno", "ravnina"];
export const IKONE = ["tocka", "auto", "lopta", "paket"];
const G = 9.81;
const T_MAX = 300;
const ZAUSTAVLJANJE = "zaustavljanje";

const ravnina = (s) => s.prostor === "ravnina";
export const gOd = (s) => (isNum(s.g) ? s.g : G);

// Veličine: oznaka na crtežu i u porukama, jedinica. U okomitom smjeru položaj je visina h.
export function velicine(s) {
  if (ravnina(s))
    return {
      x: { oznaka: "x", jedinica: "m" },
      y: { oznaka: "y", jedinica: "m" },
      vx: { oznaka: "vₓ", jedinica: "m/s" },
      vy: { oznaka: "v_y", jedinica: "m/s" },
      v: { oznaka: "v", jedinica: "m/s" },
      a: { oznaka: "a", jedinica: "m/s²" },
    };
  return {
    s: { oznaka: s.prostor === "vertikalno" ? "h" : "s", jedinica: "m" },
    v: { oznaka: "v", jedinica: "m/s" },
    a: { oznaka: "a", jedinica: "m/s²" },
  };
}
export const VRSTE_GRAFA = {
  staza: ["s-t", "v-t", "a-t"],
  vertikalno: ["s-t", "v-t", "a-t"],
  ravnina: ["x-t", "y-t", "vx-t", "vy-t"],
};
const BROJACI = {
  staza: ["t", "s", "v", "v_kmh", "a"],
  vertikalno: ["t", "s", "v", "a"],
  ravnina: ["t", "x", "y", "vx", "vy", "v"],
};
export const zadaniBrojaci = (s) =>
  s.brojaci ?? (ravnina(s) ? ["t", "x", "y", "v"] : ["t", "s", "v"]);
const CILJ_ZAUSTAVI = {
  staza: ["s", "v", "susret"],
  vertikalno: ["s", "v", "susret"],
  ravnina: ["x", "y", "vx", "vy", "v"],
};
const CILJ_POSTAVI = {
  staza: ["kraj", "s", "v", "susret"],
  vertikalno: ["h_max", "vrijeme_leta", "s", "v"],
  ravnina: ["domet", "h_max", "vrijeme_leta", "x", "y", "v"],
};

// ── model ─────────────────────────────────────────────────────────────────────────────────────────
// Tijelo u 1D: dionice {do, a}; „do“ je kraj dionice (s) ili "zaustavljanje" (traje dok v ne padne na 0, pa tijelo
// miruje). Nakon zadnje dionice: na stazi a = 0, okomito slobodni let (a = −g). Okomito i u ravnini tijelo stane
// kad padne na tlo (h = 0, y = 0).
function tijelo1D(t, s, p, g) {
  const vert = s.prostor === "vertikalno";
  const aZad = vert ? -g : 0;
  let [tt, x, v] = [0, izracunaj(t.s0, p, 0), izracunaj(t.v0, p, 0)];
  const segs = [];
  let krajDionica = null;
  let greska = null;
  for (const d of t.dionice ?? []) {
    const a = izracunaj(d.a, p, aZad);
    let t1;
    if (d.do === ZAUSTAVLJANJE)
      t1 =
        Math.abs(v) < 1e-12 ? tt : a * v < 0 ? tt + Math.abs(v / a) : Infinity;
    else t1 = izracunaj(d.do, p, NaN);
    if (!Number.isFinite(t1) || t1 < tt) {
      greska =
        d.do === ZAUSTAVLJANJE
          ? 'dionica "zaustavljanje" nikad ne završi (akceleracija mora biti suprotna brzini)'
          : "kraj dionice nije iza kraja prethodne";
      segs.push({ t0: tt, t1: Infinity, s0: x, v0: v, a });
      break;
    }
    segs.push({ t0: tt, t1, s0: x, v0: v, a });
    const tau = t1 - tt;
    x += v * tau + (a * tau * tau) / 2;
    v = d.do === ZAUSTAVLJANJE ? 0 : v + a * tau;
    tt = t1;
    krajDionica = t1;
  }
  if (!segs.length || Number.isFinite(segs.at(-1).t1))
    segs.push({ t0: tt, t1: Infinity, s0: x, v0: v, a: aZad });

  const formula = (tm) => {
    const sg = segs.find((q) => tm < q.t1) ?? segs.at(-1);
    const tau = Math.max(0, tm - sg.t0);
    return {
      s: sg.s0 + sg.v0 * tau + (sg.a * tau * tau) / 2,
      v: sg.v0 + sg.a * tau,
      a: sg.a,
    };
  };
  // pad na tlo: najmanji τ > 0 u nekoj dionici u kojem je h = 0 i tijelo ide prema dolje
  let kraj = null;
  if (vert && s.tlo !== false) {
    for (const q of segs) {
      const taus = [];
      if (Math.abs(q.a) < 1e-12) {
        if (q.v0 < 0) taus.push(-q.s0 / q.v0);
      } else {
        const D = q.v0 * q.v0 - 2 * q.a * q.s0;
        if (D >= 0)
          taus.push((-q.v0 + Math.sqrt(D)) / q.a, (-q.v0 - Math.sqrt(D)) / q.a);
      }
      const ok = taus
        .filter(
          (tau) =>
            tau > 1e-9 &&
            q.t0 + tau <= q.t1 + 1e-12 &&
            q.v0 + q.a * tau <= 1e-9,
        )
        .sort((a, b) => a - b);
      if (ok.length) {
        kraj = q.t0 + ok[0];
        break;
      }
    }
  }
  const stanje = (tm) => {
    if (kraj != null && tm > kraj + 1e-9)
      return { s: 0, v: 0, a: 0, miruje: true };
    return formula(tm);
  };
  // točke loma grafa (početci dionica), za oštre kutove na v–t i stepenice na a–t
  const lomovi = segs.map((q) => q.t0).filter((x) => x > 0);
  return {
    dim: 1,
    id: t.id,
    naziv: t.naziv,
    ikona: t.ikona ?? "tocka",
    segs,
    kraj,
    krajDionica,
    stanje,
    lomovi,
    greska,
    s0: izracunaj(t.s0, p, 0),
  };
}

function tijelo2D(t, p, g) {
  const [x0, y0] = [izracunaj(t.x0, p, 0), izracunaj(t.y0, p, 0)];
  let vx, vy;
  if (t.v0 != null || t.kut != null) {
    const [v0, k] = [
      izracunaj(t.v0, p, 0),
      (izracunaj(t.kut, p, 0) * Math.PI) / 180,
    ];
    [vx, vy] = [v0 * Math.cos(k), v0 * Math.sin(k)];
    if (Math.abs(vx) < 1e-12) vx = 0;
  } else [vx, vy] = [izracunaj(t.vx, p, 0), izracunaj(t.vy, p, 0)];
  const kraj =
    g > 0 ? (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * y0))) / g : null;
  const formula = (tm) => {
    const vyt = vy - g * tm;
    return {
      x: x0 + vx * tm,
      y: y0 + vy * tm - (g * tm * tm) / 2,
      vx,
      vy: vyt,
      v: Math.hypot(vx, vyt),
      a: g,
    };
  };
  const stanje = (tm) => {
    if (kraj != null && tm > kraj + 1e-9)
      return {
        x: x0 + vx * kraj,
        y: 0,
        vx: 0,
        vy: 0,
        v: 0,
        a: 0,
        miruje: true,
      };
    return formula(tm);
  };
  return {
    dim: 2,
    id: t.id,
    naziv: t.naziv,
    ikona: t.ikona ?? "lopta",
    kraj,
    stanje,
    lomovi: [],
    x0,
    y0,
    vx0: vx,
    vy0: vy,
  };
}

// Cijelo gibanje za zadane vrijednosti klizača: tijela, trajanje (t_kraj ili prirodni kraj) i g.
export function modelGibanja(s, parametri = pocetniParametri(s)) {
  const g = gOd(s);
  const tijela = (s.tijela ?? []).map((t) =>
    ravnina(s) ? tijelo2D(t, parametri, g) : tijelo1D(t, s, parametri, g),
  );
  let tKraj = isNum(s.t_kraj) ? s.t_kraj : null;
  let prirodno = true;
  if (tKraj == null) {
    const krajevi = tijela
      .map((b) => b.kraj ?? b.krajDionica)
      .filter((x) => Number.isFinite(x) && x > 0);
    if (krajevi.length) tKraj = Math.max(...krajevi);
    else [tKraj, prirodno] = [10, false];
  }
  return { tijela, g, tKraj: Math.min(T_MAX, Math.max(1e-3, tKraj)), prirodno };
}

// Skupovi parametara koji pokrivaju sve što učenik može namjestiti: početak i svi kutovi raspona klizača.
function skupoviParametara(s) {
  const k = s.klizaci ?? [];
  const out = [pocetniParametri(s)];
  for (let m = 0; m < 1 << k.length; m++)
    out.push(
      Object.fromEntries(k.map((q, i) => [q.id, m & (1 << i) ? q.max : q.min])),
    );
  return out;
}

// Mreža vrijednosti klizača (najviše 7 po klizaču, uvijek s krajevima): za raspon scene, jer najveći domet kosog
// hica nije u kutu raspona (45°, a ne 10° ili 80°).
function mrezaParametara(s) {
  let out = [{}];
  for (const k of s.klizaci ?? []) {
    const n = Math.min(6, Math.round((k.max - k.min) / k.korak));
    const vr = [
      ...new Set([
        k.pocetak,
        ...Array.from(
          { length: n + 1 },
          (_, i) => k.min + ((k.max - k.min) * i) / n,
        ),
      ]),
    ];
    out = out.flatMap((p) => vr.map((v) => ({ ...p, [k.id]: v })));
  }
  return out;
}

// Raspon scene: zadan u specu (ljestvica; x i y u ravnini) ili izračunat tako da stane cijelo gibanje za sve
// vrijednosti klizača i sve crte.
export function rasponScene(s) {
  const vrijednosti = { s: [0], x: [0], y: [0] };
  for (const p of mrezaParametara(s)) {
    const m = modelGibanja(s, p);
    for (const b of m.tijela) {
      for (let i = 0; i <= 160; i++) {
        const st = b.stanje((m.tKraj * i) / 160);
        for (const k of ["s", "x", "y"])
          if (Number.isFinite(st[k])) vrijednosti[k].push(st[k]);
      }
    }
  }
  for (const c of s.crte ?? [])
    for (const k of ["s", "x", "y"])
      if (isNum(c?.[k])) vrijednosti[k].push(c[k]);
  // malo zraka iznad najviše točke (lopta u vrhu ne smije dodirivati rub crteža)
  const r = (k) => {
    const [lo, hi] = [Math.min(...vrijednosti[k]), Math.max(...vrijednosti[k])];
    return lijepRaspon(lo, hi + (k === "x" ? 0.02 : 0.06) * (hi - lo));
  };
  if (ravnina(s))
    return { x: isPar(s.x) ? s.x : r("x"), y: isPar(s.y) ? s.y : r("y") };
  return { s: isPar(s.ljestvica) ? s.ljestvica : r("s") };
}
const isPar = (v) =>
  Array.isArray(v) && v.length === 2 && v.every(isNum) && v[1] > v[0];

// Vrijednost veličine tijela u trenutku t; "susret" je razmak između dvaju tijela (s₁ − s₂).
function funkcijaCilja(m, c) {
  if (c.velicina === "susret")
    return (t) => m.tijela[0].stanje(t).s - m.tijela[1].stanje(t).s;
  const b = m.tijela.find((x) => x.id === c.tijelo) ?? m.tijela[0];
  return (t) => b.stanje(t)[c.velicina] - (c.vrijednost ?? 0);
}

// „zaustavi“: svi trenuci (s) u kojima je uvjet cilja ispunjen, iz zadanih brojeva (bez klizača).
export function trenuciCilja(s, parametri = pocetniParametri(s)) {
  const m = modelGibanja(s, parametri);
  if (!s.cilj) return [];
  if (s.cilj.velicina === "susret")
    return korijeni(funkcijaCilja(m, s.cilj), 0, m.tKraj).filter(
      (t) => t > 1e-6,
    );
  // samo dok tijelo leti: nakon pada na tlo miruje (v = 0), a to nije trenutak koji se traži
  const b = m.tijela.find((x) => x.id === s.cilj.tijelo) ?? m.tijela[0];
  return korijeni(
    funkcijaCilja(m, s.cilj),
    0,
    Math.min(m.tKraj, b?.kraj ?? Infinity),
  );
}
export const tolerancijaTrenutka = (s, t) =>
  isNum(s.cilj?.tolerancija)
    ? s.cilj.tolerancija
    : Math.max(0.1, 0.02 * Math.abs(t));

// najveća visina 1D tijela: krajevi dionica i vrh (v = 0) unutar dionice
function najvecaVisina(b, tKraj) {
  const kraj = Math.min(tKraj, b.kraj ?? Infinity);
  let max = b.stanje(0).s;
  for (const q of b.segs) {
    const ts = [q.t0, Math.min(q.t1, kraj)];
    if (Math.abs(q.a) > 1e-12) ts.push(q.t0 - q.v0 / q.a);
    for (const tm of ts)
      if (tm >= q.t0 - 1e-12 && tm <= Math.min(q.t1, kraj) + 1e-12)
        max = Math.max(max, b.stanje(tm).s);
  }
  return max;
}

// „postavi“: ishod gibanja koji se uspoređuje s ciljem (domet, najveća visina, vrijeme leta, završni položaj,
// veličina u trenutku t, mjesto susreta). null ako se to ne dogodi (npr. tijelo ne padne na tlo).
export function ishodGibanja(s, parametri) {
  const c = s.cilj ?? {};
  const m = modelGibanja(s, parametri);
  const b = m.tijela.find((x) => x.id === c.tijelo) ?? m.tijela[0];
  if (!b) return null;
  switch (c.velicina) {
    case "domet":
      return b.dim === 2 && Number.isFinite(b.kraj) ? b.vx0 * b.kraj : null;
    case "vrijeme_leta":
      return Number.isFinite(b.kraj) ? b.kraj : null;
    case "h_max":
      return b.dim === 2
        ? b.y0 + Math.max(0, b.vy0) ** 2 / (2 * m.g)
        : najvecaVisina(b, m.tKraj);
    case "kraj":
      return b.stanje(m.tKraj).s;
    case "susret": {
      if (m.tijela.length < 2) return null;
      const t = korijeni(funkcijaCilja(m, c), 0, m.tKraj).find((x) => x > 1e-6);
      return t == null ? null : m.tijela[0].stanje(t).s;
    }
    default: {
      if (!isNum(c.t)) return null;
      const v = b.stanje(Math.min(c.t, m.tKraj))[c.velicina];
      return Number.isFinite(v) ? v : null;
    }
  }
}
export const tolerancijaCilja = (s) =>
  isNum(s.cilj?.tolerancija)
    ? s.cilj.tolerancija
    : Math.max(1e-6, Math.abs(s.cilj?.vrijednost ?? 0) * 0.02);

function opisCilja(s) {
  const c = s.cilj ?? {};
  const vel = velicine(s);
  const jed = (k) => vel[k]?.jedinica ?? "m";
  switch (c.velicina) {
    case "domet":
      return { ime: "domet", jedinica: "m" };
    case "vrijeme_leta":
      return { ime: "vrijeme leta", jedinica: "s" };
    case "h_max":
      return { ime: "najveća visina", jedinica: "m" };
    case "kraj":
      return { ime: "završni položaj", jedinica: "m" };
    case "susret":
      return { ime: "mjesto susreta", jedinica: "m" };
    default:
      return {
        ime: `${vel[c.velicina]?.oznaka ?? c.velicina} u t = ${formatNumber(c.t ?? 0)} s`,
        jedinica: jed(c.velicina),
      };
  }
}

// Najbolja kombinacija klizača za „postavi“ (pretraga po svim vrijednostima): {parametri, vrijednost, odstupanje}.
export function rjesenjePostavi(s) {
  const k = s.klizaci ?? [];
  if (!k.length || !s.cilj) return null;
  const opcije = k.map(vrijednostiKlizaca);
  let best = null;
  const idx = k.map(() => 0);
  for (;;) {
    const p = Object.fromEntries(k.map((q, i) => [q.id, opcije[i][idx[i]]]));
    const v = ishodGibanja(s, p);
    if (isNum(v)) {
      const d = Math.abs(v - s.cilj.vrijednost);
      if (!best || d < best.odstupanje - 1e-12)
        best = { parametri: p, vrijednost: v, odstupanje: d };
    }
    let i = 0;
    while (i < k.length && ++idx[i] >= opcije[i].length) idx[i++] = 0;
    if (i === k.length) break;
  }
  return best;
}
const brojKombinacija = (s) =>
  (s.klizaci ?? []).reduce(
    (n, k) => n * (Math.round((k.max - k.min) / k.korak) + 1),
    1,
  );

// ── widget ────────────────────────────────────────────────────────────────────────────────────────
const opisTijela = (t, i) =>
  `${t.naziv}${t.id ? ` (${t.id})` : ""}` || `tijelo ${i + 1}`;
const tKlizaci = (s) =>
  (s.klizaci ?? [])
    .map((k) => `${k.id} = ${withUnit(k.pocetak, k.jedinica)}`)
    .join(", ");

export const gibanje = {
  tip: "gibanje",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Gibanje jednog ili dvaju tijela sa stalnom akceleracijom po dionicama: animacija s tragovima (položaj svakih Δt), strelicama v i a,
brojačima uživo i povezanim grafovima s kursorom vremena (površina ispod v–t boji se uživo). Polja: tekst, nacin, prostor ("staza" vodoravno |
"vertikalno" uvis i slobodni pad, h od tla | "ravnina" hitac: vodoravni, kosi, okomiti), g? (zadano 9,81; 10 kad ga zadatak koristi), tijela (1–2):
- staza / vertikalno: {id, naziv, ikona? (${IKONE.join(" | ")}), s0? (položaj ili visina, m), v0? (m/s, + udesno / uvis), dionice?: [{do (kraj dionice u s,
  ili "zaustavljanje": traje dok tijelo ne stane i dalje miruje), a (m/s²; okomito zadano −g)}] (1–6)}. Nakon zadnje dionice na stazi a = 0, okomito
  slobodni let. Okomito tijelo stane kad padne na tlo (h = 0), osim uz tlo: false.
- ravnina: {id, naziv, ikona?, x0?, y0? (visina izbačaja), vx? i vy? ILI v0? i kut? (° od vodoravne)}; ay = −g, tijelo stane na tlu (y = 0).
Brojčana polja tijela smiju biti izraz s id-jevima klizača („v“, „-a“). Ostalo: t_kraj? (s; zadano prirodni kraj: zadnja dionica ili pad na tlo),
ljestvica?: [od, do] (m; u ravnini x: [od, do], y: [od, do]; zadano automatski), crte?: [{s | x | y, oznaka}] (ciljna visina, crta, kanta),
tragovi? (Δt u s), strelice?: ["v", "a"], brojaci? (staza ${BROJACI.staza.join(", ")}; vertikalno ${BROJACI.vertikalno.join(", ")}; ravnina ${BROJACI.ravnina.join(", ")}),
graf?: {vrste: 1–3 od ${VRSTE_GRAFA.staza.join(", ")} (ravnina: ${VRSTE_GRAFA.ravnina.join(", ")}), povrsina?: true (površina ispod v–t do kursora)},
ubrzanje? (mjerilo vremena animacije; zadano tako da traje 3–8 s), klizaci?: [{id, oznaka, min, max, korak, pocetak, jedinica?}] (do 3). Načini:
- "istrazi": korak za gledanje: ▶/⏸, premotavanje, klizači; bez cilja.
- "zaustavi": učenik zaustavi ili premota vrijeme i zabilježi trenutke; cilj: {tijelo, velicina (staza/vertikalno: s | v | susret; ravnina: x | y |
  vx | vy | v), vrijednost, svi? (zadano true: treba zabilježiti sve trenutke), tolerancija? (s; zadano max(0,1 s, 2 %))}. "susret" (bez tijela i
  vrijednosti): trenutak u kojem su dva tijela na istom mjestu. Trenutke računa aplikacija; poruke „to je tek jedan trenutak“ i „u tom trenutku
  h = 18,4 m“ dodaju se same; krivo?: [{vrijednost (t u s), poruka}]. Bez klizača.
- "postavi": učenik namjesti klizač(e) (1–2) i pusti gibanje; cilj: {tijelo, velicina (staza: kraj (gdje tijelo stane / završni položaj) | s | v |
  susret (mjesto susreta); vertikalno: h_max | vrijeme_leta | s | v; ravnina: domet | h_max | vrijeme_leta | x | y | v), vrijednost, t? (za s, v, x, y),
  tolerancija? (zadano 2 %)}. Ostvarivost cilja i točne vrijednosti klizača računa aplikacija; krivo?: [{vrijednost (vrijednost prvog klizača), poruka}].`,
  primjer: {
    tip: "gibanje",
    nacin: "zaustavi",
    prostor: "vertikalno",
    g: 10,
    tekst:
      "Pusti lopticu pa zabilježi **svaki** trenutak u kojem je na visini 15 m.",
    tijela: [{ id: "l", naziv: "loptica", ikona: "lopta", s0: 0, v0: 20 }],
    ljestvica: [0, 25],
    crte: [{ s: 15, oznaka: "15 m" }],
    tragovi: 0.5,
    strelice: ["v", "a"],
    brojaci: ["t", "s", "v"],
    graf: { vrste: ["s-t"] },
    cilj: { tijelo: "l", velicina: "s", vrijednost: 15, svi: true },
  },
  primjeri: [
    {
      tip: "gibanje",
      nacin: "istrazi",
      prostor: "staza",
      tekst:
        "Pokreni auto i prati kursor na grafu. Pomiči vrijeme i gledaj kako površina ispod grafa raste.",
      tijela: [
        {
          id: "a",
          naziv: "automobil",
          ikona: "auto",
          s0: 0,
          v0: 0,
          dionice: [
            { do: 4, a: 5 },
            { do: 10, a: 0 },
            { do: 18, a: -2.5 },
          ],
        },
      ],
      ljestvica: [0, 240],
      tragovi: 1,
      strelice: ["v", "a"],
      brojaci: ["t", "s", "v", "a"],
      graf: { vrste: ["v-t"], povrsina: true },
    },
    {
      tip: "gibanje",
      nacin: "istrazi",
      prostor: "staza",
      tekst:
        "Automobil 10 s ubrzava, a zatim koči 6 s. Pokreni ga i gledaj tragove (svake sekunde) i strelice $\\vec v$ i $\\vec a$.",
      tijela: [
        {
          id: "a",
          naziv: "automobil",
          ikona: "auto",
          s0: 0,
          v0: 0,
          dionice: [
            { do: 10, a: 3 },
            { do: 16, a: -5 },
          ],
        },
      ],
      tragovi: 1,
      strelice: ["v", "a"],
      brojaci: ["t", "s", "v", "v_kmh", "a"],
      graf: { vrste: ["s-t", "v-t", "a-t"] },
    },
    {
      tip: "gibanje",
      nacin: "istrazi",
      prostor: "staza",
      tekst:
        "Utrka: sprinter trči 10 m/s, a gepard 30 m/s (108 km/h). Pokreni utrku i usporedi brojače.",
      tijela: [
        { id: "s", naziv: "sprinter", ikona: "tocka", s0: 0, v0: 10 },
        { id: "g", naziv: "gepard", ikona: "tocka", s0: 0, v0: 30 },
      ],
      t_kraj: 10,
      ljestvica: [0, 300],
      tragovi: 1,
      brojaci: ["t", "s", "v", "v_kmh"],
    },
    {
      tip: "gibanje",
      nacin: "zaustavi",
      prostor: "staza",
      tekst:
        "Zaustavi utrku točno u trenutku kad gepard prijeđe 100 m i zabilježi taj trenutak.",
      tijela: [
        { id: "s", naziv: "sprinter", ikona: "tocka", s0: 0, v0: 10 },
        { id: "g", naziv: "gepard", ikona: "tocka", s0: 0, v0: 30 },
      ],
      t_kraj: 6,
      ljestvica: [0, 180],
      crte: [{ s: 100, oznaka: "100 m" }],
      brojaci: ["t", "s"],
      cilj: { tijelo: "g", velicina: "s", vrijednost: 100 },
    },
    {
      tip: "gibanje",
      nacin: "zaustavi",
      prostor: "staza",
      tekst:
        "Dva automobila voze jedan prema drugome. Zabilježi trenutak u kojem se susretnu.",
      tijela: [
        { id: "A", naziv: "auto A", ikona: "auto", s0: 0, v0: 20 },
        { id: "B", naziv: "auto B", ikona: "auto", s0: 300, v0: -10 },
      ],
      t_kraj: 14,
      ljestvica: [0, 300],
      brojaci: ["t", "s"],
      graf: { vrste: ["s-t"] },
      cilj: { velicina: "susret" },
    },
    {
      tip: "gibanje",
      nacin: "postavi",
      prostor: "staza",
      tekst:
        "Vozač vozi 20 m/s, reagira 1 s pa koči. Namjesti usporenje tako da auto stane **točno na crti** (60 m), pa pusti i provjeri.",
      tijela: [
        {
          id: "a",
          naziv: "automobil",
          ikona: "auto",
          s0: 0,
          v0: 20,
          dionice: [
            { do: 1, a: 0 },
            { do: "zaustavljanje", a: "-u" },
          ],
        },
      ],
      ljestvica: [0, 120],
      crte: [{ s: 60, oznaka: "crta" }],
      tragovi: 0.5,
      strelice: ["v", "a"],
      brojaci: ["t", "s", "v"],
      klizaci: [
        {
          id: "u",
          oznaka: "usporenje $|a|$",
          min: 2,
          max: 10,
          korak: 0.5,
          pocetak: 8,
          jedinica: "m/s²",
        },
      ],
      cilj: { tijelo: "a", velicina: "kraj", vrijednost: 60 },
    },
    {
      tip: "gibanje",
      nacin: "postavi",
      prostor: "ravnina",
      g: 10,
      tekst:
        "Kojom brzinom treba vodoravno izbaciti loptu s visine 5 m da padne u kantu? Namjesti brzinu i pusti loptu.",
      x: [0, 30],
      y: [0, 6],
      tijela: [{ id: "l", naziv: "lopta", x0: 0, y0: 5, vx: "v", vy: 0 }],
      crte: [{ x: 24, oznaka: "kanta" }],
      tragovi: 0.1,
      strelice: ["v"],
      brojaci: ["t", "x", "y"],
      klizaci: [
        {
          id: "v",
          oznaka: "brzina izbačaja",
          min: 5,
          max: 40,
          korak: 1,
          pocetak: 10,
          jedinica: "m/s",
        },
      ],
      cilj: {
        tijelo: "l",
        velicina: "domet",
        vrijednost: 24,
        tolerancija: 0.5,
      },
    },
    {
      tip: "gibanje",
      nacin: "istrazi",
      prostor: "ravnina",
      g: 10,
      tekst:
        "Jedna lopta izbačena je vodoravno brzinom 24 m/s, a druga je u istom trenutku puštena s iste visine. Pokreni i usporedi tragove: koja prije padne?",
      tijela: [
        { id: "b", naziv: "izbačena", x0: 0, y0: 5, vx: 24, vy: 0 },
        { id: "p", naziv: "puštena", x0: 0, y0: 5, vx: 0, vy: 0 },
      ],
      tragovi: 0.1,
      strelice: ["v", "a"],
      brojaci: ["t", "x", "y", "vy"],
      graf: { vrste: ["y-t"] },
    },
    {
      tip: "gibanje",
      nacin: "istrazi",
      prostor: "ravnina",
      tekst:
        "Kosi hitac: mijenjaj brzinu i kut izbačaja i gledaj domet i najveću visinu.",
      tijela: [{ id: "l", naziv: "lopta", v0: "v", kut: "k" }],
      tragovi: 0.2,
      strelice: ["v", "a"],
      brojaci: ["t", "x", "y", "v"],
      klizaci: [
        {
          id: "v",
          oznaka: "brzina $v_0$",
          min: 5,
          max: 25,
          korak: 1,
          pocetak: 15,
          jedinica: "m/s",
        },
        {
          id: "k",
          oznaka: "kut $\\alpha$",
          min: 10,
          max: 80,
          korak: 5,
          pocetak: 45,
          jedinica: "°",
        },
      ],
    },
    {
      tip: "gibanje",
      nacin: "istrazi",
      prostor: "vertikalno",
      g: 10,
      tekst:
        "Kamen pada s visine 45 m. Pokreni ga i gledaj tragove svakih 0,5 s: razmaci rastu jer brzina raste.",
      tijela: [{ id: "k", naziv: "kamen", ikona: "lopta", s0: 45, v0: 0 }],
      tragovi: 0.5,
      strelice: ["v", "a"],
      brojaci: ["t", "s", "v"],
      graf: { vrste: ["s-t", "v-t"] },
    },
  ],

  // isti problem za više vrijednosti klizača ispisuje se jednom
  validate: (s) => [...new Set(validiraj(s))],

  check(s, odgovor) {
    return s.nacin === "postavi"
      ? checkPostavi(s, odgovor)
      : checkZaustavi(s, odgovor);
  },

  tocanOdgovor(s) {
    if (s.nacin === "zaustavi") {
      const ts = trenuciCilja(s);
      return ts.length === 1
        ? `t = ${withUnit(ts[0], "s")}`
        : `t = ${ts.map((t) => withUnit(t, "s")).join(" i t = ")}`;
    }
    if (s.nacin === "postavi") {
      const r = rjesenjePostavi(s);
      if (!r) return "";
      return s.klizaci
        .map(
          (k) =>
            `${k.oznaka.replace(/\$/g, "")} = ${withUnit(r.parametri[k.id], k.jedinica)}`,
        )
        .join(", ");
    }
    return "";
  },
  brojcaniOdgovor: (s) => {
    if (s.nacin === "postavi" && s.klizaci?.length === 1)
      return rjesenjePostavi(s)?.parametri[s.klizaci[0].id] ?? null;
    if (s.nacin === "zaustavi") {
      const ts = trenuciCilja(s);
      return ts.length === 1 ? ts[0] : null;
    }
    return null;
  },
  kljucOdgovora: (s) =>
    s.nacin === "zaustavi"
      ? trenuciCilja(s)
          .map((t) => t.toFixed(3))
          .join(",")
      : s.nacin === "postavi"
        ? JSON.stringify(rjesenjePostavi(s)?.parametri ?? null)
        : null,
};

function validiraj(s) {
  const { list, need } = problems();
  need(
    NACINI.includes(s.nacin),
    `gibanje.nacin mora biti ${NACINI.join(", ")}`,
  );
  if (
    !need(
      PROSTORI.includes(s.prostor),
      `gibanje.prostor mora biti ${PROSTORI.join(", ")}`,
    )
  )
    return list;
  need(isText(s.tekst), "gibanje treba „tekst“");
  if (s.g != null)
    need(
      isNum(s.g) && s.g > 0 && s.g <= 30,
      "g mora biti broj između 0 i 30 (m/s²)",
    );
  const ids = provjeriKlizace(s.klizaci, need, 3);
  const rav = ravnina(s);

  // tijela
  if (
    !need(
      Array.isArray(s.tijela) && s.tijela.length >= 1 && s.tijela.length <= 2,
      "gibanje treba 1–2 tijela",
    )
  )
    return list;
  const koristeno = new Set();
  const polje = (v, gdje) => {
    if (v == null) return true;
    varijable(v).forEach((x) => koristeno.add(x));
    return provjeriVrijednost(v, ids, need, gdje);
  };
  s.tijela.forEach((t, i) => {
    const at = `tijela[${i}]`;
    need(
      ID.test(t?.id ?? ""),
      `${at}.id mora biti kratko ime (slova, bez razmaka)`,
    );
    need(isText(t?.naziv), `${at} treba „naziv“ (npr. "automobil")`);
    if (t?.ikona != null)
      need(
        IKONE.includes(t.ikona),
        `${at}.ikona mora biti ${IKONE.join(", ")}`,
      );
    const tudja = rav ? ["s0", "dionice"] : ["x0", "y0", "vx", "vy", "kut"];
    for (const f of tudja)
      need(
        !(f in (t ?? {})),
        `${at}.${f} ne postoji u prostoru „${s.prostor}“ (${rav ? "u ravnini: x0, y0, vx, vy ili v0 i kut" : "u 1D: s0, v0, dionice"})`,
      );
    if (rav) {
      for (const f of ["x0", "y0", "vx", "vy", "v0", "kut"])
        polje(t[f], `${at}.${f}`);
      need(
        !((t.v0 != null || t.kut != null) && (t.vx != null || t.vy != null)),
        `${at}: zadaj ili vx i vy, ili v0 i kut (ne oboje)`,
      );
      if (t.v0 != null || t.kut != null)
        need(
          t.v0 != null && t.kut != null,
          `${at}: uz v0 treba i kut (u °), i obrnuto`,
        );
    } else {
      polje(t.s0, `${at}.s0`);
      polje(t.v0, `${at}.v0`);
      if (
        t.dionice != null &&
        need(
          Array.isArray(t.dionice) &&
            t.dionice.length >= 1 &&
            t.dionice.length <= 6,
          `${at}.dionice mora biti popis od 1–6 dionica`,
        )
      ) {
        let prije = 0;
        t.dionice.forEach((d, j) => {
          const dat = `${at}.dionice[${j}]`;
          if (s.prostor === "staza")
            need(d?.a != null, `${dat} treba akceleraciju a`);
          polje(d?.a, `${dat}.a`);
          if (d?.do === ZAUSTAVLJANJE) return;
          if (
            !need(
              d?.do != null,
              `${dat} treba „do“ (kraj dionice u s ili "zaustavljanje")`,
            )
          )
            return;
          if (polje(d.do, `${dat}.do`) && isNum(d.do)) {
            need(
              d.do > prije,
              `${dat}.do mora biti veći od kraja prethodne dionice (${formatNumber(prije)} s)`,
            );
            prije = d.do;
          }
        });
      }
    }
  });
  need(
    new Set(s.tijela.map((t) => t?.id)).size === s.tijela.length,
    "id-jevi tijela moraju biti različiti",
  );
  if (list.length) return list;
  (s.klizaci ?? []).forEach((k) =>
    need(
      koristeno.has(k.id),
      `klizač „${k.id}“ se ne koristi ni u jednom tijelu`,
    ),
  );

  // model mora biti izračunljiv za sve vrijednosti klizača
  const skupovi = skupoviParametara(s);
  for (const p of skupovi) {
    const m = modelGibanja(s, p);
    const opis = s.klizaci?.length
      ? ` (uz ${Object.entries(p)
          .map(([k, v]) => `${k} = ${formatNumber(v)}`)
          .join(", ")})`
      : "";
    for (const [i, b] of m.tijela.entries()) {
      const st = b.stanje(0);
      if (
        !need(
          Object.values(st).every(
            (v) => typeof v === "boolean" || Number.isFinite(v),
          ),
          `${opisTijela(s.tijela[i], i)}: gibanje se ne može izračunati${opis}`,
        )
      )
        return list;
      if (s.prostor === "vertikalno")
        need(
          st.s >= 0,
          `${opisTijela(s.tijela[i], i)}: početna visina s0 ne smije biti ispod tla${opis}`,
        );
      if (rav) {
        need(
          b.y0 >= 0,
          `${opisTijela(s.tijela[i], i)}: y0 ne smije biti ispod tla${opis}`,
        );
        need(
          b.kraj > 1e-6,
          `${opisTijela(s.tijela[i], i)}: tijelo je na tlu i ne leti (zadaj y0 > 0 ili vy > 0)${opis}`,
        );
      }
      if (b.greska)
        need(false, `${opisTijela(s.tijela[i], i)}: ${b.greska}${opis}`);
    }
    if (!m.prirodno)
      need(
        isNum(s.t_kraj),
        "gibanje nema prirodni kraj (dionice ili pad na tlo), pa treba t_kraj",
      );
  }
  if (s.t_kraj != null)
    need(
      isNum(s.t_kraj) && s.t_kraj > 0 && s.t_kraj <= T_MAX,
      `t_kraj mora biti broj sekundi između 0 i ${T_MAX}`,
    );
  if (list.length) return list;

  // scena
  if (rav) {
    for (const k of ["x", "y"])
      if (s[k] != null) need(isPar(s[k]), `${k} mora biti [od, do] uz od < do`);
    need(
      s.ljestvica == null,
      "u ravnini raspon se zadaje s x: [od, do] i y: [od, do], ne s ljestvica",
    );
  } else {
    if (s.ljestvica != null)
      need(isPar(s.ljestvica), "ljestvica mora biti [od, do] uz od < do (m)");
    need(
      s.x == null && s.y == null,
      "x i y postoje samo u ravnini; ovdje je raspon „ljestvica“",
    );
  }
  if (list.length) return list;
  const r = rasponScene(s);
  const unutra = (k, v, rub = 0) => v >= r[k][0] - rub && v <= r[k][1] + rub;
  for (const p of [
    pocetniParametri(s),
    ...(s.nacin === "postavi" && rjesenjePostavi(s)
      ? [rjesenjePostavi(s).parametri]
      : []),
  ]) {
    const m = modelGibanja(s, p);
    m.tijela.forEach((b, i) => {
      const sirina = rav ? null : (r.s[1] - r.s[0]) * 0.01;
      let van = false;
      for (let j = 0; j <= 100 && !van; j++) {
        const st = b.stanje((m.tKraj * j) / 100);
        van = rav
          ? !unutra("x", st.x, (r.x[1] - r.x[0]) * 0.01) ||
            !unutra("y", st.y, (r.y[1] - r.y[0]) * 0.01)
          : !unutra("s", st.s, sirina);
      }
      need(
        !van,
        `${opisTijela(s.tijela[i], i)} izlazi izvan prikaza (${rav ? "x, y" : "ljestvica"}); povećaj raspon ili ga izostavi`,
      );
    });
  }
  if (
    s.crte != null &&
    need(
      Array.isArray(s.crte) && s.crte.length <= 4,
      "crte mora biti popis od najviše 4 crte",
    )
  ) {
    const dopusteno = rav ? ["x", "y"] : ["s"];
    s.crte.forEach((c, i) => {
      const kljucevi = dopusteno.filter((k) => c?.[k] != null);
      if (
        !need(
          kljucevi.length === 1 && isNum(c[kljucevi[0]]),
          `crte[${i}] treba točno jedan broj ${dopusteno.join(" ili ")}`,
        )
      )
        return;
      need(
        unutra(kljucevi[0] === "s" ? "s" : kljucevi[0], c[kljucevi[0]]),
        `crte[${i}] je izvan prikaza`,
      );
      if (c.oznaka != null)
        need(isText(c.oznaka), `crte[${i}].oznaka mora biti tekst`);
    });
  }
  const m0 = modelGibanja(s);
  if (s.tragovi != null)
    need(
      isNum(s.tragovi) && s.tragovi > 0 && m0.tKraj / s.tragovi <= 80,
      "tragovi je razmak u sekundama (> 0), najviše 80 tragova u cijelom gibanju",
    );
  if (s.strelice != null)
    need(
      Array.isArray(s.strelice) &&
        s.strelice.every((x) => ["v", "a"].includes(x)),
      'strelice smije biti ["v"], ["a"] ili ["v", "a"]',
    );
  if (s.brojaci != null)
    need(
      Array.isArray(s.brojaci) &&
        s.brojaci.length >= 1 &&
        s.brojaci.every((x) => BROJACI[s.prostor].includes(x)),
      `brojaci su popis od: ${BROJACI[s.prostor].join(", ")}`,
    );
  if (s.graf != null) {
    const v = s.graf?.vrste;
    if (
      need(
        Array.isArray(v) &&
          v.length >= 1 &&
          v.length <= 3 &&
          v.every((x) => VRSTE_GRAFA[s.prostor].includes(x)) &&
          new Set(v).size === v.length,
        `graf.vrste je 1–3 različitih od: ${VRSTE_GRAFA[s.prostor].join(", ")}`,
      )
    ) {
      if (s.graf.povrsina != null)
        need(
          s.graf.povrsina === false ||
            v.some((x) => ["v-t", "vx-t", "vy-t"].includes(x)),
          "graf.povrsina ima smisla samo uz graf brzine (v-t, vx-t ili vy-t)",
        );
    }
  }
  if (s.ubrzanje != null)
    need(
      isNum(s.ubrzanje) && s.ubrzanje > 0 && s.ubrzanje <= 50,
      "ubrzanje je mjerilo vremena animacije (0–50)",
    );

  // način rada
  if (s.nacin === "istrazi") noAnswerFields(s, need);
  if (s.nacin === "zaustavi") validateZaustavi(s, need);
  if (s.nacin === "postavi") validatePostavi(s, need);
  return list;
}

function validateZaustavi(s, need) {
  need(
    !s.klizaci?.length,
    "„zaustavi“ nema klizače: trenutke aplikacija računa iz zadanih brojeva",
  );
  const c = s.cilj;
  if (
    !need(
      c && typeof c === "object",
      "„zaustavi“ treba cilj: {tijelo, velicina, vrijednost}",
    )
  )
    return;
  if (
    !need(
      CILJ_ZAUSTAVI[s.prostor].includes(c.velicina),
      `cilj.velicina mora biti ${CILJ_ZAUSTAVI[s.prostor].join(", ")}`,
    )
  )
    return;
  if (c.velicina === "susret") {
    need(s.tijela.length === 2, "cilj „susret“ treba dva tijela");
    need(
      c.tijelo == null && c.vrijednost == null,
      "cilj „susret“ nema tijelo ni vrijednost (traži trenutak kad su tijela na istom mjestu)",
    );
  } else {
    need(
      s.tijela.some((t) => t.id === c.tijelo),
      "cilj.tijelo mora biti id jednog od tijela",
    );
    need(isNum(c.vrijednost), "cilj.vrijednost mora biti broj");
  }
  if (c.svi != null)
    need(typeof c.svi === "boolean", "cilj.svi je true ili false");
  if (c.tolerancija != null)
    need(
      isNum(c.tolerancija) && c.tolerancija > 0,
      "cilj.tolerancija je broj sekundi > 0",
    );
  const ts = trenuciCilja(s);
  if (
    !need(
      ts.length >= 1,
      "uvjet cilja nikad nije ispunjen u prikazanom vremenu; provjeri vrijednost ili t_kraj",
    )
  )
    return;
  need(ts.length <= 4, "uvjet je ispunjen u previše trenutaka (najviše 4)");
  for (let i = 1; i < ts.length; i++)
    need(
      ts[i] - ts[i - 1] > tolerancijaTrenutka(s, ts[i]) * 2,
      `trenuci ${formatNumber(ts[i - 1])} s i ${formatNumber(ts[i])} s preblizu su da bi se razlikovali`,
    );
  if (
    s.krivo != null &&
    need(Array.isArray(s.krivo), "krivo mora biti popis")
  ) {
    s.krivo.forEach((k, i) => {
      need(
        isNum(k?.vrijednost) && isText(k?.poruka),
        `krivo[${i}] treba {vrijednost (t u s), poruka}`,
      );
      if (isNum(k?.vrijednost))
        need(
          !ts.some(
            (t) => Math.abs(t - k.vrijednost) <= tolerancijaTrenutka(s, t),
          ),
          `krivo[${i}].vrijednost je jedan od točnih trenutaka`,
        );
    });
  }
}

function validatePostavi(s, need) {
  if (
    !need(
      Array.isArray(s.klizaci) &&
        s.klizaci.length >= 1 &&
        s.klizaci.length <= 2,
      "„postavi“ treba 1–2 klizača",
    )
  )
    return;
  const c = s.cilj;
  if (
    !need(
      c && typeof c === "object",
      "„postavi“ treba cilj: {tijelo, velicina, vrijednost}",
    )
  )
    return;
  if (
    !need(
      CILJ_POSTAVI[s.prostor].includes(c.velicina),
      `cilj.velicina u prostoru „${s.prostor}“ mora biti ${CILJ_POSTAVI[s.prostor].join(", ")}`,
    )
  )
    return;
  if (c.velicina === "susret")
    need(s.tijela.length === 2, "cilj „susret“ treba dva tijela");
  else
    need(
      s.tijela.some((t) => t.id === c.tijelo),
      "cilj.tijelo mora biti id jednog od tijela",
    );
  need(isNum(c.vrijednost), "cilj.vrijednost mora biti broj");
  if (["s", "v", "x", "y"].includes(c.velicina))
    need(isNum(c.t) && c.t >= 0, `cilj „${c.velicina}“ treba trenutak t (s)`);
  if (c.tolerancija != null)
    need(
      isNum(c.tolerancija) && c.tolerancija > 0,
      "cilj.tolerancija mora biti broj > 0",
    );
  if (
    !need(
      brojKombinacija(s) <= 40000,
      "klizači imaju previše kombinacija (najviše 40 000); povećaj korak",
    )
  )
    return;
  if (!isNum(c.vrijednost)) return;
  const r = rjesenjePostavi(s);
  const tol = tolerancijaCilja(s);
  const o = opisCilja(s);
  if (
    !need(
      r && r.odstupanje <= tol,
      `cilj (${o.ime} = ${withUnit(c.vrijednost, o.jedinica)}) ne može se postići klizačima${r ? `; najbliže je ${withUnit(r.vrijednost, o.jedinica)}` : ""}`,
    )
  )
    return;
  const p0 = ishodGibanja(s, pocetniParametri(s));
  need(
    !(isNum(p0) && Math.abs(p0 - c.vrijednost) <= tol),
    `već početne vrijednosti klizača (${tKlizaci(s)}) ispunjavaju cilj; neka učenik mora nešto promijeniti`,
  );
  if (
    s.krivo != null &&
    need(Array.isArray(s.krivo), "krivo mora biti popis")
  ) {
    s.krivo.forEach((k, i) => {
      need(
        isNum(k?.vrijednost) && isText(k?.poruka),
        `krivo[${i}] treba {vrijednost (prvog klizača), poruka}`,
      );
      if (isNum(k?.vrijednost)) {
        const v = ishodGibanja(s, {
          ...r.parametri,
          [s.klizaci[0].id]: k.vrijednost,
        });
        need(
          !(isNum(v) && Math.abs(v - c.vrijednost) <= tol),
          `krivo[${i}].vrijednost ispunjava cilj, pa nije kriva`,
        );
      }
    });
  }
}

const imeTijela = (s, id) =>
  s.tijela.find((t) => t.id === id)?.naziv ?? "tijelo";
const veliko = (t) => t.charAt(0).toUpperCase() + t.slice(1);
// iznos u poruci: tri značajne znamenke (86,7 m, ne 86,667 m)
const iznos = (n, u) => withUnit(Number(n.toPrecision(3)), u);

function checkZaustavi(s, odgovor) {
  const zapisano = (Array.isArray(odgovor) ? odgovor : [])
    .filter(isNum)
    .sort((a, b) => a - b);
  if (!zapisano.length)
    return {
      tocno: false,
      poruka:
        "Zaustavi gibanje u pravom trenutku i pritisni „Zabilježi trenutak“.",
      prazno: true,
    };
  const ts = trenuciCilja(s);
  const c = s.cilj;
  const m = modelGibanja(s);
  const vel = velicine(s);
  const pogodjeni = new Set();
  for (const t of zapisano) {
    const i = ts.findIndex((r) => Math.abs(r - t) <= tolerancijaTrenutka(s, r));
    if (i >= 0) {
      if (pogodjeni.has(i))
        return {
          tocno: false,
          poruka: `Isti trenutak (oko ${withUnit(ts[i], "s")}) zabilježio si dva puta. Ukloni jedan.`,
        };
      pogodjeni.add(i);
      continue;
    }
    const k = (s.krivo ?? []).find(
      (q) => Math.abs(q.vrijednost - t) <= tolerancijaTrenutka(s, q.vrijednost),
    );
    if (k) return { tocno: false, poruka: k.poruka };
    const najblizi = ts.reduce(
      (a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a),
      ts[0],
    );
    const smjer = najblizi > t ? "Pusti malo dulje." : "Zaustavi malo ranije.";
    if (c.velicina === "susret") {
      const d = Math.abs(m.tijela[0].stanje(t).s - m.tijela[1].stanje(t).s);
      return {
        tocno: false,
        poruka: `U t = ${withUnit(t, "s")} tijela su još ${iznos(d, "m")} jedno od drugoga. ${smjer}`,
      };
    }
    const b = m.tijela.find((x) => x.id === c.tijelo);
    const v = b.stanje(t)[c.velicina];
    const { oznaka, jedinica } = vel[c.velicina];
    return {
      tocno: false,
      poruka: `U t = ${withUnit(t, "s")} ${imeTijela(s, c.tijelo)} ima ${oznaka} = ${iznos(v, jedinica)}, a traži se ${oznaka} = ${withUnit(c.vrijednost, jedinica)}. ${smjer}`,
    };
  }
  const svi = c.svi !== false;
  if (svi && pogodjeni.size < ts.length) {
    const fali = ts.length - pogodjeni.size;
    const naziv = veliko(imeTijela(s, c.tijelo));
    const opis =
      c.velicina === "susret"
        ? "Tijela se susreću još jednom."
        : s.prostor === "vertikalno" && c.velicina === "s" && ts.length === 2
          ? `${naziv} je na visini ${withUnit(c.vrijednost, "m")} dvaput: na putu gore i na putu dolje.`
          : `${naziv} ima ${vel[c.velicina].oznaka} = ${withUnit(c.vrijednost, vel[c.velicina].jedinica)} još ${fali === 1 ? "jednom" : `${fali} puta`}.`;
    return {
      tocno: false,
      poruka: `${pogodjeni.size === 1 ? "Taj trenutak je dobar, ali nije jedini." : "Ti trenuci su dobri, ali nisu svi."} ${opis} Pronađi ${fali === 1 ? "i drugi trenutak pa ga" : "i ostale trenutke pa ih"} zabilježi.`,
    };
  }
  return { tocno: true };
}

function checkPostavi(s, odgovor) {
  if (!odgovor || typeof odgovor !== "object")
    return {
      tocno: false,
      poruka: "Namjesti klizač i pritisni Provjeri.",
      prazno: true,
    };
  const p = {};
  for (const k of s.klizaci) {
    const v = odgovor[k.id];
    if (!isNum(v) || v < k.min - 1e-9 || v > k.max + 1e-9)
      return {
        tocno: false,
        poruka: "Namjesti klizač i pritisni Provjeri.",
        prazno: true,
      };
    p[k.id] = v;
  }
  const c = s.cilj;
  const o = opisCilja(s);
  const v = ishodGibanja(s, p);
  const tol = tolerancijaCilja(s);
  if (isNum(v) && Math.abs(v - c.vrijednost) <= tol) return { tocno: true };
  const k0 = s.klizaci[0];
  const krivo = (s.krivo ?? []).find(
    (q) => Math.abs(q.vrijednost - p[k0.id]) <= k0.korak / 2 + 1e-9,
  );
  if (krivo) return { tocno: false, poruka: krivo.poruka };
  if (!isNum(v))
    return {
      tocno: false,
      poruka:
        c.velicina === "susret"
          ? "S tim vrijednostima tijela se ne susretnu. Pokušaj drukčije."
          : "S tim vrijednostima to se ne dogodi. Pokušaj drukčije.",
    };
  let savjet = "";
  if (s.klizaci.length === 1) {
    // smjer: kako se ishod mijenja kad se klizač malo poveća (ishod je monoton oko rješenja u svim primjerima)
    const gore = ishodGibanja(s, {
      [k0.id]: Math.min(k0.max, p[k0.id] + k0.korak),
    });
    const dolje = ishodGibanja(s, {
      [k0.id]: Math.max(k0.min, p[k0.id] - k0.korak),
    });
    if (isNum(gore) && isNum(dolje) && Math.abs(gore - dolje) > 1e-12) {
      const udesno = gore > dolje === c.vrijednost > v;
      savjet = ` Pomakni klizač „${k0.oznaka.replace(/\$/g, "").trim()}“ ${udesno ? "udesno" : "ulijevo"}.`;
    }
  }
  const razlika = iznos(Math.abs(v - c.vrijednost), o.jedinica);
  if (c.velicina === "kraj") {
    const b = modelGibanja(s, p).tijela.find((x) => x.id === c.tijelo);
    const naprijed = c.vrijednost >= b.stanje(0).s;
    return {
      tocno: false,
      poruka: `${veliko(imeTijela(s, c.tijelo))} stane na ${iznos(v, "m")}, ${razlika} ${v > c.vrijednost === naprijed ? "iza" : "prije"} cilja (${withUnit(c.vrijednost, "m")}).${savjet}`,
    };
  }
  return {
    tocno: false,
    poruka: `${veliko(o.ime)} je ${iznos(v, o.jedinica)}, a treba ${withUnit(c.vrijednost, o.jedinica)} (${razlika} ${v > c.vrijednost ? "previše" : "premalo"}).${savjet}`,
  };
}
