<script>
  // Polje za broj s jedinicom i gumbom Provjeri; dijele ga svi widgeti s brojčanim odgovorom.
  let { jedinica = "", locked = false, ishod = null, vrijednost = $bindable(""), onodgovor, oznaka = "Odgovor" } = $props();

  function submit(e) {
    e.preventDefault();
    if (!locked && vrijednost.trim()) onodgovor(vrijednost);
  }
</script>

<form class="lx-broj" onsubmit={submit}>
  <input
    class="inp lx-broj-inp"
    class:ok={ishod?.tocno}
    class:bad={ishod && !ishod.tocno && !ishod.prazno}
    inputmode="decimal"
    autocomplete="off"
    aria-label={oznaka}
    placeholder="?"
    disabled={locked}
    bind:value={vrijednost}
  />
  {#if jedinica}<span class="lx-unit">{jedinica}</span>{/if}
  <button class="btn btn-primary" type="submit" disabled={locked || !vrijednost.trim()}>Provjeri</button>
</form>
