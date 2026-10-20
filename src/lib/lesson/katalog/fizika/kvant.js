// kvant: svjetlost je čestica, čestica je val (Blok Q). Scene: foton (laser s klizačem λ, fotoni kao jednaki paketi
// energije), elektronvolt (elektron kroz napon U dobije U eV), fotoefekt (fotoćelija s izlaznim radom, zaustavnim
// naponom i ampermetrom) i de_broglie (λ = h/p uz kristal s atomima na 0,1 nm). Načini: istrazi, prikaz (gledanje),
// izracunaj, postavi i predvidi (s provjerom). Fizika, geometrija i „što je skriveno“ su čiste funkcije ovdje i u
// _kvant.js; komponenta samo crta.
import { isNum, formatNumber } from "../../core/number.js";
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
  validateKrivo,
  checkNumber,
} from "../zajednicko.js";
import {
  H,
  C,
  E0,
  M_E,
  M_P,
  SCENE,
  fmt,
  sci,
  iznos,
  bojaFotona,
  cesticaDB,
  izlazniRad,
  pocetnoStanje,
  vrijednostiKlizaca,
  fizika,
} from "./_kvant.js";

const TIP = "kvant";
export const NACINI = {
  foton: ["istrazi", "izracunaj", "postavi"],
  elektronvolt: ["istrazi", "prikaz"],
  fotoefekt: ["istrazi", "izracunaj", "postavi", "predvidi"],
  de_broglie: ["istrazi", "izracunaj", "postavi"],
};
const GLEDANJE = ["istrazi", "prikaz"];
export const PRIKAZI = ["bilanca", "struja", "brojke"];

// ── klizači ───────────────────────────────────────────────────────────────────────────────────────
export const KLIZACI = {
  foton: ["lambda", "jakost"],
  elektronvolt: ["U"],
  fotoefekt: ["lambda", "jakost", "U"],
  de_broglie: ["v"],
};
const GRANICE = {
  lambda: { min: 100, max: 1000, opis: "valna duljina u nm" },
  jakost: { min: 0, max: 100, opis: "jakost u %" },
  U: { min: 0, max: 10, opis: "napon u V" },
  v: { min: 1e3, max: 3e7, opis: "brzina u m/s (do 0,1c: nerelativistički)" },
};
export function metaKlizaca(s, id) {
  if (id === "lambda")
    return { oznaka: "valna duljina λ", kratko: "λ", jedinica: "nm" };
  if (id === "jakost")
    return {
      oznaka: "jakost svjetlosti (fotona u sekundi)",
      kratko: "jakost",
      jedinica: "%",
    };
  if (id === "U")
    return s.scena === "fotoefekt"
      ? { oznaka: "zaustavni napon U", kratko: "U", jedinica: "V" }
      : { oznaka: "napon između ploča U", kratko: "U", jedinica: "V" };
  return { oznaka: "brzina čestice v", kratko: "v", jedinica: "m/s" };
}
export const klizaciOd = (s) => (Array.isArray(s.klizaci) ? s.klizaci : []);
export const tekstKlizaca = (s, id, x) => iznos(x, metaKlizaca(s, id).jedinica);

// ── veličine za izracunaj ─────────────────────────────────────────────────────────────────────────
export const VELICINE = {
  foton: {
    E: { naziv: "energija jednog fotona", oznaka: "E_f", jed: ["J", "eV"] },
    f: { naziv: "frekvencija svjetlosti", oznaka: "f", jed: ["Hz"] },
    lambda: {
      naziv: "valna duljina svjetlosti",
      oznaka: "λ",
      jed: ["nm", "m"],
    },
  },
  fotoefekt: {
    E_f: { naziv: "energija fotona", oznaka: "E_f", jed: ["eV", "J"] },
    Ek: {
      naziv: "najveća kinetička energija izbačenih elektrona",
      oznaka: "E_k",
      jed: ["eV", "J"],
    },
    W_i: { naziv: "izlazni rad metala", oznaka: "W_i", jed: ["eV", "J"] },
    lambda0: {
      naziv: "granična (najveća) valna duljina",
      oznaka: "λ₀",
      jed: ["nm", "m"],
    },
    f0: { naziv: "granična frekvencija", oznaka: "f₀", jed: ["Hz"] },
    U_z: { naziv: "zaustavni napon", oznaka: "U_z", jed: ["V"] },
  },
  de_broglie: {
    p: { naziv: "količina gibanja", oznaka: "p", jed: ["kg m/s"] },
    lambda: {
      naziv: "de Broglieva valna duljina",
      oznaka: "λ",
      jed: ["m", "nm"],
    },
    v: { naziv: "brzina čestice", oznaka: "v", jed: ["m/s"] },
  },
};
// gumb ·10ⁿ uz polje: odlučuje jedinica (veličine koje su po prirodi jako velike ili male), nikad iznos odgovora
export const JEDINICE_S_POTENCIJOM = ["J", "Hz", "m", "kg m/s", "m/s"];
export const trebaPotenciju = (jedinica) =>
  JEDINICE_S_POTENCIJOM.includes(jedinica);
export const pitanja = (s) => (Array.isArray(s.pitaj) ? s.pitaj : []);
export const jedinicaPolja = (s, q) =>
  q.jedinica ?? VELICINE[s.scena][q.velicina].jed[0];
const UZ = { J: 1, eV: E0, m: 1, nm: 1e-9 };
const izSI = (x, J) => x / (UZ[J] ?? 1);

const PORUKE = {
  nm: (nm, lam) =>
    `Valnu duljinu pretvori u metre: ${fmt(nm)} nm = ${sci(lam)} m (n = 10⁻⁹).`,
  uJ: "To je iznos u eV, a traži se u džulima: pomnoži s 1,6·10⁻¹⁹ (1 eV = 1,6·10⁻¹⁹ J).",
  ueV: "To je iznos u džulima. U elektronvolte: podijeli s 1,6·10⁻¹⁹ (1 eV = 1,6·10⁻¹⁹ J).",
  puta: "Džule u elektronvolte pretvaraš **dijeljenjem** s 1,6·10⁻¹⁹, a ne množenjem (eV je sićušan, pa ih ima puno).",
  dijeli:
    "Elektronvolte u džule pretvaraš **množenjem** s 1,6·10⁻¹⁹, a ne dijeljenjem.",
  um: (nm) =>
    `To je u nanometrima. U metrima: ${fmt(nm)} nm = ${sci(nm * 1e-9)} m.`,
  unm: (m) =>
    `To je u metrima, a traži se u nm: ${sci(m)} m = ${fmt(m / 1e-9)} nm.`,
};

