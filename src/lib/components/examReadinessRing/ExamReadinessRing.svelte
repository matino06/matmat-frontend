<script>
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import ProgressRing from "$lib/components/ui/progressRing/ProgressRing.svelte";
  import { calculateExamProgress } from "$lib/utils/progress";

  let { objectives, size } = $props();

  let progress = new Tween(0, {
    duration: 2000,
    easing: cubicOut,
  });

  $effect(() => {
    if (!objectives?.length) return;

    const totalProgress = calculateExamProgress(objectives);

    setTimeout(() => {
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
