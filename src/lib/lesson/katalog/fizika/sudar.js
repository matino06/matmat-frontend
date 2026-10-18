// Sudar: jednodimenzionalni sudar dvaju tijela (ili tijela i zida) na pruzi te razdvajanje (trzaj puške,
// eksplozija). Sva fizika (brzine poslije, p, Ek, Δp, F = Δp/Δt) računa se ovdje, pa crtež i provjera uvijek
// kažu isto. Pozitivan smjer je udesno; tijela[0] je lijevo, tijela[1] desno, zid je desno.
import { isNum, near, tolerance, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
  withUnit,
  KRIVO_OPIS,
} from "../zajednicko.js";

const NACINI = ["istrazi", "prikaz", "predvidi"];
export const SUDAR_VRSTE = [
  "elasticni",
  "neelasticni",
  "savrseno_neelasticni",
  "razdvajanje",
];
export const SUDAR_SLIKE = [
  "vagon",
  "kolica",
  "kutija",
  "auto",
  "kugla",
  "lopta",
  "puska",
  "metak",
];
export const JEDINICE_MASE = { kg: 1, g: 0.001, t: 1000 };
const PRIKAZI = ["p", "Ek", "F", "tablica"];
const KLIZACI = ["m1", "m2", "v1", "v2", "vp", "e", "dt"];
const SUDARI = ["elasticni", "neelasticni", "savrseno_neelasticni"];

// Veličine koje se mogu pitati: jedinica i kratka oznaka za polje odgovora.
export const SUDAR_VELICINE = {
  v_poslije: { jedinica: "m/s", oznaka: "v′", naziv: "brzina poslije" },
  p_prije: { jedinica: "kg·m/s", oznaka: "p", naziv: "količina gibanja prije" },
  p_poslije: {
    jedinica: "kg·m/s",
    oznaka: "p′",
    naziv: "količina gibanja poslije",
  },
  dp: { jedinica: "kg·m/s", oznaka: "Δp", naziv: "promjena količine gibanja" },
  F: { jedinica: "N", oznaka: "F", naziv: "prosječna sila" },
  Ek_prije: { jedinica: "J", oznaka: "Eₖ", naziv: "kinetička energija prije" },
  Ek_poslije: {
    jedinica: "J",
    oznaka: "Eₖ′",
    naziv: "kinetička energija poslije",
  },
  gubitak: {
    jedinica: "J",
    oznaka: "Q",
    naziv: "kinetička energija pretvorena u toplinu, zvuk i deformaciju",
  },
};

// 12 značajnih znamenki: 0,8 umjesto 0,7999999999 i 0 umjesto −0
const clean = (x) => (isNum(x) ? Number(x.toPrecision(12)) + 0 : x);
const ime = (s, i) => s.tijela[i]?.oznaka ?? `tijelo ${i + 1}`;

// ── fizika ────────────────────────────────────────────────────────────────────────────────────────
// Ishod sudara iz speca (spec mora biti ispravan; komponenta prije zove sudarProblem).
export function sudarIshod(s) {
  const T = s.tijela.map((b) => ({ m: b.m, v: isNum(b.v) ? b.v : 0 }));
  const vrsta = s.vrsta;
  const zadan = s.tijela.findIndex((b) => isNum(b.v_poslije));
  let vp;
  if (s.zid) {
    const b = s.tijela[0];
    vp = [
      isNum(b.v_poslije)
        ? b.v_poslije
        : vrsta === "savrseno_neelasticni"
          ? 0
          : -(vrsta === "elasticni" ? 1 : s.e) * T[0].v,
    ];
  } else if (vrsta === "razdvajanje") {
    const v0 = isNum(s.v0) ? s.v0 : 0;
    T.forEach((t) => (t.v = v0));
    const j = 1 - zadan;
    vp = [];
    vp[zadan] = s.tijela[zadan].v_poslije;
    vp[j] = ((T[0].m + T[1].m) * v0 - T[zadan].m * vp[zadan]) / T[j].m;
  } else {
    const [a, b] = T;
    const P = a.m * a.v + b.m * b.v;
    const M = a.m + b.m;
    if (vrsta === "savrseno_neelasticni") vp = [P / M, P / M];
    else if (vrsta === "neelasticni" && zadan >= 0) {
      const j = 1 - zadan;
      vp = [];
      vp[zadan] = s.tijela[zadan].v_poslije;
      vp[j] = (P - T[zadan].m * vp[zadan]) / T[j].m;
    } else {
      const e = vrsta === "elasticni" ? 1 : s.e;
      vp = [(P + b.m * e * (b.v - a.v)) / M, (P + a.m * e * (a.v - b.v)) / M];
    }
  }
  const dt = isNum(s.trajanje) && s.trajanje > 0 ? s.trajanje : null;
  const tijela = T.map((t, i) => {
    const v2 = clean(vp[i]);
    const p = clean(t.m * t.v);
    const pp = clean(t.m * v2);
    const dp = clean(pp - p);
    return {
      m: t.m,
      v: clean(t.v),
      vp: v2,
      p,
      pp,
      Ek: clean((t.m * t.v ** 2) / 2),
      Ekp: clean((t.m * v2 ** 2) / 2),
      dp,
      F: dt ? clean(dp / dt) : null,
    };
  });
  const sum = (k) => clean(tijela.reduce((a, t) => a + t[k], 0));
  const Ek = sum("Ek");
  const Ekp = sum("Ekp");
  return {
    zid: !!s.zid,
    vrsta,
    spojeni: !s.zid && vrsta === "savrseno_neelasticni",
    razdvajanje: vrsta === "razdvajanje",
    tijela,
    P: sum("p"),
    Pp: sum("pp"),
    Ek,
    Ekp,
    gubitak: clean(Ek - Ekp),
    dt,
  };
}

