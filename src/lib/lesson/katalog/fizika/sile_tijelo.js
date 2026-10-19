// sile_tijelo: scena s tijelom (sanduk, kolica, osoba u dizalu, tijelo na kosini, dva tijela preko koloture) za
// dijagram sila (nacrtaj), istraživanje klizačima (istrazi) i „postavi tako da…“ (postavi). Sve sile i veličine
// računa fizikaSila(); crtež, provjera i točan odgovor uzimaju ih odatle, pa nikad ne kažu različito.
import { isNum } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
} from "../zajednicko.js";
import {
  G_ZEMLJA,
  STRANE,
  KUTOVI_8,
  normKut,
  razlikaKuta,
  rad,
  smjerRijecima,
  iznos,
  klizaciOd,
  pocetneVrijednosti,
  validateKlizaci,
  validatePolje,
  validateKoristeniKlizaci,
  validateCilj,
  checkCilj,
  analizaCilja,
  krajnjeKombinacije,
  formatNumber,
  withUnit,
  NACIN_ISTRAZI,
  KLIZACI_OPIS,
  CILJ_OPIS,
} from "./_sile.js";

export const SCENE = ["kutija", "kolica", "dizalo", "kosina", "kolotura"];
const NACINI = ["nacrtaj", "istrazi", "postavi"];
export const DULJINE = 6; // strelica u „nacrtaj“ ima duljinu 1–6 (za odnose među silama)

// smjer sile: ime strane ili kut u ° (0 = desno, 90 = gore)
const smjerKut = (smjer) => (isNum(smjer) ? normKut(smjer) : STRANE[smjer]);

// ── fizika ───────────────────────────────────────────────────────────────────────────────────────────
// p: vrijednosti klizača, v: trenutna brzina duž osi gibanja (za trenje: miruje li tijelo ili klizi).
// Vraća sile po tijelima ({id, oznaka, izvor, kut, iznos, tijelo}), veličine i akceleraciju duž osi gibanja.
export function fizikaSila(s, p = pocetneVrijednosti(s), v = s.v0 ?? 0) {
  const g = isNum(s.g) ? s.g : G_ZEMLJA;
  const sile = [];
  const sila = (id, oznaka, izvor, kut, F, tijelo = 0) => {
    if (F > 1e-9)
      sile.push({ id, oznaka, izvor, kut: normKut(kut), iznos: F, tijelo });
  };
  const vel = {};

  if (s.scena === "kutija" || s.scena === "kolica") {
    const m = iznos(s, s.masa, p);
    const mi = s.scena === "kolica" ? 0 : iznos(s, s.mi ?? 0, p);
    let fx = 0;
    let fy = 0;
    const vlastite = (s.sile ?? []).map((f) => ({
      ...f,
      kut: smjerKut(f.smjer),
      F: iznos(s, f.iznos, p),
    }));
    for (const f of vlastite) {
      fx += f.F * Math.cos(rad(f.kut));
      fy += f.F * Math.sin(rad(f.kut));
    }
    if (Math.abs(fx) < 1e-9) fx = 0;
    const G = m * g;
    const N = Math.max(0, G - fy);
    let tr = 0; // trenje duž x (s predznakom)
    if (mi > 0 && N > 0) {
      if (Math.abs(v) > 1e-9) tr = -Math.sign(v) * mi * N;
      else if (Math.abs(fx) <= mi * N) tr = -fx;
      else tr = -Math.sign(fx) * mi * N;
    }
    sila("G", "F_g", "Zemlja privlači", 270, G);
    sila("N", "N", "pod gura", 90, N);
    sila("F_tr", "F_{tr}", "trenje s podom", tr > 0 ? 0 : 180, Math.abs(tr));
    for (const f of vlastite) sila(f.id, f.oznaka ?? f.id, f.izvor, f.kut, f.F);
    Object.assign(vel, {
      m,
      G,
      N,
      F_tr: Math.abs(tr),
      F_rez: fx + tr,
      a: (fx + tr) / m,
    });
    for (const f of vlastite) vel[f.id] = f.F;
    return { sile, vel, a: vel.a, g };
  }

  if (s.scena === "dizalo") {
    const m = iznos(s, s.masa, p);
    const a = iznos(s, s.a ?? 0, p);
    const G = m * g;
    const N = Math.max(0, m * (g + a));
    sila("G", "F_g", "Zemlja privlači", 270, G);
    sila("N", "N", "vaga gura", 90, N);
    Object.assign(vel, {
      m,
      G,
      N,
      vaga: s.vaga === "kg" ? N / g : N,
      a,
      F_rez: N - G,
    });
    return { sile, vel, a, g };
  }

  if (s.scena === "kosina") {
    const m = iznos(s, s.masa, p);
    const kut = iznos(s, s.kut, p);
    const mi = iznos(s, s.mi ?? 0, p);
    const G = m * g;
    const Fpar = G * Math.sin(rad(kut));
    const Fok = G * Math.cos(rad(kut));
    const N = Fok;
    // kosina se spušta udesno: niz kosinu je −kut, uz kosinu 180° − kut, okomito od kosine 90° − kut
    let tr = 0;
    let a = 0;
    if (v > 1e-9) tr = mi * N;
    else if (Fpar <= mi * N + 1e-9) tr = Fpar;
    else tr = mi * N;
    a = (Fpar - tr) / m;
    if (Math.abs(a) < 1e-9) a = 0;
    sila("G", "F_g", "Zemlja privlači", 270, G);
    sila("N", "N", "kosina gura", 90 - kut, N);
    sila("F_tr", "F_{tr}", "trenje s kosinom", 180 - kut, tr);
    Object.assign(vel, { m, kut, G, N, F_par: Fpar, F_okom: Fok, F_tr: tr, a });
    return { sile, vel, a, g, kut };
  }

  if (s.scena === "kolotura") {
    const m1 = iznos(s, s.m1, p);
    const m2 = iznos(s, s.m2, p);
    const mi = iznos(s, s.mi ?? 0, p);
    const G1 = m1 * g;
    const G2 = m2 * g;
    let a = 0;
    let T;
    let tr;
    if (v > 1e-9 || G2 > mi * G1 + 1e-9) {
      a = (G2 - mi * G1) / (m1 + m2);
      tr = mi * G1;
      T = m2 * (g - a);
    } else {
      T = G2;
      tr = G2;
    }
    sila("G1", "F_{g1}", "Zemlja privlači", 270, G1, 0);
    sila("N", "N", "stol gura", 90, G1, 0);
    sila("T1", "T", "nit vuče", 0, T, 0);
    sila("F_tr", "F_{tr}", "trenje sa stolom", 180, tr, 0);
    sila("G2", "F_{g2}", "Zemlja privlači", 270, G2, 1);
    sila("T2", "T", "nit vuče", 90, T, 1);
    Object.assign(vel, { m1, m2, a, T, G1, G2, N: G1, F_tr: tr });
    return { sile, vel, a, g };
  }
  return { sile, vel, a: 0, g };
}

