# Upute za izradu kemijskog widgeta (za agente)

Radiš u worktreeju `/Users/matino/Developer/matmat-frontend-kemija` (grana `feat/kemija-widgeti`). Izrađuješ JEDAN
widget za interaktivne lekcije iz kemije (državna matura), po uzoru na fizikalne widgete.

## Što pročitati prije početka
- `docs/interaktivne-lekcije.md` (format lekcije, uloge koraka Pogledaj / Istraži / Tvoj red, pravila).
- `src/lib/lesson/katalog/zajednicko.js` (POGLEDAJ, ODGOVOR, problems, noAnswerFields, checkNumber, KRIVO_OPIS).
- Primjer cijelog fizikalnog widgeta: logika `src/lib/lesson/katalog/fizika/plin_posuda.js`, prikaz
  `src/lib/lesson/komponente/fizika/PlinPosuda.svelte`. Pogledaj i jedan manji (npr. `smjer_u_polju.js` +
  `SmjerUPolju.svelte`) te opće komponente `src/lib/lesson/komponente/{Broj,Praznina,Izbor,PretvorbaJedinica,Mreza}.svelte`
  za izgled, klase (`lx-…`), boje (CSS varijable teme) i ponašanje na mobitelu.
- `src/lib/lesson/katalog/kemija/_tablice.js` — JEDINI izvor kemijskih brojeva (Ar s lista mature, konstante,
  elektrodni potencijali, `atomiOd`, `molarnaMasa`, `nabojOd`). Ne upisuj Ar ni konstante ručno u widget.
- `src/lib/sketch/taskSketch.js` — kemijske skice (strukturna formula, energijski dijagram, čestice …) ako ti trebaju
  za crtanje (`renderSketch`).

## Ugovor widgeta (logika, `src/lib/lesson/katalog/kemija/<tip>.js`)
```js
export const <tip> = {
  tip: "<tip>",
  samoRucno: true,                       // kao fizika: samo ručno pisane lekcije
  uloga: (s) => (s.nacin === "istrazi" ? POGLEDAJ : ODGOVOR),
  istrazi: (s) => s.nacin === "istrazi",
  opis: `…`,                             // za autora lekcije: polja, načini, što kod računa sam
  primjer: { … },                         // glavni primjer (prikazuje ga /lab/lekcija katalog)
  primjeri: [ … ],                        // po jedan primjer za svaki način rada
  validate(s, ctx) { … return list },     // popis problema (rečenice na hrvatskom); [] = ispravno
  check(s, odgovor) { … return { tocno, poruka? } },
  tocanOdgovor(s) { … return "tekst" },   // za „Pokaži odgovor“ i sažetak
};
```
- Sve što se može izračunati računa KOD iz speca (točan odgovor, tipične krive vrijednosti s porukama), kao fizika.
  Autor lekcije ne upisuje točan odgovor ako ga kod može izračunati; ako ga upiše, `validate` provjerava da se slaže.
- `validate` mora uhvatiti nemoguć ili kemijski kriv spec (nepoznata formula, neizjednačiva jednadžba, element koji ne
  postoji …) i korak „istrazi“ s poljem odgovora (`noAnswerFields`).
- U koraku „Tvoj red“ widget ne smije odati odgovor prije provjere.
- Poruke za krive odgovore su konkretne i kratke, na hrvatskom, laički („Kisika je lijevo 6 atoma, a desno 4.“).

## Prikaz (`src/lib/lesson/komponente/kemija/<Tip>.svelte`)
- Svelte 5 (runes). Propsi: `{ spec, locked, pokazi, ishod, onodgovor }` (vidi `komponente/index.js`); korak
  „Pogledaj“ dobiva samo `spec`.
- Mora raditi na mobitelu (širina 360 px) i u svijetloj i tamnoj temi (samo CSS varijable teme, bez fiksnih boja
  osim ako je boja sama kemijski podatak, npr. boja taloga).
