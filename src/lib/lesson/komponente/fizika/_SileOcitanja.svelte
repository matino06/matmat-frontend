<script>
  // Uživo očitanja veličina scene (skupina „sile“). Stavka: {kljuc, oznaka ("F_g"), tekst ("350 N"), naziv?, boja?,
  // skriveno? (ciljana veličina u „postavi“ prije provjere), status? ("ok" | "bad")}.
  import { rastaviOznaku } from "$lib/lesson/katalog/fizika/_sile.js";

  let { stavke = [] } = $props();
</script>

{#if stavke.length}
  <div class="so" aria-live="polite">
    {#each stavke as s (s.kljuc)}
      {@const o = rastaviOznaku(s.oznaka)}
      <div
        class="so-item"
        class:ok={s.status === "ok"}
        class:bad={s.status === "bad"}
        title={s.naziv ?? ""}
      >
        <span class="so-ozn" style:color={s.skriveno ? null : (s.boja ?? null)}>
          {#if s.boja && !s.skriveno}<span
              class="so-swatch"
              style:background={s.boja}
            ></span>{/if}
          <i>{o.osnova}</i>{#if o.indeks}<sub>{o.indeks}</sub>{/if}
        </span>
        <span class="so-val">{s.skriveno ? "?" : s.tekst}</span>
        {#if s.naziv}<span class="so-naziv">{s.naziv}</span>{/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .so {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 auto 12px;
    max-width: 520px;
  }
  .so-item {
    display: grid;
    grid-template-columns: auto auto;
    align-items: baseline;
    column-gap: 8px;
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .so-item.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 10%, var(--bg-elev));
  }
  .so-item.bad {
    border-color: var(--danger);
  }
  .so-ozn {
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
    font-size: 15px;
    color: var(--text-dim);
  }
  .so-ozn i {
    font-weight: 600;
  }
  .so-ozn sub {
    font-size: 10.5px;
  }
  .so-swatch {
    width: 10px;
    height: 3px;
    border-radius: 2px;
    margin-right: 5px;
    align-self: center;
  }
  .so-val {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }
  .so-naziv {
    grid-column: 1 / -1;
    font-size: 11.5px;
    color: var(--text-faint);
    line-height: 1.3;
  }
</style>
