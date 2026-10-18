// krivulja_zagrijavanja: graf T–Q (ili T–t uz grijač snage P) za tvar iz zadanih podataka, dijelovi u omjeru
// stvarnih toplina (taljenje i isparavanje vidljivo su dulji), i kalorimetrija u istom widgetu: miješanje tijela
// do zajedničke temperature (vrsta "mijesanje") i grijanje vode s posudom na grijaču (vrsta "grijac").
// Crtež i provjera koriste iste funkcije (dijelovi, tKonacna, grijanje).
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
import {
  JEDINICE,
  jedinicaOk,
  uJedinici,
  krivoJedinica,
  krivoU,
  pozitivan,
  fmtJ,
} from "./_fluidi.js";

const TIP = "krivulja_zagrijavanja";
const VRSTE = {
  krivulja: ["istrazi", "odaberi", "ocitaj"],
  mijesanje: ["istrazi", "predvidi"],
  grijac: ["istrazi", "predvidi"],
};
const STANJA = ["kruto", "tekuce", "plin"];
export const NAZIV_DIJELA = {
  grije_kruto: "zagrijavanje krute tvari",
  taljenje: "taljenje",
  grije_tekuce: "zagrijavanje tekućine",
  isparavanje: "isparavanje",
  grije_plin: "zagrijavanje plina (pare)",
};
const ODABERI = {
  promjena_stanja: (d) => d.ravno,
  stalna_temperatura: (d) => d.ravno,
  temperatura_raste: (d) => !d.ravno,
  taljenje: (d) => d.vrsta === "taljenje",
  isparavanje: (d) => d.vrsta === "isparavanje",
  grije_kruto: (d) => d.vrsta === "grije_kruto",
  grije_tekuce: (d) => d.vrsta === "grije_tekuce",
  grije_plin: (d) => d.vrsta === "grije_plin",
};
const RAVNE = [
  "promjena_stanja",
  "stalna_temperatura",
  "taljenje",
  "isparavanje",
];
const OCITAJ = {
  Q_dio: "energija",
  Q_ukupno: "energija",
  t_dio: "vrijeme",
  t_ukupno: "vrijeme",
};
const PITAJ_KAL = {
  mijesanje: { t_konacna: "temperatura" },
  grijac: { Q: "energija", t_grijanja: "vrijeme" },
};
const ZADANA = { energija: "J", vrijeme: "s", temperatura: "°C" };

export const vrstaOf = (s) => s.vrsta ?? "krivulja";

// ── krivulja: dijelovi grafa ────────────────────────────────────────────────────────────────────────
// Početno i završno stanje: na samom talištu tvar je kruta na početku, a rastaljena na kraju (led na 0 °C se tali;
// „zagrij do tališta i otopi“), isto na vrelištu. Iznimke se zadaju poljima stanje_od / stanje_do.
export function stanjeOd(s) {
  if (s.stanje_od) return s.stanje_od;
  const { taliste, vreliste } = s.tvar;
  return s.od <= taliste ? "kruto" : s.od <= vreliste ? "tekuce" : "plin";
}
export function stanjeDo(s) {
  if (s.stanje_do) return s.stanje_do;
  const { taliste, vreliste } = s.tvar;
  return s.do < taliste ? "kruto" : s.do < vreliste ? "tekuce" : "plin";
}

