// jezgra: atomska jezgra u pet scena — sastav (slaganje protona, neutrona i elektrona, zapis ᴬ_Z X), reakcija
// (dovrši jednadžbu iz očuvanja A i Z), karta nuklida (α, β⁻, β⁺, γ), vezanje (defekt mase, lanac u → kg → J → eV →
// MeV) i krivulja energije vezanja po nukleonu (fuzija, fisija). Sva fizika, geometrija crteža, tekstovi očitanja i
// „što je skriveno“ su čiste funkcije ovdje (web i iOS crtaju isto); komponenta samo crta i prosljeđuje unos.
import {
  isNum,
  parseNumber,
  formatNumber,
  formatSci,
  near,
  tolerance,
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
import {
  element,
  zIzSimbola,
  simbolZ,
  imeIzotopa,
  CESTICE,
  CESTICE_IDS,
  zapisJezgre,
  zapisCestice,
  tekstJezgre,
  tekstZapisa,
  kratkiZapis,
  KONST,
  KRIVULJA_EA,
  Z_MAX,
  tipoviJezgre,
  raspadTipova,
  kuglice,
  polumjerJezgre,
} from "./_jezgra.js";

export * from "./_jezgra.js";

const TIP = "jezgra";
export const SCENE = ["sastav", "reakcija", "karta", "vezanje", "krivulja"];
export const NACINI = {
  sastav: ["istrazi", "prikaz", "slozi"],
  reakcija: ["istrazi", "prikaz", "dovrsi"],
  karta: ["istrazi", "prikaz", "raspad", "koji_raspad"],
  vezanje: ["istrazi", "prikaz", "izracunaj"],
  krivulja: ["istrazi", "prikaz", "odaberi"],
};
const GLEDANJE = ["istrazi", "prikaz"];
export const jeOdgovor = (s) => !GLEDANJE.includes(s.nacin);
const sv = (n) => formatNumber(n);

// Jezgra iz speca {simbol, A} → {Z, N, A}
export function jezgraIz(o) {
  const Z = zIzSimbola(o?.simbol);
  if (Z == null || !Number.isInteger(o?.A)) return null;
  return { Z, A: o.A, N: o.A - Z, pob: !!o.pobudjena };
}
function validateJezgra(o, need, gdje, { masa = false } = {}) {
  if (
    !need(
      o && typeof o === "object",
      `${gdje} mora biti {simbol, A${masa ? ", m" : ""}}`,
    )
  )
    return false;
  const Z = zIzSimbola(o.simbol);
  need(
    Z != null,
    `${gdje}.simbol „${o.simbol}“ nije kemijski simbol (Z = 1–${Z_MAX}, npr. "I", "Th")`,
  );
  need(
    Number.isInteger(o.A) && o.A >= 1 && o.A <= 300,
    `${gdje}.A mora biti cijeli broj od 1 do 300`,
  );
  if (Z != null && Number.isInteger(o.A))
    need(
      o.A >= Z,
      `${gdje}: A (${o.A}) ne može biti manji od Z (${Z} za ${o.simbol})`,
    );
  if (o.pobudjena != null)
    need(
      typeof o.pobudjena === "boolean",
      `${gdje}.pobudjena mora biti true ili false`,
    );
  if (masa)
    need(
      isNum(o.m) && o.m > 0.5 && o.m <= 300,
      `${gdje}.m mora biti masa jezgre u u (npr. 4.00151)`,
    );
  return Z != null && Number.isInteger(o.A) && o.A >= Z;
}

// ══ SASTAV ════════════════════════════════════════════════════════════════════════════════════════
// Stanje sastava: {p, n, e} → sve što se iz njega očita.
export function stanjeSastava({ p, n, e }) {
  const el = element(p);
  const A = p + n;
  const naboj = p - e;
  return {
    p,
    n,
    e,
    A,
    Z: p,
    N: n,
    naboj,
    element: el,
    zapis: el ? zapisJezgre(p, A) : null,
    ime: el
      ? imeIzotopa(p, A)
      : p === 0
        ? n > 0
          ? "samo neutroni"
          : "prazno"
        : "",
    opisNaboja:
      naboj === 0
        ? "neutralan atom"
        : `ion ${naboj > 0 ? "+" : "−"}${Math.abs(naboj) === 1 ? "" : Math.abs(naboj)} (${naboj > 0 ? "manjak" : "višak"} elektrona)`,
  };
}

// Točan sastav za cilj {simbol, A, naboj?}
export function sastavCilja(c) {
  const Z = zIzSimbola(c.simbol);
  return { p: Z, n: c.A - Z, e: Z - (c.naboj ?? 0) };
}
export const SASTAV_POLJA = ["p", "n", "e"];
export const mijenjaCilj = (c, i) =>
  i === 0 || !Array.isArray(c.mijenja) ? SASTAV_POLJA : c.mijenja;

// Očitanja sastava; u „slozi“ do točnog odgovora vide se samo brojači (bez simbola, imena, A i naboja).
export function ocitanjaSastava(s, st, otkriveno) {
  const skrij = s.nacin === "slozi" && !otkriveno && !s.simbol_uzivo;
  if (skrij) return { zapis: null, redovi: [] };
  const redovi = [
    { oznaka: "A = Z + N", vrijednost: `${st.p} + ${st.n} = ${st.A}` },
    {
      oznaka: "element",
      vrijednost: st.element
        ? `${st.element.ime} (Z = ${st.p})`
        : "nema protona: nije element",
    },
  ];
  if (!(s.nacin === "slozi" && s.simbol_uzivo && !otkriveno))
    redovi.push({ oznaka: "naboj", vrijednost: st.opisNaboja });
  return { zapis: st.zapis, ime: st.ime, redovi };
}

// Što se promijenilo prelaskom iz stanja a u b (za isticanje u istraživanju)
export function promjenaSastava(a, b) {
  if (!a || !b) return null;
  if (a.p !== b.p && b.p > 0 && a.p > 0)
    return `${element(a.p)?.ime ?? "?"} → ${element(b.p)?.ime ?? "?"}: drugi broj protona je drugi element`;
  if (a.p === b.p && a.n !== b.n && b.p > 0)
    return `i dalje ${element(b.p).ime}, samo drugi izotop (${kratkiZapis(b.p, b.p + b.n)})`;
  if (a.p === b.p && a.n === b.n && a.e !== b.e && b.p > 0)
    return b.e === b.p
      ? "neutralan atom"
      : "elektroni ne mijenjaju jezgru: to je ion";
  return null;
}

function checkSlozi(s, odg) {
  if (!Array.isArray(odg) || odg.length !== s.ciljevi.length)
    return {
      tocno: false,
      poruka: "Namjesti broj protona, neutrona i elektrona.",
      prazno: true,
    };
  for (let i = 0; i < s.ciljevi.length; i++) {
    const c = s.ciljevi[i];
    const o = odg[i] ?? {};
    const t = sastavCilja(c);
    const pre = s.ciljevi.length > 1 ? `${kratkiZapis(t.p, c.A)}: ` : "";
    if (![o.p, o.n, o.e].every((v) => Number.isInteger(v) && v >= 0))
      return {
        tocno: false,
        poruka: "Namjesti sva tri broja (protone, neutrone i elektrone).",
        prazno: true,
      };
    if (o.p === 0 && o.n === 0 && o.e === 0)
      return {
        tocno: false,
        poruka: `${pre}atom je još prazan. Dodaj protone, neutrone i elektrone.`,
        prazno: true,
      };
    const el = element(t.p);
    if (o.p !== t.p) {
      const drugiA = s.ciljevi.map((x) => x.A).filter((A) => A !== c.A);
      if (o.p === c.A)
        return {
          tocno: false,
          poruka: `${pre}${c.A} je **maseni broj** A (protoni i neutroni zajedno). Protona ima koliko je **redni broj** Z: potraži ${el.ime === "jod" ? "jod" : el.ime} u periodnom sustavu (manji broj uz simbol).`,
        };
      if (drugiA.includes(o.p))
        return {
          tocno: false,
          poruka: `${pre}${o.p} je maseni broj drugog izotopa (i otprilike masa atoma, veći broj uz simbol u periodnom sustavu). Protona ima koliko je redni broj Z, manji broj uz simbol.`,
        };
      if (o.p === t.n)
        return {
          tocno: false,
          poruka: `${pre}to je broj neutrona. Protona ima koliko je redni broj Z.`,
        };
      const krivi = element(o.p);
      return {
        tocno: false,
        poruka: krivi
          ? `${pre}s ${o.p} protona to bi bio **${krivi.ime}** (${krivi.simbol}), a ne ${el.ime}. Broj protona određuje element: potraži redni broj elementa ${el.simbol} u periodnom sustavu.`
          : `${pre}broj protona određuje element. Potraži redni broj elementa ${el.simbol} u periodnom sustavu.`,
      };
    }
    if (o.n !== t.n) {
      const drugi = s.ciljevi.filter(
        (x, j) => j !== i && x.simbol === c.simbol,
      );
      if (o.n === c.A)
        return {
          tocno: false,
          poruka: `${pre}neutrona nije koliko je A: maseni broj broji protone **i** neutrone, pa je N = A − Z.`,
        };
      if (o.n === c.A + t.p)
        return { tocno: false, poruka: `${pre}N = A − Z, a ne A + Z.` };
      const d = drugi.find((x) => x.A - t.p === o.n);
      if (d)
        return {
          tocno: false,
          poruka: `${pre}to je broj neutrona u ${kratkiZapis(t.p, d.A)}. Ovaj izotop ima maseni broj ${c.A}.`,
        };
      if (o.n === t.p)
        return {
          tocno: false,
          poruka: `${pre}neutrona ne mora biti koliko protona. Izračunaj N = A − Z.`,
        };
      return {
        tocno: false,
        poruka: `${pre}s ${o.n} neutrona ovo bi bio ${imeIzotopa(t.p, t.p + o.n)}, a treba ${imeIzotopa(t.p, c.A)}. Neutrona je N = A − Z.`,
      };
    }
    if (o.e !== t.e) {
      const naboj = o.p - o.e;
      const cilj = c.naboj ?? 0;
      if (cilj === 0)
        return {
          tocno: false,
          poruka:
            o.e === 0
              ? `${pre}atom ima i elektrone u omotaču. **Neutralni** atom ima jednako elektrona koliko i protona.`
              : `${pre}ovako je to ion naboja ${naboj > 0 ? "+" : "−"}${Math.abs(naboj)}. **Neutralni** atom ima jednako elektrona koliko i protona.`,
        };
      return {
        tocno: false,
        poruka: `${pre}ion naboja ${cilj > 0 ? "+" : "−"}${Math.abs(cilj)} ima ${cilj > 0 ? "manje" : "više"} elektrona nego protona, za ${Math.abs(cilj)}.`,
      };
    }
  }
  return { tocno: true };
}

function validateSastav(s, need) {
  const izotopi = (gdje) => {
    if (s.izotopi == null) return;
    if (
      !need(
        Array.isArray(s.izotopi) &&
          s.izotopi.length >= 1 &&
          s.izotopi.length <= 4,
        `${gdje}izotopi mora biti popis od 1 do 4 jezgre {simbol, A}`,
      )
    )
      return;
    s.izotopi.forEach((o, i) => validateJezgra(o, need, `izotopi[${i}]`));
  };
  if (s.nacin === "istrazi") {
    if (s.pocetak != null) {
      const p = s.pocetak;
      need(
        p &&
          SASTAV_POLJA.every(
            (k) =>
              Number.isInteger(p[k]) &&
              p[k] >= 0 &&
              p[k] <= (k === "n" ? 160 : Z_MAX),
          ),
        `pocetak mora biti {p, n, e}: cijeli brojevi (p i e do ${Z_MAX}, n do 160)`,
      );
    }
    izotopi("");
    need(s.ciljevi == null && s.atom == null, "istrazi nema ciljevi ni atom");
  }
  if (s.nacin === "prikaz") {
    if (validateJezgra(s.atom, need, "atom") && s.atom.naboj != null)
      need(
        Number.isInteger(s.atom.naboj) &&
          Math.abs(s.atom.naboj) <= 8 &&
          zIzSimbola(s.atom.simbol) - s.atom.naboj >= 0,
        "atom.naboj mora biti cijeli broj od −8 do +8 (i ne više od broja protona)",
      );
    izotopi("");
  }
  if (s.nacin === "slozi") {
    if (
      !need(
        Array.isArray(s.ciljevi) &&
          s.ciljevi.length >= 1 &&
          s.ciljevi.length <= 2,
        "slozi treba ciljevi: 1–2 atoma {simbol, A, naboj?, mijenja?, tekst?}",
      )
    )
      return;
    s.ciljevi.forEach((c, i) => {
      if (!validateJezgra(c, need, `ciljevi[${i}]`)) return;
      need(
        c.A - zIzSimbola(c.simbol) <= 160,
        `ciljevi[${i}]: najviše 160 neutrona`,
      );
      if (c.naboj != null)
        need(
          Number.isInteger(c.naboj) &&
            Math.abs(c.naboj) <= 8 &&
            zIzSimbola(c.simbol) - c.naboj >= 0,
          `ciljevi[${i}].naboj mora biti cijeli broj od −8 do +8`,
        );
      if (c.tekst != null)
        need(isText(c.tekst), `ciljevi[${i}].tekst mora biti tekst`);
      if (c.mijenja != null) {
        need(
          i > 0,
          "ciljevi[0] ne smije imati mijenja (prvi atom se slaže cijeli)",
        );
        need(
          Array.isArray(c.mijenja) &&
            c.mijenja.length >= 1 &&
            c.mijenja.every((k) => SASTAV_POLJA.includes(k)) &&
            new Set(c.mijenja).size === c.mijenja.length,
          `ciljevi[${i}].mijenja mora biti popis od: p, n, e`,
        );
      }
    });
    if (s.ciljevi.length === 2 && neispravniCiljevi(s).length === 0) {
      const [a, b] = s.ciljevi.map(sastavCilja);
      need(
        !SASTAV_POLJA.every((k) => a[k] === b[k]),
        "ciljevi su isti atom: drugi cilj mora biti drugi izotop ili ion",
      );
      const m = mijenjaCilj(s.ciljevi[1], 1);
      for (const k of SASTAV_POLJA)
        if (!m.includes(k))
          need(
            a[k] === b[k],
            `ciljevi[1] ne mijenja „${k}“, a za taj atom treba drugi broj (${b[k]} umjesto ${a[k]})`,
          );
    }
    if (s.simbol_uzivo != null)
      need(
        typeof s.simbol_uzivo === "boolean",
        "simbol_uzivo mora biti true ili false",
      );
    need(
      s.izotopi == null,
      "slozi nema izotopi (traka izotopa bi otkrila odgovor)",
    );
  }
}
// pomoćno: postoje li već problemi s ciljevima (da ne računamo s neispravnim)
function neispravniCiljevi(s) {
  return (s.ciljevi ?? []).filter(
    (c) => zIzSimbola(c?.simbol) == null || !Number.isInteger(c?.A),
  );
}

// ══ REAKCIJA ══════════════════════════════════════════════════════════════════════════════════════
// Član: {simbol, A, broj?} (jezgra) | {cestica, broj?} | {nepoznato: true}
export function clanAZ(c) {
  if (!c || c.nepoznato) return null;
  if (c.cestica) {
    const x = CESTICE[c.cestica];
    return x ? { A: x.A, Z: x.Z } : null;
  }
  const Z = zIzSimbola(c.simbol);
  return Z == null ? null : { A: c.A, Z };
}
export const brojClana = (c) => (Number.isInteger(c?.broj) ? c.broj : 1);
export function zapisClana(c) {
  if (c.cestica) return zapisCestice(c.cestica);
  return zapisJezgre(zIzSimbola(c.simbol), c.A);
}
// Odgovor učenika (član iz palete) → {A, Z}
export function odabirAZ(o) {
  if (!o) return null;
  if (o.cestica)
    return CESTICE[o.cestica]
      ? { A: CESTICE[o.cestica].A, Z: CESTICE[o.cestica].Z }
      : null;
  if (Number.isInteger(o.A) && Number.isInteger(o.Z)) return { A: o.A, Z: o.Z };
  return null;
}
// Što je čestica s ovim A i Z (proton i ¹H su isto, kao i α i ⁴He)
export function nazivAZ(A, Z) {
  const id = CESTICE_IDS.find((k) => CESTICE[k].A === A && CESTICE[k].Z === Z);
  if (id) return { cestica: id, ime: CESTICE[id].ime, zapis: zapisCestice(id) };
  if (Z >= 1 && Z <= Z_MAX && A >= Z && A >= 1)
    return {
      jezgra: true,
      ime: `jezgra ${imeIzotopa(Z, A)}`,
      zapis: zapisJezgre(Z, A),
    };
  return null;
}
export const stranaNepoznatog = (s) =>
  (s.lijevo ?? []).some((c) => c?.nepoznato)
    ? "lijevo"
    : (s.desno ?? []).some((c) => c?.nepoznato)
      ? "desno"
      : null;

function zbroj(clanovi, bezBroja = false) {
  let A = 0,
    Z = 0;
  const iA = [],
    iZ = [];
  for (const c of clanovi) {
    const x = clanAZ(c);
    if (!x) continue;
    const k = bezBroja ? 1 : brojClana(c);
    A += k * x.A;
    Z += k * x.Z;
    iA.push(k > 1 ? `${k} · ${x.A}` : String(x.A));
    iZ.push(k > 1 ? `${k} · ${zn(x.Z)}` : zn(x.Z));
  }
  return { A, Z, izrazA: iA.join(" + "), izrazZ: iZ.join(" + ") };
}
const predznak = (d) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0");
const zn = (z) => (z < 0 ? `(−${-z})` : String(z));

// A i Z nepoznatog člana iz očuvanja (bezBroja: kao da je učenik zaboravio koeficijente)
export function rjesenjeReakcije(s, bezBroja = false) {
  const strana = stranaNepoznatog(s);
  if (!strana) return null;
  const L = zbroj(s.lijevo, bezBroja);
  const R = zbroj(s.desno, bezBroja);
  return strana === "desno"
    ? { A: L.A - R.A, Z: L.Z - R.Z }
    : { A: R.A - L.A, Z: R.Z - L.Z };
}

// Vage A i Z: zbrojevi lijevo i desno; X se uračunava samo ako je zadan (odabir) i ukljuciX
export function vageReakcije(s, odabir, ukljuciX) {
  const strana = stranaNepoznatog(s);
  const x = ukljuciX ? odabirAZ(odabir) : null;
  const L = zbroj(s.lijevo);
  const R = zbroj(s.desno);
  const dodaj = (z, str) => {
    if (strana !== str) return { ...z, nepoznato: false };
    if (x)
      return {
        A: z.A + x.A,
        Z: z.Z + x.Z,
        izrazA: [z.izrazA, String(x.A)].filter(Boolean).join(" + "),
        izrazZ: [z.izrazZ, zn(x.Z)].filter(Boolean).join(" + "),
        nepoznato: false,
      };
    return {
      ...z,
      izrazA: [z.izrazA, "A_X"].filter(Boolean).join(" + "),
      izrazZ: [z.izrazZ, "Z_X"].filter(Boolean).join(" + "),
      nepoznato: true,
    };
  };
  const l = dodaj(L, "lijevo");
  const r = dodaj(R, "desno");
  return {
    A: {
      lijevo: l,
      desno: r,
      jednako: !l.nepoznato && !r.nepoznato && l.A === r.A,
    },
    Z: {
      lijevo: l,
      desno: r,
      jednako: !l.nepoznato && !r.nepoznato && l.Z === r.Z,
    },
  };
}

// Nagib grede vage u stupnjevima (pozitivno: lijeva strana teža, spušta se); 0 kad X još nije uračunat
export const nagibVage = (strana) =>
  strana.lijevo.nepoznato || strana.desno.nepoznato ? 0 : Math.sign(strana.lijevoV - strana.desnoV) * Math.min(9, 3 + Math.abs(strana.lijevoV - strana.desnoV));
// Vage spremne za crtanje: [{oznaka, lijevo (izraz = zbroj), desno, nagib, jednako}]
export function vageZaCrtanje(s, odabir, ukljuciX, skrijZ = false) {
  const v = vageReakcije(s, odabir, ukljuciX);
  return ["A", "Z"].map((k) => {
    const l = v[k].lijevo;
    const d = v[k].desno;
    const izraz = (x) => (x.nepoznato ? x[`izraz${k}`] : `${x[`izraz${k}`]} = ${x[k]}`);
    const skriveno = k === "Z" && skrijZ;
    const o = { lijevo: l, desno: d, lijevoV: l[k], desnoV: d[k] };
    return {
      oznaka: k === "A" ? "A (maseni)" : "Z (redni)",
      kljuc: k,
      lijevo: skriveno ? "?" : izraz(l),
      desno: skriveno ? "?" : izraz(d),
      nagib: skriveno ? 0 : nagibVage(o),
      jednako: !skriveno && v[k].jednako,
      poznato: !skriveno && !l.nepoznato && !d.nepoznato,
    };
  });
}

// Raspored jednadžbe u retku širine W: članovi s x-središtem i širinom, plusovi i strelica
export function rasporedReakcije(s, W = 360) {
  const elementi = [];
  const sirina = (c) => {
    const az = clanAZ(c);
    const baza = c.nepoznato ? 46 : c.cestica ? 38 : az && az.A > 99 ? 56 : 50;
    return baza + (brojClana(c) > 1 ? 14 : 0);
  };
  const dodaj = (clanovi, strana) =>
    clanovi.forEach((c, i) => {
      if (i > 0) elementi.push({ vrsta: "plus", w: 14 });
      elementi.push({ vrsta: "clan", strana, i, clan: c, w: sirina(c) });
    });
  dodaj(s.lijevo ?? [], "lijevo");
  elementi.push({ vrsta: "strelica", w: 30 });
  dodaj(s.desno ?? [], "desno");
  const ukupno = elementi.reduce((a, e) => a + e.w, 0);
  const razmak = Math.max(
    2,
    Math.min(10, (W - 8 - ukupno) / Math.max(1, elementi.length - 1)),
  );
  const skala = Math.min(
    1,
    (W - 8) / (ukupno + razmak * (elementi.length - 1)),
  );
  let x = (W - skala * (ukupno + razmak * (elementi.length - 1))) / 2;
  for (const e of elementi) {
    e.w *= skala;
    e.x = Math.round((x + e.w / 2) * 10) / 10;
    x += e.w + razmak * skala;
  }
  return { elementi, skala };
}

// Kadar animacije reakcije (t od 0 do 1): lijevi članovi se skupe u sredinu, bljesak, desni izlete na svoja mjesta.
export function kadarReakcije(raspored, t, W = 360) {
  const cx = W / 2;
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const clanovi = raspored.elementi.filter((e) => e.vrsta === "clan");
  return {
    clanovi: clanovi.map((e) => {
      if (e.strana === "lijevo") {
        const u = ease(t / 0.4);
        return {
          strana: e.strana,
          i: e.i,
          x: e.x + (cx - e.x) * u,
          opacity: t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.1),
          skala: 1,
        };
      }
      const u = ease((t - 0.5) / 0.5);
      return {
        strana: e.strana,
        i: e.i,
        x: cx + (e.x - cx) * u,
        opacity: t < 0.5 ? 0 : Math.min(1, (t - 0.5) / 0.15),
        skala: 0.6 + 0.4 * u,
      };
    }),
    bljesak: t > 0.35 && t < 0.7 ? Math.sin(((t - 0.35) / 0.35) * Math.PI) : 0,
    ostalo: t >= 1, // na kraju se ostali elementi (plusovi, strelica) vrate
  };
}