// Točan iznos (u jedinici polja) i tipične krive vrijednosti, sve iz speca.
export function izracun(s, q) {
  const J = jedinicaPolja(s, q);
  const m = VELICINE[s.scena][q.velicina];
  const f = fizika(s);
  const krivo = [];
  // vrijednost u SI s porukom → u jedinici polja
  const si = (x, poruka) => krivo.push({ vrijednost: izSI(x, J), poruka });
  const sirovo = (x, poruka) => krivo.push({ vrijednost: x, poruka });
  // zamjene jedinica za energiju i duljinu (x u SI)
  const energijaJed = (x) => {
    if (J === "J") {
      sirovo(x / E0, PORUKE.uJ);
      sirovo(x / E0 / E0, PORUKE.dijeli);
    } else {
      sirovo(x, PORUKE.ueV);
      sirovo(x * E0, PORUKE.puta);
    }
  };
  const duljinaJed = (x) => {
    if (J === "nm") sirovo(x, PORUKE.unm(x));
    else sirovo(x / 1e-9, PORUKE.um(x / 1e-9));
  };
  let x; // SI

  if (s.scena === "foton") {
    const zadanE = !isNum(s.lambda);
    const nm = f.lambdaNm;
    const lam = f.lam;
    if (q.velicina === "E") {
      x = f.EJ;
      if (zadanE) {
        // E zadan u eV: traži se u J (ili eV, ali to validate ne dopušta)
        energijaJed(x);
      } else {
        si((H * C) / nm, PORUKE.nm(nm, lam));
        si(
          (H * lam) / C,
          "U formuli E = hc/λ brzina svjetlosti c je u brojniku, a λ u nazivniku.",
        );
        si(
          H * lam,
          "E = h·f, a frekvencija je f = c/λ, pa je E = h·c/λ (ne h·λ).",
        );
        si(H / lam, "Zaboravio si brzinu svjetlosti: E = h·f = h·c/λ.");
        sirovo(f.f, "To je frekvencija f = c/λ. Energija fotona je E = h·f.");
        energijaJed(x);
      }
    } else if (q.velicina === "f") {
      x = f.f;
      if (zadanE) {
        sirovo(
          s.E / H,
          "Energiju najprije pretvori u džule (·1,6·10⁻¹⁹), pa f = E/h.",
        );
        sirovo(H / (s.E * E0), "Iz E = h·f slijedi f = E/h (a ne h/E).");
      } else {
        sirovo(C / nm, PORUKE.nm(nm, lam));
        sirovo(lam / C, "Iz c = λ·f slijedi f = c/λ (a ne λ/c).");
        sirovo(f.EJ, "To je energija fotona. Frekvencija je f = c/λ.");
      }
    } else if (q.velicina === "lambda") {
      x = lam;
      si(
        (H * C) / s.E,
        "Energiju najprije pretvori u džule: pomnoži eV s 1,6·10⁻¹⁹.",
      );
      si(
        (s.E * E0) / (H * C),
        "Iz E = hc/λ slijedi λ = hc/E (preokrenuo si razlomak).",
      );
      duljinaJed(x);
    }
    return gotovo(s, q, izSI(x, J), J, m, krivo);
  }

  if (s.scena === "fotoefekt") {
    const nm = f.lambdaNm;
    const lam = f.lam;
    const Ef = f.Ef;
    const W = f.W;
    const Ek = f.Ek;
    const zadanUz = isNum(s.U_z);
    if (q.velicina === "E_f") {
      x = f.EfJ;
      si((H * C) / nm, PORUKE.nm(nm, lam));
      si(
        (H * lam) / C,
        "U formuli E = hc/λ brzina svjetlosti c je u brojniku, a λ u nazivniku.",
      );
      si(H * lam, "E = h·f, a f = c/λ, pa je E = h·c/λ.");
      energijaJed(x);
    } else if (q.velicina === "Ek") {
      x = Ek * E0;
      if (zadanUz) {
        si(
          Ef * E0,
          "To je energija fotona. Najveću E_k elektrona daje zaustavni napon: 1 V oduzme 1 eV.",
        );
        si(
          W * E0,
          `To je izlazni rad. E_k doznaješ iz zaustavnog napona: U_z = ${fmt(s.U_z)} V ⇒ E_k = ${fmt(s.U_z)} eV.`,
        );
      } else {
        si(
          (Ef + W) * E0,
          "Iz E_f = W_i + E_k slijedi E_k = E_f − W_i (oduzmi, ne zbroji).",
        );
        si(
          Ef * E0,
          "To je energija fotona. Dio nje elektron potroši na izlazak (W_i): E_k = E_f − W_i.",
        );
        si(W * E0, "To je izlazni rad. Elektronu ostane E_k = E_f − W_i.");
      }
      if (J === "eV" && zadanUz)
        sirovo(
          s.U_z / E0,
          "Napon u voltima i E_k u elektronvoltima imaju isti broj (1 V oduzme 1 eV); ne dijeli s e.",
        );
      if (J === "J" && zadanUz)
        sirovo(
          s.U_z / E0,
          "E_k = e·U_z: naboj elektrona pomnoži s naponom, ne dijeli.",
        );
      energijaJed(x);
    } else if (q.velicina === "W_i") {
      x = W * E0;
      si(
        (Ef + Ek) * E0,
        "Iz E_f = W_i + E_k slijedi W_i = E_f − E_k (oduzmi, ne zbroji).",
      );
      si(
        Ek * E0,
        "To je kinetička energija elektrona. Izlazni rad je ostatak: W_i = E_f − E_k.",
      );
      si(Ef * E0, "To je energija fotona. Izlazni rad je W_i = E_f − E_k.");
      si(((H * C) / (nm * E0) - Ek) * E0, PORUKE.nm(nm, lam));
      energijaJed(x);
    } else if (q.velicina === "lambda0") {
      x = (H * C) / (W * E0);
      if (Ek > 0)
        si(
          (H * C) / (Ek * E0),
          "To je s E_k. Na granici foton ima točno izlazni rad (E_k = 0): λ₀ = hc/W_i.",
        );
      si(
        (H * C) / W,
        "Izlazni rad najprije pretvori u džule: W_i · 1,6·10⁻¹⁹.",
      );
      si(
        lam,
        "To je valna duljina kojom obasjavamo pločicu. Granična je ona pri kojoj je E_f = W_i.",
      );
      si(
        (H * C) / ((Ef + Ek) * E0),
        "Na granici je E_k = 0, pa je E_f = W_i i λ₀ = hc/W_i.",
      );
      si(
        (W * E0) / (H * C),
        "Iz hc/λ₀ = W_i slijedi λ₀ = hc/W_i (preokrenuo si razlomak).",
      );
      duljinaJed(x);
    } else if (q.velicina === "f0") {
      x = (W * E0) / H;
      sirovo(
        W / H,
        "Izlazni rad najprije pretvori u džule: W_i · 1,6·10⁻¹⁹, pa f₀ = W_i/h.",
      );
      sirovo(
        f.f,
        "To je frekvencija zadanog zračenja. Granična je ona pri kojoj je h·f₀ = W_i.",
      );
      if (Ek > 0)
        sirovo(
          (Ek * E0) / H,
          "To je s E_k. Na granici foton ima točno izlazni rad: f₀ = W_i/h.",
        );
      sirovo(H / (W * E0), "Iz h·f₀ = W_i slijedi f₀ = W_i/h.");
    } else if (q.velicina === "U_z") {
      x = Ek;
      sirovo(
        Ek * E0,
        "To je E_k u džulima. Napon u voltima ima isti broj kao E_k u eV (1 V oduzme 1 eV).",
      );
      sirovo(
        Ek / E0,
        "E_k je već u eV: U_z ima isti broj (e·U_z = E_k). Ne dijeli ponovno s e.",
      );
      sirovo(
        Ef,
        "To je energija fotona u eV. Zaustavni napon zaustavlja elektrone, pa ovisi o E_k = E_f − W_i.",
      );
      sirovo(
        Ef + W,
        "E_k = E_f − W_i (oduzmi), a U_z ima isti broj kao E_k u eV.",
      );
    }
    return gotovo(
      s,
      q,
      q.velicina === "f0" || q.velicina === "U_z" ? x : izSI(x, J),
      J,
      m,
      krivo,
    );
  }

  // de Broglie
  const c = cesticaDB(s);
  const v = f.v;
  const mant = v / 10 ** Math.floor(Math.log10(v));
  const druga =
    c.id === "elektron"
      ? ["masom protona", M_P]
      : c.id === "proton"
        ? ["masom elektrona", M_E]
        : null;
  if (q.velicina === "p") {
    x = f.p;
    if (druga)
      sirovo(
        druga[1] * v,
        `To je račun s ${druga[0]}. Za ${c.ime} je m = ${sci(c.m)} kg.`,
      );
    if (mant !== v)
      sirovo(c.m * mant, `Brzina je ${sci(v)} m/s: ne zaboravi potenciju 10ⁿ.`);
    sirovo(
      0.5 * c.m * v * v,
      "To je kinetička energija ½mv². Količina gibanja je p = m·v.",
    );
    sirovo(c.m / v, "p = m·v (pomnoži, ne dijeli).");
  } else if (q.velicina === "lambda") {
    x = f.lam;
    if (druga)
      si(
        H / (druga[1] * v),
        `To je račun s ${druga[0]}. Za ${c.ime} je m = ${sci(c.m)} kg.`,
      );
    if (mant !== v)
      si(
        H / (c.m * mant),
        `Brzina je ${sci(v)} m/s: ne zaboravi potenciju 10ⁿ.`,
      );
    si(
      H * c.m * v,
      "λ = h/p: Planckovu konstantu **podijeli** s količinom gibanja p = m·v.",
    );
    si(H / c.m, "Zaboravio si brzinu: p = m·v, pa je λ = h/(m·v).");
    si(H / v, "Zaboravio si masu: p = m·v, pa je λ = h/(m·v).");
    si((c.m * v) / H, "Iz λ = h/p, a ne p/h (preokrenuo si razlomak).");
    duljinaJed(x);
  } else if (q.velicina === "v") {
    x = v;
    sirovo(H / (c.m * s.lambda), PORUKE.nm(s.lambda, s.lambda * 1e-9));
    if (druga)
      sirovo(
        H / (druga[1] * s.lambda * 1e-9),
        `To je račun s ${druga[0]}. Za ${c.ime} je m = ${sci(c.m)} kg.`,
      );
    sirovo((c.m * s.lambda * 1e-9) / H, "Iz λ = h/(m·v) slijedi v = h/(m·λ).");
  }
  return gotovo(s, q, q.velicina === "lambda" ? izSI(x, J) : x, J, m, krivo);
}
function gotovo(s, q, vrijednost, J, m, krivo) {
  const tol = Math.abs(vrijednost) * 0.01;
  const filt = [];
  for (const k of krivo) {
    if (!Number.isFinite(k.vrijednost) || k.vrijednost <= 0) continue;
    if (Math.abs(k.vrijednost - vrijednost) <= Math.abs(vrijednost) * 0.02)
      continue;
    if (
      filt.some(
        (o) =>
          Math.abs(o.vrijednost - k.vrijednost) <=
          Math.abs(k.vrijednost) * 0.01,
      )
    )
      continue;
    filt.push({ ...k, tolerancija: Math.abs(k.vrijednost) * 0.01 });
  }
  return {
    vrijednost,
    jedinica: J,
    oznaka: m.oznaka,
    naziv: m.naziv,
    tol,
    krivo: [...(q.krivo ?? []), ...filt],
  };
}
export function checkPolje(s, i, input) {
  const q = pitanja(s)[i];
  const r = izracun(s, q);
  return checkNumber({
    input,
    answer: r.vrijednost,
    tol: r.tol,
    unit: r.jedinica,
    krivo: r.krivo,
    savjet: q.savjet ?? s.savjet,
  });
}
// zapis točnog iznosa za polje (pokaži odgovor)
export const zapisPolja = (x) =>
  Math.abs(x) < 1e-3 || Math.abs(x) >= 1e5 ? sci(x) : fmt(x);