// imena tijela u sceni (za poruke i crtež)
export const tijelaScene = (s) =>
  s.scena === "kolotura"
    ? ["tijelo na stolu", "obješeno tijelo"]
    : [
        s.naziv ??
          {
            kutija: "sanduk",
            kolica: "kolica",
            dizalo: "osoba",
            kosina: "tijelo",
          }[s.scena] ??
          "tijelo",
      ];

// Veličine scene: naziv (za poruke), oznaka, jedinica i, za veličine s predznakom, smjer riječima [+, −].
export function velicineScene(s) {
  const F = (naziv, oznaka) => ({ naziv, oznaka, jedinica: "N" });
  if (s.scena === "kutija" || s.scena === "kolica") {
    const out = {
      m: { naziv: "masa", oznaka: "m", jedinica: "kg" },
      G: F("sila teža", "F_g"),
      N: F("sila podloge", "N"),
      F_tr: F("sila trenja", "F_{tr}"),
      F_rez: {
        ...F("rezultantna sila", "F_{rez}"),
        smjer: ["udesno", "ulijevo"],
      },
      a: {
        naziv: "akceleracija",
        oznaka: "a",
        jedinica: "m/s²",
        smjer: ["udesno", "ulijevo"],
      },
    };
    if (s.scena === "kolica") delete out.F_tr;
    for (const f of s.sile ?? [])
      if (f?.id && !(f.id in out))
        out[f.id] = F(
          isText(f.izvor) ? `sila (${f.izvor})` : "sila",
          f.oznaka ?? f.id,
        );
    return out;
  }
  if (s.scena === "dizalo")
    return {
      m: { naziv: "masa", oznaka: "m", jedinica: "kg" },
      G: F("sila teža", "F_g"),
      N: F("sila vage na osobu", "N"),
      vaga: {
        naziv: "očitanje vage",
        oznaka: "vaga",
        jedinica: s.vaga === "kg" ? "kg" : "N",
      },
      a: {
        naziv: "akceleracija dizala",
        oznaka: "a",
        jedinica: "m/s²",
        smjer: ["prema gore", "prema dolje"],
      },
      F_rez: {
        ...F("rezultantna sila", "F_{rez}"),
        smjer: ["prema gore", "prema dolje"],
      },
    };
  if (s.scena === "kosina")
    return {
      m: { naziv: "masa", oznaka: "m", jedinica: "kg" },
      kut: { naziv: "nagib kosine", oznaka: "α", jedinica: "°" },
      G: F("sila teža", "F_g"),
      N: F("sila kosine", "N"),
      F_par: F("komponenta sile teže niz kosinu", "F_∥"),
      F_okom: F("komponenta sile teže okomito na kosinu", "F_⊥"),
      F_tr: F("sila trenja", "F_{tr}"),
      a: {
        naziv: "akceleracija niz kosinu",
        oznaka: "a",
        jedinica: "m/s²",
        smjer: ["niz kosinu", "uz kosinu"],
      },
    };
  if (s.scena === "kolotura")
    return {
      m1: { naziv: "masa tijela na stolu", oznaka: "m_1", jedinica: "kg" },
      m2: { naziv: "masa obješenog tijela", oznaka: "m_2", jedinica: "kg" },
      a: { naziv: "akceleracija", oznaka: "a", jedinica: "m/s²" },
      T: F("sila niti", "T"),
      G1: F("sila teža tijela na stolu", "F_{g1}"),
      G2: F("sila teža obješenog tijela", "F_{g2}"),
      N: F("sila stola", "N"),
      F_tr: F("sila trenja", "F_{tr}"),
    };
  return {};
}

