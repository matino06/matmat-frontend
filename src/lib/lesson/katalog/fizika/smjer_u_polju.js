// smjer_u_polju: smjerovi u magnetizmu (pravilo desne ruke, Lorentzova i Amperova sila, polje vodiča, petlje,
// zavojnice i magneta, Lenzovo pravilo). Učenik bira smjer s ploče ↑ ↓ ← → ⊙ ⊗ 0 ili kruženje ↻ ↺; točan odgovor
// i poruke za tipične greške računa kod iz fizikalne situacije u specu (_magnetizam.js), nikad se ne pišu ručno.
import {
  POGLEDAJ,
  ODGOVOR,
  isText,
  problems,
  noAnswerFields,
} from "../zajednicko.js";
import { isNum } from "../../core/number.js";
import {
  SMJER_IMENA,
  U_RAVNINI,
  OKOMITO,
  NULA,
  KRUZENJE,
  NEMA,
  RIJEC,
  naziv,
  isSmjer,
  suprotan,
  vec,
  dot,
  len,
  cross,
  mul,
  lorentz,
  silaVodic,
  rijesiFaktor,
  smjerIz,
  poljeVodica,
  poljeVodica_zbroj,
  poljePetlje,
  strujaZaPolje,
  poljeZavojnice,
  strujaZavojnice,
  poljeMagneta,
  unutarMagneta,
  lenzMagnet,
  lenzPetlja,
  FAZE_PETLJE,
} from "./_magnetizam.js";

// Polja koja smije imati svaka scena (uz scena, oznaka, poruke, trazi); sve ostalo je greška u specu.
const SCENE = {
  naboj: { trazi: ["F", "v", "B"], polja: ["naboj", "ime", "v", "B", "F"] },
  vodic_u_polju: { trazi: ["F", "B", "I"], polja: ["I", "B", "F"] },
  polje_vodica: {
    trazi: ["B"],
    polja: [
      "vodici",
      "tocka",
      "sonda",
      "jedinica_duljine",
      "prikazi_doprinose",
    ],
  },
  dva_vodica: { trazi: ["F2", "F1", "B2", "B1"], polja: ["I1", "I2"] },
  petlja_struja: { trazi: ["B", "struja"], polja: ["struja", "B"] },
  zavojnica: {
    trazi: ["B", "struja"],
    polja: ["struja", "B", "N", "jakost", "duljina", "polumjer"],
  },
  magnet: { trazi: ["B"], polja: ["N", "tocka", "sonda"] },
  lenz_magnet: { trazi: ["struja"], polja: ["pol", "polozaj", "gibanje"] },
  lenz_petlja: { trazi: ["struja"], polja: ["B", "faza", "v"] },
};
const OPCE = ["scena", "oznaka", "poruke", "trazi", "mijenja"];
const SPEC_POLJA = ["tip", "nacin", "tekst", "pitanja"];

export const pitanjaOf = (s) =>
  Array.isArray(s?.pitanja) ? s.pitanja : s?.scena ? [s] : [];
export const traziOf = (q) => q.trazi ?? SCENE[q.scena]?.trazi[0];

// Je li odgovor kruženje (↻ ↺ nema) ili smjer (↑ ↓ ← → ⊙ ⊗ 0)?
export const vrstaOdgovora = (q) =>
  traziOf(q) === "struja" && q.scena !== "zavojnica" ? "kruzenje" : "smjer";
// Nudi li se „0“ (nema sile / nema polja) i „nema struje“: samo gdje je to smislen odgovor ili tipična zamka.
export const nudiNulu = (q) =>
  ["naboj", "vodic_u_polju", "polje_vodica"].includes(q.scena) &&
  ["F", "B"].includes(traziOf(q));
export const nudiNema = (q) =>
  vrstaOdgovora(q) === "kruzenje" && q.scena !== "petlja_struja";

// Položaji dvaju paralelnih vodiča (vodič 1 lijevo, vodič 2 desno).
export const DVA = [-1, 1];
export const vodiciDva = (q) => [
  { polozaj: [DVA[0], 0], I: q.I1 },
  { polozaj: [DVA[1], 0], I: q.I2 },
];
const metara = (q) =>
  ({ cm: 0.01, mm: 0.001, m: 1 })[q.jedinica_duljine ?? "cm"];

