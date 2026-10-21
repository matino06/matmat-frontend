<script>
  import { PROGRAMS, subjectsFor, isSelectableProgram } from "$lib/config/programs";

  // `value`: ids of the picked programs, at most one per subject (a level).
  let { value = $bindable([]), isAdmin = false } = $props();

  let subjects = $derived(subjectsFor(isAdmin));

  // The level a subject comes back with when it is ticked again.
  let lastLevel = $state({});

  // Kept in PROGRAMS order, whatever order the student clicked in.
  const ordered = (ids) => PROGRAMS.map((p) => p.id).filter((id) => ids.includes(id));

  const pickedOf = (s) => s.programs.find((p) => value.includes(p.id));
  const selectable = (s) => s.programs.some((p) => isSelectableProgram(p, isAdmin));

  function toggle(s) {
    const picked = pickedOf(s);
    if (picked) {
      lastLevel[s.id] = picked.id;
      value = value.filter((id) => id !== picked.id);
    } else {
      const back = s.programs.find((p) => p.id === lastLevel[s.id]) ?? s.programs[0];
      value = ordered([...value, back.id]);
    }
  }

  // Picking a level also ticks the subject.
  function pickLevel(s, p) {
    const others = s.programs.map((x) => x.id);
    value = ordered([...value.filter((id) => !others.includes(id)), p.id]);
  }
</script>

<ul class="subjects">
  {#each subjects as s (s.id)}
    {@const picked = pickedOf(s)}
    {@const shown = picked ?? s.programs.find((p) => p.id === lastLevel[s.id]) ?? s.programs[0]}
    {@const open = selectable(s)}
    <li class="subject" class:on={!!picked} class:soon={!open}>
      <button
        type="button"
        class="subject-head"
        role="checkbox"
        aria-checked={!!picked}
        disabled={!open}
        onclick={() => toggle(s)}
      >
        <span class="badge" style:--hue={shown.color}>{shown.badge}</span>
        <span class="meta">
          <span class="name">{s.name}</span>
          <span class="sub">{shown.sub}</span>
        </span>
        {#if open}
          <span class="check" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        {:else}
          <span class="soon-pill">Uskoro</span>
        {/if}
      </button>

      {#if open && s.programs.length > 1}
        <div class="levels">
          <div class="seg" role="radiogroup" aria-label="Razina: {s.name}">
            {#each s.programs as p (p.id)}
              <button
                type="button"
                role="radio"
                aria-checked={shown.id === p.id && !!picked}
                class:active={shown.id === p.id}
                onclick={() => pickLevel(s, p)}
              >{p.level} razina</button>
            {/each}
          </div>
          <p class="hint">{shown.hint}</p>
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .subjects {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    overflow: hidden;
  }
  .subject + .subject { border-top: 1px solid var(--border); }
  .subject { transition: background .15s; }
  .subject.on { background: color-mix(in srgb, var(--primary) 6%, transparent); }

  .subject-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .subject-head:disabled { cursor: default; }
  .subject-head:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
    border-radius: var(--r-lg);
  }

  /* The badge is the one the switcher shows; it takes the subject's colour
     only once the subject is picked. */
  .badge {
    width: 40px;
    height: 40px;
    border-radius: var(--r-md);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: var(--bg-elev-2);
    color: var(--text-faint);
    border: 1px solid var(--border);
    transition: background .2s, color .2s, border-color .2s;
  }
  .on .badge {
    background: hsl(var(--hue) 75% 55%);
    border-color: transparent;
    color: #fff;
  }

  .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .name { font-size: 15px; font-weight: 600; color: var(--text); }
  .soon .name { color: var(--text-dim); }
  .sub { font-size: 12px; color: var(--text-faint); }

  .check {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--border-strong);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: transparent;
    transition: background .15s, border-color .15s, color .15s;
  }
  .on .check { background: var(--primary); border-color: var(--primary); color: #fff; }
  .subject-head:not(:disabled):hover .check { border-color: var(--primary); }

  .soon-pill {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-dim);
    padding: 3px 9px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }

  /* Aligned under the subject name: 18px padding + 40px badge + 14px gap. */
  .levels { padding: 0 18px 16px 72px; }
  .seg {
    display: inline-flex;
    padding: 3px;
    gap: 2px;
    border-radius: var(--r-md);
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
  }
  .seg button {
    padding: 6px 14px;
    border: 0;
    border-radius: calc(var(--r-md) - 3px);
    background: none;
    color: var(--text-dim);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .seg button:hover { color: var(--text); }
  .seg button.active { background: var(--bg-elev); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
  .on .seg button.active { color: var(--primary); }
  .seg button:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
  .hint { margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: var(--text-dim); max-width: 46ch; }

  @media (max-width: 480px) {
    .subject-head { padding: 14px; gap: 12px; }
    .levels { padding: 0 14px 14px 66px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .subject, .badge, .check, .seg button { transition: none; }
  }
</style>
