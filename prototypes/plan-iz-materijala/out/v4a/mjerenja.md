# Mjerenja prototipa

- Lekcija: **165** (ručni: 97)
- Zadaci s ispita pokriveni: **169/182**
- Lekcije koje ne treba nijedan zadatak s ispita: 27
- Nulta pretpostavka prekršena: 141 lekcija
- Ručne lekcije koje generirani plan uopće ne pokriva: 0
- Jev razvrstavanje stranica: 191/283 slaže se s nazivom datoteke
- Jev parovi „nova ideja?“: 0, označeno za spajanje 0

## Trošak po koraku (USD)

- assume: 0.252
- classify: 0.009
- compare: 0.742
- coverage: 0.087
- dedupe: 0.140
- draft: 1.763
- edges: 1.328
- group: 0.466
- merge-jev: 0.011
- merge-llm: 0.187
- ocr: 0.098
- points: 2.556
- scope-catalog: 0.120
- scope-exam: 0.031
- **ukupno: 7.79**

## Nepokriveni zadaci s ispita

- [FIZ-katalog-2026.pdf 1 (str. 4)] Zadatak je vezan uz shemu električnog polja točkastih naboja, ali tekst zadatka nije dostupan jer je na stranici samo slika bez pitanja. → Tekst zadatka nije dostupan (samo slika), pa se potrebne lekcije ne mogu odrediti.
- [FIZ23ljeto1 35] Kolika je razlika razina zvuka koje osoba čuje lijevim i desnim uhom od točkastog izvora snage 2,5 mW na udaljenostima 55 cm i 57 cm? → Površina sfere 4πr² (nije u knjižici formula ni u lekcijama) i računanje logaritma (log₁₀) za izračun decibela, što nije u predznanju
- [FIZ24prvi 29] Plamenik daje 72 kJ topline u minuti. Odrediti vrijeme potrebno da se 200 g vode i aluminijska posuda mase 100 g zagriju od 20 °C do 90 °C. → tablične vrijednosti specifičnih toplinskih kapaciteta vode i aluminija (nisu u knjižici formula ni u lekcijama)
- [FIZ24prvi 31] Kamion se giba uz brijeg nagiba 30°, koeficijent statičkog trenja 0,7. Odrediti maksimalno ubrzanje kamiona prije nego što sanduk počne kliziti unatrag. → vrijednosti sinusa i kosinusa za 30° (trigonometrija nije u predznanju ni izričito u lekcijama)
- [FIZ25drugi 8] Dvije kuglice jednakih masa i početnih temperatura (željezo i aluminij) stavljene u pećnicu; odrediti tvrdnju o primljenoj toplini i temperaturi aluminijske kuglice nakon dva sata. → tablične vrijednosti specifičnih toplinskih kapaciteta željeza i aluminija (nisu u knjižici formula ni u lekcijama)
- [FIZ25drugi 9] Jednoatomni idealni plin adijabatski se komprimira na polovicu početnog volumena; odrediti odnos konačnog i početnog tlaka. → vrijednost eksponenta κ = 5/3 za jednoatomni plin nije u knjižici niti u lekcijama (lekcija B12.07 spominje κ bez vrijednosti)
- [FIZ25drugi 10] Dvije paralelne velike metalne ploče s nabojima +q i -q iste apsolutne vrijednosti; odrediti iznos električnog polja izvan i između ploča. → polje beskonačno velike nabijene ploče (E = σ/(2ε0)) ili Gaussov zakon nije u lekcijama ni u knjižici formula
- [FIZ25drugi 16] Odabrati što treba učiniti da bi transverzalni valovi na užetu imali veću brzinu. → Ovisnost brzine transverzalnog vala na užetu o napetosti i linijskoj gustoći (v = √(F/μ)) nije u lekcijama, a nije ni u knjižici formula.
- [FIZ25drugi 17] Detektor zvuka se udalji s 2 m na 20 m od izvora; odrediti za koliko se smanji razina zvuka. → Računanje s logaritmom (log 0,01 = −2, pravila za log) nije u predznanju ni eksplicitno u lekcijama; lekcija B21.02 samo spominje logaritamsku ljestvicu.
- [FIZ25drugi 32] Dvije nabijene aluminijske kuglice ovješene na nitima u tekućini zatvaraju kut 60°; odrediti naboj na svakoj kuglici uz zadane gustoće i permitivnost. → Trigonometrijske funkcije (sinus, tangens) za kut 60°, potrebne za rastavljanje sila i geometriju kuglica; nisu u predznanju, a lekcije ih ne obrađuju eksplicitno.
- [FIZ25drugi 34] Matematičko njihalo napravi 10 titraja za 36 s; odrediti visinu do koje se podigne kuglica pri otklonu od 5°. → Kosinus kuta (cos 5°) za izračun visine l(1 − cos θ); trigonometrija nije u predznanju niti je eksplicitno obrađena u lekcijama.
- [FIZ25prvi 28] Odrediti dinamički tlak vode u dijelu horizontalne cijevi pri protoku 0,02 m³/s i presjeku 50 cm². → gustoća vode ρ = 1000 kg/m³ (nije u knjižici formula ni u lekcijama)
- [FIZ25prvi 31] Odrediti udaljenost od podnožja kosine na kojoj se tijelo zaustavi nakon klizanja s visine 5 m niz kosinu nagiba 25° i po horizontalnoj podlozi uz faktor trenja 0,1. → Trigonometrija: definicija i vrijednosti sinusa i kosinusa kuta (sin 25°, cos 25°) nije obrađena ni u jednoj lekciji ni u predznanju; B02.03 spominje rastavljanje sila na komponente, ali ne uvodi te funkcije.

