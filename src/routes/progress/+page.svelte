<script>
  import TaskList from "$lib/components/taskList/TaskList.svelte";
  import TipCard from "$lib/components/tipCard/TipCard.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { fade } from "svelte/transition";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { onMount } from "svelte";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Calendar,
    Star,
    Bolt,
    CalendarCheck,
    TrendingUp,
    Lock,
    LockOpen,
    Trophy,
    PlayCircle,
    Check,
    ArrowRight,
  } from "@lucide/svelte/icons";
  import { userData } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import ExamReadinessRing from "$lib/components/examReadinessRing/ExamReadinessRing.svelte";
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";
  import { calculateExamProgress } from "$lib/utils/progress";
  import { apiClient } from "$lib/api/apiClient";
  import { Tween } from "svelte/motion";
  import { cubicOut } from 'svelte/easing';

  let tasksTodayCount = new Tween(0, {
    duration: 2000,
    easing: cubicOut,
  });

  let objectives = $state([]);
  let loading = $state(true);
  let size = $state("size-70");
  let showObjectivesNum = $state(3);
  let todayTasks = $state([]);
  let upcomingTasks = $state([]);

  async function loadObjectives() {
    if (!userData.user) return;

    loading = true;
    objectives = await fetchObjectivesWithStatus();
    loading = false;
  }

  async function fetchProgressSummery() {
    const response = await apiClient(
        "/progress",
        { method: "GET" }
    );

    const res = await response.json();
    todayTasks = res.todayObjectives;
    tasksTodayCount.target = todayTasks.length;
    upcomingTasks = res.futureObjectives;
  }

  // ============================================================
  // HARDCODIRANI PODACI – bez poziva prema backendu
  // ============================================================

  // Objektivi (isti format kao prije)
  const hardcodedObjectives = [
    {
      objectiveId: 1,
      objectiveName: "Linearne funkcije",
      subfieldName: "Funkcije",
      fieldName: "Algebra",
      isMastered: true,
      learning: false,
      weak: false,
    },
    {
      objectiveId: 2,
      objectiveName: "Kvadratne jednadžbe",
      subfieldName: "Jednadžbe",
      fieldName: "Algebra",
      isMastered: false,
      learning: true,
      weak: false,
    },
    {
      objectiveId: 3,
      objectiveName: "Trigonometrijske funkcije",
      subfieldName: "Trigonometrija",
      fieldName: "Geometrija",
      isMastered: false,
      learning: false,
      weak: true,
    },
    {
      objectiveId: 4,
      objectiveName: "Poučak o sinusima",
      subfieldName: "Trigonometrija",
      fieldName: "Geometrija",
      isMastered: false,
      learning: true,
      weak: false,
    },
    {
      objectiveId: 5,
      objectiveName: "Logaritamske jednadžbe",
      subfieldName: "Funkcije",
      fieldName: "Algebra",
      isMastered: false,
      learning: false,
      weak: false,
    },
  ];

  const fields = [
    {
      name: "Brojevi",
      totalObjectives: 4,
      mastered: 4,
      status: "unlocked",
      unlockCondition: null,
    },
    {
      name: "Algebra i funkcije",
      totalObjectives: 22,
      mastered: 5,
      status: "in-progress",
      unlockCondition: null,
    },
    {
      name: "Oblik i prostor",
      totalObjectives: 8,
      mastered: 2,
      status: "in-progress",
      unlockCondition: "Otključava se kada završiš 80% Algebre",
    },
    {
      name: "Analiza",
      totalObjectives: 10,
      mastered: 0,
      status: "in-progress",
      unlockCondition: "Otključava se kada podigneš cilj 32 na ocjenu 5",
    },
  ];

  const totalObjectives = 57;

  // ============================================================
  // Responzivnost
  // ============================================================
  let width = $state(0);

  const updateWidth = () => {
    width = window.innerWidth;

    if (width >= 1100) size = "size-70";
    else if (width >= 768) size = "size-55";
    else if (width >= 640) size = "size-60";
    else size = "size-70";

    if (width <= 1024) {
      showObjectivesNum = 2;
    } else {
      showObjectivesNum = 3;
    }
  };

  onMount(async () => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  });

  $effect(async () => {
    if (userData.user) {
      fetchProgressSummery();
      loadObjectives();
    }
  })

  function goToTasks() {
    goto("/tasks");
  }

  const referenceDate = new Date(2026, 1, 14);

  function parseDate(dateStr) {
    const parts = dateStr.split(".");
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  }

  function getRelativeDateString(diffDays) {
    if (diffDays === 0) return "danas";
    if (diffDays === 1) return "sutra";
    if (diffDays === 2) return "prekosutra";
    if (diffDays > 0) return `za ${diffDays} dana`;
    if (diffDays < 0) return `prije ${Math.abs(diffDays)} dana`;
  }

  function getBadgeClass(diffDays) {
    if (diffDays === 1) return "bg-orange-500 text-white";
    if (diffDays === 2) return "bg-yellow-600 text-white";
    if (diffDays > 2) return "bg-green-500 text-white";
    return "";
  }

  const todayBadgeRenderer = (task) => ({
    text: "DANAS",
    className: "bg-primary text-white",
  });
  const upcomingBadgeRenderer = (task) => {
    const [y, m, d] = task.dueDate.split("-");
    const taskDate = new Date(y, m - 1, d);

    const diffTime = taskDate - referenceDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) - 1;
    return {
      text: getRelativeDateString(diffDays),
      className: getBadgeClass(diffDays),
    };
  };
