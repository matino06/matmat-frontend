<script>
  // Svi widgeti kataloga s primjerom iz opisa: za ručnu provjeru izgleda i provjere odgovora, i u varijantama
  // načina rada koje generirane lekcije (još) ne koriste.
  import "$lib/lesson/lesson.css";
  import { page } from "$app/state";
  import Korak from "$lib/lesson/komponente/Korak.svelte";
  import { KATALOG, provjeri, uloga, ODGOVOR } from "$lib/lesson/katalog/index.js";

  // dodatni načini rada uz primjer iz kataloga
  const VARIJANTE = [
    { tip: "mjerilo", nacin: "istrazi", instrument: "menzura", od: 0, do: 300, razmak: 20, oznaka_svakih: 100, jedinica: "mL", vrijednost: 140, uranjanje: { nakon: 220, gumb: "Uroni kamen" }, tekst: "Pogledaj kako se razina vode podigne kad potpuno uroniš kamen." },
    { tip: "mjerilo", nacin: "postavi", instrument: "termometar", od: -20, do: 50, razmak: 2, oznaka_svakih: 10, jedinica: "°C", vrijednost: 24, tekst: "Povuci stupac termometra na 24 °C." },
    { tip: "mjerilo", nacin: "procitaj", instrument: "vaga", od: 0, do: 400, razmak: 10, oznaka_svakih: 100, jedinica: "g", vrijednost: 290, tekst: "Koliku masu pokazuje vaga?" },
    { tip: "mjerilo", nacin: "procitaj", instrument: "ravnalo", od: 0, do: 30, razmak: 0.5, oznaka_svakih: 5, jedinica: "cm", vrijednost: 18.5, tekst: "Kolika je duljina olovke?" },
    { tip: "mreza", nacin: "istrazi", redaka: 10, stupaca: 10, velicina: 1, jedinica: "mm", oznacene: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9]], tekst: "Kvadratić od 1 cm² povećan: sastoji se od kvadratića od 1 mm². Dodiruj kvadratiće i gledaj koliko mm² je označeno." },
    { tip: "mreza", nacin: "oznaci", redaka: 5, stupaca: 6, velicina: 1, jedinica: "cm", cilj: 6, tekst: "Označi lik površine 6 cm²." },
    { tip: "uronjeno", nacin: "istrazi", tekst: "Spusti svako tijelo u vodu i pogledaj pliva li.", tekucina: { naziv: "voda", gustoca: 1 }, tijela: [{ naziv: "čep", gustoca: 0.24 }, { naziv: "led", gustoca: 0.92 }, { naziv: "aluminij", gustoca: 2.7 }] },
    { tip: "cestice", nacin: "prikaz", tekst: "Usporedi kako su raspoređene čestice.", kutije: [{ oznaka: "led", stanje: "cvrsto" }, { oznaka: "voda", stanje: "tekuce" }, { oznaka: "vodena para", stanje: "plin" }] },
    { tip: "ocitaj_graf", nacin: "prikaz", x: [0, 60], y: [0, 150], os_x: "V (cm³)", os_y: "m (g)", funkcije: [{ izraz: "2.4*x", oznaka: "A" }, { izraz: "0.8*x", oznaka: "B" }], tekst: "Dodirni graf i pogledaj masu za različite volumene." },
    { tip: "pretvorba_jedinica", velicina: "volumen", vrijednost: 3.2, od: "L", do: "cm³", stube: true, tekst: "Koliko je to cm³? Pomozi si stubama." },
    { tip: "graf_funkcije", nacin: "istrazi", tekst: "Pomiči $a$, $b$ i $c$ i gledaj gdje je parabola iznad osi $x$ (zeleno).", x: [-5, 7], y: [-6, 8], funkcije: [{ izraz: "a*x^2+b*x+c", oznaka: "f" }], klizaci: [{ id: "a", oznaka: "$a$", vrijednosti: [-2, -1, -0.5, 0.5, 1, 2], pocetak: 1 }, { id: "b", oznaka: "$b$", min: -6, max: 6, korak: 1, pocetak: -4 }, { id: "c", oznaka: "$c$", min: -6, max: 6, korak: 1, pocetak: 3 }], formula: "f(x) = {a}x^2 + {b}x + {c}", istakni: { znak: ">0" } },
    { tip: "graf_funkcije", nacin: "prikaz", tekst: "Graf funkcije sinus na $[-2\\pi, 2\\pi]$.", x: [-6.6, 6.6], y: [-1.5, 1.5], pi_x: 2, korak_y: 0.5, funkcije: [{ izraz: "sin(x)" }], strelice: [{ od: ["-pi/2", -1], do: ["3*pi/2", -1], oznaka: "P = 2π" }], crte: [{ y: 0, oznaka: "" }] },
    { tip: "interval", nacin: "prikaz", tekst: "Skup $[1, 4]$ na brojevnom pravcu.", tocke: [1, 4], odgovor: "[1, 4]" },
    { tip: "interval", nacin: "upisi", tekst: "Koja je domena funkcije $f(x) = \\frac{1}{x + 4}$?", odgovor: "R \\ {-4}", krivo: [{ odgovor: "<-4, inf>", poruka: "Nazivnik ne smije biti 0, ali $x$ smije biti i manji od $-4$." }] },
    { tip: "graf_funkcije", nacin: "prikaz", tekst: "Trokut $ABC$ s visinom na stranicu $c$.", osi: false, x: [-0.6, 6.6], y: [-0.7, 4.3], likovi: [{ tocke: [[0, 0], [6, 0], [2, 3.5]], ispuna: true }], duzine: [{ od: [2, 3.5], do: [2, 0], oznaka: "$v_c$", isprekidano: true }, { od: [0, 0], do: [6, 0], oznaka: "$c = 6$" }], kutovi: [{ vrh: [2, 0], od: [6, 0], do: [2, 3.5], pravi: true }, { vrh: [0, 0], od: [6, 0], do: [2, 3.5], oznaka: "$\\alpha$" }], tocke: [{ x: 0, y: 0, oznaka: "A" }, { x: 6, y: 0, oznaka: "B" }, { x: 2, y: 3.5, oznaka: "C" }, { x: 2, y: 0, oznaka: "N" }] },
    { tip: "graf_funkcije", nacin: "prikaz", tekst: "Pravilna četverostrana piramida (kosa projekcija).", osi: false, x: [-0.6, 5.4], y: [-0.6, 5.6], likovi: [{ tocke: [[0, 0, 0], [4, 0, 0], [4, 4, 0]], ispuna: false }], duzine: [{ od: [0, 0, 0], do: [0, 4, 0], isprekidano: true }, { od: [0, 4, 0], do: [4, 4, 0], isprekidano: true }, { od: [0, 0, 0], do: [2, 2, 4.5] }, { od: [4, 0, 0], do: [2, 2, 4.5] }, { od: [4, 4, 0], do: [2, 2, 4.5] }, { od: [0, 4, 0], do: [2, 2, 4.5], isprekidano: true }, { od: [2, 2, 0], do: [2, 2, 4.5], oznaka: "$h$", isprekidano: true, istaknuto: true }, { od: [0, 0, 0], do: [4, 0, 0], oznaka: "$a = 4$" }], tocke: [{ x: 2, y: 2, z: 0, oznaka: "S" }, { x: 2, y: 2, z: 4.5, oznaka: "V" }] },
    { tip: "graf_funkcije", nacin: "prikaz", tekst: "Broj $z = 3 + 2i$ u Gaussovoj ravnini.", os_x: "Re", os_y: "Im", x: [-2, 5], y: [-1, 4], vektori: [{ od: [0, 0], do: [3, 2], oznaka: "$z$" }], crte: [{ x: 3 }, { y: 2 }], tocke: [{ x: 3, y: 2, oznaka: "$z = 3 + 2i$" }] },
    { tip: "graf_funkcije", nacin: "prikaz", tekst: "Brojevna kružnica i točka $E(t)$ uz $\\cos t = -\\frac{1}{4}$, $\\sin t < 0$.", x: [-1.5, 1.5], y: [-1.3, 1.3], korak_x: 0.5, korak_y: 0.5, kruznice: [{ sredina: [0, 0], r: 1 }], crte: [{ x: -0.25, oznaka: "$x = -\\frac{1}{4}$" }], tocke: [{ x: -0.25, y: "-sqrt(15)/4", oznaka: "$E(t)$", polozaj: "dolje-lijevo" }] },
    { tip: "graf_funkcije", nacin: "prikaz", tekst: "Linearna funkcija samo za $x \\geq 0$.", x: [-1, 8], y: [-1, 6], funkcije: [{ izraz: "1+0.5*x", od: 0 }], tocke: [{ x: 0, y: 1, oznaka: "(0, 1)" }] },
    { tip: "izraz", tekst: "Kolika je amplituda funkcije na grafu?", polja: [{ oznaka: "$|A| =$", odgovor: "2" }], graf: { nacin: "prikaz", x: [-1, 9], y: [-3, 3], funkcije: [{ izraz: "2*sin(pi/4*x)" }] } },
  ];
  // widget može uz primjer imati i „primjeri“: dodatne načine rada (fizikalni widgeti)
  // ?tip=sudar,strujni_krug prikazuje samo te widgete (stranica sa svim animiranim primjerima je teška)
  const tipovi = page.url.searchParams.get("tip")?.split(",") ?? null;
  const svi = [...Object.values(KATALOG).flatMap((w) => [w.primjer, ...(w.primjeri ?? [])]), ...VARIJANTE].filter((s) => !tipovi || tipovi.includes(s.tip));

  let ishodi = $state(svi.map(() => null));
  let pokazi = $state(svi.map(() => false));
  const problemi = (s) => {
    try {
      return KATALOG[s.tip].validate(s, { text: JSON.stringify(s) });
    } catch (e) {
      return [`validate je bacio iznimku: ${e.message}`];
    }
  };
  function odgovor(i, s, o) {
    ishodi[i] = provjeri(s, o);
  }
