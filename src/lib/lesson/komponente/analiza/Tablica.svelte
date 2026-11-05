<script>
  // Tablica (istinitosti, predznaka derivacije, vrijednosti): ćelije s izborom mijenjaju se dodirom (T → F → …), a u
  // ostale se upisuje broj ili kratak tekst. Nakon provjere krive ćelije su istaknute dok ih učenik ne promijeni.
  // Široka tablica pomiče se vodoravno unutar svog okvira, nikad cijela stranica.
  import Md from "../Md.svelte";
  import { modelTablice, tocnaMatrica, ariaCelije } from "../../katalog/analiza/tablica.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const m = $derived(modelTablice(spec));
  const prikaz = $derived(spec.nacin === "prikaz");
  const zakljucano = $derived(prikaz || locked || pokazi);
  // u „prikaz“ i nakon „Pokaži točan odgovor“ ćelije pokazuju točne vrijednosti
  const tocno = $derived(prikaz || pokazi);

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let unos = $state(tocnaMatrica(modelTablice(spec)).map((r) => r.map((c) => (c == null ? null : ""))));
  let taut = $state(null);
  // odgovor poslan na zadnju provjeru: ćelija je istaknuta kao kriva samo dok je učenik ne promijeni
  let poslano = $state(null);
  let sirinaOkvira = $state(0);
  let sirinaTablice = $state(0);
  const siroka = $derived(sirinaTablice > sirinaOkvira + 1);
  const strelica = (v) => v === "↗" || v === "↘";

  const kljucevi = (l) => new Set((l ?? []).map(([r, k]) => `${r},${k}`));
  const krive = $derived(kljucevi(ishod?.krive));
  const prazne = $derived(kljucevi(ishod?.prazne));
  const imaOpcije = $derived(m.redci.some((r) => r.some((c) => c.upis && c.opcije)));
  const imaUpis = $derived(m.redci.some((r) => r.some((c) => c.upis && !c.opcije)));

  function stanje(r, k) {
    if (tocno) return "pokazano";
    if (ishod?.tocno) return "ok";
    const kljuc = `${r},${k}`;
    if (krive.has(kljuc) && poslano?.celije?.[r]?.[k] === unos[r][k]) return "bad";
    if (prazne.has(kljuc) && !String(unos[r][k] ?? "").trim()) return "prazno";
    return "";
  }
  const vrijednost = (c, r, k) => (tocno ? String(c.prikaz ?? c.odgovor) : (unos[r][k] ?? ""));

  function okreni(r, k) {
    if (zakljucano) return;
    const o = m.redci[r][k].opcije;
    unos[r][k] = o[(o.indexOf(unos[r][k]) + 1) % o.length];
  }

  function provjeri() {
    if (zakljucano) return;
    const celije = $state.snapshot(unos);
    poslano = { celije, taut };
    onodgovor(m.tautologija ? { celije, tautologija: taut } : celije);
  }

  const tautStanje = (v) => {
    if (tocno) return m.tautologija.odgovor === v ? "ok" : "";
    if (taut !== v) return "";
    if (ishod?.tocno) return "ok";
    return ishod?.krivaTautologija && poslano?.taut === v ? "bad" : "sel";
  };
</script>

