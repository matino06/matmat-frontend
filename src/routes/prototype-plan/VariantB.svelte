<script>
  // PROTOTIP varijanta B — „Mapa ovisnosti“: plan kao graf lekcija (strelica = preduvjet) po području.
  // Klik na lekciju otvara ladicu za uređivanje; preduvjet i spajanje se rade klikom na drugu lekciju u grafu.
  import { onMount } from "svelte";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Merge from "@lucide/svelte/icons/merge";
  import Link from "@lucide/svelte/icons/link";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Settings2 from "@lucide/svelte/icons/settings-2";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import {
    plan, upozorenja, VRSTE, byId, naziv, cjelinaOf, rename, remove, restore, merge, add, togglePrereq,
    neZnam, dodajPredznanje, setNacin, posaljiUputu, prihvatiPrijedlog, odbaciPrijedlog, potvrdi,
  } from "./planStore.svelte.js";

  let el;
  let cy;
  let cytoscape;
  let podrucje = $state("mehanika");
  let selected = $state(null);
  let mode = $state(null); // null | "pre" | "merge"
  let panel = $state(null); // null | "warn" | "settings"
  let nameDraft = $state("");
  let uputa = $state("");
  let novoPredznanje = $state("");

  let warns = $derived(upozorenja());
  let warnIds = $derived(new Set(warns.filter((w) => w.id && VRSTE[w.vrsta].ozbiljno).map((w) => w.id)));
  let sel = $derived(selected ? byId(selected) : null);
  let tabs = $derived(plan.podrucja.filter((p) => plan.lekcije.some((l) => cjelinaOf(l.cjelina)?.podrucje === p.id)));
  let shown = $derived(
    podrucje === "sve" ? plan.lekcije : plan.lekcije.filter((l) => cjelinaOf(l.cjelina)?.podrucje === podrucje)
  );

  $effect(() => {
    if (sel) nameDraft = sel.naziv;
  });

  // cytoscape ne razumije moderni hsl(), pa boju teme pretvori u rgb() preko računalnog stila
  function css(name) {
    const d = document.createElement("div");
    d.style.color = `var(${name})`;
    document.body.appendChild(d);
    const c = getComputedStyle(d).color;
    d.remove();
    return c;
  }

  function draw() {
    if (!cy) return;
    const ids = new Set(shown.map((l) => l.id));
    const els = [
      ...shown.map((l) => ({
        data: { id: l.id, label: l.naziv.length > 42 ? l.naziv.slice(0, 40) + "…" : l.naziv },
        classes: [warnIds.has(l.id) ? "bad" : "", l.nova ? "nova" : "", l.id === selected ? "sel" : ""].join(" "),
      })),
      ...shown.flatMap((l) =>
        l.preduvjeti.filter((p) => ids.has(p)).map((p) => ({ data: { id: `${p}->${l.id}`, source: p, target: l.id } }))
      ),
    ];
    cy.elements().remove();
    cy.add(els);
    cy.style([
      { selector: "node", style: {
        shape: "round-rectangle", width: 190, height: 46, label: "data(label)", "text-wrap": "wrap", "text-max-width": 176,
        "font-size": 11, color: css("--text"), "text-valign": "center", "background-color": css("--bg-elev-2"),
        "border-width": 1, "border-color": css("--border-strong") } },
      { selector: "node.nova", style: { "border-color": css("--primary"), "border-style": "dashed", "border-width": 2 } },
      { selector: "node.bad", style: { "border-color": css("--danger"), "border-width": 2 } },
      { selector: "node.sel", style: { "background-color": css("--primary-dim"), "border-color": css("--primary"), "border-width": 2 } },
      { selector: "edge", style: { width: 1.3, "line-color": css("--border-strong"), "target-arrow-color": css("--border-strong"),
        "target-arrow-shape": "triangle", "curve-style": "bezier" } },
    ]);
    cy.layout({ name: "dagre", rankDir: "LR", nodeSep: 14, rankSep: 60 }).run();
  }

  onMount(async () => {
    cytoscape = (await import("cytoscape")).default;
    const dagre = (await import("cytoscape-dagre")).default;
    cytoscape.use(dagre);
    cy = cytoscape({ container: el, minZoom: 0.15, maxZoom: 2 });
    cy.on("tap", "node", (e) => clickNode(e.target.id()));
    cy.on("tap", (e) => {
      if (e.target === cy) { selected = null; mode = null; }
    });
    draw();
    return () => cy?.destroy();
  });

  // ponovno nacrtaj kad se promijeni plan, područje ili odabir
  $effect(() => {
    JSON.stringify(shown.map((l) => [l.id, l.naziv, l.preduvjeti, l.nova]));
    warnIds; selected;
    draw();
  });

  function clickNode(id) {
    if (mode === "pre" && selected && id !== selected) {
      togglePrereq(selected, id);
      mode = null;
      return;
    }
    if (mode === "merge" && selected && id !== selected) {
      merge(selected, id);
      mode = null;
      return;
    }
    selected = id;
  }

  function focus(id) {
    if (!id) return;
    const l = byId(id);
    if (!l) return;
    podrucje = cjelinaOf(l.cjelina)?.podrucje ?? podrucje;
    selected = id;
    panel = null;
    setTimeout(() => { const n = cy?.getElementById(id); if (n?.length) cy.animate({ center: { eles: n }, zoom: 1 }, { duration: 300 }); }, 50);
  }

  function addHere() {
    const t = prompt("Naziv nove lekcije:");
    if (!t?.trim()) return;
    const anchor = sel ?? shown[shown.length - 1];
    const id = add(anchor?.id, t.trim(), anchor?.cjelina);
    selected = id;
  }
