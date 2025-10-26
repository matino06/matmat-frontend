<script>
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { userData } from "$lib/store/user.svelte";
  import { onMount } from "svelte";
  import { apiClient } from "$lib/api/apiClient";

  let dailyGoals = $state([]);
  let weeklyGoals = $state([]);
  let monthlyGoals = $state([]);
  let achievements = $state([]);
  let currentStreak = $state(0);
  let totalPoints = $state(0);
  let isLoading = $state(true);

  // Dummy podaci za početak
  const initialGoals = {
    daily: [
      {
        id: 1,
        title: "Riješi 5 zadataka",
        target: 5,
        current: 0,
        completed: false,
        points: 10,
        type: "counter",
      },
      {
        id: 2,
        title: "Uči 30 minuta",
        target: 30,
        current: 0,
        completed: false,
        points: 15,
        type: "timer",
      },
      {
        id: 3,
        title: "Pogledaj 2 objašnjenja",
        target: 2,
        current: 0,
        completed: false,
        points: 5,
        type: "counter",
      },
    ],
    weekly: [
      {
        id: 1,
        title: "Riješi 25 zadataka",
        target: 25,
        current: 0,
        completed: false,
        points: 50,
        type: "counter",
      },
      {
        id: 2,
        title: "Postigni 80% točnosti",
        target: 80,
        current: 0,
        completed: false,
        points: 30,
        type: "percentage",
      },
      {
        id: 3,
        title: "Završi 1 poglavlje",
        target: 1,
        current: 0,
        completed: false,
        points: 40,
        type: "counter",
      },
    ],
    monthly: [
      {
        id: 1,
        title: "Dosegni 90% znanja",
        target: 90,
        current: 0,
        completed: false,
        points: 100,
        type: "percentage",
      },
      {
        id: 2,
        title: "Riješi 100 zadataka",
        target: 100,
        current: 0,
        completed: false,
        points: 80,
        type: "counter",
      },
      {
        id: 3,
        title: "Održaj 7-dnevni niz",
        target: 7,
        current: 0,
        completed: false,
        points: 60,
        type: "streak",
      },
    ],
  };

  const initialAchievements = [
    {
      id: 1,
      name: "Početnik",
      description: "Riješi prvi zadatak",
      earned: true,
      icon: "🎯",
      points: 10,
    },
    {
      id: 2,
      name: "Marathonac",
      description: "Uči 5 dana zaredom",
      earned: false,
      icon: "🏃",
      points: 25,
    },
    {
      id: 3,
      name: "Genij",
      description: "Postigni 95% točnosti",
      earned: false,
      icon: "🧠",
      points: 50,
    },
    {
      id: 4,
      name: "Brzoplet",
      description: "Riješi 10 zadataka u 1 dan",
      earned: false,
      icon: "⚡",
      points: 30,
    },
    {
      id: 5,
      name: "Ustrajni",
      description: "Završi mjesečni cilj",
      earned: false,
      icon: "💪",
      points: 100,
    },
  ];

  async function loadGoals() {
    if (!userData.user) return;

    try {
      // U stvarnoj aplikaciji, ovo bi bilo API pozive
      // const response = await apiClient("/goals/user-goals", { method: "GET" });
      // const data = await response.json();

      // Za sada koristimo dummy podatke
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulacija loadinga

      dailyGoals = initialGoals.daily.map((goal) => ({ ...goal }));
      weeklyGoals = initialGoals.weekly.map((goal) => ({ ...goal }));
      monthlyGoals = initialGoals.monthly.map((goal) => ({ ...goal }));
      achievements = initialAchievements.map((ach) => ({ ...ach }));
      currentStreak = 3; // Dummy podatak
      totalPoints = 45; // Dummy podatak
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      isLoading = false;
    }
  }

  function updateGoalProgress(goalType, goalId, increment = 1) {
    const goalsMap = {
      daily: dailyGoals,
      weekly: weeklyGoals,
      monthly: monthlyGoals,
    };

    const goals = goalsMap[goalType];
    const goal = goals.find((g) => g.id === goalId);

    if (goal && !goal.completed) {
      goal.current += increment;

      if (goal.current >= goal.target) {
        goal.completed = true;
        goal.current = goal.target;
        totalPoints += goal.points;

        // Provjeri achievemente
        checkAchievements();
      }
    }
  }

  function checkAchievements() {
    // Provjeri maraton achievement
    const marathonAchievement = achievements.find((a) => a.id === 2);
    if (!marathonAchievement.earned && currentStreak >= 5) {
      marathonAchievement.earned = true;
      totalPoints += marathonAchievement.points;
    }

    // Provjeri brzoplet achievement
    const speedAchievement = achievements.find((a) => a.id === 4);
    const dailyTasks = dailyGoals.find((g) => g.title.includes("5 zadataka"));
    if (!speedAchievement.earned && dailyTasks && dailyTasks.current >= 10) {
      speedAchievement.earned = true;
      totalPoints += speedAchievement.points;
    }
  }

  function getProgressPercentage(goal) {
    return Math.min((goal.current / goal.target) * 100, 100);
  }

  function formatGoalText(goal) {
    if (goal.type === "percentage") {
      return `${goal.current}% / ${goal.target}%`;
    } else if (goal.type === "timer") {
      return `${goal.current}min / ${goal.target}min`;
    } else {
      return `${goal.current} / ${goal.target}`;
    }
  }

  onMount(() => {
    loadGoals();
  });

  $effect(() => {
    if (userData.user && !isLoading) {
      loadGoals();
    }
  });