// ── postavi ───────────────────────────────────────────────────────────────────────────────────────
// mjera: {q: trenutna vrijednost, cilj, tol, jed, oznaka}
export function mjeraPostavi(s, st) {
  const f = fizika(s, st);
  const c = s.cilj;
  if (s.scena === "foton") {
    const J = c.jedinica ?? "eV";
    return {
      q: J === "J" ? f.EJ : f.EeV,
      cilj: c.vrijednost,
      tol: c.vrijednost * 0.01,
      jed: J,
      oznaka: "E_f",
    };
  }
  if (s.scena === "de_broglie")
    return {
      q: f.lamNm,
      cilj: c.vrijednost,
      tol: c.vrijednost * 0.01,
      jed: "nm",
      oznaka: "λ",
    };
  if (c === "granicna")
    return {
      q: f.lambdaNm,
      cilj: f.lambda0Nm,
      tol: f.lambda0Nm * 0.01,
      jed: "nm",
      oznaka: "λ",
    };
  if (c === "zaustavni") {
    const Uz = fizika(s, { ...st, U: 0 }).Ek;
    return {
      q: st.U,
      cilj: Uz,
      tol: Math.max(0.01, Uz * 0.01),
      jed: "V",
      oznaka: "U",
    };
  }
  return {
    q: f.Ek,
    cilj: c.vrijednost,
    tol: c.vrijednost * 0.01,
    jed: "eV",
    oznaka: "E_k",
  };
}
export const pogadja = (s, st) => {
  const m = mjeraPostavi(s, st);
  return isNum(m.q) && Math.abs(m.q - m.cilj) <= m.tol + 1e-12;
};
export function najboljaVrijednost(s) {
  const k = klizaciOd(s)[0];
  const st0 = pocetnoStanje(s);
  let best = null;
  let bd = Infinity;
  for (const x of vrijednostiKlizaca(k)) {
    const m = mjeraPostavi(s, { ...st0, [k.id]: x });
    const d = Math.abs(m.q - m.cilj);
    if (d < bd) [best, bd] = [x, d];
  }
  return best;
}
function checkPostavi(s, odgovor) {
  const k = klizaciOd(s)[0];
  const x = isNum(odgovor) ? odgovor : odgovor?.[k.id];
  if (!isNum(x))
    return {
      tocno: false,
      poruka: "Pomakni klizač, pa klikni Provjeri.",
      prazno: true,
    };
  const st = { ...pocetnoStanje(s), [k.id]: x };
  if (pogadja(s, st)) return { tocno: true };
  const hit = (s.krivo ?? []).find(
    (c) => Math.abs(c.vrijednost - x) <= k.korak / 2,
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const f = fizika(s, st);
  const m = mjeraPostavi(s, st);
  const xt = tekstKlizaca(s, k.id, x);
  if (s.scena === "foton") {
    const vise = m.q < m.cilj;
    return {
      tocno: false,
      poruka: `Pri λ = ${xt} foton nosi ${iznos(m.q, m.jed)}, a treba ${iznos(m.cilj, m.jed)}. Što je valna duljina kraća, to foton nosi više energije (E = hc/λ). Zato ${vise ? "smanji" : "povećaj"} λ.`,
    };
  }
  if (s.scena === "de_broglie")
    return {
      tocno: false,
      poruka: `Pri v = ${xt} valna duljina je ${iznos(m.q, "nm")}, a treba ${iznos(m.cilj, "nm")}. Brža čestica ima veću količinu gibanja, pa kraću valnu duljinu (λ = h/(m·v)). Zato ${m.q > m.cilj ? "povećaj" : "smanji"} brzinu.`,
    };
  if (s.cilj === "granicna") {
    if (f.izlazi)
      return {
        tocno: false,
        poruka: `Pri ${xt} elektroni još izlaze s E_k = ${iznos(f.Ek, "eV")}: foton nosi više nego što treba za izlazak. Na granici elektronu ne ostane ništa (E_k = 0), a to je pri **duljoj** valnoj duljini. Povećaj λ.`,
      };
    return {
      tocno: false,
      poruka: `Pri ${xt} foton nosi samo ${iznos(f.Ef, "eV")}, premalo za izlazak: nijedan elektron ne izlazi, koliko god svjetlo bilo jako. Smanji λ (kraća valna duljina = jači foton).`,
    };
  }
  if (s.cilj === "zaustavni") {
    if (x < m.cilj)
      return {
        tocno: false,
        poruka: `Pri U = ${xt} najbrži elektroni još stignu do kolektora i ampermetar pokazuje struju. Povećaj napon dok struja upravo ne padne na nulu.`,
      };
    return {
      tocno: false,
      poruka: `Struja je nula, ali i svaki veći napon bi je zaustavio. Traži se **najmanji** napon pri kojem struja upravo padne na nulu: smanji napon.`,
    };
  }
  if (!f.izlazi)
    return {
      tocno: false,
      poruka: `Pri ${xt} foton nosi samo ${iznos(f.Ef, "eV")}, premalo za izlazak: nijedan elektron ne izlazi. Smanji λ.`,
    };
  return {
    tocno: false,
    poruka: `Pri ${xt} elektroni izlaze s E_k = ${iznos(f.Ek, "eV")}, a treba ${iznos(m.cilj, "eV")}. Kraća valna duljina daje jači foton, a izlazni rad ostaje isti, pa elektronu ostane više. Zato ${f.Ek < m.cilj ? "smanji" : "povećaj"} λ.`,
  };
}

// ── predvidi ──────────────────────────────────────────────────────────────────────────────────────
export const PROMJENE = [
  "jakost_gore",
  "jakost_dolje",
  "lambda_dolje",
  "lambda_gore",
  "lambda_iznad_granicne",
  "metal_W_gore",
  "metal_W_dolje",
];
export const PREDVIDI_PITAJ = ["Ek", "broj_elektrona", "U_z"];
export const IZBORI = [
  { id: "raste", tekst: "raste" },
  { id: "pada", tekst: "pada" },
  { id: "isto", tekst: "ostaje isto" },
  { id: "nema", tekst: "nema elektrona" },
];
export const NAZIV_PREDVIDI = {
  Ek: "najveća kinetička energija elektrona E_k",
  broj_elektrona: "broj izbačenih elektrona u sekundi (struja)",
  U_z: "zaustavni napon U_z",
};
// stanje nakon promjene i opis promjene
export function poPromjeni(s) {
  const st = pocetnoStanje(s);
  const f = fizika(s, st);
  const p = s.promjena;
  const nm = (x) => `${fmt(x)} nm`;
  if (p === "jakost_gore")
    return {
      stanje: { ...st, jakost: Math.min(100, st.jakost * 2) },
      opis: "Svjetlost iste valne duljine postane dvostruko jača.",
    };
  if (p === "jakost_dolje")
    return {
      stanje: { ...st, jakost: st.jakost / 2 },
      opis: "Svjetlost iste valne duljine postane dvostruko slabija.",
    };
  if (p === "lambda_dolje") {
    const l = Math.round(f.lambdaNm * 0.8);
    return {
      stanje: { ...st, lambda: l },
      opis: `Valnu duljinu smanjimo s ${nm(f.lambdaNm)} na ${nm(l)} (ista jakost).`,
    };
  }
  if (p === "lambda_gore") {
    const l = Math.round(f.lambdaNm + 0.5 * (f.lambda0Nm - f.lambdaNm));
    return {
      stanje: { ...st, lambda: l },
      opis: `Valnu duljinu povećamo s ${nm(f.lambdaNm)} na ${nm(l)} (ista jakost).`,
    };
  }
  if (p === "lambda_iznad_granicne") {
    const l = Math.round(f.lambda0Nm * 1.15);
    return {
      stanje: { ...st, lambda: l, jakost: Math.min(100, st.jakost * 2) },
      opis: `Pločicu obasjamo svjetlošću valne duljine ${nm(l)}, i to dvostruko jačom.`,
    };
  }
  if (p === "metal_W_gore") {
    const W = Number((f.W + 0.5).toFixed(2));
    return {
      stanje: { ...st, W },
      opis: `Pločicu zamijenimo metalom većeg izlaznog rada (${iznos(f.W, "eV")} → ${iznos(W, "eV")}), a svjetlost ostane ista.`,
    };
  }
  const W = Number((f.W - 0.5).toFixed(2));
  return {
    stanje: { ...st, W },
    opis: `Pločicu zamijenimo metalom manjeg izlaznog rada (${iznos(f.W, "eV")} → ${iznos(W, "eV")}), a svjetlost ostane ista.`,
  };
}
const usporedi = (a, b) =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a))
    ? "isto"
    : b > a
      ? "raste"
      : "pada";
