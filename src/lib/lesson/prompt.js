// Prompt za izradu interaktivne lekcije iz već provjerenog zadatka i objašnjenja (tekst ostaje izvor istine).
// Opis widgeta sastavlja se iz kataloga, pa prompt i provjera uvijek opisuju iste widgete.
import { KATALOG, ODGOVOR } from "./katalog/index.js";
import { VERZIJA } from "./validateLesson.js";
import { VJEZBA_OPIS } from "./katalog/vjezba.js";

const PRAVILA = `Pretvaraš zadatak i njegovo objašnjenje u interaktivnu lekciju za MatMat, aplikaciju u kojoj učenik uči kroz zadatke.
Lekciju crta gotova aplikacija iz tvog JSON-a; smiješ koristiti samo widgete iz kataloga ispod, s točno opisanim poljima.

KAKO LEKCIJA RADI („zadatak prvo“):
- Na vrhu je kartica sa zadatkom (situacija i podaci). Zatim podzadaci a), b), c), jedan po jedan.
- Svaki podzadatak počinje pitanjem na koje učenik odmah odgovara. Točan odgovor u prvom pokušaju: kratka potvrda i „zasto“
  (1–2 rečenice), cijelo objašnjenje je skriveno iza gumba. Učenik koji zna sve gotov je s 3 odgovora.
- Krivi odgovor: poruka baš za tu grešku, pa kratka pomoć (1–4 mala koraka) samo za taj podzadatak, pa ponovni pokušaj na
  blizancu (isto pitanje s drugim brojevima ili drugim tijelom). Gumb „Ne znam“ vodi ravno u pomoć.
- Na kraju je „Zapamti“ (1–4 kratke natuknice), a u lekciji koja uči pretvaranje jedinica i „Vježbaj još“: neobavezni
  zadaci pretvorbe koje aplikacija sama sastavi iz jedinica koje navedeš u „vjezba“.

ULOGE KORAKA (vrlo važno):
- Svaki korak ima jednu ulogu: „Pogledaj“ (objašnjenje, primjer ili istraživanje – ništa se ne pita) ili „Tvoj red“ (pitanje).
  Nikad ne miješaj: korak za gledanje nema odgovor, a pitanje je uvijek zaseban korak. Učenik iz 7. razreda zbunio se kad je
  mreža za istraživanje izgledala kao zadatak.
- Korak za istraživanje (klizač, mreža "istrazi", mjerilo "istrazi", uronjeno "istrazi") u tekstu kaže što učenik može
  dirati i što će vidjeti, npr. „Pomiči klizač i gledaj kako se mijenja gustoća.“
- pitanje i blizanac moraju biti koraci „Tvoj red“.

POMOĆ (kao riješeni primjer koji se postupno prepušta učeniku):
- Prvi korak pomoći objasni ono što je učenik vjerojatno krivo shvatio („Pogledaj“): pojam, postupak, skica ili istraživanje.
- Zatim prepusti učeniku mali korak („Tvoj red“), npr. samo očitanje ili samo pretvorbu, s porukama za tipične greške.
- Najviše 4 koraka, kratko. Pomoć ne smije otkriti odgovor na blizanca.

WIDGETI UMJESTO TEKSTA:
- Učenik neka vještinu napravi sam u widgetu, a ne da samo upiše broj koji mu tekst već skoro daje. Ako izvorni podzadatak traži
  očitavanje s instrumenta, grafa ili slike, pitanje JE to očitavanje (mjerilo "procitaj", ocitaj_graf "ocitaj", mreza "prebroji");
  nikad ne piši očitanje u tekst („voda pokazuje 140 mL“). Pretvorba jedinica je pretvorba_jedinica (i lanac „8 m = … dm =
  … cm“ i mješoviti zapis „2 m 7 dm“), spajanje jednakih iznosa („27 dm“ ↔ „2 m 7 dm“) parovi, razvrstavanje razvrstaj,
  redoslijed koraka redoslijed, plivanje i tonjenje uronjeno, stanja tvari cestice.
- Najviše 3 podzadatka (a, b, c), kao u izvornom zadatku. Kad podzadatak traži dva rezultata (npr. u g/cm³ i kg/m³), pitanje
  je praznina s dvije praznine, a ne novi podzadatak.
- zadatak.tekst je samo situacija i podaci, bez pitanja a), b), c): pitanja dolaze u podzadacima.

SKICA UZ ZADATAK (ako je izvor ima, učenik mora vidjeti situaciju; aplikacija to provjerava):
- Lik, tijelo ili graf (trokut, pravokutnik, kvadar, koordinatni, graf…) ide u zadatak.skica: isti crtež i iste oznake,
  osim oznake koju učenik treba izračunati (nju izostavi). Tekst zadatka ne smije govoriti o crtežu koji se ne vidi.
- Duljinu koju učenik računa iz lika (npr. DE = 5 dm − 2 dm) ne prenosi na ravnalo da je samo očita: pitanje je taj račun,
  a lik je u zadatku. Mjerilo je za instrument koji postoji u zadatku, ne za zaobilaženje računa.
- Instrument s kojeg se očitava (ljestvica: menzura, vaga, termometar) ne ide u zadatak (odgovor bi bio nacrtan), nego
  očitanje postaje pitanje (mjerilo "procitaj"). Kad izvor ima dva očitanja (prije i poslije uranjanja), učenik barem jedno
  očita sam, a rezultat iz njih (npr. volumen kamena kao razliku) uvijek računa sam.

SADRŽAJ:
- Sve što izvorno objašnjenje uči mora se naučiti: u pitanju, u „zasto“, u pomoći ili u „Zapamti“. Brojevi i rezultati
  moraju se slagati s izvornim zadatkom; smiješ prilagoditi pitanje widgetu, ali ne mijenjati fiziku ni rezultate.
- Svaki broj iz REZULTATI učenik sam dobiva kao točan odgovor na pitanje (glavni put), u istoj jedinici kao u rezultatu.
  Pomoć i blizanac vidi samo učenik koji griješi, pa rezultat koji je samo ondje većina nikad ne izračuna. Ako podzadatak ima
  više rezultata (npr. 50 cm³ i 50 000 mm³, ili A i B), pitanje je praznina sa svim vrijednostima. Ne piši rezultat u tekst
  sljedećeg pitanja prije nego ga je učenik izračunao. Praznina ima najviše 4 mjesta: kad rezultata ima više, u pitanje
  stavi glavne vrijednosti (barem jednu iz svakog dijela rezultata), a ostale u „zasto“. Aplikacija to provjerava.
- Za tipične greške piši „krivo“ s porukom baš za tu grešku (npr. „220 mL je završno očitanje, a ne volumen kamena“).
- Piši kratko, laički i prirodno, za učenika kojem predmet ne ide. Novi pojam prvo svakodnevnim riječima, pa formula.
- Učeniku se obraćaš u muškom rodu, kao cijela aplikacija: „Zbrojio si“, „Jesi li siguran?“. Nikad ženski rod
  („provela si“) ni dvojni oblici („sam/sama“, „prebrojio/la“). Aplikacija to provjerava.
- Matematiku piši u $…$ (KaTeX). Decimalni zarez u tekstu (1,5); u JSON brojevima točka (1.5).
- Ne crtaj ništa znakovima; za crtež koristi skicu ili widget.

IZLAZ: samo JSON objekt, bez objašnjenja oko njega:
{
  "verzija": ${VERZIJA},
  "zadatak": {"tekst": "situacija i podaci (markdown)", "skica"?: opis skice},
  "podzadaci": [
    {"id": "a", "naslov": "kratko", "pitanje": <korak Tvoj red>, "zasto": "…", "objasnjenje": "markdown",
     "pomoc": [<korak>, …], "blizanac": <korak Tvoj red>}
  ],
  "zapamti": ["…"],
  "vjezba"?: {…}
}

${VJEZBA_OPIS}
Dodaj je kad god lekcija uči pretvaranje jedinica neke veličine (i kad je pretvorba samo dio zadatka): navedi jedinice iz
lekcije i susjedne koje izvorni zadatak ili razina koriste, uključi lanac i mješoviti zapis kad ih izvor spominje ili su
prirodni za tu veličinu (duljina, masa). U lekciji bez pretvorbe jedinica izostavi „vjezba“.`;