function checkDovrsi(s, odg) {
  const x = odabirAZ(odg);
  if (!x)
    return {
      tocno: false,
      poruka: "Odaberi česticu X iz palete ispod jednadžbe.",
      prazno: true,
    };
  const r = rjesenjeReakcije(s);
  if (x.A === r.A && x.Z === r.Z) return { tocno: true };
  if (odg && !odg.cestica && (x.Z < 1 || x.A < x.Z || x.Z > Z_MAX))
    return {
      tocno: false,
      poruka:
        x.Z < 1
          ? "Jezgra mora imati barem jedan proton (Z ≥ 1). Čestice bez protona su u paleti (n, e⁻, γ…)."
          : `Jezgra s Z = ${x.Z} i A = ${x.A} ne postoji: A broji protone **i** neutrone, pa je barem Z.`,
    };
  for (const k of s.krivo ?? []) {
    const kx = odabirAZ(k.odabir);
    if (kx && kx.A === x.A && kx.Z === x.Z)
      return { tocno: false, poruka: k.poruka };
  }
  const bez = rjesenjeReakcije(s, true);
  if ((bez.A !== r.A || bez.Z !== r.Z) && x.A === bez.A && x.Z === bez.Z) {
    const c = [...s.lijevo, ...s.desno].find((y) => brojClana(y) > 1);
    const MN = {
      p: "protona",
      n: "neutrona",
      "e-": "elektrona",
      "e+": "pozitrona",
      alfa: "α-čestice",
      gama: "γ-fotona",
    };
    const ime = c.cestica
      ? MN[c.cestica]
      : `jezgre ${kratkiZapis(zIzSimbola(c.simbol), c.A)}`;
    return {
      tocno: false,
      poruka: `Pazi na koeficijent: u reakciji su **${brojClana(c)}** ${ime}, pa taj član u zbroj ulazi ${brojClana(c)} puta (${brojClana(c)} · ${clanAZ(c).A} za A).`,
    };
  }
  const strana = stranaNepoznatog(s);
  const L = zbroj(s.lijevo);
  const R = zbroj(s.desno);
  const sA =
    strana === "lijevo" ? { l: L.A + x.A, r: R.A } : { l: L.A, r: R.A + x.A };
  const sZ =
    strana === "lijevo" ? { l: L.Z + x.Z, r: R.Z } : { l: L.Z, r: R.Z + x.Z };
  if (x.A === r.A && x.Z === -r.Z && r.Z !== 0)
    return {
      tocno: false,
      poruka: `Maseni broj je dobar, ali naboj je obrnut: ${nazivAZ(x.A, x.Z)?.ime ?? "ta čestica"} ima Z = ${zn(x.Z).replace(/[()]/g, "")}. Treba čestica istog A, ali suprotnog naboja.`,
    };
  const ime = nazivAZ(x.A, x.Z)?.ime ?? "ta čestica";
  if (x.A === r.A)
    return {
      tocno: false,
      poruka: `Maseni brojevi se slažu (${sA.l} = ${sA.r}), ali redni ne: s tom česticom (${ime}, Z = ${zn(x.Z).replace(/[()]/g, "")}) lijevo je zbroj Z = ${sZ.l}, a desno ${sZ.r}. Treba čestica s istim A i drugim Z.`,
    };
  if (x.Z === r.Z)
    return {
      tocno: false,
      poruka: `Redni brojevi se slažu (${sZ.l} = ${sZ.r}), ali maseni ne: s tom česticom (${ime}, A = ${x.A}) lijevo je zbroj A = ${sA.l}, a desno ${sA.r}.`,
    };
  return {
    tocno: false,
    poruka:
      s.savjet ||
      `Ni maseni ni redni brojevi se ne slažu: s tom česticom lijevo je A = ${sA.l} i Z = ${sZ.l}, a desno A = ${sA.r} i Z = ${sZ.r}. Zbroj gornjih i zbroj donjih brojeva mora biti isti s obje strane.`,
  };
}

