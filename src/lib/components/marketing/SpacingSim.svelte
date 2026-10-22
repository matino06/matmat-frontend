<script>
  import { RATINGS } from "$lib/components/ratingPicker/RatingPicker.svelte";
  import { next, interval } from "$lib/fsrs.js";

  // /kako-radi: rate one outcome four times and watch when it comes back. The same
  // FSRS-6 as the backend: each rating updates how long the outcome is remembered
  // (its stability), and it comes back when the chance of still knowing it falls
  // to 90 %. Every review here happens on its day.

  const STEPS = 4;
  const PRESETS = [
    { label: "Ide ti dobro", ratings: [3, 3, 3, 3] },
    { label: "Ide s mukom", ratings: [2, 2, 2, 2] },
    { label: "Jednom zapneš", ratings: [3, 3, 1, 3] },
  ];

  let ratings = $state([3, 3, 3, 3]);

  function schedule(grades) {
    let state = null;
    let gap = 0;
    let day = 0;
    return grades.map((q) => {
      const at = day;
      state = next(state, q, gap);
      gap = interval(state.s);
      day += gap;
      return { q, at, gap, next: day };
    });
  }

  let plan = $derived(schedule(ratings));
  let span = $derived(Math.max(30, plan[plan.length - 1].next));
  const pos = (d) => `${(d / span) * 100}%`;
  const days = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "dan" : "dana"}`;
  const stepName = (i) => (i === 0 ? "Prvi put" : `${i}. ponavljanje`);

  // Day marks on the line; a label too close to the one before it is left off.
  let marks = $derived.by(() => {
    const list = [...plan.map((s) => ({ day: s.at, next: false })), { day: plan[STEPS - 1].next, next: true }];
    let last = -Infinity;
    return list.map((m) => {
      const show = m.next || (m.day - last) / span >= 0.05;
      if (show) last = m.day;
      return { ...m, show };
    });
  });
</script>

<div class="ss">
  <div class="ss-presets" role="group" aria-label="Primjeri">
    {#each PRESETS as p (p.label)}
      <button
        class="ss-preset"
        class:on={p.ratings.every((q, i) => q === ratings[i])}
        onclick={() => (ratings = [...p.ratings])}
      >{p.label}</button>
    {/each}
  </div>

  <ol class="ss-steps">
    {#each plan as s, i (i)}
      <li class="ss-step">
        <div class="ss-when">
          <span class="ss-step-name">{stepName(i)}</span>
          <span class="ss-day">dan {s.at}</span>
        </div>
        <div class="ss-rates" role="radiogroup" aria-label="Ocjena: {stepName(i)}">
          {#each RATINGS as r (r.k)}
            <button
              class="ss-rate"
              class:on={ratings[i] === r.k}
              style="--rc:{r.color}"
              role="radio"
              aria-checked={ratings[i] === r.k}
              title={r.desc}
              onclick={() => (ratings[i] = r.k)}
            >{r.t}</button>
          {/each}
        </div>
        <div class="ss-result" class:reset={s.q === 1}>
          vraća se za <b>{days(s.gap)}</b>
        </div>
      </li>
    {/each}
  </ol>

  <div class="ss-line" aria-hidden="true">
    <div class="ss-axis"></div>
    {#each marks as m, i (i)}
      <span class="ss-dot" class:ss-next={m.next} style="left:{pos(m.day)}">
        {#if m.show}<span class="ss-dot-label">{m.day === 0 ? "dan 0" : m.day}</span>{/if}
      </span>
    {/each}
  </div>
  <p class="ss-sum">
    Četiri rješavanja, a sljedeće ponavljanje tek na dan <b>{plan[STEPS - 1].next}</b>.
  </p>
  <p class="ss-note">FSRS, algoritam koji MatMat koristi, ovdje uz ponavljanje točno na dan. U aplikaciji se razmak računa za svaki tvoj ishod posebno, a pred ispit se sažima tako da sve stigne prije njega.</p>
</div>

<style>
  .ss { min-width: 0; }
  .ss-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
  .ss-preset {
    height: 32px;
    padding: 0 14px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-dim);
    font-size: 13px;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .ss-preset:hover { color: var(--text); border-color: var(--border-strong); }
  .ss-preset.on { color: var(--text); border-color: var(--primary-border); background: var(--primary-dim); }

  .ss-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .ss-step {
    display: grid;
    grid-template-columns: 120px auto minmax(0, 1fr);
    gap: 16px;
    align-items: center;
    padding: 12px 16px;
    border: 1px solid var(--border);
    border-top-width: 0;
    background: var(--bg-elev);
  }
  .ss-step:first-child { border-top-width: 1px; border-radius: var(--r-lg) var(--r-lg) 0 0; }
  .ss-step:last-child { border-radius: 0 0 var(--r-lg) var(--r-lg); }
  .ss-when { display: flex; flex-direction: column; line-height: 1.25; }
  .ss-step-name { font-size: 14px; font-weight: 500; color: var(--text); }
  .ss-day { font-size: 12px; font-family: var(--font-mono); color: var(--text-faint); }
  .ss-rates { display: flex; gap: 4px; }
  .ss-rate {
    height: 30px;
    padding: 0 9px;
    display: grid;
    place-items: center;
    white-space: nowrap;
    border-radius: var(--r-sm);
    border: 1px solid color-mix(in srgb, var(--rc) 25%, var(--border));
    background: color-mix(in srgb, var(--rc) 6%, var(--bg-elev));
    color: var(--rc);
    font-size: 12px;
    font-weight: 600;
    transition: background 0.12s, border-color 0.12s;
  }
  .ss-rate:hover { border-color: color-mix(in srgb, var(--rc) 60%, transparent); }
  .ss-rate.on { border-color: var(--rc); background: color-mix(in srgb, var(--rc) 24%, var(--bg-elev)); }
  .ss-result { font-size: 14px; color: var(--text-dim); text-align: right; }
  .ss-result b { color: var(--text); font-weight: 600; }
  .ss-result.reset { color: #f97316; }

  .ss-line { position: relative; height: 44px; margin: 26px 12px 0; }
  .ss-axis { position: absolute; left: 0; right: 0; top: 10px; height: 2px; border-radius: 2px; background: var(--border-strong); }
  .ss-dot {
    position: absolute;
    top: 5px;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 0 2px var(--bg);
    transition: left 0.3s ease;
  }
  .ss-next { background: var(--bg); border: 2px solid var(--primary); }
  .ss-dot-label {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-faint);
    white-space: nowrap;
  }
  .ss-sum { margin: 8px 0 0; font-size: 15px; color: var(--text-dim); }
  .ss-sum b { color: var(--text); font-weight: 600; }
  .ss-note { margin: 10px 0 0; font-size: 13px; line-height: 1.5; color: var(--text-faint); }

  @media (max-width: 640px) {
    .ss-step { grid-template-columns: minmax(0, 1fr) auto; gap: 10px 12px; padding: 12px 14px; }
    .ss-rates { grid-column: 1 / -1; grid-row: 2; }
    .ss-rate { flex: 1; height: 34px; padding: 0 4px; }
    .ss-result { grid-column: 2; grid-row: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ss-dot { transition: none; }
  }
</style>
