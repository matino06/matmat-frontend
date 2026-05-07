<script>
  import { onMount } from 'svelte';
  let { onDone, tasksCompleted = 0, streak = 0, readinessPct = 0 } = $props();

  const confetti = Array.from({ length: 48 }).map((_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 1.2 + Math.random() * 1.2,
    color: ['#6366f1','#34d399','#fbbf24','#f87171','#a78bfa','#38bdf8'][i % 6],
    size: 6 + Math.random() * 8,
    rot: Math.random() * 360,
    isCircle: i % 3 === 0,
    isSquare: i % 3 === 1,
  }));

  let tasksVal = $state(0);
  let streakVal = $state(0);
  let readinessVal = $state(0);

  onMount(() => {
    const animate = (target, setter, delay) => {
      setTimeout(() => {
        const steps = 40;
        let i = 0;
        const iv = setInterval(() => {
          i++;
          setter(Math.round(target * (i / steps)));
          if (i >= steps) clearInterval(iv);
        }, 900 / steps);
      }, delay);
    };
    animate(tasksCompleted, v => tasksVal = v, 800);
    animate(streak, v => streakVal = v, 1000);
    animate(readinessPct, v => readinessVal = v, 1200);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="celebration-overlay" onclick={onDone}>
  <div class="celebration-bg"></div>

  {#each confetti as c, i (i)}
    <div
      class="confetti-piece"
      style="
        left: {c.x}%;
        width: {c.size}px;
        height: {c.size}px;
        background: {c.color};
        border-radius: {c.isCircle ? '50%' : c.isSquare ? '2px' : '0'};
        animation: confettiFall {c.dur}s {c.delay}s ease-in forwards;
        transform: rotate({c.rot}deg);
      "
    ></div>
  {/each}

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="celebration-card" onclick={(e) => e.stopPropagation()}>
    <div class="celebration-trophy">🏆</div>
    <div class="celebration-title">Dnevni cilj ispunjen!</div>
    <div class="celebration-sub">Odličan posao danas. Algoritam je zabilježio napredak.</div>
    <div class="celebration-stats">
      <div class="celebration-stat">
        <div class="celebration-stat-val">{tasksVal}</div>
        <div class="celebration-stat-label">zadataka</div>
      </div>
      <div class="celebration-stat">
        <div class="celebration-stat-val">+{streakVal}</div>
        <div class="celebration-stat-label">streak</div>
      </div>
      <div class="celebration-stat">
        <div class="celebration-stat-val">{readinessVal}%</div>
        <div class="celebration-stat-label">spreman</div>
      </div>
    </div>
    <div class="celebration-hint">Klikni bilo gdje za nastavak →</div>
  </div>
</div>

<style>
  .celebration-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: fadeInOverlay .25s ease;
  }
  .celebration-bg {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.72);
    cursor: pointer;
  }
  .confetti-piece {
    position: absolute;
    top: -5%;
  }
  .celebration-card {
    position: relative;
    z-index: 1;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 48px 56px;
    text-align: center;
    animation: celebrateIn .9s cubic-bezier(0.34,1.56,0.64,1) forwards;
    box-shadow: 0 40px 120px rgba(0,0,0,0.6);
  }
  .celebration-trophy {
    font-size: 64px;
    line-height: 1;
    margin-bottom: 16px;
    animation: trophyPop .7s .55s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .celebration-title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 8px;
    color: var(--text);
  }
  .celebration-sub {
    font-size: 16px;
    color: var(--text-dim);
    margin-bottom: 24px;
  }
  .celebration-stats {
    display: flex;
    gap: 24px;
    justify-content: center;
    margin-bottom: 24px;
  }
  .celebration-stat { text-align: center; }
  .celebration-stat-val {
    font-size: 26px;
    font-weight: 800;
    color: var(--primary);
    letter-spacing: -0.03em;
    font-family: var(--font-mono);
  }
  .celebration-stat-label {
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 3px;
  }
  .celebration-hint { font-size: 12px; color: var(--text-faint); }

  @keyframes fadeInOverlay { from { opacity:0 } to { opacity:1 } }
  @keyframes confettiFall {
    0%   { transform: translateY(0) rotate(0deg) scale(1); opacity:1; }
    100% { transform: translateY(110vh) rotate(720deg) scale(0.5); opacity:0; }
  }
  @keyframes celebrateIn {
    0%   { opacity:0; transform: scale(0.05); }
    30%  { opacity:1; transform: scale(0.65); }
    52%  { transform: scale(0.60); }
    70%  { transform: scale(1.10); }
    85%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }
  @keyframes trophyPop {
    0%   { transform: scale(0) rotate(-30deg); }
    55%  { transform: scale(0) rotate(-30deg); }
    80%  { transform: scale(1.4) rotate(14deg); }
    92%  { transform: scale(0.88) rotate(-5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
</style>
