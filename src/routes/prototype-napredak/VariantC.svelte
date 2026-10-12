<script>
  // PROTOTIP varijanta C — „Zapisnik događaja“: gore vodoravna traka faza s ukupnim postotkom, u sredini
  // zapisnik svega što se dogodilo (najnovije gore, s vremenom), desno stupac s trenutnim stanjem, gumbima i kvotom.
  import { sim, FAZE, opisStatusa, opisFaze, postotak } from "./sim.svelte.js";
  import Akcije from "./Akcije.svelte";

  let idx = $derived(FAZE.findIndex((f) => f.id === sim.faza));
</script>

<div class="page vc">
  <div class="top">
    <h1>{sim.predmet}</h1>
    <div class="phases">
      {#each FAZE as f, i}
        <div class="seg" class:done={i < idx || sim.status === "gotovo"} class:cur={i === idx && sim.status !== "gotovo"}
          class:warn={i === idx && (sim.status === "ceka-kvotu" || sim.status === "pauzirano")}
          class:err={i === idx && (sim.status === "neuspjelo" || sim.status === "odustao")}>
          <span class="bar"></span>
          <span class="lbl">{f.naziv}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="grid">
    <div class="card logc">
      <div class="lh">Zapisnik</div>
      <ul class="log">
        {#each sim.log as e}
          <li class={e.vrsta}><span class="t">{e.t}</span><span>{e.tekst}</span></li>
        {/each}
      </ul>
    </div>

    <div class="side">
      <div class="card box">
        <div class="k">Stanje</div>
        <div class="v {sim.status}">{opisStatusa()} · {postotak()} %</div>
        <div class="d">{opisFaze()}</div>
        <Akcije />
      </div>
      <div class="card box">
        <div class="k">Mjesečna kvota</div>
        <div class="v">{sim.kvota} %</div>
        <div class="kbar"><span style="width:{sim.kvota}%" class:hot={sim.kvota >= 80}></span></div>
        <div class="d">Procjena za ovu izradu: ~{sim.procjenaKvote} % kvote. Obnavlja se 1. u mjesecu.</div>
      </div>
      <div class="card box">
        <div class="k">Obavijesti</div>
        <div class="d">{sim.email ? `Poslan e-mail: „${sim.email}“` : "E-mail kad plan bude spreman i kad budu gotovi svi zadaci."}</div>
      </div>
    </div>
  </div>
</div>

<style>
  .vc { max-width: 1120px; padding-bottom: 100px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 14px; }
  .phases { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 20px; }
  .seg { display: grid; gap: 6px; }
  .seg .bar { height: 5px; border-radius: 99px; background: var(--bg-elev-2); }
  .seg.done .bar { background: var(--primary); }
  .seg.cur .bar { background: linear-gradient(90deg, var(--primary) 50%, var(--bg-elev-2) 50%); }
  .seg.warn .bar { background: var(--warn); }
  .seg.err .bar { background: var(--danger); }
  .lbl { font-size: 11.5px; color: var(--text-faint); }
  .seg.cur .lbl, .seg.done .lbl { color: var(--text-dim); }
  .grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
  @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  .logc { padding: 12px 0; }
  .lh { padding: 0 16px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); }
  .log { list-style: none; margin: 0; padding: 0; font-family: var(--font-mono); font-size: 12.5px; max-height: 60vh; overflow: auto; }
  .log li { display: flex; gap: 14px; padding: 7px 16px; border-top: 1px solid var(--border); color: var(--text-dim); }
  .log li.ok { color: var(--success); }
  .log li.warn { color: var(--warn); }
  .log li.err { color: var(--danger); }
  .t { color: var(--text-faint); flex-shrink: 0; }
  .side { display: grid; gap: 12px; }
  .box { padding: 14px; display: grid; gap: 8px; }
  .k { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); }
  .v { font-size: 18px; font-weight: 600; }
  .v.radi { color: var(--primary); }
  .v.ceka-kvotu, .v.pauzirano { color: var(--warn); }
  .v.neuspjelo, .v.odustao { color: var(--danger); }
  .v.gotovo, .v.ceka-kreatora { color: var(--success); }
  .d { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
  .kbar { height: 6px; border-radius: 99px; background: var(--bg-elev-2); overflow: hidden; }
  .kbar span { display: block; height: 100%; background: var(--primary); }
  .kbar span.hot { background: var(--warn); }
</style>
