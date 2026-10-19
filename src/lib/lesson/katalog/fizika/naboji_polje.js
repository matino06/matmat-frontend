// naboji_polje: točkasti naboji u ravnini — Coulombova sila, polje u točki (superpozicija), silnice, vodljiva kugla
// i dodir dviju vodljivih kugli. Fiziku (polje, sila, točka nultog polja, raspodjela naboja) računa
// _elektrostatika.js, isti kod za crtež i za provjeru.
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
} from "../zajednicko.js";
import {
  ciljniVektor,
  kutVektora,
  razlikaKuta,
  tockaNule,
  nakonDodira,
} from "./_elektrostatika.js";

const NACINI = ["istrazi", "smjer", "nula", "dodir"];
const PRIKAZI = ["sile", "polje", "sastavnice", "silnice", "Er_graf"];
export const SREDSTVA_ZADANA = [
  { er: 1, naziv: "zrak" },
  { er: 2, naziv: "ulje" },
  { er: 5, naziv: "staklo" },
  { er: 80, naziv: "voda" },
];
const TOL_KUT = 12;
const MAX_KOORD = 100; // cm

// Hrvatski opis smjera u ravnini (0° = desno, 90° = gore).
const SMJEROVI = [
  "udesno",
  "gore-desno",
  "gore",
  "gore-lijevo",
  "ulijevo",
  "dolje-lijevo",
  "dolje",
  "dolje-desno",
];
export const opisSmjera = (kut) =>
  SMJEROVI[Math.round(((kut % 360) + 360) / 45) % 8];

export const fmtNaboj = (q) => `${q > 0 ? "+" : ""}${formatNumber(q)}\u00a0nC`;
const fmtIznos = (v, jed) => `${formatSci(v)}\u00a0${jed}`;
const oznakaMd = (o) =>
  /^[a-zA-Z]_\w+$/.test(o) ? `$${o.replace(/_(\w+)/, "_{$1}")}$` : o;

// izvori polja: točkasti naboji i kugla (kugla ima oznaku „Q“ ako nije zadana)
const izvori = (s) => [
  ...(s.naboji ?? []).map((n) => n.oznaka),
  ...(s.kugla ? [s.kugla.oznaka ?? "Q"] : []),
];

