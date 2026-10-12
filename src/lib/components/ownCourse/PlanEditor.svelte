<script>
  // Uređivanje plana vlastitog predmeta dok je nacrt (ticket „Pregled i uređivanje plana“, varijanta A
  // iz prototipa): popis lekcija redom učenja s izmjenama u retku, bočni stupac s predznanjem, upozorenjima
  // i kvotom. Nakon izmjena i 30 s pauze traži se ponovna provjera; upozorenja se tada osvježe.
  // Uputa AI-ju vraća prijedlog operacija koji se označi u popisu i prihvaća ili odbacuje u cjelini.
  import { onMount, onDestroy } from "svelte";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Merge from "@lucide/svelte/icons/merge";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import { apiClient } from "$lib/api/apiClient";

  let { courseId } = $props();

  const RECHECK_AFTER_MS = 30000;
  const base = `/own-courses/${courseId}`;

  let lessons = $state([]);
  let warnings = $state([]);
  let checking = $state(false);
  let assumed = $state([]);
  let quota = $state(null);
  let error = $state("");
  let open = $state(null);
  let editing = $state(null);
  let editText = $state("");
  let addingAfter = $state(null);
  let addText = $state("");
  let preSearch = $state("");
  let newAssumed = $state("");
  let grouped = $state(false);
  let showAllWarnings = $state(false);
  let flash = $state(null);
  let introDone = $state(true);
  let instruction = $state("");
  let proposal = $state(null); // { jobId, status, message, ops, error, warning }
  let changed = new Set();
  let recheckTimer;
  let pollTimer;
  let proposalTimer;

  let byId = $derived(Object.fromEntries(lessons.map((l) => [l.objectiveId, l])));
  let active = $derived(warnings.filter((w) => !w.ignored));
  let warnBy = $derived(active.reduce((m, w) => (w.objectiveId && (m[w.objectiveId] ??= []).push(w), m), {}));
  let units = $derived(
    lessons.reduce((list, l) => {
      const last = list[list.length - 1];
      if (grouped) {
        const u = list.find((x) => x.name === l.unit) ?? (list.push({ name: l.unit, area: l.area, lessons: [] }), list[list.length - 1]);
        u.lessons.push(l);
      } else if (last && last.name === l.unit) last.lessons.push(l);
      else list.push({ name: l.unit, area: l.area, lessons: [l] });
      return list;
    }, []),
  );
  // Oznake prijedloga po lekciji i nove lekcije po mjestu („top“ = početak plana).
  let marks = $derived(
    (proposal?.ops ?? []).reduce((m, o) => {
      if (o.op === "spoji") {
        m[o.a] = { kind: "merge", text: `prima „${byId[o.b]?.name ?? "?"}“` };
        m[o.b] = { kind: "merge", text: `spaja se u „${byId[o.a]?.name ?? "?"}“` };
      } else if (o.op === "preimenuj") m[o.id] = { kind: "rename", text: `novi naziv: „${o.naziv}“` };
      else if (o.op === "obrisi") m[o.id] = { kind: "delete", text: "briše se" };
      else if (o.op === "premjesti") m[o.id] = { kind: "move", text: o.iza ? `ide iza „${byId[o.iza]?.name ?? "?"}“` : "ide na početak" };
      return m;
    }, {}),
  );
  let additions = $derived(
    (proposal?.ops ?? []).filter((o) => o.op === "dodaj").reduce((m, o) => ((m[o.iza ?? "top"] ??= []).push(o.naziv), m), {}),
  );
  let quotaFull = $derived((quota?.usedPercent ?? 0) >= 100);
  let candidates = $derived(
    open && preSearch.trim().length > 1
      ? lessons.filter((l) => l.objectiveId !== open && l.name.toLowerCase().includes(preSearch.toLowerCase())).slice(0, 6)
      : [],
  );

  async function call(path, method = "GET", body) {
    const res = await apiClient(base + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = "Izmjena nije spremljena.";
      try { msg = (await res.json()).message || msg; } catch {}
      throw new Error(msg);
    }
    return res.status === 204 || res.status === 202 ? null : res.json();
  }

  async function loadPlan() {
    lessons = await call("/plan");
  }
  async function loadWarnings() {
    const r = await call("/warnings");
    warnings = r.warnings;
    checking = r.checking;
    clearTimeout(pollTimer);
    if (checking) pollTimer = setTimeout(loadWarnings, 4000);
  }
  async function loadAssumed() {
    assumed = await call("/assumed-knowledge");
  }

  async function loadQuota() {
    try {
      const q = await apiClient("/own-courses/quota", { method: "GET" });
      if (q.ok) quota = await q.json();
    } catch {}
  }

  onMount(async () => {
    introDone = localStorage.getItem(`mm-pz-${courseId}`) === "1";
    await Promise.all([loadPlan(), loadWarnings(), loadAssumed()]);
    await loadQuota();
  });
  onDestroy(() => {
    clearTimeout(pollTimer);
    clearTimeout(proposalTimer);
    // izmjene čije provjera još nije tražena šalju se odmah
    if (changed.size) recheck();
  });

  // Svaka izmjena: spremi, osvježi plan i odgodi ponovnu provjeru dok kreator ne napravi pauzu.
  async function change(fn, ids = []) {
    error = "";
    try {
      const result = await fn();
      for (const id of ids) if (id) changed.add(id);
      await loadPlan();
      clearTimeout(recheckTimer);
      recheckTimer = setTimeout(recheck, RECHECK_AFTER_MS);
      return result;
    } catch (e) {
      error = e.message;
    }
  }

  async function recheck() {
    clearTimeout(recheckTimer);
    const ids = [...changed];
    changed = new Set();
    try {
      await call("/recheck", "POST", { changed: ids });
      checking = true;
      clearTimeout(pollTimer);
      pollTimer = setTimeout(loadWarnings, 3000);
    } catch (e) {
      error = e.message;
    }
  }

  const rename = (l) => change(() => call(`/lessons/${l.objectiveId}`, "PATCH", { name: editText }), [l.objectiveId]).then(() => (editing = null));
  const move = (l, d) => change(() => call(`/lessons/${l.objectiveId}/move`, "POST", { direction: d }), [l.objectiveId]);
  const mergeNext = (l) => change(() => call(`/lessons/${l.objectiveId}/merge-next`, "POST"), [l.objectiveId]);
  async function removeLesson(l) {
    const r = await change(() => call(`/lessons/${l.objectiveId}`, "DELETE"));
    for (const id of r?.dependents ?? []) changed.add(id);
  }
  async function addBelow() {
    const name = addText.trim();
    if (!name) return;
    const after = addingAfter;
    addingAfter = null;
    addText = "";
    const r = await change(() => call("/lessons", "POST", { afterObjectiveId: after, name }));
    if (r?.objectiveId) goTo(r.objectiveId);
  }
  const togglePre = (l, p, add) =>
    change(() => (add ? call(`/lessons/${l.objectiveId}/prerequisites`, "POST", { prerequisiteId: p }) : call(`/lessons/${l.objectiveId}/prerequisites/${p}`, "DELETE")), [l.objectiveId]);

  async function notKnown(a) {
    const r = await change(() => call(`/assumed-knowledge/${a.assumedId}/not-known`, "POST"));
    await loadAssumed();
    if (r?.objectiveId) goTo(r.objectiveId);
  }
  async function addAssumed() {
    if (!newAssumed.trim()) return;
    await change(() => call("/assumed-knowledge", "POST", { text: newAssumed }));
    newAssumed = "";
    await loadAssumed();
  }
  async function ignore(w) {
    await call(`/warnings/${w.warningId}/ignore`, "POST");
    w.ignored = true;
  }

  // --- AI uputa ---

  async function sendInstruction() {
    const text = instruction.trim();
    if (!text || quotaFull) return;
    error = "";
    try {
      const r = await call("/instructions", "POST", { text });
      instruction = "";
      proposal = { jobId: r.jobId, status: "waiting" };
      pollProposal();
    } catch (e) {
      error = e.message;
    }
  }

  // „Dodaj lekciju“ uz nepokriven zadatak s ispita: isti prijedlog, ali se prihvaća sam.
  async function addLessonFor(w) {
    if (quotaFull) return;
    error = "";
    try {
      const r = await call(`/warnings/${w.warningId}/add-lesson`, "POST");
      proposal = { jobId: r.jobId, status: "waiting", warning: w };
      pollProposal();
    } catch (e) {
      error = e.message;
    }
  }

  async function pollProposal() {
    clearTimeout(proposalTimer);
    if (!proposal) return;
    const jobId = proposal.jobId;
    try {
      const r = await call(`/instructions/${jobId}`);
      if (proposal?.jobId !== jobId) return;
      proposal.status = r.status;
      if (r.status === "done") {
        proposal.message = r.proposal?.poruka ?? "";
        proposal.ops = r.proposal?.operacije ?? [];
        loadQuota();
        if (proposal.warning && proposal.ops.length) await accept();
        return;
      }
      if (r.status === "failed") {
        proposal.error = "AI nije uspio pripremiti prijedlog. Pokušaj ponovno.";
        return;
      }
      if (r.status === "waiting_quota") {
        proposal.error = "Mjesečna kvota je potrošena; prijedlog će se izraditi nakon obnove.";
        return;
      }
    } catch (e) {
      error = e.message;
    }
    proposalTimer = setTimeout(pollProposal, 2000);
  }

  async function accept() {
    const p = proposal;
    const r = await change(() => call(`/instructions/${p.jobId}/accept`, "POST"));
    if (!r) return;
    for (const id of r.changed ?? []) changed.add(id);
    if (p.warning) await ignore(p.warning);
    proposal = null;
  }

  function discard() {
    clearTimeout(proposalTimer);
    proposal = null;
  }

  function describe(o) {
    const n = (id) => `„${byId[id]?.name ?? "?"}“`;
    if (o.op === "spoji") return `Spoji ${n(o.b)} u ${n(o.a)}`;
    if (o.op === "preimenuj") return `Preimenuj ${n(o.id)} u „${o.naziv}“`;
    if (o.op === "obrisi") return `Obriši ${n(o.id)}`;
    if (o.op === "dodaj") return `Dodaj „${o.naziv}“ ${o.iza ? `iza ${n(o.iza)}` : "na početak"}`;
    return `Premjesti ${n(o.id)} ${o.iza ? `iza ${n(o.iza)}` : "na početak"}`;
  }

  function goTo(id) {
    if (!id) return;
    open = id;
    flash = id;
    setTimeout(() => document.getElementById(`lesson-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => (flash = null), 1600);
  }
  function finishIntro() {
    localStorage.setItem(`mm-pz-${courseId}`, "1");
    introDone = true;
  }
</script>

{#if !introDone}
  <!-- Prvi put: predznanje kao kratki prvi korak -->
  <div class="card card-pad intro">
    <h2>Što već znaš?</h2>
    <p class="muted">Plan ovo koristi bez posebne lekcije. Ako nešto ne znaš, dodat ćemo lekciju na početak plana.</p>
    {#each assumed as a (a.assumedId)}
      <div class="pz">
        <span>{a.text}</span>
        <button class="btn btn-ghost sm" onclick={() => notKnown(a)}>Ne znam</button>
      </div>
    {/each}
    <div class="actions"><button class="btn btn-primary" onclick={finishIntro}>Znam sve ovo, dalje</button></div>
  </div>
{:else}
  <div class="editor">
    <main>
      <div class="toolbar">
        <span class="muted small">{lessons.length} lekcija</span>
        <label class="small"><input type="checkbox" bind:checked={grouped} /> Grupiraj po cjelinama</label>
      </div>
      {#if error}<div class="err small">{error}</div>{/if}
      {#each additions.top ?? [] as name}
        <div class="card ghost">+ {name} <span class="muted small">nova lekcija na početku</span></div>
      {/each}

      {#each units as u}
        <div class="card unit">
          <div class="unit-h"><span>{u.name}</span><span class="muted small">{u.area}</span></div>
          {#each u.lessons as l (l.objectiveId)}
            {@const w = warnBy[l.objectiveId] ?? []}
            {@const mark = marks[l.objectiveId]}
            <div class="row {mark ? `p-${mark.kind}` : ''}" class:open={open === l.objectiveId} class:flash={flash === l.objectiveId} id={`lesson-${l.objectiveId}`}>
              <div class="row-main">
                <span class="num">{l.position}</span>
                <div class="body">
                  {#if editing === l.objectiveId}
                    <!-- svelte-ignore a11y_autofocus -->
                    <input class="inp" bind:value={editText} autofocus
                      onkeydown={(e) => (e.key === "Enter" ? rename(l) : e.key === "Escape" && (editing = null))}
                      onblur={() => editing === l.objectiveId && rename(l)} />
                  {:else}
                    <button class="title" onclick={() => (open = open === l.objectiveId ? null : l.objectiveId)}>
                      {l.name}
                      {#if w.some((x) => x.serious)}<TriangleAlert size={14} class="warn-ic" />{/if}
                    </button>
                  {/if}
                  {#if mark}<div class="mark">{mark.text}</div>{/if}
                  {#if l.concept}<div class="concept">{l.concept}</div>{/if}
                  <div class="meta">
                    {#if l.items.length}<span>{l.items.length} stavki</span>{:else}<span class="busy">AI izrađuje stavke…</span>{/if}
                    {#if grouped}<span>· {l.unit}</span>{/if}
                    {#if l.prerequisites.length}
                      <span>· treba:</span>
                      {#each l.prerequisites.slice(0, 3) as p}
                        <button class="pre" onclick={() => goTo(p)}>{byId[p]?.name ?? "?"}</button>
                      {/each}
                      {#if l.prerequisites.length > 3}<span>+{l.prerequisites.length - 3}</span>{/if}
                    {/if}
                  </div>
                </div>
                <div class="acts">
                  <button class="icon-btn" title="Gore" onclick={() => move(l, -1)}><ArrowUp size={15} /></button>
                  <button class="icon-btn" title="Dolje" onclick={() => move(l, 1)}><ArrowDown size={15} /></button>
                  <button class="icon-btn" title="Preimenuj" onclick={() => ((editing = l.objectiveId), (editText = l.name))}><Pencil size={15} /></button>
                  {#if l.position < lessons.length}
                    <button class="icon-btn" title="Spoji sa sljedećom" onclick={() => mergeNext(l)}><Merge size={15} /></button>
                  {/if}
                  <button class="icon-btn" title="Dodaj lekciju ispod" onclick={() => (addingAfter = l.objectiveId)}><Plus size={15} /></button>
                  <button class="icon-btn danger" title="Obriši" onclick={() => removeLesson(l)}><Trash2 size={15} /></button>
                </div>
              </div>

              {#if open === l.objectiveId}
                <div class="detail">
                  {#each w as x (x.warningId)}
                    <div class="w-inline" class:serious={x.serious}><TriangleAlert size={13} /> {x.text}</div>
                  {/each}
                  <div>
                    <div class="label">Stavke znanja</div>
                    {#if l.items.length}<ul>{#each l.items as it}<li>{it}</li>{/each}</ul>
                    {:else}<div class="muted small">AI ih izrađuje; pojavit će se za koji trenutak.</div>{/if}
                  </div>
                  <div>
                    <div class="label">Preduvjeti</div>
                    <div class="chips">
                      {#each l.prerequisites as p}
                        <span class="chip">{byId[p]?.name ?? "?"}<button class="x" title="Ukloni" onclick={() => togglePre(l, p, false)}><X size={12} /></button></span>
                      {/each}
                    </div>
                    <input class="inp sm" placeholder="Dodaj preduvjet: upiši dio naziva…" bind:value={preSearch} />
                    {#each candidates as k (k.objectiveId)}
                      <button class="cand" onclick={() => { togglePre(l, k.objectiveId, true); preSearch = ""; }}>
                        <Plus size={12} /> {k.name} <span class="muted">({k.position}.)</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
            {#each additions[l.objectiveId] ?? [] as name}
              <div class="row ghost-row">+ {name} <span class="muted small">nova lekcija</span></div>
            {/each}
            {#if addingAfter === l.objectiveId}
              <div class="row add-row">
                <!-- svelte-ignore a11y_autofocus -->
                <input class="inp" placeholder="Naziv nove lekcije" bind:value={addText} autofocus
                  onkeydown={(e) => (e.key === "Enter" ? addBelow() : e.key === "Escape" && (addingAfter = null))} />
                <button class="btn btn-primary" onclick={addBelow}>Dodaj</button>
                <button class="btn btn-quiet" onclick={() => (addingAfter = null)}>Odustani</button>
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    </main>

    <aside>
      <div class="card side">
        <div class="side-h"><Sparkles size={14} /> Uputa AI-ju</div>
        {#if !proposal}
          <textarea class="inp sm" rows="3" maxlength="1000" placeholder="Npr. spoji lekcije o akceleraciji i usporavanju" bind:value={instruction}
            onkeydown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && sendInstruction()}></textarea>
          <button class="btn btn-primary sm" disabled={!instruction.trim() || quotaFull} onclick={sendInstruction}>Pošalji</button>
          {#if quotaFull}<div class="muted small">Mjesečna kvota je potrošena.</div>{/if}
        {:else if proposal.error}
          <div class="err small">{proposal.error}</div>
          <button class="btn btn-quiet sm" onclick={discard}>Zatvori</button>
        {:else if proposal.status !== "done"}
          <div class="busy small">{proposal.warning ? "AI traži mjesto za novu lekciju…" : "AI priprema prijedlog…"}</div>
        {:else}
          {#if proposal.message}<div class="small">{proposal.message}</div>{/if}
          {#if proposal.ops.length}
            <ul class="ops">{#each proposal.ops as o}<li>{describe(o)}</li>{/each}</ul>
            <div class="muted small">Izmjene su označene u planu.</div>
            <div class="row-btns">
              <button class="btn btn-primary sm" onclick={accept}>Prihvati</button>
              <button class="btn btn-quiet sm" onclick={discard}>Odbaci</button>
            </div>
          {:else}
            <div class="muted small">Nema izmjena za predložiti.</div>
            <button class="btn btn-quiet sm" onclick={discard}>Zatvori</button>
          {/if}
        {/if}
      </div>

      <div class="card side">
        <div class="side-h">Pretpostavljeno predznanje</div>
        <div class="muted small">Plan ovo koristi bez lekcije. Ako nešto ne znaš, prebaci to u plan.</div>
        {#each assumed as a (a.assumedId)}
          <div class="pz"><span>{a.text}</span><button class="btn btn-quiet sm" onclick={() => notKnown(a)}>Ipak ne znam</button></div>
        {/each}
        <input class="inp sm" placeholder="Dodaj što već znaš…" bind:value={newAssumed} onkeydown={(e) => e.key === "Enter" && addAssumed()} />
      </div>

      <div class="card side">
        <div class="side-h">
          Upozorenja <span class="badge" class:serious={active.some((w) => w.serious)}>{active.length}</span>
          {#if checking}<span class="busy small">provjera…</span>{/if}
        </div>
        {#if !active.length}<div class="muted small">{checking ? "Provjeravam plan…" : "Nema upozorenja."}</div>{/if}
        {#each showAllWarnings ? active : active.slice(0, 6) as w (w.warningId)}
          <div class="warn" class:serious={w.serious}>
            <button class="warn-t" onclick={() => goTo(w.objectiveId)} title={w.detail ?? ""}>{w.text}</button>
            {#if w.detail}<div class="muted small">{w.detail}</div>{/if}
            <div class="row-btns">
              {#if w.kind === "ispit"}
                <button class="btn btn-ghost sm" disabled={!!proposal || quotaFull} onclick={() => addLessonFor(w)}>Dodaj lekciju</button>
              {/if}
              <button class="btn btn-quiet sm" onclick={() => ignore(w)}>Zanemari</button>
            </div>
          </div>
        {/each}
        {#if active.length > 6}
          <button class="btn btn-quiet sm" onclick={() => (showAllWarnings = !showAllWarnings)}>
            {showAllWarnings ? "Prikaži manje" : `Prikaži sve (${active.length})`}
          </button>
        {/if}
      </div>

      {#if quota}
        <div class="card side">
          <div class="small">Iskorišteno <b>{quota.usedPercent} %</b> mjesečne kvote</div>
          <div class="qbar"><span style="width:{quota.usedPercent}%" class:hot={quota.usedPercent >= 80}></span></div>
        </div>
      {/if}
    </aside>
  </div>
{/if}

<style>
  .muted { color: var(--text-dim); }
  .small { font-size: 12.5px; }
  .err { color: var(--danger); margin-bottom: 8px; }
  .busy { color: var(--warn); }
  .intro { display: grid; gap: 10px; }
  .intro h2 { margin: 0; font-size: 20px; font-weight: 600; }
  .intro p { margin: 0; }
  .actions { display: flex; justify-content: flex-end; }
  .editor { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; align-items: start; margin-top: 16px; }
  @media (max-width: 960px) { .editor { grid-template-columns: 1fr; } }
  .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .toolbar label { display: flex; gap: 6px; align-items: center; cursor: pointer; }
  .unit { margin-bottom: 10px; overflow: hidden; }
  .unit-h { display: flex; justify-content: space-between; gap: 10px; padding: 9px 14px; font-weight: 600; font-size: 13.5px; border-bottom: 1px solid var(--border); background: var(--bg-elev-2); }
  .row { border-bottom: 1px solid var(--border); }
  .row:last-child { border-bottom: none; }
  .row.flash { background: var(--primary-dim); transition: background 0.4s; }
  .row-main { display: flex; gap: 10px; padding: 10px 14px; align-items: flex-start; }
  .row:hover .acts, .row.open .acts { opacity: 1; }
  .num { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); width: 26px; padding-top: 3px; flex-shrink: 0; }
  .body { flex: 1; min-width: 0; }
  .title { all: unset; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; gap: 6px; align-items: center; }
  .title:hover { color: var(--primary); }
  :global(.warn-ic) { color: var(--danger); }
  .concept { font-size: 12px; color: var(--text-dim); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .row.open .concept { -webkit-line-clamp: unset; line-clamp: unset; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 11px; color: var(--text-faint); margin-top: 4px; }
  .pre { all: unset; cursor: pointer; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-dim); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .acts { display: flex; gap: 2px; opacity: 0.25; transition: opacity 0.12s; flex-shrink: 0; }
  @media (hover: none) { .acts { opacity: 1; } }
  .icon-btn.danger:hover { color: var(--danger); }
  .detail { padding: 4px 14px 14px 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 700px) { .detail { grid-template-columns: 1fr; padding-left: 14px; } }
  .w-inline { grid-column: 1 / -1; font-size: 12px; color: var(--warn); display: flex; gap: 6px; align-items: center; }
  .w-inline.serious { color: var(--danger); }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin-bottom: 6px; }
  .detail ul { margin: 0; padding-left: 16px; font-size: 12.5px; color: var(--text-dim); display: grid; gap: 4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .chip { cursor: default; }
  .x { all: unset; cursor: pointer; display: grid; place-items: center; }
  .cand { all: unset; cursor: pointer; display: flex; gap: 6px; align-items: center; font-size: 12px; padding: 4px 6px; border-radius: 6px; color: var(--text-dim); }
  .cand:hover { background: var(--bg-hover); color: var(--text); }
  .add-row { display: flex; gap: 8px; padding: 10px 14px 10px 50px; background: var(--bg-elev-2); }
  .inp { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); color: var(--text); padding: 7px 10px; font-size: 13px; font-family: inherit; }
  .inp:focus { outline: none; border-color: var(--primary-border); }
  .inp.sm { font-size: 12px; padding: 6px 9px; }
  aside { position: sticky; top: 16px; display: grid; gap: 12px; max-height: calc(100vh - 32px); overflow: auto; }
  .side { padding: 14px; display: grid; gap: 8px; }
  .side-h { font-weight: 600; font-size: 13px; display: flex; gap: 6px; align-items: center; }
  .badge.serious { color: var(--danger); border-color: var(--danger); }
  .pz { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12.5px; padding: 4px 0; border-bottom: 1px dashed var(--border); }
  .btn.sm { padding: 4px 8px; font-size: 11.5px; }
  .warn { display: grid; gap: 4px; justify-items: start; font-size: 12px; padding: 7px 9px; border-radius: var(--r-md); border-left: 3px solid var(--warn); background: var(--bg-elev-2); }
  .warn.serious { border-left-color: var(--danger); }
  .warn-t { all: unset; cursor: pointer; color: var(--text-dim); }
  .warn-t:hover { color: var(--text); }
  .row-btns { display: flex; gap: 6px; flex-wrap: wrap; }
  .ops { margin: 0; padding-left: 16px; font-size: 12.5px; display: grid; gap: 3px; }
  textarea.inp { resize: vertical; }
  .mark { font-size: 11.5px; font-weight: 500; margin-top: 2px; }
  .row.p-merge { background: color-mix(in srgb, var(--warn) 12%, transparent); }
  .row.p-merge .mark { color: var(--warn); }
  .row.p-rename .mark, .row.p-move .mark { color: var(--success); }
  .row.p-rename { background: color-mix(in srgb, var(--success) 10%, transparent); }
  .row.p-move { background: color-mix(in srgb, var(--primary) 8%, transparent); }
  .row.p-delete { background: color-mix(in srgb, var(--danger) 10%, transparent); }
  .row.p-delete .title { text-decoration: line-through; color: var(--text-dim); }
  .row.p-delete .mark { color: var(--danger); }
  .ghost, .ghost-row { padding: 9px 14px 9px 50px; font-size: 13.5px; font-weight: 500; color: var(--success);
    background: color-mix(in srgb, var(--success) 10%, transparent); border-bottom: 1px solid var(--border); }
  .ghost { margin-bottom: 10px; padding-left: 14px; }
  .qbar { height: 5px; border-radius: 99px; background: var(--bg-elev-2); overflow: hidden; }
  .qbar span { display: block; height: 100%; background: var(--primary); }
  .qbar span.hot { background: var(--warn); }
</style>