export function ishodPredvidi(s) {
  const prije = fizika(s);
  const { stanje, opis } = poPromjeni(s);
  const poslije = fizika(s, stanje);
  const out = {};
  for (const k of PREDVIDI_PITAJ) {
    if (!poslije.izlazi) out[k] = "nema";
    else if (k === "broj_elektrona")
      out[k] = usporedi(prije.jakost, poslije.jakost);
    else out[k] = usporedi(prije.Ek, poslije.Ek);
  }
  return { tocno: out, opis, prije, poslije, stanje };
}
// jedna neutralna poruka s načelima: ne kaže koja je stavka kriva ni koji je odgovor točan (isti zadatak se
// ponovi nakon krivog odgovora, pa bi imenovanje stavke ili ishoda pretvorilo ponovni pokušaj u pogađanje)
function porukaPredvidi(s) {
  const pit = pitanja(s);
  const uz = pit.includes("U_z")
    ? " Zaustavni napon prati najveću kinetičku energiju: e·U_z = E_k."
    : "";
  return `${pit.length > 1 ? "Barem jedan odgovor nije točan." : "Odgovor nije točan."} Provjeri redom: izlaze li elektroni uopće (usporedi energiju **jednog** fotona E_f = hc/λ s izlaznim radom W_i; jakost tu ne pomaže), o čemu ovisi **broj** izbijenih elektrona u sekundi (koliko fotona u sekundi padne na pločicu), a o čemu njihova najveća **kinetička energija** (E_k = E_f − W_i: samo o energiji jednog fotona i o metalu).${uz}`;
}
function checkPredvidi(s, odgovor) {
  const pit = pitanja(s);
  const { tocno } = ishodPredvidi(s);
  const odg = odgovor ?? {};
  if (pit.some((k) => !IZBORI.some((i) => i.id === odg[k])))
    return {
      tocno: false,
      poruka:
        pit.length > 1
          ? "Odaberi odgovor za svaku veličinu."
          : "Odaberi odgovor.",
      prazno: true,
    };
  if (pit.some((k) => odg[k] !== tocno[k]))
    return { tocno: false, poruka: porukaPredvidi(s) };
  return { tocno: true };
}

// ── što se smije vidjeti ──────────────────────────────────────────────────────────────────────────
// otkriveno: točan odgovor ili „pokaži“; provjereno: učenik je provjerio trenutni položaj klizača (postavi).
// locked bez pokazi ne otkriva ništa.
export function vidljivo(s, otkriveno = false, provjereno = false) {
  const n = s.nacin;
  const trazi = new Set(
    pitanja(s).map((q) => (typeof q === "string" ? q : q.velicina)),
  );
  const pr = new Set(Array.isArray(s.prikazi) ? s.prikazi : PRIKAZI);
  const gled = GLEDANJE.includes(n);
  if (s.scena === "foton") {
    return {
      boja: !(n === "izracunaj" && trazi.has("lambda")) || otkriveno,
      energija: gled || otkriveno || (n === "postavi" && provjereno),
      mjerilo: gled || otkriveno || (n === "postavi" && provjereno),
    };
  }
  if (s.scena === "elektronvolt") return { energija: true };
  if (s.scena === "fotoefekt") {
    const skriveno =
      n === "postavi" && s.skrij !== "nista" && !otkriveno && !provjereno;
    return {
      boja: true,
      elektroni: !skriveno,
      struja: n === "istrazi" ? pr.has("struja") : !skriveno,
      bilanca:
        n === "istrazi"
          ? pr.has("bilanca")
          : n === "izracunaj"
            ? otkriveno
            : n === "predvidi"
              ? true
              : // postavi: stupci bi pokazali E_k (= U_z) ili W_i (iz kojeg je λ₀), pa tek nakon točnog
                s.skrij === "nista" || otkriveno,
      brojke: n === "istrazi" ? pr.has("brojke") : true,
      izvorPoznat: !(n === "izracunaj" && trazi.has("U_z")) || otkriveno,
    };
  }
  return { val: gled || otkriveno || (n === "postavi" && provjereno) };
}

// očitanja ispod crteža: [{naziv, tekst, stanje?}] (stanje "ok" | "bad" za provjereni položaj u postavi)
export function ocitanja(
  s,
  st,
  vid,
  { otkriveno = false, provjereno = false } = {},
) {
  const f = fizika(s, st);
  const n = s.nacin;
  const out = [];
  const oc = (naziv, tekst, stanje) =>
    out.push({ naziv, tekst, stanje: stanje ?? null });
  const ishodSt =
    n === "postavi" && (otkriveno || provjereno)
      ? otkriveno || pogadja(s, st)
        ? "ok"
        : "bad"
      : null;
  if (s.scena === "foton") {
    const b = bojaFotona(f.lambdaNm);
    oc(
      "valna duljina",
      vid.boja ? `λ = ${fmt(f.lambdaNm)} nm (${b.ime})` : "λ = ?",
    );
    if (n === "istrazi") oc("frekvencija", `f = ${sci(f.f)} Hz`);
    oc(
      "svaki foton nosi",
      vid.energija ? `E_f = ${sci(f.EJ)} J = ${fmt(f.EeV)} eV` : "E_f = ?",
      ishodSt,
    );
    return out;
  }
  if (s.scena === "elektronvolt") {
    oc("napon", `U = ${fmt(f.U)} V`);
    oc("elektron dobije", `W = e·U = ${fmt(f.U)} eV = ${sci(f.EJ)} J`);
    return out;
  }
  if (s.scena === "fotoefekt") {
    if (!vid.brojke) return out;
    oc("svjetlost", `λ = ${fmt(f.lambdaNm)} nm`);
    if (n === "izracunaj") {
      if (isNum(s.U_z)) oc("zaustavni napon", `U_z = ${fmt(s.U_z)} V`);
      if (s.metal)
        oc(
          f.metal === "metal" ? "izlazni rad" : `izlazni rad (${f.metal})`,
          `W_i = ${fmt(f.W)} eV`,
        );
      for (const q of pitanja(s)) {
        const r = izracun(s, q);
        oc(
          r.naziv,
          `${r.oznaka} = ${otkriveno ? iznos(r.vrijednost, r.jedinica) : "?"}`,
        );
      }
      return out;
    }
    // postavi: ishod (E_f, E_k, struja) samo za provjereni položaj ili nakon točnog
    // zaustavni: E_k (= U_z) i E_f se ne pišu do točnog; granicna: W_i (iz njega λ₀) samo uz zadan metal ili nakon točnog
    const ishodVidljiv =
      n !== "postavi" ||
      (s.cilj === "zaustavni" && s.skrij !== "nista"
        ? otkriveno
        : vid.elektroni);
    const wVidljiv =
      n !== "postavi" || s.skrij === "nista" || otkriveno || !!s.metal;
    if (ishodVidljiv) oc("foton", `E_f = ${fmt(f.Ef)} eV`);
    if (s.metal || s.metali || n === "predvidi" || (ishodVidljiv && wVidljiv))
      oc(
        f.metal === "metal" ? "izlazni rad" : `izlazni rad (${f.metal})`,
        `W_i = ${fmt(f.W)} eV`,
      );
    if (ishodVidljiv)
      oc(
        "najbrži elektroni",
        f.izlazi ? `E_k = ${fmt(f.Ek)} eV` : "nijedan elektron ne izlazi",
        n === "postavi" && s.cilj !== "zaustavni" ? ishodSt : null,
      );
    if (n === "predvidi" && f.izlazi)
      oc("zaustavni napon", `U_z = ${fmt(f.Ek)} V`);
    if (n === "istrazi" || (n === "postavi" && s.cilj === "zaustavni"))
      oc("napon", `U = ${fmt(f.U)} V`);
    if (vid.struja)
      oc(
        "struja",
        `I = ${fmt(f.I)} µA`,
        n === "postavi" && s.cilj === "zaustavni" ? ishodSt : null,
      );
    return out;
  }
  // de Broglie
  oc("čestica", `${f.ime}, m = ${sci(f.m)} kg`);
  const traziV =
    n === "izracunaj" && pitanja(s).some((q) => q.velicina === "v");
  oc("brzina", traziV && !otkriveno ? "v = ?" : `v = ${sci(f.v)} m/s`);
  if (n === "istrazi" || otkriveno || (n === "postavi" && vid.val))
    oc("količina gibanja", `p = ${sci(f.p)} kg m/s`);
  if (vid.val || traziV)
    oc(
      "valna duljina",
      `λ = ${sci(f.lam)} m = ${iznos(f.lamNm, "nm")}`,
      ishodSt,
    );
  else oc("valna duljina", "λ = ?");
  if (vid.val && f.lamNm < 0.004)
    oc(
      "u usporedbi s atomima",
      `${sci(0.1 / f.lamNm)} puta manja od razmaka atoma`,
    );
  return out;
}

