<script>
  import { fetchObjectivesWithStatus } from "$lib/api/objectives";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Card, CardContent } from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
  } from "$lib/components/ui/tabs/index.js";
  import {
    Lock,
    CircleCheck,
    LockOpen,
    AlertCircle,
    Search,
    ShieldAlert,
    ArrowLeft,
    BookOpen,
  } from "@lucide/svelte/icons";
  import { userData } from "$lib/store/user.svelte";

  let loading = $state(false);
  let objectives = $state([]);

  function buildHierarchy(objectives = []) {
    const fieldsMap = new Map();

    objectives.forEach((obj) => {
      const fieldName = obj.fieldName ?? "Nepoznato polje";
      const subfieldName = obj.subfieldName ?? "Nepoznato podpolje";

      if (!fieldsMap.has(fieldName)) {
        fieldsMap.set(fieldName, {
          fieldName,
          subfields: new Map(),
        });
      }

      const field = fieldsMap.get(fieldName);

      if (!field.subfields.has(subfieldName)) {
        field.subfields.set(subfieldName, {
          subfieldName,
          objectives: [],
        });
      }

      const subfield = field.subfields.get(subfieldName);

      subfield.objectives.push({
        objectiveId: obj.objectiveId,
        objectiveName: obj.objectiveName ?? "",
        isMastered: obj.isMastered,
        unlocked: obj.unlocked,
        isWeak: obj.isWeak
      });
    });

    return Array.from(fieldsMap.values()).map((field) => ({
      fieldName: field.fieldName,
      subfields: Array.from(field.subfields.values()),
    }));
  }

  let fields = $state([]);
  let activeFiedName = $state();

  async function loadObjectives() {
    console.log("Hello")
    if (!userData.user) return;

    loading = true;
    objectives = await fetchObjectivesWithStatus();
    loading = false;

    fields = buildHierarchy(objectives)
    activeFiedName = fields[0]?.fieldName;

    console.log(objectives)
  }

  function getObjectiveStatus(objective) {    
    if (objective.isMastered) return "mastered";
    if (objective.unlocked) return "learning";
    return "not_started";
  }

  function getStatusIcon(status) {
    switch (status) {
      case "mastered": return CircleCheck;
      case "learning": return LockOpen;
      case "weak": return ShieldAlert;
      default: return Lock;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "mastered": return "text-emerald-500";
      case "learning": return "text-sky-500";
      case "weak": return "text-amber-500";
      default: return "text-red-400";
    }
  }

  function getStatusBgClass(status) {
    switch (status) {
      case "mastered": return "mastered";
      case "learning": return "learning";
      case "weak": return "weak";
      default: return "locked";
    }
  }

  let searchQuery = $state("");

  const filteredFields = $derived(
    fields
      .map((field) => ({
        ...field,
        subfields: field.subfields
          .map((subfield) => ({
            ...subfield,
            objectives: subfield.objectives.filter((obj) =>
              obj.objectiveName
                .toLowerCase()
                .includes(searchQuery.toLowerCase()),
            ),
          }))
          .filter((subfield) => subfield.objectives.length > 0),
      }))
      .filter((field) => field.subfields.length > 0),
  );

  $effect(() => {
    if (
      filteredFields.length > 0 &&
      !filteredFields.some((f) => f.fieldName === activeFiedName)
    ) {
      activeFiedName = filteredFields[0].fieldName;
    }
  });

  $effect(() => {
    if (userData.user) {
      loadObjectives();
    }
  })

  function goBack() {
    goto("/progress");
  }

  function getMasteryStats(field) {
    const all = field.subfields.flatMap(sf => sf.objectives);
    const mastered = all.filter(o => getObjectiveStatus(o) === "mastered").length;
    return { total: all.length, mastered };
  }
</script>

