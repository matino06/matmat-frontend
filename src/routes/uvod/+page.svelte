<script>
  // Starts the walkthrough, which then runs on the real Napredak and Zadaci pages.
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { pokreniUvod } from "$lib/store/uvod.svelte";

  onMount(() => {
    pokreniUvod();
    goto("/progress", { replaceState: true });
  });
</script>