function validateScena(s, need) {
  const naboji = s.naboji ?? [];
  if (s.naboji != null) {
    if (
      need(
        Array.isArray(s.naboji) && s.naboji.length <= 4,
        "naboji: popis od najviše 4 naboja",
      )
    ) {
      s.naboji.forEach((n, i) => {
        need(
          isText(n?.oznaka),
          `naboji[${i}].oznaka mora biti tekst (npr. "q_1")`,
        );
        need(
          isNum(n?.q) && n.q !== 0 && Math.abs(n.q) <= 1000,
          `naboji[${i}].q mora biti broj različit od 0, u nC (najviše 1000 po iznosu)`,
        );
        need(
          isNum(n?.x) &&
            isNum(n?.y) &&
            Math.abs(n.x) <= MAX_KOORD &&
            Math.abs(n.y) <= MAX_KOORD,
          `naboji[${i}] treba koordinate x, y u cm (do ${MAX_KOORD} po iznosu)`,
        );
        if (n?.pomican != null)
          need(
            typeof n.pomican === "boolean",
            `naboji[${i}].pomican mora biti true ili false`,
          );
      });
      const ozn = s.naboji.map((n) => n?.oznaka);
      need(
        new Set(ozn).size === ozn.length,
        "oznake naboja moraju biti različite",
      );
      for (let i = 0; i < naboji.length; i++)
        for (let j = i + 1; j < naboji.length; j++)
          if ([naboji[i], naboji[j]].every((n) => isNum(n?.x) && isNum(n?.y)))
            need(
              Math.hypot(
                naboji[i].x - naboji[j].x,
                naboji[i].y - naboji[j].y,
              ) >= 1,
              `naboji ${naboji[i].oznaka} i ${naboji[j].oznaka} su preblizu (najmanje 1 cm)`,
            );
    }
  }
  if (s.kugla != null) {
    const k = s.kugla;
    need(
      isNum(k?.x) &&
        isNum(k?.y) &&
        Math.abs(k.x) <= MAX_KOORD &&
        Math.abs(k.y) <= MAX_KOORD,
      "kugla treba središte x, y u cm",
    );
    need(
      isNum(k?.R) && k.R > 0 && k.R <= 50,
      "kugla.R (vanjski polumjer, cm) mora biti između 0 i 50",
    );
    need(
      isNum(k?.q) && k.q !== 0 && Math.abs(k.q) <= 1000,
      "kugla.q mora biti broj različit od 0, u nC",
    );
    if (k?.R_unutra != null)
      need(
        isNum(k.R_unutra) && k.R_unutra > 0 && k.R_unutra < k.R,
        "kugla.R_unutra (polumjer šupljine) mora biti između 0 i R",
      );
    if (k?.oznaka != null)
      need(isText(k.oznaka), "kugla.oznaka mora biti tekst");
    if (isNum(k?.R))
      naboji.forEach((n, i) =>
        need(
          !(isNum(n?.x) && isNum(n?.y)) ||
            Math.hypot(n.x - k.x, n.y - k.y) > k.R + 0.5,
          `naboji[${i}] je unutar kugle ili na njoj`,
        ),
      );
  }
  need(
    naboji.length + (s.kugla ? 1 : 0) >= 1,
    "naboji_polje treba barem jedan naboj (naboji) ili kuglu",
  );
  if (s.sredstvo != null)
    need(
      isNum(s.sredstvo?.er) &&
        s.sredstvo.er >= 1 &&
        s.sredstvo.er <= 100 &&
        isText(s.sredstvo?.naziv),
      "sredstvo treba {er (1–100), naziv}",
    );
  if (s.tocke != null) {
    if (
      need(
        Array.isArray(s.tocke) && s.tocke.length <= 5,
        "tocke: popis od najviše 5 točaka",
      )
    ) {
      s.tocke.forEach((t, i) => {
        need(isText(t?.oznaka), `tocke[${i}].oznaka mora biti tekst`);
        need(
          isNum(t?.x) &&
            isNum(t?.y) &&
            Math.abs(t.x) <= MAX_KOORD &&
            Math.abs(t.y) <= MAX_KOORD,
          `tocke[${i}] treba koordinate x, y u cm`,
        );
        naboji.forEach((n) =>
          need(
            !(isNum(n?.x) && isNum(t?.x)) ||
              Math.hypot(n.x - t.x, n.y - t.y) >= 0.5,
            `točka ${t?.oznaka} je na naboju ${n.oznaka}`,
          ),
        );
      });
      const ozn = s.tocke.map((t) => t?.oznaka);
      need(
        new Set(ozn).size === ozn.length,
        "oznake točaka moraju biti različite",
      );
    }
  }
  if (s.prikazi != null) {
    if (
      need(
        Array.isArray(s.prikazi) && s.prikazi.every((p) => PRIKAZI.includes(p)),
        `prikazi smije sadržavati samo: ${PRIKAZI.join(", ")}`,
      )
    ) {
      if (s.prikazi.includes("Er_graf"))
        need(!!s.kugla, "prikaz Er_graf (graf E(r)) postoji samo uz kuglu");
      if (s.prikazi.includes("sile"))
        need(
          naboji.length >= 2 || (naboji.length >= 1 && s.kugla),
          "prikaz sile treba barem dva tijela s nabojem",
        );
    }
  }
}

function validateKugle(s, need) {
  if (
    !need(
      Array.isArray(s.kugle) && s.kugle.length === 2,
      "dodir treba kugle: točno 2 kugle [{oznaka, q (nC), R? (cm)}]",
    )
  )
    return false;
  s.kugle.forEach((k, i) => {
    need(isText(k?.oznaka), `kugle[${i}].oznaka mora biti tekst (npr. "A")`);
    need(
      isNum(k?.q) && Math.abs(k.q) <= 100,
      `kugle[${i}].q mora biti broj u nC (najviše 100 po iznosu)`,
    );
    if (k?.R != null)
      need(
        isNum(k.R) && k.R >= 1 && k.R <= 20,
        `kugle[${i}].R mora biti između 1 i 20 cm`,
      );
  });
  need(
    s.kugle.some((k) => isNum(k?.q) && k.q !== 0),
    "barem jedna kugla mora imati naboj",
  );
  return true;
}

