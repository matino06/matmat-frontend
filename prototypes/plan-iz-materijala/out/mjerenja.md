# Mjerenja prototipa

- Lekcija: **135** (ručni: 97)
- Zadaci s ispita pokriveni: **169/182**
- Lekcije koje ne treba nijedan zadatak s ispita: 20
- Nulta pretpostavka prekršena: 120 lekcija
- Ručne lekcije koje generirani plan uopće ne pokriva: 0
- Jev razvrstavanje stranica: 191/283 slaže se s nazivom datoteke
- Jev parovi „nova ideja?“: 0, označeno za spajanje 0

## Trošak po koraku (USD)

- assume: 0.340
- classify: 0.009
- compare: 0.764
- coverage: 0.129
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
- **ukupno: 7.94**

## Nepokriveni zadaci s ispita

- [FIZ-katalog-2026.pdf 1 (str. 4)] Zadatak je vezan uz shemu električnog polja točkastih naboja, ali tekst zadatka nije dostupan jer je na stranici samo slika bez pitanja. → Tekst zadatka nije dostupan (na stranici je samo slika sheme), pa se potrebno znanje ne može pouzdano procijeniti.
- [FIZ22ljeto 27] Kolika je gustoća tijela koje pluta između ulja i vode ako je 45 % njegova volumena u vodi? → gustoća ulja i vode, ako nisu zadane u tekstu zadatka (nisu u knjižici)
- [FIZ22ljeto 29] Koliki je napon U izvora ako se naboj na pločama kondenzatora kapaciteta 44 pF promijeni za 35 nC pri stavljanju u ulje? → relativna permitivnost ulja, ako nije zadana u tekstu zadatka (nije u knjižici)
- [FIZ23ljeto1 35] Kolika je razlika razina zvuka koje osoba čuje lijevim i desnim uhom od točkastog izvora snage 2,5 mW na udaljenostima 55 cm i 57 cm? → logaritamski račun (logaritmi, log) za izračun razine zvuka u decibelima
- [FIZ24prvi 29] Plamenik daje 72 kJ topline u minuti. Odrediti vrijeme potrebno da se 200 g vode i aluminijska posuda mase 100 g zagriju od 20 °C do 90 °C. → tablične vrijednosti specifičnih toplinskih kapaciteta vode i aluminija (nisu u knjižici formula ni u lekcijama)
- [FIZ24prvi 31] Kamion se giba uz brijeg nagiba 30°, koeficijent statičkog trenja 0,7. Odrediti maksimalno ubrzanje kamiona prije nego što sanduk počne kliziti unatrag. → trigonometrija (sinus i kosinus kuta od 30°), nije u predznanju ni izričito u lekcijama
- [FIZ25drugi 8] Dvije kuglice jednakih masa i početnih temperatura (željezo i aluminij) stavljene u pećnicu; odrediti tvrdnju o primljenoj toplini i temperaturi aluminijske kuglice nakon dva sata. → tablične vrijednosti specifičnih toplinskih kapaciteta željeza i aluminija (nisu u knjižici formula ni u lekcijama)
- [FIZ25drugi 9] Jednoatomni idealni plin adijabatski se komprimira na polovicu početnog volumena; odrediti odnos konačnog i početnog tlaka. → vrijednost κ = 5/3 za jednoatomni plin (izvod iz C_p i C_V nije u lekcijama, a nije ni u knjižici)
- [FIZ25drugi 16] Odabrati što treba učiniti da bi transverzalni valovi na užetu imali veću brzinu. → Ovisnost brzine transverzalnog vala na užetu o napetosti užeta (v = √(F/μ)) nije u lekcijama ni u knjižici formula.
- [FIZ25drugi 17] Detektor zvuka se udalji s 2 m na 20 m od izvora; odrediti za koliko se smanji razina zvuka. → Računanje s logaritmom (npr. 10·log(10⁻²) = −20 dB) nije obrađeno ni u lekcijama ni u predznanju.
- [FIZ25prvi 19] Odrediti kojem području elektromagnetskog spektra pripada val frekvencije 1 MHz. → Granice frekvencijskih područja elektromagnetskog spektra (da 1 MHz pripada radiovalovima); lekcije navode samo poredak područja, a ne njihove granice, i to nije u knjižici formula.
- [FIZ25prvi 28] Odrediti dinamički tlak vode u dijelu horizontalne cijevi pri protoku 0,02 m³/s i presjeku 50 cm². → Gustoća vode (ρ = 1000 kg/m³) potrebna je za dinamički tlak; lekcije spominju gustoću fluida, ali ne navode njezinu vrijednost, a nije ni u knjižici.
- [FIZ25prvi 31] Odrediti udaljenost od podnožja kosine na kojoj se tijelo zaustavi nakon klizanja s visine 5 m niz kosinu nagiba 25° i po horizontalnoj podlozi uz faktor trenja 0,1. → trigonometrijske funkcije sinus i kosinus za kut od 25° (nisu u lekcijama ni u predznanju)

