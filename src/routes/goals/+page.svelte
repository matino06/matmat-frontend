<script>
  import { onMount } from "svelte";
  import { Flame, PlayCircle, Trophy, Target, Calendar, TrendingUp, Check, Zap } from "@lucide/svelte/icons";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { apiClient } from "$lib/api/apiClient";
  import { goto } from "$app/navigation";
  import GoalsSettings from "$lib/components/goalsSettings/GoalsSettings.svelte";

  let calendarDays = $state([]);
  let dailyGoal = $state(0);
  let todayGoal = $state(0);
  let totalDaysActive = $state(0);
  let last14Days = $state([]);
  let currentStreak = $state(0);
  let longestStreak = $state(0);
  let registrationDate = $state(null);

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
    todayGoal = res.todayGoal;

    if (res.calendarDays.length > 0) {
      calendarDays = res.calendarDays;
    } else {
      calendarDays = [
        {date: res.registrationDate, goalMet: false, partial: false, completed: 0, goal: dailyGoal}
      ];
    }
    
    totalDaysActive = calendarDays.filter(day => day.completed > 0).length;
    registrationDate = res.registrationDate;
    findCurrentAndLongestStreak();
  }

  onMount(fetchUserGoal);

  function findCurrentAndLongestStreak() {
    const days = weeks.flat().filter(day => day !== null);

    let longest = 0;
    let current = 0;

    for (const day of days) {
      if (day.goalMet) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }

    longestStreak = longest;

    current = 0;
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

  function buildCalendarDays(rawDays) {
    if (!rawDays || rawDays.length === 0) return [];

    const dates = rawDays.map(d => new Date(d.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date();

    const dayMap = {};
    for (const d of rawDays) {
      dayMap[d.date] = d;
    }

    if (registrationDate) {
      const regKey = new Date(registrationDate).toISOString().slice(0, 10);
      if (!dayMap[regKey]) {
        dayMap[regKey] = { date: new Date(registrationDate), goalMet: false, partial: false, completed: 0, goal: dailyGoal };

        if (new Date(registrationDate) < minDate) {
          minDate.setTime(new Date(registrationDate).getTime());
        }
      }
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


  const monthLabels = (() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstReal = week.find(d => d !== null);
      if (firstReal) {
        const m = firstReal.date.getMonth();
        if (m !== lastMonth) {
          labels.push({ weekIndex: wi, label: firstReal.date.toLocaleDateString("hr-HR", { month: "short" }) });
          lastMonth = m;
        }
      }
    });
    return labels;
  })();

  let tweenStreak = new Tween(0, { duration: 1200, easing: cubicOut });
  let tweenLongest = new Tween(0, { duration: 1400, easing: cubicOut });
  let tweenTotal = new Tween(0, { duration: 1600, easing: cubicOut });
  let tweenProgress = new Tween(0, { duration: 1000, easing: cubicOut });

  $effect(() => {
    tweenStreak.target = currentStreak;
    tweenLongest.target = longestStreak;
    tweenTotal.target = totalDaysActive;
    tweenProgress.target = todayGoal ? (todayCompleted / todayGoal) * 100 : 0;
  });

  $effect(() => {
    if (last14Days.length > 0) return;

    let flatDays = weeks.flat().filter(day => {
      return day !== null;
    });

    if (flatDays.length >= 14) {
      last14Days = flatDays.slice(-14);
    } else {
      for (let i = 0; i < flatDays.length; i++) {
        last14Days.push(flatDays[i]);
      }
    }
  })

  const today = new Date();
  const weekDayNames = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

  function isToday(date) {
    return date.toDateString() === today.toDateString();
  }

  function formatDate(date) {
    return date.toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" });
  }

  function goToTasks() {
    goto("/tasks");
  }
</script>

<div class="container mx-auto max-w-7xl space-y-6 p-4">

  <div class="flex justify-between">
    <div class="flex items-center gap-3">
      <div class="bg-primary/10 rounded-full p-3">
        <Flame class="text-primary h-7 w-7" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">Moj cilj</h1>
        <p class="text-muted-foreground text-sm">Prati svoju dosljednost i dnevne ciljeve</p>
      </div>
    </div>
    <GoalsSettings/>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <Card class="relative overflow-hidden transition-all hover:shadow-md">
      <CardContent class="p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-muted-foreground text-sm">Trenutni niz</p>
            <p class="text-[#1CB0F6] py-2 text-5xl font-extrabold">{Math.round(tweenStreak.current)}</p>
            <p class="text-muted-foreground text-xs">dana zaredom 🔥</p>
          </div>
          <div class="bg-[#1CB0F6]/10 rounded-full p-3">
            <Flame class="text-[#1CB0F6] h-6 w-6" />
          </div>
        </div>
        <div class="mt-4 flex gap-1">
          {#each Array(Math.min(currentStreak, 14)) as _, i}
            <div class="bg-[#1CB0F6] h-2 flex-1 rounded-full" style="opacity: {0.3 + (i / Math.min(currentStreak, 14)) * 0.7}"></div>
          {/each}
          {#if currentStreak === 0}
            <div class="bg-muted h-2 flex-1 rounded-full" ></div>
          {/if}
        </div>
      </CardContent>
    </Card>

    <Card class="relative overflow-hidden transition-all hover:shadow-md">
      <CardContent class="p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-muted-foreground text-sm">Najduži niz</p>
            <p class="py-2 text-5xl font-extrabold text-[#FF9600]">{Math.round(tweenLongest.current)}</p>
            <p class="text-muted-foreground text-xs">dana zaredom 🏆</p>
          </div>
          <div class="rounded-full bg-[#FF9600]/10 p-3">
            <Trophy class="h-6 w-6 text-[#FF9600]" />
          </div>
        </div>
        <div class="mt-4 flex gap-1">
          {#each Array(Math.min(longestStreak, 14)) as _, i}
            <div class="h-2 flex-1 rounded-full bg-[#FF9600]" style="opacity: {0.3 + (i / Math.min(longestStreak, 14)) * 0.7}"></div>
          {/each}
          {#if longestStreak === 0}
            <div class="bg-muted h-2 flex-1 rounded-full" ></div>
          {/if}
        </div>
      </CardContent>
    </Card>

    <Card class="relative overflow-hidden transition-all hover:shadow-md">
      <CardContent class="p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-muted-foreground text-sm">Ukupno aktivnih dana</p>
            <p class="py-2 text-5xl font-extrabold text-[#58CC02]">{Math.round(tweenTotal.current)}</p>
            <p class="text-muted-foreground text-xs">od početka korištenja ✅</p>
          </div>
          <div class="rounded-full bg-[#58CC02]/10 p-3">
            <TrendingUp class="h-6 w-6 text-[#58CC02]" />
          </div>
        </div>
        <div class="mt-4 flex gap-1">
          {#each last14Days as day}
            {@const progress = todayGoal ? Math.min(day.completed / todayGoal, 1) : 0}

            <div
              class="h-2 flex-1 rounded-full"
              class:bg-[#58CC02]={day.completed > 0}
              class:bg-muted={!day.completed}
              style="opacity: {day.completed ? progress : 1}"
            ></div>
          {/each}
        </div>
      </CardContent>
    </Card>
  </div>

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">

    <Card class="transition-all hover:shadow-md flex flex-col">
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2">
          <Target class="text-primary h-5 w-5" />
          Dnevni cilj
        </CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col flex-1 justify-between">
        <div>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-end gap-3">
              <span class="text-primary text-5xl font-extrabold">{todayCompleted}</span>
              <span class="text-muted-foreground mb-1 text-2xl font-medium">/ {todayGoal}</span>
            </div>
            <div class="flex gap-2">
              {#each Array(todayGoal) as _, i}
                <div class="flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all {i < todayCompleted ? 'bg-primary border-primary text-white' : 'border-border bg-muted text-muted-foreground'}">
                  {#if i < todayCompleted}
                    <Check class="h-5 w-5" />
                  {:else}
                    <Zap class="h-5 w-5" />
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <div class="mt-5">
            <div class="bg-muted h-3 w-full overflow-hidden rounded-full">
              <div class="bg-primary h-full rounded-full transition-all duration-700" style="width: {tweenProgress.current}%;"></div>
            </div>
            <div class="mt-2 flex justify-between">
              <span class="text-muted-foreground text-xs">
                {#if todayCompleted >= todayGoal}
                  🎉 Cilj ispunjen! Odlično!
                {:else}
                  Još {todayGoal - todayCompleted} {todayGoal - todayCompleted === 1 ? "zadatak" : "zadatka"} do cilja
                {/if}
              </span>
              <span class="text-muted-foreground text-xs">{Math.round(tweenProgress.current)}%</span>
            </div>
          </div>
        </div>

        <div class="mt-6 rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p class="text-sm font-medium text-primary">
            {#if todayCompleted >= todayGoal}
              💪 Bravo! Produžio si niz.
            {:else if currentStreak >= 10}
              🔥 Nevjerojatno! Već {currentStreak} dana zaredom — samo nastavi!
            {:else if currentStreak >= 5}
              💪 Odlično! {currentStreak} dana niza — ne prekidaj sada!
            {:else}
              ⚡ Svaki dan je nova šansa. Počni graditi svoj niz!
            {/if}
          </p>
          <p class="text-muted-foreground text-xs mt-1">
            {#if todayCompleted >= todayGoal}
              Vrati se sutra i produži svoj niz.
            {:else if longestStreak === currentStreak}
              Postavi novi rekord danas!
            {:else}
              Do rekorda ti nedostaje još {longestStreak - currentStreak} dana.
            {/if}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card class="transition-all hover:shadow-md">
      <CardHeader class="pb-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle class="flex items-center gap-2">
            <Calendar class="text-primary h-5 w-5" />
            Aktivnost
          </CardTitle>
          <div class="flex items-center gap-3 text-xs text-muted-foreground">
            <span class="flex items-center gap-1">
              <span class="inline-block h-3 w-3 rounded-sm bg-[#58CC02]"></span>
              Cilj ispunjen
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block h-3 w-3 rounded-sm bg-[#5acc0261]"></span>
              Djelomično
            </span>
            <span class="flex items-center gap-1">
              <span class="border-border inline-block h-3 w-3 rounded-sm border bg-muted"></span>
              Nije rješavano
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <div class="min-w-[280px]">
            <div class="relative">
              <div class="mb-1 flex gap-1">
                <div class="w-8"></div>
                {#each weeks as week, wi}
                  <div class="w-4 text-[9px] text-muted-foreground">
                    {#each monthLabels as ml}
                      {#if ml.weekIndex === wi}{ml.label}{/if}
                    {/each}
                  </div>
                {/each}
              </div>

              <div class="flex gap-1">
                <div class="flex flex-col gap-1">
                  {#each weekDayNames as name, di}
                    <div class="flex h-4 w-8 items-center text-[9px] text-muted-foreground">
                      {di % 2 === 0 ? name : ""}
                    </div>
                  {/each}
                </div>

                {#each weeks as week}
                  <div class="flex flex-col gap-1 pb-2 pr-1">
                    {#each Array(7) as _, di}
                      {@const day = week[di]}
                      {#if day === null || day === undefined}
                        <div class="h-4 w-4 rounded-sm"></div>
                      {:else}
                        <div
                          class="h-4 w-4 rounded-sm transition-all hover:scale-125 cursor-pointer {day.goalMet ? 'bg-[#58CC02]' : day.partial ? 'bg-[#5acc0261]' : 'bg-muted'} {isToday(day.date) ? 'ring-2 ring-[#58CC02] ring-offset-1' : ''}"
                          title="{formatDate(day.date)}: {day.completed}/{day.goal} zadataka"
                        ></div>
                      {/if}
                    {/each}
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <Card class="from-primary/10 via-primary/5 bg-gradient-to-r to-transparent p-6">
    <div
      class="flex flex-col items-center text-center md:flex-row md:justify-between md:text-left"
    >
      <div class="mb-4 md:mb-0">
        <Trophy class="text-primary mb-2 h-12 w-12" />
        <h2 class="text-xl font-bold">
          {#if currentStreak >= 10}
            FANTASTIČNO! VEĆ {currentStreak} DANA ZAREDOM! 🔥
          {:else if currentStreak >= 5}
            ODLIČAN NAPREDAK! NE STAJ SADA! 💪
          {:else}
            SVAKI DAN JE KORAK BLIŽE MATURI!
          {/if}
        </h2>
        <p class="text-muted-foreground mt-1">
          {#if todayCompleted >= todayGoal}
            Vrati se sutra i postavi novi rekord!
          {:else if currentStreak === longestStreak}
            Postavi novi rekord danas!
          {:else if currentStreak >= longestStreak - 3}
            Samo još {longestStreak - currentStreak} dana do osobnog rekorda!
          {:else}
            Tvoj trud se isplati — {totalDaysActive} aktivnih dana govori samo za sebe!
          {/if}
        </p>
      </div>
      <Button onclick={goToTasks} size="lg" class="gap-2">
        <PlayCircle class="h-5 w-5" />
        ZAPOČNI DANAŠNJE UČENJE
      </Button>
    </div>
  </Card>

</div>
