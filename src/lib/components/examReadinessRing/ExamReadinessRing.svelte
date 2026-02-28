<script>
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import ProgressRing from "$lib/components/ui/progressRing/ProgressRing.svelte";
  import { calculateExamProgress } from "$lib/utils/progress";
  import { apiClient } from "$lib/api/apiClient";

  let { objectives, size } = $props();

  let currentCourse = $state(null);

  let progress = new Tween(0, {
    duration: 2000,
    easing: cubicOut,
  });

  async function fetchCurrentCourse() {
    const response = await apiClient("/account/current-course", {
      method: "GET",
    });
    if (response.ok) {
      currentCourse = await response.json();
    }
  }

  $effect(async () => {
    if (!objectives?.length) return;

    await fetchCurrentCourse();
    const totalProgress = calculateExamProgress(
      objectives,
      currentCourse.courseId,
    );

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