## Ručne lekcije bez pokrića


## Djelomično pokrivene ručne lekcije

- E01 → B13.01, B13.02: Naboj je kvantiziran i očuvan (B13.01), ali nedostaju građa atoma (protoni, elektroni, neutralnost), jedinica C, elementarni naboj e i računanje broja elektrona te zakon očuvanja na primjeru trljanja.
- E02 → B13.01, B13.02: Vodiči i izolatori te elektriziranje dodirom s izjednačavanjem naboja jednakih vodiča su pokriveni. Nedostaju uzemljenje, izričito pravilo 'pola zbroja' i trljanje izolatora.
- E03 → B13.02: Coulombov zakon s dielektrikom i vektorska superpozicija su pokriveni. Nedostaju traženje točke u kojoj je ukupna sila nula i korištenje simetrije kao prečaca.
- E04 → B13.04: E = F/q, polje točkastog naboja 1/r² i silnice su pokriveni. Nedostaju homogeno polje između ploča, izvan-ploča nulto polje i izričita superpozicija polja.
- E05 → B13.05: Potencijal, napon, rad konzervativne sile, ekvipotencijalne plohe i elektronvolt su pokriveni. Nedostaju eksplicitno W = qU i E = U/d u homogenom polju.
- E06 → B13.06: F = qE i analogija s hitcem u homogenom polju su pokriveni. Nedostaju ubrzavanje naponom (qU = ½mv², v = √(2qU/m)) i smjer skretanja elektrona.
- E07 → B13.07, B13.02: Polje nula u vodiču, naboj na površini, šuplja kugla i Faradayev kavez su u B13.07; influencija je spomenuta u B13.02. Nedostaje objašnjenje da su silnice uvijek okomite na površinu vodiča.
- E08 → B13.08: Kapacitet ovisi o geometriji i dielektriku te kondenzator pohranjuje energiju. Nedostaju formula C = ε₀ε_rS/d, C = Q/U, pretvorbe jedinica i objašnjenje da C ne ovisi o naboju ni naponu.
- E08b → B13.08: Razlikovanje odspojenog i spojenog kondenzatora (što ostaje stalno) je pokriveno. Nedostaju kvantitativne veze: promjena U, Q i W za faktor ε_r, ΔQ = (ε_r − 1)CU i W = CU²/2.
- E10 → B15.02: Ovisnost otpora o geometriji i materijalu je pokrivena. Nedostaju formula R = ρℓ/S, računanje presjeka S = r²π, usporedba materijala i ovisnost o temperaturi.
- E12 → B15.03: Spomenut je realni izvor i složeni krug. Nedostaju elektromotorni napon ε, unutarnji otpor r, veza U = ε − Ir, kratki spoj i mjerenje iz U,I grafa.
- E16 → B17.01, B17.04: Formula sile i okomitost na v i B su pokriveni. Nedostaje tvrdnja da Lorentzova sila ne obavlja rad, kao i ne-promjena kinetičke energije te veza s Amperovom silom.
- E19 → B18.03: Lenzovo pravilo i njegova veza s očuvanjem energije su pokriveni. Nedostaju postupak u tri koraka, slučaj ulaska petlje u polje, formule U_i = Bℓv sin α i I = U/R te objašnjenje da struje nema kad se tok ne mijenja.
- E20 → B18.07, B18.02, B18.03: Generator i elektromotor te Faradayev zakon su pokriveni (B18.07, B18.02). Nedostaju objašnjenje zašto rotacija daje sinusni napon, uloga komutatora i kliznih prstena te veza napona s nagibom grafa Φ(t) za pojedine četvrtine okreta.
- E23 → B18.07, B18.01: Transformator i omjer zavoja/napona su pokriveni. Nedostaju omjer struja, idealni transformator (P₁ = P₂) i objašnjenje zašto transformator radi samo na izmjeničnu struju (promjena toka).
- M01 → B01.01, B31.05, B31.03: Srednja brzina, SI jedinice i pretvorbe su pokrivene. Nedostaju osjećaj za red veličine, metoda zamjene jedinica i pojam fizičke veličine kao broja s jedinicom.
- M02 → B01.01, B03.01: Razlika puta i pomaka te vektorska narav veličina su pokriveni. Nedostaju zbrajanje pomaka pod pravim kutom i Pitagorin poučak.
- M05 → B01.04: Čitanje grafova je spomenuto, ali nisu eksplicitno obrađeni računanje brzine iz nagiba s–t grafa, površina ispod a–t grafa i izračun v = v₀ + Δv.
- M07 → B03.06: Horizontalni hitac kao zbroj jednolikog i slobodnog pada je pokriven. Nedostaju vrijeme leta, domet, komponente brzine i eksplicitna neovisnost gibanja.
- M11 → B03.03: Trenje i statičko trenje su pokriveni. Nedostaju elastična sila opruge, konstanta opruge i mjerenje fizikalnih veličina (pogreška, kontrola varijabli).
- M17 → B04.02, B04.03: Količina gibanja, impuls i zakon očuvanja su pokriveni. Nedostaje objašnjenje zašto zračni jastuk smanjuje silu pri istoj promjeni količine gibanja, zašto se unutarnje sile pokrate i kako birati predznake za tijela u suprotnim smjerovima.
- M18 → B04.04, B05.03: Vrste sudara, očuvanje količine gibanja i kamo odlazi energija (toplina) su pokriveni. Nedostaju savršeno neelastični sudar kao zasebna tema, tablica prije/poslije i rješavanje eksplozije i trzaja.
- M19 → B06.01, B06.02: Period, frekvencija, obodna i kutna brzina te usporedba točaka na različitim polumjerima su pokriveni. Nedostaju radijan kao mjera kuta i objašnjenje zašto se brzina mijenja iako joj se iznos ne mijenja.
- M20 → B06.02, B06.04: Centripetalno ubrzanje, centripetalna sila kao rezultanta i izjednačavanje s mv²/r su pokriveni. Nedostaju prepoznavanje koja sila glumi centripetalnu, zabrana crtanja centripetalne sile u dijagramu, pojam centrifugalne sile i uvjet za zavoj.
- M21 → B07.01, B07.02: Zakon gravitacije, ovisnost o udaljenosti i izvod g iz mase i polumjera su pokriveni. Nedostaju znanstveni zapis, usporedba s malom silom između svakodnevnih predmeta i izričit naglasak na udaljenosti od središta.
- M22 → B07.03, B07.04: Brzina satelita u kružnoj orbiti i treći Keplerov zakon su pokriveni. Nedostaju prvi i drugi Keplerov zakon, eksplicitna prva kozmička brzina i geostacionarna orbita.
- M25 → B08.04, B08.05: Arhimedov zakon, uzgon F = ρgV i uvjeti tonjenja, lebdenja i plutanja su pokriveni. Nedostaju prividna težina uronjenog tijela, udio ledenjaka iznad vode i objašnjenje zašto čelični brod pluta.
- M27 → B09.02, B09.03: Bernoullijeva jednadžba, manji tlak pri većoj brzini i računanje brzina i tlakova su pokriveni. Nedostaju Torricellijev izraz za istjecanje, objašnjenje uzgona krila i izričito pitanje zašto je rezultat sličan slobodnom padu.
- Q01 → B24.02, B25.01: Energija fotona E = hf, veza c = λf i prodornost preko spektra su pokriveni. Nedostaje količina gibanja fotona p = h/λ i eksplicitna definicija elektronvolta.
- Q03 → B25.05, B25.03: Valna duljina λ = h/p i valno-čestična dualnost su pokriveni. Nedostaju kombinacija s ubrzavanjem naponom λ = h/√(2mqU), elektronski mikroskop i Youngov pokus s elektronima.
- Q04 → B26.01: Razvoj od Thomsonova do Rutherfordova modela je pokriven. Nedostaju detalji Rutherfordova pokusa (većina prolazi, rijetka velika skretanja), odnos veličina jezgre i atoma te problem zračenja elektrona u Rutherfordovu modelu.
- Q05 → B26.02, B26.03, B26.04: Bohrovi postulati, E_n = −13,6 eV/n², ionizacija i energija emitiranog fotona su pokriveni. Nedostaje veza sa stojnim valom i de Broglieovom valnom duljinom te eksplicitno objašnjenje da električna sila drži elektron na stazi.
- Q07 → B27.01, B27.03: Građa jezgre, izotopi, jaka nuklearna sila i očuvanje A i Z su pokriveni. Nedostaju zapis N = A − Z i objašnjenje zašto teške jezgre trebaju više neutrona od protona.
- Q09 → B27.04, B28.03: Raspadi α, β⁻, β⁺ i γ te prodornost zračenja su pokriveni. Nedostaju praćenje jezgre kroz niz uzastopnih raspada i eksplicitno objašnjenje zašto prodornost i biološka opasnost nisu isto (djelomično u B28.04).
- Q10 → B28.01, B28.02: Poluraspad i aktivnost (A = λN) su pokriveni, ali eksplicitna formula N = N₀·(1/2)^(t/T), računanje preko broja poluraspada i primjena za datiranje C-14 nisu izričito navedeni.
- Q14 → B30.01, B30.02, B30.04, B30.05, B30.06: Crveni pomak, Hubbleov zakon, Veliki prasak, život zvijezda i fuzija su pokriveni. Nedostaju omjer vodika i helija kao dokaz te detaljnija nukleosinteza.
- T02 → B11.01, B11.04, B12.01, B31.05: Pretvorba u kelvine, veza s kinetičkom energijom i razlika temperature i topline su pokriveni. Apsolutna nula kao granica toplinskog gibanja nije eksplicitno navedena.
- T05 → B12.03: Latentna toplina pri taljenju i isparavanju i stalna temperatura su pokriveni. Tri načina prijenosa topline (vođenje, strujanje, zračenje) nisu u generiranom planu.
- T08 → B11.04: Tlak kao posljedica sudara i veza kinetičke energije s temperaturom su pokriveni. Izraz Ek = (3/2)k_B T, Boltzmannova konstanta i efektivna brzina v_ef nisu eksplicitno navedeni.
- T13 → B12.08: Carnotova korisnost i toplinski stroj su pokriveni. II. zakon termodinamike, hladnjak i toplinska pumpa te perpetuum mobile druge vrste nisu u generiranom planu.
- V03 → B19.01, B19.03: Generirani plan spominje da je ukupna energija titranja proporcionalna A² i da se mijenja između kinetičke i elastične potencijalne, ali nema eksplicitne formule E_uk = ½kA², ni čitanja A i E_uk s grafa E_p(x), ni računanja k, ni E_p = ½kx² i E_k = E_uk − E_p.
- V04 → B19.03, B19.05: Ovisnost perioda o masi i k (opruga) i o duljini niti i g (njihalo) je pokrivena, ali nema formula T = 2π√(m/k) i T = 2π√(ℓ/g), mjerenja perioda preko broja titraja, izvlačenja k i ℓ te eksplicitne tvrdnje da masa nije u formuli za njihalo.
- V05 → B20.01, B20.02: Pokriveni su val kao prijenos energije bez tvari, transverzalni i longitudinalni valovi te v = λf. Nedostaju čitanje grafova y(x) i y(t), četvrtina perioda i eksplicitna tvrdnja da brzina ovisi o sredstvu, a frekvencija o izvoru.
- V11 → B22.03, B22.04, B22.06, B20.05: Snellov zakon, indeks loma, planparalelna ploča i nepromijenjena frekvencija su pokriveni. Nedostaje prizma i skretanje na dvjema neparalelnim plohama.
- V14 → B22.08, B22.09: Ovisnost vrste, veličine i položaja slike o položaju predmeta i povećanje su pokriveni. Nedostaju konstrukcija zrakama, primjene (oko, kratkovidnost, dalekovidnost, povećalo) i divergentna leća.
- V16 → B23.01, B23.03: Ogib, optička rešetka s d sin α = kλ i mjerenje valne duljine su pokriveni. Nedostaju razlaganje bijele svjetlosti, zaključak da veća λ skreće više, ograničenje sin θ ≤ 1 i zašto rešetka daje oštrije maksimume.
- V18 → B23.05: Rayleighovo raspršenje i plavo nebo su pokriveni. Nedostaju disperzija (ovisnost indeksa loma o valnoj duljini), razlaganje svjetlosti prizmom, duga i nepromijenjena frekvencija pri raspršenju.