export const naboji_polje = {
  tip: "naboji_polje",
  samoRucno: true,
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `Točkasti naboji u ravnini (Coulomb, polje, superpozicija), vodljiva kugla i dodir dviju kugli. k = 9·10⁹ N m²/C² kao u knjižici.
Scena: naboji: [{oznaka (npr. "q_1"), q (nC, s predznakom), x, y (cm, y prema gore), pomican? (istrazi, zadano true)}] (0–4),
kugla?: {x, y, R (cm), q (nC), R_unutra? (šupljina, cm), oznaka?} (vodljiva: polje unutar površine 0, izvana kao točkasti naboj u središtu),
sredstvo?: {er, naziv} (zadano zrak), tocke?: [{oznaka, x, y}] (istaknute točke), prikazi?: ["sile", "polje", "sastavnice", "silnice", "Er_graf"], tekst, nacin:
- "istrazi": korak za gledanje. Učenik vuče naboje i sondu (sonda kreće iz prve točke) i gleda polje u sondi (E₁, E₂ … i zbroj),
  sile na nabojima (3. Newtonov zakon), silnice; klizaci?: oznake naboja/kugle i "er" (promjena q od −50 do 50 nC, izbor sredstva iz
  sredstva?: [{er, naziv}] ili zrak/ulje/staklo/voda); Er_graf crta E(r) kugle s položajem sonde. Ili kugle (kao u "dodir") za pokus dodira,
  uz uzemljenje?: true (gumb „dotakni rukom“: naboj kugle oteče u zemlju).
- "smjer": učenik povuče strelicu iz točke u smjeru vektora; cilj: {vektor: "E", tocka} (ukupno polje u točki), {vektor: "F", naboj} (ukupna
  sila na naboj) ili {vektor: "F", tocka, q (nC)} (sila na probni naboj u točki). Točno unutar ±tolerancija (zadano ${TOL_KUT}°); iznos se ne ocjenjuje.
  Poruke za suprotan smjer, smjer samo jedne sastavnice i smjer polja umjesto sile na negativni naboj dodaju se same; krivo?: [{kut (°), poruka}].
  Nakon odgovora vide se sastavnice i zbroj s iznosima.
- "nula": točno 2 naboja; učenik postavi točku P gdje je ukupno polje (i sila na probni naboj) nula. Točku računa aplikacija
  (između istoimenih, izvan raznoimenih uz manji); tolerancija? u cm (zadano 3 % razmaka). Poruke za krivo područje i za r umjesto r² su automatske.
- "dodir": kugle: [{oznaka, q (nC), R? (cm, zadano jednake)}] (2): učenik upiše naboj svake kugle nakon dodira, pa animacija pokaže prelazak
  elektrona. Točno: ukupni naboj se dijeli u omjeru polumjera (jednake: napola). Poruke za neočuvan zbroj, zbroj bez predznaka, zamjenu su automatske;
  krivo?: [{vrijednosti: [q₁, q₂], poruka}].`,
  primjer: {
    tip: "naboji_polje",
    nacin: "smjer",
    tekst:
      "Kamo pokazuje ukupno električno polje u točki T? Povuci strelicu iz točke T.",
    sredstvo: { er: 80, naziv: "voda" },
    naboji: [
      { oznaka: "q_1", q: 10, x: 0, y: 0 },
      { oznaka: "q_2", q: -15, x: 15, y: 0 },
    ],
    tocke: [{ oznaka: "T", x: 5, y: 0 }],
    cilj: { vektor: "E", tocka: "T" },
    prikazi: ["sastavnice"],
  },
  primjeri: [
    {
      tip: "naboji_polje",
      nacin: "istrazi",
      tekst:
        "Povuci sondu T i naboje. Mijenjaj predznak naboja $q_2$ i gledaj kako se polja u T zbrajaju ili oduzimaju.",
      sredstvo: { er: 80, naziv: "voda" },
      naboji: [
        { oznaka: "q_1", q: 10, x: 0, y: 0 },
        { oznaka: "q_2", q: -15, x: 15, y: 0 },
      ],
      tocke: [{ oznaka: "T", x: 5, y: 0 }],
      prikazi: ["polje", "sastavnice", "silnice"],
      klizaci: ["q_2"],
    },
    {
      tip: "naboji_polje",
      nacin: "istrazi",
      tekst:
        "Mijenjaj naboje i sredstvo, pomiči naboje i gledaj sile kojima djeluju jedan na drugoga.",
      sredstvo: { er: 80, naziv: "voda" },
      naboji: [
        { oznaka: "q_1", q: 10, x: 0, y: 0 },
        { oznaka: "q_2", q: -15, x: 15, y: 0 },
      ],
      prikazi: ["sile"],
      klizaci: ["q_1", "q_2", "er"],
    },
    {
      tip: "naboji_polje",
      nacin: "smjer",
      tekst:
        "Kamo djeluje sila na naboj $q_2$? Povuci strelicu iz naboja $q_2$.",
      naboji: [
        { oznaka: "q_1", q: 8, x: 0, y: 0 },
        { oznaka: "q_2", q: 25, x: 10, y: 0 },
      ],
      sredstvo: { er: 5, naziv: "staklo" },
      cilj: { vektor: "F", naboj: "q_2" },
    },
    {
      tip: "naboji_polje",
      nacin: "smjer",
      tekst:
        "U točku T stavimo naboj $-2$ nC. Kamo djeluje sila na njega? Povuci strelicu iz točke T.",
      naboji: [
        { oznaka: "q_1", q: 6, x: 0, y: 0 },
        { oznaka: "q_2", q: 6, x: 12, y: 0 },
      ],
      tocke: [{ oznaka: "T", x: 6, y: 6 }],
      cilj: { vektor: "F", tocka: "T", q: -2 },
    },
    {
      tip: "naboji_polje",
      nacin: "nula",
      tekst:
        "Naboji $q_1 = 4$ nC i $q_2 = 9$ nC razmaknuti su 15 cm. Postavi točku P u kojoj je ukupno električno polje nula.",
      naboji: [
        { oznaka: "q_1", q: 4, x: 0, y: 0 },
        { oznaka: "q_2", q: 9, x: 15, y: 0 },
      ],
    },
    {
      tip: "naboji_polje",
      nacin: "nula",
      tekst:
        "Naboji $q_1 = 2$ nC i $q_2 = -8$ nC razmaknuti su 10 cm. Gdje je ukupno polje nula? Postavi točku P.",
      naboji: [
        { oznaka: "q_1", q: 2, x: 0, y: 0 },
        { oznaka: "q_2", q: -8, x: 10, y: 0 },
      ],
    },
    {
      tip: "naboji_polje",
      nacin: "istrazi",
      tekst:
        "Povuci sondu kroz šupljinu (točka A), kroz metal (B), uz površinu (točka C) i dalje od kugle (D) i gledaj jakost polja.",
      kugla: { x: 0, y: 0, R: 20, R_unutra: 15, q: 40 },
      tocke: [
        { oznaka: "A", x: 0, y: 7 },
        { oznaka: "B", x: -17.5, y: 0 },
        { oznaka: "C", x: 20, y: 0 },
        { oznaka: "D", x: 40, y: 0 },
      ],
      prikazi: ["polje", "silnice", "Er_graf"],
    },
    {
      tip: "naboji_polje",
      nacin: "dodir",
      tekst:
        "Dvije jednake metalne kugle imaju naboje $+6$ nC i $-2$ nC. Kugle se kratko dodirnu i razdvoje. Koliki je naboj svake kugle nakon toga?",
      kugle: [
        { oznaka: "A", q: 6 },
        { oznaka: "B", q: -2 },
      ],
    },
    {
      tip: "naboji_polje",
      nacin: "istrazi",
      tekst:
        "Namjesti naboje kugli i dodirni ih. Pokušaj i „dotakni rukom“: kamo nestane naboj?",
      kugle: [
        { oznaka: "A", q: -9 },
        { oznaka: "B", q: 3 },
      ],
      klizaci: ["A", "B"],
      uzemljenje: true,
    },
  ],

  validate(s) {
    const { list, need } = problems();
    if (
      !need(
        NACINI.includes(s.nacin),
        `naboji_polje.nacin mora biti jedan od: ${NACINI.join(", ")}`,
      )
    )
      return list;
    need(isText(s.tekst), "naboji_polje treba „tekst“");
    const dodirScena =
      s.nacin === "dodir" || (s.nacin === "istrazi" && s.kugle != null);
    if (dodirScena) {
      need(
        s.naboji == null && s.kugla == null && s.tocke == null,
        "pokus dodira (kugle) ne smije imati i naboje, kuglu ili točke",
      );
      validateKugle(s, need);
      if (s.uzemljenje != null)
        need(
          s.nacin === "istrazi" && typeof s.uzemljenje === "boolean",
          "uzemljenje (true/false) postoji samo u načinu istrazi",
        );
    } else {
      need(
        s.kugle == null,
        "kugle postoje samo u pokusu dodira (nacin dodir ili istrazi bez naboja)",
      );
      validateScena(s, need);
    }
    if (s.nacin === "istrazi") {
      noAnswerFields(s, need);
      const imena = dodirScena
        ? (s.kugle ?? []).map((k) => k?.oznaka)
        : izvori(s);
      if (
        s.klizaci != null &&
        need(
          Array.isArray(s.klizaci) && s.klizaci.length <= 4,
          "klizaci: popis od najviše 4 oznake",
        )
      ) {
        s.klizaci.forEach((k) =>
          need(
            imena.includes(k) || (!dodirScena && k === "er"),
            `klizac „${k}“ nije oznaka naboja${dodirScena ? " (kugle)" : ', kugle ni "er"'}`,
          ),
        );
      }
      if (s.sredstva != null) {
        need(
          !dodirScena && Array.isArray(s.klizaci) && s.klizaci.includes("er"),
          'sredstva (izbor sredstva) imaju smisla samo uz klizač "er"',
        );
        need(
          Array.isArray(s.sredstva) &&
            s.sredstva.length >= 2 &&
            s.sredstva.length <= 5 &&
            s.sredstva.every(
              (m) =>
                isNum(m?.er) && m.er >= 1 && m.er <= 100 && isText(m?.naziv),
            ),
          "sredstva: 2–5 sredstava {er (1–100), naziv}",
        );
      }
      return list;
    }
    need(
      s.klizaci == null && s.sredstva == null,
      "klizaci i sredstva postoje samo u načinu istrazi",
    );
    if (s.nacin === "smjer") validateSmjer(s, need);
    if (s.nacin === "nula") validateNula(s, need);
    if (s.nacin === "dodir" && Array.isArray(s.kugle) && s.krivo != null) {
      const tocno = nakonDodira(s.kugle);
      if (need(Array.isArray(s.krivo), "krivo mora biti popis")) {
        s.krivo.forEach((k, i) => {
          need(
            Array.isArray(k?.vrijednosti) &&
              k.vrijednosti.length === 2 &&
              k.vrijednosti.every(isNum),
            `krivo[${i}].vrijednosti mora biti [q₁, q₂] u nC`,
          );
          need(isText(k?.poruka), `krivo[${i}].poruka mora biti tekst`);
          if (Array.isArray(k?.vrijednosti))
            need(
              !k.vrijednosti.every((v, j) => Math.abs(v - tocno[j]) < 1e-9),
              `krivo[${i}] je točan odgovor`,
            );
        });
      }
    }
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "smjer") return checkSmjer(s, odgovor);
    if (s.nacin === "nula") return checkNula(s, odgovor);
    if (s.nacin === "dodir") return checkDodir(s, odgovor);
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  tocanOdgovor(s) {
    if (s.nacin === "smjer") {
      const v = ciljniVektor(s);
      const kut = kutVektora(v.x, v.y);
      return `${opisSmjera(kut)} (${formatNumber(Math.round(kut))}°), iznos ${v.jedinica === "N" ? "F" : "E"} ≈ ${fmtIznos(v.iznos, v.jedinica)}`;
    }
    if (s.nacin === "nula") {
      const z = nulaInfo(s);
      if (!z) return "";
      const [a, b] = s.naboji;
      const r1 = Math.abs(z.s);
      const r2 = Math.abs(z.d - z.s);
      return `na pravcu kroz naboje, ${formatNumber(r1, 2)} cm od ${oznakaMd(a.oznaka)} i ${formatNumber(r2, 2)} cm od ${oznakaMd(b.oznaka)}${z.s > 0 && z.s < z.d ? " (između njih)" : ` (s vanjske strane naboja ${oznakaMd(r1 < r2 ? a.oznaka : b.oznaka)})`}`;
    }
    if (s.nacin === "dodir") {
      const t = nakonDodira(s.kugle);
      return s.kugle.map((k, i) => `${k.oznaka}: ${fmtNaboj(t[i])}`).join(", ");
    }
    return "";
  },
  brojcaniOdgovor: (s) =>
    s.nacin === "dodir" ? nakonDodira(s.kugle)[0] : null,
  // za komponentu: točka nultog polja (nula) i tolerancija u cm
  nula: (s) => nulaInfo(s),
};

