<script context="module">
  function renderStars(rating) {
    if (rating === null) {
      return '<span class="text-muted-foreground text-xs">Nije riješeno</span>';
    }
    let stars = "";
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        stars += '<span class="text-yellow-400">★</span>';
      } else {
        stars += '<span class="text-muted-foreground">☆</span>';
      }
    }
    return stars;
  }
</script>

<script>
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { fly } from "svelte/transition";

  let {
    tasks = [],
    title = "Zadaci",
    icon = null,
    badgeRenderer = (task) => ({ text: task.dueDate, className: "" }),
    maxDisplay = 5,
  } = $props();

  let showAll = $state(false);

  let displayedTasks = $derived(showAll ? tasks : tasks.slice(0, maxDisplay));
</script>

<Card>
  <CardHeader class="pb-2">
    <CardTitle class="flex items-center gap-2 text-base">
      {#if icon}
        <svelte:component this={icon} class="text-primary h-5 w-5" />
      {/if}
      {title}
      <Badge class="ml-auto">{tasks.length}</Badge>
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-2">
    {#each displayedTasks as task (task.title)}
      {@const badge = badgeRenderer(task)}
      <div
        in:fly={{ y: 20, duration: 300 }}
        class="flex items-center justify-between rounded-lg border p-3 text-sm"
      >
        <div>
          <div class="font-medium">{task.title}</div>
        </div>
        <div class="text-right">
          <Badge
            variant="outline"
            class="mb-1 {badge.className}"
            title={task.dueDate}
          >
            {badge.text}
          </Badge>
          <div class="text-xs">{@html renderStars(task.lastQ)}</div>
        </div>
      </div>
    {/each}

    {#if tasks.length > maxDisplay}
      {#if showAll}
        <div
          class="text-primary cursor-pointer text-center text-sm font-medium"
          onclick={() => (showAll = false)}
        >
          Prikaži manje
        </div>
      {:else}
        <div
          class="text-primary cursor-pointer text-center text-sm font-medium"
          onclick={() => (showAll = true)}
        >
          Prikaži još {tasks.length - maxDisplay} zadataka
        </div>
      {/if}
    {/if}
  </CardContent>
</Card>