</script>

{#if userData.user}
  <section
    class="bg-background text-foreground flex min-h-[calc(100vh-92px)] flex-col items-center justify-center px-6"
  >
    <h1 class="mb-4 text-4xl font-extrabold sm:text-5xl">Stranica u izradi</h1>
    <p
      class="text-muted-foreground mb-8 max-w-md text-center text-lg sm:text-xl"
    >
      Ova stranica je trenutno u fazi razvoja.
    </p>
    <img
      src="/images/wip_ilustration.jpg"
      alt="Work in progress ilustracija"
      class="w-64 rounded-2xl object-contain sm:w-80"
    />
  </section>
{/if}

<!-- <div class="container mx-auto px-4 py-8">
  {#if !userData.user}
    <div class="py-12 text-center">
      <h2 class="text-muted-foreground mb-4 text-2xl font-bold">
        Prijavi se da pratiš svoje ciljeve
      </h2>
      <p class="text-muted-foreground">
        Pratite svoj napredak, zaradite nagrade i ostvarite svoje ciljeve
      </p>
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center py-12">
      <div
        class="border-primary h-12 w-12 animate-spin rounded-full border-b-2"
      ></div>
    </div>
  {:else}
    <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardContent class="pt-6">
          <div class="text-center">
            <div class="text-primary text-3xl font-bold">{currentStreak}</div>
            <div class="text-muted-foreground text-sm">Dana redom</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="text-center">
            <div class="text-primary text-3xl font-bold">{totalPoints}</div>
            <div class="text-muted-foreground text-sm">Bodova</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="text-center">
            <div class="text-primary text-3xl font-bold">
              {achievements.filter((a) => a.earned)
                .length}/{achievements.length}
            </div>
            <div class="text-muted-foreground text-sm">Postignuća</div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <span class="text-primary">📅</span>
              Dnevni ciljevi
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {#each dailyGoals as goal (goal.id)}
              <div
                class="flex items-center justify-between rounded-lg border p-3"
              >
                <div class="flex-1">
                  <div class="mb-2 flex items-center gap-3">
                    <Checkbox
                      checked={goal.completed}
                      on:change={() => updateGoalProgress("daily", goal.id, 1)}
                    />
                    <span
                      class:line-through={goal.completed}
                      class:opacity-50={goal.completed}
                    >
                      {goal.title}
                    </span>
                    <Badge variant="secondary" class="ml-2">
                      {goal.points} bodova
                    </Badge>
                  </div>
                  <div class="flex items-center gap-3 text-sm">
                    <Progress
                      value={getProgressPercentage(goal)}
                      class="flex-1"
                    />
                    <span class="text-muted-foreground min-w-20 text-right">
                      {formatGoalText(goal)}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <span class="text-primary">📊</span>
              Tjedni ciljevi
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {#each weeklyGoals as goal (goal.id)}
              <div
                class="flex items-center justify-between rounded-lg border p-3"
              >
                <div class="flex-1">
                  <div class="mb-2 flex items-center gap-3">
                    <Checkbox
                      checked={goal.completed}
                      on:change={() => updateGoalProgress("weekly", goal.id, 1)}
                    />
                    <span
                      class:line-through={goal.completed}
                      class:opacity-50={goal.completed}
                    >
                      {goal.title}
                    </span>
                    <Badge variant="secondary" class="ml-2">
                      {goal.points} bodova
                    </Badge>
                  </div>
                  <div class="flex items-center gap-3 text-sm">
                    <Progress
                      value={getProgressPercentage(goal)}
                      class="flex-1"
                    />
                    <span class="text-muted-foreground min-w-20 text-right">
                      {formatGoalText(goal)}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <span class="text-primary">🎯</span>
              Mjesečni ciljevi
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {#each monthlyGoals as goal (goal.id)}
              <div
                class="flex items-center justify-between rounded-lg border p-3"
              >
                <div class="flex-1">
                  <div class="mb-2 flex items-center gap-3">
                    <Checkbox
                      checked={goal.completed}
                      on:change={() =>
                        updateGoalProgress("monthly", goal.id, 1)}
                    />
                    <span
                      class:line-through={goal.completed}
                      class:opacity-50={goal.completed}
                    >
                      {goal.title}
                    </span>
                    <Badge variant="secondary" class="ml-2">
                      {goal.points} bodova
                    </Badge>
                  </div>
                  <div class="flex items-center gap-3 text-sm">
                    <Progress
                      value={getProgressPercentage(goal)}
                      class="flex-1"
                    />
                    <span class="text-muted-foreground min-w-20 text-right">
                      {formatGoalText(goal)}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </CardContent>
        </Card>
      </div>

      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <span class="text-primary">🏆</span>
              Tvoja postignuća
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {#each achievements as achievement (achievement.id)}
                <div class="flex items-center gap-3 rounded-lg border p-3">
                  <div class="text-2xl">{achievement.icon}</div>
                  <div class="flex-1">
                    <div class="font-medium">{achievement.name}</div>
                    <div class="text-muted-foreground text-sm">
                      {achievement.description}
                    </div>
                    <div class="text-primary text-xs font-medium">
                      {achievement.points} bodova
                    </div>
                  </div>
                  {#if achievement.earned}
                    <Badge variant="default" class="bg-green-500">
                      Osvojeno!
                    </Badge>
                  {:else}
                    <Badge variant="outline">Zaključano</Badge>
                  {/if}
                </div>
              {/each}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brze akcije</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <Button
              class="w-full justify-start"
              variant="outline"
              on:click={() => updateGoalProgress("daily", 1, 1)}
            >
              +1 riješeni zadatak
            </Button>
            <Button
              class="w-full justify-start"
              variant="outline"
              on:click={() => updateGoalProgress("daily", 2, 5)}
            >
              +5 minuta učenja
            </Button>
            <Button
              class="w-full justify-start"
              variant="outline"
              on:click={() => {
                dailyGoals.forEach((goal) => {
                  if (!goal.completed) {
                    goal.current = goal.target;
                    goal.completed = true;
                    totalPoints += goal.points;
                  }
                });
                checkAchievements();
              }}
            >
              Završi dnevne ciljeve
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>💡 Savjeti za uspjeh</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2 text-sm">
            <div class="flex items-start gap-2">
              <div class="text-primary mt-0.5">•</div>
              <div>Postižite dnevne ciljeve za održavanje niza</div>
            </div>
            <div class="flex items-start gap-2">
              <div class="text-primary mt-0.5">•</div>
              <div>Tjedni ciljevi donose više bodova</div>
            </div>
            <div class="flex items-start gap-2">
              <div class="text-primary mt-0.5">•</div>
              <div>Mjesečni ciljevi otključavaju posebne nagrade</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  {/if}
</div> -->

<style>
  .line-through {
    text-decoration: line-through;
  }

  .opacity-50 {
    opacity: 0.5;
  }
</style>
