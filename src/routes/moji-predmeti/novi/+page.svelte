<script>
  import { goto } from "$app/navigation";
  import { apiClient } from "$lib/api/apiClient";
  import { ownCourses, SUBJECTS, LEVELS } from "$lib/store/ownCourses.svelte";

  let name = $state("");
  let subject = $state("");
  let level = $state("");
  let busy = $state(false);
  let error = $state("");
  let valid = $derived(name.trim().length > 0 && name.trim().length <= 100 && subject && level);

  async function create() {
    if (!valid || busy) return;
    busy = true;
    error = "";
    try {
      const res = await apiClient("/own-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, level }),
      });
      if (res.status === 409) {
        error = "Već imaš predmet s tim nazivom.";
        return;
      }
      if (!res.ok) throw new Error();
      const created = await res.json();
      ownCourses.courses = [created, ...ownCourses.courses];
      goto(`/moji-predmeti/${created.courseId}`);
    } catch {
      error = "Predmet nije spremljen. Pokušaj ponovno.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="page narrow">
  <div class="zadaci-head">
    <div>
      <h1>Novi predmet</h1>
      <div class="sub">Prvo naziv, predmet i razina, a zatim materijali iz kojih nastaju plan i zadaci.</div>
    </div>
  </div>

  {#if ownCourses.loaded && !ownCourses.isCreator}
    <div class="card card-pad muted">Izrada vlastitih predmeta još nije dostupna za tvoj račun.</div>
  {:else}
    <form class="card form" onsubmit={(e) => { e.preventDefault(); create(); }}>
      <label class="form-field">
        <span class="field-label">Naziv</span>
        <input class="inp" bind:value={name} maxlength="100" placeholder="npr. Kemija, test iz kiselina i baza" />
      </label>

      <div class="form-field" role="radiogroup" aria-labelledby="subject-l">
        <span class="field-label" id="subject-l">Predmet</span>
        <div class="chips">
          {#each SUBJECTS as s (s.id)}
            <button type="button" class="chip" class:active={subject === s.id} role="radio" aria-checked={subject === s.id}
              onclick={() => (subject = s.id)}>{s.label}</button>
          {/each}
        </div>
      </div>

      <div class="form-field" role="radiogroup" aria-labelledby="level-l">
        <span class="field-label" id="level-l">Razina</span>
        <div class="seg">
          {#each LEVELS as l (l.id)}
            <button type="button" class="seg-item" class:active={level === l.id} role="radio" aria-checked={level === l.id}
              onclick={() => (level = l.id)}>{l.label}</button>
          {/each}
        </div>
        <span class="field-hint">Prema razini se prilagođavaju težina zadataka, računanje i duljina objašnjenja.</span>
      </div>

      {#if error}<div class="error">{error}</div>{/if}
      <div class="actions">
        <button type="button" class="btn btn-ghost" onclick={() => goto("/moji-predmeti")}>Odustani</button>
        <button type="submit" class="btn btn-primary" disabled={!valid || busy}>{busy ? "Spremam…" : "Napravi predmet"}</button>
      </div>
    </form>
  {/if}
</div>

<style>
  .narrow { max-width: 640px; }
  .muted { color: var(--text-dim); }
  .form { padding: var(--pad-5); display: grid; gap: var(--pad-4); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font: inherit; font-size: 13px; padding: 6px 12px; }
  .seg { justify-self: start; max-width: 100%; flex-wrap: wrap; }
  .seg-item { border: none; background: none; font: inherit; font-size: 13px; font-weight: 500; padding: 6px 12px; }
  .error { color: var(--danger); font-size: 13px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: var(--pad-2); border-top: 1px solid var(--border); }
</style>