// Fizikalno nemoguć ili nejasan sudar (tijela se ne sudare, energija nastaje ni iz čega…) → rečenica, inače null.
// Koriste je validate i komponenta (kad učenik klizačima namjesti brzine koje se ne sudare).
export function sudarProblem(s) {
  const t = s.tijela;
  if (s.zid) {
    if (!(t[0].v > 0))
      return "tijelo mora ići prema zidu: zid je desno, pa mora biti v > 0";
    const vp = t[0].v_poslije;
    if (isNum(vp)) {
      if (vp > 0)
        return "nakon udara u zid tijelo ide natrag, pa v_poslije mora biti negativna (ili 0)";
      if (-vp > t[0].v * (1 + 1e-9))
        return "tijelo se ne može odbiti brže nego što je udarilo (energija bi nastala ni iz čega)";
    }
    return null;
  }
  const r = sudarIshod(s);
  if (s.vrsta === "razdvajanje") {
    if (!(r.tijela[1].vp > r.tijela[0].vp))
      return "nakon razdvajanja desno tijelo (tijela[1]) mora ići udesno brže od lijevog, inače se ne razdvoje; tijela[0] je lijevo (npr. puška), tijela[1] desno (metak)";
    return null;
  }
  if (!(t[0].v > (t[1].v ?? 0)))
    return "tijela se ne sudaraju: lijevo tijelo (tijela[0]) mora ići udesno brže od desnog (v₁ > v₂)";
  const rel = r.tijela[1].vp - r.tijela[0].vp;
  const pril = t[0].v - (t[1].v ?? 0);
  if (rel < -1e-9 * pril)
    return "zadana brzina poslije nije moguća: tijela bi prošla jedno kroz drugo";
  if (rel > pril * (1 + 1e-9))
    return "zadana brzina poslije nije moguća: kinetička energija bi porasla";
  return null;
}

// Tijelo na koje se pitanje odnosi (indeks) ili null za ukupnu vrijednost obaju tijela.
export function sudarTijeloPitanja(s) {
  const q = s.pitaj ?? {};
  if (Number.isInteger(q.tijelo)) return q.tijelo;
  if (s.zid) return 0;
  if (q.velicina === "v_poslije") {
    const zadan = s.tijela.findIndex((b) => isNum(b.v_poslije));
    if (zadan >= 0) return 1 - zadan;
    return 0;
  }
  if (q.velicina === "dp" || q.velicina === "F") return 0;
  return null;
}

export function sudarOdgovor(s) {
  const R = sudarIshod(s);
  const i = sudarTijeloPitanja(s);
  const tj = i == null ? null : R.tijela[i];
  switch (s.pitaj?.velicina) {
    case "v_poslije":
      return tj.vp;
    case "p_prije":
      return tj ? tj.p : R.P;
    case "p_poslije":
      return tj ? tj.pp : R.Pp;
    case "dp":
      return tj.dp;
    case "F":
      return tj.F;
    case "Ek_prije":
      return tj ? tj.Ek : R.Ek;
    case "Ek_poslije":
      return tj ? tj.Ekp : R.Ekp;
    case "gubitak":
      return R.gubitak;
    default:
      return null;
  }
}

// Isti račun s masama u gramima (zaboravljena pretvorba g → kg): vrijednost pitanja ili null ako nema grama.
function bezPretvorbe(s) {
  if (!s.tijela.some((b) => b.jedinica && b.jedinica !== "kg")) return null;
  const t = {
    ...s,
    tijela: s.tijela.map((b) => ({
      ...b,
      m: b.m / (JEDINICE_MASE[b.jedinica] ?? 1),
    })),
  };
  return sudarOdgovor(t);
}

