// crtaj_graf: učenik crta graf. „izlomljena“: vuče čvorove izlomljene crte (v–t), „stepenice“: razinu na svakoj dionici
// (a–t), „pravac“: provlači pravac kroz izmjerene točke (nagib se uspoređuje s nagibom najmanjih kvadrata);
// „istrazi“: zadani graf s kursorom, površinom do kursora i trokutom nagiba. Provjera kaže koja je dionica kriva i
// zašto (smjer iz nagiba točnog grafa), a površine i nagibe računa isti kod koji ih crta.
import { isNum, formatNumber, formatSci } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
} from "../zajednicko.js";
import { dijeloviOsi } from "./_kinematika.js";

const NACINI = ["izlomljena", "stepenice", "pravac", "istrazi"];
const VRSTE = ["izlomljena", "stepenice"];
const EPS = 1e-9;

const isPar = (v) =>
  Array.isArray(v) && v.length === 2 && v.every(isNum) && v[1] > v[0];
const naMrezi = (v, k) => Math.abs(v / k - Math.round(v / k)) < 1e-6;
const zn = (v, eps) => (v > eps ? 1 : v < -eps ? -1 : 0);
export const vrstaGrafa = (s) =>
  s.nacin === "istrazi" ? (s.vrsta ?? "izlomljena") : s.nacin;
// broj vrijednosti: čvor po čvoru (izlomljena) ili razina po dionici (stepenice)
const brojVrijednosti = (vrsta, cx) =>
  vrsta === "stepenice" ? cx.length - 1 : cx.length;
export const tolerancijaCrte = (s) =>
  isNum(s.tolerancija) ? s.tolerancija : s.korak_y / 2;

// Oznake osi: „v (m/s)“ → ime v, jedinica m/s; površina i nagib imaju vlastitu oznaku i jedinicu (put u m, a u m/s²).
export function osi(s) {
  const ox = dijeloviOsi(s.os_x, "x");
  const oy = dijeloviOsi(s.os_y, "y");
  const meta = (v, zadano) =>
    v && typeof v === "object"
      ? {
          oznaka: v.oznaka ?? zadano.oznaka,
          jedinica: v.jedinica ?? zadano.jedinica,
        }
      : zadano;
  return {
    x: ox,
    y: oy,
    povrsina: meta(s.povrsina, {
      oznaka: "površina",
      jedinica: [oy.jedinica, ox.jedinica].filter(Boolean).join("·"),
    }),
    nagib: meta(s.nagib, {
      oznaka: "nagib",
      jedinica:
        oy.jedinica && ox.jedinica ? `${oy.jedinica}/${ox.jedinica}` : "",
    }),
  };
}