const PRIKAZI = {
  kutija: ["F_rez", "a"],
  kolica: ["F_rez", "a"],
  dizalo: ["G", "N", "vaga"],
  kosina: ["F_par", "a"],
  kolotura: ["a", "T"],
};
export function prikaziScene(s) {
  if (Array.isArray(s.prikazi)) return s.prikazi;
  const d = [...PRIKAZI[s.scena]];
  if ((s.scena === "kutija" || s.scena === "kosina") && s.mi != null)
    d.splice(1, 0, "F_tr");
  return d;
}

// smjerovi na koje se zaključava strelica u „nacrtaj“: 8 strana, smjerovi kosine i smjerovi sila scene
export function smjeroviNacrtaj(s) {
  const out = new Set(KUTOVI_8);
  if (s.scena === "kosina" && isNum(s.kut))
    for (const k of [-s.kut, 180 - s.kut, 90 - s.kut, 270 - s.kut])
      out.add(normKut(k));
  for (const f of fizikaSila(s).sile) out.add(Math.round(f.kut * 1000) / 1000);
  return [...out].sort((a, b) => a - b);
}

// ── nacrtaj: točan crtež i provjera ─────────────────────────────────────────────────────────────────
const lazneKarte = (s) => (s.ponudjene ?? []).filter((c) => c?.lazna);
const praveKarte = (s) => (s.ponudjene ?? []).filter((c) => !c?.lazna);

// karta s podacima sile scene (oznaka/izvor iz karte imaju prednost)
export function karteNacrtaj(s) {
  const sile = fizikaSila(s).sile;
  return (s.ponudjene ?? []).map((c) => {
    const f = sile.find((x) => x.id === c.id);
    return {
      id: c.id,
      oznaka: c.oznaka ?? f?.oznaka ?? c.id,
      izvor: c.izvor ?? f?.izvor ?? "",
      lazna: !!c.lazna,
      tijelo: f?.tijelo ?? null,
    };
  });
}

// duljine 1–6 razmjerne iznosima; ako zaokruživanje pokvari zadani odnos, popravi se postupno
export function tocanCrtez(s) {
  const sile = fizikaSila(s).sile.filter((f) =>
    praveKarte(s).some((c) => c.id === f.id),
  );
  const max = Math.max(...sile.map((f) => f.iznos));
  const L = Object.fromEntries(
    sile.map((f) => [f.id, Math.max(1, Math.round((DULJINE * f.iznos) / max))]),
  );
  for (let i = 0; i < 20; i++) {
    let ok = true;
    for (const o of s.odnosi ?? []) {
      if (!(o.a in L) || !(o.b in L) || odnosVrijedi(L[o.a], o.op, L[o.b]))
        continue;
      ok = false;
      if (o.op === "=") L[o.b] = L[o.a];
      else if (o.op === ">") L[o.a] < DULJINE ? L[o.a]++ : L[o.b]--;
      else L[o.b] < DULJINE ? L[o.b]++ : L[o.a]--;
    }
    if (ok) break;
  }
  return sile.map((f) => ({
    id: f.id,
    tijelo: f.tijelo,
    kut: f.kut,
    duljina: Math.min(DULJINE, Math.max(1, L[f.id])),
  }));
}

const odnosVrijedi = (a, op, b) =>
  op === ">" ? a > b : op === "<" ? a < b : a === b;
const OP_RIJEC = { ">": "dulja od", "<": "kraća od", "=": "jednako duga kao" };
const sto = (c) =>
  `${c.oznaka.includes("$") ? c.oznaka : `$${c.oznaka}$`}${c.izvor ? ` (${c.izvor})` : ""}`;

function savjetSmjera(id) {
  if (/^G\d?$/.test(id))
    return "Zemlja privlači svako tijelo okomito prema dolje.";
  if (id === "N")
    return "Podloga gura tijelo okomito od sebe, okomito na plohu na kojoj tijelo leži.";
  if (id === "F_tr")
    return "Trenje djeluje uz podlogu, suprotno smjeru u kojem tijelo klizi (ili bi kliznulo).";
  if (/^T\d$/.test(id))
    return "Nit vuče tijelo duž sebe, od tijela prema niti.";
  return "Pogledaj u zadatku kamo ta sila djeluje.";
}