function validateReakcija(s, need) {
  for (const strana of ["lijevo", "desno"]) {
    const cl = s[strana];
    if (
      !need(
        Array.isArray(cl) && cl.length >= 1 && cl.length <= 4,
        `${strana} mora biti popis od 1 do 4 člana`,
      )
    )
      continue;
    cl.forEach((c, i) => {
      const gdje = `${strana}[${i}]`;
      if (
        !need(
          c && typeof c === "object",
          `${gdje} mora biti član {simbol, A} | {cestica} | {nepoznato: true}`,
        )
      )
        return;
      const vrste = [
        "simbol" in c,
        "cestica" in c,
        c.nepoznato === true,
      ].filter(Boolean).length;
      if (
        !need(
          vrste === 1,
          `${gdje}: točno jedno od simbol+A, cestica ili nepoznato: true`,
        )
      )
        return;
      if (c.cestica != null)
        need(
          CESTICE_IDS.includes(c.cestica),
          `${gdje}.cestica mora biti jedna od: ${CESTICE_IDS.join(", ")}`,
        );
      if ("simbol" in c) validateJezgra(c, need, gdje);
      if (c.broj != null)
        need(
          !c.nepoznato &&
            Number.isInteger(c.broj) &&
            c.broj >= 2 &&
            c.broj <= 4,
          `${gdje}.broj (koeficijent) mora biti 2–4 (nepoznato je uvijek jedno)`,
        );
    });
  }
  if (!Array.isArray(s.lijevo) || !Array.isArray(s.desno)) return;
  const n = [...s.lijevo, ...s.desno].filter((c) => c?.nepoznato).length;
  if (s.nacin === "dovrsi") {
    if (!need(n === 1, "dovrsi treba točno jedan član {nepoznato: true}"))
      return;
    const r = rjesenjeReakcije(s);
    need(
      nazivAZ(r.A, r.Z) != null,
      `reakcija nema rješenja: iz očuvanja izlazi A = ${r.A}, Z = ${r.Z}, a to nije ni čestica ni jezgra`,
    );
    if (
      s.krivo != null &&
      need(Array.isArray(s.krivo), "krivo mora biti popis {odabir, poruka}")
    )
      s.krivo.forEach((k, i) => {
        const kx = odabirAZ(k?.odabir);
        need(kx != null, `krivo[${i}].odabir mora biti {cestica} ili {A, Z}`);
        need(isText(k?.poruka), `krivo[${i}].poruka mora biti tekst`);
        if (kx)
          need(!(kx.A === r.A && kx.Z === r.Z), `krivo[${i}] je točan odgovor`);
      });
    if (s.bez_z != null)
      need(typeof s.bez_z === "boolean", "bez_z mora biti true ili false");
  } else {
    need(n <= 1, "najviše jedan član {nepoznato: true}");
    if (n === 0) {
      const L = zbroj(s.lijevo);
      const R = zbroj(s.desno);
      need(
        L.A === R.A && L.Z === R.Z,
        `reakcija nije uravnotežena: lijevo A = ${L.A}, Z = ${L.Z}, desno A = ${R.A}, Z = ${R.Z}`,
      );
    }
    if (s.nacin === "prikaz")
      need(n === 0, "prikaz pokazuje cijelu reakciju: bez nepoznatog člana");
  }
}

// ══ KARTA NUKLIDA ═════════════════════════════════════════════════════════════════════════════════
export const RASPADI = ["alfa", "beta-", "beta+", "gama"];
export const RASPAD_ZNAK = {
  alfa: "α",
  "beta-": "β⁻",
  "beta+": "β⁺",
  gama: "γ",
};
export const RASPAD_IME = {
  alfa: "α-raspad",
  "beta-": "β⁻-raspad",
  "beta+": "β⁺-raspad",
  gama: "γ-raspad",
};
const POMAK = {
  alfa: [-2, -2],
  "beta-": [1, -1],
  "beta+": [-1, 1],
  gama: [0, 0],
};
// Primijeni raspad na {Z, N, pob}; nakon α i β jezgra može ostati pobuđena (*), γ je vrati u osnovno stanje.
export function primijeniRaspad(j, vrsta, pobPoslije = false) {
  const [dZ, dN] = POMAK[vrsta];
  return {
    Z: j.Z + dZ,
    N: j.N + dN,
    A: j.Z + dZ + j.N + dN,
    pob: vrsta === "gama" ? false : pobPoslije,
  };
}
// Put kroz niz: [početna, nakon 1., nakon 2., …]; jezgra je pobuđena ako slijedi γ
export function putRaspada(pocetak, niz) {
  const j0 = jezgraIz(pocetak);
  if (!j0) return [];
  const put = [{ ...j0, pob: niz[0] === "gama" ? true : j0.pob }];
  niz.forEach((v, i) =>
    put.push(primijeniRaspad(put[i], v, niz[i + 1] === "gama")),
  );
  return put;
}
export function vrstaRaspada(a, b) {
  const dZ = b.Z - a.Z;
  const dN = b.N - a.N;
  return (
    RASPADI.find(
      (v) =>
        POMAK[v][0] === dZ && POMAK[v][1] === dN && (v !== "gama" || a.pob),
    ) ?? null
  );
}
export const opisJezgre = (j) =>
  `Z = ${j.Z} (${simbolZ(j.Z)}), N = ${j.N}, A = ${j.Z + j.N}`;

