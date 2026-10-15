<script>
  // Tvrdnja: točno ili netočno.
  import Md from "./Md.svelte";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();
  let picked = $state(null);

  function pick(v) {
    if (locked) return;
    picked = v;
    onodgovor(v);
  }
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
<div class="lx-tf">
  {#each [true, false] as v (v)}
    <button
      class="lx-option"
      class:ok={(picked === v && ishod?.tocno) || (pokazi && spec.tocno === v)}
      class:bad={picked === v && ishod && !ishod.tocno}
      disabled={locked}
      onclick={() => pick(v)}
    >
      {v ? "Točno" : "Netočno"}
    </button>
  {/each}
</div>

<style>
  .lx-tf {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .lx-tf .lx-option {
    justify-content: center;
    font-weight: 500;
  }
</style>
