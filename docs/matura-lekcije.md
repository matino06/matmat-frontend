# Interaktivne lekcije za Matematiku A (ručna izrada)

Lekcije za zadatke predmeta *Matematika A razina* (course_id 1) ne radi automatska izrada (OpenRouter), nego ih
piše Claude Code (Opus, pretplata). Zato smiju koristiti i widgete samo za ručnu izradu (`samoRucno` u katalogu):
`izraz`, `interval` i `graf_funkcije` (src/lib/lesson/katalog/matematika.js). Prompt za automatsku izradu ih ne
opisuje (`ZA_PROMPT` u katalog/index.js), ali validator i aplikacija ih znaju provjeriti i nacrtati.

Aplikacija prikazuje interaktivnu lekciju čim je `task.lesson_ui` upisan, bez obzira na predmet. 45 od 53 lekcije
Matematike A dijele zadatke s Matematikom B, pa lekcije vide i ti učenici.

## Tijek

1. Izvor iz baze (samo čitanje) → `lab-out/matura/izvor-sve.json` (svi zadaci predmeta: task_id, cilj, tekst,
   objašnjenje; `results` je prazan, točan odgovor je samo u objašnjenju).
2. Lekcija → `lab-out/matura/lekcije/<task_id>.json` (format kao `lesson_ui`, `verzija: 1`).
3. Provjera: `node scripts/lab/matura-provjeri.mjs [task_id …]` – validator mora javiti 0 grešaka; upozorenja
   pregledaj. Skripta zapisuje i `lab-out/matura-lab/` za pregled na `/lab/lekcija?mapa=matura-lab&z=<task_id>` (dev).
   Crteže pogledaj kao slike: `node scripts/lab/crtez.mjs <task_id>` → `lab-out/matura/crtezi/*.png` (svaki graf i
   geometrijski crtež lekcije, svijetla tema).
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
- **Objašnjenje mora biti barem jednako detaljno kao tekstualno** (učenici hvale baš to). „objasnjenje“ svakog
  podzadatka je cijelo rješenje tog koraka: svaki korak, pravilo i napomena iz izvornog objašnjenja (metoda, knjižica
  formula i stranica, kalkulator, „skica ne mora biti precizna“…), napisano jasnije. Zadnji podzadatak završava
  konačnim rezultatom.
- **Pitanje ne daje formulu.** Pitanje i blizanac kažu samo što se traži (podaci, veličina, jedinica, oblik
  odgovora). Formula, zakon, pravilo, uputa na knjižicu formula i stranicu te odlomak koji uči pojam idu u prvi `pojam`
  korak pomoći, jer učenik prvo sam pokuša. Iznimke: formula iz teksta izvornog zadatka i korak kojemu je zadatak baš
  izabrati formulu.
- **Kalkulator kao u izvoru.** Kad izvor korak rješava kalkulatorom (*upišemo u kalkulator*, *upotrijebimo
  kalkulator*, *obavezno prebaci kalkulator u stupnjeve*, slika s uputama), taj korak i u lekciji ide kalkulatorom:
  pitanje to kaže, prvi korak pomoći je `pojam` s vlasnikovom slikom kalkulatora (`<img src=…>` iz izvora; gdje izvor
  ima samo „u stupnjeve“, slika `kalkulator_deg.png`) i tipkama za fx-991EX i fx-991ES, a ručni put ostaje samo kao
  drugi način u `objasnjenje`. Kad izvor kalkulator navodi samo kao drugu mogućnost (*ili pomoću kalkulatora*,
  *mogla se riješiti pomoću kalkulatora*), ručni put ostaje, a lekcija u tom koraku napomene da se može i
  kalkulatorom (uz sliku ako je izvor ima). Kalkulator nikad ne smije biti samo u `krivo`.
- Svaka slika iz izvornog objašnjenja postaje `graf` podzadatka (graf_funkcije „prikaz“ s istim oznakama: nultočke,
  istaknuti dio, crte, strelice). Prikazuje se uz „Pokaži cijelo objašnjenje“ i u „Cijelo rješenje“ na kraju, pa
  graf vidi i učenik koji je sve znao odmah (pomoć vidi samo onaj koji griješi).
- „zasto“ je 1–2 rečenice s računom i sadrži konačni odgovor u zapisu kakav traži matura (npr. interval).
- Ista riječ ne smije značiti dvije stvari (npr. „razmak od vrha do dna“ okomito i vodoravno).

## Widgeti samo za ručnu izradu

Puni opis polja je u `opis` svakog widgeta u `katalog/matematika.js`; primjeri su u lab katalogu.

- `izraz` – odgovor u matematičkom polju (MathLive) s tipkovnicom probne mature (`src/lib/utils/maturaTipkovnica.js`):
  razlomak, korijen, π i potencija iscrtavaju se odmah. Polje daje LaTeX, provjera ga čita (`izLatexa`); točno je sve iste vrijednosti
  (`varijable: ["x"]` za izraze s x). `bilo_kojim_redom` za nultočke, `iza` za tekst iza polja („$> 0$“),
  `graf` za graf iznad polja (graf_funkcije „prikaz“), `krivo: [{odgovor, poruka}]`. Približna decimalna vrijednost
  točnog izraza dobiva poruku da upiše točnu vrijednost (osim uz `priblizno: true`).
- `interval` – „odaberi“: učenik na pravcu s točkama `tocke` bira dijelove i pune/prazne točke; `odgovor` u zapisu
  `"<-inf, 1> U [3, inf>"` (i `R \ {-4}`, `{1; 2}`, ∩); „upisi“: učenik sam piše zapis skupa u matematičko polje
  (tipkovnica se otvara na kartici ⟨ ⟩ [ ] ∪ ∞ ℝ; točan je svaki zapis istog skupa); „prikaz“ samo pokazuje skup.
  Kad zadatak traži „zapiši rješenje kao interval“, zadnji korak neka bude „upisi“ (na maturi se zapis piše).
- `podzadatak.graf` – graf uz cijelo objašnjenje (vidi pravila sadržaja).
- `graf_funkcije` – „prikaz“ (s `crte`, `strelice`, `tocke`, `istakni: {znak: ">0"}`), „istrazi“ (klizači),
  „poklopi“ (učenik klizačima poklopi svoj graf s grafom iz zadatka; `cilj`). `zadatak.graf` je graf uz zadatak.
  Isti crtež je i **geometrija**: `osi: false` (bez osi), `likovi`, `duzine`, `kruznice`, `kutovi` (luk ili pravi kut),
  `vektori`, `tekstovi`, točke s `polozaj` i `prazna`, funkcija s `od`/`do` (dio grafa), `os_x`/`os_y` („Re“, „Im“).
  Tijelo u prostoru: točke `[x, y, z]` (z visina, y dubina), crta se kosom projekcijom; skrivene bridove crtaj
  `isprekidano`. Raspon x i y mora čuvati omjer (validator to provjerava). Svaka slika iz izvora (trokut, tijelo,
  vektori, Gaussova ravnina, brojevna kružnica) postaje takav crtež.
- `izraz` čita i `\log_{b}`, stupnjeve (`70^\circ` = 70) i `%` (kad je `iza: "%"`, učenik ga ne mora pisati). Za ±
  ili više rješenja koristi više polja (`bilo_kojim_redom`).

Predlošci: lekcije 108 (kvadratna nejednadžba) i 34 (parametri trigonometrijske funkcije s grafa) u
`lab-out/matura/lekcije/`. Primjeri geometrije i upisa intervala su u lab katalogu (`?z=katalog`).