// Dijelovi redom: {br (od 1), vrsta, ravno, T0, T1, Q (J ili null kad podaci nedostaju), formula, stanje}.
export function dijelovi(s) {
  const t = s.tvar;
  const m = s.m;
  const out = [];
  const grij = (vrsta, c, T0, T1, stanje) => {
    if (T1 > T0 + 1e-9)
      out.push({
        vrsta,
        ravno: false,
        T0,
        T1,
        c,
        Q: isNum(m) && isNum(c) ? m * c * (T1 - T0) : null,
        stanje,
      });
  };
  const prijelaz = (vrsta, T, L, simbol) =>
    out.push({
      vrsta,
      ravno: true,
      T0: T,
      T1: T,
      L,
      simbol,
      Q: isNum(m) && isNum(L) ? m * L : null,
    });
  let st = stanjeOd(s);
  const kraj = stanjeDo(s);
  let T = s.od;
  if (st === "kruto") {
    const Tk = kraj === "kruto" ? s.do : t.taliste;
    grij("grije_kruto", t.c_kruto, T, Tk, "kruto");
    T = Tk;
    if (kraj !== "kruto") {
      prijelaz("taljenje", t.taliste, t.lambda, "λ");
      st = "tekuce";
    }
  }
  if (st === "tekuce") {
    const Tk = kraj === "tekuce" ? s.do : t.vreliste;
    grij("grije_tekuce", t.c_tekuce, T, Tk, "tekuce");
    T = Tk;
    if (kraj === "plin") {
      prijelaz("isparavanje", t.vreliste, t.r, "r");
      st = "plin";
    }
  }
  if (st === "plin") grij("grije_plin", t.c_plin, T, s.do, "plin");
  let Q0 = 0;
  return out.map((d, i) => {
    const r = { ...d, br: i + 1, Q0 };
    Q0 = isNum(Q0) && isNum(d.Q) ? Q0 + d.Q : null;
    return r;
  });
}

const ocitajVelicina = (s) => s.ocitaj?.velicina;
function rasponDijelova(s) {
  const q = s.ocitaj;
  const v = ocitajVelicina(s);
  if (v === "Q_dio" || v === "t_dio") return [q.dio, q.dio];
  const n = dijelovi(s).length;
  return [q.od_dijela ?? 1, q.do_dijela ?? n];
}
const zbrojQ = (ds, a, b, f = (d) => d.Q) =>
  ds.filter((d) => d.br >= a && d.br <= b).reduce((sum, d) => sum + f(d), 0);

// ── kalorimetrija ───────────────────────────────────────────────────────────────────────────────────
const mc = (t) => t.m * t.c;
export const tKonacna = (tijela) =>
  tijela.reduce((a, t) => a + mc(t) * t.t0, 0) /
  tijela.reduce((a, t) => a + mc(t), 0);
// grijanje vode s posudom: Q po tijelu, ukupno i vrijeme na grijaču
export function grijanje(s) {
  const dt = s.t1 - s.t0;
  const Qi = s.tijela.map((t) => mc(t) * dt);
  const Q = Qi.reduce((a, b) => a + b, 0);
  return { Qi, Q, t: isNum(s.snaga) ? Q / s.snaga : null, dt };
}

// ── odgovor ─────────────────────────────────────────────────────────────────────────────────────────
function velicinaOdgovora(s) {
  const v = vrstaOf(s);
  if (v === "krivulja") return OCITAJ[ocitajVelicina(s)];
  return PITAJ_KAL[v]?.[s.pitaj];
}
const jedinica = (s) => s.jedinica ?? ZADANA[velicinaOdgovora(s)];

function odgovorSI(s) {
  const v = vrstaOf(s);
  if (v === "mijesanje") return tKonacna(s.tijela);
  if (v === "grijac") return s.pitaj === "Q" ? grijanje(s).Q : grijanje(s).t;
  const q = ocitajVelicina(s);
  const [a, b] = rasponDijelova(s);
  const Q = zbrojQ(dijelovi(s), a, b);
  return q.startsWith("t_") ? Q / s.snaga : Q;
}
export const odgovor = (s) =>
  uJedinici(odgovorSI(s), velicinaOdgovora(s), jedinica(s));
// dijelovi koje treba označiti u načinu odaberi
export const tocniDijelovi = (s) =>
  dijelovi(s)
    .filter(ODABERI[s.odaberi] ?? (() => false))
    .map((d) => d.br);

function tolOf(s, answer) {
  if (isNum(s.tolerancija)) return s.tolerancija;
  return velicinaOdgovora(s) === "temperatura" ? 0.5 : Math.abs(answer) * 0.005;
}