<div class="container mx-auto max-w-7xl p-4 space-y-5">

  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" onclick={goBack} class="shrink-0">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-xl font-bold leading-tight">Cjeline i objektivi</h1>
        <p class="text-muted-foreground text-xs mt-0.5">Pregled tvojih nastavnih cjelina</p>
      </div>
    </div>

    <div class="relative w-full sm:w-60">
      <Search class="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" />
      <Input
        type="text"
        placeholder="Pretraži objektive..."
        class="pl-9 h-9 text-sm"
        bind:value={searchQuery}
      />
    </div>
  </div>

  {#if loading}
    <!-- Skeleton loader -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {#each Array(6) as _}
        <div class="rounded-xl border bg-muted/30 h-48"></div>
      {/each}
    </div>

  {:else if filteredFields.length > 0}

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <span class="legend-dot bg-emerald-500"></span>
        Savladano
      </div>
      <div class="flex items-center gap-1.5">
        <span class="legend-dot bg-sky-500"></span>
        U učenju
      </div>
      <div class="flex items-center gap-1.5">
        <span class="legend-dot bg-red-300"></span>
        Zaključano
      </div>
    </div>

    <!-- Tabs -->
    <Tabs value={activeFiedName} onValueChange={(v) => (activeFiedName = v)}>
      <TabsList class="h-auto flex flex-wrap gap-1.5 p-1 mb-5 bg-muted/50 rounded-xl">
        {#each filteredFields as field (field.fieldName)}
          {@const stats = getMasteryStats(field)}
          <TabsTrigger
            value={field.fieldName}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all data-[state=active]:shadow-sm"
          >
            <span class="truncate max-w-[120px]">{field.fieldName}</span>
            <span class="text-xs opacity-60 font-normal shrink-0">{stats.mastered}/{stats.total}</span>
          </TabsTrigger>
        {/each}
      </TabsList>

      {#each filteredFields as field (field.fieldName)}
        {@const stats = getMasteryStats(field)}
        <TabsContent value={field.fieldName} class="mt-0 field-tab-content">

          <!-- Field progress bar -->
          <div class="mb-5 flex items-center gap-3">
            <div class="progress-pill flex-1">
              <div
                class="progress-fill"
                style="width: {stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}%"
              ></div>
            </div>
            <span class="text-xs text-muted-foreground font-medium shrink-0">
              {stats.mastered} / {stats.total} savladano
            </span>
          </div>

          <!-- Subfields grid -->
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {#each field.subfields as subfield (subfield.subfieldName)}
              <div class="rounded-xl border bg-card/50 p-4 space-y-2">
                <div class="subfield-header">
                  <span class="subfield-name">{subfield.subfieldName}</span>
                  <span class="subfield-count">{subfield.objectives.length}</span>
                </div>

                <div class="space-y-2">
                  {#each subfield.objectives as obj (obj.objectiveName)}
                    {@const status = getObjectiveStatus(obj)}
                    {@const Icon = getStatusIcon(status)}
                    {@const colorClass = getStatusColor(status)}
                    <div class="obj-card {getStatusBgClass(status)}">
                      <div class="icon-wrap {getStatusBgClass(status)}">
                        <Icon class="h-3.5 w-3.5 {colorClass}" />
                      </div>
                      <p class="text-sm leading-snug font-medium break-words min-w-0 flex-1 pt-0.5">
                        {obj.objectiveName}
                      </p>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </TabsContent>
      {/each}
    </Tabs>

  {:else}
    <div class="empty-state">
      <BookOpen class="h-10 w-10 opacity-30" />
      <p class="text-sm">Nema rezultata za tvoj upit.</p>
      {#if searchQuery}
        <Button variant="ghost" size="sm" onclick={() => searchQuery = ""}>
          Očisti pretragu
        </Button>
      {/if}
    </div>
  {/if}

</div>

<style>
  .obj-card {
    position: relative;
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-height: 4.5rem;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    cursor: default;
    border: 1px solid transparent;
  }

  .obj-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }

  .obj-card.mastered {
    background: linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0.03) 100%);
    border-color: rgba(16,185,129,0.2);
  }

  .obj-card.learning {
    background: linear-gradient(135deg, rgba(14,165,233,0.07) 0%, rgba(14,165,233,0.03) 100%);
    border-color: rgba(14,165,233,0.2);
  }

  .obj-card.weak {
    background: linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(245,158,11,0.03) 100%);
    border-color: rgba(245,158,11,0.2);
  }

  .obj-card.locked {
    background: rgba(131, 12, 12, 0.077);
    border-color: rgba(148,163,184,0.15);
  }

  .icon-wrap {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .icon-wrap.mastered { background: rgba(16,185,129,0.12); }
  .icon-wrap.learning { background: rgba(14,165,233,0.12); }
  .icon-wrap.weak { background: rgba(245, 159, 11, 0.332); }
  .icon-wrap.locked { background: rgba(255, 0, 0, 0.116); }

  .progress-pill {
    height: 5px;
    border-radius: 99px;
    background: rgba(148,163,184,0.15);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, #10b981, #34d399);
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .subfield-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(148,163,184,0.12);
  }

  .subfield-name {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground, #94a3b8);
  }

  .subfield-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted-foreground, #94a3b8);
    background: rgba(148,163,184,0.1);
    padding: 2px 8px;
    border-radius: 99px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .field-tab-content {
    padding: 4px 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 80px 20px;
    color: var(--muted-foreground, #94a3b8);
  }
</style>