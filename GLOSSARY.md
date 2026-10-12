# MatMat

Platforma za učenje gradiva kroz zadatke s laičkim objašnjenjima i ponavljanjem (spaced repetition).

## Vlastiti predmet

**Vlastiti predmet**:
Predmet koji kreator sam napravi iz svojih materijala; MatMat iz njih izradi plan i lekcije. Privatan je kreatoru.
_Avoid_: custom course, kurs, moj predmet

**Kreator**:
Posebna klasa korisnika koja smije izrađivati vlastite predmete. Nije admin.
_Avoid_: creator, power user, premium korisnik

**Materijal**:
Datoteka koju kreator uploada za vlastiti predmet: skripta, kurikulum, stari ispit. Određuje opseg i dubinu gradiva, ali se iz njega nikad ne preuzimaju zadaci.
_Avoid_: dokument, izvor, upload

**Materijal dostupan na ispitu**:
Materijal koji učenik smije koristiti na ispitu, npr. knjižica formula. Ono što je u njemu učenik ne pamti nego zna gdje to pronaći; značenje veličine i dalje traži lekciju.
_Avoid_: šalabahter, podsjetnik

**Plan**:
Uređeni skup lekcija s preduvjetima koji pokriva cijelo gradivo vlastitog predmeta. Kreator ga može uređivati prije nego krenu zadaci.
_Avoid_: kurikulum, syllabus, roadmap

## Gradivo

**Područje**:
Velik dio gradiva predmeta (npr. Mehanika) koji okuplja više cjelina. Po područjima se prikazuju mapa, napredak i spremnost za ispit.
_Avoid_: domena, oblast, field

**Cjelina**:
Skupina lekcija plana koje pokrivaju isti ishod (npr. Pravocrtno gibanje). Pripada jednom području.
_Avoid_: blok, poglavlje, tema, subfield

**Lekcija**:
Mali zalogaj plana: najviše jedna nova ideja, koju učenik nauči iz jednog zadatka i njegovog objašnjenja. Složen koncept dijeli se na lekciju s laganim zadatkom i lekciju sa složenijim zadatkom koja joj je preduvjet; novi kontekst ili obrat formule nisu razlog za novu lekciju.
_Avoid_: ishod, cilj, objective, tema

**Stavka znanja**:
Najsitnija stvar koju učenik mora znati ili umjeti: jedna formula, definicija, pojava, postupak ili tipična zamka. Lekcija se sastoji od 4–6 stavki.
_Avoid_: knowledge point, činjenica, cilj

**Koncept**:
Nova ideja koju učenik mora razumjeti, a ne može je izvesti iz ranijih lekcija.
_Avoid_: tip zadatka, vještina

**Preduvjet**:
Lekcija čiji se koncept koristi u drugoj lekciji. Lekcija smije koristiti samo koncepte iz svojih preduvjeta (pravilo nulte pretpostavke).
_Avoid_: prerequisite, ovisnost

**Zadatak**:
Ono čime lekcija uči svoju ideju, s najviše tri podzadatka a, b, c. Lekcija ima do četiri varijacije (druga situacija i brojevi, iste stavke), da ponavljanje ne bude uvijek isti zadatak; za učenje je dovoljna jedna. Prva varijacija svake lekcije nastaje čim je plan potvrđen; sljedeća nastaje kad učenik riješi prethodnu, a nakon četvrte se kreće ispočetka. Nikad nije preuzet iz materijala.
_Avoid_: pitanje, vježba

**Lekcija primjene**:
Lekcija bez novog koncepta koja uči primijeniti već naučeni koncept u drugom kontekstu. Postoji samo u brzoj pripremi.
_Avoid_: vježba, primjer

**Pretpostavljeno predznanje**:
Koncepti izvan materijala koje plan smije koristiti bez lekcije; po defaultu samo matematika iz ranijih razreda, nikad gradivo samog predmeta. Kreator ga uređuje; ono što ne zna prebacuje u plan kao lekciju.
_Avoid_: predznanje, prerequisites

**Način učenja**:
Odabir kreatora koji određuje sadrži li plan lekcije primjene. Može se promijeniti bez gubitka napretka.
_Avoid_: mod, režim

**Učenje gradiva**:
Način učenja sa samo lekcijama koncepata, za vježbanje kroz probne ispite.

**Brza priprema**:
Način učenja koji uz lekcije koncepata ima i lekcije primjene, za kad se sve uči i vježba na MatMatu.

**Objašnjenje**:
Rješenje zadatka po koracima, napisano laički, tako da ga razumije i učenik kojem predmet ne ide.
_Avoid_: rješenje, solution
