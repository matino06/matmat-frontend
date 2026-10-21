<script>
  // Brojčana polja za „izracunaj“ (valne_fronte): oznaka, polje, jedinica; jedan gumb Provjeri za sva polja.
  // Polja se označe (zeleno) tek nakon točnog odgovora; nakon krivog nijedno polje ne dobiva zeleno/crveno jer bi
  // odalo koje je polje krivo (zaključana kopija pitanja ostaje vidljiva iznad koraka pomoći), samo poruka.
  import Md from "../Md.svelte";

  let {
    polja = [], // [{oznaka, jedinica}]
    locked = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let unosi = $state(polja.map(() => ""));
  let poslano = $state(null);
  let potpuno = $derived(unosi.every((v) => v.trim()));
  let neprom = $derived(
    poslano != null && poslano.every((v, i) => v === unosi[i]),
  );
  const uid = Math.random().toString(36).slice(2, 8);

  function predaj(e) {
    e?.preventDefault();
    if (locked || !potpuno) return;
    poslano = [...unosi];
    onodgovor([...unosi]);
  }
  let dobro = $derived(neprom && !!ishod?.tocno);
</script>

<form class="fp" onsubmit={predaj}>
  {#each polja as p, i (i)}
    <div class="fp-red">
      <label class="fp-oznaka" for="fp-{uid}-{i}">
        {#if p.oznaka}<Md text={p.oznaka} inline />{:else}{i + 1}.{/if}
      </label>
      <input
        id="fp-{uid}-{i}"
        class="inp lx-broj-inp"
        class:ok={dobro}
        inputmode="decimal"
        autocomplete="off"
        placeholder="?"
        disabled={locked}
        bind:value={unosi[i]}
      />
      <span class="lx-unit fp-jed">{p.jedinica ?? ""}</span>
    </div>
  {/each}
  <div class="lx-actions fp-akcije">
    <button class="btn btn-primary" type="submit" disabled={locked || !potpuno}
      >Provjeri</button
    >
  </div>
</form>

<style>
  .fp {
    display: grid;
    gap: 8px;
    max-width: 420px;
    margin: 0 auto;
  }
  .fp-red {
    display: grid;
    grid-template-columns: minmax(64px, auto) 1fr 34px;
    align-items: center;
    gap: 8px;
  }
  .fp-oznaka {
    text-align: right;
    white-space: nowrap;
    color: var(--text);
  }
  .fp-red .lx-broj-inp {
    width: 100%;
    max-width: 150px;
  }
  .fp-jed {
    white-space: nowrap;
  }
  .fp-akcije {
    margin-top: 6px;
    justify-content: center;
  }
</style>