// opis crteža za čitače ekrana (ne odaje traženo)
export function opisCrteza(s, st, vid) {
  const f = fizika(s, st);
  if (s.scena === "foton") {
    let o =
      "Laser ispaljuje fotone, kratke valne pakete, prema detektoru. Svi fotoni iste svjetlosti nose jednaku energiju.";
    if (vid.boja)
      o += ` Svjetlost: ${fmt(f.lambdaNm)} nm, ${bojaFotona(f.lambdaNm).ime}.`;
    if (vid.energija) o += ` Svaki foton nosi ${fmt(f.EeV)} eV.`;
    return o;
  }
  if (s.scena === "elektronvolt")
    return `Elektron kreće od negativne ploče i ubrzava prema pozitivnoj. Napon je ${fmt(f.U)} V, pa elektron dobije ${fmt(f.U)} eV.`;
  if (s.scena === "fotoefekt") {
    let o = `Fotoćelija: svjetlost valne duljine ${fmt(f.lambdaNm)} nm pada na metalnu pločicu (${f.metal}). Nasuprot je kolektor, a u krugu su izvor zaustavnog napona i ampermetar.`;
    if (vid.elektroni)
      o += f.izlazi
        ? " Svjetlost izbija elektrone."
        : " Nijedan elektron ne izlazi.";
    if (vid.struja) o += ` Struja ${fmt(f.I)} µA.`;
    return o;
  }
  let o = `Elektronski top ispaljuje česticu (${f.ime}) prema kristalu u kojem su atomi razmaknuti 0,1 nm.`;
  if (vid.val) o += ` Valna duljina čestice je ${iznos(f.lamNm, "nm")}.`;
  return o;
}
export function uputa(s) {
  if (s.nacin === "postavi") {
    if (s.scena === "fotoefekt" && s.skrij !== "nista")
      return "Pomakni klizač, pa klikni Provjeri. Elektroni, struja i bilanca energije vide se tek nakon provjere.";
    if (s.scena === "foton")
      return "Pomakni klizač valne duljine, pa klikni Provjeri. Energija fotona vidi se tek nakon provjere.";
    if (s.scena === "de_broglie")
      return "Pomakni klizač brzine, pa klikni Provjeri. Val čestice vidi se tek nakon provjere.";
    return "Pomakni klizač, pa klikni Provjeri.";
  }
  if (s.nacin === "predvidi")
    return "Za svaku veličinu odaberi što se dogodi nakon promjene, pa klikni Provjeri.";
  if (s.nacin === "izracunaj")
    return "Izračunaj i upiši rezultat (znanstveni zapis: 3,06·10^-19).";
  return "";
}

// ── opis ──────────────────────────────────────────────────────────────────────────────────────────
const OPIS = `Kvantna svjetlost i valovi čestica (fizika, matura, Blok Q): foton, elektronvolt, fotoelektrični efekt, de Broglie. Polja: tekst, scena ("foton" | "elektronvolt" | "fotoefekt" | "de_broglie"), nacin. Konstante kao u knjižici: h = 6,626·10⁻³⁴ J s, c = 3·10⁸ m/s, 1 eV = 1,6·10⁻¹⁹ J, mₑ = 9,11·10⁻³¹ kg, mₚ = 1,67·10⁻²⁷ kg. Tolerancija brojeva 1 %.
Klizači: klizaci: [{id, min, max, korak, pocetak?}]; id po sceni: foton "lambda" (nm), "jakost" (%); elektronvolt "U" (V); fotoefekt "lambda", "jakost", "U" (zaustavni napon, V); de_broglie "v" (m/s). Veličinu koju zadaje klizač ne piši i kao broj (osim lambda u fotoefektu, gdje lambda iz zadatka određuje W_i). Oznake i jedinice dodaje widget. istrazi do 3 klizača, postavi točno 1.
Scene:
- "foton": lambda (nm, 100–1000; UV/IC se crtaju sivo s oznakom) ili E (eV, samo za izracunaj λ ili f), izvor? (natpis na laseru, npr. "laserski pokazivač"), jakost? (0–100, zadano 60). Laser ispaljuje fotone kao valne pakete u boji λ; svaki nosi „kovanicu“ energije (veća za kraću λ), detektor broji fotone, os ispod pokazuje E fotona u eV (vidljivo ≈ 1,7–3,3 eV). Jakost mijenja broj fotona, ne njihovu energiju.
- "elektronvolt": U (V, 0,1–10; zadano 1). Elektron ubrzava od − do + ploče i dobije e·U = U eV (zamjena za sliku q01_ev).
- "fotoefekt": lambda (nm) i točno jedno od U_z (V; W_i = hc/λ − e·U_z) ili metal: {naziv?, W_i (eV, 1–7)}; metali? (istrazi: [{naziv, W_i}] gumbi, npr. cezij 2,1, natrij 2,3, cink 4,3); jakost?, U? (početni napon). Svjetiljka → katoda → izbijeni elektroni usporavaju u polju i vraćaju se; pri U ≥ U_z struja je 0. Stupci E_f = W_i + E_k; ako je E_f < W_i, nijedan elektron ne izlazi koliko god svjetlo bilo jako.
- "de_broglie": cestica? ("elektron" zadano | "proton" | {ime, m (kg), v? (m/s)}), v (m/s, 10³–3·10⁷) ili lambda (nm, kad se pita v); cestice? (istrazi: gumbi od "elektron", "proton", "loptica" = teniska loptica 0,057 kg, 50 m/s). Val čestice crta se u mjerilu iznad kristala s atomima na 0,1 nm.
Načini:
- "istrazi" (pogledaj): klizači; prikazi? (fotoefekt: bilanca, struja, brojke; zadano sve).
- "prikaz" (pogledaj, samo elektronvolt): animacija bez klizača.
- "izracunaj" (Tvoj red): pitaj: [{velicina, jedinica?, krivo?, savjet?}] (1–3). foton: E (J | eV), f (Hz), lambda (nm | m; uz zadan E); fotoefekt: E_f, Ek, W_i (eV | J), lambda0 (nm | m), f0 (Hz), U_z (V; samo uz metal); de_broglie: p (kg m/s), lambda (m | nm), v (m/s; uz zadan lambda). Tražene vrijednosti su „?“; boja (kad se traži λ), energija fotona, stupci bilance i val čestice ne vide se do točnog odgovora. Auto-greške: nm nepretvoren, h·λ/c, h·λ, ×1,6·10⁻¹⁹ umjesto ÷ (i obrnuto), iznos u J upisan kao eV i obrnuto, W_i = E_f + E_k, λ₀ iz E_k, λ₀ = λ, W_i nepretvoren u J, masa protona umjesto elektrona, brzina bez 10ⁿ, h·m·v, h/m, metri upisani u nm-polje.
- "postavi" (Tvoj red): točno jedan klizač i cilj. foton: {velicina: "E", jedinica?: "eV" | "J", vrijednost} (klizač lambda); fotoefekt: "granicna" (klizač lambda: elektroni tek počnu izlaziti, λ₀ = hc/W_i), "zaustavni" (klizač U: struja upravo padne na 0) ili {velicina: "Ek", vrijednost (eV)} (klizač lambda); skrij? ("ishod" zadano: elektroni, struja i bilanca se ne vide dok učenik ne provjeri položaj | "nista"); de_broglie: {velicina: "lambda", vrijednost (nm)} (klizač v). Poruke za prekratko/predugo računa widget. krivo?: [{vrijednost (klizača), poruka}].
- "predvidi" (Tvoj red, samo fotoefekt): promjena: ${PROMJENE.join(" | ")}; pitaj: popis od "Ek", "broj_elektrona" (samo uz promjenu jakosti ili kad elektroni prestanu izlaziti), "U_z"; učenik za svaku bira raste / pada / ostaje isto / nema elektrona. Stanje nakon promjene crta se tek nakon točnog odgovora.`;

const PRIMJER = {
  tip: TIP,
  scena: "foton",
  nacin: "izracunaj",
  lambda: 650,
  izvor: "laserski pokazivač",
  pitaj: [
    { velicina: "E", jedinica: "J" },
    { velicina: "E", jedinica: "eV" },
  ],
  tekst:
    "Laserski pokazivač svijetli crvenom svjetlošću valne duljine 650 nm. Kolika je energija jednog fotona u džulima, a kolika u elektronvoltima?",
};