{#if prikaz}
  <Md text={spec.tekst} />
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
  <p class="lx-hint">
    {#if imaOpcije}Dodiruj ćelije s okvirom: svaki dodir mijenja vrijednost.{/if}
    {#if imaUpis}{imaOpcije ? " " : ""}U prazna polja upiši vrijednost.{/if}
  </p>
{/if}

<!-- svelte-ignore a11y_no_noninteractive_tabindex (okvir se mora moći pomicati tipkovnicom) -->
<div class="tb-okvir" role="region" aria-label="Tablica" tabindex="0" bind:clientWidth={sirinaOkvira}>
  <table class="tb" class:tb-predznak={m.vrsta === "predznak"} bind:offsetWidth={sirinaTablice}>
    {#if m.zaglavlje}
      <thead>
        <tr>
          {#each m.zaglavlje as z, k (k)}
            <th scope="col" class:tb-lijevo={m.oznakaRetka && k === 0}><Md text={z.md} inline /></th>
          {/each}
        </tr>
      </thead>
    {/if}
    <tbody>
      {#each m.redci as red, r (r)}
        <tr>
          {#each red as c, k (k)}
            {#if !c.upis && m.oznakaRetka && k === 0}
              <th scope="row" class="tb-lijevo"><Md text={c.md} inline /></th>
            {:else if !c.upis}
              <td class="tb-zadano"><Md text={c.md} inline /></td>
            {:else}
              {@const v = vrijednost(c, r, k)}
              {@const st = stanje(r, k)}
              <td class="tb-upis {st}">
                {#if c.opcije}
                  <button
                    type="button"
                    class="tb-gumb"
                    class:puno={v !== ""}
                    disabled={zakljucano}
                    aria-label="{ariaCelije(m, r, k)}: {v || 'prazno'}{st === 'bad' ? ', nije točno' : ''}{zakljucano ? '' : '. Dodirni za promjenu.'}"
                    onclick={() => okreni(r, k)}
                  >
                    {#if v.includes("$")}<Md text={v} inline />{:else}<span class:tb-strelica={strelica(v)}>{v}</span>{/if}
                  </button>
                {:else if tocno}
                  <span class="tb-vrijednost">{#if v.includes("$")}<Md text={v} inline />{:else}{v}{/if}</span>
                {:else}
                  <input
                    class="inp tb-inp"
                    class:ok={st === "ok"}
                    class:bad={st === "bad"}
                    type="text"
                    inputmode={c.broj ? "decimal" : "text"}
                    enterkeyhint="done"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    aria-label={ariaCelije(m, r, k)}
                    disabled={zakljucano}
                    bind:value={unos[r][k]}
                    onkeydown={(e) => e.key === "Enter" && provjeri()}
                  />
                {/if}
              </td>
            {/if}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if siroka}
  <p class="tb-legenda">Tablica je šira od zaslona: pomakni je vodoravno.</p>
{/if}

{#if m.legenda}
  <p class="tb-legenda">{m.legenda}</p>
{/if}

{#if m.tautologija}
  {#if prikaz}
    <p class="tb-taut-tekst"><Md text={m.tautologija.zasto} inline /></p>
  {:else}
    <div class="tb-taut">
      <p class="tb-taut-pitanje"><Md text={m.tautologija.pitanje} inline /></p>
      <div class="tb-taut-izbor" role="group" aria-label="Je li zadnji izraz tautologija?">
        {#each [true, false] as v (v)}
          {@const st = tautStanje(v)}
          <button
            type="button"
            class="lx-option"
            class:sel={st === "sel"}
            class:ok={st === "ok"}
            class:bad={st === "bad"}
            aria-pressed={taut === v}
            disabled={zakljucano}
            onclick={() => (taut = v)}
          >
            {v ? "Da" : "Ne"}
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/if}

{#if !prikaz}
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={zakljucano} onclick={provjeri}>Provjeri</button>
  </div>
{/if}

<style>
  /* contain: široka tablica ne smije raširiti korak (roditelj je grid), nego se pomiče unutar okvira */
  .tb-okvir {
    contain: inline-size;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    margin: 8px 0 0;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
  }
  .tb-okvir:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: var(--r-md);
  }
  .tb {
    border-collapse: separate;
    border-spacing: 0;
    margin: 0 auto;
    font-size: 15px;
  }
  .tb th,
  .tb td {
    min-width: 44px;
    height: 44px;
    padding: 4px 8px;
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .tb tr > :first-child {
    border-left: 1px solid var(--border);
  }
  .tb thead th,
  .tb tbody:first-child tr:first-child > * {
    border-top: 1px solid var(--border);
  }
  .tb thead th {
    background: var(--bg-elev-2);
    font-weight: 600;
  }
  .tb th.tb-lijevo {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--bg-elev-2);
    font-weight: 600;
  }
  .tb-zadano {
    color: var(--text-dim);
  }
  .tb-predznak .tb-zadano {
    color: var(--text);
  }
  .tb td.tb-upis {
    padding: 3px;
  }
  .tb-gumb {
    display: grid;
    place-items: center;
    width: 100%;
    min-width: 40px;
    min-height: 38px;
    padding: 0 6px;
    border: 1.5px dashed var(--primary-border);
    border-radius: var(--r-md);
    background: transparent;
    color: var(--primary);
    font: inherit;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
  }
  .tb-gumb.puno {
    border-style: solid;
    background: var(--primary-dim);
  }
  .tb-gumb:hover:not(:disabled) {
    border-color: var(--primary);
  }
  .tb-gumb:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
  }
  .tb-gumb:disabled {
    cursor: default;
  }
  .tb-upis.bad .tb-gumb {
    border: 1.5px solid var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    color: var(--danger);
  }
  .tb-upis.ok .tb-gumb {
    border: 1.5px solid var(--success);
    background: color-mix(in srgb, var(--success) 10%, transparent);
    color: var(--success);
  }
  .tb-upis.prazno .tb-gumb,
  .tb-upis.prazno .tb-inp {
    border-color: var(--danger);
  }
  .tb-upis.pokazano .tb-gumb {
    border: 0;
    background: transparent;
    color: var(--text);
  }
  .tb-inp {
    width: 5.2em;
    min-width: 0;
    height: 38px;
    padding: 0 6px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 15px;
  }
  .tb-strelica {
    font-size: 21px;
    line-height: 1;
  }
  .tb-vrijednost {
    font-weight: 600;
  }
  .tb-legenda {
    margin: 6px 0 0;
    font-size: 12.5px;
    color: var(--text-faint);
    text-align: center;
  }
  .tb-taut {
    margin-top: 12px;
  }
  .tb-taut-pitanje,
  .tb-taut-tekst {
    margin: 0 0 8px;
  }
  .tb-taut-izbor {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .tb-taut-izbor .lx-option {
    justify-content: center;
    font-weight: 500;
  }
</style>
