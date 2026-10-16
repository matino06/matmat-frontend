# Interaktivne lekcije

Laboratorij za interaktivne lekcije vlastitih predmeta: model iz postojećeg zadatka i objašnjenja napiše JSON spec, a
aplikacija ga crta widgetima iz kataloga. Zašto baš tako: [ADR 0001](adr/0001-interaktivne-lekcije-iz-kataloga-widgeta.md).
Ništa od ovoga još nije u produkciji: nema promjena baze ni backenda, a stranica `/lab/lekcija` postoji samo u dev načinu.

## Gdje je što

| Datoteka | Što radi |
|---|---|
| `src/lib/lesson/katalog/` | Widgeti kao čista logika: uloga, opis za prompt, primjer, provjera speca, provjera odgovora, točan odgovor |
| `src/lib/lesson/validateLesson.js` | Provjera cijele lekcije (građa, uloge, svi widgeti); greške i upozorenja |
| `src/lib/lesson/prompt.js` | System prompt (pravila + katalog) i korisnički prompt iz izvornog zadatka |
| `src/lib/lesson/core/` | Brojevi (hrvatski zapis), siguran kalkulator izraza, jedinice, ponovljivo miješanje |
| `src/lib/lesson/komponente/` | Svelte komponenta za svaki widget; `Korak.svelte` dodaje oznaku uloge |
| `src/lib/lesson/LessonRunner.svelte` | Tok „zadatak prvo“: pokušaj → pomoć → blizanac → sažetak |
| `src/routes/lab/lekcija/` | Pregled generiranih lekcija (samo dev): lekcija, izvorni tekst, provjera, JSON |
| `scripts/lab/izvezi-izvor.sh` | Izvoz prvih varijacija vlastitih predmeta u `lab-out/source.json` (read-only) |
| `scripts/lab/generiraj-lekcije.mjs` | Izrada specova preko OpenRoutera, provjera, jedan popravak, stvarni trošak |

`lab-out/` je u `.gitignore`: to je sadržaj kreatora i ne ide u repozitorij ni u build.

## Kako se pokreće

```bash
scripts/lab/izvezi-izvor.sh ../matmat-backend
OPENROUTER_API_KEY=… node scripts/lab/generiraj-lekcije.mjs --paralelno 2   # --samo 393,403  --preskoci-gotove  --model …
pnpm run dev   # pa http://localhost:5173/lab/lekcija
```

Za isprobavanje prompta i provjere bez OpenRoutera: `--pruzatelj claude` zove lokalni `claude` CLI (pretplata,
Sonnet 5.5 piše, Haiku 5.5 popravlja). `--izvor` i `--mapa` biraju ulaz i izlaz u `lab-out/`, a lab ih prikazuje
na `/lab/lekcija?mapa=<mapa>`:

```bash
node scripts/lab/generiraj-lekcije.mjs --pruzatelj claude --izvor source.json --mapa lab-sonnet --paralelno 3
```

Skripta s OpenRouterom troši kredit (oko $0.06 po lekciji). Ne pokretati je na ključu s kojeg radi produkcijska izrada
ako na računu nema dovoljno kredita: kad kredit padne na nulu, kreatorima stane izrada predmeta.

## Format lekcije (verzija 1)

```jsonc
{
  "verzija": 1,
  "zadatak": { "tekst": "situacija i podaci, bez pitanja", "skica": { /* opcionalno, kao skica uz zadatak */ } },
  "podzadaci": [
    {
      "id": "a",                    // a | b | c, najviše 3
      "naslov": "Volumen kamena",
      "pitanje": { "tip": "mjerilo", "nacin": "procitaj", … },   // uvijek „Tvoj red“
      "zasto": "1–2 rečenice za onoga tko je odmah točno odgovorio",
      "objasnjenje": "cijelo objašnjenje (skriveno dok ga učenik ne otvori)",
      "pomoc": [ /* 1–4 koraka: najprije „Pogledaj“, pa mali „Tvoj red“ */ ],
      "blizanac": { /* isto pitanje s novim brojevima; „Tvoj red“ */ }
    }
  ],
  "zapamti": ["1–4 kratke natuknice"]
}
```

### Uloge koraka

- **Pogledaj** (`pojam`, `postupak`, `skica`, `cestice` prikaz) i **Istraži** (`klizac`, `ocitaj_graf` prikaz, te `mjerilo`,
  `mreza` i `uronjeno` u načinu `istrazi`): plava oznaka, nikad ne traže odgovor, gumb „Dalje“ uvijek radi.