// ── smjer ───────────────────────────────────────────────────────────────────────────────────────────
function validateSmjer(s, need) {
  const c = s.cilj;
  if (
    !need(
      c && ["E", "F"].includes(c.vektor),
      'smjer treba cilj: {vektor: "E" | "F", tocka | naboj}',
    )
  )
    return;
  if (c.naboj != null) {
    need(
      c.vektor === "F",
      'cilj.naboj ide samo uz vektor "F" (sila na taj naboj); polje u točki traži cilj.tocka',
    );
    need(c.tocka == null, "cilj ima ili tocka ili naboj, ne oboje");
    if (
      !need(
        (s.naboji ?? []).some((n) => n.oznaka === c.naboj),
        `cilj.naboj „${c.naboj}“ nije oznaka nijednog naboja`,
      )
    )
      return;
    need(
      (s.naboji ?? []).length + (s.kugla ? 1 : 0) >= 2,
      "sila na naboj treba barem još jedan naboj ili kuglu",
    );
  } else {
    if (
      !need(
        (s.tocke ?? []).some((t) => t.oznaka === c.tocka),
        "cilj.tocka mora biti oznaka jedne od točaka (tocke)",
      )
    )
      return;
    if (c.vektor === "F")
      need(
        isNum(c.q) && c.q !== 0,
        "sila u točki treba cilj.q (probni naboj u nC, različit od 0)",
      );
    else need(c.q == null, 'cilj.q ide samo uz vektor "F"');
  }
  if (s.tolerancija != null)
    need(
      isNum(s.tolerancija) && s.tolerancija >= 3 && s.tolerancija <= 30,
      "tolerancija (stupnjevi) mora biti između 3 i 30",
    );
  let v;
  try {
    v = ciljniVektor(s);
  } catch {
    return;
  }
  if (
    !need(
      isNum(v.iznos) && Number.isFinite(v.iznos),
      "vektor se ne može izračunati (točka je na naboju?)",
    )
  )
    return;
  const najveca = Math.max(...v.sastavnice.map((k) => k.iznos), 0);
  need(
    v.iznos > 0.02 * najveca && v.iznos > 0,
    'ukupni vektor je (gotovo) nula, pa nema smjera; za takvo pitanje koristi nacin "nula"',
  );
  if (
    s.krivo != null &&
    need(Array.isArray(s.krivo), "krivo mora biti popis")
  ) {
    const tocan = kutVektora(v.x, v.y);
    s.krivo.forEach((k, i) => {
      need(
        isNum(k?.kut),
        `krivo[${i}].kut mora biti broj (stupnjevi, 0° = udesno, 90° = gore)`,
      );
      need(isText(k?.poruka), `krivo[${i}].poruka mora biti tekst`);
      if (isNum(k?.kut))
        need(
          razlikaKuta(k.kut, tocan) > tolKut(s),
          `krivo[${i}].kut je unutar tolerancije točnog smjera`,
        );
    });
  }
}