// ── provjera speca ──────────────────────────────────────────────────────────────────────────────────
function validateTvar(s, need) {
  const t = s.tvar;
  if (
    !need(
      t && typeof t === "object",
      "krivulja treba tvar: {naziv, taliste, vreliste, c_kruto, c_tekuce, c_plin?, lambda, r}",
    )
  )
    return false;
  need(isText(t.naziv), "tvar.naziv mora biti tekst (npr. „voda“)");
  const ok = need(
    isNum(t.taliste) &&
      isNum(t.vreliste) &&
      t.taliste < t.vreliste &&
      t.taliste > -273.15,
    "tvar treba taliste < vreliste (°C, iznad −273,15)",
  );
  for (const k of ["c_kruto", "c_tekuce", "c_plin"])
    if (t[k] != null)
      need(
        pozitivan(t[k]) && t[k] <= 50000,
        `tvar.${k} je specifični toplinski kapacitet u J/(kg·K), pozitivan`,
      );
  for (const k of ["lambda", "r"])
    if (t[k] != null)
      need(
        pozitivan(t[k]) && t[k] <= 1e8,
        `tvar.${k} je latentna toplina u J/kg, pozitivna`,
      );
  return ok;
}

function validateKrivulja(s, need, list) {
  if (!validateTvar(s, need)) return;
  need(
    isNum(s.od) && isNum(s.do) && s.od <= s.do && s.od > -273.15,
    "krivulja treba od ≤ do (°C, iznad −273,15)",
  );
  if (s.stanje_od != null)
    need(
      STANJA.includes(s.stanje_od),
      "stanje_od mora biti kruto, tekuce ili plin",
    );
  if (s.stanje_do != null)
    need(
      STANJA.includes(s.stanje_do),
      "stanje_do mora biti kruto, tekuce ili plin",
    );
  if (s.shematski != null)
    need(
      typeof s.shematski === "boolean",
      "shematski mora biti true ili false",
    );
  if (s.snaga != null)
    need(pozitivan(s.snaga) && s.snaga <= 1e7, "snaga grijača u W, pozitivna");
  if (list.length) return;
  const { taliste: Tt, vreliste: Tv } = s.tvar;
  const moze = {
    kruto: (T) => T <= Tt,
    tekuce: (T) => T >= Tt && T <= Tv,
    plin: (T) => T >= Tv,
  };
  need(
    moze[stanjeOd(s)](s.od),
    `na ${formatNumber(s.od)} °C tvar ne može biti u stanju „${stanjeOd(s)}“ (talište ${formatNumber(Tt)} °C, vrelište ${formatNumber(Tv)} °C)`,
  );
  need(
    moze[stanjeDo(s)](s.do),
    `na ${formatNumber(s.do)} °C tvar ne može biti u stanju „${stanjeDo(s)}“`,
  );
  need(
    STANJA.indexOf(stanjeOd(s)) <= STANJA.indexOf(stanjeDo(s)),
    "krivulja zagrijavanja ide od krutog prema plinu, ne obrnuto",
  );
  if (list.length) return;
  const ds = dijelovi(s);
  if (
    !need(ds.length >= 1 && ds.length <= 5, "krivulja mora imati 1–5 dijelova")
  )
    return;
  if (!s.shematski) {
    need(
      pozitivan(s.m) && s.m <= 1000,
      "m (masa u kg) mora biti pozitivna; za graf bez brojeva na osi Q stavi shematski: true",
    );
    for (const d of ds)
      need(
        isNum(d.Q),
        `dio ${d.br} (${NAZIV_DIJELA[d.vrsta]}) treba ${d.ravno ? (d.vrsta === "taljenje" ? "tvar.lambda" : "tvar.r") : `tvar.c_${d.stanje}`} (ili shematski: true)`,
      );
  } else if (s.m != null)
    need(pozitivan(s.m), "m (masa u kg) mora biti pozitivna");
  if (s.nacin === "istrazi") noAnswerFields(s, need);
  if (s.nacin === "odaberi") {
    if (
      need(
        s.odaberi in ODABERI,
        `odaberi mora biti jedno od: ${Object.keys(ODABERI).join(", ")}`,
      )
    )
      need(
        tocniDijelovi(s).length >= 1,
        `na ovoj krivulji nema nijednog dijela „${s.odaberi}“`,
      );
  }
  if (s.nacin === "ocitaj") {
    const q = s.ocitaj;
    const v = q?.velicina;
    if (
      !need(
        v in OCITAJ,
        `ocitaj.velicina mora biti jedna od: ${Object.keys(OCITAJ).join(", ")}`,
      )
    )
      return;
    need(
      jedinicaOk(OCITAJ[v], jedinica(s)),
      `jedinica za ${v} mora biti jedna od: ${Object.keys(JEDINICE[OCITAJ[v]]).join(", ")}`,
    );
    {
      need(!s.shematski, "toplina se ne može očitati sa shematskog grafa");
      if (v.startsWith("t_")) need(pozitivan(s.snaga), `${v} treba snaga (W)`);
      if (v.endsWith("_dio"))
        need(
          Number.isInteger(q.dio) && q.dio >= 1 && q.dio <= ds.length,
          `ocitaj.dio mora biti broj dijela 1–${ds.length}`,
        );
      else {
        const a = q.od_dijela ?? 1;
        const b = q.do_dijela ?? ds.length;
        need(
          Number.isInteger(a) &&
            Number.isInteger(b) &&
            a >= 1 &&
            b <= ds.length &&
            a <= b,
          `ocitaj.od_dijela i do_dijela moraju biti brojevi dijelova 1–${ds.length}, od ≤ do`,
        );
      }
    }
    if (!list.length)
      validateKrivo(s.krivo, odgovor(s), tolOf(s, odgovor(s)), need);
  }
}

