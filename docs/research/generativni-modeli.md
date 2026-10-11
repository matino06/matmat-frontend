# Generativni modeli za vlastiti predmet: plan, zadaci, objašnjenja i dvostruko rješavanje

Istraživanje za [#4](https://github.com/matino06/matmat-frontend/issues/4) (mapa [#2](https://github.com/matino06/matmat-frontend/issues/2)). Stanje na dan **11. 10. 2026.** Cijene su u USD po milijunu tokena (M), preuzete iz javnog [OpenRouter API-ja modela](https://openrouter.ai/api/v1/models) i [popisa providera po modelu](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash/endpoints) istog dana, te iz cjenika proizvođača gdje je navedeno.

Modele nisam pokretao (nema API ključa). Sve ocjene kvalitete dolaze iz tuđih benchmarka. Ono što se mora izmjeriti navedeno je u zadnjem odjeljku, za prototipe [#8](https://github.com/matino06/matmat-frontend/issues/8) i [#9](https://github.com/matino06/matmat-frontend/issues/9).

## Kratki odgovor

| Korak | Preporuka (prvi izbor) | Izazivač u prototipu | Procjena po predmetu |
|---|---|---|---|
| **Plan** iz materijala (dugi kontekst, kurikulum, ispiti) | `anthropic/claude-sonnet-5.5` | `openai/gpt-6.1-sol`; `anthropic/claude-opus-5.5` kao gornja granica kvalitete | **2,3–6,3 $** |
| **Zadaci i laička objašnjenja** (hrvatski + LaTeX) | `anthropic/claude-haiku-5.5` | `anthropic/claude-sonnet-5.5` (ako Haiku ne prođe), `google/gemini-3.8-flash`, `openai/gpt-6-luna` | **~0,65 $** (Sonnet: ~12,7 $) |
| **Dvostruko neovisno rješavanje** | rješavač A `deepseek/deepseek-v4.1-flash`, rješavač B `openai/gpt-6-luna` | `openai/gpt-6.1-sol` kao jači rješavač | **~1,40 $** za oba |

**Ukupno po predmetu (200 stranica, 60 lekcija, 300 zadataka): oko 4–8,5 $** s preporučenim modelima, odnosno **oko 16–21 $** ako se zadaci pišu Sonnetom 5.5. Na to ide OpenRouterova naknada od 5,5 % pri kupnji kredita ([OpenRouter FAQ](https://openrouter.ai/docs/faq)). Pretpostavke su u odjeljku [Procjena tokena](#procjena-tokena-po-predmetu).

Logika preporuke: plan se radi jednom po predmetu i o njemu ovisi sve ostalo, pa tu ide jak model (trošak je mali). Zadataka i rješavanja ima stotine, pa tu idu jeftini modeli. Kvalitetu im osiguravaju provjere: dvostruko rješavanje, KaTeX provjera i usporedba s materijalom.

## Kandidati i cijene (OpenRouter, 11. 10. 2026.)

| Model (OpenRouter ID) | Izašao | Ulaz $/M | Izlaz $/M | Čitanje iz cachea $/M | Kontekst | Napomena o cijeni |
|---|---|---|---|---|---|---|
| `anthropic/claude-opus-5.5` | 22. 9. 2026. | 4,00 | 20,00 | 0,20 | 1M | |
| `anthropic/claude-sonnet-5.5` | 28. 9. 2026. | 2,00 | 10,00 | 0,10 | 1M | ista cijena kroz cijeli kontekst ([Anthropic, Long context pricing](https://platform.claude.com/docs/en/about-claude/pricing#long-context-pricing)) |
| `anthropic/claude-haiku-5.5` | 7. 10. 2026. | 0,10 | 0,50 | 0,01 | 1M | **prompt > 100k tokena: 0,50 / 2,50** ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing#long-context-pricing)) |
| `openai/gpt-6.1-sol` | 29. 9. 2026. | 2,00 | 10,00 | 0,10 | 1,05M | ulaz > 272k: 4,00 / 15,00 ([OpenAI model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol.md)) |
| `openai/gpt-6-luna` | 22. 9. 2026. | 0,10 | 0,50 | 0,01 | 1,05M | ulaz > 272k: 2× ulaz, 1,5× izlaz ([OpenAI model page](https://developers.openai.com/api/docs/models/gpt-6-luna.md)) |
| `google/gemini-3.8-flash` | 2. 9. 2026. | 0,75 | 3,75 | 0,075 | 1M | **od 1. 1. 2027. cijena se udvostručuje na 1,50 / 7,50** ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)) |
| `google/gemini-3.1-pro-preview` | 19. 2. 2026. | 2,00 | 12,00 | 0,20 | 1M | prompt > 200k: 4,00 / 18,00; najnoviji Pro, nema novijeg ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)) |
| `deepseek/deepseek-v4.1-flash` | 10. 9. 2026. | 0,15–0,30 | 0,60–1,20 | 0,006 | 1M | 0,15 / 0,60 kod providera DeepSeek; drugi provideri od 0,035 do 0,60 na ulazu, neki s fp4 kvantizacijom ([endpoints](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash/endpoints)) |
| `mistralai/mistral-large-4-0` | 6. 10. 2026. | 0,68 | 2,09 | 0,07 | 1M | |
| `qwen/qwen3.8-flash` | 26. 8. 2026. | 0,15 | 0,47 | 0,016 | 1M | samo Alibaba kao provider |

Izvor tablice, osim gdje piše drugačije: [OpenRouter `/api/v1/models`](https://openrouter.ai/api/v1/models). OpenRouter prosljeđuje cijene providera bez marže ([FAQ](https://openrouter.ai/docs/faq)).

Svi kandidati podržavaju `response_format`/`structured_outputs` i `reasoning` parametre na OpenRouteru (polje `supported_parameters` u [`/api/v1/models`](https://openrouter.ai/api/v1/models)). To je bitno za strojno čitljiv izlaz plana i zadataka.

## Što kažu benchmarki

### Matematičko zaključivanje

[MathArena](https://matharena.ai/models) (ETH Zürich / INSAIT) rangira modele na svježim natjecanjima i člancima, s očekivanom točnošću i cijenom po zadatku:

| Model | Očekivana točnost | Očekivani trošak po zadatku |
|---|---|---|
| GPT-6.1 Sol (max) | 90,1 % | 0,55 $ |
| Claude Opus 5.5 (high) | 83,3 % | 0,84 $ |
| Qwen3.8-Max | 56,1 % | 3,07 $ |
| Kimi K3 (Think) | 50,5 % | 2,76 $ |
| DeepSeek-V4.1-Flash (Max) | 43,3 % | 0,17 $ |
| Gemini 3.8 Flash | 35,3 % | 0,51 $ |
| Gemini 3.1 Pro Preview | 32,6 % | 1,54 $ |

Izvor: [matharena.ai/models](https://matharena.ai/models). Claude Sonnet 5.5, Claude Haiku 5.5, GPT-6 Luna i Mistral Large 4 nisu na listi.

**Oprez:** MathArena mjeri matematiku istraživačke i olimpijske razine. Natjecanja s konačnim odgovorom (AIME, HMMT) označena su kao zastarjela ([matharena.ai](https://matharena.ai/)), jer ih vodeći modeli rješavaju gotovo bez greške. Zadaci za maturu i 7.–8. razred su puno lakši. Ondje će i jeftini modeli vjerojatno biti točni, pa je razlika u cijeni važnija od razlike u ovoj tablici. DeepSeek V4.1 Flash je najjeftiniji model s ozbiljnim rezultatom na MathArena: 43 % za 0,17 $ po zadatku, a Gemini 3.8 Flash ima 35 % za 0,51 $.

### Opća sposobnost i cijena po zadatku

[Artificial Analysis Intelligence Index](https://artificialanalysis.ai/leaderboards/models) (v4.3.2: znanje, zaključivanje, rad s dokumentima, dugi kontekst AA-LCR):

| Model (razina razmišljanja) | Index | Trošak po zadatku indeksa |
|---|---|---|
| Claude Opus 5.5 (max) | 58 | 5,98 $ |
| Claude Sonnet 5.5 (max / high) | 56 / 47 | 5,46 $ / 0,88 $ |
| GPT-6.1 Sol (max / high) | 52 / 50 | 0,72 $ / 0,32 $ |
| Qwen3.8 Max (0902) | 45 | 5,41 $ |
| GLM-5.3 (max) | 45 | 2,01 $ |
| Claude Haiku 5.5 (max / high) | 43 / 38 | 0,21 $ / 0,08 $ |
| Gemini 3.8 Flash (high) | 41 | 1,24 $ |
| DeepSeek V4.1 Flash (max) | 39 | 0,27 $ |
| GPT-6 Luna (max / high) | 38 / 33 | 0,07 $ / 0,03 $ |
| Mistral Large 4 Preview | 38 | 1,13 $ |
| Gemini 3.1 Pro Preview | 30 | 1,30 $ |

Izvor: [artificialanalysis.ai/leaderboards/models](https://artificialanalysis.ai/leaderboards/models). Haiku 5.5 (max) je za cijeli indeks potrošio 440M izlaznih tokena ([AA, Claude Haiku 5.5](https://artificialanalysis.ai/models/claude-haiku-5-5)).

### Proizvođači o svojim modelima

- **Claude Sonnet 5.5:** na GDPval-AA (rad s dokumentima) ima 1844 Elo. To je praktički jednako Opusu 5.5 (1846) i znatno iznad GPT-6 Sola (1487) ([Anthropic, Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5)). Anthropic opisuje Opus 5.5 kao jači za složen, otvoren rad koji traži prosudbu (isti izvor). Sastavljanje plana upravo je takav posao, zato je Opus gornja granica u prototipu.
- **Claude Haiku 5.5:** u odnosu na Haiku 4.5 bolji je na svakom prijavljenom benchmarku (npr. Humanity's Last Exam bez alata 45,9 % prema 10,2 %), a ispred je i GPT-6 Lune na svim zajedničkim benchmarkima. Anthropic kaže da je za složenije zadatke bolji Sonnet ([Anthropic, Haiku 5.5](https://www.anthropic.com/claude-haiku-5-5)). Matematiku, MMMLU i GPQA Anthropic za Haiku 5.5 i Sonnet 5.5 ne objavljuje (oba izvora gore).
- **Gemini 3.8 Flash:** model card navodi da je izgrađen na 3.7 Flashu. Kao poznata ograničenja navodi halucinacije, povremenu sporost i veću potrošnju tokena na višim razinama razmišljanja. Sigurnost na jezicima koji nisu engleski pogoršala se za 5,4 boda u odnosu na 3.7 Flash ([DeepMind model card](https://deepmind.google/models/model-cards/gemini-3-8-flash/)).
- **GPT-6 Luna / GPT-6.1 Sol:** OpenAI na stranicama modela ne objavljuje benchmarke. Razine razmišljanja su `none`–`max` za Lunu i `low`–`max` za Sol ([Luna](https://developers.openai.com/api/docs/models/gpt-6-luna.md), [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol.md)).

### Hrvatski jezik: nema javnog benchmarka

Nisam našao benchmark koji mjeri **pisanje na hrvatskom** za modele iz 2026.:

- [Artificial Analysis Multilingual Index](https://artificialanalysis.ai/models/multilingual) ne pokriva hrvatski ni druge južnoslavenske jezike. Na njemu još nema modela iz druge polovice 2026.
- [CLASSLA LLM Evaluation Dashboard](https://mailman.ijs.si/pipermail/classla/20260212/000052.html) (CLARIN.SI, veljača 2026.) pokriva južnoslavenske jezike, ali samo klasifikaciju i zdravorazumsko zaključivanje, ne generiranje teksta.

Kvalitetu hrvatskog (padeži, enklitike, prirodan laički ton) zato **mora izmjeriti prototip #9**. Prednost za Claude Haiku 5.5: backend ga već koristi za AI chat, pa se njegovo ponašanje na hrvatskom već vidi u produkciji.

## Preporuka po koraku

### (a) Plan iz materijala: Claude Sonnet 5.5

- Materijal od 200 stranica (~160k tokena) stane u jedan poziv. Sonnet 5.5 ima 1M konteksta po istoj cijeni za cijeli prozor ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing#long-context-pricing)). Na OpenRouteru čitanje iz cachea košta 0,10 $/M, što je 5 % ulazne cijene ([isti izvor](https://platform.claude.com/docs/en/about-claude/pricing)). Ponovne provjere plana nakon izmjena kreatora zato su jeftine dok je materijal u cacheu.
- Na zadatku sličnom planiranju (razumijevanje dokumenata) praktički je izjednačen s Opusom 5.5 za pola cijene ([Anthropic](https://www.anthropic.com/claude-sonnet-5-5)).
- **Izazivač GPT-6.1 Sol:** iste cijene, najbolji na MathArena ([matharena.ai/models](https://matharena.ai/models)). Za prompt veći od 272k tokena cijena se diže na 4 / 15 $ ([OpenAI](https://developers.openai.com/api/docs/models/gpt-6.1-sol.md)), što je bitno za veće predmete.
- **Ne koristiti Haiku 5.5 za plan s cijelim materijalom:** iznad 100k tokena prompta cijena mu je 5× viša ([Anthropic](https://platform.claude.com/docs/en/about-claude/pricing#long-context-pricing)). I dalje bi bio jeftin, ali gubi glavnu prednost, a plan je korak gdje je kvaliteta najvažnija.
- **Gemini 3.1 Pro Preview nije kandidat:** na oba indeksa je ispod Gemini 3.8 Flasha ([AA](https://artificialanalysis.ai/leaderboards/models), [MathArena](https://matharena.ai/models)), a skuplji je.

### (b) Zadaci i laička objašnjenja: Claude Haiku 5.5

- Po lekciji jedan poziv od ~12k tokena ulaza, dakle ispod Haikuova praga od 100k, po cijeni 0,10 / 0,50 $ ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)). To je **~1 cent po lekciji** i ~0,65 $ za 60 lekcija.
- Ovaj korak traži dobar hrvatski, ispravan LaTeX i strogo poštivanje formata iz skilla `matmat-lekcije`, a manje vrhunsku matematiku. Matematičku točnost ionako hvata dvostruko rješavanje.
- **Ako Haiku ne prođe ocjenu kvalitete u #9**, Sonnet 5.5 je ~20× skuplji: ~12,7 $ po predmetu ili ~0,21 $ po lekciji. To je i dalje prihvatljivo, pa nije nužno tražiti nešto između.
- **Gemini 3.8 Flash** (~4,8 $ po predmetu) od 1. 1. 2027. košta dvostruko ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). Na Artificial Analysis je slabiji od Haikua 5.5 i 6–8× skuplji ([AA](https://artificialanalysis.ai/leaderboards/models)), pa ima smisla samo ako je u #9 osjetno bolji na hrvatskom.
- **Ideja za #9:** skill `matmat-lekcije` traži da svih 5 objašnjenja prolazi iste korake jednako detaljno, a preporučuje da se ne pišu ručno nego iz predloška s `{placeholderima}` koji se popuni brojevima svake varijante. Isto može raditi i model: napiše jedno objašnjenje kao predložak plus 5 skupova brojeva, a backend ih popuni. To smanjuje izlazne tokene oko 3–4× i jamči jednakost objašnjenja. Ne odgovara svakoj lekciji (podzadaci a, b, c koji se razlikuju po strukturi), pa treba testirati.

### (c) Dvostruko neovisno rješavanje: DeepSeek V4.1 Flash + GPT-6 Luna

- **Različiti proizvođači za dva rješavanja i za pisca.** Pogreške LLM-ova su jako korelirane: kad dva modela oba pogriješe, u 60 % slučajeva daju isti krivi odgovor. Korelacija je veća kad modeli dijele proizvođača ili arhitekturu ([Kim i sur., ICML 2025](https://arxiv.org/abs/2506.07962)). Dva poziva istog modela zato nisu stvarno neovisna provjera. Pisac (Claude), rješavač A (DeepSeek) i rješavač B (OpenAI) su tri različite obitelji modela. Ista studija kaže da i jaki modeli različitih proizvođača dijele dio pogrešaka, pa poklapanje dvaju rješenja smanjuje rizik, ali ga ne uklanja.
- **DeepSeek V4.1 Flash:** najbolji omjer točnosti i cijene na MathArena (43,3 % za 0,17 $; [matharena.ai/models](https://matharena.ai/models)). Na OpenRouteru ga nudi 30-ak providera po cijenama od 0,035 do 0,60 $/M ulaza, neki s fp4 kvantizacijom ([endpoints](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash/endpoints)). OpenRouter po defaultu bira providere po cijeni, a kvantizirani modeli mogu biti slabiji ([provider routing](https://openrouter.ai/docs/features/provider-routing)). Zato treba fiksirati providera (`provider.order: ["deepseek"]`, `allow_fallbacks: false`) ili filtrirati `quantizations`.
- **GPT-6 Luna:** 0,10 / 0,50 $, s razinom razmišljanja podesivom od `none` do `max` ([OpenAI](https://developers.openai.com/api/docs/models/gpt-6-luna.md)). Na AA indexu (max) ima 38 bodova za 0,07 $ po zadatku, najjeftiniji od svih kandidata ([AA](https://artificialanalysis.ai/leaderboards/models)).
- **Ako je stopa neslaganja visoka**, mapa kaže da se zadatak odbacuje. Opcija za #9: pri neslaganju pokrenuti treće rješavanje GPT-6.1 Solom (najjači na MathArena) i odbaciti zadatak samo ako se ne slaže ni s jednim. Tako se ne bacaju dobri zadaci zbog greške jeftinog rješavača. Trošak ovisi o stopi neslaganja: Sol za svih 390 rješavanja bio bi ~12,5 $, pa je za 10 % neslaganja ~1,25 $.
- Usporedba dvaju konačnih rezultata je presuda za model odluke ([#3](https://github.com/matino06/matmat-frontend/issues/3)) i nije uračunata ovdje.

## Procjena tokena po predmetu

**Pretpostavke** (sve treba izmjeriti u #8 i #9 iz polja `usage` koje OpenRouter vraća uz svaki odgovor: `prompt_tokens`, `cached_tokens`, `reasoning_tokens`, `cost`; [usage accounting](https://openrouter.ai/docs/use-cases/usage-accounting)):

- Materijal: **200 stranica × ~800 tokena = ~160k tokena** teksta nakon ekstrakcije ([#5](https://github.com/matino06/matmat-frontend/issues/5)). Hrvatski s LaTeX-om vjerojatno troši više tokena po riječi od engleskog. To nisam mogao izmjeriti.
- **60 lekcija × 5 zadataka = 300 zadataka**, plus 30 % ponovnog generiranja zbog odbačenih zadataka (faktor 1,3).
- Upute (pravila iz `matmat-lekcije`, format, primjer): ~6k tokena.

| Korak | Pozivi | Ulaz po pozivu | Izlaz po pozivu (s razmišljanjem) | Ukupno ulaz / izlaz |
|---|---|---|---|---|
| Plan: nacrt | 1 | 166k | 40k | 166k / 40k |
| Plan: provjere i popravci (nulta pretpostavka, pokrivenost ispita) | 3 | 176k (160k iz cachea) | 15k | 528k / 45k |
| Plan: ponovne provjere nakon izmjena kreatora | 10 | 176k (160k iz cachea) | 5k | 1,76M / 50k |
| Zadaci + objašnjenja | 60 × 1,3 = 78 | 12k (6k iz cachea) | 15k (7,5k teksta + 7,5k razmišljanja) | 0,94M / 1,17M |
| Rješavanje, po rješavaču | 300 × 1,3 = 390 | 1k | 3k | 0,39M / 1,17M |

Pri pisanju zadataka izlaz dominira troškom. Zato je cijena izlaznih tokena važnija od cijene ulaza.

### Trošak po koraku (USD po predmetu)

Izračunato iz gornjih pretpostavki i cijena u tablici kandidata. Uključeni su viši tarifni razredi za dugi prompt (Haiku > 100k).

| Model | Plan bez cachea | Plan s cacheom | Zadaci + objašnjenja (s cacheom) | Po lekciji | Jedno rješavanje svih zadataka |
|---|---|---|---|---|---|
| Claude Opus 5.5 | 12,52 | 4,61 | 25,37 | 0,42 | 24,96 |
| **Claude Sonnet 5.5** | **6,26** | **2,31** | 12,68 | 0,21 | 12,48 |
| **Claude Haiku 5.5** | 1,56 | 0,63 | **0,64** | **0,011** | 0,62 |
| GPT-6.1 Sol | 6,26 | 2,31 | 12,68 | 0,21 | 12,48 |
| **GPT-6 Luna** | 0,31 | 0,13 | 0,64 | 0,011 | **0,62** |
| Gemini 3.8 Flash (do 31. 12. 2026.) | 2,35 | 0,94 | 4,77 | 0,08 | 4,68 |
| Gemini 3.8 Flash (od 1. 1. 2027.) | 4,69 | 1,89 | 9,55 | 0,16 | 9,36 |
| **DeepSeek V4.1 Flash** (provider DeepSeek) | 0,45 | 0,15 | 0,78 | 0,013 | **0,76** |
| Mistral Large 4 | 1,95 | 0,68 | 2,80 | 0,05 | 2,71 |

**Preporučena kombinacija:** plan Sonnet 5.5 (2,3–6,3 $) + zadaci Haiku 5.5 (0,64 $) + rješavanje DeepSeek V4.1 Flash i GPT-6 Luna (0,76 + 0,62 $) = **~4,3 $ s cacheom, ~8,3 $ bez cachea**, plus 5,5 % OpenRouterove naknade.

**Cache u praksi:** Anthropicov cache traži `cache_control` i traje 5 minuta, ili 1 sat uz skuplji zapis (2× ulazne cijene). OpenAI i DeepSeek cacheiraju automatski ([OpenRouter prompt caching](https://openrouter.ai/docs/features/prompt-caching)). Izmjene kreatora mogu biti razmaknute satima, pa je za korak 3 plana realnija brojka „bez cachea“. Tablica zato daje oba stupca.

## Poznate slabosti i rizici

- **Hrvatski:** nema javnog benchmarka za generiranje teksta na hrvatskom s modelima iz 2026. (vidi gore). Rizik su padeži, enklitike i kalkovi iz engleskog. Jedina zaštita je mjerenje u #9.
- **LaTeX:** nijedan benchmark ne mjeri ispravnost LaTeX-a. Kod koji ne prolazi deterministički se može uhvatiti: svaki zadatak i objašnjenje treba renderirati istim KaTeX-om koji koristi frontend (`markdown-it-katex`, vidi `src/lib/utils/markdownRenderer.js`). Što se ne renderira, ide na ponovno generiranje, bez trošenja modela odluke.
- **Matematička točnost:** benchmarki mjere razinu daleko iznad mature, pa točnost na našoj razini treba izmjeriti (vidi popis niže). Korelirane pogreške ([Kim i sur.](https://arxiv.org/abs/2506.07962)) znače da dvostruko rješavanje ne hvata sve.
- **Cijene se mijenjaju brzo:** Gemini 3.8 Flash se udvostručuje 1. 1. 2027. ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). Haiku 5.5 je izašao 4 dana prije ovog istraživanja, Sonnet 5.5 i GPT-6.1 Sol prije dva tjedna. Za fiksnu verziju treba koristiti konkretne ID-jeve, ne aliase `~…-latest`, jer oni uvijek pokazuju na najnoviji model u obitelji ([OpenRouter models](https://openrouter.ai/api/v1/models)).
- **DeepSeek preko OpenRoutera:** cijena i kvaliteta ovise o provideru (fp4/fp8). Treba fiksirati providera ([provider routing](https://openrouter.ai/docs/features/provider-routing)).
- **Dugi kontekst i tarifni razredi:** Haiku 5.5 iznad 100k tokena, GPT-6.x iznad 272k i Gemini 3.1 Pro iznad 200k plaćaju višu cijenu za cijeli zahtjev (izvori u tablici kandidata). Za predmete veće od ~300 stranica plan bi s GPT-6.1 Solom skočio u viši razred, a Sonnet 5.5 ne bi.

## Što mora testirati prototip

### #8: Plan (fizika za maturu, katalog + 6 rokova, ručni plan od 97 lekcija)

1. Isti ulaz i isti prompt kroz **Sonnet 5.5, GPT-6.1 Sol i Opus 5.5**. Usporediti broj lekcija (cilj: manje od 97), pokrivenost svih zadataka iz 6 rokova, broj kršenja nulte pretpostavke i trošak.
2. Koliko je izlaz plana stabilan između dva pokretanja istog modela (broj lekcija, redoslijed).
3. Stvarna veličina materijala u tokenima (katalog + 6 rokova) nasuprot pretpostavci od 800 tokena po stranici.
4. Koliko tokena troši razmišljanje na razinama `high`, `xhigh` i `max`, te mijenja li viša razina kvalitetu plana.
5. Cijena ponovne provjere nakon jedne izmjene kreatora, s cacheom i bez njega.
6. Opcionalno, Gemini 3.8 Flash kao jeftina kontrola: daje li bitno lošiji plan?

### #9: Zadaci, objašnjenja i dvostruko rješavanje (nekoliko lekcija iz plana fizike)

1. **Haiku 5.5 nasuprot Sonnetu 5.5** (opcionalno i Gemini 3.8 Flash, GPT-6 Luna) na istih ~5 lekcija. Ljudska ocjena hrvatskog (padeži, enklitike, laički ton), poštivanja pravila iz `matmat-lekcije` i matematičke točnosti.
2. **Udio LaTeX-a koji se ne renderira** u KaTeX-u, po modelu.
3. **Stopa neslaganja** DeepSeek V4.1 Flash i GPT-6 Luna, te koliko je od toga stvarno krivih zadataka, a koliko grešaka rješavača. Usporediti s varijantom „treće rješavanje GPT-6.1 Solom“.
4. Varijanta s predloškom (jedno objašnjenje + 5 skupova brojeva): ušteda tokena i kvaliteta.
5. Stvarni tokeni po lekciji i po rješavanju (iz `usage`) nasuprot pretpostavkama od 12k/15k i 1k/3k, i stvarna stopa ponovnog generiranja nasuprot pretpostavljenih 30 %.
6. Razina razmišljanja za rješavače: rješava li `medium` zadatke ove razine jednako dobro kao `high` za manje tokena.