// ── fizika: točan odgovor svakog pitanja ──────────────────────────────────────────────────────────
// Vraća ime smjera / kruženja, "nula" / "nema", ili null ako situacija nema jednoznačan odgovor među ponuđenima.
export function rjesenje(q) {
  const t = traziOf(q);
  switch (q.scena) {
    case "naboj": {
      if (t === "F") return smjerIz(lorentz(q.naboj, q.v, q.B));
      const sol = rijesiFaktor(
        t === "v" ? 0 : 1,
        t === "v" ? q.B : q.v,
        q.F,
        q.naboj === "-" ? -1 : 1,
      );
      return sol.length === 1 ? sol[0] : null;
    }
    case "vodic_u_polju": {
      if (t === "F") return smjerIz(silaVodic(q.I, q.B));
      const sol = rijesiFaktor(t === "I" ? 0 : 1, t === "I" ? q.B : q.I, q.F);
      return sol.length === 1 ? sol[0] : null;
    }
    case "polje_vodica": {
      if (!tocka2(q.tocka) || !Array.isArray(q.vodici)) return null;
      const B = poljeVodica_zbroj(q.vodici, q.tocka, metara(q));
      if (!B) return null;
      const jedan = Math.max(
        ...q.vodici.map((w) => len(poljeVodica(w, q.tocka, metara(q)))),
      );
      return smjerIz(B, jedan);
    }
    case "dva_vodica": {
      const w = vodiciDva(q);
      const [na, od] = t.endsWith("2") ? [1, 0] : [0, 1];
      const B = poljeVodica(w[od], w[na].polozaj, 1);
      if (!B) return null;
      return t.startsWith("B")
        ? smjerIz(B, len(B))
        : smjerIz(cross(vec(w[na].I), B), len(B));
    }
    case "petlja_struja":
      return t === "B" ? poljePetlje(q.struja) : strujaZaPolje(q.B);
    case "zavojnica":
      return t === "B" ? poljeZavojnice(q.struja) : strujaZavojnice(q.B);
    case "magnet": {
      if (!tocka2(q.tocka)) return null;
      const B = poljeMagneta(q.tocka, q.N);
      return B ? smjerIz(B, len(B), (1.5 * Math.PI) / 180) : null;
    }
    case "lenz_magnet":
      return lenzMagnet(q).struja;
    case "lenz_petlja":
      return lenzPetlja(q).struja;
  }
  return null;
}

// ── provjera speca ────────────────────────────────────────────────────────────────────────────────
const tocka2 = (p) => Array.isArray(p) && p.length === 2 && p.every(isNum);