- **Tvoj red** (sva pitanja i widgeti u načinu s odgovorom): oznaka u boji aplikacije, uvijek polje ili izbor.
- Validator odbija korak za gledanje s poljem odgovora (`odgovor`, `tocno`, `krivo`, `ocitaj`…) i pitanje ili blizanca
  koji nije „Tvoj red“. Uvedeno nakon što je učenica iz 7. razreda mrežu za istraživanje shvatila kao zadatak.
- U koraku „Tvoj red“ widget ne smije odati odgovor: graf ne ispisuje vrijednosti s krivulje, mjerilo kod „postavi“ i
  mreža kod „oznaci“ ne pokazuju zbroj dok učenik ne provjeri, a stube jedinica smiju samo u pomoći.

### Vjernost izvornom zadatku

Lekcija nastaje iz provjerenog teksta, pa validator dobiva i njegove rezultate i skicu (`validateLesson(l, { rezultati, skica })`):

- **Skica ostaje vidljiva.** Lik, tijelo ili graf iz izvora mora biti u `zadatak.skica`. Instrument (`ljestvica`:
  menzura, vaga…) smije umjesto toga postati pitanje `mjerilo` „procitaj“. Uvedeno jer je lekcija o površini lika u
  obliku slova L izgubila lik, a učenik je dobio samo ravnalo s već nanesenom duljinom.
- **Rezultati su na glavnom putu.** Svaki dio rezultata (odvojen točkom-zarezom, bez obrazloženja iza „jer“) treba
  barem jednu vrijednost koja je točan odgovor nekog pitanja, a ne samo u pomoći ili tekstu. Ostale vrijednosti istog
  dijela (lanac „8 L = 80 dL = 8000 mL“) samo su upozorenje, jer praznina ima najviše 4 mjesta. Uvedeno jer su litre
  u lekciji o menzuri bile samo iza „Ne znam“. Isto pravilo našlo je 7 lekcija Fizike 7 u kojima učenik očita završnu
  razinu, a volumen tijela (glavni rezultat) nikad ne izračuna.

### Tok podzadatka

Pokušaj → (krivo ili „Ne znam“) → pomoć, korak po korak → blizanac. Nakon prvog krivog ponovnog pokušaja učenik može
sam otvoriti točan odgovor; nakon drugog se prikaže sam. Ishod podzadatka (odmah / uz pomoć / pokazan odgovor) daje
prijedlog ocjene za ponavljanje: 5 / 3 / 1.

## Widgeti verzije 1 (pokrivaju Fiziku 7)

| Widget | Uloga | Točan odgovor računa |
|---|---|---|
| `pojam`, `postupak`, `skica` | Pogledaj | – |
| `klizac` | Istraži | – (izrazi se računaju uživo) |
| `broj`, `izbor`, `vise_tocnih`, `tocno_netocno`, `praznina`, `parovi`, `redoslijed`, `razvrstaj` | Tvoj red | spec |
| `mjerilo` (ravnalo, menzura, vaga, termometar; procitaj / postavi / istrazi s uranjanjem) | ovisi o načinu | spec, + „podjeljak previše/premalo“ |
| `mreza` (istrazi / prebroji / oznaci) | ovisi o načinu | **kod**: (cijeli + polovice/2)·a² |
| `ocitaj_graf` (prikaz = Istraži / ocitaj) | ovisi o načinu | **kod** iz funkcije, + „drugi graf“, „druga os“ |
| `pretvorba_jedinica` (jedna, lanac „8 m = … dm = … cm“, mješoviti „2 m 7 dm“) | Tvoj red | **kod**, + „faktor kao za duljinu“, „krivi smjer“, „prepisan broj“, „isti iznos u drugoj jedinici“ |
| `cestice` (prikaz / odaberi) | ovisi o načinu | spec |
| `uronjeno` (istrazi / predvidi) | ovisi o načinu | **kod** iz gustoća |

`parovi` s iznosima na obje strane („27 dm“ ↔ „2 m 7 dm“) validator provjerava kodom: svaki par mora biti jednak.

### Vježbaj još

