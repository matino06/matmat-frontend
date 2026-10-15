<script>
  // Svi widgeti kataloga s primjerom iz opisa: za ručnu provjeru izgleda i provjere odgovora, i u varijantama
  // načina rada koje generirane lekcije (još) ne koriste.
  import "$lib/lesson/lesson.css";
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
  ];
  const svi = [...Object.values(KATALOG).map((w) => w.primjer), ...VARIJANTE];

  let ishodi = $state(svi.map(() => null));
  let pokazi = $state(svi.map(() => false));
  const problemi = (s) => KATALOG[s.tip].validate(s, { text: JSON.stringify(s) });
</script>

<p class="muted small">Primjeri iz opisa widgeta (isti idu modelu u prompt) i dodatni načini rada. Provjera odgovora je ista kao u lekciji.</p>
<div class="lx kat">
  {#each svi as s, i (i)}
    <div class="kat-item">
      <div class="kat-head mono">{s.tip}{s.nacin ? ` · ${s.nacin}` : ""}{s.instrument ? ` · ${s.instrument}` : ""}{#if problemi(s).length}<span class="kat-bad"> · {problemi(s).join("; ")}</span>{/if}</div>
      <Korak spec={s} ishod={ishodi[i]} pokazi={pokazi[i]} locked={!!ishodi[i]?.tocno || pokazi[i]} onodgovor={(o) => (ishodi[i] = provjeri(s, o))}>
        {#if ishodi[i]?.tocno}<p class="kat-ok">✓ Točno</p>{/if}
        {#if !pokazi[i] && uloga(s) === ODGOVOR}<div class="lx-actions"><button class="btn btn-quiet" onclick={() => (pokazi[i] = true)}>Pokaži točan odgovor</button><button class="btn btn-quiet" onclick={() => ((ishodi[i] = null), (pokazi[i] = false))}>Ispočetka</button></div>{/if}
      </Korak>
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