const tolKut = (s) => (isNum(s.tolerancija) ? s.tolerancija : TOL_KUT);

function checkSmjer(s, odgovor) {
  if (!isNum(odgovor))
    return {
      tocno: false,
      poruka: "Povuci strelicu iz točke u smjeru koji misliš da je točan.",
      prazno: true,
    };
  const v = ciljniVektor(s);
  const tocan = kutVektora(v.x, v.y);
  const tol = tolKut(s);
  const diff = razlikaKuta(odgovor, tocan);
  if (diff <= tol) return { tocno: true };
  const hit = (s.krivo ?? []).find((k) => razlikaKuta(odgovor, k.kut) <= tol);
  if (hit) return { tocno: false, poruka: hit.poruka };
  const c = s.cilj;
  const sila = c.vektor === "F";
  const negProba = sila && c.tocka != null && c.q < 0;
  // sila na negativni probni naboj: učenik je nacrtao smjer polja
  if (negProba && diff >= 180 - tol)
    return {
      tocno: false,
      poruka:
        "To je smjer polja u točki. Naboj koji tamo stavljamo je negativan, a na negativan naboj sila djeluje suprotno od smjera polja.",
    };
  const vise = v.sastavnice.length >= 2;
  if (vise) {
    for (const k of v.sastavnice) {
      if (k.iznos === 0) continue;
      const kk = kutVektora(k.x, k.y);
      if (razlikaKuta(odgovor, kk) <= tol)
        return {
          tocno: false,
          poruka: sila
            ? `To je smjer sile samo od ${oznakaMd(k.oznaka)}. Nacrtaj i sile ostalih naboja i zbroji ih kao vektore.`
            : `To je smjer polja samo od ${oznakaMd(k.oznaka)}. Nacrtaj i polje od ostalih naboja, pa ih zbroji kao vektore.`,
        };
    }
  }
  if (diff >= 180 - tol) {
    if (sila && c.naboj != null)
      return {
        tocno: false,
        poruka:
          "Strelica pokazuje točno suprotno. Istoimeni naboji se odbijaju, a raznoimeni privlače: provjeri predznake.",
      };
    return {
      tocno: false,
      poruka:
        "Strelica pokazuje točno suprotno. Polje pozitivnog naboja pokazuje od njega, a polje negativnog naboja prema njemu.",
    };
  }
  if (diff <= 35)
    return {
      tocno: false,
      poruka: `Blizu si, ali smjer odstupa za oko ${Math.round(diff)}°. ${vise ? "Pazi koji je doprinos jači: bliži naboj i veći naboj daju jače polje." : "Strelica mora ležati na pravcu kroz naboj i točku."}`,
    };
  return {
    tocno: false,
    poruka:
      s.savjet ||
      (sila && c.naboj != null
        ? "Nije taj smjer. Za svaki drugi naboj odredi silu (odbijanje ili privlačenje, uzduž pravca kroz oba naboja), pa ih zbroji."
        : "Nije taj smjer. Za svaki naboj nacrtaj njegovo polje u točki (od pozitivnog, prema negativnom), pa ih zbroji kao vektore."),
  };
}

