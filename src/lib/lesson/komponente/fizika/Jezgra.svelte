<script>
  // Atomska jezgra: pet scena (sastav, reakcija, karta nuklida, energija vezanja, krivulja E/A). Sva fizika,
  // geometrija i „što je skriveno“ dolaze iz katalog/fizika/jezgra.js; ovdje se samo bira scena.
  import Sastav from "./_JezgraSastav.svelte";
  import Reakcija from "./_JezgraReakcija.svelte";
  import Karta from "./_JezgraKarta.svelte";
  import Vezanje from "./_JezgraVezanje.svelte";
  import Krivulja from "./_JezgraKrivulja.svelte";

  let props = $props();
  const SCENE = {
    sastav: Sastav,
    reakcija: Reakcija,
    karta: Karta,
    vezanje: Vezanje,
    krivulja: Krivulja,
  };
  let Scena = $derived(SCENE[props.spec.scena]);
</script>

{#if Scena}
  <Scena {...props} />
{:else}
  <p class="lx-solution">Nepoznata scena „{props.spec.scena}“.</p>
{/if}
