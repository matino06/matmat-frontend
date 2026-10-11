# Kako iz PDF-a i fotografija izvući tekst i formule

Istraživanje za ticket [#5](https://github.com/matino06/matmat-frontend/issues/5) (mapa [#2](https://github.com/matino06/matmat-frontend/issues/2), vlastiti predmet). Stanje izvora: 11. 10. 2026.

## Kratki odgovor

- **Preporuka:** svaku stranicu materijala renderirati u sliku (u Javi, Apache PDFBox) i poslati je **jeftinom vision modelu preko OpenRoutera** s uputom da vrati Markdown s LaTeX formulama i popis slika (okvir + kratak opis). Kandidati za prototip: `google/gemini-2.5-flash-lite`, `google/gemini-3.1-flash-lite`, `anthropic/claude-haiku-5.5`, `openai/gpt-6-luna`. Za stranice koje model loše pročita koristi se jači model (npr. `google/gemini-3.8-flash`).
- **Mathpix** je glavni kandidat za usporedbu i rezervna opcija: specijaliziran je za matematiku, službeno podržava hrvatski i ima REST API ($0,005 po stranici).
- **Cijena:** oko $0,0006 do $0,0035 po stranici s vision modelom, odnosno **oko $0,20 do $1,05 za predmet od 300 stranica** (procjena, vidi izračun). Mathpix: $1,50 za 300 stranica.
- **Python nije potreban** ni za preporučenu opciju ni za rezervne opcije (Mathpix, Mistral OCR, Datalab API), jer su sve HTTP API-ji koje Spring Boot može izravno pozvati. Python traže samo alati koje sami pokrećemo (Marker, Docling, MinerU, Nougat, olmOCR pipeline, PaddleOCR-VL, Chandra). Za ticket [#10](https://github.com/matino06/matmat-frontend/issues/10) to znači da OCR nije razlog za Python worker.
- Brojke o kvaliteti na našim materijalima ne postoje. Sve treba izmjeriti u prototipu [#8](https://github.com/matino06/matmat-frontend/issues/8) (popis na kraju).

## Kontekst koji utječe na izbor

- Iz materijala se **nikad ne preuzimaju zadaci**. Materijal služi za opseg i dubinu gradiva i za plan (vidi [GLOSSARY.md](../../GLOSSARY.md), „Materijal“). Pogreška u pojedinoj formuli zato ne ulazi izravno u zadatke. Važnije je da su teme, pojmovi i vrste formula prepoznati nego da je svaki znak savršen. Zato je razumno krenuti od najjeftinije opcije koja je „dovoljno dobra“ i mjeriti.
- Skice se ne spremaju kao rasterske slike (mapa #2). Slike u materijalu trebaju nam samo da ih plan može spomenuti, pa je dovoljan **okvir slike i tekstualni opis**, a ne izrezana slika u bazi.
- Backend je Spring Boot i sve modele zove preko OpenRoutera (mapa #2).

## Usporedba opcija

| Opcija                                                     | Formule u LaTeX                                        | Hrvatski (č ć đ š ž)                                                                 | Slike (okviri)                          | Cijena po stranici                                              | Treba Python?                                      |
| ---------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Vision LLM preko OpenRoutera (stranica kao slika)          | da, ovisno o uputi                                     | Gemini 2.5 Flash 88,2 % na hrvatskom u Datalabovu testu [^chandra-ml]                | da, Gemini vraća `box_2d` [^gem-img]    | ~$0,0006 do $0,006 (procjena)                                   | ne                                                 |
| Mathpix Convert API (`v3/pdf`)                             | da, MMD s `\(..\)` / `\[..\]` [^mpx-pdf]               | službeno podržan [^mpx-lang]                                                         | okviri redaka u `lines.json` [^mpx-pdf] | $0,005; batch $0,0015 [^mpx-price]                              | ne                                                 |
| Mistral OCR (OpenRouter `file-parser` ili Mistral API)     | nije izričito navedeno u dokumentaciji [^mis-ocr]      | nije provjereno                                                                      | okviri slika [^mis-ocr]                 | $0,002 preko OpenRoutera [^or-pdf]; $0,004 izravno [^mis-price] | ne                                                 |
| Datalab API (Marker / Chandra, hostano)                    | da [^marker]                                           | Datalab API 93,4 % na hrvatskom [^chandra-ml]                                        | da [^marker]                            | $0,004 (balanced), $0,01 (accurate) [^dl-price]                 | ne                                                 |
| olmOCR 2 model preko API-ja treće strane (DeepInfra i dr.) | „equations“ podržane, format nije naveden [^olmocr]    | nije navedeno [^olmocr]                                                              | ne kao zasebne slike [^olmocr]          | ~$0,0004 (procjena iz cijene tokena [^olmocr])                  | ne za sam poziv modela; da za olmOCR pipeline      |
| Marker (self-host)                                         | da, `$$` [^marker]                                     | „all languages“ [^marker]                                                            | da [^marker]                            | samo infrastruktura (GPU)                                       | **da**                                             |
| Docling (self-host ili `docling-serve`)                    | da, uz `do_formula_enrichment` (CodeFormula) [^dl-enr] | nije navedeno [^docling]                                                             | klasifikacija slika [^dl-enr]           | samo infrastruktura                                             | **da** (ili Docker + Java klijent [^docling-java]) |
| MinerU, PaddleOCR-VL, Chandra (self-host)                  | da / navode formule [^mineru] [^paddle] [^chandra]     | Chandra 2: 90,1 % na hrvatskom [^chandra-ml]; PaddleOCR-VL 1.5: 111 jezika [^paddle] | da [^mineru] [^chandra]                 | samo infrastruktura                                             | **da**                                             |
| Nougat                                                     | da                                                     | „works best with English“ [^nougat]                                                  | ne                                      | samo infrastruktura                                             | **da**; težine CC-BY-NC [^nougat]                  |

### 1. Vision LLM preko OpenRoutera (preporuka)

- **Kako:** Java (PDFBox) renderira stranicu u PNG/JPEG. PDFBox je Java biblioteka koja i izvlači Unicode tekst i sprema stranice kao slike [^pdfbox]. Slika se šalje na `/api/v1/chat/completions` kao `image_url` s base64 data URL-om [^or-mm]. Fotografije se šalju izravno, bez renderiranja.
- **Zašto slika, a ne tekstni sloj PDF-a:** PDF gubi semantičku informaciju, posebno kod matematičkih izraza; zbog toga je nastao Nougat [^nougat-paper]. Tekstni sloj se ipak isplati poslati uz sliku kao pomoć za točne hrvatske znakove, kao „anchoring“ koji koristi olmOCR (u olmOCR-bench tablici GPT-4o i Gemini Flash 2 su testirani u „Anchored“ načinu) [^chandra-bench]. To treba provjeriti u #8.
- **Alternativa bez renderiranja:** OpenRouter prima i cijeli PDF kao `file` dio poruke. Za modele s nativnom podrškom koristi `native` engine i naplaćuje ulazne tokene, inače `mistral-ocr` ($2 / 1000 stranica) ili besplatni `cloudflare-ai` [^or-pdf]. Za kontrolu (jedna stranica po pozivu, ponovni pokušaj samo loše stranice, ograničenje izlaznih tokena) bolje je slati stranicu po stranicu.
- **Slike u materijalu:** Gemini vraća okvire kao `box_2d` = `[ymin, xmin, ymax, xmax]` normalizirano na 0 do 1000 [^gem-img]. Isti poziv može vratiti i kratak opis slike, pa plan može reći „Slika 3 na str. 12: graf kosog hica“ bez spremanja rastera.
- **Rezolucija:** Google za dokumente preporučuje `media_resolution` `medium` (560 tokena po slici). Kvaliteta na dokumentima „typically saturates at medium“, a `high` (1120 tokena) „rarely improves OCR results for standard documents“ [^gem-res]. Za gustu matematiku treba isprobati i `high`.
- **Kvaliteta na hrvatskom:** u Datalabovu višejezičnom testu (tablice, matematika, raspored, tekst) za hrvatski: Datalab API 93,4 %, Chandra 2 90,1 %, Gemini 2.5 Flash 88,2 %, GPT-5 Mini 81,3 % [^chandra-ml]. To je test proizvođača konkurentskog alata, pa ga treba uzeti s rezervom.
- **Kvaliteta na formulama:** na olmOCR-bench (engleski) stariji opći modeli zaostaju za specijaliziranim OCR modelima: „Old Scans Math“ Gemini Flash 2 (Anchored) 56,1, GPT-4o (Anchored) 74,5, Chandra 2 89,1, olmOCR 2 82,3 [^chandra-bench]. Novije Gemini 3.x i ostale modele s popisa nisam našao na tom benchmarku, pa njihovu kvalitetu na formulama treba izmjeriti u #8.
- **Rizik:** opći LLM može „popraviti“ ili izmisliti tekst. To je glavni razlog za mjerenje u #8 i za uputu da nečitljiva mjesta označi umjesto da pogađa.

### 2. Mathpix

- REST API: `v3/pdf` za dokumente (asinkrono, provjera statusa preko `GET v3/pdf/{pdf_id}`), `v3/text` za slike [^mpx-pdf] [^mpx-docs].
- Izlaz je Mathpix Markdown (MMD), s pretvorbom u DOCX, LaTeX, HTML i drugo [^mpx-fmt]. `lines.json` daje svaki redak s okvirom u pikselima, pouzdanošću i oznakom je li tiskan ili rukom pisan [^mpx-pdf].
- **Hrvatski je službeno na popisu** tiskanih latiničnih jezika, a rukopis je podržan za „all other Latin alphabet languages“ [^mpx-lang].
- Cijena: $0,005 po stranici za `v3/pdf`, $0,002 po slici za `v3/text`, $0,0015 po stranici za batch (`files/v1`). Slike s više od 12 redaka teksta mogu se naplatiti kao PDF stranica. Jednokratna naknada je $19,99, a uz pay-as-you-go dobiva se $29 kredita za testiranje [^mpx-price].
- Nisam našao opciju koja svaku sliku vraća kao izrezanu sliku. Dokumentirane su samo kemijske strukture i QR kodovi [^mpx-pdf].
- Mathpix nije na olmOCR-bench tablici [^chandra-bench], pa nema neovisne usporedbe s LLM-ovima.

### 3. Mistral OCR

- Preko OpenRoutera je dostupan kao PDF parser `mistral-ocr` za $2 / 1000 stranica ($2,2 za US regiju). Prosljeđuje najviše 8 slika po PDF-u modelu, a ostatak teksta zadržava [^or-pdf].
- Izravno preko Mistrala je aktualan OCR 4.1 za $4 / 1000 stranica [^mis-price] [^mis-models]. Vraća Markdown po stranici i okvire slika, a s `include_blocks` i okvire blokova [^mis-ocr].
- Na olmOCR-bench ima 72,0 ukupno i 67,5 na „Old Scans Math“ (preuzeto iz olmOCR repozitorija, verzija modela nije navedena) [^chandra-bench].

### 4. Datalab (Marker / Chandra)

- Marker: Python (`pip install marker-pdf`), LaTeX formule u `$$`, izvlači slike, „all languages“, a s `--use_llm` koristi i LLM (uključujući OpenRouter) [^marker]. Kod je Apache 2.0, a težine modela su besplatne samo za istraživanje, osobnu upotrebu i startupe ispod $5M prihoda ili financiranja [^marker].
- Chandra 2 (3/2026): 90+ jezika, 85,8 na olmOCR-bench; težine su besplatne za startupe ispod $2M [^chandra].
- Hostani API: $4 / 1000 stranica (fast/balanced), $10 / 1000 (accurate) i mjesečni besplatni iznos od $10 do $20 [^dl-price]. To je REST, pa ne treba Python.

### 5. Open-source za samostalno pokretanje

Sve sljedeće opcije traže **Python i u praksi GPU**, dakle zaseban worker:

- **olmOCR 2** (AllenAI): 7B VLM, NVIDIA GPU s najmanje 12 GB, Apache 2.0, „less than $200 USD per million pages“, 82,4 na olmOCR-bench [^olmocr]. Model je dostupan i kod hostanih providera s OpenAI-kompatibilnim API-jem (DeepInfra $0,09 / $0,19 po 1M tokena) [^olmocr]. Nije na OpenRouteru (provjereno na [popisu modela](https://openrouter.ai/api/v1/models)), pa bi to bio drugi dobavljač.
- **Docling** (MIT): Python 3.10+, OCR za skenirane PDF-ove, formule u LaTeX preko CodeFormula modela [^docling] [^dl-enr]. Može raditi kao servis `docling-serve`, a postoji i službeni **Java klijent** `docling-serve-client` s Testcontainers modulom [^docling-java]. Python je tada skriven u Docker kontejneru.
- **MinerU 4**: Python 3.10 do 3.14, za punu brzinu NVIDIA GPU s 8 GB, a licenca je Apache 2.0 s dodatnim uvjetima [^mineru].
- **PaddleOCR-VL 1.6** (0,9B): 96,3 % na OmniDocBench v1.6, a verzija 1.5 podržava 111 jezika [^paddle].
- **Nougat** (Meta): treniran na arXivu i PMC-u, „works best with English papers“, a težine su CC-BY-NC (nekomercijalno) [^nougat]. **Ne preporučuje se.**

Self-hosting se isplati tek pri velikom volumenu. Za predmet od 300 stranica cijena API-ja je ispod $1,50, pa održavanje GPU workera nije opravdano.

## Izračun troška

Pretpostavke po stranici: oko **1.500 ulaznih tokena** (slika 560 do 1.120 tokena prema Googleovim brojkama [^gem-res] plus uputa i tekstni sloj) i oko **1.200 izlaznih tokena** (gusta stranica Markdowna s LaTeX-om). Broj tokena po slici razlikuje se među modelima. Gemini za veće slike troši 258 tokena po pločici 768×768 [^gem-img], dok za ostale modele nisam provjerio. Stvarni trošak treba očitati iz polja `usage.cost` koje OpenRouter vraća uz svaki odgovor [^or-pdf] [^or-models]. Kod modela s „razmišljanjem“ (Gemini 3.x) treba ga isključiti ili smanjiti, jer se `internal_reasoning` naplaćuje po cijeni izlaza [^or-models].

Cijene po 1M tokena (ulaz / izlaz) s [OpenRouter API-ja](https://openrouter.ai/api/v1/models), 11. 10. 2026 [^or-models]:

| Opcija                                               | Cijena (ulaz / izlaz po 1M) | Po stranici    | 300 stranica                 |
| ---------------------------------------------------- | --------------------------- | -------------- | ---------------------------- |
| `google/gemini-2.5-flash-lite`                       | $0,10 / $0,40               | ~$0,0006       | ~$0,19                       |
| `anthropic/claude-haiku-5.5`                         | $0,10 / $0,50               | ~$0,0008       | ~$0,23                       |
| `openai/gpt-6-luna`                                  | $0,10 / $0,50               | ~$0,0008       | ~$0,23                       |
| `qwen/qwen3-vl-30b-a3b-instruct`                     | $0,15 / $0,60               | ~$0,0009       | ~$0,29                       |
| `google/gemini-3.1-flash-lite`                       | $0,25 / $1,50               | ~$0,0022       | ~$0,65                       |
| `google/gemini-3.5-flash-lite`                       | $0,30 / $2,50               | ~$0,0035       | ~$1,04                       |
| `google/gemini-3.8-flash` (jači, za ponovni pokušaj) | $0,75 / $3,75               | ~$0,0056       | ~$1,69                       |
| Mistral OCR preko OpenRoutera [^or-pdf]              | $2 / 1000 str.              | $0,002         | $0,60                        |
| Mistral OCR 4.1 izravno [^mis-price]                 | $4 / 1000 str.              | $0,004         | $1,20                        |
| Mathpix `v3/pdf` [^mpx-price]                        | $5 / 1000 str.              | $0,005         | $1,50 (+ $19,99 jednokratno) |
| Mathpix batch `files/v1` [^mpx-price]                | $1,5 / 1000 str.            | $0,0015        | $0,45                        |
| Datalab balanced / accurate [^dl-price]              | $4 / $10 po 1000 str.       | $0,004 / $0,01 | $1,20 / $3,00                |
| olmOCR 2 na DeepInfra [^olmocr]                      | $0,09 / $0,19               | ~$0,0004       | ~$0,11                       |

Batch varijante na OpenRouteru (npr. `google/gemini-2.5-flash-lite:batch` $0,05 / $0,20) upola su jeftinije [^or-models]. OCR ne mora biti interaktivan, pa ih vrijedi isprobati.

Zaključak o trošku: OCR je zanemariv dio troška predmeta. Čak i najskuplja razumna opcija (Datalab accurate) stoji oko $3 za 300 stranica. Odluku treba donijeti prema kvaliteti na našim materijalima, a ne prema cijeni.

## Prijedlog toka (za #10 i #8)

1. Upload: PDF ili fotografija ide u S3.
2. Java (PDFBox): za svaku stranicu tekstni sloj (ako postoji) i render u sliku. Za fotografije treba ispraviti EXIF rotaciju i smanjiti sliku na razumnu veličinu (mjeriti u #8).
3. Jedan poziv vision modelu po stranici. Ulaz je slika plus tekstni sloj kao pomoć. Izlaz je JSON: `markdown` (tekst s `$...$` / `$$...$$`), `figures` (`box_2d`, kratak opis, broj ili naslov slike) i `unreadable` (oznaka nečitljivih dijelova).
4. Provjera: prazan izlaz, LaTeX koji se ne parsira (npr. provjera KaTeX-om, koji frontend već koristi preko `markdown-it-katex`) ili mnogo `unreadable` dijelova znače ponovni pokušaj jačim modelom ili Mathpixom.
5. Rezultat se sprema po stranici, pa se plan može pozvati na „materijal X, str. N“.

## Što treba testirati u prototipu #8

1. **Testni skup:** po 10 do 20 stranica iz svake vrste materijala: tekstualni PDF skripte (LaTeX i Word), skenirani PDF, fotografije mobitelom (koso, sjena, zakrivljena stranica), stari ispit fizike za maturu (referentni predmet), kurikulum (tablice), rukom pisane bilješke ako ih kreatori uploadaju.
2. **Točnost:** ručno ispravljen „zlatni“ tekst za podskup stranica. Mjeriti točnost hrvatskih znakova (č ć đ š ž, posebno đ i ć koji se lako zamijene), formule (renderira li se LaTeX i je li semantički isti) i izmišljeni ili ispušteni tekst.
3. **Modeli:** `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite`, `claude-haiku-5.5`, `gpt-6-luna`, `qwen3-vl-30b`, `gemini-3.8-flash`, Mathpix `v3/pdf` (ima $29 kredita za test [^mpx-price]) i Mistral OCR preko OpenRoutera.
4. **Varijante:** samo slika ili slika uz tekstni sloj; `media_resolution` medium ili high [^gem-res]; DPI rendera; JPEG ili PNG.
5. **Okviri slika:** pogađa li `box_2d` stvarne slike i jesu li opisi korisni planu.
6. **Stvarni trošak i vrijeme:** `usage.cost` po stranici [^or-pdf], broj tokena slike po modelu i trajanje za 300 stranica (paralelno ili batch).
7. **Je li „dovoljno dobro“ za plan:** dobije li generator plana isti opseg iz izlaza jeftinog modela kao iz ručno ispravljenog teksta. To je pravi kriterij, jer se zadaci iz materijala ne preuzimaju.

## Izvori

[^or-pdf]: OpenRouter, PDF inputs (engines `mistral-ocr` $2/1000 str., `cloudflare-ai` besplatno, `native`; `usage.cost`): https://openrouter.ai/docs/features/multimodal/pdfs

[^or-mm]: OpenRouter, Multimodal overview (slike kao `image_url`, URL ili base64): https://openrouter.ai/docs/features/multimodal/overview

[^or-models]: OpenRouter Models API (cijene po tokenu, `internal_reasoning`, batch varijante), dohvaćeno 11. 10. 2026: https://openrouter.ai/api/v1/models

[^gem-res]: Google, Gemini API, Media resolution: https://ai.google.dev/gemini-api/docs/media-resolution

[^gem-img]: Google, Gemini API, Image understanding (`box_2d`, tokeni po pločici): https://ai.google.dev/gemini-api/docs/image-understanding

[^mpx-price]: Mathpix, Convert API pricing: https://mathpix.com/pricing/api

[^mpx-lang]: Mathpix, All supported languages: https://mathpix.com/language-support

[^mpx-pdf]: Mathpix, Process Documents `POST v3/pdf`: https://docs.mathpix.com/reference/post-v3-pdf

[^mpx-docs]: Mathpix API docs, Introduction: https://docs.mathpix.com/

[^mpx-fmt]: Mathpix, Supported formats: https://docs.mathpix.com/reference/supported-formats

[^mis-ocr]: Mistral, Document AI, Basic OCR: https://docs.mistral.ai/capabilities/document_ai/basic_ocr/

[^mis-price]: Mistral, API pricing (OCR 4.1: $4 / 1000 stranica): https://docs.mistral.ai/inference/pricing

[^mis-models]: Mistral, Models overview (OCR 4.1 aktualan, OCR 4.0 povučen 30. 9. 2026): https://docs.mistral.ai/getting-started/models/models_overview/

[^marker]: Datalab, Marker (GitHub): https://github.com/datalab-to/marker

[^chandra]: Datalab, Chandra (GitHub): https://github.com/datalab-to/chandra

[^chandra-bench]: Chandra README, olmOCR-bench tablica: https://github.com/datalab-to/chandra#benchmark-table

[^chandra-ml]: Chandra README, višejezični benchmark (redak `hr`): https://github.com/datalab-to/chandra#multilingual-benchmark-table

[^dl-price]: Datalab, Pricing: https://www.datalab.to/pricing

[^olmocr]: AllenAI, olmOCR (GitHub): https://github.com/allenai/olmocr

[^docling]: Docling (GitHub): https://github.com/docling-project/docling

[^dl-enr]: Docling, Enrichment features (formule, slike): https://docling-project.github.io/docling/usage/enrichments/

[^docling-java]: docling-java (Java klijent za docling-serve, Testcontainers): https://github.com/docling-project/docling-java

[^mineru]: MinerU (GitHub): https://github.com/opendatalab/MinerU

[^paddle]: PaddleOCR / PaddleOCR-VL (GitHub): https://github.com/PaddlePaddle/PaddleOCR

[^nougat]: Meta, Nougat (GitHub, FAQ i licence): https://github.com/facebookresearch/nougat

[^nougat-paper]: Blecher i dr., „Nougat: Neural Optical Understanding for Academic Documents“, arXiv:2308.13418: https://arxiv.org/abs/2308.13418

[^pdfbox]: Apache PDFBox (izvlačenje Unicode teksta, „Save as Image“): https://pdfbox.apache.org/