function validateKalorimetar(s, need, list) {
  const v = vrstaOf(s);
  const n = v === "mijesanje" ? [2, 3] : [1, 3];
  if (
    !need(
      Array.isArray(s.tijela) &&
        s.tijela.length >= n[0] &&
        s.tijela.length <= n[1],
      `${v} treba ${n[0]}–${n[1]} tijela: [{naziv, m (kg), c${v === "mijesanje" ? ", t0" : ""}}]`,
    )
  )
    return;
  s.tijela.forEach((t, i) => {
    need(
      isText(t?.naziv) && t.naziv.length <= 24,
      `tijela[${i}].naziv je kratak tekst`,
    );
    need(
      pozitivan(t?.m) && t.m <= 50,
      `tijela[${i}].m je masa u kg, najviše 50 (npr. 250 g = 0.25)`,
    );
    need(
      pozitivan(t?.c) && t.c <= 50000,
      `tijela[${i}].c je specifični toplinski kapacitet u J/(kg·K)`,
    );
    if (v === "mijesanje")
      need(
        isNum(t?.t0) && t.t0 > -273.15 && t.t0 < 5000,
        `tijela[${i}].t0 je početna temperatura u °C`,
      );
  });
  if (v === "mijesanje" && !list.length) {
    const T = s.tijela.map((t) => t.t0);
    need(
      Math.max(...T) - Math.min(...T) >= 1,
      "tijela trebaju različite početne temperature",
    );
  }
  if (v === "grijac") {
    need(
      isNum(s.t0) && isNum(s.t1) && s.t1 > s.t0,
      "grijac treba t0 < t1 (°C)",
    );
    need(pozitivan(s.snaga) && s.snaga <= 1e6, "grijac treba snaga (W)");
  }
  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    need(s.pitaj == null, "istrazi nema polje pitaj");
  }
  if (s.nacin === "predvidi" && !list.length) {
    const opcije = PITAJ_KAL[v];
    if (
      !need(
        s.pitaj in opcije,
        `pitaj mora biti jedno od: ${Object.keys(opcije).join(", ")}`,
      )
    )
      return;
    need(
      jedinicaOk(opcije[s.pitaj], jedinica(s)),
      `jedinica mora biti jedna od: ${Object.keys(JEDINICE[opcije[s.pitaj]]).join(", ")}`,
    );
    if (!list.length)
      validateKrivo(s.krivo, odgovor(s), tolOf(s, odgovor(s)), need);
  }
}

function validate(s) {
  const { list, need } = problems();
  const v = vrstaOf(s);
  if (
    !need(
      v in VRSTE,
      `vrsta mora biti jedna od: ${Object.keys(VRSTE).join(", ")}`,
    )
  )
    return list;
  need(
    VRSTE[v].includes(s.nacin),
    `za vrstu ${v} nacin mora biti jedan od: ${VRSTE[v].join(", ")}`,
  );
  need(isText(s.tekst), `${TIP} treba „tekst“`);
  if (list.length) return list;
  if (v === "krivulja") validateKrivulja(s, need, list);
  else validateKalorimetar(s, need, list);
  return list;
}

