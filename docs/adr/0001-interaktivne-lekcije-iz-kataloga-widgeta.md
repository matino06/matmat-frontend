# 0001: Interaktivne lekcije iz kataloga widgeta, ne iz generiranog koda

**Status:** prihvaćeno (laboratorij), listopad 2026.

## Kontekst

Danas jedan model za svaku lekciju plana napiše tekst zadatka i objašnjenja. Želimo i interaktivnu verziju: učenik
očitava menzuru, broji kvadratiće, razvrstava, a krivi odgovor dobiva poruku baš za tu grešku. Dva prototipa (lekcija o
gustoći i lekcija o površini) pokazala su da je to izvedivo i da se učenicima sviđa, ali i dvije stvari:

- Kad model sam piše HTML i JavaScript za lekciju, rezultat izgleda dobro, ali svaka je lekcija drugačija, točnost se ne
  može provjeriti kodom, a generirani JS u pregledniku mogao bi pročitati token prijave.
- Linearna lekcija od 14–25 koraka predugačka je: učenik koji gradivo zna mora proći sve.

## Odluka

1. **Model piše samo JSON spec; aplikacija ga crta gotovim widgetima.** Katalog widgeta (`src/lib/lesson/katalog/`) je
   ugovor između modela, validatora i renderera. Svaki widget ima opis za prompt, provjeru speca, provjeru odgovora i
   točan odgovor. Opis u promptu sastavlja se iz kataloga, pa prompt i provjera nikad ne opisuju različite widgete.
2. **Točne odgovore gdje god se može računa kod, ne model**: pretvorbe jedinica, površina iz mreže, očitanje s grafa,
   plivanje iz gustoća. Tipične krive vrijednosti (faktor kao za duljinu, polovice brojane kao cijeli, podjeljak previše,
   druga os grafa) dodaju se automatski s porukom.
3. **„Zadatak prvo“**: lekcija počinje pitanjima podzadataka; tko odgovori točno, dobiva samo kratko „zašto“. Pomoć
   (najviše 4 koraka, kao riješeni primjer koji se postupno prepušta učeniku) i blizanac s novim brojevima pojavljuju se
   samo nakon krivog odgovora ili „Ne znam“. Uporište: efekt predtestiranja, expertise reversal, worked-example fading.
4. **Svaki korak ima jednu ulogu, vidljivu na prvi pogled**: „Pogledaj/Istraži“ (plavo, nikad ne traži odgovor) ili
   „Tvoj red“ (uvijek ima polje ili izbor). Učenica iz 7. razreda mrežu za istraživanje shvatila je kao zadatak; validator
   zato odbija korak za gledanje s poljem odgovora i pitanje koje nije „Tvoj red“.
5. **Spec je dodatak tekstu, ne zamjena.** Zadatak zadržava `task_text`, `explanation`, `results`, `sketch`; interaktivna
   verzija je dodatno polje. AI chat, ponavljanje, admin i iOS aplikacija rade s tekstom bez promjena.
6. **Validator je čisti JS** (`src/lib/lesson/validateLesson.js` i katalog), kao `taskSketch.js`, da ga backend može
   izvršiti u GraalJS-u prije spremanja: što prođe provjeru, aplikacija sigurno prikaže i može provjeriti.

## Posljedice

- Kvaliteta lekcije ovisi o potpunosti kataloga: što widget ne zna, model mora zaobići tekstom. Katalog se proširuje
  po predmetima (vidi `docs/interaktivne-lekcije.md`); modelu se šalju samo widgeti tog predmeta.
- Format speca ima `verzija`; renderer mora podržavati stare verzije ili se specovi regeneriraju.
- Izrada je oko 2–4× skuplja od samog teksta (izmjereno u laboratoriju, vidi dokument), ali i dalje reda centi po lekciji.
- iOS za sada prikazuje tekstualnu verziju; poslije može koristiti isti renderer kroz WKWebView.
