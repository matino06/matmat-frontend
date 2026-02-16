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
      case "mastered":
        return CircleCheck;
      case "learning":
        return LockOpen;
      case "weak":
        return ShieldAlert;
      default:
        return Lock;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "mastered":
        return "text-green-500";
      case "learning":
        return "text-blue-500";
      case "weak":
        return "text-orange-500";
      default:
        return "text-primary";
    }
  }

  function getStatusBgClass(status) {
    switch (status) {
      case "mastered":
        return "bg-green-500/10";
      case "learning":
        return "bg-blue-500/10";
      case "weak":
        return "bg-orange-500/10";
      default:
        return "bg-primary/15";
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
</script>

<div class="container mx-auto max-w-7xl space-y-6 p-4">
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" onclick={goBack} class="mr-1">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <h1 class="text-2xl font-bold">Cjeline i objektivi</h1>
    </div>
    <div class="relative w-full sm:w-64">
      <Search
        class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
      />
      <Input
        type="text"
        placeholder="Pretraži objektive..."
        class="pl-9"
        bind:value={searchQuery}
      />
    </div>
  </div>

  <!-- Status Legend -->
  {#if filteredFields.length > 0}
    <div
      class="bg-card flex flex-wrap items-center gap-4 rounded-lg border p-3 text-sm"
    >
      <span class="text-muted-foreground mr-2 font-medium">Status:</span>
      <div class="flex items-center gap-2">
        <CircleCheck class="h-5 w-5 text-green-500" />
        <span>Savladano</span>
      </div>
      <div class="flex items-center gap-2">
        <LockOpen class="h-5 w-5 text-blue-500" />
        <span>U učenju</span>
      </div>
      <div class="flex items-center gap-2">
        <Lock class="text-primary h-5 w-5" />
        <span>Zaključano</span>
      </div>
    </div>
  {/if}

  {#if filteredFields.length > 0}
    <Tabs value={activeFiedName} onValueChange={(v) => (activeFiedName = v)}>
      <TabsList class="mb-6 flex flex-wrap">
        {#each filteredFields as field (field.fieldName)}
          <TabsTrigger value={field.fieldName} class="flex items-center gap-2">
            {field.fieldName}
            <Badge variant="outline" class="ml-1">
              {field.subfields.reduce(
                (acc, sf) => acc + sf.objectives.length,
                0,
              )}
            </Badge>
          </TabsTrigger>
        {/each}
      </TabsList>

      {#each filteredFields as field (field.fieldName)}
        <TabsContent value={field.fieldName} class="mt-0">
          <div
            class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {#each field.subfields as subfield (subfield.subfieldName)}
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">{subfield.subfieldName}</h3>
                  <Badge variant="outline">
                    {subfield.objectives.length}
                  </Badge>
                </div>
                <div class="space-y-2">
                  {#each subfield.objectives as obj (obj.objectiveName)}
                    {@const status = getObjectiveStatus(obj)}
                    {@const Icon = getStatusIcon(status)}
                    {@const colorClass = getStatusColor(status)}
                    {@const bgClass = getStatusBgClass(status)}
                    <div
                      class="group relative flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-sm {bgClass} min-h-[5rem]"
                    >
                      <Icon class={`h-5 w-5 shrink-0 ${colorClass}`} />
                      <div class="min-w-0 flex-1">
                        <p
                          class="text-sm leading-tight font-medium break-words"
                        >
                          {obj.objectiveName}
                        </p>
                      </div>
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
    <div class="text-muted-foreground py-12 text-center">
      Nema rezultata za tvoj upit.
    </div>
  {/if}
</div>
