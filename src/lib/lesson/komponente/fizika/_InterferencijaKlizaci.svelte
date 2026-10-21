<script>
  // Klizači widgeta „interferencija“: oznake i jedinice dolaze iz kataloga, a uz klizač valne duljine je traka
  // spektra (boja svjetlosti se vidi i prije nego što se pomakne).
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    metaKlizaca,
    bojaCSS,
  } from "$lib/lesson/katalog/fizika/_interferencija.js";

  let { spec, vrijednosti = $bindable({}), disabled = false } = $props();
  const uid = Math.random().toString(36).slice(2, 8);
  const fmt = (k, m) =>
    k.id === "zareza_po_mm"
      ? `${formatNumber(vrijednosti[k.id])} /mm`
      : `${formatNumber(vrijednosti[k.id])}${m.jedinica ? `\u00a0${m.jedinica}` : ""}`;
  // traka spektra za raspon klizača λ
  const spektar = (k) => {
    const st = [];
    for (let i = 0; i <= 12; i++) {
      const nm = k.min + ((k.max - k.min) * i) / 12;
      st.push(`${bojaCSS(nm)} ${((100 * i) / 12).toFixed(1)}%`);
    }
    return `linear-gradient(90deg, ${st.join(", ")})`;
  };
</script>

{#if spec.klizaci?.length}
  <div class="ifk">
    {#each spec.klizaci as k (k.id)}
      {@const m = metaKlizaca(spec, k.id)}
      <div class="ifk-row">
        <div class="ifk-head">
          <label for="ifk-{uid}-{k.id}">{m.oznaka}</label>
          <output for="ifk-{uid}-{k.id}" class="ifk-val">
            {#if k.id === "lambda"}<span
                class="ifk-boja"
                style:background={bojaCSS(vrijednosti.lambda)}
              ></span>{/if}{fmt(k, m)}</output
          >
        </div>
        <input
          id="ifk-{uid}-{k.id}"
          type="range"
          min={k.min}
          max={k.max}
          step={k.korak}
          {disabled}
          value={vrijednosti[k.id]}
          aria-valuetext={fmt(k, m)}
          style:accent-color={k.id === "lambda"
            ? bojaCSS(vrijednosti.lambda)
            : null}
          oninput={(e) =>
            (vrijednosti = {
              ...vrijednosti,
              [k.id]: Math.round(Number(e.currentTarget.value) * 1e9) / 1e9,
            })}
        />
        {#if k.id === "lambda"}
          <div
            class="ifk-spektar"
            style:background={spektar(k)}
            aria-hidden="true"
          ></div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .ifk {
    display: grid;
    gap: 10px;
    max-width: 440px;
    margin: 0 auto 12px;
  }
  .ifk-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 2px;
    font-size: 14px;
  }
  .ifk-head label {
    color: var(--text-dim);
  }
  .ifk-val {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }
  .ifk-boja {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    box-shadow: 0 0 0 1px var(--border-strong);
  }
  input[type="range"] {
    width: 100%;
    margin: 0;
    height: 30px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  input[type="range"]:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .ifk-spektar {
    height: 5px;
    margin: -4px 2px 0;
    border-radius: 3px;
    opacity: 0.85;
  }
</style>
