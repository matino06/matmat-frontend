# Mjerenja prototipa

- Lekcija: **39** (nacrt prije spajanja: 40, ručni: 98)
- Zadaci s ispita pokriveni: **164/182**
- Lekcije koje ne treba nijedan zadatak s ispita: 1
- Nulta pretpostavka prekršena: 37 lekcija
- Ručne lekcije koje generirani plan uopće ne pokriva: 3
- Jev razvrstavanje stranica: 191/283 slaže se s nazivom datoteke
- Jev parovi „nova ideja?“: 79, označeno za spajanje 2

## Trošak po koraku (USD)

- assume: 0.025
- classify: 0.009
- compare: 0.207
- coverage: 0.018
- draft: 0.335
- merge-jev: 0.002
- merge-llm: 0.035
- ocr: 0.098
- scope-catalog: 0.120
- scope-exam: 0.031
- **ukupno: 0.88**

## Nepokriveni zadaci s ispita

- [FIZ22ljeto 15] Koji je odnos brzina zvuka u zraku, vodi i željezu? → tablične vrijednosti brzine zvuka u zraku, vodi i željezu
- [FIZ22ljeto 19] Kolika je valna duljina elektrona koji se giba brzinom 1 km/s? → tablična masa elektrona i vrijednost Planckove konstante h
- [FIZ22ljeto 23] Koju frekvenciju titranja tijela na opruzi bi motritelj sa Zemlje mogao izmjeriti ako se svemirski brod giba relativističkom brzinom? → Relativistički Dopplerov efekt (promjena frekvencije izvora koji se giba relativističkom brzinom); lekcije daju samo usporavanje vremena, a V05 obuhvaća klasični Doppler
- [FIZ22ljeto 28] Koliko se topline mora izotermno dovesti idealnom plinu pri normiranom atmosferskom tlaku da mu se volumen poveća s 4 m³ na 6 m³? → Logaritamska formula za rad pri izotermnom procesu W = nRT·ln(V2/V1); lekcije daju samo W = p·ΔV
- [FIZ24prvi 7] Za graf V(T) idealnog plina pri stalnom tlaku (pravac) odrediti što je točno o pravcu. → Apsolutna (Kelvinova) temperaturna ljestvica i pretvorba T = t + 273: u predznanju je samo Celzijeva ljestvica
- [FIZ24prvi 24] Izotop torija-230 raspada se α-raspadom. Koji element nastaje? → Poznavanje periodnog sustava elemenata (koji element ima Z = 88, odnosno Ra)
- [FIZ24prvi 29] Plamenik daje 72 kJ topline u minuti. Odrediti vrijeme potrebno da se 200 g vode i aluminijska posuda mase 100 g zagriju od 20 °C do 90 °C. → Tablične vrijednosti specifičnih toplina vode i aluminija
- [FIZ24prvi 31] Kamion se giba uz brijeg nagiba 30°, koeficijent statičkog trenja 0,7. Odrediti maksimalno ubrzanje kamiona prije nego što sanduk počne kliziti unatrag. → Pojam sile trenja i koeficijenta statičkog trenja
- [FIZ25drugi 8] Dvije kuglice jednakih masa i početnih temperatura (željezo i aluminij) stavljene u pećnicu; odrediti tvrdnju o primljenoj toplini i temperaturi aluminijske kuglice nakon dva sata. → Tablične vrijednosti specifičnih toplina željeza i aluminija
- [FIZ25drugi 9] Jednoatomni idealni plin adijabatski se komprimira na polovicu početnog volumena; odrediti odnos konačnog i početnog tlaka. → Vrijednost adijabatskog eksponenta za jednoatomni plin (γ = c_p/c_v = 5/3)
- [FIZ25drugi 16] Odabrati što treba učiniti da bi transverzalni valovi na užetu imali veću brzinu. → Formula za brzinu transverzalnog vala na užetu v = √(F/μ), koja ovisi o napetosti i linijskoj gustoći užeta, nije u lekcijama
- [FIZ25drugi 27] Odrediti faktor trenja između utega i podloge pomoću dinamometra koji pokazuje težinu utega i silu pri jednolikom povlačenju. → Zakon trenja F_tr = μN (koeficijent trenja i normalna sila) nije izričito naveden u lekcijama
- [FIZ25drugi 34] Matematičko njihalo napravi 10 titraja za 36 s; odrediti visinu do koje se podigne kuglica pri otklonu od 5°. → Formula za period matematičkog njihala T = 2π√(l/g); lekcija V01 navodi njihalo samo kao primjer
- [FIZ25prvi 7] Odrediti masu plina m2 ako dva idealna plina jednakih volumena, tlakova i temperatura imaju molarne mase M2 = 0,5 M1 i masu m1. → pojam količine tvari (mol) i molarne mase M
- [FIZ25prvi 23] Odrediti gorivo koje se koristi u nuklearnoj elektrani Krško. → činjenično znanje da je gorivo Krške nuklearne elektrane obogaćeni uranij
- [FIZ25prvi 25] Izračunati korisnost Carnotova toplinskog stroja između spremnika temperatura 400 K i 300 K. → Kelvinova (apsolutna) temperaturna ljestvica
- [FIZ25prvi 29] Odrediti ukupni tlak zraka u tikvici pri temperaturi 61 °C ako je pri 20 °C manometar pokazao razliku tlaka 144 kPa. → Vrijednost normalnog atmosferskog tlaka (≈101,3 kPa) potrebna je da se iz razlike tlaka na manometru dobije ukupni tlak
- [FIZ25prvi 35] Odrediti aktivnost 1 mola izotopa natrija s vremenom poluraspada 60 s nakon 10 minuta od početka raspadanja. → Pojam množine tvari (mol) i Avogadrov broj (6,022·10²³ čestica/mol) potrebni su za broj jezgri u jednom molu