function validatePitanje(q, at, need, istrazi, list) {
  const pred = list.length;
  if (!need(q && typeof q === "object", `${at} mora biti objekt`)) return;
  const sc = SCENE[q.scena];
  if (
    !need(
      sc,
      `${at}.scena mora biti jedna od: ${Object.keys(SCENE).join(", ")}`,
    )
  )
    return;
  const dopusteno = [...OPCE, ...sc.polja];
  for (const k of Object.keys(q))
    if (!SPEC_POLJA.includes(k))
      need(
        dopusteno.includes(k),
        `${at}: scena „${q.scena}“ nema polje „${k}“`,
      );
  if (q.oznaka != null) need(isText(q.oznaka), `${at}.oznaka mora biti tekst`);
  const t = traziOf(q);
  if (!istrazi)
    need(
      sc.trazi.includes(t),
      `${at}.trazi mora biti jedno od: ${sc.trazi.join(", ")}`,
    );
  else
    need(
      q.trazi == null || sc.trazi.includes(q.trazi),
      `${at}.trazi mora biti jedno od: ${sc.trazi.join(", ")}`,
    );
  const smjer = (k, popis = SMJER_IMENA) =>
    need(
      popis.includes(q[k]),
      `${at}.${k} mora biti jedan od smjerova: ${popis.join(", ")}`,
    );
  const nezadano = (k) =>
    need(q[k] == null, `${at}: ${k} se traži, pa ne smije biti zadan`);
  // F = k · a × b: zadana su dva od tri (a, B, F), treći se traži; u istraživanju se uvijek računa F
  const trojka = (a) => {
    if (istrazi || t === "F") {
      smjer(a);
      smjer("B");
      need(q.F == null, `${at}: sila se računa sama, pa F ne smije biti zadan`);
      return;
    }
    nezadano(t);
    for (const k of [a, "B", "F"].filter((k) => k !== t)) smjer(k);
  };

  switch (q.scena) {
    case "naboj":
      need(["+", "-"].includes(q.naboj), `${at}.naboj mora biti "+" ili "-"`);
      if (q.ime != null)
        need(
          isText(q.ime) && q.ime.length <= 14,
          `${at}.ime je kratki naziv čestice (npr. "proton")`,
        );
      trojka("v");
      break;
    case "vodic_u_polju":
      trojka("I");
      break;
    case "polje_vodica": {
      const ok = need(
        Array.isArray(q.vodici) && q.vodici.length >= 1 && q.vodici.length <= 3,
        `${at}.vodici: 1–3 vodiča [{polozaj: [x, y], I, jakost?}]`,
      );
      if (ok)
        q.vodici.forEach((w, i) => {
          need(
            tocka2(w?.polozaj),
            `${at}.vodici[${i}].polozaj mora biti [x, y]`,
          );
          need(
            isSmjer(w?.I),
            `${at}.vodici[${i}].I mora biti smjer struje (${SMJER_IMENA.join(", ")})`,
          );
          if (w?.jakost != null)
            need(
              isNum(w.jakost) && w.jakost > 0 && w.jakost <= 1000,
              `${at}.vodici[${i}].jakost je struja u A (pozitivan broj; smjer je u I)`,
            );
          for (const k of Object.keys(w ?? {}))
            need(
              ["polozaj", "I", "jakost", "oznaka"].includes(k),
              `${at}.vodici[${i}] nema polje „${k}“`,
            );
        });
      if (q.jedinica_duljine != null)
        need(
          ["mm", "cm", "m"].includes(q.jedinica_duljine),
          `${at}.jedinica_duljine mora biti mm, cm ili m`,
        );
      if (q.prikazi_doprinose != null)
        need(
          typeof q.prikazi_doprinose === "boolean",
          `${at}.prikazi_doprinose je true ili false`,
        );
      if (istrazi) {
        need(
          q.tocka == null,
          `${at}: u istraživanju nema točke s odgovorom; početni položaj sonde je „sonda“`,
        );
        if (q.sonda != null)
          need(tocka2(q.sonda), `${at}.sonda mora biti [x, y]`);
        if (ok)
          need(
            q.vodici.every((w) => OKOMITO.includes(w?.I)),
            `${at}: u istraživanju vodiči moraju biti okomiti na papir (I: iz_papira ili u_papir), da se vide silnice`,
          );
      } else {
        need(q.sonda == null, `${at}.sonda postoji samo u istraživanju`);
        if (
          need(
            tocka2(q.tocka),
            `${at}.tocka mora biti [x, y] (točka T u kojoj se traži polje)`,
          ) &&
          ok &&
          q.vodici.every((w) => tocka2(w?.polozaj) && isSmjer(w?.I))
        ) {
          const B = poljeVodica_zbroj(q.vodici, q.tocka, 1);
          if (need(B, `${at}: točka T leži na vodiču`))
            need(
              rjesenje(q) != null,
              `${at}: polje u točki T nije ni uz jednu os (ni ↑ ↓ ← → ⊙ ⊗ ni nula); premjesti točku ili vodiče`,
            );
        }
      }
      break;
    }
    case "dva_vodica":
      smjer("I1");
      smjer("I2");
      if (isSmjer(q.I1) && isSmjer(q.I2)) {
        need(
          Math.abs(dot(vec(q.I1), vec(q.I2))) === 1,
          `${at}: vodiči su paralelni, pa I1 i I2 moraju biti isti ili suprotni smjer`,
        );
        need(
          ["gore", "dolje", ...OKOMITO].includes(q.I1),
          `${at}: vodiči stoje okomito (I gore/dolje) ili su okomiti na papir (iz_papira/u_papir)`,
        );
      }
      break;
    case "petlja_struja":
      if (t === "struja" && !istrazi) {
        smjer("B", OKOMITO);
        nezadano("struja");
      } else {
        need(
          KRUZENJE.includes(q.struja),
          `${at}.struja mora biti "kazaljka" ili "suprotno"`,
        );
        if (!istrazi) nezadano("B");
      }
      break;
    case "zavojnica":
      if (t === "struja" && !istrazi) {
        smjer("B", ["lijevo", "desno"]);
        nezadano("struja");
      } else {
        need(
          ["gore", "dolje"].includes(q.struja),
          `${at}.struja (smjer struje u prednjim zavojima) mora biti "gore" ili "dolje"`,
        );
        if (!istrazi) nezadano("B");
      }
      for (const [k, lo, hi, jed] of [
        ["N", 1, 5000, ""],
        ["jakost", 0.01, 100, " A"],
        ["duljina", 1, 200, " cm"],
        ["polumjer", 0.2, 20, " cm"],
      ])
        if (q[k] != null)
          need(
            isNum(q[k]) && q[k] >= lo && q[k] <= hi,
            `${at}.${k} mora biti broj od ${lo} do ${hi}${jed}`,
          );
      if (!istrazi)
        need(
          ["N", "jakost", "duljina", "polumjer"].every((k) => q[k] == null),
          `${at}: N, jakost, duljina i polumjer (klizači) postoje samo u istraživanju`,
        );
      break;
    case "magnet":
      smjer("N", U_RAVNINI);
      if (istrazi) {
        need(
          q.tocka == null,
          `${at}: u istraživanju nema točke s odgovorom; početni položaj kompasa je „sonda“`,
        );
        if (q.sonda != null)
          need(
            tocka2(q.sonda) &&
              Math.abs(q.sonda[0]) <= 3 &&
              Math.abs(q.sonda[1]) <= 2,
            `${at}.sonda mora biti [x, y] unutar [−3, 3] × [−2, 2]`,
          );
      } else if (
        need(
          tocka2(q.tocka),
          `${at}.tocka mora biti [x, y] (magnet je od −1 do 1, kompas negdje oko njega)`,
        )
      ) {
        need(
          Math.abs(q.tocka[0]) <= 3 && Math.abs(q.tocka[1]) <= 2,
          `${at}.tocka mora biti unutar [−3, 3] × [−2, 2]`,
        );
        if (U_RAVNINI.includes(q.N)) {
          need(
            !unutarMagneta(q.tocka, q.N),
            `${at}.tocka je unutar magneta; kompas stavi izvan njega`,
          );
          need(
            rjesenje(q) != null,
            `${at}: polje u točki nije ni uz jednu os; stavi kompas na os magneta ili na simetralu`,
          );
        }
      }
      break;
    case "lenz_magnet":
      need(
        ["N", "S"].includes(q.pol),
        `${at}.pol (pol okrenut prema petlji) mora biti "N" ili "S"`,
      );
      need(
        ["iznad", "ispod"].includes(q.polozaj),
        `${at}.polozaj mora biti "iznad" ili "ispod"`,
      );
      need(
        ["priblizava", "udaljava", "miruje"].includes(q.gibanje),
        `${at}.gibanje mora biti "priblizava", "udaljava" ili "miruje"`,
      );
      break;
    case "lenz_petlja":
      smjer("B", OKOMITO);
      need(
        FAZE_PETLJE.includes(q.faza),
        `${at}.faza mora biti jedna od: ${FAZE_PETLJE.join(", ")}`,
      );
      if (q.v != null)
        need(
          ["lijevo", "desno"].includes(q.v),
          `${at}.v (smjer gibanja petlje) mora biti "lijevo" ili "desno"`,
        );
      break;
  }
  if (q.poruke != null) {
    if (
      need(
        typeof q.poruke === "object" && !Array.isArray(q.poruke),
        `${at}.poruke: {odgovor: poruka}, npr. {"dolje": "…"}`,
      )
    ) {
      const moguci = [...SMJER_IMENA, NULA, ...KRUZENJE, NEMA];
      for (const [k, v] of Object.entries(q.poruke)) {
        need(
          moguci.includes(k),
          `${at}.poruke: „${k}“ nije mogući odgovor (${moguci.join(", ")})`,
        );
        need(isText(v), `${at}.poruke.${k} mora biti tekst`);
        if (!istrazi && k === rjesenje(q))
          need(false, `${at}.poruke.${k}: to je točan odgovor`);
      }
    }
  }
  if (q.mijenja != null) {
    need(istrazi, `${at}.mijenja postoji samo u istraživanju`);
    need(
      Array.isArray(q.mijenja) &&
        q.mijenja.every((k) => MIJENJA[q.scena]?.includes(k)),
      `${at}.mijenja: popis od ${MIJENJA[q.scena]?.join(", ") || "(ova scena nema što mijenjati)"}`,
    );
  }
  if (!istrazi && list.length === pred) {
    const r = rjesenje(q);
    need(
      r != null,
      `${at}: odgovor nije jednoznačan (nijedan ili više smjerova daju zadano)`,
    );
    if (r === NULA)
      need(nudiNulu(q), `${at}: točan odgovor je nula, a ona se ovdje ne nudi`);
  }
}

