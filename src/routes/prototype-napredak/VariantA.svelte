<script>
  // PROTOTIP varijanta A — „Vremenska crta“: faze izrade okomito; trenutna je otvorena s napretkom,
  // podkoracima, porukom o stanju i gumbima. Završene faze su sažete u jedan redak.
  import Check from "@lucide/svelte/icons/check";
  import Loader from "@lucide/svelte/icons/loader-circle";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Pause from "@lucide/svelte/icons/pause";
  import Mail from "@lucide/svelte/icons/mail";
  import { sim, FAZE, KORACI_PLANA, opisStatusa, opisFaze } from "./sim.svelte.js";
  import Akcije from "./Akcije.svelte";

  let idx = $derived(FAZE.findIndex((f) => f.id === sim.faza));
  function stanje(i) {
    if (sim.status === "odustao") return i < idx ? "done" : "off";
    if (i < idx) return "done";
    if (i > idx) return "todo";
    return sim.status === "gotovo" ? "done" : sim.status;
  }
  function sazetak(f) {
    if (f.id === "citanje") return `${sim.stranice} stranica`;
    if (f.id === "plan") return `${sim.lekcijeUkupno} lekcija`;
    if (f.id === "nacrt") return "potvrđen";
    if (f.id === "zadaci") return `${sim.lekcijeUkupno} lekcija`;
    return "";
  }
  let pct = $derived(
    sim.faza === "citanje" ? (100 * sim.procitano) / sim.stranice
    : sim.faza === "plan" ? (100 * sim.korakPlana) / KORACI_PLANA.length
    : sim.faza === "zadaci" ? (100 * sim.zadaciGotovi) / sim.lekcijeUkupno : 100
  );
</script>

