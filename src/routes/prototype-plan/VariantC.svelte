<script>
  // PROTOTIP varijanta C — „Vodič s AI-jem“: potvrda plana kao vodič u 4 koraka
  // (predznanje → način učenja → plan → potvrda). U koraku plana glavni alat je razgovor s AI-jem:
  // prijedlog se prvo prikaže u planu (označeno), pa ga kreator prihvati ili odbaci. Ručne izmjene su sporedne.
  import Check from "@lucide/svelte/icons/check";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Pencil from "@lucide/svelte/icons/pencil";
  import {
    plan, upozorenja, VRSTE, rename, remove, restore, neZnam, dodajPredznanje, setNacin,
    posaljiUputu, prihvatiPrijedlog, odbaciPrijedlog, potvrdi,
  } from "./planStore.svelte.js";

  const KORACI = ["Što već znaš", "Kako ćeš učiti", "Plan", "Potvrda"];
  let korak = $state(0);
  let znam = $state({}); // predznanje koje je kreator već potvrdio
  let novoPredznanje = $state("");
  let uputa = $state("");
  let otvorene = $state({});
  let razumijem = $state(false);
  let editing = $state(null);
  let editText = $state("");

  let warns = $derived(upozorenja());
  let ozbiljna = $derived(warns.filter((w) => VRSTE[w.vrsta].ozbiljno));
  let poVrsti = $derived(
    Object.entries(warns.reduce((m, w) => ((m[w.vrsta] ??= []).push(w), m), {}))
  );
  // što trenutni AI prijedlog dira, da se vidi u planu prije prihvaćanja
  let diff = $derived(
    Object.fromEntries(
      (plan.prijedlog?.ops ?? []).flatMap((o) =>
        o.op === "merge" ? [[o.a, "merge"], [o.b, "merge"]] : [[o.id, o.op]]
      )
    )
  );
  let renameTo = $derived(Object.fromEntries((plan.prijedlog?.ops ?? []).filter((o) => o.op === "rename").map((o) => [o.id, o.naziv])));

  let stablo = $derived(
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

  // cjeline koje AI prijedlog dira otvori same
  $effect(() => {
    for (const id of Object.keys(diff)) {
      const l = plan.lekcije.find((x) => x.id === id);
      if (l) otvorene[l.cjelina] = true;
    }
  });

  function send() {
    posaljiUputu(uputa);
    uputa = "";
  }
</script>

<div class="page vc">
  <div class="steps">
    {#each KORACI as k, i}
      <button class="step" class:done={i < korak} class:cur={i === korak} onclick={() => (korak = i)}>
        <span class="dot">{#if i < korak}<Check size={12} />{:else}{i + 1}{/if}</span>{k}
      </button>
      {#if i < KORACI.length - 1}<ChevronRight size={14} class="sep" />{/if}
    {/each}
  </div>

  {#if korak === 0}
    <div class="center">
      <h1>Što već znaš?</h1>
      <p class="lead">Plan za <b>{plan.predmet}</b> ovo koristi bez posebne lekcije. Ako nešto ne znaš, dodat ćemo lekciju na početak.</p>
      <div class="pz-list">
        {#each plan.predznanje as p (p)}
          <div class="card pz">
            <span>{p}</span>
            <div class="pz-btns">
              <button class="btn" class:btn-primary={znam[p]} class:btn-ghost={!znam[p]} onclick={() => (znam[p] = true)}><Check size={14} /> Znam</button>
              <button class="btn btn-ghost" onclick={() => neZnam(p)}>Ne znam</button>
            </div>
          </div>
        {/each}
        <input class="inp" placeholder="Dodaj još nešto što znaš…" bind:value={novoPredznanje}
          onkeydown={(e) => e.key === "Enter" && (dodajPredznanje(novoPredznanje), (novoPredznanje = ""))} />
        {#if plan.lekcije.some((l) => l.cjelina === "P00")}
          <div class="note">Na početak plana dodano: {plan.lekcije.filter((l) => l.cjelina === "P00").map((l) => `„${l.naziv}“`).join(", ")}</div>
        {/if}
      </div>
      <button class="btn btn-primary btn-lg" onclick={() => (korak = 1)}>Dalje</button>
    </div>
  {/if}

  {#if korak === 1}
    <div class="center">
      <h1>Kako ćeš učiti?</h1>
      <div class="modes">
        <button class="card mode" class:sel={plan.nacin === "ucenje"} onclick={() => setNacin("ucenje")}>
          <b>Učenje gradiva</b>
          <span>Samo lekcije koncepata. Za kad vježbaš na probnim ispitima ili u školi.</span>
          <span class="dim">{plan.lekcije.length} lekcija</span>
        </button>
        <button class="card mode" class:sel={plan.nacin === "brza"} onclick={() => setNacin("brza")}>
          <b>Brza priprema</b>
          <span>Koncepti i lekcije primjene, za kad sve učiš i vježbaš ovdje.</span>
          <span class="dim">{plan.lekcije.length} lekcija + lekcije primjene</span>
        </button>
      </div>
      <div class="dim small">Možeš promijeniti kasnije bez gubitka napretka.</div>
      <button class="btn btn-primary btn-lg" onclick={() => (korak = 2)}>Dalje</button>
    </div>
  {/if}

  {#if korak === 2}
    <div class="plan-grid">
      <div class="card chat">
        <div class="chat-h"><Sparkles size={15} /> Uredi plan s AI-jem</div>
        <div class="msgs">
          <div class="msg ai">
            Napravio sam plan od {plan.lekcije.length} lekcija u {stablo.length} područja. Reci mi što promijeniti, npr.
            „spoji akceleraciju i usporavanje“, „lekcije o jedinicama ne trebaju mi“ ili „dodaj lekciju o vektorima prije sila“.
          </div>
          {#each plan.chat as m}
            <div class="msg {m.tko}">{m.tekst}</div>
          {/each}
          {#if plan.prijedlog}
            <div class="prop card">
              {#each plan.prijedlog.ops as o}
                <div class="op {o.op}">{o.op === "remove" ? "−" : o.op === "merge" ? "⇄" : "✎"} {o.opis}</div>
              {/each}
              <div class="dim small">Označeno u planu desno.</div>
              <div class="btns">
                <button class="btn btn-primary" onclick={prihvatiPrijedlog}>Prihvati</button>
                <button class="btn btn-ghost" onclick={odbaciPrijedlog}>Odbaci</button>
              </div>
            </div>
          {/if}
        </div>
        <div class="composer">
          <textarea class="inp" rows="2" bind:value={uputa} placeholder="Što da promijenim?"
            onkeydown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}></textarea>
          <button class="btn btn-primary" onclick={send}>Pošalji</button>
        </div>
      </div>

      <div class="card tree">
        <div class="tree-h">
          <b>Plan</b>
          <span class="dim small">{plan.lekcije.length} lekcija{#if plan.provjera === "u-tijeku"} · <span class="checking">provjera…</span>{/if}</span>
          <span class="badge" class:serious={ozbiljna.length}>{warns.length} upozorenja</span>
        </div>
        {#each stablo as p (p.id)}
          <div class="t-pod">{p.naziv}</div>
          {#each p.cjeline as c (c.id)}
            <button class="t-cj" onclick={() => (otvorene[c.id] = !otvorene[c.id])}>
              <ChevronRight size={13} class={otvorene[c.id] ? "rot" : ""} /> {c.naziv} <span class="dim">({c.lekcije.length})</span>
            </button>
            {#if otvorene[c.id]}
              {#each c.lekcije as l (l.id)}
                <div class="t-l {diff[l.id] ?? ''}" class:bad={warns.some((w) => w.id === l.id && VRSTE[w.vrsta].ozbiljno)}>
                  {#if editing === l.id}
                    <!-- svelte-ignore a11y_autofocus -->
                    <input class="inp sm" bind:value={editText} autofocus onblur={() => (rename(l.id, editText), (editing = null))}
                      onkeydown={(e) => e.key === "Enter" && (rename(l.id, editText), (editing = null))} />
                  {:else}
                    <span class="t-name">
                      {#if renameTo[l.id]}<s>{l.naziv}</s> → <ins>{renameTo[l.id]}</ins>{:else}{l.naziv}{/if}
                    </span>
                    <span class="t-act">
                      <button class="icon-btn" title="Preimenuj" onclick={() => ((editing = l.id), (editText = l.naziv))}><Pencil size={13} /></button>
                      <button class="icon-btn" title="Obriši" onclick={() => remove(l.id)}><Trash2 size={13} /></button>
                    </span>
                  {/if}
                </div>
              {/each}
            {/if}
          {/each}
        {/each}
      </div>
    </div>
    <div class="foot"><button class="btn btn-primary btn-lg" onclick={() => (korak = 3)}>Dalje na potvrdu</button></div>
  {/if}

  {#if korak === 3}
    <div class="center wide">
      <h1>Provjera prije potvrde</h1>
      <p class="lead">
        {plan.lekcije.length} lekcija · {plan.nacin === "brza" ? "brza priprema" : "učenje gradiva"} ·
        predznanje: {plan.predznanje.length} stavke
      </p>
      {#each poVrsti as [vrsta, lista]}
        <details class="card grp" open={VRSTE[vrsta].ozbiljno}>
          <summary class:serious={VRSTE[vrsta].ozbiljno}>
            <TriangleAlert size={14} /> {VRSTE[vrsta].label} <span class="badge">{lista.length}</span>
          </summary>
          {#each lista as w}
            <div class="w">
              {w.tekst}
              {#if w.detalj}<div class="dim small">{w.detalj}</div>{/if}
              {#if w.vrsta === "nulta"}<button class="btn btn-quiet sm" onclick={() => restore(w.pre)}>Vrati obrisanu lekciju</button>{/if}
            </div>
          {/each}
        </details>
      {/each}
      {#if ozbiljna.length}
        <label class="ack"><input type="checkbox" bind:checked={razumijem} /> Razumijem da plan ima {ozbiljna.length} ozbiljnih upozorenja i želim ga svejedno potvrditi.</label>
      {/if}
      <div class="card info">
        {plan.lekcije.length > 50
          ? "Prvih 5 lekcija bit će spremno za nekoliko minuta. Zbog velikog broja lekcija ostale se izrađuju do 24 h; javit ćemo ti e-mailom."
          : "Zadaci za sve lekcije bit će spremni za nekoliko minuta."}
      </div>
      {#if plan.status === "potvrden"}
        <div class="done"><Check size={16} /> Plan je potvrđen.</div>
      {:else}
        <button class="btn btn-primary btn-lg" disabled={ozbiljna.length > 0 && !razumijem} onclick={potvrdi}>Potvrdi plan</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .vc { max-width: 1240px; padding-bottom: 100px; }
  .steps { display: flex; align-items: center; gap: 8px; margin-bottom: 26px; flex-wrap: wrap; }
  .step { all: unset; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-faint); }
  .step.cur { color: var(--text); font-weight: 600; }
  .step.done { color: var(--text-dim); }
  .dot { width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center; font-size: 11px; border: 1px solid var(--border-strong); }
  .step.cur .dot { background: var(--primary); color: var(--on-primary); border-color: transparent; }
  .step.done .dot { background: var(--primary-dim); color: var(--primary); border-color: transparent; }
  :global(.sep) { color: var(--text-faint); }
  .center { max-width: 640px; margin: 0 auto; display: grid; gap: 16px; justify-items: start; }
  .center.wide { max-width: 760px; }
  h1 { font-size: 26px; font-weight: 600; margin: 0; }
  .lead { color: var(--text-dim); margin: 0; }
  .pz-list { display: grid; gap: 8px; width: 100%; }
  .pz { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; font-size: 14px; }
  .pz-btns { display: flex; gap: 6px; }
  .note { font-size: 12.5px; color: var(--primary); }
  .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
  .mode { all: unset; cursor: pointer; display: grid; gap: 6px; padding: 18px; font-size: 13px; color: var(--text-dim); background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--r-xl); }
  .mode b { color: var(--text); font-size: 15px; }
  .mode.sel { border-color: var(--primary); background: var(--primary-dim); }
  .dim { color: var(--text-faint); }
  .small { font-size: 12px; }
  .checking { color: var(--warn); }
  .plan-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; height: calc(100vh - 210px); }
  @media (max-width: 900px) { .plan-grid { grid-template-columns: 1fr; height: auto; } }
  .chat { display: flex; flex-direction: column; min-height: 0; }
  .chat-h { padding: 12px 14px; font-weight: 600; font-size: 14px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid var(--border); }
  .msgs { flex: 1; overflow: auto; padding: 14px; display: grid; gap: 10px; align-content: start; }
  .msg { font-size: 13px; padding: 9px 11px; border-radius: var(--r-lg); background: var(--bg-elev-2); max-width: 90%; }
  .msg.kreator { justify-self: end; background: var(--primary-dim); }
  .msg.sustav { background: none; color: var(--text-faint); font-size: 12px; padding: 0; }
  .prop { padding: 12px; display: grid; gap: 6px; }
  .op { font-size: 13px; }
  .op.remove { color: var(--danger); }
  .op.merge { color: var(--warn); }
  .op.rename { color: var(--success); }
  .btns { display: flex; gap: 8px; }
  .composer { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--border); align-items: flex-end; }
  .inp { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); color: var(--text); padding: 8px 10px; font-size: 13px; font-family: inherit; resize: none; }
  .inp.sm { padding: 4px 8px; font-size: 12.5px; }
  .tree { overflow: auto; padding: 10px 12px 14px; min-height: 0; }
  .tree-h { display: flex; gap: 10px; align-items: center; padding: 4px 4px 10px; position: sticky; top: -10px; background: var(--bg-elev); z-index: 1; }
  .badge.serious { color: var(--danger); border-color: var(--danger); }
  .t-pod { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin: 12px 4px 4px; }
  .t-cj { all: unset; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; padding: 4px; width: 100%; box-sizing: border-box; border-radius: 6px; }
  .t-cj:hover { background: var(--bg-hover); }
  :global(.rot) { transform: rotate(90deg); }
  .t-l { display: flex; justify-content: space-between; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-dim); padding: 3px 6px 3px 26px; border-radius: 6px; }
  .t-l:hover { background: var(--bg-hover); }
  .t-l .t-act { opacity: 0; display: flex; }
  .t-l:hover .t-act { opacity: 1; }
  .t-l.bad { color: var(--danger); }
  .t-l.remove { background: color-mix(in srgb, var(--danger) 14%, transparent); text-decoration: line-through; }
  .t-l.merge { background: color-mix(in srgb, var(--warn) 16%, transparent); }
  .t-l.rename { background: color-mix(in srgb, var(--success) 12%, transparent); }
  ins { color: var(--success); text-decoration: none; }
  .foot { display: flex; justify-content: flex-end; margin-top: 14px; }
  .grp { padding: 10px 14px; width: 100%; box-sizing: border-box; }
  .grp summary { cursor: pointer; display: flex; gap: 8px; align-items: center; font-weight: 600; font-size: 14px; color: var(--warn); }
  .grp summary.serious { color: var(--danger); }
  .w { font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--border); color: var(--text-dim); display: grid; gap: 4px; }
  .w:last-child { border-bottom: none; }
  .btn.sm { padding: 4px 8px; font-size: 12px; justify-self: start; }
  .ack { font-size: 13px; display: flex; gap: 8px; align-items: center; color: var(--danger); }
  .info { padding: 12px 14px; font-size: 13px; color: var(--text-dim); width: 100%; box-sizing: border-box; }
  .done { color: var(--success); display: flex; gap: 6px; align-items: center; font-weight: 600; }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