// Što učenik u istraživanju smije mijenjati (zadano: sve).
export const MIJENJA = {
  naboj: ["naboj", "v", "B"],
  vodic_u_polju: ["I", "B"],
  polje_vodica: ["I"],
  dva_vodica: ["I1", "I2"],
  petlja_struja: ["struja"],
  zavojnica: ["struja"],
  magnet: ["N"],
  lenz_magnet: ["pol", "polozaj", "gibanje"],
  lenz_petlja: ["B", "faza"],
};

// ── poruke za tipične greške ──────────────────────────────────────────────────────────────────────
const RUKA =
  "palac u smjeru struje (gibanja pozitivnog naboja), ispruženi prsti uz silnice, a sila izlazi iz dlana";
const uz = (a, b) =>
  isSmjer(a) && isSmjer(b) && Math.abs(dot(vec(a), vec(b))) === 1;

export function poruka(q, o, r) {
  if (q.poruke?.[o]) return q.poruke[o];
  const t = traziOf(q);
  switch (q.scena) {
    case "naboj":
    case "vodic_u_polju": {
      const nab = q.scena === "naboj";
      const brzina = nab ? "v" : "I";
      const tko = nab ? (q.ime ? q.ime : "naboj") : "vodič";
      if (t === "F") {
        if (r === NULA)
          return nab
            ? "Brzina je paralelna s poljem: naboj se giba uzduž silnica, pa sile nema (sin 0° = 0)."
            : "Vodič leži uzduž silnica (struja je paralelna s poljem), pa sile nema (sin 0° = 0).";
        if (o === NULA)
          return nab
            ? "Sila nestaje samo kad se naboj giba uzduž silnica (v ∥ B). Ovdje v i B nisu paralelni."
            : "Sila nestaje samo kad vodič leži uzduž silnica. Ovdje struja i polje nisu paralelni.";
        if (uz(o, q[brzina]))
          return `Sila je uvijek okomita i na ${nab ? "brzinu" : "struju"} i na polje. Ovaj smjer leži uz ${nab ? "brzinu v" : "struju I"}.`;
        if (uz(o, q.B))
          return `Sila je uvijek okomita i na ${nab ? "brzinu" : "struju"} i na polje. Ovaj smjer leži uz polje B.`;
        if (o === suprotan(r)) {
          if (nab && q.naboj === "-")
            return `${tko[0].toUpperCase()}${tko.slice(1)} je negativan: sila je suprotna od smjera koji daje pravilo desne ruke.`;
          return `Obrnuto. Pravilo desne ruke: ${RUKA}. Lijeva ruka ili zamijenjeni ${brzina} i B daju upravo suprotan smjer.`;
        }
        return `Pravilo desne ruke: ${RUKA}.`;
      }
      // traži se v, I ili B uz zadanu silu: što bi dao učenikov smjer
      if (o === NULA || !isSmjer(o)) return "Odaberi smjer.";
      const k = nab && q.naboj === "-" ? -1 : 1;
      const dobio = smjerIz(
        mul(
          t === "B" ? cross(vec(q[brzina]), vec(o)) : cross(vec(o), vec(q.B)),
          k,
        ),
      );
      const sto = t === "B" ? "polje" : nab ? "brzina" : "struja";
      if (dobio === NULA)
        return `S tim smjerom ${sto === "polje" ? "polje bi bilo paralelno s " + (nab ? "brzinom" : "strujom") : sto + " bi bila paralelna s poljem"}, pa sile uopće ne bi bilo.`;
      return `S tim smjerom sila bi gledala ${RIJEC[dobio]}, a zadana sila gleda ${RIJEC[q.F]}.${nab && q.naboj === "-" ? " Pazi: naboj je negativan." : ""}`;
    }
    case "polje_vodica": {
      if (r === NULA)
        return "Polja vodiča u točki T jednaka su po iznosu i suprotnog smjera, pa se poništavaju: ukupno polje je nula.";
      if (o === NULA)
        return q.vodici.length > 1
          ? "Polja se u točki T ne poništavaju: odredi smjer polja svakog vodiča pravilom desne ruke i zbroji ih."
          : "Oko vodiča kojim teče struja uvijek postoji polje. Odredi mu smjer pravilom desne ruke.";
      if (o === suprotan(r))
        return "Obrnut smjer. Palac desne ruke u smjeru struje, savijeni prsti pokazuju kamo kruže silnice oko vodiča.";
      if (q.vodici.some((w) => uz(o, w.I)))
        return "Polje ne ide u smjeru struje, nego kruži oko vodiča (silnice su kružnice oko njega).";
      const radijalno = q.vodici.some((w) => {
        const d = [q.tocka[0] - w.polozaj[0], q.tocka[1] - w.polozaj[1], 0];
        return (
          isSmjer(o) &&
          Math.abs(dot(vec(o), d)) / Math.max(1e-9, len(d)) > 0.999
        );
      });
      if (radijalno)
        return "Polje vodiča ne gleda prema vodiču ni od njega: silnice su kružnice oko vodiča, a polje je tangenta na kružnicu.";
      if (
        q.vodici.length > 1 &&
        q.vodici.some((w) => smjerIz(poljeVodica(w, q.tocka, 1)) === o)
      )
        return "To je smjer polja samo jednog vodiča. Odredi polje svakog vodiča i zbroji ih.";
      return "Silnice su kružnice oko vodiča: palac desne ruke u smjeru struje, savijeni prsti pokazuju smjer polja.";
    }
    case "dva_vodica": {
      const iste = q.I1 === q.I2;
      if (o === NULA)
        return t.startsWith("B")
          ? "Vodič oko sebe stvara polje i na mjestu drugog vodiča."
          : "Svaki vodič je u polju onog drugog, pa na njega djeluje sila.";
      if (t.startsWith("F")) {
        if (o === suprotan(r))
          return iste
            ? "Struje teku u istom smjeru, pa se vodiči privlače: sila gleda prema drugom vodiču."
            : "Struje teku u suprotnim smjerovima, pa se vodiči odbijaju: sila gleda od drugog vodiča.";
        return "Sila između paralelnih vodiča leži na spojnici vodiča: gleda prema drugom vodiču (privlačenje) ili od njega (odbijanje).";
      }
      if (o === suprotan(r))
        return "Obrnuto. Palac desne ruke u smjeru struje prvog vodiča, savijeni prsti pokazuju smjer polja kod drugog vodiča.";
      return "Polje vodiča kruži oko njega: kod drugog vodiča je okomito i na struju i na spojnicu vodiča.";
    }
    case "petlja_struja":
      if (t === "B") {
        if (o === suprotan(r))
          return "Obrnuto. Savij prste desne ruke u smjeru struje kroz petlju, palac pokazuje smjer polja u sredini.";
        return "U središtu petlje polje je okomito na ravninu petlje: iz papira ⊙ ili u papir ⊗.";
      }
      return "Obrnuto. Palac desne ruke u smjeru polja u sredini petlje, savijeni prsti pokazuju smjer struje.";
    case "zavojnica":
      if (t === "B") {
        if (o === suprotan(r))
          return "Obrnuto. Prsti desne ruke prate struju kroz zavoje, palac pokazuje smjer polja unutar zavojnice.";
        return "Unutar zavojnice polje ide uzduž njezine osi (lijevo ili desno).";
      }
      return "Obrnuto. Palac desne ruke u smjeru polja unutar zavojnice, savijeni prsti pokazuju smjer struje kroz zavoje.";
    case "magnet":
      if (o === suprotan(r))
        return "Obrnuto. Izvan magneta silnice izlaze iz sjevernog pola (N) i ulaze u južni (S), a sjeverni kraj igle kompasa pokazuje smjer polja.";
      if (OKOMITO.includes(o) || o === NULA)
        return "Polje magneta ovdje leži u ravnini papira: igla kompasa pokazuje gore, dolje, lijevo ili desno.";
      return "Prati silnicu kroz točku: izlazi iz N, savija se oko magneta i ulazi u S.";
    case "lenz_magnet": {
      const L = lenzMagnet(q);
      if (q.gibanje === "miruje")
        return "Magnet miruje: tok kroz petlju se ne mijenja, pa nema inducirane struje.";
      if (o === NEMA)
        return "Magnet se giba, pa se tok kroz petlju mijenja: inducirana struja teče.";
      const B = `Polje magneta kroz petlju gleda ${RIJEC[L.Bkroz]} (silnice izlaze iz N, ulaze u S)`;
      return L.tok === "raste"
        ? `${B}, a tok raste jer se magnet približava. Inducirano polje se opire porastu, pa unutar petlje gleda ${RIJEC[L.inducirano]}.`
        : `${B}, a tok pada jer se magnet udaljava. Inducirano polje pokušava zadržati tok, pa unutar petlje gleda isto: ${RIJEC[L.inducirano]}.`;
    }
    case "lenz_petlja": {
      const L = lenzPetlja(q);
      if (q.faza === "unutra")
        return "Petlja je cijela u polju: tok se ne mijenja, pa nema napona ni struje. Indukcija reagira na promjenu toka, a ne na samo polje.";
      if (q.faza === "izvan")
        return "Petlja je izvan polja: kroz nju nema toka i ništa se ne mijenja, pa nema struje.";
      if (o === NEMA)
        return `Dio petlje u polju ${q.faza === "ulazi" ? "raste" : "se smanjuje"}, pa se tok mijenja: inducirana struja teče.`;
      return L.tok === "raste"
        ? `Tok ${RIJEC[q.B]} raste, pa se inducirano polje opire: unutar petlje gleda ${RIJEC[L.inducirano]}.`
        : `Tok ${RIJEC[q.B]} pada, pa inducirano polje pokušava zadržati tok: unutar petlje gleda isto, ${RIJEC[L.inducirano]}.`;
    }
  }
  return "Nije točno.";
}