const PRIMJERI = [
  {
    tip: TIP,
    scena: "foton",
    nacin: "istrazi",
    izvor: "laserski pokazivač",
    klizaci: [
      { id: "lambda", min: 380, max: 750, korak: 1, pocetak: 650 },
      { id: "jakost", min: 10, max: 100, korak: 10, pocetak: 40 },
    ],
    tekst:
      "Mijenjaj **boju** lasera i gledaj kovanicu energije koju nosi svaki foton. Onda pojačaj svjetlo: što se mijenja, broj fotona ili njihova energija?",
  },
  {
    tip: TIP,
    scena: "foton",
    nacin: "postavi",
    izvor: "laserski pokazivač",
    cilj: { velicina: "E", jedinica: "eV", vrijednost: 2.5 },
    klizaci: [{ id: "lambda", min: 380, max: 750, korak: 1, pocetak: 650 }],
    tekst: "Namjesti laser čiji foton nosi **2,5 eV**.",
  },
  {
    tip: TIP,
    scena: "foton",
    nacin: "izracunaj",
    lambda: 590,
    izvor: "laserski pokazivač",
    pitaj: [
      { velicina: "E", jedinica: "J" },
      { velicina: "E", jedinica: "eV" },
    ],
    tekst:
      "Laserski pokazivač svijetli žutom svjetlošću valne duljine 590 nm. Kolika je energija jednog fotona u džulima, a kolika u elektronvoltima?",
  },
  {
    tip: TIP,
    scena: "elektronvolt",
    nacin: "prikaz",
    U: 1,
    tekst:
      "**Elektronvolt** je energija koju elektron dobije kad prođe napon od 1 V.",
  },
  {
    tip: TIP,
    scena: "elektronvolt",
    nacin: "istrazi",
    klizaci: [{ id: "U", min: 0.5, max: 5, korak: 0.5, pocetak: 1 }],
    tekst:
      "Mijenjaj napon između ploča i gledaj koliko energije elektron dobije.",
  },
  {
    tip: TIP,
    scena: "fotoefekt",
    nacin: "istrazi",
    lambda: 300,
    U_z: 1.5,
    klizaci: [
      { id: "U", min: 0, max: 3, korak: 0.05, pocetak: 0 },
      { id: "jakost", min: 10, max: 100, korak: 10, pocetak: 60 },
    ],
    tekst:
      "Pločicu obasjava UV-zračenje od 300 nm. **Povećavaj zaustavni napon** i gledaj elektrone i ampermetar: pri kojem naponu struja padne na nulu?",
  },
  {
    tip: TIP,
    scena: "fotoefekt",
    nacin: "izracunaj",
    lambda: 300,
    U_z: 1.5,
    pitaj: [
      { velicina: "Ek", jedinica: "eV" },
      { velicina: "W_i", jedinica: "eV" },
    ],
    tekst:
      "Pločicu obasjamo UV-zračenjem valne duljine 300 nm, a izbačene elektrone zaustavlja napon od 1,5 V. Kolika je najveća kinetička energija elektrona i koliki je izlazni rad metala?",
  },
  {
    tip: TIP,
    scena: "fotoefekt",
    nacin: "izracunaj",
    lambda: 300,
    U_z: 1.5,
    pitaj: [{ velicina: "lambda0", jedinica: "nm" }],
    tekst:
      "Isti metal (λ = 300 nm, U_z = 1,5 V). Kolika je najveća valna duljina koja još izbacuje elektrone?",
  },
  {
    tip: TIP,
    scena: "fotoefekt",
    nacin: "postavi",
    lambda: 300,
    U_z: 1.5,
    cilj: "granicna",
    klizaci: [{ id: "lambda", min: 200, max: 700, korak: 1, pocetak: 300 }],
    tekst:
      "Isti metal. Namjesti **najveću** valnu duljinu koja još izbacuje elektrone.",
  },
  {
    tip: TIP,
    scena: "fotoefekt",
    nacin: "postavi",
    lambda: 260,
    metal: { W_i: 2.78 },
    cilj: "zaustavni",
    klizaci: [{ id: "U", min: 0, max: 4, korak: 0.05, pocetak: 0.5 }],
    tekst:
      "Metal izlaznog rada 2,78 eV obasjamo zračenjem od 260 nm. Namjesti napon pri kojem struja **upravo padne na nulu**.",
  },
  {
    tip: TIP,
    scena: "fotoefekt",
    nacin: "predvidi",
    lambda: 220,
    U_z: 1.2,
    jakost: 40,
    promjena: "jakost_gore",
    pitaj: ["Ek", "broj_elektrona", "U_z"],
    tekst:
      "Pločicu obasjava zračenje od 220 nm, a zaustavni napon je $U_z$ = 1,2 V. Što se dogodi kad svjetlost postane jača?",
  },
  {
    tip: TIP,
    scena: "fotoefekt",
    nacin: "istrazi",
    lambda: 450,
    metali: [
      { naziv: "cezij", W_i: 2.1 },
      { naziv: "natrij", W_i: 2.3 },
      { naziv: "cink", W_i: 4.3 },
    ],
    klizaci: [
      { id: "lambda", min: 200, max: 700, korak: 1, pocetak: 450 },
      { id: "jakost", min: 10, max: 100, korak: 10, pocetak: 60 },
    ],
    tekst:
      "Odaberi metal i mijenjaj valnu duljinu. Kod koje valne duljine elektroni prestanu izlaziti? Pomaže li jače svjetlo?",
  },
  {
    tip: TIP,
    scena: "de_broglie",
    nacin: "istrazi",
    cestice: ["elektron", "proton", "loptica"],
    klizaci: [{ id: "v", min: 2e6, max: 2e7, korak: 1e5, pocetak: 7.3e6 }],
    tekst:
      "Mijenjaj brzinu elektrona i usporedi njegovu valnu duljinu s razmakom atoma u kristalu. Probaj i proton i tenisku lopticu.",
  },
  {
    tip: TIP,
    scena: "de_broglie",
    nacin: "izracunaj",
    cestica: "elektron",
    v: 7.3e6,
    pitaj: [{ velicina: "lambda", jedinica: "m" }],
    tekst:
      "Elektron se giba brzinom 7,3·10⁶ m/s. Kolika mu je de Broglieva valna duljina?",
  },
  {
    tip: TIP,
    scena: "de_broglie",
    nacin: "izracunaj",
    cestica: "elektron",
    v: 3.8e6,
    pitaj: [
      { velicina: "p", jedinica: "kg m/s" },
      { velicina: "lambda", jedinica: "m" },
    ],
    tekst:
      "Elektron se giba brzinom 3,8·10⁶ m/s. Kolika mu je količina gibanja, a kolika de Broglieva valna duljina?",
  },
  {
    tip: TIP,
    scena: "de_broglie",
    nacin: "postavi",
    cestica: "elektron",
    cilj: { velicina: "lambda", vrijednost: 0.2 },
    klizaci: [{ id: "v", min: 1e6, max: 1e7, korak: 1e4, pocetak: 7e6 }],
    tekst:
      "Namjesti brzinu elektrona tako da mu valna duljina bude **0,2 nm**.",
  },
];

// oznake s indeksom (E_k, W_i, U_z, E_f) u porukama i točnom odgovoru pišu se kao KaTeX ($E_{k}$)
export const tex = (t) =>
  String(t).replace(/(?<![$\w{])([EWU])_([a-z]+)(?![\w$}])/g, "$$$1_{$2}$$");

// ── validacija ────────────────────────────────────────────────────────────────────────────────────
const POLJA = [
  "tip",
  "scena",
  "nacin",
  "tekst",
  "lambda",
  "E",
  "izvor",
  "jakost",
  "U",
  "U_z",
  "metal",
  "metali",
  "cestica",
  "cestice",
  "v",
  "klizaci",
  "prikazi",
  "pitaj",
  "cilj",
  "skrij",
  "promjena",
  "krivo",
  "savjet",
  "seed",
];
const POLJA_SCENE = {
  foton: ["lambda", "E", "izvor", "jakost"],
  elektronvolt: ["U"],
  fotoefekt: [
    "lambda",
    "U_z",
    "metal",
    "metali",
    "jakost",
    "U",
    "prikazi",
    "skrij",
    "promjena",
  ],
  de_broglie: ["cestica", "cestice", "v", "lambda"],
};
const ZAJEDNICKA = [
  "tip",
  "scena",
  "nacin",
  "tekst",
  "klizaci",
  "pitaj",
  "cilj",
  "krivo",
  "savjet",
  "seed",
];