<div class="page va">
  <div class="head">
    <div>
      <div class="eyebrow">Moji predmeti</div>
      <h1>{sim.predmet}</h1>
    </div>
    <span class="badge st {sim.status}">{opisStatusa()}</span>
  </div>

  <ol class="tl">
    {#each FAZE as f, i}
      {@const s = stanje(i)}
      <li class="ph {s}">
        <span class="dot">
          {#if s === "done"}<Check size={14} />
          {:else if s === "radi"}<Loader size={14} class="spin" />
          {:else if s === "neuspjelo"}<TriangleAlert size={14} />
          {:else if s === "ceka-kvotu" || s === "pauzirano"}<Pause size={14} />
          {:else}{i + 1}{/if}
        </span>
        <div class="body">
          <div class="ph-h">
            <span class="ph-n">{f.naziv}</span>
            {#if s === "done"}<span class="dim">{sazetak(f)}</span>{/if}
          </div>

          {#if i === idx && s !== "done" && s !== "off"}
            <div class="card cur">
              <div class="what">{opisFaze()}</div>
              {#if sim.faza !== "nacrt"}
                <div class="bar"><span style="width:{pct}%"></span></div>
              {/if}
              {#if sim.faza === "plan"}
                <ul class="sub">
                  {#each KORACI_PLANA as k, j}
                    <li class:done={j < sim.korakPlana} class:now={j === sim.korakPlana}>
                      {#if j < sim.korakPlana}<Check size={12} />{:else}<span class="o"></span>{/if}{k}
                    </li>
                  {/each}
                </ul>
              {/if}

              {#if s === "ceka-kvotu"}
                <div class="msg warn">
                  Mjesečna kvota je potrošena (100 %). Ono što je napravljeno je spremljeno, a izrada se sama nastavlja
                  <b>1. studenoga</b>. Javit ćemo ti e-mailom kad bude gotovo.
                </div>
              {:else if s === "neuspjelo"}
                <div class="msg err">
                  Korak „{KORACI_PLANA[Math.min(sim.korakPlana, 4)]}“ nije uspio ni nakon 3 automatska pokušaja.
                  Pokušaj ponovno; ako opet ne uspije, javi nam se.
                </div>
              {:else if s === "pauzirano"}
                <div class="msg warn">
                  Izrada je privremeno zaustavljena zbog velikog opterećenja. Nastavit će se sama, ništa ne trebaš raditi.
                </div>
              {:else if s === "ceka-kreatora"}
                <div class="msg ok">Pregledaj plan, promijeni što želiš i potvrdi ga. Nakon potvrde plan se više ne može mijenjati.</div>
              {:else if sim.faza === "zadaci" && sim.batch}
                <div class="msg ok">Prvih 5 lekcija je spremno, možeš početi učiti. Zbog velikog broja lekcija ostale se izrađuju do 24 h.</div>
              {/if}
              <Akcije />
            </div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>

  {#if sim.status === "odustao"}
    <div class="card msg err">Izrada je otkazana i nedovršeni predmet je obrisan.</div>
    <Akcije />
  {/if}

  <div class="foot">
    <span><Mail size={13} /> {sim.email ? `E-mail poslan: „${sim.email}“` : "Javit ćemo ti e-mailom kad plan ili zadaci budu spremni."}</span>
    <span class="kv">Mjesečna kvota: {sim.kvota} % <span class="kbar"><span style="width:{sim.kvota}%" class:hot={sim.kvota >= 80}></span></span></span>
  </div>
</div>

<style>
  .va { max-width: 760px; padding-bottom: 100px; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 22px; }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); }
  h1 { font-size: 24px; font-weight: 600; margin: 2px 0 0; }
  .st.radi { color: var(--primary); border-color: var(--primary-border); }
  .st.ceka-kvotu, .st.pauzirano { color: var(--warn); border-color: var(--warn); }
  .st.neuspjelo, .st.odustao { color: var(--danger); border-color: var(--danger); }
  .st.gotovo, .st.ceka-kreatora { color: var(--success); border-color: var(--success); }
  .tl { list-style: none; margin: 0; padding: 0; position: relative; }
  .ph { display: flex; gap: 14px; position: relative; padding-bottom: 18px; }
  .ph:not(:last-child)::before { content: ""; position: absolute; left: 13px; top: 30px; bottom: 0; width: 2px; background: var(--border); }
  .ph.done:not(:last-child)::before { background: var(--primary-border); }
  .dot { width: 28px; height: 28px; flex-shrink: 0; border-radius: 999px; display: grid; place-items: center; font-size: 12px; border: 2px solid var(--border-strong); color: var(--text-faint); background: var(--bg); z-index: 1; }
  .ph.done .dot { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
  .ph.radi .dot, .ph.ceka-kreatora .dot { border-color: var(--primary); color: var(--primary); }
  .ph.ceka-kvotu .dot, .ph.pauzirano .dot { border-color: var(--warn); color: var(--warn); }
  .ph.neuspjelo .dot { border-color: var(--danger); color: var(--danger); }
  .body { flex: 1; min-width: 0; padding-top: 4px; }
  .ph-h { display: flex; gap: 10px; align-items: baseline; }
  .ph-n { font-weight: 600; font-size: 14.5px; }
  .ph.todo .ph-n, .ph.off .ph-n { color: var(--text-faint); font-weight: 500; }
  .dim { color: var(--text-faint); font-size: 12.5px; }
  .cur { margin-top: 10px; padding: 14px 16px; display: grid; gap: 12px; }
  .what { font-size: 14px; }
  .bar, .kbar { height: 6px; border-radius: 999px; background: var(--bg-elev-2); overflow: hidden; }
  .bar span, .kbar span { display: block; height: 100%; background: var(--primary); transition: width .4s; }
  .kbar { width: 90px; display: inline-block; vertical-align: middle; margin-left: 6px; }
  .kbar span.hot { background: var(--warn); }
  .sub { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 13px; color: var(--text-faint); }
  .sub li { display: flex; gap: 8px; align-items: center; }
  .sub li.done { color: var(--text-dim); }
  .sub li.now { color: var(--text); font-weight: 500; }
  .o { width: 8px; height: 8px; border-radius: 99px; border: 1.5px solid currentColor; display: inline-block; margin: 0 2px; }
  .msg { font-size: 13px; padding: 10px 12px; border-radius: var(--r-md); line-height: 1.5; }
  .msg.warn { background: color-mix(in srgb, var(--warn) 12%, transparent); }
  .msg.err { background: color-mix(in srgb, var(--danger) 12%, transparent); }
  .msg.ok { background: color-mix(in srgb, var(--success) 10%, transparent); }
  .foot { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-dim); margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
  .foot span { display: inline-flex; gap: 6px; align-items: center; }
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