</script>

<div class="container mx-auto max-w-7xl space-y-6 p-4">
  <div class="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
    <Card
      class="relative h-full w-full transition-all hover:shadow-md md:row-span-2"
    >
      <CardContent class="flex h-full items-center justify-center p-4">
        <div transition:fade={{ duration: 500 }}>
          <ExamReadinessRing {objectives} {size} />
        </div>

        <div class="bg-primary/10 absolute top-3 right-3 rounded-full p-2">
          <TrendingUp class="text-primary h-5 w-5" />
        </div>
      </CardContent>
    </Card>

    <div
      class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 md:row-span-2"
    >
      <Card class="relative h-full w-full transition-all hover:shadow-md">
        <CardContent class="p-4">
          <p class="text-muted-foreground text-sm">Današnji zadaci</p>
          <p class="py-3 text-6xl font-bold">{Math.round(tasksTodayCount.current)}</p>
          <p class="text-muted-foreground text-xs">Nije potrebno riješiti sve zadatke!</p>

          <div class="bg-primary/10 absolute top-3 right-3 rounded-full p-2">
            <Bolt class="text-primary h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <TipCard />

<div class="relative sm:col-span-2">
  <Card class="w-full">
    <CardHeader class="flex flex-row items-center justify-between">
      <CardTitle class="flex items-center gap-2">
        <Lock class="text-primary h-5 w-5" />
        Cjeline i otključavanja
      </CardTitle>

      <a
        href="/cjeline"
        class="hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition"
      >
        Detaljno
        <ArrowRight class="h-4 w-4" />
      </a>
    </CardHeader>
    <CardContent>
      <div
        class="grid grid-cols-1 gap-4 sm:grid-cols-{showObjectivesNum} lg:grid-cols-{showObjectivesNum}"
      >
        {#each fields.slice(0, showObjectivesNum) as field}
          {@const progress = Math.round(
            (field.mastered / field.totalObjectives) * 100,
          )}
          <div
            class="rounded-lg border p-4 transition-all hover:shadow-md"
            class:border-green-500={field.status === "unlocked"}
            class:opacity-70={field.status === "locked"}
          >
            <div class="mb-3 flex items-center justify-between">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full {field.status ===
                'unlocked'
                  ? 'bg-green-500/10'
                  : ''} {field.status === 'in-progress'
                  ? 'bg-primary/10'
                  : ''} {field.status === 'locked' ? 'bg-muted' : ''}"
              >
                {#if field.status === "unlocked"}
                  <Check class="h-4 w-4 text-green-500" />
                {:else if field.status === "in-progress"}
                  <TrendingUp class="text-primary h-4 w-4" />
                {:else}
                  <Lock class="text-muted-foreground h-4 w-4" />
                {/if}
              </div>
              {#if field.mastered / field.totalObjectives === 1}
                <Badge
                  variant="outline"
                  class="border-green-200 bg-green-50 text-green-600 dark:bg-green-950/20"
                >
                  SAVLADANO
                </Badge>
              {:else}
                <Badge variant="default">U TOKU</Badge>
              {/if}
            </div>
            <h4 class="font-medium">{field.name}</h4>
            <p class="text-muted-foreground text-sm">
              {field.mastered}/{field.totalObjectives} ciljeva savladano
            </p>
            <div class="mt-3">
              <div class="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  class="bg-primary h-full rounded-full"
                  style="width: {progress}%;"
                ></div>
              </div>
              <div class="text-muted-foreground mt-1 text-xs">
                {progress}%
              </div>
            </div>
          </div>
        {/each}
      </div>
    </CardContent>
  </Card>

  <!-- Overlay with blur -->
  <div class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-xs dark:bg-white/10 z-10">
    <span class="text-2xl font-bold text-gray-800 dark:text-gray-200 drop-shadow-md">
      ⏳ Uskoro
    </span>
  </div>
</div>
    </div>
  </div>

  <!-- Lists of tasks -->
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
    <TaskList
      tasks={todayTasks}
      title="Današnji zadaci"
      icon={Calendar}
      badgeRenderer={todayBadgeRenderer}
      maxDisplay={5}
    />
    <TaskList
      tasks={upcomingTasks}
      title="Zakazano za budućnost"
      icon={CalendarCheck}
      badgeRenderer={upcomingBadgeRenderer}
      maxDisplay={5}
    />
  </div>

  <Card
    class="from-primary/10 via-primary/5 bg-gradient-to-r to-transparent p-6"
  >
    <div
      class="flex flex-col items-center text-center md:flex-row md:justify-between md:text-left"
    >
      <div class="mb-4 md:mb-0">
        <Trophy class="text-primary mb-2 h-12 w-12" />
        <h2 class="text-xl font-bold">
          TI SI NA PUTU DO POTPUNE SPREMNOSTI ZA MATURU!
        </h2>
        <p class="text-muted-foreground mt-1">Tvoj trud se isplati!</p>
      </div>
      <Button onclick={goToTasks} size="lg" class="gap-2">
        <PlayCircle class="h-5 w-5" />
        ZAPOČNI DANASNJE UČENJE
      </Button>
    </div>
  </Card>
</div>
