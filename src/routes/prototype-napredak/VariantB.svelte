<script>
  // PROTOTIP varijanta B — „Kartica sada + popis predmeta“: lijevo popis vlastitih predmeta s malim stanjem
  // (stranica /moji-predmeti), desno jedna velika kartica: što se događa sada, koliko je gotovo i što ja trebam napraviti.
  // Povijest se ne prikazuje; ostale faze samo kao „što slijedi“.
  import Plus from "@lucide/svelte/icons/plus";
  import { sim, FAZE, opisStatusa, opisFaze, postotak } from "./sim.svelte.js";
  import Akcije from "./Akcije.svelte";

  const OSTALI = [
    { naziv: "Matematika — derivacije", st: "Spremno", cls: "gotovo", info: "32 lekcije · učiš 6 dana" },
    { naziv: "Biologija — stanica", st: "Čeka tebe", cls: "ceka-kreatora", info: "Plan čeka potvrdu" },
  ];
  let idx = $derived(FAZE.findIndex((f) => f.id === sim.faza));
  let naslov = $derived(
    {
      radi: sim.faza === "zadaci" && sim.batch ? "Možeš početi učiti" : "Izrađujemo tvoj predmet",
      "ceka-kvotu": "Izrada čeka novu kvotu",
      neuspjelo: "Nešto nije uspjelo",
      pauzirano: "Izrada je na kratkoj pauzi",
      "ceka-kreatora": "Plan je spreman za pregled",
      gotovo: "Predmet je spreman",
      odustao: "Izrada je otkazana",
    }[sim.status]
  );
  let podnaslov = $derived(
    {
      radi: sim.faza === "zadaci" && sim.batch
        ? "Prvih 5 lekcija je spremno. Ostale se izrađuju do 24 h, a javit ćemo ti e-mailom kad budu gotove."
        : sim.faza === "citanje" ? "Ovo traje nekoliko minuta. Možeš zatvoriti stranicu, javit ćemo ti e-mailom kad plan bude spreman."
        : "Možeš zatvoriti stranicu, javit ćemo ti e-mailom kad plan bude spreman.",
      "ceka-kvotu": "Ovaj mjesec je kvota potrošena (100 %). Napravljeno je spremljeno i izrada se sama nastavlja 1. studenoga.",
      neuspjelo: "Jedan korak izrade nije uspio ni nakon 3 pokušaja. Pokušaj ponovno; ako opet ne uspije, javi nam se.",
      pauzirano: "Zbog velikog opterećenja izrada je privremeno zaustavljena. Nastavit će se sama.",
      "ceka-kreatora": `Plan ima ${sim.lekcijeUkupno} lekcija. Pregledaj ga, promijeni što želiš i potvrdi. Nakon potvrde se ne može mijenjati.`,
      gotovo: `Zadaci za svih ${sim.lekcijeUkupno} lekcija su spremni.`,
      odustao: "Nedovršeni predmet je obrisan. Potrošena kvota se ne vraća.",
    }[sim.status]
  );
</script>

