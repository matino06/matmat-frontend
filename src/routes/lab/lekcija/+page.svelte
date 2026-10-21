<script>
  // Pregled generiranih interaktivnih lekcija (samo dev): lekcija kako je vidi učenik, izvorni tekst, JSON i nalaz provjere.
  import LessonRunner from "$lib/lesson/LessonRunner.svelte";
  import KatalogPregled from "./KatalogPregled.svelte";
  import { renderMd } from "$lib/utils/markdownRenderer.js";
  import { objasnjenjeOcjene } from "$lib/lesson/ocjena.js";
  import { page } from "$app/state";

  let { data } = $props();

  // ključ lekcije: zadatak (više zadataka iste lekcije plana, npr. matura), inače lekcija plana
  const kljuc = (z) => z.izvor.task_id ?? z.izvor.objective_id;
  // ?z=<task_id> ili ?z=katalog otvara baš to (npr. za snimku zaslona bez klikanja)
  const trazena = page.url.searchParams.get("z");
  // svelte-ignore state_referenced_locally (popis se učita jednom)
  let odabrana = $state(
    trazena === "katalog" ? "katalog" : (kljuc(data.lekcije.find((z) => String(kljuc(z)) === trazena) ?? { izvor: {} }) ?? null) ?? kljuc(data.lekcije.find((z) => z.lekcija && !z.provjera?.greske?.length) ?? data.lekcije[0] ?? { izvor: {} }),
  );
  let pogled = $state("lekcija");
  let z = $derived(data.lekcije.find((x) => kljuc(x) === odabrana));
  let ocjena = $state(null);
  const usd = (x) => `$${(x ?? 0).toFixed(3)}`;
</script>

