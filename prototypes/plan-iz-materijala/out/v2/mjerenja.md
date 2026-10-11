# Mjerenja prototipa

- Lekcija: **188** (nacrt prije spajanja: 201, ručni: 97)
- Zadaci s ispita pokriveni: **170/182**
- Lekcije koje ne treba nijedan zadatak s ispita: 26
- Nulta pretpostavka prekršena: 123 lekcija
- Ručne lekcije koje generirani plan uopće ne pokriva: 0
- Jev razvrstavanje stranica: 191/283 slaže se s nazivom datoteke
- Jev parovi „nova ideja?“: 397, označeno za spajanje 48

## Trošak po koraku (USD)

- assume: 0.142
- classify: 0.009
- compare: 0.487
- coverage: 0.052
- draft: 1.044
- merge-jev: 0.011
- merge-llm: 0.187
- ocr: 0.098
- scope-catalog: 0.120
- scope-exam: 0.031
- **ukupno: 2.18**

## Nepokriveni zadaci s ispita

- [FIZ22ljeto 26] Koliki je upadni kut svjetlosti pri prijelazu iz zraka u staklo indeksa loma 1,5 ako je kut loma 30°? → Inverzna trigonometrijska funkcija (arcsin) na džepnom kalkulatoru nije navedena u predznanju
- [FIZ22ljeto 27] Kolika je gustoća tijela koje pluta između ulja i vode ako je 45 % njegova volumena u vodi? → Tablična gustoća ulja (ako nije zadana u tekstu zadatka)
- [FIZ22ljeto 29] Koliki je napon U izvora ako se naboj na pločama kondenzatora kapaciteta 44 pF promijeni za 35 nC pri stavljanju u ulje? → Relativna permitivnost ulja (tablična vrijednost, ako nije zadana u tekstu zadatka)
- [FIZ23ljeto1 32] Koliko je vremena potrebno da se prazna bačva volumena 50 litara napuni vodom iz cijevi, ako je razlika statičkih tlakova 500 Pa? → gustoća vode (ρ ≈ 1000 kg/m³) nije navedena ni u jednoj lekciji ni u predznanju niti u knjižici formula
- [FIZ23ljeto1 35] Kolika je razlika razina zvuka koje osoba čuje lijevim i desnim uhom od točkastog izvora snage 2,5 mW na udaljenostima 55 cm i 57 cm? → Površina sfere S = 4πr² nije u knjižici formula ni u predznanju (predznanje navodi samo volumen kugle). Također logaritam (log) nije eksplicitno u predznanju, iako ga kalkulator podržava.
- [FIZ24prvi 29] Plamenik daje 72 kJ topline u minuti. Odrediti vrijeme potrebno da se 200 g vode i aluminijska posuda mase 100 g zagriju od 20 °C do 90 °C. → Vrijednosti specifičnog toplinskog kapaciteta vode i aluminija nisu ni u knjižici formula ni u lekcijama.
- [FIZ25drugi 8] Dvije kuglice jednakih masa i početnih temperatura (željezo i aluminij) stavljene u pećnicu; odrediti tvrdnju o primljenoj toplini i temperaturi aluminijske kuglice nakon dva sata. → Vrijednosti specifičnih toplinskih kapaciteta željeza i aluminija nisu ni u knjižici formula ni u lekcijama.
- [FIZ25drugi 10] Dvije paralelne velike metalne ploče s nabojima +q i -q iste apsolutne vrijednosti; odrediti iznos električnog polja izvan i između ploča. → Kvantitativna formula za polje beskonačne nabijene ploče (E = σ/ε₀ ili E = q/(ε₀S)) nije u knjižici formula, a u lekcijama je samo kvalitativno opisana.
- [FIZ25drugi 29] Jedan mol idealnog plina pri stalnom tlaku 1,5 bar i temperaturi 451 K poveća volumen za 20 dm³; odrediti konačnu temperaturu. → pretvorba tlaka iz bara u paskal (1 bar = 10^5 Pa), nije u lekcijama ni predznanju
- [FIZ25drugi 35] Izotop s vremenom poluraspada 10 h i početnim brojem jezgara 1000; odrediti aktivnost nakon 20 h. → vrijednost prirodnog logaritma ln 2 (λ = ln2/T); logaritmi nisu u predznanju ni lekcijama
- [FIZ25prvi 17] Odabrati graf koji točno prikazuje ovisnost intenziteta zvučnog vala I o udaljenosti r od izvora. → Površina sfere S = 4πr² (potrebna za I = P/S; nije u knjižici formula ni u predznanju, jer predznanje navodi samo volumen kugle)
- [FIZ25prvi 28] Odrediti dinamički tlak vode u dijelu horizontalne cijevi pri protoku 0,02 m³/s i presjeku 50 cm². → Gustoća vode ρ = 1000 kg/m³ (nije u knjižici konstanti niti u lekcijama, a potrebna je za p_din = ρv²/2)

## Ručne lekcije bez pokrića


## Djelomično pokrivene ručne lekcije

