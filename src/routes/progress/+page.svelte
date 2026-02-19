<script>
  import TaskList from "$lib/components/taskList/TaskList.svelte";
  import TipCard from "$lib/components/tips/TipCard.svelte";
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
  import { groupByKey } from "$lib/utils/grouping";

  let tasksTodayCount = new Tween(0, {
    duration: 2000,
    easing: cubicOut,
  });

  let objectives = $state([]);
  let size = $state("size-70");
  let showObjectivesNum = $state(3);
  let todayTasks = $state([]);
  let upcomingTasks = $state([]);
  let fields = $state([])

  async function loadObjectives() {
    if (!userData.user) return;

    objectives = await fetchObjectivesWithStatus();

    fields = groupByKey(
        objectives,
        "fieldName",
        (current) => ({
            fieldName: current.fieldName,
            totalObjectives: 1,
            status: "in-progress",
            mastered: current.isMastered ? 1 : 0,
        }),
        (lastGroup, current) => {
            lastGroup.totalObjectives += 1;
            if (current.isMastered) {
                lastGroup.mastered += 1;
            }
        },
    );
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

  const today = new Date();
  const referenceDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

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
    if (diffDays === 1) return "bg-[#FF9600] text-white";
    if (diffDays === 2) return "bg-yellow-600 text-white";
    if (diffDays > 2) return "bg-[#58CC02] text-white";
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
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
              href="/progress/units"
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
                        <Check class="h-4 w-4 text-primary" />
                      {:else if field.status === "in-progress"}
                        <TrendingUp class="text-primary h-4 w-4" />
                      {:else}
                        <Lock class="text-muted-foreground h-4 w-4" />
                      {/if}
                    </div>
                    {#if field.mastered / field.totalObjectives === 1}
                      <Badge
                        variant="outline"
                        class="border-primary text-white bg-primary"
                      >
                        SAVLADANO
                      </Badge>
                    {:else}
                      <Badge variant="outline" class="default border-primary text-primary">U TOKU</Badge>
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