// Prozor karte (rasponi Z i N) koji obuhvaća put; najviše 8 × 8 polja, uz rub 2, 1 ili 0 polja.
export const KARTA_MAX = 8;
export function prozorPuta(put, max = KARTA_MAX) {
  const Zs = put.map((j) => j.Z);
  const Ns = put.map((j) => j.N);
  const box = {
    zMin: Math.min(...Zs),
    zMax: Math.max(...Zs),
    nMin: Math.min(...Ns),
    nMax: Math.max(...Ns),
  };
  for (const rub of [2, 1, 0]) {
    if (
      box.zMax - box.zMin + 1 + 2 * rub <= max &&
      box.nMax - box.nMin + 1 + 2 * rub <= max
    ) {
      const p = {
        zMin: box.zMin - rub,
        zMax: box.zMax + rub,
        nMin: box.nMin - rub,
        nMax: box.nMax + rub,
      };
      // dopuni do barem 5 × 5 da karta ne bude premala
      const prosiri = (lo, hi, donja) => {
        while (hi - lo < 4) {
          if (lo > donja) lo--;
          if (hi - lo < 4) hi++;
        }
        return [lo, hi];
      };
      [p.zMin, p.zMax] = prosiri(Math.max(1, p.zMin), p.zMax, 1);
      [p.nMin, p.nMax] = prosiri(Math.max(0, p.nMin), p.nMax, 0);
      return p;
    }
  }
  return null;
}
// Prozor 7 × 6 oko jezgre (istraživanje i prikaz dugog niza); stari prozor ostaje dok je jezgra unutra s rubom 1
export function prozorOko(j, stari) {
  if (
    stari &&
    j.Z >= stari.zMin + 1 &&
    j.Z <= stari.zMax - 1 &&
    j.N >= stari.nMin + 1 &&
    j.N <= stari.nMax - 1
  )
    return stari;
  const zMin = Math.max(1, j.Z - 3);
  const nMin = Math.max(0, j.N - 4);
  return { zMin, zMax: zMin + 5, nMin, nMax: nMin + 6 };
}
export function prozorKarte(s) {
  if (s.nacin === "koji_raspad")
    return prozorPuta([jezgraIz(s.pocetak), jezgraIz(s.kraj)]);
  if (s.nacin === "raspad") return prozorPuta(putRaspada(s.pocetak, s.niz));
  return prozorOko(jezgraIz(s.pocetak));
}

// Geometrija karte u okviru W × H: stupci (N) vodoravno, redovi (Z) okomito (veći Z gore).
export function geometrijaKarte(p, W = 360, H = 250) {
  const lijevo = 50;
  const dolje = 22;
  const gore = 4;
  const nS = p.nMax - p.nMin + 1;
  const nR = p.zMax - p.zMin + 1;
  const cw = Math.min(46, (W - lijevo - 6) / nS);
  const ch = Math.min(40, (H - dolje - gore) / nR);
  const x0 = lijevo + (W - lijevo - 6 - cw * nS) / 2;
  const polje = (Z, N) => ({
    x: x0 + (N - p.nMin) * cw,
    y: gore + (p.zMax - Z) * ch,
    w: cw,
    h: ch,
  });
  const polja = [];
  for (let Z = p.zMax; Z >= p.zMin; Z--)
    for (let N = p.nMin; N <= p.nMax; N++)
      polja.push({ Z, N, A: Z + N, ...polje(Z, N) });
  const r = (v) => Math.round(v * 10) / 10;
  return {
    W,
    H: gore + nR * ch + dolje,
    cw: r(cw),
    ch: r(ch),
    polja: polja.map((q) => ({
      ...q,
      x: r(q.x),
      y: r(q.y),
      w: r(q.w),
      h: r(q.h),
    })),
    redovi: Array.from({ length: nR }, (_, i) => {
      const Z = p.zMax - i;
      return { Z, oznaka: `${Z} ${simbolZ(Z)}`, y: r(gore + i * ch + ch / 2) };
    }),
    stupci: Array.from({ length: nS }, (_, i) => ({
      N: p.nMin + i,
      x: r(x0 + i * cw + cw / 2),
    })),
    os: { x: r(x0), y: r(gore + nR * ch), sirina: r(cw * nS) },
    sredina: (Z, N) => {
      const q = polje(Z, N);
      return { x: r(q.x + q.w / 2), y: r(q.y + q.h / 2) };
    },
    unutra: (Z, N) => Z >= p.zMin && Z <= p.zMax && N >= p.nMin && N <= p.nMax,
  };
}

