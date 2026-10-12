<script>
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { apiClient } from "$lib/api/apiClient";
  import { ownCourses, SUBJECTS, LEVELS } from "$lib/store/ownCourses.svelte";

  const courseId = page.params.id;
  const ACCEPT = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" };

  let course = $state(null);
  let notFound = $state(false);
  let summary = $state(null);
  let progress = $state(null);
  let planLessons = $state(null);
  let warnings = $state([]);
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
    if (progress?.state === "ceka_kreatora" && !planLessons) await loadPlan();
  }

  async function loadPlan() {
    const res = await apiClient(`/own-courses/${courseId}/plan`, { method: "GET" });
    if (res.ok) planLessons = await res.json();
    const w = await apiClient(`/own-courses/${courseId}/warnings`, { method: "GET" });
    if (w.ok) warnings = await w.json();
  }

  onMount(async () => {
    await loadCourse();
    // Napredak se osvježava svake 3 s; stranica se smije zatvoriti, izrada ide dalje.
    timer = setInterval(() => course && course.status !== "nov" && progress?.state !== "ceka_kreatora" && loadProgress(), 3000);
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
  const PLAN_STEPS = ["Opseg gradiva", "Stavke znanja", "Preduvjeti", "Lekcije", "Provjera plana"];
  let phaseIndex = $derived({ citanje: 0, plan: 1, pregled: 2 }[progress?.phase] ?? 0);
  let headline = $derived(
    {
      radi: "Izrađujemo tvoj predmet",
      ceka_kvotu: "Izrada čeka novu kvotu",
      neuspjelo: "Nešto nije uspjelo",
      pauzirano: "Izrada je na kratkoj pauzi",
      ceka_kreatora: "Plan je spreman za pregled",
      prevelik: "Gradivo je preopsežno",
    }[progress?.state] ?? "Izrađujemo tvoj predmet",
  );
  let explanation = $derived(
    {
      radi: "Ovo traje nekoliko minuta. Možeš zatvoriti stranicu, javit ćemo ti e-mailom kad plan bude spreman.",
      ceka_kvotu: "Mjesečna kvota je potrošena. Ono što je napravljeno je spremljeno, a izrada se sama nastavlja 1. u mjesecu.",
      neuspjelo: "Jedan korak izrade nije uspio ni nakon 3 pokušaja. Pokušaj ponovno; ako opet ne uspije, javi nam se.",
      pauzirano: "Izrada je privremeno zaustavljena zbog velikog opterećenja. Nastavit će se sama, ništa ne trebaš raditi.",
      ceka_kreatora: `Plan ima ${planLessons?.length ?? "…"} lekcija. Uređivanje i potvrda plana dolaze u sljedećem koraku; zasad ga možeš pregledati ispod.`,
      prevelik: "Plan bi imao više od 200 lekcija. Podijeli materijal u dva manja predmeta pa pokušaj ponovno.",
    }[progress?.state] ?? "",
  );
</script>

<div class="page narrow">
  {#if notFound}
    <div class="card card-pad muted">Predmet ne postoji ili nije tvoj.</div>
  {:else if !course}
    <div class="card card-pad muted">Učitavanje…</div>
  {:else}
    <div class="zadaci-head" style="margin-bottom:20px">
      <div>
        <h1>{course.courseName}</h1>
        <div class="sub">{label(SUBJECTS, course.subject)} · {label(LEVELS, course.level)}</div>
      </div>
    </div>

    {#if course.status === "nov"}
      <!-- Korak 1: materijali -->
      <div class="card card-pad stack">
        <div>
          <b>Materijali</b>
          <div class="muted small">
            Skripte, kurikulum ili katalog i stari ispiti (PDF, JPG ili PNG). Iz njih nastaje plan lekcija; zadaci se iz
            materijala nikad ne prepisuju.
          </div>
        </div>

        <label
          class="drop"
          class:dragging
          ondragover={(e) => { e.preventDefault(); dragging = true; }}
          ondragleave={() => (dragging = false)}
          ondrop={(e) => { e.preventDefault(); dragging = false; uploadFiles([...e.dataTransfer.files]); }}
        >
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onchange={(e) => { uploadFiles([...e.currentTarget.files]); e.currentTarget.value = ""; }} />
          <span><b>Odaberi datoteke</b> ili ih povuci ovamo</span>
          <span class="muted small">Najviše 300 stranica i 300 MB ukupno, 100 MB po datoteci</span>
        </label>

        {#each uploads as u}
          <div class="row">
            <span class="name">{u.name}</span>
            {#if u.error}<span class="err small">{u.error}</span>
            {:else}<span class="bar"><span style="width:{u.percent}%"></span></span>{/if}
          </div>
        {/each}

        {#if summary?.materials.length}
          <div class="list">
            {#each summary.materials as m (m.materialId)}
              <div class="row">
                <div class="grow">
                  <div class="name">{m.originalName}</div>
                  <div class="muted small">{ACCEPT[m.contentType]} · {m.pageCount} str. · {mb(m.sizeBytes)} MB</div>
                </div>
                <label class="check" title="Učenik ga smije koristiti na ispitu, npr. knjižica formula">
                  <input type="checkbox" checked={m.availableOnExam} onchange={() => toggleOnExam(m)} />
                  Dostupan na ispitu
                </label>
                <button class="btn btn-quiet small" onclick={() => removeMaterial(m)}>Ukloni</button>
              </div>
            {/each}
          </div>
          <div class="muted small">
            {summary.totalPages} od {summary.maxPages} stranica · {mb(summary.totalBytes)} od {mb(summary.maxTotalBytes)} MB
          </div>
        {/if}
      </div>

      {#if summary?.materials.length}
        <div class="card card-pad stack">
          <div>
            Izrada će potrošiti oko <b>{summary.estimatedQuotaPercent} %</b> mjesečne kvote; ostalo ti je
            <b>{summary.remainingQuotaPercent} %</b>.
          </div>
          {#if summary.estimatedQuotaPercent > summary.remainingQuotaPercent}
            <div class="warn small">
              Izrada vjerojatno neće stati u ovaj mjesec. Ono što se stigne napraviti se sprema, a izrada se nastavlja kad
              se kvota obnovi. Možeš i svejedno pokušati.
            </div>
          {/if}
          {#if error}<div class="err small">{error}</div>{/if}
          <div class="actions">
            <button class="btn btn-ghost" onclick={() => (confirmCancel = true)}>Odustani</button>
            <button class="btn btn-primary" disabled={busy || summary.remainingQuotaPercent <= 0} onclick={startBuild}>
              {busy ? "Pokrećem…" : "Pokreni izradu"}
            </button>
          </div>
        </div>
      {/if}
    {:else if progress}
      <!-- Korak 2: napredak izrade -->
      <div class="card hero {progress.state}">
        <div class="ring" style="--p:{progress.percent}"><span>{progress.percent}%</span></div>
        <div class="stack">
          <h2>{headline}</h2>
          <p class="muted">{explanation}</p>
          {#if progress.phase === "citanje"}
            <div class="now">Čitam materijal: {progress.done} od {progress.total} stranica</div>
          {:else if progress.phase === "plan" && progress.state !== "prevelik"}
            <ul class="steps">
              {#each PLAN_STEPS as s, i}
                <li class:done={i < progress.planStep} class:cur={i === progress.planStep}>
                  <span class="o">{i < progress.planStep ? "✓" : ""}</span>{s}
                </li>
              {/each}
            </ul>
          {/if}
          {#if error}<div class="err small">{error}</div>{/if}
          <div class="actions start">
            {#if progress.state === "neuspjelo"}
              <button class="btn btn-primary" onclick={retry}>Pokušaj ponovno</button>
            {/if}
            {#if course.status === "izrada" || course.status === "prevelik"}
              <button class="btn btn-quiet" onclick={() => (confirmCancel = true)}>Odustani od izrade</button>
            {/if}
          </div>
        </div>
      </div>
      {#if planLessons && warnings.length}
        <div class="card warns">
          <div class="plan-h"><b>Upozorenja</b><span class="muted small">{warnings.length}</span></div>
          {#each warnings as w (w.warningId)}
            <div class="warn-row" class:serious={w.serious}>
              {w.text}
              {#if w.detail}<div class="muted small">{w.detail}</div>{/if}
            </div>
          {/each}
        </div>
      {/if}
      {#if planLessons}
        <div class="card plan">
          <div class="plan-h"><b>Plan</b><span class="muted small">{planLessons.length} lekcija</span></div>
          {#each planLessons as l (l.objectiveId)}
            <details class="lesson">
              <summary>
                <span class="num">{l.position}</span>
                <span class="grow">{l.name}<span class="muted small"> · {l.unit}</span></span>
              </summary>
              <div class="lesson-body">
                {#if l.concept}<p class="muted small">{l.concept}</p>{/if}
                <ul>{#each l.items as it}<li>{it}</li>{/each}</ul>
                {#if l.prerequisites.length}
                  <div class="muted small">Treba: {l.prerequisites.map((id) => planLessons.find((x) => x.objectiveId === id)?.position).filter(Boolean).join(", ")}.</div>
                {/if}
              </div>
            </details>
          {/each}
        </div>
      {:else}
        <div class="next">
          <div class="next-h">Što slijedi</div>
          {#each PHASES.slice(phaseIndex + 1) as p, i}
            <div class="next-i"><span class="dot">{phaseIndex + i + 2}</span>{p}</div>
          {/each}
        </div>
      {/if}
    {/if}

    {#if confirmCancel}
      <div class="card card-pad confirm">
        <span>Obrisati nedovršeni predmet? Potrošena kvota se ne vraća.</span>
        <div class="actions">
          <button class="btn btn-ghost" onclick={() => (confirmCancel = false)}>Ne</button>
          <button class="btn btn-danger" disabled={busy} onclick={cancel}>Da, odustani</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .narrow { max-width: 760px; }
  .muted { color: var(--text-dim); }
  .small { font-size: 12.5px; }
  .err { color: var(--danger); }
  .warn { color: var(--warn); }
  .stack { display: grid; gap: 12px; }
  .card + .card { margin-top: 14px; }
  .drop { display: grid; gap: 4px; justify-items: center; padding: 26px 16px; border: 1.5px dashed var(--border-strong); border-radius: var(--r-lg); cursor: pointer; text-align: center; font-size: 14px; transition: border-color 0.12s, background 0.12s; }
  .drop:hover, .drop.dragging { border-color: var(--primary); background: var(--primary-dim); }
  .drop input { display: none; }
  .list { display: grid; gap: 2px; }
  .row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .row:last-child { border-bottom: none; }
  .grow { flex: 1; min-width: 0; }
  .name { font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar { flex: 1; height: 5px; border-radius: 999px; background: var(--bg-elev-2); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--primary); transition: width 0.2s; }
  .check { display: flex; gap: 6px; align-items: center; font-size: 12.5px; color: var(--text-dim); white-space: nowrap; cursor: pointer; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .actions.start { justify-content: flex-start; }
  .hero { padding: 26px; display: flex; gap: 24px; align-items: flex-start; }
  @media (max-width: 600px) { .hero { flex-direction: column; } }
  .hero.neuspjelo { border-color: var(--danger); }
  .hero.ceka_kvotu, .hero.pauzirano { border-color: var(--warn); }
  .ring { --c: var(--primary); width: 112px; height: 112px; flex-shrink: 0; border-radius: 999px; display: grid; place-items: center; background: conic-gradient(var(--c) calc(var(--p) * 1%), var(--bg-elev-2) 0); position: relative; }
  .ring::after { content: ""; position: absolute; inset: 10px; border-radius: 999px; background: var(--bg-elev); }
  .ring span { position: relative; z-index: 1; font-size: 22px; font-weight: 600; }
  .hero.ceka_kvotu .ring, .hero.pauzirano .ring { --c: var(--warn); }
  .hero.neuspjelo .ring { --c: var(--danger); }
  h2 { margin: 0; font-size: 22px; font-weight: 600; }
  p { margin: 0; line-height: 1.55; }
  .now { font-size: 13px; padding: 8px 10px; border-radius: var(--r-md); background: var(--bg-elev-2); }
  .next { margin-top: 18px; display: grid; gap: 8px; }
  .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 13px; color: var(--text-faint); }
  .steps li { display: flex; gap: 8px; align-items: center; }
  .steps li.done { color: var(--text-dim); }
  .steps li.cur { color: var(--text); font-weight: 500; }
  .steps .o { width: 16px; height: 16px; border-radius: 99px; border: 1.5px solid currentColor; display: grid; place-items: center; font-size: 10px; }
  .hero.ceka_kreatora { border-color: var(--success); }
  .hero.ceka_kreatora .ring { --c: var(--success); }
  .hero.prevelik { border-color: var(--danger); }
  .plan { margin-top: 16px; padding: 8px 0; }
  .warns { margin-top: 16px; padding: 8px 0; }
  .warn-row { font-size: 13px; padding: 8px 16px; border-left: 3px solid var(--warn); margin: 6px 16px; background: var(--bg-elev-2); border-radius: var(--r-sm); display: grid; gap: 2px; }
  .warn-row.serious { border-left-color: var(--danger); }
  .plan-h { display: flex; justify-content: space-between; padding: 8px 16px 10px; border-bottom: 1px solid var(--border); }
  .lesson { border-bottom: 1px solid var(--border); }
  .lesson:last-child { border-bottom: none; }
  .lesson summary { display: flex; gap: 10px; padding: 9px 16px; cursor: pointer; font-size: 13.5px; list-style: none; }
  .lesson summary::-webkit-details-marker { display: none; }
  .num { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); width: 26px; padding-top: 2px; }
  .lesson-body { padding: 0 16px 12px 52px; display: grid; gap: 6px; }
  .lesson-body ul { margin: 0; padding-left: 16px; font-size: 12.5px; color: var(--text-dim); display: grid; gap: 3px; }
  .next-h { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); }
  .next-i { display: flex; gap: 10px; align-items: center; font-size: 13.5px; color: var(--text-dim); }
  .dot { width: 22px; height: 22px; border-radius: 99px; border: 1px solid var(--border-strong); display: grid; place-items: center; font-size: 11px; }
  .confirm { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13.5px; }
  .btn-danger { background: var(--danger); color: #fff; border-color: transparent; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