</script>

<p class="muted small">Primjeri iz opisa widgeta (isti idu modelu u prompt) i dodatni načini rada. Provjera odgovora je ista kao u lekciji.</p>
<div class="lx kat">
  {#each svi as s, i (i)}
    <div class="kat-item">
      <div class="kat-head mono">{s.tip}{s.nacin ? ` · ${s.nacin}` : ""}{s.instrument ? ` · ${s.instrument}` : ""}{#if problemi(s).length}<span class="kat-bad"> · {problemi(s).join("; ")}</span>{/if}</div>
      <!-- jedan neispravan widget ne smije srušiti cijeli katalog -->
      <svelte:boundary>
        <Korak spec={s} ishod={ishodi[i]} pokazi={pokazi[i]} locked={!!ishodi[i]?.tocno || pokazi[i]} onodgovor={(o) => odgovor(i, s, o)}>
          {#if ishodi[i]?.tocno}<p class="kat-ok">✓ Točno</p>{/if}
          {#if !pokazi[i] && uloga(s) === ODGOVOR}<div class="lx-actions"><button class="btn btn-quiet" onclick={() => (pokazi[i] = true)}>Pokaži točan odgovor</button><button class="btn btn-quiet" onclick={() => ((ishodi[i] = null), (pokazi[i] = false))}>Ispočetka</button></div>{/if}
        </Korak>
        {#snippet failed(error)}<p class="kat-bad">Widget je pao: {error?.message ?? error}</p>{/snippet}
      </svelte:boundary>
    </div>
  {/each}
</div>

<style>
  .kat {
    display: grid;
    gap: 18px;
    max-width: 720px;
  }
  .kat-head {
    font-size: 11px;
    color: var(--text-faint);
    margin-bottom: 4px;
  }
  .kat-bad {
    color: var(--danger);
  }
  .kat-ok {
    color: var(--success);
    margin: 10px 0 0;
  }
  .muted {
    color: var(--text-dim);
  }
  .small {
    font-size: 12px;
  }
</style>