// Kadar animacije raspada na pozornici (t od 0 do 1), oko (0, 0); R1 = polumjer nukleona.
export function kadarRaspada(tipovi, vrsta, t, R1 = 6) {
  const prije = kuglice(tipovi, R1);
  const R = polumjerJezgre(tipovi.length, R1);
  const r = raspadTipova(tipovi, vrsta);
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  if (vrsta === "alfa") {
    const izb = new Set(r.izbaceni);
    const leti = prije.filter((k) => izb.has(k.i));
    const cx0 = leti.reduce((a, k) => a + k.x, 0) / 4;
    const cy0 = leti.reduce((a, k) => a + k.y, 0) / 4;
    const u1 = ease(t / 0.3);
    const u2 = ease((t - 0.3) / 0.7);
    const meta = { x: R + 10, y: 0 };
    const cx = cx0 + (meta.x - cx0) * u1 + 130 * u2;
    const cy = cy0 + (meta.y - cy0) * u1 - 20 * u2;
    const off = [
      [-0.5, -0.5],
      [0.5, 0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
    ];
    const rb = Math.max(3, leti[0]?.r ?? 3);
    return {
      jezgra:
        t < 0.3 ? prije.filter((k) => !izb.has(k.i)) : kuglice(r.tipovi, R1),
      cestice: leti.map((k, j) => ({
        vrsta: k.vrsta,
        x:
          k.x +
          (cx + off[j][0] * rb * 1.7 - k.x) * Math.max(u1, u2 > 0 ? 1 : 0),
        y:
          k.y +
          (cy + off[j][1] * rb * 1.7 - k.y) * Math.max(u1, u2 > 0 ? 1 : 0),
        r: rb,
        opacity: 1 - ease((t - 0.75) / 0.25),
      })),
      foton: null,
      prijelaz: null,
      bljesak: 0,
      tipovi: r.tipovi,
    };
  }
  if (vrsta === "beta-" || vrsta === "beta+") {
    const k = prije.find((q) => q.i === r.promijenjen);
    const u = ease((t - 0.35) / 0.65);
    return {
      jezgra: t < 0.35 ? prije : kuglice(r.tipovi, R1),
      prijelaz:
        t < 0.35 && k
          ? {
              i: k.i,
              u: ease(t / 0.35),
              u_vrsta: vrsta === "beta-" ? "p" : "n",
            }
          : null,
      cestice:
        t >= 0.3 && k
          ? [
              {
                vrsta: vrsta === "beta-" ? "e-" : "e+",
                x: k.x + (R + 150 - k.x) * u,
                y: k.y + (-24 - k.y) * u,
                r: 3.2,
                opacity: 1 - ease((t - 0.85) / 0.15),
              },
            ]
          : [],
      foton: null,
      bljesak: 0,
      tipovi: r.tipovi,
    };
  }
  // γ: bljesak i valovita zraka, jezgra ostaje ista
  return {
    jezgra: prije,
    prijelaz: null,
    cestice: [],
    foton:
      t > 0.1
        ? {
            x0: R + 4,
            x1: R + 4 + 150 * ease((t - 0.1) / 0.8),
            opacity: 1 - ease((t - 0.85) / 0.15),
          }
        : null,
    bljesak: t < 0.35 ? Math.sin((t / 0.35) * Math.PI) : 0,
    tipovi: r.tipovi,
  };
}

const sjeme = (s) => (Number.isInteger(s.sjeme) ? s.sjeme : 7);
export const tipoviZa = (s, j) => tipoviJezgre(j.Z, j.N, sjeme(s));

function checkRaspad(s, odg) {
  const put = putRaspada(s.pocetak, s.niz);
  const n = s.niz.length;
  if (
    !Array.isArray(odg) ||
    odg.length !== n ||
    odg.some((o) => !o || !Number.isInteger(o.Z) || !Number.isInteger(o.N))
  )
    return {
      tocno: false,
      poruka:
        n > 1
          ? `Dodirni na karti polje jezgre nakon svakog raspada (${Array.from({ length: n }, (_, i) => i + 1).join(", ")}).`
          : "Dodirni na karti polje jezgre koja nastaje.",
      prazno: true,
    };
  for (let i = 0; i < n; i++) {
    const o = odg[i];
    const c = put[i + 1];
    if (o.Z === c.Z && o.N === c.N) continue;
    const pre = n > 1 ? `${i + 1}. raspad (${RASPAD_ZNAK[s.niz[i]]}): ` : "";
    const P = put[i];
    const v = s.niz[i];
    const dZ = o.Z - P.Z;
    const dN = o.N - P.N;
    const isto = (a, b) => dZ === a && dN === b;
    const iz0 = i > 0 ? primijeniRaspad(put[0], v) : null;
    if (iz0 && o.Z === iz0.Z && o.N === iz0.N)
      return {
        tocno: false,
        poruka: `${pre}primijenio si raspad na početnu jezgru. Drugi raspad kreće od jezgre **nastale u prvom** raspadu.`,
      };
    const drugi = put.findIndex(
      (q, j) => j > 0 && j !== i + 1 && q.Z === o.Z && q.N === o.N,
    );
    if (drugi > 0 && !(put[drugi].Z === c.Z && put[drugi].N === c.N))
      return {
        tocno: false,
        poruka: `${pre}to je jezgra nakon ${drugi}. raspada. Pazi na redoslijed: polje ${i + 1} je jezgra nakon ${i + 1}. raspada.`,
      };
    if (v === "gama")
      return {
        tocno: false,
        poruka: `${pre}γ je foton, bez mase i naboja: jezgra ostaje na **istom polju**, samo izgubi višak energije.`,
      };
    if (dZ === 0 && dN === 0)
      return {
        tocno: false,
        poruka: `${pre}${RASPAD_IME[v]} mijenja jezgru, pa ona ne ostaje na istom polju.`,
      };
    if (v === "alfa") {
      if (isto(-2, -4))
        return {
          tocno: false,
          poruka: `${pre}A padne za 4, ali α-čestica nosi **2 protona i 2 neutrona**, pa N padne samo za 2.`,
        };
      if (isto(2, 2) || isto(2, -2) || dZ > 0)
        return {
          tocno: false,
          poruka: `${pre}α-čestica **odlazi** iz jezgre i odnosi 2 protona, pa se Z smanjuje (i A).`,
        };
      if (isto(-2, 0))
        return {
          tocno: false,
          poruka: `${pre}Z je dobar, ali α-čestica odnosi i 2 neutrona.`,
        };
      if (isto(-4, 0) || isto(-4, -4))
        return {
          tocno: false,
          poruka: `${pre}α-čestica je ⁴₂He: odnosi 2 protona i 2 neutrona (A − 4, Z − 2).`,
        };
    }
    if (v === "beta-") {
      if (isto(-1, 1))
        return {
          tocno: false,
          poruka: `${pre}pri β⁻ jedan **neutron postaje proton** (i izleti elektron), pa Z **raste** za 1. Smanjenje Z je β⁺.`,
        };
      if (isto(1, 0))
        return {
          tocno: false,
          poruka: `${pre}A ostaje isti: neutron koji je postao proton više nije neutron, pa N padne za 1.`,
        };
      if (isto(0, -1) || isto(-1, 0) || isto(-1, -1))
        return {
          tocno: false,
          poruka: `${pre}elektron gotovo nema mase, pa A ostaje isti. Jedan neutron postane proton: Z + 1, N − 1.`,
        };
    }
    if (v === "beta+") {
      if (isto(1, -1))
        return {
          tocno: false,
          poruka: `${pre}pri β⁺ proton postaje neutron (izleti pozitron), pa Z **pada** za 1.`,
        };
    }
    return {
      tocno: false,
      poruka:
        s.savjet ||
        `${pre}nije to polje. Ti si promijenio Z za ${predznak(dZ)} i N za ${predznak(dN)}. Prisjeti se što odnosi ${RASPAD_ZNAK[v]}-raspad.`,
    };
  }
  return { tocno: true };
}

function checkKojiRaspad(s, odg) {
  if (!RASPADI.includes(odg))
    return { tocno: false, poruka: "Odaberi vrstu raspada.", prazno: true };
  const a = jezgraIz(s.pocetak);
  const b = jezgraIz(s.kraj);
  const tocan = vrstaRaspada(a, b);
  if (odg === tocan) return { tocno: true };
  const bi = primijeniRaspad(a, odg);
  if (odg === "gama")
    return {
      tocno: false,
      poruka: `γ-raspadom jezgra ostaje ista (${tekstJezgre(a.Z, a.A)}), a ovdje se promijenila u ${tekstJezgre(b.Z, b.A)}.`,
    };
  if (tocan === "gama")
    return {
      tocno: false,
      poruka: `${RASPAD_IME[odg]} bi promijenio jezgru u ${tekstJezgre(bi.Z, bi.A)}, a ovdje su A i Z ostali isti. Jezgra je samo izgubila energiju.`,
    };
  return {
    tocno: false,
    poruka: `${RASPAD_IME[odg]} bi dao ${tekstJezgre(bi.Z, bi.A)}, a nastala je ${tekstJezgre(b.Z, b.A)}. Usporedi kako su se promijenili A i Z.`,
  };
}

function validateKarta(s, need) {
  const ok = validateJezgra(s.pocetak, need, "pocetak");
  if (s.sjeme != null)
    need(
      Number.isInteger(s.sjeme) && s.sjeme >= 1,
      "sjeme mora biti pozitivan cijeli broj",
    );
  if (s.nacin === "raspad" || s.nacin === "prikaz") {
    const max = s.nacin === "raspad" ? 4 : 16;
    if (
      !need(
        Array.isArray(s.niz) &&
          s.niz.length >= 1 &&
          s.niz.length <= max &&
          s.niz.every((v) => RASPADI.includes(v)),
        `niz mora biti popis od 1 do ${max} raspada: ${RASPADI.join(", ")}`,
      )
    )
      return;
    if (!ok) return;
    need(
      s.niz[0] !== "gama" || s.pocetak.pobudjena === true,
      "γ ne može biti prvi raspad osnovne jezgre: dodaj pocetak.pobudjena: true (npr. ⁶⁰Ni* nakon β⁻)",
    );
    s.niz.forEach(
      (v, i) =>
        i > 0 &&
        need(
          !(v === "gama" && s.niz[i - 1] === "gama"),
          `niz[${i}]: dva γ zaredom (nakon γ jezgra je već u osnovnom stanju)`,
        ),
    );
    const put = putRaspada(s.pocetak, s.niz);
    need(
      put.every((j) => j.Z >= 1 && j.N >= 0 && j.Z <= Z_MAX),
      "niz izlazi iz karte (Z < 1 ili N < 0)",
    );
    if (s.nacin === "raspad")
      need(
        prozorPuta(put) != null,
        `niz je preširok za kartu (najviše ${KARTA_MAX} × ${KARTA_MAX} polja); skrati ga`,
      );
    need(s.kraj == null, `${s.nacin} nema kraj (to je za koji_raspad)`);
  } else if (s.nacin === "koji_raspad") {
    if (validateJezgra(s.kraj, need, "kraj") && ok) {
      const a = jezgraIz(s.pocetak);
      const b = jezgraIz(s.kraj);
      need(
        vrstaRaspada(a, b) != null,
        `iz ${tekstJezgre(a.Z, a.A)} u ${tekstJezgre(b.Z, b.A)} ne vodi nijedan raspad (α, β⁻, β⁺, ili γ uz pocetak.pobudjena)`,
      );
      need(!b.pob, "kraj ne može biti pobuđen");
    }
    need(s.niz == null, "koji_raspad nema niz");
  } else {
    need(
      s.niz == null && s.kraj == null,
      "istrazi nema niz ni kraj (za cijeli niz koristi prikaz)",
    );
  }
}

// ══ VEZANJE ═══════════════════════════════════════════════════════════════════════════════════════
export const VELICINE_VEZANJA = {
  dm: { oznaka: "Δm", naziv: "defekt mase", jedinica: "u" },
  dm_kg: { oznaka: "Δm", naziv: "defekt mase u kilogramima", jedinica: "kg" },
  E_J: { oznaka: "E", naziv: "energija vezanja u džulima", jedinica: "J" },
  E_eV: {
    oznaka: "E",
    naziv: "energija vezanja u elektronvoltima",
    jedinica: "eV",
  },
  E: { oznaka: "E", naziv: "energija vezanja", jedinica: "MeV" },
  E_A: {
    oznaka: "E/A",
    naziv: "energija vezanja po nukleonu",
    jedinica: "MeV",
  },
};
const ENERGIJA_J = { J: 1, eV: 1.6e-19, keV: 1.6e-16, MeV: 1.6e-13 };

export function konstVezanja(s) {
  return {
    m_p: isNum(s.m_p) ? s.m_p : KONST.m_p,
    m_n: isNum(s.m_n) ? s.m_n : KONST.m_n,
    u: KONST.u,
    c: KONST.c,
    eV: KONST.eV,
  };
}
// Cijeli lanac računa, bez zaokruživanja međukoraka
export function racunVezanja(s, j = s.jezgra) {
  const k = konstVezanja(s);
  const Z = zIzSimbola(j.simbol);
  const A = j.A;
  const N = A - Z;
  const slobodno = Z * k.m_p + N * k.m_n;
  const dm = slobodno - j.m;
  const dm_kg = dm * k.u;
  const E_J = dm_kg * k.c * k.c;
  const E_eV = E_J / k.eV;
  const E = E_eV / 1e6;
  return { Z, N, A, m: j.m, slobodno, dm, dm_kg, E_J, E_eV, E, E_A: E / A, k };
}
// Lanac pretvorbi u kućicama: [{kljuc, oznaka, jedinica, vrijednost}] i operacije između njih
export function lanacVezanja(s, j = s.jezgra) {
  const r = racunVezanja(s, j);
  return {
    kucice: ["dm", "dm_kg", "E_J", "E_eV", "E", "E_A"].map((kljuc) => ({
      kljuc,
      oznaka: VELICINE_VEZANJA[kljuc].oznaka,
      jedinica:
        kljuc === "E_A" ? "MeV/nukleon" : VELICINE_VEZANJA[kljuc].jedinica,
      vrijednost: r[kljuc],
      tekst: zapisVrijednosti(kljuc, r[kljuc]),
    })),
    operacije: ["· 1,66·10⁻²⁷", "· c²", ": 1,6·10⁻¹⁹", ": 10⁶", `: A (${r.A})`],
    izrazSlobodno: `${r.Z} · ${sv(r.k.m_p)} + ${r.N} · ${sv(r.k.m_n)} = ${formatNumber(r.slobodno, 5)} u`,
    izrazDm: `${formatNumber(r.slobodno, 5)} − ${formatNumber(r.m, 5)} = ${formatNumber(r.dm, 5)} u`,
    r,
  };
}
export function zapisVrijednosti(kljuc, v) {
  if (kljuc === "dm") return formatNumber(v, 5);
  if (kljuc === "E" || kljuc === "E_A") return formatSci(v);
  return formatSci(v);
}

// Tipične krive vrijednosti za traženu veličinu (računa ih kod)
export function krivoVezanja(s, velicina) {
  const r = racunVezanja(s);
  const k = r.k;
  const Ekroz = (dm) => (dm * k.u * k.c * k.c) / 1.6e-13;
  const pz = (dmKriv, poruka) => ({ dm: dmKriv, poruka });
  const dmKrivi = [
    pz(
      r.slobodno + r.m,
      "Zbrojio si sve mase. Defekt mase je **razlika**: masa slobodnih nukleona minus masa jezgre.",
    ),
    pz(
      r.A * k.m_p - r.m,
      "Uzeo si da su svi nukleoni protoni (A · m_p). U jezgri je Z protona i N = A − Z neutrona.",
    ),
    pz(
      r.A * k.m_n - r.m,
      "Uzeo si da su svi nukleoni neutroni (A · m_n). U jezgri je Z protona i N = A − Z neutrona.",
    ),
    pz(
      r.N * k.m_p + r.Z * k.m_n - r.m,
      "Zamijenio si protone i neutrone: masu protona množi brojem protona Z, a masu neutrona brojem neutrona N.",
    ),
    pz(
      r.Z * KONST.m_H + r.N * k.m_n - r.m,
      "Uzmi masu protona iz zadatka (1,00728 u). Masa vodika iz periodnog sustava (1,008 u) uključuje i elektron.",
    ),
    pz(
      -r.dm,
      "Predznak je obrnut: slobodni nukleoni su teži od jezgre, pa je Δm = Z m_p + N m_n − m_j > 0.",
    ),
    pz(
      r.Z * k.m_p + r.N * k.m_n,
      "To je masa slobodnih nukleona. Još oduzmi masu jezgre.",
    ),
  ];
  const out = [];
  const dodaj = (vrijednost, poruka) =>
    isNum(vrijednost) && vrijednost !== 0 && out.push({ vrijednost, poruka });
  if (velicina === "dm") dmKrivi.forEach((x) => dodaj(x.dm, x.poruka));
  if (velicina === "dm_kg") {
    dodaj(
      r.dm,
      "To je Δm u jedinicama u. Za kilograme pomnoži s 1,66·10⁻²⁷ kg.",
    );
    dodaj(
      r.dm / k.u,
      "Podijelio si s 1,66·10⁻²⁷, a treba množiti: 1 u = 1,66·10⁻²⁷ kg.",
    );
    dmKrivi.slice(0, 4).forEach((x) => dodaj(x.dm * k.u, x.poruka));
  }
  if (velicina === "E_J" || velicina === "E_eV" || velicina === "E") {
    const u = VELICINE_VEZANJA[velicina].jedinica;
    const f = ENERGIJA_J[u];
    dodaj(
      (r.dm * k.c * k.c) / f,
      "Δm je u jedinicama u: prije E = Δm c² pretvori ga u kilograme (· 1,66·10⁻²⁷).",
    );
    dodaj(
      (r.dm_kg * k.c) / f,
      "c treba kvadrirati: E = Δm · c², a c² = 9·10¹⁶ m²/s².",
    );
    for (const [jed, fj] of Object.entries(ENERGIJA_J))
      if (jed !== u)
        dodaj(
          r.E_J / fj,
          `To je iznos u ${jed === "J" ? "džulima" : jed}, a traži se u ${u}.`,
        );
    if (u !== "J")
      dodaj(
        (r.E_J * 1.6e-19 * 1.6e-19) / f,
        "U elektronvolte se dijeli s 1,6·10⁻¹⁹ (1 eV = 1,6·10⁻¹⁹ J), a ne množi.",
      );
    if (u === "MeV")
      dodaj(
        (r.E_J * 1.6e-19) / 1e6,
        "U elektronvolte se dijeli s 1,6·10⁻¹⁹ (1 eV = 1,6·10⁻¹⁹ J), a ne množi.",
      );
    dmKrivi
      .slice(0, 5)
      .forEach((x) =>
        dodaj(
          (Ekroz(x.dm) * 1.6e-13) / f,
          `Defekt mase nije dobar. ${x.poruka}`,
        ),
      );
    if (u === "MeV")
      dodaj(
        r.E_A,
        "To je energija po nukleonu. Ukupna energija vezanja je A puta veća.",
      );
  }
  if (velicina === "E_A") {
    dodaj(
      r.E / r.Z,
      r.Z === r.N
        ? "Dijeli s brojem **svih** nukleona A (protoni i neutroni), a ne samo s brojem protona ili neutrona."
        : "Dijelio si brojem protona Z. Dijeli s brojem **svih** nukleona A.",
    );
    if (r.Z !== r.N)
      dodaj(
        r.E / r.N,
        "Dijelio si brojem neutrona N. Dijeli s brojem **svih** nukleona A.",
      );
    dodaj(
      r.E * r.A,
      "Množio si s A, a energiju po nukleonu dobiješ **dijeljenjem**: E/A.",
    );
    dodaj(r.E, "To je ukupna energija vezanja. Po nukleonu: podijeli je s A.");
    dodaj(r.E_A * 1e6, "To je u eV, a traži se u MeV (podijeli s 10⁶).");
    dmKrivi
      .slice(0, 5)
      .forEach((x) =>
        dodaj(Ekroz(x.dm) / r.A, `Defekt mase nije dobar. ${x.poruka}`),
      );
  }
  // bez dvostrukih i bez onih koje su (unutar tolerancije) točne
  const tocno = r[velicina];
  const tol = Math.abs(tocno) * 0.01;
  const vidjeno = [];
  return out.filter((x) => {
    if (near(x.vrijednost, tocno, tol)) return false;
    if (vidjeno.some((v) => near(v, x.vrijednost, tolerance(v)))) return false;
    vidjeno.push(x.vrijednost);
    return true;
  });
}

// Broj iz unosa; prihvaća i drugu jedinicu energije na kraju („28 400 keV“, „4,54·10^-12 J“)
export function citajVrijednost(unos, velicina) {
  const jed = VELICINE_VEZANJA[velicina].jedinica;
  if (typeof unos !== "string") return parseNumber(unos);
  const t = unos.trim();
  if (jed !== "u" && jed !== "kg") {
    for (const [j, f] of Object.entries(ENERGIJA_J).sort(
      (a, b) => b[0].length - a[0].length,
    )) {
      if (t.endsWith(j) && j !== jed && !(j === "eV" && /[kM]eV$/.test(t))) {
        const n = parseNumber(t.slice(0, -j.length));
        return n == null ? null : (n * f) / ENERGIJA_J[jed];
      }
    }
  }
  return parseNumber(t, jed);
}

function checkIzracunaj(s, odg) {
  const r = racunVezanja(s);
  const o = odg && typeof odg === "object" ? odg : {};
  if (s.pitaj.some((q) => !isText(String(o[q.velicina] ?? ""))))
    return {
      tocno: false,
      poruka:
        s.pitaj.length > 1 ? "Upiši sve tražene vrijednosti." : "Upiši broj.",
      prazno: true,
    };
  for (const q of s.pitaj) {
    const v = VELICINE_VEZANJA[q.velicina];
    const n = citajVrijednost(String(o[q.velicina]), q.velicina);
    const pre = s.pitaj.length > 1 ? `${v.oznaka} (${v.jedinica}): ` : "";
    if (n == null)
      return {
        tocno: false,
        poruka: `${pre}upiši broj (decimalni zarez, a za potencije npr. 4,54·10^-12).`,
        prazno: true,
      };
    const ans = r[q.velicina];
    const tol = isNum(q.tolerancija) ? q.tolerancija : Math.abs(ans) * 0.01;
    const krivo = [...(q.krivo ?? []), ...krivoVezanja(s, q.velicina)];
    const rez = checkNumber({
      input: n,
      answer: ans,
      tol,
      krivo,
      savjet: `Nije točno. Provjeri račun i jedinicu (${v.jedinica}).`,
    });
    if (!rez.tocno)
      return {
        tocno: false,
        poruka: pre + rez.poruka.charAt(0).toLowerCase() + rez.poruka.slice(1),
      };
  }
  return { tocno: true };
}

function validateVezanje(s, need) {
  if (s.nacin === "istrazi") {
    if (s.jezgra != null)
      validateJezgra(s.jezgra, need, "jezgra", { masa: true });
  } else if (!validateJezgra(s.jezgra, need, "jezgra", { masa: true })) return;
  for (const k of ["m_p", "m_n"])
    if (s[k] != null)
      need(
        isNum(s[k]) && s[k] > 1 && s[k] < 1.01,
        `${k} mora biti masa u u (oko 1,007–1,009)`,
      );
  if (s.jezgra && zIzSimbola(s.jezgra.simbol) != null && isNum(s.jezgra.m)) {
    const r = racunVezanja(s);
    need(
      r.dm > 0,
      `defekt mase mora biti pozitivan (Z m_p + N m_n = ${formatNumber(r.slobodno, 5)} u > m_j); provjeri masu jezgre`,
    );
    if (r.A > 1)
      need(
        r.E_A >= 0.5 && r.E_A <= 9.5,
        `energija vezanja po nukleonu izlazi ${formatNumber(r.E_A)} MeV, a stvarne su 1–8,8 MeV; provjeri masu jezgre`,
      );
  }
  if (s.nacin === "izracunaj") {
    if (
      !need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "izracunaj treba pitaj: 1–3 {velicina, tolerancija?, krivo?}",
      )
    )
      return;
    s.pitaj.forEach((q, i) => {
      if (
        !need(
          q && Object.keys(VELICINE_VEZANJA).includes(q.velicina),
          `pitaj[${i}].velicina mora biti jedna od: ${Object.keys(VELICINE_VEZANJA).join(", ")}`,
        )
      )
        return;
      if (q.tolerancija != null)
        need(
          isNum(q.tolerancija) && q.tolerancija > 0,
          `pitaj[${i}].tolerancija mora biti pozitivan broj (u jedinici veličine)`,
        );
      if (s.jezgra && zIzSimbola(s.jezgra.simbol) != null)
        validateKrivo(
          q.krivo,
          racunVezanja(s)[q.velicina],
          Math.abs(racunVezanja(s)[q.velicina]) * 0.01,
          need,
          `pitaj[${i}].krivo`,
        );
    });
    need(
      new Set(s.pitaj.map((q) => q?.velicina)).size === s.pitaj.length,
      "pitaj: svaka veličina samo jednom",
    );
    if (s.lanac != null)
      need(typeof s.lanac === "boolean", "lanac mora biti true ili false");
  }
}

