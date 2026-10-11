# Ručna provjera 18 Haiku (medium) varijacija koje je Jev recenzent (prag 0,8) odbio

Test na 50 lekcija: 34 varijacije napisane i provjerene (16 prošlo, 18 odbijeno), 15 nije stiglo do generiranja, 1 neispravan JSON.
Svaki brojčani rezultat ponovno izračunat.

| Lekcija | Jev min | Ocjena |
|---|---|---|
| B01.01 Put, pomak, prosječna brzina | 0,67 | ✅ točno (7 podzadataka a–g — predugo) |
| B02.02 Ravnoteža, trenje, kosina | 0,78 | ✅ točno |
| B07.01 Newtonov zakon gravitacije | 0,72 | ✅ točno |
| B07.04 Period, Kepler, masa tijela | 0,74 | ✅ točno |
| B08.02 Atmosferski i manometarski tlak | 0,74 | ✅ točno |
| B09.03 Tlakovi i brzine u cijevi | 0,77 | ✅ točno |
| B10.01 Čestična građa | 0,74 | ✅ točno |
| B12.06 I. zakon, izoprocesi, adijabata | 0,72 | ✅ točno (i adijabata 8^(5/3) = 32) |
| B13.06 Naboj u električnom polju | 0,63 | ✅ točno (5 podzadataka s više pitanja — predugo) |
| B14.01 Sile na nabijeno tijelo u polju | 0,64 | ❌ **greška u premisi**: pozitivni naboj otklonjen *prema* pozitivnoj ploči; brojevi točni |
| B15.02 Otpor i Ohmov zakon | 0,52 | ✅ točno |
| B17.04 Kružno gibanje naboja | 0,75 | ✅ točno |
| B17.06 Odabirnik brzine, spektrometar | 0,79 | ✅ točno (c) „ioni koji su prošli“ nakon promjene napona u b) malo dvosmisleno) |
| B18.03 Lenz + izmjenična struja | 0,74 | ✅ točno |
| B20.03 Jednadžba vala, intenzitet | 0,62 | ⚠️ brojevi točni; ravni val stalne amplitude uz točkasti izvor (1/r²) nije dosljedno, ali uobičajeno u školskim zadacima |
| B20.07 Interferencija, stojni valovi | 0,72 | ✅ točno |
| B21.03 Stojni valovi u cijevima | 0,79 | ✅ točno |
| B22.04 Snell + totalna refleksija | 0,79 | ⚠️ brojevi točni; c) kaže da „zraka“ pada na stijenku pod 60°, a iz a) bi bilo 70,5° |

**Ukupno: 14 potpuno točnih, 3 s manjom nedosljednošću, 1 sa stvarnom greškom.** Brojčani rezultati točni u svih 18.

Jev pri pragu 0,8 je ovdje **uglavnom šum**: od 18 odbijenih samo je 1 stvarno pogrešna. Pri pragu 0,7 odbio bi 5 (B14.01, B15.02, B13.06, B20.03, B01.01): 1 greška, 1 manja nedosljednost, 3 točna.

Usput: dio zadataka je predugačak za „mali zalogaj“ (B01.01 ima a–g, B13.06 a–e s po 2–3 pitanja).
