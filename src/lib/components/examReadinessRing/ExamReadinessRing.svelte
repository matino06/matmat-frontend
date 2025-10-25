<script>
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { groupByKey } from "$lib/utils/grouping";
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { onMount } from "svelte";
  import ProgressRing from "$lib/components/ui/progressRing/ProgressRing.svelte";

  let { objectives, size } = $props();

  const pointsDistributionBySubfield = {
    Brojevi: 10,
    "Algebra i funkcije": 50,
    "Oblik i prostor": 15,
    Mjerenje: 20,
    "Podatci, statistika i vjerojatnost": 5,
  };

  let progress = new Tween(0, {
    duration: 2000,
    easing: cubicOut,
  });

  const groupedByFieldObjectives = groupByKey(
    objectives,
    "fieldName",
    (current) => ({
      fieldName: current.fieldName,
      numOfObjectivesInField: 1,
      numberOfMasteredObjectivesInField: current.isMastered ? 1 : 0,
    }),
    (lastGroup, current) => {
      lastGroup.numOfObjectivesInField += 1;
      if (current.isMastered) {
        lastGroup.numberOfMasteredObjectivesInField += 1;
      }
    },
  );

  $effect(() => {
    setTimeout(() => {
      let totalProgress = groupedByFieldObjectives.reduce((total, group) => {
        const distribution = pointsDistributionBySubfield[group.fieldName];

        return (
          total +
          distribution *
            (group.numberOfMasteredObjectivesInField /
              group.numOfObjectivesInField)
        );
      }, 0);

      progress.target = totalProgress;
    }, 400);
  });
</script>

<div class="mt-4 mb-10 flex flex-col justify-center">
  <ProgressRing
    {size}
    value={progress.current}
    max={100}
    showLabel
    label={"Tvoje Znanje"}
  />
</div>
