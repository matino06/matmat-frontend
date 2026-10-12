<script>
  // PROTOTIP varijanta A — „Popis po cjelinama“: plan kao uređivi popis (područje → cjelina → lekcija),
  // izmjene ravno u retku, a desni stupac drži postavke predmeta, upozorenja i AI uputu.
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Merge from "@lucide/svelte/icons/merge";
  import Plus from "@lucide/svelte/icons/plus";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import {
    plan, upozorenja, VRSTE, naziv, rename, remove, restore, merge, move, add, togglePrereq,
    neZnam, dodajPredznanje, setNacin, posaljiUputu, prihvatiPrijedlog, odbaciPrijedlog, potvrdi,
  } from "./planStore.svelte.js";

  let warns = $derived(upozorenja());
  let warnBy = $derived(
    warns.reduce((m, w) => (w.id && (m[w.id] ??= []).push(w), m), {})
  );
  let ozbiljna = $derived(warns.filter((w) => VRSTE[w.vrsta].ozbiljno));
  let index = $derived(Object.fromEntries(plan.lekcije.map((l, i) => [l.id, i + 1])));

  let open = $state(null); // id proširene lekcije
  let editing = $state(null);
  let editText = $state("");
  let addingAfter = $state(null);
  let addText = $state("");
  let preSearch = $state("");
  let novoPredznanje = $state("");
  let uputa = $state("");
  let showAllWarn = $state(false);
  let confirmOpen = $state(false);
  let flash = $state(null);

  const grupe = $derived(
    plan.podrucja
      .map((p) => ({
        ...p,
        cjeline: plan.cjeline
          .filter((c) => c.podrucje === p.id)
          .map((c) => ({ ...c, lekcije: plan.lekcije.filter((l) => l.cjelina === c.id) }))
          .filter((c) => c.lekcije.length),
      }))
      .filter((p) => p.cjeline.length)
  );

  function startEdit(l) {
    editing = l.id;
    editText = l.naziv;
  }
  function saveEdit() {
    rename(editing, editText);
    editing = null;
  }
  function saveAdd() {
    if (addText.trim()) add(addingAfter, addText.trim());
    addingAfter = null;
    addText = "";
  }
  function goTo(id) {
    if (!id) return;
    open = id;
    flash = id;
    setTimeout(() => document.getElementById(`va-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    setTimeout(() => (flash = null), 1600);
  }
  function nextInCjelina(l) {
    const i = plan.lekcije.indexOf(l);
    const n = plan.lekcije[i + 1];
    return n && n.cjelina === l.cjelina ? n : null;
  }
  let preKandidati = $derived(
    open && preSearch.trim().length > 1
      ? plan.lekcije
          .filter((l) => l.id !== open && l.naziv.toLowerCase().includes(preSearch.toLowerCase()))
          .slice(0, 6)
      : []
  );
</script>

<div class="page va">
  <div class="va-head">
    <div>
      <div class="eyebrow">Vlastiti predmet · nacrt plana</div>
      <h1>{plan.predmet}</h1>
      <div class="sub">
        {plan.lekcije.length} lekcija · {grupe.length} područja ·
        {#if plan.provjera === "u-tijeku"}<span class="checking">ponovna provjera…</span>
        {:else}provjereno{/if}
      </div>
    </div>
    {#if plan.status === "potvrden"}
      <span class="badge ok"><Check size={13} /> Plan potvrđen, zadaci se izrađuju</span>
    {:else}
      <button class="btn btn-primary btn-lg" onclick={() => (confirmOpen = true)}>Potvrdi plan</button>
    {/if}
  </div>

  <div class="va-grid">
    <main>
      {#each grupe as p (p.id)}
        <section class="pod">
          <h2>{p.naziv}</h2>
          {#each p.cjeline as c (c.id)}
            <div class="card cj">
              <div class="cj-head">
                <span>{c.naziv}</span>
                <span class="badge badge-dim">{c.lekcije.length}</span>
              </div>
              {#each c.lekcije as l (l.id)}
                {@const w = warnBy[l.id] ?? []}
                <div class="row" class:open={open === l.id} class:flash={flash === l.id} id={`va-${l.id}`}>
                  <div class="row-main">
                    <span class="num">{index[l.id]}</span>
                    <div class="row-body">
                      {#if editing === l.id}
                        <!-- svelte-ignore a11y_autofocus -->
                        <input class="inp" bind:value={editText} autofocus
                          onkeydown={(e) => (e.key === "Enter" ? saveEdit() : e.key === "Escape" && (editing = null))}
                          onblur={saveEdit} />
                      {:else}
                        <button class="title" onclick={() => (open = open === l.id ? null : l.id)}>
                          {l.naziv}
                          {#if l.nova}<span class="badge new">nova</span>{/if}
                          {#if w.some((x) => VRSTE[x.vrsta].ozbiljno)}<TriangleAlert size={14} class="warn-ic" />{/if}
                        </button>
                      {/if}
                      {#if l.koncept}<div class="koncept">{l.koncept}</div>{/if}
                      <div class="meta">
                        <span>{l.stavke.length} stavki</span>
                        {#if l.preduvjeti.length}
                          <span>· treba:</span>
                          {#each l.preduvjeti.slice(0, 3) as p}
                            <button class="pre" class:bad={!!plan.obrisane[p] && !index[p]} onclick={() => goTo(p)}>{naziv(p)}</button>
                          {/each}
                          {#if l.preduvjeti.length > 3}<span>+{l.preduvjeti.length - 3}</span>{/if}
                        {/if}
                      </div>
                    </div>
                    <div class="actions">
                      <button class="icon-btn" title="Gore" onclick={() => move(l.id, -1)}><ArrowUp size={15} /></button>
                      <button class="icon-btn" title="Dolje" onclick={() => move(l.id, 1)}><ArrowDown size={15} /></button>
                      <button class="icon-btn" title="Preimenuj" onclick={() => startEdit(l)}><Pencil size={15} /></button>
                      {#if nextInCjelina(l)}
                        <button class="icon-btn" title={`Spoji sa sljedećom: „${nextInCjelina(l).naziv}“`}
                          onclick={() => merge(l.id, nextInCjelina(l).id)}><Merge size={15} /></button>
                      {/if}
                      <button class="icon-btn" title="Dodaj lekciju ispod" onclick={() => (addingAfter = l.id)}><Plus size={15} /></button>
                      <button class="icon-btn danger" title="Obriši" onclick={() => remove(l.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {#if open === l.id}
                    <div class="detail">
                      {#each w as x}
                        <div class="w-inline" class:serious={VRSTE[x.vrsta].ozbiljno}>
                          <TriangleAlert size={13} /> {x.tekst}
                          {#if x.vrsta === "nulta"}
                            <button class="btn btn-quiet sm" onclick={() => restore(x.pre)}>Vrati obrisanu</button>
                            <button class="btn btn-quiet sm" onclick={() => togglePrereq(l.id, x.pre)}>Ukloni preduvjet</button>
                          {/if}
                        </div>
                      {/each}
                      <div class="dcol">
                        <div class="dlabel">Stavke znanja</div>
                        {#if l.stavke.length}
                          <ul>{#each l.stavke as s}<li>{s}</li>{/each}</ul>
                        {:else}<div class="dim">AI će ih izraditi pri ponovnoj provjeri.</div>{/if}
                      </div>
                      <div class="dcol">
                        <div class="dlabel">Preduvjeti</div>
                        <div class="chips">
                          {#each l.preduvjeti as p}
                            <span class="chip" class:bad={!!plan.obrisane[p] && !index[p]}>
                              {naziv(p)}
                              <button class="x" title="Ukloni" onclick={() => togglePrereq(l.id, p)}><X size={12} /></button>
                            </span>
                          {/each}
                        </div>
                        <input class="inp sm" placeholder="Dodaj preduvjet: upiši dio naziva…" bind:value={preSearch} />
                        {#each preKandidati as k}
                          <button class="cand" onclick={() => { togglePrereq(l.id, k.id); preSearch = ""; }}>
                            <Plus size={12} /> {k.naziv} <span class="dim">({index[k.id]}.)</span>
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
                {#if addingAfter === l.id}
                  <div class="row add-row">
                    <!-- svelte-ignore a11y_autofocus -->
                    <input class="inp" placeholder="Naziv nove lekcije, npr. „Vektori i zbrajanje vektora“" bind:value={addText} autofocus
                      onkeydown={(e) => (e.key === "Enter" ? saveAdd() : e.key === "Escape" && (addingAfter = null))} />
                    <button class="btn btn-primary" onclick={saveAdd}>Dodaj</button>
                    <button class="btn btn-quiet" onclick={() => (addingAfter = null)}>Odustani</button>
                  </div>
                {/if}
              {/each}
            </div>
          {/each}
        </section>
      {/each}
    </main>

    <aside>
      <div class="card side">
        <div class="side-h">Način učenja</div>
        <div class="seg full">
          <button class="seg-item" class:active={plan.nacin === "ucenje"} onclick={() => setNacin("ucenje")}>Učenje gradiva</button>
          <button class="seg-item" class:active={plan.nacin === "brza"} onclick={() => setNacin("brza")}>Brza priprema</button>
        </div>
        <div class="dim small">
          {plan.nacin === "ucenje"
            ? "Samo lekcije koncepata; vježbaš na probnim ispitima."
            : "Uz koncepte i lekcije primjene, kad sve učiš i vježbaš ovdje."}
        </div>
      </div>

      <div class="card side">
        <div class="side-h">Pretpostavljeno predznanje</div>
        <div class="dim small">Ovo plan koristi bez lekcije. Ako nešto ne znaš, prebaci to u plan.</div>
        {#each plan.predznanje as p}
          <div class="pz">
            <span>{p}</span>
            <button class="btn btn-quiet sm" onclick={() => neZnam(p)}>Ipak ne znam</button>
          </div>
        {/each}
        <input class="inp sm" placeholder="Dodaj što već znaš…" bind:value={novoPredznanje}
          onkeydown={(e) => e.key === "Enter" && (dodajPredznanje(novoPredznanje), (novoPredznanje = ""))} />
      </div>

      <div class="card side">
        <div class="side-h">
          Upozorenja <span class="badge" class:serious={ozbiljna.length}>{warns.length}</span>
        </div>
        {#if plan.provjera === "u-tijeku"}<div class="checking small">Ponovna provjera nakon izmjene…</div>{/if}
        {#each (showAllWarn ? warns : warns.slice(0, 6)) as w}
          <button class="warn" class:serious={VRSTE[w.vrsta].ozbiljno} onclick={() => goTo(w.id)} title={w.detalj ?? ""}>
            <span class="wl">{VRSTE[w.vrsta].label}</span>
            <span>{w.tekst}</span>
          </button>
        {/each}
        {#if warns.length > 6}
          <button class="btn btn-quiet sm" onclick={() => (showAllWarn = !showAllWarn)}>
            {showAllWarn ? "Prikaži manje" : `Prikaži sve (${warns.length})`}
          </button>
        {/if}
      </div>

      <div class="card side">
        <div class="side-h"><Sparkles size={14} /> Uputa AI-ju</div>
        <div class="dim small">Opiši izmjenu riječima, npr. „spoji akceleraciju i usporavanje u jednu lekciju“.</div>
        {#each plan.chat as m}
          <div class="msg {m.tko}">{m.tekst}</div>
        {/each}
        {#if plan.prijedlog}
          <ul class="ops">{#each plan.prijedlog.ops as o}<li>{o.opis}</li>{/each}</ul>
          <div class="row-btns">
            <button class="btn btn-primary" onclick={prihvatiPrijedlog}>Prihvati</button>
            <button class="btn btn-ghost" onclick={odbaciPrijedlog}>Odbaci</button>
          </div>
        {/if}
        <textarea class="inp" rows="3" bind:value={uputa} placeholder="Što da promijenim u planu?"></textarea>
        <button class="btn btn-ghost" onclick={() => (posaljiUputu(uputa), (uputa = ""))}>Pošalji</button>
      </div>
    </aside>
  </div>
</div>

{#if confirmOpen}
  <div class="modal-bg" role="presentation" onclick={() => (confirmOpen = false)}>
    <div class="card modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <h3>Potvrditi plan?</h3>
      <p>{plan.lekcije.length} lekcija · {plan.nacin === "brza" ? "brza priprema" : "učenje gradiva"}</p>
      {#if ozbiljna.length}
        <p class="serious-t"><TriangleAlert size={14} /> {ozbiljna.length} ozbiljnih upozorenja još nije riješeno.</p>
      {/if}
      <p class="dim">
        {plan.lekcije.length > 50
          ? "Prvih 5 lekcija spremno je za nekoliko minuta. Zbog velikog broja lekcija ostale se izrađuju do 24 h; javit ćemo ti e-mailom."
          : "Zadaci za sve lekcije bit će spremni za nekoliko minuta."}
      </p>
      <div class="row-btns">
        <button class="btn btn-primary" onclick={() => (potvrdi(), (confirmOpen = false))}>
          {ozbiljna.length ? "Svejedno potvrdi" : "Potvrdi"}
        </button>
        <button class="btn btn-ghost" onclick={() => (confirmOpen = false)}>Natrag na uređivanje</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .va { max-width: 1240px; padding-bottom: 90px; }
  .va-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px; }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); }
  h1 { font-size: 24px; font-weight: 600; margin: 2px 0; }
  .sub { color: var(--text-dim); font-size: 13px; }
  .checking { color: var(--warn); }
  .va-grid { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 20px; align-items: start; }
  @media (max-width: 960px) { .va-grid { grid-template-columns: 1fr; } }
  .pod h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin: 22px 0 8px; }
  .cj { margin-bottom: 12px; overflow: hidden; }
  .cj-head { display: flex; justify-content: space-between; padding: 10px 14px; font-weight: 600; font-size: 14px; border-bottom: 1px solid var(--border); background: var(--bg-elev-2); }
  .row { border-bottom: 1px solid var(--border); }
  .row:last-child { border-bottom: none; }
  .row.flash { background: var(--primary-dim); transition: background 0.4s; }
  .row-main { display: flex; gap: 10px; padding: 10px 14px; align-items: flex-start; }
  .row:hover .actions, .row.open .actions { opacity: 1; }
  .num { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); width: 26px; padding-top: 3px; flex-shrink: 0; }
  .row-body { flex: 1; min-width: 0; }
  .title { all: unset; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--text); display: inline-flex; gap: 6px; align-items: center; }
  .title:hover { color: var(--primary); }
  :global(.warn-ic) { color: var(--danger); }
  .koncept { font-size: 12px; color: var(--text-dim); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .row.open .koncept { -webkit-line-clamp: unset; line-clamp: unset; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 11px; color: var(--text-faint); margin-top: 4px; }
  .pre { all: unset; cursor: pointer; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-dim); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pre:hover { color: var(--text); border-color: var(--border-strong); }
  .pre.bad, .chip.bad { border-color: var(--danger); color: var(--danger); text-decoration: line-through; }
  .actions { display: flex; gap: 2px; opacity: 0.25; transition: opacity 0.12s; flex-shrink: 0; }
  @media (hover: none) { .actions { opacity: 1; } }
  .icon-btn.danger:hover { color: var(--danger); }
  .detail { padding: 4px 14px 14px 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 700px) { .detail { grid-template-columns: 1fr; padding-left: 14px; } }
  .w-inline { grid-column: 1 / -1; font-size: 12px; color: var(--warn); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .w-inline.serious { color: var(--danger); }
  .dlabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin-bottom: 6px; }
  .dcol ul { margin: 0; padding-left: 16px; font-size: 12.5px; color: var(--text-dim); display: grid; gap: 4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .chip { cursor: default; }
  .x { all: unset; cursor: pointer; display: grid; place-items: center; }
  .cand { all: unset; cursor: pointer; display: flex; gap: 6px; align-items: center; font-size: 12px; padding: 4px 6px; border-radius: 6px; color: var(--text-dim); }
  .cand:hover { background: var(--bg-hover); color: var(--text); }
  .add-row { display: flex; gap: 8px; padding: 10px 14px 10px 50px; background: var(--bg-elev-2); }
  .inp { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); color: var(--text); padding: 7px 10px; font-size: 13px; font-family: inherit; }
  .inp:focus { outline: none; border-color: var(--primary-border); }
  .inp.sm { font-size: 12px; padding: 6px 9px; }
  .badge.new { color: var(--primary); border-color: var(--primary-border); }
  .badge.ok { color: var(--success); border-color: var(--success); padding: 6px 12px; font-size: 12px; }
  .badge.serious { color: var(--danger); border-color: var(--danger); }
  aside { position: sticky; top: 16px; display: grid; gap: 12px; max-height: calc(100vh - 32px); overflow: auto; padding-bottom: 70px; }
  .side { padding: 14px; display: grid; gap: 8px; }
  .side-h { font-weight: 600; font-size: 13px; display: flex; gap: 6px; align-items: center; }
  .seg.full { display: flex; }
  .seg.full .seg-item { flex: 1; border: none; background: none; cursor: pointer; border-radius: var(--r-sm); }
  .seg-item.active { background: var(--primary-dim); color: var(--primary); }
  .dim { color: var(--text-faint); }
  .small { font-size: 12px; }
  .pz { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12.5px; padding: 4px 0; border-bottom: 1px dashed var(--border); }
  .btn.sm { padding: 4px 8px; font-size: 11.5px; }
  .warn { all: unset; cursor: pointer; display: grid; gap: 2px; font-size: 12px; color: var(--text-dim); padding: 7px 9px; border-radius: var(--r-md); border-left: 3px solid var(--warn); background: var(--bg-elev-2); }
  .warn.serious { border-left-color: var(--danger); }
  .warn:hover { color: var(--text); }
  .wl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); }
  .msg { font-size: 12.5px; padding: 7px 9px; border-radius: var(--r-md); background: var(--bg-elev-2); }
  .msg.kreator { background: var(--primary-dim); }
  .msg.sustav { color: var(--text-faint); background: none; padding: 0 2px; }
  .ops { margin: 0; padding-left: 16px; font-size: 12.5px; display: grid; gap: 4px; }
  .row-btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .modal-bg { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: grid; place-items: center; z-index: 1000; }
  .modal { padding: 22px; max-width: 440px; display: grid; gap: 10px; }
  .modal h3 { font-size: 18px; font-weight: 600; margin: 0; }
  .modal p { margin: 0; font-size: 13.5px; }
  .serious-t { color: var(--danger); display: flex; gap: 6px; align-items: center; }
</style>