// ── nula ────────────────────────────────────────────────────────────────────────────────────────────
function nulaInfo(s) {
  if (!Array.isArray(s.naboji) || s.naboji.length !== 2) return null;
  const z = tockaNule(s.naboji[0], s.naboji[1]);
  if (!z) return null;
  return { ...z, tol: isNum(s.tolerancija) ? s.tolerancija : 0.03 * z.d };
}

function validateNula(s, need) {
  need(
    s.kugla == null,
    "nacin nula radi samo s točkastim nabojima (bez kugle)",
  );
  if (
    !need(
      Array.isArray(s.naboji) && s.naboji.length === 2,
      "nacin nula treba točno 2 naboja",
    )
  )
    return;
  if (!s.naboji.every((n) => isNum(n?.q) && isNum(n?.x) && isNum(n?.y))) return;
  const z = tockaNule(s.naboji[0], s.naboji[1]);
  if (
    !need(
      z,
      "jednaki naboji suprotnih predznaka nemaju točku nultog polja (osim beskonačno daleko); promijeni iznos jednog naboja",
    )
  )
    return;
  need(
    Math.abs(z.s) <= 3 * z.d && Math.abs(z.d - z.s) <= 3 * z.d,
    `točka nultog polja je predaleko (${formatNumber(Math.abs(z.s), 1)} cm od prvog naboja); izaberi naboje većeg omjera`,
  );
  if (s.tolerancija != null)
    need(
      isNum(s.tolerancija) && s.tolerancija > 0 && s.tolerancija <= 0.2 * z.d,
      "tolerancija (cm) mora biti pozitivna i najviše 20 % razmaka naboja",
    );
  need(s.cilj == null, "nacin nula ne treba cilj (točku računa aplikacija)");
}