// ── tipične greške ──────────────────────────────────────────────────────────────────────────────────
function krivoKrivulja(s) {
  const q = ocitajVelicina(s);
  const ds = dijelovi(s);
  const [a, b] = rasponDijelova(s);
  const k = q.startsWith("t_") ? 1 / s.snaga : 1;
  const t = s.tvar;
  const out = [];
  const dio = ds.filter((d) => d.br >= a && d.br <= b);
  const imaRavno = dio.some((d) => d.ravno);
  const imaKoso = dio.some((d) => !d.ravno);
  if (imaRavno && imaKoso) {
    out.push({
      si: zbrojQ(ds, a, b, (d) => (d.ravno ? 0 : d.Q)) * k,
      poruka:
        "Zaboravio si toplinu za promjenu stanja (Q = mλ ili Q = mr): temperatura tada stoji, ali grijač i dalje troši toplinu.",
    });
    out.push({
      si: zbrojQ(ds, a, b, (d) => (d.ravno ? d.Q : 0)) * k,
      poruka:
        "Zaboravio si zagrijavanje do tališta ili vrelišta: na kosim dijelovima Q = m·c·Δt.",
    });
  }
  const zamjenaC = { kruto: t.c_tekuce, tekuce: t.c_kruto, plin: t.c_tekuce };
  if (imaKoso) {
    out.push({
      si:
        zbrojQ(ds, a, b, (d) =>
          d.ravno || !isNum(zamjenaC[d.stanje])
            ? d.Q
            : s.m * zamjenaC[d.stanje] * (d.T1 - d.T0),
        ) * k,
      poruka: dio.some((d) => d.stanje === "kruto")
        ? `Za krutu tvar (${t.naziv} u krutom stanju) uzmi c krute tvari, a ne c tekućine.`
        : "Za tekućinu uzmi c tekućine, a ne c krute tvari.",
    });
  }
  if (imaRavno && isNum(t.lambda) && isNum(t.r)) {
    out.push({
      si:
        zbrojQ(ds, a, b, (d) =>
          !d.ravno ? d.Q : s.m * (d.vrsta === "taljenje" ? t.r : t.lambda),
        ) * k,
      poruka:
        "Zamijenio si latentne topline: za taljenje vrijedi λ (taljenje), za isparavanje r (isparavanje).",
    });
  }
  if (b > a)
    for (const d of dio)
      out.push({
        si: d.Q * k,
        poruka: `To je samo dio ${d.br} (${NAZIV_DIJELA[d.vrsta]}). Zbroji topline svih dijelova od ${a} do ${b}.`,
      });
  if (q.startsWith("t_"))
    out.push({
      si: zbrojQ(ds, a, b),
      poruka: "To je toplina u J. Vrijeme je t = Q / P.",
    });
  return out;
}

function krivoKalorimetar(s) {
  const v = vrstaOf(s);
  const out = [];
  if (v === "mijesanje") {
    const T = s.tijela;
    const sredina = T.reduce((a, t) => a + t.t0, 0) / T.length;
    const isteMase = T.every((t) => Math.abs(t.m - T[0].m) < 1e-12);
    const istiC = T.every((t) => t.c === T[0].c);
    out.push({
      si: sredina,
      poruka: isteMase
        ? "Aritmetička sredina vrijedi samo za istu tvar i iste mase. Ovdje se tvari razlikuju po c: uzmi u obzir m·c svakog tijela."
        : "Aritmetička sredina vrijedi samo za jednake mase. Smjesa je bliže temperaturi tijela kojeg ima više (veći m·c).",
    });
    if (!istiC)
      out.push({
        si:
          T.reduce((a, t) => a + t.m * t.t0, 0) /
          T.reduce((a, t) => a + t.m, 0),
        poruka:
          "Tvari su različite: uz masu u račun ide i specifični toplinski kapacitet c.",
      });
    if (!isteMase)
      out.push({
        si:
          T.reduce((a, t) => a + t.c * t.t0, 0) /
          T.reduce((a, t) => a + t.c, 0),
        poruka: "Uz c u račun ide i masa svakog tijela.",
      });
    return out;
  }
  const g = grijanje(s);
  const k = s.pitaj === "Q" ? 1 : 1 / s.snaga;
  if (s.tijela.length > 1)
    s.tijela.forEach((t, i) =>
      out.push({
        si: (g.Q - g.Qi[i]) * k,
        poruka: `Zaboravio si toplinu koju primi ${t.naziv}: i to se grije od ${formatNumber(s.t0)} °C do ${formatNumber(s.t1)} °C.`,
      }),
    );
  out.push({
    si: g.Q * 1000 * k,
    poruka: "Masu pretvori u kilograme (250 g = 0,25 kg).",
  });
  if (s.t0 !== 0)
    out.push({
      si: s.tijela.reduce((a, t) => a + mc(t) * s.t1, 0) * k,
      poruka:
        "Uvrsti promjenu temperature Δt = t₂ − t₁, a ne konačnu temperaturu.",
    });
  if (s.pitaj === "t_grijanja")
    out.push({ si: g.Q, poruka: "To je toplina u J. Vrijeme je t = Q / P." });
  return out;
}

