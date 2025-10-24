<script>
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { groupByKey } from "$lib/utils/grouping";

  let { objectives } = $props();

  const groupedBySubfieldObjectives = groupByKey(
    objectives,
    "subfieldName",
    (current, index) => ({
      subfieldName: current.subfieldName,
      objectives: [
        {
          objectiveName: current.objectiveName,
          unlocked: current.unlocked,
          serialNumber: index + 1,
        },
      ],
    }),
    (lastGroup, current, index) => {
      lastGroup.objectives.push({
        objectiveName: current.objectiveName,
        unlocked: current.unlocked,
        serialNumber: index + 1,
      });
    },
  );
</script>

{#if groupedBySubfieldObjectives}
  <div class="flex flex-col min-h-[calc(100vh-108px)] justify-between">
    <Accordion.Root class="w-full" value="item-1">
      {#each groupedBySubfieldObjectives as subfield}
        <Accordion.Item value={subfield.subfieldName}>
          <Accordion.Trigger>{subfield.subfieldName}</Accordion.Trigger>
          <Accordion.Content class="flex flex-col gap-4 text-balance">
            {#each subfield.objectives as objective}
              <div
                class="text-[1rem] sm:text-[0.7rem] md:text-[0.8rem] lg:text-[0.9rem] xl:text-[0.9rem]"
              >
                <p class={objective.unlocked ? "text-chart-2" : "text-primary"}>
                  {objective.serialNumber}. {objective.objectiveName}
                </p>
              </div>
            {/each}
          </Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>

    <!-- Objašnjenja na dnu -->
    <div
      class="mt-8 p-4 rounded-2xl bg-muted/40 text-sm text-muted-foreground backdrop-blur-sm"
    >
      <p class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-chart-2 inline-block"></span>
        <span>Zeleno = lekcija je otključana – dobivaš zadatke iz tog područja.</span>
      </p>
      <p class="flex items-center gap-2 mt-1">
        <span class="w-3 h-3 rounded-full bg-primary inline-block"></span>
        <span>Crveno = lekcija još nije otključana – ne dobivaš zadatke iz tog područja.</span>
      </p>
    </div>
  </div>
{/if}
