<script>
  // Jedan korak lekcije s oznakom uloge. Uloga se mora vidjeti na prvi pogled: učenica iz 7. razreda mrežu za
  // istraživanje shvatila je kao zadatak. „Pogledaj“ i „Istraži“ su plavi i nikad ne traže odgovor; „Tvoj red“
  // je u boji aplikacije i uvijek ima polje ili izbor za odgovor.
  import { KOMPONENTE } from "./index.js";
  import { uloga, istrazuje, POGLEDAJ } from "../katalog/index.js";
  import Md from "./Md.svelte";
  import { playSound } from "$lib/sound.svelte.js";

  let { spec, oznaka = null, locked = false, pokazi = false, ishod = null, onodgovor = () => {}, children } = $props();

  let look = $derived(uloga(spec) === POGLEDAJ);
  let explore = $derived(istrazuje(spec));
  let Comp = $derived(KOMPONENTE[spec.tip]);

  // Every check in a lesson (first question, a help "Tvoj red" step, the twin, "Vježbaj još") passes through here,
  // so this is the one place that plays the correct-answer sound. The parent grades synchronously, so the new
  // result is already visible through the prop once onodgovor returns.
  function odgovor(o) {
    const prije = ishod;
    onodgovor(o);
    if (ishod !== prije && ishod?.tocno) playSound("correct");
  }
</script>

<section class="lx-step" class:look class:turn={!look} class:locked={!look && locked}>
  <div class="lx-step-badge">
    <svg class="lx-step-ico" viewBox="0 0 16 16" aria-hidden="true">
      {#if look && explore}
        <path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7" /><circle cx="10.5" cy="4.5" r="1.5" /><circle cx="5.5" cy="11.5" r="1.5" />
      {:else if look}
        <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2" />
      {:else}
        <path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5Z" />
      {/if}
    </svg>
    {#if look && explore}
      <span>Istraži</span><span class="lx-step-sub">nije zadatak, slobodno isprobaj</span>
    {:else if look}
      <span>Pogledaj</span><span class="lx-step-sub">nije zadatak</span>
    {:else}
      <span>{oznaka ?? "Tvoj red"}</span>
    {/if}
  </div>
  {#if Comp}
    {#if look}
      <Comp {spec} />
    {:else}
      <Comp {spec} {locked} {pokazi} {ishod} onodgovor={odgovor} />
    {/if}
  {:else}
    <p class="lx-solution">Nepoznat widget „{spec.tip}“.</p>
  {/if}
  {#if !look && ishod && !ishod.tocno && ishod.poruka}
    <div class="lx-feedback bad" role="status">
      <svg class="lx-feedback-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
      <Md text={ishod.poruka} />
    </div>
  {/if}
  {@render children?.()}
</section>

<style>
  .lx-step {
    position: relative;
    padding: var(--pad-4);
    border-radius: var(--r-xl);
  }
  /* „Tvoj red“: jedini okvir u lekciji, u boji aplikacije */
  .lx-step.turn {
    border: 1px solid var(--primary-border);
    background: var(--bg-elev);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 6%, transparent);
  }
  /* odgovoreno pitanje se utiša, pa pogled ide na sljedeći korak */
  .lx-step.turn.locked {
    border-color: var(--border);
    box-shadow: none;
  }
  .lx-step.turn.locked .lx-step-badge {
    color: var(--text-dim);
  }
  /* „Pogledaj / Istraži“: umetnuti panel bez okvira, nikad ne izgleda kao pitanje */
  .lx-step.look {
    border: 1px solid transparent;
    background: var(--lx-look-bg);
  }
  .lx-step-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    font-size: 12.5px;
    font-weight: 600;
  }
  .lx-step-ico {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .look .lx-step-badge {
    color: var(--lx-look);
  }
  .turn .lx-step-badge {
    color: var(--lx-turn);
  }
  .lx-step-sub {
    margin-left: 2px;
    font-weight: 400;
    color: var(--text-faint);
  }
  .lx-feedback {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    font-size: 14px;
  }
  .lx-feedback.bad {
    background: color-mix(in srgb, var(--lx-bad) 10%, transparent);
    color: var(--text);
  }
  .lx-feedback-ico {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    flex-shrink: 0;
    fill: none;
    stroke: var(--lx-bad);
    stroke-width: 2;
    stroke-linecap: round;
  }
  @media (max-width: 767px) {
    .lx-step {
      padding: var(--pad-3);
    }
  }
</style>
