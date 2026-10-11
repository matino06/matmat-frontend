# Modeli odluke kao recenzenti (64 varijacija, 10 s greškom)

| Model | AUC (1 = savršeno, 0,5 = slučajno) | lažne uzbune da uhvati SVE loše | lažne uzbune da uhvati pola loših |
|---|---|---|---|
| typesafe/jev-1.13 | 0.75 | 40/54 | 17 |
| openai/gpt-6-luna-decisions | 0.89 | 24/52 | 3 |
| cloudflare/clef | 0.73 | 32/54 | 22 |
| perplexity/pplx-decider-v1.1-27b | 0.76 | 48/54 | 2 |
| upstage/solar-decide | 0.54 | 46/54 | 39 |
| microsoft/microsoft-decision-1 | 0.67 | 44/54 | 19 |
| nace-ai/drex-v1.5 | 0.61 | 51/54 | 24 |
| liquid/d1 | 0.59 | 47/54 | 22 |
| inception/mercury-decide | 0.82 | 42/54 | 5 |
| cloudflare/clef-omni | 0.66 | 50/54 | 15 |

Trošak: {"typesafe/jev-1.13": 0.0025, "openai/gpt-6-luna-decisions": 0.0063, "cloudflare/clef": 0.0139, "perplexity/pplx-decider-v1.1-27b": 0.0023, "upstage/solar-decide": 0.0091, "microsoft/microsoft-decision-1": 0.0018, "nace-ai/drex-v1.5": 0.0016, "liquid/d1": 0.0044, "inception/mercury-decide": 0.0007, "cloudflare/clef-omni": 0.0094}