// Vrijednost grafa u x: izlomljena (linearno između čvorova) ili stepenice (razina dionice).
export function vrijednostGrafa(vrsta, cx, ys, x) {
  if (x <= cx[0]) return vrsta === "stepenice" ? ys[0] : ys[0];
  for (let i = 1; i < cx.length; i++) {
    if (x <= cx[i] + EPS) {
      if (vrsta === "stepenice") return ys[i - 1];
      const t = (x - cx[i - 1]) / (cx[i] - cx[i - 1]);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys.at(-1);
}

// Površina ispod grafa od cx[0] do x (s predznakom: ispod osi je negativna).
export function povrsinaDo(vrsta, cx, ys, x) {
  let p = 0;
  for (let i = 1; i < cx.length; i++) {
    const [a, b] = [cx[i - 1], Math.min(cx[i], x)];
    if (b <= a) break;
    if (vrsta === "stepenice") p += ys[i - 1] * (b - a);
    else p += ((ys[i - 1] + vrijednostGrafa(vrsta, cx, ys, b)) / 2) * (b - a);
  }
  return p;
}
export const povrsineDionica = (vrsta, cx, ys) =>
  cx
    .slice(1)
    .map(
      (b, i) => povrsinaDo(vrsta, cx, ys, b) - povrsinaDo(vrsta, cx, ys, cx[i]),
    );

// Pravac najmanjih kvadrata kroz izmjerene točke (kroz ishodište: k = Σxy / Σx²).
export function pravacTocaka(s) {
  const t = s.tocke ?? [];
  if (s.kroz_ishodiste) {
    const sxx = t.reduce((a, [x]) => a + x * x, 0);
    return { nagib: t.reduce((a, [x, y]) => a + x * y, 0) / sxx, odsjecak: 0 };
  }
  const n = t.length;
  const [mx, my] = [
    t.reduce((a, [x]) => a + x, 0) / n,
    t.reduce((a, [, y]) => a + y, 0) / n,
  ];
  const sxx = t.reduce((a, [x]) => a + (x - mx) ** 2, 0);
  const k = t.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / sxx;
  return { nagib: k, odsjecak: my - k * mx };
}
const tolNagiba = (s) => (isNum(s.tolerancija) ? s.tolerancija : 0.04);

// Početni položaj čvorova (ili razina): zadan, ili nula (dno osi ako nula nije na osi); učvršćeni čvorovi su odmah točni.
export function pocetneVrijednosti(s) {
  const n = brojVrijednosti(vrstaGrafa(s), s.cvorovi_x ?? []);
  const nula = s.y?.[0] <= 0 && s.y?.[1] >= 0 ? 0 : (s.y?.[0] ?? 0);
  const out = Array.isArray(s.pocetak)
    ? [...s.pocetak]
    : Array.from({ length: n }, () => nula);
  for (const i of s.fiksni ?? []) out[i] = s.odgovor?.[i];
  return out;
}
// Početni pravac: blaži od točnog, pa ga učenik mora zakrenuti.
export function pocetniPravac(s) {
  const { nagib, odsjecak } = pravacTocaka(s);
  return {
    nagib: nagib * 0.55,
    odsjecak: s.kroz_ishodiste ? 0 : odsjecak + (s.y[1] - s.y[0]) * 0.12,
  };
}

// Indeksi krivih vrijednosti (čvorova ili dionica).
export function krivi(s, odgovor) {
  const tol = tolerancijaCrte(s);
  return (odgovor ?? [])
    .map((v, i) => (Math.abs(v - s.odgovor[i]) > tol + EPS ? i : -1))
    .filter((i) => i >= 0);
}

const fx = (s, x) =>
  `${formatNumber(x)}${osi(s).x.jedinica ? `\u00a0${osi(s).x.jedinica}` : ""}`;
const dionica = (s, i) =>
  `${formatNumber(s.cvorovi_x[i])}–${fx(s, s.cvorovi_x[i + 1])}`;
const fy = (s, y) =>
  `${formatNumber(y)}${osi(s).y.jedinica ? `\u00a0${osi(s).y.jedinica}` : ""}`;
const savjet = (s, i) => (isText(s.savjeti?.[i]) ? ` ${s.savjeti[i]}` : "");
const jos = (n) =>
  n > 0
    ? ` (Osim toga ${n === 1 ? "još jedna točka nije dobra" : `još ${n} točke nisu dobre`}.)`
    : "";

function checkIzlomljena(s, odgovor) {
  const n = s.cvorovi_x.length;
  if (!Array.isArray(odgovor) || odgovor.length !== n || !odgovor.every(isNum))
    return {
      tocno: false,
      poruka: "Povuci točke grafa na prava mjesta.",
      prazno: true,
    };
  const tol = tolerancijaCrte(s);
  const k = (s.krivo ?? []).find((q) =>
    q.odgovor.every((v, i) => Math.abs(v - odgovor[i]) <= tol + EPS),
  );
  if (k) return { tocno: false, poruka: k.poruka };
  const losi = krivi(s, odgovor);
  if (!losi.length) return { tocno: true };
  const j = losi[0];
  const { x, y } = osi(s);
  if (j === 0)
    return {
      tocno: false,
      poruka: `Graf ne počinje dobro: koliki je ${y.ime} na početku (${x.ime} = ${fx(s, s.cvorovi_x[0])})?${savjet(s, 0)}${jos(losi.length - 1)}`,
    };
  const i = j - 1;
  const eps = s.korak_y * 1e-6;
  const c = zn(s.odgovor[j] - s.odgovor[i], eps);
  const u = zn(odgovor[j] - odgovor[i], eps);
  let poruka;
  if (c !== u) {
    const opis =
      c === 0
        ? `${y.ime} se ne mijenja, pa graf mora biti vodoravan`
        : c > 0
          ? `${y.ime} raste, pa graf mora ići prema gore`
          : `${y.ime} se smanjuje, pa graf mora ići prema dolje`;
    poruka = `Na dionici ${dionica(s, i)} ${opis}.`;
  } else {
    poruka = `Na dionici ${dionica(s, i)} smjer je dobar, ali na kraju dionice (${x.ime} = ${fx(s, s.cvorovi_x[j])}) točka je ${odgovor[j] > s.odgovor[j] ? "previsoka" : "preniska"}.`;
  }
  return {
    tocno: false,
    poruka: `${poruka}${savjet(s, i)}${jos(losi.length - 1)}`,
  };
}

function checkStepenice(s, odgovor) {
  const n = s.cvorovi_x.length - 1;
  if (!Array.isArray(odgovor) || odgovor.length !== n || !odgovor.every(isNum))
    return {
      tocno: false,
      poruka: "Povuci razinu na svakoj dionici.",
      prazno: true,
    };
  const tol = tolerancijaCrte(s);
  const k = (s.krivo ?? []).find((q) =>
    q.odgovor.every((v, i) => Math.abs(v - odgovor[i]) <= tol + EPS),
  );
  if (k) return { tocno: false, poruka: k.poruka };
  const losi = krivi(s, odgovor);
  if (!losi.length) return { tocno: true };
  const i = losi[0];
  const { x, y } = osi(s);
  const eps = s.korak_y * 1e-6;
  const [c, u] = [zn(s.odgovor[i], eps), zn(odgovor[i], eps)];
  let poruka;
  if (c !== u) {
    poruka =
      c === 0
        ? `Na dionici ${dionica(s, i)} ${y.ime} je nula: razina mora ležati na osi ${x.ime}.`
        : `Na dionici ${dionica(s, i)} razina mora biti ${c > 0 ? "iznad" : "ispod"} osi ${x.ime} (${c > 0 ? "pozitivna" : "negativna"} vrijednost).`;
  } else {
    poruka = `Na dionici ${dionica(s, i)} predznak je dobar, ali razina je ${odgovor[i] > s.odgovor[i] ? "previsoka" : "preniska"}.`;
  }
  return {
    tocno: false,
    poruka: `${poruka}${savjet(s, i)}${losi.length > 1 ? ` (Osim toga ${losi.length === 2 ? "još jedna dionica nije dobra" : `još ${losi.length - 1} dionice nisu dobre`}.)` : ""}`,
  };
}

function checkPravac(s, odgovor) {
  if (!odgovor || !isNum(odgovor.nagib) || !isNum(odgovor.odsjecak))
    return {
      tocno: false,
      poruka: "Povuci pravac kroz izmjerene točke.",
      prazno: true,
    };
  const p = pravacTocaka(s);
  const { nagib } = osi(s);
  const rel = (odgovor.nagib - p.nagib) / Math.abs(p.nagib);
  if (Math.abs(rel) > tolNagiba(s) + EPS) {
    const prestrm = odgovor.nagib > p.nagib === p.nagib > 0;
    const sada = `${nagib.oznaka} = ${formatSci(odgovor.nagib)}${nagib.jedinica ? `\u00a0${nagib.jedinica}` : ""}`;
    return {
      tocno: false,
      poruka: `Pravac je ${prestrm ? "prestrm" : "preblag"} (${sada}): točke desno su ${prestrm ? "ispod" : "iznad"} njega. Zakreni ga tako da točke budu podjednako iznad i ispod pravca.`,
    };
  }
  if (!s.kroz_ishodiste) {
    const xs = s.tocke.map(([x]) => x);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const d =
      odgovor.nagib * mx + odgovor.odsjecak - (p.nagib * mx + p.odsjecak);
    if (Math.abs(d) > (s.y[1] - s.y[0]) * 0.04)
      return {
        tocno: false,
        poruka: `Nagib je dobar, ali pravac je ${d > 0 ? "previsoko" : "prenisko"}: pomakni ga tako da prolazi kroz sredinu točaka.`,
      };
  }
  return { tocno: true };
}

function validirajGraf(s, vrsta, need, pref = "") {
  const cx = s.cvorovi_x;
  if (
    !need(
      Array.isArray(cx) && cx.length >= 2 && cx.length <= 7 && cx.every(isNum),
      `${pref}cvorovi_x mora biti popis od 2–7 brojeva`,
    )
  )
    return false;
  need(
    cx.every((x, i) => i === 0 || x > cx[i - 1]),
    `${pref}cvorovi_x moraju rasti`,
  );
  if (isPar(s.x))
    need(
      cx[0] >= s.x[0] - EPS && cx.at(-1) <= s.x[1] + EPS,
      `${pref}cvorovi_x moraju biti unutar osi x`,
    );
  return need(
    VRSTE.includes(vrsta),
    `${pref}vrsta mora biti ${VRSTE.join(" ili ")}`,
  );
}

function validirajVrijednosti(v, n, s, need, ime) {
  if (
    !need(
      Array.isArray(v) && v.length === n && v.every(isNum),
      `${ime} mora imati ${n} brojeva`,
    )
  )
    return false;
  need(
    v.every((y) => y >= s.y[0] - EPS && y <= s.y[1] + EPS),
    `${ime}: sve vrijednosti moraju biti na osi y (${formatNumber(s.y[0])} do ${formatNumber(s.y[1])})`,
  );
  return true;
}

function validiraj(s) {
  const { list, need } = problems();
  if (
    !need(
      NACINI.includes(s.nacin),
      `crtaj_graf.nacin mora biti ${NACINI.join(", ")}`,
    )
  )
    return list;
  need(isText(s.tekst), "crtaj_graf treba „tekst“");
  need(
    isText(s.os_x) && isText(s.os_y),
    'crtaj_graf treba os_x i os_y (npr. "t (s)", "v (m/s)")',
  );
  const osiOk = need(
    isPar(s.x) && isPar(s.y),
    "x i y moraju biti [od, do] uz od < do",
  );
  const korakOk = need(
    isNum(s.korak_x) && s.korak_x > 0 && isNum(s.korak_y) && s.korak_y > 0,
    "korak_x i korak_y moraju biti pozitivni brojevi (razmak crta mreže)",
  );
  if (!osiOk || !korakOk) return list;
  need(
    (s.x[1] - s.x[0]) / s.korak_x <= 40 && (s.y[1] - s.y[0]) / s.korak_y <= 40,
    "mreža je pregusta (najviše 40 crta po osi); povećaj korak",
  );
  for (const k of ["povrsina", "nagib"]) {
    const v = s[k];
    if (v != null)
      need(
        typeof v === "boolean" ||
          (typeof v === "object" &&
            (v.oznaka == null || isText(v.oznaka)) &&
            (v.jedinica == null || typeof v.jedinica === "string")),
        `${k} je true ili {oznaka?, jedinica?}`,
      );
  }
  if (s.tolerancija != null)
    need(
      isNum(s.tolerancija) && s.tolerancija > 0,
      "tolerancija mora biti pozitivan broj",
    );

  const vrsta = vrstaGrafa(s);
  if (s.nacin === "pravac") {
    need(s.povrsina == null, "pravac nema površinu");
    if (
      need(
        Array.isArray(s.tocke) &&
          s.tocke.length >= 3 &&
          s.tocke.length <= 12 &&
          s.tocke.every(
            (t) => Array.isArray(t) && t.length === 2 && t.every(isNum),
          ),
        "pravac treba tocke: [[x, y], …] (3–12 izmjerenih točaka)",
      )
    ) {
      need(
        s.tocke.every(
          ([x, y]) => x >= s.x[0] && x <= s.x[1] && y >= s.y[0] && y <= s.y[1],
        ),
        "sve izmjerene točke moraju biti unutar osi",
      );
      const p = pravacTocaka(s);
      need(
        Number.isFinite(p.nagib) && Math.abs(p.nagib) > EPS,
        "kroz točke se ne može provući kosi pravac (sve imaju isti x ili isti y)",
      );
      if (s.tolerancija != null)
        need(
          s.tolerancija < 0.5,
          "tolerancija pravca je relativna (npr. 0.04 = 4 %), manja od 0,5",
        );
      const p0 = pocetniPravac(s);
      need(
        Math.abs(p0.nagib - p.nagib) / Math.abs(p.nagib) > tolNagiba(s),
        "tolerancija je prevelika: početni pravac je već točan",
      );
    }
    if (s.kroz_ishodiste != null)
      need(
        typeof s.kroz_ishodiste === "boolean",
        "kroz_ishodiste je true ili false",
      );
    if (s.kroz_ishodiste)
      need(
        s.x[0] <= 0 && s.y[0] <= 0,
        "pravac kroz ishodište treba ishodište na osima (x i y od 0 ili manje)",
      );
    for (const f of ["odgovor", "cvorovi_x", "krivo"])
      need(
        !(f in s),
        `pravac nema polje „${f}“ (točan nagib računa aplikacija iz točaka)`,
      );
    return list;
  }
  if (!validirajGraf(s, vrsta, need)) return list;
  const n = brojVrijednosti(vrsta, s.cvorovi_x);
  const dionica = s.cvorovi_x.length - 1;
  if (s.savjeti != null)
    need(
      Array.isArray(s.savjeti) &&
        s.savjeti.length === dionica &&
        s.savjeti.every((t) => t == null || isText(t)),
      `savjeti je popis od ${dionica} teksta (po jedan za svaku dionicu, null gdje ne treba)`,
    );
  if (s.referenca != null) {
    const r = s.referenca;
    if (
      need(
        r && typeof r === "object" && isText(r.os_y) && isPar(r.y),
        "referenca treba os_y i y: [od, do]",
      )
    ) {
      const rv = r.vrsta ?? "izlomljena";
      const rc = r.cvorovi_x ?? s.cvorovi_x;
      if (
        validirajGraf({ ...r, cvorovi_x: rc, x: s.x }, rv, need, "referenca.")
      )
        validirajVrijednosti(
          r.vrijednosti,
          brojVrijednosti(rv, rc),
          { y: r.y },
          need,
          "referenca.vrijednosti",
        );
      if (r.korak_y != null)
        need(
          isNum(r.korak_y) &&
            r.korak_y > 0 &&
            (r.y[1] - r.y[0]) / r.korak_y <= 40,
          "referenca.korak_y mora biti pozitivan (najviše 40 crta)",
        );
    }
  }

  if (s.nacin === "istrazi") {
    noAnswerFields(s, need);
    need(
      !("pocetak" in s) && !("fiksni" in s),
      "istrazi nema pocetak ni fiksni (graf je zadan)",
    );
    validirajVrijednosti(s.vrijednosti, n, s, need, "vrijednosti");
    return list;
  }
  need(
    s.vrsta == null,
    "vrsta se zadaje samo u načinu istrazi (ovdje je to nacin)",
  );
  need(
    !("vrijednosti" in s),
    "zadani graf (vrijednosti) postoji samo u načinu istrazi; točan graf je u „odgovor“",
  );
  if (!validirajVrijednosti(s.odgovor, n, s, need, "odgovor")) return list;
  need(
    s.odgovor.every((y) => naMrezi(y, s.korak_y)),
    `odgovor mora biti na crtama mreže (višekratnici od korak_y = ${formatNumber(s.korak_y)}), jer se točke lijepe za mrežu`,
  );
  if (s.fiksni != null) {
    need(
      Array.isArray(s.fiksni) &&
        s.fiksni.every((i) => Number.isInteger(i) && i >= 0 && i < n) &&
        new Set(s.fiksni).size === s.fiksni.length &&
        s.fiksni.length < n,
      `fiksni je popis indeksa (0–${n - 1}) zadanih ${vrsta === "stepenice" ? "dionica" : "točaka"}; barem jedna mora ostati za učenika`,
    );
  }
  if (
    s.pocetak != null &&
    validirajVrijednosti(s.pocetak, n, s, need, "pocetak")
  )
    need(
      s.pocetak.every((y) => naMrezi(y, s.korak_y)),
      "pocetak mora biti na crtama mreže",
    );
  if (!list.length)
    need(
      krivi(s, pocetneVrijednosti(s)).length > 0,
      "početni graf je već točan; zadaj pocetak koji se razlikuje od odgovora",
    );
  if (
    s.krivo != null &&
    need(Array.isArray(s.krivo), "krivo mora biti popis")
  ) {
    s.krivo.forEach((k, i) => {
      if (
        need(
          Array.isArray(k?.odgovor) &&
            k.odgovor.length === n &&
            k.odgovor.every(isNum) &&
            isText(k?.poruka),
          `krivo[${i}] treba {odgovor: ${n} brojeva, poruka}`,
        )
      )
        need(
          krivi(s, k.odgovor).length > 0,
          `krivo[${i}].odgovor jednak je točnom`,
        );
    });
  }
  return list;
}

export const crtaj_graf = {
  tip: "crtaj_graf",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Učenik crta graf u koordinatnom sustavu. Polja: tekst, nacin, os_x, os_y (npr. "t (s)", "v (m/s)"), x: [od, do], y: [od, do], korak_x, korak_y (mreža;
točke se lijepe za crte korak_y), povrsina?: true | {oznaka, jedinica} (površina ispod grafa, npr. {oznaka: "put", jedinica: "m"}), nagib?: true | {oznaka, jedinica}
(npr. {oznaka: "a", jedinica: "m/s²"}), referenca?: {os_y, y: [od, do], korak_y?, vrsta?, cvorovi_x?, vrijednosti} (zadani graf iznad, s istom osi x, npr. a–t uz crtanje v–t),
savjeti?: [tekst ili null po dionici] (dodaje se poruci kad je ta dionica kriva). Načini:
- "izlomljena": cvorovi_x (2–7 x-koordinata čvorova), odgovor (y svakog čvora, na mreži), fiksni? (indeksi zadanih čvorova, npr. [0] za početak),
  pocetak? (početni y čvorova; zadano 0), tolerancija? (zadano korak_y/2), krivo?: [{odgovor: [y po čvoru], poruka}] (tipičan krivi graf, npr. s–t umjesto v–t).
  Poruka sama kaže koja je dionica kriva i treba li graf ići gore, dolje ili vodoravno.
- "stepenice": cvorovi_x (granice dionica), odgovor (razina na svakoj dionici: jedan broj manje od cvorovi_x), fiksni?, pocetak?, tolerancija?, krivo? (a–t graf).
- "pravac": tocke: [[x, y], …] (3–12 izmjerenih), kroz_ishodiste? (jedno hvatište), tolerancija? (relativna, zadano 0,04), nagib?: {oznaka, jedinica}
  (npr. {oznaka: "k", jedinica: "N/m"}). Točan nagib (najmanji kvadrati) računa aplikacija; uživo se ispisuje nagib učenikova pravca.
- "istrazi": korak za gledanje: vrsta? ("izlomljena" | "stepenice"), cvorovi_x, vrijednosti (zadani graf); učenik vuče kursor, uz povrsina se boji površina
  do kursora, uz nagib se crta trokut nagiba na dionici pod kursorom.`,
  primjer: {
    tip: "crtaj_graf",
    nacin: "izlomljena",
    tekst:
      "Nacrtaj $v$–$t$ graf: auto 10 s ubrzava iz mirovanja do 30 m/s, a zatim koči i stane za 6 s.",
    os_x: "t (s)",
    os_y: "v (m/s)",
    x: [0, 16],
    y: [0, 35],
    korak_x: 2,
    korak_y: 5,
    cvorovi_x: [0, 10, 16],
    odgovor: [0, 30, 0],
    povrsina: { oznaka: "put", jedinica: "m" },
    savjeti: [
      "Brzina raste od 0 do 30 m/s.",
      "Auto koči do zaustavljanja: na kraju je v = 0.",
    ],
  },
  primjeri: [
    {
      tip: "crtaj_graf",
      nacin: "izlomljena",
      tekst:
        "Iz $a$–$t$ grafa motocikla nacrtaj njegov $v$–$t$ graf. Motocikl kreće iz mirovanja. Površina ispod $a$–$t$ grafa je promjena brzine.",
      os_x: "t (s)",
      os_y: "v (m/s)",
      x: [0, 8],
      y: [0, 15],
      korak_x: 1,
      korak_y: 1,
      cvorovi_x: [0, 4, 8],
      odgovor: [0, 12, 12],
      fiksni: [0],
      referenca: {
        os_y: "a (m/s²)",
        y: [0, 4],
        korak_y: 1,
        vrsta: "stepenice",
        vrijednosti: [3, 0],
      },
      krivo: [
        {
          odgovor: [0, 3, 3],
          poruka:
            "To je akceleracija, a ne brzina. Brzina raste svake sekunde za 3 m/s, pa nakon 4 s iznosi 4 · 3 m/s.",
        },
      ],
      savjeti: [null, "Kad je a = 0, brzina se ne mijenja."],
    },
    {
      tip: "crtaj_graf",
      nacin: "stepenice",
      tekst:
        "Iz $v$–$t$ grafa automobila nacrtaj $a$–$t$ graf. Akceleracija je nagib $v$–$t$ grafa na svakoj dionici.",
      os_x: "t (s)",
      os_y: "a (m/s²)",
      x: [0, 18],
      y: [-4, 6],
      korak_x: 2,
      korak_y: 0.5,
      cvorovi_x: [0, 4, 10, 18],
      odgovor: [5, 0, -2.5],
      referenca: {
        os_y: "v (m/s)",
        y: [0, 25],
        korak_y: 5,
        vrijednosti: [0, 20, 20, 0],
      },
      savjeti: [
        "Nagib: 20 m/s u 4 s.",
        null,
        "Brzina pada 20 m/s u 8 s; kad tijelo usporava, a je negativna.",
      ],
    },
    {
      tip: "crtaj_graf",
      nacin: "pravac",
      tekst:
        "Provuci pravac kroz izmjerene točke (sila o produljenju opruge). Nagib pravca je konstanta opruge $k$.",
      os_x: "x (m)",
      os_y: "F (N)",
      x: [0, 0.6],
      y: [0, 30],
      korak_x: 0.1,
      korak_y: 5,
      tocke: [
        [0.1, 4.9],
        [0.2, 10.2],
        [0.3, 14.7],
        [0.4, 20.4],
        [0.5, 25],
      ],
      kroz_ishodiste: true,
      nagib: { oznaka: "k", jedinica: "N/m" },
    },
    {
      tip: "crtaj_graf",
      nacin: "istrazi",
      tekst:
        "Vuci kursor po $v$–$t$ grafu: obojena površina je put prijeđen do tog trenutka, a trokut pokazuje nagib (akceleraciju) dionice.",
      os_x: "t (s)",
      os_y: "v (m/s)",
      x: [0, 18],
      y: [0, 25],
      korak_x: 2,
      korak_y: 5,
      cvorovi_x: [0, 4, 10, 18],
      vrijednosti: [0, 20, 20, 0],
      povrsina: { oznaka: "put", jedinica: "m" },
      nagib: { oznaka: "a", jedinica: "m/s²" },
    },
  ],
  validate: (s) => validiraj(s),
  check(s, odgovor) {
    if (s.nacin === "pravac") return checkPravac(s, odgovor);
    if (s.nacin === "stepenice") return checkStepenice(s, odgovor);
    return checkIzlomljena(s, odgovor);
  },
  tocanOdgovor(s) {
    if (s.nacin === "pravac") {
      const { nagib } = osi(s);
      const p = pravacTocaka(s);
      const j = nagib.jedinica ? `\u00a0${nagib.jedinica}` : "";
      const [a, b] = [
        p.nagib * (1 - tolNagiba(s)),
        p.nagib * (1 + tolNagiba(s)),
      ].sort((u, v) => u - v);
      return `${nagib.oznaka} ≈ ${formatSci(p.nagib)}${j} (prihvaća se od ${formatSci(a)} do ${formatSci(b)}${j})`;
    }
    if (s.nacin === "stepenice")
      return s.odgovor
        .map((v, i) => `${dionica(s, i)}: ${fy(s, v)}`)
        .join("; ");
    if (s.nacin === "izlomljena")
      return s.odgovor
        .map((v, i) => `(${fx(s, s.cvorovi_x[i])}, ${fy(s, v)})`)
        .join(" → ");
    return "";
  },
  brojcaniOdgovor: (s) =>
    s.nacin === "pravac" && Array.isArray(s.tocke)
      ? pravacTocaka(s).nagib
      : null,
  kljucOdgovora: (s) =>
    s.nacin === "pravac"
      ? Array.isArray(s.tocke)
        ? pravacTocaka(s).nagib.toFixed(4)
        : null
      : s.nacin === "istrazi"
        ? null
        : JSON.stringify([s.cvorovi_x, s.odgovor]),
};
