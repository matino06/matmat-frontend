<script>
  // Skup na brojevnom pravcu: dodirom se biraju dijelovi pravca između istaknutih točaka i same točke (puni
  // kružić = točka je u skupu). Ispod se uživo piše zapis intervala koji je učenik time sastavio, pa slika i
  // zapis ⟨ ⟩ [ ] idu zajedno. U „prikaz“ načinu pravac samo pokazuje zadani skup.
  import Md from "./Md.svelte";
  import { tockePravca, skupIzOdabira, odabirIzSkupa, texSkupa, parseSkup } from "../katalog/matematika.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const tocke = $derived(tockePravca(spec));
  const n = $derived(tocke.length);
  const prikaz = $derived(spec.nacin === "prikaz");
  const tocan = $derived(odabirIzSkupa(spec, parseSkup(spec.odgovor)));

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let odabir = $state({ dijelovi: Array(tockePravca(spec).length + 1).fill(false), tocke: Array(tockePravca(spec).length).fill(false) });
  const vidljivo = $derived(prikaz || pokazi ? tocan : odabir);
  const zapis = $derived(texSkupa(skupIzOdabira(spec, vidljivo)));
  const nista = $derived(!vidljivo.dijelovi.some(Boolean) && !vidljivo.tocke.some(Boolean));
  const zakljucano = $derived(prikaz || locked || pokazi);

  // položaj i-te točke na pravcu (u %): jednaki razmaci, jer je važan poredak, a ne mjerilo
  const poz = (i) => (n === 1 ? 50 : 16 + (68 * i) / (n - 1));
  const granice = $derived([0, ...tocke.map((_, i) => poz(i)), 100]);

  function dio(i) {
    if (zakljucano) return;
    odabir.dijelovi[i] = !odabir.dijelovi[i];
  }
  function tocka(i) {
    if (zakljucano) return;
    odabir.tocke[i] = !odabir.tocke[i];
  }
  const opisDijela = (i) =>
    i === 0 ? `lijevo od ${tocke[0]?.tex ?? "0"}` : i === n ? `desno od ${tocke[n - 1].tex}` : `između ${tocke[i - 1].tex} i ${tocke[i].tex}`;
</script>

{#if prikaz}
  <Md text={spec.tekst} />
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
  <p class="lx-hint">Dodirni dijelove pravca koji su u rješenju. Dodirni točku da je uključiš (pun kružić) ili isključiš (prazan).</p>
{/if}

<div class="iv" class:ok={ishod?.tocno} class:bad={ishod && !ishod.tocno && !ishod.prazno}>
  <div class="iv-pravac">
    <div class="iv-linija"></div>
    <div class="iv-strelica"></div>
    {#each granice.slice(0, -1) as lijevo, i (i)}
      <button
        type="button"
        class="iv-dio"
        class:on={vidljivo.dijelovi[i]}
        style="left: {lijevo}%; width: {granice[i + 1] - lijevo}%"
        aria-pressed={vidljivo.dijelovi[i]}
        aria-label="Dio pravca {opisDijela(i)}"
        disabled={zakljucano}
        onclick={() => dio(i)}
      >
        <span class="iv-traka" class:lijevi={i === 0} class:desni={i === n}></span>
      </button>
    {/each}
    {#each tocke as t, i (i)}
      <button
        type="button"
        class="iv-tocka"
        class:on={vidljivo.tocke[i]}
        style="left: {poz(i)}%"
        aria-pressed={vidljivo.tocke[i]}
        aria-label="Točka {t.tex}: {vidljivo.tocke[i] ? 'uključena' : 'nije uključena'}"
        disabled={zakljucano}
        onclick={() => tocka(i)}
      ></button>
      <span class="iv-oznaka" style="left: {poz(i)}%"><Md text={`$${t.tex}$`} inline /></span>
    {/each}
  </div>
  <p class="iv-zapis" aria-live="polite">
    {#if nista && !prikaz && !pokazi}
      <span class="iv-dim">Ništa nije označeno</span> <Md text="$= \emptyset$" inline />
    {:else}
      <Md text={`$x \\in ${zapis}$`} inline />
    {/if}
  </p>
</div>

{#if !prikaz}
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={zakljucano} onclick={() => onodgovor($state.snapshot(odabir))}>Provjeri</button>
  </div>
{/if}

<style>
  .iv {
    max-width: 520px;
    margin: 6px auto 0;
    padding: 10px 6px 6px;
    border-radius: var(--r-lg);
  }
  .iv-pravac {
    position: relative;
    height: 74px;
  }
  .iv-linija {
    position: absolute;
    left: 0;
    right: 10px;
    top: 30px;
    height: 2px;
    background: var(--text-dim);
  }
  .iv-strelica {
    position: absolute;
    right: 0;
    top: 25px;
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-left: 11px solid var(--text-dim);
  }
  .iv-dio {
    position: absolute;
    top: 8px;
    height: 46px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  .iv-dio:disabled {
    cursor: default;
  }
  .iv-dio:hover:not(:disabled) .iv-traka {
    background: color-mix(in srgb, var(--primary) 18%, transparent);
  }
  .iv-traka {
    position: absolute;
    left: 10px;
    right: 10px;
    top: 16px;
    height: 12px;
    border-radius: 6px;
    background: transparent;
    transition: background 0.12s;
  }
  .iv-traka.lijevi {
    left: 0;
  }
  .iv-traka.desni {
    right: 12px;
  }
  .iv-dio.on .iv-traka,
  .iv-dio.on:hover:not(:disabled) .iv-traka {
    background: var(--primary);
  }
  .iv.ok .iv-dio.on .iv-traka {
    background: var(--success);
  }
  .iv-tocka {
    position: absolute;
    top: 21px;
    width: 20px;
    height: 20px;
    margin-left: -10px;
    padding: 0;
    border: 2.5px solid var(--text);
    border-radius: 50%;
    background: var(--bg-elev);
    cursor: pointer;
    z-index: 1;
  }
  .iv-tocka.on {
    background: var(--text);
  }
  .iv-tocka:disabled {
    cursor: default;
  }
  .iv-tocka:hover:not(:disabled) {
    border-color: var(--primary);
  }
  .iv-oznaka {
    position: absolute;
    top: 48px;
    transform: translateX(-50%);
    font-size: 14px;
    white-space: nowrap;
  }
  .iv-zapis {
    margin: 4px 0 0;
    text-align: center;
    font-size: 17px;
  }
  .iv-dim {
    font-size: 13px;
    color: var(--text-faint);
  }
</style>