<div class="page vb">
  <aside>
    <div class="side-h">
      <b>Moji predmeti</b>
      <button class="btn btn-ghost sm"><Plus size={13} /> Novi</button>
    </div>
    <div class="card item sel">
      <div class="i-n">{sim.predmet}</div>
      <div class="i-s {sim.status}">{opisStatusa()} · {postotak()} %</div>
      <div class="mini"><span style="width:{postotak()}%"></span></div>
    </div>
    {#each OSTALI as o}
      <div class="card item">
        <div class="i-n">{o.naziv}</div>
        <div class="i-s {o.cls}">{o.st}</div>
        <div class="dim">{o.info}</div>
      </div>
    {/each}
    <div class="kv">
      <div>Iskorišteno <b>{sim.kvota} %</b> ovog mjeseca</div>
      <div class="mini"><span style="width:{sim.kvota}%" class:hot={sim.kvota >= 80}></span></div>
      {#if sim.kvota >= 80 && sim.kvota < 100}<div class="warn-t">Kvota je skoro potrošena.</div>{/if}
    </div>
  </aside>

  <main>
    <div class="card hero {sim.status}">
      <div class="ring" style="--p:{postotak()}">
        <span>{postotak()}%</span>
      </div>
      <div class="hero-t">
        <div class="eyebrow">{sim.predmet}</div>
        <h1>{naslov}</h1>
        <p>{podnaslov}</p>
        {#if sim.status === "radi" || sim.status === "ceka-kvotu" || sim.status === "pauzirano"}
          <div class="now">{opisFaze()}</div>
        {/if}
        <Akcije />
      </div>
    </div>

    {#if sim.status !== "odustao" && sim.status !== "gotovo"}
      <div class="next">
        <div class="next-h">Što slijedi</div>
        {#each FAZE.slice(idx + 1) as f, j}
          <div class="n-i"><span class="n-d">{idx + j + 2}</span>{f.naziv}</div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .vb { max-width: 1060px; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 22px; padding-bottom: 100px; }
  @media (max-width: 820px) { .vb { grid-template-columns: 1fr; } }
  .side-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .btn.sm { padding: 5px 9px; font-size: 12px; }
  .item { padding: 12px 14px; margin-bottom: 8px; display: grid; gap: 4px; cursor: pointer; }
  .item.sel { border-color: var(--primary-border); background: var(--primary-dim); }
  .i-n { font-weight: 600; font-size: 13.5px; }
  .i-s { font-size: 12px; color: var(--text-dim); }
  .i-s.radi { color: var(--primary); }
  .i-s.ceka-kvotu, .i-s.pauzirano { color: var(--warn); }
  .i-s.neuspjelo, .i-s.odustao { color: var(--danger); }
  .i-s.gotovo, .i-s.ceka-kreatora { color: var(--success); }
  .dim { color: var(--text-faint); font-size: 12px; }
  .mini { height: 4px; border-radius: 99px; background: var(--bg-elev-2); overflow: hidden; }
  .mini span { display: block; height: 100%; background: var(--primary); transition: width .4s; }
  .mini span.hot { background: var(--warn); }
  .kv { margin-top: 16px; font-size: 12.5px; color: var(--text-dim); display: grid; gap: 6px; }
  .warn-t { color: var(--warn); }
  .hero { padding: 28px; display: flex; gap: 26px; align-items: flex-start; }
  @media (max-width: 600px) { .hero { flex-direction: column; } }
  .hero.neuspjelo { border-color: var(--danger); }
  .hero.ceka-kvotu, .hero.pauzirano { border-color: var(--warn); }
  .ring { --c: var(--primary); width: 120px; height: 120px; flex-shrink: 0; border-radius: 999px; display: grid; place-items: center;
    background: conic-gradient(var(--c) calc(var(--p) * 1%), var(--bg-elev-2) 0); position: relative; }
  .ring::after { content: ""; position: absolute; inset: 10px; border-radius: 999px; background: var(--bg-elev); }
  .ring span { position: relative; z-index: 1; font-size: 24px; font-weight: 600; }
  .hero.ceka-kvotu .ring, .hero.pauzirano .ring { --c: var(--warn); }
  .hero.neuspjelo .ring { --c: var(--danger); }
  .hero.gotovo .ring, .hero.ceka-kreatora .ring { --c: var(--success); }
  .hero-t { display: grid; gap: 10px; }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); }
  h1 { font-size: 24px; font-weight: 600; margin: 0; }
  p { margin: 0; color: var(--text-dim); font-size: 14px; line-height: 1.55; max-width: 520px; }
  .now { font-size: 13px; color: var(--text); padding: 8px 10px; border-radius: var(--r-md); background: var(--bg-elev-2); }
  .next { margin-top: 18px; display: grid; gap: 8px; }
  .next-h { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); }
  .n-i { display: flex; gap: 10px; align-items: center; font-size: 13.5px; color: var(--text-dim); }
  .n-d { width: 22px; height: 22px; border-radius: 99px; border: 1px solid var(--border-strong); display: grid; place-items: center; font-size: 11px; }
</style>