// Vaga: slobodni nukleoni na lijevoj zdjelici (hrpa), jezgra na desnoj. Koordinate oko dna zdjelice (0, 0).
export function hrpaNukleona(Z, N, sirina = 110) {
  const A = Z + N;
  const r = Math.max(2.2, Math.min(7, sirina / (2 * Math.sqrt(A * 2.2))));
  const red = Math.max(1, Math.floor(sirina / (2 * r)));
  const tipovi = tipoviJezgre(Z, N, 3);
  return tipovi.map((vrsta, i) => {
    const rd = Math.floor(i / red);
    const k = i % red;
    const uRedu = Math.min(red, A - rd * red);
    const x = (k - (uRedu - 1) / 2) * 2 * r + (rd % 2 ? r * 0.5 : 0);
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(-(r + rd * r * 1.75) * 10) / 10,
      r: Math.round(r * 100) / 100,
      vrsta,
    };
  });
}

// ══ KRIVULJA ══════════════════════════════════════════════════════════════════════════════════════
export const A_MAX_KRIVULJE = 240;
export const EA_MAX_KRIVULJE = 9;
export function geometrijaKrivulje(W = 360, H = 240) {
  const okvir = { x0: 40, x1: W - 12, y0: 12, y1: H - 30 };
  const X = (A) => okvir.x0 + ((okvir.x1 - okvir.x0) * A) / A_MAX_KRIVULJE;
  const Y = (EA) => okvir.y1 - ((okvir.y1 - okvir.y0) * EA) / EA_MAX_KRIVULJE;
  const r = (v) => Math.round(v * 10) / 10;
  const tocke = KRIVULJA_EA.map((t, i) => ({
    ...t,
    i,
    x: r(X(t.A)),
    y: r(Y(t.EA)),
  }));
  return {
    W,
    H,
    okvir,
    tocke,
    put: tocke.map((t, i) => `${i ? "L" : "M"}${t.x},${t.y}`).join(" "),
    xOznake: [0, 40, 80, 120, 160, 200, 240].map((A) => ({ A, x: r(X(A)) })),
    yOznake: [0, 2, 4, 6, 8].map((EA) => ({ EA, y: r(Y(EA)) })),
    X,
    Y,
  };
}
// Najbliža točka krivulje (A se gleda jače od E/A, da prst ne mora pogoditi točno)
export function najblizaTocka(g, x, y) {
  let best = null;
  let d = Infinity;
  for (const t of g.tocke) {
    const dd = (t.x - x) ** 2 + 0.25 * (t.y - y) ** 2;
    if (dd < d) {
      d = dd;
      best = t;
    }
  }
  return best;
}
export const VRH_KRIVULJE = KRIVULJA_EA.reduce((a, b) => (b.EA > a.EA ? b : a));
export const opisTockeKrivulje = (t, sIme = true) =>
  `${sIme ? `${kratkiZapis(t.Z, t.A)} (${imeIzotopa(t.Z, t.A)}): ` : `A = ${t.A}: `}E/A = ${formatNumber(t.EA, 2)} MeV`;