## Ručne lekcije bez pokrića


## Djelomično pokrivene ručne lekcije

- E10 → B15.02: Otpor i geometrija/materijal pokriveni; ovisnost o temperaturi i mjerenje otpora nisu izričito navedeni.
- E12 → B15.03: Realni izvor spomenut kao dio rješavanja kruga; unutarnji otpor, kratki spoj i U,I graf nisu posebno obrađeni.
- M02 → B01.01, B01.05: Put i pomak pokriveni; skalar/vektor i zbrajanje pomaka pod pravim kutom (Pitagora) nisu izričito navedeni.
- M10 → B03.04: Težina, dizalo i prividna težina pokriveni; sila teža, bestežinsko stanje i razlika jedinica nisu izrijekom navedeni.
- M11 → B03.03, B02.03: Trenje pokriveno; elastična sila opruge, konstanta opruge te mjerenje i kontrola varijabli nisu pokriveni.
- M22 → B07.03, B07.04: Treći Keplerov zakon i brzina satelita pokriveni. Prvi i drugi Keplerov zakon, prva kozmička brzina i geostacionarna orbita nisu izričito navedeni.
- M27 → B09.02, B09.03: Bernoullijeva jednadžba za horizontalnu cijev i primjene. Torricellijev izraz i uzgon krila nisu izričito navedeni.
- Q01 → B25.01, B26.04, B24.03, B31.05: Energija fotona i veza s frekvencijom te elektronvolt (B13.05). Količina gibanja fotona p = h/λ nije pokrivena.
- Q03 → B25.04, B25.05: Dualizam i de Broglieeva valna duljina. Ubrzavanje naponom i elektronski mikroskop nisu izričito navedeni.
- Q04 → B26.01: Povijest modela atoma i problem Rutherfordova modela. Opis Rutherfordova pokusa raspršenja i odnos veličina jezgre i atoma nisu izričito navedeni.
- Q05 → B26.02, B26.03, B26.04: Bohrovi postulati, E_n i emisija fotona. Veza sa stojnim valom de Broglieevih valova nije izričito navedena.
- T05 → B12.03, B12.02: Latentna toplina i složena bilanca pokrivene (B12.03, B12.02). Načini prijenosa topline (vođenje, strujanje, zračenje) i izolacija ne postoje u generiranom planu.
- T13 → B12.08, B12.09: Korisnost i Carnotov stroj pokriveni. II. zakon termodinamike, hladnjak/toplinska pumpa i perpetuum mobile druge vrste nisu izričito navedeni.
- V11 → B22.03, B22.04, B22.06, B24.02: Snellov zakon, indeks loma i planparalelna ploča pokriveni; prizma nije izričito navedena. Konstantna frekvencija pri lomu u B20.06.
- V13 → B22.07, B22.08, B31.06: Jednadžba leće, jakost i predznaci pokriveni; obrada tablice mjerenja i kombinacija dviju leća nisu izričito navedene.
- V14 → B22.09, B22.08, B22.07: Slike u lećama i povećanje pokriveni; primjene (oko, kratkovidnost, povećalo, fotoaparat, projektor) nisu izričito navedene.
- V18 → B23.05, B22.03: Raspršenje (plavo nebo) pokriveno u B23.05; disperzija u prizmi i duga nisu izričito pokrivene.