function check(s, odg) {
  if (vrstaOf(s) === "krivulja" && s.nacin === "odaberi") {
    if (!Array.isArray(odg) || !odg.length)
      return {
        tocno: false,
        poruka: "Dodirni dijelove grafa koje tražiš.",
        prazno: true,
      };
    const tocni = tocniDijelovi(s);
    const ds = dijelovi(s);
    const visak = odg.filter((b) => !tocni.includes(b));
    const fali = tocni.filter((b) => !odg.includes(b));
    if (!visak.length && !fali.length) return { tocno: true };
    if (visak.length) {
      const d = ds.find((x) => x.br === visak[0]);
      if (!d)
        return {
          tocno: false,
          poruka: "Dodirni dijelove grafa koje tražiš.",
          prazno: true,
        };
      const traziRavno = RAVNE.includes(s.odaberi);
      if (!d.ravno && traziRavno)
        return {
          tocno: false,
          poruka: `Na dijelu ${d.br} temperatura raste: tvar se samo grije (${NAZIV_DIJELA[d.vrsta]}), stanje se ne mijenja.`,
        };
      if (d.ravno && traziRavno)
        return {
          tocno: false,
          poruka: `Dio ${d.br} je vodoravan na ${formatNumber(d.T0)} °C: tu je ${NAZIV_DIJELA[d.vrsta]}${d.vrsta === "taljenje" ? " (talište)" : " (vrelište)"}.`,
        };
      if (d.ravno)
        return {
          tocno: false,
          poruka: `Na dijelu ${d.br} temperatura stoji: tu se mijenja stanje (${NAZIV_DIJELA[d.vrsta]}), a tvar se ne grije.`,
        };
      return {
        tocno: false,
        poruka: `Dio ${d.br} je ${NAZIV_DIJELA[d.vrsta]}, a to nije ono što se traži. Pogledaj na kojoj je temperaturi taj dio.`,
      };
    }
    return {
      tocno: false,
      poruka: `Nisi označio sve: nedostaje ${fali.length === 1 ? "još jedan dio" : `još ${fali.length} dijela`}.`,
    };
  }
  const vel = velicinaOdgovora(s);
  const jed = jedinica(s);
  const answer = odgovor(s);
  const lista =
    vrstaOf(s) === "krivulja" ? krivoKrivulja(s) : krivoKalorimetar(s);
  const krivo = [
    ...(s.krivo ?? []),
    ...krivoU(lista, vel, jed, answer).map((k) =>
      vel === "temperatura" ? { ...k, tolerancija: 0.3 } : k,
    ),
    ...(vel === "temperatura" ? [] : krivoJedinica(odgovorSI(s), vel, jed)),
  ];
  const SAVJET = {
    krivulja:
      "Na kosim dijelovima Q = m·c·Δt (c za stanje tvari na tom dijelu), na vodoravnima Q = m·λ (taljenje) ili Q = m·r (isparavanje).",
    mijesanje:
      "Toplina koju toplije tijelo preda jednaka je toplini koju hladnije primi: Σ m·c·(t − t₀) = 0.",
    grijac:
      "Grije se sve u posudi: Q = Σ m·c·Δt, a vrijeme na grijaču t = Q / P.",
  };
  return checkNumber({
    input: odg,
    answer,
    tol: tolOf(s, answer),
    unit: jed,
    krivo,
    savjet: s.savjet || SAVJET[vrstaOf(s)],
  });
}

