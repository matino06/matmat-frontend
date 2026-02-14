<script>
  import { apiClient } from "$lib/api/apiClient";
  import { createEventDispatcher } from "svelte";

  const allCourses = [
    {
      courseId: 1,
      courseName: "Matematika A razina",
      courseDescription: "Državna matura iz matematike – A razina (viša)",
    },
    {
      courseId: 2,
      courseName: "Matematika B razina",
      courseDescription: "Državna matura iz matematike – B razina (osnovna)",
    },
  ];

  export let currentCourse = null;
  export let disabled = false;
  export let className = "";

  let isLoadingCourses = false;
  const dispatch = createEventDispatcher();

  async function handleCourseChange(event) {
    const selectedCourseId = parseInt(event.target.value);
    const selectedCourse = allCourses.find(
      (c) => c.courseId === selectedCourseId,
    );
    if (!selectedCourse) return;

    isLoadingCourses = true;
    try {
      const response = await apiClient("/account/current-course", {
        method: "POST",
        body: JSON.stringify({ courseId: selectedCourse.courseId }),
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        currentCourse = selectedCourse;
        dispatch("courseChange", { course: selectedCourse });
      } else {
        console.error("Greška pri promjeni predmeta");
      }
    } catch (error) {
      console.error("Greška pri promjeni predmeta:", error);
    } finally {
      isLoadingCourses = false;
    }
  }
</script>

<div class="flex items-center gap-2 {className}">
  <select
    class="focus:border-primary ml-2prose prose-sm sm:prose lg:prose-lg focus:ring-primary bg-popover border-border block w-auto min-w-[160px] rounded-md border px-2 px-5 py-1.5 text-sm text-[0.5rem] shadow-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-[0.6rem] md:text-[0.9rem] lg:text-[0.9rem]"
    onchange={handleCourseChange}
    disabled={isLoadingCourses || disabled}
  >
    <option value="" disabled selected={!currentCourse}>
      {currentCourse?.courseName || "Odaberi predmet"}
    </option>
    {#each allCourses as course}
      <option
        value={course.courseId}
        selected={course.courseId === currentCourse?.courseId}
      >
        {course.courseName}
      </option>
    {/each}
  </select>

  {#if isLoadingCourses}
    <span class="text-sm text-gray-500">Učitavanje...</span>
  {/if}
</div>
