<script>
  import { onMount } from "svelte";
  import { apiClient } from "$lib/api/apiClient";
  import { goto } from "$app/navigation";

  let calendarDays = $state([]);
  let dailyGoal = $state(8);
  let todayGoal = $state(0);
  let totalDaysActive = $state(0);
  let currentStreak = $state(0);
  let longestStreak = $state(0);
  let registrationDate = $state(null);
  let savingGoal = $state(false);

  // Goals array from /account/goals — each item: { course: { courseId, courseName }, dailyGoal }
  let goals = $state([]);
  let currentCourseId = $state(null);

  // Slider value — kept in sync with the active course goal
  let sliderValue = $state(8);

  function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const [year, month, day] = String(dateStr).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function toLocalKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function buildCalendarDays(rawDays) {
    if (!rawDays || rawDays.length === 0) return [];
    const dayMap = {};
    for (const d of rawDays) {
      const date = parseLocalDate(d.date);
      const key = toLocalKey(date);
      dayMap[key] = { ...d, date };
    }

    let minDate = new Date(Math.min(...Object.values(dayMap).map(d => d.date)));
    const maxDate = new Date();

    if (registrationDate) {
      const regKey = toLocalKey(registrationDate);
      if (!dayMap[regKey]) dayMap[regKey] = { date: registrationDate, goalMet: false, partial: false, completed: 0, goal: dailyGoal };
      if (registrationDate < minDate) minDate = new Date(registrationDate);
    }

    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    const allDays = [];
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
      const key = toLocalKey(cursor);
      allDays.push(dayMap[key]
        ? { ...dayMap[key], date: new Date(cursor) }
        : { date: new Date(cursor), goalMet: false, partial: false, completed: 0, goal: dailyGoal }
      );
      cursor.setDate(cursor.getDate() + 1);
    }
    return allDays;
  }

  function groupByWeek(days) {
    if (!days.length) return [];
    const weeks = [];
    let week = [];
    const firstDow = days[0].date.getDay();
    const pad = firstDow === 0 ? 6 : firstDow - 1;
    for (let p = 0; p < pad; p++) week.push(null);
    for (const day of days) {
      week.push(day);
      if (day.date.getDay() === 0) { weeks.push(week); week = []; }
    }
    if (week.length) weeks.push(week);
    return weeks;
  }

  function findStreaks(weeks) {
    const days = weeks.flat().filter(Boolean);
    let longest = 0, cur = 0;
    for (const d of days) {
      if (d.goalMet) { cur++; if (cur > longest) longest = cur; }
      else cur = 0;
    }
    longestStreak = longest;

    cur = 0;
    let skipToday = true;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].goalMet) { cur++; }
      else if (skipToday && i === days.length - 1) { skipToday = false; }
      else break;
    }
    currentStreak = cur;
  }

  async function fetchUserGoal() {
    const [userGoalRes, goalsRes, courseRes] = await Promise.all([
      apiClient("/user-goal", { method: "GET" }),
      apiClient("/account/goals", { method: "GET" }),
      apiClient("/account/current-course", { method: "GET" }),
    ]);

    const data = await userGoalRes.json();
    dailyGoal = data.dailyGoal;
    todayGoal = data.todayGoal;
    calendarDays = data.calendarDays?.length
      ? data.calendarDays
      : [{ date: data.registrationDate, goalMet: false, partial: false, completed: 0, goal: dailyGoal }];
    totalDaysActive = calendarDays.filter(d => d.completed > 0).length;
    registrationDate = parseLocalDate(data.registrationDate);

    if (goalsRes.ok) goals = await goalsRes.json();
    if (courseRes.ok) {
      const course = await courseRes.json();
      currentCourseId = course.courseId;
    }

    // Sync slider to the active course's goal
    const activeGoal = goals.find(g => g.course?.courseId === currentCourseId);
    sliderValue = activeGoal?.dailyGoal ?? dailyGoal;
  }

  async function updateGoal() {
    // Update the matching goal in the array before submitting
    const g = goals.find(g => g.course?.courseId === currentCourseId);
    if (g) g.dailyGoal = sliderValue;

    savingGoal = true;
    try {
      const res = await apiClient("/account/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCourseGoalsNew: goals }),
      });
      if (res.ok) {
        dailyGoal = sliderValue;
        todayGoal = sliderValue;
      }
    } finally {
      savingGoal = false;
    }
  }

  onMount(fetchUserGoal);

  let weeks = $derived(groupByWeek(buildCalendarDays(calendarDays)));

  $effect(() => {
    if (weeks.length > 0) findStreaks(weeks);
  });

  let todayCompleted = $derived(
    weeks.length ? (weeks[weeks.length - 1]?.findLast(d => d !== null)?.completed ?? 0) : 0
  );

  const DAY_LETTERS = ["P","U","S","Č","P","S","N"];
  const today = new Date();

  function isToday(date) { return date?.toDateString() === today.toDateString(); }

  function cellLevel(day) {
    if (!day || !todayGoal) return 0;
    const pct = day.completed / todayGoal;
    if (pct <= 0) return 0;
    if (pct < 0.33) return 1;
    if (pct < 0.67) return 2;
    if (pct < 1) return 3;
    return 4;
  }


</script>

