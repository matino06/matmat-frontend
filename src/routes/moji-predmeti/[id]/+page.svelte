<script>
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { apiClient } from "$lib/api/apiClient";
  import { ownCourses, SUBJECTS, LEVELS } from "$lib/store/ownCourses.svelte";
  import { setCurrentCourse } from "$lib/store/course.svelte";
  import PlanEditor from "$lib/components/ownCourse/PlanEditor.svelte";
  import Upload from "@lucide/svelte/icons/upload";
  import FileText from "@lucide/svelte/icons/file-text";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Check from "@lucide/svelte/icons/check";

  const courseId = page.params.id;
  const ACCEPT = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" };

  let course = $state(null);
  let notFound = $state(false);
  let summary = $state(null);
  let progress = $state(null);

  let uploads = $state([]); // { name, percent, error }
  let error = $state("");
  let busy = $state(false);
  let confirmCancel = $state(false);
  let dragging = $state(false);
  let timer;

  const label = (list, id) => list.find((x) => x.id === id)?.label ?? id;
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);

  async function message(res, fallback) {
    try {
      return (await res.json()).message || fallback;
    } catch {
      return fallback;
    }
  }

  async function loadCourse() {
    const res = await apiClient(`/own-courses/${courseId}`, { method: "GET" });
    if (!res.ok) {
      notFound = true;
      return;
    }
    course = await res.json();
    if (course.status === "nov") await loadSummary();
    else await loadProgress();
  }

  async function loadSummary() {
    const res = await apiClient(`/own-courses/${courseId}/materials`, { method: "GET" });
    if (res.ok) summary = await res.json();
  }

  async function loadProgress() {
    const res = await apiClient(`/own-courses/${courseId}/build`, { method: "GET" });
    if (res.ok) progress = await res.json();

  }


  onMount(async () => {
    await loadCourse();
    // Napredak se osvježava svake 3 s; stranica se smije zatvoriti, izrada ide dalje.
    timer = setInterval(
      () => course && course.status !== "nov" && !["ceka_kreatora", "spremno"].includes(progress?.state) && loadProgress(),
      3000,
    );
  });
  onDestroy(() => clearInterval(timer));

  function putToS3(url, file, row) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => e.lengthComputable && (row.percent = Math.round((100 * e.loaded) / e.total));
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("upload")));
      xhr.onerror = () => reject(new Error("upload"));
      xhr.send(file);
    });
  }

  async function uploadFiles(files) {
    error = "";
    for (const file of files) {
      const row = { name: file.name, percent: 0, error: "" };
      uploads = [...uploads, row];
      const r = uploads[uploads.length - 1];
      if (!ACCEPT[file.type]) {
        r.error = "Dopušteni su samo PDF, JPG i PNG.";
        continue;
      }
      try {
        const urlRes = await apiClient(`/own-courses/${courseId}/materials/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
        });
        if (!urlRes.ok) throw new Error(await message(urlRes, "Upload nije dopušten."));
        const { uploadUrl, key } = await urlRes.json();
        await putToS3(uploadUrl, file, r);
        r.percent = 100;
        const reg = await apiClient(`/own-courses/${courseId}/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, originalName: file.name, availableOnExam: false }),
        });
        if (!reg.ok) throw new Error(await message(reg, "Materijal nije spremljen."));
        uploads = uploads.filter((u) => u !== r);
      } catch (e) {
        r.error = e.message === "upload" ? "Upload nije uspio. Pokušaj ponovno." : e.message;
      }
      await loadSummary();
    }
  }

  async function toggleOnExam(m) {
    m.availableOnExam = !m.availableOnExam;
    await apiClient(`/own-courses/${courseId}/materials/${m.materialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availableOnExam: m.availableOnExam }),
    });
  }

  async function removeMaterial(m) {
    await apiClient(`/own-courses/${courseId}/materials/${m.materialId}`, { method: "DELETE" });
    await loadSummary();
  }

  async function startBuild() {
    busy = true;
    error = "";
    const res = await apiClient(`/own-courses/${courseId}/build`, { method: "POST" });
    busy = false;
    if (!res.ok) {
      error = await message(res, "Izrada nije pokrenuta.");
      return;
    }
    course.status = "izrada";
    await loadProgress();
  }

  // Predmet postaje trenutni i učenje kreće na zadacima.
  async function startLearning() {
    await apiClient("/account/current-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: Number(courseId) }),
    });
    setCurrentCourse(Number(courseId));
    window.location.href = "/tasks";
  }

  async function retry() {
    await apiClient(`/own-courses/${courseId}/retry`, { method: "POST" });
    await loadProgress();
  }

  async function cancel() {
    busy = true;
    const res = await apiClient(`/own-courses/${courseId}/cancel`, { method: "POST" });
    busy = false;
    if (!res.ok) {
      error = await message(res, "Izrada nije otkazana.");
      return;
    }
    ownCourses.courses = ownCourses.courses.filter((c) => String(c.courseId) !== String(courseId));
    goto("/moji-predmeti");
  }

  const PHASES = ["Čitanje materijala", "Izrada plana", "Pregled i potvrda plana", "Izrada prvih zadataka", "Spremno za učenje"];
  // Prsten kao na stranici Napredak; boja prati stanje izrade.
  const SIZE = 148;
  const STROKE = 10;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const TONES = { ceka_kreatora: "done", spremno: "done", ceka_kvotu: "wait", pauzirano: "wait", neuspjelo: "bad", prevelik: "bad" };
  const PLAN_STEPS = ["Opseg gradiva", "Stavke znanja", "Preduvjeti", "Lekcije", "Provjera plana"];
  let phaseIndex = $derived(
    progress?.state === "spremno" ? 4 : ({ citanje: 0, plan: 1, pregled: 2, zadaci: 3 }[progress?.phase] ?? 0),
  );
  let tasks = $derived(progress?.phase === "zadaci");
  let canLearn = $derived(tasks && (progress.state === "spremno" || (progress.state === "batch" && progress.done >= 5)));
  let headline = $derived(
    {
      radi: tasks ? "Izrađujemo zadatke" : "Izrađujemo tvoj predmet",
      batch: canLearn ? "Prvih 5 lekcija je spremno" : "Izrađujemo zadatke",
      spremno: "Možeš početi učiti",
      ceka_kvotu: "Izrada čeka novu kvotu",
      neuspjelo: "Nešto nije uspjelo",
      pauzirano: "Izrada je pauzirana",
      ceka_kreatora: "Plan je spreman za pregled",
      prevelik: "Gradivo je preopsežno",
    }[progress?.state] ?? "Izrađujemo tvoj predmet",
  );
  let explanation = $derived(
    {
      radi: tasks
        ? "AI piše prvi zadatak za svaku lekciju; ovo traje nekoliko minuta. Možeš zatvoriti stranicu."
        : "Ovo traje nekoliko minuta. Možeš zatvoriti stranicu, javit ćemo ti e-mailom kad plan bude spreman.",
      batch: "Ostale lekcije izrađuju se u pozadini, do 24 h. Već možeš početi učiti; javit ćemo ti e-mailom kad sve bude gotovo.",
      spremno: "Zadaci za sve lekcije su izrađeni. Uz svaki zadatak je objašnjenje korak po korak.",
      ceka_kvotu: "Mjesečna kvota je potrošena. Ono što je napravljeno je spremljeno, a izrada se sama nastavlja 1. u mjesecu.",
      neuspjelo: "Jedan korak izrade nije uspio ni nakon 3 pokušaja. Pokušaj ponovno; ako opet ne uspije, javi nam se.",
      pauzirano: "Izrada je privremeno zaustavljena na našoj strani. Ono što je napravljeno je spremljeno, a izrada se pokušava nastaviti svakih pola sata. Ništa ne trebaš raditi.",
      ceka_kreatora: "Pregledaj plan i promijeni što želiš. Upozorenja se osvježe kad napraviš pauzu u uređivanju.",
      prevelik: "Plan bi imao više od 200 lekcija. Podijeli materijal u dva manja predmeta pa pokušaj ponovno.",
    }[progress?.state] ?? "",
  );
  let tone = $derived(TONES[progress?.state] ?? "busy");
  let ringDash = $derived(((progress?.percent ?? 0) / 100) * CIRC);
  // Faza: gotova, trenutna ili tek dolazi. Kad je sve spremno, gotove su sve.
  const phaseState = (i) => (progress?.state === "spremno" || i < phaseIndex ? "done" : i === phaseIndex ? "cur" : "todo");
  let showEditor = $derived(progress?.state === "ceka_kreatora" || tasks);
  let fmt = (n) => String(n).replace(".", ",");
</script>

<div class="page">
  {#if notFound}
    <div class="card card-pad muted">Predmet ne postoji ili nije tvoj.</div>
  {:else if !course}
    <div class="card card-pad muted">Učitavanje…</div>
  {:else}
    <div class="zadaci-head">
      <div>
        <h1>{course.courseName}</h1>
        <div class="sub">{label(SUBJECTS, course.subject)}, {label(LEVELS, course.level).toLowerCase()}</div>
      </div>
    </div>

    {#if course.status === "nov"}
      <!-- Korak 1: materijali -->
      <div class="col">
        <section class="card block" aria-labelledby="mat-h">
          <div class="block-head">
            <h2 id="mat-h">Materijali</h2>
            <p>Skripte, kurikulum ili katalog i stari ispiti, kao PDF, JPG ili PNG. Iz njih nastaje plan lekcija, a zadaci se iz njih nikad ne prepisuju.</p>
          </div>

          <label
            class="drop"
            class:dragging
            ondragover={(e) => { e.preventDefault(); dragging = true; }}
            ondragleave={() => (dragging = false)}
            ondrop={(e) => { e.preventDefault(); dragging = false; uploadFiles([...e.dataTransfer.files]); }}
          >
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onchange={(e) => { uploadFiles([...e.currentTarget.files]); e.currentTarget.value = ""; }} />
            <Upload size={20} />
            <span><b>Odaberi datoteke</b> ili ih povuci ovamo</span>
            <span class="hint">Do 100 MB po datoteci, ukupno najviše 300 stranica i 300 MB</span>
          </label>

          {#if uploads.length || summary?.materials.length}
            <div class="joined-list files">
              {#each uploads as u}
                <div class="file">
                  <FileText size={16} />
                  <span class="file-main"><span class="file-name">{u.name}</span>
                    {#if u.error}<span class="err">{u.error}</span>{:else}<span class="bar"><span style="width:{u.percent}%"></span></span>{/if}
                  </span>
                </div>
              {/each}
              {#each summary?.materials ?? [] as m (m.materialId)}
                <div class="file">
                  <FileText size={16} />
                  <span class="file-main">
                    <span class="file-name">{m.originalName}</span>
                    <span class="file-meta">{ACCEPT[m.contentType]}, {m.pageCount} str., {fmt(mb(m.sizeBytes))} MB</span>
                  </span>
                  <label class="check" title="Učenik ga smije koristiti na ispitu, npr. knjižica formula">
                    <input type="checkbox" checked={m.availableOnExam} onchange={() => toggleOnExam(m)} />
                    Dostupan na ispitu
                  </label>
                  <button class="icon-btn del" title="Ukloni" aria-label="Ukloni {m.originalName}" onclick={() => removeMaterial(m)}><Trash2 size={15} /></button>
                </div>
              {/each}
            </div>
            {#if summary?.materials.length}
              <div class="usage">
                <span><b>{summary.totalPages}</b> od {summary.maxPages} stranica</span>
                <span><b>{fmt(mb(summary.totalBytes))}</b> od {fmt(mb(summary.maxTotalBytes))} MB</span>
              </div>
            {/if}
          {/if}
        </section>

        {#if summary?.materials.length}
          <section class="card block" aria-labelledby="build-h">
            <div class="estimate">
              <span class="est-num mono">{summary.estimatedQuotaPercent}<span class="unit">%</span></span>
              <div>
                <h2 id="build-h">Otprilike toliko mjesečne kvote troši izrada</h2>
                <p>Ostalo ti je {summary.remainingQuotaPercent} % kvote ovog mjeseca.</p>
              </div>
            </div>
            {#if summary.estimatedQuotaPercent > summary.remainingQuotaPercent}
              <p class="note warn">
                Izrada vjerojatno neće stati u ovaj mjesec. Što se stigne napraviti ostaje spremljeno, a izrada se nastavlja kad
                se kvota obnovi.
              </p>
            {/if}
            {#if error}<p class="note err">{error}</p>{/if}
            <div class="actions">
              <button class="btn btn-ghost" onclick={() => (confirmCancel = true)}>Odustani</button>
              <button class="btn btn-primary" disabled={busy || summary.remainingQuotaPercent <= 0} onclick={startBuild}>
                {busy ? "Pokrećem…" : "Pokreni izradu"}
              </button>
            </div>
          </section>
        {/if}
      </div>
    {:else if progress}
      <!-- Korak 2: izrada, faza po faza -->
      <section class="card build t-{tone}" aria-labelledby="build-h">
        <div class="ring-wrap" aria-hidden="true">
          <svg width={SIZE} height={SIZE} style="transform:rotate(-90deg)">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--bg-elev-2)" stroke-width={STROKE} />
            <circle class="meter" cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke-width={STROKE} stroke-linecap="round"
              stroke-dasharray="{ringDash} {CIRC - ringDash}" />
          </svg>
          <div class="ring-inner"><span class="pct mono">{progress.percent}<span class="unit">%</span></span></div>
        </div>

        <div class="build-main">
          <h2 id="build-h">{headline}</h2>
          <p class="explain">{explanation}</p>

          <ol class="phases">
            {#each PHASES as p, i}
              {@const st = phaseState(i)}
              <li class={st} aria-current={st === "cur" ? "step" : undefined}>
                <span class="mark">{#if st === "done"}<Check size={12} strokeWidth={3} />{/if}</span>
                <div class="phase-body">
                  <span class="phase-name">{p}</span>
                  {#if st === "cur" && i === 0 && progress.total}
                    <span class="phase-count">{progress.done} od {progress.total} stranica</span>
                    <span class="bar"><span style="width:{(100 * progress.done) / progress.total}%"></span></span>
                  {:else if st === "cur" && i === 1 && progress.state !== "prevelik"}
                    <span class="substeps">
                      {#each PLAN_STEPS as sstep, j}
                        <span class:sdone={j < progress.planStep} class:scur={j === progress.planStep}>{sstep}</span>
                      {/each}
                    </span>
                  {:else if st === "cur" && i === 3 && progress.total}
                    <span class="phase-count">{progress.done} od {progress.total} lekcija</span>
                    <span class="bar"><span style="width:{(100 * progress.done) / progress.total}%"></span></span>
                  {/if}
                </div>
              </li>
            {/each}
          </ol>

          {#if error}<p class="note err">{error}</p>{/if}
          {#if canLearn || progress.state === "neuspjelo" || course.status === "izrada" || course.status === "prevelik"}
            <div class="actions start">
              {#if canLearn}
                <button class="btn btn-primary" onclick={startLearning}>Počni učiti</button>
              {/if}
              {#if progress.state === "neuspjelo"}
                <button class="btn btn-primary" onclick={retry}>Pokušaj ponovno</button>
              {/if}
              {#if course.status === "izrada" || course.status === "prevelik"}
                <button class="btn btn-quiet" onclick={() => (confirmCancel = true)}>Odustani od izrade</button>
              {/if}
            </div>
          {/if}
        </div>
      </section>

      {#if showEditor}
        <div class="section-head">
          <h2>Plan</h2>
          {#if tasks}<div class="side">Potvrđen. Lekcije možeš još samo preimenovati.</div>{/if}
        </div>
        {#if progress.state === "ceka_kreatora"}
          <PlanEditor {courseId} onconfirmed={loadCourse} />
        {:else}
          <PlanEditor {courseId} locked />
        {/if}
      {/if}
    {/if}
  {/if}
</div>

{#if confirmCancel}
  <div class="modal-bg" role="presentation" onclick={() => (confirmCancel = false)}>
    <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="cancel-h" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === "Escape" && (confirmCancel = false)}>
      <h2 id="cancel-h">Obrisati nedovršeni predmet?</h2>
      <p>Brišu se materijali i sve što je dosad izrađeno. Potrošena kvota se ne vraća.</p>
      <div class="actions">
        <button class="btn btn-ghost" onclick={() => (confirmCancel = false)}>Ne, nastavi</button>
        <button class="btn btn-danger" disabled={busy} onclick={cancel}>Obriši predmet</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .muted { color: var(--text-dim); }
  .mono { font-family: var(--font-mono); font-feature-settings: "tnum"; }
  .err { color: var(--danger); }
  .col { max-width: 760px; display: grid; gap: var(--pad-3); }

  .block { padding: var(--pad-5); display: grid; gap: var(--pad-4); }
  .block-head h2, .estimate h2 { margin: 0 0 6px; font-size: 17px; font-weight: 500; }
  .block-head p, .estimate p { margin: 0; color: var(--text-dim); font-size: 13.5px; line-height: 1.6; max-width: 64ch; }

  .drop { display: grid; gap: 6px; justify-items: center; padding: var(--pad-5) var(--pad-4); border: 1.5px dashed var(--border-strong);
    border-radius: var(--r-lg); cursor: pointer; text-align: center; font-size: 14px; color: var(--text-dim);
    transition: border-color 0.12s, background 0.12s; }
  .drop b { color: var(--text); font-weight: 500; }
  .drop:hover, .drop.dragging, .drop:focus-within { border-color: var(--primary); background: var(--primary-dim); }
  .drop input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .hint { font-size: 12px; color: var(--text-faint); }

  .file { display: flex; align-items: center; gap: 12px; padding: 10px var(--pad-3); color: var(--text-faint); }
  .file-main { flex: 1; min-width: 0; display: grid; gap: 4px; }
  .file-name { color: var(--text); font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-meta { font-size: 11.5px; color: var(--text-faint); }
  .file .err { font-size: 12.5px; }
  .check { display: flex; gap: 6px; align-items: center; font-size: 12.5px; color: var(--text-dim); white-space: nowrap; cursor: pointer; }
  .check input { accent-color: var(--primary); }
  .del:hover { color: var(--danger); }
  @media (max-width: 560px) { .file { flex-wrap: wrap; } .check { margin-left: 28px; } }
  .usage { display: flex; gap: 18px; font-size: 12.5px; color: var(--text-faint); font-variant-numeric: tabular-nums; }
  .usage b { color: var(--text); font-weight: 500; }

  .bar { display: block; height: 6px; border-radius: 999px; background: var(--bg-elev-2); border: 1px solid var(--border); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--primary); border-radius: 999px; transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }

  .estimate { display: flex; gap: var(--pad-4); align-items: center; }
  .est-num { font-size: 40px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; white-space: nowrap; }
  .unit { font-size: 0.5em; color: var(--text-faint); margin-left: 2px; }
  .note { margin: 0; font-size: 13px; line-height: 1.55; }
  .note.warn { color: var(--warn); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .actions.start { justify-content: flex-start; }

  /* Izrada: prsten kao na stranici Napredak, faze redom */
  .build { padding: var(--pad-5); display: grid; grid-template-columns: auto 1fr; gap: var(--pad-6); align-items: start; }
  @media (max-width: 680px) { .build { grid-template-columns: 1fr; gap: var(--pad-4); } }
  .build.t-wait { border-color: color-mix(in srgb, var(--warn) 45%, var(--border)); }
  .build.t-bad { border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); }
  .ring-wrap { position: relative; width: 148px; height: 148px; }
  .meter { stroke: var(--primary); transition: stroke-dasharray 1s ease; }
  .build.t-done .meter { stroke: var(--success); }
  .build.t-wait .meter { stroke: var(--warn); }
  .build.t-bad .meter { stroke: var(--danger); }
  .ring-inner { position: absolute; inset: 0; display: grid; place-items: center; }
  .pct { font-size: 34px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
  .build-main { display: grid; gap: var(--pad-3); min-width: 0; }
  .build-main h2 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
  .explain { margin: 0; color: var(--text-dim); font-size: 14px; line-height: 1.6; max-width: 62ch; }

  .phases { list-style: none; margin: 4px 0 0; padding: 0; display: grid; }
  .phases li { display: grid; grid-template-columns: 20px 1fr; gap: 12px; position: relative; padding-bottom: 14px; }
  .phases li:last-child { padding-bottom: 0; }
  /* crta između faza */
  .phases li:not(:last-child)::before { content: ""; position: absolute; left: 9px; top: 22px; bottom: 2px; width: 2px; background: var(--border); border-radius: 2px; }
  .phases li.done:not(:last-child)::before { background: var(--primary-border); }
  .mark { width: 20px; height: 20px; border-radius: 999px; border: 2px solid var(--border-strong); display: grid; place-items: center; background: var(--bg-elev); }
  .done .mark { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
  .build.t-done .done .mark { background: var(--success); border-color: var(--success); }
  .cur .mark { border-color: var(--primary); box-shadow: inset 0 0 0 4px var(--bg-elev); background: var(--primary); }
  .build.t-wait .cur .mark { border-color: var(--warn); background: var(--warn); }
  .build.t-bad .cur .mark { border-color: var(--danger); background: var(--danger); }
  .phase-body { display: grid; gap: 6px; min-width: 0; padding-top: 1px; }
  .phase-name { font-size: 14px; color: var(--text-faint); }
  .done .phase-name { color: var(--text-dim); }
  .cur .phase-name { color: var(--text); font-weight: 500; }
  .phase-count { font-size: 12.5px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .phase-body .bar { max-width: 320px; }
  .build.t-wait .phase-body .bar span { background: var(--warn); }
  .build.t-bad .phase-body .bar span { background: var(--danger); }
  .substeps { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12.5px; color: var(--text-faint); }
  .substeps .sdone { color: var(--text-dim); text-decoration: line-through; text-decoration-color: var(--border-strong); }
  .substeps .scur { color: var(--primary); font-weight: 500; }

  .modal-bg { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: grid; place-items: center; z-index: 1000; padding: 16px; }
  .modal { padding: var(--pad-5); max-width: 440px; width: 100%; display: grid; gap: 14px; }
  .modal h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .modal p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-dim); }
  @media (prefers-reduced-motion: reduce) { .meter, .bar span { transition: none; } }
</style>