function tocanOdgovor(s) {
  if (s.nacin === "istrazi") return "";
  if (vrstaOf(s) === "krivulja" && s.nacin === "odaberi") {
    const ds = dijelovi(s);
    const t = tocniDijelovi(s);
    const popis =
      t.length === 1
        ? String(t[0])
        : `${t.slice(0, -1).join(", ")} i ${t.at(-1)}`;
    return `${t.length === 1 ? "dio" : "dijelovi"} ${popis} (${t.map((b) => NAZIV_DIJELA[ds[b - 1].vrsta]).join(", ")})`;
  }
  return fmtJ(odgovor(s), jedinica(s)).replace(/\u202f/g, "");
}

// ── primjeri ────────────────────────────────────────────────────────────────────────────────────────
const VODA = {
  naziv: "voda",
  taliste: 0,
  vreliste: 100,
  c_kruto: 2100,
  c_tekuce: 4200,
  c_plin: 2000,
  lambda: 333000,
  r: 2260000,
};

export const krivulja_zagrijavanja = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Toplina i promjene stanja. vrsta "krivulja" (zadano): graf T–Q zagrijavanja tvari, dijelovi u omjeru stvarnih toplina; klizač po
krivulji pokazuje temperaturu, stanje (čestice, udio rastaljenog) i dovedenu toplinu po dijelovima. Polja: tekst, tvar: {naziv, taliste,
vreliste (°C), c_kruto, c_tekuce, c_plin (J/(kg·K)), lambda, r (J/kg)}, m (kg), od, do (°C), stanje_od?/stanje_do? ("kruto" | "tekuce" | "plin";
zadano: na talištu je tvar na početku kruta, a na kraju rastaljena, isto na vrelištu), shematski? (true: jednako široki dijelovi, bez
brojeva topline; tada c, λ, r i m nisu potrebni), snaga? (W: os x je vrijeme t = Q/P), nacin:
- "istrazi": učenik vuče po krivulji ili pusti grijač;
- "odaberi": odaberi: "promjena_stanja" | "stalna_temperatura" | "temperatura_raste" | "taljenje" | "isparavanje" | "grije_kruto" |
  "grije_tekuce" | "grije_plin"; učenik dodirom označi sve takve dijelove (točan skup računa aplikacija);
- "ocitaj": ocitaj: {velicina: "Q_dio", dio} | {velicina: "Q_ukupno", od_dijela?, do_dijela?} | {velicina: "t_dio" | "t_ukupno", …} (uz snaga)
  ; jedinica? ("J" | "kJ" | "MJ"; "s" | "min"). Brojevi na osi topline (vremena) su tada skriveni.
  Tipične greške (bez latentne topline, c tekućine za led, λ i r zamijenjeni, samo jedan dio, kJ/J) dodaju se same; ${KRIVO_OPIS}.