function validate(s) {
  const { list, need } = problems();
  need(isText(s.tekst), "kvant treba „tekst“");
  if (
    !need(
      SCENE.includes(s.scena),
      `kvant.scena mora biti jedna od: ${SCENE.join(", ")}`,
    )
  )
    return list;
  const nac = s.nacin;
  if (
    !need(
      NACINI[s.scena].includes(nac),
      `za scenu ${s.scena} nacin mora biti: ${NACINI[s.scena].join(", ")}`,
    )
  )
    return list;
  for (const k of Object.keys(s)) {
    if (!need(POLJA.includes(k), `nepoznato polje „${k}“`)) continue;
    need(
      ZAJEDNICKA.includes(k) || POLJA_SCENE[s.scena].includes(k),
      `polje „${k}“ ne postoji u sceni ${s.scena}`,
    );
  }
  if (s.seed != null)
    need(
      Number.isInteger(s.seed) && s.seed >= 0,
      "seed mora biti cijeli broj ≥ 0",
    );
  if (s.savjet != null) need(isText(s.savjet), "savjet mora biti tekst");
  const raspon = (ime, min, max, opis) => {
    if (s[ime] == null) return true;
    return need(
      isNum(s[ime]) && s[ime] >= min && s[ime] <= max,
      `${ime} mora biti broj od ${formatNumber(min)} do ${formatNumber(max)} (${opis})`,
    );
  };
  raspon(
    "lambda",
    s.scena === "de_broglie" ? 0.001 : 100,
    s.scena === "de_broglie" ? 10 : 1000,
    "nm",
  );
  raspon("E", 1.24, 12.4, "energija fotona u eV");
  raspon("jakost", 0, 100, "%");
  raspon("U", 0, 10, "V");
  raspon("U_z", 0.05, 10, "zaustavni napon u V");
  raspon("v", 1e3, 3e7, "m/s, do 0,1c");
  if (s.izvor != null)
    need(
      isText(s.izvor) && s.izvor.length <= 30,
      "izvor mora biti kratak tekst (do 30 znakova)",
    );

  // klizači
  const kl = klizaciOd(s);
  if (s.klizaci != null)
    need(Array.isArray(s.klizaci), "klizaci mora biti popis");
  const ids = kl.map((k) => k?.id);
  kl.forEach((k, i) => {
    const at = `klizaci[${i}]`;
    if (
      !need(
        k && KLIZACI[s.scena].includes(k.id),
        `${at}.id mora biti: ${KLIZACI[s.scena].join(", ")}`,
      )
    )
      return;
    for (const p of Object.keys(k))
      need(
        ["id", "min", "max", "korak", "pocetak"].includes(p),
        `${at}: nepoznato polje „${p}“`,
      );
    const g = GRANICE[k.id];
    if (
      !need(
        isNum(k.min) &&
          isNum(k.max) &&
          k.min >= g.min &&
          k.max <= g.max &&
          k.min < k.max,
        `${at}: min < max u rasponu ${formatNumber(g.min)}–${formatNumber(g.max)} (${g.opis})`,
      )
    )
      return;
    if (
      !need(
        isNum(k.korak) && k.korak > 0 && (k.max - k.min) / k.korak <= 20000,
        `${at}.korak mora biti pozitivan (najviše 20 000 koraka)`,
      )
    )
      return;
    const n = (k.max - k.min) / k.korak;
    need(
      Math.abs(n - Math.round(n)) < 1e-6,
      `${at}: (max − min) mora biti višekratnik koraka`,
    );
    if (k.pocetak != null)
      need(
        isNum(k.pocetak) && k.pocetak >= k.min && k.pocetak <= k.max,
        `${at}.pocetak mora biti između min i max`,
      );
  });
  need(new Set(ids).size === ids.length, "isti klizač je naveden dvaput");
  const imaKl = (id) => ids.includes(id);
  if (nac === "istrazi")
    need(kl.length >= 1 && kl.length <= 3, "istrazi treba 1–3 klizača");
  if (nac === "postavi")
    need(kl.length === 1, "postavi treba točno jedan klizač");
  if (["izracunaj", "predvidi", "prikaz"].includes(nac))
    need(s.klizaci == null, `${nac} nema klizače`);
  if (imaKl("jakost"))
    need(s.jakost == null, "jakost zadaje klizač, pa je ne piši i kao broj");
  if (imaKl("U"))
    need(s.U == null, "U zadaje klizač, pa ga ne piši i kao broj");
  if (imaKl("v"))
    need(s.v == null, "v zadaje klizač, pa ga ne piši i kao broj");
  if (s.scena === "foton" && imaKl("lambda"))
    need(
      s.lambda == null && s.E == null,
      "λ zadaje klizač, pa ne piši lambda ni E",
    );

  // polja odgovora
  if (GLEDANJE.includes(nac)) {
    noAnswerFields(s, need);
    need(
      s.pitaj == null && s.promjena == null && s.skrij == null,
      "istrazi/prikaz nema pitaj, promjena ni skrij",
    );
  }
  if (nac !== "izracunaj" && nac !== "predvidi")
    need(s.pitaj == null, "pitaj postoji samo u izracunaj i predvidi");
  if (nac !== "postavi")
    need(
      s.cilj == null && s.skrij == null,
      "cilj i skrij postoje samo u postavi",
    );
  if (nac !== "predvidi")
    need(s.promjena == null, "promjena postoji samo u predvidi");
  if (nac === "izracunaj" || nac === "predvidi")
    need(s.krivo == null, `u ${nac} krivo ide u pitaj (izracunaj) ili ga nema`);
  if (s.prikazi != null)
    need(
      nac === "istrazi" &&
        Array.isArray(s.prikazi) &&
        s.prikazi.length >= 1 &&
        s.prikazi.every((p) => PRIKAZI.includes(p)),
      `prikazi (samo istrazi fotoefekta) mora biti popis od: ${PRIKAZI.join(", ")}`,
    );
  if (list.length) return list;

  // scena
  if (s.scena === "foton") {
    if (!imaKl("lambda"))
      need(
        isNum(s.lambda) !== isNum(s.E),
        "foton treba točno jedno od: lambda (nm) ili E (eV)",
      );
    if (isNum(s.E))
      need(
        nac === "izracunaj",
        "E (eV) se zadaje samo u izracunaj (kad se traži λ ili f)",
      );
  }
  if (s.scena === "elektronvolt")
    need(nac !== "prikaz" || s.klizaci == null, "prikaz nema klizače");
  if (s.scena === "fotoefekt") {
    need(
      isNum(s.lambda),
      "fotoefekt treba lambda (nm): valnu duljinu iz zadatka",
    );
    if (s.metali != null) {
      if (
        need(
          nac === "istrazi" &&
            Array.isArray(s.metali) &&
            s.metali.length >= 2 &&
            s.metali.length <= 4,
          "metali (samo istrazi) mora biti popis od 2 do 4 metala",
        )
      )
        s.metali.forEach((m, i) =>
          need(
            m &&
              isText(m.naziv) &&
              isNum(m.W_i) &&
              m.W_i >= 1 &&
              m.W_i <= 7 &&
              Object.keys(m).every((k) => ["naziv", "W_i"].includes(k)),
            `metali[${i}] mora biti {naziv, W_i (eV, 1–7)}`,
          ),
        );
      need(
        s.metal == null && s.U_z == null,
        "uz metali ne pišu se metal ni U_z",
      );
    } else {
      need(
        (s.metal != null) !== (s.U_z != null),
        "fotoefekt treba točno jedno od: U_z (V) ili metal {naziv?, W_i}",
      );
      if (s.metal != null)
        need(
          s.metal &&
            isNum(s.metal.W_i) &&
            s.metal.W_i >= 1 &&
            s.metal.W_i <= 7 &&
            (s.metal.naziv == null || isText(s.metal.naziv)) &&
            Object.keys(s.metal).every((k) => ["naziv", "W_i"].includes(k)),
          "metal mora biti {naziv?, W_i (eV, 1–7)}",
        );
    }
    if (!list.length && s.metali == null) {
      const W = izlazniRad(s);
      need(
        W >= 1 && W <= 7,
        `izlazni rad iz zadatka je ${fmt(W)} eV: mora biti od 1 do 7 eV`,
      );
      if (nac !== "istrazi" && !(nac === "postavi" && s.cilj !== "zaustavni"))
        need(
          fizika(s).izlazi,
          "pri zadanoj λ foton ne izbacuje elektrone (E_f ≤ W_i)",
        );
    }
    if (s.skrij != null)
      need(
        ["ishod", "nista"].includes(s.skrij),
        'skrij mora biti "ishod" ili "nista"',
      );
  }
  if (s.scena === "de_broglie") {
    const c = s.cestica;
    if (c != null)
      need(
        c === "elektron" ||
          c === "proton" ||
          (c &&
            typeof c === "object" &&
            isText(c.ime) &&
            isNum(c.m) &&
            c.m > 0 &&
            c.m <= 1000 &&
            (c.v == null || (isNum(c.v) && c.v > 0 && c.v <= 3e7)) &&
            Object.keys(c).every((k) => ["ime", "m", "v"].includes(k))),
        'cestica mora biti "elektron", "proton" ili {ime, m (kg), v? (m/s)}',
      );
    if (s.cestice != null) {
      need(
        nac === "istrazi" && s.cestica == null,
        "cestice (gumbi) postoje samo u istrazi, umjesto cestica",
      );
      need(
        Array.isArray(s.cestice) &&
          s.cestice.length >= 2 &&
          s.cestice.every((x) =>
            ["elektron", "proton", "loptica"].includes(x),
          ) &&
          new Set(s.cestice).size === s.cestice.length,
        'cestice mora biti 2–3 različita od "elektron", "proton", "loptica"',
      );
    }
    if (nac !== "istrazi" && !(c && typeof c === "object" && isNum(c.v))) {
      if (nac === "postavi") need(imaKl("v"), "postavi treba klizač v");
      else
        need(
          isNum(s.v) !== isNum(s.lambda),
          "de_broglie treba točno jedno od: v (m/s) ili lambda (nm, kad se pita v)",
        );
    }
    // zadan λ (pita se v): brzina koja iz njega slijedi mora biti u istom rasponu kao zadana v
    if (isNum(s.lambda) && s.v == null && !list.length) {
      const v = fizika(s).v;
      need(
        isNum(v) && v >= 1e3 && v <= 3e7,
        `iz lambda = ${formatNumber(s.lambda)} nm slijedi v = ${isNum(v) ? iznos(v, "m/s") : "?"}; mora biti od 10³ do 3·10⁷ m/s (do 0,1c: nerelativistički)`,
      );
    }
    if (nac === "istrazi")
      need(
        imaKl("v") || (Array.isArray(s.cestice) && s.cestice.length >= 2),
        "istrazi treba klizač v ili gumbe cestice",
      );
  }
  if (list.length) return list;

  if (nac === "izracunaj") {
    if (
      need(
        Array.isArray(s.pitaj) && s.pitaj.length >= 1 && s.pitaj.length <= 3,
        "pitaj mora biti popis od 1 do 3 polja",
      )
    ) {
      const vel = VELICINE[s.scena];
      s.pitaj.forEach((q, i) => {
        const at = `pitaj[${i}]`;
        if (
          !need(
            q && q.velicina in vel,
            `${at}.velicina mora biti: ${Object.keys(vel).join(", ")}`,
          )
        )
          return;
        for (const k of Object.keys(q))
          need(
            ["velicina", "jedinica", "krivo", "savjet"].includes(k),
            `${at}: nepoznato polje „${k}“`,
          );
        if (q.jedinica != null)
          need(
            vel[q.velicina].jed.includes(q.jedinica),
            `${at}.jedinica za ${q.velicina} mora biti: ${vel[q.velicina].jed.join(", ")}`,
          );
        if (q.savjet != null)
          need(isText(q.savjet), `${at}.savjet mora biti tekst`);
        need(
          !s.pitaj.some(
            (o, j) =>
              j < i &&
              o?.velicina === q.velicina &&
              jedinicaPolja(s, o) === jedinicaPolja(s, q),
          ),
          `${at}: ista veličina u istoj jedinici već je u pitaj`,
        );
        if (s.scena === "foton") {
          if (q.velicina === "lambda")
            need(isNum(s.E), `${at}: λ se pita samo kad je zadan E (eV)`);
          if (q.velicina === "E")
            need(
              isNum(s.lambda) || jedinicaPolja(s, q) === "J",
              `${at}: E je zadan u eV; pitaj ga u J ili pitaj λ / f`,
            );
        }
        if (s.scena === "fotoefekt") {
          if (q.velicina === "W_i")
            need(
              s.metal == null,
              `${at}: W_i je zadan (metal), pa ga ne pitaj`,
            );
          if (q.velicina === "U_z")
            need(s.U_z == null, `${at}: U_z je zadan, pa ga ne pitaj`);
        }
        if (s.scena === "de_broglie") {
          if (q.velicina === "v")
            need(isNum(s.lambda), `${at}: v se pita samo kad je zadan lambda`);
          else
            need(
              isNum(fizika(s).v) && !isNum(s.lambda),
              `${at}: za ${q.velicina} zadaj brzinu v`,
            );
        }
        if (!list.length) {
          const r = izracun(s, q);
          need(
            isNum(r.vrijednost) && r.vrijednost > 0,
            `${at}: točan odgovor nije pozitivan broj`,
          );
          validateKrivo(q.krivo, r.vrijednost, r.tol, need, `${at}.krivo`);
        }
      });
    }
  }
  if (nac === "postavi") {
    const k = kl[0];
    const c = s.cilj;
    if (s.scena === "foton") {
      if (
        need(
          c &&
            c.velicina === "E" &&
            isNum(c.vrijednost) &&
            c.vrijednost > 0 &&
            (c.jedinica == null || ["eV", "J"].includes(c.jedinica)) &&
            Object.keys(c).every((x) =>
              ["velicina", "jedinica", "vrijednost"].includes(x),
            ),
          'foton: cilj mora biti {velicina: "E", jedinica?: "eV" | "J", vrijednost}',
        )
      )
        need(k.id === "lambda", "foton: cilj E se postavlja klizačem lambda");
    } else if (s.scena === "de_broglie") {
      if (
        need(
          c &&
            c.velicina === "lambda" &&
            isNum(c.vrijednost) &&
            c.vrijednost > 0 &&
            Object.keys(c).every((x) => ["velicina", "vrijednost"].includes(x)),
          'de_broglie: cilj mora biti {velicina: "lambda", vrijednost (nm)}',
        )
      )
        need(k.id === "v", "de_broglie: cilj λ se postavlja klizačem v");
    } else if (c === "granicna" || c === "zaustavni") {
      need(
        k.id === (c === "granicna" ? "lambda" : "U"),
        `cilj ${c} se postavlja klizačem ${c === "granicna" ? "lambda" : "U"}`,
      );
    } else if (
      need(
        c &&
          c.velicina === "Ek" &&
          isNum(c.vrijednost) &&
          c.vrijednost > 0 &&
          Object.keys(c).every((x) => ["velicina", "vrijednost"].includes(x)),
        'fotoefekt: cilj mora biti "granicna", "zaustavni" ili {velicina: "Ek", vrijednost (eV)}',
      )
    )
      need(k.id === "lambda", "cilj Ek se postavlja klizačem lambda");
    if (!list.length) {
      const best = najboljaVrijednost(s);
      need(
        best != null && pogadja(s, { ...pocetnoStanje(s), [k.id]: best }),
        "cilj se ne može postići nijednom vrijednošću klizača (u toleranciji 1 %)",
      );
      need(
        !pogadja(s, pocetnoStanje(s)),
        "početna vrijednost klizača već ostvaruje cilj",
      );
      if (s.krivo != null) {
        validateKrivo(s.krivo, null, 0, need);
        if (Array.isArray(s.krivo))
          s.krivo.forEach(
            (x, i) =>
              isNum(x?.vrijednost) &&
              need(
                !pogadja(s, { ...pocetnoStanje(s), [k.id]: x.vrijednost }),
                `krivo[${i}].vrijednost ostvaruje cilj, a to je točan odgovor`,
              ),
          );
      }
    }
  }
  if (nac === "predvidi") {
    need(
      PROMJENE.includes(s.promjena),
      `promjena mora biti: ${PROMJENE.join(", ")}`,
    );
    if (
      need(
        Array.isArray(s.pitaj) &&
          s.pitaj.length >= 1 &&
          s.pitaj.length <= 3 &&
          s.pitaj.every((p) => PREDVIDI_PITAJ.includes(p)) &&
          new Set(s.pitaj).size === s.pitaj.length,
        `pitaj mora biti popis od: ${PREDVIDI_PITAJ.join(", ")}`,
      ) &&
      !list.length
    ) {
      const r = ishodPredvidi(s);
      if (s.pitaj.includes("broj_elektrona"))
        need(
          s.promjena.startsWith("jakost") || !r.poslije.izlazi,
          "broj_elektrona se pita samo uz promjenu jakosti ili kad elektroni prestanu izlaziti",
        );
      if (s.promjena === "lambda_gore")
        need(
          r.poslije.izlazi,
          "lambda_gore: nova valna duljina mora ostati ispod granične",
        );
      if (s.promjena === "metal_W_dolje")
        need(
          r.stanje.W >= 1,
          "metal_W_dolje: izlazni rad nakon promjene mora biti barem 1 eV",
        );
      if (s.promjena === "jakost_gore")
        need(
          r.prije.jakost <= 50,
          "jakost_gore: početna jakost mora biti najviše 50 %",
        );
    }
  }
  return list;
}