// Tipične krive vrijednosti za pitanje, izračunate iz speca.
export function sudarKrivo(s) {
  const R = sudarIshod(s);
  const q = s.pitaj;
  const i = sudarTijeloPitanja(s);
  const ans = sudarOdgovor(s);
  const K = [];
  const add = (vrijednost, poruka) =>
    isNum(vrijednost) && K.push({ vrijednost: clean(vrijednost), poruka });
  const T = R.tijela;
  const smjer =
    "Iznos je dobar, ali predznak nije. Pozitivan smjer je udesno (→); brzina, količina gibanja i sila ulijevo imaju minus.";

  if (q.velicina === "v_poslije") {
    if (R.zid) {
      add(
        -ans,
        "Iznos je dobar, ali tijelo se nakon udara giba natrag, od zida: brzina mora imati minus.",
      );
      add(
        T[0].v,
        "Tijelo se ne nastavlja gibati prema zidu istom brzinom: odbije se natrag.",
      );
    } else if (R.razdvajanje) {
      const k = 1 - i;
      const v0 = isNum(s.v0) ? s.v0 : 0;
      if (v0 === 0)
        add(
          -ans,
          `Iznos je dobar, ali smjer nije. Prije je ukupna količina gibanja bila 0, pa poslije ${ime(s, i)} i ${ime(s, k)} moraju ići na suprotne strane: brzina treba minus.`,
        );
      else add(-ans, smjer);
      add(
        -(T[i].m * T[k].vp) / T[k].m,
        `Zamijenio si mase. Iz $m_1 v_1' + m_2 v_2' = 0$ brzina je $v' = -\\frac{m_{\\text{drugog}} \\cdot v_{\\text{drugog}}'}{m_{\\text{ovog}}}$: dijeli se masom tijela kojem tražiš brzinu.`,
      );
      add(
        -(T[k].m * T[k].vp) / (T[0].m + T[1].m),
        `Podijelio si ukupnom masom. Nakon razdvajanja tijela se gibaju odvojeno, pa se dijeli samo masom tijela ${ime(s, i)}.`,
      );
      add(
        -T[k].vp,
        "Tijela nemaju jednake brzine, nego jednake i suprotne količine gibanja: lakše tijelo je mnogo brže.",
      );
      add(
        -Math.sign(T[k].vp) * Math.sqrt((T[k].m * T[k].vp ** 2) / T[i].m),
        "Izjednačio si kinetičke energije. Pri razdvajanju se čuva količina gibanja, a energija dolazi izvana (barut, opruga), pa se ne čuva.",
      );
    } else {
      const j = 1 - i;
      const M = T[0].m + T[1].m;
      add(-ans, smjer);
      if (R.spojeni) {
        add(
          R.P / T[1].m,
          `Podijelio si samo masom tijela ${ime(s, 1)}. Nakon sudara tijela se gibaju zajedno, kao jedno tijelo mase $m_1 + m_2$.`,
        );
        add(
          R.P / T[0].m,
          `Podijelio si samo masom tijela ${ime(s, 0)}. Nakon sudara tijela se gibaju zajedno, kao jedno tijelo mase $m_1 + m_2$.`,
        );
        add(
          R.P,
          "To je ukupna količina gibanja (kg·m/s), a ne brzina: podijeli je ukupnom masom.",
        );
        add(
          T[0].v,
          "Brzina ne može ostati ista: isti zalet sad gura veću masu, pa je zajednička brzina manja.",
        );
        add(
          Math.sign(R.P) * Math.sqrt((2 * R.Ek) / M),
          "Izjednačio si kinetičke energije. Kad se tijela spoje, kinetička energija se ne čuva (dio ode u toplinu i deformaciju); čuva se količina gibanja.",
        );
        add(
          (T[0].v + T[1].v) / 2,
          "Ne računa se prosjek brzina: teže tijelo više utječe. Izjednači količinu gibanja prije i poslije.",
        );
      } else {
        add(
          R.P / M,
          "To bi bila zajednička brzina da se tijela spoje. Ovdje se tijela odbiju i gibaju odvojeno.",
        );
        add(
          T[i].v,
          `Brzina tijela ${ime(s, i)} se u sudaru promijeni; ne ostaje ista kao prije.`,
        );
        if (Math.abs(T[0].m - T[1].m) > 1e-9 * M)
          add(T[j].v, "Brzine se zamijene samo kad su mase jednake.");
        if (isNum(s.tijela[j]?.v_poslije)) {
          add(
            R.P / T[i].m,
            `Zaboravio si oduzeti količinu gibanja tijela ${ime(s, j)} poslije sudara: $m_i v_i' = p_{\\text{ukupno}} - m_j v_j'$.`,
          );
          add(
            (R.P + T[j].m * T[j].vp) / T[i].m,
            `Količinu gibanja tijela ${ime(s, j)} poslije sudara treba oduzeti od ukupne, a ne pribrojiti.`,
          );
        }
      }
    }
  }

  if (q.velicina === "p_prije" || q.velicina === "p_poslije") {
    const poslije = q.velicina === "p_poslije";
    add(-ans, smjer);
    if (i == null && !R.zid) {
      const magn = T.reduce((a, t) => a + Math.abs(poslije ? t.pp : t.p), 0);
      add(
        magn,
        "Količine gibanja zbrajaju se s predznakom: kad tijela idu na suprotne strane, oduzimaju se.",
      );
    }
    const tj = i == null ? null : T[i];
    if (tj)
      add(
        poslije ? (tj.m * tj.vp ** 2) / 2 : (tj.m * tj.v ** 2) / 2,
        "To je kinetička energija. Količina gibanja je $p = m \\cdot v$.",
      );
  }

  if (q.velicina === "dp" || q.velicina === "F") {
    const tj = T[i];
    const dt = R.dt ?? 1;
    const f = q.velicina === "F" ? 1 / dt : 1;
    const razlikaIznosa = tj.m * (Math.abs(tj.vp) - Math.abs(tj.v));
    const porukaIznosa =
      "Oduzeo si samo iznose brzina. Tijelo je stalo i krenulo natrag, pa se brzini promijeni i predznak: $\\Delta p = m v' - m v$, s minusom za gibanje ulijevo.";
    add(razlikaIznosa * f, porukaIznosa);
    add(-razlikaIznosa * f, porukaIznosa);
    add(
      -ans,
      q.velicina === "dp"
        ? "Promjena je uvijek „poslije minus prije“: $\\Delta p = p' - p$, a ne $p - p'$."
        : "Sila ima smjer promjene količine gibanja: $F = \\frac{\\Delta p}{\\Delta t}$, s predznakom od $\\Delta p = p' - p$.",
    );
    add(
      (tj.vp - tj.v) * f,
      q.velicina === "dp"
        ? "To je promjena brzine. Količina gibanja je $p = m v$, pa pomnoži masom."
        : "Zaboravio si masu: $F = \\frac{m(v' - v)}{\\Delta t}$.",
    );
    if (q.velicina === "F") {
      add(
        tj.dp * dt,
        "Sila je promjena količine gibanja podijeljena s vremenom, a ne pomnožena: $F = \\frac{\\Delta p}{\\Delta t}$.",
      );
      add(
        -tj.p / dt,
        "To je samo količina gibanja prije udara podijeljena s $\\Delta t$. Sila mora promijeniti cijelu količinu gibanja: $\\Delta p = p' - p$.",
      );
      add(
        tj.p / dt,
        "To je samo količina gibanja prije udara podijeljena s $\\Delta t$. Sila mora promijeniti cijelu količinu gibanja: $\\Delta p = p' - p$.",
      );
    }
  }

  if (q.velicina === "Ek_prije" || q.velicina === "Ek_poslije") {
    const poslije = q.velicina === "Ek_poslije";
    const tj = i == null ? T : [T[i]];
    const v = (t) => (poslije ? t.vp : t.v);
    add(
      tj.reduce((a, t) => a + t.m * v(t) ** 2, 0),
      "Zaboravio si podijeliti s 2: $E_k = \\frac{m v^2}{2}$.",
    );
    add(
      tj.reduce((a, t) => a + (t.m * Math.abs(v(t))) / 2, 0),
      "Brzinu treba kvadrirati: $E_k = \\frac{m v^2}{2}$.",
    );
    if (poslije && i == null && !R.zid && R.vrsta !== "elasticni")
      add(
        R.Ek,
        "Kinetička energija se u ovom sudaru ne čuva: dio ode u toplinu, zvuk i deformaciju. Izračunaj je iz brzina poslije.",
      );
    if (poslije && R.spojeni && i == null)
      add(
        (T[0].m * T[0].vp ** 2) / 2,
        "Nakon sudara gibaju se oba tijela zajedno: uzmi ukupnu masu $m_1 + m_2$.",
      );
  }

  if (q.velicina === "gubitak") {
    add(
      R.Ekp,
      "To je kinetička energija poslije sudara. Traži se koliko je nestalo: $E_k - E_k'$.",
    );
    add(
      R.Ek,
      "To je kinetička energija prije sudara. Traži se koliko je nestalo: $E_k - E_k'$.",
    );
    add(
      0,
      "Kinetička energija se u ovom sudaru ne čuva: usporedi $E_k$ prije i poslije.",
    );
    add(
      2 * R.gubitak,
      "Zaboravio si podijeliti s 2: $E_k = \\frac{m v^2}{2}$.",
    );
  }

  const g = bezPretvorbe(s);
  if (isNum(g)) add(g, "Masu u gramima pretvori u kilograme (10 g = 0,01 kg).");

  // bez točnog odgovora i bez ponavljanja (prva poruka vrijedi)
  const tol = tolerance(ans, s.pitaj?.tolerancija);
  const out = [];
  for (const k of K) {
    if (near(k.vrijednost, ans, Math.max(tol, tolerance(k.vrijednost))))
      continue;
    if (
      out.some((o) => near(o.vrijednost, k.vrijednost, tolerance(k.vrijednost)))
    )
      continue;
    out.push(k);
  }
  return out;
}

