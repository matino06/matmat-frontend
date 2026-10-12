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
  <div class="zadaci-head" style="margin-bottom:20px">
    <div>
      <h1>Novi predmet</h1>
      <div class="sub">Prvo osnovno o predmetu, a zatim materijali iz kojih MatMat izrađuje plan i zadatke.</div>
    </div>
  </div>

  {#if ownCourses.loaded && !ownCourses.isCreator}
    <div class="card card-pad muted">Izrada vlastitih predmeta još nije dostupna za tvoj račun.</div>
  {:else}
    <form class="card card-pad form" onsubmit={(e) => { e.preventDefault(); create(); }}>
      <label class="field">
        <span>Naziv</span>
        <input bind:value={name} maxlength="100" placeholder="npr. Kemija — test iz kiselina i baza" />
      </label>
      <label class="field">
        <span>Predmet</span>
        <select bind:value={subject}>
          <option value="" disabled>Odaberi predmet</option>
          {#each SUBJECTS as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span>Razina</span>
        <select bind:value={level}>
          <option value="" disabled>Odaberi razinu</option>
          {#each LEVELS as l (l.id)}<option value={l.id}>{l.label}</option>{/each}
        </select>
      </label>
      {#if error}<div class="error">{error}</div>{/if}
      <div class="actions">
        <button type="button" class="btn btn-ghost" onclick={() => goto("/moji-predmeti")}>Odustani</button>
        <button type="submit" class="btn btn-primary" disabled={!valid || busy}>{busy ? "Spremam…" : "Napravi predmet"}</button>
      </div>
    </form>
  {/if}
</div>

<style>
  .narrow { max-width: 620px; }
  .muted { color: var(--text-dim); }
  .form { display: grid; gap: 16px; }
  .field { display: grid; gap: 6px; }
  .field span { font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
  .field input, .field select { padding: 9px 12px; border-radius: var(--r-md); border: 1px solid var(--border); background: var(--bg-elev); color: var(--text); font: inherit; font-size: 14px; outline: none; transition: border-color 0.12s; }
  .field input:focus, .field select:focus { border-color: var(--primary); }
  .error { color: var(--danger); font-size: 13px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
