# Granulacija koncepata: kako drugi određuju veličinu koncepta i granice lekcija

Istraživanje za [#6](https://github.com/matino06/matmat-frontend/issues/6) (dio mape [#2](https://github.com/matino06/matmat-frontend/issues/2)). Pojmovi su iz [`GLOSSARY.md`](../../GLOSSARY.md): lekcija, koncept, preduvjet, zadatak, lekcija primjene, pretpostavljeno predznanje.

**Pitanje:** kako sustavi i istraživanja određuju koliko je velik jedan koncept i kad nešto zaslužuje zasebnu lekciju, tako da plan pokrije gradivo s najmanje lekcija i bez ponavljanja?

## Kratki odgovor

Nitko od proučenih ne određuje granicu koncepta „po osjećaju za temu”. Granica se određuje **razlikom u znanju između zadataka**: novi koncept postoji samo ako zadatak traži nešto što se ne može dobiti iz već naučenog. Iz izvora slijede ova pravila za pipeline:

1. **Test razlike.** Napiši laičko objašnjenje kandidat-zadatka koristeći samo postojeće lekcije, njihove preduvjete i pretpostavljeno predznanje, pa imenuj što fali. Ako ne fali ništa, ili fali samo kontekst ili koncept koji već ima svoju lekciju, onda to nije nova lekcija. Ako fali nova ideja, ona (i samo ona) je koncept nove lekcije. To je logika „difficulty factors” i „integrativnog KC-a” iz KLI-ja.
2. **Promjena konteksta nije koncept.** Srce, raketa i mion u istoj formuli su isti zadatak, samo s drugom pričom (Khan Academy). Prijenos u novi kontekst je zaseban sloj: kod Math Academyja su to „advanced application topics”, kod nas lekcija primjene u brzoj pripremi.
3. **Obrnuta upotreba formule nije novi koncept**, osim ako traži novu operaciju. Podaci (Liu i Koedinger) pokazuju da je „traži r iz površine kruga” zaseban KC samo zato što traži korijen. Za ostale likove obrat nije zaseban.
4. **Lekcija pokriva sve tipove zadataka svog koncepta.** Pet varijacija mora pokriti važne slučajeve koncepta (Math Academy, Khan). Ako za to treba više od otprilike 5 bitno različitih tipova, lekcija je preširoka (Khan: „više od 3–5 tipova” je znak za dijeljenje).
5. **Ograniči ulaz preduvjeta.** Kod Math Academyja su 1–2 izravna preduvjeta idealna, 3 su u redu, a više od 3–4 je znak preopterećenja i razlog za dijeljenje lekcije.
6. **Test ekvivalencije za spajanje.** Ako za dvije lekcije vrijedi „tko ne zna A, sigurno ne zna B” i obratno, to je jedan koncept i lekcije se spajaju (KST, „diskriminativna” struktura i pitanja tipa QUERY).
7. **LLM sustavno pretjerano dijeli.** U radu Wang, Lin i Koedinger LLM je napravio 569 KC-ova umjesto 101 koliko ih ima ekspertni model. Zato pipeline mora imati izričit korak spajanja: kandidate traži semantičkom sličnošću, a odluku donosi testom razlike.

## Što rade drugi

### Math Academy

- **Jedinica je „topic” (lekcija)**, podijeljen na 3–4 „knowledge pointa” rastuće težine. Svaki knowledge point je riješeni primjer plus 2–5 sličnih zadataka ([The Math Academy Way, PDF str. 449](https://www.justinmath.com/files/the-math-academy-way.pdf); [Skycak, „How Math Academy Creates its Knowledge Graph”](https://justinmath.com/how-math-academy-creates-its-knowledge-graph/)). U podcastu Jason Roberts kaže da je tri knowledge pointa „idealno, ponekad četiri”, a dva ili pet su krajnji slučajevi ([Podcast #4, dio 2](https://justinmath.com/math-academy-podcast-4-part-2/)).
- **Lekcija pokriva sve tipove zadataka svog topica.** Načelo je da svaka lekcija pokrije sve tipove zadataka koje bi učenik razumno trebao znati riješiti ako stvarno zna topic ([The Math Academy Way, PDF str. 243](https://www.justinmath.com/files/the-math-academy-way.pdf)).
- **Primjena je zaseban sloj.** Imaju „advanced application topics” koji učenika prevode s čisto matematičkog oblika na tekstualne zadatke, topice koji izričito uče neočite veze i višedijelne zadatke koji spajaju ranije topice ([isto, PDF str. 243](https://www.justinmath.com/files/the-math-academy-way.pdf)). To odgovara našoj lekciji primjene.
- **Granulacija je namjerno sitna.** Kolegij ima 150–300 lekcija, a sadržaj je „oko 10x finije skeliran” od udžbenika: analiza u udžbeniku ima oko 100 koraka, kod njih oko 1000 (~300 topica × 3–4 KP-a) ([PDF str. 130, 449](https://www.justinmath.com/files/the-math-academy-way.pdf)). Važno je primijetiti da je ta sitnoća većinom *unutar* lekcije, u knowledge pointima, a ne u broju lekcija.
- **Granice su ručni rad.** Graf „handcraftaju”. Veličinu chunka biraju po stečenom „osjećaju”, a ponekad shvate da chunk treba podijeliti ([Skycak](https://justinmath.com/how-math-academy-creates-its-knowledge-graph/)). Na stranici nema pravila za spajanje.
- **Okidači za dijeljenje:**
  - previše preduvjeta: topic s 15 preduvjeta je „cognitive overload” i treba ga podijeliti ([Podcast #4, dio 1](https://justinmath.com/math-academy-podcast-4-part-1/));
  - prevelik topic: primjer je blok linearnih jednadžbi s otprilike 18 knowledge pointa u jednom topicu ([isto](https://justinmath.com/math-academy-podcast-4-part-1/));
  - pravila palca za preduvjete: 1–2 izravna su odlična, 3 su u redu, više od 3–4 je nelagodno ([Podcast #4, dio 2](https://justinmath.com/math-academy-podcast-4-part-2/));
  - empirijski okidač: prolaznost knowledge pointa ispod mjerila od 94–95 % ([isto](https://justinmath.com/math-academy-podcast-4-part-2/)).
- **Ključni preduvjeti.** Svaki knowledge point vezan je na „key prerequisite” topice, odnosno na znanje koje se u njemu najizravnije koristi. Ako učenik dvaput padne na istom knowledge pointu, dobiva ponavljanje upravo tih preduvjeta ([PDF str. 474](https://www.justinmath.com/files/the-math-academy-way.pdf)).
- **Encompassing.** Napredni zadaci implicitno vježbaju jednostavnije vještine. Težina encompassinga je udio preduvjeta koji se prosječno pokrije rješavanjem zadatka višeg topica, a ručno se procjenjuje ([PDF str. 472](https://www.justinmath.com/files/the-math-academy-way.pdf); [Skycak](https://justinmath.com/how-math-academy-creates-its-knowledge-graph/)).
- **Sažimanje grafa.** Za dijagnostiku graf sažimaju u najmanji skup topica koji „pokriva” kolegij na željenoj granulaciji. Topic je pokriven ako ima i pretka i potomka unutar 3 brida preduvjeta ([PDF str. 376](https://www.justinmath.com/files/the-math-academy-way.pdf)). To je formalni analogon našeg cilja „najmanje lekcija koje pokrivaju gradivo”.

### Khan Academy (vodič za autore vježbi)

Iz službenog wikija [`Khan/khan-exercises`](https://github.com/Khan/khan-exercises/wiki/Checklist:-What-makes-a-good-exercise%3F) (repozitorij je danas zastario, ali je to Khanova vlastita kontrolna lista za autore):

- Vježba se fokusira na **jednu i samo jednu vještinu**. Sve ostalo što zadatak traži mora biti razuman preduvjet. Primjer: trigonometrijski identitet u zadatku o površini trokuta odvlači pažnju.
- Vježba mora pokriti **sve što treba znati o vještini**. Ako nešto fali, dodaje se novi tip zadatka, a ne nova vježba.
- **„Ako imaš više od 3–5 tipova zadataka, vještina je možda preširoka”**. Primjer dijeljenja je „površina likova” u „površina kruga”, „površina kvadrata” i tako dalje.
- **Dva tipa ne smiju pitati u biti isto pitanje.** Primjer je „vjerojatnost da je kuglica plava” prema „vjerojatnost da je bombon plav”. Promjena priče, dakle, nije ni novi tip zadatka, a kamoli novi koncept.
- Posebni slučajevi (npr. nulta potencija) dobivaju svoj tip zadatka unutar iste vještine.
- Aritmetika mora biti jednostavna, da teški dio bude baš koncept koji se uči.

Khanova službena stranica pomoći (razine savladanosti vještina) nije bila dostupna za provjeru (Cloudflare blokada), pa se ovaj dokument oslanja samo na wiki.

### KLI framework i knowledge components (Koedinger, Corbett, Perfetti)

- **Definicija:** Knowledge Component je „stečena jedinica kognitivne funkcije ili strukture koja se može zaključiti iz uspjeha na skupu povezanih zadataka” ([Koedinger, Corbett i Perfetti 2012, Cognitive Science 36(5)](https://doi.org/10.1111/j.1551-6709.2012.01245.x); [preprint, str. 13](https://home.cs.colorado.edu/~mozer/Teaching/syllabi/TopicsInCognitiveScienceFall2011/KLI-paper-v5.00.pdf)). Granica KC-a je dakle **empirijska**: zadaci pripadaju istom KC-u ako ih učenik rješava istim znanjem.
- **Integrativni KC i logika oduzimanja.** Ako je složeni zadatak znatno teži od dva usporediva jednostavna zadatka koje sadrži, razlika ukazuje na dodatni KC. Primjer: učenici su znatno lošiji u prevođenju dvokoračnih tekstualnih zadataka u izraz (800−40x) nego u dva jednokoračna (800−y i 40x). Nedostajući KC je pravilo da se izraz može ugnijezditi u izraz, a ciljana nastava tog KC-a poboljšala je rezultate ([preprint, str. 23](https://home.cs.colorado.edu/~mozer/Teaching/syllabi/TopicsInCognitiveScienceFall2011/KLI-paper-v5.00.pdf)).
- **Ekspertna slijepa pjega.** Instruktori i dizajneri često previde neverbalno znanje koje zadatak traži ([preprint, str. 20](https://home.cs.colorado.edu/~mozer/Teaching/syllabi/TopicsInCognitiveScienceFall2011/KLI-paper-v5.00.pdf)). To je argument za pravilo nulte pretpostavke: skriveni korak koji ekspert ne primjećuje je upravo ono što test razlike treba uloviti.

### Učenje iz podataka: Difficulty Factors, LFA i DataShop

- **Difficulty Factors Assessment:** „kad je jedan zadatak znatno teži od blisko povezanog zadatka, razlika implicira zahtjev za znanjem (barem jedan KC) koji teži zadatak ima, a lakši nema” ([Liu i Koedinger 2017, JEDM 9(1), str. 2](https://jedm.educationaldatamining.org/index.php/JEDM/article/download/212/pdf_29)).
- **Obrnuti zadatak nije automatski novi KC.** Learning Factors Analysis je podijelio površinu kruga na „nađi površinu iz r” i „nađi r iz površine”, ali za druge likove nije. Skrivena razlika je primjena korijena. Model koji dijeli samo krug i kvadrat bolje opisuje podatke i od konzervativnog modela (jedan KC po liku) i od liberalnog (podjela naprijed/natrag za sve likove). Redizajn tutora po tom nalazu donio je značajno veći napredak učenika ([isto, str. 4 i 12](https://jedm.educationaldatamining.org/index.php/JEDM/article/download/212/pdf_29)). Pouka je da preliberalno dijeljenje opisuje učenje lošije, a ne bolje.
- **Dijagnostika krivulja učenja (DataShop).** Krivulje se razvrstavaju u kategorije ([DataShop help, Learning Curve](https://pslcdatashop.web.cmu.edu/help?page=learningCurve)):
  - **„Low and flat”**: KC je savladan, a i dalje se vježba, dakle previše vježbe;
  - **„No learning”**: nema vidljivog učenja, pa treba razmotriti dijeljenje KC-a;
  - **„Still high”**: učenici i dalje imaju teškoća;
  - **„Too little data”**: premalo prilika, pa treba dodati zadatke ili spojiti KC-ove.

### Knowledge Space Theory / ALEKS

- **Jedinica je „item”, odnosno tip zadatka**, a ne pojedinačni zadatak. Konkretni zadaci su „instance” itema. Područje Beginning Algebra u ALEKS-u ima oko 650 itema ([Doignon i Falmagne, „Knowledge Spaces and Learning Spaces”, arXiv:1511.06757, str. 2](https://arxiv.org/pdf/1511.06757)).
- **Preduvjeti iz pitanja ekspertu (QUERY).** Pitanje glasi: „Učenik je upravo netočno odgovorio na item q. Je li praktički sigurno da će pogriješiti i item r?” Odgovori grade relaciju preduvjeta, a dio odgovora se zaključuje iz ranijih ([isto, str. 37–38](https://arxiv.org/pdf/1511.06757)).
- **Diskriminativnost.** Struktura je „diskriminativna” ako nikoja dva itema ne pripadaju točno istim stanjima znanja. Ako se dva itema uvijek znaju ili ne znaju zajedno, struktura ih ne razlikuje ([isto, str. 3–4](https://arxiv.org/pdf/1511.06757)). Za nas je to formalni test ekvivalencije: takve dvije lekcije su jedan koncept.
- **Mjerljiv rezultat.** Vjerojatnost da učenik stvarno nauči item iz „vanjskog ruba” svog stanja (ono što je spreman učiti) je oko 0,93 ([isto, str. 16](https://arxiv.org/pdf/1511.06757)). Dobar graf preduvjeta, dakle, mjerljivo predviđa što je učenik spreman učiti.
- **Razlika od MatMata.** KST item je *tip zadatka*, pa bi KST „otkucaje srca uz dilataciju” vodio kao zaseban item. Naša lekcija je krupnija od KST itema: sliči Khanovoj vještini (3–5 tipova) ili topicu Math Academyja (3–4 KP-a). KST pitanja zato koristimo za preduvjete i spajanje, a ne za određivanje veličine lekcije.

### Automatska izrada grafa preduvjeta i KC-ova s LLM-ovima

- **LLM pretjerano dijeli.** S promptom „simulirani udžbenik” GPT-4o-mini je na 646 pitanja generirao 569 KC-ova, prema 101 u ekspertnom modelu, i lošije predviđao uspjeh učenika. Spajanje semantički sličnih oznaka (kosinusna sličnost, najbolji prag 0,8) smanjilo je broj na 428 i poboljšalo RMSE ([Wang, Lin i Koedinger, arXiv:2511.09935, LAK'25 radionica](https://arxiv.org/abs/2511.09935)). To potvrđuje iskustvo s „previše lekcija”. Primijetiti: ni nakon spajanja nije se ni približilo stotinjak ekspertnih KC-ova, pa samo spajanje po sličnosti nije dovoljno.
- **Grupiranje zadataka prije imenovanja.** Moore, Schmucker, Mitchell i Stamper razvili su algoritam koji grupira pitanja koja provjeravaju isti KC prema sadržaju, bez oznaka. Najbolja LLM strategija pogodila je KC za 56 % pitanja iz kemije i 35 % iz e-learninga ([arXiv:2405.20526, L@S 2024](https://arxiv.org/abs/2405.20526)).
- **Preduvjeti su LLM-u lakši od granulacije.** Fino podešeni LLM-ovi učinkovito otkrivaju odnose preduvjeta među konceptima i mogu objasniti zašto ([Aytekin i Saygın 2024, Interactive Learning Environments, doi:10.1080/10494820.2024.2375338](https://research.sabanciuniv.edu/id/eprint/49789/)). Zero-shot LLM-ovi daju predviđanja preduvjeta vještina koja se blisko slažu s ekspertnima na benchmarku od 3.196 vještina ([Le i Abel 2025, arXiv:2507.18479](https://arxiv.org/abs/2507.18479), nerecenzirano).
- **Math Academy ne koristi LLM za graf.** Graf ručno rade domenski eksperti, a alati samo pomažu ([Skycak](https://justinmath.com/how-math-academy-creates-its-knowledge-graph/)).

## Pravila za pipeline

Ovo je sinteza, a ne citat: pravila su izvedena iz gornjih izvora i uz svako je naveden izvor ideje. Sva su formulirana kao da/ne pitanja, da ih mogu donositi jeftini modeli odluke, a generativni LLM samo piše tekst koncepta.

### P1. Koncept se piše kao ideja, ne kao zadatak

Svaki kandidat za lekciju dobiva jednu rečenicu koja kaže *što je nova ideja*, npr. „vrijeme u sustavu koji se giba teče sporije, faktor γ”. Ako rečenica počinje glagolom zadatka („izračunaj”, „primijeni na”, „odredi frekvenciju srca uz…”), kandidat je tip zadatka ili primjena, a ne koncept. Izvori: definicija KC-a kao znanja iza skupa zadataka (KLI), Khanovo „jedna vježba, jedna vještina” i glosar („Koncept: nova ideja … ne može je izvesti iz ranijih lekcija”).

### P2. Test razlike, glavni test za „novi koncept ili primjena”

Za kandidata B i već prihvaćene lekcije:

1. Napiši laičko objašnjenje jednog B-zadatka koristeći samo prihvaćene lekcije, njihove preduvjete i pretpostavljeno predznanje.
2. Imenuj ostatak, tj. korak koji se ne može objasniti tim znanjem.
3. Odluka:
   - **nema ostatka** → B je varijacija postojeće lekcije (jedan od 5 zadataka) ili, ako je promjena samo kontekst, lekcija primjene (samo u brzoj pripremi);
   - **ostatak je koncept koji već ima lekciju** (npr. f = 1/T) → B je primjena, a ta lekcija postaje preduvjet;
   - **ostatak je alat** (jedinice, preslagivanje formule, korijen) → alat se uči u lekciji gdje prvi put zatreba (postojeće pravilo); nije nova lekcija;
   - **ostatak je nova ideja** → nova lekcija čiji je koncept *točno taj ostatak*, a ne cijeli B.

Izvori: logika oduzimanja i integrativni KC (KLI); Difficulty Factors Assessment (Liu i Koedinger).

### P3. Kontekst i obrat formule ne stvaraju lekciju

- Ista formula u drugoj priči (srce, raketa, mion) je ista lekcija, jer Khan ne dopušta ni dva tipa zadatka koja se razlikuju samo pričom.
- Računanje „unatrag" (traži ulaz iz izlaza) je varijacija iste lekcije. Iznimka je slučaj kad obrat traži novu operaciju; tada se ta operacija tretira po P2 kao alat ili koncept (Liu i Koedinger, primjer s korijenom).

### P4. Pet varijacija kao mjera veličine

- **Preširoka lekcija:** ako 5 varijacija ne može pokriti sve važne slučajeve koncepta (posebni slučajevi uključeni), lekcija je preširoka. Izvori: Khanovo „više od 3–5 tipova je preširoko” i Math Academyjeva 3–4 knowledge pointa po topicu.
- **Preuska lekcija:** ako lekcija ne može dati 5 varijacija koje se razlikuju po nečemu osim brojeva i priče, vjerojatno je preuska i kandidat za spajanje sa susjednom. Ovo je izvedeno pravilo: u izvorima postoji samo gornja granica, a donju predlažemo kao simetričnu provjeru.

### P5. Ograničenje preduvjeta

- Lekcija s više od 3–4 izravna preduvjeta dobiva upozorenje i prijedlog dijeljenja, a lekcija s mnogo više od toga mora se podijeliti (Math Academy: 1–2 idealno, 3 u redu, 15 je „cognitive overload”).
- Ne računaju se pretpostavljeno predznanje i alati koji se uče u samoj lekciji. To je naša prilagodba.

### P6. Test ekvivalencije za spajanje (KST)

Za svaki par lekcija koje su si slične po nazivu ili su izravno povezane, model odluke odgovara na dva QUERY pitanja:

- „Ako učenik ne zna A, je li praktički sigurno da ne zna B?”
- „Ako učenik ne zna B, je li praktički sigurno da ne zna A?”

Odluka:

- **oba DA** → isti koncept, spoji lekcije;
- **samo jedno DA** → preduvjet u tom smjeru;
- **oba NE** → neovisne lekcije.

### P7. Otkrivanje prerazdvajanja (over-splitting)

Signali, od najjeftinijeg prema najskupljem:

1. **Semantička sličnost** naziva ili rečenica koncepata iznad praga (Wang i sur. su koristili 0,8) daje *kandidate* za spajanje. Sama sličnost ne odlučuje, nego se kandidat provjerava testom ekvivalencije (P6) i testom razlike (P2).
2. **Rečenica koncepta je zadatak**, ne ideja (P1).
3. **Test razlike nema ostatka** prema nekoj ranijoj lekciji (P2).
4. **Lekcija ne može dati 5 bitno različitih varijacija** (P4, donja granica).
5. **Lekcije se razlikuju samo smjerom** računanja ili kontekstom (P3).
6. **Nakon učenja, iz SM-2 podataka:** lekcija koju učenici rješavaju točno od prvog puta i dalje se drži točnom („low and flat” u DataShopu) je kandidat za spajanje ili za premještanje u pretpostavljeno predznanje.
7. **Usporedba s referentnim planom:** generirani plan fizike mora imati manje lekcija od ručnog plana od 97 lekcija uz istu pokrivenost (već odlučeno u #2).

### P8. Otkrivanje podrazdvajanja (under-splitting)

Signali:

- više od 5 bitno različitih tipova zadataka (P4);
- više od 3–4 izravna preduvjeta (P5);
- jedna od 5 varijacija je znatno teža od ostalih, a razlog nisu veći brojevi. Prema Difficulty Factors logici to znači skriveni dodatni koncept, pa test razlike treba primijeniti na tu varijaciju;
- nakon učenja: niska prolaznost na jednoj varijaciji (Math Academy dijeli kad prolaznost padne ispod 94–95 %) ili krivulja „no learning” (DataShop).

## Primjer: dilatacija vremena

| Kandidat | Rečenica (P1) | Test razlike (P2) | Odluka |
|---|---|---|---|
| „Izračunaj dilataciju vremena” | „Vrijeme u sustavu koji se giba prema promatraču teče sporije za faktor γ” | Ostatak prema ranijim lekcijama: nova ideja (relativnost vremena, γ) | **Nova lekcija** |
| „Srce kuca frekvencijom f, kolika je frekvencija uz dilataciju?” | Počinje zadatkom, a ne idejom | Ostatak: f = 1/T (već postoji lekcija ili je alat) plus kontekst srca | **Varijacija** prve lekcije (ako je f = 1/T preduvjet) ili **lekcija primjene** u brzoj pripremi. Nije nova lekcija koncepta. |
| „Koliko je brz brod ako sat kasni x?” | Obrat formule | Ostatak: rješavanje formule po v (preslagivanje i korijen, dakle alat) | **Varijacija** prve lekcije; alat se uči tamo gdje prvi put zatreba |

## Gdje se MatMat namjerno razlikuje i otvorena pitanja

- **Broj lekcija.** Math Academy namjerno ima *više* manjih koraka, ali većinu sitnoće drži unutar lekcije (3–4 knowledge pointa). Naših 5 varijacija s podzadacima igra ulogu knowledge pointa. Cilj „najmanje lekcija” zato nije u sukobu s njima, pod uvjetom da varijacije rastu po težini kao njihovi knowledge pointi. Prijedlog je da varijacija 1 bude najosnovniji slučaj, a zadnje uvode posebne slučajeve i obrat.
- **Nema podataka u trenutku izrade plana.** Svi izvori koji dijele i spajaju pouzdano (LFA, DataShop, Math Academyjevih 94 %) to rade iz podataka o učenicima. Plan se gradi prije podataka, pa P2–P6 zamjenjuju podatke procjenom modela. Otvoreno je pitanje treba li kasnije uvesti automatski prijedlog spajanja i dijeljenja iz SM-2 podataka (P7.6, P8). To ulazi u pitanje iz #2 o izmjeni plana nakon što je učenje krenulo.
- **Alati unutar lekcije.** Pravilo „alat se uči kad prvi put zatreba” može jednoj lekciji dodati alat uz koncept. Izvori ne kažu koliko je to previše. Prijedlog je da se alat računa u ograničenje knowledge pointa i varijacija (P4), a ne u broj koncepata.
- **Pouzdanost modela odluke za P2 i P6** nije provjerena. Radovi pokazuju da LLM-ovi dobro predviđaju preduvjete, ali loše granulaciju. Vrijedi prototipom izmjeriti slaganje jeftinih modela odluke s ručnim planom fizike, posebno na parovima koji su u ručnom planu spojeni ili razdvojeni.

## Izvori

- Skycak, J. (uz savjetovanje J. Robertsa), *The Math Academy Way* (radna verzija): https://www.justinmath.com/files/the-math-academy-way.pdf
- Skycak, J., „How Math Academy Creates its Knowledge Graph”: https://justinmath.com/how-math-academy-creates-its-knowledge-graph/
- Math Academy Podcast #4, dio 1: https://justinmath.com/math-academy-podcast-4-part-1/
- Math Academy Podcast #4, dio 2: https://justinmath.com/math-academy-podcast-4-part-2/
- Khan Academy, „Checklist: What makes a good exercise?” (wiki `Khan/khan-exercises`): https://github.com/Khan/khan-exercises/wiki/Checklist:-What-makes-a-good-exercise%3F
- Koedinger, K. R., Corbett, A. T., Perfetti, C. (2012), „The Knowledge-Learning-Instruction framework”, *Cognitive Science* 36(5), 757–798: https://doi.org/10.1111/j.1551-6709.2012.01245.x (preprint korišten za citate: https://home.cs.colorado.edu/~mozer/Teaching/syllabi/TopicsInCognitiveScienceFall2011/KLI-paper-v5.00.pdf)
- Liu, R., Koedinger, K. R. (2017), „Closing the loop: Automated data-driven cognitive model discoveries lead to improved instruction and learning gains”, *Journal of Educational Data Mining* 9(1): https://jedm.educationaldatamining.org/index.php/JEDM/article/download/212/pdf_29
- DataShop, Learning Curve help: https://pslcdatashop.web.cmu.edu/help?page=learningCurve
- Doignon, J.-P., Falmagne, J.-C. (2015), „Knowledge Spaces and Learning Spaces”, arXiv:1511.06757: https://arxiv.org/pdf/1511.06757
- Wang, C., Lin, J., Koedinger, K. R. (2025), „Leveraging Large Language Models for Identifying Knowledge Components”, arXiv:2511.09935: https://arxiv.org/abs/2511.09935
- Moore, S., Schmucker, R., Mitchell, T., Stamper, J. (2024), „Automated Generation and Tagging of Knowledge Components from Multiple-Choice Questions”, L@S 2024, arXiv:2405.20526: https://arxiv.org/abs/2405.20526
- Aytekin, M. C., Saygın, Y. (2024), „Discovering prerequisite relations using large language models”, *Interactive Learning Environments*, doi:10.1080/10494820.2024.2375338: https://research.sabanciuniv.edu/id/eprint/49789/
- Le, N. L., Abel, M.-H. (2025), „How Well Do LLMs Predict Prerequisite Skills? Zero-Shot Comparison to Expert-Defined Concepts”, arXiv:2507.18479: https://arxiv.org/abs/2507.18479
