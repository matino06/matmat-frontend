<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { apiClient } from "$lib/api/apiClient";
  import { showErrorAlert } from "$lib/store/errorAlert.svelte";
  import { ownCourses, SUBJECTS, LEVELS, STATUS_LABELS, STATUS_TONES, courseBadge, courseHue } from "$lib/store/ownCourses.svelte";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";

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
  <div class="zadaci-head">
    <div>
      <h1>Moji predmeti</h1>
      <div class="sub">Predmeti koje izrađuješ iz svojih materijala</div>
    </div>
    {#if ownCourses.isCreator}
      <button class="btn btn-primary" onclick={() => goto("/moji-predmeti/novi")}><Plus size={15} /> Novi predmet</button>
    {/if}
  </div>

  {#if quota && ownCourses.isCreator}
    {@const tone = quota.usedPercent >= 100 ? "full" : quota.usedPercent >= 80 ? "warn" : ""}
    <div class="card quota {tone}">
      <div class="quota-top">
        <span class="quota-num mono">{quota.usedPercent}<span class="unit">%</span></span>
        <span class="quota-label">mjesečne kvote iskorišteno</span>
        <span class="quota-reset">Obnavlja se {formatDate(quota.resetsOn)}</span>
      </div>
      <div class="quota-bar"><span style="width:{Math.min(100, quota.usedPercent)}%"></span></div>
      {#if tone === "full"}
        <p class="quota-note">Kvota je potrošena. Izrada se nastavlja {formatDate(quota.resetsOn)}, a učenje radi normalno.</p>
      {:else if tone === "warn"}
        <p class="quota-note">Kvota je skoro potrošena.</p>
      {/if}
    </div>
  {/if}

  {#if !ownCourses.loaded}
    <div class="card card-pad muted">Učitavanje…</div>
  {:else if !ownCourses.isCreator}
    <div class="card card-pad muted">Izrada vlastitih predmeta još nije dostupna za tvoj račun.</div>
  {:else if ownCourses.courses.length === 0}
    <div class="card empty">
      <h2>Još nemaš vlastitih predmeta</h2>
      <p>Učitaj skripte, kurikulum ili stare ispite, a MatMat iz njih izradi plan lekcija i zadatke za učenje.</p>
      <button class="btn btn-primary" onclick={() => goto("/moji-predmeti/novi")}><Plus size={15} /> Napravi prvi predmet</button>
    </div>
  {:else}
    <div class="section-head">
      <h2>Predmeti</h2>
      <div class="side mono">{ownCourses.courses.length}</div>
    </div>
    <div class="joined-list">
      {#each ownCourses.courses as c (c.courseId)}
        <div class="item">
          <a class="item-link" href={`/moji-predmeti/${c.courseId}`}>
            <span class="badge-sq" style="background: hsl({courseHue(c.courseName)} 75% 55%)">{courseBadge(c.courseName)}</span>
            <span class="meta">
              <span class="name">{c.courseName}</span>
              <span class="sub">{subjectLabel(c.subject)}, {levelLabel(c.level).toLowerCase()}</span>
            </span>
            <span class="status"><span class="status-dot {STATUS_TONES[c.status] ?? ''}"></span>{STATUS_LABELS[c.status] ?? c.status}</span>
          </a>
          <button class="icon-btn del" title="Obriši predmet" aria-label="Obriši predmet {c.courseName}" onclick={() => openDelete(c)}>
            <Trash2 size={15} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if deleting}
  <div class="modal-bg" role="presentation" onclick={() => (deleting = null)}>
    <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="del-h" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === "Escape" && (deleting = null)}>
      <h2 id="del-h">Obrisati „{deleting.courseName}“?</h2>
      <p>Brišu se lekcije, zadaci, napredak i materijali ovog predmeta. To se ne može vratiti, a potrošena kvota se ne vraća.</p>
      <label class="form-field">
        <span class="field-label">Za potvrdu prepiši naziv predmeta</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input class="inp" bind:value={confirmName} placeholder={deleting.courseName} autofocus
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

  /* Kvota: broj kao „Danas“ na stranici Napredak */
  .quota { padding: var(--pad-4) var(--pad-5); margin-bottom: var(--pad-2); }
  .quota-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .quota-num { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
  .quota-num .unit { font-size: 15px; color: var(--text-faint); margin-left: 2px; }
  .quota-label { color: var(--text-dim); font-size: 13px; }
  .quota-reset { margin-left: auto; color: var(--text-faint); font-size: 12px; }
  .quota-bar { height: 6px; border-radius: 999px; background: var(--bg-elev-2); border: 1px solid var(--border); margin-top: var(--pad-3); overflow: hidden; }
  .quota-bar span { display: block; height: 100%; background: var(--primary); border-radius: 999px; transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .quota.warn .quota-bar span { background: var(--warn); }
  .quota.full .quota-bar span { background: var(--danger); }
  .quota-note { margin: 10px 0 0; font-size: 12.5px; color: var(--warn); }
  .quota.full .quota-note { color: var(--danger); }

  .empty { padding: var(--pad-6) var(--pad-5); display: grid; gap: 10px; justify-items: start; }
  .empty h2 { margin: 0; font-size: 17px; font-weight: 500; }
  .empty p { margin: 0 0 6px; color: var(--text-dim); font-size: 14px; line-height: 1.6; max-width: 56ch; }

  .item { display: flex; align-items: center; position: relative; }
  .item:hover { background: var(--bg-hover); }
  .item-link { flex: 1; min-width: 0; display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center;
    padding: 14px var(--pad-4); color: inherit; text-decoration: none; }
  .item-link:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; border-radius: var(--r-md); }
  .item .badge-sq { width: 32px; height: 32px; font-size: 11px; }
  .meta { display: grid; gap: 2px; min-width: 0; }
  .name { font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta .sub { font-size: 12px; color: var(--text-faint); }
  .status { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-dim); white-space: nowrap; }
  .del { margin-right: 10px; opacity: 0; }
  .item:hover .del, .del:focus-visible { opacity: 1; }
  .del:hover { color: var(--danger); }
  @media (hover: none) { .del { opacity: 1; } }
  @media (max-width: 560px) {
    .item-link { grid-template-columns: auto 1fr; }
    .status { grid-column: 2; }
  }

  .modal-bg { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: grid; place-items: center; z-index: 1000; padding: 16px; }
  .modal { padding: var(--pad-5); max-width: 440px; width: 100%; display: grid; gap: 14px; }
  .modal h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .modal p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-dim); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