## Ručne lekcije bez pokrića

- E12: Elektromotorni napon, unutarnji otpor, napon na stezaljkama i kratki spoj ne obrađuje nijedna generirana lekcija.
- M07: Horizontalni hitac i neovisnost gibanja nisu pokriveni u generiranom planu.
- Z01: Strategija ispita, knjižica formula, kalkulator i bodovanje nisu fizikalni sadržaj pa ih generirani plan ne pokriva.

## Djelomično pokrivene ručne lekcije

- E09 → E05: I = Q/t i I = U/R nalaze se u E05. Nedostaju tehnički smjer struje, driftna brzina, ograničenja Ohmova zakona i I-U graf.
- E10 → E05: R = ρl/S nalazi se u E05. Nedostaju temperaturna ovisnost otpora, usporedba materijala i mjerenje otpora.
- E13 → E05, T03: Snaga P = UI = I²R = U²/R nalazi se u E05, a korisnost u M03. Kalorimetrija (T03) pokriva povezivanje Jouleove topline s mcΔT. Nedostaju kilovatsat i Jouleov zakon Q = I²Rt kao zasebne teme te grijanje otpora u serijskom i paralelnom spoju.
- E19 → G03: Lenzovo pravilo je u G03. Nedostaju postupak u tri koraka, petlja koja ulazi u polje, U = Bℓv i veza s očuvanjem energije.
- E22 → G05: X_L = ωL i X_C = 1/ωC pokriveni u G05. Impedancija Z i I = U/Z nisu spomenuti; pretvorba µF → F je samo vještina računanja.
- M01 → M01: Srednja brzina i pojam brzine pokriveni u M01. Fizičke veličine, SI jedinice, pretvorba jedinica i red veličina nisu pokriveni.
- M02 → M01: Položaj i pomak se dotiču u M01. Razlika puta i pomaka, skalari/vektori i Pitagorin poučak za zbrajanje pomaka nisu izričito pokriveni.
- M03 → M01: Akceleracija je definirana u M01. Jednadžbe jednoliko ubrzanog gibanja i preuređivanje formula nisu navedeni.
- M06 → M01, M06: Slobodni pad se spominje samo kao bestežinsko stanje u M06, a akceleracija u M01. Hitac uvis, g, predznaci i rješavanje po vremenu nisu pokriveni.
- M10 → M02, M06: Bestežinsko stanje (M06) i sile (M02). Sila teža, težina i prividna težina u dizalu nisu izričito navedene.
- M11 → M02: Trenje se spominje samo kao toplina u M03, a elastična energija u M03. Sila trenja, elastična sila, konstanta opruge, mjerenje i kontrola varijabli nisu pokriveni.
- M12 → M02: Komponente sila i II. zakon u M02. Kosina, povezana tijela i sila u niti nisu izričito pokriveni.
- M18 → M04, M03: Očuvanje količine gibanja (M04) i energije (M03) postoje. Nema razlike elastični/neelastični sudar, savršeno neelastičnog sudara, tablice prije/poslije ni eksplozije i trzaja.
- M22 → M06: Navedeni su samo Keplerov III. zakon i gravitacija kao centripetalna sila satelita. Fale Keplerov I. i II. zakon, prva kozmička brzina i geostacionarna orbita.
- M23 → F01: Tlak p = F/S pokriven. Gustoća kao zasebna veličina i pretvorbe jedinica (cm², g/cm³) nisu obrađeni.
- Q01 → A01, A02: E = hf iz A01, a A02 koristi p = h/λ za čestice. Fale elektronvolt, količina gibanja fotona i veza frekvencije s prodornošću.
- Q03 → A02, E03: λ = h/p pokrivena, a qU = ΔEk (E03) daje ubrzavanje naponom. Fale dvojnost kao pojam, elektronski mikroskop i Youngov pokus s elektronima.
- Q04 → A03: Thomsonov i Rutherfordov model samo se spominju u zagradi. Fale Rutherfordov pokus, veličine jezgre i atoma te problem zračenja elektrona.
- Q05 → A03, A02: Diskretne razine i hf = E_i − E_j pokrivene. Fale formula E_n = −13,6 eV/n², značenje negativne energije i ionizacije te veza sa stojnim de Broglievim valom.
- Q06 → A03: Linijski spektar i prijelazi među razinama pokriveni. Fale emisijski i apsorpcijski spektar, spektralna analiza i serije vodika.
- Q14 → A07: A07 pokriva Veliki prasak, širenje svemira i život zvijezda do bijelog patuljka, neutronske zvijezde i crne rupe. Ne spominju se izričito crveni pomak, Hubbleov zakon, tri dokaza Velikog praska (kozmičko pozadinsko zračenje, omjer H/He), fuzija kao izvor energije zvijezda ni nukleosinteza. Dopplerov efekt (V05) obrađen je samo za zvuk.
- T01 → T01: Čestična građa, Brownovo gibanje, difuzija i agregacijska stanja pokriveni su. Fali nazivlje prijelaza (sublimacija, desublimacija) i objašnjenje stalne temperature pri faznom prijelazu; T03 samo spominje Q=mL.
- T02 → T01, T02: Temperatura kao mjera srednje kinetičke energije pokrivena je u T01 i T02. Fale skale (K = °C + 273,15), apsolutna nula i razlika temperature i topline (topline djelomice u T03).
- T03 → T01: T01 daje Δl=αl0ΔT i ΔV=γV0ΔT. Fale veza γ≈3α, širenje otvora, prividno širenje tekućine, anomalija vode i primjene.
- T05 → T03: T03 pokriva Q=mL pri promjeni stanja. Fale oslobađanje energije pri kondenzaciji/skrućivanju, složena bilanca i tri načina prijenosa topline (vođenje, strujanje, zračenje) te izolacija.
- T06 → T02: T02 daje pV=nRT i plinske zakone kao posebne slučajeve. Fale količina tvari (N_A, n=m/M), model idealnog plina, granice valjanosti i slučaj promjenjive količine plina.
- T07 → T02, T04: T02 spominje Boyle, Gay-Lussac i Charles kao posebne slučajeve, a T04 izoterman, izobaran i izohoran proces. Fale prepoznavanje procesa iz teksta, grafovi (hiperbola, prevođenje između p-V, p-T i V-T) i V,t graf pri −273 °C.
- T08 → T02: T02 daje Ek=3/2·kT neovisno o plinu i tlak iz sudara. Fale efektivna brzina v_ef=√(3RT/M) i veza R=N_A k_B.
- T09 → T04: T04 spominje promjenu unutarnje energije toplinom i radom. Nema izraza U=3/2·nRT, ΔU=0 u izotermnom procesu izrijekom, niti razlike funkcije stanja i prijenosa.
- T12 → T05, T04: T05 pokriva kružni proces, Q1, W, Q2 i toplinu predanu hladnijem spremniku. Fale ΔU=0 za ciklus, smjer obilaska (stroj/hladnjak) i analiza ciklusa po dionicama.
- T13 → T05: T05 daje η=W/Q1 i Carnotovu korisnost. Fale II. zakon u formulaciji spontanog prijelaza topline, hladnjak i toplinska pumpa, nedostižnost η=1 i perpetuum mobile druge vrste.
- V02 → V01: V01 ima F=−kx, ω i pretvorbu energije. Nema izričito izraza v0=2πA/T i a0=4π²A/T² ni analize položaja najveće brzine i akceleracije.
- V04 → V01: V01 spominje oprugu i njihalo i ω = 2π/T, ali ne navodi izričito T = 2π√(m/k) i T = 2π√(ℓ/g), ni T = t/n, ni neovisnost o masi kod njihala.
- V09 → V05: V05 opisuje samo kvalitativno da približavanje povećava, a udaljavanje smanjuje frekvenciju. Formula f_p = f_i(v+v_p)/(v−v_i), pravilo predznaka i zgušnjavanje fronti nisu navedeni.
- V10 → O01: Zakon odbijanja je pokriven u O01. Pravocrtno širenje, sjena, polusjena i slika u ravnom zrcalu s konstrukcijom nisu navedeni.
- V14 → O02: O02 ima povećanje i vrste slika, ali nema konstrukcije slike tri zrake, četiri slučaja, divergentne leće, oka i optičkih instrumenata.
- V16 → O03: O03 spominje ogib na pukotinama, ali ne i optičku rešetku, konstantu rešetke, redove maksimuma i razlaganje bijele svjetlosti.
- V17 → O03: O03 samo spominje da se svjetlost polarizira. Brewsterov kut, polarizator/analizator i primjene nisu pokriveni.
- V18 → O03: O03 spominje raspršenje ovisno o valnoj duljini. Disperzija, prizma, duga i Rayleighovo raspršenje nisu izričito pokriveni.