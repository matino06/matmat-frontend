<script>
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

  const allObjectives = [
    {
      field_id: 1,
      field_name: "Brojevi",
      subfield_id: 1,
      subfield_name: "Skupovi brojeva",
      objective_id: 1,
      objective_name: "Osnovni skupovi brojeva",
    },
    {
      field_id: 1,
      field_name: "Brojevi",
      subfield_id: 1,
      subfield_name: "Skupovi brojeva",
      objective_id: 3,
      objective_name:
        "Interpretira računske operacije s kompleksnim brojevima u Gaussovoj ravnini",
    },
    {
      field_id: 1,
      field_name: "Brojevi",
      subfield_id: 2,
      subfield_name: "Potencije i korijeni",
      objective_id: 4,
      objective_name: "Računanje s potencijama i korijenima",
    },
    {
      field_id: 1,
      field_name: "Brojevi",
      subfield_id: 2,
      subfield_name: "Potencije i korijeni",
      objective_id: 5,
      objective_name: "Računanje s potencijama i racionalizacija",
    },
    {
      field_id: 1,
      field_name: "Brojevi",
      subfield_id: 2,
      subfield_name: "Potencije i korijeni",
      objective_id: 6,
      objective_name:
        "Primjenjuje pravila za računanje s potencijama racionalnoga eksponenta",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 3,
      subfield_name: "Algebra",
      objective_id: 7,
      objective_name: "Algebarski razlomci i zajednički nazivnik",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 3,
      subfield_name: "Algebra",
      objective_id: 8,
      objective_name:
        "Prikazuje operacije sa skupovima i rješenja nejednadžbi s pomoću intervala",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 4,
      subfield_name: "Jednadžbe i nejednadžbe",
      objective_id: 9,
      objective_name: "Primjenjuje sustave linearnih jednadžbi",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 4,
      subfield_name: "Jednadžbe i nejednadžbe",
      objective_id: 10,
      objective_name: "Primjenjuje linearne nejednadžbe",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 4,
      subfield_name: "Jednadžbe i nejednadžbe",
      objective_id: 11,
      objective_name: "Rješava i primjenjuje kvadratnu jednadžbu",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 12,
      objective_name:
        "Primjenjuje diskriminantu kvadratne jednadžbe i Vièteove formule",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 4,
      subfield_name: "Jednadžbe i nejednadžbe",
      objective_id: 13,
      objective_name: "Modelira eksponencijalnom i logaritamskom jednadžbom",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 4,
      subfield_name: "Jednadžbe i nejednadžbe",
      objective_id: 14,
      objective_name: "Pronalazi sva rješenja trigonometrijskih jednadžbi",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 15,
      objective_name: "Prikazuje graf linearne apsolutne vrijednosne funkcije",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 16,
      objective_name: "Primjenjuje linearnu funkciju pri rješavanju problema",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 17,
      objective_name: "Grafički prikazuje kvadratnu funkciju",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 18,
      objective_name: "Određuje domenu funkcije",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 19,
      objective_name: "Određivanje funkcije na temelju točaka",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 20,
      objective_name: "Analizira eksponencijalnu i logaritamsku funkciju",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 4,
      subfield_name: "Jednadžbe i nejednadžbe",
      objective_id: 21,
      objective_name:
        "Primjena logaritama za rješavanje eksponencijalnih jednadžbi",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 22,
      objective_name:
        "Razumijevanje trigonometrijskih funkcija: sinus i kosinus",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 23,
      objective_name: "Analizira graf trigonometrijskih funkcija",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 24,
      objective_name:
        "Grafički prikaz trigonometrijskih funkcija: sinus i kosinus",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 25,
      objective_name: "Parnost funkcije i os simetrije",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 26,
      objective_name: "Primjenjuje aritmetički i geometrijski niz",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 5,
      subfield_name: "Funkcije i nizovi",
      objective_id: 27,
      objective_name: "Računa limes niza",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 6,
      subfield_name: "Derivacije",
      objective_id: 28,
      objective_name: "Tumači značenje limesa funkcije u točki",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 6,
      subfield_name: "Derivacije",
      objective_id: 29,
      objective_name:
        "Povezuje definiciju derivacije funkcije u točki s problemom tangente i brzine",
    },
    {
      field_id: 2,
      field_name: "Algebra i funkcije",
      subfield_id: 6,
      subfield_name: "Derivacije",
      objective_id: 30,
      objective_name:
        "Primjenjuje derivaciju funkcije u problemskim situacijama",
    },
    // ... svi ostali ...
  ];

  function buildHierarchy(objectives) {
    const fieldsMap = new Map();
    objectives.forEach((obj) => {
      if (!fieldsMap.has(obj.field_id)) {
        fieldsMap.set(obj.field_id, {
          field_id: obj.field_id,
          field_name: obj.field_name,
          subfields: new Map(),
        });
      }
      const field = fieldsMap.get(obj.field_id);
      if (!field.subfields.has(obj.subfield_id)) {
        field.subfields.set(obj.subfield_id, {
          subfield_id: obj.subfield_id,
          subfield_name: obj.subfield_name,
          objectives: [],
        });
      }
      const subfield = field.subfields.get(obj.subfield_id);
      subfield.objectives.push({
        objective_id: obj.objective_id,
        objective_name: obj.objective_name,
      });
    });

    return Array.from(fieldsMap.values()).map((field) => ({
      ...field,
      subfields: Array.from(field.subfields.values()),
    }));
  }

  let fields = $state(buildHierarchy(allObjectives));
  let activeFieldId = $state(fields[0]?.field_id);

  function getObjectiveStatus(objectiveId) {
    const hardcodedStatus = ["mastered", "learning", "weak", "not_started"];
    const randomStatus =
      hardcodedStatus[Math.floor(Math.random() * hardcodedStatus.length)];

    return randomStatus;
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
              obj.objective_name
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
      !filteredFields.some((f) => f.field_id === activeFieldId)
    ) {
      activeFieldId = filteredFields[0].field_id;
    }
  });

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
        <ShieldAlert class="h-5 w-5 text-orange-500" />
        <span>Slabo</span>
      </div>
      <div class="flex items-center gap-2">
        <Lock class="text-primary h-5 w-5" />
        <span>Zaključano</span>
      </div>
    </div>
  {/if}

  {#if filteredFields.length > 0}
    <Tabs value={activeFieldId} onValueChange={(v) => (activeFieldId = v)}>
      <TabsList class="mb-6 flex flex-wrap">
        {#each filteredFields as field (field.field_id)}
          <TabsTrigger value={field.field_id} class="flex items-center gap-2">
            {field.field_name}
            <Badge variant="outline" class="ml-1">
              {field.subfields.reduce(
                (acc, sf) => acc + sf.objectives.length,
                0,
              )}
            </Badge>
          </TabsTrigger>
        {/each}
      </TabsList>

      {#each filteredFields as field (field.field_id)}
        <TabsContent value={field.field_id} class="mt-0">
          <div
            class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {#each field.subfields as subfield (subfield.subfield_id)}
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">{subfield.subfield_name}</h3>
                  <Badge variant="outline">
                    {subfield.objectives.length}
                  </Badge>
                </div>
                <div class="space-y-2">
                  {#each subfield.objectives as obj (obj.objective_id)}
                    {@const status = getObjectiveStatus(obj.objective_id)}
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
                          {obj.objective_name}
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