function checkNula(s, odgovor) {
  if (!isNum(odgovor?.x) || !isNum(odgovor?.y))
    return {
      tocno: false,
      poruka: "Povuci točku P na mjesto gdje je polje nula.",
      prazno: true,
    };
  const z = nulaInfo(s);
  const [a, b] = s.naboji;
  if (Math.hypot(odgovor.x - z.x, odgovor.y - z.y) <= z.tol)
    return { tocno: true };
  const ux = (b.x - a.x) / z.d;
  const uy = (b.y - a.y) / z.d;
  const p = (odgovor.x - a.x) * ux + (odgovor.y - a.y) * uy; // položaj uzduž pravca od prvog naboja
  const okomito = Math.abs(-(odgovor.x - a.x) * uy + (odgovor.y - a.y) * ux);
  if (okomito > Math.max(z.tol, 0.08 * z.d))
    return {
      tocno: false,
      poruka:
        "Polje može biti nula samo na pravcu kroz oba naboja: izvan njega polja dvaju naboja nisu suprotnog smjera, pa se ne mogu poništiti.",
    };
  const isti = Math.sign(a.q) === Math.sign(b.q);
  const izmedu = p > 0 && p < z.d;
  const A = oznakaMd(a.oznaka);
  const B = oznakaMd(b.oznaka);
  if (isti && !izmedu)
    return {
      tocno: false,
      poruka:
        "Izvan para istoimenih naboja oba polja pokazuju na istu stranu, pa se zbrajaju. Polje se poništava između njih.",
    };
  if (!isti && izmedu)
    return {
      tocno: false,
      poruka:
        "Između raznoimenih naboja oba polja pokazuju prema negativnom naboju, pa se zbrajaju. Polje se poništava izvan njih.",
    };
  const manji = Math.abs(a.q) < Math.abs(b.q) ? a : b;
  if (!isti && p < 0 !== z.s < 0)
    return {
      tocno: false,
      poruka: `S ove strane je bliži veći naboj, pa njegovo polje uvijek prevlada. Točka je s druge strane, uz manji naboj (${oznakaMd(manji.oznaka)}).`,
    };
  // dobro područje, kriva udaljenost: r umjesto r² ili samo kriva strana ravnoteže
  const ra = Math.abs(p);
  const rb = Math.abs(z.d - p);
  const linearno = isti
    ? (z.d * Math.abs(a.q)) / (Math.abs(a.q) + Math.abs(b.q))
    : z.s < 0
      ? -(Math.abs(a.q) * z.d) / (Math.abs(b.q) - Math.abs(a.q))
      : (Math.abs(a.q) * z.d) / (Math.abs(a.q) - Math.abs(b.q));
  if (Math.abs(p - linearno) <= z.tol)
    return {
      tocno: false,
      poruka:
        "Izgleda da si udaljenosti postavio u omjeru naboja. Polje pada s kvadratom udaljenosti, pa vrijedi $\\frac{|q_1|}{r_1^2} = \\frac{|q_2|}{r_2^2}$.",
    };
  const Ea = Math.abs(a.q) / (ra * ra);
  const Eb = Math.abs(b.q) / (rb * rb);
  const jaci = Ea > Eb ? A : B;
  return {
    tocno: false,
    poruka:
      s.savjet ||
      `Ovdje je polje od ${jaci} jače, pa se ne poništavaju. Pomakni točku dalje od ${jaci}. Uvjet je $\\frac{|q_1|}{r_1^2} = \\frac{|q_2|}{r_2^2}$.`,
  };
}

