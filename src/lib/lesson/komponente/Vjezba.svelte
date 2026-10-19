<script>
  // „Vježbaj još“ na kraju lekcije: zadaci pretvorbe koje sastavlja kod (katalog/vjezba.js), jedan po jedan.
  // Neobavezno i izvan ocjene: krivi odgovor dobije poruku za tu grešku, a nakon dva kriva pokaže se točan.
  import Korak from "./Korak.svelte";
  import { generirajVjezbu } from "../katalog/vjezba.js";
  import { provjeri } from "../katalog/index.js";

  let { vjezba } = $props();

  const MAX_POKUSAJA = 2;
  // nasumično početno sjeme: inače svako otvaranje lekcije, i svaka lekcija s istim jedinicama (varijacije),
  // počinje istim zadacima
  let sjeme = $state(1 + Math.floor(Math.random() * 1e9));
  let zadaci = $derived(generirajVjezbu(vjezba, sjeme));
  let i = $state(0);
  let ishod = $state(null);
  let pokusaji = $state(0);
  let pokazi = $state(false);
  let tocnih = $state(0);

  let gotov = $derived(ishod?.tocno || pokazi);

  function odgovor(o) {
    const r = provjeri(zadaci[i], o);
    ishod = r;
    if (r.prazno || r.tocno) {
      if (r.tocno) tocnih++;
      return;
    }
    if (++pokusaji >= MAX_POKUSAJA) pokazi = true;
  }

  function dalje() {
    i++;
    ishod = null;
    pokusaji = 0;
    pokazi = false;
  }

  function nova() {
    sjeme++;
    i = 0;
    ishod = null;
    pokusaji = 0;
    pokazi = false;
    tocnih = 0;
  }
</script>

<section class="vj" aria-labelledby="vj-naslov">
  <div class="vj-head">
    <h3 class="vj-title" id="vj-naslov">Vježbaj još</h3>
    <span class="vj-sub">neobavezno, ne ulazi u ocjenu</span>
  </div>
  {#if vjezba.tekst}<p class="vj-tekst">{vjezba.tekst}</p>{/if}

  {#if i < zadaci.length}
    {#key `${sjeme}-${i}`}
      <Korak spec={zadaci[i]} oznaka={`Pretvorba ${i + 1} od ${zadaci.length}`} locked={gotov} {pokazi} {ishod} onodgovor={odgovor}>
        <div class="lx-actions">
          {#if gotov}
            <button class="btn btn-primary" onclick={dalje}>{i < zadaci.length - 1 ? "Sljedeća" : "Gotovo"}</button>
          {:else if pokusaji > 0}
            <button class="btn btn-quiet" onclick={() => (pokazi = true)}>Pokaži točan odgovor</button>
          {/if}
        </div>
      </Korak>
    {/key}
  {:else}
    <div class="vj-kraj">
      <p>Točno iz prve ili druge: <b>{tocnih} od {zadaci.length}</b></p>
      <button class="btn btn-ghost" onclick={nova}>Nova vježba</button>
    </div>
  {/if}
</section>

<style>
  .vj {
    display: grid;
    gap: 10px;
    margin-top: 6px;
  }
  .vj-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 10px;
  }
  .vj-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  .vj-sub,
  .vj-tekst {
    color: var(--text-faint);
    font-size: 13px;
  }
  .vj-tekst {
    margin: 0;
  }
  .vj-kraj {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 18px;
    border-radius: var(--r-lg);
    background: var(--bg-elev-2);
  }
  .vj-kraj p {
    margin: 0;
  }
</style>
