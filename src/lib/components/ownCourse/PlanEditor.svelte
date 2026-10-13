<script>
  // Uređivanje plana vlastitog predmeta dok je nacrt (ticket „Pregled i uređivanje plana“, varijanta A
  // iz prototipa): popis lekcija redom učenja s izmjenama u retku, bočni stupac s predznanjem, upozorenjima
  // i kvotom. Nakon izmjena i 30 s pauze traži se ponovna provjera; upozorenja se tada osvježe.
  // Uputa AI-ju vraća prijedlog operacija koji se označi u popisu i prihvaća ili odbacuje u cjelini.
  // Prije uređivanja kreator jednom bira način učenja; brza priprema dodaje lekcije primjene.
  // Potvrda zaključava plan; nakon nje (locked) ostaje samo popis s preimenovanjem lekcija.
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

  let { courseId, locked = false, onconfirmed } = $props();

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
  let mode = $state(null); // { mode, examDate, conceptLessons, maxQuickLessons, applications }
  let pick = $state("ucenje_gradiva");
  let examDate = $state("");
  let choosing = $state(false);
  let confirming = $state(false);
  let seriousOk = $state(false);
  let confirmBusy = $state(false);
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
  // Stavka po id-u (tekst i lekcija), za prijedloge koji mijenjaju stavke.
  let itemById = $derived(
    Object.fromEntries(lessons.flatMap((l) => (l.itemIds ?? []).map((id, i) => [id, { text: l.items[i], lesson: l.objectiveId }]))),
  );
  const shortText = (t) => (t && t.length > 60 ? t.slice(0, 57) + "…" : (t ?? "?"));
  // Oznake prijedloga po lekciji i nove lekcije po mjestu („top“ = početak plana).
  let marks = $derived(
    (proposal?.ops ?? []).reduce((m, o) => {
      const name = (id) => byId[id]?.name ?? "?";
      const from = itemById[o.stavka]?.lesson;
      if (o.op === "spoji") {
        m[o.a] = { kind: "merge", text: `prima „${byId[o.b]?.name ?? "?"}“` };
        m[o.b] = { kind: "merge", text: `spaja se u „${byId[o.a]?.name ?? "?"}“` };
      } else if (o.op === "preimenuj") m[o.id] = { kind: "rename", text: `novi naziv: „${o.naziv}“` };
      else if (o.op === "obrisi") m[o.id] = { kind: "delete", text: "briše se" };
      else if (o.op === "premjesti") m[o.id] = { kind: "move", text: o.iza ? `ide iza „${byId[o.iza]?.name ?? "?"}“` : "ide na početak" };
      else if (o.op === "prepravi_stavku" && from) m[from] = { kind: "rename", text: `prepravlja se stavka: „${shortText(o.tekst)}“` };
      else if (o.op === "premjesti_stavku" && from) {
        m[from] = { kind: "move", text: `stavka „${shortText(itemById[o.stavka]?.text)}“ odlazi u „${name(o.u)}“` };
        m[o.u] = { kind: "move", text: `dobiva stavku iz „${name(from)}“` };
      } else if (o.op === "dodaj_stavku") m[o.id] = { kind: "rename", text: `nova stavka: „${shortText(o.tekst)}“` };
      else if (o.op === "dodaj_preduvjet") m[o.id] = { kind: "rename", text: `novi preduvjet „${name(o.preduvjet)}“` };
      else if (o.op === "ukloni_preduvjet") m[o.id] = { kind: "delete", text: `više ne treba „${name(o.preduvjet)}“` };
      return m;
    }, {}),
  );
  let additions = $derived(
    (proposal?.ops ?? []).filter((o) => o.op === "dodaj").reduce((m, o) => ((m[o.iza ?? "top"] ??= []).push(o.naziv), m), {}),
  );
  let concepts = $derived(lessons.filter((l) => l.kind !== "primjena").length);
  let quickBlocked = $derived(mode && mode.conceptLessons > mode.maxQuickLessons);
  let today = new Date().toLocaleDateString("sv-SE");
  const KIND_LABELS = {
    nulta: "Lekcija koristi nešto što plan još nije naučio",
    redoslijed: "Redoslijed lekcija",
    ispit: "Zadaci s ispita koje plan ne pokriva",
  };
  let warningGroups = $derived(
    Object.entries(active.reduce((m, w) => ((m[w.kind] ??= []).push(w), m), {})).sort(
      ([, a], [, b]) => b.filter((w) => w.serious).length - a.filter((w) => w.serious).length,
    ),
  );
  let hasSerious = $derived(active.some((w) => w.serious));
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
    // prazno tijelo (npr. void endpoint vraća 200 bez sadržaja) nije greška
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function loadPlan() {
    lessons = await call("/plan");
  }
  async function loadMode() {
    mode = await call("/learning-mode");
  }
  async function loadWarnings() {
    const r = await call("/warnings");
    warnings = r.warnings;
    // kad provjera (ili izrada lekcija primjene) završi, plan se mogao promijeniti
    if (checking && !r.checking) await Promise.all([loadPlan(), loadMode()]);
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
    if (locked) return loadPlan();
    introDone = localStorage.getItem(`mm-pz-${courseId}`) === "1";
    await Promise.all([loadPlan(), loadWarnings(), loadAssumed(), loadMode()]);
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
      await loadPlan();
      if (locked) return result; // potvrđen plan se više ne provjerava
      for (const id of ids) if (id) changed.add(id);
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
  // Popravak jednog ozbiljnog upozorenja kodom (kao pri izradi plana); rezultat stiže s ponovnom provjerom.
  const fixable = (w) => w.serious && (w.kind === "nulta" || w.kind === "redoslijed");
  let fixing = $state({});
  async function fix(w) {
    error = "";
    fixing[w.warningId] = true;
    try {
      await call(`/warnings/${w.warningId}/fix`, "POST");
      checking = true;
      clearTimeout(pollTimer);
      pollTimer = setTimeout(loadWarnings, 3000);
    } catch (e) {
      error = e.message;
      fixing[w.warningId] = false;
    }
  }

  async function ignore(w) {
    await call(`/warnings/${w.warningId}/ignore`, "POST");
    w.ignored = true;
  }

  // --- potvrda plana ---

  function openConfirm() {
    // izmjene koje još čekaju provjeru šalju se odmah, da potvrda vidi svježa upozorenja
    if (changed.size) recheck();
    seriousOk = false;
    confirming = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmPlan() {
    confirmBusy = true;
    error = "";
    try {
      await call("/confirm", "POST", { seriousAccepted: seriousOk });
      confirming = false;
      onconfirmed?.();
    } catch (e) {
      error = e.message;
    }
    confirmBusy = false;
  }

  // --- način učenja ---

  async function chooseMode() {
    if (pick === "brza_priprema" && (!examDate || quickBlocked)) return;
    choosing = true;
    error = "";
    try {
      mode = await call("/learning-mode", "POST", { mode: pick, examDate: examDate || null });
      if (pick === "brza_priprema") {
        checking = true;
        clearTimeout(pollTimer);
        pollTimer = setTimeout(loadWarnings, 3000);
      }
    } catch (e) {
      error = e.message;
    }
    choosing = false;
  }

  async function retryApplications() {
    await call("/retry", "POST").catch((e) => (error = e.message));
    mode.applications = "waiting";
    checking = true;
    clearTimeout(pollTimer);
    pollTimer = setTimeout(loadWarnings, 3000);
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("hr-HR") : "");

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
    if (o.op === "prepravi_stavku") return `Prepravi stavku u ${n(itemById[o.stavka]?.lesson)}: „${o.tekst}“`;
    if (o.op === "premjesti_stavku")
      return `Premjesti stavku „${shortText(itemById[o.stavka]?.text)}“ iz ${n(itemById[o.stavka]?.lesson)} u ${n(o.u)}`;
    if (o.op === "dodaj_stavku") return `Dodaj stavku u ${n(o.id)}: „${o.tekst}“`;
    if (o.op === "dodaj_preduvjet") return `${n(o.id)} dobiva preduvjet ${n(o.preduvjet)}`;
    if (o.op === "ukloni_preduvjet") return `${n(o.id)} više ne treba ${n(o.preduvjet)}`;
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

{#if !locked && !introDone}
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
{:else if !locked && mode && !mode.mode}
  <!-- Način učenja: bira se jednom, kad je poznat broj lekcija koncepata -->
  <div class="card card-pad choose">
    <h2>Kako želiš učiti?</h2>
    <p class="muted">Plan ima <b>{mode.conceptLessons}</b> lekcija koncepata. Način se poslije ne može promijeniti; za drugi način napravi novi predmet.</p>
    <div class="modes">
      <button class="mode" class:on={pick === "ucenje_gradiva"} onclick={() => (pick = "ucenje_gradiva")}>
        <b>Učenje gradiva</b>
        <span>Samo lekcije koncepata, za dugoročno učenje. Razne tipove zadataka vježbaš kasnije.</span>
      </button>
      <button class="mode" class:on={pick === "brza_priprema"} disabled={quickBlocked} onclick={() => (pick = "brza_priprema")}>
        <b>Brza priprema</b>
        <span>Ispit je blizu: uz lekcije koncepata dobiješ i lekcije primjene, pa odmah vježbaš tipove zadataka s testa.</span>
        {#if quickBlocked}
          <span class="blocked">Gradivo ima {mode.conceptLessons} lekcija; brza priprema moguća je do {mode.maxQuickLessons}. Podijeli materijal na manje dijelove ili odaberi učenje gradiva.</span>
        {/if}
      </button>
    </div>
    <label class="date">
      <span>Datum testa{pick === "brza_priprema" ? "" : " (nije obavezno)"}</span>
      <input class="inp" type="date" min={today} bind:value={examDate} />
      <span class="muted small">Ponavljanje se sažme tako da sve stigne prije testa.</span>
    </label>
    {#if error}<div class="err small">{error}</div>{/if}
    <div class="actions">
      <button class="btn btn-primary" disabled={choosing || (pick === "brza_priprema" && !examDate)} onclick={chooseMode}>
        {pick === "brza_priprema" ? "Odaberi brzu pripremu" : "Odaberi učenje gradiva"}
      </button>
    </div>
  </div>
{:else}
  <div class="editor" class:locked>
    <main>
      <div class="toolbar">
        <span class="muted small">
          {concepts} lekcija koncepata{#if lessons.length > concepts}{" · "}{lessons.length - concepts} primjene{/if}{#if mode?.mode}{" · "}{mode.mode === "brza_priprema" ? "brza priprema" : "učenje gradiva"}{/if}{#if mode?.examDate}{" · "}test {formatDate(mode.examDate)}{/if}
        </span>
        <label class="small"><input type="checkbox" bind:checked={grouped} /> Grupiraj po cjelinama</label>
      </div>
      {#if error}<div class="err small">{error}</div>{/if}
      {#if mode?.applications === "failed"}
        <div class="card card-pad notice">
          Izrada lekcija primjene nije uspjela.
          <button class="btn btn-ghost sm" onclick={retryApplications}>Pokušaj ponovno</button>
        </div>
      {:else if mode?.mode === "brza_priprema" && mode.applications && mode.applications !== "done"}
        <div class="card card-pad notice busy">AI dodaje lekcije primjene (tipove zadataka s testa)…</div>
      {/if}
      {#if confirming}
        <div class="card card-pad confirm">
          <h3>Potvrda plana</h3>
          <p><b>Nakon potvrde plan se više ne može mijenjati</b>; moći ćeš samo preimenovati lekcije.</p>
          <p class="muted small">
            {#if lessons.length > 50}
              Prvih 5 lekcija bit će spremno za nekoliko minuta, a ostale do 24 h. Javit ćemo ti e-mailom kad sve bude gotovo.
            {:else}
              AI će napisati prvi zadatak za svaku od {lessons.length} lekcija; to traje nekoliko minuta.
            {/if}
          </p>
          {#if checking}<div class="busy small">Provjera plana još traje; potvrda je moguća kad završi.</div>{/if}
          {#each warningGroups as [kind, list]}
            <details class="group" open={list.some((w) => w.serious)}>
              <summary>
                {KIND_LABELS[kind] ?? "Ostalo"} <span class="badge" class:serious={list.some((w) => w.serious)}>{list.length}</span>
              </summary>
              {#each list as w (w.warningId)}<div class="small" class:sev={w.serious}>{w.text}</div>{/each}
            </details>
          {/each}
          {#if !active.length && !checking}<div class="muted small">Plan nema upozorenja.</div>{/if}
          {#if hasSerious}
            <label class="small ack">
              <input type="checkbox" bind:checked={seriousOk} /> Pregledao sam ozbiljna upozorenja i svejedno potvrđujem plan.
            </label>
          {/if}
          <div class="actions">
            <button class="btn btn-quiet" onclick={() => (confirming = false)}>Natrag na uređivanje</button>
            <button class="btn btn-primary" disabled={confirmBusy || checking || !!proposal || (hasSerious && !seriousOk)} onclick={confirmPlan}>
              {confirmBusy ? "Potvrđujem…" : "Potvrdi plan"}
            </button>
          </div>
        </div>
      {/if}
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
                    {#if l.kind === "primjena"}<span class="tag">primjena · {l.applicationType}</span>
                    {:else if l.items.length}<span>{l.items.length} stavki</span>{:else}<span class="busy">AI izrađuje stavke…</span>{/if}
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
                  {#if locked}
                    <button class="icon-btn" title="Preimenuj" onclick={() => ((editing = l.objectiveId), (editText = l.name))}><Pencil size={15} /></button>
                  {:else}
                  <button class="icon-btn" title="Gore" onclick={() => move(l, -1)}><ArrowUp size={15} /></button>
                  <button class="icon-btn" title="Dolje" onclick={() => move(l, 1)}><ArrowDown size={15} /></button>
                  <button class="icon-btn" title="Preimenuj" onclick={() => ((editing = l.objectiveId), (editText = l.name))}><Pencil size={15} /></button>
                  {#if l.position < lessons.length}
                    <button class="icon-btn" title="Spoji sa sljedećom" onclick={() => mergeNext(l)}><Merge size={15} /></button>
                  {/if}
                  <button class="icon-btn" title="Dodaj lekciju ispod" onclick={() => (addingAfter = l.objectiveId)}><Plus size={15} /></button>
                  <button class="icon-btn danger" title="Obriši" onclick={() => removeLesson(l)}><Trash2 size={15} /></button>
                  {/if}
                </div>
              </div>

              {#if open === l.objectiveId}
                <div class="detail">
                  {#each w as x (x.warningId)}
                    <div class="w-inline" class:serious={x.serious}>
                      <TriangleAlert size={13} /> <span>{x.text}</span>
                      {#if fixable(x)}
                        <button class="btn btn-ghost sm" disabled={fixing[x.warningId] || checking || quotaFull} onclick={() => fix(x)}>
                          {fixing[x.warningId] ? "Popravljam…" : "Popravi"}
                        </button>
                      {/if}
                    </div>
                  {/each}
                  <div>
                    {#if l.kind === "primjena"}
                      <div class="label">Primjer situacije</div>
                      <div class="small muted">{l.exampleSituation || "—"}</div>
                    {:else}
                    <div class="label">Stavke znanja</div>
                    {#if l.items.length}<ul>{#each l.items as it}<li>{it}</li>{/each}</ul>
                    {:else}<div class="muted small">AI ih izrađuje; pojavit će se za koji trenutak.</div>{/if}
                    {/if}
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

    {#if !locked}
    <aside>
      <div class="card side">
        <div class="side-h">Potvrda plana</div>
        <div class="muted small">Kad je plan kakav želiš, potvrdi ga i krećemo s izradom zadataka.</div>
        <button class="btn btn-primary sm" disabled={!mode?.mode || confirming} onclick={openConfirm}>Potvrdi plan…</button>
      </div>

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
              {#if fixable(w)}
                <button class="btn btn-ghost sm" disabled={fixing[w.warningId] || checking || quotaFull} onclick={() => fix(w)}>
                  {fixing[w.warningId] ? "Popravljam…" : "Popravi"}
                </button>
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
    {/if}
  </div>
{/if}

<style>
  .muted { color: var(--text-dim); }
  .small { font-size: 12.5px; }
  .err { color: var(--danger); margin-bottom: 8px; }
  .busy { color: var(--warn); }
  .intro { display: grid; gap: 10px; }
  .intro h2 { margin: 0; font-size: 17px; font-weight: 500; }
  .intro p { margin: 0; }
  .actions { display: flex; justify-content: flex-end; }
  .editor { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; align-items: start; }
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
  .label { font-size: 12.5px; font-weight: 500; color: var(--text); margin-bottom: 6px; }
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
  .side > .btn.sm { justify-content: center; padding: 8px 12px; font-size: 12.5px; }
  .side-h { font-weight: 600; font-size: 13px; display: flex; gap: 6px; align-items: center; }
  .badge.serious { color: var(--danger); border-color: var(--danger); }
  .pz { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12.5px; padding: 4px 0; border-bottom: 1px dashed var(--border); }
  .btn.sm { padding: 4px 8px; font-size: 11.5px; }
  .warn { display: grid; gap: 4px; justify-items: start; font-size: 12px; padding: 7px 9px; border-radius: var(--r-md); border-left: 3px solid var(--warn); background: var(--bg-elev-2); }
  .warn.serious { border-left-color: var(--danger); }
  .warn-t { all: unset; cursor: pointer; color: var(--text-dim); }
  .warn-t:hover { color: var(--text); }
  .choose { display: grid; gap: 14px; max-width: 720px; }
  .choose h2 { margin: 0; font-size: 17px; font-weight: 500; }
  .choose p { margin: 0; }
  .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media (max-width: 640px) { .modes { grid-template-columns: 1fr; } }
  .mode { all: unset; cursor: pointer; display: grid; gap: 6px; align-content: start; padding: 14px; border-radius: var(--r-md);
    border: 1px solid var(--border); background: var(--bg-elev-2); font-size: 12.5px; color: var(--text-dim); }
  .mode b { color: var(--text); font-size: 14px; }
  .mode.on { border-color: var(--primary-border); background: var(--primary-dim); }
  .mode:disabled { cursor: not-allowed; opacity: 0.55; }
  .blocked { color: var(--warn); }
  .date { display: grid; gap: 6px; max-width: 260px; font-size: 13px; }
  .notice { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 13px; margin-bottom: 10px; }
  .tag { padding: 1px 7px; border-radius: 999px; border: 1px solid var(--primary-border); color: var(--primary); }
  .editor.locked { grid-template-columns: 1fr; }
  .confirm { display: grid; gap: 10px; margin-bottom: 12px; border-color: var(--primary-border); }
  .confirm h3 { margin: 0; font-size: 16px; font-weight: 600; }
  .confirm p { margin: 0; }
  .group summary { cursor: pointer; font-size: 13px; font-weight: 500; display: flex; gap: 6px; align-items: center; }
  .group > div { padding: 4px 0 4px 14px; color: var(--text-dim); }
  .group .sev { color: var(--danger); }
  .ack { display: flex; gap: 8px; align-items: center; }
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