const savjet = (s) => {
  const R = sudarIshod(s);
  switch (s.pitaj.velicina) {
    case "v_poslije":
      if (R.zid)
        return "Pri udaru u zid brzina mijenja smjer; pozitivan smjer je prema zidu.";
      if (R.razdvajanje)
        return "Ukupna količina gibanja prije i poslije je ista: $(m_1 + m_2) v_0 = m_1 v_1' + m_2 v_2'$. Pazi na predznak.";
      if (R.spojeni)
        return "Ukupna količina gibanja prije = poslije. Nakon sudara tijela se gibaju zajedno, kao jedno tijelo mase $m_1 + m_2$.";
      return "Ukupna količina gibanja prije i poslije sudara je ista: $m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2'$. Pazi na predznake.";
    case "p_prije":
    case "p_poslije":
      return "Količina gibanja je $p = m v$, s predznakom smjera (udesno +, ulijevo −); ukupna je zbroj s predznacima.";
    case "dp":
      return "$\\Delta p = p' - p = m v' - m v$; brzina ulijevo ima minus.";
    case "F":
      return "Prosječna sila je $F = \\frac{\\Delta p}{\\Delta t}$, a $\\Delta p = m v' - m v$ (s predznacima).";
    case "gubitak":
      return "Izračunaj ukupnu kinetičku energiju prije i poslije ($E_k = \\frac{m v^2}{2}$ za svako tijelo) i oduzmi.";
    default:
      return "Kinetička energija je $E_k = \\frac{m v^2}{2}$ za svako tijelo; ukupna je zbroj.";
  }
};

// ── widget ────────────────────────────────────────────────────────────────────────────────────────
const VELICINE_OPIS = Object.entries(SUDAR_VELICINE)
  .map(([k, v]) => `${k} (${v.jedinica})`)
  .join(", ");