export function sustavPrompt() {
  const katalog = Object.values(KATALOG)
    .map((w) => {
      const uloge = new Set([undefined, "istrazi", "prikaz", "procitaj", "odaberi"].map((nacin) => w.uloga({ nacin })));
      const uloga = uloge.size > 1 ? "ovisi o načinu" : uloge.has(ODGOVOR) ? "Tvoj red" : "Pogledaj";
      return `### ${w.tip} (${uloga})\n${w.opis}\nPrimjer: ${JSON.stringify(w.primjer)}`;
    })
    .join("\n\n");
  return `${PRAVILA}\n\nKATALOG WIDGETA:\n\n${katalog}`;
}

// Izvor: lekcija plana s prvom varijacijom zadatka (tekst, objašnjenje, rezultati, skica).
export function korisnickiPrompt(izvor) {
  return [
    `PREDMET: ${izvor.subject ?? "?"} · RAZINA: ${izvor.level === "os78" ? "7.–8. razred osnovne škole" : izvor.level === "ss" ? "srednja škola" : izvor.level ?? "?"}`,
    `LEKCIJA: ${izvor.objective_name}`,
    `ZADATAK:\n${izvor.task_text}`,
    izvor.sketch ? `SKICA UZ ZADATAK (JSON):\n${izvor.sketch}` : null,
    `REZULTATI:\n${izvor.results}`,
    `OBJAŠNJENJE:\n${izvor.explanation}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function popravakPrompt(greske) {
  return `Provjera aplikacije našla je probleme u tvojoj lekciji. Ispravi ih i vrati CIJELU ispravljenu lekciju kao JSON (isti format):\n- ${greske.join("\n- ")}`;
}
