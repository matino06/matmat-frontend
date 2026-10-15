<script>
  // Jedan korak lekcije s oznakom uloge. Uloga se mora vidjeti na prvi pogled: učenica iz 7. razreda mrežu za
  // istraživanje shvatila je kao zadatak. „Pogledaj“ i „Istraži“ su plavi i nikad ne traže odgovor; „Tvoj red“
  // je u boji aplikacije i uvijek ima polje ili izbor za odgovor.
  import { KOMPONENTE } from "./index.js";
  import { uloga, istrazuje, POGLEDAJ } from "../katalog/index.js";
  import Md from "./Md.svelte";

  let { spec, oznaka = null, locked = false, pokazi = false, ishod = null, onodgovor = () => {}, children } = $props();

  let look = $derived(uloga(spec) === POGLEDAJ);
  let explore = $derived(istrazuje(spec));
  let Comp = $derived(KOMPONENTE[spec.tip]);
</script>

<section class="lx-step" class:look class:turn={!look}>
  <div class="lx-step-badge">
    {#if look && explore}
      <span>🔍 Istraži</span><span class="lx-step-sub">nije zadatak, slobodno isprobaj</span>
    {:else if look}
      <span>👀 Pogledaj</span><span class="lx-step-sub">nije zadatak</span>
    {:else}
      <span>✏️ {oznaka ?? "Tvoj red"}</span>
    {/if}
  </div>
  {#if Comp}
    {#if look}
      <Comp {spec} />
    {:else}
      <Comp {spec} {locked} {pokazi} {ishod} {onodgovor} />
    {/if}
  {:else}
    <p class="lx-solution">Nepoznat widget „{spec.tip}“.</p>
  {/if}
  {#if !look && ishod && !ishod.tocno && ishod.poruka}
    <div class="lx-feedback bad" role="status"><Md text={ishod.poruka} /></div>
  {/if}
  {@render children?.()}
</section>

<style>
  .lx-step {
    position: relative;
    padding: var(--pad-4);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    background: var(--bg-elev);
  }
  .lx-step.look {
    border-color: var(--lx-look-border);
    background: color-mix(in srgb, var(--lx-look) 5%, var(--bg-elev));
  }
  .lx-step.turn {
    border-color: var(--primary-border);
  }
  .lx-step-badge {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .look .lx-step-badge {
    color: var(--lx-look);
  }
  .turn .lx-step-badge {
    color: var(--lx-turn);
  }
  .lx-step-sub {
    font-weight: 400;
    color: var(--text-faint);
  }
  .lx-feedback {
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: var(--r-lg);
    font-size: 14px;
  }
  .lx-feedback.bad {
    border: 1px solid color-mix(in srgb, var(--lx-bad) 45%, transparent);
    background: color-mix(in srgb, var(--lx-bad) 8%, transparent);
  }
</style>
