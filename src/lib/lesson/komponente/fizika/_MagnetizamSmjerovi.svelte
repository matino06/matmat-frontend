<script>
  // Ploča za odgovor magnetskih widgeta: smjer (↑ ↓ ← → u ravnini papira, ⊙ iz papira, ⊗ u papir, po želji 0) ili
  // kruženje struje (↻ u smjeru kazaljke, ↺ suprotno, po želji „nema struje“). Odabrano se odmah crta u sceni.
  let {
    vrsta = "smjer",
    vrijednost = $bindable(null),
    nula = null,
    nema = false,
    disabled = false,
    status = "",
    oznaka = "Odaberi smjer",
    kompaktno = false,
    onodabir = () => {},
  } = $props();

  const KRIZ = [
    [null, "gore", null],
    ["lijevo", "nula", "desno"],
    [null, "dolje", null],
  ];
  const ARIA = {
    gore: "gore",
    dolje: "dolje",
    lijevo: "lijevo",
    desno: "desno",
    iz_papira: "iz papira",
    u_papir: "u papir",
    nula: "nula",
    kazaljka: "u smjeru kazaljke na satu",
    suprotno: "suprotno od kazaljke na satu",
    nema: "nema struje",
  };
  const ROT = { gore: 0, desno: 90, dolje: 180, lijevo: 270 };

  function odaberi(o) {
    if (disabled) return;
    vrijednost = o;
    onodabir(o);
  }
  const klasa = (o) => (vrijednost === o ? `sel ${status}` : "");
</script>

{#snippet ikona(o)}
  <svg class="mg-ik" viewBox="0 0 24 24" aria-hidden="true">
    {#if o in ROT}
      <g transform="rotate({ROT[o]} 12 12)"
        ><path d="M12 20V5M6 10.5 12 4.5l6 6" /></g
      >
    {:else if o === "iz_papira"}
      <circle cx="12" cy="12" r="8" /><circle
        cx="12"
        cy="12"
        r="2.4"
        class="pun"
      />
    {:else if o === "u_papir"}
      <circle cx="12" cy="12" r="8" /><path
        d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6"
      />
    {:else if o === "kazaljka"}
      <path d="M19 12a7 7 0 1 1-2.05-4.95" /><path
        d="M17.6 3.2l-.4 4.3-4.3-.4"
      />
    {:else if o === "suprotno"}
      <path d="M5 12a7 7 0 1 0 2.05-4.95" /><path d="M6.4 3.2l.4 4.3 4.3-.4" />
    {:else if o === "nula" || o === "nema"}
      <text x="12" y="17" text-anchor="middle" class="nula">0</text>
    {/if}
  </svg>
{/snippet}

{#if vrsta === "kruzenje"}
  <div class="mg-krug" class:kompaktno role="group" aria-label={oznaka}>
    {#each ["kazaljka", "suprotno", ...(nema ? ["nema"] : [])] as o (o)}
      <button
        type="button"
        class="mg-gumb {klasa(o)}"
        class:stup={!kompaktno}
        aria-pressed={vrijednost === o}
        aria-label={ARIA[o]}
        title={ARIA[o]}
        {disabled}
        onclick={() => odaberi(o)}
      >
        {@render ikona(o)}
        {#if !kompaktno}<span class="mg-gumb-txt"
            >{o === "kazaljka"
              ? "u smjeru kazaljke"
              : o === "suprotno"
                ? "suprotno od kazaljke"
                : "struja ne teče"}</span
          >{/if}
      </button>
    {/each}
  </div>
{:else}
  <div class="mg-ploca" role="group" aria-label={oznaka}>
    <div class="mg-kriz">
      {#each KRIZ as red, i (i)}
        {#each red as o, j (j)}
          {#if o === "nula" && nula}
            <button
              type="button"
              class="mg-gumb {klasa(o)}"
              aria-pressed={vrijednost === o}
              aria-label={nula}
              title={nula}
              {disabled}
              onclick={() => odaberi(o)}>{@render ikona(o)}</button
            >
          {:else if o && o !== "nula"}
            <button
              type="button"
              class="mg-gumb {klasa(o)}"
              aria-pressed={vrijednost === o}
              aria-label={ARIA[o]}
              {disabled}
              onclick={() => odaberi(o)}>{@render ikona(o)}</button
            >
          {:else}
            <span class="mg-prazno"></span>
          {/if}
        {/each}
      {/each}
    </div>
    <div class="mg-okomito">
      {#each ["iz_papira", "u_papir"] as o (o)}
        <button
          type="button"
          class="mg-gumb siroki {klasa(o)}"
          aria-pressed={vrijednost === o}
          aria-label={ARIA[o]}
          {disabled}
          onclick={() => odaberi(o)}
        >
          {@render ikona(o)}<span class="mg-gumb-txt">{ARIA[o]}</span>
        </button>
      {/each}
      {#if nula}<span class="mg-nula-txt">0 = {nula}</span>{/if}
    </div>
  </div>
{/if}

<style>
  .mg-ploca {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .mg-kriz {
    display: grid;
    grid-template-columns: repeat(3, 46px);
    grid-template-rows: repeat(3, 46px);
    gap: 5px;
  }
  .mg-okomito {
    display: grid;
    gap: 6px;
  }
  .mg-krug:not(.kompaktno) {
    flex-wrap: nowrap;
    max-width: 440px;
    margin: 0 auto;
  }
  .mg-gumb.stup {
    flex: 1 1 0;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
    padding: 8px 6px;
    text-align: center;
  }
  .mg-gumb.stup .mg-gumb-txt {
    font-size: 12.5px;
    line-height: 1.25;
  }
  .mg-krug.kompaktno {
    flex-wrap: nowrap;
    gap: 5px;
  }
  .mg-krug {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .mg-gumb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 46px;
    min-height: 46px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    cursor: pointer;
    transition:
      border-color 0.12s,
      background 0.12s;
  }
  .mg-gumb.siroki {
    justify-content: flex-start;
    padding: 0 14px 0 10px;
  }
  .mg-gumb:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .mg-gumb.sel {
    border-color: var(--primary);
    background: var(--primary-dim);
    box-shadow: 0 0 0 1px var(--primary);
  }
  .mg-gumb.sel.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
    box-shadow: 0 0 0 1px var(--success);
  }
  .mg-gumb.sel.bad {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    box-shadow: 0 0 0 1px var(--danger);
  }
  .mg-gumb:disabled {
    cursor: default;
  }
  .mg-gumb:disabled:not(.sel) {
    opacity: 0.55;
  }
  .mg-gumb-txt {
    font-size: 13.5px;
  }
  .mg-nula-txt {
    font-size: 12px;
    color: var(--text-faint);
    text-align: center;
  }
  .mg-ik {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .mg-ik .pun {
    fill: currentColor;
    stroke: none;
  }
  .mg-ik .nula {
    fill: currentColor;
    stroke: none;
    font: 700 15px var(--font-mono);
  }
</style>
