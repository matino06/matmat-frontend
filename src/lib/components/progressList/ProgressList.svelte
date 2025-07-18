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
  <Accordion.Root class="w-full" value="item-1">
    {#each groupedBySubfieldObjectives as subfield}
      <Accordion.Item value={subfield.subfieldName}>
        <Accordion.Trigger>{subfield.subfieldName}</Accordion.Trigger>
        <Accordion.Content class="flex flex-col gap-4 text-balance">
          {#each subfield.objectives as objective}
            <p class={objective.unlocked ? "text-chart-2" : "text-primary"}>
              {objective.serialNumber}. {objective.objectiveName}
            </p>
          {/each}
        </Accordion.Content>
      </Accordion.Item>
    {/each}
  </Accordion.Root>
{/if}
