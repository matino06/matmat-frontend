<script>
  // Elektromagnetski val: tri scene (polja u prostoru, spektar, svjetlost u sredstvu). Fizika, geometrija i ono što je
  // skriveno dolaze iz katalog/fizika/em_val.js; scene samo crtaju i prosljeđuju unos.
  import Md from "../Md.svelte";
  import Polja from "./_EmValPolja.svelte";
  import Spektar from "./_EmValSpektar.svelte";
  import Sredstvo from "./_EmValSredstvo.svelte";
  import { jeGledanje } from "$lib/lesson/katalog/fizika/em_val.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();
</script>

{#if jeGledanje(spec)}
  <div class="ev-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<div class="ev">
  {#if spec.scena === "polja"}
    <Polja {spec} {locked} {pokazi} {ishod} {onodgovor} />
  {:else if spec.scena === "spektar"}
    <Spektar {spec} {locked} {pokazi} {ishod} {onodgovor} />
  {:else if spec.scena === "sredstvo"}
    <Sredstvo {spec} {locked} {pokazi} {ishod} {onodgovor} />
  {/if}
</div>

<style>
  /* zajedničko svim trima scenama */
  .ev-tekst {
    margin-bottom: 10px;
  }
  .ev {
    --ev-E: #dc2626;
    --ev-B: #2563eb;
  }
  :global(html[data-theme="dark"]) .ev {
    --ev-E: #f87171;
    --ev-B: #60a5fa;
  }
  .ev :global(.ev-kontrole) {
    display: grid;
    gap: 10px;
    max-width: 440px;
    margin: 0 auto 8px;
  }
  .ev :global(.ev-red) {
    display: grid;
    gap: 4px;
  }
  .ev :global(.ev-red-oznaka) {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .ev :global(.ev-chips) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ev :global(.ev-chip) {
    min-height: 36px;
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13.5px;
  }
  .ev :global(.ev-chip:hover) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .ev :global(.ev-chip.on) {
    border-color: var(--primary);
    background: var(--primary-dim);
    font-weight: 600;
  }
  .ev :global(.ev-uputa) {
    font-size: 13.5px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 8px;
  }
  .ev :global(.ev-zakljucak) {
    font-size: 13.5px;
    color: var(--text-dim);
    text-align: center;
    margin: 8px auto 0;
    max-width: 440px;
    line-height: 1.5;
  }
  .ev :global(.ev-zakljucak b) {
    color: var(--text);
  }
  .ev :global(.ev-zakljucak.ev-ok) {
    color: var(--text);
    padding: 8px 12px;
    border-radius: var(--r-lg);
    background: color-mix(in srgb, var(--success) 10%, transparent);
  }
</style>
