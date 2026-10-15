<script>
  // Račun koji se otkriva redak po redak: učenik sam traži sljedeći korak, pa stigne pratiti svaki.
  import Md from "./Md.svelte";

  let { spec } = $props();
  let shown = $state(1);
</script>

{#if spec.uvod}<Md text={spec.uvod} />{/if}
<ol class="lx-steps">
  {#each spec.koraci.slice(0, shown) as k, i (i)}
    <li>
      <Md text={`$$${k.racun}$$`} />
      {#if k.napomena}<div class="lx-step-note"><Md text={k.napomena} inline /></div>{/if}
    </li>
  {/each}
</ol>
{#if shown < spec.koraci.length}
  <button class="btn btn-ghost" onclick={() => shown++}>Prikaži sljedeći redak ({shown}/{spec.koraci.length})</button>
{/if}

<style>
  .lx-steps {
    list-style: none;
    margin: 8px 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .lx-steps li {
    padding: 6px 12px;
    border-left: 2px solid var(--border-strong);
  }
  .lx-step-note {
    font-size: 13px;
    color: var(--text-dim);
    margin-top: -4px;
  }
</style>