// ── dodir ───────────────────────────────────────────────────────────────────────────────────────────
function checkDodir(s, odgovor) {
  const unos = Array.isArray(odgovor)
    ? odgovor.map((v) =>
        parseNumber(
          typeof v === "number" ? v : String(v ?? "").replace(/^\+/, ""),
          "nC",
        ),
      )
    : [];
  if (unos.length !== 2 || unos.some((v) => v == null))
    return {
      tocno: false,
      poruka: "Upiši naboj obje kugle u nC (npr. 2 ili −3,5).",
      prazno: true,
    };
  const [q1, q2] = s.kugle.map((k) => k.q);
  const t = nakonDodira(s.kugle);
  const Q = q1 + q2;
  const tol = Math.max(0.01, 0.005 * Math.max(Math.abs(q1), Math.abs(q2)));
  const blizu = (x, y) => Math.abs(x - y) <= tol;
  const par = (a, b) => blizu(unos[0], a) && blizu(unos[1], b);
  if (par(t[0], t[1])) return { tocno: true };
  const hit = (s.krivo ?? []).find((k) =>
    par(k.vrijednosti[0], k.vrijednosti[1]),
  );
  if (hit) return { tocno: false, poruka: hit.poruka };
  const jednake = Math.abs(t[0] - t[1]) < 1e-9 || Q === 0;
  if (par(q1, q2))
    return {
      tocno: false,
      poruka:
        "Kugle su metalne, dakle vodiči: dok se dodiruju, elektroni prelaze s jedne na drugu, pa se naboji promijene.",
    };
  if (par(q2, q1) && q1 !== q2)
    return {
      tocno: false,
      poruka:
        "Kugle nisu samo zamijenile naboje. Dok se dodiruju, ponašaju se kao jedno tijelo i ukupni naboj se razmjesti po obje.",
    };
  const zbroj = unos[0] + unos[1];
  if (!blizu(zbroj, Q)) {
    const abs = (Math.abs(q1) + Math.abs(q2)) / 2;
    if (
      jednake &&
      Math.abs(q1) !== Math.abs(q2) &&
      par(abs, abs) &&
      Math.sign(q1) !== Math.sign(q2)
    )
      return {
        tocno: false,
        poruka: `Zbrojio si iznose bez predznaka. Naboje zbrajaj s predznacima: (${fmtNaboj(q1)}) + (${fmtNaboj(q2)}) = ${fmtNaboj(Q)}.`,
      };
    if (par(Q, Q))
      return {
        tocno: false,
        poruka: `Ukupni naboj ${fmtNaboj(Q)} dijele obje kugle zajedno: svaka dobije dio, a ne cijeli iznos.`,
      };
    if (par(-t[0], -t[1]))
      return {
        tocno: false,
        poruka:
          "Iznos je dobar, ali predznak nije. Zbroji naboje s predznacima: prevladava naboj većeg iznosa.",
      };
    return {
      tocno: false,
      poruka: `Naboj se ne stvara ni ne gubi: zbroj nakon dodira (${fmtNaboj(zbroj)}) mora biti jednak zbroju prije (${fmtNaboj(Q)}).`,
    };
  }
  if (jednake)
    return {
      tocno: false,
      poruka:
        "Zbroj je dobar, ali kugle su jednake, pa nema razloga da jedna dobije više: ukupni naboj dijele napola.",
    };
  return {
    tocno: false,
    poruka:
      "Zbroj je dobar, ali veća kugla dobije veći dio: ukupni naboj dijeli se u omjeru polumjera.",
  };
}
