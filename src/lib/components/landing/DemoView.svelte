<script>
  import { DEMO_FIELDS, DEMO_OBJECTIVES, DEMO_EXAMS, DEMO_ACTIVITY } from "./demoData";

  // Static pages of the landing page preview, drawn like their real counterparts
  // (/progress, /goals, /mock-exam). The app preview shows them whole with a page
  // head; the feature list on the landing page shows single parts of them.
  // part: "progress" | "readiness" | "objectives" | "goals" | "exams"
  let { part, readiness = 60, solvedToday = 6, goal = 10, withHead = false, onStartExam, level = "A" } = $props();

  const SIZE = 132;
  const STROKE = 10;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  let dash = $derived((readiness / 100) * CIRC);

  const HEAD = {
    progress: ["Napredak", "Tvoja priprema za maturu · Matematika"],
    goals: ["Ciljevi i navika", "Konzistentnost > intenzitet"],
    exams: ["Probna matura", "Simuliraj pravi ispit i vidi gdje stojiš prije prave mature."],
  };
  const DAYS = ["Po", "Ut", "Sr", "Če", "Pe", "Su", "Ne"];
</script>

{#if withHead && HEAD[part]}
  <div class="zadaci-head">
    <div>
      <h1>{HEAD[part][0]}</h1>
      <div class="sub">{HEAD[part][1]}</div>
    </div>
  </div>
{/if}

{#snippet ring()}
  <div class="card dv-ring">
    <div class="dv-ring-wrap">
      <svg width={SIZE} height={SIZE} style="transform:rotate(-90deg)" aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--bg-elev-2)" stroke-width={STROKE} />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--primary)" stroke-width={STROKE}
          stroke-linecap="round" stroke-dasharray="{dash} {CIRC - dash}" style="transition: stroke-dasharray .8s ease" />
      </svg>
      <div class="dv-ring-inner">
        <div class="dv-pct">{readiness}<span>%</span></div>
        <div class="dv-pct-sub">Spremnost</div>
      </div>
    </div>
    <div class="dv-fields">
      <h2>Spremnost za maturu</h2>
      {#each DEMO_FIELDS as f (f.name)}
        <div class="dv-field">
          <div class="dv-field-top">
            <span class="dv-field-name">{f.name}</span>
            <span class="mono">{f.pct}%</span>
          </div>
          <div class="dv-bar"><div style="width:{f.pct}%"></div></div>
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet objectives()}
  <div class="dv-ishodi">
    {#each DEMO_OBJECTIVES as o (o.name)}
      <div class="dv-ishod">
        <span class="dv-status {o.status}"></span>
        <span class="dv-ishod-name">{o.name}</span>
        <span class="dv-dots" aria-label="Zadnja ocjena {o.dots} od 5">
          {#each [0, 1, 2, 3, 4] as j (j)}<span class:filled={j < o.dots}></span>{/each}
        </span>
        <span class="dv-when">{o.when}</span>
      </div>
    {/each}
  </div>
{/snippet}

{#if part === "progress"}
  {@render ring()}
  <div class="section-head">
    <h2>Nastavna područja i ishodi</h2>
    <div class="side">{DEMO_OBJECTIVES.length} od 212 ishoda</div>
  </div>
  {@render objectives()}
{:else if part === "readiness"}
  {@render ring()}
{:else if part === "objectives"}
  {@render objectives()}
{:else if part === "goals"}
  <div class="dv-goals">
    <div class="card card-pad">
      <div class="dv-label">Trenutni streak</div>
      <div class="dv-big"><span class="mono">12</span> dana zaredom</div>
    </div>
    <div class="card card-pad">
      <div class="dv-label">Dnevni cilj</div>
      <div class="dv-big"><span class="mono">{Math.min(solvedToday, goal)}</span> / {goal} zadataka</div>
      <div class="dv-bar dv-bar-goal"><div style="width:{Math.min(100, (solvedToday / goal) * 100)}%"></div></div>
    </div>
  </div>
  <div class="card card-pad dv-heat">
    <div class="dv-label">Aktivnost</div>
    <div class="dv-heat-grid">
      {#each DAYS as d (d)}<span class="dv-heat-day">{d}</span>{/each}
      {#each DEMO_ACTIVITY as a, i (i)}
        <span class="dv-cell l{a}" class:today={i === DEMO_ACTIVITY.length - 1}></span>
      {/each}
    </div>
  </div>
{:else if part === "exams"}
  <div class="dv-exams">
    {#each DEMO_EXAMS as e, i (i)}
      <div class="card dv-exam">
        <div>
          <div class="dv-exam-title">Matematika {level}, {e.title}</div>
          <div class="dv-exam-meta">
            <span class="badge mono">{e.year}</span>
            <span class="badge">{e.term}</span>
          </div>
        </div>
        {#if onStartExam}
          <button class="btn btn-ghost" onclick={() => onStartExam(i)}>Započni</button>
        {:else}
          <span class="btn btn-ghost">Započni</span>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .dv-ring {
    padding: 24px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 36px;
    align-items: center;
  }
  .dv-ring-wrap { position: relative; width: 132px; height: 132px; }
  .dv-ring-inner {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    text-align: center;
  }
  .dv-pct { font-size: 34px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; }
  .dv-pct span { font-size: 16px; color: var(--text-faint); }
  .dv-pct-sub { font-size: 11px; color: var(--text-faint); margin-top: 4px; }
  .dv-fields { min-width: 0; display: flex; flex-direction: column; gap: 11px; }
  .dv-fields h2 { margin: 0 0 4px; font-size: 15px; font-weight: 500; }
  .dv-field-top { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin-bottom: 5px; }
  .dv-field-name { color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dv-bar { height: 5px; border-radius: 99px; background: var(--bg-elev-2); overflow: hidden; }
  .dv-bar > div { height: 100%; border-radius: inherit; background: var(--primary); }
  .dv-bar-goal { margin-top: 14px; }
  .dv-bar-goal > div { background: var(--success); transition: width .4s ease; }

  .dv-ishodi { display: flex; flex-direction: column; }
  .dv-ishod {
    display: grid;
    grid-template-columns: 8px 1fr auto 76px;
    gap: 14px;
    align-items: center;
    padding: 11px 16px;
    border: 1px solid var(--border);
    border-top-width: 0;
    background: var(--bg-elev);
    font-size: 14px;
  }
  .dv-ishod:first-child { border-top-width: 1px; border-radius: var(--r-lg) var(--r-lg) 0 0; }
  .dv-ishod:last-child { border-radius: 0 0 var(--r-lg) var(--r-lg); }
  .dv-status { width: 8px; height: 8px; border-radius: 50%; }
  .dv-status.learning { background: var(--warn); }
  .dv-status.mastered { background: var(--success); }
  .dv-status.scheduled { background: var(--primary); }
  .dv-ishod-name { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dv-dots { display: flex; gap: 3px; }
  .dv-dots span { width: 7px; height: 7px; border-radius: 2px; border: 1px solid var(--border-strong); }
  .dv-dots span.filled { background: var(--primary); border-color: transparent; }
  .dv-when { font-size: 12px; color: var(--text-faint); text-align: right; }

  .dv-goals { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .dv-label { font-size: 13px; color: var(--text-dim); margin-bottom: 10px; }
  .dv-big { font-size: 13px; color: var(--text-faint); }
  .dv-big .mono { font-size: 34px; font-weight: 600; color: var(--text); letter-spacing: -0.03em; margin-right: 4px; }
  .dv-heat-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    max-width: 340px;
  }
  .dv-heat-day { font-size: 10px; color: var(--text-faint); text-align: center; }
  .dv-cell { aspect-ratio: 1; border-radius: 4px; background: var(--bg-elev-2); }
  .dv-cell.l1 { background: hsl(var(--primary-h) 60% 35%); }
  .dv-cell.l2 { background: hsl(var(--primary-h) 70% 50%); }
  .dv-cell.l3 { background: var(--primary); }
  .dv-cell.today { box-shadow: 0 0 0 2px var(--bg-elev), 0 0 0 3px var(--text-dim); }

  .dv-exams { display: flex; flex-direction: column; gap: 10px; }
  .dv-exam {
    padding: 16px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .dv-exam-title { font-size: 15px; font-weight: 500; margin-bottom: 8px; }
  .dv-exam-meta { display: flex; gap: 6px; }

  @media (max-width: 600px) {
    .dv-ishod { grid-template-columns: 8px 1fr auto; gap: 12px; padding: 11px 14px; }
    .dv-dots { display: none; }
    .dv-ring { grid-template-columns: 1fr; justify-items: center; gap: 20px; }
    .dv-fields { width: 100%; }
    .dv-goals { grid-template-columns: 1fr; }
  }
</style>