function checkNacrtaj(s, odg) {
  if (!Array.isArray(odg) || !odg.length)
    return {
      tocno: false,
      poruka: "Dovuci sile na tijelo (povuci karticu na crtež).",
      prazno: true,
    };
  const karte = karteNacrtaj(s);
  const tijela = tijelaScene(s);
  const sile = fizikaSila(s).sile;
  const cards = Object.fromEntries(karte.map((c) => [c.id, c]));
  const pravi = Object.fromEntries(sile.map((f) => [f.id, f]));
  for (const o of odg) {
    const c = cards[o.id];
    if (c?.lazna) {
      const src = (s.ponudjene ?? []).find((x) => x.id === o.id);
      return {
        tocno: false,
        poruka:
          src?.poruka ||
          `Sila „${c.izvor}“ ne postoji: ne možeš reći koje je to tijelo daje. Svaka sila ima izvor (Zemlja, podloga, uže, ruka…).`,
      };
    }
  }
  if (tijela.length > 1)
    for (const o of odg) {
      const f = pravi[o.id];
      if (f && o.tijelo !== f.tijelo)
        return {
          tocno: false,
          poruka: `Sila ${sto(cards[o.id])} djeluje na ${tijela[f.tijelo]}, a ne na ${tijela[o.tijelo] ?? "to tijelo"}.`,
        };
    }
  const bezSmjera = odg.find((o) => !isNum(o.kut));
  if (bezSmjera)
    return {
      tocno: false,
      poruka: `Odredi smjer sile ${sto(cards[bezSmjera.id])}: povuci vrh strelice.`,
      prazno: true,
    };
  for (const o of odg) {
    const f = pravi[o.id];
    if (!f || razlikaKuta(o.kut, f.kut) < 1) continue;
    const obrnuto = razlikaKuta(o.kut, f.kut + 180) < 1;
    return {
      tocno: false,
      poruka: `Strelica sile ${sto(cards[o.id])} ${obrnuto ? "pokazuje u suprotnom smjeru" : "ne pokazuje pravim smjerom"}. ${savjetSmjera(o.id)}`,
    };
  }
  const fali = praveKarte(s).filter((c) => !odg.some((o) => o.id === c.id));
  if (fali.length) {
    const n = fali.length;
    const savjet =
      fali[0].nedostaje ||
      (tijela.length > 1
        ? "Za svako tijelo pitaj se: tko ga privlači i što ga sve dodiruje (podloga, nit, ruka)?"
        : "Pitaj se: tko privlači tijelo i što ga sve dodiruje (podloga, uže, ruka)?");
    return {
      tocno: false,
      poruka: `Fali još ${n} ${n === 1 ? "sila" : "sile"}. ${savjet}`,
    };
  }
  const L = Object.fromEntries(odg.map((o) => [o.id, o.duljina]));
  for (const r of s.odnosi ?? []) {
    if (odnosVrijedi(L[r.a], r.op, L[r.b])) continue;
    return {
      tocno: false,
      poruka: `Sile su dobre, ali strelica ${sto(cards[r.a])} treba biti ${OP_RIJEC[r.op]} strelice ${sto(cards[r.b])}.${r.poruka ? ` ${r.poruka}` : ""} Duljinu mijenjaš povlačenjem vrha.`,
    };
  }
  return { tocno: true };
}

// ── opis i primjeri ─────────────────────────────────────────────────────────────────────────────────
const OPIS = `Scena s tijelom i silama (fizika, matura). tekst, scena, nacin, g? (zadano 9,81; 10 ako ga zadatak koristi). Sve sile i veličine računa aplikacija iz scene.
Scene i polja (brojčano polje smije biti id klizača):
- "kutija": sanduk na podu: masa (kg), mi? (faktor trenja), v0? (početna brzina u m/s, + udesno: tijelo već klizi, trenje je kinetičko), sile?: [{id, oznaka (npr. "F"), izvor (npr. "uže vuče"), smjer ("desno", "gore-lijevo"… ili kut u °, 0 = desno, 90 = gore), iznos (N), uze?: true (nacrtaj uže)}] (najviše 3). Sila teža, sila podloge N i trenje dodaju se same (id G, N, F_tr).
- "kolica": kao kutija, bez trenja.
- "dizalo": osoba na vagi u dizalu: masa, a (akceleracija dizala u m/s², + prema gore), vaga? ("N" | "kg", što vaga pokazuje; zadano N). Sile G i N = m(g + a).
- "kosina": masa, kut (°, kosina se spušta udesno), mi?, rastav? (true: crtkane komponente sile teže uz i okomito na kosinu). Sile G, N, F_tr.
- "kolotura": m1 na stolu, m2 visi preko koloture, mi? (trenje sa stolom). Sile G1, N, T1, F_tr na tijelu 1 i G2, T2 na tijelu 2.
Veličine (za prikazi i cilj): kutija/kolica m, G, N, F_tr, F_rez, a (+ udesno) i id-jevi vlastitih sila; dizalo m, G, N, vaga, a, F_rez; kosina m, kut, G, N, F_par, F_okom, F_tr, a (niz kosinu); kolotura m1, m2, a, T, G1, G2, N, F_tr.
Načini:
- "nacrtaj" (Tvoj red): učenik dovuče kartice sila na tijelo i okrene strelice (zaključavaju se na 8 strana, smjerove kosine i smjerove sila scene). ponudjene: [{id, oznaka?, izvor?, nedostaje? (savjet kad sila fali)}] su prave sile scene (id iz popisa sila; smjer računa aplikacija; moraju biti sve sile scene) i lažne [{id, oznaka?, izvor, lazna: true, poruka}] (najviše 3, npr. „sila kojom sanduk stoji“). odnosi?: [{a, op (">" | "<" | "="), b, poruka?}] po duljini strelica (moraju se slagati s iznosima sila). Bez klizača.
- ${NACIN_ISTRAZI}. ${KLIZACI_OPIS} (najviše 3); prikazi?: popis veličina koje se vide uživo (najviše 4). Tijelo se giba s izračunatom akceleracijom.
- "postavi" (Tvoj red): kao istrazi s točno jednim klizačem; ${CILJ_OPIS}. Npr. kolica jednoliko: {velicina: "a", vrijednost: 0}; vaga pokazuje nulu: {velicina: "vaga", vrijednost: 0}. Ciljana veličina se ne vidi dok učenik ne provjeri. krivo?: [{vrijednost (vrijednost klizača), poruka}].`;