// Strelice fuzije i fisije (indeksi točaka): lake → ⁴He, ²³⁵U → srednje jezgre
export function streliceKrivulje(g) {
  const nadji = (s, A) => g.tocke.find((t) => t.simbol === s && t.A === A);
  return {
    fuzija: {
      od: nadji("H", 2),
      do: nadji("He", 4),
      tekst: "fuzija: lake se spajaju (Sunce)",
    },
    fisija: {
      od: nadji("U", 235),
      do: nadji("Sn", 120),
      tekst: "fisija: teška se cijepa (Krško)",
    },
    vrh: nadji(VRH_KRIVULJE.simbol, VRH_KRIVULJE.A),
  };
}
export const CILJEVI_KRIVULJE = ["najstabilnija", "fuzija", "fisija"];

function checkOdaberi(s, odg) {
  const t = KRIVULJA_EA.find((q) => q.A === odg?.A && q.Z === odg?.Z);
  if (!t)
    return { tocno: false, poruka: "Dodirni točku na krivulji.", prazno: true };
  const c = s.cilj;
  if (c === "najstabilnija") {
    if (t.A === VRH_KRIVULJE.A && t.Z === VRH_KRIVULJE.Z)
      return { tocno: true };
    if (Math.abs(t.A - VRH_KRIVULJE.A) <= 12)
      return {
        tocno: false,
        poruka:
          "Blizu si, ali to nije sam vrh. Najstabilnija je jezgra s **najvećom** energijom vezanja po nukleonu.",
      };
    if (t.A === 4)
      return {
        tocno: false,
        poruka:
          "⁴He je šiljak među lakim jezgrama, ali nije najviša točka krivulje.",
      };
    return {
      tocno: false,
      poruka:
        "Najstabilnija je jezgra s **najvećom** energijom vezanja po nukleonu: traži najvišu točku krivulje.",
    };
  }
  if (c === "fuzija" || c === "fisija") {
    const lako = t.A <= 40;
    const tesko = t.A >= 100;
    if ((c === "fuzija" && lako) || (c === "fisija" && tesko))
      return { tocno: true };
    if (!lako && !tesko)
      return {
        tocno: false,
        poruka:
          "To je blizu vrha (željezo): tu ni spajanje ni cijepanje ne oslobađaju energiju jer je E/A već gotovo najveća. Odaberi jezgru dalje od vrha.",
      };
    if (c === "fuzija")
      return {
        tocno: false,
        poruka:
          "Fuzija spaja **lake** jezgre. Desno od željeza spajanje bi trošilo energiju, jer bi E/A pala.",
      };
    return {
      tocno: false,
      poruka:
        "Fisija cijepa **teške** jezgre. Lake jezgre cijepanjem gube na E/A, pa bi to trošilo energiju.",
    };
  }
  if (t.A === c.A && t.simbol === c.simbol) return { tocno: true };
  return {
    tocno: false,
    poruka: `To je ${kratkiZapis(t.Z, t.A)}. Traži jezgru s masenim brojem ${c.A} na vodoravnoj osi.`,
  };
}

function validateKrivulja(s, need) {
  if (s.nacin === "odaberi") {
    const c = s.cilj;
    if (typeof c === "string")
      need(
        CILJEVI_KRIVULJE.includes(c),
        `cilj mora biti ${CILJEVI_KRIVULJE.join(", ")} ili {simbol, A}`,
      );
    else
      need(
        c && KRIVULJA_EA.some((t) => t.simbol === c.simbol && t.A === c.A),
        `cilj {simbol, A} mora biti jezgra s krivulje: ${KRIVULJA_EA.map((t) => kratkiZapis(t.Z, t.A)).join(", ")}`,
      );
  }
  if (s.nacin === "prikaz" && s.oznaci != null) {
    if (
      need(
        Array.isArray(s.oznaci) && s.oznaci.length >= 1 && s.oznaci.length <= 4,
        "oznaci mora biti popis od 1 do 4 jezgre {simbol, A}",
      )
    )
      s.oznaci.forEach((o, i) =>
        need(
          KRIVULJA_EA.some((t) => t.simbol === o?.simbol && t.A === o?.A),
          `oznaci[${i}] nije jezgra s krivulje`,
        ),
      );
  }
  if (s.nacin !== "prikaz")
    need(s.oznaci == null, "oznaci postoji samo u prikazu");
}

// ══ OPIS I PRIMJERI ═══════════════════════════════════════════════════════════════════════════════
const OPIS = `Atomska jezgra (fizika, matura, Blok Q). tekst, scena, nacin. Jezgra se zadaje kao {simbol, A} (Z iz periodnog sustava u kodu). Čestice: ${CESTICE_IDS.join(", ")} (alfa = ⁴₂He, e- = ⁰₋₁e, e+ = ⁰₊₁e).
Scene i načini (istrazi i prikaz su za gledanje, ostali traže odgovor; točan odgovor i tipične greške računa kod):
- "sastav": atom od kuglica (protoni crveni, neutroni sivi) i elektronski omotač, zapis ᴬ_Z X, ime elementa i naboj.
  · "istrazi": pocetak?: {p, n, e} (zadano 6/6/6), izotopi?: [{simbol, A}] (gumbi koji slože taj neutralni atom). Učenik dodaje/miče p, n, e (±1, ±10 ili upis).
  · "prikaz": atom: {simbol, A, naboj?}, izotopi?.
  · "slozi" (Tvoj red): ciljevi: [{simbol, A, naboj? (zadano 0), mijenja? (samo drugi cilj: popis od "p","n","e" koji se mijenjaju, ostalo se prepiše iz prvog), tekst?}] (1–2). Do točnog odgovora nema simbola, imena, A ni naboja (simbol_uzivo?: true ih uključi, bez naboja). Odgovor [{p, n, e}, …]. Poruke: p = A, p = A drugog izotopa, krivi element, N = A, N = A + Z, N drugog izotopa, neutralni atom ≠ ion.
- "reakcija": jednadžba lijevo → desno; članovi {simbol, A, broj?} | {cestica, broj?} | {nepoznato: true}; broj = koeficijent 2–4. Ispod su vage zbrojeva A i Z.
  · "istrazi": najviše jedan nepoznati član: učenik u njega stavlja čestice iz palete i gleda vage (X se odmah uračunava).
  · "prikaz": uravnotežena reakcija s animacijom (sudar, bljesak, produkti).
  · "dovrsi" (Tvoj red): točno jedan nepoznati član; učenik bira iz palete (p, n, e⁻, e⁺, α, γ ili jezgra s A i Z). Vage do provjere ne uračunavaju X. bez_z?: true sakrije redne brojeve poznatih članova (učenik ih traži u periodnom sustavu). krivo?: [{odabir: {cestica} | {A, Z}, poruka}]. Poruke same: A dobar a Z ne, Z dobar a A ne, obrnut naboj (e⁻/e⁺), zaboravljen koeficijent, nepostojeća jezgra.
- "karta": karta nuklida (vodoravno N, okomito Z) i pozornica s jezgrom; α odnese 2 p + 2 n, pri β⁻ neutron pocrveni u proton i izleti e⁻, γ samo bljesne. pobudjena: true na jezgri = jezgra* (γ ide samo iz pobuđene). sjeme? (raspored kuglica).
  · "istrazi": pocetak; gumbi α, β⁻, β⁺, γ i „Vrati“.
  · "prikaz": pocetak, niz (1–16 raspada), gumb „Pokreni niz“.
  · "raspad" (Tvoj red): pocetak, niz (1–4 od ${RASPADI.join(", ")}; γ prvi samo uz pocetak.pobudjena). Učenik dodirne polje jezgre nakon svakog raspada; strelice i zapis nastalih jezgara tek nakon točnog. Odgovor [{Z, N}, …]. Poruke: α kao A − 4/N − 4, obrnut predznak, β⁻ kao Z − 1, β⁻ mijenja A, γ pomiče jezgru, raspad primijenjen na početnu jezgru, zamijenjen redoslijed.
  · "koji_raspad" (Tvoj red): pocetak, kraj; učenik bira α / β⁻ / β⁺ / γ.
- "vezanje": vaga (Z protona + N neutrona naspram jezgre), defekt mase i lanac Δm (u) → kg → J → eV → MeV → MeV po nukleonu. jezgra: {simbol, A, m (masa jezgre u u)}, m_p? (1,00728), m_n? (1,00866); 1 u = 1,66·10⁻²⁷ kg, c = 3·10⁸ m/s, 1 eV = 1,6·10⁻¹⁹ J (kao rješenja; ne 931,5 MeV/u).
  · "istrazi": jezgra? i izbor iz ugrađenih jezgara (²H, ³H, ⁴He, ⁷Li, ¹²C, ¹⁶O, ⁵⁶Fe, ²³⁵U).
  · "prikaz": jezgra; lanac se otkriva korak po korak.
  · "izracunaj" (Tvoj red): pitaj: [{velicina: ${Object.keys(VELICINE_VEZANJA)
    .map((k) => `"${k}" (${VELICINE_VEZANJA[k].jedinica})`)
    .join(
      ", ",
    )}, tolerancija? (apsolutna, zadano 1 %), krivo?}] (1–3), lanac? (zadano true: kućice lanca s „?“ do točnog). ${KRIVO_OPIS}. Krive vrijednosti same: zbrojene mase, A · m_p, zamijenjeni Z i N, masa vodika 1,00783 u, Δm u u bez pretvorbe u kg, c bez kvadrata, J/eV/keV umjesto MeV, množenje s 1,6·10⁻¹⁹, E/Z, E/N, E · A, E bez dijeljenja.
- "krivulja": energija vezanja po nukleonu E/A (A) iz stvarnih podataka (²H … ²³⁸U, vrh ⁵⁶Fe, šiljak ⁴He), strelice fuzije i fisije.
  · "istrazi": učenik vuče točku po krivulji (ime i E/A uživo).
  · "prikaz": oznaci?: [{simbol, A}] istaknute jezgre.
  · "odaberi" (Tvoj red): cilj: "najstabilnija" | "fuzija" (lake jezgre, A ≤ 40) | "fisija" (teške, A ≥ 100) | {simbol, A}. Strelice i natpisi skriveni do točnog; za cilj {simbol, A} ni ime ni A uživo. Odgovor {A, Z}.`;

const PRIMJER = {
  tip: TIP,
  scena: "karta",
  nacin: "raspad",
  pocetak: { simbol: "Th", A: 232 },
  niz: ["alfa", "beta-"],
  tekst:
    "Torij-232 raspada se najprije **α-raspadom**, a nastala jezgra zatim **β⁻-raspadom**. Dodirni na karti jezgru koja nastaje nakon svakog raspada.",
};