- Kemijske formule uvijek kroz zajedničku komponentu `komponente/kemija/Formula.svelte` (`<Formula f="SO₄²⁻" />`):
  pretvara Unicode indekse i naboje u `<sub>`/`<sup>`. Ne ispisuj Unicode indekse izravno, posebno ne u monospace fontu
  (loše se vide). Isto vrijedi za potencije u vrijednostima („3,01·10²³“) i jedinice („mol/dm³“).
- Formule u sans fontu (`var(--font-sans)`), ne u monospace fontu.
- Na mobitelu se ništa ne smije prelamati tako da „+“ ili strelica ostanu sami na kraju retka (spoji ih s pojmom iza).
- Zadane brojeve prikazuj onako kako ih piše tekst zadatka (značajne znamenke, „2,10 g“, ne „2,1 g“). Ako widget
  prikazuje zadanu vrijednost, podrži neobavezno polje `zapis` („2,10“) i u `validate` provjeri da je isti broj.

## Registracija (samo dodaj svoj redak, ne prepisuj datoteke; i drugi agenti ih istodobno mijenjaju)
- `src/lib/lesson/katalog/kemija/index.js`: `import { <tip> } from "./<tip>.js";` i `<tip>,` u popis `KEMIJA`.
- `src/lib/lesson/komponente/kemija/ucitaj.js`: `<tip>: () => import("./<Tip>.svelte"),`.
Koristi alat Edit (jedan redak), nikad Write na tim datotekama.

## Provjera prije predaje
1. Node skripta (u /tmp, ne u repozitoriju) koja: za svaki `primjer`/`primjeri` pozove `validate` (mora vratiti []),
   za „Tvoj red“ primjere pozove `check` s točnim odgovorom (tocno: true) i s 2–3 tipične krive vrijednosti
   (tocno: false i smislena poruka), te nekoliko namjerno krivih specova (validate mora vratiti probleme).
2. `cd /Users/matino/Developer/matmat-frontend-kemija && npx vite build` mora proći.
3. Ne pokreći dev server na portu 5173 (koristi ga koordinator); ako trebaš, koristi drugi port.
4. Commitaj SAMO svoje datoteke i svoj redak registracije: `git add <tvoje datoteke> && git commit -m "…"` (poruka na
   engleskom, završi s praznim retkom i `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), pa `git push`.
   Ako push ne prođe jer je drugi agent pushao, `git pull --rebase` pa ponovno push. Ne diraj tuđe datoteke.

Na kraju javi: polja speca i načine rada, što kod računa sam, rezultat provjera, i što bi koordinator trebao
pogledati u pregledniku (`/lab/lekcija?z=katalog&tip=<tip>`; stranica čita `lab-out/`, pa koordinator gleda na svom dev serveru).

## Naučeno iz pregleda prvih 9 widgeta
- Pitanje ne daje formulu. U „Tvoj red“ lancu ne pokazuj formule na strelicama („Q = I · t“, „n = m : M“) ni
  polureakcije/međukorake koji odaju rješenje prije provjere; neka ih autor uključi neobaveznim poljem
  (`operacije?: true`), a nakon provjere ili „Pokaži odgovor“ smiju se vidjeti.
- Konstante s indeksom: K<sub>c</sub>, K<sub>p</sub>, K<sub>a</sub>, V<sub>m</sub>, N<sub>A</sub>, Δ<sub>r</sub>H — ne „Kc“.
- Broj i jedinicu drži u jednom retku (`white-space: nowrap` na „−0,762 V“), da jedinica ne ostane sama u novom retku.
- `<select>` ne može prikazati `<sub>`: tekst opcija neka bude kratak (bez dugih vrijednosti u zagradi), da se ne reže na 360 px.
- Boje koje se spominju u tekstu primjera neka se zovu isto kao u widgetu (npr. fenolftalein „ljubičast“, ne jednom „ružičast“).
- Pregled u pregledniku: `npx vite dev --config vite.pregled.config.mjs --port <tvoj port>` u worktreeju (config je
  lokalan, ne commitaj ga; `lab-out` je link). Ne koristi portove 5173 i 5181.