const PRIMJER = {
  tip: "sile_tijelo",
  nacin: "nacrtaj",
  scena: "kutija",
  g: 10,
  masa: 35,
  sile: [
    {
      id: "F",
      oznaka: "F",
      izvor: "uže vuče",
      smjer: 30,
      iznos: 200,
      uze: true,
    },
  ],
  tekst:
    "Uže vuče sanduk pod kutom 30° prema vodoravnoj. Dovuci na sanduk **sve sile** koje na njega djeluju i okreni ih u pravi smjer.",
  ponudjene: [
    { id: "G", izvor: "Zemlja privlači" },
    { id: "N", izvor: "pod gura" },
    { id: "F", izvor: "uže vuče" },
    {
      id: "X",
      oznaka: "F_s",
      izvor: "sila kojom sanduk stoji",
      lazna: true,
      poruka:
        "Tko bi tu silu davao? Sanduk ne može djelovati sam na sebe. Ako ne možeš imenovati izvor sile, ta sila ne postoji.",
    },
  ],
};

const PRIMJERI = [
  {
    tip: "sile_tijelo",
    nacin: "istrazi",
    scena: "kolica",
    g: 10,
    masa: 4,
    tekst:
      "Ana gura kolica udesno, Boris ih vuče ulijevo. **Pomiči klizače** i gledaj rezultantnu silu i akceleraciju.",
    sile: [
      {
        id: "FA",
        oznaka: "F_A",
        izvor: "Ana gura",
        smjer: "desno",
        iznos: "FA",
      },
      {
        id: "FB",
        oznaka: "F_B",
        izvor: "Boris vuče",
        smjer: "lijevo",
        iznos: "FB",
      },
    ],
    klizaci: [
      {
        id: "FA",
        oznaka: "Anina sila",
        min: 0,
        max: 50,
        korak: 1,
        pocetak: 30,
        jedinica: "N",
      },
      {
        id: "FB",
        oznaka: "Borisova sila",
        min: 0,
        max: 50,
        korak: 1,
        pocetak: 18,
        jedinica: "N",
      },
    ],
  },
  {
    tip: "sile_tijelo",
    nacin: "postavi",
    scena: "kolica",
    g: 10,
    masa: 4,
    tekst:
      "Ana gura kolica silom 30 N. Postavi Borisovu silu tako da se kolica gibaju **jednoliko**.",
    sile: [
      { id: "FA", oznaka: "F_A", izvor: "Ana gura", smjer: "desno", iznos: 30 },
      {
        id: "FB",
        oznaka: "F_B",
        izvor: "Boris vuče",
        smjer: "lijevo",
        iznos: "FB",
      },
    ],
    klizaci: [
      {
        id: "FB",
        oznaka: "Borisova sila",
        min: 0,
        max: 50,
        korak: 1,
        pocetak: 18,
        jedinica: "N",
      },
    ],
    prikazi: ["F_rez", "a"],
    cilj: { velicina: "a", vrijednost: 0 },
  },
  {
    tip: "sile_tijelo",
    nacin: "istrazi",
    scena: "dizalo",
    g: 10,
    masa: 70,
    a: "a",
    tekst:
      "Osoba od 70 kg stoji na vagi u dizalu. **Mijenjaj akceleraciju dizala** i gledaj što pokazuje vaga.",
    klizaci: [
      {
        id: "a",
        oznaka: "akceleracija dizala (+ gore)",
        min: -10,
        max: 5,
        korak: 1,
        pocetak: 0,
        jedinica: "m/s²",
      },
    ],
  },
  {
    tip: "sile_tijelo",
    nacin: "postavi",
    scena: "dizalo",
    g: 10,
    masa: 70,
    a: "a",
    tekst: "Postavi akceleraciju dizala tako da vaga pokaže **nulu**.",
    klizaci: [
      {
        id: "a",
        oznaka: "akceleracija dizala (+ gore)",
        min: -10,
        max: 5,
        korak: 1,
        pocetak: 0,
        jedinica: "m/s²",
      },
    ],
    prikazi: ["G", "N", "vaga"],
    cilj: { velicina: "vaga", vrijednost: 0 },
    krivo: [
      {
        vrijednost: 0,
        poruka:
          "Dok dizalo miruje ili se giba jednoliko, vaga pokazuje punu težinu.",
      },
    ],
  },
  {
    tip: "sile_tijelo",
    nacin: "nacrtaj",
    scena: "dizalo",
    g: 10,
    masa: 70,
    a: 2,
    tekst:
      "Dizalo ubrzava **prema gore** akceleracijom 2 m/s². Nacrtaj sile na osobu i pazi koja je strelica dulja.",
    ponudjene: [
      { id: "G", izvor: "Zemlja privlači" },
      { id: "N", izvor: "vaga gura" },
      {
        id: "X",
        oznaka: "F_d",
        izvor: "sila dizala prema gore",
        lazna: true,
        poruka:
          "Dizalo ne dodiruje osobu, nego vaga. Na osobu djeluju samo Zemlja i vaga.",
      },
    ],
    odnosi: [
      {
        a: "N",
        op: ">",
        b: "G",
        poruka:
          "Rezultantna sila mora gledati prema gore, kamo je i akceleracija.",
      },
    ],
  },
  {
    tip: "sile_tijelo",
    nacin: "postavi",
    scena: "kutija",
    g: 10,
    masa: 20,
    mi: 0.3,
    v0: 1,
    tekst:
      "Sanduk od 20 kg već klizi udesno, a faktor trenja je 0,3. Postavi silu guranja tako da sanduk klizi **jednoliko**.",
    sile: [
      { id: "F", oznaka: "F", izvor: "ruka gura", smjer: "desno", iznos: "F" },
    ],
    klizaci: [
      {
        id: "F",
        oznaka: "sila guranja",
        min: 0,
        max: 100,
        korak: 5,
        pocetak: 20,
        jedinica: "N",
      },
    ],
    prikazi: ["F_tr", "a"],
    cilj: { velicina: "a", vrijednost: 0 },
  },
  {
    tip: "sile_tijelo",
    nacin: "istrazi",
    scena: "kosina",
    g: 10,
    masa: "m",
    kut: "kut",
    rastav: true,
    tekst:
      "Tijelo kliže niz kosinu bez trenja. **Mijenjaj nagib i masu**: o čemu ovisi akceleracija?",
    klizaci: [
      {
        id: "kut",
        oznaka: "nagib kosine",
        min: 10,
        max: 60,
        korak: 5,
        pocetak: 30,
        jedinica: "°",
      },
      {
        id: "m",
        oznaka: "masa tijela",
        min: 1,
        max: 10,
        korak: 1,
        pocetak: 5,
        jedinica: "kg",
      },
    ],
    prikazi: ["F_par", "a"],
  },
  {
    tip: "sile_tijelo",
    nacin: "nacrtaj",
    scena: "kosina",
    g: 10,
    masa: 5,
    kut: 30,
    tekst:
      "Tijelo kliže niz kosinu bez trenja. Nacrtaj sile koje na njega djeluju.",
    ponudjene: [
      { id: "G", izvor: "Zemlja privlači" },
      { id: "N", izvor: "kosina gura" },
      {
        id: "X",
        oznaka: "F_k",
        izvor: "sila niz kosinu",
        lazna: true,
        poruka:
          "Niz kosinu tijelo vuče dio sile teže; to nije zasebna sila. Tko bi je davao?",
      },
    ],
  },
  {
    tip: "sile_tijelo",
    nacin: "istrazi",
    scena: "kolotura",
    g: 10,
    m1: "m1",
    m2: "m2",
    tekst:
      "Dva tijela povezana niti preko koloture. **Pomiči klizače** i gledaj akceleraciju i silu niti.",
    klizaci: [
      {
        id: "m1",
        oznaka: "masa na stolu",
        min: 1,
        max: 6,
        korak: 1,
        pocetak: 3,
        jedinica: "kg",
      },
      {
        id: "m2",
        oznaka: "obješena masa",
        min: 1,
        max: 6,
        korak: 1,
        pocetak: 2,
        jedinica: "kg",
      },
    ],
    prikazi: ["a", "T", "G2"],
  },
  {
    tip: "sile_tijelo",
    nacin: "nacrtaj",
    scena: "kolotura",
    g: 10,
    m1: 3,
    m2: 2,
    tekst:
      "Nacrtaj sile na **svako** tijelo: dovuci karticu na tijelo na koje ta sila djeluje.",
    ponudjene: [
      { id: "G1" },
      { id: "N" },
      { id: "T1" },
      { id: "G2" },
      { id: "T2" },
    ],
  },
];

