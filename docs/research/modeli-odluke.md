# Modeli odluke za presude u pipelineu vlastitog predmeta

Istraživanje za ticket [#3 „Koji model odluke za koje presude“](https://github.com/matino06/matmat-frontend/issues/3) (mapa [#2](https://github.com/matino06/matmat-frontend/issues/2)). Stanje: 11. 10. 2026.

Pitanje: koji od modela odluke dostupnih preko OpenRoutera (`typesafe/jev-1.13`, `microsoft/microsoft-decision-1`, `nace-ai/drex-v1.5`, `cloudflare/clef-omni`) je dovoljno točan i jeftin za presude koje pipeline treba?

**Ograničenje:** nismo imali OpenRouter API ključ, pa nijedan model nije pokrenut na našim materijalima. Brojke o točnosti dolaze iz tuđih mjerenja (označeno je čijih), a sve što ovisi o hrvatskim materijalima mora se izmjeriti u prototipu [#8 „Kako se iz materijala izrađuje plan“](https://github.com/matino06/matmat-frontend/issues/8). Popis tih mjerenja je u odjeljku [Što se mora izmjeriti u #8](#što-se-mora-izmjeriti-u-8).

## Kratki odgovor

| Presuda                                                                          | Preporuka                                                                                                                                                                                                                          | Zašto                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Razvrstavanje stranica materijala (kurikulum / skripta / ispit / rješenja / šum) | **Model odluke, `typesafe/jev-1.13`**, jedno Choice pitanje po stranici. U #8 ga usporediti s `cloudflare/clef-omni`.                                                                                                              | Tipična zadaća za model odluke: zatvoren skup od 5 opcija i kratak ulaz. Cijena je oko 0,00004 USD po stranici. Clef-omni je jači na klasifikaciji s mnogo klasa i jedini od četiri prima sliku, ali je 3,6 puta skuplji. |
| Koje lekcije treba zadatak s ispita                                              | **LLM** (zadatak se mora riješiti da bi se znalo koji koncepti trebaju). Model odluke eventualno samo za mapiranje već napisanog koraka rješenja na lekciju.                                                                       | Modeli odluke ne pišu postupak. TypeSafe sam kaže da Jev „nije kalkulator“ i loše podnosi zadatke s više koraka. Choice je jedan izbor, a ne više njih.                                                                   |
| Uvodi li lekcija B koncept koji A već ne uči                                     | **Model odluke, `typesafe/jev-1.13`**, Noul s pragom. Nesigurne slučajeve slati LLM-u.                                                                                                                                             | Semantička presuda da/ne. Jev ima daleko najbolje rezultate od četiri modela na zadacima znanja i zaključivanja (MMLU-Pro, GPQA, BBH).                                                                                    |
| Jesu li dva konačna rezultata ista                                               | **Kod, ne model odluke.** LLM koji rješava vraća rezultat u strukturiranom obliku (broj + mjerna jedinica), a kod ga uspoređuje s tolerancijom. Jev Noul služi samo kao rezerva za tekstualne odgovore koje kod ne može parsirati. | TypeSafe izričito savjetuje da se aritmetika i usporedbe brojeva drže u kodu. Na GSM8K-u (biranje broja bez postupka) sva četiri modela griješe u 28–45 % slučajeva.                                                      |
| Je li generirani zadatak preblizu zadatku iz materijala                          | **Predfilter u kodu (embeddings ili leksička sličnost), zatim `typesafe/jev-1.13` Noul** na nekoliko najbližih kandidata. U #8 ga usporediti s `nace-ai/drex-v1.5`.                                                                | Presuda „je li ovo isti zadatak s promijenjenim brojevima“ je usporedba parova, za što su modeli odluke prikladni. Predfilter je potreban jer Jevu pada točnost kad stanje sadrži mnogo nevažnog teksta.                  |
| `microsoft/microsoft-decision-1`                                                 | **Zasad ne koristiti.**                                                                                                                                                                                                            | Objavljen je 9. 10. 2026. i ne postoji nijedno neovisno mjerenje. Težine se „kontinuirano ažuriraju“, pa se podešeni pragovi mogu pomaknuti bez najave.                                                                   |

**Cijena nije odlučujuća.** Sve provjere modelom odluke za jedan predmet koštaju oko 0,10 USD s Jevom, a oko 0,40 USD s Clef-omni (izračun u [odjeljku o cijeni](#cijena-po-pozivu-i-po-predmetu)). Generiranje plana, zadataka i objašnjenja LLM-om koštat će višestruko više. Model se zato bira prema točnosti na hrvatskom, a ne prema cijeni.

**Najveći otvoreni rizik je hrvatski jezik.** Nijedan od četiri proizvođača ne tvrdi da model podržava hrvatski. TypeSafe za Jev piše da je engleski primarni jezik i da drugi jezici rade „ali ne jednako dobro“ ([TypeSafe Models, Language support](https://docs.typesafe.ai/models)). Nijedno javno mjerenje nema hrvatski skup podataka.

## Što su modeli odluke i kako izgleda API

### Što model vraća

Model odluke ne generira tekst. Prima `state` (tekst ili JSON) i imenovana pitanja, a za svako pitanje vraća tipizirani odgovor s vjerojatnostima ([OpenRouter Jev hub](https://openrouter.ai/docs/guides/community/jev)). Postoje tri vrste pitanja:

| Vrsta    | Pitanje                        | Odgovor                                                                                         |
| -------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `choice` | Koja od ovih opcija?           | `choice` (odabrana opcija), `probabilities` po opciji, `confidence`                             |
| `noul`   | Vrijedi li uvjet?              | `noul`: vjerojatnost odgovora „da“, broj od 0 do 1                                              |
| `score`  | Gdje je na uređenoj ljestvici? | `score` (vjerojatnošću ponderirana pozicija), `probabilities` po razini, `confidence`, `legend` |

Izvor za polja odgovora je [OpenRouter Decisions API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request), sheme `DecisionsChoiceAnswer`, `DecisionsNoulAnswer` i `DecisionsScoreAnswer`. Jev ne vraća obrazloženje ([Jev hub, FAQ](https://openrouter.ai/docs/guides/community/jev)). Za MatMat to znači da kreatoru ne možemo pokazati _zašto_ je nešto odbačeno, osim ako to dodatno ne napiše LLM.

### Endpoint i oblik zahtjeva

OpenRouter nudi dva endpointa s istim tijelom zahtjeva ([Jev hub, „Two ways to call Jev“](https://openrouter.ai/docs/guides/community/jev)):

- `POST https://openrouter.ai/api/alpha/decisions` (Decisions API, za obični HTTP iz bilo kojeg jezika);
- `POST https://openrouter.ai/api/v1/systemone` (kompatibilan s TypeSafe SDK-om, [Jev SDK guide](https://openrouter.ai/docs/guides/community/typesafe-sdk)).

Backend je u Javi i za njega nema SDK-a, pa je praktičan put obični HTTP poziv na Decisions API s istim `Authorization: Bearer` ključem kao za chat modele. Obavezna polja su `model`, `state` i `questions`. Opcionalni `provider`, `session_id`, `trace` i `user` isti su kao kod ostalih OpenRouter API-ja ([API reference, `DecisionsRequest`](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request)). Primjer zahtjeva (prilagođen iz [Jev tutoriala](https://openrouter.ai/docs/guides/community/jev-tutorial)):

```json
{
  "model": "typesafe/jev-1.13",
  "state": { "stranica": "<tekst jedne stranice materijala>" },
  "questions": {
    "vrsta": {
      "type": "choice",
      "instructions": "Kojoj vrsti materijala pripada ova stranica?",
      "criteria": {
        "kurikulum": "Popis ishoda, tema ili sadržaja koje treba naučiti, bez objašnjenja.",
        "skripta": "Objašnjenje gradiva, definicije, izvodi, riješeni primjeri.",
        "ispit": "Zadaci za rješavanje bez rješenja.",
        "rjesenja": "Rješenja ili ključ odgovora za zadatke.",
        "sum": "Naslovnica, sadržaj, prazna stranica, upute ili sl."
      }
    }
  }
}
```

Odgovor (oblik prema [Jev tutorialu](https://openrouter.ai/docs/guides/community/jev-tutorial), vrijednosti izmišljene):

```json
{
  "id": "gen-dec-…",
  "model": "typesafe/jev-1.13-20260917",
  "provider": "TypeSafe",
  "answers": {
    "vrsta": {
      "type": "choice",
      "choice": "ispit",
      "confidence": 0.8,
      "probabilities": {
        "kurikulum": 0.02,
        "skripta": 0.05,
        "ispit": 0.9,
        "rjesenja": 0.03,
        "sum": 0
      }
    }
  },
  "usage": { "input_tokens": 900, "output_tokens": 30, "cost": 0.0000378 }
}
```

Više pitanja o istom stanju ide u jedan zahtjev. Odgovaraju se paralelno i ne vide međusobne odgovore ([Jev tutorial, FAQ](https://openrouter.ai/docs/guides/community/jev-tutorial)).

### Ograničenja koja utječu na dizajn

- **Choice ima najviše 255 opcija, a Score najviše 10 razina** ([TypeSafe API](https://docs.typesafe.ai/api)). To je dokumentirano za Jev. Za ostala tri modela ograničenja nisu objavljena.
- **Kontekst Jeva:** 64k tokena po zahtjevu, od čega najviše 32k za `state` plus najdulje pitanje ([TypeSafe Models](https://docs.typesafe.ai/models); OpenRouter endpoint prikazuje `max_prompt_tokens: 32000`, [endpoints API](https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints)).
- **Decisions API je alfa.** OpenRouter ga vodi pod „Alpha feature endpoints“ ([API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request)), što znači da se oblik može promijeniti.
- **Svaki model ima samo jednog pružatelja na OpenRouteru:** Jev → TypeSafe, Microsoft-Decision-1 → Azure, Drex → DeepInfra, Clef-omni → Cloudflare ([endpoints API za sva četiri modela](https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints)). Ako pružatelj padne, nema automatskog prebacivanja na drugog, pa pipeline mora imati vlastiti fallback (drugi model odluke ili LLM).
- **Greške:** 400, 401, 402, 403, 404, 413, 429, 500, 502, 503, 524, 529 ([API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request)). TypeSafe savjetuje ponovni pokušaj s eksponencijalnim čekanjem za 429 i 529 ([TypeSafe API](https://docs.typesafe.ai/api)). Izravni TypeSafe ima 80 zahtjeva/s i 100k tokena/s, uz napomenu da se limiti „dinamički mijenjaju“ ([TypeSafe Models](https://docs.typesafe.ai/models)). Limiti preko OpenRoutera nisu objavljeni.
- **Fiksiranje verzije:** alias (`~typesafe/jev-latest`) se pomiče s novim izdanjem. Ako su pragovi podešeni na određenoj verziji, treba fiksirati `typesafe/jev-1.13` ([TypeSafe Models, Aliases](https://docs.typesafe.ai/models); [Jev tutorial, FAQ](https://openrouter.ai/docs/guides/community/jev-tutorial)). Čak i fiksirana verzija nije potpuno stabilna: Decision Index bilježi da su se Jevovi odgovori na njihovom uzorku promijenili u 20 izbora između dva mjerenja („API output drifted since the board run; scores are unchanged“, [Decision Index, `data/index.json`, `jev.latency.note`](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)).

## Usporedba četiri modela

|                                | `typesafe/jev-1.13`                                 | `microsoft/microsoft-decision-1` | `nace-ai/drex-v1.5`       | `cloudflare/clef-omni` |
| ------------------------------ | --------------------------------------------------- | -------------------------------- | ------------------------- | ---------------------- |
| Cijena ulaza (USD / 1M tokena) | 0,042                                               | 0,042                            | 0,04                      | 0,15                   |
| Cijena izlaza                  | 0                                                   | 0                                | 0                         | 0                      |
| Kontekst na OpenRouteru        | 64k (32k za stanje)                                 | 32.768                           | 131.072                   | 65.536                 |
| Ulaz                           | tekst                                               | tekst                            | tekst                     | tekst + slika          |
| Pružatelj                      | TypeSafe                                            | Azure                            | DeepInfra                 | Cloudflare             |
| Bazni model                    | nije objavljen                                      | Qwen3.5-9B                       | MiMo-V2.6-Distill-Qwen-9B | Qwen3-Omni-30B-A3B     |
| Otvorene težine                | ne                                                  | ne                               | da (Open RAIL-M)          | da (Apache-2.0)        |
| Objavljen                      | 18. 9. 2026.                                        | 9. 10. 2026.                     | 9. 10. 2026.              | 9. 10. 2026.           |
| Hrvatski                       | „engleski primarni, ostali jezici ne jednako dobro“ | nije navedeno                    | nije navedeno             | nije navedeno          |

Izvori: cijene, kontekst, ulaz i pružatelj iz [OpenRouter Models API (`output_modalities=decisions`)](https://openrouter.ai/api/v1/models?output_modalities=decisions) i stranica modela ([Jev](https://openrouter.ai/typesafe/jev-1.13), [Microsoft-Decision-1](https://openrouter.ai/microsoft/microsoft-decision-1), [Drex](https://openrouter.ai/nace-ai/drex-v1.5), [Clef-omni](https://openrouter.ai/cloudflare/clef-omni)). Bazni model za Microsoft-Decision-1 je sa [stranice modela](https://openrouter.ai/microsoft/microsoft-decision-1), za Drex iz [nace-ai/drex-decision-models](https://github.com/nace-ai/drex-decision-models), a za Clef-omni iz [model carda](https://huggingface.co/Cloudflare/clef-omni). Jezik Jeva je iz [TypeSafe Models](https://docs.typesafe.ai/models).

Napomena o hrvatskom: tri od četiri modela su fino podešena na Qwenu. Qwen3 navodi podršku za 119 jezika, među njima i hrvatski ([Qwen3 blog](https://qwenlm.github.io/blog/qwen3/)). To ne dokazuje da je fino podešeni model odluke zadržao kvalitetu na hrvatskom, a za Qwen3.5 i Qwen3-Omni to nisam zasebno provjerio.

## Točnost: tvrdnje proizvođača i neovisna mjerenja

### Tvrdnje proizvođača (nisu neovisno provjerene)

- **Microsoft-Decision-1:** „najviša točnost“ u usporedbi na 36 benchmarka (oko 150.000 pitanja), oko 2,5 puta brži od drugoplasiranog modela, a odluke se mijenjaju u 1,3 % slučajeva pri osam vrsta perturbacija. Rezultati po benchmarku nisu objavljeni. Microsoft piše i: „Weights are updated continually while the API shape stays the same“ ([Microsoft announcement](https://commandline.microsoft.com/microsoft-decision-1-model-foundry/), [OpenRouter stranica modela](https://openrouter.ai/microsoft/microsoft-decision-1)).
- **Drex v1.5:** 58,08 na javnom dijelu Decision Indexa 0.3.1 i „#1 model ispod 10B parametara“ ([nace-ai/drex-decision-models](https://github.com/nace-ai/drex-decision-models)). Broj se poklapa s podacima samog indeksa (vidi dolje).
- **Clef / Clef-omni:** Cloudflare objavljuje tablicu po benchmarcima iz „internog pokretanja Decision Indexa 0.2.1“ ([Clef-omni model card](https://huggingface.co/Cloudflare/clef-omni); [Cloudflare blog](https://blog.cloudflare.com/clef-faster-cheaper-multimodal/)). Mjerenje je Cloudflareovo, a ne neovisno.
- **Jev:** TypeSafe ne objavljuje vlastiti benchmark, ali javno navodi poznate slabosti ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)): doslovno čitanje, **matematika i brojevi** („Jev is not a calculator … implementing any mathematical logic in code“), usporedba datuma, zadaci s više koraka, **pad točnosti s mnogo nevažnog teksta u stanju** i sklonost prvoj opciji u Choice pitanju.

### Neovisno (treća strana): Jev Decision Index 0.3.1

[Jev Decision Index](https://huggingface.co/spaces/multimodalart/jev-decision-index) je zajednički leaderboard korisnika Hugging Facea `multimodalart`. Nije ga izradio nijedan od četiri proizvođača. Pravila su objavljena: bez podešavanja promptova, bez skraćivanja ulaza i bez ponovnog pokušaja nakon pogrešnog odgovora ([`data/methodology.json`, `rules`](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)). Mjerenja nisam ponovio, nego sam pročitao objavljene podatke ([`data/index.json`](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json) i [`data/v03.json`](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/v03.json), generirani 10. 10. 2026.). **Microsoft-Decision-1 nije na indeksu.**

Ukupni rezultat (Decision Index 0.3.1, ponderirano: javni 20 %, iste vještine 50 %, nove domene 30 %):

| Model     | Ukupno | Rang (od 117) | Javni dio |
| --------- | ------ | ------------- | --------- |
| Jev       | 60,11  | 3.            | 57,96     |
| Drex v1.5 | 50,84  | 25.           | 58,08     |
| Clef-omni | 49,32  | 27.           | 56,54     |

Pojedini benchmarci relevantni za naše presude (iz `data/index.json`):

| Benchmark (što mjeri)                                    | Jev       | Drex v1.5 | Clef-omni | Relevantno za                       |
| -------------------------------------------------------- | --------- | --------- | --------- | ----------------------------------- |
| BANKING77 (klasifikacija u 77 namjera, macro-F1)         | 0,797     | 0,854     | **0,942** | razvrstavanje, mapiranje na lekciju |
| MMLU-Pro (stručno znanje, točnost)                       | **0,827** | 0,587     | 0,693     | novi koncept                        |
| GPQA Diamond (teška znanost, točnost)                    | **0,783** | 0,444     | 0,469     | novi koncept                        |
| BBH (zaključivanje, točnost)                             | **0,929** | 0,856     | 0,690     | novi koncept                        |
| ANLI (slijedi li tvrdnja iz premise, macro-F1)           | **0,748** | 0,703     | 0,636     | novi koncept, preblizu              |
| ContractNLI (podržava li dokument tvrdnju, macro-F1)     | 0,717     | **0,832** | 0,824     | preblizu                            |
| HoVer (provjera tvrdnje prema izvoru, točnost)           | 0,729     | **0,861** | 0,625     | preblizu                            |
| GSM8K (odabir broja od 4 ili 10 ponuđenih, bez postupka) | **0,718** | 0,546     | 0,678     | isti rezultat                       |

Kalibracija (isti izvor, `calibration`): prosječna pouzdanost u odnosu na stvarnu točnost iznosi 0,81 prema 0,74 za Jev (ECE 0,074), 0,82 prema 0,74 za Drex (ECE 0,090) i 0,78 prema 0,77 za Clef-omni (ECE 0,040). Jev i Drex su dakle nešto preoptimistični, a Clef-omni je najbolje kalibriran. Uzorci nisu isti (Jev n = 72.594, ostali oko 34.000), pa usporedba nije potpuna.

**Što iz ovoga slijedi:**

- Jev je najjači na znanju i zaključivanju, što je najbliže presudi o novom konceptu.
- Clef-omni je najjači na klasifikaciji s mnogo klasa.
- Drex je najjači na provjeri tvrdnje prema izvoru.
- Nijedan model nije pouzdan za aritmetiku bez postupka.
- **U indeksu nema hrvatskog skupa podataka.** Pretraga njegovih podataka ne nalazi hrvatski, a jedini višejezični element su lokaliteti u Amazon ESCI. Zato nijedna od ovih brojki ne govori kako će modeli raditi na hrvatskim skriptama.

## Cijena po pozivu i po predmetu

Naplaćuju se samo ulazni tokeni (stanje i pitanja). Izlazni tokeni su besplatni ([Jev hub, FAQ](https://openrouter.ai/docs/guides/community/jev)), a svaki odgovor sadrži `usage.cost` u USD. Primjer iz Jev tutoriala: 476 ulaznih tokena = 0,000019992 USD, što je točno 476 × 0,042 / 10⁶ ([Jev tutorial](https://openrouter.ai/docs/guides/community/jev-tutorial)). Primjer u [Jev SDK guideu](https://openrouter.ai/docs/guides/community/typesafe-sdk) (275 tokena = 0,00003 USD) ne odgovara cjeniku i vjerojatno je ilustrativan. U #8 treba bilježiti stvarni `usage.cost`.

Cijena po pozivu:

| Ulaz po pozivu | Jev / Microsoft-Decision-1 | Drex v1.5   | Clef-omni   |
| -------------- | -------------------------- | ----------- | ----------- |
| 1.000 tokena   | 0,000042 USD               | 0,00004 USD | 0,00015 USD |
| 4.000 tokena   | 0,000168 USD               | 0,00016 USD | 0,0006 USD  |

Gruba procjena po predmetu. Pretpostavke su moje, ne izmjerene: 300 stranica materijala, 200 zadataka s ispita, oko 100 lekcija s po 3 preduvjeta i 500 generiranih zadataka.

| Presuda                                             | Pretpostavka            | Tokena        | Jev              | Clef-omni        |
| --------------------------------------------------- | ----------------------- | ------------- | ---------------- | ---------------- |
| Razvrstavanje stranica                              | 300 × 1.000             | 0,3 M         | 0,013 USD        | 0,045 USD        |
| Mapiranje koraka ispita na lekciju (ako se koristi) | 200 × 2.500             | 0,5 M         | 0,021 USD        | 0,075 USD        |
| Novi koncept                                        | 300 parova × 1.500      | 0,45 M        | 0,019 USD        | 0,068 USD        |
| Isti rezultat (samo rezerva)                        | 500 × 300               | 0,15 M        | 0,006 USD        | 0,023 USD        |
| Preblizu                                            | 500 × 3 kandidata × 800 | 1,2 M         | 0,050 USD        | 0,18 USD         |
| **Ukupno**                                          |                         | **oko 2,6 M** | **oko 0,11 USD** | **oko 0,39 USD** |

Hrvatski tekst vjerojatno daje više tokena po stranici nego engleski, ali čak i ako je broj tokena dvostruk, iznosi ostaju ispod 1 USD po predmetu. Ponovna provjera nakon svake izmjene plana koju napravi kreator ponavlja samo presudu o novom konceptu za dotaknute lekcije, što je reda veličine 0,001 USD po izmjeni.

## Presude jedna po jedna

### 1. Razvrstavanje stranica materijala

- **Preporuka:** `typesafe/jev-1.13`, jedno `choice` pitanje po stranici s pet opcija i opisom svake (kao u primjeru gore). Pet opcija je daleko ispod ograničenja od 255 opcija po Choice pitanju ([TypeSafe API](https://docs.typesafe.ai/api)). Stranice s `confidence` ispod praga treba poslati LLM-u ili pokazati kreatoru.
- **Izazivač u #8:** `cloudflare/clef-omni`. Na klasifikaciji s mnogo klasa ima najbolji rezultat (BANKING77 0,94 prema 0,80 za Jev, Decision Index) i najbolju kalibraciju. Jedini je od četiri koji prima sliku ([OpenRouter Models API](https://openrouter.ai/api/v1/models?output_modalities=decisions)), pa bi skenirana stranica mogla biti razvrstana bez OCR-a. OCR je ionako potreban za sadržaj koji LLM čita, pa ta prednost vrijedi samo ako se razvrstavanje pokaže kao korak prije OCR-a. Slanje slike kroz OpenRouterov Decisions API nije opisano u OpenRouterovoj dokumentaciji (Cloudflare blog pokazuje base64 data URI na vlastitom API-ju, [Cloudflare blog](https://blog.cloudflare.com/clef-faster-cheaper-multimodal/)), pa to treba provjeriti.
- **Poznati rizici:** sklonost prvoj opciji ([Jev jaggedness, Choice option order](https://docs.typesafe.ai/model-jaggedness/jev-1.13)). Za provjeru treba pitati dvaput s različitim redoslijedom opcija ili na manjem uzorku usporediti oba redoslijeda. Stranica s mješovitim sadržajem (npr. riješeni primjer u skripti) može izgledati kao ispit, pa granične slučajeve treba opisati u `criteria`.

### 2. Koje lekcije treba zadatak s ispita

- **Preporuka:** ovo **nije** presuda za model odluke. Da bi se znalo koje lekcije zadatak treba, zadatak se mora riješiti i iz postupka izvući koncepti. Modeli odluke ne pišu postupak ([Jev hub](https://openrouter.ai/docs/guides/community/jev)), a TypeSafe navodi da Jev „struggles with tasks that require additional levels of indirection“ i da aritmetiku treba držati u kodu ([Jev jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)). Choice vraća jednu opciju, a zadatak obično treba više lekcija. Za više oznaka treba po jedan Noul za svaku lekciju (prema obrascu „iterate in code … ask one question for each“ iz istog dokumenta).
- **Moguća podjela:** LLM riješi zadatak i navede korake. Svaki korak se zatim modelom odluke mapira na lekciju plana (Choice s najviše 255 lekcija, plus opcija „nijedna“ koja otkriva rupu u pokrivenosti). Ovo je klasifikacija s mnogo klasa, gdje je Clef-omni najjači (BANKING77 0,94), pa bi tu vrijedilo usporediti Clef-omni i Jev.
- **Napomena o kontekstu:** popis od 100 lekcija s kratkim opisima stane u 32k za Jev, ali Jevu pada točnost s mnogo nevažnog teksta u stanju ([Jev jaggedness, Large state](https://docs.typesafe.ai/model-jaggedness/jev-1.13)). Zato treba slati samo nazive i kratke opise lekcija, a ne njihov sadržaj.

### 3. Uvodi li lekcija B koncept koji A već ne uči

- **Preporuka:** `typesafe/jev-1.13`, Noul po paru (B, preduvjet A), s pragom podešenim na označenom uzorku. Područje oko 0,5 šalje se LLM-u. Ovo je semantička presuda s domenskim znanjem (fizika, matematika), a Jev je od ponuđenih modela najjači na MMLU-Pro (0,83), GPQA Diamond (0,78) i BBH (0,93), dok su Drex i Clef-omni na 0,44–0,69 (Decision Index). Za ovu presudu to je najrelevantnija razlika.
- **Kako pitati:** doslovno i bez dvostrukih negacija ([Jev jaggedness, Literal reading, Indirection](https://docs.typesafe.ai/model-jaggedness/jev-1.13)). Umjesto „uvodi li B koncept koji A već ne uči“ bolje je: „Treba li učenik koji zna sve iz lekcije A naučiti novu ideju da bi riješio zadatke lekcije B?“, uz definiciju koncepta iz [GLOSSARY.md](../../GLOSSARY.md) u `criteria`. Iz iste presude izlaze i dva signala za plan: B bez novog koncepta (kandidat za spajanje) i B s konceptom koji nije ni u jednom preduvjetu (kršenje nulte pretpostavke).
- **Rizik:** to je presuda o kojoj ovisi najmanji broj lekcija, što je glavni cilj mape #2. Pogreška u jednom smjeru stvara previše lekcija, a u drugom krši nultu pretpostavku. Točnost se mora izmjeriti na ručnom planu fizike s 97 lekcija prije nego što se ovoj presudi vjeruje bez LLM-a.

### 4. Jesu li dva konačna rezultata ista

- **Preporuka:** **kod**. Oba neovisna rješenja (LLM) neka vrate konačni rezultat u strukturiranom obliku (npr. `{"vrijednost": 4.9, "jedinica": "m/s"}` ili popis za podzadatke a, b, c), a kod ih uspoređuje uz relativnu toleranciju i pretvorbu jedinica. TypeSafe to izričito savjetuje: „Keep the arithmetic in code“, a Jev „cannot reliably judge whether two values are near each other“ za numeričke prikaze ([Jev jaggedness, Math and Numbers](https://docs.typesafe.ai/model-jaggedness/jev-1.13)). Na GSM8K-u, gdje se bira točan broj bez postupka, modeli griješe u 28 % (Jev), 32 % (Clef-omni) i 45 % (Drex) slučajeva (Decision Index).
- **Uloga modela odluke:** samo kao rezerva za rezultate koji nisu brojevi (npr. „tijelo se giba jednoliko“ prema „brzina je stalna“). Tu je `typesafe/jev-1.13` Noul („Izriču li ova dva odgovora istu tvrdnju?“) razumna jeftina presuda. Ako ostane nesigurno, zadatak se odbacuje, što je u skladu s pravilom iz mape #2.
- **Simbolički rezultati** (izrazi, intervali): usporedba u kodu, numerička provjera u nekoliko točaka ili CAS biblioteka u Javi. Model odluke za njih ne preporučujem.

### 5. Je li generirani zadatak preblizu zadatku iz materijala

- **Preporuka:** dva koraka.
  1. **Predfilter u kodu:** za svaki generirani zadatak naći nekoliko najsličnijih zadataka iz materijala (embeddings ili leksička sličnost). TypeSafe preporučuje „retrieve and filter in code first“ jer veliko stanje smanjuje točnost ([Jev jaggedness, Large state](https://docs.typesafe.ai/model-jaggedness/jev-1.13)).
  2. **`typesafe/jev-1.13` Noul po paru:** „Je li zadatak B isti kao zadatak A s promijenjenim brojevima, imenima ili redoslijedom, tako da bi učenik koji je naučio A napamet riješio B bez razumijevanja?“, s pragom podešenim na uzorku.
- **Izazivač u #8:** `nace-ai/drex-v1.5`. Najjeftiniji je i najjači na presudama „podržava li izvor tvrdnju“ (ContractNLI 0,83, HoVer 0,86 prema 0,72 i 0,73 za Jev, Decision Index), što je srodno usporedbi dvaju tekstova. Ima i 131k konteksta, ali to nije razlog da se u stanje šalje cijeli materijal.
- **Napomena:** prag ovdje ima posljedicu za proizvod. Previše strog prag odbacuje dobre zadatke i povećava cijenu generiranja, a previše blag dopušta pretreniranje na starim ispitima. To treba odlučiti uz kreatora, a ne samo tehnički.

### Microsoft-Decision-1

Cijenom (0,042 USD/1M) je jednak Jevu, a kontekst mu je kraći (32k). Sve tvrdnje o točnosti su Microsoftove i bez rezultata po benchmarku ([announcement](https://commandline.microsoft.com/microsoft-decision-1-model-foundry/)), a model nije na Decision Indexu. Microsoft navodi da se težine kontinuirano ažuriraju uz isti API ([OpenRouter stranica modela](https://openrouter.ai/microsoft/microsoft-decision-1)), što znači da se pragovi podešeni u #8 mogu pomaknuti bez promjene ID-a modela. Preporuka: ne koristiti dok ne bude neovisnih mjerenja. Može se uključiti u usporedbu u #8 kao četvrti kandidat jer ne košta gotovo ništa.

## Što se mora izmjeriti u #8

Ništa od navedenog ne može se odgovoriti bez API ključa i hrvatskih materijala:

1. **Hrvatski.** Za svaku presudu treba usporediti točnost modela odluke na hrvatskom s odlukom LLM-a ili ručnom oznakom. Ovo je preduvjet za sve ostalo, jer nijedan proizvođač ne tvrdi da model podržava hrvatski.
2. **Razvrstavanje stranica:** ručno označiti stranice referentnog predmeta fizike (katalog, skripta, 6 rokova s rješenjima). Mjeriti točnost Jeva i Clef-omni (i Microsoft-Decision-1 kao kontrolu) te osjetljivost na redoslijed opcija. Provjeriti prima li Clef-omni sliku kroz OpenRouterov Decisions API.
3. **Novi koncept:** iz ručnog plana fizike od 97 lekcija napraviti pozitivne parove (B uvodi novi koncept u odnosu na preduvjet A) i negativne parove (B je spojiv s A, ili je samo novi tip zadatka). Mjeriti Jev prema LLM-u i odrediti prag iznad kojega se Jevu vjeruje bez LLM-a.
4. **Preblizu:** iz rokova napraviti parove „isti zadatak s drugim brojevima“ i „isti koncept, drugi zadatak“. Mjeriti Jev i Drex te odrediti prag.
5. **Isti rezultat:** provjeriti koliko rezultata LLM uspijeva vratiti u strukturiranom obliku, tj. koliko često kod ne može usporediti pa treba rezervni model.
6. **Pouzdanost i cijena:** bilježiti `usage.cost`, latenciju, 429/529 greške i polje `model` u odgovoru (koja točna verzija je odgovorila) te provjeriti postoji li limit broja pitanja po zahtjevu (OpenRouter ga ne objavljuje).

## Izvori

- OpenRouter Models API, decision modeli: <https://openrouter.ai/api/v1/models?output_modalities=decisions>
- OpenRouter endpoints po modelu: <https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints>, <https://openrouter.ai/api/v1/models/microsoft/microsoft-decision-1/endpoints>, <https://openrouter.ai/api/v1/models/nace-ai/drex-v1.5/endpoints>, <https://openrouter.ai/api/v1/models/cloudflare/clef-omni/endpoints>
- OpenRouter stranice modela: <https://openrouter.ai/typesafe/jev-1.13>, <https://openrouter.ai/microsoft/microsoft-decision-1>, <https://openrouter.ai/nace-ai/drex-v1.5>, <https://openrouter.ai/cloudflare/clef-omni>
- OpenRouter Jev hub: <https://openrouter.ai/docs/guides/community/jev>
- OpenRouter Jev tutorial: <https://openrouter.ai/docs/guides/community/jev-tutorial>
- OpenRouter Jev SDK guide (System One API): <https://openrouter.ai/docs/guides/community/typesafe-sdk>
- OpenRouter Decisions API reference: <https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request>
- TypeSafe Models (cijena, limiti, kontekst, jezik): <https://docs.typesafe.ai/models>
- TypeSafe Jev 1.13 jaggedness: <https://docs.typesafe.ai/model-jaggedness/jev-1.13>
- TypeSafe API: <https://docs.typesafe.ai/api>
- TypeSafe System One: <https://docs.typesafe.ai/concepts/system-one>
- Microsoft-Decision-1 announcement: <https://commandline.microsoft.com/microsoft-decision-1-model-foundry/>
- Drex: <https://github.com/nace-ai/drex-decision-models>
- Clef-omni model card: <https://huggingface.co/Cloudflare/clef-omni>
- Cloudflare blog, Clef-omni: <https://blog.cloudflare.com/clef-faster-cheaper-multimodal/>
- Jev Decision Index (podaci): <https://huggingface.co/spaces/multimodalart/jev-decision-index>, [`data/index.json`](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json), [`data/v03.json`](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/v03.json), [`data/methodology.json`](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- Qwen3 (jezici): <https://qwenlm.github.io/blog/qwen3/>
