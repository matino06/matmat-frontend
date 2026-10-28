<script>
  import { onMount } from "svelte";
  import { userData } from "$lib/store/user.svelte";
  import { closeSubjects } from "$lib/store/ui.svelte";
  import { courseState, saveChosenCourses, saveCurrentCourse } from "$lib/store/course.svelte";
  import { getProgram, isVisibleProgram } from "$lib/config/programs.svelte";
  import { ownCourses } from "$lib/store/ownCourses.svelte";
  import SubjectPicker from "./SubjectPicker.svelte";

  // Before the student ever chose (older accounts), the current course stands in.
  const initial = (courseState.chosen ?? [courseState.courseId])
    .map(getProgram)
    .filter((p) => p && isVisibleProgram(p, userData.isAdmin))
    .map((p) => p.id);

  let value = $state([...initial]);
  let busy = $state(false);
  let error = $state("");
  let dialog;

  let removed = $derived(initial.filter((id) => !value.includes(id)).map(getProgram));
  // Taking away the course being studied moves the student to another one,
  // the same subject's other level if there is one.
  let current = $derived(getProgram(courseState.courseId));
  // A creator with an own course may take no matura subject (e.g. 7th grade) and
  // studies only own courses; without one, there would be nothing left to study.
  let mayChooseNone = $derived(ownCourses.isCreator && ownCourses.courses.length > 0);
  let moveTo = $derived.by(() => {
    if (!current || value.includes(current.id)) return null;
    if (!value.length) {
      return mayChooseNone ? { id: ownCourses.courses[0].courseId, label: ownCourses.courses[0].courseName } : null;
    }
    const picked = value.map(getProgram);
    return picked.find((p) => p.subject === current.subject) ?? picked[0];
  });
  let canSave = $derived(value.length > 0 || mayChooseNone);

  onMount(() => dialog?.focus());

  async function save() {
    if (busy || !canSave) return;
    busy = true;
    error = "";
    try {
      await saveChosenCourses(value);
      if (moveTo) {
        await saveCurrentCourse(moveTo.id);
        // Every page fetches its course content on mount.
        window.location.reload();
        return;
      }
      closeSubjects();
    } catch {
      error = "Promjena nije spremljena. Provjeri vezu i pokušaj ponovno.";
    } finally {
      busy = false;
    }
  }

  function close() {
    if (!busy) closeSubjects();
  }
</script>

<div class="modal-bg" role="presentation" onclick={close}>
  <div
    class="card modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="subjects-h"
    tabindex="-1"
    bind:this={dialog}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === "Escape" && close()}
  >
    <div>
      <h2 id="subjects-h">Tvoji predmeti</h2>
      <p>Između njih se prebacuješ u izborniku na vrhu bočne trake.</p>
    </div>

    <SubjectPicker bind:value isAdmin={userData.isAdmin} />

    {#if !value.length && !mayChooseNone}
      <p class="note">{ownCourses.isCreator ? "Odaberi barem jedan predmet ili prvo napravi vlastiti." : "Odaberi barem jedan predmet."}</p>
    {:else if !value.length}
      <p class="note">
        Bez predmeta s mature: učiš samo svoje predmete.
        {#if moveTo}Nakon spremanja učiš: <b>{moveTo.label}</b>.{/if}
      </p>
    {:else if moveTo || removed.length}
      <p class="note">
        {#if moveTo}Nakon spremanja učiš: <b>{moveTo.label}</b>.{/if}
        {#if removed.length}Napredak se ne briše: ako vratiš predmet, nastavljaš gdje si stao.{/if}
      </p>
    {/if}
    {#if error}<p class="note error" role="alert">{error}</p>{/if}

    <div class="actions">
      <button class="btn btn-ghost" disabled={busy} onclick={close}>Odustani</button>
      <button class="btn btn-primary" disabled={busy || !canSave} onclick={save}>
        {busy ? "Spremam…" : "Spremi"}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-bg {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: grid; place-items: center;
    z-index: 1000; padding: 16px;
    overflow-y: auto;
  }
  .modal {
    padding: var(--pad-5);
    max-width: 480px; width: 100%;
    margin: auto;
    display: grid; gap: 18px;
  }
  .modal:focus { outline: none; }
  h2 { margin: 0 0 4px; font-size: 17px; font-weight: 600; }
  p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-dim); }
  .note b { color: var(--text); font-weight: 600; }
  .error { color: var(--danger); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }

  @media (max-width: 480px) {
    .modal { padding: 20px 16px; }
  }
</style>