vrsta "mijesanje": tijela: [{naziv, m (kg), c, t0 (°C)}] (2–3) se miješaju, temperature se izjednačuju (graf T–vrijeme, toplina predana =
primljena). nacin "istrazi" (učenik mijenja mase i miješa) ili "predvidi" s pitaj: "t_konacna" (odgovor u °C, tolerancija 0,5 °C; krive vrijednosti
aritmetička sredina, bez c ili bez m dodaju se same).
vrsta "grijac": tijela: [{naziv, m (kg), c}] (1–3, npr. voda i posuda) grije grijač snage snaga (W) od t0 do t1 (°C); toplina po tijelima raste
uživo. nacin "istrazi" ili "predvidi" s pitaj: "Q" | "t_grijanja" (jedinica "J" | "kJ" ili "s" | "min"; krive vrijednosti bez posude,
grami, konačna temperatura umjesto Δt dodaju se same).`,
  primjer: {
    tip: TIP,
    nacin: "ocitaj",
    tekst:
      "Koliko topline treba da se 0,5 kg leda temperature −20 °C zagrije do tališta i potpuno otopi? (dijelovi 1 i 2)",
    tvar: VODA,
    m: 0.5,
    od: -20,
    do: 120,
    ocitaj: { velicina: "Q_ukupno", od_dijela: 1, do_dijela: 2 },
    jedinica: "J",
  },
  primjeri: [
    {
      tip: TIP,
      nacin: "istrazi",
      tekst:
        "Povuci točku po krivulji (ili uključi grijač) i gledaj temperaturu, čestice i toplinu. Zašto je isparavanje toliko dugo?",
      tvar: VODA,
      m: 0.5,
      od: -20,
      do: 120,
    },
    {
      tip: TIP,
      nacin: "odaberi",
      tekst:
        "Uzorak vode ravnomjerno zagrijavamo od −20 °C do 120 °C. Dodirni dijelove grafa u kojima tvar mijenja agregacijsko stanje.",
      tvar: { naziv: "voda", taliste: 0, vreliste: 100 },
      od: -20,
      do: 120,
      shematski: true,
      odaberi: "promjena_stanja",
    },
    {
      tip: TIP,
      nacin: "odaberi",
      tekst:
        "Uzorak žive zagrijavamo od −60 °C do 400 °C. Na kojem se dijelu živa tali?",
      tvar: { naziv: "živa", taliste: -39, vreliste: 357 },
      od: -60,
      do: 400,
      shematski: true,
      odaberi: "taljenje",
    },
    {
      tip: TIP,
      nacin: "ocitaj",
      tekst:
        "Koliko topline treba da se ta voda od 0 °C zagrije do 100 °C i sva ispari? Odgovor upiši u kJ.",
      tvar: VODA,
      m: 0.5,
      od: 0,
      do: 100,
      stanje_od: "tekuce",
      ocitaj: { velicina: "Q_ukupno" },
      jedinica: "kJ",
    },
    {
      tip: TIP,
      nacin: "ocitaj",
      tekst:
        "Grijač snage 2000 W grije 0,5 kg leda od −20 °C. Koliko dugo traje taljenje (dio 2)?",
      tvar: VODA,
      m: 0.5,
      od: -20,
      do: 30,
      snaga: 2000,
      ocitaj: { velicina: "t_dio", dio: 2 },
    },
    {
      tip: TIP,
      vrsta: "mijesanje",
      nacin: "istrazi",
      tekst:
        "Mijenjaj mase i pomiješaj vodu. Kamo se pomiče konačna temperatura?",
      tijela: [
        { naziv: "topla voda", m: 0.25, c: 4200, t0: 80 },
        { naziv: "hladna voda", m: 0.5, c: 4200, t0: 20 },
      ],
    },
    {
      tip: TIP,
      vrsta: "mijesanje",
      nacin: "predvidi",
      tekst:
        "250 g vode od 80 °C pomiješamo s 500 g vode od 20 °C. Kolika je konačna temperatura smjese?",
      tijela: [
        { naziv: "topla voda", m: 0.25, c: 4200, t0: 80 },
        { naziv: "hladna voda", m: 0.5, c: 4200, t0: 20 },
      ],
      pitaj: "t_konacna",
    },
    {
      tip: TIP,
      vrsta: "grijac",
      nacin: "istrazi",
      tekst: "Uključi grijač i gledaj kako toplina odlazi u vodu i u posudu.",
      tijela: [
        { naziv: "voda", m: 0.25, c: 4200 },
        { naziv: "posuda (aluminij)", m: 0.1, c: 900 },
      ],
      t0: 20,
      t1: 80,
      snaga: 1200,
    },
    {
      tip: TIP,
      vrsta: "grijac",
      nacin: "predvidi",
      tekst:
        "U aluminijskoj posudi mase 100 g grije se 250 g vode od 20 °C do 80 °C na grijaču snage 1200 W. Koliko traje grijanje?",
      tijela: [
        { naziv: "voda", m: 0.25, c: 4200 },
        { naziv: "posuda (aluminij)", m: 0.1, c: 900 },
      ],
      t0: 20,
      t1: 80,
      snaga: 1200,
      pitaj: "t_grijanja",
    },
  ],
  validate,
  check,
  tocanOdgovor,
  brojcaniOdgovor: (s) =>
    s.nacin === "istrazi" || s.nacin === "odaberi" ? null : odgovor(s),
};
