# Koje tipove skica podržati: matematika, fizika, kemija, biologija

Istraživanje za [#7](https://github.com/matino06/matmat-frontend/issues/7), nastavak na [`svg-skice.md`](svg-skice.md). Stanje izvora: 13. 10. 2026.

**Pitanje:** koje vrste crteža uz zadatke treba podržati renderer „SVG skica iz JSON opisa“ za matematiku, fiziku, kemiju i biologiju (državna matura, srednja škola te 7. i 8. razred)? Za svaki tip: koliko se često pojavljuje, kakav JSON model može pouzdano napisati, što kod može provjeriti i koje knjižnice pomažu.

Polazište ostaje kakvo je bilo: model piše samo JSON opis poznatog tipa, kod provjerava opis i sam računa koordinate, a kad provjera padne, zadatak ide bez skice ([`svg-skice.md`](svg-skice.md)). Prototip već ima šest tipova: trokut, kružnica s tetivom, graf funkcije, koordinatni sustav, sile na kosini i jednostavni strujni krug ([`src/routes/prototype-skice/sketch.js` na grani `prototype/svg-skice`](https://github.com/matino06/matmat-frontend/blob/prototype/svg-skice/src/routes/prototype-skice/sketch.js)).

## Kratki odgovor

1. Pregledano je **26 ispita državne mature** s 1 080 zadataka: matematika A i B, fizika, kemija i biologija, ljetni odnosno prvi rok 2022.–2026., plus drugi rok fizike 2025. **Crtež ima 265 zadataka (24,5 %).** Po predmetima: biologija 39,6 %, fizika 22,4 %, matematika A 20,5 %, kemija 18,3 % i matematika B 16,9 %. Tablicu podataka ima još 52 zadatka.
2. Od 275 crteža **73 % se može deterministički nacrtati iz kratkog opisa**, 12 % djelomično, a **14 % nikako** (fotografije, anatomske i realistične ilustracije). Gotovo svi crteži koji se ne mogu generirati su iz biologije: tamo je takvih 36 %, a u ostalim predmetima 0 %.
3. **Najveća pojedinačna skupina su grafovi svih vrsta: 75 od 275 crteža (27 %), u sva četiri predmeta.** To su graf funkcije, x-t i v-t graf, Φ-t, c-t, krivulja topljivosti, p-V proces, titracijska krivulja i stupčasti dijagram. Zato je najisplativiji korak **proširiti postojeći tip `graf` u općeniti „graf veličina“** s nazivima i jedinicama na osima, točkama iz podataka i krivuljama po dijelovima.
4. Iza toga, po čestoći i izvodljivosti, dolaze:
   - geometrijski lik (24 % crteža u matematici),
   - koordinatni sustav s vektorima i brojevnom kružnicom,
   - **električno i magnetsko polje** (naboji, vodiči, petlja u polju; najčešći tip u fizici, 29 % crteža),
   - **strukturna formula iz SMILES-a i reakcijska shema** (37 % crteža u kemiji),
   - statistički dijagrami,
   - prostorno tijelo u kosoj projekciji,
   - mali biološki tipovi (kladogram, rodoslovlje, Punnettov kvadrat, kromosomi s alelima, Vennov dijagram).
5. Knjižnice: **smiles-drawer** za kemiju (MIT, 59 KB gzip, SVG, svijetla i tamna tema, crta i reakcije). RDKit.js je preteško za preglednik (WASM ima 2,4 MB gzip). **@dagrejs/dagre** služi za raspored mreža (MIT, 17 KB gzip), a **d3-hierarchy** za stabla (ISC, 6 KB gzip). Za sve ostalo, tj. tijela, polja, optiku, strujne krugove i rodoslovlje, dovoljan je **vlastiti renderer**. Gotove JS knjižnice tamo ne postoje ili ne odgovaraju (detalji u odjeljku 3).
6. **Ne pokušavati:** anatomske crteže, crteže stanica i organela, fotografije, karte, realističnu laboratorijsku i mjernu aparaturu te 3D crteže magneta i zavojnica. Crteža koji nisu D ima 73 od 275 (27 %), a 61 od njih je u biologiji.
7. Važno za dizajn:
   - **Četvrtina crteža u fizici je u ponuđenim odgovorima A–D** (13 od 52). Renderer mora podržati namjerno pogrešne varijante za distraktore.
   - U 7 zadataka iz matematike učenik **sam crta** u prazni koordinatni sustav, a katalozi traže skiciranje entalpijskih dijagrama i grafova ([KEM katalog str. 76](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf), [FIZ katalog str. 28](https://www.ncvvo.hr/wp-content/uploads/2026/09/FIZ-2027.pdf)). Isti tipovi zato služe i za **crteže u rješenjima**.

## Metoda

- **Ispiti:** hrvatske verzije ispitnih knjižica s [ncvvo.hr, „Provedeni ispiti“](https://www.ncvvo.hr/kategorija/drzavna-matura/provedeni-ispiti/), popis i poveznice u tablici „Izvori ispita“. Oznaka `MATA25 zad. 9` znači knjižicu iz te tablice i broj zadatka. Prijevodi na talijanski, srpski i mađarski nisu brojani, jer imaju isti sadržaj.
- **Postupak:** svaka stranica s zadatcima je iscrtana u PNG (PyMuPDF), a zatim je **svaka stranica pregledana vizualno**. Naslovnice, upute, prazne stranice i listovi za odgovore su preskočeni (provjereno skriptom da nijedna preskočena stranica ne sadrži zadatak). Tekst je izvučen samo radi brojeva zadataka.
  - Matematika: 2 ispita × 5 godina, 202 stranice.
  - Fizika: 6 ispita, 138 stranica.
  - Kemija: 5 ispita, 142 stranice.
  - Biologija: 5 ispita, 170 stranica.
- **Jedinica brojanja:** „crtež“ je jedan zasebni prikaz. Ako su četiri ponuđena odgovora A–D četiri grafa, to je jedan zapis s oznakom „A–D“. „Zadatak s crtežom“ je glavni broj zadatka (36.1 i 36.2 su zadatak 36) koji ima barem jedan crtež koji nije tablica. Tablice su brojane odvojeno, jer ih markdown već prikazuje.
- **Izvodljivost (gen):**
  - **D:** deterministički iz parametara.
  - **DJ:** shematski, ali bi trebao poseban, složen ili jednokratan predložak.
  - **N:** fotografija ili realistična, odnosno anatomska ilustracija.
- **Ograničenja:**
  - Razvrstavanje je napravljeno jednim prolazom, bez drugog ocjenjivača. Granica DJ/N u biologiji je subjektivna.
  - Prazni koordinatni sustavi za odgovor (7 u matematici) ubrojeni su kao crtež. Brojke bez njih su navedene posebno.
  - U kemiji i biologiji 2022.–2024. druga knjižica ponovno broji od 1, pa su zadatci u kemiji preimenovani u 36–47 (IK-2 zad. n = 35 + n).
- **Popis svih crteža po ispitu** je u prilogu na kraju, pa se svaki broj može provjeriti.

## 1. Inventar crteža u ispitima

### Sažetak po predmetima

| Predmet      | Ispita | Zadataka | Zadataka s crtežom | Bez praznih KS | S tablicom  | Crteža | D          | DJ        | N         |
| ------------ | ------ | -------- | ------------------ | -------------- | ----------- | ------ | ---------- | --------- | --------- |
| Matematika A | 5      | 210      | 43 (20,5 %)        | 38 (18,1 %)    | 3 (1,4 %)   | 45     | 43         | 2         | 0         |
| Matematika B | 5      | 160      | 27 (16,9 %)        | 25 (15,6 %)    | 5 (3,1 %)   | 27     | 27         | 0         | 0         |
| Fizika       | 6      | 210      | 47 (22,4 %)        | 47             | 3 (1,4 %)   | 52     | 43         | 9         | 0         |
| Kemija       | 5      | 235      | 43 (18,3 %)        | 43             | 10 (4,3 %)  | 43     | 42         | 1         | 0         |
| Biologija    | 5      | 265      | 105 (39,6 %)       | 105            | 31 (11,7 %) | 108    | 47         | 22        | 39        |
| **Ukupno**   | 26     | 1 080    | **265 (24,5 %)**   |                | 52 (4,8 %)  | 275    | 202 (73 %) | 34 (12 %) | 39 (14 %) |

Broj zadataka po ispitu: MAT A ima 40 (2022.–2024.) ili 45 (2025.–2026.), MAT B 30 ili 35, fizika 35 ([FIZ katalog str. 11](https://www.ncvvo.hr/wp-content/uploads/2026/09/FIZ-2027.pdf)), kemija 47, a biologija 48–55.

### Matematika (A i B zajedno, 72 crteža u 370 zadataka)

| Tip                              | Crteža (A + B) | Udio crteža | Napomena                                                                                                                                                     |
| -------------------------------- | -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Graf funkcije u mreži (`M-GRAF`) | 12 + 5 = 17    | 24 %        | pravci, parabole, hiperbole, sinusoide, polinom 3. stupnja, po dijelovima linearna funkcija; **5 puta kao odgovori A–D** (npr. MATA25 zad. 9, MATA26 zad. 8) |
| Ravninski lik (`M-LIK`)          | 10 + 7 = 17    | 24 %        | trokuti s visinom ili dužinom, trapez, paralelogram, pravilni šesterokut, kut presječen paralelnim pravcima (Talesov poučak), kružnica s promjerom           |
| Koordinatni sustav (`M-KOORD`)   | 8 + 2 = 10     | 14 %        | od toga **7 praznih mreža u koje učenik crta** (npr. MATA25 zad. 38), vrhovi trokuta, kompleksna ravnina                                                     |
| Prostorno tijelo (`M-TIJELO`)    | 6 + 2 = 8      | 11 %        | kocka i kvadar ABCDEFGH (istaknut pravac ili trokut), četverostrana piramida sa skrivenim bridovima crtkano, Rubikova kocka                                  |
| Statistički dijagram (`M-STAT`)  | 1 + 6 = 7      | 10 %        | stupčasti, linijski s dvije serije, kružni, 100 % složeni stupčasti; **većina u MAT B**                                                                      |
| Vektori (`M-VEKTOR`)             | 2 + 3 = 5      | 7 %         | vektori u kvadratnoj mreži, dvaput kao odgovori A–D                                                                                                          |
| Brojevna kružnica (`M-TRIGKRUG`) | 3 + 0          | 4 %         | točka E(t) na jediničnoj kružnici u mreži (MATA24 zad. 33, MATA25 zad. 11)                                                                                   |
| Skica situacije (`M-SITUACIJA`)  | 3 + 0          | 4 %         | trokut na karti plaže (D); promatrač s kutom elevacije i karta otoka s nepravilnom obalom (DJ)                                                               |
| Brojevni pravac, lik u mreži     | 0 + 2          | 3 %         | MATB24 zad. 1 i 14                                                                                                                                           |

Svi crteži u matematici osim dva mogu se nacrtati iz opisa. Katalog izričito traži „analizu grafičkog prikaza funkcije“, „prikaz operacija sa skupovima i rješenja nejednadžbi s pomoću intervala“ i „baratanje podatcima prikazanima na različite načine“ ([MAT katalog str. 9–13](https://www.ncvvo.hr/wp-content/uploads/2026/09/MAT-2027.pdf)). Na ispitu je od geometrijskog pribora dopušteno samo ravnalo ([isto, str. 16](https://www.ncvvo.hr/wp-content/uploads/2026/09/MAT-2027.pdf)), pa je točna skica u zadatku jedini pouzdan crtež koji učenik ima.

### Fizika (52 crteža u 210 zadataka)

| Tip                                      | Crteža | Udio | Napomena                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Električno i magnetsko polje (`F-POLJE`) | 15     | 29 % | **5 električnih**: naboji u vrhovima kvadrata (FIZ22 zad. 9), parovi naboja, nabijene ploče s protonom, šuplja kugla. **10 magnetskih**: paralelni vodiči ⊗ i ⊙ (FIZ24 zad. 14, FIZ25 zad. 13 i 33), petlja koja ulazi u polje B, magnet i petlja. Tri su 3D crteža magneta ili zavojnice (DJ) |
| Graf veličina (`F-GRAF`)                 | 11     | 21 % | Q-ΔT, I-U, i-t, p-dubina, Φ-t, Ui-t, X_L-ω, I-r, Ek-f, Ep-y; **4 puta kao odgovori A–D**                                                                                                                                                                                                       |
| Sile i mehanički sustav (`F-SILE`)       | 6      | 12 % | kutija s kosom silom koja vuče ili gura (FIZ26 zad. 2), dva utega preko koloture (FIZ25 zad. 27), tijela jedno na drugom (FIZ23 zad. 2, A–D), kosina prema okomitom dizanju (FIZ25 zad. 3); kamion na kosini i ljudi s konopom su DJ                                                           |
| Graf gibanja x-t i v-t (`F-GRAF-GIB`)    | 3      | 6 %  | x-t po dijelovima (parabola, vodoravno, pravac), v-t pravac                                                                                                                                                                                                                                    |
| p-V kružni proces (`F-PV`)               | 3      | 6 %  | pravokutnik, trokut, proces A–F s izobarama i izohorama                                                                                                                                                                                                                                        |
| Valovi (`F-VAL`)                         | 3      | 6 %  | stojni val na niti i u dva trenutka, interferencijska slika Youngova pokusa                                                                                                                                                                                                                    |
| Strujni krug (`F-KRUG`)                  | 2      | 4 %  | izvor s unutarnjim otporom i paralelni otpornici (FIZ26 zad. 33); četiri spoja četiriju otpornika kao A–D (FIZ25drugi zad. 12)                                                                                                                                                                 |
| Atom (`F-ATOM`)                          | 2      | 4 %  | energijske razine s prijelazima (D); shema Rutherfordova pokusa (DJ)                                                                                                                                                                                                                           |
| Hidrostatika, aparatura                  | 4      | 8 %  | U-cijev sa živom i vodom (D); Cartesijev ronilac, tikvica s manometrom, dinamometar (DJ)                                                                                                                                                                                                       |
| Optika, putanja, ostalo                  | 3      | 6 %  | lom zrake kroz staklo (A–D), satelit na kružnoj putanji (A–D), planeti kao krugovi (A–D)                                                                                                                                                                                                       |

U fizici je **13 od 52 crteža u ponuđenim odgovorima**, a ukupno su grafovi (`F-GRAF`, `F-GRAF-GIB`, `F-PV`) trećina crteža. Katalog među vještinama navodi „prikazuje [sile] dijagramom sila“ i „povezuje grafičke prikaze fizičkih pojava“ ([FIZ katalog str. 22](https://www.ncvvo.hr/wp-content/uploads/2026/09/FIZ-2027.pdf)), a eksperimentalni dio uključuje sliku u ravnom zrcalu i žarišnu daljinu sabirne leće ([str. 30](https://www.ncvvo.hr/wp-content/uploads/2026/09/FIZ-2027.pdf)). Leće se u ispitima pojavljuju kao tablice mjerenja (FIZ23 zad. 30, FIZ26 zad. 30), ne kao crtež zraka.

### Kemija (43 crteža u 235 zadataka)

| Tip                                          | Crteža | Udio | Napomena                                                                                                                     |
| -------------------------------------------- | ------ | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| Graf (`K-GRAF`)                              | 15     | 35 % | c-t za sudionike reakcije (6), fazni dijagram p-T (3), krivulja topljivosti (3), parcijalni tlakovi u ravnoteži (2), m-V (1) |
| Strukturna ili kosturna formula (`K-STRUKT`) | 11     | 26 % | npr. ibuprofen (KEM23 zad. 13), askorbinska kiselina, valin, Fischerova formula glukoze (KEM25 zad. 47); jednom kao A–D      |
| Reakcijska shema (`K-REAKC`)                 | 5      | 12 % | slijed reakcija kosturnim formulama, npr. „propanal → A i B“ (KEM25 zad. 44)                                                 |
| GHS piktogrami                               | 4      | 9 %  | standardni simboli opasnosti (KEM24 zad. 11, KEM26 zad. 16)                                                                  |
| Laboratorijsko posuđe i aparatura            | 3      | 7 %  | Erlenmeyerova tikvica, lijevak za odjeljivanje, aparatura za dobivanje CO₂ (DJ)                                              |
| Elektrokemijski članak                       | 2      | 5 %  | elektroliza s Cu i Fe elektrodama, galvanski članak sa solnim mostom                                                         |
| Titracijska krivulja                         | 2      | 5 %  | CH₃COOH s NaOH (KEM24 zad. 44), H₂SO₄ s NaOH (KEM25 zad. 41)                                                                 |
| Entalpijski dijagram                         | 1      | 2 %  | kristalizacija CH₃COONa (KEM23 zad. 33)                                                                                      |

Katalog kemije ima posebne primjere zadataka u kojima pristupnik **crta**: entalpijski dijagram, Lewisovu strukturnu formulu i strukturne formule organskih spojeva ([KEM katalog str. 76–78](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf)). Traži i „prikazati zadani elektrokemijski članak crtežom i/ili shematski“ ([str. 20](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf)), „analizirati fazni dijagram čistih tvari“ ([str. 11](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf)) i „očitati podatke prikazane crtežom, modelima, tablicama i grafovima“ ([str. 13](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf)).

### Biologija (108 crteža u 265 zadataka)

| Tip                                    | Crteža | Udio | gen            | Napomena                                                                                                                                |
| -------------------------------------- | ------ | ---- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Anatomska ilustracija (`B-ANAT`)       | 16     | 15 % | 15 N, 1 DJ     | nefron, oko, alveole, probavni sustav, spolni sustav, refleksni luk, optok krvi                                                         |
| Shema procesa (`B-PROCES`)             | 16     | 15 % | 6 D, 5 DJ, 5 N | D: membranski potencijal, povratna inhibicija, glikoliza kao reakcijska shema; N: životni ciklusi s ilustracijama                       |
| Graf (`B-GRAF`)                        | 16     | 15 % | 16 D           | 8 linijskih (rast bakterija, predator-plijen, antitijela), 7 stupčastih, 1 kružni; jednom kao A–D (BIO23 zad. 8)                        |
| Stanica, organeli, dioba (`B-STANICA`) | 14     | 13 % | 5 N, 9 DJ      | mitohondrij, kloroplast, euglena, faze mitoze, stanice zapornice                                                                        |
| Fotografija ili mikrografija           | 9      | 8 %  | N              | organizmi, cvatovi, mikrografije                                                                                                        |
| Ostalo                                 | 8      | 7 %  | 6 D, 2 N       | **2 Vennova dijagrama** (BIO24 zad. 29, BIO26 zad. 3), ekološke piramide, model kocki (omjer površine i volumena), 2 karte Hrvatske (N) |
| Kladogram, filogenetsko stablo, ključ  | 7      | 6 %  | 6 D, 1 N       | kladogrami s praznim poljima za upis (BIO24 zad. 43, BIO26 zad. 37), dihotomni ključ                                                    |
| Molekularna shema (`B-MOL`)            | 6      | 6 %  | 2 D, 4 DJ      | tRNA, DNA → mRNA → aminokiselina (D); membrana, dišni lanac (DJ)                                                                        |
| Kromosomi s alelima, kariogram         | 5      | 5 %  | D              | homologni kromosomi s lokusima, inverzija, kariogram                                                                                    |
| Hranidbena mreža                       | 4      | 4 %  | 1 D, 3 DJ      | DJ jer su čvorovi ilustracije organizama; kao čvorovi s nazivima su D                                                                   |
| Rodoslovlje                            | 3      | 3 %  | D              | hemofilija, cistična fibroza, 4 rodoslovna stabla kao A–D (BIO24 zad. 25)                                                               |
| Punnettov kvadrat, pokus               | 2      | 2 %  | D              | prazan kvadrat 2×2 za upis (BIO23 zad. 54), U-cijev za osmozu                                                                           |
| Ilustracija ekosustava                 | 2      | 2 %  | N              |                                                                                                                                         |

Biologija ima i najviše **tablica (31 zadatak, 11,7 %)**, od toga 3 puta tablicu genetskog koda. Katalog izričito navodi praćenje svojstava „na rodoslovnome stablu“, križanja i test-križanja ([BIO katalog str. 29](https://www.ncvvo.hr/wp-content/uploads/2026/09/BIO-2027.pdf)), filogenetsko stablo ([str. 32](https://www.ncvvo.hr/wp-content/uploads/2026/09/BIO-2027.pdf)), hranidbeni lanac i mrežu ([str. 43](https://www.ncvvo.hr/wp-content/uploads/2026/09/BIO-2027.pdf)) te da zadatci „mogu sadržavati … skice, sheme, dijagrame, crteže ili grafičke prikaze“ ([str. 56](https://www.ncvvo.hr/wp-content/uploads/2026/09/BIO-2027.pdf)).

### Svi predmeti: grafovi su najveća skupina

| Skupina „graf“                                   | Crteža               |
| ------------------------------------------------ | -------------------- |
| graf funkcije (MAT)                              | 17                   |
| graf u biologiji (linijski, stupčasti, kružni)   | 16                   |
| graf u kemiji (c-t, fazni, topljivost, p-t, m-V) | 15                   |
| graf veličina u fizici                           | 11                   |
| statistički dijagram (MAT)                       | 7                    |
| x-t i v-t, p-V                                   | 6                    |
| titracijska krivulja, entalpijski dijagram       | 3                    |
| **ukupno**                                       | **75 od 275 (27 %)** |

Svi ti crteži imaju istu građu: dvije osi s nazivom i jedinicom, jednu ili više krivulja (izraz, točke iz podataka ili krivulja po dijelovima) i istaknute točke. Zato je jedan dobro napravljen tip najisplativiji.

### 7. i 8. razred osnovne škole

Za nacionalne ispite u 8. razredu nisam našao objavljene ispite kakvi postoje za državnu maturu ([kategorija „Nacionalni ispiti“ na ncvvo.hr](https://www.ncvvo.hr/kategorija/nacionalni-ispiti/)). NCVVO objavljuje [Vodič kroz sadržaj i strukturu nacionalnih ispita u 8. razredu](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf) s po 5 primjera zadataka po predmetu. U njima:

| Predmet    | Primjera s crtežom | Crteži                                                                                                                                                                                     | Izvor (Vodič)                                                                                                  |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Matematika | 2 od 5             | kut β za konstrukciju simetrale (rješenje je crtež), graf dviju linearnih ovisnosti cijena-sati                                                                                            | [str. 165–168](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf) |
| Biologija  | 5 od 5             | položaj organa u tijelu (N), linijski graf brojnosti virnjaka (D), slijed organizacijskih razina u okvirima (D), shema oplodnje s ilustracijama (N), hranidbena mreža s ilustracijama (DJ) | [str. 176–179](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf) |
| Kemija     | 1 od 5             | model atoma s oznakama čestica (DJ), uz to tablica topljivosti                                                                                                                             | [str. 186–188](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf) |
| Fizika     | 0 od 5             | nema                                                                                                                                                                                       | [str. 194–197](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf) |

Ishodi koje Vodič navodi pokazuju koji tipovi trebaju osnovnoj školi:

- **Matematika:** konstrukcija kuta, trokuta i četverokuta, crtanje točaka u koordinatnom sustavu, opseg i površina mnogokuta i kruga, linearna ovisnost, prikazivanje podataka ([str. 161–163](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf)).
- **Fizika:** zakonitost ravnoteže **poluge** (FIZ OŠ B.7.4) i jednostavni **strujni krug** s grananjem struje (FIZ OŠ D.8.2, D.8.3) ([str. 191–192](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf)). Popis formula sadrži F₁·ℓ₁ = F₂·ℓ₂ i serijski i paralelni spoj otpornika ([str. 197](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf)).
- **Kemija:** očitavanje brojčanih, tabličnih i grafičkih prikaza, npr. topljivosti ([str. 184](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf)).
- **Biologija:** tablični i grafički prikaz rezultata istraživanja ([str. 174](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf)).

Zaključak: za 7. i 8. razred ne trebaju novi tipovi, nego jednostavnije varijante istih: graf, lik i kut, koordinatni sustav, strujni krug sa žaruljicom i sklopkom, poluga kao prizor u tipu `sile`, hranidbena mreža i stupčasti dijagram.

## 2. Tipovi: opis, provjera, koordinate

### Opće pravilo za brojeve (iz pokusa u prototipu)

Pravi poziv u prototipu pokazao je da pravilo „svaki broj iz skice mora biti u tekstu“ odbacuje ispravne skice: kut kosine bio je izveden iz visine i duljine ([commit `fbe73c8` na `prototype/svg-skice`](https://github.com/matino06/matmat-frontend/commit/fbe73c8)). Prijedlog za sve tipove:

- Svako brojčano polje u opisu ima **izvor**: `"tekst"` (mora se pojaviti u tekstu zadatka) ili `"izvedeno"`.
- Izvedenu vrijednost **kod ponovo izračuna iz relacije** tog tipa (N = G·cos α, b = af/(a−f), λ = 2L/n, R_ekv…) i usporedi s modelovom vrijednošću uz toleranciju.
- Neslaganje znači da je pogrešan opis ili rješenje. Provjera skice tako ujedno **provjerava rješenje**.
- Na crtežu se izvedena vrijednost prikazuje simbolom (α, b), osim ako je i ona u tekstu.
- Distraktori (crteži u odgovorima A–D) imaju oznaku `"varijanta": "netocna"`. Za njih kod provjerava samo da su nacrtljivi i **da se razlikuju** od točne varijante, ne relacije.

### Proširenja postojećih tipova

**1. `graf` → graf veličina** (pokriva 75 crteža, sve predmete)

```json
{
  "tip": "graf",
  "x": { "velicina": "t", "jedinica": "s", "od": 0, "do": 6 },
  "y": { "velicina": "v", "jedinica": "m/s", "od": -4, "do": 5 },
  "krivulje": [
    {
      "oznaka": "v(t)",
      "tocke": [
        [0, 4],
        [6, -3]
      ],
      "izvor": "tekst"
    },
    { "oznaka": "f", "izraz": "x^2-4*x+3", "domena": [0, 4] }
  ],
  "istakni": [{ "x": 0, "y": 4 }],
  "asimptote": { "y": [1] }
}
```

- **Provjera:** istaknute točke leže na krivulji (već u prototipu). Točke podataka moraju biti u tekstu ili tablici zadatka. Izvedene veličine (nagib v-t grafa = a, površina ispod = put) računa kod.
- **Koordinate:** deterministički (uzorkovanje izraza, linearna interpolacija točaka).
- **Podvarijante:**
  - **p-V proces:** `{"stanja":{"1":[1,100],"2":[3,100],"3":[1,300]},"procesi":[["1","2","izobarno"],…]}`, gdje kod provjerava da izobara ima isti p, izohora isti V, a izoterma isti pV, i računa rad kao površinu.
  - **Titracijska krivulja:** model daje c i V kiseline i lužine (i Ka za slabu kiselinu), a kod računa pH i provjerava ekvivalentni volumen c·V/c_b.
  - **Entalpijski dijagram:** razine reaktanata i produkata, ΔH i Ea, uz provjeru da predznak ΔH odgovara riječi „egzotermna“ ili „endotermna“ u tekstu.
  - **Energijske razine atoma:** razine u eV i prijelazi, uz provjeru E_foton = ΔE.
- **Knjižnica:** vlastito uzorkovanje kao u prototipu, ili [function-plot](https://github.com/mauriciopoppe/function-plot) (vidi odjeljak 3). Za izraze treba parser, ne `eval` (prototip to već navodi).
- **Trud:** srednji.

**2. `koordinatni` + vektori + brojevna kružnica** (19 crteža u matematici)

```json
{
  "tip": "koordinatni",
  "x": [-5, 5],
  "y": [-4, 4],
  "mreza": true,
  "tocke": [{ "oznaka": "A", "x": -3, "y": 1 }],
  "vektori": [{ "oznaka": "a", "od": [0, 0], "do": [3, 2] }],
  "kruznice": [{ "s": [1, 1], "r": 2 }],
  "kompleksna": false
}
```

- **Brojevna kružnica:** `{"tip":"trig_kruznica","tocke":[{"oznaka":"E(t)","t":"7π/6"}]}`. Kod parsira kut i sam računa (cos t, sin t), pa model ne piše koordinate.
- **Provjera:** koordinate točaka i vektora u tekstu, polovišta i zbrojevi vektora kroz relaciju.
- **Prazna mreža za odgovor:** `"tocke": []`. Isti tip u rješenju crta točan odgovor.
- **Trud:** mali.

**3. `trokut` i `kruznica` → `lik`** (17 crteža u matematici i konstrukcije u OŠ)

```json
{
  "tip": "lik",
  "vrsta": "trapez",
  "vrhovi": ["A", "B", "C", "D"],
  "zadano": { "AB": 13, "CD": 8, "AD": 5, "kut_A": 60 },
  "prikazi": { "stranice": ["AB", "CD"], "kutovi": ["A"] },
  "dodatno": [{ "visina_iz": "D" }]
}
```

- **Vrste:** trokut, pravokutni trokut, paralelogram, trapez, pravilni n-terokut, kružnica s tetivama i središnjim i obodnim kutom, kut presječen paralelnim pravcima.
- **Provjera:** kod konstruira lik iz minimalnog skupa mjera (poučak o kosinusu, zbroj kutova). Svaka dodatna mjera mora se slagati s konstrukcijom, a prikazani brojevi moraju biti u tekstu.
- **Koordinate:** deterministički, kao trokut u prototipu.
- **Trud:** srednji, jer ima više vrsta i oznaka kutova.

**4. `sile` → mehanički prizor** (6 crteža u fizici i poluga u OŠ)

```json
{
  "tip": "sile",
  "prizor": "kolotura",
  "tijela": [
    { "id": "m1", "masa": 2, "izvor": "tekst" },
    { "id": "m2", "masa": 3, "izvor": "tekst" }
  ],
  "stanje": { "ubrzanje": 2, "izvor": "izvedeno" },
  "sile": [
    { "na": "m1", "oznaka": "T", "smjer": "gore" },
    { "na": "m1", "oznaka": "G1", "smjer": "dolje" }
  ]
}
```

- **Prizori:**
  - vodoravna podloga sa silom pod kutom (FIZ26 zad. 2),
  - kosina (postoji),
  - kolotura s dva utega (FIZ25 zad. 27),
  - tijela jedno na drugom (FIZ23 zad. 2),
  - opruga s utegom,
  - poluga (OŠ),
  - slobodno tijelo sa silama pod zadanim kutovima.
- **Provjera:** ΣF = m·a po osima za stanje iz teksta („miruje“, „jednoliko“, „ubrzava“), N = G·cos α, F_tr ≤ μN. Za koloturu kod računa a = (m₂−m₁)g/(m₁+m₂) i uspoređuje.
- **Trud:** srednji.

**5. `strujni_krug` → stablo spojeva** (2 crteža na maturi, OŠ)

```json
{
  "tip": "strujni_krug",
  "izvor": { "oznaka": "ε", "U": 12, "r": 1 },
  "spoj": {
    "serijski": [
      { "R": "R1", "iznos": 4 },
      {
        "paralelno": [
          { "R": "R2", "iznos": 6 },
          { "serijski": [{ "R": "R3", "iznos": 3 }, { "zarulja": "Ž" }] }
        ]
      }
    ]
  },
  "instrumenti": [
    { "vrsta": "V", "preko": "R1" },
    { "vrsta": "A", "u_grani": "R2" }
  ],
  "sklopka": "otvorena"
}
```

- **Prototip:** dopušta samo jednu paralelnu skupinu s najviše 3 grane. FIZ25drugi zad. 12 traži četiri različita spoja istih otpornika, dakle ugniježđene spojeve.
- **Provjera:** kod računa R_ekv, ukupnu struju i napone i uspoređuje ih sa svim izvedenim vrijednostima u objašnjenju.
- **Koordinate:** rekurzivno, pri čemu serijski ide vodoravno, a paralelno okomito. Pristup „element pa smjer“ ima i [schemdraw](https://schemdraw.readthedocs.io/en/latest/), kako je navedeno u prvom istraživanju.
- **Trud:** mali do srednji.

### Novi tipovi

**6. `stat`: statistički dijagrami** (7 u matematici, 8 u biologiji)

```json
{
  "tip": "stat",
  "vrsta": "stupcasti",
  "os_x": "broj grozdova",
  "os_y": "broj trsova",
  "kategorije": ["0", "1", "2", "3"],
  "vrijednosti": [4, 7, 9, 5]
}
```

- **Vrste:** stupčasti (i složeni 100 %), linijski s više serija, kružni, histogram, box-plot.
- **Box-plot:** model daje sirove podatke, a kod računa kvartile. Primjer u katalogu traži upravo kvartile ([MAT katalog str. 23](https://www.ncvvo.hr/wp-content/uploads/2026/09/MAT-2027.pdf)).
- **Provjera:** svaka vrijednost iz teksta ili tablice zadatka; udjeli kružnog dijagrama daju 100 %.
- **Knjižnica:** [LayerChart](https://github.com/techniq/layerchart) je već u `package.json` (vidi odjeljak 3), ili vlastiti SVG.
- **Trud:** mali do srednji.

**7. `polje`: naboji, vodiči, magnetsko polje** (15 crteža, najčešći tip u fizici)

```json
{
  "tip": "polje",
  "naboji": [
    { "q": "+q", "x": 0, "y": 0 },
    { "q": "-q", "x": 0, "y": -1 }
  ],
  "vodici": [{ "x": 2, "y": 0, "struja": "u_ravninu", "oznaka": "I1" }],
  "homogeno_B": { "smjer": "iz_ravnine", "podrucje": [3, 0, 6, 2] },
  "petlja": { "pravokutnik": [1, 0.5, 2, 1.5], "brzina": "desno" },
  "tocke": [{ "oznaka": "B", "x": 0.5, "y": -0.5 }]
}
```

- **Provjera:** udaljenosti u tekstu (d, d/2, r). Kod računa smjer E ili B u istaknutim točkama superpozicijom (Coulomb, Biot-Savart za ravni vodič) i uspoređuje ga s odgovorom u objašnjenju. Tako se uhvati i pogrešno rješenje.
- **Koordinate:** 2D, deterministički.
- **Granice:** 3D magneti i zavojnice (FIZ22 zad. 35, FIZ25drugi zad. 13) ostaju izvan ovog tipa.
- **Trud:** srednji.

**8. `tijelo`: prostorna tijela** (8 crteža u matematici)

```json
{
  "tip": "tijelo",
  "vrsta": "kvadar",
  "vrhovi": "ABCDEFGH",
  "mjere": { "a": 4, "b": 3, "c": 5 },
  "tocke": [{ "oznaka": "P", "na": "GH", "omjer": 0.5 }],
  "istakni": { "duzine": ["DG"], "trokuti": ["ABP"] }
}
```

- **Vrste:** kocka, kvadar, pravilna n-terostrana prizma i piramida, valjak, stožac, kugla.
- **Provjera:** konvencija imenovanja (baza ABCD, gornja ploha EFGH, E iznad A), mjere u tekstu, točke na bridovima.
- **Koordinate:** kosa projekcija s fiksnim kutom i skraćenjem. Skriveni bridovi (crtkano) određuju se iz normala ploha, što je jednostavno jer su sva školska tijela konveksna.
- **Knjižnica:** [Zdog](https://github.com/metafizzy/zdog) crta „pseudo-3D“ u canvas ili SVG ([README](https://github.com/metafizzy/zdog#readme)), ali nema crtkanih skrivenih bridova, a zadnji commit je iz srpnja 2023. Ne isplati se.
- **Trud:** srednji.

**9. `molekula` i `reakcija`: kemijske strukture** (16 crteža u kemiji)

```json
{
  "tip": "molekula",
  "smiles": "CCC(C)C=O",
  "naziv": "2-metilbutanal",
  "naziv_en": "2-methylbutanal",
  "prikaz": "kosturna"
}
```

```json
{
  "tip": "reakcija",
  "reaktanti": ["CC=CC"],
  "produkti": ["CC(Br)C(Br)C"],
  "iznad_strelice": "Br2"
}
```

- **Provjera:**
  - SMILES se mora parsirati, a molekulska formula iz SMILES-a (smiles-drawer ima `getMolecularFormula`, [`src/DrawerBase.js`](https://github.com/reymond-group/smilesDrawer/blob/master/src/DrawerBase.js)) mora odgovarati formuli u tekstu.
  - **Najjača provjera ide na backendu (Java):** [OPSIN](https://github.com/dan2097/opsin) (MIT) pretvara IUPAC naziv u SMILES (`parseToSmiles`, [README](https://github.com/dan2097/opsin#readme)). Model zato piše i engleski naziv, a kod usporedi kanonski SMILES s modelovim, npr. s [CDK](https://github.com/cdk/cdk) (LGPL-2.1).
  - OPSIN radi s engleskom nomenklaturom, pa hrvatski naziv („2-metilbutanal“) ne može izravno parsirati.
  - U reakciji kod provjerava bilancu atoma.
- **Koordinate:** računa ih knjižnica (2D raspored molekule).
- **Ne pokriva:** Lewisove formule sa slobodnim elektronskim parovima i Fischerove projekcije. Za njih bi trebao vlastiti predložak (jednom u ispitima, KEM25 zad. 47; Lewis u [katalogu str. 77](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf)).
- **Trud:** srednji.

**10. Genetika: `punnett`, `rodoslovlje`, `kromosomi`** (9 crteža u biologiji)

```json
{ "tip": "punnett", "roditelj1": "XᴬXᵃ", "roditelj2": "XᵃY" }
```

```json
{
  "tip": "rodoslovlje",
  "nasljedivanje": "X-recesivno",
  "osobe": [
    { "id": "I-1", "spol": "M" },
    { "id": "I-2", "spol": "Z", "prijenosnik": true },
    { "id": "II-1", "spol": "M", "oboljeli": true, "roditelji": ["I-1", "I-2"] }
  ]
}
```

```json
{
  "tip": "kromosomi",
  "parovi": [
    {
      "homologni": [
        ["A", "B"],
        ["a", "b"]
      ],
      "dvostruki": true
    }
  ]
}
```

- **Punnettov kvadrat:** model daje samo genotipove roditelja, a kod sam izvodi gamete, kvadrat i omjere i uspoređuje ih s omjerima u tekstu. Model tako ne može pogriješiti u kvadratu.
- **Rodoslovlje:** kod nabraja moguće genotipove i provjerava je li rodoslovlje **dosljedno zadanom načinu nasljeđivanja**. Za A–D distraktore kod potvrđuje da su nedosljedni.
- **Simboli:** prema standardu NSGC: kvadrat za muškarca, krug za ženu, ispunjen simbol za oboljele ([Bennett i sur. 2008](https://doi.org/10.1007/s10897-008-9169-9), [dopuna 2022](https://doi.org/10.1002/jgc4.1621)).
- **Raspored:** jedna generacija po retku, za male obitelji (≤ 3 generacije).
- **Knjižnica:** [pedigreejs](https://github.com/CCGE-BOADICEA/pedigreejs) je uređivač pod licencom GPL-3.0 ili novijom ([README](https://github.com/CCGE-BOADICEA/pedigreejs#license)) i nije na npm-u, pa je vlastiti renderer bolji.
- **Trud:** Punnett i kromosomi mali, rodoslovlje srednji.

**11. `kladogram` i `venn`** (6 i 2 crteža u biologiji; skupovi su i u matematici)

```json
{
  "tip": "kladogram",
  "stablo": ["lemur", ["E", ["G", ["H", "K"]]]],
  "svojstva": [{ "iznad": ["G", "H", "K"], "oznaka": "amnion" }]
}
```

```json
{
  "tip": "venn",
  "skupovi": ["F", "G", "H"],
  "podrucja": { "F": ["1"], "FG": ["4"], "FGH": ["7"] }
}
```

- **Kladogram:** listovi su taksoni iz teksta, a stablo je binarno. Za raspored služi [d3-hierarchy](https://github.com/d3/d3-hierarchy) (`cluster`) ili desetak redaka vlastitog koda.
- **Venn:** 2 ili 3 skupa u fiksnom rasporedu, bez površina proporcionalnih brojnosti. Zbroj područja mora odgovarati brojevima iz teksta.
- **Trud:** mali.

**12. `mreza`: hranidbena mreža i shema s čvorovima** (4 crteža u biologiji, OŠ)

```json
{
  "tip": "mreza",
  "cvorovi": ["alge", "rakovi", "riba", "galeb"],
  "veze": [
    ["alge", "rakovi"],
    ["rakovi", "riba"],
    ["alge", "riba"],
    ["riba", "galeb"]
  ],
  "smjer": "tok_energije"
}
```

- **Provjera:** nazivi iz teksta, graf bez ciklusa, barem jedan proizvođač (čvor bez ulaznih strelica). Kod računa trofičke razine („potrošač 2. reda“), pa se odgovor može usporediti.
- **Raspored:** [@dagrejs/dagre](https://github.com/dagrejs/dagre). Projekt već ima `cytoscape-dagre`, ali Cytoscape crta u canvas, a ne u inline SVG.
- **Ograničenje:** čvorovi su tekst, a ne ilustracije organizama.
- **Trud:** mali do srednji.

**13. `val`** (3 crteža u fizici)

```json
{
  "tip": "val",
  "vrsta": "stojni",
  "L": 2,
  "n": 3,
  "krajevi": ["cvor", "cvor"],
  "trenutci": ["max", "min"]
}
```

- **Provjera:** λ = 2L/n i broj čvorova. Za putujući val vrijedi v = λf.
- **Trud:** mali.

**14. `optika`: leće, zrcala, lom** (1 crtež na maturi, eksperimentalni ishodi u katalogu)

```json
{
  "tip": "leca",
  "vrsta": "sabirna",
  "f": 10,
  "predmet": { "a": 15, "h": 2 },
  "zrake": ["paralelna", "kroz_zariste", "kroz_srediste"]
}
```

```json
{ "tip": "lom", "n1": 1.0, "n2": 1.5, "upadni_kut": 30 }
```

- **Provjera:** kod računa b = af/(a−f) i povećanje (ovdje b = 30, slika realna, obrnuta, uvećana) te Snellov zakon, i uspoređuje ih s tekstom.
- **Knjižnica:** [ray-optics](https://github.com/ricktu288/ray-optics) (Apache-2.0) je cijela simulacijska aplikacija, a ne knjižnica za statične sheme.
- **Trud:** mali do srednji. Na maturi je rijedak, ali za učenje ima veliku vrijednost.

**15. Manji tipovi**

- **`fazni_dijagram`** (3 crteža u kemiji): trojna i kritična točka i označene točke. Oblik je kvalitativan, a za vodu kod provjerava negativan nagib krivulje taljenja.
- **`brojevni_pravac`** (MATB24 zad. 1, intervali iz kataloga): `{"od":-3,"do":5,"intervali":[{"od":-1,"do":2,"lijevo":"zatvoren","desno":"otvoren"}]}`.
- **`elektrokemijski_clanak`** (2 crteža u kemiji, a katalog traži crtež članka, [str. 20](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf)): fiksni predložak s dvije posude, elektrodama, solnim mostom i voltmetrom ili izvorom. Model daje metale i elektrolite, a kod iz tablice standardnih potencijala određuje anodu, katodu i napon članka.
- Sva tri su malog truda.

**Tablice nisu SVG.** Markdown-it ima pravilo `table` u blok-parseru ([`lib/parser_block.mjs`, markdown-it 14.1.1](https://unpkg.com/markdown-it@14.1.1/lib/parser_block.mjs)), a MatMat ga koristi za sadržaj zadataka ([`src/lib/utils/markdownCore.js`](https://github.com/matino06/matmat-frontend/blob/main/src/lib/utils/markdownCore.js)). Za 52 zadatka s tablicom dovoljno je da model piše markdown tablicu i da tablica ima stil.

## 3. Knjižnice

Podatci s npm registra i GitHub API-ja na dan 13. 10. 2026. Veličine su naša mjerenja (`gzip -9` datoteke s unpkg).

| Knjižnica                                                               | Za                          | Licenca                                                                                       | Veličina (gzip)                                     | Održavanje                                | Tema i boje                                                                                                                                                                                                                                                                                                                                                                         | Ocjena                                                                |
| ----------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [smiles-drawer](https://github.com/reymond-group/smilesDrawer) 2.4.1    | molekule, reakcije          | MIT                                                                                           | 59 KB (`smiles-drawer.min.js`); ovisi o `chroma-js` | izdanje 26. 6. 2026., commit 10. 9. 2026. | `SvgDrawer` crta u `<svg>`, ugrađene teme `light` i `dark`, sve boje se mogu podesiti (`themes`), `showCarbons` za eksplicitne C ([README](https://github.com/reymond-group/smilesDrawer#readme)); `ReactionDrawer` crta reakcije sa strelicom i tekstom iznad i ispod ([`src/ReactionDrawer.js`](https://github.com/reymond-group/smilesDrawer/blob/master/src/ReactionDrawer.js)) | **preporuka za kemiju**                                               |
| [RDKit.js](https://github.com/rdkit/rdkit-js) (`@rdkit/rdkit` 2026.9.1) | molekule                    | BSD-3-Clause ([README](https://github.com/rdkit/rdkit/blob/master/Code/MinimalLib/README.md)) | 29 KB JS + **2,4 MB WASM** (7,4 MB nekomprimirano)  | izdanje 3. 10. 2026.                      | `get_svg_with_highlights` prima JSON opcije `backgroundColour`, `symbolColour`, `atomColourPalette` i `colourScheme: "dark"` (izvorni kod na grani master, [`MolDrawOptionsJSONParsers.cpp`](https://github.com/rdkit/rdkit/blob/master/Code/GraphMol/MolDraw2D/MolDrawOptionsJSONParsers.cpp)); `.wasm` se mora posluživati zasebno (README)                                       | najkvalitetniji crteži, ali preteško za preglednik. Opcija na serveru |
| [OpenChemLib JS](https://github.com/cheminfo/openchemlib-js) 9.25.1     | molekule                    | BSD-3-Clause                                                                                  | 340 KB (`dist/openchemlib.js`)                      | izdanje 5. 10. 2026.                      | `toSVG(width, height, id, options)`; opcije su raspored i oznake (`DepictorOptions`), a za boje postoji samo `noImplicitAtomLabelColors` ([`openchemlib.d.ts`](https://unpkg.com/openchemlib@9.25.1/dist/openchemlib.d.ts)), pa bi se temu radilo naknadnom obradom SVG-a (naša procjena)                                                                                           | ima `getMolecularFormula` i parsere, ali je 6× veći od smiles-drawera |
| [Kekule.js](https://github.com/partridgejiang/Kekule.js) 1.0.4          | kemijski editor             | MIT (GitHub)                                                                                  | 567 KB (`kekule.min.js`)                            | commit 21. 9. 2026.                       | cijeli editor i 3D, nije namijenjen malim statičnim SVG-ovima                                                                                                                                                                                                                                                                                                                       | ne                                                                    |
| [OPSIN](https://github.com/dan2097/opsin) 2.9.0                         | naziv → SMILES (Java)       | MIT                                                                                           | backend                                             | commit 11. 10. 2026.                      | nema crtanja                                                                                                                                                                                                                                                                                                                                                                        | **preporuka za provjeru na backendu**                                 |
| [function-plot](https://github.com/mauriciopoppe/function-plot) 1.26.0  | grafovi funkcija            | MIT                                                                                           | 62 KB (`dist/function-plot.js`)                     | izdanje 11. 10. 2026.                     | D3 i SVG                                                                                                                                                                                                                                                                                                                                                                            | opcija za `graf`; vlastito uzorkovanje iz prototipa je dovoljno       |
| [LayerChart](https://github.com/techniq/layerchart)                     | statistički dijagrami       | MIT                                                                                           | već u projektu (`2.0.0-next.27`, najnovije 2.7.0)   | izdanje 12. 10. 2026.                     | Svelte 5 komponente (`peerDependencies: svelte ^5`), SVG i CSS                                                                                                                                                                                                                                                                                                                      | opcija za `stat`                                                      |
| [JSXGraph](https://github.com/jsxgraph/jsxgraph) 1.14.0                 | interaktivna geometrija     | MIT ili LGPL-3.0 (npm)                                                                        | 258 KB                                              | commit 12. 10. 2026.                      | SVG                                                                                                                                                                                                                                                                                                                                                                                 | preteško za statične skice (kao u prvom istraživanju)                 |
| [@dagrejs/dagre](https://github.com/dagrejs/dagre) 3.1.1                | raspored usmjerenih grafova | MIT                                                                                           | 17 KB                                               | izdanje 8. 8. 2026.                       | samo računa koordinate, crtamo sami                                                                                                                                                                                                                                                                                                                                                 | **preporuka za `mreza`**                                              |
| [d3-hierarchy](https://github.com/d3/d3-hierarchy) 3.1.2                | stabla                      | ISC                                                                                           | 6 KB                                                | izdanje 2022.; stabilno                   | samo računa koordinate                                                                                                                                                                                                                                                                                                                                                              | za `kladogram`, ako vlastiti kod ne bude dovoljan                     |
| [venn.js](https://github.com/upsetjs/venn.js) 2.0.0 (@upsetjs)          | Vennovi dijagrami           | MIT                                                                                           | 17 KB                                               | izdanje 17. 11. 2024.                     | površine proporcionalne brojnosti                                                                                                                                                                                                                                                                                                                                                   | ne treba; školski Venn ima fiksni raspored                            |
| [netlistsvg](https://github.com/nturley/netlistsvg) 1.0.2               | sheme iz netliste           | MIT                                                                                           | 225 KB i ovisi o elkjs                              | zadnje izdanje 12. 12. 2020.              | ulaz je Yosys JSON, a raspored je ELK slojeviti ([README](https://github.com/nturley/netlistsvg#readme)), ne školski „pravokutnik“                                                                                                                                                                                                                                                  | ne; vlastiti renderer strujnog kruga                                  |
| [circuitjs1](https://github.com/pfalstad/circuitjs1)                    | simulator krugova           | GPL-2.0                                                                                       | aplikacija                                          | aktivno                                   | interaktivni simulator                                                                                                                                                                                                                                                                                                                                                              | ne (licenca, nije renderer)                                           |
| [pedigreejs](https://github.com/CCGE-BOADICEA/pedigreejs)               | rodoslovlja                 | GPL-3.0+                                                                                      | nije na npm-u                                       | commit 9. 6. 2026.                        | uređivač (d3, jQuery)                                                                                                                                                                                                                                                                                                                                                               | ne (licenca); vlastiti renderer                                       |
| [Zdog](https://github.com/metafizzy/zdog) 1.1.3                         | pseudo-3D                   | MIT                                                                                           | 7 KB                                                | zadnji commit 18. 7. 2023.                | canvas ili SVG, bez crtkanih skrivenih bridova                                                                                                                                                                                                                                                                                                                                      | ne; vlastita kosa projekcija                                          |
| [ray-optics](https://github.com/ricktu288/ray-optics)                   | optika                      | Apache-2.0                                                                                    | aplikacija                                          | commit 5. 10. 2026.                       | simulator                                                                                                                                                                                                                                                                                                                                                                           | ne; vlastiti renderer leće                                            |

**Preglednici:** smiles-drawer, dagre, d3-hierarchy i vlastiti rendereri su čisti JS koji generira SVG, pa nemaju posebnih zahtjeva. RDKit treba WebAssembly i zasebno posluživanje `.wasm` datoteke ([README](https://github.com/rdkit/rdkit/blob/master/Code/MinimalLib/README.md)). Tamnu temu najjednostavnije rješavaju vlastiti rendereri s `currentColor` i CSS varijablama, kao u prvom istraživanju. smiles-drawer to podržava preko vlastitih tema, pa paletu teme treba dati iz CSS varijabli.

## 4. Preporuka

Kriterij za redoslijed je čestoća u ispitima × izvodljivost × vrijednost za učenje. Redoslijed pretpostavlja da su matematika i fizika prioritet MatMata. Ako „vlastiti predmet“ prvo dobije kemiju ili biologiju, stavke 9–12 idu gore. Trud je gruba procjena: mali ≈ 1–2 dana, srednji ≈ 3–5 dana, velik > 1 tjedan, uključujući testove provjera.

### Proširi postojeće tipove

| Rang | Proširenje                                                                                                               | Pokriva (od 275 crteža)                                 | Trud            |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------- |
| 1    | `graf` → graf veličina (osi s jedinicama, točke, po dijelovima, p-V, titracija, entalpijski dijagram, energijske razine) | do 75 (27 %), sva 4 predmeta                            | srednji         |
| 2    | `koordinatni` + vektori, brojevna kružnica, prazna mreža, kompleksna ravnina                                             | 19 (MAT)                                                | mali            |
| 3    | `trokut` i `kruznica` → `lik`                                                                                            | 17 (MAT) i konstrukcije u OŠ                            | srednji         |
| 4    | `sile` → prizori (podloga, kolotura, tijela jedno na drugom, opruga, poluga)                                             | 6 (FIZ) i poluga u OŠ                                   | srednji         |
| 5    | `strujni_krug` → ugniježđeni spojevi, r, voltmetar, žaruljica, sklopka                                                   | 2 (FIZ) i OŠ                                            | mali do srednji |
| svi  | podrška za **varijante A–D** (`"varijanta": "netocna"`)                                                                  | 26 crteža su odgovori A–D (13 FIZ, 7 MAT, 4 KEM, 2 BIO) | mali            |

### Novi tipovi

| Rang | Tip                                                       | Pokriva                            | Knjižnica                                 | Trud                |
| ---- | --------------------------------------------------------- | ---------------------------------- | ----------------------------------------- | ------------------- |
| 1    | `stat` (stupčasti, linijski, kružni, histogram, box-plot) | 15 (MAT B, BIO), OŠ                | vlastiti ili LayerChart                   | mali do srednji     |
| 2    | `polje` (naboji, vodiči, B-polje, petlja)                 | 12 od 15 crteža `F-POLJE` (bez 3D) | vlastiti                                  | srednji             |
| 3    | `tijelo` (kosa projekcija)                                | 8 (MAT)                            | vlastiti                                  | srednji             |
| 4    | `molekula` i `reakcija`                                   | 16 (KEM)                           | smiles-drawer; provjera OPSIN na backendu | srednji             |
| 5    | `punnett`, `kromosomi`, `rodoslovlje`                     | 9 (BIO)                            | vlastiti                                  | mali, mali, srednji |
| 6    | `kladogram`, `venn`                                       | 8 (BIO) i skupovi u MAT            | vlastiti ili d3-hierarchy                 | mali                |
| 7    | `val`                                                     | 3 (FIZ)                            | vlastiti                                  | mali                |
| 8    | `optika` (leća, zrcalo, lom)                              | 1 (FIZ), eksperimentalni ishodi    | vlastiti                                  | mali do srednji     |
| 9    | `mreza` (hranidbena mreža, sheme s okvirima)              | 4 (BIO) i 2 primjera u OŠ          | @dagrejs/dagre                            | mali do srednji     |
| 10   | `fazni_dijagram`, `brojevni_pravac`                       | 3 + 1                              | vlastiti                                  | mali                |

S proširenjima 1–5 i novim tipovima 1–4 pokriveno je **155 od 202 crteža koji se mogu nacrtati iz opisa (77 %)** (naš zbroj iz popisa u prilogu). Ostatak su rijetki tipovi iz stavki 5–10, GHS piktogrami i jednostavno posuđe.

### Što ne pokušavati

| Što                                                                                          | Crteža u ispitima                   | Zašto ne                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anatomske ilustracije (organi, organizmi), crteži stanica i organela                         | 30 (B-ANAT 16, B-STANICA 14)        | Nema parametarskog modela. Svaki crtež je jedinstven, a točnost se ne može provjeriti relacijama. Kad LLM sam crta kao kôd, u najboljem slučaju je 26–41 % crteža matematički pogrešno ([svg-skice.md](svg-skice.md), MathemaTikZ), a ilustracije su još teže |
| Fotografije i mikrografije, ilustracije ekosustava, karte                                    | 13 (FOTO 9, ILUSTR 2, karte 2)      | ne generiraju se. Fotografije imaju i autorska prava                                                                                                                                                                                                          |
| Sheme procesa i molekularne sheme s ilustracijama (životni ciklusi, membrana, dišni lanac)   | 14 (B-PROCES N i DJ 10, B-MOL DJ 4) | raspored i oblici su slobodni. Jednostavan slijed u okvirima ostaje u tipu `mreza`                                                                                                                                                                            |
| Realistična aparatura i mjerni uređaji (tikvica s manometrom, dinamometar, aparatura za CO₂) | 5 (F-APARAT 2, K-APARAT 3)          | svaki postav je drukčiji. Ako zatreba, rješenje je ručno nacrtana knjižnica statičnih ikona, a ne generator                                                                                                                                                   |
| 3D magneti, zavojnice, Rutherfordov pokus                                                    | 4                                   | prostorni crteži bez fiksne konvencije                                                                                                                                                                                                                        |
| GHS piktogrami                                                                               | 4                                   | to su standardni simboli ([KEM katalog str. 11](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf): „slikovne oznake (piktogrami)“). Ne crtaju se, nego se poslužuju kao fiksne datoteke, a model navodi samo ime simbola                          |

Ako zadatak traži takav crtež, vrijedi pravilo iz prvog istraživanja: **zadatak ide bez skice**, ili ga generator ne bira. Za biologiju to znači da treba birati zadatke koji ne ovise o slici, ili da se slika opiše tekstom.

## Praznine

- **Pregledan je samo ljetni, odnosno prvi rok** (plus drugi rok fizike 2025.). Jesenski i drugi rokovi ostalih predmeta i ispiti prije 2022. nisu brojani.
- **Ispite nacionalnih ispita za 8. razred nisam našao objavljene.** Korišteno je samo 20 primjera iz Vodiča. Za 7. razred nema nacionalnog ispita, pa se oslanjamo na ishode navedene u Vodiču. Kurikulumi (NN 7/2019, 10/2019) nisu čitani izravno.
- **Razvrstavanje je napravljeno jednim prolazom.** Vizualni pregled stranica podijeljen je po predmetima, uz ručne provjere uzoraka (npr. FIZ22 str. 6–7). Granice D/DJ/N, posebno u biologiji, su procjena.
- **Nije izmjereno koliko pouzdano model piše predložene JSON opise.** To treba izmjeriti po tipu, kako predlaže [svg-skice.md](svg-skice.md) („Kako izmjeriti točnost prije odluke“).
- **UNECE stranica s GHS piktogramima** vratila je 403, pa izvor za službene datoteke piktograma nije provjeren.

## Izvori ispita

Sve s [ncvvo.hr, Provedeni ispiti](https://www.ncvvo.hr/kategorija/drzavna-matura/provedeni-ispiti/). Datoteke su ZIP arhive, a u zagradi je ispitna knjižica unutar arhive.

| Oznaka     | Rok          | Arhiva                                                                                                                                                 |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MATA22     | ljetni 2022. | [MATA22ljeto1.zip](https://www.ncvvo.hr/wp-content/uploads/2022/06/MATA22ljeto1.zip) (MAT A D-S058)                                                    |
| MATA23     | ljetni 2023. | [MATA23ljeto2.zip](https://www.ncvvo.hr/wp-content/uploads/2023/06/MATA23ljeto2.zip) (MAT A D-S063)                                                    |
| MATA24     | prvi 2024.   | [MATA24_prvi.zip](https://www.ncvvo.hr/wp-content/uploads/2024/06/MATA24_prvi.zip) (MAT A D-S066)                                                      |
| MATA25     | prvi 2025.   | [MATA25prvi_b.zip](https://www.ncvvo.hr/wp-content/uploads/2025/06/MATA25prvi_b.zip) (MAT A D-S072)                                                    |
| MATA26     | prvi 2026.   | [MAT_A_1_rok_2025_2026.zip](https://www.ncvvo.hr/wp-content/uploads/2026/07/MAT_A_1_rok_2025_2026.zip) (MAT A D-S074)                                  |
| MATB22     | ljetni 2022. | [MATB22ljeto1.zip](https://www.ncvvo.hr/wp-content/uploads/2022/06/MATB22ljeto1.zip) (MAT B D-S058)                                                    |
| MATB23     | ljetni 2023. | [MATB23ljeto2.zip](https://www.ncvvo.hr/wp-content/uploads/2023/06/MATB23ljeto2.zip) (MAT B D-S063)                                                    |
| MATB24     | prvi 2024.   | [MATB24_prvi.zip](https://www.ncvvo.hr/wp-content/uploads/2024/06/MATB24_prvi.zip) (MAT B D-S066)                                                      |
| MATB25     | prvi 2025.   | [MATB25prvi_b.zip](https://www.ncvvo.hr/wp-content/uploads/2025/06/MATB25prvi_b.zip) (MAT B D-S072)                                                    |
| MATB26     | prvi 2026.   | [MAT_B_1_rok_2025_2026.zip](https://www.ncvvo.hr/wp-content/uploads/2026/07/MAT_B_1_rok_2025_2026.zip) (MAT B D-S074)                                  |
| FIZ22      | ljetni 2022. | [FIZ22ljeto.zip](https://www.ncvvo.hr/wp-content/uploads/2022/06/FIZ22ljeto.zip) (FIZ IK-1 i IK-2 D-S049)                                              |
| FIZ23      | ljetni 2023. | [FIZ23ljeto1.zip](https://www.ncvvo.hr/wp-content/uploads/2023/06/FIZ23ljeto1.zip) (FIZ IK-1 i IK-2 D-S056)                                            |
| FIZ24      | prvi 2024.   | [FIZ24prvi.zip](https://www.ncvvo.hr/wp-content/uploads/2024/06/FIZ24prvi.zip) (FIZ IK-1 i IK-2 D-S058)                                                |
| FIZ25      | prvi 2025.   | [FIZ25prvi.zip](https://www.ncvvo.hr/wp-content/uploads/2025/06/FIZ25prvi.zip) (FIZ D-S064)                                                            |
| FIZ25drugi | drugi 2025.  | [FIZ25drugi.zip](https://www.ncvvo.hr/wp-content/uploads/2025/08/FIZ25drugi.zip) (FIZ D-S063; lokalna kopija u `Coworker/test-new-feature/FIZ25drugi`) |
| FIZ26      | prvi 2026.   | [Fizika_1_rok_2025_2026.zip](https://www.ncvvo.hr/wp-content/uploads/2026/06/Fizika_1_rok_2025_2026.zip) (FIZ D-S068)                                  |
| KEM22      | ljetni 2022. | [KEM22ljeto2.zip](https://www.ncvvo.hr/wp-content/uploads/2022/06/KEM22ljeto2.zip) (KEM IK-1 i IK-2 D-S053)                                            |
| KEM23      | ljetni 2023. | [KEM23ljeto.zip](https://www.ncvvo.hr/wp-content/uploads/2023/06/KEM23ljeto.zip) (KEM IK-1 i IK-2 D-S055)                                              |
| KEM24      | prvi 2024.   | [KEM24prvi.zip](https://www.ncvvo.hr/wp-content/uploads/2024/06/KEM24prvi.zip) (KEM IK-1 i IK-2 D-S059)                                                |
| KEM25      | prvi 2025.   | [KEM25prvi.zip](https://www.ncvvo.hr/wp-content/uploads/2025/06/KEM25prvi.zip) (KEM D-S064)                                                            |
| KEM26      | prvi 2026.   | [KEM.zip](https://www.ncvvo.hr/wp-content/uploads/2026/06/KEM.zip) (KEM D-S069)                                                                        |
| BIO22      | ljetni 2022. | [BIO22ljeto.zip](https://www.ncvvo.hr/wp-content/uploads/2022/06/BIO22ljeto.zip) (BIO IK-1 i IK-2 D-S050)                                              |
| BIO23      | ljetni 2023. | [BIO23ljeto.zip](https://www.ncvvo.hr/wp-content/uploads/2023/06/BIO23ljeto.zip) (BIO IK-1 i IK-2 D-S055)                                              |
| BIO24      | prvi 2024.   | [BIO24prvi.zip](https://www.ncvvo.hr/wp-content/uploads/2024/06/BIO24prvi.zip) (BIO IK-1 i IK-2 D-S059)                                                |
| BIO25      | prvi 2025.   | [BIO25prvi_b.zip](https://www.ncvvo.hr/wp-content/uploads/2025/06/BIO25prvi_b.zip) (BIO D-S061)                                                        |
| BIO26      | prvi 2026.   | [BIOLOGIJA_1_ROK_2025_2026.zip](https://www.ncvvo.hr/wp-content/uploads/2026/06/BIOLOGIJA_1_ROK_2025_2026.zip) (BIO D-S068)                            |

## Ostali izvori

- Ispitni katalozi za državnu maturu 2026./2027. ([popis](https://www.ncvvo.hr/ispitni-katalozi-za-drzavnu-maturu-2026-2027/)): [Matematika](https://www.ncvvo.hr/wp-content/uploads/2026/09/MAT-2027.pdf), [Fizika](https://www.ncvvo.hr/wp-content/uploads/2026/09/FIZ-2027.pdf), [Kemija](https://www.ncvvo.hr/wp-content/uploads/2026/09/KEM-2027.pdf), [Biologija](https://www.ncvvo.hr/wp-content/uploads/2026/09/BIO-2027.pdf). Brojevi stranica su stranice PDF-a, a ne otisnuti brojevi.
- [Vodič kroz sadržaj i strukturu nacionalnih ispita u osmome razredu 2026./2027.](https://www.ncvvo.hr/wp-content/uploads/2026/09/Vodic-kroz-sadrzaj-i-strukturu-NI-8-razred.pdf) (stranice PDF-a jednake su otisnutima).
- Bennett i sur.: _Standardized Human Pedigree Nomenclature_, J Genet Couns 2008. https://doi.org/10.1007/s10897-008-9169-9 ; dopuna 2022.: https://doi.org/10.1002/jgc4.1621
- Knjižnice: poveznice u tablici u odjeljku 3. Metapodatci su s `registry.npmjs.org` i `api.github.com`, a veličine s `unpkg.com`, sve 13. 10. 2026.
- Prvo istraživanje: [`docs/research/svg-skice.md`](svg-skice.md). Prototip: grana [`prototype/svg-skice`](https://github.com/matino06/matmat-frontend/tree/prototype/svg-skice).

## Prilog: popis crteža po ispitu

Format je „broj zadatka TIP“. „A–D“ znači da je crtež u ponuđenim odgovorima, a DJ i N su izvodljivost (bez oznake znači D). U kemiji 2022.–2024. zadatci 36–47 su zadatci 1–12 druge knjižice.

<details>
<summary>Matematika A i B</summary>

- **MATA22:** 13 M-TIJELO; 16 M-KOORD; 20 M-TIJELO; 29 M-LIK; 30 M-STAT; 32 M-KOORD (prazan); 33 M-TRIGKRUG; 35 M-SITUACIJA; 35 M-SITUACIJA (DJ); 36 M-GRAF; 39 M-KOORD (prazan)
- **MATA23:** 7 M-GRAF (A–D); 10 M-VEKTOR; 12 M-KOORD; 14 M-LIK; 17 M-LIK; 19 M-TIJELO; 31 TABLICA; 36 M-KOORD (prazan); 37 M-GRAF; 40 M-SITUACIJA (DJ)
- **MATA24:** 8 M-GRAF; 14 M-GRAF; 15 M-LIK; 17 M-VEKTOR (A–D); 18 M-TIJELO; 22 M-LIK; 31 M-KOORD (prazan); 33 M-TRIGKRUG; 33 M-GRAF; 35 M-LIK
- **MATA25:** 5 TABLICA; 7 TABLICA; 9 M-GRAF (A–D); 11 M-TRIGKRUG; 13 M-LIK; 15 M-TIJELO; 17 M-LIK; 25 M-GRAF; 36 M-KOORD; 38 M-KOORD (prazan)
- **MATA26:** 7 M-GRAF; 8 M-GRAF (A–D); 17 M-TIJELO; 29 M-GRAF; 31 M-LIK; 32 M-LIK; 43 M-GRAF
- **MATB22:** 6 M-STAT; 11 M-LIK; 13 M-TIJELO; 25 M-STAT; 27 M-LIK; 29 TABLICA; 30 M-LIK
- **MATB23:** 9 M-GRAF (A–D); 12 M-VEKTOR; 14 M-LIK; 25 M-STAT
- **MATB24:** 1 M-BROJPRAVAC; 14 M-MREZA; 18 M-VEKTOR (A–D); 22 M-STAT; 27 M-LIK; 29 M-GRAF; 30 TABLICA
- **MATB25:** 6 TABLICA; 8 TABLICA; 11 M-GRAF (A–D); 12 M-GRAF; 15 M-LIK; 16 M-TIJELO; 18 M-VEKTOR; 30 TABLICA; 30 M-STAT; 33 M-KOORD (prazan)
- **MATB26:** 27 M-LIK; 30 M-KOORD (prazan); 31 M-GRAF; 35 M-STAT

</details>

<details>
<summary>Fizika</summary>

- **FIZ22:** 1 F-GRAF-GIB; 4 OSTALO (A–D); 7 F-GRAF; 9 F-POLJE; 11 F-GRAF; 12 F-POLJE; 12 F-GRAF (A–D); 20 F-ATOM; 35 F-POLJE (DJ); 35 F-POLJE (A–D, DJ)
- **FIZ23:** 1 F-GRAF-GIB; 2 F-SILE (A–D); 5 F-GRAF (A–D); 10 F-PV; 11 F-POLJE; 13 F-POLJE; 15 F-GRAF; 15 F-GRAF (A–D); 19 F-OPTIKA (A–D); 30 TABLICA; 33 F-PV
- **FIZ24:** 4 F-PUTANJA (A–D); 10 F-POLJE; 14 F-POLJE (A–D); 17 F-VAL; 26 F-GRAF; 30 F-VAL; 31 F-SILE (DJ)
- **FIZ25:** 3 F-SILE; 8 F-PV; 10 F-POLJE; 13 F-POLJE; 13 F-POLJE (A–D); 14 F-GRAF; 17 F-GRAF (A–D); 20 F-GRAF; 27 F-SILE; 29 F-APARAT (DJ); 29 TABLICA; 33 F-POLJE
- **FIZ26:** 1 F-SILE (DJ); 2 F-SILE; 4 F-HIDRO; 17 F-VAL; 20 F-ATOM (DJ); 30 TABLICA; 33 F-KRUG; 34 F-GRAF
- **FIZ25drugi:** 1 F-GRAF-GIB; 5 F-HIDRO (DJ); 12 F-KRUG (A–D); 13 F-POLJE (DJ); 13 F-POLJE (A–D); 14 F-POLJE; 27 F-APARAT (DJ)

</details>

<details>
<summary>Kemija</summary>

- **KEM22:** 6 K-STRUKT (A–D); 10 K-GRAF; 33 TABLICA; 35 K-GRAF; 38 K-STRUKT; 39 TABLICA; 44 K-REAKC; 45 GHS
- **KEM23:** 7 K-GRAF; 11 K-APARAT; 13 K-STRUKT; 20 K-GRAF; 31 TABLICA; 33 K-GRAF-E; 38 K-ELEKTRO; 40 K-STRUKT; 42 K-GRAF; 43 K-ELEKTRO; 47 K-REAKC
- **KEM24:** 11 GHS (A–D); 12 K-APARAT; 13 K-STRUKT; 18 K-STRUKT; 21 K-GRAF; 30 TABLICA; 36 K-STRUKT; 40 K-GRAF; 44 K-TITR; 47 TABLICA
- **KEM25:** 7 K-GRAF; 9 TABLICA; 12 GHS; 16 K-GRAF; 24 K-REAKC (A–D); 29 TABLICA; 36 K-STRUKT; 37 K-GRAF; 41 K-TITR; 44 K-REAKC; 47 K-STRUKT
- **KEM26:** 5 TABLICA; 9 K-GRAF; 10 K-GRAF; 11 TABLICA; 16 GHS (A–D); 17 K-STRUKT; 22 K-GRAF; 30 K-GRAF; 32 TABLICA; 36 K-STRUKT; 43 K-GRAF; 46 K-REAKC; 47 K-APARAT (DJ)

</details>

<details>
<summary>Biologija</summary>

- **BIO22:** 3 TABLICA; 6 B-ANAT (N); 12 B-PROCES; 16 karta (N); 17 FOTO (N); 21 B-MOL; 21 TABLICA; 22 TABLICA; 26 TABLICA; 27 B-PROCES; 32 B-GRAF; 35 B-PROCES; 41 B-ANAT (N); 42 TABLICA; 44 B-GRAF; 45 B-STANICA (N); 46 B-GRAF; 47 B-ANAT (N); 47 B-STABLO; 47 TABLICA; 48 OSTALO; 49 B-ANAT (N); 50 TABLICA; 51 TABLICA; 52 TABLICA; 53 B-MREZA (DJ); 54 TABLICA
- **BIO23:** 2 B-STANICA (N); 4 TABLICA; 6 B-PROCES (N); 8 B-GRAF (A–D); 10 B-PROCES; 12 B-ANAT (N); 17 TABLICA; 18 FOTO (N); 20 B-STANICA (N); 24 B-PROCES (DJ); 25 B-KARIOGRAM; 27 B-KARIOGRAM; 30 TABLICA; 31 B-STABLO; 36 B-MREZA; 41 B-ANAT (N); 42 B-STABLO (N); 43 B-GRAF; 44 B-PROCES (DJ); 45 B-PROCES (N); 47 B-ANAT (DJ); 48 B-ANAT (N); 50 B-STANICA (DJ); 51 FOTO (N); 52 B-GRAF; 53 B-STANICA (DJ); 54 B-RODOSLOVLJE; 54 B-PUNNETT
- **BIO24:** 1 B-MOL (DJ); 3 TABLICA; 4 TABLICA; 6 OSTALO; 8 B-MOL (DJ); 9 B-POKUS; 11 B-ANAT (N); 12 B-STANICA (N); 22 TABLICA; 25 B-RODOSLOVLJE (A–D); 28 B-PROCES (DJ); 29 Venn; 29 TABLICA; 36 B-PROCES; 40 B-GRAF; 41 TABLICA; 42 B-GRAF; 43 B-STABLO; 43 B-STABLO; 45 FOTO (N); 46 B-STANICA (N); 47 B-GRAF; 49 B-STANICA (DJ); 50 TABLICA; 51 B-GRAF; 52 B-GRAF; 53 B-KARIOGRAM; 54 FOTO (N)
- **BIO25:** 2 B-ANAT (N); 9 B-ANAT (N); 12 B-STANICA (DJ); 16 B-ANAT (N); 18 ILUSTR (N); 25 TABLICA; 29 B-KARIOGRAM; 31 B-MOL; 33 TABLICA; 33 B-STABLO; 35 B-GRAF; 37 B-GRAF; 41 ILUSTR (N); 42 B-MREZA (DJ); 43 karta (N); 43 TABLICA; 44 B-PROCES (DJ); 46 TABLICA; 46 B-GRAF; 47 OSTALO; 48 B-STANICA (DJ); 49 B-ANAT (N); 50 B-ANAT (N); 50 TABLICA; 51 B-MOL (DJ); 52 B-PROCES (N); 53 B-PROCES (N); 53 TABLICA; 54 B-RODOSLOVLJE; 54 TABLICA; 55 FOTO (N)
- **BIO26:** 3 TABLICA; 3 Venn; 4 B-STANICA (DJ); 6 TABLICA; 9 B-PROCES; 10 OSTALO; 11 B-STANICA (DJ); 14 B-STANICA (DJ); 17 FOTO (N); 22 B-KARIOGRAM; 27 FOTO (N); 28 B-ANAT (N); 29 FOTO (N); 31 B-GRAF; 35 B-STANICA (DJ); 36 B-MREZA (DJ); 37 B-STABLO; 37 TABLICA; 39 TABLICA; 39 B-GRAF; 40 B-MOL (DJ); 41 B-ANAT (N); 43 TABLICA; 44 B-PROCES (N); 45 B-PROCES (DJ)

</details>
