<script>
  import { courseState, courseLabel } from "$lib/store/course.svelte";

  let label = $derived(courseLabel(courseState.courseId));
</script>

<!-- Dok se predmet učitava: zamagljen naziv umjesto nagađanja „Matematika“. -->
{#if label}{label}{:else}<span class="loading" aria-hidden="true">Matematika</span>{/if}

<style>
  .loading {
    filter: blur(4px);
    user-select: none;
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% { opacity: 0.4; }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading { animation: none; }
  }
</style>