Lekcija koja uči pretvaranje jedinica smije imati `"vjezba": {"velicina", "jedinice", "lanac"?, "mjesovito"?}`. Nakon
„Zapamti“ učenik dobije 4–8 zadataka pretvorbe koje sastavlja kod (`katalog/vjezba.js`, najviše dva koraka po stubama,
rezultati od 0,001 do milijun), s „Nova vježba“ za nove brojeve. Neobavezno je, ne ulazi u ocjenu za ponavljanje i ne
košta ništa. Uvedeno jer materijali za 7. razred imaju stranice i stranice „Pretvori!“, a lekcija ima samo tri pitanja
vjerna tekstualnom zadatku. U Marijinom predmetu Sonnet ga je dodao u 9 od 11 lekcija (sve s pretvorbom).

Daljnji widgeti po predmetima (matematika, fizika, kemija, biologija) i redoslijed izrade su u katalogu iz istraživanja;
dodaju se kad se laboratorij proširi na druge predmete.

## Izmjereno u laboratoriju (Fizika 7, 37 lekcija)

| | GPT-6.1 Sol + Haiku popravak (kao backend) | Sonnet 5.5 (prvih 9) |
|---|---|---|
| Prolazi provjeru | 36 / 37 (29 iz prve) | 8 / 9 (6 iz prve) |
| Trošak po lekciji | medijan $0.047, prosjek $0.052, najviše $0.095 | medijan $0.060, prosjek $0.093, najviše $0.234 |
| Vrijeme | medijan 69 s | medijan 27 s |
| Koraka po lekciji (s pomoći) | 14,6 | 13,5 |

Za usporedbu, današnja tekstualna varijacija stoji oko $0.03. Jedina neuspjela lekcija pala je jer je Haikuov popravak
vratio prekinut JSON; u produkciji takav zadatak ostaje tekstualan. Model i dalje najviše bira `pojam`, `praznina`,
`izbor` i `broj`; vizualne widgete (graf, tijela u tekućini, mreža) koristi kad ih zadatak izravno traži, češće u pomoći.

Nakon pravila o vjernosti izvoru (Sonnet 5.5 medium + Haiku 5.5 popravak, lokalno preko `claude` CLI-ja): Fizika 7
37 / 37 (29 iz prve), Marijin predmet (fizika, 7. razred, 11 lekcija) 11 / 11. Najčešći popravak: očitanje s menzure
napisano u tekst umjesto da je pitanje.

## Produkcija (faza 1, web)

Kod je spreman, ali ništa nije pušteno. Redoslijed je obavezan, jer backend ima `ddl-auto=validate`:

1. Na produkcijskoj bazi pokreni `matmat-backend/sql/2026-10-15-vlastiti-predmet-10-interaktivne-lekcije.sql`
   (`course.lesson_format`, `task.lesson_ui`). Bez toga se novi backend ne pokrene.
2. Deploy backenda: `LessonUiStep` nakon 1. varijacije zadatka u predmetu s oblikom „interaktivno“ izradi lekciju
   istim modelom kao zadatke (`own-courses.models.writer`, GPT-6.1 Sol), provjeri je (`LessonUi`, GraalJS), a ako ne
   prođe, jeftiniji model (`own-courses.models.cheap`, Haiku) je jednom popravi.
   Ne troši kvotu kreatora i ne odgađa „Spremno za učenje“: dok lekcije nema, zadatak je tekstualan.
3. Deploy frontenda: izbor „Oblik lekcija“ u uređivaču plana (vidi se tek kad ga backend vraća), a `/tasks` i
   `/ponavljanje` prikazuju lekciju kad zadatak ima `lessonUi`, uz „Prikaži kao tekst“. Ocjena za ponavljanje se
   predlaže iz izvedbe; učenik je potvrđuje ili mijenja.

**Promjena kataloga, validatora ili prompta**: nakon izmjene u `src/lib/lesson/` pokreni
`node scripts/lesson/paket-za-backend.mjs`, pa commitaj i `matmat-backend/src/main/resources/lesson/lesson.js`.
Backend inače provjerava i piše prompt starim kodom.

Odluke uzete kao zadane (može se promijeniti): interaktivna izrada ne troši kvotu kreatora; oblik se bira jednom, uz
način učenja; interaktivna verzija postoji samo za 1. varijaciju (varijacije 2–4 ostaju tekst, faza 2).

## Faza 2

- Varijacije 2–4 s interaktivnom verzijom (jeftiniji model po predlošku 1. varijacije).
- AI chat dobiva i gdje je učenik zapeo u lekciji.
- iOS: isti renderer kroz WKWebView.
- Widgeti za ostale predmete (katalog iz istraživanja), i modelu samo widgeti tog predmeta.