const istraziOf = (s) => s?.nacin === "istrazi";

// Natpis odgovora za učenika („gore ↑“, „0 (nema sile)“, „nema struje“).
export function natpis(q, o) {
  if (o === NULA)
    return ["naboj", "vodic_u_polju"].includes(q.scena) ||
      traziOf(q).startsWith("F")
      ? "0 (nema sile)"
      : "0 (nema polja)";
  if (o === NEMA) return "struja ne teče";
  return naziv(o);
}

export const smjer_u_polju = {
  tip: "smjer_u_polju",
  samoRucno: true,
  uloga: (s) => (istraziOf(s) ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => istraziOf(s),
  opis: `Smjer u magnetizmu (pravilo desne ruke, Lenz): učenik bira smjer na ploči ↑ ↓ ← → ⊙ (iz papira) ⊗ (u papir) i „0“ (nema sile/polja),
ili kruženje struje ↻ (kazaljka) / ↺ (suprotno) / „nema struje“. Točan smjer računa aplikacija iz situacije; poruke za tipične greške
(negativan naboj, v ∥ B, lijeva ruka, radijalno polje, Lenz: polje magneta umjesto opiranja…) dodaju se same.
Polja: tekst, nacin ("odaberi" = Tvoj red, "istrazi" = korak za gledanje: učenik mijenja zadane veličine i gleda rezultat; nema odgovora),
pitanja: 1–3 scene (istrazi: točno 1; može i jedna scena izravno u specu). Smjerovi: gore, dolje, lijevo, desno, iz_papira, u_papir.
Scene (trazi = nepoznata veličina, prva je zadana; nepoznata se ne zadaje):
- naboj: {naboj: "+"|"-", ime?, v, B, F?, trazi: "F"|"v"|"B"}  F = q·v×B
- vodic_u_polju: {I, B, F?, trazi: "F"|"B"|"I"}  F = I·L×B
- polje_vodica: {vodici: [{polozaj: [x, y], I, jakost? (A)}] (1–3), tocka: [x, y], trazi: "B"}  vodič ⊙/⊗ ili u papiru (I gore…); istrazi: sonda?, jedinica_duljine? ("cm"), prikazi_doprinose?
- dva_vodica: {I1, I2 (gore/dolje ili ⊙/⊗; vodič 1 lijevo, 2 desno), trazi: "F2"|"F1"|"B2"|"B1"}  B2 = polje vodiča 1 kod vodiča 2
- petlja_struja: {struja: "kazaljka"|"suprotno", trazi: "B"} ili {B, trazi: "struja"}  polje u središtu petlje
- zavojnica: {struja: "gore"|"dolje" (u prednjim zavojima), trazi: "B"} ili {B: lijevo|desno, trazi: "struja"}; istrazi: N?, jakost? (A), duljina? (cm), polumjer? (cm) → klizači
- magnet: {N: smjer sjevernog pola (gore/dolje/lijevo/desno), tocka: [x, y] (magnet je od −1 do 1), trazi: "B"} igla kompasa; istrazi: sonda?
- lenz_magnet: {pol: "N"|"S" (prema petlji), polozaj: "iznad"|"ispod", gibanje: "priblizava"|"udaljava"|"miruje"}  struja gledano odozgo
- lenz_petlja: {B: iz_papira|u_papir, faza: "izvan"|"ulazi"|"unutra"|"izlazi", v?: "desno"|"lijevo"}
Svaka scena: oznaka? (natpis iznad scene, npr. "1. magnet se približava"), poruke? ({odgovor: poruka} nadjačava automatske),
mijenja? (samo istrazi: koje zadane veličine učenik smije mijenjati).`,
  primjer: {
    tip: "smjer_u_polju",
    nacin: "odaberi",
    tekst:
      "Proton ulijeće u polje koje ulazi u papir. Kamo djeluje sila na njega?",
    pitanja: [
      {
        scena: "naboj",
        naboj: "+",
        ime: "proton",
        v: "desno",
        B: "u_papir",
        trazi: "F",
      },
    ],
  },
  primjeri: [
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst: "Kojim smjerom teče inducirana struja, gledano odozgo?",
      pitanja: [
        {
          scena: "lenz_magnet",
          pol: "N",
          polozaj: "iznad",
          gibanje: "priblizava",
          oznaka: "1. magnet se približava",
        },
        {
          scena: "lenz_magnet",
          pol: "N",
          polozaj: "iznad",
          gibanje: "udaljava",
          oznaka: "2. magnet se udaljava",
        },
      ],
    },
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst:
        "Elektron se giba udesno u polju koje ulazi u papir. Kamo djeluje sila na njega?",
      scena: "naboj",
      naboj: "-",
      ime: "elektron",
      v: "desno",
      B: "u_papir",
    },
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst:
        "Vodičem teče struja prema gore, a polje ulazi u papir. Kamo djeluje sila na vodič?",
      scena: "vodic_u_polju",
      I: "gore",
      B: "u_papir",
    },
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst: "Kamo je usmjereno polje u točki T, na polovici između vodiča?",
      scena: "polje_vodica",
      vodici: [
        { polozaj: [-10, 0], I: "iz_papira" },
        { polozaj: [10, 0], I: "u_papir" },
      ],
      tocka: [0, 0],
    },
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst:
        "Struje u oba vodiča teku prema gore. Kamo gleda polje prvog vodiča kod drugog vodiča, a kamo sila na drugi vodič?",
      pitanja: [
        {
          scena: "dva_vodica",
          I1: "gore",
          I2: "gore",
          trazi: "B2",
          oznaka: "1. polje vodiča 1 kod vodiča 2",
        },
        {
          scena: "dva_vodica",
          I1: "gore",
          I2: "gore",
          trazi: "F2",
          oznaka: "2. sila na vodič 2",
        },
      ],
    },
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst:
        "Petlja ulazi u polje, cijela je u polju, pa izlazi. Kojim smjerom teče inducirana struja?",
      pitanja: [
        {
          scena: "lenz_petlja",
          B: "u_papir",
          faza: "ulazi",
          oznaka: "1. ulazi",
        },
        {
          scena: "lenz_petlja",
          B: "u_papir",
          faza: "unutra",
          oznaka: "2. cijela unutra",
        },
        {
          scena: "lenz_petlja",
          B: "u_papir",
          faza: "izlazi",
          oznaka: "3. izlazi",
        },
      ],
    },
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst: "Kamo pokazuje sjeverni kraj igle kompasa u točki T?",
      scena: "magnet",
      N: "desno",
      tocka: [0, 1.2],
    },
    {
      tip: "smjer_u_polju",
      nacin: "odaberi",
      tekst: "Kamo je usmjereno polje unutar zavojnice?",
      scena: "zavojnica",
      struja: "gore",
    },
    {
      tip: "smjer_u_polju",
      nacin: "istrazi",
      tekst:
        "Mijenjaj smjer brzine, polja i predznak naboja i gledaj kamo djeluje sila.",
      scena: "naboj",
      naboj: "+",
      v: "desno",
      B: "u_papir",
    },
    {
      tip: "smjer_u_polju",
      nacin: "istrazi",
      tekst:
        "Povuci kompas između vodiča. Zatim promijeni smjer struje u drugom vodiču.",
      scena: "polje_vodica",
      vodici: [
        { polozaj: [-10, 0], I: "iz_papira", jakost: 5 },
        { polozaj: [10, 0], I: "u_papir", jakost: 5 },
      ],
      sonda: [0, 0],
      jedinica_duljine: "cm",
      prikazi_doprinose: true,
    },
    {
      tip: "smjer_u_polju",
      nacin: "istrazi",
      tekst:
        "Mijenjaj broj zavoja, struju, duljinu i polumjer zavojnice i gledaj polje u njoj. Povuci kompas oko zavojnice.",
      scena: "zavojnica",
      struja: "gore",
      N: 500,
      jakost: 2,
      duljina: 20,
      polumjer: 3,
    },
    {
      tip: "smjer_u_polju",
      nacin: "istrazi",
      tekst:
        "Povuci kompas oko magneta i gledaj kamo pokazuje igla. Okreni magnet.",
      scena: "magnet",
      N: "desno",
      sonda: [1.8, 0.6],
    },
  ],
  validate(s) {
    const { list, need } = problems();
    need(
      ["odaberi", "istrazi"].includes(s.nacin),
      "smjer_u_polju.nacin mora biti odaberi ili istrazi",
    );
    need(isText(s.tekst), "smjer_u_polju treba „tekst“");
    const ist = istraziOf(s);
    if (ist) noAnswerFields(s, need);
    const pit = pitanjaOf(s);
    if (Array.isArray(s.pitanja)) {
      need(
        s.scena == null,
        "scena ide ili izravno u spec ili u „pitanja“, ne oboje",
      );
      for (const k of Object.keys(s))
        need(
          SPEC_POLJA.includes(k),
          `smjer_u_polju: polje „${k}“ ide u pojedinu scenu u „pitanja“`,
        );
    }
    if (
      !need(
        pit.length >= 1 && pit.length <= (ist ? 1 : 3),
        ist
          ? "istrazi ima točno jednu scenu"
          : "smjer_u_polju treba 1–3 pitanja (scene)",
      )
    )
      return list;
    pit.forEach((q, i) =>
      validatePitanje(
        q,
        pit === s.pitanja ? `pitanja[${i}]` : "scena",
        need,
        ist,
        list,
      ),
    );
    return list;
  },
  rjesenje: (s) => pitanjaOf(s).map(rjesenje),
  check(s, odgovor) {
    const pit = pitanjaOf(s);
    const o = Array.isArray(odgovor) ? odgovor : [odgovor];
    if (o.length !== pit.length || o.some((x) => typeof x !== "string" || !x))
      return {
        tocno: false,
        poruka:
          pit.length > 1 ? "Odaberi odgovor za svaku sliku." : "Odaberi smjer.",
        prazno: true,
      };
    for (let i = 0; i < pit.length; i++) {
      const r = rjesenje(pit[i]);
      if (o[i] !== r) {
        const p = poruka(pit[i], o[i], r);
        return {
          tocno: false,
          poruka:
            pit.length > 1
              ? `**${pit[i].oznaka ?? `${i + 1}. slika`}:** ${p}`
              : p,
          kriv: i,
        };
      }
    }
    return { tocno: true };
  },
  tocanOdgovor(s) {
    const pit = pitanjaOf(s);
    if (pit.length === 1) return natpis(pit[0], rjesenje(pit[0]));
    return pit
      .map((q, i) => `${q.oznaka ?? `${i + 1}.`}: ${natpis(q, rjesenje(q))}`)
      .join("; ");
  },
};
