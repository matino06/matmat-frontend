<script>
  import { fly } from "svelte/transition";
  import { CheckCircle2, Trophy } from "@lucide/svelte/icons";
  import { onMount } from "svelte";
  import { apiClient } from "$lib/api/apiClient";
    import { today } from "@internationalized/date";

  let dailyGoal = $state(0);
  let currentStreak = $state(0);
  let calendarDays = $state([]);
  let loaded = $state(false);

  let goalMet = $derived(todayCompleted >= dailyGoal);
  let weeks = $derived(groupByWeek(buildCalendarDays(calendarDays)));
  let todayCompleted = $derived(
    weeks?.length
      ? weeks[weeks.length - 1]?.[weeks[weeks.length - 1].length - 1].completed
      : 0
  );

  async function fetchUserGoal() {
    const response = await apiClient(
        "/user-goal",
        { method: "GET" }
    );

    const res = await response.json();
    dailyGoal = res.dailyGoal;

    if (res.calendarDays.length > 0) {
      calendarDays = res.calendarDays;
    }
    
    findCurrentStreak();

    if (dailyGoal >= todayCompleted) {
      loaded = true;
  
      setTimeout(() => {
        loaded = false;
      }, 3500)
    }
  }

  function buildCalendarDays(rawDays) {
    if (!rawDays || rawDays.length === 0) return [];

    const dates = rawDays.map(d => new Date(d.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date();

    const dayMap = {};
    for (const d of rawDays) {
      dayMap[d.date] = d;
    }

    const allDays = [];
    const cursor = new Date(minDate);
    while (cursor <= maxDate) {
      const key = cursor.toISOString().slice(0, 10);
      if (dayMap[key]) {
        allDays.push({ ...dayMap[key], date: new Date(cursor) });
      } else {
        allDays.push({ date: new Date(cursor), goalMet: false, partial: false, completed: 0, goal: dailyGoal });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return allDays;
  }

  function groupByWeek(days) {
    if (days.length < 1) return [];

    const weeks = [];
    let week = [];
    
    const firstDay = days[0].date.getDay();
    const paddingStart = firstDay === 0 ? 6 : firstDay - 1;
    for (let p = 0; p < paddingStart; p++) week.push(null);
    for (const day of days) {
      week.push(day);
      const dow = day.date.getDay();
      if (dow === 0) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) weeks.push(week);
    return weeks;
  }

  function findCurrentStreak() {
    const days = weeks.flat().filter(day => day !== null);

    let current = 0;
    let skipToday = true;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].goalMet) {
        current++;
      } else if (skipToday && i === days.length - 1) {
        skipToday = false;
      } else {
        break;
      }
    }

    currentStreak = current;
  }

  onMount(fetchUserGoal);
</script>

{#if loaded}
  <div
    transition:fly={{ y: -20, duration: 400 }}
    class="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[700px] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-card"
  >
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 pt-4 pb-3">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors
          {goalMet ? 'bg-[#FF9600]/10' : 'bg-[#58CC02]/10'}"
      >
        {#if goalMet}
          <Trophy class="h-5 w-5 text-[#FF9600]" />
        {:else}
          <CheckCircle2 class="h-5 w-5 text-[#58CC02]" />
        {/if}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-extrabold leading-tight text-foreground">
          {#if goalMet}
            Cilj ispunjen! 🎉
          {:else}
            Zadatak riješen!
          {/if}
        </p>
        <p class="text-xs text-muted-foreground mt-0.5">
          {#if goalMet}
            {todayCompleted} od {dailyGoal} • Niz: {currentStreak} {currentStreak === 1 ? 'dan' : 'dana'} 🔥
          {:else}
            Dnevni cilj: {todayCompleted} od {dailyGoal}
          {/if}
        </p>
      </div>
    </div>

    <!-- Step dots -->
    <div class="flex gap-1.5 px-4 pb-3">
      {#each Array(dailyGoal) as _, i}
        <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
          {#if i < todayCompleted}
            <!-- Done -->
            <div
              class="absolute inset-0 rounded-full transition-all
                {goalMet ? 'bg-[#FF9600]' : 'bg-[#58CC02]'}"
            ></div>
          {:else if i === todayCompleted}
            <!-- Current (pulsing partial fill) -->
            <div
              class="absolute inset-y-0 left-0 w-[40%] animate-pulse rounded-full
                {goalMet ? 'bg-[#FF9600]' : 'bg-[#58CC02]'} opacity-70"
            ></div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="px-4 pb-4">
      <div
        class="w-full rounded-xl py-2 text-sm font-extrabold text-white text-center
          {goalMet
            ? 'bg-[#FF9600]'
            : 'bg-[#58CC02]'}"
      >
        {goalMet ? 'Super!' : 'Nastavi'}
      </div>
    </div>
  </div>
{/if}