// ── widget ──────────────────────────────────────────────────────────────────────────────────────────
export const sile_tijelo = {
  tip: "sile_tijelo",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  fizika: fizikaSila,
  velicine: velicineScene,
  validate(s) {
    const { list, need } = problems();
    need(
      NACINI.includes(s.nacin),
      `sile_tijelo.nacin mora biti jedan od: ${NACINI.join(", ")}`,
    );
    need(isText(s.tekst), "sile_tijelo treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `sile_tijelo.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return list;
    if (s.g != null)
      need(
        isNum(s.g) && s.g >= 1 && s.g <= 30,
        "g mora biti broj od 1 do 30 (m/s²)",
      );

    if (s.nacin === "istrazi") validateKlizaci(s, need, { najvise: 3 });
    else if (s.nacin === "postavi")
      validateKlizaci(s, need, { najmanje: 1, najvise: 1 });
    else
      need(
        s.klizaci == null,
        "nacrtaj nema klizače: sve vrijednosti su brojevi",
      );
    const koristeni = [];
    const polje = (ime, o) => {
      if (typeof s[ime] === "string") koristeni.push(s[ime]);
      return validatePolje(s, need, ime, o);
    };
    const dozvoljena = {
      kutija: ["masa", "mi", "v0", "sile"],
      kolica: ["masa", "v0", "sile"],
      dizalo: ["masa", "a", "vaga"],
      kosina: ["masa", "kut", "mi", "rastav"],
      kolotura: ["m1", "m2", "mi"],
    }[s.scena];
    for (const f of [
      "masa",
      "mi",
      "v0",
      "sile",
      "a",
      "vaga",
      "kut",
      "rastav",
      "m1",
      "m2",
    ])
      need(
        !(f in s) || dozvoljena.includes(f),
        `polje „${f}“ ne postoji u sceni ${s.scena} (polja scene: ${dozvoljena.join(", ")})`,
      );

    const sc = s.scena;
    if (sc === "kolotura") {
      polje("m1", { min: 0.01, max: 1000, opis: "masa tijela na stolu u kg" });
      polje("m2", { min: 0.01, max: 1000, opis: "masa obješenog tijela u kg" });
    } else polje("masa", { min: 0.01, max: 100000, opis: "masa u kg" });
    if (sc === "kutija" || sc === "kosina" || sc === "kolotura")
      polje("mi", { min: 0, max: 2, obavezno: false });
    if (sc === "kutija" || sc === "kolica") {
      if (s.v0 != null)
        need(
          isNum(s.v0) && Math.abs(s.v0) <= 50,
          "v0 mora biti broj od −50 do 50 (m/s)",
        );
      if (sc === "kolica")
        need(s.sile != null, "kolica trebaju sile (npr. Ana gura, Boris vuče)");
      if (
        s.sile != null &&
        need(
          Array.isArray(s.sile) && s.sile.length >= 1 && s.sile.length <= 3,
          "sile mora biti popis od 1 do 3 sile",
        )
      ) {
        const rez = ["G", "N", "F_tr", "F_rez", "a", "m"];
        s.sile.forEach((f, i) => {
          need(
            /^[A-Za-z][A-Za-z0-9_]*$/.test(f?.id ?? "") && !rez.includes(f.id),
            `sile[${i}].id mora biti ime (slova i brojke) i ne smije biti ${rez.join(", ")}`,
          );
          need(
            isText(f?.izvor),
            `sile[${i}] treba „izvor“ (tko djeluje, npr. "uže vuče")`,
          );
          need(
            isNum(f?.smjer) || f?.smjer in STRANE,
            `sile[${i}].smjer mora biti kut u ° ili jedno od: ${Object.keys(STRANE).join(", ")}`,
          );
          if (typeof f?.iznos === "string") koristeni.push(f.iznos);
          if (isNum(f?.iznos))
            need(
              f.iznos >= 0 && f.iznos <= 1e6,
              `sile[${i}].iznos mora biti od 0 do 10⁶ N`,
            );
          else
            need(
              klizaciOd(s).some((k) => k.id === f?.iznos),
              `sile[${i}].iznos mora biti broj (N) ili id klizača`,
            );
        });
        need(
          new Set(s.sile.map((f) => f?.id)).size === s.sile.length,
          "id-jevi sila moraju biti različiti",
        );
      }
    }
    if (sc === "dizalo") {
      polje("a", {
        min: -30,
        max: 30,
        obavezno: false,
        opis: "akceleracija dizala u m/s²",
      });
      if (s.vaga != null)
        need(["N", "kg"].includes(s.vaga), 'vaga mora biti "N" ili "kg"');
    }
    if (sc === "kosina") {
      polje("kut", { min: 0, max: 80, opis: "nagib u °" });
      if (s.rastav != null)
        need(typeof s.rastav === "boolean", "rastav mora biti true ili false");
    }
    if (list.length) return list;

    validateKoristeniKlizaci(s, need, koristeni);
    // fizika u cijelom rasponu klizača: tijelo ne smije poletjeti s poda (okomita komponenta veća od sile teže)
    if (sc === "kutija" || sc === "kolica") {
      for (const p of krajnjeKombinacije(s)) {
        const m = iznos(s, s.masa, p);
        const fy = (s.sile ?? []).reduce(
          (z, f) =>
            z +
            iznos(s, f.iznos, p) *
              Math.sin(rad(isNum(f.smjer) ? f.smjer : STRANE[f.smjer])),
          0,
        );
        if (
          !need(
            fy <= m * (isNum(s.g) ? s.g : G_ZEMLJA) + 1e-9,
            "vlastite sile podižu tijelo s poda (okomita komponenta veća od sile teže): smanji ih ili povećaj masu",
          )
        )
          break;
      }
    }

    const meta = velicineScene(s);
    if (
      s.prikazi != null &&
      need(
        Array.isArray(s.prikazi) &&
          s.prikazi.length >= 1 &&
          s.prikazi.length <= 4,
        "prikazi mora biti popis od 1 do 4 veličine",
      )
    ) {
      for (const v of s.prikazi)
        need(
          v in meta,
          `prikazi: „${v}“ nije veličina scene (${Object.keys(meta).join(", ")})`,
        );
    }

    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      need(
        s.ponudjene == null && s.odnosi == null,
        "istrazi nema ponudjene ni odnosi (to je za nacrtaj)",
      );
    }
    if (s.nacin === "postavi") {
      need(
        s.ponudjene == null && s.odnosi == null,
        "postavi nema ponudjene ni odnosi (to je za nacrtaj)",
      );
      const k = klizaciOd(s)[0];
      validateCilj(s, need, k, (p) => fizikaSila(s, p).vel, meta);
      if (k) validateKrivo(s.krivo, null, 0, need);
      if (k && Array.isArray(s.krivo) && s.cilj) {
        try {
          const a = analizaCilja(s, k, (p) => fizikaSila(s, p).vel);
          s.krivo.forEach(
            (x, i) =>
              isNum(x?.vrijednost) &&
              need(
                !a.ok(x.vrijednost),
                `krivo[${i}].vrijednost ${formatNumber(x.vrijednost)} ostvaruje cilj, a to je točan odgovor`,
              ),
          );
        } catch {
          /* cilj je već prijavljen */
        }
      }
    }
    if (s.nacin === "nacrtaj") {
      need(s.cilj == null && s.prikazi == null, "nacrtaj nema cilj ni prikazi");
      validateNacrtaj(s, need);
    }
    return list;
  },
  check(s, odgovor) {
    if (s.nacin === "nacrtaj") return checkNacrtaj(s, odgovor);
    if (s.nacin === "postavi")
      return checkCilj(
        s,
        odgovor,
        (p) => fizikaSila(s, p).vel,
        velicineScene(s),
      );
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "postavi") {
      const k = klizaciOd(s)[0];
      const a = analizaCilja(s, k, (p) => fizikaSila(s, p).vel);
      return `${k.oznaka} = ${withUnit(a.best, k.jedinica)}`;
    }
    if (s.nacin === "nacrtaj") {
      const karte = Object.fromEntries(karteNacrtaj(s).map((c) => [c.id, c]));
      const tijela = tijelaScene(s);
      const crtez = tocanCrtez(s);
      const dio = (t) =>
        crtez
          .filter((c) => c.tijelo === t)
          .map((c) => `${sto(karte[c.id])}: ${smjerRijecima(c.kut)}`)
          .join("; ");
      const sile =
        tijela.length > 1
          ? tijela.map((ime, t) => `${ime}: ${dio(t)}`).join(" · ")
          : dio(0);
      const odnosi = (s.odnosi ?? []).map(
        (r) =>
          `$${karte[r.a].oznaka}$ ${OP_RIJEC[r.op]} $${karte[r.b].oznaka}$`,
      );
      return [sile, ...odnosi].join("; ");
    }
    return "";
  },
};