- E02 → E01: Vodiči i izolatori navedeni su u E01. Fale uzemljenje, elektriziranje dodirom i pravilo o pola zbroja naboja za jednake kugle.
- E05 → E08, E09, E13: Napon W=qU, E=U/d i potencijal točkastog naboja pokriveni. Fale neovisnost rada o putu (konzervativnost) i elektronvolt.
- E07 → E14: Polje unutar vodiča je nula, a naboj je na površini. Fale Faradayev kavez, šuplja kugla, influencija i okomitost silnica na površinu.
- E08 → E15, E16: C=Q/U i C=ε₀ε_rS/d pokriveni. Pretvorbe jedinica i neovisnost C o Q i U nisu izričiti.
- E09 → S01, S02: I=Δq/Δt, Ohmov zakon i nagib I–U grafa pokriveni. Fale tehnički smjer struje, driftna brzina i neohmski vodiči.
- E10 → S03: R=ρℓ/S pokriveno. Fale ovisnost otpora o temperaturi, usporedba materijala i mjerenje otpora.
- E11 → S04, S05: Serijski i paralelni spoj pokriveni. Mješoviti spojevi nisu izričito navedeni.
- E12 → S07: I=ε/(R+R_v) pokriveno. Fale napon na stezaljkama, kratki spoj i U–I graf.
- E13 → S06, Z12, T07: P=UI, W=Pt i korisnost pokriveni, a Q=mcΔt dolazi iz T07. Fale Jouleov zakon, kWh i usporedba grijanja u serijskom i paralelnom spoju.
- E16 → M07: F=qvB sinα i okomitost sile pokriveni. Fale rad Lorentzove sile (nula) i usporedba s Amperovom silom.
- E17 → M07, G03: Kružna putanja i r=mv/(qB) pokriveni. Maseni spektrometar nije naveden.
- E19 → M11, M12, M10: Lenzovo pravilo i U_i=Bℓv pokriveni. Postupak u tri koraka, petlja koja ulazi u polje i veza s očuvanjem energije nisu izričiti.
- E20 → M13, M05, M10, M09, M11: Generator (sinusni napon, rotirajuća petlja), Faradayev zakon, tok i Amperova sila/elektromotor su pokriveni. Fali izričito: uloga komutatora i kliznih prstena, napon kao nagib grafa Φ(t), prosječni inducirani napon za četvrtinu okreta i podrijetlo energije generatora iz mehaničkog rada.
- E23 → M19, M10: Formula transformatora je pokrivena. Fali P₁ = P₂, preslagivanje omjera i objašnjenje zašto radi samo na izmjeničnu struju (ovdje se samo naslućuje preko M10, promjene toka).
- M01 → K02: Pokriveni su brzina i pretvorba km/h u m/s. Fale fizička veličina, čitanje formula, osnovne SI jedinice, metoda zamjene jedinica, srednja brzina kao ukupni put kroz ukupno vrijeme i red veličine brzina.
- M02 → K01, D03: Put i pomak te vektor su pokriveni u K01. Vektorsko zbrajanje je u D03. Fale izričito skalar/vektor, zbrajanje pomaka pod pravim kutom i Pitagorin poučak.
- M05 → K03, K05, K04: Brzina kao nagib s–t grafa i površina pod v–t grafom su pokriveni. Fali a–t graf: površina kao promjena brzine, v = v₀ + Δv, vodoravni a–t graf na nuli, trokut (akceleracija koja raste).
- M08 → D01, D03, D09, D02: Sila, njutn i rezultanta su pokriveni. Dijagram sila je implicitan u D03. Rastavljanje na komponente pokriveno je samo za težinu na kosini (D09), a ne općenito.
- M10 → D02, G08, D04: Sila teža, normalna sila i bestežinsko stanje su pokriveni. Fali težina kao sila na podlogu/ovjes i prividna težina u dizalu (samo se može izvesti iz D04).
- M11 → D08, D10, D07: Trenje (statičko i klizno) i Hookeov zakon su pokriveni. Fali metodologija: mjerenje, srednja vrijednost, pogreška i kontrola varijabli.
- M13 → Z04, Z05: Rad sile, kut i predznak su pokriveni, a džul je implicitan. Fali rad iz grafa F(s).
- M16 → Z11, Z12: Snaga P = W/t, vat i korisnost su pokriveni. Fali P = Fv i konjska snaga.
- M19 → G01, G02, G03: Period, frekvencija, obodna i kutna brzina pokriveni su u G01 i G02, a promjena smjera brzine u G03. Radijan kao mjera kuta nije posebno obrađen.
- M20 → G03, D08, F10: Centripetalna akceleracija i sila pokriveni su u G03, a primjeri uloge sile u F10 (Coulomb) i D08 (trenje). Centrifugalna sila, to da se centripetalna sila ne crta kao dodatna strelica i gibanje po zavoju nisu izričito obrađeni.
- M21 → G05, G06: Zakon gravitacije, obrnuti kvadrat i g = GM/R² su pokriveni. Znanstveni zapis (matematička vještina) nije pokriven. Udaljenost od središta i zanemarivost sile među svakodnevnim predmetima nisu istaknute.
- M22 → G07: Brzina i period satelita iz gravitacijske sile pokriveni su u G07. Keplerovi zakoni, prva kozmička brzina i geostacionarna orbita nisu izričito obrađeni.
- M27 → H10, H11: Bernoullijeva jednadžba i veza brzine i tlaka su pokriveni, ali samo za horizontalnu cijev. Torricellijev izraz, član ρgh i uzgon krila nisu izričito obrađeni.
- Q01 → F01, F05, F20: E = hf = hc/λ i kvantizacija su pokriveni (F01), prodornost zračenja u F20. Elektronvolt i p = h/λ za foton nisu izričito navedeni (F05 daje λ = h/p za čestice).
- Q03 → F05, P11: λ = h/p i ubrzavanje naponom su u F05. Dvojnost, elektronski mikroskop i Youngov pokus s elektronima nisu izričito obrađeni (P11 je Youngov pokus samo sa svjetlošću).
- Q04 → F07: Rutherfordov model i prazan prostor su pokriveni. Thomsonov model, odnos veličina jezgre i atoma te problem zračenja kružećeg elektrona nisu izričito obrađeni.
- Q06 → F09: Prijelazi i energije fotona su pokriveni. Emisijski i apsorpcijski spektar, spektralna analiza i serije u spektru vodika nisu izričito obrađeni.
- Q07 → F11, F12, F10: Zapis jezgre, N = A − Z, izotopi i očuvanje A i Z su pokriveni. Jaka nuklearna sila (F10 samo spominje četiri interakcije) i omjer neutrona i protona u teškim jezgrama nisu izričito obrađeni.
- Q09 → F12, F13, F20, F21: α, β⁻ i γ raspad, prodornost i biološki učinci su pokriveni. β⁺ raspad nije obrađen, a niz uzastopnih raspada pokriva se samo primjenom pravila očuvanja.
- Q14 → V02, V03, V01, V04, F19, F01: Veliki prasak, crveni pomak i životni ciklus zvijezda pokriveni u V02 i V03; fuzija u F19; struktura u V01. Hubbleov zakon v=H₀d nije izričito naveden. Omjer H/He kao dokaz i nukleosinteza težih elemenata također nisu posebno obrađeni. Crveni pomak kao Dopplerov efekt za svjetlost veže se uz O23, ali ga plan ne spominje.
- T02 → T01, T14: Kelvinova ljestvica u T01 (s 273 umjesto 273,15) i srednja kinetička energija u T14. Apsolutna nula, razlika između temperature i topline te uvrštavanje kelvina u plinske zakone nisu posebno obrađeni.
- T03 → T04, T05, T06: Linearno i volumno rastezanje i rupe u T04–T06. Prividno širenje tekućine, anomalija vode i primjene (bimetal, dilatacijske reške) nisu navedeni.
- T05 → T10, T11: Latentne topline i složena bilanca pokrivene su u T10 i T11. Tri načina prijenosa topline (vođenje, strujanje, zračenje) i izolacija ne postoje u generiranom planu.
- T07 → T17, T19, T20: Izotermna, izobarna i izohorna promjena te pV-dijagram pokriveni su u T17, T19 i T20. Prevođenje procesa između p-V, p-T i V-T grafova i V,t graf s −273 °C nisu eksplicitno navedeni.
- T08 → T14, T13: Ek=3kT/2 u T14 i tlak kao posljedica sudara sa stijenkom u T13. Efektivna brzina v_ef=√(3RT/M), Boltzmannova konstanta i veza R=N_A k_B nisu navedeni.
- T09 → T14, T23: Unutarnja energija jednoatomnog plina i njezina ovisnost samo o T u T14, a Q=W+ΔU u T23. ΔU=0 u izotermnom procesu i razlika između funkcije stanja i prijenosa nisu izričito navedeni.
- T13 → T26, T27: Korisnost i Carnotova korisnost pokrivene su u T26 i T27. II. zakon, hladnjak i toplinska pumpa te perpetuum mobile druge vrste nisu navedeni.
- V11 → P03, P04: Snellov zakon, indeks loma, planparalelna ploča i λ u sredstvu su pokriveni (frekvencija je konstantna u O11). Prizma nije pokrivena.
- V13 → P07, P09, P10: Jednadžba leće, jakost i predznaci b su pokriveni. Kombinacija dviju leća (zbrajanje jakosti) nije izričito navedena.
- V14 → P08, P09, P10: Karakteristične zrake, slučajevi sabirne leće i povećanje su pokriveni. Divergentna leća kao slučaj konstrukcije te primjene (oko, kratkovidnost, povećalo, fotoaparat, projektor) nisu pokriveni.
- V17 → P13, P14: Polarizacija transverzalnih valova i Brewsterov kut su pokriveni, raspršenje (P14). Polarizator/analizator, dvolom i primjene nisu izričito navedeni.
- V18 → P14, P03: Raspršenje i plavo nebo su pokriveni. Disperzija (n ovisi o λ, prizma, duga) nije pokrivena.