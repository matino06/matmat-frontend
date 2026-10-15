<script>
  // Klizači i rezultat koji se računa uživo. Samo korak za gledanje: ništa se ne provjerava.
  // Izraz iz speca računa siguran kalkulator (core/expr.js), nikad eval.
  import Md from "./Md.svelte";
  import { compile } from "../core/expr.js";
  import { formatNumber } from "../core/number.js";

  let { spec } = $props();

  const uid = Math.random().toString(36).slice(2, 8);

  function pocetak() {
    return Object.fromEntries(spec.klizaci.map((k) => [k.id, k.pocetak]));
  }
  let vrijednosti = $state(pocetak());

  const izrazi = $derived(
    spec.izrazi.map((iz) => {
      try {
        return { ...iz, fn: compile(iz.izraz).fn };
      } catch {
        return { ...iz, fn: null };
      }
    }),
  );

  // Dijeljenje nulom (ili izraz koji se ne da izračunati) prikazuje crticu umjesto „Infinity“ ili „NaN“.
  function izracun(iz) {
    if (!iz.fn) return "—";
    let v;
    try {
      v = iz.fn(vrijednosti);
    } catch {
      return "—";
    }
    return Number.isFinite(v) ? formatNumber(v, iz.decimale ?? 2) : "—";
  }
</script>

<Md text={spec.tekst} />
<p class="kl-hint">Pomiči klizače – ovo nije zadatak, samo istražuješ.</p>

<div class="kl">
  {#each spec.klizaci as k (k.id)}
    <div class="kl-row">
      <div class="kl-head">
        <label for="kl-{uid}-{k.id}"><Md text={k.oznaka} inline /></label>
        <output for="kl-{uid}-{k.id}" class="kl-val">{formatNumber(vrijednosti[k.id])}{k.jedinica ? ` ${k.jedinica}` : ""}</output>
      </div>
      <input id="kl-{uid}-{k.id}" type="range" min={k.min} max={k.max} step={k.korak} bind:value={vrijednosti[k.id]} />
    </div>
  {/each}

  <div class="kl-results" aria-live="polite">
    {#each izrazi as iz, i (i)}
      <div class="kl-result">
        <span class="kl-res-label"><Md text={iz.oznaka} inline /></span>
        <span class="kl-res-val">{izracun(iz)}{iz.jedinica ? ` ${iz.jedinica}` : ""}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .kl-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--lx-look, var(--text-dim));
  }
  .kl {
    display: grid;
    gap: 14px;
    max-width: 440px;
    margin: 0 auto 4px;
  }
  .kl-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 4px;
  }
  .kl-head label {
    color: var(--text-dim);
  }
  .kl-val {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text);
    white-space: nowrap;
  }
  input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px; /* veća površina za prst */
    accent-color: var(--lx-look, var(--primary));
    cursor: pointer;
  }
  .kl-results {
    display: grid;
    gap: 8px;
    margin-top: 2px;
  }
  .kl-result {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 12px 14px;
    border: 1px solid var(--lx-look-border, var(--border-strong));
    border-radius: var(--r-lg);
    background: var(--lx-look-dim, var(--bg-elev));
  }
  .kl-res-val {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }
</style>