function validateNacrtaj(s, need) {
  const sile = fizikaSila(s).sile;
  const ids = sile.map((f) => f.id);
  if (
    !need(
      Array.isArray(s.ponudjene) &&
        s.ponudjene.length >= 2 &&
        s.ponudjene.length <= 8,
      "nacrtaj treba ponudjene: 2–8 kartica sila",
    )
  )
    return;
  const pon = s.ponudjene;
  need(
    new Set(pon.map((c) => c?.id)).size === pon.length,
    "id-jevi kartica moraju biti različiti",
  );
  pon.forEach((c, i) => {
    if (
      !need(
        c && typeof c === "object" && isText(c.id),
        `ponudjene[${i}] treba id`,
      )
    )
      return;
    if (c.lazna) {
      need(c.lazna === true, `ponudjene[${i}].lazna mora biti true`);
      need(
        !ids.includes(c.id),
        `ponudjene[${i}] je označena kao lažna, a „${c.id}“ je prava sila scene`,
      );
      need(
        isText(c.izvor),
        `lažna kartica ponudjene[${i}] treba „izvor“ (npr. „sila kojom sanduk stoji“)`,
      );
      if (c.poruka != null)
        need(isText(c.poruka), `ponudjene[${i}].poruka mora biti tekst`);
    } else {
      need(
        ids.includes(c.id),
        `ponudjene[${i}].id „${c.id}“ nije sila ove scene (sile scene: ${ids.join(", ")}); lažnu silu označi s lazna: true`,
      );
      need(
        c.smjer == null && c.iznos == null,
        `ponudjene[${i}]: smjer i iznos prave sile računa aplikacija iz scene, ne pišu se`,
      );
    }
    if (c.oznaka != null)
      need(isText(c.oznaka), `ponudjene[${i}].oznaka mora biti tekst`);
    if (c.izvor != null)
      need(isText(c.izvor), `ponudjene[${i}].izvor mora biti tekst`);
  });
  need(lazneKarte(s).length <= 3, "najviše 3 lažne kartice");
  need(praveKarte(s).length >= 1, "nacrtaj treba barem jednu pravu silu");
  for (const f of sile)
    need(
      pon.some((c) => c?.id === f.id && !c.lazna),
      `sila scene ${f.id} (${f.izvor}) nije među ponuđenima, a djeluje na tijelo: dodaj je (crtež bez nje ne bi bio potpun)`,
    );
  if (
    s.odnosi != null &&
    need(
      Array.isArray(s.odnosi) && s.odnosi.length <= 3,
      "odnosi mora biti popis od najviše 3 odnosa",
    )
  ) {
    const F = Object.fromEntries(sile.map((f) => [f.id, f.iznos]));
    s.odnosi.forEach((r, i) => {
      if (
        !need(
          r && r.a in F && r.b in F && r.a !== r.b,
          `odnosi[${i}]: a i b moraju biti dvije različite prave sile scene (${ids.join(", ")})`,
        )
      )
        return;
      if (
        !need(
          [">", "<", "="].includes(r.op),
          `odnosi[${i}].op mora biti ">", "<" ili "="`,
        )
      )
        return;
      const d = (F[r.a] - F[r.b]) / Math.max(F[r.a], F[r.b]);
      const fiz = Math.abs(d) <= 0.01 ? "=" : d > 0 ? ">" : "<";
      need(
        fiz === r.op,
        `odnosi[${i}]: po fizici scene ${r.a} = ${formatNumber(Math.round(F[r.a] * 10) / 10)} N i ${r.b} = ${formatNumber(Math.round(F[r.b] * 10) / 10)} N, pa je ${r.a} ${fiz} ${r.b}, a ne ${r.op}`,
      );
      if (r.poruka != null)
        need(isText(r.poruka), `odnosi[${i}].poruka mora biti tekst`);
    });
  }
}
