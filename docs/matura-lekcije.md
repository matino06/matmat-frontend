# Interaktivne lekcije za Matematiku A (ručna izrada)

Lekcije za zadatke predmeta *Matematika A razina* (course_id 1) ne radi automatska izrada (OpenRouter), nego ih
piše Claude Code (Opus, pretplata). Zato smiju koristiti i widgete samo za ručnu izradu (`samoRucno` u katalogu):
`izraz`, `interval` i `graf_funkcije` (src/lib/lesson/katalog/matematika.js). Prompt za automatsku izradu ih ne
opisuje (`ZA_PROMPT` u katalog/index.js), ali validator i aplikacija ih znaju provjeriti i nacrtati.

Aplikacija prikazuje interaktivnu lekciju čim je `task.lesson_ui` upisan, bez obzira na predmet. 45 od 53 lekcije
Matematike A dijele zadatke s Matematikom B, pa lekcije vide i ti učenici.

## Tijek

1. Izvor iz baze (samo čitanje) → `lab-out/matura/izvor-*.json` (task_id, tekst, objašnjenje; `results` je prazan,
   točan odgovor je samo u objašnjenju).
2. Lekcija → `lab-out/matura/lekcije/<task_id>.json` (format kao `lesson_ui`, `verzija: 1`).
3. Provjera: `node scripts/lab/matura-provjeri.mjs [task_id …]` – validator mora javiti 0 grešaka; upozorenja
   pregledaj. Skripta zapisuje i `lab-out/matura-lab/` za pregled na `/lab/lekcija?mapa=matura-lab` (dev).
4. Upis u bazu (`UPDATE task SET lesson_ui = … WHERE task_id = … AND lesson_ui IS NULL`) tek uz odobrenje.

## Pravila sadržaja

Vrijede sva pravila iz `src/lib/lesson/prompt.js` (PRAVILA): zadatak prvo, uloge koraka („Pogledaj“ / „Tvoj red“),
pomoć 1–4 koraka koja počinje objašnjenjem i prepušta učeniku mali korak, blizanac s drukčijim brojevima **i
drukčijim rezultatom**, „krivo“ s porukom baš za tipičnu grešku, muški rod, kratko i laički, KaTeX u `$…$`.
Uz to, za maturu:

- **Matematika mora biti točna.** Svaki broj u lekciji (odgovori, krivo, blizanci, točke na grafu, vrhovi) provjeri
  računom (npr. `node -e`), ne napamet. Krivi odgovori u „krivo“ moraju biti stvarne tipične greške, različite od
  točnog.
- Podzadaci prate korake rješenja iz objašnjenja (npr. sredi → nultočke → interval). Najviše 3.
- Učenik **radi** u widgetu: interval označava na pravcu, parametre očitava s grafa, izraz upisuje kao na papiru.
- Graf mora biti čitljiv: mreža po jedinici (`korak_x`, `korak_y`), vrhovi i nultočke koje učenik očitava na
  cijelim brojevima, raspon osi s malo zraka oko grafa.
- Blizanac je novi primjer iste vještine (drugi brojevi, drugi graf), uvijek drukčiji od zadatka i od svih
  blizanaca u drugim lekcijama iste teme (ne kopiraj blizance iz predloška).
- Zapis intervala kao u hrvatskim školama: ⟨ ⟩ za otvoren kraj, [ ] za zatvoren, uz ±∞ uvijek otvoren.
- „objasnjenje“ je cijelo rješenje (kao izvorno, ali jasnije), „zasto“ 1–2 rečenice s računom.

## Widgeti samo za ručnu izradu

Puni opis polja je u `opis` svakog widgeta u `katalog/matematika.js`; primjeri su u lab katalogu.

- `izraz` – odgovor u matematičkom polju (MathLive) s tipkovnicom probne mature (`src/lib/utils/maturaTipkovnica.js`):
  razlomak, korijen, π i potencija iscrtavaju se odmah. Polje daje LaTeX, provjera ga čita (`izLatexa`); točno je sve iste vrijednosti
  (`varijable: ["x"]` za izraze s x). `bilo_kojim_redom` za nultočke, `iza` za tekst iza polja („$> 0$“),
  `graf` za graf iznad polja (graf_funkcije „prikaz“), `krivo: [{odgovor, poruka}]`. Približna decimalna vrijednost
  točnog izraza dobiva poruku da upiše točnu vrijednost (osim uz `priblizno: true`).
- `interval` – „odaberi“: učenik na pravcu s točkama `tocke` bira dijelove i pune/prazne točke; `odgovor` u zapisu
  `"<-inf, 1> U [3, inf>"`; „prikaz“ samo pokazuje skup.
- `graf_funkcije` – „prikaz“ (s `crte`, `strelice`, `tocke`, `istakni: {znak: ">0"}`), „istrazi“ (klizači),
  „poklopi“ (učenik klizačima poklopi svoj graf s grafom iz zadatka; `cilj`). `zadatak.graf` je graf uz zadatak.

Predlošci: lekcije 108 (kvadratna nejednadžba) i 34 (parametri trigonometrijske funkcije s grafa) u
`lab-out/matura/lekcije/`.