// ── widget ────────────────────────────────────────────────────────────────────────────────────────
export const kvant = {
  tip: TIP,
  samoRucno: true,
  uloga: (s) => (GLEDANJE.includes(s.nacin) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: OPIS,
  primjer: PRIMJER,
  primjeri: PRIMJERI,
  fizika,
  validate,
  check(s, odgovor) {
    const r = provjera(s, odgovor);
    return r.poruka ? { ...r, poruka: tex(r.poruka) } : r;
  },
  tocanOdgovor: (s) => tex(tocanOdgovor(s)),
  brojcaniOdgovor(s) {
    if (s?.nacin === "izracunaj") {
      const q = pitanja(s).at(-1);
      return q ? izracun(s, q).vrijednost : null;
    }
    if (s?.nacin === "postavi") return najboljaVrijednost(s);
    return null;
  },
};

function provjera(s, odgovor) {
  if (s.nacin === "postavi") return checkPostavi(s, odgovor);
  if (s.nacin === "predvidi") return checkPredvidi(s, odgovor);
  if (s.nacin === "izracunaj") {
    const q = pitanja(s);
    const ul = Array.isArray(odgovor) ? odgovor : [odgovor];
    if (q.some((_, i) => !String(ul[i] ?? "").trim()))
      return {
        tocno: false,
        poruka: q.length > 1 ? "Upiši broj u svako polje." : "Upiši broj.",
        prazno: true,
      };
    for (let i = 0; i < q.length; i++) {
      const r = checkPolje(s, i, ul[i]);
      if (!r.tocno) {
        const m = izracun(s, q[i]);
        return {
          ...r,
          poruka:
            q.length > 1
              ? `${m.oznaka} (${m.jedinica}): ${r.poruka}`
              : r.poruka,
        };
      }
    }
    return { tocno: true };
  }
  return { tocno: false, poruka: "Ovaj korak nema provjeru." };
}
function tocanOdgovor(s) {
  if (s.nacin === "izracunaj")
    return pitanja(s)
      .map((q) => {
        const r = izracun(s, q);
        return `${r.oznaka} = ${iznos(r.vrijednost, r.jedinica)}`;
      })
      .join("; ");
  if (s.nacin === "postavi") {
    const k = klizaciOd(s)[0];
    const x = najboljaVrijednost(s);
    return `${metaKlizaca(s, k.id).kratko} = ${tekstKlizaca(s, k.id, x)}`;
  }
  if (s.nacin === "predvidi") {
    const { tocno } = ishodPredvidi(s);
    return pitanja(s)
      .map(
        (k) =>
          `${NAZIV_PREDVIDI[k]}: ${IZBORI.find((i) => i.id === tocno[k]).tekst}`,
      )
      .join("; ");
  }
  return "";
}
