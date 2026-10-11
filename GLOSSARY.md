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

**Plan**:
Uređeni skup lekcija s preduvjetima koji pokriva cijelo gradivo vlastitog predmeta. Kreator ga može uređivati prije nego krenu zadaci.
_Avoid_: kurikulum, syllabus, roadmap

## Gradivo

**Lekcija**:
Jedinica plana koja uvodi točno jedan novi koncept. Novi tip zadatka nije razlog za novu lekciju.
_Avoid_: ishod, cilj, objective, tema

**Koncept**:
Nova ideja koju učenik mora razumjeti, a ne može je izvesti iz ranijih lekcija.
_Avoid_: tip zadatka, vještina

**Preduvjet**:
Lekcija čiji se koncept koristi u drugoj lekciji. Lekcija smije koristiti samo koncepte iz svojih preduvjeta (pravilo nulte pretpostavke).
_Avoid_: prerequisite, ovisnost

**Zadatak**:
Jedna od pet varijacija kojima lekcija uči svoj koncept, moguće s podzadacima a, b, c. Učenik pri svakom ponavljanju lekcije dobije sljedeći. Nikad nije preuzet iz materijala.
_Avoid_: pitanje, vježba

**Lekcija primjene**:
Lekcija bez novog koncepta koja uči primijeniti već naučeni koncept u drugom kontekstu. Postoji samo u brzoj pripremi.
_Avoid_: vježba, primjer

**Pretpostavljeno predznanje**:
Koncepti izvan materijala koje plan smije koristiti bez lekcije. Kreator ga uređuje; ono što ne zna prebacuje u plan kao lekciju.
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