<!-- objašnjenje izvornog zadatka, kao na /tasks: „Cijelo rješenje“ lekcije koja počinje cijelim zadatkom -->
{#snippet labRjesenje()}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown iz vlastitog renderera, kao kod zadataka -->
  <div class="lx-md">{@html renderMd(z.izvor.explanation)}</div>
{/snippet}

<svelte:head><title>Lab · interaktivne lekcije</title></svelte:head>

<div class="page lab">
  <header class="lab-head">
    <h1>Interaktivne lekcije <span class="badge">lab · samo dev</span></h1>
    {#if data.lekcije.length}
      <p class="muted">
        {[...new Set(data.lekcije.map((x) => `${x.model} (${x.effort})`))].join(", ")} · {data.lekcije.length} lekcija · prolazi {data.lekcije.filter((x) => x.lekcija && !x.provjera?.greske?.length).length}
        · prosjek {usd(data.lekcije.reduce((s, x) => s + (x.trosak?.usd ?? 0), 0) / Math.max(1, data.lekcije.length))}
      </p>
    {/if}
  </header>

  {#if !data.lekcije.length}
    <p class="muted">Nema lekcija u <code>lab-out/lekcije/</code>. Pokreni <code>node scripts/lab/generiraj-lekcije.mjs</code>.</p>
  {:else}
    <div class="lab-grid">
      <nav class="joined-list lab-list">
        <button class="lab-item" class:on={odabrana === "katalog"} onclick={() => (odabrana = "katalog")}>
          <span class="lab-item-name">📚 Katalog widgeta</span>
        </button>
        {#each data.lekcije as x (kljuc(x))}
          <button class="lab-item" class:on={kljuc(x) === odabrana} onclick={() => ((odabrana = kljuc(x)), (ocjena = null))}>
            <span class="status-dot" class:done={x.lekcija && !x.provjera?.greske?.length} class:bad={!x.lekcija || x.provjera?.greske?.length}></span>
            <span class="lab-item-name">{x.izvor.task_id ? `#${x.izvor.task_id} ` : ""}{x.izvor.objective_name}</span>
            <span class="lab-item-meta mono">{usd(x.trosak?.usd)}</span>
          </button>
        {/each}
      </nav>

      <main class="lab-main">
        {#if odabrana === "katalog"}
          <KatalogPregled />
        {:else if z}
          <div class="lab-tabs seg">
            {#each [["lekcija", "Lekcija"], ["izvor", "Izvorni tekst"], ["provjera", `Provjera${z.provjera?.greske?.length ? ` (${z.provjera.greske.length})` : ""}`], ["json", "JSON"]] as [id, label] (id)}
              <button class="seg-item" class:active={pogled === id} onclick={() => (pogled = id)}>{label}</button>
            {/each}
          </div>
          <p class="muted small">
            {z.model} · {usd(z.trosak?.usd)} · ulaz {z.trosak?.ulaz} tok. (keš {z.trosak?.kes}) · izlaz {z.trosak?.izlaz} tok. · {z.sekundi}s · {z.znakova} znakova{z.popravljeno ? " · popravljeno jednom" : ""}
          </p>

          {#if pogled === "lekcija"}
            {#if z.lekcija && !z.provjera?.greske?.length}
              <!-- isti omot kao na /tasks, da se vidi stvarni izgled lekcije u aplikaciji -->
              <article class="card task-card">
                <div class="task-meta">
                  <span class="badge mono">#{z.izvor.task_id ?? "—"}</span>
                  <span class="badge badge-dim">{z.izvor.course_name ?? "Lab"}</span>
                </div>
                {#key odabrana}<LessonRunner lekcija={z.lekcija} onzavrsi={(s) => (ocjena = s)} rjesenje={z.izvor.explanation ? labRjesenje : null} />{/key}
              </article>
              {#if ocjena}<p class="muted small">Prijedlog ocjene za ponavljanje: q = {ocjena.q} (najviše {ocjena.najvise}). {objasnjenjeOcjene(ocjena)}</p>{/if}
            {:else}
              <p class="muted">Lekcija nije prošla provjeru, pa se ne prikazuje. Pogledaj karticu Provjera.</p>
            {/if}
          {:else if pogled === "izvor"}
            <article class="card card-pad lab-source">
              <h3>Zadatak</h3>
              <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown iz vlastitog renderera, kao kod zadataka -->
              {@html renderMd(z.izvor.task_text)}
              <h3>Objašnjenje</h3>
              <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown iz vlastitog renderera, kao kod zadataka -->
              {@html renderMd(z.izvor.explanation)}
              <h3>Rezultati</h3>
              <pre>{z.izvor.results}</pre>
            </article>
          {:else if pogled === "provjera"}
            <div class="card card-pad">
              <h3>Greške</h3>
              {#if z.provjera?.greske?.length}<ul>{#each z.provjera.greske as g, i (i)}<li>{g}</li>{/each}</ul>{:else}<p class="muted">Nema.</p>{/if}
              <h3>Upozorenja</h3>
              {#if z.provjera?.upozorenja?.length}<ul>{#each z.provjera.upozorenja as g, i (i)}<li>{g}</li>{/each}</ul>{:else}<p class="muted">Nema.</p>{/if}
              {#if z.popravljeno}
                <h3>Prva verzija (prije popravka)</h3>
                <ul>{#each z.prvaProvjera?.greske ?? [] as g, i (i)}<li>{g}</li>{/each}</ul>
              {/if}
            </div>
          {:else}
            <pre class="card card-pad lab-json">{JSON.stringify(z.lekcija, null, 2)}</pre>
          {/if}
        {/if}
      </main>
    </div>
  {/if}
</div>

<style>
  .lab-head h1 {
    margin: 0;
    font-size: 22px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .muted {
    color: var(--text-dim);
  }
  .small {
    font-size: 12px;
  }
  .lab-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 20px;
    align-items: start;
    margin-top: 16px;
  }
  @media (max-width: 860px) {
    .lab-grid {
      grid-template-columns: 1fr;
    }
    .lab-list {
      max-height: 220px;
      overflow: auto;
    }
  }
  .lab-list {
    position: sticky;
    top: 16px;
  }
  .lab-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    text-align: left;
    font-size: 13px;
  }
  .lab-item.on {
    background: var(--primary-dim);
  }
  .lab-item-name {
    flex: 1;
  }
  .lab-item-meta {
    font-size: 11px;
    color: var(--text-faint);
  }
  .lab-main {
    min-width: 0;
  }
  .lab-tabs {
    margin-bottom: 6px;
  }
  .lab-json {
    font-size: 12px;
    overflow: auto;
    max-height: 70vh;
    white-space: pre-wrap;
  }
  .lab-source :global(h3) {
    margin: 16px 0 6px;
  }
</style>