export const sudar = {
  tip: "sudar",
  samoRucno: true,
  uloga: (s) => (s.nacin === "predvidi" ? ODGOVOR : POGLEDAJ),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Sudar na pruzi (jedna dimenzija): dva tijela ili tijelo i zid. Animacija sudara, strelice brzina, količine gibanja prije/poslije
na brojevnom pravcu, stupci kinetičke energije (gubitak kao toplina) i po želji impuls sile F–t s klizačem trajanja. Sve vrijednosti
računa aplikacija. Pozitivan smjer je udesno; tijela[0] je lijevo, tijela[1] desno; zid je desno.
Polja: tekst, nacin, vrsta ("elasticni" | "neelasticni" | "savrseno_neelasticni" (spoje se) | "razdvajanje" (trzaj, eksplozija)),
tijela: [{oznaka (kratko, npr. "vagon A", "puška"), m (u kg!), v? (m/s, s predznakom; zadano 0), v_poslije?, jedinica? ("kg" | "g" | "t" – samo prikaz mase),
slika? (${SUDAR_SLIKE.join(" | ")})}] (2 tijela; 1 uz zid: true),
e? (koeficijent restitucije 0 < e < 1, samo za "neelasticni" bez zadane v_poslije), v0? (razdvajanje: zajednička brzina prije, zadano 0),
trajanje? (Δt sudara u s: crta impuls sile F = Δp/Δt s klizačem), prikazi? (podskup od ${PRIKAZI.join(", ")}; zadano p, Ek i F ako ima trajanje).
- elasticni / savrseno_neelasticni: brzine poslije računa aplikacija (bez v_poslije);
- neelasticni: zadaj e ILI v_poslije jednog tijela (drugo se računa iz očuvanja količine gibanja);
- razdvajanje: tijela miruju (ili se gibaju s v0) zajedno; točno jedno tijelo ima v_poslije, drugo se računa (npr. [puška, metak]);
- zid: true, jedno tijelo s v > 0; vrsta elasticni (v' = −v), savrseno_neelasticni (stane) ili neelasticni s e ili v_poslije (npr. −6).
Načini:
- "istrazi": korak za gledanje, učenik pušta sudar i mijenja klizače; klizaci?: [{id: ${KLIZACI.join(" | ")}, min, max, korak}]
  (m u jedinici tijela, v u m/s, vp = zadana v_poslije, dt u s), vrste?: popis 2–3 vrste sudara među kojima učenik bira (prekidač);
- "prikaz": korak za gledanje, zadani sudar s gumbom za puštanje;
- "predvidi": učenik upiše traženu veličinu s predznakom, zatim animacija pokaže pravi ishod. pitaj: {velicina: ${VELICINE_OPIS},
  tijelo? (0 | 1; bez njega p i Ek su ukupni, a v_poslije kod spajanja zajednička), tolerancija?}. Tipične greške (zaboravljena ukupna masa,
  iznos bez predznaka, razlika iznosa umjesto Δp, očuvanje Ek u neelastičnom sudaru, grami umjesto kilograma…) dodaju se same; ${KRIVO_OPIS}.`,
  primjer: {
    tip: "sudar",
    nacin: "predvidi",
    vrsta: "savrseno_neelasticni",
    tekst:
      "Vagon mase 8000 kg naleti brzinom 2 m/s na vagon mase 12000 kg koji miruje i spoje se. Kolikom se brzinom gibaju zajedno?",
    tijela: [
      { oznaka: "vagon A", m: 8000, v: 2, slika: "vagon" },
      { oznaka: "vagon B", m: 12000, v: 0, slika: "vagon" },
    ],
    pitaj: { velicina: "v_poslije" },
  },
  primjeri: [
    {
      tip: "sudar",
      nacin: "istrazi",
      vrsta: "savrseno_neelasticni",
      vrste: ["elasticni", "neelasticni", "savrseno_neelasticni"],
      e: 0.5,
      tekst:
        "Pusti sudar, pa promijeni vrstu sudara i mase. Gledaj ukupnu količinu gibanja i ukupnu kinetičku energiju prije i poslije.",
      tijela: [
        { oznaka: "A", m: 2, v: 3, slika: "kolica" },
        { oznaka: "B", m: 3, v: 0, slika: "kolica" },
      ],
      klizaci: [
        { id: "m1", min: 1, max: 6, korak: 0.5 },
        { id: "m2", min: 1, max: 6, korak: 0.5 },
        { id: "v1", min: 1, max: 6, korak: 0.5 },
        { id: "v2", min: -4, max: 4, korak: 0.5 },
      ],
    },
    {
      tip: "sudar",
      nacin: "predvidi",
      vrsta: "razdvajanje",
      tekst:
        "Puška mase 4 kg ispali metak mase 10 g brzinom 600 m/s. Kolikom brzinom puška trzne? Pazi na predznak.",
      tijela: [
        { oznaka: "puška", m: 4, slika: "puska" },
        {
          oznaka: "metak",
          m: 0.01,
          jedinica: "g",
          v_poslije: 600,
          slika: "metak",
        },
      ],
      pitaj: { velicina: "v_poslije" },
    },
    {
      tip: "sudar",
      nacin: "prikaz",
      vrsta: "razdvajanje",
      tekst:
        "Pucanj: puška i metak dobiju jednake i suprotne količine gibanja. Usporedi njihove kinetičke energije.",
      tijela: [
        { oznaka: "puška", m: 4, slika: "puska" },
        {
          oznaka: "metak",
          m: 0.01,
          jedinica: "g",
          v_poslije: 600,
          slika: "metak",
        },
      ],
    },
    {
      tip: "sudar",
      nacin: "predvidi",
      vrsta: "neelasticni",
      zid: true,
      trajanje: 0.02,
      tekst:
        "Lopta mase 0,4 kg udari okomito u zid brzinom 8 m/s i odbije se natrag brzinom 6 m/s. Kolika je promjena količine gibanja lopte?",
      tijela: [
        { oznaka: "lopta", m: 0.4, v: 8, v_poslije: -6, slika: "lopta" },
      ],
      pitaj: { velicina: "dp" },
    },
    {
      tip: "sudar",
      nacin: "predvidi",
      vrsta: "neelasticni",
      zid: true,
      trajanje: 0.02,
      tekst:
        "Sudar lopte (0,4 kg, 8 m/s → 6 m/s natrag) sa zidom trajao je 0,02 s. Kolika je prosječna sila zida na loptu?",
      tijela: [
        { oznaka: "lopta", m: 0.4, v: 8, v_poslije: -6, slika: "lopta" },
      ],
      pitaj: { velicina: "F" },
    },
    {
      tip: "sudar",
      nacin: "istrazi",
      vrsta: "neelasticni",
      zid: true,
      trajanje: 0.02,
      tekst:
        "Mijenjaj trajanje udara klizačem $\\Delta t$. Promjena količine gibanja ostaje ista – što se događa sa silom?",
      tijela: [
        { oznaka: "lopta", m: 0.4, v: 8, v_poslije: -6, slika: "lopta" },
      ],
      klizaci: [{ id: "dt", min: 0.01, max: 0.4, korak: 0.01 }],
      prikazi: ["p", "F"],
    },
    {
      tip: "sudar",
      nacin: "predvidi",
      vrsta: "savrseno_neelasticni",
      tekst:
        "Vagoni (8000 kg, 2 m/s i 12000 kg u mirovanju) spoje se i gibaju zajedno brzinom 0,8 m/s. Koliko se kinetičke energije pretvorilo u toplinu, zvuk i deformaciju?",
      tijela: [
        { oznaka: "vagon A", m: 8000, v: 2, slika: "vagon" },
        { oznaka: "vagon B", m: 12000, v: 0, slika: "vagon" },
      ],
      pitaj: { velicina: "gubitak" },
    },
    {
      tip: "sudar",
      nacin: "predvidi",
      vrsta: "neelasticni",
      tekst:
        "Kugla A (2 kg, 3 m/s) udari kuglu B (1 kg) koja ide prema njoj brzinom 1 m/s. Nakon sudara A ide udesno brzinom 0,5 m/s. Kolika je brzina kugle B?",
      tijela: [
        { oznaka: "A", m: 2, v: 3, v_poslije: 0.5, slika: "kugla" },
        { oznaka: "B", m: 1, v: -1, slika: "kugla" },
      ],
      pitaj: { velicina: "v_poslije", tijelo: 1 },
    },
  ],

  validate(s) {
    const { list, need } = problems();
    need(
      NACINI.includes(s.nacin),
      `sudar.nacin mora biti ${NACINI.join(", ")}`,
    );
    need(isText(s.tekst), "sudar treba „tekst“");
    if (
      !need(
        SUDAR_VRSTE.includes(s.vrsta),
        `sudar.vrsta mora biti ${SUDAR_VRSTE.join(", ")}`,
      )
    )
      return list;
    if (s.zid != null) need(s.zid === true, "zid je true ili ga nema");
    const n = s.zid ? 1 : 2;
    if (
      !need(
        Array.isArray(s.tijela) && s.tijela.length === n,
        s.zid
          ? "uz zid: true treba točno jedno tijelo"
          : "sudar treba točno dva tijela (ili jedno uz zid: true)",
      )
    )
      return list;
    let ok = true;
    s.tijela.forEach((b, i) => {
      const at = `tijela[${i}]`;
      ok =
        need(
          isText(b?.oznaka) && b.oznaka.length <= 14,
          `${at}.oznaka mora biti kratak tekst (do 14 znakova)`,
        ) && ok;
      ok =
        need(
          isNum(b?.m) && b.m > 0 && b.m <= 1e7,
          `${at}.m mora biti masa u kg (0 < m ≤ 10⁷); grame zapiši kao kg uz jedinica: "g"`,
        ) && ok;
      if (b?.v != null)
        ok =
          need(
            isNum(b.v) && Math.abs(b.v) <= 5000,
            `${at}.v mora biti broj (m/s, s predznakom)`,
          ) && ok;
      if (b?.v_poslije != null)
        ok =
          need(
            isNum(b.v_poslije) && Math.abs(b.v_poslije) <= 5000,
            `${at}.v_poslije mora biti broj (m/s, s predznakom)`,
          ) && ok;
      if (b?.jedinica != null)
        need(
          b.jedinica in JEDINICE_MASE,
          `${at}.jedinica mora biti ${Object.keys(JEDINICE_MASE).join(", ")} (m je uvijek u kg)`,
        );
      if (b?.slika != null)
        need(
          SUDAR_SLIKE.includes(b.slika),
          `${at}.slika mora biti jedna od: ${SUDAR_SLIKE.join(", ")}`,
        );
    });
    if (!ok) return list;
    const zadanih = s.tijela.filter((b) => b.v_poslije != null).length;
    if (s.zid) {
      need(s.vrsta !== "razdvajanje", "zid ne može uz vrsta razdvajanje");
      need(isNum(s.tijela[0].v), "tijelo uz zid treba brzinu v");
      if (s.vrsta === "neelasticni")
        need(
          (s.e != null) !== (zadanih === 1),
          "zid s vrsta neelasticni: zadaj e ILI v_poslije (jedno od dvoga)",
        );
      else
        need(
          zadanih === 0,
          `uz vrsta ${s.vrsta} brzinu poslije računa aplikacija: makni v_poslije`,
        );
    } else if (s.vrsta === "razdvajanje") {
      need(
        zadanih === 1,
        "razdvajanje treba točno jedno tijelo s v_poslije (drugom brzinu računa aplikacija)",
      );
      need(
        s.tijela.every((b) => b.v == null),
        "kod razdvajanja tijela prije imaju zajedničku brzinu v0 (zadano 0), pa makni tijela[].v",
      );
      if (s.v0 != null)
        need(isNum(s.v0) && Math.abs(s.v0) <= 5000, "v0 mora biti broj (m/s)");
    } else {
      if (s.vrsta === "neelasticni")
        need(
          (s.e != null) !== (zadanih === 1),
          "neelasticni: zadaj e ILI v_poslije jednog tijela (jedno od dvoga)",
        );
      else
        need(
          zadanih === 0,
          `uz vrsta ${s.vrsta} brzine poslije računa aplikacija: makni v_poslije`,
        );
    }
    if (s.v0 != null)
      need(s.vrsta === "razdvajanje", "v0 postoji samo kod razdvajanja");
    const trebaE = s.vrsta === "neelasticni" && zadanih === 0;
    const eDopusten =
      trebaE ||
      (s.nacin === "istrazi" &&
        Array.isArray(s.vrste) &&
        s.vrste.includes("neelasticni"));
    if (s.e != null)
      need(
        eDopusten && isNum(s.e) && s.e > 0 && s.e < 1,
        "e (koeficijent restitucije) mora biti 0 < e < 1 i samo uz neelastičan sudar bez zadane v_poslije",
      );
    if (s.trajanje != null)
      need(
        isNum(s.trajanje) && s.trajanje > 0 && s.trajanje <= 5,
        "trajanje (Δt sudara) mora biti broj sekundi, 0 < Δt ≤ 5",
      );
    if (s.prikazi != null) {
      if (
        need(
          Array.isArray(s.prikazi) &&
            s.prikazi.length >= 1 &&
            s.prikazi.every((p) => PRIKAZI.includes(p)),
          `prikazi mora biti popis od: ${PRIKAZI.join(", ")}`,
        )
      ) {
        need(
          !s.prikazi.includes("F") || s.trajanje != null,
          "prikazi F treba trajanje (Δt)",
        );
      }
    }
    if (list.length) return list;
    const fiz = sudarProblem(s);
    need(!fiz, `sudar: ${fiz}`);

    // načini
    if (s.nacin !== "istrazi") {
      need(s.klizaci == null, "klizaci postoje samo u načinu istrazi");
      need(
        s.vrste == null,
        "vrste (prekidač vrste sudara) postoje samo u načinu istrazi",
      );
    }
    if (s.nacin !== "predvidi") {
      noAnswerFields(s, need);
      need(
        s.pitaj == null,
        `korak „sudar“ u načinu ${s.nacin} je za gledanje, pa ne smije imati „pitaj“`,
      );
    }
    if (s.nacin === "istrazi") {
      if (s.vrste != null) {
        const v = s.vrste;
        if (
          need(
            Array.isArray(v) &&
              v.length >= 2 &&
              v.length <= 3 &&
              new Set(v).size === v.length &&
              v.every((x) => SUDARI.includes(x)),
            "vrste mora biti 2–3 različite vrste od: elasticni, neelasticni, savrseno_neelasticni",
          )
        ) {
          need(
            v.includes(s.vrsta),
            "vrste mora sadržavati početnu vrstu (vrsta)",
          );
          need(
            zadanih === 0,
            "uz prekidač vrsta brzine poslije računa aplikacija: makni v_poslije",
          );
          if (v.includes("neelasticni"))
            need(
              isNum(s.e),
              "prekidač s neelastičnim sudarom treba e (0 < e < 1)",
            );
        }
      }
      if (
        s.klizaci != null &&
        need(
          Array.isArray(s.klizaci) &&
            s.klizaci.length >= 1 &&
            s.klizaci.length <= 5,
          "klizaci mora biti popis 1–5 klizača",
        )
      ) {
        const ids = [];
        s.klizaci.forEach((k, i) => {
          const at = `klizaci[${i}]`;
          if (
            !need(
              KLIZACI.includes(k?.id),
              `${at}.id mora biti jedan od: ${KLIZACI.join(", ")}`,
            )
          )
            return;
          ids.push(k.id);
          if (
            !need(
              [k.min, k.max, k.korak].every(isNum) &&
                k.max > k.min &&
                k.korak > 0,
              `${at} treba brojeve min < max i korak > 0`,
            )
          )
            return;
          need(
            (k.max - k.min) / k.korak <= 400,
            `${at} ima previše koraka (najviše 400)`,
          );
          const cur = klizacPocetak(s, k.id);
          need(
            cur == null || (cur >= k.min - 1e-9 && cur <= k.max + 1e-9),
            `${at}: početna vrijednost iz speca (${formatNumber(cur)}) mora biti između min i max`,
          );
          if (k.id === "m1" || k.id === "m2")
            need(k.min > 0, `${at}: masa mora biti > 0`);
          if (k.id === "m2" || k.id === "v2")
            need(!s.zid, `${at}: uz zid postoji samo jedno tijelo`);
          if (k.id === "v1" || k.id === "v2")
            need(
              s.vrsta !== "razdvajanje",
              `${at}: kod razdvajanja nema brzina prije (klizač vp mijenja zadanu brzinu poslije)`,
            );
          if (k.id === "vp")
            need(
              zadanih === 1,
              `${at}: klizač vp treba tijelo sa zadanom v_poslije`,
            );
          if (k.id === "e") need(isNum(s.e), `${at}: klizač e treba zadani e`);
          if (k.id === "dt")
            need(
              s.trajanje != null &&
                k.min > 0 &&
                (!s.prikazi || s.prikazi.includes("F")),
              `${at}: klizač dt treba trajanje, min > 0 i prikaz F`,
            );
        });
        need(
          new Set(ids).size === ids.length,
          "id-jevi klizača moraju biti različiti",
        );
      }
    }
    if (s.nacin === "predvidi") {
      const q = s.pitaj;
      if (
        !need(
          q && SUDAR_VELICINE[q.velicina],
          `predvidi treba pitaj: {velicina: ${Object.keys(SUDAR_VELICINE).join(" | ")}}`,
        )
      )
        return list;
      if (q.tijelo != null)
        need(
          Number.isInteger(q.tijelo) && q.tijelo >= 0 && q.tijelo < n,
          `pitaj.tijelo mora biti indeks tijela (0${n > 1 ? " ili 1" : ""})`,
        );
      if (q.tolerancija != null)
        need(
          isNum(q.tolerancija) && q.tolerancija >= 0,
          "pitaj.tolerancija mora biti broj ≥ 0",
        );
      const i = sudarTijeloPitanja(s);
      if (q.velicina === "v_poslije") {
        if (
          !s.zid &&
          SUDARI.includes(s.vrsta) &&
          s.vrsta !== "savrseno_neelasticni" &&
          zadanih === 0
        )
          need(
            q.tijelo != null,
            "pitaj v_poslije kod sudara koji nije savršeno neelastičan treba tijelo (0 ili 1)",
          );
        if (i != null)
          need(
            !isNum(s.tijela[i]?.v_poslije),
            "pitaj v_poslije za tijelo kojem je v_poslije već zadana: pitaj za drugo tijelo",
          );
      }
      if (q.velicina === "F")
        need(s.trajanje != null, "pitaj F treba trajanje (Δt)");
      if (q.velicina === "gubitak") {
        need(
          s.vrsta !== "razdvajanje",
          "kod razdvajanja kinetička energija raste; pitaj Ek_poslije umjesto gubitka",
        );
        need(
          s.vrsta !== "elasticni",
          "u elastičnom sudaru nema gubitka kinetičke energije",
        );
      }
      if (list.length) return list;
      const a = sudarOdgovor(s);
      need(isNum(a), "traženu veličinu nije moguće izračunati");
      validateKrivo(s.krivo, a, tolerance(a, q.tolerancija), need);
    }
    return list;
  },

  check(s, input) {
    const q = s.pitaj;
    const unit = SUDAR_VELICINE[q.velicina].jedinica;
    const answer = sudarOdgovor(s);
    const krivo = [...(s.krivo ?? []), ...sudarKrivo(s)];
    // vrlo mali odgovori (0): apsolutna tolerancija prema veličini ostalih iznosa
    const tol = isNum(q.tolerancija)
      ? q.tolerancija
      : answer === 0
        ? 1e-6 * skala(s)
        : undefined;
    return checkNumber({
      input,
      answer,
      tol,
      unit,
      krivo,
      savjet: s.savjet || savjet(s),
    });
  },
  tocanOdgovor(s) {
    const v = SUDAR_VELICINE[s.pitaj.velicina];
    const i = sudarTijeloPitanja(s);
    const kome =
      i == null
        ? s.zid || s.pitaj.velicina === "gubitak"
          ? ""
          : " (ukupno)"
        : s.zid ||
            (s.pitaj.velicina === "v_poslije" &&
              s.vrsta === "savrseno_neelasticni")
          ? ""
          : ` (${ime(s, i)})`;
    return `${v.naziv}${kome}: ${withUnit(sudarOdgovor(s), v.jedinica)}`;
  },
  brojcaniOdgovor: (s) =>
    s.nacin === "predvidi" && s.pitaj ? sudarOdgovor(s) : null,
};

// Vrijednost iz speca na kojoj klizač počinje (u jedinici prikaza tijela za masu).
export function klizacPocetak(s, id) {
  const t = s.tijela ?? [];
  const f = (i) => JEDINICE_MASE[t[i]?.jedinica] ?? 1;
  switch (id) {
    case "m1":
      return isNum(t[0]?.m) ? clean(t[0].m / f(0)) : null;
    case "m2":
      return isNum(t[1]?.m) ? clean(t[1].m / f(1)) : null;
    case "v1":
      return isNum(t[0]?.v) ? t[0].v : 0;
    case "v2":
      return isNum(t[1]?.v) ? t[1].v : 0;
    case "vp":
      return t.find((b) => isNum(b?.v_poslije))?.v_poslije ?? null;
    case "e":
      return isNum(s.e) ? s.e : null;
    case "dt":
      return isNum(s.trajanje) ? s.trajanje : null;
    default:
      return null;
  }
}

// Spec s vrijednostima klizača i odabranom vrstom (istraživanje): ista fizika kao i za zadani spec.
export function sudarSaKlizacima(s, vrijednosti = {}, vrsta = s.vrsta) {
  const t = s.tijela.map((b, i) => {
    const f = JEDINICE_MASE[b.jedinica] ?? 1;
    const c = { ...b };
    if (isNum(vrijednosti[`m${i + 1}`])) c.m = vrijednosti[`m${i + 1}`] * f;
    if (isNum(vrijednosti[`v${i + 1}`])) c.v = vrijednosti[`v${i + 1}`];
    if (isNum(vrijednosti.vp) && isNum(b.v_poslije))
      c.v_poslije = vrijednosti.vp;
    return c;
  });
  const out = { ...s, tijela: t, vrsta };
  if (isNum(vrijednosti.e)) out.e = vrijednosti.e;
  if (isNum(vrijednosti.dt)) out.trajanje = vrijednosti.dt;
  return out;
}

// Red veličine iznosa u zadatku (za apsolutnu toleranciju kad je točan odgovor 0).
function skala(s) {
  const R = sudarIshod(s);
  return Math.max(
    1,
    ...R.tijela.flatMap((t) => [
      Math.abs(t.p),
      Math.abs(t.pp),
      Math.abs(t.v),
      Math.abs(t.vp),
      t.Ek,
    ]),
  );
}
