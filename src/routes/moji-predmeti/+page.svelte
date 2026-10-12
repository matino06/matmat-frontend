<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { apiClient } from "$lib/api/apiClient";
  import { showErrorAlert } from "$lib/store/errorAlert.svelte";
  import { ownCourses, SUBJECTS, LEVELS, STATUS_LABELS, courseBadge, courseHue } from "$lib/store/ownCourses.svelte";

  // Mjesečna kvota izrade: kreator vidi samo postotak i dan obnove, ne dolare.
  let quota = $state(null);
  onMount(async () => {
    try {
      const res = await apiClient("/own-courses/quota", { method: "GET" });
      if (res.ok) quota = await res.json();
    } catch {}
  });
  const formatDate = (iso) => new Date(iso).toLocaleDateString("hr-HR", { day: "numeric", month: "long" });

  const subjectLabel = (id) => SUBJECTS.find((s) => s.id === id)?.label ?? id;
  const levelLabel = (id) => LEVELS.find((l) => l.id === id)?.label ?? id;

  // Brisanje traži da kreator prepiše naziv predmeta, jer je nepovratno.
  let deleting = $state(null);
  let confirmName = $state("");
  let busy = $state(false);
  let canDelete = $derived(deleting && confirmName.trim() === deleting.courseName.trim());

  function openDelete(course) {
    deleting = course;
    confirmName = "";
  }

  async function confirmDelete() {
    if (!canDelete || busy) return;
    busy = true;
    try {
      const res = await apiClient(`/own-courses/${deleting.courseId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const wasCurrent = deleting.courseId;
      ownCourses.courses = ownCourses.courses.filter((c) => c.courseId !== wasCurrent);
      deleting = null;
      // Ako je obrisan predmet bio trenutni, backend je račun vratio na službeni predmet.
      window.location.reload();
    } catch {
      showErrorAlert("Predmet nije obrisan. Pokušaj ponovno.");
    } finally {
      busy = false;
    }
  }
</script>

<div class="page">
  <div class="zadaci-head" style="margin-bottom:20px">
    <div>
      <h1>Moji predmeti</h1>
      <div class="sub">Predmeti koje izrađuješ iz svojih materijala</div>
    </div>
    {#if ownCourses.isCreator}
      <button class="btn btn-primary" onclick={() => goto("/moji-predmeti/novi")}>+ Novi predmet</button>
    {/if}
  </div>

  {#if quota && ownCourses.isCreator}
    <div class="card quota" class:warn={quota.usedPercent >= 80 && quota.usedPercent < 100} class:full={quota.usedPercent >= 100}>
      <div class="quota-row">
        <span>Iskorišteno <b>{quota.usedPercent} %</b> ovog mjeseca</span>
        <span class="muted small">Obnavlja se {formatDate(quota.resetsOn)}</span>
      </div>
      <div class="quota-bar"><span style="width:{quota.usedPercent}%"></span></div>
      {#if quota.usedPercent >= 100}
        <div class="small">Kvota za ovaj mjesec je potrošena. Izrada novih predmeta nastavlja se {formatDate(quota.resetsOn)}; učenje radi normalno.</div>
      {:else if quota.usedPercent >= 80}
        <div class="small">Kvota je skoro potrošena.</div>
      {/if}
    </div>
  {/if}

  {#if !ownCourses.loaded}
    <div class="card card-pad muted">Učitavanje…</div>
  {:else if !ownCourses.isCreator}
    <div class="card card-pad muted">Izrada vlastitih predmeta još nije dostupna za tvoj račun.</div>
  {:else if ownCourses.courses.length === 0}
    <div class="card card-pad empty">
      <b>Još nemaš vlastitih predmeta.</b>
      <span class="muted">Uploadaj skripte, kurikulum ili stare ispite, a MatMat iz njih izradi plan lekcija i zadatke.</span>
      <button class="btn btn-primary" onclick={() => goto("/moji-predmeti/novi")}>Napravi prvi predmet</button>
    </div>
  {:else}
    <div class="list">
      {#each ownCourses.courses as c (c.courseId)}
        <div class="card item">
          <div class="badge-sq" style="background: hsl({courseHue(c.courseName)} 75% 55%)">{courseBadge(c.courseName)}</div>
          <div class="meta">
            <div class="name">{c.courseName}</div>
            <div class="muted small">{subjectLabel(c.subject)} · {levelLabel(c.level)}</div>
            <div class="status {c.status}">{STATUS_LABELS[c.status] ?? c.status}</div>
          </div>
          <button class="btn btn-quiet danger" onclick={() => openDelete(c)}>Obriši</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if deleting}
  <div class="modal-bg" role="presentation" onclick={() => (deleting = null)}>
    <div class="card modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === "Escape" && (deleting = null)}>
      <h3>Obrisati „{deleting.courseName}“?</h3>
      <p class="muted">
        Brišu se lekcije, zadaci, napredak i materijali ovog predmeta. To se ne može vratiti, a potrošena mjesečna kvota
        se ne vraća.
      </p>
      <label class="field">
        <span>Za potvrdu prepiši naziv predmeta</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input bind:value={confirmName} placeholder={deleting.courseName} autofocus
          onkeydown={(e) => e.key === "Enter" && confirmDelete()} />
      </label>
      <div class="actions">
        <button class="btn btn-ghost" onclick={() => (deleting = null)}>Odustani</button>
        <button class="btn btn-danger" disabled={!canDelete || busy} onclick={confirmDelete}>
          {busy ? "Brišem…" : "Obriši predmet"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .muted { color: var(--text-dim); }
  .quota { padding: 14px 16px; margin-bottom: 16px; display: grid; gap: 8px; font-size: 13.5px; }
  .quota-row { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .quota-bar { height: 6px; border-radius: 999px; background: var(--bg-elev-2); overflow: hidden; }
  .quota-bar span { display: block; height: 100%; background: var(--primary); transition: width 0.4s; }
  .quota.warn .quota-bar span { background: var(--warn); }
  .quota.warn .small { color: var(--warn); }
  .quota.full .quota-bar span { background: var(--danger); }
  .quota.full .small { color: var(--danger); }
  .small { font-size: 12.5px; }
  .empty { display: grid; gap: 10px; justify-items: start; }
  .list { display: grid; gap: 10px; }
  .item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
  .meta { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .name { font-weight: 600; font-size: 14.5px; }
  .status { font-size: 12.5px; color: var(--primary); }
  .status.potvrden { color: var(--success); }
  .danger:hover { color: var(--danger); }
  .modal-bg { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: grid; place-items: center; z-index: 1000; padding: 16px; }
  .modal { padding: 22px; max-width: 440px; width: 100%; display: grid; gap: 12px; }
  .modal h3 { margin: 0; font-size: 18px; font-weight: 600; }
  .modal p { margin: 0; font-size: 13.5px; line-height: 1.5; }
  .field { display: grid; gap: 6px; font-size: 12.5px; color: var(--text-dim); }
  .field input { padding: 9px 12px; border-radius: var(--r-md); border: 1px solid var(--border); background: var(--bg); color: var(--text); font: inherit; font-size: 14px; outline: none; }
  .field input:focus { border-color: var(--primary); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .btn-danger { background: var(--danger); color: #fff; border-color: transparent; }
  .btn-danger:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