const PRIMJERI = [
  // 1251 a
  {
    tip: TIP,
    scena: "sastav",
    nacin: "slozi",
    tekst:
      "Složi neutralni atom **joda-131**: namjesti broj protona, neutrona i elektrona. Redni broj potraži u periodnom sustavu (knjižica, str. 6).",
    ciljevi: [
      { simbol: "I", A: 131 },
      {
        simbol: "I",
        A: 127,
        mijenja: ["n"],
        tekst: "A sad običan **jod-127**: koliko mu treba neutrona?",
      },
    ],
  },
  {
    tip: TIP,
    scena: "sastav",
    nacin: "istrazi",
    tekst:
      "Dodaj ili makni protone i neutrone. Što se dogodi s elementom kad promijeniš broj **protona**, a što kad promijeniš broj **neutrona**?",
    pocetak: { p: 53, n: 78, e: 53 },
    izotopi: [
      { simbol: "I", A: 127 },
      { simbol: "I", A: 131 },
      { simbol: "Xe", A: 131 },
    ],
  },
  {
    tip: TIP,
    scena: "sastav",
    nacin: "prikaz",
    tekst:
      "Kobalt-60 i kobalt-59 su **izotopi**: isti broj protona (27), drukčiji broj neutrona.",
    atom: { simbol: "Co", A: 60 },
    izotopi: [
      { simbol: "Co", A: 59 },
      { simbol: "Co", A: 60 },
    ],
  },
  // 1251 b
  {
    tip: TIP,
    scena: "reakcija",
    nacin: "dovrsi",
    tekst:
      "Koja čestica **X** nastaje? Odaberi je tako da zbroj masenih i zbroj rednih brojeva bude isti s obje strane.",
    lijevo: [
      { simbol: "N", A: 14 },
      { simbol: "He", A: 4 },
    ],
    desno: [{ simbol: "O", A: 17 }, { nepoznato: true }],
  },
  // 1255 b
  {
    tip: TIP,
    scena: "reakcija",
    nacin: "dovrsi",
    tekst:
      "Pri fisiji urana odvija se ova reakcija. Kojom je česticom **X** pogođena jezgra urana?",
    lijevo: [{ nepoznato: true }, { simbol: "U", A: 235 }],
    desno: [
      { simbol: "Xe", A: 140 },
      { simbol: "Sr", A: 94 },
      { cestica: "n", broj: 2 },
    ],
  },
  {
    tip: TIP,
    scena: "reakcija",
    nacin: "istrazi",
    tekst:
      "Isprobaj čestice u praznom mjestu i gledaj vage: kad su **obje** u ravnoteži, reakcija je moguća.",
    lijevo: [{ simbol: "Li", A: 6 }, { cestica: "n" }],
    desno: [{ simbol: "H", A: 3 }, { nepoznato: true }],
  },
  {
    tip: TIP,
    scena: "reakcija",
    nacin: "prikaz",
    tekst:
      "**Fuzija**: deuterij i tricij spoje se u helij i izleti neutron. Zbrojevi A i Z isti su s obje strane.",
    lijevo: [
      { simbol: "H", A: 2 },
      { simbol: "H", A: 3 },
    ],
    desno: [{ simbol: "He", A: 4 }, { cestica: "n" }],
  },
  // 1263
  {
    tip: TIP,
    scena: "karta",
    nacin: "raspad",
    pocetak: { simbol: "Co", A: 60 },
    niz: ["beta-", "gama"],
    tekst:
      "Kobalt-60 raspada se najprije **β⁻-raspadom**, a nastala jezgra zatim **γ-raspadom**. Dodirni jezgru nakon svakog raspada.",
  },
  {
    tip: TIP,
    scena: "karta",
    nacin: "istrazi",
    pocetak: { simbol: "U", A: 238 },
    tekst:
      "Raspadaj uran-238 gumbima i prati kamo se jezgra pomiče po karti pri α, β⁻ i γ.",
  },
  {
    tip: TIP,
    scena: "karta",
    nacin: "prikaz",
    pocetak: { simbol: "Ra", A: 226 },
    niz: ["alfa", "alfa"],
    tekst:
      "Radij-226 raspada se dvaput zaredom α-raspadom: svaki put jezgra skoči 2 polja dolje i 2 lijevo.",
  },
  {
    tip: TIP,
    scena: "karta",
    nacin: "koji_raspad",
    pocetak: { simbol: "Bi", A: 214 },
    kraj: { simbol: "Po", A: 214 },
    tekst: "Bizmut-214 pretvorio se u polonij-214. Kojim raspadom?",
  },
  // 1256 a
  {
    tip: TIP,
    scena: "vezanje",
    nacin: "izracunaj",
    jezgra: { simbol: "He", A: 4, m: 4.00151 },
    pitaj: [{ velicina: "dm" }, { velicina: "E" }, { velicina: "E_A" }],
    tekst:
      "Masa protona je 1,00728 u, masa neutrona 1,00866 u, a masa jezgre ⁴He je 4,00151 u. Koliki je **defekt mase**, kolika je **energija vezanja** u MeV i kolika je energija vezanja **po nukleonu**?",
  },
  {
    tip: TIP,
    scena: "vezanje",
    nacin: "prikaz",
    jezgra: { simbol: "Fe", A: 56, m: 55.92067 },
    tekst:
      "Jezgra željeza-56 lakša je od svojih 26 protona i 30 neutrona. Prati kako se taj **defekt mase** pretvara u energiju vezanja.",
  },
  {
    tip: TIP,
    scena: "vezanje",
    nacin: "istrazi",
    tekst:
      "Odaberi jezgru i usporedi energiju vezanja **po nukleonu**: koja jezgra je najčvršće povezana?",
  },
  // 1256 b
  {
    tip: TIP,
    scena: "krivulja",
    nacin: "odaberi",
    cilj: "fuzija",
    tekst:
      "Dodirni na krivulji jezgru koja **fuzijom** (spajanjem) može osloboditi energiju.",
  },
  {
    tip: TIP,
    scena: "krivulja",
    nacin: "istrazi",
    tekst:
      "Povuci točku po krivulji. Gdje je energija vezanja po nukleonu **najveća**? Zašto i spajanje lakih i cijepanje teških jezgara oslobađa energiju?",
  },
  {
    tip: TIP,
    scena: "krivulja",
    nacin: "odaberi",
    cilj: "najstabilnija",
    tekst: "Dodirni na krivulji **najstabilniju** jezgru.",
  },
  {
    tip: TIP,
    scena: "krivulja",
    nacin: "prikaz",
    oznaci: [
      { simbol: "He", A: 4 },
      { simbol: "U", A: 235 },
    ],
    tekst:
      "Helij-4 i uran-235 na krivulji energije vezanja: obje strane „penju se“ prema željezu.",
  },
];

// ══ WIDGET ════════════════════════════════════════════════════════════════════════════════════════
export const jezgra = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (GLEDANJE.includes(s.nacin) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  validate(s) {
    const { list: l, need } = problems();
    need(isText(s.tekst), "jezgra treba „tekst“");
    if (
      !need(
        SCENE.includes(s.scena),
        `jezgra.scena mora biti jedna od: ${SCENE.join(", ")}`,
      )
    )
      return l;
    if (
      !need(
        NACINI[s.scena].includes(s.nacin),
        `scena ${s.scena}: nacin mora biti jedan od: ${NACINI[s.scena].join(", ")}`,
      )
    )
      return l;
    const polja = {
      sastav: ["pocetak", "izotopi", "atom", "ciljevi", "simbol_uzivo"],
      reakcija: ["lijevo", "desno", "bez_z", "krivo"],
      karta: ["pocetak", "niz", "kraj", "sjeme"],
      vezanje: ["jezgra", "m_p", "m_n", "pitaj", "lanac"],
      krivulja: ["cilj", "oznaci"],
    };
    const sva = [...new Set(Object.values(polja).flat())];
    for (const f of sva)
      need(
        !(f in s) || polja[s.scena].includes(f),
        `polje „${f}“ ne postoji u sceni ${s.scena} (polja scene: ${polja[s.scena].join(", ")})`,
      );
    if (l.length) return l;
    if (s.scena === "sastav") validateSastav(s, need);
    if (s.scena === "reakcija") validateReakcija(s, need);
    if (s.scena === "karta") validateKarta(s, need);
    if (s.scena === "vezanje") validateVezanje(s, need);
    if (s.scena === "krivulja") validateKrivulja(s, need);
    if (GLEDANJE.includes(s.nacin)) noAnswerFields(s, need);
    if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
    return l;
  },
  check(s, odgovor) {
    if (s.nacin === "slozi") return checkSlozi(s, odgovor);
    if (s.nacin === "dovrsi") return checkDovrsi(s, odgovor);
    if (s.nacin === "raspad") return checkRaspad(s, odgovor);
    if (s.nacin === "koji_raspad") return checkKojiRaspad(s, odgovor);
    if (s.nacin === "izracunaj") return checkIzracunaj(s, odgovor);
    if (s.nacin === "odaberi") return checkOdaberi(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },
  tocanOdgovor(s) {
    if (s.nacin === "slozi")
      return s.ciljevi
        .map((c, i) => {
          const t = sastavCilja(c);
          const sve = `${t.p} protona, ${t.n} neutrona, ${t.e} elektrona`;
          if (i === 0) return `${tekstJezgre(t.p, c.A)}: ${sve}`;
          const m = mijenjaCilj(c, i);
          return `${tekstJezgre(t.p, c.A)}: ${m.length === 1 && m[0] === "n" ? `${t.n} neutrona` : sve}`;
        })
        .join("; ");
    if (s.nacin === "dovrsi") {
      const r = rjesenjeReakcije(s);
      const x = nazivAZ(r.A, r.Z);
      return `X = ${tekstZapisa(x.zapis)} (${x.ime})`;
    }
    if (s.nacin === "raspad")
      return putRaspada(s.pocetak, s.niz)
        .slice(1)
        .map((j, i) => `${i + 1}. ${tekstJezgre(j.Z, j.A, j.pob)}`)
        .join(", ");
    if (s.nacin === "koji_raspad")
      return RASPAD_IME[vrstaRaspada(jezgraIz(s.pocetak), jezgraIz(s.kraj))];
    if (s.nacin === "izracunaj") {
      const r = racunVezanja(s);
      return s.pitaj
        .map(
          (q) =>
            `${VELICINE_VEZANJA[q.velicina].oznaka} = ${zapisVrijednosti(q.velicina, r[q.velicina])} ${VELICINE_VEZANJA[q.velicina].jedinica}`,
        )
        .join("; ");
    }
    if (s.nacin === "odaberi") {
      if (s.cilj === "najstabilnija")
        return `${kratkiZapis(VRH_KRIVULJE.Z, VRH_KRIVULJE.A)} (vrh krivulje)`;
      if (s.cilj === "fuzija")
        return "bilo koja laka jezgra (lijevi dio krivulje, A ≤ 40)";
      if (s.cilj === "fisija")
        return "bilo koja teška jezgra (desni dio krivulje, A ≥ 100)";
      return kratkiZapis(zIzSimbola(s.cilj.simbol), s.cilj.A);
    }
    return "";
  },
};