</script>

<div class="vb">
  <div class="toolbar">
    <div class="tl">
      <strong>{plan.predmet}</strong>
      <span class="dim">· nacrt · {plan.lekcije.length} lekcija</span>
      {#if plan.provjera === "u-tijeku"}<span class="checking">· provjera…</span>{/if}
    </div>
    <div class="tabs">
      {#each tabs as t}
        <button class="chip" class:active={podrucje === t.id} onclick={() => (podrucje = t.id)}>{t.naziv}</button>
      {/each}
      <button class="chip" class:active={podrucje === "sve"} onclick={() => (podrucje = "sve")}>Sve</button>
    </div>
    <div class="tr">
      <button class="btn btn-ghost" onclick={addHere}><Plus size={14} /> Lekcija</button>
      <button class="btn btn-ghost" class:on={panel === "warn"} onclick={() => (panel = panel === "warn" ? null : "warn")}>
        <TriangleAlert size={14} /> {warns.length}
      </button>
      <button class="btn btn-ghost" class:on={panel === "settings"} onclick={() => (panel = panel === "settings" ? null : "settings")}>
        <Settings2 size={14} /> Postavke
      </button>
      {#if plan.status === "potvrden"}
        <span class="badge ok">Potvrđeno</span>
      {:else}
        <button class="btn btn-primary" onclick={() => confirm(`Potvrditi plan s ${plan.lekcije.length} lekcija?${plan.lekcije.length > 50 ? "\n\nPrvih 5 lekcija odmah, ostale do 24 h (javimo e-mailom)." : ""}`) && potvrdi()}>
          Potvrdi plan
        </button>
      {/if}
    </div>
  </div>

  {#if mode}
    <div class="modebar">
      {mode === "pre" ? "Klikni lekciju koja je preduvjet za" : "Klikni lekciju koju spajaš s"} <b>„{sel?.naziv}“</b>
      <button class="btn btn-quiet sm" onclick={() => (mode = null)}>Odustani</button>
    </div>
  {/if}

  <div class="canvas" bind:this={el}></div>

  {#if panel === "warn"}
    <div class="pop card">
      <div class="pop-h">Upozorenja nakon provjere</div>
      {#each warns as w}
        <button class="warn" class:serious={VRSTE[w.vrsta].ozbiljno} onclick={() => focus(w.id)} title={w.detalj ?? ""}>
          <span class="wl">{VRSTE[w.vrsta].label}</span>{w.tekst}
        </button>
      {/each}
    </div>
  {/if}

  {#if panel === "settings"}
    <div class="pop card">
      <div class="pop-h">Način učenja</div>
      <div class="seg">
        <button class="seg-item" class:active={plan.nacin === "ucenje"} onclick={() => setNacin("ucenje")}>Učenje gradiva</button>
        <button class="seg-item" class:active={plan.nacin === "brza"} onclick={() => setNacin("brza")}>Brza priprema</button>
      </div>
      <div class="pop-h">Pretpostavljeno predznanje</div>
      {#each plan.predznanje as p}
        <div class="pz"><span>{p}</span><button class="btn btn-quiet sm" onclick={() => neZnam(p)}>Ipak ne znam</button></div>
      {/each}
      <input class="inp" placeholder="Dodaj što već znaš…" bind:value={novoPredznanje}
        onkeydown={(e) => e.key === "Enter" && (dodajPredznanje(novoPredznanje), (novoPredznanje = ""))} />
    </div>
  {/if}

  {#if sel}
    <div class="drawer card">
      <div class="dr-h">
        <span class="dim small">{cjelinaOf(sel.cjelina)?.naziv}</span>
        <button class="icon-btn" onclick={() => (selected = null)}><X size={15} /></button>
      </div>
      <input class="inp title" bind:value={nameDraft} onblur={() => rename(sel.id, nameDraft)}
        onkeydown={(e) => e.key === "Enter" && rename(sel.id, nameDraft)} />
      {#if sel.koncept}<p class="koncept">{sel.koncept}</p>{/if}
      {#each warns.filter((w) => w.id === sel.id) as w}
        <div class="w-inline" class:serious={VRSTE[w.vrsta].ozbiljno}>
          <TriangleAlert size={13} /> {w.tekst}
          {#if w.vrsta === "nulta"}<button class="btn btn-quiet sm" onclick={() => restore(w.pre)}>Vrati obrisanu</button>{/if}
        </div>
      {/each}
      <div class="dlabel">Stavke znanja ({sel.stavke.length})</div>
      <ul>{#each sel.stavke as s}<li>{s}</li>{:else}<li class="dim">AI će ih izraditi pri provjeri.</li>{/each}</ul>
      <div class="dlabel">Preduvjeti</div>
      <div class="pres">
        {#each sel.preduvjeti as p}
          <span class="chip" class:bad={!!plan.obrisane[p] && !byId(p)}>
            <button class="lnk" onclick={() => focus(p)}>{naziv(p)}</button>
            <button class="lnk" title="Ukloni" onclick={() => togglePrereq(sel.id, p)}><X size={12} /></button>
          </span>
        {/each}
      </div>
      <div class="dr-actions">
        <button class="btn btn-ghost" class:on={mode === "pre"} onclick={() => (mode = mode === "pre" ? null : "pre")}><Link size={14} /> Dodaj preduvjet</button>
        <button class="btn btn-ghost" class:on={mode === "merge"} onclick={() => (mode = mode === "merge" ? null : "merge")}><Merge size={14} /> Spoji s…</button>
        <button class="btn btn-ghost danger" onclick={() => { remove(sel.id); selected = null; }}><Trash2 size={14} /> Obriši</button>
      </div>
    </div>
  {/if}

  <div class="ai card">
    <Sparkles size={15} />
    {#if plan.prijedlog}
      <div class="ai-prop">
        <b>AI predlaže:</b> {plan.prijedlog.ops.map((o) => o.opis).join(" · ")}
      </div>
      <button class="btn btn-primary sm" onclick={prihvatiPrijedlog}>Prihvati</button>
      <button class="btn btn-quiet sm" onclick={odbaciPrijedlog}>Odbaci</button>
    {:else}
      <input class="inp" bind:value={uputa} placeholder="Reci AI-ju što promijeniti u planu…"
        onkeydown={(e) => e.key === "Enter" && (posaljiUputu(uputa), (uputa = ""))} />
    {/if}
  </div>
</div>

<style>
  .vb { position: relative; height: 100vh; display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--bg-elev); flex-wrap: wrap; }
  .tl { font-size: 14px; white-space: nowrap; }
  .tabs { display: flex; gap: 6px; flex: 1; flex-wrap: wrap; }
  .tr { display: flex; gap: 6px; align-items: center; }
  .btn.on { border-color: var(--primary-border); color: var(--primary); }
  .btn.sm { padding: 4px 9px; font-size: 12px; }
  .btn.danger:hover { color: var(--danger); border-color: var(--danger); }
  .checking { color: var(--warn); }
  .dim { color: var(--text-faint); }
  .small { font-size: 12px; }
  .canvas { flex: 1; min-height: 0; background: var(--bg); }
  .modebar { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); z-index: 20; background: var(--primary); color: var(--on-primary); padding: 8px 14px; border-radius: 999px; font-size: 13px; display: flex; gap: 8px; align-items: center; }
  .modebar .btn { color: var(--on-primary); }
  .pop { position: absolute; top: 60px; right: 16px; width: 360px; max-height: 70vh; overflow: auto; padding: 14px; z-index: 30; display: grid; gap: 8px; }
  .pop-h { font-weight: 600; font-size: 13px; margin-top: 4px; }
  .warn { all: unset; cursor: pointer; display: grid; gap: 2px; font-size: 12px; color: var(--text-dim); padding: 7px 9px; border-radius: var(--r-md); border-left: 3px solid var(--warn); background: var(--bg-elev-2); }
  .warn.serious { border-left-color: var(--danger); }
  .wl { font-size: 10.5px; text-transform: uppercase; color: var(--text-faint); }
  .seg-item { border: none; background: none; cursor: pointer; }
  .seg-item.active { background: var(--primary-dim); color: var(--primary); border-radius: var(--r-sm); }
  .pz { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px; align-items: center; }
  .drawer { position: absolute; top: 60px; right: 16px; bottom: 80px; width: 380px; overflow: auto; padding: 14px; z-index: 25; display: flex; flex-direction: column; gap: 8px; }
  .dr-h { display: flex; justify-content: space-between; align-items: center; }
  .inp { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); color: var(--text); padding: 7px 10px; font-size: 13px; font-family: inherit; }
  .inp.title { font-size: 15px; font-weight: 600; }
  .koncept { font-size: 12.5px; color: var(--text-dim); margin: 0; }
  .dlabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin-top: 6px; }
  ul { margin: 0; padding-left: 16px; font-size: 12.5px; color: var(--text-dim); display: grid; gap: 3px; }
  .pres { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { cursor: default; }
  .chip.bad { border-color: var(--danger); color: var(--danger); text-decoration: line-through; }
  .lnk { all: unset; cursor: pointer; display: inline-flex; align-items: center; }
  .w-inline { font-size: 12px; color: var(--warn); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .w-inline.serious { color: var(--danger); }
  .dr-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 10px; }
  .badge.ok { color: var(--success); border-color: var(--success); }
  .ai { position: absolute; bottom: 70px; left: 16px; width: min(560px, calc(100% - 420px)); min-width: 300px; display: flex; gap: 8px; align-items: center; padding: 8px 10px; z-index: 20; }
  .ai-prop { font-size: 12.5px; flex: 1; }
</style>