<div class="page">
  <div class="zadaci-head" style="margin-bottom:20px">
    <div>
      <h1>Ciljevi i navika</h1>
      <div class="sub">Konzistentnost &gt; intenzitet</div>
    </div>
  </div>

  <div class="ciljevi-grid">
    <!-- Streak card -->
    <div class="card streak-card card-pad">
      <div style="display:flex;align-items:center;gap:8px;color:var(--text-dim);font-size:13px;margin-bottom:10px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        Trenutni streak
      </div>
      <div class="streak-val">
        <div class="n">{currentStreak}</div>
        <div class="u">dana zaredom</div>
      </div>
      <div class="streak-stats" style="margin-top:16px">
        <div class="stat">
          <div class="v">{longestStreak}</div>
          <div class="l">Najdulji streak</div>
        </div>
        <div class="stat">
          <div class="v">{totalDaysActive}</div>
          <div class="l">Aktivnih dana</div>
        </div>
        <div class="stat">
          <div class="v">{calendarDays.reduce((sum, d) => sum + (d.completed ?? 0), 0)}</div>
          <div class="l">Ukupno zadataka</div>
        </div>
      </div>
    </div>

    <!-- Daily goal card -->
    <div class="card daily-card card-pad">
      <h3 style="font-size:14px;font-weight:600;margin:0 0 12px">Dnevni cilj</h3>
      <div class="daily-target">
        <div class="n">{sliderValue}</div>
        <div class="u">zadataka / dan</div>
      </div>

      <div class="today-bar" style="margin-top:16px">
        <div class="fill" style="width:{todayGoal ? Math.min(100, todayCompleted/todayGoal*100) : 0}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--text-faint)">
        <span>Danas: <b class="mono" style="color:var(--text)">{todayCompleted}</b> / {todayGoal}</span>
        <span>{todayGoal ? Math.round(todayCompleted/todayGoal*100) : 0}%</span>
      </div>

      <!-- Slider -->
      <div class="slider-row" style="margin-top:16px">
        <span style="font-size:11px;color:var(--text-faint)">1</span>
        <input
          type="range"
          min="1" max="5" step="1"
          bind:value={sliderValue}
          class="slider"
          onchange={updateGoal}
          style="--pct: {((sliderValue - 1) / 4) * 100}%"
        />
        <span style="font-size:11px;color:var(--text-faint)">5</span>
      </div>
      {#if savingGoal}
        <div style="text-align:center;font-size:11px;color:var(--text-faint);margin-top:4px">Spremanje…</div>
      {/if}

      <button class="btn btn-primary" style="margin-top:14px;width:100%;justify-content:center" onclick={() => goto('/tasks')}>
        Riješi zadatke danas →
      </button>
    </div>
  </div>

  <!-- Heatmap -->
  <div class="card card-pad" style="margin-top:16px">
    <div style="font-size:14px;font-weight:600;margin-bottom:16px">Aktivnost</div>

    <div class="heatmap-wrap">
      <div style="display:flex;gap:4px">
        <!-- Day letters -->
        <div style="display:flex;flex-direction:column;gap:2px;width:28px;flex-shrink:0">
          {#each DAY_LETTERS as letter, i (i)}
            <div style="height:14px;font-size:9px;color:var(--text-faint);display:flex;align-items:center;line-height:1">
              {i % 2 === 0 ? letter : ''}
            </div>
          {/each}
        </div>

        <!-- Weeks grid -->
        <div style="display:flex;gap:2px;overflow-x:auto;flex:1">
          {#each weeks as week, wi (wi)}
            <div style="display:flex;flex-direction:column;gap:2px">
              {#each week as day, di (di)}
                {#if day}
                  <div
                    class="hm-cell l{cellLevel(day)}"
                    class:hm-today={isToday(day.date)}
                    title="{day.date.toLocaleDateString('hr-HR')}: {day.completed ?? 0} zadataka"
                  ></div>
                {:else}
                  <div class="hm-cell" style="opacity:0"></div>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
      </div>

      <!-- Legend -->
      <div style="display:flex;align-items:center;gap:4px;margin-top:12px;font-size:11px;color:var(--text-faint)">
        <span>Manje</span>
        <div class="hm-cell"></div>
        <div class="hm-cell l1"></div>
        <div class="hm-cell l2"></div>
        <div class="hm-cell l3"></div>
        <div class="hm-cell l4"></div>
        <span>Više</span>
      </div>
    </div>
  </div>
</div>

<style>
  .heatmap-wrap { overflow-x: auto; }
  .daily-target {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .daily-target .n {
    font-size: 40px;
    font-weight: 800;
    font-family: var(--font-mono);
    letter-spacing: -0.04em;
    color: var(--primary);
    line-height: 1;
  }
  .daily-target .u { font-size: 13px; color: var(--text-faint); }

  .streak-val {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 4px;
  }
  .streak-val .n {
    font-size: 52px;
    font-weight: 800;
    font-family: var(--font-mono);
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--text);
  }
  .streak-val .u { font-size: 13px; color: var(--text-faint); }

  .streak-stats {
    display: flex;
    gap: 20px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .streak-stats .stat .v {
    font-size: 20px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text);
  }
  .streak-stats .stat .l { font-size: 11px; color: var(--text-faint); }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .slider {
    flex: 1;
    -webkit-appearance: none;
    height: 5px;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--primary) var(--pct, 50%), var(--border) var(--pct, 50%));
    outline: none;
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-dim);
    cursor: grab;
  }
  .slider::-webkit-slider-thumb:active { cursor: grabbing; }
</style>
